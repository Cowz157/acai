-- =============================================================
-- Migração 0012 — pedido como presente (gift)
-- =============================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → cole tudo → Run.
--
-- O que faz:
--   Adiciona coluna `gift` jsonb em `orders` pra armazenar dados de pedidos
--   que o cliente está enviando como presente:
--     - recipient_name: pra quem é (motoboy entrega olhando esse nome)
--     - recipient_phone: contato do destinatário pra motoboy ligar
--     - message: mensagem que vai junto com o açaí (ex: "Mãe, te amo 💜")
--
--   Quando gift é null, é pedido normal pro próprio cliente.
--   Endereço de entrega segue em `delivery` (igual aos não-presente) — pode
--   ser o do cliente ou de outra pessoa, não muda a estrutura.
-- =============================================================

alter table public.orders
  add column if not exists gift jsonb;
