-- =============================================================
-- Migração 0006 — token de acompanhamento (pra links de email)
-- =============================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → cole tudo → Run.
--
-- O que faz:
--   Adiciona coluna `tracking_token` em `orders`. Esse token é gerado
--   no cliente ao criar o pedido e usado no link `/acompanhar?token=xxx`
--   enviado por email. Permite cliente acompanhar pedido em qualquer
--   dispositivo (não dependente de localStorage).
-- =============================================================

alter table public.orders
  add column if not exists tracking_token text;

-- Índice único condicional (não bloqueia rows antigos sem token)
create unique index if not exists orders_tracking_token_unique_idx
  on public.orders (tracking_token)
  where tracking_token is not null;
