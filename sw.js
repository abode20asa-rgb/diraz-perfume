// Diraz service worker — يستقبل الإشعارات ويعرضها (ارفعه في الجذر بجانب index.html)
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function(event){
  var d = null;
  try { d = event.data ? event.data.json() : null; } catch(e) {}
  // إشعار بلا حمولة = ردّ جديد من فريق الدعم
  if (!d) d = { title:'💬 فريق الدعم', body:'وصلك ردّ جديد على رسالتك، اضغط لقراءته.', url:'/perfumes.html?support=1', tag:'diraz-support' };
  var opts = {
    body: d.body || '',
    icon: '/apple-touch-icon.png',
    badge: '/favicon.png',
    dir: 'rtl', lang: 'ar',
    data: { url: d.url || '/perfumes.html' }
  };
  if (d.tag) { opts.tag = d.tag; opts.renotify = true; }
  event.waitUntil(self.registration.showNotification(d.title || 'ديراز للعطور 🌸', opts));
});

self.addEventListener('notificationclick', function(event){
  event.notification.close();
  var url = new URL((event.notification.data && event.notification.data.url) || '/perfumes.html', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type:'window', includeUncontrolled:true }).then(function(list){
    for (var i=0;i<list.length;i++){ if (list[i].url.indexOf(self.location.origin)===0 && 'focus' in list[i]) { list[i].navigate(url); return list[i].focus(); } }
    return self.clients.openWindow(url);
  }));
});
