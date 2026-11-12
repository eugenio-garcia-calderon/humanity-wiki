import * as THREE from 'three';
import { puntoSeccion, semiAncho, semiAnchoEn } from './forma';
import { barrido, cintaPiel, estacion, piel, torno } from './apteraPiel';
import { malla } from './apteraDetalle';
import {
  ARCO, BATALLA, CABINA, CUERPO, ESPEJO, R_LLANTA, R_RUEDA, ANCHO_RUEDA, VIA_DEL, X_COLA, X_MORRO,
} from './modeloYForma';

/*
 * The Tesla Model Y (2025 «Juniper») mesh: lower body in paint with the wheel
 * openings cut out and black wheel-well liners and lips behind them; the
 * greenhouse as one dark glass piece (windscreen, glass roof, side windows,
 * rear glass), painted only on the C-pillar sail; the full-width front light
 * bar along the hood's leading edge with slim headlamps lower in the bumper;
 * the full-width tail light bar under the ducktail; mirrors; 19″ aero wheels.
 * Shapes in `modeloYForma.ts`. Built once into a template; every `construir()`
 * hands out a copy with its own geometries (the viewer disposes them).
 * No logos, badges or lettering: the garage compares shapes.
 */

type P2 = [number, number];

function materiales() {
  const F = THREE.FrontSide, D = THREE.DoubleSide;
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ side: F, ...p });
  const calco = (p: THREE.MeshPhysicalMaterialParameters) => fis({ polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, ...p });
  return {
    // «Ultra Red», one of the Juniper's paints: a deep metallic red under clear coat
    pintura: fis({ color: 0x8e0f16, metalness: 0.45, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03, side: D }),
    // the greenhouse: dark tinted glass that reads black from outside, as on the real car
    cristal: fis({ color: 0x0b0e12, metalness: 0.1, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.01, envMapIntensity: 1.5, side: D }),
    negro: fis({ color: 0x111215, metalness: 0.1, roughness: 0.55, side: D }),
    negroBrillo: calco({ color: 0x08090b, metalness: 0.2, roughness: 0.15, clearcoat: 1 }),
    luz: calco({ color: 0xffffff, emissive: 0xf4f8ff, emissiveIntensity: 1.8, roughness: 0.2 }),
    lente: calco({ color: 0x15181d, metalness: 0.3, roughness: 0.08, clearcoat: 1 }),
    piloto: calco({ color: 0x8a0710, emissive: 0xff1a24, emissiveIntensity: 0.9, roughness: 0.18, clearcoat: 1 }),
    goma: fis({ color: 0x17181a, roughness: 0.88, metalness: 0 }),
    llanta: fis({ color: 0x3b3f45, metalness: 0.6, roughness: 0.3, clearcoat: 0.6 }),
    llantaClara: fis({ color: 0xa9aeb4, metalness: 0.85, roughness: 0.22, clearcoat: 0.8 }),
    junta: calco({ color: 0x1a0507, roughness: 0.7, metalness: 0, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }),
  };
}
type Mats = ReturnType<typeof materiales>;

/** The point of the lower body's skin on the +z side at (x, y), pushed `d` out horizontally. */
function enCuerpo(x: number, y: number, d = 0.003): THREE.Vector3 {
  return new THREE.Vector3(x, y, semiAnchoEn(CUERPO, x, y) + d);
}
/** Where, along x between x0 and x1, the body's half-width at height y reaches z (bisection; the body widens from x0 to x1). */
function xDondeAncho(y: number, z: number, x0: number, x1: number): number {
  let a = x0, b = x1;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (semiAnchoEn(CUERPO, m, y) < z) a = m; else b = m; }
  return (a + b) / 2;
}

/** One 19″ wheel: tyre, dark aero face with five light spokes, axle along Z, outer face to +z. */
function rueda(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'rueda';
  const w = ANCHO_RUEDA / 2, rL = R_LLANTA + 0.008;
  const perfil: [number, number][] = [
    [rL, -w + 0.02], [rL + 0.02, -w], [(rL + R_RUEDA) / 2, -w - 0.006], [R_RUEDA - 0.025, -w + 0.002], [R_RUEDA, -w + 0.03],
    [R_RUEDA, w - 0.03], [R_RUEDA - 0.025, w - 0.002], [(rL + R_RUEDA) / 2, w + 0.006], [rL + 0.02, w], [rL, w - 0.02],
  ];
  g.add(malla(torno(perfil, 72), M.goma, 'neumatico'));
  // the face: a shallow dish, dark, with a bright rim lip
  const cara: [number, number][] = [];
  for (let k = 0; k <= 8; k++) { const r = rL * (1 - k / 8); cara.push([r, w - 0.02 - 0.03 * (1 - (r / rL) ** 2)]); }
  g.add(malla(torno(cara, 64), M.llanta, 'llanta'));
  g.add(malla(torno([[rL + 0.004, w - 0.016], [rL - 0.012, w - 0.022]], 64), M.llantaClara, 'llanta'));
  // five spokes, flush with the face
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2, rayo = new THREE.BoxGeometry(rL - 0.06, 0.038, 0.012);
    rayo.translate(0.03 + (rL - 0.06) / 2, 0, w - 0.03); rayo.rotateZ(a);
    g.add(malla(rayo, M.llantaClara, 'llanta'));
  }
  g.add(malla(torno([[0.045, w - 0.035], [0.035, w - 0.028], [0, w - 0.026]], 32), M.llantaClara, 'llanta'));
  return g;
}

