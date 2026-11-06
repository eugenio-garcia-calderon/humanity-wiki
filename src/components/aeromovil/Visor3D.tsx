// ============================================================================
// AEROMÓVIL GOTA · visor 3D por capas (2026-11-05)
// ============================================================================
// Three.js a mano, sin R3F: la escena se reconstruye entera al cambiar un
// parámetro (unos 200 objetos, pocos milisegundos) y la parte móvil
// (suspensión, inclinación, ruedas, puertas) se rehace sola mientras se anima.
//
// La piel del carenado se construye sobre una rejilla (u, θ) cuyas líneas
// incluyen los bordes de cristales, paneles y puertas: así cada celda cae
// entera en una zona y las puertas se pueden abrir dejando su hueco.
//
// Los colores de los materiales viven aquí y no en `src/components/ui/`
// porque son colores de material 3D (aluminio, neumático, fibra), no de
// interfaz. Anotado en 02_TECH_DEBT.md.
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import {
  ARM_UP, CELULA, SEAT_GAP, TIRE_W, TRAVEL_F, TRAVEL_R, enZona, tramosTubo,
  type Modelo, type Piel,
} from './geometria';
import type { Referencia } from './referencias';

export const CAPAS = [
  { k: 'carenado', n: 'Carenado', color: 'bg-zinc-300' },
  { k: 'cristales', n: 'Cristales', color: 'bg-sky-900' },
  { k: 'solar', n: 'Paneles solares', color: 'bg-indigo-900' },
  { k: 'chasis', n: 'Chasis', color: 'bg-zinc-400' },
  { k: 'suspension', n: 'Suspensión', color: 'bg-amber-500' },
  { k: 'ruedas', n: 'Ruedas', color: 'bg-neutral-900' },
  { k: 'asientos', n: 'Asientos', color: 'bg-zinc-700' },
  { k: 'ocupantes', n: 'Ocupantes', color: 'bg-orange-300' },
  { k: 'motor', n: 'Motor', color: 'bg-red-700' },
  { k: 'baterias', n: 'Baterías', color: 'bg-blue-600' },
] as const;
export type CapaId = typeof CAPAS[number]['k'];
export type Vista = 'iso' | 'side' | 'top' | 'front';

export interface VisorHandle {
  /** STL binario de las capas visibles, en milímetros y con Z arriba (como el STEP). */
  exportarSTL: (capas: CapaId[]) => Blob;
}

interface Props {
  modelo: Modelo;
  visibles: Record<CapaId, boolean>;
  rayosX: boolean;
  corte: boolean;
  curva: boolean;
  cotas: boolean;
  abierta: boolean;
  vista: Vista;
  /** Otro velomóvil: oculto, comparado (fantasma junto al nuestro) o solo. */
  referencia?: Referencia | null;
  modoRef?: 'no' | 'comparar' | 'sola';
  alinear?: 'eje' | 'morro' | 'lado';
}

const VISTAS: Record<Vista, [number, number, number]> = {
  iso: [-3.6, 2.8, -6.6], side: [-1.5, 0.9, -7.6], top: [-1.5, 8.8, 0.01], front: [5.4, 1.1, 0],
};

type V3 = [number, number, number];
const rot = (p: [number, number], c: [number, number], a: number): [number, number] => {
  const cs = Math.cos(a), sn = Math.sin(a), dx = p[0] - c[0], dy = p[1] - c[1];
  return [c[0] + dx * cs - dy * sn, c[1] + dx * sn + dy * cs];
};

function texturaSolar() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0d1630'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#5b6b8c'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 125, 125);
  g.strokeStyle = '#2a3a5e'; g.lineWidth = 1;
  for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(i * 128 / 6, 4); g.lineTo(i * 128 / 6, 124); g.stroke(); }
  g.strokeStyle = '#8a97b0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(4, 42); g.lineTo(124, 42); g.moveTo(4, 86); g.lineTo(124, 86); g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function materiales() {
  return {
    body: new THREE.MeshPhysicalMaterial({ color: 0xd5d9dd, metalness: 0.25, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x14212c, metalness: 0.1, roughness: 0.03, clearcoat: 1, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    solar: new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: texturaSolar(), metalness: 0.35, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide }),
    alu: new THREE.MeshStandardMaterial({ color: 0xa9b1b9, metalness: 0.85, roughness: 0.32 }),
    susp: new THREE.MeshStandardMaterial({ color: 0xde9223, metalness: 0.6, roughness: 0.3 }),
    stanch: new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.95, roughness: 0.15 }),
    black: new THREE.MeshStandardMaterial({ color: 0x1b1c1e, metalness: 0.3, roughness: 0.5 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x141414, metalness: 0, roughness: 0.88 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xc4c9ce, metalness: 0.9, roughness: 0.25 }),
    seat: new THREE.MeshPhysicalMaterial({ color: 0x2a2d31, metalness: 0.2, roughness: 0.45, clearcoat: 0.6 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xc9a27c, metalness: 0, roughness: 0.75 }),
    ropaPiloto: new THREE.MeshStandardMaterial({ color: 0x2f4f5f, metalness: 0, roughness: 0.85 }),
    ropaPasajero: new THREE.MeshStandardMaterial({ color: 0x6b5d52, metalness: 0, roughness: 0.85 }),
    pantalon: new THREE.MeshStandardMaterial({ color: 0x2b2f38, metalness: 0, roughness: 0.9 }),
    zapato: new THREE.MeshStandardMaterial({ color: 0x1d1d1f, metalness: 0.1, roughness: 0.6 }),
    pelo: new THREE.MeshStandardMaterial({ color: 0x3a2a20, metalness: 0, roughness: 0.9 }),
    soldadura: new THREE.MeshStandardMaterial({ color: 0x9aa2aa, metalness: 0.8, roughness: 0.4 }),
    carcasa: new THREE.MeshStandardMaterial({ color: 0x18191b, metalness: 0.4, roughness: 0.35 }),
    motor: new THREE.MeshStandardMaterial({ color: 0xb5533a, metalness: 0.55, roughness: 0.35 }),
    batt: new THREE.MeshStandardMaterial({ color: 0x2f7fd0, metalness: 0.3, roughness: 0.45 }),
    spoke: new THREE.LineBasicMaterial({ color: 0x9aa1a8 }),
    faro: new THREE.MeshStandardMaterial({ color: 0xf4f7fb, emissive: 0xf4f7fb, emissiveIntensity: 1.3 }),
    piloto: new THREE.MeshStandardMaterial({ color: 0xd33a2c, emissive: 0xd33a2c, emissiveIntensity: 1.3 }),
    intermitenteI: new THREE.MeshStandardMaterial({ color: 0xf29a1f, emissive: 0xf29a1f, emissiveIntensity: 0.15 }),
    intermitenteD: new THREE.MeshStandardMaterial({ color: 0xf29a1f, emissive: 0xf29a1f, emissiveIntensity: 0.15 }),
    cota: new THREE.LineBasicMaterial({ color: 0x0e5e6b, depthTest: false, transparent: true }),
    cotaFlecha: new THREE.MeshBasicMaterial({ color: 0x0e5e6b, depthTest: false, transparent: true }),
  };
}
type Mats = ReturnType<typeof materiales>;

