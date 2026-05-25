import { NextResponse, type NextRequest } from "next/server"
import { hashSha256, normalizePhone } from "@/lib/meta-capi"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PIXEL_ID = process.env.META_PIXEL_ID ?? ""
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN ?? ""
// Opcional — quando setado, envia o evento marcado pra fila "Test Events" do Meta
// Events Manager (não conta como conversão real). Útil pra validar a integração
// antes de remover. Setar via env var temporária no Railway durante o teste.
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE

interface CapiRequestBody {
  event_name: "Purchase" | "InitiateCheckout" | "AddToCart" | "ViewContent"
  /** UUID estável pra dedup com o Pixel client-side. Usar o mesmo ID que vai no dataLayer.push. */
  event_id: string
  event_time?: number
  event_source_url?: string
  user_data: {
    email?: string
    phone?: string
    fullName?: string
    /** Cookie _fbp lido do client. */
    fbp?: string
    /** Cookie _fbc lido do client (presente quando o usuário chegou via ?fbclid=). */
    fbc?: string
  }
  custom_data: {
    value: number
    currency: string
    content_ids?: string[]
  }
}

/**
 * Proxy server-side pra Meta Conversions API.
 *
 * Recebe um evento (Purchase, InitiateCheckout, etc) do client com dados do pedido,
 * hasheia PII (email/phone/nome) com SHA-256 pra Advanced Matching, junta com IP+UA
 * do request, e envia pra Meta Graph API.
 *
 * Dedup com Pixel: o `event_id` aqui DEVE ser o mesmo do `eventID` que o Pixel
 * disparou client-side — senão Meta conta a mesma conversão 2x.
 */
export async function POST(request: NextRequest) {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.warn("[meta/capi] config ausente — META_PIXEL_ID ou META_CAPI_ACCESS_TOKEN não setadas")
    return NextResponse.json({ skipped: true, reason: "config-missing" }, { status: 200 })
  }

  let body: CapiRequestBody
  try {
    body = (await request.json()) as CapiRequestBody
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 })
  }

  const forwardedFor = request.headers.get("x-forwarded-for") ?? ""
  const clientIp = forwardedFor.split(",")[0].trim() || request.headers.get("x-real-ip") || ""
  const userAgent = request.headers.get("user-agent") ?? ""

  const emailHash = hashSha256(body.user_data.email)
  const phoneNormalized = normalizePhone(body.user_data.phone)
  const phoneHash = hashSha256(phoneNormalized)
  const firstName = body.user_data.fullName?.trim().split(/\s+/)[0]
  const firstNameHash = hashSha256(firstName)

  const userData: Record<string, unknown> = {}
  if (clientIp) userData.client_ip_address = clientIp
  if (userAgent) userData.client_user_agent = userAgent
  if (emailHash) userData.em = [emailHash]
  if (phoneHash) userData.ph = [phoneHash]
  if (firstNameHash) userData.fn = [firstNameHash]
  if (body.user_data.fbp) userData.fbp = body.user_data.fbp
  if (body.user_data.fbc) userData.fbc = body.user_data.fbc

  const customData: Record<string, unknown> = {
    currency: body.custom_data.currency,
    value: body.custom_data.value,
  }
  if (body.custom_data.content_ids && body.custom_data.content_ids.length > 0) {
    customData.content_type = "product"
    customData.content_ids = body.custom_data.content_ids
  }

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: body.event_name,
        event_time: body.event_time ?? Math.floor(Date.now() / 1000),
        event_id: body.event_id,
        ...(body.event_source_url ? { event_source_url: body.event_source_url } : {}),
        action_source: "website",
        user_data: userData,
        custom_data: customData,
      },
    ],
  }
  if (TEST_EVENT_CODE) payload.test_event_code = TEST_EVENT_CODE

  try {
    const url = `https://graph.facebook.com/v18.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const text = await upstream.text()
    if (!upstream.ok) {
      console.error("[meta/capi] Meta retornou erro:", {
        status: upstream.status,
        event: body.event_name,
        event_id: body.event_id,
        body: text.slice(0, 500),
      })
      return NextResponse.json({ error: "Meta CAPI falhou", details: text.slice(0, 200) }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[meta/capi] fetch falhou:", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Falha de comunicação com Meta" }, { status: 502 })
  }
}
