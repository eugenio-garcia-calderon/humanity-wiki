// Triciclo occupants: body points per seat, rows, places, battery boxes, the rear rail.
// Moved out of geometriaTriciclo.ts unchanged (2026-11-16, refactor «ordenar»); that file re-exports everything. See ../CLAUDE.md.
import type { TipoAsientoFila } from '../filasTriciclo';
import type { PuntosOcupante, P3 } from '../geometria';
import type { FormaBala } from '../garaje/balaForma';
import { ASIENTO, brazosDe, escalaManillar, type Asientos } from '../garaje/balaMedidas';
import { CADERA_SOBRE_ASIENTO, rodilla } from '../geometriaBala';
import type { CamposTriciclo } from './campos';
import { dentroDe, limitarTriciclo } from './medidas';

// ------------------------------------------------------------------ ocupantes
/**
 * El maniquí sentado con el respaldo reclinado `rec` grados (+ hacia atrás), como
 * en el Aeromóvil 1: el tronco se inclina entero y la cabeza un tercio (el cuello
 * la endereza). Cadera 10,8 cm sobre el sillín, hombros 50 cm por el tronco y la
 * cabeza 20 cm más allá por el cuello: con la talla media y el tronco erguido son
 * los 91,8 cm sentado del percentil 50 (ANSUR II), como en el Cuadriciclo en rombo.
 * Manos en los puños (piloto) o en el asidero (pasajero); pies en las plataformas
 * o en los estribos. `escala` 1 es la talla media.
 */
/**
 * 2026-11-12: `extra.alzaPas` lifts the passenger's footpegs and feet onto the pack along the frame; with a steering
 * wheel (`extra.volante`: hub and rim radius) the pilot's hands hold its rim at a quarter to three.
 */
export interface ExtraOcupante { alzaPas?: number; volante?: { c: [number, number]; r: number } | null; butaca?: PiernasButaca }
/**
 * Round 3 interior (2026-11-12): a rider in an Aptera bucket. The legs go forward as in a car: the pilot's ankle at the
 * pedals, the passenger's beside the pilot's seat, its knees round the pilot's backrest (as the rear passenger of a
 * Renault Twizy); `anchoPiernas`: hip, foot and knee off the rider's centre line (m); the passenger's hands on its thighs.
 */
export interface PiernasButaca { F: [number, number]; anchoPiernas: [number, number, number]; manoMuslo: boolean }
export function puntosTriciclo(F: FormaBala, S: Asientos, piloto: boolean, rec: number, man: [number, number], pies: [number, number], escala = 1, extra: ExtraOcupante = {}): PuntosOcupante {
  const R = rec * Math.PI / 180, RH = R * 0.35;
  const d: [number, number] = [-Math.sin(R), Math.cos(R)], dh: [number, number] = [-Math.sin(RH), Math.cos(RH)];
  const xH = piloto ? S.xPiloto : S.xPasajero, yS = piloto ? S.yPiloto : S.yPasajero;
  const H: [number, number] = [xH, yS + CADERA_SOBRE_ASIENTO * escala];
  const Sh: [number, number] = [H[0] + d[0] * 0.5 * escala, H[1] + d[1] * 0.5 * escala];
  const C: [number, number] = [Sh[0] + dh[0] * 0.2 * escala, Sh[1] + dh[1] * 0.2 * escala];
  const dxPil = S.xPiloto - ASIENTO.xPiloto, dxPas = S.xPasajero - ASIENTO.xPasajero, kz = Math.min(1, F.kW);
  const Fp: [number, number] = extra.butaca ? extra.butaca.F : piloto ? [-0.52 + dxPil + pies[0], 0.235 + F.dSuelo + F.elevar + pies[1]] : [-1.30 + dxPas, 0.29 + F.dSuelo + F.elevar + (extra.alzaPas ?? 0)];
  const K = rodilla(H, Fp, 0.45 * escala, 0.47 * escala);
  if (extra.butaca?.manoMuslo) {
    // (round 3 interior: the passenger in a bucket, hands on its thighs, as `puntosFila`)
    const mano: [number, number] = [H[0] + (K[0] - H[0]) * 0.6, H[1] + (K[1] - H[1]) * 0.6 + 0.08];
    return { H, S: Sh, C, K, F: Fp, d, dh, hx: xH, mano, anchoMano: 0.16, anchoPiernas: extra.butaca.anchoPiernas };
  }
  const vol = piloto ? extra.volante : null;
  const mano: [number, number] = vol ? [vol.c[0], vol.c[1]] : piloto ? [-0.592 + man[0], 0.870 + F.dSuelo + F.elevar + man[1]] : [-1.45 + dxPas, 0.505 + (S.yPasajero - ASIENTO.yPasajero)];
  const kb = escalaManillar(F, man);
  return { H, S: Sh, C, K, F: Fp, d, dh, hx: xH, mano, anchoMano: vol ? vol.r : piloto ? 0.265 * kb : 0.19 * kz, anchoPiernas: extra.butaca ? extra.butaca.anchoPiernas : piloto ? [0.13, 0.15 * kz] : [0.17, 0.20 * kz] };
}
/**
 * A passenger of «tres filas» (round three) on a car-style seat: the trunk and head as the astride riders
 * (`puntosTriciclo`), the feet forward on the floor (`yPiso`, heel down, ankle 7 cm up), 60 cm ahead of the hips
 * (under the seat in front, as in a car), the knees where the legs put them, the hands on the thighs.
 */
