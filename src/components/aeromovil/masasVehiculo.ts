// ============================================================================
// MASSES, CENTRE OF GRAVITY AND THE LOAD ON EACH WHEEL (2026-11-17, Eugenio)
// ============================================================================
// Eugenio: «que haya un cálculo de centro de gravedad y de pesos en cada eje, que aparezca en un nuevo apartado del
// menú que sea MASAS, y te de esta relación calculado».
//
// Pure (no React, no three.js). It does not weigh anything itself: it takes the parts lists the vehicles already
// make (Triciclo: `triciclo/masas.ts` `piezasTriciclo`, Basculante: `piezasBasculante`), the occupants and the
// luggage, and adds them up: total mass, centre of gravity in three axes, the load on every wheel and on every axle,
// and who contributes most. The Triciclo's adapter is `triciclo/centroMasas.ts`; the Basculante's is below.
//
// Axes as everywhere in the editor: x forward (the front axle, or the nose wheel, at x = 0), y up from the ground,
// z across (+ to the right).

import { umbralVuelco } from './circuito/fisica';

/** One mass with its centre (m). `z` absent: on the centre line. */
export interface Masa { nombre: string; kg: number; x: number; y: number; z?: number; nota?: string; grupo?: string }
/** A wheel's contact with the ground: where, on which axle, and whether it drives. */
export interface RuedaApoyo { nombre: string; eje: string; x: number; z: number; motriz: boolean }
export interface Centro { masa: number; x: number; y: number; z: number }

/** The sum of the masses and their centre. */
export function centroDe(lista: Masa[]): Centro {
  const M = lista.reduce((a, p) => a + p.kg, 0);
  if (!(M > 0)) return { masa: 0, x: 0, y: 0, z: 0 };
  return { masa: M, x: lista.reduce((a, p) => a + p.kg * p.x, 0) / M, y: lista.reduce((a, p) => a + p.kg * p.y, 0) / M, z: lista.reduce((a, p) => a + p.kg * (p.z ?? 0), 0) / M };
}

/**
 * The static load on each wheel (kg) of a body of mass `M` with its centre of gravity over (x, z).
 *
 * With three wheels it is exact (three supports, three equations). With four it is statically indeterminate: here every
 * wheel has the same spring and the body is rigid, so the loads vary in a straight line with x and z (the floor under
 * a rigid plank on equal springs). For two axles that is the lever rule on each axle and the same left and right;
 * in a diamond (nose, two laterals, tail) it is what equal springs give. Softer springs at one end would move load
 * away from it: an estimate, not a measurement. A negative load means the centre of gravity is outside the wheels.
 */
export function repartirCargas(ruedas: RuedaApoyo[], M: number, x: number, z: number): number[] {
  // F_i = a + b·x_i + c·z_i, with ΣF = M, ΣF·x = M·x, ΣF·z = M·z (the normal equations of the plane)
  const n = ruedas.length; if (!n) return [];
  const s = (f: (r: RuedaApoyo) => number) => ruedas.reduce((a, r) => a + f(r), 0);
  const A = [[n, s(r => r.x), s(r => r.z)], [s(r => r.x), s(r => r.x * r.x), s(r => r.x * r.z)], [s(r => r.z), s(r => r.x * r.z), s(r => r.z * r.z)]];
  const B = [M, M * x, M * z];
  // (a wheel layout with every wheel on one line across or along has no stiffness that way: drop that unknown)
  const usar = [0, 1, 2].filter(i => Math.abs(A[i][i]) > 1e-9 * (1 + Math.abs(A[0][0])) && (i === 0 || det2(A, 0, i) > 1e-9));
  const sol = resolver(usar.map(i => usar.map(j => A[i][j])), usar.map(i => B[i]));
  const k = [0, 0, 0]; usar.forEach((i, j) => { k[i] = sol[j]; });
  return ruedas.map(r => k[0] + k[1] * r.x + k[2] * r.z);
}
const det2 = (A: number[][], i: number, j: number) => A[i][i] * A[j][j] - A[i][j] * A[j][i];
/** Gaussian elimination with partial pivoting (3 × 3 at most). */
function resolver(A: number[][], b: number[]): number[] {
  const n = b.length, M = A.map((f, i) => [...f, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let f = c + 1; f < n; f++) if (Math.abs(M[f][c]) > Math.abs(M[p][c])) p = f;
    [M[c], M[p]] = [M[p], M[c]];
    for (let f = c + 1; f < n; f++) { const k = M[f][c] / M[c][c]; for (let j = c; j <= n; j++) M[f][j] -= k * M[c][j]; }
  }
  const x = new Array(n).fill(0);
  for (let f = n - 1; f >= 0; f--) { let v = M[f][n]; for (let j = f + 1; j < n; j++) v -= M[f][j] * x[j]; x[f] = v / M[f][f]; }
  return x;
}

