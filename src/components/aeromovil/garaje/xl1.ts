import * as THREE from 'three';
import type { VehiculoGaraje } from './tipos';

/*
 * Volkswagen XL1 (2013), modelado por código.
 *
 * Medidas de la ficha (auto-data.net y cars-data.com, coinciden con la ficha
 * de prensa de VW): largo 3888, ancho 1665, alto 1153, batalla 2224 mm.
 * Neumáticos 115/80 R15 delante y 145/55 R16 detrás (los dos ~566 mm de
 * diámetro). Las vías (1410 / 1290 mm) y los voladizos se han sacado de fotos
 * frontales y traseras, no de la ficha.
 *
 * Cómo está hecho: la carrocería es UNA superficie cerrada que se barre a lo
 * largo de X. En cada x se calcula una sección (diez puntos de control que
 * salen de tablas interpoladas con curvas monótonas, unidos con Catmull-Rom
 * centrípeta). Morro y cola se cierran redondeando: las últimas secciones son
 * la misma sección encogida hacia dentro un radio, y una tapa plana.
 * Todo lo que va pegado a la chapa (cristales, faros, pilotos, juntas de
 * puerta) es una «calcomanía»: un dibujo 2D proyectado sobre esa misma
 * superficie desde un lado, desde arriba, desde delante o desde detrás.
 */

// ------------------------------------------------------------------ medidas
const LARGO = 3.888, ANCHO = 1.665, ALTO = 1.153, BATALLA = 2.224;
const X_MORRO = 0.73;                 // voladizo delantero (fotos)
const X_COLA = X_MORRO - LARGO;       // -3.158
// Morro y cola se cierran con un redondeo elíptico: avanza R en X y encoge la
// sección D_LADO por los costados y D_VERT por arriba y abajo (el morro del XL1
// es una U muy redonda vista desde arriba y bastante recta vista de lado).
const R_MORRO = 0.16, R_COLA = 0.07;
const D_MORRO = { lado: 0.17, vert: 0.10 }, D_COLA = { lado: 0.07, vert: 0.07 };
const X0_MORRO = X_MORRO - R_MORRO, X0_COLA = X_COLA + R_COLA;
const VIA_DEL = 1.41, VIA_TRAS = 1.29;
const R_RUEDA = 0.283;
const ARCO = { x: 0, y: R_RUEDA, r: 0.338, zCorte: 0.55 }; // paso de rueda delantero

type P2 = [number, number];

