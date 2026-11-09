import * as THREE from 'three';
import {
  BATALLA, NEU_DEL, NEU_TRAS, RC_DEL, RC_TRAS, R_LLANTA_DEL, R_LLANTA_TRAS, T5, VIA_DEL, VIA_TRAS, X_COLA, X_MORRO,
  arribaY, detrasX, frenteX, ladoZ, punto, rayoPiel, sec, type Sec,
} from './xl1Forma';

/*
 * The production VW XL1 (2013) built in three.js: skin, glass, lamps, wheels
 * and a simple cabin. The shape itself lives in `xl1Forma.ts`.
 *
 * - The skin is one grid over (x, t) per side: rows at fixed x, columns at
 *   given t, with the surface's own normals (no shading seams). Above the
 *   shoulder the columns are laid out so that the glass outlines are column
 *   lines (see `columnasSkin`).
 * - The glass (windscreen and the two door windows) is the same (x, t)
 *   surface on the same rows, filling holes cut along exactly those column
 *   lines: skin and glass share every edge vertex, so the outline is a smooth
 *   curve with no steps. The black frit is drawn by the glass shader from each
 *   vertex's distance to the outline (`frit`).
 * - Shut lines, lamps, the black front band and the like are "decals": a 2D
 *   drawing in one view (side, top, front or rear) projected onto the skin
 *   and lifted a fraction of a millimetre.
 * - Materials (and the procedural textures) are created once per page and
 *   shared by every build. The car is built once into a template; every
 *   `construir()` hands out copies of its geometries (the viewer disposes
 *   those), and mirrored parts share one geometry.
 * No logos, badges, lettering or plate characters: the garage compares shapes.
 */

type P2 = [number, number];

// ======================================================================= layout
// Everything placed on the car, in one spot so the photo fits can tune it.
// Side-view outlines are (x, y); front and rear views (z, y) with z > 0 = right.
/** Front wheel opening (side view): ellipse round the wheel, cut where |z| > z. */
export const ARCO = { x: -0.02, y: 0.205, a: 0.32, b: 0.425, z: 0.62 };
/** Windscreen in plan view: base centre, base corners, top; and the A-pillar line in side view. */
const PARABRISAS = { xBase: -0.07, xEsquina: -0.16, zEsquina: 0.53, xTop: -0.745, zTop: 0.40 };
/** Side window (side view): front at the A-pillar, pointed rear end on the beltline. */
const VENTANA = { x0: -0.215, x1: -1.535 };
/** Oblique view for the headlamps, which wrap round the nose's diagonal corners: angle from +X towards +Z. */
const TH_FARO = 0.70;

// ======================================================================= materials
/**
 * Glass that casts no shadow. The viewer turns castShadow on for every mesh,
 * so the shadow pass gets a depth material with opacity 0; the shadow map
 * copies the glass material's alphaTest (0.01) onto it, and every fragment is
 * discarded.
 */
const sinSombra = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking, opacity: 0 });

