// Triciclo masses: the parts list, boots, wheel loads, sizing and the group of each part.
// Moved out of geometriaTriciclo.ts unchanged (2026-11-16, refactor «ordenar»); that file re-exports everything. See ../CLAUDE.md.
import { factorMasaAsiento } from '../filasTriciclo';
import { desgloseMotorGasolina } from '../piezasMotor';
import { masaReductora } from '../catalogoTren';
import { piezasBWB } from './bwb';
import { MATERIALES_CARENADO, MATERIALES_CHASIS, largoTubo } from '../geometria';
import { APLASTADO_BALA } from '../garaje/balaMedidas';
import { neumaticosTriciclo } from './neumaticos';
import { type CamposTriciclo, RUEDAS_TRICICLO, type ClaveNumTriciclo, type DepTriciclo } from './campos';
import { limitarTriciclo } from './medidas';
import { cgOcupante } from './ocupantes';
import type { ModeloTriciclo } from './modelo';
import { centroDe, repartirCargas } from '../masasVehiculo';
import { ruedasTriciclo } from './centroMasas';

// ------------------------------------------------------------------ cálculo
import { piezasRefrigeracion } from './refrigeracion';

export interface PiezaMasa {
  nombre: string; kg: number; x: number; y: number;
  /** 2026-11-17 (masas): across the car (m, + to the right); absent, on the centre line. */
  z?: number;
  /** Round 3 interior (2026-11-12): what it is made of or why it weighs that, for the «Proyecto» list (absent: nothing to add). */
  nota?: string;
}
// ------------------------------------------------------------------ maletero (round three)
/** The boot in litres: now, and in each state of the rows (astride: one, behind the passenger). */
export interface Maleteros { ahora: number; estado: string; estados: { nombre: string; litros: number }[] }
/** Wall, lining and air between the luggage and the skin (m). */
export const PARED_MALETERO = 0.02;
/**
 * The boot's volume (L) for rows 2 and 3 open or folded: the room inside the skin (2 cm in from it, up to the canopy's
 * roof) behind the pilot's backrest (astride: behind the passenger's), above the floor on the rails (on a folded seat,
 * above its folded backrest), less the space each seated passenger takes (from their toes to their backrest, as wide
 * as their seat), the rear wheel with its suspension travel, the shock tower, the battery modules and the controller.
 * A geometric volume, counted in 2 cm slices: it is not the VDA method (1-litre blocks), which gives some 15-25 % less
 * for the same shape. An estimate on this model, not a measurement.
 */
