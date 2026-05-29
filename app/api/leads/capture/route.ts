import { NextResponse, type NextRequest } from "next/server"
import { captureLead } from "@/lib/leads"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface CaptureBody {
  email?: string
  fullName?: string
  phone?: string
  utmSource?: string
  utmCampaign?: string
}

/**
 * Endpoint de captura de lead — chamado fire-and-forget pelo checkout
 * quando user submete o step 1 (identification) MAS antes de gerar PIX.
 *
 * Não bloqueia o fluxo do user: client-side faz fetch sem await crítico.
 * Se falhar, lead é perdido mas user não é impactado.
 */
export async function POST(request: NextRequest) {
  let body: CaptureBody
  try {
    body = (await request.json()) as CaptureBody
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  if (!body.email) {
    return NextResponse.json({ error: "email obrigatório" }, { status: 400 })
  }

  const result = await captureLead({
    email: body.email,
    fullName: body.fullName,
    phone: body.phone,
    utmSource: body.utmSource,
    utmCampaign: body.utmCampaign,
  })

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 })
  }
  return NextResponse.json(result)
}
