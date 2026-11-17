// Triciclo packaging and ranges: rows of seats, battery pack, body shape keys, camposTriciclo, rangoTriciclo, limitarTriciclo, track and steering clearance, inside-the-body tests.
// Moved out of geometriaTriciclo.ts unchanged (2026-11-16, refactor «ordenar»); that file re-exports everything. See ../CLAUDE.md.
import { migrarRendTrans } from '../hibrido';
import { CATALOGO_CLAVES, idValido, valoresCatalogo } from '../catalogoTren';
import type { Parametros, Tubo } from '../geometria';
import { TRICICLO_DEFECTO } from './defecto';
import { T_CUBIERTA, crearForma, type DimBala, type FormaBala } from '../garaje/balaForma';
import { BUTACA, alturasPod, podDe, semiAncho, techoEn, type Asientos } from '../garaje/balaMedidas';
import { MONTANTE_C } from '../garaje/balaPuertas';
import { HUECO_CARENADO, carenadoCuerpo } from '../geometriaBala';
import { type CamposTriciclo, type ClaveTriciclo, RUEDAS_TRICICLO, type ClaveNumTriciclo, esRombo, esCuatro, fichaTriciclo, SELECTORES_TRICICLO, conPuertas, bateriaChasis } from './campos';
import { type Caja, Z_LARGUERO } from './ocupantes';

// ------------------------------------------------------------------ tres filas (round three, 2026-11-11)
/**
 * Eugenio: «Permite que la altura libre sobre el suelo sea mucho mayor… añade asientos para los pasajeros que sean
 * dobles… pegaditos… 3 filas, la del piloto, que solo tiene un asiento, la de los pasajeros del centro, que tienen 2
 * asientos dobles, y luego… un asiento individual un poco más pequeño… que todo eso se pueda plegar para poder luego
 * tener maletero grande… y que se abra también el maletero».
 *
 * Up to SUELO_RIGIDO (15.8 cm, the old maximum) the clearance slider moves only the belly, as before. Above it the
 * body is drawn at 15.8 cm and lifted rigidly by the rest (`elevar`): skin, canopy, floor, frame, battery, seats and
 * riders all rise together; the wheels and their pods stay on the road and the arms and the swing arm tilt to
 * reach them. So every saved design (all ≤ 15.8 cm) is built exactly as before.
 */
export const SUELO_RIGIDO = 0.158;
export const elevarDe = (suelo: number) => Math.max(0, suelo - SUELO_RIGIDO);
/**
 * The seats of «tres filas» (car-style: cushion and backrest; m). A design proposal, not a product: sized on
 * ordinary car seats (a rear bench place is 44–48 cm wide), the third one smaller as asked. Row 2's two seats
 * sit 4 cm apart, their centres `Z_FILA2` off the centre line: 49 cm between the two passengers' centres is the
 * shoulder breadth of an average man (bideltoid 49 cm, ANSUR II 2012), so their shoulders just touch.
 */
export const ASIENTOS_FILAS = {
  piloto: { ancho: 0.46, fondo: 0.46, respaldo: 0.60 },
  fila2: { ancho: 0.45, fondo: 0.44, respaldo: 0.56 },
  fila3: { ancho: 0.40, fondo: 0.38, respaldo: 0.48 },
} as const;
export const Z_FILA2 = 0.245;
/** How far each foot goes from its passenger's centre line (m): row 2's close together (the belly curves up outside them), row 3's apart, outside the rails. */
export const PIES_FILA2 = 0.04, PIES_FILA3 = 0.18;
/** A seat's pan: its cushion's underside this far below its top (m; a thin shell and pad, as a sports seat). */
export const PAN_ASIENTO = 0.06;
/** Half the shoulder breadth of an average man (m): the outer shoulder of a row-2 passenger is `Z_FILA2` + this. */
export const MEDIO_HOMBRO = 0.245;
/**
 * The body's width with three rows: at least this (m). At shoulder height the canopy is narrower than the body's
 * widest point (it curves in towards the top); 1.16 m gives the two outer shoulders of row 2 their 2 cm with the
 * default three-row canopy (`ALTO_FILAS`). A lower or shorter canopy can still pinch them: the check «Hombros de la fila 2» says so.
 */
export const ANCHO_FILAS = 1.16;
/**
 * The canopy's top with three rows: at least this (m). Measured on this model: with the canopy stretched back over
 * row 3 the crest moves back, and the default 1.452 m leaves the tall man's head (p95) 4 cm into the glass over the
 * pilot and row 3; 1.56 m gives every head its 3 cm (row 3, the tightest, 3.7 cm).
 */
export const ALTO_FILAS = 1.56;
/** From row 3's hips back to its backrest's rear face, plus 3 cm of air to the shock tower (m). */
export const RESPALDO_FILA3 = 0.22;
/** The canopy ends at least this far behind row 3's hips (m), so that its falling line still clears that head. */
export const CUPULA_TRAS_FILA3 = 0.62;
/**
 * The astride passenger's hips behind the pilot's (m, 2026-11-17). The near end is the pilot's backrest against the
 * passenger's belly (the check «Respaldo del piloto al vientre del pasajero»). The far end was 62 cm until Eugenio asked
 * for more room: 1.40 m now, about a whole Gota cabin, so the slider is not what stops him; what stops the passenger is
 * told by the checks (the canopy over the head, the swing arm, the shock tower, the rear wheel, the boot, the body).
 */
export const SEPARACION_PASAJERO_MIN = 0.40, SEPARACION_PASAJERO_MAX = 1.40;
/** Row 3's hips behind where the Cuadriciclo en rombo's front wheel is (m, positive backwards). */
export const distanciaFila3 = (T: CamposTriciclo) => limitarTriciclo('tPilX', T) + limitarTriciclo('tFila2X', T) + limitarTriciclo('tFila3X', T);

// ------------------------------------------------------------------ 2026-11-12: seats on the frame, the pack along it
/** The thinnest seat (m): a 6 cm pan and cushion, as the car seats' (`PAN_ASIENTO`). The saddle thins down to it. */
export const ESPESOR_ASIENTO = 0.06;
/**
 * How far back the pack along the frame may run (m behind x = 0, positive): with that layout the controller (20 cm)
 * moves behind the pack, and behind it stands the shock tower (round 2, 2026-11-12: the pack runs between the axles,
 * as long as fits). With the defaults, 1.645 m, where the controller used to start.
 */
