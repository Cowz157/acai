"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, CheckCircle2, Clock, MapPin } from "lucide-react"
import { type CartItem } from "@/lib/cart-store"
import { formatMoneyBR } from "@/lib/format"
import { patchSavedOrder, type SavedOrder } from "@/lib/order-store"
import { usePaymentTracking } from "@/lib/payment-tracker"
import { AwaitingPixCard } from "./awaiting-pix-card"

interface ConfirmationStepProps {
  order: SavedOrder
  /** Snapshot dos itens — necessário porque o carrinho é limpo após o pedido. */
  items: CartItem[]
}

const PAYMENT_LABELS = {
  pix: "PIX",
  cash: "Dinheiro na entrega",
  card: "Cartão na entrega",
} as const

export function ConfirmationStep({ order: initialOrder, items }: ConfirmationStepProps) {
  const router = useRouter()
  const [order, setOrder] = useState<SavedOrder>(initialOrder)

  const applyPatch = (patch: Partial<SavedOrder>) => {
    setOrder((prev) => ({ ...prev, ...patch }))
    patchSavedOrder(patch)
  }

  usePaymentTracking({ order, onUpdate: applyPatch })

  const isPix = order.payment.method === "pix"
  const isPaid = order.paymentStatus === "approved"
  const isRefused = order.paymentStatus === "refused"

  // Auto-redireciona pra /acompanhar 3s depois de confirmar pagamento PIX
  useEffect(() => {
    if (!isPix || !isPaid) return
    const t = setTimeout(() => router.push("/acompanhar"), 3000)
    return () => clearTimeout(t)
  }, [isPix, isPaid, router])

  return (
    <div className="animate-step-in space-y-5">
      {/* Card principal de confirmação */}
      <div className="rounded-2xl border border-border bg-white p-6 text-center shadow-sm md:p-8">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-soft">
          <Check className="h-10 w-10 text-success" strokeWidth={3} />
        </div>
        <h2 className="mt-4 font-display text-2xl font-extrabold text-primary md:text-3xl">
          Pedido Recebido!
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Seu pedido <strong className="text-foreground">#{order.orderId}</strong> foi enviado para a Açaí do Centro
        </p>
      </div>

      {/* Bloco específico de pagamento */}
      {isPix ? (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm md:p-6">
          {isPaid ? (
            <div className="flex items-start gap-3 rounded-xl bg-success-soft px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="text-sm font-bold text-success">Pagamento confirmado!</p>
                <p className="mt-1 text-xs text-success/80">
                  Estamos iniciando o preparo. Redirecionando pra página do pedido...
                </p>
              </div>
            </div>
          ) : isRefused ? (
            <div className="flex items-start gap-3 rounded-xl bg-danger-soft px-4 py-3">
              <div>
                <p className="text-sm font-bold text-danger">Pagamento não aprovado</p>
                <p className="mt-1 text-xs text-danger/80">
                  O pagamento foi recusado. Refaça o pedido pra tentar novamente.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">
                Aguardando pagamento via Pix
              </div>
              <AwaitingPixCard order={order} onRegenerated={applyPatch} variant="compact" />
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <span>O pedido será preparado assim que o pagamento for confirmado automaticamente.</span>
              </div>
            </>
          )}

        </div>
      ) : (
        <div className="rounded-2xl border border-success/30 bg-success-soft/40 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-white">
              <Check className="h-5 w-5" strokeWidth={3} />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">Pedido confirmado!</p>
              <p className="mt-1 text-xs text-muted-foreground">
                O estabelecimento já recebeu seu pedido. Tempo estimado:{" "}
                <strong className="text-foreground">{order.etaMinutes} min</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resumo final */}
      <div className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm md:p-6">
        <h3 className="text-sm font-bold text-foreground">Resumo do pedido</h3>

        <ul className="divide-y divide-border">
          {items.map((it) => (
            <li key={it.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-foreground">
                  {it.quantity}x {it.productName}
                </span>
              </div>
              <span className="font-bold tabular-nums text-success">{formatMoneyBR(it.subtotal)}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">Entrega:</strong> {order.delivery.fullName} •{" "}
            {order.delivery.street}, {order.delivery.number}
            {order.delivery.complement && ` - ${order.delivery.complement}`}
            {order.delivery.neighborhood && ` • ${order.delivery.neighborhood}`}
          </p>
          <p>
            <strong className="text-foreground">E-mail:</strong> {order.delivery.email}
          </p>
          {order.delivery.phone && (
            <p>
              <strong className="text-foreground">WhatsApp:</strong> {order.delivery.phone}
            </p>
          )}
          <p>
            <strong className="text-foreground">Pagamento:</strong> {PAYMENT_LABELS[order.payment.method]}
            {order.payment.method === "cash" &&
              order.payment.cashChange &&
              ` (troco para R$ ${order.payment.cashChange})`}
          </p>
        </div>

        <div className="space-y-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold text-foreground tabular-nums">{formatMoneyBR(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Entrega ({order.shipping.method === "express" ? "Express" : "Padrão"})
            </span>
            {order.shipping.price > 0 ? (
              <span className="font-semibold text-foreground tabular-nums">+ {formatMoneyBR(order.shipping.price)}</span>
            ) : (
              <span className="font-bold text-success">Grátis</span>
            )}
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-2">
            <span className="text-sm font-bold text-foreground">Total</span>
            <span className="text-xl font-extrabold text-success">{formatMoneyBR(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 pb-2">
        <Link
          href="/acompanhar"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-success px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
        >
          <MapPin className="h-4 w-4" />
          Acompanhar Pedido
        </Link>
        <Link
          href="/"
          className="block text-center text-xs font-semibold text-primary transition hover:text-primary-light"
        >
          Voltar para o cardápio
        </Link>
      </div>
    </div>
  )
}
