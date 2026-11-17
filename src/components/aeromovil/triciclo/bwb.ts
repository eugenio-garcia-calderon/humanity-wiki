// The blended-wing-body fairing of the Triciclo family («Carenado BWB (ala integrada)», 2026-11-17).
// Eugenio: «desarrolla la opción de hacer un carenado extra, que sea al estilo Blended Wing Body para que el Aeromóvil se
// parezca a un avión como el Airbus ZeroE … que se pueda configurar la altura, anchura, sección de esas alas y de la
// integración del carenado principal a las alas … y que a la mitad de cada ala exista la capacidad de que se pliegue».
//
// Pure (no three.js): the tunnel's worker loads the Triciclo model, and this is part of it. Off by default
// (`tBwb` absent or 'no'): every saved design is built exactly as before. Every field is optional and read with its
// default here (`BWB_DEFECTO`), so `triciclo/campos.ts` and `defecto.ts` are untouched (they were held by another bot).
//
// The geometry, along the wing's span d (m, from the body's skin outwards):
//   · the planform: the leading edge on a line swept `tBwbFlecha`; the chord from `tBwbCuerdaRaiz` at the end of the
//     blend to `tBwbCuerdaPunta` at the tip; inside the blend (`tBwbMezcla` long) the chord grows by up to
//     `tBwbMezclaCuerda` towards the body (70 % forward, 30 % back), with a smoothstep, so the edges meet the straight
//     wing with the same slope: the BWB's centre-body-to-wing transition in plan;
//   · the section: a NACA 4-digit thickness (closed trailing edge) on one of three camber lines, its thickness from
//     `tBwbEspesorRaiz` at the body to `tBwbEspesor` at the end of the blend; a concave fillet of radius `tBwbRadio`
//     thickens it next to the skin (the «smooth fillet»), scaled by the local thickness so the edges stay thin;
//   · the root ring lies on the skin itself (`F.ladoZ`), or on the centre plane where the body is too thin, so the
//     right and the left wing meet with no gap and no step;
//   · dihedral, washout, incidence; the tip square, rounded, a winglet or a sharklet (a winglet with a long bend);
//   · the fold: a hinge along x at `tBwbPliegue` of the exposed span (half way by default); the outer panel turns up
//     `tBwbPliegueAng` and the hinge's own station by half of it (a mitre), so the skin stays closed.
//
// Sources for the shapes and the numbers (read on 2026-11-17):
//   · Liebeck, «Design of the Blended Wing Body Subsonic Transport», J. Aircraft 41(1), 2004; and Liebeck et al., ICAS
//     2006 paper 807 (icas.org/ICAS_ARCHIVE/ICAS2006/PAPERS/807.PDF): about 17 % thickness for the centre body, reflexed
//     centre-body sections for pitch trim (LW102A), washout on the outer wing, winglet-fins.
//   · NASA X-48B (en.wikipedia.org/wiki/Boeing_X-48): 6,4 m span, 9,34 m², aspect ratio 4.
//   · Airbus MAVERIC (Aviation Week, «Airbus Reveals Refined ZEROe Blended Wing Body Concept», 2025): 2 m long, 3,2 m span;
//     the refined ZEROe BWB: longer, wider cabin, A350-like blended (sharklet) wing tips, twin fins.
//   · Raymer, «Aircraft Design: A Conceptual Approach»: wetted area ≈ 2·S·(1 + 0,2·t/c), form factor
//     1 + 0,6/(x/c)ₘ·(t/c) + 100·(t/c)⁴, Schlichting's turbulent flat plate; DATCOM lift slope (Helmbold).
import type { CamposTriciclo } from './campos';
import { punto, type FormaBala } from '../garaje/balaForma';
import { alturasPod, podDe, semiAncho } from '../garaje/balaMedidas';

export type PerfilBWB = 'simetrico' | 'reflejado' | 'curvo';
export type PuntaBWB = 'recta' | 'redondeada' | 'winglet' | 'sharklet';

