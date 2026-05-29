"use client"

import { useState } from "react"
import { Loader2, Ticket, X } from "lucide-react"
import { toast } from "sonner"
import { formatMoneyBR } from "@/lib/format"

export interface AppliedCoupon {
  /** UUID do cupom (de coupons.id) — necessário pro redeem server-side. */
  id: string
  code: string
  discountBrl: number
}

interface CouponFieldProps {
  /** Subtotal atual (sem desconto) — passado pra validate API. */
  subtotal: number
  /** Email do cliente — necessário pra checar max_uses_per_email. */
  customerEmail: string
  /** Cupom aplicado atual, null se nenhum. */
  applied: AppliedCoupon | null
  onApplied: (coupon: AppliedCoupon) => void
  onRemoved: () => void
  /** Desabilita interação enquanto outra ação principal roda (ex: gerando PIX). */
  disabled?: boolean
}

/**
 * Input de cupom + botão Aplicar. Quando aplicado, mostra estado preenchido
 * com X pra remover. Valida server-side via /api/coupons/validate antes de
 * aplicar — protege contra cupom inválido/expirado/regra violada.
 *
 * Sem expansão por default (collapsed) pra não cansar visualmente quem não tem
 * cupom; expande quando user clica "tenho cupom".
 */
export function CouponField({
  subtotal,
  customerEmail,
  applied,
  onApplied,
  onRemoved,
  disabled = false,
}: CouponFieldProps) {
  const [expanded, setExpanded] = useState(Boolean(applied))
  const [code, setCode] = useState(applied?.code ?? "")
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApply = async () => {
    setError(null)
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setValidating(true)
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, subtotal, email: customerEmail }),
      })
      const data = (await res.json()) as {
        valid: boolean
        discountBrl?: number
        coupon?: { id: string; code: string }
        error?: string
      }
      if (!data.valid || typeof data.discountBrl !== "number" || !data.coupon) {
        setError(data.error || "Cupom inválido")
        return
      }
      onApplied({ id: data.coupon.id, code: data.coupon.code, discountBrl: data.discountBrl })
      // Toast custom com design da marca em vez do toast.success padrão do
      // sonner (que sai verde brilhante genérico). Visual: ícone roxo + borda
      // verde sutil + hierarquia code/desconto separadas, combinando com
      // o CouponField que tá logo abaixo.
      const appliedCode = data.coupon.code
      const appliedDiscount = data.discountBrl
      toast.custom(
        (id) => (
          <div className="flex w-full max-w-sm items-start gap-3 rounded-2xl border-2 border-success bg-white p-4 shadow-lg">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-soft">
              <Ticket className="h-5 w-5 text-success" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">
                Cupom <span className="text-primary">{appliedCode}</span> aplicado!
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Você ganhou <strong className="text-success">{formatMoneyBR(appliedDiscount)}</strong> de desconto 💜
              </p>
            </div>
            <button
              type="button"
              onClick={() => toast.dismiss(id)}
              aria-label="Fechar"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
        { duration: 4000 },
      )
    } catch {
      setError("Erro ao validar. Tente novamente.")
    } finally {
      setValidating(false)
    }
  }

  const handleRemove = () => {
    setCode("")
    setError(null)
    onRemoved()
  }

  if (!expanded && !applied) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        disabled={disabled}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary underline decoration-dotted underline-offset-4 hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Ticket className="h-4 w-4" />
        Tenho um cupom de desconto
      </button>
    )
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-success bg-success-soft px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-white">
            <Ticket className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-success">{applied.code}</p>
            <p className="text-xs text-success">
              Desconto de <strong>{formatMoneyBR(applied.discountBrl)}</strong> aplicado
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled}
          aria-label="Remover cupom"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-success hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  const handleCollapse = () => {
    setCode("")
    setError(null)
    setExpanded(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="block text-sm font-medium text-foreground">Cupom de desconto</label>
        <button
          type="button"
          onClick={handleCollapse}
          disabled={disabled || validating}
          aria-label="Fechar campo de cupom"
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-1.5 flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            if (error) setError(null)
          }}
          placeholder="DIGITE O CÓDIGO"
          autoComplete="off"
          disabled={disabled || validating}
          className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-bold uppercase tracking-wide text-foreground outline-none focus:border-primary disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={disabled || validating || !code.trim()}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  )
}
