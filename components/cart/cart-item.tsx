"use client"

import Image from "next/image"
import { Minus, Plus, Trash2 } from "lucide-react"
import { type CartItem as CartItemType, type CartItemOptions, useCart } from "@/lib/cart-store"
import { formatMoneyBR } from "@/lib/format"

interface CartItemProps {
  item: CartItemType
}

function listOptions(options: { name: string; quantity: number }[]): string {
  return options
    .filter((o) => o.quantity > 0)
    .map((o) => (o.quantity > 1 ? `${o.name} (${o.quantity}x)` : o.name))
    .join(", ")
}

function CupOptionsList({ options }: { options: CartItemOptions }) {
  const coberturas = listOptions(options.coberturas)
  const frutas = listOptions(options.frutas)
  const complementos = listOptions(options.complementos)
  const turbine = listOptions(options.turbine)

  return (
    <ul className="space-y-0.5 text-[11px] leading-snug text-muted-foreground">
      {coberturas && (
        <li>
          <span className="font-semibold">Coberturas:</span> {coberturas}
        </li>
      )}
      {frutas && (
        <li>
          <span className="font-semibold">Frutas:</span> {frutas}
        </li>
      )}
      {complementos && (
        <li>
          <span className="font-semibold">Complementos:</span> {complementos}
        </li>
      )}
      {turbine && (
        <li>
          <span className="font-semibold">Turbine:</span> {turbine}
        </li>
      )}
    </ul>
  )
}

export function CartItem({ item }: CartItemProps) {
  const { updateItemQuantity, removeItem } = useCart()

  const hasTwoCups = item.secondCupOptions != null

  return (
    <div className="flex gap-3 border-b border-border px-4 py-4">
      <div className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-lg bg-muted/40">
        <Image
          src={item.productImage || "/placeholder.svg"}
          alt={item.productName}
          fill
          className="object-contain"
          sizes="72px"
        />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold leading-snug text-foreground">{item.productName}</h3>

        {hasTwoCups ? (
          <div className="mt-1.5 space-y-2">
            <div className="rounded-md border border-primary/20 bg-primary-soft/40 px-2 py-1.5">
              <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">Copo 1</div>
              <CupOptionsList options={item.selectedOptions} />
            </div>
            <div className="rounded-md border border-primary/20 bg-primary-soft/40 px-2 py-1.5">
              <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">Copo 2</div>
              <CupOptionsList options={item.secondCupOptions!} />
            </div>
            {item.observations && (
              <p className="text-[11px] italic leading-snug text-muted-foreground">
                <span className="font-semibold not-italic">Obs:</span> {item.observations}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-1">
            <CupOptionsList options={item.selectedOptions} />
            {item.observations && (
              <p className="mt-0.5 text-[11px] italic leading-snug text-muted-foreground">
                <span className="font-semibold not-italic">Obs:</span> {item.observations}
              </p>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          {/* Stepper */}
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-white">
            <button
              type="button"
              onClick={() => {
                if (item.quantity === 1) {
                  removeItem(item.id)
                } else {
                  updateItemQuantity(item.id, item.quantity - 1)
                }
              }}
              className="flex h-7 w-7 items-center justify-center text-muted-foreground transition hover:text-foreground"
              aria-label="Diminuir quantidade"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[20px] text-center text-sm font-bold tabular-nums text-foreground">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
              className="flex h-7 w-7 items-center justify-center text-muted-foreground transition hover:text-foreground"
              aria-label="Aumentar quantidade"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-success">{formatMoneyBR(item.subtotal)}</span>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="text-muted-foreground transition hover:text-danger"
              aria-label="Remover item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