export function volumenMaletero(m: ModeloTriciclo, plegada2: boolean, plegada3: boolean): number {
  const F = m.F, P = PARED_MALETERO, paso = 0.02;
  // the front limit: the backrest of the pilot (three rows) or the passenger (astride); it leans back with its recline
  const delante = m.filas ? m.asientosFilas.find(a => a.fila === 1)! : { x: m.sillines.xPasajero, y: m.sillines.yPasajero, rec: m.rec.pasajero };
  const inicio = (y: number) => delante.x - 0.19 - Math.max(0, y - delante.y) * Math.tan(Math.max(0, delante.rec) * Math.PI / 180);
  const sentados = m.filas ? m.asientosFilas.filter(a => a.fila > 1 && !(a.fila === 2 ? plegada2 : plegada3)) : [];
  const plegados = m.filas ? m.asientosFilas.filter(a => a.fila > 1 && (a.fila === 2 ? plegada2 : plegada3)) : [];
  const xR = m.xR, rR = m.rR, piv = m.basculante.pivote;
  const cajas = [...m.baterias, m.inversor].map(c => ({ x0: c.x0, x1: c.x1, y0: c.y0, y1: c.y1, z: c.hz }));
  // (2026-11-16: the hybrid's engine, its connection and its tank take boot room)
  if (m.phev) cajas.push(...m.phev.disp.ocupa);
  // the rear wheel and its travel, 4 cm round; the swing arm and the shock tower above its pivot
  if (!m.cuatro) {
    cajas.push({ x0: xR - rR - 0.04, x1: xR + rR + 0.04, y0: 0, y1: 2 * rR + m.recTras + 0.04, z: F.ANCHO_NEU / 2 + 0.05 });
    cajas.push({ x0: xR, x1: piv[0] + 0.06, y0: 0, y1: piv[1] + 0.30, z: m.basculante.z + 0.04 });
  } else {
    // four wheels (2026-11-11): the wheels are outside, in their pods; inside stays the frame's tower (the frame is
    // unchanged), from 12 cm behind the pivot to 6 cm ahead of it, as wide as the swing arm's pivot tube was
    cajas.push({ x0: piv[0] - 0.12, x1: piv[0] + 0.06, y0: 0, y1: piv[1] + 0.30, z: m.basculante.z + 0.04 });
  }
  let V = 0;
  for (let y = m.yPiso + paso / 2; y < m.alto; y += paso) {
    const x0 = inicio(y);
    for (let x = x0 - paso / 2; x > F.X_COLA + 0.02; x -= paso) {
      const w = Math.min(F.ladoZ(x, y), F.ladoZ(x, y + P)) - P; if (!(w > 0.02)) continue;
      // the z-intervals taken, on the right half (the boot is symmetric)
      const fuera: [number, number][] = [];
      for (const c of cajas) if (x > c.x0 && x < c.x1 && y > c.y0 && y < c.y1) fuera.push([0, c.z]);
      for (const a of sentados) {
        const atras = a.x - 0.19 - Math.max(0, y - a.y) * Math.tan(Math.max(0, a.rec) * Math.PI / 180);
        if (x < a.x + 0.60 + 0.20 && x > atras) fuera.push([Math.max(0, Math.abs(a.z) - a.ancho / 2 - 0.02), Math.abs(a.z) + a.ancho / 2 + 0.02]);
      }
      for (const a of plegados) if (y < a.y + 0.07 && x > a.x - 0.19 && x < a.x - 0.17 + Math.max(a.fondo, a.respaldo)) fuera.push([Math.max(0, Math.abs(a.z) - a.ancho / 2), Math.abs(a.z) + a.ancho / 2]);
      fuera.sort((p, q) => p[0] - q[0]);
      let libre = 0, z = 0;
      for (const [a, b] of fuera) { if (a > z) libre += Math.min(a, w) - z; z = Math.max(z, b); if (z >= w) break; }
      if (z < w) libre += w - z;
      V += 2 * Math.max(0, libre) * paso * paso;
    }
  }
  return V * 1000;
}
export function maleterosTriciclo(m: ModeloTriciclo): Maleteros {
  if (!m.filas) { const v = volumenMaletero(m, false, false); return { ahora: v, estado: 'detrás del pasajero', estados: [{ nombre: 'Detrás del pasajero', litros: v }] }; }
  const T = m.campos, p2 = T.tFila2 === 'plegada', p3 = T.tFila3 === 'plegada';
  const nombre = (a: boolean, b: boolean) => a && b ? 'filas 2 y 3 plegadas' : a ? 'fila 2 plegada' : b ? 'fila 3 plegada' : 'las tres filas abiertas';
  const estados = ([[false, false], [false, true], [true, false], [true, true]] as const).map(([a, b]) => ({ nombre: nombre(a, b), litros: volumenMaletero(m, a, b) }));
  return { ahora: estados.find(e => e.nombre === nombre(p2, p3))!.litros, estado: nombre(p2, p3), estados };
}

/**
 * Masa de cada parte (kg) con su centro (x, y). 2026-11-12: plus what the new options add, each only when it is on
 * (estimates of parts of their class, not measured): the doors' and hatch's hinges, gas struts and latches (the
 * skin is the same skin, cut), the steering wheel and its column over the handlebar, the dashboard, the mirrors.
 */
