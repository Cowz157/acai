"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Bike, Check, ChefHat, Loader2, MapPin, Package, ShoppingBag } from "lucide-react"
import {
  fetchOrderByToken,
  getDeliveryAnchor,
  getLastOrder,
  getMinutesRemaining,
  getOrderProgress,
  getOrderStatus,
  patchSavedOrder,
  type OrderStatus,
  type SavedOrder,
} from "@/lib/order-store"
import { usePaymentTracking } from "@/lib/payment-tracker"
import { formatMoneyBR } from "@/lib/format"
import { AwaitingPixCard } from "@/components/checkout/awaiting-pix-card"
import { SiteFooter } from "@/components/site-footer"
import { cn } from "@/lib/utils"

interface StageDef {
  status: OrderStatus
  label: string
  description: string
  icon: typeof ChefHat
}

const STAGES: StageDef[] = [
  { status: "preparando", label: "Preparando", description: "Sua loja está montando seu pedido com carinho", icon: ChefHat },
  { status: "despacho", label: "Em despacho", description: "Pedido pronto e aguardando o entregador", icon: Package },
  { status: "a-caminho", label: "A caminho", description: "O entregador saiu — chega rapidinho!", icon: Bike },
  { status: "entregue", label: "Entregue", description: "Bom apetite! 💜", icon: Check },
]

const STAGE_INDEX: Record<OrderStatus, number> = {
  preparando: 0,
  despacho: 1,
  "a-caminho": 2,
  entregue: 3,
}

export default function TrackOrderPage() {
  const [order, setOrder] = useState<SavedOrder | null | undefined>(undefined)
  const [isRemote, setIsRemote] = useState(false)
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  useEffect(() => {
    if (token) {
      // Acesso via link de email — busca do Supabase
      void fetchOrderByToken(token).then((remote) => {
        setOrder(remote)
        setIsRemote(true)
      })
      return
    }
    setOrder(getLastOrder())
  }, [token])

  const applyPatch = (patch: Partial<SavedOrder>) => {
    setOrder((prev) => (prev ? { ...prev, ...patch } : prev))
    // Só patcha localStorage se não for visualização remota (link de email)
    if (!isRemote) patchSavedOrder(patch)
  }

  usePaymentTracking({ order: order ?? null, onUpdate: applyPatch })

  // ainda hidratando
  if (order === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando seu pedido...
      </main>
    )
  }

  if (!order) return <NoOrderState />

  return (
    <main className="flex min-h-screen flex-col bg-muted/40">
      <Header />

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-6">
        {order.payment.method === "pix" && order.paymentStatus === "pending" && (
          <AwaitingPixSection order={order} onPatch={applyPatch} />
        )}
        {order.payment.method === "pix" && order.paymentStatus === "refused" && (
          <PaymentRefusedCard order={order} />
        )}
        {(order.payment.method !== "pix" || order.paymentStatus === "approved") && (
          <DeliveryTimelineCard order={order} />
        )}

        <OrderDetailsCard order={order} />

        <div className="text-center">
          <Link href="/" className="inline-block text-xs font-semibold text-primary transition hover:text-primary-light">
            ← Voltar para o cardápio
          </Link>
        </div>
      </div>

      <SiteFooter />
    </main>
  )
}

// =====================================================================

function Header() {
  return (
    <div className="bg-primary px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/25"
        >
          <ArrowLeft className="h-4 w-4" />
          CARDÁPIO
        </Link>
        <span className="text-sm font-bold uppercase tracking-wide text-white md:text-base">Acompanhar Pedido</span>
      </div>
    </div>
  )
}

