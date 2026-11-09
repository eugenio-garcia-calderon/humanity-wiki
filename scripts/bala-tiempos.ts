/**
 * How long the editor's Bala takes to build, full and quick (the preview while a slider is dragged).
 * Run with: npx tsx scripts/bala-tiempos.ts
 * Node has no GPU and no canvas, so this is the geometry only; the browser adds the upload to the GPU.
 */
import { crearForma, DIM_REF } from '../src/components/aeromovil/garaje/balaForma';
import { construirCon, crearMateriales } from '../src/components/aeromovil/garaje/balaModelo';

const M = crearMateriales();
const medir = (n: string, f: () => unknown, veces = 5) => {
  const t: number[] = [];
  for (let i = 0; i < veces; i++) { const t0 = performance.now(); f(); t.push(performance.now() - t0); }
  t.sort((a, b) => a - b);
  console.log(`${n.padEnd(34)} mediana ${t[Math.floor(veces / 2)].toFixed(0).padStart(4)} ms · mín ${t[0].toFixed(0)} · máx ${t[veces - 1].toFixed(0)}`);
};
let k = 0;
// a new shape every time, as when a slider moves (the caches start empty)
const forma = () => crearForma({ ...DIM_REF, batalla: 2.45 + (k++ % 7) * 0.01 });
medir('crearForma', () => forma(), 9);
medir('construir completa', () => construirCon(forma(), { M, cupulaAparte: true }));
medir('construir rápida', () => construirCon(forma(), { M, calidad: 'rapida', cupulaAparte: true }));