/** The BWB fairing's fields (prefix `tBwb`). Optional everywhere: absent, `BWB_DEFECTO`. */
export interface CamposBWB {
  tBwb?: 'no' | 'si';            // el carenado BWB: sin alas (como hasta ahora) o con alas integradas
  tBwbEnv?: number;              // envergadura desplegada, de punta a punta (m)
  tBwbPos?: number;              // dónde empieza el ala junto a la carrocería: su borde de ataque, detrás de la punta del morro (m)
  tBwbAltura?: number;           // altura del ala en el costado: 0 en los bajos … 1 en lo más ancho de la carrocería
  tBwbCuerdaRaiz?: number;       // cuerda del ala donde acaba la integración (m)
  tBwbCuerdaPunta?: number;      // cuerda en la punta (m)
  tBwbFlecha?: number;           // flecha del borde de ataque (°)
  tBwbDiedro?: number;           // diedro (°): + las puntas más altas
  tBwbTorsion?: number;          // torsión de la raíz a la punta (°): − la punta con menos ángulo (washout)
  tBwbIncidencia?: number;       // ángulo del ala respecto al suelo (°): − empuja hacia abajo
  tBwbEspesor?: number;          // espesor del perfil del ala (% de la cuerda)
  tBwbEspesorRaiz?: number;      // espesor junto a la carrocería (% de la cuerda), el «cuerpo central» del BWB
  tBwbPerfil?: PerfilBWB;        // la familia del perfil
  tBwbMezcla?: number;           // largo de la integración con la carrocería, a lo largo del ala (m)
  tBwbMezclaCuerda?: number;     // cuánto más larga es la cuerda junto a la carrocería (m)
  tBwbRadio?: number;            // radio del filete de unión entre la carrocería y el ala (m)
  tBwbPunta?: PuntaBWB;          // la punta del ala
  tBwbWinglet?: number;          // alto del winglet o sharklet (m)
  tBwbWingletCant?: number;      // inclinación del winglet hacia fuera desde la vertical (°)
  tBwbPliegue?: number;          // dónde se pliega: fracción del ala desde la carrocería (0,5: a la mitad)
  tBwbPliegueAng?: number;       // ángulo de plegado (°): 0 plana … 120 doblada sobre sí misma
  tBwbPlegadas?: 'no' | 'si';    // ver las alas plegadas
}
export type ClaveNumBWB = { [K in keyof CamposBWB]-?: NonNullable<CamposBWB[K]> extends number ? K : never }[keyof CamposBWB];
export type ClaveTextoBWB = Exclude<keyof CamposBWB, ClaveNumBWB>;

/** The defaults: a modest wing, off. `tBwb: 'no'` keeps every saved design unchanged. */
export const BWB_DEFECTO: Required<CamposBWB> = {
  tBwb: 'no', tBwbEnv: 3.0, tBwbPos: 1.9, tBwbAltura: 0.45, tBwbCuerdaRaiz: 0.9, tBwbCuerdaPunta: 0.35, tBwbFlecha: 30, tBwbDiedro: 4,
  tBwbTorsion: -3, tBwbIncidencia: 0, tBwbEspesor: 12, tBwbEspesorRaiz: 17, tBwbPerfil: 'reflejado', tBwbMezcla: 0.45, tBwbMezclaCuerda: 0.8,
  tBwbRadio: 0.12, tBwbPunta: 'redondeada', tBwbWinglet: 0.35, tBwbWingletCant: 15, tBwbPliegue: 0.5, tBwbPliegueAng: 90, tBwbPlegadas: 'no',
};

