import * as THREE from 'three';
import {
  BATALLA, NEU, RC, R_LLANTA, T5, VIA_DEL, VIA_TRAS, X_COLA, X_MORRO,
  arribaY, detrasX, frenteX, ladoZ, monotona, punto, sec, tArriba, techoEn, type Sec,
} from './nusKruceForma';

/*
 * The NUS KRUCE built in three.js, as it raced (black disc wheel covers, a
 * blank number panel): skin, glass roof, side windows, lamps, wheels and a
 * single-seat cabin. The shape itself lives in `nusKruceForma.ts`. The
 * techniques are the XL1's and the Bala's (`xl1Modelo.ts`, `balaModelo.ts`):
 *
 * - The skin is one grid over (x, t): rows at fixed x, columns at given t,
 *   with the surface's own normals. Above the beltline the columns are laid
 *   out in three bands whose edges are the glass outlines: the side window,
 *   the blue roof rail and the glass canopy (windscreen, roof and rear
 *   window in one piece), so every glass edge is a smooth curve.
 * - The glass is the same (x, t) surface on the same rows, filling holes cut
 *   along exactly those columns: skin and glass share every edge vertex. The
 *   black frit is drawn by the glass shader from each vertex's distance to
 *   the outline.
 * - Shut lines, lamps, the front band and the blank number panel are 2D
 *   drawings in one view (side, top, front or rear) projected onto the skin.
 * - Built once per page into a template; every `construir()` hands out copies
 *   of its geometries (the viewer disposes those); mirrored parts share one.
 * No logos, sponsor names, lettering or race numbers: the livery is plain
 * metallic light blue and the number panels are blank.
 */

type P2 = [number, number];

// ======================================================================= layout
// Side-view outlines are (x, y); front and rear views (z, y) with z > 0 = right.
/** Wheel openings (side view): ellipses round the wheels, cut where |z| > z. */
export const ARCO_DEL = { x: 0.0, y: 0.235, a: 0.335, b: 0.335, z: 0.44 };
export const ARCO_TRAS = { x: -BATALLA, y: 0.235, a: 0.33, b: 0.335, z: 0.44 };
/** Top edge of the side window (side view). The window is where it stands above the beltline. */
const Y_VTOP = monotona([[0.30, 0.62], [0.18, 0.71], [0.05, 0.795], [-0.1, 0.87], [-0.3, 0.945], [-0.55, 1.0], [-0.85, 1.025], [-1.1, 1.02], [-1.3, 0.99], [-1.48, 0.94], [-1.62, 0.875], [-1.74, 0.80], [-1.85, 0.72]]);
/** Edge of the glass canopy (side view): the windscreen base over the nose, the roof glass between the rails, the rear glass down to the light bar. */
const Y_VIDRIO = monotona([[0.46, 0.66], [0.40, 0.645], [0.30, 0.665], [0.18, 0.745], [0.05, 0.835], [-0.1, 0.915], [-0.3, 0.99], [-0.55, 1.045], [-0.85, 1.07], [-1.1, 1.065], [-1.3, 1.035], [-1.48, 0.985], [-1.62, 0.925], [-1.74, 0.865], [-1.86, 0.815], [-1.98, 0.795], [-2.1, 0.79]]);
/** Where a side-view line meets the top line, by bisection between xa (line below the top) and xb (line above it). */
function cruce(linea: (x: number) => number, xa: number, xb: number): number {
  let a = xa, b = xb;
  for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (techoEn(m) - linea(m) > 0) a = m; else b = m; }
  return (a + b) / 2;
}
const cinturaEn = (x: number) => sec(x).c[5][1];
/** Where the window top line meets the beltline, by bisection (xa: window open; xb: closed). */
function puntaVentana(xa: number, xb: number): number {
  let a = xa, b = xb;
  for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (Y_VTOP(m) - cinturaEn(m) > 0) a = m; else b = m; }
  return (a + b) / 2;
}
/** Canopy glass from XC1 to XC0; side window from VX1 to VX0. */
export const XC0 = cruce(Y_VIDRIO, 0.2, 0.6), XC1 = cruce(Y_VIDRIO, -1.7, X_COLA + 0.001);
export const VX0 = puntaVentana(0.0, 0.32), VX1 = puntaVentana(-1.5, -1.95);
/** The door's front edge, which carries on up the window as a thin black pillar. */
const X_PILAR = -0.30;

// ======================================================================= materials
/** Glass casts no shadow (see xl1Modelo.ts). */
const sinSombra = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking, opacity: 0 });

/** Light-bar cells: small clear cells on a dark smoked field (u along the strip). */
function texturaLed(rojo: boolean): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const W = 256, H = 16, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); if (!c) return null;
  c.fillStyle = rojo ? '#3a0204' : '#262c34'; c.fillRect(0, 0, W, H);
  for (let x = 2; x < W; x += 8) {
    const g = c.createRadialGradient(x + 2, H / 2, 0.5, x + 2, H / 2, 5);
    g.addColorStop(0, rojo ? '#ff6a5a' : '#ffffff'); g.addColorStop(0.5, rojo ? '#e0141a' : '#dce9ff'); g.addColorStop(1, rojo ? 'rgba(90,0,4,0)' : 'rgba(40,50,60,0)');
    c.fillStyle = g; c.fillRect(x - 4, 0, 12, H);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  return t;
}
/** Metallic flake for the blue paint: a fine noise in the roughness. */
function texturaGrano(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const N = 128, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d'); if (!c) return null;
  c.fillStyle = '#7a7a7a'; c.fillRect(0, 0, N, N);
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 3200; i++) { const v = 90 + Math.floor(rnd() * 80); c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(rnd() * N, rnd() * N, 1, 1); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 8);
  return t;
}
/** Seat cloth: a fine woven grid. */
function texturaTela(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const N = 64, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d'); if (!c) return null;
  c.fillStyle = '#25272b'; c.fillRect(0, 0, N, N);
  c.strokeStyle = 'rgba(0,0,0,0.5)';
  for (let k = 0; k < N; k += 4) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, N); c.stroke(); c.beginPath(); c.moveTo(0, k); c.lineTo(N, k); c.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6);
  return t;
}

