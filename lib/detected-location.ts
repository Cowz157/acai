"use client"

import { useEffect, useState } from "react"
import { fetchIpLocation, type IpLocation } from "./geolocate"

const STORAGE_KEY = "acai-tropical-detected-location"

/**
 * Salva a localização detectada via IP no localStorage pra outros componentes
 * (faixas da home, header, etc) reaproveitarem sem repetir a chamada de API.
 */
export function saveDetectedLocation(loc: IpLocation): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loc))
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
 * dispara a detecção (cache 1x e reusa em renders futuros).
 */
export function useDetectedLocation(): IpLocation | null {
  const [loc, setLoc] = useState<IpLocation | null>(null)

  useEffect(() => {
    const cached = getDetectedLocation()
    if (cached) {
      setLoc(cached)
      return
    }
    let cancelled = false
    fetchIpLocation().then((fresh) => {
      if (cancelled || !fresh) return
      saveDetectedLocation(fresh)
      setLoc(fresh)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return loc
}
