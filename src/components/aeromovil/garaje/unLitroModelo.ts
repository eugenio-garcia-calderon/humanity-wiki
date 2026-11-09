import * as THREE from 'three';
import {
  BATALLA, NEU_DEL, NEU_TRAS, RC_DEL, RC_TRAS, R_LLANTA, TL, VIA_DEL, VIA_TRAS, XC0, XC1, X_COLA, X_MORRO,
  arribaY, detrasX, frenteX, ladoZ, punto, rayoPiel, sec, tCristal, type Sec,
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
 *   view (side, top, front, rear, or an oblique view for the headlamps on the
 *   nose corners) projected onto the skin and lifted a fraction of a millimetre.
 * - What the 2026-11-09 photo showed is noted where it is used: clear glass
 *   with the door's two dark hoops, black wheel discs, the larger front wheel
 *   opening with its rolled lip, twin round headlamps, the LED strip below
 *   them, the left-side door outline, the sill crease and the side inlet.
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
  // Tones (2026-11-09): the photo shows the bare carbon as a glossy dark
  // charcoal (its shaded side reads ~ RGB 50-60 next to tyres at 15 and the
  // black wheel covers at 42), not as black: the weave is lifted accordingly.
  const N = 256, k = 32, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d'); if (!c) return null;
  for (let i = 0; i < N / k; i++) for (let j = 0; j < N / k; j++) {
    const trama = ((i + j) >> 1) % 2 === 0; // weft or warp on top
    const x = i * k, y = j * k;
    const g = trama ? c.createLinearGradient(x, y, x + k, y) : c.createLinearGradient(x, y, x, y + k);
    g.addColorStop(0, trama ? '#29292a' : '#262627'); g.addColorStop(0.5, trama ? '#2f2f30' : '#2a2a2b'); g.addColorStop(1, trama ? '#29292a' : '#252526');
    c.fillStyle = g; c.fillRect(x, y, k, k);
    // the fibres of the tow
    c.strokeStyle = trama ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.012)'; c.lineWidth = 1;
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
    // unpainted carbon-fibre skin under a clear coat (VW: "unlackiert"; supercars.net:
    // "to save weight, it is of course not painted"): dark charcoal with a high gloss
    carbono: fis({ color: tejido ? 0xffffff : 0x242527, map: tejido, roughness: 0.34, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide }),
    carbonoCalco: decal({ color: tejido ? 0xffffff : 0x242527, map: tejido, roughness: 0.34, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03 }),
    pozo: fis({ color: 0x070708, roughness: 0.9, side: THREE.DoubleSide }),
    junta: decal({ color: 0x010101, roughness: 0.95 }),
    // a shallow body crease: only a little darker than the carbon
    pliegue: decal({ color: 0x0d0e0f, roughness: 0.6, transparent: true, opacity: 0.55 }),
    // canopy frames (the door's front and rear hoops): satin black
    marco: decal({ color: 0x0b0c0d, roughness: 0.4, metalness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide }),
    // the canopy: clear glass (vertex alpha also draws the black frit at the edge and the smoked rear part) ...
    tinte: fis({ color: 0xffffff, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.01, roughness: 0.15, metalness: 0, side: THREE.DoubleSide }),
    // ... plus its reflections, added on top so they do not fade with the tint's opacity
    reflejo: fis({ color: 0x000000, roughness: 0.03, metalness: 0, clearcoat: 0, transparent: true, depthWrite: false, alphaTest: 0.01, blending: THREE.AdditiveBlending, envMapIntensity: 1.25 }),
    lente: decal({ color: 0x000000, roughness: 0.02, transparent: true, depthWrite: false, alphaTest: 0.01, blending: THREE.AdditiveBlending, envMapIntensity: 1.8 }),
    lenteRoja: decal({ color: 0x3a0306, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02, emissive: 0x7a080d, emissiveIntensity: 0.3, transparent: true, opacity: 0.9, alphaTest: 0.01 }),
    negroBrillo: decal({ color: 0x050607, roughness: 0.18, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }),
    reflector: decal({ color: 0x8c9096, roughness: 0.32, metalness: 0.7 }),
    blanco: decal({ color: 0xe6e8ea, roughness: 0.25, clearcoat: 1 }),
    cromo: decal({ color: 0xe1e4e8, roughness: 0.08, metalness: 1 }),
    led: decal({ color: 0xffffff, emissive: 0xf2f6ff, emissiveIntensity: 1.1, roughness: 0.3 }),
    ambar: decal({ color: 0xb8742a, roughness: 0.25, clearcoat: 1, emissive: 0x3a1800, emissiveIntensity: 0.3 }),
    rojoLed: decal({ color: 0xc81a1a, emissive: 0xff1010, emissiveIntensity: 0.9, roughness: 0.3 }),
    proyector: fis({ color: 0x0c0f14, roughness: 0.02, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.01 }),
    // the dipped beam, lit in the photo
    proyectorLuz: fis({ color: 0xdfe6ee, emissive: 0xeef3ff, emissiveIntensity: 0.55, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.01 }),
    goma: fis({ color: 0x151516, roughness: 0.93, metalness: 0 }),
    // full black wheel discs (photo: they read darker than the carbon, with a soft sheen)
    tapa: fis({ color: 0x0e0f10, roughness: 0.42, metalness: 0.15, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
    tapon: fis({ color: 0xc9cdd2, roughness: 0.2, metalness: 1 }),
    llantaOscura: fis({ color: 0x1b1c1e, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide }),
    tela: fis({ color: 0x4a4c50, roughness: 0.95, side: THREE.DoubleSide }),
    magnesio: fis({ color: 0x6c6f74, roughness: 0.45, metalness: 0.8, side: THREE.DoubleSide }),
    plastico: fis({ color: 0x3c3f43, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide }),
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
/**
 * Front wheel opening, seen from the side: an ellipse around the wheel, cut
 * from the skin where |z| > Z_ARCO. Photo (2026-11-09): the arch lip peaks at
 * y = 0.64 just ahead of the axle, its front edge is at x = +0.36 and its rear
 * edge at -0.29, and it runs down to the body's lower edge, so the whole wheel
 * shows (the previous opening topped out at 0.475 and hid the upper wheel).
 */
const ARCO = { x: 0.02, y: 0.27, a: 0.31, b: 0.345, z: 0.43 };
const qArco = (x: number, y: number) => Math.hypot((x - ARCO.x) / ARCO.a, (y - ARCO.y) / ARCO.b);
/**
 * Rear tyres come out through the floor only (the sides stay closed); the
 * floor is raised at the rear axle, so the lower ~0.19 m of each rear tyre
 * shows under the body, as in the photo.
 */
const enPozoTrasero = (x: number, y: number, z: number) => Math.abs(x + BATALLA) < 0.31 && Math.abs(z) > 0.335 && Math.abs(z) < 0.468 && y < 0.215;

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

/**
 * The door's two hoops over the canopy (photo): each lies in a plane that
 * leans, from x = `base` on the glass edge along the sides to x = `cima` at
 * the top centre. The front one is the dark frame behind the windscreen; the
 * rear one closes the side window, and behind it the glass is smoked.
 */
const ARO_DEL = { base: -0.35, cima: -0.66 }, ARO_TRAS = { base: -1.52, cima: -1.38 };
const Y_BASE_ARO = 0.788, Y_CIMA_ARO = 1.11;
const xAro = (a: { base: number; cima: number }, y: number) => a.base + (a.cima - a.base) * (y - Y_BASE_ARO) / (Y_CIMA_ARO - Y_BASE_ARO);

/** The canopy: the skin between the glass edge and the top centre, with a black frit along the edge. */
function cupula(xs: number[], M: Mats): THREE.Group {
  const filas = xs.filter(x => x <= XC0 + 1e-9 && x >= XC1 - 1e-9);
  const R = rejilla(filas, s => { const tb = tCristal(s); const out: number[] = []; for (let k = 0; k <= NG; k++) out.push(tb + (1 - tb) * k / NG); return out; }, 'arriba');
  const { idx } = caras(R);
  // frit: opaque black within 30 mm of the edge, fading over 12 mm. The edge is
  // the first and last column of every row; only rows within 5 cm are searched.
  // Clear glass over the cabin (photo: the driver is plainly visible); behind
  // the rear hoop the glass is smoked (it reads lighter and opaque in the photo).
  const col = new Float32Array((R.pos.length / 3) * 4), P = R.pos, C = R.cols;
  for (let v = 0; v < P.length / 3; v++) {
    const i = Math.floor(v / C), x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2]; let d = Infinity;
    for (let j = i; j >= 0 && filas[j] - x < 0.05; j--) for (const b of [j * C, j * C + C - 1]) { const dd = (P[b * 3] - x) ** 2 + (P[b * 3 + 1] - y) ** 2 + (P[b * 3 + 2] - z) ** 2; if (dd < d) d = dd; }
    for (let j = i + 1; j < R.filas && x - filas[j] < 0.05; j++) for (const b of [j * C, j * C + C - 1]) { const dd = (P[b * 3] - x) ** 2 + (P[b * 3 + 1] - y) ** 2 + (P[b * 3 + 2] - z) ** 2; if (dd < d) d = dd; }
    d = Math.sqrt(d);
    const f = Math.min(1, Math.max(0, (d - 0.030) / 0.012)); // 0 = frit, 1 = glass
    const humo = Math.min(1, Math.max(0, (xAro(ARO_TRAS, y) - x) / 0.02)); // 1 behind the rear hoop
    const claro = [0.06, 0.075, 0.08], ahumado = [0.035, 0.04, 0.045], frit = [0.012, 0.012, 0.014];
    const aCristal = 0.12 + (0.48 - 0.12) * humo;
    for (let c = 0; c < 3; c++) { const t = claro[c] + (ahumado[c] - claro[c]) * humo; col[v * 4 + c] = frit[c] + (t - frit[c]) * f; }
    col[v * 4 + 3] = 1 + (aCristal - 1) * f;
  }
  const g = new THREE.Group(); g.name = 'cupula';
  const geo = geometria(R, idx, undefined, col);
  const tinte = new THREE.Mesh(geo, M.tinte); tinte.renderOrder = 2; tinte.customDepthMaterial = sinSombra; tinte.name = 'cristal';
  const reflejo = new THREE.Mesh(geo, M.reflejo); reflejo.renderOrder = 3; reflejo.customDepthMaterial = sinSombra; reflejo.name = 'cristal-reflejo';
  g.add(tinte, reflejo);
  return g;
}

/**
 * A hoop over the canopy as a ribbon `ancho` wide, lifted 2.5 mm off the glass:
 * for each column t of the section (glass edge to top centre, both sides) the
 * station x is found where the skin point sits on the hoop's leaning plane.
 */
function aroGeo(aro: { base: number; cima: number }, ancho: number): THREE.BufferGeometry {
  const N = 36, filas: THREE.Vector3[][] = [];
  const enPiel = (x: number, t: number) => { const p = punto(sec(x), t); return new THREE.Vector3(x, p[1], p[0]); };
  // the half from the top centre (k = 0) down to the glass edge (k = N); t of the edge depends on x
  const mitad: { x: number; t: number }[] = [];
  for (let k = 0; k <= N; k++) {
    let x = aro.cima, t = 1;
    for (let it = 0; it < 8; it++) {
      const tb = tCristal(sec(x)); t = 1 - (1 - tb) * k / N;
      x = xAro(aro, punto(sec(x), t)[1]);
    }
    mitad.push({ x, t });
  }
  const pos: number[] = [], idx: number[] = [];
  const lados: [number, number][] = [];
  for (let k = N; k >= 0; k--) lados.push([k, -1]);
  for (let k = 1; k <= N; k++) lados.push([k, 1]);
  lados.forEach(([k, s], i) => {
    const { x, t } = mitad[k];
    const a = enPiel(x + ancho / 2, t), b = enPiel(x - ancho / 2, t), c = enPiel(x, Math.min(1, t + 0.01)), d = enPiel(x, Math.max(0, t - 0.01));
    const n = new THREE.Vector3().crossVectors(a.clone().sub(b), c.clone().sub(d)).normalize();
    if (n.y < 0 || (Math.abs(n.y) < 0.2 && n.z < 0)) n.negate();
    for (const p of [a, b]) { p.addScaledVector(n, 0.0025); pos.push(p.x, p.y, s * p.z); }
    if (i > 0) { const q = 2 * i; idx.push(q - 2, q - 1, q, q - 1, q + 1, q); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Dark wheel wells behind the front openings: the arch lining and an inner wall. */
function pozosDelanteros(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'pasos-de-rueda';
  const th0 = Math.asin(Math.max(-1, Math.min(1, (0.14 - ARCO.y) / ARCO.b)));
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

/**
 * An oblique view: 2D coordinates (a, b) are the point o + a u + b v, and the
 * decal lands where a ray along -fuera from there meets the skin.
 */
interface Oblicua { o: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3; fuera: THREE.Vector3 }
type Vista = 'lado' | 'arriba' | 'frente' | 'detras' | Oblicua;
const FUERAS = { lado: new THREE.Vector3(0, 0, 1), arriba: new THREE.Vector3(0, 1, 0), frente: new THREE.Vector3(1, 0, 0), detras: new THREE.Vector3(-1, 0, 0) };
const fuera = (v: Vista) => (typeof v === 'string' ? FUERAS[v] : v.fuera);
/** An oblique view looking at the skin along -n (horizontal), with b = height. */
function oblicua(o: [number, number, number], n: [number, number]): Oblicua {
  const f = new THREE.Vector3(n[0], 0, n[1]).normalize();
  return { o: new THREE.Vector3(...o), u: new THREE.Vector3(-f.z, 0, f.x), v: new THREE.Vector3(0, 1, 0), fuera: f };
}
/** The skin point a 2D view coordinate lands on: side (x, y), top (x, z), front and rear (z, y), oblique (a, b). */
function proyectar(v: Vista, a: number, b: number): THREE.Vector3 {
  if (v === 'lado') return new THREE.Vector3(a, b, ladoZ(a, b));
  if (v === 'arriba') return new THREE.Vector3(a, arribaY(a, b), b);
  if (v === 'frente') return new THREE.Vector3(frenteX(a, b), b, a);
  if (v === 'detras') return new THREE.Vector3(detrasX(a, b), b, a);
  const p = v.o.clone().addScaledVector(v.u, a); p.y = b; p.addScaledVector(v.fuera, 0.8);
  const d = v.fuera.clone().negate();
  const h = rayoPiel([p.x, p.y, p.z], [d.x, d.y, d.z], 1.6);
  return h ? new THREE.Vector3(...h) : new THREE.Vector3(NaN, NaN, NaN);
}
/** Outward skin normal at a projected point. */
function normalEn(v: Vista, a: number, b: number): THREE.Vector3 {
  const e = 0.004, p0 = proyectar(v, a, b), pa = proyectar(v, a + e, b), pb = proyectar(v, a, b + e);
  const n = new THREE.Vector3().crossVectors(pa.sub(p0), pb.sub(p0)).normalize();
  if (n.dot(fuera(v)) < 0) n.negate();
  return n;
}

/**
 * Projects a 2D mesh onto the skin from one view, lifted `sep` along the
 * view direction (or `sepDe(a, b)` per vertex, for blister lenses).
 * `espejo` mirrors it to the other side (z -> -z).
 */
function calco(m: Malla2D, vista: Vista, sep: number | ((a: number, b: number) => number), maxLado = 0.02, espejo = false): THREE.BufferGeometry {
  const s = subdividir(m, maxLado), f = fuera(vista);
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
  // rim flange (dark), then a full black disc over the rim and the inner half
  // of the sidewall (photo: the disc reaches ~88 % of the tyre's radius), gently
  // domed with a rolled edge, and a small plain chrome centre cap
  g.add(malla(torno([[rl - 0.004, w - 0.020], [rl + 0.002, w - 0.012], [rl + 0.008, w - 0.014], [rl + 0.009, w - 0.024]], 72), M.llantaOscura, 'pestana'));
  const rDisco = R * 0.88;
  const hD = (r: number) => w + 0.006 + 0.009 * (1 - (r / rDisco) ** 2);
  const disco: P2[] = [[rDisco + 0.002, w - 0.004], [rDisco + 0.001, w + 0.003], [rDisco - 0.004, w + 0.0058]];
  for (let k = 1; k <= 14; k++) { const r = (rDisco - 0.004) * (1 - k / 14); disco.push([r, hD(r)]); }
  g.add(malla(torno(disco, 72), M.tapa, 'tapacubos'));
  g.add(malla(torno([[0.024, hD(0.024) + 0.0004], [0.023, hD(0.023) + 0.004], [0.017, hD(0.017) + 0.0058], [0, hD(0) + 0.0062]], 32), M.tapon, 'tapon'));
  g.add(malla(torno([[0.030, hD(0.030) + 0.0005], [0.025, hD(0.025) + 0.0005]], 32), M.llantaOscura, 'ranura'));
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
  // the arch edge: a carbon lip on the cut (it also hides the steps of the grid);
  // the opening reaches the body's lower edge, so the lip runs below the axle
  const labio: P2[] = [];
  const thL = Math.asin((0.16 - ARCO.y) / ARCO.b);
  for (let k = 0; k <= 48; k++) { const th = thL + (Math.PI - 2 * thL) * k / 48; labio.push([ARCO.x + ARCO.a * Math.cos(th), ARCO.y + ARCO.b * Math.sin(th)]); }
  par(cinta2(labio, 0.012, 0.01), 'lado', 0.0008, M.carbonoCalco, 0.016, 'labio');
  par(cinta2(labio.map(([x, y]) => [ARCO.x + (x - ARCO.x) * 1.04, ARCO.y + (y - ARCO.y) * 1.035] as P2), 0.003, 0.01), 'lado', 0.0012, M.junta, 0.016);
  {
    // photo: the opening has a rolled lip that catches the light; a tube along the cut edge
    const pts: THREE.Vector3[] = [];
    for (const [x, y] of labio) { const z = ladoZ(x, y); if (Number.isFinite(z)) pts.push(new THREE.Vector3(x, y, z - 0.004)); }
    if (pts.length > 3) {
      const o = add(malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, 0.011, 10, false), M.carbono, 'labio'));
      espejo(o);
    }
  }

  // ---------------------------------------------------------------- canopy frames
  // The door's two hoops (photo): a dark frame behind the windscreen, leaning
  // back from x = -0.42 at the sides to -0.87 at the top, and a slimmer one
  // closing the side window at x = -1.50 / -1.40. Each is a ribbon laid on the
  // glass, 2.5 mm proud of it.
  for (const [aro, ancho, nombre] of [[ARO_DEL, 0.032, 'marco-parabrisas'], [ARO_TRAS, 0.018, 'marco-ventanilla']] as [{ base: number; cima: number }, number, string][]) {
    add(malla(aroGeo(aro, ancho), M.marco, nombre));
  }

  // ---------------------------------------------------------------- shut lines
  // The door (photo): the canopy between the two hoops, and on the left side
  // the panel below it, "drawn down" (press kit) to the sill crease: front edge
  // from the front hoop's foot down to (-0.59, 0.45), along y = 0.415, and up
  // the rear edge to the rear hoop's foot. On the right the door is hinged at
  // the glass edge, so the body side there is plain.
  {
    const yF = Y_BASE_ARO, xF = ARO_DEL.base, xR = ARO_TRAS.base;
    const baja: P2[] = suave([[xF, yF], [xF - 0.03, 0.72], [-0.475, 0.68], [-0.505, 0.575], [-0.55, 0.49], [-0.60, 0.435], [-0.70, 0.416], [-1.45, 0.416], [-1.56, 0.43], [-1.60, 0.50], [-1.585, 0.60], [-1.55, 0.69], [xR - 0.01, 0.75], [xR, yF]], 3, false);
    add(malla(calco(cinta2(baja, JUNTA, 0.006), 'lado', 0.0008, 0.012, true), M.junta, 'junta-puerta'));
  }
  // the sill crease, both sides: from behind the front arch to the tail (photo: y 0.42 rising to 0.455)
  par(cinta2(suave([[-0.31, 0.43], [-0.70, 0.418], [-1.40, 0.418], [-1.90, 0.432], [-2.32, 0.455], [-2.55, 0.47]], 2, false), 0.0035, 0.01), 'lado', 0.0007, M.pliegue, 0.014, 'pliegue');
  // luggage flap on the tail deck (80 l "under a separate flap in the rear"), behind the glass
  add(malla(calco(cinta2(cerrar(suave(rectRedondo(0, 0.625, 0.17, 0.055, 0.035, 5), 1)), JUNTA, 0.006), 'detras', 0.0008, 0.012), M.junta, 'junta-maletero'));
  // side cooling-air inlet, both sides (photo: a forward-pointing recess ahead
  // of the rear wheel, apex at (-1.34, 0.29), rear edge from (-1.68, 0.43) to (-1.70, 0.19))
  {
    const toma: P2[] = suave([[-1.34, 0.292], [-1.50, 0.36], [-1.67, 0.425], [-1.685, 0.32], [-1.70, 0.20], [-1.52, 0.245]], 1);
    par(cinta2(cerrar(toma), JUNTA, 0.006), 'lado', 0.0009, M.junta, 0.012);
    for (const f of [0.3, 0.55, 0.8]) {
      // three closed flaps inside it
      const xa = -1.34 + (-1.685 + 1.34) * f, ya = 0.292 + (0.425 - 0.292) * f, yb = 0.292 + (0.20 - 0.292) * f;
      par(cinta2([[xa, ya - 0.008], [xa - 0.004, yb + 0.008]], 0.003, 0.01), 'lado', 0.0011, M.junta, 0.012);
    }
  }

  // ---------------------------------------------------------------- headlamps
  // Photo: a large almond-shaped cluster on each upper corner of the nose,
  // from the front face round to the side (x 0.42..0.66, y 0.52..0.65), with
  // two round lamps under one clear cover: the larger one forward and inboard,
  // the smaller one behind it. Built on the right (+z), seen along the corner's
  // normal (an oblique view), and mirrored to the left.
  const ESQUINA = oblicua([0.55, 0, 0.50], [0.6, 0.8]);
  {
    const lado = new THREE.Group(); lado.name = 'faro';
    const add = (o: THREE.Object3D) => { lado.add(o); return o; };
    const V = ESQUINA;
    const faro: P2[] = suave([[-0.190, 0.522], [-0.13, 0.562], [-0.06, 0.590], [0.02, 0.607], [0.09, 0.610], [0.135, 0.597], [0.158, 0.570], [0.160, 0.540], [0.148, 0.513], [0.11, 0.493], [0.05, 0.485], [-0.03, 0.487], [-0.10, 0.495], [-0.16, 0.507]], 2);
    // housing: a dark chrome reflector inside, a black gasket round the edge
    add(malla(calco(poligono(faro), V, 0.0008, 0.016), M.reflector, 'faro'));
    add(malla(calco(cinta2(cerrar(faro), 0.006, 0.01), V, 0.0011, 0.016), M.negroBrillo, 'faro'));
    // the two lamps: black bowl, chrome bezel, projector lens
    for (const [a0, b0, r] of [[-0.012, 0.553, 0.040], [0.098, 0.545, 0.035]] as [number, number, number][]) {
      const circ = (rr: number, n = 32): P2[] => { const o: P2[] = []; for (let k = 0; k < n; k++) { const t = k / n * Math.PI * 2; o.push([a0 + rr * Math.cos(t), b0 + rr * Math.sin(t)]); } return o; };
      const grande = r > 0.038;
      add(malla(calco(poligono(circ(r)), V, 0.0013, 0.01), M.reflector, 'faro'));
      add(malla(calco(cinta2(cerrar(circ(r * 0.95)), 0.005, 0.005), V, 0.0017, 0.008), M.cromo, 'bisel'));
      add(malla(calco(cinta2(cerrar(circ(r * 0.62)), 0.004, 0.005), V, 0.0019, 0.008), M.negroBrillo, 'bisel'));
      const pp = proyectar(V, a0, b0), nn = normalEn(V, a0, b0);
      const rl = r * 0.55, lente = new THREE.Mesh(new THREE.SphereGeometry(rl, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.32), grande ? M.proyectorLuz : M.proyector);
      lente.rotation.x = Math.PI / 2;
      const soporte = new THREE.Group(); soporte.add(lente); lente.position.z = -rl * 0.72;
      colocar(soporte, pp.clone().addScaledVector(nn, 0.0015), nn); add(soporte);
    }
    // LED daytime strip along the top of the cluster, indicator at its tail
    add(malla(calco(cinta2(suave([[-0.15, 0.534], [-0.09, 0.565], [-0.03, 0.586], [0.03, 0.597]], 2, false), 0.003, 0.006), V, 0.0024, 0.01), M.led, 'luz-diurna'));
    add(malla(calco(poligono(suave([[0.142, 0.517], [0.155, 0.530], [0.157, 0.557], [0.148, 0.577], [0.138, 0.565], [0.137, 0.530]], 1)), V, 0.0016, 0.006), M.ambar, 'intermitente'));
    // clear blister cover: meets the skin at its edge, 10 mm proud in the middle
    add(malla(calco(poligono(faro), V, (a, b) => 0.0012 + 0.010 * Math.min(1, distBorde(faro, a, b) / 0.022), 0.014), M.lente, 'lente-faro'));
    g.add(lado); espejo(lado);
  }
  // LED strip under each headlamp (photo: a chrome-framed strip of five
  // segments, ~0.12 x 0.02 m, sloping down towards the arch)
  {
    const lado = new THREE.Group(); lado.name = 'luz-baja';
    const tira: P2[] = cerrar(suave([[-0.165, 0.448], [-0.045, 0.420], [-0.043, 0.402], [-0.163, 0.428]], 1));
    lado.add(malla(calco(poligono(tira), ESQUINA, 0.0012, 0.01), M.cromo, 'luz-tira'));
    for (let k = 0; k < 5; k++) {
      const u = (k + 0.5) / 5, a = -0.160 + 0.112 * u, b = 0.437 - 0.026 * u;
      lado.add(malla(calco(poligono(rectRedondo(a, b, 0.0085, 0.0055, 0.002, 2)), ESQUINA, 0.0018, 0.008), M.negroBrillo, 'luz-tira'));
    }
    g.add(lado); espejo(lado);
  }
  // the corner crease below the headlamp, back to the front of the arch
  {
    const o = add(malla(calco(cinta2(suave([[-0.20, 0.462], [-0.10, 0.462], [0.02, 0.457], [0.12, 0.452], [0.20, 0.450]], 2, false), 0.003, 0.01), ESQUINA, 0.0007, 0.014), M.pliegue, 'pliegue'));
    espejo(o);
  }
  // a black housing at the right-hand foot of the windscreen (photo; probably
  // the fresh-air intake or the wiper's pivot cover: not identified)
  {
    const x = 0.135, z = 0.255, y = arribaY(x, z);
    const tapa = torno([[0, 0.055], [0.010, 0.050], [0.016, 0.035], [0.018, 0.0], [0.017, -0.04], [0.014, -0.055]], 24);
    tapa.rotateY(Math.PI / 2); tapa.scale(1, 0.75, 1.15);
    const toma = malla(tapa, M.negroBrillo, 'toma-parabrisas');
    const boca = new THREE.Mesh(new THREE.CircleGeometry(0.0125, 20).rotateY(Math.PI / 2), M.pozo); boca.scale.set(1, 0.65, 1.1); boca.position.set(0.0505, 0.002, 0);
    const pieza = new THREE.Group(); pieza.add(toma, boca); pieza.name = 'toma-parabrisas';
    pieza.position.set(x, y + 0.004, z); pieza.rotation.z = -0.12; add(pieza);
  }

  // ---------------------------------------------------------------- tail lamps
  // No photo of the tail was found: the LED clusters stay as the press kit
  // describes them (LED tail lamps), placed on the tail at the height where the
  // body is widest there. Red lens with a row of LEDs, amber indicator outboard,
  // reversing lamp inboard.
  {
    const lado = new THREE.Group(); lado.name = 'piloto';
    const add = (o: THREE.Object3D) => { lado.add(o); return o; };
    const piloto: P2[] = suave([[0.035, 0.548], [0.11, 0.558], [0.19, 0.553], [0.235, 0.536], [0.24, 0.512], [0.20, 0.502], [0.11, 0.504], [0.035, 0.512]], 2);
    add(malla(calco(poligono(piloto), 'detras', 0.0008, 0.02), M.reflector, 'piloto'));
    add(malla(calco(cinta2(cerrar(piloto), 0.005, 0.01), 'detras', 0.0011, 0.02), M.negroBrillo, 'piloto'));
    for (let k = 0; k < 6; k++) {
      const z = 0.072 + k * 0.025, y = 0.530 + 0.004 * Math.sin(k / 5 * Math.PI);
      const led: P2[] = []; for (let j = 0; j < 10; j++) { const a = j / 10 * Math.PI * 2; led.push([z + 0.006 * Math.cos(a), y + 0.006 * Math.sin(a)]); }
      add(malla(calco(poligono(led), 'detras', 0.0018, 0.012), M.rojoLed, 'led'));
    }
    add(malla(calco(poligono(suave([[0.212, 0.516], [0.235, 0.518], [0.237, 0.532], [0.216, 0.542]], 1)), 'detras', 0.0018, 0.006), M.ambar, 'intermitente'));
    add(malla(calco(poligono(rectRedondo(0.05, 0.530, 0.012, 0.011, 0.005, 3)), 'detras', 0.0018, 0.012), M.blanco, 'marcha-atras'));
    add(malla(calco(poligono(piloto), 'detras', (a, b) => 0.0012 + 0.007 * Math.min(1, distBorde(piloto, a, b) / 0.015), 0.014), M.lenteRoja, 'lente-piloto'));
    g.add(lado); espejo(lado);
  }
  // reversing camera, centred under the lamps
  {
    const pp = proyectar('detras', 0, 0.455), nn = normalEn('detras', 0, 0.455);
    const cam = new THREE.Group();
    const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.012, 24).rotateX(Math.PI / 2), M.negroBrillo); cuerpo.position.z = 0.002; cam.add(cuerpo);
    const ojo = new THREE.Mesh(new THREE.CircleGeometry(0.007, 20), M.proyector); ojo.position.z = 0.0085; cam.add(ojo);
    colocar(cam, pp, nn); add(cam);
  }

  // ------------------------------------------------- side indicators with cameras
  // "rear visibility via cameras in the side turn signals": a small dark pod on
  // each flank behind the front wheel (photo: at x -0.36, y 0.57), amber lens
  // outboard, camera looking back.
  {
    const x = -0.36, y = 0.572, z = ladoZ(x, y);
    const pod = new THREE.Group(); pod.name = 'camara-lateral';
    const casco = torno([[0, 0.05], [0.007, 0.047], [0.013, 0.036], [0.016, 0.018], [0.016, -0.02], [0.014, -0.036], [0.0125, -0.042]], 28);
    casco.rotateY(Math.PI / 2); casco.scale(1, 0.62, 1); // axis along X, nose forward
    pod.add(malla(casco, M.negroBrillo, 'capsula'));
    const tapa = new THREE.Mesh(new THREE.CircleGeometry(0.012, 24).rotateY(-Math.PI / 2), M.negroBrillo); tapa.scale.set(1, 0.62, 1); tapa.position.x = -0.0421; pod.add(tapa);
    const ojo = new THREE.Mesh(new THREE.CircleGeometry(0.0055, 20).rotateY(-Math.PI / 2), M.proyector); ojo.position.set(-0.0425, 0, 0); pod.add(ojo);
    const intermitente = new THREE.Mesh(new THREE.CapsuleGeometry(0.0035, 0.03, 4, 10).rotateZ(Math.PI / 2), M.ambar); intermitente.position.set(0.004, 0, 0.0135); pod.add(intermitente);
    pod.position.set(x, y, z + 0.009);
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
  // Driver in front, passenger behind (legs either side of the driver's seat).
  // Photo (2026-11-09): the driver's head shows through the side window at
  // about x = -1.3, well behind the windscreen frame, so both seats sit ~0.25 m
  // further back than before and recline more.
  g.add(asiento([[-0.62, 0.30], [-0.78, 0.255], [-0.92, 0.215], [-0.98, 0.24], [-1.07, 0.42], [-1.17, 0.62], [-1.22, 0.76]], 0.42, M));
  g.add(asiento([[-1.40, 0.33], [-1.55, 0.29], [-1.68, 0.255], [-1.74, 0.28], [-1.84, 0.46], [-1.93, 0.64], [-1.97, 0.75]], 0.46, M));
  // dashboard: a slim binnacle with the instrument screen and the two camera screens
  const tablero = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.22, 32, 1, true, -Math.PI * 0.42, Math.PI * 0.84), M.plastico);
  tablero.rotation.set(0, 0, Math.PI / 2); tablero.scale.set(0.35, 1, 1); tablero.position.set(-0.40, 0.60, 0); g.add(tablero);
  for (const [z, w] of [[0, 0.15], [0.21, 0.07], [-0.21, 0.07]] as [number, number][]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.05), M.pantalla);
    p.position.set(-0.47, 0.66, z); p.rotation.set(0, -Math.PI / 2, 0); p.rotateX(-0.5); g.add(p);
  }
  // the dark cowl under the windscreen, so the glass does not show the inside of the bonnet
  // (from x 0.12, y 0.74 at the glass foot down to the binnacle at -0.40, 0.60)
  const cubierta = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.78).rotateX(-Math.PI / 2).rotateZ(0.263), M.plastico);
  cubierta.position.set(-0.14, 0.67, 0); g.add(cubierta);
  // steering wheel on its column
  const volante = new THREE.Group(); volante.name = 'volante';
  volante.add(malla(new THREE.TorusGeometry(0.125, 0.012, 10, 48), M.plastico, 'aro'));
  volante.add(malla(new THREE.CylinderGeometry(0.035, 0.04, 0.03, 24).rotateX(Math.PI / 2), M.plastico, 'cubo'));
  for (const a of [0, Math.PI * 0.85, -Math.PI * 0.85]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.016, 0.008), M.magnesio); r.position.set(0.075 * Math.cos(a + Math.PI / 2), 0.075 * Math.sin(a + Math.PI / 2), 0); r.rotation.z = a + Math.PI / 2; volante.add(r); }
  volante.position.set(-0.64, 0.63, 0); volante.rotation.set(0, Math.PI / 2, 0); volante.rotateX(-0.45); g.add(volante);
  const columna = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.20, 12), M.plastico);
  columna.position.set(-0.55, 0.588, 0); columna.rotation.z = 1.13; g.add(columna); // from the hub forward and down to the bulkhead
  // rotary gear selector on the right-hand side panel
  const mando = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.025, 20), M.magnesio); mando.rotation.x = Math.PI / 2; mando.position.set(-0.88, 0.50, 0.30); g.add(mando);
  // cabin floor, side trims up to the belt and the bulkhead behind the passenger, all dark
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(1.80, 0.80), M.plastico); suelo.rotation.x = -Math.PI / 2; suelo.position.set(-0.95, 0.19, 0); g.add(suelo);
  for (const s of [1, -1]) {
    const lat = new THREE.Mesh(new THREE.PlaneGeometry(1.60, 0.56), M.plastico); lat.position.set(-1.05, 0.48, s * 0.425); lat.rotation.y = s > 0 ? Math.PI : 0; g.add(lat);
  }
  const mampara = new THREE.Mesh(new THREE.PlaneGeometry(0.70, 0.60), M.plastico); mampara.rotation.y = Math.PI / 2; mampara.position.set(-2.10, 0.50, 0); g.add(mampara);
  // the engine cover under the smoked rear glass
  const motor = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.56), M.plastico); motor.rotation.x = -Math.PI / 2; motor.position.set(-2.33, 0.68, 0); g.add(motor);
  return g;
}

export { construir };
