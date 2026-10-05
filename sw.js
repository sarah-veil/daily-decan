/* The Daily Decan — service worker
   Scope: entire app. Strategy: cache-first for the shell, so the app opens
   offline and never touches the network after the first visit.
   Nothing is ever uploaded; this file makes no outbound requests. */

const CACHE = "daily-decan-v2";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./og.png"
];

self.addEventListener("install", event => {
  // cache:"reload" 绕过 HTTP 缓存，保证更新时拿到的是服务器上的新文件，
  // 而不是浏览器缓存里的旧页面。逐个 put 而不是 addAll：任何一个文件
  // 失败也不会让整次安装作废。
  event.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(SHELL.map(u =>
        fetch(new Request(u, { cache: "reload" }))
          .then(r => (r && r.ok) ? c.put(u, r) : null)
          .catch(() => null)
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