const _up = new THREE.Vector3(0, 1, 0);
function tube(g: THREE.Object3D, a: V3, b: V3, d: number, mat: THREE.Material) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), v = B.clone().sub(A), L = v.length();
  if (L < 1e-5) return;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, L, 20, 1), mat);
  m.position.copy(A).addScaledVector(v, 0.5);
  m.quaternion.setFromUnitVectors(_up, v.normalize());
  m.castShadow = true; g.add(m);
}
function sphere(g: THREE.Object3D, c: V3, r: number, mat: THREE.Material, escala?: V3) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat); m.position.set(...c); if (escala) m.scale.set(...escala); m.castShadow = true; g.add(m); return m;
}
function box(g: THREE.Object3D, c: V3, s: V3, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...s), mat); m.position.set(...c); m.castShadow = true; g.add(m);
}
function disk(g: THREE.Object3D, c: V3, r: number, w: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 40), mat); m.rotation.x = Math.PI / 2; m.position.set(...c); m.castShadow = true; g.add(m);
}
function vaciar(g: THREE.Object3D) {
  while (g.children.length) { const o = g.children.pop()!; o.traverse((c: any) => { c.geometry?.dispose?.(); if (c.isSprite) { c.material.map?.dispose(); c.material.dispose(); } }); }
}
const unicos = (v: number[]) => { v.sort((a, b) => a - b); const o: number[] = []; for (const x of v) if (!o.length || x - o[o.length - 1] > 1e-4) o.push(x); return o; };

/** La piel: una rejilla (u, θ) que respeta los bordes de cristales, paneles y puertas. */
function construirPiel(m: Modelo) {
  const T = 2 * Math.PI;
  const us: number[] = [], ts: number[] = [];
  for (let i = 0; i <= 160; i++) us.push((1 - Math.cos(Math.PI * i / 160)) / 2);
  for (let j = 0; j <= 112; j++) ts.push(T * j / 112);
  for (const z of [...m.zonasPiel, ...m.puertas]) { us.push(z.u0, z.u1); ts.push(((z.t0 % T) + T) % T, ((z.t1 % T) + T) % T); }
  const U = unicos(us), TH = unicos(ts.map(t => (t >= T - 1e-6 ? T : t)));
  if (TH[TH.length - 1] < T) TH.push(T);
  const nu = U.length, nv = TH.length;
  const pos: V3[][] = U.map(u => { const f = m.frame(u); return TH.map(t => m.sec(f, t)); });
  // Normales por diferencias finitas sobre la rejilla completa: así no hay
  // costuras de sombreado entre zonas vecinas.
  const nor: V3[][] = pos.map((fila, i) => fila.map((_, j) => {
    if (i === 0) return [1, 0, 0] as V3;
    if (i === nu - 1) return [-1, 0, 0] as V3;
    const a = pos[i + 1][j], b = pos[i - 1][j];
    const jp = j === nv - 1 ? 1 : j + 1, jm = j === 0 ? nv - 2 : j - 1;
    const c = pos[i][jp], d = pos[i][jm];
    const du = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dt = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
    const n: V3 = [dt[1] * du[2] - dt[2] * du[1], dt[2] * du[0] - dt[0] * du[2], dt[0] * du[1] - dt[1] * du[0]];
    const L = Math.hypot(...n) || 1; return [n[0] / L, n[1] / L, n[2] / L];
  }));
  type Cubo = { p: number[]; n: number[]; uv: number[]; i: number[]; mapa: Map<number, number> };
  const cubos = new Map<string, Cubo>();
  const meter = (c: Cubo, i: number, j: number) => {
    const k = i * nv + j; let v = c.mapa.get(k);
    if (v === undefined) {
      v = c.p.length / 3; c.mapa.set(k, v);
      const q = pos[i][j]; c.p.push(...q); c.n.push(...nor[i][j]); c.uv.push(q[0] / CELULA, q[2] / CELULA);
    }
    return v;
  };
  for (let i = 0; i < nu - 1; i++) for (let j = 0; j < nv - 1; j++) {
    const uc = (U[i] + U[i + 1]) / 2, tc = (TH[j] + TH[j + 1]) / 2;
    const zona = m.zonasPiel.find(z => enZona(z, uc, tc));
    const piel: Piel = zona ? zona.piel : 'carroceria';
    const puerta = m.puertas.find(z => enZona(z, uc, tc));
    const clave = `${puerta?.id ?? 'fijo'}|${piel}`;
    let c = cubos.get(clave);
    if (!c) { c = { p: [], n: [], uv: [], i: [], mapa: new Map() }; cubos.set(clave, c); }
    const a = meter(c, i, j), a1 = meter(c, i, j + 1), b = meter(c, i + 1, j), b1 = meter(c, i + 1, j + 1);
    c.i.push(a, a1, b, a1, b1, b);
  }
  const out: { puerta: string; piel: Piel; geo: THREE.BufferGeometry }[] = [];
  for (const [clave, c] of cubos) {
    const [puerta, piel] = clave.split('|') as [string, Piel];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(c.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(c.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(c.uv, 2));
    g.setIndex(c.i);
    out.push({ puerta, piel, geo: g });
  }
  return out;
}

function rueda(g: THREE.Object3D, M: Mats, x: number, y: number, z: number, r: number) {
  const w = new THREE.Group(); w.position.set(x, y, z); g.add(w);
  const t = new THREE.Mesh(new THREE.TorusGeometry(r - TIRE_W / 2, TIRE_W / 2, 14, 64), M.tire); t.castShadow = true; w.add(t);
  w.add(new THREE.Mesh(new THREE.TorusGeometry(r - 0.06, 0.011, 8, 64), M.rim));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.10, 20), M.rim); hub.rotation.x = Math.PI / 2; w.add(hub);
  const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.003, 40), M.black); rotor.rotation.x = Math.PI / 2; rotor.position.z = 0.035; w.add(rotor);
  const pts: number[] = [];
  for (let k = 0; k < 28; k++) {
    const a = 2 * Math.PI * k / 28, s = k % 2 ? 1 : -1, b = a + 0.35 * s;
    pts.push(0.028 * Math.cos(a), 0.028 * Math.sin(a), s * 0.035, (r - 0.065) * Math.cos(b), (r - 0.065) * Math.sin(b), 0);
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  w.add(new THREE.LineSegments(lg, M.spoke));
}

