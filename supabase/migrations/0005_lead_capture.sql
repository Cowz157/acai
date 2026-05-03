-- =============================================================
-- Migração 0005 — captura de leads (marketing) + métricas em profiles
-- =============================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → cole tudo → Run.
--
-- O que faz:
--   1. Estende `profiles` com colunas de marketing/analytics:
--      - marketing_consent (LGPD: cliente aceitou receber emails promo)
--      - source (onde foi capturado: signup, order, lead_magnet)
--      - first_order_at, last_order_at, total_orders (jornada do cliente)
--   2. Cria tabela `email_leads` pra leads que NÃO criaram conta
--      (capturados via popup de lead magnet, por exemplo).
-- =============================================================

-- 1. Colunas novas em profiles (idempotente)
alter table public.profiles
  add column if not exists marketing_consent boolean not null default false,
  add column if not exists source text default 'signup',
  add column if not exists first_order_at timestamptz,
  add column if not exists last_order_at timestamptz,
  add column if not exists total_orders integer not null default 0;

-- 2. Tabela email_leads — captura de email sem conta criada
create table if not exists public.email_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null,                    -- 'lead_magnet' | 'newsletter' | 'popup'
  marketing_consent boolean not null default true,  -- só salvamos se cliente aceitou
  coupon_code text,                        -- cupom único enviado (preenchido pela Fase 4)
  converted_to_account boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists email_leads_email_idx
  on public.email_leads (lower(email));

-- 3. RLS: leads são INSERT-only pelo client (anônimo pode adicionar email).
--    SELECT bloqueado pra todos (admin via service_role no painel pra ver lista).
alter table public.email_leads enable row level security;

drop policy if exists "Permite inserir lead" on public.email_leads;
create policy "Permite inserir lead"
  on public.email_leads for insert
  with check (true);

-- (Sem policy de SELECT/UPDATE/DELETE — somente service_role acessa)
