import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

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
  delivery?: unknown
  payment?: unknown
  pix_qrcode_url?: string | null
  pix_codigo?: string | null
  pix_expires_at?: string | null
}

/**
 * Persiste o pedido no Supabase server-side. Substitui a INSERT direta do
 * client (supabase-js anon) que era frequentemente bloqueada por extensões
 * de browser (Brave Shields, uBlock agressivo) tratando *.supabase.co como
 * tracker de terceiro.
 *
 * O client agora chama essa rota same-origin (anoteii.shop/api/orders/create)
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

  const { error } = await getSupabaseAdmin().from("orders").insert(body)

  if (error) {
    console.error("[orders/create] erro inserindo pedido:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
