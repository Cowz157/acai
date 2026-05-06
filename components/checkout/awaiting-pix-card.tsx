"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import QRCode from "qrcode"
import { CheckCircle2, Clock, Copy, Loader2, RefreshCw, X } from "lucide-react"
import { generateCPF } from "@/lib/cpf"
import { formatMoneyBR, unmaskDigits } from "@/lib/format"
import { cancelOrder, type SavedOrder } from "@/lib/order-store"
import { mapVyatStatus } from "@/lib/payment-tracker"
import { createVyatPixWithRetry, describeVyatError, fetchVyatPixStatus } from "@/lib/pix-vyat"
import { uuid } from "@/lib/uuid"

interface AwaitingPixCardProps {
  order: SavedOrder
  /** Chamado quando o cliente regenera o PIX (atualiza localStorage e parent state). */
  onRegenerated: (updates: Partial<SavedOrder>) => void
  /** Estilo: "compact" (sem header) usado dentro de outro card; "standalone" com header próprio. */
  variant?: "compact" | "standalone"
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function AwaitingPixCard({ order, onRegenerated, variant = "standalone" }: AwaitingPixCardProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [regenerating, setRegenerating] = useState(false)
  const [regenAttempt, setRegenAttempt] = useState(0)
  const [regenError, setRegenError] = useState<string | null>(null)
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [checkingPayment, setCheckingPayment] = useState(false)
  const [checkResult, setCheckResult] = useState<"pending" | "error" | null>(null)

  const copyText = order.pix?.codigoPix ?? ""
  const expiresAt = order.pixExpiresAt
  const expired = expiresAt !== null && now > expiresAt
  const secondsLeft = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : null

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Sempre gera o QR localmente a partir do código copia-cola.
  // O qrcode_url do gateway pode vir como página HTML (fyhub.com.br/qr/...) ou
  // EMV disfarçado de data:image — nunca confia nele, gera local da string EMV.
  useEffect(() => {
    let cancelled = false
    if (!order.pix?.codigoPix) {
      setQrSrc(null)
      return
    }
    QRCode.toDataURL(order.pix.codigoPix, {
      width: 240,
      margin: 1,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrSrc(url)
      })
      .catch((err) => {
        console.error("[awaiting-pix-card] erro gerando QR Code:", err)
        if (!cancelled) setQrSrc(null)
      })
    return () => {
      cancelled = true
    }
  }, [order.pix?.codigoPix])

  const handleCopy = async () => {
    if (!copyText) return
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* noop */
    }
  }

  const handleAlreadyPaid = async () => {
    if (!order.gatewayTransactionId) return
    setCheckingPayment(true)
    setCheckResult(null)
    try {
      const remote = await fetchVyatPixStatus(order.gatewayTransactionId)
      const newStatus = mapVyatStatus(remote.status)
      if (newStatus !== order.paymentStatus) {
        onRegenerated({
          paymentStatus: newStatus,
          paidAt: newStatus === "approved" ? Date.now() : order.paidAt,
        })
      } else {
        // Status não mudou — gateway ainda processando o pagamento
        setCheckResult("pending")
      }
    } catch (err) {
      console.error("[awaiting-pix-card] erro verificando pagamento:", err)
      setCheckResult("error")
    } finally {
      setCheckingPayment(false)
    }
  }

  const handleCancel = async () => {
    setCancelling(true)
    setCancelError(null)
    const result = await cancelOrder(order.id)
    if (!result.ok) {
      setCancelError(result.error)
      setCancelling(false)
      return
    }
    router.replace("/")
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    setRegenError(null)
    setRegenAttempt(0)
    try {
      const newExternalId = uuid() // novo UUID — Vyat aceita duplicado se diferente
      const produtoLabel =
        order.items
          .slice(0, 3)
          .map((it) => `${it.quantity}x ${it.productName}`)
          .join(", ") + (order.items.length > 3 ? "..." : "")

      const pixResponse = await createVyatPixWithRetry(
        {
          valor: order.total,
          nome: order.delivery.fullName,
          email: order.delivery.email,
          cpf: generateCPF(),
          telefone: order.delivery.phone ? unmaskDigits(order.delivery.phone) : "",
          produto: `Açaí Tropical — ${produtoLabel}`,
          external_id: newExternalId,
        },
        {},
        (attempt) => setRegenAttempt(attempt),
      )

      onRegenerated({
        // Mesmo motivo do checkout: polling precisa do vyat_transaction_id, não do eco.
        gatewayTransactionId:
          pixResponse.vyat_transaction_id ?? pixResponse.transaction_id ?? newExternalId,
        pix: {
          qrCodeUrl: pixResponse.qrcode_url ?? null,
          codigoPix: pixResponse.codigo_pix ?? null,
        },
        pixExpiresAt: pixResponse.expires_at ? new Date(pixResponse.expires_at).getTime() : null,
      })
    } catch (err) {
      setRegenError(describeVyatError(err))
    } finally {
      setRegenerating(false)
      setRegenAttempt(0)
    }
  }

