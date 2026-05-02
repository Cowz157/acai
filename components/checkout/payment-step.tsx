"use client"

import { useState } from "react"
import { ArrowLeft, CreditCard, Loader2, Wallet } from "lucide-react"
import { formatMoneyBR } from "@/lib/format"
import { cn } from "@/lib/utils"

/** "cash" mantido no type só pra retrocompat com pedidos antigos no localStorage. UI nova não oferece. */
export type PaymentMethod = "pix" | "cash" | "card"

export interface PaymentData {
  method: PaymentMethod
  cashChange?: string
}

interface PaymentStepProps {
  total: number
  defaultValues?: Partial<PaymentData>
  onBack: () => void
  onSubmit: (data: PaymentData) => void | Promise<void>
  loading?: boolean
  /** Tentativa atual (1, 2, 3) durante retry. 0 = primeira tentativa. */
  attempt?: number
  errorMessage?: string | null
}

interface OptionProps {
  selected: boolean
  onSelect: () => void
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  badgeTone?: "success" | "muted"
  disabled?: boolean
  children?: React.ReactNode
}

function PaymentOption({
  selected,
  onSelect,
  icon,
  title,
  description,
  badge,
  badgeTone = "success",
  disabled = false,
  children,
}: OptionProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        "block w-full rounded-xl border-2 p-4 text-left transition",
        disabled
          ? "cursor-not-allowed border-border bg-muted/30 opacity-60"
          : selected
            ? "border-success bg-success-soft/40 shadow-sm"
            : "border-border bg-white hover:border-muted-foreground/30",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
            disabled
              ? "border-border bg-muted"
              : selected
                ? "border-success bg-success"
                : "border-border bg-white",
          )}
        >
          {selected && !disabled && <span className="h-2 w-2 rounded-full bg-white" />}
        </span>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            disabled ? "bg-muted text-muted-foreground" : "bg-primary-soft text-primary",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-foreground">{title}</span>
            {badge && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  badgeTone === "success" ? "bg-success text-white" : "bg-muted-foreground/15 text-muted-foreground",
                )}
              >
                {badge}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{description}</div>
          {children && <div className="mt-2">{children}</div>}
        </div>
      </div>
    </button>
  )
}

export function PaymentStep({
  total,
  defaultValues,
  onBack,
  onSubmit,
  loading = false,
  attempt = 0,
  errorMessage,
}: PaymentStepProps) {
  // Sempre força "pix" — outros métodos não estão mais disponíveis no UI
  const initialMethod: PaymentMethod = defaultValues?.method === "pix" ? "pix" : "pix"
  const [method, setMethod] = useState<PaymentMethod>(initialMethod)

  const handleSubmit = () => {
    void onSubmit({ method })
  }

  return (
    <div className="animate-step-in space-y-5 rounded-2xl border border-border bg-white p-5 shadow-sm md:p-7">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary">
            <CreditCard className="h-4 w-4" />
          </span>
          <h2 className="text-lg font-bold text-primary md:text-xl">Como você quer pagar?</h2>
        </div>
        <span className="text-right">
          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Total</span>
          <span className="block text-base font-extrabold text-success md:text-lg">{formatMoneyBR(total)}</span>
        </span>
      </header>

      <div className="space-y-3">
        <PaymentOption
          selected={method === "pix"}
          onSelect={() => setMethod("pix")}
          icon={<Wallet className="h-4 w-4" />}
          title="PIX"
          description="Pague na hora pelo QR Code ou copia e cola"
          badge="Recomendado"
        />

        <PaymentOption
          selected={false}
          onSelect={() => {}}
          icon={<CreditCard className="h-4 w-4" />}
          title="Cartão na entrega"
          description="Crédito ou débito na maquininha"
          badge="Em manutenção"
          badgeTone="muted"
          disabled
        />
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">{errorMessage}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-success px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading
            ? attempt > 1
              ? `Tentando novamente (${attempt}/3)...`
              : "Gerando PIX..."
            : method === "pix"
              ? "Gerar PIX e Finalizar"
              : "Finalizar Pedido"}
        </button>
      </div>
    </div>
  )
}
