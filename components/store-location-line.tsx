"use client"

import { MapPin, Pencil } from "lucide-react"
import { useDetectedLocation } from "@/lib/detected-location"
import { LOCATION_MODAL_OPEN_EVENT } from "./location-modal"

/**
 * Linha do header com a localização do cliente. Usa a detecção via IP
 * pra mostrar a cidade do visitante. Se não detectar, exibe texto neutro.
 *
 * Clicável: dispara o evento que reabre o LocationModal — útil quando o IP
 * detectou a cidade errada (VPN, IP de operadora 4G/5G de outra cidade,
 * Wi-Fi corporativo de outra cidade). Visual discreto: pill com border-dashed
 * muted + ícone de lápis pequeno; cores ganham peso só no hover, sem competir
 * com o nome da loja acima.
 */
export function StoreLocationLine() {
  const loc = useDetectedLocation()
  const hasLocation = Boolean(loc?.city)

  const handleClick = () => {
    if (typeof window === "undefined") return
    window.dispatchEvent(new CustomEvent(LOCATION_MODAL_OPEN_EVENT))
  }

  return (
    <div className="mt-1 flex justify-center">
      <button
        type="button"
        onClick={handleClick}
        aria-label="Trocar localização"
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/25 px-3 py-0.5 text-sm text-foreground transition hover:border-primary/60 hover:bg-primary-soft/40 md:text-base"
      >
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
        {hasLocation ? (
          <span>
            Atendendo {loc!.city}
            {loc!.stateCode ? ` - ${loc!.stateCode}` : ""}
          </span>
        ) : (
          <span>Atendemos sua região</span>
        )}
        <span className="ml-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary/80 md:text-xs">
          <Pencil className="h-3 w-3 shrink-0" aria-hidden="true" />
          Trocar
        </span>
      </button>
    </div>
  )
}
