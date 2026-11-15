import * as THREE from 'three';
import { puntoSeccion } from './forma';
import { barrido, cintaPiel, estacion, piel, thetaY, torno } from './apteraPiel';
import { malla } from './apteraDetalle';
import {
  BATALLA, CAPSULA, CINTURA, GUARDABARROS, INCLINACION_MAX, LINK, QUILLA, R_CORONA, R_LLANTA, R_RUEDA, ANCHO_RUEDA,
  VIA_DEL, varillaje,
} from './smeraForma';

/*
 * The Lumeneo Smera mesh (shapes in `smeraForma.ts`): the white capsule with
 * its tinted glass (the two seats one behind the other show through it), the
 * dark keel under it, four wheels at the corners on carriers with black
 * mudguards, and on each axle the parallelogram linkage: two transverse arms
 * across the keel, pivoting on its centre line, joined at each end to a
 * wheel carrier.
 *
 * Hierarchy, so that «Bascular» can pose it (`ponerBascula`):
 *   smera
 *   └ bascula        at (0, R_CORONA, 0): turns about X, the lean axis
 *     └ cuerpo       at (0, −R_CORONA, 0): the body, in the car's own frame
 *       ├ keel, capsule, glass, seats, lights…
 *       ├ brazo-<eje>-<inf|sup>   at its pivot: turns about X by −ψ
 *       └ rueda-<eje>-<lado>      at the wheel centre: only translates
 * With the body leaning θ, every carrier stays parallel to it (that is what a
 * parallelogram does), so the wheels lean θ too, and the crowns' centres stay
 * on a line R_CORONA above the road: the tyres keep touching it.
 * No logos, badges or lettering: the garage compares shapes.
 */

function materiales() {
  const F = THREE.FrontSide, D = THREE.DoubleSide;
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ side: F, ...p });
  const calco = (p: THREE.MeshPhysicalMaterialParameters) => fis({ polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, ...p });
  return {
    pintura: fis({ color: 0xf2f3f1, metalness: 0.05, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.05, side: D }),
    // tinted glass, see-through: the tandem seats are the point of the car
    cristal: fis({ color: 0x1d2a33, metalness: 0, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.42, depthWrite: false, side: D }),
    quilla: fis({ color: 0x2b2e33, metalness: 0.15, roughness: 0.5, clearcoat: 0.4, side: D }),
    negro: fis({ color: 0x121315, metalness: 0.05, roughness: 0.6, side: D }),
    acero: fis({ color: 0x5d6168, metalness: 0.85, roughness: 0.35 }),
    asiento: fis({ color: 0x33363c, metalness: 0, roughness: 0.85, sheen: 0.4, sheenColor: new THREE.Color(0x60656e) }),
    luz: calco({ color: 0xffffff, emissive: 0xf4f8ff, emissiveIntensity: 1.6, roughness: 0.2 }),
    piloto: calco({ color: 0x8a0710, emissive: 0xff1a24, emissiveIntensity: 0.9, roughness: 0.18, clearcoat: 1 }),
    junta: calco({ color: 0x9aa0a6, roughness: 0.6, metalness: 0, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }),
    goma: fis({ color: 0x17181a, roughness: 0.88, metalness: 0 }),
    llanta: fis({ color: 0x3b3f45, metalness: 0.6, roughness: 0.3, clearcoat: 0.6 }),
    llantaClara: fis({ color: 0xb4b9bf, metalness: 0.85, roughness: 0.22, clearcoat: 0.8 }),
  };
}
type Mats = ReturnType<typeof materiales>;

/** The glass line's height at x (linear between the points of CINTURA). */
function cintura(x: number): number {
  const c = CINTURA;
  if (x >= c[0][0]) return c[0][1];
  for (let k = 0; k < c.length - 1; k++) if (x >= c[k + 1][0]) { const t = (x - c[k][0]) / (c[k + 1][0] - c[k][0]); return c[k][1] + (c[k + 1][1] - c[k][1]) * t; }
  return c[c.length - 1][1];
}

