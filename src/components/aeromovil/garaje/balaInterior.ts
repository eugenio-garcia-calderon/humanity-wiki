import * as THREE from 'three';
import { E, loft } from './forma';
import { barrido, curva } from './apteraPiel';
import { punto, type FormaBala } from './balaForma';
import type { Mats } from './balaPiezas';
import type { BandaForro, CamposInterior, ColorCostura, ColorForro, InteriorTriciclo, Moldura, Tapiz } from '../interiorTriciclo';
import type { PuntosOcupante } from '../geometria';

/*
 * The Triciclo / Cuadriciclo Bala's interior finish in 3D (2026-11-16, Eugenio: «que el interior se diseñe en 3D y se
 * pueda elegir con mucho detalle», after the Cirrus Vision Jet's cabin). It draws what interiorTriciclo.ts describes:
 *  - the lining, on the inside of the skin and `grosor` in from it, by the skin's own sections (x, t): the sides from the
 *    floor up to the canopy glass's lower edge (on a door, its part rides on the door's hinge), the headliner under the
 *    opaque roof, a rolled edge round every window, the carpeted floor on the rails and a cover over the shock tower;
 *  - the trim line along both sides (carbon, dark wood or brushed aluminium), its ambient light, the armrests with their
 *    cupholders, the overhead console with its spot lights, the belts across each rider;
 *  - and it re-covers the seats the cabin builder drew (balaPiezas.ts `cabina`): the same shapes in leather, Alcantara or
 *    a technical fabric, with straight or geometric stitching, the buckets' shells in the darker side colour.
 * The materials are this module's own (one set, recoloured in place: changing a colour recompiles nothing), so «Rayos X»
 * and «Corte» reach them through `materialesInterior` (Visor3D.tsx).
 */

// ------------------------------------------------------------------ colours (sRGB)
const C_TAPIZ: Record<Exclude<Tapiz, 'serie'>, { base: string; lado: number; rough: number; sheen: number; cuero: boolean }> = {
  cueroCognac: { base: '#b5602b', lado: 0x3a2119, rough: 0.48, sheen: 0.35, cuero: true },
  cueroNegro: { base: '#1d1d20', lado: 0x121214, rough: 0.46, sheen: 0.35, cuero: true },
  alcantara: { base: '#5b5e64', lado: 0x2a2b2f, rough: 0.96, sheen: 1, cuero: false },
  tela: { base: '#3a3d43', lado: 0x222327, rough: 0.92, sheen: 0.6, cuero: false },
};
const C_COSTURA: Record<ColorCostura, string> = { crema: '#ecdfc6', naranja: '#e3893a', negro: '#141414', rojo: '#c8202c', gris: '#b9bdc3' };
const C_FORRO: Record<ColorForro, { forro: number; borde: number; suelo: number }> = {
  crema: { forro: 0xdccfbf, borde: 0xc9b9a6, suelo: 0x4a4038 },
  gris: { forro: 0x8f9297, borde: 0x76797f, suelo: 0x393b3f },
  negro: { forro: 0x2c2d30, borde: 0x1f2022, suelo: 0x1d1e20 },
  blanco: { forro: 0xefece6, borde: 0xd9d5cd, suelo: 0x5d5853 },
};
const C_AMBIENTE = { blanca: 0xffe2b8, ambar: 0xff9a2a, azul: 0x3d8bff } as const;

