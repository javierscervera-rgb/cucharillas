/* =========================================================
   CUCHARILLAS · Servidor de perfiles y galería (Cloudflare Worker, gratis)

   Por qué existe: para escribir en GitHub hace falta una clave secreta.
   Esa clave NO puede ir dentro de la app (cualquiera podría verla), así
   que vive aquí, en el Worker. Los chicos envían su perfil (o sus fotos y
   comentarios de la galería) al Worker y el Worker lo guarda en el
   repositorio: data/perfiles.json, data/galeria.json e img/galeria/.

   Variables que hay que configurar en Cloudflare (Settings → Variables):
     GITHUB_TOKEN     (tipo "Secret")  token con permiso Contents: Read and write
     REPO             ej.: "mi-usuario/cucharillas"
     RAMA             ej.: "main"
     ORIGEN_PERMITIDO ej.: "https://mi-usuario.github.io"
     GALERIA_CLAVE    (tipo "Secret")  contraseña del grupo para entrar en la galería
   ========================================================= */

const MAX_PERFILES = 300;
const LIMITES = { nombre: 30, emoji: 8, color: 9, sobreMi: 300, gustos: 120, intencion: 200, cumple: 5 };

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ORIGEN_PERMITIDO || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8"
    };
    const responder = (cuerpo, estado = 200) => new Response(JSON.stringify(cuerpo), { status: estado, headers: cors });

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return responder({ error: "Método no permitido" }, 405);

    const origen = request.headers.get("Origin");
    if (env.ORIGEN_PERMITIDO && origen && origen !== env.ORIGEN_PERMITIDO) return responder({ error: "Origen no permitido" }, 403);

    let datos;
    try { datos = await request.json(); } catch { return responder({ error: "Datos no válidos" }, 400); }

    // Galería de fotos: va por su propio camino (más abajo)
    if (datos && datos.servicio === "galeria") {
      try { return await galeria(datos, env, responder); }
      catch (e) { return responder({ error: "Error en el servidor: " + (e && e.message || e) }, 500); }
    }

    const { accion, id, clave, perfil, foto, quitarFoto } = datos || {};
    if (!/^[a-f0-9]{12}$/.test(id || "") || !/^[a-f0-9]{32}$/.test(clave || "")) return responder({ error: "Identificación no válida" }, 400);
    if (accion !== "guardar" && accion !== "borrar") return responder({ error: "Acción no válida" }, 400);

    const claveHash = await sha256(clave);
    const rutaFoto = `img/perfiles/${id}.jpg`;

    if (foto !== undefined && foto !== null) {
      // Solo JPEG (lo que genera la app) y como mucho ~300 KB
      if (typeof foto !== "string" || !foto.startsWith("/9j/") || foto.length > 400000) return responder({ error: "Foto no válida" }, 400);
    }

    // Comprobamos que el perfil es de este móvil antes de tocar la foto
    {
      const { lista } = await leer(env);
      const previo = lista.find(p => p.id === id);
      if (previo && previo.claveHash !== claveHash) return responder({ error: "Este perfil pertenece a otro móvil" }, 403);
      if (!previo && accion === "guardar" && lista.length >= MAX_PERFILES) return responder({ error: "Se ha alcanzado el máximo de perfiles" }, 400);
    }

    let nuevaFoto = null; // null = no cambia
    if (accion === "borrar" || quitarFoto) {
      await borrarArchivo(env, rutaFoto, `Quita foto de perfil ${id}`);
      nuevaFoto = "";
    }
    if (accion === "guardar" && foto) {
      const r = await subirArchivo(env, rutaFoto, foto, `Foto de perfil ${id}`);
      if (!r.ok) return responder({ error: "No se pudo guardar la foto (" + r.status + ")" }, 502);
      nuevaFoto = `${rutaFoto}?v=${Date.now()}`;
    }

    // Reintenta si otro envío ha escrito el archivo a la vez
    for (let intento = 0; intento < 4; intento++) {
      const { lista, sha } = await leer(env);
      const i = lista.findIndex(p => p.id === id);
      if (i >= 0 && lista[i].claveHash !== claveHash) return responder({ error: "Este perfil pertenece a otro móvil" }, 403);

      if (accion === "borrar") {
        if (i < 0) return responder({ ok: true });
        lista.splice(i, 1);
      } else {
        const limpio = {};
        for (const [campo, max] of Object.entries(LIMITES)) limpio[campo] = String((perfil || {})[campo] || "").trim().slice(0, max);
        if (!limpio.nombre) return responder({ error: "Falta el nombre" }, 400);
        if (!/^#[0-9a-fA-F]{6}$/.test(limpio.color)) limpio.color = "#E8F4FD";
        // Cumpleaños como "MM-DD" (sin año)
        if (!/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(limpio.cumple)) limpio.cumple = "";

        // Cada cambio vuelve a quedar pendiente de aprobación por un responsable
        const fotoFinal = nuevaFoto !== null ? nuevaFoto : (i >= 0 ? lista[i].foto || "" : "");
        const nuevo = Object.assign({ id }, limpio, { foto: fotoFinal, aprobado: false, actualizado: new Date().toISOString(), claveHash });
        if (i >= 0) lista[i] = nuevo; else lista.push(nuevo);
      }

      const r = await escribir(env, lista, sha, `${accion === "borrar" ? "Retira" : "Actualiza"} perfil ${id}`);
      if (r.ok) return responder({ ok: true });
      if (r.status !== 409 && r.status !== 422) return responder({ error: "GitHub respondió " + r.status }, 502);
    }
    return responder({ error: "Mucho tráfico, inténtalo de nuevo" }, 503);
  }
};

