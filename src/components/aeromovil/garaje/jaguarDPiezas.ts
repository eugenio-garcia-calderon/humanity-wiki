import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ANCHO_NEU, RC, R_LLANTA, R_NEU } from './jaguarDForma';

/*
 * Materials, procedural textures and the separate parts of the garage
 * Jaguar D-Type: Dunlop disc wheels with their racing tyres and brakes, the
 * driver's cockpit (bucket seat, dashboard and gauges, wood-rimmed wheel, gear
 * lever), headlamp units and small fittings. Everything is drawn in code;
 * nothing is downloaded. No badges, no lettering, no numbers on the dials.
 */

type P2 = [number, number];
const conDocumento = () => typeof document !== 'undefined';

// ======================================================================= textures
function lienzo(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (!conDocumento()) return null;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d'); return c ? [cv, c] : null;
}
function textura(cv: HTMLCanvasElement, srgb = true, repetir = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8; return t;
}
let semilla = 11;
const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;

/** Wood grain for the steering-wheel rim: along u (round the rim), warm varnished ash. */
function texturaMadera(): THREE.CanvasTexture | null {
  const l = lienzo(512, 64); if (!l) return null; const [cv, c] = l;
  c.fillStyle = '#6b3d1c'; c.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 70; i++) {
    const y = azar() * 64, a = 0.05 + azar() * 0.18, claro = azar() > 0.5;
    c.strokeStyle = claro ? `rgba(196,128,70,${a})` : `rgba(40,18,6,${a})`; c.lineWidth = 0.6 + azar() * 1.8;
    c.beginPath(); c.moveTo(0, y);
    for (let x = 0; x <= 512; x += 16) c.lineTo(x, y + Math.sin(x / 60 + i) * 2.5 + (azar() - 0.5) * 0.8);
    c.stroke();
  }
  return textura(cv);
}

/** Pleated leather: vertical flutes with dark seams and a faint grain. */
function texturaCuero(): THREE.CanvasTexture | null {
  const l = lienzo(256, 256); if (!l) return null; const [cv, c] = l;
  c.fillStyle = '#2c3a28'; c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) {
    const x = i * 32, g = c.createLinearGradient(x, 0, x + 32, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.18, 'rgba(255,255,255,0.05)'); g.addColorStop(0.5, 'rgba(255,255,255,0.10)'); g.addColorStop(0.85, 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.4)');
    c.fillStyle = g; c.fillRect(x, 0, 32, 256);
  }
  for (let i = 0; i < 3000; i++) { const v = azar() > 0.5 ? 255 : 0; c.fillStyle = `rgba(${v},${v},${v},0.05)`; c.fillRect(azar() * 256, azar() * 256, 1, 1); }
  return textura(cv);
}

/** A dial: black face, white ticks over 270°, a white needle. No numerals. */
function texturaEsfera(): THREE.CanvasTexture | null {
  const l = lienzo(256, 256); if (!l) return null; const [cv, c] = l;
  c.fillStyle = '#0b0b0c'; c.beginPath(); c.arc(128, 128, 128, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#e9e6dc'; c.lineCap = 'butt';
  for (let k = 0; k <= 40; k++) {
    const a = Math.PI * 0.75 + (k / 40) * Math.PI * 1.5, largo = k % 5 === 0 ? 26 : 13;
    c.lineWidth = k % 5 === 0 ? 5 : 2.4;
    c.beginPath(); c.moveTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112); c.lineTo(128 + Math.cos(a) * (112 - largo), 128 + Math.sin(a) * (112 - largo)); c.stroke();
  }
  // a red sector at the top of the scale
  c.strokeStyle = '#a3241c'; c.lineWidth = 7; c.beginPath(); c.arc(128, 128, 104, Math.PI * 2.0, Math.PI * 2.25); c.stroke();
  // needle and its boss
  const a = Math.PI * 1.15; c.strokeStyle = '#f2efe6'; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(128 - Math.cos(a) * 18, 128 - Math.sin(a) * 18); c.lineTo(128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96); c.stroke();
  c.fillStyle = '#26272a'; c.beginPath(); c.arc(128, 128, 12, 0, Math.PI * 2); c.fill();
  // glass glint
  const g = c.createLinearGradient(40, 20, 200, 220); g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.beginPath(); c.arc(128, 128, 126, 0, Math.PI * 2); c.fill();
  return textura(cv, true, false);
}

