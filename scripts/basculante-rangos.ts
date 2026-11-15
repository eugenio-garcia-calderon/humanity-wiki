/**
 * The Cuadriciclo Basculante (2026-11-15): every slider at both ends of its range, and every option, must build a
 * model with no NaN anywhere, a closed skin, no bumps in its lines and the parameters' round trip through a save.
 * Run with: npx tsx scripts/basculante-rangos.ts
 *
 *  - Builds: the model, its areas and its results (masses, checks, the lean's dynamics), all finite.
 *  - Closed: the skin's grid wraps round (its first and last angle are the same point), the nose closes to one point,
 *    the tail's edge has its cap, and the only cells left out are inside the wheel arches' openings (the rear two, and
 *    the front two when the front wheels go inside the nose, the default since 2026-11-15).
 *  - No bumps: along the car the roof line has one top (it may be a flat stretch), the belly never rises in the middle
 *    and then falls, and the half-width rises from the nose to one plateau and falls to the tail (no waist bulging out
 *    again between the front fairings).
 *  - The round trip: the default design, and one with every slider moved, survive save → open unchanged; a saved
 *    `{"disposicion": "basculante"}` opens with the defaults.
 */
import { PARAMETROS_BASCULANTE, areas, calcular, crearModelo, type Parametros } from '../src/components/aeromovil/geometria';
import { aDiseno, deDiseno } from '../src/components/aeromovil/Disenos';
import { SELECTORES_BASCULANTE, camposBasculante, deslizadoresBasculante, dinamicaBasculante, type ModeloBasculante } from '../src/components/aeromovil/geometriaBasculante';
import { BASCULANTE_DEFECTO } from '../src/components/aeromovil/basculante/defecto';

let fallos = 0;
const ok = (c: boolean, m: string) => { if (!c) { console.log(`FALLA ${m}`); fallos++; } return c; };
const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const finito = (v: unknown): boolean => typeof v === 'number' ? Number.isFinite(v) : Array.isArray(v) ? v.every(finito) : v && typeof v === 'object' ? Object.values(v).every(finito) : true;

/** Local maxima of a sampled line (a flat stretch counts once), ignoring wiggles under `tol`. */
function cimas(v: number[], tol = 2e-4): number {
  let n = 0, sube = true, ref = v[0];
  for (let i = 1; i < v.length; i++) {
    if (sube) { if (v[i] > ref) ref = v[i]; else if (v[i] < ref - tol) { n++; sube = false; ref = v[i]; } }
    else { if (v[i] < ref) ref = v[i]; else if (v[i] > ref + tol) { sube = true; ref = v[i]; } }
  }
  return sube ? n + 1 : n;
}

function revisar(P: Parametros, nombre: string): boolean {
  let m: ModeloBasculante;
  try { m = crearModelo(P) as ModeloBasculante; } catch (e) { return ok(false, `${nombre}: no se construye (${(e as Error).message})`); }
  const ar = areas(m), r = calcular(m, ar);
  let bien = ok(m.tipo === 'basculante' && m.ruedas.length === 4, `${nombre}: no es un basculante de cuatro ruedas`);
  bien = ok(finito(ar) && finito(r.masas) && Number.isFinite(r.mVeh) && Number.isFinite(r.mTot) && finito(r.basculante!.cg) && finito(r.basculante!.basculacion), `${nombre}: masas, áreas o dinámica con NaN`) && bien;
  bien = ok(r.comprobaciones.every(c => Number.isFinite(c.holgura) && Number.isFinite(c.minimo)), `${nombre}: una comprobación con NaN (${r.comprobaciones.filter(c => !Number.isFinite(c.holgura)).map(c => c.nombre).join(', ')})`) && bien;
  // the skin's grid: finite, wrapping round, the nose one point, the cells left out only in the arches' openings
  const { xs, ths } = m.rejilla;
  const pos = xs.map(x => { const f = m.F.frame(x); return ths.map(t => m.F.sec(f, t)); });
  bien = ok(pos.every(f => f.every(p => p.every(Number.isFinite))), `${nombre}: la piel tiene puntos NaN`) && bien;
  bien = ok(pos.every(f => Math.hypot(f[0][0] - f[f.length - 1][0], f[0][1] - f[f.length - 1][1], f[0][2] - f[f.length - 1][2]) < 1e-9), `${nombre}: la piel no da la vuelta entera`) && bien;
  bien = ok(pos[0].every(p => Math.hypot(p[0] - pos[0][0][0], p[1] - pos[0][0][1], p[2] - pos[0][0][2]) < 1e-9), `${nombre}: el morro no se cierra en un punto`) && bien;
  bien = ok(m.F.frame(m.xt).top - m.F.frame(m.xt).bot > 0.005 && m.F.frame(m.xt).hw > 0.005, `${nombre}: el borde de la cola no tiene tapa`) && bien;
  let fuera = 0;
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ths.length - 1; j++) {
    const a = pos[i][j], d = pos[i + 1][j + 1], c: [number, number, number] = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2, (a[2] + d[2]) / 2];
    // (the rear arches' openings, and the front ones when the wheels go in the nose)
    const enArco = (a: { x: number; rx: number; yTop: number } | null) => !!a && Math.abs(c[0] - a.x) <= a.rx + 1e-6 && c[1] <= a.yTop + 1e-6;
    if (m.hueco(c) && !enArco(m.arco) && !enArco(m.arcoDel)) fuera++;
  }
  bien = ok(fuera === 0, `${nombre}: ${fuera} celdas de la piel faltan fuera de los pasos de rueda`) && bien;
  // no bumps
  const top: number[] = [], bot: number[] = [], hw: number[] = [];
  for (let x = m.xn; x >= m.xt; x -= 0.005) { const f = m.F.frame(x); top.push(f.top); bot.push(-f.bot); hw.push(f.hw); }
  bien = ok(cimas(top) === 1, `${nombre}: el techo tiene ${cimas(top)} cimas (montículos)`) && bien;
  bien = ok(cimas(bot) === 1, `${nombre}: la panza sube y vuelve a bajar (${cimas(bot)} valles)`) && bien;
  bien = ok(cimas(hw) === 1, `${nombre}: el ancho en planta tiene ${cimas(hw)} cimas (se ensancha y se estrecha otra vez)`) && bien;
  bien = ok(top.every((t, i) => t + bot[i] >= -1e-9) && hw.every(h => h >= 0), `${nombre}: la panza pasa por encima del techo o el ancho es negativo`) && bien;
  return bien;
}

