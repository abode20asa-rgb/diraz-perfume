-- ═══════════════════════════════════════════════════════════
--  تشغيل المرسِل كل 5 دقائق (شغّله بعد نشر الدالة push-sender)
--  غيّر YOUR_CRON_SECRET لنفس القيمة اللي حطيتها بـ supabase secrets
--  (فعّل Extensions: pg_cron و pg_net من Database → Extensions)
-- ═══════════════════════════════════════════════════════════
select cron.schedule(
  'diraz-push-sender',
  '*/5 * * * *',
  $$ select net.http_post(
       url     := 'https://knqtuvcvqsupltbivkfb.supabase.co/functions/v1/push-sender',
       headers := '{"Content-Type":"application/json","x-cron-secret":"YOUR_CRON_SECRET"}'::jsonb,
       body    := '{}'::jsonb
     ); $$
);
