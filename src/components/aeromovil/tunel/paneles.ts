/**
 * 3D panel method (potential flow) for the wind tunnel.
 *
 * Constant-strength source panels on flat quadrilaterals (Hess & Smith, 1967), a
 * Neumann condition (no flow through the surface) at each panel's centroid, and
 * two mirror planes:
 *  - z = 0, the car's plane of symmetry: only the z ≥ 0 half is meshed and
 *    solved, the other half is its mirror image (half the unknowns);
 *  - y = 0, the road: the body and its mirror image under the road give a flow
 *    that cannot cross the ground (the classic "image" model of ground effect;
 *    it does not model the moving ground's boundary layer).
 *
 * Units: lengths in metres, velocities as a fraction of the free stream. The air
 * comes from +x and goes to −x (the car drives towards +x), so U∞ = (−1, 0, 0).
 * Cp = 1 − |V|².
 *
 * This is potential flow: no viscosity, no separation and no wake. Those come
 * from `capaLimite.ts` and `arrastre.ts`, which read this solution.
 */

export interface Malla {
  /** Panels along the body (nose to tail) and around the half section (bottom to top through +z). */
  nI: number; nJ: number;
  /** Nodes, (nI+1)·(nJ+1)·3, index (i·(nJ+1) + j)·3. */
  nodos: Float64Array;
  /** Number of panels (= nI·nJ), index p = i·nJ + j. */
  n: number;
  /** Collocation point (area centroid) of each panel, 3·n. */
  c: Float64Array;
  /** Outward unit normal, 3·n. */
  nor: Float64Array;
  area: Float64Array;
  /** The four corners projected onto the panel's plane, 12·n, counter-clockwise seen from outside. */
  vert: Float64Array;
  /** Panel size (longest diagonal), for the near/far test. */
  diag: Float64Array;
}

export interface OpcionesFlujo { suelo: boolean }

const PI4 = 4 * Math.PI;

/** Builds the panels of a structured half surface from its nodes. `fuera` says whether the order must be flipped to point the normals out. */
export function mallaDeNodos(nI: number, nJ: number, nodos: Float64Array, fuera: (c: number[], n: number[]) => boolean): Malla {
  const n = nI * nJ;
  const c = new Float64Array(3 * n), nor = new Float64Array(3 * n), area = new Float64Array(n), vert = new Float64Array(12 * n), diag = new Float64Array(n);
  const P = (i: number, j: number) => (i * (nJ + 1) + j) * 3;
  // One orientation for the whole mesh, decided on a panel in the middle of the body.
  let invertir = false;
  {
    const i = Math.floor(nI / 2), j = Math.floor(nJ / 2);
    const q = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
    const d1 = [0, 1, 2].map(k => nodos[q[2] + k] - nodos[q[0] + k]), d2 = [0, 1, 2].map(k => nodos[q[3] + k] - nodos[q[1] + k]);
    const nn = [d1[1] * d2[2] - d1[2] * d2[1], d1[2] * d2[0] - d1[0] * d2[2], d1[0] * d2[1] - d1[1] * d2[0]];
    const cc = [0, 1, 2].map(k => (nodos[q[0] + k] + nodos[q[1] + k] + nodos[q[2] + k] + nodos[q[3] + k]) / 4);
    invertir = !fuera(cc, nn);
  }
  for (let i = 0; i < nI; i++) for (let j = 0; j < nJ; j++) {
    const p = i * nJ + j;
    const q = invertir ? [P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j)] : [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
    const v = q.map(o => [nodos[o], nodos[o + 1], nodos[o + 2]]);
    const d1 = [v[2][0] - v[0][0], v[2][1] - v[0][1], v[2][2] - v[0][2]], d2 = [v[3][0] - v[1][0], v[3][1] - v[1][1], v[3][2] - v[1][2]];
    let nx = d1[1] * d2[2] - d1[2] * d2[1], ny = d1[2] * d2[0] - d1[0] * d2[2], nz = d1[0] * d2[1] - d1[1] * d2[0];
    const nl = Math.hypot(nx, ny, nz) || 1e-30;
    nx /= nl; ny /= nl; nz /= nl;
    const m = [0, 1, 2].map(k => (v[0][k] + v[1][k] + v[2][k] + v[3][k]) / 4);
    // corners projected onto the plane through the mean point
    for (let k = 0; k < 4; k++) {
      const t = (v[k][0] - m[0]) * nx + (v[k][1] - m[1]) * ny + (v[k][2] - m[2]) * nz;
      vert[p * 12 + k * 3] = v[k][0] - t * nx; vert[p * 12 + k * 3 + 1] = v[k][1] - t * ny; vert[p * 12 + k * 3 + 2] = v[k][2] - t * nz;
    }
    // area centroid from the two triangles (0,1,2) and (0,2,3): right for the triangles at the tips too
    let A = 0, cx = 0, cy = 0, cz = 0;
    for (const [a, b, d] of [[0, 1, 2], [0, 2, 3]]) {
      const o = p * 12;
      const ax = vert[o + a * 3], ay = vert[o + a * 3 + 1], az = vert[o + a * 3 + 2];
      const ux = vert[o + b * 3] - ax, uy = vert[o + b * 3 + 1] - ay, uz = vert[o + b * 3 + 2] - az;
      const wx = vert[o + d * 3] - ax, wy = vert[o + d * 3 + 1] - ay, wz = vert[o + d * 3 + 2] - az;
      const t = 0.5 * Math.hypot(uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx);
      A += t; cx += t * (ax + (ux + wx) / 3); cy += t * (ay + (uy + wy) / 3); cz += t * (az + (uz + wz) / 3);
    }
    area[p] = A;
    if (A > 0) { c[3 * p] = cx / A; c[3 * p + 1] = cy / A; c[3 * p + 2] = cz / A; } else { c[3 * p] = m[0]; c[3 * p + 1] = m[1]; c[3 * p + 2] = m[2]; }
    nor[3 * p] = nx; nor[3 * p + 1] = ny; nor[3 * p + 2] = nz;
    diag[p] = Math.max(Math.hypot(d1[0], d1[1], d1[2]), Math.hypot(d2[0], d2[1], d2[2]));
  }
  return { nI, nJ, nodos, n, c, nor, area, vert, diag };
}

