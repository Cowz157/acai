import { NextResponse, type NextRequest } from "next/server"
import { sendOrderConfirmationByOrderId } from "@/lib/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface SendBody {
  orderId?: string
}

/**
 * Carrega pedido do Supabase e dispara email de confirmação via Resend.
 * Chamado pelo checkout no client (cash/card). Para PIX, o webhook do Vyat
 * dispara direto via `sendOrderConfirmationByOrderId`.
 */
export async function POST(request: NextRequest) {
  let body: SendBody
  try {
    body = (await request.json()) as SendBody
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const orderId = body.orderId?.trim()
  if (!orderId) {
    return NextResponse.json({ error: "orderId obrigatório" }, { status: 400 })
  }

  const result = await sendOrderConfirmationByOrderId(orderId)
  if (!result.ok) {
    return NextResponse.json(result, { status: result.error === "Pedido não encontrado" ? 404 : 500 })
  }
  return NextResponse.json(result)
}