/** Crimped wire mesh of the air intake (alpha: the holes are see-through). */
function texturaMalla(): THREE.CanvasTexture | null {
  const l = lienzo(128, 128); if (!l) return null; const [cv, c] = l;
  c.clearRect(0, 0, 128, 128);
  c.strokeStyle = '#b9bcc0'; c.lineWidth = 3.2;
  for (let k = -128; k <= 256; k += 16) {
    c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 128, 128); c.stroke();
    c.beginPath(); c.moveTo(k + 128, 0); c.lineTo(k, 128); c.stroke();
  }
  return textura(cv);
}

/** Headlamp lens: concentric flutes and a vertical block pattern, as on a 1950s Lucas-style lens. */
function texturaLente(): THREE.CanvasTexture | null {
  const l = lienzo(256, 256); if (!l) return null; const [cv, c] = l;
  c.fillStyle = '#cfd6da'; c.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 12) { const g = c.createLinearGradient(x, 0, x + 12, 0); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(0.5, 'rgba(90,100,110,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0.5)'); c.fillStyle = g; c.fillRect(x, 60, 12, 136); }
  c.strokeStyle = 'rgba(80,90,100,0.35)'; c.lineWidth = 2;
  for (let r = 20; r < 128; r += 14) { c.beginPath(); c.arc(128, 128, r, 0, Math.PI * 2); c.stroke(); }
  return textura(cv, true, false);
}

/** Cast-iron brake disc, turned: fine concentric marks. */
function texturaDisco(): THREE.CanvasTexture | null {
  const l = lienzo(256, 256); if (!l) return null; const [cv, c] = l;
  c.fillStyle = '#6a6e72'; c.fillRect(0, 0, 256, 256);
  for (let r = 4; r < 128; r += 1.5) { const v = 90 + Math.floor(azar() * 60); c.strokeStyle = `rgba(${v},${v + 3},${v + 6},0.35)`; c.lineWidth = 1; c.beginPath(); c.arc(128, 128, r, 0, Math.PI * 2); c.stroke(); }
  return textura(cv, true, false);
}

// ======================================================================= materials
/** Glass that casts no shadow (see `unLitroModelo.ts`): the shadow pass discards every fragment. */
export const sinSombra = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking, opacity: 0 });