/** Black liner of a wheel opening (+z side): an arch over the wheel and the inner wall. */
function pasoDeRueda(xa: number): THREE.BufferGeometry[] {
  const { y: yc, r, zDentro } = ARCO, geos: THREE.BufferGeometry[] = [];
  // the arch: a part-cylinder from just in front of the wheel, over the top, to just behind it (angles from +x)
  const a0 = -0.25, a1 = Math.PI + 0.25, n = 40, zFuera = 0.965;
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n, x = xa + r * Math.cos(a), y = Math.max(0.12, yc + r * Math.sin(a));
    pos.push(x, y, zDentro, x, y, zFuera);
  }
  for (let i = 0; i < n; i++) { const k = 2 * i; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  const arco = new THREE.BufferGeometry(); arco.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); arco.setIndex(idx); arco.computeVertexNormals();
  geos.push(arco);
  // the inner wall: the opening's shape, flat, at z = zDentro
  const forma = new THREE.Shape();
  forma.moveTo(xa + r * Math.cos(a0), Math.max(0.12, yc + r * Math.sin(a0)));
  for (let i = 1; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; forma.lineTo(xa + r * Math.cos(a), Math.max(0.12, yc + r * Math.sin(a))); }
  forma.closePath();
  const pared = new THREE.ShapeGeometry(forma, 1); pared.translate(0, 0, zDentro);
  geos.push(pared);
  return geos;
}

let plantilla: THREE.Group | null = null;

