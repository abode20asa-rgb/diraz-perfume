-- ═══════════════════════════════════════════════════════════
--  Diraz — قفل قاعدة البيانات
--  شغّل هذا الملف كامل في Supabase → SQL Editor → Run
--  قبل التشغيل: غيّر الإيميل بالسطر المحدد أدناه إلى إيميل الأدمن
-- ═══════════════════════════════════════════════════════════

-- 1) دالة تتحقق إن المستخدم الحالي هو الأدمن (حسب الإيميل)
--    ⚠️ غيّر الإيميل هنا إلى إيميلك (نفس الإيميل اللي تسجّله في Authentication → Users)
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = lower('diraz.admin.4k9x@example.com');
$$;

-- يستخدمها صفحة الأدمن بعد تسجيل الدخول للتأكد إن الحساب فعلاً أدمن
create or replace function public.am_i_admin()
returns boolean
language sql
stable
as $$ select public.is_admin(); $$;

-- 2) تأكد إن كل الجداول عليها RLS
alter table public.perfumes          enable row level security;
alter table public.customers         enable row level security;
alter table public.coupons           enable row level security;
alter table public.orders            enable row level security;
alter table public.coupon_usage      enable row level security;
alter table public.admin_logins      enable row level security;
alter table public.deleted_customers enable row level security;
alter table public.deleted_orders    enable row level security;
alter table public.deleted_coupons   enable row level security;

-- 3) احذف كل السياسات القديمة المفتوحة
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('perfumes','customers','coupons','orders','coupon_usage',
                        'admin_logins','deleted_customers','deleted_orders','deleted_coupons')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 4) سياسات الأدمن: صلاحية كاملة على كل الجداول
create policy "admin all perfumes"          on public.perfumes          for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all customers"         on public.customers         for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all coupons"           on public.coupons           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all orders"            on public.orders            for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all coupon_usage"      on public.coupon_usage      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all admin_logins"      on public.admin_logins      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all deleted_customers" on public.deleted_customers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all deleted_orders"    on public.deleted_orders    for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all deleted_coupons"   on public.deleted_coupons   for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5) الزبائن (anon): قراءة العطور فقط
create policy "anyone read perfumes" on public.perfumes for select to anon, authenticated using (true);

-- 6) الزبائن (anon): إضافة طلب جديد فقط (بدون قراءة / تعديل / حذف)
create policy "anyone insert orders" on public.orders
  for insert to anon, authenticated
  with check (
    length(id) <= 20
    and pg_column_size(data) < 20000
    and coalesce(data ->> 'status', 'pending') = 'pending'
  );

-- 7) دوال آمنة للزبائن (بدل ما نفتح الجداول)

-- التحقق من كود الخصم: يرجّع كود واحد فقط، مو كل الأكواد
create or replace function public.check_coupon(p_code text, p_customer_key text default 'device')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.coupons%rowtype;
  u integer;
begin
  select * into c from public.coupons where code = upper(trim(p_code));
  if not found then
    return jsonb_build_object('found', false);
  end if;
  select uses into u from public.coupon_usage
   where code = c.code and customer_key = left(coalesce(p_customer_key, 'device'), 20);
  return jsonb_build_object(
    'found', true,
    'coupon', c.data || jsonb_build_object('totalUses', c.total_uses),
    'myUses', coalesce(u, 0)
  );
end $$;

-- استخدام الكود عند إرسال الطلب (يتحقق من الحد الأقصى وسياسة الاستخدام على السيرفر)
create or replace function public.redeem_coupon(p_code text, p_customer_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.coupons%rowtype;
  v_key text := left(coalesce(p_customer_key, 'device'), 20);
  v_max integer;
  v_mine integer;
begin
  select * into c from public.coupons where code = upper(trim(p_code)) for update;
  if not found then return false; end if;
  if not coalesce((c.data ->> 'active')::boolean, false) then return false; end if;

  v_max := coalesce((c.data ->> 'maxUses')::integer, 1);
  if c.total_uses >= v_max then return false; end if;

  select uses into v_mine from public.coupon_usage where code = c.code and customer_key = v_key;
  if coalesce(c.data ->> 'usagePolicy', 'once') = 'once' and coalesce(v_mine, 0) >= 1 then
    return false;
  end if;

  update public.coupons set total_uses = total_uses + 1, updated_at = now() where code = c.code;
  insert into public.coupon_usage(code, customer_key, uses) values (c.code, v_key, 1)
    on conflict (code, customer_key) do update set uses = public.coupon_usage.uses + 1;
  return true;
end $$;

-- حفظ بيانات الزبون (اسم + رقم) مع تحقق من الشكل
create or replace function public.save_customer(p_phone text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_phone is null or p_phone !~ '^07[0-9]{9}$' then
    raise exception 'invalid phone';
  end if;
  if p_data is null or pg_column_size(p_data) > 5000 then
    raise exception 'invalid data';
  end if;
  insert into public.customers(phone, data) values (p_phone, p_data)
    on conflict (phone) do update set data = excluded.data, updated_at = now();
  delete from public.deleted_customers where phone = p_phone;
end $$;

-- هل الزبون موجود؟ (بدون كشف بياناته)
create or replace function public.customer_exists(p_phone text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.customers where phone = p_phone);
$$;

grant execute on function public.check_coupon(text, text)  to anon, authenticated;
grant execute on function public.redeem_coupon(text, text) to anon, authenticated;
grant execute on function public.save_customer(text, jsonb) to anon, authenticated;
grant execute on function public.customer_exists(text)     to anon, authenticated;
grant execute on function public.am_i_admin()              to anon, authenticated;
