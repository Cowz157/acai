"use client"

import { Minus, Plus } from "lucide-react"

interface OptionStepperProps {
  value: number
  onIncrement: () => void
  onDecrement: () => void
  canIncrement: boolean
}

export function OptionStepper({ value, onIncrement, onDecrement, canIncrement }: OptionStepperProps) {
  return (
    <div className="flex items-center rounded-full border border-border bg-white">
      <button
        type="button"
        onClick={onDecrement}
        disabled={value === 0}
        aria-label="Diminuir"
        className="flex h-8 w-8 items-center justify-center text-muted-foreground transition hover:text-foreground disabled:opacity-30"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[24px] text-center text-sm font-bold tabular-nums text-foreground">{value}</span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={!canIncrement}
        aria-label="Aumentar"
        className="flex h-8 w-8 items-center justify-center text-muted-foreground transition hover:text-foreground disabled:opacity-30"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
