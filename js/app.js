/* =========================================================
   CUCHARILLAS · Código común a todas las páginas
   ========================================================= */

(function () {
  "use strict";

  // ---------- Iconos (SVG de línea, heredan el color) ----------
  const s = (d, extra = "") =>
    `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

  const ICONOS = {
    casa: s('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>'),
    casaLlena: `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M11.4 2.5a1 1 0 0 1 1.2 0l9 7.3c.6.5.2 1.5-.6 1.5H20V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-8.7H3c-.8 0-1.2-1-.6-1.5l9-7.3Z"/></svg>`,
    libro: s('<path d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5Z"/><path d="M12 6.5v13"/>'),
    montana: s('<path d="m2 20 7-12 4 6.5L15.5 11 22 20Z"/><path d="m7 11.5 2 1.5 2-1.5"/>'),
    calendario: s('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/>'),
    personas: s('<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c.5-3.3 3-5.5 6-5.5s5.5 2.2 6 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14c2.5 0 4.2 1.8 4.5 4.5"/>'),
    lapiz: s('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>'),
    estrella: s('<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.4l6.1-.8Z"/>'),
    flecha: s('<path d="m9 5 7 7-7 7"/>'),
    atras: s('<path d="m15 5-7 7 7 7"/>'),
    video: s('<rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10.5 5-3v9l-5-3"/>'),
    corazon: s('<path d="M12 20s-7.5-4.6-9-9.5C2 7 4.5 4.5 7.3 4.5c2 0 3.6 1.2 4.7 3 1.1-1.8 2.7-3 4.7-3C19.5 4.5 22 7 21 10.5 19.5 15.4 12 20 12 20Z"/>'),
    mas: s('<path d="M12 5v14M5 12h14"/>'),
    descargar: s('<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/>'),
    subir: s('<path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/>'),
    papelera: s('<path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13"/>'),
    reloj: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    lugar: s('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    enlace: s('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>'),
    vela: s('<path d="M12 3c1.5 1.8 2 3 2 4a2 2 0 0 1-4 0c0-1 .5-2.2 2-4Z"/><rect x="9" y="10.5" width="6" height="10.5" rx="1.5"/>'),
    ajustes: s('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 14H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.6V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.1a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>')
  };

  // Logo pequeño: cuchara con cruz (azul cielo)
  const MARCA = `<svg class="marca" viewBox="0 0 30 44" aria-hidden="true">
    <defs><linearGradient id="gCuchara" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8CC0F0"/><stop offset="1" stop-color="#4A90E2"/></linearGradient></defs>
    <ellipse cx="15" cy="13" rx="11" ry="12.5" fill="url(#gCuchara)"/>
    <path d="M13.6 24.5h2.8l-.4 17.2a1 1 0 0 1-2 0Z" fill="#4A90E2"/>
    <path d="M15 7.5v11M10.5 12h9" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
  </svg>`;

  // ---------- Navegación inferior ----------
  const NAV = [
    { id: "inicio",    nombre: "Inicio",    href: "index.html",     icono: "casa" },
    { id: "lectio",    nombre: "Lectio",    href: "lectio.html",    icono: "libro" },
    { id: "retiro",    nombre: "Retiros",   href: "retiro.html",    icono: "montana" },
    { id: "agenda",    nombre: "Agenda",    href: "agenda.html",    icono: "calendario" },
    { id: "comunidad", nombre: "Comunidad", href: "comunidad.html", icono: "personas" }
  ];

  function pintarNav() {
    const activo = document.body.dataset.pagina || "";
    const nav = document.createElement("nav");
    nav.className = "nav-inferior";
    nav.innerHTML = NAV.map(n => {
      const on = n.id === activo;
      const icono = on && n.id === "inicio" ? ICONOS.casaLlena : ICONOS[n.icono];
      return `<a class="nav-item${on ? " activo" : ""}" href="${n.href}">${icono}<span>${n.nombre}</span></a>`;
    }).join("");
    document.body.appendChild(nav);
  }

  // ---------- Utilidades de texto ----------
  function escapar(t) {
    return String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Convierte texto plano en párrafos. Admite **negrita** y *cursiva*.
  function formatear(t) {
    if (!t) return "";
    return escapar(t)
      .split(/\n\s*\n/)
      .map(p => "<p>" + p
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/\n/g, "<br>") + "</p>")
      .join("");
  }

  // ---------- Fechas ----------
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  function aFecha(iso) {
    if (!iso) return null;
    const [a, m, d] = iso.split("-").map(Number);
    return new Date(a, m - 1, d);
  }
  function hoy() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function fechaLarga(iso) {
    const d = aFecha(iso); if (!d) return "";
    return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
  }
  function fechaCorta(iso) {
    const d = aFecha(iso); if (!d) return "";
    return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  }
  function semanaActual() {
    const ini = hoy();
    const dia = (ini.getDay() + 6) % 7; // lunes = 0
    ini.setDate(ini.getDate() - dia);
    const fin = new Date(ini); fin.setDate(fin.getDate() + 6);
    return { ini, fin };
  }

  // ---------- Carga de contenidos ----------
  async function cargar(tipo) {
    const archivo = tipo === "perfiles" ? "data/perfiles.json" : CONFIG.esquemas[tipo].archivo;
    const clave = "cucharillas_cache_" + tipo;
    try {
      const r = await fetch(archivo + "?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      const datos = await r.json();
      try { localStorage.setItem(clave, JSON.stringify(datos)); } catch (e) {}
      return datos;
    } catch (e) {
      // Sin conexión: usamos la última copia guardada
      try { const c = localStorage.getItem(clave); if (c) return JSON.parse(c); } catch (e2) {}
      return tipo === "perfiles" ? { perfiles: [] } : { entradas: [] };
    }
  }

  function ordenarPorFecha(lista, desc = true) {
    return [...lista].sort((a, b) => (desc ? -1 : 1) * String(a.fecha || "").localeCompare(String(b.fecha || "")));
  }

  // ---------- Notas (solo en este móvil) ----------
  const CLAVE_NOTAS = "cucharillas_notas";

  const Notas = {
    todas() {
      try { return JSON.parse(localStorage.getItem(CLAVE_NOTAS)) || {}; } catch (e) { return {}; }
    },
    obtener(clave) { return this.todas()[clave] || null; },
    guardar(clave, texto, meta = {}) {
      const todas = this.todas();
      if (!texto.trim()) { delete todas[clave]; }
      else {
        todas[clave] = Object.assign({}, todas[clave], meta, { texto, actualizado: new Date().toISOString() });
        if (!todas[clave].creado) todas[clave].creado = todas[clave].actualizado;
      }
      localStorage.setItem(CLAVE_NOTAS, JSON.stringify(todas));
    },
    borrar(clave) {
      const todas = this.todas(); delete todas[clave];
      localStorage.setItem(CLAVE_NOTAS, JSON.stringify(todas));
    },
    exportar() {
      const blob = new Blob([JSON.stringify({ app: "cucharillas", version: 1, exportado: new Date().toISOString(), notas: this.todas() }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "cucharillas-mis-notas-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },
    importar(texto) {
      const datos = JSON.parse(texto);
      const nuevas = datos.notas || datos;
      const todas = this.todas();
      let n = 0;
      for (const [k, v] of Object.entries(nuevas)) {
        if (!v || typeof v.texto !== "string") continue;
        if (!todas[k] || (v.actualizado || "") > (todas[k].actualizado || "")) { todas[k] = v; n++; }
      }
      localStorage.setItem(CLAVE_NOTAS, JSON.stringify(todas));
      return n;
    }
  };

  // Pide al navegador que no borre los datos locales
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persisted().then(p => { if (!p) navigator.storage.persist(); }).catch(() => {});
  }

  // Caja de "Mis notas" con guardado automático
  function cajaNota(clave, meta) {
    const caja = document.createElement("section");
    caja.className = "caja-nota";
    const existente = Notas.obtener(clave);
    caja.innerHTML = `
      <h3 class="seccion-titulo">${ICONOS.lapiz} Mis notas</h3>
      <textarea placeholder="Escribe aquí lo que te ha tocado, lo que quieres recordar…">${escapar(existente ? existente.texto : "")}</textarea>
      <div class="estado-guardado">${existente ? "Guardado en este móvil · " + horaRelativa(existente.actualizado) : "Solo tú puedes verlas: se guardan en este móvil."}</div>`;
    const ta = caja.querySelector("textarea");
    const estado = caja.querySelector(".estado-guardado");
    let temporizador;
    const guardar = () => {
      Notas.guardar(clave, ta.value, meta);
      estado.textContent = ta.value.trim() ? "Guardado en este móvil ✓" : "Nota vacía";
    };
    ta.addEventListener("input", () => {
      estado.textContent = "Escribiendo…";
      clearTimeout(temporizador);
      temporizador = setTimeout(guardar, 600);
    });
    ta.addEventListener("blur", () => { clearTimeout(temporizador); guardar(); });
    return caja;
  }

  function horaRelativa(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const min = Math.round((Date.now() - d) / 60000);
    if (min < 1) return "ahora mismo";
    if (min < 60) return `hace ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `hace ${h} h`;
    return `${d.getDate()} de ${MESES[d.getMonth()]}`;
  }

  // ---------- Avisos ----------
  let toastEl;
  function aviso(texto) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); }
    toastEl.textContent = texto;
    toastEl.classList.add("visible");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove("visible"), 2400);
  }

  function parametro(nombre) { return new URLSearchParams(location.search).get(nombre); }

  // ---------- Modo app (funciona sin conexión) ----------
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.pagina !== "admin") pintarNav();
    document.querySelectorAll("[data-icono]").forEach(el => { el.innerHTML = ICONOS[el.dataset.icono] || ""; });
    document.querySelectorAll("[data-marca]").forEach(el => { el.outerHTML = MARCA; });
  });

  window.App = { ICONOS, MARCA, escapar, formatear, fechaLarga, fechaCorta, aFecha, hoy, semanaActual, cargar, ordenarPorFecha, Notas, cajaNota, horaRelativa, aviso, parametro, MESES };
})();
