/**
 * Geometry fingerprint of the garage «Cuadriciclo Bala»: every mesh's vertex count and a weighted sum of its
 * positions and index list, plus the tunnel envelope. Run before and after a change to the Bala's shape code:
 * identical output means the garage model did not move by a single vertex.
 * Run with: npx tsx scripts/bala-huella.ts [salida.json] [comparar-con.json]
 *
 * `--editor` (2026-11-10, with the Triciclo Bala): fingerprints the editor's default Cuadriciclo instead, built
 * the way the viewer builds it (PARAMETROS_BALA, its own materials, the canopy hinged apart). The Triciclo
 * reuses this shape code, so both must stay the same.
 */
import * as THREE from 'three';
import { readFileSync, writeFileSync } from 'node:fs';
import { VEHICULO } from '../src/components/aeromovil/garaje/bala';
import { PARAMETROS_BALA, crearModelo, type ModeloBala } from '../src/components/aeromovil/geometria';
import { construirCon, crearMateriales } from '../src/components/aeromovil/garaje/balaModelo';

const editor = process.argv.includes('--editor');
const t0 = performance.now();
const me = editor ? crearModelo(PARAMETROS_BALA) as ModeloBala : null;
const g = me ? construirCon(me.F, { M: crearMateriales(), cupulaAparte: true, asientos: me.sillines, aleta: me.aleta }) : VEHICULO.construir();
const t1 = performance.now();
const mallas: Record<string, number[]> = {};
let n = 0;
g.updateMatrixWorld(true);
g.traverse(o => {
  const m = o as THREE.Mesh; if (!m.isMesh) return;
  const p = m.geometry.getAttribute('position'), idx = m.geometry.getIndex();
  let s = 0, s2 = 0;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p as THREE.BufferAttribute, i).applyMatrix4(m.matrixWorld); s += v.x * 1.3 + v.y * 2.7 + v.z * 3.1; s2 += (v.x * v.y + v.z) * ((i % 7) + 1); }
  let si = 0; if (idx) for (let i = 0; i < idx.count; i++) si += idx.getX(i) * ((i % 5) + 1);
  const k = `${String(n++).padStart(3, '0')} ${m.name}`;
  mallas[k] = [p.count, idx?.count ?? 0, Math.round(s * 1e3) / 1e3, Math.round(s2 * 1e3) / 1e3, si];
});
const salida = me
  ? { largo: me.Lf, ancho: me.anchoTotal, alto: me.alto, batalla: me.P.B, envolvente: me.F.envolvente(), mallas }
  : { largo: VEHICULO.largo, ancho: VEHICULO.ancho, alto: VEHICULO.alto, batalla: VEHICULO.batalla, envolvente: VEHICULO.envolvente, mallas };
const [f, otro] = process.argv.slice(2).filter(a => a !== '--editor');
if (f) writeFileSync(f, JSON.stringify(salida));
console.log(`construir(): ${Math.round(t1 - t0)} ms, ${Object.keys(mallas).length} mallas, ${Object.values(mallas).reduce((a, b) => a + b[1] / 3, 0)} triángulos`);
if (otro) {
  const a = JSON.parse(readFileSync(otro, 'utf8'));
  let dif = 0;
  for (const k of ['largo', 'ancho', 'alto', 'batalla']) if (a[k] !== (salida as any)[k]) { console.log(`DISTINTO ${k}: ${a[k]} → ${(salida as any)[k]}`); dif++; }
  if (JSON.stringify(a.envolvente) !== JSON.stringify(salida.envolvente)) { console.log('DISTINTA la envolvente'); dif++; }
  const ka = Object.keys(a.mallas), kb = Object.keys(mallas);
  if (ka.length !== kb.length) { console.log(`DISTINTO número de mallas: ${ka.length} → ${kb.length}`); dif++; }
  for (const k of new Set([...ka, ...kb])) {
    const x = a.mallas[k], y = mallas[k];
    if (!x || !y) { console.log(`falta ${k} en ${x ? 'después' : 'antes'}`); dif++; continue; }
    const mal = x.some((v: number, i: number) => Math.abs(v - y[i]) > (i >= 2 && i <= 3 ? 0.01 : 0));
    if (mal) { console.log(`DISTINTA ${k}: ${x.join(' ')} → ${y.join(' ')}`); dif++; }
  }
  console.log(dif ? `${dif} diferencias` : 'IGUAL: misma envolvente y mismas mallas, vértice a vértice');
  process.exit(dif ? 1 : 0);
}
