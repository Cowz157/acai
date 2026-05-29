/**
 * Helpers server-side pra captura/recovery de leads do checkout.
 *
 * Fluxo:
 *   1. User preenche step 1 (identification) → checkout chama /api/leads/capture
 *      → captureLead() faz UPSERT em `leads` (resetando sequência se já existia).
 *   2. Se o user vai até o final e gera PIX, o save do order chama
 *      markLeadConverted() → cron pula esse lead daí em diante.
 *   3. Cron /api/cron/lead-recovery roda a cada 30min, lê leads pendentes
 *      via getLeadsForRecovery() e dispara email do step apropriado.
 *      Atualiza via markLeadSent().
 *   4. User pode opt-out via link no email → /api/leads/unsubscribe →
 *      markLeadOptedOut() seta step=99, cron não toca mais.
 *
 * Janelas horárias e delays entre toques ficam em `getLeadsForRecovery()`
 * — mantém a lógica de timing num lugar só.
 */

import { getSupabaseAdmin } from "./supabase-admin"

export interface LeadCaptureInput {
  email: string
  fullName?: string | null
  phone?: string | null
  utmSource?: string | null
  utmCampaign?: string | null
}

export interface LeadRow {
  email: string
  full_name: string | null
  phone: string | null
  created_at: string
  converted_at: string | null
  last_email_sent_at: string | null
  email_sequence_step: number
  utm_source: string | null
  utm_campaign: string | null
}

/**
 * UPSERT do lead. Se já existir com mesmo email:
 *   - Atualiza nome/telefone/UTMs (caso o user voltou de outra campanha)
 *   - NÃO reseta `email_sequence_step` (evita re-enviar 1º email se user
 *     voltou ao checkout depois de receber recovery)
 *   - NÃO reseta `converted_at` (se já comprou, fica como convertido)
 */
