import type { Cuerpo } from './malla';
import type { Solucion } from './paneles';

/**
 * Boundary layer along surface streamlines, to predict where the air leaves the body.
 *
 *  1. Surface streamlines are traced on the panel surface from a ring around the
 *     stagnation point, following the computed surface velocity.
 *  2. Laminar part: Thwaites' method, with the spreading between neighbouring
 *     streamlines (h) in the integral, as Mangler's transformation does for a body
 *     of revolution: θ² = 0.45·ν/(Ue⁶h²)·∫Ue⁵h² ds. Laminar separation when
 *     λ = θ²/ν·dUe/ds < −0.09.
 *  3. Transition: Michel's criterion, Re_θ > 1.174·(1 + 22 400/Re_s)·Re_s^0.46,
 *     or at a laminar separation (it becomes a short bubble and the layer goes on
 *     turbulent: at car Reynolds numbers it does not leave the body there).
 *  4. Turbulent part: Head's entrainment method with the Ludwieg–Tillmann skin
 *     friction. Separation when the shape factor H reaches 2.4.
 *  5. A separation ahead of the largest section is treated as a bubble that
 *     reattaches (the flow ahead re-accelerates); the next one is final.
 *
 * Air: ν = 1.5·10⁻⁵ m²/s (20 °C).
 */

export const NU = 1.5e-5;
export const H_SEPARACION = 2.4;

export interface LineaSuperficie {
  /** Points (3·k), arc length from the stagnation point (m) and edge speed (fraction of U∞). */
  p: number[]; s: number[]; ue: number[];
}

export interface ResultadoCapa {
  /** Index of the point where the pressure starts to rise for good (last speed maximum before separation). */
  iAdverso: number;
  /** Transition, separation (index into the streamline) and whether it reached the tail attached. */
  iTransicion: number; iSeparacion: number; pegada: boolean;
  /** A forebody bubble, if any. */
  iBurbuja: number;
}

/** Bilinear access to the structured surface: positions and velocities at nodes. */
function superficie(C: Cuerpo, S: Solucion) {
  const M = C.malla, nI = M.nI, nJ = M.nJ, W = nJ + 1;
  const vn = new Float64Array((nI + 1) * W * 3), cuenta = new Float64Array((nI + 1) * W);
  for (let i = 0; i < nI; i++) for (let j = 0; j < nJ; j++) {
    const p = i * nJ + j;
    for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const q = (i + di) * W + (j + dj);
      vn[3 * q] += S.vel[3 * p]; vn[3 * q + 1] += S.vel[3 * p + 1]; vn[3 * q + 2] += S.vel[3 * p + 2]; cuenta[q]++;
    }
  }
  for (let q = 0; q < cuenta.length; q++) {
    if (cuenta[q]) { vn[3 * q] /= cuenta[q]; vn[3 * q + 1] /= cuenta[q]; vn[3 * q + 2] /= cuenta[q]; }
    const j = q % W; if (j === 0 || j === nJ) vn[3 * q + 2] = 0; // on the symmetry plane the flow has no side component
  }
  const N = M.nodos;
  /** Position, ∂P/∂u, ∂P/∂v and velocity at parameter (u, v) ∈ [0, nI] × [0, nJ]. */
  const en = (u: number, v: number, out: Float64Array) => {
    const i = Math.min(nI - 1, Math.max(0, Math.floor(u))), j = Math.min(nJ - 1, Math.max(0, Math.floor(v)));
    const a = u - i, b = v - j;
    const q00 = i * W + j, q10 = (i + 1) * W + j, q01 = i * W + j + 1, q11 = (i + 1) * W + j + 1;
    for (let k = 0; k < 3; k++) {
      const p00 = N[3 * q00 + k], p10 = N[3 * q10 + k], p01 = N[3 * q01 + k], p11 = N[3 * q11 + k];
      out[k] = p00 * (1 - a) * (1 - b) + p10 * a * (1 - b) + p01 * (1 - a) * b + p11 * a * b;
      out[3 + k] = (p10 - p00) * (1 - b) + (p11 - p01) * b;
      out[6 + k] = (p01 - p00) * (1 - a) + (p11 - p10) * a;
      const v00 = vn[3 * q00 + k], v10 = vn[3 * q10 + k], v01 = vn[3 * q01 + k], v11 = vn[3 * q11 + k];
      out[9 + k] = v00 * (1 - a) * (1 - b) + v10 * a * (1 - b) + v01 * (1 - a) * b + v11 * a * b;
    }
  };
  return { en, nI, nJ };
}

/**
 * The front stagnation point: the highest Cp on the front half. (Potential flow also
 * closes on a rear stagnation point with Cp = 1; the real flow has separated before
 * reaching it, so it is not shown.)
 */
export function remansoDelantero(C: Cuerpo, S: Solucion): number {
  const M = C.malla, xMedio = (C.xMorro + C.xCola) / 2;
  let r = -1;
  for (let p = 0; p < M.n; p++) if (M.c[3 * p] > xMedio && (r < 0 || S.cp[p] > S.cp[r])) r = p;
  return Math.max(0, r);
}