/**
 * Velocity induced at (px, py, pz) by panel p with unit source strength, added to `out`·s.
 * Exact for a flat polygon: in-plane part from the edge logarithms, normal part from the solid angle.
 * `propio`: the point is the panel's own centroid (normal part = ½).
 */
function sumarExacto(M: Malla, p: number, px: number, py: number, pz: number, s: number, out: Float64Array, propio: boolean) {
  const V = M.vert, o = p * 12, nx = M.nor[3 * p], ny = M.nor[3 * p + 1], nz = M.nor[3 * p + 2];
  let vx = 0, vy = 0, vz = 0;
  for (let k = 0; k < 4; k++) {
    const a = o + k * 3, b = o + ((k + 1) & 3) * 3;
    const ex = V[b] - V[a], ey = V[b + 1] - V[a + 1], ez = V[b + 2] - V[a + 2];
    const d = Math.sqrt(ex * ex + ey * ey + ez * ez);
    if (d < 1e-12) continue;
    const ra = Math.hypot(px - V[a], py - V[a + 1], pz - V[a + 2]), rb = Math.hypot(px - V[b], py - V[b + 1], pz - V[b + 2]);
    const den = ra + rb - d;
    if (den < 1e-12 * d) continue; // on the edge itself: the log diverges, skip (never at a centroid)
    const L = Math.log((ra + rb + d) / den) / d;
    // outward in-plane normal of the edge: e × n
    vx += (ey * nz - ez * ny) * L; vy += (ez * nx - ex * nz) * L; vz += (ex * ny - ey * nx) * L;
  }
  let om: number;
  if (propio) om = 2 * Math.PI;
  else {
    om = 0;
    // solid angle of triangles (0,1,2) and (0,2,3) (Van Oosterom & Strackee, 1983)
    for (let t = 0; t < 2; t++) {
      const a = o, b = o + (t + 1) * 3, cc = o + (t + 2) * 3;
      const x1 = V[a] - px, y1 = V[a + 1] - py, z1 = V[a + 2] - pz;
      const x2 = V[b] - px, y2 = V[b + 1] - py, z2 = V[b + 2] - pz;
      const x3 = V[cc] - px, y3 = V[cc + 1] - py, z3 = V[cc + 2] - pz;
      const r1 = Math.sqrt(x1 * x1 + y1 * y1 + z1 * z1), r2 = Math.sqrt(x2 * x2 + y2 * y2 + z2 * z2), r3 = Math.sqrt(x3 * x3 + y3 * y3 + z3 * z3);
      const tri = x1 * (y2 * z3 - z2 * y3) + y1 * (z2 * x3 - x2 * z3) + z1 * (x2 * y3 - y2 * x3);
      const den = r1 * r2 * r3 + (x1 * x2 + y1 * y2 + z1 * z2) * r3 + (x1 * x3 + y1 * y3 + z1 * z3) * r2 + (x2 * x3 + y2 * y3 + z2 * z3) * r1;
      om -= 2 * Math.atan2(tri, den);
    }
  }
  vx += nx * om; vy += ny * om; vz += nz * om;
  const f = s / PI4;
  out[0] += vx * f; out[1] += vy * f; out[2] += vz * f;
}

