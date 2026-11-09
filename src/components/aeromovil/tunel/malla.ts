import { mallaDeNodos, type Malla } from './paneles';

/**
 * Surface mesh for the panel method, built from a tunnel silhouette.
 *
 * A silhouette (`Envolvente`) is a list of [x, y bottom, y top, half width] from
 * nose to tail; at each x the section is a superellipse |z/b|ⁿ + |(y−yc)/a|ⁿ = 1
 * (n = 2 an ellipse, n = 3 nearly a rounded box). The first and last sections of
 * a silhouette are usually not points (a blunt nose, a cut tail): the mesh closes
 * them with an elliptical cap whose length is 0.6 × the smaller half-axis of that
 * section, so the body is closed, as the panel method needs.
 *
 * Only the z ≥ 0 half is meshed (the other half is the mirror image).
 */

export type Envolvente = [number, number, number, number][];

/** Panels along × around the half section, per resolution. */
export const RESOLUCION = {
  baja: { nI: 26, nJ: 10 },
  media: { nI: 40, nJ: 16 },
  alta: { nI: 60, nJ: 24 },
} as const;
export type Resolucion = keyof typeof RESOLUCION;

export interface Seccion { x: number; yc: number; a: number; b: number }

export interface Cuerpo {
  malla: Malla;
  /** Section function (with the caps), for the inside test, the base area and the wake. */
  seccion: (x: number) => Seccion;
  xMorro: number; xCola: number;
  /** The silhouette's last section: behind it is only the cap this mesh adds to close the tail. */
  xUltima: number;
  n: number;
  /** Largest section: x, area (m²) and the section itself. */
  xMax: number; areaMax: number; secMax: Seccion;
  /** Wetted area of the whole body (both halves, m²) and length (m). */
  mojada: number; largo: number;
}

/** Unit superellipse point at parameter t ∈ [−π/2, π/2] (bottom → side → top, z ≥ 0). */
export function superelipse(t: number, n: number): [number, number] {
  const c = Math.cos(t), s = Math.sin(t), e = 2 / n;
  return [Math.sign(s) * Math.pow(Math.abs(s), e), Math.pow(Math.abs(c), e)]; // [y, z]
}

/** Area of a superellipse with half axes a, b (numerical, 400 points). */
export function areaSuperelipse(a: number, b: number, n: number): number {
  let A = 0, prev = superelipse(-Math.PI / 2, n);
  for (let k = 1; k <= 400; k++) {
    const p = superelipse(-Math.PI / 2 + Math.PI * k / 400, n);
    A += (prev[1] + p[1]) * (p[0] - prev[0]) / 2; // ∫ z dy over the half → half the area
    prev = p;
  }
  return 2 * A * a * b;
}

/** Parameters t_j that split the half superellipse of aspect a:b in nJ equal arcs. */
function parametrosArco(a: number, b: number, n: number, nJ: number): number[] {
  const M = 240, t: number[] = [], s: number[] = [0];
  let prev = superelipse(-Math.PI / 2, n);
  t.push(-Math.PI / 2);
  for (let k = 1; k <= M; k++) {
    const tt = -Math.PI / 2 + Math.PI * k / M, p = superelipse(tt, n);
    s.push(s[k - 1] + Math.hypot((p[0] - prev[0]) * a, (p[1] - prev[1]) * b)); t.push(tt); prev = p;
  }
  const out: number[] = [];
  for (let j = 0; j <= nJ; j++) {
    const objetivo = s[M] * j / nJ;
    let k = 1; while (k < M && s[k] < objetivo) k++;
    const f = s[k] > s[k - 1] ? (objetivo - s[k - 1]) / (s[k] - s[k - 1]) : 0;
    out.push(t[k - 1] + (t[k] - t[k - 1]) * f);
  }
  out[0] = -Math.PI / 2; out[nJ] = Math.PI / 2;
  return out;
}

/** Builds the section function (silhouette + caps) of a body. */
export function funcionSeccion(envolvente: Envolvente) {
  const env = [...envolvente].filter(e => e.every(Number.isFinite)).sort((p, q) => q[0] - p[0]);
  const lim: [number, number, number, number][] = [];
  for (const e of env) if (!lim.length || lim[lim.length - 1][0] - e[0] > 1e-4) lim.push(e);
  const S = lim.map(([x, yb, yt, hw]) => ({ x, yc: (yb + yt) / 2, a: Math.max(0.002, (yt - yb) / 2), b: Math.max(0.002, hw) }));
  const s0 = S[0], sN = S[S.length - 1];
  const Ln = Math.min(0.15, Math.max(0.004, 0.6 * Math.min(s0.a, s0.b))), Lt = Math.min(0.15, Math.max(0.004, 0.6 * Math.min(sN.a, sN.b)));
  const xMorro = s0.x + Ln, xCola = sN.x - Lt;
  const seccion = (x: number): Seccion => {
    if (x >= s0.x) { const u = Math.min(1, (x - s0.x) / Ln), f = Math.sqrt(Math.max(0, 1 - u * u)); return { x, yc: s0.yc, a: s0.a * f, b: s0.b * f }; }
    if (x <= sN.x) { const u = Math.min(1, (sN.x - x) / Lt), f = Math.sqrt(Math.max(0, 1 - u * u)); return { x, yc: sN.yc, a: sN.a * f, b: sN.b * f }; }
    let lo = 0, hi = S.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m].x >= x) lo = m; else hi = m; }
    const A = S[lo], B = S[hi], t = A.x > B.x ? (A.x - x) / (A.x - B.x) : 0;
    return { x, yc: A.yc + (B.yc - A.yc) * t, a: A.a + (B.a - A.a) * t, b: A.b + (B.b - A.b) * t };
  };
  return { seccion, xMorro, xCola, xUltima: sN.x };
}

