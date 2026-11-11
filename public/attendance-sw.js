/* Attendance offline cache. Never cache writes, authentication or signed evidence URLs. */
const VERSION = 'ct-attendance-v1';
const OWNER = `${VERSION}-owner`;
const ASSETS = `${VERSION}-assets`;
const MAX_AGE = 12 * 60 * 60 * 1000;
const warmed = new Map();
let ownerGeneration = 0;
const allowed = path => ['/personal', '/attendance', '/worker-attendance', '/projects', '/applications'].some(prefix => path === prefix || path.startsWith(prefix + '/'));
const offlineApi = path => path === '/api/v1/attendance/dashboard' || path === '/api/v1/worker-attendance/today';
async function owner() { const response = await (await caches.open(OWNER)).match('/__attendance_owner'); return response ? response.text() : ''; }
async function clearPrivate() { ownerGeneration++; warmed.clear(); for (const key of await caches.keys()) if (key.startsWith('ct-attendance-') && key !== ASSETS) await caches.delete(key); }
async function warmAssets(response) {
  if (!response.headers.get('content-type')?.includes('text/html')) return;
  const html = await response.clone().text(), cache = await caches.open(ASSETS);
  const paths = [...new Set(html.match(/\/_next\/static\/[^\s"'<>\\]+/g) || [])];
  await Promise.all(paths.slice(0,100).map(async path => { if (await cache.match(path)) return; try { const asset = await fetch(path); if (asset.ok) await cache.put(path,asset); } catch {} }));
}
async function put(cache, key, response) {
  if (!response.ok || response.redirected) return;
  const headers = new Headers(response.headers); headers.set('x-offline-saved-at', String(Date.now()));
  await cache.put(key, new Response(await response.clone().blob(), {status: response.status, headers}));
  const keys = await cache.keys(); if (keys.length > 150) await cache.delete(keys[0]);
}
async function cached(cache, key) {
  const response = await cache.match(key);
  return response && Date.now() - Number(response.headers.get('x-offline-saved-at')) < MAX_AGE ? response : undefined;
}
self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', event => { event.waitUntil((async () => { for (const key of await caches.keys()) if (key.startsWith('ct-attendance-') && !key.startsWith(VERSION)) await caches.delete(key); await self.clients.claim(); })()); });
self.addEventListener('message', event => {
  if (event.data?.type === 'CLEAR_ATTENDANCE_CACHE') { event.waitUntil(clearPrivate()); return; }
  if (event.data?.type !== 'ATTENDANCE_OWNER' || !/^[a-z0-9-]{1,100}$/i.test(event.data.id || '')) return;
  event.waitUntil((async () => {
    const id = event.data.id, previous = await owner(); if (previous !== id) await clearPrivate();
    await (await caches.open(OWNER)).put('/__attendance_owner', new Response(id));
    const cache = await caches.open(`${VERSION}-private-${id}`), generation = ownerGeneration;
    const all = !warmed.has(id) || Date.now() - warmed.get(id) > 300000;
    warmed.set(id,Date.now());
    for (const path of (all ? ['/personal', '/attendance/quick', '/worker-attendance/today', '/worker-attendance/offline', '/attendance/history', '/applications', '/projects', event.data.path] : [event.data.path]).filter(Boolean)) {
      if (!allowed(new URL(path, self.location.origin).pathname)) continue;
      try { const response = await fetch(path, {credentials:'same-origin',headers:{Accept:'text/html'}}); if (generation !== ownerGeneration || await owner() !== id) return; await warmAssets(response); await put(cache, path, response); } catch { /* Previously visited pages remain available. */ }
    }
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/logout' || url.pathname === '/api/v1/auth/logout' || url.pathname === '/api/v1/auth/login') {
    event.respondWith((async () => { await clearPrivate(); return fetch(request); })()); return;
  }
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith((async () => { const cache = await caches.open(ASSETS); const saved = await cache.match(request); if (saved) return saved; const response = await fetch(request); if (response.ok) await cache.put(request, response.clone()); return response; })()); return;
  }
  if (!(request.mode === 'navigate' && allowed(url.pathname)) && !offlineApi(url.pathname)) return;
  event.respondWith((async () => {
    const id = await owner(); if (!id) return fetch(request);
    const cache = await caches.open(`${VERSION}-private-${id}`), key = url.pathname === "/worker-attendance/offline" ? url.pathname : url.pathname + url.search;
    try { const response = await fetch(request); if (response.status === 401 || response.status === 403) { await clearPrivate(); return response; } if (await owner() === id) await put(cache, key, response); return response; }
    catch { const saved = await cached(cache, key); if (saved) return saved;
      const draft = url.pathname.match(/^\/worker-attendance\/sessions\/([^/]+)(?:\/(roster|photos|review))?$/);
      if (draft && request.mode === 'navigate') return Response.redirect(new URL(`/worker-attendance/offline?draft=${encodeURIComponent(draft[1])}&step=${draft[2] || 'roster'}`,self.location.origin));
      if (request.mode === 'navigate') return new Response('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chấm công offline</title><body style="font:16px system-ui;padding:24px;background:#f4f8f5;color:#173e30"><h1>Đang ngoại tuyến</h1><p>Trang này chưa được lưu trên thiết bị.</p><p><a href="/personal">Cá nhân</a> · <a href="/worker-attendance/today">Điểm danh</a></p><button onclick="location.reload()">Thử lại</button></body></html>', {status:200,headers:{'Content-Type':'text/html; charset=utf-8'}});
      return Response.error();
    }
  })());
});
