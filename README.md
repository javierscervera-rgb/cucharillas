# Cucharillas

App web (solo móvil) para el grupo: Lectio Divina, Retiro mensual, Mis notas, Agenda, Para leer y ver (artículos, libros y vídeos) y Comunidad ("Todos por todos").

Funciona sin servidor propio: los contenidos viven en este repositorio de GitHub y la app se publica gratis con **GitHub Pages**.

## Dónde se guarda cada cosa

| Qué | Dónde | Quién lo cambia |
|---|---|---|
| Lectio, Retiro, Agenda, Libros y vídeos, Artículos | `data/*.json` en GitHub | Responsables, desde `admin.html` |
| Imágenes (portadas, carteles, artículos) | `img/subidas/` en GitHub | Se suben desde `admin.html`; la app las reduce antes de subirlas |
| Cuentas para entrar en la web | `data/cuentas.enc` (cifrado) | Cada uno al registrarse (pasa por el Worker); los responsables en *admin → Usuarios* |
| Galería: álbumes, fotos, me gusta y comentarios | `data/galeria.json` e `img/galeria/` | Álbumes: responsables (`admin.html`). Fotos y comentarios: usuarios registrados (pasa por el Worker) |
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
   - `ORIGEN_PERMITIDO`: la dirección de la app, por ejemplo `https://cucharillas.es` (puedes poner varias separadas por comas)
4. Copia la dirección del Worker (`https://cucharillas-perfiles.xxx.workers.dev`) y ponla en `urlPerfiles` dentro de `js/config.js`.

Cada perfil nuevo o modificado queda **pendiente** hasta que un responsable lo aprueba en *admin → Perfiles*.

### 5 bis. Activar el registro y la Galería de fotos
Para usar la web hay que **registrarse** (nombre, usuario, contraseña y el **código del grupo**). La galería y el registro usan el mismo Worker que los perfiles.
1. En Cloudflare, abre el Worker → *Edit code*, borra todo, pega el contenido **actualizado** de `worker/perfiles-worker.js` y *Deploy*.
2. *Settings → Variables and Secrets* → *Add*, ambas de tipo **Secret**:
   - `CODIGO_GRUPO`: el código que daréis al grupo para registrarse.
   - `SECRETO`: un texto largo y aleatorio (40 caracteres o más). Cifra las cuentas y firma las sesiones. **No lo cambies después**: si cambia, todas las cuentas dejan de valer.
3. *Deploy*. Ya se puede entrar en la web y registrarse.

- **Cuentas**: se guardan cifradas en `data/cuentas.enc`; solo el Worker puede leerlas. Las contraseñas no se guardan nunca tal cual.
- **Registro en tres pasos**: 1) código del grupo; 2) «¿Quién eres?»: lista de quienes ya tienen perfil en *Todos por todos* y aún no se han registrado (quien se elige recupera su perfil y desaparece de la lista; si no está, «No estoy en la lista»); 3) usuario y contraseña. Al entrar desde cualquier móvil, el perfil recuperado vuelve a quedar editable. Si alguien elige a quien no es, *admin → Usuarios → Desvincular perfil*.
- **Olvidó la contraseña**: *admin → Usuarios → Nueva contraseña*. También se puede cambiar el nombre o borrar la cuenta.
- **Galería**: solo los responsables crean álbumes (*admin → Galería*). Los usuarios registrados suben fotos (con título, pie, día, momento y lugar), dan «me gusta» y comentan sin aprobación. Cada uno puede editar o borrar lo suyo: el botón *Editar* de cada foto propia cambia título, pie, día, momento y lugar, y *Cambiar día, momento o lugar de varias fotos* lo hace con varias a la vez. Los responsables pueden borrar cualquier cosa.
- **Importante**: el repositorio es público. La pantalla de acceso impide usar la web sin cuenta, pero quien sepa buscar en GitHub podría leer los textos y ver las fotos.

### 5 ter. Dominio propio (cucharillas.es)
La app se publica en **https://cucharillas.es** (registrado en DonDominio).
- **DNS en DonDominio** (zona DNS de cucharillas.es): cuatro registros `A` para `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; y un `CNAME` para `www` → `javierscervera-rgb.github.io`. Sin otros registros A, AAAA ni CNAME en `@` o `www`.
- **GitHub**: *Settings → Pages → Custom domain* = `cucharillas.es` (es el archivo `CNAME` de la raíz) y *Enforce HTTPS* marcado.
- **Cloudflare**: `ORIGEN_PERMITIDO` = `https://cucharillas.es,https://javierscervera-rgb.github.io`.
- La web se adapta al móvil, a tablet y a escritorio (en pantallas grandes el menú pasa a la izquierda).
- Las notas, el perfil y el acceso a la galería se guardan en cada móvil ligados a la dirección. Para pasarlos de una dirección a otra: *Mis notas → Guardar copia* en la antigua y *Recuperar* en la nueva.

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
devocionario.html Devocionario (temas y oraciones desplegables, buscador)
rosario.html      Santo Rosario guiado (data/rosario.json: textos y misterios)
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
data/*.json       Contenidos (data/devocionario.json: oraciones; ver formato abajo)
img/subidas/      Imágenes subidas desde el panel
img/perfiles/     Fotos de perfil
worker/           Servidor de perfiles (Cloudflare)
sw.js, manifest.json   Instalación como app y modo sin conexión
```

## Editar el devocionario

Las oraciones están en `data/devocionario.json` (se edita directamente en GitHub, no desde el panel). Formato del texto:

- `**texto**` → negrita
- `{{texto}}` → cita de la Biblia en azul
- `> texto | Mt 11, 28` → cita bíblica destacada en recuadro
- Línea que empieza por `V. ` o `R. ` → versículo y respuesta
- Línea que empieza por `_` → indicación en cursiva gris
- `## Título` → subtítulo dentro de la oración
- Línea en blanco → párrafo nuevo · `Amén.` solo en su línea → amén destacado
- Iconos disponibles: paloma, llama, custodia, hostia, caliz, sol, luna, angel, lupa, cruz, corona, rosa, campana, lirio, espada, manos, brillo, corazon, estrella, calendario, casa, vela, reloj