let MATS: ReturnType<typeof crearMateriales> | null = null;
function crearMateriales() {
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);
  const decal = (p: THREE.MeshPhysicalMaterialParameters) => fis({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, ...p });
  const madera = texturaMadera(), cuero = texturaCuero(), esfera = texturaEsfera(), malla = texturaMalla(), lente = texturaLente(), disco = texturaDisco();
  if (cuero) cuero.repeat.set(3, 2);
  if (malla) malla.repeat.set(9, 5);
  // British Racing Green, solid (non-metallic) cellulose under a deep clear coat
  const VERDE = 0x0b3d24;
  return {
    pintura: fis({ color: VERDE, metalness: 0, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.15, side: THREE.DoubleSide }),
    pinturaCalco: decal({ color: VERDE, metalness: 0, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.15 }),
    junta: decal({ color: 0x020302, roughness: 0.95, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }),
    blanco: decal({ color: 0xeeece4, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03 }),
    pozo: fis({ color: 0x090a09, roughness: 0.92, side: THREE.DoubleSide }),
    interior: fis({ color: 0x17221a, roughness: 0.75, metalness: 0.1, side: THREE.DoubleSide }),
    cromo: fis({ color: 0xeef0f2, metalness: 1, roughness: 0.06 }),
    cromoCalco: decal({ color: 0xeef0f2, metalness: 1, roughness: 0.08 }),
    aluminio: fis({ color: 0xc9cdd1, metalness: 0.95, roughness: 0.32 }),
    // clear Perspex: screen and headlamp covers
    perspex: fis({ color: 0xe9f1f2, transparent: true, opacity: 0.16, depthWrite: false, roughness: 0.02, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.01, envMapIntensity: 1.7, side: THREE.DoubleSide, alphaTest: 0.01 }),
    perspexCalco: decal({ color: 0xe9f1f2, transparent: true, opacity: 0.14, depthWrite: false, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.01, envMapIntensity: 1.8, alphaTest: 0.01, polygonOffsetFactor: -5, polygonOffsetUnits: -8 }),
    goma: fis({ color: 0x151516, roughness: 0.88, metalness: 0, sheen: 0.3, sheenRoughness: 0.9, sheenColor: new THREE.Color(0x2b2b2b) }),
    gomaJunta: decal({ color: 0x0b0b0b, roughness: 0.8, polygonOffsetFactor: -4, polygonOffsetUnits: -7 }),
    llanta: fis({ color: 0xb9bdc1, metalness: 0.75, roughness: 0.34, clearcoat: 0.4, clearcoatRoughness: 0.2, side: THREE.DoubleSide }),
    llantaOscura: fis({ color: 0x2d2f31, metalness: 0.5, roughness: 0.55, side: THREE.DoubleSide }),
    disco: fis({ color: disco ? 0xffffff : 0x6a6e72, map: disco, metalness: 0.75, roughness: 0.42, side: THREE.DoubleSide }),
    pinza: fis({ color: 0x3a3c3f, metalness: 0.6, roughness: 0.45 }),
    negro: fis({ color: 0x0d0d0e, metalness: 0.2, roughness: 0.5 }),
    negroMate: fis({ color: 0x111111, metalness: 0.05, roughness: 0.85, side: THREE.DoubleSide }),
    salpicadero: fis({ color: 0x141414, metalness: 0.1, roughness: 0.82 }),
    esfera: fis({ color: 0xffffff, map: esfera, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.02 }),
    cuero: fis({ color: cuero ? 0xffffff : 0x2c3a28, map: cuero, roughness: 0.62, metalness: 0, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x6f7f69) }),
    cueroNegro: fis({ color: 0x1a1d18, roughness: 0.55, metalness: 0, sheen: 0.3, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x505a4c) }),
    madera: fis({ color: madera ? 0xffffff : 0x6b3d1c, map: madera, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }),
    malla: fis({ color: malla ? 0xffffff : 0x777777, map: malla, alphaTest: 0.5, transparent: false, metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide }),
    lente: fis({ color: lente ? 0xffffff : 0xcfd6da, map: lente, roughness: 0.08, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02, emissive: 0x30302a, emissiveIntensity: 0.25 }),
    reflector: fis({ color: 0xdfe3e6, metalness: 1, roughness: 0.12, side: THREE.DoubleSide }),
    piloto: fis({ color: 0x8a0a0e, emissive: 0x6a0306, emissiveIntensity: 0.5, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.92 }),
    escape: fis({ color: 0x6f6458, metalness: 0.75, roughness: 0.45 }),
    hollin: fis({ color: 0x0b0a09, roughness: 0.95, side: THREE.DoubleSide }),
  };
}
export function mats() { return MATS ?? (MATS = crearMateriales()); }
export type Mats = ReturnType<typeof crearMateriales>;

export const malla = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], nombre?: string) => {
  const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; if (nombre) o.name = nombre; return o;
};

/** Merges parts that share a material (positions, normals and uvs when all have them). */
export function unir(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const conUv = geos.every(g => g.attributes.uv);
  const limpias = geos.map(g => {
    const n = g.index ? g.toNonIndexed() : g, c = new THREE.BufferGeometry();
    c.setAttribute('position', n.attributes.position);
    if (!n.attributes.normal) n.computeVertexNormals();
    c.setAttribute('normal', n.attributes.normal);
    if (conUv) c.setAttribute('uv', n.attributes.uv);
    return c;
  });
  return mergeGeometries(limpias)!;
}

