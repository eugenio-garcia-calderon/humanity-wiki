/**
 * How close is the Smera replica to the real car? A score from 0 to 100, part by part (2026-11-15, Eugenio: «crea un
 * bot que te evalúe la cercanía a la realidad»).
 *
 *   npx tsx scripts/smera-realidad.ts [--lado foto_de_lado.png] [--svg salida.svg] [--json '{"qAlto":1.4}']
 *
 * What it compares, and with what:
 *  1. Medidas (20): length, height, width, wheelbase, track and tyre against the published figures (auto-swiat.pl,
 *     seriouswheels.com, caradisiac.com for the 2008 car) and the tyre measured on the photo.
 *  2. Silueta de lado (35): the model's side silhouette (body, wheels, bumper bar, visor) against the outline traced on
 *     Lumeneo's press side view, by area overlap (IoU). With `--lado` and that photo it also measures, in pixels, how
 *     far the model's outline falls from the photo's own edges (found here with a Sobel filter, nobody's tracing), and
 *     that counts for half.
 *  3. Anchos de frente (15): the body's width at seven heights against the press front view.
 *  4. Cristales (15): the side windows the model draws (its skin's zones, as the viewer paints them) against the ones
 *     traced on the side view, by overlap.
 *  5. Comprobaciones (15): the share of the model's own checks in green (heads under the roof, feet between the
 *     wheels, the battery fitting…): a replica that cannot hold its riders is not the car.
 * The photos are not in the repository (they are Lumeneo's): the traced outlines below are measurements of them, in
 * the photo's pixels, with the scale that turns them into metres.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { PARAMETROS_BASCULANTE, areas, calcular, crearModelo, type Parametros } from '../src/components/aeromovil/geometria';
import type { ModeloBasculante } from '../src/components/aeromovil/geometriaBasculante';
import { PARAMETROS_SMERA } from '../src/components/aeromovil/basculante/smera';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };

// ── the reference: the press side view (619 × 495 px). Front axle at x = 127.3 px, rear at 456.0 px: 1.70 m of
// wheelbase is 328.7 px, so 193.4 px/m; the ground (the tyres' bottom) at y = 398 px.
const ESC = 193.4, X0 = 127.3, Y0 = 398;
const aM = ([px, py]: [number, number]): [number, number] => [(X0 - px) / ESC, (Y0 - py) / ESC];
const aPx = (x: number, y: number): [number, number] => [X0 - x * ESC, Y0 - y * ESC];
/** The outline, clockwise from the bumper bar's top front corner, round the roof, down the back, under both wheels. */
const SILUETA_PX: [number, number][] = [
  [64, 323], [80, 322], [82, 306], [86, 289], [92.5, 272.5], [100.8, 255.8], [117.5, 235], [138.3, 216], [159, 195], [180, 176.7], [200.8, 164],
  [230, 149.6], [250, 140], [271.7, 129], [300.8, 123.8], [334, 120.8], [367.5, 120], [400.8, 120.8], [430, 121.7], [463, 123.8], [484, 125.8],
  [497, 129], [500, 171], [510, 185], [513, 200], [510, 222], [507, 241.7], [505, 279], [507, 296], [506.5, 330], [503, 365], [492, 384],
  [475, 395], [456, 398], [437, 395], [420, 384], [409, 365], [404, 340], [395, 318], [380, 329], [350, 333.6], [300, 339], [250, 341.8],
  [200, 342.7], [180, 345], [175, 365], [165, 384], [146, 395], [127.3, 398], [108, 395], [90, 384], [80, 365], [76.6, 350], [64, 345],
];
/** The glass seen from the side: the windscreen's side (ahead of the A-pillar), the door's window and the rear quarter's. */
const VENTANAS_PX: [number, number][][] = [
  [[142, 214], [168, 190], [200, 166], [235, 147], [262, 135], [240, 165], [215, 200], [203, 222]],
  [[253, 207], [384, 179], [385, 137], [281, 135]],
  [[396, 177], [447, 176], [426, 134], [396, 134]],
];
/** The press front view: the body's width (m) at heights (m), scale from its 1.45 m roof. */
const ANCHOS_FRENTE: [number, number][] = [[1.26, 0.58], [1.04, 0.69], [0.85, 0.77], [0.71, 0.68], [0.60, 0.57], [0.49, 0.48], [0.35, 0.42]];
/** Published (2008 car) and measured figures. */
const MEDIDAS = { largo: 2.38, alto: 1.45, ancho: 0.80, batalla: 1.70, via: 0.655, rueda: 0.52 };