// ------------------------------------------------------------------ textures (drawn once, in the browser)
const cache = new Map<string, THREE.CanvasTexture>();
function lienzo(clave: string, N: number, pintar: (c: CanvasRenderingContext2D, N: number) => void, color = true): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const hit = cache.get(clave); if (hit) return hit;
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d'); if (!c) return null;
  pintar(c, N);
  const t = new THREE.CanvasTexture(cv); if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  cache.set(clave, t); return t;
}
/** A deterministic pseudo-random sequence, so every texture is the same on every load. */
function azar(semilla: number) { let s = semilla >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function grano(c: CanvasRenderingContext2D, N: number, fuerza: number, semilla: number) {
  const r = azar(semilla), img = c.getImageData(0, 0, N, N), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = (r() - 0.5) * fuerza; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
  c.putImageData(img, 0, 0);
}
/** The stitching's seams in one tile (u, v from 0 to 1): straight channels along the seat, or the Vision Jet's crossing lines. */
function costuras(tipo: 'recta' | 'geometrica'): [number, number, number, number][] {
  if (tipo === 'recta') return [0.2, 0.4, 0.6, 0.8].map(v => [0, v, 1, v]);
  // a shattered pattern: lines out of two knots, as on the Vision Jet's cushions (each wraps round the tile edge)
  return [[0.08, 0.92, 0.46, 0.58], [0.46, 0.58, 0.94, 0.86], [0.46, 0.58, 0.58, 0.06], [0.18, 0.22, 0.46, 0.58], [0.18, 0.22, 0.78, 0.32],
    [0.78, 0.32, 0.94, 0.86], [0.78, 0.32, 0.58, 0.06], [0.08, 0.92, 0.18, 0.22], [0.46, 0.58, 0.30, 0.98]];
}
/** The seat cover's colour map: the material, its grain and the stitches (the map carries the colours: the material is white). */
function texturaFunda(tapiz: Exclude<Tapiz, 'serie'>, costura: CamposInterior['tCostura'], color: ColorCostura) {
  return lienzo(`funda-${tapiz}-${costura}-${color}`, 512, (c, N) => {
    const T = C_TAPIZ[tapiz];
    c.fillStyle = T.base; c.fillRect(0, 0, N, N);
    if (tapiz === 'tela') { c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 1; for (let k = 0; k < N; k += 4) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, N); c.stroke(); } c.strokeStyle = 'rgba(0,0,0,0.12)'; for (let k = 2; k < N; k += 4) { c.beginPath(); c.moveTo(0, k); c.lineTo(N, k); c.stroke(); } }
    grano(c, N, T.cuero ? 14 : 22, 7);
    if (costura === 'no') return;
    for (const [a, b, e, f] of costuras(costura)) for (const [du, dv] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const p = [(a + du) * N, (b + dv) * N, (e + du) * N, (f + dv) * N];
      // the seam's crease (darker, the leather pulled in), then a row of stitches each side of it
      c.setLineDash([]); c.strokeStyle = 'rgba(0,0,0,0.38)'; c.lineWidth = 5; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[2], p[3]); c.stroke();
      const L = Math.hypot(p[2] - p[0], p[3] - p[1]) || 1, nx = -(p[3] - p[1]) / L * 4.5, ny = (p[2] - p[0]) / L * 4.5;
      c.strokeStyle = C_COSTURA[color]; c.lineWidth = 1.8; c.setLineDash([6, 4]);
      for (const s of [1, -1]) { c.beginPath(); c.moveTo(p[0] + s * nx, p[1] + s * ny); c.lineTo(p[2] + s * nx, p[3] + s * ny); c.stroke(); }
    }
    c.setLineDash([]);
  });
}
/** Its bump: the grain, and a groove under each seam. */
function relieveFunda(tapiz: Exclude<Tapiz, 'serie'>, costura: CamposInterior['tCostura']) {
  return lienzo(`relieve-${tapiz}-${costura}`, 512, (c, N) => {
    c.fillStyle = '#808080'; c.fillRect(0, 0, N, N); grano(c, N, C_TAPIZ[tapiz].cuero ? 26 : 40, 11);
    if (costura === 'no') return;
    for (const [a, b, e, f] of costuras(costura)) for (const [du, dv] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
      c.strokeStyle = 'rgba(0,0,0,0.85)'; c.lineWidth = 6; c.beginPath(); c.moveTo((a + du) * N, (b + dv) * N); c.lineTo((e + du) * N, (f + dv) * N); c.stroke();
    }
  }, false);
}
/** Suede (the headliner and the luxury panels): fine fibres; and the carpet's loops. */
const texturaAnte = () => lienzo('ante', 256, (c, N) => { c.fillStyle = '#808080'; c.fillRect(0, 0, N, N); grano(c, N, 46, 3); }, false);
const texturaMoqueta = () => lienzo('moqueta', 256, (c, N) => { c.fillStyle = '#808080'; c.fillRect(0, 0, N, N); grano(c, N, 120, 5); }, false);
function texturaMoldura(m: Moldura) {
  return lienzo(`moldura-${m}`, 256, (c, N) => {
    if (m === 'carbono') {
      c.fillStyle = '#1b1c1f'; c.fillRect(0, 0, N, N);
      for (let i = 0; i < N; i += 16) for (let j = 0; j < N; j += 16) { c.fillStyle = ((i + j) / 16) % 2 ? '#2b2d31' : '#141517'; c.fillRect(i, j, 16, 8); c.fillStyle = ((i + j) / 16) % 2 ? '#141517' : '#2b2d31'; c.fillRect(i, j + 8, 16, 8); }
    } else if (m === 'madera') {
      const r = azar(17); c.fillStyle = '#3c2416'; c.fillRect(0, 0, N, N);
      for (let k = 0; k < 70; k++) { const y = r() * N; c.strokeStyle = `rgba(${r() < 0.5 ? '20,10,5' : '110,70,40'},${0.15 + 0.3 * r()})`; c.lineWidth = 0.5 + 2 * r(); c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= N; x += 16) c.lineTo(x, y + 3 * Math.sin(x / 30 + k)); c.stroke(); }
    } else {
      c.fillStyle = '#c3c7cc'; c.fillRect(0, 0, N, N); const r = azar(23);
      for (let k = 0; k < 400; k++) { const y = r() * N; c.strokeStyle = `rgba(${r() < 0.5 ? '255,255,255' : '90,95,100'},${0.1 + 0.2 * r()})`; c.lineWidth = 0.6; c.beginPath(); c.moveTo(0, y); c.lineTo(N, y); c.stroke(); }
    }
  });
}