export async function captureLead(input: LeadCaptureInput): Promise<{ ok: boolean; error?: string }> {
  const email = input.email?.trim().toLowerCase()
  if (!email) return { ok: false, error: "email obrigatório" }

  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from("leads")
    .upsert(
      {
        email,
        full_name: input.fullName?.trim() ?? null,
        phone: input.phone ?? null,
        utm_source: input.utmSource ?? null,
        utm_campaign: input.utmCampaign ?? null,
      },
      {
        onConflict: "email",
        // ignoreDuplicates: false → faz UPDATE no conflito, mas só dos campos
        // listados acima — created_at, converted_at, email_sequence_step,
        // last_email_sent_at ficam intactos.
        ignoreDuplicates: false,
      },
    )

  if (error) {
    console.error(`[leads/capture] supabase upsert falhou: ${error.message}`)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/**
 * Marca lead como convertido (virou order) — cron lead-recovery pula daí.
 * Idempotente: chamar 2x não dá erro, só atualiza converted_at pro mais novo.
 * No-op silencioso se email não está em `leads` (user comprou sem nunca
 * abandonar checkout — caso normal).
 */
export async function markLeadConverted(email: string): Promise<void> {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return

  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from("leads")
    .update({ converted_at: new Date().toISOString() })
    .eq("email", normalized)
    .is("converted_at", null)

  if (error) {
    console.error(`[leads/markConverted] falhou: email=${normalized.slice(0, 3)}*** error=${error.message}`)
  }
}

/**
 * Marca lead como opted-out (step=99). Cron pula. Usado pelo endpoint
 * /api/leads/unsubscribe quando user clica link no rodapé do email.
 */
export async function markLeadOptedOut(email: string): Promise<{ ok: boolean; error?: string }> {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return { ok: false, error: "email obrigatório" }

  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from("leads")
    .update({ email_sequence_step: 99 })
    .eq("email", normalized)

  if (error) {
    console.error(`[leads/markOptedOut] falhou: ${error.message}`)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/**
 * Marca lead como bounced (step=98) quando Resend retorna invalid recipient.
 * Cron pula. Não precisa retornar status — chamada fire-and-forget.
 */
export async function markLeadBounced(email: string): Promise<void> {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return

  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from("leads")
    .update({ email_sequence_step: 98 })
    .eq("email", normalized)

  if (error) {
    console.error(`[leads/markBounced] falhou: ${error.message}`)
  }
}

/**
 * Atualiza após envio bem-sucedido: incrementa step + atualiza timestamp.
 */
export async function markLeadEmailSent(email: string, newStep: 1 | 2 | 3): Promise<void> {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return

  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from("leads")
    .update({
      last_email_sent_at: new Date().toISOString(),
      email_sequence_step: newStep,
    })
    .eq("email", normalized)

  if (error) {
    console.error(`[leads/markEmailSent] falhou: ${error.message}`)
  }
}

// =====================================================================
// Lógica de seleção pro cron
// =====================================================================

/**
 * Delays entre captura e cada toque, em minutos.
 * Toque 1 = ~30-60min após captura (impulso ainda quente)
 * Toque 2 = 24h após captura
 * Toque 3 = 72h (3 dias) após captura — com cupom ACAI20
 */
const DELAY_MINUTES = {
  1: 30,
  2: 24 * 60,
  3: 72 * 60,
} as const

/**
 * Janela horária permitida pra disparo (hora local Brasil, UTC-3).
 * Não disparar fora dessa janela (3am não converte e prejudica reputação).
 *
 * Toque 1 (impulso): janela ampla 11h-22h
 * Toques 2 e 3 (já frio): janela mais focada 14h-20h (horário de comer açaí)
 */
const ALLOWED_HOURS = {
  1: { start: 11, end: 22 },
  2: { start: 14, end: 20 },
  3: { start: 14, end: 20 },
} as const

/**
 * Verifica se a hora local (Brasil, UTC-3) atual está dentro da janela
 * permitida pra o step dado.
 */
export function isWithinAllowedWindow(stepToFire: 1 | 2 | 3, now: Date = new Date()): boolean {
  // Brasil UTC-3 (BRT, sem horário de verão atualmente). Calcula offset manual
  // em vez de Intl.DateTimeFormat — mais previsível pra cron rodando em UTC.
  const brHour = (now.getUTCHours() - 3 + 24) % 24
  const { start, end } = ALLOWED_HOURS[stepToFire]
  return brHour >= start && brHour < end
}

/**
 * Lista leads que estão prontos pra receber o PRÓXIMO email da sequência.
 *
 * Filtros:
 *   - converted_at IS NULL (não virou venda ainda)
 *   - email_sequence_step < 3 (não completou sequência)
 *   - email_sequence_step NOT IN (98, 99) (não bounced nem opt-out)
 *   - Passou o delay mínimo desde captura (DELAY_MINUTES[próximo step])
 *   - Hora local Brasil está na janela permitida (ALLOWED_HOURS[próximo step])
 *
 * Retorna em batches de 100 pra não estourar timeout do cron.
 */
export async function getLeadsForRecovery(limit = 100, now: Date = new Date()): Promise<LeadRow[]> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("leads")
    .select("*")
    .is("converted_at", null)
    .lt("email_sequence_step", 3)
    .not("email_sequence_step", "in", "(98,99)")
    .order("created_at", { ascending: true })
    .limit(limit)

  if (error) {
    console.error(`[leads/getForRecovery] falhou: ${error.message}`)
    return []
  }

  const candidates = (data ?? []) as LeadRow[]
  const eligible: LeadRow[] = []

  for (const lead of candidates) {
    const nextStep = (lead.email_sequence_step + 1) as 1 | 2 | 3
    const captureTime = new Date(lead.created_at).getTime()
    const minDispatchTime = captureTime + DELAY_MINUTES[nextStep] * 60 * 1000
    if (now.getTime() < minDispatchTime) continue
    if (!isWithinAllowedWindow(nextStep, now)) continue
    eligible.push(lead)
  }

  return eligible
}

export function nextStepFor(lead: LeadRow): 1 | 2 | 3 {
  return (lead.email_sequence_step + 1) as 1 | 2 | 3
}
