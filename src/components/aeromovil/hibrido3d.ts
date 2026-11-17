// ============================================================================
// THE PLUG-IN HYBRID IN 3D (2026-11-16, Eugenio: «que se dibuje en 3D el motor de
// gasolina y las opciones que hay para conectarlo al sistema planetario»)
// ============================================================================
// Draws what hibrido.ts `disponerHibrido` decided, in the viewer's «Motor» layer:
// the petrol engine (crankcase, block, head with its cam cover and coils, intake
// plenum and runners, the headers and silencer out to the tail), and per
// architecture the connection: the planetary gear in a see-through housing (sun
// 30, four planets, ring 78, as the Prius) outboard of MG1, and the drop case to
// the chain; a generator alone, with its high-voltage cable; or a clutch, a P2
// motor-generator and a gearbox. The chain to the rear wheel (or to a differential
// and two half-shafts with four wheels), and the fuel tank. Every mesh carries
// `userData.componente` = 'hibrido-…', so a click opens the hybrid's block. A part
// whose check fails (sticking out of the body, or into the shock tower) is red.

import * as THREE from 'three';
import { DIENTES_PLANETARIO, type CajaZ, type CilZ, type DisposicionHibrido, type V3 } from './hibrido';

let MATS: Record<string, THREE.Material> | null = null;
const mats = () => MATS ?? (MATS = {
  bloque: new THREE.MeshStandardMaterial({ color: 0x9aa3ab, metalness: 0.7, roughness: 0.42 }),
  culata: new THREE.MeshStandardMaterial({ color: 0xa7adb3, metalness: 0.75, roughness: 0.35 }),
  tapa: new THREE.MeshStandardMaterial({ color: 0x8e2a22, metalness: 0.4, roughness: 0.35 }),
  negro: new THREE.MeshStandardMaterial({ color: 0x1d1f22, metalness: 0.3, roughness: 0.55 }),
  plastico: new THREE.MeshStandardMaterial({ color: 0x2b2f33, metalness: 0.1, roughness: 0.7 }),
  escape: new THREE.MeshStandardMaterial({ color: 0x8b847c, metalness: 0.85, roughness: 0.3 }),
  carcasa: new THREE.MeshStandardMaterial({ color: 0xb9bfc5, metalness: 0.8, roughness: 0.3, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }),
  engranaje: new THREE.MeshStandardMaterial({ color: 0xd2b56a, metalness: 0.9, roughness: 0.28 }),
  acero: new THREE.MeshStandardMaterial({ color: 0xc0c5ca, metalness: 0.9, roughness: 0.25 }),
  cobre: new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.8, roughness: 0.35 }),
  generador: new THREE.MeshStandardMaterial({ color: 0x3f4a56, metalness: 0.6, roughness: 0.4 }),
  cable: new THREE.MeshStandardMaterial({ color: 0xe8701a, metalness: 0.1, roughness: 0.6 }),
  deposito: new THREE.MeshStandardMaterial({ color: 0x3a3f44, metalness: 0.15, roughness: 0.65 }),
  goma: new THREE.MeshStandardMaterial({ color: 0x111214, metalness: 0, roughness: 0.9 }),
  mal: new THREE.MeshStandardMaterial({ color: 0xd62828, metalness: 0.2, roughness: 0.5, emissive: 0x5a0000 }),
});

const malla = (g: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, comp: string) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.userData.componente = comp; g.add(m); return m; };

