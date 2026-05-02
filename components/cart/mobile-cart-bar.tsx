"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { ShoppingBag } from "lucide-react"
import { useCart } from "@/lib/cart-store"
import { formatMoneyBR } from "@/lib/format"

export function MobileCartBar() {
  const pathname = usePathname()
  const items = useCart((s) => s.items)
  const setOpen = useCart((s) => s.setOpen)
  const pulse = useCart((s) => s.pulse)
  const count = items.reduce((sum, it) => sum + it.quantity, 0)
  const total = items.reduce((sum, it) => sum + it.subtotal, 0)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    if (pulse === 0) return
    setAnimate(true)
    const t = setTimeout(() => setAnimate(false), 600)
    return () => clearTimeout(t)
  }, [pulse])

  if (count === 0) return null
  if (pathname?.startsWith("/produto/")) return null

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Ver pedido"
      className={`fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 bg-primary-light px-5 py-3.5 text-white shadow-[0_-6px_16px_rgba(0,0,0,0.15)] transition md:hidden ${
        animate ? "animate-cart-bar-pulse" : ""
      }`}
    >
      <span className="flex items-center gap-2 font-bold">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <ShoppingBag className="h-4 w-4" />
        </span>
        <span className="text-sm">
          {count} {count === 1 ? "item" : "itens"}
        </span>
      </span>
      <span className="text-base font-extrabold tabular-nums">{formatMoneyBR(total)}</span>
      <span className="text-sm font-bold">Ver pedido →</span>
    </button>
  )
}
