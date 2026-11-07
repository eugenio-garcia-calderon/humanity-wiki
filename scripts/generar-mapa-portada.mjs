// ============================================================================
// LOS PUNTOS DEL MAPA «DÓNDE TRABAJAMOS» (2026-11-07, portada del escaparate)
// ============================================================================
// El mapa de la portada de luzhumanidad.com no pide nada a nadie: ni teselas de
// Mapbox ni de Google, ni un rastreador más. El fondo es una trama de puntos que
// se calcula AQUÍ, una vez, con los contornos de Natural Earth (dominio público),
// y se guarda como un fichero de datos pequeño dentro del código:
//   src/components/sitio/mapaPortadaPuntos.ts
// La página solo proyecta sus chinchetas con las mismas proyecciones (d3-geo).
//
// Uso (sin conexión, con el TopoJSON de Natural Earth que publica world-atlas):
//   curl -sLo /tmp/countries-50m.json https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json
//   node scripts/generar-mapa-portada.mjs /tmp/countries-50m.json
//
// Tres vistas, cada una con su proyección y su trama hexagonal en su propio lienzo:
//   · el mundo (Natural Earth, de 74° N a 52° S),
//   · la península y Baleares (cónica conforme, como los mapas del IGN),
//   · las Canarias, en un recuadro a la misma escala que la península.
// Cada punto lleva el país en que cae (código ISO de dos letras): así la página
// puede iluminar los países donde hay proyectos, que salen de los datos.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { geoBounds, geoConicConformal, geoContains, geoNaturalEarth1 } from 'd3-geo';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ENTRADA = process.argv[2];
if (!ENTRADA) { console.error('Falta el TopoJSON: node scripts/generar-mapa-portada.mjs countries-50m.json'); process.exit(1); }
const SALIDA = path.join(AQUI, '../src/components/sitio/mapaPortadaPuntos.ts');

// ── TopoJSON → GeoJSON (lo justo para «countries» de world-atlas) ──────────────
const topo = JSON.parse(fs.readFileSync(ENTRADA, 'utf8'));
const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;
const arcos = topo.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
const anillo = idx => {
  const pts = [];
  idx.forEach((i, k) => { const a = i < 0 ? arcos[~i].slice().reverse() : arcos[i]; a.forEach((p, j) => { if (j || !k) pts.push(p); }); });
  return pts;
};
// El código de dos letras de cada país: la tabla ISO numérica → alfa-2 de los
// contornos de 110m que ya hay en el repositorio (`world.geojson`, Natural Earth).
const iso2 = new Map();
try {
  const w = JSON.parse(fs.readFileSync(path.join(AQUI, '../world.geojson'), 'utf8'));
  for (const f of w.features) {
    const n = String(f.properties.iso_n3 || ''), a = String(f.properties.iso_a2 || f.properties.wb_a2 || '');
    if (/^\d{3}$/.test(n) && /^[A-Z]{2}$/.test(a)) iso2.set(n, a);
  }
} catch { /* sin la tabla, los puntos quedan sin país */ }
// Los que no están en la tabla de 110m (países pequeños de 50m).
Object.entries({ '020': 'AD', '292': 'GI', '438': 'LI', '492': 'MC', '674': 'SM', '336': 'VA', '470': 'MT', '702': 'SG', '048': 'BH' })
  .forEach(([n, a]) => iso2.set(n, a));

const paises = topo.objects.countries.geometries.map(g => {
  const coords = g.type === 'Polygon' ? g.arcs.map(anillo) : g.type === 'MultiPolygon' ? g.arcs.map(p => p.map(anillo)) : null;
  if (!coords) return null;
  const f = { type: 'Feature', properties: { codigo: iso2.get(String(g.id || '')) || '' }, geometry: { type: g.type, coordinates: coords } };
  return { f, caja: geoBounds(f) };
}).filter(Boolean);
const enCaja = ([lon, lat], [[x0, y0], [x1, y1]]) => lat >= y0 - 0.01 && lat <= y1 + 0.01 && (x0 <= x1 ? lon >= x0 - 0.01 && lon <= x1 + 0.01 : lon >= x0 || lon <= x1);
/** El país en que cae un punto ('' si es mar; '?' si es tierra sin código). */
function paisDe(p) {
  for (const { f, caja } of paises) if (enCaja(p, caja) && geoContains(f, p)) return f.properties.codigo || '?';
  return '';
}

