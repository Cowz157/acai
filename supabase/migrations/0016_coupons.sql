-- =============================================================
-- Migração 0016 — sistema de cupons (coupons + coupon_redemptions)
-- =============================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → cole → Run.
--
-- O que faz:
--   Cria tabelas `coupons` (catálogo) e `coupon_redemptions` (uso por order).
--   Usado pelo terceiro toque do lead-recovery email (cupom enviado pra
--   acelerar conversão de lead frio), e potencialmente outros canais
--   (campanha email marketing, promo sazonal, recovery PIX expirado).
--
-- Cupom suporta:
--   - Percentual (15%, 20%, 30%) — discount_type='percentage'
--   - Valor fixo em reais (R$10 OFF) — discount_type='fixed_brl'
--   - Mínimo de subtotal pra aplicar (min_subtotal_brl)
--   - Limite total de usos (max_uses, nullable = ilimitado)
--   - Limite por email (max_uses_per_email, nullable = ilimitado) — evita
--     cliente abusar criando múltiplos pedidos com mesmo cupom
--   - Data de expiração (expires_at, nullable = sem expiração)
--   - Ativo/desativado (active) — desliga sem deletar
--
-- coupon_redemptions registra cada uso pra:
--   - Auditoria (qual order usou qual cupom, quando)
--   - Enforce max_uses e max_uses_per_email server-side
--   - Métricas de canal (lead recovery vs outros)
-- =============================================================

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage', 'fixed_brl')),
  discount_value numeric(10, 2) not null check (discount_value > 0),
  min_subtotal_brl numeric(10, 2) not null default 0,
  max_uses int,
  max_uses_per_email int default 1,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  description text
);

create index if not exists coupons_code_idx on public.coupons (lower(code)) where active = true;

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  order_id text not null,
  customer_email text not null,
  discount_applied_brl numeric(10, 2) not null,
  redeemed_at timestamptz not null default now()
);

create index if not exists coupon_redemptions_coupon_idx on public.coupon_redemptions (coupon_id);
create index if not exists coupon_redemptions_email_idx on public.coupon_redemptions (lower(customer_email), coupon_id);

-- =============================================================
-- Cupom inicial: ACAI20 (20% OFF, sem pedido mínimo, max 1× por email)
-- Usado pelo terceiro toque do lead-recovery (3 dias após abandono).
-- Sem expires_at — fica disponível enquanto a campanha rodar.
-- Sem min_subtotal_brl — recovery foca em CONVERTER o lead frio mesmo
-- em ticket baixo (R$19,90 do 300ml), apostando em LTV de recompra
-- futura. Fricção do mínimo R$25 mata exatamente no produto entry-level.
-- =============================================================
insert into public.coupons (code, discount_type, discount_value, min_subtotal_brl, max_uses_per_email, description)
values ('ACAI20', 'percentage', 20, 0, 1, 'Lead recovery 3º toque — 20% OFF (sem pedido mínimo)')
on conflict (code) do nothing;
