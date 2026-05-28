"use client"

import { useEffect, useRef } from "react"
import { fetchVyatPixStatus } from "./pix-vyat"
import { updateMetaAdvancedMatching } from "./meta-pixel"
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
          // dataLayer purchase + mark-paid + send-email foram extraídos pro
          // useEffect abaixo. Esse block continua sendo o caminho "rápido"
          // quando o polling DETECTA a mudança pending → approved em tempo
          // real (UX: status muda na tela na hora). O useEffect cobre os
          // cenários onde o polling NÃO detecta (pedido chega já approved
          // via cron, refresh, sessão posterior).
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

  // Effect separado pra dispatch do evento `purchase` no dataLayer. Independente
  // do polling — dispara em qualquer caminho onde o pedido fica approved:
  //   - Polling client detecta mudança pending → approved (caso normal)
  //   - Pedido chega já approved porque o cron server confirmou antes
  //   - User refresha página entre paymentStatus mudar e dataLayer.push acontecer
  //   - User abre /acompanhar com pedido antigo já approved (sessão posterior)
  // Flag `purchaseEventFired_<order.id>` em localStorage garante 1× por order
  // mesmo cross-page (/checkout → /acompanhar) e cross-session.
  useEffect(() => {
    if (!order) return
    if (order.paymentStatus !== "approved") return
    if (typeof window === "undefined") return

    const flagKey = `purchaseEventFired_${order.id}`
    let alreadyFired = false
    try {
      alreadyFired = Boolean(window.localStorage.getItem(flagKey))
    } catch {
      // localStorage indisponível (privacy mode etc) — segue sem flag.
      // No pior caso pode duplicar em refresh, mas o pixel.js da Vyat e o
      // próprio Meta dedupam pelo eventID = transaction_id.
    }
    if (alreadyFired) return

    // Advanced Matching reforçado pro Purchase — passa external_id +
    // email/phone/nome do pedido. Garante match keys mesmo em sessões
    // onde o user pulou direto pro /acompanhar sem passar pelo step de
    // identification do checkout (ex: link salvo, retorno após restart).
    updateMetaAdvancedMatching({
      email: order.delivery.email,
      phone: order.delivery.phone,
      fullName: order.delivery.fullName,
      external_id: order.id,
    })

    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event: "purchase",
      // Campos raiz mantidos pra retrocompat com as tags Google Ads existentes
      // no GTM (DLV - value, DLV - currency, DLV - transaction_id).
      value: order.total,
      currency: "BRL",
      transaction_id: order.id,
      // ecommerce nested (GA4 schema) — consumido pelo dataLayer listener
      // do pixel.js da Vyat (v3.2.0+), que mapeia purchase → Meta Purchase
      // usando ecommerce.transaction_id como eventID pra dedupar com a CAPI
      // server-side (que usa external_id = order.id como event_id).
      ecommerce: {
        transaction_id: order.id,
        value: order.total,
        currency: "BRL",
        items: order.items.map((it) => ({
          item_id: it.productId,
          item_name: it.productName,
          price: it.basePrice,
          quantity: it.quantity,
        })),
      },
    })

    // Log temporário pra confirmar visualmente quando dispara enquanto o
    // tracking estabiliza. Remover quando Events Manager Meta confirmar
    // Purchase "Deduplicated" em algumas compras seguidas sem regressão.
    console.log("[payment-tracker] purchase event dispatched no dataLayer:", {
      order_id: order.id,
      value: order.total,
      currency: "BRL",
      items_count: order.items.length,
    })

    try {
      window.localStorage.setItem(flagKey, String(Date.now()))
    } catch {
      // sem persistência — best-effort
    }
  }, [order])

  // Effect separado pra side-effects server-side quando approved é detectado:
  // mark-paid (UPDATE supabase) + send-confirmation-email (Resend). Mesmo padrão
  // do dataLayer purchase acima — independente do tick do polling, com flag em
  // localStorage pra dedup cross-page/cross-session. Cobre:
  //   - User refreshou /acompanhar com pedido já approved (status remoto bate
  //     com local, polling sai early no `if (newStatus === order.paymentStatus)`)
  //   - Cron server-side `check-pending-pix` está down/desabilitado (cron-job.org
  //     às vezes desabilita auto após N falhas consecutivas)
  // Os endpoints server são idempotentes (mark-paid é UPDATE no, send-email
  // tem claim atômico via confirmation_email_sent_at), então no pior caso o
  // dispatch duplica e o server resolve.
  useEffect(() => {
    if (!order) return
    if (order.paymentStatus !== "approved") return
    if (typeof window === "undefined") return

    const flagKey = `serverSideDispatched_${order.id}`
    let alreadyFired = false
    try {
      alreadyFired = Boolean(window.localStorage.getItem(flagKey))
    } catch {
      // segue sem flag
    }
    if (alreadyFired) return

    void fetch(`/api/orders/${encodeURIComponent(order.id)}/mark-paid`, {
      method: "POST",
    }).catch((err) => {
      console.error("[payment-tracker] falha ao marcar pedido como pago:", err)
    })

    void fetch("/api/orders/send-confirmation-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    }).catch((err) => {
      console.error("[payment-tracker] falha ao enviar email de confirmação:", err)
    })

    console.log("[payment-tracker] server-side dispatch enviado (mark-paid + send-email):", {
      order_id: order.id,
    })

    try {
      window.localStorage.setItem(flagKey, String(Date.now()))
    } catch {
      // best-effort
    }
  }, [order])
}
