"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { getSavedAddress, saveAddress } from "@/lib/address-store"
import { useAuth, useAuthSync } from "@/lib/auth-store"
import { MIN_ORDER_VALUE, useCart } from "@/lib/cart-store"
import type { AddressData, DeliveryData, GiftData, IdentificationData } from "@/lib/checkout-types"
import { generateCPF } from "@/lib/cpf"
import { getShippingOption, type ShippingMethod } from "@/lib/data"
import { generateEtaMinutes, saveOrder, saveOrderRemote, type SavedOrder } from "@/lib/order-store"
import { updateMetaAdvancedMatching } from "@/lib/meta-pixel"
import { createVyatPixWithRetry, describeVyatError } from "@/lib/pix-vyat"
import { formatMoneyBR, unmaskDigits } from "@/lib/format"
import { getStoredUtms } from "@/lib/utms"
import type { AppliedCoupon } from "@/components/checkout/coupon-field"
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
  /** Cupom da URL — lido de window.location.search no mount em vez de
   *  useSearchParams pra evitar prerender error do Next.js 16 que exige
   *  Suspense boundary em torno desse hook. Como o /checkout é Client
   *  Component dinâmico, ler direto da window é mais simples. */
  const [couponFromUrl, setCouponFromUrl] = useState<string | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = (params.get("cupom") || params.get("coupon") || "").trim().toUpperCase()
    if (code) setCouponFromUrl(code)
  }, [])

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
  /** Cupom aplicado pelo CouponField no step 3. Null = nenhum. Desconto
   *  é subtraído do total exibido + persistido no SavedOrder.couponCode quando
   *  PIX é gerado, pra o redeem server-side acontecer no save. */
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)

  const finalizedItems = useRef<typeof items>([])
  const beginCheckoutFiredRef = useRef(false)
  /** Garante que o auto-aplicar de cupom da URL só roda 1× — caso contrário
   *  user que digite outro cupom manualmente seria sobrescrito pelo da URL
   *  no próximo re-render. */
  const autoCouponTriedRef = useRef(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const subtotal = useMemo(() => items.reduce((sum, it) => sum + it.subtotal, 0), [items])
  const shippingPrice = getShippingOption(shippingMethod).price
  const couponDiscount = appliedCoupon?.discountBrl ?? 0
  // Desconto sai do subtotal (não do frete nem da doação). Math.max evita
  // total negativo caso cupom > subtotal por algum motivo.
  const total = Math.max(0, subtotal - couponDiscount) + shippingPrice + donationAmount

  // Se o subtotal mudar (user voltou e mexeu no carrinho) e o desconto agora
  // violaria as regras do cupom (ex: min_subtotal), remove o cupom — UX honesta
  // em vez de mostrar desconto que não vai ser aceito no save.
  useEffect(() => {
    if (!appliedCoupon) return
    if (couponDiscount > subtotal) setAppliedCoupon(null)
  }, [subtotal, appliedCoupon, couponDiscount])

  // Auto-aplicar cupom da URL (?cupom=ACAI20 ou ?coupon=ACAI20). Usado pelos
  // emails de lead-recovery (3º toque) e qualquer campanha que linke direto
  // pro checkout com cupom pré-aplicado — dobra a conversão porque user
  // chega no step de pagamento com desconto já calculado, sem fricção de
  // digitar/aplicar manualmente.
  //
  // Roda 1× quando: step 3 carregou, email do user já disponível, URL tem
  // o param, e ainda não tentou. autoCouponTriedRef garante o once mesmo
  // se user remover manualmente depois (não re-aplica em loop).
  useEffect(() => {
    if (autoCouponTriedRef.current) return
    if (step !== 3) return
    if (!identification?.email) return
    if (appliedCoupon) return
    if (!couponFromUrl) return

    autoCouponTriedRef.current = true

    void fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponFromUrl, subtotal, email: identification.email }),
    })
      .then((r) => r.json())
      .then((data: { valid: boolean; discountBrl?: number; coupon?: { id: string; code: string }; error?: string }) => {
        if (data.valid && data.coupon && typeof data.discountBrl === "number") {
          setAppliedCoupon({ id: data.coupon.id, code: data.coupon.code, discountBrl: data.discountBrl })
          toast.success(`Cupom ${data.coupon.code} aplicado automaticamente!`, {
            description: `Você ganhou ${formatMoneyBR(data.discountBrl)} de desconto 💜`,
          })
        }
        // Se inválido (expirado, esgotado, min_subtotal), silenciosamente
        // não aplica — não polui UX com erro de algo que o user não
        // tentou ativamente. Ele pode digitar manualmente se quiser.
      })
      .catch(() => {
        // Erro de rede — silencioso (mesma lógica)
      })
  }, [step, identification?.email, appliedCoupon, couponFromUrl, subtotal])

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

  // dataLayer push `begin_checkout` (GA4 schema) — dispara 1× quando o usuário
  // chega no /checkout COM items válidos. Pixel.js da Vyat (v3.2.0+) detecta
  // e mapeia pra Meta InitiateCheckout automaticamente. Disparar aqui no load
  // (não no submit do endereço) segue o padrão GA4 onde begin_checkout marca
  // a ENTRADA no funil de checkout, e add_shipping_info / add_payment_info
  // marcam transições subsequentes.
  useEffect(() => {
    if (beginCheckoutFiredRef.current) return
    if (!hydrated) return
    if (items.length === 0 || subtotal < MIN_ORDER_VALUE) return
    if (typeof window === "undefined") return
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event: "begin_checkout",
      ecommerce: {
        value: total,
        currency: "BRL",
        items: items.map((it) => ({
          item_id: it.productId,
          item_name: it.productName,
          price: it.basePrice,
          quantity: it.quantity,
        })),
      },
    })
    beginCheckoutFiredRef.current = true
  }, [hydrated, items, subtotal, total])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    )
  }

  const handleIdentificationSubmit = (data: IdentificationData) => {
    setIdentification(data)
    // Advanced Matching do Meta Pixel — re-init com email/phone/nome agora
    // que o user preencheu o form. Match keys herdadas por TODOS eventos
    // subsequentes (begin_checkout, purchase). Melhora EMQ de ~6 pra 8+.
    updateMetaAdvancedMatching({
      email: data.email,
      phone: data.phone,
      fullName: data.fullName,
    })
    // Captura de lead pra recovery email (fire-and-forget). Se o user não
    // gerar PIX nos próximos minutos, o cron lead-recovery dispara 3 toques
    // em horários estratégicos. Marcado como convertido quando saveOrderRemote
    // roda. Falha silenciosa — não bloqueia fluxo do user.
    const utms = getStoredUtms()
    void fetch("/api/leads/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        fullName: data.fullName,
        phone: data.phone ?? null,
        utmSource: utms.utm_source || null,
        utmCampaign: utms.utm_campaign || null,
      }),
    }).catch(() => {
      // sem-op: lead perdido < user bloqueado por bug de tracking
    })
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
    // appliedCoupon (se houver) vai como extras pra o /api/orders/create
    // processar o redeem em coupon_redemptions e markLeadConverted no email.
    void saveOrderRemote(order, user?.id ?? null, {
      couponId: appliedCoupon?.id ?? null,
      couponCode: appliedCoupon?.code ?? null,
      couponDiscount: appliedCoupon?.discountBrl ?? null,
    })
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
          produto: `Açaí Paraíso — ${produtoLabel}`,
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
            couponDiscount={couponDiscount}
            couponCode={appliedCoupon?.code ?? null}
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
            customerEmail={identification?.email ?? ""}
            appliedCoupon={appliedCoupon}
            onCouponApplied={setAppliedCoupon}
            onCouponRemoved={() => setAppliedCoupon(null)}
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