async function subirArchivo(env, ruta, base64, mensaje) {
  const previo = await gh(env, `${ruta}?ref=${encodeURIComponent(env.RAMA || "main")}`);
  const cuerpo = { message: mensaje, content: base64, branch: env.RAMA || "main" };
  if (previo.ok) cuerpo.sha = (await previo.json()).sha;
  return gh(env, ruta, { method: "PUT", body: JSON.stringify(cuerpo) });
}

async function borrarArchivo(env, ruta, mensaje) {
  const previo = await gh(env, `${ruta}?ref=${encodeURIComponent(env.RAMA || "main")}`);
  if (!previo.ok) return;
  const { sha } = await previo.json();
  await gh(env, ruta, { method: "DELETE", body: JSON.stringify({ message: mensaje, sha, branch: env.RAMA || "main" }) });
}

async function gh(env, ruta, opciones = {}) {
  return fetch(`https://api.github.com/repos/${env.REPO}/contents/${ruta}`, Object.assign({}, opciones, {
    headers: {
      Authorization: "Bearer " + env.GITHUB_TOKEN,
      Accept: "application/vnd.github+json",
      "User-Agent": "cucharillas-perfiles"
    }
  }));
}

async function leer(env) {
  const r = await gh(env, `data/perfiles.json?ref=${encodeURIComponent(env.RAMA || "main")}`);
  if (r.status === 404) return { lista: [], sha: null };
  const j = await r.json();
  const texto = new TextDecoder().decode(Uint8Array.from(atob(j.content.replace(/\s/g, "")), c => c.charCodeAt(0)));
  return { lista: JSON.parse(texto).perfiles || [], sha: j.sha };
}

async function escribir(env, lista, sha, mensaje) {
  const bytes = new TextEncoder().encode(JSON.stringify({ perfiles: lista }, null, 2) + "\n");
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  const cuerpo = { message: mensaje, content: btoa(bin), branch: env.RAMA || "main" };
  if (sha) cuerpo.sha = sha;
  return gh(env, "data/perfiles.json", { method: "PUT", body: JSON.stringify(cuerpo) });
}

async function sha256(texto) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(h), b => b.toString(16).padStart(2, "0")).join("");
}

