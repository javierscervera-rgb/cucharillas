/* =========================================================
   CUCHARILLAS · Vídeos dentro de la app
   YouTube, Vimeo o archivo de vídeo directo (.mp4/.webm).
   Avisa (alEmpezar) cuando el vídeo empieza a reproducirse.
   ========================================================= */

window.Videos = (function () {
  "use strict";

  function info(url) {
    if (!url) return null;
    let m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
    if (m) return { tipo: "youtube", id: m[1], miniatura: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` };
    m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return { tipo: "vimeo", id: m[1] };
    if (/\.(mp4|webm|m4v|mov)(\?|#|$)/i.test(url)) return { tipo: "archivo", url };
    return null;
  }

  const scripts = {};
  function cargarScript(src, listo) {
    if (!scripts[src]) {
      scripts[src] = new Promise((ok, mal) => {
        if (src.includes("youtube")) window.onYouTubeIframeAPIReady = ok;
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => { if (!src.includes("youtube")) ok(); };
        s.onerror = mal;
        document.head.appendChild(s);
      });
    }
    // Si la API tarda demasiado, seguimos sin ella
    return Promise.race([scripts[src], new Promise((_, mal) => setTimeout(() => mal(new Error("tiempo")), 8000))]).then(listo);
  }

  // Reproducción básica sin API: el toque en "play" ya cuenta como visto
  function iframeSimple(caja, src, alEmpezar) {
    caja.innerHTML = `<iframe src="${src}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    alEmpezar();
  }

  function reproducir(caja, url, alEmpezar) {
    const v = info(url);
    if (!v) return;
    let avisado = false;
    const empezar = () => { if (!avisado) { avisado = true; alEmpezar(); } };
    const hueco = document.createElement("div");
    caja.innerHTML = "";
    caja.appendChild(hueco);

    if (v.tipo === "archivo") {
      caja.innerHTML = `<video src="${App.escapar(v.url)}" controls autoplay playsinline></video>`;
      caja.querySelector("video").addEventListener("play", empezar);
      return;
    }

    if (v.tipo === "youtube") {
      cargarScript("https://www.youtube.com/iframe_api", () => {
        new YT.Player(hueco, {
          videoId: v.id,
          host: "https://www.youtube-nocookie.com",
          playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: e => { try { e.target.playVideo(); } catch (er) {} },
            onStateChange: e => { if (e.data === 1) empezar(); } // 1 = reproduciendo
          }
        });
      }).catch(() => iframeSimple(caja, `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&playsinline=1&rel=0`, empezar));
      return;
    }

    if (v.tipo === "vimeo") {
      cargarScript("https://player.vimeo.com/api/player.js", () => {
        const p = new Vimeo.Player(hueco, { id: v.id, autoplay: true, playsinline: true });
        p.on("play", empezar);
      }).catch(() => iframeSimple(caja, `https://player.vimeo.com/video/${v.id}?autoplay=1&playsinline=1`, empezar));
    }
  }

  return { info, reproducir };
})();
