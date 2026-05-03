"use client"

import { useDetectedLocation } from "@/lib/detected-location"

/**
 * Faixa "Entrega Grátis" + linha pequena Express.
 * Mostra a cidade detectada do cliente quando disponível, senão fica genérico.
 */
export function DeliveryBanner() {
  const loc = useDetectedLocation()
  const city = loc?.city
  const stateCode = loc?.stateCode

  return (
    <div className="rounded-xl border-2 border-success bg-white px-4 py-3 text-center md:px-5 md:py-4">
      <p className="text-sm font-medium text-foreground md:text-base">
        <span className="font-semibold text-success">Entrega Grátis</span>
        {city ? (
          <>
            {" "}
            para{" "}
            <strong>
              {city}
              {stateCode ? ` - ${stateCode}` : ""}
            </strong>
            !
          </>
        ) : (
          <> para a sua região!</>
        )}
      </p>
      <p className="mt-1 text-xs text-muted-foreground md:text-sm">
        ⚡ Tem pressa? <strong className="text-foreground">Express em 10-20 min</strong> por R$ 4,90
      </p>
    </div>
  )
}
