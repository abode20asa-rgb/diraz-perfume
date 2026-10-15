// Diraz push sender — يُستدعى كل 5 دقائق من pg_cron، وعند "إرسال الآن" من لوحة الأدمن
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@dirazperfume.com",
  Deno.env.get("VAPID_PUBLIC")!,
  Deno.env.get("VAPID_PRIVATE")!,
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-cron-secret",
};

// ── نصوص الإشعارات التلقائية (تتبدّل بالدور حتى ما تتكرر) ──
const PROMO = [
  { title: "عطور فخمة بانتظارك 🌸", body: "تشكيلة جديدة وفواحة تدوم طول اليوم — اكتشفها الآن من ديراز." },
  { title: "وصلت أصناف جديدة ✨", body: "عطور بثبات عالي ورائحة تلفت الانتباه. تعال شوف الجديد." },
  { title: "ديراز للعطور 💖", body: "فواحة، فخمة، وبسعر يناسبك. جرّب عطرك القادم اليوم." },
  { title: "رائحة تتذكرها الناس 🌷", body: "عطور مختارة بعناية لتناسب ذوقك. شوف آخر الإضافات." },
];
const CART = [
  { title: "سلتك بانتظارك 🛍️", body: "عطورك جاهزة بالسلة، أكمل طلبك قبل ما تنفذ الكمية." },
  { title: "لا تفوّت عطرك 💕", body: "اخترت الأفضل، وبقى خطوة وحدة ويوصلك لباب بيتك." },
  { title: "ما زالت السلة تنتظرك 🌸", body: "العطور اللي عجبتك لسه موجودة، خلّص طلبك الآن." },
  { title: "عطرك يشتاق إلك ✨", body: "سلتك جاهزة، اطلبها اليوم وخلّي رائحتك تحجي عنك." },
  { title: "كمّل طلبك 🎀", body: "الكميات محدودة وسلتك بانتظارك، لا تخليها تروح منك." },
];

const hash = (s: string) => [...s].reduce((a, c) => (a + c.charCodeAt(0)) % 100000, 0);
const baghdadHour = () => new Date(Date.now() + 3 * 3600_000).getUTCHours(); // UTC+3 بدون توقيت صيفي

let lastError = "";
async function sendOne(sub: any, payload: unknown): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload), { TTL: 60 * 60 * 12 },
    );
    return true;
  } catch (e: any) {
    lastError = `status=${e?.statusCode ?? "?"} ${String(e?.body ?? e?.message ?? e).slice(0, 200)}`;
    console.error("push failed:", lastError);
    if (e?.statusCode === 404 || e?.statusCode === 410) {
      await sb.from("push_subs").delete().eq("endpoint", sub.endpoint); // اشتراك منتهي
    }
    return false;
  }
}

async function allSubs() {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from("push_subs").select("*").range(from, from + 999);
    if (!data?.length) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function inBatches<T>(items: T[], fn: (x: T) => Promise<boolean>, size = 40) {
  let ok = 0;
  for (let i = 0; i < items.length; i += size) {
    const r = await Promise.all(items.slice(i, i + size).map(fn));
    ok += r.filter(Boolean).length;
  }
  return ok;
}

// 1) الرسائل المجدولة / الجماعية المستحقة
async function runDueMessages(subs: any[]) {
  const { data: due } = await sb.from("push_messages").select("*")
    .eq("status", "scheduled").lte("send_at", new Date().toISOString());
  let n = 0, totalSent = 0, totalTried = 0;
  for (const m of due ?? []) {
    // "حجز" الرسالة حتى ما تنرسل مرتين لو تزامن تشغيلان
    const { data: claimed } = await sb.from("push_messages")
      .update({ status: "sending" }).eq("id", m.id).eq("status", "scheduled").select("id");
    if (!claimed?.length) continue;
    const sent = await inBatches(subs, (s) => sendOne(s, { title: m.title, body: m.body, url: m.url }));
    await sb.from("push_messages").update({ status: "sent", sent_count: sent }).eq("id", m.id);
    n++; totalSent += sent; totalTried += subs.length;
  }
  return { n, totalSent, totalTried };
}

// 2) الإشعارات التلقائية: كل زبون مرة كل يومين، بوقت مختلف حسب حالته
async function runAuto(subs: any[]) {
  const now = Date.now();
  const hour = baghdadHour();
  const todo = subs.filter((s) => {
    const ref = new Date(s.last_auto_at ?? s.created_at).getTime();
    if (now - ref < 46 * 3600_000) return false;                       // ما مرّ يومين
    const hasCart = s.cart_count > 0 && s.cart_at &&
      now - new Date(s.cart_at).getTime() > 3600_000 &&                // ترك السلة من أكثر من ساعة
      (!s.last_order_at || new Date(s.last_order_at) < new Date(s.cart_at));
    s._cart = !!hasCart;
    const slot = hasCart ? (hash(s.endpoint) % 2 ? 20 : 10) : 10;      // سلة: 10ص أو 8م — بدون سلة: 10ص
    return hour === slot;
  });
  let n = 0;
  await inBatches(todo, async (s) => {
    const pool = s._cart ? CART : PROMO;
    const msg = pool[(s.auto_count ?? 0) % pool.length];
    const url = s._cart ? "/perfumes.html" : "/perfumes.html";
    const ok = await sendOne(s, { ...msg, url });
    if (ok) {
      n++;
      await sb.from("push_subs").update({ last_auto_at: new Date().toISOString(), auto_count: (s.auto_count ?? 0) + 1 })
        .eq("endpoint", s.endpoint);
    }
    return ok;
  });
  return n;
}

async function authorized(req: Request) {
  const secret = Deno.env.get("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") === secret) return true;
  const tok = (req.headers.get("authorization") ?? "").replace(/^Bearer /i, "");
  if (!tok) return false;
  const { data } = await sb.auth.getUser(tok);
  const email = data?.user?.email?.toLowerCase();
  return !!email && email === (Deno.env.get("ADMIN_EMAIL") ?? "").toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!(await authorized(req))) return new Response("unauthorized", { status: 401, headers: CORS });
  const subs = await allSubs();
  const m = await runDueMessages(subs);
  const auto = await runAuto(subs);
  return new Response(JSON.stringify({ ok: true, subs: subs.length, messages: m.n, sent: m.totalSent, tried: m.totalTried, auto, error: lastError }),
    { headers: { ...CORS, "Content-Type": "application/json" } });
});