/** The panel mesh of a silhouette. */
export function cuerpoDeEnvolvente(envolvente: Envolvente, n: number, res: Resolucion): Cuerpo {
  const { nI, nJ } = RESOLUCION[res];
  const { seccion, xMorro, xCola, xUltima } = funcionSeccion(envolvente);
  // Stations: equal steps of a length that also counts how fast the section changes
  // (so the caps and the steep nose get more stations), blended with cosine spacing at the tips.
  const F = 600, xs: number[] = [], acum: number[] = [0];
  let prev = seccion(xMorro);
  xs.push(xMorro);
  for (let k = 1; k <= F; k++) {
    const x = xMorro + (xCola - xMorro) * k / F, s = seccion(x);
    acum.push(acum[k - 1] + Math.hypot(x - prev.x, 1.4 * (s.a - prev.a), 1.4 * (s.b - prev.b), s.yc - prev.yc)); xs.push(x); prev = s;
  }
  const total = acum[F], estaciones: number[] = [];
  for (let i = 0; i <= nI; i++) {
    const t = i / nI, u = 0.5 * (1 - Math.cos(Math.PI * t)), objetivo = total * (0.6 * t + 0.4 * u);
    let k = 1; while (k < F && acum[k] < objetivo) k++;
    const f = acum[k] > acum[k - 1] ? (objetivo - acum[k - 1]) / (acum[k] - acum[k - 1]) : 0;
    estaciones.push(xs[k - 1] + (xs[k] - xs[k - 1]) * f);
  }
  estaciones[0] = xMorro; estaciones[nI] = xCola;
  const nodos = new Float64Array((nI + 1) * (nJ + 1) * 3);
  let xMax = estaciones[0], areaMax = 0, secMax = seccion(xMorro);
  for (let i = 0; i <= nI; i++) {
    const s = seccion(estaciones[i]), ts = parametrosArco(Math.max(1e-4, s.a), Math.max(1e-4, s.b), n, nJ);
    for (let j = 0; j <= nJ; j++) {
      const [py, pz] = superelipse(ts[j], n), o = (i * (nJ + 1) + j) * 3;
      nodos[o] = s.x; nodos[o + 1] = s.yc + s.a * py; nodos[o + 2] = s.b * pz;
    }
  }
  for (let k = 0; k <= 300; k++) {
    const s = seccion(xMorro + (xCola - xMorro) * k / 300), A = areaSuperelipse(s.a, s.b, n);
    if (A > areaMax) { areaMax = A; xMax = s.x; secMax = s; }
  }
  const malla = mallaDeNodos(nI, nJ, nodos, (c, nn) => {
    const s = seccion(c[0]);
    return nn[1] * (c[1] - s.yc) + nn[2] * c[2] > 0;
  });
  let mojada = 0; for (let p = 0; p < malla.n; p++) mojada += 2 * malla.area[p];
  return { malla, seccion, xMorro, xCola, xUltima, n, xMax, areaMax, secMax, mojada, largo: xMorro - xCola };
}

/** Is (x, y, z) inside the body? (superellipse test on the section at x, with a margin factor). */
export function dentro(C: Pick<Cuerpo, 'seccion' | 'xMorro' | 'xCola' | 'n'>, x: number, y: number, z: number, margen = 1): boolean {
  if (x > C.xMorro || x < C.xCola) return false;
  const s = C.seccion(x);
  if (s.a < 1e-5 || s.b < 1e-5) return false;
  return Math.pow(Math.abs(z) / (s.b * margen), C.n) + Math.pow(Math.abs(y - s.yc) / (s.a * margen), C.n) < 1;
}

// ------------------------------------------------- test bodies (analytic solutions)

/** Ellipsoid with half axes (ax along x, r across), centre at height yc; nI × nJ panels on the z ≥ 0 half. */
export function mallaElipsoide(ax: number, r: number, yc: number, nI: number, nJ: number): Malla {
  const nodos = new Float64Array((nI + 1) * (nJ + 1) * 3);
  for (let i = 0; i <= nI; i++) {
    const al = Math.PI * i / nI;
    for (let j = 0; j <= nJ; j++) {
      const ph = -Math.PI / 2 + Math.PI * j / nJ, o = (i * (nJ + 1) + j) * 3;
      nodos[o] = ax * Math.cos(al); nodos[o + 1] = yc + r * Math.sin(al) * Math.sin(ph); nodos[o + 2] = r * Math.sin(al) * Math.cos(ph);
    }
  }
  return mallaDeNodos(nI, nJ, nodos, (c, nn) => nn[0] * c[0] / (ax * ax) + nn[1] * (c[1] - yc) / (r * r) + nn[2] * c[2] / (r * r) > 0);
}
