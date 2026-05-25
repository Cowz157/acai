/**
 * Tipos globais do projeto.
 *
 * window.dataLayer: array do Google Tag Manager. Inicializado pelo container
 * GTM-WVTNHC4M em app/layout.tsx, e usado em lib/payment-tracker.ts pra
 * pushar eventos de conversão (purchase) que disparam tags no GTM.
 *
 * window.tpTrack: API pública do pixel.js da Vyat (cdn.vyat.app/scripts/pixel.js).
 * Dispara eventos no Meta Pixel + TikTok Pixel com fila interna que cobre chamadas
 * feitas antes do fbq carregar. Eventos suportados: Lead, AddToCart,
 * InitiateCheckout, Purchase. Passar `eventID` como `data._eventID` é a forma de
 * dedupar com a CAPI server-side da Vyat (que usa `external_id` do PIX como event_id).
 */
export {}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
    tpTrack?: (eventName: string, data?: Record<string, unknown>) => void
  }
}
