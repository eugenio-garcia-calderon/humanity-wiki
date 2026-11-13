/**
 * The smooth body's promise (2026-11-13): no mounds on the rear deck, the hood or the belly's sweep, at any slider value.
 * Run with: npx tsx scripts/bala-cola-lisa.ts [solo-los-casos-que-empiezan-por] [--donde]
 *
 * Eugenio: «tienes que desarrollar un sistema en el que nunca se permita que haya esos montículos. Tiene que ser todo
 * plano y suave». The deck model (balaForma.ts `cubiertaLisa`) is built so that it cannot draw one; this script checks
 * the BUILT skin, not the intent: every point is `punto(F.sec(x), t)` of the model's own shape `m.F`, the very sections
 * the 3D mesh (balaModelo.ts `rejilla`) and the wind tunnel's envelope (`F.envolvente`) are made of.
 *
 * Where: the rear deck from 1 cm onto the canopy glass's end back to 2 mm from the tail's end, and the hood from 1 cm onto
 * the windscreen's start forward to 2 mm from the nose's tip (`F.zonasLisa`); the belly's centre and edge lines from 5 cm
 * ahead of where its sweep starts (so the joint is in) back to the end.
 *
 * What, at every station (every 1 cm) on each deck, on the half-section from its widest point to the centre line:
 *   - convexa: how far any point of it lies inside the convex hull of the curve (closed down to the widest point's
 *     height on the centre line). A dent or a ridge shows here. Tolerance 0.2 mm.
 *   - un máximo: going out from the centre line, how much the curve ever rises again over the lowest it has been. A
 *     second hump shows here. Tolerance 0.1 mm.
 *   - bombeo: how far the deck (from its side edge, where the deck begins, t = T_CUBIERTA, to the centre) rises over
 *     the straight line between the two. Tolerance: the «bombeo» slider + 0.5 mm.
 * And along every line on the deck at 0, 25, 50, 75, 90 and 100 % of its half-width (every 2 mm), and the belly's
 * centre and edge lines:
 *   - sube: the most it ever rises (the deck lines) or falls (the belly lines) going towards the end, over the lowest
 *     (highest) it has been. Tolerance 0.1 mm.
 *   - pliegue: a crease: how much one 2 mm step turns the line beyond what its two neighbouring steps turn (a smooth
 *     bend turns alike step after step; a kink all at once), away from the last 3 cm of each end, where the end cap
 *     rounds over onto its edge. Tolerance 0.5°: a crease reads as a line on the paint from about 2°.
 *   - onda: a ripple: a stretch under 15 cm bending against the line's way, smaller than the bends on both sides of it,
 *     as the height of the bump it makes (an arc's sagitta, length × angle / 8). Tolerance 0.1 mm.
 * A person reads a mound from about 2 mm; every tolerance here is a tenth of that or less, except the crease angle.
 *
 * Cases: the clásico as saved in production today with this round's proposed keys, every tail-, nose- and roof-related
 * slider at both ends of its range on it, every shape slider at both ends together, pairs, and 40 random combinations of
 * all of them (fixed seed), plus the plain Triciclo with the smooth body on. Prints OK or FALLA per case with the worst
 * value of each measure; exits 1 on any FALLA.
 */
import { crearModelo, PARAMETROS_TRICICLO, type Parametros } from '../src/components/aeromovil/geometria';
import { camposTriciclo, rangoTriciclo, type ClaveNumTriciclo, type ModeloTriciclo } from '../src/components/aeromovil/geometriaTriciclo';
import { T3, T_CUBIERTA, punto, type FormaBala } from '../src/components/aeromovil/garaje/balaForma';
import { deDiseno } from '../src/components/aeromovil/Disenos';
import { contornoCupula } from '../src/components/aeromovil/garaje/balaMedidas';
import { CLASICO_HOY, PROPUESTA_COLA_LISA } from './clasicoGuardado';
// (`--donde` anywhere: also say where each worst value is when it passes)

