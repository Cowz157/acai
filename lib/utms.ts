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
  // UTMs canônicos
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
  utm_term: string
  // Google Ads template
  keyword: string
  device: string
  network: string
  gclid: string
  // Atribuição rica Meta/Google/TikTok — gap #1 do diagnóstico Vyat.
  // Quando o URL template canônico do Meta é usado (?account_id={{ad_account_id}}
  // &campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}&...),
  // esses campos chegam preenchidos e permitem o dashboard Vyat fazer split
  // de performance por campaign/adset/ad sem depender só do fbc/fbp.
  campaign_id: string
  campaign_name: string
  adset_id: string
  adset_name: string
  ad_id: string
  ad_name: string
  /** Nome do campo no body do POST /v1/pix/criar da Vyat é `ad_account_id`
   *  (conforme /docs/api/pix). Capturamos tanto `?account_id=` (template
   *  canônico Meta usa esse alias mais curto) quanto `?ad_account_id=`. */
  ad_account_id: string
  // Click IDs — persistidos pra atribuição em sessões longas além do cookie
  fbclid: string
  ttclid: string
}

const STORAGE_KEY = "acai-tropical-utms"
const TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 dias
const FBC_COOKIE_MAX_AGE = 90 * 24 * 60 * 60 // 90 dias — padrão Meta

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
  campaign_id: "",
  campaign_name: "",
  adset_id: "",
  adset_name: "",
  ad_id: "",
  ad_name: "",
  ad_account_id: "",
  fbclid: "",
  ttclid: "",
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
    campaign_id: params.get("campaign_id") ?? "",
    campaign_name: params.get("campaign_name") ?? "",
    adset_id: params.get("adset_id") ?? "",
    adset_name: params.get("adset_name") ?? "",
    ad_id: params.get("ad_id") ?? "",
    ad_name: params.get("ad_name") ?? "",
    // Aceita `account_id` (template canônico Meta) OU `ad_account_id` (nome real do campo Vyat)
    ad_account_id: params.get("account_id") ?? params.get("ad_account_id") ?? "",
    fbclid: params.get("fbclid") ?? "",
    ttclid: params.get("ttclid") ?? "",
  }
  const hasAny = Object.values(utms).some((v) => v !== "")
  return hasAny ? utms : null
}

/**
 * Fallback: se a URL tem ?fbclid= mas o cookie `_fbc` não existe (ad-blocker,
 * Brave Shields, ATT iOS, race condition no load do pixel.js), seta manualmente
 * no formato canônico do Meta `fb.1.{timestamp}.{fbclid}`. Sem isso, a CAPI
 * server-side da Vyat dispara Purchase sem a match key principal e match rate
 * Meta degrada 30-50%.
 *
 * SameSite=Lax permite navegação top-level (anúncio → site) mas não vaza
 * cross-site embed. Secure condicional ao protocolo — true em https://prod
 * pra hardening, omitido em http://localhost pra dev funcionar.
 */
function ensureFbcCookie(fbclid: string): void {
  if (typeof document === "undefined") return
  if (!fbclid) return
  const hasFbc = document.cookie.split("; ").some((c) => c.startsWith("_fbc="))
  if (hasFbc) return
  const value = `fb.1.${Date.now()}.${fbclid}`
  const secureFlag = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `_fbc=${value}; path=/; max-age=${FBC_COOKIE_MAX_AGE}; SameSite=Lax${secureFlag}`
}

/**
 * Captura UTMs + ad IDs + click IDs da URL atual e persiste em localStorage.
 * Chamar no primeiro pageview (em layout/top-level component).
 *
 * Política de overwrite: nova UTM sempre sobrescreve a anterior. Atribuição
 * "last-touch" — quem clicou no anúncio mais recente leva o crédito da venda.
 *
 * Bonus: se a URL tem ?fbclid= mas o cookie `_fbc` não foi setado pelo Pixel
 * Meta (ad-blocker, etc), seta manualmente no formato canônico — gap #2 do
 * diagnóstico Vyat.
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

  // Fallback fbclid → _fbc cookie pra garantir match key Meta mesmo sem Pixel rodando.
  ensureFbcCookie(fromUrl.fbclid)
}

/**
 * Lê UTMs salvas, com fallback pra URL atual (caso storage tenha falhado).
 * Sempre retorna um objeto — campos ausentes vêm como string vazia.
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
          campaign_id: parsed.campaign_id ?? "",
          campaign_name: parsed.campaign_name ?? "",
          adset_id: parsed.adset_id ?? "",
          adset_name: parsed.adset_name ?? "",
          ad_id: parsed.ad_id ?? "",
          ad_name: parsed.ad_name ?? "",
          ad_account_id: parsed.ad_account_id ?? "",
          fbclid: parsed.fbclid ?? "",
          ttclid: parsed.ttclid ?? "",
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
