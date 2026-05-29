/**
 * Captura e persistência de cupom vindo de URL.
 *
 * Fluxo:
 *   1. User chega em qualquer página com `?cupom=ACAI20` (ou `?coupon=ACAI20`).
 *   2. `captureCouponFromUrl()` (chamado em UtmsCapture no layout) salva
 *      em localStorage por 7 dias.
 *   3. No checkout step 3, `getStoredCoupon()` lê o storage e tenta
 *      auto-aplicar via /api/coupons/validate.
 *   4. Se aplicar com sucesso, `clearStoredCoupon()` limpa pra não tentar
 *      re-aplicar em próximas sessões (cliente que já usou).
 *
 * Diferente das UTMs (que ficam por 30 dias pra last-touch attribution):
 *   - Cupom é commerce, não tracking
 *   - 7 dias cobre o cliente que volta dias depois sem repetir o link
 *   - Limpa após aplicar — não polui storage indefinidamente
 *
 * Aceita os 2 nomes de query param pra resiliência (link copiado errado
 * ainda funciona). Mesma lógica do auto-apply em app/checkout/page.tsx.
 */

const STORAGE_KEY = "acai-tropical-coupon-url"
const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 dias
/** Evento custom disparado quando storage muda (capture/clear). Permite o
 *  CouponBanner reagir em tempo real sem polling — quando user chega com
 *  ?cupom=, banner aparece; quando auto-aplica no checkout, banner some. */
export const COUPON_STORAGE_EVENT = "acai-coupon-url-changed"

interface StoredCoupon {
  code: string
  capturedAt: number
}

function dispatchChange(): void {
  if (typeof window === "undefined") return
  try {
    window.dispatchEvent(new Event(COUPON_STORAGE_EVENT))
  } catch {
    /* ignora */
  }
}

export function captureCouponFromUrl(): void {
  if (typeof window === "undefined") return
  const params = new URLSearchParams(window.location.search)
  const code = (params.get("cupom") || params.get("coupon") || "").trim().toUpperCase()
  if (!code) return
  try {
    const stored: StoredCoupon = { code, capturedAt: Date.now() }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    dispatchChange()
  } catch {
    /* ignora — privado, storage cheio */
  }
}

export function getStoredCoupon(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredCoupon>
    if (!parsed.code || !parsed.capturedAt) return null
    if (Date.now() - parsed.capturedAt > TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY)
      dispatchChange()
      return null
    }
    return parsed.code
  } catch {
    return null
  }
}

export function clearStoredCoupon(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    dispatchChange()
  } catch {
    /* ignora */
  }
}
