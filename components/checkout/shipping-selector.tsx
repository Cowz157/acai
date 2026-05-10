"use client"

import { Bike, Zap } from "lucide-react"
import { shippingOptions, type ShippingMethod } from "@/lib/data"
import { formatMoneyBR } from "@/lib/format"
import { cn } from "@/lib/utils"

interface ShippingSelectorProps {
  value: ShippingMethod
  onChange: (next: ShippingMethod) => void
}

const ICONS: Record<ShippingMethod, React.ReactNode> = {
  standard: <Bike className="h-4 w-4" />,
  express: <Zap className="h-4 w-4" />,
}

export function ShippingSelector({ value, onChange }: ShippingSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground">Como você quer receber?</div>
      <div className="space-y-3">
        {shippingOptions.map((opt) => {
          const selected = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "block w-full rounded-xl border-2 p-4 text-left transition",
                selected
                  ? "border-success bg-success-soft/40 shadow-sm"
                  : "border-border bg-white hover:border-muted-foreground/30",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
                    selected ? "border-success bg-success" : "border-border bg-white",
                  )}
                >
                  {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  {ICONS[opt.id]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-foreground">{opt.label}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                    <span>{opt.description}</span>
                    {opt.badge && (
                      <span className="inline-flex items-center rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {opt.price === 0 ? (
                    <span className="text-sm font-extrabold text-success">GRÁTIS</span>
                  ) : (
                    <span className="text-sm font-extrabold text-foreground">+ {formatMoneyBR(opt.price)}</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
