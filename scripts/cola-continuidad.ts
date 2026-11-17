/**
 * The cabin → tail joint must be one continuous, smooth skin (2026-11-16). An independent evaluator: it reads only the
 * BUILT shape, never the fix's intent. Run with:
 *   npx tsx scripts/cola-continuidad.ts [--aleatorios 160] [--semilla 7] [--json fallos.json] [--peores 12] [--solo <texto>]
 *
 * Eugenio, on his «Modelo 1» (round canopy, wide flat tail, solar tail): «haz que esto no pueda ocurrir, este salto que
 * hay entre la cola y la cabina… que la cola sea mucho más flexible a la hora de hacerse súper ancha y súper grande o
 * súper pequeña… genera un bot que evalúe esta capacidad».
 *
 * Every number comes from `m.F.sec(x)` / `punto(sec, t)` of `crearModelo(P)`: the same sections the 3D skin (balaModelo.ts
 * `rejilla`), the canopy glass and the tail's solar panel are built from. No browser.
 *
 * Where: from 40 cm ahead of the canopy glass's rear end (or the roof's crest, up to 80 cm ahead) back to 6 cm from the
 * tail's tip (the tip itself closes onto an edge or a point: its own rounding is not a joint; the sections are still
 * checked on to 1 cm from it). Every 1 mm.
 *
 * What (FALLA if over the limit; every limit is per joint, over the whole stretch):
 *   - salto (mm): a jump in the skin between two consecutive stations. At each 1 mm step, for 81 points round the
 *     half-section, the step's change minus the mean of its two neighbouring steps' (a smooth surface gives ~0, a jump
 *     gives its size); any step over 0.3 mm is re-measured at 0.02 mm. Limit 2 mm.
 *   - área / perímetro: the same on the section's area (cm²) and perimeter (mm). Limit: 2 % of the section's area, and
 *     4 mm of perimeter (a 2 mm jump all round would be about that much).
 *   - pliegue arriba (°): the top centre line in side view: the angle between the 5 mm chord ahead of a point and the 5 mm
 *     chord behind it. A smooth bend of radius R turns 0.57°·(1 cm / R); a crease turns all of its angle there. Limit 8°.
 *   - pliegue hombros (°): the same across x on the skin's normal, at the shoulders (t 0.47, 0.60, 0.76, 0.89) and at the
 *     widest point (t 0.34): the angle between the normal 5 mm ahead and 5 mm behind. Limit 8°.
 *   - sección mala: a half-section crossing the centre line (z < −0.5 mm), crossing itself, or with no area.
 *   - panel: the tail's solar panel (if any) with its lower edge t outside [0, 1], or running beyond the body, or its
 *     starting ahead of the glass's end (overlapping it), or more than 1 cm of bare body between the canopy frame's rear
 *     end and the panel's front. The glass-to-panel distance (the navy frame between them) is printed.
 * And as AVISO (printed, not counted): arista (°), an edge line running along the body: the turn of the half-section over
 * 1 cm of its own length (two 5 mm chords) beyond 35°, ahead of the second half of the tail cap (where a flat tail's
 * thin trailing edge legitimately sharpens). A round section of 5 cm radius turns 11° there.
 *
 * Cases: the plain Triciclo, Eugenio's «Rombo Bala» (scratchpad JSON, or the copy below), a «Modelo 1-like» case (Rombo
 * Bala with a round canopy, flat tail at 100 % and full width, solar tail), a grid of extremes (every tail, roof and
 * canopy slider at both ends, with each deck type × wheel layout), and N random designs (fixed seed) over every
 * shape slider and option. Prints the worst cases, the totals and a last line «COLA OK» or «COLA FALLA n casos».
 * Exit code 1 on any FALLA.
 */
import * as fs from 'fs';
import { crearModelo, PARAMETROS_TRICICLO, type Parametros } from '../src/components/aeromovil/geometria';
import { deDiseno } from '../src/components/aeromovil/Disenos';
import { camposTriciclo, limitarTriciclo, rangoTriciclo, type ClaveNumTriciclo, type ModeloTriciclo } from '../src/components/aeromovil/geometriaTriciclo';
import { punto, type FormaBala, type Sec } from '../src/components/aeromovil/garaje/balaForma';

