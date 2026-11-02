const CACHE_NAME = 'chaekugajungwon-v1';

// 오프라인에서도 보여줄 핵심 페이지/자산
const PRECACHE_URLS = [
  '/',
  '/offline',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // API / Supabase 요청은 캐시하지 않음
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('kakao') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // 네트워크 우선, 실패 시 캐시 → 오프라인 페이지
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/offline') || new Response('오프라인 상태입니다.', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
          }
        })
      )
  );
});
