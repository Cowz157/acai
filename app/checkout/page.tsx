"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getSavedAddress, saveAddress } from "@/lib/address-store"
import { useAuth, useAuthSync } from "@/lib/auth-store"
import { MIN_ORDER_VALUE, useCart } from "@/lib/cart-store"
import type { AddressData, DeliveryData, GiftData, IdentificationData } from "@/lib/checkout-types"
import { generateCPF } from "@/lib/cpf"
import { getShippingOption, type ShippingMethod } from "@/lib/data"
import { generateEtaMinutes, saveOrder, saveOrderRemote, type SavedOrder } from "@/lib/order-store"
import { createVyatPixWithRetry, describeVyatError } from "@/lib/pix-vyat"
import { unmaskDigits } from "@/lib/format"
import { orderId as makeOrderId, uuid } from "@/lib/uuid"
import { AddressStep } from "@/components/checkout/address-step"
import { ConfirmationStep } from "@/components/checkout/confirmation-step"
import { IdentificationStep } from "@/components/checkout/identification-step"
import { OrderSummary } from "@/components/checkout/order-summary"
import { PaymentStep, type PaymentData } from "@/components/checkout/payment-step"
import { StepIndicator } from "@/components/checkout/step-indicator"
import { SiteFooter } from "@/components/site-footer"

/** Internal steps. Indicator: 1, 2, 3 (passo 4 = confirmação, marca todos como done). */
type InternalStep = 1 | 2 | 3 | 4