/** Fine radial brushed texture for the chrome centre ring and the light-bar inner reflector. */
function texturaCepillada(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const N = 128, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d'); if (!c) return null;
  c.fillStyle = '#9a9ea4'; c.fillRect(0, 0, N, N);
  for (let i = 0; i < 900; i++) {
    const y = Math.random() * N, l = 0.3 + Math.random() * 0.7;
    c.strokeStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${0.05 + Math.random() * 0.08})`;
    c.beginPath(); c.moveTo(0, y); c.lineTo(N * l, y + (Math.random() - 0.5)); c.stroke();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** LED row for the lamps: small bright cells on a dark field (u along the strip). */
function texturaLed(rojo: boolean): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const W = 256, H = 16, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); if (!c) return null;
  c.fillStyle = rojo ? '#3a0204' : '#202832'; c.fillRect(0, 0, W, H);
  for (let x = 2; x < W; x += 8) {
    const g = c.createRadialGradient(x + 2, H / 2, 0.5, x + 2, H / 2, 5);
    g.addColorStop(0, rojo ? '#ff6a5a' : '#ffffff'); g.addColorStop(0.5, rojo ? '#e0141a' : '#dce9ff'); g.addColorStop(1, rojo ? 'rgba(90,0,4,0)' : 'rgba(40,50,60,0)');
    c.fillStyle = g; c.fillRect(x - 4, 0, 12, H);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  return t;
}

/**
 * The glass tint with its black frit: each glass vertex carries `borde`, its
 * distance to the glass outline minus the frit width. The shader thresholds
 * the interpolated distance over one pixel (fwidth), so the frit's inner edge
 * is a crisp, antialiased curve however close the camera gets; vertex colours
 * would smear it across whole cells.
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
        '  diffuseColor.rgb = mix(vec3(0.008, 0.008, 0.010), vec3(0.018, 0.022, 0.027), f);',
        '  diffuseColor.a = mix(1.0, 0.72, f); }', // tinted: 72 % over the cabin
      ].join('\n'));
  };
  m.customProgramCacheKey = () => 'xl1-frit';
  return m;
}

let MATS: ReturnType<typeof crearMateriales> | null = null;
function crearMateriales() {
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);
  const decal = (p: THREE.MeshPhysicalMaterialParameters) => fis({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, ...p });
  const cep = texturaCepillada();
  return {
    // pure white solid paint on the CFRP skin, deep clear coat
    chapa: fis({ color: 0xf3f3ef, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.2, sheenColor: new THREE.Color(0xeef2ff), sheenRoughness: 0.5, side: THREE.DoubleSide }),
    chapaCalco: decal({ color: 0xf3f3ef, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 }),
    // the fully covered underbody, sills and diffuser: black textured plastic
    bajos: fis({ color: 0x141517, roughness: 0.8, metalness: 0.05, side: THREE.DoubleSide }),
    pozo: fis({ color: 0x070708, roughness: 0.92, side: THREE.DoubleSide }),
    junta: decal({ color: 0x0a0a0b, roughness: 0.95 }),
    sombraJunta: decal({ color: 0xb9bcc0, roughness: 0.5, transparent: true, opacity: 0.55 }),
    // glass: tint and black frit at the edge, both drawn by the `frit` shader ...
    tinte: frit(fis({ color: 0xffffff, transparent: true, depthWrite: false, alphaTest: 0.01, roughness: 0.12, metalness: 0, side: THREE.DoubleSide })),
    // ... plus its reflections, added on top so they do not fade with the tint
    reflejo: fis({ color: 0x000000, roughness: 0.03, metalness: 0, transparent: true, depthWrite: false, alphaTest: 0.01, blending: THREE.AdditiveBlending, envMapIntensity: 1.7 }),
    lente: decal({ color: 0x000000, roughness: 0.02, transparent: true, depthWrite: false, alphaTest: 0.01, blending: THREE.AdditiveBlending, envMapIntensity: 1.9 }),
    negroBrillo: decal({ color: 0x07080a, roughness: 0.12, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.04 }),
    negroMate: decal({ color: 0x0d0e10, roughness: 0.7, metalness: 0.05 }),
    grisOscuro: decal({ color: 0x2a2c30, roughness: 0.55, metalness: 0.25 }),
    plata: decal({ color: 0xb4b8bd, roughness: 0.35, metalness: 0.6, clearcoat: 0.6 }),
    cromo: decal({ color: 0xe6e8ec, roughness: 0.06, metalness: 1 }),
    reflector: decal({ color: 0xa8adb3, roughness: 0.2, metalness: 0.95, map: cep }),
    led: decal({ color: 0xffffff, emissive: 0xf3f8ff, emissiveIntensity: 1.25, roughness: 0.3 }),
    ledTira: decal({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9, emissiveMap: texturaLed(false), map: texturaLed(false), roughness: 0.25 }),
    ambar: decal({ color: 0xc88a3c, roughness: 0.25, clearcoat: 1, emissive: 0x3a1800, emissiveIntensity: 0.25 }),
    rojo: decal({ color: 0x8f0b10, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, emissive: 0xc0080e, emissiveIntensity: 0.35 }),
    rojoLed: decal({ color: 0xffffff, emissive: 0xff2a20, emissiveIntensity: 0.8, emissiveMap: texturaLed(true), map: texturaLed(true), roughness: 0.2 }),
    blanco: decal({ color: 0xeceeef, roughness: 0.25, clearcoat: 1 }),
    placa: decal({ color: 0xf2f2ee, roughness: 0.6, envMapIntensity: 0.6 }),
    proyector: fis({ color: 0x0c0f14, roughness: 0.02, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.01 }),
    goma: fis({ color: 0x141415, roughness: 0.93, metalness: 0 }),
    tapaBlanca: fis({ color: 0xf0f0ec, roughness: 0.28, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06 }),
    alabe: fis({ color: 0x0b0c0e, roughness: 0.3, metalness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.1, side: THREE.DoubleSide }),
    cromoPieza: fis({ color: 0xe2e5e9, roughness: 0.08, metalness: 1 }),
    llantaOscura: fis({ color: 0x1b1c1e, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide }),
    tela: fis({ color: 0x2a2b2e, roughness: 0.95, side: THREE.DoubleSide }),
    cuero: fis({ color: 0xd9d6cf, roughness: 0.6, side: THREE.DoubleSide }),
    carbono: fis({ color: 0x1a1b1e, roughness: 0.35, metalness: 0.2, clearcoat: 0.8, side: THREE.DoubleSide }),
    plastico: fis({ color: 0x17181a, roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide }),
    pantalla: fis({ color: 0x05080c, emissive: 0x16324a, emissiveIntensity: 0.6, roughness: 0.1, clearcoat: 1 }),
  };
}
function mats() { return MATS ?? (MATS = crearMateriales()); }
type Mats = ReturnType<typeof crearMateriales>;

// ===================================================================== the skin
/**
 * Row spacing: fine at the tips and round the front arches, and fine over the
 * glass, because the glass is built on these same rows: every row has one
 * vertex on each glass edge in both meshes, so skin and glass meet exactly.
 */
function filasX(): number[] {
  const { xBase, xEsquina, xTop } = PARABRISAS;
  const paso = (x: number) => {
    let p = 0.02;
    if (Math.abs(x - ARCO.x) < ARCO.a + 0.06) p = 0.009;
    if (x < xBase + 0.01 && x > VENTANA.x1 - 0.01) p = 0.008;
    // the windscreen base turns fast in plan: 2.5 mm rows there; 4 mm at the window tips and the windscreen top
    if (x < xBase + 0.004 && x > xEsquina - 0.03) p = 0.0025;
    for (const xc of [VENTANA.x0, VENTANA.x1, xTop]) if (Math.abs(x - xc) < 0.04) p = Math.min(p, 0.004);
    const dt = Math.min(X_MORRO - x, x - X_COLA);
    return Math.min(p, Math.max(0.0015, 0.1 * dt));
  };
  const xs: number[] = [];
  for (let x = X_MORRO; x > X_COLA; x -= paso(x)) xs.push(x);
  // rows exactly on the glass ends, where each outline closes
  xs.push(X_COLA, xBase, xTop, VENTANA.x0, VENTANA.x1);
  xs.sort((a, b) => b - a);
  return xs.filter((x, i) => i === 0 || xs[i - 1] - x > 2e-4);
}

/**
 * Columns along the half-section. Fixed t up to the shoulder; above it four
 * bands whose edges are the glass outlines where there is glass: [0.48, tA]
 * up to the beltline, [tA, tB] the side window, [tB, tW] the A-pillar and
 * roof side, [tW, 1] the windscreen. Away from the glass the band edges ease
 * to fixed values over 15 cm, so the columns never jump from row to row.
 */
const T_FIJAS: number[] = (() => {
  const out: number[] = [];
  for (const [a, b, n] of [[0, 0.11, 5], [0.11, 0.2, 5], [0.2, 0.38, 7], [0.38, 0.48, 10]] as [number, number, number][]) for (let k = 0; k < n; k++) out.push(a + (b - a) * k / n);
  return out;
})();
const N_TRAMO = [3, 8, 10, 14]; // columns in [0.48, tA], [tA, tB], [tB, tW], [tW, 1]
const K_A = T_FIJAS.length + N_TRAMO[0], K_B = K_A + N_TRAMO[1], K_W = K_B + N_TRAMO[2], N_MEDIA = K_W + N_TRAMO[3] + 1;
const suaveP = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v * v * (3 - 2 * v); };
/** Distance from x to the interval [a, b] (0 inside). */
const fuera = (x: number, a: number, b: number) => (x > b ? x - b : x < a ? a - x : 0);

/** Band edges (tA, tB, tW) at a station: exactly the glass outlines where there is glass. */
function bandas(s: Sec): [number, number, number] {
  const tA = T5;
  let tB: number;
  const dV = fuera(s.x, VENTANA.x1, VENTANA.x0);
  if (dV > 0) tB = tA + (0.64 - tA) * suaveP(dV / 0.15);
  else { const v = yVentana(s.x); tB = v ? Math.max(tA, tDeY(s, v[1])) : tA; }
  let tW: number;
  const dW = fuera(s.x, PARABRISAS.xTop, PARABRISAS.xBase);
  if (dW > 0) tW = Math.max(1 - 0.2 * suaveP(dW / 0.15), Math.min(1, tB + 0.04 * suaveP(dW / 0.15)));
  else { const r = rangoParabrisas(s); tW = r ? Math.max(r[0], tB) : 1; }
  return [tA, tB, tW];
}
function columnasSkin(s: Sec): number[] {
  const [tA, tB, tW] = bandas(s), out = T_FIJAS.slice();
  const tramo = (a: number, b: number, n: number) => { for (let k = 0; k < n; k++) out.push(a + (b - a) * k / n); };
  tramo(0.48, tA, N_TRAMO[0]); tramo(tA, tB, N_TRAMO[1]); tramo(tB, tW, N_TRAMO[2]); tramo(tW, 1, N_TRAMO[3]);
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
  const secs = xs.map(x => sec(x)), tsAll = secs.map(s => ts(s));
  const n = tsAll[0].length, cols = orden === 'lado' ? n : 2 * n - 1, filas = xs.length;
  const pos = new Float32Array(filas * cols * 3), nor = new Float32Array(filas * cols * 3), uv = new Float32Array(filas * cols * 2);
  const mitadX = (X_MORRO + X_COLA) / 2, e = 0.002;
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
      const lado = orden === 'lado' ? 1 : orden === 'abajo' ? (c < n - 1 ? -1 : 1) : (c < n - 1 ? -1 : 1);
      const { p, n: nn } = half[k], o = (i * cols + c) * 3;
      pos[o] = xs[i]; pos[o + 1] = p[1]; pos[o + 2] = lado * p[0];
      nor[o] = nn[0]; nor[o + 1] = nn[1]; nor[o + 2] = lado * nn[2];
      if (Math.abs(p[0]) < 1e-7) nor[o + 2] = 0;
      uv[(i * cols + c) * 2] = i / Math.max(1, filas - 1); uv[(i * cols + c) * 2 + 1] = c / Math.max(1, cols - 1);
    }
  }
  return { pos, nor, uv, filas, cols, n, xs };
}

/**
 * Triangles of a grid, skipping the cells `celda(i, k)` rejects (row i, lower
 * half-column k) and those `quitar` rejects (by centroid); `grupo` picks the
 * material group; faces outward.
 */
function caras(R: Rejilla, quitar?: (x: number, y: number, z: number) => boolean, grupo?: (x: number, y: number, z: number) => number, nGrupos = 1, celda?: (i: number, k: number) => boolean): number[][] {
  const grupos: number[][] = Array.from({ length: nGrupos }, () => []);
  const P = R.pos;
  const tri = (u: number, v: number, w: number) => {
    const x = (P[u * 3] + P[v * 3] + P[w * 3]) / 3, y = (P[u * 3 + 1] + P[v * 3 + 1] + P[w * 3 + 1]) / 3, z = (P[u * 3 + 2] + P[v * 3 + 2] + P[w * 3 + 2]) / 3;
    if (quitar && quitar(x, y, z)) return;
    grupos[grupo ? grupo(x, y, z) : 0].push(u, v, w);
  };
  for (let i = 0; i < R.filas - 1; i++) for (let c = 0; c < R.cols - 1; c++) {
    if (celda) { const k = Math.min(Math.abs(c - (R.n - 1)), Math.abs(c + 1 - (R.n - 1))); if (celda(i, k)) continue; }
    const a = i * R.cols + c, cc = a + R.cols;
    tri(a, a + 1, cc); tri(a + 1, cc + 1, cc);
  }
  let sum = 0;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3();
  for (const g of grupos) for (let k = 0; k < g.length; k += 3 * 7) {
    A.fromArray(P, g[k] * 3); B.fromArray(P, g[k + 1] * 3); C.fromArray(P, g[k + 2] * 3);
    N.fromArray(R.nor, g[k] * 3);
    sum += B.sub(A).cross(C.sub(A)).dot(N);
  }
  if (sum < 0) for (const g of grupos) for (let k = 0; k < g.length; k += 3) { const t = g[k + 1]; g[k + 1] = g[k + 2]; g[k + 2] = t; }
  return grupos;
}

function geometria(R: Rejilla, grupos: number[][]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(R.pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(R.nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(R.uv, 2));
  const idx: number[] = []; let k = 0;
  grupos.forEach((l, m) => { for (const v of l) idx.push(v); if (grupos.length > 1) g.addGroup(k, l.length, m); k += l.length; });
  g.setIndex(idx);
  return g;
}

// ------------------------------------------------------------ glass outlines
/** t on the upper skin where the half-section reaches half-width z (searching down from the top centre). */
function tDeZ(s: Sec, z: number, tMin = T5): number {
  if (z <= 0) return 1;
  let hi = 1, lo = NaN;
  for (let t = 0.99; t >= tMin - 1e-9; t -= 0.01) { if (punto(s, t)[0] >= z) { lo = t; break; } hi = t; }
  if (Number.isNaN(lo)) return tMin;
  for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (punto(s, m)[0] >= z) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/** t on the glasshouse side where the half-section reaches height y (between the beltline and the top). */
function tDeY(s: Sec, y: number, tMin = T5): number {
  let lo = tMin, hi = 1;
  if (punto(s, lo)[1] >= y) return lo;
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (punto(s, m)[1] < y) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/** Half-width of the windscreen glass at x (plan view), 0 outside it. */
function zParabrisas(x: number, mas = 0): number {
  const { xBase, xEsquina, zEsquina, xTop } = PARABRISAS;
  if (x > xBase + mas || x < xTop - mas) return 0;
  // base: from the centre out to the corner, an arc in plan
  if (x > xEsquina) { const u = (xBase + mas - x) / (xBase - xEsquina + mas); return (zEsquina + mas) * Math.sqrt(Math.max(0, 1 - (1 - Math.min(1, u)) ** 2)); }
  // sides: the A-pillar, narrowing towards the top with the roof
  const u = (xEsquina - x) / (xEsquina - xTop + mas);
  const zTop = PARABRISAS.zTop;
  const z = zEsquina + (zTop - zEsquina) * Math.min(1, u) + mas;
  // the top edge bows back at the centre: quarter ellipses at the top corners
  const dTop = Math.max(0, x - (xTop - mas));
  return z * Math.sqrt(Math.max(0, 1 - (1 - Math.min(1, dTop / 0.10)) ** 2));
}
/** t-range of the windscreen at a station (null outside it). `mas` grows the outline. */
function rangoParabrisas(s: Sec, mas = 0): [number, number] | null {
  const z = zParabrisas(s.x, mas);
  return z > 0 ? [tDeZ(s, z), 1] : null;
}

/** Side window (side view): bottom on the beltline, top along the roof, A-pillar ahead and a raked rear edge. Memoised per mm. */
const memoVentana = new Map<string, [number, number] | null>();
function yVentana(x: number, mas = 0): [number, number] | null {
  const k = Math.round(x * 1000) + ':' + mas;
  let r = memoVentana.get(k);
  if (r === undefined) { r = yVentanaCalc(Math.round(x * 1000) / 1000, mas); memoVentana.set(k, r); }
  return r;
}
function yVentanaCalc(x: number, mas: number): [number, number] | null {
  const { x0, x1 } = VENTANA;
  if (x > x0 + mas || x < x1 - mas) return null;
  const yb = sec(x).c[5][1] - mas; // the glass starts on the beltline itself (P5)
  // A-pillar: the windscreen's side edge seen from the side, a pillar's width (5 cm) behind it
  const xw = x + 0.05 - mas, zw = zParabrisas(xw);
  const yPilar = zw > 0 ? arribaY(xw, zw) - 0.012 + mas : x < PARABRISAS.xTop ? Infinity : yb;
  // roof line of the window: a hand below the roof edge
  const yTecho = sec(x).c[7][1] - 0.10 + mas;
  // rear edge: steep, down to the pointed end on the beltline
  const yTrasera = yb + (x - (x1 - mas)) * 0.9;
  const yt = Math.min(yPilar, yTecho, yTrasera);
  return yt > yb + 0.004 ? [yb, yt] : null;
}

// ------------------------------------------------------------ wheel openings
const qArco = (x: number, y: number) => Math.hypot((x - ARCO.x) / ARCO.a, (y - ARCO.y) / ARCO.b);
/** Rear tyres come out through the flat floor only (the sides are closed spats). */
const enPozoTrasero = (x: number, y: number, z: number) => Math.abs(x + BATALLA) < 0.33 && Math.abs(Math.abs(z) - VIA_TRAS / 2) < 0.1 && y < 0.16;

function carroceria(xs: number[], M: Mats): THREE.Mesh {
  const R = rejilla(xs, columnasSkin, 'abajo');
  // pull the vertices next to the arch onto the ellipse, so the opening has a clean edge
  for (let v = 0; v < R.pos.length / 3; v++) {
    const x = R.pos[v * 3], y = R.pos[v * 3 + 1], z = R.pos[v * 3 + 2];
    if (Math.abs(z) < ARCO.z - 0.004) continue;
    const q = qArco(x, y);
    if (Math.abs(q - 1) < 0.035 && y > 0.1) { R.pos[v * 3] = ARCO.x + (x - ARCO.x) / q; R.pos[v * 3 + 1] = ARCO.y + (y - ARCO.y) / q; }
  }
  // the glass holes are whole bands of cells, whose edges are the glass outlines themselves
  const enVentana = (x: number) => x <= VENTANA.x0 + 1e-6 && x >= VENTANA.x1 - 1e-6;
  const enParabrisas = (x: number) => x <= PARABRISAS.xBase + 1e-6 && x >= PARABRISAS.xTop - 1e-6;
  const hueco = (i: number, k: number) => {
    const a = xs[i], b = xs[i + 1];
    if (k >= K_A && k < K_B) return enVentana(a) && enVentana(b);
    if (k >= K_W) return enParabrisas(a) && enParabrisas(b);
    return false;
  };
  const grupos = caras(R,
    (x, y, z) => (Math.abs(z) > ARCO.z && qArco(x, y) < 0.999) || enPozoTrasero(x, y, z),
    (_x, y) => (y < 0.135 ? 1 : 0), 2, hueco);
  const m = new THREE.Mesh(geometria(R, grupos), [M.chapa, M.bajos]);
  m.name = 'carroceria';
  return m;
}

/**
 * A glass patch on the skin's own rows, filling a hole cut along the same
 * outline (no lift, no overlap, so the edge is the outline's curve). The black
 * frit is drawn by the glass shader from each vertex's distance to the
 * outline, so its inner edge is a crisp curve at any zoom.
 */
function vidrio(xsPiel: number[], x0: number, x1: number, rango: (s: Sec) => [number, number], n: number, frit: number, M: Mats, orden: 'arriba' | 'lado', nombre: string): THREE.Group {
  const xs = xsPiel.filter(x => x <= x0 + 1e-6 && x >= x1 - 1e-6);
  const R = rejilla(xs, s => { const [a, b] = rango(s); const o: number[] = []; for (let k = 0; k <= n; k++) o.push(a + (b - a) * k / n); return o; }, orden);
  const grupos = caras(R);
  // distance of every vertex to the outline (the grid's border, as segments, so
  // it stays exact where the outline's vertices are far apart), minus the frit width
  const P = R.pos, C = R.cols, F = R.filas, seg: [number, number][] = [];
  for (let i = 0; i < F - 1; i++) seg.push([i * C, (i + 1) * C], [i * C + C - 1, (i + 1) * C + C - 1]);
  for (let c = 0; c < C - 1; c++) seg.push([c, c + 1], [(F - 1) * C + c, (F - 1) * C + c + 1]);
  const dist = new Float32Array(P.length / 3);
  for (let v = 0; v < P.length / 3; v++) {
    const px = P[v * 3], py = P[v * 3 + 1], pz = P[v * 3 + 2]; let d = Infinity;
    for (const [a, b] of seg) {
      const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2], ux = P[b * 3] - ax, uy = P[b * 3 + 1] - ay, uz = P[b * 3 + 2] - az;
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

/** Dark wheel wells behind the front openings: the arch lining and an inner wall. */
function pozosDelanteros(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'pasos-de-rueda';
  const th0 = Math.asin(Math.max(-1, Math.min(1, (0.125 - ARCO.y) / ARCO.b)));
  const N = 56;
  for (const s of [1, -1]) {
    const pos: number[] = [], idx: number[] = [];
    for (let k = 0; k <= N; k++) {
      const th = th0 + (Math.PI - 2 * th0) * k / N;
      const x = ARCO.x + ARCO.a * Math.cos(th), y = ARCO.y + ARCO.b * Math.sin(th);
      const zo = ladoZ(x, y);
      const zf = Number.isFinite(zo) ? zo - 0.003 : ARCO.z + 0.1;
      pos.push(x, y, s * ARCO.z, x, y, s * zf);
      if (k > 0) { const a = 2 * k; idx.push(a - 2, a - 1, a, a - 1, a + 1, a); }
    }
    const forro = new THREE.BufferGeometry(); forro.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); forro.setIndex(idx); forro.computeVertexNormals();
    g.add(malla(forro, M.pozo, 'forro'));
    const sh = new THREE.Shape(); sh.moveTo(ARCO.x + ARCO.a * Math.cos(th0), ARCO.y + ARCO.b * Math.sin(th0));
    for (let k = 1; k <= N; k++) { const th = th0 + (Math.PI - 2 * th0) * k / N; sh.lineTo(ARCO.x + ARCO.a * Math.cos(th), ARCO.y + ARCO.b * Math.sin(th)); }
    sh.closePath();
    const pared = malla(new THREE.ShapeGeometry(sh), M.pozo, 'pared'); pared.position.z = s * ARCO.z; g.add(pared);
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
const espejoZ = (c: P2[]): P2[] => c.map(([z, y]) => [-z, y] as P2);

type Vista = 'lado' | 'arriba' | 'frente' | 'detras' | 'oblicua';
const FUERA: Record<Vista, THREE.Vector3> = { lado: new THREE.Vector3(0, 0, 1), arriba: new THREE.Vector3(0, 1, 0), frente: new THREE.Vector3(1, 0, 0), detras: new THREE.Vector3(-1, 0, 0), oblicua: new THREE.Vector3(Math.cos(TH_FARO), 0, Math.sin(TH_FARO)) };
/** Oblique view coordinates of a point: a across the view (towards +Z and back), b = y. */
const E_OBL = new THREE.Vector3(-Math.sin(TH_FARO), 0, Math.cos(TH_FARO));
const aOblicua = (x: number, z: number) => -Math.sin(TH_FARO) * x + Math.cos(TH_FARO) * z;
/** The skin point a 2D view coordinate lands on: side (x, y), top (x, z), front and rear (z, y). */
function proyectar(v: Vista, a: number, b: number): THREE.Vector3 {
  if (v === 'lado') return new THREE.Vector3(a, b, ladoZ(a, b));
  if (v === 'arriba') return new THREE.Vector3(a, arribaY(a, b), b);
  if (v === 'frente') return new THREE.Vector3(frenteX(a, b), b, a);
  if (v === 'oblicua') {
    const d = FUERA.oblicua, o = E_OBL.clone().multiplyScalar(a).addScaledVector(d, 1.4);
    const p = rayoPiel([o.x, b, o.z], [-d.x, 0, -d.z], 1.6, 0.008);
    return p ? new THREE.Vector3(p[0], p[1], p[2]) : new THREE.Vector3(NaN, NaN, NaN);
  }
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
 * skin normal (or `sepDe(a, b)` per vertex, for blister lenses). `espejo`
 * mirrors it to the other side (z -> -z).
 */
function calco(m: Malla2D, vista: Vista, sep: number | ((a: number, b: number) => number), maxLado = 0.02, espejo = false): THREE.BufferGeometry {
  const s = subdividir(m, maxLado), f = FUERA[vista];
  const pos: number[] = [], ok: boolean[] = [], uvs: number[] = [];
  for (let i = 0; i < s.p.length; i++) {
    const [a, b] = s.p[i];
    const v = proyectar(vista, a, b), bueno = Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z); ok.push(bueno);
    const d = typeof sep === 'number' ? sep : sep(a, b);
    if (bueno) { const n = normalEn(vista, a, b); v.addScaledVector(Number.isFinite(n.x) ? n : f, d); }
    if (espejo) v.z = -v.z;
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
    const dir = f.clone(); if (espejo) dir.z = -dir.z;
    for (let i = 0; i < idx.length; i += 3) { A.fromArray(pos, idx[i] * 3); B.fromArray(pos, idx[i + 1] * 3); C.fromArray(pos, idx[i + 2] * 3); sum += B.sub(A).cross(C.sub(A)).dot(dir); }
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
/** Places an object at p with its +Z along n and +Y as close to up as possible. */
function colocar(o: THREE.Object3D, p: THREE.Vector3, n: THREE.Vector3) {
  o.position.copy(p); o.up.set(0, 1, 0); o.lookAt(p.clone().add(n));
}

// ================================================================ lathe pieces
/** Revolves a profile (r, h) around Z. `mod` can reshape the radius (tread). */
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
 * A narrow low-rolling-resistance tyre and the XL1's aero wheel cover. Axle
 * along Z, cover on +Z; the contact patch is flattened to the loaded radius.
 * Front: a white cover with five black curved blades (the "turbine" look) and
 * a chrome ring round a plain cap. Rear (behind the spats): a flat dark cover.
 */
function rueda(neu: { ancho: number; R: number }, rl: number, rc: number, segs: number, delantera: boolean, M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'rueda';
  const R = neu.R, w = neu.ancho / 2;
  const flanco = (sg: number): P2[] => [
    [rl + 0.006, sg * (w - 0.016)], [rl + 0.014, sg * (w - 0.006)], [rl + 0.028, sg * (w + 0.001)],
    [rl + (R - rl) * 0.42, sg * (w + 0.004)], [rl + (R - rl) * 0.7, sg * (w + 0.002)], [R - 0.016, sg * (w - 0.004)],
    [R - 0.006, sg * (w - 0.012)], [R - 0.0015, sg * (w - 0.020)],
  ];
  const tb: P2[] = [], hm = w - 0.022, surcos = [-0.4, 0, 0.4];
  for (let k = 0; k <= 16; k++) {
    const h = -hm + 2 * hm * k / 16, hn = h / hm;
    const enSurco = surcos.some(s => Math.abs(hn - s) < 0.07);
    tb.push([R - 0.0015 * hn * hn - (enSurco ? 0.0035 : 0), h]);
  }
  const perfil: P2[] = [...flanco(-1), ...tb, ...flanco(1).reverse()];
  const N = 52;
  const neum = torno(perfil, segs, (a, h, r) => {
    if (r < R - 0.004) return r;
    const hn = h / hm, f = (a / (Math.PI * 2)) * N + Math.abs(hn) * 0.6;
    return f - Math.floor(f) < 0.16 && Math.abs(hn) > 0.5 ? r - 0.002 : r;
  });
  const p = neum.attributes.position as THREE.BufferAttribute;
  for (let k = 0; k < p.count; k++) if (p.getY(k) < -rc) { const y = p.getY(k); p.setY(k, -rc); p.setZ(k, p.getZ(k) * (1 + (-rc - y) * 1.5)); }
  neum.computeVertexNormals();
  g.add(malla(neum, M.goma, 'neumatico'));
  g.add(malla(torno([[rl - 0.004, w - 0.020], [rl + 0.002, w - 0.012], [rl + 0.008, w - 0.014], [rl + 0.009, w - 0.024]], 72), M.llantaOscura, 'pestana'));
  // cover: slightly domed outward towards the centre
  const hD = (r: number) => w - 0.014 + 0.012 * (1 - (r / rl) ** 2);
  const disco: P2[] = [];
  for (let k = 0; k <= 14; k++) { const r = (rl - 0.002) * (1 - k / 14); disco.push([r, hD(r)]); }
  g.add(malla(torno(disco, 96), delantera ? M.tapaBlanca : M.llantaOscura, 'tapacubos'));
  if (delantera) {
    // five black blades: wide at the rim, narrow at the hub, swept like a turbine
    const nAl = 5, r0 = 0.052, r1 = rl - 0.012;
    for (let i = 0; i < nAl; i++) {
      const a0 = i * Math.PI * 2 / nAl, pts: P2[] = [];
      for (let k = 0; k <= 10; k++) { const f = k / 10, r = r0 + (r1 - r0) * f, a = a0 - 0.32 * f * f - 0.05 * f; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
      for (let k = 10; k >= 0; k--) { const f = k / 10, r = r0 + (r1 - r0) * f, a = a0 - 0.32 * f * f - 0.05 * f + 0.12 + 0.36 * f; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
      const sp = suave(pts, 1); const sh = new THREE.Shape(); sh.moveTo(sp[0][0], sp[0][1]); for (const q of sp.slice(1)) sh.lineTo(q[0], q[1]); sh.closePath();
      const geo = new THREE.ShapeGeometry(sh, 4);
      const pp = geo.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < pp.count; k++) pp.setZ(k, hD(Math.hypot(pp.getX(k), pp.getY(k))) + 0.0012);
      geo.computeVertexNormals();
      g.add(malla(geo, M.alabe, 'alabe'));
    }
    // chrome ring and a plain cap (no badge)
    g.add(malla(torno([[0.05, hD(0.05) + 0.001], [0.049, hD(0.049) + 0.006], [0.044, hD(0.044) + 0.009], [0.04, hD(0.04) + 0.009], [0.038, hD(0.038) + 0.006]], 48), M.cromoPieza, 'aro'));
    g.add(malla(torno([[0.038, hD(0.038) + 0.006], [0.025, hD(0.025) + 0.009], [0, hD(0) + 0.010]], 40), M.tapaBlanca, 'tapon'));
  }
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
  const g = new THREE.Group(); g.name = 'xl1';
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
  add(pozosDelanteros(M));
  add(vidrio(xs, PARABRISAS.xBase, PARABRISAS.xTop, s => [bandas(s)[2], 1], 15, 0.034, M, 'arriba', 'parabrisas'));
  {
    const v = vidrio(xs, VENTANA.x0, VENTANA.x1, s => { const [a, b] = bandas(s); return [a, b]; }, 8, 0.026, M, 'lado', 'ventanilla');
    add(v); espejo(v);
  }
  // the arch edge: a body-colour lip on the cut and a thin dark line just outside
  const labio: P2[] = [];
  const thL = Math.asin((0.17 - ARCO.y) / ARCO.b);
  for (let k = 0; k <= 48; k++) { const th = thL + (Math.PI - 2 * thL) * k / 48; labio.push([ARCO.x + ARCO.a * Math.cos(th), ARCO.y + ARCO.b * Math.sin(th)]); }
  par(cinta(labio, 0.012, 0.01), 'lado', 0.0008, M.chapaCalco, 0.016, 'labio');

  // ---------------------------------------------------------------- shut lines
  // Gull-wing door: in side view from behind the front arch up to the beltline,
  // then (seen from above) along the windscreen edge and the roof, and down the
  // rear edge to the sill.
  {
    const puerta: P2[] = suave([[-0.17, 0.74], [-0.25, 0.66], [-0.305, 0.60], [-0.315, 0.45], [-0.32, 0.36], [-0.37, 0.31], [-0.5, 0.30], [-1.40, 0.30], [-1.52, 0.33], [-1.62, 0.43], [-1.67, 0.58], [-1.66, 0.72], [-1.62, 0.835]], 3, false);
    par(cinta(puerta, JUNTA, 0.006), 'lado', SEP_JUNTA, M.junta, 0.012, 'junta-puerta');
    const techo: P2[] = suave([[-0.76, 0.30], [-0.85, 0.18], [-1.0, 0.165], [-1.3, 0.17], [-1.48, 0.25], [-1.58, 0.42], [-1.62, 0.56]], 3, false);
    add(malla(calco(cinta(techo, JUNTA, 0.006), 'arriba', SEP_JUNTA, 0.012), M.junta, 'junta-puerta'));
    add(malla(calco(cinta(techo.map(([x, z]) => [x, -z] as P2), JUNTA, 0.006), 'arriba', SEP_JUNTA, 0.012), M.junta, 'junta-puerta'));
  }
  // rear wheel spats: removable covers over the enclosed rear wheels
  {
    const spat: P2[] = suave([[-1.90, 0.17], [-1.91, 0.36], [-1.97, 0.50], [-2.08, 0.585], [-2.22, 0.615], [-2.36, 0.59], [-2.47, 0.52], [-2.55, 0.40], [-2.58, 0.17]], 3, false);
    par(cinta(spat, JUNTA, 0.006), 'lado', SEP_JUNTA, M.junta, 0.012, 'junta-carenado');
  }
  // engine/luggage lid: from the light-bar corners up the deck to the roof
  {
    const tapa: P2[] = suave([[-3.11, 0.56], [-2.9, 0.53], [-2.55, 0.43], [-2.2, 0.33], [-1.95, 0.26], [-1.82, 0.18], [-1.78, 0], [-1.82, -0.18], [-1.95, -0.26], [-2.2, -0.33], [-2.55, -0.43], [-2.9, -0.53], [-3.11, -0.56]], 3, false);
    add(malla(calco(cinta(tapa, JUNTA, 0.006), 'arriba', SEP_JUNTA, 0.012), M.junta, 'junta-portón'));
  }
  // fuel flap on the right rear quarter (+z is the car's right)
  add(malla(calco(cinta(cerrar(suave(rectRedondo(-1.86, 0.60, 0.05, 0.045, 0.02, 3), 1)), 0.003, 0.005), 'lado', SEP_JUNTA, 0.01), M.junta, 'junta-tapa'));

  // ---------------------------------------------------------------- front
  // the black band across the nose that joins the two headlamps, chrome-edged on top
  {
    const banda: P2[] = []; for (let k = 0; k <= 40; k++) { const z = -0.44 + 0.88 * k / 40; banda.push([z, 0.482 + 0.003 * (z / 0.44) ** 2]); }
    add(malla(calco(cinta(banda, 0.05, 0.01), 'frente', 0.0012, 0.012), M.negroBrillo, 'banda'));
    add(malla(calco(cinta(banda.map(([z, y]) => [z, y + 0.0255] as P2), 0.004, 0.01), 'frente', 0.0016, 0.012), M.cromo, 'banda-cromo'));
  }
  // headlamps: the band widens into a dark lens that wraps round the nose's
  // corner back to the wheel arch, with the LED strip along its top; under it a
  // body-colour fin framed by the L-shaped LED indicator, which runs down the
  // arch edge and back under the fin. Corners triangulated on the photos
  // (front, three-quarter); drawn in an oblique view and mirrored.
  {
    const lado = new THREE.Group(); lado.name = 'faro';
    const addL = <T extends THREE.Object3D>(o: T) => { lado.add(o); return o; };
    const ob = (x: number, y: number, z: number): P2 => [aOblicua(x, z), y];
    const lente: P2[] = suave([ob(0.603, 0.508, 0.409), ob(0.50, 0.522, 0.55), ob(0.38, 0.54, 0.68), ob(0.25, 0.561, 0.774), ob(0.235, 0.53, 0.778), ob(0.25, 0.50, 0.774), ob(0.40, 0.482, 0.66), ob(0.50, 0.47, 0.55), ob(0.589, 0.456, 0.417)], 2);
    addL(malla(calco(poligono(lente), 'oblicua', 0.0008, 0.02), M.negroBrillo, 'faro'));
    // LED main and daytime strip along the top, a row of LED cells under it
    addL(malla(calco(cinta(suave([ob(0.59, 0.499, 0.43), ob(0.50, 0.511, 0.55), ob(0.38, 0.528, 0.68), ob(0.27, 0.547, 0.765)], 2, false), 0.011, 0.006), 'oblicua', 0.0016, 0.01), M.ledTira, 'faro-led'));
    for (let k = 0; k < 5; k++) {
      const f = 0.18 + k * 0.15, x = 0.56 - f * 0.31, z = 0.45 + f * 0.31, y = 0.477 + f * 0.05;
      const [a, b] = ob(x, y, z), cel: P2[] = rectRedondo(a, b, 0.016, 0.008, 0.004, 2);
      addL(malla(calco(poligono(cel), 'oblicua', 0.0018, 0.006), M.led, 'faro-led'));
    }
    // L indicator: down the arch edge from the lens and back under the fin to the inner diagonal
    const ele: P2[] = suave([ob(0.252, 0.505, 0.774), ob(0.268, 0.45, 0.765), ob(0.296, 0.39, 0.75), ob(0.40, 0.378, 0.66), ob(0.50, 0.37, 0.55), ob(0.558, 0.368, 0.461)], 2, false);
    addL(malla(calco(cinta(ele, 0.02, 0.006), 'oblicua', 0.0012, 0.01), M.negroBrillo, 'intermitente'));
    addL(malla(calco(cinta(ele, 0.006, 0.006), 'oblicua', 0.0018, 0.01), M.led, 'intermitente-led'));
    addL(malla(calco(cinta([ob(0.558, 0.37, 0.461), ob(0.589, 0.456, 0.417)], 0.005, 0.005), 'oblicua', 0.0012, 0.01), M.negroBrillo, 'faro'));
    addL(malla(calco(poligono(lente), 'oblicua', (a, b) => 0.0012 + 0.004 * Math.min(1, distBorde(lente, a, b) / 0.012), 0.018), M.lente, 'lente-faro'));
    g.add(lado); espejo(lado);
  }
  // plate: blank (no characters), in its recess
  {
    const placa = rectRedondo(0, 0.345, 0.26, 0.055, 0.008, 3);
    add(malla(calco(poligono(placa), 'frente', 0.0018, 0.02), M.placa, 'matricula'));
    add(malla(calco(cinta(cerrar(placa), 0.006, 0.01), 'frente', 0.0022, 0.02), M.negroMate, 'matricula'));
  }
  // lower intake: a wide black opening with louvres at the outer ends, and the
  // dark splitter lip under it that sweeps up towards the wheels
  {
    const toma: P2[] = suave([[-0.58, 0.265], [-0.46, 0.262], [0.46, 0.262], [0.58, 0.265], [0.62, 0.232], [0.52, 0.205], [-0.52, 0.205], [-0.62, 0.232]], 2);
    add(malla(calco(poligono(toma), 'frente', 0.0014, 0.025), M.negroMate, 'toma'));
    for (const sg of [1, -1]) for (let k = 0; k < 4; k++) {
      const y = 0.252 - k * 0.0105;
      add(malla(calco(cinta([[sg * 0.40, y], [sg * 0.585, y + 0.002]], 0.004, 0.01), 'frente', 0.0022, 0.012), M.grisOscuro, 'lama'));
    }
    for (const z of [-0.2, 0.2]) add(malla(calco(cinta([[z, 0.207], [z * 0.98, 0.262]], 0.004, 0.01), 'frente', 0.0022, 0.012), M.grisOscuro, 'lama'));
    const labio: P2[] = suave([[-0.80, 0.22], [-0.70, 0.19], [-0.55, 0.168], [0, 0.162], [0.55, 0.168], [0.70, 0.19], [0.80, 0.22]], 2, false);
    add(malla(calco(cinta(labio, 0.045, 0.01), 'frente', 0.001, 0.02), M.grisOscuro, 'faldon'));
  }

  // ---------------------------------------------------------------- rear
  // red LED band framing the top and both sides of the rear face
  {
    const uL: P2[] = [[0.574, 0.36], [0.566, 0.45], [0.548, 0.53], [0.52, 0.585], [0.47, 0.618], [0.30, 0.632], [0, 0.637]];
    const u: P2[] = [...uL, ...espejoZ(uL).reverse().slice(1)];
    add(malla(calco(cinta(suave(u, 2, false), 0.032, 0.008), 'detras', 0.0012, 0.01), M.rojo, 'piloto'));
    add(malla(calco(cinta(suave(u, 2, false), 0.008, 0.008), 'detras', 0.0018, 0.01), M.rojoLed, 'piloto-led'));
    // plate holder: blank plate in a black frame
    const placa = rectRedondo(0, 0.535, 0.265, 0.062, 0.01, 3);
    add(malla(calco(poligono(placa), 'detras', 0.0018, 0.02), M.negroMate, 'matricula'));
    add(malla(calco(poligono(rectRedondo(0, 0.535, 0.25, 0.05, 0.006, 3)), 'detras', 0.0034, 0.02), M.placa, 'matricula'));
    // parking sensors
    for (const z of [-0.2, 0.2]) {
      const pp = proyectar('detras', z, 0.43), nn = normalEn('detras', z, 0.43);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.004, 20).rotateX(Math.PI / 2), M.plata); colocar(s, pp, nn); add(s);
    }
    // lower panel in silver-grey with the black diffuser opening, red fog and reversing bars, chrome trim
    const panel: P2[] = suave([[-0.56, 0.395], [0.56, 0.395], [0.60, 0.30], [0.58, 0.19], [-0.58, 0.19], [-0.60, 0.30]], 1);
    add(malla(calco(poligono(panel), 'detras', 0.0012, 0.025), M.plata, 'paragolpes'));
    const difusor: P2[] = suave([[-0.50, 0.35], [0.50, 0.35], [0.53, 0.30], [0.51, 0.205], [-0.51, 0.205], [-0.53, 0.30]], 2);
    add(malla(calco(poligono(difusor), 'detras', 0.003, 0.025), M.negroMate, 'difusor'));
    for (const sg of [1, -1]) add(malla(calco(cinta([[sg * 0.30, 0.335], [sg * 0.47, 0.335]], 0.012, 0.01), 'detras', 0.004, 0.012), M.rojo, 'antiniebla'));
    add(malla(calco(cinta([[-0.5, 0.255], [0.5, 0.255]], 0.004, 0.01), 'detras', 0.004, 0.012), M.cromo, 'moldura'));
    for (const y of [0.31, 0.29]) add(malla(calco(cinta([[-0.46, y], [0.46, y]], 0.003, 0.01), 'detras', 0.004, 0.012), M.grisOscuro, 'lama'));
  }
  // engine-lid vents and the third brake light (seen from above)
  {
    for (const sg of [1, -1]) {
      const rej = rectRedondo(-2.08, sg * 0.15, 0.075, 0.085, 0.02, 3);
      add(malla(calco(poligono(rej), 'arriba', 0.0012, 0.015), M.negroMate, 'rejilla'));
      for (let k = 0; k < 6; k++) { const x = -2.0 - k * 0.03; add(malla(calco(cinta([[x, sg * 0.075], [x, sg * 0.225]], 0.008, 0.01), 'arriba', 0.0024, 0.012), M.grisOscuro, 'lama')); }
    }
    add(malla(calco(cinta([[-1.86, -0.15], [-1.855, 0], [-1.86, 0.15]], 0.026, 0.01), 'arriba', 0.0016, 0.012), M.rojo, 'tercera-luz'));
  }

  // ---------------------------------------------------------------- e-mirrors
  // no door mirrors: a small camera pod on each door, below the window's front corner
  {
    const x = -0.40, y = 0.615, z = ladoZ(x, y);
    const pod = new THREE.Group(); pod.name = 'camara-lateral';
    const casco = torno([[0, 0.055], [0.008, 0.05], [0.015, 0.035], [0.018, 0.012], [0.017, -0.02], [0.014, -0.038], [0.012, -0.045]], 28);
    casco.rotateY(Math.PI / 2); casco.scale(1, 0.62, 1);
    pod.add(malla(casco, M.chapa, 'capsula'));
    const tapa = new THREE.Mesh(new THREE.CircleGeometry(0.012, 24).rotateY(-Math.PI / 2), M.negroBrillo); tapa.scale.set(1, 0.62, 1); tapa.position.x = -0.0451; pod.add(tapa);
    const ojo = new THREE.Mesh(new THREE.CircleGeometry(0.005, 20).rotateY(-Math.PI / 2), M.proyector); ojo.position.set(-0.0455, 0, 0); pod.add(ojo);
    const pie = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.03), M.chapa); pie.position.set(0.004, -0.002, -0.016); pod.add(pie);
    pod.position.set(x, y, z + 0.012);
    add(pod); espejo(pod);
  }

  // ---------------------------------------------------------------- wheels
  for (const [r, x, rc, via] of [[rueda(NEU_DEL, R_LLANTA_DEL, RC_DEL, 96, true, M), 0, RC_DEL, VIA_DEL], [rueda(NEU_TRAS, R_LLANTA_TRAS, RC_TRAS, 64, false, M), -BATALLA, RC_TRAS, VIA_TRAS]] as [THREE.Group, number, number, number][]) {
    r.position.set(x, rc, via / 2); add(r);
    const izq = r.clone(); izq.position.z = -via / 2; izq.rotation.y = Math.PI; add(izq);
  }

  // ---------------------------------------------------------------- cabin
  add(cabina(M));

  g.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    m.castShadow = true; m.receiveShadow = true;
    if (m.material === M.lente) m.customDepthMaterial = sinSombra;
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
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i < n; i++) for (const u of us) { const k = h(u); pos.push(curva[i][0] + nor[i][0] * k, curva[i][1] + nor[i][1] * k, u * ancho / 2); }
  const m = us.length;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < m - 1; j++) { const a = i * m + j, b = a + 1, c = a + m, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return malla(g, M.cuero, 'asiento');
}

function cabina(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'cabina';
  // two seats, the passenger's set back a little (staggered), carbon shells
  const perfil: P2[] = [[-0.62, 0.30], [-0.80, 0.25], [-0.95, 0.22], [-1.02, 0.25], [-1.10, 0.42], [-1.18, 0.62], [-1.21, 0.76]];
  const s1 = asiento(perfil, 0.44, M); s1.position.z = 0.24; g.add(s1);
  const s2 = asiento(perfil, 0.44, M); s2.position.set(-0.16, 0, -0.24); g.add(s2);
  // dashboard: a slim carbon shelf under the windscreen, with the instrument screen
  const tablero = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 1.08), M.carbono); tablero.position.set(-0.40, 0.66, 0); tablero.rotation.z = 0.15; g.add(tablero);
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.06), M.pantalla); pantalla.position.set(-0.49, 0.71, 0.24); pantalla.rotation.set(0, -Math.PI / 2, 0); pantalla.rotateX(-0.6); g.add(pantalla);
  for (const z of [0.5, -0.5]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.05), M.pantalla); p.position.set(-0.52, 0.70, z); p.rotation.set(0, -Math.PI / 2, 0); p.rotateX(-0.5); g.add(p); }
  // steering wheel on its column, in front of the left... the XL1 is left-hand drive: driver on the left (z < 0)
  const volante = new THREE.Group(); volante.name = 'volante';
  volante.add(malla(new THREE.TorusGeometry(0.15, 0.014, 10, 48), M.plastico, 'aro'));
  volante.add(malla(new THREE.CylinderGeometry(0.04, 0.045, 0.03, 24).rotateX(Math.PI / 2), M.plastico, 'cubo'));
  for (const a of [0, Math.PI * 0.85, -Math.PI * 0.85]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.01), M.plastico); r.position.set(0.075 * Math.cos(a - Math.PI / 2), 0.075 * Math.sin(a - Math.PI / 2), 0); r.rotation.z = a - Math.PI / 2; volante.add(r); }
  volante.position.set(-0.60, 0.66, -0.24); volante.rotation.set(0, Math.PI / 2, 0); volante.rotateX(-0.5); g.add(volante);
  // centre tunnel, floor and side trims, dark, so the glass does not show the inside of the skin
  const tunel = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.12), M.carbono); tunel.position.set(-1.0, 0.28, 0); g.add(tunel);
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.2), M.plastico); suelo.rotation.x = -Math.PI / 2; suelo.position.set(-1.0, 0.17, 0); g.add(suelo);
  for (const s of [1, -1]) {
    const lat = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.5), M.plastico); lat.position.set(-1.05, 0.48, s * 0.63); lat.rotation.y = s > 0 ? Math.PI : 0; g.add(lat);
  }
  return g;
}