/** Asiento ligero: base acolchada, respaldo alto, cabecero y el marco de tubo detrás. */
function asiento(g: THREE.Object3D, M: Mats, m: Modelo, piloto: boolean, lat: number, w: number) {
  const a = m.asientoPiezas(piloto);
  const pieza = (pts: [number, number][], ancho: number, mat: THREE.Material) => {
    const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(p => sh.lineTo(p[0], p[1])); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: ancho, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 3, curveSegments: 4 });
    geo.translate(0, 0, -ancho / 2 + lat);
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; g.add(mesh);
  };
  pieza(a.base, w - 0.10, M.seat);
  pieza(a.respaldo, w - 0.10, M.seat);
  pieza(a.cabecero, a.anchoCabecero - 0.02, M.seat);
  for (const s of [-1, 1]) {
    const z = lat + s * (w / 2 - 0.09);
    for (let i = 0; i < a.marco.length - 1; i++) tube(g, [a.marco[i][0], a.marco[i][1], z], [a.marco[i + 1][0], a.marco[i + 1][1], z], 0.018, M.alu);
  }
}

/** Un tubo curvado por sus puntos de paso (la misma curva que mide `largoTubo`). */
function tuboCurvo(g: THREE.Object3D, pts: V3[], d: number, mat: THREE.Material) {
  const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(c, 48, d / 2, 12, false), mat); mesh.castShadow = true; g.add(mesh);
  for (const p of [pts[0], pts[pts.length - 1]]) sphere(g, p, d / 2, mat);
}

/** Cápsula de `a` a `b` con radio `r`, ensanchada de lado (`ancho`) y aplanada de fondo (`fondo`). */
function capsula(g: THREE.Object3D, a: V3, b: V3, r: number, mat: THREE.Material, ancho = 1, fondo = 1) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), y = B.clone().sub(A), L = y.length();
  if (L < 1e-4) return;
  y.normalize();
  let z = new THREE.Vector3(0, 0, 1); z.addScaledVector(y, -z.dot(y));
  if (z.lengthSq() < 1e-6) z = new THREE.Vector3(1, 0, 0); z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, L), 6, 16), mat);
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  mesh.position.copy(A).addScaledVector(y, L / 2);
  mesh.scale.set(fondo, 1, ancho);
  mesh.castShadow = true; g.add(mesh);
}

/** Codo o rodilla en 3D: dos huesos de `a` a `b`, doblados hacia `polo`. */
function articulacion(a: V3, b: V3, l1: number, l2: number, polo: V3): V3 {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), ab = B.clone().sub(A);
  const d = Math.min(ab.length(), l1 + l2 - 1e-3), u = ab.clone().normalize();
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const p = new THREE.Vector3(...polo); p.addScaledVector(u, -p.dot(u)).normalize();
  const c = A.clone().addScaledVector(u, x).addScaledVector(p, h);
  return [c.x, c.y, c.z];
}

/** Maniquí articulado: cabeza, cuello, tronco, pelvis, brazos con codos y piernas con pies. */
function ocupante(g: THREE.Object3D, M: Mats, m: Modelo, lat: number, piloto: boolean) {
  const o = m.occPts(piloto), d = o.d;
  const ropa = piloto ? M.ropaPiloto : M.ropaPasajero;
  const en = (q: [number, number], l: number): V3 => [q[0], q[1], l];
  const lo = (t: number): [number, number] => [o.H[0] + d[0] * t, o.H[1] + d[1] * t];
  const atras = [-d[1], d[0]] as [number, number];   // perpendicular al tronco, hacia el respaldo
  // Tronco: pelvis, abdomen y pecho, más anchos que hondos
  capsula(g, en(lo(-0.02), lat), en(lo(0.10), lat), 0.12, M.pantalon, 1.35, 0.85);
  capsula(g, en(lo(0.12), lat), en(lo(0.30), lat), 0.12, ropa, 1.25, 0.8);
  capsula(g, en(lo(0.30), lat), en(lo(0.47), lat), 0.135, ropa, 1.35, 0.8);
  // Cuello y cabeza (un poco más alta que ancha), con pelo
  capsula(g, en(lo(0.52), lat), en(lo(0.60), lat), 0.045, M.skin);
  const cab = new THREE.Mesh(new THREE.SphereGeometry(0.098, 28, 20), M.skin);
  cab.position.set(o.C[0], o.C[1], lat); cab.scale.set(1.05, 1.12, 0.88); cab.rotation.z = -Math.atan2(d[0], d[1]); cab.castShadow = true; g.add(cab);
  const pelo = new THREE.Mesh(new THREE.SphereGeometry(0.102, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), M.pelo);
  pelo.position.copy(cab.position); pelo.scale.copy(cab.scale); pelo.rotation.z = cab.rotation.z;
  pelo.position.x += atras[0] * 0.008; pelo.position.y += atras[1] * 0.008; g.add(pelo);
  for (const s of [-1, 1]) {
    // Pierna: muslo y pantorrilla, rodilla ya calculada en el plano; pie según dónde apoya
    const zc = lat + s * 0.09, zp = lat + s * (piloto ? 0.11 : 0.10);
    const cad = en(o.H, zc), rod = en(o.K, (zc + zp) / 2), tob = en(o.F, zp);
    capsula(g, cad, rod, 0.068, M.pantalon);
    capsula(g, rod, tob, 0.052, M.pantalon);
    const sx = o.F[0] - o.K[0], sy = o.F[1] - o.K[1], sl = Math.hypot(sx, sy) || 1;
    const pie: V3 = piloto ? [tob[0] - sy / sl * 0.17, tob[1] + sx / sl * 0.17, zp] : [tob[0] + 0.18, tob[1] - 0.02, zp];
    capsula(g, tob, pie, 0.042, M.zapato, 1.1, 0.8);
    // Brazo: hombro, codo hacia fuera y abajo, mano en el puño o sobre el muslo
    const hom = en(lo(0.46), lat + s * 0.19);
    sphere(g, hom, 0.06, ropa);
    const manoP: V3 = [o.mano[0], o.mano[1], lat + s * o.anchoMano];
    const codo = articulacion(hom, manoP, 0.30, 0.28, [0, -1, s * 0.7]);
    capsula(g, hom, codo, 0.046, ropa);
    capsula(g, codo, manoP, 0.038, M.skin);
    sphere(g, manoP, 0.045, M.skin, [1.25, 0.8, 0.95]);
  }
}

