"use client"

import { useEffect, useState } from "react"
import { Gift } from "lucide-react"
import { type CouponInfo, useActiveCoupon } from "@/lib/coupon-url"

const SEEN_KEY = "acai-coupon-welcome-modal-seen"

/**
 * Modal de boas-vindas pro usuário que chegou via `?cupom=ACAI20`. Comunica
 * que tem cupom ativo de forma destacada (igual o "Loja encontrada!" do
 * LocationModal step 4), mas só 1× por cupom — depois que user dispensa,
 * fica só com sinalizações sutis (preço com desconto no ProductCard +
 * confirmação no checkout).
 *
 * Aparece quando:
 *   - Tem cupom em localStorage (via captureCouponFromUrl)
 *   - User ainda não dispensou esse cupom específico nessa sessão
 *
 * Some quando:
 *   - User clica "Ver cardápio com desconto"
 *   - User clica X
 *   - Cupom é aplicado no checkout (clearStoredCoupon dispara evento)
 *
 * Coordena com LocationModal — aguarda evento `location-modal-closed`
 * antes de abrir, pra não ter 2 modais sobrepostos no primeiro pageview.
 */
function describeDiscount(coupon: CouponInfo): string {
  if (coupon.discount_type === "percentage") {
    return `${coupon.discount_value}% OFF`
  }
  return `R$ ${coupon.discount_value.toFixed(2).replace(".", ",")} OFF`
}

export function CouponWelcomeModal() {
  const coupon = useActiveCoupon()
  const [locationModalClosed, setLocationModalClosed] = useState(false)
  const [seen, setSeen] = useState(false)

  // Verifica se já viu o modal nessa sessão (sessionStorage — reaparece em
  // nova aba/sessão, mas não chateia se user navegar dentro da mesma).
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const seenCode = window.sessionStorage.getItem(SEEN_KEY)
      if (coupon && seenCode === coupon.code) setSeen(true)
    } catch {
      /* ignora */
    }
  }, [coupon])

  // Aguarda LocationModal fechar antes de aparecer (evita 2 modais
  // sobrepostos no primeiro carregamento da home).
  useEffect(() => {
    if (typeof window === "undefined") return
    // Se já foi marcado como visto (memória abaixo), considera "fechado"
    // pra que o coupon modal possa abrir imediatamente
    try {
      const locSeen = window.localStorage.getItem("acai-location-modal-seen")
      if (locSeen === "1") {
        setLocationModalClosed(true)
        return
      }
    } catch {
      /* ignora */
    }
    const handler = () => setLocationModalClosed(true)
    window.addEventListener("location-modal-closed", handler)
    return () => window.removeEventListener("location-modal-closed", handler)
  }, [])

  const handleDismiss = () => {
    if (!coupon) return
    try {
      window.sessionStorage.setItem(SEEN_KEY, coupon.code)
    } catch {
      /* ignora */
    }
    setSeen(true)
  }

  if (!coupon || seen || !locationModalClosed) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl md:p-8">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
            <Gift className="h-9 w-9 text-primary" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-xl font-bold text-primary md:text-2xl">
          Você tem um cupom ativo! 🎁
        </h2>
        <div className="mt-4 rounded-xl border-2 border-dashed border-primary bg-primary-soft px-4 py-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
            Seu cupom exclusivo
          </p>
          <p className="mt-1 text-3xl font-extrabold tracking-wider text-primary">{coupon.code}</p>
          <p className="mt-1 text-sm font-semibold text-primary">
            {describeDiscount(coupon)} no seu pedido
          </p>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          O desconto é <strong className="text-foreground">aplicado automaticamente</strong> no
          pagamento. Funciona em <strong className="text-foreground">qualquer açaí</strong> e vale
          1 uso por cliente.
        </p>
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-md bg-success px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
          >
            Ver cardápio com desconto!
          </button>
        </div>
      </div>
    </div>
  )
}
