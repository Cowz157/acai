"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
  { id: 1, label: "Identificação" },
  { id: 2, label: "Endereço" },
  { id: 3, label: "Pagamento" },
]

interface StepIndicatorProps {
  current: 1 | 2 | 3
  /** Quando true, marca todos os passos como concluídos (exibido após pagar). */
  allDone?: boolean
}

export function StepIndicator({ current, allDone = false }: StepIndicatorProps) {
  return (
    <div className="flex justify-center px-4 py-6">
      <div className="grid w-full max-w-sm grid-cols-3">
        {STEPS.map((step, idx) => {
          const isDone = allDone || step.id < current
          const isActive = !allDone && step.id === current
          const isLast = idx === STEPS.length - 1

          return (
            <div key={step.id} className="relative flex flex-col items-center">
              {/* Linha conectora pra o próximo step (vai do centro deste círculo até o centro do próximo) */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-1/2 top-[18px] h-[3px] w-full -translate-y-1/2 transition-colors",
                    isDone ? "bg-success" : "bg-muted",
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Círculo */}
              <div
                className={cn(
                  "relative z-10 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition",
                  isDone && "bg-success text-white",
                  isActive && "bg-success text-white ring-4 ring-success-soft",
                  !isDone && !isActive && "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : step.id}
              </div>

              {/* Label centralizado abaixo do círculo */}
              <span
                className={cn(
                  "mt-2 whitespace-nowrap text-center text-[11px] font-semibold md:text-xs",
                  (isDone || isActive) && "text-foreground",
                  !isDone && !isActive && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