/** Traces the surface streamlines from a ring just downstream of the stagnation point. */
export function lineasDeSuperficie(C: Cuerpo, S: Solucion): { lineas: LineaSuperficie[]; remanso: number } {
  const M = C.malla, { en, nI, nJ } = superficie(C, S);
  const remanso = remansoDelantero(C, S);
  const iR = Math.floor(remanso / nJ), pR = [M.c[3 * remanso], M.c[3 * remanso + 1], M.c[3 * remanso + 2]];
  const u0 = Math.min(nI - 2, iR + 1.5), K = Math.max(12, nJ * 2);
  const f = new Float64Array(12), lineas: LineaSuperficie[] = [];
  const paso = Math.max(0.006, C.largo / (nI * 5));
  for (let k = 0; k < K; k++) {
    let u = u0, v = (k + 0.5) * nJ / K;
    const p: number[] = [], s: number[] = [], ue: number[] = [];
    en(u, v, f);
    let sAcum = Math.hypot(f[0] - pR[0], f[1] - pR[1], f[2] - pR[2]);
    for (let it = 0; it < 4000; it++) {
      en(u, v, f);
      const vel = Math.hypot(f[9], f[10], f[11]);
      p.push(f[0], f[1], f[2]); s.push(sAcum); ue.push(vel);
      if (u >= nI - 0.02 || (it > 10 && vel < 0.02)) break;
      // parameter rates from V = Pu·du + Pv·dv (least squares), then a step of `paso` metres (midpoint rule)
      const rates = (uu: number, vv: number) => {
        en(uu, vv, f);
        const guu = f[3] * f[3] + f[4] * f[4] + f[5] * f[5], gvv = f[6] * f[6] + f[7] * f[7] + f[8] * f[8], guv = f[3] * f[6] + f[4] * f[7] + f[5] * f[8];
        const bu = f[3] * f[9] + f[4] * f[10] + f[5] * f[11], bv = f[6] * f[9] + f[7] * f[10] + f[8] * f[11];
        const det = guu * gvv - guv * guv;
        if (det < 1e-14) return [0.2, 0, 1e-3]; // degenerate cell at a tip: just move along
        const du = (gvv * bu - guv * bv) / det, dv = (guu * bv - guv * bu) / det;
        const vx = f[3] * du + f[6] * dv, vy = f[4] * du + f[7] * dv, vz = f[5] * du + f[8] * dv, sp = Math.hypot(vx, vy, vz) || 1e-9;
        return [du / sp, dv / sp, sp];
      };
      const [du1, dv1] = rates(u, v);
      const um = u + 0.5 * paso * du1, vm = Math.min(nJ, Math.max(0, v + 0.5 * paso * dv1));
      const [du2, dv2] = rates(um, vm);
      const un = Math.min(nI, Math.max(0, u + paso * du2)), vnn = Math.min(nJ, Math.max(0, v + paso * dv2));
      en(un, vnn, f);
      const d = Math.hypot(f[0] - p[p.length - 3], f[1] - p[p.length - 2], f[2] - p[p.length - 1]);
      if (d < 1e-6 && it > 20) break;
      sAcum += d; u = un; v = vnn;
    }
    lineas.push({ p, s, ue });
  }
  return { lineas, remanso };
}

/** Gaussian smoothing of a series sampled at (non-uniform) arc lengths. */
function suavizar(s: number[], y: number[], sigma: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < y.length; i++) {
    let a = 0, w = 0;
    for (let k = i; k >= 0 && s[i] - s[k] < 3 * sigma; k--) { const g = Math.exp(-0.5 * ((s[i] - s[k]) / sigma) ** 2); a += g * y[k]; w += g; }
    for (let k = i + 1; k < y.length && s[k] - s[i] < 3 * sigma; k++) { const g = Math.exp(-0.5 * ((s[k] - s[i]) / sigma) ** 2); a += g * y[k]; w += g; }
    out.push(a / w);
  }
  return out;
}

/** Head's shape-factor correlations (Cebeci & Bradshaw). */
const H1deH = (H: number) => H <= 1.6 ? 3.3 + 0.8234 * Math.pow(H - 1.1, -1.287) : 3.3 + 1.5501 * Math.pow(H - 0.6778, -3.064);
const HdeH1 = (H1: number) => H1 >= 5.3 ? 1.1 + 0.86 * Math.pow(Math.max(1e-6, H1 - 3.3), -0.777) : 0.6778 + 1.1538 * Math.pow(Math.max(1e-6, H1 - 3.3), -0.326);

/**
 * Runs the boundary layer along every surface streamline at free-stream speed U (m/s).
 * `h[k][i]`: spacing to the neighbouring streamlines (m), for the spreading terms.
 */
