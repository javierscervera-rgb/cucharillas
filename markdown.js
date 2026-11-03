/* Cucharillas · Markdown sencillo y seguro (va incrustado en opciones.html y admin-opciones.html).
   Admite: # títulos, **negrita**, *cursiva*, _cursiva_, ~~tachado~~, [enlace](https://…),
   listas con - o 1., > citas y --- separador. Es tolerante: acepta espacios junto a los
   asteriscos (** así **) y negritas que continúan en la línea siguiente del mismo párrafo.
   Todo el HTML que se escriba se escapa: no se puede inyectar código. */
(function () {
  'use strict';
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function normalizar(s) {
    // Asteriscos "raros" que a veces introducen teclados o al copiar de otros sitios
    return String(s).replace(/\r\n?/g, '\n').replace(/[∗＊⁎]/g, '*').replace(/ /g, ' ');
  }
  function urlSegura(u) {
    var limpia = u.replace(/&amp;/g, '&').replace(/\s/g, '');
    return /^(javascript|data|vbscript):/i.test(limpia) ? null : u;
  }
  function formato(t) {
    // **negrita** (también con espacios por dentro y cruzando saltos de línea)
    t = t.replace(/\*\*([^*]+?)\*\*/g, function (m, x) {
      return x.trim() ? '<strong>' + x.trim() + '</strong>' : m;
    });
    t = t.replace(/__([^_]+?)__/g, function (m, x) { return x.trim() ? '<strong>' + x.trim() + '</strong>' : m; });
    // *cursiva*: vale con espacio en uno de los lados, no en los dos; no toca 2*3*4
    t = t.replace(/(^|[\s\S])\*([^*\n]+?)\*(?=([\s\S]?))/g, function (m, antes, x, despues) {
      if (!x.trim() || (/^\s/.test(x) && /\s$/.test(x))) return m;
      if (/\d/.test(antes) && /^\d/.test(x)) return m;
      return antes + '<em>' + x.trim() + '</em>';
    });
    t = t.replace(/(^|[^\w])_(?=\S)([^_\n]*?\S)_(?![\w])/g, '$1<em>$2</em>');
    t = t.replace(/~~([^~]+?)~~/g, function (m, x) { return x.trim() ? '<del>' + x.trim() + '</del>' : m; });
    return t;
  }
  function inline(t) {
    var enlaces = [];
    t = esc(t);
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, url) {
      var u = urlSegura(url);
      if (!u) return txt;
      enlaces.push({ u: u, t: txt });
      return '\u0000' + (enlaces.length - 1) + '\u0000';
    });
    t = formato(t).replace(/\n/g, '<br>');
    return t.replace(/\u0000(\d+)\u0000/g, function (m, k) {
      var e = enlaces[+k];
      return '<a href="' + e.u + '" target="_blank" rel="noopener">' + formato(e.t) + '</a>';
    });
  }
  var RE = {
    titulo: /^\s{0,3}(#{1,3})\s+(.*)$/,
    separador: /^\s*(-{3,}|\*{3,}|_{3,})\s*$/,
    cita: /^\s*>\s?/,
    vineta: /^\s*[-*•+]\s+/,
    numero: /^\s*\d+[.)]\s+/
  };
  function esBloque(l) {
    return RE.titulo.test(l) || RE.separador.test(l) || RE.cita.test(l) || RE.vineta.test(l) || RE.numero.test(l);
  }
  function md(src) {
    if (!src) return '';
    var L = normalizar(src).split('\n'), html = '', i = 0, m;
    while (i < L.length) {
      var l = L[i];
      if (!l.trim()) { i++; continue; }
      if ((m = l.match(RE.titulo))) {
        var n = m[1].length;
        html += '<h' + (n + 2) + ' class="md-t' + n + '">' + inline(m[2]) + '</h' + (n + 2) + '>';
        i++; continue;
      }
      if (RE.separador.test(l)) { html += '<hr>'; i++; continue; }
      if (RE.cita.test(l)) {
        var c = [];
        while (i < L.length && RE.cita.test(L[i])) { c.push(L[i].replace(RE.cita, '')); i++; }
        html += '<blockquote>' + md(c.join('\n')) + '</blockquote>';
        continue;
      }
      if (RE.vineta.test(l) || RE.numero.test(l)) {
        var ord = RE.numero.test(l), re = ord ? RE.numero : RE.vineta, items = [];
        while (i < L.length && re.test(L[i])) {
          var item = L[i].replace(re, ''); i++;
          while (i < L.length && L[i].trim() && /^\s{2,}/.test(L[i]) && !esBloque(L[i])) { item += '\n' + L[i].trim(); i++; }
          items.push('<li>' + inline(item) + '</li>');
        }
        html += (ord ? '<ol>' : '<ul>') + items.join('') + (ord ? '</ol>' : '</ul>');
        continue;
      }
      var p = [];
      while (i < L.length && L[i].trim() && !(p.length && esBloque(L[i]))) { p.push(L[i]); i++; }
      html += '<p>' + inline(p.join('\n')) + '</p>';
    }
    return html;
  }
  /* Para títulos y textos de una línea: solo negrita, cursiva, tachado (sin bloques) */
  md.linea = function (s) { return s ? formato(esc(normalizar(s))).replace(/\n/g, ' ') : ''; };
  /* Texto sin marcas, para sitios donde no cabe formato (título de la pestaña…) */
  md.plano = function (s) { return String(s || '').replace(/(\*\*|__|~~|\*)/g, '').trim(); };
  window.CucharillasMD = md;
})();
