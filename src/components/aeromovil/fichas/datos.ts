// What a component's record shows that is NOT its own: the weight and the price, read from the design's own lists
// (masasSecciones.ts, precios/precios.ts). One list of components: this file only looks the section up and says it in words.
import type { Parametros, Resultados } from '../geometria';
import { pesoSeccion, pesosSecciones, textoPesoSeccion, type PesosSecciones, type SeccionPeso } from '../masasSecciones';
import { eur, precioSeccion, preciosDiseno, type ContextoPrecio, type PrecioSeccion, type PreciosDiseno } from '../precios/precios';
import type { DefFicha } from './registro';

export interface ListasDiseno { ps: PesosSecciones | null; pr: PreciosDiseno | null }

/** The design's weight sections and prices, once for all the components. */
export function listasDelDiseno(P: Parametros, modelo: { tipo: string }, res: Resultados): ListasDiseno {
  const ps = pesosSecciones(res, modelo);
  return { ps, pr: ps ? preciosDiseno(ps, { P, modelo: modelo as unknown as ContextoPrecio['modelo'], res }) : null };
}

export interface DatosComponente { dep: string; bloque: string; peso: SeccionPeso | null; precio: PrecioSeccion | null }

/** The section of the mass and price model this component is in this vehicle, or null if it has none here. */
export function datosDe(def: DefFicha, tipo: string, l: ListasDiseno): DatosComponente | null {
  const k = (def.secciones as Record<string, string | undefined>)[tipo];
  if (!k) return null;
  const [dep, bloque] = k.split('|');
  return { dep, bloque, peso: pesoSeccion(l.ps, dep, bloque), precio: precioSeccion(l.pr, dep, bloque) };
}

/** The few facts the hover label shows: weight, price, stock («7,0 kg», «≈ 420 €», «2 en stock»). */
export function hechos(d: DatosComponente | null, stock: number | undefined): string[] {
  const h: string[] = [];
  const kg = textoPesoSeccion(d?.peso ?? null); if (kg) h.push(kg);
  if (d?.precio) h.push(eur(d.precio.eur));
  if (stock != null) h.push(`${stock} en stock`);
  return h;
}
