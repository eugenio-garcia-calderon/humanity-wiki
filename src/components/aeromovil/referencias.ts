// ============================================================================
// AEROMÓVIL GOTA · otros velomóviles para comparar (2026-11-05)
// ============================================================================
// Eugenio: «un apartado de otros velomóviles, por ejemplo el AeroRider y el
// Quatrevelo… extrae el modelo 3D y permite compararlo con el que estamos
// creando… y crear otros modelos 3D en base a otras fotos».
//
// Un modelo de referencia es una silueta, no un CAD: perfil lateral (arriba y
// abajo), media anchura en planta y la posición de las ruedas, todo en metros
// y con el mismo origen que el Aeromóvil (eje delantero a nivel del suelo,
// x hacia delante). Con eso se reconstruye un carenado de secciones
// superelípticas, suficiente para comparar tamaño, forma y huella.
//
// Los dos de catálogo salen de las MEDIDAS PUBLICADAS (largo, ancho, alto,
// batalla, ruedas) y de la forma general de sus fotos; las curvas intermedias
// son una aproximación y la página lo dice. Los que se crean desde fotos salen
// de la silueta que se recorta en el navegador (`fotoAModelo.ts`).

import type { Est } from './garaje/forma';
import { estacion } from './garaje/apteraPiel';
import {
  ALTO as SZ_ALTO, ANCHO as SZ_ANCHO, BATALLA as SZ_BATALLA, CUERPO as SZ_CUERPO, CUPULA as SZ_CUPULA,
  LARGO as SZ_LARGO, R_RUEDA as SZ_R_RUEDA, VIA_DEL as SZ_VIA_DEL, VIA_TRAS as SZ_VIA_TRAS, X_MORRO as SZ_X_MORRO,
} from './garaje/szemissionForma';

export type Cabina = 'cupula' | 'abierta' | 'cerrada';
export interface RuedaRef { x: number; z: number; d: number }
export interface PerfilRef { x: number[]; top: number[]; bot: number[]; hw: number[] }

export interface Referencia {
  id: string;                 // 'cat-…' de catálogo, 'db-N' guardado en la base
  nombre: string;
  origen: 'catalogo' | 'fotos';
  fuente: string;             // de dónde salen las medidas
  enlaces?: { t: string; url: string }[];
  L: number; W: number; H: number; clear: number;
  batalla: number;
  plazas: number;
  masa?: number;              // kg, la publicada
  cabina: Cabina;
  /** Zona de cristal o abertura, en x (m): de dónde a dónde. */
  cabinaX?: [number, number];
  /** Tramo transparente en toda la vuelta (un morro de plástico claro), en x (m). */
  transparenteX?: [number, number];
  /** Color de la carrocería al verlo solo (el fantasma de «Comparar» es siempre turquesa). */
  color?: number;
  /** Exponente de la mitad de arriba de la sección (2,5 por defecto): más bajo, techo
   *  más estrecho que el cuerpo, como una cúpula sobre una carrocería ancha. */
  formaArriba?: number;
  /** Coeficiente de arrastre publicado. */
  cd?: number;
  /** Exponentes de la sección del cuerpo (arriba, abajo). Más alto, más cuadrado. */
  seccion?: { arriba: number; abajo: number };
  /** Cúpula de cristal aparte, encima del cuerpo: en cada x, su base, su techo y su media anchura. */
  cupula?: { x: number[]; base: number[]; top: number[]; hw: number[] };
  /** Pintura: color delante y detrás de `corteX`, y abajo (fracción de la altura de la sección). */
  librea?: { delante: number; detras: number; abajo: number; corteX: number; alturaAbajo: number; rayas?: [number, number][]; colorRayas?: number };
  /** Faros: posición (m) y largo de cada rendija. */
  faros?: { x: number; y: number; z: number; largo: number }[];
  ruedas: RuedaRef[];
  perfil: PerfilRef;
  notas?: string;
}

