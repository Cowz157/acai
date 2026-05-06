import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { sendPixExpiredEmail, sendPixNudgeEmail, type AbandonedOrderRow } from "@/lib/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CRON_SECRET = process.env.CRON_SECRET ?? ""

/**
 * Disparado por cron externo (ex: cron-job.org) a cada 5 min.
 *
 * Envia 2 tipos de email de recuperação pra PIX abandonado:
 *
 *   1. NUDGE (~10min após criar): PIX ainda válido, ainda pending. Envia código
 *      copia-cola direto no email pra cliente pagar sem voltar ao site.
 *   2. EXPIRED (após pix_expires_at): PIX morreu sem pagamento. Manda link
 *      pra /acompanhar onde o cliente pode regerar PIX em 1 clique.
 *
 * Restrições anti-flood:
 *   - Só considera pedidos das últimas 24h (não dispara em pedido stale)
 *   - Marca abandoned_nudge_sent_at / abandoned_expired_sent_at após enviar
 *     pra nunca duplicar
 *   - Limita 50 candidatos por execução (proteção contra rajada)
 *
 * Auth: header `x-cron-secret` deve bater com env CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("x-cron-secret")
  if (!CRON_SECRET || auth !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const now = new Date()
  const nowIso = now.toISOString()
  const tenMinAgoIso = new Date(now.getTime() - 10 * 60 * 1000).toISOString()
  const last24hIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  // ===================================================================
  // Stage 1: NUDGE — pendente, criou >=10min, PIX ainda válido
  // ===================================================================
  const nudgeQuery = await admin
    .from("orders")
    .select(
      "id, order_number, tracking_token, items, total, delivery, pix_codigo, pix_expires_at",
    )
    .eq("status", "pending")
    .lte("created_at", tenMinAgoIso)
    .gte("created_at", last24hIso)
    .gte("pix_expires_at", nowIso)
    .is("abandoned_nudge_sent_at", null)
    .limit(50)

  let nudgeSent = 0
  let nudgeFailed = 0
  if (nudgeQuery.data) {
    for (const order of nudgeQuery.data as AbandonedOrderRow[]) {
      const result = await sendPixNudgeEmail(order)
      if (result.ok) {
        await admin
          .from("orders")
          .update({ abandoned_nudge_sent_at: nowIso })
          .eq("id", order.id)
        nudgeSent++
      } else {
        nudgeFailed++
        // Mesmo skipped (sem email/sem código) marca pra não retentar — protege
        // contra loop infinito em pedido com dados incompletos.
        if (result.skipped) {
          await admin
            .from("orders")
            .update({ abandoned_nudge_sent_at: nowIso })
            .eq("id", order.id)
        }
      }
    }
  }

  // ===================================================================
  // Stage 2: EXPIRED — pendente, PIX já passou da expiration
  // ===================================================================
  const expiredQuery = await admin
    .from("orders")
    .select("id, order_number, tracking_token, items, total, delivery, pix_codigo, pix_expires_at")
    .eq("status", "pending")
    .gte("created_at", last24hIso)
    .lt("pix_expires_at", nowIso)
    .is("abandoned_expired_sent_at", null)
    .limit(50)

  let expiredSent = 0
  let expiredFailed = 0
  if (expiredQuery.data) {
    for (const order of expiredQuery.data as AbandonedOrderRow[]) {
      const result = await sendPixExpiredEmail(order)
      if (result.ok) {
        await admin
          .from("orders")
          .update({ abandoned_expired_sent_at: nowIso })
          .eq("id", order.id)
        expiredSent++
      } else {
        expiredFailed++
        if (result.skipped) {
          await admin
            .from("orders")
            .update({ abandoned_expired_sent_at: nowIso })
            .eq("id", order.id)
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: nowIso,
    nudge: { sent: nudgeSent, failed: nudgeFailed },
    expired: { sent: expiredSent, failed: expiredFailed },
  })
}
