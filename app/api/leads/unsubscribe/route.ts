import { NextResponse, type NextRequest } from "next/server"
import { markLeadOptedOut } from "@/lib/leads"
import { unsubscribeToken } from "@/lib/unsubscribe-token"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Unsubscribe endpoint — usado pelo link no rodapé dos emails de recovery.
 * Aceita ambos GET (link clicável direto do email) e POST (form/AJAX).
 *
 * GET /api/leads/unsubscribe?email=foo@bar.com&token=<hmac>
 * — retorna HTML simples confirmando opt-out
 *
 * POST /api/leads/unsubscribe { email, token }
 * — retorna JSON { ok }
 *
 * Token (em lib/unsubscribe-token.ts) é validação leve pra evitar abuso.
 */

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase()
  const token = request.nextUrl.searchParams.get("token")
  if (!email || !token) {
    return new NextResponse("Link inválido", { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } })
  }
  if (token !== unsubscribeToken(email)) {
    return new NextResponse("Link inválido ou expirado", { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } })
  }

  const result = await markLeadOptedOut(email)
  if (!result.ok) {
    return new NextResponse("Erro ao processar. Tente novamente.", {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }

  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>Inscrição cancelada</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{font-family:system-ui,sans-serif;padding:40px 20px;text-align:center;color:#333;max-width:480px;margin:0 auto;}
    h1{color:#6b21a8;}p{line-height:1.5;}a{color:#6b21a8;}</style></head>
    <body><h1>Pronto! 💜</h1>
    <p>Você não vai mais receber emails do <strong>Açaí Paraíso</strong>.</p>
    <p>Se mudar de ideia, volta em <a href="https://acai.pedii.shop">acai.pedii.shop</a> e faça um pedido — automaticamente reativa.</p>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  )
}

export async function POST(request: NextRequest) {
  let body: { email?: string; token?: string }
  try {
    body = (await request.json()) as { email?: string; token?: string }
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }
  const email = body.email?.trim().toLowerCase()
  const token = body.token
  if (!email || !token) return NextResponse.json({ error: "email e token obrigatórios" }, { status: 400 })
  if (token !== unsubscribeToken(email)) return NextResponse.json({ error: "Token inválido" }, { status: 403 })

  const result = await markLeadOptedOut(email)
  if (!result.ok) return NextResponse.json(result, { status: 500 })
  return NextResponse.json({ ok: true })
}

