import * as THREE from 'three';
import { E, loft } from './forma';
import {
  BATALLA, BOCA, RC, TS, VIA_DEL, VIA_TRAS, XN0, X_COLA, X_MORRO,
  arribaY, bulto, detrasX, frenteX, ladoZ, punto, sec,
} from './jaguarDForma';
import { cabina, caja, faro, malla, mats, rueda, sinSombra, torno, tubo, unir, type Mats } from './jaguarDPiezas';

/*
 * The Jaguar D-Type (1955 short-nose production car) built in three.js. The
 * shape lives in `jaguarDForma.ts`, the separate parts in `jaguarDPiezas.ts`.
 *
 * - The skin is one grid over (x, t): rows at fixed x, columns running right
 *   round the section (right half up, left half down), so there is no seam
 *   anywhere. Openings (wheel arches, the driver's cockpit, the headlamp
 *   recesses) are triangles left out of that grid; the vertices next to an
 *   arch or the cockpit are pulled onto the outline, so the edges are clean.
 * - Shut lines, the number roundels, the headlamp fairings and their rims are
 *   "decals": a 2D drawing in one view (side, top, front or rear) projected
 *   onto the skin and lifted a fraction of a millimetre.
 * - Built once per page into a template; `construir()` hands out copies of its
 *   geometries (the viewer disposes those) with the shared materials.
 */

type P2 = [number, number];

// ======================================================================= the skin
const NH = 76; // columns per half (bottom centre to top centre)
/** Driver's centre line (right-hand drive: +z). */
export const Z_PILOTO = 0.30;

/** Front and rear wheel openings seen from the side; cut from the skin where |z| > z. */
const ARCOS = [
  { x: 0, y: 0.312, a: 0.425, b: 0.432, z: 0.535 },
  { x: -BATALLA, y: 0.300, a: 0.415, b: 0.428, z: 0.505 },
];
const qArco = (A: typeof ARCOS[number], x: number, y: number) => Math.hypot((x - A.x) / A.a, (y - A.y) / A.b);