// ------------------------------------------------- curvas monótonas (Fritsch-Carlson)
function monotona(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length; const d: number[] = []; const m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

// ----------------------------------------------------- tabla de secciones
// Por cada x (de delante a atrás): suelo yb, semiancho máximo hw a la altura ys,
// radio del canto inferior rb, cintura (hb, yc), costado del habitáculo (zg, yg),
// arranque del techo (hr, yh) y altura en el eje yt.
//            x       yb     hw      ys    rb     yc     hb     yg     zg     yh     hr     yt
const TABLA: number[][] = [
  [0.57, 0.145, 0.775, 0.400, 0.200, 0.600, 0.700, 0.685, 0.520, 0.715, 0.270, 0.725],
  [0.45, 0.135, 0.805, 0.410, 0.180, 0.650, 0.730, 0.735, 0.560, 0.762, 0.290, 0.770],
  [0.20, 0.130, 0.826, 0.420, 0.130, 0.700, 0.750, 0.775, 0.580, 0.797, 0.310, 0.805],
  [0.00, 0.130, 0.832, 0.430, 0.110, 0.725, 0.760, 0.800, 0.600, 0.818, 0.320, 0.824],
  [-0.15,  0.130, 0.8325, 0.440, 0.10, 0.750, 0.760, 0.830, 0.585, 0.842, 0.330, 0.848],
  [-0.45,  0.130, 0.8325, 0.460, 0.10, 0.775, 0.755, 0.915, 0.590, 0.950, 0.360, 0.958],
  [-0.75,  0.130, 0.8325, 0.470, 0.10, 0.790, 0.752, 0.970, 0.598, 1.050, 0.380, 1.066],
  [-1.05,  0.130, 0.830, 0.475, 0.10, 0.805, 0.748, 1.000, 0.594, 1.115, 0.390, 1.136],
  [-1.30,  0.130, 0.825, 0.475, 0.10, 0.815, 0.744, 1.000, 0.585, 1.134, 0.380, 1.153],
  [-1.60,  0.130, 0.818, 0.475, 0.10, 0.822, 0.740, 0.990, 0.570, 1.112, 0.360, 1.128],
  [-1.95,  0.130, 0.810, 0.470, 0.10, 0.820, 0.735, 0.960, 0.550, 1.048, 0.330, 1.058],
  [-2.224, 0.130, 0.805, 0.460, 0.10, 0.805, 0.725, 0.920, 0.545, 0.985, 0.310, 0.995],
  [-2.55,  0.135, 0.790, 0.440, 0.11, 0.780, 0.708, 0.860, 0.570, 0.898, 0.360, 0.905],
  [-2.85, 0.170, 0.772, 0.400, 0.110, 0.745, 0.660, 0.790, 0.550, 0.810, 0.360, 0.820],
  [-3.088, 0.210, 0.745, 0.380, 0.080, 0.720, 0.600, 0.750, 0.520, 0.762, 0.300, 0.772],
];
const CURVAS = (() => {
  const filas = [...TABLA].reverse();
  const xs = filas.map(f => f[0]);
  return Array.from({ length: 11 }, (_, k) => monotona(xs, filas.map(f => f[k + 1])));
})();

/** Los diez puntos de control (z, y) de media sección, del centro del suelo al centro del techo. */
function controles(x: number): P2[] {
  const [yb, hw, ys, rb, yc, hb, yg, zg, yh, hr, yt] = CURVAS.map(c => c(x));
  return [
    [0, yb], [hw * 0.55, yb], [hw - rb, yb + rb * 0.12], [hw - rb * 0.22, yb + rb * 0.62], [hw, ys],
    [hb, yc], [zg, yg], [hr, yh], [hr * 0.5, yt - (yt - yh) * 0.15], [0, yt],
  ];
}

function cr(p0: P2, p1: P2, p2: P2, p3: P2, t: number): P2 {
  const tj = (a: P2, b: P2) => Math.max(1e-4, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
  const t0 = 0, t1 = t0 + tj(p0, p1), t2 = t1 + tj(p1, p2), t3 = t2 + tj(p2, p3);
  const u = t1 + (t2 - t1) * t;
  const L = (a: P2, b: P2, ta: number, tb: number): P2 => {
    const wa = (tb - u) / (tb - ta), wb = (u - ta) / (tb - ta);
    return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb];
  };
  const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
  const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
  return L(B1, B2, t1, t2);
}

const TRAMOS = [4, 4, 3, 6, 7, 6, 6, 4, 4];
const MEDIA = TRAMOS.reduce((a, b) => a + b, 0) + 1; // 45 puntos en media sección
const M = 2 * (MEDIA - 1);                            // 88 puntos en la sección entera
const N_SUELO = 8;                                    // los primeros puntos son el fondo (material oscuro)

interface Seccion { z: Float64Array; y: Float64Array }

function seccionBase(x: number): Seccion {
  const c = controles(x);
  const ext: P2[] = [[-c[1][0], c[1][1]], ...c, [-c[8][0], c[8][1]]];
  const media: P2[] = [];
  for (let s = 0; s < TRAMOS.length; s++)
    for (let k = 0; k < TRAMOS[s]; k++) media.push(cr(ext[s], ext[s + 1], ext[s + 2], ext[s + 3], k / TRAMOS[s]));
  media.push(c[9]);
  const z = new Float64Array(M), y = new Float64Array(M);
  for (let j = 0; j < MEDIA; j++) { z[j] = media[j][0]; y[j] = media[j][1]; }
  for (let j = MEDIA; j < M; j++) { const k = M - j; z[j] = -media[k][0]; y[j] = media[k][1]; }
  return { z, y };
}

/** Encoge una sección hacia dentro (a lo largo de la normal): dLado en los costados, dVert arriba y abajo. */
function encoger(s: Seccion, dLado: number, dVert: number): Seccion {
  const z = new Float64Array(M), y = new Float64Array(M);
  for (let j = 0; j < M; j++) {
    const a = (j - 1 + M) % M, b = (j + 1) % M;
    const tz = s.z[b] - s.z[a], ty = s.y[b] - s.y[a], l = Math.hypot(tz, ty) || 1;
    // la sección va en sentido antihorario: la normal exterior es (ty, -tz)
    const nz = ty / l, ny = -tz / l, d = dLado * nz * nz + dVert * ny * ny;
    z[j] = s.z[j] - d * nz; y[j] = s.y[j] - d * ny;
  }
  return { z, y };
}

const BASE_MORRO = seccionBase(X0_MORRO), BASE_COLA = seccionBase(X0_COLA);
function seccion(x: number): Seccion {
  if (x > X0_MORRO) {
    const s = Math.min(1, (x - X0_MORRO) / R_MORRO), k = 1 - Math.sqrt(1 - s * s);
    return encoger(BASE_MORRO, D_MORRO.lado * k, D_MORRO.vert * k);
  }
  if (x < X0_COLA) {
    const s = Math.min(1, (X0_COLA - x) / R_COLA), k = 1 - Math.sqrt(1 - s * s);
    return encoger(BASE_COLA, D_COLA.lado * k, D_COLA.vert * k);
  }
  return seccionBase(x);
}

// ------------------------------------------------ proyecciones sobre la chapa
// Las proyecciones consultan miles de secciones: se precalculan cada 2 mm y se
// interpola entre las dos vecinas (error < 1 mm, y 30 veces más rápido).
const N_CACHE = 1950;
let CACHE: Seccion[] | null = null;
function seccionRapida(x: number): Seccion {
  if (!CACHE) CACHE = Array.from({ length: N_CACHE + 1 }, (_, i) => seccion(X_COLA + (X_MORRO - X_COLA) * i / N_CACHE));
  const f = Math.min(N_CACHE - 1e-9, Math.max(0, (x - X_COLA) / (X_MORRO - X_COLA) * N_CACHE));
  const i = Math.floor(f), t = f - i, a = CACHE[i], b = CACHE[i + 1];
  const z = new Float64Array(M), y = new Float64Array(M);
  for (let j = 0; j < M; j++) { z[j] = a.z[j] + (b.z[j] - a.z[j]) * t; y[j] = a.y[j] + (b.y[j] - a.y[j]) * t; }
  return { z, y };
}
function dentro(s: Seccion, z: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = M - 1; i < M; j = i++) {
    if ((s.y[i] > y) !== (s.y[j] > y) && z < (s.z[j] - s.z[i]) * (y - s.y[i]) / (s.y[j] - s.y[i]) + s.z[i]) c = !c;
  }
  return c;
}
/** z de la chapa (lado izquierdo, z > 0) a la altura y. */
function ladoZ(x: number, y: number): number {
  const s = seccionRapida(x); let best = NaN;
  for (let j = 0; j < MEDIA - 1; j++) {
    const y0 = s.y[j], y1 = s.y[j + 1];
    if ((y - y0) * (y - y1) <= 0 && y0 !== y1) {
      const z = s.z[j] + (s.z[j + 1] - s.z[j]) * (y - y0) / (y1 - y0);
      if (!(z <= best)) best = z;
    }
  }
  return best;
}
/** y de la chapa vista desde arriba en (x, z). */
function arribaY(x: number, z: number): number {
  const s = seccionRapida(x); let best = NaN;
  for (let j = 0; j < M; j++) {
    const k = (j + 1) % M, z0 = s.z[j], z1 = s.z[k];
    if ((z - z0) * (z - z1) <= 0 && z0 !== z1) {
      const y = s.y[j] + (s.y[k] - s.y[j]) * (z - z0) / (z1 - z0);
      if (!(y <= best)) best = y;
    }
  }
  return best;
}
/** x de la chapa vista desde delante en (z, y). */
function frenteX(z: number, y: number): number {
  if (dentro(seccionRapida(X_MORRO), z, y)) return X_MORRO;
  let lo = -0.3, hi = X_MORRO;
  if (!dentro(seccionRapida(lo), z, y)) return NaN;
  for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (dentro(seccionRapida(m), z, y)) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/** x de la chapa vista desde detrás en (z, y). */
function traseraX(z: number, y: number): number {
  if (dentro(seccionRapida(X_COLA), z, y)) return X_COLA;
  let lo = X_COLA + 0.9, hi = X_COLA;
  if (!dentro(seccionRapida(lo), z, y)) return NaN;
  for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (dentro(seccionRapida(m), z, y)) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

type Proy = (u: number, v: number) => THREE.Vector3;
const LADO: Proy = (x, y) => new THREE.Vector3(x, y, ladoZ(x, y));
const ARRIBA: Proy = (x, z) => new THREE.Vector3(x, arribaY(x, z), z);
const FRENTE: Proy = (z, y) => new THREE.Vector3(frenteX(z, y), y, z);
const DETRAS: Proy = (z, y) => new THREE.Vector3(traseraX(z, y), y, z);
const FUERA = { lado: new THREE.Vector3(0, 0, 1), arriba: new THREE.Vector3(0, 1, 0), frente: new THREE.Vector3(1, 0, 0), detras: new THREE.Vector3(-1, 0, 0) };
type Vista = keyof typeof FUERA;
const PROY: Record<Vista, Proy> = { lado: LADO, arriba: ARRIBA, frente: FRENTE, detras: DETRAS };

/** Normal exterior de la chapa en un punto proyectado. */
function normalEn(v: Vista, a: number, b: number): THREE.Vector3 {
  const P = PROY[v], e = 0.006;
  const p0 = P(a, b), pa = P(a + e, b), pb = P(a, b + e);
  const n = new THREE.Vector3().crossVectors(pa.sub(p0), pb.sub(p0)).normalize();
  if (n.dot(FUERA[v]) < 0) n.negate();
  return n;
}

// ------------------------------------------------------- calcomanías
interface Malla2D { p: P2[]; t: number[] }

function poligono(c: P2[]): Malla2D {
  const tris = THREE.ShapeUtils.triangulateShape(c.map(q => new THREE.Vector2(q[0], q[1])), []);
  return { p: c.map(q => [q[0], q[1]] as P2), t: tris.flat() };
}
/**
 * Refina la malla partiendo solo los lados que pasan de maxLado (refinamiento
 * rojo-verde: un triángulo con 1, 2 o 3 lados partidos se divide en 2, 3 o 4).
 * Los puntos medios se comparten, así que la malla sigue sin grietas.
 */
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
      if (n === 0) { nt.push(...v); continue; }
      cambio = true;
      if (n === 3) { nt.push(v[0], ms[0], ms[2], ms[0], v[1], ms[1], ms[2], ms[1], v[2], ms[0], ms[1], ms[2]); continue; }
      // gira el triángulo para que el primer lado partido sea el 0
      let r = 0; while (ms[r] < 0) r++;
      const a = v[r], b = v[(r + 1) % 3], c = v[(r + 2) % 3];
      const mab = ms[r], mbc = ms[(r + 1) % 3], mca = ms[(r + 2) % 3];
      if (n === 1) {
        if (mab >= 0) nt.push(a, mab, c, mab, b, c);
      } else if (mbc >= 0) nt.push(a, mab, c, mab, mbc, c, mab, b, mbc);
      else nt.push(a, mab, mca, mab, b, c, mab, c, mca);
    }
    t = nt;
    if (!cambio) break;
  }
  return { p, t };
}
/** Una cinta de ancho w a lo largo de una polilínea (remuestreada cada paso). */
function cinta(pts: P2[], w: number, paso = 0.02): Malla2D {
  const q: P2[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]]; const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / paso));
    for (let k = 0; k < n; k++) q.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  q.push(pts[pts.length - 1]);
  const p: P2[] = []; const t: number[] = [];
  for (let i = 0; i < q.length; i++) {
    const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l * w / 2, ny = dx / l * w / 2;
    p.push([q[i][0] + nx, q[i][1] + ny], [q[i][0] - nx, q[i][1] - ny]);
    if (i > 0) { const k = 2 * i; t.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  return { p, t };
}
/** Redondea las esquinas de un polígono (Chaikin). */
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
function espejoZ(c: P2[]): P2[] { return c.map(([a, b]) => [-a, b] as P2); }

/** Proyecta una malla 2D sobre la chapa y la separa `sep` metros hacia fuera. */
function calco(m: Malla2D, vista: Vista, sep: number, maxLado = 0.03, espejo = false): THREE.BufferGeometry {
  const T0 = performance.now();
  const s = subdividir(m, maxLado); const P = PROY[vista]; const f = FUERA[vista];
  const pos: number[] = []; const ok: boolean[] = [];
  for (const [a, b] of s.p) {
    const v = P(a, b); const bueno = isFinite(v.x) && isFinite(v.y) && isFinite(v.z); ok.push(bueno);
    v.addScaledVector(f, sep);
    if (espejo) v.z = -v.z;
    if (bueno) pos.push(v.x, v.y, v.z); else pos.push(0, 0, 0);
  }
  const idx: number[] = [];
  for (let i = 0; i < s.t.length; i += 3) if (ok[s.t[i]] && ok[s.t[i + 1]] && ok[s.t[i + 2]]) idx.push(s.t[i], s.t[i + 1], s.t[i + 2]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // orienta los triángulos hacia fuera
  if (idx.length) {
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(); let sum = 0;
    const dir = f.clone(); if (espejo) dir.z = -dir.z;
    for (let i = 0; i < idx.length; i += 3) {
      A.fromArray(pos, idx[i] * 3); B.fromArray(pos, idx[i + 1] * 3); C.fromArray(pos, idx[i + 2] * 3);
      sum += B.sub(A).cross(C.sub(A)).dot(dir);
    }
    if (sum < 0) for (let i = 0; i < idx.length; i += 3) { const k = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = k; }
  }
  g.setIndex(idx); g.computeVertexNormals();
  (globalThis as any).__T = ((globalThis as any).__T || []).concat([[vista, s.p.length, Math.round(performance.now() - T0)]]);
  return g;
}

// ------------------------------------------------------------- carrocería
function listaX(): number[] {
  const xs: number[] = [];
  const NR = 14;
  for (let k = NR; k > 0; k--) xs.push(X0_MORRO + R_MORRO * Math.sin(k / NR * Math.PI / 2));
  let x = X0_MORRO;
  while (x > X0_COLA) {
    xs.push(x);
    const cerca = Math.abs(x - ARCO.x) < ARCO.r + 0.08;
    x -= cerca ? 0.008 : 0.02;
  }
  xs.push(X0_COLA);
  for (let k = 1; k <= NR; k++) xs.push(X0_COLA - R_COLA * Math.sin(k / NR * Math.PI / 2));
  return xs;
}

function carroceria(): THREE.BufferGeometry {
  const xs = listaX(); const F = xs.length;
  const pos = new Float32Array((F * M + 2) * 3);
  for (let i = 0; i < F; i++) {
    const s = seccion(xs[i]);
    for (let j = 0; j < M; j++) {
      let x = xs[i], y = s.y[j]; const z = s.z[j];
      // ajusta al círculo del paso de rueda los vértices que caen cerca de su borde
      if (Math.abs(z) > ARCO.zCorte) {
        const dx = x - ARCO.x, dy = y - ARCO.y, d = Math.hypot(dx, dy);
        if (Math.abs(d - ARCO.r) < 0.022 && d > 1e-6) { x = ARCO.x + dx / d * ARCO.r; y = ARCO.y + dy / d * ARCO.r; }
      }
      pos.set([x, y, z], (i * M + j) * 3);
    }
  }
  // centros de las tapas
  const tapa = (s: Seccion, x: number, k: number) => {
    let cy = 0; for (let j = 0; j < M; j++) cy += s.y[j]; cy /= M;
    pos.set([x, cy, 0], k * 3);
  };
  const cN = F * M, cC = F * M + 1;
  tapa(seccion(X_MORRO), X_MORRO, cN); tapa(seccion(X_COLA), X_COLA, cC);

  const enArco = (k: number) => {
    const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2];
    return Math.abs(z) > ARCO.zCorte - 1e-6 && Math.hypot(x - ARCO.x, y - ARCO.y) <= ARCO.r + 1e-4;
  };
  const h = (j: number) => (j < MEDIA ? j : M - j);
  const chapa: number[] = [], fondo: number[] = [];
  const tri = (a: number, b: number, c: number, jj: number[]) => {
    if (enArco(a) && enArco(b) && enArco(c)) return;
    (jj.every(j => h(j) <= N_SUELO) ? fondo : chapa).push(a, b, c);
  };
  for (let i = 0; i < F - 1; i++) for (let j = 0; j < M; j++) {
    const jn = (j + 1) % M;
    const a = i * M + j, b = (i + 1) * M + j, c = (i + 1) * M + jn, d = i * M + jn;
    tri(a, c, b, [j, jn]); tri(a, d, c, [j, jn]);
  }
  for (let j = 0; j < M; j++) {
    const jn = (j + 1) % M;
    chapa.push(cN, jn, j);
    chapa.push(cC, (F - 1) * M + j, (F - 1) * M + jn);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex([...chapa, ...fondo]);
  g.addGroup(0, chapa.length, 0); g.addGroup(chapa.length, fondo.length, 1);
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------ piezas de torno
/** Revoluciona un perfil (r, h) alrededor del eje Z. `mod` deforma el radio (dibujo del neumático). */
function torno(perfil: P2[], segs: number, mod?: (ang: number, h: number, r: number) => number): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = []; const n = perfil.length;
  for (let s = 0; s <= segs; s++) {
    const a = s / segs * Math.PI * 2, c = Math.cos(a), si = Math.sin(a);
    for (const [r0, h] of perfil) { const r = mod ? mod(a, h, r0) : r0; pos.push(r * c, r * si, h); }
  }
  for (let s = 0; s < segs; s++) for (let k = 0; k < n - 1; k++) {
    const a = s * n + k, b = (s + 1) * n + k;
    idx.push(a, b, b + 1, a, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Contorno de una polilínea gruesa, con ingletes limitados. */
function trazo(pts: P2[], w: number): THREE.Shape {
  const izq: P2[] = [], der: P2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[Math.min(pts.length - 1, i + 1)];
    const n1 = norm2([b[0] - a[0], b[1] - a[1]]), n2 = norm2([c[0] - b[0], c[1] - b[1]]);
    const t1: P2 = i === 0 ? n2 : n1, t2: P2 = i === pts.length - 1 ? n1 : n2;
    const tx = t1[0] + t2[0], ty = t1[1] + t2[1]; const tl = Math.hypot(tx, ty) || 1;
    const nx = -ty / tl, ny = tx / tl; const cos = nx * -t1[1] + ny * t1[0];
    const k = Math.min(2.2, 1 / Math.max(0.3, cos)) * w / 2;
    izq.push([b[0] + nx * k, b[1] + ny * k]); der.push([b[0] - nx * k, b[1] - ny * k]);
  }
  const s = new THREE.Shape(); const todo = [...izq, ...der.reverse()];
  s.moveTo(todo[0][0], todo[0][1]); for (const q of todo.slice(1)) s.lineTo(q[0], q[1]); s.closePath();
  return s;
}
function norm2(v: P2): P2 { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }

function rectRedondo(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// ------------------------------------------------------------- materiales
function materiales(colorChapa = 0xf3f3ef) {
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);
  const calcoMat = (p: THREE.MeshPhysicalMaterialParameters) => fis({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, ...p });
  return {
    chapa: fis({ color: colorChapa, roughness: 0.32, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.35, sheenColor: new THREE.Color(0xe8eefc), sheenRoughness: 0.4, iridescence: 0.12, iridescenceIOR: 1.3 }),
    fondo: fis({ color: 0x1d1f22, roughness: 0.75, metalness: 0.1 }),
    cristal: calcoMat({ color: 0x0b0f14, roughness: 0.04, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.86 }),
    negro: calcoMat({ color: 0x0c0d0f, roughness: 0.55, metalness: 0.0 }),
    junta: calcoMat({ color: 0x3a3c40, roughness: 0.7 }),
    faro: calcoMat({ color: 0x1b2027, roughness: 0.06, metalness: 0.5, clearcoat: 1 }),
    led: calcoMat({ color: 0xffffff, emissive: 0xeaf4ff, emissiveIntensity: 1.6, roughness: 0.2 }),
    piloto: calcoMat({ color: 0x8a0d10, emissive: 0xff1c1c, emissiveIntensity: 0.55, roughness: 0.12, clearcoat: 1 }),
    cromo: calcoMat({ color: 0xd8dade, roughness: 0.12, metalness: 1.0 }),
    gris: calcoMat({ color: 0x8e9297, roughness: 0.35, metalness: 0.7 }),
    rejilla: calcoMat({ color: 0x2b2e33, roughness: 0.5, metalness: 0.3 }),
    caucho: fis({ color: 0x151515, roughness: 0.92, metalness: 0.0 }),
    llanta: fis({ color: 0xeeeeea, roughness: 0.3, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.1 }),
    aluminio: fis({ color: 0xb8bcc2, roughness: 0.3, metalness: 1.0 }),
    oscuro: fis({ color: 0x1a1b1d, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide }),
    cromoPieza: fis({ color: 0xe2e4e8, roughness: 0.1, metalness: 1.0 }),
    placa: fis({ color: 0xf6f6f2, roughness: 0.45 }),
    azul: fis({ color: 0x1240a0, roughness: 0.5 }),
    tinta: fis({ color: 0x111111, roughness: 0.5 }),
  };
}
type Mats = ReturnType<typeof materiales>;

// ---------------------------------------------------------------- matrícula
const SEG7: Record<string, number[]> = {
  '0': [0, 1, 2, 3, 4, 5], '1': [1, 2], '2': [0, 1, 6, 4, 3], '3': [0, 1, 6, 2, 3], '4': [5, 6, 1, 2],
  '5': [0, 5, 6, 2, 3], '6': [0, 5, 4, 3, 2, 6], '7': [0, 1, 2], '8': [0, 1, 2, 3, 4, 5, 6], '9': [0, 1, 2, 3, 5, 6],
  L: [5, 4, 3], E: [0, 5, 6, 4, 3], H: [5, 4, 1, 2, 6],
};
function matricula(texto: string, mt: Mats): THREE.Group {
  const g = new THREE.Group(); const W = 0.52, H = 0.11;
  g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(rectRedondo(W, H, 0.008), { depth: 0.004, bevelEnabled: false }), mt.placa));
  const banda = new THREE.Mesh(new THREE.ExtrudeGeometry(rectRedondo(0.04, H - 0.01, 0.005), { depth: 0.002, bevelEnabled: false }), mt.azul);
  banda.position.set(-W / 2 + 0.026, 0, 0.004); g.add(banda);
  const ch = 0.072, cw = 0.034, paso = 0.05; let x = -W / 2 + 0.075;
  const seg = (k: number): P2[] => {
    const a = cw / 2, b = ch / 2;
    return ([[[-a, b], [a, b]], [[a, b], [a, 0]], [[a, 0], [a, -b]], [[-a, -b], [a, -b]], [[-a, -b], [-a, 0]], [[-a, 0], [-a, b]], [[-a, 0], [a, 0]]] as P2[][])[k];
  };
  for (const c of texto) {
    if (c === ' ') { x += paso * 0.6; continue; }
    const trazos: P2[][] = c === 'X' ? [[[-cw / 2, ch / 2], [cw / 2, -ch / 2]], [[-cw / 2, -ch / 2], [cw / 2, ch / 2]]] : (SEG7[c] ?? []).map(seg);
    for (const t of trazos) {
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(trazo(t, 0.008), { depth: 0.0015, bevelEnabled: false }), mt.tinta);
      m.position.set(x, 0, 0.004); g.add(m);
    }
    x += paso;
  }
  return g;
}

/** Coloca un objeto con su +Z mirando según la normal, manteniendo +Y arriba. */
function colocar(o: THREE.Object3D, p: THREE.Vector3, n: THREE.Vector3, arriba = new THREE.Vector3(0, 1, 0)) {
  o.position.copy(p); o.up.copy(arriba); o.lookAt(p.clone().add(n));
}

// ------------------------------------------------------------------ ruedas
function rueda(ancho: number, rLlanta: number, delantera: boolean, mt: Mats): THREE.Group {
  const g = new THREE.Group(); const R = R_RUEDA, w = ancho / 2;
  // neumático: flanco abombado, hombro y banda con dos surcos
  const flanco = (sg: number): P2[] => [
    [rLlanta - 0.004, sg * (w - 0.012)], [rLlanta + 0.012, sg * (w - 0.004)], [rLlanta + 0.03, sg * (w + 0.002)],
    [(rLlanta + R) / 2 + 0.01, sg * (w + 0.004)], [R - 0.022, sg * w], [R - 0.01, sg * (w - 0.008)], [R - 0.003, sg * (w - 0.018)],
  ];
  const t = w - 0.018;
  const banda: P2[] = [];
  const surcos = [-0.33, 0.33];
  const nb = 12;
  for (let k = 0; k <= nb; k++) {
    const h = -t + 2 * t * k / nb; banda.push([R, h]);
    for (const s of surcos) if (Math.abs(h / t - s) < 1e-6) { /* nada */ }
  }
  const tb: P2[] = [];
  for (const [r, h] of banda) {
    const hn = h / t; const enSurco = surcos.some(s => Math.abs(hn - s) < 0.09);
    tb.push([enSurco ? r - 0.006 : r, h]);
  }
  const perfil: P2[] = [...flanco(-1), ...tb, ...flanco(1).reverse()];
  const N = 33;
  const neum = torno(perfil, 132, (a, h, r) => {
    if (r < R - 0.002) return r;
    const hn = h / t; const f = (a / (Math.PI * 2)) * N + Math.abs(hn) * 0.9;
    return f - Math.floor(f) < 0.26 && Math.abs(hn) > 0.12 ? r - 0.005 : r;
  });
  g.add(new THREE.Mesh(neum, mt.caucho));

  // llanta: tambor interior, aro exterior de aluminio y tapacubos aerodinámico
  const tambor = new THREE.Mesh(new THREE.CylinderGeometry(rLlanta, rLlanta, ancho - 0.02, 48, 1, true).rotateX(Math.PI / 2), mt.oscuro);
  g.add(tambor);
  const tapaInt = new THREE.Mesh(new THREE.CircleGeometry(rLlanta, 48), mt.oscuro); tapaInt.position.z = -w * 0.4; g.add(tapaInt);
  const aro = torno([[rLlanta - 0.012, w - 0.006], [rLlanta - 0.004, w + 0.0], [rLlanta + 0.004, w - 0.002], [rLlanta + 0.006, w - 0.012]], 96);
  g.add(new THREE.Mesh(aro, mt.aluminio));
  const hD = (r: number) => w - 0.016 + 0.01 * (r / rLlanta) ** 2; // el tapacubos es algo cóncavo
  const disco: P2[] = [];
  for (let k = 0; k <= 10; k++) { const r = (rLlanta - 0.012) * (1 - k / 10); disco.push([r, hD(r)]); }
  g.add(new THREE.Mesh(torno(disco, 96), delantera ? mt.llanta : mt.aluminio));
  // cinco álabes negros curvados (tapacubos del XL1)
  const nAl = 5;
  for (let i = 0; i < nAl; i++) {
    const a0 = i * Math.PI * 2 / nAl;
    const sh = new THREE.Shape(); const pts: P2[] = [];
    const r0 = 0.06, r1 = rLlanta - 0.03;
    for (let k = 0; k <= 8; k++) { const f = k / 8; const r = r0 + (r1 - r0) * f; const a = a0 + 0.55 * f * f + 0.02; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
    for (let k = 8; k >= 0; k--) { const f = k / 8; const r = r0 + (r1 - r0) * f; const a = a0 + 0.55 * f * f + 0.10 + 0.42 * f; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
    const sp = suave(pts, 1);
    sh.moveTo(sp[0][0], sp[0][1]); for (const q of sp.slice(1)) sh.lineTo(q[0], q[1]); sh.closePath();
    const geo = new THREE.ShapeGeometry(sh);
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < p.count; k++) p.setZ(k, hD(Math.hypot(p.getX(k), p.getY(k))) + 0.0015);
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, delantera ? mt.fondo : mt.oscuro));
  }
  // buje (sin logotipos de marca: el garaje compara formas, no insignias)
  const buje = new THREE.Mesh(torno([[0.055, w - 0.012], [0.054, w - 0.006], [0.045, w - 0.002], [0, w - 0.0015]], 48), mt.fondo);
  g.add(buje);
  return g;
}

