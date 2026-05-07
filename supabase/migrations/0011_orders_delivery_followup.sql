-- =============================================================
-- Migração 0011 — delivery followup email (idempotência)
-- =============================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → cole tudo → Run.
--
-- O que faz:
--   Adiciona coluna `delivery_followup_sent_at` em `orders` pra
--   garantir idempotência do email "seu açaí chegou?" disparado
--   pelo cron /api/cron/delivery-followup.
--
--   O cron varre pedidos approved + in_transit cujo paid_at + eta +
--   15min de buffer já passou, manda email perguntando se chegou
--   (e empurrando re-entrega R$12,50 caso não), e marca a flag.
-- =============================================================

alter table public.orders
  add column if not exists delivery_followup_sent_at timestamptz;
