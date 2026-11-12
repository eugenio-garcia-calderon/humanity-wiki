/**
 * The garage Aptera's doors and boot (2026-11-12): sweeps each moving panel through its whole opening, every 2 %,
 * and checks it against the fixed body, the pods and wheels, the interior and the other panels. Written by the
 * evaluator bot of that round (its `holgura.mts`), kept here so a change to a hinge can be rerun.
 *
 *   npx tsx scripts/aptera-puertas.ts            (about a minute)
 *
 * For every step: the smallest distance from the panel's vertices to each group (vertices within 8 cm of the hinge
 * line are skipped: they sit on it) and the triangle-triangle crossings, with how far each is from the hinge.
 * Fails when, past the first 5 % of the swing, a panel crosses anything more than 8 cm from its hinge, comes within
 * 1 cm of a pod or a wheel, or goes below 5 cm off the ground. In the closed position and the first steps the
 * panels sit a few millimetres over the skin they were cut from, and a crossing there is not a fault.
 *
 * three-mesh-bvh comes in with @react-three/drei; it is not a direct dependency of the platform.
 */
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { VEHICULO as V } from '../src/components/aeromovil/garaje/aptera';

const g = V.construir();
const piv: Record<string, { def: NonNullable<typeof V.pivotes>[number]; obj: THREE.Object3D }> = {};
for (const p of V.pivotes ?? []) piv[p.nombre] = { def: p, obj: g.getObjectByName(p.nombre)! };
const raices = Object.values(piv).map(p => p.obj);
const bajo = (o: THREE.Object3D, raiz: THREE.Object3D) => { for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q === raiz) return true; return false; };
const grupo = (n: string) => /carenado|neumatico|tapacubos|faldon|brazo|intermitente/.test(n) ? 'carenados y ruedas'
  : /marco/.test(n) ? 'marco' : /asiento|volante|salpicadero|pantalla|suelo|mampara/.test(n) ? 'interior' : 'carroceria';
function abrir(p: number, m: number) {
  for (const k in piv) { const { def, obj } = piv[k]; obj.quaternion.setFromAxisAngle(new THREE.Vector3(...def.eje).normalize(), def.angulo * Math.PI / 180 * (def.tipo === 'maletero' ? m : p)); }
  g.updateMatrixWorld(true);
}
function triangulos(filtro: (o: THREE.Mesh) => boolean): Float32Array {
  const out: number[] = [], v = new THREE.Vector3();
  g.traverse((o: any) => {
    if (!o.isMesh || !filtro(o)) return;
    const pos = o.geometry.attributes.position, idx = o.geometry.index, n = idx ? idx.count : pos.count;
    for (let i = 0; i < n; i++) { v.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(o.matrixWorld); out.push(v.x, v.y, v.z); }
  });
  return new Float32Array(out);
}
const geo = (a: Float32Array) => { const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.BufferAttribute(a, 3)); return r; };
abrir(0, 0);
const fijos: Record<string, MeshBVH> = {};
for (const c of ['carroceria', 'carenados y ruedas', 'marco', 'interior']) {
  const a = triangulos(o => !raices.some(r => bajo(o, r)) && grupo(o.name) === c);
  if (a.length) fijos[c] = new MeshBVH(geo(a));
}
const bisagra: Record<string, { P: THREE.Vector3; A: THREE.Vector3 }> = {};
for (const k in piv) {
  const { def, obj } = piv[k];
  bisagra[k] = { P: new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld), A: new THREE.Vector3(...def.eje).normalize().transformDirection(obj.parent!.matrixWorld) };
}
const aEje = (q: THREE.Vector3, h: { P: THREE.Vector3; A: THREE.Vector3 }) => { const d = q.clone().sub(h.P); return d.sub(h.A.clone().multiplyScalar(d.dot(h.A))).length(); };
let fallos = 0;
function barrer(titulo: string, mueve: string, otros: string[], P: (t: number) => [number, number]) {
  let peorCruce = 0, dondeCruce = '', peorCarenado = Infinity, suelo = Infinity;
  for (let s = 0; s <= 50; s++) {
    const t = s / 50; abrir(...P(t));
    const a = triangulos(o => bajo(o, piv[mueve].obj)), mb = new MeshBVH(geo(a));
    for (let i = 1; i < a.length; i += 3) suelo = Math.min(suelo, a[i]);
    const dianas: Record<string, MeshBVH> = { ...fijos };
    for (const o of otros) dianas[o] = new MeshBVH(geo(triangulos(x => bajo(x, piv[o].obj))));
    for (const [c, bvh] of Object.entries(dianas)) {
      if (c === 'carenados y ruedas') {
        const q = new THREE.Vector3(), r: any = { point: new THREE.Vector3(), distance: 0 };
        for (let i = 0; i < a.length; i += 9) { q.set(a[i], a[i + 1], a[i + 2]); const h = (bvh as any).closestPointToPoint(q, r, 0, peorCarenado); if (h && h.distance < peorCarenado) peorCarenado = h.distance; }
      }
      if (t < 0.05) continue;
      const linea = new THREE.Line3();
      (bvh as any).bvhcast(mb, new THREE.Matrix4(), {
        intersectsTriangles(t1: any, t2: any) {
          if (t1.intersectsTriangle(t2, linea)) {
            const m = linea.getCenter(new THREE.Vector3()), d = aEje(m, bisagra[mueve]);
            if (d > peorCruce) { peorCruce = d; dondeCruce = `${c} al ${Math.round(t * 100)} % en (${m.toArray().map(v => v.toFixed(2)).join(', ')})`; }
          }
          return false;
        },
      });
    }
  }
  const bien = peorCruce <= 0.08 && peorCarenado >= 0.01 && suelo >= 0.05;
  if (!bien) fallos++;
  console.log(`${bien ? 'OK   ' : 'FALLA'} ${titulo}: cruce más lejos de la bisagra ${(peorCruce * 100).toFixed(1)} cm${dondeCruce ? ` (${dondeCruce})` : ''}; a ${(peorCarenado * 100).toFixed(1)} cm de carenados y ruedas; a ${(suelo * 100).toFixed(0)} cm del suelo`);
}
barrer('puerta derecha, portón cerrado', 'puerta-d', ['puerta-i', 'porton'], t => [t, 0]);
barrer('puerta derecha, portón abierto', 'puerta-d', ['puerta-i', 'porton'], t => [t, 1]);
barrer('portón, puertas cerradas', 'porton', ['puerta-d', 'puerta-i'], t => [0, t]);
barrer('portón, puertas abiertas', 'porton', ['puerta-d', 'puerta-i'], t => [1, t]);
console.log(fallos ? `\n${fallos} comprobación(es) fallida(s)` : '\nTodo bien');
process.exitCode = fallos ? 1 : 0;