/** One slider of the block: key, label, min, max, step, unit, a one-line help. */
export interface FilaBWB { k: ClaveNumBWB; n: string; min: number; max: number; paso: number; u: string; ayuda: string; grupo: 'Planta' | 'Sección' | 'Integración' | 'Punta' | 'Plegado' }
export const FILAS_BWB: FilaBWB[] = [
  { grupo: 'Planta', k: 'tBwbEnv', n: 'Envergadura (desplegada)', min: 1.2, max: 6, paso: 0.05, u: 'm', ayuda: 'De punta a punta de las alas, abiertas.' },
  { grupo: 'Planta', k: 'tBwbPos', n: 'Posición: detrás del morro', min: 0.3, max: 3.5, paso: 0.05, u: 'm', ayuda: 'Dónde empieza el ala junto a la carrocería (su borde de ataque), medido desde la punta del morro.' },
  { grupo: 'Planta', k: 'tBwbAltura', n: 'Altura en el costado', min: 0, max: 1, paso: 0.01, u: '', ayuda: '0: el ala sale de los bajos; 1: de lo más ancho de la carrocería.' },
  { grupo: 'Planta', k: 'tBwbCuerdaRaiz', n: 'Cuerda en la raíz', min: 0.3, max: 2.5, paso: 0.01, u: 'm', ayuda: 'Lo largo que es el ala (de delante a atrás) donde termina la integración.' },
  { grupo: 'Planta', k: 'tBwbCuerdaPunta', n: 'Cuerda en la punta', min: 0.08, max: 1.5, paso: 0.01, u: 'm', ayuda: 'Lo largo que es el ala en la punta. Raíz larga y punta corta: un ala en flecha como la del ZEROe.' },
  { grupo: 'Planta', k: 'tBwbFlecha', n: 'Flecha (borde de ataque)', min: 0, max: 60, paso: 1, u: '°', ayuda: 'Cuánto se echa el ala hacia atrás. El ZEROe y el X-48 llevan unos 30-40° en el ala exterior.' },
  { grupo: 'Planta', k: 'tBwbDiedro', n: 'Diedro', min: -10, max: 20, paso: 0.5, u: '°', ayuda: 'Las puntas más altas (+) o más bajas (−) que la raíz.' },
  { grupo: 'Sección', k: 'tBwbEspesor', n: 'Espesor del ala', min: 6, max: 24, paso: 0.5, u: '%', ayuda: 'Grosor del perfil en % de la cuerda. Alas de avión: 10-14 %.' },
  { grupo: 'Sección', k: 'tBwbEspesorRaiz', n: 'Espesor junto a la carrocería', min: 8, max: 30, paso: 0.5, u: '%', ayuda: 'El «cuerpo central» del BWB es más grueso: unos 15-18 % (Liebeck).' },
  { grupo: 'Sección', k: 'tBwbTorsion', n: 'Torsión (raíz → punta)', min: -8, max: 2, paso: 0.5, u: '°', ayuda: 'La punta con menos ángulo que la raíz (−): el «washout» de las alas volantes.' },
  { grupo: 'Sección', k: 'tBwbIncidencia', n: 'Incidencia', min: -6, max: 6, paso: 0.5, u: '°', ayuda: 'El ángulo del ala respecto al suelo. Negativo empuja el coche contra el suelo; positivo lo levanta.' },
  { grupo: 'Integración', k: 'tBwbMezcla', n: 'Largo de la integración', min: 0, max: 1.2, paso: 0.01, u: 'm', ayuda: 'Cuánto del ala, desde la carrocería, se funde con ella: ahí el ala es más larga y más gruesa.' },
  { grupo: 'Integración', k: 'tBwbMezclaCuerda', n: 'Cuerda extra junto a la carrocería', min: 0, max: 2.5, paso: 0.01, u: 'm', ayuda: 'Lo que crece la cuerda pegada a la carrocería (70 % hacia delante): el paso suave del cuerpo al ala.' },
  { grupo: 'Integración', k: 'tBwbRadio', n: 'Radio del filete', min: 0, max: 0.3, paso: 0.005, u: 'm', ayuda: 'El redondeo cóncavo en la unión: 0 es un ala clavada; más, una unión suave sin esquina.' },
  { grupo: 'Punta', k: 'tBwbWinglet', n: 'Alto del winglet', min: 0.05, max: 0.8, paso: 0.01, u: 'm', ayuda: 'Solo con winglet o sharklet.' },
  { grupo: 'Punta', k: 'tBwbWingletCant', n: 'Winglet: inclinación hacia fuera', min: 0, max: 60, paso: 1, u: '°', ayuda: '0: vertical.' },
  { grupo: 'Plegado', k: 'tBwbPliegue', n: 'Línea de plegado', min: 0.3, max: 0.8, paso: 0.01, u: '', ayuda: 'Dónde se dobla cada ala, en fracción del ala desde la carrocería: 0,5 a la mitad.' },
  { grupo: 'Plegado', k: 'tBwbPliegueAng', n: 'Ángulo de plegado', min: 0, max: 120, paso: 1, u: '°', ayuda: 'Cuánto sube la parte exterior: 90° vertical, 120° doblada hacia dentro.' },
];
export const SELECTORES_BWB: { k: ClaveTextoBWB; n: string; opciones: { k: string; n: string }[] }[] = [
  { k: 'tBwbPerfil', n: 'Perfil', opciones: [{ k: 'reflejado', n: 'Reflejado (ala volante)' }, { k: 'simetrico', n: 'Simétrico' }, { k: 'curvo', n: 'Curvo (NACA 4412)' }] },
  { k: 'tBwbPunta', n: 'Punta del ala', opciones: [{ k: 'redondeada', n: 'Redondeada' }, { k: 'recta', n: 'Recta' }, { k: 'winglet', n: 'Winglet' }, { k: 'sharklet', n: 'Sharklet (curva larga)' }] },
];
export const RANGO_BWB = Object.fromEntries(FILAS_BWB.map(f => [f.k, [f.min, f.max]])) as Record<ClaveNumBWB, [number, number]>;

type ConBWB = Partial<CamposTriciclo> & CamposBWB;
/** A BWB field, its default when absent, clamped to its range. */
export function valorBWB<K extends ClaveNumBWB>(k: K, T: ConBWB): number {
  const v = T[k], [lo, hi] = RANGO_BWB[k];
  const n = typeof v === 'number' && Number.isFinite(v) ? v : BWB_DEFECTO[k];
  return Math.min(hi, Math.max(lo, n));
}
export const textoBWB = <K extends ClaveTextoBWB>(k: K, T: ConBWB): NonNullable<CamposBWB[K]> => (T[k] ?? BWB_DEFECTO[k]) as NonNullable<CamposBWB[K]>;
export const conBWB = (T: ConBWB) => T.tBwb === 'si';

