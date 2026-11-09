import type { ModeloBase } from '../geometria';
import { vehiculoGaraje } from '../garaje';
import { RUEDAS_GARAJE, type RuedaTunel } from './arrastre';
import { areaSuperelipse, funcionSeccion, type Envolvente } from './malla';
import type { CantidadLineas, PeticionTunel } from './calculo';
import type { Resolucion } from './malla';

/**
 * The bodies that go through the tunnel: our design and the garage cars, with
 * what the calculation needs (silhouette, section shape, reference area, wheels,
 * axles) and where they stand in the scene.
 */
export interface CuerpoTunel {
  id: string;
  nombre: string;
  /** Where the car stands in the scene (front axle) and its turn. */
  x: number; z: number; giro: number;
  envolvente: Envolvente;
  /** Section exponent (2 = ellipse, 3 = nearly a rounded box). */
  n: number;
  /** Floating label above the car. */
  etiqueta?: string;
  /** Reference area for Cd (m²) and where it comes from. */
  area: number; fuenteArea: string;
  ruedas: RuedaTunel[];
  /** Front and rear axle x (m). */
  ejes: [number, number];
  /** Published Cd, when there is one. */
  cdPublicado?: number;
}

/** The Aeromóvil's silhouette from its surfaces (body and canopy), every 3 cm. */
export function envolventeModelo(m: ModeloBase): Envolvente {
  const paso = 0.03, mapa = new Map<number, [number, number, number]>();
  for (const s of m.superficies) {
    for (let k = 0; k <= 400; k++) {
      const f = s.frame(s.u0 + (s.u1 - s.u0) * (k / 400));
      if (!(f.hw > 0.002) || !(f.top > f.bot)) continue;
      const i = Math.round(f.x / paso), e = mapa.get(i);
      if (!e) mapa.set(i, [f.bot, f.top, f.hw]);
      else mapa.set(i, [Math.min(e[0], f.bot), Math.max(e[1], f.top), Math.max(e[2], f.hw)]);
    }
  }
  return [...mapa.entries()].sort((a, b) => b[0] - a[0]).map(([i, e]) => [i * paso, e[0], e[1], e[2]]);
}

/** Our design. `area` is the editor's frontal area (res.A), the one its Cd refers to. */
export function cuerpoAeromovil(m: ModeloBase, area: number, nombre = m.tipo === 'a1' ? 'Aeromóvil 1' : 'Aeromóvil Gota'): CuerpoTunel {
  const xs = m.ruedas.map(r => r.x);
  return {
    id: 'aeromovil', nombre, x: 0, z: 0, giro: 0, envolvente: envolventeModelo(m), n: 2.3,
    area, fuenteArea: 'área frontal del editor',
    // the wheels sit inside the shell; only the bottom shows below it
    ruedas: m.ruedas.map(r => ({ d: 2 * r.r, w: r.w, tipo: 'dentro' as const })),
    ejes: [Math.max(...xs), Math.min(...xs)],
  };
}

/** A garage car, if it has a silhouette. Without a published area, the silhouette's largest section. */
export function cuerpoGaraje(v: { id: string; x: number; z: number; giro?: number }): CuerpoTunel | null {
  const d = vehiculoGaraje(v.id);
  if (!d?.envolvente) return null;
  const n = d.seccion ?? 3;
  let area = d.aero?.area ?? 0, fuenteArea = 'área frontal publicada o medida en su modelo';
  if (!area) {
    const { seccion, xMorro, xCola } = funcionSeccion(d.envolvente);
    for (let k = 0; k <= 200; k++) { const s = seccion(xMorro + (xCola - xMorro) * k / 200); area = Math.max(area, areaSuperelipse(s.a, s.b, n)); }
    fuenteArea = 'sección mayor de su silueta (no hay área publicada)';
  }
  return {
    id: d.id, nombre: d.nombre, x: v.x, z: v.z, giro: v.giro ?? 0, envolvente: d.envolvente, n,
    area, fuenteArea, ruedas: RUEDAS_GARAJE[d.id]?.ruedas ?? [], ejes: [0, -d.batalla], cdPublicado: d.aero?.cd,
  };
}

export function peticionDe(c: CuerpoTunel, resolucion: Resolucion, lineas: CantidadLineas): PeticionTunel {
  return { id: c.id, envolvente: c.envolvente, n: c.n, resolucion, lineas, area: c.area, ruedas: c.ruedas, ejes: c.ejes };
}