function NoOrderState() {
  return (
    <main className="flex min-h-screen flex-col bg-muted/40">
      <Header />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-foreground">Nenhum pedido em andamento</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você ainda não fez nenhum pedido por aqui. Que tal começar agora?
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-light"
          >
            Ver cardápio
          </Link>
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}

function AwaitingPixSection({
  order,
  onPatch,
}: {
  order: SavedOrder
  onPatch: (patch: Partial<SavedOrder>) => void
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6 text-center shadow-sm md:p-8">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
      <h1 className="mt-4 text-xl font-extrabold text-primary md:text-2xl">Aguardando seu pagamento</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pedido <strong className="text-foreground">#{order.orderId}</strong>
      </p>
      <p className="mt-3 text-sm text-foreground">
        Pague no QR code abaixo ou copia e cola pra começarmos a preparar.
      </p>
      <div className="mt-5">
        <AwaitingPixCard order={order} onRegenerated={onPatch} variant="compact" />
      </div>
    </div>
  )
}

function PaymentRefusedCard({ order }: { order: SavedOrder }) {
  return (
    <div className="rounded-2xl border border-danger bg-white p-6 text-center shadow-sm md:p-8">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-danger-soft">
        <span className="text-3xl">⚠️</span>
      </div>
      <h1 className="mt-4 text-xl font-extrabold text-danger md:text-2xl">Pagamento não aprovado</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pedido <strong className="text-foreground">#{order.orderId}</strong>
      </p>
      <p className="mt-3 text-sm text-foreground">
        Não conseguimos confirmar o pagamento desse pedido. Volte ao cardápio pra refazer.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-light"
      >
        Refazer pedido
      </Link>
    </div>
  )
}

function DeliveryTimelineCard({ order }: { order: SavedOrder }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const anchor = useMemo(() => getDeliveryAnchor(order), [order])
  const status = getOrderStatus(anchor, order.etaMinutes, now)
  const progress = getOrderProgress(anchor, order.etaMinutes, now)
  const minutesRemaining = getMinutesRemaining(anchor, order.etaMinutes, now)
  const currentIndex = STAGE_INDEX[status]
  const isDelivered = status === "entregue"

  return (
    <>
      <div className="rounded-2xl border border-border bg-white p-6 text-center shadow-sm md:p-8">
        <div
          className={cn(
            "mx-auto flex h-20 w-20 items-center justify-center rounded-full transition-colors",
            isDelivered ? "bg-success-soft" : "bg-primary-soft",
          )}
        >
          {isDelivered ? (
            <Check className="h-10 w-10 text-success" strokeWidth={3} />
          ) : (
            <MapPin className="h-10 w-10 text-primary" />
          )}
        </div>

        <h1 className="mt-4 text-2xl font-extrabold text-primary md:text-3xl">
          {isDelivered ? "Pedido entregue!" : STAGES[currentIndex].label}
        </h1>

        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Pedido <strong className="text-foreground">#{order.orderId}</strong>
        </p>

        {!isDelivered && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-success-soft px-4 py-1.5 text-sm font-semibold text-success">
            <Bike className="h-4 w-4" />
            Chega em ~{minutesRemaining} {minutesRemaining === 1 ? "minuto" : "minutos"}
          </div>
        )}

        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000 ease-linear",
              isDelivered ? "bg-success" : "bg-primary",
            )}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-sm font-bold text-foreground">Status do pedido</h2>

        <ol className="mt-4 space-y-1">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon
            const isDone = idx < currentIndex
            const isActive = idx === currentIndex
            const isPending = idx > currentIndex
            const isLast = idx === STAGES.length - 1

            return (
              <li key={stage.status} className="relative flex gap-4">
                {!isLast && (
                  <span
                    className={cn(
                      "absolute left-[19px] top-10 h-[calc(100%-8px)] w-0.5 transition-colors",
                      isDone ? "bg-success" : "bg-border",
                    )}
                    aria-hidden="true"
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
                    isDone && "bg-success text-white",
                    isActive && "bg-primary text-white shadow-md",
                    isPending && "bg-muted text-muted-foreground",
                  )}
                >
                  {isActive && !isDelivered && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" aria-hidden="true" />
                  )}
                  {isDone ? <Check className="h-5 w-5" strokeWidth={3} /> : <Icon className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1 pb-6">
                  <div
                    className={cn(
                      "text-sm font-bold md:text-base",
                      isPending ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    {stage.label}
                  </div>
                  <p
                    className={cn(
                      "text-xs md:text-sm",
                      isPending ? "text-muted-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {stage.description}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </>
  )
}

function OrderDetailsCard({ order }: { order: SavedOrder }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm md:p-6">
      <h2 className="text-sm font-bold text-foreground">Resumo do pedido</h2>

      <ul className="mt-3 divide-y divide-border">
        {order.items.map((it) => (
          <li key={it.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
            <span className="font-semibold text-foreground">
              {it.quantity}× {it.productName}
            </span>
            <span className="font-bold tabular-nums text-success">{formatMoneyBR(it.subtotal)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground md:text-sm">
        <p>
          <strong className="text-foreground">Entrega para:</strong> {order.delivery.fullName}
        </p>
        <p>
          {order.delivery.street}, {order.delivery.number}
          {order.delivery.complement && ` - ${order.delivery.complement}`}
          {order.delivery.neighborhood && ` • ${order.delivery.neighborhood}`}
        </p>
      </div>

      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-sm font-bold text-foreground">Total</span>
        <span className="text-xl font-extrabold text-success">{formatMoneyBR(order.total)}</span>
      </div>
    </div>
  )
}