// ------------------------------------------------------------------ montaje
function construir(colorChapa?: number): THREE.Group {
  const mt = materiales(colorChapa);
  const g = new THREE.Group(); g.name = 'xl1';
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, sombra = true) => {
    const m = new THREE.Mesh(geo, mat); m.castShadow = sombra; m.receiveShadow = true; g.add(m); return m;
  };
  const par = (m: Malla2D, vista: Vista, sep: number, mat: THREE.Material, maxLado = 0.03) => {
    add(calco(m, vista, sep, maxLado), mat, false);
    if (vista === 'lado') add(calco(m, vista, sep, maxLado, true), mat, false);
  };

  // carrocería
  const cuerpo = new THREE.Mesh(carroceria(), [mt.chapa, mt.fondo]); cuerpo.castShadow = true; cuerpo.receiveShadow = true; g.add(cuerpo);

  // pasos de rueda delanteros (forro y pared interior)
  const aMin = Math.asin((0.13 - ARCO.y) / ARCO.r);
  for (const sg of [1, -1]) {
    const forro = new THREE.CylinderGeometry(ARCO.r + 0.004, ARCO.r + 0.004, 0.84 - ARCO.zCorte, 40, 1, true, aMin + Math.PI / 2, Math.PI - 2 * aMin);
    forro.rotateX(Math.PI / 2); // eje del cilindro a lo largo de Z; el arco queda por encima del suelo
    const mf = add(forro, mt.oscuro, false); mf.position.set(ARCO.x, ARCO.y, sg * (ARCO.zCorte + 0.84) / 2);
    const sh = new THREE.Shape(); sh.absarc(0, 0, ARCO.r + 0.004, aMin, Math.PI - aMin, false); sh.closePath();
    const mp = add(new THREE.ShapeGeometry(sh, 24), mt.oscuro, false); mp.position.set(ARCO.x, ARCO.y, sg * ARCO.zCorte);
  }

  // --- cristales: parabrisas (visto desde arriba) con su marco negro
  const parabrisas: P2[] = suave([
    [-0.17, 0], [-0.19, 0.40], [-0.25, 0.62], [-0.33, 0.70], [-0.55, 0.63], [-0.80, 0.51], [-0.97, 0.41], [-1.02, 0.22], [-1.03, 0],
    [-1.02, -0.22], [-0.97, -0.41], [-0.80, -0.51], [-0.55, -0.63], [-0.33, -0.70], [-0.25, -0.62], [-0.19, -0.40],
  ], 2);
  add(calco(poligono(parabrisas), 'arriba', 0.002, 0.04), mt.negro, false);
  const parabrisasCristal = parabrisas.map(([x, z]) => [x - 0.5 * 0 + (x > -0.6 ? -0.012 : 0.012), z * 0.965] as P2);
  add(calco(poligono(parabrisasCristal), 'arriba', 0.005, 0.04), mt.cristal, false);

  // ventanilla de la puerta y ventanilla trasera pequeña (vistas de lado)
  const ventana: P2[] = suave([[-0.42, 0.835], [-0.62, 0.90], [-0.85, 0.975], [-1.05, 1.005], [-1.32, 1.0], [-1.48, 0.955], [-1.47, 0.875], [-1.10, 0.855], [-0.70, 0.842]], 2);
  par(poligono(ventana), 'lado', 0.002, mt.negro);
  par(poligono(ventana.map(([x, y]) => [x + (x < -0.95 ? 0.01 : -0.01) * 0 , y] as P2).map(([x, y]) => [-0.95 + (x + 0.95) * 0.97, 0.92 + (y - 0.92) * 0.9] as P2)), 'lado', 0.005, mt.cristal);
  const trasera: P2[] = suave([[-1.60, 0.875], [-1.60, 0.965], [-1.70, 0.955], [-1.98, 0.905], [-1.95, 0.885]], 2);
  par(poligono(trasera), 'lado', 0.002, mt.negro);
  par(poligono(trasera.map(([x, y]) => [-1.75 + (x + 1.75) * 0.94, 0.91 + (y - 0.91) * 0.8] as P2)), 'lado', 0.005, mt.cristal);

  // --- juntas de la puerta de ala de gaviota y de la tapa de la rueda trasera
  const ancho = 0.006;
  par(cinta(suave([[-0.30, 0.83], [-0.36, 0.72], [-0.37, 0.50], [-0.40, 0.44], [-0.60, 0.425], [-1.40, 0.425], [-1.52, 0.45], [-1.56, 0.62], [-1.575, 0.85], [-1.575, 1.0]], 2, false), ancho), 'lado', 0.0015, mt.junta);
  const techoJ: P2[] = suave([[-1.575, 0.585], [-1.575, 0.4], [-1.56, 0.17], [-1.45, 0.14], [-1.03, 0.14]], 2, false);
  add(calco(cinta(techoJ, ancho), 'arriba', 0.0015), mt.junta, false);
  add(calco(cinta(techoJ.map(([x, z]) => [x, -z] as P2), ancho), 'arriba', 0.0015), mt.junta, false);
  const tapaRueda: P2[] = [];
  for (let k = 0; k <= 24; k++) { const a = Math.PI * k / 24; tapaRueda.push([-2.224 + 0.40 * Math.cos(a), 0.20 + 0.42 * Math.sin(a)]); }
  par(cinta(tapaRueda, ancho), 'lado', 0.0015, mt.junta);

  // --- frontal: faros, barra, toma de aire, logo, matrícula
  for (const sg of [1, -1]) {
    const faro: P2[] = suave([[0.33, 0.49], [0.45, 0.50], [0.60, 0.518], [0.70, 0.537], [0.755, 0.548], [0.778, 0.535], [0.786, 0.48], [0.782, 0.43], [0.70, 0.42], [0.56, 0.433], [0.44, 0.455], [0.345, 0.478]], 2);
    const f = sg > 0 ? faro : espejoZ(faro);
    add(calco(poligono(f), 'frente', 0.002, 0.02), mt.faro, false);
    const led: P2[] = [[0.37, 0.477], [0.47, 0.458], [0.58, 0.443], [0.70, 0.433], [0.775, 0.433], [0.792, 0.45]];
    add(calco(cinta(sg > 0 ? led : espejoZ(led), 0.007, 0.01), 'frente', 0.004), mt.led, false);
    const proy: P2[] = [[0.60, 0.495], [0.69, 0.505], [0.75, 0.508]];
    add(calco(cinta(sg > 0 ? proy : espejoZ(proy), 0.016, 0.01), 'frente', 0.0035), mt.cromo, false);
  }
  add(calco(cinta([[-0.345, 0.484], [0, 0.488], [0.345, 0.484]], 0.026, 0.02), 'frente', 0.002), mt.negro, false);
  add(calco(cinta([[-0.345, 0.472], [0, 0.476], [0.345, 0.472]], 0.006, 0.02), 'frente', 0.003), mt.cromo, false);
  const toma: P2[] = suave([[-0.64, 0.29], [-0.50, 0.25], [0.50, 0.25], [0.64, 0.29], [0.62, 0.262], [0.49, 0.208], [-0.49, 0.208], [-0.62, 0.262]], 2);
  add(calco(poligono(toma), 'frente', 0.002, 0.03), mt.negro, false);
  for (const d of [0, 0.016]) add(calco(cinta(suave([[-0.6, 0.262 - d * 0.6], [-0.48, 0.225 - d], [0.48, 0.225 - d], [0.6, 0.262 - d * 0.6]], 2, false), 0.005), 'frente', 0.004), mt.rejilla, false);
  add(calco(cinta(suave([[-0.66, 0.205], [-0.5, 0.18], [0.5, 0.18], [0.66, 0.205]], 2, false), 0.022), 'frente', 0.003), mt.gris, false);
  {
    const placa = matricula('XL 2013', mt); const pp = FRENTE(0, 0.375); colocar(placa, pp.add(new THREE.Vector3(0.002, 0, 0)), new THREE.Vector3(1, 0, 0)); g.add(placa);
  }

  // --- trasera: piloto en U, banda gris, logo, matrícula, difusor
  const uL: P2[] = [[0.70, 0.40], [0.66, 0.50], [0.62, 0.60], [0.585, 0.68], [0.55, 0.712], [0.42, 0.72], [0, 0.723]];
  const u: P2[] = [...uL, ...espejoZ(uL).reverse().slice(1)];
  add(calco(cinta(suave(u, 2, false), 0.036, 0.012), 'detras', 0.003), mt.piloto, false);
  // parte baja trasera gris plata con el hueco negro del difusor
  const bajoT: P2[] = suave([[-0.73, 0.37], [0.73, 0.37], [0.74, 0.22], [0.68, 0.17], [-0.68, 0.17], [-0.74, 0.22]], 1);
  add(calco(poligono(bajoT), 'detras', 0.002, 0.045), mt.gris, false);
  const hueco: P2[] = suave([[-0.58, 0.32], [0.58, 0.32], [0.50, 0.19], [-0.50, 0.19]], 2);
  add(calco(poligono(hueco), 'detras', 0.003, 0.03), mt.negro, false);
  for (const yy of [0.225, 0.25]) add(calco(cinta([[-0.53, yy], [0.53, yy]], 0.007), 'detras', 0.0045), mt.rejilla, false);
  for (const sg of [1, -1]) add(calco(cinta([[sg * 0.30, 0.287], [sg * 0.50, 0.287]], 0.02, 0.01), 'detras', 0.0045), mt.piloto, false);
  // junta de la tapa del motor (desde las esquinas de los pilotos hasta las rejillas)
  for (const sg of [1, -1]) add(calco(cinta(suave([[-3.11, sg * 0.60], [-2.85, sg * 0.50], [-2.5, sg * 0.38], [-2.25, sg * 0.31], [-2.05, sg * 0.29]], 2, false), 0.006), 'arriba', 0.0015), mt.junta, false);
  // sensores de aparcamiento
  for (const z of [-0.26, 0.26]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.006, 16).rotateZ(Math.PI / 2), mt.gris); s.position.set(traseraX(z, 0.39) - 0.002, 0.39, z); g.add(s); }
  {
    const placa = matricula('XL 2013', mt); const pp = DETRAS(0, 0.59); colocar(placa, pp.add(new THREE.Vector3(-0.002, 0, 0)), new THREE.Vector3(-1, 0, 0)); g.add(placa);
  }
  // rejillas del motor en la cubierta y tercera luz de freno (vistas desde arriba)
  for (const sg of [1, -1]) {
    const rej: P2[] = suave([[-1.97, 0.08], [-1.97, 0.10], [-1.97, 0.19], [-1.97, 0.21], [-1.99, 0.215], [-2.18, 0.235], [-2.20, 0.235], [-2.22, 0.22], [-2.22, 0.10], [-2.22, 0.08], [-2.20, 0.075], [-1.99, 0.075]], 1).map(([x, z]) => [x, sg * z] as P2);
    add(calco(poligono(rej), 'arriba', 0.002, 0.02), mt.negro, false);
    for (let k = 0; k < 5; k++) { const x = -2.0 - k * 0.044; add(calco(cinta([[x, sg * 0.09], [x, sg * 0.205]], 0.008, 0.02), 'arriba', 0.004), mt.rejilla, false); }
  }
  add(calco(cinta([[-1.86, -0.20], [-1.85, 0], [-1.86, 0.20]], 0.035, 0.02), 'arriba', 0.003), mt.piloto, false);
  // --- cámaras retrovisoras (el XL1 no lleva espejos)
  for (const sg of [1, -1]) {
    const x = -0.44, y = 0.80; const zc = ladoZ(x, y);
    const capsula = torno([[0, -0.06], [0.012, -0.055], [0.02, -0.035], [0.022, 0.0], [0.019, 0.03], [0.012, 0.045], [0.0, 0.05]], 32);
    capsula.rotateY(Math.PI / 2); // eje a lo largo de X
    capsula.scale(1, 0.8, 1);
    const c = add(capsula, mt.chapa); c.position.set(x - 0.03, y + 0.01, sg * (zc + 0.06));
    const lente = new THREE.Mesh(new THREE.CircleGeometry(0.009, 20).rotateY(-Math.PI / 2), mt.fondo); lente.position.set(x - 0.03 - 0.0605, y + 0.01, sg * (zc + 0.06)); g.add(lente);
    const brazo = new THREE.Shape(); brazo.moveTo(-0.03, -0.008); brazo.lineTo(0.03, -0.008); brazo.lineTo(0.02, 0.008); brazo.lineTo(-0.02, 0.008); brazo.closePath();
    const bg = new THREE.ExtrudeGeometry(brazo, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2 });
    const b = add(bg, mt.fondo); b.position.set(x - 0.02, y + 0.005, sg > 0 ? zc - 0.02 : -zc - 0.05);
  }

  // --- ruedas
  for (const sg of [1, -1]) {
    const del = rueda(0.115, 0.1905, true, mt); del.position.set(0, R_RUEDA, sg * VIA_DEL / 2);
    if (sg < 0) del.rotation.y = Math.PI;
    g.add(del);
    const tra = rueda(0.145, 0.203, false, mt); tra.position.set(-BATALLA, R_RUEDA, sg * VIA_TRAS / 2);
    if (sg < 0) tra.rotation.y = Math.PI;
    g.add(tra);
  }
  g.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; } });
  return g;
}

