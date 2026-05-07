import { NextResponse, type NextRequest } from "next/server"
import { generateCPF } from "@/lib/cpf"
import { sendRedeliveryEmail } from "@/lib/email"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { uuid } from "@/lib/uuid"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VYAT_KEY = process.env.NEXT_PUBLIC_VYAT_KEY ?? ""
const VYAT_BASE = process.env.NEXT_PUBLIC_VYAT_BASE_URL ?? "https://api.vyat.app"
const REDELIVERY_FEE = 12.5

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

interface VyatPixResponse {
  qrcode_url: string
  codigo_pix: string
  transaction_id: string
  vyat_transaction_id: string
  expires_at: string
  error?: string
}

/**
 * Cliente reportou que não recebeu e escolheu re-entrega. Gera novo PIX
 * de R$12,50 via Vyat, marca delivery_status='redelivery_pending', dispara
 * email com o código PIX.
 *
 * Auth: só checa que o pedido existe e está aprovado + in_transit. Mesmo
 * padrão do /cancel — order id é UUID, não dá pra brute force.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "ID do pedido obrigatório" }, { status: 400 })
  }
  if (!VYAT_KEY) {
    return NextResponse.json({ error: "Gateway não configurado" }, { status: 500 })
  }

  const admin = getSupabaseAdmin()

  const { data: order, error: findErr } = await admin
    .from("orders")
    .select(
      "id, order_number, tracking_token, status, delivery_status, items, total, delivery",
    )
    .eq("id", id)
    .maybeSingle()

  if (findErr) {
    console.error("[request-redelivery] erro buscando pedido:", findErr)
    return NextResponse.json({ error: "Erro ao buscar pedido" }, { status: 500 })
  }
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 })
  }
  if (order.status !== "approved") {
    return NextResponse.json(
      { error: "Pedido não está em estado válido pra re-entrega" },
      { status: 400 },
    )
  }
  if (order.delivery_status && order.delivery_status !== "in_transit") {
    return NextResponse.json(
      { error: "Esse pedido já está em outro fluxo de entrega" },
      { status: 409 },
    )
  }

  // Garante delivery.email — sem isso não dá pra mandar email nem cobrar
  const customerEmail = (order.delivery as { email?: string })?.email
  const customerName = (order.delivery as { fullName?: string })?.fullName
  if (!customerEmail || !customerName) {
    return NextResponse.json(
      { error: "Dados do cliente incompletos no pedido" },
      { status: 400 },
    )
  }

  // Gera PIX via Vyat
  const externalId = uuid()
  let pix: VyatPixResponse
  try {
    const vyatRes = await fetch(`${VYAT_BASE}/v1/pix/criar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": BROWSER_UA,
      },
      body: JSON.stringify({
        key: VYAT_KEY,
        valor: REDELIVERY_FEE,
        nome: customerName,
        email: customerEmail,
        cpf: generateCPF(),
        produto: `Açaí Tropical — Re-entrega Pedido #${order.order_number}`,
        external_id: externalId,
      }),
    })
    pix = (await vyatRes.json()) as VyatPixResponse
    if (!vyatRes.ok || !pix.codigo_pix) {
      console.error("[request-redelivery] Vyat retornou erro:", pix)
      return NextResponse.json(
        { error: pix.error ?? "Falha ao gerar PIX de re-entrega" },
        { status: 502 },
      )
    }
  } catch (err) {
    console.error("[request-redelivery] erro chamando Vyat:", err)
    return NextResponse.json({ error: "Falha de comunicação com gateway" }, { status: 502 })
  }

  const nowIso = new Date().toISOString()
  const expiresAtIso = pix.expires_at
  const vyatId = pix.vyat_transaction_id ?? pix.transaction_id ?? externalId

  const { error: updateErr } = await admin
    .from("orders")
    .update({
      delivery_status: "redelivery_pending",
      failure_reported_at: nowIso,
      redelivery_payment_id: vyatId,
      redelivery_codigo_pix: pix.codigo_pix,
      redelivery_expires_at: expiresAtIso,
    })
    .eq("id", id)

  if (updateErr) {
    console.error("[request-redelivery] erro atualizando pedido:", updateErr)
    return NextResponse.json({ error: "Erro ao registrar re-entrega" }, { status: 500 })
  }

  // Email — não bloqueia retorno se falhar, só loga
  void sendRedeliveryEmail(
    {
      id: order.id,
      order_number: order.order_number,
      tracking_token: order.tracking_token,
      total: order.total,
      delivery: order.delivery,
    },
    {
      codigoPix: pix.codigo_pix,
      expiresAtMs: new Date(expiresAtIso).getTime(),
      fee: REDELIVERY_FEE,
    },
  ).catch((err) => console.error("[request-redelivery] erro email:", err))

  return NextResponse.json({
    ok: true,
    pix: {
      codigoPix: pix.codigo_pix,
      expiresAt: expiresAtIso,
      vyatTransactionId: vyatId,
      fee: REDELIVERY_FEE,
    },
  })
}