export function puntosFila(xH: number, yS: number, rec: number, yPiso: number, escala = 1, pies = 0.10): PuntosOcupante {
  const R = rec * Math.PI / 180, RH = R * 0.35;
  const d: [number, number] = [-Math.sin(R), Math.cos(R)], dh: [number, number] = [-Math.sin(RH), Math.cos(RH)];
  const H: [number, number] = [xH, yS + CADERA_SOBRE_ASIENTO * escala];
  const Sh: [number, number] = [H[0] + d[0] * 0.5 * escala, H[1] + d[1] * 0.5 * escala];
  const C: [number, number] = [Sh[0] + dh[0] * 0.2 * escala, Sh[1] + dh[1] * 0.2 * escala];
  const Fp: [number, number] = [xH + 0.60 * escala, yPiso + 0.07];
  const K = rodilla(H, Fp, 0.45 * escala, 0.47 * escala);
  const mano: [number, number] = [H[0] + (K[0] - H[0]) * 0.6, H[1] + (K[1] - H[1]) * 0.6 + 0.08];
  return { H, S: Sh, C, K, F: Fp, d, dh, hx: xH, mano, anchoMano: 0.13, anchoPiernas: [0.09, pies] };
}
/** A seat of «tres filas»: hips x, centre z, cushion top y, its size, its recline and whether it is folded. */
export interface AsientoFila {
  fila: 1 | 2 | 3; x: number; z: number; y: number; ancho: number; fondo: number; respaldo: number; rec: number; plegado: boolean;
  /** 2026-11-16 (filasTriciclo.ts): the kind of seat and, for a bench, how many places it carries. Absent: a car seat for one, as before. */
  tipo?: TipoAsientoFila; plazas?: number;
}
/** Who sits where (the viewer draws them, the mass and the checks count them). */
export interface Plaza { nombre: string; fila: 1 | 2 | 3; z: number; piloto: boolean; pts: PuntosOcupante; talla: (escala: number) => PuntosOcupante }

/**
 * Centro de gravedad de una persona sentada, de sus puntos: cabeza 8 %, tronco
 * 50 % (a 40 % de la cadera a los hombros), brazos 10 %, muslos 20 %, piernas y
 * pies 12 %. Reparto de Dempster (1955), redondeado.
 */