// ================================================================ lathe and sweep
/** Revolves a profile (r, h) around Z. `mod` can reshape the radius (tread). */
export function torno(perfil: P2[], segs: number, mod?: (ang: number, h: number, r: number) => number): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [], uv: number[] = []; const n = perfil.length;
  for (let s = 0; s <= segs; s++) {
    const a = s / segs * Math.PI * 2, c = Math.cos(a), si = Math.sin(a);
    perfil.forEach(([r0, h], k) => { const r = mod ? mod(a, h, r0) : r0; pos.push(r * c, r * si, h); uv.push(s / segs, k / (n - 1)); });
  }
  for (let s = 0; s < segs; s++) for (let k = 0; k < n - 1; k++) {
    const a = s * n + k, b = (s + 1) * n + k;
    idx.push(a, b, b + 1, a, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** A tube of radius r (or r(t)) along a polyline, smoothed (Catmull-Rom). */
export function tubo(pts: THREE.Vector3[], r: number | ((t: number) => number), lados = 10, pasos = 48, cerrado = false): THREE.BufferGeometry {
  const curva = new THREE.CatmullRomCurve3(pts, cerrado, 'centripetal');
  if (typeof r === 'number') return new THREE.TubeGeometry(curva, pasos, r, lados, cerrado);
  const g = new THREE.TubeGeometry(curva, pasos, 1, lados, cerrado), p = g.attributes.position as THREE.BufferAttribute;
  // scale every ring about its centre point on the curve
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos, c = curva.getPointAt(t), k = r(t);
    for (let j = 0; j <= lados; j++) {
      const v = i * (lados + 1) + j;
      p.setXYZ(v, c.x + (p.getX(v) - c.x) * k, c.y + (p.getY(v) - c.y) * k, c.z + (p.getZ(v) - c.z) * k);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** A box with soft edges: a superellipsoid (as `apteraDetalle.ts`). */
export function caja(sx: number, sy: number, sz: number, r: number, seg = 16): THREE.BufferGeometry {
  const s = new THREE.SphereGeometry(1, seg, Math.max(8, seg * 0.6 | 0)), p = s.attributes.position as THREE.BufferAttribute;
  const e = Math.max(0.12, Math.min(0.5, 2.2 * r / Math.min(sx, sy, sz))), f = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), e);
  for (let i = 0; i < p.count; i++) p.setXYZ(i, f(p.getX(i)) * sx / 2, f(p.getY(i)) * sy / 2, f(p.getZ(i)) * sz / 2);
  s.computeVertexNormals();
  return s;
}

// ======================================================================= wheels
/**
 * Dunlop racing tyre, 6.50-16 cross-ply: tall round sidewall, a crowned
 * tread with five ribs and fine transverse sipes, flattened at the contact
 * patch (loaded radius RC). Axle along Z, centre at the origin.
 */
function neumatico(): THREE.BufferGeometry {
  const R = R_NEU, w = ANCHO_NEU / 2, rl = R_LLANTA;
  const flanco = (sg: number): P2[] => [
    [rl + 0.004, sg * (w - 0.028)], [rl + 0.012, sg * (w - 0.017)], [rl + 0.024, sg * (w - 0.006)],
    [rl + (R - rl) * 0.32, sg * (w + 0.006)], [rl + (R - rl) * 0.55, sg * (w + 0.010)], [rl + (R - rl) * 0.75, sg * (w + 0.006)],
    [R - 0.026, sg * (w - 0.006)], [R - 0.012, sg * (w - 0.019)], [R - 0.004, sg * (w - 0.031)],
  ];
  const tb: P2[] = [], hm = w - 0.036, surcos = [-0.62, -0.21, 0.21, 0.62];
  for (let k = 0; k <= 24; k++) {
    const h = -hm + 2 * hm * k / 24, hn = h / hm;
    const enSurco = surcos.some(s => Math.abs(hn - s) < 0.05);
    tb.push([R - 0.006 * hn * hn - (enSurco ? 0.0055 : 0), h]);
  }
  const perfil: P2[] = [...flanco(-1), ...tb, ...flanco(1).reverse()];
  const N = 80; // sipes around
  const g = torno(perfil, 120, (a, h, r) => {
    if (r < R - 0.009) return r;
    const hn = h / hm, f = (a / (Math.PI * 2)) * N + (hn > 0 ? hn : -hn) * 0.35;
    return f - Math.floor(f) < 0.14 && Math.abs(hn) < 0.95 ? r - 0.0022 : r;
  });
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let k = 0; k < p.count; k++) if (p.getY(k) < -RC) { const y = p.getY(k); p.setY(k, -RC); p.setZ(k, p.getZ(k) * (1 + (-RC - y) * 1.2)); }
  g.computeVertexNormals();
  return g;
}

/**
 * Dunlop light-alloy disc wheel, 16 x 5.5 in, centre-lock: a rim with its
 * flanges, a flat outer band with a ring of round cooling holes near the rim
 * (Motor Sport, «X-ray spec: Jaguar D-type», 2004: «holes drilled near the
 * rim»), a dished centre and the hub with a two-eared knock-off spinner. The
 * number of holes and the spinner's shape are estimated.
 */
const AGUJEROS = 16, R_AGUJERO = 0.0155, R_CORONA = 0.177;
function llanta(): { brillo: THREE.BufferGeometry; oscura: THREE.BufferGeometry; cromo: THREE.BufferGeometry } {
  const w = 0.5 * 0.1397; // 5.5 in between the bead seats
  const zF = 0.030; // outer face of the hole band (+z is the outside)
  // rim: outer flange, bead seat, the well, inner flange (seen through the holes)
  const aro = torno([
    [R_LLANTA + 0.009, -w - 0.004], [R_LLANTA + 0.010, -w + 0.004], [R_LLANTA, -w + 0.010], [R_LLANTA - 0.012, -w + 0.030],
    [R_LLANTA - 0.016, -0.01], [R_LLANTA - 0.016, zF - 0.012], [R_LLANTA - 0.002, w - 0.016], [R_LLANTA, w - 0.008],
    [R_LLANTA + 0.012, w - 0.004], [R_LLANTA + 0.014, w + 0.002], [R_LLANTA + 0.008, w + 0.006], [R_LLANTA - 0.006, w + 0.002],
    [0.196, zF + 0.004],
  ].reverse() as P2[], 96);
  // the hole band: a flat annulus with round holes, and the holes' walls
  const forma = new THREE.Shape(); forma.absarc(0, 0, 0.1965, 0, Math.PI * 2, false);
  const hueco = new THREE.Path(); hueco.absarc(0, 0, 0.152, 0, Math.PI * 2, true); forma.holes.push(hueco);
  const paredes: THREE.BufferGeometry[] = [];
  for (let k = 0; k < AGUJEROS; k++) {
    const a = (k + 0.5) / AGUJEROS * Math.PI * 2, cx = Math.cos(a) * R_CORONA, cy = Math.sin(a) * R_CORONA;
    const h = new THREE.Path(); h.absarc(cx, cy, R_AGUJERO, 0, Math.PI * 2, true); forma.holes.push(h);
    const pared = new THREE.CylinderGeometry(R_AGUJERO, R_AGUJERO, 0.007, 16, 1, true); pared.rotateX(Math.PI / 2); pared.translate(cx, cy, zF - 0.0035);
    paredes.push(pared);
  }
  const banda = new THREE.ShapeGeometry(forma, 40); banda.translate(0, 0, zF);
  const bandaDetras = banda.clone(); bandaDetras.translate(0, 0, -0.007); bandaDetras.scale(1, 1, 1);
  { const ix = bandaDetras.index!; for (let i = 0; i < ix.count; i += 3) { const t = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, t); } bandaDetras.computeVertexNormals(); }
  // dished centre rising to the hub, with a small step ring
  const centro = torno([
    [0.153, zF], [0.140, zF + 0.002], [0.118, zF + 0.010], [0.096, zF + 0.022], [0.082, zF + 0.030], [0.074, zF + 0.034], [0.071, zF + 0.040],
  ], 72);
  // hub: a short barrel with a turned lip, then the knock-off spinner on its threaded nose
  const buje = torno([[0.071, zF + 0.040], [0.064, zF + 0.044], [0.058, zF + 0.052], [0.052, zF + 0.054], [0.050, zF + 0.072], [0.046, zF + 0.076]], 48);
  const nariz = torno([[0.046, zF + 0.076], [0.040, zF + 0.080], [0.036, zF + 0.098], [0.030, zF + 0.104], [0.018, zF + 0.107], [0, zF + 0.108]], 40);
  // spinner: a ring with two raked ears
  const orejas: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    const sh = new THREE.Shape();
    sh.moveTo(0.04, -0.016); sh.lineTo(0.112, -0.010); sh.quadraticCurveTo(0.124, 0, 0.112, 0.010); sh.lineTo(0.04, 0.016); sh.lineTo(0.04, -0.016);
    const o = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 6 });
    o.translate(0, 0, zF + 0.080); if (s < 0) o.rotateZ(Math.PI);
    // rake the ears back towards the wheel
    const p = o.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getY(i)); p.setZ(i, p.getZ(i) - Math.max(0, r - 0.045) * 0.22); }
    o.computeVertexNormals(); orejas.push(o);
  }
  const anillo = torno([[0.050, zF + 0.074], [0.054, zF + 0.078], [0.054, zF + 0.090], [0.050, zF + 0.094], [0.040, zF + 0.094]], 40);
  return {
    brillo: unir([aro, banda, centro, buje, ...paredes]),
    oscura: unir([bandaDetras]),
    cromo: unir([nariz, anillo, ...orejas]),
  };
}

