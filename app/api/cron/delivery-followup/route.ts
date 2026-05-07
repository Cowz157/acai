import { NextResponse, type NextRequest } from "next/server"
import { sendDeliveryFollowupByOrderId } from "@/lib/email"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CRON_SECRET = process.env.CRON_SECRET ?? ""

/** Buffer extra após o ETA antes de mandar email. ETA é estimativa, não prazo. */
const BUFFER_MIN = 15
/** Limite de pedidos por execução pra evitar rajada de emails se o cron atrasar. */
const BATCH_LIMIT = 50
/**
 * Pedido com paid_at mais antigo que isso é considerado "stale" — provavelmente
 * já foi entregue há horas e o cron caiu antes de mandar email. Pra esses,
 * marca como sent sem mandar email pra não despertar cliente que esqueceu do pedido.
 */
const STALE_HOURS = 6

interface PendingFollowupRow {
  id: string
  paid_at: string
  eta_minutes: number
}

/**
 * Disparado por cron externo (cron-job.org) a cada 5 minutos.
 *
 * Resolve o caso "cliente paga, motoboy não entrega, cliente nunca volta no
 * site pra reportar não-recebimento". Sem esse email, o cliente acha que
 * perdeu o dinheiro e às vezes simplesmente faz outro pedido — você paga
 * 2 entregas e recebe 1 PIX.
 *
 * Fluxo:
 *   1. Lista pedidos approved + delivery_status='in_transit', sem follow-up
 *      enviado, com paid_at <= agora - (ETA_min_possível + buffer).
 *   2. Pra cada um: verifica se de fato passou de paid_at + eta + 15min.
 *      (filtro SQL é grosseiro — eta varia 10-50min, então filtra com
 *      cutoff conservador e refina em código.)
 *   3. Se passou: dispara email pós-entrega via Resend (idempotente).
 *   4. Se já passou de STALE_HOURS desde paid_at: marca como sent sem enviar
 *      (não tem sentido perguntar "chegou?" 6h+ depois).
 *
 * Auth: header `x-cron-secret` deve bater com env CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("x-cron-secret")
  if (!CRON_SECRET || auth !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const now = Date.now()

  // Cutoff conservador: pega pedidos pagos há ETA_MIN_POSSÍVEL + buffer ou mais.
  // Express ETA min = 10min; +buffer 15min = 25min. Filtra paid_at <= agora - 25min.
  // O filtro fino (eta-aware) é feito em código pra cada pedido.
  const earliestPaidAtIso = new Date(now - (10 + BUFFER_MIN) * 60 * 1000).toISOString()
  const staleCutoffIso = new Date(now - STALE_HOURS * 60 * 60 * 1000).toISOString()

  const { data: orders, error: queryErr } = await admin
    .from("orders")
    .select("id, paid_at, eta_minutes")
    .eq("status", "approved")
    .eq("delivery_status", "in_transit")
    .is("delivery_followup_sent_at", null)
    .not("paid_at", "is", null)
    .lte("paid_at", earliestPaidAtIso)
    .limit(BATCH_LIMIT)

  if (queryErr) {
    console.error("[delivery-followup] erro buscando pedidos:", queryErr)
    return NextResponse.json({ error: queryErr.message }, { status: 500 })
  }
  if (!orders || orders.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, sent: 0, stale: 0, notDue: 0 })
  }

  let sent = 0
  let stale = 0
  let notDue = 0
  let errors = 0

  for (const order of orders as PendingFollowupRow[]) {
    const paidAtMs = new Date(order.paid_at).getTime()
    const dueMs = paidAtMs + (order.eta_minutes + BUFFER_MIN) * 60 * 1000
    const staleMs = new Date(staleCutoffIso).getTime()

    if (now < dueMs) {
      // Filtro grosso pegou esse pedido mas o ETA dele é maior que o mínimo —
      // ainda não chegou na hora. Próxima execução do cron pega.
      notDue++
      continue
    }

    if (paidAtMs < staleMs) {
      // Pedido pago há mais de STALE_HOURS — provavelmente o cron caiu ou foi
      // ativado depois desse pedido. Marca como sent sem enviar email.
      const { error: markErr } = await admin
        .from("orders")
        .update({ delivery_followup_sent_at: new Date().toISOString() })
        .eq("id", order.id)
        .is("delivery_followup_sent_at", null)
      if (markErr) {
        console.error(`[delivery-followup] erro marcando stale ${order.id}:`, markErr)
        errors++
        continue
      }
      stale++
      continue
    }

    const result = await sendDeliveryFollowupByOrderId(order.id)
    if (result.ok) {
      sent++
    } else if (result.skipped) {
      // already_sent ou no_email — não conta como erro
    } else {
      console.error(`[delivery-followup] falha enviando pra ${order.id}:`, result.error)
      errors++
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date(now).toISOString(),
    checked: orders.length,
    sent,
    stale,
    notDue,
    errors,
  })
}
