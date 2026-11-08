import * as THREE from 'three';
import { muestrear, puntoSeccion, type Est } from './forma';

/**
 * Geometry helpers for the garage Aptera (variants of the ones in `forma.ts`,
 * which is shared with other cars and stays as it is).
 *
 * The body is still a list of stations along X with superelliptic sections
 * (`Est`), but here every point of the skin is addressed as (x, θ): θ = 0 on
 * the +z side, π/2 on top, π on the −z side, 3π/2 underneath. Glass, solar
 * panels, lights and the dark band are patches laid on the skin between curves
 * given in (x, θ), and the same curves cut the holes in the skin behind the
 * clear glass, so the cabin can be seen through it.
 */

export type Rango = [number, number];

const FINAS = new WeakMap<Est[], Est[]>();
/** The stations of a list resampled every ~1–2 cm (Catmull-Rom), cached per list. */
export function finas(es: Est[]): Est[] {
  let m = FINAS.get(es);
  if (!m) { m = muestrear(es, 24); FINAS.set(es, m); }
  return m;
}

/** Station at x, linear between the fine samples (stations go from front to back, x decreasing). */
export function estacion(es: Est[], x: number): Est {
  const m = finas(es);
  let lo = 0, hi = m.length - 1;
  if (x >= m[0].x) hi = 1; else if (x <= m[hi].x) lo = hi - 1;
  else while (hi - lo > 1) { const k = (lo + hi) >> 1; if (m[k].x >= x) lo = k; else hi = k; }
  const a = m[lo], b = m[hi], t = b.x !== a.x ? Math.max(0, Math.min(1, (x - a.x) / (b.x - a.x))) : 0;
  const L = (p: number, q: number) => p + (q - p) * t;
  return { x, yb: L(a.yb, b.yb), yt: L(a.yt, b.yt), wb: L(a.wb, b.wb), wm: L(a.wm, b.wm), wt: L(a.wt, b.wt), n: L(a.n ?? 2.6, b.n ?? 2.6) };
}

/** Outward normal (ny, nz) of the section at θ. */
export function normalSeccion(e: Est, th: number): [number, number] {
  const [y1, z1] = puntoSeccion(e, th - 0.004), [y2, z2] = puntoSeccion(e, th + 0.004);
  let ny = -(z2 - z1), nz = y2 - y1; const l = Math.hypot(ny, nz) || 1; ny /= l; nz /= l;
  return [ny, nz];
}

/** Point of the skin at (e.x, θ), pushed `d` metres out along the normal. */
export function enPiel(e: Est, th: number, d = 0): THREE.Vector3 {
  const [y, z] = puntoSeccion(e, th);
  if (!d) return new THREE.Vector3(e.x, y, z);
  const [ny, nz] = normalSeccion(e, th);
  return new THREE.Vector3(e.x, y + ny * d, z + nz * d);
}

/** Arc length of the section between θa and θb (signed). */
export function arco(e: Est, a: number, b: number, pasos = 24): number {
  let s = 0, [py, pz] = puntoSeccion(e, a);
  for (let k = 1; k <= pasos; k++) {
    const [y, z] = puntoSeccion(e, a + (b - a) * k / pasos); s += Math.hypot(y - py, z - pz); py = y; pz = z;
  }
  return b >= a ? s : -s;
}

/** θ where the section is at height y on the +z side (between −π/2 and π/2). */
export function thetaY(e: Est, y: number): number {
  const n = e.n ?? 2.6, yc = (e.yb + e.yt) / 2, h = Math.max(1e-6, (e.yt - e.yb) / 2);
  const u = Math.max(-1, Math.min(1, (y - yc) / h));
  return Math.sign(u) * Math.asin(Math.pow(Math.abs(u), n / 2));
}
/** The same θ-range on the −z side. */
export const espejo = (r: Rango): Rango => [Math.PI - r[1], Math.PI - r[0]];

