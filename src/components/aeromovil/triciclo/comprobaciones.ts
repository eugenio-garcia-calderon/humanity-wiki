// Triciclo checks: calcularTriciclo (every check and the results), seats, rollover.
// Moved out of geometriaTriciclo.ts unchanged (2026-11-16, refactor «ordenar»); that file re-exports everything. See ../CLAUDE.md.
import { ANGULO_MAX } from '../garaje/kamm';
import { factorMasaAsiento, numFila } from '../filasTriciclo';
import type { Tilt } from '../basculacion';
import { RPM_MAX_MOTOR, cifrasHibrido } from '../hibrido';
import { comprobacionesCatalogo, motorDe } from '../catalogoTren';
import { type Comprobacion, type PuntosOcupante, type Resultados, type P3, MATERIALES_CHASIS, RENDIMIENTO_SOLAR, largoTubo } from '../geometria';
import type { FormaBala } from '../garaje/balaForma';
import {
  ALETA, ASIENTO, BUTACA, alturasPod, anchoSalpicadero, brazosDe, extremoManillar, podDe, semiAncho, semiRespaldoButaca, techoEn,
} from '../garaje/balaMedidas';
import { choquesHojas, hojasPuerta, vueloPorton, vueloPuerta } from '../garaje/balaPuertas';
import { HUECO_CARENADO, MEDIA_CABEZA, TALLA_SENTADO, areaFrontalBala, carenadoCuerpo, neumaticoCarenado, pielBala, ruedaDentro, type ResultadosBala } from '../geometriaBala';
import { RUEDAS_TRICICLO, type ClaveNumTriciclo, type DepTriciclo } from './campos';
import { dentroDe, cajaDentro, tuboDentro, PAN_ASIENTO, MEDIO_HOMBRO, limitarTriciclo, HUECO_GIRO, anguloFuera, huecoGiro } from './medidas';
import { puntosFila, type AsientoFila, type Plaza, cgOcupante } from './ocupantes';
import { poseBascula, carenadoCuerpoMovido, carenadoAlSuelo, cuerpoAlSuelo, tiltTriciclo } from './bascula';
import { type ModeloTriciclo, aroVolante, puntasRetrovisor } from './modelo';
import { type PiezaMasa, type Maleteros, maleterosTriciclo, piezasTriciclo, EQUIPAJE, masaButaca, cargasRueda } from './masas';
import { crrTriciclo, solarDiaTriciclo, energiaTriciclo } from './energia';
import { chequeosTalla } from './ajusteOcupantes';
import { fichaRueda } from '../ruedas/catalogo';

/** The check's name, also in `explicaciones/triciclo.ts`. */
export const NEUMATICO_MOTO_SIN_INCLINAR = 'Neumáticos de moto en un vehículo que no se inclina: gastan el centro y agarran menos en curva';

export interface ResultadosTriciclo extends Omit<ResultadosBala, 'cabezas'> {
  /** 2026-11-16: the tilt system sized for this car (basculacion.ts), or null when it does not lean. */
  tilt: Tilt | null;
  /** Lo que queda sobre la cabeza de cada uno (m), sin casco: talla media y alta ('piloto', 'pasajero', 'fila 2', 'fila 3'). */
  cabezas: { quien: string; p50: number; p95: number; x: number }[];
  /** Round three: the boot (litres) now and in every state of the rows, and how many ride. */
  maletero: Maleteros;
  ocupantes: number;
  /** Masa por partes con su centro (para el centro de gravedad); los ocupantes van aparte. */
  piezas: PiezaMasa[];
  cg: { x: number; y: number; masa: number; vacio: { x: number; y: number } };
  /** Umbral de vuelco estático (g) con dos ocupantes y con el piloto solo, y lo que pesa el eje delantero. */
  vuelco: { ssf: number; ssfSolo: number; repartoDel: number };
  /** Radio de giro (m): a la rueda delantera de fuera; ángulos de las dos ruedas (°). */
  giro: { radio: number; dentro: number; fuera: number };
  /** El bastidor: momento, tensión y coeficiente de seguridad de los largueros. */
  bastidor: { M: number; tension: number; seguridad: number; metros: number };
  /** Litros y kilos del paquete; `litrosMorro`: lo que cabe en el módulo del morro a su tamaño de partida; `cabe`: los litros que caben en los cinco sitios (menos que `litros`: no cabe). */
  bateria: { litros: number; kg: number; litrosMorro: number; cabe: number };
  /** Lo que depende del Cd del túnel (null mientras calcula). */
  energia: null | { cd: number; areaRef: number; CdA: number; WhKm: number; autonomia: number; kmSol: number; vmaxNominal: number; vmaxPico: number; acel50: number; potencia: number; WhKm50: number; WhKm100: number };
}

/** Lo que queda sobre la cabeza (m): la parte de arriba y de atrás del cráneo (de 30° delante a 70° detrás), a la cara de dentro del cristal. */
export function cabezaTriciclo(m: ModeloTriciclo, piloto: boolean, talla: number, esp: number) {
  const k = talla / TALLA_SENTADO.p50, o = m.occTalla(piloto, k);
  const a0 = Math.atan2(o.dh![0], o.dh![1]);   // the head's axis, from the vertical (negative: leaning back)
  let h = 9;
  for (let g = -30; g <= 70; g += 10) {
    const a = a0 - g * Math.PI / 180, x = o.C[0] + Math.sin(a) * MEDIA_CABEZA * k, y = o.C[1] + Math.cos(a) * MEDIA_CABEZA * k;
    h = Math.min(h, techoEn(m.F, x) - esp - y);
  }
  return { holgura: h, x: o.C[0] };
}

/**
 * Round three: what is left over a passenger's head off the centre line (row 2) or on it (row 3), m. The head is an
 * ellipsoid: 11 cm up and back from its centre (as `cabezaTriciclo`), 7.8 cm to each side; each of its points is
 * measured straight up to the inner face of the canopy above it, and its side to the canopy's side.
 */
export function cabezaPlaza(m: ModeloTriciclo, q: Plaza, talla: number, esp: number) {
  const k = talla / TALLA_SENTADO.p50, o = q.talla(k), F = m.F, ANCHO = 0.078 * k;
  const a0 = Math.atan2(o.dh![0], o.dh![1]); let h = 9;
  for (const dz of [-1, -0.5, 0, 0.5, 1]) {
    const f = Math.sqrt(Math.max(0, 1 - (dz * 0.95) ** 2)), z = Math.abs(q.z + dz * 0.95 * ANCHO);
    for (let g = -30; g <= 70; g += 10) {
      const a = a0 - g * Math.PI / 180, x = o.C[0] + Math.sin(a) * MEDIA_CABEZA * k * f, y = o.C[1] + Math.cos(a) * MEDIA_CABEZA * k * f;
      const techo = F.arribaY(x, z); h = Math.min(h, Number.isFinite(techo) ? techo - esp - y : -0.05);
    }
  }
  const lado = F.ladoZ(o.C[0], o.C[1]); h = Math.min(h, Number.isFinite(lado) ? lado - esp - (Math.abs(q.z) + ANCHO) : -0.05);
  return { holgura: h, x: o.C[0] };
}

