// Basic 3D parts: tubes, spheres, boxes, capsules, springs, plus naming helpers.
// Moved out of Visor3D.tsx unchanged (2026-11-16, refactor «ordenar»). See ../CLAUDE.md for the layout.
import * as THREE from 'three';
import type { V3 } from './capas';

export const _up = new THREE.Vector3(0, 1, 0);
export function tube(g: THREE.Object3D, a: V3, b: V3, d: number, mat: THREE.Material) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), v = B.clone().sub(A), L = v.length();
  if (L < 1e-5) return;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, L, 20, 1), mat);
  m.position.copy(A).addScaledVector(v, 0.5);
  m.quaternion.setFromUnitVectors(_up, v.normalize());
  m.castShadow = true; g.add(m);
}
export function sphere(g: THREE.Object3D, c: V3, r: number, mat: THREE.Material, escala?: V3) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat); m.position.set(...c); if (escala) m.scale.set(...escala); m.castShadow = true; g.add(m); return m;
}
export function box(g: THREE.Object3D, c: V3, s: V3, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...s), mat); m.position.set(...c); m.castShadow = true; g.add(m);
}
export function disk(g: THREE.Object3D, c: V3, r: number, w: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 40), mat); m.rotation.x = Math.PI / 2; m.position.set(...c); m.castShadow = true; g.add(m); return m;
}
export function vaciar(g: THREE.Object3D) {
  while (g.children.length) { const o = g.children.pop()!; o.traverse((c: any) => { c.geometry?.dispose?.(); if (c.isSprite) { c.material.map?.dispose(); c.material.dispose(); } }); }
}
/** Un tubo curvado por sus puntos de paso (la misma curva que mide `largoTubo`). */
export function tuboCurvo(g: THREE.Object3D, pts: V3[], d: number, mat: THREE.Material) {
  const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(c, 48, d / 2, 12, false), mat); mesh.castShadow = true; g.add(mesh);
  for (const p of [pts[0], pts[pts.length - 1]]) sphere(g, p, d / 2, mat);
}

/** Cápsula de `a` a `b` con radio `r`, ensanchada de lado (`ancho`) y aplanada de fondo (`fondo`). */
export function capsula(g: THREE.Object3D, a: V3, b: V3, r: number, mat: THREE.Material, ancho = 1, fondo = 1) {
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

/** Una caja con cantos redondeados (batería, reductora, inversor…). */
export function cajaRedonda(g: THREE.Object3D, c: V3, s: V3, mat: THREE.Material, r = 0.012) {
  const sh = new THREE.Shape();
  const w = s[0], h = s[1];
  sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2);
  sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: s[2], bevelEnabled: true, bevelThickness: r * 0.6, bevelSize: r * 0.6, bevelSegments: 2, curveSegments: 4 });
  geo.translate(0, 0, -s[2] / 2);
  const mesh = new THREE.Mesh(geo, mat); mesh.position.set(...c); mesh.castShadow = true; g.add(mesh); return mesh;
}

/** Muelle helicoidal alrededor de un eje. */
export function muelle(g: THREE.Object3D, a: V3, b: V3, r: number, vueltas: number, mat: THREE.Material) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), eje = B.clone().sub(A), L = eje.length(); eje.normalize();
  let u = new THREE.Vector3(0, 0, 1); u.addScaledVector(eje, -u.dot(eje)); if (u.lengthSq() < 1e-6) u = new THREE.Vector3(1, 0, 0); u.normalize();
  const v = new THREE.Vector3().crossVectors(eje, u);
  const pts: THREE.Vector3[] = [];
  const n = Math.round(vueltas * 16);
  for (let i = 0; i <= n; i++) { const t = i / n, ang = t * vueltas * 2 * Math.PI; pts.push(A.clone().addScaledVector(eje, t * L).addScaledVector(u, r * Math.cos(ang)).addScaledVector(v, r * Math.sin(ang))); }
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.009, 8, false), mat); mesh.castShadow = true; g.add(mesh);
}

/** La misma malla desplazada `d` metros a lo largo de sus normales, con las caras vueltas (para un forro interior). */
export function desplazar(geo: THREE.BufferGeometry, d: number) {
  const g = geo.clone(), p = g.getAttribute('position') as THREE.BufferAttribute, n = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * d, p.getY(i) + n.getY(i) * d, p.getZ(i) + n.getZ(i) * d);
  const idx = g.getIndex(); if (idx) { const a = idx.array as Uint32Array | Uint16Array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } idx.needsUpdate = true; }
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  p.needsUpdate = true; n.needsUpdate = true;
  return g;
}

/** Marca todas las mallas de un grupo con el componente al que pertenecen (para el clic). */
export function etiquetar(g: THREE.Object3D, componente: string) {
  g.traverse((o: any) => { if (o.isMesh && !o.userData.componente) o.userData.componente = componente; });
}

export const _x = new THREE.Vector3(1, 0, 0);
export function ponerBieleta(o: THREE.Object3D, a: V3, b: V3) {
  const A = new THREE.Vector3(...a), v = new THREE.Vector3(...b).sub(A), L = v.length();
  o.position.copy(A).addScaledVector(v, 0.5); o.quaternion.setFromUnitVectors(_up, v.normalize()); o.scale.set(1, Math.max(1e-4, L), 1);
}
