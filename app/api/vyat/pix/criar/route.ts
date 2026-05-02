import { NextResponse, type NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VYAT_KEY = process.env.NEXT_PUBLIC_VYAT_KEY ?? ""
const VYAT_BASE = process.env.NEXT_PUBLIC_VYAT_BASE_URL ?? "https://api.vyat.app"

/**
 * Proxy server-side pra POST /v1/pix/criar do Vyat.
 * Resolve CORS (browser → server local → Vyat) e centraliza a key no servidor.
 *
 * Aceita o mesmo body que o Vyat espera + repassa o header `Idempotency-Key` se vier.
 */
export async function POST(request: NextRequest) {
  if (!VYAT_KEY) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_VYAT_KEY não configurada no servidor", error_code: "INTERNAL_ERROR", retryable: false },
      { status: 500 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { error: "Body JSON inválido", error_code: "VALIDATION_ERROR", retryable: false },
      { status: 400 },
    )
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const idempotencyKey = request.headers.get("idempotency-key")
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey

  try {
    const upstream = await fetch(`${VYAT_BASE}/v1/pix/criar`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...body,
        key: VYAT_KEY, // garante que a key está sempre presente
      }),
    })

    const text = await upstream.text()
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    })
  } catch (err) {
    console.error("[proxy/vyat/pix/criar] erro upstream:", err)
    return NextResponse.json(
      { error: "Falha de comunicação com o gateway", error_code: "GATEWAY_ERROR", retryable: true },
      { status: 502 },
    )
  }
}
