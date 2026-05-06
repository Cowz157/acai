"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useCart } from "@/lib/cart-store"
import { CartDrawer } from "./cart-drawer"
import { FloatingCartButton } from "./floating-cart-button"
import { MobileCartBar } from "./mobile-cart-bar"

export function CartUI() {
  const pathname = usePathname()
  const router = useRouter()
  const hasItems = useCart((s) => s.items.length > 0)
  const hideTriggers = pathname?.startsWith("/checkout")

  // Pré-carrega /checkout assim que o usuário tem item no carrinho. Quando ele
  // clicar em "Finalizar", o bundle já está em cache — transição quase instantânea.
  useEffect(() => {
    if (hasItems) router.prefetch("/checkout")
  }, [hasItems, router])

  return (
    <>
      <CartDrawer />
      {!hideTriggers && (
        <>
          <FloatingCartButton />
          <MobileCartBar />
        </>
      )}
    </>
  )
}
