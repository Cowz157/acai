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

  const handleCustomChange = (raw: string) => {
    const cleaned = raw.replace(/[^\d,]/g, "")
    setCustomRaw(cleaned)
    setCustomError(null)
    const numeric = Number(cleaned.replace(",", "."))
    if (!Number.isFinite(numeric) || numeric <= 0) {
      onChange(0)
      return
    }
    if (numeric < MIN_CUSTOM) {
      onChange(0)
      return
    }
    onChange(Math.round(numeric * 100) / 100)
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

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary-soft/30 to-white p-4 md:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <Heart className="h-4 w-4 fill-current" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-primary md:text-base">
            Sua compra já ajuda. Que tal somar mais?
          </p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground md:text-[13px]">
            A gente leva comida, dinheiro e ajuda direta pra famílias em situação difícil — toda
            semana. <strong className="text-foreground">100% do que você somar</strong> entra na
            próxima rodada de doações.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((amount) => {
          const selected = value === amount && !customMode
          return (
            <button
              key={amount}
              type="button"
              onClick={() => selectPreset(amount)}
              aria-pressed={selected}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-bold transition active:scale-95",
                selected
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-primary/40 bg-white text-primary hover:border-primary hover:bg-primary-soft",
              )}
            >
              {selected && <Check className="h-3.5 w-3.5" />}
              + {formatMoneyBR(amount)}
            </button>
          )
        })}
        <button
          type="button"
          onClick={enterCustomMode}
          aria-pressed={customMode}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-bold transition active:scale-95",
            customMode
              ? "border-primary bg-primary text-white shadow-sm"
              : "border-primary/40 bg-white text-primary hover:border-primary hover:bg-primary-soft",
          )}
        >
          {customMode && <Check className="h-3.5 w-3.5" />}
          Outro valor
        </button>
      </div>

      {customMode && (
        <div className="mt-3">
          <div className="flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-3 py-2">
            <span className="text-sm font-bold text-muted-foreground">R$</span>
            <input
              autoFocus
              value={customRaw}
              onChange={(e) => handleCustomChange(e.target.value)}
              onBlur={handleCustomBlur}
              placeholder="0,00"
              inputMode="decimal"
              className="flex-1 bg-transparent text-sm font-bold text-foreground outline-none"
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

      {value > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-xs">
          <span className="font-semibold text-primary">
            💜 {formatMoneyBR(value)} adicionado pra próxima rodada
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
      )}
    </div>
  )
}
