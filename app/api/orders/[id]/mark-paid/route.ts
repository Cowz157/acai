import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Marca pedido como aprovado server-side quando o polling client-side
 * detecta status approved no gateway. Atualiza status='approved' + paid_at.
 *
 * Sem isso, o Supabase fica com status='pending' indefinidamente após o
 * PIX pago, com 2 consequências:
 *
 *   1. Cron de abandonment (/api/cron/abandoned-pix) envia email "você
 *      esqueceu de pagar" pra cliente que já pagou — UX terrível.
 *   2. Histórico de pedidos do usuário em /conta mostra status errado.
 *
 * Idempotente: se já está approved, retorna 200 sem refazer.
 * Race-safe: o UPDATE tem guard `eq status 'pending'`.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "ID do pedido é obrigatório" }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { data: order, error: findErr } = await admin
    .from("orders")
    .select("id, status")
    .eq("id", id)
    .maybeSingle()

  if (findErr) {
    console.error("[orders/mark-paid] erro buscando pedido:", findErr)
    return NextResponse.json({ error: "Erro ao buscar pedido" }, { status: 500 })
  }
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 })
  }

  // Idempotente — segunda call por algum retry retorna ok
  if (order.status === "approved") {
    return NextResponse.json({ ok: true, status: "approved" })
  }

  // Só atualiza se ainda está pendente (não toca em refused/cancelled/etc)
  if (order.status !== "pending") {
    return NextResponse.json(
      { error: "Pedido em estado não-aprovável", current_status: order.status },
      { status: 409 },
    )
  }

  const nowIso = new Date().toISOString()
  const { error: updateErr } = await admin
    .from("orders")
    .update({
      status: "approved",
      paid_at: nowIso,
    })
    .eq("id", id)
    .eq("status", "pending") // guard race condition

  if (updateErr) {
    console.error("[orders/mark-paid] erro update:", updateErr)
    return NextResponse.json({ error: "Erro ao marcar como pago" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: "approved" })
}
