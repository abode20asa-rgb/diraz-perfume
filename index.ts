// send-code: يولّد كود من 6 أرقام ويرسله لواتساب الزبون عبر Evolution API
// Secrets المطلوبة: EVO_URL, EVO_INSTANCE, EVO_APIKEY, OTP_SALT
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const GLOBAL_PER_HOUR = 60; // سقف كل الأكواد بالساعة (يحمي رقمك من الحظر لو أحد سوّى سبام)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const phone = String(body?.phone ?? "").replace(/\D/g, "");
  if (!/^07\d{9}$/.test(phone)) return json({ error: "bad_phone" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = Date.now();

  // التحقق متوقف من لوحة الأدمن؟
  const { data: cfg } = await sb.from("site_config").select("value").eq("key", "otp_enabled").maybeSingle();
  if (!(cfg && (cfg.value === true || cfg.value === "true"))) return json({ error: "disabled" }, 403);

  // سقف عام
  const since1h = new Date(now - 3600_000).toISOString();
  const { count } = await sb.from("otp_codes").select("phone", { count: "exact", head: true }).gte("last_sent_at", since1h);
  if ((count ?? 0) >= GLOBAL_PER_HOUR) return json({ error: "busy" }, 429);

  // حدود لكل رقم: مرة كل 60 ثانية، و5 مرات بالساعة
  const { data: row } = await sb.from("otp_codes").select("*").eq("phone", phone).maybeSingle();
  let sentCount = 1, windowStart = new Date(now).toISOString();
  if (row) {
    const secs = (now - new Date(row.last_sent_at).getTime()) / 1000;
    if (secs < 60) return json({ error: "wait", wait: Math.ceil(60 - secs) }, 429);
    if (now - new Date(row.window_start).getTime() < 3600_000) {
      if (row.sent_count >= 5) return json({ error: "limit" }, 429);
      sentCount = row.sent_count + 1;
      windowStart = row.window_start;
    }
  }

  const buf = new Uint32Array(1); crypto.getRandomValues(buf);
  const code = String(buf[0] % 1_000_000).padStart(6, "0");
  const hash = await sha256(`${Deno.env.get("OTP_SALT") ?? ""}:${phone}:${code}`);

  await sb.from("otp_codes").upsert({
    phone, code_hash: hash,
    expires_at: new Date(now + 5 * 60_000).toISOString(),
    attempts: 0,
    last_sent_at: new Date(now).toISOString(),
    sent_count: sentCount, window_start: windowStart,
  });

  // الإرسال عبر Evolution API (الرقم بصيغة دولية بدون +)
  const evo = (Deno.env.get("EVO_URL") ?? "").replace(/\/+$/, "");
  const inst = encodeURIComponent(Deno.env.get("EVO_INSTANCE") ?? "");
  try {
    const res = await fetch(`${evo}/message/sendText/${inst}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: Deno.env.get("EVO_APIKEY") ?? "" },
      body: JSON.stringify({
        number: "964" + phone.slice(1),
        text: `🌸 ديراز\nرمز التحقق الخاص بك: *${code}*\nصالح لمدة 5 دقائق. لا تشاركه مع أحد.`,
      }),
    });
    if (!res.ok) throw new Error("evo_" + res.status);
  } catch (_e) {
    await sb.from("otp_codes").delete().eq("phone", phone);
    return json({ error: "send_failed" }, 502);
  }
  return json({ ok: true, expires_in: 300 });
});
