// ============================================================================
// ARQUITECTURA · PROTOTYPES: EVERY MODEL IS BUILT ONCE (2026-11-05)
// ============================================================================
// Eugenio: «que los edificios que sean iguales solo se carguen una vez».
//
// Each model below (nest floor, nest roof, social centre, annex floor, shop,
// shed, tree, car, bike, bus, train, aircraft, solar table, street lamp) is
// built ONCE, the first time the page needs it, as a single geometry with its
// colours baked per vertex (wall, glass, door, roof tile…). The scene then draws
// it with an InstancedMesh: 4,200 nests are one model drawn 4,200 times in one
// GPU call, each copy with its own position, rotation, size and tint.
//
// Models live in "unit space" so one shape serves every size: buildings are
// 1×1×1 (scaled to width × height × depth), hexagons have circumradius 1 and
// trees are 1 tall with a canopy of radius 1. Vehicles are in real metres.
//
// The instance colour MULTIPLIES the vertex colour: white walls take the tint
// (cream for nests, the system colour for annexes) while glass and tiles,
// already dark or coloured, keep reading as glass and tiles.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const BLANCO = '#ffffff';
const VIDRIO = '#2b3a48';
const VIDRIO_CLARO = '#9fd4f0';
const MARCO = '#d9d9d9';
const LOSA = '#bdb6aa';
const TEJA = '#c4622d';
const TEJA_OSCURA = '#9a4a20';
const MADERA = '#7a5236';
const NEGRO = '#222222';
const GRIS = '#8a8f94';
const PANEL = '#1d3557';
const TRONCO = '#6b4f3a';

function pieza(g: THREE.BufferGeometry, color: string, m?: THREE.Matrix4): THREE.BufferGeometry {
  const q = g.index ? g.toNonIndexed() : g.clone();
  for (const k of Object.keys(q.attributes)) if (k !== 'position' && k !== 'normal') q.deleteAttribute(k);
  if (m) q.applyMatrix4(m);
  const c = new THREE.Color(color);
  const n = q.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  q.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return q;
}
const M = (x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));
function unir(partes: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(partes, false)!;
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}
const caja = (w: number, h: number, d: number, color: string, x = 0, y = 0, z = 0, ry = 0, rx = 0) =>
  pieza(new THREE.BoxGeometry(w, h, d), color, M(x, y, z, ry, rx));
const cil = (rt: number, rb: number, h: number, seg: number, color: string, x = 0, y = 0, z = 0, rx = 0, rz = 0) =>
  pieza(new THREE.CylinderGeometry(rt, rb, h, seg), color, M(x, y, z, 0, rx, rz));