export function piezasTriciclo(m: ModeloTriciclo, ar: { carroceria: number; cristal: number; solar: number }, centros: { xPiel: number; yPiel: number; xCristal: number; yCristal: number }, pods: { area: number; areaTras?: number }): PiezaMasa[] {
  const o = piezasBase(m, ar, centros, pods);
  if (m.puerta) o.push({ nombre: 'Puertas: bisagras, cierres y amortiguadores', kg: 3.0, x: (m.puerta.xTip + m.puerta.xR) / 2, y: 0.75 + m.elevar });
  if (m.porton) o.push({ nombre: 'Portón: bisagras y amortiguadores de gas', kg: 2.0, x: m.porton.xH - 0.4, y: 1.1 + m.elevar });
  // the plug-in hybrid (2026-11-15): estimates of parts of their class, not measured. The petrol engine about 15 kg
  // plus 1,4 kg per kW (a 25 kW twin weighs some 50 kg), the planetary gear and its generator 12 kg, the tank 4 kg and
  // its petrol full (0,745 kg/L); all ahead of the rear axle, low
  // (2026-11-16: each at the centre of what the viewer draws, hibrido.ts, no longer at a fixed place; the engine's mass
  // includes its exhaust, now drawn)
  if (m.phev) {
    const p = m.phev, c = p.disp.centros;
    // (2026-11-17: and across the car, for the centre of gravity's side: `centrosZ`)
    const cz = p.disp.centrosZ;
    // (2026-11-17: split into the block and its auxiliaries, each where it is drawn; the sum is the same figure: ../piezasMotor.ts)
    const aux = desgloseMotorGasolina(p.disp, p.kgMotor, p.kW), kgAux = aux.reduce((t, x) => t + x.kg, 0);
    o.push({ nombre: 'Motor de gasolina (híbrido)', kg: p.kgMotor - kgAux, x: c.motor[0], y: c.motor[1], z: cz.motor, nota: `${p.disp.motor.n} cilindro${p.disp.motor.n > 1 ? 's' : ''}, unos ${Math.round(p.disp.motor.cc / 10) * 10} cm³: bloque, culata y cigüeñal (el motor entero pesa ${Math.round(p.kgMotor)} kg con lo de debajo)` });
    o.push(...aux);
    for (const t of p.transmision) o.push({ nombre: t.nombre, kg: t.kg, x: c.transmision[0], y: c.transmision[1], z: cz.transmision });
    o.push({ nombre: 'Depósito de gasolina, lleno', kg: p.kgDeposito, x: c.deposito[0], y: c.deposito[1], z: cz.deposito });
  }
  // a diamond (2026-11-15): the nose wheel (the rear one's size), its brake and its fork (an estimate)
  if (m.rombo) o.push({ nombre: 'Rueda delantera, freno y horquilla', kg: limitarTriciclo('tMRueda', m.campos) * RUEDAS_TRICICLO[m.campos.tRuedaTras].kg * neumaticosTriciclo(m.campos).tras.fKg + limitarTriciclo('tMFreno', m.campos) + 5, x: 0, y: m.rR });
  if (m.volante) o.push({ nombre: 'Volante y columna (más que el manillar)', kg: 1.8, x: m.volante.c[0] + 0.1, y: m.volante.c[1] - 0.05 });
  // (round 3 interior: the white one with its binnacle, vents, buttons, stalks and column shroud: `MASA_SALPICADERO_BLANCO`)
  if (m.salpicadero) { const s = m.salpicadero; o.push({ nombre: 'Salpicadero con sus pantallas', kg: 'blanco' in s ? MASA_SALPICADERO_BLANCO : 4.5, x: (s.x0 + s.x1) / 2, y: s.yTop - 0.1 }); }
  if (m.retrovisor) o.push({ nombre: 'Retrovisores (dos)', kg: 0.9, x: m.retrovisor.cabeza[0], y: m.retrovisor.cabeza[1] });
  // round 3 (estimates of parts of their class, not measured): the passengers' doors' hinges, struts and latches, and the headlamp
  if (m.puerta?.segunda) {
    o.push({ nombre: 'Puertas de atrás: bisagras, cierres y amortiguadores', kg: 2.4, x: m.puerta.segunda.x1, y: 0.8 + m.elevar });
    // the B- and C-pillars' laminate is counted in the body (their area moves from glass to laminate); this is what
    // stiffens them for the hinges and the latches: aluminium inserts and a thicker lay-up, both sides
    o.push({ nombre: 'Montantes B y C: refuerzos para bisagras y cierres', kg: 2.0, x: (m.puerta.segunda.xS + m.puerta.segunda.x1) / 2, y: 0.9 + m.elevar });
  }
  if (m.faro) o.push({ nombre: 'Faro central', kg: 0.7, x: m.faro.c[0], y: m.faro.c[1] });
  // (2026-11-13: an LED strip, its black housing and lens along the leading line: about 0.9 kg, an estimate)
  if (m.faroBarra) o.push({ nombre: 'Barra de luz del morro', kg: 0.9, x: m.faroBarra.c[0], y: m.faroBarra.c[1] });
  // 2026-11-16: the interior finish (none with the defaults: today's masses)
  o.push(...m.interior.piezas);
  // 2026-11-17 (capo): the hybrid's radiator, fan, pipes, coolant and intake ducts (none with «Toma de aire: Ninguna»)
  o.push(...piezasRefrigeracion(m));
  // 2026-11-17: the blended-wing-body fairing's wings, their inner structure and the fold (bwb.ts; none when it is off)
  if (m.bwb) o.push(...piezasBWB(m.bwb, MATERIALES_CARENADO[m.campos.tMatCarenado].kgm2mm * limitarTriciclo('tEspCarenado', m.campos)));
  return dimensionar(m, o);
}
export function piezasBase(m: ModeloTriciclo, ar: { carroceria: number; cristal: number; solar: number }, centros: { xPiel: number; yPiel: number; xCristal: number; yCristal: number }, pods: { area: number; areaTras?: number }): PiezaMasa[] {
  const T = m.campos, L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), F = m.F;
  const kgm2 = MATERIALES_CARENADO[T.tMatCarenado].kgm2mm * L('tEspCarenado');
  const densidad = MATERIALES_CHASIS[T.tChMat].densidad;
  let kgTubos = 0, xt = 0, yt = 0;
  for (const t of m.tubos) {
    const kg = Math.PI * ((t.d / 2) ** 2 - (t.d / 2 - t.pared) ** 2) * largoTubo(t) * densidad;
    kgTubos += kg; xt += kg * (t.a[0] + t.b[0]) / 2; yt += kg * (t.a[1] + t.b[1]) / 2;
  }
  const bat = m.kWh * 1000 / L('tWhKg');
  let vb = 0, xb = 0, yb = 0;
  for (const c of m.baterias) { const v = (c.x1 - c.x0) * (c.y1 - c.y0) * c.hz * 2; vb += v; xb += v * (c.x0 + c.x1) / 2; yb += v * (c.y0 + c.y1) / 2; }
  const ySillin = (piloto: boolean) => (piloto ? m.sillines.yPiloto : m.sillines.yPasajero) - 0.03;
  const yRF = m.rF - APLASTADO_BALA, yRR = m.rR - APLASTADO_BALA, neu = neumaticosTriciclo(T), kDel = RUEDAS_TRICICLO[T.tRuedaDel].kg * neu.del.fKg, kTras0 = RUEDAS_TRICICLO[T.tRuedaTras].kg * neu.tras.fKg;
  if (m.cuatro) {
    // four wheels (2026-11-11): two rear wheels (as many kg each as the one was), their pods and arms (the front ones'
    // laminate), a simple suspension arm each where the swing arm was (the same slider's mass), four brakes and two
    // hub motors (the slider is both together: its range is two motors of half the power, `rangoTriciclo`)
    const kTras = 2 * kTras0, nR = 2 * kDel + kTras;
    return [
      { nombre: 'Carrocería', kg: ar.carroceria * kgm2, x: centros.xPiel, y: centros.yPiel },
      { nombre: 'Carenados y brazos delanteros', kg: pods.area * kgm2, x: m.xF, y: yRF + 0.05 },
      { nombre: 'Carenados y brazos traseros', kg: (pods.areaTras ?? 0) * kgm2, x: m.xR, y: yRR + 0.05 },
      { nombre: 'Cúpula', kg: ar.cristal * L('tEspCristal') * 1.2, x: centros.xCristal, y: centros.yCristal },
      { nombre: 'Bastidor', kg: kgTubos + uniones(kgTubos, L('tChUniones')), x: kgTubos ? xt / kgTubos : -1, y: kgTubos ? yt / kgTubos : 0.3 },
      { nombre: 'Suspensión delantera', kg: L('tMSuspDel'), x: m.xF, y: yRF + 0.08 },
      { nombre: 'Suspensión trasera', kg: L('tMSuspTras'), x: m.xR, y: yRR + 0.08 },
      { nombre: 'Ruedas', kg: L('tMRueda') * nR, x: (2 * kDel * m.xF + kTras * m.xR) / nR, y: (2 * kDel * yRF + kTras * yRR) / nR },
      { nombre: 'Frenos', kg: 4 * L('tMFreno'), x: (m.xF + m.xR) / 2, y: (yRF + yRR) / 2 },
      { nombre: 'Dirección', kg: L('tMDir'), x: (m.cremallera.x + m.cabezaDireccion[0]) / 2, y: (m.cremallera.y + m.cabezaDireccion[1]) / 2 },
      motorPieza(m, L('tMMotor'), 'Motores de buje (dos)'),
      { nombre: 'Controlador', kg: L('tMInversor'), x: (m.inversor.x0 + m.inversor.x1) / 2, y: (m.inversor.y0 + m.inversor.y1) / 2 },
      ...reductoraPieza(T, m),
      { nombre: 'Batería', kg: bat, x: vb ? xb / vb : 0, y: vb ? yb / vb : 0.3 },
      m.filas ? asientosFilasMasa(m, L('tMAsiento')) : { nombre: 'Asientos', kg: 2 * (m.butacas ? masaButaca(L('tMAsiento')) : L('tMAsiento')), x: (m.sillines.xPiloto + m.sillines.xPasajero) / 2, y: (ySillin(true) + ySillin(false)) / 2 },
      { nombre: 'Varios', kg: L('tMVarios'), x: -1.0, y: 0.40 + F.dSuelo + m.elevar },
      ...(ar.solar > 0 ? [{ nombre: 'Paneles solares', kg: ar.solar * L('tSolarM2'), x: m.solarTodo.x, y: m.solarTodo.y }] : []),
    ];
  }
  const kTras = kTras0;
  return [
    { nombre: 'Carrocería', kg: ar.carroceria * kgm2, x: centros.xPiel, y: centros.yPiel },
    { nombre: 'Carenados y brazos delanteros', kg: pods.area * kgm2, x: m.xF, y: yRF + 0.05 },
    { nombre: 'Cúpula', kg: ar.cristal * L('tEspCristal') * 1.2, x: centros.xCristal, y: centros.yCristal },
    { nombre: 'Bastidor', kg: kgTubos + uniones(kgTubos, L('tChUniones')), x: kgTubos ? xt / kgTubos : -1, y: kgTubos ? yt / kgTubos : 0.3 },
    { nombre: 'Suspensión delantera', kg: L('tMSuspDel'), x: m.xF, y: yRF + 0.08 },
    { nombre: 'Basculante y amortiguador', kg: L('tMSuspTras'), x: (m.basculante.pivote[0] + m.xR) / 2, y: (m.basculante.pivote[1] + yRR) / 2 },
    // a car wheel weighs a multiple of the slider's moped wheel (RUEDAS_TRICICLO `kg`)
    { nombre: 'Ruedas', kg: L('tMRueda') * (2 * kDel + kTras), x: (2 * kDel * m.xF + kTras * m.xR) / (2 * kDel + kTras), y: (2 * kDel * yRF + kTras * yRR) / (2 * kDel + kTras) },
    { nombre: 'Frenos', kg: 3 * L('tMFreno'), x: (2 * m.xF + m.xR) / 3, y: (2 * yRF + yRR) / 3 },
    { nombre: 'Dirección', kg: L('tMDir'), x: (m.cremallera.x + m.cabezaDireccion[0]) / 2, y: (m.cremallera.y + m.cabezaDireccion[1]) / 2 },
    motorPieza(m, L('tMMotor'), 'Motor de buje'),
    { nombre: 'Controlador', kg: L('tMInversor'), x: (m.inversor.x0 + m.inversor.x1) / 2, y: (m.inversor.y0 + m.inversor.y1) / 2 },
    ...reductoraPieza(T, m),
    { nombre: 'Batería', kg: bat, x: vb ? xb / vb : 0, y: vb ? yb / vb : 0.3 },
    m.filas ? asientosFilasMasa(m, L('tMAsiento')) : { nombre: 'Asientos', kg: 2 * (m.butacas ? masaButaca(L('tMAsiento')) : L('tMAsiento')), x: (m.sillines.xPiloto + m.sillines.xPasajero) / 2, y: (ySillin(true) + ySillin(false)) / 2 },
    { nombre: 'Varios', kg: L('tMVarios'), x: -1.0, y: 0.40 + F.dSuelo + m.elevar },
    // the panel replaces the glass there (`areasTriciclo`): laminate under it (in «Carrocería») and the panel itself
    ...(ar.solar > 0 ? [{ nombre: 'Paneles solares', kg: ar.solar * L('tSolarM2'), x: m.solarTodo.x, y: m.solarTodo.y }] : []),
  ];
}

