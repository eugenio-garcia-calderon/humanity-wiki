// ============================================================================
// AGRICULTURA SINTRÓPICA · GEOMETRIES THAT REPEAT (2026-11-25)
// ============================================================================
// Eugenio: «lo importante es poder encontrar la geometría que luego se repite…
// tienes la especie clave, alrededor las especies auxiliares». A design is ONE
// module (a tile, in metres) that is repeated over the plot. Each position in
// the module carries a LABEL with Eugenio's numbering:
//   1 = key species · 2 = main auxiliary · 3 = auxiliary of category 3 · 4 · 5
// and an optional letter (2a, 2b…) when positions of the same number hold
// different species. The species of each label are chosen in the editor; a label
// may hold a MIX of species (the Miyawaki «smile» needs it).
//
// Positions are normalised to the tile: u, v ∈ [-0.5, 0.5), +v = north (uphill).
// A position on the -0.5 edge belongs to this tile and is the +0.5 edge of the
// neighbour, so nothing is planted twice.
//
// The four geometries come from the material Eugenio shared on 2026-11-25:
//  · «Módulo numerado»: his top-view screenshot (1 in the centre, 2a/2b/2c around…).
//  · «Pistacho + viña»: the hand sketch (x pistacho, ceee viña, y secundarias,
//    z aromáticas + frutos rojos, alcorque around each x, middle and edge paths,
//    pavimento filtrante).
//  · «Sonrisa microhábitat»: the Villalbilla 2026 drawing (Miyawaki marco of
//    0.75 m, 7 emergents on the north face, 30+ species, 3.5 m² smile).
//  · «Líneas por estratos»: the successional-agroforestry trial plan (tree lines
//    2 m wide; biomass every 1 m, low every 4 m, medium 8 m, high 12 m, emergent
//    15 m; wide alleys for machinery).

export interface Hueco { u: number; v: number; etiqueta: string }
export type Asignacion = Record<string, string[]>;   // label → species ids (a mix if several)

export interface Diseno {
  id: string;
  nombre: string;
  fuente: string;
  descripcion: string;
  ancho: number;            // default tile size (m), east–west
  largo: number;            // north–south
  huecos: (ancho: number, largo: number) => Hueco[];
  alcorque?: boolean;       // a ring around every key plant that holds water
  mediaLuna?: boolean;      // half-moon water catchment in every tile
  parcela: { bloqueX: number; bloqueY: number; franja: 'zanja' | 'pavimento' };
  asignar: (clave: string) => Asignacion;
}

export const rol = (etiqueta: string) => Number(etiqueta[0]) as 1 | 2 | 3 | 4 | 5;

// ---------------------------------------------------------------- consortia by key species
// The auxiliaries each key species gets by default. North of the key: the tall ones
// (they do not shade it); south: the low ones. All perennial first (Eugenio: «siempre
// priorizar las perianuales»); annual vegetables are an option of the simulator.
// Module positions (7 m module): 2a south 1.4 m, 2b east/west 1.4 m, 2c north 1.2 m, 3 diagonals,
// 3a/3c far south/north. Only the key sits in the medium stratum; around it, low shrubs (pruned)
// and one tall tree to the north. Defaults chosen so they all fit the default zone (Meseta sur, 400 mm).
interface Consorcio { alto: string; sur: string; fijadora: string; fijadora2: string; fijadora3: string; aromaticaArb: string; arbusto: string; aromatica: string; aromatica2: string; cubierta: string; cubierta2: string; frutal: string; medio: string }
const CONSORCIO: Record<string, Consorcio> = {
  almendro: { alto: 'almez', sur: 'granado', fijadora: 'retamaolor', fijadora2: 'espantalobos', fijadora3: 'retama', aromaticaArb: 'romero', arbusto: 'acerolo', aromatica: 'espliego', aromatica2: 'romero', cubierta: 'tomillo', cubierta2: 'esparceta', frutal: 'granado', medio: 'morera' },
  olivo: { alto: 'almez', sur: 'granado', fijadora: 'retamaolor', fijadora2: 'espantalobos', fijadora3: 'retama', aromaticaArb: 'romero', arbusto: 'acerolo', aromatica: 'espliego', aromatica2: 'romero', cubierta: 'tomillo', cubierta2: 'alfalfa', frutal: 'granado', medio: 'morera' },
  vid: { alto: 'almez', sur: 'granado', fijadora: 'retamaolor', fijadora2: 'espantalobos', fijadora3: 'retama', aromaticaArb: 'romero', arbusto: 'acerolo', aromatica: 'espliego', aromatica2: 'romero', cubierta: 'tomillo', cubierta2: 'esparceta', frutal: 'granado', medio: 'morera' },
  pistacho: { alto: 'almez', sur: 'granado', fijadora: 'retama', fijadora2: 'espantalobos', fijadora3: 'retamaolor', aromaticaArb: 'romero', arbusto: 'acerolo', aromatica: 'espliego', aromatica2: 'romero', cubierta: 'azafran', cubierta2: 'esparceta', frutal: 'granado', medio: 'morera' },
};
export const consorcio = (clave: string) => CONSORCIO[clave] ?? CONSORCIO.almendro;

