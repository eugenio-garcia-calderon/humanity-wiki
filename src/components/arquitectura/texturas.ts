// ============================================================================
// ARQUITECTURA · GROUND TEXTURES, PAINTED ONCE IN THE BROWSER (2026-11-05)
// ============================================================================
// Asphalt, cobbles, red bike lane, grass, water, stone slabs… are drawn on a
// small canvas the first time they are needed (no image is downloaded) and
// tiled across the ground with world-space coordinates, so a cobble is the
// same size everywhere: `TAM` is how many metres one copy of the texture covers.
// Far away the GPU's mipmaps average them back to the plain colour of the plan.

import * as THREE from 'three';
import { SUELO } from './paleta';

type Pintor = (ctx: CanvasRenderingContext2D, n: number, base: string) => void;

function rnd(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function ruido(ctx: CanvasRenderingContext2D, n: number, base: string, amp: number, puntos: number, tam: number, seed = 7) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, n, n);
  const r = rnd(seed);
  for (let i = 0; i < puntos; i++) {
    const v = (r() - 0.5) * amp;
    ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    const s = tam * (0.5 + r());
    ctx.fillRect(r() * n, r() * n, s, s);
  }
}

const PINTORES: Record<string, Pintor> = {
  calzada: (c, n, b) => ruido(c, n, b, 0.22, 9000, 1.6, 3),
  bici: (c, n, b) => ruido(c, n, b, 0.12, 4000, 2, 5),
  peatonal: (c, n, b) => adoquin(c, n, b, 8, 4),
  camino: (c, n, b) => adoquin(c, n, b, 6, 3),
  plaza: (c, n, b) => losas(c, n, b, 4),
  gota: (c, n, b) => losas(c, n, b, 3),
  cesped: (c, n, b) => ruido(c, n, b, 0.16, 7000, 3, 11),
  suelo: (c, n, b) => ruido(c, n, b, 0.14, 6000, 3, 13),
  parque: (c, n, b) => ruido(c, n, b, 0.16, 6000, 3, 17),
  huerto: (c, n, b) => ruido(c, n, b, 0.2, 6000, 2.5, 19),
  bosque: (c, n, b) => ruido(c, n, b, 0.22, 7000, 4, 23),
  agricultura: (c, n, b) => surcos(c, n, b),
  produccion: (c, n, b) => ruido(c, n, b, 0.2, 9000, 1.5, 29),
  bancalA: (c, n, b) => surcos(c, n, b), bancalB: (c, n, b) => surcos(c, n, b),
  bancalC: (c, n, b) => surcos(c, n, b), bancalD: (c, n, b) => surcos(c, n, b),
  senda: (c, n, b) => ruido(c, n, b, 0.2, 5000, 1.5, 31),
  agua: (c, n, b) => agua(c, n, b),
  via: (c, n, b) => vias(c, n, b),
};
/** Metres covered by one copy of each texture. */
export const TAM: Record<string, number> = {
  calzada: 8, bici: 6, peatonal: 3, camino: 3, plaza: 6, gota: 5, cesped: 24, suelo: 24, parque: 24, huerto: 10,
  bosque: 20, agricultura: 14, produccion: 10, bancalA: 6, bancalB: 6, bancalC: 6, bancalD: 6, senda: 4, agua: 18, via: 8,
};

function adoquin(c: CanvasRenderingContext2D, n: number, base: string, filas: number, cols: number) {
  ruido(c, n, base, 0.08, 1500, 2, 41);
  const h = n / filas, w = n / cols;
  c.strokeStyle = 'rgba(70,55,40,0.55)'; c.lineWidth = n / 120;
  for (let i = 0; i <= filas; i++) {
    c.beginPath(); c.moveTo(0, i * h); c.lineTo(n, i * h); c.stroke();
    const off = i % 2 ? w / 2 : 0;
    for (let j = 0; j <= cols; j++) { c.beginPath(); c.moveTo(j * w + off, i * h); c.lineTo(j * w + off, (i + 1) * h); c.stroke(); }
  }
}
function losas(c: CanvasRenderingContext2D, n: number, base: string, k: number) {
  ruido(c, n, base, 0.07, 2000, 2, 43);
  c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = n / 160;
  for (let i = 0; i <= k; i++) {
    c.beginPath(); c.moveTo(0, (i * n) / k); c.lineTo(n, (i * n) / k); c.stroke();
    c.beginPath(); c.moveTo((i * n) / k, 0); c.lineTo((i * n) / k, n); c.stroke();
  }
}
function surcos(c: CanvasRenderingContext2D, n: number, base: string) {
  ruido(c, n, base, 0.12, 3000, 2, 47);
  c.fillStyle = 'rgba(80,55,30,0.35)';
  for (let i = 0; i < 8; i++) c.fillRect(0, (i * n) / 8, n, n / 40);
}
function agua(c: CanvasRenderingContext2D, n: number, base: string) {
  ruido(c, n, base, 0.08, 1500, 4, 53);
  const r = rnd(59);
  c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = n / 200;
  for (let i = 0; i < 60; i++) { const x = r() * n, y = r() * n, l = n * (0.03 + r() * 0.06); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y - l / 6, x + l, y); c.stroke(); }
}
function vias(c: CanvasRenderingContext2D, n: number, base: string) {
  ruido(c, n, base, 0.2, 5000, 2, 61);
  c.fillStyle = 'rgba(120,90,60,0.9)';
  for (let i = 0; i < 10; i++) c.fillRect((i * n) / 10, 0, n / 30, n);
}

const cache = new Map<string, THREE.Texture>();
/** The tiled texture of a ground layer, or null for layers drawn as flat colour. */
export function textura(capa: string): THREE.Texture | null {
  if (cache.has(capa)) return cache.get(capa)!;
  const pintor = PINTORES[capa];
  if (!pintor || typeof document === 'undefined') { cache.set(capa, null as any); return null; }
  const n = 256;
  const cv = document.createElement('canvas'); cv.width = cv.height = n;
  pintor(cv.getContext('2d')!, n, SUELO[capa] ?? '#888888');
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  cache.set(capa, t);
  return t;
}
