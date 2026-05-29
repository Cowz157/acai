import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { redeemCoupon } from "@/lib/coupons"
import { markLeadConverted } from "@/lib/leads"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface CreateOrderBody {
  id?: string
  order_number?: string
  user_id?: string | null
  status?: string
  paid_at?: string | null
  gateway_transaction_id?: string | null
  tracking_token?: string | null
  created_at?: string
  eta_minutes?: number
  items?: unknown
  total?: number
  delivery?: { email?: string; [k: string]: unknown }
  payment?: unknown
  pix_qrcode_url?: string | null
  pix_codigo?: string | null
  pix_expires_at?: string | null
  gift?: unknown
  donation_amount?: number
  // Metadata de cupom — processada server-side (redeem em coupon_redemptions)
  // e descartada antes do INSERT em orders (tabela não tem essas colunas).
  coupon_id?: string | null
  coupon_code?: string | null
  coupon_discount?: number | null
}

/**
 * Persiste o pedido no Supabase server-side. Substitui a INSERT direta do
 * client (supabase-js anon) que era frequentemente bloqueada por extensões
 * de browser (Brave Shields, uBlock agressivo) tratando *.supabase.co como
 * tracker de terceiro.
 *
 * O client agora chama essa rota same-origin (pedii.shop/api/orders/create)
 * que é first-party — não cai em listas de bloqueio. Insert real roda no
 * servidor com service_role.
 */
export async function POST(request: NextRequest) {
  let body: CreateOrderBody
  try {
    body = (await request.json()) as CreateOrderBody
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 })
  }

  // Validação mínima dos campos obrigatórios
  const missing: string[] = []
  if (!body.id) missing.push("id")
  if (!body.order_number) missing.push("order_number")
  if (typeof body.eta_minutes !== "number") missing.push("eta_minutes")
  if (!body.items) missing.push("items")
  if (typeof body.total !== "number") missing.push("total")
  if (!body.delivery) missing.push("delivery")
  if (!body.payment) missing.push("payment")
  if (!body.created_at) missing.push("created_at")

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Campos obrigatórios faltando: ${missing.join(", ")}` },
      { status: 400 },
    )
  }

  // Extrai metadata de cupom e lead — não persistir como coluna em `orders`
  // (tabela não tem essas colunas; redeemCoupon registra em
  // coupon_redemptions, markLeadConverted atualiza leads.converted_at).
  const couponId = body.coupon_id ?? null
  const couponDiscount = body.coupon_discount ?? null
  const customerEmail = body.delivery?.email ?? null

  const insertPayload = { ...body }
  delete insertPayload.coupon_id
  delete insertPayload.coupon_code
  delete insertPayload.coupon_discount

  const { error } = await getSupabaseAdmin().from("orders").insert(insertPayload)

  if (error) {
    console.error("[orders/create] erro inserindo pedido:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Pós-insert: redeem do cupom + marcar lead como convertido. Não bloqueia
  // resposta (mas faz await pra capturar erros no log Railway). Se falharem,
  // o order já foi salvo — overhead é só não-registrar uso de cupom (cliente
  // pode reusar 1x extra) ou continuar mandando email de recovery (no-op
  // depois que ele já comprou).
  if (couponId && customerEmail && typeof couponDiscount === "number") {
    const result = await redeemCoupon({
      couponId,
      orderId: body.id!,
      customerEmail,
      discountApplied: couponDiscount,
    })
    if (!result.ok) {
      console.error(`[orders/create] redeemCoupon falhou: orderId=${body.id} error=${result.error}`)
    }
  }

  if (customerEmail) {
    await markLeadConverted(customerEmail)
  }

  return NextResponse.json({ ok: true })
}