/** A box with rounded edges seen from the side (xy), from z0 to z1. */
function cajaR(g: THREE.Object3D, c: CajaZ, mat: THREE.Material, comp: string, r = 0.012) {
  const w = c.x1 - c.x0, h = c.y1 - c.y0; r = Math.min(r, w / 3, h / 3);
  const s = new THREE.Shape();
  s.moveTo(c.x0 + r, c.y0); s.lineTo(c.x1 - r, c.y0); s.quadraticCurveTo(c.x1, c.y0, c.x1, c.y0 + r); s.lineTo(c.x1, c.y1 - r); s.quadraticCurveTo(c.x1, c.y1, c.x1 - r, c.y1);
  s.lineTo(c.x0 + r, c.y1); s.quadraticCurveTo(c.x0, c.y1, c.x0, c.y1 - r); s.lineTo(c.x0, c.y0 + r); s.quadraticCurveTo(c.x0, c.y0, c.x0 + r, c.y0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: c.z1 - c.z0, bevelEnabled: false, curveSegments: 4 }); geo.translate(0, 0, c.z0);
  return malla(g, geo, mat, comp);
}
/** A cylinder along z. */
function cilZ(g: THREE.Object3D, x: number, y: number, r: number, z0: number, z1: number, mat: THREE.Material, comp: string, seg = 40) {
  const m = malla(g, new THREE.CylinderGeometry(r, r, Math.abs(z1 - z0), seg), mat, comp); m.rotation.x = Math.PI / 2; m.position.set(x, y, (z0 + z1) / 2); return m;
}
function tubo(g: THREE.Object3D, pts: V3[], r: number, mat: THREE.Material, comp: string, cerrado = false) {
  const curva = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), cerrado, 'centripetal');
  return malla(g, new THREE.TubeGeometry(curva, Math.max(16, pts.length * 10), r, 10, cerrado), mat, comp);
}
/** A spur gear (external teeth) of `n` teeth on pitch radius r, extruded along z from z0 to z1, centred at (x, y). */
function engranaje(g: THREE.Object3D, x: number, y: number, r: number, n: number, z0: number, z1: number, mat: THREE.Material, comp: string, giro = 0) {
  const mod = 2 * r / n, ra = r + mod, rf = r - 1.25 * mod, s = new THREE.Shape();
  for (let i = 0; i < n; i++) {
    const a = giro + i * 2 * Math.PI / n, d = Math.PI / n;
    const pts: [number, number][] = [[rf, a - d * 0.55], [ra, a - d * 0.28], [ra, a + d * 0.28], [rf, a + d * 0.55]];
    pts.forEach(([rr, aa], k) => { const px = x + rr * Math.cos(aa), py = y + rr * Math.sin(aa); if (i === 0 && k === 0) s.moveTo(px, py); else s.lineTo(px, py); });
  }
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: false }); geo.translate(0, 0, z0);
  return malla(g, geo, mat, comp);
}
/** The ring gear: internal teeth on pitch radius r, a rim 6 mm thick outside. */
function corona(g: THREE.Object3D, x: number, y: number, r: number, n: number, z0: number, z1: number, mat: THREE.Material, comp: string) {
  const mod = 2 * r / n, s = new THREE.Shape(); s.absarc(x, y, r + 1.25 * mod + 0.006, 0, 2 * Math.PI, false);
  const h = new THREE.Path();
  for (let i = 0; i < n; i++) {
    const a = i * 2 * Math.PI / n, d = Math.PI / n;
    const pts: [number, number][] = [[r + 1.25 * mod, a - d * 0.55], [r - mod, a - d * 0.28], [r - mod, a + d * 0.28], [r + 1.25 * mod, a + d * 0.55]];
    pts.forEach(([rr, aa], k) => { const px = x + rr * Math.cos(aa), py = y + rr * Math.sin(aa); if (i === 0 && k === 0) h.moveTo(px, py); else h.lineTo(px, py); });
  }
  h.closePath(); s.holes.push(h);
  const geo = new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: false, curveSegments: 48 }); geo.translate(0, 0, z0);
  return malla(g, geo, mat, comp);
}
/** The outline round two circles (a drop case, a gearbox, the path of a chain). */
function casco(a: [number, number], ra: number, b: [number, number], rb: number): THREE.Shape {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.max(1e-6, Math.hypot(dx, dy)), f = Math.atan2(dy, dx), al = Math.acos(Math.max(-1, Math.min(1, (ra - rb) / d)));
  const s = new THREE.Shape();
  s.absarc(a[0], a[1], ra, f + al, f - al + 2 * Math.PI, false);
  s.lineTo(b[0] + rb * Math.cos(f - al), b[1] + rb * Math.sin(f - al));
  s.absarc(b[0], b[1], rb, f - al, f + al, false);
  s.closePath();
  return s;
}

