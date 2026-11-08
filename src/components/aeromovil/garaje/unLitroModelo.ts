import * as THREE from 'three';
import {
  BATALLA, NEU_DEL, NEU_TRAS, RC_DEL, RC_TRAS, R_LLANTA, TL, VIA_DEL, VIA_TRAS, XC0, XC1, X_COLA, X_MORRO,
  arribaY, detrasX, frenteX, ladoZ, punto, sec, tCristal, zCristal, type Sec,
} from './unLitroForma';

/*
 * The VW 1-Litre car (2002) built in three.js: skin, canopy, lights, wheels
 * and a simple tandem cabin. The shape itself lives in `unLitroForma.ts`.
 *
 * - The skin is one grid over (x, t) per side: rows at fixed x, columns at
 *   fixed t. The canopy glass is the same surface between its edge and the top
 *   centre, so glass and carbon meet without a step; normals come from the
 *   grid's neighbours on both sides of every seam, so there are no shading seams.
 * - Shut lines, lamp housings and similar are "decals": a 2D drawing in one
 *   view (side, top, front or rear) projected onto the skin and lifted a
 *   fraction of a millimetre.
 * - Materials (and the procedural carbon weave) are created once per page and
 *   shared by every build. The car itself is built once into a template;
 *   `construir()` hands out copies of its geometries (the viewer disposes
 *   those), and mirrored parts share one geometry.
 */

type P2 = [number, number];

// ======================================================================= materials
function tejidoCarbono(): THREE.CanvasTexture | null {
  // 2/2 twill: each 32 px tow passes over two and under two; every cell gets a
  // shading gradient along its fibres, which is what makes bare carbon shimmer.
  if (typeof document === 'undefined') return null;
  const N = 256, k = 32, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d'); if (!c) return null;
  for (let i = 0; i < N / k; i++) for (let j = 0; j < N / k; j++) {
    const trama = ((i + j) >> 1) % 2 === 0; // weft or warp on top
    const x = i * k, y = j * k;
    const g = trama ? c.createLinearGradient(x, y, x + k, y) : c.createLinearGradient(x, y, x, y + k);
    g.addColorStop(0, trama ? '#0d0e10' : '#0a0b0c'); g.addColorStop(0.5, trama ? '#141518' : '#0d0e10'); g.addColorStop(1, trama ? '#0d0e10' : '#090a0b');
    c.fillStyle = g; c.fillRect(x, y, k, k);
    // the fibres of the tow
    c.strokeStyle = trama ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.015)'; c.lineWidth = 1;
    for (let f = 3; f < k; f += 4) { c.beginPath(); if (trama) { c.moveTo(x, y + f); c.lineTo(x + k, y + f); } else { c.moveTo(x + f, y); c.lineTo(x + f, y + k); } c.stroke(); }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

/**
 * Glass that casts no shadow (a light-tinted canopy lets the sun in). The
 * viewer turns castShadow on for every mesh, so instead the shadow pass gets a
 * depth material with opacity 0; the shadow map copies the glass material's
 * alphaTest (0.01) onto it, and every fragment is discarded.
 */
const sinSombra = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking, opacity: 0 });

let MATS: ReturnType<typeof crearMateriales> | null = null;
function crearMateriales() {
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);
  const decal = (p: THREE.MeshPhysicalMaterialParameters) => fis({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, ...p });
  const tejido = tejidoCarbono();
  return {
    // unpainted carbon-fibre skin under a clear coat (VW: "unlackiert")
    carbono: fis({ color: tejido ? 0xffffff : 0x0c0d0f, map: tejido, roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide }),
    carbonoCalco: decal({ color: tejido ? 0xffffff : 0x0c0d0f, map: tejido, roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 }),
    pozo: fis({ color: 0x070708, roughness: 0.9, side: THREE.DoubleSide }),
    junta: decal({ color: 0x010101, roughness: 0.95 }),
    // the canopy: a light tint (vertex alpha also draws the black frit at the edge) ...
    tinte: fis({ color: 0xffffff, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.01, roughness: 0.15, metalness: 0, side: THREE.DoubleSide }),
    // ... plus its reflections, added on top so they do not fade with the tint's opacity
    reflejo: fis({ color: 0x000000, roughness: 0.03, metalness: 0, clearcoat: 0, transparent: true, depthWrite: false, alphaTest: 0.01, blending: THREE.AdditiveBlending, envMapIntensity: 1.6 }),
    lente: decal({ color: 0x000000, roughness: 0.02, transparent: true, depthWrite: false, alphaTest: 0.01, blending: THREE.AdditiveBlending, envMapIntensity: 1.8 }),
    lenteRoja: decal({ color: 0x3a0306, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02, emissive: 0x7a080d, emissiveIntensity: 0.3, transparent: true, opacity: 0.9, alphaTest: 0.01 }),
    negroBrillo: decal({ color: 0x050607, roughness: 0.18, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }),
    reflector: decal({ color: 0xa4a9af, roughness: 0.22, metalness: 0.95 }),
    blanco: decal({ color: 0xe6e8ea, roughness: 0.25, clearcoat: 1 }),
    cromo: decal({ color: 0xe1e4e8, roughness: 0.08, metalness: 1 }),
    led: decal({ color: 0xffffff, emissive: 0xf2f6ff, emissiveIntensity: 1.1, roughness: 0.3 }),
    ambar: decal({ color: 0xb8742a, roughness: 0.25, clearcoat: 1, emissive: 0x3a1800, emissiveIntensity: 0.3 }),
    rojoLed: decal({ color: 0xc81a1a, emissive: 0xff1010, emissiveIntensity: 0.9, roughness: 0.3 }),
    proyector: fis({ color: 0x0c0f14, roughness: 0.02, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.01 }),
    goma: fis({ color: 0x151516, roughness: 0.93, metalness: 0 }),
    tapa: fis({ color: 0xa7abb1, roughness: 0.34, metalness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.1 }),
    llantaOscura: fis({ color: 0x1b1c1e, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide }),
    tela: fis({ color: 0x1d1e21, roughness: 0.95, side: THREE.DoubleSide }),
    magnesio: fis({ color: 0x6c6f74, roughness: 0.45, metalness: 0.8, side: THREE.DoubleSide }),
    plastico: fis({ color: 0x17181a, roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide }),
    pantalla: fis({ color: 0x05080c, emissive: 0x16324a, emissiveIntensity: 0.6, roughness: 0.1, clearcoat: 1 }),
  };
}
function mats() { return MATS ?? (MATS = crearMateriales()); }
type Mats = ReturnType<typeof crearMateriales>;

