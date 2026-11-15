// ============================================================================
// CIRCUITO DE ESTABILIDAD · LOS DATOS DE CADA VEHÍCULO (2026-11-15)
// ============================================================================
// One table, one row per vehicle, every figure with its source. A figure that is
// not published (the height of the centre of gravity almost never is) is
// ESTIMATED, listed in `estimados` with how, and the page marks it «estimado».
//
// THE GARAGE IS THE SOURCE OF THE DIMENSIONS when it has the car: `fichaGaraje`
// reads wheelbase, tracks, height and top speed from `VEHICULOS_GARAJE` by id
// and only falls back to the figures written here when the garage lacks one.
// So the Twizy, the Aptera and the Model Y cannot drift from the garage.
//
// HOOKS FOR THE OTHER BRANCHES (2026-11-15):
//   · `nube/garaje-referencias` adds the Smera to the garage. If its id is
//     'smera', nothing to do: its wheelbase, tracks and height replace the ones
//     below automatically. Another id: change `idGaraje` in the Smera's row.
//   · `nube/basculante` (an editable tilting family): `fichaDeDiseno` builds a
//     row from ANY editor model with `ruedas`. A family that tilts exposes
//     `inclinacionMax` (degrees) on its model; one that computes its centre of
//     gravity exposes `cg: { x, y }` on its results (as the Triciclo does in
//     `res.triciclo.cg`). Both are read below, nothing else to wire.
import { vehiculoGaraje } from '../garaje';
import type { Modelo, Resultados } from '../geometria';
import type { VehiculoFisico } from './fisica';

export type Disposicion = 'cuatro' | 'tadpole' | 'delta' | 'rombo';
export const NOMBRE_DISPOSICION: Record<Disposicion, string> = {
  cuatro: 'cuatro ruedas', tadpole: 'tres ruedas, dos delante', delta: 'tres ruedas, una delante', rombo: 'cuatro ruedas en rombo',
};

export type CampoEstimable = 'h' | 'repartoDel' | 'viaDel' | 'viaTras' | 'masa' | 'inclinacionMax' | 'batalla' | 'vmax';

export interface FichaDinamica {
  id: string;
  nombre: string;
  /** Short name for the legends. */
  corto: string;
  /** Garage id whose dimensions take precedence (see the header). */
  idGaraje?: string;
  disposicion: Disposicion;
  /** Mass in running order with a 75 kg driver (kg). It does NOT change any threshold (it cancels out); it is shown for context. */
  masa: number;
  /** Overall width and height (m): only for drawing the rear view. */
  ancho: number; alto: number;
  batalla: number;
  /** Tracks, centre to centre of the tyres (m); 0 on an axle with one wheel. */
  viaDel: number; viaTras: number;
  /** Share of the weight on the front axle (0-1): where the centre of gravity sits along the wheelbase. */
  repartoDel: number;
  /** Height of the centre of gravity above the ground, with the driver (m). */
  h: number;
  /** Maximum lean (degrees); 0 = does not tilt. */
  inclinacionMax: number;
  vmax: number;
  neumaticos: string;
  /** Explicit contact points [x from the rear axle, z] (m), for layouts the four above do not cover (the Gota's rhombus). */
  apoyos?: [number, number][];
  /** Each estimated figure and how it was estimated. */
  estimados: Partial<Record<CampoEstimable, string>>;
  fuentes: string[];
  /** Where the row comes from: the table here, or the editor's model (calculated). */
  origen: 'tabla' | 'editor';
}

/** The one rule used for every unpublished centre-of-gravity height (see «Cómo se calcula»). */
export const FRACCION_ALTURA_CDG = 0.35;
const estH = (alto: number) => `${Math.round(FRACCION_ALTURA_CDG * 100)} % de la altura total (${alto.toFixed(2).replace('.', ',')} m): la proporción típica de un coche con la batería en el suelo y el conductor sentado. No se publica`;

