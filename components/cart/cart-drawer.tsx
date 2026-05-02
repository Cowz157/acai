"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ShoppingBag, X } from "lucide-react"
import { MIN_ORDER_VALUE, useCart } from "@/lib/cart-store"
import { formatMoneyBR } from "@/lib/format"
import { CartItem } from "./cart-item"
import { EmptyCart } from "./empty-cart"

export function CartDrawer() {
  const router = useRouter()
  const isOpen = useCart((s) => s.isOpen)
  const setOpen = useCart((s) => s.setOpen)
  const items = useCart((s) => s.items)
  const total = items.reduce((sum, it) => sum + it.subtotal, 0)
  const missing = Math.max(0, MIN_ORDER_VALUE - total)
  const canCheckout = items.length > 0 && total >= MIN_ORDER_VALUE

  // Bloqueia scroll do body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  // Esc fecha
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, setOpen])

  const handleCheckout = () => {
    if (!canCheckout) return
    setOpen(false)
    router.push("/checkout")
  }

  const handleContinue = () => {
    setOpen(false)
    router.push("/")
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[60] bg-black/60 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
      />

      {/* Drawer container - mobile: bottom sheet full screen, desktop: lateral right */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho de compras"
        className={`fixed z-[70] flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-out
          inset-x-0 bottom-0 top-0 md:left-auto md:right-0 md:w-[440px] md:max-w-[90vw]
          ${isOpen ? "translate-x-0 translate-y-0" : "translate-y-full md:translate-x-full md:translate-y-0"}`}
      >
        {/* Header */}
        <header className="flex flex-shrink-0 items-center justify-between bg-primary px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold">Seu Pedido</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/15"
            aria-label="Fechar carrinho"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Conteúdo scroll */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <EmptyCart onContinue={handleContinue} />
          ) : (
            <div>
              {items.map((it) => (
                <CartItem key={it.id} item={it} />
              ))}
            </div>
          )}
        </div>

        {/* Footer (só aparece quando há itens) */}
        {items.length > 0 && (
          <footer className="flex-shrink-0 border-t border-border bg-white px-5 py-4 shadow-[0_-6px_16px_rgba(0,0,0,0.05)]">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">{formatMoneyBR(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxa de entrega</span>
                <span className="font-bold text-success">Grátis</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-2">
                <span className="font-bold text-foreground">Total</span>
                <span className="text-xl font-extrabold text-success">{formatMoneyBR(total)}</span>
              </div>
            </div>

            {missing > 0 && (
              <div className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs leading-snug text-danger">
                Adicione mais <strong>{formatMoneyBR(missing)}</strong> para atingir o pedido mínimo de{" "}
                {formatMoneyBR(MIN_ORDER_VALUE)}
              </div>
            )}

            <button
              type="button"
              onClick={handleCheckout}
              disabled={!canCheckout}
              className={`mt-4 w-full rounded-full bg-success px-6 py-3.5 text-sm font-bold text-white shadow-sm transition ${
                canCheckout ? "hover:brightness-95" : "cursor-not-allowed opacity-50"
              }`}
            >
              Finalizar Pedido →
            </button>

            <button
              type="button"
              onClick={handleContinue}
              className="mt-2 w-full text-center text-xs text-muted-foreground transition hover:text-foreground"
            >
              Continuar comprando
            </button>
          </footer>
        )}
      </aside>
    </>
  )
}
