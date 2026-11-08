import * as THREE from 'three';
import type { VehiculoGaraje } from './tipos';
import { E, areaFrontal, envolventeDe, loft, parche, thetaEnAltura, type Est } from './forma';

/**
 * El 1-Litro de Volkswagen (2002), primer prototipo en tándem, antecesor del
 * XL1 (2026-11-07, Eugenio: «añade el XL1 concept… los tres»): 3,47 × 1,25 ×
 * 1,10 m, 290 kg en vacío, Cd 0,159, cabina de avión, tapacubos planos y las
 * ruedas traseras muy juntas. El L1 de 2009 se quitó el 2026-11-08 («están
 * repetidos»: su forma era casi la misma).
 * Datos: Wikipedia, «Volkswagen 1-litre car». La batalla, las vías, los
 * voladizos y la forma no están publicados: salen de fotos de prensa y son
 * aproximados (se dice en `fuente`). Sin logotipos ni rótulos de marca.
 *
 * Ejes del garaje: X hacia delante, eje delantero en x = 0, Y arriba, suelo en
 * y = 0, Z lateral. Metros.
 */

interface Prototipo {
  id: string; nombre: string; largo: number; ancho: number; alto: number; batalla: number;
  viaDel: number; viaTras: number; r: number;
  cuerpo: Est[];
  /** Cúpula de cristal: de x0 a x1, desde la línea de cintura. */
  cupula: { x0: number; x1: number; cintura: number };
  color: number;
  aero: Omit<NonNullable<VehiculoGaraje['aero']>, 'area'> & { area?: number };
  fuente: string;
}

function materiales(color: number) {
  const D = THREE.DoubleSide;
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ side: D, ...p });
  return {
    pintura: fis({ color, roughness: 0.28, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.05 }),
    cristal: fis({ color: 0x0b1016, roughness: 0.04, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.02 }),
    goma: fis({ color: 0x141414, roughness: 0.9 }),
    tapa: fis({ color: 0xc9ccd1, roughness: 0.25, metalness: 0.8, clearcoat: 0.6 }),
    piloto: fis({ color: 0xd0101c, emissive: 0xb00010, emissiveIntensity: 0.9, roughness: 0.15, clearcoat: 1 }),
    luz: fis({ color: 0xf6f8ff, emissive: 0xdfe8ff, emissiveIntensity: 1.0, roughness: 0.15 }),
  };
}
type Mats = ReturnType<typeof materiales>;
const malla = (g: THREE.BufferGeometry, m: THREE.Material, nombre?: string) => {
  const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; if (nombre) o.name = nombre; return o;
};

/** Rueda estrecha con tapacubos plano (los dos prototipos los llevaban). Eje en Z. */
function rueda(M: Mats, R: number, ancho: number): THREE.Group {
  const g = new THREE.Group(); g.name = 'rueda';
  const hw = ancho / 2, rL = R - 0.07, perfil: THREE.Vector2[] = [];
  for (let i = 0; i <= 14; i++) { const a = -Math.PI / 2 + Math.PI * (i / 14); perfil.push(new THREE.Vector2(rL + (R - rL) * (0.5 + 0.5 * Math.cos(a)), hw * Math.sin(a))); }
  const neu = new THREE.LatheGeometry(perfil, 64); neu.rotateX(Math.PI / 2); g.add(malla(neu, M.goma, 'neumatico'));
  const tapa = new THREE.CylinderGeometry(rL + 0.005, rL + 0.005, ancho * 0.8, 48); tapa.rotateX(Math.PI / 2); g.add(malla(tapa, M.tapa, 'tapacubos'));
  return g;
}