const SMERA: FichaDinamica = {
  id: 'smera', idGaraje: 'smera', nombre: 'Lumeneo Smera', corto: 'Smera', disposicion: 'cuatro',
  // auto123.com (prototype page 2): 2 500 × 860 × 1 480 mm, wheelbase 1 700 mm, track 655 mm, 500 kg with batteries,
  // 145/70 R14, 130 km/h. Wikipedia (citing lumeneo.fr, archived 2011): 2 500 × 960 mm, track 655 mm, tilts up to 25°.
  // Caradisiac (Geneva 2008): tilts 25°. diariomotor.com (2012): 550 kg «en orden de marcha».
  masa: 550 + 75, ancho: 0.86, alto: 1.48, batalla: 1.70, viaDel: 0.655, viaTras: 0.655,
  repartoDel: 0.45, h: FRACCION_ALTURA_CDG * 1.48, inclinacionMax: 25, vmax: 110,
  neumaticos: '145/70 R14',
  estimados: {
    h: estH(1.48),
    repartoDel: '45 % delante: los dos motores van en las ruedas traseras. No se publica. Con la misma vía delante y detrás no cambia el vuelco',
    inclinacionMax: '25° según Wikipedia (ficha de Lumeneo) y Caradisiac; la ficha del prototipo en auto123 dice 20°. Se toma 25°',
  },
  fuentes: [
    'auto123.com, «The Lumeneo Smera prototype» (pág. 2): 2 500 × 860 × 1 480 mm, batalla 1 700 mm, vía 655 mm, 500 kg con baterías, 145/70 R14, 130 km/h',
    'Wikipedia, «Lumeneo SMERA» (cita la ficha técnica de lumeneo.fr, 2011): vía 655 mm, se inclina hasta 25°, 110 km/h',
    'diariomotor.com (8/10/2012): 550 kg en orden de marcha, 2,5 m de largo',
    'Caradisiac, Salón de Ginebra 2008: basculación de 25°',
  ],
  origen: 'tabla',
};

const APTERA: FichaDinamica = {
  id: 'aptera', idGaraje: 'aptera', nombre: 'Aptera', corto: 'Aptera', disposicion: 'tadpole',
  masa: 998 + 75, ancho: 2.225, alto: 1.422, batalla: 2.743, viaDel: 1.95, viaTras: 0,
  repartoDel: 0.55, h: FRACCION_ALTURA_CDG * 1.422, inclinacionMax: 0, vmax: 162.5,
  neumaticos: 'llanta de 16″ (FAQ de Aptera)',
  estimados: {
    h: estH(1.422),
    repartoDel: '55 % delante: los motores van en las dos ruedas delanteras y los ocupantes entre los ejes. No se publica. En un triciclo con dos ruedas delante, más peso delante es más estabilidad',
    viaDel: '1,95 m: la estima el modelo del garaje casando fotos y renders (no se publica)',
  },
  fuentes: [
    'Garaje del Aeromóvil (`garaje/aptera.ts`): Wikipedia, ficha del Aptera Launch Edition: 4 496 × 2 225 × 1 422 mm, batalla 2 743 mm, 998 kg; FAQ de Aptera: 162,5 km/h, llantas de 16″',
  ],
  origen: 'tabla',
};

const TWIZY: FichaDinamica = {
  id: 'twizy', idGaraje: 'twizy', nombre: 'Renault Twizy', corto: 'Twizy', disposicion: 'cuatro',
  masa: 474 + 75, ancho: 1.237, alto: 1.454, batalla: 1.686, viaDel: 1.094, viaTras: 1.080,
  repartoDel: 0.45, h: FRACCION_ALTURA_CDG * 1.454, inclinacionMax: 0, vmax: 80,
  neumaticos: '125/80 R13 delante, 145/80 R13 detrás',
  estimados: {
    h: estH(1.454),
    repartoDel: '45 % delante: motor y transmisión detrás. No se publica',
  },
  fuentes: [
    'Garaje del Aeromóvil (`garaje/twizy.ts`): Renault, ficha técnica Twizy 80 (2012): 2 338 × 1 237 × 1 454 mm, batalla 1 686 mm, vías 1 094 / 1 080 mm; auto-data.net: 474 kg, 80 km/h',
    'tirewheelguide.com (Twizy 2022, versión de 17 CV): 125/80 R13 delante y 145/80 R13 detrás',
  ],
  origen: 'tabla',
};