// ───────────────────────────────────────────────────────────────── arguments
const arg = (k: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
const N_ALEA = Number(arg('--aleatorios') ?? 160), SEMILLA = Number(arg('--semilla') ?? 7), N_PEORES = Number(arg('--peores') ?? 12);
const JSON_OUT = arg('--json'), SOLO = arg('--solo'), VISUAL = arg('--visual');

const LIM = { salto: 2, area: 2, perim: 4, pliegueArriba: 8, pliegueHombros: 8, panelDesnudo: 10, arista: 35 };
const TT = Array.from({ length: 81 }, (_, i) => i / 80);
const T_HOMBROS = [0.34, 0.47, 0.60, 0.76, 0.89];
const PASO = 0.001, W = 0.005;
/** Left out at the tail's tip (m): the trailing edge's own rounding (a flat tail closes onto a thin, wide edge with
 *  tight rounded corners there, which is its design, not a joint). Sections are still checked to 1 cm from the tip. */
const FIN_PUNTA = 0.06;

// ───────────────────────────────────────────────────────────────── measures
type V3 = [number, number, number];
interface Medida {
  salto: number; xSalto: number; area: number; xArea: number; perim: number; xPerim: number;
  pliegueArriba: number; xArriba: number; pliegueHombros: number; xHombros: number; tHombros: number;
  seccionMala: number; xMala: string; panel: string[]; panelHueco: number; arista: number; xArista: number;
  tramo: [number, number]; xFinVidrio: number;
}
const seccion = (F: FormaBala, x: number) => F.sec(x);
function puntos(s: Sec, ts = TT): [number, number][] { return ts.map(t => punto(s, t)); }
function areaPerim(c: [number, number][]): [number, number] {
  let A = 0, L = 0;
  for (let i = 1; i < c.length; i++) { A += (c[i - 1][0] + c[i][0]) / 2 * (c[i][1] - c[i - 1][1]); L += Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]); }
  return [2 * Math.abs(A), 2 * L];
}
/** The 4-point jump between stations 1 and 2 of four equally spaced ones (vectors per t). */
function saltoDe(a: [number, number][], b: [number, number][], c: [number, number][], d: [number, number][]): number {
  let m = 0;
  for (let k = 0; k < a.length; k++) {
    const jz = (c[k][0] - b[k][0]) - ((b[k][0] - a[k][0]) + (d[k][0] - c[k][0])) / 2, jy = (c[k][1] - b[k][1]) - ((b[k][1] - a[k][1]) + (d[k][1] - c[k][1])) / 2;
    m = Math.max(m, Math.hypot(jz, jy));
  }
  return m;
}
const salto1 = (a: number, b: number, c: number, d: number) => Math.abs((c - b) - ((b - a) + (d - c)) / 2);
const ang = (u: V3, v: V3) => { const d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2], n = Math.hypot(...u) * Math.hypot(...v); return n > 1e-15 ? Math.acos(Math.max(-1, Math.min(1, d / n))) * 180 / Math.PI : 0; };
/** Outward normal of the skin at (x, t), right side. */
function normal(F: FormaBala, x: number, t: number): V3 {
  const e = 0.0005, s = F.sec(x), pa = punto(F.sec(x + e), t), pb = punto(F.sec(x - e), t);
  const q1 = punto(s, Math.min(1, t + 0.002)), q0 = punto(s, Math.max(0, t - 0.002));
  const X: V3 = [2 * e, pa[1] - pb[1], pa[0] - pb[0]], T: V3 = [0, q1[1] - q0[1], q1[0] - q0[0]];
  return [X[1] * T[2] - X[2] * T[1], X[2] * T[0] - X[0] * T[2], X[0] * T[1] - X[1] * T[0]];
}
/** Does a polyline cross itself (non-adjacent segments)? */
function seCruza(c: [number, number][]): boolean {
  const n = c.length, cr = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  for (let i = 0; i + 1 < n; i++) for (let j = i + 2; j + 1 < n; j++) {
    const a = c[i], b = c[i + 1], p = c[j], q = c[j + 1];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-9 || Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-9) continue;
    const d1 = cr(a, b, p), d2 = cr(a, b, q), d3 = cr(p, q, a), d4 = cr(p, q, b);
    if (((d1 > 1e-12 && d2 < -1e-12) || (d1 < -1e-12 && d2 > 1e-12)) && ((d3 > 1e-12 && d4 < -1e-12) || (d3 < -1e-12 && d4 > 1e-12))) return true;
  }
  return false;
}
/** The turn (°) of a half-section over 1 cm of its own length, worst along it (edge lines). */
function aristaDe(s: Sec): number {
  const c = puntos(s, Array.from({ length: 401 }, (_, i) => i / 400)), L = [0];
  for (let i = 1; i < c.length; i++) L.push(L[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
  const en = (l: number): [number, number] => { let i = 1; while (i < L.length - 1 && L[i] < l) i++; const u = (l - L[i - 1]) / Math.max(1e-12, L[i] - L[i - 1]); return [c[i - 1][0] + (c[i][0] - c[i - 1][0]) * u, c[i - 1][1] + (c[i][1] - c[i - 1][1]) * u]; };
  let m = 0;
  for (let l = W; l <= L[L.length - 1] - W; l += 0.002) {
    const a = en(l - W), b = en(l), d = en(l + W);
    m = Math.max(m, ang([b[0] - a[0], b[1] - a[1], 0], [d[0] - b[0], d[1] - b[1], 0]));
  }
  return m;
}

function medir(m: ModeloTriciclo): Medida {
  const F = m.F, cup = m.cup;
  // the roof's crest (last point within 2 mm of the highest, going back)
  const techo = (x: number) => punto(F.sec(x), 1)[1];
  let ymax = -Infinity; for (let x = F.XN0; x > F.XT0; x -= 0.005) ymax = Math.max(ymax, techo(x));
  let cresta = F.XN0; for (let x = F.XN0; x > F.XT0; x -= 0.005) if (techo(x) >= ymax - 0.002) cresta = x;
  const x0 = Math.min(F.XN0 - 0.02, Math.max(cup.XC1 + 0.40, Math.min(cresta, cup.XC1 + 0.8))), x1 = F.X_COLA + FIN_PUNTA;
  const n = Math.floor((x0 - x1) / PASO);
  const xs = Array.from({ length: n + 1 }, (_, i) => x0 - i * PASO);
  const S = xs.map(x => seccion(F, x)), C = S.map(s => puntos(s)), AP = C.map(areaPerim);
  const M: Medida = { salto: 0, xSalto: NaN, area: 0, xArea: NaN, perim: 0, xPerim: NaN, pliegueArriba: 0, xArriba: NaN, pliegueHombros: 0, xHombros: NaN, tHombros: NaN, seccionMala: 0, xMala: '', panel: [], panelHueco: 0, arista: 0, xArista: NaN, tramo: [x0, x1], xFinVidrio: cup.XC1 };
  // ── jumps (position, area, perimeter), with a fine re-measure where a step looks suspicious
  for (let i = 1; i + 2 < xs.length; i++) {
    let j = saltoDe(C[i - 1], C[i], C[i + 1], C[i + 2]);
    const aRel = salto1(AP[i - 1][0], AP[i][0], AP[i + 1][0], AP[i + 2][0]) / Math.max(1e-6, AP[i][0]) * 100;
    let pj = salto1(AP[i - 1][1], AP[i][1], AP[i + 1][1], AP[i + 2][1]) * 1000;
    let ar = aRel;
    if (j > 0.0003 || aRel > 0.3 || pj > 0.6) {
      // the 1 mm step re-measured as 50 steps of 0.02 mm: a real jump keeps its size, a steep smooth stretch does not
      let jf = 0, af = 0, pf = 0; const h = PASO / 50;
      for (let k = 0; k < 50; k++) {
        const xb = xs[i] - k * h, q = [xb + h, xb, xb - h, xb - 2 * h].map(x => puntos(seccion(F, x))), ap = q.map(areaPerim);
        jf = Math.max(jf, saltoDe(q[0], q[1], q[2], q[3]));
        af = Math.max(af, salto1(ap[0][0], ap[1][0], ap[2][0], ap[3][0]) / Math.max(1e-6, ap[1][0]) * 100);
        pf = Math.max(pf, salto1(ap[0][1], ap[1][1], ap[2][1], ap[3][1]) * 1000);
      }
      j = jf; ar = af; pj = pf;
    }
    if (j * 1000 > M.salto) { M.salto = j * 1000; M.xSalto = xs[i]; }
    if (ar > M.area) { M.area = ar; M.xArea = xs[i]; }
    if (pj > M.perim) { M.perim = pj; M.xPerim = xs[i]; }
  }
  // ── creases across x: the top centre line in side view, and the normals at the shoulders
  const k = Math.round(W / PASO);
  for (let i = k; i + k < xs.length; i++) {
    const a = C[i - k][80], b = C[i][80], c = C[i + k][80];
    const p = ang([xs[i] - xs[i - k], b[1] - a[1], b[0] - a[0]], [xs[i + k] - xs[i], c[1] - b[1], c[0] - b[0]]);
    if (p > M.pliegueArriba) { M.pliegueArriba = p; M.xArriba = xs[i]; }
  }
  for (let i = k; i + k < xs.length; i += 2) {
    for (const t of T_HOMBROS) {
      const p = ang(normal(F, xs[i - k], t), normal(F, xs[i + k], t));
      if (p > M.pliegueHombros) { M.pliegueHombros = p; M.xHombros = xs[i]; M.tHombros = t; }
    }
  }
  // ── bad sections (on to 1 cm from the tip), and edge lines (AVISO, on the first half of the tail cap and ahead of it), every 5 mm
  const xsS = [...xs.filter((_, i) => i % 5 === 0)]; for (let x = x1 - 0.005; x > F.X_COLA + 0.01; x -= 0.005) xsS.push(x);
  const xArista = F.XT0 - 0.5 * (F.XT0 - F.X_COLA);
  for (let i = 0; i < xsS.length; i++) {
    const s = seccion(F, xsS[i]), c = puntos(s, Array.from({ length: 161 }, (_, q) => q / 160));
    const zmin = Math.min(...c.map(p => p[0])), [A] = areaPerim(c);
    const mal = zmin < -0.0005 ? 'cruza el eje' : A < 1e-5 ? 'sin área' : seCruza(c) ? 'se corta a sí misma' : '';
    if (mal) { M.seccionMala++; if (!M.xMala) M.xMala = `${mal} en x=${xsS[i].toFixed(3)}`; }
    if (i % 4 === 0 && xsS[i] > xArista) { const a = aristaDe(s); if (a > M.arista) { M.arista = a; M.xArista = xsS[i]; } }
  }
  // ── the tail's solar panel against the skin and the glass
  const sc = (m as unknown as { solarCola?: { x0: number; x1: number; tLow: (x: number) => number } | null }).solarCola;
  if (sc) {
    if (sc.x0 > cup.XC1 + 1e-6 && sc.x0 > cup.XF1 + 1e-6) M.panel.push(`el panel empieza ${((sc.x0 - cup.XC1) * 1000).toFixed(0)} mm dentro del cristal`);
    if (sc.x1 < F.X_COLA) M.panel.push('el panel pasa de la punta de la cola');
    // (between the glass's end and the panel lies the canopy's navy frame, by design: what must not be there is bare body
    // between the frame's end and the panel)
    M.panelHueco = Math.max(0, (cup.XC1 - sc.x0) * 1000);
    const desnudo = (cup.XF1 - sc.x0) * 1000;
    if (desnudo > LIM.panelDesnudo) M.panel.push(`${desnudo.toFixed(0)} mm de carrocería sin panel entre el marco de la cúpula y el panel`);
    let malT = 0;
    for (let x = sc.x0; x >= sc.x1; x -= 0.005) { const t = sc.tLow(x); if (!(t >= 0 && t <= 1)) malT++; }
    if (malT) M.panel.push(`borde del panel fuera de la piel en ${malT} filas`);
  }
  return M;
}
const fallos = (M: Medida): string[] => {
  const o: string[] = [];
  if (M.salto > LIM.salto) o.push(`salto ${M.salto.toFixed(1)} mm`);
  if (M.area > LIM.area) o.push(`área ${M.area.toFixed(1)} %`);
  if (M.perim > LIM.perim) o.push(`perímetro ${M.perim.toFixed(1)} mm`);
  if (M.pliegueArriba > LIM.pliegueArriba) o.push(`pliegue arriba ${M.pliegueArriba.toFixed(1)}°`);
  if (M.pliegueHombros > LIM.pliegueHombros) o.push(`pliegue hombros ${M.pliegueHombros.toFixed(1)}°`);
  if (M.seccionMala) o.push(`sección mala (${M.xMala})`);
  o.push(...M.panel);
  return o;
};

// ───────────────────────────────────────────────────────────────── cases
let semilla = SEMILLA;
const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
const ROMBO_JSON = '/tmp/claude-0/-home-claude/4986d662-b311-56d1-afc9-c523879a4ca6/scratchpad/rombo/rombo_bala.json';
// (a copy of the shape keys of Eugenio's «Rombo Bala», for when the scratchpad file is gone)
const ROMBO_FORMA: Record<string, unknown> = { disposicion: 'triciclo', tAlto: 1.276, tAncho: 0.89, tBatalla: 2.75, tCaida: 0.5, tCola: 0.63, tColaAncho: 0, tColaBombeo: 0.01, tColaGrosor: 0, tColaPlana: 1, tCubierta: 'redonda', tCupFin: 2.34, tCupIni: 0.21, tLineaCupula: 0.04, tMorro: 0.45, tMorroAlto: 0.05, tMorroBombeo: 0.02, tPuntaCola: 0.51, tPuntaMorro: 0.3, tSolar: 1.01, tSolarCola: 'si', tSolarMorro: 'si', tTechoPlano: 0.4, tTraseras: 'dos', tSuelo: 0.18, tEjeDel: 0.27, tAcceso: 'puertas', tMaletero: 'aptera', tMalIni: 1.81 };
const rombo: Record<string, unknown> = fs.existsSync(ROMBO_JSON) ? JSON.parse(fs.readFileSync(ROMBO_JSON, 'utf8')) : ROMBO_FORMA;

/** The shape sliders the sweep moves, every one over its own range (rangoTriciclo, which may depend on the others). */
const FORMA: ClaveNumTriciclo[] = ['tBatalla', 'tCola', 'tPuntaCola', 'tColaPlana', 'tColaPlanaAncho', 'tColaAncho', 'tColaGrosor', 'tColaBombeo', 'tBajosIni', 'tBajosCurva', 'tAncho', 'tAlto', 'tSuelo', 'tCupFin', 'tCaida', 'tSubida', 'tTechoPlano', 'tLineaCupula', 'tMorro', 'tPuntaMorro', 'tMorroLinea', 'tMorroAlto', 'tBajosMorro', 'tMorroCurva', 'tMorroAncho', 'tMorroGrosor', 'tMorroBombeo'];
const OPCIONES: Record<string, string[]> = { tCubierta: ['redonda', 'lisa'], tRuedas: ['clasica', 'rombo'], tTraseras: ['una', 'dos'], tSolarCola: ['si', 'no'], tAcceso: ['cupula', 'puertas'] };
type Caso = { nombre: string; P: Parametros };
/** Sets slider k at fraction u of its range as it stands for the design so far. */
function poner(P: Record<string, unknown>, k: ClaveNumTriciclo, u: number) {
  const [a, b] = rangoTriciclo(k, camposTriciclo(P as Partial<Parametros>));
  P[k] = a + (b - a) * u;
}
const base = (o: Record<string, unknown>): Record<string, unknown> => ({ ...PARAMETROS_TRICICLO, ...o, disposicion: 'triciclo' });
const casos: Caso[] = [];
const add = (nombre: string, P: Record<string, unknown>) => casos.push({ nombre, P: deDiseno(JSON.parse(JSON.stringify(P))) as Parametros });
add('Triciclo por defecto', base({}));
add('Rombo Bala (Eugenio)', base(rombo));
const modelo1 = base({ ...rombo, tCubierta: 'redonda', tColaPlana: 1, tColaPlanaAncho: 1, tSolarCola: 'si' });
add('Modelo 1 (cola plana 100 %, ancha, solar, cúpula redonda)', modelo1);
// the same, made very wide, very long, very short
for (const [n, o] of [['ancho', { tAncho: 1 }], ['estrecho', { tAncho: 0 }], ['cola larga', { tCola: 1 }], ['cola corta', { tCola: 0 }], ['alto', { tAlto: 1 }], ['bajo', { tAlto: 0 }], ['cúpula larga', { tCupFin: 1 }], ['cúpula corta', { tCupFin: 0 }]] as [string, Record<string, number>][]) {
  const P = { ...modelo1 }; for (const [k, u] of Object.entries(o)) poner(P, k as ClaveNumTriciclo, u);
  add(`Modelo 1, ${n}`, P);
}
// the grid of extremes: each deck type × wheel layout, the plain Triciclo and the Rombo Bala as bases; every tail-, roof-
// and canopy-related slider at both ends alone, then all the tail's together at both ends, and the «all big» / «all small»
const EXTREMOS: ClaveNumTriciclo[] = ['tCola', 'tPuntaCola', 'tColaPlana', 'tColaPlanaAncho', 'tColaAncho', 'tColaGrosor', 'tColaBombeo', 'tBajosIni', 'tBajosCurva', 'tAncho', 'tAlto', 'tSuelo', 'tCupFin', 'tBatalla', 'tCaida', 'tSubida', 'tTechoPlano', 'tLineaCupula', 'tBajosMorro', 'tMorroCurva'];
for (const [bn, b] of [['Triciclo', base({})], ['Rombo Bala', base(rombo)]] as [string, Record<string, unknown>][]) {
  for (const cub of OPCIONES.tCubierta) for (const [rn, ro] of [['triciclo', { tRuedas: 'clasica', tTraseras: 'una' }], ['rombo', { tRuedas: 'rombo', tTraseras: 'una' }], ['cuatro', { tRuedas: 'clasica', tTraseras: 'dos' }]] as [string, Record<string, string>][]) {
    const b0 = { ...b, ...ro, tCubierta: cub, tSolarCola: 'si', tColaPlana: 1 };
    for (const k of EXTREMOS) for (const u of [0, 1]) { const P = { ...b0 }; poner(P, k, u); add(`${bn} ${cub} ${rn}: ${k}=${u ? 'máx' : 'mín'}`, P); }
    for (const u of [0, 1]) {
      const P = { ...b0 }; for (const k of ['tCola', 'tColaPlana', 'tColaPlanaAncho', 'tColaAncho', 'tAncho', 'tAlto', 'tCupFin', 'tBatalla'] as ClaveNumTriciclo[]) poner(P, k, u);
      add(`${bn} ${cub} ${rn}: todo ${u ? 'grande' : 'pequeño'}`, P);
      const Q = { ...b0 }; for (const k of ['tCola', 'tColaPlanaAncho', 'tColaAncho', 'tAncho'] as ClaveNumTriciclo[]) poner(Q, k, 1); poner(Q, 'tAlto', u); poner(Q, 'tCupFin', u);
      add(`${bn} ${cub} ${rn}: cola súper ancha, cúpula ${u ? 'alta y larga' : 'baja y corta'}`, Q);
    }
    for (const w of [0, 0.25, 0.5, 0.75, 1]) { const P = { ...b0 }; poner(P, 'tColaPlanaAncho', w); poner(P, 'tColaAncho', w); add(`${bn} ${cub} ${rn}: ancho de cola ${w * 100} %`, P); }
  }
}
// random designs over every shape slider and option
for (let r = 0; r < N_ALEA; r++) {
  const P: Record<string, unknown> = base(azar() < 0.3 ? rombo : {});
  for (const [k, ops] of Object.entries(OPCIONES)) P[k] = ops[Math.floor(azar() * ops.length)];
  for (const k of FORMA) poner(P, k, azar() < 0.2 ? Math.round(azar()) : azar());
  add(`aleatorio #${r + 1}`, P);
}

// ───────────────────────────────────────────────────────────────── run
const t0 = Date.now();
type Fila = { nombre: string; M: Medida; f: string[]; params: Record<string, unknown>; nota: number; P: Parametros };
const filas: Fila[] = [];
let errores = 0;
for (const c of casos) {
  if (SOLO && !c.nombre.includes(SOLO)) continue;
  let m: ModeloTriciclo;
  try { m = crearModelo(c.P) as ModeloTriciclo; } catch (e) { errores++; console.log(`ERROR al construir «${c.nombre}»: ${(e as Error).message}`); continue; }
  const M = medir(m), f = fallos(M);
  const T = camposTriciclo(c.P), params: Record<string, unknown> = {};
  for (const k of FORMA) params[k] = +limitarTriciclo(k, T).toFixed(4);
  for (const k of Object.keys(OPCIONES)) params[k] = (T as unknown as Record<string, unknown>)[k];
  // how bad, against each limit (1 = at the limit)
  const nota = Math.max(M.salto / LIM.salto, M.area / LIM.area, M.perim / LIM.perim, M.pliegueArriba / LIM.pliegueArriba, M.pliegueHombros / LIM.pliegueHombros, M.seccionMala ? 10 : 0, M.panel.length ? 1.01 : 0);
  filas.push({ nombre: c.nombre, M, f, params, nota, P: c.P });
}
const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—'), x3 = (v: number) => (Number.isFinite(v) ? v.toFixed(3) : '—');
const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length));
const cab = `${pad('caso', 58)} ${pad('salto mm', 9)} ${pad('área %', 7)} ${pad('perím mm', 9)} ${pad('arriba °', 9)} ${pad('hombros °', 10)} ${pad('arista °', 9)} ${pad('vidrio→panel', 12)}  dónde (x, m; fin del vidrio)`;
const linea = (r: Fila) => `${pad(r.nombre, 58)} ${pad(f1(r.M.salto), 9)} ${pad(f1(r.M.area), 7)} ${pad(f1(r.M.perim), 9)} ${pad(f1(r.M.pliegueArriba), 9)} ${pad(f1(r.M.pliegueHombros), 10)} ${pad(f1(r.M.arista), 9)} ${pad(r.M.panelHueco ? `${r.M.panelHueco.toFixed(0)} mm` : '—', 12)}  salto@${x3(r.M.xSalto)} arriba@${x3(r.M.xArriba)} hombros@${x3(r.M.xHombros)}(t ${r.M.tHombros}) vidrio@${x3(r.M.xFinVidrio)}`;
const fijos = filas.filter(r => /^(Triciclo por defecto|Rombo Bala \(|Modelo 1)/.test(r.nombre));
console.log(`\nCasos de Eugenio y de referencia:\n${cab}`);
for (const r of fijos) console.log(linea(r) + (r.f.length ? `\n   FALLA: ${r.f.join('; ')}` : ''));
const peores = [...filas].sort((a, b) => b.nota - a.nota).slice(0, N_PEORES);
console.log(`\nLos ${peores.length} peores:\n${cab}`);
for (const r of peores) {
  console.log(linea(r) + (r.f.length ? `\n   FALLA: ${r.f.join('; ')}` : ''));
  console.log(`   ${Object.entries(r.params).map(([k, v]) => `${k}=${v}`).join(' ')}`);
}
const malos = filas.filter(r => r.f.length);
const max = (k: keyof Medida) => Math.max(...filas.map(r => r.M[k] as number));
const avisos = filas.filter(r => r.M.arista > LIM.arista).length;
console.log(`\nTotales: ${filas.length} casos en ${((Date.now() - t0) / 1000).toFixed(0)} s; peor salto ${f1(max('salto'))} mm, área ${f1(max('area'))} %, perímetro ${f1(max('perim'))} mm, pliegue arriba ${f1(max('pliegueArriba'))}°, pliegue hombros ${f1(max('pliegueHombros'))}°; secciones malas en ${filas.filter(r => r.M.seccionMala).length} casos; panel mal en ${filas.filter(r => r.M.panel.length).length}; AVISO arista > ${LIM.arista}° en ${avisos} casos (no cuenta).`);
const porTipo = ['salto', 'área', 'perímetro', 'pliegue arriba', 'pliegue hombros', 'sección mala', 'panel'].map(n => `${n}: ${malos.filter(r => r.f.some(x => x.startsWith(n) || (n === 'panel' && /panel|cristal/.test(x)))).length}`);
console.log(`Fallos por tipo — ${porTipo.join(', ')}${errores ? `; ${errores} casos no se pudieron construir` : ''}`);
if (JSON_OUT) { fs.writeFileSync(JSON_OUT, JSON.stringify(malos.map(r => ({ nombre: r.nombre, fallos: r.f, medidas: r.M, params: r.params })), null, 1)); console.log(`Casos que fallan guardados en ${JSON_OUT}`); }
// (`--visual <file>`: the 3 worst cases and the «Modelo 1» one, whole designs, for the headless screenshots)
if (VISUAL) { const m1 = filas.find(r => r.nombre.startsWith('Modelo 1 (')); const v = [...(m1 ? [m1] : []), ...peores.filter(r => r !== m1).slice(0, 3)]; fs.writeFileSync(VISUAL, JSON.stringify(v.map(r => ({ nombre: r.nombre, params: r.P })))); }
const n = malos.length + errores;
console.log(n ? `COLA FALLA ${n} casos` : 'COLA OK');
process.exit(n ? 1 : 0);
