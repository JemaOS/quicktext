/* Copyright (c) 2025 Jema Technology.
   Distributed under the license specified in the root directory of this project. */

// Service Worker for QuickText PWA
// Provides offline functionality and caching

const CACHE_NAME = 'quicktext-v8';
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

  // Use async function for cleaner code
  event.respondWith(handleFetch(event.request));
});

async function handleFetch(request) {
  try {
    // Network first for HTML, JS, and CSS to always get latest code
    const url = new URL(request.url);
    const isCodeAsset = url.pathname.endsWith('.js') ||
                        url.pathname.endsWith('.css') ||
                        url.pathname.endsWith('.html') ||
                        url.pathname === '/';

    if (isCodeAsset) {
      try {
        const networkResponse = await fetch(request);
        if (isCacheableResponse(networkResponse)) {
          const responseToCache = networkResponse.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, responseToCache);
        }
        return networkResponse;
      } catch (error) {
        // Network failed, fall back to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        return caches.match('/index.html');
      }
    }

    // Cache first for static assets (images, fonts, etc.)
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Not in cache, fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (isCacheableResponse(networkResponse)) {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    // If both cache and network fail, return the offline page
    return caches.match('/index.html');
  }
}

function isCacheableResponse(response) {
  return response && 
         response.status === 200 && 
         response.type === 'basic';
}

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
