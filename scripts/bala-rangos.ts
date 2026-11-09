/**
 * The Cuadriciclo Bala's sliders across their whole range (2026-11-09). Run with: npx tsx scripts/bala-rangos.ts
 *
 * Every slider at its minimum and at its maximum (the rest as in the garage), and every wheel size. For each:
 *  - the skin's sections are simple closed curves (no edge crosses another) with the belly below the top;
 *  - nothing pokes through: front and rear wheels inside the body, lateral tyres inside their pods, pods
 *    clear of the body, the handlebar inside (the head clearances are reported, not required: a low canopy
 *    is a design choice the checks warn about);
 *  - the 3D model builds without an error.
 * Heads are listed so the trade-off is visible.
 */
import { PARAMETROS_BALA, areas, calcular, crearModelo, type Parametros } from '../src/components/aeromovil/geometria';
import { DESLIZADORES_BALA, RUEDAS_DT_BALA, RUEDAS_LAT_BALA, camposBala, rangoBala, type ModeloBala } from '../src/components/aeromovil/geometriaBala';
import { construirCon, crearMateriales } from '../src/components/aeromovil/garaje/balaModelo';

const M = crearMateriales();
let fallos = 0;
const NO_PASAN = ['Rueda delantera', 'Rueda trasera', 'Neumático lateral', 'Carenado lateral', 'Manillar'];

/** Do two segments cross (not just touch at a shared end)? */
function cruzan(a: number[], b: number[], c: number[], d: number[]) {
  const o = (p: number[], q: number[], r: number[]) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return o(a, b, c) * o(a, b, d) < -1e-14 && o(c, d, a) * o(c, d, b) < -1e-14;
}
function pielSana(m: ModeloBala): string | null {
  const F = m.F;
  for (let x = F.X_MORRO - 0.01; x > F.X_COLA + 0.01; x -= 0.04) {
    const p = F.seccionRapida(x), pts: number[][] = [];
    // the closed section: right half bottom to top, then the left half top to bottom
    for (let k = 0; k < p.length / 2; k++) pts.push([p[2 * k], p[2 * k + 1]]);
    for (let k = p.length / 2 - 2; k > 0; k--) pts.push([-p[2 * k], p[2 * k + 1]]);
    const yb = Math.min(...pts.map(q => q[1])), yt = Math.max(...pts.map(q => q[1]));
    if (!(yt > yb + 0.01)) return `sección sin altura en x = ${x.toFixed(2)}`;
    if (pts.some(q => !Number.isFinite(q[0]) || !Number.isFinite(q[1]))) return `NaN en x = ${x.toFixed(2)}`;
    const n = pts.length;
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (cruzan(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return `la sección se cruza consigo misma en x = ${x.toFixed(2)}`;
    }
  }
  return null;
}
function probar(nombre: string, extra: Partial<Parametros>) {
  const m = crearModelo({ ...PARAMETROS_BALA, ...extra }) as ModeloBala, r = calcular(m, areas(m));
  const malas = r.comprobaciones.filter(c => NO_PASAN.some(n => c.nombre.startsWith(n)) && c.holgura < (c.nombre.startsWith('Carenado lateral') ? 0.028 : 0));
  const piel = pielSana(m);
  let error = '';
  try { construirCon(m.F, { M, asientos: m.sillines, aleta: m.aleta, cupulaAparte: true, calidad: 'rapida' }); } catch (e) { error = String(e); }
  const cab = r.comprobaciones.filter(c => c.nombre.startsWith('Cabeza')).map(c => (c.holgura * 100).toFixed(1)).join('/');
  const bien = !malas.length && !piel && !error;
  if (!bien) fallos++;
  console.log(`${bien ? 'OK   ' : 'FALLA'} ${nombre.padEnd(44)} cabezas ${cab.padEnd(20)} ${malas.map(c => `${c.nombre} ${(c.holgura * 100).toFixed(1)} cm`).join('; ')}${piel ? ' · ' + piel : ''}${error ? ' · ' + error : ''}`);
}

console.log('cabezas: piloto media/alta, pasajero media/alta (cm)');
probar('de serie (el del garaje)', {});
const B0 = camposBala(PARAMETROS_BALA);
for (const f of DESLIZADORES_BALA) {
  const [lo, hi] = rangoBala(f.clave, B0);
  probar(`${f.n} = ${lo}`, { [f.clave]: lo });
  probar(`${f.n} = ${hi}`, { [f.clave]: hi });
}
for (const r of RUEDAS_DT_BALA) probar(`Ruedas delantera y trasera ${r}″`, { bRuedaDT: r });
for (const r of RUEDAS_LAT_BALA) probar(`Ruedas laterales ${r}″`, { bRuedaLat: r });
// the extremes that pull against each other
probar('corto: batalla, morro y cola al mínimo', { bBatalla: 2.20, bMorro: 0.50, bCola: 0.50 });
probar('morro corto con ruedas de 26″', { bMorro: 0.50, bRuedaDT: '26' });
probar('cola corta con ruedas de 26″', { bCola: 0.50, bRuedaDT: '26' });
probar('estrecho y bajo', { bAncho: 0.78, bAlto: 1.32, bSuelo: 0.18 });
probar('ancho, alto y laterales de 24″', { bAncho: 1.0, bAlto: 1.6, bRuedaLat: '24', bVia: 1.0 });
probar('cúpula corta y tardía, batalla corta', { bBatalla: 2.20, bCupIni: 0.40, bCupFin: 1.70 });
probar('ocupantes atrás y altos', { bPilX: 1.20, bPasX: 1.80, bPilY: 0.50, bPasY: 0.54 });
console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo OK');
process.exit(fallos ? 1 : 0);
