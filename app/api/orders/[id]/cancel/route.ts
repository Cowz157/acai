import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Cancela um pedido pendente. Usa service_role pra bypassar RLS — necessário
 * porque o cliente (especialmente anônimo) não tem UPDATE policy em `orders`.
 *
 * Regras:
 *   - Só cancela se status atual for 'pending'. Se já estiver 'approved',
 *     'refused', etc, retorna 409 sem mudar nada.
 *   - Não chama Vyat pra invalidar o PIX. O PIX continua válido até expirar
 *     no gateway, mas se o cliente acabar pagando depois do cancelamento,
 *     o webhook handler ignora (status já não é 'pending').
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "ID do pedido é obrigatório" }, { status: 400 })
  }

  // Confirma que existe e está pendente antes de cancelar
  const { data: order, error: findErr } = await getSupabaseAdmin()
    .from("orders")
    .select("id, status")
    .eq("id", id)
    .maybeSingle()

  if (findErr) {
    console.error("[orders/cancel] erro buscando pedido:", findErr)
    return NextResponse.json({ error: "Erro ao buscar pedido" }, { status: 500 })
  }
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 })
  }
  if (order.status !== "pending") {
    return NextResponse.json(
      { error: "Esse pedido não pode mais ser cancelado", current_status: order.status },
      { status: 409 },
    )
  }

  const { error: updateErr } = await getSupabaseAdmin()
    .from("orders")
    .update({
      status: "cancelled",
      gateway_event_raw: { cancelled_at: new Date().toISOString(), source: "client" },
    })
    .eq("id", id)
    .eq("status", "pending") // guard de race condition

  if (updateErr) {
    console.error("[orders/cancel] erro cancelando pedido:", updateErr)
    return NextResponse.json({ error: "Erro ao cancelar pedido" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
