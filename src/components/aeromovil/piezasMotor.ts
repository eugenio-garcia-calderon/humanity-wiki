// ============================================================================
// THE ENGINE'S PARTS, ONE BY ONE (2026-11-17, Eugenio: «que también aparezca la bomba de agua, la bomba de aceite, el
// tubo escape… y que luego también todas esas partes se les pueda también pinchar en mostrar solo esta parte… imagínate
// que solo ves la parte del radiador con su circuito de agua y sus tubos. O ves solo la parte del bloque del motor. O
// ves solo la parte del engranaje planetario»)
// ============================================================================
// Pure (no three.js): the registry of the «Motor» layer's parts, by group, that «Mostrar solo el motor» lists and lets
// you isolate one by one; where the engine's auxiliaries go (water pump, oil pump and sump, oil filter, air filter),
// which hibrido3d.ts draws; and how the engine's mass splits among them (triciclo/masas.ts).
//
// A part is found in the 3D by its mesh's `userData.componente`. To add a part: draw it in the viewer's «Motor» layer
// (`G.motor`), give its meshes a `componente`, add that id to its group's `componentes` below with its name in
// `NOMBRES_PIEZA`, and say when the design has it in `piezasPresentes`. A part drawn in another layer (the body, as the
// radiator's intakes `refrigeracion-toma`) does not show with «Mostrar solo el motor».
// (Joined 2026-11-17 with bot «capo»'s cooling, visor/refrigeracion.ts: radiator, coolant pipes, the shaft of an engine
// in the nose.)

import type { DisposicionHibrido, CajaZ, V3 } from './hibrido';
import type { ModeloTriciclo } from './triciclo/modelo';
import { refrigeracionDe } from './triciclo/refrigeracion';

export interface GrupoMotor {
  id: string;
  n: string;
  /** Its parts: the `userData.componente` of their meshes, in the order the list shows them. */
  componentes: string[];
}

/** The groups, in the order the list shows them. */
export const GRUPOS_MOTOR: GrupoMotor[] = [
  { id: 'bloque', n: 'Bloque motor', componentes: ['hibrido-motor'] },
  { id: 'transmision', n: 'Engranaje planetario / transmisión', componentes: ['hibrido-planetario', 'hibrido-embrague', 'hibrido-caja', 'hibrido-arbol', 'hibrido-cadena', 'hibrido-diferencial'] },
  { id: 'generador', n: 'Generador', componentes: ['hibrido-mg1', 'hibrido-generador', 'hibrido-p2'] },
  { id: 'electrico', n: 'Motor eléctrico', componentes: ['motor-electrico', 'hibrido-mg2'] },
  { id: 'controlador', n: 'Controlador', componentes: ['controlador'] },
  { id: 'deposito', n: 'Depósito y conducto de combustible', componentes: ['hibrido-deposito'] },
  { id: 'refrigeracion', n: 'Refrigeración', componentes: ['refrigeracion-radiador', 'refrigeracion-tubos', 'hibrido-bomba-agua', 'hibrido-manguitos'] },
  { id: 'lubricacion', n: 'Lubricación', componentes: ['hibrido-bomba-aceite', 'hibrido-carter', 'hibrido-filtro-aceite'] },
  { id: 'escape', n: 'Escape', componentes: ['hibrido-escape'] },
  { id: 'admision', n: 'Admisión', componentes: ['hibrido-admision', 'hibrido-filtro-aire'] },
];

/** What each part is called on the page (the list and the 3D tags). */
export const NOMBRES_PIEZA: Record<string, string> = {
  'hibrido-motor': 'Bloque, culata y cigüeñal', 'hibrido-planetario': 'Engranaje planetario', 'hibrido-embrague': 'Embrague',
  'hibrido-caja': 'Caja de cambios', 'hibrido-cadena': 'Cadena a la rueda', 'hibrido-diferencial': 'Diferencial y palieres',
  'hibrido-mg1': 'Generador MG1', 'hibrido-generador': 'Generador y su cable', 'hibrido-p2': 'Motor-generador P2',
  'motor-electrico': 'Motor de buje', 'hibrido-mg2': 'Motor eléctrico MG2 (en la corona)', controlador: 'Controlador (inversor)', 'hibrido-deposito': 'Depósito, boca y conducto',
  'refrigeracion-radiador': 'Radiador y ventilador', 'refrigeracion-tubos': 'Tubos del refrigerante', 'hibrido-arbol': 'Árbol de transmisión', 'hibrido-bomba-agua': 'Bomba de agua', 'hibrido-manguitos': 'Termostato y manguitos',
  'hibrido-bomba-aceite': 'Bomba de aceite', 'hibrido-carter': 'Cárter de aceite', 'hibrido-filtro-aceite': 'Filtro de aceite',
  'hibrido-escape': 'Colectores, silencioso y tubo de escape', 'hibrido-admision': 'Colector de admisión y mariposa', 'hibrido-filtro-aire': 'Filtro de aire',
};