export const finPaquete = (T: CamposTriciclo) => limitarTriciclo('tBatalla', T) - limitarTriciclo('tBasculante', T) - 0.305;
/** The pack along the frame in x (its front face, its rear face; shape coordinates), or null with the battery spread out. */
export function paqueteX(T: CamposTriciclo): [number, number] | null {
  if (!bateriaChasis(T)) return null;
  const x1 = -limitarTriciclo('tBatX', T);
  return [x1, x1 - limitarTriciclo('tBatLargo', T)];
}
/** The pack's half-width (m): `tBatAncho` % of the frame's width, outer face to outer face of the two rails. */
export const semiPaquete = (T: CamposTriciclo) => limitarTriciclo('tBatAncho', T) / 100 * anchoBastidor(T) / 2;
/** The frame's width (m): outer face to outer face of the two rails (round 3 interior: with their spacing, `semiLarguero`). */
export const anchoBastidor = (T: CamposTriciclo) => 2 * semiLarguero(T) + limitarTriciclo('tChD', T) / 1000;

// ------------------------------------------------------------------ Round 3 interior (seats, dashboard, chassis, masses, battery ranges)
/**
 * The rails' half-spacing (m). Eugenio, 2026-11-12: «permite poder hacer un poco más ancho la separación entre los dos
 * tubos del chasis». `tChSep` is the spacing axis to axis with a body 85 cm wide or more; a narrower body closes them in
 * with it, as the rails always have. At its default (0.22 m) it is exactly the old `Z_LARGUERO`, unclamped, so a saved
 * design builds as before.
 */
export function semiLarguero(T: CamposTriciclo): number {
  const k = Math.min(1, limitarTriciclo('tAncho', T) / 0.85);
  return T.tChSep === TRICICLO_DEFECTO.tChSep ? Z_LARGUERO * k : limitarTriciclo('tChSep', T) / 2 * k;
}
export let cacheSep: { clave: string; v: number } | null = null;
/**
 * The widest rail spacing (m, as the slider stores it) whose two rails keep their outer faces 1 cm inside the skin from
 * the front cradle back to the shock tower, at their height (ahead of the cradle they close in to the old spacing, and
 * behind the tower the extension to the rear axle follows the tail in by itself: `largueroTrasero`).
 */
export function sepMaxima(T: CamposTriciclo): number {
  const L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), F = cuerpoDe(T), r = L('tChD') / 2000;
  const suelo = Math.min(L('tSuelo'), SUELO_RIGIDO), yL = suelo + 0.035 + r, x0 = -L('tEjeDel'), x1 = -L('tBatalla') + L('tBasculante');
  const clave = JSON.stringify([F.D, r, x0, x1]);
  if (cacheSep?.clave === clave) return cacheSep.v;
  let h = 9;
  for (let x = x0; x >= x1 - 1e-9; x -= 0.05) for (const y of [yL - r, yL + r]) h = Math.min(h, dentroDe(F, x, y, 0) - 0.01 - r);
  const v = Math.floor(2 * h / Math.min(1, L('tAncho') / 0.85) * 100 + 1e-6) / 100;
  cacheSep = { clave, v };
  return v;
}
export let cacheCabe: { clave: string; v: { largo: number; semi: number } } | null = null;
/** The half-width (m) of a pack `pct` % of the frame's width. */
export const semiAnchoPaquete = (T: CamposTriciclo, pct: number) => pct / 100 * anchoBastidor(T) / 2;
/** The pack's half-width (m) as stored, within its slider's ends only. */
export const semiAnchoFijo = (T: CamposTriciclo) => { const fa = fichaTriciclo('tBatAncho')!; return semiAnchoPaquete(T, Math.min(fa.max, Math.max(fa.min, T.tBatAncho))); };
/**
 * The pack's ranges as they were until 2026-11-16, for a pack of half-width `hz0` (m): the longest (m) and the widest
 * (%) that fit in the body (`paqueteCabe`), never less than 2.40 m up to the controller's place and, at the old rails'
 * spacing, 200 %. The width is no longer clamped to `anchoMax`; it stays as the ceiling for what the pack's width does
 * to its length's range and to its height on the belly (`fondoPaquete`), so a design saved before builds as it did.
 */
export function paqueteAntes(T: CamposTriciclo, hz0: number): { largoMax: number; anchoMax: number } {
  const fa = fichaTriciclo('tBatAncho')!, fl = fichaTriciclo('tBatLargo')!, l0 = Math.min(fl.max, Math.max(fl.min, T.tBatLargo));
  const antes = Math.max(fl.min, Math.min(2.40, finPaquete(T) - limitarTriciclo('tBatX', T)));
  const c0 = paqueteCabe(T, hz0, l0), largoMax = Math.max(antes, Math.min(fl.max, Math.floor(c0.largo * 100 + 1e-6) / 100));
  const c1 = l0 <= largoMax ? c0 : paqueteCabe(T, hz0, largoMax);
  // (the old 200 % only at the old rails' spacing, where it was the range: with wider rails, 200 % may not fit)
  const anchoMax = Math.max(T.tChSep === TRICICLO_DEFECTO.tChSep ? 200 : fa.min, Math.min(fa.max, Math.floor(2 * c1.semi / anchoBastidor(T) * 100 / 5 + 1e-6) * 5));
  return { largoMax, anchoMax };
}
/**
 * Round 3 interior (2026-11-12, Eugenio: «el largo de la batería, del paquete de baterías, no lo limites… el ancho tampoco
 * lo limites»): the longest and the widest pack that fits in the body, 1 cm inside the skin, lying on the belly (at most
 * 3 cm over its floor: a pack that only fits lifted would lift the seats on it). The length: back from its front face
 * while a box of its width and height still fits, and the controller (22 cm, right behind it, on the rails) too. The
 * width: the widest box of its height that fits at every station of its length. What it then runs into (the shock
 * tower, the rear wheel, the seats above) the checks say.
 */