const MODELO_Y: FichaDinamica = {
  id: 'modeloY', idGaraje: 'modeloY', nombre: 'Tesla Model Y (2025)', corto: 'Model Y', disposicion: 'cuatro',
  masa: 1994 + 75, ancho: 1.92, alto: 1.624, batalla: 2.890, viaDel: 1.636, viaTras: 1.636,
  repartoDel: 0.48, h: FRACCION_ALTURA_CDG * 1.624, inclinacionMax: 0, vmax: 201,
  neumaticos: '255/45 R19',
  estimados: {
    h: `${estH(1.624)}. Comprobación aproximada: da un SSF de 1,44; Tesla anuncia un 7,9 % de riesgo de vuelco (cinco estrellas, menos del 10 %), lo que pide un SSF alto. La relación exacta SSF–riesgo de la NHTSA no se ha comprobado aquí`,
    repartoDel: '48 % delante (no se publica; con la misma vía delante y detrás no cambia el vuelco)',
  },
  fuentes: [
    'Garaje del Aeromóvil (`garaje/modeloY.ts`): evspecifications.com (Long Range AWD 2025): 4 797 × 1 920 × 1 624 mm, batalla 2 890 mm, vías 1 636 / 1 636 mm, 1 994 kg, 201 km/h, 255/45 R19',
    'Jalopnik (14/1/2021): Tesla atribuye a la NHTSA un 7,9 % de riesgo de vuelco para el Model Y (no figura en la web de la NHTSA, dice el artículo)',
  ],
  origen: 'tabla',
};

/** The fixed table: the Smera first (Eugenio's first test), then the Aptera (its comparison). */
export const FICHAS: FichaDinamica[] = [SMERA, APTERA, TWIZY, MODELO_Y];

/** A table row with the garage's dimensions over it, when the garage has that car (see the header). */
export function fichaGaraje(f: FichaDinamica): FichaDinamica {
  const g = f.idGaraje ? vehiculoGaraje(f.idGaraje) : undefined;
  if (!g) return f;
  const n = (v: number | undefined, otro: number) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : otro);
  const vT = g.viaTras === 0 ? 0 : n(g.viaTras, f.viaTras);
  const alto = n(g.alto, f.alto);
  // an estimated CdG height follows the garage's height (the same 35 % rule), keeping any extra sentence after it
  const reH = f.estimados.h && Math.abs(alto - f.alto) > 1e-6;
  const estimados = reH ? { ...f.estimados, h: estH(alto) + (f.estimados.h!.split('. No se publica')[1] ?? '') } : f.estimados;
  return {
    ...f, ancho: n(g.ancho, f.ancho), alto, batalla: n(g.batalla, f.batalla), viaDel: n(g.viaDel, f.viaDel), viaTras: f.viaTras === 0 ? 0 : vT,
    vmax: n(g.aero?.vmax, f.vmax), h: reH ? FRACCION_ALTURA_CDG * alto : f.h, estimados,
  };
}

/** Contact points of a table row (x from the rear axle). */
export function apoyosDe(f: FichaDinamica): [number, number][] {
  if (f.apoyos) return f.apoyos;
  const L = f.batalla, tf = f.viaDel / 2, tr = f.viaTras / 2;
  if (f.disposicion === 'tadpole') return [[L, tf], [L, -tf], [0, 0]];
  if (f.disposicion === 'delta') return [[L, 0], [0, tr], [0, -tr]];
  return [[L, tf], [L, -tf], [0, tr], [0, -tr]];
}

/** The physics' view of a row. `deltaH`: added to an ESTIMATED centre-of-gravity height only (the «¿y si la estimación falla?» slider). `sinBasculacion`: the tilt switched off. */
export function fisicoDe(f: FichaDinamica, o: { deltaH?: number; sinBasculacion?: boolean } = {}): VehiculoFisico {
  const h = f.h + (f.estimados.h ? o.deltaH ?? 0 : 0);
  return { id: f.id, apoyos: apoyosDe(f), xg: f.repartoDel * f.batalla, h: Math.max(0.1, h), inclinacionMax: o.sinBasculacion ? 0 : f.inclinacionMax, vmax: f.vmax };
}

// ---------------------------------------------------------------- the editor's design
/** The tilt of an editor model: the Gota's `tiltMax`, or `inclinacionMax` on any newer family (the hook). */
function inclinacionDeModelo(m: Modelo): number {
  if (m.tipo === 'gota') return m.P.tiltMax;
  const x = (m as unknown as { inclinacionMax?: unknown }).inclinacionMax;
  return typeof x === 'number' && Number.isFinite(x) ? x : 0;
}