/** Perfil de una gota genérica a partir de sus medidas: morro, máximo, cola. */
function perfilGota(o: {
  xn: number; L: number; H: number; W: number; clear: number;
  pmax: number; nariz: number; cola: number; romo?: number; anchoMax?: number;
}): PerfilRef {
  const N = 90, x: number[] = [], top: number[] = [], bot: number[] = [], hw: number[] = [];
  const zcAt = (u: number) => o.clear + (o.H - o.clear) * (o.nariz + (o.cola - o.nariz) * u);
  const aT = o.H - zcAt(o.pmax);
  for (let i = 0; i <= N; i++) {
    const u = (1 - Math.cos(Math.PI * i / N)) / 2;
    let s: number;
    if (u < o.pmax) { const a = (o.pmax - u) / o.pmax; s = Math.pow(Math.max(0, 1 - a * a), 0.5 - 0.3 * (o.romo ?? 0)); }
    else { const t = (u - o.pmax) / (1 - o.pmax); s = Math.pow((1 + Math.cos(Math.PI * t)) / 2, 0.8); }
    const zc = zcAt(u);
    const g = Math.min(1, u < o.pmax ? 1.15 * Math.pow(s, 0.7) : 1.6 * Math.pow(s, 0.5));
    x.push(o.xn - u * o.L);
    top.push(zc + aT * s);
    bot.push(zc - (zc - o.clear) * g);
    hw.push((o.anchoMax ?? o.W) / 2 * Math.pow(s, 0.9));
  }
  return { x, top, bot, hw };
}

const d20 = 0.508;

/**
 * Una cápsula: morro en cono redondeado, cuerpo casi recto y trasera roma.
 * `morro` y `cola` son la fracción del largo que ocupa cada extremo;
 * `yMorro` y `yCola`, la altura (m) a la que se cierra cada punta.
 */
function perfilCapsula(o: {
  xn: number; L: number; H: number; W: number; clear: number;
  morro: number; cola: number; yMorro: number; yCola: number; caidaTecho: number;
}): PerfilRef {
  const N = 90, x: number[] = [], top: number[] = [], bot: number[] = [], hw: number[] = [];
  for (let i = 0; i <= N; i++) {
    const u = (1 - Math.cos(Math.PI * i / N)) / 2;
    const T = o.H - o.H * o.caidaTecho * Math.pow(Math.max(0, (u - 0.5) / 0.5), 1.6);
    let s = 1, y0 = o.yMorro;
    if (u < o.morro) { const a = (o.morro - u) / o.morro; s = Math.pow(Math.max(0, 1 - a * a), 0.62); }
    else if (u > 1 - o.cola) { const a = (u - (1 - o.cola)) / o.cola; s = Math.pow(Math.max(0, 1 - a * a), 0.5); y0 = o.yCola; }
    else y0 = o.yMorro + (o.yCola - o.yMorro) * (u - o.morro) / Math.max(0.01, 1 - o.morro - o.cola);
    x.push(o.xn - u * o.L);
    top.push(y0 + (T - y0) * s);
    bot.push(y0 - (y0 - o.clear) * Math.min(1, s * 1.25));
    hw.push(o.W / 2 * Math.pow(s, 0.85));
  }
  return { x, top, bot, hw };
}

/**
 * The SZEmission (the car the Aeromóvil 1 was shaped from). Since 2026-11-09 this
 * card reads the garage model's stations (`garaje/szemissionForma.ts`), measured on
 * Eugenio's photos with solved cameras, so the card and the garage can never give
 * two sizes for the same car. The first reading (2026-11-06, 2.80 m) took the side
 * photo as if it had no perspective.
 */
const SZ = { L: SZ_LARGO, xn: SZ_X_MORRO };
const muestrearEst = (es: Est[], n: number) => {
  const x0 = es[0].x, x1 = es[es.length - 1].x;
  return Array.from({ length: n + 1 }, (_, i) => estacion(es, x0 + (x1 - x0) * (1 - Math.cos(Math.PI * i / n)) / 2));
};
const SZ_PERFIL: PerfilRef = (() => {
  const o: PerfilRef = { x: [], top: [], bot: [], hw: [] };
  for (const e of muestrearEst(SZ_CUERPO, 120)) { o.x.push(e.x); o.top.push(e.yt); o.bot.push(Math.min(e.yb, e.yt)); o.hw.push(Math.max(0.004, e.wm)); }
  return o;
})();
const SZ_CUPULA_REF = (() => {
  const c = { x: [] as number[], base: [] as number[], top: [] as number[], hw: [] as number[] };
  for (const e of muestrearEst(SZ_CUPULA, 60)) { c.x.push(e.x); c.base.push(e.yb); c.top.push(e.yt); c.hw.push(e.wm); }
  return c;
})();