const TOL = { convexa: 0.0002, maximo: 0.0001, bombeo: 0.0005, sube: 0.0001, pliegue: 0.5, onda: 0.0001 };
type P = [number, number];

/** The upper half-section at x, from the widest point (t = T3) to the centre line, N + 1 points. */
function arriba(F: FormaBala, x: number, N = 240): P[] {
  const s = F.sec(x), o: P[] = [];
  for (let i = 0; i <= N; i++) o.push(punto(s, T3 + (1 - T3) * i / N));
  return o;
}
/** How far any point lies inside the convex hull of the points (m). */
function dentroDelCasco(pts: P[]): number {
  const q = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: P[] = [], hi: P[] = [];
  for (const p of q) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = q.length - 1; i >= 0; i--) { const p = q[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  const casco = [...lo.slice(0, -1), ...hi.slice(0, -1)];
  let peor = 0;
  for (const p of pts) {
    let d = Infinity;
    for (let i = 0; i < casco.length; i++) {
      const a = casco[i], b = casco[(i + 1) % casco.length], ux = b[0] - a[0], uy = b[1] - a[1], l2 = ux * ux + uy * uy;
      const u = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * ux + (p[1] - a[1]) * uy) / l2)) : 0;
      d = Math.min(d, Math.hypot(p[0] - a[0] - u * ux, p[1] - a[1] - u * uy));
    }
    peor = Math.max(peor, d);
  }
  return peor;
}
/** y of the upper curve at half-width z (the deck part is a function of z). */
function yEnZ(c: P[], z: number): number {
  for (let i = c.length - 1; i > 0; i--) {
    const a = c[i], b = c[i - 1];
    if ((z - a[0]) * (z - b[0]) <= 0 && a[0] !== b[0]) return a[1] + (b[1] - a[1]) * (z - a[0]) / (b[0] - a[0]);
  }
  return c[c.length - 1][1];
}
type Medida = keyof typeof TOL;
interface Peor extends Record<Medida, number> { donde: Partial<Record<Medida, string>> }
const nuevo = (): Peor => ({ convexa: 0, maximo: 0, bombeo: 0, sube: 0, pliegue: 0, onda: 0, donde: {} });
/** Keeps the worst value of each measure and where it was. */
function anotar(p: Peor, k: Medida, v: number, donde: string) { if (v > p[k]) { p[k] = v; p.donde[k] = donde; } }

/**
 * A line y(s) sampled at `paso` along its way to the end (s = distance travelled): its worst rise against `sentido`
 * (−1: it must only fall, the decks; +1: only rise, the belly), its worst crease (°) and its short S-bends (°).
 */
