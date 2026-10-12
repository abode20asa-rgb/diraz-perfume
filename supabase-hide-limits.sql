-- ═══════════════════════════════════════════════════════════
--  Diraz — إخفاء عدد الاستخدامات والعمولة عن الزبائن
--  شغّل هذا الملف كامل في Supabase → SQL Editor → Run
--  (بعد supabase-security.sql و supabase-creators.sql)
--  ⚠️ شغّله قبل رفع perfumes.html الجديد
-- ═══════════════════════════════════════════════════════════

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
    'coupon', (c.data - 'creatorToken' - 'commission' - 'creatorName' - 'maxUses' - 'usagePolicy')
              || jsonb_build_object(
                   'exhausted',    c.total_uses >= v_max,
                   'blockedForMe', coalesce(c.data ->> 'usagePolicy', 'once') = 'once' and coalesce(u, 0) >= 1
                 )
  );
end $$;

grant execute on function public.check_coupon(text, text) to anon, authenticated;
