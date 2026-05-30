"use client"

import { ChevronDown, MapPin } from "lucide-react"
import { useDetectedLocation } from "@/lib/detected-location"
import { LOCATION_MODAL_OPEN_EVENT } from "./location-modal"

/**
 * Linha do header com a localização do cliente. Usa a detecção via IP
 * pra mostrar a cidade do visitante. Se não detectar, exibe texto neutro.
 *
 * Clicável: dispara o evento que reabre o LocationModal — útil quando o IP
 * detectou a cidade errada (VPN, IP de operadora 4G/5G de outra cidade,
 * Wi-Fi corporativo de outra cidade).
 */
export function StoreLocationLine() {
  const loc = useDetectedLocation()
  const hasLocation = Boolean(loc?.city)

  const handleClick = () => {
    if (typeof window === "undefined") return
    window.dispatchEvent(new CustomEvent(LOCATION_MODAL_OPEN_EVENT))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Trocar localização"
      className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-full px-2 py-0.5 text-sm transition hover:bg-muted/60 md:text-base"
    >
      <MapPin className="h-4 w-4 text-muted-foreground" />
      {hasLocation ? (
        <span>
          Atendendo {loc!.city}
          {loc!.stateCode ? ` - ${loc!.stateCode}` : ""}
        </span>
      ) : (
        <span>Atendemos sua região</span>
      )}
      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
    </button>
  )
}