// ===================================================================== the skin
const NL = 34, ND = 10, NG = 26; // columns per half: lower body, deck, glass

/** Row spacing: fine at the tips, at the front arches and at the glass ends. */
function filasX(): number[] {
  const paso = (x: number) => {
    let p = 0.021;
    if (Math.abs(x) < 0.40) p = 0.01;
    for (const xc of [XC0, XC1]) { const d = Math.abs(x - xc); if (d < 0.2) p = Math.min(p, Math.max(0.0015, Math.min(0.009, 0.2 * d))); }
    const dt = Math.min(X_MORRO - x, x - X_COLA);
    p = Math.min(p, Math.max(0.0015, 0.1 * dt));
    return p;
  };
  const xs: number[] = [];
  for (let x = X_MORRO; x > X_COLA; x -= paso(x)) xs.push(x);
  xs.push(X_COLA, XC0, XC1);
  xs.sort((a, b) => b - a);
  return xs.filter((x, i) => i === 0 || xs[i - 1] - x > 2e-4);
}

interface Rejilla { pos: Float32Array; nor: Float32Array; uv: Float32Array; filas: number; cols: number; xs: number[] }

/**
 * A grid over the skin: for each row x, the columns run over the t-values
 * `ts(s)` of one half, mirrored to the other side. `orden` 'abajo' puts the
 * bottom centre in the middle of the row (lower body + deck); 'arriba' puts
 * the top centre there (glass). One surface evaluation per vertex; normals
 * come from the neighbouring rows and columns (any two tangents will do, even
 * where t shifts from row to row), so the shading has no facets or seams.
 */
function rejilla(xs: number[], ts: (s: Sec) => number[], orden: 'abajo' | 'arriba'): Rejilla {
  const n = ts(sec(xs[0])).length, cols = 2 * n - 1, filas = xs.length;
  const pos = new Float32Array(filas * cols * 3), nor = new Float32Array(filas * cols * 3), uv = new Float32Array(filas * cols * 2);
  const P = 0.045; // one weave tile, in metres
  for (let i = 0; i < filas; i++) {
    const x = xs[i], s = sec(x), tv = ts(s);
    const mitad = tv.map(t => punto(s, t));
    const arco = [0]; for (let k = 1; k < n; k++) arco.push(arco[k - 1] + Math.hypot(mitad[k][0] - mitad[k - 1][0], mitad[k][1] - mitad[k - 1][1]));
    for (let c = 0; c < cols; c++) {
      // 'abajo': c = 0 is the top of the left half, c = n - 1 the bottom centre
      // 'arriba': c = 0 is the left glass edge, c = n - 1 the top centre
      const k = orden === 'abajo' ? Math.abs(c - (n - 1)) : (c < n ? c : 2 * (n - 1) - c);
      const lado = c < n - 1 ? -1 : 1, p = mitad[k], o = (i * cols + c) * 3;
      pos[o] = x; pos[o + 1] = p[1]; pos[o + 2] = lado * p[0];
      uv[(i * cols + c) * 2] = x / P; uv[(i * cols + c) * 2 + 1] = (orden === 'abajo' ? lado * arco[k] : lado * (arco[n - 1] - arco[k])) / P;
    }
  }
  const signo = orden === 'abajo' ? 1 : -1, mitadX = (X_MORRO + X_COLA) / 2;
  const v = (i: number, c: number, e: number) => pos[(i * cols + c) * 3 + e];
  for (let i = 0; i < filas; i++) for (let c = 0; c < cols; c++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(filas - 1, i + 1), c0 = Math.max(0, c - 1), c1 = Math.min(cols - 1, c + 1);
    // dX points forward (rows run front to back), dC along the row
    const ax = v(i0, c, 0) - v(i1, c, 0), ay = v(i0, c, 1) - v(i1, c, 1), az = v(i0, c, 2) - v(i1, c, 2);
    const bx = v(i, c1, 0) - v(i, c0, 0), by = v(i, c1, 1) - v(i, c0, 1), bz = v(i, c1, 2) - v(i, c0, 2);
    let nx = signo * (ay * bz - az * by), ny = signo * (az * bx - ax * bz), nz = signo * (ax * by - ay * bx);
    const o = (i * cols + c) * 3;
    if (Math.abs(pos[o + 2]) < 1e-6) nz = 0; // on the centre line the normal has no sideways part
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-12) { nx = xs[i] > mitadX ? 1 : -1; ny = 0; nz = 0; } else { nx /= l; ny /= l; nz /= l; }
    nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz;
  }
  return { pos, nor, uv, filas, cols, xs };
}

