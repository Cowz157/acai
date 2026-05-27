import { NextResponse, type NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VYAT_KEY = process.env.NEXT_PUBLIC_VYAT_KEY ?? ""
const VYAT_BASE = process.env.NEXT_PUBLIC_VYAT_BASE_URL ?? "https://api.vyat.app"

/**
 * UA de browser real pra reduzir falsos positivos do Cloudflare Managed Challenge
 * em chamadas server-to-server. Workaround temporário até a config Cloudflare da
 * Vyat ser ajustada (Custom Rule Skip + diagnose via Security Events).
 */
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/**
 * Proxy server-side pra POST /v1/pix/criar do Vyat.
 * Resolve CORS (browser → server local → Vyat) e centraliza a key no servidor.
 *
 * Aceita o mesmo body que o Vyat espera + repassa o header `Idempotency-Key` se vier.
 */
export async function POST(request: NextRequest) {
  if (!VYAT_KEY) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_VYAT_KEY não configurada no servidor", error_code: "INTERNAL_ERROR", retryable: false },
      { status: 500 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { error: "Body JSON inválido", error_code: "VALIDATION_ERROR", retryable: false },
      { status: 400 },
    )
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": BROWSER_UA,
  }
  const idempotencyKey = request.headers.get("idempotency-key")
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey

  // Injeta cookies _fbc/_fbp do browser do comprador no payload do PIX.
  // Sem isso, a CAPI server-side da Vyat dispara Purchase sem as match keys
  // principais (fbc/fbp do Facebook), degradando match rate em 30-50% segundo
  // métricas da própria Meta. Cookies vêm same-origin (acai.pedii.shop), então
  // request.cookies.get() funciona automaticamente. customer_ip e user_agent
  // a própria Vyat já auto-injeta a partir dos headers do request — não precisa
  // duplicar.
  const fbcCookie = request.cookies.get("_fbc")?.value
  const fbpCookie = request.cookies.get("_fbp")?.value
  if (fbcCookie && !body.fbc) body.fbc = fbcCookie
  if (fbpCookie && !body.fbp) body.fbp = fbpCookie

  // ===== LOGGING TEMPORÁRIO — diagnóstico do GATEWAY_ERROR + atribuição =====
  // Sanitiza payload pra log (esconde CPF/telefone, mascara email).
  // Flags has_* nos campos de atribuição permitem ver no Railway se cada um
  // dos campos novos (gap #1 do diagnóstico Vyat) chega populado em vendas
  // reais, sem precisar inspecionar o body inteiro.
  const sentSanitized = {
    valor: body.valor,
    email: typeof body.email === "string" ? body.email.slice(0, 3) + "***@" + (body.email.split("@")[1] ?? "") : null,
    produto: body.produto,
    external_id: body.external_id,
    expires_in_seconds: body.expires_in_seconds,
    has_cpf: typeof body.cpf === "string" && body.cpf.length > 0,
    has_telefone: typeof body.telefone === "string" && body.telefone.length > 0,
    has_idempotency_key: Boolean(idempotencyKey),
    has_fbc: Boolean(body.fbc),
    has_fbp: Boolean(body.fbp),
    has_campaign_id: Boolean(body.campaign_id),
    has_adset_id: Boolean(body.adset_id),
    has_ad_id: Boolean(body.ad_id),
    has_ad_account_id: Boolean(body.ad_account_id),
    has_fbclid: Boolean(body.fbclid),
    has_ttclid: Boolean(body.ttclid),
    key_prefix: VYAT_KEY.slice(0, 8),
    vyat_base: VYAT_BASE,
  }
  console.log("[proxy/vyat/pix/criar] enviando:", sentSanitized)
  // ============================================================

  try {
    const upstream = await fetch(`${VYAT_BASE}/v1/pix/criar`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...body,
        key: VYAT_KEY, // garante que a key está sempre presente
      }),
    })

    const text = await upstream.text()

    // ===== LOGGING TEMPORÁRIO — captura resposta completa do Vyat =====
    let parsedBody: unknown
    try {
      parsedBody = JSON.parse(text)
    } catch {
      parsedBody = text.slice(0, 500) // se não é JSON, mostra primeiros 500 chars
    }
    console.log("[proxy/vyat/pix/criar] resposta Vyat:", {
      status: upstream.status,
      statusText: upstream.statusText,
      body: parsedBody,
      headers: {
        "content-type": upstream.headers.get("content-type"),
        "retry-after": upstream.headers.get("retry-after"),
        "x-request-id": upstream.headers.get("x-request-id"),
        "cf-ray": upstream.headers.get("cf-ray"),
        "cf-cache-status": upstream.headers.get("cf-cache-status"),
        server: upstream.headers.get("server"),
      },
    })
    // ==================================================================

    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    })
  } catch (err) {
    // ===== LOGGING TEMPORÁRIO — captura exception do fetch =====
    console.error("[proxy/vyat/pix/criar] FETCH FALHOU (network/timeout/DNS):", {
      name: err instanceof Error ? err.name : "unknown",
      message: err instanceof Error ? err.message : String(err),
      cause: err instanceof Error ? (err as Error & { cause?: unknown }).cause : undefined,
      stack: err instanceof Error ? err.stack?.split("\n").slice(0, 5).join("\n") : undefined,
    })
    // ===========================================================
    return NextResponse.json(
      { error: "Falha de comunicação com o gateway", error_code: "GATEWAY_ERROR", retryable: true },
      { status: 502 },
    )
  }
}
