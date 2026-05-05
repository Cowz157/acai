import { NextResponse, type NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VYAT_KEY = process.env.NEXT_PUBLIC_VYAT_KEY ?? ""
const VYAT_BASE = process.env.NEXT_PUBLIC_VYAT_BASE_URL ?? "https://api.vyat.app"

/**
 * UA de browser real pra reduzir falsos positivos do Cloudflare Managed Challenge.
 * Workaround temporário até a config Cloudflare da Vyat ser ajustada.
 */
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/**
 * Proxy server-side pra GET /v1/pix/status do Vyat.
 * Cliente chama /api/vyat/pix/status?transaction_id=xxx — server adiciona a key e proxia.
 */
export async function GET(request: NextRequest) {
  if (!VYAT_KEY) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_VYAT_KEY não configurada no servidor" },
      { status: 500 },
    )
  }

  const transactionId = request.nextUrl.searchParams.get("transaction_id")
  if (!transactionId) {
    return NextResponse.json({ error: "transaction_id é obrigatório" }, { status: 400 })
  }

  const url = `${VYAT_BASE}/v1/pix/status?transaction_id=${encodeURIComponent(transactionId)}&key=${VYAT_KEY}`

  try {
    const upstream = await fetch(url, { headers: { "User-Agent": BROWSER_UA } })
    const text = await upstream.text()
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    })
  } catch (err) {
    console.error("[proxy/vyat/pix/status] erro upstream:", err)
    return NextResponse.json({ error: "Falha de comunicação com o gateway" }, { status: 502 })
  }
}
