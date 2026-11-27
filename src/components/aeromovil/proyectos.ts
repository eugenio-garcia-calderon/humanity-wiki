/**
 * The three projects of the Aeromóvil (2026-11-27, Eugenio: «en el menú superior izquierdo, te deje elegir entre 3 tipos de
 * vehículos. El primer tipo sería el aeromóvil bicicleta … todos los vehículos que son parecidos a una bicicleta … todo ese
 * proyecto de homologación de bicicleta. Y la segunda categoría sería el vehículo de producción, que sería el aeromóvil coche …
 * y ahí metes en el garaje todos los coches. Y luego … el aeromóvil avión que ahí metes todas las aeronaves en el garaje y ahí está
 * el nombre del aeromóvil Alado, es el que tiene que aparecer como estrella en ese garaje y todo gira en torno a ese modelo …
 * cada uno con su homologación, sus costes, sus planes, su estrategia»).
 *
 * A project is a lens on the same editor: which saved designs it lists, which one is its star, which reference vehicles stand
 * in its garage, which homologation page and which strategy tree it opens. Pure data (no React): scripts import it.
 */
import type { Parametros } from './geometria';

export type IdProyecto = 'bici' | 'coche' | 'avion';

export interface Proyecto {
  id: IdProyecto;
  nombre: string;
  /** one line under the name in the menu */
  lema: string;
  /** the project's own model: what opens when the project is picked, first in its list, marked with a star */
  estrella: { id: number; nombre: string };
  /** the reference vehicles of its garage (ids of `garaje/index.ts`) */
  garaje: string[];
  /** which homologation page the «Homologación» tab opens */
  homologacion: 'epac' | 'pesado' | 'avion';
  /** the root of its strategy tree (`estrategia/arbol.ts`) */
  estrategia: string;
}

export const PROYECTOS: Proyecto[] = [
  {
    id: 'bici', nombre: 'Aeromóvil bicicleta', lema: 'Cuadriciclo con ruedas y componentes de bicicleta, pedales y ayuda eléctrica: legalmente, una bicicleta.',
    // a built-in proposal (`triciclo/propuestaBici.ts`): negative id, never saved by itself
    estrella: { id: -19, nombre: 'Vehículo de producción (bicicleta)' },
    garaje: ['aerorider', 'szemission', 'nusKruce'],
    homologacion: 'epac', estrategia: 'bici',
  },
  {
    id: 'coche', nombre: 'Aeromóvil coche', lema: 'Cuadriciclo de motor con piezas de coche y moto: L6e / L7e, lo más parecido a un coche.',
    estrella: { id: 19, nombre: 'Vehiculo de producción' },
    garaje: ['twizy', 'smera', 'nusKruce', 'unlitro', 'bala', 'xl1', 'jaguarD', 'caterham7', 'tesla3', 'aptera', 'modeloY', 'eqxx', 'suspension-twizy'],
    homologacion: 'pesado', estrategia: 'meta',
  },
  {
    id: 'avion', nombre: 'Aeromóvil avión', lema: 'El vehículo con alas: ultraligero que también rueda. Todo gira en torno al «Aeromóvil Alado».',
    estrella: { id: 17, nombre: 'Aeromovil Alado' },
    garaje: ['autogiro', 'visionJet'],
    homologacion: 'avion', estrategia: 'avion',
  },
];

export const proyecto = (id: IdProyecto) => PROYECTOS.find(p => p.id === id)!;
export const esProyecto = (v: unknown): v is IdProyecto => PROYECTOS.some(p => p.id === v);

/**
 * The project a saved design belongs to. A design saved since 2026-11-27 carries it (`parametros.proyecto`); an older one is
 * placed by what it is: a project's star is its own; bicycle parts or the pedal-assisted Gota are the bicycle's; wings in the
 * name are the aircraft's; everything else (the Triciclo family, the Bala, the Basculante, the A1) is a car.
 */
export function proyectoDeDiseno(d: { id: number; nombre: string; parametros?: Partial<Parametros> | null }): IdProyecto {
  const propio = d.parametros?.proyecto;
  if (esProyecto(propio)) return propio;
  const estrella = PROYECTOS.find(p => p.estrella.id === d.id);
  if (estrella) return estrella.id;
  if (/\balad|\bavi[oó]n|\bvolador|\bala\b/i.test(d.nombre)) return 'avion';
  if (d.parametros?.tClase === 'bici' || d.parametros?.disposicion === 'rombo') return 'bici';
  return 'coche';
}
