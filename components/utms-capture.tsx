"use client"

import { useEffect } from "react"
import { captureCouponFromUrl } from "@/lib/coupon-url"
import { captureUtmsFromUrl } from "@/lib/utms"

/**
 * Roda no primeiro pageview e persiste em localStorage:
 *   - UTMs da URL (utm_source/medium/campaign/etc + ad IDs Meta/Google/TikTok
 *     + click IDs) por 30 dias — pra atribuição last-touch quando user
 *     converte dias depois sem trazer query string de novo
 *   - Cupom da URL (?cupom=ACAI20 ou ?coupon=ACAI20) por 7 dias — pra
 *     que o auto-apply no checkout funcione mesmo quando user navega pra
 *     /produto/[slug] ou /checkout e perde a query string original
 *
 * Mountar uma vez em `app/layout.tsx`.
 */
export function UtmsCapture(): null {
  useEffect(() => {
    captureUtmsFromUrl()
    captureCouponFromUrl()
  }, [])
  return null
}
