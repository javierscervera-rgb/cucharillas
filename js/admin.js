/* =========================================================
   CUCHARILLAS · Panel de administración
   Lee y escribe los archivos de /data directamente en GitHub.
   ========================================================= */

(function () {
  "use strict";
  const { escapar, aviso, ICONOS } = App;
  const G = CONFIG.github;
  const API = `https://api.github.com/repos/${G.usuario}/${G.repo}`;
  const CLAVE_TOKEN = "cucharillas_admin_token";
  const raiz = document.getElementById("admin");

  let token = localStorage.getItem(CLAVE_TOKEN) || "";
  let seccion = "lectio";
  const cache = {}; // tipo -> { datos, sha }

  // ---------- GitHub ----------
  const aBase64 = (texto) => {
    const bytes = new TextEncoder().encode(texto);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  const deBase64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, "")), c => c.charCodeAt(0)));

  async function gh(ruta, opciones = {}) {
    const r = await fetch(API + ruta, Object.assign({}, opciones, {
      headers: Object.assign({ Authorization: "Bearer " + token, Accept: "application/vnd.github+json" }, opciones.headers || {}),
      cache: "no-store"
    }));
    if (!r.ok) {
      const cuerpo = await r.json().catch(() => ({}));
      const e = new Error(cuerpo.message || "Error " + r.status); e.status = r.status; throw e;
    }
    return r.json();
  }

  // Sube una imagen (dataURL JPEG) al repositorio y devuelve su ruta
  async function subirImagen(dataURL, carpeta) {
    const ruta = `img/subidas/${carpeta}-${Date.now().toString(36)}.jpg`;
    await gh(`/contents/${ruta}`, { method: "PUT", body: JSON.stringify({
      message: `Sube imagen (${carpeta})`, content: dataURL.split(",")[1], branch: G.rama }) });
    return ruta;
  }

  async function borrarArchivo(ruta, mensaje) {
    ruta = ruta.split("?")[0];
    try {
      const r = await gh(`/contents/${ruta}?ref=${encodeURIComponent(G.rama)}`);
      await gh(`/contents/${ruta}`, { method: "DELETE", body: JSON.stringify({ message: mensaje, sha: r.sha, branch: G.rama }) });
    } catch (e) { if (e.status !== 404) console.warn(e); }
  }

  const archivoDe = (tipo) => tipo === "perfiles" ? "data/perfiles.json" : tipo === "galeria" ? "data/galeria.json" : CONFIG.esquemas[tipo].archivo;
  const vacioDe = (tipo) => tipo === "perfiles" ? { perfiles: [] } : tipo === "galeria" ? { eventos: [], fotos: [] } : { entradas: [] };

  async function leer(tipo) {
    try {
      const r = await gh(`/contents/${archivoDe(tipo)}?ref=${encodeURIComponent(G.rama)}`);
      let texto = r.content ? deBase64(r.content) : "";
      if (!r.content) {
        // Archivos de más de 1 MB: GitHub no manda el contenido y hay que pedirlo "en bruto"
        const raw = await fetch(`${API}/contents/${archivoDe(tipo)}?ref=${encodeURIComponent(G.rama)}`,
          { headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github.raw" }, cache: "no-store" });
        texto = await raw.text();
      }
      cache[tipo] = { datos: Object.assign(vacioDe(tipo), JSON.parse(texto || "{}")), sha: r.sha };
    } catch (e) {
      if (e.status !== 404) throw e;
      cache[tipo] = { datos: vacioDe(tipo), sha: null };
    }
    return cache[tipo];
  }

  async function escribir(tipo, mensaje) {
    const c = cache[tipo];
    const cuerpo = { message: mensaje, content: aBase64(JSON.stringify(c.datos, null, 2) + "\n"), branch: G.rama };
    if (c.sha) cuerpo.sha = c.sha;
    try {
      const r = await gh(`/contents/${archivoDe(tipo)}`, { method: "PUT", body: JSON.stringify(cuerpo) });
      c.sha = r.content.sha;
    } catch (e) {
      if (e.status === 409 || e.status === 422) {
        throw new Error("Alguien ha cambiado este archivo a la vez. Recarga la sección y vuelve a intentarlo.");
      }
      throw e;
    }
  }

  // ---------- Entrada ----------
  function pintarLogin(error) {
    const sinConfig = G.usuario === "TU-USUARIO-GITHUB";
    raiz.innerHTML = `
      <div style="text-align:center;margin:10px 0 24px">
        <img src="img/logo.png" alt="" style="height:120px">
        <h1 style="margin:10px 0 4px;font-size:24px">Administración</h1>
        <p class="subtitulo" style="margin:0">Solo para responsables del grupo</p>
      </div>
      ${sinConfig ? `<div class="aviso">Antes de nada, edita <b>js/config.js</b> y pon tu usuario y repositorio de GitHub.</div>` : ""}
      ${error ? `<div class="aviso">${escapar(error)}</div>` : ""}
      <div class="ficha">
        <label class="campo" for="tok" style="margin-top:0">Clave de acceso (token de GitHub)</label>
        <input id="tok" type="password" autocomplete="off" placeholder="github_pat_…">
        <p class="detalle" style="color:var(--texto-secundario);font-size:13.5px;margin:10px 0 0">
          Se guarda solo en este dispositivo. Mira el README para crearla (tarda 2 minutos).</p>
        <button class="boton ancho" id="entrar" style="margin-top:14px">Entrar</button>
      </div>`;
    document.getElementById("entrar").onclick = async () => {
      token = document.getElementById("tok").value.trim();
      if (!token) return;
      try {
        const repo = await gh("");
        if (!repo.permissions || !repo.permissions.push) throw new Error("Esta clave no tiene permiso de escritura en el repositorio.");
        localStorage.setItem(CLAVE_TOKEN, token);
        pintarPanel();
      } catch (e) {
        token = "";
        pintarLogin(e.status === 401 ? "La clave no es válida o ha caducado." : e.status === 404 ? "No encuentro el repositorio. Revisa js/config.js y que la clave tenga acceso a él." : e.message);
      }
    };
  }

  // ---------- Panel ----------
  const SECCIONES = [
    ["lectio", "Lectio"], ["retiro", "Retiro"], ["agenda", "Agenda"], ["recursos", "Libros y vídeos"], ["articulos", "Artículos"], ["perfiles", "Perfiles"], ["galeria", "Galería"], ["usuarios", "Usuarios"]
  ];

  function pintarPanel() {
    raiz.innerHTML = `
      <header class="cabecera-pagina" style="justify-content:space-between">
        <a class="btn-volver" href="index.html" aria-label="Volver a la app">${ICONOS.atras}</a>
        <h1 style="flex:1">Administración</h1>
        <button class="boton suave" id="salir" style="padding:8px 12px;font-size:13px">Salir</button>
      </header>
      <div class="pestanas desplazable" style="margin-top:14px">
        ${SECCIONES.map(([id, n]) => `<button data-s="${id}" class="${id === seccion ? "activa" : ""}">${n}</button>`).join("")}
      </div>
      <div id="zona"></div>`;
    raiz.querySelectorAll("[data-s]").forEach(b => b.onclick = () => {
      seccion = b.dataset.s;
      raiz.querySelectorAll("[data-s]").forEach(x => x.classList.toggle("activa", x === b));
      pintarSeccion();
    });
    document.getElementById("salir").onclick = () => {
      if (!confirm("¿Cerrar sesión en este dispositivo?")) return;
      localStorage.removeItem(CLAVE_TOKEN); token = ""; pintarLogin();
    };
    pintarSeccion();
  }

  async function pintarSeccion(forzar) {
    const zona = document.getElementById("zona");
    zona.innerHTML = `<div class="cargando">Cargando…</div>`;
    if (seccion === "usuarios") return pintarUsuarios(zona);
    try {
      if (forzar || !cache[seccion]) await leer(seccion);
    } catch (e) {
      if (e.status === 401) { localStorage.removeItem(CLAVE_TOKEN); return pintarLogin("La clave ha caducado. Vuelve a introducirla."); }
      zona.innerHTML = `<div class="aviso">No se pudo cargar: ${escapar(e.message)}</div>`; return;
    }
    if (seccion === "perfiles") return pintarPerfiles(zona);
    if (seccion === "galeria") return pintarGaleria(zona);

    const esquema = CONFIG.esquemas[seccion];
    const lista = App.ordenarPorFecha(cache[seccion].datos.entradas || [], seccion !== "agenda");
    zona.innerHTML = `
      <button class="boton ancho" id="nueva">${ICONOS.mas} Nueva entrada de ${escapar(esquema.nombre)}</button>
      <div style="height:16px"></div>
      ${lista.length ? "" : `<div class="vacio">No hay entradas todavía.</div>`}
      ${lista.map(e => `
        <div class="pastilla" role="button" data-id="${escapar(e.id)}">
          <div class="texto"><div class="titulo">${escapar(e.titulo || "(sin título)")}</div>
          <div class="detalle">${escapar(e.fecha ? App.fechaCorta(e.fecha) : e.creado ? "Publicado el " + App.fechaCorta(e.creado.slice(0, 10)) : "")}</div></div>
          <span class="flecha">${ICONOS.lapiz}</span>
        </div>`).join("")}
      <button class="boton suave ancho" id="recargar" style="margin-top:8px">Recargar desde GitHub</button>`;
    document.getElementById("nueva").onclick = () => pintarFormulario(null);
    document.getElementById("recargar").onclick = () => pintarSeccion(true);
    zona.querySelectorAll("[data-id]").forEach(el => el.onclick = () =>
      pintarFormulario(cache[seccion].datos.entradas.find(x => x.id === el.dataset.id)));
  }

  function campoHTML(c, valor) {
    const v = escapar(valor || "");
    const ayuda = c.ayuda ? ` <small>${escapar(c.ayuda)}</small>` : "";
    const etiqueta = `<label class="campo" for="c-${c.id}">${escapar(c.nombre)}${c.obligatorio ? " *" : ""}${ayuda}</label>`;
    const separador = c.bloque ? `<h3 class="bloque-admin">${escapar(c.bloque)}</h3>` : "";
    switch (c.tipo) {
      case "notas": return `<p class="detalle" style="color:var(--verde-menta);font-size:13px;margin:10px 0 0">✎ Aquí cada chico verá su caja de «Mis notas».</p>`;
      case "subtitulo": return separador + etiqueta + `<input id="c-${c.id}" value="${v}">`;
      case "imagen": return separador + etiqueta + `
        <div class="campo-imagen" data-imagen="${c.id}">
          <input type="hidden" id="c-${c.id}" value="${v}">
          <img alt="" ${valor ? `src="${v}"` : "hidden"}>
          <div class="fila-botones">
            <button type="button" class="boton secundario" data-elegir>${ICONOS.foto} ${valor ? "Cambiar" : "Elegir imagen"}</button>
            <button type="button" class="boton suave" data-quitar ${valor ? "" : "hidden"}>Quitar</button>
          </div>
          <input type="file" accept="image/*" hidden>
        </div>`;
      case "largo": return separador + etiqueta + `<textarea id="c-${c.id}" style="min-height:${c.biblico ? 200 : 120}px">${v}</textarea>`;
      case "fecha": return etiqueta + `<input id="c-${c.id}" type="date" value="${v}">`;
      case "url":   return etiqueta + `<input id="c-${c.id}" type="url" inputmode="url" placeholder="https://…" value="${v}">`;
      case "lista": return etiqueta + `<select id="c-${c.id}">${c.opciones.map(o => `<option${o === valor ? " selected" : ""}>${escapar(o)}</option>`).join("")}</select>`;
      default:      return etiqueta + `<input id="c-${c.id}" value="${v}">`;
    }
  }

  function pintarFormulario(entrada) {
    const esquema = CONFIG.esquemas[seccion];
    const zona = document.getElementById("zona");
    const nueva = !entrada;
    entrada = entrada || (esquema.campos.some(c => c.tipo === "fecha") ? { fecha: new Date().toISOString().slice(0, 10) } : {});

    zona.innerHTML = `
      <button class="boton suave" id="cancelar" style="padding:8px 14px;margin-bottom:6px">${ICONOS.atras} Volver</button>
      <div class="ficha">
        <h2 style="margin:0 0 4px;font-size:19px">${nueva ? "Nueva entrada" : "Editar entrada"}</h2>
        <p class="detalle" style="color:var(--texto-secundario);font-size:13px;margin:0">En los textos largos deja una línea en blanco entre párrafos. Puedes usar **negrita** y *cursiva*.</p>
        ${esquema.campos.map(c => campoHTML(c, entrada[c.id])).join("")}
      </div>
      <button class="boton ancho" id="guardar">Publicar</button>
      ${nueva ? "" : `<button class="boton peligro ancho" id="borrar" style="margin-top:10px">${ICONOS.papelera} Borrar entrada</button>`}`;

    document.getElementById("cancelar").onclick = () => pintarSeccion();

    // Campos de imagen: se reduce la foto y se sube a GitHub al elegirla
    let subiendo = 0;
    zona.querySelectorAll("[data-imagen]").forEach(caja => {
      const oculto = caja.querySelector('input[type="hidden"]');
      const archivo = caja.querySelector('input[type="file"]');
      const vista = caja.querySelector("img");
      const elegir = caja.querySelector("[data-elegir]");
      const quitar = caja.querySelector("[data-quitar]");
      elegir.onclick = () => archivo.click();
      quitar.onclick = () => { oculto.value = ""; vista.hidden = true; quitar.hidden = true; elegir.innerHTML = `${ICONOS.foto} Elegir imagen`; };
      archivo.onchange = async () => {
        const f = archivo.files[0]; if (!f) return;
        subiendo++; elegir.disabled = true; elegir.textContent = "Subiendo…";
        try {
          const dataURL = await App.redimensionar(f, { max: 1600 });
          vista.src = dataURL; vista.hidden = false;
          oculto.value = await subirImagen(dataURL, seccion);
          quitar.hidden = false; elegir.innerHTML = `${ICONOS.foto} Cambiar`;
        } catch (e) {
          aviso("No se pudo subir la imagen: " + e.message);
          elegir.innerHTML = `${ICONOS.foto} Elegir imagen`;
        }
        subiendo--; elegir.disabled = false; archivo.value = "";
      };
    });

    document.getElementById("guardar").onclick = async (ev) => {
      if (subiendo) return aviso("Espera a que termine de subir la imagen");
      const datos = {};
      for (const c of esquema.campos) {
        if (c.tipo === "notas") continue;
        const valor = document.getElementById("c-" + c.id).value.trim();
        if (c.obligatorio && !valor) return aviso(`Falta: ${c.nombre}`);
        datos[c.id] = valor;
      }
      const lista = cache[seccion].datos.entradas = cache[seccion].datos.entradas || [];
      if (nueva) {
        const base = (datos.titulo || "entrada").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
        datos.id = `${base}-${Date.now().toString(36)}`;
        datos.creado = new Date().toISOString();
        lista.push(datos);
      } else {
        Object.assign(lista.find(x => x.id === entrada.id), datos);
      }
      await publicar(ev.currentTarget, `${nueva ? "Nueva" : "Edita"} ${esquema.nombre}: ${datos.titulo}`);
    };

    const borrar = document.getElementById("borrar");
    if (borrar) borrar.onclick = async (ev) => {
      if (!confirm(`¿Borrar «${entrada.titulo}»? Las notas que los chicos hayan escrito seguirán en sus móviles.`)) return;
      const d = cache[seccion].datos;
      d.entradas = d.entradas.filter(x => x.id !== entrada.id);
      await publicar(ev.currentTarget, `Borra ${esquema.nombre}: ${entrada.titulo}`);
    };
  }

  async function publicar(boton, mensaje) {
    const texto = boton.innerHTML;
    boton.disabled = true; boton.textContent = "Publicando…";
    try {
      await escribir(seccion, mensaje);
      aviso("Publicado. Se verá en la app en 1–2 minutos");
      pintarSeccion();
    } catch (e) {
      boton.disabled = false; boton.innerHTML = texto;
      aviso("Error: " + e.message);
      delete cache[seccion]; // fuerza recarga la próxima vez
    }
  }

  // ---------- Perfiles ----------
  function pintarPerfiles(zona) {
    const lista = cache.perfiles.datos.perfiles || [];
    const pendientes = lista.filter(p => !p.aprobado);
    const orden = [...pendientes, ...lista.filter(p => p.aprobado)];
    zona.innerHTML = `
      ${pendientes.length ? `<div class="aviso info">${pendientes.length} perfil${pendientes.length > 1 ? "es" : ""} pendiente${pendientes.length > 1 ? "s" : ""} de aprobar.</div>` : ""}
      ${orden.length ? "" : `<div class="vacio">Nadie ha enviado su perfil todavía.</div>`}
      ${orden.map(p => `
        <div class="pastilla columna">
          <div class="fila">
            ${App.avatar(p)}
            <div class="texto"><div class="titulo">${escapar(p.nombre)}</div>
            <div class="detalle">${p.aprobado ? "✓ Publicado" : "⏳ Pendiente"} · ${escapar(App.horaRelativa(p.actualizado))}</div></div>
          </div>
          ${/^\d\d-\d\d$/.test(p.cumple || "") ? `<div class="dato"><b>Cumpleaños</b>🎂 ${Number(p.cumple.slice(3))} de ${App.MESES[Number(p.cumple.slice(0, 2)) - 1]}</div>` : ""}
          ${p.sobreMi ? `<div class="dato"><b>Sobre mí</b>${escapar(p.sobreMi)}</div>` : ""}
          ${p.gustos ? `<div class="dato"><b>Me gusta</b>${escapar(p.gustos)}</div>` : ""}
          ${p.intencion ? `<div class="dato"><b>Reza por mí</b>${escapar(p.intencion)}</div>` : ""}
          <div class="fila-botones">
            <button class="boton ${p.aprobado ? "suave" : ""}" data-aprobar="${escapar(p.id)}">${p.aprobado ? "Ocultar" : "Aprobar"}</button>
            <button class="boton peligro" data-borrar="${escapar(p.id)}">Borrar</button>
          </div>
        </div>`).join("")}
      <button class="boton suave ancho" id="recargar" style="margin-top:8px">Recargar desde GitHub</button>`;

    document.getElementById("recargar").onclick = () => pintarSeccion(true);
    zona.querySelectorAll("[data-aprobar]").forEach(b => b.onclick = async () => {
      const p = lista.find(x => x.id === b.dataset.aprobar);
      p.aprobado = !p.aprobado;
      await publicar(b, `${p.aprobado ? "Aprueba" : "Oculta"} perfil: ${p.nombre}`);
    });
    zona.querySelectorAll("[data-borrar]").forEach(b => b.onclick = async () => {
      const p = lista.find(x => x.id === b.dataset.borrar);
      if (!confirm(`¿Borrar el perfil de ${p.nombre}?`)) return;
      cache.perfiles.datos.perfiles = lista.filter(x => x.id !== p.id);
      await publicar(b, `Borra perfil: ${p.nombre}`);
      if (p.foto) borrarArchivo(p.foto, `Borra foto de perfil: ${p.nombre}`);
    });
  }

  // ---------- Galería ----------
  // Los chicos escriben en la galería a la vez que el admin, así que cada cambio
  // se aplica sobre la versión más reciente y se reintenta si hay choque.
  const MOMENTOS_G = { "mañana": "🌅 Mañana", "mediodía": "☀️ Mediodía", "tarde": "🌇 Tarde", "noche": "🌙 Noche" };
  const urlFotoG = (ruta) => `https://raw.githubusercontent.com/${G.usuario}/${G.repo}/${G.rama}/${ruta}`;
  let albumAbierto = "";

  async function cambiarGaleria(cambio, mensaje) {
    for (let intento = 0; intento < 5; intento++) {
      await leer("galeria");
      const res = cambio(cache.galeria.datos);
      if (res === false) return false;
      try { await escribir("galeria", mensaje); return true; }
      catch (e) { if (!/a la vez/.test(e.message)) throw e; await new Promise(ok => setTimeout(ok, 300 + Math.random() * 500)); }
    }
    throw new Error("Hay mucha actividad en la galería. Inténtalo de nuevo en un momento.");
  }
  async function accionGaleria(boton, cambio, mensaje, archivos = []) {
    const texto = boton.innerHTML;
    boton.disabled = true; boton.textContent = "Guardando…";
    try {
      if (await cambiarGaleria(cambio, mensaje) !== false) {
        for (const a of archivos) if (a) await borrarArchivo(a, mensaje);
        aviso("Hecho");
      }
      pintarGaleria(document.getElementById("zona"));
    } catch (e) { boton.disabled = false; boton.innerHTML = texto; aviso("Error: " + e.message); }
  }

  function pintarGaleria(zona) {
    const g = cache.galeria.datos;
    const album = g.eventos.find(e => e.id === albumAbierto);
    if (album) return pintarAlbumAdmin(zona, album);
    albumAbierto = "";
    const eventos = [...g.eventos].sort((a, b) => String(b.fecha || b.creado).localeCompare(String(a.fecha || a.creado)));
    zona.innerHTML = `
      <div class="aviso info">Solo los responsables crean álbumes; los usuarios registrados suben fotos y comentan sin aprobación. Desde aquí puedes borrar lo que no deba estar.</div>
      <details class="ficha" style="margin-bottom:16px"><summary style="font-weight:700;cursor:pointer">${ICONOS.mas} Nuevo álbum</summary>
        <label class="campo" for="ga-titulo">Nombre del evento *</label><input id="ga-titulo" maxlength="60">
        <label class="campo" for="ga-fecha">Fecha</label><input id="ga-fecha" type="date" value="${new Date().toISOString().slice(0, 10)}">
        <label class="campo" for="ga-desc">Descripción</label><textarea id="ga-desc" maxlength="300" style="min-height:80px"></textarea>
        <button class="boton ancho" id="ga-crear" style="margin-top:12px">Crear álbum</button>
      </details>
      ${eventos.length ? "" : `<div class="vacio">Todavía no hay álbumes.</div>`}
      ${eventos.map(e => {
        const fotos = g.fotos.filter(f => f.evento === e.id);
        const coms = fotos.reduce((n, f) => n + (f.comentarios || []).length, 0);
        return `<div class="pastilla" role="button" data-album="${escapar(e.id)}">
          <div class="texto"><div class="titulo">${escapar(e.titulo)}</div>
          <div class="detalle">${[e.fecha ? App.fechaCorta(e.fecha) : "", `${fotos.length} foto${fotos.length === 1 ? "" : "s"}`, `${coms} comentario${coms === 1 ? "" : "s"}`, e.autor ? "creado por " + escapar(e.autor) : ""].filter(Boolean).join(" · ")}</div></div>
          <span class="flecha">${ICONOS.flecha}</span></div>`;
      }).join("")}
      <button class="boton suave ancho" id="recargar" style="margin-top:8px">Recargar desde GitHub</button>`;
    document.getElementById("recargar").onclick = () => pintarSeccion(true);
    zona.querySelectorAll("[data-album]").forEach(el => el.onclick = () => { albumAbierto = el.dataset.album; pintarGaleria(zona); window.scrollTo(0, 0); });
    document.getElementById("ga-crear").onclick = (ev) => {
      const titulo = document.getElementById("ga-titulo").value.trim();
      if (!titulo) return aviso("Falta el nombre del evento");
      const base = titulo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "evento";
      const nuevo = { id: `${base}-${Date.now().toString(36)}`, titulo, fecha: document.getElementById("ga-fecha").value,
        descripcion: document.getElementById("ga-desc").value.trim().slice(0, 300), autor: "Responsables", quien: "", creado: new Date().toISOString() };
      accionGaleria(ev.currentTarget, d => { d.eventos.push(nuevo); }, `Galería: nuevo álbum «${titulo}» (admin)`);
    };
  }

  // Álbum en el admin: cuadrícula por día, momento y lugar; se eligen fotos de
  // cualquiera para cambiarles el día, el momento o el lugar, o para borrarlas.
  const adminSel = new Set();
  let panelCambios = false, albumSel = "";
  const ORDEN_MOM = ["mañana", "mediodía", "tarde", "noche"];
  const ordMom = (m) => { const i = ORDEN_MOM.indexOf(m); return i < 0 ? 9 : i; };
  const ordenFotos = (fs) => [...fs].sort((a, b) =>
    (a.dia ? 0 : 1) - (b.dia ? 0 : 1) || String(a.dia).localeCompare(String(b.dia)) || ordMom(a.momento) - ordMom(b.momento) ||
    (a.lugar ? 0 : 1) - (b.lugar ? 0 : 1) || String(a.lugar || "").trim().localeCompare(String(b.lugar || "").trim(), "es") ||
    String(a.fecha).localeCompare(String(b.fecha)));
  const DIAS_G = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const diaLargoG = (iso) => { const d = App.aFecha(iso); return d ? `${DIAS_G[d.getDay()]} ${d.getDate()} de ${App.MESES[d.getMonth()]}` : ""; };
  // Miniatura: primero desde la web; si aún no está publicada, desde GitHub
  const imgFoto = (ruta, extra = "") => `<img src="${escapar(ruta)}" data-raw="${escapar(urlFotoG(ruta))}" onerror="if(!this.dataset.r){this.dataset.r=1;this.src=this.dataset.raw}" ${extra}>`;
  function gruposFotos(fotos) {
    const out = []; let clave = null;
    for (const f of fotos) {
      const k = (f.dia || "") + "|" + (f.momento || "");
      if (k !== clave) {
        clave = k;
        const titulo = [f.dia ? diaLargoG(f.dia) : (f.momento ? "" : "Sin fecha"), (MOMENTOS_G[f.momento] || "").replace(/^\S+\s/, "")].filter(Boolean).join(" · ");
        out.push({ titulo, ico: (MOMENTOS_G[f.momento] || "📅 ").split(" ")[0], subs: [] });
      }
      const g = out[out.length - 1], lugar = (f.lugar || "").trim();
      let sub = g.subs[g.subs.length - 1];
      if (!sub || sub.lugar !== lugar) { sub = { lugar, fotos: [] }; g.subs.push(sub); }
      sub.fotos.push(f);
    }
    return out;
  }

  function pintarAlbumAdmin(zona, e) {
    if (albumSel !== e.id) { adminSel.clear(); panelCambios = false; albumSel = e.id; }
    const fotos = ordenFotos(cache.galeria.datos.fotos.filter(f => f.evento === e.id));
    [...adminSel].forEach(id => { if (!fotos.some(f => f.id === id)) adminSel.delete(id); });
    if (!adminSel.size) panelCambios = false;
    const lugares = [...new Set(fotos.map(f => (f.lugar || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
    const n = adminSel.size, todas = fotos.length && fotos.every(f => adminSel.has(f.id));
    const grupos = gruposFotos(fotos);
    const elegir = (lista, attr) => `<button type="button" class="ga-elegir" ${attr}>${lista.every(f => adminSel.has(f.id)) ? "Quitar" : "Elegir"} ${lista.length}</button>`;
    const conComentarios = fotos.filter(f => (f.comentarios || []).length);
    const y = window.scrollY;
    zona.innerHTML = `
      <button class="boton suave" id="ga-volver" style="padding:8px 14px;margin-bottom:6px">${ICONOS.atras} Álbumes</button>
      <details class="ficha" ${fotos.length ? "" : "open"}><summary style="font-weight:700;cursor:pointer">Datos del álbum: ${escapar(e.titulo)}</summary>
        <label class="campo" for="ga-et">Nombre del evento</label><input id="ga-et" maxlength="60" value="${escapar(e.titulo)}">
        <label class="campo" for="ga-ef">Fecha</label><input id="ga-ef" type="date" value="${escapar(e.fecha || "")}">
        <label class="campo" for="ga-ed">Descripción</label><textarea id="ga-ed" maxlength="300" style="min-height:70px">${escapar(e.descripcion || "")}</textarea>
        <div class="fila-botones">
          <button class="boton" id="ga-guardar">Guardar cambios</button>
          <button class="boton peligro" id="ga-borrar-album">${ICONOS.papelera} Borrar álbum</button>
        </div>
      </details>
      ${fotos.length ? `
      <div class="ga-barra">
        <div class="ga-barra-info"><b>${n}</b> de ${fotos.length} foto${fotos.length === 1 ? "" : "s"} elegida${n === 1 ? "" : "s"}
          <button type="button" id="ga-todas">${todas ? "Quitar todas" : "Elegir todas"}</button></div>
        <div class="fila-botones" style="margin-top:8px">
          <button class="boton" id="ga-cambiar" ${n ? "" : "disabled"}>Cambiar día, momento o lugar</button>
          <button class="boton peligro" id="ga-borrar-sel" ${n ? "" : "disabled"}>${ICONOS.papelera} Borrar</button>
        </div>
      </div>
      ${panelCambios ? `
      <div class="ficha ga-panel">
        <p class="detalle" style="margin:0 0 4px;color:var(--texto-secundario);font-size:13.5px">Se aplicará a <b>${n}</b> foto${n === 1 ? "" : "s"}, sean de quien sean. Lo que dejes en «No cambiar» se queda como estaba en cada foto.</p>
        <label class="campo" for="gc-dia-modo">Día</label>
        <select id="gc-dia-modo"><option value="">No cambiar</option><option value="poner">Poner este día…</option><option value="quitar">Quitar el día</option></select>
        <input id="gc-dia" type="date" value="${escapar(e.fecha || "")}" hidden style="margin-top:8px">
        <label class="campo" for="gc-momento">Momento</label>
        <select id="gc-momento"><option value="__igual">No cambiar</option>${ORDEN_MOM.map(m => `<option value="${m}">${MOMENTOS_G[m]}</option>`).join("")}<option value="">Quitar el momento</option></select>
        <label class="campo" for="gc-lugar">Lugar</label>
        <select id="gc-lugar"><option value="__igual">No cambiar</option>${lugares.map(l => `<option>${escapar(l)}</option>`).join("")}<option value="__nuevo">✏️ Escribir un lugar nuevo…</option><option value="__quitar">Quitar el lugar</option></select>
        <input id="gc-lugar-nuevo" maxlength="60" placeholder="Escribe el lugar" hidden style="margin-top:8px">
        <div class="fila-botones" style="margin-top:14px">
          <button class="boton suave" id="gc-cancelar">Cancelar</button>
          <button class="boton" id="gc-aplicar">Aplicar a ${n} foto${n === 1 ? "" : "s"}</button>
        </div>
      </div>` : ""}
      <p class="detalle" style="color:var(--texto-secundario);font-size:13.5px;margin:4px 2px 0">Toca las fotos para elegirlas, o «Elegir» junto a un momento o un lugar.</p>
      ${grupos.map((g, i) => `
        <section class="ga-grupo">
          <h3 class="ga-grupo-titulo"><span>${g.ico}</span><span class="ga-grupo-nombre">${escapar(g.titulo)}</span>${elegir(g.subs.flatMap(s => s.fotos), `data-g="${i}"`)}</h3>
          ${g.subs.map((sub, k) => `
            <div class="ga-sub"><span>📍 ${escapar(sub.lugar || "Sin lugar")}</span><small>${sub.fotos.length}</small>${elegir(sub.fotos, `data-s="${i}:${k}"`)}</div>
            <div class="ga-cuadricula">${sub.fotos.map(f => `
              <button type="button" class="ga-celda ${adminSel.has(f.id) ? "elegida" : ""}" data-sel="${escapar(f.id)}" title="${escapar([f.titulo, "de " + f.autor, f.lugar].filter(Boolean).join(" · "))}">
                ${imgFoto(f.mini, 'loading="lazy" alt=""')}
                <span class="ga-check">${adminSel.has(f.id) ? "✓" : ""}</span>
                ${f.video ? `<span class="ga-video">▶${f.duracion ? " " + Math.floor(f.duracion / 60) + ":" + String(Math.round(f.duracion) % 60).padStart(2, "0") : ""}</span>` : ""}
                <span class="ga-autor">${escapar(f.autor)}</span>
              </button>`).join("")}</div>`).join("")}
        </section>`).join("")}
      ${conComentarios.length ? `<h3 class="titulo-grupo" style="margin-top:26px">Comentarios</h3>` : ""}
      ${conComentarios.map(f => `
        <div class="pastilla columna" style="align-items:stretch">
          <div class="fila" style="align-items:flex-start">
            ${imgFoto(f.mini, 'alt="" loading="lazy" style="width:64px;height:64px;border-radius:12px;object-fit:cover;flex-shrink:0;background:var(--azul-suave)"')}
            <div class="texto">
              <div class="titulo" style="font-size:15px">${escapar(f.titulo || "Foto de " + f.autor)}</div>
              <div class="detalle">${[f.dia ? App.fechaCorta(f.dia) : "", MOMENTOS_G[f.momento] || "", f.lugar ? "📍 " + escapar(f.lugar) : ""].filter(Boolean).join(" · ")}</div>
            </div>
          </div>
          ${(f.comentarios || []).map(c => `
            <div class="dato" style="display:flex;gap:10px;align-items:flex-start"><div style="flex:1"><b>${escapar(c.autor)}</b>${escapar(c.texto)}</div>
            <button class="boton peligro" style="padding:6px 10px;font-size:12.5px" data-borrar-com="${escapar(f.id)}|${escapar(c.id)}">Borrar</button></div>`).join("")}
        </div>`).join("")}`
      : `<div class="vacio">Este álbum no tiene fotos.</div>`}`;
    window.scrollTo(0, y);
    const repintar = () => pintarAlbumAdmin(zona, e);

    document.getElementById("ga-volver").onclick = () => { albumAbierto = ""; adminSel.clear(); panelCambios = false; pintarGaleria(zona); };
    document.getElementById("ga-guardar").onclick = (ev) => {
      const titulo = document.getElementById("ga-et").value.trim();
      if (!titulo) return aviso("Falta el nombre del evento");
      accionGaleria(ev.currentTarget, d => {
        const x = d.eventos.find(y => y.id === e.id); if (!x) return false;
        Object.assign(x, { titulo, fecha: document.getElementById("ga-ef").value, descripcion: document.getElementById("ga-ed").value.trim().slice(0, 300) });
      }, `Galería: edita el álbum «${titulo}» (admin)`);
    };
    document.getElementById("ga-borrar-album").onclick = (ev) => {
      if (!confirm(`¿Borrar el álbum «${e.titulo}» con sus ${fotos.length} fotos y todos sus comentarios? No se puede deshacer.`)) return;
      const archivos = fotos.flatMap(f => [f.ruta, f.mini, f.video].filter(Boolean));
      albumAbierto = "";
      accionGaleria(ev.currentTarget, d => {
        d.eventos = d.eventos.filter(x => x.id !== e.id);
        d.fotos = d.fotos.filter(x => x.evento !== e.id);
      }, `Galería: borra el álbum «${e.titulo}» (admin)`, archivos);
    };
    if (!fotos.length) return;

    // Elegir fotos
    zona.querySelectorAll("[data-sel]").forEach(b => b.onclick = () => {
      const id = b.dataset.sel; if (adminSel.has(id)) adminSel.delete(id); else adminSel.add(id); repintar();
    });
    const alternar = (lista) => { const t = lista.every(f => adminSel.has(f.id)); lista.forEach(f => t ? adminSel.delete(f.id) : adminSel.add(f.id)); repintar(); };
    zona.querySelectorAll("[data-g]").forEach(b => b.onclick = () => alternar(grupos[+b.dataset.g].subs.flatMap(s => s.fotos)));
    zona.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { const [i, k] = b.dataset.s.split(":").map(Number); alternar(grupos[i].subs[k].fotos); });
    document.getElementById("ga-todas").onclick = () => { if (todas) adminSel.clear(); else fotos.forEach(f => adminSel.add(f.id)); repintar(); };

    // Cambiar día, momento y/o lugar
    document.getElementById("ga-cambiar").onclick = () => { panelCambios = true; repintar(); document.querySelector(".ga-panel").scrollIntoView({ behavior: "smooth", block: "center" }); };
    if (panelCambios) {
      const dm = document.getElementById("gc-dia-modo"), ln = document.getElementById("gc-lugar");
      dm.onchange = () => { document.getElementById("gc-dia").hidden = dm.value !== "poner"; };
      ln.onchange = () => { const i = document.getElementById("gc-lugar-nuevo"); i.hidden = ln.value !== "__nuevo"; if (!i.hidden) i.focus(); };
      document.getElementById("gc-cancelar").onclick = () => { panelCambios = false; repintar(); };
      document.getElementById("gc-aplicar").onclick = (ev) => {
        const cambios = {};
        if (dm.value === "poner") { const d = document.getElementById("gc-dia").value; if (!d) return aviso("Elige el día"); cambios.dia = d; }
        if (dm.value === "quitar") cambios.dia = "";
        const m = document.getElementById("gc-momento").value; if (m !== "__igual") cambios.momento = m;
        if (ln.value === "__nuevo") { const v = document.getElementById("gc-lugar-nuevo").value.trim().slice(0, 60); if (!v) return aviso("Escribe el lugar"); cambios.lugar = v; }
        else if (ln.value === "__quitar") cambios.lugar = "";
        else if (ln.value !== "__igual") cambios.lugar = ln.value;
        if (!Object.keys(cambios).length) return aviso("No has elegido nada que cambiar");
        const ids = [...adminSel];
        accionGaleria(ev.currentTarget, d => {
          let hechas = 0;
          d.fotos.forEach(f => { if (ids.includes(f.id)) { Object.assign(f, cambios); hechas++; } });
          if (!hechas) return false;
          adminSel.clear(); panelCambios = false;
        }, `Galería: el admin cambia los datos de ${ids.length} foto${ids.length === 1 ? "" : "s"}`);
      };
    }

    // Borrar las elegidas
    document.getElementById("ga-borrar-sel").onclick = (ev) => {
      const ids = [...adminSel], elegidas = fotos.filter(f => ids.includes(f.id));
      if (!confirm(`¿Borrar ${ids.length} foto${ids.length === 1 ? "" : "s"} y sus comentarios? No se puede deshacer.`)) return;
      accionGaleria(ev.currentTarget, d => {
        const antes = d.fotos.length; d.fotos = d.fotos.filter(x => !ids.includes(x.id));
        if (d.fotos.length === antes) return false;
        adminSel.clear(); panelCambios = false;
      }, `Galería: el admin borra ${ids.length} foto${ids.length === 1 ? "" : "s"}`, elegidas.flatMap(f => [f.ruta, f.mini, f.video].filter(Boolean)));
    };

    zona.querySelectorAll("[data-borrar-com]").forEach(b => b.onclick = () => {
      const [idF, idC] = b.dataset.borrarCom.split("|");
      if (!confirm("¿Borrar este comentario?")) return;
      accionGaleria(b, d => {
        const f = d.fotos.find(x => x.id === idF); if (!f) return false;
        const n = (f.comentarios || []).length; f.comentarios = (f.comentarios || []).filter(c => c.id !== idC);
        if (f.comentarios.length === n) return false;
      }, `Galería: borra un comentario (admin)`);
    });
  }

  // ---------- Usuarios (cuentas para entrar en la web) ----------
  // Las cuentas están cifradas: se gestionan a través del Worker, que comprueba
  // con tu token de GitHub que eres responsable.
  async function servidorAdmin(accion, datos = {}) {
    return App.servidorCuentas(accion, Object.assign({ ghToken: token }, datos));
  }
  async function pintarUsuarios(zona, lista) {
    if (!lista) {
      try { lista = (await servidorAdmin("adminListar")).cuentas; }
      catch (e) {
        zona.innerHTML = `<div class="aviso">${e.codigo === "sin-activar"
          ? "El registro todavía no está activado. En Cloudflare añade al Worker las variables <b>CODIGO_GRUPO</b> y <b>SECRETO</b> (mira el README)."
          : "No se pudo cargar: " + escapar(e.message)}</div>`;
        return;
      }
    }
    const orden = [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    let nombresPerfil = {};
    try { (await App.cargar("perfiles")).perfiles.forEach(p => { nombresPerfil[p.id] = p.nombre; }); } catch (e) {}
    zona.innerHTML = `
      <div class="aviso info">Para registrarse hace falta el <b>código del grupo</b> (variable <b>CODIGO_GRUPO</b> en Cloudflare). Si alguien olvida su contraseña, ponle una nueva aquí y díselo; podrá cambiarla luego.</div>
      <h3 class="titulo-grupo">${orden.length} cuenta${orden.length === 1 ? "" : "s"}</h3>
      ${orden.length ? "" : `<div class="vacio">Todavía no se ha registrado nadie.</div>`}
      ${orden.map(c => `
        <div class="pastilla columna">
          <div class="fila">
            <div class="texto"><div class="titulo">${escapar(c.nombre)}</div>
            <div class="detalle">Usuario: <b>${escapar(c.usuario)}</b> · desde el ${escapar(c.creado ? App.fechaCorta(c.creado.slice(0, 10)) : "—")}</div>
            ${c.perfil ? `<div class="detalle">Perfil recuperado: <b>${escapar(nombresPerfil[c.perfil] || "(ya no existe)")}</b></div>` : ""}</div>
          </div>
          <div class="fila-botones">
            <button class="boton suave" data-renombrar="${escapar(c.id)}">Cambiar nombre</button>
            <button class="boton secundario" data-clave="${escapar(c.id)}">Nueva contraseña</button>
            ${c.perfil ? `<button class="boton suave" data-desvincular="${escapar(c.id)}">Desvincular perfil</button>` : ""}
            <button class="boton peligro" data-borrar-cuenta="${escapar(c.id)}">Borrar</button>
          </div>
        </div>`).join("")}
      <button class="boton suave ancho" id="recargar" style="margin-top:8px">Recargar</button>`;
    const buscar = (id) => lista.find(x => x.id === id);
    const hacer = async (b, accion, datos, ok) => {
      const t = b.innerHTML; b.disabled = true; b.textContent = "Guardando…";
      try { const j = await servidorAdmin(accion, datos); aviso(ok); pintarUsuarios(zona, j.cuentas); }
      catch (e) { b.disabled = false; b.innerHTML = t; aviso("Error: " + e.message); }
    };
    document.getElementById("recargar").onclick = () => pintarUsuarios(zona);
    zona.querySelectorAll("[data-renombrar]").forEach(b => b.onclick = () => {
      const c = buscar(b.dataset.renombrar);
      const nombre = (prompt(`Nuevo nombre para ${c.nombre}:`, c.nombre) || "").trim();
      if (!nombre || nombre === c.nombre) return;
      hacer(b, "adminRenombrar", { id: c.id, nombre }, "Nombre cambiado. Tendrá que volver a entrar");
    });
    zona.querySelectorAll("[data-clave]").forEach(b => b.onclick = async () => {
      const c = buscar(b.dataset.clave);
      const nueva = prompt(`Nueva contraseña para ${c.nombre} (usuario «${c.usuario}»). Mínimo 6 caracteres:`) || "";
      if (!nueva) return;
      if (nueva.length < 6) return aviso("Mínimo 6 caracteres");
      hacer(b, "adminRestablecer", { id: c.id, hash: await App.hashClave(c.usuario, nueva) }, `Contraseña cambiada. Díselo a ${c.nombre}`);
    });
    zona.querySelectorAll("[data-desvincular]").forEach(b => b.onclick = () => {
      const c = buscar(b.dataset.desvincular);
      if (!confirm(`¿Desvincular el perfil «${nombresPerfil[c.perfil] || ""}» de la cuenta de ${c.nombre}? Volverá a aparecer en la lista del registro para que lo recupere quien sea de verdad.`)) return;
      hacer(b, "adminDesvincular", { id: c.id }, "Perfil desvinculado");
    });
    zona.querySelectorAll("[data-borrar-cuenta]").forEach(b => b.onclick = () => {
      const c = buscar(b.dataset.borrarCuenta);
      if (!confirm(`¿Borrar la cuenta de ${c.nombre}? Ya no podrá entrar en la web. Sus fotos y comentarios se quedan (puedes borrarlos en Galería).`)) return;
      hacer(b, "adminBorrar", { id: c.id }, "Cuenta borrada");
    });
  }

  if (token) pintarPanel(); else pintarLogin();
})();