// ── every slider at both ends, alone
const fichas = deslizadoresBasculante();
let casos = 0;
for (const f of fichas) for (const v of [f.min, f.max]) { casos++; revisar({ ...PARAMETROS_BASCULANTE, [f.clave]: v }, `${f.clave} = ${v}`); }
// every option
for (const s of SELECTORES_BASCULANTE) for (const o of s.opciones) { casos++; revisar({ ...PARAMETROS_BASCULANTE, [s.clave]: o.k }, `${s.clave} = ${o.k}`); }
// everything at once at its minimum, at its maximum, and 200 random mixes (seeded)
for (const lado of [0, 1]) { casos++; const P: Parametros = { ...PARAMETROS_BASCULANTE }; for (const f of fichas) (P as unknown as Record<string, number>)[f.clave] = lado ? f.max : f.min; revisar(P, `todo al ${lado ? 'máximo' : 'mínimo'}`); }
let semilla = 7; const rnd = () => { semilla = (semilla * 1664525 + 1013904223) % 4294967296; return semilla / 4294967296; };
for (let k = 0; k < 200; k++) {
  casos++; const P: Parametros = { ...PARAMETROS_BASCULANTE };
  for (const f of fichas) if (rnd() < 0.5) (P as unknown as Record<string, number>)[f.clave] = +(f.min + (f.max - f.min) * rnd()).toFixed(4);
  for (const s of SELECTORES_BASCULANTE) if (rnd() < 0.3) (P as unknown as Record<string, string>)[s.clave] = s.opciones[Math.floor(rnd() * s.opciones.length)].k;
  revisar(P, `mezcla ${k}`);
}
console.log(`${casos} casos construidos (cada deslizador en sus dos extremos, cada opción, todo al mínimo y al máximo y 200 mezclas)`);

// ── the default design passes every check
{
  const m = crearModelo(PARAMETROS_BASCULANTE), r = calcular(m, areas(m));
  const malas = r.comprobaciones.filter(c => c.holgura < c.minimo);
  ok(malas.length === 0, `el diseño por defecto no pasa: ${malas.map(c => c.nombre).join(' · ')}`);
  const d = dinamicaBasculante(PARAMETROS_BASCULANTE);
  ok(finito(d as unknown as Record<string, number>), 'dinamicaBasculante devuelve NaN');
  console.log(`por defecto: ${r.comprobaciones.length} comprobaciones, ${malas.length} por revisar · ${Math.round(r.mVeh)} kg en vacío · ${m.Lf.toFixed(2)} × ${m.P.W.toFixed(2)} × ${m.P.H.toFixed(2)} m · cdg ${d.cgAltura.toFixed(3)} m · vuelco inclinado ${d.vuelcoInclinado.toFixed(2)} g`);
}
// ── the round trip through a save
ok(igual(deDiseno(aDiseno(PARAMETROS_BASCULANTE)), { ...PARAMETROS_BASCULANTE, comp: 0 }), 'el Basculante por defecto no se guarda y se abre igual');
ok(igual(camposBasculante(deDiseno({ disposicion: 'basculante' })), BASCULANTE_DEFECTO), 'un diseño guardado solo con {"disposicion": "basculante"} no abre con las medidas por defecto');
{
  const P: Parametros = { ...PARAMETROS_BASCULANTE };
  for (const f of fichas) (P as unknown as Record<string, number>)[f.clave] = +(f.min + (f.max - f.min) * 0.3).toFixed(4);
  Object.assign(P, { qMatCarenado: 'vidrio', qChMat: 'cromoly', qRuedaDel: 'm15', qRuedaTras: 'm13', qSolarCola: 'si' });
  const Q = deDiseno(JSON.parse(JSON.stringify(aDiseno(P))));
  ok(igual(camposBasculante(Q), camposBasculante(P)), 'un Basculante con todos los campos cambiados no se guarda y se abre igual');
  ok(crearModelo(Q).tipo === 'basculante', 'y no abre como basculante');
  // a hand-written design with wrong types and unknown options opens with the defaults for those
  const R = camposBasculante(deDiseno({ disposicion: 'basculante', qAlto: 'alto' as never, qRuedaDel: 'r99' as never, qBascMax: 999 }));
  ok(R.qAlto === BASCULANTE_DEFECTO.qAlto && R.qRuedaDel === BASCULANTE_DEFECTO.qRuedaDel, 'un tipo equivocado o una opción desconocida no vuelven a lo de por defecto');
  ok((crearModelo({ ...PARAMETROS_BASCULANTE, qBascMax: 999 }) as ModeloBasculante).phiMax * 180 / Math.PI <= 40 + 1e-9, 'un número fuera de rango no se limita al extremo de su deslizador');
}
console.log(fallos ? `${fallos} FALLA` : 'Todo OK');
process.exit(fallos ? 1 : 0);