/**
 * The glass tint with its black frit: each glass vertex carries `borde`, its
 * distance to the glass outline minus the frit width; the shader thresholds
 * it over one pixel (fwidth), so the frit's inner edge is a crisp curve.
 * The KRUCE's canopy is a dark smoked polycarbonate.
 */
function frit(m: THREE.MeshPhysicalMaterial): THREE.MeshPhysicalMaterial {
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float borde;\nvarying float vBorde;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBorde = borde;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vBorde;')
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        '{ float w = max(fwidth(vBorde), 1e-5); float f = smoothstep(-w, w, vBorde);',
        '  diffuseColor.rgb = mix(vec3(0.006, 0.006, 0.008), vec3(0.012, 0.016, 0.022), f);',
        '  diffuseColor.a = mix(1.0, 0.78, f); }', // smoked: 78 % over the cabin
      ].join('\n'));
  };
  m.customProgramCacheKey = () => 'nus-frit';
  return m;
}

let MATS: ReturnType<typeof crearMateriales> | null = null;
function crearMateriales() {
  const F = THREE.FrontSide, D = THREE.DoubleSide;
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ side: F, ...p });
  const decal = (p: THREE.MeshPhysicalMaterialParameters) => fis({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, ...p });
  const grano = texturaGrano(), tela = texturaTela();
  // metallic light blue, as in the photos (sRGB about 40, 135, 215 in daylight). Lighter and less
  // metallic than the bot's first 0x1f78d1 / 0.55, which rendered royal blue against the park sky.
  const pintura = { color: 0x3a95e0, metalness: 0.4, roughness: 0.34, roughnessMap: grano, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.15 };
  return {
    chapa: fis(pintura),
    chapaCalco: decal(pintura),
    chapaDoble: fis({ ...pintura, side: D }),
    // inside of the skin, seen through the glass: dark trim (shadow side is the back too, see balaPiezas.ts)
    forro: new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.92, metalness: 0, side: THREE.BackSide, shadowSide: THREE.BackSide }),
    bajos: fis({ color: 0x15171a, roughness: 0.85, metalness: 0.05, side: D }),
    pozo: fis({ color: 0x070708, roughness: 0.92, side: D }),
    junta: decal({ color: 0x0a0a0b, roughness: 0.95, polygonOffsetFactor: -4, polygonOffsetUnits: -6, side: D }),
    tinte: frit(fis({ color: 0xffffff, transparent: true, depthWrite: false, alphaTest: 0.01, roughness: 0.1, metalness: 0, side: D })),
    reflejo: fis({ color: 0x000000, roughness: 0.03, metalness: 0, transparent: true, depthWrite: false, alphaTest: 0.01, blending: THREE.AdditiveBlending, envMapIntensity: 1.8 }),
    lente: decal({ color: 0x000000, roughness: 0.02, transparent: true, depthWrite: false, alphaTest: 0.01, blending: THREE.AdditiveBlending, envMapIntensity: 1.9, polygonOffsetFactor: -6, polygonOffsetUnits: -8 }),
    negroBrillo: decal({ color: 0x07080a, roughness: 0.12, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.04 }),
    negroMate: decal({ color: 0x0d0e10, roughness: 0.7, metalness: 0.05 }),
    plataCalco: decal({ color: 0xc9ced4, roughness: 0.18, metalness: 0.85, clearcoat: 0.6, polygonOffsetFactor: -5, polygonOffsetUnits: -6 }),
    led: decal({ color: 0xffffff, emissive: 0xf3f8ff, emissiveIntensity: 1.25, roughness: 0.3, polygonOffsetFactor: -5, polygonOffsetUnits: -6 }),
    ledTira: decal({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9, emissiveMap: texturaLed(false), map: texturaLed(false), roughness: 0.25, polygonOffsetFactor: -5, polygonOffsetUnits: -6 }),
    rojoLed: decal({ color: 0xffffff, emissive: 0xff2a20, emissiveIntensity: 0.85, emissiveMap: texturaLed(true), map: texturaLed(true), roughness: 0.2, polygonOffsetFactor: -5, polygonOffsetUnits: -6 }),
    ambar: decal({ color: 0xffb321, emissive: 0xff9a00, emissiveIntensity: 0.6, roughness: 0.25, clearcoat: 1, polygonOffsetFactor: -5, polygonOffsetUnits: -6 }),
    placa: decal({ color: 0xf4f4f0, roughness: 0.55, envMapIntensity: 0.6 }),
    // wheels: narrow eco tyres and flat black disc covers
    goma: fis({ color: 0x17181a, roughness: 0.88, metalness: 0 }),
    disco: fis({ color: 0x0c0d0f, roughness: 0.42, metalness: 0.15, clearcoat: 0.5, clearcoatRoughness: 0.2, side: D }),
    llantaOscura: fis({ color: 0x1b1c1e, roughness: 0.6, metalness: 0.4, side: D }),
    cromoPieza: fis({ color: 0xd8dbe0, roughness: 0.12, metalness: 1 }),
    // cabin
    tela: fis({ color: 0xffffff, map: tela, roughness: 0.95, side: D }),
    plastico: fis({ color: 0x17181a, roughness: 0.6, metalness: 0.1, side: D }),
    aluminio: fis({ color: 0x9ea3a9, roughness: 0.35, metalness: 0.85, side: D }),
    rojoPieza: fis({ color: 0xc81e24, roughness: 0.4, metalness: 0.1 }),
  };
}
function mats() { return MATS ?? (MATS = crearMateriales()); }
type Mats = ReturnType<typeof crearMateriales>;

