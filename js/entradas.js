/* =========================================================
   CUCHARILLAS · Lista y detalle de Lectio Divina y Retiro
   Se pinta todo a partir de los campos de js/config.js
   ========================================================= */

window.pintarEntradas = async function ({ tipo, color, icono, subtitulo, conPortada }) {
  const esquema = CONFIG.esquemas[tipo];
  const cont = document.getElementById("contenido");
  const datos = await App.cargar(tipo);
  const lista = App.ordenarPorFecha(datos.entradas || []);
  const pagina = tipo + ".html";
  const campoImagen = esquema.campos.find(c => c.tipo === "imagen");
  const camposNotas = esquema.campos.filter(c => c.tipo === "notas");

  // Clave con la que se guarda cada caja de notas en el móvil
  const claveNota = (e, c) => c.id === "notas" ? `${tipo}:${e.id}` : `${tipo}:${e.id}:${c.id}`;
  function cuantasNotas(e) { return camposNotas.filter(c => App.Notas.obtener(claveNota(e, c))).length; }

  function detalleLista(e) {
    const partes = [];
    if (e.fecha) partes.push(App.fechaCorta(e.fecha));
    else if (e.cita) partes.push(e.cita.split("\n")[0].slice(0, 40));
    const n = cuantasNotas(e);
    if (n) partes.push(`✎ ${n} nota${n > 1 ? "s" : ""}`);
    return partes.map(App.escapar).join(" · ");
  }

  const id = App.parametro("id");
  const entrada = id && lista.find(e => e.id === id);
  if (entrada) pintarDetalle(entrada); else pintarLista();

  function pintarLista() {
    if (!lista.length) {
      cont.innerHTML = `<div class="vacio"><div class="icono-pastilla icono-${color}">${App.ICONOS[icono]}</div>Aún no hay nada publicado.<br>¡Vuelve pronto!</div>`;
      return;
    }
    cont.innerHTML = `<p class="subtitulo">${subtitulo}</p>` + lista.map(e => {
      const img = campoImagen && e[campoImagen.id];
      if (conPortada) {
        return `<a class="pastilla tarjeta-portada" href="${pagina}?id=${encodeURIComponent(e.id)}">
          ${img ? `<img class="portada-lista" src="${App.escapar(img)}" alt="" loading="lazy">`
                : `<div class="portada-lista sin-imagen">${App.ICONOS[icono]}</div>`}
          <div class="fila">
            <div class="texto"><div class="titulo">${App.escapar(e.titulo)}</div>
            <div class="detalle">${detalleLista(e)}</div></div>
            <span class="flecha">${App.ICONOS.flecha}</span>
          </div>
        </a>`;
      }
      return `<a class="pastilla" href="${pagina}?id=${encodeURIComponent(e.id)}">
        <div class="icono-pastilla icono-${color}">${App.ICONOS[icono]}</div>
        <div class="texto"><div class="titulo">${App.escapar(e.titulo)}</div>
        <div class="detalle">${detalleLista(e)}</div></div>
        <span class="flecha">${App.ICONOS.flecha}</span>
      </a>`;
    }).join("");
  }

  function pintarDetalle(e) {
    document.querySelector(".btn-volver").href = pagina;
    const img = campoImagen && e[campoImagen.id];
    const meta = [e.fecha && App.fechaCorta(e.fecha), e.lugar].filter(Boolean).map(App.escapar).join(" · ");
    const verde = color === "verde" ? " verde" : "";

    cont.innerHTML = `
      ${img ? `<img class="portada" src="${App.escapar(img)}" alt="">` : ""}
      <div class="ficha-cabecera ${verde ? "verde" : "azul"}">
        <div class="etiqueta">${App.escapar(esquema.nombre)}</div>
        <h2>${App.escapar(e.titulo)}</h2>
        ${meta ? `<div class="meta">${meta}</div>` : ""}
      </div>`;

    // Recorre los campos en orden: los "subtitulo" abren tarjeta, los "notas" la cierran
    let tarjeta = null, conContenido = false, tituloBloque = "";
    const abrir = () => {
      tarjeta = document.createElement("section");
      tarjeta.className = "ficha";
      cont.appendChild(tarjeta);
    };

    for (const c of esquema.campos) {
      if (c.id === "titulo" || ["fecha", "imagen", "texto", "url", "lista"].includes(c.tipo)) continue;

      if (c.tipo === "subtitulo") {
        tarjeta = null; conContenido = false; tituloBloque = e[c.id] || "";
        if (tituloBloque) { abrir(); tarjeta.innerHTML = `<h3 class="titulo-bloque">${App.escapar(tituloBloque)}</h3>`; conContenido = true; }
        continue;
      }

      if (c.tipo === "largo" && e[c.id]) {
        if (c.bloque) { tarjeta = null; tituloBloque = ""; }
        if (!tarjeta) abrir();
        const parte = document.createElement("div");
        parte.className = "parte";
        parte.innerHTML = `<h4 class="seccion-titulo${verde}">${App.escapar(c.bloque || c.etiqueta || c.nombre)}</h4>
          <div class="texto-largo${c.biblico ? " texto-biblico" : ""}">${App.formatear(e[c.id])}</div>`;
        tarjeta.appendChild(parte);
        conContenido = true;
        // En Lectio cada campo va en su propia tarjeta
        if (!tituloBloque && !c.etiqueta) tarjeta = null;
        continue;
      }

      if (c.tipo === "notas") {
        if (conContenido || c.id === "notas") {
          const tituloNota = tituloBloque ? `${e.titulo} · ${tituloBloque}` : e.titulo;
          cont.appendChild(App.cajaNota(claveNota(e, c), { tipo, entradaId: e.id, titulo: tituloNota, ancla: c.id }));
        }
        tarjeta = null; conContenido = false; tituloBloque = "";
      }
    }

    // Otras entradas
    const otras = lista.filter(x => x.id !== e.id).slice(0, 5);
    if (otras.length) {
      const bloque = document.createElement("div");
      bloque.innerHTML = `<h3 class="titulo-grupo">Otras entradas</h3>` + otras.map(o => `
        <a class="pastilla" href="${pagina}?id=${encodeURIComponent(o.id)}">
          <div class="icono-pastilla icono-${color}">${App.ICONOS[icono]}</div>
          <div class="texto"><div class="titulo">${App.escapar(o.titulo)}</div>
          <div class="detalle">${detalleLista(o)}</div></div>
          <span class="flecha">${App.ICONOS.flecha}</span>
        </a>`).join("");
      cont.appendChild(bloque);
    }
    App.irAlAncla();
  }
};
