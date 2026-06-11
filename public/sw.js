/* POXY WORLD — Service worker: Web Push (O3) + landing asset cache (L2) */
'use strict';

var LANDING_CACHE = 'poxy-landing-v1';
var LANDING_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/poxy-landing-page.css',
  '/assets/poxy-landing-page.js',
  '/assets/poxy-theme.css',
  '/icon-192.png',
  '/badge-72.png',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(LANDING_CACHE).then(function (cache) {
      return cache.addAll(LANDING_ASSETS).catch(function () {
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) {
            return k.startsWith('poxy-landing-') && k !== LANDING_CACHE;
          })
          .map(function (k) {
            return caches.delete(k);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  var path = url.pathname;
  var isLandingAsset =
    path === '/' ||
    path === '/index.html' ||
    path === '/manifest.json' ||
    path.indexOf('/assets/poxy-landing-page') === 0 ||
    path === '/icon-192.png' ||
    path === '/badge-72.png';
  if (!isLandingAsset) return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (res) {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        var copy = res.clone();
        caches.open(LANDING_CACHE).then(function (cache) {
          cache.put(event.request, copy);
        });
        return res;
      });
    })
  );
});

self.addEventListener('push', function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  var title = data.title || 'POXY WORLD';
  var options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    tag: data.tag || 'poxy-notification',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var client = list[i];
        if (client.url.indexOf(self.location.origin) === 0 && 'focus' in client) {
          return client.focus().then(function (c) {
            if ('navigate' in c) return c.navigate(url);
            return c;
          });
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
