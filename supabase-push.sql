-- ═══════════════════════════════════════════════════════════
--  Diraz — نظام الإشعارات (Web Push)
--  شغّل هذا الملف كامل في Supabase → SQL Editor → Run
--  (بعد supabase-security.sql)
-- ═══════════════════════════════════════════════════════════

create table if not exists public.push_subs (
  endpoint      text primary key,
  p256dh        text not null,
  auth          text not null,
  phone         text,
  cart_count    integer not null default 0,
  cart_at       timestamptz,
  last_order_at timestamptz,
  last_visit_at timestamptz not null default now(),
  last_auto_at  timestamptz,
  auto_count    integer not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.push_messages (
  id         bigint generated always as identity primary key,
  title      text not null,
  body       text not null,
  url        text not null default '/perfumes.html',
  send_at    timestamptz not null default now(),
  status     text not null default 'scheduled',   -- scheduled | sending | sent
  sent_count integer,
  created_at timestamptz not null default now()
);

alter table public.push_subs     enable row level security;
alter table public.push_messages enable row level security;

drop policy if exists "admin all push_subs"     on public.push_subs;
drop policy if exists "admin all push_messages" on public.push_messages;
create policy "admin all push_subs"     on public.push_subs     for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all push_messages" on public.push_messages for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- الزبائن (anon) ما عندهم أي وصول مباشر — فقط عبر الدوال التالية

create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_phone text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_endpoint is null or length(p_endpoint) > 800 or p_endpoint !~ '^https://' then raise exception 'bad endpoint'; end if;
  if length(coalesce(p_p256dh,'')) not between 10 and 200 or length(coalesce(p_auth,'')) not between 10 and 100 then raise exception 'bad keys'; end if;
  insert into public.push_subs(endpoint, p256dh, auth, phone)
    values (p_endpoint, p_p256dh, p_auth, left(p_phone, 20))
    on conflict (endpoint) do update
      set p256dh = excluded.p256dh, auth = excluded.auth,
          phone = coalesce(excluded.phone, public.push_subs.phone),
          last_visit_at = now();
end $$;

create or replace function public.push_cart(p_endpoint text, p_count integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.push_subs
     set cart_count    = greatest(coalesce(p_count,0), 0),
         cart_at       = case when coalesce(p_count,0) > 0 then now() else null end,
         last_visit_at = now()
   where endpoint = p_endpoint;
end $$;

create or replace function public.push_ordered(p_endpoint text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.push_subs set cart_count = 0, cart_at = null, last_order_at = now(), last_visit_at = now()
   where endpoint = p_endpoint;
end $$;

create or replace function public.push_unsubscribe(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_subs where endpoint = p_endpoint;
$$;

create or replace function public.push_admin_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_admin()
    then jsonb_build_object('total', (select count(*) from public.push_subs),
                            'withCart', (select count(*) from public.push_subs where cart_count > 0))
    else jsonb_build_object('total', 0, 'withCart', 0) end;
$$;

grant execute on function public.push_subscribe(text,text,text,text) to anon, authenticated;
grant execute on function public.push_cart(text,integer)             to anon, authenticated;
grant execute on function public.push_ordered(text)                  to anon, authenticated;
grant execute on function public.push_unsubscribe(text)              to anon, authenticated;
grant execute on function public.push_admin_stats()                  to authenticated;
