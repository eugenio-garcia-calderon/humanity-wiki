import * as THREE from 'three';
import type { VehiculoGaraje } from './tipos';
import { E, areaFrontal, envolventeDe, loft, parche, thetaEnAltura, type Est } from './forma';

/**
 * Aptera (Launch Edition, 2023–), dibujado por código.
 *
 * Medidas: largo 4 496 mm, ancho 2 225 mm (con los carenados de las ruedas),
 * alto 1 422 mm, batalla 2 743 mm (Wikipedia, ficha del Aptera); bajos a 5″
 * (127 mm) y neumáticos de 16″ (FAQ de Aptera). Lo que no se publica (vía,
 * voladizos, anchura de la carrocería sin los carenados) sale de las fotos de
 * prensa y queda dentro de esas cotas: vía delantera 1,92 m, voladizo
 * delantero 0,78 m, carrocería de 1,44 m.
 *
 * No hay una malla abierta del Aptera (las que hay son de pago o sin
 * licencia), así que el cuerpo son estaciones (`forma.ts`): de las mismas
 * salen la malla, la silueta del túnel y el área frontal.
 *
 * Ejes del garaje: X hacia delante, Y arriba, Z lateral. Eje delantero en
 * x = 0, rueda trasera en x = −2,743, suelo en y = 0. Metros.
 */

const BATALLA = 2.743;
const VIA = 1.92;
const R = 0.295, ANCHO_RUEDA = 0.17;

// ---------------------------------------------------------------- forma
/** El cuerpo, de la punta del morro a la punta de la cola. */
const CUERPO: Est[] = [
  E(0.78, 0.44, 0.47, 0.02, 0.03, 0.02, 2.2),
  E(0.74, 0.30, 0.60, 0.20, 0.27, 0.18, 2.2),
  E(0.66, 0.22, 0.68, 0.33, 0.41, 0.29, 2.3),
  E(0.52, 0.17, 0.74, 0.44, 0.52, 0.38, 2.35),
  E(0.30, 0.14, 0.79, 0.52, 0.61, 0.45, 2.4),
  E(0.00, 0.13, 0.85, 0.58, 0.67, 0.49, 2.45),
  E(-0.30, 0.127, 0.96, 0.61, 0.70, 0.50, 2.45),
  E(-0.65, 0.127, 1.15, 0.62, 0.72, 0.47, 2.45),
  E(-1.00, 0.127, 1.32, 0.62, 0.72, 0.43, 2.45),
  E(-1.40, 0.127, 1.422, 0.61, 0.715, 0.40, 2.45),
  E(-1.80, 0.13, 1.40, 0.58, 0.69, 0.38, 2.45),
  E(-2.20, 0.15, 1.30, 0.53, 0.62, 0.34, 2.4),
  E(-2.60, 0.20, 1.15, 0.44, 0.52, 0.29, 2.35),
  E(-3.00, 0.31, 1.00, 0.31, 0.37, 0.21, 2.3),
  E(-3.35, 0.45, 0.86, 0.18, 0.22, 0.12, 2.25),
  E(-3.60, 0.59, 0.75, 0.07, 0.09, 0.05, 2.2),
  E(-3.718, 0.67, 0.71, 0.015, 0.02, 0.012, 2.2),
];

/** Carenado de una rueda delantera, centrado en su eje (x relativa al eje, z = 0). */
const CARENADO: Est[] = [
  E(0.47, 0.36, 0.40, 0.01, 0.015, 0.01, 2.2),
  E(0.42, 0.22, 0.56, 0.09, 0.11, 0.08, 2.3),
  E(0.32, 0.15, 0.65, 0.13, 0.145, 0.11, 2.5),
  E(0.15, 0.12, 0.70, 0.145, 0.155, 0.12, 2.6),
  E(-0.05, 0.12, 0.70, 0.145, 0.155, 0.12, 2.6),
  E(-0.25, 0.13, 0.66, 0.13, 0.14, 0.11, 2.5),
  E(-0.42, 0.20, 0.56, 0.08, 0.09, 0.07, 2.4),
  E(-0.55, 0.32, 0.44, 0.02, 0.025, 0.02, 2.2),
  E(-0.58, 0.37, 0.39, 0.004, 0.005, 0.004, 2.2),
];

