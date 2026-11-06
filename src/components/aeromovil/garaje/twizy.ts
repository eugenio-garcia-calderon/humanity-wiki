import * as THREE from 'three';
import type { VehiculoGaraje } from './tipos';

// Pendiente: lo modela un bot (2026-11-06). Mientras, una caja con las medidas reales.
export const VEHICULO: VehiculoGaraje = {
  id: 'twizy', nombre: 'twizy', largo: 4, ancho: 1.8, alto: 1.4, batalla: 2.5, fuente: 'pendiente',
  construir: () => {
    const g = new THREE.Group();
    const caja = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 1.8), new THREE.MeshStandardMaterial({ color: 0x888888, transparent: true, opacity: 0.3 }));
    caja.position.set(-2.5 / 2 + 0.6, 0.7, 0); g.add(caja);
    return g;
  },
};
