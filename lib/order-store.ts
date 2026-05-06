"use client"

import type { CartItem } from "./cart-store"
import type { DeliveryData } from "./checkout-types"
import type { PaymentData } from "@/components/checkout/payment-step"
import { getShippingOption, type ShippingMethod } from "./data"
import { supabase } from "./supabase"

const STORAGE_KEY = "acai-tropical-last-order"

export type OrderStatus = "preparando" | "despacho" | "a-caminho" | "entregue"
export type PaymentStatus = "pending" | "approved" | "refused" | "refunded" | "chargeback"

export interface SavedPix {
  qrCodeUrl: string | null
  codigoPix: string | null
}

export interface SavedShipping {
  method: ShippingMethod
  /** Preço congelado no momento do pedido (pra evitar mudanças na tabela afetarem pedidos antigos). */
  price: number
}

export interface SavedOrder {
  /** ID interno (UUID) usado no Supabase. Único globalmente. */
  id: string
  /** Número curto exibido ao cliente (#12345). Pode repetir ao longo do tempo. */
  orderId: string
  /** Timestamp (ms) em que o pedido foi criado. */
  createdAt: number
  /** Tempo total estimado de entrega em minutos (sorteado dentro da janela do shipping escolhido). */
  etaMinutes: number
  items: CartItem[]
  /** Subtotal dos items (sem frete). */
  subtotal: number
  /** Total final cobrado (subtotal + shipping.price). */
  total: number
  delivery: DeliveryData
  payment: PaymentData
  shipping: SavedShipping

  /** Estado do pagamento. PIX começa "pending"; cash/card já saem "approved". */
  paymentStatus: PaymentStatus
  /** Timestamp (ms) em que o pagamento foi confirmado pelo gateway. */
  paidAt: number | null
  /** ID da transação no Vyat (chave pra polling de status e match com webhook). */
  gatewayTransactionId: string | null
  /** Dados do PIX preservados pra redisplay em /acompanhar quando ainda pendente. */
  pix: SavedPix | null
  /** Expiração do PIX em timestamp ms. Permite mostrar countdown e oferecer regerar. */
  pixExpiresAt: number | null
  /** Token único pra link `/acompanhar?token=xxx` enviado por email. */
  trackingToken: string | null
}

/** Proporções de cada etapa em relação ao tempo total do pedido. */
const STAGE_RATIO = {
  preparando: 0.27,
  despacho: 0.2,
  aCaminho: 0.53,
} as const

/**
 * Gera um ETA aleatório dentro da janela do shipping escolhido.
 * Padrão: 30-50 min. Express: 10-20 min.
 */
export function generateEtaMinutes(method: ShippingMethod = "standard"): number {
  const opt = getShippingOption(method)
  const span = opt.etaMaxMinutes - opt.etaMinMinutes + 1
  return opt.etaMinMinutes + Math.floor(Math.random() * span)
}

/**
 * "Anchor" do timeline de entrega:
 *  - PIX confirmado → conta a partir do paid_at
 *  - Cash/Card → conta a partir do createdAt (já confirma na criação)
 */
export function getDeliveryAnchor(order: SavedOrder): number {
  if (order.payment.method === "pix" && order.paidAt) return order.paidAt
  return order.createdAt
}

export function saveOrder(order: SavedOrder): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
  } catch {
    /* ignora */
  }
}

/** Atualiza apenas alguns campos do pedido salvo localmente. */
export function patchSavedOrder(patch: Partial<SavedOrder>): void {
  const current = getLastOrder()
  if (!current) return
  saveOrder({ ...current, ...patch })
}