/** Triangles of a grid, skipping those `quitar` rejects (by centroid); faces outward. */
function caras(R: Rejilla, quitar?: (x: number, y: number, z: number) => boolean, grupo?: (a: number, b: number, c: number) => number): { idx: number[]; grupos: number[][] } {
  const grupos: number[][] = [[], []];
  const P = R.pos;
  const tri = (u: number, v: number, w: number) => {
    if (quitar && quitar((P[u * 3] + P[v * 3] + P[w * 3]) / 3, (P[u * 3 + 1] + P[v * 3 + 1] + P[w * 3 + 1]) / 3, (P[u * 3 + 2] + P[v * 3 + 2] + P[w * 3 + 2]) / 3)) return;
    grupos[grupo ? grupo(u, v, w) : 0].push(u, v, w);
  };
  for (let i = 0; i < R.filas - 1; i++) for (let c = 0; c < R.cols - 1; c++) {
    const a = i * R.cols + c, cc = a + R.cols;
    tri(a, a + 1, cc); tri(a + 1, cc + 1, cc);
  }
  // orientation: compare the summed face normal with the vertex normals
  let sum = 0;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3();
  for (const g of grupos) for (let k = 0; k < g.length; k += 3 * 7) {
    A.fromArray(P, g[k] * 3); B.fromArray(P, g[k + 1] * 3); C.fromArray(P, g[k + 2] * 3);
    N.fromArray(R.nor, g[k] * 3);
    sum += B.sub(A).cross(C.sub(A)).dot(N);
  }
  if (sum < 0) for (const g of grupos) for (let k = 0; k < g.length; k += 3) { const t = g[k + 1]; g[k + 1] = g[k + 2]; g[k + 2] = t; }
  return { idx: grupos.flat(), grupos };
}

function geometria(R: Rejilla, idx: number[], grupos?: number[][], color?: Float32Array): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(R.pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(R.nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(R.uv, 2));
  if (color) g.setAttribute('color', new THREE.BufferAttribute(color, 4));
  g.setIndex(idx);
  if (grupos) { let k = 0; grupos.forEach((l, m) => { g.addGroup(k, l.length, m); k += l.length; }); }
  return g;
}

// ------------------------------------------------------------ wheel openings
/** Front wheel opening, seen from the side: an ellipse around the wheel, cut from the skin where |z| > Z_ARCO. */
const ARCO = { x: 0, y: 0.115, a: 0.355, b: 0.36, z: 0.43 };
const qArco = (x: number, y: number) => Math.hypot((x - ARCO.x) / ARCO.a, (y - ARCO.y) / ARCO.b);
/**
 * Rear tyres come out through the flat floor only (the sides are closed spats;
 * the floor stays flat out to |z| = 0.47 there, so the cut never reaches the
 * rounded lower edge that shows from the side).
 */
const enPozoTrasero = (x: number, y: number, z: number) => Math.abs(x + BATALLA) < 0.31 && Math.abs(z) > 0.335 && Math.abs(z) < 0.468 && y < 0.15;

function carroceria(xs: number[], M: Mats): THREE.Mesh {
  const R = rejilla(xs, s => {
    const tb = tCristal(s), out: number[] = [];
    for (let k = 0; k <= NL; k++) out.push(TL * k / NL);
    for (let k = 1; k <= ND; k++) out.push(TL + (tb - TL) * k / ND);
    return out;
  }, 'abajo');
  // pull the vertices next to the arch onto the ellipse, so the opening has a clean edge
  for (let v = 0; v < R.pos.length / 3; v++) {
    const x = R.pos[v * 3], y = R.pos[v * 3 + 1], z = R.pos[v * 3 + 2];
    if (Math.abs(z) < ARCO.z - 0.004) continue;
    const q = qArco(x, y);
    if (Math.abs(q - 1) < 0.03 && y > 0.1) { R.pos[v * 3] = ARCO.x + (x - ARCO.x) / q; R.pos[v * 3 + 1] = ARCO.y + (y - ARCO.y) / q; }
  }
  // one material all round: the underbelly cover is carbon too (and a second
  // material would draw a stepped line along the lower edge)
  const { idx } = caras(R, (x, y, z) => (Math.abs(z) > ARCO.z && qArco(x, y) < 0.999) || enPozoTrasero(x, y, z));
  const m = new THREE.Mesh(geometria(R, idx), M.carbono);
  m.name = 'carroceria';
  return m;
}

