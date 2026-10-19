/* Sistema de Gestão de Membros — funcionamento sem internet.
   Rede primeiro (com espera curta) e cópia guardada como alternativa: com internet abre sempre a versão publicada mais recente. */
const CACHE = "mm-sistema-v26-2dc1618b";
const FILES = [
  "./",
  "./index.html",
  "./css/styles.css?v=2dc1618b",
  "./vendor/chart.umd.min.js",
  "./vendor/xlsx.full.min.js",
  "./vendor/chartjs-plugin-datalabels.min.js",
  "./data/seed.js",
  "./js/00-boot-v24.js?v=2dc1618b",
  "./js/00-v14-graficos.js?v=2dc1618b",
  "./js/00b-v14-persistencia.js?v=2dc1618b",
  "./js/01-app-core.js?v=2dc1618b",
  "./js/02-security-v8.js?v=2dc1618b",
  "./js/03-v10-universal.js?v=2dc1618b",
  "./js/04-v12-conversion.js?v=2dc1618b",
  "./js/05-v11-persistence.js?v=2dc1618b",
  "./js/06-v14-graficos-aparencia.js?v=2dc1618b",
  "./js/07-v14-atividades.js?v=2dc1618b",
  "./js/08-v14-organigrama.js?v=2dc1618b",
  "./js/09-v14-varredura.js?v=2dc1618b",
  "./js/10-v15-integridade.js?v=2dc1618b",
  "./js/11-v15-paineis.js?v=2dc1618b",
  "./js/12-v16.js?v=2dc1618b",
  "./js/13-v17-relatorio.js?v=2dc1618b",
  "./js/14-v18-menu.js?v=2dc1618b",
  "./js/15-v19-compilar.js?v=2dc1618b",
  "./js/16-v20-secretaria.js?v=2dc1618b",
  "./js/17-v21.js?v=2dc1618b",
  "./js/18-v22.js?v=2dc1618b",
  "./js/19-v23.js?v=2dc1618b",
  "./js/20-v24-v26.js?v=2dc1618b",
  "./js/pwa.js?v=2dc1618b",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];
const ESPERA_REDE = 3500;
const limpa = (res) => res && res.redirected ? res.blob().then((b) => new Response(b, { status: res.status, statusText: res.statusText, headers: res.headers })) : Promise.resolve(res);
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(FILES.map((f) => fetch(f, { cache: "reload" }).then((r) => r.ok ? limpa(r).then((x) => c.put(f, x)) : null).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("mm-sistema-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  const nav = req.mode === "navigate";
  const chave = nav ? "./index.html" : req;
  e.respondWith(new Promise((resolve) => {
    let feito = false;
    const fim = (r) => { if (!feito && r) { feito = true; resolve(r); } };
    const guardada = () => caches.match(chave).then((r) => r || (nav ? caches.match("./") : null)).then((r) => r ? limpa(r) : null);
    const t = setTimeout(() => guardada().then(fim), ESPERA_REDE);
    fetch(req).then((res) => {
      clearTimeout(t);
      if (res.ok && res.type === "basic") { const copia = res.clone(); limpa(copia).then((x) => caches.open(CACHE).then((c) => c.put(chave, x))).catch(() => {}); }
      return limpa(res).then(fim);
    }).catch(() => { clearTimeout(t); guardada().then((r) => fim(r || Response.error())); });
  }));
});
