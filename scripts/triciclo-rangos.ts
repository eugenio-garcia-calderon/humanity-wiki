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
import { SELECTORES_TRICICLO, camposTriciclo, deslizadoresTriciclo, estirarTriciclo, largoTriciclo, opcionesCabinaTriciclo, rangoTriciclo, type ModeloTriciclo } from '../src/components/aeromovil/geometriaTriciclo';
import { carenadoCuerpo } from '../src/components/aeromovil/geometriaBala';
import { alturasPod, brazosDe, podDe, semiAncho } from '../src/components/aeromovil/garaje/balaMedidas';
import { construirCon, crearMateriales } from '../src/components/aeromovil/garaje/balaModelo';
import * as THREE from 'three';
import { deDiseno } from '../src/components/aeromovil/Disenos';
import { CLASICO_GUARDADO } from './clasicoGuardado';

const M = crearMateriales();
let fallos = 0, casos = 0;
/** What must never poke through (a clearance below zero is a failure here). */
const NO_PASAN = ['Neumático delantero', 'Carenado delantero a la carrocería', 'Neumático trasero', 'Carenado trasero a la carrocería', 'Rueda trasera dentro', 'Manillar dentro', 'Bastidor dentro', 'Batería, ', 'Controlador dentro', 'Pies de la fila 2 dentro', 'Pies de la fila 3 dentro', 'Respaldo de la fila 3 a la torreta',
  // 2026-11-12: the pack along the frame, the steering wheel, the dashboard, the doors and the hatch as they swing, the mirrors
  'Batería: paquete', 'Volante dentro', 'Salpicadero dentro', 'Puerta: al abrirse', 'Puerta abierta al', 'Portón: al abrirse', 'Retrovisor al carenado',
  // round 3 (2026-11-12): the passengers' door as it swings, and the leaves through each other or through the hatch (a
  // negative clearance there is one piece going under the other; under 3 cm and positive is a warning on screen)
  'Puerta de atrás: al abrirse', 'Puerta de atrás abierta a', 'Puertas: la de delante', 'Puertas y portón'];