function linea(ys: number[], paso: number, sentido: 1 | -1, sinBordes: number, xs?: number[]) {
  let sube = 0, ext = ys[0];
  for (const y of ys) { if (sentido < 0) { sube = Math.max(sube, y - ext); ext = Math.min(ext, y); } else { sube = Math.max(sube, ext - y); ext = Math.max(ext, y); } }
  const ang = ys.slice(1).map((y, i) => Math.atan2(y - ys[i], paso) * 180 / Math.PI);
  let pliegue = 0;
  const n0 = Math.round(sinBordes / paso);
  // a crease: a step whose turning stands out from its neighbours' (a smooth bend turns alike from step to step; a kink
  // turns all at once in one step)
  let iP = 0;
  const giro = ang.slice(1).map((a, i) => a - ang[i]);
  for (let i = 1; i < giro.length - 1 - n0; i++) { const v = Math.abs(giro[i] - (giro[i - 1] + giro[i + 1]) / 2); if (v > pliegue) { pliegue = v; iP = i + 1; } }
  // stretches of one-way bending (noise under 0.002° a step ignored), then short ones between two of the other way
  const d = ang.slice(1).map((a, i) => a - ang[i]).slice(0, Math.max(0, ang.length - 1 - n0));
  const tramos: { signo: number; giro: number; largo: number; i: number }[] = [];
  d.forEach((v, i) => {
    const sg = Math.abs(v) < 0.002 ? 0 : Math.sign(v);
    const u = tramos[tramos.length - 1];
    if (sg === 0) { if (u) u.largo += paso; return; }
    if (u && u.signo === sg) { u.giro += v; u.largo += paso; } else tramos.push({ signo: sg, giro: v, largo: paso, i });
  });
  let onda = 0, iO = 0;
  // a ripple: a stretch under 15 cm bending against the line's way, smaller than the bends on both sides of it (so it
  // interrupts them; a main bend between two others is the shape, not a ripple). Its height: the sagitta of an arc that
  // turns that much over that length, L·θ/8 (m)
  for (let i = 1; i < tramos.length - 1; i++) {
    const t = tramos[i], a = tramos[i - 1], b = tramos[i + 1];
    if (t.largo < 0.15 && a.signo !== t.signo && b.signo !== t.signo && Math.abs(t.giro) < Math.abs(a.giro) && Math.abs(t.giro) < Math.abs(b.giro)) {
      const h = t.largo * Math.abs(t.giro) * Math.PI / 180 / 8;
      if (h > onda) { onda = h; iO = t.i + 1; }
    }
  }
  return { sube, pliegue, onda, xPliegue: xs ? xs[iP] : NaN, xOnda: xs ? xs[iO] : NaN };
}

function medir(m: ModeloTriciclo, control = false): Peor | string {
  // (`control`: the same measures on a body without the smooth deck, over the same stretches, from its canopy's outline)
  const F = m.F, cc = control ? contornoCupula(F) : null, z = cc ? { detras: cc.XC1 + 0.01, delante: cc.XC0 - 0.01 } : F.zonasLisa;
  if (!z) return 'sin cubierta lisa';
  const p = nuevo(), D = F.D;
  // ── cross-sections, every 1 cm on both decks
  const estaciones: [number, number][] = [];
  for (let x = z.detras; x > F.X_COLA + 0.002; x -= 0.01) estaciones.push([x, D.colaBombeo ?? 0]);
  for (let x = z.delante; x < F.X_MORRO - 0.002; x += 0.01) estaciones.push([x, D.morroBombeo ?? 0]);
  for (const [x, bomb] of estaciones) {
    const c = arriba(F, x), donde = `x = ${x.toFixed(3)}`;
    if (c.some(q => !Number.isFinite(q[0]) || !Number.isFinite(q[1]))) { anotar(p, 'convexa', 1, `${donde} (NaN)`); continue; }
    anotar(p, 'convexa', dentroDelCasco([...c, [0, c[0][1]]]), donde);
    let min = Infinity, rise = 0; for (let i = c.length - 1; i >= 0; i--) { rise = Math.max(rise, c[i][1] - min); min = Math.min(min, c[i][1]); }
    anotar(p, 'maximo', rise, donde);
    const s = F.sec(x), E = punto(s, T_CUBIERTA), C = punto(s, 1);
    let cr = 0;
    for (let i = 0; i <= 60; i++) { const q = punto(s, T_CUBIERTA + (1 - T_CUBIERTA) * i / 60), u = E[0] > 1e-9 ? q[0] / E[0] : 0; cr = Math.max(cr, q[1] - (C[1] + (E[1] - C[1]) * u)); }
    anotar(p, 'bombeo', Math.max(0, cr - bomb), donde);
  }
  // ── lines along each deck, every 2 mm, at fractions of the deck's half-width (2 mm: a sharp but smooth bend, a 10 cm
  // radius, then turns 1.1° a step, and the crease measure reads it under 0.6°; a real crease reads its full angle at any step)
  const paso = 0.002;
  for (const [x0, x1, dir] of [[z.detras, F.X_COLA + 0.002, -1], [z.delante, F.X_MORRO - 0.002, 1]] as const) {
    const xs: number[] = []; for (let x = x0; dir < 0 ? x > x1 : x < x1; x += dir * paso) xs.push(x);
    const cs = xs.map(x => ({ c: arriba(F, x, 160), zE: punto(F.sec(x), T_CUBIERTA)[0] }));
    for (const f of [0, 0.25, 0.5, 0.75, 0.9, 1]) {
      const ys = cs.map(({ c, zE }) => yEnZ(c, f * zE));
      const r = linea(ys, paso, -1, 0.03, xs), donde = `${dir < 0 ? 'cola' : 'morro'}, línea al ${Math.round(f * 100)} %`;
      anotar(p, 'sube', r.sube, donde); anotar(p, 'pliegue', r.pliegue, `${donde}, x = ${r.xPliegue.toFixed(3)}`); anotar(p, 'onda', r.onda, `${donde}, x = ${r.xOnda.toFixed(3)}`);
    }
  }
  // ── the belly's sweep: its centre line and its flat's edge, from 20 cm ahead of where it starts to the end
  if (D.bajosCurva) {
    const xU = Math.max(F.X_COLA + 0.15, Math.min(-F.BATALLA + 1.0, F.XT0 + 0.02, -F.BATALLA + (D.bajosIni ?? 0)));
    const xs: number[] = []; for (let x = xU + 0.05; x > F.X_COLA + 0.002; x -= paso) xs.push(x);
    for (const t of [0, 0.07]) {
      const r = linea(xs.map(x => punto(F.sec(x), t)[1]), paso, 1, 0.03, xs), donde = `bajos, t = ${t}`;
      anotar(p, 'sube', r.sube, donde); anotar(p, 'pliegue', r.pliegue, `${donde}, x = ${r.xPliegue.toFixed(3)}`); anotar(p, 'onda', r.onda, `${donde}, x = ${r.xOnda.toFixed(3)}`);
    }
  }
  return p;
}