// ------------------------------------------------------------------ materials
function crearMaterialesInterior() {
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ side: THREE.FrontSide, ...p });
  const D = THREE.DoubleSide;
  return {
    forro: fis({ color: C_FORRO.crema.forro, roughness: 0.95, metalness: 0, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.85, bumpMap: texturaAnte(), bumpScale: 0.6, side: D }),
    borde: fis({ color: C_FORRO.crema.borde, roughness: 0.8, sheen: 0.7, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.7, bumpMap: texturaAnte(), bumpScale: 0.4 }),
    suelo: fis({ color: C_FORRO.crema.suelo, roughness: 1, metalness: 0, sheen: 0.5, sheenColor: new THREE.Color(0x888888), sheenRoughness: 1, bumpMap: texturaMoqueta(), bumpScale: 1.2, side: D }),
    asiento: fis({ color: 0xffffff, map: texturaFunda('cueroCognac', 'geometrica', 'crema'), bumpMap: relieveFunda('cueroCognac', 'geometrica'), bumpScale: 1.2, roughness: 0.48, metalness: 0, sheen: 0.35, sheenColor: new THREE.Color(0xffe6cc), sheenRoughness: 0.5, clearcoat: 0.12, clearcoatRoughness: 0.5 }),
    lateral: fis({ color: 0x3a2119, roughness: 0.5, metalness: 0, sheen: 0.3, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.5, bumpMap: texturaAnte(), bumpScale: 0.3, clearcoat: 0.1 }),
    moldura: fis({ color: 0xffffff, map: texturaMoldura('carbono'), roughness: 0.3, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }),
    consola: fis({ color: 0x0c0c0e, roughness: 0.18, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04 }),
    foco: fis({ color: 0xfff4e2, emissive: 0xfff0d8, emissiveIntensity: 0, roughness: 0.2 }),
    aro: fis({ color: 0xc9ced4, metalness: 0.9, roughness: 0.25 }),
    cinta: fis({ color: 0x18191b, roughness: 0.8, metalness: 0, sheen: 0.6, sheenColor: new THREE.Color(0x999999), sheenRoughness: 0.6, side: D }),
    hebilla: fis({ color: 0xb5bac0, metalness: 0.95, roughness: 0.22 }),
    negro: fis({ color: 0x0e0f11, roughness: 0.6, metalness: 0.1 }),
    ambiente: fis({ color: 0xffffff, emissive: C_AMBIENTE.blanca, emissiveIntensity: 1.6, roughness: 0.4 }),
  };
}
let MI: ReturnType<typeof crearMaterialesInterior> | null = null;
/** The interior's materials (one set for the editor: «Rayos X» and «Corte» set them with the Bala's). */
export function materialesInterior() { return MI ?? (MI = crearMaterialesInterior()); }
export type MatsInterior = ReturnType<typeof crearMaterialesInterior>;

/** «Rayos X»: the lining goes see-through too (so the cabin shows through it, and the frame behind it); «Corte» cuts it. */
export function rayosInterior(rayosX: boolean, cortes: THREE.Plane[]) {
  const M = materialesInterior();
  for (const mt of [M.forro, M.borde, M.suelo]) { mt.transparent = rayosX; mt.opacity = rayosX ? 0.3 : 1; mt.depthWrite = !rayosX; }
  for (const mt of Object.values(M)) { mt.clippingPlanes = cortes; mt.needsUpdate = true; }
}