/** Brazo carenado que une cada carenado con el cuerpo: cuerda, grosor, altura, de z0 a z1. */
const BRAZO = { x: -0.02, cuerda: 0.28, grueso: 0.055, y: 0.36, z0: 0.6, z1: VIA / 2 - 0.1 };

// Cristales, paneles solares y luces: parches pegados a la piel, con bordes
// que siguen curvas (la línea de cintura, el corte del techo) y no la rejilla.
const GRADO = Math.PI / 180;
const CINTURA = (x: number) => 0.86 + 0.08 * Math.min(1, Math.max(0, (-x - 1.2) / 0.95));
const TECHO = 64 * GRADO;
/** Ventanilla del lado z > 0: de la cintura al borde del techo, con la esquina de atrás redondeada. */
function ventanilla(e: Est): [number, number] {
  const a = thetaEnAltura(e, CINTURA(e.x)), q = Math.min(1, Math.max(0, (-1.93 - e.x) / 0.22));
  return [a + (TECHO - a) * (1 - Math.sqrt(1 - q * q)), TECHO];
}
const espejo = (r: [number, number]): [number, number] => [Math.PI - r[1], Math.PI - r[0]];

// ---------------------------------------------------------------- materiales
function materiales() {
  const D = THREE.DoubleSide;
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ side: D, ...p });
  return {
    pintura: fis({ color: 0x8e979f, roughness: 0.3, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.05 }),
    cristal: fis({ color: 0x0a0e13, roughness: 0.04, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.02 }),
    solar: fis({ color: 0x101a2a, roughness: 0.12, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.03, sheen: 0.4, sheenColor: new THREE.Color(0x3050a0) }),
    piloto: fis({ color: 0xd0101c, emissive: 0xb00010, emissiveIntensity: 0.9, roughness: 0.15, clearcoat: 1 }),
    luz: fis({ color: 0xf6f8ff, emissive: 0xdfe8ff, emissiveIntensity: 1.1, roughness: 0.15 }),
    negro: fis({ color: 0x15171a, roughness: 0.5, metalness: 0.1 }),
    goma: fis({ color: 0x141414, roughness: 0.9 }),
    tapa: fis({ color: 0x2a2e33, roughness: 0.35, metalness: 0.6, clearcoat: 0.6 }),
  };
}
type Mats = ReturnType<typeof materiales>;

const malla = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], nombre?: string) => {
  const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; if (nombre) o.name = nombre; return o;
};

/** Rueda de 16″ con tapacubos aerodinámico liso. Eje en Z, centro en el origen. */
function rueda(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'rueda';
  const hw = ANCHO_RUEDA / 2, rL = 0.205;
  const perfil: THREE.Vector2[] = [];
  for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + Math.PI * (i / 16); perfil.push(new THREE.Vector2(rL + (R - rL) * (0.55 + 0.45 * Math.cos(a)), hw * Math.sin(a))); }
  const neu = new THREE.LatheGeometry(perfil, 72); neu.rotateX(Math.PI / 2); g.add(malla(neu, M.goma, 'neumatico'));
  const tapa = new THREE.LatheGeometry([new THREE.Vector2(0, hw * 0.95), new THREE.Vector2(rL * 0.6, hw * 0.92), new THREE.Vector2(rL + 0.01, hw * 0.75), new THREE.Vector2(rL + 0.01, -hw * 0.75), new THREE.Vector2(0, -hw * 0.95)], 64);
  tapa.rotateX(Math.PI / 2); g.add(malla(tapa, M.tapa, 'tapacubos'));
  return g;
}

