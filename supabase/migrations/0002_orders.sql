-- =============================================================
-- Migração 0002 — tabela `orders` + RLS
-- =============================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → cole tudo → Run.
--
-- O que faz:
--   1. Cria a tabela `orders` que guarda cada pedido finalizado.
--   2. Habilita RLS:
--      - INSERT: qualquer um pode criar (logado ou anônimo). Se logado,
--        o user_id deve bater com auth.uid(). Se anônimo, user_id = null.
--      - SELECT: só o próprio dono lê (auth.uid() = user_id). Pedidos
--        anônimos NÃO são lidos pelo cliente — quem precisa do detalhe
--        usa o que está no localStorage.
--   3. Cria índice em (user_id, created_at) pra histórico ficar rápido.
-- =============================================================

create table if not exists public.orders (
  id uuid primary key,
  order_number text not null,             -- número curto exibido (#12345)
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending', -- reservado pra evolução futura
  eta_minutes integer not null check (eta_minutes between 1 and 240),
  items jsonb not null,
  total numeric(10, 2) not null check (total >= 0),
  delivery jsonb not null,
  payment jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_created_idx
  on public.orders (user_id, created_at desc);

alter table public.orders enable row level security;

-- INSERT: logado bate o próprio user_id; anônimo passa null.
drop policy if exists "Inserir pedido próprio ou anônimo" on public.orders;
create policy "Inserir pedido próprio ou anônimo"
  on public.orders for insert
  with check (
    (auth.uid() is not null and auth.uid() = user_id)
    or user_id is null
  );

-- SELECT: só o dono lê. Anônimos não conseguem listar / inspecionar.
drop policy if exists "Ler apenas pedidos próprios" on public.orders;
create policy "Ler apenas pedidos próprios"
  on public.orders for select
  using (auth.uid() is not null and auth.uid() = user_id);

-- (Sem políticas de UPDATE/DELETE pelo cliente — fluxo cliente é só inserir
--  e ler. Atualizações de status, quando vierem, devem rodar via service_role
--  no servidor — nunca no frontend.)