export function getLastOrder(): SavedOrder | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SavedOrder>

    // Defaults pra orders antigos (pre-migration) — mantém retrocompat
    const paymentStatus: PaymentStatus =
      parsed.paymentStatus ?? (parsed.payment?.method === "pix" ? "pending" : "approved")

    const total = parsed.total ?? 0
    const shipping: SavedShipping = parsed.shipping ?? { method: "standard", price: 0 }
    return {
      id: parsed.id ?? "",
      orderId: parsed.orderId ?? "",
      createdAt: parsed.createdAt ?? Date.now(),
      etaMinutes: parsed.etaMinutes ?? 40,
      items: parsed.items ?? [],
      subtotal: parsed.subtotal ?? Math.max(0, total - shipping.price),
      total,
      delivery: parsed.delivery as DeliveryData,
      payment: parsed.payment as PaymentData,
      shipping,
      paymentStatus,
      paidAt: parsed.paidAt ?? null,
      gatewayTransactionId: parsed.gatewayTransactionId ?? null,
      pix: parsed.pix ?? null,
      pixExpiresAt: parsed.pixExpiresAt ?? null,
      trackingToken: parsed.trackingToken ?? null,
    }
  } catch {
    return null
  }
}

export function clearLastOrder(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignora */
  }
}

/** Calcula a etapa de entrega baseada no tempo decorrido desde o anchor. */
export function getOrderStatus(
  anchorMs: number,
  etaMinutes: number,
  now: number = Date.now(),
): OrderStatus {
  const totalSec = etaMinutes * 60
  const elapsed = Math.max(0, Math.floor((now - anchorMs) / 1000))
  if (elapsed < totalSec * STAGE_RATIO.preparando) return "preparando"
  if (elapsed < totalSec * (STAGE_RATIO.preparando + STAGE_RATIO.despacho)) return "despacho"
  if (elapsed < totalSec) return "a-caminho"
  return "entregue"
}

export function getOrderProgress(
  anchorMs: number,
  etaMinutes: number,
  now: number = Date.now(),
): number {
  const totalSec = etaMinutes * 60
  const elapsed = Math.max(0, Math.floor((now - anchorMs) / 1000))
  return Math.min(1, elapsed / totalSec)
}

export function getMinutesRemaining(
  anchorMs: number,
  etaMinutes: number,
  now: number = Date.now(),
): number {
  const totalSec = etaMinutes * 60
  const elapsed = Math.floor((now - anchorMs) / 1000)
  const remaining = Math.max(0, totalSec - elapsed)
  return Math.ceil(remaining / 60)
}

// =====================================================================
// Supabase — persistência remota
// =====================================================================

export interface RemoteOrderRow {
  id: string
  order_number: string
  user_id: string | null
  status: PaymentStatus
  paid_at: string | null
  gateway_transaction_id: string | null
  tracking_token: string | null
  created_at: string
  eta_minutes: number
  items: CartItem[]
  total: number
  delivery: DeliveryData
  payment: PaymentData
  pix_qrcode_url: string | null
  pix_codigo: string | null
  pix_expires_at: string | null
}

/**
 * Envia o pedido pro Supabase. Tolera falhas (logado ou não, online ou não).
 * O localStorage continua sendo a fonte de verdade pro /acompanhar.
 *
 * Como a tabela `orders` não tem coluna dedicada pra shipping, embarcamos os
 * dados dentro do JSONB `delivery` (campo `shipping`). Sem migration extra.
 */
export async function saveOrderRemote(order: SavedOrder, userId: string | null): Promise<void> {
  try {
    const { error } = await supabase.from("orders").insert({
      id: order.id,
      order_number: order.orderId,
      user_id: userId,
      status: order.paymentStatus,
      paid_at: order.paidAt ? new Date(order.paidAt).toISOString() : null,
      gateway_transaction_id: order.gatewayTransactionId,
      tracking_token: order.trackingToken,
      created_at: new Date(order.createdAt).toISOString(),
      eta_minutes: order.etaMinutes,
      items: order.items,
      total: order.total,
      delivery: { ...order.delivery, shipping: order.shipping, subtotal: order.subtotal },
      payment: order.payment,
      pix_qrcode_url: order.pix?.qrCodeUrl ?? null,
      pix_codigo: order.pix?.codigoPix ?? null,
      pix_expires_at: order.pixExpiresAt ? new Date(order.pixExpiresAt).toISOString() : null,
    })
    if (error) {
      console.error("[order-store] saveOrderRemote falhou:", error.message)
    }
  } catch (err) {
    console.error("[order-store] saveOrderRemote exception:", err)
  }
}