/* =========================================================
   GALERÍA DE FOTOS
   Todo se guarda en data/galeria.json; las fotos en img/galeria/<evento>/.
   Cada móvil tiene un identificador secreto ("yo"): solo se guarda su huella,
   y sirve para saber de quién es cada foto/comentario y para los "me gusta".
   No hace falta aprobación; los responsables pueden borrar desde el admin.
   ========================================================= */

const G_LIM = {
  titulo: 60, descripcion: 300, autor: 30, pie: 200, comentario: 500, lugar: 60,
  maxEventos: 200, maxFotosEvento: 400, maxComentarios: 300,
  foto: 1100000, mini: 220000   // tamaño máximo en base64 (≈ 800 KB y 160 KB)
};
const RUTA_GALERIA = "data/galeria.json";
const MOMENTOS = ["mañana", "mediodía", "tarde", "noche"];

// Día, momento y lugar de una foto (todo opcional)
function datosFoto(d) {
  return {
    dia: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(d.dia || "") ? d.dia : "",
    momento: MOMENTOS.includes(d.momento) ? d.momento : "",
    lugar: recortar(d.lugar, G_LIM.lugar)
  };
}

async function galeria(d, env, responder) {
  if (!env.GALERIA_CLAVE) return responder({ error: "La galería todavía no está activada en el servidor", codigo: "sin-activar" }, 503);
  if (!(await mismaClave(String(d.clave || ""), String(env.GALERIA_CLAVE)))) {
    return responder({ error: "Contraseña incorrecta", codigo: "clave" }, 401);
  }

  const accion = d.accion;
  if (accion === "ver") {
    const { datos } = await leerGaleria(env);
    return responder({ ok: true, galeria: datos });
  }

  if (!/^[a-f0-9]{32}$/.test(d.yo || "")) return responder({ error: "Identificación no válida" }, 400);
  const quien = (await sha256("galeria:" + d.yo)).slice(0, 20);
  const autor = recortar(d.autor, G_LIM.autor) || "Anónimo";
  const ahora = new Date().toISOString();
  const idValido = (x) => /^[a-z0-9-]{1,80}$/.test(x || "");

  // ----- Crear evento -----
  if (accion === "crearEvento") {
    const titulo = recortar(d.titulo, G_LIM.titulo);
    if (!titulo) return responder({ error: "Falta el nombre del evento" }, 400);
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(d.fecha || "") ? d.fecha : "";
    const id = `${slug(titulo)}-${Date.now().toString(36)}`;
    return modificarGaleria(env, responder, `Galería: nuevo evento «${titulo}»`, (g) => {
      if (g.eventos.length >= G_LIM.maxEventos) return "Se ha alcanzado el máximo de eventos";
      g.eventos.push({ id, titulo, fecha, descripcion: recortar(d.descripcion, G_LIM.descripcion), autor, quien, creado: ahora });
    }, { evento: id });
  }

  // ----- Subir foto -----
  if (accion === "subirFoto") {
    if (!idValido(d.evento)) return responder({ error: "Evento no válido" }, 400);
    const esJpeg = (b, max) => typeof b === "string" && b.startsWith("/9j/") && b.length <= max && /^[A-Za-z0-9+/=]+$/.test(b);
    if (!esJpeg(d.foto, G_LIM.foto) || !esJpeg(d.mini, G_LIM.mini)) return responder({ error: "Foto no válida o demasiado grande" }, 400);
    {
      const { datos } = await leerGaleria(env);
      if (!datos.eventos.some(e => e.id === d.evento)) return responder({ error: "Ese evento ya no existe" }, 404);
      if (datos.fotos.filter(f => f.evento === d.evento).length >= G_LIM.maxFotosEvento) return responder({ error: "Este evento ya tiene el máximo de fotos" }, 400);
    }
    const id = aleatorioHex(10);
    const ruta = `img/galeria/${d.evento}/${id}.jpg`;
    const mini = `img/galeria/${d.evento}/${id}-m.jpg`;
    const r1 = await subirArchivo(env, ruta, d.foto, `Galería: foto ${id}`);
    if (!r1.ok) return responder({ error: "No se pudo guardar la foto (" + r1.status + ")" }, 502);
    const r2 = await subirArchivo(env, mini, d.mini, `Galería: miniatura ${id}`);
    if (!r2.ok) { await borrarArchivo(env, ruta, `Galería: deshace foto ${id}`); return responder({ error: "No se pudo guardar la foto (" + r2.status + ")" }, 502); }
    const ancho = Math.max(0, Math.min(10000, parseInt(d.ancho, 10) || 0));
    const alto = Math.max(0, Math.min(10000, parseInt(d.alto, 10) || 0));
    const res = await modificarGaleria(env, null, `Galería: añade foto ${id}`, (g) => {
      if (!g.eventos.some(e => e.id === d.evento)) return "Ese evento ya no existe";
      g.fotos.push(Object.assign({ id, evento: d.evento, ruta, mini, ancho, alto, pie: recortar(d.pie, G_LIM.pie) }, datosFoto(d),
        { autor, quien, fecha: ahora, likes: [], comentarios: [] }));
    }, { foto: id });
    if (res.error) { await borrarArchivo(env, ruta, `Galería: deshace foto ${id}`); await borrarArchivo(env, mini, `Galería: deshace miniatura ${id}`); }
    return responder(res.cuerpo, res.estado);
  }

  // ----- Corregir pie, día, momento y lugar (solo quien la subió) -----
  if (accion === "editarFoto") {
    return modificarGaleria(env, responder, `Galería: edita la foto ${d.foto}`, (g) => {
      const f = g.fotos.find(x => x.id === d.foto);
      if (!f) return "Esa foto ya no existe";
      if (f.quien !== quien) return "Solo quien subió la foto puede cambiarla";
      Object.assign(f, { pie: recortar(d.pie, G_LIM.pie) }, datosFoto(d));
    });
  }

  // ----- Me gusta (pone o quita) -----
  if (accion === "like") {
    return modificarGaleria(env, responder, `Galería: me gusta en ${d.foto}`, (g) => {
      const f = g.fotos.find(x => x.id === d.foto);
      if (!f) return "Esa foto ya no existe";
      f.likes = f.likes || [];
      const i = f.likes.indexOf(quien);
      const quiero = typeof d.valor === "boolean" ? d.valor : i < 0;
      if (quiero && i < 0) f.likes.push(quien);
      if (!quiero && i >= 0) f.likes.splice(i, 1);
      if (quiero === (i >= 0)) return { sinCambios: true };
    });
  }

  // ----- Comentar -----
  if (accion === "comentar") {
    const texto = recortar(d.texto, G_LIM.comentario);
    if (!texto) return responder({ error: "El comentario está vacío" }, 400);
    return modificarGaleria(env, responder, `Galería: comentario en ${d.foto}`, (g) => {
      const f = g.fotos.find(x => x.id === d.foto);
      if (!f) return "Esa foto ya no existe";
      f.comentarios = f.comentarios || [];
      if (f.comentarios.length >= G_LIM.maxComentarios) return "Esta foto ya tiene el máximo de comentarios";
      f.comentarios.push({ id: aleatorioHex(8), autor, texto, fecha: ahora, quien });
    });
  }

  // ----- Borrar lo propio -----
  if (accion === "borrarFoto") {
    let borrada = null;
    const res = await modificarGaleria(env, null, `Galería: su autor borra la foto ${d.foto}`, (g) => {
      const i = g.fotos.findIndex(x => x.id === d.foto);
      if (i < 0) return { sinCambios: true };
      if (g.fotos[i].quien !== quien) return "Solo quien subió la foto puede borrarla";
      borrada = g.fotos.splice(i, 1)[0];
    });
    if (borrada) {
      await borrarArchivo(env, borrada.ruta, `Galería: borra foto ${borrada.id}`);
      await borrarArchivo(env, borrada.mini, `Galería: borra miniatura ${borrada.id}`);
    }
    return responder(res.cuerpo, res.estado);
  }
  if (accion === "borrarComentario") {
    return modificarGaleria(env, responder, `Galería: su autor borra un comentario`, (g) => {
      const f = g.fotos.find(x => x.id === d.foto);
      if (!f) return { sinCambios: true };
      const i = (f.comentarios || []).findIndex(c => c.id === d.comentario);
      if (i < 0) return { sinCambios: true };
      if (f.comentarios[i].quien !== quien) return "Solo quien escribió el comentario puede borrarlo";
      f.comentarios.splice(i, 1);
    });
  }

  return responder({ error: "Acción no válida" }, 400);
}

