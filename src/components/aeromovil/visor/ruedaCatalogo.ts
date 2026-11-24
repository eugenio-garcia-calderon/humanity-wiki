// A wheel of the catalogue (`ruedas/catalogo.ts`) in 3D (2026-11-17, Eugenio: «permite añadir más tipos de ruedas, por
// ejemplo de motos de todo tipo»): the tyre turned on a lathe with its real section (a motorcycle's round crown, a car's
// flat tread, a bicycle's small round one) on a rim of its kind (wire spokes, cast alloy spokes, a closed disc, or the
// drum of a hub motor laced to the rim), and a brake disc on motorcycle wheels.
// Axle along Z, origin at the axle, like `ruedaCoche` and the Bala's `rueda`.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fichaRueda, type FichaRueda } from '../ruedas/catalogo';
import { perfilNeumatico, sombraContacto, type Mats } from './materiales';

/**
 * A motorcycle tyre's section for the lathe, 17 points from the inner bead to the outer one (indices 5–11 are the tread,
 * as `perfilNeumatico`, so the tyre texture lands the same way): the sidewall bulges out to the full width, and the
 * tread is an arc of a circle of radius about half the section width, wrapping ±68° round the crown — what lets a
 * motorcycle lean on its tyre and what makes it touch the road on a narrow strip when it stands upright.
 */
export function perfilMoto(r: number, w: number, rLlanta: number, anchoLlanta: number): THREE.Vector2[] {
  const Rc = Math.min(w * 0.52, (r - rLlanta) * 0.9), rc = r - Rc, th = 68 * Math.PI / 180, pts: THREE.Vector2[] = [];
  const rBorde = rc + Rc * Math.cos(th), zBorde = Rc * Math.sin(th);
  // the sidewall: from the bead (on the rim's flange) out to the full width at two thirds of its height, then in to the tread's edge
  const pared = (t: number): [number, number] => {
    const rr = rLlanta + 0.004 + (rBorde - rLlanta - 0.004) * t;
    const zz = anchoLlanta / 2 + (w / 2 - anchoLlanta / 2) * Math.sin(Math.PI / 2 * Math.min(1, t * 1.4)) - (w / 2 - zBorde) * Math.max(0, t - 0.72) / 0.28;
    return [rr, zz];
  };
  for (let i = 0; i <= 4; i++) { const [rr, zz] = pared(i / 4); pts.push(new THREE.Vector2(rr, -zz)); }
  for (let i = 0; i <= 6; i++) { const a = -th + 2 * th * i / 6; pts.push(new THREE.Vector2(rc + Rc * Math.cos(a), Rc * Math.sin(a))); }
  for (let i = 4; i >= 0; i--) { const [rr, zz] = pared(i / 4); pts.push(new THREE.Vector2(rr, zz)); }
  return pts;
}

