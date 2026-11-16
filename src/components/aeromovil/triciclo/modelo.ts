// Triciclo model: crearModeloTriciclo (geometry from the fields) and cabin/steering-wheel/mirror helpers.
// Moved out of geometriaTriciclo.ts unchanged (2026-11-16, refactor «ordenar»); that file re-exports everything. See ../CLAUDE.md.
import { filasDetras, medidasAsiento, nombrePlaza, numFila } from '../filasTriciclo';
import { interiorTriciclo, type SeatInterior } from '../interiorTriciclo';
import { disponerHibrido, rendimientoHibrido, type ArqHibrido } from '../hibrido';
import { termicoDe } from '../catalogoTren';
import { type Parametros, type Rueda, type Tubo, type P3, MATERIALES_CHASIS } from '../geometria';
import { TRICICLO_DEFECTO } from './defecto';
import { T3, punto, type FormaBala } from '../garaje/balaForma';
import { APLASTADO_BALA, ASIENTO, BUTACA, anchoMaxPod, areaMarco, areaXT, bandaMarco, brazosDe, contornoCupula, techoEn, ventanasDe, type OpcionesVentanas } from '../garaje/balaMedidas';
import { MONTANTE_B, MONTANTE_C, portonDe, puertaDe, type OpcionesPorton, type OpcionesPuertas, type V3 } from '../garaje/balaPuertas';
import { type ClaveNumTriciclo, esRombo, conPuertas, conButacas, conSalpicadero, largueroAlEje } from './campos';
import { dentroDe, ASIENTOS_FILAS, Z_FILA2, PIES_FILA2, PIES_FILA3, paqueteX, semiPaquete, semiLarguero, T_BORDE_LISA, T_PANEL_LISA, conLisa, fondoPaquete, camposTriciclo, rangoTriciclo, techoBajo, limitarTriciclo, medidasTriciclo } from './medidas';
import { type PiernasButaca, puntosTriciclo, puntosFila, type AsientoFila, type Plaza, type Caja, Z_LARGUERO, bateriaEn, PEDAL_BUTACA, PIES_BUTACA, PIES_PASAJERO_BUTACA, PIES_PASAJERO, largueroTrasero } from './ocupantes';
import { ejeBascula } from './bascula';

