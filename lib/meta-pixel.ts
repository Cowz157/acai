/**
 * Helper pra Advanced Matching do Meta Pixel.
 *
 * Em vez de passar user_data em cada `fbq('track', ...)` (que requereria
 * bypass do listener dataLayer→fbq do pixel.js da Vyat e teria risco de
 * duplicação), usa o padrão idiomático Meta: `fbq('init', PIXEL_ID, userData)`
 * re-chamado quando user_data fica disponível. Atualiza os match params
 * globais — todos eventos subsequentes herdam, sem mexer em código de track.
 *
 * Meta hasheia (SHA-256 lowercase trimmed) automaticamente client-side,
 * então passamos plain text. Doc oficial:
 *   https://developers.facebook.com/docs/meta-pixel/advanced/advanced-matching
 *
 * Pixel ID vem de `window.tpPixelConfig.pixel_id` (populado pelo pixel.js da
 * Vyat após resolver `/api/pixels/config/{tpPixelId}` do backend Vyat).
 * Fallback hardcoded pra `4346723862313437` (Pixel real configurado no
 * painel Vyat) caso a config ainda não tenha carregado.
 *
 * Objetivo: subir EMQ (Event Match Quality) no Events Manager do Meta de
 * ~6.1 ("Update recommended") pra 8+ ("Great") — melhora atribuição de
 * conversões pra usuários iOS/ATT e ad-blockers leves.
 */

const FALLBACK_PIXEL_ID = "4346723862313437"

/** Plain text — Meta hasheia client-side. Não pré-hashear aqui. */
export interface MetaUserData {
  /** Email do user. Lowercase + trim aplicado automaticamente pelo Meta. */
  em?: string
  /** Telefone — só dígitos, com DDI (ex: 5511999999999). */
  ph?: string
  /** Primeiro nome (split por espaço). */
  fn?: string
  /** Sobrenome (resto após primeiro espaço). */
  ln?: string
  /** ID externo (ex: order.id) — match key forte pra dedup com CAPI. */
  external_id?: string
}

type FbqFn = (cmd: string, ...args: unknown[]) => void
declare global {
  interface Window {
    fbq?: FbqFn
    tpPixelConfig?: { pixel_id?: string | number; meta_pixels?: Array<{ pixel_id?: string | number }> }
  }
}

function getPixelId(): string | null {
  if (typeof window === "undefined") return null
  const config = window.tpPixelConfig
  const fromConfig = config?.pixel_id ?? config?.meta_pixels?.[0]?.pixel_id
  if (fromConfig) return String(fromConfig)
  return FALLBACK_PIXEL_ID
}

/**
 * Normaliza phone BR pra E.164 sem +: só dígitos, prefixo 55 se faltar.
 */
function normalizePhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined
  const digits = phone.replace(/\D/g, "")
  if (!digits) return undefined
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

/**
 * Quebra fullName em firstName + lastName. Tudo lowercase + trim.
 */
function splitFullName(fullName: string | undefined): { fn?: string; ln?: string } {
  if (!fullName) return {}
  const trimmed = fullName.trim().toLowerCase()
  if (!trimmed) return {}
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { fn: parts[0] }
  return { fn: parts[0], ln: parts.slice(1).join(" ") }
}

/**
 * Atualiza match keys do Meta Pixel via re-init. Chamar quando user_data
 * fica disponível (ex: após user preencher identification no checkout).
 *
 * No-op silencioso se:
 * - Rodando server-side
 * - `window.fbq` ainda não foi injetado pelo pixel.js da Vyat (race no load)
 * - Nenhum campo de match key foi passado
 *
 * Re-chamar é seguro: Meta substitui os match params anteriores. Não
 * duplica eventos (init só atualiza globals, não dispara nada).
 */
export function updateMetaAdvancedMatching(input: {
  email?: string
  phone?: string
  fullName?: string
  external_id?: string
}): void {
  if (typeof window === "undefined") return
  if (typeof window.fbq !== "function") return

  const { fn, ln } = splitFullName(input.fullName)
  const ph = normalizePhone(input.phone)
  const em = input.email?.trim().toLowerCase() || undefined
  const external_id = input.external_id?.trim() || undefined

  const userData: MetaUserData = {}
  if (em) userData.em = em
  if (ph) userData.ph = ph
  if (fn) userData.fn = fn
  if (ln) userData.ln = ln
  if (external_id) userData.external_id = external_id

  if (Object.keys(userData).length === 0) return

  const pixelId = getPixelId()
  if (!pixelId) return

  try {
    window.fbq("init", pixelId, userData)
  } catch {
    // fbq pode lançar se chamado antes de fbevents.js terminar boot
  }
}