/** Near/far threshold, in panel sizes: beyond it a panel is a point source (error below ~1 %). */
const LEJOS = 3.5;

function sumarPanel(M: Malla, p: number, px: number, py: number, pz: number, s: number, out: Float64Array, propio: boolean) {
  const dx = px - M.c[3 * p], dy = py - M.c[3 * p + 1], dz = pz - M.c[3 * p + 2];
  const r2 = dx * dx + dy * dy + dz * dz, lim = LEJOS * M.diag[p];
  if (!propio && r2 > lim * lim) {
    const f = s * M.area[p] / (PI4 * r2 * Math.sqrt(r2));
    out[0] += dx * f; out[1] += dy * f; out[2] += dz * f;
  } else sumarExacto(M, p, px, py, pz, s, out, propio);
}

/** Mirror images as sign triples: the body itself, its z-mirror and, with ground, both under-road images. */
export function imagenes(o: OpcionesFlujo): [number, number, number][] {
  return o.suelo ? [[1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1]] : [[1, 1, 1], [1, 1, -1]];
}

export interface Solucion {
  malla: Malla;
  /** Source strength per panel. */
  sigma: Float64Array;
  /** Surface velocity at each centroid (3·n) and Cp. */
  vel: Float64Array;
  cp: Float64Array;
  opciones: OpcionesFlujo;
  /** ms spent building the matrix and solving it. */
  ms: { matriz: number; resolver: number; velocidades: number };
}

/** In-place LU solve with partial pivoting: A (n×n, row-major) x = b. Overwrites A and b; returns x in b. */
function resolverLU(A: Float64Array, b: Float64Array, n: number) {
  for (let k = 0; k < n; k++) {
    let piv = k, mx = Math.abs(A[k * n + k]);
    for (let i = k + 1; i < n; i++) { const v = Math.abs(A[i * n + k]); if (v > mx) { mx = v; piv = i; } }
    if (piv !== k) {
      for (let j = 0; j < n; j++) { const t = A[k * n + j]; A[k * n + j] = A[piv * n + j]; A[piv * n + j] = t; }
      const t = b[k]; b[k] = b[piv]; b[piv] = t;
    }
    const akk = A[k * n + k];
    for (let i = k + 1; i < n; i++) {
      const f = A[i * n + k] / akk;
      if (f === 0) continue;
      A[i * n + k] = f;
      const ri = i * n, rk = k * n;
      for (let j = k + 1; j < n; j++) A[ri + j] -= f * A[rk + j];
      b[i] -= f * b[k];
    }
  }
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < n; j++) s -= A[i * n + j] * b[j];
    b[i] = s / A[i * n + i];
  }
}

/** Solves the source strengths for U∞ = (−1, 0, 0) and the surface velocity and Cp. */
export function resolverFlujo(M: Malla, opciones: OpcionesFlujo): Solucion {
  const n = M.n, IM = imagenes(opciones), t0 = performance.now();
  const A = new Float64Array(n * n), b = new Float64Array(n), tmp = new Float64Array(3);
  for (let i = 0; i < n; i++) {
    const cx = M.c[3 * i], cy = M.c[3 * i + 1], cz = M.c[3 * i + 2], nx = M.nor[3 * i], ny = M.nor[3 * i + 1], nz = M.nor[3 * i + 2];
    b[i] = nx; // −U∞·n with U∞ = (−1, 0, 0)
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (const [sx, sy, sz] of IM) {
        tmp[0] = 0; tmp[1] = 0; tmp[2] = 0;
        sumarPanel(M, j, cx * sx, cy * sy, cz * sz, 1, tmp, i === j && sx === 1 && sy === 1 && sz === 1);
        s += nx * tmp[0] * sx + ny * tmp[1] * sy + nz * tmp[2] * sz;
      }
      A[i * n + j] = s;
    }
  }
  const t1 = performance.now();
  resolverLU(A, b, n);
  const sigma = b, t2 = performance.now();
  const vel = new Float64Array(3 * n), cp = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const cx = M.c[3 * i], cy = M.c[3 * i + 1], cz = M.c[3 * i + 2];
    let vx = -1, vy = 0, vz = 0;
    for (const [sx, sy, sz] of IM) {
      tmp[0] = 0; tmp[1] = 0; tmp[2] = 0;
      for (let j = 0; j < n; j++) sumarPanel(M, j, cx * sx, cy * sy, cz * sz, sigma[j], tmp, i === j && sx === 1 && sy === 1 && sz === 1);
      vx += tmp[0] * sx; vy += tmp[1] * sy; vz += tmp[2] * sz;
    }
    // keep only the tangential part (the normal part is ~0 by construction)
    const nx = M.nor[3 * i], ny = M.nor[3 * i + 1], nz = M.nor[3 * i + 2], vn = vx * nx + vy * ny + vz * nz;
    vx -= vn * nx; vy -= vn * ny; vz -= vn * nz;
    vel[3 * i] = vx; vel[3 * i + 1] = vy; vel[3 * i + 2] = vz;
    cp[i] = 1 - (vx * vx + vy * vy + vz * vz);
  }
  const t3 = performance.now();
  return { malla: M, sigma, vel, cp, opciones, ms: { matriz: t1 - t0, resolver: t2 - t1, velocidades: t3 - t2 } };
}

