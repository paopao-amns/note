// Service Worker — 缓存策略：预缓存核心文件，运行时缓存 CDN 资源
const CACHE_NAME = "diary-v9";

// 预缓存的文件列表（部署后首次访问即缓存）
const PRECACHE_URLS = [
  "/note/",
  "/note/index.html",
  "/note/css/style.css?v=9",
  "/note/js/app.js?v=9",
  "/note/js/db.js?v=9",
  "/note/js/editor.js?v=9",
  "/note/js/list.js?v=9",
  "/note/js/calendar.js?v=9",
  "/note/js/search.js?v=9",
  "/note/assets/icon.svg"
];

// 安装：预缓存核心文件
self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：Cache-First 策略
self.addEventListener("fetch", function(event) {
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) { return cached; }
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function() {
        // 网络失败且无缓存时的降级处理
        return new Response("离线状态，请连接网络后重试", { status: 503 });
      });
    })
  );
});
