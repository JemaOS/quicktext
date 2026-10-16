/* Copyright (c) 2025 Jema Technology.
   Distributed under the license specified in the root directory of this project. */

// Service Worker for QuickText PWA
// Provides offline functionality and fast repeat loads.
//
// Strategy:
//  - Navigation (HTML) + manifest: network-first, cache fallback (fresh app shell).
//  - Everything else (js/css/third_party/icon/fonts): stale-while-revalidate
//    (instant from cache, refreshed in the background) so repeat visits do NOT
//    re-download the ~1.9 MB code payload.
//  - Precache is resilient: one failed asset never aborts the whole install.

const CACHE_NAME = 'quicktext-v28';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest-dark.json',
  '/css/app.css',
  '/css/print.css',
  '/js/chrome-shim.js',
  '/js/pwa-compat.js',
  '/js/app.js',
  '/js/editor-cm.js',
  '/js/i18n-template.js',
  '/js/search.js',
  '/js/settings.js',
  '/js/tabs.js',
  '/js/util.js',
  '/js/controllers/dialog.js',
  '/js/controllers/hotkeys.js',
  '/js/controllers/menu.js',
  '/js/controllers/search.js',
  '/js/controllers/settings.js',
  '/js/controllers/window.js',
  '/icon/48x48.png',
  '/icon/64x64.png',
  '/icon/96x96.png',
  '/icon/128x128.png',
  '/icon/192x192.png',
  '/icon/256x256.png',
  '/icon/512x512.png',
  '/third_party/jquery/jquery-1.8.3.min.js',
  '/third_party/material-components-web/material-components-web.min.css',
  '/third_party/material-components-web/material-components-web.min.js',
  '/third_party/material-design-icons/iconfont/material-icons.css',
  '/third_party/material-design-icons/iconfont/MaterialIcons-Regular.woff2',
  '/third_party/codemirror.next/codemirror.next.bin.js'
];

// Install event - precache assets resiliently (one failure must not abort all).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('QuickText: Caching app assets');
      await Promise.allSettled(
        ASSETS_TO_CACHE.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (isCacheableResponse(response)) {
              await cache.put(url, response);
            }
          } catch (error) {
            console.warn('QuickText: failed to precache', url, error);
          }
        })
      );
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
        )
      )
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - route requests to the right strategy
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle file handling API requests
  if (event.request.method === 'POST' && event.request.url.includes('/handle-file')) {
    event.respondWith(handleFileOpen(event.request));
    return;
  }

  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(handleFetch(event.request));
});

function isNavigate(request) {
  if (request.mode === 'navigate') {
    return true;
  }
  const { pathname } = new URL(request.url);
  return pathname === '/' || pathname.endsWith('.html');
}

async function handleFetch(request) {
  // Fresh app shell first (so a deploy is picked up), everything else served
  // from cache instantly and refreshed in the background.
  if (isNavigate(request)) {
    return networkFirst(request);
  }
  // The manifest drives the window/splash colour: always try the network so a
  // theme change (light/dark manifest) is picked up, cache as offline fallback.
  const { pathname } = new URL(request.url);
  if (pathname === '/manifest.json' || pathname === '/manifest-dark.json') {
    return networkFirst(request);
  }
  return staleWhileRevalidate(request);
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (isCacheableResponse(networkResponse)) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || caches.match('/index.html');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const networkPromise = fetch(request)
    .then((networkResponse) => {
      if (isCacheableResponse(networkResponse)) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await networkPromise;
  return networkResponse || caches.match('/index.html');
}

function isCacheableResponse(response) {
  return response && response.status === 200 && response.type === 'basic';
}

// Handle file open from file handler API
async function handleFileOpen(request) {
  try {
    const data = await request.json();
    const fileHandle = data.fileHandle;

    // Get the file content
    const file = await fileHandle.getFile();
    const content = await file.text();

    return new Response(
      JSON.stringify({
        success: true,
        content: content,
        name: file.name
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle messages from the main app
self.addEventListener('message', (event) => {
  // Verify the origin of the message for security
  if (!event.origin || event.origin !== self.location.origin) {
    return;
  }
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