// ------------------------------------------------------------ field velocity

interface Grupo { p: number[]; cx: number; cy: number; cz: number; R: number; Q: number; dx: number; dy: number; dz: number }

/**
 * Velocity anywhere in the flow, for the streamlines. Panels are grouped in
 * blocks; a far block acts as one source plus one dipole (its first two
 * multipole moments), a near block panel by panel.
 */
export function campoDeVelocidad(S: Solucion) {
  const M = S.malla, IM = imagenes(S.opciones), grupos: Grupo[] = [];
  const bi = 3, bj = 3;
  for (let i0 = 0; i0 < M.nI; i0 += bi) for (let j0 = 0; j0 < M.nJ; j0 += bj) {
    const p: number[] = [];
    for (let i = i0; i < Math.min(M.nI, i0 + bi); i++) for (let j = j0; j < Math.min(M.nJ, j0 + bj); j++) p.push(i * M.nJ + j);
    let cx = 0, cy = 0, cz = 0;
    for (const k of p) { cx += M.c[3 * k]; cy += M.c[3 * k + 1]; cz += M.c[3 * k + 2]; }
    cx /= p.length; cy /= p.length; cz /= p.length;
    let R = 0, Q = 0, dx = 0, dy = 0, dz = 0;
    for (const k of p) {
      for (let v = 0; v < 4; v++) R = Math.max(R, Math.hypot(M.vert[k * 12 + v * 3] - cx, M.vert[k * 12 + v * 3 + 1] - cy, M.vert[k * 12 + v * 3 + 2] - cz));
      const q = S.sigma[k] * M.area[k];
      Q += q; dx += q * (M.c[3 * k] - cx); dy += q * (M.c[3 * k + 1] - cy); dz += q * (M.c[3 * k + 2] - cz);
    }
    grupos.push({ p, cx, cy, cz, R, Q, dx, dy, dz });
  }
  const tmp = new Float64Array(3);
  /** Velocity at (x, y, z) into out[0..2]. */
  return (x: number, y: number, z: number, out: Float64Array) => {
    let vx = -1, vy = 0, vz = 0;
    for (const [sx, sy, sz] of IM) {
      const px = x * sx, py = y * sy, pz = z * sz;
      tmp[0] = 0; tmp[1] = 0; tmp[2] = 0;
      for (const g of grupos) {
        const rx = px - g.cx, ry = py - g.cy, rz = pz - g.cz, r2 = rx * rx + ry * ry + rz * rz, lim = 2.5 * g.R;
        if (r2 > lim * lim) {
          const r = Math.sqrt(r2), r3 = r2 * r, r5 = r3 * r2, dr = g.dx * rx + g.dy * ry + g.dz * rz;
          const f = 1 / PI4;
          tmp[0] += f * (g.Q * rx / r3 + 3 * dr * rx / r5 - g.dx / r3);
          tmp[1] += f * (g.Q * ry / r3 + 3 * dr * ry / r5 - g.dy / r3);
          tmp[2] += f * (g.Q * rz / r3 + 3 * dr * rz / r5 - g.dz / r3);
        } else for (const k of g.p) sumarPanel(M, k, px, py, pz, S.sigma[k], tmp, false);
      }
      vx += tmp[0] * sx; vy += tmp[1] * sy; vz += tmp[2] * sz;
    }
    out[0] = vx; out[1] = vy; out[2] = vz;
  };
}