// ── La trama: hexagonal, en el lienzo ya proyectado ─────────────────────────
// Cada fila guarda sus tramos de tierra seguidos del mismo país: [país, primera columna, cuántos].
function trama(proyeccion, ancho, alto, paso, dentro = () => true) {
  const dy = paso * Math.sqrt(3) / 2;
  const filas = [];
  let total = 0;
  for (let r = 0; r * dy <= alto; r++) {
    const y = r * dy, desfase = r % 2 ? paso / 2 : 0;
    const tramos = [];
    for (let c = 0; c * paso + desfase <= ancho; c++) {
      const x = c * paso + desfase;
      const ll = proyeccion.invert([x, y]);
      if (!ll || !Number.isFinite(ll[0]) || !dentro(ll)) continue;
      // Que el punto vuelva a caer donde estaba: fuera de la esfera, `invert` da basura.
      const de = proyeccion(ll);
      if (!de || Math.hypot(de[0] - x, de[1] - y) > 0.5) continue;
      const pais = paisDe(ll);
      if (!pais) continue;
      total++;
      const ult = tramos[tramos.length - 1];
      if (ult && ult[0] === pais && ult[1] + ult[2] === c) ult[2]++;
      else tramos.push([pais, c, 1]);
    }
    filas.push(tramos);
  }
  return { filas, total };
}
const r4 = n => Math.round(n * 1e4) / 1e4;

// ── El mundo ─────────────────────────────────────────────────────────────────
const NORTE = 74, SUR = -52, ANCHO = 1000;
const mundo = geoNaturalEarth1().fitWidth(ANCHO, { type: 'Sphere' });
const yN = mundo([0, NORTE])[1], yS = mundo([0, SUR])[1];
mundo.translate([mundo.translate()[0], mundo.translate()[1] - yN]);
const altoMundo = Math.round(yS - yN);
const PASO_MUNDO = 7;
const tMundo = trama(mundo, ANCHO, altoMundo, PASO_MUNDO);

// ── La península y Baleares ──────────────────────────────────────────────────
const CAJA = [[-9.75, 35.55], [4.6, 44.05]];
const borde = [];
for (let i = 0; i <= 40; i++) {
  const t = i / 40;
  const lon = CAJA[0][0] + (CAJA[1][0] - CAJA[0][0]) * t, lat = CAJA[0][1] + (CAJA[1][1] - CAJA[0][1]) * t;
  borde.push([lon, CAJA[0][1]], [lon, CAJA[1][1]], [CAJA[0][0], lat], [CAJA[1][0], lat]);
}
const PARALELOS = [37.5, 42.5], GIRO = [3.4, 0];
const espana = geoConicConformal().parallels(PARALELOS).rotate(GIRO).fitWidth(ANCHO, { type: 'MultiPoint', coordinates: borde });
const pb = borde.map(p => espana(p));
const yMin = Math.min(...pb.map(p => p[1])), yMax = Math.max(...pb.map(p => p[1]));
espana.translate([espana.translate()[0], espana.translate()[1] - yMin]);
const altoEspana = Math.round(yMax - yMin);
const PASO_ESPANA = 11;
const tEspana = trama(espana, ANCHO, altoEspana, PASO_ESPANA);