export function cgOcupante(o: PuntosOcupante): [number, number] {
  const P: [number, [number, number]][] = [
    [0.08, o.C], [0.50, [o.H[0] + (o.S[0] - o.H[0]) * 0.4, o.H[1] + (o.S[1] - o.H[1]) * 0.4]],
    [0.10, [(o.S[0] + o.mano[0]) / 2, (o.S[1] + o.mano[1]) / 2]], [0.20, [(o.H[0] + o.K[0]) / 2, (o.H[1] + o.K[1]) / 2]], [0.12, [(o.K[0] + o.F[0]) / 2, (o.K[1] + o.F[1]) / 2]],
  ];
  return [P.reduce((s, [m, p]) => s + m * p[0], 0), P.reduce((s, [m, p]) => s + m * p[1], 0)];
}

// ------------------------------------------------------------------ piezas dentro
export interface Caja { nombre: string; x0: number; x1: number; y0: number; y1: number; hz: number }
/** Medio ancho de los dos largueros del bastidor (eje a eje), m. */
export const Z_LARGUERO = 0.11;
/**
 * El paquete de batería, sobre los largueros. Se llena por orden:
 *   1. un módulo ancho en el morro, donde iba la rueda delantera del Cuadriciclo en rombo (20 cm de alto);
 *   2. un módulo estrecho entre los pies del piloto, hasta 2 cm del morro de su sillín;
 * y desde la segunda versión (2026-11-10, «una batería más potente», hasta 30 kWh):
 *   3. el módulo del morro sube hasta 26 cm (por encima van la cremallera de la dirección y el salpicadero);
 *   4. el módulo del morro crece hacia la punta mientras quepa, a 1 cm de la piel;
 *   5. un módulo plano bajo los dos sillines, entre sus soportes, hasta el controlador.
 * Lo que no cabe en los cinco no se dibuja: se cuenta su masa (en el centro de lo dibujado) y la
 * comprobación «Batería: cabe en su sitio» dice cuántos litros faltan. Con un morro más largo o una
 * carrocería más ancha (el módulo del morro se ensancha con ella) cabe más; con celdas más densas, ocupa menos.
 */
export function bateriaEn(F: FormaBala, T: CamposTriciclo, yBase: number, lim: { xSillin: number; ySillin: number; xFin: number }): { cajas: Caja[]; litros: number; capacidad: number } {
  const litros = limitarTriciclo('tKWh', T) * 1000 / limitarTriciclo('tWhL', T), V = litros / 1000;
  const alto = 0.20, alto2 = 0.26, partido = -0.30;
  // the nose module widens with a wider body (never narrower than today's 30 cm)
  const aF = 0.30 * Math.max(1, F.kW), aR = 0.18, aU = 0.10;
  // its front face at 12 cm ahead of the Cuadriciclo en rombo's front wheel, or further back where a low, short nose has no room there
  const cabeFrente = (x: number, h: number) => [yBase, yBase + h].every(y => [-aF / 2, aF / 2].every(z => dentroDe(F, x, y, z) > 0));
  let delante = 0.12; while (delante > partido + 0.1 && !cabeFrente(delante, alto)) delante -= 0.005;
  const Vmax = (delante - partido) * aF * alto;
  const cajas: Caja[] = [];
  if (V <= Vmax) {
    cajas.push({ nombre: 'Módulo del morro', x0: delante - V / (aF * alto), x1: delante, y0: yBase, y1: yBase + alto, hz: aF / 2 });
    return { cajas, litros, capacidad: litros };
  }
  const largoPies = Math.max(0, partido - lim.xSillin), Vpies = largoPies * aR * alto;
  if (V <= Vmax + Vpies) {
    cajas.push({ nombre: 'Módulo del morro', x0: partido, x1: delante, y0: yBase, y1: yBase + alto, hz: aF / 2 });
    cajas.push({ nombre: 'Módulo entre los pies', x0: partido - (V - Vmax) / (aR * alto), x1: partido, y0: yBase, y1: yBase + alto, hz: aR / 2 });
    return { cajas, litros, capacidad: litros };
  }
  let resto = V - Vmax - Vpies;
  // 3. the nose module taller
  const Valto = (delante - partido) * aF * (alto2 - alto), dAlto = Math.min(resto, Valto);
  const hN = alto + dAlto / ((delante - partido) * aF); resto -= dAlto;
  // 4. forward, while its front face stays 1 cm inside the skin
  let xFr = delante;
  if (resto > 0) for (let x = delante + 0.01; x < F.X_MORRO; x += 0.01) {
    let ok = true;
    for (const y of [yBase, yBase + hN]) for (const z of [-aF / 2, aF / 2]) if (dentroDe(F, x, y, z) < 0.01) ok = false;
    if (!ok) break;
    xFr = x;
  }
  const dFr = Math.min(resto, (xFr - delante) * aF * hN); resto -= dFr;
  cajas.push({ nombre: 'Módulo del morro', x0: partido, x1: delante + dFr / (aF * hN), y0: yBase, y1: yBase + hN, hz: aF / 2 });
  if (largoPies > 0) cajas.push({ nombre: 'Módulo entre los pies', x0: lim.xSillin, x1: partido, y0: yBase, y1: yBase + alto, hz: aR / 2 });
  // 5. under the saddles: from the pilot's saddle nose back to the controller, up to the saddles' frame
  const xU1 = Math.min(lim.xSillin, partido), hU = lim.ySillin - yBase, Vu = hU > 0.03 ? Math.max(0, xU1 - lim.xFin) * aU * hU : 0;
  const dU = Math.min(resto, Vu); resto -= dU;
  if (dU > 1e-6) cajas.push({ nombre: 'Módulo bajo los sillines', x0: xU1 - dU / (aU * hU), x1: xU1, y0: yBase, y1: yBase + hU, hz: aU / 2 });
  return { cajas, litros, capacidad: litros - resto * 1000 };
}