/** The canopy: the skin between the glass edge and the top centre, with a black frit along the edge. */
function cupula(xs: number[], M: Mats): THREE.Group {
  const filas = xs.filter(x => x <= XC0 + 1e-9 && x >= XC1 - 1e-9);
  const R = rejilla(filas, s => { const tb = tCristal(s); const out: number[] = []; for (let k = 0; k <= NG; k++) out.push(tb + (1 - tb) * k / NG); return out; }, 'arriba');
  const { idx } = caras(R);
  // frit: opaque black within 26 mm of the edge, fading over 12 mm. The edge is
  // the first and last column of every row; only rows within 5 cm are searched.
  const col = new Float32Array((R.pos.length / 3) * 4), P = R.pos, C = R.cols;
  for (let v = 0; v < P.length / 3; v++) {
    const i = Math.floor(v / C), x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2]; let d = Infinity;
    for (let j = i; j >= 0 && filas[j] - x < 0.05; j--) for (const b of [j * C, j * C + C - 1]) { const dd = (P[b * 3] - x) ** 2 + (P[b * 3 + 1] - y) ** 2 + (P[b * 3 + 2] - z) ** 2; if (dd < d) d = dd; }
    for (let j = i + 1; j < R.filas && x - filas[j] < 0.05; j++) for (const b of [j * C, j * C + C - 1]) { const dd = (P[b * 3] - x) ** 2 + (P[b * 3 + 1] - y) ** 2 + (P[b * 3 + 2] - z) ** 2; if (dd < d) d = dd; }
    d = Math.sqrt(d);
    const f = Math.min(1, Math.max(0, (d - 0.026) / 0.012)); // 0 = frit, 1 = clear
    const tinte = [0.03, 0.04, 0.045], frit = [0.012, 0.012, 0.014];
    for (let c = 0; c < 3; c++) col[v * 4 + c] = frit[c] + (tinte[c] - frit[c]) * f;
    col[v * 4 + 3] = 1 + (0.42 - 1) * f; // smoked: 42 % over the cabin
  }
  const g = new THREE.Group(); g.name = 'cupula';
  const geo = geometria(R, idx, undefined, col);
  const tinte = new THREE.Mesh(geo, M.tinte); tinte.renderOrder = 2; tinte.customDepthMaterial = sinSombra; tinte.name = 'cristal';
  const reflejo = new THREE.Mesh(geo, M.reflejo); reflejo.renderOrder = 3; reflejo.customDepthMaterial = sinSombra; reflejo.name = 'cristal-reflejo';
  g.add(tinte, reflejo);
  return g;
}

