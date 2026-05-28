"use client"

import { useEffect, useState } from "react"
import { fetchIpLocation, type IpLocation } from "./geolocate"

const STORAGE_KEY = "acai-tropical-detected-location"
/** Evento custom disparado quando `saveDetectedLocation` é chamado. Permite
 *  hooks/componentes que leem essa localização reagirem em tempo real (ex:
 *  user escolhe cidade no LocationModal e o header atualiza sem refresh). */
const UPDATED_EVENT = "detected-location-updated"

/**
 * Salva a localização (IP detectado OU escolha manual via LocationModal) no
 * localStorage pra outros componentes (faixas da home, header, etc)
 * reaproveitarem sem repetir a chamada de API.
 */
export function saveDetectedLocation(loc: IpLocation): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loc))
  } catch {
    /* ignora */
  }
  // Dispara em qualquer caminho — mesmo se localStorage falhou, componentes
  // que mantêm state in-memory podem atualizar via outro mecanismo.
  try {
    window.dispatchEvent(new CustomEvent<IpLocation>(UPDATED_EVENT, { detail: loc }))
  } catch {
    /* ignora */
  }
}

export function getDetectedLocation(): IpLocation | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as IpLocation
  } catch {
    return null
  }
}

/**
 * Hook que retorna a localização detectada. Se ainda não tem cache,
 * dispara a detecção (cache 1x e reusa em renders futuros). Reage a updates
 * via custom event `detected-location-updated` — quando user escolhe outra
 * cidade no LocationModal, componentes que usam esse hook re-renderizam
 * automaticamente.
 */
export function useDetectedLocation(): IpLocation | null {
  const [loc, setLoc] = useState<IpLocation | null>(null)

  useEffect(() => {
    const cached = getDetectedLocation()
    if (cached) {
      setLoc(cached)
    } else {
      let cancelled = false
      fetchIpLocation().then((fresh) => {
        if (cancelled || !fresh) return
        saveDetectedLocation(fresh)
        // saveDetectedLocation já dispara o evento, mas como esse mount
        // pode ser o primeiro listener registrado, garante o set direto.
        setLoc(fresh)
      })
      return () => {
        cancelled = true
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<IpLocation>).detail
      if (detail) setLoc(detail)
    }
    window.addEventListener(UPDATED_EVENT, handler)
    return () => window.removeEventListener(UPDATED_EVENT, handler)
  }, [])

  return loc
}
