import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Busca um pedido pelo `tracking_token` único, gerado no checkout e enviado
 * por email. Permite acompanhar pedido em qualquer dispositivo, sem depender
 * de localStorage. Server-side com service_role pra bypass RLS.
 *
 * GET /api/orders/by-token?token=xxx
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim()
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 })
  }

  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select("*")
    .eq("tracking_token", token)
    .maybeSingle()

  if (error) {
    console.error("[orders/by-token] erro:", error)
    return NextResponse.json({ error: "Erro ao buscar pedido" }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 })
  }

  return NextResponse.json({ order: data })
}