// ── Las Canarias, a la misma escala, en un recuadro abajo a la izquierda ───────
const CANARIAS = [[-18.25, 27.55], [-13.3, 29.5]];
const canarias = geoConicConformal().parallels(PARALELOS).rotate(GIRO).scale(espana.scale()).translate([0, 0]);
const cc = [];
for (let i = 0; i <= 20; i++) {
  const t = i / 20;
  cc.push([CANARIAS[0][0] + (CANARIAS[1][0] - CANARIAS[0][0]) * t, CANARIAS[0][1]], [CANARIAS[0][0] + (CANARIAS[1][0] - CANARIAS[0][0]) * t, CANARIAS[1][1]]);
}
const pc = cc.map(p => canarias(p));
const cx0 = Math.min(...pc.map(p => p[0])), cx1 = Math.max(...pc.map(p => p[0]));
const cy0 = Math.min(...pc.map(p => p[1])), cy1 = Math.max(...pc.map(p => p[1]));
const MARGEN = 14;
const anchoCan = Math.round(cx1 - cx0 + 2 * MARGEN), altoCan = Math.round(cy1 - cy0 + 2 * MARGEN);
canarias.translate([MARGEN - cx0, MARGEN - cy0]);
const tCanarias = trama(canarias, anchoCan, altoCan, PASO_ESPANA,
  ([lon, lat]) => lon >= CANARIAS[0][0] - 0.3 && lon <= CANARIAS[1][0] + 0.3 && lat >= CANARIAS[0][1] - 0.3 && lat <= CANARIAS[1][1] + 0.3);

const datos = {
  mundo: { ancho: ANCHO, alto: altoMundo, paso: PASO_MUNDO, escala: r4(mundo.scale()), traslado: mundo.translate().map(r4), filas: tMundo.filas },
  espana: {
    ancho: ANCHO, alto: altoEspana, paso: PASO_ESPANA, escala: r4(espana.scale()), traslado: espana.translate().map(r4),
    paralelos: PARALELOS, giro: GIRO, caja: CAJA, filas: tEspana.filas,
  },
  canarias: { ancho: anchoCan, alto: altoCan, paso: PASO_ESPANA, traslado: canarias.translate().map(r4), caja: CANARIAS, filas: tCanarias.filas },
};

const cabecera = `// GENERADO por scripts/generar-mapa-portada.mjs: no se edita a mano.
// La trama de puntos del mapa «Dónde trabajamos» de la portada del escaparate, calculada con los
// contornos de Natural Earth (dominio público, https://www.naturalearthdata.com) en el TopoJSON de
// world-atlas. Cada fila: [país ISO alfa-2, primera columna, cuántos puntos seguidos]; las filas
// impares van desplazadas medio paso (trama hexagonal).
type Caja = [[number, number], [number, number]];
type Trama = { ancho: number; alto: number; paso: number; traslado: [number, number]; filas: Array<Array<[string, number, number]>> };
export type PuntosPortada = {
  /** Natural Earth (d3-geo \`geoNaturalEarth1\`), de ${NORTE}° N a ${-SUR}° S. */
  mundo: Trama & { escala: number };
  /** La península y Baleares (\`geoConicConformal\`). */
  espana: Trama & { escala: number; paralelos: [number, number]; giro: [number, number]; caja: Caja };
  /** Las Canarias, a la escala de la península, para un recuadro. */
  canarias: Trama & { caja: Caja };
};
`;
fs.writeFileSync(SALIDA, `${cabecera}export const PUNTOS_PORTADA: PuntosPortada = ${JSON.stringify(datos)};\n`);
const kb = (fs.statSync(SALIDA).size / 1024).toFixed(1);
console.log(`mundo ${ANCHO}×${altoMundo}: ${tMundo.total} puntos · península ${ANCHO}×${altoEspana}: ${tEspana.total} · Canarias ${anchoCan}×${altoCan}: ${tCanarias.total} → ${path.relative(process.cwd(), SALIDA)} (${kb} KB)`);
const sinCodigo = new Set(); [tMundo, tEspana, tCanarias].forEach(t => t.filas.flat().forEach(([p]) => { if (p === '?') sinCodigo.add(p); }));
if (sinCodigo.size) console.log('Aviso: hay tierra sin código de país (sale como «?»).');