/** Recolour the materials for this finish (no new programs: only colours, textures and numbers). */
function vestir(c: CamposInterior) {
  const M = materialesInterior(), f = C_FORRO[c.tForroColor];
  M.forro.color.setHex(f.forro); M.borde.color.setHex(f.borde); M.suelo.color.setHex(f.suelo);
  M.forro.bumpScale = c.tAcabado === 'lujo' ? 0.9 : 0.4;
  if (c.tTapiz !== 'serie') {
    const T = C_TAPIZ[c.tTapiz], map = texturaFunda(c.tTapiz, c.tCostura, c.tCosturaColor), rel = relieveFunda(c.tTapiz, c.tCostura);
    if (map) M.asiento.map = map; if (rel) M.asiento.bumpMap = rel;
    M.asiento.roughness = T.rough; M.asiento.sheen = T.sheen; M.asiento.clearcoat = T.cuero ? 0.12 : 0;
    M.asiento.sheenColor.setHex(T.cuero ? 0xffe6cc : 0xffffff); M.asiento.sheenRoughness = T.cuero ? 0.5 : 0.85;
    M.lateral.color.setHex(T.lado); M.lateral.roughness = T.cuero ? 0.5 : 0.9;
  }
  const tm = texturaMoldura(c.tMoldura); if (tm) M.moldura.map = tm;
  M.moldura.metalness = c.tMoldura === 'aluminio' ? 0.85 : c.tMoldura === 'carbono' ? 0.2 : 0;
  M.moldura.roughness = c.tMoldura === 'aluminio' ? 0.32 : c.tMoldura === 'carbono' ? 0.3 : 0.35;
  M.moldura.clearcoat = c.tMoldura === 'aluminio' ? 0 : 1;
  M.foco.emissiveIntensity = c.tConsolaTecho === 'encendida' ? 3 : 0;
  const cin = { no: 0x18191b, negro: 0x18191b, gris: 0x6a6e74, marron: 0x3b2418, rojo: 0x9e1b22 }[c.tCinturon];
  M.cinta.color.setHex(cin);
  if (c.tAmbiente !== 'no') M.ambiente.emissive.setHex(C_AMBIENTE[c.tAmbiente]);
}

// ------------------------------------------------------------------ geometry helpers
type V3 = [number, number, number];
/**
 * A band of lining `g` inside the skin: rows every ~1 cm in x, 26 steps in t, the point moved in along the section's
 * inward normal. Each quad goes to class `clase(x, y)` (0 the body, 1 and 2 the front and rear door leaves); both sides.
 */
function forroBanda(F: FormaBala, b: BandaForro, g: number, clase: (x: number, y: number) => number, nClases: number): THREE.BufferGeometry[] {
  const nx = Math.max(8, Math.round((b.x1 - b.x0) / 0.01)), nt = 26, pos: number[] = [], uv: number[] = [];
  for (let i = 0; i <= nx; i++) {
    const x = b.x1 + (b.x0 - b.x1) * i / nx, s = F.sec(x), lo = b.tLo(x), hi = Math.max(lo + 1e-4, b.tHi(x));
    for (let j = 0; j <= nt; j++) {
      const t = lo + (hi - lo) * j / nt, [z, y] = punto(s, t), [za, ya] = punto(s, Math.max(0, t - 0.004)), [zb, yb] = punto(s, Math.min(1, t + 0.004));
      const dz = zb - za, dy = yb - ya, L = Math.hypot(dz, dy) || 1;
      // inward: the tangent (going up the right side) turned a quarter; never past the centre line
      pos.push(x, y + dz / L * g, Math.max(0.002, z - dy / L * g));
      uv.push(x / 0.4, y / 0.4);
    }
  }
  const idx: number[][] = Array.from({ length: nClases }, () => []), W = nt + 1;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nt; j++) {
    const a = i * W + j, bb = a + 1, c = a + W, d = c + 1;
    const k = clase((pos[3 * a] + pos[3 * d]) / 2, (pos[3 * a + 1] + pos[3 * d + 1]) / 2);
    idx[Math.max(0, Math.min(nClases - 1, k))].push(a, c, bb, bb, c, d);
  }
  return idx.map(ix => ambosLados(pos, uv, ix));
}
/** A right-side mesh and its mirror on the left (winding flipped), as one geometry. */
function ambosLados(pos: number[], uv: number[], idx: number[]): THREE.BufferGeometry {
  const n = pos.length / 3, P = new Float32Array(pos.length * 2), U = new Float32Array(uv.length * 2), I: number[] = [];
  P.set(pos); U.set(uv); U.set(uv, uv.length);
  for (let k = 0; k < n; k++) { P[3 * (n + k)] = pos[3 * k]; P[3 * (n + k) + 1] = pos[3 * k + 1]; P[3 * (n + k) + 2] = -pos[3 * k + 2]; }
  for (let k = 0; k < idx.length; k += 3) { I.push(idx[k], idx[k + 1], idx[k + 2]); I.push(n + idx[k], n + idx[k + 2], n + idx[k + 1]); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(U, 2)); geo.setIndex(I); geo.computeVertexNormals();
  return geo;
}
/** A point on the lining's face at (x, t), `g + extra` inside the skin. */
function enForro(F: FormaBala, x: number, t: number, g: number): V3 {
  const s = F.sec(x), [z, y] = punto(s, t), [za, ya] = punto(s, Math.max(0, t - 0.004)), [zb, yb] = punto(s, Math.min(1, t + 0.004));
  const dz = zb - za, dy = yb - ya, L = Math.hypot(dz, dy) || 1;
  return [x, y + dz / L * g, z - dy / L * g];
}
/** A point on the lining at height y (right side): `g` in from the skin there, or null where the section does not reach y. */
function enForroY(F: FormaBala, x: number, y: number, g: number): V3 | null {
  const z = F.ladoZ(x, y); return Number.isFinite(z) && z - g > 0.05 ? [x, y, z - g] : null;
}
/** Split a polyline where its class changes (each piece to its own parent: the body or a door leaf). */
function trozos(pts: V3[], clase: (p: V3) => number): { k: number; pts: V3[] }[] {
  const o: { k: number; pts: V3[] }[] = [];
  for (const p of pts) { const k = clase(p); const u = o[o.length - 1]; if (u && u.k === k) u.pts.push(p); else o.push({ k, pts: u ? [u.pts[u.pts.length - 1], p] : [p] }); }
  return o.filter(t => t.pts.length > 1);
}
const v3 = (p: V3) => new THREE.Vector3(p[0], p[1], p[2]);
const espejo = (p: V3): V3 => [p[0], p[1], -p[2]];
/**
 * A flat strap or strip along a polyline: `ancho` across it in the direction `cara(p)` × tangent and `grueso` along
 * `cara(p)`; a closed box section with flat ends. Belts, the trim line and the light strip.
 */