// (round 3: «Segunda puerta: cabe» is red, not a failure: with no room the model builds one door and says so)

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
  // (2026-11-12: with every option, `opcionesCabinaTriciclo`, as the viewer)
  const g = construirCon(m.F, { M, calidad: 'rapida', cupulaAparte: true, asientos: m.sillines, aleta: m.aleta, triciclo: opcionesCabinaTriciclo(m) });
  const pods: THREE.Object3D[] = [], ruedas: THREE.Object3D[] = [];
  g.traverse(o => { if (o.name === 'carenado' && o.userData.lado) pods.push(o); if (o.name === 'rueda-direccion') ruedas.push(o); });
  if (pods.length !== 2 || ruedas.length !== 2) return `${pods.length} carenados y ${ruedas.length} ruedas que giran (deberían ser 2 y 2)`;
  for (const p of pods) {
    const r = ruedas.find(w => w.userData.lado === p.userData.lado)!;
    if (Math.abs(p.position.x - r.position.x) > 1e-9 || Math.abs(p.position.z - r.position.z) > 1e-9) return `el carenado ${p.userData.lado > 0 ? 'derecho' : 'izquierdo'} no gira sobre el eje de su rueda`;
  }
  let delantera = 0; g.traverse(o => { if (o.name === 'rueda-delantera') delantera++; });
  if (delantera) return 'hay una rueda delantera central';
  // four wheels (2026-11-11): two rear wheels, each in a rear pod on its own axis (they do not steer), and no spat
  let traseras = 0, podsT = 0; const ejesT: string[] = [], ejesP: string[] = [];
  g.traverse(o => {
    if (o.name === 'rueda-trasera') { traseras++; ejesT.push(`${o.position.x.toFixed(6)},${o.position.z.toFixed(6)}`); }
    if (o.name === 'carenado-trasero') { podsT++; ejesP.push(`${o.position.x.toFixed(6)},${o.position.z.toFixed(6)}`); if (o.userData.lado) return; }
  });
  if (traseras !== (m.cuatro ? 2 : 1) || podsT !== (m.cuatro ? 2 : 0)) return `${traseras} ruedas traseras y ${podsT} carenados traseros (deberían ser ${m.cuatro ? '2 y 2' : '1 y 0'})`;
  if (m.cuatro && ejesT.sort().join(' ') !== ejesP.sort().join(' ')) return 'un carenado trasero no está centrado en su rueda';
  if (m.cuatro && g.getObjectByName('faldon')) return 'hay faldón sin rueda en la cola';
  // round three: the boot lid hangs from its own pivot, with the fin on it
  const porton = g.getObjectByName('porton-maletero');
  // (round 3: «Sin aleta» has none, anywhere)
  if (!porton || !porton.getObjectByName('porton') || (m.aleta !== null) !== !!porton.getObjectByName('aleta')) return m.aleta === null ? 'hay aleta con «Sin aleta»' : 'falta la tapa del maletero (o la aleta no va en ella)';
  // 2026-11-12: the Aptera doors, each on its hinge with its skin and its glass; the canopy then does not open
  if (m.puerta) {
    for (const n of ['puerta-der', 'puerta-izq', 'puerta-der-cristal', 'puerta-izq-cristal']) {
      const p = g.getObjectByName(n); if (!p || !p.userData.eje) return `falta ${n} (o su eje)`;
      let tri = 0; p.traverse(o => { const q = o as THREE.Mesh; if (q.isMesh) tri += (q.geometry.getIndex()?.count ?? 0) / 3; });
      if (tri < 50) return `${n} casi vacía (${tri} triángulos)`;
    }
    if (g.getObjectByName('cupula-marco')) return 'con puertas, la cúpula sigue abriéndose';
    if (m.retrovisor && !g.getObjectByName('puerta-der')!.getObjectByName('retrovisor')) return 'el retrovisor no va en la puerta';
    // round 3: the passengers' doors on their own hinges, with the B- and C-pillars and the hinge knuckles
    if (m.puerta.segunda) {
      for (const n of ['puerta-tras-der', 'puerta-tras-izq', 'puerta-tras-der-cristal', 'puerta-tras-izq-cristal']) {
        const p = g.getObjectByName(n); if (!p || !p.userData.eje) return `falta ${n} (o su eje)`;
        let tri = 0; p.traverse(o => { const q = o as THREE.Mesh; if (q.isMesh) tri += (q.geometry.getIndex()?.count ?? 0) / 3; });
        if (tri < 50) return `${n} casi vacía (${tri} triángulos)`;
      }
      for (const n of ['montante-b', 'montante-c', 'bisagra-trasera']) if (!g.getObjectByName(n)) return `falta ${n}`;
    } else if (g.getObjectByName('puerta-tras-der')) return 'hay puerta de atrás sin pedirla';
  }
  // round 3: the central headlamp and the nose panel, when asked
  if (!!m.faro !== !!g.getObjectByName('faro-central')) return 'el faro central no es el que se pide';
  if (m.porton && !g.getObjectByName('porton-maletero-cristal')) return 'el portón largo no se lleva su cristal';
  if (m.volante && !g.getObjectByName('volante')) return 'falta el volante';
  if (m.salpicadero && !g.getObjectByName('salpicadero')) return 'falta el salpicadero';
  // and the seats: three rows draw four car seats (folded ones folded), astride none
  let asientos = 0, plegados = 0; g.traverse(o => { if (o.name === 'asiento') asientos++; if (o.name === 'respaldo-plegado') plegados++; });
  const esperados = m.filas ? 4 : 0, plegEsperados = m.asientosFilas.filter(a => a.plegado).length;
  if (asientos !== esperados || plegados !== plegEsperados) return `${asientos} asientos de coche (${plegados} plegados); deberían ser ${esperados} (${plegEsperados})`;
  return null;
}

/**
 * Four wheels (2026-11-11): the rear pods never intersect the body. Apart from the check on screen (3 cm, the pod's
 * inner face against the tail along its length and up its height), here: its whole outline at 20 heights and 40
 * stations, inner and outer face, must be outside the body (the body's half-width there below the pod's inner face),
 * and both arms must meet the skin (an arm whose root falls under the belly or past the tail would hang in the air).
 */
