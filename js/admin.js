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

  const archivoDe = (tipo) => tipo === "perfiles" ? "data/perfiles.json" : CONFIG.esquemas[tipo].archivo;

  async function leer(tipo) {
    try {
      const r = await gh(`/contents/${archivoDe(tipo)}?ref=${encodeURIComponent(G.rama)}`);
      cache[tipo] = { datos: JSON.parse(deBase64(r.content)), sha: r.sha };
    } catch (e) {
      if (e.status !== 404) throw e;
      cache[tipo] = { datos: tipo === "perfiles" ? { perfiles: [] } : { entradas: [] }, sha: null };
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
    ["lectio", "Lectio"], ["retiro", "Retiro"], ["agenda", "Agenda"], ["recursos", "Libros y vídeos"], ["articulos", "Artículos"], ["perfiles", "Perfiles"]
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
    try {
      if (forzar || !cache[seccion]) await leer(seccion);
    } catch (e) {
      if (e.status === 401) { localStorage.removeItem(CLAVE_TOKEN); return pintarLogin("La clave ha caducado. Vuelve a introducirla."); }
      zona.innerHTML = `<div class="aviso">No se pudo cargar: ${escapar(e.message)}</div>`; return;
    }
    if (seccion === "perfiles") return pintarPerfiles(zona);

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

  if (token) pintarPanel(); else pintarLogin();
})();