// ── the cases
let fallos = 0, casos = 0;
const SOLO = process.argv.slice(2).find(a => !a.startsWith("--"));
/** `--donde`: say where the worst value of every measure is, also when it passes. */
const DONDE = process.argv.includes('--donde');
const mm = (v: number) => (v * 1000).toFixed(2);
function probar(nombre: string, P: Partial<Parametros>) {
  if (SOLO && !nombre.startsWith(SOLO)) return;
  casos++;
  let r: Peor | string;
  try { r = medir(crearModelo(deDiseno(P)) as ModeloTriciclo); } catch (e) { r = `error: ${(e as Error).message}`; }
  if (typeof r === 'string') { fallos++; console.log(`FALLA ${nombre}: ${r}`); return; }
  const malas = (Object.keys(TOL) as Medida[]).filter(k => r[k] > TOL[k]);
  if (malas.length) fallos++;
  console.log(`${malas.length ? 'FALLA' : 'OK   '} ${nombre}: convexa ${mm(r.convexa)} mm · un máximo ${mm(r.maximo)} mm · bombeo +${mm(r.bombeo)} mm · sube ${mm(r.sube)} mm · pliegue ${r.pliegue.toFixed(2)}° · onda ${mm(r.onda)} mm${(DONDE ? (Object.keys(TOL) as Medida[]) : malas).map(k => ` · ${k}: ${r.donde[k] ?? '-'}`).join('')}`);
}

