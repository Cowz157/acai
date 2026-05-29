-- =============================================================
-- Migração 0015 — captura de leads pra recovery email
-- =============================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → cole → Run.
--
-- O que faz:
--   Cria tabela `leads` pra capturar emails de gente que preencheu
--   identification no checkout mas não chegou a gerar PIX. Cron
--   `lead-recovery` lê essa tabela e dispara 3 emails de recovery
--   em horários estratégicos.
--
-- Sequência de email_sequence_step:
--   0  → nenhum email enviado
--   1  → primeiro toque (30-60min após captura) enviado
--   2  → segundo toque (24h depois) enviado
--   3  → terceiro toque (3 dias depois, com cupom) enviado — sequência completa
--   98 → bounced (Resend marcou email como inválido)
--   99 → opted-out (user clicou unsubscribe)
--
-- Quando `converted_at` é populado (link com order.delivery.email no
-- saveOrderRemote), o cron pula esse lead — virou venda.
-- =============================================================

create table if not exists public.leads (
  email text primary key,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  /** Quando virou order (link via order.delivery.email = leads.email). */
  converted_at timestamptz,
  /** Último envio de email de recovery (qualquer step). */
  last_email_sent_at timestamptz,
  /** Estado da sequência: 0=nenhum, 1/2/3=toque enviado, 98=bounced, 99=opted-out. */
  email_sequence_step int not null default 0,
  /** Source UTMs capturadas no momento do checkout — útil pra ver de qual campanha veio o lead que recuperou. */
  utm_source text,
  utm_campaign text
);

-- Index pra acelerar a query do cron: WHERE converted_at IS NULL AND
-- email_sequence_step < 3 AND email_sequence_step NOT IN (98, 99)
create index if not exists leads_recovery_idx
  on public.leads (created_at, email_sequence_step, last_email_sent_at)
  where converted_at is null and email_sequence_step < 3 and email_sequence_step not in (98, 99);
