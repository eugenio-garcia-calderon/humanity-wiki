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
// son una aproximación y la página lo dice. (2026-11-13: the built-in catalogue and the
// «Otros velomóviles» section were removed; the type stays for the editor's comparison view.)


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