/** Brake disc (Dunlop, about 12¾ in) with its caliper and the hub carrier behind it. */
function freno(): { disco: THREE.BufferGeometry; pinza: THREE.BufferGeometry; fondo: THREE.BufferGeometry } {
  const disco = torno([[0.162, 0.006], [0.162, -0.006], [0.085, -0.006], [0.085, 0.006], [0.162, 0.006]].reverse() as P2[], 64);
  // map the turned texture from the face: planar uv
  const p = disco.attributes.position as THREE.BufferAttribute, uv = disco.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / 0.33, 0.5 + p.getY(i) / 0.33);
  disco.translate(0, 0, -0.012);
  const pinza = caja(0.11, 0.07, 0.06, 0.012); pinza.translate(0, 0, 0); pinza.rotateZ(0); pinza.translate(-0.135, 0.06, -0.012);
  // dark back plate so the wheel is not see-through
  const fondo = new THREE.CircleGeometry(0.19, 48); fondo.rotateY(Math.PI); fondo.translate(0, 0, -0.05);
  return { disco, pinza: unir([pinza]), fondo };
}

let GEO_RUEDA: { neu: THREE.BufferGeometry; ll: ReturnType<typeof llanta>; fr: ReturnType<typeof freno> } | null = null;
/** A wheel with the face on +z; the caller turns the left ones round. */
export function rueda(M: Mats): THREE.Group {
  if (!GEO_RUEDA) GEO_RUEDA = { neu: neumatico(), ll: llanta(), fr: freno() };
  const G = GEO_RUEDA, g = new THREE.Group(); g.name = 'rueda';
  g.add(malla(G.neu, M.goma, 'neumatico'));
  g.add(malla(G.ll.brillo, M.llanta, 'llanta'), malla(G.ll.oscura, M.llantaOscura, 'llanta'), malla(G.ll.cromo, M.cromo, 'tuerca'));
  g.add(malla(G.fr.disco, M.disco, 'freno'), malla(G.fr.pinza, M.pinza, 'freno'), malla(G.fr.fondo, M.negroMate, 'freno'));
  return g;
}