// ---------------------------------------------------------------- the section
/** Chordwise stations (x/c), cosine spacing: dense at both edges. */
const NC = 22;
const XC = Array.from({ length: NC + 1 }, (_, i) => (1 - Math.cos(Math.PI * i / NC)) / 2);
/** NACA 4-digit half-thickness for t/c = 1, closed trailing edge. */
const yt1 = (x: number) => 5 * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
const YT_MAX = Math.max(...XC.map(yt1));
/** The camber line (fraction of chord). */
function camber(p: PerfilBWB, x: number): number {
  if (p === 'curvo') { const m = 0.04, q = 0.4; return x < q ? m / (q * q) * (2 * q * x - x * x) : m / ((1 - q) ** 2) * (1 - 2 * q + 2 * q * x - x * x); }
  // a reflexed line: about 1,7 % at a fifth of the chord, −0,5 % near the trailing edge (the flying wings' and the BWB centre body's)
  if (p === 'reflejado') return 0.15 * x * (1 - x) * (1 - 1.5 * x);
  return 0;
}
/** The zero-lift angle of each family (°): NACA 4412 about −4°, a reflexed section about −1°. Abbott & von Doenhoff. */
const ALFA0: Record<PerfilBWB, number> = { simetrico: 0, reflejado: -1, curvo: -4 };
/** The section ring, trailing edge → upper surface → leading edge → lower surface (the trailing edge once): [x/c, y/c, shape]. */
const ANILLO: [number, number, number][] = (() => {
  const o: [number, number, number][] = [];
  for (let i = NC; i >= 0; i--) o.push([XC[i], 1, yt1(XC[i]) / YT_MAX]);
  for (let i = 1; i < NC; i++) o.push([XC[i], -1, yt1(XC[i]) / YT_MAX]);
  return o;
})();
export const PUNTOS_ANILLO = ANILLO.length;

const smooth = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v * v * (3 - 2 * v); };
const RAD = Math.PI / 180;

/** A spanwise station: where its spine is (z, y), which way its thickness points (angle of the spine), the planform there. */
interface Estacion { d: number; z: number; y: number; ang: number; le: number; c: number; tc: number; giro: number; filete: number; plegar: number }

export interface CarenadoBWB {
  /** Right wing's vertices, unfolded and as shown (folded when `plegadas`), [x, y, z] each; `n` stations of `PUNTOS_ANILLO` points. */
  abierta: Float32Array; vista: Float32Array; plegada: Float32Array;
  estaciones: number; puntosAnillo: number;
  /** Which station the fold is at, and the hinge (x span, y, z). */
  bisagra: { estacion: number; x0: number; x1: number; y: number; z: number };
  plegadas: boolean; anguloPliegue: number;
  /** Span tip to tip (m): unfolded, folded at the slider's angle, and as shown. */
  envergadura: number; envergaduraPlegada: number; envergaduraVista: number;
  /** The exposed planform (both wings, m²), wetted area (m², both, outside the body), frontal area added to the body's (m²). */
  areaPlanta: number; areaMojada: number; areaFrontal: number; areaWinglets: number;
  /** Mean chord (m), aspect ratio of the exposed wing, the mid-chord sweep (°), the outer thickness (fraction). */
  cuerdaMedia: number; alargamiento: number; flechaMedia: number; tc: number; tcRaiz: number;
  perfil: PerfilBWB; incidencia: number; torsion: number; punta: PuntaBWB;
  /** Where the wing's mass is (m: x, y) — the area centroid of the wetted skin. */
  centro: [number, number];
  /** Root at the body: leading edge x, trailing edge x, height y, half-width of the body there z. */
  raiz: { le: number; te: number; y: number; z: number };
  /** The smallest vertical gap to the lateral wheels' pods (m; < 0 the wing goes through a pod), or null when no wing point is over a pod. */
  holguraPods: number | null;
}

/**
 * The BWB fairing of a Triciclo with this shape, or null when it is off.
 * `ruedas`: the lateral wheels' axle x and track (m), to check the wing against their pods.
 */
