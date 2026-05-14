-- =============================================================
-- Migração 0014 — tabela `reviews` + RLS
-- =============================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → cole tudo → Run.
--
-- O que faz:
--   Cria a tabela `reviews` ligada ao `auth.users`. Cada usuário tem
--   no máximo 1 avaliação (nota + comentário).
--
--   RLS garante o modelo "por-conta": cada usuário só lê e edita a
--   PRÓPRIA avaliação — ninguém vê a de outro, nem visitante anônimo.
--   A avaliação serve como gancho de criação de conta (pra avaliar,
--   precisa estar logado) e fica privada do autor.
-- =============================================================

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.reviews enable row level security;

drop policy if exists "Usuários veem a própria avaliação" on public.reviews;
create policy "Usuários veem a própria avaliação"
  on public.reviews for select
  using (auth.uid() = user_id);

drop policy if exists "Usuários inserem a própria avaliação" on public.reviews;
create policy "Usuários inserem a própria avaliação"
  on public.reviews for insert
  with check (auth.uid() = user_id);

drop policy if exists "Usuários atualizam a própria avaliação" on public.reviews;
create policy "Usuários atualizam a própria avaliação"
  on public.reviews for update
  using (auth.uid() = user_id);
