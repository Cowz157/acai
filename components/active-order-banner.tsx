"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Bike, ChevronRight, Clock, Loader2 } from "lucide-react"
import {
  getDeliveryAnchor,
  getLastOrder,
  getMinutesRemaining,
  getOrderStatus,
  type OrderStatus,
  type SavedOrder,
} from "@/lib/order-store"

const STATUS_LABEL: Record<OrderStatus, string> = {
  preparando: "Preparando seu pedido",
  despacho: "Pedido em despacho",
  "a-caminho": "Pedido a caminho",
  entregue: "Pedido entregue",
}

export function ActiveOrderBanner() {
  const [order, setOrder] = useState<SavedOrder | null>(null)
  const [now, setNow] = useState<number>(0)

  useEffect(() => {
    setOrder(getLastOrder())
    setNow(Date.now())
    const interval = setInterval(() => {
      setOrder(getLastOrder())
      setNow(Date.now())
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  if (!order || !now) return null

  // PIX pendente — pode estar ainda válido OU expirado
  if (order.payment.method === "pix" && order.paymentStatus === "pending") {
    const pixExpired = order.pixExpiresAt !== null && now > order.pixExpiresAt

    if (pixExpired) {
      return (
        <Link
          href="/acompanhar"
          className="flex items-center justify-between gap-3 rounded-xl border-2 border-yellow-300 bg-yellow-50 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-yellow-100/70 md:text-base"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-yellow-900">
              <Clock className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-yellow-900 md:text-base">
                PIX expirou #{order.orderId}
              </span>
              <span className="block text-xs text-yellow-800 md:text-sm">Toque pra gerar um novo</span>
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-yellow-900" />
        </Link>
      )
    }

    return (
      <Link
        href="/acompanhar"
        className="flex items-center justify-between gap-3 rounded-xl border-2 border-primary bg-primary-soft px-4 py-3 text-sm font-medium text-foreground transition hover:bg-primary-soft/70 md:text-base"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-primary md:text-base">
              Aguardando seu pagamento #{order.orderId}
            </span>
            <span className="block text-xs text-muted-foreground md:text-sm">Toque pra ver o QR de novo</span>
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
      </Link>
    )
  }

  // PIX recusado
  if (order.paymentStatus === "refused") {
    return (
      <Link
        href="/acompanhar"
        className="flex items-center justify-between gap-3 rounded-xl border-2 border-danger bg-danger-soft px-4 py-3 text-sm font-medium text-foreground transition hover:bg-danger-soft/70 md:text-base"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger text-white">
            ⚠️
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-danger md:text-base">
              Pagamento recusado #{order.orderId}
            </span>
            <span className="block text-xs text-muted-foreground md:text-sm">Toque pra refazer o pedido</span>
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-danger" />
      </Link>
    )
  }

  // Pedido em andamento (PIX pago ou cash/card)
  const anchor = getDeliveryAnchor(order)
  const status = getOrderStatus(anchor, order.etaMinutes, now)
  const minutes = getMinutesRemaining(anchor, order.etaMinutes, now)

  return (
    <Link
      href="/acompanhar"
      className="flex items-center justify-between gap-3 rounded-xl border-2 border-primary bg-primary-soft px-4 py-3 text-sm font-medium text-foreground transition hover:bg-primary-soft/70 md:text-base"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <Bike className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-primary md:text-base">
            {STATUS_LABEL[status]} #{order.orderId}
          </span>
          <span className="block text-xs text-muted-foreground md:text-sm">
            {status === "entregue"
              ? "Toque para ver os detalhes"
              : `Chega em ~${minutes} ${minutes === 1 ? "minuto" : "minutos"}`}
          </span>
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
    </Link>
  )
}