/** Faros, pilotos, intermitentes, retrovisores y limpiaparabrisas. */
function accesorios(g: THREE.Object3D, M: Mats, m: Modelo) {
  const sobre = (u: number, th: number, off = 0.004) => m.sec(m.frame(u), th, off);
  const anillo = (u: number, mat: THREE.Material, r: number) => {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 64; j++) pts.push(new THREE.Vector3(...sobre(u, j / 64 * 2 * Math.PI)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, r, 6, true), mat));
  };
  anillo(0.010, M.faro, 0.009);                 // luz diurna alrededor del morro
  for (const th of [0.10 * Math.PI, 0.90 * Math.PI]) {   // faros
    const q = sobre(0.028, th, 0.0);
    const s = sphere(g, q, 0.05, M.faro, [0.45, 0.42, 1.25]); s.lookAt(q[0] + 1, q[1], q[2]);
  }
  // Pilotos traseros: franja roja y tercera luz de freno
  // Pilotos traseros: dos faros con carcasa y luz de posición y freno,
  // y la tercera luz de freno en lo alto de la cola.
  for (const th of [0.12 * Math.PI, 0.88 * Math.PI]) {
    const q = sobre(0.955, th, 0.0), f = m.frame(0.955), n = new THREE.Vector3(-0.6, q[1] - f.zc, q[2]).normalize();
    const caja = sphere(g, q, 0.09, M.carcasa, [0.55, 0.62, 0.3]); caja.lookAt(q[0] + n.x, q[1] + n.y, q[2] + n.z);
    const lente = sphere(g, [q[0] + n.x * 0.02, q[1] + n.y * 0.02, q[2] + n.z * 0.02], 0.078, M.piloto, [0.62, 0.66, 0.28]);
    lente.lookAt(q[0] + n.x * 2, q[1] + n.y * 2, q[2] + n.z * 2);
  }
  const fr = sobre(0.93, Math.PI / 2, 0.006); box(g, fr, [0.02, 0.018, 0.22], M.piloto);
  // Intermitentes: delante a los lados y detrás, ámbar
  for (const [th, mat] of [[0.02 * Math.PI, M.intermitenteI], [0.98 * Math.PI, M.intermitenteD]] as const) {
    sphere(g, sobre(0.06, th, 0.004), 0.022, mat, [1.6, 0.7, 0.6]);
    sphere(g, sobre(0.94, th, 0.004), 0.018, mat, [1.4, 0.7, 0.6]);
  }
  // Retrovisores en la base del parabrisas
  const uR = m.zonasPiel[0].u0 + 0.025;
  for (const s of [1, -1]) {
    const base = sobre(uR, s > 0 ? 0.13 * Math.PI : 0.87 * Math.PI, 0);
    const punta: V3 = [base[0] - 0.02, base[1] + 0.04, base[2] + s * 0.13];
    tube(g, base, punta, 0.016, M.black);
    sphere(g, [punta[0] - 0.02, punta[1] + 0.01, punta[2] + s * 0.03], 0.05, M.body, [1.0, 0.65, 1.15]);
  }
  // Limpiaparabrisas: brazo y escobilla sobre el cristal
  const uL = m.zonasPiel[0].u0 + 0.02;
  const piv = sobre(uL, 0.32 * Math.PI, 0.012);
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k <= 12; k++) pts.push(new THREE.Vector3(...sobre(uL + 0.035 * k / 12, (0.34 + 0.28 * k / 12) * Math.PI, 0.012)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.005, 6), M.black));
  sphere(g, piv, 0.012, M.black);
}

/** Cotas exteriores en el suelo y en vertical, con su número en mm. */
function cotas(g: THREE.Object3D, M: Mats, m: Modelo) {
  const etiqueta = (texto: string, p: V3) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const x = c.getContext('2d')!;
    x.fillStyle = 'rgba(255,255,255,0.92)'; x.strokeStyle = '#0e5e6b'; x.lineWidth = 4;
    x.beginPath(); x.roundRect(4, 14, 504, 100, 20); x.fill(); x.stroke();
    x.fillStyle = '#0b3d45'; x.font = '600 58px "IBM Plex Mono", ui-monospace, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(texto, 256, 66);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    s.position.set(...p); s.scale.set(0.62, 0.155, 1); s.renderOrder = 10; g.add(s);
  };
  const flecha = (p: V3, dir: THREE.Vector3) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 12), M.cotaFlecha);
    c.position.set(...p).addScaledVector(dir, -0.035); c.quaternion.setFromUnitVectors(_up, dir.clone().normalize()); c.renderOrder = 10; g.add(c);
  };
  const linea = (pts: V3[]) => {
    const geo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p)));
    const l = new THREE.LineSegments(geo, M.cota); l.renderOrder = 10; g.add(l);
  };
  const cota = (a: V3, b: V3, ext: [V3, V3][], texto: string, offEtq: V3 = [0, 0.11, 0]) => {
    linea([a, b, ...ext.flat()]);
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    flecha(b, d.clone()); flecha(a, d.clone().negate());
    etiqueta(texto, [(a[0] + b[0]) / 2 + offEtq[0], (a[1] + b[1]) / 2 + offEtq[1], (a[2] + b[2]) / 2 + offEtq[2]]);
  };
  const P = m.P, y = 0.004, zL = -(P.W / 2 + 0.38), zB = -(P.W / 2 + 0.16);
  const mm = (v: number) => `${Math.round(v * 1000).toLocaleString('es-ES')} mm`;
  cota([m.xt, y, zL], [m.xn, y, zL], [[[m.xt, y, 0], [m.xt, y, zL - 0.05]], [[m.xn, y, 0], [m.xn, y, zL - 0.05]]], `largo ${mm(m.Lf)}`, [0.55, 0.11, -0.08]);
  cota([m.xR, y, zB], [0, y, zB], [[[m.xR, y, 0], [m.xR, y, zB - 0.04]], [[0, y, 0], [0, y, zB - 0.04]]], `batalla ${mm(P.B)}`, [-0.35, 0.11, 0.04]);
  const xA = m.xn + 0.40;
  cota([xA, y, -P.W / 2], [xA, y, P.W / 2], [[[m.xn - 0.2, y, -P.W / 2], [xA + 0.05, y, -P.W / 2]], [[m.xn - 0.2, y, P.W / 2], [xA + 0.05, y, P.W / 2]]], `ancho ${mm(P.W)}`, [0.12, 0.1, 0]);
  const xH = m.xt - 0.30;
  cota([xH, 0, zL], [xH, P.H, zL], [[[xH - 0.05, P.H, zL], [m.xn * 0 + m.frame(P.pmax).x, P.H, zL]]], `alto ${mm(P.H)}`, [-0.36, 0, 0]);
  cota([m.xL, y, -P.track / 2], [m.xL, y, P.track / 2], [], `vía ${mm(P.track)}`, [0, 0.11, 0]);
}

