import { NextResponse, type NextRequest } from "next/server"
import { sendOrderConfirmationByOrderId } from "@/lib/email"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CRON_SECRET = process.env.CRON_SECRET ?? ""
const VYAT_KEY = process.env.NEXT_PUBLIC_VYAT_KEY ?? ""
const VYAT_BASE = process.env.NEXT_PUBLIC_VYAT_BASE_URL ?? "https://api.vyat.app"

/** UA real pra reduzir falsos positivos do Cloudflare em chamadas server-to-server. */
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/** Quantos pedidos checar por execução. Vyat tem rate limit de 30 req/min/IP em /pix/status. */
const BATCH_LIMIT = 25
/** Pausa entre chamadas pra Vyat distribuir o burst. 25 reqs × 250ms = ~6s — bem dentro do limite. */
const THROTTLE_MS = 250

interface VyatStatusResponse {
  status?: string
}

interface PendingOrderRow {
  id: string
  gateway_transaction_id: string
  payment: { method?: string }
  status: string
}

/**
 * Disparado por cron externo (cron-job.org) a cada 2 minutos.
 *
 * Resolve o cenário "cliente paga e fecha a aba" — quando o polling no
 * navegador (usePaymentTracking) não está rodando, ninguém atualiza o
 * status do pedido no Supabase mesmo após a Vyat confirmar o pagamento.
 *
 * Fluxo:
 *   1. Lista pedidos PIX pendentes das últimas 24h com gateway_transaction_id setado.
 *   2. Pra cada um, consulta /v1/pix/status na Vyat.
 *   3. Se virou 'approved': UPDATE pra approved + dispatch do email de confirmação.
 *   4. Se virou outro estado terminal (refunded/chargeback/cancelled/refused/etc):
 *      persiste o status no Supabase pra UI poder reagir; sem email.
 *   5. Se ainda 'pending' ou status desconhecido: deixa quieto, próxima execução tenta.
 *
 * Idempotência:
 *   - UPDATE de status guarda race condition com `.eq("status", "pending")`.
 *   - Email é idempotente via claim em confirmation_email_sent_at (lib/email.ts).
 *   - Polling client-side e esse cron podem disparar simultaneamente sem dobrar email.
 *
 * Auth: header `x-cron-secret` deve bater com env CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("x-cron-secret")
  if (!CRON_SECRET || auth !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!VYAT_KEY) {
    return NextResponse.json({ error: "Gateway não configurado" }, { status: 500 })
  }

  const admin = getSupabaseAdmin()
  const last24hIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: orders, error: queryErr } = await admin
    .from("orders")
    .select("id, gateway_transaction_id, payment, status")
    .eq("status", "pending")
    .gte("created_at", last24hIso)
    .not("gateway_transaction_id", "is", null)
    .limit(BATCH_LIMIT)

  if (queryErr) {
    console.error("[check-pending-pix] erro buscando pedidos:", queryErr)
    return NextResponse.json({ error: queryErr.message }, { status: 500 })
  }
  if (!orders || orders.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, approved: 0, terminal: 0, errors: 0 })
  }

  let approved = 0
  let terminal = 0
  let stillPending = 0
  let skipped = 0
  let errors = 0

  for (const order of orders as PendingOrderRow[]) {
    if (order.payment?.method !== "pix" || !order.gateway_transaction_id) {
      skipped++
      continue
    }

    try {
      const url = `${VYAT_BASE}/v1/pix/status?transaction_id=${encodeURIComponent(order.gateway_transaction_id)}&key=${VYAT_KEY}`
      const res = await fetch(url, { headers: { "User-Agent": BROWSER_UA } })

      if (!res.ok) {
        console.error(`[check-pending-pix] Vyat retornou ${res.status} pra ${order.id}`)
        errors++
        continue
      }

      const data = (await res.json()) as VyatStatusResponse
      const remoteStatus = (data.status ?? "").toLowerCase().trim()

      if (remoteStatus === "approved") {
        const nowIso = new Date().toISOString()
        const { error: updateErr } = await admin
          .from("orders")
          .update({ status: "approved", paid_at: nowIso })
          .eq("id", order.id)
          .eq("status", "pending") // guard race condition

        if (updateErr) {
          console.error(`[check-pending-pix] erro update approved pra ${order.id}:`, updateErr)
          errors++
          continue
        }

        // Email idempotente — se polling client já disparou, retorna skipped
        const emailResult = await sendOrderConfirmationByOrderId(order.id)
        if (!emailResult.ok && !emailResult.skipped) {
          console.error(`[check-pending-pix] email falhou pra ${order.id}:`, emailResult.error)
        }

        approved++
      } else if (remoteStatus === "pending" || remoteStatus === "") {
        stillPending++
      } else {
        // Estado terminal não-aprovado: refunded, chargeback, cancelled, refused, failed, etc.
        // A Vyat não normaliza 100% — qualquer string que não seja approved/pending é tratada
        // como sinal terminal. Persiste o que veio pra UI poder mostrar o estado correto.
        const { error: updateErr } = await admin
          .from("orders")
          .update({ status: remoteStatus })
          .eq("id", order.id)
          .eq("status", "pending")

        if (updateErr) {
          console.error(`[check-pending-pix] erro update ${remoteStatus} pra ${order.id}:`, updateErr)
          errors++
          continue
        }
        terminal++
      }
    } catch (err) {
      console.error(`[check-pending-pix] exceção pra ${order.id}:`, err)
      errors++
    }

    // Throttle pra distribuir as chamadas e não estourar 30 req/min/IP da Vyat
    await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS))
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    checked: orders.length,
    approved,
    terminal,
    stillPending,
    skipped,
    errors,
  })
}
