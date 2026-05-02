"use client"

import { usePathname } from "next/navigation"
import { CartDrawer } from "./cart-drawer"
import { FloatingCartButton } from "./floating-cart-button"
import { MobileCartBar } from "./mobile-cart-bar"

export function CartUI() {
  const pathname = usePathname()
  const hideTriggers = pathname?.startsWith("/checkout")

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