export function dibujarHibrido(g: THREE.Object3D, h: DisposicionHibrido) {
  const M = mats(), mo = h.motor, H = h.holguras;
  // (2026-11-17: red when it collides with anything around it, hibrido.ts `choques`)
  const malMotor = H.motor < 0 || (H.torreta != null && H.torreta < 0) || (H.respaldo != null && H.respaldo < 0) || H.choques.some(k => k.pieza === 'motor' && k.holgura < 0);
  const cMotor = 'hibrido-motor';
  // ── the engine: crankcase, the alternator and timing covers at its ends, the block, the head, the cam cover and coils
  cajaR(g, mo.carter, malMotor ? M.mal : M.bloque, cMotor, 0.03);
  // (the sump's ribs underneath)
  for (let i = 1; i < 5; i++) { const x = mo.x0 + (mo.x1 - mo.x0) * i / 5; cajaR(g, { x0: x - 0.004, x1: x + 0.004, y0: mo.y0 - 0.006, y1: mo.y0 + 0.02, z0: mo.z0 + 0.03, z1: mo.z1 - 0.03 }, M.bloque, cMotor, 0.002); }
  cilZ(g, mo.xc, mo.yc, 0.075, mo.z1, mo.z1 + 0.025, malMotor ? M.mal : M.culata, cMotor);
  cilZ(g, mo.xc, mo.yc, 0.035, mo.z1 + 0.025, mo.z1 + 0.035, M.negro, cMotor, 6);
  cajaR(g, mo.bloque, malMotor ? M.mal : M.bloque, cMotor, 0.01);
  // (the cooling-water jacket's bosses and the cylinders' bolts along the block)
  for (const z of mo.cilindrosZ) for (const s of [-1, 1]) cilZ(g, mo.xc + s * (mo.bloque.x1 - mo.bloque.x0) / 2, (mo.bloque.y0 + mo.bloque.y1) / 2, 0.012, z - 0.01, z + 0.01, M.culata, cMotor, 12);
  cajaR(g, mo.culata, malMotor ? M.mal : M.culata, cMotor, 0.012);
  const tapa: CajaZ = { x0: mo.culata.x0 + 0.008, x1: mo.culata.x1 - 0.008, y0: mo.culata.y1, y1: mo.culata.y1 + 0.018, z0: mo.culata.z0 + 0.01, z1: mo.culata.z1 - 0.01 };
  cajaR(g, tapa, malMotor ? M.mal : M.tapa, cMotor, 0.008);
  for (const z of mo.cilindrosZ) { const b = malla(g, new THREE.CylinderGeometry(0.012, 0.012, 0.04, 16), M.negro, cMotor); b.position.set((tapa.x0 + tapa.x1) / 2, tapa.y1 + 0.012, z); }
  // the intake: a runner from each port on the head's front face up into the plenum, and the throttle body on its end
  cajaR(g, mo.admision, M.plastico, cMotor, 0.02);
  for (const z of mo.cilindrosZ) tubo(g, [[mo.culata.x1 - 0.005, (mo.culata.y0 + mo.culata.y1) / 2, z], [mo.culata.x1 + 0.012, mo.culata.y1, z], [mo.culata.x1 - 0.005, mo.admision.y0 + 0.01, z]], 0.014, M.plastico, cMotor);
  cilZ(g, (mo.admision.x0 + mo.admision.x1) / 2, (mo.admision.y0 + mo.admision.y1) / 2, 0.022, mo.admision.z1, mo.admision.z1 + 0.04, M.culata, cMotor);
  // ── the exhaust: one header per cylinder, the silencer, the tailpipe to the skin
  const mE = H.escape < 0 ? M.mal : M.escape, s = h.escape.silencioso;
  for (const c of h.escape.colectores) tubo(g, c, 0.015, M.escape, 'hibrido-escape');
  { const m = malla(g, new THREE.CylinderGeometry(s.r, s.r, s.x1 - s.x0, 32), mE, 'hibrido-escape'); m.rotation.z = Math.PI / 2; m.position.set((s.x0 + s.x1) / 2, s.y, s.z); }
  for (const x of [s.x0, s.x1]) { const m = malla(g, new THREE.CylinderGeometry(s.r * 1.04, s.r * 1.04, 0.008, 32), M.escape, 'hibrido-escape'); m.rotation.z = Math.PI / 2; m.position.set(x, s.y, s.z); }
  if (h.escape.salida < s.x0 - 0.01) { const m = malla(g, new THREE.CylinderGeometry(0.017, 0.017, s.x0 - h.escape.salida, 16), M.escape, 'hibrido-escape'); m.rotation.z = Math.PI / 2; m.position.set((s.x0 + h.escape.salida) / 2, s.y - 0.01, s.z); }

  // ── the connection
  const malT = H.transmision < 0;
  for (const e of h.ejes) {
    if (e.nombre === 'planetario') planetario(g, e, malT);
    else if (e.nombre === 'MG1' || e.nombre === 'generador' || e.nombre === 'P2') maquina(g, e, malT, e.nombre === 'generador' ? 'hibrido-generador' : e.nombre === 'P2' ? 'hibrido-p2' : 'hibrido-mg1');
    // (2026-11-17: the central traction motor MG2 on the ring, outboard of the planetary; its own id so it can be shown alone)
    else if (e.nombre === 'MG2') maquina(g, e, malT, 'hibrido-mg2');
    else if (e.nombre === 'embrague') {
      cilZ(g, e.x, e.y, e.r, e.z0, e.z1, malT ? M.mal : M.culata, 'hibrido-embrague');
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; cilZ(g, e.x + (e.r - 0.006) * Math.cos(a), e.y + (e.r - 0.006) * Math.sin(a), 0.005, e.z0 - 0.004, e.z0, M.acero, 'hibrido-embrague', 8); }
    }
  }
  if (h.caja) {
    const c = h.caja, geo = new THREE.ExtrudeGeometry(casco(c.a, c.ra, c.b, c.rb), { depth: c.z1 - c.z0, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 32 });
    geo.translate(0, 0, c.z0);
    const comp = c.nombre === 'caja de cambios' ? 'hibrido-caja' : 'hibrido-planetario';
    // (the gearbox in the block's cast grey, the planetary's drop case in its machined light grey: two different parts at a glance)
    malla(g, geo, malT ? M.mal : comp === 'hibrido-caja' ? M.bloque : M.culata, comp);
    // (a gearbox shows its selector drum and shift shaft)
    if (comp === 'hibrido-caja') { cilZ(g, (c.a[0] + c.b[0]) / 2 + 0.03, (c.a[1] + c.b[1]) / 2, 0.012, c.z0 - 0.03, c.z0, M.acero, comp, 12); cajaR(g, { x0: (c.a[0] + c.b[0]) / 2 + 0.02, x1: (c.a[0] + c.b[0]) / 2 + 0.07, y0: (c.a[1] + c.b[1]) / 2 - 0.006, y1: (c.a[1] + c.b[1]) / 2 + 0.006, z0: c.z0 - 0.04, z1: c.z0 - 0.03 }, M.negro, comp, 0.003); }
    // the output shaft out to the sprocket in the chain's plane
    if (h.cadena) cilZ(g, c.b[0], c.b[1], 0.016, Math.min(c.z0, h.cadena.z), Math.max(c.z1, h.cadena.z), M.acero, comp, 16);
  }
  if (h.cadena) {
    const k = h.cadena, cc = 'hibrido-cadena';
    engranaje(g, k.a[0], k.a[1], k.ra, 15, k.z - 0.006, k.z + 0.006, M.acero, cc);
    engranaje(g, k.b[0], k.b[1], k.rb, Math.round(15 * k.rb / k.ra), k.z - 0.006, k.z + 0.006, M.acero, cc);
    cilZ(g, k.b[0], k.b[1], k.rb * 0.55, k.z - 0.004, k.z + 0.004, M.negro, cc, 24);
    // the chain: round both sprockets, 6 mm out from their pitch circles
    const pts = casco(k.a, k.ra + 0.006, k.b, k.rb + 0.006).getSpacedPoints(90).slice(0, -1).map(p => [p.x, p.y, k.z] as V3);
    tubo(g, pts, 0.0045, M.negro, cc, true);
  }
  if (h.diferencial) {
    const d = h.diferencial, cd = 'hibrido-diferencial';
    const cuerpo = malla(g, new THREE.SphereGeometry(d.r, 28, 18), M.culata, cd); cuerpo.position.set(...d.c); cuerpo.scale.set(1, 0.9, 0.8);
    for (const sg of [-1, 1]) {
      cilZ(g, d.c[0], d.c[1], 0.014, sg * d.r * 0.7, sg * d.zSemieje, M.acero, cd, 14);
      // (the CV joints' boots at both ends)
      for (const z of [sg * (d.r * 0.8 + 0.03), sg * (d.zSemieje - 0.03)]) { const b = malla(g, new THREE.SphereGeometry(0.03, 16, 10), M.goma, cd); b.position.set(d.c[0], d.c[1], z); b.scale.set(1, 1, 1.4); }
    }
  }
  if (h.cable) tubo(g, h.cable, 0.009, M.cable, 'hibrido-generador');
  // ── the tank, its filler neck and the fuel line to the engine
  const dp = h.deposito, cD = 'hibrido-deposito';
  cajaR(g, dp, H.deposito < 0 || H.choques.some(k => k.pieza === 'deposito' && k.holgura < 0) ? M.mal : M.deposito, cD, 0.03);
  cilZ(g, dp.x1 - 0.06, dp.y1 + 0.01, 0.022, dp.z1 - 0.07, dp.z1 - 0.03, M.negro, cD, 20).rotation.set(0, 0, 0);
  tubo(g, [[dp.x1 - 0.02, dp.y0 + 0.02, dp.z0 + 0.04], [mo.x0 - 0.02, mo.y0 + 0.05, mo.z1 - 0.02], [mo.x0 + 0.01, mo.culata.y0, mo.z1 - 0.04]], 0.004, M.negro, cD);
  return g;
}

