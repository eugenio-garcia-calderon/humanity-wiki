// Seats, the occupant figure and the wheels.
// Moved out of Visor3D.tsx unchanged (2026-11-16, refactor «ordenar»). See ../CLAUDE.md for the layout.
import * as THREE from 'three';
import { TIRE_W, type ModeloConPiel, type PuntosOcupante } from '../geometria';
import type { V3 } from './capas';
import { sombraContacto, perfilNeumatico, type Mats } from './materiales';
import { tube, sphere, capsula, cajaRedonda } from './primitivas';
import type { PuntosConCuerpo, ParteCuerpo } from '../triciclo/ajusteOcupantes';

// 2026-11-17 («muñecos»): a part of the rider that does not fit is painted red (it touches) or amber (closer than its check asks)
let marcas: Record<'roza' | 'justo', THREE.MeshStandardMaterial> | null = null;
const marca = (k: 'roza' | 'justo') => (marcas ??= {
  roza: new THREE.MeshStandardMaterial({ color: 0xe0242c, roughness: 0.55, emissive: 0x5a0000 }),
  justo: new THREE.MeshStandardMaterial({ color: 0xf2a516, roughness: 0.55, emissive: 0x3a2400 }),
})[k];

export function rueda(g: THREE.Object3D, M: Mats, x: number, y: number, z: number, r: number) {
  const w = new THREE.Group(); w.position.set(x, y, z); g.add(w);
  const t = new THREE.Mesh(new THREE.TorusGeometry(r - TIRE_W / 2, TIRE_W / 2, 18, 96), M.tireBici); t.castShadow = true; w.add(t);
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
export function asiento(g: THREE.Object3D, M: Mats, m: ModeloConPiel, piloto: boolean, lat: number, w: number) {
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

/** Codo o rodilla en 3D: dos huesos de `a` a `b`, doblados hacia `polo`. */
export function articulacion(a: V3, b: V3, l1: number, l2: number, polo: V3): V3 {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), ab = B.clone().sub(A);
  const d = Math.min(ab.length(), l1 + l2 - 1e-3), u = ab.clone().normalize();
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const p = new THREE.Vector3(...polo); p.addScaledVector(u, -p.dot(u)).normalize();
  const c = A.clone().addScaledVector(u, x).addScaledVector(p, h);
  return [c.x, c.y, c.z];
}

/** Maniquí articulado: cabeza, cuello, tronco, pelvis, brazos con codos y piernas con pies. */
export function ocupante(g: THREE.Object3D, M: Mats, m: { occPts: (piloto: boolean) => PuntosOcupante }, lat: number, piloto: boolean) {
  const o = m.occPts(piloto) as PuntosConCuerpo, d = o.d;
  // (2026-11-17) the rider's own size: `k` the lengths, `A` the widths, `V` the belly and chest (talla.ts); absent, 1
  const k = o.cuerpo?.k ?? 1, A = (o.cuerpo?.ancho ?? 1) * k, V = o.cuerpo?.fondo ?? 1, choques = o.choques?.();
  const pinta = (p: ParteCuerpo, mat: THREE.Material) => { const c = choques?.get(p); return c ? marca(c) : mat; };
  const ropa = piloto ? M.ropaPiloto : M.ropaPasajero;
  const en = (q: [number, number], l: number): V3 => [q[0], q[1], l];
  const lo = (t: number): [number, number] => [o.H[0] + d[0] * t * k, o.H[1] + d[1] * t * k];
  const atras = [-d[1], d[0]] as [number, number];   // perpendicular al tronco, hacia el respaldo
  // Tronco: pelvis, abdomen y pecho, más anchos que hondos
  // (the build widens the hips and the shoulders, and deepens the belly most and the chest half as much)
  const Vp = 1 + (V - 1) * 0.5;
  capsula(g, en(lo(-0.02), lat), en(lo(0.10), lat), 0.12 * k, pinta('caderas', M.pantalon), 1.35 * A / k, 0.85 * Vp);
  capsula(g, en(lo(0.12), lat), en(lo(0.30), lat), 0.12 * k, pinta('vientre', ropa), 1.25 * A / k, 0.8 * V);
  capsula(g, en(lo(0.30), lat), en(lo(0.47), lat), 0.135 * k, ropa, 1.35 * A / k, 0.8 * Vp);
  // Cuello y cabeza (un poco más alta que ancha), con pelo; la cabeza va más recta que el tronco si el modelo lo dice (`dh`)
  const dh = o.dh ?? d;
  capsula(g, en(lo(0.50), lat), [o.C[0] - dh[0] * 0.08 * k, o.C[1] - dh[1] * 0.08 * k, lat], 0.045 * k, M.skin);
  const cab = new THREE.Mesh(new THREE.SphereGeometry(0.098 * k, 28, 20), pinta('cabeza', M.skin));
  cab.position.set(o.C[0], o.C[1], lat); cab.scale.set(1.05, 1.12, 0.88); cab.rotation.z = -Math.atan2(dh[0], dh[1]); cab.castShadow = true; g.add(cab);
  const pelo = new THREE.Mesh(new THREE.SphereGeometry(0.102 * k, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), pinta('cabeza', M.pelo));
  pelo.position.copy(cab.position); pelo.scale.copy(cab.scale); pelo.rotation.z = cab.rotation.z;
  pelo.position.x += atras[0] * 0.008 * k; pelo.position.y += atras[1] * 0.008 * k; g.add(pelo);
  for (const s of [-1, 1]) {
    // Pierna: muslo y pantorrilla, rodilla ya calculada en el plano; pie según dónde apoya
    const zc = lat + s * (o.anchoPiernas?.[0] ?? 0.09), zp = lat + s * (o.anchoPiernas?.[1] ?? (piloto ? 0.11 : 0.10));
    const ap = o.anchoPiernas, zr = ap && ap.length > 2 ? lat + s * ap[2]! : (zc + zp) / 2;
    const cad = en(o.H, zc), rod = en(o.K, zr), tob = en(o.F, zp);
    capsula(g, cad, rod, 0.068 * A, pinta('rodillas', M.pantalon));
    capsula(g, rod, tob, 0.052 * A, M.pantalon);
    const sx = o.F[0] - o.K[0], sy = o.F[1] - o.K[1], sl = Math.hypot(sx, sy) || 1;
    const pie: V3 = piloto ? [tob[0] - sy / sl * 0.17 * k, tob[1] + sx / sl * 0.17 * k, zp] : [tob[0] + 0.18 * k, tob[1] - 0.02 * k, zp];
    capsula(g, tob, pie, 0.042 * k, pinta('pies', M.zapato), 1.1, 0.8);
    // Brazo: hombro, codo hacia fuera y abajo, mano en el puño o sobre el muslo
    const hom = en(lo(0.46), lat + s * 0.19 * A);
    sphere(g, hom, 0.06 * A, pinta('hombros', ropa));
    const manoP: V3 = [o.mano[0], o.mano[1], lat + s * o.anchoMano];
    const brazo = 0.30 * k, antebrazo = 0.28 * k;
    let codo = articulacion(hom, manoP, brazo, antebrazo, [0, -1, s * 0.7]);
    // (2026-11-15) in a narrow body the elbow bends down instead of out, until it is inside (`codoZ`)
    if (o.codoZ != null) for (const kc of [0.45, 0.2, 0, -0.25]) { if (Math.abs(codo[2]) <= o.codoZ) break; codo = articulacion(hom, manoP, brazo, antebrazo, [0, -1, s * kc]); }
    capsula(g, hom, codo, 0.046 * A, ropa);
    capsula(g, codo, manoP, 0.038 * A, M.skin);
    sphere(g, manoP, 0.045 * k, M.skin, [1.25, 0.8, 0.95]);
  }
}

/**
 * Una rueda de coche (2026-11-06, Eugenio: «las ruedas, a otro nivel, máximo
 * realismo»): neumático torneado con flanco abombado, hombro redondo y el
 * dibujo de la banda en relieve; llanta aerodinámica de disco casi cerrado
 * con cinco ranuras, pestaña pulida, embellecedor central con el logo, cuatro
 * tuercas y la válvula; disco de freno taladrado y pinza con latiguillo.
 * Gira `giro` radianes alrededor de la vertical.
 */
export function ruedaCoche(g: THREE.Object3D, M: Mats, x: number, y: number, z: number, r: number, w: number, disco: number, giro: number) {
  const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = giro; g.add(grp);
  const s = Math.sign(z) || 1, rLlanta = 0.33 / 2;
  const neum = new THREE.Mesh(new THREE.LatheGeometry(perfilNeumatico(r, w, rLlanta), 96), M.tire); neum.rotation.x = Math.PI / 2; neum.castShadow = true; neum.receiveShadow = true; grp.add(neum);
  grp.add(sombraContacto(r, w));
  // Llanta: pestaña pulida (el aro que asoma junto al caucho), cara de disco hundida 12 mm, y el cilindro interior
  const pest = new THREE.Mesh(new THREE.TorusGeometry(rLlanta + 0.004, 0.007, 10, 72), M.rim); pest.position.z = s * (w / 2 - 0.006); grp.add(pest);
  const perfilCara: THREE.Vector2[] = [new THREE.Vector2(rLlanta + 0.004, 0), new THREE.Vector2(rLlanta - 0.004, -0.004), new THREE.Vector2(rLlanta * 0.92, -0.012), new THREE.Vector2(rLlanta * 0.30, -0.016), new THREE.Vector2(rLlanta * 0.22, -0.026), new THREE.Vector2(0.001, -0.026)];
  const cara = new THREE.Mesh(new THREE.LatheGeometry(perfilCara, 72), M.caraLlanta); cara.rotation.x = s > 0 ? -Math.PI / 2 : Math.PI / 2;
  // La textura de la cara es un disco plano (u, v con el centro en 0,5): se proyecta por (x, y) sobre el torno
  { const geo = cara.geometry, p = geo.getAttribute('position') as THREE.BufferAttribute, uv = geo.getAttribute('uv') as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / (2 * (rLlanta + 0.004)), 0.5 + p.getZ(i) / (2 * (rLlanta + 0.004))); uv.needsUpdate = true; }
  cara.position.z = s * (w / 2 - 0.006); grp.add(cara);
  const barril = new THREE.Mesh(new THREE.CylinderGeometry(rLlanta, rLlanta - 0.008, w * 0.86, 72, 1, true), M.rim); barril.rotation.x = Math.PI / 2; grp.add(barril);
  // Embellecedor central con el logo, y cuatro tuercas hexagonales a 50 mm del centro
  const capZ = s * (w / 2 - 0.006 - 0.026);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.036, 0.008, 32), M.black); cap.rotation.x = Math.PI / 2; cap.position.z = capZ + s * 0.002; grp.add(cap);
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.026, 32), M.logo); logo.position.z = capZ + s * 0.0065; logo.rotation.y = s > 0 ? 0 : Math.PI; grp.add(logo);
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, t = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.012, 6), M.tuerca); t.rotation.x = Math.PI / 2; t.position.set(0.052 * Math.cos(a), 0.052 * Math.sin(a), capZ + s * 0.004); grp.add(t); }
  // Válvula en el borde de la llanta
  { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.028, 8), M.black); v.position.set(0, rLlanta * 0.93, s * (w / 2 - 0.006 - 0.004)); v.rotation.x = s * 0.5; v.rotation.z = 0.2; grp.add(v); }
  // Disco de freno taladrado y pinza con latiguillo, por dentro de la llanta
  const d = new THREE.Mesh(new THREE.CylinderGeometry(disco / 2, disco / 2, 0.022, 64), [M.discoFreno, M.discoFreno, M.discoFreno]); d.rotation.x = Math.PI / 2; d.position.z = -s * (w / 2 - 0.045); d.userData.componente = 'frenos'; grp.add(d);
  { const geo = d.geometry, p = geo.getAttribute('position') as THREE.BufferAttribute, uv = geo.getAttribute('uv') as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i)) > 0.01) uv.setXY(i, 0.5 + p.getX(i) / disco, 0.5 + p.getZ(i) / disco); uv.needsUpdate = true; }
  const pinza = cajaRedonda(grp, [-0.02, disco / 2 - 0.03, -s * (w / 2 - 0.045)], [0.075, 0.115, 0.052], M.pinza, 0.012); pinza.userData.componente = 'frenos';
  { const latiguillo = tube(grp, [-0.02, disco / 2 + 0.02, -s * (w / 2 - 0.045)], [-0.08, disco / 2 + 0.08, -s * (w / 2 - 0.02)], 0.008, M.black); if (latiguillo) latiguillo.userData.componente = 'frenos'; }
  return grp;
}