function construir(): THREE.Group {
  const M = materiales();
  const g = new THREE.Group(); g.name = 'aptera';
  g.add(malla(loft(CUERPO, { N: 112, sub: 10 }), M.pintura, 'carroceria'));
  // Parabrisas envolvente: de la línea de cintura hacia arriba, hasta el techo.
  g.add(malla(parche(CUERPO, -0.08, -1.13, e => { const a = thetaEnAltura(e, 0.84); return [a, Math.PI - a]; }, { nth: 64 }), M.cristal, 'parabrisas'));
  // Ventanillas, techo y portón solares, capó solar y la tira de luz de la cola.
  g.add(malla(parche(CUERPO, -1.21, -2.15, ventanilla), M.cristal, 'ventanilla'));
  g.add(malla(parche(CUERPO, -1.21, -2.15, e => espejo(ventanilla(e))), M.cristal, 'ventanilla'));
  g.add(malla(parche(CUERPO, -1.15, -2.95, () => [TECHO + 2 * GRADO, Math.PI - TECHO - 2 * GRADO], { nx: 80 }), M.solar, 'techo-solar'));
  g.add(malla(parche(CUERPO, 0.24, -0.06, () => [60 * GRADO, 120 * GRADO]), M.solar, 'capo-solar'));
  g.add(malla(parche(CUERPO, -3.58, -3.665, () => [-Math.PI / 2, 1.5 * Math.PI], { nx: 6, nth: 64, delta: 0.002 }), M.piloto, 'piloto'));
  // Carenados delanteros con su tira de luz, y los brazos que los unen al cuerpo.
  const luz = (e: Est): [number, number] => [thetaEnAltura(e, 0.42), thetaEnAltura(e, 0.47)];
  for (const s of [1, -1]) {
    const pod = new THREE.Group(); pod.position.z = s * VIA / 2; g.add(pod);
    pod.add(malla(loft(CARENADO, { N: 64, sub: 8 }), M.pintura, 'carenado'));
    pod.add(malla(parche(CARENADO, 0.455, 0.3, luz, { nx: 20, nth: 6 }), M.luz, 'luz'));
    pod.add(malla(parche(CARENADO, 0.455, 0.3, e => espejo(luz(e)), { nx: 20, nth: 6 }), M.luz, 'luz'));
    const brazo = new THREE.CylinderGeometry(1, 1, BRAZO.z1 - BRAZO.z0, 32);
    brazo.rotateX(Math.PI / 2); brazo.scale(BRAZO.cuerda / 2, BRAZO.grueso / 2, 1);
    const b = malla(brazo, M.pintura, 'brazo'); b.position.set(BRAZO.x, BRAZO.y, s * (BRAZO.z0 + BRAZO.z1) / 2); g.add(b);
    const r = rueda(M); r.position.set(0, R, s * VIA / 2); g.add(r);
    // cámaras en lugar de retrovisores
    const cam = new THREE.SphereGeometry(1, 20, 12); cam.scale(0.07, 0.025, 0.03);
    const c = malla(cam, M.negro, 'camara'); c.position.set(-0.3, 0.9, s * 0.67); g.add(c);
  }
  const rt = rueda(M); rt.position.set(-BATALLA, R, 0); g.add(rt);
  return g;
}

/** Área frontal: cuerpo, dos carenados, dos brazos y lo que asoma la rueda trasera bajo la cola. */
const AREA = areaFrontal([
  { es: CUERPO, z0: 0 },
  { es: CARENADO, z0: VIA / 2 }, { es: CARENADO, z0: -VIA / 2 },
  { rect: [BRAZO.z0, BRAZO.z1, BRAZO.y - BRAZO.grueso / 2, BRAZO.y + BRAZO.grueso / 2] },
  { rect: [-BRAZO.z1, -BRAZO.z0, BRAZO.y - BRAZO.grueso / 2, BRAZO.y + BRAZO.grueso / 2] },
  { rect: [-ANCHO_RUEDA / 2, ANCHO_RUEDA / 2, 0, 0.13] },
]);

export const VEHICULO: VehiculoGaraje = {
  id: 'aptera', nombre: 'Aptera',
  largo: 4.496, ancho: 2.225, alto: 1.422, batalla: BATALLA, viaDel: VIA, viaTras: 0,
  fuente: 'Wikipedia, ficha del Aptera (Launch Edition): largo 4 496 mm, ancho 2 225 mm, alto 1 422 mm, batalla 2 743 mm, Cd 0,13 declarado; FAQ de Aptera: bajos a 5″, neumáticos de 16″. Vía y voladizos, de fotos de prensa',
  aero: { cd: 0.13, area: Math.round(AREA * 100) / 100, masaVacio: 998, plazas: 2, vmax: 162.5, fuente: `Cd 0,13: lo declara Aptera (enero de 2023, Wikipedia), sin ensayo publicado. 998 kg (Launch Edition de 44 kWh, Wikipedia); 162,5 km/h (FAQ de Aptera). Área frontal ${(Math.round(AREA * 100) / 100).toLocaleString('es-ES')} m², medida sobre este modelo (cuerpo, carenados y brazos)` },
  envolvente: envolventeDe(CUERPO),
  seccion: 2.45,
  construir,
};
