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
     ORIGEN_PERMITIDO ej.: "https://cucharillas.es,https://mi-usuario.github.io"
                      (una o varias direcciones de la app, separadas por comas)
     CODIGO_GRUPO     (tipo "Secret")  código que hay que poner para registrarse
     SECRETO          (tipo "Secret")  texto largo y aleatorio: cifra las cuentas y firma
                      las sesiones. Si se cambia, todas las cuentas dejan de valer.
   ========================================================= */

const MAX_PERFILES = 300;
const LIMITES = { nombre: 30, emoji: 8, color: 9, sobreMi: 300, gustos: 120, intencion: 200, cumple: 5 };

export default {
  async fetch(request, env) {
    const origen = request.headers.get("Origin");
    const permitidos = String(env.ORIGEN_PERMITIDO || "").split(",").map(x => x.trim().replace(/\/+$/, "")).filter(Boolean);
    const cors = {
      "Access-Control-Allow-Origin": !permitidos.length ? "*" : permitidos.includes(origen) ? origen : permitidos[0],
      "Vary": "Origin",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8"
    };
    const responder = (cuerpo, estado = 200) => new Response(JSON.stringify(cuerpo), { status: estado, headers: cors });

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return responder({ error: "Método no permitido" }, 405);

    if (permitidos.length && origen && !permitidos.includes(origen)) return responder({ error: "Origen no permitido" }, 403);

    let datos;
    try { datos = await request.json(); } catch { return responder({ error: "Datos no válidos" }, 400); }

    // Cuentas de usuario (registro y acceso a la web)
    if (datos && datos.servicio === "cuentas") {
      try { return await cuentas(datos, env, responder); }
      catch (e) { return responder({ error: "Error en el servidor: " + (e && e.message || e) }, 500); }
    }

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
  // Hace falta haber entrado con una cuenta. Para escribir, además se comprueba
  // que la cuenta sigue existiendo y que la contraseña no ha cambiado.
  const accion = d.accion;
  const s = await sesionValida(d.token, env, accion !== "ver");
  if (s.error) return responder({ error: s.error, codigo: s.codigo }, s.estado);

  if (accion === "ver") {
    const { datos } = await leerGaleria(env);
    return responder({ ok: true, galeria: datos });
  }

  const quien = (await sha256("galeria:" + s.i)).slice(0, 20);
  const autor = recortar(s.n, G_LIM.autor) || "Anónimo";
  const ahora = new Date().toISOString();
  const idValido = (x) => /^[a-z0-9-]{1,80}$/.test(x || "");
  // Los álbumes solo los crean los responsables, desde el admin

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

/* =========================================================
   CUENTAS DE USUARIO
   Para entrar en la web hay que registrarse con el código del grupo.
   Las cuentas se guardan CIFRADAS en data/cuentas.enc (el repositorio es
   público): solo este Worker, con SECRETO, puede leerlas.
   La contraseña nunca viaja ni se guarda tal cual: el móvil la transforma
   (PBKDF2) y aquí se vuelve a transformar con una sal propia de cada cuenta.
   Los responsables (su token de GitHub) pueden listar, restablecer y borrar.
   ========================================================= */

const RUTA_CUENTAS = "data/cuentas.enc";
const DURACION_SESION = 400 * 24 * 3600 * 1000;   // ~13 meses
const MAX_CUENTAS = 500;

async function cuentas(d, env, responder) {
  if (!env.SECRETO || !env.CODIGO_GRUPO) return responder({ error: "El registro todavía no está activado en el servidor", codigo: "sin-activar" }, 503);
  const accion = d.accion;
  const hashOk = (h) => /^[a-f0-9]{64}$/.test(h || "");
  const normal = (u) => String(u || "").trim().toLowerCase();
  const usuarioOk = (u) => /^[a-z0-9._-]{3,20}$/.test(u);

  if (accion === "registrar") {
    if (!(await mismaClave(String(d.codigo || "").trim(), String(env.CODIGO_GRUPO).trim()))) return responder({ error: "El código del grupo no es correcto", codigo: "codigo" }, 403);
    const usuario = normal(d.usuario), nombre = recortar(d.nombre, 30);
    if (!usuarioOk(usuario)) return responder({ error: "El usuario debe tener de 3 a 20 letras o números (sin espacios ni tildes)" }, 400);
    if (!nombre) return responder({ error: "Falta tu nombre" }, 400);
    if (!hashOk(d.hash)) return responder({ error: "Contraseña no válida" }, 400);
    const sal = aleatorioHex(16);
    const cuenta = { id: aleatorioHex(8), usuario, nombre, sal, hash: await sha256(sal + d.hash), v: 1, creado: new Date().toISOString() };

    // ¿Recupera un perfil de «Todos por todos» que ya estaba subido?
    let perfil = null;
    if (d.perfil) {
      if (!/^[a-f0-9]{12}$/.test(d.perfil)) return responder({ error: "Perfil no válido" }, 400);
      const { lista: ctas } = await leerCuentas(env);
      if (ctas.some(c => c.usuario === usuario)) return responder({ error: "Ese nombre de usuario ya existe. Elige otro" }, 400);
      if (ctas.some(c => c.perfil === d.perfil)) return responder({ error: "Esa persona ya se ha registrado. Si eres tú, avisa a un responsable", codigo: "perfil-ocupado" }, 409);
      // El perfil pasa a esta cuenta: nueva clave de edición, que viaja con la cuenta
      const clavePerfil = aleatorioHex(16);
      const hashPerfil = await sha256(clavePerfil);
      let hecho = false;
      for (let intento = 0; intento < 5 && !hecho; intento++) {
        const { lista, sha } = await leer(env);
        const p = lista.find(x => x.id === d.perfil);
        if (!p) return responder({ error: "Ese perfil ya no existe" }, 404);
        p.claveHash = hashPerfil;
        const w = await escribir(env, lista, sha, `Perfil ${d.perfil} recuperado al registrarse`);
        if (w.ok) hecho = true;
        else if (w.status !== 409 && w.status !== 422) return responder({ error: "GitHub respondió " + w.status }, 502);
      }
      if (!hecho) return responder({ error: "Mucho tráfico, inténtalo de nuevo" }, 503);
      cuenta.perfil = d.perfil; cuenta.perfilClave = clavePerfil;
      perfil = { id: d.perfil, clave: clavePerfil };
    }

    const r = await modificarCuentas(env, `Cuentas: nuevo registro`, (lista) => {
      if (lista.some(c => c.usuario === usuario)) return "Ese nombre de usuario ya existe. Elige otro";
      if (cuenta.perfil && lista.some(c => c.perfil === cuenta.perfil)) return "Esa persona ya se ha registrado. Si eres tú, avisa a un responsable";
      if (lista.length >= MAX_CUENTAS) return "Se ha alcanzado el máximo de cuentas";
      lista.push(cuenta);
    });
    if (r.error) return responder({ error: r.error }, r.estado);
    return responder({ ok: true, token: await firmarSesion(env, cuenta), cuenta: publica(cuenta), perfil });
  }

  // Paso previo al registro: con el código del grupo, lista de quienes ya
  // tienen perfil subido y todavía no se han registrado
  if (accion === "libres") {
    if (!(await mismaClave(String(d.codigo || "").trim(), String(env.CODIGO_GRUPO).trim()))) return responder({ error: "El código del grupo no es correcto", codigo: "codigo" }, 403);
    const [{ lista: perfiles }, { lista: ctas }] = await Promise.all([leer(env), leerCuentas(env)]);
    const ocupados = new Set(ctas.map(c => c.perfil).filter(Boolean));
    const libres = perfiles.filter(p => !ocupados.has(p.id))
      .map(p => ({ id: p.id, nombre: p.nombre, emoji: p.emoji || "", color: p.color || "", foto: p.foto || "" }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return responder({ ok: true, libres });
  }

  if (accion === "entrar") {
    const usuario = normal(d.usuario);
    if (!usuarioOk(usuario) || !hashOk(d.hash)) return responder({ error: "Usuario o contraseña incorrectos", codigo: "credenciales" }, 401);
    const { lista } = await leerCuentas(env);
    const c = lista.find(x => x.usuario === usuario);
    // Se calcula igual exista o no, para no dar pistas por el tiempo de respuesta
    const calculado = await sha256((c ? c.sal : "0".repeat(32)) + d.hash);
    if (!c || !(await mismaClave(calculado, c.hash))) return responder({ error: "Usuario o contraseña incorrectos", codigo: "credenciales" }, 401);
    return responder({ ok: true, token: await firmarSesion(env, c), cuenta: publica(c), perfil: c.perfil && c.perfilClave ? { id: c.perfil, clave: c.perfilClave } : null });
  }

  if (accion === "cambiarClave") {
    const s = await sesionValida(d.token, env, true);
    if (s.error) return responder({ error: s.error, codigo: s.codigo }, s.estado);
    if (!hashOk(d.hash) || !hashOk(d.nuevo)) return responder({ error: "Contraseña no válida" }, 400);
    let nueva = null;
    const r = await modificarCuentas(env, `Cuentas: cambio de contraseña`, async (lista) => {
      const c = lista.find(x => x.id === s.i);
      if (!c) return "Tu cuenta ya no existe";
      if (!(await mismaClave(await sha256(c.sal + d.hash), c.hash))) return "La contraseña actual no es correcta";
      c.sal = aleatorioHex(16); c.hash = await sha256(c.sal + d.nuevo); c.v = (c.v || 1) + 1;
      nueva = c;
    });
    if (r.error) return responder({ error: r.error }, r.estado);
    return responder({ ok: true, token: await firmarSesion(env, nueva), cuenta: publica(nueva) });
  }

  if (accion === "comprobar") {
    const s = await sesionValida(d.token, env, true);
    if (s.error) return responder({ error: s.error, codigo: s.codigo }, s.estado);
    return responder({ ok: true, cuenta: { id: s.i, usuario: s.u, nombre: s.n } });
  }

  // ----- Responsables: se identifican con su token de GitHub -----
  if (/^admin/.test(accion)) {
    if (!(await esResponsable(env, d.ghToken))) return responder({ error: "Solo para responsables", codigo: "admin" }, 403);
    if (accion === "adminListar") {
      const { lista } = await leerCuentas(env);
      return responder({ ok: true, cuentas: lista.map(publica) });
    }
    if (accion === "adminRestablecer") {
      if (!hashOk(d.hash)) return responder({ error: "Contraseña no válida" }, 400);
      const r = await modificarCuentas(env, `Cuentas: un responsable restablece una contraseña`, async (lista) => {
        const c = lista.find(x => x.id === d.id); if (!c) return "Esa cuenta ya no existe";
        // El hash llega calculado con el usuario de la cuenta, como al entrar
        c.sal = aleatorioHex(16); c.hash = await sha256(c.sal + d.hash); c.v = (c.v || 1) + 1;
      });
      if (r.error) return responder({ error: r.error }, r.estado);
      return responder({ ok: true, cuentas: r.lista.map(publica) });
    }
    if (accion === "adminRenombrar") {
      const nombre = recortar(d.nombre, 30);
      if (!nombre) return responder({ error: "Falta el nombre" }, 400);
      const r = await modificarCuentas(env, `Cuentas: un responsable cambia un nombre`, (lista) => {
        const c = lista.find(x => x.id === d.id); if (!c) return "Esa cuenta ya no existe";
        c.nombre = nombre; c.v = (c.v || 1) + 1;
      });
      if (r.error) return responder({ error: r.error }, r.estado);
      return responder({ ok: true, cuentas: r.lista.map(publica) });
    }
    if (accion === "adminDesvincular") {
      const r = await modificarCuentas(env, `Cuentas: un responsable desvincula un perfil`, (lista) => {
        const c = lista.find(x => x.id === d.id); if (!c || !c.perfil) return { sinCambios: true };
        delete c.perfil; delete c.perfilClave;
      });
      if (r.error) return responder({ error: r.error }, r.estado);
      return responder({ ok: true, cuentas: r.lista.map(publica) });
    }
    if (accion === "adminBorrar") {
      const r = await modificarCuentas(env, `Cuentas: un responsable borra una cuenta`, (lista) => {
        const i = lista.findIndex(x => x.id === d.id); if (i < 0) return { sinCambios: true };
        lista.splice(i, 1);
      });
      if (r.error) return responder({ error: r.error }, r.estado);
      return responder({ ok: true, cuentas: r.lista.map(publica) });
    }
  }
  return responder({ error: "Acción no válida" }, 400);
}

const publica = (c) => ({ id: c.id, usuario: c.usuario, nombre: c.nombre, creado: c.creado, perfil: c.perfil || "" });

async function esResponsable(env, ghToken) {
  if (typeof ghToken !== "string" || ghToken.length < 20 || ghToken.length > 300) return false;
  const r = await fetch(`https://api.github.com/repos/${env.REPO}`, {
    headers: { Authorization: "Bearer " + ghToken, Accept: "application/vnd.github+json", "User-Agent": "cucharillas-perfiles" }
  });
  if (!r.ok) return false;
  const j = await r.json().catch(() => ({}));
  return !!(j.permissions && j.permissions.push);
}

// ----- Sesiones firmadas -----
const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64u = (t) => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((t.length + 3) % 4)), c => c.charCodeAt(0));

async function claveFirma(env) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode("firma:" + env.SECRETO), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function firmarSesion(env, c) {
  const carga = new TextEncoder().encode(JSON.stringify({ i: c.id, u: c.usuario, n: c.nombre, v: c.v || 1, e: Date.now() + DURACION_SESION }));
  const firma = new Uint8Array(await crypto.subtle.sign("HMAC", await claveFirma(env), carga));
  return b64u(carga) + "." + b64u(firma);
}
async function sesionValida(token, env, comprobarCuenta) {
  const mal = { error: "Tienes que volver a entrar", codigo: "sesion", estado: 401 };
  if (!env.SECRETO) return { error: "El registro todavía no está activado en el servidor", codigo: "sin-activar", estado: 503 };
  if (typeof token !== "string" || token.length > 1000 || !/^[\w-]+\.[\w-]+$/.test(token)) return mal;
  try {
    const [a, b] = token.split(".");
    const carga = deB64u(a);
    if (!(await crypto.subtle.verify("HMAC", await claveFirma(env), deB64u(b), carga))) return mal;
    const s = JSON.parse(new TextDecoder().decode(carga));
    if (!s.i || !(s.e > Date.now())) return mal;
    if (comprobarCuenta) {
      const { lista } = await leerCuentas(env);
      const c = lista.find(x => x.id === s.i);
      if (!c || (c.v || 1) !== s.v) return mal;
      s.n = c.nombre;
    }
    return s;
  } catch (e) { return mal; }
}

// ----- Archivo de cuentas cifrado (AES-GCM) -----
async function claveCifrado(env) {
  const bruto = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("cuentas:" + env.SECRETO));
  return crypto.subtle.importKey("raw", bruto, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function leerCuentas(env) {
  const r = await gh(env, `${RUTA_CUENTAS}?ref=${encodeURIComponent(env.RAMA || "main")}`);
  if (r.status === 404) return { lista: [], sha: null };
  if (!r.ok) throw new Error("GitHub respondió " + r.status);
  const j = await r.json();
  let texto = j.content ? atob(j.content.replace(/\s/g, "")) : "";
  if (!j.content) {
    const raw = await fetch(`https://api.github.com/repos/${env.REPO}/contents/${RUTA_CUENTAS}?ref=${encodeURIComponent(env.RAMA || "main")}`, {
      headers: { Authorization: "Bearer " + env.GITHUB_TOKEN, Accept: "application/vnd.github.raw", "User-Agent": "cucharillas-perfiles" }
    });
    texto = await raw.text();
  }
  const bytes = deB64u(texto.trim());
  const claro = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, await claveCifrado(env), bytes.slice(12));
  const datos = JSON.parse(new TextDecoder().decode(claro));
  return { lista: Array.isArray(datos.cuentas) ? datos.cuentas : [], sha: j.sha };
}
async function escribirCuentas(env, lista, sha, mensaje) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await claveCifrado(env), new TextEncoder().encode(JSON.stringify({ cuentas: lista }))));
  const todo = new Uint8Array(12 + cifrado.length); todo.set(iv); todo.set(cifrado, 12);
  let bin = ""; for (let i = 0; i < todo.length; i += 0x8000) bin += String.fromCharCode.apply(null, todo.subarray(i, i + 0x8000));
  const textoArchivo = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") + "\n";
  const cuerpo = { message: mensaje, content: btoa(textoArchivo), branch: env.RAMA || "main" };
  if (sha) cuerpo.sha = sha;
  return gh(env, RUTA_CUENTAS, { method: "PUT", body: JSON.stringify(cuerpo) });
}
async function modificarCuentas(env, mensaje, cambio) {
  for (let intento = 0; intento < 6; intento++) {
    const { lista, sha } = await leerCuentas(env);
    const r = await cambio(lista);
    if (typeof r === "string") return { error: r, estado: 400 };
    if (r && r.sinCambios) return { lista };
    const w = await escribirCuentas(env, lista, sha, mensaje);
    if (w.ok) return { lista };
    if (w.status !== 409 && w.status !== 422) return { error: "GitHub respondió " + w.status, estado: 502 };
    await new Promise(ok => setTimeout(ok, 150 + Math.random() * 350));
  }
  return { error: "Mucho tráfico, inténtalo de nuevo", estado: 503 };
}
