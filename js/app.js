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
    play: `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5Z"/></svg>`,
    check: s('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
    foto: s('<rect x="3" y="6" width="18" height="14" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="M8.5 6 10 3.5h4L15.5 6"/>'),
    articulo: s('<path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14.5 3v4.5H19M8.5 12h7M8.5 15.5h7M8.5 8.5h3"/>'),
    devocionario: s('<path d="M6 3.5h11.5a1 1 0 0 1 1 1V17H7.5A2 2 0 0 0 5.5 19V5a1.5 1.5 0 0 1 .5-1.5Z"/><path d="M5.5 19a2 2 0 0 0 2 2h11v-4"/><path d="M12 6.5v7M9.5 9h5"/>'),
    paloma: s('<path d="M3.5 13.5c2.5.5 5-.5 6.5-2.5l1.5-5c.4-1.3 2.2-1.5 2.9-.3l.6 1.1 3.5 1.2-3 1.5c.3 5-3.3 8.5-8.5 8.5L5 20v-3.2C4 16 3.5 15 3.5 13.5Z"/><path d="M14.3 7.3h.01"/><path d="M10 11c1 1.5 3 2 5 1.5"/>'),
    llama: s('<path d="M12 3c.8 3 5 5.2 5 10a5 5 0 0 1-10 0c0-2.6 1.6-3.8 2-6 1.2 1 2 2.2 2 3.5C12.6 8.3 12.4 5.5 12 3Z"/><path d="M12 20a2 2 0 0 1-2-2c0-1.5 2-3 2-3s2 1.5 2 3a2 2 0 0 1-2 2Z"/>'),
    custodia: s('<circle cx="12" cy="8.5" r="3"/><path d="M12 2.5v1.5M12 13v1.5M6 8.5h1.5M16.5 8.5H18M7.8 4.3l1 1M15.2 11.7l1 1M7.8 12.7l1-1M15.2 5.3l1-1"/><path d="M12 14.5V19M9.5 16.5h5M8 21h8"/>'),
    hostia: s('<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8.5 11h7"/>'),
    caliz: s('<path d="M6.5 4h11c0 5-2.5 8-5.5 8S6.5 9 6.5 4Z"/><path d="M12 12v6M8.5 20.5h7"/><path d="M8.5 20.5c0-1.5 1.5-2.5 3.5-2.5s3.5 1 3.5 2.5"/>'),
    sol: s('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
    luna: s('<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/><path d="M17 3.5v3M15.5 5h3"/>'),
    angel: s('<ellipse cx="12" cy="3.6" rx="2.8" ry="1"/><circle cx="12" cy="8" r="2.4"/><path d="M9.2 20.5 10 12.5h4l.8 8Z"/><path d="M10 13 4 9.5c0 3.5 2 6 5.5 6.5M14 13l6-3.5c0 3.5-2 6-5.5 6.5"/>'),
    lupa: s('<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5"/><path d="M10.5 8v5M8 10.5h5"/>'),
    cruz: s('<path d="M12 3v18M7 8.5h10"/>'),
    corona: s('<path d="M4.5 17.5 3.5 8l4.8 3.8L12 6l3.7 5.8L20.5 8l-1 9.5Z"/><path d="M5 20.5h14"/><circle cx="12" cy="4" r=".6"/>'),
    rosa: s('<path d="M12 13.5c-3 0-5-2.2-5-5 1.8 0 3 1 3 1s.3-3 2-4.5c1.7 1.5 2 4.5 2 4.5s1.2-1 3-1c0 2.8-2 5-5 5Z"/><path d="M12 13.5V21M12 17.5c-1.8 0-3.2-.8-4-2.2M12 18.5c1.8 0 3.2-.8 4-2.2"/>'),
    campana: s('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0M12 3v2"/>'),
    lirio: s('<path d="M12 21V10"/><path d="M12 10c-2.2-.8-3.5-3-3.5-6.5 1.7.8 3 2 3.5 3.3.5-1.3 1.8-2.5 3.5-3.3 0 3.5-1.3 5.7-3.5 6.5Z"/><path d="M12 16c-2.3 0-4-1.2-5-3.2M12 17.5c2.3 0 4-1.2 5-3.2"/>'),
    espada: s('<path d="M19.5 4.5 9.5 14.5"/><path d="M19.5 4.5h-3.8M19.5 4.5v3.8"/><path d="m7 12 5 5M9.5 14.5 4 20"/>'),
    manos: s('<path d="M12 4c-1.6 2-3 5-3 8.5V15l-3 3v2.5h4l2-3"/><path d="M12 4c1.6 2 3 5 3 8.5V15l3 3v2.5h-4l-2-3"/><path d="M12 4v13.5"/>'),
    brillo: s('<circle cx="12" cy="12" r="2.5"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5M5.6 5.6l2.4 2.4M16 16l2.4 2.4M5.6 18.4 8 16M16 8l2.4-2.4"/>'),
    rosario: s('<circle cx="10.6" cy="3.1" r="1.05" fill="currentColor" stroke="none"/><circle cx="8.1" cy="4.2" r="1.05" fill="currentColor" stroke="none"/><circle cx="6.3" cy="6.2" r="1.05" fill="currentColor" stroke="none"/><circle cx="5.7" cy="8.6" r="1.05" fill="currentColor" stroke="none"/><circle cx="6.3" cy="11.0" r="1.05" fill="currentColor" stroke="none"/><circle cx="8.1" cy="13.0" r="1.05" fill="currentColor" stroke="none"/><circle cx="15.9" cy="13.0" r="1.05" fill="currentColor" stroke="none"/><circle cx="17.7" cy="11.0" r="1.05" fill="currentColor" stroke="none"/><circle cx="18.3" cy="8.6" r="1.05" fill="currentColor" stroke="none"/><circle cx="17.7" cy="6.2" r="1.05" fill="currentColor" stroke="none"/><circle cx="15.9" cy="4.2" r="1.05" fill="currentColor" stroke="none"/><circle cx="13.4" cy="3.1" r="1.05" fill="currentColor" stroke="none"/><path d="M12 14.6v2.4M12 17.3v5M10.1 19h3.8"/>'),
    brujula: s('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8Z"/><path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21"/>'),
    expandir: s('<path d="m6 9 6 6 6-6"/>'),
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
    { id: "devocionario", nombre: "Oraciones", href: "devocionario.html", icono: "devocionario" },
    { id: "agenda",    nombre: "Agenda",    href: "agenda.html",    icono: "calendario" },
    { id: "escapadas", nombre: "Escapadas", href: "escapadas.html", icono: "brujula" },
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
    const archivo = CONFIG.esquemas[tipo] ? CONFIG.esquemas[tipo].archivo : `data/${tipo}.json`;
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
      return tipo === "perfiles" ? { perfiles: [] } : tipo === "devocionario" ? { temas: [] } : { entradas: [] };
    }
  }

  // Ordena por fecha; si no hay fecha, por cuándo se publicó
  function ordenarPorFecha(lista, desc = true) {
    const clave = e => String(e.fecha || (e.creado || "").slice(0, 10) || "");
    return [...lista].sort((a, b) => (desc ? -1 : 1) * (clave(a).localeCompare(clave(b)) || String(a.creado || "").localeCompare(String(b.creado || ""))));
  }

  // ---------- Leído / visto (solo en este móvil) ----------
  const CLAVE_ESTADOS = "cucharillas_estados";
  const Estados = {
    todos() { try { return JSON.parse(localStorage.getItem(CLAVE_ESTADOS)) || {}; } catch (e) { return {}; } },
    hecho(clave) { return !!this.todos()[clave]; },
    marcar(clave, hecho = true) {
      const t = this.todos();
      if (hecho) t[clave] = { fecha: new Date().toISOString() }; else delete t[clave];
      localStorage.setItem(CLAVE_ESTADOS, JSON.stringify(t));
    }
  };

  // ---------- Imágenes ----------
  // Reduce una foto del móvil a JPEG ligero. cuadrado: recorta al centro.
  function redimensionar(archivo, { max = 1600, cuadrado = false, calidad = 0.82 } = {}) {
    return new Promise((ok, mal) => {
      const img = new Image();
      const url = URL.createObjectURL(archivo);
      img.onload = () => {
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
        if (cuadrado) { const l = Math.min(sw, sh); sx = (sw - l) / 2; sy = (sh - l) / 2; sw = sh = l; }
        const escala = Math.min(1, max / Math.max(sw, sh));
        const c = document.createElement("canvas");
        c.width = Math.round(sw * escala); c.height = Math.round(sh * escala);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c.toDataURL("image/jpeg", calidad));
      };
      img.onerror = () => { URL.revokeObjectURL(url); mal(new Error("No se pudo leer la imagen")); };
      img.src = url;
    });
  }

  // Avatar de perfil: foto si la hay, si no el símbolo
  function avatar(p, tam) {
    const estilo = `background:${escapar(p.color || "#E8F4FD")}${tam ? `;width:${tam}px;height:${tam}px;font-size:${tam / 2}px` : ""}`;
    return p.foto
      ? `<div class="avatar" style="${estilo}"><img src="${escapar(p.foto)}" alt=""></div>`
      : `<div class="avatar" style="${estilo}">${escapar(p.emoji || "🙂")}</div>`;
  }

  // Tras pintar contenido, baja hasta el #ancla si la hay
  function irAlAncla() {
    if (!location.hash) return;
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  }

  // ---------- Notas (solo en este móvil) ----------
  const CLAVE_NOTAS = "cucharillas_notas";
  // Otros datos del móvil que viajan en la copia de seguridad (perfil, galería, juego)
  const EXTRAS = ["cucharillas_mi_perfil", "cucharillas_galeria_yo", "cucharillas_galeria_nombre", "cucharillas_galeria_clave", "cucharillas_opciones_notas"];

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
      const extras = {};
      EXTRAS.forEach(k => { try { const v = localStorage.getItem(k); if (v) extras[k] = v; } catch (e) {} });
      const blob = new Blob([JSON.stringify({ app: "cucharillas", version: 3, exportado: new Date().toISOString(), notas: this.todas(), estados: Estados.todos(), extras }, null, 2)], { type: "application/json" });
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
      if (datos.estados) {
        const est = Estados.todos();
        localStorage.setItem(CLAVE_ESTADOS, JSON.stringify(Object.assign({}, datos.estados, est)));
      }
      // Perfil, galería y notas del juego: se recuperan si este móvil aún no los tiene
      const extras = datos.extras && typeof datos.extras === "object" ? datos.extras : {};
      for (const k of EXTRAS) {
        const v = extras[k];
        if (typeof v !== "string" || !v) continue;
        try {
          const actual = localStorage.getItem(k);
          if (k === "cucharillas_opciones_notas" && actual) {
            const unidas = Object.assign({}, JSON.parse(v), JSON.parse(actual));
            localStorage.setItem(k, JSON.stringify(unidas));
          } else if (!actual) { localStorage.setItem(k, v); n++; }
        } catch (e) {}
      }
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
    if (meta && meta.ancla) caja.id = "nota-" + meta.ancla;
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

  // ---------- Cambio de dirección a cucharillas.es ----------
  // Las notas, el perfil y el acceso a la galería se guardan en cada móvil
  // ligados a la dirección de la web: al cambiarla hay que llevarlos con la copia.
  const NUEVA_DIRECCION = "cucharillas.es";
  function avisoMudanza() {
    const pagina = document.body.dataset.pagina;
    if (pagina === "admin") return;
    const main = document.querySelector("main"); if (!main) return;
    const ls = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    let html = "";
    if (/github\.io$/.test(location.hostname)) {
      html = `<b>📦 La app se muda a ${NUEVA_DIRECCION}</b><br>Para no perder tus notas, tu perfil y tu acceso a la galería, entra en
        <a href="notas.html">Mis notas</a> y pulsa <b>Guardar copia</b>. En la nueva dirección podrás recuperarla.`;
    } else if (location.hostname.replace(/^www\./, "") === NUEVA_DIRECCION && pagina === "inicio"
      && !ls("cucharillas_notas") && !ls("cucharillas_mi_perfil") && !ls("cucharillas_aviso_mudanza")) {
      html = `<b>👋 ¡Bienvenido a la nueva dirección!</b><br>Si guardaste una copia en la app antigua, ve a
        <a href="notas.html">Mis notas</a> y pulsa <b>Recuperar</b>. <button type="button" class="cerrar-aviso" style="border:0;background:none;color:inherit;font-weight:700;text-decoration:underline;padding:0;font:inherit;cursor:pointer">Entendido</button>`;
    }
    if (!html) return;
    const caja = document.createElement("div");
    caja.className = "aviso info";
    caja.style.lineHeight = "1.5";
    caja.innerHTML = html;
    const cab = main.querySelector(".cabecera-portada, .cabecera-pagina");
    if (cab && cab.nextSibling) main.insertBefore(caja, cab.nextElementSibling); else main.prepend(caja);
    const b = caja.querySelector(".cerrar-aviso");
    if (b) b.onclick = () => { try { localStorage.setItem("cucharillas_aviso_mudanza", "1"); } catch (e) {} caja.remove(); };
  }

  document.addEventListener("DOMContentLoaded", () => {
    avisoMudanza();
    if (document.body.dataset.pagina !== "admin") pintarNav();
    document.querySelectorAll("[data-icono]").forEach(el => { el.innerHTML = ICONOS[el.dataset.icono] || ""; });
    document.querySelectorAll("[data-marca]").forEach(el => { el.outerHTML = MARCA; });
  });

  window.App = { ICONOS, MARCA, escapar, formatear, fechaLarga, fechaCorta, aFecha, hoy, semanaActual, cargar, ordenarPorFecha, Notas, Estados, cajaNota, redimensionar, avatar, irAlAncla, horaRelativa, aviso, parametro, MESES };
})();