function cinta(pts: THREE.Vector3[], cara: (p: THREE.Vector3) => THREE.Vector3, ancho: number, grueso: number): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], T = b.clone().sub(a).normalize(), N = cara(pts[i]).clone().normalize();
    const W = new THREE.Vector3().crossVectors(T, N).normalize(), Nn = new THREE.Vector3().crossVectors(W, T).normalize();
    for (const [w, h] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = pts[i].clone().addScaledVector(W, w * ancho / 2).addScaledVector(Nn, h * grueso / 2); pos.push(p.x, p.y, p.z); }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < 4; k++) { const a = i * 4 + k, b = i * 4 + (k + 1) % 4, c = a + 4, d = b + 4; idx.push(a, c, b, b, c, d); }
  idx.push(0, 1, 2, 0, 2, 3); const L = (n - 1) * 4; idx.push(L, L + 2, L + 1, L, L + 3, L + 2);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  // (uv along the strip, for the trim's grain)
  const uv: number[] = []; let s = 0; for (let i = 0; i < n; i++) { if (i) s += pts[i].distanceTo(pts[i - 1]); for (const k of [0, 1, 1, 0]) uv.push(s / 0.25, k * 0.15); }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}
const malla = (g: THREE.BufferGeometry, m: THREE.Material, nombre: string) => { const o = new THREE.Mesh(g, m); o.name = nombre; o.castShadow = true; o.receiveShadow = true; return o; };

// ------------------------------------------------------------------ the builder
export interface PlazaInterior { pts: PuntosOcupante; z: number; piloto: boolean; vacia: boolean }
/**
 * Draw the interior finish: returns the group for «Asientos» and puts each door's lining on its hinge (`puertas`, the
 * door pivots by name). `cabina` is the cabin the seats are in: they are re-covered in place. Nothing at all is drawn or
 * changed with today's finish (the defaults).
 */
