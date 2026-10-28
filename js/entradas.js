/* =========================================================
   CUCHARILLAS · Lista y detalle de Lectio Divina y Retiro
   ========================================================= */

window.pintarEntradas = async function ({ tipo, color, icono, subtitulo, abrirUltima }) {
  const esquema = CONFIG.esquemas[tipo];
  const cont = document.getElementById("contenido");
  const datos = await App.cargar(tipo);
  const lista = App.ordenarPorFecha(datos.entradas || []);
  const pagina = location.pathname.split("/").pop() || tipo + ".html";

  let id = App.parametro("id");
  if (!id && abrirUltima && lista.length) id = lista[0].id;
  const entrada = id && lista.find(e => e.id === id);

  if (!entrada) return pintarLista();
  pintarDetalle(entrada);

  function pintarLista() {
    if (!lista.length) {
      cont.innerHTML = `<div class="vacio"><div class="icono-pastilla icono-${color}">${App.ICONOS[icono]}</div>Aún no hay nada publicado.<br>¡Vuelve pronto!</div>`;
      return;
    }
    cont.innerHTML = `<p class="subtitulo">${subtitulo}</p>` + lista.map(e => {
      const tieneNota = !!App.Notas.obtener(tipo + ":" + e.id);
      return `<a class="pastilla" href="${pagina}?id=${encodeURIComponent(e.id)}">
        <div class="icono-pastilla icono-${color}">${App.ICONOS[icono]}</div>
        <div class="texto">
          <div class="titulo">${App.escapar(e.titulo)}</div>
          <div class="detalle">${[e.cita, e.fecha && App.fechaCorta(e.fecha)].filter(Boolean).map(App.escapar).join(" · ")}${tieneNota ? " · ✎ con nota" : ""}</div>
        </div>
        <span class="flecha">${App.ICONOS.flecha}</span>
      </a>`;
    }).join("");
  }

  function pintarDetalle(e) {
    const titulo = document.querySelector(".cabecera-pagina h1");
    const volver = document.querySelector(".btn-volver");
    if (!abrirUltima && volver) volver.href = pagina;

    const meta = [e.cita, e.fecha && App.fechaCorta(e.fecha), e.lugar].filter(Boolean).map(App.escapar).join(" · ");
    let html = `<div class="ficha-cabecera ${color === "verde" ? "verde" : "azul"}">
      <div class="etiqueta">${App.escapar(esquema.nombre)}</div>
      <h2>${App.escapar(e.titulo)}</h2>
      ${meta ? `<div class="meta">${meta}</div>` : ""}
    </div>`;

    // Campos de solo lectura (todos los "largo" del esquema, en orden)
    esquema.campos.filter(c => c.tipo === "largo" && e[c.id]).forEach(c => {
      html += `<section class="ficha">
        <h3 class="seccion-titulo${color === "verde" ? " verde" : ""}">${App.escapar(c.nombre)}</h3>
        <div class="texto-largo${c.biblico ? " texto-biblico" : ""}">${App.formatear(e[c.id])}</div>
      </section>`;
    });
    cont.innerHTML = html;

    // Mis notas de esta entrada
    cont.appendChild(App.cajaNota(tipo + ":" + e.id, { tipo, entradaId: e.id, titulo: e.titulo }));

    // Otras entradas
    const otras = lista.filter(x => x.id !== e.id);
    if (otras.length) {
      const bloque = document.createElement("div");
      bloque.innerHTML = `<h3 class="titulo-grupo">${abrirUltima ? "Anteriores" : "Otras entradas"}</h3>` + otras.map(o => `
        <a class="pastilla" href="${pagina}?id=${encodeURIComponent(o.id)}">
          <div class="icono-pastilla icono-${color}">${App.ICONOS[icono]}</div>
          <div class="texto"><div class="titulo">${App.escapar(o.titulo)}</div>
          <div class="detalle">${App.escapar(o.fecha ? App.fechaCorta(o.fecha) : "")}</div></div>
          <span class="flecha">${App.ICONOS.flecha}</span>
        </a>`).join("");
      cont.appendChild(bloque);
    }
    if (titulo && !abrirUltima) titulo.textContent = esquema.nombre;
  }
};
