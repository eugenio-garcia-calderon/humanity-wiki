// What the 3D view is drawing right now, as rows (2026-11-24, Eugenio: «genera un bot que te diga todo lo que falla»).
// The robot (`scripts/robot-3d.ts`) picks every part of every department in the real page and reads this to compare what the
// viewer shows with what the part should show. Pure three.js: no DOM, no renderer.
import * as THREE from 'three';
import { CAPAS, type CapaId } from './capas';

export interface Pieza3D {
  capa: CapaId;
  /** the names of the groups from the layer down (`niveles` of them) and, after a dot, the mesh's own: the Bala builder's own names */
  ruta: string;
  /** `userData.componente` of the mesh: the tag `partes/subsistemas.ts` `componentes` and `fichaSolo.ts` filter by */
  componente: string;
  /** the material of the meshes (its name, or its colour if it has none): tells a solar cell from the paint */
  material: string;
  mallas: number;
  /** how many of those meshes are drawn now (their own and every ancestor's `visible`) */
  visibles: number;
  /** the box of what is drawn, in the layer's own axes, [x0, y0, z0, x1, y1, z1] in metres; null if nothing */
  caja: number[] | null;
}

/** The meshes of every layer grouped by (layer, route, tag), with how many are visible and where they are. */
export function inspeccionar(G: Record<CapaId, THREE.Object3D>, niveles = 2): Pieza3D[] {
  const filas = new Map<string, Pieza3D & { b: THREE.Box3 }>();
  const t = new THREE.Box3();
  for (const c of CAPAS) {
    const g = G[c.k]; if (!g) continue;
    g.updateMatrixWorld(true);
    g.traverse((m: any) => {
      if (!m.isMesh) return;
      const nombres: string[] = [];
      let visible = true;
      for (let p: THREE.Object3D | null = m; p && p !== g; p = p.parent) { if (!p.visible) visible = false; if (p !== m && p.name) nombres.unshift(p.name); }
      if (!g.visible) visible = false;
      const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial | undefined;
      const material = mat?.name || (mat?.color ? `#${mat.color.getHexString()}${mat.map ? '+mapa' : ''}` : '?');
      const propio = m.name ? `·${m.name}` : '', ruta = (nombres.slice(0, niveles).join('/') + propio) || '(sin nombre)', componente = m.userData.componente ?? '', k = `${c.k}|${ruta}|${componente}|${material}`;
      let f = filas.get(k);
      if (!f) { f = { capa: c.k, ruta, componente, material, mallas: 0, visibles: 0, caja: null, b: new THREE.Box3() }; filas.set(k, f); }
      f.mallas++;
      if (visible) {
        f.visibles++;
        m.geometry.computeBoundingBox?.();
        if (m.geometry.boundingBox) { t.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); f.b.union(t); }
      }
    });
  }
  return [...filas.values()].map(({ b, ...f }) => ({ ...f, caja: b.isEmpty() ? null : [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].map(v => Math.round(v * 1000) / 1000) }));
}

/**
 * Where what is drawn lands on the screen: the box of every visible mesh, projected by the camera, in normalised screen
 * coordinates (-1…1 across the viewer, y up). `x1 - x0` of 2 is the whole width. Null if nothing is drawn.
 */
export function encuadre(G: Record<CapaId, THREE.Object3D>, camara: THREE.Camera): { x0: number; x1: number; y0: number; y1: number; n: number } | null {
  const b = new THREE.Box3(), t = new THREE.Box3();
  let n = 0;
  for (const c of CAPAS) {
    const g = G[c.k]; if (!g || !g.visible) continue;
    g.updateMatrixWorld(true);
    g.traverse((m: any) => {
      if (!m.isMesh) return;
      for (let p: THREE.Object3D | null = m; p && p !== g; p = p.parent) if (!p.visible) return;
      m.geometry.computeBoundingBox?.();
      if (m.geometry.boundingBox) { t.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); b.union(t); n++; }
    });
  }
  if (!n) return null;
  camara.updateMatrixWorld(); (camara as THREE.PerspectiveCamera).updateProjectionMatrix?.();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
    const v = new THREE.Vector3(x, y, z).project(camara);
    x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
  }
  return { x0, x1, y0, y1, n };
}
