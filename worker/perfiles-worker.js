/* =========================================================
   CUCHARILLAS · Servidor de perfiles (Cloudflare Worker, gratis)

   Por qué existe: para escribir en GitHub hace falta una clave secreta.
   Esa clave NO puede ir dentro de la app (cualquiera podría verla), así
   que vive aquí, en el Worker. Los chicos envían su perfil al Worker y
   el Worker lo guarda en data/perfiles.json del repositorio.

   Variables que hay que configurar en Cloudflare (Settings → Variables):
     GITHUB_TOKEN     (tipo "Secret")  token con permiso Contents: Read and write
     REPO             ej.: "mi-usuario/cucharillas"
     RAMA             ej.: "main"
     ORIGEN_PERMITIDO ej.: "https://mi-usuario.github.io"
   ========================================================= */

const MAX_PERFILES = 300;
const LIMITES = { nombre: 30, emoji: 8, color: 9, sobreMi: 300, gustos: 120, intencion: 200 };

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