/** The group a part belongs to (null: not an engine part). */
export const grupoDePieza = (comp: string): GrupoMotor | null => GRUPOS_MOTOR.find(g => g.componentes.includes(comp)) ?? null;

/** What the model needs to say which parts exist: the Triciclo family's model, read loosely (no import of the model). */
export interface ModeloConMotor { tipo: string; phev?: { disp: DisposicionHibrido } | null; motor?: { tipo?: string } }

/** The parts this design has, in list order. */
export function piezasPresentes(m: ModeloConMotor): string[] {
  if (m.tipo !== 'triciclo') return [];
  const s = new Set<string>(['controlador']);
  // (2026-11-17: no hub motor when the traction motor is MG2 on the planetary)
  if (!m.motor?.tipo || m.motor.tipo === 'buje') s.add('motor-electrico');
  const d = m.phev?.disp;
  if (d) {
    for (const k of ['hibrido-motor', 'hibrido-admision', 'hibrido-filtro-aire', 'hibrido-escape', 'hibrido-bomba-agua', 'hibrido-manguitos', 'hibrido-bomba-aceite', 'hibrido-carter', 'hibrido-filtro-aceite', 'hibrido-deposito']) s.add(k);
    for (const e of d.ejes) s.add(e.nombre === 'planetario' ? 'hibrido-planetario' : e.nombre === 'MG1' ? 'hibrido-mg1' : e.nombre === 'MG2' ? 'hibrido-mg2' : e.nombre === 'generador' ? 'hibrido-generador' : e.nombre === 'P2' ? 'hibrido-p2' : 'hibrido-embrague');
    if (d.caja) s.add(d.caja.nombre === 'caja de cambios' ? 'hibrido-caja' : 'hibrido-planetario');
    if (d.cadena) s.add('hibrido-cadena');
    if (d.diferencial) s.add('hibrido-diferencial');
    if (d.arbol) s.add('hibrido-arbol');
    // (the radiator and its pipes: none with the cooling «Ninguna»)
    const r = refrigeracionDe(m as ModeloTriciclo);
    if (r?.radiadores.length) s.add('refrigeracion-radiador');
    if (r && (r.tubos.caliente.length || r.tubos.fria.length)) s.add('refrigeracion-tubos');
  }
  return GRUPOS_MOTOR.flatMap(g => g.componentes.filter(c => s.has(c)));
}

// ── the engine's auxiliaries: where they go, from the engine's own boxes ──────────────────────────────────────────
// Axes as hibrido.ts: x forward, y up, z across (the crank axis); the connection (planetary, generator, clutch) hangs off
// the left end (z0), so the belt-driven water pump and the oil pump go on the right end (z1), as on a motorcycle twin.

export interface AuxiliaresMotor {
  /** The water pump: its body (a cylinder along z on the block's right end) and its pulley. */
  bombaAgua: { x: number; y: number; r: number; z0: number; z1: number; polea: number };
  /** The thermostat housing on the head's right end, and the hoses: pump to block, and the two stubs out to the radiator. */
  termostato: { x: number; y: number; z: number };
  manguitos: V3[][];
  /** The sump: the crankcase's bottom 40 %, a pan a little wider; the oil pump on the right end, low; the filter on the front. */
  carter: CajaZ;
  bombaAceite: CajaZ;
  filtroAceite: { x0: number; x1: number; y: number; z: number; r: number };
  /** The air filter: a flat box on the plenum, and its duct to the throttle body. */
  filtroAire: CajaZ;
  conductoAire: V3[];
}

