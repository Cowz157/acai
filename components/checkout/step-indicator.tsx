"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
  { id: 1, label: "Entrega" },
  { id: 2, label: "Pagamento" },
  { id: 3, label: "Confirmação" },
]

interface StepIndicatorProps {
  current: 1 | 2 | 3
}

export function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <div className="flex items-start justify-center px-4 py-6">
      <div className="flex w-full max-w-md items-start">
        {STEPS.map((step, idx) => {
          const isDone = step.id < current
          const isActive = step.id === current
          const isLast = idx === STEPS.length - 1

          return (
            <div key={step.id} className="flex flex-1 items-start">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition",
                    isDone && "bg-success text-white",
                    isActive && "bg-success text-white ring-4 ring-success-soft",
                    !isDone && !isActive && "bg-muted text-muted-foreground",
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <span
                  className={cn(
                    "mt-2 whitespace-nowrap text-[11px] font-semibold md:text-xs",
                    (isDone || isActive) && "text-foreground",
                    !isDone && !isActive && "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "mx-1 mt-[18px] h-[3px] flex-1 rounded-full transition md:mx-2",
                    isDone ? "bg-success" : "bg-muted",
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
