"use client"

import Image from "next/image"
import { Minus, Plus, Sparkles } from "lucide-react"
import { useCart } from "@/lib/cart-store"
import { products, type Product } from "@/lib/data"
import { formatMoneyBR } from "@/lib/format"

const BUMP_SLUGS = ["nutella-30g", "bis-lacta-3un", "bis-lacta-branco-3un"] as const

const EMPTY_OPTIONS = {
  coberturas: [],
  frutas: [],
  complementos: [],
  turbine: [],
} as const

/**
 * Order bump no checkout — exibe addons (Nutella, Bis) com quantity stepper.
 * Sincroniza com o cart-store: cada incremento adiciona/atualiza o item.
 *
 * Conversão típica em order bumps deste tipo: 20-40% — cliente já decidiu
 * comprar, está só esperando pagar. Aumenta AOV em 15-25% sem custo extra
 * de aquisição.
 */
export function OrderBump() {
  const items = useCart((s) => s.items)
  const addItem = useCart((s) => s.addItem)
  const updateItemQuantity = useCart((s) => s.updateItemQuantity)
  const removeItem = useCart((s) => s.removeItem)

  const bumps: Product[] = BUMP_SLUGS.map((slug) =>
    products.find((p) => p.slug === slug),
  ).filter((p): p is Product => Boolean(p))

  if (bumps.length === 0) return null

  const getCartItem = (slug: string) => items.find((it) => it.productId === slug)

  const handleIncrement = (product: Product) => {
    const existing = getCartItem(product.slug)
    if (existing) {
      updateItemQuantity(existing.id, existing.quantity + 1)
    } else {
      addItem({
        productId: product.slug,
        productName: product.name,
        productImage: product.image,
        basePrice: product.price,
        quantity: 1,
        observations: "",
        selectedOptions: { ...EMPTY_OPTIONS },
      })
    }
  }

  const handleDecrement = (slug: string) => {
    const existing = getCartItem(slug)
    if (!existing) return
    if (existing.quantity <= 1) {
      removeItem(existing.id)
    } else {
      updateItemQuantity(existing.id, existing.quantity - 1)
    }
  }

  return (
    <div className="rounded-2xl border-2 border-primary bg-primary-soft/40 p-4 shadow-sm md:p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-extrabold text-primary md:text-lg">Quer turbinar seu açaí?</h2>
          <p className="text-xs text-muted-foreground">Adicione direto, sem voltar pro cardápio</p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {bumps.map((product) => {
          const cartItem = getCartItem(product.slug)
          const quantity = cartItem?.quantity ?? 0
          const selected = quantity > 0

          return (
            <div
              key={product.slug}
              className={`flex items-center gap-3 rounded-xl border-2 bg-white p-3 transition ${
                selected ? "border-success shadow-sm" : "border-border"
              }`}
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted/40">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-contain p-1"
                  sizes="64px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold leading-tight text-foreground">{product.name}</h3>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{product.description}</p>
                <p className="mt-1 text-base font-extrabold text-success">{formatMoneyBR(product.price)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 rounded-full border-2 border-border bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => handleDecrement(product.slug)}
                  disabled={quantity === 0}
                  aria-label={`Diminuir ${product.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground/40 disabled:hover:bg-transparent"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[24px] text-center text-sm font-extrabold tabular-nums text-foreground">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleIncrement(product)}
                  aria-label={`Adicionar ${product.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-white transition hover:brightness-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
