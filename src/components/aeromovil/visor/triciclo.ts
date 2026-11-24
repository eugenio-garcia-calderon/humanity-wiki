// Triciclo and Bala family: build, split into layers, lean (Bala) and steer (Triciclo). Every Triciclo 3D change lands here.
// Moved out of Visor3D.tsx unchanged (2026-11-16, refactor «ordenar»). See ../CLAUDE.md for the layout.
import * as THREE from 'three';
import type { ModeloBala, ModeloTriciclo } from '../geometria';
import { anguloFuera, opcionesCabinaTriciclo, poseBascula } from '../geometriaTriciclo';
import { dibujarHibrido } from '../hibrido3d';
import { ANGULO_CUPULA, ANGULO_PORTON, PIVOTES_CUPULA, PIVOTE_PORTON, construirCon as construirBalaCon, crearMateriales as materialesBala } from '../garaje/balaModelo';
import { brazosDe } from '../garaje/balaMedidas';
import { construirInterior } from '../garaje/balaInterior';
import { CAPAS, type CapaId, type V3 } from './capas';
import type { Mats } from './materiales';
import { tube, disk, vaciar, tuboCurvo, cajaRedonda, muelle, _x, ponerBieleta } from './primitivas';
import { ocupante } from './ocupante';
import { vestirRueda } from './ruedaCatalogo';
import { fichaRueda } from '../ruedas/catalogo';
import { dibujarRefrigeracion } from './refrigeracion';
import { dibujarPedales } from './bici';
import { construirBWB } from './bwb';

/** The Triciclo's front wheels and pods turned `angulo` degrees (+ to the left: the left wheel is then the inner one). */
export function girarTriciclo(G: Record<CapaId, THREE.Group>, m: ModeloTriciclo, angulo: number) {
  // a diamond (2026-11-15): only the nose wheel steers (its fork with it); the pods at the sides stay straight
  if (m.rombo) { G.ruedas.traverse(o => { if (o.name === 'rueda-morro' || o.userData.horquilla) o.rotation.y = angulo * Math.PI / 180; }); G.suspension.traverse(o => { if (o.userData.horquilla) o.rotation.y = angulo * Math.PI / 180; }); return; }
  const di = Math.abs(angulo) * Math.PI / 180, dout = di > 1e-6 ? anguloFuera(di, m.batalla, m.via.del) : 0, s = Math.sign(angulo);
  for (const capa of [G.carenado, G.ruedas]) capa.traverse(o => {
    if ((o.name !== 'carenado' && o.name !== 'rueda-direccion') || !o.userData.lado) return;
    // +y turns the nose to −z, the vehicle's left
    o.rotation.y = s * (o.userData.lado * s < 0 ? di : dout);
  });
}

/** The layer each part of the Bala goes to (the 3D model's own names, balaModelo.ts / balaPiezas.ts). */
export const CAPA_BALA: Record<string, CapaId> = {
  ruedas: 'ruedas', cabina: 'asientos', [PIVOTES_CUPULA[1]]: 'cristales', cupula: 'cristales',
  // 2026-11-12: the Aptera doors' and hatch's glass hang from pivots of their own (balaModelo.ts `pielConPuertas`)
  'puerta-der-cristal': 'cristales', 'puerta-izq-cristal': 'cristales', [`${PIVOTE_PORTON}-cristal`]: 'cristales',
  // round 3: the passengers' doors' glass
  'puerta-tras-der-cristal': 'cristales', 'puerta-tras-izq-cristal': 'cristales',
};
/**
 * The Cuadriciclo Bala en rombo: the garage model's builder with this design's shape
 * (garaje/balaModelo.ts), its own materials (`Mb`, so «Rayos X» and «Corte»
 * never touch the garage's Bala), split into the viewer's layers: body, pods,
 * lamps and fin in «Carrocería»; the canopy glass in «Cristales»; the pod arms
 * in «Suspensión»; the wheels; the cockpit in «Asientos» (its frame beam in
 * «Chasis»); the riders in «Ocupantes». The canopy's frame and glass hang from
 * two pivots on its front hinge, registered as one door ('cupula').
 * 'rapida' while a slider is being dragged (see the effect that calls it).
 */
