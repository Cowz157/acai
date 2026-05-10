-- =============================================================
-- Migração 0013 — doação solidária (donation_amount)
-- =============================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → cole tudo → Run.
--
-- O que faz:
--   Adiciona coluna `donation_amount numeric(10,2) default 0` em `orders`.
--
--   No checkout, o cliente pode somar R$5/R$10/R$20 (ou outro valor com
--   mínimo R$5) ao total — esse valor é cobrado junto no PIX e fica
--   identificado aqui pra reconciliação. A casa converte esse aporte
--   em comida/dinheiro/ajuda direta nas próximas rodadas de doação que
--   já fazem regularmente.
--
--   Default 0 pra retrocompat: pedidos antigos não precisam migrar.
-- =============================================================

alter table public.orders
  add column if not exists donation_amount numeric(10,2) not null default 0;