/** The power-split gear in a see-through housing: ring 78, four planets on the carrier, sun 30 (the Prius's teeth). */
function planetario(g: THREE.Object3D, e: CilZ, mal: boolean) {
  const M = mats(), c = 'hibrido-planetario', zA = e.z0 + 0.012, zB = e.z1 - 0.012;
  cilZ(g, e.x, e.y, e.r, e.z0, e.z1, mal ? M.mal : M.carcasa, c, 48);
  for (const z of [e.z0, e.z1 - 0.006]) { const m = malla(g, new THREE.TorusGeometry(e.r, 0.004, 8, 48), M.culata, c); m.position.set(e.x, e.y, z + 0.003); }
  const rR = e.r - 0.018, { corona: nR, sol: nS } = DIENTES_PLANETARIO, mod = 2 * rR / nR, rS = nS * mod / 2, nP = (nR - nS) / 2, rP = nP * mod / 2, rC = rS + rP;
  corona(g, e.x, e.y, rR, nR, zA, zB, M.engranaje, c);
  engranaje(g, e.x, e.y, rS, nS, zA, zB, M.engranaje, c);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; engranaje(g, e.x + rC * Math.cos(a), e.y + rC * Math.sin(a), rP, nP, zA + 0.002, zB - 0.002, M.acero, c, a); cilZ(g, e.x + rC * Math.cos(a), e.y + rC * Math.sin(a), 0.006, zB - 0.002, zB + 0.006, M.acero, c, 12); }
  // the carrier's plate (on the engine's side: the engine drives it) and the shafts through the middle
  const placa = new THREE.Shape(); placa.absarc(e.x, e.y, rC + rP * 0.6, 0, 2 * Math.PI, false); const hueco = new THREE.Path(); hueco.absarc(e.x, e.y, rS * 0.6, 0, 2 * Math.PI, true); placa.holes.push(hueco);
  const geo = new THREE.ExtrudeGeometry(placa, { depth: 0.004, bevelEnabled: false, curveSegments: 40 }); geo.translate(0, 0, zB + 0.004); malla(g, geo, M.acero, c);
  cilZ(g, e.x, e.y, rS * 0.5, e.z0 - 0.01, e.z1 + 0.01, M.acero, c, 16);
}
/** A motor-generator (MG1, the series generator, the P2): its case with cooling ribs, end cap, the orange terminal box. */
function maquina(g: THREE.Object3D, e: CilZ, mal: boolean, comp: string) {
  const M = mats();
  cilZ(g, e.x, e.y, e.r, e.z0, e.z1, mal ? M.mal : M.generador, comp, 40);
  const n = Math.max(2, Math.round(Math.abs(e.z1 - e.z0) / 0.014));
  for (let i = 1; i < n; i++) { const z = e.z0 + (e.z1 - e.z0) * i / n; const m = malla(g, new THREE.TorusGeometry(e.r, 0.003, 6, 40), M.culata, comp); m.position.set(e.x, e.y, z); }
  cilZ(g, e.x, e.y, e.r * 0.55, Math.min(e.z0, e.z1) - 0.008, Math.min(e.z0, e.z1), M.cobre, comp, 28);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.035), M.cable); b.position.set(e.x, e.y + e.r + 0.012, (e.z0 + e.z1) / 2); b.userData.componente = comp; g.add(b);
}

/** For the click: what each `hibrido-…` piece is called on the page. */
export const NOMBRES_HIBRIDO: Record<string, string> = {
  'hibrido-motor': 'Motor de gasolina', 'hibrido-planetario': 'Engranaje planetario', 'hibrido-mg1': 'Generador MG1', 'hibrido-mg2': 'Motor eléctrico MG2 (en la corona)', 'hibrido-generador': 'Generador',
  'hibrido-embrague': 'Embrague', 'hibrido-p2': 'Motor-generador P2', 'hibrido-caja': 'Caja de cambios', 'hibrido-cadena': 'Cadena a la rueda',
  'hibrido-diferencial': 'Diferencial y palieres', 'hibrido-deposito': 'Depósito de gasolina', 'hibrido-escape': 'Escape',
};

