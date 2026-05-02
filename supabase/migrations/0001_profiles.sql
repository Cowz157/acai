-- =============================================================
-- Migração 0001 — tabela `profiles` + RLS
-- =============================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → cole tudo → Run.
-- O que isso faz:
--   1. Cria a tabela `profiles` ligada ao `auth.users` do Supabase.
--   2. Liga RLS (Row Level Security) — sem isso qualquer um leria/editaria
--      qualquer perfil. Com isso, cada usuário só lê e edita o próprio.
--   3. Cria um trigger que insere automaticamente um `profile` quando
--      um novo usuário é criado em `auth.users` (com nome e telefone
--      vindos do `raw_user_meta_data` do signup).
-- =============================================================

-- 1. Tabela profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Habilita RLS
alter table public.profiles enable row level security;

-- 3. Políticas: cada usuário só vê e edita o próprio perfil
drop policy if exists "Usuários veem o próprio perfil" on public.profiles;
create policy "Usuários veem o próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Usuários atualizam o próprio perfil" on public.profiles;
create policy "Usuários atualizam o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Usuários inserem o próprio perfil" on public.profiles;
create policy "Usuários inserem o próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 4. Trigger: ao criar um novo usuário, popula a row em profiles
--    com os metadados que vieram do signup (name, phone).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do update
    set name  = excluded.name,
        email = excluded.email,
        phone = excluded.phone,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