// ===================================================================== the skin
/** Row spacing: fine at the tips, round the arches and at the glass ends, where outlines turn fast. */
function filasX(): number[] {
  const paso = (x: number) => {
    let p = 0.018;
    for (const A of [ARCO_DEL, ARCO_TRAS]) if (Math.abs(x - A.x) < A.a + 0.05) p = 0.009;
    for (const xc of [XC0, XC1, VX0, VX1]) { const d = Math.abs(x - xc); if (d < 0.08) p = Math.min(p, 0.0015 + d * 0.08); }
    if (Math.abs(x - X_PILAR) < 0.03) p = Math.min(p, 0.006);
    const dt = Math.min(X_MORRO - x, x - X_COLA);
    return Math.min(p, Math.max(0.0015, 0.08 * dt));
  };
  const xs: number[] = [];
  for (let x = X_MORRO; x > X_COLA; x -= paso(x)) xs.push(x);
  xs.push(X_COLA, XC0, XC1, VX0, VX1);
  xs.sort((a, b) => b - a);
  return xs.filter((x, i) => i === 0 || xs[i - 1] - x > 4e-4);
}

/**
 * Columns along the half-section, in four bands: [0, tA] the body up to the
 * beltline, [tA, tB] the side window, [tB, tC] the blue roof rail, [tC, 1]
 * the glass canopy. Where there is no window tB = tA; where there is no
 * canopy glass tC = 1 (the band edges are continuous, so the columns never
 * jump from row to row).
 */
const T_BAJO = (() => {
  const out: number[] = [];
  for (const [a, b, n] of [[0, 0.10, 5], [0.10, 0.15, 3], [0.15, 0.27, 7], [0.27, 0.40, 8], [0.40, 1, 6]] as [number, number, number][]) for (let k = 0; k < n; k++) out.push(a + (b - a) * k / n);
  return out.map(t => t * T5 / 1); // as fractions of T5 below (scaled per station)
})();
const N_TRAMO = [8, 6, 16]; // window, rail, glass
const K_A = T_BAJO.length, K_B = K_A + N_TRAMO[0], K_C = K_B + N_TRAMO[1];
const enVidrio = (x: number) => x <= XC0 + 1e-9 && x >= XC1 - 1e-9;
const enVentana = (x: number) => x <= VX0 + 1e-9 && x >= VX1 - 1e-9;

/** Band edges (tA, tB, tC) at a station. */
function bandas(s: Sec): [number, number, number] {
  const x = s.x;
  const tCr = enVidrio(x) ? tArriba(s, Y_VIDRIO(x)) : 1;
  const tA = Math.min(T5, tCr);
  const tB = enVentana(x) ? Math.min(tCr, Math.max(tA, tArriba(s, Y_VTOP(x)))) : tA;
  return [tA, tB, Math.max(tB, tCr)];
}
function columnasSkin(s: Sec): number[] {
  const [tA, tB, tC] = bandas(s), out: number[] = T_BAJO.map(t => t * tA / T5);
  const tramo = (a: number, b: number, n: number) => { for (let k = 0; k < n; k++) out.push(a + (b - a) * k / n); };
  tramo(tA, tB, N_TRAMO[0]); tramo(tB, tC, N_TRAMO[1]); tramo(tC, 1, N_TRAMO[2]);
  out.push(1);
  return out;
}

interface Rejilla { pos: Float32Array; nor: Float32Array; uv: Float32Array; filas: number; cols: number; n: number; xs: number[] }

/**
 * A grid over the skin: for each row x, the columns run over the t-values
 * `ts(s)` of one half, mirrored to the other side ('abajo' puts the bottom
 * centre in the middle of the row, 'arriba' the top centre; 'lado' keeps a
 * single side, z > 0). Normals are the surface's own.
 */