function podsTraseros(m: ModeloTriciclo): string | null {
  const Ft = m.traseras!, POD = podDe(Ft), ancho = semiAncho(POD), zp = Ft.VIA_LAT / 2;
  let h = 9;
  for (let i = 0; i <= 40; i++) {
    const xr = POD[0].x + (POD[POD.length - 1].x - POD[0].x) * i / 40, alt = alturasPod(POD, xr); if (!alt) continue;
    for (let j = 0; j <= 20; j++) {
      const y = alt[0] + (alt[1] - alt[0]) * j / 20, w = ancho(xr, y), zb = m.F.ladoZ(Ft.X_LAT + xr, y);
      if (Number.isFinite(zb)) h = Math.min(h, zp - w - zb);
    }
  }
  if (!(h > 0) || !(carenadoCuerpo(Ft) > 0)) return `un carenado trasero toca la carrocería (${(Math.min(h, carenadoCuerpo(Ft)) * 100).toFixed(1)} cm)`;
  for (const b of brazosDe(Ft)) {
    const z0 = m.F.ladoZ(Ft.X_LAT + b.x, b.yCuerpo);
    if (!Number.isFinite(z0)) return `un brazo trasero no llega a la carrocería (a ${(b.yCuerpo * 100).toFixed(0)} cm de alto)`;
    if (!(z0 < zp - 0.02)) return 'un brazo trasero nace fuera de su carenado';
  }
  return null;
}

