/* Service worker: офлайн-робота додатку.
   При оновленні index.html підвищуйте номер версії кешу (v45 → v46), щоб
   користувачі отримали свіжу версію. */
const CACHE = 'nutri-konstruktor-v45';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './training-constructor-preview.jpg', './training-exercise-preview.webp',
  './balanced-plate-banner-wide.jpg',
  './i18n-ui.js', './i18n-safety.js', './i18n-foods-1.js', './i18n-foods-2.js', './i18n-recipes.js', './i18n-sprint2.js', './i18n-adaptive.js', './i18n-checkin.js', './i18n-weighing.js', './i18n.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* мережа спершу (щоб оновлення підтягувались), кеш — як офлайн-резерв */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const sameOrigin = new URL(e.request.url).origin === self.location.origin;
        if (sameOrigin && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then(hit => hit || caches.match('./index.html')))
  );
});
