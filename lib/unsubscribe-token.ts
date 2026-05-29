/**
 * HMAC-based unsubscribe tokens pra emails de marketing (lead recovery).
 *
 * Token é hash truncado HMAC-SHA256 do email com UNSUBSCRIBE_SECRET — sem
 * isso, qualquer um descobrindo o endpoint poderia desinscrever leads
 * alheios em massa. Length 16 chars é colisão-resistente o suficiente pra
 * esse caso de uso (não é credencial de auth).
 *
 * Importado tanto por:
 *   - app/api/leads/unsubscribe/route.ts (valida token no GET/POST)
 *   - lib/email.ts (gera URLs com token válido nos rodapés)
 */

import { createHmac } from "crypto"

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET ?? "fallback-change-me"

export function unsubscribeToken(email: string): string {
  return createHmac("sha256", UNSUBSCRIBE_SECRET)
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16)
}

export function buildUnsubscribeUrl(email: string, baseUrl: string): string {
  const token = unsubscribeToken(email)
  const url = new URL(`${baseUrl}/api/leads/unsubscribe`)
  url.searchParams.set("email", email.trim().toLowerCase())
  url.searchParams.set("token", token)
  return url.toString()
}