/** La parte fija: piel, accesorios, chasis, asientos, ocupantes, baterías. */
function construirFijo(G: Record<CapaId, THREE.Group>, puertasG: Map<string, THREE.Group[]>, M: Mats, m: Modelo) {
  for (const k of ['carenado', 'cristales', 'solar', 'chasis', 'asientos', 'ocupantes', 'baterias'] as CapaId[]) vaciar(G[k]);
  puertasG.clear();
  const capaDe: Record<Piel, CapaId> = { carroceria: 'carenado', cristal: 'cristales', solar: 'solar' };
  const matDe: Record<Piel, THREE.Material> = { carroceria: M.body, cristal: M.glass, solar: M.solar };
  for (const pieza of construirPiel(m)) {
    const mesh = new THREE.Mesh(pieza.geo, matDe[pieza.piel]);
    mesh.castShadow = pieza.piel !== 'cristal'; mesh.receiveShadow = true;
    const capa = G[capaDe[pieza.piel]];
    if (pieza.puerta === 'fijo') { capa.add(mesh); continue; }
    // Cada trozo de puerta cuelga de un pivote en su bisagra
    const def = m.puertas.find(p => p.id === pieza.puerta)!;
    const piv = new THREE.Group(); piv.position.set(...def.bisagra[0]);
    piv.userData = { eje: new THREE.Vector3(...def.bisagra[1]).sub(new THREE.Vector3(...def.bisagra[0])).normalize(), angulo: def.angulo * Math.PI / 180 };
    mesh.position.set(-def.bisagra[0][0], -def.bisagra[0][1], -def.bisagra[0][2]);
    piv.add(mesh); capa.add(piv);
    if (!puertasG.has(pieza.puerta)) puertasG.set(pieza.puerta, []);
    puertasG.get(pieza.puerta)!.push(piv);
  }
  accesorios(G.carenado, M, m);

  const tubos = m.tubosChasis();
  for (const t of tubos) if (t.grupo !== 'Suspensión') {
    const mat = t.grupo === 'Dirección' ? (t.comprado ? M.black : M.alu) : M.alu;
    if (t.curva) tuboCurvo(G.chasis, t.curva, t.d, t.d < 0.01 ? M.black : mat); else tube(G.chasis, t.a, t.b, t.d, mat);
  }
  // Uniones soldadas: donde el extremo de un tubo toca a otro, un cordón
  // (esfera algo mayor que el tubo) en vez de dos cilindros que se cruzan.
  const soldables = tubos.filter(t => t.grupo === 'Chasis');
  const dSeg = (p: V3, a: V3, b: V3) => {
    const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const tt = Math.max(0, Math.min(1, (w[0] * v[0] + w[1] * v[1] + w[2] * v[2]) / (v[0] ** 2 + v[1] ** 2 + v[2] ** 2 || 1)));
    return Math.hypot(w[0] - tt * v[0], w[1] - tt * v[1], w[2] - tt * v[2]);
  };
  for (const t of soldables) for (const p of [t.a, t.b]) {
    const toca = soldables.some(o => o !== t && tramosTubo(o).some(([a, b]) => dSeg(p, a, b) < o.d / 2 + t.d / 2 + 0.004));
    if (toca) sphere(G.chasis, p, t.d / 2 * 1.18, M.soldadura);
  }
  asiento(G.asientos, M, m, true, 0, 0.42);
  asiento(G.asientos, M, m, false, SEAT_GAP, 0.44);
  asiento(G.asientos, M, m, false, -SEAT_GAP, 0.44);
  ocupante(G.ocupantes, M, m, 0, true);
  ocupante(G.ocupantes, M, m, SEAT_GAP, false);
  ocupante(G.ocupantes, M, m, -SEAT_GAP, false);
  const by = m.P.clear + 0.055;
  for (const [x0, z0] of [[m.xPil - 0.05, 0.045], [m.xPil - 0.05, -0.145], [m.xPas, 0.17], [m.xPas, -0.27]]) {
    box(G.baterias, [x0 + 0.185, by, z0 + 0.05], [0.37, 0.08, 0.10], M.batt);
  }
}

