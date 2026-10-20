-- ============================================================
-- التحقق من رقم الهاتف — شغّله مرة وحدة من Supabase → SQL Editor
-- (يحتاج جدول site_config ودالة am_i_admin الموجودين من قبل)
-- ============================================================

-- 1) جداول الأكواد والأرقام الموثّقة
create table if not exists public.otp_codes (
  phone        text primary key,
  code_hash    text        not null,
  expires_at   timestamptz not null,
  attempts     int         not null default 0,
  last_sent_at timestamptz not null default now(),
  sent_count   int         not null default 1,
  window_start timestamptz not null default now()
);
create table if not exists public.verified_phones (
  phone       text primary key,
  verified_at timestamptz not null default now()
);
-- بدون policies: ما أحد يكدر يقرأ أو يكتب إلا الدوال من السيرفر
alter table public.otp_codes       enable row level security;
alter table public.verified_phones enable row level security;

-- 2) الموقع يسأل: هل التحقق شغّال؟ (الإعداد يتغير من لوحة الأدمن)
create or replace function public.otp_is_enabled()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (value)::text = 'true' from public.site_config where key = 'otp_enabled'), false);
$$;
grant execute on function public.otp_is_enabled() to anon, authenticated;

-- 3) الحماية الحقيقية: ما يتسجّل زبون جديد برقم إلا إذا تحقق منه آخر 30 دقيقة
--    (الزبون الموجود أصلاً يمرّ عادي، والأدمن مستثنى، ولما يكون التحقق متوقف ما يشتغل)
create or replace function public.customers_require_otp()
returns trigger language plpgsql security definer set search_path = public as $$
declare ph text := regexp_replace(coalesce(new.phone,''), '\D', '', 'g');
begin
  if tg_op = 'INSERT'
     and public.otp_is_enabled()
     and coalesce(auth.role(), '') <> 'service_role'
     and not coalesce(public.am_i_admin(), false)
     and not exists (select 1 from public.customers c where regexp_replace(coalesce(c.phone,''), '\D', '', 'g') = ph)
     and not exists (select 1 from public.verified_phones v where v.phone = ph and v.verified_at > now() - interval '30 minutes')
  then
    raise exception 'phone_not_verified' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists customers_otp_gate on public.customers;
create trigger customers_otp_gate before insert on public.customers
  for each row execute function public.customers_require_otp();
