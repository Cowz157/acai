"use client"

import { useEffect, useState } from "react"
import { Sparkles, X } from "lucide-react"
import { COUPON_STORAGE_EVENT, getStoredCoupon } from "@/lib/coupon-url"

/**
 * Banner sticky no topo do site que aparece quando o user chegou via
 * `?cupom=ACAI20` (capturado por UtmsCapture no primeiro pageview e salvo
 * em localStorage). Comunica que tem desconto esperando sem depender de
 * toast efêmero.
 *
 * Some sozinho quando:
 *   - User aplica o cupom no checkout (clearStoredCoupon dispara evento)
 *   - TTL de 7 dias expira
 *   - User dispensa via X (só por essa sessão; refresh volta — comportamento
 *     intencional pra não deixar user perder o desconto sem querer)
 *
 * Mountar uma vez em `app/layout.tsx` logo após o UtmsCapture.
 */
export function CouponBanner() {
  const [code, setCode] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setCode(getStoredCoupon())
    const handler = () => setCode(getStoredCoupon())
    window.addEventListener(COUPON_STORAGE_EVENT, handler)
    return () => window.removeEventListener(COUPON_STORAGE_EVENT, handler)
  }, [])

  if (!code || dismissed) return null

  return (
    <div className="relative bg-gradient-to-r from-primary via-primary to-primary/85 text-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="truncate">
            Cupom <strong className="font-bold tracking-wide">{code}</strong> ativo — desconto aplicado no
            pagamento
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dispensar banner"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