const ejeZ = (m: THREE.Mesh) => { m.rotation.x = Math.PI / 2; return m; };
/** A thin cylinder from a to b, as a geometry (to merge the spokes into one mesh). */
function varilla(a: THREE.Vector3, b: THREE.Vector3, d: number): THREE.BufferGeometry {
  const v = b.clone().sub(a), L = v.length(), g = new THREE.CylinderGeometry(d / 2, d / 2, L, 5, 1);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

/**
 * The wheel `f` with outer radius `r` and width `w` (from the model: they may differ from the sheet by the tyre's
 * squash). `freno`: draw the brake disc (motorcycle wheels). `sombra`: the contact shadow under it.
 */
export function ruedaDeCatalogo(M: Mats, f: FichaRueda, r = f.d / 2, w = f.w, opc: { freno?: boolean; sombra?: boolean; lado?: 1 | -1 } = {}): THREE.Group {
  const g = new THREE.Group(), s = opc.lado ?? 1;
  const rLlanta = Math.min(r - 0.02, f.llantaPulg * 0.0254 / 2 + 0.008);
  const anchoLlanta = f.perfil === 'bici' ? Math.min(w * 0.6, 0.025) : w * (f.perfil === 'moto' ? 0.74 : 0.8);
  // the tyre
  let neum: THREE.Mesh;
  if (f.perfil === 'bici') neum = new THREE.Mesh(new THREE.TorusGeometry(r - w / 2, w / 2, 16, 96), M.tireBici);
  else neum = ejeZ(new THREE.Mesh(new THREE.LatheGeometry(f.perfil === 'moto' ? perfilMoto(r, w, rLlanta, anchoLlanta) : perfilNeumatico(r, w, rLlanta), 96), M.tire));
  neum.name = 'neumatico'; neum.castShadow = true; neum.receiveShadow = true; g.add(neum);
  if (opc.sombra) g.add(sombraContacto(r, w));
  // the rim: barrel and two polished flanges
  const metal = f.llanta === 'radios' || f.llanta === 'buje' ? M.rim : f.grupo === 'Deportiva' || f.grupo === 'Custom' ? M.black : M.rim;
  const barril = ejeZ(new THREE.Mesh(new THREE.CylinderGeometry(rLlanta - 0.003, rLlanta - 0.003, anchoLlanta, 64, 1, true), M.rim)); barril.name = 'llanta'; g.add(barril);
  for (const z of [-1, 1]) { const p = new THREE.Mesh(new THREE.TorusGeometry(rLlanta, 0.004, 8, 64), M.rim); p.position.z = z * anchoLlanta / 2; p.name = 'llanta'; g.add(p); }
  const rCubo = f.llanta === 'buje' ? Math.min(rLlanta * 0.62, 0.125) : 0.045, anchoCubo = f.llanta === 'buje' ? 0.09 : f.perfil === 'bici' ? 0.07 : 0.11;
  // the hub (or the hub motor's drum, with its cooling fins)
  const cubo = ejeZ(new THREE.Mesh(new THREE.CylinderGeometry(rCubo, rCubo, anchoCubo, 40), f.llanta === 'buje' ? M.motor : M.alu)); cubo.name = f.llanta === 'buje' ? 'motor-buje' : 'buje'; g.add(cubo);
  if (f.llanta === 'buje') for (const z of [-1, 1]) { const tapa = ejeZ(new THREE.Mesh(new THREE.CylinderGeometry(rCubo * 0.55, rCubo * 0.55, 0.012, 32), M.black)); tapa.position.z = z * (anchoCubo / 2 + 0.006); g.add(tapa); }
  if (f.llanta === 'radios' || f.llanta === 'buje') {
    // wire spokes, tangentially laced from the hub's two flanges to the rim (36, or 32 on a bicycle wheel)
    const n = f.perfil === 'bici' ? 32 : 36, rRaiz = f.llanta === 'buje' ? rCubo - 0.004 : 0.04, geos: THREE.BufferGeometry[] = [];
    for (let k = 0; k < n; k++) {
      const a = 2 * Math.PI * k / n, lado = k % 2 ? 1 : -1, cruce = (k % 4 < 2 ? 1 : -1) * (f.llanta === 'buje' ? 0.18 : 0.5);
      const A = new THREE.Vector3(rRaiz * Math.cos(a + cruce), rRaiz * Math.sin(a + cruce), lado * (anchoCubo / 2 - 0.008));
      const B = new THREE.Vector3((rLlanta - 0.006) * Math.cos(a), (rLlanta - 0.006) * Math.sin(a), lado * anchoLlanta * 0.12);
      geos.push(varilla(A, B, f.perfil === 'bici' ? 0.002 : 0.0035));
    }
    const radios = new THREE.Mesh(mergeGeometries(geos)!, M.spoke ?? M.rim); radios.name = 'radios'; radios.castShadow = true; g.add(radios);
    geos.forEach(x => x.dispose());
  } else if (f.llanta === 'fundida') {
    // cast alloy: five split spokes (two arms each), from the hub to the rim
    const geos: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 5; k++) for (const d of [-0.11, 0.11]) {
      const a = 2 * Math.PI * k / 5, A = new THREE.Vector3(0.05 * Math.cos(a), 0.05 * Math.sin(a), 0), B = new THREE.Vector3((rLlanta - 0.004) * Math.cos(a + d), (rLlanta - 0.004) * Math.sin(a + d), 0);
      const L = A.distanceTo(B), b = new THREE.BoxGeometry(L, 0.016, 0.028);
      b.rotateZ(Math.atan2(B.y - A.y, B.x - A.x)); b.translate((A.x + B.x) / 2, (A.y + B.y) / 2, 0); geos.push(b);
    }
    const brazos = new THREE.Mesh(mergeGeometries(geos)!, metal); brazos.name = 'llanta'; brazos.castShadow = true; g.add(brazos);
    geos.forEach(x => x.dispose());
  } else {
    // a closed disc (the Fat Boy's solid wheel, an eco car's aero cover, a Vespa's pressed steel)
    for (const z of [-1, 1]) {
      const prof = [new THREE.Vector2(rLlanta, 0), new THREE.Vector2(rLlanta * 0.9, -0.008), new THREE.Vector2(rLlanta * 0.25, -0.016), new THREE.Vector2(0.001, -0.02)];
      const cara = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), metal); cara.rotation.x = z > 0 ? -Math.PI / 2 : Math.PI / 2; cara.position.z = z * anchoLlanta / 2; cara.name = 'llanta'; g.add(cara);
    }
  }
  // the brake disc on the outer side, inside the rim (a motorcycle's: 300 mm on a big rim, 220 mm on a scooter's)
  // (2026-11-24: not only a motorcycle's: a bicycle's 160 mm, a car's or an eco car's 260 mm; and its caliper)
  if (opc.freno && f.llanta !== 'buje') {
    const rd = f.perfil === 'bici' ? Math.min(rLlanta - 0.02, 0.08) : f.perfil === 'moto' ? Math.min(rLlanta - 0.03, f.llantaPulg >= 16 ? 0.15 : 0.11) : Math.min(rLlanta - 0.03, 0.13), zd = s * (anchoCubo / 2 + 0.008), a = 2.2;
    const disco = ejeZ(new THREE.Mesh(new THREE.CylinderGeometry(rd, rd, 0.005, 48), M.discoFreno)); disco.position.z = zd; disco.userData.componente = 'frenos'; disco.name = 'disco-freno'; g.add(disco);
    const pinza = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.07, 0.035), M.pinza); pinza.position.set(rd * 0.9 * Math.cos(a), rd * 0.9 * Math.sin(a), zd); pinza.rotation.z = a - Math.PI / 2; pinza.userData.componente = 'frenos'; pinza.name = 'pinza-freno'; pinza.castShadow = true; g.add(pinza);
  }
  return g;
}

/**
 * Re-dress a wheel group already placed by the body builder (its position, name and `userData`, which the viewer uses
 * to steer and lean it, stay): its children become the catalogue wheel `clave`. Does nothing for a size that is not in
 * the catalogue (those keep the drawing they always had).
 */
export function vestirRueda(grupo: THREE.Object3D, M: Mats, clave: string, r: number, w: number) {
  const f = fichaRueda(clave); if (!f) return;
  for (const c of [...grupo.children]) { grupo.remove(c); c.traverse(o => { if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose(); }); }
  const nueva = ruedaDeCatalogo(M, f, r, w, { freno: true });
  for (const c of [...nueva.children]) grupo.add(c);
}
