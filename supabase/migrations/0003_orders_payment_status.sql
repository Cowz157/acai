-- =============================================================
-- Migração 0003 — pagamento real (status, paid_at, gateway tracking) + Realtime
-- =============================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → cole tudo → Run.
--
-- O que faz:
--   1. Adiciona colunas em `orders` para rastrear pagamento real:
--      - paid_at:                quando o gateway confirmou o pagamento
--      - gateway_transaction_id: ID retornado pelo Vyat (usado pra match com webhook)
--      - gateway_event_raw:      payload cru do último webhook recebido (auditoria)
--   2. Restringe `status` aos valores válidos por CHECK constraint.
--   3. Cria índice em `gateway_transaction_id` pro webhook handler ser rápido.
--   4. Adiciona a tabela `orders` à publicação `supabase_realtime` (live updates).
-- =============================================================

-- 1. Colunas novas (idempotente)
alter table public.orders
  add column if not exists paid_at timestamptz,
  add column if not exists gateway_transaction_id text,
  add column if not exists gateway_event_raw jsonb;

-- 2. CHECK constraint em status
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_status_valid' and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_status_valid
      check (status in ('pending', 'approved', 'refused', 'refunded', 'chargeback'));
  end if;
end $$;

-- 3. Índice pra match webhook → pedido
create index if not exists orders_gateway_transaction_idx
  on public.orders (gateway_transaction_id)
  where gateway_transaction_id is not null;

-- 4. Habilita Realtime (idempotente)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