/** `npx tsx scripts/triciclo-rangos.ts clásico` runs only the cases whose name starts with that (the whole run takes ~30 min on a loaded machine). */
const SOLO = process.argv[2];
function probar(nombre: string, P: Parametros) {
  if (SOLO && !nombre.startsWith(SOLO)) return;
  casos++;
  let m: ModeloTriciclo;
  try { m = crearModelo(P) as ModeloTriciclo; } catch (e) { console.log(`FALLA ${nombre}: el modelo no se construye (${(e as Error).message})`); fallos++; return; }
  const res = calcular(m, areas(m)), mal: string[] = [];
  const piel = pielSana(m); if (piel) mal.push(piel);
  // (2026-11-12: a check whose own minimum is below 0, the doors' and the hatch's «entra», fails under that minimum)
  // (round 2: the hinge's own sliders, at their ends, can make the door graze the body while it swings, and the
  // screen says so in red: «Fuera de la tangente… la comprobación lo dice». There that check is listed, not required)
  const avisos: string[] = [], bisagra = /tBisagra|todo lo nuevo/.test(nombre);
  for (const c of res.comprobaciones) if (NO_PASAN.some(n => c.nombre.startsWith(n)) && !(c.holgura >= Math.min(0, c.minimo))) (bisagra && c.nombre.startsWith('Puerta: al abrirse') ? avisos : mal).push(`${c.nombre}: ${(c.holgura * 100).toFixed(1)} cm`);
  try { const e = mismoEje(m); if (e) mal.push(e); } catch (e) { mal.push(`el 3D falla: ${(e as Error).message}`); }
  if (m.traseras) { const e = podsTraseros(m); if (e) mal.push(e); }
  const t = res.triciclo!, cab = t.cabezas.map(c => `${c.quien} ${(c.p50 * 100).toFixed(1)}/${(c.p95 * 100).toFixed(1)}`).join(', ');
  // round three: the boot is never negative, and folding a row never shrinks it
  const e = t.maletero.estados.map(x => x.litros);
  if (e.some(v => !(v >= 0))) mal.push(`maletero sin sentido: ${e.map(Math.round).join(' / ')} L`);
  if (m.filas && !(e[1] >= e[0] - 1 && e[2] >= e[0] - 1 && e[3] >= Math.max(e[1], e[2]) - 1)) mal.push(`plegar una fila no agranda el maletero: ${e.map(Math.round).join(' / ')} L`);
  const alc = res.comprobaciones.find(c => c.nombre.startsWith('Manos'))!;
  console.log(`${mal.length ? 'FALLA' : 'OK   '} ${nombre.padEnd(46)}${m.traseras ? ` vía tras. ${m.traseras.VIA_LAT.toFixed(2)} · carenado tras. ${(carenadoCuerpo(m.traseras) * 100).toFixed(1)} cm ·` : ''} vuelco ${t.vuelco.ssf.toFixed(2)} g · cabezas ${cab} cm · alcance ${(alc.holgura * 100).toFixed(1)} cm · vía ${m.F.VIA_LAT.toFixed(2)}${t.viaSubida ? ' (subida)' : ''} · maletero ${Math.round(t.maletero.ahora)} L${mal.length ? '\n        ' + mal.join('\n        ') : ''}${avisos.length ? '\n        AVISO (en rojo en pantalla) ' + avisos.join('\n        AVISO ') : ''}`);
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
    // 2026-11-12 («que no cambie la forma del morro y la cola»): only the wheelbase and the canopy's end with it
    const o = estirarTriciclo(T0, v), claves = Object.keys(o).sort().join(',');
    if (claves !== 'tBatalla,tCupFin') { console.log(`FALLA largo total ${n}: cambia ${claves}`); fallos++; }
    probar(`largo total ${n} (${v.toFixed(2)} m)`, { ...PARAMETROS_TRICICLO, ...o });
    // and the nose (ahead of x = 0) and the tail (behind the rear axle, measured from it) keep every section
    const a = crearModelo(PARAMETROS_TRICICLO) as ModeloTriciclo, b = crearModelo({ ...PARAMETROS_TRICICLO, ...o } as Parametros) as ModeloTriciclo;
    let dif = 0;
    for (let x = 0; x < a.F.X_MORRO; x += 0.01) { const p = a.F.seccionRapida(x), q = b.F.seccionRapida(x); for (let k = 0; k < p.length; k++) dif = Math.max(dif, Math.abs(p[k] - q[k])); }
    for (let d = 0; d < -a.F.X_COLA - a.F.BATALLA; d += 0.01) { const p = a.F.seccionRapida(-a.F.BATALLA - d), q = b.F.seccionRapida(-b.F.BATALLA - d); for (let k = 0; k < p.length; k++) dif = Math.max(dif, Math.abs(p[k] - q[k])); }
    const lm = (mm: ModeloTriciclo) => [mm.F.X_MORRO, -mm.F.X_COLA - mm.F.BATALLA].map(v => v.toFixed(6)).join('/');
    if (dif > 2e-4 || lm(a) !== lm(b)) { console.log(`FALLA largo total ${n}: el morro o la cola cambian (${(dif * 1000).toFixed(2)} mm; largos ${lm(a)} → ${lm(b)})`); fallos++; }
    else { casos++; console.log(`OK    largo total ${n}: morro y cola iguales (sección a sección, ${(dif * 1000).toFixed(3)} mm), largos ${lm(b)} m`); }
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

// ── four wheels (2026-11-11): «Bala de cuatro ruedas», the same Triciclo with two rear wheels in pods
const CUATRO = { ...PARAMETROS_TRICICLO, tTraseras: 'dos' } as Parametros;
const T4 = camposTriciclo(CUATRO);
const conVia = (P: Parametros, lado: 0 | 1) => ({ ...P, tViaTras: rangoTriciclo('tViaTras', camposTriciclo(P))[lado] } as Parametros);
probar('cuatro ruedas por defecto', CUATRO);
for (const f of deslizadoresTriciclo()) {
  const [a, b] = rangoTriciclo(f.clave, T4);
  probar(`cuatro · ${f.clave} = ${+a.toFixed(3)} (mín.)`, { ...CUATRO, [f.clave]: a });
  probar(`cuatro · ${f.clave} = ${+b.toFixed(3)} (máx.)`, { ...CUATRO, [f.clave]: b });
}
for (const s of SELECTORES_TRICICLO) for (const o of s.opciones) probar(`cuatro · ${s.clave} = ${o.k}`, { ...CUATRO, [s.clave]: o.k });
// every rear wheel at both ends of the rear track, with the pods at their smallest and largest, low and at 35 cm
for (const r of SELECTORES_TRICICLO.find(s => s.clave === 'tRuedaTras')!.opciones.map(o => o.k)) for (const lado of [0, 1] as const) {
  const n = `rueda trasera ${r}, vía trasera ${lado ? 'máx.' : 'mín.'}`;
  probar(`cuatro · ${n}`, conVia({ ...CUATRO, tRuedaTras: r } as Parametros, lado));
  probar(`cuatro · ${n}, carenados grandes`, conVia({ ...CUATRO, ...extremo(1, CARENADOS), tRuedaTras: r, tTraseras: 'dos' } as Parametros, lado));
  probar(`cuatro · ${n}, carenados pequeños`, conVia({ ...CUATRO, ...extremo(0, CARENADOS), tRuedaTras: r, tTraseras: 'dos' } as Parametros, lado));
  probar(`cuatro · ${n}, 35 cm`, conVia({ ...CUATRO, tRuedaTras: r, tSuelo: 0.35 } as Parametros, lado));
  probar(`cuatro · ${n}, panza al mínimo`, conVia({ ...CUATRO, tRuedaTras: r, tSuelo: 0.04 } as Parametros, lado));
}
const FILAS4 = { ...CUATRO, tAsientos: 'filas' } as Parametros;
for (const lado of [0, 1] as const) {
  const v = lado ? 'máx.' : 'mín.';
  probar(`cuatro · vía trasera ${v}, tres filas`, conVia(FILAS4, lado));
  probar(`cuatro · vía trasera ${v}, tres filas plegadas`, conVia({ ...FILAS4, tFila2: 'plegada', tFila3: 'plegada' } as Parametros, lado));
  probar(`cuatro · vía trasera ${v}, 35 cm, lo más ancho`, conVia({ ...CUATRO, tSuelo: 0.35, tAncho: 1.30 }, lado));
  probar(`cuatro · vía trasera ${v}, 35 cm, tres filas, lo más ancho`, conVia({ ...FILAS4, tSuelo: 0.35, tAncho: 1.30 }, lado));
  probar(`cuatro · vía trasera ${v}, grande, ruedas de 15″`, conVia({ ...CUATRO, ...GRANDE } as Parametros, lado));
  probar(`cuatro · vía trasera ${v}, grande y 35 cm`, conVia({ ...CUATRO, ...GRANDE, tSuelo: 0.35 } as Parametros, lado));
  probar(`cuatro · vía trasera ${v}, grande y bajo`, conVia({ ...CUATRO, ...GRANDE, ...BAJO } as Parametros, lado));
  probar(`cuatro · vía trasera ${v}, toda la forma al mínimo`, conVia({ ...extremo(0, FORMA), tTraseras: 'dos' } as Parametros, lado));
  probar(`cuatro · vía trasera ${v}, toda la forma al máximo`, conVia({ ...extremo(1, FORMA), tTraseras: 'dos' } as Parametros, lado));
  probar(`cuatro · vía trasera ${v}, cola corta y batalla corta, ruedas de 28″`, conVia({ ...CUATRO, tCola: 0.45, tBatalla: 2.20, tRuedaTras: '28' } as Parametros, lado));
  probar(`cuatro · vía trasera ${v}, 60 kW`, conVia({ ...CUATRO, tKWNom: 30, tKWPico: 60, tRuedaTras: 'c15' } as Parametros, lado));
}
{
  const lg = largoTriciclo(T4);
  for (const [n, v] of [['mín.', lg.min], ['máx.', lg.max]] as const) probar(`cuatro · largo total ${n} (${v.toFixed(2)} m)`, { ...CUATRO, ...estirarTriciclo(T4, v) });
}

// ── 2026-11-12: the «Cuadriciclo Bala clásico» with the battery along the frame, steering wheel, dashboard, Aptera
// doors and hatch and mirrors (what Eugenio asked for), every slider at both ends and every option; and the
// options one by one on the plain Triciclo
const CLASICO = { ...CUATRO, tBatDisp: 'chasis', tMando: 'volante', tSalpicadero: 'si', tAcceso: 'puertas', tRetrovisores: 'espejos', tMaletero: 'aptera', tPilY: 0.37, tPasY: 0.37 } as Parametros;
const TC = camposTriciclo(CLASICO);
probar('clásico con todo', CLASICO);
for (const f of deslizadoresTriciclo()) {
  const [a, b] = rangoTriciclo(f.clave, TC);
  probar(`clásico · ${f.clave} = ${+a.toFixed(3)} (mín.)`, { ...CLASICO, [f.clave]: a });
  probar(`clásico · ${f.clave} = ${+b.toFixed(3)} (máx.)`, { ...CLASICO, [f.clave]: b });
}
for (const s of SELECTORES_TRICICLO) for (const o of s.opciones) probar(`clásico · ${s.clave} = ${o.k}`, { ...CLASICO, [s.clave]: o.k });
const NUEVAS = ['tBatLargo', 'tBatAncho', 'tBatAlto', 'tBatX', 'tVolX', 'tVolY', 'tVolInc', 'tVolD', 'tSalpY', 'tSalpFondo', 'tPuertaDel', 'tPuertaTras', 'tUmbral', 'tCintura', 'tBisagraY', 'tBisagraInc', 'tBisagraDentro', 'tPuertaAbre', 'tMalIni', 'tMalAbre', 'tMalLado'];
for (const lado of [0, 1] as const) {
  const v = lado ? 'máx.' : 'mín.';
  probar(`clásico · todo lo nuevo al ${v}`, { ...extremo(lado, NUEVAS), ...Object.fromEntries(Object.entries(CLASICO).filter(([k]) => !NUEVAS.includes(k))) } as Parametros);
  probar(`clásico · tres filas, todo lo nuevo al ${v}`, { ...extremo(lado, NUEVAS), ...Object.fromEntries(Object.entries(CLASICO).filter(([k]) => !NUEVAS.includes(k))), tAsientos: 'filas', tPasY: 0.43 } as Parametros);
}
probar('clásico · tres filas', { ...CLASICO, tAsientos: 'filas', tPasY: 0.43 } as Parametros);
probar('clásico · 35 cm', { ...CLASICO, tSuelo: 0.35 } as Parametros);
probar('clásico · grande', { ...CLASICO, ...GRANDE } as Parametros);
probar('clásico · grande y bajo', { ...CLASICO, ...GRANDE, ...BAJO, tPilY: 0.37, tPasY: 0.37 } as Parametros);
probar('clásico · toda la forma al mínimo', { ...extremo(0, FORMA), ...Object.fromEntries(Object.entries(CLASICO).filter(([k]) => !FORMA.includes(k))) } as Parametros);
probar('clásico · toda la forma al máximo', { ...extremo(1, FORMA), ...Object.fromEntries(Object.entries(CLASICO).filter(([k]) => !FORMA.includes(k))) } as Parametros);
probar('clásico · cúpula de una pieza (las puertas ponen el montante)', { ...CLASICO, tVentanas: 'burbuja' } as Parametros);
probar('clásico · sin techo solar', { ...CLASICO, tSolar: 3 } as Parametros);
probar('clásico · ventanilla con cintura alta', { ...CLASICO, tCintura: 0.16 } as Parametros);
{
  const lg = largoTriciclo(TC);
  for (const [n, v] of [['mín.', lg.min], ['máx.', lg.max]] as const) probar(`clásico · largo total ${n} (${v.toFixed(2)} m)`, { ...CLASICO, ...estirarTriciclo(TC, v) });
}
for (const [k, v] of [['tBatDisp', 'chasis'], ['tMando', 'volante'], ['tSalpicadero', 'si'], ['tAcceso', 'puertas'], ['tRetrovisores', 'espejos']] as const) probar(`triciclo · ${k} = ${v}`, { ...PARAMETROS_TRICICLO, [k]: v });
probar('triciclo · puertas y portón', { ...PARAMETROS_TRICICLO, tAcceso: 'puertas', tMaletero: 'aptera' } as Parametros);
probar('triciclo · asientos al mínimo sobre los largueros', { ...PARAMETROS_TRICICLO, tPilY: 0.2, tPasY: 0.2 } as Parametros);

// ── round 2: the REAL saved clásico (`clasicoGuardado.ts`), as it opens today and with the migration values
// proposed for it, every slider at both ends and every option (`npx tsx scripts/triciclo-rangos.ts "clásico real"`)
const MIGRACION = { tBatDisp: 'chasis', tBatLargo: 1.75, tBatAncho: 150, tBatAlto: 0.10, tBatX: 0.60, tMando: 'volante', tVolX: 0, tVolY: -0.03, tVolInc: 30, tVolD: 0.32,
  tSalpicadero: 'si', tSalpY: 0, tSalpFondo: 0.16, tAcceso: 'puertas', tPuertaDel: 0.80, tPuertaTras: 1.86, tUmbral: 0.34, tCintura: 0, tBisagraY: 0.05, tBisagraInc: 13,
  tBisagraDentro: 20, tPuertaAbre: 110, tRetrovisores: 'espejos', tMaletero: 'aptera', tMalIni: 1.70, tMalAbre: 36, tMalLado: 55, tSolarCola: 'si', tPilY: 0.33, tPasY: 0.33 };
// round 3 (2026-11-12): the body's migration on top of 0209's (nose, tail, roof, hatch, fin, solar, second door)
const MIGRACION_R3 = { tMorro: 0.30, tMorroLinea: 1, tMorroAlto: -0.03, tFaro: 'si', tFaroD: 0.16, tColaPlana: 1, tTechoPlano: 0.5, tCaida: 0.2, tConAleta: 'no', tSolarMorro: 'si',
  tMalIni: 1.95, tMalLado: 30, tPuertas2: 'si', tPuerta2Parte: 1.33, tBisagra2Y: 0.85, tBisagra2Inc: 15, tPuerta2Abre: 110, tLineaCupula: 0 };
const REAL = deDiseno(CLASICO_GUARDADO), REAL_0209 = deDiseno({ ...CLASICO_GUARDADO, ...MIGRACION } as Partial<Parametros>), REAL_MIG = deDiseno({ ...CLASICO_GUARDADO, ...MIGRACION, ...MIGRACION_R3 } as Partial<Parametros>);
probar('clásico real, como abre hoy', REAL);
probar('clásico real con la migración 0209', REAL_0209);
probar('clásico real con la migración', REAL_MIG);
{
  // round 3: every new body key at both ends together, on the real one, and the extremes of the new shape one by one on the plain Triciclo
  const R3 = ['tMorroLinea', 'tMorroAlto', 'tFaroD', 'tColaPlana', 'tTechoPlano', 'tCaida', 'tLineaCupula', 'tPuerta2Parte', 'tBisagra2Y', 'tBisagra2Inc', 'tPuerta2Abre', 'tMorro', 'tPuntaMorro', 'tCupFin', 'tAlto', 'tMalIni'];
  const TR = camposTriciclo(REAL_MIG);
  for (const lado of [0, 1] as const) probar(`clásico real · ronda 3 todo al ${lado ? 'máx.' : 'mín.'}`, { ...REAL_MIG, ...Object.fromEntries(R3.map(k => { const [a, b] = rangoTriciclo(k as never, TR); return [k, lado ? b : a]; })) } as Parametros);
  for (const k of R3.slice(0, 7)) for (const lado of [0, 1] as const) { const f = deslizadoresTriciclo().find(x => x.clave === k)!; probar(`triciclo · ${k} = ${lado ? f.max : f.min}`, { ...PARAMETROS_TRICICLO, [k]: lado ? f.max : f.min } as Parametros); }
  probar('triciclo · todo lo de la ronda 3, con puertas y portón', { ...PARAMETROS_TRICICLO, tAcceso: 'puertas', tMaletero: 'aptera', tPuertas2: 'si', tFaro: 'si', tSolarMorro: 'si', tConAleta: 'no', tMorroLinea: 1, tColaPlana: 1, tTechoPlano: 1, tCaida: 0.8 } as Parametros);
}
{
  const TR = camposTriciclo(REAL_MIG);
  for (const f of deslizadoresTriciclo()) {
    const [a, b] = rangoTriciclo(f.clave, TR);
    probar(`clásico real · ${f.clave} = ${+a.toFixed(3)} (mín.)`, { ...REAL_MIG, [f.clave]: a });
    probar(`clásico real · ${f.clave} = ${+b.toFixed(3)} (máx.)`, { ...REAL_MIG, [f.clave]: b });
  }
  for (const s of SELECTORES_TRICICLO) for (const o of s.opciones) probar(`clásico real · ${s.clave} = ${o.k}`, { ...REAL_MIG, [s.clave]: o.k });
  const lg = largoTriciclo(TR);
  for (const [n, v] of [['mín.', lg.min], ['máx.', lg.max]] as const) probar(`clásico real · largo total ${n} (${v.toFixed(2)} m)`, { ...REAL_MIG, ...estirarTriciclo(TR, v) });
  probar('clásico real · tapa del maletero con el panel hasta la cola', { ...REAL_MIG, tMaletero: 'cola' } as Parametros);
  probar('clásico real · cúpula entera con el panel hasta la cola', { ...REAL_MIG, tAcceso: 'cupula', tMaletero: 'cola' } as Parametros);
}

console.log(`\n${casos} casos, ${fallos ? `${fallos} con fallos` : 'todos OK'}`);
if (fallos) process.exitCode = 1;
