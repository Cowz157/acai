"use client"

import { useEffect, useState } from "react"
import { Loader2, ShoppingBag } from "lucide-react"
import {
  fetchOrderHistory,
  getDeliveryAnchor,
  getOrderStatus,
  type OrderStatus,
  type SavedOrder,
} from "@/lib/order-store"
import { formatMoneyBR } from "@/lib/format"
import { cn } from "@/lib/utils"

const STATUS_LABEL: Record<OrderStatus, string> = {
  preparando: "Preparando",
  despacho: "Em despacho",
  "a-caminho": "A caminho",
  entregue: "Entregue",
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  preparando: "bg-primary-soft text-primary",
  despacho: "bg-primary-soft text-primary",
  "a-caminho": "bg-primary-soft text-primary",
  entregue: "bg-success-soft text-success",
}

function formatRelativeDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) +
    " às " +
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

export function OrderHistory({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<SavedOrder[] | null>(null)

  useEffect(() => {
    let isMounted = true
    fetchOrderHistory(userId, 10).then((data) => {
      if (isMounted) setOrders(data)
    })
    return () => {
      isMounted = false
    }
  }, [userId])

  if (orders === null) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white p-6 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando histórico...
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-white/50 p-6 text-center text-sm text-muted-foreground">
        <ShoppingBag className="h-6 w-6 text-muted-foreground/60" />
        <p>Você ainda não fez pedidos por aqui.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm">
      <h2 className="border-b border-border px-5 py-4 text-sm font-bold text-foreground">
        Meus pedidos
      </h2>
      <ul className="divide-y divide-border">
        {orders.map((order) => {
          const status = getOrderStatus(getDeliveryAnchor(order), order.etaMinutes)
          return (
            <li key={order.id} className="flex items-start justify-between gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">#{order.orderId}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      STATUS_STYLE[status],
                    )}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatRelativeDate(order.createdAt)}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {order.items.map((it) => `${it.quantity}× ${it.productName}`).join(" • ")}
                </p>
              </div>
              <span className="shrink-0 text-sm font-extrabold tabular-nums text-success">
                {formatMoneyBR(order.total)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
