/**
 * Wrapper TypeScript da API PIX do Vyat (v2 — pós Fase 1).
 *
 * Endpoints utilizados:
 *   - GET  /v1/gateway/active?key=...                      confere se há gateway ativo
 *   - POST /v1/pix/criar                                    cria a cobrança (suporta Idempotency-Key)
 *   - GET  /v1/pix/status?transaction_id=...&key=...        polling do status (rate limit 30/min)
 *
 * Tipos espelham `src/lib/api/types.ts` da Vyat (publicação npm pendente).
 */

// As chamadas vão pelo proxy local (/api/vyat/*) — server-to-server pra evitar CORS
// e centralizar a key. Os endpoints upstream são `/v1/pix/criar` e `/v1/pix/status`
// no `NEXT_PUBLIC_VYAT_BASE_URL`, mas o cliente nunca fala direto com eles.
const PROXY_CREATE = "/api/vyat/pix/criar"
const PROXY_STATUS = "/api/vyat/pix/status"

// =====================================================================
// Tipos
// =====================================================================

export type VyatErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_AMOUNT"
  | "IDEMPOTENCY_KEY_PAYLOAD_MISMATCH"
  | "DUPLICATE_EXTERNAL_ID"
  | "INSUFFICIENT_GATEWAY"
  | "RATE_LIMITED"
  | "GATEWAY_ERROR"
  | "INTERNAL_ERROR"

export interface VyatPixParams {
  /** Valor em reais (decimal). Ex.: 19.90. Limite: 0 < valor ≤ 50000. */
  valor: number
  nome: string
  email: string
  /** 11 dígitos (CPF) ou 14 (CNPJ). Sem pontuação. */
  cpf: string
  /** Aceita qualquer formato — Vyat normaliza removendo não-dígitos. */
  telefone?: string
  produto?: string
  /** Nosso ID externo (UUID). 1-64 chars no charset [A-Za-z0-9_-]. */
  external_id?: string
  /** Tempo de expiração desejado em segundos (60-86400). Se omitido, usa default do gateway. */
  expires_in_seconds?: number
}

export interface CreatePixOptions {
  /** UUID v4 pra header Idempotency-Key (cache 24h no Vyat). */
  idempotencyKey?: string
}

export interface VyatPixResponse {
  qrcode_url: string
  codigo_pix: string
  /** Igual ao `external_id` enviado, ou gerado pelo Vyat se omitido. */
  transaction_id: string
  /** UUID interno estável do Vyat — sempre presente. */
  vyat_transaction_id: string
  /** Expiração absoluta do PIX (ISO 8601). */
  expires_at: string
}

export interface VyatErrorResponse {
  error: string
  error_code?: VyatErrorCode
  retryable?: boolean
}

export interface VyatStatusResponse {
  transaction_id: string
  status: "pending" | "approved" | "refunded" | "chargeback"
  amount: number
  product_name: string
}

interface UTMs {
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
  utm_term: string
}

// =====================================================================
// VyatError
// =====================================================================

export class VyatError extends Error {
  readonly code: VyatErrorCode | "UNKNOWN"
  readonly retryable: boolean
  readonly httpStatus: number

  constructor(message: string, code: VyatErrorCode | "UNKNOWN", retryable: boolean, httpStatus: number) {
    super(message)
    this.name = "VyatError"
    this.code = code
    this.retryable = retryable
    this.httpStatus = httpStatus
  }
}

// =====================================================================
// Helpers internos
// =====================================================================