// ---------------------------------------------------------------- 1 · Eugenio's numbered module
// Measured on his screenshot (tile 325 × 330 px, key in the centre).
const MODULO: Hueco[] = [
  { u: 0, v: 0, etiqueta: '1' },
  { u: 0, v: 0.17, etiqueta: '2c' }, { u: 0, v: -0.2, etiqueta: '2a' }, { u: -0.2, v: 0, etiqueta: '2b' }, { u: 0.2, v: 0, etiqueta: '2b' },
  { u: -0.18, v: 0.17, etiqueta: '3' }, { u: 0.18, v: 0.17, etiqueta: '3' }, { u: -0.18, v: -0.19, etiqueta: '3' }, { u: 0.2, v: -0.19, etiqueta: '3b' },
  { u: 0, v: 0.3, etiqueta: '3c' }, { u: 0, v: -0.35, etiqueta: '3a' },
  { u: -0.155, v: 0.285, etiqueta: '4' }, { u: 0.155, v: 0.285, etiqueta: '4' }, { u: -0.155, v: -0.31, etiqueta: '4' }, { u: 0.155, v: -0.31, etiqueta: '4' },
  { u: 0, v: 0.43, etiqueta: '5' }, { u: -0.36, v: -0.11, etiqueta: '5' }, { u: 0.36, v: -0.125, etiqueta: '5' }, { u: -0.29, v: -0.31, etiqueta: '5' },
  { u: 0.28, v: -0.31, etiqueta: '5' }, { u: -0.1, v: -0.43, etiqueta: '5' }, { u: 0.095, v: -0.43, etiqueta: '5' },
];

// ---------------------------------------------------------------- 2 · pistachio + vine sketch
// Tile 6 × 9 m: two rows of keys with vines between them, at a quarter and three quarters
// of the tile, the secondary «y» in the middle with aromatics + red fruits «z» around it.
function pistachoVina(W: number, H: number): Hueco[] {
  const h: Hueco[] = [];
  const p = (x: number, y: number, etiqueta: string) => h.push({ u: x / W - 0.5, v: y / H - 0.5, etiqueta });
  for (const y of [H * 0.25, H * 0.75]) {
    p(0, y, '1');
    p(W * 0.25, y, '3'); p(W * 0.5, y, '3'); p(W * 0.75, y, '3');   // ceee = vines
  }
  p(W * 0.5, H * 0.5, '2');                                             // y = secondary species
  p(W * 0.3, H * 0.43, '4'); p(W * 0.7, H * 0.57, '4');                // z = aromatics
  p(W * 0.34, H * 0.6, '4b'); p(W * 0.66, H * 0.4, '4b');              // + red fruits
  p(W * 0.5, H * 0.37, '5'); p(W * 0.5, H * 0.63, '5');                // ground cover
  return h;
}

