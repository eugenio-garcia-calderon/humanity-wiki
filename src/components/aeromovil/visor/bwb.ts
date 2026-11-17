// The blended-wing-body fairing's 3D (2026-11-17): the two wings from the model's vertex grid (triciclo/bwb.ts), in the
// body's own paint, and a thin dark line on each fold hinge. Drawn by visor/triciclo.ts into the «Carrocería» layer.
import * as THREE from 'three';
import type { CarenadoBWB } from '../triciclo/bwb';

/** One wing as a mesh: `lado` 1 the right one (+z), −1 its mirror. Outward normals both sides (the mirror flips the winding). */
function ala(w: CarenadoBWB, lado: 1 | -1, mat: THREE.Material): THREE.Mesh {
  const nE = w.estaciones, nA = w.puntosAnillo, v = w.vista;
  // the vertices, plus one per tip: the centre of the last ring, which closes the tip
  const pos = new Float32Array((nE * nA + 1) * 3);
  for (let k = 0; k < nE * nA; k++) { pos[3 * k] = v[3 * k]; pos[3 * k + 1] = v[3 * k + 1]; pos[3 * k + 2] = lado * v[3 * k + 2]; }
  const c = nE * nA; let cx = 0, cy = 0, cz = 0;
  for (let j = 0; j < nA; j++) { const k = (nE - 1) * nA + j; cx += pos[3 * k]; cy += pos[3 * k + 1]; cz += pos[3 * k + 2]; }
  pos[3 * c] = cx / nA; pos[3 * c + 1] = cy / nA; pos[3 * c + 2] = cz / nA;
  const idx: number[] = [];
  const t = (a: number, b: number, d: number) => (lado === 1 ? idx.push(a, b, d) : idx.push(a, d, b));
  for (let i = 1; i < nE; i++) for (let j = 0; j < nA; j++) {
    const a = (i - 1) * nA + j, b = i * nA + j, cc = i * nA + (j + 1) % nA, d = (i - 1) * nA + (j + 1) % nA;
    t(a, b, cc); t(a, cc, d);
  }
  for (let j = 0; j < nA; j++) t((nE - 1) * nA + j, c, (nE - 1) * nA + (j + 1) % nA);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.name = 'carenado-bwb'; m.userData.lado = lado;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** Both wings and their hinge lines, as one group. */
export function construirBWB(w: CarenadoBWB, pintura: THREE.Material, junta: THREE.Material): THREE.Group {
  const G = new THREE.Group(); G.name = 'carenado-bwb';
  G.add(ala(w, 1, pintura), ala(w, -1, pintura));
  // the fold: a dark seam over the hinge station's upper surface, both wings
  const nA = w.puntosAnillo, i = w.bisagra.estacion, v = w.vista, mitad = Math.floor(nA / 2);
  for (const lado of [1, -1] as const) {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= mitad; j++) { const k = (i * nA + j) * 3; pts.push(new THREE.Vector3(v[k], v[k + 1], lado * v[k + 2])); }
    const curva = new THREE.CatmullRomCurve3(pts);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curva, 40, 0.004, 5, false), junta);
    m.name = 'carenado-bwb-bisagra';
    G.add(m);
  }
  return G;
}
