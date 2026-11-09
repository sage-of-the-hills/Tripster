/* Tripster service worker: keeps the app working offline and, where the
   browser allows, re-checks forecasts in the background for weather alerts.
   Raise VERSION whenever any file changes so phones pick up the update. */
const VERSION = "2.18.0";
const CACHE = "tripster-" + VERSION;
const MAPS = "tripster-maps"; // saved map tiles: kept across app updates
const SHELL = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "wx.js",
  "config.json",
  "manifest.webmanifest",
  "fonts/fonts.css",
  "fonts/atkinson-hyperlegible-latin-400-normal.woff2",
  "fonts/atkinson-hyperlegible-latin-700-normal.woff2",
  "fonts/atkinson-hyperlegible-latin-ext-400-normal.woff2",
  "fonts/atkinson-hyperlegible-latin-ext-700-normal.woff2",
  "fonts/bricolage-grotesque-latin-600-normal.woff2",
  "fonts/bricolage-grotesque-latin-800-normal.woff2",
  "fonts/bricolage-grotesque-latin-ext-600-normal.woff2",
  "fonts/bricolage-grotesque-latin-ext-800-normal.woff2",
  "fonts/jetbrains-mono-latin-500-normal.woff2",
  "fonts/jetbrains-mono-latin-ext-500-normal.woff2",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "maps/iceland.jpg",
  "vendor/maplibre-gl.js",
  "vendor/maplibre-gl.css",
  "data/countries.json",
  "trips/index.json"
];

importScripts("wx.js");

/* Maps come from OpenFreeMap. Tiles are stored under a key without the weekly version in their
   address, so maps saved before the trip still open after OpenFreeMap publishes new ones.
   Style, fonts and icons are served from the saved copy at once and refreshed when there's signal. */
const OFM = "https://tiles.openfreemap.org/";
const TILE = /^https:\/\/tiles\.openfreemap\.org\/planet\/[^/]+\/(\d+)\/(\d+)\/(\d+)\.pbf/;
async function mapFetch(req) {
  const m = req.url.match(TILE);
  if (m) {
    const key = OFM + "planet/_/" + m[1] + "/" + m[2] + "/" + m[3] + ".pbf";
    const hit = await caches.match(key); if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) { const b = await res.clone().blob(); caches.open(MAPS).then(c => c.put(key, new Response(b, { headers: { "content-type": "application/x-protobuf" } }))); }
      return res;
    } catch (err) { return new Response(null, { status: 204 }); } // no signal and not saved: an empty patch of map
  }
  const hit = await caches.match(req, { ignoreSearch: true });
  const net = fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(MAPS).then(c => c.put(req, copy)); } return res; });
  if (hit) { net.catch(() => {}); return hit; }
  return net.catch(() => new Response(null, { status: 504 }));
}

self.addEventListener("install", e => {
  // cache: "reload" skips the browser's own HTTP cache, so an update never stores yesterday's files
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => (k.startsWith("tripster-") || k.startsWith("trip-planner-")) && k !== CACHE && k !== "tripster-state" && k !== MAPS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  // Firebase's code (sign-in and shared trips) is kept so shared trips open offline
  if (req.url.startsWith("https://www.gstatic.com/firebasejs/")) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })));
    return;
  }
  if (req.url.startsWith(OFM)) { e.respondWith(mapFetch(req)); return; }
  if (new URL(req.url).origin !== location.origin) return; // weather, search and Firebase data go straight to the network
  const url = new URL(req.url);
  const fresh = req.mode === "navigate" || url.pathname.endsWith(".json");
  if (fresh) {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); if (res.ok) caches.open(CACHE).then(c => c.put(req.mode === "navigate" ? "index.html" : req, copy)); return res; })
      .catch(() => caches.match(req.mode === "navigate" ? "index.html" : req, { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })));
});

/* ---- background weather checks (Chrome, Edge and Brave on Android, when installed) ---- */
async function readState(name) { const c = await caches.open("tripster-state"); const r = await c.match(name); return r ? r.json() : null; }
async function writeState(name, v) { const c = await caches.open("tripster-state"); await c.put(name, new Response(JSON.stringify(v), { headers: { "content-type": "application/json" } })); }
async function backgroundCheck() {
  const st = await readState("state.json"); if (!st || !st.alertsOn) return;
  const memo = (await readState("bg.json")) || { snaps: {}, sent: [] };
  const sent = new Set(memo.sent);
  for (const t of st.trips || []) {
    const keys = []; TSWX.itinerary(t).forEach(x => { if (!keys.includes(x.key)) keys.push(x.key); });
    if (!keys.length) continue;
    let wx; try { wx = await TSWX.fetchWx(keys.map(k => ({ key: k, lat: t.places[k].lat, lon: t.places[k].lon }))); } catch (e) { continue; }
    const snap = TSWX.snapshot(t, wx); if (!Object.keys(snap).length) continue;
    const lines = [];
    TSWX.alerts(t, wx).forEach(a => { const id = t.id + "|" + a.id + "|" + a.level; if (!sent.has(id)) { sent.add(id); lines.push(a.date.slice(5) + ": " + a.title + " " + a.detail); } });
    TSWX.changes(t, memo.snaps[t.id], snap).forEach(c => { const id = t.id + "|" + c.id; if (!sent.has(id)) { sent.add(id); lines.push(c.date.slice(5) + " " + c.name + ": " + c.text); } });
    memo.snaps[t.id] = snap;
    if (lines.length) await self.registration.showNotification("Tripster: weather for " + t.title, { body: lines.slice(0, 4).join("\n"), tag: "wx-" + t.id, icon: "icons/icon-192.png", badge: "icons/icon-192.png" });
  }
  memo.sent = [...sent].slice(-400); await writeState("bg.json", memo);
}
self.addEventListener("periodicsync", e => { if (e.tag === "tripster-wx") e.waitUntil(backgroundCheck()); });
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => { for (const c of list) { if ("focus" in c) return c.focus(); } return self.clients.openWindow("./"); }));
});
