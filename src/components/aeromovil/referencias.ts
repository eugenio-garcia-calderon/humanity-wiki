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
    via: vias.length ? Math.max(...vias) : 0, plazas: r.plazas, masa: r.masa ?? null,
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