export function auxiliaresMotor(d: DisposicionHibrido): AuxiliaresMotor {
  const mo = d.motor, c = mo.carter, b = mo.bloque, h = mo.culata, a = mo.admision;
  const yBomba = (b.y0 + b.y1) / 2, xBomba = mo.xc + Math.min(0.03, (b.x1 - b.x0) / 4);
  const bombaAgua = { x: xBomba, y: yBomba, r: 0.032, z0: c.z1, z1: c.z1 + 0.035, polea: 0.04 };
  const termostato = { x: (h.x0 + h.x1) / 2, y: (h.y0 + h.y1) / 2, z: h.z1 + 0.015 };
  // (the radiator is not ours: two hoses leave forward and up, 15 cm, towards wherever it goes)
  const zF = bombaAgua.z1 + 0.01;
  const manguitos: V3[][] = [
    [[xBomba, yBomba + bombaAgua.r, bombaAgua.z1 - 0.01], [termostato.x - 0.01, (yBomba + termostato.y) / 2, zF], [termostato.x, termostato.y, termostato.z + 0.012]],
    [[termostato.x, termostato.y + 0.012, termostato.z + 0.012], [termostato.x + 0.06, termostato.y + 0.04, zF], [termostato.x + 0.15, termostato.y + 0.06, zF - 0.01]],
    [[xBomba + 0.02, yBomba - 0.01, bombaAgua.z1], [xBomba + 0.08, yBomba - 0.02, zF + 0.005], [xBomba + 0.17, yBomba, zF - 0.01]],
  ];
  const carter: CajaZ = { x0: c.x0 - 0.006, x1: c.x1 + 0.006, y0: c.y0 - 0.004, y1: c.y0 + 0.4 * (c.y1 - c.y0), z0: c.z0 + 0.004, z1: c.z1 + 0.006 };
  const bombaAceite: CajaZ = { x0: mo.xc - 0.035, x1: mo.xc + 0.035, y0: c.y0 + 0.012, y1: c.y0 + 0.06, z0: c.z1 + 0.004, z1: c.z1 + 0.024 };
  const filtroAceite = { x0: c.x1, x1: c.x1 + 0.08, y: c.y0 + 0.55 * (c.y1 - c.y0), z: (c.z0 + c.z1) / 2 + 0.03, r: 0.034 };
  const filtroAire: CajaZ = { x0: a.x0 - 0.01, x1: a.x1 + 0.01, y0: a.y1 + 0.012, y1: a.y1 + 0.052, z0: a.z0 + 0.01, z1: a.z1 - 0.01 };
  const xm = (a.x0 + a.x1) / 2, ym = (a.y0 + a.y1) / 2;
  const conductoAire: V3[] = [[xm, ym, a.z1 + 0.04], [xm, filtroAire.y1 - 0.01, a.z1 + 0.05], [xm, (filtroAire.y0 + filtroAire.y1) / 2, filtroAire.z1 - 0.01]];
  return { bombaAgua, termostato, manguitos, carter, bombaAceite, filtroAceite, filtroAire, conductoAire };
}

// ── the engine's mass, split ───────────────────────────────────────────────────────────────────────────────────
// The petrol engine's figure (15 kg + 1,4 kg/kW, or a catalogue engine's dry mass) has always been the whole engine
// «con su escape». It is now split into what it is made of, with each piece at its centre; the sum stays exactly the
// engine's figure, so the empty vehicle weighs what it did (its centre of gravity moves a little: the exhaust and the
// intake are no longer counted at the crank). Estimates of parts of their class, not measured: a small engine's
// mechanical water pump with its pulley ≈ 0,8 kg and its thermostat and hoses ≈ 0,5 kg; a trochoid oil pump ≈ 0,4 kg,
// a pressed sump pan ≈ 0,9 kg and a spin-on filter ≈ 0,3 kg (without the oil, which a dry figure leaves out); a plastic
// plenum, runners and throttle body ≈ 1,4 kg with a 0,6 kg air box; a steel exhaust (headers, silencer, tailpipe) of a
// motorcycle-size engine 3–6 kg: 2 kg + 0,1 kg per kW. Never more than 40 % of the engine together (scaled down then).

export interface PiezaMotorKg { nombre: string; kg: number; x: number; y: number; z: number; nota?: string }

/** The auxiliaries' lines (the block keeps the rest: `kgMotor` minus their sum). */
export function desgloseMotorGasolina(d: DisposicionHibrido, kgMotor: number, kW: number): PiezaMotorKg[] {
  const x = auxiliaresMotor(d), mo = d.motor, s = d.escape.silencioso;
  const mid = (c: CajaZ): V3 => [(c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2, (c.z0 + c.z1) / 2];
  // (the exhaust's centre: its silencer, where most of its steel is, a third of the way to the headers)
  const xs = (s.x0 + s.x1) / 2, xe = (mo.x0 + xs) / 2;
  let piezas: PiezaMotorKg[] = [
    { nombre: 'Motor de gasolina: escape (colectores, silencioso y tubo)', kg: 2 + 0.1 * kW, x: xs + (xe - xs) / 3, y: s.y + (mo.yc - s.y) / 3, z: s.z },
    { nombre: 'Motor de gasolina: admisión y filtro de aire', kg: 2.0, ...xyz(mid({ ...mo.admision, y1: x.filtroAire.y1 })) },
    { nombre: 'Motor de gasolina: bomba de agua, termostato y manguitos', kg: 1.3, x: x.bombaAgua.x, y: x.bombaAgua.y, z: (x.bombaAgua.z0 + x.bombaAgua.z1) / 2 },
    { nombre: 'Motor de gasolina: bomba de aceite, cárter y filtro', kg: 1.6, ...xyz(mid(x.carter)) },
  ];
  const suma = piezas.reduce((t, p) => t + p.kg, 0), tope = 0.4 * kgMotor;
  if (suma > tope) piezas = piezas.map(p => ({ ...p, kg: p.kg * tope / suma }));
  return piezas;
}
const xyz = (v: V3) => ({ x: v[0], y: v[1], z: v[2] });
