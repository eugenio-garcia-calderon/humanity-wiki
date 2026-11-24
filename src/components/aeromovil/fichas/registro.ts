// ============================================================================
// THE REGISTRY OF COMPONENTS (2026-11-24, Eugenio: «cuando yo no estoy en la vista general… hago hover sobre una rueda…
// y si hago clic… se me despliega debajo de la pantalla 3D toda la información de ese componente… y esto con todos y
// cada uno de los componentes de todos y cada uno de los menús»).
// ============================================================================
// ONE FILE TO EXTEND. A component is one entry of `FICHAS` below: which department it belongs to, which 3D layer(s) it is
// drawn in, and where its weight and price live in the mass model. Everything else comes from it:
//   · hover over it in the 3D (a small label: name, weight, price, stock),
//   · a click on it (or a tap) shows only that component in the 3D and opens its record under the viewer,
//   · its internal number («Interior 1»: the position among the entries of the same department, in this order),
//   · its weight, price, supplier/model/files per part, sub-parts: the design's own lists (masasSecciones.ts,
//     precios/, proveedores/): nothing is typed twice,
//   · its own record on the server (alternatives, stock, images, documents, notes): `almacen.ts`, key = `id`.
// To add one: append an entry (do not reorder: the numbers «Interior 1, 2…» follow the order), run
// `npx tsx scripts/fichas.ts` (it checks the entry points at a real layer and a real section in every vehicle it names),
// done. Several people can add entries of DIFFERENT departments in parallel: each department has its own block below, so
// the diffs do not touch.
import type { CapaId } from '../visor/capas';

/** The vehicle kinds of `modelo.tipo`. */
export type TipoVehiculo = 'a1' | 'gota' | 'bala' | 'triciclo' | 'basculante';

/** What the viewer tells the page about a click or a hover (`Visor3D` `alPincharNuestro` / `alPasar`). */
export interface DondeVisor { punto: [number, number, number]; capa: CapaId | null; nombres: string[] }

export interface DefFicha {
  /** The path of the component: «department/name». Its record on the server is stored under it. Never rename: it is the key. */
  id: string;
  /** The department tab it belongs to (`triciclo/…` `DepTriciclo`: carroceria, interior, chasis, rodaje, propulsion, energia). */
  dep: string;
  nombre: string;
  /** The word of its internal number: «Interior» → «Interior 1». */
  prefijo: string;
  /** The 3D layers it is made of (visor/capas.ts). Selecting it shows only these. */
  capas: CapaId[];
  /** Optional, finer: only the meshes tagged `userData.componente` with one of these, inside those layers. */
  componentes?: string[];
  /** For each vehicle kind that has it: the section of the mass and price model, `«department|block»` (masasSecciones.ts `clave`). */
  secciones: Partial<Record<TipoVehiculo, string>>;
  /** One line for the record while nobody has described it yet. */
  queEs: string;
}

export const FICHAS: DefFicha[] = [
  // ── Interior ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'interior/asientos', dep: 'interior', nombre: 'Asientos', prefijo: 'Interior', capas: ['asientos'],
    secciones: { triciclo: 'interior|Asientos', basculante: 'interior|Asientos' },
    queEs: 'Los asientos del vehículo: carcasa, espuma, tapizado y fijaciones.',
  },
  // ── Carrocería · Chasis · Rodaje · Motor · Batería: to roll out, one block each (see the header) ────────────────
];

/** The component whose record this 3D click or hover belongs to, in the department that is open. */
export function fichaEn(donde: Pick<DondeVisor, 'capa' | 'nombres'> | null | undefined, dep: string, tipo: string): DefFicha | null {
  if (!donde) return null;
  const comp = donde.nombres.filter(n => n.startsWith('comp:')).map(n => n.slice(5));
  return FICHAS.find(f => f.dep === dep && tipo in f.secciones && !!donde.capa && f.capas.includes(donde.capa)
    && (!f.componentes || comp.some(c => f.componentes!.includes(c)))) ?? null;
}

/** The components of a department, in registry order: a vehicle kind with none of them offers no records. */
export const fichasDe = (dep: string, tipo: string) => FICHAS.filter(f => f.dep === dep && tipo in f.secciones);

/** «Interior 1»: the position of the component among those of its prefix (the order of `FICHAS`), from 1. */
export function numeroPorDefecto(f: DefFicha): string {
  return `${f.prefijo} ${FICHAS.filter(x => x.prefijo === f.prefijo).indexOf(f) + 1}`;
}
