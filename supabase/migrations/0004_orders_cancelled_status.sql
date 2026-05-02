-- =============================================================
-- Migração 0004 — adiciona o status "cancelled" aos pedidos
-- =============================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → cole tudo → Run.
--
-- O que faz:
--   Substitui o CHECK constraint de `orders.status` para incluir 'cancelled'.
--   Usado quando o cliente cancela um PIX antes de pagar.
-- =============================================================

alter table public.orders
  drop constraint if exists orders_status_valid;

alter table public.orders
  add constraint orders_status_valid
  check (status in ('pending', 'approved', 'refused', 'refunded', 'chargeback', 'cancelled'));
