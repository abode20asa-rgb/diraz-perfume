create table if not exists public.perfumes (
  id bigint primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  phone text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.coupons (
  code text primary key,
  data jsonb not null,
  total_uses integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.coupon_usage (
  code text not null,
  customer_key text not null,
  uses integer not null default 0,
  primary key (code, customer_key)
);

create table if not exists public.admin_logins (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.perfumes enable row level security;
alter table public.customers enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.coupon_usage enable row level security;
alter table public.admin_logins enable row level security;

drop policy if exists "public read admin logins" on public.admin_logins;
drop policy if exists "public write admin logins" on public.admin_logins;

drop policy if exists "public read perfumes" on public.perfumes;
drop policy if exists "public write perfumes" on public.perfumes;
create policy "public read perfumes" on public.perfumes for select to anon using (true);
create policy "public write perfumes" on public.perfumes for all to anon using (true) with check (true);

create policy "public read customers" on public.customers for select to anon using (true);
create policy "public write customers" on public.customers for all to anon using (true) with check (true);
create policy "public read coupons" on public.coupons for select to anon using (true);
create policy "public write coupons" on public.coupons for all to anon using (true) with check (true);
create policy "public read orders" on public.orders for select to anon using (true);
create policy "public write orders" on public.orders for all to anon using (true) with check (true);
create policy "public read usage" on public.coupon_usage for select to anon using (true);
create policy "public write usage" on public.coupon_usage for all to anon using (true) with check (true);
create policy "public read admin logins" on public.admin_logins for select to anon using (true);
create policy "public write admin logins" on public.admin_logins for all to anon using (true) with check (true);