function construirCon(p: Prototipo): THREE.Group {
  const M = materiales(p.color);
  const g = new THREE.Group(); g.name = p.id;
  g.add(malla(loft(p.cuerpo, { N: 96, sub: 10 }), M.pintura, 'carroceria'));
  // Cúpula: de la cintura hacia arriba, de lado a lado por encima (cabina de avión).
  const { x0, x1, cintura } = p.cupula;
  g.add(malla(parche(p.cuerpo, x0, x1, e => { const a = thetaEnAltura(e, cintura); return [a, Math.PI - a]; }, { nth: 64, nx: 70 }), M.cristal, 'cupula'));
  // Tiras de luz: delante, a la altura del morro; detrás, rodeando la punta de la cola.
  const xs = p.cuerpo.map(e => e.x), xMorro = Math.max(...xs), xCola = Math.min(...xs);
  g.add(malla(parche(p.cuerpo, xMorro - 0.12, xMorro - 0.16, () => [-0.35, 0.35], { nx: 4, nth: 16, delta: 0.002 }), M.luz, 'faro'));
  g.add(malla(parche(p.cuerpo, xMorro - 0.12, xMorro - 0.16, () => [Math.PI - 0.35, Math.PI + 0.35], { nx: 4, nth: 16, delta: 0.002 }), M.luz, 'faro'));
  g.add(malla(parche(p.cuerpo, xCola + 0.10, xCola + 0.05, () => [-Math.PI / 2, 1.5 * Math.PI], { nx: 4, nth: 48, delta: 0.002 }), M.piloto, 'piloto'));
  for (const [x, via] of [[0, p.viaDel], [-p.batalla, p.viaTras]] as [number, number][]) for (const s of [1, -1]) {
    const r = rueda(M, p.r, 0.1); r.position.set(x, p.r, s * via / 2); g.add(r);
  }
  return g;
}

function vehiculo(p: Prototipo): VehiculoGaraje {
  // Área frontal, si no está publicada: cuerpo más lo que asoma de las ruedas bajo los bajos.
  const yb = Math.min(...p.cuerpo.map(e => e.yb));
  const area = p.aero.area ?? Math.round(areaFrontal([
    { es: p.cuerpo, z0: 0 },
    ...[1, -1].map(s => ({ rect: [s * p.viaDel / 2 - 0.05, s * p.viaDel / 2 + 0.05, 0, yb] as [number, number, number, number] })),
  ]) * 100) / 100;
  const medida = p.aero.area == null ? `; área frontal ${area.toLocaleString('es-ES')} m² medida sobre este modelo` : '';
  return {
    id: p.id, nombre: p.nombre, largo: p.largo, ancho: p.ancho, alto: p.alto, batalla: p.batalla, viaDel: p.viaDel, viaTras: p.viaTras,
    fuente: p.fuente,
    aero: { ...p.aero, area, fuente: p.aero.fuente + medida },
    envolvente: envolventeDe(p.cuerpo), seccion: 2.4,
    construir: () => construirCon(p),
  };
}

/** 1-Litro de 2002: más corto y bajo, cabina de avión, ruedas traseras muy juntas. */
export const VEHICULO_1LITRO = vehiculo({
  id: 'unlitro', nombre: 'VW 1-Litro 2002', largo: 3.47, ancho: 1.25, alto: 1.10, batalla: 2.2, viaDel: 1.05, viaTras: 0.76, r: 0.27,
  cuerpo: [
    E(0.62, 0.33, 0.37, 0.02, 0.03, 0.02, 2.2),
    E(0.56, 0.22, 0.48, 0.21, 0.27, 0.17, 2.3),
    E(0.42, 0.16, 0.56, 0.40, 0.47, 0.31, 2.4),
    E(0.20, 0.13, 0.62, 0.55, 0.60, 0.40, 2.5),
    E(0.00, 0.12, 0.67, 0.59, 0.625, 0.42, 2.5),
    E(-0.30, 0.12, 0.80, 0.57, 0.60, 0.38, 2.5),
    E(-0.65, 0.12, 0.98, 0.52, 0.56, 0.34, 2.4),
    E(-1.00, 0.12, 1.08, 0.49, 0.53, 0.31, 2.4),
    E(-1.35, 0.12, 1.10, 0.47, 0.51, 0.30, 2.4),
    E(-1.75, 0.13, 1.05, 0.46, 0.50, 0.28, 2.4),
    E(-2.20, 0.16, 0.90, 0.43, 0.46, 0.24, 2.4),
    E(-2.50, 0.24, 0.77, 0.31, 0.34, 0.18, 2.3),
    E(-2.72, 0.35, 0.64, 0.16, 0.18, 0.10, 2.3),
    E(-2.85, 0.46, 0.53, 0.02, 0.03, 0.02, 2.2),
  ],
  cupula: { x0: -0.18, x1: -1.85, cintura: 0.76 },
  color: 0xd3d7dc,
  aero: { cd: 0.159, masaVacio: 290, plazas: 2, fuente: 'Cd 0,159 y 290 kg en vacío: Wikipedia, «Volkswagen 1-litre car»' },
  fuente: 'Wikipedia, «Volkswagen 1-litre car»: 3 470 × 1 250 × 1 100 mm. Batalla, vías y forma, aproximadas a partir de fotos de prensa',
});
