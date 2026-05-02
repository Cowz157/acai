"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { type CartItem } from "@/lib/cart-store"
import { formatMoneyBR } from "@/lib/format"
import { cn } from "@/lib/utils"

interface OrderSummaryProps {
  items: CartItem[]
  subtotal: number
  shippingPrice: number
  total: number
  defaultOpen?: boolean
}

export function OrderSummary({
  items,
  subtotal,
  shippingPrice,
  total,
  defaultOpen = false,
}: OrderSummaryProps) {
  const [open, setOpen] = useState(defaultOpen)
  const count = items.reduce((sum, it) => sum + it.quantity, 0)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="text-sm">
          <span className="font-bold text-foreground">Seu pedido</span>{" "}
          <span className="text-muted-foreground">
            ({count} {count === 1 ? "item" : "itens"})
          </span>
          <span className="ml-2 font-extrabold text-success">{formatMoneyBR(total)}</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="bg-white">
          <ul className="divide-y divide-border">
            {items.map((it) => (
              <li key={it.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                  <span className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-md bg-primary px-2 py-0.5 text-xs font-extrabold tabular-nums text-white">
                    {it.quantity}×
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground">{it.productName}</div>
                    {it.observations && (
                      <div className="mt-0.5 text-xs italic text-muted-foreground">Obs: {it.observations}</div>
                    )}
                  </div>
                </div>
                <div className="font-bold tabular-nums text-success">{formatMoneyBR(it.subtotal)}</div>
              </li>
            ))}
          </ul>

          <div className="space-y-1.5 border-t border-border px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-foreground tabular-nums">{formatMoneyBR(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entrega</span>
              {shippingPrice > 0 ? (
                <span className="font-semibold text-foreground tabular-nums">+ {formatMoneyBR(shippingPrice)}</span>
              ) : (
                <span className="font-bold text-success">Grátis</span>
              )}
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-2">
              <span className="font-bold text-foreground">Total</span>
              <span className="text-base font-extrabold text-success tabular-nums">{formatMoneyBR(total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
