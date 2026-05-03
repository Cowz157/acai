import { NextResponse, type NextRequest } from "next/server"
import crypto from "node:crypto"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const WEBHOOK_SECRET = process.env.VYAT_WEBHOOK_SECRET ?? ""

interface WebhookEnvelope {
  event: string
  timestamp: string
  data: {
    external_id?: string
    gateway?: string
    amount?: number
    customer_name?: string | null
    customer_email?: string | null
    product_name?: string
    payment_method?: string
    status?: string
    previous_status?: string | null
    vyat_transaction_id?: string
    [extra: string]: unknown
  }
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"))
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // 1. Verificação HMAC (se secret configurado)
  if (WEBHOOK_SECRET) {
    const signature = request.headers.get("x-webhook-signature")
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 })
    }
    const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex")
    if (!timingSafeEqualHex(expected, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  // 2. Parse envelope
  let envelope: WebhookEnvelope
  try {
    envelope = JSON.parse(rawBody) as WebhookEnvelope
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { event, data } = envelope
  if (!event || !data) {
    return NextResponse.json({ error: "Invalid envelope" }, { status: 400 })
  }

  // 3. Identifica o pedido
  // external_id agora é o nosso UUID Supabase (passamos no /pix/criar).
  // vyat_transaction_id é o ID interno do Vyat — usado como fallback / pra registrar.
  const externalId = typeof data.external_id === "string" ? data.external_id : null
  const vyatTxId = typeof data.vyat_transaction_id === "string" ? data.vyat_transaction_id : null

  if (!externalId && !vyatTxId) {
    return NextResponse.json({ error: "Missing transaction id" }, { status: 400 })
  }

  // Match preferencial: id = external_id (UUID nosso). Fallback: gateway_transaction_id (orders legados).
  let order: { id: string; status: string } | null = null

  if (externalId) {
    // Tenta primeiro como UUID interno (caminho novo / preferido)
    const { data: byId } = await getSupabaseAdmin()
      .from("orders")
      .select("id, status")
      .eq("id", externalId)
      .maybeSingle()
    if (byId) order = byId

    // Fallback: orders criados antes da Fase 1 do Vyat usavam gateway_transaction_id = transaction_id
    if (!order) {
      const { data: byGateway } = await getSupabaseAdmin()
        .from("orders")
        .select("id, status")
        .eq("gateway_transaction_id", externalId)
        .maybeSingle()
      if (byGateway) order = byGateway
    }
  }

  // Último recurso: tenta vyat_transaction_id (caso external_id tenha sumido por algum motivo)
  if (!order && vyatTxId) {
    const { data: byVyatId } = await getSupabaseAdmin()
      .from("orders")
      .select("id, status")
      .eq("gateway_transaction_id", vyatTxId)
      .maybeSingle()
    if (byVyatId) order = byVyatId
  }

  if (!order) {
    // Pedido não encontrado. Vyat não retenta, retornamos 200 pra log limpo.
    return NextResponse.json({ ok: true, ignored: "order_not_found" })
  }

  // 4. Idempotência: só atualiza se ainda estiver pendente
  if (order.status !== "pending") {
    return NextResponse.json({ ok: true, idempotent: true, current_status: order.status })
  }

  // 5. Mapeia evento → novo status
  let newStatus: string | null = null
  let paidAt: string | null = null

  switch (event) {
    case "sale_approved":
      newStatus = "approved"
      paidAt = new Date().toISOString()
      break
    case "sale_refused":
      newStatus = "refused"
      break
    default:
      // Eventos não rastreados (clone_*) — apenas registramos
      return NextResponse.json({ ok: true, ignored: "unhandled_event", event })
  }

  // 6. Atualiza pedido — guarda também o vyat_transaction_id pra referência futura
  const { error: updateError } = await getSupabaseAdmin()
    .from("orders")
    .update({
      status: newStatus,
      paid_at: paidAt,
      gateway_event_raw: envelope,
      ...(vyatTxId ? { gateway_transaction_id: vyatTxId } : {}),
    })
    .eq("id", order.id)
    .eq("status", "pending") // guard contra race condition

  if (updateError) {
    console.error("[webhook/vyat] erro atualizando pedido:", updateError)
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, order_id: order.id, status: newStatus })
}
