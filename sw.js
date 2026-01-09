/* sw.js */
"use strict";

const CACHE_VERSION = "imv_vla_v1.0.0";
const STATIC_CACHE = `${CACHE_VERSION}__static`;
const RUNTIME_CACHE = `${CACHE_VERSION}__runtime`;

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./packs/base/imports/content.json"
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(STATIC_ASSETS);
    self.skipWaiting();
  })());
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => {
      if (!k.startsWith(CACHE_VERSION)) return caches.delete(k);
      return Promise.resolve();
    }));
    self.clients.claim();
  })());
});

// Helper: stale-while-revalidate for content.json
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(async (res) => {
    if (res && res.ok) await cache.put(request, res.clone());
    return res;
  }).catch(() => null);

  return cached || (await fetchPromise) || new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
}

// Cache-first for static
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    // Offline fallback to index for navigation requests
    if (request.mode === "navigate") {
      const fallback = await cache.match("./index.html");
      if (fallback) return fallback;
    }
    return new Response("Offline", { status: 503 });
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // content.json: SWR
  if (url.pathname.endsWith("/packs/base/imports/content.json") || url.pathname.endsWith("packs/base/imports/content.json")) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Navigation: return cached index.html (app uses hash routing)
  if (req.mode === "navigate") {
    event.respondWith(cacheFirst("./index.html"));
    return;
  }

  // Static assets: cache-first
  event.respondWith(cacheFirst(req));
});
