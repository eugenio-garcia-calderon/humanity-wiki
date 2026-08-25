#!/usr/bin/env node
// ============================================================================
// IMÁGENES DE WIKIMEDIA COMMONS PARA UN SUBTEMA (2026-08-25)
// ============================================================================
// De las cinco formas que pidió Eugenio —mapas, imágenes, vídeos, textos y
// gráficas— la imagen era la única a cero. No por olvido: sin la YouTube Data
// API no hay ni miniaturas, y una foto cualquiera de la web no se puede
// republicar.
//
// ── POR QUÉ COMMONS Y NO UNA BÚSQUEDA DE IMÁGENES ──────────────────────────
// Porque aquí la licencia es un dato y no una suposición. Cada fichero trae su
// licencia y su autor en la propia respuesta, así que se pueden guardar **con**
// la imagen y enseñarlos al lado. Una imagen sin licencia comprobable no es un
// contenido: es un problema esperando.
//
// Y no hace falta clave: la API de Commons es abierta. Es la única de las
// fuentes que quedaban que no dependía de que alguien active o pague nada.
//
// ── LO QUE ESTE SCRIPT NO HACE ─────────────────────────────────────────────
// No elige. Trae candidatas con su licencia y su tamaño, y la elección de
// cuáles entran y a qué subtema van la hace una persona mirándolas. Buscar
// «electric scooter» trae patinetes, motos y cortacéspedes.
//
//   node scripts/agregador/imagenes-commons.mjs > candidatas.json

const BUSQUEDAS = [
  ['ST_MEL_CARGA',       'electric cargo bike'],
  ['ST_MEL_CARGA_REP',   'cargo bike delivery'],
  ['ST_MEL_BICI',        'pedelec bicycle'],
  ['ST_MEL_BICI_LIGERA', 'folding electric bicycle'],
  ['ST_MEL_VMP',         'electric kick scooter'],
  ['ST_MEL_VMP_COMP',    'shared electric scooters street'],
  ['ST_MEL_CICLO',       'electric moped'],
  ['ST_MEL_TRICI',       'electric tricycle'],
  ['ST_MEL_BAT',         'electric bicycle battery'],
  ['ST_MEL_INFRA',       'bicycle parking station'],
  ['ST_MEL_DATOS_PANEL', 'bike sharing station'],
  ['ST_MEL_MERCADO_CN',  'electric bicycle factory'],
];

/** Commons devuelve el autor como HTML con enlaces. Aquí sólo hace falta el nombre. */
function soloTexto(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

const vistas = new Set();
const salida = [];

for (const [subtema, consulta] of BUSQUEDAS) {
  const u = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', generator: 'search',
    gsrsearch: consulta,
    gsrnamespace: '6',          // sólo ficheros
    gsrlimit: '10',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size|mime',
    iiurlwidth: '1024',
  });

  let d;
  try {
    d = await (await fetch(u, { headers: { 'User-Agent': 'humanity.wiki/1.0 (agregador)' } })).json();
  } catch (e) {
    console.error(`! ${consulta}: ${e.message}`);
    continue;
  }

  for (const p of Object.values(d?.query?.pages || {})) {
    const ii = p.imageinfo?.[0];
    if (!ii) continue;
    // Sólo fotografías: los SVG y los PDF de Commons entran por la misma
    // búsqueda y no son lo que aquí se quiere enseñar.
    if (!['image/jpeg', 'image/png'].includes(ii.mime)) continue;
    if (vistas.has(p.title)) continue;
    vistas.add(p.title);

    const m = ii.extmetadata || {};
    salida.push({
      subtema,
      consulta,
      titulo: p.title.replace(/^File:/, '').replace(/\.(jpg|jpeg|png)$/i, '').replace(/_/g, ' '),
      pagina: ii.descriptionurl,
      imagen: ii.thumburl,
      ancho: ii.thumbwidth, alto: ii.thumbheight,
      licencia: soloTexto(m.LicenseShortName?.value),
      autor: soloTexto(m.Artist?.value),
      fecha: soloTexto(m.DateTimeOriginal?.value).slice(0, 10),
    });
  }
  process.stderr.write(`${consulta} `);
}

console.log(JSON.stringify(salida, null, 2));
console.error(`\n${salida.length} candidatas de ${BUSQUEDAS.length} búsquedas.`);