// ======================================================================= cockpit
/**
 * What shows through the driver's opening (right-hand drive): the bucket seat
 * in pleated green leather, the black crackle dashboard with a large rev
 * counter and four small dials, the wood-rimmed wheel on three drilled
 * aluminium spokes, the gear lever on the tunnel, the floor and the side walls.
 * `zc` is the driver's centre line.
 */
export function cabina(M: Mats, zc: number): THREE.Group {
  const g = new THREE.Group(); g.name = 'cabina';
  // seat: cushion, backrest leaning back ~18°, rolled side bolsters
  const cojin = caja(0.42, 0.085, 0.40, 0.035); cojin.rotateZ(0.08); cojin.translate(-1.37, 0.235, zc);
  const respaldo = caja(0.075, 0.50, 0.42, 0.035); respaldo.translate(0, 0.25, 0); respaldo.rotateZ(0.32); respaldo.translate(-1.57, 0.25, zc);
  const lados: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const l = caja(0.10, 0.44, 0.07, 0.03); l.translate(0.02, 0.22, 0); l.rotateZ(0.32); l.translate(-1.57, 0.27, zc + s * 0.225); lados.push(l);
    const a = caja(0.40, 0.09, 0.07, 0.03); a.rotateZ(0.08); a.translate(-1.36, 0.27, zc + s * 0.225); lados.push(a);
  }
  g.add(malla(unir([cojin, respaldo]), M.cuero, 'asiento'), malla(unir(lados), M.cueroNegro, 'asiento'));
  // floor, transmission tunnel (leather-trimmed)
  const suelo = new THREE.PlaneGeometry(0.95, 0.62); suelo.rotateX(-Math.PI / 2); suelo.translate(-1.26, 0.165, 0.32);
  g.add(malla(suelo, M.negroMate, 'suelo'));
  const tunel = caja(0.88, 0.22, 0.12, 0.04); tunel.translate(-1.25, 0.27, 0.085);
  g.add(malla(tunel, M.cueroNegro, 'tunel'));
  // dashboard: a crackle-black panel under the scuttle with the dials
  const panel = caja(0.03, 0.22, 0.56, 0.01); panel.translate(-0.805, 0.635, 0.32);
  g.add(malla(panel, M.salpicadero, 'salpicadero'));
  const esferas: THREE.BufferGeometry[] = [], biseles: THREE.BufferGeometry[] = [];
  const dial = (z: number, y: number, r: number) => {
    const e = new THREE.CircleGeometry(r, 40); e.rotateY(-Math.PI / 2); e.translate(-0.823, y, z); esferas.push(e);
    const b = new THREE.TorusGeometry(r + 0.004, 0.0045, 8, 40); b.rotateY(Math.PI / 2); b.translate(-0.824, y, z); biseles.push(b);
  };
  dial(zc, 0.655, 0.062); dial(zc - 0.135, 0.68, 0.032); dial(zc + 0.135, 0.68, 0.032); dial(zc - 0.20, 0.60, 0.028); dial(zc + 0.20, 0.60, 0.028);
  g.add(malla(unir(esferas), M.esfera, 'reloj'), malla(unir(biseles), M.cromo, 'reloj'));
  // toggle switches along the bottom of the panel
  const palancas: THREE.BufferGeometry[] = [];
  for (const dz of [-0.08, -0.04, 0.04, 0.08]) { const t = new THREE.CylinderGeometry(0.003, 0.004, 0.03, 8); t.rotateZ(Math.PI / 2 - 0.4); t.translate(-0.835, 0.56, zc + dz); palancas.push(t); }
  g.add(malla(unir(palancas), M.cromo, 'interruptor'));
  // steering wheel: wood rim on three drilled aluminium spokes, column to the dash
  const vol = new THREE.Group(); vol.name = 'volante';
  const aro = new THREE.TorusGeometry(0.19, 0.0135, 12, 96); vol.add(malla(aro, M.madera, 'aro'));
  const radios: THREE.BufferGeometry[] = [];
  for (const a of [-Math.PI / 2, Math.PI / 6 - 0.15, Math.PI * 5 / 6 + 0.15]) {
    const sh = new THREE.Shape(); sh.moveTo(0.03, -0.012); sh.lineTo(0.185, -0.016); sh.lineTo(0.185, 0.016); sh.lineTo(0.03, 0.012); sh.lineTo(0.03, -0.012);
    for (const r of [0.075, 0.115, 0.15]) { const h = new THREE.Path(); h.absarc(r, 0, 0.0065, 0, Math.PI * 2, true); sh.holes.push(h); }
    const e = new THREE.ExtrudeGeometry(sh, { depth: 0.003, bevelEnabled: false, curveSegments: 10 }); e.translate(0, 0, -0.0015); e.rotateZ(a);
    radios.push(e);
  }
  vol.add(malla(unir(radios), M.aluminio, 'radios'));
  const cubo = torno([[0.036, -0.03], [0.04, -0.01], [0.038, 0.004], [0.026, 0.008], [0, 0.009]], 32);
  vol.add(malla(cubo, M.negro, 'cubo'));
  vol.position.set(-1.10, 0.655, zc); vol.rotation.set(0, -Math.PI / 2, 0); vol.rotateX(-0.36);
  g.add(vol);
  const columna = new THREE.CylinderGeometry(0.018, 0.022, 0.26, 12); columna.rotateZ(Math.PI / 2 - 0.36); columna.translate(-0.98, 0.61, zc);
  g.add(malla(columna, M.negro, 'columna'));
  // gear lever on the tunnel: a chrome stick and a black ball
  const vara = tubo([new THREE.Vector3(-1.20, 0.37, 0.085), new THREE.Vector3(-1.215, 0.47, 0.088), new THREE.Vector3(-1.235, 0.565, 0.092)], 0.0065, 8, 12);
  const bola = new THREE.SphereGeometry(0.022, 16, 12); bola.translate(-1.238, 0.585, 0.092);
  const fuelle = torno([[0.035, 0], [0.03, 0.02], [0.02, 0.035], [0.012, 0.045]], 16); fuelle.rotateX(-Math.PI / 2); fuelle.translate(-1.20, 0.375, 0.085);
  g.add(malla(vara, M.cromo, 'palanca'), malla(bola, M.negro, 'palanca'), malla(fuelle, M.cueroNegro, 'palanca'));
  return g;
}