// ---------------------------------------------------------------- 3 · Miyawaki «smile» microhabitat
// A crescent opening uphill (it catches the runoff that comes down), planted on a jittered
// 0.5 m grid (Miyawaki: 3–5 plants per m²; the drawing's 0.75 m is the spacing of the emergents). The inner (north) edge holds the 7 emergents, the key sits in the bottom of
// the smile where the water gathers, shrubs and aromatics in the middle, herbs on the rim.
function rng(semilla: number) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** The crescent in tile coordinates (metres, origin at the tile centre, +y north). */
export function geometriaSonrisa(W: number, H: number) {
  const r2 = Math.min(W * 0.46, H - 0.3), r1 = r2 * 0.42, cy = -H / 2 + r2 + 0.15;
  return { cx: 0, cy, r1, r2, a0: Math.PI * 1.08, a1: Math.PI * 1.92 };
}
function sonrisa(W: number, H: number): Hueco[] {
  const g = geometriaSonrisa(W, H);
  const r = rng(7), paso = 0.5, h: Hueco[] = [];
  for (let x = -W / 2 + paso / 2; x < W / 2; x += paso) {
    for (let y = -H / 2 + paso / 2; y < H / 2; y += paso) {
      const jx = x + (r() - 0.5) * 0.2, jy = y + (r() - 0.5) * 0.2;
      const dx = jx - g.cx, dy = jy - g.cy;
      const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) + (dy < 0 ? Math.PI * 2 : 0);
      if (d < g.r1 || d > g.r2 || a < g.a0 || a > g.a1) continue;
      const f = (d - g.r1) / (g.r2 - g.r1);
      const etiqueta = f < 0.2 ? '2' : f < 0.48 ? '3' : f < 0.74 ? '4' : '5';
      h.push({ u: jx / W, v: jy / H, etiqueta });
    }
  }
  // the key: bottom of the smile, where the water stops
  const yk = g.cy - (g.r1 + g.r2) / 2;
  const cerca = h.reduce((b, q, i) => Math.hypot(q.u * W, q.v * H - yk) < Math.hypot(h[b].u * W, h[b].v * H - yk) ? i : b, 0);
  if (h.length) h[cerca] = { u: 0, v: yk / H, etiqueta: '1' };
  return h;
}

// ---------------------------------------------------------------- 4 · tree lines by strata
// Tile 12 m along the line × alley. The line runs east–west at 1 m from the south edge.
function lineas(W: number, H: number): Hueco[] {
  const h: Hueco[] = [];
  const p = (x: number, y: number, etiqueta: string) => h.push({ u: x / W - 0.5, v: y / H - 0.5, etiqueta });
  const y0 = Math.min(1, H * 0.2);
  p(W * 0.25, y0, '1'); p(W * 0.75, y0, '1');                         // key, every 6 m (medium)
  p(0, y0 + 0.15, '2');                                                 // emergent/high, every 12 m
  p(W * 0.5, y0 + 0.15, '2b');                                          // medium service tree between keys
  for (const x of [0.125, 0.375, 0.625, 0.875]) p(W * x, y0 - 0.45, '3');   // low, every 3 m (south side)
  for (let x = 0.5; x < W; x += 1) p(x, y0 + 0.55, '4');               // biomass / aromatics every 1 m (north side)
  for (let x = 0; x < W; x += 1.5) { p(x + 0.4, y0 + 2.2, '5'); p(x + 1.1, y0 + 3.4, '5'); }   // alley: cover / vegetables
  return h;
}