/** El modelo del Triciclo: la forma, los ocupantes, el bastidor, la batería, el motor y lo que lee el visor. */
export function crearModeloTriciclo(P: Parametros) {
  const T = camposTriciclo(P);
  const { D, F, asientos, aleta, viaPedida, giro, elevar, traseras } = medidasTriciclo(T);
  const cup = contornoCupula(F);
  const L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T);
  /** 2026-11-13: the smooth body (`tCubierta: 'lisa'`). */
  const lisa = conLisa(T);
  const rF = F.R_LAT, rR = F.R_DEL, xR = -F.BATALLA, via = F.VIA_LAT, xF = F.X_LAT;
  const semiPod = anchoMaxPod(F);
  // four wheels (2026-11-11): the widest of the two axles, each with its pods
  const viaTras = traseras ? traseras.VIA_LAT : 0, semiPodTras = traseras ? anchoMaxPod(traseras) : 0;
  const anchoTotal = Math.round((traseras ? Math.max(via + 2 * semiPod, viaTras + 2 * semiPodTras) : via + 2 * semiPod) * 1000) / 1000;
  // 2026-11-15: in a diamond, the nose wheel (the rear one's size, at x = 0 where the Cuadriciclo en rombo had it) and the pods' are the lateral ones
  const rombo = esRombo(T), nPod = rombo ? 'lateral' : 'delantera';
  const ruedas: Rueda[] = [
    ...(rombo ? [{ nombre: 'Rueda delantera (morro)', x: 0, z: 0, r: rR, w: F.ANCHO_NEU }] : []),
    { nombre: `Rueda ${nPod} der.`, x: xF, z: via / 2, r: rF, w: F.ANCHO_NEU_LAT }, { nombre: `Rueda ${nPod} izq.`, x: xF, z: -via / 2, r: rF, w: F.ANCHO_NEU_LAT },
    ...(traseras
      ? [{ nombre: 'Rueda trasera der.', x: xR, z: viaTras / 2, r: rR, w: F.ANCHO_NEU }, { nombre: 'Rueda trasera izq.', x: xR, z: -viaTras / 2, r: rR, w: F.ANCHO_NEU }]
      : [{ nombre: 'Rueda trasera', x: xR, z: 0, r: rR, w: F.ANCHO_NEU }]),
  ];
  const rec = { piloto: L('tRecPil'), pasajero: L('tRecPas') };
  // ── bastidor: dos largueros sobre la panza, travesaños, la cuna de la batería y la suspensión delantera, los soportes de los sillines y la torreta del amortiguador
  const dT = L('tChD') / 1000, pared = L('tChT') / 1000, mat = MATERIALES_CHASIS[T.tChMat].n;
  // the rails narrow with a narrower body (they run along the flat of the belly)
  const yL = D.suelo + 0.035 + dT / 2, zL0 = Z_LARGUERO * Math.min(1, F.kW);
  // round 3 interior (2026-11-12): the rails' spacing (`tChSep`); wider than before, they close in to the old spacing ahead of the front cradle
  const zL = T.tChSep === TRICICLO_DEFECTO.tChSep ? zL0 : semiLarguero(T), xF0 = -L('tEjeDel'), xCodo = Math.min(xF0, -0.09);
  const zRiel = (x: number) => zL === zL0 || x <= xCodo ? zL : zL0 + (zL - zL0) * Math.min(1, (0.06 - x) / (0.06 - xCodo));
  const butacas = conButacas(T);
  // 2026-11-12 (Eugenio: «la batería esté a lo largo del chasis y que sobresalga un 50 % del ancho del chasis»): one pack
  // on the rails, centred, from `tBatX` back `tBatLargo`, `tBatAncho` % of the frame's width (outer face to outer face
  // of the two rails), `tBatAlto` tall. Where it runs, it is the floor: the feet and the seats stand on it.
  // round 2 (2026-11-12): on the belly, with the rails through it (`fondoPaquete`), so the seats come down onto it
  const px = paqueteX(T), yBat0 = px ? fondoPaquete(T) + elevar : 0;
  const paquete: Caja | null = px ? { nombre: 'Paquete a lo largo del bastidor', x0: px[1], x1: px[0], y0: yBat0, y1: yBat0 + L('tBatAlto'), hz: semiPaquete(T) } : null;
  /** How much a thing whose bottom is at `y`, between x0 and x1 and out to |z| ≥ z0 from the centre line, must rise to stand on the pack (m). */
  const sobrePaquete = (x0: number, x1: number, z0: number, y: number) => paquete && x1 > paquete.x0 - 0.02 && x0 < paquete.x1 + 0.02 && z0 < paquete.hz + 0.02 ? Math.max(0, paquete.y1 + 0.004 - y) : 0;
  const dxPil0 = asientos.xPiloto - ASIENTO.xPiloto, dxPas0 = asientos.xPasajero - ASIENTO.xPasajero, kz0 = Math.min(1, F.kW);
  // the pilot's footboards (their lowest point 4.7 cm under their centre: tilted 20°) and the passenger's footpegs (their bracket's foot)
  const alzaPil = butacas ? 0 : sobrePaquete(-0.67 + dxPil0 + L('tPiesX'), -0.43 + dxPil0 + L('tPiesX'), 0.15 * kz0 - 0.045, 0.205 + F.dSuelo + elevar + L('tPiesY') - 0.047);
  const alzaPas = T.tAsientos !== 'horcajadas' ? 0 : sobrePaquete(-1.33 + dxPas0, -1.27 + dxPas0, 0.10 * kz0, 0.23 + F.dSuelo + elevar);
  const man: [number, number] = [-L('tManX'), L('tManY')], pies: [number, number] = [L('tPiesX'), L('tPiesY') + alzaPil];
  // 2026-11-12: the steering wheel (Eugenio: «cambia el manillar por un volante»): hub and rim, tilted with its top forward
  const volante = T.tMando === 'volante' ? { c: [-0.60 - L('tVolX'), 0.90 + F.dSuelo + elevar + L('tVolY')] as [number, number], r: L('tVolD') / 2, inc: L('tVolInc') * Math.PI / 180, atras: 0, baja: 0 } : null;
  // the rim keeps 1 cm inside the body. Where the windscreen is too low for it (a low or long canopy, the wheel raised),
  // round 2 (2026-11-12): the column first grows back towards the pilot, where the canopy is higher (up to 25 cm,
  // `atras`), and only then the wheel comes down (`baja`), as the handlebar narrows (`escalaManillar`)
  if (volante) {
    const fuera = () => aroVolante(volante, 32).some(q => { const z = F.ladoZ(q[0], q[1]); return !(Number.isFinite(z) && z - Math.abs(q[2]) - 0.015 >= 0.01); });
    while (fuera() && volante.atras < 0.25) { volante.c[0] -= 0.005; volante.atras += 0.005; }
    while (fuera() && volante.baja < 0.30) { volante.c[1] -= 0.005; volante.baja += 0.005; }
  }
  const occ = (piloto: boolean, escala = 1) => puntosTriciclo(F, asientos, piloto, piloto ? rec.piloto : rec.pasajero, man, pies, escala, { alzaPas, volante, ...(butacas ? { butaca: piernasButaca(piloto) } : {}) });
  // three rows (round three): where rows 2 and 3 sit (their cushions at the passenger's saddle height), and the floor on the rails
  const filas = T.tAsientos === 'filas', yPiso = yL + dT / 2 + 0.02;
  const x2 = asientos.xPiloto - L('tFila2X'), x3 = x2 - L('tFila3X'), yAsiento = asientos.yPasajero;
  const xPiv = xR + L('tBasculante'), yPiv = yL + 0.03;
  const yBat = yL + dT / 2 + 0.005;
  const dyPil = asientos.yPiloto - ASIENTO.yPiloto, dyPas = asientos.yPasajero - ASIENTO.yPasajero, dxPil = asientos.xPiloto - ASIENTO.xPiloto, dxPas = asientos.xPasajero - ASIENTO.xPasajero;
  // (with the pack along the frame, the controller stands on the rails right behind it, `finPaquete`)
  const inversor: Caja = paquete ? { nombre: 'Controlador', x0: paquete.x0 - 0.22, x1: paquete.x0 - 0.02, y0: yL + dT / 2 + 0.01, y1: yL + dT / 2 + 0.09, hz: 0.07 }
    : { nombre: 'Controlador', x0: -1.86 + dxPas * 0, x1: -1.66, y0: yL + dT / 2 + 0.01, y1: yL + dT / 2 + 0.09, hz: 0.07 };
  // the battery's room: the pilot's saddle nose (2 cm), under the saddles' frame (3 cm) and ahead of the controller (2 cm)
  // the battery: spread out (morro, pies, bajo los sillines: until 2026-11-12, and still the default) or one pack along the frame,
  // whose size decides its capacity (its litres × the cells' Wh/L): the «Batería» kWh slider then only reads it
  const bat = paquete
    ? (() => { const litros = (paquete.x1 - paquete.x0) * (paquete.y1 - paquete.y0) * 2 * paquete.hz * 1000; return { cajas: [paquete], litros, capacidad: litros }; })()
    : bateriaEn(F, T, yBat, { xSillin: -0.835 + dxPil + 0.02, ySillin: Math.min(0.335 + dyPil, 0.35 + dyPas) - 0.03, xFin: inversor.x1 + 0.02 });
  const kWh = paquete ? bat.litros * L('tWhL') / 1000 : L('tKWh');
  const baterias = bat.cajas;
  const yTopBat = Math.max(...baterias.map(b => b.y1));
  const yCuna = yTopBat + 0.03, xCuna = xF, zCuna = 0.18;
  const T_ = (nombre: string, a: P3, b: P3, d = dT, curva?: P3[]): Tubo => ({ nombre, grupo: 'Chasis', a, b, d, pared, material: mat, ...(curva ? { curva } : {}) });
  const tubos: Tubo[] = [];
  // a seat's post: from the rail (or from the pack's top where it runs under it) up to the seat; none if the seat sits right on it
  const poste = (nombre: string, a: P3, b: P3) => {
    const base = paquete && a[0] > paquete.x0 - 0.02 && a[0] < paquete.x1 + 0.02 ? paquete.y1 : yL;
    const arriba = Math.max(b[1], base + 0.005);
    if (arriba - base >= 0.03) tubos.push(T_(nombre, [a[0], base, base === yL ? a[2] : Math.sign(a[2]) * Math.min(Math.abs(a[2]), Math.abs(b[2]))], [b[0], arriba, b[2]]));
  };
  // (with the pack along the frame there is no battery in the nose: the cradle only carries the front suspension)
  const cuna = paquete ? 'Cuna de la suspensión delantera' : 'Cuna de la batería';
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'der.' : 'izq.';
    if (zL === zL0) tubos.push(T_(`Larguero ${lado}`, [0.06, yL, s * zL], [xPiv, yL, s * zL]));
    else tubos.push(T_(`Larguero ${lado}`, [0.06, yL, s * zL0], [xPiv, yL, s * zL], dT, [[0.06, yL, s * zL0], [xCodo, yL, s * zL], [xPiv, yL, s * zL]]));
    // the cradle round the nose module: a post each side up to the top bar, on which the front suspension pivots
    tubos.push(T_(`${cuna}: poste ${lado}`, [xCuna, yL, s * zRiel(xCuna)], [xCuna, yCuna, s * zCuna]));
    // round 3 interior: an Aptera bucket each, on a post each side from the rail to its shell's underside, under its hips
    if (butacas) for (const [n, x, y] of [['piloto', asientos.xPiloto, asientos.yPiloto], ['pasajero', asientos.xPasajero, asientos.yPasajero]] as const) poste(`Soporte de la butaca del ${n} ${lado}`, [x + 0.02, yL, s * zL], [x + 0.02, y - BUTACA.pan, s * 0.13]);
    // the pilot's saddle and the passenger's: a post each side from the rail up to the saddle's underside
    else {
    poste(`Soporte del sillín del piloto ${lado}`, [-0.95 + dxPil, yL, s * zL], [-1.02 + dxPil, 0.335 + dyPil + F.dSuelo * 0, s * 0.08]);
    if (!filas) poste(`Soporte del sillín del pasajero ${lado}`, [-1.50 + dxPas, yL, s * zL], [-1.55 + dxPas, 0.35 + dyPas, s * 0.08]);
    else {
      // three rows (round three): a post under each seat of row 2 and a pair under row 3, from the rails to the seat's pan
      poste(`Soporte del asiento de la fila 2 ${lado}`, [x2 + 0.04, yL, s * zL], [x2 - 0.02, yAsiento - 0.09, s * (numFila(T.tFila2N, 2) === 1 ? 0.10 : Z_FILA2)]);
      poste(`Soporte del asiento de la fila 3 ${lado}`, [x3 + 0.04, yL, s * zL], [x3 - 0.02, yAsiento - 0.09, s * 0.10]);
    }
    }
    // the shock tower: from the rail at the swing-arm pivot up and back to the shock's top mount
    tubos.push(T_(`Torreta del amortiguador ${lado}`, [xPiv + 0.04, yL, s * zL], [xPiv - 0.06, yPiv + 0.26, s * 0.05]));
  }
  tubos.push(T_('Travesaño delantero', [0.06, yL, -zL0], [0.06, yL, zL0]));
  tubos.push(T_(`${cuna}: barra de arriba`, [xCuna, yCuna, -zCuna], [xCuna, yCuna, zCuna]));
  tubos.push(T_('Travesaño de las plataformas', [-0.55 + dxPil + pies[0], yL, -zL], [-0.55 + dxPil + pies[0], yL, zL]));
  tubos.push(T_('Travesaño bajo los sillines', [-1.25, yL, -zL], [-1.25, yL, zL]));
  tubos.push(T_('Travesaño del basculante', [xPiv, yL, -zL], [xPiv, yL, zL]));
  // (seats down on the frame, 2026-11-12: the crossbar never below the rails' top)
  if (filas) { const yt = Math.max(yAsiento - 0.09, yL + dT); const zt = numFila(T.tFila2N, 2) === 1 ? 0.20 : Z_FILA2 + 0.10; tubos.push(T_('Travesaño de la fila 2', [x2 - 0.02, yt, -zt], [x2 - 0.02, yt, zt])); }
  // the steering-column support: from the cradle's top bar back and up to the steering head under the dash
  // (round 4, 2026-11-13, «el alto total no se puede bajar más»: below the old floor of «Alto total», 1.15 m, the head comes
  // down to stay 2 cm under the top line there; at 1.15 and above, where every saved design is, it is where it always was)
  const cabeza: P3 = [-0.44 - man[0] * 0, techoBajo(T) ? Math.min(0.80 + F.dSuelo + elevar, techoEn(F, -0.44) - 0.02) : 0.80 + F.dSuelo + elevar, 0];
  tubos.push(T_('Soporte de la columna de dirección', [xCuna, yCuna, 0], cabeza, dT, [[xCuna, yCuna, 0], [-0.22, yCuna + 0.20, 0], cabeza]));
  // round 3 interior (2026-11-12, Eugenio: «el chasis no llega hasta el final. Debería alargarse el tubo»): with two rear
  // wheels, the rails on to the rear axle, where the rear pods' arms bring their loads in, and a cradle there
  const trasero = largueroAlEje(T) && traseras ? largueroTrasero(F, traseras, xPiv, yL, zL, dT) : null;
  if (trasero) {
    for (const s of [1, -1]) {
      const lado = s > 0 ? 'der.' : 'izq.', ruta = trasero.ruta.map(([x, y, z]) => [x, y, s * z] as P3);
      tubos.push(T_(`Larguero trasero ${lado}`, ruta[0], ruta[ruta.length - 1], dT, ruta));
      tubos.push(T_(`Cuna trasera: poste ${lado}`, [xR, trasero.y, s * trasero.z], [xR, trasero.yArriba, s * trasero.zArriba]));
    }
    tubos.push(T_('Travesaño del eje trasero', [xR, trasero.y, -trasero.z], [xR, trasero.y, trasero.z]));
    tubos.push(T_('Cuna trasera: barra de arriba', [xR, trasero.yArriba, -trasero.zArriba], [xR, trasero.yArriba, trasero.zArriba]));
  }
  // round 3 interior: where the legs go with the Aptera buckets (the pilot's heel on the floor between the rails, on the
  // pack, or on a plate over the front cradle's top bar; the passenger's beside the pilot's seat, on the belly or the pack)
  const pisoEn = (x: number, zi: number, zo: number) => {
    let y = D.suelo + 0.03; while (y < yL + 0.3 && dentroDe(F, x, y, zo) < 0.015) y += 0.005;
    if (zi < zL + dT / 2) y = Math.max(y, yL + dT / 2);
    return paquete && x > paquete.x0 - 0.02 && x < paquete.x1 + 0.02 && zi < paquete.hz + 0.02 ? Math.max(y, paquete.y1 + 0.004) : y;
  };
  const pedales = butacas ? (() => {
    const x = asientos.xPiloto + PEDAL_BUTACA + L('tPiesX');
    let y = pisoEn(x - 0.06, PIES_BUTACA[1] - 0.045, PIES_BUTACA[1] + 0.045);
    if (Math.abs(x - 0.06 - xCuna) < 0.12) y = Math.max(y, yCuna + dT / 2 + 0.012);
    return { x, talon: y + L('tPiesY'), z: PIES_BUTACA[1] };
  })() : null;
  function piernasButaca(piloto: boolean): PiernasButaca {
    if (piloto) return { F: [pedales!.x, pedales!.talon + 0.07], anchoPiernas: PIES_BUTACA, manoMuslo: false };
    // (its feet as far out as the body lets them, 1 cm inside the skin (as the check): in a narrow body they close in, and the check
    // «a los lados del asiento del piloto» says when they no longer pass)
    const x = asientos.xPasajero + PIES_PASAJERO_BUTACA, [zc, zf0, zk] = PIES_PASAJERO;
    let zf = zf0, y = pisoEn(x - 0.06, zf - 0.045, zf + 0.045);
    while (zf > 0.12 && ![x, x + 0.09, x + 0.18].every(xx => [y, y + 0.11].every(yy => dentroDe(F, xx, yy, zf + 0.045) >= 0.01))) { zf -= 0.005; y = pisoEn(x - 0.06, zf - 0.045, zf + 0.045); }
    return { F: [x, y + 0.07], anchoPiernas: zf === zf0 ? PIES_PASAJERO : [zc, zf, zk - (zf0 - zf)], manoMuslo: true };
  }

  // ── suspensión, dirección y motor (posiciones; el visor los dibuja y la masa los cuenta por deslizador)
  const recTras = L('tRecTras') / 1000, recDel = L('tRecDel') / 1000;
  // the swing arm's legs clear the tyre by 3.5 cm (7.5 cm from the centre with the 80 mm moped tyre, as before)
  const basculante = { pivote: [xPiv, yPiv] as [number, number], eje: [xR, rR - APLASTADO_BALA] as [number, number], z: Math.max(0.075, F.ANCHO_NEU / 2 + 0.035) };
  const amortiguador = { abajo: [xR + 0.4 * (xPiv - xR), (rR + yPiv) / 2 + 0.03] as [number, number], arriba: [xPiv - 0.06, yPiv + 0.26] as [number, number] };
  const brazos = brazosDe(F);
  const cremallera = { x: -0.03, y: Math.max(0.47 + elevar, yTopBat + 0.05), z: 0.15 };
  const motor = { tipo: 'buje' as const, c: [xR, rR - APLASTADO_BALA] as [number, number], r: 0.115 * rR / 0.305, ancho: 0.10 };

  // ── techo solar y ventanas (balaMedidas.ts `ventanasDe`): on the canopy glass, the shape does not change
  const opcVentanas: OpcionesVentanas = {
    solar: L('tSolar') >= rangoTriciclo('tSolar', T)[1] - 1e-6 ? null : -L('tSolar'), alto: L('tVentAlto'),
    // (the Aptera doors, 2026-11-12, are cut along the pillar and the rail: with doors the frame is always there)
    pilar: T.tVentanas === 'marco' || conPuertas(T) ? { x: -L('tPilar'), barrido: L('tPilarBarrido'), ancho: L('tPilarAncho') } : null,
    // round 4: the roof frame, only when asked (absent: the panel as before)
    ...(L('tMarcoTecho') > 0 ? { marcoTecho: L('tMarcoTecho') } : {}),
  };
  const ventanas = ventanasDe(F, cup, opcVentanas);
  const p = ventanas.panel, solar = p ? areaXT(F, p.x0, p.x1, x => [p.tLow(x), 1]) : { area: 0, x: -1.5, y: 1.2 };
  // the A-pillars and the rail frames: laminate (navy) instead of glass
  let marcoArea = areaMarco(F, bandaMarco(ventanas, cup.XC1 + 0.004));
  // round 4: the roof frame is laminate where there was panel (the panel's area above already lost it)
  const mt = ventanas.marco, marcoTecho = mt ? areaXT(F, mt.x0, mt.x1, x => [mt.tCuenta(x), mt.tHi(x)]).area : 0;
  marcoArea += marcoTecho;

  // ── 2026-11-12: Aptera-style doors and hatch (garaje/balaPuertas.ts), the dashboard and the mirrors
  const opcPuertas: OpcionesPuertas | null = conPuertas(T) ? {
    del: -L('tPuertaDel'), tras: -L('tPuertaTras'), umbral: L('tUmbral') + elevar, cintura: L('tCintura'),
    bisagraY: L('tBisagraY'), inc: L('tBisagraInc'), dentro: L('tBisagraDentro'), abre: L('tPuertaAbre'),
    // round 3: the passengers' door behind the split (absent with one door: the opening as before)
    ...(T.tPuertas2 === 'si' ? { segunda: { parte: -L('tPuerta2Parte'), bisagraY: L('tBisagra2Y'), inc: L('tBisagra2Inc'), abre: L('tPuerta2Abre') } } : {}),
  } : null;
  const puerta = opcPuertas ? puertaDe(F, ventanas, cup, opcPuertas) : null;
  const opcPorton: OpcionesPorton | null = puerta && T.tMaletero === 'aptera' ? { x: -L('tMalIni'), abre: L('tMalAbre'), lado: L('tMalLado') } : null;
  const porton0 = puerta && opcPorton ? portonDe(F, puerta, cup, opcPorton, F.X_ARO_COLA) : null;
  // 2026-11-13, the smooth body («la cola y el maletero tienen que ser la misma pieza»): behind the doors the hatch's side
  // edges ease (over the same 35 cm) onto the deck's own side edge (`T_BORDE_LISA`) and run on it to the trailing edge's
  // light bar: the hatch is the whole rear deck.
  const porton = porton0 && lisa && puerta ? (() => {
    const xR = puerta.xR, base = porton0.tLo;
    return { ...porton0, tLo: (x: number) => { if (x >= xR) return base(x); const w = suaveCola((xR - x) / 0.35); return base(x) * (1 - w) + T_BORDE_LISA * w; } };
  })() : porton0;
  // round 3: the second door's B- and C-pillars, laminate where there was glass (from just under the glass edge to the rail)
  if (puerta?.segunda) {
    const r = (x: number): [number, number] => [Math.max(0, ventanas.tC(x) - 0.01), Math.max(Math.max(0, ventanas.tC(x) - 0.01), ventanas.tR(x))];
    const xS = puerta.segunda.xS, xR = puerta.xR;
    marcoArea += areaXT(F, xS - MONTANTE_B / 2, xS + MONTANTE_B / 2, r, 8, 8).area + areaXT(F, xR - MONTANTE_C, xR, r, 8, 8).area;
  }
  // the dashboard: from where the nose's top line is 3 cm over its top, `tSalpFondo` back towards the pilot, as wide as the cabin
  const salpicadero = conSalpicadero(T) ? (() => {
    // (round 4: below the old floor of «Alto total» its top comes down to 3 cm under the top line 30 cm behind the
    // windscreen's foot, so it stays inside; at 1.15 m and above it is where it always was)
    const y0 = 0.78 + F.dSuelo + elevar + L('tSalpY'), yTop = techoBajo(T) ? Math.min(y0, techoEn(F, cup.XC0 - 0.3) - 0.03) : y0;
    let x0 = 0; while (x0 > cup.XC0 - 0.3 && !(techoEn(F, x0) >= yTop + 0.03)) x0 -= 0.005;
    // (round 3 interior: «más bonito, blanco y con más detalles», the same volume drawn white with its details)
    return { x0, x1: x0 - L('tSalpFondo'), yTop, yBajo: yTop - 0.16, yBajoDel: yTop - 0.30, ...(T.tSalpicadero === 'blanco' ? { blanco: true } : {}) };
  })() : null;
  // the mirrors: a teardrop on a short stalk from the door, 9 cm behind the pillar's foot and 3.5 cm under the glass
  const retrovisor = T.tRetrovisores === 'espejos' ? (() => {
    const xb = (ventanas.pilar ? ventanas.pilar.xP : -L('tPilar')) - 0.09, yb = cup.Y_VIDRIO(xb) - 0.035, zb = F.ladoZ(xb, yb);
    return { base: [xb, yb, zb] as P3, cabeza: [xb - 0.035, yb + 0.05, zb + 0.115] as P3, largo: 0.13, alto: 0.08, fondo: 0.05, enPuerta: !!puerta };
  })() : null;
  // 2026-11-12 (Eugenio: «que los paneles solares lleguen hasta la punta de la cola, como en el aptera»): the panel
  // runs on from the canopy's end over the top of the tail back to its ring, inside the lid that opens there (the
  // Aptera hatch, 4 cm inside its edges; or the round-three lid, above t = 0.66), so it lifts with it. It widens from
  // the canopy's end (where the glass panel closes in its point) over 20 cm. On the body's laminate, as the Aptera's.
  const xColaIni = cup.XF1 - 0.005, xColaFin = F.X_ARO_COLA + 0.012;
  // (2026-11-13, the smooth body: the panel covers the whole deck, from its side edges inset by a frame, `T_PANEL_LISA`)
  // (with the smooth body it starts straight across, with all its width, right behind the canopy frame's rear tip: the deck
  // begins there, and a panel that widened over 20 cm from that tip read as a narrow shield inside the hatch)
  const tPanelCola = (x: number) => { const base0 = porton ? Math.min(0.97, porton.tLo(x) + 0.04) : 0.66; if (lisa) return Math.max(base0, T_PANEL_LISA); return 1 - (1 - base0) * suaveCola((xColaIni - x) / 0.20); };
  const solarCola = T.tSolarCola === 'si' && xColaIni > xColaFin ? { x0: xColaIni, x1: xColaFin, tLow: tPanelCola, ...areaXT(F, xColaFin, xColaIni, x => [tPanelCola(x), 1]) } : null;
  const solarTodo0 = solarCola && solarCola.area > 0 ? { area: solar.area + solarCola.area, x: (solar.area * solar.x + solarCola.area * solarCola.x) / (solar.area + solarCola.area), y: (solar.area * solar.y + solarCola.area * solarCola.y) / (solar.area + solarCola.area) } : solar;
  // ── Round 3 body (2026-11-12): the panel on top of the nose («pon paneles solares en la parte frontal del morro»), from
  // 2 cm behind the nose's light band back to 2 cm ahead of the canopy's frame, over the hood's top (t 0.58 and up), its
  // front end rounded off over 6 cm and its rear one over 10 (where the frame's line rises to the top); on the body's
  // laminate, as the one over the tail
  const solarMorro = T.tSolarMorro === 'si' ? (() => {
    const x0 = F.X_ARO_MORRO - 0.02, x1 = cup.XF0 + 0.02; if (!(x0 - x1 > 0.10)) return null;
    // (2026-11-13, the smooth body: on the hood's deck, inset from its side edges as the tail's)
    const tb = lisa ? T_PANEL_LISA : 0.58;
    const tLow = (x: number) => { const a = 1 - (1 - tb) * suaveCola((x - x1) / 0.10), b = 1 - (1 - tb) * suaveCola((x0 - x) / 0.06); return Math.max(a, b); };
    return { x0, x1, tLow, ...areaXT(F, x1, x0, x => [tLow(x), 1]) };
  })() : null;
  const solarTodo = solarMorro && solarMorro.area > 0 ? { area: solarTodo0.area + solarMorro.area, x: (solarTodo0.area * solarTodo0.x + solarMorro.area * solarMorro.x) / (solarTodo0.area + solarMorro.area), y: (solarTodo0.area * solarTodo0.y + solarMorro.area * solarMorro.y) / (solarTodo0.area + solarMorro.area) } : solarTodo0;
  // round 3: the central headlamp («un faro en el centro del morro, como una moto»): an ellipsoid on the nose's tip, on
  // the centre line at the height the nose closes to, its front 3 cm proud of the skin; round with a pointed nose, an
  // oval as wide as asked and flatter the more the nose is a line (the Aptera's)
  const faro = T.tFaro === 'si' ? (() => {
    const s = F.seccionRapida(F.X_MORRO - 0.004); let y0 = Infinity, y1 = -Infinity; for (let j = 1; j < s.length; j += 2) { y0 = Math.min(y0, s[j]); y1 = Math.max(y1, s[j]); }
    const ancho = L('tFaroD'), alto = ancho * (1 - 0.55 * L('tMorroLinea')), y = (y0 + y1) / 2;
    const xf = F.frenteX(0, y), x = (Number.isFinite(xf) ? xf : F.X_MORRO) + 0.03 - 0.06;
    return { c: [x, y, 0] as P3, fondo: 0.06, alto, ancho };
  })() : null;
  // 2026-11-13 (Eugenio: «hazlo como el aptera que tiene un faro a lo largo del morro»): a light bar along the nose's
  // leading line, the widest point of each section (t = T3), from where the nose cap is 55 % of the way to its tip round
  // to the centre, both sides; the 3D draws it (balaModelo.ts `barraFaro`). Its middle is its centre of mass.
  const faroBarra = T.tFaro === 'barra' ? (() => {
    const x0 = F.XN0 + 0.55 * (F.X_MORRO - F.XN0), xm = F.XN0 + 0.85 * (F.X_MORRO - F.XN0);
    return { x0, t: T3, c: [xm, punto(F.sec(xm), T3)[1], 0] as P3 };
  })() : null;

  // ── the seats and who sits on them (round three): astride, the two riders as before; in three rows, the pilot
  // on a car-style seat with the same posture, row 2's two side by side and row 3's one, unless their row is folded
  const asientosFilas: AsientoFila[] = [];
  // round 3 interior: the two Aptera buckets, in tandem on the centre line (the posture is the astride riders' trunk, `piernasButaca`)
  const butacasDe: AsientoFila[] | null = butacas ? [
    { fila: 1, x: asientos.xPiloto, z: 0, y: asientos.yPiloto, ancho: 2 * BUTACA.semi.cojin, fondo: BUTACA.delante + BUTACA.bisagra, respaldo: BUTACA.respaldo, rec: rec.piloto, plegado: false },
    { fila: 2, x: asientos.xPasajero, z: 0, y: asientos.yPasajero, ancho: 2 * BUTACA.semi.cojin, fondo: BUTACA.delante + BUTACA.bisagra, respaldo: BUTACA.respaldo, rec: rec.pasajero, plegado: false },
  ] : null;
  const plazas: Plaza[] = [
    { nombre: 'Piloto', fila: 1, z: 0, piloto: true, pts: occ(true), talla: e => occ(true, e) },
  ];
  if (!filas) plazas.push({ nombre: 'Pasajero', fila: 2, z: 0, piloto: false, pts: occ(false), talla: e => occ(false, e) });
  else {
    const A = ASIENTOS_FILAS, plegada2 = T.tFila2 === 'plegada', plegada3 = T.tFila3 === 'plegada';
    asientosFilas.push({ fila: 1, x: asientos.xPiloto, z: 0, y: asientos.yPiloto, ...A.piloto, rec: rec.piloto, plegado: false });
    const recF = L('tRecFila');
    // 2026-11-16, row by row: each rear row's places side by side and kind of seat (filasTriciclo.ts; by default 2 + 1 car seats, as before)
    for (const r of filasDetras(T)) {
      const x = r.fila === 2 ? x2 : x3, plegado = r.fila === 2 ? plegada2 : plegada3, med = medidasAsiento(r.tipo, r.fila === 2 ? A.fila2 : A.fila3, r.n);
      const extra = { ...(r.tipo !== 'coche' ? { tipo: r.tipo } : {}), ...(r.tipo === 'banco' ? { plazas: r.n } : {}) };
      for (const z of r.tipo === 'banco' ? [0] : r.zs) asientosFilas.push({ fila: r.fila, x, z, y: yAsiento, ...med, rec: recF, plegado, ...extra });
    }
    // the feet: forward on the floor beside the rails (row 2 under the pilot's seat, row 3 under row 2's), as low as the
    // belly's curve lets them at their outer edge (1.5 cm inside the skin, never below the belly's floor)
    const piso = (x: number, z: number, ancho: number) => {
      const zf = Math.abs(z) + ancho + 0.045; let y = D.suelo + 0.03;
      while (y < yPiso && dentroDe(F, x, y, zf) < 0.015) y += 0.005;
      // (2026-11-12: on the pack along the frame where it runs under the foot)
      return paquete ? y + sobrePaquete(x - 0.20, x + 0.02, Math.abs(z) - ancho - 0.045, y) : y;
    };
    const fila = (x: number, z: number, ancho: number, e = 1) => puntosFila(x, yAsiento, recF, piso(x + 0.60 + 0.09, z, ancho), e, ancho);
    // (each passenger's feet: off the centre line close together, as row 2's two always were; on it, apart, as row 3's one)
    for (const r of filasDetras(T)) {
      if (r.fila === 2 ? plegada2 : plegada3) continue;
      const x = r.fila === 2 ? x2 : x3;
      for (const z of r.zs) { const pies = Math.abs(z) < 1e-9 ? PIES_FILA3 : PIES_FILA2; plazas.push({ nombre: nombrePlaza(r.fila, z, r.n), fila: r.fila, z, piloto: false, pts: fila(x, z, pies), talla: e => fila(x, z, pies, e) }); }
    }
  }

  // ── 2026-11-16: the plug-in hybrid's parts, where they fit (hibrido.ts): behind the last backrest, or behind the frame's tower
  const ultimo = filas ? asientosFilas.reduce((a, b) => (b.fila > a.fila ? b : a)) : { x: asientos.xPasajero, y: asientos.yPasajero, rec: rec.pasajero };
  const hibArq: ArqHibrido = T.tHibArq ?? 'reparto';
  const hib = T.tPropulsion === 'phev' ? disponerHibrido({
    F, arq: hibArq, kW: L('tPhevKW'), litros: L('tDeposito'), xR, rR, yEje: motor.c[1], recTras, cuatro: !!traseras, viaTras: traseras ? traseras.VIA_LAT : 0,
    pivote: basculante.pivote, torreta: amortiguador.arriba,
    respaldo: (y: number) => ultimo.x - 0.19 - Math.max(0, y - ultimo.y) * Math.tan(Math.max(0, ultimo.rec) * Math.PI / 180),
    cajas: [...baterias, inversor], yPiso, inversor,
  }) : null;

  const Lf = F.LARGO;
  const Pm: Parametros = { ...P, ...T, L: Lf, B: xF - xR, W: anchoTotal, H: D.alto + elevar, clear: D.suelo, track: via };
  return {
    tipo: 'triciclo' as const, P: Pm, campos: T, F, D, sillines: asientos, aleta, cup, viaPedida, giro, rec, man, pies,
    xn: F.X_MORRO, xt: F.X_COLA, Lf, rF, rR, rL: rF, xR, xL: xF, xF, batalla: xF - xR, anchoTotal, anchoCuerpo: D.ancho, alto: D.alto + elevar, semiPod,
    /** Round three: the rigid lift above 15.8 cm (m), the seating layout, its seats, who sits where, and the floor's height. */
    elevar, filas, asientosFilas, plazas, yPiso,
    ruedas, via: { del: via, tras: viaTras },
    /** Four wheels (2026-11-11): the rear pods' view of the shape (`formaTrasera`), or null with one rear wheel. */
    traseras, cuatro: !!traseras,
    /** 2026-11-15: leaning in bends (four wheels and `tBascula: 'si'`): its maximum (rad) and each axle's arms, or null. */
    // (2026-11-16: the three-wheeler leans too, on its front arms; its tail wheel, in the body, leans with it)
    bascula: T.tBascula === 'si' ? { phiMax: L('tBascMax') * Math.PI / 180, ejes: traseras ? [ejeBascula('del', F), ejeBascula('tras', traseras)] : [ejeBascula(rombo ? 'lat' : 'del', F)], tec: T.tBascTec ?? 'electrica', brazo: L('tBascBrazo') } : null,
    /** 2026-11-15: the wheels in a diamond (`tRuedas`): the nose wheel at x = 0 steers, the pods do not. */
    rombo,
    /** 2026-11-15: the plug-in hybrid (`tPropulsion: 'phev'`), or null: its engine, efficiencies, tank and their masses. */
    // (2026-11-16: its architecture, the efficiency that follows from it, and where its parts are: `disp`, hibrido.ts)
    phev: hib ? {
      arq: hibArq, kW: L('tPhevKW'), rendTerm: L('tRendTerm') / 100, litros: L('tDeposito'),
      mec: L('tHibMec') / 100, rendElec: L('tRendElec') / 100, rendCaja: L('tRendCaja') / 100,
      rendTrans: rendimientoHibrido(hibArq, L('tHibMec') / 100, L('tRendElec') / 100, L('tRendCaja') / 100),
      kgMotor: termicoDe(T.tCatTermico)?.kg ?? 15 + 1.4 * L('tPhevKW'), kgDeposito: 4 + 0.745 * L('tDeposito'),
      // what joins it to the wheels: the planetary and MG1 (12 kg, as since 2026-11-15), a generator alone (≈ 0,32 kg/kW
      // over 4 kg), or a clutch, a 3-speed gearbox and a P2 motor-generator
      transmision: hibArq === 'reparto' ? [{ nombre: 'Motor: engranaje planetario y generador', kg: 12 }]
        : hibArq === 'serie' ? [{ nombre: 'Motor: generador acoplado al de gasolina', kg: 4 + 0.32 * L('tPhevKW') }]
          : [{ nombre: 'Motor: embrague y caja de cambios', kg: 10 + 0.1 * L('tPhevKW') }, { nombre: 'Motor: motor-generador P2', kg: 3 + 0.12 * L('tPhevKW') }],
      disp: hib,
    } : null,
    tubos, baterias, bateriaCabe: bat.capacidad, inversor, motor, basculante, amortiguador, brazos, cremallera, cabezaDireccion: cabeza, recTras, recDel, yLarguero: yL,
    // (with two rear wheels there is no wheel under the tail to cover)
    faldon: traseras ? null : faldonDe(F, L('tFaldon'), xR, rR),
    /** The canopy's solar panel and side windows: what the 3D builder draws (`opcVentanas`), the curves, and the panel's area (m², both sides) and centre. */
    opcVentanas, ventanas, solar, marcoArea, marcoTecho,
    /** 2026-11-12: the panel run back over the tail to its ring (or null), and all the panel together (area, centre). */
    solarCola, solarTodo,
    /** Round 3 (2026-11-12): the panel on the nose (or null) and the central headlamp (its centre, depth, height and width; or null). */
    solarMorro, faro,
    /** 2026-11-13: the light bar along the nose's leading line (or null); and whether the body is the smooth one. */
    faroBarra, lisa,
    /**
     * 2026-11-12: the battery's capacity (kWh: the slider's, or the pack's litres × Wh/L), the pack along the frame (or
     * null), how much the footboards and footpegs rose onto it; the steering wheel, the dashboard, the mirrors; the Aptera
     * doors and hatch (their options for the 3D builder and their outlines), or null.
     */
    kWh, paquete, alzaPil, alzaPas, volante, salpicadero, retrovisor, opcPuertas, puerta, opcPorton, porton,
    /** Round 3 interior: the Aptera buckets and the pilot's pedals (or null), and the rails' run on to the rear axle (or null). */
    butacas: butacasDe, pedales, larguerosTraseros: trasero,
    /** What the astride saddle stands on (m): the rails' top or the pack's; the 3D thins the saddle down to it. */
    sueloSillin: paquete && -0.835 + dxPil0 > paquete.x0 && -1.745 + dxPas0 < paquete.x1 ? paquete.y1 : yL + dT / 2,
    /** 2026-11-16: the interior finish (interiorTriciclo.ts): the lining, the seats' covers, belts, consoles, and their masses. */
    interior: (() => {
      const seats: SeatInterior[] = butacasDe ? butacasDe.map(a => ({ x: a.x, y: a.y, z: a.z, fila: a.fila, piloto: a.fila === 1, rec: a.rec }))
        : filas ? asientosFilas.map(a => ({ x: a.x, y: a.y, z: a.z, fila: a.fila, piloto: a.fila === 1, rec: a.rec }))
          : [{ x: asientos.xPiloto, y: asientos.yPiloto, z: 0, fila: 1 as const, piloto: true, rec: rec.piloto }, { x: asientos.xPasajero, y: asientos.yPasajero, z: 0, fila: 2 as const, piloto: false, rec: rec.pasajero }];
      // the covers' area (m²): a saddle and two backrest pads; an Aptera bucket; the rows' seats by their size
      const funda = butacasDe ? 2.6 : filas ? 3.8 : 0.79, nombreFunda = butacasDe ? 'dos butacas' : filas ? 'cuatro asientos' : 'el sillín y los dos respaldos';
      const torre = tubos.find(t => /^Torreta/.test(t.nombre ?? ''));
      return interiorTriciclo(T, { F, cup, V: ventanas, P: puerta, yPiso: yL + dT / 2, torreta: torre ? [torre.b[0], torre.b[1]] : null, seats, funda, nombreFunda });
    })(),
    /** Los maniquíes de talla media (el visor los dibuja con la función de los otros vehículos). */
    occPts: (piloto: boolean) => occ(piloto),
    occTalla: occ,
  };
}
export type ModeloTriciclo = ReturnType<typeof crearModeloTriciclo>;
/**
 * What the Bala builder (garaje/balaModelo.ts `construirCon`, option `triciclo`) needs to draw a Triciclo as the viewer
 * does. 2026-11-12: plus the saddle's floor, the footpegs' lift, the steering wheel, the dashboard, the doors and the
 * mirrors (each absent or null with its option off, so the default draws exactly as before).
 */
