import { NextResponse, type NextRequest } from "next/server"
import { validateCoupon } from "@/lib/coupons"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface ValidateBody {
  code?: string
  subtotal?: number
  email?: string
}

/**
 * Endpoint de validação de cupom — chamado pelo checkout step 3 (payment)
 * quando user digita código + clica "Aplicar".
 *
 * Retorna:
 *   { valid: true, discountBrl: 5.00, coupon: { id, code, ... } }
 *   { valid: false, error: "Cupom expirado" }
 *
 * Validação real do USO acontece em outro lugar (redeemCoupon no save do
 * order) — esse endpoint só pré-valida pra UI mostrar desconto antes da
 * conclusão. Se algo mudar entre validate e redeem (ex: cupom esgotar),
 * redeemCoupon falha graciosamente e o order ainda é salvo.
 */
export async function POST(request: NextRequest) {
  let body: ValidateBody
  try {
    body = (await request.json()) as ValidateBody
  } catch {
    return NextResponse.json({ valid: false, error: "Body inválido" }, { status: 400 })
  }

  if (!body.code || typeof body.subtotal !== "number" || !body.email) {
    return NextResponse.json(
      { valid: false, error: "code, subtotal e email são obrigatórios" },
      { status: 400 },
    )
  }

  const result = await validateCoupon(body.code, body.subtotal, body.email)
  return NextResponse.json(result)
}
