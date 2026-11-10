import * as THREE from 'three';
import { FORMA_REF, monotona, punto, tAbajo, tArriba, type FormaBala, type Sec } from './balaForma';
import { aleta, cabina, camara, carenados, crearMateriales, malla, mats, ruedas, sinSombra, type CabinaTriciclo, type Mats } from './balaPiezas';
import { E, loft } from './forma';
import { ASIENTO, contornoCupula, techoEn, type Asientos } from './balaMedidas';

/*
 * The «Cuadriciclo Bala» built in three.js: skin, canopy, livery, lamps and
 * details; the wheels, pods, fin and interior come from `balaPiezas.ts` and
 * the shape itself from `balaForma.ts`. The techniques are the XL1's
 * (`xl1Modelo.ts`):
 *
 * - The skin is one grid over (x, t): rows at fixed x, columns at given t,
 *   with the surface's own normals. The columns are laid out in four bands
 *   whose edges are the livery and glass outlines (the navy waterline, the
 *   canopy frame and the canopy glass), so every colour edge and the glass
 *   edge are smooth curves, never steps of the mesh.
 * - The canopy glass is the same (x, t) surface on the same rows, filling the
 *   hole cut along exactly those columns: skin and glass share every edge
 *   vertex. The black frit is drawn by the glass shader from each vertex's
 *   distance to the outline.
 * - Lamps and stripes that follow the skin are patches on the same (x, t)
 *   surface, lifted a fraction of a millimetre; shut lines, vents and the
 *   headlamps are 2D drawings in one view projected onto the skin.
 * - Built once per page into a template; every `construir()` hands out copies
 *   of its geometries (the viewer disposes those), and mirrored parts share one.
 * No logos, lettering or numbers.
 */

type P2 = [number, number];

// ======================================================================= layout
// Drawn for the reference shape (balaForma.ts, DIM_REF); a built shape reaches
// these through its x map and its height changes (`disponer`).
/** The waterline: navy below it, from the nose ring to the tail ring. */
const Y_FLOTACION_REF = monotona([[0.30, 0.355], [0.1, 0.36], [-0.4, 0.375], [-1.2, 0.39], [-1.9, 0.41], [-2.4, 0.44], [-2.86, 0.47]]);

/**
 * The shape being built and its layout. One build at a time (everything here is
 * synchronous), so the functions below read these instead of carrying them in
 * every signature: `construirCon` sets them before it builds anything.
 */
let F: FormaBala = FORMA_REF;
let L = disponer(FORMA_REF);
/** The canopy's outline and the livery lines for a shape. */
function disponer(F: FormaBala) {
  const C = contornoCupula(F);
  /** Navy nose cone ahead of X_ARO_MORRO and navy tail cone behind X_ARO_COLA (with the lamp rings on the joints). */
  const X_ARO_MORRO = F.X(0.30), X_ARO_COLA = F.X(-2.86);
  const Y_FLOTACION = (x: number) => Y_FLOTACION_REF(F.R(x)) + F.dSuelo * 0.6;
  return {
    ...C, Y_FLOTACION, X_ARO_MORRO, X_ARO_COLA,
    T_D_MORRO: tAbajo(F.sec(X_ARO_MORRO), Y_FLOTACION(X_ARO_MORRO)), T_D_COLA: tAbajo(F.sec(X_ARO_COLA), Y_FLOTACION(X_ARO_COLA)),
  };
}

// ======================================================================= the skin
/** Row spacing: fine at the tips, round the canopy's ends (where its outline turns fast in plan) and on the rings. `q` > 1 spaces them out (a quick preview). */
function filasX(q = 1): number[] {
  const paso = (x: number) => {
    let p = 0.02;
    if (x < L.XF0 + 0.03 && x > L.XF1 - 0.03) p = 0.015;
    for (const xc of [L.XC0, L.XC1, L.XF0, L.XF1]) { const d = Math.abs(x - xc); if (d < 0.08) p = Math.min(p, 0.0012 + d * 0.08); }
    const dt = Math.min(F.X_MORRO - x, x - F.X_COLA);
    return Math.min(p, Math.max(0.0015, 0.08 * dt)) * q;
  };
  const xs: number[] = [];
  for (let x = F.X_MORRO; x > F.X_COLA; x -= paso(x)) xs.push(x);
  xs.push(F.X_COLA, L.XC0, L.XC1, L.XF0, L.XF1, L.X_ARO_MORRO, L.X_ARO_COLA);
  xs.sort((a, b) => b - a);
  return xs.filter((x, i) => i === 0 || xs[i - 1] - x > 4e-4);
}

/**
 * Columns along the half-section, in four bands: [0, tD] the navy belly up to
 * the waterline, [tD, tF] the white side up to the canopy frame, [tF, tC] the
 * frame, [tC, 1] the glass. Away from the canopy the frame and glass edges
 * ease to fixed values over 15 cm, so the columns never jump from row to row.
 */
const N_TRAMO = [9, 12, 3, 18];
const K_D = N_TRAMO[0], K_F = K_D + N_TRAMO[1], K_C = K_F + N_TRAMO[2];
const T_F_FIJO = 0.62, T_C_FIJO = 0.80;
const suaveP = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v * v * (3 - 2 * v); };
const fuera = (x: number, a: number, b: number) => (x > b ? x - b : x < a ? a - x : 0);
const enVidrio = (x: number) => x <= L.XC0 + 1e-9 && x >= L.XC1 - 1e-9;
const enMarco = (x: number) => x <= L.XF0 + 1e-9 && x >= L.XF1 - 1e-9;

