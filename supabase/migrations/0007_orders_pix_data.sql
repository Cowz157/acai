-- =============================================================
-- Migração 0007 — persiste dados do PIX em orders
-- =============================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → cole tudo → Run.
--
-- O que faz:
--   Adiciona 3 colunas em `orders` pra persistir o PIX gerado pelo gateway.
--   Sem isso, o cliente que abre o link `/acompanhar?token=xxx` vindo do
--   email num device diferente não consegue ver o QR Code (só estava em
--   localStorage do device original).
-- =============================================================

alter table public.orders
  add column if not exists pix_qrcode_url text,
  add column if not exists pix_codigo text,
  add column if not exists pix_expires_at timestamptz;