/** Los de catálogo: medidas publicadas, curvas aproximadas. */
export const CATALOGO: Referencia[] = [
  {
    id: 'cat-aerorider', nombre: 'AeroRider', origen: 'catalogo',
    fuente: 'Medidas publicadas: 2780 × 850 × 1200 mm, batalla 1270 mm, 72 kg sin baterías, tres ruedas de 20″, una plaza.',
    enlaces: [
      { t: 'AeroRider en New Atlas', url: 'https://newatlas.com/aerorider-fully-enclosed-electric-assist-bicycle/1811/' },
      { t: 'Ficha técnica (AQUA)', url: 'https://aeromenredace.blogspot.com/2008/08/aerorider.html' },
    ],
    L: 2.78, W: 0.85, H: 1.20, clear: 0.10, batalla: 1.27, plazas: 1, masa: 72, cabina: 'cupula', cabinaX: [-0.05, -1.15],
    // Triciclo con dos ruedas delante y una detrás. No bascula: ninguna fuente lo dice (ni la ficha AQUA,
    // que lo detalla hasta el limpiaparabrisas, ni la prueba de OliNo); radio de giro 7 m. La vía de
    // 0,64 m no está publicada: estimada (2026-11-09, al modelarlo para el garaje).
    ruedas: [{ x: 0, z: 0.32, d: d20 }, { x: 0, z: -0.32, d: d20 }, { x: -1.27, z: 0, d: d20 }],
    perfil: perfilGota({ xn: 0.50, L: 2.78, H: 1.20, W: 0.85, clear: 0.10, pmax: 0.40, nariz: 0.30, cola: 0.45, romo: 0.3 }),
    notas: 'Diseño de Gjalt Wijma (Países Bajos), con asistencia eléctrica de 600 W y 45 km/h. Las curvas son una aproximación a partir de las medidas y las fotos.',
  },
  {
    id: 'cat-quatrevelo', nombre: 'Quatrevelo', origen: 'catalogo',
    fuente: 'Medidas publicadas: 2835 × 760 × 880 mm, 32-35 kg, cuatro ruedas de 20″, una plaza (y un niño pequeño detrás). La batalla y las vías no se publican: estimadas.',
    enlaces: [
      { t: 'Datos técnicos (Velomobiel.nl)', url: 'https://en.velomobiel.nl/quatrevelo/technische_gegevens.php' },
      { t: 'Quatrevelo en Wikipedia', url: 'https://en.wikipedia.org/wiki/Quatrevelo' },
    ],
    L: 2.835, W: 0.76, H: 0.88, clear: 0.08, batalla: 1.15, plazas: 1, masa: 34, cabina: 'abierta', cabinaX: [-0.85, -1.30],
    ruedas: [{ x: 0, z: 0.265, d: d20 }, { x: 0, z: -0.265, d: d20 }, { x: -1.15, z: 0.27, d: d20 }, { x: -1.15, z: -0.27, d: d20 }],
    perfil: perfilGota({ xn: 0.62, L: 2.835, H: 0.88, W: 0.76, clear: 0.08, pmax: 0.48, nariz: 0.32, cola: 0.55 }),
    notas: 'Velomóvil de carbono de Velomobiel.nl, sin motor de serie. La cabeza del ciclista sale por la abertura (o va bajo una capota). Batalla y vías estimadas.',
  },
  {
    // 2026-11-05, Eugenio, con una foto: «modela también este velomóvil para
    // poder compararlo con el nuestro». Marca y modelo sin identificar.
    // Lectura de la foto (de 3/4, sin escala): morro de plástico transparente
    // con los faros dentro y una horquilla blanca debajo (una rueda delante),
    // parabrisas en el techo y ventanilla larga a cada lado, y la parte roma y
    // redondeada detrás, con las dos ruedas de atrás asomando en las esquinas.
    // Todas las medidas son estimadas a ojo.
    id: 'cat-rojo-2004', nombre: 'Velomóvil rojo (foto de 2004)', origen: 'catalogo',
    fuente: 'Una sola foto de 3/4 enviada por Eugenio, sin marca ni medidas. Todo estimado a ojo: unos 3,0 × 0,80 × 1,05 m, una rueda delante y dos detrás de 20″.',
    L: 3.0, W: 0.80, H: 1.05, clear: 0.10, batalla: 2.10, plazas: 1, cabina: 'cerrada', cabinaX: [-0.30, -1.90], transparenteX: [0.45, 0.07],
    ruedas: [{ x: 0, z: 0, d: d20 }, { x: -2.10, z: 0.29, d: d20 }, { x: -2.10, z: -0.29, d: d20 }],
    perfil: perfilCapsula({ xn: 0.45, L: 3.0, H: 1.05, W: 0.80, clear: 0.10, morro: 0.40, cola: 0.10, yMorro: 0.30, yCola: 0.50, caidaTecho: 0.18 }),
    color: 0xc4161c,
    notas: 'Si la parte transparente fuera la cola y no el morro, el vehículo iría al revés: dímelo y lo giro. Con una foto de perfil y su largo real se puede rehacer más fiel desde «Crear un modelo 3D desde fotos».',
  },
  {
    // 2026-11-06, Eugenio, con fotos del SZEnergy Team: «modela este y busca
    // info en internet para hacerlo lo más preciso posible, llámalo Aeromóvil 1».
    // Es el SZEmission de la Universidad Széchenyi István (Győr, Hungría),
    // UrbanConcept eléctrico de la Shell Eco-marathon. Esa misma tarde el
    // Aeromóvil 1 pasó a ser nuestro diseño paramétrico (geometriaA1.ts): un
    // SZEmission un 30 % mayor. Esta ficha es el original, para compararlos.
    //   Publicado por el equipo: 95 kg en orden de carrera, Cd 0,1365, monocasco
    //   de composite de carbono en forma de gota modificada, motor PMS con
    //   correa dentada, batería LiPo de 350-530 Wh, 332 km/kWh en 2026.
    //   No publican medidas. El reglamento UrbanConcept fija: alto 1,00-1,30 m,
    //   ancho 1,20-1,30 m, largo 2,20-3,50 m, batalla ≥ 1,20 m, vía ≥ 1,00 m
    //   delante y ≥ 0,80 m detrás, altura libre ≥ 10 cm.
    //   2026-11-09: forma y medidas salen ahora del modelo del garaje
    //   (`garaje/szemissionForma.ts`), con cámaras resueltas sobre tres fotos a la
    //   vez y la escala de la vía delantera mínima: 3,42 × 1,28 × 1,045 m,
    //   batalla 1,21 m. La primera lectura (2,80 m de largo, batalla 1,15 m) leía
    //   la foto de perfil sin corregir la perspectiva, y esa batalla no pasaría
    //   el reglamento.
    id: 'cat-szemission', nombre: 'SZEmission (SZEnergy Team)', origen: 'catalogo',
    fuente: 'SZEmission del SZEnergy Team (Universidad Széchenyi, Győr). Publicado: 95 kg, Cd 0,1365, monocasco de carbono, una plaza. Las medidas no se publican: la forma y las medidas son las del modelo del garaje, leídas con cámaras resueltas sobre tres fotos y a escala con la vía delantera mínima del reglamento UrbanConcept (1,00 m); margen de unos ±10 cm en el largo.',
    enlaces: [
      { t: 'SZEmission, ficha del equipo', url: 'https://szenergy.hu/en/our-racing-cars/' },
      { t: 'Presentación del coche 2026', url: 'https://alumni.sze.hu/en/?p=10203' },
      { t: 'Reglas UrbanConcept (resumen)', url: 'https://areeweb.polito.it/didattica/h2polito/en/competitions/shell-eco-marathon.html' },
    ],
    L: SZ.L, W: SZ_ANCHO, H: SZ_ALTO, clear: 0.14, batalla: SZ_BATALLA, plazas: 1, masa: 95, cd: 0.1365, cabina: 'cupula',
    ruedas: [
      { x: 0, z: SZ_VIA_DEL / 2, d: 2 * SZ_R_RUEDA }, { x: 0, z: -SZ_VIA_DEL / 2, d: 2 * SZ_R_RUEDA },
      { x: -SZ_BATALLA, z: SZ_VIA_TRAS / 2, d: 2 * SZ_R_RUEDA }, { x: -SZ_BATALLA, z: -SZ_VIA_TRAS / 2, d: 2 * SZ_R_RUEDA },
    ],
    perfil: SZ_PERFIL,
    seccion: { arriba: 2.4, abajo: 4.5 },
    cupula: SZ_CUPULA_REF,
    // Amarillo delante, plata detrás con rayas negras en la cola, y todo el bajo negro.
    color: 0xf5c400,
    librea: { delante: 0xf5c400, detras: 0xc9ccd1, abajo: 0x16181b, corteX: SZ.xn - 0.56 * SZ.L, alturaAbajo: 0.32, rayas: [[SZ.xn - 0.865 * SZ.L, SZ.xn - 0.85 * SZ.L], [SZ.xn - 0.895 * SZ.L, SZ.xn - 0.88 * SZ.L], [SZ.xn - 0.925 * SZ.L, SZ.xn - 0.91 * SZ.L]], colorRayas: 0x16181b },
    // Las rendijas de los faros del modelo del garaje van de x 0,80 a 0,42, en los hombros del morro.
    faros: [{ x: 0.61, y: 0.51, z: 0.45, largo: 0.30 }, { x: 0.61, y: 0.51, z: -0.45, largo: 0.30 }],
    notas: 'Ruedas de unos 56 cm (95/80 R16, las del coche anterior del equipo), con la mitad de abajo asomando bajo el cuerpo, como en las fotos. La cúpula es de cristal tintado y se prolonga sobre la cola. Las medidas salen de fotos con perspectiva corregida, no de una ficha: pueden variar unos centímetros. El modelo detallado, con su librea, está en el garaje.',
  },
];