export function construirBala(G: Record<CapaId, THREE.Group>, puertasG: Map<string, THREE.Group[]>, M: Mats, Mb: ReturnType<typeof materialesBala>, m: ModeloBala, calidad: 'completa' | 'rapida', sinPasajero: boolean) {
  for (const c of CAPAS) vaciar(G[c.k]);
  puertasG.clear();
  const b = construirBalaCon(m.F, { M: Mb, calidad, cupulaAparte: true, asientos: m.sillines, aleta: m.aleta });
  repartirBala(G, puertasG, b);
  if (calidad === 'completa') for (const piloto of [true, false]) { if (sinPasajero && !piloto) continue; ocupante(G.ocupantes, M, m, 0, piloto); }
  // as the garage does with its cars (glass and lenses keep their no-shadow depth material)
  for (const c of CAPAS) G[c.k].traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
}
/** The Bala builder's parts into the viewer's layers (the Cuadriciclo en rombo's and the Triciclo's). */
export function repartirBala(G: Record<CapaId, THREE.Group>, puertasG: Map<string, THREE.Group[]>, b: THREE.Group) {
  for (const o of [...b.children]) {
    let capa: CapaId = CAPA_BALA[o.name] ?? 'carenado';
    if (o.name === 'carenados' || o.name === 'carenados-traseros') {
      // the arms are suspension, the pods body
      for (const brazo of o.children.filter(c => c.name === 'brazo')) G.suspension.add(brazo);
      capa = 'carenado';
    }
    if (o.name === 'cabina') { const viga = o.getObjectByName('chasis'); if (viga) G.chasis.add(viga); }
    if ((PIVOTES_CUPULA as readonly string[]).includes(o.name)) {
      o.userData = { eje: new THREE.Vector3(0, 0, 1), angulo: ANGULO_CUPULA * Math.PI / 180, tipo: 'puerta' };
      if (!puertasG.has('cupula')) puertasG.set('cupula', []);
      puertasG.get('cupula')!.push(o as THREE.Group);
    }
    // the Triciclo's boot lid (round three): a boot, so «Abrir maletero» opens it (as the Aeromóvil 1's boots)
    if (o.name === PIVOTE_PORTON && !o.userData.eje) o.userData = { eje: new THREE.Vector3(0, 0, 1), angulo: ANGULO_PORTON * Math.PI / 180, tipo: 'maletero' };
    // 2026-11-12: the Aptera doors and hatch come with their own axis and angle (balaModelo.ts `pivote`)
    if (o.userData.eje && (o.name === PIVOTE_PORTON || o.name.startsWith(`${PIVOTE_PORTON}-`) || o.name.startsWith('puerta-'))) {
      const k = o.userData.tipo === 'maletero' ? 'maletero' : 'puertas';
      if (!puertasG.has(k)) puertasG.set(k, []);
      puertasG.get(k)!.push(o as THREE.Group);
    }
    G[capa].add(o);
  }
}

// ── The «Cuadriciclo Bala clásico» leaning (2026-11-15, Eugenio: «haz que pueda bascular», on his «Smeraptera»)
/** A pod's own parts (upright, hub motor) in a layer: one group per corner, which leaning moves with its pod. */
export function esquinaB(capa: THREE.Object3D, eje: 'del' | 'tras', s: 1 | -1): THREE.Group {
  const k = `${eje}${s}`;
  let g = capa.children.find(o => o.userData.esquinaB === k) as THREE.Group | undefined;
  if (!g) { g = new THREE.Group(); g.userData.esquinaB = k; g.userData.eje = eje; g.userData.s = s; capa.add(g); }
  return g;
}
/**
 * The «Cuadriciclo Bala clásico» leaning `phi` (rad, + to the right) when its design leans (`m.bascula`): the whole car
 * turns about the road under its centre line; against the body each pod (with its wheel, upright and motor) moves up or
 * down and a little in, staying parallel to it, and each arm turns about its inner end (geometriaTriciclo.ts `poseBascula`).
 */
