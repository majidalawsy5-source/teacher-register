const CACHE = 'teacher-register-cache-v3';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

// تثبيت: نخزّن كل ملف على حدة حتى لا يفشل التثبيت كله إذا ملف واحد ناقص
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

// تفعيل: حذف النسخ القديمة من الكاش
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // نترك الطلبات الخارجية للمتصفح

  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');

  if (isPage) {
    // الصفحة: نحاول الإنترنت أولاً (حتى تصل التحديثات تلقائياً)، وإذا ما كو نت نستخدم المخزّن
    e.respondWith(
      fetch(req)
        .then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return r;
        })
        .catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
    );
    return;
  }

  // باقي الملفات: من الكاش أولاً، وإذا غير موجود من الإنترنت
  e.respondWith(
    caches.match(req).then(c => c || fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(cache => cache.put(req, copy)); }
      return r;
    }))
  );
});
