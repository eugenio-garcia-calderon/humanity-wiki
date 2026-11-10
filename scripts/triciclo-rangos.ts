/**
 * The Triciclo Bala's sliders across their whole range (2026-11-10). Run with: npx tsx scripts/triciclo-rangos.ts
 *
 * Every slider at its minimum and at its maximum (the rest by default), every selector option, and a set of
 * extreme combinations. For each:
 *  - the skin's sections are simple closed curves (no edge crosses another) with the belly below the top;
 *  - nothing pokes through: the front tyres inside their pods, the pods clear of the body straight and at
 *    full lock, the rear wheel inside the tail with the suspension compressed, the handlebar, the frame, the
 *    battery modules and the controller inside the body;
 *  - the 3D model builds without an error, and each front pod turns about the same vertical axis as its
 *    wheel (so the tyre stays inside its pod at any lock);
 *  - the rollover threshold, the heads and the reach are listed, not required: they are the trade-offs the
 *    checks warn about on screen.
 */
import { PARAMETROS_TRICICLO, areas, calcular, crearModelo, type Parametros } from '../src/components/aeromovil/geometria';
import { SELECTORES_TRICICLO, camposTriciclo, deslizadoresTriciclo, rangoTriciclo, type ModeloTriciclo } from '../src/components/aeromovil/geometriaTriciclo';
import { construirCon, crearMateriales } from '../src/components/aeromovil/garaje/balaModelo';
import * as THREE from 'three';

const M = crearMateriales();
let fallos = 0, casos = 0;
/** What must never poke through (a clearance below zero is a failure here). */
const NO_PASAN = ['Neumático delantero', 'Carenado delantero a la carrocería', 'Rueda trasera dentro', 'Manillar dentro', 'Bastidor dentro', 'Batería, ', 'Controlador dentro'];

