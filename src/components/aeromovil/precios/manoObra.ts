/**
 * «Mano de obra» (2026-11-17, Eugenio: «incluye la mano de obra como un apartado añadido donde se le puede poner un
 * precio, y ponlo en el menú»). The labour to build ONE prototype, item by item: hours × €/hour. Every default is an
 * ESTIMATE for a small workshop in Spain, written next to it; two follow the design (the frame's welding by its metres
 * of tube, the body's moulds and laminate by its m²). The user's own hours and rates are stored with the design
 * (`P.manoObra[id]`); a design saved without them gets the defaults.
 */
import { largoTubo, type Parametros, type Resultados, type Tubo } from '../geometria';

export interface PartidaManoObra {
  id: string; nombre: string;
  /** what it covers and why that many hours, in plain Spanish */
  que: string;
  h: number; eurh: number;
  hEst: number; eurhEst: number;
  /** the user changed the hours or the rate */
  propio: boolean;
  eur: number;
}
export type Ajuste = NonNullable<Parametros['manoObra']>[string];

const r1 = (v: number) => Math.round(v);

/** The labour items of this design, with the defaults and the user's values. */
export function partidasManoObra(P: Parametros, modelo: Record<string, unknown>, res: Resultados): PartidaManoObra[] {
  // metres of frame tube (Triciclo: the parts list's frame; Basculante: its tubes), and m² of laminate
  const tubos = Array.isArray(modelo.tubos) ? (modelo.tubos as Tubo[]) : [];
  const metros = tubos.reduce((s, t) => s + largoTubo(t), 0) || 8;
  const m2 = Math.max(4, res.areas?.carroceria ?? 8);
  const bascula = !!modelo.bascula || modelo.tipo === 'basculante';
  const base: Omit<PartidaManoObra, 'h' | 'eurh' | 'propio' | 'eur'>[] = [
    { id: 'diseno', nombre: 'Diseño e ingeniería', que: 'planos de fabricación, cálculo de la estructura y de la suspensión, lista de piezas: unas tres semanas de una persona (estimado)', hEst: 120, eurhEst: 45 },
    { id: 'chasis', nombre: 'Chasis: corte, plantilla y soldadura', que: `20 h de plantilla y 3 h por metro de tubo (cortar, ajustar las bocas y soldar) × ${metros.toFixed(1).replace('.', ',')} m (estimado)`, hEst: r1(20 + 3 * metros), eurhEst: 40 },
    { id: 'moldes', nombre: 'Moldes de la carrocería', que: `modelo y molde de la carrocería y los carenados: 10 h por m² × ${m2.toFixed(1).replace('.', ',')} m² (estimado; para una sola unidad, lo más caro de la carrocería)`, hEst: r1(10 * m2), eurhEst: 35 },
    { id: 'laminado', nombre: 'Laminado de la carrocería', que: `laminar, desmoldar, recortar y pegar: 4 h por m² × ${m2.toFixed(1).replace('.', ',')} m² (estimado)`, hEst: r1(4 * m2), eurhEst: 35 },
    { id: 'electrico', nombre: 'Montaje eléctrico y batería', que: `montar el paquete de batería, el BMS, el controlador, el cableado y las luces${bascula ? ', y la electrónica de la basculación' : ''} (estimado)`, hEst: bascula ? 60 : 45, eurhEst: 40 },
    { id: 'mecanico', nombre: 'Montaje mecánico', que: `suspensión, dirección, frenos, ruedas y motor${bascula ? ', y la basculación' : ''}; alinear y ajustar (estimado)`, hEst: bascula ? 70 : 50, eurhEst: 40 },
    { id: 'interior', nombre: 'Interior y tapicería', que: 'asientos, paneles, salpicadero y cinturones (estimado)', hEst: 25, eurhEst: 35 },
    { id: 'pintura', nombre: 'Pintura y acabado', que: 'lijar, imprimar y pintar la carrocería, o vinilarla (estimado)', hEst: 35, eurhEst: 35 },
    { id: 'homologacion', nombre: 'Homologación y ensayos', que: 'proyecto técnico, ensayos y tasas de una homologación individual, en horas de ingeniero (estimado; el laboratorio puede cobrar aparte)', hEst: 50, eurhEst: 60 },
  ];
  return base.map(b => {
    const a = P.manoObra?.[b.id];
    const h = typeof a?.h === 'number' && Number.isFinite(a.h) && a.h >= 0 ? a.h : b.hEst;
    const eurh = typeof a?.eurh === 'number' && Number.isFinite(a.eurh) && a.eurh >= 0 ? a.eurh : b.eurhEst;
    return { ...b, h, eurh, propio: h !== b.hEst || eurh !== b.eurhEst, eur: h * eurh };
  });
}

export const totalManoObra = (l: PartidaManoObra[]) => l.reduce((s, p) => s + p.eur, 0);
export const horasManoObra = (l: PartidaManoObra[]) => l.reduce((s, p) => s + p.h, 0);

/** A copy of the design's labour with one item changed (null: back to the estimate). */
export function conManoObra(P: Parametros, id: string, v: Ajuste | null): Record<string, Ajuste> | undefined {
  const o = { ...(P.manoObra ?? {}) };
  if (v == null) delete o[id]; else o[id] = { ...o[id], ...v };
  return Object.keys(o).length ? o : undefined;
}
