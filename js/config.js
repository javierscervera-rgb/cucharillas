/* =========================================================
   CUCHARILLAS · Configuración
   Edita SOLO este archivo para conectar la app con tu GitHub.
   ========================================================= */

window.CONFIG = {
  // Repositorio de GitHub donde vive la app (github.com/USUARIO/REPO)
  github: {
    usuario: "javierscervera-rgb",
    repo: "cucharillas",
    rama: "main"
  },

  // URL del pequeño servidor que guarda los perfiles (ver worker/README).
  // Déjalo vacío ("") hasta que lo tengas configurado.
  urlPerfiles: "",

  // ---------------------------------------------------------
  // Campos de cada tipo de contenido.
  // El panel de administración construye los formularios a partir de aquí,
  // así que puedes añadir o quitar campos sin tocar más código.
  // tipo: "texto" (una línea) · "largo" (párrafos) · "fecha" · "url" · "lista"
  // ---------------------------------------------------------
  esquemas: {
    lectio: {
      archivo: "data/lectio.json",
      nombre: "Lectio Divina",
      campos: [
        { id: "titulo",       nombre: "Título",                tipo: "texto", obligatorio: true },
        { id: "fecha",        nombre: "Fecha",                 tipo: "fecha" },
        { id: "cita",         nombre: "Cita bíblica",          tipo: "texto", ayuda: "Ej.: Lc 10, 38-42" },
        { id: "lectio",       nombre: "Lectio · El texto",     tipo: "largo", biblico: true },
        { id: "meditatio",    nombre: "Meditatio · Para pensar", tipo: "largo" },
        { id: "oratio",       nombre: "Oratio · Para rezar",   tipo: "largo" },
        { id: "contemplatio", nombre: "Contemplatio",          tipo: "largo" },
        { id: "actio",        nombre: "Actio · Para vivir",    tipo: "largo" }
      ]
    },
    retiro: {
      archivo: "data/retiro.json",
      nombre: "Retiro mensual",
      campos: [
        { id: "titulo",    nombre: "Título",                 tipo: "texto", obligatorio: true },
        { id: "fecha",     nombre: "Fecha",                  tipo: "fecha" },
        { id: "lugar",     nombre: "Lugar",                  tipo: "texto" },
        { id: "intro",     nombre: "Introducción",           tipo: "largo" },
        { id: "texto",     nombre: "Texto para la oración",  tipo: "largo", biblico: true },
        { id: "puntos",    nombre: "Puntos para rezar",      tipo: "largo" },
        { id: "preguntas", nombre: "Preguntas",              tipo: "largo" },
        { id: "proposito", nombre: "Propósito",              tipo: "largo" }
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
        { id: "enlace",      nombre: "Enlace",      tipo: "url" },
        { id: "descripcion", nombre: "Por qué lo recomendamos", tipo: "largo" }
      ]
    }
  }
};
