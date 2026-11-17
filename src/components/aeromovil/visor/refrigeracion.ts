// ============================================================================
// THE HOOD, THE AIR INTAKES, THE RADIATOR AND THE COOLANT PIPES IN 3D (2026-11-17, bot «capo»)
// ============================================================================
// Runs after the Triciclo's body is built (`construirTriciclo`), on the body mesh itself:
//  · the hood («capó»): the top of the nose, from just ahead of the canopy frame to just behind the nose's light band,
//    above 62 % of the section's height, becomes its own piece (the same triangles, so closed it looks exactly as
//    before) on a hinge at its back edge. It opens with «Abrir maletero y capó» (the viewer's boot animation:
//    `puertasG` 'maletero'); a thin dark shut line runs round it;
//  · the intakes are REAL OPENINGS: the skin's triangles inside each mouth or gill slot are taken out, a black bezel
//    covers the cut's saw-tooth (the skin's cells are ≈ 1 cm), and a dark duct runs from the opening to the radiator
//    (or 6–12 cm in). You see through the hole: the grille, the radiator, the inside;
//  · the radiator(s) with their tanks and fan, and the two coolant lines (hot red, cold blue) in the «Motor» layer.
// What is drawn is what `triciclo/refrigeracion.ts` decided. Every part carries `userData.componente`
// ('refrigeracion-radiador', 'refrigeracion-tubos', 'refrigeracion-toma') so a click opens the cooling block and
// «mostrar solo» (bot solopiezas) can isolate it.

import * as THREE from 'three';
import type { CapaId } from './capas';
import type { ModeloTriciclo } from '../triciclo/modelo';
import { enContorno, refrigeracionDe, type P2, type Radiador, type V3 } from '../triciclo/refrigeracion';
import { punto, tArriba, type Sec } from '../garaje/balaForma';

/** The hood's opening angle (degrees). */
export const ANGULO_CAPO = 50;

let MATS: Record<string, THREE.Material> | null = null;
const mats = () => MATS ?? (MATS = {
  embellecedor: new THREE.MeshStandardMaterial({ color: 0x8d939a, metalness: 0.7, roughness: 0.32, side: THREE.DoubleSide }),
  conducto: new THREE.MeshStandardMaterial({ color: 0x0b0c0e, metalness: 0, roughness: 0.95, side: THREE.DoubleSide }),
  rejilla: new THREE.MeshStandardMaterial({ color: 0x2a2d31, metalness: 0.5, roughness: 0.4 }),
  panal: new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.75, roughness: 0.38 }),
  deposito: new THREE.MeshStandardMaterial({ color: 0x24272b, metalness: 0.1, roughness: 0.6 }),
  ventilador: new THREE.MeshStandardMaterial({ color: 0x16181b, metalness: 0.2, roughness: 0.55 }),
  caliente: new THREE.MeshStandardMaterial({ color: 0xb3261e, metalness: 0.1, roughness: 0.55 }),
  fria: new THREE.MeshStandardMaterial({ color: 0x19b3c4, metalness: 0.1, roughness: 0.55 }),
  goma: new THREE.MeshStandardMaterial({ color: 0x1a1b1d, metalness: 0, roughness: 0.8, side: THREE.DoubleSide }),
  arbol: new THREE.MeshStandardMaterial({ color: 0xc0c5ca, metalness: 0.9, roughness: 0.25 }),
});

const malla = (g: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, comp: string, nombre: string) => {
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.userData.componente = comp; m.name = nombre; g.add(m); return m;
};

