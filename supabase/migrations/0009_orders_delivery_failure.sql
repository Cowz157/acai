-- =============================================================
-- Migração 0009 — falha de entrega reportada pelo cliente
-- =============================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → cole tudo → Run.
--
-- O que faz:
--   Adiciona colunas em `orders` pra rastrear o fluxo "não recebi meu pedido":
--
--     - delivery_status: estado da entrega
--         in_transit         → default, entrega rolando normal
--         failed_reported    → cliente clicou "não recebi"
--         redelivery_pending → cliente escolheu re-entrega, aguardando pagar PIX
--         redelivery_paid    → re-entrega paga, nova entrega rolando
--         refund_requested   → cliente pediu reembolso, admin precisa processar
--         refund_processed   → admin marcou reembolso como concluído
--
--     - failure_reported_at:    timestamp do clique do cliente
--     - redelivery_payment_id:  vyat_transaction_id do PIX de re-entrega
--     - redelivery_codigo_pix:  EMV string do PIX de re-entrega (pra exibir)
--     - redelivery_expires_at:  expiração do PIX de re-entrega
--     - refund_processed_at:    timestamp quando admin marcou reembolso pago
-- =============================================================

alter table public.orders
  add column if not exists delivery_status text default 'in_transit'
    check (delivery_status in (
      'in_transit',
      'failed_reported',
      'redelivery_pending',
      'redelivery_paid',
      'refund_requested',
      'refund_processed'
    )),
  add column if not exists failure_reported_at timestamptz,
  add column if not exists redelivery_payment_id text,
  add column if not exists redelivery_codigo_pix text,
  add column if not exists redelivery_expires_at timestamptz,
  add column if not exists refund_processed_at timestamptz;
