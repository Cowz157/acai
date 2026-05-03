import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface CreateLeadBody {
  email?: string
  source?: string
  marketingConsent?: boolean
}

/**
 * Salva um lead capturado via popup/lead magnet/newsletter.
 * Email é único (case-insensitive). Insert duplicado retorna 200 com `already_exists`.
 */
export async function POST(request: NextRequest) {
  let body: CreateLeadBody
  try {
    body = (await request.json()) as CreateLeadBody
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 })
  }

  const source = body.source ?? "lead_magnet"
  const marketingConsent = body.marketingConsent !== false

  if (!marketingConsent) {
    return NextResponse.json({ error: "É necessário aceitar receber e-mails" }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Upsert idempotente — se o email já existe, mantém o registro original (não sobrescreve)
  const { error } = await admin.from("email_leads").insert({
    email,
    source,
    marketing_consent: marketingConsent,
  })

  if (error) {
    // Conflict de email já cadastrado — não é erro pro client
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, already_exists: true })
    }
    console.error("[email-leads] erro ao salvar lead:", error)
    return NextResponse.json({ error: "Erro ao salvar e-mail" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