// ── the model
const extra = arg('--json') ? JSON.parse(arg('--json')!) : {};
const P = { ...PARAMETROS_BASCULANTE, ...PARAMETROS_SMERA, ...extra } as unknown as Parametros;
const m = crearModelo(P) as ModeloBasculante, ar = areas(m), r = calcular(m, ar), F = m.F, d = m.det!;
if (!m.smera || !d) { console.log('Este diseño no tiene la carrocería del Smera: no hay nada que comparar.'); process.exit(1); }

// ── rasters (5 mm) in metres, over the photo's frame
const PASO = 0.005, XA = -2.3, XB = 0.45, YA = 0, YB = 1.6, NX = Math.round((XB - XA) / PASO), NY = Math.round((YB - YA) / PASO);
const rejilla = () => new Uint8Array(NX * NY);
const celda = (i: number, j: number) => [XA + (i + 0.5) * PASO, YA + (j + 0.5) * PASO] as const;
const dentro = (pol: [number, number][], x: number, y: number) => {
  let c = false; for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) { const [xi, yi] = pol[i], [xj, yj] = pol[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
  return c;
};
const iou = (a: Uint8Array, b: Uint8Array) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] && b[k]) i++; if (a[k] || b[k]) u++; } return u ? i / u : 0; };

const ref = rejilla(), mod = rejilla(), refV = rejilla(), modV = rejilla();
const silM = SILUETA_PX.map(aM), ventM = VENTANAS_PX.map(v => v.map(aM));
const ruedas = m.esquinas.filter(q => q.s > 0).map(q => ({ x: q.x, r: q.r }));
const b = d.barra;
for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
  const [x, y] = celda(i, j), k = j * NX + i;
  if (dentro(silM, x, y)) ref[k] = 1;
  if (ventM.some(v => dentro(v, x, y))) refV[k] = 1;
  let en = false;
  if (x <= m.xn && x >= m.xt) { const f = F.frame(x); if (y >= f.bot && y <= f.top) en = true; }
  if (!en) for (const w of ruedas) if (Math.hypot(x - w.x, y - w.r) <= w.r) en = true;
  if (!en && x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) en = true;
  if (!en && dentro(d.visera, x, y)) en = true;
  if (en) mod[k] = 1;
  // the glass as the skin paints it: the side's point at that height, its zone
  if (x <= m.xn && x >= m.xt) {
    const f = F.frame(x); if (y > f.bot && y < f.top) {
      const arriba = y >= f.yc, n = arriba ? F.D.nU : F.D.nL, hh = arriba ? f.top - f.yc : f.yc - f.bot;
      const s = Math.min(1, Math.pow(Math.abs(y - f.yc) / hh, n / 2)), th = arriba ? Math.asin(s) : -Math.asin(s);
      const z = m.zona(x, th); if (z === 'cristal' && F.ladoZ(x, y) > 0.55 * f.hw) modV[k] = 1;
    }
  }
}
const iouLado = iou(ref, mod), iouV = iou(refV, modV);