/** La parte que se mueve: suspensiones comprimidas, paralelogramo inclinado, ruedas y motor. */
function construirMovil(G: Record<CapaId, THREE.Group>, M: Mats, m: Modelo, coche: THREE.Group, inclinacion: number) {
  const ph = inclinacion * Math.PI / 180, c = m.P.comp, AX = m.AX;
  coche.rotation.x = ph;
  vaciar(G.suspension); vaciar(G.ruedas); vaciar(G.motor);
  const s = G.suspension;
  const fwc: [number, number] = [AX[0] * c * TRAVEL_F, m.rF + AX[1] * c * TRAVEL_F];
  for (const zs of [-1, 1]) {
    const z = zs * 0.07;
    const lo: [number, number] = [fwc[0] + AX[0] * 0.40, fwc[1] + AX[1] * 0.40];
    const stb: [number, number] = [m.crown[0] - AX[0] * (m.A2C - 0.28), m.crown[1] - AX[1] * (m.A2C - 0.28)];
    tube(s, [fwc[0], fwc[1], z], [lo[0], lo[1], z], 0.05, M.susp);
    tube(s, [stb[0], stb[1], z], [m.crown[0], m.crown[1], z], 0.036, M.stanch);
  }
  const arco: [number, number] = [fwc[0] + AX[0] * 0.36, fwc[1] + AX[1] * 0.36];
  tube(s, [arco[0], arco[1], -0.07], [arco[0], arco[1], 0.07], 0.03, M.susp);
  tube(s, [m.crown[0], m.crown[1], -0.09], [m.crown[0], m.crown[1], 0.09], 0.04, M.black);
  tube(s, [fwc[0], fwc[1], -0.085], [fwc[0], fwc[1], 0.085], 0.015, M.black);
  const PIV = m.PIV, ax0: [number, number] = [m.xR, m.rR];
  let th = 0;
  for (let i = 0; i < 6; i++) {
    const p = rot(ax0, PIV, th), err = (m.rR + c * TRAVEL_R) - p[1], dd = (rot(ax0, PIV, th + 1e-4)[1] - p[1]) / 1e-4;
    th += err / dd;
  }
  const rax = rot(ax0, PIV, th), rock = rot([PIV[0], PIV[1] + 0.13], PIV, th);
  for (const zs of [-1, 1]) tube(s, [PIV[0], PIV[1], zs * 0.075], [rax[0], rax[1], zs * 0.075], 0.032, M.susp);
  tube(s, [PIV[0], PIV[1], -0.08], [PIV[0], PIV[1], 0.08], 0.03, M.black);
  tube(s, [PIV[0], PIV[1], 0], [rock[0], rock[1], 0], 0.03, M.susp);
  const fm: [number, number] = [m.xCruceta, m.ys + 0.02], mid: [number, number] = [fm[0] + (rock[0] - fm[0]) * 0.55, fm[1] + (rock[1] - fm[1]) * 0.55];
  tube(s, [fm[0], fm[1], 0], [mid[0], mid[1], 0], 0.055, M.black);
  tube(s, [mid[0], mid[1], 0], [rock[0], rock[1], 0], 0.02, M.stanch);
  const A = m.ARM_A, ca = Math.cos(ph), sa = Math.sin(ph);
  for (const yy of [m.ys, m.ys + ARM_UP]) for (const dx of [-0.03, 0.03]) tube(s, [m.xL + dx, yy - A * sa, -A * ca], [m.xL + dx, yy + A * sa, A * ca], 0.025, M.susp);
  const lw: Record<number, [number, number]> = {};
  for (const zs of [-1, 1]) {
    const z = zs * A * ca, dy = zs * A * sa;
    tube(s, [m.xL, Math.min(m.ys, m.rL) + dy - 0.02, z], [m.xL, m.ys + ARM_UP + dy + 0.02, z], 0.035, M.alu);
    tube(s, [m.xL, m.rL + dy, z], [m.xL, m.rL + dy, z + zs * 0.08], 0.02, M.black);
    lw[zs] = [z + zs * 0.08, dy];
  }
  tube(s, [m.xL, m.ys + ARM_UP + 0.04, 0], [m.xL, m.ys + 0.25 * sa, 0.25 * ca], 0.03, M.black);

  rueda(G.ruedas, M, fwc[0], fwc[1], 0, m.rF);
  rueda(G.ruedas, M, rax[0], rax[1], 0, m.rR);
  for (const zs of [-1, 1]) rueda(G.ruedas, M, m.xL, m.rL + lw[zs][1], lw[zs][0], m.rL);

  const mo = G.motor, BB = m.BB;
  disk(mo, [rax[0], rax[1], 0], 0.095, 0.06, M.motor);
  disk(mo, [BB[0], BB[1], 0], 0.06, 0.08, M.motor);
  for (const zs of [-1, 1]) {
    const a = 0.6 + (zs > 0 ? 0 : Math.PI), pe: [number, number] = [BB[0] + 0.165 * Math.cos(a), BB[1] + 0.165 * Math.sin(a)];
    tube(mo, [BB[0], BB[1], zs * 0.05], [pe[0], pe[1], zs * 0.07], 0.02, M.black);
    tube(mo, [pe[0], pe[1], zs * 0.07], [pe[0], pe[1], zs * 0.16], 0.02, M.black);
  }
  box(mo, [m.xPas + 0.55, m.ys + m.P.spineD / 2000 + 0.025, 0], [0.20, 0.05, 0.07], M.black);
  const cable = new THREE.CatmullRomCurve3(([
    [BB[0], BB[1] - 0.05, 0.05], [BB[0] - 0.25, m.ys + 0.06, 0.05], [m.xPas + 0.55, m.ys + 0.07, 0.04],
    [PIV[0], PIV[1] + 0.05, 0.05], [rax[0] + 0.05, rax[1] + 0.04, 0.05],
  ] as V3[]).map(p => new THREE.Vector3(...p)));
  mo.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 80, 0.006, 6, false), M.motor));
}