function captureUTMs(): UTMs {
  if (typeof window === "undefined") {
    return { utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "", utm_term: "" }
  }
  const w = window as unknown as { getVyatUTMs?: () => Partial<UTMs> }
  if (typeof w.getVyatUTMs === "function") {
    const tracked = w.getVyatUTMs()
    if (tracked && Object.keys(tracked).length > 0) {
      return {
        utm_source: tracked.utm_source ?? "",
        utm_medium: tracked.utm_medium ?? "",
        utm_campaign: tracked.utm_campaign ?? "",
        utm_content: tracked.utm_content ?? "",
        utm_term: tracked.utm_term ?? "",
      }
    }
  }
  const params = new URLSearchParams(window.location.search)
  return {
    utm_source: params.get("utm_source") ?? "",
    utm_medium: params.get("utm_medium") ?? "",
    utm_campaign: params.get("utm_campaign") ?? "",
    utm_content: params.get("utm_content") ?? "",
    utm_term: params.get("utm_term") ?? "",
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// =====================================================================
// API pública
// =====================================================================

export async function createVyatPix(
  params: VyatPixParams,
  options: CreatePixOptions = {},
): Promise<VyatPixResponse> {
  const utms = captureUTMs()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey

  let pixRes: Response
  try {
    pixRes = await fetch(PROXY_CREATE, {
      method: "POST",
      headers,
      body: JSON.stringify({
        valor: params.valor,
        nome: params.nome,
        email: params.email,
        cpf: params.cpf,
        telefone: params.telefone ?? "",
        produto: params.produto ?? "",
        external_id: params.external_id,
        expires_in_seconds: params.expires_in_seconds,
        ...utms,
      }),
    })
  } catch (err) {
    throw new VyatError(
      err instanceof Error ? err.message : "Falha de rede ao contatar o gateway.",
      "GATEWAY_ERROR",
      true,
      0,
    )
  }

  if (!pixRes.ok) {
    let errPayload: VyatErrorResponse | null = null
    try {
      errPayload = (await pixRes.json()) as VyatErrorResponse
    } catch {
      /* sem corpo legível */
    }
    const message = errPayload?.error ?? "Erro ao gerar cobrança PIX."
    const code = errPayload?.error_code ?? "UNKNOWN"
    const retryable = errPayload?.retryable ?? pixRes.status >= 500
    throw new VyatError(message, code, retryable, pixRes.status)
  }

  return (await pixRes.json()) as VyatPixResponse
}

/**
 * Cria PIX com retry automático em erros marcados como `retryable`.
 * Backoff exponencial: 1s, 2s, 4s. Reusa a mesma Idempotency-Key entre tentativas
 * pra garantir que se o request anterior chegou no servidor, não duplica.
 */
export async function createVyatPixWithRetry(
  params: VyatPixParams,
  options: CreatePixOptions = {},
  onAttempt?: (attempt: number, lastError?: VyatError) => void,
): Promise<VyatPixResponse> {
  const MAX_ATTEMPTS = 3
  const idempotencyKey = options.idempotencyKey ?? cryptoRandomUUID()
  let lastError: VyatError | undefined

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    onAttempt?.(attempt, lastError)
    try {
      return await createVyatPix(params, { ...options, idempotencyKey })
    } catch (err) {
      if (!(err instanceof VyatError) || !err.retryable || attempt === MAX_ATTEMPTS) throw err
      lastError = err
      await sleep(1000 * Math.pow(2, attempt - 1)) // 1s, 2s
    }
  }
  // Inalcançável — o loop ou retorna ou throw
  throw lastError ?? new VyatError("Retries esgotados", "UNKNOWN", false, 0)
}

export async function fetchVyatPixStatus(transactionId: string): Promise<VyatStatusResponse> {
  const url = `${PROXY_STATUS}?transaction_id=${encodeURIComponent(transactionId)}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new VyatError("Falha ao consultar status do PIX.", "GATEWAY_ERROR", true, res.status)
  }
  return (await res.json()) as VyatStatusResponse
}

/** Resolve a URL ou base64 do QR code para uso direto em <img>. */
export function pixImageSrc(qrcodeUrl: string | null | undefined): string | null {
  if (!qrcodeUrl) return null
  if (qrcodeUrl.startsWith("data:") || qrcodeUrl.startsWith("http")) return qrcodeUrl
  if (/^[A-Za-z0-9+/=\s]+$/.test(qrcodeUrl) && qrcodeUrl.length > 80) {
    return `data:image/png;base64,${qrcodeUrl.replace(/\s+/g, "")}`
  }
  return null
}

/**
 * Mensagem amigável pra mostrar pro user baseado no error_code do Vyat.
 * Códigos retryable já são tratados pelo retry automático — só caem aqui se esgotaram.
 */
export function describeVyatError(err: unknown): string {
  if (!(err instanceof VyatError)) {
    return err instanceof Error ? err.message : "Erro inesperado. Tente novamente."
  }
  switch (err.code) {
    case "VALIDATION_ERROR":
      return "Algum dado do pedido está inválido. Revise e tente de novo."
    case "INVALID_AMOUNT":
      return "Valor do pedido inválido."
    case "IDEMPOTENCY_KEY_PAYLOAD_MISMATCH":
      return "Pedido alterado durante o envio. Tente finalizar de novo."
    case "DUPLICATE_EXTERNAL_ID":
      return "Esse pedido já foi enviado. Verifique seus pedidos em andamento."
    case "INSUFFICIENT_GATEWAY":
      return "Pagamento PIX está indisponível no momento. Escolha outro método."
    case "RATE_LIMITED":
      return "Muitas tentativas em pouco tempo. Aguarde alguns segundos."
    case "GATEWAY_ERROR":
      return "O sistema de pagamento está com instabilidade. Tente de novo em instantes."
    case "INTERNAL_ERROR":
      return "Erro temporário no nosso lado. Tente de novo."
    default:
      return err.message || "Erro ao gerar PIX. Tente de novo."
  }
}

function cryptoRandomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  // Fallback bobo
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
