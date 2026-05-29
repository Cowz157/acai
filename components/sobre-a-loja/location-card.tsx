"use client"

import { Check, MapPin } from "lucide-react"
import { useDetectedLocation } from "@/lib/detected-location"

/** Mini-card dinâmico usado dentro de /sobre-a-loja: mostra a cidade detectada
 *  do lead com badge "Grátis hoje". Mantém o storytelling de loja local
 *  coerente com o resto do site (header, DeliveryBanner). */
export function SobreLocationCard() {
  const loc = useDetectedLocation()
  const cityLabel = loc?.city
    ? `${loc.city}${loc.stateCode ? ` - ${loc.stateCode}` : ""}`
    : "Sua região"

  return (
    <div className="rounded-xl border-2 border-success bg-success-soft/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15">
            <MapPin className="h-5 w-5 text-success" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-success/80">Atende em</p>
            <p className="truncate text-base font-extrabold text-foreground md:text-lg">{cityLabel}</p>
            <p className="text-xs text-muted-foreground">Tempo estimado: 30-50 min</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[10px] font-extrabold uppercase text-white">
          <Check className="h-3 w-3" strokeWidth={3} />
          Grátis hoje
        </span>
      </div>
    </div>
  )
}