export function construirInterior(F: FormaBala, I: InteriorTriciclo, Mb: Mats, cabina: THREE.Object3D | null, puertas: Map<string, THREE.Object3D>, plazas: PlazaInterior[]): THREE.Group {
  const g = new THREE.Group(); g.name = 'interior';
  const c = I.campos, M = materialesInterior();
  vestir(c);
  // ── the seats, re-covered: the cover (Mb.cuero) and the buckets' white shells in the side colour
  if (c.tTapiz !== 'serie' && cabina) cabina.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    if (m.material === Mb.cuero) m.material = M.asiento;
    else if (m.material === Mb.blancoInterior && /butaca|cabezal/.test(m.name)) m.material = M.lateral;
  });
  const cover = c.tTapiz !== 'serie' ? M.asiento : Mb.cuero;
  const fo = I.forro;
  // a door leaf's parent: the door's pivot, the piece placed in the car's frame (as balaModelo.ts `pivote` does)
  const padre = (k: number, s: 1 | -1): THREE.Object3D => {
    if (k <= 0) return g;
    const piv = puertas.get(`puerta-${k === 2 ? 'tras-' : ''}${s > 0 ? 'der' : 'izq'}`);
    return piv ?? g;
  };
  const poner = (o: THREE.Object3D, k: number, s: 1 | -1) => { const p = padre(k, s); if (p !== g) o.position.sub(p.position); p.add(o); };
  const yTrim = (x: number) => (fo ? fo.moldura.y(x) : (I.asientos[0]?.y ?? 0.45) + 0.22);
  if (fo) {
    const gr = fo.grosor, enHoja = fo.puerta?.enHoja;
    const clase = (x: number, y: number) => (enHoja ? enHoja(x, y) + 1 : 0);
    // ── the sides (the doors' parts on their hinges: one mesh per leaf holds both sides, so it is split by side here)
    const lados = forroBanda(F, fo.lados, gr, clase, enHoja ? 3 : 1);
    lados.forEach((geo, k) => {
      if (!geo.index || !geo.index.count) return;
      if (k === 0) { g.add(malla(geo, M.forro, 'forro-costados')); return; }
      // split the leaf's geometry into its right and left halves (z > 0 and z < 0)
      for (const s of [1, -1] as const) {
        const I0 = geo.index.array, P = geo.attributes.position.array as Float32Array, ix: number[] = [];
        for (let q = 0; q < I0.length; q += 3) if (Math.sign(P[3 * I0[q] + 2]) === s) ix.push(I0[q], I0[q + 1], I0[q + 2]);
        const h = new THREE.BufferGeometry(); h.setAttribute('position', geo.attributes.position); h.setAttribute('normal', geo.attributes.normal); h.setAttribute('uv', geo.attributes.uv); h.setIndex(ix);
        poner(malla(h, M.forro, 'forro-puerta'), k, s);
      }
    });
    // ── the headliner
    if (fo.techo) { const [t] = forroBanda(F, fo.techo, gr, () => 0, 1); g.add(malla(t, M.forro, 'forro-techo')); }
    // ── a rolled edge round the windows: along the glass's lower edge, and the headliner's edge
    const rollo = (b: BandaForro, alto: boolean, r: number) => {
      const pts: V3[] = []; for (let x = b.x1; x >= b.x0; x -= 0.015) pts.push(enForro(F, x, alto ? b.tHi(x) : b.tLo(x), gr + 0.004));
      for (const s of [1, -1] as const) for (const tr of trozos(pts, p => clase(p[0], p[1]))) {
        const q = tr.pts.map(p => v3(s > 0 ? p : espejo(p)));
        poner(malla(barrido(q, () => [r, r], { lados: 8 }), M.borde, 'borde-ventana'), tr.k, s);
      }
    };
    rollo(fo.lados, true, 0.011);
    if (fo.techo) rollo(fo.techo, false, 0.01);
    // ── the floor: a carpeted board on the rails, from side to side, and its edge
    {
      const { y, x0, x1 } = fo.suelo, nx = Math.max(8, Math.round((x1 - x0) / 0.02)), nz = 10, pos: number[] = [], uv: number[] = [], ix: number[] = [];
      for (let i = 0; i <= nx; i++) {
        const x = x1 + (x0 - x1) * i / nx, zr = F.ladoZ(x, y + 0.004), w = Number.isFinite(zr) ? Math.max(0.02, zr - gr) : 0.02;
        for (let j = 0; j <= nz; j++) { const z = -w + 2 * w * j / nz; pos.push(x, y + 0.006, z); uv.push(x / 0.3, z / 0.3); }
      }
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const a = i * (nz + 1) + j, b = a + 1, cc = a + nz + 1, d = cc + 1; ix.push(a, b, cc, b, d, cc); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(ix); geo.computeVertexNormals();
      g.add(malla(geo, M.suelo, 'suelo-moqueta'));
    }
    // ── the cover over the rear shock tower
    if (fo.torreta) {
      const t = fo.torreta, y0 = fo.suelo.y;
      g.add(malla(loft([E(t.x1, y0, t.y - 0.02, t.hz * 0.8, t.hz * 0.7, t.hz * 0.4, 3), E((t.x0 + t.x1) / 2, y0, t.y, t.hz, t.hz * 0.9, t.hz * 0.6, 3.4), E(t.x0, y0, t.y - 0.02, t.hz * 0.9, t.hz * 0.8, t.hz * 0.5, 3)], { N: 32, sub: 4 }), M.suelo, 'funda-torreta'));
    }
    // ── the trim line along the sides (and the ambient light under it), on the lining
    const tira = (dy: number, alto: number, grueso: number, dentro: number, mat: THREE.Material, nombre: string) => {
      const pts: V3[] = [];
      for (let x = fo.moldura.x1; x >= fo.moldura.x0; x -= 0.02) { const p = enForroY(F, x, yTrim(x) + dy, gr + dentro); if (p) pts.push(p); }
      for (const s of [1, -1] as const) for (const tr of trozos(pts, p => clase(p[0], p[1]))) {
        const q = tr.pts.map(p => v3(s > 0 ? p : espejo(p)));
        poner(malla(cinta(q, p => new THREE.Vector3(0, 0, Math.sign(p.z) || 1), alto, grueso), mat, nombre), tr.k, s);
      }
    };
    tira(0, 0.032, 0.008, 0.004, M.moldura, 'moldura');
    if (c.tAmbiente !== 'no') tira(-0.022, 0.005, 0.004, 0.002, M.ambiente, 'luz-ambiente');
    // ── the overhead console: a dark, glossy keel under the headliner's centre line, its sides in the trim, a pair of spots over each seat
    if (I.consola) {
      const { x0, x1 } = I.consola, st: ReturnType<typeof E>[] = [];
      for (let k = 0; k <= 8; k++) {
        const u = k / 8, x = x1 + (x0 - x1) * u, top = F.arribaY(x, 0) - gr + 0.004, fin = Math.sin(Math.PI * Math.min(1, Math.min(u, 1 - u) * 6) / 2);
        const w = 0.085 * (0.55 + 0.45 * fin), d = 0.025 + 0.03 * fin;
        st.push(E(x, top - d, top, w * 0.8, w, w * 1.05, 3.2));
      }
      g.add(malla(loft(st, { N: 36, sub: 4 }), M.consola, 'consola-techo'));
      for (const s of [1, -1]) {
        const pts: THREE.Vector3[] = []; for (let k = 1; k < 8; k++) { const u = k / 8, x = x1 + (x0 - x1) * u, top = F.arribaY(x, 0) - gr; pts.push(new THREE.Vector3(x, top - 0.008, s * 0.092)); }
        g.add(malla(cinta(pts, () => new THREE.Vector3(0, 0, s), 0.014, 0.006), M.moldura, 'consola-moldura'));
        if (c.tAmbiente !== 'no') g.add(malla(cinta(pts.map(p => p.clone().add(new THREE.Vector3(0, -0.012, 0))), () => new THREE.Vector3(0, 0, s), 0.004, 0.004), M.ambiente, 'consola-ambiente'));
      }
      const yFoco = (x: number) => F.arribaY(x, 0) - gr - 0.05;
      for (const a of I.asientos) {
        // over each rider's knees, as reading lights are
        const x = Math.min(x1 - 0.06, Math.max(x0 + 0.06, a.x + 0.30));
        for (const zf of [0.045, -0.045]) {
          const y = yFoco(x) + 0.002, z = a.z + zf;
          const foco = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.006, 20), M.foco); foco.position.set(x, y, z); foco.name = 'foco'; g.add(foco);
          const aro = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.004, 8, 24), M.aro); aro.rotation.x = Math.PI / 2; aro.position.set(x, y + 0.001, z); aro.name = 'foco-aro'; g.add(aro);
        }
        if (c.tConsolaTecho === 'encendida') {
          const luz = new THREE.SpotLight(0xffe9c8, 3, 1.6, 0.75, 0.6, 1.5); luz.position.set(x, yFoco(x) - 0.01, a.z); luz.target.position.set(x - 0.15, yFoco(x) - 1, a.z); luz.castShadow = false;
          g.add(luz, luz.target);
        }
      }
    }
  }
  // ── the armrests with their cupholders: on both sides of each seat, at the trim's height (row 2's two seats have the
  // console between them and an armrest each outboard)
  if (c.tConsolaCentral === 'si') {
    const gr = fo?.grosor ?? 0.006;
    const fila2 = I.asientos.filter(a => a.fila === 2 && a.z !== 0);
    const brazo = (a: { x: number; y: number }, s: 1 | -1) => {
      const xa = a.x + 0.28, xb = a.x - 0.06, yT = yTrim(a.x + 0.1) - 0.012, ym = yT - 0.035;
      const za = F.ladoZ((xa + xb) / 2, ym); if (!Number.isFinite(za)) return;
      const zc = za - gr - 0.045;
      if (zc < 0.12) return;
      const geo = loft([E(xa, yT - 0.07, yT - 0.006, 0.03, 0.04, 0.032, 3), E(xa - 0.04, yT - 0.075, yT, 0.034, 0.045, 0.04, 3.4), E(xb + 0.04, yT - 0.075, yT, 0.034, 0.045, 0.04, 3.4), E(xb, yT - 0.07, yT - 0.006, 0.03, 0.04, 0.032, 3)], { N: 28, sub: 3 });
      geo.translate(0, 0, s * zc);
      const k = fo?.puerta ? fo.puerta.enHoja((xa + xb) / 2, ym) + 1 : 0;
      poner(malla(geo, cover, 'reposabrazos'), k, s);
      // the cupholder at its front, sunk in the trim-coloured cap
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.006, 28), M.moldura); cap.position.set(xa - 0.045, yT + 0.002, s * zc); cap.name = 'portavasos-tapa'; poner(cap, k, s);
      const pozo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.008, 24), M.negro); pozo.position.set(xa - 0.045, yT + 0.003, s * zc); pozo.name = 'portavasos-pozo'; poner(pozo, k, s);
      const aro = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.003, 8, 28), M.aro); aro.rotation.x = Math.PI / 2; aro.position.set(xa - 0.045, yT + 0.006, s * zc); aro.name = 'portavasos-aro'; poner(aro, k, s);
    };
    for (const a of I.asientos) {
      if (a.fila === 2 && a.z !== 0) { brazo(a, a.z > 0 ? 1 : -1); continue; }
      brazo(a, 1); brazo(a, -1);
    }
    if (fila2.length >= 2) {
      // the console between row 2's seats, from the floor to an armrest, with two cupholders in its trim top
      const a = fila2[0], x0 = a.x - 0.10, x1 = a.x + 0.30, y0 = fo ? fo.suelo.y : a.y - 0.3, y1 = a.y + 0.17, hw = Math.max(0.04, Math.min(0.085, Math.abs(a.z) - 0.235));
      g.add(malla(loft([E(x1, y0, y1 - 0.01, hw * 0.9, hw * 0.95, hw * 0.8, 3), E(x1 - 0.04, y0, y1, hw, hw, hw * 0.92, 3.6), E(x0 + 0.04, y0, y1, hw, hw, hw * 0.92, 3.6), E(x0, y0, y1 - 0.01, hw * 0.9, hw * 0.95, hw * 0.8, 3)], { N: 32, sub: 3 }), cover, 'consola-central'));
      g.add(malla(cinta([new THREE.Vector3(x1 - 0.02, y1 + 0.002, 0), new THREE.Vector3(x0 + 0.02, y1 + 0.002, 0)], () => new THREE.Vector3(0, 1, 0), 2 * hw - 0.02, 0.004), M.moldura, 'consola-central-tapa'));
      for (const dx of [0.05, 0.14]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.01, 24), M.negro); p.position.set(x1 - dx, y1 + 0.004, 0); p.name = 'portavasos-pozo'; g.add(p); }
    }
  }
  // ── the belts: a three-point belt across each rider (from the seat's outboard shoulder down to the buckle at the other
  // hip, and the lap belt); an empty seat's, retracted up its side
  if (c.tCinturon !== 'no') for (const q of plazas) {
    const p = q.pts, H = new THREE.Vector2(...p.H), S = new THREE.Vector2(...p.S), d = S.clone().sub(H).normalize(), f = new THREE.Vector2(d.y, -d.x);
    const s = q.z > 0.05 ? 1 : q.z < -0.05 ? -1 : 1, z0 = q.z;
    const P = (base: THREE.Vector2, alongD: number, alongF: number, z: number) => new THREE.Vector3(base.x + d.x * alongD + f.x * alongF, base.y + d.y * alongD + f.y * alongF, z0 + s * z);
    const cara = () => new THREE.Vector3(f.x, f.y, 0);
    const hebilla = P(H, 0.05, 0.09, -0.16);
    if (q.vacia) {
      g.add(malla(cinta(curva([P(S, 0.05, -0.07, 0.17), P(S, -0.10, -0.03, 0.19), P(H, 0.12, -0.02, 0.19)], 6), cara, 0.046, 0.003), M.cinta, 'cinturon'));
    } else {
      const hombro = curva([P(S, 0.05, -0.08, 0.16), P(S, 0.0, 0.06, 0.12), P(H, 0.30, 0.125, 0.05), P(H, 0.16, 0.13, -0.06), hebilla], 8);
      g.add(malla(cinta(hombro, cara, 0.046, 0.003), M.cinta, 'cinturon'));
      const regazo = curva([P(H, 0.02, 0.0, 0.2), P(H, 0.05, 0.10, 0.12), P(H, 0.07, 0.125, 0), hebilla], 8);
      g.add(malla(cinta(regazo, cara, 0.046, 0.003), M.cinta, 'cinturon'));
    }
    const caja = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.018), M.hebilla); caja.position.copy(hebilla); caja.rotation.z = Math.atan2(d.y, d.x) - Math.PI / 2; caja.name = 'cinturon-hebilla'; g.add(caja);
    const tope = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.022), M.negro); tope.position.copy(P(H, -0.01, 0.06, -0.17)); tope.name = 'cinturon-tope'; g.add(tope);
  }
  return g;
}
