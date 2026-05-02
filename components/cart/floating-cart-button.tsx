"use client"

import { useEffect, useState } from "react"
import { ShoppingBag } from "lucide-react"
import { useCart } from "@/lib/cart-store"

export function FloatingCartButton() {
  const items = useCart((s) => s.items)
  const setOpen = useCart((s) => s.setOpen)
  const pulse = useCart((s) => s.pulse)
  const count = items.reduce((sum, it) => sum + it.quantity, 0)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    if (pulse === 0) return
    setAnimate(true)
    const t = setTimeout(() => setAnimate(false), 600)
    return () => clearTimeout(t)
  }, [pulse])

  if (count === 0) return null

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Abrir carrinho com ${count} ${count === 1 ? "item" : "itens"}`}
      className={`fixed bottom-6 right-6 z-40 hidden h-16 w-16 items-center justify-center rounded-full bg-primary-light text-white shadow-lg transition md:flex hover:scale-105 hover:shadow-xl ${
        animate ? "animate-cart-pulse" : ""
      }`}
    >
      <ShoppingBag className="h-7 w-7" />
      <span className="absolute -right-1 -top-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-white bg-danger px-1 text-[11px] font-extrabold text-white">
        {count > 99 ? "99+" : count}
      </span>
    </button>
  )
}