/** The driver's opening in plan: a rounded rectangle (centre, half sizes, corner radius). */
const CABINA = { x: -1.265, z: 0.318, hx: 0.455, hz: 0.283, r: 0.13 };
/** Passenger tonneau cover, the mirror image a little narrower. */
const TONNEAU = { x: -1.265, z: -0.318, hx: 0.455, hz: 0.278, r: 0.12 };
function dRect(R: typeof CABINA, x: number, z: number): number {
  const qx = Math.abs(x - R.x) - (R.hx - R.r), qz = Math.abs(z - R.z) - (R.hz - R.r);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - R.r;
}
/** Closest point on the rounded rectangle's outline. */
function sobreRect(R: typeof CABINA, x: number, z: number): P2 {
  const e = 1e-4, d = dRect(R, x, z);
  const gx = (dRect(R, x + e, z) - dRect(R, x - e, z)) / (2 * e), gz = (dRect(R, x, z + e) - dRect(R, x, z - e)) / (2 * e), l = Math.hypot(gx, gz) || 1;
  return [x - d * gx / l, z - d * gz / l];
}
function contornoRect(R: typeof CABINA, n = 120): P2[] {
  const out: P2[] = [];
  const esq: [number, number, number][] = [[R.x + R.hx - R.r, R.z + R.hz - R.r, 0], [R.x - R.hx + R.r, R.z + R.hz - R.r, Math.PI / 2], [R.x - R.hx + R.r, R.z - R.hz + R.r, Math.PI], [R.x + R.hx - R.r, R.z - R.hz + R.r, 1.5 * Math.PI]];
  const m = Math.max(4, Math.round(n / 4 * 0.45));
  for (const [cx, cz, a0] of esq) {
    for (let k = 0; k <= m; k++) { const a = a0 + (Math.PI / 2) * k / m; out.push([cx + R.r * Math.cos(a), cz + R.r * Math.sin(a)]); }
  }
  // resample evenly
  const L: number[] = [0]; for (let i = 1; i <= out.length; i++) L.push(L[i - 1] + Math.hypot(out[i % out.length][0] - out[i - 1][0], out[i % out.length][1] - out[i - 1][1]));
  const tot = L[L.length - 1], res: P2[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = tot * k / n; while (L[j + 1] < s) j++;
    const a = out[j], b = out[(j + 1) % out.length], u = (s - L[j]) / (L[j + 1] - L[j] || 1);
    res.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  return res;
}

/** Headlamp fairings seen from the front: ellipse (centre z, y and radii), the right one; the left is its mirror. */
const FARO = { z: 0.575, y: 0.572, rz: 0.108, ry: 0.098 };
const enFaro = (z: number, y: number, k: number) => Math.hypot((Math.abs(z) - FARO.z) / (FARO.rz * k), (y - FARO.y) / (FARO.ry * k)) < 1;

/** Row spacing: fine over the arches, the cockpit and the headlamps, finer still at the tail; the nose lip by angle. */
function filasX(): number[] {
  const xs: number[] = [];
  const NL = 18;
  for (let k = NL; k >= 1; k--) xs.push(XN0 + (X_MORRO - XN0) * Math.sin((k / NL) * Math.PI / 2));
  const paso = (x: number) => {
    let p = 0.02;
    if (Math.abs(x) < 0.5 || Math.abs(x + BATALLA) < 0.5) p = 0.0125;
    if (x < -0.72 && x > -1.80) p = 0.011;
    if (x > 0.3) p = 0.008;
    const dt = x - X_COLA;
    p = Math.min(p, Math.max(0.0015, 0.09 * dt));
    return p;
  };
  for (let x = XN0; x > X_COLA; x -= paso(x)) xs.push(x);
  xs.push(X_COLA);
  xs.sort((a, b) => b - a);
  return xs.filter((x, i) => i === 0 || xs[i - 1] - x > 2e-4);
}

interface Rejilla { pos: Float32Array; nor: Float32Array; filas: number; cols: number; t: Float32Array }

/** The closed skin grid: per row, NH + 1 points up the right half, then NH − 1 down the left. */
function rejilla(xs: number[]): Rejilla {
  const cols = 2 * NH, filas = xs.length;
  const pos = new Float32Array(filas * cols * 3), nor = new Float32Array(filas * cols * 3), tt = new Float32Array(filas * cols);
  for (let i = 0; i < filas; i++) {
    const x = xs[i], s = sec(Math.max(X_COLA + 1e-5, Math.min(X_MORRO, x)));
    for (let c = 0; c < cols; c++) {
      const k = c <= NH ? c : 2 * NH - c, lado = c <= NH ? 1 : -1, t = k / NH;
      const [z, y] = punto(s, t), o = (i * cols + c) * 3;
      const zz = lado * z;
      pos[o] = x; pos[o + 1] = y + (y > 0.45 ? bulto(x, zz) : 0); pos[o + 2] = zz; tt[i * cols + c] = t;
    }
  }
  return { pos, nor, filas, cols, t: tt };
}
/** Normals from the grid neighbours (columns wrap round). */
function normales(R: Rejilla, xs: number[]) {
  const { pos, nor, filas, cols } = R, mitadX = (X_MORRO + X_COLA) / 2;
  const v = (i: number, c: number, e: number) => pos[(i * cols + ((c + cols) % cols)) * 3 + e];
  for (let i = 0; i < filas; i++) for (let c = 0; c < cols; c++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(filas - 1, i + 1);
    const ax = v(i0, c, 0) - v(i1, c, 0), ay = v(i0, c, 1) - v(i1, c, 1), az = v(i0, c, 2) - v(i1, c, 2);
    const bx = v(i, c + 1, 0) - v(i, c - 1, 0), by = v(i, c + 1, 1) - v(i, c - 1, 1), bz = v(i, c + 1, 2) - v(i, c - 1, 2);
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const o = (i * cols + c) * 3;
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-12) { nx = xs[i] > mitadX ? 1 : -1; ny = 0; nz = 0; } else { nx /= l; ny /= l; nz /= l; }
    nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz;
  }
  // orientation: outward at the widest point of the middle row
  const im = Math.floor(filas / 2), cw = Math.round(NH * TS[3]), o = (im * cols + cw) * 3;
  if (nor[o + 2] < 0) for (let k = 0; k < nor.length; k++) nor[k] = -nor[k];
}

