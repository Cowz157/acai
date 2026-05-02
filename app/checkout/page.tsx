"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getSavedAddress, saveAddress } from "@/lib/address-store"
import { useAuth, useAuthSync } from "@/lib/auth-store"
import { MIN_ORDER_VALUE, useCart } from "@/lib/cart-store"
import { generateCPF } from "@/lib/cpf"
import { getShippingOption, type ShippingMethod } from "@/lib/data"
import { generateEtaMinutes, saveOrder, saveOrderRemote, type SavedOrder } from "@/lib/order-store"
import { createVyatPixWithRetry, describeVyatError } from "@/lib/pix-vyat"
import { unmaskDigits } from "@/lib/format"
import { orderId as makeOrderId, uuid } from "@/lib/uuid"
import { ConfirmationStep } from "@/components/checkout/confirmation-step"
import { DeliveryStep, type DeliveryData } from "@/components/checkout/delivery-step"
import { OrderSummary } from "@/components/checkout/order-summary"
import { PaymentStep, type PaymentData } from "@/components/checkout/payment-step"
import { StepIndicator } from "@/components/checkout/step-indicator"

export default function CheckoutPage() {
  useAuthSync()
  const router = useRouter()
  const items = useCart((s) => s.items)
  const clearCart = useCart((s) => s.clearCart)
  const user = useAuth((s) => s.user)

  const [hydrated, setHydrated] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [delivery, setDelivery] = useState<DeliveryData | null>(null)
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("standard")
  const [confirmedOrder, setConfirmedOrder] = useState<SavedOrder | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentAttempt, setPaymentAttempt] = useState(0)

  // Snapshot dos itens no momento da finalização (para Step 3 mesmo após clearCart)
  const finalizedItems = useRef<typeof items>([])

  useEffect(() => {
    setHydrated(true)
  }, [])

  const subtotal = useMemo(() => items.reduce((sum, it) => sum + it.subtotal, 0), [items])
  const shippingPrice = getShippingOption(shippingMethod).price
  const total = subtotal + shippingPrice

  // Defaults do step 1: combina (último endereço salvo) + (dados do usuário logado).
  const deliveryDefaults: Partial<DeliveryData> | undefined = useMemo(() => {
    if (delivery) return delivery
    const saved = hydrated ? getSavedAddress() : null
    const fromUser = user
      ? { fullName: user.name, email: user.email, phone: user.phone }
      : null
    if (!saved && !fromUser) return undefined
    return { ...(saved ?? {}), ...(fromUser ?? {}) }
  }, [hydrated, user, delivery])

  // Redireciona se carrinho vazio ou abaixo do mínimo (apenas antes da confirmação).
  // Avalia pelo SUBTOTAL (sem frete) — frete não conta pra mínimo.
  useEffect(() => {
    if (!hydrated || step === 3) return
    if (items.length === 0 || subtotal < MIN_ORDER_VALUE) {
      router.replace("/")
    }
  }, [hydrated, items.length, subtotal, step, router])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    )
  }

  const handleDeliverySubmit = (data: DeliveryData) => {
    setDelivery(data)
    saveAddress(data)
    setStep(2)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const finalizeOrder = (
    paymentData: PaymentData,
    orderInternalId: string,
    pix: { qrCodeUrl: string | null; codigoPix: string | null } | null,
    gatewayTransactionId: string | null,
    pixExpiresAt: number | null,
  ) => {
    if (!delivery) return

    const isPix = paymentData.method === "pix"
    const order: SavedOrder = {
      id: orderInternalId,
      orderId: makeOrderId(),
      createdAt: Date.now(),
      etaMinutes: generateEtaMinutes(shippingMethod),
      items,
      subtotal,
      total,
      delivery,
      payment: paymentData,
      shipping: { method: shippingMethod, price: shippingPrice },
      paymentStatus: isPix ? "pending" : "approved",
      paidAt: isPix ? null : Date.now(),
      gatewayTransactionId,
      pix,
      pixExpiresAt,
    }

    finalizedItems.current = items
    setConfirmedOrder(order)
    saveOrder(order)
    void saveOrderRemote(order, user?.id ?? null)
    setStep(3)
    clearCart()
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handlePaymentSubmit = async (data: PaymentData) => {
    if (!delivery) return
    setPaymentError(null)
    setPaymentAttempt(0)

    if (data.method !== "pix") {
      finalizeOrder(data, uuid(), null, null, null)
      return
    }

    setPaymentLoading(true)
    try {
      // UUID interno do pedido = external_id no Vyat (match direto no webhook)
      const orderInternalId = uuid()
      const produtoLabel =
        items
          .slice(0, 3)
          .map((it) => `${it.quantity}x ${it.productName}`)
          .join(", ") + (items.length > 3 ? "..." : "")

      const pixResponse = await createVyatPixWithRetry(
        {
          valor: total,
          nome: delivery.fullName,
          email: delivery.email,
          cpf: generateCPF(),
          telefone: delivery.phone ? unmaskDigits(delivery.phone) : "",
          produto: `Açaí Tropical — ${produtoLabel}`,
          external_id: orderInternalId,
        },
        {},
        (attempt) => setPaymentAttempt(attempt),
      )

      const expiresAtMs = pixResponse.expires_at ? new Date(pixResponse.expires_at).getTime() : null

      finalizeOrder(
        data,
        orderInternalId,
        {
          qrCodeUrl: pixResponse.qrcode_url ?? null,
          codigoPix: pixResponse.codigo_pix ?? null,
        },
        pixResponse.transaction_id ?? orderInternalId,
        expiresAtMs,
      )
    } catch (err) {
      setPaymentError(describeVyatError(err))
    } finally {
      setPaymentLoading(false)
      setPaymentAttempt(0)
    }
  }

  return (
    <div className="min-h-screen bg-muted/40 pb-12">
      <div className="bg-primary px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/25"
          >
            <ArrowLeft className="h-4 w-4" />
            {step < 3 ? "VOLTAR" : "CARDÁPIO"}
          </Link>
          <span className="font-display text-sm font-bold uppercase tracking-wide text-white md:text-base">
            Finalizar Pedido
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4">
        <StepIndicator current={step} />

        {step !== 3 && items.length > 0 && (
          <OrderSummary
            items={items}
            subtotal={subtotal}
            shippingPrice={shippingPrice}
            total={total}
            defaultOpen={false}
          />
        )}

        {step === 1 && (
          <DeliveryStep
            defaultValues={deliveryDefaults}
            onSubmit={handleDeliverySubmit}
            shippingMethod={shippingMethod}
            onShippingChange={setShippingMethod}
          />
        )}

        {step === 2 && (
          <PaymentStep
            total={total}
            defaultValues={confirmedOrder?.payment}
            onBack={() => setStep(1)}
            onSubmit={handlePaymentSubmit}
            loading={paymentLoading}
            attempt={paymentAttempt}
            errorMessage={paymentError}
          />
        )}

        {step === 3 && confirmedOrder && (
          <ConfirmationStep order={confirmedOrder} items={finalizedItems.current} />
        )}
      </div>
    </div>
  )
}
