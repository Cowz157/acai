"use client"

/**
 * Detecção de localização do cliente via IP (sem prompt de permissão).
 * Usa o ipapi.co — free tier 30.000 requests/mês, sem necessidade de API key.
 *
 * Não é GPS-preciso (acerta cidade na maioria dos casos, pode errar pra
 * áreas rurais ou IPs de operadora). Bom o suficiente pra UX de "loja
 * mais próxima" em delivery.
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

export async function fetchIpLocation(timeoutMs = 4000): Promise<IpLocation | null> {
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
