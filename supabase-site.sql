-- تشغيل / إيقاف الموقع من لوحة التحكم
create table if not exists public.site_config (
  key text primary key,
  value jsonb not null
);
alter table public.site_config enable row level security;
drop policy if exists "admin all site_config" on public.site_config;
create policy "admin all site_config" on public.site_config
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.site_config(key, value) values ('open', 'true'::jsonb)
  on conflict (key) do nothing;

create or replace function public.site_is_open()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (value)::text <> 'false' from public.site_config where key = 'open'), true);
$$;
grant execute on function public.site_is_open() to anon, authenticated;