function rejilla(xs: number[], ts: (s: Sec) => number[], orden: 'abajo' | 'arriba' | 'lado'): Rejilla {
  const secs = xs.map(x => sec(x)), tsAll = secs.map(s => ts(s));
  const n = tsAll[0].length, cols = orden === 'lado' ? n : 2 * n - 1, filas = xs.length;
  const pos = new Float32Array(filas * cols * 3), nor = new Float32Array(filas * cols * 3), uv = new Float32Array(filas * cols * 2);
  const mitadX = (X_MORRO + X_COLA) / 2, e = 0.002;
  for (let i = 0; i < filas; i++) {
    const s = secs[i], tv = tsAll[i], sa = secs[Math.max(0, i - 1)], sb = secs[Math.min(filas - 1, i + 1)];
    const dx = xs[Math.max(0, i - 1)] - xs[Math.min(filas - 1, i + 1)];
    const half = tv.map(t => {
      const p = punto(s, t), q1 = punto(s, Math.min(1, t + e)), q0 = punto(s, Math.max(0, t - e)), pa = punto(sa, t), pb = punto(sb, t);
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
function haciaFuera(R: Rejilla, u: number, v: number, w: number): boolean {
  const P = R.pos, N = R.nor;
  const ax = P[v * 3] - P[u * 3], ay = P[v * 3 + 1] - P[u * 3 + 1], az = P[v * 3 + 2] - P[u * 3 + 2];
  const bx = P[w * 3] - P[u * 3], by = P[w * 3 + 1] - P[u * 3 + 1], bz = P[w * 3 + 2] - P[u * 3 + 2];
  const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  return nx * (N[u * 3] + N[v * 3] + N[w * 3]) + ny * (N[u * 3 + 1] + N[v * 3 + 1] + N[w * 3 + 1]) + nz * (N[u * 3 + 2] + N[v * 3 + 2] + N[w * 3 + 2]) >= 0;
}
function degenerado(R: Rejilla, u: number, v: number, w: number): boolean {
  const P = R.pos;
  const ax = P[v * 3] - P[u * 3], ay = P[v * 3 + 1] - P[u * 3 + 1], az = P[v * 3 + 2] - P[u * 3 + 2];
  const bx = P[w * 3] - P[u * 3], by = P[w * 3 + 1] - P[u * 3 + 1], bz = P[w * 3 + 2] - P[u * 3 + 2];
  return Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) < 1e-12;
}
/**
 * Triangles of a grid, grouped by `grupo(i, k)` (row i, lower half-column k;
 * −1 leaves the cell out) and dropped where `quitar` says so (by centroid);
 * each cell split along its shorter diagonal, each triangle facing the way
 * its vertex normals do (see balaModelo.ts).
 */
function caras(R: Rejilla, nGrupos = 1, grupo?: (i: number, k: number) => number, quitar?: (x: number, y: number, z: number) => boolean): number[][] {
  const grupos: number[][] = Array.from({ length: nGrupos }, () => []);
  const P = R.pos;
  for (let i = 0; i < R.filas - 1; i++) for (let c = 0; c < R.cols - 1; c++) {
    const k = Math.min(Math.abs(c - (R.n - 1)), Math.abs(c + 1 - (R.n - 1)));
    const gr = grupo ? grupo(i, k) : 0; if (gr < 0) continue;
    const a = i * R.cols + c, cc = a + R.cols;
    const tris: [number, number, number][] = dist2(R.pos, a + 1, cc) <= dist2(R.pos, a, cc + 1) ? [[a, a + 1, cc], [a + 1, cc + 1, cc]] : [[a, a + 1, cc + 1], [a, cc + 1, cc]];
    for (const [u, v, w] of tris) {
      if (degenerado(R, u, v, w)) continue;
      if (quitar && quitar((P[u * 3] + P[v * 3] + P[w * 3]) / 3, (P[u * 3 + 1] + P[v * 3 + 1] + P[w * 3 + 1]) / 3, (P[u * 3 + 2] + P[v * 3 + 2] + P[w * 3 + 2]) / 3)) continue;
      if (haciaFuera(R, u, v, w)) grupos[gr].push(u, v, w); else grupos[gr].push(u, w, v);
    }
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

// ------------------------------------------------------------ wheel openings
const qArco = (A: typeof ARCO_DEL, x: number, y: number) => Math.hypot((x - A.x) / A.a, (y - A.y) / A.b);
const enArco = (x: number, y: number, z: number) => (Math.abs(z) > ARCO_DEL.z && qArco(ARCO_DEL, x, y) < 0.999) || (Math.abs(z) > ARCO_TRAS.z && qArco(ARCO_TRAS, x, y) < 0.999);

/**
 * The body: blue, with the floor in black and holes for the glass and the
 * wheels. A last group repeats every triangle with a dark back-face material:
 * the inside of the skin, as seen through the glass (one mesh, so
 * «Superponer» paints it once).
 */
function carroceria(xs: number[], M: Mats): THREE.Mesh {
  const R = rejilla(xs, columnasSkin, 'abajo');
  // pull the vertices next to each arch onto its ellipse, so the openings have clean edges
  for (let v = 0; v < R.pos.length / 3; v++) {
    const x = R.pos[v * 3], y = R.pos[v * 3 + 1], z = R.pos[v * 3 + 2];
    for (const A of [ARCO_DEL, ARCO_TRAS]) {
      if (Math.abs(z) < A.z - 0.004) continue;
      const q = qArco(A, x, y);
      // every vertex within ~4 cm of the ellipse goes onto it: the side's columns are 3-5 cm apart, so
      // fewer would leave the opening's edge stepped by whole cells
      if (Math.abs(q - 1) < 0.13 && y > 0.1) { R.pos[v * 3] = A.x + (x - A.x) / q; R.pos[v * 3 + 1] = A.y + (y - A.y) / q; }
    }
  }
  const grupos = caras(R, 2, (i, k) => {
    const a = xs[i], b = xs[i + 1];
    if (k >= K_C && enVidrio(a) && enVidrio(b)) return -1;
    if (k >= K_A && k < K_B && enVentana(a) && enVentana(b)) return -1;
    return 0;
  }, enArco);
  // the floor (below 12.5 cm) in black
  const P = R.pos, azul: number[] = [], negro: number[] = [];
  for (const l of grupos) for (let k = 0; k < l.length; k += 3) {
    const y = (P[l[k] * 3 + 1] + P[l[k + 1] * 3 + 1] + P[l[k + 2] * 3 + 1]) / 3;
    (y < 0.125 ? negro : azul).push(l[k], l[k + 1], l[k + 2]);
  }
  const geo = geometria(R, [azul, negro]);
  geo.clearGroups();
  geo.addGroup(0, azul.length, 0); geo.addGroup(azul.length, negro.length, 1);
  geo.addGroup(0, azul.length + negro.length, 2);
  const m = new THREE.Mesh(geo, [M.chapa, M.bajos, M.forro]);
  m.name = 'carroceria';
  return m;
}

/**
 * A glass patch on the skin's own rows, filling the hole cut along the same
 * outline (no lift, no overlap). The black frit is drawn by the glass shader
 * from each vertex's distance to the outline (the grid's border).
 */
function vidrio(xsPiel: number[], x0: number, x1: number, rango: (s: Sec) => [number, number], n: number, frit: number, M: Mats, orden: 'arriba' | 'lado', nombre: string): THREE.Group {
  const xs = xsPiel.filter(x => x <= x0 + 1e-9 && x >= x1 - 1e-9);
  const R = rejilla(xs, s => { const [a, b] = rango(s); const o: number[] = []; for (let k = 0; k <= n; k++) o.push(a + (b - a) * k / n); return o; }, orden);
  const grupos = caras(R);
  const P = R.pos, C = R.cols, F = R.filas, seg: [number, number][] = [];
  for (let i = 0; i < F - 1; i++) seg.push([i * C, (i + 1) * C], [i * C + C - 1, (i + 1) * C + C - 1]);
  for (let c = 0; c < C - 1; c++) seg.push([c, c + 1], [(F - 1) * C + c, (F - 1) * C + c + 1]);
  const dist = new Float32Array(P.length / 3);
  for (let v = 0; v < P.length / 3; v++) {
    const px = P[v * 3], py = P[v * 3 + 1], pz = P[v * 3 + 2]; let d = Infinity;
    for (const [a, b] of seg) {
      const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2], ux = P[b * 3] - ax, uy = P[b * 3 + 1] - ay, uz = P[b * 3 + 2] - az;
      if (Math.abs(px - ax) > 0.25 && Math.abs(px - ax - ux) > 0.25) continue;
      const l2 = ux * ux + uy * uy + uz * uz, u = l2 > 1e-14 ? Math.max(0, Math.min(1, ((px - ax) * ux + (py - ay) * uy + (pz - az) * uz) / l2)) : 0;
      const dd = (px - ax - u * ux) ** 2 + (py - ay - u * uy) ** 2 + (pz - az - u * uz) ** 2; if (dd < d) d = dd;
    }
    dist[v] = Math.sqrt(d) - frit;
  }
  const g = new THREE.Group(); g.name = nombre;
  const geo = geometria(R, grupos);
  geo.setAttribute('borde', new THREE.BufferAttribute(dist, 1));
  const tinte = new THREE.Mesh(geo, M.tinte); tinte.renderOrder = 2; tinte.customDepthMaterial = sinSombra; tinte.name = 'cristal';
  const reflejo = new THREE.Mesh(geo, M.reflejo); reflejo.renderOrder = 3; reflejo.customDepthMaterial = sinSombra; reflejo.name = 'cristal-reflejo';
  g.add(tinte, reflejo);
  return g;
}

/** Dark wheel wells behind the openings: the arch lining and an inner wall. */
function pozos(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'pasos-de-rueda';
  const N = 56;
  for (const A of [ARCO_DEL, ARCO_TRAS]) {
    const th0 = Math.asin(Math.max(-1, Math.min(1, (0.13 - A.y) / A.b)));
    for (const s of [1, -1]) {
      const pos: number[] = [], idx: number[] = [];
      for (let k = 0; k <= N; k++) {
        const th = th0 + (Math.PI - 2 * th0) * k / N;
        const x = A.x + A.a * Math.cos(th), y = A.y + A.b * Math.sin(th);
        const zo = ladoZ(x, y);
        const zf = Number.isFinite(zo) ? zo - 0.003 : A.z + 0.12;
        pos.push(x, y, s * (A.z - 0.02), x, y, s * zf);
        if (k > 0) { const a = 2 * k; idx.push(a - 2, a - 1, a, a - 1, a + 1, a); }
      }
      const forro = new THREE.BufferGeometry(); forro.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); forro.setIndex(idx); forro.computeVertexNormals();
      g.add(malla(forro, M.pozo, 'forro'));
      const sh = new THREE.Shape(); sh.moveTo(A.x + A.a * Math.cos(th0), A.y + A.b * Math.sin(th0));
      for (let k = 1; k <= N; k++) { const th = th0 + (Math.PI - 2 * th0) * k / N; sh.lineTo(A.x + A.a * Math.cos(th), A.y + A.b * Math.sin(th)); }
      sh.closePath();
      const pared = malla(new THREE.ShapeGeometry(sh), M.pozo, 'pared'); pared.position.z = s * (A.z - 0.02); g.add(pared);
    }
  }
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
    p.push([q[i][0] + nx, q[i][1] + ny], [q[i][0] - nx, q[i][1] - ny]); uv.push([s * 4, 1], [s * 4, 0]);
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
/** Points along an arch ellipse between two heights (side view), front to back over the top. */
function arcoPts(A: typeof ARCO_DEL, yMin: number, mas: number, n = 48): P2[] {
  const a = A.a + mas, b = A.b + mas, th = Math.asin(Math.max(-1, Math.min(1, (yMin - A.y) / b)));
  const out: P2[] = [];
  for (let k = 0; k <= n; k++) { const t = th + (Math.PI - 2 * th) * k / n; out.push([A.x + a * Math.cos(t), A.y + b * Math.sin(t)]); }
  return out;
}

type Vista = 'lado' | 'arriba' | 'frente' | 'detras';
const FUERA: Record<Vista, THREE.Vector3> = { lado: new THREE.Vector3(0, 0, 1), arriba: new THREE.Vector3(0, 1, 0), frente: new THREE.Vector3(1, 0, 0), detras: new THREE.Vector3(-1, 0, 0) };
/** The skin point a 2D view coordinate lands on: side (x, y), top (x, z), front and rear (z, y). */
function proyectar(v: Vista, a: number, b: number): THREE.Vector3 {
  if (v === 'lado') return new THREE.Vector3(a, b, ladoZ(a, b));
  if (v === 'arriba') return new THREE.Vector3(a, arribaY(a, b), b);
  if (v === 'frente') return new THREE.Vector3(frenteX(a, b), b, a);
  return new THREE.Vector3(detrasX(a, b), b, a);
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
    if (bueno) { const n = normalEn(vista, a, b); v.addScaledVector(Number.isFinite(n.x) && Number.isFinite(n.y) && Number.isFinite(n.z) ? n : f, d); }
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

const malla = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], nombre?: string) => {
  const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; if (nombre) o.name = nombre; return o;
};

// ================================================================ lathe pieces
/** Revolves a profile (r, h) around Z. */
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

/**
 * A narrow eco-marathon tyre on a 16-inch rim behind a flat black disc cover
 * (the race version: the launch car had silver five-spoke rims). Axle along
 * Z, outer face on +Z; the contact patch is flattened to the loaded radius.
 */
function rueda(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'rueda';
  const R = NEU.R, w = NEU.ancho / 2, rl = R_LLANTA;
  const flanco = (sg: number): P2[] => [
    [rl + 0.006, sg * (w - 0.016)], [rl + 0.014, sg * (w - 0.006)], [rl + 0.026, sg * (w + 0.001)],
    [rl + (R - rl) * 0.42, sg * (w + 0.004)], [rl + (R - rl) * 0.72, sg * (w + 0.002)], [R - 0.014, sg * (w - 0.006)],
    [R - 0.005, sg * (w - 0.014)], [R - 0.0012, sg * (w - 0.021)],
  ];
  const tb: P2[] = [], hm = w - 0.022;
  for (let k = 0; k <= 12; k++) { const h = -hm + 2 * hm * k / 12, hn = h / hm; tb.push([R - 0.0015 * hn * hn - (Math.abs(hn) < 0.06 ? 0.002 : 0), h]); }
  const neum = torno([...flanco(-1), ...tb, ...flanco(1).reverse()], 72);
  const p = neum.attributes.position as THREE.BufferAttribute;
  for (let k = 0; k < p.count; k++) if (p.getY(k) < -RC) { const y = p.getY(k); p.setY(k, -RC); p.setZ(k, p.getZ(k) * (1 + (-RC - y) * 1.5)); }
  neum.computeVertexNormals();
  g.add(malla(neum, M.goma, 'neumatico'));
  g.add(malla(torno([[rl - 0.004, w - 0.020], [rl + 0.002, w - 0.012], [rl + 0.008, w - 0.014], [rl + 0.009, w - 0.024]], 64), M.llantaOscura, 'pestana'));
  // the disc cover: almost flat, a slight dome towards the centre, over the whole rim
  const hD = (r: number) => w - 0.012 + 0.008 * (1 - (r / rl) ** 2);
  const disco: P2[] = [];
  for (let k = 0; k <= 12; k++) { const r = (rl + 0.006) * (1 - k / 12); disco.push([r, hD(Math.min(r, rl))]); }
  g.add(malla(torno(disco, 72), M.disco, 'tapacubos'));
  // a thin rolled edge round the cover and the small axle nut in the middle
  g.add(malla(torno([[rl + 0.006, hD(rl) - 0.002], [rl + 0.008, hD(rl) + 0.001], [rl + 0.002, hD(rl) + 0.003], [rl - 0.004, hD(rl) + 0.001]], 72), M.disco, 'aro'));
  g.add(malla(torno([[0.024, hD(0.024) + 0.0005], [0.022, hD(0.022) + 0.006], [0.014, hD(0.014) + 0.012], [0.0, hD(0) + 0.014]], 24), M.cromoPieza, 'tuerca'));
  // the inner face: a plain dark disc so the tyre is closed from behind
  const interior = new THREE.Mesh(new THREE.CircleGeometry(rl + 0.01, 40), M.llantaOscura); interior.position.z = -w + 0.012; interior.rotation.y = Math.PI; g.add(interior);
  return g;
}

// ===================================================================== assembly
let PLANTILLA: THREE.Group | null = null;
export function construir(): THREE.Group {
  if (!PLANTILLA) PLANTILLA = construirPlantilla();
  const M = mats(), g = PLANTILLA.clone(true), copias = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  g.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    let c = copias.get(m.geometry); if (!c) { c = m.geometry.clone(); copias.set(m.geometry, c); }
    m.geometry = c;
    if (m.material === M.tinte || m.material === M.reflejo || m.material === M.lente) m.customDepthMaterial = sinSombra;
  });
  return g;
}

function construirPlantilla(): THREE.Group {
  const M = mats();
  const g = new THREE.Group(); g.name = 'nusKruce';
  const add = <T extends THREE.Object3D>(o: T) => { g.add(o); return o; };
  const espejo = (o: THREE.Object3D) => { const c = o.clone(); c.position.z = -o.position.z; c.rotation.y = -o.rotation.y; c.scale.z = -o.scale.z; return add(c); };
  const par = (m: Malla2D, vista: Vista, sep: number, mat: THREE.Material, maxLado = 0.02, nombre = 'junta') => {
    const o = add(malla(calco(m, vista, sep, maxLado), mat, nombre));
    if (vista === 'lado') espejo(o);
    return o;
  };
  const JUNTA = 0.0042, SEP_JUNTA = 0.0014;

  // ---------------------------------------------------------------- skin and glass
  const xs = filasX();
  add(carroceria(xs, M));
  add(pozos(M));
  add(vidrio(xs, XC0, XC1, s => [bandas(s)[2], 1], N_TRAMO[2], 0.03, M, 'arriba', 'cupula'));
  {
    const v = vidrio(xs, VX0, VX1, s => { const [a, b] = bandas(s); return [a, b]; }, N_TRAMO[0], 0.018, M, 'lado', 'ventanilla');
    add(v); espejo(v);
  }
  // the door's front edge carries on up the window as a slim black pillar (front quarter light ahead of it)
  par(cinta([[X_PILAR - 0.004, cinturaEn(X_PILAR) - 0.01], [X_PILAR - 0.012, Y_VTOP(X_PILAR - 0.012) + 0.01]], 0.026, 0.008), 'lado', 0.0022, M.negroMate, 0.01, 'pilar');

  // ---------------------------------------------------------------- arches
  // the arch edges: a body-colour lip on the cut and a thin dark line just outside it; the rear one flares
  par(cinta(arcoPts(ARCO_DEL, 0.16, 0.006), 0.012, 0.01), 'lado', 0.0008, M.chapaCalco, 0.016, 'labio');
  par(cinta(arcoPts(ARCO_TRAS, 0.16, 0.008), 0.018, 0.01), 'lado', 0.0016, M.chapaCalco, 0.016, 'labio');
  par(cinta(arcoPts(ARCO_TRAS, 0.20, 0.022), 0.003, 0.01), 'lado', 0.0018, M.junta, 0.012, 'junta-aleta');

  // ---------------------------------------------------------------- shut lines
  // The door: its front edge just behind the front arch (and on up as the pillar),
  // the bottom along the sill, the rear edge down from the window's rear end and
  // round the front of the rear arch.
  {
    const yP = cinturaEn(X_PILAR);
    // (the rear edge measured on the launch photo: it leaves the beltline near the window's rear end
    // and curves down onto the front of the rear arch, a few centimetres outside its lip)
    const puerta: P2[] = suave([[X_PILAR - 0.004, yP - 0.005], [X_PILAR, 0.55], [X_PILAR - 0.004, 0.32], [X_PILAR - 0.04, 0.215], [X_PILAR - 0.12, 0.195], [-1.18, 0.195], [-1.27, 0.215], [-1.305, 0.30], [-1.34, 0.40], [-1.40, 0.49], [-1.48, 0.565], [-1.56, 0.64], [-1.61, 0.72], [-1.635, cinturaEn(-1.635) - 0.004]], 3, false);
    par(cinta(puerta, JUNTA, 0.006), 'lado', SEP_JUNTA, M.junta, 0.012, 'junta-puerta');
  }
  // the race number panel on each door: blank (no number, no lettering)
  par(poligono(rectRedondo(-0.47, 0.47, 0.11, 0.17, 0.015, 3)), 'lado', 0.0012, M.placa, 0.04, 'panel-numero');

  // ---------------------------------------------------------------- front
  // the black band across the nose between the bonnet and the lower body, with
  // the slim headlamps at its ends; it wraps round the corners towards the arches
  {
    const yB = (z: number) => 0.578 - 0.012 * (z / 0.5) ** 2;
    const banda: P2[] = []; for (let k = 0; k <= 40; k++) { const z = -0.47 + 0.94 * k / 40; banda.push([z, yB(z)]); }
    add(malla(calco(cinta(banda, 0.05, 0.02), 'frente', 0.0012, 0.025), M.negroBrillo, 'banda'));
    // the wrap round each corner, in side view, tapering to the arch
    const vuelta: P2[] = suave([[0.47, 0.566], [0.40, 0.574], [0.32, 0.585], [0.24, 0.598]], 2, false);
    for (const [w, mat, sep, nom] of [[0.05, M.negroBrillo, 0.0012, 'banda'], [0.012, M.ledTira, 0.0022, 'faro-led']] as [number, THREE.Material, number, string][]) {
      par(cinta(vuelta, w, 0.008), 'lado', sep, mat, 0.01, nom);
    }
    for (const sg of [1, -1]) {
      // slim headlamp: an LED line near each end of the band, an amber indicator at the very end
      const faro: P2[] = []; for (let k = 0; k <= 12; k++) { const z = sg * (0.24 + 0.22 * k / 12); faro.push([z, yB(z) + 0.004]); }
      add(malla(calco(cinta(faro, 0.014, 0.008), 'frente', 0.0022, 0.01), M.ledTira, 'faro-led'));
      const lente = rectRedondo(sg * 0.35, yB(0.35) + 0.002, 0.13, 0.019, 0.008, 3);
      add(malla(calco(poligono(lente), 'frente', (a, b) => 0.0014 + 0.003 * Math.min(1, distBorde(lente, a, b) / 0.01), 0.015), M.lente, 'lente-faro'));
      add(malla(calco(cinta([[sg * 0.465, yB(0.465) + 0.003], [sg * 0.495, yB(0.495) + 0.003]], 0.012, 0.006), 'frente', 0.0022, 0.008), M.ambar, 'intermitente'));
    }
  }
  // the lower lip line across the nose and the bumper split under it
  {
    const labio: P2[] = suave([[-0.50, 0.30], [-0.40, 0.268], [0, 0.258], [0.40, 0.268], [0.50, 0.30]], 2, false);
    add(malla(calco(cinta(labio, JUNTA, 0.008), 'frente', SEP_JUNTA, 0.012), M.junta, 'junta-morro'));
  }
  // the blank race-number card on the lower windscreen, as in the race photo
  add(malla(calco(poligono(rectRedondo(0.30, 0.0, 0.07, 0.11, 0.008, 3)), 'arriba', 0.0016, 0.02), M.placa, 'panel-numero'));

  // ---------------------------------------------------------------- rear
  // the light bar right under the rear glass: smoked band with clear cells, red ends, wrapping round the corners
  {
    const yL = (z: number) => 0.775 + 0.008 * (z / 0.5) ** 2;
    const barra: P2[] = []; for (let k = 0; k <= 26; k++) { const z = -0.52 + 1.04 * k / 26; barra.push([z, yL(z)]); }
    add(malla(calco(cinta(barra, 0.05, 0.02), 'detras', 0.0012, 0.025), M.negroBrillo, 'barra-luz'));
    add(malla(calco(cinta(barra.filter(([z]) => Math.abs(z) < 0.33), 0.022, 0.01), 'detras', 0.0022, 0.02), M.ledTira, 'barra-luz-led'));
    for (const sg of [1, -1]) add(malla(calco(cinta(barra.filter(([z]) => sg * z > 0.35), 0.03, 0.01), 'detras', 0.0022, 0.02), M.rojoLed, 'piloto'));
    // the clear cover over the whole bar, a blister that meets the band at its edges
    add(malla(calco(cinta(barra, 0.048, 0.02), 'detras', (a, b) => 0.0014 + 0.003 * Math.min(1, (0.024 - Math.abs(b - yL(a))) / 0.01), 0.025), M.lente, 'lente-barra'));
    const lado: P2[] = suave([[-1.84, 0.802], [-1.92, 0.795], [-2.0, 0.787]], 2, false);
    par(cinta(lado, 0.05, 0.008), 'lado', 0.0012, M.negroBrillo, 0.01, 'barra-luz');
    par(cinta(lado, 0.02, 0.008), 'lado', 0.0022, M.rojoLed, 0.01, 'piloto');
  }
  // the raised lower panel at the bottom of the tail
  {
    const panel = suave(rectRedondo(0, 0.235, 0.33, 0.06, 0.04, 3), 1);
    add(malla(calco(cinta(cerrar(panel), JUNTA, 0.008), 'detras', SEP_JUNTA, 0.012), M.junta, 'junta-cola'));
  }

  // ---------------------------------------------------------------- wheels
  const rd = rueda(M);
  for (const [x, via] of [[0, VIA_DEL], [-BATALLA, VIA_TRAS]] as [number, number][]) {
    const r = rd.clone(); r.position.set(x, RC, via / 2); add(r);
    const izq = rd.clone(); izq.position.set(x, RC, -via / 2); izq.rotation.y = Math.PI; add(izq);
  }

  // ---------------------------------------------------------------- cabin
  add(cabina(M));

  g.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    m.castShadow = true; m.receiveShadow = true;
    if (m.material === M.lente || m.material === M.tinte || m.material === M.reflejo) m.customDepthMaterial = sinSombra;
  });
  return g;
}