/** A closed outline pushed outward by `d` (2D, along each vertex's mean edge normal). */
function desplazar(c: P2[], d: number): P2[] {
  // (the outline's winding decides which side is out: positive area, counter-clockwise)
  let a = 0; for (let i = 0; i < c.length; i++) { const p = c[i], q = c[(i + 1) % c.length]; a += p[0] * q[1] - q[0] * p[1]; }
  const s = a >= 0 ? 1 : -1;
  return c.map((p, i) => {
    const a0 = c[(i - 1 + c.length) % c.length], b0 = c[(i + 1) % c.length];
    let nx = (b0[1] - a0[1]) * s, ny = -(b0[0] - a0[0]) * s; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    return [p[0] + nx * d, p[1] + ny * d];
  });
}
/** A band between two closed rings of 3D points (same count): quads. */
function banda(a: V3[], b: V3[]): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [], n = a.length;
  for (let i = 0; i < n; i++) pos.push(...a[i], ...b[i]);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; idx.push(2 * i, 2 * j, 2 * i + 1, 2 * j, 2 * j + 1, 2 * i + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/** Fewer points on a dense outline (a ring of ~60 is plenty), keeping its shape. */
const ralo = (c: P2[], n = 64): P2[] => (c.length <= n ? c : Array.from({ length: n }, (_, i) => c[Math.floor(i * c.length / n)]));

/** A polyline with rounded corners (8 cm), as a smooth curve for a hose. */
function manguera(pts: V3[]): THREE.Curve<THREE.Vector3> {
  const v = pts.map(p => new THREE.Vector3(...p)), o: THREE.Vector3[] = [v[0]];
  for (let i = 1; i < v.length - 1; i++) {
    const a = v[i].clone().sub(v[i - 1]), b = v[i + 1].clone().sub(v[i]), r = Math.min(0.08, a.length() / 2.2, b.length() / 2.2);
    o.push(v[i].clone().addScaledVector(a.normalize(), -r), v[i].clone(), v[i].clone().addScaledVector(b.normalize(), r));
  }
  o.push(v[v.length - 1]);
  return new THREE.CatmullRomCurve3(o, false, 'centripetal');
}

/** Take out of the body mesh the triangles `quitar` picks (the openings and the hood's place); keeps its groups. */
function cortarPiel(cuerpo: THREE.Mesh, quitar: (c: THREE.Vector3, n: THREE.Vector3) => boolean): void {
  const geo = cuerpo.geometry as THREE.BufferGeometry, idx = geo.index; if (!idx) return;
  const P = geo.attributes.position as THREE.BufferAttribute, I = idx.array as ArrayLike<number>;
  const grupos = geo.groups.length ? geo.groups : [{ start: 0, count: I.length, materialIndex: 0 }];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), cen = new THREE.Vector3(), n = new THREE.Vector3();
  const resto: number[] = [], gs: { start: number; count: number; mi: number }[] = [];
  const cache = new Map<number, boolean>(); // (the inner pass repeats the same triangles)
  let quitados = 0;
  for (const g of grupos) {
    const r0 = resto.length;
    for (let k = g.start; k < g.start + g.count; k += 3) {
      const u = I[k], v = I[k + 1], w = I[k + 2], clave = u * 1e6 + Math.min(v, w);
      let q = cache.get(clave);
      if (q === undefined) {
        a.fromBufferAttribute(P, u); b.fromBufferAttribute(P, v); c.fromBufferAttribute(P, w);
        cen.copy(a).add(b).add(c).multiplyScalar(1 / 3);
        n.subVectors(b, a).cross(c.clone().sub(a)); const l = n.length(); if (l > 0) n.multiplyScalar(1 / l);
        q = quitar(cen, n); cache.set(clave, q);
      }
      if (!q) resto.push(u, v, w); else quitados++;
    }
    gs.push({ start: r0, count: resto.length - r0, mi: g.materialIndex ?? 0 });
  }
  if (!quitados) return;
  const G = new THREE.BufferGeometry();
  for (const k of Object.keys(geo.attributes)) G.setAttribute(k, geo.attributes[k]);
  G.setIndex(new THREE.BufferAttribute(new Uint32Array(resto), 1));
  for (const g of gs) if (g.count) G.addGroup(g.start, g.count, g.mi);
  cuerpo.geometry = G;
}

/**
 * A strip of skin from the body's own sections: rows x from x1 down to x0, across each section from `t0(x)` over the
 * top (t = 1) to the same t on the left, `fuera` m outside the skin.
 */
