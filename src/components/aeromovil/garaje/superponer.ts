import * as THREE from 'three';
import type { VehiculoGaraje } from './tipos';

/**
 * «Superponer» (2026-11-07, Eugenio: «permite compararlos superponiendo uno
 * encima de otro»): cada coche del garaje se pone encima del Aeromóvil como un
 * fantasma de su color, con su silueta de lado, de planta y de frente dibujada
 * por encima de todo. El color es fijo por coche para que la leyenda no cambie.
 */
export const COLOR_SUPERPUESTO: Record<string, number> = {
  twizy: 0xf59e0b, aptera: 0x0ea5e9, xl1: 0xa855f7, unlitro: 0xf97316,
  aerorider: 0xec4899,
  tesla3: 0xef4444, caterham7: 0x22c55e, jaguarD: 0x14b8a6,
  szemission: 0x6366f1,
};
export const colorSuperpuesto = (id: string) => COLOR_SUPERPUESTO[id] ?? 0x64748b;
export const colorCss = (id: string) => `#${colorSuperpuesto(id).toString(16).padStart(6, '0')}`;

/**
 * Convierte en fantasma las mallas que aún no lo son (se puede llamar varias
 * veces: el Twizy, por ejemplo, recibe su carrocería cuando acaba de descargarse).
 * Cada malla se pinta dos veces: primero solo su profundidad y después el color
 * translúcido con «menor o igual», así se ve la piel de delante y no un lío
 * de piezas interiores unas encima de otras.
 */
export function hacerFantasma(obj: THREE.Object3D, color: number) {
  let mats = obj.userData.matsFantasma as { color: THREE.Material; prof: THREE.Material } | undefined;
  if (!mats) {
    mats = {
      color: new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false, depthFunc: THREE.LessEqualDepth, roughness: 0.5, metalness: 0, side: THREE.FrontSide }),
      prof: new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.FrontSide }),
    };
    obj.userData.matsFantasma = mats;
  }
  const nuevas: THREE.Mesh[] = [];
  obj.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh && !m.userData.fantasma && !m.userData.profundidad) nuevas.push(m); });
  for (const m of nuevas) {
    m.userData.fantasma = true; m.material = mats.color; m.renderOrder = 6; m.castShadow = false; m.receiveShadow = false;
    const p = new THREE.Mesh(m.geometry, mats.prof); p.userData.profundidad = true; p.renderOrder = 5; p.castShadow = false; m.add(p);
  }
}

/** Libera los materiales del fantasma (las geometrías las libera quien vacía el garaje). */
export function liberarFantasma(obj: THREE.Object3D) {
  const mats = obj.userData.matsFantasma as { color: THREE.Material; prof: THREE.Material } | undefined;
  if (mats) { mats.color.dispose(); mats.prof.dispose(); }
}

/**
 * Siluetas nítidas sacadas de la envolvente del coche, dibujadas encima de
 * todo: perfil de lado (en z = 0), contorno de planta (en el suelo) y la
 * sección mayor (de frente). Son las que se leen en las vistas Lateral,
 * Planta y Frontal.
 */
/** Qué silueta se ve en cada vista: la de lado en Lateral y 3/4, la de planta en Planta, la sección de frente en Frontal y Trasera. */
export function mostrarSiluetas(grupo: THREE.Object3D, vista: string) {
  const ver = vista === 'top' ? 'planta' : vista === 'front' || vista === 'back' ? 'frente' : 'lado';
  grupo.traverse(o => { if (o.parent?.name === 'siluetas') o.visible = o.name === ver; });
}

export function siluetas(def: VehiculoGaraje, color: number): THREE.Group {
  const g = new THREE.Group(); g.name = 'siluetas'; g.userData.profundidad = true;
  const env = def.envolvente; if (!env || env.length < 2) return g;
  const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.8), transparent: true, opacity: 1, depthTest: false, depthWrite: false });
  const linea = (pts: THREE.Vector3[], nombre: string) => { const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat); l.name = nombre; l.renderOrder = 8; l.userData.profundidad = true; g.add(l); };
  linea(env.map(e => new THREE.Vector3(e[0], e[2], 0)).concat(env.map(e => new THREE.Vector3(e[0], e[1], 0)).reverse()), 'lado');
  linea(env.map(e => new THREE.Vector3(e[0], 0.006, e[3])).concat(env.map(e => new THREE.Vector3(e[0], 0.006, -e[3])).reverse()), 'planta');
  // sección mayor, como superelipse
  let iM = 0; env.forEach((e, i) => { if ((e[2] - e[1]) * e[3] > (env[iM][2] - env[iM][1]) * env[iM][3]) iM = i; });
  const [x, yb, yt, hw] = env[iM], n = def.seccion ?? 3, yc = (yb + yt) / 2, h = (yt - yb) / 2, sec: THREE.Vector3[] = [];
  for (let k = 0; k < 96; k++) {
    const th = (k / 96) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    sec.push(new THREE.Vector3(x, yc + h * Math.sign(s) * Math.pow(Math.abs(s), 2 / n), hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / n)));
  }
  linea(sec, 'frente');
  return g;
}