// the control: today's clásico, without the smooth deck, measured the same way. It must show the mounds Eugenio saw (if
// it did not, these measures could not see one); it is listed, not counted
if (!SOLO || 'control'.startsWith(SOLO)) {
  const r = medir(crearModelo(deDiseno(CLASICO_HOY)) as ModeloTriciclo, true);
  if (typeof r !== 'string') console.log(`(control) el clásico de hoy, sin cubierta lisa: convexa ${mm(r.convexa)} mm · un máximo ${mm(r.maximo)} mm · sube ${mm(r.sube)} mm · pliegue ${r.pliegue.toFixed(2)}° · onda ${mm(r.onda)} mm${(Object.keys(TOL) as Medida[]).filter(k => k !== 'bombeo' && r[k] > TOL[k]).map(k => ` · ${k}: ${r.donde[k]}`).join('')}`);
}
const BASE = { ...CLASICO_HOY, ...PROPUESTA_COLA_LISA } as Partial<Parametros>;
const TB = camposTriciclo(deDiseno(BASE));
/** Every slider that shapes the nose, the tail, the roof or the decks. */
const CLAVES: ClaveNumTriciclo[] = ['tColaAncho', 'tColaGrosor', 'tColaBombeo', 'tBajosIni', 'tBajosCurva', 'tMorroAncho', 'tMorroGrosor', 'tMorroBombeo',
  'tMorro', 'tPuntaMorro', 'tMorroAlto', 'tMorroLinea', 'tCola', 'tPuntaCola', 'tColaPlana', 'tTechoPlano', 'tCaida', 'tLineaCupula', 'tCupIni', 'tCupFin', 'tAlto', 'tAncho', 'tSuelo', 'tBatalla'];
const ext = (k: ClaveNumTriciclo, lado: 0 | 1) => rangoTriciclo(k, TB)[lado];

probar('clásico de hoy con la propuesta', BASE);
for (const k of CLAVES) for (const lado of [0, 1] as const) probar(`clásico · ${k} = ${+ext(k, lado).toFixed(4)} (${lado ? 'máx.' : 'mín.'})`, { ...BASE, [k]: ext(k, lado) });
for (const lado of [0, 1] as const) probar(`clásico · todo al ${lado ? 'máx.' : 'mín.'}`, { ...BASE, ...Object.fromEntries(CLAVES.map(k => [k, ext(k, lado)])) });
const PARES: [ClaveNumTriciclo, ClaveNumTriciclo][] = [['tTechoPlano', 'tColaBombeo'], ['tCaida', 'tPuntaCola'], ['tColaAncho', 'tColaGrosor'], ['tBajosCurva', 'tColaGrosor'], ['tMorroAlto', 'tMorroGrosor'], ['tMorroAncho', 'tPuntaMorro'], ['tLineaCupula', 'tCaida'], ['tCupFin', 'tCaida'], ['tAlto', 'tTechoPlano'], ['tMorro', 'tMorroAlto']];
for (const [a, b] of PARES) for (const la of [0, 1] as const) for (const lb of [0, 1] as const) probar(`clásico · ${a} ${la ? 'máx.' : 'mín.'} y ${b} ${lb ? 'máx.' : 'mín.'}`, { ...BASE, [a]: ext(a, la), [b]: ext(b, lb) });
// 40 random combinations of every one of them (a fixed seed: the same 40 every run)
let semilla = 20261113;
const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
for (let i = 0; i < 40; i++) probar(`clásico · al azar ${i + 1}`, { ...BASE, ...Object.fromEntries(CLAVES.map(k => { const [a, b] = rangoTriciclo(k, TB); return [k, a + (b - a) * azar()]; })) });
// the plain Triciclo (one rear wheel, no doors) with the smooth body, plain and wide
probar('triciclo con cubierta lisa', { ...PARAMETROS_TRICICLO, tCubierta: 'lisa' } as Partial<Parametros>);
probar('triciclo con cubierta lisa, como la propuesta del clásico', { ...PARAMETROS_TRICICLO, ...PROPUESTA_COLA_LISA } as Partial<Parametros>);

console.log(`\n${casos} casos · tolerancias: convexa ${mm(TOL.convexa)} mm, un máximo ${mm(TOL.maximo)} mm, bombeo +${mm(TOL.bombeo)} mm, sube ${mm(TOL.sube)} mm, pliegue ${TOL.pliegue}°, onda ${mm(TOL.onda)} mm · ${fallos ? `${fallos} FALLA` : 'todos OK'}`);
if (fallos) process.exitCode = 1;
