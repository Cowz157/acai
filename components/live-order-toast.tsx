"use client"

import { useEffect, useState } from "react"
import { X, Zap } from "lucide-react"
import { useCart } from "@/lib/cart-store"

export function LiveOrderToast() {
  const [visible, setVisible] = useState(false)
  const [closed, setClosed] = useState(false)
  const cartCount = useCart((s) => s.items.reduce((sum, it) => sum + it.quantity, 0))

  useEffect(() => {
    if (closed) return

    const showAfterDelay = () => {
      const timer = setTimeout(() => setVisible(true), 5000)
      return timer
    }

    const onClosed = () => {
      const t = showAfterDelay()
      ;(window as any).__toastTimer = t
    }

    window.addEventListener("location-modal-closed", onClosed)
    return () => {
      window.removeEventListener("location-modal-closed", onClosed)
      if ((window as any).__toastTimer) clearTimeout((window as any).__toastTimer)
    }
  }, [closed])

  if (!visible || closed) return null

  return (
    <div
      className={`fixed right-4 z-30 transition-[bottom] duration-300 ${
        cartCount > 0 ? "bottom-[88px] md:bottom-[100px]" : "bottom-4"
      }`}
      style={{ maxWidth: "min(320px, calc(100vw - 32px))" }}
    >
      <div className="relative flex items-start gap-3 rounded-xl border border-border bg-white px-4 py-3 pr-8 shadow-lg">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100">
          <Zap className="h-4 w-4 fill-orange-500 text-orange-500" />
        </div>
        <p className="pt-1 text-xs leading-snug text-foreground md:text-sm">
          Acabamos de bater <strong>100 pedidos</strong> de açaí só hoje!
        </p>
        <button
          type="button"
          onClick={() => setClosed(true)}
          aria-label="Fechar"
          className="absolute right-2 top-2 text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