/** Band edges (tD, tF, tC) at a station. */
function bandas(s: Sec): [number, number, number] {
  const x = s.x;
  const tD = x > L.X_ARO_MORRO ? L.T_D_MORRO : x < L.X_ARO_COLA ? L.T_D_COLA : tAbajo(s, L.Y_FLOTACION(x));
  const dF = fuera(x, L.XF1, L.XF0);
  const tF = dF > 0 ? 1 - (1 - T_F_FIJO) * suaveP(dF / 0.15) : tArriba(s, L.yMarco(x));
  const tC = dF > 0 ? 1 - (1 - T_C_FIJO) * suaveP(dF / 0.15) : enVidrio(x) ? tArriba(s, L.Y_VIDRIO(x)) : 1;
  return [tD, Math.max(tD, tF), Math.max(tF, tC)];
}
function columnasSkin(s: Sec): number[] {
  const [tD, tF, tC] = bandas(s), out: number[] = [];
  const tramo = (a: number, b: number, n: number) => { for (let k = 0; k < n; k++) out.push(a + (b - a) * k / n); };
  tramo(0, tD, N_TRAMO[0]); tramo(tD, tF, N_TRAMO[1]); tramo(tF, tC, N_TRAMO[2]); tramo(tC, 1, N_TRAMO[3]);
  out.push(1);
  return out;
}

interface Rejilla { pos: Float32Array; nor: Float32Array; uv: Float32Array; filas: number; cols: number; n: number; xs: number[] }

/**
 * A grid over the skin: for each row x, the columns run over the t-values
 * `ts(s)` of one half, mirrored to the other side ('abajo' puts the bottom
 * centre in the middle of the row, 'arriba' the top centre; 'lado' keeps a
 * single side, z > 0). Normals are the surface's own: the tangent along the
 * section from the curve itself, the one along x from the neighbouring rows'
 * sections at the same t, so two grids that share an edge shade alike.
 */
function rejilla(xs: number[], ts: (s: Sec) => number[], orden: 'abajo' | 'arriba' | 'lado'): Rejilla {
  const secs = xs.map(x => F.sec(x)), tsAll = secs.map(s => ts(s));
  const n = tsAll[0].length, cols = orden === 'lado' ? n : 2 * n - 1, filas = xs.length;
  const pos = new Float32Array(filas * cols * 3), nor = new Float32Array(filas * cols * 3), uv = new Float32Array(filas * cols * 2);
  const mitadX = (F.X_MORRO + F.X_COLA) / 2, e = 0.002;
  for (let i = 0; i < filas; i++) {
    const s = secs[i], tv = tsAll[i], sa = secs[Math.max(0, i - 1)], sb = secs[Math.min(filas - 1, i + 1)];
    const dx = xs[Math.max(0, i - 1)] - xs[Math.min(filas - 1, i + 1)];
    const half = tv.map(t => {
      const p = punto(s, t), q1 = punto(s, Math.min(1, t + e)), q0 = punto(s, Math.max(0, t - e)), pa = punto(sa, t), pb = punto(sb, t);
      // right-side normal = dX x dT, with dX = (dx, ya - yb, za - zb) and dT = (0, y1 - y0, z1 - z0)
      const Xy = pa[1] - pb[1], Xz = pa[0] - pb[0], Ty = q1[1] - q0[1], Tz = q1[0] - q0[0];
      let nx = Xy * Tz - Xz * Ty, ny = -dx * Tz, nz = dx * Ty;
      const l = Math.hypot(nx, ny, nz);
      if (l < 1e-12) { nx = xs[i] > mitadX ? 1 : -1; ny = 0; nz = 0; } else { nx /= l; ny /= l; nz /= l; }
      return { p, n: [nx, ny, nz] };
    });
    for (let c = 0; c < cols; c++) {
      const k = orden === 'lado' ? c : orden === 'abajo' ? Math.abs(c - (n - 1)) : (c < n ? c : 2 * (n - 1) - c);
      const lado = orden === 'lado' ? 1 : (c < n - 1 ? -1 : 1);
      const { p, n: nn } = half[k], o = (i * cols + c) * 3;
      pos[o] = xs[i]; pos[o + 1] = p[1]; pos[o + 2] = lado * p[0];
      nor[o] = nn[0]; nor[o + 1] = nn[1]; nor[o + 2] = lado * nn[2];
      if (Math.abs(p[0]) < 1e-7) nor[o + 2] = 0;
      uv[(i * cols + c) * 2] = i / Math.max(1, filas - 1); uv[(i * cols + c) * 2 + 1] = c / Math.max(1, cols - 1);
    }
  }
  return { pos, nor, uv, filas, cols, n, xs };
}

