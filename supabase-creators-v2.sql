-- ═══════════════════════════════════════════════════════════
--  Diraz — عمولة المنشئ حسب حجم العطر (50 مل / 35 مل)
--  شغّل هذا الملف كامل في Supabase → SQL Editor → Run
--  (بعد supabase-security.sql و supabase-creators.sql و supabase-hide-limits.sql)
--  ⚠️ شغّله قبل رفع admin.html و creator.html الجديدين
-- ═══════════════════════════════════════════════════════════

-- 1) إحصائيات المنشئ: العمولة = (عدد عطور 50مل × عمولة 50) + (عدد عطور 35مل × عمولة 35)
--    الأكواد القديمة (بدون commission50/commission35) تبقى على عمولة الطلب القديمة
create or replace function public.creator_stats(p_code text, p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.coupons%rowtype;
  v_old numeric;
  v_c50 numeric;
  v_c35 numeric;
  v_legacy boolean;
  r jsonb;
begin
  select * into c from public.coupons where code = upper(trim(p_code));
  if not found
     or coalesce(c.data ->> 'creatorToken', '') = ''
     or (c.data ->> 'creatorToken') <> coalesce(p_token, '') then
    return jsonb_build_object('ok', false);
  end if;

  v_legacy := (c.data ->> 'commission50') is null and (c.data ->> 'commission35') is null;
  v_old := case when coalesce(c.data ->> 'commission', '') ~ '^[0-9]+(\.[0-9]+)?$'
                then (c.data ->> 'commission')::numeric else 5000 end;
  v_c50 := case when coalesce(c.data ->> 'commission50', '') ~ '^[0-9]+(\.[0-9]+)?$'
                then (c.data ->> 'commission50')::numeric else 0 end;
  v_c35 := case when coalesce(c.data ->> 'commission35', '') ~ '^[0-9]+(\.[0-9]+)?$'
                then (c.data ->> 'commission35')::numeric else 0 end;

  with o0 as (
    select
      data ->> 'status'                                   as status,
      data ->> 'date'                                     as date,
      data -> 'customer' ->> 'phone'                      as phone,
      case when data ->> 'subtotal' ~ '^[0-9]+(\.[0-9]+)?$'
           then (data ->> 'subtotal')::numeric else 0 end as subtotal,
      case when data -> 'coupon' ->> 'discount' ~ '^[0-9]+(\.[0-9]+)?$'
           then (data -> 'coupon' ->> 'discount')::numeric else 0 end as discount,
      (select coalesce(sum(case when (it ->> 'qty') ~ '^[0-9]+$' then (it ->> 'qty')::int else 1 end), 0)
         from jsonb_array_elements(case when jsonb_typeof(data -> 'items') = 'array'
                                        then data -> 'items' else '[]'::jsonb end) it
        where coalesce(it ->> 'size', '50ml') <> '35ml') as n50,
      (select coalesce(sum(case when (it ->> 'qty') ~ '^[0-9]+$' then (it ->> 'qty')::int else 1 end), 0)
         from jsonb_array_elements(case when jsonb_typeof(data -> 'items') = 'array'
                                        then data -> 'items' else '[]'::jsonb end) it
        where coalesce(it ->> 'size', '50ml') = '35ml') as n35
    from public.orders
    where upper(data -> 'coupon' ->> 'code') = c.code
  ),
  o as (
    select *, case when v_legacy then v_old else n50 * v_c50 + n35 * v_c35 end as earn
    from o0
  )
  select jsonb_build_object(
    'ok', true,
    'code', c.code,
    'creatorName', c.data ->> 'creatorName',
    'type', c.data ->> 'type',
    'value', c.data -> 'value',
    'active', coalesce((c.data ->> 'active')::boolean, false),
    'legacy', v_legacy,
    'commission', v_old,
    'commission50', v_c50,
    'commission35', v_c35,
    'users',          (select count(distinct phone) from o),
    'orders',         (select count(*) from o),
    'delivered',      (select count(*) from o where status = 'delivered'),
    'pending',        (select count(*) from o where status <> 'delivered'),
    'salesTotal',     (select coalesce(sum(subtotal), 0) from o),
    'discountTotal',  (select coalesce(sum(discount), 0) from o),
    'earned',         (select coalesce(sum(earn), 0) from o where status = 'delivered'),
    'pendingEarn',    (select coalesce(sum(earn), 0) from o where status <> 'delivered'),
    'recent', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
                 select date, status, subtotal from o order by date desc limit 20) x)
  ) into r;
  return r;
end $$;

grant execute on function public.creator_stats(text, text) to anon, authenticated;

-- 2) check_coupon: نفس نسخة إخفاء الحدود + إخفاء العمولتين الجديدتين عن الزبائن
create or replace function public.check_coupon(p_code text, p_customer_key text default 'device')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.coupons%rowtype;
  u integer;
  v_max integer;
begin
  select * into c from public.coupons where code = upper(trim(p_code));
  if not found then
    return jsonb_build_object('found', false);
  end if;
  select uses into u from public.coupon_usage
   where code = c.code and customer_key = left(coalesce(p_customer_key, 'device'), 20);
  v_max := coalesce((c.data ->> 'maxUses')::integer, 1);
  return jsonb_build_object(
    'found', true,
    'coupon', (c.data - 'creatorToken' - 'commission' - 'commission50' - 'commission35'
                      - 'creatorName' - 'maxUses' - 'usagePolicy')
              || jsonb_build_object(
                   'exhausted',    c.total_uses >= v_max,
                   'blockedForMe', coalesce(c.data ->> 'usagePolicy', 'once') = 'once' and coalesce(u, 0) >= 1
                 )
  );
end $$;

grant execute on function public.check_coupon(text, text) to anon, authenticated;