function construirPlantilla(): THREE.Group {
  const M = materiales(), g = new THREE.Group(); g.name = 'modeloY';
  const ejes = [0, -BATALLA];
  // --- lower body: paint, a black underside and lower intake/diffuser, the wheel openings left out
  const cuerpo = piel(CUERPO, {
    // finer rows round the wheel openings: their edge is stepped by the grid and must stay under the black lip
    N: 176, nClases: 2, paso: x => (ejes.some(xa => Math.abs(x - xa) < ARCO.r + 0.05) ? 0.012 : 0.035),
    clase: (x, th) => {
      const e = estacion(CUERPO, x), [y, z] = puntoSeccion(e, th);
      for (const xa of ejes) if (Math.abs(z) > ARCO.zDentro && Math.hypot(x - xa, y - ARCO.y) < ARCO.r) return -1;
      if (y < e.yb + 0.045) return 1;                       // underside
      if (x > 0.72 && y < 0.34) return 1;                   // the lower intake under the bumper
      if (x < -3.62 && y < 0.43) return 1;                  // the rear diffuser
      return 0;
    },
  });
  g.add(malla(cuerpo, [M.pintura, M.negro], 'carroceria'));

  // --- greenhouse: dark glass, with the C-pillar sail in paint (the side behind the rear quarter window). Its edges
  // follow the grid (a row in x, a column in θ), so they are straight, not stepped.
  const cabina = piel(CABINA, {
    N: 96, sub: 10, nClases: 2,
    clase: (x, th) => (x < -3.05 && Math.abs(Math.cos(th)) > 0.5 ? 1 : 0),
  });
  g.add(malla(cabina, [M.cristal, M.pintura], 'cristales'));

  // --- wheel wells: black liners and a black lip round each opening
  for (const s of [1, -1]) {
    const lado = new THREE.Group(); lado.scale.z = s; g.add(lado);
    for (const xa of ejes) {
      for (const geo of pasoDeRueda(xa)) lado.add(malla(geo, M.negro, 'paso-de-rueda', false));
      const ruta: THREE.Vector3[] = [];
      for (let k = 0; k <= 36; k++) {
        const a = -0.18 + (Math.PI + 0.36) * k / 36, x = xa + ARCO.r * Math.cos(a), y = ARCO.y + ARCO.r * Math.sin(a);
        if (y < 0.2) continue;
        ruta.push(enCuerpo(x, y, 0.004));
      }
      // (with `arriba` along z the first half-size is in the side view, across the arch: 2 cm each way)
      lado.add(malla(barrido(ruta, () => [0.02, 0.006], { lados: 8, arriba: new THREE.Vector3(0, 0, 1) }), M.negroBrillo, 'aleta'));
    }
    // door shut lines (front door, rear door, the rear door's edge round the arch)
    const juntas: P2[][] = [
      [[-0.40, 0.33], [-0.42, 0.7], [-0.44, 0.995]],
      [[-1.53, 0.30], [-1.55, 0.7], [-1.57, 1.02]],
      [[-2.58, 1.05], [-2.52, 0.92], [-2.43, 0.82], [-2.35, 0.70]],
    ];
    for (const j of juntas) lado.add(malla(cintaPiel(CUERPO, j, 0.005, { pasos: 24, delta: 0.0015 }), M.junta, 'junta', false));
    // flush door handles: a dark slot at the beltline on each door
    for (const xh of [-0.95, -2.05]) lado.add(malla(cintaPiel(CUERPO, [[xh, 0.955], [xh - 0.17, 0.958]], 0.018, { pasos: 6, delta: 0.0018 }), M.negroBrillo, 'tirador', false));
    // mirror: a head on a short stalk off the door's front corner
    const cabeza = new THREE.SphereGeometry(1, 20, 12); cabeza.scale(ESPEJO.a, ESPEJO.b, ESPEJO.c); cabeza.translate(ESPEJO.x, ESPEJO.y, ESPEJO.z);
    lado.add(malla(cabeza, M.pintura, 'retrovisor'));
    const cara = new THREE.CircleGeometry(1, 20); cara.rotateY(-Math.PI / 2); cara.scale(1, ESPEJO.b * 0.85, ESPEJO.c * 0.85); cara.translate(ESPEJO.x - ESPEJO.a * 0.6, ESPEJO.y, ESPEJO.z);
    lado.add(malla(cara, M.negroBrillo, 'retrovisor', false));
    const pie = new THREE.CylinderGeometry(0.014, 0.018, 0.13, 10); pie.rotateX(Math.PI / 2); pie.translate(ESPEJO.x + 0.02, ESPEJO.y - 0.025, ESPEJO.z - 0.09);
    lado.add(malla(pie, M.negro, 'retrovisor'));
  }

  // --- front light bar: full width along the hood's leading edge, its ends dropping a little at the corners
  {
    const ruta: THREE.Vector3[] = [];
    const yBarra = 0.825;
    for (let k = 0; k <= 40; k++) {
      const z = -0.80 + 1.60 * k / 40, caida = Math.max(0, Math.abs(z) - 0.70) * 0.25, y = yBarra - caida;
      const x = xDondeAncho(y, Math.abs(z), X_MORRO - 0.001, 0.3);
      const e = estacion(CUERPO, x), w = semiAncho(e, y);
      ruta.push(new THREE.Vector3(x + 0.004, y, Math.sign(z) * Math.min(Math.abs(z), w)));
    }
    g.add(malla(barrido(ruta, () => [0.004, 0.006], { lados: 8 }), M.luz, 'barra-de-luz', false));
    // the slim headlamps, lower in the bumper near the corners: a dark lens with a bright strip
    for (const s of [1, -1]) {
      const lente: THREE.Vector3[] = [], tira: THREE.Vector3[] = [];
      for (let k = 0; k <= 14; k++) {
        const z = 0.52 + 0.27 * k / 14, y = 0.61 + 0.025 * k / 14;
        const x = xDondeAncho(y, z, X_MORRO - 0.001, 0.2);
        lente.push(new THREE.Vector3(x + 0.004, y, s * z)); tira.push(new THREE.Vector3(x + 0.008, y + 0.004, s * z));
      }
      g.add(malla(barrido(lente, t => [0.004, 0.024 - 0.008 * t], { lados: 8 }), M.lente, 'faro', false));
      g.add(malla(barrido(tira, () => [0.003, 0.005], { lados: 6 }), M.luz, 'faro', false));
    }
  }

  // --- tail light bar: full width under the ducktail, taller at the ends where the lamps wrap the corners
  {
    const ruta: THREE.Vector3[] = [], yBarra = 1.035;
    for (let k = 0; k <= 44; k++) {
      const z = -0.86 + 1.72 * k / 44;
      const x = xDondeAncho(yBarra, Math.abs(z), X_COLA + 0.001, -3.3);
      ruta.push(new THREE.Vector3(x - 0.004, yBarra, z));
    }
    g.add(malla(barrido(ruta, t => [0.004, Math.abs(t - 0.5) > 0.38 ? 0.03 : 0.009], { lados: 8 }), M.piloto, 'piloto', false));
  }

  // --- wheels
  const plano = rueda(M);
  for (const xa of ejes) for (const s of [1, -1]) {
    const r = plano.clone(); r.scale.z = s; r.position.set(xa, R_RUEDA - 0.006, s * VIA_DEL / 2); g.add(r);
  }
  return g;
}

/** A copy of the template with its own geometries (the viewer disposes them when it hides the car); materials are shared. */
export function construir(): THREE.Group {
  if (!plantilla) plantilla = construirPlantilla();
  const copia = plantilla.clone(true);
  copia.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry = m.geometry.clone(); });
  return copia;
}