/** Superficie (m²) de los dos carenados delanteros y sus brazos de arriba, para su masa. */
export function pielCarenados(F: FormaBala): number {
  const POD = podDe(F); let A = 0;
  for (let i = 0; i + 1 < POD.length; i++) {
    const a = POD[i], b = POD[i + 1], per = (e: typeof a) => { const h = (e.yt - e.yb) / 2, w = e.wm; return Math.PI * (3 * (h + w) - Math.sqrt((3 * h + w) * (h + 3 * w))); };
    A += (per(a) + per(b)) / 2 * Math.abs(a.x - b.x);
  }
  // (a lifted Triciclo's arms run down from the body to the pod: their length, not their span)
  const brazos = brazosDe(F).reduce((s, b) => s + 2.05 * b.cuerda * Math.hypot(Math.max(0, F.VIA_LAT / 2 - F.ladoZ(F.X_LAT + b.x, b.yCuerpo)), b.yCuerpo - b.y), 0);
  return 2 * (A + brazos);
}

/**
 * Round 3 interior (2026-11-12): the Aptera buckets' own checks. The passenger's knees go round the pilot's backrest
 * (its half-width at their height, `semiRespaldoButaca`; a knee is 6 cm round); its feet beside the pilot's seat (the
 * shell's half-width at the cushion, a foot 4.5 cm to each side of its line); and both riders' feet inside the body
 * (heel to toes, 17-18 cm ahead of the ankle).
 */
export function chequeosButacas(m: ModeloTriciclo, op: PuntosOcupante, oq: PuntosOcupante, c: (dep: DepTriciclo | `${DepTriciclo},${DepTriciclo}`, nombre: string, holgura: number, minimo: number) => void) {
  const F = m.F, bp = m.butacas![0], apQ = oq.anchoPiernas as number[], apP = op.anchoPiernas as number[];
  // the pilot's backrest: from its foot (`bisagra` behind the hips) up along its recline; the knee's height up its face
  const r = bp.rec * Math.PI / 180, alto = (y: number) => (y - bp.y) / Math.cos(r), atras = (y: number) => bp.x - BUTACA.bisagra - Math.max(0, y - bp.y) * Math.tan(r);
  // what stands beside the knee: the backrest (its half-width at that height), the cushion's bolsters (up to 8 cm over
  // it), or the pilot's own trunk between the two (half a chest, 20 cm with the arms close)
  const [kx, ky] = oq.K, hK = alto(ky), frente = atras(ky);
  let lado = 0;
  if (kx + 0.06 > frente - BUTACA.grueso && kx - 0.06 < frente + 0.02 && hK > -0.06 && hK < BUTACA.respaldo + BUTACA.cabezal) lado = Math.max(lado, semiRespaldoButaca(hK));
  if (kx + 0.06 > bp.x - BUTACA.detras && kx - 0.06 < bp.x + BUTACA.delante && ky - 0.06 < bp.y + 0.08) lado = Math.max(lado, BUTACA.semi.cojin);
  if (kx - 0.06 < frente + 0.30 && kx + 0.06 > frente && ky - 0.06 < op.S[1]) lado = Math.max(lado, 0.20);
  c('interior', 'Rodillas del pasajero a los lados del asiento del piloto', lado ? apQ[2] - 0.06 - lado : 0.5, 0.01);
  const pieBajo = oq.F[0] + 0.18 > bp.x - BUTACA.detras && oq.F[0] < bp.x + BUTACA.delante && oq.F[1] + 0.04 > bp.y - BUTACA.pan;
  c('interior', 'Pies del pasajero a los lados del asiento del piloto', pieBajo ? apQ[1] - 0.045 - BUTACA.semi.cojin : 0.5, 0.01);
  const pies = (o: PuntosOcupante, z: number, delante: number) => { let h = 9; for (const u of [0, 0.5, 1]) for (const y of [o.F[1] - 0.07, o.F[1] + 0.04]) h = Math.min(h, dentroDe(F, o.F[0] + delante * u, y, z + 0.045)); return h; };
  c('interior', 'Pies del piloto (en los pedales) dentro de la carrocería', pies(op, apP[1], 0.17), 0.01);
  c('interior', 'Pies del pasajero dentro de la carrocería', pies(oq, apQ[1], 0.18), 0.01);
}

/**
 * Umbral de vuelco estático (static stability factor) de un triciclo con dos
 * ruedas delante (tadpole), en g de aceleración lateral:
 *
 *     SSF = t · b / (2 · h · L)
 *
 * t vía delantera, L batalla, h altura del centro de gravedad y b su distancia
 * al eje trasero. El eje de vuelco va de una rueda delantera a la trasera; el
 * momento de la fuerza lateral m·a·h y el del peso m·g·(t/2)·(b/L) sobre ese eje
 * se igualan (la longitud del eje se va en las dos). Es (t/2)/h con la vía
 * «efectiva» a la altura del centro de gravedad: cuanto más cerca del eje
 * delantero, más vía. Sólido rígido: sin balanceo de la suspensión ni de los
 * neumáticos, que en la realidad lo bajan un 10-15 %, ni ocupantes que se inclinan.
 */