function cruzan(a: number[], b: number[], c: number[], d: number[]) {
  const o = (p: number[], q: number[], r: number[]) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return o(a, b, c) * o(a, b, d) < -1e-14 && o(c, d, a) * o(c, d, b) < -1e-14;
}
function pielSana(m: ModeloTriciclo): string | null {
  const F = m.F;
  for (let x = F.X_MORRO - 0.01; x > F.X_COLA + 0.01; x -= 0.04) {
    const p = F.seccionRapida(x), pts: number[][] = [];
    for (let k = 0; k < p.length / 2; k++) pts.push([p[2 * k], p[2 * k + 1]]);
    for (let k = p.length / 2 - 2; k > 0; k--) pts.push([-p[2 * k], p[2 * k + 1]]);
    if (pts.some(q => !Number.isFinite(q[0]) || !Number.isFinite(q[1]))) return `NaN en x = ${x.toFixed(2)}`;
    const yb = Math.min(...pts.map(q => q[1])), yt = Math.max(...pts.map(q => q[1]));
    if (!(yt > yb + 0.01)) return `sección sin altura en x = ${x.toFixed(2)}`;
    const n = pts.length;
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (cruzan(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return `la sección se cruza consigo misma en x = ${x.toFixed(2)}`;
    }
  }
  return null;
}
/** Each front pod's group and its wheel's group stand on the same vertical axis (x, z), so they turn together. */
function mismoEje(m: ModeloTriciclo): string | null {
  const g = construirCon(m.F, { M, calidad: 'rapida', cupulaAparte: true, asientos: m.sillines, aleta: m.aleta, triciclo: { recPil: m.rec.piloto, recPas: m.rec.pasajero, man: m.man, pies: m.pies, faldon: m.faldon } });
  const pods: THREE.Object3D[] = [], ruedas: THREE.Object3D[] = [];
  g.traverse(o => { if (o.name === 'carenado' && o.userData.lado) pods.push(o); if (o.name === 'rueda-direccion') ruedas.push(o); });
  if (pods.length !== 2 || ruedas.length !== 2) return `${pods.length} carenados y ${ruedas.length} ruedas que giran (deberían ser 2 y 2)`;
  for (const p of pods) {
    const r = ruedas.find(w => w.userData.lado === p.userData.lado)!;
    if (Math.abs(p.position.x - r.position.x) > 1e-9 || Math.abs(p.position.z - r.position.z) > 1e-9) return `el carenado ${p.userData.lado > 0 ? 'derecho' : 'izquierdo'} no gira sobre el eje de su rueda`;
  }
  let delantera = 0; g.traverse(o => { if (o.name === 'rueda-delantera') delantera++; });
  if (delantera) return 'hay una rueda delantera central';
  return null;
}

function probar(nombre: string, P: Parametros) {
  casos++;
  let m: ModeloTriciclo;
  try { m = crearModelo(P) as ModeloTriciclo; } catch (e) { console.log(`FALLA ${nombre}: el modelo no se construye (${(e as Error).message})`); fallos++; return; }
  const res = calcular(m, areas(m)), mal: string[] = [];
  const piel = pielSana(m); if (piel) mal.push(piel);
  for (const c of res.comprobaciones) if (NO_PASAN.some(n => c.nombre.startsWith(n)) && !(c.holgura >= 0)) mal.push(`${c.nombre}: ${(c.holgura * 100).toFixed(1)} cm`);
  try { const e = mismoEje(m); if (e) mal.push(e); } catch (e) { mal.push(`el 3D falla: ${(e as Error).message}`); }
  const t = res.triciclo!, cab = t.cabezas.map(c => `${c.quien} ${(c.p50 * 100).toFixed(1)}/${(c.p95 * 100).toFixed(1)}`).join(', ');
  const alc = res.comprobaciones.find(c => c.nombre.startsWith('Manos'))!;
  console.log(`${mal.length ? 'FALLA' : 'OK   '} ${nombre.padEnd(46)} vuelco ${t.vuelco.ssf.toFixed(2)} g · cabezas ${cab} cm · alcance ${(alc.holgura * 100).toFixed(1)} cm · vía ${m.F.VIA_LAT.toFixed(2)}${t.viaSubida ? ' (subida)' : ''}${mal.length ? '\n        ' + mal.join('\n        ') : ''}`);
  if (mal.length) fallos++;
}

const T0 = camposTriciclo(PARAMETROS_TRICICLO);
probar('por defecto', PARAMETROS_TRICICLO);
for (const f of deslizadoresTriciclo()) {
  const [a, b] = rangoTriciclo(f.clave, T0);
  probar(`${f.clave} = ${+a.toFixed(3)} (mín.)`, { ...PARAMETROS_TRICICLO, [f.clave]: a });
  probar(`${f.clave} = ${+b.toFixed(3)} (máx.)`, { ...PARAMETROS_TRICICLO, [f.clave]: b });
}
for (const s of SELECTORES_TRICICLO) for (const o of s.opciones) probar(`${s.clave} = ${o.k}`, { ...PARAMETROS_TRICICLO, [s.clave]: o.k });

// extreme combinations: each slider's range for the others' values comes from the model itself (it clamps)
const extremo = (lado: 0 | 1, claves: string[]) => {
  const P: Record<string, unknown> = { ...PARAMETROS_TRICICLO };
  for (const f of deslizadoresTriciclo()) if (claves.includes(f.clave)) P[f.clave] = lado ? f.max : f.min;
  return P as unknown as Parametros;
};
const FORMA = ['tAncho', 'tSuelo', 'tMorro', 'tPuntaMorro', 'tCola', 'tPuntaCola', 'tAleta', 'tCupIni', 'tCupFin', 'tAlto', 'tBatalla'];
const CARENADOS = ['tPodEsc', 'tPodAncho', 'tPodCola', 'tBrazo', 'tFaldon'];
probar('toda la forma al mínimo', extremo(0, FORMA));
probar('toda la forma al máximo', extremo(1, FORMA));
probar('carenados al mínimo', extremo(0, CARENADOS));
probar('carenados al máximo', extremo(1, CARENADOS));
probar('carenados al máximo, vía mínima, giro máximo', { ...extremo(1, CARENADOS), tVia: 1.40, tGiro: 38 });
probar('carrocería ancha, vía mínima, giro máximo', { ...PARAMETROS_TRICICLO, tAncho: 0.93, tVia: 1.40, tGiro: 38, tPodEsc: 1.1, tPodAncho: 1.2, tPodCola: 1.3 });
probar('eje delantero en 0 y en 45 cm, vía mínima', { ...PARAMETROS_TRICICLO, tEjeDel: 0, tVia: 1.40, tGiro: 38 });
probar('eje delantero a 45 cm, carenados grandes', { ...PARAMETROS_TRICICLO, tEjeDel: 0.45, tVia: 1.40, tGiro: 38, tPodEsc: 1.1, tPodCola: 1.3 });
probar('ruedas más grandes, bajos al mínimo', { ...PARAMETROS_TRICICLO, tRuedaDel: '24', tRuedaTras: '26', tSuelo: 0.09, tRecTras: 110 });
probar('ruedas más pequeñas, bajos al máximo', { ...PARAMETROS_TRICICLO, tRuedaDel: '16', tRuedaTras: '20', tSuelo: 0.158 });
probar('batería máxima, menos densa', { ...PARAMETROS_TRICICLO, tKWh: 13, tWhL: 160, tWhKg: 120 });
probar('batería máxima, carrocería estrecha y baja', { ...PARAMETROS_TRICICLO, tKWh: 13, tWhL: 160, tAncho: 0.77, tSuelo: 0.158 });
probar('sillines altos, reclinados al máximo', { ...PARAMETROS_TRICICLO, tPilY: 0.50, tPasY: 0.52, tRecPil: 20, tRecPas: 20 });
probar('sillines bajos, inclinados hacia delante', { ...PARAMETROS_TRICICLO, tPilY: 0.38, tPasY: 0.42, tRecPil: -10, tRecPas: -10 });
probar('manillar y plataformas en los extremos (1)', { ...PARAMETROS_TRICICLO, tManX: 0.10, tManY: 0.10, tPiesX: 0.08, tPiesY: 0.04 });
probar('manillar y plataformas en los extremos (2)', { ...PARAMETROS_TRICICLO, tManX: -0.06, tManY: -0.02, tPiesX: -0.08, tPiesY: -0.04, tAncho: 0.77 });
probar('tubos gruesos, carrocería estrecha y baja', { ...PARAMETROS_TRICICLO, tChD: 60, tAncho: 0.77, tSuelo: 0.09 });
probar('basculante corto y largo con la rueda grande', { ...PARAMETROS_TRICICLO, tBasculante: 0.40, tRuedaTras: '26', tRecTras: 110 });
probar('pasajero lo más atrás, cola corta', { ...PARAMETROS_TRICICLO, tPasX: 1.80, tCola: 0.45, tBatalla: 2.20 });

console.log(`\n${casos} casos, ${fallos ? `${fallos} con fallos` : 'todos OK'}`);
if (fallos) process.exitCode = 1;