/** One 14″ wheel: a round-crowned tyre (it leans), a dark disc with a bright rim lip. Axle along Z, outer face to +z. */
function rueda(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'llanta-neumatico';
  const w = ANCHO_RUEDA / 2, rL = R_LLANTA + 0.006, rc = R_CORONA, yc = R_RUEDA - rc;
  // the profile in (r, h): bead, sidewall, then the round crown (a circle of radius rc centred at r = R − rc)
  const perfil: [number, number][] = [[rL, -w + 0.015], [rL + 0.02, -w]];
  for (let k = 0; k <= 16; k++) { const a = -Math.PI / 2 + Math.PI * k / 16; perfil.push([yc + rc * Math.cos(a) * 1.0, Math.max(-w, Math.min(w, rc * Math.sin(a) * (w / rc)))]); }
  perfil.push([rL + 0.02, w], [rL, w - 0.015]);
  g.add(malla(torno(perfil, 64), M.goma, 'neumatico'));
  const cara: [number, number][] = [];
  for (let k = 0; k <= 6; k++) { const r = rL * (1 - k / 6); cara.push([r, w - 0.018 - 0.022 * (1 - (r / rL) ** 2)]); }
  g.add(malla(torno(cara, 48), M.llanta, 'llanta'));
  g.add(malla(torno([[rL + 0.003, w - 0.012], [rL - 0.012, w - 0.02]], 48), M.llantaClara, 'llanta'));
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2, rayo = new THREE.BoxGeometry(rL - 0.05, 0.026, 0.01);
    rayo.translate(0.025 + (rL - 0.05) / 2, 0, w - 0.026); rayo.rotateZ(a);
    g.add(malla(rayo, M.llantaClara, 'llanta'));
  }
  g.add(malla(torno([[0.035, w - 0.03], [0.026, w - 0.022], [0, w - 0.02]], 24), M.llantaClara, 'llanta'));
  return g;
}

/**
 * A wheel with its carrier, on the +z side (the left one is the same mirrored): the wheel at the origin (its centre),
 * the upright inboard of it from the lower to the upper arm, the stub axle, and the black mudguard over the top.
 */
function conjuntoRueda(M: Mats, plantillaRueda: THREE.Group): THREE.Group {
  const g = new THREE.Group();
  g.add(plantillaRueda.clone());
  const c = VIA_DEL / 2, zMangueta = LINK.brazo - c; // the upright, inboard of the wheel centre (< 0)
  const y0 = LINK.yInf - R_RUEDA, y1 = LINK.ySup - R_RUEDA;
  const mangueta = barrido([new THREE.Vector3(0, y0, zMangueta), new THREE.Vector3(0, y1, zMangueta)], () => [0.022, 0.03], { lados: 10, arriba: new THREE.Vector3(1, 0, 0) });
  g.add(malla(mangueta, M.acero, 'mangueta'));
  g.add(malla(barrido([new THREE.Vector3(0, 0, zMangueta), new THREE.Vector3(0, 0, -ANCHO_RUEDA / 2 + 0.01)], () => [0.025, 0.025], { lados: 12, arriba: new THREE.Vector3(1, 0, 0) }), M.acero, 'mangueta'));
  // mudguard: a strip over the tyre, from in front of it round the top to behind it, on two stays from the upright
  const { r, ancho, delante, detras } = GUARDABARROS, n = 28;
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 - delante + (delante + detras) * i / n; // angle from +x (front) going over the top to the back
    const x = r * Math.cos(a), y = r * Math.sin(a);
    pos.push(x, y, -ancho / 2, x, y, ancho / 2);
  }
  for (let i = 0; i < n; i++) { const k = 2 * i; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  const guarda = new THREE.BufferGeometry(); guarda.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); guarda.setIndex(idx); guarda.computeVertexNormals();
  g.add(malla(guarda, M.negro, 'guardabarros'));
  for (const xs of [-0.06, 0.06]) g.add(malla(barrido([new THREE.Vector3(0, y1, zMangueta), new THREE.Vector3(xs, r * 0.98, -ancho / 2 + 0.01)], () => [0.007, 0.007], { lados: 6 }), M.negro, 'guardabarros'));
  return g;
}

let plantilla: THREE.Group | null = null;