export function carenadoBWB(T: ConBWB, F: FormaBala, ruedas: { xLat: number; via: number }): CarenadoBWB | null {
  if (!conBWB(T)) return null;
  const V = (k: ClaveNumBWB) => valorBWB(k, T);
  const perfil = textoBWB('tBwbPerfil', T), punta = textoBWB('tBwbPunta', T), plegadas = T.tBwbPlegadas === 'si';
  const tanL = Math.tan(V('tBwbFlecha') * RAD), gam = V('tBwbDiedro') * RAD;
  const cR = V('tBwbCuerdaRaiz'), cT = V('tBwbCuerdaPunta'), ext = V('tBwbMezclaCuerda');
  const tc = V('tBwbEspesor') / 100, tcR = V('tBwbEspesorRaiz') / 100, R = V('tBwbRadio');
  const xMorro = F.X_MORRO, xCola = F.X_COLA;
  // the root's leading edge at the body, never ahead of the nose nor behind the tail's last 20 cm
  const le0 = Math.min(xMorro - 0.05, Math.max(xCola + 0.2, xMorro - V('tBwbPos')));
  // the body at the root: its section at mid root chord, its belly and its widest point
  const cB = cR + ext, xMid = Math.max(xCola + 0.02, le0 - cB * 0.4);
  const xs = Math.max(xCola + 1e-3, Math.min(xMorro - 1e-3, xMid));
  let yLo = Infinity, yW = 0, hw = 0;
  for (let k = 0; k <= 80; k++) {
    const [z, y] = punto(F.sec(xs), k / 80);
    if (y < yLo) yLo = y; if (z > hw) { hw = z; yW = y; }
  }
  const yR = yLo + (yW - yLo) * V('tBwbAltura') + 0.02;
  const zS0 = F.ladoZ(xs, yR), zS = Number.isFinite(zS0) ? zS0 : hw * 0.5;
  // the exposed semi-span: from the skin to the tip (a winglet's bend is inside it); at least 10 cm
  const semi = Math.max(0.1, V('tBwbEnv') / 2 - zS);
  const dm = Math.min(V('tBwbMezcla'), semi * 0.7);
  const LEk = le0 - dm * tanL - 0.7 * ext;
  const leLinea = (d: number) => LEk - (d - dm) * tanL;
  const cLin = (d: number) => (d <= dm ? cR : cR + (cT - cR) * Math.min(1, (d - dm) / Math.max(1e-6, semi - dm)));
  const gU = (d: number) => (dm > 1e-6 && d < dm ? smooth(1 - d / dm) : 0);
  // the winglet's bend and height
  const conWinglet = punta === 'winglet' || punta === 'sharklet';
  const rBend = punta === 'sharklet' ? Math.min(0.35, semi * 0.25) : 0.05;
  const hW = conWinglet ? V('tBwbWinglet') : 0, psi = (90 - V('tBwbWingletCant')) * RAD;
  // the straight part of the wing ends where the bend must start for the tip (the bend's outer z) to land at `semi`
  const dzBend = conWinglet ? rBend * (Math.sin(psi) - Math.sin(gam)) + hW * Math.cos(psi) : 0;
  const dRecto = Math.max(dm + 0.05, (semi - Math.max(0, dzBend)) / Math.max(0.2, Math.cos(gam)));
  // fold: a fraction of the exposed span along the straight part
  const dF = +Math.min(dRecto - 0.02, Math.max(0.05, V('tBwbPliegue') * semi / Math.max(0.2, Math.cos(gam)))).toFixed(5);

  // stations along the straight wing: dense at the root (fillet, blend), one exactly at the fold
  const ds = new Set<number>();
  const nRaiz = 10, nRecto = 22;
  for (let i = 0; i <= nRaiz; i++) ds.add(+(Math.max(dm, R, 0.05) * (1 - Math.cos(Math.PI / 2 * i / nRaiz))).toFixed(5));
  for (let i = 0; i <= nRecto; i++) ds.add(+(dRecto * i / nRecto).toFixed(5));
  ds.add(dF);
  const lista = [...ds].filter(d => d <= dRecto + 1e-9).sort((a, b) => a - b);
  // a rounded tip: the last 12 % closes in an ellipse
  const dRed = punta === 'redondeada' ? dRecto * 0.88 : Infinity;
  if (punta === 'redondeada') for (let i = 1; i <= 6; i++) lista.push(dRed + (dRecto - dRed) * (1 - Math.cos(Math.PI / 2 * i / 6)));
  const est: Estacion[] = [];
  const giroDe = (d: number) => V('tBwbIncidencia') + V('tBwbTorsion') * Math.min(1, d / Math.max(1e-6, semi));
  const filete = (d: number) => (R > 0 && d < R ? R - Math.sqrt(Math.max(0, R * R - (R - d) ** 2)) : 0);
  for (const d of [...new Set(lista)].sort((a, b) => a - b)) {
    if (d > dRecto + 1e-9) continue;
    let c = cLin(d) + ext * gU(d), le = leLinea(d) + 0.7 * ext * gU(d);
    if (d > dRed) { const u = (d - dRed) / (dRecto - dRed), k = Math.max(0.12, Math.sqrt(Math.max(0, 1 - u * u))); const c0 = c; c *= k; le -= (c0 - c) * 0.35; }
    const tcd = tc + (tcR - tc) * gU(d);
    est.push({ d, z: zS + d * Math.cos(gam), y: yR + d * Math.sin(gam), ang: gam, le, c, tc: tcd, giro: giroDe(d), filete: filete(d), plegar: d > dF + 1e-6 ? 1 : Math.abs(d - dF) < 1e-6 ? 0.5 : 0 });
  }
  // the winglet: an arc from the dihedral up to the cant, then straight
  if (conWinglet) {
    const p0 = est[est.length - 1], nArc = punta === 'sharklet' ? 10 : 5, nUp = 6;
    const lw = Math.tan((V('tBwbFlecha') + (punta === 'sharklet' ? 15 : 8)) * RAD), cFin = cT * (punta === 'sharklet' ? 0.35 : 0.55);
    let s = 0; const sTot = rBend * Math.max(0, psi - gam) + hW;
    for (let i = 1; i <= nArc + nUp; i++) {
      let z: number, y: number, a: number;
      if (i <= nArc) { a = gam + (psi - gam) * i / nArc; z = p0.z + rBend * (Math.sin(a) - Math.sin(gam)); y = p0.y + rBend * (Math.cos(gam) - Math.cos(a)); s = rBend * (a - gam); }
      else { a = psi; const t = hW * (i - nArc) / nUp; z = p0.z + rBend * (Math.sin(psi) - Math.sin(gam)) + t * Math.cos(psi); y = p0.y + rBend * (Math.cos(gam) - Math.cos(psi)) + t * Math.sin(psi); s = rBend * (psi - gam) + t; }
      const u = s / Math.max(1e-6, sTot), c = p0.c + (cFin - p0.c) * smooth(u);
      // the leading edge sweeps back along the winglet; the trailing edges stay in line at the start of the bend
      const le = p0.le - s * lw - (p0.c - c) * 0.15 * (1 - u);
      est.push({ d: p0.d + s, z, y, ang: a, le, c, tc: Math.max(0.08, tc * 0.9), giro: p0.giro, filete: 0, plegar: 1 });
    }
  }
  const nE = est.length, nA = ANILLO.length;
  const iF = est.findIndex(e => Math.abs(e.d - dF) < 1e-6);
  const hinge = est[iF];
  const ang = V('tBwbPliegueAng') * RAD;

  // the body's skin at the root ring: every point of station 0 sits on the skin (or on the centre plane)
  const construir = (alfa: number): Float32Array => {
    const o = new Float32Array(nE * nA * 3);
    for (let i = 0; i < nE; i++) {
      const e = est[i], g = e.giro * RAD, cg = Math.cos(g), sg = Math.sin(g), nz = -Math.sin(e.ang), ny = Math.cos(e.ang);
      // how much of the root ring's skin offset is still felt at this station (the first 15 cm or half the blend)
      const dec = 1 - smooth(e.d / Math.max(0.15, dm * 0.5));
      const rot = alfa * e.plegar, cr = Math.cos(rot), sr = Math.sin(rot);
      for (let j = 0; j < nA; j++) {
        const [xc, lado, forma] = ANILLO[j];
        // the section: camber ± thickness, plus the fillet next to the skin (scaled by the thickness' shape)
        const h = (camber(perfil, xc) + lado * e.tc * forma * YT_MAX) * e.c + lado * e.filete * forma;
        // rotate by incidence + twist about the quarter chord (nose up +)
        // nose up +: the trailing edge goes down (s: distance aft of the quarter chord)
        const sa = (xc - 0.25) * e.c, x = e.le - 0.25 * e.c - sa * cg - h * sg, hh = -sa * sg + h * cg;
        let z = e.z + nz * hh, y = e.y + ny * hh;
        if (dec > 0) {
          const zp = F.ladoZ(x, y);
          const zSkin = Number.isFinite(zp) && zp > 0.005 ? zp - 0.004 : 0;
          z = i === 0 ? zSkin : z + (zSkin - e.z) * dec;
        }
        if (rot !== 0) { const dz = z - hinge.z, dy = y - hinge.y; z = hinge.z + dz * cr - dy * sr; y = hinge.y + dz * sr + dy * cr; }
        const k = (i * nA + j) * 3; o[k] = x; o[k + 1] = y; o[k + 2] = z;
      }
    }
    return o;
  };
  const abierta = construir(0), plegada = construir(ang), vista = plegadas ? plegada : abierta;
  const maxZ = (a: Float32Array) => { let m = 0; for (let k = 2; k < a.length; k += 3) m = Math.max(m, a[k]); return m; };
  const r3 = (v: number) => Math.round(v * 1000) / 1000;

  // areas: planform (straight wing, exposed, both), wetted (triangles outside the body), frontal (a 1 cm raster)
  let areaPlanta = 0, areaWinglets = 0;
  for (let i = 1; i < nE; i++) {
    const a = est[i - 1], b = est[i], dz = b.z - a.z, dy = b.y - a.y, cm = (a.c + b.c) / 2;
    if (Math.abs(b.ang) < 30 * RAD) areaPlanta += cm * Math.abs(dz); else areaWinglets += cm * Math.hypot(dz, dy);
  }
  areaPlanta *= 2; areaWinglets *= 2;
  let mojada = 0, cx = 0, cy = 0;
  const P = (i: number, j: number) => { const k = (i * nA + (j % nA)) * 3; return [abierta[k], abierta[k + 1], abierta[k + 2]] as const; };
  const tri = (a: readonly number[], b: readonly number[], c: readonly number[]) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    return 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
  };
  const celdas = new Set<number>(), CEL = 0.01;
  const marcar = (a: readonly number[], b: readonly number[], c: readonly number[]) => {
    // project onto the (z, y) plane and mark the 1 cm cells whose centre falls inside
    const z0 = Math.min(a[2], b[2], c[2]), z1 = Math.max(a[2], b[2], c[2]), y0 = Math.min(a[1], b[1], c[1]), y1 = Math.max(a[1], b[1], c[1]);
    const det = (b[2] - a[2]) * (c[1] - a[1]) - (c[2] - a[2]) * (b[1] - a[1]);
    if (Math.abs(det) < 1e-12) return;
    for (let iz = Math.floor(z0 / CEL); iz <= Math.floor(z1 / CEL); iz++) for (let iy = Math.floor(y0 / CEL); iy <= Math.floor(y1 / CEL); iy++) {
      const pz = (iz + 0.5) * CEL, py = (iy + 0.5) * CEL;
      const l1 = ((b[2] - pz) * (c[1] - py) - (c[2] - pz) * (b[1] - py)) / det, l2 = ((c[2] - pz) * (a[1] - py) - (a[2] - pz) * (c[1] - py)) / det;
      if (l1 >= 0 && l2 >= 0 && l1 + l2 <= 1) celdas.add(iz * 100000 + iy);
    }
  };
  for (let i = 1; i < nE; i++) for (let j = 0; j < nA; j++) {
    const a = P(i - 1, j), b = P(i, j), c = P(i, j + 1), d = P(i - 1, j + 1);
    for (const [p, q, r] of [[a, b, c], [a, c, d]] as const) {
      const mx = (p[0] + q[0] + r[0]) / 3, my = (p[1] + q[1] + r[1]) / 3, mz = (p[2] + q[2] + r[2]) / 3;
      if (F.dentroPiel(mx, my, mz)) continue;
      const A = tri(p, q, r); mojada += A; cx += A * mx; cy += A * my;
      marcar(p, q, r);
    }
  }
  // the body's own frontal silhouette at its largest section: the cells inside it add nothing
  const may = F.seccionMayor();
  let frontal = 0;
  for (const key of celdas) {
    const iz = Math.floor(key / 100000), iy = key - iz * 100000, pz = (iz + 0.5) * CEL, py = (iy + 0.5) * CEL;
    const zb = F.ladoZ(may.x, py);
    if (!(Number.isFinite(zb) && pz < zb)) frontal += CEL * CEL;
  }
  // the pods: the smallest vertical gap from a wing point over a pod to the pod's top (or its bottom, from below)
  let holguraPods: number | null = null;
  if (F.D.pod) {
    const pod = podDe(F), sa = semiAncho(pod);
    for (let k = 0; k < vista.length; k += 3) {
      const x = vista[k], y = vista[k + 1], z = vista[k + 2], xr = x - ruedas.xLat, h = alturasPod(pod, xr);
      if (!h) continue;
      const wMax = Math.max(...[h[0] + 0.01, (h[0] + h[1]) / 2, h[1] - 0.01].map(yy => sa(xr, yy)));
      if (Math.abs(z - ruedas.via / 2) > wMax + 0.03) continue;
      const g = y > (h[0] + h[1]) / 2 ? y - h[1] : h[0] - y;
      // inside the pod's band: how far into it (negative) or above/below it
      const gap = y > h[0] && y < h[1] ? -Math.min(y - h[0], h[1] - y) : g;
      holguraPods = holguraPods == null ? gap : Math.min(holguraPods, gap);
    }
  }
  const sExp = areaPlanta / 2, cuerdaMedia = sExp / Math.max(1e-6, dRecto * Math.cos(gam));
  const b = 2 * maxZ(abierta);
  const leT = est[est.length - 1];
  const flechaMedia = Math.atan(((est[0].le - est[0].c / 2) - (leT.le - leT.c / 2)) / Math.max(1e-6, leT.z - est[0].z)) / RAD;
  return {
    abierta, plegada, vista, estaciones: nE, puntosAnillo: nA,
    bisagra: { estacion: iF, x0: hinge.le + 0.02, x1: hinge.le - hinge.c - 0.02, y: hinge.y, z: hinge.z },
    plegadas, anguloPliegue: V('tBwbPliegueAng'),
    envergadura: r3(b), envergaduraPlegada: r3(2 * maxZ(plegada)), envergaduraVista: r3(2 * maxZ(vista)),
    areaPlanta, areaMojada: 2 * mojada, areaFrontal: 2 * frontal, areaWinglets,
    cuerdaMedia, alargamiento: (b * b) / Math.max(1e-6, areaPlanta), flechaMedia, tc, tcRaiz: tcR, perfil, incidencia: V('tBwbIncidencia'), torsion: V('tBwbTorsion'), punta,
    centro: mojada > 0 ? [cx / mojada, cy / mojada] : [le0 - cB / 2, yR],
    raiz: { le: est[0].le, te: est[0].le - est[0].c, y: yR, z: zS },
    holguraPods,
  };
}