/** Round 3 interior: the pilot's ankle ahead of the hips at the pedals (m, plus «Pedales: hacia delante»), and the legs' spread (hip, foot, knee off the centre line). */
export const PEDAL_BUTACA = 0.76, PIES_BUTACA: [number, number, number] = [0.10, 0.12, 0.12];
/** The passenger's ankle ahead of its hips (m), beside the pilot's seat; its knees round the pilot's backrest (`BUTACA`: 22.5-24 cm half-width). */
export const PIES_PASAJERO_BUTACA = 0.72, PIES_PASAJERO: [number, number, number] = [0.10, 0.31, 0.33];
/**
 * Round 3 interior (2026-11-12): the rails' run on from the shock tower to the rear axle (four wheels only: with one
 * rear wheel it runs in the tail between them). Where the tail sweeps up, the rail kicks up with the belly (3.5 cm over
 * it, as along the cabin) and closes in where the tail narrows, keeping 1.5 cm to the skin; at the rear axle a cradle
 * (a post each side and a top bar) up to where the rear pods' upper arms meet the body.
 */
export function largueroTrasero(F: FormaBala, Ft: FormaBala, xPiv: number, yL: number, zL: number, dT: number) {
  const xR = Ft.X_LAT, r = dT / 2, n = Math.max(2, Math.ceil((xPiv - xR) / 0.04));
  const vientre = (x: number) => { const s = F.seccionRapida(x); let yb = Infinity; for (let j = 1; j < s.length; j += 2) yb = Math.min(yb, s[j]); return Number.isFinite(yb) ? yb : F.D.suelo; };
  const cabe = (x: number, y: number, z: number) => dentroDe(F, x, y - r, z + r) >= 0.015 && dentroDe(F, x, y + r, z + r) >= 0.015;
  const ruta: P3[] = [];
  let z = zL;
  for (let i = 0; i <= n; i++) {
    const x = xPiv + (xR - xPiv) * i / n, y = Math.max(yL, vientre(x) + 0.035 + r);
    while (z > 0.05 && !cabe(x, y, z)) z -= 0.005;
    ruta.push([x, y, z]);
  }
  const [, y, zE] = ruta[ruta.length - 1], arriba = brazosDe(Ft)[0];
  const yArriba = Math.max(y + 0.10, arriba.yCuerpo);
  let zArriba = zE; while (zArriba > 0.05 && !(dentroDe(F, xR, yArriba, zArriba + r) >= 0.015)) zArriba -= 0.005;
  return { ruta, y, z: zE, yArriba, zArriba };
}
