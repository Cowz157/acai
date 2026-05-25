/**
 * Helpers pra Meta Conversions API (CAPI).
 *
 * Meta exige PII (email/phone/nome) com SHA-256 lowercase trimmed, sem caracteres
 * especiais — esse arquivo centraliza essa normalização pra reuso server-side.
 *
 * Doc oficial: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
 */

import { createHash } from "crypto"

/**
 * Hash SHA-256 lowercase trimmed (formato exigido pela Meta CAPI pra Advanced Matching).
 * Retorna null se input vazio — Meta ignora chaves ausentes mas reclama de strings vazias hasheadas.
 */
export function hashSha256(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  return createHash("sha256").update(normalized).digest("hex")
}

/**
 * Normaliza telefone BR pra E.164 sem +: só dígitos, prefixo "55" se vier sem ele.
 * Aceita "(11) 98765-4321", "11987654321", "+5511987654321", etc.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, "")
  if (!digits) return null
  if (digits.length === 10 || digits.length === 11) return "55" + digits
  return digits
}