// Lee, aplica el cambio y escribe; si otro móvil escribió a la vez, lo reintenta.
// cambio(g) devuelve: nada (ok), un texto (error) o { sinCambios: true }.
async function modificarGaleria(env, responder, mensaje, cambio, extra) {
  let res = null;
  for (let intento = 0; intento < 6 && !res; intento++) {
    const { datos, sha } = await leerGaleria(env);
    const r = cambio(datos);
    if (typeof r === "string") { res = { error: true, cuerpo: { error: r }, estado: 400 }; break; }
    if (r && r.sinCambios) { res = { cuerpo: Object.assign({ ok: true, galeria: datos }, extra), estado: 200 }; break; }
    const w = await escribirGaleria(env, datos, sha, mensaje);
    if (w.ok) { res = { cuerpo: Object.assign({ ok: true, galeria: datos }, extra), estado: 200 }; break; }
    if (w.status !== 409 && w.status !== 422) { res = { error: true, cuerpo: { error: "GitHub respondió " + w.status }, estado: 502 }; break; }
    await new Promise(ok => setTimeout(ok, 150 + Math.random() * 350));
  }
  if (!res) res = { error: true, cuerpo: { error: "Mucho tráfico, inténtalo de nuevo" }, estado: 503 };
  return responder ? responder(res.cuerpo, res.estado) : res;
}

