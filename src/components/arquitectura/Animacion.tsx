// ============================================================================
// ARQUITECTURA · LIFE IN THE COMMUNITY: THE "ANIMAR" BUTTON (2026-11-05)
// ============================================================================
// Eugenio: «un botón que permita animar y que se vean personas caminando por las
// casas, coches circulando, bicicletas y velomóviles ligeros… y que solo se
// cargue esa parte si se da al botón de animar».
//
// This file is its own chunk (React.lazy in Escena.tsx): nobody downloads it
// until they press the button. It adds two models of its own (a person and a
// light velomobile) and moves four crowds — cars, bikes, velomobiles, people —
// along the lane centre lines of the focused community (`mundo.rutas`, plus its
// rings in `mundo.anillos`) and around the nests. Each crowd is ONE instanced
// mesh whose matrices are rewritten every frame: ~220 agents, 4 draw calls.
//
// Movement is decorative: agents follow their lane and loop; they do not see
// each other or stop at crossings.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Mundo } from './geometria';
import { prototipo, piezas } from './prototipos';

const { pieza, unir, caja, cil, M, rueda } = piezas;

function persona() {
  return unir([
    cil(0.16, 0.2, 0.85, 8, '#ffffff', 0, 1.0),                 // body (takes the tint: clothes)
    pieza(new THREE.SphereGeometry(0.13, 10, 8), '#e0b08a', M(0, 1.58)),
    caja(0.12, 0.82, 0.14, '#3a3f45', 0, 0.41, 0.08), caja(0.12, 0.82, 0.14, '#3a3f45', 0, 0.41, -0.08),
  ]);
}
function velomovil() {
  return unir([
    pieza(new THREE.SphereGeometry(1, 16, 10), '#ffffff', M(0, 0.55, 0, 0, 0, 0, 1.35, 0.42, 0.42)),
    pieza(new THREE.SphereGeometry(0.4, 12, 8), '#2b3a48', M(0.35, 0.82, 0, 0, 0, 0, 1.0, 0.45, 0.6)),
    rueda(0.85, 0.32, 0.22, 0.06), rueda(0.85, -0.32, 0.22, 0.06), rueda(-0.95, 0, 0.22, 0.06),
  ]);
}

interface Camino { pts: Float32Array; acum: Float32Array; largo: number; cerrado: boolean }
function camino(xy: number[], cerrado: boolean): Camino | null {
  const n = xy.length / 2;
  if (n < 2) return null;
  const acum = new Float32Array(n);
  for (let i = 1; i < n; i++) acum[i] = acum[i - 1] + Math.hypot(xy[i * 2] - xy[i * 2 - 2], xy[i * 2 + 1] - xy[i * 2 - 1]);
  const largo = acum[n - 1] + (cerrado ? Math.hypot(xy[0] - xy[n * 2 - 2], xy[1] - xy[n * 2 - 1]) : 0);
  return largo > 5 ? { pts: new Float32Array(xy), acum, largo, cerrado } : null;
}
function arcoPts(cx: number, cy: number, r: number, a0: number, a1: number): number[] {
  const n = Math.max(8, Math.min(240, Math.ceil(((a1 - a0) * r) / 4))), o: number[] = [];
  for (let i = 0; i <= n; i++) { const t = a0 + ((a1 - a0) * i) / n; o.push(cx + r * Math.cos(t), cy + r * Math.sin(t)); }
  return o;
}
/** Position and heading at distance s along a path. */
function punto(c: Camino, s: number, out: { x: number; y: number; ang: number }) {
  const n = c.acum.length;
  s = ((s % c.largo) + c.largo) % c.largo;
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c.acum[m] <= s) lo = m; else hi = m; }
  let i = lo, j = lo + 1;
  if (s > c.acum[n - 1]) { i = n - 1; j = 0; }            // closing segment of a closed path
  const x0 = c.pts[i * 2], y0 = c.pts[i * 2 + 1], x1 = c.pts[j * 2], y1 = c.pts[j * 2 + 1];
  const L = Math.hypot(x1 - x0, y1 - y0) || 1;
  const t = Math.min(1, (s - c.acum[i]) / L);
  out.x = x0 + (x1 - x0) * t; out.y = y0 + (y1 - y0) * t; out.ang = Math.atan2(y1 - y0, x1 - x0);
}

interface Agente { c: Camino; s: number; v: number; lado: number }
type Clase = 'calzada' | 'bici' | 'peatonal';

function repartirAgentes(caminos: Camino[], n: number, v: [number, number], seed: number): Agente[] {
  if (!caminos.length) return [];
  let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const total = caminos.reduce((a, c) => a + c.largo, 0);
  const out: Agente[] = [];
  for (let i = 0; i < n; i++) {
    // pick a path proportionally to its length, so long lanes get more traffic
    let x = r() * total, k = 0;
    while (k < caminos.length - 1 && x > caminos[k].largo) { x -= caminos[k].largo; k++; }
    out.push({ c: caminos[k], s: r() * caminos[k].largo, v: v[0] + r() * (v[1] - v[0]), lado: (r() - 0.5) * 0.8 });
  }
  return out;
}