// ---------------------------------------------------------------- what it does at speed (literature estimates)
export interface AeroBWB {
  v: number; q: number; Re: number; Cf: number; FF: number; Q: number;
  /** ΔCd·A (m²): skin friction and form of the exposed wings, induced by their lift, total. */
  dCdAfriccion: number; dCdAinducida: number; dCdA: number;
  /** Lift coefficient on the exposed planform, lift (N, + up) and as kg, and as a share of the car's weight. */
  CL: number; sustentacion: number; kg: number; fraccionPeso: number;
  /** The power the wings cost at that speed (W). */
  potencia: number;
}
/**
 * The wings at `kmh`, by the textbook (never the tunnel, which does not see lift: its constants are not touched).
 * Friction: Schlichting's turbulent flat plate at the mean chord's Reynolds number, Raymer's form factor with the maximum
 * thickness at 30 % chord, interference 1,0 with a fillet of 5 cm or more and 1,1 without. Lift: DATCOM's (Helmbold) lift
 * slope for the exposed wing's aspect ratio and mid-chord sweep, from the family's zero-lift angle, the incidence and 40 %
 * of the washout; induced drag CL²·S/(π·AR·e), e = 0,8. Ground effect (it raises the lift near the road) is not modelled.
 */
export function aeroBWB(w: CarenadoBWB, kmh: number, masaKg: number, radio: number): AeroBWB {
  const v = kmh / 3.6, rho = 1.2, nu = 1.5e-5, q = 0.5 * rho * v * v;
  const Re = Math.max(1e5, v * w.cuerdaMedia / nu), Cf = 0.455 / Math.pow(Math.log10(Re), 2.58);
  const FF = 1 + 0.6 / 0.3 * w.tc + 100 * w.tc ** 4, Q = radio >= 0.05 ? 1.0 : 1.1;
  const dCdAfriccion = Cf * FF * Q * w.areaMojada;
  const A = Math.max(0.5, w.alargamiento), lc2 = Math.tan(w.flechaMedia * RAD);
  const a = 2 * Math.PI * A / (2 + Math.sqrt(A * A / (0.95 * 0.95) * (1 + lc2 * lc2) + 4));
  const alfa = (w.incidencia - ALFA0[w.perfil] + 0.4 * w.torsion) * RAD;
  const CL = a * alfa, S = w.areaPlanta;
  const L = q * S * CL, dCdAinducida = CL * CL * S / (Math.PI * A * 0.8);
  const dCdA = dCdAfriccion + dCdAinducida;
  return { v, q, Re, Cf, FF, Q, dCdAfriccion, dCdAinducida, dCdA, CL, sustentacion: L, kg: L / 9.81, fraccionPeso: L / (9.81 * Math.max(1, masaKg)), potencia: q * dCdA * v };
}