/** Top speed of an editor design (km/h): the family's own figure, or 100 while it has none (the Triciclo's waits for the tunnel's Cd). */
function vmaxDe(m: Modelo, res: Resultados): number | null {
  const v = m.tipo === 'a1' ? res.a1?.vmaxPico : m.tipo === 'triciclo' ? res.triciclo?.energia?.vmaxPico : res.vmax;
  return typeof v === 'number' && Number.isFinite(v) && v > 5 ? Math.min(v, 200) : null;
}

/**
 * A row from the design open in the editor: its wheels where the editor puts them, its masses and, where the family
 * computes it (the Triciclo and Cuadriciclo), its own centre of gravity. Null for a family without masses (the Bala).
 */
export function fichaDeDiseno(m: Modelo, res: Resultados, nombre: string): FichaDinamica | null {
  if (m.tipo === 'bala' || !m.ruedas?.length) return null;
  const xs = m.ruedas.map(r => r.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const apoyos = m.ruedas.map(r => [r.x - x0, r.z] as [number, number]);
  const batalla = x1 - x0;
  const delante = m.ruedas.filter(r => Math.abs(r.x - x1) < 1e-3), detras = m.ruedas.filter(r => Math.abs(r.x - x0) < 1e-3);
  const via = (l: typeof m.ruedas) => (l.length >= 2 ? Math.max(...l.map(r => r.z)) - Math.min(...l.map(r => r.z)) : 0);
  const viaDel = via(delante), viaTras = via(detras);
  const disposicion: Disposicion = m.ruedas.length === 4 && delante.length === 1 && detras.length === 1 ? 'rombo'
    : m.ruedas.length === 3 ? (delante.length === 2 ? 'tadpole' : 'delta') : 'cuatro';
  const cgRes = (res.triciclo?.cg ?? (res as unknown as { cg?: { x: number; y: number; masa?: number } }).cg) as { x: number; y: number; masa?: number } | undefined;
  const P = (m as unknown as { P?: { H?: number; W?: number } }).P;
  const alto = typeof P?.H === 'number' ? P.H : 1.3;
  const ancho = typeof P?.W === 'number' ? P.W : Math.max(viaDel, viaTras) + 0.2;
  const estimados: FichaDinamica['estimados'] = {};
  let h: number, repartoDel: number;
  if (cgRes && Number.isFinite(cgRes.y)) {
    h = cgRes.y; repartoDel = batalla > 0 ? (cgRes.x - x0) / batalla : 0.5;
  } else {
    h = FRACCION_ALTURA_CDG * alto; estimados.h = `${estH(alto)}: esta familia del editor aún no calcula su centro de gravedad`;
    // equal load on every wheel: the centroid of the contact points along the car
    repartoDel = batalla > 0 ? (apoyos.reduce((a, p) => a + p[0], 0) / apoyos.length) / batalla : 0.5;
    estimados.repartoDel = 'el mismo peso en cada rueda: esta familia del editor aún no calcula dónde va su centro de gravedad';
  }
  const masa = Math.round(cgRes?.masa ?? (res as unknown as { mTot?: number }).mTot ?? res.mVeh);
  const vmax = vmaxDe(m, res);
  if (vmax === null) estimados.vmax = '100 km/h: el editor aún no tiene su velocidad máxima (en el Triciclo llega con el Cd del túnel)';
  return {
    id: 'diseno', nombre: `${nombre} (tu diseño)`, corto: nombre.length > 16 ? 'Tu diseño' : nombre, disposicion,
    masa, ancho, alto, batalla, viaDel, viaTras, repartoDel, h, inclinacionMax: inclinacionDeModelo(m),
    vmax: vmax ?? 100,
    neumaticos: 'los del editor', apoyos, estimados,
    fuentes: [cgRes ? 'Editor del Aeromóvil: ruedas, masas y centro de gravedad calculados por el propio editor con el diseño abierto (con sus ocupantes)' : 'Editor del Aeromóvil: ruedas y masas del diseño abierto'],
    origen: 'editor',
  };
}