/** One loading of the vehicle (empty, with its occupants, at the design mass): its mass, centre and wheel loads. */
export interface EstadoMasas {
  id: 'vacio' | 'ocupado' | 'diseno'; nombre: string;
  cg: Centro;
  ruedas: { nombre: string; eje: string; kg: number; motriz: boolean }[];
  ejes: { nombre: string; kg: number; parte: number }[];
}
export function estadoMasas(id: EstadoMasas['id'], nombre: string, lista: Masa[], ruedas: RuedaApoyo[]): EstadoMasas {
  const cg = centroDe(lista), cargas = repartirCargas(ruedas, cg.masa, cg.x, cg.z);
  const rs = ruedas.map((r, i) => ({ nombre: r.nombre, eje: r.eje, kg: cargas[i], motriz: r.motriz }));
  const ejes: EstadoMasas['ejes'] = [];
  for (const r of rs) { const e = ejes.find(q => q.nombre === r.eje); if (e) e.kg += r.kg; else ejes.push({ nombre: r.eje, kg: r.kg, parte: 0 }); }
  for (const e of ejes) e.parte = cg.masa > 0 ? e.kg / cg.masa : 0;
  return { id, nombre, cg, ruedas: rs, ejes };
}

/**
 * How far the centre of gravity can go forward or back over the wheels at height h: braking hard puts a/g·h of
 * «lean» on it, so the rear wheels lift when (front edge − x)/h < a/g. The front edge is the support polygon's
 * (the wheels on the ground) at the centre of gravity's side, z.
 */
export function bordeLongitudinal(ruedas: RuedaApoyo[], z: number, delante: boolean): number {
  // the polygon's extent along x at z: the hull's edges crossing z (a single wheel at the end: its x)
  const ps = ruedas.map(r => [r.x, r.z] as [number, number]);
  let mejor = delante ? -Infinity : Infinity;
  for (const a of ps) for (const b of ps) {
    if (a === b) continue;
    const [x1, z1] = a, [x2, z2] = b;
    if ((z1 - z) * (z2 - z) > 0) continue;
    const x = Math.abs(z2 - z1) < 1e-9 ? (delante ? Math.max(x1, x2) : Math.min(x1, x2)) : x1 + (x2 - x1) * (z - z1) / (z2 - z1);
    mejor = delante ? Math.max(mejor, x) : Math.min(mejor, x);
  }
  if (!Number.isFinite(mejor)) mejor = delante ? Math.max(...ps.map(p => p[0])) : Math.min(...ps.map(p => p[0]));
  return mejor;
}

/** Rollover threshold (g) for a centre at (x, h), the same polygon rule as the circuit's and the editor's «Vuelco». */
export const vuelcoEn = (ruedas: RuedaApoyo[], x: number, h: number) => umbralVuelco(ruedas.map(r => [r.x, r.z] as [number, number]), x, h);

/** Hard braking (g) the checks ask for without the rear lifting: a good tyre on dry asphalt stops at about this. */
export const FRENADA = 0.8;
/** The hill the driven wheels must climb on a wet road: 16 % (a steep city street), with a wet road's grip (μ ≈ 0,5). A design choice, not a norm. */
export const CUESTA = 0.16, AGARRE_MOJADO = 0.5;

/** On a hill, how many times what it needs the driven wheels can push (> 1: it climbs). */
export function traccionCuesta(ruedas: RuedaApoyo[], cg: Centro, cuesta = CUESTA, mu = AGARRE_MOJADO): number {
  // on a slope θ the weight's component across the ground is M·cos θ, and its line meets the ground h·tan θ further
  // downhill (behind, climbing forwards): that is where the wheels share it
  const th = Math.atan(cuesta), cargas = repartirCargas(ruedas, cg.masa * Math.cos(th), cg.x - cg.y * Math.tan(th), cg.z);
  const motriz = ruedas.reduce((a, r, i) => a + (r.motriz ? Math.max(0, cargas[i]) : 0), 0);
  return mu * motriz / (cg.masa * Math.sin(th));
}

