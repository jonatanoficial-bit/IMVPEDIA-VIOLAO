/* sw.js */
"use strict";

const CACHE_VERSION = "imv_vla_v1.0.1";
const STATIC_CACHE = `${CACHE_VERSION}__static`;
const RUNTIME_CACHE = `${CACHE_VERSION}__runtime`;

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./packs/base/imports/content.json",
  "./icons/icon.svg",
  "./icons/icon-maskable.svg"
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
      return Promise.resolve(true);
    }));
    self.clients.claim();
  })());
});

// Fetch strategy:
// - HTML/navigation: network-first (safe updates), fallback to cache
// - static: cache-first
// - other: stale-while-revalidate
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Navigation requests (HTML)
  const isNav = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isNav) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        return cached || (await caches.match("./index.html")) || new Response("Offline", { status: 200 });
      }
    })());
    return;
  }

  // Cache-first for known static
  if (STATIC_ASSETS.some((p) => url.pathname.endsWith(p.replace("./", "")))) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const fresh = await fetch(req);
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    })());
    return;
  }

  // Stale-while-revalidate for others
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const fetchPromise = fetch(req).then(async (fresh) => {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    }).catch(() => cached);

    return cached || fetchPromise;
  })());
});