/** Interpola el perfil en una x cualquiera (los x van de morro a cola, decrecientes). */
export function perfilEn(p: PerfilRef, x: number) {
  const n = p.x.length;
  if (x >= p.x[0]) return { top: p.top[0], bot: p.bot[0], hw: p.hw[0], dentro: false };
  if (x <= p.x[n - 1]) return { top: p.top[n - 1], bot: p.bot[n - 1], hw: p.hw[n - 1], dentro: false };
  let i = 0;
  while (i < n - 2 && p.x[i + 1] > x) i++;
  const t = (p.x[i] - x) / (p.x[i] - p.x[i + 1] || 1);
  const L = (a: number[]) => a[i] + (a[i + 1] - a[i]) * t;
  return { top: L(p.top), bot: L(p.bot), hw: L(p.hw), dentro: true };
}

/** Lo que se compara en la tabla. */
export function fichaComparable(r: Referencia) {
  const ejes = [...new Set(r.ruedas.map(w => Math.round(w.x * 100)))].length;
  const vias = r.ruedas.filter(w => Math.abs(w.z) > 0.01).map(w => 2 * Math.abs(w.z));
  return {
    L: r.L, W: r.W, H: r.H, batalla: r.batalla, ruedas: r.ruedas.length, ejes,
    via: vias.length ? Math.max(...vias) : 0, plazas: r.plazas, masa: r.masa ?? null, cd: r.cd ?? null,
    huella: r.L * r.W,
  };
}

/** Comprueba lo que llega de la base o de un formulario antes de dibujarlo. */
export function referenciaValida(r: any): r is Referencia {
  const num = (v: any, a: number, b: number) => typeof v === 'number' && Number.isFinite(v) && v >= a && v <= b;
  if (!r || typeof r.nombre !== 'string' || !r.perfil || !Array.isArray(r.ruedas)) return false;
  const p = r.perfil;
  if (!['x', 'top', 'bot', 'hw'].every(k => Array.isArray(p[k]) && p[k].length >= 8 && p[k].length <= 400 && p[k].every((v: any) => num(v, -12, 12)))) return false;
  if (new Set([p.x.length, p.top.length, p.bot.length, p.hw.length]).size !== 1) return false;
  return num(r.L, 0.5, 12) && num(r.W, 0.2, 4) && num(r.H, 0.3, 4) && r.ruedas.length <= 8
    && r.ruedas.every((w: any) => num(w.x, -12, 12) && num(w.z, -3, 3) && num(w.d, 0.2, 1.2));
}