export default function CheckoutPage() {
  useAuthSync()
  const router = useRouter()
  const items = useCart((s) => s.items)
  const clearCart = useCart((s) => s.clearCart)
  const user = useAuth((s) => s.user)

  const [hydrated, setHydrated] = useState(false)
  const [step, setStep] = useState<InternalStep>(1)
  const [identification, setIdentification] = useState<IdentificationData | null>(null)
  const [address, setAddress] = useState<AddressData | null>(null)
  const [gift, setGift] = useState<GiftData | null>(null)
  const [donationAmount, setDonationAmount] = useState<number>(0)
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("standard")
  const [confirmedOrder, setConfirmedOrder] = useState<SavedOrder | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentAttempt, setPaymentAttempt] = useState(0)

  const finalizedItems = useRef<typeof items>([])

  useEffect(() => {
    setHydrated(true)
  }, [])

  const subtotal = useMemo(() => items.reduce((sum, it) => sum + it.subtotal, 0), [items])
  const shippingPrice = getShippingOption(shippingMethod).price
  const total = subtotal + shippingPrice + donationAmount

  // Se o cliente reduziu o cart abaixo do threshold da doação após já ter
  // selecionado um valor, zera pra não cobrar algo que ele não vê mais.
  useEffect(() => {
    if (subtotal < 25 && donationAmount > 0) {
      setDonationAmount(0)
    }
  }, [subtotal, donationAmount])

  // Defaults dos forms — combina endereço salvo + dados do usuário logado
  const identificationDefaults: Partial<IdentificationData> | undefined = useMemo(() => {
    if (identification) return identification
    const saved = hydrated ? getSavedAddress() : null
    const fromUser = user
      ? { fullName: user.name, email: user.email, phone: user.phone }
      : null
    if (!saved && !fromUser) return undefined
    return {
      fullName: fromUser?.fullName || saved?.fullName,
      email: fromUser?.email || saved?.email,
      phone: fromUser?.phone || saved?.phone,
    }
  }, [hydrated, user, identification])

  const addressDefaults: Partial<AddressData> | undefined = useMemo(() => {
    if (address) return address
    const saved = hydrated ? getSavedAddress() : null
    if (!saved) return undefined
    return {
      cep: saved.cep,
      street: saved.street,
      number: saved.number,
      complement: saved.complement,
      neighborhood: saved.neighborhood,
      reference: saved.reference,
    }
  }, [hydrated, address])

  // Redireciona se carrinho vazio ou abaixo do mínimo (apenas antes da confirmação)
  useEffect(() => {
    if (!hydrated || step === 4) return
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

  const handleIdentificationSubmit = (data: IdentificationData) => {
    setIdentification(data)
    setStep(2)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleAddressSubmit = (data: AddressData, giftData: GiftData | null) => {
    setAddress(data)
    setGift(giftData)
    if (identification) {
      saveAddress({ ...identification, ...data })
    }
    setStep(3)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const finalizeOrder = (
    paymentData: PaymentData,
    orderInternalId: string,
    pix: { qrCodeUrl: string | null; codigoPix: string | null } | null,
    gatewayTransactionId: string | null,
    pixExpiresAt: number | null,
  ) => {
    if (!identification || !address) return
    const delivery: DeliveryData = { ...identification, ...address }

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
      gift,
      donationAmount,
      payment: paymentData,
      shipping: { method: shippingMethod, price: shippingPrice },
      paymentStatus: isPix ? "pending" : "approved",
      paidAt: isPix ? null : Date.now(),
      gatewayTransactionId,
      pix,
      pixExpiresAt,
      trackingToken: uuid(),
      deliveryStatus: "in_transit",
      failureReportedAt: null,
      redeliveryPaymentId: null,
      redeliveryCodigoPix: null,
      redeliveryExpiresAt: null,
      refundProcessedAt: null,
    }

    finalizedItems.current = items
    setConfirmedOrder(order)
    saveOrder(order)
    void saveOrderRemote(order, user?.id ?? null)
    // Email transacional pra cash/card (PIX é disparado pelo polling em /acompanhar quando aprovado)
    if (!isPix) {
      void fetch("/api/orders/send-confirmation-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      }).catch((err) => {
        console.error("[checkout] falha ao enviar email de confirmação:", err)
      })
    }
    setStep(4)
    clearCart()
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handlePaymentSubmit = async (data: PaymentData) => {
    if (!identification || !address) return
    setPaymentError(null)
    setPaymentAttempt(0)

    if (data.method !== "pix") {
      finalizeOrder(data, uuid(), null, null, null)
      return
    }

    setPaymentLoading(true)
    try {
      const orderInternalId = uuid()
      const produtoLabel =
        items
          .slice(0, 3)
          .map((it) => `${it.quantity}x ${it.productName}`)
          .join(", ") + (items.length > 3 ? "..." : "")

      const pixResponse = await createVyatPixWithRetry(
        {
          valor: total,
          nome: identification.fullName,
          email: identification.email,
          cpf: generateCPF(),
          telefone: identification.phone ? unmaskDigits(identification.phone) : "",
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
        // Polling de status precisa do vyat_transaction_id (UUID interno estável do Vyat).
        // Consultar por transaction_id (eco do nosso external_id) retorna 404.
        pixResponse.vyat_transaction_id ?? pixResponse.transaction_id ?? orderInternalId,
        expiresAtMs,
      )
    } catch (err) {
      setPaymentError(describeVyatError(err))
    } finally {
      setPaymentLoading(false)
      setPaymentAttempt(0)
    }
  }

  // Indicator: passo 4 (confirmação) marca tudo como done; senão mostra current
  const indicatorCurrent = (step <= 3 ? step : 3) as 1 | 2 | 3
  const indicatorAllDone = step === 4

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <div className="bg-primary px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/25"
          >
            <ArrowLeft className="h-4 w-4" />
            {step < 4 ? "VOLTAR" : "CARDÁPIO"}
          </Link>
          <span className="font-display text-sm font-bold uppercase tracking-wide text-white md:text-base">
            Finalizar Pedido
          </span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 pb-12">
        <StepIndicator current={indicatorCurrent} allDone={indicatorAllDone} />

        {step !== 4 && items.length > 0 && (
          <OrderSummary
            items={items}
            subtotal={subtotal}
            shippingPrice={shippingPrice}
            total={total}
            donationAmount={donationAmount}
            defaultOpen={false}
          />
        )}

        {step === 1 && (
          <IdentificationStep defaultValues={identificationDefaults} onSubmit={handleIdentificationSubmit} />
        )}

        {step === 2 && (
          <AddressStep
            defaultValues={addressDefaults}
            giftDefault={gift}
            onSubmit={handleAddressSubmit}
            onBack={() => setStep(1)}
            shippingMethod={shippingMethod}
            onShippingChange={setShippingMethod}
          />
        )}

        {step === 3 && (
          <PaymentStep
            total={total}
            subtotal={subtotal}
            defaultValues={confirmedOrder?.payment}
            onBack={() => setStep(2)}
            onSubmit={handlePaymentSubmit}
            loading={paymentLoading}
            attempt={paymentAttempt}
            errorMessage={paymentError}
            donationAmount={donationAmount}
            onDonationChange={setDonationAmount}
          />
        )}

        {step === 4 && confirmedOrder && (
          <ConfirmationStep order={confirmedOrder} items={finalizedItems.current} />
        )}
      </div>

      <SiteFooter />
    </div>
  )
}
