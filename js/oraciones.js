/* =========================================================
   CUCHARILLAS · Formato de las oraciones (Devocionario y Rosario)
     **negrita**   {{cita bíblica en azul}}   línea "V. …" / "R. …"
     línea "_…" = indicación en cursiva       "## …" = subtítulo
     "> texto | referencia" = cita destacada  "Amén." = amén
   ========================================================= */

window.Oraciones = (function () {
  "use strict";
  const escapar = t => App.escapar(t);
  const enLinea = t => escapar(t)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\{\{(.+?)\}\}/g, '<span class="biblia">$1</span>');

  function formatear(texto) {
    return texto.split(/\n\s*\n/).map(bloque => {
      const b = bloque.trim();
      if (b.startsWith("## ")) return `<h4>${enLinea(b.slice(3))}</h4>`;
      if (b.startsWith("> ")) {
        const [t, ref] = b.slice(2).split(" | ");
        return `<blockquote>«${enLinea(t.trim())}»${ref ? `<cite>${escapar(ref.trim())}</cite>` : ""}</blockquote>`;
      }
      if (/^Amén\.?( Aleluya\.)?$/.test(b)) return `<p class="amen">${escapar(b)}</p>`;
      const lineas = b.split("\n").map(l => {
        const vr = l.match(/^([VR])\. (.*)$/);
        if (vr) return `<span class="linea-vr"><span class="vr">${vr[1]}.</span>${enLinea(vr[2])}</span>`;
        if (l.startsWith("_")) return `<span class="rubrica">${enLinea(l.slice(1))}</span>`;
        return enLinea(l);
      });
      if (lineas.every(l => l.startsWith('<span class="rubrica">'))) return `<p class="rubrica">${lineas.join("<br>").replace(/<\/?span[^>]*>/g, "")}</p>`;
      return `<p>${lineas.map(l => l.startsWith('<span class="linea-vr">') ? l : l + "<br>").join("").replace(/<br>$/, "")}</p>`;
    }).join("");
  }

  return { formatear, enLinea };
})();