/**
 * The skin as a closed mesh, from the stations (smoothed between them with
 * `sub` steps) and N points around. `clase(x, θ)` picks the material group of
 * each quad, or −1 to leave it out (the holes behind clear glass). The quads
 * are tested at their centre, so a hole's edge is stepped: it must lie under
 * an opaque border (the black frit of the glass), never in the clear.
 */
export function piel(es: Est[], opciones: { N?: number; sub?: number; paso?: (x: number) => number; clase?: (x: number, th: number) => number; nClases?: number; tapas?: boolean; grupoTapas?: [number, number] } = {}): THREE.BufferGeometry {
  const { N = 128, sub = 12, paso, clase, nClases = 1, tapas = true, grupoTapas = [0, 0] } = opciones;
  const m = paso ? remuestrear(es, paso) : muestrear(es, sub), M = m.length;
  const pos = new Float32Array((M * N + 2) * 3);
  for (let i = 0; i < M; i++) for (let j = 0; j < N; j++) {
    const [y, z] = puntoSeccion(m[i], (j / N) * Math.PI * 2);
    pos.set([m[i].x, y, z], (i * N + j) * 3);
  }
  const grupos: number[][] = Array.from({ length: Math.max(1, nClases) }, () => []);
  for (let i = 0; i < M - 1; i++) {
    const xc = (m[i].x + m[i + 1].x) / 2;
    for (let j = 0; j < N; j++) {
      const k = clase ? clase(xc, ((j + 0.5) / N) * Math.PI * 2) : 0;
      if (k < 0) continue;
      const a = i * N + j, b = i * N + (j + 1) % N, c = (i + 1) * N + j, d = (i + 1) * N + (j + 1) % N;
      grupos[Math.min(nClases - 1, k)].push(a, b, c, b, d, c);
    }
  }
  if (tapas) {
    for (const [ring, fin] of [[0, false], [M - 1, true]] as [number, boolean][]) {
      const e = m[ring], s = M * N + (fin ? 1 : 0);
      pos.set([e.x, (e.yb + e.yt) / 2, 0], s * 3);
      const gr = grupos[Math.min(nClases - 1, grupoTapas[fin ? 1 : 0])];
      for (let j = 0; j < N; j++) {
        const a = ring * N + j, b = ring * N + (j + 1) % N;
        if (fin) gr.push(s, a, b); else gr.push(s, b, a);
      }
    }
  }
  return conGrupos(pos, grupos);
}

/**
 * The stations resampled along x with the spacing `paso(x)` asks for (finer
 * where glass edges cut the skin, coarser where the skin is plain): one
 * Catmull-Rom pass at 24 steps per segment, then keep a sample every `paso`.
 */
const MUY_FINAS = new WeakMap<Est[], Est[]>();
export function remuestrear(es: Est[], paso: (x: number) => number): Est[] {
  let m = MUY_FINAS.get(es);
  if (!m) { m = muestrear(es, 48); MUY_FINAS.set(es, m); }
  const out = [m[0]];
  let ultimo = m[0].x;
  for (let k = 1; k < m.length - 1; k++) if (ultimo - m[k].x >= paso(m[k].x) - 1e-9) { out.push(m[k]); ultimo = m[k].x; }
  out.push(m[m.length - 1]);
  return out;
}

