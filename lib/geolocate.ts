"use client"

import { stateCodeByName } from "./data"

/**
 * Detecção de localização do cliente via IP (sem prompt de permissão).
 *
 * Estratégia: ipapi.co como primário, ipinfo.io como fallback. Se o primário
 * falhar (timeout, 429 rate limit, outage), o fallback assume sem cliente
 * perceber. Os dois são free tier sem API key (ipapi: 30k/mês, ipinfo: 50k/mês).
 *
 * Não é GPS-preciso (acerta cidade na maioria dos casos, pode errar pra
 * áreas rurais ou IPs de operadora 4G/5G). Bom o suficiente pra UX de "loja
 * mais próxima" em delivery — a validação real da área de entrega acontece
 * via CEP no checkout.
 */

export interface IpLocation {
  /** Cidade detectada (ex: "Angra dos Reis"). */
  city: string | null
  /** Nome completo do estado (ex: "Rio de Janeiro"). */
  state: string | null
  /** Sigla do estado (ex: "RJ"). */
  stateCode: string | null
  /** Código ISO do país (ex: "BR"). */
  country: string | null
}

async function fetchFromIpapi(timeoutMs: number): Promise<IpLocation | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    return {
      city: typeof data.city === "string" ? data.city : null,
      state: typeof data.region === "string" ? data.region : null,
      stateCode: typeof data.region_code === "string" ? data.region_code : null,
      country: typeof data.country_code === "string" ? data.country_code : null,
    }
  } catch {
    clearTimeout(timer)
    return null
  }
}

async function fetchFromIpinfo(timeoutMs: number): Promise<IpLocation | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch("https://ipinfo.io/json", { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    const state = typeof data.region === "string" ? data.region : null
    return {
      city: typeof data.city === "string" ? data.city : null,
      state,
      // ipinfo não retorna sigla — derivamos do mapa stateCodeByName.
      stateCode: state ? stateCodeByName[state] ?? null : null,
      country: typeof data.country === "string" ? data.country : null,
    }
  } catch {
    clearTimeout(timer)
    return null
  }
}

/** Considera válida uma localização brasileira completa (com city + state).
 *  Se vier vazia/incompleta, deixamos cair pro próximo provedor — ou pro
 *  fluxo manual do LocationModal se ambos falharem. */
function isValidBrazilLocation(loc: IpLocation | null): boolean {
  return loc !== null && loc.country === "BR" && !!loc.city && !!loc.state
}

/**
 * Tenta detectar a localização. Primeiro via ipapi.co; se falhar/timeout/rate
 * limit, cai pro ipinfo.io. Orçamento de tempo dividido pra garantir que o
 * fallback ainda tem janela razoável se o primário travar.
 */
export async function fetchIpLocation(totalTimeoutMs = 4000): Promise<IpLocation | null> {
  // 60% pro primário, 40% pro fallback. Se o primário responder rápido (caso
  // comum), o fallback nem é chamado e o orçamento "sobra" não é usado.
  const primaryTimeout = Math.floor(totalTimeoutMs * 0.6)
  const fallbackTimeout = totalTimeoutMs - primaryTimeout

  const primary = await fetchFromIpapi(primaryTimeout)
  if (isValidBrazilLocation(primary)) return primary

  const fallback = await fetchFromIpinfo(fallbackTimeout)
  return isValidBrazilLocation(fallback) ? fallback : null
}