/**
 * The seats of «tres filas» (round three): a car-style seat with its folding hinge weighs more than the slider's
 * saddle and backrest. Estimate, not measured: 1.5 times the slider for the pilot's and row 2's, 1.2 for row 3's
 * smaller one; folded or not, they are on board.
 */
export function asientosFilasMasa(m: ModeloTriciclo, kgAsiento: number): PiezaMasa {
  let kg = 0, x = 0, y = 0;
  for (const a of m.asientosFilas) { const k = kgAsiento * factorMasaAsiento(a); kg += k; x += k * (a.x - 0.05); y += k * (a.y + 0.08); }
  return { nombre: 'Asientos', kg, x: x / kg, y: y / kg };
}

// ------------------------------------------------------------------ Round 3 interior: masses (2026-11-12)
/*
 * Eugenio: «revisa el tema de los pesos… creo que las suspensiones, las ruedas y tal, no están acorde al peso que pone
 * ahí. El chasis y todo». The running gear is now sized for the vehicle it carries: every seat taken plus `EQUIPAJE`
 * (the «masa de diseño»), split over the axles by its centre of gravity. Each slider stays, as the lightest it may be;
 * when the load asks for more, the load wins and the «Proyecto» list says so. Estimates of parts of their class, with
 * their references; nothing here is a measurement.
 */
