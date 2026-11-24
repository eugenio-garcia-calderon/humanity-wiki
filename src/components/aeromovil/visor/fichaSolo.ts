// «Only this component» in the 3D (2026-11-24, Eugenio: «solo se muestra en el diseño 3D ese componente y puedo girarlo,
// moverlo»). A component of `fichas/registro.ts` is one or more layers (visor/capas.ts), optionally narrowed to the meshes
// tagged `userData.componente`. Selecting it hides every other layer and, when it names tags, every other mesh in its own.
import * as THREE from 'three';
import { CAPAS, type CapaId } from './capas';

export interface SeleccionFicha { capas: CapaId[]; componentes?: string[] }

let huboFiltro = false;

/**
 * Layer visibility = what the page asks for (`visibles`) ∩ the selected component's layers; and, inside them, the mesh
 * filter. Idempotent: call it on every change of either and after every rebuild (a rebuild makes new meshes, all visible).
 */
export function aplicarFichaSolo(G: Record<CapaId, THREE.Object3D>, visibles: Record<CapaId, boolean>, sel: SeleccionFicha | null) {
  for (const c of CAPAS) { const g = G[c.k]; if (g) g.visible = visibles[c.k] && (!sel || sel.capas.includes(c.k)); }
  if (!sel?.componentes && !huboFiltro) return;
  huboFiltro = false;
  for (const c of CAPAS) {
    const g = G[c.k]; if (!g) continue;
    const filtra = !!sel?.componentes && sel.capas.includes(c.k);
    g.traverse((m: any) => {
      if (!m.isMesh) return;
      if (filtra && !sel!.componentes!.includes(m.userData.componente)) { if (m.visible) { m.visible = false; m.userData.ocultaFicha = true; } huboFiltro = true; }
      else if (m.userData.ocultaFicha) { m.visible = true; m.userData.ocultaFicha = false; }
    });
  }
}

/** The box (world axes) of what the selected layers draw now, for the camera to frame; null if nothing. */
export function cajaDeCapas(G: Record<CapaId, THREE.Object3D>, capas: CapaId[]): THREE.Box3 | null {
  const b = new THREE.Box3(), t = new THREE.Box3();
  let alguna = false;
  for (const k of capas) {
    const g = G[k]; if (!g) continue;
    g.updateMatrixWorld(true);
    g.traverse((m: any) => {
      if (!m.isMesh || !m.visible) return;
      for (let p = m.parent; p; p = p.parent) if (!p.visible) return;
      m.geometry.computeBoundingBox?.(); t.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); b.union(t); alguna = true;
    });
  }
  return alguna ? b : null;
}