// ── the photo's own edges (optional): Sobel, the strongest 12 %, a distance map, and the model's outline on it
let chamfer: number | null = null;
const foto = arg('--lado');
if (foto) {
  const png = PNG.sync.read(readFileSync(foto)), W = png.width, H = png.height, g = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) g[k] = 0.299 * png.data[4 * k] + 0.587 * png.data[4 * k + 1] + 0.114 * png.data[4 * k + 2];
  const mag = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = (dx: number, dy: number) => g[(y + dy) * W + x + dx];
    const gx = p(1, -1) + 2 * p(1, 0) + p(1, 1) - p(-1, -1) - 2 * p(-1, 0) - p(-1, 1), gy = p(-1, 1) + 2 * p(0, 1) + p(1, 1) - p(-1, -1) - 2 * p(0, -1) - p(1, -1);
    mag[y * W + x] = Math.hypot(gx, gy);
  }
  const orden = Array.from(mag).sort((a, b) => b - a), umbral = orden[Math.floor(orden.length * 0.12)];
  const dist = new Float32Array(W * H).fill(1e9);
  for (let k = 0; k < W * H; k++) if (mag[k] >= umbral) dist[k] = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x; if (x) dist[k] = Math.min(dist[k], dist[k - 1] + 1); if (y) dist[k] = Math.min(dist[k], dist[k - W] + 1); if (x && y) dist[k] = Math.min(dist[k], dist[k - W - 1] + 1.414); if (y && x < W - 1) dist[k] = Math.min(dist[k], dist[k - W + 1] + 1.414); }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const k = y * W + x; if (x < W - 1) dist[k] = Math.min(dist[k], dist[k + 1] + 1); if (y < H - 1) dist[k] = Math.min(dist[k], dist[k + W] + 1); if (x < W - 1 && y < H - 1) dist[k] = Math.min(dist[k], dist[k + W + 1] + 1.414); if (y < H - 1 && x) dist[k] = Math.min(dist[k], dist[k + W - 1] + 1.414); }
  let suma = 0, n = 0;
  for (let i = 1; i < NX - 1; i++) for (let j = 1; j < NY - 1; j++) {
    const k = j * NX + i; if (!mod[k] || (mod[k - 1] && mod[k + 1] && mod[k - NX] && mod[k + NX])) continue;
    const [x, y] = celda(i, j), [px, py] = aPx(x, y), ix = Math.round(px), iy = Math.round(py);
    if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
    suma += Math.min(20, dist[iy * W + ix]); n++;
  }
  chamfer = n ? suma / n : null;
}

// ── the front widths
const anchoA = (h: number) => { let w = 0; for (let x = m.xn; x >= m.xt; x -= 0.005) { const z = F.ladoZ(x, h); if (Number.isFinite(z)) w = Math.max(w, 2 * z); } return w; };
const errFrente = ANCHOS_FRENTE.map(([h, w]) => ({ h, ref: w, mod: anchoA(h) }));
const mae = errFrente.reduce((a, e) => a + Math.abs(e.mod - e.ref), 0) / errFrente.length;

// ── the measures
const largoMod = Math.max(m.xn, d.barra.x1) - m.xt;
const med = [
  ['Largo (con la barra)', largoMod, MEDIDAS.largo], ['Alto', m.alto, MEDIDAS.alto], ['Ancho de la carrocería', m.anchoCuerpo, MEDIDAS.ancho], ['Batalla', m.batalla, MEDIDAS.batalla],
  ['Vía delantera', m.via.del, MEDIDAS.via], ['Vía trasera', m.via.tras, MEDIDAS.via], ['Rueda (diámetro)', 2 * m.rF, MEDIDAS.rueda],
] as [string, number, number][];
const nota = (e: number, tol: number) => Math.max(0, 1 - Math.abs(e) / tol);
const pMed = med.reduce((a, [, v, rf]) => a + nota((v - rf) / rf, 0.06), 0) / med.length;
const verdes = r.comprobaciones.filter(c => c.holgura >= c.minimo).length, total = r.comprobaciones.length;

const pLado = chamfer == null ? iouLado : 0.5 * iouLado + 0.5 * Math.max(0, 1 - chamfer / 8);
const puntos = { medidas: 20 * pMed, lado: 35 * pLado, frente: 15 * Math.max(0, 1 - mae / 0.10), cristales: 15 * iouV, comprobaciones: 15 * verdes / total };
const totalP = Object.values(puntos).reduce((a, v) => a + v, 0);
const f2 = (v: number, k = 2) => v.toFixed(k).replace('.', ',');