/** Un velomóvil de referencia: piel de secciones superelípticas, cabina y ruedas. */
function construirReferencia(g: THREE.Group, M: Mats, r: Referencia, fantasma: boolean) {
  vaciar(g);
  const p = r.perfil, nv = 64, n = p.x.length;
  const pos: number[] = [], idx: number[] = [], col: number[] = [];
  const cabina = r.cabinaX ? [Math.min(...r.cabinaX), Math.max(...r.cabinaX)] : null;
  const colCuerpo = new THREE.Color(fantasma ? 0x14a3b5 : (r.color ?? 0xe4e0d6)), colCab = new THREE.Color(r.cabina === 'cupula' ? 0x22323d : 0x0f1215);
  const lb = !fantasma ? r.librea : undefined;
  const cDel = lb && new THREE.Color(lb.delante), cDet = lb && new THREE.Color(lb.detras), cAb = lb && new THREE.Color(lb.abajo), cRay = lb && new THREE.Color(lb.colorRayas ?? lb.abajo);
  const nA = r.seccion?.arriba ?? r.formaArriba ?? 2.5, nB = r.seccion?.abajo ?? 3.2;
  for (let i = 0; i < n; i++) {
    const zc = (p.top[i] + p.bot[i]) / 2, aT = (p.top[i] - p.bot[i]) / 2;
    for (let j = 0; j <= nv; j++) {
      const th = 2 * Math.PI * j / nv, c = Math.cos(th), sn = Math.sin(th), nn = sn >= 0 ? nA : nB;
      const ez = Math.sign(c) * Math.pow(Math.abs(c), 2 / nn), ey = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / nn);
      const y = zc + aT * ey;
      pos.push(p.x[i], y, p.hw[i] * ez);
      const enCab = !!cabina && p.x[i] <= cabina[1] && p.x[i] >= cabina[0] && sn > Math.sin(0.22 * Math.PI);
      const enClaro = !!r.transparenteX && p.x[i] <= Math.max(...r.transparenteX) && p.x[i] >= Math.min(...r.transparenteX);
      let cc = enCab || enClaro ? colCab : colCuerpo;
      if (lb) {
        const abajo = y < p.bot[i] + (p.top[i] - p.bot[i]) * lb.alturaAbajo;
        const raya = !abajo && !!lb.rayas?.some(([a, b]) => p.x[i] <= Math.max(a, b) && p.x[i] >= Math.min(a, b));
        cc = abajo ? cAb! : raya ? cRay! : p.x[i] > lb.corteX ? cDel! : cDet!;
      }
      col.push(cc.r, cc.g, cc.b);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const mat = fantasma
    // The ghost is drawn over our car (no depth test): when both overlap in the
    // side view, an opaque body would otherwise hide the very thing compared.
    ? new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false, depthTest: false, side: THREE.FrontSide, roughness: 0.4 })
    : new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.2, roughness: 0.35, clearcoat: 1, side: THREE.DoubleSide });
  const piel = new THREE.Mesh(geo, mat); piel.castShadow = !fantasma; if (fantasma) piel.renderOrder = 5; g.add(piel);
  if (fantasma) {
    const encima = (color: number, opacity = 1) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false });
    const bordes = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), encima(0x0e7383, 0.45));
    bordes.renderOrder = 6; g.add(bordes);
    // Contorno lateral y de planta, nítidos, para leer la diferencia de tamaño
    const lado = p.x.map((x, i) => new THREE.Vector3(x, p.top[i], 0)).concat(p.x.map((x, i) => new THREE.Vector3(x, p.bot[i], 0)).reverse());
    const l1 = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(lado), encima(0x0b6270)); l1.renderOrder = 7; g.add(l1);
    const planta = p.x.map((x, i) => new THREE.Vector3(x, 0.006, p.hw[i])).concat(p.x.map((x, i) => new THREE.Vector3(x, 0.006, -p.hw[i])).reverse());
    const l2 = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(planta), encima(0x0b6270)); l2.renderOrder = 7; g.add(l2);
  }
  // Cúpula de cristal aparte, encima del cuerpo (solo la mitad de arriba de la sección).
  if (r.cupula) {
    const cu = r.cupula, nc = 40, cp: number[] = [], ci: number[] = [];
    for (let i = 0; i < cu.x.length; i++) for (let j = 0; j <= nc; j++) {
      const th = Math.PI * j / nc, c = Math.cos(th), sn = Math.sin(th);
      const ez = Math.sign(c) * Math.pow(Math.abs(c), 2 / 2.2), ey = Math.pow(sn, 2 / 2.2);
      cp.push(cu.x[i], cu.base[i] + (cu.top[i] - cu.base[i]) * ey, cu.hw[i] * ez);
    }
    for (let i = 0; i < cu.x.length - 1; i++) for (let j = 0; j < nc; j++) { const a = i * (nc + 1) + j, b = a + nc + 1; ci.push(a, b, a + 1, a + 1, b, b + 1); }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); cg.setIndex(ci); cg.computeVertexNormals();
    const cm = fantasma
      ? new THREE.MeshStandardMaterial({ color: 0x14a3b5, transparent: true, opacity: 0.22, depthWrite: false, depthTest: false, side: THREE.DoubleSide })
      : new THREE.MeshPhysicalMaterial({ color: 0x0e151c, metalness: 0.2, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const cupula = new THREE.Mesh(cg, cm); if (fantasma) cupula.renderOrder = 5; g.add(cupula);
    if (fantasma) {
      const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(cu.x.map((x, i) => new THREE.Vector3(x, cu.top[i], 0)).concat(cu.x.map((x, i) => new THREE.Vector3(x, cu.base[i] + 0.06, 0)).reverse())),
        new THREE.LineBasicMaterial({ color: 0x0b6270, transparent: true, depthTest: false, depthWrite: false }));
      l.renderOrder = 7; g.add(l);
    }
  }
  if (!fantasma) for (const f of r.faros ?? []) {
    const faro = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, f.largo, 4, 8), new THREE.MeshStandardMaterial({ color: 0xdfe9ff, emissive: 0x9fc4ff, emissiveIntensity: 0.6, roughness: 0.2 }));
    faro.position.set(f.x, f.y, f.z); faro.rotation.set(0, Math.sign(f.z) * 0.9, Math.PI / 2 + 0.25); faro.scale.set(1, 1, 0.5); g.add(faro);
  }
  for (const w of r.ruedas) rueda(g, M, w.x, w.d / 2, w.z, w.d / 2);
  g.traverse((o: any) => { if (o.isMesh && o.material?.isMaterial) (o as any).userData.ref = true; });
}

