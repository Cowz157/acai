"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, CheckCircle2, Loader2, MapPin, Search, X } from "lucide-react"
import { citiesByState, states } from "@/lib/data"
import { saveDetectedLocation } from "@/lib/detected-location"
import { fetchIpLocation } from "@/lib/geolocate"
import { cn } from "@/lib/utils"

/**
 * Combobox com 2 caminhos paralelos:
 *   1) Buscar (input no topo) — filtra a lista visível conforme digita
 *   2) Scrollar a lista cheia — sempre disponível, mesmo com valor já selecionado
 *
 * Search e value são estados INDEPENDENTES: digitar na busca não muda o valor
 * selecionado, e selecionar um item não preenche/limpa a busca. Isso permite
 * que cliente já com "São Paulo" selecionado possa, sem perder a seleção,
 * digitar "Rio" pra ver outras opções e trocar. Item selecionado fica
 * destacado com bg + check; lista preserva ordem original.
 *
 * Quando search não bate com nada: botão pra usar o texto digitado como valor
 * (aceita cidade/estado fora da lista).
 */
interface SearchableSelectProps {
  value: string
  onChange: (next: string) => void
  options: string[]
  placeholder: string
}

function SearchableSelect({ value, onChange, options, placeholder }: SearchableSelectProps) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.toLowerCase().includes(q))
  }, [search, options])

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          autoFocus
          autoComplete="off"
          className="w-full rounded-xl border border-border bg-white py-3 pl-10 pr-9 text-sm font-medium text-foreground outline-none focus:border-primary"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="scrollbar-visible mt-2 max-h-56 overflow-y-auto rounded-xl border border-border bg-white">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-xs italic text-muted-foreground">
              Nada na lista bate com{" "}
              <strong className="not-italic text-foreground">"{search.trim()}"</strong>
            </p>
            {search.trim() && (
              <button
                type="button"
                onClick={() => {
                  onChange(search.trim())
                  setSearch("")
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
              >
                Usar &ldquo;{search.trim()}&rdquo; mesmo assim
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {filtered.map((o) => {
              const selected = o === value
              return (
                <li key={o}>
                  <button
                    type="button"
                    onClick={() => onChange(o)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition",
                      selected
                        ? "bg-primary-soft font-bold text-primary"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    <span className="truncate">{o}</span>
                    {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

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
              Busque ou digite seu <span className="font-semibold text-danger">estado</span>:
            </p>
            <div className="mt-4">
              <SearchableSelect
                value={state}
                onChange={setState}
                options={states}
                placeholder="Buscar estado..."
              />
            </div>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                disabled={!state.trim()}
                onClick={() => {
                  const newCities = citiesByState[state] ?? []
                  setCity(newCities[0] ?? "")
                  setStep(2)
                }}
                className="rounded-md bg-success px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
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
              Agora, busque sua <span className="font-semibold text-danger">cidade</span>:
            </p>
            <div className="mt-4">
              <SearchableSelect
                value={city}
                onChange={setCity}
                options={cities}
                placeholder="Buscar cidade..."
              />
            </div>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                disabled={!city.trim()}
                onClick={() => setStep(3)}
                className="rounded-md bg-success px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
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
