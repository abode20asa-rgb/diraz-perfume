-- ═══════════════════════════════════════════════════════════
--  Diraz — صفحة منشئ المحتوى (إحصائيات الكود)
--  شغّل هذا الملف كامل في Supabase → SQL Editor → Run
--  (بعد supabase-security.sql)
-- ═══════════════════════════════════════════════════════════

-- 1) إحصائيات الكود — ما تشتغل إلا إذا الرابط يحمل التوكن السري الصحيح
create or replace function public.creator_stats(p_code text, p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.coupons%rowtype;
  v_commission numeric;
  r jsonb;
begin
  select * into c from public.coupons where code = upper(trim(p_code));
  if not found
     or coalesce(c.data ->> 'creatorToken', '') = ''
     or (c.data ->> 'creatorToken') <> coalesce(p_token, '') then
    return jsonb_build_object('ok', false);
  end if;

  v_commission := case when coalesce(c.data ->> 'commission', '') ~ '^[0-9]+(\.[0-9]+)?$'
                       then (c.data ->> 'commission')::numeric else 5000 end;

  with o as (
    select
      data ->> 'status'                                   as status,
      data ->> 'date'                                     as date,
      data -> 'customer' ->> 'phone'                      as phone,
      case when data ->> 'subtotal' ~ '^[0-9]+(\.[0-9]+)?$'
           then (data ->> 'subtotal')::numeric else 0 end as subtotal,
      case when data -> 'coupon' ->> 'discount' ~ '^[0-9]+(\.[0-9]+)?$'
           then (data -> 'coupon' ->> 'discount')::numeric else 0 end as discount
    from public.orders
    where upper(data -> 'coupon' ->> 'code') = c.code
  )
  select jsonb_build_object(
    'ok', true,
    'code', c.code,
    'creatorName', c.data ->> 'creatorName',
    'type', c.data ->> 'type',
    'value', c.data -> 'value',
    'active', coalesce((c.data ->> 'active')::boolean, false),
    'maxUses', c.data -> 'maxUses',
    'totalUses', c.total_uses,
    'commission', v_commission,
    'users',          (select count(distinct phone) from o),
    'orders',         (select count(*) from o),
    'delivered',      (select count(*) from o where status = 'delivered'),
    'pending',        (select count(*) from o where status <> 'delivered'),
    'salesTotal',     (select coalesce(sum(subtotal), 0) from o),
    'discountTotal',  (select coalesce(sum(discount), 0) from o),
    'earned',         (select count(*) from o where status = 'delivered') * v_commission,
    'pendingEarn',    (select count(*) from o where status <> 'delivered') * v_commission,
    'recent', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
                 select date, status, subtotal from o order by date desc limit 20) x)
  ) into r;
  return r;
end $$;

grant execute on function public.creator_stats(text, text) to anon, authenticated;

-- 2) ⚠️ مهم: تعديل check_coupon حتى ما يكشف التوكن السري ولا العمولة للزبائن
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
    'coupon', (c.data - 'creatorToken' - 'commission' - 'creatorName')
              || jsonb_build_object('totalUses', c.total_uses),
    'myUses', coalesce(u, 0)
  );
end $$;