function Multitud({ geo, agentes, colores, escala = 1 }: { geo: THREE.BufferGeometry; agentes: Agente[]; colores: string[]; escala?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  useEffect(() => {
    const im = ref.current; if (!im) return;
    const c = new THREE.Color();
    agentes.forEach((_, i) => im.setColorAt(i, c.set(colores[i % colores.length])));
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [agentes, colores]);
  const o = useMemo(() => new THREE.Object3D(), []);
  const p = useMemo(() => ({ x: 0, y: 0, ang: 0 }), []);
  useFrame((_, dt) => {
    const im = ref.current; if (!im) return;
    const paso = Math.min(dt, 0.1);
    agentes.forEach((a, i) => {
      a.s += a.v * paso;
      if (!a.c.cerrado && a.s > a.c.largo) a.s -= a.c.largo;  // open lanes: start again from the beginning
      punto(a.c, a.s, p);
      const nx = -Math.sin(p.ang) * a.lado, ny = Math.cos(p.ang) * a.lado;
      o.position.set(p.x + nx, 0, -(p.y + ny));
      o.rotation.set(0, p.ang, 0);
      o.scale.setScalar(escala);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
  });
  if (!agentes.length) return null;
  return <instancedMesh key={agentes.length} ref={ref} args={[geo, mat, agentes.length]} frustumCulled={false} />;
}

export default function Animacion({ mundo }: { mundo: Mundo }) {
  const datos = useMemo(() => {
    const fc = `p${mundo.foco.p}/c${mundo.foco.c}`;
    const com = mundo.unidades.get(fc);
    const cerca = (x: number, y: number) => !com || Math.hypot(x - com.cx, y - com.cy) < com.radio * 1.6;
    const enCom = (amb: string) => amb === fc || amb.startsWith(fc + '/');
    const por: Record<Clase, Camino[]> = { calzada: [], bici: [], peatonal: [] };
    for (const r of mundo.rutas) {
      if (!(enCom(r.ambito) || (r.ambito === `p${mundo.foco.p}` && cerca(r.pts[0], r.pts[1])))) continue;
      const c = camino(r.pts, r.cerrada); if (c) por[r.capa].push(c);
    }
    for (const a of mundo.anillos) {
      if (!enCom(a.ambito) || !a.detalle || a.r1 > 3000) continue;
      const clase: Clase | null = a.capa === 'calzada' ? 'calzada' : a.capa === 'bici' ? 'bici' : a.capa === 'peatonal' || a.capa === 'camino' ? 'peatonal' : null;
      if (!clase) continue;
      const rm = (a.r0 + a.r1) / 2;
      const completo = a.a1 - a.a0 > 2 * Math.PI - 1e-3;
      // two directions on every ring: half the agents go one way, half the other
      const ida = arcoPts(a.cx, a.cy, rm, a.a0, a.a1);
      const c1 = camino(ida, completo); if (c1) por[clase].push(c1);
      if (clase !== 'peatonal') {
        const vuelta = arcoPts(a.cx, a.cy, rm, a.a1, a.a0);
        const c2 = camino(vuelta, completo); if (c2) por[clase].push(c2);
      }
    }
    // people strolling around their nests, inside the ring of fruit trees
    const paseos: Camino[] = [];
    mundo.unidades.forEach(u => {
      if (u.tipo !== 'nido' || !enCom(u.ambito)) return;
      const c = camino(arcoPts(u.cx, u.cy, Math.max(4, u.radio * 0.5), 0, 2 * Math.PI), true);
      if (c) paseos.push(c);
    });
    return {
      coches: repartirAgentes(por.calzada, 40, [6, 10], 11),
      bicis: repartirAgentes(por.bici, 40, [3.5, 5.5], 23),
      velos: repartirAgentes(por.bici, 20, [6, 8.5], 37),
      gente: [...repartirAgentes(por.peatonal, 70, [1.0, 1.5], 41), ...repartirAgentes(paseos, 50, [0.7, 1.2], 53)],
    };
  }, [mundo]);
  const geoPersona = useMemo(() => persona(), []);
  const geoVelo = useMemo(() => velomovil(), []);
  useEffect(() => () => { geoPersona.dispose(); geoVelo.dispose(); }, [geoPersona, geoVelo]);
  return (
    <>
      <Multitud geo={prototipo('coche')} agentes={datos.coches} colores={['#f4f4f4', '#c9d3dc', '#5c86b0', '#b84a3e', '#2f3b45', '#e0c068']} />
      <Multitud geo={prototipo('bici')} agentes={datos.bicis} colores={['#2e7d32', '#1565c0', '#c62828', '#f9a825']} />
      <Multitud geo={geoVelo} agentes={datos.velos} colores={['#ffca28', '#ef5350', '#66bb6a', '#42a5f5', '#ffffff']} />
      <Multitud geo={geoPersona} agentes={datos.gente} colores={['#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#4db6ac', '#ff8a65', '#f5f5f5']} />
    </>
  );
}
