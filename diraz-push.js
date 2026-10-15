// Diraz push client — اشتراك الزبون بالإشعارات + مزامنة حالة السلة
(function(){
  var VAPID_PUBLIC = 'PUT_VAPID_PUBLIC_KEY_HERE';   // ← من: npx web-push generate-vapid-keys
  var supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  var timer = null;

  function key(b64){
    var p = '='.repeat((4 - b64.length % 4) % 4), s = (b64 + p).replace(/-/g,'+').replace(/_/g,'/');
    var raw = atob(s), out = new Uint8Array(raw.length);
    for (var i=0;i<raw.length;i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function rpc(n,a){ return (window.DirazCloud ? DirazCloud.rpc(n,a) : Promise.resolve()).catch(function(){}); }
  function cartCount(){ try{ return (JSON.parse(localStorage.getItem('diraz_cart')||'[]')||[]).length; }catch(e){ return 0; } }
  function phone(){ try{ var c = JSON.parse(localStorage.getItem('diraz_customer')||'{}'); return (c.phone||'').replace(/\D/g,'') || null; }catch(e){ return null; } }

  async function reg(){
    var r = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return r;
  }
  async function currentSub(){ var r = await reg(); return r.pushManager.getSubscription(); }

  async function subscribe(){
    var r = await reg();
    var s = await r.pushManager.getSubscription();
    if (!s) s = await r.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:key(VAPID_PUBLIC) });
    var j = s.toJSON();
    await rpc('push_subscribe', { p_endpoint:j.endpoint, p_p256dh:j.keys.p256dh, p_auth:j.keys.auth, p_phone:phone() });
    await rpc('push_cart', { p_endpoint:j.endpoint, p_count:cartCount() });
    return s;
  }

  async function syncCart(){
    if (!supported || Notification.permission !== 'granted') return;
    var s = await currentSub(); if (!s) return;
    rpc('push_cart', { p_endpoint:s.endpoint, p_count:cartCount() });
  }

  window.DirazPush = {
    cart: function(){ clearTimeout(timer); timer = setTimeout(function(){ syncCart().catch(function(){}); }, 3000); },
    ordered: async function(){
      if (!supported || Notification.permission !== 'granted') return;
      var s = await currentSub(); if (s) rpc('push_ordered', { p_endpoint:s.endpoint });
    }
  };

  function banner(){
    if (document.getElementById('pushBanner')) return;
    var d = document.createElement('div'); d.id = 'pushBanner';
    d.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9998;width:min(92vw,420px);background:#fff;color:#c45a7a;border-radius:20px;padding:14px 16px;box-shadow:0 10px 40px rgba(196,90,122,.35);font-family:Cairo,sans-serif;direction:rtl;display:flex;align-items:center;gap:10px';
    d.innerHTML = '<div style="flex:1;font-weight:700;font-size:.88rem;line-height:1.6">🔔 فعّل الإشعارات لتصلك العروض والعطور الجديدة</div>' +
      '<button id="pushYes" style="background:#c45a7a;color:#fff;border:0;border-radius:50px;padding:8px 16px;font-family:inherit;font-weight:800;cursor:pointer">تفعيل</button>' +
      '<button id="pushNo" style="background:none;border:0;color:#999;font-size:1.1rem;cursor:pointer" aria-label="إغلاق">✕</button>';
    document.body.appendChild(d);
    document.getElementById('pushNo').onclick = function(){ localStorage.setItem('diraz_push_dismiss', String(Date.now())); d.remove(); };
    document.getElementById('pushYes').onclick = async function(){
      d.remove();
      try{ if (await Notification.requestPermission() === 'granted') await subscribe(); }catch(e){}
    };
  }

  async function start(){
    if (!supported || !VAPID_PUBLIC || VAPID_PUBLIC.indexOf('PUT_') === 0) return;
    if (Notification.permission === 'granted') { subscribe().catch(function(){}); return; }
    if (Notification.permission === 'denied') return;
    var last = Number(localStorage.getItem('diraz_push_dismiss') || 0);
    if (Date.now() - last < 7*86400000) return;
    setTimeout(banner, 15000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
