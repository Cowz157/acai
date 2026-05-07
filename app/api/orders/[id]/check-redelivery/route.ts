import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VYAT_KEY = process.env.NEXT_PUBLIC_VYAT_KEY ?? ""
const VYAT_BASE = process.env.NEXT_PUBLIC_VYAT_BASE_URL ?? "https://api.vyat.app"

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

interface VyatStatusResponse {
  status?: "pending" | "approved" | "refunded" | "chargeback"
  error?: string
}

/**
 * Verifica status do PIX de re-entrega no gateway. Se aprovado, marca o
 * pedido como redelivery_paid no Supabase. Disparado pelo botão
 * "Já paguei, verificar agora" no DeliveryFailureCard.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })
  }
  if (!VYAT_KEY) {
    return NextResponse.json({ error: "Gateway não configurado" }, { status: 500 })
  }

  const admin = getSupabaseAdmin()

  const { data: order, error: findErr } = await admin
    .from("orders")
    .select("id, delivery_status, redelivery_payment_id")
    .eq("id", id)
    .maybeSingle()

  if (findErr) {
    console.error("[check-redelivery] erro:", findErr)
    return NextResponse.json({ error: "Erro ao buscar pedido" }, { status: 500 })
  }
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 })
  }

  // Já passou pra paid em outra request — idempotente, retorna ok
  if (order.delivery_status === "redelivery_paid") {
    return NextResponse.json({ ok: true, status: "redelivery_paid" })
  }
  if (order.delivery_status !== "redelivery_pending") {
    return NextResponse.json(
      { error: "Pedido não está aguardando re-entrega" },
      { status: 409 },
    )
  }
  if (!order.redelivery_payment_id) {
    return NextResponse.json({ error: "ID de PIX de re-entrega ausente" }, { status: 500 })
  }

  // Consulta Vyat
  const url = `${VYAT_BASE}/v1/pix/status?transaction_id=${encodeURIComponent(order.redelivery_payment_id)}&key=${VYAT_KEY}`
  let vyat: VyatStatusResponse
  try {
    const res = await fetch(url, { headers: { "User-Agent": BROWSER_UA } })
    vyat = (await res.json()) as VyatStatusResponse
  } catch (err) {
    console.error("[check-redelivery] erro Vyat:", err)
    return NextResponse.json({ error: "Falha de comunicação com gateway" }, { status: 502 })
  }

  if (vyat.status === "approved") {
    const { error: updateErr } = await admin
      .from("orders")
      .update({ delivery_status: "redelivery_paid" })
      .eq("id", id)
      .eq("delivery_status", "redelivery_pending") // guard race condition

    if (updateErr) {
      console.error("[check-redelivery] erro update:", updateErr)
      return NextResponse.json({ error: "Erro ao confirmar re-entrega" }, { status: 500 })
    }
    return NextResponse.json({ ok: true, status: "redelivery_paid" })
  }

  return NextResponse.json({ ok: true, status: "redelivery_pending" })
}