function pielXT(F: ModeloTriciclo['F'], x0: number, x1: number, t0: (s: Sec) => number, fuera: number, filas = 48, cols = 24): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [], C = 2 * cols - 1;
  for (let i = 0; i <= filas; i++) {
    const x = x1 + (x0 - x1) * i / filas, s = F.sec(x), ta = t0(s);
    for (let c = 0; c < C; c++) {
      const k = c < cols ? c : C - 1 - c, sg = c < cols ? 1 : -1, t = ta + (1 - ta) * k / (cols - 1);
      const [z, y] = punto(s, t), q0 = punto(s, Math.max(0, t - 0.004)), q1 = punto(s, Math.min(1, t + 0.004));
      let ny = -(q1[0] - q0[0]), nz = q1[1] - q0[1]; const l = Math.hypot(ny, nz) || 1; ny /= l; nz /= l;
      if (k === cols - 1) { ny = 1; nz = 0; }
      pos.push(x, y + ny * fuera, sg * (z + nz * fuera));
    }
  }
  for (let i = 0; i < filas; i++) for (let c = 0; c < C - 1; c++) { const a = i * C + c, b = a + C; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  // (outward: the top centre's normal must point up; otherwise flip the winding)
  const nrm = g.attributes.normal as THREE.BufferAttribute, mid = Math.floor(filas / 2) * C + cols - 1;
  if (nrm.getY(mid) < 0) { for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}

/**
 * The hood, the openings, the radiator and the pipes of this Triciclo. The hood is there on every Triciclo (closed, it
 * draws the same body); the rest only with the hybrid and an intake chosen.
 */
export function dibujarRefrigeracion(G: Record<CapaId, THREE.Group>, puertasG: Map<string, THREE.Group[]>, m: ModeloTriciclo) {
  const M = mats(), F = m.F, r = refrigeracionDe(m);
  const cuerpos: THREE.Mesh[] = []; G.carenado.traverse(o => { if ((o as THREE.Mesh).isMesh && o.name === 'carroceria') cuerpos.push(o as THREE.Mesh); });
  // ── what the skin loses
  const bocas = r?.bocas ?? [], ranuras = r?.ranuras ?? [];
  const quitar = (c: THREE.Vector3, n: THREE.Vector3) => {
    if (bocas.length && n.x > 0.2 && c.x > F.X_MORRO - 0.7) for (const b of bocas) if (enContorno(b.contorno, c.z, c.y)) return true;
    if (ranuras.length && Math.abs(n.z) > 0.3) for (const q of ranuras) if (enContorno(q.contorno, c.x, c.y)) return true;
    return false;
  };
  // ── the hood: from 3 cm ahead of the canopy frame to 1,5 cm behind the nose's light band, the top 38 % of each
  // section. Its place is taken out of the body (a saw-tooth edge, ≈ 1 cm cells) and the hood is drawn again from the
  // body's own sections, 1 mm outside, reaching 1,2 cm lower than the cut: closed, it covers the saw-tooth and looks
  // as before; open, a dark rubber seal on the body follows the cut's smooth line
  const xh0 = m.cup.XF0 + 0.03, xh1 = F.X_ARO_MORRO - 0.015;
  const corte = (x: number) => { const s = F.seccionRapida(x); let lo = Infinity, hi = -Infinity; for (let j = 1; j < s.length; j += 2) { lo = Math.min(lo, s[j]); hi = Math.max(hi, s[j]); } return lo + 0.62 * (hi - lo); };
  const conCapo = xh1 - xh0 >= 0.12 && cuerpos.length > 0;
  const enCapo = (c: THREE.Vector3, n: THREE.Vector3) => conCapo && c.x > xh0 + 0.004 && c.x < xh1 - 0.004 && n.y > -0.1 && c.y > corte(c.x) + 0.004;
  for (const cu of cuerpos) cortarPiel(cu, (c, n) => quitar(c, n) || enCapo(c, n));
  if (conCapo) {
    const cu = cuerpos[0], mm = cu.material as THREE.Material[];
    const geo = pielXT(F, xh0, xh1, s => tArriba(s, corte(s.x) - 0.012), 0.001);
    const nIdx = geo.index!.count; geo.addGroup(0, nIdx, 0); geo.addGroup(0, nIdx, 1);
    const h = new THREE.Mesh(geo, Array.isArray(mm) ? [mm[0], mm[2] ?? mm[0]] : [mm, mm]); h.name = 'capo'; h.castShadow = true; h.receiveShadow = true;
    // its edge: a thin dark line on the hood (the shut line, closed)
    const borde = pielXT(F, xh0, xh1, s => tArriba(s, corte(s.x) - 0.012), 0.0016, 48, 24);
    const ib: number[] = [], C = 47, A = borde.index!.array;
    for (let k = 0; k < A.length; k += 3) {
      // (only the triangles touching the outline: the first or last row, or the outer column on either side)
      const vs = [A[k], A[k + 1], A[k + 2]];
      if (vs.some(v => { const i = Math.floor(v / C), c = v % C; return i === 0 || i === 48 || c === 0 || c === C - 1; }) && vs.every(v => { const i = Math.floor(v / C), c = v % C; return i <= 1 || i >= 47 || c <= 1 || c >= C - 2; })) ib.push(...vs);
    }
    borde.setIndex(ib); const junta = new THREE.Mesh(borde, M.goma); junta.name = 'capo-junta'; h.add(junta);
    // the hinge on the hood's back edge, at the top of the skin there
    const s0 = F.seccionRapida(xh0); let hi = -Infinity; for (let j = 1; j < s0.length; j += 2) hi = Math.max(hi, s0[j]);
    const bisagra = new THREE.Vector3(xh0, hi, 0);
    const piv = new THREE.Group(); piv.name = 'capo-bisagra'; piv.position.copy(bisagra);
    h.position.sub(bisagra); piv.add(h);
    piv.userData = { eje: new THREE.Vector3(0, 0, 1), angulo: ANGULO_CAPO * Math.PI / 180, tipo: 'maletero' };
    (cu.parent ?? G.carenado).add(piv);
    if (!puertasG.has('maletero')) puertasG.set('maletero', []);
    puertasG.get('maletero')!.push(piv);
    // the seal on the body, along the cut on both sides, 2 cm tall round the cut's line (it covers the saw-tooth when the hood is up)
    const pos: number[] = [], idx: number[] = [], N = 60;
    for (const sg of [1, -1]) for (let i = 0; i <= N; i++) {
      const x = xh1 + (xh0 - xh1) * i / N, s = F.sec(x), y = corte(x);
      for (const t of [tArriba(s, y - 0.007), tArriba(s, y + 0.013)]) { const [z, yy] = punto(s, t); pos.push(x, yy + 0.0006, sg * (z + 0.0006)); }
    }
    for (let side = 0; side < 2; side++) for (let i = 0; i < N; i++) { const a = side * (N + 1) * 2 + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const sello = new THREE.BufferGeometry(); sello.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sello.setIndex(idx); sello.computeVertexNormals();
    const sm = new THREE.Mesh(sello, M.goma); sm.name = 'capo-sello'; (cu.parent ?? G.carenado).add(sm);
  }
  // ── 2026-11-17: the engine in the nose: its shaft back to the chain (hibrido.ts `arbol`)
  const arbol = m.phev?.disp.arbol;
  if (arbol) malla(G.motor, new THREE.TubeGeometry(manguera(arbol), 48, 0.02, 12, false), M.arbol, 'hibrido-arbol', 'arbol-transmision');
  if (!r) return;
  // ── the nose mouths: bezel, duct to the radiator, a grille of three bars
  const frente = (z: number, y: number, xPrev: number) => { const x = F.frenteX(z, y); return Number.isFinite(x) ? x : xPrev; };
  for (const b of bocas) {
    const c0 = ralo(b.contorno), fuera = desplazar(c0, 0.012), x0 = F.frenteX(b.c[0], b.c[1]);
    let xp = Number.isFinite(x0) ? x0 : F.X_MORRO;
    const anillo = (c: P2[], dx: number): V3[] => c.map(([z, y]) => { xp = frente(z, y, xp); return [xp + dx, y, z]; });
    const borde = anillo(c0, 0.0025), exterior = anillo(fuera, 0.0025);
    malla(G.carenado, banda(borde, exterior), M.embellecedor, 'refrigeracion-toma', 'toma-embellecedor');
    // the duct: back to the face of the radiator behind it (its outline grows to the core's), or 10 cm in
    const rad = r.radiadores.find(q => Math.abs(q.n[0]) > 0.5 && Math.abs(q.c[2] - b.c[0]) < 0.05);
    const piel = anillo(c0, -0.001), cx = b.c[0], cy = b.c[1];
    const fondo: V3[] = piel.map(([x, y, z]) => {
      if (!rad) return [x - 0.10, y, z];
      const kz = (rad.ancho / 2) / (b.ancho / 2), ky = (rad.alto / 2) / (b.alto / 2);
      return [rad.c[0] + rad.grueso / 2 + 0.004, rad.c[1] + (y - cy) * ky * 0.97, rad.c[2] + (z - cx) * kz * 0.97];
    });
    malla(G.carenado, banda(piel, fondo), M.conducto, 'refrigeracion-toma', 'toma-conducto');
    const xr = (Number.isFinite(x0) ? x0 : F.X_MORRO) - 0.02;
    for (const k of [-1, 0, 1]) {
      const y = cy + k * b.alto * 0.27, bar = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, b.ancho * 0.96), M.rejilla);
      bar.position.set(xr - 0.01, y, cx); bar.userData.componente = 'refrigeracion-toma'; bar.name = 'toma-rejilla'; G.carenado.add(bar);
    }
  }
  // ── the gills: each slot's bezel and duct on the right, mirrored to the left
  if (ranuras.length) {
    const lado = new THREE.Group(); lado.name = 'branquias';
    for (const q of ranuras) {
      const c0 = ralo(q.contorno, 40), fuera = desplazar(c0, 0.008);
      const enPiel = (c: P2[], dz: number): V3[] => c.map(([x, y]) => { const z = F.ladoZ(x, y); return [x, y, (Number.isFinite(z) ? z : 0.3) + dz]; });
      const borde = enPiel(c0, 0.0025), exterior = enPiel(fuera, 0.0025), piel = enPiel(c0, -0.001);
      malla(lado, banda(borde, exterior), M.embellecedor, 'refrigeracion-toma', 'branquia-embellecedor');
      // (in to the radiator's outer face when it is behind them, else 6 cm)
      const rad = r.radiadores.find(k => k.lado === 'der' && Math.abs(k.n[2]) > 0.5);
      const fondo: V3[] = piel.map(([x, y, z]) => [x, y, rad ? Math.min(z - 0.01, rad.c[2] + rad.grueso / 2 + 0.004) : z - 0.06]);
      malla(lado, banda(piel, fondo), M.conducto, 'refrigeracion-toma', 'branquia-conducto');
    }
    G.carenado.add(lado);
    const izq = lado.clone(); izq.scale.z = -1; G.carenado.add(izq);
  }
  // ── the radiator(s): core, side tanks, the fan on the back face
  for (const q of r.radiadores) dibujarRadiador(G.motor, q);
  // ── the coolant: hot from the engine to the top of each core, cold back from its bottom
  const rT = r.tubos.d / 2 + 0.004;
  for (const [lineas, mat, nombre] of [[r.tubos.caliente, M.caliente, 'tubo-refrigerante-caliente'], [r.tubos.fria, M.fria, 'tubo-refrigerante-frio']] as const)
    for (const l of lineas) malla(G.motor, new THREE.TubeGeometry(manguera(l), 64, rT, 10, false), mat, 'refrigeracion-tubos', nombre);
}

