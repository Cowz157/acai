/**
 * Captura e persistência de UTMs + parâmetros do Google Ads.
 *
 * Fluxo:
 *   1. Usuário entra em qualquer página com query params na URL.
 *   2. `captureUtmsFromUrl()` (chamado em pageview) salva em localStorage por 30 dias.
 *   3. No checkout, `getStoredUtms()` lê o storage e devolve os params.
 *   4. Os params vão no body do POST `/pix/criar` da Vyat.
 *   5. Vyat persiste em `transactions` e mostra no dashboard.
 *
 * Captura cobre o caso do user entrar com UTM, navegar pro `/checkout`
 * (perdendo a query string) e só então pagar — sem isso `URLSearchParams`
 * no momento do pagamento estaria vazio.
 *
 * Campos extras (keyword, device, network, gclid) seguem a URL template
 * recomendada pra Google Ads:
 *   ?utm_source=google&utm_campaign={campaignid}&utm_medium={adgroupid}
 *    &utm_content={creative}&utm_term={placement}::{keyword}
 *    &keyword={keyword}&device={device}&network={network}
 *
 * gclid é adicionado automaticamente pela Google quando auto-tagging está
 * ligado na conta. Persistência local serve como backup pra atribuição
 * server-side (Vyat → Google Ads Conversion API) caso o GTM client-side
 * seja bloqueado por extensões/ad-blockers.
 */

export interface Utms {
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
  utm_term: string
  keyword: string
  device: string
  network: string
  gclid: string
}

const STORAGE_KEY = "acai-tropical-utms"
const TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 dias

interface StoredUtms extends Utms {
  capturedAt: number
}

const EMPTY_UTMS: Utms = {
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_content: "",
  utm_term: "",
  keyword: "",
  device: "",
  network: "",
  gclid: "",
}

function readUtmsFromUrl(search: string): Utms | null {
  const params = new URLSearchParams(search)
  const utms: Utms = {
    utm_source: params.get("utm_source") ?? "",
    utm_medium: params.get("utm_medium") ?? "",
    utm_campaign: params.get("utm_campaign") ?? "",
    utm_content: params.get("utm_content") ?? "",
    utm_term: params.get("utm_term") ?? "",
    keyword: params.get("keyword") ?? "",
    device: params.get("device") ?? "",
    network: params.get("network") ?? "",
    gclid: params.get("gclid") ?? "",
  }
  const hasAny = Object.values(utms).some((v) => v !== "")
  return hasAny ? utms : null
}

/**
 * Captura UTMs da URL atual e persiste em localStorage.
 * Chamar no primeiro pageview (em layout/top-level component).
 *
 * Política de overwrite: nova UTM sempre sobrescreve a anterior. Atribuição "last-touch"
 * — quem clicou no anúncio mais recente leva o crédito da venda.
 */
export function captureUtmsFromUrl(): void {
  if (typeof window === "undefined") return
  const fromUrl = readUtmsFromUrl(window.location.search)
  if (!fromUrl) return

  try {
    const stored: StoredUtms = { ...fromUrl, capturedAt: Date.now() }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    /* ignora — modo privado, storage cheio, etc */
  }
}

/**
 * Lê UTMs salvas, com fallback pra URL atual (caso storage tenha falhado).
 * Sempre retorna um objeto — UTMs ausentes vêm como string vazia.
 */
export function getStoredUtms(): Utms {
  if (typeof window === "undefined") return { ...EMPTY_UTMS }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredUtms>
      const age = Date.now() - (parsed.capturedAt ?? 0)
      if (age <= TTL_MS) {
        return {
          utm_source: parsed.utm_source ?? "",
          utm_medium: parsed.utm_medium ?? "",
          utm_campaign: parsed.utm_campaign ?? "",
          utm_content: parsed.utm_content ?? "",
          utm_term: parsed.utm_term ?? "",
          keyword: parsed.keyword ?? "",
          device: parsed.device ?? "",
          network: parsed.network ?? "",
          gclid: parsed.gclid ?? "",
        }
      }
      // Expirou — limpa
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    /* ignora — fallback abaixo */
  }

  return readUtmsFromUrl(window.location.search) ?? { ...EMPTY_UTMS }
}
