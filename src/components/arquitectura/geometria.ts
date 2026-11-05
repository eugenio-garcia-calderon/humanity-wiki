// ============================================================================
// ARQUITECTURA · THE FRACTAL WORLD, AS PURE GEOMETRY (2026-11-05)
// ============================================================================
// `construirMundo(params, foco)` turns the parameters (metres) into flat lists
// of plan primitives — surfaces, rings, buildings, trees, panels, vehicles,
// labels and dimension lines — in WORLD plan coordinates: x east, y north,
// metres, city centre at the origin.
//
// The 3D scene and the CAD/SVG exporters both read these lists, which is what
// guarantees that the plan you download is exactly what you see.
//
// One rule repeated at every scale (Eugenio, sheets of 2026-10):
//   · a unit is a circle; its parent's ring road crosses it at 0.2·R above the
//     centre — above (towards the parent) is the productive/common cap, below
//     are the children, laid on the arc between the two crossing points;
//   · the centre holds water and the social centre with its eight annexes;
//   · lanes always go pedestrian → bike → vehicles from the inhabited side out.
//
// Every element carries an `ambito` path ("p5/c5/f3/n1") so a plan can be
// exported for one village, one community, one family or one nest.

import type { Parametros } from './parametros';

export type XY = [number, number];

export interface Superficie { capa: string; pts: number[]; ambito: string }          // closed polygon, flat x,y
export interface Anillo { capa: string; cx: number; cy: number; r0: number; r1: number; a0: number; a1: number; ambito: string; detalle: boolean }
export interface Disco { capa: string; cx: number; cy: number; r: number; ambito: string }
export interface Edificio {
  id: number;
  tipo: string;            // nido | centroFamiliar | centroSocial1..3 | anexo1..3 | sistemaFamiliar | escaparate | fabrica | vertipuerto
  sistema?: string;        // SA ED EN MV AL IT TA SG
  codigo: string;
  nombre: string;
  funcion: string;
  forma: 'caja' | 'cilindro' | 'hex';
  x: number; y: number;
  ancho: number; fondo: number;   // caja: width × depth; cilindro: ancho = diameter; hex: ancho = side
  alto: number;
  plantas: number;
  rot: number;             // radians, world
  techo: 'plano' | 'cono' | 'nido';
  color: string;
  ambito: string;
  escala: string;          // Familia | Comunidad | Pueblo | Ciudad
  superficie: number;      // built floor area, m²
}
export interface Panel { x: number; y: number; rot: number; ancho: number; fondo: number; ambito: string }
export interface Vehiculo { tipo: 'coche' | 'bici' | 'aeronave' | 'tren' | 'bus'; x: number; y: number; rot: number; ambito: string }
export interface Etiqueta { x: number; y: number; alto: number; texto: string; tam: number; ambito: string; color?: string }
export interface Cota { x1: number; y1: number; x2: number; y2: number; texto: string; ambito: string }
export interface Unidad { ambito: string; tipo: 'ciudad' | 'pueblo' | 'comunidad' | 'familia' | 'nido'; nombre: string; cx: number; cy: number; up: number; radio: number }

export interface Foco { p: number; c: number; f: number; n: number }

export interface Mundo {
  superficies: Superficie[];
  anillos: Anillo[];
  discos: Disco[];
  edificios: Edificio[];
  arboles: Float32Array;         // x, y, canopy radius, height, colour index  (stride 5)
  arbolesAmbito: string[];
  paneles: Panel[];
  vehiculos: Vehiculo[];
  etiquetas: Etiqueta[];
  cotas: Cota[];
  unidades: Map<string, Unidad>;
  medidas: Medidas;
  foco: Foco;
}

export interface Medidas {
  ciudad: { radio: number; area: number; poblacion: number; nidos: number; densidad: number };
  pueblo: { radio: number; area: number; poblacion: number; radioAnillo: number };
  comunidad: { radio: number; area: number; poblacion: number; areaPorPersona: number; radioAnillo: number };
  familia: { largo: number; anchoMax: number; area: number; personas: number };
  nido: { lado: number; areaPlanta: number; plantas: number; construida: number; diametro: number };
  viario: { calzada: number; bici: number; peatonal: number };   // km, whole city
  arboles: number;               // whole city (counted even when not drawn)
  panelesSolares: number;
  superficieConstruida: number;  // m², whole city
  equipamientos: { escala: string; codigo: string; nombre: string; dimensiones: string; superficie: number; funcion: string; cantidad: number }[];
}

// ------------------------------------------------------------------ helpers
const TAU = Math.PI * 2;

/** A unit's local frame: origin at its centre, local +y = its "up" (towards its parent). */
export class Marco {
  s: number; c: number;
  constructor(public cx: number, public cy: number, public up: number) { this.s = Math.sin(up); this.c = Math.cos(up); }
  w(lx: number, ly: number): XY { return [this.cx + lx * this.s + ly * this.c, this.cy - lx * this.c + ly * this.s]; }
  pol(r: number, th: number): XY { return this.w(r * Math.cos(th), r * Math.sin(th)); }
  ang(th: number): number { return th + this.up - Math.PI / 2; }
}

/** Angle (local, radians) where the unit circle of radius `ru` meets its divider:
 *  the parent's ring of radius `rd`, which passes `d` above the centre. */
function anguloDivisoria(ru: number, d: number, rd: number): number {
  const c = d + rd;
  const y = (ru * ru - rd * rd + c * c) / (2 * c);
  const x = Math.sqrt(Math.max(ru * ru - y * y, 0));
  return Math.atan2(y, x);
}

/** Distance along a ray at angle th (local) from the centre to the divider arc. */
function rayoDivisoria(th: number, d: number, rd: number): number {
  const c = d + rd, s = Math.sin(th);
  const disc = c * c * s * s - (c * c - rd * rd);
  if (disc < 0 || s <= 0) return Infinity;
  return c * s - Math.sqrt(disc);
}

function hwPetalo(t: number, wm: number): number {
  if (t < 0.62) return wm * Math.pow(Math.sin(Math.PI / 2 * t / 0.62), 0.9);
  return wm * Math.sqrt(Math.max(0, 1 - ((t - 0.62) / 0.38) ** 2));
}
function gotaMedio(r: number, mid: number, L: number, W: number): number {
  const c = (mid - r) / (L / 2);
  if (Math.abs(c) > 1) return 0;
  const t = Math.acos(c);
  return W * Math.sin(t) * Math.pow(Math.abs(Math.sin(t / 2)), 0.38);
}

/** Deterministic pseudo-random (same world every time for the same parameters). */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}

export const SISTEMAS = ['SG', 'EN', 'MV', 'AL', 'SA', 'ED', 'IT', 'TA'] as const;

/** Each system is served by the `per` units nearest to its position: redundancy ≥ 2. */
export function repartir(nUnidades: number, per = 2) {
  const responsables: Record<string, number[]> = {};
  const sistemasDe: string[][] = Array.from({ length: nUnidades }, () => []);
  SISTEMAS.forEach((k, j) => {
    const pos = (j + 0.5) / SISTEMAS.length;
    const cerca = [...Array(nUnidades).keys()].sort((a, b) => Math.abs((a + 0.5) / nUnidades - pos) - Math.abs((b + 0.5) / nUnidades - pos)).slice(0, Math.min(per, nUnidades)).sort((a, b) => a - b);
    responsables[k] = cerca;
    cerca.forEach(u => sistemasDe[u].push(k));
  });
  return { responsables, sistemasDe };
}

