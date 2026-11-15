/**
 * The cornering circuit's numbers, printed so they can be checked by hand (2026-11-15).
 * Run with: npx tsx scripts/circuito-limites.ts
 *
 * For the Smera, the Aptera, the Twizy and the Model Y: the inputs, the rollover thresholds (upright and, for the
 * Smera, leaned at its maximum), which limit comes first, and the limit speed at each corner, dry and wet. Then the
 * formula cross-checks: the support-polygon threshold against the closed forms (t/2h, t·b/2hL, the editor's own
 * `umbralVuelco`), and that the track closes on itself.
 */
import { CURVAS, aLateral, limites, trazado, umbralVuelco, velocidadDe, veredicto, vuelta } from '../src/components/aeromovil/circuito/fisica';
import { FICHAS, fichaGaraje, fisicoDe } from '../src/components/aeromovil/circuito/datos';
import { umbralVuelco as umbralEditor } from '../src/components/aeromovil/geometriaTriciclo';

const f2 = (v: number) => v.toFixed(2), f0 = (v: number) => v.toFixed(0);
let fallos = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`); if (!c) fallos++; };

const ids = ['smera', 'aptera', 'twizy', 'modeloY'];
const fichas = ids.map(id => fichaGaraje(FICHAS.find(f => f.id === id)!));

console.log('== Datos (con las cotas del garaje encima, si las tiene)');
for (const f of fichas) {
  const F = fisicoDe(f);
  console.log(`${f.corto.padEnd(8)} ${f.disposicion.padEnd(8)} batalla ${f2(f.batalla)} m  vías ${f2(f.viaDel)}/${f2(f.viaTras)} m  h ${f2(f.h)} m${f.estimados.h ? ' (est.)' : ''}  delante ${f0(f.repartoDel * 100)} %${f.estimados.repartoDel ? ' (est.)' : ''}  xg ${f2(F.xg)} m  incl. ${f.inclinacionMax}°  vmax ${f.vmax} km/h`);
}

for (const mu of [0.8, 0.5]) {
  console.log(`\n== μ = ${mu} (${mu === 0.8 ? 'seco' : 'mojado'})`);
  for (const f of fichas) {
    const L = limites(fisicoDe(f), mu);
    const extra = f.inclinacionMax > 0 ? `  inclinado ${f.inclinacionMax}°: ${f2(L.vuelco)} g  (se equilibra solo hasta tan φ = ${f2(L.balanceo)} g)` : '';
    console.log(`${f.corto.padEnd(8)} vuelco de pie ${f2(L.vuelcoRigido)} g${extra}  agarre ${f2(mu)} g  → primero ${L.primero.toUpperCase()} a ${f2(L.limite)} g`);
    console.log('         ' + CURVAS.map(c => `${c.nombre} r${c.radio}: ${f0(velocidadDe(L.limite, c.radio))} km/h`).join(' · '));
  }
  if (mu === 0.8) {
    const sinB = limites(fisicoDe(fichas[0], { sinBasculacion: true }), mu);
    console.log(`Smera con la basculación apagada: vuelco ${f2(sinB.vuelcoRigido)} g → primero ${sinB.primero.toUpperCase()} · ` + CURVAS.map(c => `${c.nombre}: ${f0(velocidadDe(sinB.limite, c.radio))} km/h`).join(' · '));
  }
}

console.log('\n== Lectura a 50 km/h fijos, seco (μ 0,8)');
for (const c of CURVAS) {
  const a = aLateral(50 / 3.6, c.radio);
  console.log(`${c.nombre.padEnd(15)} a = ${f2(a)} g  ` + fichas.map(f => { const V = veredicto(limites(fisicoDe(f), 0.8), a); return `${f.corto} ${V.lectura} (margen ${f0(V.margen * 100)} %)`; }).join(' · '));
}

console.log('\n== Comprobaciones de las fórmulas');
const t = 1.2, h = 0.5, L = 2.0, b = 0.8;
ok(Math.abs(umbralVuelco([[L, t / 2], [L, -t / 2], [0, t / 2], [0, -t / 2]], 0.9, h) - t / (2 * h)) < 1e-9, `cuatro ruedas, misma vía: t/(2h) = ${f2(t / (2 * h))}`);
ok(Math.abs(umbralVuelco([[L, t / 2], [L, -t / 2], [0, 0]], b, h) - t * b / (2 * h * L)) < 1e-9, `tadpole: t·b/(2hL) = ${f2(t * b / (2 * h * L))}`);
ok(Math.abs(umbralVuelco([[L, t / 2], [L, -t / 2], [0, 0]], b, h) - umbralEditor(t, b, h, L)) < 1e-9, 'tadpole: igual que umbralVuelco del editor (geometriaTriciclo.ts)');
ok(Math.abs(umbralVuelco([[L, 0], [0, t / 2], [0, -t / 2]], b, h) - t * (L - b) / (2 * h * L)) < 1e-9, `delta: t·a/(2hL) = ${f2(t * (L - b) / (2 * h * L))}`);
const tf = 1.4, tr = 1.0;
ok(Math.abs(umbralVuelco([[L, tf / 2], [L, -tf / 2], [0, tr / 2], [0, -tr / 2]], b, h) - (tf * b / L + tr * (1 - b / L)) / (2 * h)) < 1e-9, 'cuatro ruedas, dos vías: la vía bajo el CdG / (2h), como el editor (ssf4)');
ok(Math.abs(umbralVuelco([[0, 0]], 0, h, 0.4) - Math.tan(0.4)) < 1e-9, 'una sola huella (moto): tan φ');
const phi = 25 * Math.PI / 180;
ok(Math.abs(umbralVuelco([[L, t / 2], [L, -t / 2], [0, t / 2], [0, -t / 2]], 0.9, h, phi) - (t / (2 * h * Math.cos(phi)) + Math.tan(phi))) < 1e-9, 'inclinado φ: t/(2h·cos φ) + tan φ');
const { puntos, largo } = trazado();
const fin = puntos[puntos.length - 1];
ok(Math.hypot(fin.x, fin.y) < 0.05 && Math.abs(fin.rumbo - 2 * Math.PI) < 1e-6, `el circuito se cierra: ${f2(Math.hypot(fin.x, fin.y))} m de error, ${f0(largo)} m de vuelta`);
for (const f of fichas) {
  const F = fisicoDe(f), Lm = limites(F, 0.8), vu = vuelta(F, Lm, 0.8, { tipo: 'apurar', fraccion: 0.9 }, puntos);
  const maxA = Math.max(...vu.a.map(Math.abs));
  ok(maxA <= 0.81 * Lm.limite + 1e-6, `${f.corto}: la vuelta al 90 % de la velocidad límite no pasa del 81 % de su límite lateral (${f2(maxA)} ≤ ${f2(0.81 * Lm.limite)} g), ${f0(vu.tiempo)} s${vu.ritmoChicane ? `; en la chicane pasa de ${f0(vu.ritmoChicane.desde)}° a ${f0(vu.ritmoChicane.hasta)}° en ${f2(vu.ritmoChicane.segundos)} s = ${f0(vu.ritmoChicane.gradosS)} °/s` : ''}`);
}
console.log(fallos ? `\n${fallos} FALLA` : '\n0 FALLA');
process.exit(fallos ? 1 : 0);
