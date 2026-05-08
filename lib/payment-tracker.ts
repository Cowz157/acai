"use client"

import { useEffect, useRef } from "react"
import { fetchVyatPixStatus } from "./pix-vyat"
import { type PaymentStatus, type SavedOrder } from "./order-store"

const POLL_INTERVAL_MS = 5000
/** Tempo máximo de polling antes de desistir (1h cobre PIX que vencem em 30min com folga). */
const POLL_TIMEOUT_MS = 60 * 60 * 1000

/** Mapeia status vindo do Vyat (`/pix/status`) para nosso PaymentStatus interno. */
export function mapVyatStatus(status: string): PaymentStatus {
  switch (status) {
    case "approved":
      return "approved"
    case "refunded":
      return "refunded"
    case "chargeback":
      return "chargeback"
    case "pending":
      return "pending"
    default:
      // Status fora do enum conhecido — pode ser novo estado (cancelled/failed/expired)
      // que a Vyat passou a retornar e não estamos mapeando. Loga pra investigar antes
      // de virar bug silencioso (cliente fica em loop esperando aprovação).
      console.warn(`[payment-tracker] status desconhecido do Vyat: "${status}" — tratando como pending`)
      return "pending"
  }
}

interface UsePaymentTrackingOptions {
  order: SavedOrder | null
  onUpdate: (patch: Partial<SavedOrder>) => void
}

/**
 * Hook que faz polling do status do PIX no Vyat enquanto o pedido está pendente.
 * Quando detecta mudança, chama `onUpdate` com o patch — parent é responsável
 * por persistir e atualizar seu state.
 */
export function usePaymentTracking({ order, onUpdate }: UsePaymentTrackingOptions): void {
  const startedAt = useRef<number>(Date.now())
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate
  const emailDispatchedRef = useRef<string | null>(null)

  useEffect(() => {
    startedAt.current = Date.now()
  }, [order?.id])

  useEffect(() => {
    if (!order) return
    if (order.payment.method !== "pix") return
    if (order.paymentStatus !== "pending") return
    if (!order.gatewayTransactionId) return

    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) return

      try {
        const remote = await fetchVyatPixStatus(order.gatewayTransactionId!)
        if (cancelled) return

        const newStatus = mapVyatStatus(remote.status)
        if (newStatus === order.paymentStatus) return

        onUpdateRef.current({
          paymentStatus: newStatus,
          paidAt: newStatus === "approved" ? Date.now() : order.paidAt,
        })

        if (newStatus === "approved" && emailDispatchedRef.current !== order.id) {
          emailDispatchedRef.current = order.id
          // Marca pedido como pago no Supabase — sem isso, status fica 'pending'
          // indefinidamente e o cron de abandonment manda nudge pra quem já pagou.
          void fetch(`/api/orders/${encodeURIComponent(order.id)}/mark-paid`, {
            method: "POST",
          }).catch((err) => {
            console.error("[payment-tracker] falha ao marcar pedido como pago:", err)
          })
          // Email transacional de confirmação
          void fetch("/api/orders/send-confirmation-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: order.id }),
          }).catch((err) => {
            console.error("[payment-tracker] falha ao enviar email de confirmação:", err)
          })
        }
      } catch (err) {
        console.error("[payment-tracker] erro polling status PIX:", err)
      }
    }

    void tick()
    const interval = setInterval(tick, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [order?.id, order?.gatewayTransactionId, order?.paymentStatus, order?.payment.method, order])
}