const dist2 = (P: Float32Array, a: number, b: number) => (P[a * 3] - P[b * 3]) ** 2 + (P[a * 3 + 1] - P[b * 3 + 1]) ** 2 + (P[a * 3 + 2] - P[b * 3 + 2]) ** 2;
/** Does the triangle (u, v, w) face the way its vertex normals point? */
function haciaFuera(R: Rejilla, u: number, v: number, w: number): boolean {
  const P = R.pos, N = R.nor;
  const ax = P[v * 3] - P[u * 3], ay = P[v * 3 + 1] - P[u * 3 + 1], az = P[v * 3 + 2] - P[u * 3 + 2];
  const bx = P[w * 3] - P[u * 3], by = P[w * 3 + 1] - P[u * 3 + 1], bz = P[w * 3 + 2] - P[u * 3 + 2];
  const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  return nx * (N[u * 3] + N[v * 3] + N[w * 3]) + ny * (N[u * 3 + 1] + N[v * 3 + 1] + N[w * 3 + 1]) + nz * (N[u * 3 + 2] + N[v * 3 + 2] + N[w * 3 + 2]) >= 0;
}
/** Zero area (two corners on the same point, e.g. at the tips): nothing to draw. */
function degenerado(R: Rejilla, u: number, v: number, w: number): boolean {
  const P = R.pos;
  const ax = P[v * 3] - P[u * 3], ay = P[v * 3 + 1] - P[u * 3 + 1], az = P[v * 3 + 2] - P[u * 3 + 2];
  const bx = P[w * 3] - P[u * 3], by = P[w * 3 + 1] - P[u * 3 + 1], bz = P[w * 3 + 2] - P[u * 3 + 2];
  return Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) < 1e-12;
}
/** Triangles of a grid, grouped by `grupo(i, k)` (row i, lower half-column k; −1 leaves the cell out); faces outward. */
function caras(R: Rejilla, nGrupos = 1, grupo?: (i: number, k: number) => number): number[][] {
  const grupos: number[][] = Array.from({ length: nGrupos }, () => []);
  for (let i = 0; i < R.filas - 1; i++) for (let c = 0; c < R.cols - 1; c++) {
    const k = Math.min(Math.abs(c - (R.n - 1)), Math.abs(c + 1 - (R.n - 1)));
    const gr = grupo ? grupo(i, k) : 0; if (gr < 0) continue;
    const a = i * R.cols + c, cc = a + R.cols;
    // Each cell is split along its shorter diagonal: at the canopy's ends the frame edge moves a whole
    // column from one row to the next, and the cells there are sheared so much that the other diagonal
    // folds them inside out. And each triangle faces the way its own vertex normals do: where a band is
    // squeezed to a sliver, a fixed winding is float noise, and a flipped sliver shows the dark
    // inner-skin pass through the white as a dotted line.
    const tris: [number, number, number][] = dist2(R.pos, a + 1, cc) <= dist2(R.pos, a, cc + 1) ? [[a, a + 1, cc], [a + 1, cc + 1, cc]] : [[a, a + 1, cc + 1], [a, cc + 1, cc]];
    for (const [u, v, w] of tris) { if (degenerado(R, u, v, w)) continue; if (haciaFuera(R, u, v, w)) grupos[gr].push(u, v, w); else grupos[gr].push(u, w, v); }
  }
  return grupos;
}

