// Dispatch by vehicle type: the moving part of each car, and a whole design built for the garage.
// Moved out of Visor3D.tsx unchanged (2026-11-16, refactor «ordenar»). See ../CLAUDE.md for the layout.
import * as THREE from 'three';
import type { Modelo } from '../geometria';
import { construirBasculante, posarBasculante, type AyudasVisor } from '../basculante/modelo3d';
import { crearMateriales as materialesBala } from '../garaje/balaModelo';
import { COLOR_ACENTO, COLOR_CARROCERIA, coloresDe } from '../coloresCarroceria';
import type { PivoteGaraje } from '../garaje/tipos';
import { registrarConstructorSmera } from '../garaje/smera';
import { CAPAS, type CapaId } from './capas';
import { materiales, type Mats, pinturas } from './materiales';
import { tube, sphere, disk, vaciar, tuboCurvo, cajaRedonda, muelle } from './primitivas';
import { ocupante, ruedaCoche } from './ocupante';
import { construirFijo, construirMovilGota } from './gota';
import { construirMovilA1 } from './a1';
import { girarTriciclo, construirBala, construirTriciclo } from './triciclo';

/** La parte que se mueve: según el vehículo, el rombo basculante o los McPherson con las ruedas giradas. */
export function construirMovil(G: Record<CapaId, THREE.Group>, M: Mats, m: Modelo, coche: THREE.Group, angulo: number) {
  // the Bala does not lean and has no moving suspension drawn: its wheels are built with the rest (construirBala)
  if (m.tipo === 'bala') { coche.rotation.x = 0; return; }
  // ── Cuadriciclo Basculante (2026-11-15): `angulo` is the lean (°, + to the right); the front wheels steer into it
  if (m.tipo === 'basculante') {
    const phi = angulo * Math.PI / 180;
    coche.rotation.x = phi;
    posarBasculante(G, m, phi, m.phiMax > 1e-6 ? -phi / m.phiMax * m.giro * 0.35 : 0);
    return;
  }
  // the Triciclo does not lean either; «Girar ruedas» turns its two front wheels and their pods (Ackermann: the inner one more)
  if (m.tipo === 'triciclo') { coche.rotation.x = 0; girarTriciclo(G, m, angulo); return; }
  if (m.tipo === 'a1') construirMovilA1(G, M, m, coche, angulo); else construirMovilGota(G, M, m, coche, angulo);
}

// ── Cuadriciclo Basculante (2026-11-15): the viewer's helpers and materials, for basculante/modelo3d.ts
export function ayudasVisor(M: Mats): AyudasVisor {
  return { tube, sphere, disk, cajaRedonda, ruedaCoche, muelle, tuboCurvo, ocupante, M };
}
/** The Cuadriciclo Basculante as our own car: everything rebuilt (about as quick as the Gota), the corners at rest or at the current lean. */
export function construirBasculanteVisor(G: Record<CapaId, THREE.Group>, puertasG: Map<string, THREE.Group[]>, M: Mats, m: Extract<Modelo, { tipo: 'basculante' }>, sinPasajero: boolean) {
  for (const c of CAPAS) vaciar(G[c.k]);
  puertasG.clear();
  construirBasculante(G, puertasG, M, m, ayudasVisor(M), { calidad: 'completa', sinPasajero });
}
export let materialesDisenos: { M: Mats; Mb: ReturnType<typeof materialesBala> } | null = null;
export function construirDisenoGaraje(m: Modelo): { grupo: THREE.Group; pivotes: PivoteGaraje[] } {
  if (!materialesDisenos) materialesDisenos = { M: materiales(), Mb: materialesBala() };
  const { M, Mb } = materialesDisenos;
  const grupo = new THREE.Group(), G = {} as Record<CapaId, THREE.Group>, puertas = new Map<string, THREE.Group[]>();
  for (const c of CAPAS) { G[c.k] = new THREE.Group(); G[c.k].name = c.n; grupo.add(G[c.k]); }
  if (m.tipo === 'triciclo') { construirTriciclo(G, puertas, M, Mb, m, 'completa', false); girarTriciclo(G, m, 0); }
  else if (m.tipo === 'basculante') { construirBasculante(G, puertas, M, m, ayudasVisor(M), { calidad: 'completa', sinPasajero: false }); posarBasculante(G, m, 0, 0); }
  else if (m.tipo === 'bala') construirBala(G, puertas, M, Mb, m, 'completa', false);
  else { construirFijo(G, puertas, M, m, false); construirMovil(G, M, m, grupo, 0); }
  const pivotes: PivoteGaraje[] = [];
  let i = 0;
  for (const lista of puertas.values()) for (const piv of lista) {
    const u = piv.userData as { eje?: THREE.Vector3; angulo?: number; tipo?: string };
    if (!u.eje || u.angulo == null) continue;
    piv.name = `piv-${i++}`;
    pivotes.push({ nombre: piv.name, tipo: u.tipo === 'maletero' ? 'maletero' : 'puerta', eje: [u.eje.x, u.eje.y, u.eje.z], angulo: u.angulo * 180 / Math.PI });
  }
  grupo.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // (the layers by name and the model, for a design that poses itself: the garage's Smera leans with them)
  grupo.userData.capas = G; grupo.userData.modelo = m;
  // (2026-11-13: a design in another colour gets its own copies of the paint and accent materials; the shared ones keep the defaults)
  const c = coloresDe(m.P);
  if (c.carroceria !== COLOR_CARROCERIA || c.acento !== COLOR_ACENTO) {
    const p = pinturas(M, Mb), copias = new Map<THREE.Material, THREE.Material>();
    for (const [lista, color] of [[p.carroceria, c.carroceria], [p.acento, c.acento]] as const) for (const mt of lista) { const k = mt.clone(); k.color.set(color); copias.set(mt, k); }
    grupo.traverse((o: any) => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map((x: THREE.Material) => copias.get(x) ?? x) : (copias.get(o.material) ?? o.material); });
  }
  return { grupo, pivotes };
}

// the garage's Smera is this family's own model: its builder is this one (the garage cannot import the viewer)
registrarConstructorSmera(construirDisenoGaraje);
