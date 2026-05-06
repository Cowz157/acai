-- =============================================================
-- Migração 0008 — abandoned PIX email recovery
-- =============================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → cole tudo → Run.
--
-- O que faz:
--   Adiciona 2 colunas em `orders` pra rastrear envio de emails de
--   recuperação de PIX abandonado:
--
--     - abandoned_nudge_sent_at: 1º email (~10min após criar, PIX ainda válido)
--     - abandoned_expired_sent_at: 2º email (após PIX expirar, ~30min)
--
--   Sem isso, o cron enviaria emails duplicados toda vez que rodar.
--
--   Cria também índice parcial pra cron query (status='pending') ficar
--   rápida mesmo com a tabela crescendo.
-- =============================================================

alter table public.orders
  add column if not exists abandoned_nudge_sent_at timestamptz,
  add column if not exists abandoned_expired_sent_at timestamptz;

create index if not exists orders_pending_created_idx
  on public.orders (created_at)
  where status = 'pending';
