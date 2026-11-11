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
import { SELECTORES_TRICICLO, camposTriciclo, deslizadoresTriciclo, estirarTriciclo, largoTriciclo, rangoTriciclo, type ModeloTriciclo } from '../src/components/aeromovil/geometriaTriciclo';
import { construirCon, crearMateriales } from '../src/components/aeromovil/garaje/balaModelo';
import * as THREE from 'three';

const M = crearMateriales();
let fallos = 0, casos = 0;
/** What must never poke through (a clearance below zero is a failure here). */
const NO_PASAN = ['Neumático delantero', 'Carenado delantero a la carrocería', 'Rueda trasera dentro', 'Manillar dentro', 'Bastidor dentro', 'Batería, ', 'Controlador dentro', 'Pies de la fila 2 dentro', 'Pies de la fila 3 dentro', 'Respaldo de la fila 3 a la torreta'];

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
    // (round two: a 1 m needle nose is under 1 cm tall 1 cm from its tip, so only a flat section fails)
    if (!(yt > yb + 0.002)) return `sección sin altura en x = ${x.toFixed(2)}`;
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
  // (built as the viewer builds it: since round three with the boot lid apart and, with three rows, their seats)
  const g = construirCon(m.F, { M, calidad: 'rapida', cupulaAparte: true, asientos: m.sillines, aleta: m.aleta, triciclo: { recPil: m.rec.piloto, recPas: m.rec.pasajero, man: m.man, pies: m.pies, faldon: m.faldon, ventanas: m.opcVentanas, maletero: true, ...(m.filas ? { filas: m.asientosFilas } : {}) } });
  const pods: THREE.Object3D[] = [], ruedas: THREE.Object3D[] = [];
  g.traverse(o => { if (o.name === 'carenado' && o.userData.lado) pods.push(o); if (o.name === 'rueda-direccion') ruedas.push(o); });
  if (pods.length !== 2 || ruedas.length !== 2) return `${pods.length} carenados y ${ruedas.length} ruedas que giran (deberían ser 2 y 2)`;
  for (const p of pods) {
    const r = ruedas.find(w => w.userData.lado === p.userData.lado)!;
    if (Math.abs(p.position.x - r.position.x) > 1e-9 || Math.abs(p.position.z - r.position.z) > 1e-9) return `el carenado ${p.userData.lado > 0 ? 'derecho' : 'izquierdo'} no gira sobre el eje de su rueda`;
  }
  let delantera = 0; g.traverse(o => { if (o.name === 'rueda-delantera') delantera++; });
  if (delantera) return 'hay una rueda delantera central';
  // round three: the boot lid hangs from its own pivot, with the fin on it
  const porton = g.getObjectByName('porton-maletero');
  if (!porton || !porton.getObjectByName('porton') || !porton.getObjectByName('aleta')) return 'falta la tapa del maletero (o la aleta no va en ella)';
  // and the seats: three rows draw four car seats (folded ones folded), astride none
  let asientos = 0, plegados = 0; g.traverse(o => { if (o.name === 'asiento') asientos++; if (o.name === 'respaldo-plegado') plegados++; });
  const esperados = m.filas ? 4 : 0, plegEsperados = m.asientosFilas.filter(a => a.plegado).length;
  if (asientos !== esperados || plegados !== plegEsperados) return `${asientos} asientos de coche (${plegados} plegados); deberían ser ${esperados} (${plegEsperados})`;
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
  // round three: the boot is never negative, and folding a row never shrinks it
  const e = t.maletero.estados.map(x => x.litros);
  if (e.some(v => !(v >= 0))) mal.push(`maletero sin sentido: ${e.map(Math.round).join(' / ')} L`);
  if (m.filas && !(e[1] >= e[0] - 1 && e[2] >= e[0] - 1 && e[3] >= Math.max(e[1], e[2]) - 1)) mal.push(`plegar una fila no agranda el maletero: ${e.map(Math.round).join(' / ')} L`);
  const alc = res.comprobaciones.find(c => c.nombre.startsWith('Manos'))!;
  console.log(`${mal.length ? 'FALLA' : 'OK   '} ${nombre.padEnd(46)} vuelco ${t.vuelco.ssf.toFixed(2)} g · cabezas ${cab} cm · alcance ${(alc.holgura * 100).toFixed(1)} cm · vía ${m.F.VIA_LAT.toFixed(2)}${t.viaSubida ? ' (subida)' : ''} · maletero ${Math.round(t.maletero.ahora)} L${mal.length ? '\n        ' + mal.join('\n        ') : ''}`);
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