function geometria(R: Rejilla, grupos: number[][]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(R.pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(R.nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(R.uv, 2));
  let total = 0; for (const l of grupos) total += l.length;
  const idx = new Uint32Array(total); let k = 0;
  grupos.forEach((l, m) => { idx.set(l, k); if (grupos.length > 1) g.addGroup(k, l.length, m); k += l.length; });
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

/**
 * The body: white, with the navy nose cone, tail cone, belly and canopy frame
 * as bands of the same grid, and the hole for the canopy glass. A last group
 * repeats every triangle with a dark back-face material: the inside of the
 * skin, as seen through the canopy (one mesh, so «Superponer» paints it once).
 */
function carroceria(xs: number[], M: Mats, marcoAparte = false): [THREE.Mesh, THREE.Mesh | null] {
  const R = rejilla(xs, columnasSkin, 'abajo');
  const grupos = caras(R, marcoAparte ? 3 : 2, (i, k) => {
    const xm = (xs[i] + xs[i + 1]) / 2;
    if (k >= K_C && enVidrio(xs[i]) && enVidrio(xs[i + 1])) return -1;
    if (xm > L.X_ARO_MORRO || xm < L.X_ARO_COLA || k < K_D) return 1;
    if (k >= K_F && k < K_C && enMarco(xm)) return marcoAparte ? 2 : 1;
    return 0;
  });
  // Right at the canopy's ends the rows are millimetres apart while the outline's columns move by
  // centimetres from one row to the next: some cells there are tiny walls standing across the skin.
  // Seen from behind, a wall would show the dark inner skin as a dotted line, so walls are painted on
  // both faces and left out of the inner pass. Index order: white, navy, white walls, navy walls.
  const [blanco, azul] = grupos.map(l => separarParedes(R, l));
  const orden = [blanco[0], azul[0], blanco[1], azul[1]];
  const geo = geometria(R, orden);
  geo.clearGroups();
  let k = 0; const inicio = orden.map(l => { const s0 = k; k += l.length; return s0; });
  geo.addGroup(inicio[0], orden[0].length, 0); geo.addGroup(inicio[1], orden[1].length, 1);
  geo.addGroup(0, orden[0].length + orden[1].length, 2);
  geo.addGroup(inicio[2], orden[2].length, 3); geo.addGroup(inicio[3], orden[3].length, 4);
  const m = new THREE.Mesh(geo, [M.chapa, M.marino, M.forro, M.chapaDoble, M.marinoDoble]);
  m.name = 'carroceria';
  if (!marcoAparte) return [m, null];
  // the canopy's navy frame, on its own (it opens with the glass): surface, inner pass, walls
  const [sup, par] = separarParedes(R, grupos[2]);
  const gm = geometria(R, [sup, par]);
  gm.clearGroups(); gm.addGroup(0, sup.length, 0); gm.addGroup(0, sup.length + par.length, 1); gm.addGroup(sup.length, par.length, 2);
  const marco = new THREE.Mesh(gm, [M.marino, M.forro, M.marinoDoble]); marco.name = 'marco-cupula';
  return [m, marco];
}
/** Splits a triangle list into [surface, walls]: a wall's face is more than 40° off the skin's normal there. */
function separarParedes(R: Rejilla, l: number[]): [number[], number[]] {
  const sup: number[] = [], par: number[] = [], P = R.pos, N = R.nor, cos40 = Math.cos(40 * Math.PI / 180);
  for (let k = 0; k < l.length; k += 3) {
    const u = l[k], v = l[k + 1], w = l[k + 2];
    const ax = P[v * 3] - P[u * 3], ay = P[v * 3 + 1] - P[u * 3 + 1], az = P[v * 3 + 2] - P[u * 3 + 2];
    const bx = P[w * 3] - P[u * 3], by = P[w * 3 + 1] - P[u * 3 + 1], bz = P[w * 3 + 2] - P[u * 3 + 2];
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, ln = Math.hypot(nx, ny, nz);
    const mx = N[u * 3] + N[v * 3] + N[w * 3], my = N[u * 3 + 1] + N[v * 3 + 1] + N[w * 3 + 1], mz = N[u * 3 + 2] + N[v * 3 + 2] + N[w * 3 + 2], lm = Math.hypot(mx, my, mz);
    ((nx * mx + ny * my + nz * mz) / (ln * lm || 1) < cos40 ? par : sup).push(u, v, w);
  }
  return [sup, par];
}

/**
 * The canopy glass: the skin's own rows, columns from the glass edge over the
 * top to the other edge, filling the hole cut along the same outline (no lift,
 * no overlap). The black frit is drawn by the glass shader from each vertex's
 * distance to the outline (the grid's border), so its inner edge is a crisp curve.
 */
function cupula(xsPiel: number[], M: Mats): THREE.Group {
  const xs = xsPiel.filter(x => enVidrio(x));
  const n = N_TRAMO[3];
  const R = rejilla(xs, s => { const a = bandas(s)[2]; const o: number[] = []; for (let k = 0; k <= n; k++) o.push(a + (1 - a) * k / n); return o; }, 'arriba');
  const grupos = caras(R);
  const P = R.pos, C = R.cols, F = R.filas, seg: [number, number][] = [];
  for (let i = 0; i < F - 1; i++) seg.push([i * C, (i + 1) * C], [i * C + C - 1, (i + 1) * C + C - 1]);
  for (let c = 0; c < C - 1; c++) seg.push([c, c + 1], [(F - 1) * C + c, (F - 1) * C + c + 1]);
  const dist = new Float32Array(P.length / 3), FRIT = 0.03;
  for (let v = 0; v < P.length / 3; v++) {
    const px = P[v * 3], py = P[v * 3 + 1], pz = P[v * 3 + 2]; let d = Infinity;
    for (const [a, b] of seg) {
      const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2], ux = P[b * 3] - ax, uy = P[b * 3 + 1] - ay, uz = P[b * 3 + 2] - az;
      if (Math.abs(px - ax) > 0.25 && Math.abs(px - ax - ux) > 0.25) continue; // far along x: cannot be the nearest
      const l2 = ux * ux + uy * uy + uz * uz, u = l2 > 1e-14 ? Math.max(0, Math.min(1, ((px - ax) * ux + (py - ay) * uy + (pz - az) * uz) / l2)) : 0;
      const dd = (px - ax - u * ux) ** 2 + (py - ay - u * uy) ** 2 + (pz - az - u * uz) ** 2; if (dd < d) d = dd;
    }
    dist[v] = Math.sqrt(d) - FRIT;
  }
  const g = new THREE.Group(); g.name = 'cupula';
  const geo = geometria(R, grupos);
  geo.setAttribute('borde', new THREE.BufferAttribute(dist, 1));
  const tinte = new THREE.Mesh(geo, M.tinte); tinte.renderOrder = 2; tinte.customDepthMaterial = sinSombra; tinte.name = 'cristal';
  const reflejo = new THREE.Mesh(geo, M.reflejo); reflejo.renderOrder = 3; reflejo.customDepthMaterial = sinSombra; reflejo.name = 'cristal-reflejo';
  g.add(tinte, reflejo);
  return g;
}

// ------------------------------------------------------------ patches on (x, t)
/** Outward normal of the skin at (x, t) on the right side. */
function normalXT(x: number, t: number): THREE.Vector3 {
  const e = 0.002, s = F.sec(x), sa = F.sec(x + e), sb = F.sec(x - e);
  const pa = punto(sa, t), pb = punto(sb, t), q1 = punto(s, Math.min(1, t + e)), q0 = punto(s, Math.max(0, t - e));
  const X = new THREE.Vector3(2 * e, pa[1] - pb[1], pa[0] - pb[0]), T = new THREE.Vector3(0, q1[1] - q0[1], q1[0] - q0[0]);
  const n = new THREE.Vector3().crossVectors(X, T).normalize();
  const [z, y] = punto(s, t);
  if (n.y * (y - 0.6) + n.z * z < 0 && Math.abs(n.x) < 0.9) n.negate();
  return n;
}
/**
 * A patch on the skin: rows from x0 to x1, each covering t in `rango(s)` on
 * one side ('lado', z > 0) or from that range over the top to its mirror
 * ('arriba'), lifted `sep` along the surface normal. UV u is the arc length
 * across the rows (m), for the LED textures.
 */
function parcheXT(x0: number, x1: number, nx: number, rango: (s: Sec) => [number, number], n: number, sep: number, orden: 'lado' | 'arriba'): THREE.BufferGeometry {
  const xs: number[] = []; for (let i = 0; i <= nx; i++) xs.push(x0 + (x1 - x0) * i / nx);
  const R = rejilla(xs, s => { const [a, b] = rango(s); const o: number[] = []; for (let k = 0; k <= n; k++) o.push(a + (b - a) * k / n); return o; }, orden);
  for (let v = 0; v < R.pos.length / 3; v++) for (let j = 0; j < 3; j++) R.pos[v * 3 + j] += R.nor[v * 3 + j] * sep;
  for (let i = 0; i < R.filas; i++) {
    let s = 0;
    for (let c = 0; c < R.cols; c++) {
      const o = (i * R.cols + c) * 3;
      if (c > 0) s += Math.hypot(R.pos[o] - R.pos[o - 3], R.pos[o + 1] - R.pos[o - 2], R.pos[o + 2] - R.pos[o - 1]);
      R.uv[(i * R.cols + c) * 2] = s * 4; R.uv[(i * R.cols + c) * 2 + 1] = i / Math.max(1, R.filas - 1);
    }
  }
  const geo = geometria(R, caras(R));
  return geo;
}
/** A closed ribbon of width w through points on the skin (with their normals), lifted `sep`. */
function cinta3D(pts: THREE.Vector3[], nors: THREE.Vector3[], w: number, sep: number, cerrada: boolean): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [], L = pts.length;
  const T = new THREE.Vector3(), B = new THREE.Vector3();
  for (let i = 0; i < L; i++) {
    const a = pts[cerrada ? (i - 1 + L) % L : Math.max(0, i - 1)], b = pts[cerrada ? (i + 1) % L : Math.min(L - 1, i + 1)];
    T.subVectors(b, a).normalize(); B.crossVectors(nors[i], T).normalize().multiplyScalar(w / 2);
    const p = pts[i].clone().addScaledVector(nors[i], sep);
    pos.push(p.x + B.x, p.y + B.y, p.z + B.z, p.x - B.x, p.y - B.y, p.z - B.z);
  }
  const segs = cerrada ? L : L - 1;
  for (let i = 0; i < segs; i++) { const a = 2 * i, b = 2 * ((i + 1) % L); idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ======================================================================= decals
interface Malla2D { p: P2[]; t: number[]; uv?: P2[] }
function poligono(c: P2[]): Malla2D {
  const tris = THREE.ShapeUtils.triangulateShape(c.map(q => new THREE.Vector2(q[0], q[1])), []);
  return { p: c.map(q => [q[0], q[1]] as P2), t: tris.flat() };
}
/** Red-green refinement: splits only the edges longer than maxLado (shared midpoints, no cracks). */
function subdividir(m: Malla2D, maxLado: number): Malla2D {
  const p = m.p.slice(), uv = m.uv ? m.uv.slice() : undefined; let t = m.t.slice();
  const largo = (a: number, b: number) => Math.hypot(p[a][0] - p[b][0], p[a][1] - p[b][1]);
  for (let it = 0; it < 12; it++) {
    const cache = new Map<string, number>(); const nt: number[] = []; let cambio = false;
    const mid = (a: number, b: number) => {
      if (largo(a, b) <= maxLado) return -1;
      const k = a < b ? a + ',' + b : b + ',' + a; let r = cache.get(k);
      if (r === undefined) {
        r = p.length; p.push([(p[a][0] + p[b][0]) / 2, (p[a][1] + p[b][1]) / 2]);
        if (uv) uv.push([(uv[a][0] + uv[b][0]) / 2, (uv[a][1] + uv[b][1]) / 2]);
        cache.set(k, r);
      }
      return r;
    };
    for (let i = 0; i < t.length; i += 3) {
      const v = [t[i], t[i + 1], t[i + 2]];
      const ms = [mid(v[0], v[1]), mid(v[1], v[2]), mid(v[2], v[0])];
      const n = ms.filter(x => x >= 0).length;
      if (n === 0) { nt.push(v[0], v[1], v[2]); continue; }
      cambio = true;
      if (n === 3) { nt.push(v[0], ms[0], ms[2], ms[0], v[1], ms[1], ms[2], ms[1], v[2], ms[0], ms[1], ms[2]); continue; }
      let r = 0; while (ms[r] < 0) r++;
      const a = v[r], b = v[(r + 1) % 3], c = v[(r + 2) % 3];
      const mab = ms[r], mbc = ms[(r + 1) % 3], mca = ms[(r + 2) % 3];
      if (n === 1) nt.push(a, mab, c, mab, b, c);
      else if (mbc >= 0) nt.push(a, mab, c, mab, mbc, c, mab, b, mbc);
      else nt.push(a, mab, mca, mab, b, c, mab, c, mca);
    }
    t = nt;
    if (!cambio) break;
  }
  return { p, t, uv };
}
/** A strip of width w along a polyline (resampled every `paso`); uv u runs along it (metres), v across. */
function cinta(pts: P2[], w: number, paso = 0.01): Malla2D {
  const q: P2[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]]; const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / paso));
    for (let k = 0; k < n; k++) q.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  q.push(pts[pts.length - 1]);
  const p: P2[] = [], t: number[] = [], uv: P2[] = [];
  let s = 0;
  for (let i = 0; i < q.length; i++) {
    if (i > 0) s += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
    const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l * w / 2, ny = dx / l * w / 2;
    p.push([q[i][0] + nx, q[i][1] + ny], [q[i][0] - nx, q[i][1] - ny]); uv.push([s, 1], [s, 0]);
    if (i > 0) { const k = 2 * i; t.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  return { p, t, uv };
}
/** Rounds the corners of a polyline (Chaikin). */
function suave(c: P2[], veces = 2, cerrado = true): P2[] {
  let r = c;
  for (let v = 0; v < veces; v++) {
    const n: P2[] = []; const L = r.length;
    if (!cerrado) n.push(r[0]);
    for (let i = 0; i < (cerrado ? L : L - 1); i++) {
      const a = r[i], b = r[(i + 1) % L];
      n.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!cerrado) n.push(r[L - 1]);
    r = n;
  }
  return r;
}
/** Rounded rectangle outline (centre, half sizes, corner radius). */
function rectRedondo(cx: number, cy: number, hx: number, hy: number, r: number, n = 5): P2[] {
  const out: P2[] = [];
  const esq: [number, number, number][] = [[cx + hx - r, cy + hy - r, 0], [cx - hx + r, cy + hy - r, Math.PI / 2], [cx - hx + r, cy - hy + r, Math.PI], [cx + hx - r, cy - hy + r, 1.5 * Math.PI]];
  for (const [x, y, a0] of esq) for (let k = 0; k <= n; k++) { const a = a0 + (Math.PI / 2) * k / n; out.push([x + r * Math.cos(a), y + r * Math.sin(a)]); }
  return out;
}
const cerrar = (c: P2[]): P2[] => [...c, c[0]];

type Vista = 'lado' | 'arriba' | 'frente' | 'detras';
const FUERA: Record<Vista, THREE.Vector3> = { lado: new THREE.Vector3(0, 0, 1), arriba: new THREE.Vector3(0, 1, 0), frente: new THREE.Vector3(1, 0, 0), detras: new THREE.Vector3(-1, 0, 0) };
/** The skin point a 2D view coordinate lands on: side (x, y), top (x, z), front and rear (z, y). */
function proyectar(v: Vista, a: number, b: number): THREE.Vector3 {
  if (v === 'lado') return new THREE.Vector3(a, b, F.ladoZ(a, b));
  if (v === 'arriba') return new THREE.Vector3(a, F.arribaY(a, b), b);
  if (v === 'frente') return new THREE.Vector3(F.frenteX(a, b), b, a);
  return new THREE.Vector3(F.detrasX(a, b), b, a);
}
function normalEn(v: Vista, a: number, b: number): THREE.Vector3 {
  const e = 0.004, p0 = proyectar(v, a, b), pa = proyectar(v, a + e, b), pb = proyectar(v, a, b + e);
  const n = new THREE.Vector3().crossVectors(pa.sub(p0), pb.sub(p0)).normalize();
  if (n.dot(FUERA[v]) < 0) n.negate();
  return n;
}
/**
 * Projects a 2D mesh onto the skin from one view, lifted `sep` along the
 * skin normal (or `sepDe(a, b)` per vertex, for blister lenses).
 */
function calco(m: Malla2D, vista: Vista, sep: number | ((a: number, b: number) => number), maxLado = 0.02): THREE.BufferGeometry {
  const s = subdividir(m, maxLado), f = FUERA[vista];
  const pos: number[] = [], ok: boolean[] = [], uvs: number[] = [];
  for (let i = 0; i < s.p.length; i++) {
    const [a, b] = s.p[i];
    const v = proyectar(vista, a, b), bueno = Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z); ok.push(bueno);
    const d = typeof sep === 'number' ? sep : sep(a, b);
    if (bueno) { const n = normalEn(vista, a, b); v.addScaledVector(Number.isFinite(n.x) ? n : f, d); }
    pos.push(bueno ? v.x : 0, bueno ? v.y : 0, bueno ? v.z : 0);
    if (s.uv) uvs.push(s.uv[i][0], s.uv[i][1]);
  }
  const idx: number[] = [];
  for (let i = 0; i < s.t.length; i += 3) if (ok[s.t[i]] && ok[s.t[i + 1]] && ok[s.t[i + 2]]) idx.push(s.t[i], s.t[i + 1], s.t[i + 2]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (s.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  if (idx.length) {
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(); let sum = 0;
    for (let i = 0; i < idx.length; i += 3) { A.fromArray(pos, idx[i] * 3); B.fromArray(pos, idx[i + 1] * 3); C.fromArray(pos, idx[i + 2] * 3); sum += B.sub(A).cross(C.sub(A)).dot(f); }
    if (sum < 0) for (let i = 0; i < idx.length; i += 3) { const k = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = k; }
  }
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** Distance from (a, b) to a closed outline, for blister lenses that meet the skin at their edge. */
function distBorde(c: P2[], a: number, b: number): number {
  let d = Infinity;
  for (let i = 0; i < c.length; i++) {
    const [x0, y0] = c[i], [x1, y1] = c[(i + 1) % c.length];
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((a - x0) * dx + (b - y0) * dy) / l2));
    d = Math.min(d, Math.hypot(a - x0 - u * dx, b - y0 - u * dy));
  }
  return d;
}

// ===================================================================== assembly
/** How to build one Bala (the garage's needs none of these: it is the reference shape, shared materials, everything). */
export interface OpcionesBala {
  /** Where the riders sit (balaPiezas.ts `ASIENTO` by default). */
  asientos?: Asientos;
  /** Height of the fin's tip above the road (1.00 m by default). */
  aleta?: number;
  /** Materials: the editor passes its own set (`crearMateriales()`), so «Rayos X» and «Corte» never reach the garage's. */
  M?: Mats;
  /**
   * 'rapida' while a slider is being dragged: half the rows along the body and
   * no small details (lamps, ducts, stripe, cameras, interior trim). The
   * shape, the canopy, the wheels and the pods are all there.
   */
  calidad?: 'completa' | 'rapida';
  /** The canopy (its navy frame and its glass) in groups of its own, hinged at its front end, so the editor can open it. */
  cupulaAparte?: boolean;
  /**
   * The Triciclo Bala (2026-11-10): the same body, three wheels (`ruedas`), its own
   * cockpit (`cabina`) and, if asked, a spat round the bottom of the rear wheel.
   */
  triciclo?: CabinaTriciclo & { faldon: { x0: number; x1: number; y0: number; hz: number } | null };
}
/** The pivots of the opening canopy: one for its frame (body layer) and one for its glass (glass layer). */
export const PIVOTES_CUPULA = ['cupula-marco', 'cupula-cristal'] as const;
/** The canopy opens this much about its front hinge (negative: the rear rises). */
export const ANGULO_CUPULA = -48;

let PLANTILLA: { forma: FormaBala; g: THREE.Group } | null = null;
const L_REF = L;
/**
 * The garage's Bala: built once per page (from `forma` and its seats and fin) into a template, and every call
 * hands out a copy of its geometries (the viewer disposes those). Shared materials.
 */
export function construir(forma: FormaBala = FORMA_REF, o: Pick<OpcionesBala, 'asientos' | 'aleta'> = {}): THREE.Group {
  if (PLANTILLA?.forma !== forma) PLANTILLA = { forma, g: construirCon(forma, o) };
  const M = mats(), g = PLANTILLA.g.clone(true), copias = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  g.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    let c = copias.get(m.geometry); if (!c) { c = m.geometry.clone(); copias.set(m.geometry, c); }
    m.geometry = c;
    if (m.material === M.tinte || m.material === M.reflejo || m.material === M.lente) m.customDepthMaterial = sinSombra;
  });
  return g;
}