export function inclinarBala(G: Record<CapaId, THREE.Group>, m: ModeloTriciclo, coche: THREE.Group, phi: number) {
  const b = m.bascula; coche.rotation.x = b ? phi : 0; if (!b) return;
  // (a diamond, 2026-11-15, has one axle on arms, the lateral one: the pods the builder calls the front ones)
  const ejes = { del: b.ejes[0], tras: b.ejes.find(q => q.eje === 'tras') ?? b.ejes[0] };
  const pose = { del: poseBascula(ejes.del, phi), tras: poseBascula(ejes.tras, phi) };
  const mover = (o: THREE.Object3D, eje: 'del' | 'tras', s: number) => {
    const u = o.userData; if (!u.baseB) u.baseB = o.position.clone();
    const p = pose[eje]; o.position.set(u.baseB.x, u.baseB.y + s * p.dy, u.baseB.z - s * p.dIn);
  };
  const lado = (o: THREE.Object3D) => (o.userData.baseB?.z ?? o.position.z) >= 0 ? 1 : -1;
  G.carenado.traverse(o => { if (o.name === 'carenado' && o.userData.lado) mover(o, 'del', o.userData.lado); else if (o.name === 'carenado-trasero') mover(o, 'tras', lado(o)); });
  G.ruedas.traverse(o => { if (o.name === 'rueda-direccion') mover(o, 'del', o.userData.lado ?? lado(o)); else if (o.name === 'rueda-trasera' && m.traseras) mover(o, 'tras', lado(o)); });
  for (const capa of [G.suspension, G.motor]) for (const o of capa.children) if (o.userData.esquinaB) mover(o, o.userData.eje, o.userData.s);
  // each arm about its inner end, by as much as moves its outer end with the pod
  const girar = (o: THREE.Object3D, eje: 'del' | 'tras', s: number, i: number) => {
    const q = ejes[eje], a = q.brazos[i] ?? q.brazos[0]; if (!a) return;
    const t = -Math.asin(Math.max(-1, Math.min(1, q.Lk * Math.sin(pose[eje].beta) / a.Lk)));
    const piv = new THREE.Vector3(a.x, a.yCuerpo, s * a.zp);
    o.quaternion.setFromAxisAngle(_x, t); o.position.copy(piv).sub(piv.clone().applyQuaternion(o.quaternion));
  };
  for (const o of G.suspension.children) {
    if (o.userData.brazoB) { const u = o.userData.brazoB; girar(o, u.eje, u.s, u.i); continue; }
    if (o.name !== 'brazo') continue;
    // which arm this is (once): its axle and arm by the nearest inner end, its side by z
    if (!o.userData.cualB) {
      const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()); let mejor = { eje: 'del' as 'del' | 'tras', i: 0, d: Infinity };
      for (const eje of ['del', 'tras'] as const) ejes[eje].brazos.forEach((a, i) => { const d = Math.abs(c.x - a.x) + Math.abs(c.y - a.yCuerpo) * 0.5; if (d < mejor.d) mejor = { eje, i, d }; });
      o.userData.cualB = { eje: mejor.eje, i: mejor.i, s: c.z >= 0 ? 1 : -1 };
    }
    const u = o.userData.cualB; girar(o, u.eje, u.s, u.i);
  }
  // the tilt system (2026-11-16): each rocker turns as its arms do; its rods and cylinders follow its ends and the arms
  const rotX = (p: V3, c: V3, t: number): V3 => { const dy = p[1] - c[1], dz = p[2] - c[2]; return [p[0], c[1] + dy * Math.cos(t) - dz * Math.sin(t), c[2] + dy * Math.sin(t) + dz * Math.cos(t)]; };
  for (const o of G.suspension.children) {
    const u = o.userData;
    if (u.balancinB) { const t = -pose[u.balancinB.eje as 'del' | 'tras'].beta, c = u.balancinB.c as V3; o.quaternion.setFromAxisAngle(_x, t); const piv = new THREE.Vector3(...c); o.position.copy(piv).sub(piv.clone().applyQuaternion(o.quaternion)); }
    else if (u.bieletaBalB) { const v = u.bieletaBalB, t = -pose[v.eje as 'del' | 'tras'].beta; ponerBieleta(o, rotX([v.c[0], v.c[1], v.s * v.r], v.c, t), rotX([v.p[0], v.p[1], v.s * (Math.abs(v.p[2]) + v.r)], v.p, t)); }
    else if (u.cilindroB) { const v = u.cilindroB, t = -pose[v.eje as 'del' | 'tras'].beta; ponerBieleta(o, v.ancla, rotX([v.c[0], v.c[1], v.s * v.r], v.c, t)); }
  }
  // the tie rods: from the rack (on the body) to the front uprights' arms (with the pods)
  for (const o of G.direccion.children) if (o.userData.bieletaB) {
    const u = o.userData.bieletaB, p = pose.del;
    ponerBieleta(o, u.a, [u.b[0], u.b[1] + u.s * p.dy, u.b[2] - u.s * p.dIn]);
  }
}