/** Dark wheel wells behind the front openings: the arch lining and an inner wall. */
function pozosDelanteros(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'pasos-de-rueda';
  const th0 = Math.asin(Math.max(-1, Math.min(1, (0.128 - ARCO.y) / ARCO.b)));
  const N = 48;
  for (const s of [1, -1]) {
    const pos: number[] = [], idx: number[] = [];
    for (let k = 0; k <= N; k++) {
      const th = th0 + (Math.PI - 2 * th0) * k / N;
      const x = ARCO.x + ARCO.a * Math.cos(th), y = ARCO.y + ARCO.b * Math.sin(th);
      const zo = ladoZ(x, y);
      const zf = Number.isFinite(zo) ? zo - 0.002 : ARCO.z + 0.1;
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
/** A strip of width w along a polyline (resampled every `paso`). */
function cinta2(pts: P2[], w: number, paso = 0.01): Malla2D {
  const q: P2[] = [];
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
  if (v !== 'lado' && v !== 'arriba') { /* front and rear normals point the right way already */ }
  return n;
}

/**
 * Projects a 2D mesh onto the skin from one view, lifted `sep` along the
 * view direction (or `sepDe(a, b)` per vertex, for blister lenses).
 * `espejo` mirrors it to the other side (z -> -z).
 */
function calco(m: Malla2D, vista: Vista, sep: number | ((a: number, b: number) => number), maxLado = 0.02, espejo = false): THREE.BufferGeometry {
  const s = subdividir(m, maxLado), f = FUERA[vista];
  const pos: number[] = [], ok: boolean[] = [];
  for (const [a, b] of s.p) {
    const v = proyectar(vista, a, b), bueno = Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z); ok.push(bueno);
    v.addScaledVector(f, typeof sep === 'number' ? sep : sep(a, b));
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
 * A narrow low-rolling-resistance tyre on a 16-inch rim behind a flat cover
 * (VW: "flat wheel covers"). Axle along Z, cover on +Z; the contact patch is
 * flattened to the loaded radius `rc`.
 */
function rueda(neu: { ancho: number; R: number }, rc: number, segs: number, M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'rueda';
  const R = neu.R, w = neu.ancho / 2, rl = R_LLANTA;
  // sidewall bulging at ~40 % of its height, rounded shoulder, slightly crowned tread with two grooves
  const flanco = (sg: number): P2[] => [
    [rl + 0.006, sg * (w - 0.016)], [rl + 0.014, sg * (w - 0.006)], [rl + 0.028, sg * (w + 0.001)],
    [rl + (R - rl) * 0.42, sg * (w + 0.004)], [rl + (R - rl) * 0.7, sg * (w + 0.002)], [R - 0.016, sg * (w - 0.004)],
    [R - 0.006, sg * (w - 0.012)], [R - 0.0015, sg * (w - 0.020)],
  ];
  const tb: P2[] = [], hm = w - 0.022, surcos = [-0.38, 0.38];
  for (let k = 0; k <= 14; k++) {
    const h = -hm + 2 * hm * k / 14, hn = h / hm;
    const enSurco = surcos.some(s => Math.abs(hn - s) < 0.08);
    tb.push([R - 0.0015 * hn * hn - (enSurco ? 0.0035 : 0), h]);
  }
  const perfil: P2[] = [...flanco(-1), ...tb, ...flanco(1).reverse()];
  const N = 46; // sipes around the tread
  const neum = torno(perfil, segs, (a, h, r) => {
    if (r < R - 0.004) return r;
    const hn = h / hm, f = (a / (Math.PI * 2)) * N + Math.abs(hn) * 0.6;
    return f - Math.floor(f) < 0.18 && Math.abs(hn) > 0.45 ? r - 0.002 : r;
  });
  // contact patch: everything below the loaded radius sits on the ground
  const p = neum.attributes.position as THREE.BufferAttribute;
  for (let k = 0; k < p.count; k++) if (p.getY(k) < -rc) { const y = p.getY(k); p.setY(k, -rc); p.setZ(k, p.getZ(k) * (1 + (-rc - y) * 1.5)); }
  neum.computeVertexNormals();
  g.add(malla(neum, M.goma, 'neumatico'));
  // rim flange (dark), flat cover slightly dished, small plain centre cap
  g.add(malla(torno([[rl - 0.004, w - 0.020], [rl + 0.002, w - 0.012], [rl + 0.008, w - 0.014], [rl + 0.009, w - 0.024]], 72), M.llantaOscura, 'pestana'));
  const hD = (r: number) => w - 0.016 - 0.006 * (1 - (r / rl) ** 2);
  const disco: P2[] = [];
  for (let k = 0; k <= 12; k++) { const r = (rl - 0.003) * (1 - k / 12); disco.push([r, hD(r)]); }
  g.add(malla(torno(disco, 72), M.tapa, 'tapacubos'));
  g.add(malla(torno([[0.042, hD(0.042) + 0.0005], [0.040, hD(0.04) + 0.0035], [0.03, hD(0.03) + 0.005], [0, hD(0) + 0.0055]], 40), M.tapa, 'tapon'));
  g.add(malla(torno([[0.048, hD(0.048) + 0.0006], [0.044, hD(0.044) + 0.0006]], 40), M.llantaOscura, 'ranura'));
  g.add(malla(torno([[0.152, hD(0.152) + 0.0004], [0.149, hD(0.149) + 0.0004]], 64), M.llantaOscura, 'ranura'));
  // inner face: a dark disc so the wheel is not hollow from inside
  const interior = new THREE.Mesh(new THREE.CircleGeometry(rl + 0.01, 40), M.llantaOscura); interior.position.z = -w + 0.012; interior.rotation.y = Math.PI; g.add(interior);
  return g;
}

// ===================================================================== assembly
/**
 * The car is built once per page into a template that never goes into the
 * scene; every `construir()` returns a copy with its own geometries (the
 * viewer disposes those when it removes the car) and the shared materials.
 */
let PLANTILLA: THREE.Group | null = null;
function construir(): THREE.Group {
  if (!PLANTILLA) PLANTILLA = construirPlantilla();
  const M = mats(), g = PLANTILLA.clone(true), copias = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  g.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    // one copy per template geometry: the mirrored halves keep sharing theirs
    let c = copias.get(m.geometry); if (!c) { c = m.geometry.clone(); copias.set(m.geometry, c); }
    m.geometry = c;
    if (m.material === M.tinte || m.material === M.reflejo || m.material === M.lente || m.material === M.lenteRoja) m.customDepthMaterial = sinSombra;
  });
  return g;
}

function construirPlantilla(): THREE.Group {
  const M = mats();
  const g = new THREE.Group(); g.name = 'unlitro';
  const add = (o: THREE.Object3D) => { g.add(o); return o; };
  /** The same object on the other side: shares its geometry, mirrored by a negative scale. */
  const espejo = (o: THREE.Object3D) => { const c = o.clone(); c.position.z = -o.position.z; c.rotation.y = -o.rotation.y; c.scale.z = -o.scale.z; return add(c); };
  const par = (m: Malla2D, vista: Vista, sep: number, mat: THREE.Material, maxLado = 0.02, nombre = 'junta') => {
    const o = add(malla(calco(m, vista, sep, maxLado), mat, nombre));
    if (vista === 'lado') espejo(o);
  };
  const JUNTA = 0.0045;

  // ---------------------------------------------------------------- skin and glass
  const xs = filasX();
  add(carroceria(xs, M));
  add(cupula(xs, M));
  add(pozosDelanteros(M));
  // the arch edge: a carbon lip on the cut (it also hides the steps of the grid)
  const labio: P2[] = [];
  for (let k = 0; k <= 40; k++) { const th = 0.04 + (Math.PI - 0.08) * k / 40; labio.push([ARCO.x + ARCO.a * Math.cos(th), ARCO.y + ARCO.b * Math.sin(th)]); }
  par(cinta2(labio, 0.010, 0.01), 'lado', 0.0008, M.carbonoCalco, 0.016, 'labio');
  par(cinta2(labio.map(([x, y]) => [ARCO.x + (x - ARCO.x) * 1.035, ARCO.y + (y - ARCO.y) * 1.03] as P2), 0.003, 0.01), 'lado', 0.0012, M.junta, 0.016);

  // ---------------------------------------------------------------- shut lines
  // The canopy door: on the right it is hinged just outside the glass; on the
  // left it is "drawn down" (press kit) to make the step-in opening.
  const MAS = 0.03;
  const zPuerta = (x: number) => zCristal(x, MAS);
  const xJF = -0.52, xJR = -1.62; // where the left-side drop leaves the outline
  const arriba: P2[] = [];
  const x0 = XC0 + MAS, x1 = XC1 - MAS;
  // right side, front to rear, then round the rear end and the front end on the left (plan view, (x, z))
  const NPU = 140;
  for (let k = 0; k <= NPU; k++) { const u = k / NPU, x = x0 + (x1 - x0) * (0.5 - 0.5 * Math.cos(Math.PI * u)); arriba.push([x, zPuerta(x)]); }
  const derecha = arriba, izqDel = arriba.filter(([x]) => x >= xJF).map(([x, z]) => [x, -z] as P2), izqTras = arriba.filter(([x]) => x <= xJR).map(([x, z]) => [x, -z] as P2);
  add(malla(calco(cinta2(derecha, JUNTA, 0.006), 'arriba', 0.0008, 0.012), M.junta, 'junta-puerta'));
  add(malla(calco(cinta2(izqDel, JUNTA, 0.006), 'arriba', 0.0008, 0.012), M.junta, 'junta-puerta'));
  add(malla(calco(cinta2(izqTras, JUNTA, 0.006), 'arriba', 0.0008, 0.012), M.junta, 'junta-puerta'));
  {
    // left-side drop, in side view, from the outline down to the sill and back up
    const yF = arribaY(xJF, zPuerta(xJF)), yR = arribaY(xJR, zPuerta(xJR));
    const baja: P2[] = suave([[xJF, yF], [xJF - 0.03, 0.60], [-0.57, 0.47], [-0.64, 0.425], [-0.80, 0.415], [-1.40, 0.415], [-1.54, 0.425], [-1.59, 0.47], [xJR + 0.02, 0.60], [xJR, yR]], 3, false);
    add(malla(calco(cinta2(baja, JUNTA, 0.006), 'lado', 0.0008, 0.012, true), M.junta, 'junta-puerta'));
  }
  // rear wheel spats (removable covers over the fully enclosed rear wheels)
  const spat: P2[] = suave([[-1.885, 0.16], [-1.885, 0.40], [-1.95, 0.505], [-2.08, 0.548], [-2.205, 0.556], [-2.33, 0.548], [-2.44, 0.505], [-2.515, 0.40], [-2.53, 0.20]], 3, false);
  par(cinta2(spat, JUNTA, 0.006), 'lado', 0.0008, M.junta, 0.012);
  // luggage flap on the tail (80 l "under a separate flap in the rear")
  add(malla(calco(cinta2(cerrar(suave(rectRedondo(-2.62, 0, 0.25, 0.215, 0.09, 6), 1)), JUNTA, 0.006), 'arriba', 0.0008, 0.012), M.junta, 'junta-maletero'));
  // engine cover, ahead of it
  add(malla(calco(cinta2(cerrar(suave(rectRedondo(-2.07, 0, 0.17, 0.20, 0.07, 6), 1)), JUNTA, 0.006), 'arriba', 0.0008, 0.012), M.junta, 'junta-motor'));
  // side cooling-air flaps (they open only when the engine needs it): closed, three louvres
  {
    const marco = cerrar(suave(rectRedondo(-1.75, 0.505, 0.095, 0.042, 0.02, 4), 1));
    par(cinta2(marco, JUNTA, 0.006), 'lado', 0.0008, M.junta, 0.012);
    for (const y of [0.488, 0.505, 0.522]) par(cinta2([[-1.83, y], [-1.67, y]], 0.0035, 0.01), 'lado', 0.0008, M.junta, 0.012);
  }

  // ---------------------------------------------------------------- headlamps
  // Bi-xenon projector, LED daytime strip and LED indicator under a clear
  // blister lens, at the upper corners of the nose (front view, (z, y)).
  {
    // built on the right (+z) and mirrored to the left
    const lado = new THREE.Group(); lado.name = 'faro';
    const s = 1;
    const add = (o: THREE.Object3D) => { lado.add(o); return o; };
    // a slim teardrop that follows the nose's upper corner, rounder outboard
    const faro: P2[] = suave([[0.215, 0.478], [0.30, 0.494], [0.39, 0.503], [0.47, 0.50], [0.515, 0.487], [0.527, 0.468], [0.505, 0.451], [0.435, 0.447], [0.34, 0.455], [0.255, 0.467]], 2)
      .map(([z, y]) => [s * z, y] as P2);
    // housing: silver reflector inside, a black gasket round the edge
    add(malla(calco(poligono(faro), 'frente', 0.0008, 0.02), M.reflector, 'faro'));
    add(malla(calco(cinta2(cerrar(faro), 0.005, 0.01), 'frente', 0.0011, 0.02), M.negroBrillo, 'faro'));
    // the projector sits in a black bowl with a chrome ring
    const zp = s * 0.44, yp = 0.475;
    const elipse = (rz: number, ry: number, n = 28): P2[] => { const o: P2[] = []; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; o.push([zp + rz * Math.cos(a), yp + ry * Math.sin(a)]); } return o; };
    add(malla(calco(poligono(elipse(0.034, 0.021)), 'frente', 0.0012, 0.012), M.negroBrillo, 'faro'));
    add(malla(calco(cinta2(cerrar(elipse(0.0215, 0.0178)), 0.0025, 0.005), 'frente', 0.0016, 0.01), M.cromo, 'bisel'));
    const pp = proyectar('frente', zp, yp), nn = normalEn('frente', zp, yp);
    const lente = new THREE.Mesh(new THREE.SphereGeometry(0.019, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.3), M.proyector);
    lente.rotation.x = Math.PI / 2;
    const soporte = new THREE.Group(); soporte.add(lente); lente.position.z = -0.0135;
    colocar(soporte, pp.clone().addScaledVector(nn, 0.0012), nn); add(soporte);
    // LED daytime light: a thin line just inside the upper edge
    add(malla(calco(cinta2(suave([[s * 0.245, 0.48], [s * 0.31, 0.4905], [s * 0.37, 0.4955], [s * 0.40, 0.4955]], 2, false), 0.003, 0.006), 'frente', 0.0022, 0.012), M.led, 'luz-diurna'));
    // indicator: amber segment at the outer end, under the same lens
    add(malla(calco(poligono(suave([[s * 0.49, 0.458], [s * 0.512, 0.462], [s * 0.522, 0.472], [s * 0.512, 0.486], [s * 0.49, 0.49], [s * 0.484, 0.474]], 1)), 'frente', 0.0016, 0.006), M.ambar, 'intermitente'));
    // clear blister lens: meets the skin at its edge, 8 mm proud in the middle
    add(malla(calco(poligono(faro), 'frente', (a, b) => 0.0012 + 0.008 * Math.min(1, distBorde(faro, a, b) / 0.018), 0.016), M.lente, 'lente-faro'));
    g.add(lado); espejo(lado);
  }

  // ---------------------------------------------------------------- tail lamps
  // LED clusters at the tail (rear view, (z, y)): red lens with a row of LEDs,
  // an amber indicator outboard, the reversing lamp inboard.
  {
    const lado = new THREE.Group(); lado.name = 'piloto';
    const s = 1;
    const add = (o: THREE.Object3D) => { lado.add(o); return o; };
    const piloto: P2[] = suave([[0.035, 0.552], [0.12, 0.562], [0.20, 0.556], [0.245, 0.538], [0.25, 0.515], [0.21, 0.505], [0.12, 0.507], [0.035, 0.515]], 2)
      .map(([z, y]) => [s * z, y] as P2);
    add(malla(calco(poligono(piloto), 'detras', 0.0008, 0.02), M.reflector, 'piloto'));
    add(malla(calco(cinta2(cerrar(piloto), 0.005, 0.01), 'detras', 0.0011, 0.02), M.negroBrillo, 'piloto'));
    for (let k = 0; k < 6; k++) {
      const z = s * (0.075 + k * 0.026), y = 0.533 + 0.004 * Math.sin(k / 5 * Math.PI);
      const led: P2[] = []; for (let j = 0; j < 10; j++) { const a = j / 10 * Math.PI * 2; led.push([z + 0.006 * Math.cos(a), y + 0.006 * Math.sin(a)]); }
      add(malla(calco(poligono(led), 'detras', 0.0018, 0.012), M.rojoLed, 'led'));
    }
    add(malla(calco(poligono(suave([[s * 0.222, 0.52], [s * 0.245, 0.522], [s * 0.247, 0.536], [s * 0.226, 0.546]], 1)), 'detras', 0.0018, 0.006), M.ambar, 'intermitente'));
    add(malla(calco(poligono(rectRedondo(s * 0.05, 0.533, 0.012, 0.011, 0.005, 3)), 'detras', 0.0018, 0.012), M.blanco, 'marcha-atras'));
    add(malla(calco(poligono(piloto), 'detras', (a, b) => 0.0012 + 0.007 * Math.min(1, distBorde(piloto, a, b) / 0.015), 0.014), M.lenteRoja, 'lente-piloto'));
    g.add(lado); espejo(lado);
  }
  // reversing camera, centred under the lamps
  {
    const pp = proyectar('detras', 0, 0.475), nn = normalEn('detras', 0, 0.475);
    const cam = new THREE.Group();
    const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.012, 24).rotateX(Math.PI / 2), M.negroBrillo); cuerpo.position.z = 0.002; cam.add(cuerpo);
    const ojo = new THREE.Mesh(new THREE.CircleGeometry(0.007, 20), M.proyector); ojo.position.z = 0.0085; cam.add(ojo);
    colocar(cam, pp, nn); add(cam);
  }

  // ------------------------------------------------- side indicators with cameras
  // "rear visibility via cameras in the side turn signals": a small pod on each
  // flank behind the front wheel, amber lens outboard, camera looking back.
  {
    const x = -0.40, y = 0.582, z = ladoZ(x, y);
    const pod = new THREE.Group(); pod.name = 'camara-lateral';
    const casco = torno([[0, 0.05], [0.007, 0.047], [0.013, 0.036], [0.016, 0.018], [0.016, -0.02], [0.014, -0.036], [0.0125, -0.042]], 28);
    casco.rotateY(Math.PI / 2); casco.scale(1, 0.75, 1); // axis along X, nose forward
    pod.add(malla(casco, M.carbono, 'capsula'));
    const tapa = new THREE.Mesh(new THREE.CircleGeometry(0.012, 24).rotateY(-Math.PI / 2), M.negroBrillo); tapa.scale.set(1, 0.75, 1); tapa.position.x = -0.0421; pod.add(tapa);
    const ojo = new THREE.Mesh(new THREE.CircleGeometry(0.0055, 20).rotateY(-Math.PI / 2), M.proyector); ojo.position.set(-0.0425, 0, 0); pod.add(ojo);
    const intermitente = new THREE.Mesh(new THREE.CapsuleGeometry(0.004, 0.03, 4, 10).rotateZ(Math.PI / 2), M.ambar); intermitente.position.set(0.004, 0, 0.0135); pod.add(intermitente);
    const pie = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.008, 0.02), M.carbono); pie.position.set(-0.002, -0.004, -0.012); pod.add(pie);
    pod.position.set(x, y, z + 0.012);
    add(pod); espejo(pod);
  }

  // ---------------------------------------------------------------- wheels
  // one front and one rear wheel; the left ones are the same geometry turned round
  for (const [r, x, rc, via] of [[rueda(NEU_DEL, RC_DEL, 96, M), 0, RC_DEL, VIA_DEL], [rueda(NEU_TRAS, RC_TRAS, 72, M), -BATALLA, RC_TRAS, VIA_TRAS]] as [THREE.Group, number, number, number][]) {
    r.position.set(x, rc, via / 2); add(r);
    const izq = r.clone(); izq.position.z = -via / 2; izq.rotation.y = Math.PI; add(izq);
  }

  // ---------------------------------------------------------------- cabin
  add(cabina(M));

  g.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    m.castShadow = true; m.receiveShadow = true;
    if (m.material === M.lente || m.material === M.lenteRoja) m.customDepthMaterial = sinSombra;
  });
  return g;
}