async function leerGaleria(env) {
  const rama = encodeURIComponent(env.RAMA || "main");
  const r = await gh(env, `${RUTA_GALERIA}?ref=${rama}`);
  if (r.status === 404) return { datos: { eventos: [], fotos: [] }, sha: null };
  if (!r.ok) throw new Error("GitHub respondió " + r.status);
  const j = await r.json();
  let texto;
  if (j.content && j.encoding === "base64") {
    texto = new TextDecoder().decode(Uint8Array.from(atob(j.content.replace(/\s/g, "")), c => c.charCodeAt(0)));
  } else {
    // Más de 1 MB: GitHub no manda el contenido, hay que pedirlo "en bruto"
    const raw = await fetch(`https://api.github.com/repos/${env.REPO}/contents/${RUTA_GALERIA}?ref=${rama}`, {
      headers: { Authorization: "Bearer " + env.GITHUB_TOKEN, Accept: "application/vnd.github.raw", "User-Agent": "cucharillas-perfiles" }
    });
    texto = await raw.text();
  }
  const datos = JSON.parse(texto || "{}");
  datos.eventos = Array.isArray(datos.eventos) ? datos.eventos : [];
  datos.fotos = Array.isArray(datos.fotos) ? datos.fotos : [];
  return { datos, sha: j.sha };
}

async function escribirGaleria(env, datos, sha, mensaje) {
  const bytes = new TextEncoder().encode(JSON.stringify(datos, null, 1) + "\n");
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  const cuerpo = { message: mensaje, content: btoa(bin), branch: env.RAMA || "main" };
  if (sha) cuerpo.sha = sha;
  return gh(env, RUTA_GALERIA, { method: "PUT", body: JSON.stringify(cuerpo) });
}

function recortar(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}
function slug(t) {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "evento";
}
function aleatorioHex(bytes) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), b => b.toString(16).padStart(2, "0")).join("");
}
async function mismaClave(a, b) {
  // Comparación que tarda lo mismo acierte o no
  const [x, y] = await Promise.all([sha256("clave:" + a), sha256("clave:" + b)]);
  let dif = 0;
  for (let i = 0; i < x.length; i++) dif |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return dif === 0 && a.length > 0;
}