// ---------------------------------------------------------------- masses (estimates of parts of their class)
export interface PiezaBWB { nombre: string; kg: number; x: number; y: number; nota: string }
/**
 * The wings' parts: the skin is the body's own laminate (`kgm2`: material × thickness) over the wetted area; inside,
 * spars, ribs and foam at 1,2 kg per m² of planform (an estimate for a fairing that carries no flight loads, only its
 * own weight, gusts and a hand leaning on it: a light glider wing, built for flight, weighs 4-6 kg/m²); and the fold:
 * per wing a piano hinge with its lock (1,0 kg) and an electric linear actuator (1,4 kg).
 */
export function piezasBWB(w: CarenadoBWB, kgm2: number): PiezaBWB[] {
  const [x, y] = w.centro, xb = (w.bisagra.x0 + w.bisagra.x1) / 2;
  const f2 = (v: number) => v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return [
    { nombre: 'Carenado BWB: piel de las alas y la unión', kg: w.areaMojada * kgm2, x, y, nota: `${f2(w.areaMojada)} m² de laminado a ${f2(kgm2)} kg/m²` },
    { nombre: 'Carenado BWB: largueros, costillas y espuma', kg: (w.areaPlanta + w.areaWinglets) * 1.2, x, y, nota: `${f2(w.areaPlanta + w.areaWinglets)} m² de ala a 1,2 kg/m² (estimación)` },
    { nombre: 'Carenado BWB: bisagras y actuadores del plegado', kg: 2 * (1.0 + 1.4), x: xb, y: w.bisagra.y, nota: 'por ala: bisagra de piano con cierre (1,0 kg) y actuador lineal eléctrico (1,4 kg), estimación' },
  ];
}
