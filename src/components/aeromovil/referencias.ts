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

/** Interpola suave (Hermite) una lista de puntos [u, valor] con u creciente. */
function suave(pts: [number, number][]) {
  return (u: number) => {
    if (u <= pts[0][0]) return pts[0][1];
    if (u >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    let i = 0; while (pts[i + 1][0] < u) i++;
    const [u0, v0] = pts[i], [u1, v1] = pts[i + 1], h = u1 - u0, t = (u - u0) / h;
    const m = (k: number) => {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
      return (b[1] - a[1]) / (b[0] - a[0] || 1);
    };
    const m0 = m(i) * h, m1 = m(i + 1) * h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * v0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * v1 + (t3 - t2) * m1;
  };
}

/** Perfil a partir de puntos leídos de fotos: u = 0 en el morro, 1 en la cola. */
function perfilDePuntos(xn: number, L: number, top: [number, number][], bot: [number, number][], hw: [number, number][], N = 120): PerfilRef {
  const fT = suave(top), fB = suave(bot), fW = suave(hw), o: PerfilRef = { x: [], top: [], bot: [], hw: [] };
  for (let i = 0; i <= N; i++) {
    const u = (1 - Math.cos(Math.PI * i / N)) / 2;
    o.x.push(xn - u * L); o.top.push(fT(u)); o.bot.push(Math.min(fB(u), fT(u))); o.hw.push(Math.max(0.004, fW(u)));
  }
  return o;
}

/** El Aeromóvil 1 (SZEmission), medido sobre las fotos de Eugenio. */
const A1 = { L: 2.80, xn: 0.66 };
const A1_PERFIL = perfilDePuntos(A1.xn, A1.L,
  // Techo del cuerpo en el centro (m): morro redondo, capó que sube al parabrisas, cola en punta a media altura.
  [[0, 0.42], [0.02, 0.50], [0.05, 0.555], [0.10, 0.61], [0.18, 0.675], [0.30, 0.71], [0.55, 0.71], [0.70, 0.68], [0.80, 0.62], [0.90, 0.535], [0.97, 0.475], [1, 0.44]],
  // Fondo (m): barbilla, suelo plano a 13,5 cm y la cola que sube detrás de las ruedas traseras.
  [[0, 0.42], [0.02, 0.33], [0.05, 0.24], [0.10, 0.17], [0.18, 0.14], [0.30, 0.135], [0.62, 0.135], [0.70, 0.155], [0.80, 0.225], [0.90, 0.32], [0.97, 0.39], [1, 0.44]],
  // Media anchura en planta (m): frente ancho y redondo, máximo hasta la mitad, cola afilada.
  [[0, 0.10], [0.02, 0.33], [0.05, 0.47], [0.10, 0.555], [0.18, 0.605], [0.27, 0.625], [0.45, 0.625], [0.55, 0.60], [0.65, 0.55], [0.75, 0.45], [0.85, 0.315], [0.93, 0.17], [1, 0.012]]);
const A1_CUPULA = (() => {
  const top = suave([[0.17, 0.66], [0.22, 0.85], [0.27, 0.955], [0.33, 1.015], [0.42, 1.03], [0.47, 1.03], [0.55, 1.01], [0.65, 0.95], [0.75, 0.86], [0.85, 0.74], [0.93, 0.58]]);
  const hw = suave([[0.17, 0.06], [0.22, 0.20], [0.30, 0.28], [0.45, 0.30], [0.60, 0.28], [0.75, 0.21], [0.85, 0.14], [0.93, 0.03]]);
  const deck = suave([[0.17, 0.69], [0.30, 0.71], [0.55, 0.71], [0.70, 0.68], [0.80, 0.62], [0.90, 0.535], [0.93, 0.515]]);
  const c = { x: [] as number[], base: [] as number[], top: [] as number[], hw: [] as number[] };
  for (let i = 0; i <= 60; i++) {
    const u = 0.17 + (0.93 - 0.17) * (1 - Math.cos(Math.PI * i / 60)) / 2;
    c.x.push(A1.xn - u * A1.L); c.base.push(deck(u) - 0.06); c.top.push(Math.max(deck(u) + 0.005, top(u))); c.hw.push(hw(u));
  }
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
    // Triciclo basculante con dos ruedas delante y una detrás.
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
    // UrbanConcept eléctrico de la Shell Eco-marathon.
    //   Publicado por el equipo: 95 kg en orden de carrera, Cd 0,1365, monocasco
    //   de composite de carbono en forma de gota modificada, motor PMS con
    //   correa dentada, batería LiPo de 350-530 Wh, 332 km/kWh en 2026.
    //   No publican medidas. El reglamento UrbanConcept fija: alto 1,00-1,30 m,
    //   ancho 1,20-1,30 m, largo 2,20-3,50 m, batalla ≥ 1,20 m, vía ≥ 1,00 m
    //   delante y ≥ 0,80 m detrás, altura libre ≥ 10 cm. Un coche de
    //   eficiencia apura los mínimos, y las fotos lo confirman: el techo de la
    //   cúpula queda a la altura de la cadera de la gente. Alto, ancho, batalla,
    //   vías y altura libre se toman en el mínimo del reglamento; el largo, de
    //   la proporción largo/alto en las fotos de perfil (≈ 2,8).
    id: 'cat-aeromovil-1', nombre: 'Aeromóvil 1', origen: 'catalogo',
    fuente: 'SZEmission del SZEnergy Team (Universidad Széchenyi, Győr). Publicado: 95 kg, Cd 0,1365, monocasco de carbono, una plaza. Forma y medidas leídas de las fotos de perfil, de frente y de 3/4, a escala con un alto de 1,03 m (el reglamento UrbanConcept pide entre 1,00 y 1,30).',
    enlaces: [
      { t: 'SZEmission, ficha del equipo', url: 'https://szenergy.hu/en/our-racing-cars/' },
      { t: 'Presentación del coche 2026', url: 'https://alumni.sze.hu/en/?p=10203' },
      { t: 'Reglas UrbanConcept (resumen)', url: 'https://areeweb.polito.it/didattica/h2polito/en/competitions/shell-eco-marathon.html' },
    ],
    // Medido sobre la foto de perfil: largo/alto 2,7; eje delantero al 24 % del
    // largo desde el morro, trasero al 65 %; fondo a 13 % del alto; vía
    // delantera 0,76 del ancho y trasera más estrecha (foto de frente).
    L: A1.L, W: 1.25, H: 1.03, clear: 0.135, batalla: 1.15, plazas: 1, masa: 95, cd: 0.1365, cabina: 'cupula',
    ruedas: [{ x: 0, z: 0.48, d: 0.50 }, { x: 0, z: -0.48, d: 0.50 }, { x: -1.15, z: 0.40, d: 0.50 }, { x: -1.15, z: -0.40, d: 0.50 }],
    perfil: A1_PERFIL,
    seccion: { arriba: 2.4, abajo: 4.5 },
    cupula: A1_CUPULA,
    // Amarillo delante, plata detrás con rayas negras en la cola, y todo el bajo negro.
    color: 0xf5c400,
    librea: { delante: 0xf5c400, detras: 0xc9ccd1, abajo: 0x16181b, corteX: A1.xn - 0.56 * A1.L, alturaAbajo: 0.32, rayas: [[A1.xn - 0.865 * A1.L, A1.xn - 0.85 * A1.L], [A1.xn - 0.895 * A1.L, A1.xn - 0.88 * A1.L], [A1.xn - 0.925 * A1.L, A1.xn - 0.91 * A1.L]], colorRayas: 0x16181b },
    faros: [{ x: A1.xn - 0.07 * A1.L, y: 0.55, z: 0.47, largo: 0.20 }, { x: A1.xn - 0.07 * A1.L, y: 0.55, z: -0.47, largo: 0.20 }],
    notas: 'Ruedas de unos 50 cm, con la mitad de abajo asomando bajo el cuerpo, como en las fotos. La cúpula es de cristal tintado y se prolonga sobre la cola. Las medidas salen de proporciones en fotos con perspectiva: pueden variar unos centímetros.',
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