// ======================================================================= headlamp unit
/**
 * A sealed headlamp seen through its Perspex fairing: a dark cup set into the
 * wing along the fairing's axis, the chrome reflector, the fluted lens and its
 * chrome rim. Built around +X (the lamp's axis); the caller orients it.
 */
export function faro(M: Mats, rCopa: number, hondo: number): THREE.Group {
  const g = new THREE.Group(); g.name = 'faro';
  const copa = torno([[rCopa, 0.002], [rCopa * 0.98, -hondo * 0.3], [rCopa * 0.85, -hondo * 0.8], [rCopa * 0.5, -hondo], [0, -hondo]], 48);
  copa.rotateY(Math.PI / 2); g.add(malla(copa, M.negroMate, 'copa'));
  const rl = 0.083;
  const refl = torno([[rl, -0.012], [rl * 0.8, -0.04], [rl * 0.45, -0.065], [0.02, -0.075], [0, -0.076]], 48); refl.rotateY(Math.PI / 2); g.add(malla(refl, M.reflector, 'reflector'));
  const lente = torno([[rl, -0.012], [rl * 0.8, -0.006], [rl * 0.5, -0.0015], [0, 0.0005]], 48);
  { const p = lente.attributes.position as THREE.BufferAttribute, uv = lente.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / (2 * rl), 0.5 + p.getY(i) / (2 * rl)); }
  lente.rotateY(Math.PI / 2); g.add(malla(lente, M.lente, 'lente'));
  const aro = new THREE.TorusGeometry(rl + 0.004, 0.0055, 10, 64); aro.rotateY(Math.PI / 2); aro.translate(-0.011, 0, 0); g.add(malla(aro, M.cromo, 'aro'));
  return g;
}
