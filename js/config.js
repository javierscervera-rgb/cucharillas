/* =========================================================
   CUCHARILLAS · Configuración
   Edita SOLO este archivo para conectar la app con tu GitHub.
   ========================================================= */

(function () {
  // Cada "momento" del retiro: título, descripción, reflexión y sus notas
  const momento = (n) => [
    { id: "titulo" + n,      nombre: `Título ${n}º`,      tipo: "subtitulo", bloque: `Momento ${n}º` },
    { id: "descripcion" + n, nombre: `Descripción ${n}º`, tipo: "largo", etiqueta: "Descripción" },
    { id: "reflexion" + n,   nombre: `Reflexión ${n}º`,   tipo: "largo", etiqueta: "Reflexión" },
    { id: "notas" + n,       nombre: "Mis notas",         tipo: "notas" }
  ];

  window.CONFIG = {
    // Repositorio de GitHub donde vive la app (github.com/USUARIO/REPO)
    github: {
      usuario: "TU-USUARIO-GITHUB",
      repo: "cucharillas",
      rama: "main"
    },

    // URL del pequeño servidor que guarda los perfiles (ver README, paso 5).
    // Déjalo vacío ("") hasta que lo tengas configurado.
    urlPerfiles: "",

    // ---------------------------------------------------------
    // Campos de cada tipo de contenido.
    // El panel de administración y las páginas se construyen a partir de aquí.
    // tipo:
    //   "texto"     una línea            "largo"  párrafos
    //   "fecha"     fecha                "url"    enlace
    //   "lista"     desplegable          "imagen" foto que se sube desde el panel
    //   "subtitulo" título que abre un bloque nuevo
    //   "notas"     caja de "Mis notas" (la rellena cada chico, se guarda en su móvil)
    // ---------------------------------------------------------
    esquemas: {
      lectio: {
        archivo: "data/lectio.json",
        nombre: "Lectio Divina",
        campos: [
          { id: "titulo",     nombre: "Título",               tipo: "texto", obligatorio: true },
          { id: "geografico", nombre: "Contexto geográfico",  tipo: "largo" },
          { id: "biografico", nombre: "Contexto biográfico",  tipo: "largo" },
          { id: "cita",       nombre: "Cita bíblica",         tipo: "largo", biblico: true, ayuda: "Referencia y texto" },
          { id: "notas",      nombre: "Mis notas",            tipo: "notas" }
        ]
      },
      retiro: {
        archivo: "data/retiro.json",
        nombre: "Retiro mensual",
        campos: [
          { id: "titulo",  nombre: "Título del retiro", tipo: "texto", obligatorio: true },
          { id: "fecha",   nombre: "Fecha",             tipo: "fecha" },
          { id: "texto",   nombre: "Texto",             tipo: "largo", biblico: true },
          { id: "portada", nombre: "Imagen de portada", tipo: "imagen" },
          ...momento(1), ...momento(2), ...momento(3), ...momento(4),
          { id: "otros",   nombre: "Otros",             tipo: "largo", bloque: "Para terminar" }
        ]
      },
      agenda: {
        archivo: "data/agenda.json",
        nombre: "Agenda",
        campos: [
          { id: "titulo",      nombre: "Actividad",   tipo: "texto", obligatorio: true },
          { id: "fecha",       nombre: "Fecha",       tipo: "fecha", obligatorio: true },
          { id: "hora",        nombre: "Hora",        tipo: "texto", ayuda: "Ej.: 18:30" },
          { id: "lugar",       nombre: "Lugar",       tipo: "texto" },
          { id: "imagen",      nombre: "Imagen o cartel", tipo: "imagen" },
          { id: "descripcion", nombre: "Descripción", tipo: "largo" }
        ]
      },
      recursos: {
        archivo: "data/recursos.json",
        nombre: "Libros y vídeos",
        campos: [
          { id: "titulo",      nombre: "Título",      tipo: "texto", obligatorio: true },
          { id: "tipo",        nombre: "Tipo",        tipo: "lista", opciones: ["Libro", "Vídeo", "Podcast", "Música", "Web"] },
          { id: "autor",       nombre: "Autor",       tipo: "texto" },
          { id: "enlace",      nombre: "Enlace",      tipo: "url", ayuda: "Para vídeos: enlace de YouTube o Vimeo" },
          { id: "descripcion", nombre: "Por qué lo recomendamos", tipo: "largo" }
        ]
      },
      articulos: {
        archivo: "data/articulos.json",
        nombre: "Artículos",
        campos: [
          { id: "titulo",  nombre: "Título",    tipo: "texto", obligatorio: true },
          { id: "autor",   nombre: "Autor",     tipo: "texto" },
          { id: "fecha",   nombre: "Fecha",     tipo: "fecha" },
          { id: "imagen",  nombre: "Imagen",    tipo: "imagen" },
          { id: "resumen", nombre: "Resumen",   tipo: "largo", ayuda: "Una o dos frases para la lista" },
          { id: "texto",   nombre: "Artículo",  tipo: "largo", obligatorio: true }
        ]
      }
    }
  };
})();