export function paqueteCabe(T: CamposTriciclo, hz: number, largo: number): { largo: number; semi: number } {
  const L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), F = cuerpoDe(T), alto = L('tBatAlto'), x1 = -L('tBatX');
  const suelo = Math.min(L('tSuelo'), SUELO_RIGIDO), clave = JSON.stringify([F.D, alto, x1, hz, largo]);
  if (cacheCabe?.clave === clave) return cacheCabe.v;
  const cabeEn = (x: number, z: number) => { for (let y = suelo + 0.012; y <= suelo + 0.042; y += 0.01) if ([y, y + alto].every(q => dentroDe(F, x, q, z) >= 0.01 && dentroDe(F, x, q, 0) >= 0.01)) return true; return false; };
  // the controller behind it: 20 cm long, 14 wide, from 1 to 9 cm over the rails' top (as `crearModeloTriciclo` puts it)
  const yC = suelo + 0.035 + L('tChD') / 1000, inversor = (x: number) => [x - 0.02, x - 0.22].every(xx => [yC + 0.01, yC + 0.09].every(y => dentroDe(F, xx, y, 0.07) >= 0.01));
  let x = x1; while (x - 0.01 > F.X_COLA && cabeEn(x - 0.01, hz)) x -= 0.01;
  while (x < x1 - 0.40 && !inversor(x)) x += 0.01;
  const xs = Array.from({ length: 9 }, (_, i) => x1 - largo * i / 8);
  let a = 0, b = 1.5; for (let i = 0; i < 24; i++) { const c = (a + b) / 2; if (xs.every(q => cabeEn(q, c))) a = c; else b = c; }
  const v = { largo: x1 - x, semi: a };
  cacheCabe = { clave, v };
  return v;
}
/**
 * Round 3 body (2026-11-12): the shape's new fields for `crearForma` (nose line and height, flat tail, flat roof, the
 * roof's fall), each only when it is not zero: absent, the body is built exactly as before, bit for bit.
 */
export const CLAVES_FORMA_R3: [ClaveNumTriciclo, keyof DimBala][] = [['tMorroLinea', 'morroLinea'], ['tMorroAlto', 'morroAlto'], ['tColaPlana', 'colaPlana'], ['tTechoPlano', 'techoPlano'], ['tCaida', 'caida'], ['tLineaCupula', 'lineaCupula'], ['tSubida', 'subida'], ['tBajosMorro', 'bajosMorro']];
/**
 * 2026-11-13, the smooth body: the hatch's side edge (t: exactly where the deck begins, at its side edge) and the panels'
 * (a frame inside the deck). The cut was first on the rounded edge below (t = 0.55): with a canopy 1.9 m tall that
 * stretch is a near-vertical wall, and the hatch's edge, swinging up about the roof hinge, went 1.5 cm into the side.
 */
export const T_BORDE_LISA = T_CUBIERTA, T_PANEL_LISA = T_CUBIERTA + 0.03;
/** 2026-11-13: the smooth body's fields, all of them (zeros included) when it is on, none when it is off. */
export const CLAVES_LISA: [ClaveNumTriciclo, keyof DimBala][] = [['tColaAncho', 'colaAncho'], ['tColaGrosor', 'colaGrosor'], ['tColaBombeo', 'colaBombeo'], ['tBajosIni', 'bajosIni'], ['tBajosCurva', 'bajosCurva'], ['tMorroAncho', 'morroAncho'], ['tMorroGrosor', 'morroGrosor'], ['tMorroBombeo', 'morroBombeo'], ['tMorroCurva', 'morroCurva']];
export const conLisa = (T: Pick<CamposTriciclo, 'tCubierta'>) => T.tCubierta === 'lisa';
export function formaR3(T: CamposTriciclo): Partial<DimBala> {
  const o: Partial<Record<keyof DimBala, number>> = {};
  for (const [k, d] of CLAVES_FORMA_R3) { const v = limitarTriciclo(k, T); if (v) o[d] = v; }
  if (conLisa(T)) { o.lisa = 1; for (const [k, d] of CLAVES_LISA) o[d] = limitarTriciclo(k, T); }
  // 2026-11-16: the round body's flat tail, widened (balaForma reads it times `colaPlana`); only when both are set
  else if (o.colaPlana) { const v = limitarTriciclo('tColaPlanaAncho', T); if (v) o.colaAncho = v; }
  // 2026-11-16: the round body always joins the cabin and the tail without a crease (garaje/transicionCola.ts)
  // (with the smooth body it only acts where the canopy ends within 25 cm of the rear axle: balaForma.ts `lam`)
  o.transCola = limitarTriciclo('tColaTrans', T);
  // 2026-11-17: the Kamm cut, only when chosen (absent, the body is built as before, bit for bit)
  if (T.tColaCorte === 'kamm') { o.corte = limitarTriciclo('tKammSeccion', T); o.cavidad = limitarTriciclo('tKammCavidad', T); }
  return o as unknown as Partial<DimBala>;
}
export let cacheCuerpo: { clave: string; F: FormaBala } | null = null;
/** The body alone for these parameters, before its rigid lift (stored heights), cached per shape: for the ranges that need it. */
export function cuerpoDe(T: CamposTriciclo): FormaBala {
  const L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), suelo = Math.min(L('tSuelo'), SUELO_RIGIDO);
  const forma = (['tBatalla', 'tMorro', 'tCola', 'tAncho', 'tAlto', 'tCupIni', 'tCupFin', 'tPuntaMorro', 'tPuntaCola', 'tEjeDel'] as ClaveNumTriciclo[]).map(L);
  const r3 = formaR3(T), clave = JSON.stringify([suelo, forma, r3]);
  if (cacheCuerpo?.clave === clave) return cacheCuerpo.F;
  const F = crearForma({
    batalla: L('tBatalla'), morro: L('tMorro'), cola: L('tCola'), ancho: L('tAncho'), alto: L('tAlto'), suelo,
    cupIni: L('tCupIni'), cupFin: L('tCupFin'), puntaMorro: L('tPuntaMorro'), puntaCola: L('tPuntaCola'),
    rDel: 0.3, rLat: 0.25, anchoNeu: 0.08, anchoNeuLat: 0.07, via: 1.8, xLat: -L('tEjeDel'), ...r3,
  });
  cacheCuerpo = { clave, F };
  return F;
}
/** Where the roof is highest (m behind x = 0, positive, as `tMalIni` is stored). */
export function cimaTecho(T: CamposTriciclo): number {
  const F = cuerpoDe(T); let x0 = 0, y0 = -1;
  for (let x = -limitarTriciclo('tPilar', T); x > -limitarTriciclo('tCupFin', T); x -= 0.01) { const y = techoEn(F, x); if (y > y0 + 1e-4) { y0 = y; x0 = x; } }
  return -x0;
}
export let cacheFondo: { clave: string; v: number } | null = null;
/**
 * The pack's bottom (m, stored heights: the body before its rigid lift). Round 2 (2026-11-12, «muy pegados al
 * chasis»): the pack lies on the belly, 1.2 cm over its floor, and the two rails run through it (in channels), so
 * what stands on it is as low as it can be. Where the belly curves up under the pack's outer edges (a narrow body),
 * it rises until those edges are 1 cm inside the skin. The body is built once per shape (cached).
 */
