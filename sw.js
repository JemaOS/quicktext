/* Copyright (c) 2025 Jema Technology.
   Distributed under the license specified in the root directory of this project. */

// Service Worker for QuickText PWA
// Provides offline functionality and caching

const CACHE_NAME = 'quicktext-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
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
  '/icon/16x16.png',
  '/icon/32x32.png',
  '/icon/48x48.png',
  '/icon/64x64.png',
  '/icon/96x96.png',
  '/icon/128x128.png',
  '/icon/256x256.png',
  '/third_party/jquery/jquery-1.8.3.min.js',
  '/third_party/material-components-web/material-components-web.min.css',
  '/third_party/material-components-web/material-components-web.min.js',
  '/third_party/material-design-icons/iconfont/material-icons.css',
  '/third_party/codemirror.next/codemirror.next.bin.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('QuickText: Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
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

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((networkResponse) => {
          // Check if response is valid for caching
          const isCacheable = networkResponse && 
                              networkResponse.status === 200 && 
                              networkResponse.type === 'basic';
          
          if (!isCacheable) {
            return networkResponse;
          }
          
          // Cache the successful response
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        });
      })
      .catch(() => {
        // If both cache and network fail, return the offline page
        return caches.match('/index.html');
      })
  );
});

// Handle file open from file handler API
async function handleFileOpen(request) {
  try {
    const data = await request.json();
    const fileHandle = data.fileHandle;
    
    // Get the file content
    const file = await fileHandle.getFile();
    const content = await file.text();
    
    return new Response(JSON.stringify({
      success: true,
      content: content,
      name: file.name
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
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