/** A Bala of any shape. The garage clones one built from the reference shape; the editor builds its own on every change. */
export function construirCon(forma: FormaBala, o: OpcionesBala = {}): THREE.Group {
  F = forma; L = forma === FORMA_REF ? L_REF : disponer(forma);
  try { return armar(o); } finally { F = FORMA_REF; L = L_REF; }
}

function armar(o: OpcionesBala): THREE.Group {
  const M = o.M ?? mats(), rapida = o.calidad === 'rapida';
  const g = new THREE.Group(); g.name = 'bala';
  const add = <T extends THREE.Object3D>(o: T) => { g.add(o); return o; };
  /** The object and its mirror on the left side (the mirror is in the object's scale, so its faces still look out). */
  const par = (o: THREE.Object3D) => { add(o); const c = o.clone(); c.scale.z = -o.scale.z; c.position.z = -o.position.z; add(c); return o; };
  const SEP = 0.0012;
  // details drawn on the reference shape: x through the shape's map, heights with the belly (half of it on the nose)
  const nx = F.X, yN = (y: number) => y + F.dSuelo * 0.5, yC = (y: number) => y + F.dSuelo * 0.6;
  const mapa = (pts: P2[], y: (v: number) => number): P2[] => pts.map(([a, b]) => [nx(a), y(b)]);

  // ---------------------------------------------------------------- skin and canopy
  const xs = filasX(rapida ? 2 : 1);
  const [cuerpo, marco] = carroceria(xs, M, !!o.cupulaAparte);
  add(cuerpo);
  const vidrio = cupula(xs, M);
  if (o.cupulaAparte && marco) {
    // hinged at the front end of the frame, on the top line; the shut line stays with the body
    const bisagra = new THREE.Vector3(L.XF0, techoEn(F, L.XF0), 0);
    for (const [nombre, pieza] of [[PIVOTES_CUPULA[0], marco], [PIVOTES_CUPULA[1], vidrio]] as const) {
      const piv = new THREE.Group(); piv.name = nombre; piv.position.copy(bisagra);
      pieza.position.sub(bisagra); piv.add(pieza); add(piv);
    }
  } else add(vidrio);

  // canopy shut line: round the outer edge of the navy frame (the canopy and its
  // frame lift as one piece, hinged at the front)
  {
    const der: THREE.Vector3[] = [], nd: THREE.Vector3[] = [];
    for (const x of xs) {
      if (!enMarco(x)) continue;
      const s = F.sec(x), t = bandas(s)[1], [z, y] = punto(s, t);
      der.push(new THREE.Vector3(x, y, z)); nd.push(normalXT(x, Math.min(t, 0.995)));
    }
    const izq = der.slice(1, -1).reverse().map(p => new THREE.Vector3(p.x, p.y, -p.z)), ni = nd.slice(1, -1).reverse().map(n => new THREE.Vector3(n.x, n.y, -n.z));
    // at the two tips the line runs across the centre line: the normal there is the skin's at the top
    for (const k of [0, der.length - 1]) nd[k] = normalXT(der[k].x, 1);
    add(malla(cinta3D([...der, ...izq], [...nd, ...ni], 0.0042, 0.0012, true), M.junta, 'junta-cupula', false));
  }

  if (!rapida) {
    // ---------------------------------------------------------------- livery
    // red pinstripe, 8 mm wide and 1 cm above the navy waterline, nose ring to tail ring (it carries on across the pods)
    {
      const geo = parcheXT(L.X_ARO_MORRO - 0.012, L.X_ARO_COLA + 0.012, 320, s => [tAbajo(s, L.Y_FLOTACION(s.x) + 0.011), tAbajo(s, L.Y_FLOTACION(s.x) + 0.019)], 2, 0.0006, 'lado');
      par(malla(geo, M.rojo, 'filete', false));
    }

    // ---------------------------------------------------------------- nose
    // LED light band across the nose on the joint of the navy cone: black housing, LED strip
    {
      const tBase = (s: Sec): [number, number] => [tAbajo(s, L.Y_FLOTACION(L.X_ARO_MORRO) - 0.005), 1];
      add(malla(parcheXT(L.X_ARO_MORRO + 0.012, L.X_ARO_MORRO - 0.012, 6, tBase, 26, 0.0008, 'arriba'), M.negroBrillo, 'faro', false));
      add(malla(parcheXT(L.X_ARO_MORRO + 0.0065, L.X_ARO_MORRO - 0.0065, 4, s => [tAbajo(s, L.Y_FLOTACION(L.X_ARO_MORRO) + 0.004), 1], 26, 0.0016, 'arriba'), M.ledTira, 'faro-led', false));
    }
    // two slim headlamps on the flanks of the nose cone: dark lens, LED line and cells, clear cover
    {
      const lado = new THREE.Group(); lado.name = 'faro';
      const lente: P2[] = suave(mapa([[0.535, 0.345], [0.50, 0.358], [0.44, 0.371], [0.38, 0.379], [0.345, 0.378], [0.335, 0.368], [0.36, 0.358], [0.43, 0.350], [0.50, 0.342]], yN), 2);
      lado.add(malla(calco(poligono(lente), 'lado', 0.0008, 0.012), M.negroBrillo, 'faro', false));
      lado.add(malla(calco(cinta(suave(mapa([[0.515, 0.351], [0.46, 0.362], [0.40, 0.370], [0.355, 0.371]], yN), 2, false), 0.005, 0.005), 'lado', 0.0016, 0.006), M.ledTira, 'faro-led', false));
      for (let k = 0; k < 3; k++) {
        const x = nx(0.385 + k * 0.035), y = yN(0.3635 - k * 0.0045);
        lado.add(malla(calco(poligono(rectRedondo(x, y, 0.012, 0.0045, 0.003, 2)), 'lado', 0.0018, 0.005), M.led, 'faro-led', false));
      }
      lado.add(malla(calco(poligono(lente), 'lado', (a, b) => 0.0012 + 0.003 * Math.min(1, distBorde(lente, a, b) / 0.008), 0.01), M.lente, 'lente-faro', false));
      par(lado);
    }
    // chin intake under the nose tip, and two small NACA ducts on the nose flanks (brakes and cabin air)
    add(malla(calco(poligono(suave(rectRedondo(0, yN(0.262), 0.07, 0.012, 0.01, 3), 1)), 'frente', 0.001, 0.01), M.negroMate, 'toma'));
    // NACA submerged inlet: a ramp whose walls flare out towards the back (ogee planform), ending in a rounded lip
    const naca = (x0: number, x1: number, y: number, h: number): P2[] => {
      const arriba: P2[] = [], abajo: P2[] = [];
      for (let k = 0; k <= 16; k++) { const u = k / 16, x = x0 + (x1 - x0) * u, w = h * (0.10 + 0.90 * u * u * (3 - 2 * u) * (0.6 + 0.4 * u)) / 2; arriba.push([x, y + w]); abajo.push([x, y - w]); }
      // the back: a shallow arc between the two walls
      const fin: P2[] = []; for (let k = 1; k < 8; k++) { const a = Math.PI * k / 8; fin.push([x1 - (x1 - x0) * 0.04 * Math.sin(a) * Math.sign(x0 - x1), y + (h / 2) * Math.cos(a)]); }
      return [...arriba, ...fin, ...abajo.reverse()];
    };
    {
      const n = naca(nx(0.17), nx(0.07), yN(0.29), 0.034);
      par(malla(calco(poligono(n), 'lado', 0.0008, 0.016), M.negroMate, 'naca', false));
      // battery cooling, on the rear flanks: the duct and its lip, a fine dark grey arc at the back
      const nr = naca(nx(-1.93), nx(-2.12), yC(0.585), 0.06);
      par(malla(calco(poligono(nr), 'lado', 0.0008, 0.02), M.negroMate, 'naca', false));
      const labio: P2[] = []; for (let k = 0; k <= 12; k++) { const a = Math.PI * k / 12; labio.push([nx(-2.12) - 0.008 * Math.sin(a) - 0.004, yC(0.585) + 0.031 * Math.cos(a)]); }
      par(malla(calco(cinta(labio, 0.005, 0.004), 'lado', 0.0016, 0.006), M.grisOscuro, 'naca-labio', false));
    }

    // ---------------------------------------------------------------- tail
    // rear light ring round the tail cone, on the joint of the navy cone (not across the belly)
    {
      const rango = (s: Sec): [number, number] => [0.12, 1];
      add(malla(parcheXT(L.X_ARO_COLA + 0.003, L.X_ARO_COLA - 0.03, 6, rango, 40, 0.0008, 'arriba'), M.negroBrillo, 'piloto', false));
      add(malla(parcheXT(L.X_ARO_COLA - 0.004, L.X_ARO_COLA - 0.023, 4, rango, 40, 0.0016, 'arriba'), M.rojoLed, 'piloto-led', false));
    }
    // charging flap on the right rear flank (+z is the right)
    add(malla(calco(cinta(cerrar(suave(rectRedondo(nx(-2.30), yC(0.66), 0.045, 0.034, 0.014, 3), 1)), 0.0035, 0.005), 'lado', SEP, 0.01), M.junta, 'junta-tapa', false));

    // ---------------------------------------------------------------- cameras instead of mirrors
    par(camara(F, M, nx(-0.40), yC(0.762)));
  }

  // ---------------------------------------------------------------- parts
  add(carenados(F, M));
  add(ruedas(F, M, !!o.triciclo));
  add(aleta(F, M, o.aleta));
  add(cabina(F, M, o.asientos ?? ASIENTO, o.triciclo));
  // the Triciclo's rear-wheel spat: a narrow navy keel under the tail, from inside the belly down to `y0`, round the wheel
  const fd = o.triciclo?.faldon;
  if (fd) {
    const yt = F.D.suelo + 0.03, n = 9, est = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = fd.x0 + (fd.x1 - fd.x0) * u, cierre = Math.sin(Math.PI * Math.min(1, Math.max(0.02, u)));
      est.push(E(x, fd.y0 + (yt - fd.y0) * (1 - Math.pow(cierre, 0.35)), yt, fd.hz * Math.pow(cierre, 0.5), fd.hz * Math.pow(cierre, 0.5), fd.hz * Math.pow(cierre, 0.5), 3.5));
    }
    const geo = loft(est, { N: 24, sub: 3 }); add(malla(geo, M.marino, 'faldon'));
  }

  g.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    m.receiveShadow = true;
    if (m.material === M.lente || m.material === M.tinte || m.material === M.reflejo) { m.customDepthMaterial = sinSombra; m.castShadow = false; }
  });
  return g;
}
/** A new set of the Bala's materials (re-exported for the editor). */
export { crearMateriales };
