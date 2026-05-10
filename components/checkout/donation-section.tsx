"use client"

import { useState } from "react"
import { Check, Heart } from "lucide-react"
import { formatMoneyBR } from "@/lib/format"
import { cn } from "@/lib/utils"

interface DonationSectionProps {
  value: number
  onChange: (next: number) => void
}

const PRESETS = [5, 10, 20] as const
const MIN_CUSTOM = 5

export function DonationSection({ value, onChange }: DonationSectionProps) {
  const isPreset = (PRESETS as readonly number[]).includes(value)
  const [customMode, setCustomMode] = useState<boolean>(value > 0 && !isPreset)
  const [customRaw, setCustomRaw] = useState<string>(
    value > 0 && !isPreset ? value.toFixed(2).replace(".", ",") : "",
  )
  const [customError, setCustomError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<boolean>(false)

  const selectPreset = (amount: number) => {
    if (value === amount) {
      onChange(0)
      return
    }
    setCustomMode(false)
    setCustomError(null)
    setCustomRaw("")
    onChange(amount)
  }

  const enterCustomMode = () => {
    setCustomMode(true)
    onChange(0)
    setCustomError(null)
  }

  /**
   * Formata o input como moeda em tempo real (estilo Nubank): cliente digita
   * só números e o display vira "X,YY" automaticamente — cada dígito empurra
   * pra esquerda. Ex: "5" → "0,05", "500" → "5,00", "5500" → "55,00".
   */
  const handleCustomChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "")
    if (!digits) {
      setCustomRaw("")
      setCustomError(null)
      onChange(0)
      return
    }
    const cents = Number.parseInt(digits.slice(0, 9), 10) // limite 7 dígitos antes da vírgula
    const value = cents / 100
    setCustomRaw(value.toFixed(2).replace(".", ","))
    setCustomError(null)
    if (value < MIN_CUSTOM) {
      onChange(0)
      return
    }
    onChange(Math.round(value * 100) / 100)
  }

  const handleCustomBlur = () => {
    if (!customRaw) return
    const numeric = Number(customRaw.replace(",", "."))
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setCustomError("Informe um valor válido")
      return
    }
    if (numeric < MIN_CUSTOM) {
      setCustomError(`Valor mínimo: ${formatMoneyBR(MIN_CUSTOM)}`)
    }
  }

  if (dismissed && value === 0) {
    return (
      <button
        type="button"
        onClick={() => setDismissed(false)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/30 bg-white px-3 py-2 text-xs text-muted-foreground transition hover:border-primary/60 hover:text-primary"
      >
        <Heart className="h-3.5 w-3.5" />
        Mudei de ideia, quero somar pra causa
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-white p-3 md:p-4">
      <div className="flex items-start gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Heart className="h-3.5 w-3.5 fill-current" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">
            Sua compra já ajuda. Que tal somar mais?
          </p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            Toda semana a gente leva comida, dinheiro e ajuda direta pra famílias em situação
            difícil. <strong className="text-foreground">100% do que você somar</strong> entra na
            próxima rodada de doações.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {PRESETS.map((amount) => {
          const selected = value === amount && !customMode
          return (
            <button
              key={amount}
              type="button"
              onClick={() => selectPreset(amount)}
              aria-pressed={selected}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 md:text-sm",
                selected
                  ? "border-primary bg-primary text-white"
                  : "border-primary/30 bg-white text-primary hover:border-primary hover:bg-primary-soft",
              )}
            >
              {selected && <Check className="h-3 w-3" />}
              {formatMoneyBR(amount)}
            </button>
          )
        })}
        <button
          type="button"
          onClick={enterCustomMode}
          aria-pressed={customMode}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 md:text-sm",
            customMode
              ? "border-primary bg-primary text-white"
              : "border-primary/30 bg-white text-primary hover:border-primary hover:bg-primary-soft",
          )}
        >
          {customMode && <Check className="h-3 w-3" />}
          Outro valor
        </button>
      </div>

      {customMode && (
        <div className="mt-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-primary bg-white px-3 py-2">
            <span className="text-sm font-semibold text-muted-foreground">R$</span>
            <input
              autoFocus
              value={customRaw}
              onChange={(e) => handleCustomChange(e.target.value)}
              onBlur={handleCustomBlur}
              placeholder="0,00"
              inputMode="numeric"
              className="flex-1 bg-transparent text-sm font-semibold tabular-nums text-foreground outline-none"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Mínimo {formatMoneyBR(MIN_CUSTOM)}
          </p>
          {customError && (
            <p className="mt-1 text-[11px] font-semibold text-danger">{customError}</p>
          )}
        </div>
      )}

      {value > 0 ? (
        <div className="mt-3 flex items-center justify-between rounded-md bg-primary-soft px-3 py-1.5 text-xs">
          <span className="font-semibold text-primary">
            💜 {formatMoneyBR(value)} adicionado pra causa
          </span>
          <button
            type="button"
            onClick={() => {
              setCustomMode(false)
              setCustomRaw("")
              setCustomError(null)
              onChange(0)
            }}
            className="font-semibold text-muted-foreground underline-offset-2 hover:underline"
          >
            remover
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="mt-2.5 block w-full text-center text-[11px] text-muted-foreground transition hover:text-foreground"
        >
          Talvez depois, obrigado
        </button>
      )}
    </div>
  )
}
