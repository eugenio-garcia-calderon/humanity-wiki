import * as THREE from 'three';
import { puntoSeccion, semiAncho, semiAnchoEn } from './forma';
import { barrido, cintaPiel, estacion, piel, torno } from './apteraPiel';
import { malla } from './apteraDetalle';
import {
  ARCO, BATALLA, CABINA, CUERPO, ESPEJO, R_LLANTA, R_RUEDA, ANCHO_RUEDA, VIA_DEL, VIA_TRAS, X_COLA, X_MORRO,
} from './eqxxForma';

/*
 * The Mercedes-Benz Vision EQXX mesh, built like the Model Y's
 * (`modeloYModelo.ts`): lower body in silver paint with the wheel openings
 * cut out and black wheel-well liners and lips behind them; the greenhouse
 * as one dark glass piece with the solar cells across the roof; a thin light
 * bar across the front at the hood's leading edge, with the lamps at its
 * ends; a full-width light bar across the cut-off tail; small glass mirrors;
 * 20″ wheels behind flat covers, flush with the body. Shapes in
 * `eqxxForma.ts`. Built once into a template; every `construir()` hands out a
 * copy with its own geometries (the viewer disposes them).
 * No logos, badges or lettering: the garage compares shapes.
 */

type P2 = [number, number];

function materiales() {
  const F = THREE.FrontSide, D = THREE.DoubleSide;
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ side: F, ...p });
  const calco = (p: THREE.MeshPhysicalMaterialParameters) => fis({ polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, ...p });
  return {
    // the show car's light, bright silver
    pintura: fis({ color: 0xc8ccd1, metalness: 0.75, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.03, side: D }),
    cristal: fis({ color: 0x0b0e12, metalness: 0.1, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.01, envMapIntensity: 1.5, side: D }),
    // the roof's solar cells: deep blue under the glass
    solar: fis({ color: 0x0f1d3a, metalness: 0.35, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.02, side: D }),
    negro: fis({ color: 0x111215, metalness: 0.1, roughness: 0.55, side: D }),
    negroBrillo: calco({ color: 0x08090b, metalness: 0.2, roughness: 0.15, clearcoat: 1 }),
    luz: calco({ color: 0xffffff, emissive: 0xf4f8ff, emissiveIntensity: 1.8, roughness: 0.2 }),
    lente: calco({ color: 0x15181d, metalness: 0.3, roughness: 0.08, clearcoat: 1 }),
    piloto: calco({ color: 0x8a0710, emissive: 0xff1a24, emissiveIntensity: 0.9, roughness: 0.18, clearcoat: 1 }),
    goma: fis({ color: 0x17181a, roughness: 0.88, metalness: 0 }),
    // the wheel covers: smooth, a pale smoked grey (the real ones are semi-transparent)
    tapa: fis({ color: 0x9ea4ab, metalness: 0.5, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.03, side: D }),
    llanta: fis({ color: 0x3b3f45, metalness: 0.6, roughness: 0.3, clearcoat: 0.6 }),
    junta: calco({ color: 0x2a2d31, roughness: 0.7, metalness: 0, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }),
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

/** One 20″ wheel: a narrow tall tyre and a flat cover almost flush with its sidewall, with a ring of small vents. Axle along Z, outer face to +z. */
function rueda(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'rueda';
  const w = ANCHO_RUEDA / 2, rL = R_LLANTA + 0.008;
  const perfil: [number, number][] = [
    [rL, -w + 0.02], [rL + 0.02, -w], [(rL + R_RUEDA) / 2, -w - 0.006], [R_RUEDA - 0.022, -w + 0.002], [R_RUEDA, -w + 0.026],
    [R_RUEDA, w - 0.026], [R_RUEDA - 0.022, w - 0.002], [(rL + R_RUEDA) / 2, w + 0.006], [rL + 0.02, w], [rL, w - 0.02],
  ];
  g.add(malla(torno(perfil, 72), M.goma, 'neumatico'));
  // the rim behind, barely seen
  g.add(malla(torno([[rL, w - 0.03], [rL * 0.4, w - 0.05], [0, w - 0.05]], 48), M.llanta, 'llanta'));
  // the cover: a very shallow dome out to the tyre's bead
  const tapa: [number, number][] = [];
  for (let k = 0; k <= 10; k++) { const r = (rL + 0.012) * (1 - k / 10); tapa.push([r, w - 0.004 + 0.008 * (1 - (r / rL) ** 2)]); }
  g.add(malla(torno(tapa, 72), M.tapa, 'tapacubos'));
  // twelve small vents near its edge
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2, v = new THREE.BoxGeometry(0.045, 0.012, 0.004);
    v.translate(rL - 0.045, 0, w + 0.004); v.rotateZ(a);
    g.add(malla(v, M.negroBrillo, 'tapacubos', false));
  }
  return g;
}