// ===================================================================== the cabin
/**
 * A tandem seat: fabric stretched over a magnesium frame (press kit). The
 * profile runs from the front of the cushion to the top of the backrest; the
 * seat is that profile swept across its width, sagging in the middle and
 * rising into bolsters at the sides, with the outer strips in magnesium.
 */
function asiento(perfil: P2[], ancho: number, M: Mats): THREE.Mesh {
  const curva = suave(perfil, 2, false), n = curva.length;
  const nor: P2[] = curva.map((_, i) => { const a = curva[Math.max(0, i - 1)], b = curva[Math.min(n - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l]; });
  // across the seat: frame (|u| > 0.9), bolster, sagging middle
  const us = [-1, -0.97, -0.9, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 0.9, 0.97, 1];
  const h = (u: number) => (Math.abs(u) >= 0.9 ? 0.05 + 0.012 * (1 - (1 - Math.abs(u)) / 0.1) : 0.055 * Math.abs(u) ** 3 - 0.012 * (1 - u * u));
  const pos: number[] = [], tela: number[] = [], marco: number[] = [];
  for (let i = 0; i < n; i++) for (const u of us) { const k = h(u); pos.push(curva[i][0] + nor[i][0] * k, curva[i][1] + nor[i][1] * k, u * ancho / 2); }
  const m = us.length;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < m - 1; j++) {
    const a = i * m + j, b = a + 1, c = a + m, d = c + 1;
    (Math.abs(us[j] + us[j + 1]) / 2 > 0.9 ? marco : tela).push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex([...tela, ...marco]); g.addGroup(0, tela.length, 0); g.addGroup(tela.length, marco.length, 1);
  g.computeVertexNormals();
  return malla(g, [M.tela, M.magnesio], 'asiento');
}

function cabina(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'cabina';
  // driver in front, passenger behind (legs either side of the driver's seat)
  g.add(asiento([[-0.40, 0.30], [-0.56, 0.255], [-0.70, 0.215], [-0.76, 0.24], [-0.86, 0.43], [-0.95, 0.62], [-0.985, 0.74]], 0.42, M));
  g.add(asiento([[-1.10, 0.33], [-1.26, 0.29], [-1.40, 0.255], [-1.46, 0.28], [-1.56, 0.46], [-1.64, 0.64], [-1.67, 0.75]], 0.46, M));
  // dashboard: a slim binnacle with the instrument screen and the two camera screens
  const tablero = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.22, 32, 1, true, -Math.PI * 0.42, Math.PI * 0.84), M.plastico);
  tablero.rotation.set(0, 0, Math.PI / 2); tablero.scale.set(0.35, 1, 1); tablero.position.set(-0.20, 0.555, 0); g.add(tablero);
  for (const [z, w] of [[0, 0.15], [0.21, 0.07], [-0.21, 0.07]] as [number, number][]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.05), M.pantalla);
    p.position.set(-0.27, 0.615, z); p.rotation.set(0, -Math.PI / 2, 0); p.rotateX(-0.5); g.add(p);
  }
  // steering wheel (magnesium) on its column
  const volante = new THREE.Group(); volante.name = 'volante';
  volante.add(malla(new THREE.TorusGeometry(0.125, 0.012, 10, 48), M.plastico, 'aro'));
  volante.add(malla(new THREE.CylinderGeometry(0.035, 0.04, 0.03, 24).rotateX(Math.PI / 2), M.plastico, 'cubo'));
  for (const a of [0, Math.PI * 0.85, -Math.PI * 0.85]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.016, 0.008), M.magnesio); r.position.set(0.075 * Math.cos(a + Math.PI / 2), 0.075 * Math.sin(a + Math.PI / 2), 0); r.rotation.z = a + Math.PI / 2; volante.add(r); }
  volante.position.set(-0.36, 0.585, 0); volante.rotation.set(0, Math.PI / 2, 0); volante.rotateX(-0.45); g.add(volante);
  const columna = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.20, 12), M.plastico);
  columna.position.set(-0.27, 0.543, 0); columna.rotation.z = 1.13; g.add(columna); // from the hub forward and down to the bulkhead
  // rotary gear selector on the right-hand side panel
  const mando = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.025, 20), M.magnesio); mando.rotation.x = Math.PI / 2; mando.position.set(-0.62, 0.50, 0.30); g.add(mando);
  // cabin floor and side trims, dark, so the glass does not show the inside of the skin
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.78), M.plastico); suelo.rotation.x = -Math.PI / 2; suelo.position.set(-1.0, 0.17, 0); g.add(suelo);
  for (const s of [1, -1]) {
    const lat = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.36), M.plastico); lat.position.set(-1.0, 0.45, s * 0.43); lat.rotation.y = s > 0 ? Math.PI : 0; g.add(lat);
  }
  return g;
}

export { construir };