/**
 * Silueta para el túnel y la superposición: [x, suelo, techo, media anchura]
 * cada 5 cm, sacada de las mismas secciones que la carrocería.
 */
function envolvente(): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (let x = X_MORRO; x >= X_COLA - 1e-9; x -= 0.05) {
    const s = seccion(Math.max(X_COLA + 1e-4, Math.min(X_MORRO - 1e-4, x)));
    let yb = Infinity, yt = -Infinity, hw = 0;
    for (let j = 0; j < M; j++) { yb = Math.min(yb, s.y[j]); yt = Math.max(yt, s.y[j]); hw = Math.max(hw, Math.abs(s.z[j])); }
    out.push([Math.round(x * 1000) / 1000, Math.round(yb * 1000) / 1000, Math.round(yt * 1000) / 1000, Math.round(hw * 1000) / 1000]);
  }
  return out;
}

export const VEHICULO: VehiculoGaraje = {
  id: 'xl1',
  nombre: 'Volkswagen XL1',
  largo: LARGO, ancho: ANCHO, alto: ALTO, batalla: BATALLA, viaDel: VIA_DEL, viaTras: VIA_TRAS,
  fuente: 'Ficha técnica VW XL1 (2013): auto-data.net/en/volkswagen-xl1-0.8-tdi-69hp-plug-in-hybrid-dsg-42793 y cars-data.com (3888 × 1665 × 1153 mm, batalla 2224 mm)',
  aero: { cd: 0.189, area: 1.5, masaVacio: 795, plazas: 2, vmax: 158, fuente: 'Cd 0,189, área frontal 1,5 m² (CdA 0,28 m²), 795 kg en vacío y 158 km/h limitada: Wikipedia, «Volkswagen 1-litre car» (datos de VW)' },
  envolvente: envolvente(),
  seccion: 2.6,
  construir,
};

/**
 * XL1 Concept (Salón de Qatar, 2011). VW lo presentó como el coche de preserie
 * y la forma es prácticamente la del XL1 de producción, así que se dibuja con
 * la misma carrocería; cambian el color (gris plata) y los datos declarados:
 * Cd 0,186 (el de producción subió a 0,189) y alto 1 156 mm. Fuente: Wikipedia,
 * «Volkswagen 1-litre car».
 */
export const VEHICULO_CONCEPTO: VehiculoGaraje = {
  ...VEHICULO,
  id: 'xl1concept', nombre: 'VW XL1 Concept 2011', alto: 1.156,
  fuente: 'XL1 Concept (Qatar, 2011): misma forma que el de producción; Cd 0,186 y alto 1 156 mm (Wikipedia, «Volkswagen 1-litre car»)',
  aero: { ...VEHICULO.aero!, cd: 0.186, fuente: 'Cd 0,186 del XL1 Concept de 2011 (el de producción subió a 0,189); área frontal 1,5 m², 795 kg y 158 km/h como el de producción: Wikipedia, «Volkswagen 1-litre car»' },
  construir: () => { const g = construir(0xb9bec5); g.name = 'xl1concept'; return g; },
};