export const DISENOS: Diseno[] = [
  {
    id: 'modulo', nombre: 'Módulo numerado', fuente: 'Esquema de Eugenio (vista cenital)',
    descripcion: 'La especie clave (1) en el centro; a su alrededor las auxiliares principales (2a sur, 2b este y oeste, 2c norte), las de categoría 3 en las diagonales y los extremos, aromáticas (4) y cubierta (5). Bloques de 2 × 2 módulos con pasillo y zanja de agua.',
    ancho: 7, largo: 7, huecos: () => MODULO, alcorque: true,
    parcela: { bloqueX: 2, bloqueY: 2, franja: 'zanja' },
    asignar: k => { const c = consorcio(k); return { '1': [k], '2a': [c.sur], '2b': [c.fijadora], '2c': [c.alto], '3': [c.fijadora2], '3a': [c.aromaticaArb], '3b': [c.fijadora3], '3c': [c.arbusto], '4': [c.aromatica], '5': [c.cubierta, c.cubierta2] }; },
  },
  {
    id: 'pistacho-vina', nombre: 'Clave + viña en líneas', fuente: 'Boceto «x pistacho · ceee viña · y secundarias · z aromáticas»',
    descripcion: 'Filas de la especie clave con viñas entre cada dos árboles; en el centro una secundaria (y) rodeada de aromáticas y frutos rojos (z). Alcorque alrededor de cada clave. Pasillo en los extremos y uno central cada 10 árboles; franja de pavimento filtrante.',
    ancho: 6, largo: 9, huecos: pistachoVina, alcorque: true,
    parcela: { bloqueX: 10, bloqueY: 2, franja: 'pavimento' },
    asignar: k => { const c = consorcio(k); return { '1': [k], '3': [k === 'vid' ? c.fijadora : 'vid'], '2': ['granado', 'azufaifo'], '4': [c.aromatica, c.aromatica2], '4b': ['zarzamora'], '5': [c.cubierta2, c.cubierta] }; },
  },
  {
    id: 'sonrisa', nombre: 'Sonrisa microhábitat', fuente: 'Dibujo «Combinación de especies y metodologías · Villalbilla 2026»',
    descripcion: 'Media luna de piedras que recoge la escorrentía, plantada muy densa al estilo Miyawaki (3–5 plantas por m²) con distribución aleatoria y muchas especies. Los emergentes en la cara norte; la clave en el fondo de la sonrisa, donde se para el agua.',
    ancho: 5, largo: 4, huecos: sonrisa, mediaLuna: true,
    parcela: { bloqueX: 3, bloqueY: 2, franja: 'zanja' },
    asignar: k => { const c = consorcio(k); return { '1': [k], '2': ['almez', 'morera', 'fresno'], '3': ['retamaolor', 'madrono', 'aladierno', 'espantalobos', 'acerolo'], '4': ['romero', 'espliego', 'salvia', 'santolina'], '5': ['tomillo', 'cardo', 'esparceta'] }; },
  },
  {
    id: 'lineas', nombre: 'Líneas por estratos', fuente: 'Plan de ensayo de agroforestería sucesional (líneas de 2 m)',
    descripcion: 'Líneas de árboles de 2 m de ancho en dirección este–oeste: biomasa cada 1 m, bajo cada 3 m, la clave cada 6 m, un árbol alto cada 12 m. Entre líneas, calles anchas para maquinaria estrecha con cubierta u hortalizas.',
    ancho: 12, largo: 8, huecos: lineas,
    parcela: { bloqueX: 6, bloqueY: 3, franja: 'zanja' },
    asignar: k => { const c = consorcio(k); return { '1': [k], '2': [c.alto], '2b': [c.arbusto], '3': [c.fijadora, c.sur], '4': [c.aromatica, 'consuelda', c.fijadora2], '5': [c.cubierta2] }; },
  },
];
export const diseno = (id: string) => DISENOS.find(d => d.id === id) ?? DISENOS[0];

/** Every label a design uses, sorted 1, 2, 2a, 2b… */
export function etiquetasDe(h: Hueco[]): string[] {
  return [...new Set(h.map(x => x.etiqueta))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
}

export const NOMBRE_ROL: Record<number, string> = {
  1: 'Especie clave',
  2: 'Auxiliar principal (alta)',
  3: 'Auxiliar de categoría 3',
  4: 'Aromáticas y arbustos bajos',
  5: 'Cubierta y herbáceas',
};