export function fondoPaquete(T: CamposTriciclo): number {
  const p = paqueteX(T); if (!p) return 0;
  const L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), suelo = Math.min(L('tSuelo'), SUELO_RIGIDO);
  // (2026-11-16: a pack wider than the old range's top, `paqueteAntes`, sits as that one would: it sticks out of the
  // body rather than climbing up the belly's curve; the check says by how much)
  const hz0 = semiPaquete(T), hz = Math.min(hz0, paqueteAntes(T, hz0).anchoMax / 100 * anchoBastidor(T) / 2);
  const F = cuerpoDe(T), clave = JSON.stringify([suelo, hz, p, F.D]);
  if (cacheFondo?.clave === clave) return cacheFondo.v;
  const xs = [0, 0.25, 0.5, 0.75, 1].map(u => p[0] + (p[1] - p[0]) * u);
  let y = suelo + 0.012;
  while (y < suelo + 0.25 && xs.some(x => dentroDe(F, x, y, hz) < 0.01 || dentroDe(F, x, y, 0) < 0.01)) y += 0.002;
  cacheFondo = { clave, v: y };
  return y;
}
/**
 * What a seat stands on (m, in stored heights: the body before its rigid lift): the top of the frame's rails, or the
 * pack's top where the pack runs under the seat (astride: under the one long saddle; three rows: under the pilot's
 * seat, or under row 2's or row 3's for their common height).
 */
export function sueloAsiento(T: CamposTriciclo, piloto: boolean): number {
  const carril = Math.min(limitarTriciclo('tSuelo', T), SUELO_RIGIDO) + 0.035 + limitarTriciclo('tChD', T) / 1000;
  const p = paqueteX(T); if (!p) return carril;
  const xPil = -limitarTriciclo('tPilX', T), tramos: [number, number][] = [];
  // (round 3 interior: each Aptera bucket on its own footprint, `BUTACA`)
  if (T.tAsientos === 'butacas') { const x = piloto ? xPil : -limitarTriciclo('tPasX', T); tramos.push([x + BUTACA.delante, x - BUTACA.detras]); }
  else if (T.tAsientos !== 'filas') tramos.push([xPil + 0.23, -limitarTriciclo('tPasX', T) - 0.21]);
  else if (piloto) tramos.push([xPil + 0.29, xPil - 0.17]);
  else { const x2 = xPil - limitarTriciclo('tFila2X', T), x3 = x2 - limitarTriciclo('tFila3X', T); tramos.push([x2 + 0.27, x2 - 0.17], [x3 + 0.21, x3 - 0.17]); }
  // (the rails run through the pack: whichever is higher carries the seat)
  return tramos.some(([a, b]) => a > p[1] && b < p[0]) ? Math.max(carril, fondoPaquete(T) + limitarTriciclo('tBatAlto', T)) : carril;
}

/** Los parámetros del Triciclo de un diseño: lo guardado (si es del tipo correcto y, en los selectores, una opción que existe) y lo que falte, el de por defecto. */
export function camposTriciclo(P: Partial<Parametros>): CamposTriciclo {
  const o = { ...TRICICLO_DEFECTO } as Record<string, unknown>;
  for (const k of Object.keys(TRICICLO_DEFECTO) as ClaveTriciclo[]) {
    const v = (P as Record<string, unknown>)[k], ref = TRICICLO_DEFECTO[k];
    if (typeof ref === 'number') { if (typeof v === 'number' && Number.isFinite(v)) o[k] = v; continue; }
    const sel = SELECTORES_TRICICLO.find(s => s.clave === k);
    if (typeof v === 'string' && sel?.opciones.some(x => x.k === v)) o[k] = v;
  }
  // a design saved without a rear track (every one before the «Cuadriciclo Bala clásico») takes its front one
  const vt = (P as Record<string, unknown>).tViaTras;
  if (!(typeof vt === 'number' && Number.isFinite(vt))) o.tViaTras = o.tVia;
  // 2026-11-16: a hybrid saved with the one «Conversión mecánica» slider (`tRendTrans`) and no architecture opens as the
  // power split with the same efficiency, so its litres per 100 km do not change. Only what it does not have yet: once a
  // hybrid slider is moved, that key is in the design and wins (PARAMETROS_TRICICLO leaves these keys out for this)
  const Q = P as Record<string, unknown>, rt = Q.tRendTrans;
  if (Q.tHibArq === undefined && typeof rt === 'number' && Number.isFinite(rt)) {
    const { mec, elec } = migrarRendTrans(rt); o.tHibArq = 'reparto';
    if (typeof Q.tHibMec !== 'number') o.tHibMec = mec;
    if (typeof Q.tRendElec !== 'number') o.tRendElec = elec;
  }
  // (2026-11-16) a catalogue part is kept only when it is still in the catalogue (catalogoTren.ts); otherwise «A medida»
  for (const k of CATALOGO_CLAVES) { const v = (P as Record<string, unknown>)[k]; if (typeof v === 'string' && idValido(k, v)) o[k] = v; }
  return o as unknown as CamposTriciclo;
}

/**
 * El rango de un deslizador para estos parámetros. Cuatro dependen de otro: la
 * cúpula acaba al menos 10 cm por delante del eje trasero (25 hasta la ronda 3) y el pasajero va entre
 * 40 cm y 1,40 m detrás del piloto (62 cm hasta el 2026-11-17) (los dos, como en el Cuadriciclo en rombo); la potencia
 * máxima no baja de la nominal; y el carenado pequeño no puede ser además
 * estrecho ni corto (el neumático dejaría de caber).
 */