/**
 * The Triciclo Bala (2026-11-10): the Cuadriciclo en rombo's builder with three wheels and the reclining
 * cockpit, split into layers as the Bala; and what only the Triciclo has, from its model: the tube
 * frame («Chasis»), the battery modules, the hub motor and its controller, the swing arm and the
 * front uprights («Suspensión»), the rack, column and tie rods («Dirección»).
 */
export function construirTriciclo(G: Record<CapaId, THREE.Group>, puertasG: Map<string, THREE.Group[]>, M: Mats, Mb: ReturnType<typeof materialesBala>, m: ModeloTriciclo, calidad: 'completa' | 'rapida', sinPasajero: boolean) {
  for (const c of CAPAS) vaciar(G[c.k]);
  puertasG.clear();
  const b = construirBalaCon(m.F, { M: Mb, calidad, cupulaAparte: true, asientos: m.sillines, aleta: m.aleta, triciclo: opcionesCabinaTriciclo(m) });
  repartirBala(G, puertasG, b);
  // 2026-11-17: the blended-wing-body fairing (triciclo/bwb.ts), in the body's paint
  if (m.bwb) G.carenado.add(construirBWB(m.bwb, Mb.chapa, Mb.junta));
  for (const t of m.tubos) { if (t.curva) tuboCurvo(G.chasis, t.curva, t.d, M.alu); else tube(G.chasis, t.a, t.b, t.d, M.alu); }
  for (const c of m.baterias) cajaRedonda(G.baterias, [(c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2, 0], [c.x1 - c.x0, c.y1 - c.y0, 2 * c.hz], M.batt, 0.015);
  // (2026-11-17: the controller and the hub motors carry a `componente`, so «Mostrar solo esta pieza» finds them: piezasMotor.ts)
  const iv = m.inversor; cajaRedonda(G.motor, [(iv.x0 + iv.x1) / 2, (iv.y0 + iv.y1) / 2, 0], [iv.x1 - iv.x0, iv.y1 - iv.y0, 2 * iv.hz], M.black, 0.01).userData.componente = 'controlador';
  // 2026-11-16: the plug-in hybrid's engine, its connection to the wheels, tank and exhaust (hibrido3d.ts)
  if (m.phev) dibujarHibrido(G.motor, m.phev.disp);
  // 2026-11-24: the driver's chainless pedals and their generator (visor/bici.ts)
  if (m.pedalesBici) dibujarPedales(G.motor, m.pedalesBici, M);
  const Ft = m.traseras;
  if (Ft) {
    // four wheels (2026-11-11): a hub motor in each rear wheel, and in each rear pod an upright on the wheel's inner
    // side, held by the pod's two faired arms (drawn with the pods): a simple arm, as in front, that does not steer
    const zInT = Ft.VIA_LAT / 2 - Ft.ANCHO_NEU_LAT / 2 - 0.025, [arT, abT] = brazosDe(Ft);
    for (const s of [1, -1] as const) {
      // (2026-11-17: no hub motor when the traction motor is MG2 on the planetary, drawn by hibrido3d.ts)
      if (m.motor.tipo === 'buje') disk(esquinaB(G.motor, 'tras', s), [m.motor.c[0], m.motor.c[1], s * Ft.VIA_LAT / 2], m.motor.r, m.motor.ancho, M.motor).userData.componente = 'motor-electrico';
      tube(esquinaB(G.suspension, 'tras', s), [m.xR, abT.y - 0.02, s * zInT], [m.xR, arT.y + 0.03, s * zInT], 0.03, M.alu);
    }
  } else {
  if (m.motor.tipo === 'buje') disk(G.motor, [m.motor.c[0], m.motor.c[1], 0], m.motor.r, m.motor.ancho, M.motor).userData.componente = 'motor-electrico';
  // rear: the swing arm's two legs round the tyre, its pivot tube and the mono-shock
  const [px, py] = m.basculante.pivote, [ex, ey] = m.basculante.eje, zb = m.basculante.z;
  for (const s of [1, -1]) tube(G.suspension, [px, py, s * zb], [ex, ey, s * zb], 0.032, M.susp);
  tube(G.suspension, [px, py, -zb - 0.02], [px, py, zb + 0.02], 0.036, M.black);
  const [ax, ay] = m.amortiguador.abajo, [bx, by] = m.amortiguador.arriba;
  tube(G.suspension, [ax, ay, 0], [bx, by, 0], 0.03, M.stanch);
  muelle(G.suspension, [ax + (bx - ax) * 0.2, ay + (by - ay) * 0.2, 0], [ax + (bx - ax) * 0.85, ay + (by - ay) * 0.85, 0], 0.035, 6, M.muelle);
  tube(G.suspension, [ax, ay, -zb], [ax, ay, zb], 0.02, M.susp);
  }
  // front: in each pod, the upright on the wheel's inner side; the coil-over lies along the upper arm, inside its
  // fairing (pushed by the upright, held at the body), so nothing but the faired arms stands in the air
  const zIn = m.via.del / 2 - m.F.ANCHO_NEU_LAT / 2 - 0.025, [arriba, abajo] = m.brazos;
  for (const s of [1, -1] as const) {
    tube(esquinaB(G.suspension, 'del', s), [m.xF, abajo.y - 0.02, s * zIn], [m.xF, arriba.y + 0.03, s * zIn], 0.03, M.alu);
    // (a lifted Triciclo's arm runs down from the body, at `yCuerpo`, to the pod: the coil-over follows it)
    const z0 = m.F.ladoZ(m.xF + arriba.x, arriba.yCuerpo);
    if (Number.isFinite(z0)) {
      const yEn = (z: number) => arriba.y + (arriba.yCuerpo - arriba.y) * (zIn - z) / Math.max(1e-6, zIn - z0) - 0.002;
      const a: V3 = [m.xF + arriba.x - 0.02, yEn(zIn - 0.04), s * (zIn - 0.04)], c: V3 = [m.xF + arriba.x - 0.02, yEn(z0 + 0.03), s * (z0 + 0.03)];
      // (it lies along the upper arm: leaning, it turns with it, 2026-11-15)
      const conBrazo = new THREE.Group(); conBrazo.userData.brazoB = { eje: 'del', s, i: 0 }; G.suspension.add(conBrazo);
      tube(conBrazo, a, c, 0.012, M.stanch); muelle(conBrazo, [a[0], yEn(zIn - 0.06), s * (zIn - 0.06)], [c[0], yEn(z0 + 0.12), s * (z0 + 0.12)], 0.013, 9, M.muelle);
    }
  }
  // steering: the rack across, the column up to the steering head, the tie rods out to the uprights' arms
  const k = m.cremallera;
  if (m.rombo) {
    // a diamond (2026-11-15): no rack to the pods; the nose wheel turns on a fork, its crown joined to the steering column
    const yAx = m.rR - 0.006, zf = m.F.ANCHO_NEU / 2 + 0.025, yC = 2 * m.rR + 0.06, horq = new THREE.Group(); horq.userData.horquilla = true; G.suspension.add(horq);
    for (const s of [1, -1]) tube(horq, [0, yAx, s * zf], [-0.05, yC, s * zf], 0.026, M.alu);
    tube(horq, [-0.05, yC, -zf - 0.015], [-0.05, yC, zf + 0.015], 0.03, M.alu);
    tube(G.direccion, [-0.05, yC, 0], m.cabezaDireccion, 0.026, M.alu);
  } else {
  tube(G.direccion, [k.x, k.y, -k.z], [k.x, k.y, k.z], 0.035, M.black);
  tube(G.direccion, [k.x, k.y, 0], m.cabezaDireccion, 0.026, M.alu);
  }
  if (!m.rombo) for (const s of [1, -1] as const) {
    // (a unit rod, stretched between its ends: leaning, the upright's end moves with the pod, 2026-11-15)
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 12), M.alu); b.castShadow = true;
    b.userData.bieletaB = { a: [k.x, k.y, s * k.z] as V3, b: [m.xF - 0.07, arriba.y + 0.02, s * zIn] as V3, s };
    ponerBieleta(b, b.userData.bieletaB.a, b.userData.bieletaB.b); G.direccion.add(b);
  }
  // the tilt system (2026-11-16, basculacion.ts): on each axle on arms a rocker on the centre line, its two push rods to
  // the upper arms (a second parallelogram), and what turns or holds it; the control unit and its sensors
  if (m.bascula) {
    const r = m.bascula.brazo, tec = m.bascula.tec;
    for (const q of m.bascula.ejes) {
      const a = q.brazos[0]; if (!a) continue;
      const C: V3 = [a.x, a.yCuerpo - 0.12, 0], eje = q.eje === 'tras' ? 'tras' : 'del';
      const bal = new THREE.Group(); bal.userData.balancinB = { eje, c: C }; bal.userData.componente = 'basculacion'; G.suspension.add(bal);
      cajaRedonda(bal, C, [0.035, 0.045, 2 * r + 0.05], M.alu, 0.012).userData.componente = 'basculacion';
      tube(bal, [C[0] + 0.05, C[1], 0], [C[0] - 0.08, C[1], 0], 0.03, M.stanch);
      if (tec === 'libre') { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.006, 40), M.discoFreno); d.rotation.z = Math.PI / 2; d.position.set(C[0] - 0.06, C[1], 0); d.userData.componente = 'basculacion'; bal.add(d); }
      for (const s of [1, -1] as const) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 12), M.alu); b.castShadow = true; b.userData.componente = 'basculacion';
        b.userData.bieletaBalB = { eje, s, c: C, p: [a.x, a.yCuerpo, s * a.zp] as V3, r, rIdx: 0 };
        ponerBieleta(b, [C[0], C[1], s * r], [a.x, a.yCuerpo, s * (a.zp + r)]); G.suspension.add(b);
        if (tec === 'hidraulica') {
          const ci = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 16), M.stanch); ci.castShadow = true; ci.userData.componente = 'basculacion';
          ci.userData.cilindroB = { eje, s, c: C, r, ancla: [C[0], C[1] - 0.26, s * r * 1.05] as V3 };
          ponerBieleta(ci, ci.userData.cilindroB.ancla, [C[0], C[1], s * r]); G.suspension.add(ci);
        }
      }
      if (tec === 'electrica') {
        // the motor and its planetary-and-worm gearbox, on the rocker's shaft, behind it (fixed to the body)
        cajaRedonda(G.suspension, [C[0] - 0.11, C[1], 0], [0.08, 0.11, 0.11], M.carcasa, 0.012).userData.componente = 'basculacion';
        const mo = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 28), M.motor); mo.rotation.z = Math.PI / 2; mo.position.set(C[0] - 0.22, C[1], 0); mo.userData.componente = 'basculacion'; G.suspension.add(mo);
      } else if (tec === 'libre') {
        cajaRedonda(G.suspension, [C[0] - 0.06, C[1] + 0.085, 0], [0.05, 0.04, 0.07], M.pinza, 0.008).userData.componente = 'basculacion';
        const am = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.07, 24), M.carcasa); am.rotation.z = Math.PI / 2; am.position.set(C[0] - 0.13, C[1], 0); am.userData.componente = 'basculacion'; G.suspension.add(am);
      } else {
        // the hydraulic unit (pump, valves, accumulator) once, behind the first rocker
        if (q === m.bascula.ejes[0]) { cajaRedonda(G.suspension, [C[0] - 0.35, C[1] - 0.12, 0], [0.18, 0.12, 0.14], M.carcasa, 0.015).userData.componente = 'basculacion'; const ac = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 20), M.stanch); ac.position.set(C[0] - 0.35, C[1] + 0.0, 0.1); ac.userData.componente = 'basculacion'; G.suspension.add(ac); }
      }
    }
    // the control unit and the inertial sensor, low on the centre line
    const q0 = m.bascula.ejes[0].brazos[0];
    if (q0) { cajaRedonda(G.suspension, [q0.x - 0.5, q0.yCuerpo - 0.16, 0], [0.12, 0.035, 0.09], M.carcasa, 0.008).userData.componente = 'basculacion'; cajaRedonda(G.suspension, [q0.x - 0.5, q0.yCuerpo - 0.13, 0.08], [0.04, 0.02, 0.04], M.black, 0.004).userData.componente = 'basculacion'; }
  }
  // everyone on board (round three: up to four, each at their own z; a folded row carries nobody)
  if (calidad === 'completa') for (const q of m.plazas) { if (sinPasajero && !q.piloto) continue; ocupante(G.ocupantes, M, { occPts: () => q.pts }, q.z, q.piloto); }
  // 2026-11-16 (Eugenio, after the Vision Jet's cabin): the interior finish, garaje/balaInterior.ts; nothing with the defaults
  {
    const piv = new Map<string, THREE.Object3D>(); for (const o of puertasG.get('puertas') ?? []) piv.set(o.name, o);
    const gi = construirInterior(m.F, m.interior, Mb, G.asientos.getObjectByName('cabina') ?? null, piv, m.plazas.map(q => ({ pts: q.pts, z: q.z, piloto: q.piloto, vacia: sinPasajero && !q.piloto })));
    if (gi.children.length) G.asientos.add(gi);
  }
  // 2026-11-17: a wheel from the catalogue (motorcycle, eco, velomobile) is drawn with its own section and rim; the pods'
  // wheels are `tRuedaDel` (the front ones, or the side ones in a diamond), the rest `tRuedaTras`. Old sizes: unchanged
  vestirRuedasTriciclo(G.ruedas, M, m);
  // 2026-11-17 (capo): the hood that opens, the intakes cut in the skin, the radiator and the coolant pipes
  dibujarRefrigeracion(G, puertasG, m);
  for (const c of CAPAS) G[c.k].traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
}
function vestirRuedasTriciclo(capa: THREE.Object3D, M: Mats, m: ModeloTriciclo) {
  const grupos: THREE.Object3D[] = []; capa.traverse(o => { if (o.name === 'rueda-direccion' || o.name === 'rueda-trasera' || o.name === 'rueda-morro') grupos.push(o); });
  for (const o of grupos) {
    const clave = o.name === 'rueda-direccion' ? m.campos.tRuedaDel : m.campos.tRuedaTras, f = fichaRueda(clave);
    if (f) vestirRueda(o, M, clave, f.d / 2, f.w);
  }
}
