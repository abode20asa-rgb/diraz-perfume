// Diraz service worker — يستقبل الإشعارات ويعرضها (ارفعه في الجذر بجانب index.html)
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function(event){
  var d = {};
  try { d = event.data ? event.data.json() : {}; } catch(e) {}
  event.waitUntil(self.registration.showNotification(d.title || 'ديراز للعطور 🌸', {
    body: d.body || '',
    icon: '/apple-touch-icon.png',
    badge: '/favicon.png',
    dir: 'rtl', lang: 'ar',
    data: { url: d.url || '/perfumes.html' }
  }));
});

self.addEventListener('notificationclick', function(event){
  event.notification.close();
  var url = new URL((event.notification.data && event.notification.data.url) || '/perfumes.html', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type:'window', includeUncontrolled:true }).then(function(list){
    for (var i=0;i<list.length;i++){ if (list[i].url.indexOf(self.location.origin)===0 && 'focus' in list[i]) { list[i].navigate(url); return list[i].focus(); } }
    return self.clients.openWindow(url);
  }));
});