export function rangoTriciclo(k: ClaveNumTriciclo, T: CamposTriciclo): [number, number] {
  const f = fichaTriciclo(k)!;
  // (2026-11-16) a catalogue part fixes what its maker publishes (catalogoTren.ts): the slider stops there
  const fijo = valorFijoCatalogo(k, T);
  if (fijo != null) return [fijo, fijo];
  // round three (2026-11-11): three rows need room. Only with that layout; astride, every range is as before.
  if (T.tAsientos === 'filas') {
    // the two seats of row 2 side by side need width at shoulder height, under the canopy's curve (see ANCHO_FILAS)
    if (k === 'tAncho') return [Math.max(f.min, ANCHO_FILAS), f.max];
    // tAlto is NOT clamped to ALTO_FILAS any more (2026-11-13, Eugenio could not lower his canopy below 1.56 m with
    // three rows: «ya van 2 veces que lo digo»). Lower is allowed; the head and «Hombros de la fila 2» checks turn red.
    // row 3's backrest ahead of the rear shock tower, and the canopy long enough to cover row 3's head
    if (k === 'tBatalla') return [Math.min(f.max, Math.max(f.min, distanciaFila3(T) + RESPALDO_FILA3 + limitarTriciclo('tBasculante', T) - 0.01)), f.max];
    // and the rows only as far back as the longest wheelbase still leaves row 3 ahead of the shock tower. The order
    // breaks the circle: row 3 reads the swing arm as stored (in its own range), the swing arm reads row 3 limited.
    if (k === 'tFila2X' || k === 'tFila3X' || k === 'tBasculante') {
      const sitio = fichaTriciclo('tBatalla')!.max + 0.01 - RESPALDO_FILA3 - limitarTriciclo('tPilX', T);
      const bas = (() => { const b = fichaTriciclo('tBasculante')!; return Math.min(b.max, Math.max(b.min, T.tBasculante)); })();
      const hi = k === 'tFila2X' ? sitio - bas - fichaTriciclo('tFila3X')!.min
        : k === 'tFila3X' ? sitio - bas - limitarTriciclo('tFila2X', T)
          : sitio - limitarTriciclo('tFila2X', T) - limitarTriciclo('tFila3X', T);
      const top = Math.min(f.max, hi);
      return [Math.min(f.min, top), top];
    }
    if (k === 'tCupFin') {
      const b = limitarTriciclo('tBatalla', T), hi = Math.min(f.max, b - 0.25);
      return [Math.min(hi, Math.max(Math.min(f.min, b - 0.45), distanciaFila3(T) + CUPULA_TRAS_FILA3)), hi];
    }
  }
  // (round 3: up to 10 cm ahead of the rear axle, where it was 25; the canopy's end must stay ahead of the axle, the anchors of the shape's stretch)
  if (k === 'tCupFin') return [Math.min(f.min, T.tBatalla - 0.45), Math.min(f.max, T.tBatalla - 0.10)];
  // 2026-11-17 (Eugenio: «que el asiento del copiloto, el que va detrás, se pueda separar más del asiento frontal»): the
  // gap was 40–62 cm. Now up to SEPARACION_PASAJERO_MAX; what the passenger runs into behind is told by the checks
  // (`chequeosPasajeroAtras`, ./pasajero.ts), not by the slider's end.
  if (k === 'tPasX') return [Math.max(f.min, T.tPilX + SEPARACION_PASAJERO_MIN), T.tPilX + SEPARACION_PASAJERO_MAX];
  // the solar roof starts anywhere from over the pilot's knees to 10 cm behind the canopy's end (there: no panel)
  if (k === 'tSolar') return [f.min, Math.min(f.max, limitarTriciclo('tCupFin', T) + 0.10)];
  if (k === 'tKWPico') return [Math.max(f.min, T.tKWNom), f.max];
  // four wheels (2026-11-11): the rear track from the narrowest whose pods clear the tail by 3 cm to the front track's maximum
  if (k === 'tViaTras') { const hi = fichaTriciclo('tVia')!.max; return [Math.min(hi, Math.max(f.min, viaTraseraMinima(T))), hi]; }
  // round two (2026-11-10): the motor and its controller weigh what their power asks for, so a 60 kW motor
  // cannot weigh 8 kg. Hub motors on sale run from about 0.45 kg/kW of peak power (car in-wheel motors:
  // Elaphe M700, 34 kg for 75 kW) to 0.9 (moped hubs); controllers 0.08–0.2 kg/kW. Estimates, not measured.
  if (k === 'tMMotor' || k === 'tMInversor') {
    const p = limitarTriciclo('tKWPico', T);
    // four wheels (2026-11-11): two hub motors of half the power each, by the same rule; the slider is both together
    if (k === 'tMMotor' && esCuatro(T)) return [Math.max(f.min, 2 * (3 + 0.45 * p / 2)), Math.min(f.max, 2 * (8 + 0.9 * p / 2))];
    return k === 'tMMotor' ? [Math.max(f.min, 3 + 0.45 * p), Math.min(f.max, 8 + 0.9 * p)] : [Math.max(f.min, 1 + 0.08 * p), Math.min(f.max, 2 + 0.2 * p)];
  }
  // 2026-11-12 («que los asientos estén todavía más bajos, muy pegados al chasis»): a seat comes down until it has
  // ESPESOR_ASIENTO over what is under it, the frame's rails or the pack along the frame. (Before, the floor was
  // 38 cm for the pilot and 42 for the passenger, minus what the belly came down; a design saved before this opens
  // with that floor: `asientosDeAntes`, Disenos.tsx.)
  if (k === 'tPilY' || k === 'tPasY') return [Math.max(f.min, sueloAsiento(T, k === 'tPilY') + ESPESOR_ASIENTO), f.max];
  // the pack along the frame: its front face 6 cm behind the front axle (the cradle's posts and the front suspension
  // stand there) and its rear face 2 cm ahead of the controller
  if (k === 'tBatX') return [Math.max(f.min, limitarTriciclo('tEjeDel', T) + 0.06), Math.max(f.min, Math.min(f.max, finPaquete(T) - fichaTriciclo('tBatLargo')!.min))];
  // round 3 interior (2026-11-12, «no lo limites»): as long and as wide as fits in the body (`paqueteCabe`), no longer
  // stopped at the controller: the checks say what it runs into. The width's range reads the length within its own
  // range, and the length's reads the width only within the slider's ends, so the two never ask each other.
  // 2026-11-16 (Eugenio: «permite aumentar el ancho de la batería aunque se salga del carenado»): the width is no longer
  // clamped to what fits: the whole slider, 100 to 400 % (twice the old 200 % top), and the check «Batería dentro de la
  // carrocería» says by how much it sticks out. A design saved before opens at the width it was built with (Disenos.tsx
  // `paqueteDeAntes`). The length's range reads the width only up to that old top, so widening never shortens the pack.
  if (k === 'tBatAncho') return [f.min, f.max];
  if (k === 'tBatLargo') {
    const hz = semiAnchoFijo(T), tope = paqueteAntes(T, hz).anchoMax / 100 * anchoBastidor(T) / 2;
    return [fichaTriciclo('tBatLargo')!.min, paqueteAntes(T, Math.min(hz, tope)).largoMax];
  }
  // round 3 interior: the rails' spacing up to what keeps them on the belly (never below the old spacing's 22 cm as its maximum)
  if (k === 'tChSep') return [f.min, Math.max(TRICICLO_DEFECTO.tChSep, Math.min(f.max, sepMaxima(T)))];
  // the doors: at least 45 cm long at the sill; the hatch's hinge behind the pillar's foot and ahead of the canopy's end
  if (k === 'tPuertaDel') return [Math.max(f.min, limitarTriciclo('tPilar', T) + 0.04), f.max];
  // (round 2: never closer than 20 cm to the canopy's end, where the tail crown starts: further back its top edge cut into it)
  if (k === 'tPuertaTras') { const hi = Math.max(f.min, Math.min(f.max, limitarTriciclo('tCupFin', T) - 0.20)); return [Math.min(hi, Math.max(f.min, limitarTriciclo('tPuertaDel', T) + 0.45)), hi]; }
  // (round 2: from the roof's highest point back, `cimaTecho`; ahead of it the hatch would swing into the roof)
  // (round 3, 2026-11-12, «que el maletero empiece un poco más atrás, como en el Aptera»: back to 45 cm ahead of the
  // tail's light ring, behind the doors and past the canopy's end; before, 30 cm ahead of the canopy's end at most)
  // (and with two doors a side, behind the C-pillar that carries the rear doors' hinges, 2 cm clear of it)
  if (k === 'tMalIni') {
    const hi = Math.max(f.min, Math.min(f.max, -cuerpoDe(T).X_ARO_COLA - 0.45)), tras = T.tPuertas2 === 'si' && conPuertas(T) ? limitarTriciclo('tPuertaTras', T) + MONTANTE_C + 0.02 : 0;
    return [Math.min(hi, Math.max(f.min, limitarTriciclo('tPilar', T) + 0.30, cimaTecho(T), tras)), hi];
  }
  // round 3: the split between the two doors leaves each at least 30 cm along the sill
  if (k === 'tPuerta2Parte') { const a = limitarTriciclo('tPuertaDel', T) + 0.30, b = limitarTriciclo('tPuertaTras', T) - 0.30; return a <= b ? [Math.max(f.min, a), Math.min(f.max, b)] : [(a + b) / 2, (a + b) / 2]; }
  // a smaller pod is also a narrower one: below 82 % of the drawn width in all, the tyre no longer fits inside
  const esc = Math.min(fichaTriciclo('tPodEsc')!.max, Math.max(fichaTriciclo('tPodEsc')!.min, T.tPodEsc));
  if (k === 'tPodAncho') return [Math.max(f.min, 0.82 / esc), f.max];
  // and a shorter one: its tail must still reach past the back of the tyre
  if (k === 'tPodCola') return [Math.max(f.min, 0.70 / esc), f.max];
  return [f.min, f.max];
}
/**
 * «Largo total» (round two, 2026-11-10: «hazlo un poco más grande»): one slider that stretches the body
 * without scaling the people. The length is nose + wheelbase + tail.
 *
 * 2026-11-12, Eugenio: «cuando se modifique el largo total, que no cambie la forma del morro y la cola. Ahora mismo
 * están conectadas y es un poco frustrante». Until then the change was shared among the three; now it goes into the
 * wheelbase alone. The shape is stretched piecewise between its anchors (balaForma.ts `tramos`: nose tip, x = 0,
 * the canopy's two ends, the rear axle, the tail tip), so the nose (tip to x = 0) and the tail (rear axle to tip)
 * keep their length and every section; the canopy's end goes back with the rear axle, so the canopy's rear slope
 * and the tail's line stay too, and only the middle (the cabin, from the canopy's start to its end) grows. The
 * riders, the doors, the hatch's hinge and the battery stay where they are (all measured from the front).
 * It writes `tBatalla` and `tCupFin`: there is no stored «largo» of its own, so a saved design is unaffected.
 */