function conGrupos(pos: Float32Array | number[], grupos: number[][]): THREE.BufferGeometry {
  let total = 0; for (const l of grupos) total += l.length;
  const idx = new Uint32Array(total), g = new THREE.BufferGeometry();
  let inicio = 0;
  grupos.forEach((lista, k) => { idx.set(lista, inicio); g.addGroup(inicio, lista.length, k); inicio += lista.length; });
  g.setAttribute('position', new THREE.BufferAttribute(pos instanceof Float32Array ? pos : new Float32Array(pos), 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
  return g;
}

export interface OpcionesParche {
  /** Offset out of the skin (m). */
  delta?: number;
  /** Rows along x and columns across. */
  nx?: number; nth?: number;
  /** Bunch the columns towards both edges (sharper borders for the frit band). */
  bordes?: boolean;
  /** Vertex colour (RGBA) from u (= −x, m), v (arc from the top centre line, m) and the distance to the edge (m). */
  color?: (u: number, v: number, borde: number) => [number, number, number, number];
  /** Quads to leave out (holes), tested at their centre. */
  quitar?: (x: number, th: number) => boolean;
}

/**
 * A patch on the skin between x0 and x1: at each x it covers the θ-range
 * that `rango` returns (or nothing when it returns null). UVs are in metres:
 * u along the car (−x), v the arc length from the top centre line, so a
 * texture repeated per metre (the solar cells) keeps its size everywhere.
 */
export function parcheM(es: Est[], x0: number, x1: number, rango: (e: Est) => Rango | null, o: OpcionesParche = {}): THREE.BufferGeometry {
  const { delta = 0.003, nx = 60, nth = 40, bordes = false, color, quitar } = o;
  const filas: { e: Est; r: Rango | null }[] = [];
  for (let i = 0; i <= nx; i++) {
    const t = bordes ? 0.5 - 0.5 * Math.cos(Math.PI * i / nx) : i / nx;
    const e = estacion(es, x0 + (x1 - x0) * t);
    filas.push({ e, r: rango(e) });
  }
  // the x where the patch starts and ends (for the distance to the edge along x)
  const validas = filas.filter(f => f.r && f.r[1] - f.r[0] > 1e-4);
  const xa = validas.length ? validas[0].e.x : x0, xb = validas.length ? validas[validas.length - 1].e.x : x1;
  const C = nth + 1, pos = new Float32Array(filas.length * C * 3), uv = new Float32Array(filas.length * C * 2);
  const col = color ? new Float32Array(filas.length * C * 4) : null;
  // one row at a time: the section points once, then arc lengths and section normals from the neighbours
  const Y = new Float64Array(C), Z = new Float64Array(C), S = new Float64Array(C), TH = new Float64Array(C);
  const sec = new Float32Array(filas.length * C * 2); // outward normal in the section plane (ny, nz)
  filas.forEach(({ e, r }, i) => {
    const [a, b] = r ?? [Math.PI / 2, Math.PI / 2];
    for (let j = 0; j <= nth; j++) {
      const t = bordes ? 0.5 - 0.5 * Math.cos(Math.PI * j / nth) : j / nth;
      TH[j] = a + (b - a) * t;
      const p = puntoSeccion(e, TH[j]); Y[j] = p[0]; Z[j] = p[1];
      S[j] = j ? S[j - 1] + Math.hypot(Y[j] - Y[j - 1], Z[j] - Z[j - 1]) : 0;
    }
    // arc length from the top centre line to the start of the row (v of the texture)
    const s0 = arco(e, Math.PI / 2, a, 12), largo = S[nth];
    const ext = b - a < 0.02 ? normalSeccion(e, (a + b) / 2) : null;
    for (let j = 0; j <= nth; j++) {
      let ny: number, nz: number;
      if (ext) [ny, nz] = ext;
      else {
        const p = Math.max(0, j - 1), q = Math.min(nth, j + 1);
        ny = -(Z[q] - Z[p]); nz = Y[q] - Y[p]; const l = Math.hypot(ny, nz) || 1; ny /= l; nz /= l;
      }
      const k = i * C + j;
      pos[k * 3] = e.x; pos[k * 3 + 1] = Y[j]; pos[k * 3 + 2] = Z[j];
      sec[k * 2] = ny; sec[k * 2 + 1] = nz;
      // v grows towards −z (θ grows from the +z side over the top): it reads left to right seen from above
      const v = -(s0 + S[j]);
      uv[k * 2] = -e.x; uv[k * 2 + 1] = v;
      if (col && color) col.set(color(-e.x, v, Math.min(S[j], largo - S[j], Math.abs(e.x - xa), Math.abs(e.x - xb))), k * 4);
    }
  });
  const idx: number[] = [];
  for (let i = 0; i < filas.length - 1; i++) {
    if (!filas[i].r || !filas[i + 1].r) continue;
    for (let j = 0; j < nth; j++) {
      if (quitar) {
        const xm = (filas[i].e.x + filas[i + 1].e.x) / 2;
        const ra = filas[i].r!, rb = filas[i + 1].r!, t = (j + 0.5) / nth;
        const thm = ((ra[0] + (ra[1] - ra[0]) * t) + (rb[0] + (rb[1] - rb[0]) * t)) / 2;
        if (quitar(xm, thm)) continue;
      }
      const a = i * C + j, b = a + 1, c = a + C, d = c + 1;
      // rows going backwards (x0 > x1) and θ growing leave the face looking out; the other way round, flip it
      if (x0 >= x1) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
    }
  }
  // Push the patch `delta` out along the true normal of the skin (across the row × along x), not
  // only the section normal: where the skin faces forwards (the tip of the nose) the section
  // normal lies in the surface, and the patch would sit on the skin and flicker.
  if (delta) {
    const B = pos.slice();
    const valida = (i: number) => i >= 0 && i < filas.length && !!filas[i].r;
    for (let i = 0; i < filas.length; i++) {
      if (!filas[i].r) continue;
      const ia = valida(i - 1) ? i - 1 : i, ib = valida(i + 1) ? i + 1 : i;
      for (let j = 0; j <= nth; j++) {
        const k = i * C + j, ny0 = sec[k * 2], nz0 = sec[k * 2 + 1];
        let nx = 0, ny = ny0, nz = nz0;
        if (ia !== ib) {
          const p = 3 * (i * C + Math.max(0, j - 1)), q = 3 * (i * C + Math.min(nth, j + 1)), u = 3 * (ia * C + j), w = 3 * (ib * C + j);
          const a0 = B[q] - B[p], a1 = B[q + 1] - B[p + 1], a2 = B[q + 2] - B[p + 2];
          const b0 = B[w] - B[u], b1 = B[w + 1] - B[u + 1], b2 = B[w + 2] - B[u + 2];
          const cx = a1 * b2 - a2 * b1, cy = a2 * b0 - a0 * b2, cz = a0 * b1 - a1 * b0;
          const l = Math.hypot(cx, cy, cz);
          // (θ along the row) × (rows towards x1) looks out when the rows go backwards, as for the faces
          if (l > 1e-12) { const s = (x0 >= x1 ? 1 : -1) / l; nx = cx * s; ny = cy * s; nz = cz * s; }
        }
        pos[k * 3] += nx * delta; pos[k * 3 + 1] += ny * delta; pos[k * 3 + 2] += nz * delta;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/**
 * A ribbon on the skin (side z > 0) following a side-view curve [x, y]: shut
 * lines. Same idea as `cinta` in `forma.ts`, but with the cached stations and a
 * binary search, which matters with several ribbons per car.
 */
export function cintaPiel(es: Est[], ctrl: [number, number][], ancho: number, opciones: { delta?: number; pasos?: number } = {}): THREE.BufferGeometry {
  const { delta = 0.002, pasos = 48 } = opciones;
  const v3 = ctrl.map(([x, y]) => new THREE.Vector3(x, y, 0));
  const pts = new THREE.CatmullRomCurve3(v3, false, 'catmullrom', 0.5).getPoints(pasos);
  const pos: number[] = [], idx: number[] = [];
  const enLado = (x: number, y: number) => {
    const e = estacion(es, x), th = thetaY(e, y), [py, pz] = puntoSeccion(e, th), [ny, nz] = normalSeccion(e, th);
    pos.push(x, py + ny * delta, pz + nz * delta);
  };
  pts.forEach((p, k) => {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
    let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    enLado(p.x - ty * ancho / 2, p.y + tx * ancho / 2);
    enLado(p.x + ty * ancho / 2, p.y - tx * ancho / 2);
  });
  for (let k = 0; k < pts.length - 1; k++) { const a = 2 * k; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/**
 * A tube of elliptical (or any closed) profile swept along a 3D polyline:
 * light lenses, the wiper, arms, the steering wheel rim. `perfil(t)` gives the
 * half-sizes [a, b] of the section at t ∈ [0, 1] (a across the `lado` vector, b along the binormal).
 */
export function barrido(pts: THREE.Vector3[], perfil: (t: number) => [number, number], opciones: { lados?: number; cerrado?: boolean; arriba?: THREE.Vector3; tapas?: boolean } = {}): THREE.BufferGeometry {
  const { lados = 12, cerrado = false, arriba = new THREE.Vector3(0, 1, 0), tapas = true } = opciones;
  const n = pts.length, pos: number[] = [], idx: number[] = [];
  const T = new THREE.Vector3(), Nn = new THREE.Vector3(), B = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const a = pts[cerrado ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[cerrado ? (i + 1) % n : Math.min(n - 1, i + 1)];
    T.subVectors(b, a).normalize();
    B.crossVectors(T, arriba); if (B.lengthSq() < 1e-8) B.set(0, 0, 1); B.normalize();
    Nn.crossVectors(B, T).normalize();
    const [ra, rb] = perfil(cerrado ? i / n : i / (n - 1));
    for (let k = 0; k < lados; k++) {
      const ang = (k / lados) * Math.PI * 2, c = Math.cos(ang), s = Math.sin(ang);
      pos.push(pts[i].x + B.x * ra * c + Nn.x * rb * s, pts[i].y + B.y * ra * c + Nn.y * rb * s, pts[i].z + B.z * ra * c + Nn.z * rb * s);
    }
  }
  const filas = cerrado ? n : n - 1;
  for (let i = 0; i < filas; i++) for (let k = 0; k < lados; k++) {
    const a = i * lados + k, b = i * lados + (k + 1) % lados, c = ((i + 1) % n) * lados + k, d = ((i + 1) % n) * lados + (k + 1) % lados;
    idx.push(a, c, b, b, c, d);
  }
  if (tapas && !cerrado) {
    for (const [i, fin] of [[0, false], [n - 1, true]] as [number, boolean][]) {
      const s = pos.length / 3; pos.push(pts[i].x, pts[i].y, pts[i].z);
      for (let k = 0; k < lados; k++) { const a = i * lados + k, b = i * lados + (k + 1) % lados; if (fin) idx.push(s, b, a); else idx.push(s, a, b); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Catmull-Rom through 2D or 3D control points, `pasos` samples per segment. */
export function curva(ctrl: THREE.Vector3[], pasos = 8): THREE.Vector3[] {
  const c = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
  return c.getPoints(Math.max(2, (ctrl.length - 1) * pasos));
}

/** Revolves a profile [r, h] around the Z axis. `mod(ang, h, r)` can change the radius (tread, flat contact patch). */
export function torno(perfil: [number, number][], segs: number, mod?: (ang: number, h: number, r: number) => number): THREE.BufferGeometry {
  // the last column wraps onto the first one, so the shading has no seam
  const n = perfil.length, pos = new Float32Array(segs * n * 3), idx: number[] = [];
  for (let s = 0; s < segs; s++) {
    const a = (s / segs) * Math.PI * 2, c = Math.cos(a), si = Math.sin(a);
    perfil.forEach(([r0, h], k) => { const r = mod ? mod(a, h, r0) : r0; pos.set([r * c, r * si, h], (s * n + k) * 3); });
  }
  for (let s = 0; s < segs; s++) for (let k = 0; k < n - 1; k++) { const a = s * n + k, b = ((s + 1) % segs) * n + k; idx.push(a, b, b + 1, a, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