export const umbralVuelco = (t: number, b: number, h: number, L: number) => t * b / (2 * h * L);
export const NUMERO: Record<number, string> = { 1: 'uno', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete' };

/** Lo que agarra en seco un neumático de ciclomotor (μ ≈ 0,9): por debajo, en una curva vuelca antes de derrapar. */
export const AGARRE = 0.9;
/** Lo que se pide al umbral de vuelco: el agarre y un 15 % más, por lo que el cálculo rígido no ve. */
export const VUELCO_OBJETIVO = 1.05;

/**
 * Áreas, masas, centro de gravedad, vuelco, estructura y holguras. Lo que depende
 * del Cd (consumo, autonomía, velocidades) solo con `cd`: el del túnel, que se
 * calcula aparte (`energiaTriciclo`); sin él no hay cifra, nunca una inventada.
 */
export function calcularTriciclo(m: ModeloTriciclo, ar: { carroceria: number; cristal: number; solar: number }, cd?: { cd: number; areaRef: number }): Resultados {
  const T = m.campos, F = m.F, L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), esp = L('tEspCristal') / 1000;
  const extras = m.faldon ? [{ y0: m.faldon.y0, y1: F.D.suelo + 0.01, z: m.faldon.hz }] : [];
  const area = m.traseras ? areaFrontalBala(m, extras, [F, m.traseras]) : areaFrontalBala(m, extras);
  let vol = 0; for (let x = F.X_MORRO - 0.025; x > F.X_COLA; x -= 0.05) vol += F.areaSeccion(x, 80).area * 0.05;
  const s = pielBala(F, m.cup);
  const centros = { xPiel: s.xPiel / s.piel, yPiel: s.yPiel / s.piel, xCristal: s.cristal ? s.xCristal / s.cristal : -1, yCristal: s.cristal ? s.yCristal / s.cristal : 1 };
  const piezas = piezasTriciclo(m, ar, centros, { area: pielCarenados(F), ...(m.traseras ? { areaTras: pielCarenados(m.traseras) } : {}) });
  // the tilt system (2026-11-16): sized with the car as it is without it, its riders on board, then added to the masses
  const tilt = m.bascula ? tiltTriciclo(m, piezas) : null;
  if (tilt) for (const c of tilt.componentes) piezas.push({ nombre: `Basculación: ${c.nombre.toLowerCase()}`, kg: c.kg, x: c.x, y: c.y, nota: c.ficha.join('; ') });
  const masas: Record<string, number> = {}; for (const p of piezas) masas[p.nombre] = (masas[p.nombre] ?? 0) + p.kg;
  // (2026-11-17, «muñecos»: each rider's mass follows its size, triciclo/talla.ts; `tMOcc` is the average man's)
  const mVeh = piezas.reduce((a, p) => a + p.kg, 0), kgPil = m.cuerpos.piloto.kg, kgPas = m.cuerpos.pasajero.kg;
  const momento = (l: PiezaMasa[]) => { const M = l.reduce((a, p) => a + p.kg, 0); return { masa: M, x: l.reduce((a, p) => a + p.kg * p.x, 0) / M, y: l.reduce((a, p) => a + p.kg * p.y, 0) / M }; };
  // everyone on board (round three: up to four; a folded row carries nobody)
  const ocupantes = m.plazas.map(q => { const [x, y] = cgOcupante(q.pts); return { nombre: q.nombre, kg: q.kg, x, y }; });
  const nOcc = ocupantes.length, kgOcc = ocupantes.reduce((a, o) => a + o.kg, 0);
  const cg = momento([...piezas, ...ocupantes]), cgSolo = momento([...piezas, ocupantes[0]]), vacio = momento(piezas);
  const Lb = m.batalla, t = F.VIA_LAT;
  // four wheels (2026-11-11): SSF = t_eff / (2h), the track under the centre of gravity: the front and rear tracks
  // weighted by the load on each axle (the tadpole's formula is the same with a rear track of 0)
  const tTras = m.traseras ? m.traseras.VIA_LAT : 0;
  const ssf4 = (x: number, h: number) => { const b = (x - m.xR) / Lb; return (t * b + tTras * (1 - b)) / (2 * h); };
  // a diamond (2026-11-15): it tips over the nearer of the two edges from a lateral wheel, to the nose or to the tail wheel
  const ssfRombo = (x: number, h: number) => {
    // (as `umbralVuelco`: the edge's half-track under the centre of gravity, across)
    const a = t / 2, dTras = a * (x - m.xR) / (m.xF - m.xR), dDel = a * (0 - x) / (0 - m.xF);
    return Math.max(0, Math.min(dTras, dDel)) / h;
  };
  const ssf = m.rombo ? ssfRombo(cg.x, cg.y) : m.traseras ? ssf4(cg.x, cg.y) : umbralVuelco(t, cg.x - m.xR, cg.y, Lb), ssfSolo = m.rombo ? ssfRombo(cgSolo.x, cgSolo.y) : m.traseras ? ssf4(cgSolo.x, cgSolo.y) : umbralVuelco(t, cgSolo.x - m.xR, cgSolo.y, Lb);
  // (a diamond: the share ahead of the tail wheel, carried by the nose and the laterals)
  const repartoDel = m.rombo ? Math.min(1, Math.max(0, (cg.x - m.xR) / -m.xR)) : (cg.x - m.xR) / Lb;

  // steering: Ackermann, the turning circle to the outer front wheel
  // (a diamond: the nose wheel steers about a centre on the laterals' line, the tail wheel steering against it)
  const di = m.giro, dout = m.rombo ? di : anguloFuera(di, Lb, t), radio = m.rombo ? -m.xF / Math.sin(di) : Lb / Math.sin(dout) + 0;

  // the frame: the two rails as one beam on two supports (the battery cradle at x = 0 and the swing-arm pivot), riders and seats on it
  // (round 3 interior, 2026-11-12: with the rails on to the rear axle, the beam rests on the rear axle's cradle instead of the swing-arm pivot)
  const g = 9.81, apoyo = m.larguerosTraseros ? m.xR : m.basculante.pivote[0], xDel = m.rombo ? 0 : m.xF, luz = xDel - apoyo;
  // (a diamond, 2026-11-15: carried at the nose wheel's fork and the pivot, the laterals' cross-member ignored: the longer span, on the safe side)
  const kgAsiento = m.butacas ? masaButaca(L('tMAsiento')) : L('tMAsiento');
  const cargas: [number, number][] = !m.filas
    ? [[xDel - m.sillines.xPiloto, (kgPil + kgAsiento) * g], [xDel - m.sillines.xPasajero, (kgPas + kgAsiento) * g]]
    // three rows: each seat with its occupant (if its row is open), at its hips
    // (2026-11-16: a bench carries all its row's places)
    : m.asientosFilas.map(a => [xDel - a.x, ((a.plegado ? 0 : (a.fila === 1 ? kgPil : kgPas) * (a.plazas ?? 1)) + L('tMAsiento') * factorMasaAsiento(a)) * g] as [number, number]);
  // round 3 interior (2026-11-12, «revisa… el chasis y todo»): the battery bears on the rails too (the pack runs through
  // them; the modules stand on them): the pack in eight slices along its length, each module at its centre, by volume
  {
    const kgBat = m.kWh * 1000 / L('tWhKg'), vols = m.baterias.map(b => (b.x1 - b.x0) * (b.y1 - b.y0) * b.hz), V = vols.reduce((a, v) => a + v, 0);
    if (m.paquete) for (let i = 0; i < 8; i++) cargas.push([xDel - (m.paquete.x0 + (m.paquete.x1 - m.paquete.x0) * (i + 0.5) / 8), kgBat / 8 * g]);
    else if (V > 0) m.baterias.forEach((b, i) => cargas.push([xDel - (b.x0 + b.x1) / 2, kgBat * vols[i] / V * g]));
  }
  let Mmax = 0; for (const [a, Fz] of cargas) { const aa = Math.min(luz, Math.max(0, a)); Mmax = Math.max(Mmax, Fz * aa * (luz - aa) / luz); }
  // both loads together: the moment at each load point of the sum
  for (const [a0] of cargas) { let M = 0; for (const [a, Fz] of cargas) { const lo = Math.min(a, a0), hi = Math.max(a, a0); M += Fz * lo * (luz - hi) / luz; } Mmax = Math.max(Mmax, M); }
  const Dm = L('tChD'), tw = L('tChT'), W = 2 * Math.PI * (Dm ** 4 - (Dm - 2 * tw) ** 4) / (32 * Dm);   // two rails, mm³
  const tension = 2.5 * Mmax * 1000 / W, seguridad = MATERIALES_CHASIS[T.tChMat].limite / tension;
  const metros = m.tubos.reduce((a, tb) => a + largoTubo(tb), 0);

  // ── checks
  const ch: Comprobacion[] = [];
  const c = (dep: DepTriciclo | `${DepTriciclo},${DepTriciclo}`, nombre: string, holgura: number, minimo: number, mostrar?: string) => ch.push({ nombre, holgura, minimo, dep, ...(mostrar ? { mostrar } : {}) });
  const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
  c('rodaje', `Vuelco: aceleración lateral que lo tumba, con ${NUMERO[nOcc] ?? nOcc} (objetivo ${fmt(VUELCO_OBJETIVO)} g)`, ssf - AGARRE, VUELCO_OBJETIVO - AGARRE, `${fmt(ssf)} g`);
  c('rodaje', 'Vuelco: con el piloto solo', ssfSolo - AGARRE, VUELCO_OBJETIVO - AGARRE, `${fmt(ssfSolo)} g`);
  let cabezas: { quien: string; p50: number; p95: number; x: number }[];
  if (!m.filas) {
    cabezas = ([true, false] as const).map(piloto => {
      const a = cabezaTriciclo(m, piloto, TALLA_SENTADO.p50, esp), b = cabezaTriciclo(m, piloto, TALLA_SENTADO.p95, esp);
      return { quien: piloto ? 'piloto' as const : 'pasajero' as const, p50: a.holgura, p95: b.holgura, x: a.x };
    });
  } else {
    // three rows: the pilot as astride (on the centre line); row 2's right seat (the left is its mirror) and row 3, off and on the centre line
    cabezas = [{ ...(() => { const a = cabezaTriciclo(m, true, TALLA_SENTADO.p50, esp), b = cabezaTriciclo(m, true, TALLA_SENTADO.p95, esp); return { p50: a.holgura, p95: b.holgura, x: a.x }; })(), quien: 'piloto' }];
    for (const q of m.plazas) if (q.fila > 1 && q.z >= 0) {
      const a = cabezaPlaza(m, q, TALLA_SENTADO.p50, esp), b = cabezaPlaza(m, q, TALLA_SENTADO.p95, esp);
      // (2026-11-16: with three places, the centre one too)
      const centro = Math.abs(q.z) < 1e-9 && m.plazas.some(o => o.fila === q.fila && o.z > 1e-9);
      cabezas.push({ quien: `fila ${q.fila}${centro ? ' (centro)' : ''}`, p50: a.holgura, p95: b.holgura, x: a.x });
    }
  }
  for (const k of cabezas) {
    const quien = k.quien === 'piloto' ? 'del piloto' : k.quien === 'pasajero' ? 'del pasajero' : `de la ${k.quien}`;
    c('interior,carroceria', `Cabeza ${quien} a la cúpula (talla media, sin casco)`, k.p50, 0.03);
    c('interior,carroceria', `Cabeza ${quien} a la cúpula (talla alta, sin casco)`, k.p95, 0.03);
  }
  // 2026-11-17 («muñecos»): every rider at its own height and build: head, shoulders, hips, knees, belly, feet (ajusteOcupantes.ts)
  chequeosTalla(m, c);
  const op = m.occPts(true);
  // the pilot's backrest against the passenger: its back face (pad 3 cm, 14 cm behind the trunk's axis) to the passenger's belly (12 cm ahead of the hips)
  if (!m.filas) {
    const oq = m.occPts(false), t0 = 0.30;
    const xRespaldo = op.H[0] + op.d[0] * t0 - op.d[1] * 0.17, yR = op.H[1] + op.d[1] * t0;
    const xVientre = oq.H[0] + oq.d[0] * Math.max(0, (yR - oq.H[1]) / oq.d[1]) + 0.12 * m.cuerpos.pasajero.fondo * m.cuerpos.pasajero.k;
    c('interior', 'Respaldo del piloto al vientre del pasajero', xRespaldo - xVientre, 0.03);
    c('interior', 'Cabeza del piloto a la del pasajero', Math.hypot(op.C[0] - oq.C[0], op.C[1] - oq.C[1]) - 2 * 0.105, 0.05);
    if (m.butacas) chequeosButacas(m, op, oq, c);
  } else {
    // three rows (round three): knees to the backrest in front (its rear face, 17 cm behind the trunk's axis; a knee is 6 cm round)
    const respaldoEn = (o: PuntosOcupante, y: number) => { const t = (y - o.H[1]) / o.d[1]; return o.H[0] + o.d[0] * t - o.d[1] * 0.17; };
    // (2026-11-16: each row's outermost place on the right, or its only one: where the belly and the canopy pinch first)
    const exterior = (f: number) => m.plazas.filter(q => q.fila === f && q.z >= -1e-9).sort((a, b) => b.z - a.z)[0];
    const fila2 = exterior(2), fila3 = exterior(3);
    if (fila2) c('interior', 'Rodillas de la fila 2 al respaldo del piloto', respaldoEn(op, fila2.pts.K[1]) - (fila2.pts.K[0] + 0.06), 0.02);
    // row 2's backrests stand (or lie folded, then the knees pass over them) in front of row 3
    const r2 = m.asientosFilas.find(a => a.fila === 2)!;
    if (fila3 && !r2.plegado) {
      const o2 = puntosFila(r2.x, r2.y, r2.rec, m.yPiso);
      c('interior', 'Rodillas de la fila 3 al respaldo de la fila 2', respaldoEn(o2, fila3.pts.K[1]) - (fila3.pts.K[0] + 0.06), 0.02);
    }
    // row 2's outer shoulder (an average man's: its centre + MEDIO_HOMBRO from the centre line) to the canopy's inner face
    // (2026-11-16: whatever its places; row 3's too when it has more than one)
    for (const q of [fila2, fila3]) if (q && (q.fila === 2 || q.z > 1e-9)) {
      const o = q.pts, S = [o.H[0] + o.d[0] * 0.44, o.H[1] + o.d[1] * 0.44];
      c('interior,carroceria', `Hombros de la fila ${q.fila} a la cúpula (de lado)`, Math.min(F.ladoZ(S[0], S[1]), F.ladoZ(o.S[0], o.S[1])) - esp - (Math.abs(q.z) + MEDIO_HOMBRO), 0.02);
    }
    // 2026-11-16, row by row: the row's seats, side by side, fit across the cabin: the outer edge of the outermost cushion
    // and of its backrest (at mid-height) inside the skin's inner face, 1 cm clear; it says by how much they do not
    for (const f of [2, 3] as const) {
      const fil = m.asientosFilas.filter(a => a.fila === f); if (!fil.length) continue;
      let h = 9;
      for (const a of fil) {
        const borde = Math.abs(a.z) + a.ancho / 2, r = a.rec * Math.PI / 180, hR = a.plegado ? 0 : a.respaldo / 2;
        for (const x of [a.x - 0.17, a.x - 0.17 + a.fondo / 2, a.x - 0.17 + a.fondo]) h = Math.min(h, F.ladoZ(x, a.y) - esp - borde);
        if (hR) h = Math.min(h, F.ladoZ(a.x - 0.17 - Math.sin(r) * hR, a.y + Math.cos(r) * hR) - esp - borde);
      }
      const n = numFila(f === 2 ? T.tFila2N : T.tFila3N, f === 2 ? 2 : 1);
      c('interior,carroceria', `Asientos de la fila ${f} caben de lado (${n === 1 ? 'una plaza' : n === 2 ? 'dos plazas' : 'tres plazas'})`, h, 0.01, h < 0.01 ? `faltan ${fmt((0.01 - h) * 100, 1)} cm por lado` : undefined);
    }
    // the feet (instep 4 cm over the ankle): inside the body where they rest, and under the seat in front (its pan's underside)
    const pies = (q: Plaza, delante: AsientoFila | undefined) => {
      const o = q.pts, zf = Math.abs(q.z) + (o.anchoPiernas?.[1] ?? 0.1) + 0.045, yPie = o.F[1] - 0.06;
      let h = 9; for (const x of [o.F[0], o.F[0] + 0.18]) h = Math.min(h, dentroDe(F, x, yPie, zf));
      c('interior', `Pies de la ${q.fila === 2 ? 'fila 2' : 'fila 3'} dentro de la carrocería`, h, 0.01);
      if (delante) {
        const x0 = delante.x - 0.17, x1 = x0 + delante.fondo, punta = o.F[0] + 0.18;
        // only where the foot (ankle to toes) is under that cushion
        const bajo = punta > x0 && o.F[0] < x1;
        c('interior', `Pies de la ${q.fila === 2 ? 'fila 2' : 'fila 3'} bajo el asiento de delante`, bajo ? (delante.y - PAN_ASIENTO) - (o.F[1] + 0.04) : 0.09, 0.01);
      }
    };
    if (fila2) pies(fila2, m.asientosFilas.find(a => a.fila === 1));
    if (fila3) pies(fila3, r2);
    // row 3's backrest ahead of the rear shock tower (its tube's front face)
    const r3 = m.asientosFilas.find(a => a.fila === 3)!;
    c('interior,rodaje', 'Respaldo de la fila 3 a la torreta del amortiguador', (r3.x - 0.19) - (m.basculante.pivote[0] - 0.06 + L('tChD') / 2000), 0.02);
  }
  {
    // reach: shoulder to grip, against a 58 cm arm (the viewer's 30 + 28 cm), elbows a little bent
    const hom: P3 = [op.H[0] + op.d[0] * 0.46, op.H[1] + op.d[1] * 0.46, 0.19], puno: P3 = [op.mano[0], op.mano[1], op.anchoMano];
    c('interior', `Manos del piloto al ${m.volante ? 'volante' : 'manillar'} (alcance)`, 0.55 - Math.hypot(puno[0] - hom[0], puno[1] - hom[1], puno[2] - hom[2]), 0.0);
  }
  if (!m.volante) {
    const [xb, yb, zb] = extremoManillar(F, m.man);
    c('interior', 'Manillar dentro de la carrocería', F.ladoZ(xb, yb) - zb, 0.01);
  } else {
    // 2026-11-12: the steering wheel's rim (1.5 cm tube) inside the body, and clear of the pilot's knees (6 cm round)
    // (round 3 interior: the knees' own spread where the posture gives one, the buckets')
    const ap = m.plazas[0].pts.anchoPiernas as number[] | undefined, v = m.volante, aro = aroVolante(v, 48), Ks = m.plazas[0].pts.K, zK = ap?.[2] ?? ap?.[0] ?? 0.13;
    let dentro = 9, rodillas = 9;
    for (const q of aro) {
      const z = F.ladoZ(q[0], q[1]); dentro = Math.min(dentro, (Number.isFinite(z) ? z : 0) - Math.abs(q[2]) - 0.015);
      for (const s of [1, -1]) rodillas = Math.min(rodillas, Math.hypot(q[0] - Ks[0], q[1] - Ks[1], q[2] - s * zK) - 0.06 - 0.015);
    }
    c('interior', 'Volante dentro de la carrocería', dentro, 0.01);
    c('interior', 'Rodillas del piloto al volante', rodillas, 0.02);
  }
  if (m.rombo) {
    // a diamond (2026-11-15): the pods at the sides do not steer; the nose wheel does, inside the nose, ahead of the pilot's feet
    c('rodaje,carroceria', 'Neumático lateral dentro de su carenado', neumaticoCarenado(F), 0.015);
    c('rodaje,carroceria', 'Carenado lateral a la carrocería', carenadoCuerpo(F), HUECO_CARENADO - 0.002);
    c('rodaje,carroceria', 'Rueda delantera dentro del morro', ruedaDentro(F, 0, m.rR, F.ANCHO_NEU), 0.02);
    // turned to the lock, its tyre sweeps sideways: about the rim's half-chord at mid-height times the sine, on each side
    const g = m.giro, anchoGirada = F.ANCHO_NEU * Math.cos(g) + 2 * m.rR * 0.7 * Math.sin(g);
    c('rodaje,carroceria', `Rueda delantera dentro del morro, girada ${Math.round(g * 180 / Math.PI)}°`, ruedaDentro(F, 0, m.rR, anchoGirada), 0.01);
    const pies = m.plazas[0]?.pts.F;
    if (pies && pies[1] < 2 * m.rR) c('interior,rodaje', 'Pies del piloto detrás de la rueda delantera', -m.rR - (pies[0] + 0.12), 0.03);
  } else {
    c('rodaje,carroceria', 'Neumático delantero dentro de su carenado (gira con él)', neumaticoCarenado(F), 0.015);
    c('rodaje,carroceria', 'Carenado delantero a la carrocería, recto', carenadoCuerpo(F), HUECO_CARENADO - 0.002);
    c('rodaje,carroceria', `Carenado delantero a la carrocería, girado ${Math.round(m.giro * 180 / Math.PI)}°`, huecoGiro(F, m.giro), HUECO_GIRO - 0.002);
  }
  if (!m.traseras) c('rodaje', `Rueda trasera dentro de la cola, hundida ${Math.round(m.recTras * 1000)} mm`, ruedaDentro(F, m.xR, m.rR, F.ANCHO_NEU, m.recTras), 0.02);
  else {
    // four wheels (2026-11-11): the rear pods as the front ones, but they do not steer
    c('rodaje,carroceria', 'Neumático trasero dentro de su carenado', neumaticoCarenado(m.traseras), 0.015);
    c('rodaje,carroceria', 'Carenado trasero a la carrocería', carenadoCuerpo(m.traseras), HUECO_CARENADO - 0.002);
  }
  // 2026-11-17, the Kamm tail: the cut only works if the air reaches its edge still attached, so the tail may close at most
  // ANGULO_MAX (15°) just ahead of it, on top, at the sides and underneath (garaje/kamm.ts, garaje/balaForma.ts `kamm`)
  if (F.kamm) { const k = F.kamm, a = Math.max(k.angTecho, k.angLado, k.angBajos); c('carroceria', 'Cola cortada: el aire llega pegado al corte', ANGULO_MAX - a, 0, `se cierra ${Math.round(a)}° antes del corte (máx. ${ANGULO_MAX}°)`); }
  if (m.bascula) {
    // leaning (2026-11-15): at the maximum, the pod on the inside rises along the body and the outside one drops, both a little
    // nearer; neither may touch it. And the body, turned about the road, keeps off it.
    const ph = m.bascula.phiMax, g = Math.round(ph * 180 / Math.PI);
    for (const q of m.bascula.ejes) {
      const p = poseBascula(q, ph), quien = q.eje === 'del' ? 'delantero' : q.eje === 'lat' ? 'lateral' : 'trasero';
      c('rodaje,carroceria', `Carenado ${quien} a la carrocería, inclinado ${g}° (el de dentro)`, carenadoCuerpoMovido(q.F, p.dy, p.dIn), 0.015);
      c('rodaje,carroceria', `Carenado ${quien} a la carrocería, inclinado ${g}° (el de fuera)`, carenadoCuerpoMovido(q.F, -p.dy, p.dIn), 0.015);
      c('rodaje,carroceria', `Carenado ${quien} al suelo, inclinado ${g}°`, carenadoAlSuelo(q.F, ph), 0.03);
    }
    c('rodaje,carroceria', `Carrocería al suelo, inclinada ${g}°`, cuerpoAlSuelo(F, ph), 0.03);
    // (2026-11-16) each rocker, its arms swung to the full turn, inside the body at its height
    for (const q of m.bascula.ejes) {
      const a = q.brazos[0]; if (!a) continue;
      const yR = a.yCuerpo - 0.12, w = q.F.ladoZ(a.x, yR), b = m.bascula.brazo;
      if (Number.isFinite(w)) c('rodaje', `Balancín ${q.eje === 'del' ? 'delantero' : q.eje === 'lat' ? 'lateral' : 'trasero'} dentro de la carrocería`, w - b - 0.04, 0);
    }
  }
  c('rodaje', `Bajos al suelo con la suspensión hundida`, F.D.suelo - Math.max(m.recDel, m.recTras) * 0.6, 0.03);
  {
    // round 3 interior (2026-11-12): what each tyre carries at the design mass (everyone on board and the luggage) against what it is rated for
    const cr = cargasRueda(m, piezas), capD = RUEDAS_TRICICLO[T.tRuedaDel].carga, capT = RUEDAS_TRICICLO[T.tRuedaTras].carga;
    const peor = Math.min(capD / cr.del, capT / cr.tras), [carga, cap] = capD / cr.del <= capT / cr.tras ? [cr.del, capD] : [cr.tras, capT];
    c('rodaje', `Neumáticos: carga por rueda con todos a bordo y ${EQUIPAJE} kg de equipaje`, peor - 1, 0, `${Math.round(carga)} de ${cap} kg`);
  }
  // 2026-11-17: a motorcycle tyre (round crown, `ruedas/catalogo.ts`) on a Triciclo that does not lean stands on a narrow
  // strip of its crown: it wears the centre and grips less in a bend. A warning, not a failure; leaning (`tBascula`), none
  if (!m.bascula && [T.tRuedaDel, T.tRuedaTras].some(k => fichaRueda(k)?.perfil === 'moto')) c('rodaje', NEUMATICO_MOTO_SIN_INCLINAR, 0, 1, 'aviso');
  // the swing arm's pivot ahead of the rear wheel and behind the passenger's footpegs
  if (!m.filas && !m.butacas && !m.traseras) c('rodaje', 'Pivote del basculante detrás de los estribos del pasajero', (-1.30 + (m.sillines.xPasajero - ASIENTO.xPasajero) - 0.06) - m.basculante.pivote[0], 0.02);
  let tub = 9, peor = ''; for (const tb of m.tubos) { const h = tuboDentro(F, tb); if (h < tub) { tub = h; peor = tb.nombre; } }
  c('chasis', `Bastidor dentro de la carrocería${tub < 0.01 ? ` (${peor.toLowerCase()})` : ''}`, tub, 0.01);
  c('chasis', 'Bastidor: coeficiente de seguridad de los largueros', seguridad - 1.3, 0.5, `×${fmt(seguridad, 1)}`);
  for (const b of m.baterias) {
    // (2026-11-16: the pack along the frame may be wider than the body: this check says by how much it sticks out)
    if (b === m.paquete) { const h = cajaDentro(F, b); c('energia,carroceria', 'Batería dentro de la carrocería', h, 0.01, h < 0 ? `sobresale ${fmt(-h * 100, 1)} cm` : h < 0.01 ? `a ${fmt(h * 100, 1)} cm de la piel` : undefined); continue; }
    c('energia', `Batería, ${b.nombre.toLowerCase()}: dentro de la carrocería`, cajaDentro(F, b), 0.01);
  }
  const litrosBat = m.kWh * 1000 / L('tWhL');
  if (!m.paquete) {
    // the pilot's toes (17 cm ahead of the ankle) and the saddle's nose behind the battery
    const pie = m.occPts(true).F[0] + 0.17, pies = m.baterias.find(b => b.nombre === 'Módulo entre los pies');
    if (pies) c('energia', 'Batería: el módulo de entre los pies, delante del sillín', pies.x0 - (-0.835 + (m.sillines.xPiloto - ASIENTO.xPiloto) + 0.02), 0.0);
    else c('energia', 'Batería delante de los pies del piloto', m.baterias[0].x0 - pie, 0.02);
    // round two: what does not fit in the five places is not drawn; this says so (in litres)
    c('energia', 'Batería: cabe en su sitio (morro, entre los pies y bajo los sillines)', m.bateriaCabe - litrosBat + 1e-9, 0, litrosBat - m.bateriaCabe > 0.05 ? `${Math.round(litrosBat)} L · caben ${Math.round(m.bateriaCabe)}` : `${Math.round(litrosBat)} L`);
  } else {
    // 2026-11-12, the pack along the frame: clear of the cradle in front (its posts' rear face), of the controller
    // behind, of the rear wheel and its travel (one rear wheel), and under the seats (they stand on it, never in it)
    const k = m.paquete, rT = L('tChD') / 2000;
    // (a diamond, 2026-11-15: the laterals' cradle is a cross-member at the sides, over the pack; in front, the nose wheel)
    if (m.rombo) c('energia,rodaje', 'Batería: paquete a la rueda delantera', (-m.rR - 0.04) - k.x1, 0.02);
    else c('energia', 'Batería: paquete a la cuna de la suspensión delantera', (m.xF - rT) - k.x1, 0.02);
    // (the controller stands right behind the pack: what bounds them both is the rear shock tower)
    c('energia,propulsion', 'Controlador (detrás del paquete) a la torreta del amortiguador', m.inversor.x0 - (m.basculante.pivote[0] + 0.04 + rT), 0.015);
    if (!m.traseras) c('energia,rodaje', 'Batería: paquete a la rueda trasera (hundida)', k.x0 - (m.xR + m.rR + 0.04), 0.02);
    const fondoSillin = Math.max(0.33 + Math.min(m.sillines.yPiloto - ASIENTO.yPiloto, m.sillines.yPasajero - ASIENTO.yPasajero), m.sueloSillin + 0.005);
    const bajos = [...(m.filas ? m.asientosFilas.map(a => ({ x0: a.x - 0.17, x1: a.x - 0.17 + a.fondo, y: a.y - PAN_ASIENTO }))
      : m.butacas ? m.butacas.map(a => ({ x0: a.x - BUTACA.detras, x1: a.x + BUTACA.delante, y: a.y - BUTACA.pan }))
        : [{ x0: -1.745 + (m.sillines.xPasajero - ASIENTO.xPasajero), x1: -0.835 + (m.sillines.xPiloto - ASIENTO.xPiloto), y: fondoSillin }])]
      .filter(a => a.x1 > k.x0 && a.x0 < k.x1);
    if (bajos.length) c('energia,interior', 'Batería: paquete bajo los asientos', Math.min(...bajos.map(a => a.y)) - k.y1, 0.0);
    c('energia', 'Batería: capacidad del paquete (sus litros × Wh/L)', 1, 0, `${fmt(m.kWh, 1)} kWh · ${Math.round(litrosBat)} L`);
  }
  c('propulsion', 'Controlador dentro de la carrocería', cajaDentro(F, m.inversor), 0.01);
  // 2026-11-16: the plug-in hybrid's parts, drawn where hibrido.ts puts them (a part sticking out turns red in the 3D too)
  if (m.phev) {
    const h = m.phev.disp.holguras, arq = m.phev.arq, asoma = (v: number) => v < 0 ? `asoma ${fmt(-v * 100, 1)} cm` : undefined;
    const nT = arq === 'reparto' ? 'planetario y generador MG1' : arq === 'serie' ? 'generador' : 'embrague, motor-generador P2 y caja';
    c('propulsion', 'Híbrido: motor de gasolina dentro de la carrocería', h.motor, 0.01, asoma(h.motor));
    c('propulsion', `Híbrido: ${nT} dentro de la carrocería`, h.transmision, 0.01, asoma(h.transmision));
    c('propulsion', 'Híbrido: depósito de gasolina dentro de la carrocería', h.deposito, 0.01, asoma(h.deposito));
    c('propulsion', 'Híbrido: silencioso del escape dentro de la carrocería', h.escape, 0.005, asoma(h.escape));
    if (h.torreta != null) c('propulsion,rodaje', 'Híbrido: motor de gasolina a la torreta del amortiguador', h.torreta, 0, h.torreta < 0 ? `choca ${fmt(-h.torreta * 100, 1)} cm` : undefined);
    if (arq === 'reparto') {
      const k = cifrasHibrido('reparto', L('tVel'), 2 * m.rR, 0, m.phev.kW, m.phev.mec);
      c('propulsion', `Híbrido: vueltas del motor de gasolina a ${Math.round(L('tVel'))} km/h (máximo ${RPM_MAX_MOTOR} rpm)`, (RPM_MAX_MOTOR - k.motor) / RPM_MAX_MOTOR, 0, `${Math.round(k.motor / 10) * 10} rpm`);
    }
  }
  // a hub motor has the room its rim gives it: above that power, a motor on the swing arm with a belt (as on
  // electric motorcycles) would be the honest drive, and that is not drawn here
  const kWBuje = RUEDAS_TRICICLO[T.tRuedaTras].kWBuje, kWp = L('tKWPico');
  // four wheels (2026-11-11): the power split between two hub motors, each in its own rim
  // (2026-11-16) catalogue parts: voltages, the controller's current, the reduction gear (catalogoTren.ts). An inboard
  // motor is not in the rim, so the hub rule does not apply to it
  for (const k of comprobacionesCatalogo(T, { kWPico: kWp, motores: m.traseras ? 2 : 1, dRueda: RUEDAS_TRICICLO[T.tRuedaTras].d, velCalculo: L('tVel') })) c((k.dep ?? 'propulsion') as never, k.nombre, k.holgura, k.minimo, k.mostrar);
  if (motorDe(T.tCatMotor)?.montaje === 'central') { /* no hub motor: nothing in the rim */ }
  else if (m.traseras) c('propulsion', 'Motor de buje: potencia que cabe en cada rueda trasera (regla aproximada)', kWBuje - kWp / 2, 0, `${fmt(kWp / 2, 1)} de ${kWBuje} kW por rueda`);
  else c('propulsion', 'Motor de buje: potencia que cabe en la rueda trasera (regla aproximada)', kWBuje - kWp, 0, `${fmt(kWp, 1)} de ${kWBuje} kW`);
  // round three: the boot, in litres (always passes: it says how much there is)
  const maletero = maleterosTriciclo(m);
  c('interior', `Maletero (${m.filas ? (maletero.estado) : 'detrás del pasajero'})`, maletero.ahora / 1000, 0, `${Math.round(maletero.ahora)} L`);
  // ── 2026-11-12: the doors and the hatch as they swing (garaje/balaPuertas.ts), the dashboard, the mirrors
  const cm1 = (v: number) => `${fmt(v * 100, 1)} cm`;
  if (m.puerta) {
    const espejo = m.retrovisor?.enPuerta ? puntasRetrovisor(m.retrovisor) : [];
    const giros = m.rombo ? [0, 0] : [m.giro, anguloFuera(m.giro, m.batalla, F.VIA_LAT)];
    // (round 3: with two doors a side, each leaf on its own hinge, densely sampled, and against the rear pods as well)
    const hojas = m.puerta.segunda ? hojasPuerta(m.puerta) : null;
    const v = hojas ? vueloPuerta(F, m.puerta, espejo, giros, hojas[0], m.traseras) : vueloPuerta(F, m.puerta, espejo, giros);
    const v2 = hojas ? vueloPuerta(F, m.puerta, [], giros, hojas[1], m.traseras) : null;
    c('carroceria', 'Puerta: al abrirse no entra en la carrocería', -v.entra, -0.005, v.entra < 0.001 ? 'no entra' : `entra ${cm1(v.entra)}`);
    c('carroceria,rodaje', `Puerta abierta al carenado delantero y sus brazos (ruedas rectas y giradas a tope)`, v.carenado, 0.02);
    if (v2) {
      c('carroceria', 'Puerta de atrás: al abrirse no entra en la carrocería', -v2.entra, -0.005, v2.entra < 0.001 ? 'no entra' : `entra ${cm1(v2.entra)}`);
      c('carroceria,rodaje', 'Puerta de atrás abierta a los carenados y sus brazos', v2.carenado, 0.02);
      c('carroceria', 'Puerta de atrás abierta al suelo', v2.suelo, 0.05);
    }
    // round 2 (2026-11-12): what is left of the open door over the way in, from the sill's front to its rear edge
    // (round 3: of both doors, with two)
    const entrada = Math.min(v.entrada, v2?.entrada ?? 9), alto = Math.max(v.alto, v2?.alto ?? 0);
    c('carroceria,interior', `Puerta${v2 ? 's abiertas' : ' abierta'}: altura libre para entrar`, entrada, 1.40, entrada > 8 ? `nada encima · arriba a ${fmt(alto, 2)} m` : `${fmt(entrada, 2)} m libres`);
    c('carroceria', 'Puerta abierta al suelo', v.suelo, 0.05);
    c('carroceria', `Puerta${v2 ? 's abiertas' : ' abierta'}: lo que sale de lado (desde el centro)`, 1, 0, cm1(Math.max(v.punta, v2?.punta ?? 0)));
    // round 3: the two doors opening together, and the doors against the hatch at any opening of each (balaPuertas.ts `choquesHojas`)
    const ch2 = choquesHojas(F, m.puerta, espejo, m.porton);
    if (T.tPuertas2 === 'si') c('carroceria', 'Segunda puerta: cabe (las dos con 30 cm abajo y el montante B entre ellas)', m.puerta.segunda ? 1 : -1, 0, m.puerta.segunda ? 'cabe' : 'no cabe: una sola puerta');
    // round 4 (2026-11-13, «la puerta trasera es demasiado estrecha»): the passengers' way in along the sill, from the
    // B-pillar to the hinge, at least 60 cm (the bucket's cushion is 52 cm long, and the hips and thighs pass bent), and
    // where the passenger's hips are in it
    if (m.puerta.segunda) {
      const s2 = m.puerta.segunda, ancho = s2.x0 - s2.x1, pas = m.filas ? null : m.plazas.find(q => !q.piloto);
      c('carroceria,interior', 'Puerta de atrás: paso abajo para el pasajero (60 cm o más)', ancho, 0.60, pas ? `${cm1(ancho)} · sus caderas a ${cm1(s2.x0 - pas.pts.H[0])} del canto de delante y a ${cm1(pas.pts.H[0] - s2.x1)} de la bisagra` : cm1(ancho));
    }
    if (ch2.entreHojas !== null) c('carroceria', 'Puertas: la de delante y la de atrás, abriéndose a la vez, no se tocan', ch2.entreHojas, 0.03, ch2.entreHojas >= 0.03 ? 'a más de 3 cm' : ch2.entreHojas < 0 ? `se cruzan en la junta (${cm1(-ch2.entreHojas)})` : `a ${cm1(ch2.entreHojas)}`);
    if (ch2.conPorton !== null) c('carroceria', 'Puertas y portón: abiertos a la vez, no se tocan', ch2.conPorton, 0.03, ch2.conPorton >= 0.03 ? 'a más de 3 cm' : ch2.conPorton < 0 ? `se cruzan en la junta (${cm1(-ch2.conPorton)})` : `a ${cm1(ch2.conPorton)}`);
  }
  if (m.porton) {
    // (round 2: with the fin's tip, which rides on the hatch: it is the highest point once the hatch opens)
    const vp = vueloPorton(F, m.porton, m.aleta === null ? [] : [[F.X(ALETA.punta[0][0]), m.aleta, 0], [F.X(ALETA.punta[1][0]), m.aleta - 0.01, 0]]);
    c('carroceria', 'Portón: al abrirse no entra en la carrocería', -vp.entra, -0.005, vp.entra < 0.001 ? 'no entra' : `entra ${cm1(vp.entra)}`);
    c('carroceria', 'Portón abierto: altura de su punto más alto', 1, 0, `${fmt(vp.alto, 2)} m`);
  }
  if (m.salpicadero) {
    const s = m.salpicadero, o = m.plazas[0].pts; let h = 9;
    for (const x of [s.x0 - 0.01, (s.x0 + s.x1) / 2, s.x1]) for (const y of [x === s.x1 ? s.yBajo : s.yBajoDel, s.yTop]) { const z = F.ladoZ(x, y); h = Math.min(h, Number.isFinite(z) ? z - anchoSalpicadero(F, x, y) : -0.05); }
    c('interior', 'Salpicadero dentro de la carrocería', h, 0.01);
    // the pilot's knees (6 cm round) behind its rear face, where they are as high as it
    c('interior', 'Rodillas del piloto al salpicadero', o.K[1] + 0.06 > s.yBajo ? s.x1 - (o.K[0] + 0.06) : 0.5, 0.02);
  }
  if (m.retrovisor && !m.retrovisor.enPuerta) {
    // fixed on the body (with the opening canopy): it must clear the front pod (wheels straight)
    let h = 9; const POD = podDe(F), w = semiAncho(POD);
    for (const q of puntasRetrovisor(m.retrovisor)) { const xr = q[0] - F.X_LAT, alt = alturasPod(POD, xr); h = Math.min(h, alt ? Math.max(q[1] - alt[1], Math.abs(q[2] - F.VIA_LAT / 2) - w(xr, Math.min(alt[1] - 1e-3, q[1]))) : 0.5); }
    c('carroceria', 'Retrovisor al carenado delantero', h, 0.02);
  }

  const bala: ResultadosTriciclo = {
    tilt,
    area, vol, piel: ar.carroceria + ar.cristal, cristal: ar.cristal, cupula: [-m.cup.XC0, -m.cup.XC1],
    viaSubida: F.VIA_LAT > m.viaPedida + 1e-9 ? F.VIA_LAT : null, cabezas,
    piezas, cg: { x: cg.x, y: cg.y, masa: cg.masa, vacio: { x: vacio.x, y: vacio.y } }, vuelco: { ssf, ssfSolo, repartoDel },
    giro: { radio, dentro: di * 180 / Math.PI, fuera: dout * 180 / Math.PI },
    bastidor: { M: Mmax, tension, seguridad, metros },
    bateria: { litros: m.kWh * 1000 / L('tWhL'), kg: m.kWh * 1000 / L('tWhKg'), litrosMorro: 0.42 * 0.30 * Math.max(1, F.kW) * 0.20 * 1000, cabe: m.bateriaCabe },
    energia: cd ? energiaTriciclo(m, mVeh + kgOcc, cd, ar.solar) : null,
    maletero, ocupantes: nOcc,
  };
  const e = bala.energia, nada = NaN;
  // 2026-11-17: a catalogue tyre's speed symbol against the top speed (the old sizes have none on record: no check)
  { const v = Math.min(...[T.tRuedaDel, T.tRuedaTras].map(k => fichaRueda(k)?.vmax ?? Infinity));
    if (Number.isFinite(v) && e && Number.isFinite(e.vmaxNominal)) c('rodaje', 'Neumáticos: velocidad que admiten (su código de velocidad)', (v - e.vmaxNominal) / 100, 0, `${Math.round(e.vmaxNominal)} de ${v} km/h`); }
  return {
    A: area.total, FR: nada, Cd: e?.cd ?? nada, CdA: e?.CdA ?? nada, Crr: crrTriciclo(T), vol, Paero: nada, Proll: nada, Pw: e?.potencia ?? nada, WhKm: e?.WhKm ?? nada, pedWhKm: 0,
    autonomia: e?.autonomia ?? nada, vmax: e?.vmaxNominal ?? nada,
    masas, mVeh, mTot: mVeh + kgOcc, rangoMasa: [nada, nada], Mmax, tension, seguridad, cargaRueda: nada,
    solarPico: ar.solar * RENDIMIENTO_SOLAR * 1000, solarDia: solarDiaTriciclo(ar.solar, m.P.sol), kmSol: e?.kmSol ?? nada, areas: ar, comprobaciones: ch, triciclo: bala,
  };
}