/** Luggage counted for sizing the running gear and the tyres (kg): a suitcase and two cabin bags. Not in the consumption. */
export const EQUIPAJE = 40;
/**
 * One corner's suspension (kg) for `carga` kg on its wheel: two tubular steel wishbones (about 1.2 kg each), a coil-over
 * (motorcycle shocks: 1.5-2.5 kg on light machines; an Öhlins STX 46 road shock, 4-5 kg: polo-motorrad.com), the upright,
 * the hub and its bearing, ball joints and brackets. A rule through three classes, estimated: a Formula Student corner
 * (≈ 70 kg on the wheel, ≈ 6 kg), a light quadricycle such as the Renault Twizy (474 kg kerb: autozine.org; ≈ 150 kg on
 * each wheel, ≈ 10 kg) and a small car's McPherson corner (≈ 250 kg, ≈ 14 kg). The swing arm of the Triciclo, the same.
 */
export const masaEsquina = (carga: number) => 3.0 + 0.045 * carga;
/** One disc brake with its caliper (kg) for `carga` kg on its wheel: a motorcycle front disc (260-300 mm, 1.0-1.5 kg) and caliper (0.7-0.9 kg) stop some 250 kg. Estimate. */
export const masaFreno = (carga: number) => 0.6 + 0.008 * carga;
/** Welded brackets, gussets, suspension pick-ups and bolts: never less than 15 % of the tubes' mass (kg). Estimate. */
export const uniones = (kgTubos: number, deslizador: number) => Math.max(deslizador, 0.15 * kgTubos);
/**
 * An Aptera-style bucket (kg) from the «Un asiento» slider, which is a saddle with its backrest: a moulded composite shell
 * (4-5 kg in a racing bucket of glass or carbon fibre), its pads and its mounting brackets, about 1.8 times a saddle.
 */
