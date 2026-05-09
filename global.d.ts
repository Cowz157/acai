/**
 * Tipos globais do projeto.
 *
 * window.dataLayer: array do Google Tag Manager. Inicializado pelo container
 * GTM-TG2JZG27 em app/layout.tsx, e usado em lib/payment-tracker.ts pra
 * pushar eventos de conversão (purchase) que disparam tags no GTM.
 */
export {}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
  }
}
