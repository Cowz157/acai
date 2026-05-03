"use client"

import { MapPin } from "lucide-react"
import { useDetectedLocation } from "@/lib/detected-location"

/**
 * Linha do header com a localização do cliente. Usa a detecção via IP
 * pra mostrar a cidade do visitante. Se não detectar, exibe texto neutro.
 */
export function StoreLocationLine() {
  const loc = useDetectedLocation()
  const hasLocation = Boolean(loc?.city)

  return (
    <div className="mt-1 flex items-center justify-center gap-1.5 text-sm md:text-base">
      <MapPin className="h-4 w-4 text-muted-foreground" />
      {hasLocation ? (
        <span>
          Atendendo {loc!.city}
          {loc!.stateCode ? ` - ${loc!.stateCode}` : ""}
        </span>
      ) : (
        <span>Atendemos sua região</span>
      )}
    </div>
  )
}