export const masaButaca = (asiento: number) => 1.8 * asiento;
/** The white dashboard (kg): its moulded shell, an instrument binnacle and a centre screen (≈ 0.8 kg each), vents and their ducts, switches, stalks and the column's shroud. Estimate; the plain one, 4.5. */
export const MASA_SALPICADERO_BLANCO = 6.5;
/** Where the luggage sits (m): in the boot, behind the last seat. */
export function equipajeEn(m: ModeloTriciclo): { x: number; y: number } {
  const ult = m.filas ? Math.min(...m.asientosFilas.map(a => a.x)) : m.sillines.xPasajero;
  return { x: Math.max(m.xR + 0.10, ult - 0.55), y: m.yPiso + 0.15 };
}
/** The static load on each front and each rear wheel (kg) at the design mass: these parts, everyone on board and the luggage. */
// (2026-11-17, masas: one way to share the weight over the wheels, `masasVehiculo.ts` `repartirCargas`, the same the
// «Masas» tab shows. Until then this was the lever rule between `xF` and `xR`, which in a diamond put the whole weight
// on the laterals and none on the tail wheel (its swing arm and brake were sized for no load). Two axles: the same as before)
export function cargasRueda(m: ModeloTriciclo, piezas: PiezaMasa[]): { del: number; tras: number; masa: number } {
  const eq = equipajeEn(m);
  const todo = [...piezas.map(p => ({ nombre: p.nombre, kg: p.kg, x: p.x, y: p.y, z: p.z ?? 0 })), ...m.plazas.map(q => ({ nombre: q.nombre, kg: q.kg, x: cgOcupante(q.pts)[0], y: 0, z: q.z })), { nombre: 'Equipaje', kg: EQUIPAJE, x: eq.x, y: eq.y, z: 0 }];
  const cg = centroDe(todo), ruedas = ruedasTriciclo(m), cargas = repartirCargas(ruedas, cg.masa, cg.x, cg.z).map(k => Math.max(0, k));
  // the most loaded front wheel (in a diamond, lateral) and rear wheel: the suspension, the brakes and the tyres are sized for them
  const del = Math.max(...ruedas.map((r, i) => (r.eje === 'Eje delantero' || r.eje === 'Laterales' ? cargas[i] : 0)));
  const tras = Math.max(...ruedas.map((r, i) => (r.eje === 'Eje trasero' || r.eje === 'Cola' ? cargas[i] : 0)));
  return { del, tras, masa: cg.masa };
}
export const kg1 = (v: number) => v.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** The running gear for the load (a fixed point: its own mass is part of the load; four passes settle it to the gram). */
export function dimensionar(m: ModeloTriciclo, piezas: PiezaMasa[]): PiezaMasa[] {
  const T = m.campos, L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), nT = m.cuatro ? 2 : 1;
  const sD = L('tMSuspDel'), sT = L('tMSuspTras'), fr = L('tMFreno');
  const sube = (desliz: number, k: number, carga: number) => k > desliz + 1e-9 ? `sube por la carga: ${kg1(desliz)} kg del deslizador → ${kg1(k)} kg (${Math.round(carga)} kg en cada rueda)` : undefined;
  let o = piezas;
  for (let i = 0; i < 4; i++) {
    const c = cargasRueda(m, o), fD = Math.max(fr, masaFreno(c.del)), fT = Math.max(fr, masaFreno(c.tras));
    o = o.map(p => {
      if (p.nombre === 'Suspensión delantera') { const k = Math.max(sD, 2 * masaEsquina(c.del)); return { ...p, kg: k, nota: sube(sD, k, c.del) ?? 'las dos esquinas: brazos, amortiguadores, manguetas y bujes' }; }
      if (p.nombre === 'Suspensión trasera' || p.nombre === 'Basculante y amortiguador') {
        const k = Math.max(sT, nT * masaEsquina(c.tras));
        return { ...p, kg: k, nota: sube(sT, k, c.tras) ?? (m.cuatro ? 'las dos esquinas: brazos, amortiguadores y bujes' : 'basculante, amortiguador y eje') };
      }
      if (p.nombre === 'Frenos') {
        const k = 2 * fD + nT * fT;
        return { ...p, kg: k, nota: `${2 + nT} discos con pinza: ${kg1(fD)} kg delante${fT !== fD ? `, ${kg1(fT)} kg detrás` : ''}${k > (2 + nT) * fr + 1e-9 ? ` (sube por la carga desde ${kg1(fr)} kg del deslizador)` : ''}` };
      }
      return p;
    });
  }
  const neu = neumaticosTriciclo(T), kDel = RUEDAS_TRICICLO[T.tRuedaDel].kg * neu.del.fKg * L('tMRueda'), kTras = RUEDAS_TRICICLO[T.tRuedaTras].kg * neu.tras.fKg * L('tMRueda');
  const metros = m.tubos.reduce((a, t) => a + largoTubo(t), 0);
  return o.map(p => p.nombre === 'Ruedas' ? { ...p, nota: kDel === kTras ? `${2 + nT} × ${kg1(kDel)} kg (llanta y neumático)` : `2 × ${kg1(kDel)} kg delante y ${nT} × ${kg1(kTras)} kg detrás (llanta y neumático)` }
    : p.nombre === 'Bastidor' ? { ...p, nota: `${kg1(metros)} m de tubo de ${Math.round(L('tChD'))} × ${kg1(L('tChT'))} mm y sus uniones` }
      : p.nombre === 'Batería' ? { ...p, nota: `${kg1(m.kWh)} kWh a ${Math.round(L('tWhKg'))} Wh/kg (el paquete entero)` }
        : p.nombre === 'Asientos' && m.butacas ? { ...p, nota: `dos butacas de ${kg1(p.kg / 2)} kg: carcasa, cojines y anclajes` }
          : p);
}
/** The department a part of the mass list belongs to (the «Proyecto» list groups by it; a part not named here, with the body). */
/** (2026-11-16) a reduction gear chosen from the catalogue, at the motor, when its maker publishes its mass. */
export function reductoraPieza(T: CamposTriciclo, m: ModeloTriciclo) {
  const kg = masaReductora(T);
  return kg ? [{ nombre: 'Motor: reductora (catálogo)', kg, x: m.motor.c[0], y: m.motor.c[1], z: m.motor.z }] : [];
}
/** (2026-11-17) the traction motor: in the hub, or central (MG2 on the planetary's ring, next to the petrol engine). */
export function motorPieza(m: ModeloTriciclo, kg: number, buje: string): PiezaMasa {
  return m.motor.tipo === 'central'
    ? { nombre: 'Motor eléctrico central (MG2)', kg, x: m.motor.c[0], y: m.motor.c[1], z: m.motor.z, nota: 'junto al motor de gasolina, en la corona del planetario: masa suspendida' }
    : { nombre: buje, kg, x: m.motor.c[0], y: m.motor.c[1] };
}

export function grupoPieza(nombre: string): DepTriciclo {
  if (nombre === 'Bastidor') return 'chasis';
  // (2026-11-17: and the diamond's nose wheel with its brake and fork, which fell to the body before)
  if (/^(Suspensión|Basculante|Basculación|Ruedas|Frenos|Dirección|Rueda delantera)/.test(nombre)) return 'rodaje';
  if (/^(Motor|Controlador|Depósito)/.test(nombre)) return 'propulsion';
  if (/^(Batería|Varios)/.test(nombre)) return 'energia';
  if (/^(Asientos|Volante|Salpicadero|Interior|Tapicería|Cinturones)/.test(nombre)) return 'interior';
  return 'carroceria';
}