console.log(`\nLumeneo Smera: parecido con la realidad · ${Math.round(totalP)} / 100\n`);
console.log(`1. Medidas ................ ${f2(puntos.medidas, 1)} / 20`);
for (const [n, v, rf] of med) console.log(`     ${n.padEnd(24)} ${f2(v, 3)} m · real ${f2(rf, 3)} m · ${(v - rf) >= 0 ? '+' : ''}${f2((v - rf) * 100, 1)} cm`);
console.log(`2. Silueta de lado ........ ${f2(puntos.lado, 1)} / 35   (coincide el ${Math.round(iouLado * 100)} % del área${chamfer != null ? `; el contorno cae a ${f2(chamfer, 1)} px de media de los bordes de la foto (1 px = ${f2(1000 / ESC, 1)} mm)` : '; sin foto, solo el contorno calcado'})`);
console.log(`3. Anchos de frente ....... ${f2(puntos.frente, 1)} / 15   (error medio ${f2(mae * 100, 1)} cm)`);
for (const e of errFrente) console.log(`     a ${f2(e.h)} m: ${f2(e.mod)} m · foto ${f2(e.ref)} m`);
console.log(`4. Cristales de lado ...... ${f2(puntos.cristales, 1)} / 15   (coincide el ${Math.round(iouV * 100)} %)`);
console.log(`5. Comprobaciones ......... ${f2(puntos.comprobaciones, 1)} / 15   (${verdes} de ${total} en verde)`);
for (const c of r.comprobaciones.filter(c => c.holgura < c.minimo)) console.log(`     en rojo: ${c.nombre}`);

// (--png: the photo with the traced outline in blue, the model's outline in red and its side glass in cyan)
const pngOut = arg('--png');
if (pngOut && foto) {
  const png = PNG.sync.read(readFileSync(foto)), W = png.width, H = png.height;
  const pintar = (px: number, py: number, c: [number, number, number], a = 1) => { const ix = Math.round(px), iy = Math.round(py); if (ix < 0 || iy < 0 || ix >= W || iy >= H) return; const k = 4 * (iy * W + ix); for (let q = 0; q < 3; q++) png.data[k + q] = Math.round(png.data[k + q] * (1 - a) + c[q] * a); };
  for (let i = 1; i < NX - 1; i++) for (let j = 1; j < NY - 1; j++) {
    const k = j * NX + i, [x, y] = celda(i, j), [px, py] = aPx(x, y);
    if (modV[k]) pintar(px, py, [0, 200, 220], 0.35);
    if (mod[k] && !(mod[k - 1] && mod[k + 1] && mod[k - NX] && mod[k + NX])) pintar(px, py, [220, 30, 30]);
    if (ref[k] && !(ref[k - 1] && ref[k + 1] && ref[k - NX] && ref[k + NX])) pintar(px, py, [30, 80, 230]);
    if (refV[k] && !(refV[k - 1] && refV[k + 1] && refV[k - NX] && refV[k + NX])) pintar(px, py, [30, 80, 230]);
  }
  writeFileSync(pngOut, PNG.sync.write(png));
  console.log(`Superposición sobre la foto: ${pngOut}`);
}
const svg = arg('--svg');
if (svg) {
  const pts = (l: [number, number][]) => l.map(([x, y]) => aPx(x, y).map(v => v.toFixed(1)).join(',')).join(' ');
  let borde = '';
  for (let i = 1; i < NX - 1; i++) for (let j = 1; j < NY - 1; j++) { const k = j * NX + i; if (mod[k] && !(mod[k - 1] && mod[k + 1] && mod[k - NX] && mod[k + NX])) { const [x, y] = celda(i, j), [px, py] = aPx(x, y); borde += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="0.7" fill="#dc2626"/>`; } }
  writeFileSync(svg, `<svg xmlns="http://www.w3.org/2000/svg" width="619" height="495" viewBox="0 0 619 495">${foto ? `<image href="${foto}" width="619" height="495" opacity="0.6"/>` : ''}<polygon points="${pts(silM)}" fill="none" stroke="#2563eb" stroke-width="1.2"/>${ventM.map(v => `<polygon points="${pts(v)}" fill="none" stroke="#0891b2" stroke-width="1"/>`).join('')}${borde}</svg>`);
  console.log(`\nSuperposición: ${svg} (azul la foto calcada, rojo el contorno del modelo)`);
}
