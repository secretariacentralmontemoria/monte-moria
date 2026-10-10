const CACHE = "mm-congregacao-v5";
const FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./compat.js",
  "./instalar.js",
  "./app.js",
  "./secretaria.js",
  "./auth.js",
  "./vendor/xlsx.full.min.js",
  "./vendor/qrcode.min.js",
  "./logo.png",
  "./manifest.webmanifest",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];
const ESPERA_REDE = 3500;
const limpa = (res) => res && res.redirected ? res.blob().then((b) => new Response(b, { status: res.status, statusText: res.statusText, headers: res.headers })) : Promise.resolve(res);
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(FILES.map((f) => fetch(f, { cache: "reload" }).then((r) => r.ok ? limpa(r).then((x) => c.put(f, x)) : null).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(new Promise((resolve) => {
      let feito = false;
      const fim = (r) => {
        if (!feito && r) {
          feito = true;
          resolve(r);
        }
      };
      const guardada = () => caches.match("./index.html").then((r) => r || caches.match("./")).then((r) => r ? limpa(r) : null);
      const t = setTimeout(() => guardada().then(fim), ESPERA_REDE);
      fetch(req).then((res) => {
        clearTimeout(t);
        if (res.ok) {
          const copia = res.clone();
          limpa(copia).then((x) => caches.open(CACHE).then((c) => c.put("./index.html", x))).catch(() => {
          });
        }
        return limpa(res).then(fim);
      }).catch(() => {
        clearTimeout(t);
        guardada().then((r) => fim(r || Response.error()));
      });
    }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit ? limpa(hit) : fetch(req).then((res) => {
    if (res.ok && res.type === "basic") {
      const copia = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {
      });
    }
    return res;
  })));
});