// ===================================================================== the cabin
/** A bucket seat: a profile swept across its width, with bolsters. */
function asiento(perfil: P2[], ancho: number, M: Mats): THREE.Mesh {
  const curva = suave(perfil, 2, false), n = curva.length;
  const nor: P2[] = curva.map((_, i) => { const a = curva[Math.max(0, i - 1)], b = curva[Math.min(n - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l]; });
  const us = [-1, -0.92, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 0.92, 1];
  const h = (u: number) => 0.06 * Math.abs(u) ** 4 - 0.01 * (1 - u * u);
  const pos: number[] = [], idx: number[] = [], uv: number[] = [];
  for (let i = 0; i < n; i++) for (const u of us) { const k = h(u); pos.push(curva[i][0] + nor[i][0] * k, curva[i][1] + nor[i][1] * k, u * ancho / 2); uv.push(i / n, (u + 1) / 2); }
  const m = us.length;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < m - 1; j++) { const a = i * m + j, b = a + 1, c = a + m, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return malla(g, M.tela, 'asiento');
}

/**
 * One seat in the middle (a single-seater), a racing wheel on its column, a
 * slim dashboard under the windscreen, the black bulkhead behind the seat
 * (the rear photo shows it filling the rear glass up to the light bar), the
 * floor and dark side trims, all inside the skin.
 */
function cabina(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'cabina';
  const perfil: P2[] = [[-0.42, 0.30], [-0.62, 0.25], [-0.80, 0.22], [-0.88, 0.25], [-0.96, 0.42], [-1.03, 0.62], [-1.06, 0.78]];
  g.add(asiento(perfil, 0.46, M));
  // seat frame: two aluminium rails under it
  for (const z of [0.16, -0.16]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.025), M.aluminio); r.position.set(-0.68, 0.19, z); g.add(r); }
  // dashboard: a slim dark shelf under the windscreen
  const tablero = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.80), M.plastico); tablero.position.set(-0.02, 0.69, 0); tablero.rotation.z = 0.25; g.add(tablero);
  // steering wheel: a small racing wheel on its column, in front of the seat
  const volante = new THREE.Group(); volante.name = 'volante';
  volante.add(malla(new THREE.TorusGeometry(0.13, 0.013, 10, 40), M.plastico, 'aro'));
  volante.add(malla(new THREE.CylinderGeometry(0.035, 0.04, 0.03, 20).rotateX(Math.PI / 2), M.aluminio, 'cubo'));
  for (const a of [0, Math.PI * 0.85, -Math.PI * 0.85]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.018, 0.01), M.aluminio); r.position.set(0.065 * Math.cos(a - Math.PI / 2), 0.065 * Math.sin(a - Math.PI / 2), 0); r.rotation.z = a - Math.PI / 2; volante.add(r); }
  volante.position.set(-0.25, 0.66, 0); volante.rotation.set(0, Math.PI / 2, 0); volante.rotateX(-0.45); g.add(volante);
  const columna = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.34, 12), M.aluminio); columna.position.set(-0.10, 0.60, 0); columna.rotation.z = Math.PI / 2 - 0.45; g.add(columna);
  // the red emergency stop button on the dashboard (the rules ask for one inside)
  const seta = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.015, 16), M.rojoPieza); seta.position.set(-0.06, 0.725, 0.25); g.add(seta);
  // bulkhead behind the seat, floor and side trims, dark
  const mampara = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.62, 0.92), M.plastico); mampara.position.set(-1.30, 0.50, 0); mampara.rotation.z = -0.08; g.add(mampara);
  const bandeja = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.90), M.plastico); bandeja.position.set(-1.52, 0.78, 0); g.add(bandeja);
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), M.plastico); suelo.rotation.x = -Math.PI / 2; suelo.position.set(-0.55, 0.16, 0); g.add(suelo);
  for (const s of [1, -1]) {
    const lat = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.42), M.plastico); lat.position.set(-0.825, 0.50, s * 0.46); lat.rotation.y = s > 0 ? Math.PI : 0; g.add(lat);
  }
  return g;
}
