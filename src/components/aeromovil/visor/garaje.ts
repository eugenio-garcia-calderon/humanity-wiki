// Reference velomobiles and garage cars: build a reference, place door pivots.
// Moved out of Visor3D.tsx unchanged (2026-11-16, refactor «ordenar»). See ../CLAUDE.md for the layout.
import * as THREE from 'three';
import type { Referencia } from '../referencias';
import type { VehiculoGaraje } from '../garaje';
import type { Mats } from './materiales';
import { vaciar } from './primitivas';
import { rueda } from './ocupante';

/**
 * Garage cars with parts that open (2026-11-12, Eugenio: «que se pueda pinchar
 * en él … un botón de abrir puertas y abrir maletero»). The model declares its
 * pivots (`VehiculoGaraje.pivotes`); the viewer turns each one by how open its
 * kind is (0 closed, 1 open), animated like our own car's doors.
 */
export interface AperturaGaraje { p: number; pObj: number; m: number; mObj: number; b: number; bObj: number }
export function colocarPivotesGaraje(obj: THREE.Object3D, def: VehiculoGaraje, a: AperturaGaraje) {
  for (const pv of def.pivotes ?? []) {
    const o = obj.getObjectByName(pv.nombre); if (!o) continue;
    if (!o.userData.ejeGaraje) o.userData.ejeGaraje = new THREE.Vector3(...pv.eje).normalize();
    const f = pv.tipo === 'maletero' ? a.m : a.p;
    o.quaternion.setFromAxisAngle(o.userData.ejeGaraje, pv.angulo * Math.PI / 180 * f);
    // the frame of the opening only shows while it is open (closed, it sits millimetres under the panel)
    if (pv.conHueco) { const h = obj.getObjectByName(pv.conHueco); if (h) h.visible = f > 0; }
  }
  // a tilting car (2026-11-15, the Lumeneo Smera): its model leans its body, wheels and arms itself
  def.bascula?.poner(obj, a.b);
}

/** Un velomóvil de referencia: piel de secciones superelípticas, cabina y ruedas. */
export function construirReferencia(g: THREE.Group, M: Mats, r: Referencia, fantasma: boolean) {
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