function dibujarRadiador(g: THREE.Object3D, q: Radiador) {
  const M = mats(), grupo = new THREE.Group(); grupo.name = 'radiador';
  grupo.position.set(...q.c);
  // (local frame: the core's face looks along +x; turned for a side radiator facing ±z)
  if (Math.abs(q.n[2]) > 0.5) grupo.rotation.y = q.n[2] > 0 ? -Math.PI / 2 : Math.PI / 2;
  malla(grupo, new THREE.BoxGeometry(q.grueso, q.alto, q.ancho * 0.88), M.panal, 'refrigeracion-radiador', 'radiador-panal');
  for (const s of [1, -1]) { const t = malla(grupo, new THREE.BoxGeometry(q.grueso + 0.012, q.alto + 0.01, q.ancho * 0.06), M.deposito, 'refrigeracion-radiador', 'radiador-deposito'); t.position.z = s * q.ancho * 0.47; }
  const rf = Math.min(q.alto, q.ancho) * 0.42, f = malla(grupo, new THREE.CylinderGeometry(rf, rf, 0.03, 32), M.ventilador, 'refrigeracion-radiador', 'radiador-ventilador');
  f.rotation.z = Math.PI / 2; f.position.x = -q.grueso / 2 - 0.02;
  g.add(grupo);
}