/**
 * Cancela um pedido pendente: chama o endpoint server-side e limpa o localStorage.
 * Retorna { ok: true } em sucesso ou { ok: false, error } em falha.
 */
export async function cancelOrder(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: "POST",
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      return { ok: false, error: data.error ?? "Falha ao cancelar pedido" }
    }
    clearLastOrder()
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao cancelar pedido",
    }
  }
}

/** Busca os últimos pedidos do usuário logado. */
export async function fetchOrderHistory(userId: string, limit = 10): Promise<SavedOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((row: RemoteOrderRow) => {
    const deliveryWithExtras = row.delivery as DeliveryData & {
      shipping?: SavedShipping
      subtotal?: number
    }
    const total = Number(row.total)
    const shipping: SavedShipping = deliveryWithExtras.shipping ?? { method: "standard", price: 0 }
    const { shipping: _s, subtotal: extraSub, ...delivery } = deliveryWithExtras
    const pix: SavedPix | null =
      row.pix_qrcode_url || row.pix_codigo
        ? { qrCodeUrl: row.pix_qrcode_url, codigoPix: row.pix_codigo }
        : null
    return {
      id: row.id,
      orderId: row.order_number,
      createdAt: new Date(row.created_at).getTime(),
      etaMinutes: row.eta_minutes,
      items: row.items,
      subtotal: extraSub ?? Math.max(0, total - shipping.price),
      total,
      delivery,
      payment: row.payment,
      shipping,
      paymentStatus: row.status,
      paidAt: row.paid_at ? new Date(row.paid_at).getTime() : null,
      gatewayTransactionId: row.gateway_transaction_id,
      pix,
      pixExpiresAt: row.pix_expires_at ? new Date(row.pix_expires_at).getTime() : null,
      trackingToken: row.tracking_token,
    }
  })
}

/**
 * Busca um pedido pelo `tracking_token` (link de email). Server-side via API,
 * pois `tracking_token` não está na policy RLS do client. Retorna o pedido
 * normalizado pra mesma forma de `SavedOrder`.
 */
export async function fetchOrderByToken(token: string): Promise<SavedOrder | null> {
  try {
    const res = await fetch(`/api/orders/by-token?token=${encodeURIComponent(token)}`)
    if (!res.ok) return null
    const { order } = (await res.json()) as { order: RemoteOrderRow }
    if (!order) return null

    const deliveryWithExtras = order.delivery as DeliveryData & {
      shipping?: SavedShipping
      subtotal?: number
    }
    const total = Number(order.total)
    const shipping: SavedShipping = deliveryWithExtras.shipping ?? { method: "standard", price: 0 }
    const { shipping: _s, subtotal: extraSub, ...delivery } = deliveryWithExtras
    const pix: SavedPix | null =
      order.pix_qrcode_url || order.pix_codigo
        ? { qrCodeUrl: order.pix_qrcode_url, codigoPix: order.pix_codigo }
        : null

    return {
      id: order.id,
      orderId: order.order_number,
      createdAt: new Date(order.created_at).getTime(),
      etaMinutes: order.eta_minutes,
      items: order.items,
      subtotal: extraSub ?? Math.max(0, total - shipping.price),
      total,
      delivery,
      payment: order.payment,
      shipping,
      paymentStatus: order.status,
      paidAt: order.paid_at ? new Date(order.paid_at).getTime() : null,
      gatewayTransactionId: order.gateway_transaction_id,
      pix,
      pixExpiresAt: order.pix_expires_at ? new Date(order.pix_expires_at).getTime() : null,
      trackingToken: order.tracking_token,
    }
  } catch (err) {
    console.error("[order-store] fetchOrderByToken exception:", err)
    return null
  }
}