// ---------------------------------------------------------------- buildings
/** One floor of a hexagonal nest: circumradius 1, height 1. Windows on five faces, door on one. */
function nidoPlanta() {
  const p: THREE.BufferGeometry[] = [cil(1, 1, 0.94, 6, BLANCO, 0, 0.47)];
  p.push(cil(1.03, 1.03, 0.06, 6, LOSA, 0, 0.97));                 // slab edge between floors
  const ap = Math.cos(Math.PI / 6);
  for (let k = 0; k < 6; k++) {
    const a = (k + 0.5) * (Math.PI / 3);                              // face centre (CylinderGeometry starts at +z)
    const x = Math.sin(a) * (ap + 0.012), z = Math.cos(a) * (ap + 0.012);
    if (k === 0) {
      p.push(caja(0.26, 0.62, 0.03, MADERA, x, 0.31, z, a));
      p.push(caja(0.2, 0.22, 0.03, VIDRIO, Math.sin(a) * (ap + 0.012) + Math.cos(a) * 0.32, 0.55, Math.cos(a) * (ap + 0.012) - Math.sin(a) * 0.32, a));
    } else {
      p.push(caja(0.52, 0.44, 0.03, MARCO, x, 0.52, z, a));
      p.push(caja(0.46, 0.38, 0.035, k % 2 ? VIDRIO : '#33495c', x, 0.52, z, a));
      p.push(caja(0.56, 0.04, 0.08, LOSA, Math.sin(a) * (ap + 0.03), 0.28, Math.cos(a) * (ap + 0.03), a)); // sill
    }
  }
  return unir(p);
}
/** Nest roof: eaves + six-sided hip roof in tile, a skylight and a small chimney. */
function nidoTecho() {
  return unir([
    cil(1.14, 1.14, 0.08, 6, TEJA_OSCURA, 0, 0.04),
    pieza(new THREE.ConeGeometry(1.12, 0.42, 6), TEJA, M(0, 0.29)),
    caja(0.16, 0.22, 0.16, LOSA, 0.35, 0.3, 0.2),
    pieza(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), VIDRIO_CLARO, M(-0.25, 0.27, -0.28, 0, -0.35)),
  ]);
}
/** Round wall of a social centre: diameter 1, height 1, ribbon of windows and an entrance. */
function socialMuro() {
  const p: THREE.BufferGeometry[] = [cil(0.5, 0.5, 1, 48, BLANCO, 0, 0.5)];
  p.push(cil(0.52, 0.52, 0.06, 48, LOSA, 0, 0.03));
  const n = 20;
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI * 2;
    if (i === 0 || i === n - 1) continue;
    p.push(caja(0.11, 0.42, 0.012, VIDRIO, Math.sin(a) * 0.503, 0.52, Math.cos(a) * 0.503, a));
  }
  p.push(caja(0.2, 0.62, 0.02, VIDRIO_CLARO, 0, 0.31, 0.505));     // glass entrance facing +z
  p.push(caja(0.32, 0.04, 0.12, LOSA, 0, 0.66, 0.54));               // canopy over the door
  return unir(p);
}
/** Social centre roof (unit diameter): eaves, tile cone, round skylight. */
function socialTecho() {
  return unir([
    cil(0.57, 0.57, 0.025, 48, TEJA_OSCURA, 0, 0.012),
    cil(0.17, 0.56, 0.2, 48, TEJA, 0, 0.12),
    cil(0.175, 0.175, 0.025, 32, LOSA, 0, 0.225),
    pieza(new THREE.SphereGeometry(0.16, 32, 8, 0, Math.PI * 2, 0, Math.PI / 2), VIDRIO_CLARO, M(0, 0.23, 0, 0, 0, 0, 1, 0.45, 1)),
  ]);
}
/** One floor of an annex (box 1×1×1): ribbon windows on four sides and a slab line. */
function anexoPlanta() {
  const p: THREE.BufferGeometry[] = [caja(1, 0.95, 1, BLANCO, 0, 0.475)];
  p.push(caja(1.02, 0.05, 1.02, LOSA, 0, 0.975));
  for (const [x, z, ry] of [[0, 0.501, 0], [0, -0.501, Math.PI], [0.501, 0, Math.PI / 2], [-0.501, 0, -Math.PI / 2]] as [number, number, number][]) {
    p.push(caja(0.84, 0.4, 0.01, VIDRIO, x, 0.55, z, ry));
    for (let i = -2; i <= 2; i++) {
      const ox = Math.cos(ry) * i * 0.17, oz = -Math.sin(ry) * i * 0.17;
      p.push(caja(0.012, 0.4, 0.014, MARCO, x + ox, 0.55, z + oz, ry));       // mullions
    }
  }
  p.push(caja(0.22, 0.6, 0.015, VIDRIO_CLARO, 0, 0.3, 0.506));               // entrance
  return unir(p);
}
/** Annex roof (unit footprint, real 0.3 m tall): parapet, solar rows and a machine box. */
function anexoTecho() {
  const p: THREE.BufferGeometry[] = [caja(1.02, 0.12, 1.02, LOSA, 0, 0.06)];
  for (const [x, z, w, d] of [[0, 0.5, 1.02, 0.03], [0, -0.5, 1.02, 0.03], [0.5, 0, 0.03, 1.02], [-0.5, 0, 0.03, 1.02]] as number[][]) p.push(caja(w, 0.3, d, '#cfc8bc', x, 0.24, z));
  for (let r = 0; r < 3; r++) p.push(caja(0.7, 0.03, 0.14, PANEL, -0.05, 0.22, -0.3 + r * 0.22, 0, -0.45));
  p.push(caja(0.16, 0.25, 0.12, GRIS, 0.36, 0.25, 0.3));
  return unir(p);
}
/** Market stall / shop (unit box): glass front, orange awning. */
function tienda() {
  return unir([
    caja(1, 1, 1, BLANCO, 0, 0.5),
    caja(0.86, 0.6, 0.01, VIDRIO_CLARO, 0, 0.36, 0.501),
    pieza(new THREE.BoxGeometry(1, 0.03, 0.32), '#e08a2e', M(0, 0.78, 0.6, 0, 0.35)),
    caja(1.04, 0.06, 1.04, LOSA, 0, 1.03),
  ]);
}
/** Workshop shed (unit box) with a saw-tooth roof and north lights. */
function nave() {
  const p: THREE.BufferGeometry[] = [caja(1, 0.8, 1, BLANCO, 0, 0.4)];
  for (let i = 0; i < 4; i++) {
    const x = -0.375 + i * 0.25;
    p.push(pieza(new THREE.BoxGeometry(0.25, 0.02, 1), '#a7adb3', M(x + 0.02, 0.88, 0, 0, 0, -0.55)));
    p.push(caja(0.012, 0.16, 1, VIDRIO_CLARO, x + 0.12, 0.88, 0));
  }
  p.push(caja(0.3, 0.5, 0.01, '#5b6168', 0, 0.25, 0.501));
  return unir(p);
}

