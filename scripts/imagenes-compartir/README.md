# Imágenes al compartir del escaparate

La tarjeta de 1200 × 630 que enseñan WhatsApp, LinkedIn, X, Facebook y Telegram al pegar
un enlace de luzhumanidad.com (o de cualquier sitio escaparate de la plataforma). Una por
página pública: la portada, cada proyecto, cada persona y cualquier otra página del sitio.

| Página   | Qué lleva |
|----------|-----------|
| proyecto | Su portada a sangre con un velo oscuro, el título en negro grueso (dos líneas como mucho, nunca una palabra partida), «año · área · estado» con el color de su estado, la marca y el dominio |
| portada  | Un mosaico de fotos de proyectos y la frase de la presentación (`sitio.portada.lema`). Sin cifras: la imagen se queda semanas en la caché de las redes y las cifras de la portada cambian cada pocos días |
| persona  | Su foto en un círculo, su nombre y los proyectos en cuyo equipo está |
| otra     | Su portada si la tiene (si no, el sol de la marca), su título y su descripción |

Todo sale de lo que el sitio ya enseña: el HTML de cada página (`window.__SITIO__`),
`/api/sitio/portada/:raiz` y el sitemap. Se pinta `plantilla.html` con Chromium y se guarda en
JPEG progresivo de menos de 250 KB. La letra es la del sitio (la del sistema): **se generan en
el Mac**, donde es SF Pro, como la ve quien entra desde un Mac o un iPhone.

## Uso

```bash
# Todas (portada, proyectos y personas del sitemap), en local: salida/ y salida/manifiesto.json
node scripts/imagenes-compartir/generar.mjs

# Solo unas direcciones (p. ej. páginas nuevas que aún no están en el sitemap)
node scripts/imagenes-compartir/generar.mjs --solo /colabora,/prensa,/quienes-somos

# Y además subirlas y ponerlas en su página
node scripts/imagenes-compartir/generar.mjs --solo /colabora --publicar
```

Opciones: `--sitio <dominio>` (luzhumanidad.com), `--tipos portada,proyecto,persona,pagina`,
`--salida <carpeta>`, `--crudo` (guarda también el PNG), `--forzar` (ver abajo).
En un Mac compartido por varios bots, `HUECO_CHROMIUM=<ruta a hueco.mjs>` toma un hueco antes
de abrir Chromium.

**Mira cada imagen antes de publicar** (salida/*.jpg). Si un recorte no acierta, la solución
buena es el encuadre de la portada de la página (`config.encuadre`, el que usa su cabecera);
mientras tanto, `ENCUADRES` en `generar.mjs`.

## Publicar

Con `--publicar` cada imagen se sube a `/data/uploads/2026/11/compartir/<página>-<huella>.jpg`
(la huella es la del contenido: si la imagen cambia, cambia la dirección y las redes la piden
de nuevo) y se pone en `config.imagenCompartir` de su página con `jsonb_set` (solo esa clave),
después de guardar la fila entera en `~/copias-manuales/web-top/`. Usa la llave de despliegue
por SSH (`HW_SSH`, `HW_DB`, `HW_APP` cambian la orden y los contenedores; ver `produccion.mjs`).

Una imagen puesta a mano (desde «Ajustes de la página» o por otra vía) se respeta si mide
1200 × 630 y se abre; si no, se cambia. El informe (`salida/informe.json`) dice qué pasó con
cada página. `--forzar` cambia también las que se respetarían.

El servidor (`src/server/seoEscaparate.ts`) añade en el HTML de cada página la medida de la
imagen (`og:image:width`/`height`), su tipo y un texto alternativo que cuenta lo que se ve.

## Los vídeos

`scripts/videos-youtube.ts` es la otra mitad de este trabajo: los datos de los vídeos de
YouTube de las páginas para los `VideoObject` de Google (ver su cabecera).
