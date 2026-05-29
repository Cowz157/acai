/**
 * Helpers server-side pra sistema de cupons.
 *
 * Fluxo:
 *   1. User digita código no step 3 (payment) do checkout
 *   2. UI chama POST /api/coupons/validate com { code, subtotal, email }
 *   3. validateCoupon() retorna { valid, discountBrl, error? }
 *   4. UI aplica desconto no total exibido (não no order ainda)
 *   5. Quando user gera PIX/conclui order, o checkout chama redeemCoupon()
 *      com order_id pra registrar uso em `coupon_redemptions` (audit + enforce)
 *
 * Regras de validação aplicadas em ordem:
 *   - Código existe (case-insensitive)
 *   - active = true
 *   - expires_at NULL OU futuro
 *   - subtotal >= min_subtotal_brl
 *   - max_uses NULL OU count(redemptions) < max_uses
 *   - max_uses_per_email NULL OU count(redemptions com mesmo email) < max_uses_per_email
 */

import { getSupabaseAdmin } from "./supabase-admin"

export interface CouponRow {
  id: string
  code: string
  discount_type: "percentage" | "fixed_brl"
  discount_value: number
  min_subtotal_brl: number
  max_uses: number | null
  max_uses_per_email: number | null
  expires_at: string | null
  active: boolean
  description: string | null
}

export interface ValidateCouponResult {
  valid: boolean
  /** Desconto em reais (já calculado, pronto pra subtrair do total). */
  discountBrl?: number
  /** Cupom validado — retornado pra UI mostrar info e pra checkout passar pro redeem depois. */
  coupon?: { id: string; code: string; discount_type: string; discount_value: number }
  /** Mensagem humana caso valid=false (ex: "Cupom expirado", "Pedido mínimo R$25"). */
  error?: string
}

/**
 * Calcula desconto em reais aplicado a um subtotal, baseado no tipo do cupom.
 * Trata corretamente cupons percentage e fixed_brl. Cap em subtotal pra não
 * gerar total negativo.
 */
function calculateDiscount(coupon: CouponRow, subtotal: number): number {
  let discount = 0
  if (coupon.discount_type === "percentage") {
    discount = (subtotal * coupon.discount_value) / 100
  } else if (coupon.discount_type === "fixed_brl") {
    discount = coupon.discount_value
  }
  // Arredonda pra 2 casas (Brasil usa 2 decimais sempre)
  discount = Math.round(discount * 100) / 100
  // Cap: nunca maior que subtotal (cupom não cria saldo negativo)
  if (discount > subtotal) discount = subtotal
  return discount
}

export async function validateCoupon(
  code: string,
  subtotal: number,
  email: string,
): Promise<ValidateCouponResult> {
  const normalized = code?.trim().toUpperCase()
  if (!normalized) return { valid: false, error: "Código vazio" }
  if (typeof subtotal !== "number" || subtotal <= 0) {
    return { valid: false, error: "Subtotal inválido" }
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("coupons")
    .select("*")
    .ilike("code", normalized)
    .eq("active", true)
    .maybeSingle<CouponRow>()

  if (error) {
    console.error(`[coupons/validate] supabase select falhou: ${error.message}`)
    return { valid: false, error: "Erro ao validar cupom. Tente novamente." }
  }
  if (!data) return { valid: false, error: "Cupom inválido ou expirado" }

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { valid: false, error: "Cupom expirado" }
  }

  if (subtotal < data.min_subtotal_brl) {
    return {
      valid: false,
      error: `Pedido mínimo de R$ ${data.min_subtotal_brl.toFixed(2).replace(".", ",")} pra usar esse cupom`,
    }
  }

  // Enforce max_uses global
  if (data.max_uses !== null) {
    const { count, error: countErr } = await admin
      .from("coupon_redemptions")
      .select("*", { count: "exact", head: true })
      .eq("coupon_id", data.id)
    if (countErr) {
      console.error(`[coupons/validate] count global falhou: ${countErr.message}`)
      return { valid: false, error: "Erro ao validar cupom. Tente novamente." }
    }
    if ((count ?? 0) >= data.max_uses) {
      return { valid: false, error: "Cupom esgotado" }
    }
  }

  // Enforce max_uses_per_email
  const normalizedEmail = email?.trim().toLowerCase()
  if (data.max_uses_per_email !== null && normalizedEmail) {
    const { count, error: countErr } = await admin
      .from("coupon_redemptions")
      .select("*", { count: "exact", head: true })
      .eq("coupon_id", data.id)
      .ilike("customer_email", normalizedEmail)
    if (countErr) {
      console.error(`[coupons/validate] count per email falhou: ${countErr.message}`)
      return { valid: false, error: "Erro ao validar cupom. Tente novamente." }
    }
    if ((count ?? 0) >= data.max_uses_per_email) {
      return { valid: false, error: "Você já usou esse cupom" }
    }
  }

  const discountBrl = calculateDiscount(data, subtotal)

  return {
    valid: true,
    discountBrl,
    coupon: {
      id: data.id,
      code: data.code,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
    },
  }
}

/**
 * Registra uso do cupom (INSERT em coupon_redemptions) — chamado pelo
 * checkout server-side ao criar o order. Idempotente via combinação
 * unique de (coupon_id, order_id) seria ideal mas não tem constraint —
 * cuidado pra não chamar 2x pro mesmo order. Como checkout só cria
 * order 1x via /api/orders/create, fica OK na prática.
 */
export async function redeemCoupon(input: {
  couponId: string
  orderId: string
  customerEmail: string
  discountApplied: number
}): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseAdmin()
  const { error } = await admin.from("coupon_redemptions").insert({
    coupon_id: input.couponId,
    order_id: input.orderId,
    customer_email: input.customerEmail.trim().toLowerCase(),
    discount_applied_brl: input.discountApplied,
  })

  if (error) {
    console.error(`[coupons/redeem] insert falhou: ${error.message}`)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
