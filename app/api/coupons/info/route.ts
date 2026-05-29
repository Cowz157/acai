import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Info pública de cupom — usado pelos componentes visuais (CouponWelcomeModal,
 * ProductCard com preço com desconto, banner) pra mostrar "20% OFF" sem
 * conhecer a regra de cada cupom hardcoded.
 *
 * Diferente do /api/coupons/validate:
 *   - NÃO checa max_uses (global)
 *   - NÃO checa max_uses_per_email
 *   - NÃO precisa de email
 *   - Só retorna info "estática" do cupom
 *
 * Permite mostrar desconto antes do user chegar no checkout. Validação real
 * (com email, regras de uso) acontece em /api/coupons/validate quando aplica.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim().toUpperCase()
  if (!code) {
    return NextResponse.json({ valid: false, error: "code obrigatório" }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("coupons")
    .select("code, discount_type, discount_value, min_subtotal_brl, expires_at, active")
    .ilike("code", code)
    .eq("active", true)
    .maybeSingle()

  if (error) {
    console.error(`[coupons/info] supabase select falhou: ${error.message}`)
    return NextResponse.json({ valid: false, error: "Erro ao buscar cupom" }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ valid: false, error: "Cupom não encontrado" }, { status: 200 })
  }

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ valid: false, error: "Cupom expirado" }, { status: 200 })
  }

  return NextResponse.json({
    valid: true,
    code: data.code,
    discount_type: data.discount_type,
    discount_value: Number(data.discount_value),
    min_subtotal_brl: Number(data.min_subtotal_brl),
  })
}
