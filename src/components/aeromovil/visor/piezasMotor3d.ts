// «Mostrar solo esta pieza» in the 3D (2026-11-17): inside the «Motor» layer, hide every mesh whose `componente` is not
// among the chosen ones, and tag what stays with small labels. The registry of parts and groups is ../piezasMotor.ts.
import * as THREE from 'three';
import { GRUPOS_MOTOR, NOMBRES_PIEZA } from '../piezasMotor';

export interface OpcionesPiezas {
  /** The parts (`componente`) to keep; null: the whole layer. */
  solo: string[] | null;
  /** Small labels over what is shown: one per group, or one per part when a single group (or part) is shown. */
  etiquetas: boolean;
}
/** How far the camera will be (m): the labels are a fixed size on screen, so how much room they take in the scene
 *  depends on it; two that would cover each other are stacked. */
export const ALTO_ETIQUETA = 0.02;

const NOMBRE_ETIQUETAS = 'etiquetas-piezas-motor';

/** A short label, fixed size on screen, drawn over everything; it does not catch clicks. */
function etiqueta(texto: string): THREE.Sprite {
  const cv = document.createElement('canvas'), g = cv.getContext('2d')!, px = 28;
  g.font = `600 ${px}px Inter, system-ui, sans-serif`;
  const W = Math.ceil(g.measureText(texto).width) + 30, H = 46;
  cv.width = W; cv.height = H;
  g.fillStyle = 'rgba(255,255,255,0.93)'; g.strokeStyle = 'rgba(15,118,110,0.6)'; g.lineWidth = 2.5;
  g.beginPath(); g.roundRect(2, 2, W - 4, H - 4, 12); g.fill(); g.stroke();
  g.font = `600 ${px}px Inter, system-ui, sans-serif`; g.fillStyle = '#0f172a'; g.textBaseline = 'middle'; g.fillText(texto, 15, H / 2 + 1);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, toneMapped: false, sizeAttenuation: false }));
  const alto = 0.02; sp.scale.set(alto * W / H, alto, 1); sp.renderOrder = 8;
  sp.center.set(0.5, 0); sp.raycast = () => {};
  return sp;
}

/** Shows only `o.solo` in the «Motor» layer (or all of it with null) and puts the labels. Call it after every rebuild too. */
export function aplicarPiezasMotor(motor: THREE.Object3D, o: OpcionesPiezas | null, distancia = 2) {
  const viejas = motor.getObjectByName(NOMBRE_ETIQUETAS);
  if (viejas) { viejas.traverse((c: any) => { if (c.isSprite) { c.material.map?.dispose(); c.material.dispose(); } }); motor.remove(viejas); }
  const solo = o?.solo ? new Set(o.solo) : null;
  motor.traverse((m: any) => {
    if (!m.isMesh) return;
    const fuera = !!solo && !solo.has(m.userData.componente);
    if (fuera) { if (m.visible) { m.visible = false; m.userData.ocultaSolo = true; } }
    else if (m.userData.ocultaSolo) { m.visible = true; m.userData.ocultaSolo = false; }
  });
  if (!o?.etiquetas) return;
  // ── the labels: by group, or by part when everything shown is one group
  motor.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(motor.matrixWorld).invert();
  const cajas = new Map<string, THREE.Box3>(), tmp = new THREE.Box3();
  motor.traverse((m: any) => {
    if (!m.isMesh || !m.visible || !m.userData.componente) return;
    m.geometry.computeBoundingBox?.();
    tmp.copy(m.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    const k = m.userData.componente as string, b = cajas.get(k);
    if (b) b.union(tmp); else cajas.set(k, tmp.clone());
  });
  const comps = [...cajas.keys()];
  const grupos = GRUPOS_MOTOR.filter(g => g.componentes.some(c => cajas.has(c)));
  const porPieza = grupos.length <= 1;
  const marcas: { texto: string; caja: THREE.Box3 }[] = porPieza
    ? comps.map(c => ({ texto: NOMBRES_PIEZA[c] ?? c, caja: cajas.get(c)! }))
    : grupos.map(g => ({ texto: g.n, caja: g.componentes.filter(c => cajas.has(c)).reduce((b, c) => b.union(cajas.get(c)!), new THREE.Box3()) }));
  const grupo = new THREE.Group(); grupo.name = NOMBRE_ETIQUETAS;
  // over the top of each part; a label that would cover one already placed (seen from about `distancia`) goes up
  const h = ALTO_ETIQUETA * distancia * 1.15, puestos: { c: THREE.Vector3; w: number }[] = [];
  for (const mk of marcas.sort((a, b) => a.caja.max.y - b.caja.max.y)) {
    const s = etiqueta(mk.texto), w = h * s.scale.x / s.scale.y;
    const c = mk.caja.getCenter(new THREE.Vector3()); c.y = mk.caja.max.y + 0.02;
    while (puestos.some(p => Math.hypot(p.c.x - c.x, p.c.z - c.z) < (p.w + w) / 2 && Math.abs(p.c.y - c.y) < h)) c.y += h / 2;
    puestos.push({ c: c.clone(), w });
    s.position.copy(c); grupo.add(s);
  }
  motor.add(grupo);
}

/** The box (in world axes) of what the «Motor» layer shows now, for the camera to frame it; null if nothing. */
export function cajaVisibleMotor(motor: THREE.Object3D): THREE.Box3 | null {
  motor.updateMatrixWorld(true);
  const b = new THREE.Box3(), t = new THREE.Box3();
  let alguna = false;
  motor.traverse((m: any) => {
    if (!m.isMesh || !m.visible) return;
    for (let p = m.parent; p; p = p.parent) if (!p.visible) return;
    m.geometry.computeBoundingBox?.(); t.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); b.union(t); alguna = true;
  });
  return alguna ? b : null;
}
