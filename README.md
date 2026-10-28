# Cucharillas

App web (solo móvil) para el grupo: Lectio Divina, Retiro mensual, Mis notas, Agenda, Para leer y ver (artículos, libros y vídeos) y Comunidad ("Todos por todos").

Funciona sin servidor propio: los contenidos viven en este repositorio de GitHub y la app se publica gratis con **GitHub Pages**.

## Dónde se guarda cada cosa

| Qué | Dónde | Quién lo cambia |
|---|---|---|
| Lectio, Retiro, Agenda, Libros y vídeos, Artículos | `data/*.json` en GitHub | Responsables, desde `admin.html` |
| Imágenes (portadas, carteles, artículos) | `img/subidas/` en GitHub | Se suben desde `admin.html`; la app las reduce antes de subirlas |
| Perfiles y sus fotos | `data/perfiles.json` y `img/perfiles/` | Cada chico desde *Comunidad → Mi perfil* (pasa por el Worker) y el admin los aprueba |
| Mis notas y lo marcado como leído/visto | En el propio móvil (navegador) | Solo su dueño. Nunca salen del móvil |

## Puesta en marcha (unos 15 minutos)

### 1. Subir la app a GitHub
1. Crea una cuenta en github.com si no la tienes.
2. Crea un repositorio nuevo llamado `cucharillas` (**público**: GitHub Pages gratis lo exige).
3. Pulsa *Add file → Upload files* y arrastra **todo el contenido** de esta carpeta (no la carpeta en sí). *Commit changes*.

### 2. Activar GitHub Pages
*Settings → Pages → Build and deployment*: Source **Deploy from a branch**, rama **main**, carpeta **/ (root)**. Guardar.
En 1–2 minutos la app estará en `https://TU-USUARIO.github.io/cucharillas/`.

### 3. Configurar la app
Edita `js/config.js` en GitHub (icono del lápiz) y cambia `TU-USUARIO-GITHUB` por tu usuario.

### 4. Crear la clave del administrador
1. En GitHub: foto de perfil → *Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token*.
2. *Repository access*: **Only select repositories** → `cucharillas`.
3. *Permissions → Repository permissions → Contents*: **Read and write**.
4. Pon una caducidad (por ejemplo, 1 año) y genera. Copia la clave (`github_pat_…`).
5. Abre `https://TU-USUARIO.github.io/cucharillas/admin.html`, pégala y entra. Queda guardada solo en ese dispositivo.

Cada responsable puede tener su propia clave. Si un móvil se pierde, borra esa clave en GitHub y deja de funcionar.

### 5. Activar los perfiles (opcional, gratis)
Los chicos no tienen cuenta de GitHub, así que sus perfiles pasan por un pequeño intermediario que guarda la clave a salvo:
1. Crea una cuenta en cloudflare.com → *Workers & Pages → Create → Worker*. Ponle nombre (`cucharillas-perfiles`) y *Deploy*.
2. *Edit code*: borra lo que haya, pega el contenido de `worker/perfiles-worker.js` y *Deploy*.
3. *Settings → Variables and Secrets*, añade:
   - `GITHUB_TOKEN` (tipo **Secret**): crea otro token como en el paso 4, solo para esto.
   - `REPO`: `TU-USUARIO/cucharillas`
   - `RAMA`: `main`
   - `ORIGEN_PERMITIDO`: `https://TU-USUARIO.github.io`
4. Copia la dirección del Worker (`https://cucharillas-perfiles.xxx.workers.dev`) y ponla en `urlPerfiles` dentro de `js/config.js`.

Cada perfil nuevo o modificado queda **pendiente** hasta que un responsable lo aprueba en *admin → Perfiles*.

### 6. Instalarla en el móvil
- **iPhone (Safari)**: botón Compartir → *Añadir a pantalla de inicio*.
- **Android (Chrome)**: menú ⋮ → *Instalar aplicación* / *Añadir a pantalla de inicio*.

Así se abre a pantalla completa, funciona sin conexión con lo último que se cargó y las notas están más protegidas.

## Cosas importantes

- **Privacidad**: el repositorio es público, así que cualquiera con el enlace puede leer los textos y los perfiles aprobados. Por eso el formulario pide solo el nombre (sin apellidos) y el admin aprueba cada perfil. `robots.txt` pide a los buscadores que no la indexen. Si el grupo tiene menores, conviene contar con el permiso de las familias.
- **Vídeos**: pega el enlace de YouTube o Vimeo (o de un archivo .mp4) y se ven dentro de la app. Se marcan como «vistos» al empezar a reproducirse; los libros se marcan a mano y los artículos al abrirlos.
- **Imágenes**: si quitas una imagen de una entrada, el archivo sigue en `img/subidas/`; puedes borrarlo a mano en GitHub si quieres.
- **Notas**: se guardan en el navegador del móvil. Si se borran los datos del navegador o se cambia de móvil, se pierden. En *Mis notas → Guardar copia* se descarga un archivo para recuperarlas después. En iPhone, instalar la app en la pantalla de inicio evita que Safari las borre por falta de uso.
- **Tiempo de publicación**: tras publicar desde el admin, GitHub Pages tarda 1–2 minutos en mostrar el cambio.
- **Añadir campos**: en `js/config.js` → `esquemas` puedes añadir o quitar campos de Lectio, Retiro, Agenda o Recursos; el panel de admin y las páginas se adaptan solos.
- Las notas están ligadas a cada entrada por su `id`. Si borras una entrada, las notas siguen en los móviles (en *Mis notas*).

## Estructura

```
index.html        Inicio
lectio.html       Lectio Divina (lista y detalle)
retiro.html       Retiro mensual (abre el último)
notas.html        Mis notas (locales) + copia de seguridad
articulo.html     Lectura de un artículo
agenda.html       Agenda (con "Añadir a mi calendario")
comunidad.html    Todos por todos + Mi perfil
recursos.html     Para leer y ver: pestañas Pendientes / Leídos y vistos
admin.html        Panel de administración (no aparece en el menú)
css/estilos.css   Estilos
js/config.js      Configuración y campos de cada sección
js/app.js         Código común (menú, notas, carga de datos)
js/entradas.js    Lectio y Retiro (lista, bloques y notas por bloque)
js/videos.js      Reproductor de vídeo integrado
js/admin.js       Panel de administración
data/*.json       Contenidos
img/subidas/      Imágenes subidas desde el panel
img/perfiles/     Fotos de perfil
worker/           Servidor de perfiles (Cloudflare)
sw.js, manifest.json   Instalación como app y modo sin conexión
```
