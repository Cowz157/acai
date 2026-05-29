import { NextResponse, type NextRequest } from "next/server"
import { getLeadsForRecovery, markLeadBounced, markLeadEmailSent, nextStepFor } from "@/lib/leads"
import { sendLeadRecoveryEmail } from "@/lib/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30 // alinhado com timeout máximo do cron-job.org free tier

const CRON_SECRET = process.env.CRON_SECRET ?? ""

/**
 * Cron handler de recovery de leads — chamado pelo cron-job.org a cada 30min
 * com header `x-cron-secret`. Lê leads pendentes (não convertidos, não opted-out,
 * dentro da janela horária permitida), dispara o próximo email da sequência,
 * marca status.
 *
 * Retorna stats {processed, sent, errors, skipped_bounced} pra logging.
 *
 * Setup no cron-job.org (criar novo job):
 *   - URL: https://acai.pedii.shop/api/cron/lead-recovery
 *   - Method: POST
 *   - Headers: x-cron-secret: <valor de CRON_SECRET no Railway>
 *   - Schedule: a cada 30min
 *   - Timeout: 60s
 */
export async function POST(request: NextRequest) {
  if (!CRON_SECRET) {
    console.warn("[cron/lead-recovery] CRON_SECRET não configurado")
    return NextResponse.json({ error: "Cron secret não configurado" }, { status: 500 })
  }
  if (request.headers.get("x-cron-secret") !== CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const leads = await getLeadsForRecovery()
  let sent = 0
  let errors = 0
  let bounced = 0

  for (const lead of leads) {
    const step = nextStepFor(lead)
    try {
      const result = await sendLeadRecoveryEmail({
        email: lead.email,
        fullName: lead.full_name,
        step,
      })
      if (result.ok) {
        await markLeadEmailSent(lead.email, step)
        sent++
      } else if (result.bounced) {
        await markLeadBounced(lead.email)
        bounced++
      } else {
        errors++
        console.error(`[cron/lead-recovery] envio falhou: email=${lead.email.slice(0, 3)}*** step=${step} error=${result.error}`)
      }
    } catch (err) {
      errors++
      console.error(`[cron/lead-recovery] exceção: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log(`[cron/lead-recovery] tick concluído: processed=${leads.length} sent=${sent} bounced=${bounced} errors=${errors}`)
  return NextResponse.json({ processed: leads.length, sent, bounced, errors })
}