function construirPlantilla(): THREE.Group {
  const M = materiales(), raiz = new THREE.Group(); raiz.name = 'smera';
  const bascula = new THREE.Group(); bascula.name = 'bascula'; bascula.position.y = R_CORONA; raiz.add(bascula);
  const g = new THREE.Group(); g.name = 'cuerpo'; g.position.y = -R_CORONA; bascula.add(g);

  // --- the keel: dark, all of it
  g.add(malla(piel(QUILLA, { N: 72, sub: 10 }), M.quilla, 'quilla'));

  // --- the capsule: paint below the glass line and on the roof and pillars; glass above it
  const esCristal = (x: number, th: number) => {
    const e = estacion(CAPSULA, x), [y, z] = puntoSeccion(e, th);
    if (y < cintura(x)) return false;
    if (x > 0.04 || x < -1.80) return false;                               // the windscreen's foot is one clean row
    const techo = Math.abs(z) < 0.62 * e.wt + 0.04 && y > 1.30;          // the roof, painted
    if (techo && x < -0.42) return false;
    if (x < -0.42 && x > -0.52) return false;                              // A-pillar's back edge / door frame
    if (x < -1.06 && x > -1.14) return false;                              // B-pillar, between the two seats' windows
    return true;
  };
  const capsula = piel(CAPSULA, { N: 160, nClases: 2, paso: () => 0.012, clase: (x, th) => (esCristal(x, th) ? 1 : 0) });
  g.add(malla(capsula, [M.pintura, M.cristal], 'carroceria'));

  // --- inside, seen through the glass: two seats one behind the other, the front one with a steering wheel
  // (the rear one sits lower and further forward: the roof falls behind it)
  for (const [xs, dy, nombre] of [[-0.62, 0, 'asiento-delantero'], [-1.24, -0.06, 'asiento-trasero']] as [number, number, string][]) {
    const respaldo = new THREE.BoxGeometry(0.11, 0.52, 0.40); respaldo.rotateZ(0.22); respaldo.translate(xs - 0.12, 0.98 + dy, 0);
    g.add(malla(respaldo, M.asiento, nombre));
    const cojin = new THREE.BoxGeometry(0.44, 0.10, 0.40); cojin.translate(xs + 0.08, 0.72 + dy, 0);
    g.add(malla(cojin, M.asiento, nombre));
    const reposa = new THREE.BoxGeometry(0.09, 0.15, 0.24); reposa.rotateZ(0.22); reposa.translate(xs - 0.20, 1.30 + dy, 0);
    g.add(malla(reposa, M.asiento, nombre));
  }
  {
    const aro: THREE.Vector3[] = [];
    for (let k = 0; k <= 32; k++) { const a = (k / 32) * Math.PI * 2; aro.push(new THREE.Vector3(-0.18 - 0.05 * Math.sin(a), 1.02 + 0.15 * Math.sin(a) * 0.9, 0.15 * Math.cos(a))); }
    g.add(malla(barrido(aro, () => [0.012, 0.012], { lados: 8, cerrado: true }), M.negro, 'volante'));
    g.add(malla(barrido([new THREE.Vector3(-0.18, 1.02, 0), new THREE.Vector3(0.0, 0.88, 0)], () => [0.02, 0.02], { lados: 8 }), M.negro, 'volante'));
  }

  // --- door shut lines (one door each side, front seat) and the sill line
  for (const s of [1, -1]) {
    const lado = new THREE.Group(); lado.scale.z = s; g.add(lado);
    lado.add(malla(cintaPiel(CAPSULA, [[-0.47, 0.98], [-0.45, 0.80], [-0.40, 0.66]], 0.006, { pasos: 18 }), M.junta, 'junta', false));
    lado.add(malla(cintaPiel(CAPSULA, [[-1.10, 1.01], [-1.12, 0.80], [-1.16, 0.62]], 0.006, { pasos: 18 }), M.junta, 'junta', false));
    lado.add(malla(cintaPiel(CAPSULA, [[-0.40, 0.66], [-0.75, 0.58], [-1.16, 0.62]], 0.006, { pasos: 20 }), M.junta, 'junta', false));
    lado.add(malla(cintaPiel(CAPSULA, [[-0.80, 0.94], [-0.96, 0.945]], 0.016, { pasos: 6, delta: 0.0025 }), M.negro, 'tirador', false));
    // the shoulder: a dark line along the capsule's widest point, from the nose to the tail
    lado.add(malla(cintaPiel(CAPSULA, [[0.22, 0.80], [0.0, 0.86], [-0.6, 0.90], [-1.3, 0.92], [-1.80, 0.95], [-1.96, 0.88]], 0.012, { pasos: 60 }), M.quilla, 'hombro', false));
    // a black frit along the glass line: the glass's edge is cut on the skin's grid, so it is stepped, and this covers it
    lado.add(malla(cintaPiel(CAPSULA, [[0.10, 0.905], ...CINTURA, [-1.86, 1.03]], 0.04, { pasos: 80, delta: 0.0025 }), M.negro, 'serigrafia', false));
    // mirror on a short stalk at the A-pillar's foot
    const cab = new THREE.SphereGeometry(1, 16, 10); cab.scale(0.05, 0.035, 0.035); cab.translate(-0.10, 0.99, 0.385);
    lado.add(malla(cab, M.negro, 'retrovisor'));
    lado.add(malla(barrido([new THREE.Vector3(-0.07, 0.97, 0.30), new THREE.Vector3(-0.10, 0.99, 0.37)], () => [0.008, 0.008], { lados: 6 }), M.negro, 'retrovisor'));
  }

  // --- lights: two narrow headlamps where the nose meets the shoulder, two tail lamps high on the tail
  for (const s of [1, -1]) {
    const faro: THREE.Vector3[] = [], piloto: THREE.Vector3[] = [];
    for (let k = 0; k <= 10; k++) {
      const x = 0.24 - 0.13 * k / 10, e = estacion(CAPSULA, x), y = 0.78 + 0.05 * k / 10;
      const th = thetaY(e, y), [py, pz] = puntoSeccion(e, th);
      faro.push(new THREE.Vector3(x + 0.004, py, s * (pz + 0.004)));
      const xt = -1.90 + 0.12 * k / 10, et = estacion(CAPSULA, xt), yt = 0.98 - 0.03 * k / 10;
      const tht = thetaY(et, yt), [qy, qz] = puntoSeccion(et, tht);
      piloto.push(new THREE.Vector3(xt - 0.003, qy, s * (qz + 0.004)));
    }
    g.add(malla(barrido(faro, t => [0.008, 0.03 - 0.012 * t], { lados: 8 }), M.negro, 'faro', false));
    g.add(malla(barrido(faro.map(p => p.clone().add(new THREE.Vector3(0.006, 0, s * 0.006))), t => [0.005, 0.012 - 0.004 * t], { lados: 8 }), M.luz, 'faro', false));
    g.add(malla(barrido(piloto, t => [0.006, 0.02 - 0.008 * t], { lados: 8 }), M.piloto, 'piloto', false));
  }
  // --- the linkage and the wheels
  const plantillaRueda = rueda(M);
  const ruedaDer = conjuntoRueda(M, plantillaRueda);
  for (const [i, xa] of [[0, 0], [1, -BATALLA]] as [number, number][]) {
    for (const [nivel, y] of [['inf', LINK.yInf], ['sup', LINK.ySup]] as [string, number][]) {
      const b = new THREE.Group(); b.name = `brazo-${i}-${nivel}`; b.position.set(xa, y, 0);
      // one bar right across the keel, a little thicker in the middle where it pivots
      b.add(malla(barrido([new THREE.Vector3(0, 0, -LINK.brazo), new THREE.Vector3(0, 0, LINK.brazo)], t => [0.014 + 0.01 * (1 - Math.abs(2 * t - 1)), 0.02], { lados: 10, arriba: new THREE.Vector3(1, 0, 0) }), M.negro, 'brazo'));
      g.add(b);
    }
    for (const s of [1, -1]) {
      const r = ruedaDer.clone(); r.name = `rueda-${i}-${s > 0 ? 'der' : 'izq'}`;
      r.scale.z = s; r.position.set(xa, R_RUEDA, s * VIA_DEL / 2); r.userData.base = r.position.clone();
      g.add(r);
    }
  }
  return raiz;
}

