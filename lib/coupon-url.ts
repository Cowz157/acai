"use client"

import { useEffect, useState } from "react"

/**
 * Captura e persistência de cupom vindo de URL.
 *
 * Fluxo:
 *   1. User chega em qualquer página com `?cupom=ACAI20` (ou `?coupon=ACAI20`).
 *   2. `captureCouponFromUrl()` (chamado em UtmsCapture no layout) busca info
 *      pública do cupom em /api/coupons/info e salva em localStorage por
 *      7 dias (code + discount_type + discount_value + min_subtotal).
 *   3. Componentes visuais (CouponWelcomeModal, ProductCard, cart drawer)
 *      leem via `useActiveCoupon()` pra mostrar desconto/aviso.
 *   4. No checkout step 3, `getStoredCouponInfo()` lê o storage e tenta
 *      auto-aplicar via /api/coupons/validate (que valida regras reais
 *      como max_uses_per_email).
 *   5. Após auto-aplicar, `clearStoredCoupon()` limpa pra não tentar de
 *      novo em próximas sessões.
 *
 * Importante: a info do cupom salva aqui NÃO é fonte da verdade pro
 * desconto final — só pra UX (mostrar preço estimado, banner, etc).
 * Cálculo real acontece em /api/coupons/validate no checkout.
 */

const STORAGE_KEY = "acai-tropical-coupon-url"
const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 dias
/** Evento custom disparado quando storage muda (capture/clear). Permite
 *  hooks/componentes reagirem em tempo real sem polling. */
export const COUPON_STORAGE_EVENT = "acai-coupon-url-changed"

export interface CouponInfo {
  code: string
  discount_type: "percentage" | "fixed_brl"
  discount_value: number
  min_subtotal_brl: number
}

interface StoredCoupon extends CouponInfo {
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

/**
 * Captura ?cupom= ou ?coupon= da URL, busca info pública em
 * /api/coupons/info e salva em localStorage. Async porque depende
 * de fetch — UtmsCapture chama fire-and-forget.
 */
export async function captureCouponFromUrl(): Promise<void> {
  if (typeof window === "undefined") return
  const params = new URLSearchParams(window.location.search)
  const code = (params.get("cupom") || params.get("coupon") || "").trim().toUpperCase()
  if (!code) return

  // Se já tem o mesmo cupom em storage e ainda válido, não refaz fetch
  // (otimização — user pode chegar várias vezes no mesmo dia).
  const existing = getStoredCouponInfo()
  if (existing && existing.code === code) return

  try {
    const res = await fetch(`/api/coupons/info?code=${encodeURIComponent(code)}`)
    const data = (await res.json()) as {
      valid: boolean
      code?: string
      discount_type?: "percentage" | "fixed_brl"
      discount_value?: number
      min_subtotal_brl?: number
    }
    if (!data.valid || !data.code || !data.discount_type || typeof data.discount_value !== "number") {
      // Cupom inválido/expirado/não existe — ignora silenciosamente
      return
    }
    const stored: StoredCoupon = {
      code: data.code,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      min_subtotal_brl: data.min_subtotal_brl ?? 0,
      capturedAt: Date.now(),
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    dispatchChange()
  } catch {
    /* ignora — fetch falhou, sem cupom salvo */
  }
}

export function getStoredCouponInfo(): CouponInfo | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredCoupon>
    if (!parsed.code || !parsed.capturedAt || !parsed.discount_type) return null
    if (Date.now() - parsed.capturedAt > TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY)
      dispatchChange()
      return null
    }
    return {
      code: parsed.code,
      discount_type: parsed.discount_type,
      discount_value: parsed.discount_value ?? 0,
      min_subtotal_brl: parsed.min_subtotal_brl ?? 0,
    }
  } catch {
    return null
  }
}

/** Compat com chamadas antigas — retorna só o código. */
export function getStoredCoupon(): string | null {
  return getStoredCouponInfo()?.code ?? null
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

/**
 * Calcula desconto aplicado num subtotal pro cupom dado. Usado pelo
 * ProductCard pra mostrar preço com cupom, pelo CouponWelcomeModal pra
 * mostrar "20% OFF", etc. Não substitui validação real do checkout.
 */
export function calculateCouponDiscount(coupon: CouponInfo, subtotal: number): number {
  let discount = 0
  if (coupon.discount_type === "percentage") {
    discount = (subtotal * coupon.discount_value) / 100
  } else {
    discount = coupon.discount_value
  }
  discount = Math.round(discount * 100) / 100
  if (discount > subtotal) discount = subtotal
  return discount
}

/**
 * Hook reativo pro cupom ativo. Re-renderiza quando capture/clear acontece
 * em outro componente. Retorna CouponInfo ou null.
 *
 * Usado em ProductCard, CouponWelcomeModal, cart-drawer, e qualquer outro
 * lugar que precise reagir à presença de cupom.
 */
export function useActiveCoupon(): CouponInfo | null {
  const [coupon, setCoupon] = useState<CouponInfo | null>(null)

  useEffect(() => {
    setCoupon(getStoredCouponInfo())
    const handler = () => setCoupon(getStoredCouponInfo())
    window.addEventListener(COUPON_STORAGE_EVENT, handler)
    return () => window.removeEventListener(COUPON_STORAGE_EVENT, handler)
  }, [])

  return coupon
}