export function opcionesCabinaTriciclo(m: ModeloTriciclo) {
  return {
    recPil: m.rec.piloto, recPas: m.rec.pasajero, man: m.man, pies: m.pies, faldon: m.faldon, ventanas: m.opcVentanas, maletero: true, ...(m.filas ? { filas: m.asientosFilas } : {}), traseras: m.traseras,
    ...(m.rombo ? { rombo: true } : {}),
    sueloSillin: m.sueloSillin, alzaPas: m.alzaPas, volante: m.volante, cabezaDireccion: m.cabezaDireccion, salpicadero: m.salpicadero,
    puertas: m.puerta ? { puerta: m.puerta, porton: m.porton } : null, retrovisor: m.retrovisor,
    solarCola: m.solarCola,
    ...(m.butacas ? { butacas: m.butacas, pedales: m.pedales } : {}),
    // round 3
    solarMorro: m.solarMorro, faro: m.faro,
    // 2026-11-13 (absent with the bar off, so the default draws exactly as before)
    ...(m.faroBarra ? { faroBarra: m.faroBarra } : {}),
  };
}

export const suaveCola = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v * v * (3 - 2 * v); };
/** 2026-11-12: points on the steering wheel's rim (hub `c`, radius `r`, its plane tilted `inc` from the vertical with its top forward). */
export function aroVolante(v: { c: [number, number]; r: number; inc: number }, n = 32): P3[] {
  const o: P3[] = [], up = [Math.sin(v.inc), Math.cos(v.inc)];
  for (let i = 0; i < n; i++) { const a = 2 * Math.PI * i / n, s = Math.sin(a) * v.r; o.push([v.c[0] + up[0] * s, v.c[1] + up[1] * s, Math.cos(a) * v.r]); }
  return o;
}
/** The right mirror's extreme points (its head's ends, top, bottom and outer face), for the swing and pod checks. */
export function puntasRetrovisor(r: { cabeza: P3; largo: number; alto: number; fondo: number }): V3[] {
  const [x, y, z] = r.cabeza;
  return [[x + r.largo / 2, y, z], [x - r.largo / 2, y, z], [x, y + r.alto / 2, z], [x, y - r.alto / 2, z], [x, y, z + r.fondo / 2], [x - r.largo / 3, y - r.alto / 3, z + r.fondo / 2]];
}
/** El faldón de la rueda trasera: un carenado estrecho bajo la cola que tapa la rueda hasta `y0` del suelo (null sin faldón). */
export function faldonDe(F: FormaBala, k: number, xR: number, rR: number) {
  if (!(k > 0.001)) return null;
  const vientre = F.D.suelo, y0 = vientre - (vientre - 0.04) * k;
  return { x0: xR + rR * 0.95, x1: xR - rR * 0.95, y0, hz: F.ANCHO_NEU / 2 + 0.025 };
}
