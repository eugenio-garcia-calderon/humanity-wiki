// The driver's chainless pedals in 3D (2026-11-24): the generator on the crank axle, the two cranks and their pedals.
// Geometry from bici/pedales.ts `pedalesDe` (the model's `pedalesBici`): the axle's place, the crank length and the
// pedals' spread. Drawn with the right crank forward and the left one back: the right pedal is then where the drawn
// rider's extended foot is when the axle has not been moved from it. No chain, no sprocket: there is none.
import * as THREE from 'three';
import type { Mats } from './materiales';
import { tube, disk, box, etiquetar } from './primitivas';

export function dibujarPedales(g: THREE.Object3D, p: { eje: [number, number]; biela: number; z: number; generador: { r: number; ancho: number } }, M: Mats) {
  const G = new THREE.Group(); G.name = 'pedales';
  const [x, y] = p.eje, zc = p.z - 0.045;   // the cranks' plane: the pedal's middle is 4.5 cm outboard of it
  disk(G, [x, y, 0], p.generador.r, p.generador.ancho, M.motor);
  tube(G, [x, y, -zc], [x, y, zc], 0.022, M.alu);
  for (const s of [1, -1]) {
    const px = x + s * p.biela;
    tube(G, [x, y, s * zc], [px, y, s * zc], 0.024, M.alu);
    tube(G, [px, y, s * zc], [px, y, s * (p.z + 0.045)], 0.012, M.alu);
    box(G, [px, y, s * p.z], [0.095, 0.022, 0.09], M.black);
  }
  etiquetar(G, 'pedales');
  g.add(G);
}
