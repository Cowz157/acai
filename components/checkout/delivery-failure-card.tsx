"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import QRCode from "qrcode"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  RefreshCw,
  Truck,
} from "lucide-react"
import { getDeliveryAnchor, getOrderStatus, type SavedOrder } from "@/lib/order-store"
import { formatMoneyBR } from "@/lib/format"

interface DeliveryFailureCardProps {
  order: SavedOrder
  onUpdate: (patch: Partial<SavedOrder>) => void
}

const REDELIVERY_FEE = 12.5

/**
 * Janela de ETA da re-entrega — sempre mais curta que a entrega original
 * pra criar incentivo no momento da decisão. Express vira ainda mais
 * rápido pra manter o "Express" como vantagem real.
 */
function redeliveryEtaWindow(method: "standard" | "express"): { min: number; max: number } {
  if (method === "express") return { min: 8, max: 12 }
  return { min: 15, max: 25 }
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function DeliveryFailureCard({ order, onUpdate }: DeliveryFailureCardProps) {
  const [showOptions, setShowOptions] = useState(false)
  const [submitting, setSubmitting] = useState<"redelivery" | "refund" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [confirmedDelivered, setConfirmedDelivered] = useState(false)
  const [tickNow, setTickNow] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [checkingPayment, setCheckingPayment] = useState(false)
  const [checkResult, setCheckResult] = useState<"pending" | "error" | null>(null)
  const [copied, setCopied] = useState(false)

  const status = order.deliveryStatus
  const confirmedKey = `acai-confirmed-delivery-${order.id}`
  const redeliveryEta = redeliveryEtaWindow(order.shipping.method)

  // Hidrata flag de "já confirmei recebimento" do localStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      if (window.localStorage.getItem(confirmedKey) === "1") {
        setConfirmedDelivered(true)
      }
    } catch {
      /* noop */
    }
  }, [confirmedKey])

  // Tick a cada 30s pra re-avaliar timeline status (evita refresh manual)
  useEffect(() => {
    if (status !== "in_transit" || confirmedDelivered) return
    const interval = setInterval(() => setTickNow(Date.now()), 30_000)
    return () => clearInterval(interval)
  }, [status, confirmedDelivered])

  // Timeline status atual (preparando | despacho | a-caminho | entregue)
  const timelineStatus = useMemo(() => {
    if (order.payment.method === "pix" && order.paymentStatus !== "approved") return null
    const anchor = getDeliveryAnchor(order)
    return getOrderStatus(anchor, order.etaMinutes, tickNow)
  }, [order, tickNow])

  const handleConfirmDelivered = () => {
    setConfirmedDelivered(true)
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(confirmedKey, "1")
      }
    } catch {
      /* noop */
    }
  }

  // QR code do PIX de re-entrega (sempre gerado local da string EMV)
  useEffect(() => {
    if (status !== "redelivery_pending" || !order.redeliveryCodigoPix) {
      setQrSrc(null)
      return
    }
    let cancelled = false
    QRCode.toDataURL(order.redeliveryCodigoPix, {
      width: 240,
      margin: 1,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrSrc(url)
      })
      .catch((err) => {
        console.error("[delivery-failure-card] erro QR:", err)
        if (!cancelled) setQrSrc(null)
      })
    return () => {
      cancelled = true
    }
  }, [status, order.redeliveryCodigoPix])

  // Tick do countdown
  useEffect(() => {
    if (status !== "redelivery_pending") return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [status])

  const expiresAt = order.redeliveryExpiresAt
  const expired = expiresAt !== null && now > expiresAt
  const secondsLeft = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : null

  const handleCopy = async () => {
    if (!order.redeliveryCodigoPix) return
    try {
      await navigator.clipboard.writeText(order.redeliveryCodigoPix)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* noop */
    }
  }

  const handleRedelivery = async () => {
    setSubmitting("redelivery")
    setError(null)
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/request-redelivery`, {
        method: "POST",
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        pix?: { codigoPix: string; expiresAt: string; vyatTransactionId: string; fee: number }
      }
      if (!res.ok || !data.pix) {
        setError(data.error ?? "Erro ao gerar nova entrega")
        return
      }
      onUpdate({
        deliveryStatus: "redelivery_pending",
        redeliveryPaymentId: data.pix.vyatTransactionId,
        redeliveryCodigoPix: data.pix.codigoPix,
        redeliveryExpiresAt: new Date(data.pix.expiresAt).getTime(),
        failureReportedAt: Date.now(),
      })
    } catch (err) {
      console.error("[delivery-failure-card] erro redelivery:", err)
      setError("Falha de rede. Tente de novo.")
    } finally {
      setSubmitting(null)
    }
  }

  const handleRefund = async () => {
    setSubmitting("refund")
    setError(null)
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/request-refund`, {
        method: "POST",
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Erro ao solicitar reembolso")
        return
      }
      onUpdate({
        deliveryStatus: "refund_requested",
        failureReportedAt: Date.now(),
      })
    } catch (err) {
      console.error("[delivery-failure-card] erro refund:", err)
      setError("Falha de rede. Tente de novo.")
    } finally {
      setSubmitting(null)
    }
  }

  const handleCheckRedelivery = async () => {
    setCheckingPayment(true)
    setCheckResult(null)
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/check-redelivery`, {
        method: "POST",
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; status?: string; error?: string }
      if (!res.ok) {
        setCheckResult("error")
        return
      }
      if (data.status === "redelivery_paid") {
        onUpdate({ deliveryStatus: "redelivery_paid" })
      } else {
        setCheckResult("pending")
      }
    } catch (err) {
      console.error("[delivery-failure-card] erro check:", err)
      setCheckResult("error")
    } finally {
      setCheckingPayment(false)
    }
  }

  // -------------------------------------------------------------------
  // Reembolso solicitado / processado
  // -------------------------------------------------------------------
  if (status === "refund_requested" || status === "refund_processed") {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 text-center shadow-sm md:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h2 className="mt-3 text-xl font-bold text-primary md:text-2xl">
          {status === "refund_processed" ? "Reembolso concluído" : "Reembolso solicitado"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pedido <strong className="text-foreground">#{order.orderId}</strong>
        </p>
        <div className="mt-4 rounded-xl bg-success-soft px-4 py-3 text-left">
          {status === "refund_processed" ? (
            <p className="text-sm text-success">
              Seu reembolso de <strong>{formatMoneyBR(order.total)}</strong> já foi processado. O valor caiu na sua
              conta de origem.
            </p>
          ) : (
            <>
              <p className="text-sm font-bold text-success">Valor: {formatMoneyBR(order.total)}</p>
              <p className="mt-1 text-xs text-success/80">
                Em até <strong>5 dias úteis</strong> o valor será devolvido via PIX na chave usada no pagamento
                original. Você receberá um email confirmando quando for enviado.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------
  // Re-entrega paga
  // -------------------------------------------------------------------
  if (status === "redelivery_paid") {
    return (
      <div className="rounded-2xl border border-success bg-success-soft/40 p-6 text-center shadow-sm md:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success">
          <Truck className="h-8 w-8 text-white" />
        </div>
        <h2 className="mt-3 text-xl font-bold text-success md:text-2xl">Nova entrega a caminho!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pedido <strong className="text-foreground">#{order.orderId}</strong>
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-success px-4 py-1.5 text-sm font-semibold text-white">
          <Truck className="h-4 w-4" />
          Chega em ~{redeliveryEta.min}-{redeliveryEta.max} minutos
        </div>
        <p className="mt-3 text-sm text-foreground">
          Pagamento da re-entrega confirmado. Estamos enviando seu açaí novamente — com prioridade. 💜
        </p>
      </div>
    )
  }

  // -------------------------------------------------------------------
  // Re-entrega aguardando pagamento — mostra PIX
  // -------------------------------------------------------------------
  if (status === "redelivery_pending") {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
            <RefreshCw className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-3 text-xl font-bold text-primary md:text-2xl">Pague a nova entrega</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pedido <strong className="text-foreground">#{order.orderId}</strong>
          </p>
        </div>

        <div className="mt-5 flex flex-col items-center gap-2">
          {qrSrc ? (
            <div className="relative h-[240px] w-[240px] overflow-hidden rounded-xl border border-border bg-white">
              <Image
                src={qrSrc}
                alt="QR Code do PIX"
                fill
                className="object-contain p-3"
                sizes="240px"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex aspect-square w-full max-w-[240px] flex-col items-center justify-center rounded-xl bg-muted/60 p-4 text-center text-xs text-muted-foreground">
              <p className="font-semibold">QR indisponível</p>
              <p className="mt-1 text-[11px]">Use o copia-cola abaixo</p>
            </div>
          )}
          <p className="text-base font-extrabold text-success">{formatMoneyBR(REDELIVERY_FEE)}</p>

          {secondsLeft !== null && !expired && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-900">
              <Clock className="h-3 w-3" />
              Vence em <span className="tabular-nums">{formatCountdown(secondsLeft)}</span>
            </span>
          )}
          {expired && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-900">
              PIX expirou — entre em contato pelo WhatsApp
            </span>
          )}
        </div>

        {order.redeliveryCodigoPix && (
          <div className="mt-4">
            <label className="block text-xs font-semibold text-muted-foreground">Código copia e cola:</label>
            <div className="mt-1 flex gap-2">
              <input
                value={order.redeliveryCodigoPix}
                readOnly
                className="flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white transition hover:bg-primary-light"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleCheckRedelivery}
          disabled={checkingPayment}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border-2 border-success bg-success-soft px-5 py-2.5 text-sm font-bold text-success transition hover:bg-success-soft/70 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {checkingPayment ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Já paguei, verificar agora
            </>
          )}
        </button>

        {checkResult === "pending" && (
          <p className="mt-2 text-center text-[11px] font-semibold text-yellow-700">
            Pagamento ainda não foi confirmado. Aguarde uns segundos e tente de novo.
          </p>
        )}
        {checkResult === "error" && (
          <p className="mt-2 text-center text-[11px] font-semibold text-danger">
            Falha ao verificar. Tente de novo em instantes.
          </p>
        )}
      </div>
    )
  }

  // -------------------------------------------------------------------
  // Cliente clicou "não recebi" — mostra 2 opções
  // -------------------------------------------------------------------
  if (status === "failed_reported" || (status === "in_transit" && showOptions)) {
    return (
      <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-6 shadow-sm md:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <AlertTriangle className="h-8 w-8 text-yellow-700" />
          </div>
          <h2 className="mt-3 text-xl font-bold text-yellow-900 md:text-2xl">Sentimos muito por isso</h2>
          <p className="mt-2 text-sm text-yellow-800">
            Pedido <strong>#{order.orderId}</strong> não chegou? Vamos resolver agora.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={handleRedelivery}
            disabled={submitting !== null}
            className="block w-full rounded-xl border-2 border-primary bg-white p-4 text-left transition hover:bg-primary-soft/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Truck className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-foreground">Tentar nova entrega</span>
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    {formatMoneyBR(REDELIVERY_FEE)}
                  </span>
                </div>
                <div className="mt-1 text-xs font-semibold text-success">
                  ⚡ Chega em ~{redeliveryEta.min}-{redeliveryEta.max} min — entrega prioritária
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Geramos um novo PIX. Pague e a entrega entra em rota imediato.
                </div>
              </div>
              {submitting === "redelivery" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>
          </button>

          <button
            type="button"
            onClick={handleRefund}
            disabled={submitting !== null}
            className="block w-full rounded-xl border-2 border-border bg-white p-4 text-left transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success">
                <RefreshCw className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-foreground">Solicitar reembolso integral</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Reembolso de {formatMoneyBR(order.total)} via PIX em até <strong>5 dias úteis</strong>.
                </div>
              </div>
              {submitting === "refund" && <Loader2 className="h-4 w-4 animate-spin text-success" />}
            </div>
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">{error}</div>
        )}

        {status === "in_transit" && (
          <button
            type="button"
            onClick={() => setShowOptions(false)}
            className="mt-4 block w-full text-center text-xs font-semibold text-muted-foreground transition hover:text-foreground"
          >
            ← Voltar
          </button>
        )}
      </div>
    )
  }

  // -------------------------------------------------------------------
  // in_transit, timeline ainda rodando OU cliente já confirmou: nada a mostrar
  // -------------------------------------------------------------------
  if (timelineStatus !== "entregue" || confirmedDelivered) {
    return null
  }

  // -------------------------------------------------------------------
  // in_transit + timeline === "entregue" + sem confirmação: prompt ativo
  // -------------------------------------------------------------------
  return (
    <div className="rounded-2xl border-2 border-primary bg-primary-soft/40 p-5 shadow-sm md:p-6">
      <div className="text-center">
        <h3 className="text-base font-bold text-primary md:text-lg">Seu pedido já chegou?</h3>
        <p className="mt-1 text-xs text-muted-foreground md:text-sm">
          Confirma pra gente saber que tudo deu certo!
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2 md:flex-row">
        <button
          type="button"
          onClick={handleConfirmDelivered}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-success px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
        >
          <CheckCircle2 className="h-4 w-4" />
          Sim, recebi normalmente
        </button>
        <button
          type="button"
          onClick={() => setShowOptions(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-danger bg-white px-5 py-3 text-sm font-bold text-danger transition hover:bg-danger-soft"
        >
          <AlertTriangle className="h-4 w-4" />
          Não recebi
        </button>
      </div>
    </div>
  )
}