/** A copy of the template with its own geometries (the viewer disposes them when it hides the car); materials are shared. */
export function construir(): THREE.Group {
  if (!plantilla) plantilla = construirPlantilla();
  const copia = plantilla.clone(true);
  copia.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry = m.geometry.clone(); });
  return copia;
}

/**
 * Leans a built Smera `f` of the way to its maximum (0 upright, 1 at 25° to its right; negative to its left). The body
 * turns about the lean axis; each arm turns ψ relative to it; each wheel carrier slides with its arms' ends and
 * stays parallel to the body (`varillaje` in smeraForma.ts has the derivation).
 */
export function ponerBascula(grupo: THREE.Object3D, f: number) {
  const grados = INCLINACION_MAX * f, { psi, dz, dy } = varillaje(grados);
  const b = grupo.getObjectByName('bascula'); if (!b) return;
  b.rotation.x = grados * Math.PI / 180;
  for (const i of [0, 1]) {
    for (const nivel of ['inf', 'sup']) { const o = grupo.getObjectByName(`brazo-${i}-${nivel}`); if (o) o.rotation.x = -psi; }
    for (const [lado, s] of [['der', 1], ['izq', -1]] as [string, number][]) {
      const o = grupo.getObjectByName(`rueda-${i}-${lado}`); const base = o?.userData.base as THREE.Vector3 | undefined;
      if (o && base) o.position.set(base.x, base.y + s * dy, base.z + s * dz);
    }
  }
}
