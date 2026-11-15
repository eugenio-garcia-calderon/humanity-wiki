// ============================================================================
// CIRCUITO DE ESTABILIDAD EN CURVAS · LA FÍSICA (2026-11-15, Eugenio)
// ============================================================================
// «Crea además del garaje un circuito de simulación de estabilidad en curvas
// del vehículo donde el primero que se pueda probar sea el Lumeneo Smera de 4
// ruedas con basculación… y compararlo con otro vehículo como el Aptera».
//
// QUASI-STEADY, RIGID BODY. Each corner is a circle of radius r driven at a
// constant speed v, long enough for the vehicle to settle. The vehicle is a rigid
// body on its wheel contact points: no suspension roll, no tyre deflection, no
// load transfer dynamics, no aerodynamics, no transients (except the tilt rate,
// which is shown as information only). Everything here is pure: no React, no
// three.js, so `scripts/circuito-limites.ts` prints exactly what the page shows.
//
// Units: metres, seconds, radians inside; g and km/h only where named so.

export const G = 9.81;

/** Lateral acceleration of a circle of radius r (m) at v (m/s), in g. */
export const aLateral = (v: number, r: number) => (v * v) / (r * G);

/** Convex hull (monotone chain) of ground points [x along the car, z across], counter-clockwise. */
export function envolventeConvexa(p: [number, number][]): [number, number][] {
  const q = [...p].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (q.length < 3) return q;
  const cruz = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: [number, number][] = [], hi: [number, number][] = [];
  for (const x of q) { while (lo.length >= 2 && cruz(lo[lo.length - 2], lo[lo.length - 1], x) <= 1e-12) lo.pop(); lo.push(x); }
  for (let i = q.length - 1; i >= 0; i--) { const x = q[i]; while (hi.length >= 2 && cruz(hi[hi.length - 2], hi[hi.length - 1], x) <= 1e-12) hi.pop(); hi.push(x); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}

/**
 * The support polygon's edges on the outside of a turn (outward normal pointing to +z), as the rollover sees them:
 * `d` the ground distance from the centre of gravity's footprint (xg, 0) to the edge, `nz` how much the edge faces
 * sideways (1 for a side parallel to the car, less for the slanted side of a three-wheeler).
 *
 * Taking moments about that edge: the weight m·g holds the car with arm d; the lateral force m·a at height h tips
 * it with arm h·nz (only the part of the force across the edge counts). So it tips at a/g = d / (h·nz).
 *   · four wheels, same track t:   d = t/2, nz = 1                   → t / (2h)         (NHTSA static stability factor)
 *   · tadpole (2 front, 1 rear):   d/nz = t·b/(2L)                    → t·b / (2·h·L)    (b: CdG to the REAR axle)
 *   · delta (1 front, 2 rear):     d/nz = t·a/(2L)                    → t·a / (2·h·L)    (a: CdG to the FRONT axle)
 *   · four wheels, two tracks:     d/nz = (tf·b + tr·a) / (2L)        → the track under the CdG, over 2h
 *   · rhombus: the smaller of its two slanted sides.
 */
export function bordesExteriores(apoyos: [number, number][], xg: number): { d: number; nz: number }[] {
  const H = envolventeConvexa(apoyos);
  const out: { d: number; nz: number }[] = [];
  if (H.length < 3) return out;
  for (let i = 0; i < H.length; i++) {
    const [x1, z1] = H[i], [x2, z2] = H[(i + 1) % H.length];
    const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
    if (L < 1e-9) continue;
    // counter-clockwise hull: the outward normal is (dz, -dx)/L
    const nx = dz / L, nz = -dx / L;
    if (nz <= 1e-6) continue;
    const d = nx * (x1 - xg) + nz * (z1 - 0);
    out.push({ d, nz });
  }
  return out;
}

/** Half the «effective track» at the centre of gravity (m): min d/nz. The rear view draws the wheels this far apart. */
export function semiViaEfectiva(apoyos: [number, number][], xg: number): number {
  const b = bordesExteriores(apoyos, xg);
  return b.length ? Math.max(0, Math.min(...b.map(e => e.d / e.nz))) : 0;
}

/**
 * Rollover threshold (g of steady lateral acceleration), rigid body, the body leaned INTO the turn by `phi` (rad)
 * about a roll axis on the ground (0 for a car that does not tilt). Leaning moves the centre of gravity inwards by
 * h·sin φ and lowers it to h·cos φ, so about each outer edge: a/g = (d + h·sin φ·nz) / (h·cos φ·nz)
 *                                                               = d / (h·cos φ·nz) + tan φ.
 * With no track at all (d = 0, a motorbike) it is tan φ: the lean alone balances the turn.
 */
export function umbralVuelco(apoyos: [number, number][], xg: number, h: number, phi = 0): number {
  const b = bordesExteriores(apoyos, xg);
  if (!b.length) return Math.tan(phi);
  return Math.max(0, Math.min(...b.map(e => (e.d + h * Math.sin(phi) * e.nz) / (h * Math.cos(phi) * e.nz))));
}

// ---------------------------------------------------------------- vehicles as the physics sees them
export interface VehiculoFisico {
  id: string;
  /** Ground contact points [x forward from the rearmost axle, z across] (m). */
  apoyos: [number, number][];
  /** Centre of gravity: x on the same axis (m) and height above the ground (m), with the driver. */
  xg: number; h: number;
  /** Maximum lean of a tilting vehicle (degrees); 0 = it does not tilt. */
  inclinacionMax: number;
  /** Top speed (km/h): no lap goes faster. */
  vmax: number;
}

export interface Limites {
  /** Rollover threshold standing upright (g): the static stability factor. */
  vuelcoRigido: number;
  /** Rollover threshold as it really drives (g): for a tilting vehicle, leaned at its maximum. */
  vuelco: number;
  /** Lateral acceleration up to which a tilting vehicle balances the turn by leaning alone: tan(φmax) (g). */
  balanceo: number;
  /** Grip (g) = μ. */
  agarre: number;
  /** The first limit and which one it is. */
  limite: number; primero: 'vuelca' | 'derrapa';
}

export function limites(v: VehiculoFisico, mu: number): Limites {
  const phi = (v.inclinacionMax * Math.PI) / 180;
  const vuelcoRigido = umbralVuelco(v.apoyos, v.xg, v.h, 0);
  const vuelco = phi > 0 ? umbralVuelco(v.apoyos, v.xg, v.h, phi) : vuelcoRigido;
  const limite = Math.min(vuelco, mu);
  return { vuelcoRigido, vuelco, balanceo: Math.tan(phi), agarre: mu, limite, primero: vuelco < mu ? 'vuelca' : 'derrapa' };
}

/** Lean angle (degrees) at a lateral acceleration (g): what balances the turn, up to the vehicle's maximum. Signed. */
export function inclinacion(v: VehiculoFisico, aG: number): { phi: number; pedida: number } {
  const pedida = (Math.atan(Math.abs(aG)) * 180) / Math.PI;
  const phi = Math.min(pedida, v.inclinacionMax);
  return { phi: Math.sign(aG) * phi, pedida: Math.sign(aG) * pedida };
}

/** Share of the first limit kept in reserve before «al límite» (15 %): what the rigid model does not see (suspension roll, tyre deflection, bumps lower a real threshold by 10-15 %). */
export const RESERVA = 0.15;

export type Lectura = 'ok' | 'limite' | 'vuelca' | 'derrapa';
export interface Veredicto { a: number; lectura: Lectura; margen: number; limite: number; primero: 'vuelca' | 'derrapa' }

/** The safety reading at a lateral acceleration (g). `margen`: what is left of the first limit (1 = all, 0 = at it, < 0 over it). */
export function veredicto(L: Limites, aG: number): Veredicto {
  const a = Math.abs(aG), margen = 1 - a / L.limite;
  const eps = 1e-9; // a corner driven exactly at a boundary reads the same in every corner
  const lectura: Lectura = a <= (1 - RESERVA) * L.limite + eps ? 'ok' : a <= L.limite + eps ? 'limite' : L.primero;
  return { a, lectura, margen, limite: L.limite, primero: L.primero };
}

/** Speed (km/h) at which a corner of radius r reaches a lateral acceleration of `aG` g. */
export const velocidadDe = (aG: number, r: number) => Math.sqrt(Math.max(0, aG) * G * r) * 3.6;

// ---------------------------------------------------------------- the circuit
export interface Curva { id: string; nombre: string; radio: number; nota: string }
/** One piece of the track: a straight, or an arc of a corner (angle in degrees, + to the left). */
type Tramo = { recta: number } | { curva: string; angulo: number };

/**
 * The circuit's five corners. The chicane's two arcs and the two 60 m links are one corner each in the analysis:
 * same radius, same speed, same reading.
 */
export const CURVAS: Curva[] = [
  { id: 'horquilla', nombre: 'Horquilla', radio: 15, nota: '180°, radio 15 m: una rotonda pequeña o una curva de montaña cerrada' },
  { id: 'chicane', nombre: 'Chicane', radio: 25, nota: 'derecha-izquierda de 45° cada una, radio 25 m, con 10 m rectos entre las dos' },
  { id: 'curva40', nombre: 'Curva de 40 m', radio: 40, nota: '90°, radio 40 m: un cruce de carretera o una salida de autovía' },
  { id: 'enlace60', nombre: 'Enlace de 60 m', radio: 60, nota: 'dos curvas de 90° (derecha y luego izquierda), radio 60 m' },
  { id: 'rapida', nombre: 'Curva rápida', radio: 120, nota: '90°, radio 120 m: una curva de carretera nacional' },
];
export const curva = (id: string) => CURVAS.find(c => c.id === id)!;

/**
 * The layout, counter-clockwise from the start line. The two free straights (the start and the one between the
 * 60 m links) were solved so that the loop closes exactly (a 2×2 linear solve, 2026-11-15; checked by
 * `scripts/circuito-limites.ts`).
 */
const TRAMOS: Tramo[] = [
  { recta: 67.4264 },                     // start / finish straight
  { curva: 'rapida', angulo: 90 },
  { recta: 30 },
  { curva: 'curva40', angulo: 90 },
  { recta: 225 },                         // back straight
  { curva: 'chicane', angulo: -45 }, { recta: 10 }, { curva: 'chicane', angulo: 45 },
  { recta: 30 },
  { curva: 'horquilla', angulo: 180 },
  { recta: 30 },
  { curva: 'enlace60', angulo: -90 },
  { recta: 61.7157 },
  { curva: 'enlace60', angulo: 90 },
];

export interface Punto { s: number; x: number; y: number; rumbo: number; k: number; curva: string | null }

/** The track sampled every `paso` metres: position, heading, signed curvature (1/m, + to the left) and its corner. */
export function trazado(paso = 0.5): { puntos: Punto[]; largo: number } {
  // the chicane's 10 m straight is shorter than the others: keep the chicane's sign through it for the corner label
  const puntos: Punto[] = [];
  let x = 0, y = 0, h = 0, s = 0;
  puntos.push({ s, x, y, rumbo: h, k: 0, curva: null });
  TRAMOS.forEach((t, i) => {
    if ('recta' in t) {
      const n = Math.max(1, Math.round(t.recta / paso)), ds = t.recta / n;
      const entreChicane = TRAMOS[i - 1] && 'curva' in TRAMOS[i - 1] && (TRAMOS[i - 1] as { curva: string }).curva === 'chicane' && TRAMOS[i + 1] && 'curva' in TRAMOS[i + 1] && (TRAMOS[i + 1] as { curva: string }).curva === 'chicane';
      for (let j = 0; j < n; j++) { x += ds * Math.cos(h); y += ds * Math.sin(h); s += ds; puntos.push({ s, x, y, rumbo: h, k: 0, curva: entreChicane ? 'chicane' : null }); }
    } else {
      const r = curva(t.curva).radio, a = (t.angulo * Math.PI) / 180, largo = Math.abs(a) * r;
      const n = Math.max(2, Math.round(largo / paso)), da = a / n, sg = Math.sign(a);
      const cx = x - sg * r * Math.sin(h), cy = y + sg * r * Math.cos(h);
      for (let j = 0; j < n; j++) {
        h += da; x = cx + sg * r * Math.sin(h); y = cy - sg * r * Math.cos(h); s += largo / n;
        puntos.push({ s, x, y, rumbo: h, k: sg / r, curva: t.curva });
      }
    }
  });
  return { puntos, largo: s };
}

// ---------------------------------------------------------------- a lap
/** «apurar»: each corner at `fraccion` of that car's limit SPEED there (so at fraccion² of its lateral limit). */
export type Modo = { tipo: 'fija'; kmh: number } | { tipo: 'apurar'; fraccion: number };

/** Longitudinal limits for the «apurar» lap (m/s²): accelerate at 2.5 or half the grip, brake at 70 % of the grip. Not each car's power: the same for all, so only the corners differ. */
export const aceleracion = (mu: number) => Math.min(2.5, 0.5 * mu * G);
export const frenada = (mu: number) => 0.7 * mu * G;

export interface Vuelta {
  /** Speed (m/s), lateral acceleration (g, signed), lean (degrees, signed) and time (s) at each track point. */
  v: number[]; a: number[]; phi: number[]; pedida: number[]; t: number[];
  tiempo: number;
  /** Speed (km/h) through each corner. */
  enCurva: Record<string, number>;
  /**
   * A tilting vehicle in the chicane: from leaning one way to leaning the other in its 10 m straight, the lean
   * rate that asks (°/s). The rest of the lap has no transition curves (each arc starts at full curvature), so a
   * rate there would be an artefact of the drawing, not of the road.
   */
  ritmoChicane: { gradosS: number; desde: number; hasta: number; segundos: number } | null;
}

/**
 * Drive the lap. «fija»: the same speed everywhere (no faster than the car can go). «apurar»: each corner at
 * `fraccion` of that car's own limit speed there, the straights flat out to its top speed, with the braking and the
 * acceleration above between them (a forward and a backward pass, the textbook lap-time method).
 */
export function vuelta(veh: VehiculoFisico, L: Limites, mu: number, modo: Modo, puntos: Punto[]): Vuelta {
  const vtop = veh.vmax / 3.6, n = puntos.length;
  const v = new Array<number>(n);
  if (modo.tipo === 'fija') v.fill(Math.min(modo.kmh / 3.6, vtop));
  else {
    for (let i = 0; i < n; i++) {
      const k = Math.abs(puntos[i].k);
      v[i] = k > 0 ? Math.min(vtop, modo.fraccion * Math.sqrt((L.limite * G) / k)) : vtop;
    }
    const ac = aceleracion(mu), fr = frenada(mu);
    for (let pasada = 0; pasada < 2; pasada++) { // twice round: the lap is a loop, the start depends on the end
      for (let i = 1; i < n; i++) { const ds = puntos[i].s - puntos[i - 1].s; v[i] = Math.min(v[i], Math.sqrt(v[i - 1] ** 2 + 2 * ac * ds)); }
      v[0] = Math.min(v[0], v[n - 1]);
      for (let i = n - 2; i >= 0; i--) { const ds = puntos[i + 1].s - puntos[i].s; v[i] = Math.min(v[i], Math.sqrt(v[i + 1] ** 2 + 2 * fr * ds)); }
      v[n - 1] = Math.min(v[n - 1], v[0]);
    }
  }
  const a = puntos.map((p, i) => (v[i] * v[i] * p.k) / G);
  const inc = a.map(x => inclinacion(veh, x));
  const t = new Array<number>(n); t[0] = 0;
  for (let i = 1; i < n; i++) { const ds = puntos[i].s - puntos[i - 1].s; t[i] = t[i - 1] + ds / Math.max(0.5, (v[i] + v[i - 1]) / 2); }
  const enCurva: Record<string, number> = {};
  puntos.forEach((p, i) => { if (p.curva && p.k !== 0) enCurva[p.curva] = Math.max(enCurva[p.curva] ?? 0, v[i] * 3.6); });
  let ritmo: Vuelta['ritmoChicane'] = null;
  if (veh.inclinacionMax > 0) {
    const tramo = puntos.map((p, i) => (p.curva === 'chicane' && p.k === 0 ? i : -1)).filter(i => i >= 0);
    if (tramo.length) {
      const i0 = tramo[0] - 1, i1 = tramo[tramo.length - 1] + 1, dt = t[i1] - t[i0];
      if (i0 >= 0 && i1 < n && dt > 0) ritmo = { gradosS: Math.abs(inc[i1].phi - inc[i0].phi) / dt, desde: inc[i0].phi, hasta: inc[i1].phi, segundos: dt };
    }
  }
  return { v, a, phi: inc.map(x => x.phi), pedida: inc.map(x => x.pedida), t, tiempo: t[n - 1], enCurva, ritmoChicane: ritmo };
}

/** Where a time (s) falls on the lap: the index of the point just before it (binary search; the lap repeats). */
export function indiceEn(t: number[], tiempo: number): number {
  const T = t[t.length - 1], q = ((tiempo % T) + T) % T;
  let lo = 0, hi = t.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (t[m] <= q) lo = m; else hi = m; }
  return lo;
}