function carroceria(xs: number[], M: Mats): THREE.Mesh {
  const R = rejilla(xs), P = R.pos, nv = P.length / 3;
  // arches: pull the vertices next to the opening onto its ellipse
  for (let v = 0; v < nv; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    for (const A of ARCOS) {
      if (Math.abs(z) < A.z - 0.004 || y < 0.15) continue;
      const q = qArco(A, x, y);
      if (Math.abs(q - 1) < 0.028) { P[v * 3] = A.x + (x - A.x) / q; P[v * 3 + 1] = A.y + (y - A.y) / q; }
    }
    // cockpit: pull the top-surface vertices next to the outline onto it (and back onto the skin)
    if (y > 0.6) {
      const d = dRect(CABINA, x, z);
      if (Math.abs(d) < 0.011) {
        const [px, pz] = sobreRect(CABINA, x, z), py = arribaY(px, pz);
        if (Number.isFinite(py)) { P[v * 3] = px; P[v * 3 + 1] = py; P[v * 3 + 2] = pz; }
      }
    }
  }
  normales(R, xs);
  const idx: number[] = [], { cols, filas } = R;
  const quitar = (x: number, y: number, z: number) =>
    ARCOS.some(A => Math.abs(z) > A.z && qArco(A, x, y) < 0.999) ||
    (y > 0.6 && dRect(CABINA, x, z) < 0) ||
    (x > 0.3 && enFaro(z, y, 0.86));
  const tri = (a: number, b: number, c: number) => {
    const x = (P[a * 3] + P[b * 3] + P[c * 3]) / 3, y = (P[a * 3 + 1] + P[b * 3 + 1] + P[c * 3 + 1]) / 3, z = (P[a * 3 + 2] + P[b * 3 + 2] + P[c * 3 + 2]) / 3;
    if (!quitar(x, y, z)) idx.push(a, b, c);
  };
  for (let i = 0; i < filas - 1; i++) for (let c = 0; c < cols; c++) {
    const a = i * cols + c, b = i * cols + (c + 1) % cols, a2 = a + cols, b2 = b + cols;
    tri(a, b, a2); tri(b, b2, a2);
  }
  // winding: compare with the vertex normals
  let sum = 0; const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3();
  for (let k = 0; k < idx.length; k += 3 * 11) {
    A.fromArray(P, idx[k] * 3); B.fromArray(P, idx[k + 1] * 3); C.fromArray(P, idx[k + 2] * 3); N.fromArray(R.nor, idx[k] * 3);
    sum += B.sub(A).cross(C.sub(A)).dot(N);
  }
  if (sum < 0) for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(R.nor, 3)); g.setIndex(idx);
  return malla(g, M.pintura, 'carroceria');
}

/** Wheel-arch liners: a band from the opening's edge in to a flat inner wall, dark, so the body is never seen hollow. */
function pozos(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'pasos-de-rueda';
  for (const A of ARCOS) {
    const yb = 0.142;
    const th0 = Math.asin(Math.max(-1, Math.min(1, (yb - A.y) / A.b))), N = 64;
    for (const s of [1, -1]) {
      const pos: number[] = [], idx: number[] = [];
      for (let k = 0; k <= N; k++) {
        const th = th0 + (Math.PI - 2 * th0) * k / N;
        const x = A.x + A.a * Math.cos(th), y = A.y + A.b * Math.sin(th);
        const zo = ladoZ(x, y), zf = Number.isFinite(zo) ? zo - 0.003 : A.z + 0.1;
        pos.push(x, y, s * A.z, x, y, s * zf);
        if (k > 0) { const a = 2 * k; idx.push(a - 2, a - 1, a, a - 1, a + 1, a); }
      }
      const forro = new THREE.BufferGeometry(); forro.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); forro.setIndex(idx); forro.computeVertexNormals();
      g.add(malla(forro, M.pozo, 'forro'));
      const sh = new THREE.Shape(); sh.moveTo(A.x + A.a * Math.cos(th0), A.y + A.b * Math.sin(th0));
      for (let k = 1; k <= N; k++) { const th = th0 + (Math.PI - 2 * th0) * k / N; sh.lineTo(A.x + A.a * Math.cos(th), A.y + A.b * Math.sin(th)); }
      sh.closePath();
      const pared = malla(new THREE.ShapeGeometry(sh), M.pozo, 'pared'); pared.position.z = s * A.z; g.add(pared);
    }
  }
  return g;
}

// ======================================================================= decals
interface Malla2D { p: P2[]; t: number[] }
function poligono(c: P2[]): Malla2D {
  const tris = THREE.ShapeUtils.triangulateShape(c.map(q => new THREE.Vector2(q[0], q[1])), []);
  return { p: c.map(q => [q[0], q[1]] as P2), t: tris.flat() };
}
/** Red-green refinement: splits only the edges longer than maxLado (shared midpoints, no cracks). */
function subdividir(m: Malla2D, maxLado: number): Malla2D {
  const p = m.p.slice(); let t = m.t.slice();
  const largo = (a: number, b: number) => Math.hypot(p[a][0] - p[b][0], p[a][1] - p[b][1]);
  for (let it = 0; it < 12; it++) {
    const cache = new Map<string, number>(); const nt: number[] = []; let cambio = false;
    const mid = (a: number, b: number) => {
      if (largo(a, b) <= maxLado) return -1;
      const k = a < b ? a + ',' + b : b + ',' + a; let r = cache.get(k);
      if (r === undefined) { r = p.length; p.push([(p[a][0] + p[b][0]) / 2, (p[a][1] + p[b][1]) / 2]); cache.set(k, r); }
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
  return { p, t };
}
/** A strip of width w along a polyline (resampled every `paso`); closed if `cerrado`. */
function cinta2(pts0: P2[], w: number, paso = 0.008, cerrado = false): Malla2D {
  const pts = cerrado ? [...pts0, pts0[0]] : pts0, q: P2[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]]; const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / paso));
    for (let k = 0; k < n; k++) q.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  q.push(pts[pts.length - 1]);
  const p: P2[] = [], t: number[] = [];
  for (let i = 0; i < q.length; i++) {
    const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l * w / 2, ny = dx / l * w / 2;
    p.push([q[i][0] + nx, q[i][1] + ny], [q[i][0] - nx, q[i][1] - ny]);
    if (i > 0) { const k = 2 * i; t.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  return { p, t };
}
/** Ring between two concentric ellipses (or the same ellipse scaled by k0 and k1). */
function anilloElipse(cx: number, cy: number, rx: number, ry: number, k0: number, k1: number, n = 72): Malla2D {
  const p: P2[] = [], t: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    p.push([cx + rx * k0 * c, cy + ry * k0 * s], [cx + rx * k1 * c, cy + ry * k1 * s]);
    if (i > 0) { const k = 2 * i; t.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  return { p, t };
}
const elipse = (cx: number, cy: number, rx: number, ry: number, n = 64): P2[] => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as P2; });