// Programme of the annexes per scale (sheet J). [width, depth, floors, function]
type Prog = [number, number, number, string];
export const ANEXOS: Record<string, { nombre: string; n: [Prog, Prog, Prog] }> = {
  SA: { nombre: 'Salud', n: [[12, 12, 1, 'Consulta · enfermería · fisio · atiende ≈70'], [30, 30, 1, 'Urgencias · partos · 10 camas · atiende ≈700'], [60, 50, 3, 'Hospital 80 camas · quirófano · UCI · atiende ≈7.000']] },
  ED: { nombre: 'Educación', n: [[14, 14, 1, 'Escuela multiedad 0–12 · ≈15 alumnos'], [36, 36, 1, 'Secundaria · FP · laboratorios · ≈110 alumnos'], [80, 75, 2, 'Universidad · investigación · ≈1.100 alumnos']] },
  EN: { nombre: 'Energía', n: [[6, 8, 1, 'Campo solar 120 kWp · batería 300 kWh'], [15, 20, 1, 'Solar 1,2 MWp · almacén 3 MWh'], [40, 50, 1, '12 MWp + eólica · 30 MWh · red regional']] },
  MV: { nombre: 'Movilidad', n: [[12, 14, 1, '8 coches eléctricos compartidos + carga'], [40, 50, 1, 'Vertipuerto Ø40 m · 2 aeronaves · 4 minibuses'], [60, 120, 1, 'Estación de tren · aeródromo regional']] },
  AL: { nombre: 'Alimentación', n: [[12, 14, 1, 'Despensa · conservas · bosque comestible'], [30, 36, 1, 'Mercado · molino · prensa · almacén'], [60, 80, 1, 'Logística alimentaria · banco de semillas']] },
  IT: { nombre: 'Informática', n: [[8, 8, 1, 'Nodo de red · servidor local · 6 puestos · impresión 3D'], [20, 20, 1, 'Fablab · datos · formación digital'], [40, 50, 1, 'Centro de datos · laboratorio de IA']] },
  TA: { nombre: 'Taller', n: [[12, 16, 1, 'Carpintería · metal · reparación'], [30, 40, 1, 'Forja · CNC · cerámica · textil'], [100, 100, 1, 'Parque de fabricación avanzada']] },
  SG: { nombre: 'Seguridad', n: [[8, 10, 1, 'Protección civil · emergencias · ≈70'], [20, 30, 1, 'Bomberos · rescate · protección · ≈700'], [40, 60, 1, 'Central de seguridad · bomberos · coordinación']] },
};
const SOCIAL: [string, string][] = [
  ['Cocina grande · comedor 16 · 4 camas de invitados · celebraciones', 'CF'],
  ['Asamblea 80 · comedor · cocina común · biblioteca', 'CS1'],
  ['Auditorio 400 · mercado · biblioteca · gobierno', 'CS2'],
  ['Auditorio 2.000 · museo · archivo · congresos', 'CS3'],
];
const ESCALAS = ['Familia', 'Comunidad', 'Pueblo', 'Ciudad'];

