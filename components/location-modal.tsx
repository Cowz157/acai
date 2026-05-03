"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, MapPin } from "lucide-react"
import { citiesByState, states } from "@/lib/data"
import { saveDetectedLocation } from "@/lib/detected-location"
import { fetchIpLocation } from "@/lib/geolocate"

/**
 * Steps:
 *   0 — detecting (auto via IP, sem clique do user)
 *   1 — manual: escolher estado (fallback se IP falhar)
 *   2 — manual: escolher cidade
 *   3 — fake "procurando loja" (apenas no fluxo manual, pra dar credibilidade)
 *   4 — sucesso "loja encontrada"
 */
type Step = 0 | 1 | 2 | 3 | 4

const SEEN_KEY = "acai-location-modal-seen"

export function LocationModal() {
  // Inicia fechado pra evitar flash no primeiro render (SSR) e abre só após verificar localStorage.
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>(0)
  const [state, setState] = useState("Rio de Janeiro")
  const [stateCode, setStateCode] = useState<string | null>(null)
  const [city, setCity] = useState("Angra dos Reis")
  /** Marca true quando o estado/cidade foram preenchidos via IP (não manual). */
  const [autoDetected, setAutoDetected] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SEEN_KEY) !== "1") {
        setOpen(true)
      } else {
        // Já viu o modal antes — dispara o evento que destrava o LiveOrderToast.
        window.dispatchEvent(new CustomEvent("location-modal-closed"))
      }
    } catch {
      setOpen(true)
    }
  }, [])

  // Auto-detecção via IP assim que o modal abre
  useEffect(() => {
    if (!open || step !== 0) return
    let cancelled = false
    fetchIpLocation().then((loc) => {
      if (cancelled) return
      if (loc?.country === "BR" && loc.city && loc.state) {
        setCity(loc.city)
        setState(loc.state)
        setStateCode(loc.stateCode ?? null)
        setAutoDetected(true)
        // Cacheia pra reusar nas faixas/header sem repetir a chamada
        saveDetectedLocation(loc)
        setStep(4)
      } else {
        // Fallback: pede estado/cidade manualmente
        setStep(1)
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, step])

  // Step 3 (manual flow) tem delay simulado de "procurando"
  useEffect(() => {
    if (step === 3) {
      const t = setTimeout(() => setStep(4), 2000)
      return () => clearTimeout(t)
    }
  }, [step])

  const closeModal = () => {
    try {
      window.localStorage.setItem(SEEN_KEY, "1")
    } catch {
      /* ignora */
    }
    setOpen(false)
    window.dispatchEvent(new CustomEvent("location-modal-closed"))
  }

  if (!open) return null

  const cities = citiesByState[state] ?? ["Selecione sua cidade"]

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl md:p-8">
        {step === 0 && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-center text-base font-semibold text-foreground">
              Detectando sua localização...
            </p>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              Estamos buscando a loja mais próxima
            </p>
          </div>
        )}

        {step === 1 && (
          <>
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
                <MapPin className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h2 className="mt-4 text-center text-xl font-bold text-primary md:text-2xl">
              Procure a loja mais próxima de você!
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Selecione seu <span className="font-semibold text-danger">estado</span>:
            </p>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-4 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-primary"
            >
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  const newCities = citiesByState[state] ?? ["Angra dos Reis"]
                  setCity(newCities[0])
                  setStep(2)
                }}
                className="rounded-md bg-success px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
              >
                Próximo
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
                <MapPin className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h2 className="mt-4 text-center text-xl font-bold text-primary md:text-2xl">
              Estamos quase lá...
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Agora, selecione sua <span className="font-semibold text-danger">cidade</span>:
            </p>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-4 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-primary"
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-md bg-success px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
              >
                Procurar loja mais próxima!
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-center text-base font-semibold text-foreground">
              Procurando a loja mais próxima...
            </p>
          </div>
        )}

        {step === 4 && (
          <>
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
            </div>
            <h2 className="mt-4 text-center text-lg font-bold text-foreground md:text-xl">
              Loja encontrada!
            </h2>
            {autoDetected ? (
              <p className="mt-2 text-center text-sm text-foreground">
                Detectamos que você está em{" "}
                <strong className="text-primary">
                  {city}
                  {stateCode ? ` - ${stateCode}` : ""}
                </strong>
                . Seu pedido chega em <strong>30 a 50 minutos</strong>.
              </p>
            ) : (
              <p className="mt-2 text-center text-sm text-foreground">
                Boa! Seu pedido chega entre <strong>30 a 50 minutos</strong>.
              </p>
            )}
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md bg-success px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
              >
                Olhar cardápio de ofertas!
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