type Vista = 'lado' | 'arriba' | 'frente' | 'detras';
const FUERA: Record<Vista, THREE.Vector3> = { lado: new THREE.Vector3(0, 0, 1), arriba: new THREE.Vector3(0, 1, 0), frente: new THREE.Vector3(1, 0, 0), detras: new THREE.Vector3(-1, 0, 0) };
/** The skin point a 2D view coordinate lands on: side (x, y), top (x, z), front and rear (z, y). */
function proyectar(v: Vista, a: number, b: number): THREE.Vector3 {
  if (v === 'lado') return new THREE.Vector3(a, b, ladoZ(a, b));
  if (v === 'arriba') return new THREE.Vector3(a, arribaY(a, b), b);
  if (v === 'frente') return new THREE.Vector3(frenteX(a, b), b, a);
  return new THREE.Vector3(detrasX(a, b), b, a);
}
/** Outward skin normal at a projected point. */
function normalEn(v: Vista, a: number, b: number): THREE.Vector3 {
  const e = 0.004, p0 = proyectar(v, a, b), pa = proyectar(v, a + e, b), pb = proyectar(v, a, b + e);
  const n = new THREE.Vector3().crossVectors(pa.sub(p0), pb.sub(p0)).normalize();
  if (n.dot(FUERA[v]) < 0) n.negate();
  return n;
}
/** Projects a 2D mesh onto the skin from one view, lifted `sep` along the view direction; `espejo` mirrors it to the other side. */
function calco(m: Malla2D, vista: Vista, sep: number, maxLado = 0.02, espejo = false): THREE.BufferGeometry {
  const s = subdividir(m, maxLado), f = FUERA[vista];
  const pos: number[] = [], ok: boolean[] = [];
  for (const [a, b] of s.p) {
    const v = proyectar(vista, a, b), bueno = Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z); ok.push(bueno);
    v.addScaledVector(f, sep);
    if (espejo) v.z = -v.z;
    pos.push(bueno ? v.x : 0, bueno ? v.y : 0, bueno ? v.z : 0);
  }
  const idx: number[] = [];
  for (let i = 0; i < s.t.length; i += 3) if (ok[s.t[i]] && ok[s.t[i + 1]] && ok[s.t[i + 2]]) idx.push(s.t[i], s.t[i + 1], s.t[i + 2]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (idx.length) {
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(); let sum = 0;
    const dir = f.clone(); if (espejo) dir.z = -dir.z;
    for (let i = 0; i < idx.length; i += 3) { A.fromArray(pos, idx[i] * 3); B.fromArray(pos, idx[i + 1] * 3); C.fromArray(pos, idx[i + 2] * 3); sum += B.sub(A).cross(C.sub(A)).dot(dir); }
    if (sum < 0) for (let i = 0; i < idx.length; i += 3) { const k = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = k; }
  }
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** Both sides: the drawing and its mirror image, in one geometry. */
const calcoAmbos = (m: Malla2D, vista: Vista, sep: number, maxLado = 0.02) => unir([calco(m, vista, sep, maxLado), calco(m, vista, sep, maxLado, true)]);

/** Places an object at p with its +Z along n and +Y as close to up as possible. */
function colocar(o: THREE.Object3D, p: THREE.Vector3, n: THREE.Vector3, arriba = new THREE.Vector3(0, 1, 0)) {
  o.position.copy(p); o.up.copy(arriba); o.lookAt(p.clone().add(n));
}

/**
 * A shut line that goes right round the section at (about) one x: from the
 * floor edge on one side over the top to the other, `x(t)` giving the x at
 * each point (t = 0 at the floor edge, 1 at the top centre).
 */
function juntaSeccion(xDe: (t: number) => number, ancho: number, t0: number): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [], n = 90;
  const pt = (t: number, lado: number, dx: number) => {
    const x = xDe(t) + dx, s = sec(x), [z, y] = punto(s, t), [z1, y1] = punto(s, Math.min(1, t + 0.003)), [z0, y0] = punto(s, Math.max(0, t - 0.003));
    let ny = -(z1 - z0), nz = y1 - y0; const l = Math.hypot(ny, nz) || 1; ny /= l; nz /= l;
    if (nz < -1e-6 || (Math.abs(nz) < 1e-6 && ny < 0)) { ny = -ny; nz = -nz; }
    const zz = lado * z, yy = y + bulto(x, zz) + 0.0012 * ny + (y > 0.45 ? 0.0006 : 0);
    return [x, yy, lado * (z + 0.0012 * nz)];
  };
  const ts: [number, number][] = [];
  for (let k = 0; k <= n; k++) ts.push([t0 + (1 - t0) * k / n, 1]);
  for (let k = n - 1; k >= 0; k--) ts.push([t0 + (1 - t0) * k / n, -1]);
  ts.forEach(([t, lado], i) => { pos.push(...pt(t, lado, ancho / 2), ...pt(t, lado, -ancho / 2)); if (i > 0) { const a = 2 * i; idx.push(a - 2, a - 1, a, a - 1, a + 1, a); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ===================================================================== assembly
let PLANTILLA: THREE.Group | null = null;
function construir(): THREE.Group {
  if (!PLANTILLA) PLANTILLA = construirPlantilla();
  const M = mats(), g = PLANTILLA.clone(true), copias = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  g.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    let c = copias.get(m.geometry); if (!c) { c = m.geometry.clone(); copias.set(m.geometry, c); }
    m.geometry = c;
    if (m.material === M.perspex || m.material === M.perspexCalco) m.customDepthMaterial = sinSombra;
  });
  return g;
}

function construirPlantilla(): THREE.Group {
  const M = mats();
  const g = new THREE.Group(); g.name = 'jaguarD';
  const add = (...o: THREE.Object3D[]) => { for (const x of o) g.add(x); };
  const xs = filasX();

  // ---------------------------------------------------------------- body
  add(carroceria(xs, M), pozos(M));

  // ---------------------------------------------------------------- the air intake: lip, duct, mesh, radiator
  {
    const anillos = [[0, 1], [0.012, 0.995], [0.04, 0.975], [0.09, 0.95], [0.16, 0.93], [0.24, 0.92]];
    const N = 72, pos: number[] = [], idx: number[] = [];
    anillos.forEach(([dx, k], i) => {
      for (let j = 0; j < N; j++) { const a = j / N * Math.PI * 2; pos.push(X_MORRO - 0.0008 - dx, BOCA.cy + BOCA.b * k * Math.sin(a), BOCA.a * k * Math.cos(a)); }
      if (i > 0) for (let j = 0; j < N; j++) { const a = (i - 1) * N + j, b = (i - 1) * N + (j + 1) % N; idx.push(a, a + N, b, b, a + N, b + N); }
    });
    const ducto = new THREE.BufferGeometry(); ducto.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ducto.setIndex(idx); ducto.computeVertexNormals();
    add(malla(ducto, M.pozo, 'toma'));
    const rejaG = new THREE.CircleGeometry(1, 64); rejaG.scale(BOCA.a * 0.97, BOCA.b * 0.96, 1); rejaG.rotateY(Math.PI / 2); rejaG.translate(X_MORRO - 0.05, BOCA.cy, 0);
    add(malla(rejaG, M.malla, 'rejilla'));
    const rad = new THREE.CircleGeometry(1, 48); rad.scale(BOCA.a * 0.93, BOCA.b * 0.93, 1); rad.rotateY(Math.PI / 2); rad.translate(X_MORRO - 0.22, BOCA.cy, 0);
    add(malla(rad, M.hollin, 'radiador'));
  }

  // ---------------------------------------------------------------- headlamps under Perspex fairings
  for (const s of [1, -1]) {
    const zc = FARO.z, P = proyectar('frente', zc, FARO.y), n = normalEn('frente', zc, FARO.y);
    // the recess: a dark band from the hole's edge into the wing, closed at the back
    const N = 60, pos: number[] = [], idx: number[] = [], fondo = P.clone().addScaledVector(n, -0.13);
    const ejeF = new THREE.Vector3(1, 0, 0);
    for (let k = 0; k <= N; k++) {
      const a = k / N * Math.PI * 2, z = zc + FARO.rz * 0.88 * Math.cos(a), y = FARO.y + FARO.ry * 0.88 * Math.sin(a);
      const q = proyectar('frente', z, y); q.x -= 0.002;
      const r = q.clone().addScaledVector(n, -0.12).lerp(fondo, 0.3);
      pos.push(q.x, q.y, s * q.z, r.x, r.y, s * r.z);
      if (k > 0) { const b = 2 * k; idx.push(b - 2, b - 1, b, b - 1, b + 1, b); }
    }
    const copa = new THREE.BufferGeometry(); copa.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); copa.setIndex(idx); copa.computeVertexNormals();
    add(malla(copa, M.negroMate, 'faro'));
    const tapaFondo = new THREE.CircleGeometry(0.11, 32); const tf = malla(tapaFondo, M.negroMate, 'faro');
    const fondoS = fondo.clone(); fondoS.z *= s; const nS = n.clone(); nS.z *= s;
    colocar(tf, fondoS.clone().addScaledVector(nS, 0.01), nS); add(tf);
    // the lamp itself, looking forward, a little inside the recess
    const lamp = faro(M, 0.1, 0.1); lamp.remove(lamp.children[0]);
    const centro = P.clone().addScaledVector(n, -0.045); centro.z *= s;
    lamp.position.copy(centro); lamp.quaternion.setFromUnitVectors(ejeF, new THREE.Vector3(1, 0, 0).lerp(nS, 0.35).normalize()); add(lamp);
  }
  {
    const borde = elipse(FARO.z, FARO.y, FARO.rz, FARO.ry, 72);
    add(malla(calcoAmbos(poligono(borde), 'frente', 0.0045, 0.012), M.perspexCalco, 'cubre-faro'));
    add(malla(calcoAmbos(anilloElipse(FARO.z, FARO.y, FARO.rz, FARO.ry, 0.80, 0.985, 72), 'frente', 0.0018, 0.012), M.gomaJunta, 'junta-faro'));
    add(malla(calcoAmbos(anilloElipse(FARO.z, FARO.y, FARO.rz, FARO.ry, 0.975, 1.045, 72), 'frente', 0.0052, 0.012), M.cromoCalco, 'aro-faro'));
  }

  // ---------------------------------------------------------------- cockpit: padded rim, inner walls, seat, dash, wheel
  {
    const borde = contornoRect(CABINA, 160);
    const pts = borde.map(([x, z]) => new THREE.Vector3(x, arribaY(x, z) + 0.006, z));
    add(malla(tubo(pts, 0.021, 12, 220, true), M.cueroNegro, 'borde-cabina'));
    const pos: number[] = [], idx: number[] = [];
    borde.forEach(([x, z], i) => {
      // the wall stands 15 mm inside the outline, from just under the roll to the floor
      const [cx, cz] = [CABINA.x, CABINA.z], dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz) || 1;
      const xi = x - dx / l * 0.012, zi = z - dz / l * 0.012;
      pos.push(xi, arribaY(x, z) - 0.006, zi, xi, 0.16, zi);
      const a = 2 * i, b = 2 * ((i + 1) % borde.length); idx.push(a, a + 1, b, b, a + 1, b + 1);
    });
    const pared = new THREE.BufferGeometry(); pared.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pared.setIndex(idx); pared.computeVertexNormals();
    add(malla(pared, M.interior, 'paredes-cabina'));
    add(cabina(M, Z_PILOTO));
  }

  // ---------------------------------------------------------------- headrest fairing and fin (one piece, behind the driver)
  {
    const es = [
      E(-1.735, 0.700, 0.775, 0.115, 0.115, 0.060, 2.3),
      E(-1.760, 0.700, 0.900, 0.125, 0.122, 0.085, 2.3),
      E(-1.800, 0.700, 0.962, 0.132, 0.126, 0.090, 2.3),
      E(-1.875, 0.690, 0.990, 0.135, 0.118, 0.075, 2.3),
      E(-2.000, 0.680, 1.000, 0.115, 0.080, 0.042, 2.2),
      E(-2.170, 0.660, 1.014, 0.080, 0.038, 0.018, 2.1),
      E(-2.360, 0.630, 1.032, 0.050, 0.016, 0.010, 2.0),
      E(-2.560, 0.590, 1.055, 0.036, 0.011, 0.008, 2.0),
      E(-2.740, 0.550, 1.075, 0.030, 0.010, 0.0075, 2.0),
      E(-2.880, 0.520, 1.068, 0.027, 0.0095, 0.007, 2.0),
      E(-2.960, 0.500, 1.005, 0.024, 0.009, 0.0065, 2.0),
      E(-3.010, 0.480, 0.875, 0.020, 0.008, 0.006, 2.0),
      E(-3.038, 0.470, 0.710, 0.017, 0.007, 0.005, 2.0),
      E(-3.052, 0.470, 0.585, 0.013, 0.006, 0.004, 2.0),
    ];
    const f = loft(es, { N: 64, sub: 8 }); f.translate(0, 0, Z_PILOTO);
    add(malla(f, M.pintura, 'aleta'));
    // the leather pad on the front of the headrest
    const cojin = caja(0.05, 0.13, 0.19, 0.022); cojin.rotateZ(0.25); cojin.translate(-1.77, 0.865, Z_PILOTO);
    add(malla(cojin, M.cueroNegro, 'reposacabezas'));
  }

  // ---------------------------------------------------------------- wraparound Perspex screen in front of the driver
  {
    const xc = CABINA.x + CABINA.hx - 0.17, zc = Z_PILOTO + 0.012, ax = 0.215, az = 0.316, NU = 48, NV = 8;
    const pos: number[] = [], idx: number[] = [], base: THREE.Vector3[] = [];
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, ph = -Math.PI / 2 + Math.PI * u;
      const x = xc + ax * Math.cos(ph), z = zc + az * Math.sin(ph);
      const yb = arribaY(Math.min(x, -0.74), z) + (x < CABINA.x + CABINA.hx ? 0.024 : 0.004);
      const e = Math.abs(2 * u - 1), h = 0.195 * Math.pow(Math.max(0, 1 - Math.pow(e, 7)), 0.5) * (1 - 0.55 * e * e);
      const dir = new THREE.Vector3(xc - x, 0, zc - z).normalize();
      base.push(new THREE.Vector3(x, yb, z));
      for (let j = 0; j <= NV; j++) {
        const v = j / NV;
        pos.push(x + dir.x * 0.62 * h * v, yb + 0.80 * h * v, z + dir.z * 0.62 * h * v);
      }
      if (i > 0) for (let j = 0; j < NV; j++) { const a = (i - 1) * (NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    }
    const pb = new THREE.BufferGeometry(); pb.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pb.setIndex(idx); pb.computeVertexNormals();
    add(malla(pb, M.perspex, 'parabrisas'));
    add(malla(tubo(base, 0.0055, 8, 96), M.cromo, 'parabrisas-base'));
  }

  // ---------------------------------------------------------------- shut lines
  {
    // bonnet (the whole front clam, wings included): down the side behind the front arch, across the scuttle
    const xBonnet = (t: number) => -0.545 - 0.075 * Math.min(1, Math.max(0, (t - TS[3]) / (TS[6] - TS[3])));
    const juntas: THREE.BufferGeometry[] = [juntaSeccion(xBonnet, 0.004, TS[1] + 0.01)];
    // doors on both sides (the driver's and the passenger's), the top edge on the shoulder
    const puerta: P2[] = [];
    const [x0, x1, y0, y1, r] = [-1.215, -0.700, 0.345, 0.728, 0.075];
    for (const [cx, cy, a0] of [[x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r, y0 + r, Math.PI], [x1 - r, y0 + r, 1.5 * Math.PI]] as [number, number, number][])
      for (let k = 0; k <= 6; k++) { const a = a0 + (Math.PI / 2) * k / 6; puerta.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    juntas.push(calcoAmbos(cinta2(puerta, 0.004, 0.008, true), 'lado', 0.0012, 0.01));
    // tonneau cover over the passenger seat, and the spare-wheel lid in the tail
    juntas.push(calco(cinta2(contornoRect(TONNEAU, 140), 0.004, 0.008, true), 'arriba', 0.0012, 0.01));
    const tapaCola = contornoRect({ x: -2.80, z: 0, hx: 0.21, hz: 0.235, r: 0.09 }, 100);
    juntas.push(calco(cinta2(tapaCola, 0.004, 0.008, true), 'arriba', 0.0012, 0.01));
    add(malla(unir(juntas), M.junta, 'juntas'));
    // Dzus fasteners round the tonneau
    const dzus: THREE.BufferGeometry[] = [];
    contornoRect({ ...TONNEAU, hx: TONNEAU.hx - 0.022, hz: TONNEAU.hz - 0.022, r: TONNEAU.r - 0.022 }, 26).forEach(([x, z]) => {
      const c = torno([[0.0072, 0], [0.0072, 0.0012], [0.006, 0.0022], [0, 0.0026]], 14); const o = new THREE.Mesh(c);
      colocar(o, new THREE.Vector3(x, arribaY(x, z) + 0.0005, z), normalEn('arriba', x, z)); o.updateMatrix(); c.applyMatrix4(o.matrix); dzus.push(c);
    });
    add(malla(unir(dzus), M.cromo, 'dzus'));
  }

  // ---------------------------------------------------------------- number roundels (blank white discs) on both flanks
  add(malla(calcoAmbos(poligono(elipse(-1.545, 0.47, 0.165, 0.165, 72)), 'lado', 0.0009, 0.02), M.blanco, 'disco-numero'));

  // ---------------------------------------------------------------- small fittings
  {
    const cromo: THREE.BufferGeometry[] = [];
    const pon = (geo: THREE.BufferGeometry, p: THREE.Vector3, n: THREE.Vector3, arriba?: THREE.Vector3) => {
      const o = new THREE.Object3D(); colocar(o, p, n, arriba); o.updateMatrix(); geo.applyMatrix4(o.matrix); return geo;
    };
    // bonnet catches: a plate across the shut line on each side, with its lever
    for (const s of [1, -1]) {
      const x = -0.545, y = 0.50, p = proyectar('lado', x, y), n = normalEn('lado', x, y);
      if (s < 0) { p.z = -p.z; n.z = -n.z; }
      cromo.push(pon(caja(0.085, 0.026, 0.006, 0.003, 12), p.clone().addScaledVector(n, 0.002), n));
      cromo.push(pon(caja(0.055, 0.012, 0.01, 0.005, 10).translate(0.012, 0, 0.006), p.clone().addScaledVector(n, 0.002), n));
    }
    // quick-release fuel filler on the tail deck, left of the fin
    {
      const x = -2.42, z = -0.26, p = new THREE.Vector3(x, arribaY(x, z), z), n = normalEn('arriba', x, z);
      const tapa = torno([[0.062, 0], [0.062, 0.006], [0.058, 0.012], [0.05, 0.016], [0.02, 0.019], [0, 0.019]], 40);
      cromo.push(pon(tapa, p, n));
      cromo.push(pon(caja(0.075, 0.014, 0.012, 0.006, 10).translate(0.02, 0, 0.022), p, n));
    }
    // rear-view mirror on the scuttle, ahead of the screen's inner end
    {
      const x = -0.70, z = 0.045, yb = arribaY(x, z);
      cromo.push(tubo([new THREE.Vector3(x, yb, z), new THREE.Vector3(x - 0.01, yb + 0.05, z), new THREE.Vector3(x - 0.03, yb + 0.085, z)], 0.006, 8, 10));
      const cabeza = torno([[0.044, -0.012], [0.046, 0], [0.042, 0.008], [0.03, 0.012], [0, 0.013]], 32); cabeza.rotateY(Math.PI / 2); cabeza.translate(x - 0.035, yb + 0.105, z);
      cromo.push(cabeza);
      const espejo = new THREE.CircleGeometry(0.04, 32); espejo.rotateY(-Math.PI / 2); espejo.translate(x - 0.048, yb + 0.105, z);
      add(malla(espejo, M.reflector, 'retrovisor'));
    }
    add(malla(unir(cromo), M.cromo, 'herrajes'));
    // tail lamps: small round red lamps in chrome rims, low on the tail
    const pilotos: THREE.BufferGeometry[] = [], aros: THREE.BufferGeometry[] = [];
    for (const s of [1, -1]) {
      const z = 0.40, y = 0.50, p = proyectar('detras', z, y), n = normalEn('detras', z, y);
      if (s < 0) { p.z = -p.z; n.z = -n.z; }
      aros.push(pon(new THREE.TorusGeometry(0.034, 0.005, 8, 32), p.clone().addScaledVector(n, 0.002), n));
      const dome = torno([[0.032, 0], [0.03, 0.008], [0.022, 0.015], [0.012, 0.018], [0, 0.019]], 28);
      pilotos.push(pon(dome, p.clone().addScaledVector(n, -0.004), n));
    }
    add(malla(unir(aros), M.cromo, 'piloto'), malla(unir(pilotos), M.piloto, 'piloto'));
    // side exhaust: out under the left sill, just ahead of the left rear wheel
    const ruta = [new THREE.Vector3(-1.40, 0.15, -0.50), new THREE.Vector3(-1.62, 0.152, -0.60), new THREE.Vector3(-1.76, 0.162, -0.70), new THREE.Vector3(-1.815, 0.168, -0.775)];
    add(malla(tubo(ruta, 0.034, 16, 40), M.escape, 'escape'));
    const fin = ruta[3], tg = fin.clone().sub(ruta[2]).normalize();
    const boca = new THREE.Mesh(new THREE.CircleGeometry(0.031, 24), M.hollin); colocar(boca, fin.clone().addScaledVector(tg, -0.012), tg); add(boca);
    const labio = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.0035, 8, 32), M.escape); colocar(labio, fin, tg); add(labio);
  }

  // ---------------------------------------------------------------- wheels
  for (const [x, via] of [[0, VIA_DEL], [-BATALLA, VIA_TRAS]] as [number, number][]) {
    const r = rueda(M); r.position.set(x, RC, via / 2); add(r);
    const l = rueda(M); l.position.set(x, RC, -via / 2); l.rotation.y = Math.PI; add(l);
  }

  g.traverse(o => { const m = o as THREE.Mesh; if (!m.isMesh) return; m.castShadow = true; m.receiveShadow = true; });
  return g;
}

export { construir };