export function largoTriciclo(T: CamposTriciclo): { valor: number; min: number; max: number } {
  const fijo = limitarTriciclo('tMorro', T) + limitarTriciclo('tCola', T), [a, b] = rangoTriciclo('tBatalla', T);
  return { valor: fijo + limitarTriciclo('tBatalla', T), min: fijo + a, max: fijo + b };
}
export function estirarTriciclo(T: CamposTriciclo, largo: number): Partial<CamposTriciclo> {
  const ahora = largoTriciclo(T), d = Math.min(ahora.max, Math.max(ahora.min, largo)) - ahora.valor;
  if (Math.abs(d) < 1e-9) return {};
  const b = limitarTriciclo('tBatalla', T), nb = Math.round((b + d) * 1e4) / 1e4;
  return { ...conBatalla(T, nb), tCupFin: Math.round((limitarTriciclo('tCupFin', T) + (nb - b)) * 1e4) / 1e4 };
}
/**
 * A new wheelbase, and with it the pack along the frame (2026-11-15, Eugenio: «haz que la batería se pueda alargar más
 * cuando se alarga el vehículo»): the pack grows or shrinks by as much as the wheelbase, within its own range at the new
 * length, so stretching the car keeps the gap behind it the same. With the battery spread out, only the wheelbase.
 */
export function conBatalla(T: CamposTriciclo, nb: number): Partial<CamposTriciclo> {
  const b = limitarTriciclo('tBatalla', T), o: Partial<CamposTriciclo> = { tBatalla: nb };
  if (bateriaChasis(T) && Math.abs(nb - b) > 1e-9) {
    const T2 = { ...T, tBatalla: nb }, [lo, hi] = rangoTriciclo('tBatLargo', T2);
    o.tBatLargo = Math.round(Math.min(hi, Math.max(lo, limitarTriciclo('tBatLargo', T) + (nb - b))) * 100) / 100;
  }
  return o;
}
/**
 * Round 4 (2026-11-13): «Alto total» below 1.15 m, its floor until this round. Only there do the steering-column support
 * and the dashboard come down with the roof, so every design that could be built before is built exactly as before.
 */