// round two (2026-11-10): the wider ranges at their extremes, together
const GRANDE = { tAncho: 1.30, tBatalla: 3.20, tMorro: 1.00, tCola: 1.20, tCupFin: 2.90, tVia: 2.40, tKWNom: 30, tKWPico: 60, tKWh: 30, tRuedaDel: 'c15', tRuedaTras: 'c15' };
const BAJO = { tSuelo: 0.04, tAlto: 1.15, tPilY: 0.30, tPasY: 0.34, tRecPil: 35, tRecPas: 35, tManX: 0.25 };
probar('grande: lo más ancho, largo, potente, ruedas de 15″', { ...PARAMETROS_TRICICLO, ...GRANDE } as Parametros);
probar('grande y además bajo', { ...PARAMETROS_TRICICLO, ...GRANDE, ...BAJO } as Parametros);
probar('bajo: panza y cúpula al mínimo, reclinados', { ...PARAMETROS_TRICICLO, ...BAJO });
probar('bajo y estrecho, con ruedas de 28″', { ...PARAMETROS_TRICICLO, ...BAJO, tAncho: 0.77, tRuedaDel: '28', tRuedaTras: '28' });
probar('ancho y bajo, ruedas de coche, vía mínima, giro máximo', { ...PARAMETROS_TRICICLO, tAncho: 1.30, tSuelo: 0.04, tRuedaDel: 'c15', tRuedaTras: 'c13', tVia: 1.40, tGiro: 38, tPodEsc: 1.1, tPodCola: 1.3 });
probar('ruedas de coche, carenados al mínimo', { ...PARAMETROS_TRICICLO, ...extremo(0, CARENADOS), tRuedaDel: 'c14', tRuedaTras: 'c14' });
probar('largo al máximo, corto al mínimo de batalla', { ...PARAMETROS_TRICICLO, tMorro: 1.00, tCola: 1.20, tBatalla: 2.20 });
probar('batería de 30 kWh, carrocería de serie', { ...PARAMETROS_TRICICLO, tKWh: 30, tWhL: 160 });
probar('batería de 30 kWh, estrecha y con la panza alta', { ...PARAMETROS_TRICICLO, tKWh: 30, tWhL: 160, tAncho: 0.77, tSuelo: 0.158, tMorro: 0.45 });
probar('batería de 30 kWh, ancha y de morro largo', { ...PARAMETROS_TRICICLO, tKWh: 30, tWhL: 300, tAncho: 1.30, tMorro: 1.00 });
probar('60 kW en una rueda de 16″ con la batería al máximo', { ...PARAMETROS_TRICICLO, tKWNom: 30, tKWPico: 60, tRuedaTras: '20', tKWh: 30 });
{
  // «Largo total»: both ends of its slider, and it moves only nose, wheelbase, tail and the canopy's end
  const lg = largoTriciclo(T0);
  for (const [n, v] of [['mín.', lg.min], ['máx.', lg.max]] as const) {
    const o = estirarTriciclo(T0, v), claves = Object.keys(o).sort().join(',');
    if (claves !== 'tBatalla,tCola,tCupFin,tMorro') { console.log(`FALLA largo total ${n}: cambia ${claves}`); fallos++; }
    probar(`largo total ${n} (${v.toFixed(2)} m)`, { ...PARAMETROS_TRICICLO, ...o });
  }
}

// ── round three (2026-11-11): three rows (1 + 2 + 1), folding, an opening boot and up to 35 cm of clearance
const FILAS = { ...PARAMETROS_TRICICLO, tAsientos: 'filas' } as Parametros;
const TF = camposTriciclo(FILAS);
probar('tres filas por defecto', FILAS);
for (const [a, b] of [['abierta', 'plegada'], ['plegada', 'abierta'], ['plegada', 'plegada']]) probar(`tres filas: fila 2 ${a}, fila 3 ${b}`, { ...FILAS, tFila2: a, tFila3: b } as Parametros);
// every slider at both ends with three rows (their ranges with that layout: width, canopy and wheelbase have their own minimums)
for (const f of deslizadoresTriciclo()) {
  const [a, b] = rangoTriciclo(f.clave, TF);
  probar(`filas · ${f.clave} = ${+a.toFixed(3)} (mín.)`, { ...FILAS, [f.clave]: a });
  probar(`filas · ${f.clave} = ${+b.toFixed(3)} (máx.)`, { ...FILAS, [f.clave]: b });
}
probar('35 cm de altura libre, a horcajadas', { ...PARAMETROS_TRICICLO, tSuelo: 0.35 });
probar('35 cm con las ruedas más pequeñas (16″ y 20″)', { ...PARAMETROS_TRICICLO, tSuelo: 0.35, tRuedaDel: '16', tRuedaTras: '20' });
probar('35 cm con ruedas de coche y faldón cerrado', { ...PARAMETROS_TRICICLO, tSuelo: 0.35, tRuedaDel: 'c15', tRuedaTras: 'c15', tFaldon: 1 } as Parametros);
probar('35 cm, tres filas, lo más ancho', { ...FILAS, tSuelo: 0.35, tAncho: 1.30 });
probar('35 cm, tres filas, lo más ancho, todo plegado', { ...FILAS, tSuelo: 0.35, tAncho: 1.30, tFila2: 'plegada', tFila3: 'plegada' } as Parametros);
probar('tres filas, todo plegado, batería máxima', { ...FILAS, tFila2: 'plegada', tFila3: 'plegada', tKWh: 30, tWhL: 160 } as Parametros);
probar('tres filas, filas lo más separadas, basculante largo', { ...FILAS, tFila2X: 0.85, tFila3X: 0.80, tBasculante: 0.60, tRuedaTras: 'c15' } as Parametros);
probar('tres filas, filas juntas, reclinadas al máximo', { ...FILAS, tFila2X: 0.60, tFila3X: 0.55, tRecFila: 35 });
probar('tres filas, bajo y reclinado', { ...FILAS, ...BAJO, tRecFila: 35 });
probar('tres filas, grande', { ...FILAS, ...GRANDE } as Parametros);
probar('tres filas, 35 cm y grande', { ...FILAS, ...GRANDE, tSuelo: 0.35 } as Parametros);
{
  const lg = largoTriciclo(TF);
  for (const [n, v] of [['mín.', lg.min], ['máx.', lg.max]] as const) probar(`tres filas, largo total ${n} (${v.toFixed(2)} m)`, { ...FILAS, ...estirarTriciclo(TF, v) });
}

console.log(`\n${casos} casos, ${fallos ? `${fallos} con fallos` : 'todos OK'}`);
if (fallos) process.exitCode = 1;