  // Bloco de cancelar — usado tanto no PIX ativo quanto no expirado.
  const cancelBlock = confirmingCancel ? (
    <div className="space-y-2 rounded-lg border border-danger/30 bg-danger-soft/40 p-3 text-center">
      <p className="text-xs font-semibold text-foreground">Tem certeza que quer cancelar esse pedido?</p>
      {cancelError && <p className="text-[11px] font-semibold text-danger">{cancelError}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setConfirmingCancel(false)
            setCancelError(null)
          }}
          disabled={cancelling}
          className="flex-1 rounded-full border border-border bg-white px-3 py-2 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-50"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelling}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-danger px-3 py-2 text-xs font-bold text-white transition hover:brightness-95 disabled:opacity-70"
        >
          {cancelling && <Loader2 className="h-3 w-3 animate-spin" />}
          {cancelling ? "Cancelando..." : "Sim, cancelar"}
        </button>
      </div>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setConfirmingCancel(true)}
      className="inline-flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-danger"
    >
      <X className="h-3 w-3" />
      Cancelar pedido
    </button>
  )

  // -------------------------------------------------------------------
  // Variante UI: PIX expirado
  // -------------------------------------------------------------------
  if (expired) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 p-5 text-center">
          <p className="text-sm font-bold text-yellow-900">Esse PIX expirou</p>
          <p className="mt-1 text-xs text-yellow-800">
            Sem stress — o pedido continua aqui. Gera um novo código pra finalizar.
          </p>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-70"
          >
            {regenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {regenAttempt > 1 ? `Tentando (${regenAttempt}/3)...` : "Gerando novo PIX..."}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Gerar novo PIX
              </>
            )}
          </button>
          {regenError && <p className="mt-3 text-xs font-semibold text-danger">{regenError}</p>}
        </div>

        <div className="border-t border-border pt-3">{cancelBlock}</div>
      </div>
    )
  }

  // -------------------------------------------------------------------
  // Variante UI: PIX ativo (com QR e countdown)
  // -------------------------------------------------------------------
  return (
    <div className={variant === "standalone" ? "space-y-4" : "mt-4 space-y-4"}>
      <div className="flex flex-col items-center gap-2">
        {qrSrc ? (
          <div className="relative h-[240px] w-[240px] overflow-hidden rounded-xl border border-border bg-white">
            <Image src={qrSrc} alt="QR Code do PIX" fill className="object-contain p-3" sizes="240px" unoptimized />
          </div>
        ) : (
          <div className="flex aspect-square w-full max-w-[240px] flex-col items-center justify-center rounded-xl bg-muted/60 p-4 text-center text-xs text-muted-foreground">
            <p className="font-semibold">QR Code indisponível</p>
            <p className="mt-1 text-[11px]">Use o copia e cola abaixo</p>
          </div>
        )}
        <p className="text-base font-extrabold text-success">{formatMoneyBR(order.total)}</p>

        {secondsLeft !== null && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-900">
            <Clock className="h-3 w-3" />
            Vence em <span className="tabular-nums">{formatCountdown(secondsLeft)}</span>
          </span>
        )}
      </div>

      {copyText && (
        <div>
          <label className="block text-xs font-semibold text-muted-foreground">Código copia e cola:</label>
          <div className="mt-1 flex gap-2">
            <input
              value={copyText}
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

      <p className="text-center text-[11px] text-muted-foreground">
        Esta página atualiza automaticamente quando o pagamento for confirmado.
      </p>

      {/* Botão "Já paguei?" — força checagem imediata em vez de esperar próximo polling */}
      <button
        type="button"
        onClick={handleAlreadyPaid}
        disabled={checkingPayment}
        className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-success bg-success-soft px-5 py-2.5 text-sm font-bold text-success transition hover:bg-success-soft/70 disabled:cursor-not-allowed disabled:opacity-60"
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
        <p className="-mt-2 text-center text-[11px] font-semibold text-yellow-700">
          Pagamento ainda não foi confirmado. Aguarde uns segundos e tente de novo.
        </p>
      )}
      {checkResult === "error" && (
        <p className="-mt-2 text-center text-[11px] font-semibold text-danger">
          Falha ao verificar. Tente de novo em instantes.
        </p>
      )}

      {/* Cancelar pedido (visível só enquanto pendente) */}
      <div className="border-t border-border pt-3">{cancelBlock}</div>
    </div>
  )
}