export function capaLimite(lineas: LineaSuperficie[], U: number, xMax: number, sigmaSuave: number): ResultadoCapa[] {
  const K = lineas.length;
  // spacing between neighbours at equal arc length (the ring is closed by the mirror images at the bottom and top)
  const posEn = (L: LineaSuperficie, s: number, out: number[]) => {
    let lo = 0, hi = L.s.length - 1;
    if (s >= L.s[hi]) { out[0] = L.p[3 * hi]; out[1] = L.p[3 * hi + 1]; out[2] = L.p[3 * hi + 2]; return; }
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L.s[m] <= s) lo = m; else hi = m; }
    const t = L.s[hi] > L.s[lo] ? (s - L.s[lo]) / (L.s[hi] - L.s[lo]) : 0;
    for (let c = 0; c < 3; c++) out[c] = L.p[3 * lo + c] + (L.p[3 * hi + c] - L.p[3 * lo + c]) * t;
  };
  const a = [0, 0, 0], b = [0, 0, 0];
  return lineas.map((L, k) => {
    const n = L.s.length;
    const sinRes: ResultadoCapa = { iAdverso: n - 1, iTransicion: -1, iSeparacion: n - 1, pegada: true, iBurbuja: -1 };
    if (n < 4) return sinRes;
    const ue = suavizar(L.s, L.ue, sigmaSuave).map(v => Math.max(0.02, v) * U);
    const h: number[] = [];
    for (let i = 0; i < n; i++) {
      const p = [L.p[3 * i], L.p[3 * i + 1], L.p[3 * i + 2]];
      const vecino = (kk: number) => {
        if (kk < 0 || kk >= K) return 2 * Math.abs(p[2]); // the mirror image of this same line
        posEn(lineas[kk], L.s[i], a); return Math.hypot(a[0] - p[0], a[1] - p[1], a[2] - p[2]);
      };
      h.push(Math.max(1e-3, 0.5 * (vecino(k - 1) + vecino(k + 1))));
    }
    const hs = suavizar(L.s, h, sigmaSuave * 2);
    const due = (i: number) => (ue[Math.min(n - 1, i + 1)] - ue[Math.max(0, i - 1)]) / Math.max(1e-6, L.s[Math.min(n - 1, i + 1)] - L.s[Math.max(0, i - 1)]);
    const dlh = (i: number) => (Math.log(hs[Math.min(n - 1, i + 1)]) - Math.log(hs[Math.max(0, i - 1)])) / Math.max(1e-6, L.s[Math.min(n - 1, i + 1)] - L.s[Math.max(0, i - 1)]);
    // laminar start: stagnation flow up to the first point (Ue ∝ s, h ∝ s)
    let I = Math.pow(ue[0], 5) * hs[0] * hs[0] * L.s[0] / 8;
    let theta = Math.sqrt(0.45 * NU * L.s[0] / (8 * Math.max(1e-3, ue[0]))), H = 2.6, turb = false, H1 = 0;
    const r: ResultadoCapa = { ...sinRes };
    for (let i = 1; i < n; i++) {
      const ds = L.s[i] - L.s[i - 1];
      if (ds <= 0) continue;
      if (!turb) {
        I += 0.5 * (Math.pow(ue[i], 5) * hs[i] * hs[i] + Math.pow(ue[i - 1], 5) * hs[i - 1] * hs[i - 1]) * ds;
        theta = Math.sqrt(0.45 * NU * I / (Math.pow(ue[i], 6) * hs[i] * hs[i]));
        const lam = theta * theta / NU * due(i);
        const reS = ue[i] * L.s[i] / NU, reT = ue[i] * theta / NU;
        const michel = reT > 1.174 * (1 + 22400 / reS) * Math.pow(reS, 0.46);
        if (michel || lam < -0.09) { turb = true; r.iTransicion = i; H = 1.4; H1 = H1deH(H); }
        continue;
      }
      // Head: integrate θ and θ·H1 (explicit, small steps)
      const g = due(i) / ue[i], dh = dlh(i);
      const reT = Math.max(50, ue[i] * theta / NU);
      const cf = 0.246 * Math.pow(10, -0.678 * H) * Math.pow(reT, -0.268);
      const dTheta = cf / 2 - (H + 2) * theta * g - theta * dh;
      const F = 0.0306 * Math.pow(Math.max(1e-6, H1 - 3), -0.6169);
      const dTH1 = F - theta * H1 * (g + dh);
      const thH1 = theta * H1 + dTH1 * ds;
      theta = Math.max(1e-7, theta + dTheta * ds);
      H1 = Math.max(3.32, thH1 / theta); H = HdeH1(H1);
      if (H >= H_SEPARACION) {
        const x = L.p[3 * i];
        if (x > xMax && r.iBurbuja < 0) { r.iBurbuja = i; H = 1.4; H1 = H1deH(H); continue; }
        r.iSeparacion = i; r.pegada = false; break;
      }
    }
    // where the pressure starts rising for good: the last speed maximum before separation
    // that is at least 90 % of the highest one (small ripples do not count)
    const i0 = Math.max(0, r.iBurbuja);
    let gmax = 0; for (let i = i0; i <= r.iSeparacion; i++) gmax = Math.max(gmax, ue[i]);
    let iA = i0;
    for (let i = i0 + 1; i < r.iSeparacion; i++) if (ue[i] >= ue[i - 1] && ue[i] >= ue[i + 1] && ue[i] >= 0.9 * gmax) iA = i;
    r.iAdverso = iA;
    return r;
  });
}
