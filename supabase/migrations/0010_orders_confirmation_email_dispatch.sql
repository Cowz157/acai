-- =============================================================
-- Migração 0010 — confirmation email dispatch (idempotência)
-- =============================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → cole tudo → Run.
--
-- O que faz:
--   Adiciona coluna `confirmation_email_sent_at` em `orders` pra evitar
--   envio duplicado do email "Pedido confirmado" quando dois caminhos
--   tentam disparar o mesmo email simultaneamente:
--
--     - polling no cliente (usePaymentTracking) detecta approved
--     - cron server-side (check-pending-pix) detecta approved primeiro
--
--   Sem essa flag, ambos os caminhos enviariam o email — cliente
--   receberia 2x a confirmação. A função sendOrderConfirmationByOrderId
--   usa essa coluna como "claim": só envia se conseguir setar a flag
--   de null pra timestamp num UPDATE atômico.
-- =============================================================

alter table public.orders
  add column if not exists confirmation_email_sent_at timestamptz;