export const ALTO_ANTES = 1.15;
export const techoBajo = (T: CamposTriciclo) => limitarTriciclo('tAlto', T) < ALTO_ANTES - 1e-9;
/** Un valor dentro de su rango (un diseño escrito a mano o de otra versión no puede construir un triciclo imposible). */
/** The value a chosen catalogue part fixes for this slider (catalogoTren.ts), or null. */
export const valorFijoCatalogo = (k: ClaveNumTriciclo, T: CamposTriciclo): number | null =>
  (valoresCatalogo(T, esCuatro(T) ? 2 : 1) as Partial<Record<string, number>>)[k] ?? null;
export const limitarTriciclo = (k: ClaveNumTriciclo, T: CamposTriciclo) => { const [a, b] = rangoTriciclo(k, T); return Math.min(b, Math.max(a, comoAntes(k, T[k], T))); };
/**
 * Round 3 (2026-11-12) widened some ranges. A value saved at an old end carries float noise (the editor stores what it
 * shows less the front axle's offset: the real clásico has «tMorro» 0.44999999999999996 for 0.45), and the old range
 * clamped it onto that end. Within a nanometre of an old end, it still builds at that end, so saved designs are built
 * vertex for vertex as before.
 */
export function comoAntes(k: ClaveNumTriciclo, v: number, T: CamposTriciclo): number {
  const fin = (m: number) => (Math.abs(v - m) < 1e-9 ? m : v);
  // (2026-11-13: the nose's ranges widened again; their old ends snap the same way)
  const fines = (...ms: number[]) => { for (const m of ms) if (Math.abs(v - m) < 1e-9) return m; return v; };
  switch (k) {
    case 'tMorro': return fines(0.45, 0.25, 1.00);
    case 'tPuntaMorro': return fines(0.50, 0.25, 1.00);
    case 'tMorroAlto': return fines(-0.10, 0.12);
    case 'tPuntaCola': return fines(0.36, 0.58, 0.30, 0.85);
    // (2026-11-16: the tail's length widened from 0.45–1.20)
    case 'tCola': return fines(0.45, 1.20);
    case 'tColaPlanaAncho': return fines(1);
    case 'tAlto': return Math.abs(v - 1.15) < 1e-9 ? 1.15 : fin(1.584);
    case 'tCupFin': { const lo = Math.min(1.80, T.tBatalla - 0.45), hi = Math.min(3.10, T.tBatalla - 0.25); return Math.abs(v - lo) < 1e-9 ? lo : Math.abs(v - hi) < 1e-9 ? hi : v; }
    case 'tMalIni': return fin(1.70);
    case 'tPuertaTras': return fin(2.00);
    default: return v;
  }
}

// ------------------------------------------------------------------ medidas
/** Holgura mínima del carenado delantero, girado a tope, a la carrocería (m): la vía nunca deja menos. */
export const HUECO_GIRO = 0.03;
/** Ackermann: el ángulo de la rueda de fuera cuando la de dentro gira `di` (rad), con batalla L y vía t. */
export const anguloFuera = (di: number, L: number, t: number) => Math.atan(L / (L / Math.tan(di) + t));

/** La forma, con los valores ya en su rango y la vía subida si el carenado girado no cabe. */
export function medidasTriciclo(T: CamposTriciclo) {
  const L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T);
  const wDel = RUEDAS_TRICICLO[T.tRuedaDel], wTras = RUEDAS_TRICICLO[T.tRuedaTras], rDel = wDel.d / 2, rTras = wTras.d / 2;
  const suelo = L('tSuelo'), elevar = elevarDe(suelo);
  const D: DimBala = {
    batalla: L('tBatalla'), morro: L('tMorro'), cola: L('tCola'), ancho: L('tAncho'), alto: L('tAlto'), suelo, ...(elevar > 0 ? { elevar } : {}),
    cupIni: L('tCupIni'), cupFin: L('tCupFin'), puntaMorro: L('tPuntaMorro'), puntaCola: L('tPuntaCola'),
    // the Cuadriciclo en rombo's «front and rear» wheel is our rear one; its «lateral» wheels, our front ones
    rDel: rTras, rLat: rDel, anchoNeu: wTras.neuTras, anchoNeuLat: wDel.neuDel, via: L('tVia'),
    xLat: esRombo(T) ? -L('tEjeLat') : -L('tEjeDel'), pod: { esc: L('tPodEsc'), ancho: L('tPodAncho'), cola: L('tPodCola') }, cuerdaBrazo: L('tBrazo'), ...formaR3(T),
  };
  let F = crearForma(D);
  const giro = L('tGiro') * Math.PI / 180;
  // the pods only move sideways with the track: the gap grows by half of what the track grows
  // (in a diamond the pods do not steer: the nose wheel does)
  const hueco = huecoGiro(F, esRombo(T) ? 0 : giro);
  if (hueco < HUECO_GIRO) F = crearForma({ ...D, via: Math.ceil((D.via + 2 * (HUECO_GIRO - hueco)) * 100) / 100 });
  // the seats rise with the lifted body (`+ 0` without a lift: the same numbers)
  const asientos: Asientos = { xPiloto: -L('tPilX'), yPiloto: L('tPilY') + elevar, xPasajero: -L('tPasX'), yPasajero: L('tPasY') + elevar };
  // four wheels (2026-11-11): the rear pods, as the front ones but round the rear wheels at the rear axle
  const traseras = esCuatro(T) ? formaTrasera(F, rTras, wTras.neuTras, L('tViaTras')) : null;
  // (round 3: «Quita la aleta»: none with «Sin aleta»)
  return { D: F.D, F, asientos, aleta: T.tConAleta === 'no' ? null : L('tAleta') + elevar, viaPedida: D.via, giro, elevar, traseras };
}

// ------------------------------------------------------------------ cuatro ruedas (2026-11-11)
/**
 * Eugenio: «Haz un vehículo igual que el triciclo bala, pero esta vez que tenga 4 ruedas… con las mismas medidas».
 * The «Cuadriciclo Bala clásico» is a Triciclo with `tTraseras: 'dos'`: the same body to the last vertex, the same front
 * pods, and instead of the one wheel in the tail, two rear wheels in pods mirroring the front ones (outboard, the
 * same skin, the same two faired arms from the body) that do not steer.
 *
 * The rear pods are drawn and measured by the very code of the front ones (balaMedidas.ts `podDe`, `brazosDe`,
 * geometriaBala.ts `carenadoCuerpo`, `neumaticoCarenado`, balaPiezas.ts `carenados`), handed a VIEW of the shape
 * in which the «wheel in a pod» is the rear one: its axle at the rear axle, its radius and tyre, the rear track.
 * The body's functions (ladoZ, sec…) are the same closures, so the view sees the same body. The tail sweeps up at
 * the rear axle: there the arms meet the body above its belly (`vientreBrazos`).
 */