// ---------------------------------------------------------------- nature, vehicles, street
/** Tree, 1 tall, canopy radius 1 (scaled by height and canopy). Two blobs and a trunk. */
function arbolDetalle() {
  return unir([
    cil(0.07, 0.1, 0.5, 6, TRONCO, 0, 0.25),
    pieza(new THREE.IcosahedronGeometry(1, 1), BLANCO, M(0, 0.62, 0, 0, 0, 0, 1, 0.38, 1)),
    pieza(new THREE.IcosahedronGeometry(0.6, 1), '#e6e6e6', M(0.35, 0.82, 0.15, 0, 0, 0, 1, 0.22 / 0.6, 1)),
  ]);
}
function arbolSimple() {
  return unir([pieza(new THREE.IcosahedronGeometry(1, 0), BLANCO, M(0, 0.62, 0, 0, 0, 0, 1, 0.38, 1))]);
}
function rueda(x: number, z: number, r: number, w: number) {
  return pieza(new THREE.CylinderGeometry(r, r, w, 12), NEGRO, M(x, r, z, 0, Math.PI / 2));
}
function coche() {
  return unir([
    caja(4.3, 0.75, 1.8, BLANCO, 0, 0.7),
    caja(2.3, 0.62, 1.62, VIDRIO, -0.2, 1.38),
    caja(2.1, 0.06, 1.5, BLANCO, -0.2, 1.72),
    rueda(1.4, 0.82, 0.34, 0.25), rueda(1.4, -0.82, 0.34, 0.25), rueda(-1.35, 0.82, 0.34, 0.25), rueda(-1.35, -0.82, 0.34, 0.25),
    caja(0.05, 0.12, 1.4, '#fff3b0', 2.16, 0.82, 0),
  ]);
}
function bici() {
  return unir([
    pieza(new THREE.TorusGeometry(0.33, 0.035, 6, 16), NEGRO, M(0.55, 0.35, 0)),
    pieza(new THREE.TorusGeometry(0.33, 0.035, 6, 16), NEGRO, M(-0.55, 0.35, 0)),
    caja(1.1, 0.05, 0.05, BLANCO, 0, 0.62),
    caja(0.05, 0.5, 0.05, BLANCO, -0.15, 0.55, 0, 0, 0),
    caja(0.25, 0.05, 0.12, NEGRO, -0.15, 0.82),
    caja(0.05, 0.05, 0.5, GRIS, 0.5, 0.95),
  ]);
}
function bus() {
  return unir([
    caja(9, 2.5, 2.5, BLANCO, 0, 1.6),
    caja(8.6, 0.8, 2.52, VIDRIO, 0, 2.05),
    caja(0.05, 1.8, 2.2, VIDRIO, 4.51, 1.7),
    rueda(3, 1.05, 0.5, 0.3), rueda(3, -1.05, 0.5, 0.3), rueda(-3, 1.05, 0.5, 0.3), rueda(-3, -1.05, 0.5, 0.3),
  ]);
}
function tren() {
  const p: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const x = -26 + i * 26.5;
    p.push(caja(25.5, 3.4, 3.1, BLANCO, x, 2.3));
    p.push(caja(24, 0.9, 3.12, VIDRIO, x, 2.6));
    p.push(caja(25.5, 0.25, 2.6, GRIS, x, 4.1));
  }
  p.push(pieza(new THREE.SphereGeometry(1.6, 16, 8, 0, Math.PI), BLANCO, M(13.3, 2.3, 0, Math.PI / 2, 0, 0, 1.4, 1, 1)));
  return unir(p);
}
/** Shared eVTOL aircraft: cabin, wing, tail, six rotors on booms. */
function aeronave() {
  const p: THREE.BufferGeometry[] = [
    pieza(new THREE.SphereGeometry(1, 20, 12), BLANCO, M(0, 1.6, 0, 0, 0, 0, 3.2, 0.95, 0.95)),
    pieza(new THREE.SphereGeometry(0.75, 16, 10), VIDRIO, M(1.6, 1.85, 0, 0, 0, 0, 1.2, 0.6, 0.75)),
    caja(1.6, 0.12, 11, BLANCO, 0.2, 2.15),
    caja(0.8, 1.2, 0.1, BLANCO, -3, 2.3, 0),
  ];
  for (const z of [-4.6, -2.6, 2.6, 4.6]) {
    p.push(caja(4.8, 0.1, 0.12, GRIS, 0.2, 2.25, z));
    for (const x of [-2, 2.4]) p.push(cil(0.95, 0.95, 0.04, 20, '#3a3f45', x, 2.4, z));
  }
  for (const z of [-0.6, 0.6]) p.push(caja(2.6, 0.08, 0.08, GRIS, 0, 0.45, z));
  return unir(p);
}
/** Solar table, unit footprint (scaled to 4.6 × 2.3 m), tilted 25° on two legs. */
function mesaSolar() {
  return unir([
    pieza(new THREE.BoxGeometry(1, 0.03, 1), PANEL, M(0, 1.15, 0, 0, -0.44)),
    pieza(new THREE.BoxGeometry(1.01, 0.02, 0.012), MARCO, M(0, 1.16, 0, 0, -0.44)),
    caja(0.02, 0.9, 0.02, GRIS, -0.4, 0.45, 0.3), caja(0.02, 1.6, 0.02, GRIS, -0.4, 0.8, -0.3),
    caja(0.02, 0.9, 0.02, GRIS, 0.4, 0.45, 0.3), caja(0.02, 1.6, 0.02, GRIS, 0.4, 0.8, -0.3),
  ]);
}
function farola() {
  return unir([
    cil(0.07, 0.09, 5.2, 8, '#4b5157', 0, 2.6),
    caja(0.9, 0.06, 0.06, '#4b5157', 0.42, 5.15),
    caja(0.42, 0.1, 0.2, '#fff6d6', 0.82, 5.08),
  ]);
}

// ---------------------------------------------------------------- lazy registry
const fabricas = {
  nidoPlanta, nidoTecho, socialMuro, socialTecho, anexoPlanta, anexoTecho, tienda, nave,
  arbolDetalle, arbolSimple, coche, bici, bus, tren, aeronave, mesaSolar, farola,
};
export type Prototipo = keyof typeof fabricas;
const cache = new Map<Prototipo, THREE.BufferGeometry>();
/** The geometry of a model: created the first time it is asked for, then always the same object. */
export function prototipo(n: Prototipo): THREE.BufferGeometry {
  let g = cache.get(n);
  if (!g) { g = fabricas[n](); cache.set(n, g); }
  return g;
}

/** Building blocks for models made elsewhere (the animation builds its own, on demand). */
export const piezas = { pieza, unir, caja, cil, M, rueda };
