import type { Modelo, ModeloBase } from '../geometria';
import type { ModeloBala } from '../geometriaBala';
import { areaSuperelipse, funcionSeccion } from './malla';
import type { RuedaTunel } from './arrastre';
import type { Envolvente, Resolucion } from './malla';
import type { CantidadLineas, PeticionTunel } from './calculo';

/**
 * Our design as a tunnel body. Pure (no three.js, no garage models), so the Web
 * Worker can build it too when «Probar» tries a modified copy of the parameters.
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

/** Our design. `area` is the editor's frontal area (res.A), the one its Cd refers to (not for the Bala: see `cuerpoBala`). */
export function cuerpoAeromovil(m: Modelo, area: number, nombre = m.tipo === 'a1' ? 'Aeromóvil 1' : m.tipo === 'bala' ? 'Cuadriciclo Bala' : 'Aeromóvil Gota'): CuerpoTunel {
  if (m.tipo === 'bala') return cuerpoBala(m, nombre);
  const xs = m.ruedas.map(r => r.x);
  return {
    id: 'aeromovil', nombre, x: 0, z: 0, giro: 0, envolvente: envolventeModelo(m), n: 2.3,
    area, fuenteArea: 'área frontal del editor',
    // the wheels sit inside the shell; only the bottom shows below it
    ruedas: m.ruedas.map(r => ({ d: 2 * r.r, w: r.w, tipo: 'dentro' as const })),
    ejes: [Math.max(...xs), Math.min(...xs)],
  };
}

/** Section exponent of the Bala's body for the tunnel: an egg, closest to an ellipse (as its garage entry, `seccion: 2`). */
const N_BALA = 2;
/**
 * The Cuadriciclo Bala as our design, exactly as its garage entry goes through
 * the tunnel (garaje/bala.ts, cuerpos.ts): the body's silhouette every 5 cm,
 * an elliptical section, and as reference area the largest section of that
 * silhouette. The lateral wheel pods, their arms and the fin stand outside the
 * body and are not in the calculation (the explanation says so); the four
 * wheels are, as in `RUEDAS_GARAJE.bala`: front and rear inside the body,
 * laterals in pods. The editor's frontal area (with the pods, 1.08 m² on the
 * default design) is not the reference here: the tunnel's drag is the body's,
 * and dividing it by a larger area would only make the Cd look smaller.
 */
export function cuerpoBala(m: ModeloBala, nombre = 'Cuadriciclo Bala'): CuerpoTunel {
  const envolvente = m.F.envolvente();
  const { seccion, xMorro, xCola } = funcionSeccion(envolvente);
  let area = 0;
  for (let k = 0; k <= 200; k++) { const s = seccion(xMorro + (xCola - xMorro) * k / 200); area = Math.max(area, areaSuperelipse(s.a, s.b, N_BALA)); }
  return {
    id: 'aeromovil', nombre, x: 0, z: 0, giro: 0, envolvente, n: N_BALA,
    area, fuenteArea: 'sección mayor del cuerpo (sin los carenados laterales ni sus brazos)',
    ruedas: [
      { d: 2 * m.rF, w: m.F.ANCHO_NEU, tipo: 'dentro' }, { d: 2 * m.rR, w: m.F.ANCHO_NEU, tipo: 'dentro' },
      { d: 2 * m.rL, w: m.F.ANCHO_NEU_LAT, tipo: 'carenado' }, { d: 2 * m.rL, w: m.F.ANCHO_NEU_LAT, tipo: 'carenado' },
    ],
    ejes: [0, m.xR],
  };
}

export function peticionDe(c: CuerpoTunel, resolucion: Resolucion, lineas: CantidadLineas): PeticionTunel {
  return { id: c.id, envolvente: c.envolvente, n: c.n, resolucion, lineas, area: c.area, ruedas: c.ruedas, ejes: c.ejes };
}
