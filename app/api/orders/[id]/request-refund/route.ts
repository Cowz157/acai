import { NextResponse, type NextRequest } from "next/server"
import { sendRefundRequestedEmail } from "@/lib/email"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Cliente reportou que não recebeu e escolheu reembolso. Marca o pedido
 * como refund_requested. Admin processa manualmente o estorno via gateway
 * e depois marca refund_processed (fora do scope dessa rota).
 *
 * Auth: mesmo padrão do /cancel — order id é UUID.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "ID do pedido obrigatório" }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { data: order, error: findErr } = await admin
    .from("orders")
    .select("id, order_number, tracking_token, status, delivery_status, total, delivery")
    .eq("id", id)
    .maybeSingle()

  if (findErr) {
    console.error("[request-refund] erro buscando pedido:", findErr)
    return NextResponse.json({ error: "Erro ao buscar pedido" }, { status: 500 })
  }
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 })
  }
  if (order.status !== "approved") {
    return NextResponse.json(
      { error: "Pedido não está em estado válido pra reembolso" },
      { status: 400 },
    )
  }
  if (order.delivery_status && order.delivery_status !== "in_transit") {
    return NextResponse.json(
      { error: "Esse pedido já está em outro fluxo de entrega" },
      { status: 409 },
    )
  }

  const nowIso = new Date().toISOString()
  const { error: updateErr } = await admin
    .from("orders")
    .update({
      delivery_status: "refund_requested",
      failure_reported_at: nowIso,
    })
    .eq("id", id)

  if (updateErr) {
    console.error("[request-refund] erro atualizando pedido:", updateErr)
    return NextResponse.json({ error: "Erro ao registrar reembolso" }, { status: 500 })
  }

  void sendRefundRequestedEmail({
    id: order.id,
    order_number: order.order_number,
    tracking_token: order.tracking_token,
    total: order.total,
    delivery: order.delivery,
  }).catch((err) => console.error("[request-refund] erro email:", err))

  return NextResponse.json({ ok: true })
}