/**
 * The range of front-to-back balance that keeps every one of the three rules at this height: the rollover threshold
 * at least `vuelcoMin` g, braking at `FRENADA` g without the rear lifting, and climbing `CUESTA` in the wet. As the share
 * of the weight ahead of the rearmost wheels (0–1), or null if no balance keeps all three.
 */
export function rangoReparto(ruedas: RuedaApoyo[], cg: Centro, vuelcoMin: number): { min: number; max: number } | null {
  const xa = Math.min(...ruedas.map(r => r.x)), xd = Math.max(...ruedas.map(r => r.x)), L = xd - xa;
  if (!(L > 0) || !(cg.y > 0)) return null;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i <= 200; i++) {
    const x = xa + L * i / 200, c = { ...cg, x };
    const bien = vuelcoEn(ruedas, x, cg.y) >= vuelcoMin && (bordeLongitudinal(ruedas, cg.z, true) - x) / cg.y >= FRENADA && traccionCuesta(ruedas, c) >= 1;
    if (bien) { min = Math.min(min, i / 200); max = Math.max(max, i / 200); }
  }
  return min <= max ? { min, max } : null;
}

/** What each mass does to the centre of gravity's height: how many cm it raises (+) or lowers (−) it, against having it at the centre's height. */
export function aporteAltura(p: Masa, cg: Centro) { return cg.masa > 0 ? p.kg * (p.y - cg.y) / cg.masa : 0; }

// ---------------------------------------------------------------- the Basculante (its own masses, as its panel shows them)
/**
 * The Cuadriciclo Basculante as `analizarMasas` wants it. Its results give the parts and the centre with its two
 * riders, not where each rider sits: the riders go in as one mass where the difference puts them (exact for the
 * total and the centre; only the contributors list sees them as one).
 */
export function entradaBasculante(r: { piezas: { nombre: string; kg: number; x: number; y: number; grupo: string; nota?: string }[]; cg: { x: number; y: number; masa: number } }, m: { xR: number; via: { del: number; tras: number } }) {
  const piezas: Masa[] = r.piezas.map(p => ({ nombre: p.nombre, kg: p.kg, x: p.x, y: p.y, grupo: p.grupo, ...(p.nota ? { nota: p.nota } : {}) }));
  const v = centroDe(piezas), kgOcc = r.cg.masa - v.masa;
  const ocupantes: Masa[] = kgOcc > 0.5 ? [{ nombre: 'Los dos ocupantes', kg: kgOcc, x: (r.cg.x * r.cg.masa - v.x * v.masa) / kgOcc, y: (r.cg.y * r.cg.masa - v.y * v.masa) / kgOcc, grupo: 'ocupantes' }] : [];
  const ruedas: RuedaApoyo[] = [
    { nombre: 'Delantera izquierda', eje: 'Eje delantero', x: 0, z: -m.via.del / 2, motriz: false },
    { nombre: 'Delantera derecha', eje: 'Eje delantero', x: 0, z: m.via.del / 2, motriz: false },
    { nombre: 'Trasera izquierda', eje: 'Eje trasero', x: m.xR, z: -m.via.tras / 2, motriz: true },
    { nombre: 'Trasera derecha', eje: 'Eje trasero', x: m.xR, z: m.via.tras / 2, motriz: true },
  ];
  return { piezas, ocupantes, equipaje: null as Masa | null, ruedas };
}

/** Everything the «Masas» tab shows, from the parts, the occupants and the luggage. */
export interface AnalisisMasas {
  estados: EstadoMasas[];
  /** Every mass with occupants on board, heaviest first. */
  lista: Masa[];
  ruedas: RuedaApoyo[];
}
export function analizarMasas(e: { piezas: Masa[]; ocupantes: Masa[]; equipaje: Masa | null; ruedas: RuedaApoyo[] }): AnalisisMasas {
  const estados = [
    estadoMasas('vacio', 'Vacío', e.piezas, e.ruedas),
    estadoMasas('ocupado', e.ocupantes.length === 1 ? 'Con el piloto' : `Con ${e.ocupantes.length} ocupantes`, [...e.piezas, ...e.ocupantes], e.ruedas),
    ...(e.equipaje ? [estadoMasas('diseno', 'Masa de diseño (y equipaje)', [...e.piezas, ...e.ocupantes, e.equipaje], e.ruedas)] : []),
  ];
  return { estados, lista: [...e.piezas, ...e.ocupantes].sort((a, b) => b.kg - a.kg), ruedas: e.ruedas };
}
