/* Cucharillas · Funcionamiento sin conexión
   Siempre intenta la red primero (así el contenido nuevo aparece enseguida)
   y, si no hay conexión, usa la última copia guardada. */

const VERSION = "cucharillas-v1";
const BASICOS = [
  "./", "index.html", "lectio.html", "retiro.html", "notas.html", "agenda.html", "comunidad.html", "recursos.html",
  "css/estilos.css", "js/config.js", "js/app.js", "js/entradas.js", "img/logo.png", "img/icono-192.png", "manifest.json"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.endsWith("admin.html") || url.pathname.endsWith("admin.js")) return;

  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) {
        const copia = r.clone();
        // Guardamos sin parámetros (?t=, ?id=) para no llenar la caché
        caches.open(VERSION).then(c => c.put(url.origin + url.pathname, copia));
      }
      return r;
    }).catch(() => caches.match(url.origin + url.pathname).then(r => r || caches.match("index.html")))
  );
});