export function formaTrasera(F: FormaBala, r: number, neu: number, via: number): FormaBala {
  const x = -F.BATALLA, s = F.seccionRapida(x); let yb = Infinity; for (let j = 1; j < s.length; j += 2) yb = Math.min(yb, s[j]);
  const vientre = Number.isFinite(yb) ? yb : F.D.suelo;
  return { ...F, X_LAT: x, R_LAT: r, ANCHO_NEU_LAT: neu, VIA_LAT: via, D: { ...F.D, xLat: x, rLat: r, anchoNeuLat: neu, via, vientreBrazos: vientre } };
}
/** One cached body per shape (the rear track's minimum asks for it on every slider read). */
export let cacheMinima: { clave: string; v: number } | null = null;
/**
 * The narrowest rear track (m, to the cm) whose rear pods leave 3 cm to the body (as the Cuadriciclo en rombo's laterals):
 * the pods' inner face against the tail at the rear axle, all along the pod and up its height.
 */
export function viaTraseraMinima(T: CamposTriciclo): number {
  const Tsin = { ...T, tTraseras: 'una' as const };
  const L = (k: ClaveNumTriciclo) => limitarTriciclo(k, Tsin);
  const r3 = formaR3(Tsin), clave = JSON.stringify([T.tRuedaDel, T.tRuedaTras, ...(['tBatalla', 'tMorro', 'tCola', 'tAncho', 'tAlto', 'tSuelo', 'tCupIni', 'tCupFin', 'tPuntaMorro', 'tPuntaCola', 'tPodEsc', 'tPodAncho', 'tPodCola', 'tBrazo', 'tEjeDel'] as ClaveNumTriciclo[]).map(L), r3]);
  if (cacheMinima?.clave === clave) return cacheMinima.v;
  const wDel = RUEDAS_TRICICLO[T.tRuedaDel], wTras = RUEDAS_TRICICLO[T.tRuedaTras], suelo = L('tSuelo'), elevar = elevarDe(suelo);
  const F = crearForma({
    batalla: L('tBatalla'), morro: L('tMorro'), cola: L('tCola'), ancho: L('tAncho'), alto: L('tAlto'), suelo, ...(elevar > 0 ? { elevar } : {}),
    cupIni: L('tCupIni'), cupFin: L('tCupFin'), puntaMorro: L('tPuntaMorro'), puntaCola: L('tPuntaCola'),
    rDel: wTras.d / 2, rLat: wDel.d / 2, anchoNeu: wTras.neuTras, anchoNeuLat: wDel.neuDel, via: 1.8,
    xLat: -L('tEjeDel'), pod: { esc: L('tPodEsc'), ancho: L('tPodAncho'), cola: L('tPodCola') }, cuerdaBrazo: L('tBrazo'), ...r3,
  });
  // with the track at 0 the clearance is minus the widest reach of body + pod; the track adds half of itself
  const h0 = carenadoCuerpo(formaTrasera(F, wTras.d / 2, wTras.neuTras, 0));
  const v = Math.ceil(2 * (HUECO_CARENADO - h0) * 100 - 1e-6) / 100;
  cacheMinima = { clave, v };
  return v;
}

/**
 * Lo que queda (m) entre el carenado delantero girado `giro` (rad) hacia la
 * carrocería y la piel, en el peor lado. Cada carenado gira con su rueda
 * alrededor de un eje vertical por el centro de la rueda (como en el Aptera); al
 * girar, su cola entra hacia la carrocería por un lado y su morro por el otro.
 * Se recorre su contorno en planta a 10 alturas y en los dos sentidos.
 */
export function huecoGiro(F: FormaBala, giro: number): number {
  const POD = podDe(F), ancho = semiAncho(POD), zp = F.VIA_LAT / 2; let h = 9;
  for (const g of [giro, -giro]) {
    const c = Math.cos(g), s = Math.sin(g);
    for (let i = 0; i <= 30; i++) {
      const xr = POD[0].x + (POD[POD.length - 1].x - POD[0].x) * i / 30, alt = alturasPod(POD, xr); if (!alt) continue;
      for (let j = 1; j < 10; j++) {
        const y = alt[0] + (alt[1] - alt[0]) * j / 10, w = ancho(xr, y); if (w <= 0) continue;
        // the pod's inner face (towards the body), turned about the wheel's centre
        const zl = -w, xg = F.X_LAT + xr * c - zl * s, zg = zp + xr * s + zl * c;
        const zb = F.ladoZ(xg, y); if (!Number.isFinite(zb)) continue;
        h = Math.min(h, zg - zb);
      }
    }
  }
  return h;
}

/** Los que no llegan: 9 en una holgura que no tiene sentido (un tubo fuera de la piel, etc.). */
export const dentroDe = (F: FormaBala, x: number, y: number, z: number) => {
  const zb = F.ladoZ(x, y); if (!Number.isFinite(zb)) return -0.05;
  if (y < techoEn(F, x) && y > 0) { const s = F.seccionRapida(x); let yb = Infinity; for (let j = 1; j < s.length; j += 2) yb = Math.min(yb, s[j]); if (y < yb) return y - yb; }
  return zb - Math.abs(z);
};
/** Holgura (m) de una caja a la piel: sus ocho esquinas y el centro de cada cara de abajo. */
export const cajaDentro = (F: FormaBala, c: Caja) => {
  let h = 9;
  for (const x of [c.x0, c.x1]) for (const y of [c.y0, c.y1]) for (const z of [-c.hz, c.hz]) h = Math.min(h, dentroDe(F, x, y, z));
  return h;
};
/** Holgura (m) de un tubo a la piel: muestreado cada 4 cm, menos su radio. */
export function tuboDentro(F: FormaBala, t: Tubo): number {
  const pts = t.curva ?? [t.a, t.b]; let h = 9;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 0.04));
    for (let k = 0; k <= n; k++) { const u = k / n; h = Math.min(h, dentroDe(F, a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u) - t.d / 2); }
  }
  return h;
}