// ============================================================================
export function construirMundo(p: Parametros, focoIn: Partial<Foco> = {}): Mundo {
  const superficies: Superficie[] = [];
  const anillos: Anillo[] = [];
  const discos: Disco[] = [];
  const edificios: Edificio[] = [];
  const arb: number[] = [];
  const arbolesAmbito: string[] = [];
  const paneles: Panel[] = [];
  const vehiculos: Vehiculo[] = [];
  const etiquetas: Etiqueta[] = [];
  const cotas: Cota[] = [];
  const unidades = new Map<string, Unidad>();
  const largo = { calzada: 0, bici: 0, peatonal: 0 };
  let arbolesTotales = 0;
  let panelesTotales = 0;

  const nF = Math.max(2, Math.round(p.familiasPorComunidad));
  const nC = Math.max(2, Math.round(p.comunidadesPorPueblo));
  const nP = Math.max(2, Math.round(p.pueblosPorCiudad));
  const parejas = Math.max(1, Math.round(p.nidosPorFamilia / 2));
  const nidosFam = parejas * 2;
  const foco: Foco = {
    p: Math.min(nP - 1, Math.max(0, focoIn.p ?? Math.floor(nP / 2))),
    c: Math.min(nC - 1, Math.max(0, focoIn.c ?? Math.floor(nC / 2))),
    f: Math.min(nF - 1, Math.max(0, focoIn.f ?? Math.floor(nF / 2))),
    n: Math.min(nidosFam - 1, Math.max(0, focoIn.n ?? 0)),
  };
  const desp = p.desplazamientoDivisoria;
  const LT = p.anchoPeatonal + p.anchoBici + p.anchoCalzada;

  const enDetalle = (amb: string) => {
    if (p.detalle === 'ciudad') return true;
    const fp = `p${foco.p}`;
    if (p.detalle === 'pueblo') return amb === fp || amb.startsWith(fp + '/');
    const fc = `${fp}/c${foco.c}`;
    return amb === fc || amb.startsWith(fc + '/');
  };
  const enFoco = (amb: string) => {
    const fc = `p${foco.p}/c${foco.c}`;
    return amb === fc || amb.startsWith(fc + '/');
  };

  // ---------------------------------------------------------------- emitters
  let idEd = 0;
  const poly = (capa: string, pts: XY[], ambito: string) => {
    const f: number[] = []; pts.forEach(q => f.push(q[0], q[1]));
    superficies.push({ capa, pts: f, ambito });
  };
  const anillo = (fr: Marco, capa: string, r0: number, r1: number, th0: number, th1: number, ambito: string) => {
    let a0 = fr.ang(th0), a1 = fr.ang(th1);
    if (a1 < a0) [a0, a1] = [a1, a0];
    anillos.push({ capa, cx: fr.cx, cy: fr.cy, r0, r1, a0, a1, ambito, detalle: enDetalle(ambito) });
    const L = (a1 - a0) * (r0 + r1) / 2 / 1000;
    if (capa === 'calzada') largo.calzada += L; else if (capa === 'bici') largo.bici += L; else if (capa === 'peatonal') largo.peatonal += L;
  };
  /** A straight strip (lane, path) from a to b, `w` wide, shifted `off` sideways. */
  const tira = (capa: string, a: XY, b: XY, w: number, ambito: string, off = 0) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    const o1 = off - w / 2, o2 = off + w / 2;
    poly(capa, [[a[0] + nx * o1, a[1] + ny * o1], [b[0] + nx * o1, b[1] + ny * o1], [b[0] + nx * o2, b[1] + ny * o2], [a[0] + nx * o2, a[1] + ny * o2]], ambito);
    if (capa === 'calzada') largo.calzada += L / 1000; else if (capa === 'bici') largo.bici += L / 1000; else if (capa === 'peatonal') largo.peatonal += L / 1000;
  };
  const disco = (capa: string, c: XY, r: number, ambito: string) => discos.push({ capa, cx: c[0], cy: c[1], r, ambito });
  const arbol = (c: XY, r: number, h: number, color: number, ambito: string, emitir: boolean) => {
    arbolesTotales++;
    if (!emitir || !p.mostrarArboles) return;
    arb.push(c[0], c[1], r, h, color); arbolesAmbito.push(ambito);
  };
  const edificio = (e: Omit<Edificio, 'id'>) => { edificios.push({ ...e, id: idEd++ }); };
  const etiqueta = (c: XY, texto: string, tam: number, ambito: string, alto = 0, color?: string) => {
    if (p.mostrarEtiquetas) etiquetas.push({ x: c[0], y: c[1], alto, texto, tam, ambito, color });
  };
  const cota = (a: XY, b: XY, texto: string, ambito: string) => { if (p.mostrarCotas) cotas.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1], texto, ambito }); };
  const fmt = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(2).replace('.', ',')} km` : `${Math.round(m)} m`;

  /** Three concentric lane rings. `haciaFuera`: pedestrian → bike → road going outwards. */
  const carriles = (fr: Marco, rBase: number, haciaFuera: boolean, th0: number, th1: number, ambito: string) => {
    const orden = haciaFuera ? [['peatonal', p.anchoPeatonal], ['bici', p.anchoBici], ['calzada', p.anchoCalzada]] : [['calzada', p.anchoCalzada], ['bici', p.anchoBici], ['peatonal', p.anchoPeatonal]];
    let r = rBase;
    for (const [capa, w] of orden as [string, number][]) { anillo(fr, capa, r, r + w, th0, th1, ambito); r += w; }
    return r;
  };
  /** The parent's ring road seen as a band centred on radius `rr`: road on the inner (parent) side. */
  const viaAnillo = (fr: Marco, rr: number, th0: number, th1: number, ambito: string) => {
    let r = rr - LT / 2;
    for (const [capa, w] of [['calzada', p.anchoCalzada], ['bici', p.anchoBici], ['peatonal', p.anchoPeatonal]] as [string, number][]) {
      anillo(fr, capa, r, r + w, th0, th1, ambito); r += w;
    }
  };
  /** A straight corridor (road in the middle, bike one side, pedestrian the other). */
  const corredor = (a: XY, b: XY, ambito: string) => {
    tira('calzada', a, b, p.anchoCalzada, ambito);
    tira('bici', a, b, p.anchoBici, ambito, p.anchoCalzada / 2 + p.anchoBici / 2);
    tira('peatonal', a, b, p.anchoPeatonal, ambito, -(p.anchoCalzada / 2 + p.anchoPeatonal / 2));
  };
  /** Polygon of the common cap between local angles th0..th1 (above the divider). */
  const zonaCasquete = (fr: Marco, R: number, d: number, rd: number, th0: number, th1: number, capa: string, ambito: string) => {
    const n = 40, ext: XY[] = [], int: XY[] = [];
    for (let i = 0; i <= n; i++) {
      const th = th0 + (th1 - th0) * i / n;
      ext.push(fr.pol(R, th));
      int.push(fr.pol(Math.min(R, rayoDivisoria(th, d, rd)), th));
    }
    poly(capa, [...ext, ...int.reverse()], ambito);
  };

  /** A circular food forest: water in the centre, three tree storeys, beds and paths. */
  const bosqueComestible = (c: XY, Rf: number, ambito: string, semilla: number) => {
    const det = enDetalle(ambito);
    disco('bosque', c, Rf, ambito);
    const fr = new Marco(c[0], c[1], Math.PI / 2);
    if (det) {
      const capas = ['bancalA', 'bancalB', 'bancalC', 'bancalD'];
      for (let i = 0; i < 16; i++) anillo(fr, capas[i % 4], 0.72 * Rf, 0.88 * Rf, i * TAU / 16 + 0.03, (i + 1) * TAU / 16 - 0.03, ambito);
      const ws = Math.max(1.2, 0.025 * Rf);
      anillo(fr, 'senda', 0.70 * Rf - ws / 2, 0.70 * Rf + ws / 2, 0, TAU, ambito);
      anillo(fr, 'senda', 0.38 * Rf - ws / 2, 0.38 * Rf + ws / 2, 0, TAU, ambito);
      for (let i = 0; i < 8; i++) tira('senda', fr.pol(0.15 * Rf, i * TAU / 8 + TAU / 16), fr.pol(0.92 * Rf, i * TAU / 8 + TAU / 16), ws, ambito);
    }
    disco('agua', c, 0.14 * Rf, ambito);
    const r = rng(semilla);
    const nSeto = Math.max(12, Math.round(TAU * Rf * 0.965 / Math.max(1.4, Rf * 0.09)));
    for (let i = 0; i < nSeto; i++) arbol(fr.pol(0.965 * Rf, i * TAU / nSeto), Math.max(0.7, 0.05 * Rf), 2.2, 5, ambito, det);
    for (let i = 0; i < 24; i++) if (i % 3 !== 1) arbol(fr.pol(0.58 * Rf, i * TAU / 24 + 0.13), Math.max(0.6, 0.055 * Rf), 2.5 + r() * 1.5, (i % 3) + 1, ambito, det);
    for (let i = 0; i < 12; i++) arbol(fr.pol(0.5 * Rf, i * TAU / 12 + TAU / 24), Math.max(0.9, 0.085 * Rf), 4.5 + r() * 2, 7 + (i % 3), ambito, det);
    for (let i = 0; i < 6; i++) arbol(fr.pol(0.27 * Rf, i * TAU / 6), Math.max(1.2, 0.115 * Rf), 8 + r() * 3, i % 2 ? 0 : 4, ambito, det);
  };

  /** Social centre (round, tile roof, circular skylight) + its 8 annexes, ordered so each
   *  annex faces the children that serve that system. `nivel` 1 community, 2 village, 3 city. */
  const centroSocial = (fr: Marco, nivel: 1 | 2 | 3, diam: number, escalaAn: number, ambito: string, responsables?: Record<string, number[]>, posHijo?: (u: number) => XY, minPlaza = 0) => {
    const rotular = nivel === 3 || (nivel === 2 ? ambito === `p${foco.p}` : enFoco(ambito));
    const Rcs = diam / 2;
    let maxLado = 0;
    SISTEMAS.forEach(k => { const [w, d] = ANEXOS[k].n[nivel - 1]; maxLado = Math.max(maxLado, Math.hypot(w, d) * escalaAn / 2); });
    const rAnillo = Rcs + 3 + maxLado;
    const rPlaza = Math.max(minPlaza, rAnillo + maxLado + 3);
    disco('plaza', fr.w(0, 0), rPlaza, ambito);
    anillo(fr, 'agua', Rcs + 0.8, Rcs + 0.8 + Math.max(2, diam * 0.1), 0, TAU, ambito);
    const [func, cod] = SOCIAL[nivel];
    const pl = nivel === 3 ? 2 : 1;
    edificio({ tipo: `centroSocial${nivel}`, codigo: cod, nombre: `Centro social ${cod}`, funcion: func, forma: 'cilindro', ...xy(fr.w(0, 0)), ancho: diam, fondo: diam, alto: 4.5 * pl + diam * 0.08, plantas: pl, rot: 0, techo: 'cono', color: 'muroSocial', ambito, escala: ESCALAS[nivel], superficie: Math.PI * Rcs * Rcs * pl });
    if (rotular) etiqueta(fr.w(0, 0), cod, Math.max(6, diam * 0.35), ambito, 4.5 * pl + diam * 0.3, '#c4622d');
    SISTEMAS.forEach((k, j) => {
      const th = Math.PI / 2 - (j + 0.5) * TAU / SISTEMAS.length;
      const [w0, d0, pls, funcion] = ANEXOS[k].n[nivel - 1];
      const w = w0 * escalaAn, d = d0 * escalaAn;
      const c = fr.pol(rAnillo, th);
      const codigo = `${k}${nivel}`;
      const nombre = k === 'SA' || k === 'ED'
        ? `${ANEXOS[k].nombre} · grado ${['primario', 'secundario', 'terciario'][nivel - 1]}`
        : `${ANEXOS[k].nombre} · ${['comunidad', 'pueblo', 'ciudad'][nivel - 1]}`;
      edificio({ tipo: `anexo${nivel}`, sistema: k, codigo, nombre, funcion, forma: 'caja', ...xy(c), ancho: w, fondo: d, alto: 4.5 * pls, plantas: pls, rot: fr.ang(th) - Math.PI / 2, techo: 'plano', color: k, ambito, escala: ESCALAS[nivel], superficie: w0 * d0 * escalaAn * escalaAn * pls });
      if (rotular) etiqueta(c, codigo, Math.max(4, Math.max(w, d) * 0.45), ambito, 4.5 * pls + 3);
      // the coloured links to the children responsible for this system
      if (responsables && posHijo) for (const u of responsables[k]) tira(`enlace-${k}`, fr.pol(rAnillo + d / 2, th), posHijo(u), Math.max(0.6, diam * 0.03), ambito);
    });
    return rPlaza;
  };

  // ============================================================== SIZES
  const R = p.radioComunidad;
  const rcE = R + LT + 2;
  const anguloHijos = (n: number, a: number) => (k: number) => a - (k + 0.5) * (Math.PI + 2 * a) / n;
  const aprox = anguloDivisoria(1, desp, 6);            // span used for sizing only
  const DVa = (Math.PI + 2 * aprox) / nC;
  const plazaPueblo = (() => { let m = 0; SISTEMAS.forEach(k => { const [w, d] = ANEXOS[k].n[1]; m = Math.max(m, Math.hypot(w, d) * p.escalaAnexosPueblo / 2); }); return p.diamCentroPueblo / 2 + 6 + 2 * m + 6; })();
  const plazaCiudad = (() => { let m = 0; SISTEMAS.forEach(k => { const [w, d] = ANEXOS[k].n[2]; m = Math.max(m, Math.hypot(w, d) * p.escalaAnexosCiudad / 2); }); return p.diamCentroCiudad / 2 + 6 + 2 * m + 6; })();
  let anilloP = (2 * rcE + p.separacionComunidades) / (2 * Math.sin(DVa / 2));
  anilloP = Math.max(anilloP, plazaPueblo + LT + rcE + 60);
  const RV = anilloP + desp * R + rcE + p.margenPueblo;
  const DPa = (Math.PI + 2 * aprox) / nP;
  let anilloC = (2 * RV + p.separacionPueblos) / (2 * Math.sin(DPa / 2));
  anilloC = Math.max(anilloC, plazaCiudad + LT + RV + 120);
  const RC = anilloC + desp * RV + RV + p.margenCiudad;
  const rdCiudad = 6 * RC;

  // ============================================================== CITY
  const ciudad = new Marco(0, 0, Math.PI / 2);
  unidades.set('', { ambito: '', tipo: 'ciudad', nombre: 'Ciudad', cx: 0, cy: 0, up: Math.PI / 2, radio: RC });
  disco('campo', [0, 0], RC * 1.5, '');
  disco('cesped', [0, 0], RC, '');
  const aC = anguloDivisoria(RC, desp * RC, rdCiudad);
  // the city cap: agriculture (left), park and showcase (centre), production + energy (right)
  zonaCasquete(ciudad, RC, desp * RC, rdCiudad, aC, (63 * Math.PI) / 180, 'produccion', '');
  zonaCasquete(ciudad, RC, desp * RC, rdCiudad, (63 * Math.PI) / 180, (117 * Math.PI) / 180, 'parque', '');
  zonaCasquete(ciudad, RC, desp * RC, rdCiudad, (117 * Math.PI) / 180, Math.PI - aC, 'agricultura', '');
  casquete(ciudad, RC, desp * RC, rdCiudad, '', 3, 0, 3000);
  // regional road to other cities: an arc of a ring 6·RC wide, 0.2·RC above the centre
  {
    const cReg = new Marco(...ciudad.w(0, desp * RC + rdCiudad), Math.PI / 2);
    const da = Math.asin(Math.min(1, 1.45 * RC / rdCiudad));
    let r = rdCiudad - LT / 2;
    for (const [capa, w] of [['calzada', p.anchoCalzada * 1.6], ['bici', p.anchoBici], ['peatonal', p.anchoPeatonal]] as [string, number][]) {
      anillo(cReg, capa, r, r + w, -Math.PI / 2 - da, -Math.PI / 2 + da, ''); r += w;
    }
    etiqueta(ciudad.w(-1.25 * RC, desp * RC + 0.02 * RC), '◄ CIUDAD VECINA', RC * 0.035, '');
    etiqueta(ciudad.w(1.25 * RC, desp * RC + 0.02 * RC), 'CIUDAD VECINA ►', RC * 0.035, '');
  }
  // rail ring around the city, with three trains
  anillo(ciudad, 'via', RC + 18, RC + 28, 0, TAU, '');
  for (let i = 0; i < 3; i++) { const th = 0.4 + i * TAU / 3; vehiculos.push({ tipo: 'tren', ...xy(ciudad.pol(RC + 23, th)), rot: ciudad.ang(th) + Math.PI / 2, ambito: '' }); }
  const repP = repartir(nP);
  const rPlazaC = centroSocial(ciudad, 3, p.diamCentroCiudad, p.escalaAnexosCiudad, '', repP.responsables, (u) => ciudad.pol(anilloC - LT, anguloHijos(nP, aC)(u)));
  carriles(ciudad, rPlazaC, true, 0, TAU, '');
  corredor(ciudad.w(0, rPlazaC + LT), ciudad.w(0, desp * RC - LT / 2), '');
  viaAnillo(ciudad, anilloC, aC + 0.01, -Math.PI - aC - 0.01, '');
  etiqueta(ciudad.w(0, -RC * 1.16), 'CIUDAD', RC * 0.06, '');
  etiqueta(ciudad.w(0, 0.75 * RC), '▲ ESCAPARATE · PRODUCTIVO · GRADO TERCIARIO', RC * 0.03, '');
  cota(ciudad.w(-RC, -RC - 60), ciudad.w(RC, -RC - 60), `Ø ciudad ${fmt(2 * RC)}`, '');

  // ============================================================== VILLAGES
  for (let j = 0; j < nP; j++) {
    const thP = anguloHijos(nP, aC)(j);
    const cP = ciudad.pol(anilloC + desp * RV, thP);
    const upP = ciudad.ang(thP) + Math.PI;
    const pueblo = new Marco(cP[0], cP[1], upP);
    const ambP = `p${j}`;
    unidades.set(ambP, { ambito: ambP, tipo: 'pueblo', nombre: `Pueblo P${pad(j + 1)}`, cx: cP[0], cy: cP[1], up: upP, radio: RV });
    tira('calzada', ciudad.pol(rPlazaC + LT, thP), ciudad.pol(anilloC - LT / 2, thP), p.anchoCalzada, '');
    tira('bici', ciudad.pol(rPlazaC + LT, thP), ciudad.pol(anilloC - LT / 2, thP), p.anchoBici, '', p.anchoCalzada / 2 + p.anchoBici / 2);
    tira('peatonal', ciudad.pol(rPlazaC + LT, thP), ciudad.pol(anilloC - LT / 2, thP), p.anchoPeatonal, '', -(p.anchoCalzada / 2 + p.anchoPeatonal / 2));
    disco('cesped', cP, RV, ambP);
    const aP = anguloDivisoria(RV, desp * RV, anilloC);
    zonaCasquete(pueblo, RV, desp * RV, anilloC, aP, (63 * Math.PI) / 180, 'produccion', ambP);
    zonaCasquete(pueblo, RV, desp * RV, anilloC, (63 * Math.PI) / 180, (117 * Math.PI) / 180, 'parque', ambP);
    zonaCasquete(pueblo, RV, desp * RV, anilloC, (117 * Math.PI) / 180, Math.PI - aP, 'agricultura', ambP);
    casquete(pueblo, RV, desp * RV, anilloC, ambP, 2, j + 1, 750);
    const repC = repartir(nC);
    const thC = anguloHijos(nC, aP);
    const rPlazaP = centroSocial(pueblo, 2, p.diamCentroPueblo, p.escalaAnexosPueblo, ambP, repC.responsables, (u) => pueblo.pol(anilloP - LT, thC(u)));
    const fueraP = carriles(pueblo, rPlazaP, true, 0, TAU, ambP);
    corredor(pueblo.w(0, fueraP), pueblo.w(0, desp * RV - LT / 2), ambP);
    viaAnillo(pueblo, anilloP, aP + 0.01, -Math.PI - aP - 0.01, ambP);
    etiqueta(pueblo.w(0, -RV * 1.2), `P${pad(j + 1)}`, RV * 0.12, ambP);
    if (j === foco.p) {
      cota(pueblo.w(-RV, -RV - 40), pueblo.w(RV, -RV - 40), `Ø pueblo ${fmt(2 * RV)}`, ambP);
      etiqueta(pueblo.w(0, 0.7 * RV), '▲ ESCAPARATE · PRODUCTIVO', RV * 0.04, ambP);
    }

    // ============================================================ COMMUNITIES
    for (let k = 0; k < nC; k++) {
      const th = thC(k);
      const cC = pueblo.pol(anilloP + desp * R, th);
      const upC = pueblo.ang(th) + Math.PI;
      const fr = new Marco(cC[0], cC[1], upC);
      const ambC = `${ambP}/c${k}`;
      const det = enDetalle(ambC);
      const foc = j === foco.p && k === foco.c;
      unidades.set(ambC, { ambito: ambC, tipo: 'comunidad', nombre: `Comunidad C${pad(k + 1)} · P${pad(j + 1)}`, cx: cC[0], cy: cC[1], up: upC, radio: R });
      corredor(pueblo.pol(fueraP, th), pueblo.pol(anilloP - LT / 2, th), ambP);
      comunidad(fr, ambC, det, foc, j * 100 + k);
      etiqueta(fr.w(0, -R * 1.3), `C${pad(k + 1)}`, R * 0.14, ambC);
    }
  }

  // ---------------------------------------------------------------- the cap of a village / city
  function casquete(fr: Marco, Ru: number, d: number, rd: number, amb: string, nivel: 2 | 3, semilla: number, maxPaneles: number) {
    const det = enDetalle(amb) || nivel === 3;
    // agriculture: a field of circular food forests (each with its pond)
    const rB = nivel === 2 ? 55 : 70;
    let nB = 0;
    const paso = rB * 2.15;
    for (let gx = -Ru; gx <= 0 && nB < (nivel === 2 ? 26 : 40); gx += paso) {
      for (let gy = d; gy <= Ru && nB < (nivel === 2 ? 26 : 40); gy += paso * 0.866) {
        const x = gx + (Math.round((gy - d) / (paso * 0.866)) % 2 ? paso / 2 : 0);
        const th = Math.atan2(gy, x), r = Math.hypot(x, gy);
        if (th < (120 * Math.PI) / 180 || th > Math.PI - anguloDivisoria(Ru, d, rd) - 0.02) continue;
        if (r + rB > Ru - 10 || r - rB < rayoDivisoria(th, d, rd) + LT) continue;
        bosqueComestible(fr.w(x, gy), rB, amb, semilla * 97 + nB);
        nB++;
      }
    }
    etiqueta(fr.pol(Ru * 0.62, (150 * Math.PI) / 180), 'AGRICULTURA · BOSQUE COMESTIBLE', Ru * 0.035, amb, 0, '#2e7d32');
    // energy: rows of solar tables in the production zone
    const r = rng(semilla + 7);
    let n = 0;
    const tw = 4.6, td = 2.3;
    for (let ly = d + LT + 10; ly < Ru && n < maxPaneles; ly += 6.5) {
      for (let lx = 40; lx < Ru && n < maxPaneles; lx += 5.4) {
        const th = Math.atan2(ly, lx), rr = Math.hypot(lx, ly);
        if (th > (60 * Math.PI) / 180 || rr > Ru - 15 || rr < rayoDivisoria(th, d, rd) + LT + 8) continue;
        panelesTotales++;
        if (det || n < 400) { paneles.push({ ...xy(fr.w(lx, ly)), rot: fr.ang(Math.PI / 2) - Math.PI / 2, ancho: tw, fondo: td, ambito: amb }); }
        n++;
      }
    }
    etiqueta(fr.pol(Ru * 0.66, (35 * Math.PI) / 180), 'ENERGÍA · PRODUCCIÓN', Ru * 0.035, amb, 0, '#24477a');
    // park + showcase market
    const nArb = nivel === 2 ? 220 : 500;
    for (let i = 0; i < nArb; i++) {
      const th = ((66 + r() * 48) * Math.PI) / 180;
      const rmin = rayoDivisoria(th, d, rd) + LT + 10;
      const rr = rmin + r() * (Ru - 12 - rmin);
      arbol(fr.pol(rr, th), 2 + r() * 2.5, 6 + r() * 6, Math.floor(r() * 7), amb, det);
    }
    for (let i = 0; i < 8; i++) {
      const th = ((80 + i * 2.6) * Math.PI) / 180;
      const c = fr.pol(Ru * 0.9, th);
      edificio({ tipo: 'escaparate', codigo: 'EC-S', nombre: 'Escaparate · mercado', funcion: 'Escaparate al exterior: venta e intercambio de lo que se produce', forma: 'caja', ...xy(c), ancho: nivel === 2 ? 10 : 16, fondo: 8, alto: 4, plantas: 1, rot: fr.ang(th) - Math.PI / 2, techo: 'plano', color: 'escaparate', ambito: amb, escala: ESCALAS[nivel], superficie: (nivel === 2 ? 10 : 16) * 8 });
    }
    etiqueta(fr.pol(Ru * 0.82, Math.PI / 2), 'ESCAPARATE · MERCADO', Ru * 0.03, amb, 0, '#e08a2e');
    if (nivel === 2) {
      // vertiport with the shared aircraft
      const v = fr.pol(Ru * 0.55, (100 * Math.PI) / 180);
      disco('vertipuerto', v, 22, amb);
      anillo(new Marco(v[0], v[1], Math.PI / 2), 'marca', 15, 16.5, 0, TAU, amb);
      vehiculos.push({ tipo: 'aeronave', x: v[0] - 6, y: v[1], rot: 0.3, ambito: amb });
      vehiculos.push({ tipo: 'aeronave', x: v[0] + 8, y: v[1] + 4, rot: -0.6, ambito: amb });
      for (let i = 0; i < 4; i++) vehiculos.push({ tipo: 'bus', ...xy(fr.pol(Ru * 0.55 - 34, ((96 + i * 2) * Math.PI) / 180)), rot: fr.ang(Math.PI / 2), ambito: amb });
      etiqueta(v, 'VERTIPUERTO · AERONAVE COMPARTIDA', 6, amb, 6);
    }
  }

  // ---------------------------------------------------------------- one community
  function comunidad(fr: Marco, amb: string, det: boolean, foc: boolean, semilla: number) {
    const d = desp * R;
    const rd = anilloP;
    disco('cesped', fr.w(0, 0), R, amb);
    const a = anguloDivisoria(R, d, rd);
    const span = Math.PI + 2 * a;
    const D = span / nF;
    const bis = (f: number) => a - (f + 0.5) * D;
    zonaCasquete(fr, R, d, rd, a, (63 * Math.PI) / 180, 'produccion', amb);
    zonaCasquete(fr, R, d, rd, (63 * Math.PI) / 180, (117 * Math.PI) / 180, 'parque', amb);
    zonaCasquete(fr, R, d, rd, (117 * Math.PI) / 180, Math.PI - a, 'agricultura', amb);
    // outer lanes: pedestrian, bike, road (from the families outwards)
    carriles(fr, R, true, 0, TAU, amb);
    // --- the common cap
    const rBos = p.radioBosqueComunidad * R;
    const cBos = fr.pol(0.66 * R, (138 * Math.PI) / 180);
    bosqueComestible(cBos, rBos, amb, semilla * 13 + 1);
    bosqueComestible(fr.pol(0.53 * R, (106 * Math.PI) / 180), 0.09 * R, amb, semilla * 13 + 2);
    const r = rng(semilla * 31 + 5);
    for (let i = 0; i < 60; i++) {
      const th = ((68 + r() * 44) * Math.PI) / 180;
      const rmin = rayoDivisoria(th, d, rd) + LT;
      if (Math.abs(Math.cos(th)) * R < 14) continue;
      arbol(fr.pol(rmin + r() * (R - 8 - rmin), th), 1.8 + r() * 1.5, 5 + r() * 4, Math.floor(r() * 7), amb, det);
    }
    for (let i = 0; i < 6; i++) {
      const th = ((78 + i * 4.8) * Math.PI) / 180;
      if (Math.abs(th - Math.PI / 2) < 0.05) continue;
      const c = fr.pol(0.9 * R, th);
      edificio({ tipo: 'escaparate', codigo: 'EC-S', nombre: 'Escaparate · mercado', funcion: 'Lo que produce la comunidad, abierto al exterior', forma: 'caja', ...xy(c), ancho: 6, fondo: 5, alto: 3.2, plantas: 1, rot: fr.ang(th) - Math.PI / 2, techo: 'plano', color: 'escaparate', ambito: amb, escala: 'Comunidad', superficie: 30 });
    }
    // energy + workshop zone: solar tables and two sheds
    let n = 0;
    for (let ly = d + LT + 8; ly < R && n < 90; ly += 6) {
      for (let lx = 30; lx < R && n < 90; lx += 5.2) {
        const th = Math.atan2(ly, lx), rr = Math.hypot(lx, ly);
        if (th > (58 * Math.PI) / 180 || th < a + 0.05 || rr > R - 10 || rr < rayoDivisoria(th, d, rd) + LT + 6) continue;
        if (rr < 0.62 * R && th > (35 * Math.PI) / 180) continue;
        panelesTotales++;
        if (det) paneles.push({ ...xy(fr.w(lx, ly)), rot: fr.ang(Math.PI / 2) - Math.PI / 2, ancho: 4.6, fondo: 2.3, ambito: amb });
        n++;
      }
    }
    for (let i = 0; i < 2; i++) {
      const c = fr.pol(0.47 * R + i * 24, (44 * Math.PI) / 180);
      edificio({ tipo: 'fabrica', codigo: 'EC-T', nombre: 'Nave de producción', funcion: 'Fabricación comunitaria · almacén de la producción', forma: 'caja', ...xy(c), ancho: 26, fondo: 14, alto: 7, plantas: 1, rot: fr.ang((44 * Math.PI) / 180) - Math.PI / 2, techo: 'plano', color: 'fabrica', ambito: amb, escala: 'Comunidad', superficie: 364 });
    }
    // corridor from the hub up to the dividing road (and on to the village centre)
    const { responsables, sistemasDe } = repartir(nF);
    const r0 = p.inicioPetalo * R, r1 = p.finPetalo * R, dR = r1 - r0;
    const rw = r0 + 0.62 * dR;
    const Wm = p.anchoPetalo * rw * Math.sin(D / 2);
    const DM = rw, DL = 0.349 * dR * p.tamGota, DW = 0.535 * Wm * p.tamGota;
    const posNS = (f: number) => {
      const u = Math.cos(bis(f)), v = Math.sin(bis(f));
      const rr = r0 + 0.12 * dR;
      return fr.w(rr * u, rr * v);
    };
    const rPlaza = centroSocial(fr, 1, p.diamCentroComunidad, p.escalaAnexosComunidad, amb, responsables, posNS, p.radioPlazaComunidad);
    const fueraHub = carriles(fr, rPlaza, false, 0, TAU, amb);
    if (fueraHub < d - LT / 2) corredor(fr.w(0, fueraHub), fr.w(0, d - LT / 2), amb);
    // shared cars next to the mobility annex (slot of MV)
    {
      const j = SISTEMAS.indexOf('MV');
      const th = Math.PI / 2 - (j + 0.5) * TAU / SISTEMAS.length;
      for (let i = 0; i < 8; i++) vehiculos.push({ tipo: 'coche', ...xy(fr.pol(fueraHub + 6, th - 0.22 + i * 0.055)), rot: fr.ang(th), ambito: amb });
    }
    // --- the families (petals)
    // generational paths first (they run under the drops and nest gardens)
    const radiosNido: number[] = [];
    for (let i = 0; i < parejas; i++) radiosNido.push(parejas === 1 ? r0 + 0.6 * dR : r0 + dR * (0.33 + 0.53 * i / (parejas - 1)));
    for (let f = 0; f < nF; f++) {
      const Ff = (rr: number, o: number): XY => { const u = Math.cos(bis(f)), v = Math.sin(bis(f)); return fr.w(rr * u - o * v, rr * v + o * u); };
      const pts: XY[] = [];
      const N = det ? 60 : 24;
      for (let i = 0; i <= N; i++) { const rr = r0 + dR * i / N; pts.push(Ff(rr, hwPetalo(i / N, Wm))); }
      for (let i = N; i >= 0; i--) { const rr = r0 + dR * i / N; pts.push(Ff(rr, -hwPetalo(i / N, Wm))); }
      poly('suelo', pts, `${amb}/f${f}`);
    }
    radiosNido.forEach((rn, i) => {
      const rp = rn - (p.radioFrutales + 1.5);
      anillo(fr, 'camino', rp - 2, rp + 2, a, -Math.PI - a, amb);
      if (foc) etiqueta(fr.pol(rp, a + 0.02), `G${i + 1}${i === 0 ? '/G4' : ''}`, Math.max(5, R * 0.025), amb, 1);
    });
    for (let f = 0; f < nF; f++) {
      const ambF = `${amb}/f${f}`;
      const th = bis(f);
      const u = Math.cos(th), v = Math.sin(th);
      const Ff = (rr: number, o: number): XY => fr.w(rr * u - o * v, rr * v + o * u);
      unidades.set(ambF, { ambito: ambF, tipo: 'familia', nombre: `Familia F${pad(f + 1)}`, cx: Ff(DM, 0)[0], cy: Ff(DM, 0)[1], up: fr.ang(th) + Math.PI, radio: dR / 2 + 10 });
      // petal border coloured by the systems this family serves
      const sis = sistemasDe[f];
      {
        const N = det ? 40 : 10, borde: XY[] = [];
        for (let i = 0; i <= N; i++) borde.push(Ff(r0 + dR * i / N, hwPetalo(i / N, Wm) - 1));
        for (let i = N; i >= 0; i--) borde.push(Ff(r0 + dR * i / N, -hwPetalo(i / N, Wm) + 1));
        const tramo = Math.ceil(borde.length / Math.max(1, sis.length));
        sis.forEach((k, i) => {
          const seg = borde.slice(i * tramo, Math.min(borde.length, (i + 1) * tramo + 1));
          for (let q = 1; q < seg.length; q++) tira(`enlace-${k}`, seg[q - 1], seg[q], 1.6, ambF);
        });
      }
      // spine: cobbled path + bike lane, broken by the drop
      tira('camino', Ff(r0 - 8, 0), Ff(DM - DL / 2 + 1, 0), 3, ambF, -1.5);
      tira('camino', Ff(DM + DL / 2 - 1, 0), Ff(r1 + 8, 0), 3, ambF, -1.5);
      tira('bici', Ff(r0 - 8, 0), Ff(DM - DL / 2 + 1, 0), 1.8, ambF, 1);
      tira('bici', Ff(DM + DL / 2 - 1, 0), Ff(r1 + 8, 0), 1.8, ambF, 1);
      // the drop: white open space with the family social centre and its food forest
      {
        const N = 72, g: XY[] = [];
        for (let i = 0; i <= N; i++) {
          const t = TAU * i / N;
          g.push(Ff(DM - (DL / 2) * Math.cos(t), DW * Math.sin(t) * Math.pow(Math.abs(Math.sin(t / 2)), 0.38)));
        }
        poly('gota', g, ambF);
      }
      const rCF = DM - 0.25 * DL, rBF = DM + 0.15 * DL;
      bosqueComestible(Ff(rBF, 0), Math.min(p.radioBosqueFamiliar, DW * 0.95), ambF, semilla * 101 + f);
      tira('camino', Ff(DM - DL / 2 + 1, 0), Ff(rCF, 0), 2.4, ambF);
      const cf = Ff(rCF, 0);
      const Rcf = p.diamCentroFamiliar / 2;
      for (let i = 0; i < 10; i++) arbol(Ff(rCF + (Rcf + 4.5) * Math.cos(i * TAU / 10 + 0.3), (Rcf + 4.5) * Math.sin(i * TAU / 10 + 0.3)), 1.6, 5, i % 6, ambF, det);
      edificio({ tipo: 'centroFamiliar', codigo: 'CF', nombre: 'Centro social familiar', funcion: SOCIAL[0][0], forma: 'cilindro', ...xy(cf), ancho: p.diamCentroFamiliar, fondo: p.diamCentroFamiliar, alto: 4.2, plantas: 1, rot: 0, techo: 'cono', color: 'muroSocial', ambito: ambF, escala: 'Familia', superficie: Math.PI * Rcf * Rcf });
      // system nodes (NS) of this family at the top of the petal, facing the hub
      sis.forEach((k, i) => {
        const w = (0.62 * hwPetalo(0.12, Wm) * 2) / sis.length;
        const o = -0.62 * hwPetalo(0.12, Wm) + (i + 0.5) * w;
        edificio({ tipo: 'sistemaFamiliar', sistema: k, codigo: `NS-${k}`, nombre: `Nodo de ${ANEXOS[k].nombre.toLowerCase()} de la familia`, funcion: `Esta familia atiende el sistema de ${ANEXOS[k].nombre.toLowerCase()} de la comunidad (con otra familia: redundancia)`, forma: 'caja', ...xy(Ff(r0 + 0.12 * dR, o)), ancho: Math.max(3, w - 1.2), fondo: 7, alto: 4, plantas: 1, rot: fr.ang(th) - Math.PI / 2, techo: 'plano', color: k, ambito: ambF, escala: 'Familia', superficie: Math.max(3, w - 1.2) * 7 });
      });
      // bikes at the top and bottom of the petal
      for (const [rr, cuantas] of [[r0 + 0.035 * dR, 6], [r1 - 0.03 * dR, 8]] as [number, number][]) {
        for (let sgn = -1; sgn <= 1; sgn += 2) {
          const base = Ff(rr, sgn * 6);
          disco('plaza', base, 4.2, ambF);
          for (let i = 0; i < cuantas / 2; i++) vehiculos.push({ tipo: 'bici', ...xy(Ff(rr - 2.4 + i * 1.3, sgn * 6)), rot: fr.ang(th) + Math.PI / 2, ambito: ambF });
        }
      }
      // nests: pairs on each generational ring, clear of the drop
      let ni = 0;
      radiosNido.forEach((rn, gi) => {
        const t = (rn - r0) / dR;
        const hw = hwPetalo(t, Wm);
        const o = Math.min(hw - p.radioFrutales * 0.4, Math.max(0.6 * hw, gotaMedio(rn, DM, DL, DW) + p.radioFrutales + p.copaArbol + 1));
        for (let sgn = -1; sgn <= 1; sgn += 2) {
          const ambN = `${ambF}/n${ni}`;
          const c = Ff(rn, sgn * o);
          unidades.set(ambN, { ambito: ambN, tipo: 'nido', nombre: `Nido N${ni + 1} · G${gi + 1}`, cx: c[0], cy: c[1], up: fr.ang(th) + Math.PI, radio: p.radioFrutales + 3 });
          disco('huerto', c, p.radioFrutales + p.copaArbol + 0.6, ambN);
          const nA = Math.round(p.arbolesPorNido);
          for (let q = 0; q < nA; q++) arbol(new Marco(c[0], c[1], Math.PI / 2).pol(p.radioFrutales, q * TAU / Math.max(1, nA)), p.copaArbol, 3.5 + ((q * 7) % 5) * 0.4, q % 3 === 0 ? 7 + ((q / 3) % 3) : (q % 7), ambN, det);
          const ap = 1.5 * Math.sqrt(3) * p.ladoNido * p.ladoNido;
          edificio({ tipo: 'nido', codigo: `N${ni + 1}`, nombre: `Nido hexagonal · generación ${gi + 1}${gi === 0 ? ' (= 4ª)' : ''}`, funcion: `N1 vivienda (salón · cocina · baño · dormitorio)${p.plantasNido >= 2 ? ' · N2 taller / estudio' : ''}${p.plantasNido >= 3 ? ' · N3 opcional' : ''} · 1–2 personas · ${Math.round(p.arbolesPorNido)} frutales`, forma: 'hex', ...xy(c), ancho: p.ladoNido, fondo: p.ladoNido, alto: p.alturaPlanta * p.plantasNido, plantas: p.plantasNido, rot: fr.ang(th), techo: 'nido', color: 'muroNido', ambito: ambN, escala: 'Nido', superficie: ap * p.plantasNido });
          if (foc && f === foco.f) etiqueta(c, `N${ni + 1}`, 3, ambN, p.alturaPlanta * p.plantasNido + 2);
          ni++;
        }
      });
      if (foc) {
        etiqueta(Ff(r1 + 18, 0), `F${pad(f + 1)}`, Math.max(8, R * 0.04), ambF, 2);
        if (f === foco.f) {
          etiqueta(cf, 'CF', 3, ambF, 7, '#c4622d');
          etiqueta(Ff(rBF, 0), 'BOSQUE COMESTIBLE + AGUA', 3, ambF, 9, '#2e7d32');
          cota(Ff(r0, Wm + 12), Ff(r1, Wm + 12), `pétalo ${fmt(dR)}`, ambF);
        }
      }
    }
    if (foc) {
      cota(fr.w(-R, -R - 30), fr.w(R, -R - 30), `Ø comunidad ${fmt(2 * R)}`, amb);
      cota(fr.w(R + 40, 0), fr.w(R + 40, d), `divisoria ${fmt(d)} (${desp.toFixed(2).replace('.', ',')}·R)`, amb);
      etiqueta(cBos, 'AGRICULTURA · BOSQUE COMESTIBLE', R * 0.035, amb, 14, '#2e7d32');
      etiqueta(fr.pol(0.72 * R, (40 * Math.PI) / 180), 'ENERGÍA · PRODUCCIÓN', R * 0.035, amb, 6, '#24477a');
      etiqueta(fr.pol(0.78 * R, Math.PI / 2), 'ESCAPARATE · MERCADO', R * 0.032, amb, 6, '#e08a2e');
      etiqueta(fr.w(0, -0.55 * R), '▼ REPRODUCTIVO · VIDA', R * 0.03, amb, 1);
      etiqueta(fr.w(-R * 1.1, d + 6), '◄ COMUNIDAD VECINA', R * 0.028, amb, 1);
      etiqueta(fr.w(R * 1.1, d + 6), 'COMUNIDAD VECINA ►', R * 0.028, amb, 1);
    }
  }

  // ---------------------------------------------------------------- measures
  const nidosCiudad = nidosFam * nF * nC * nP;
  const pob = nidosCiudad * p.personasPorNido;
  const areaPetalo = (() => { let s = 0; const N = 100; for (let i = 0; i < N; i++) s += 2 * hwPetalo((i + 0.5) / N, 1) / N; return s; })();
  const r0 = p.inicioPetalo * R, r1 = p.finPetalo * R, dR = r1 - r0;
  const aCom = anguloDivisoria(R, desp * R, anilloP);
  const Dang = (Math.PI + 2 * aCom) / nF;
  const rw = r0 + 0.62 * dR;
  const Wm = p.anchoPetalo * rw * Math.sin(Dang / 2);
  const ap = 1.5 * Math.sqrt(3) * p.ladoNido * p.ladoNido;
  const equip: Medidas['equipamientos'] = [];
  const nUnits = [nF * nC * nP, nC * nP, nP, 1];
  const escAn = [1, p.escalaAnexosComunidad, p.escalaAnexosPueblo, p.escalaAnexosCiudad];
  const diamS = [p.diamCentroFamiliar, p.diamCentroComunidad, p.diamCentroPueblo, p.diamCentroCiudad];
  for (let lv = 0; lv < 4; lv++) {
    const pl = lv === 3 ? 2 : 1;
    equip.push({ escala: ESCALAS[lv], codigo: SOCIAL[lv][1], nombre: 'Centro social', dimensiones: `Ø${diamS[lv]} m`, superficie: Math.round(Math.PI * (diamS[lv] / 2) ** 2 * pl), funcion: SOCIAL[lv][0], cantidad: nUnits[lv] });
    if (lv === 0) continue;
    SISTEMAS.forEach(k => {
      const [w, d, pls, func] = ANEXOS[k].n[lv - 1];
      equip.push({ escala: ESCALAS[lv], codigo: `${k}${lv}`, nombre: ANEXOS[k].nombre, dimensiones: `${(w * escAn[lv]).toFixed(0)}×${(d * escAn[lv]).toFixed(0)} m${pls > 1 ? ` ×${pls} pl.` : ''}`, superficie: Math.round(w * d * escAn[lv] ** 2 * pls), funcion: func, cantidad: nUnits[lv] });
    });
  }
  const sup = edificiosSuperficieTotal();
  function edificiosSuperficieTotal() {
    let s = nidosCiudad * ap * p.plantasNido;
    equip.forEach(e => { s += e.superficie * e.cantidad; });
    return s;
  }
  const medidas: Medidas = {
    ciudad: { radio: RC, area: Math.PI * RC * RC, poblacion: pob, nidos: nidosCiudad, densidad: pob / (Math.PI * RC * RC / 1e6) },
    pueblo: { radio: RV, area: Math.PI * RV * RV, poblacion: pob / nP, radioAnillo: anilloP },
    comunidad: { radio: R, area: Math.PI * R * R, poblacion: pob / nP / nC, areaPorPersona: Math.PI * R * R / (pob / nP / nC), radioAnillo: anilloC },
    familia: { largo: dR, anchoMax: 2 * Wm, area: areaPetalo * Wm * dR, personas: nidosFam * p.personasPorNido },
    nido: { lado: p.ladoNido, areaPlanta: ap, plantas: p.plantasNido, construida: ap * p.plantasNido, diametro: 2 * p.ladoNido },
    viario: largo,
    arboles: arbolesTotales,
    panelesSolares: panelesTotales * 4,
    superficieConstruida: sup,
    equipamientos: equip,
  };

  return { superficies, anillos, discos, edificios, arboles: new Float32Array(arb), arbolesAmbito, paneles, vehiculos, etiquetas, cotas, unidades, medidas, foco };
}

function xy(c: XY) { return { x: c[0], y: c[1] }; }
function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

/** Is `ambito` inside scope `s` ('' = the whole city)? */
export function dentroDe(ambito: string, s: string) {
  return s === '' || ambito === s || ambito.startsWith(s + '/');
}