/** Black liner of a wheel opening (+z side): an arch over the wheel and the inner wall. */
function pasoDeRueda(xa: number): THREE.BufferGeometry[] {
  const { y: yc, r, zDentro } = ARCO, geos: THREE.BufferGeometry[] = [];
  const a0 = -0.25, a1 = Math.PI + 0.25, n = 40;
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n, x = xa + r * Math.cos(a), y = Math.max(0.12, yc + r * Math.sin(a));
    // out to just inside the skin at that point (the body's side curves in low down, and the tail narrows)
    const zFuera = Math.max(zDentro + 0.01, semiAnchoEn(CUERPO, x, y) - 0.006);
    pos.push(x, y, zDentro, x, y, zFuera);
  }
  for (let i = 0; i < n; i++) { const k = 2 * i; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  const arco = new THREE.BufferGeometry(); arco.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); arco.setIndex(idx); arco.computeVertexNormals();
  geos.push(arco);
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
  const M = materiales(), g = new THREE.Group(); g.name = 'eqxx';
  const ejes = [0, -BATALLA];
  // --- lower body: paint, a black underside and the lower intake/diffuser, the wheel openings left out
  const cuerpo = piel(CUERPO, {
    N: 176, nClases: 2, paso: x => (ejes.some(xa => Math.abs(x - xa) < ARCO.r + 0.05) ? 0.012 : 0.035),
    clase: (x, th) => {
      const e = estacion(CUERPO, x), [y, z] = puntoSeccion(e, th);
      for (const xa of ejes) if (Math.abs(z) > ARCO.zDentro && Math.hypot(x - xa, y - ARCO.y) < ARCO.r) return -1;
      if (y < e.yb + 0.04) return 1;                       // underside
      if (x > 0.80 && y < 0.30) return 1;                  // the narrow intake low in the bumper
      return 0;
    },
  });
  g.add(malla(cuerpo, [M.pintura, M.negro], 'carroceria'));

  // --- greenhouse: dark glass; the solar cells over the roof, from above the windscreen's top to the rear glass;
  // paint on the rear quarter behind the last side window
  const cabina = piel(CABINA, {
    N: 96, sub: 10, nClases: 3,
    clase: (x, th) => {
      const c = Math.abs(Math.cos(th));
      if (x < -1.05 && x > -3.05 && Math.sin(th) > 0 && c < 0.42) return 2;
      if (x < -3.2 && c > 0.5) return 1;
      return 0;
    },
  });
  g.add(malla(cabina, [M.cristal, M.pintura, M.solar], 'cristales'));

  // --- wheel wells, shut lines, handles, mirrors
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
      lado.add(malla(barrido(ruta, () => [0.012, 0.005], { lados: 8, arriba: new THREE.Vector3(0, 0, 1) }), M.negroBrillo, 'aleta'));
    }
    // four doors: the front door's leading edge, the pillar between them, the rear door's trailing edge round the arch
    const juntas: P2[][] = [
      [[-0.36, 0.30], [-0.38, 0.6], [-0.40, 0.82]],
      [[-1.48, 0.28], [-1.50, 0.6], [-1.52, 0.835]],
      [[-2.48, 0.84], [-2.42, 0.74], [-2.36, 0.64], [-2.32, 0.52]],
    ];
    for (const j of juntas) lado.add(malla(cintaPiel(CUERPO, j, 0.004, { pasos: 24, delta: 0.0015 }), M.junta, 'junta', false));
    for (const xh of [-0.90, -1.98]) lado.add(malla(cintaPiel(CUERPO, [[xh, 0.79], [xh - 0.16, 0.792]], 0.014, { pasos: 6, delta: 0.0018 }), M.negroBrillo, 'tirador', false));
    const cabeza = new THREE.SphereGeometry(1, 20, 12); cabeza.scale(ESPEJO.a, ESPEJO.b, ESPEJO.c); cabeza.translate(ESPEJO.x, ESPEJO.y, ESPEJO.z);
    lado.add(malla(cabeza, M.pintura, 'retrovisor'));
    const cara = new THREE.CircleGeometry(1, 20); cara.rotateY(-Math.PI / 2); cara.scale(1, ESPEJO.b * 0.85, ESPEJO.c * 0.85); cara.translate(ESPEJO.x - ESPEJO.a * 0.6, ESPEJO.y, ESPEJO.z);
    lado.add(malla(cara, M.negroBrillo, 'retrovisor', false));
    const pie = new THREE.CylinderGeometry(0.012, 0.016, 0.14, 10); pie.rotateX(Math.PI / 2); pie.translate(ESPEJO.x + 0.02, ESPEJO.y - 0.02, ESPEJO.z - 0.10);
    lado.add(malla(pie, M.negro, 'retrovisor'));
  }

  // --- front light bar: across the hood's leading edge, with a slim lamp at each end
  {
    const ruta: THREE.Vector3[] = [], yBarra = 0.655;
    for (let k = 0; k <= 40; k++) {
      const z = -0.78 + 1.56 * k / 40, y = yBarra - Math.max(0, Math.abs(z) - 0.66) * 0.3;
      const x = xDondeAncho(y, Math.abs(z), X_MORRO - 0.001, 0.3);
      const e = estacion(CUERPO, x), w = semiAncho(e, y);
      ruta.push(new THREE.Vector3(x + 0.004, y, Math.sign(z) * Math.min(Math.abs(z), w)));
    }
    g.add(malla(barrido(ruta, () => [0.004, 0.005], { lados: 8 }), M.luz, 'barra-de-luz', false));
    for (const s of [1, -1]) {
      const lente: THREE.Vector3[] = [], tira: THREE.Vector3[] = [];
      for (let k = 0; k <= 12; k++) {
        const z = 0.56 + 0.24 * k / 12, y = 0.62 - 0.02 * k / 12;
        const x = xDondeAncho(y, z, X_MORRO - 0.001, 0.2);
        lente.push(new THREE.Vector3(x + 0.004, y, s * z)); tira.push(new THREE.Vector3(x + 0.008, y + 0.002, s * z));
      }
      g.add(malla(barrido(lente, t => [0.004, 0.02 - 0.006 * t], { lados: 8 }), M.lente, 'faro', false));
      g.add(malla(barrido(tira, () => [0.003, 0.004], { lados: 6 }), M.luz, 'faro', false));
    }
  }

  // --- tail light bar: full width across the cut-off tail, near its top
  {
    const ruta: THREE.Vector3[] = [], yBarra = 0.86;
    const e = estacion(CUERPO, X_COLA), w = semiAncho(e, yBarra) - 0.01;
    for (let k = 0; k <= 30; k++) { const z = -w + 2 * w * k / 30; ruta.push(new THREE.Vector3(X_COLA - 0.004, yBarra, z)); }
    g.add(malla(barrido(ruta, t => [0.004, Math.abs(t - 0.5) > 0.42 ? 0.022 : 0.008], { lados: 8 }), M.piloto, 'piloto', false));
  }

  // --- the diffuser: a black band across the bottom of the cut-off tail (a flat piece just behind the end cap: the
  // skin's grid would cut it in steps)
  {
    const e = estacion(CUERPO, X_COLA), forma = new THREE.Shape(), yTope = 0.53, pasos = 24;
    const pts: [number, number][] = [];
    for (let k = 0; k <= pasos; k++) { const y = e.yb + 0.002 + (yTope - e.yb - 0.002) * k / pasos; pts.push([semiAncho(e, y) - 0.004, y]); }
    forma.moveTo(-pts[0][0], pts[0][1]);
    for (const [z, y] of pts) forma.lineTo(z, y);
    for (const [z, y] of [...pts].reverse()) forma.lineTo(-z, y);
    const geo = new THREE.ShapeGeometry(forma, 1); geo.rotateY(Math.PI / 2); geo.translate(X_COLA - 0.003, 0, 0);
    g.add(malla(geo, M.negro, 'difusor', false));
  }

  // --- wheels: the rear ones 50 mm closer together (published)
  const plano = rueda(M);
  for (const [xa, via] of [[0, VIA_DEL], [-BATALLA, VIA_TRAS]] as [number, number][]) for (const s of [1, -1]) {
    const r = plano.clone(); r.scale.z = s; r.position.set(xa, R_RUEDA - 0.006, s * via / 2); g.add(r);
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