export const Visor3D = forwardRef<VisorHandle, Props>(function Visor3D({ modelo, visibles, rayosX, corte, curva, cotas: verCotas, abierta, vista, referencia = null, modoRef = 'no', alinear = 'eje' }, ref) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const estado = useRef<any>(null);

  useEffect(() => {
    const cv = lienzo.current!;
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.localClippingEnabled = true;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
    const controls = new OrbitControls(camera, cv);
    controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2 - 0.02; controls.minDistance = 1.5; controls.maxDistance = 25;
    const target = new THREE.Vector3(-1.5, 0.55, 0);
    camera.position.set(...VISTAS.iso); controls.target.copy(target);

    const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    const sg = new THREE.SphereGeometry(10, 32, 16), col: number[] = [], pa = sg.attributes.position;
    for (let i = 0; i < pa.count; i++) { const y = pa.getY(i) / 10, v = y > 0 ? 0.55 + 0.45 * y : 0.16; col.push(v, v * 1.01, v * 1.04); }
    sg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    es.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const foco = (w: number, h: number, p: V3, r: V3) => {
      const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4, 4), side: THREE.DoubleSide }));
      q.position.set(...p); q.rotation.set(...r); es.add(q);
    };
    foco(8, 2, [0, 8, 0], [Math.PI / 2, 0, 0]); foco(6, 1.2, [0, 3, -8], [0, 0, 0]); foco(6, 1.2, [8, 3, 0], [0, Math.PI / 2, 0]);
    scene.environment = pm.fromScene(es, 0.03).texture;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f96, 1.4));
    const sol = new THREE.DirectionalLight(0xffffff, 4.8); sol.position.set(3, 7, 4); sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -5, right: 5, top: 4, bottom: -4, near: 1, far: 20 });
    sol.shadow.bias = -0.0004; scene.add(sol);
    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.22 }));
    sombra.rotation.x = -Math.PI / 2; sombra.receiveShadow = true; scene.add(sombra);
    const rejilla = new THREE.GridHelper(16, 32, 0xb9c0c7, 0xdde1e5); rejilla.position.set(-1.5, 0.001, 0); scene.add(rejilla);

    const M = materiales();
    const coche = new THREE.Group(); scene.add(coche);
    const G = {} as Record<CapaId, THREE.Group>;
    for (const c of CAPAS) { G[c.k] = new THREE.Group(); G[c.k].name = c.n; coche.add(G[c.k]); }
    const grupoCotas = new THREE.Group(); grupoCotas.visible = false; scene.add(grupoCotas);
    const grupoRef = new THREE.Group(); grupoRef.visible = false; scene.add(grupoRef);
    const puertasG = new Map<string, THREE.Group[]>();

    const resize = () => {
      const r = cv.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(cv); resize();

    const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ultimo = performance.now(), tc = 0, acc = 0, raf = 0;
    const st = {
      renderer, scene, camera, controls, target, M, G, coche, grupoCotas, grupoRef, puertasG, tween: null as any,
      curva: false, inclinacion: 0, modelo: null as Modelo | null, plano: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      apertura: 0, aperturaObjetivo: 0, colocarPuertas: (() => {}) as () => void,
    };
    estado.current = st;
    const colocarPuertas = () => {
      for (const lista of puertasG.values()) for (const piv of lista) {
        piv.quaternion.setFromAxisAngle(piv.userData.eje, piv.userData.angulo * st.apertura);
      }
    };
    st.colocarPuertas = colocarPuertas;
    const bucle = (ahora: number) => {
      const dt = Math.min(0.05, (ahora - ultimo) / 1000); ultimo = ahora;
      if (st.tween) {
        st.tween.t = Math.min(1, st.tween.t + dt / (reducir ? 0.01 : 0.7));
        const e = 1 - Math.pow(1 - st.tween.t, 3);
        camera.position.lerpVectors(st.tween.from, st.tween.to, e); controls.target.lerpVectors(st.tween.tf, target, e);
        if (st.tween.t >= 1) st.tween = null;
      }
      if (st.apertura !== st.aperturaObjetivo) {
        const paso = reducir ? 1 : dt / 1.1;
        st.apertura = st.aperturaObjetivo > st.apertura ? Math.min(st.aperturaObjetivo, st.apertura + paso) : Math.max(st.aperturaObjetivo, st.apertura - paso);
        colocarPuertas();
      }
      if (st.curva && st.modelo) {
        tc += dt; acc += dt;
        if (acc > 0.045) { acc = 0; st.inclinacion = st.modelo.P.tiltMax * Math.sin(tc * 1.1); construirMovil(G, M, st.modelo, coche, st.inclinacion); }
        // Intermitente del lado hacia el que se inclina, a 1,5 parpadeos por segundo
        const enc = Math.floor(ahora / 333) % 2 === 0;
        M.intermitenteI.emissiveIntensity = st.inclinacion > 2 && enc ? 2.2 : 0.15;
        M.intermitenteD.emissiveIntensity = st.inclinacion < -2 && enc ? 2.2 : 0.15;
      }
      controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(bucle);
    };
    raf = requestAnimationFrame(bucle);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      scene.traverse((o: any) => { o.geometry?.dispose?.(); });
      M.solar.map?.dispose();
      Object.values(M).forEach(m => m.dispose()); pm.dispose(); renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const st = estado.current; if (!st) return;
    st.modelo = modelo;
    construirFijo(st.G, st.puertasG, st.M, modelo);
    construirMovil(st.G, st.M, modelo, st.coche, st.curva ? st.inclinacion : 0);
    vaciar(st.grupoCotas); cotas(st.grupoCotas, st.M, modelo);
    st.colocarPuertas();
  }, [modelo]);

  useEffect(() => { const st = estado.current; if (!st) return; for (const c of CAPAS) st.G[c.k].visible = visibles[c.k]; }, [visibles]);
  useEffect(() => { const st = estado.current; if (st) st.grupoCotas.visible = verCotas && modoRef !== 'sola'; }, [verCotas, modoRef]);

  // El otro velomóvil: se dibuja aparte (no se inclina con el nuestro) y se
  // coloca por el eje delantero, por el morro o al lado.
  useEffect(() => {
    const st = estado.current; if (!st) return;
    const g: THREE.Group = st.grupoRef;
    if (!referencia || modoRef === 'no') { g.visible = false; st.coche.visible = true; return; }
    construirReferencia(g, st.M, referencia, modoRef === 'comparar');
    const morroRef = referencia.perfil.x[0];
    g.position.set(0, 0, 0);
    if (modoRef === 'comparar' && alinear === 'morro') g.position.x = modelo.xn - morroRef;
    if (modoRef === 'comparar' && alinear === 'lado') g.position.z = -(modelo.P.W / 2 + referencia.W / 2 + 0.35);
    g.visible = true;
    st.coche.visible = modoRef !== 'sola';
  }, [referencia, modoRef, alinear, modelo]);
  useEffect(() => { const st = estado.current; if (st) st.aperturaObjetivo = abierta ? 1 : 0; }, [abierta]);

  useEffect(() => {
    const st = estado.current; if (!st) return;
    const { body, glass, solar } = st.M as Mats;
    body.transparent = rayosX; body.opacity = rayosX ? 0.16 : 1; body.depthWrite = !rayosX;
    solar.transparent = rayosX; solar.opacity = rayosX ? 0.25 : 1; solar.depthWrite = !rayosX;
    glass.opacity = rayosX ? 0.18 : 0.55;
    const cp = corte ? [st.plano] : [];
    for (const mt of [body, glass, solar]) { mt.clippingPlanes = cp; mt.needsUpdate = true; }
  }, [rayosX, corte]);

  useEffect(() => {
    const st = estado.current; if (!st) return;
    st.curva = curva;
    if (!curva && st.modelo) {
      st.inclinacion = 0; construirMovil(st.G, st.M, st.modelo, st.coche, 0);
      st.M.intermitenteI.emissiveIntensity = 0.15; st.M.intermitenteD.emissiveIntensity = 0.15;
    }
  }, [curva]);

  useEffect(() => {
    const st = estado.current; if (!st) return;
    st.tween = { from: st.camera.position.clone(), to: new THREE.Vector3(...VISTAS[vista]), tf: st.controls.target.clone(), t: 0 };
  }, [vista]);

  useImperativeHandle(ref, () => ({
    exportarSTL: (capas: CapaId[]) => {
      const st = estado.current;
      const grupo = new THREE.Group();
      // Del visor (m, Y arriba) al CAD (mm, Z arriba): girar +90° en X y escalar ×1000
      grupo.rotation.x = Math.PI / 2; grupo.scale.setScalar(1000);
      st.coche.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(st.coche.matrixWorld).invert();
      for (const k of capas) {
        st.G[k].traverse((o: any) => {
          if (o.isMesh) {
            const c = new THREE.Mesh(o.geometry, o.material);
            // Sin la inclinación de la carrocería: se exporta en reposo
            c.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
            grupo.add(c);
          }
        });
      }
      grupo.updateMatrixWorld(true);
      const datos = new STLExporter().parse(grupo, { binary: true }) as DataView;
      return new Blob([datos.buffer as ArrayBuffer], { type: 'model/stl' });
    },
  }), []);

  return <canvas ref={lienzo} className="absolute inset-0 h-full w-full touch-none" aria-label="Modelo 3D del Aeromóvil Gota" />;
});
