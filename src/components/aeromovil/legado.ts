// ============================================================================
// The Aeromóvil S and the legacy vehicles (2026-11-17)
// ============================================================================
// Eugenio: «ahora me quiero centrar en el aeromóvil S… los vehículos anteriores del garaje, haz que ya no se puedan
// editar, que se queden como vehículos legado… están los vehículos de referencia, los vehículos legado y luego está el
// aeromóvil S. Que es el que vamos a trabajar sobre él y va a ser el que realmente salga a producción.»
//
// Pure (no React, no fetch at module level): the server (`src/server/aeromovil.ts`) imports it too, so the page and the
// write routes agree on which designs are frozen.
//
// What is legacy is decided by id, not by a column (see `memory/03_DECISIONS.md`, 2026-11-17 «legado»): every saved
// design that existed when the S was chosen (ids up to 15) is legacy; the S (id 16) and any design saved after it
// (a copy of the S, «Guardar como nuevo») stay editable. Nothing is archived or deleted: a legacy design can still be
// opened, viewed in 3D and read, only not changed.

/** «Aeromovil S» in `aeromovil_disenos` (production, 2026-11-17). */
export const ID_AEROMOVIL_S = 16;
/** The highest id that was saved before the S: every design up to it is legacy. */
export const ULTIMO_ID_LEGADO = 15;

/** A saved design that can no longer be changed (it can still be opened and looked at). */
export const esDisenoLegado = (id: number | null | undefined): boolean =>
  typeof id === 'number' && Number.isInteger(id) && id <= ULTIMO_ID_LEGADO;

/**
 * Whether the design open in the editor can be edited: only a saved design that is not legacy (the S, or one saved
 * after it). An unsaved vehicle (picked by type from the logo menu: Gota, Aeromóvil 1, Bala, Basculante…) is legacy
 * too: it is shown with its numbers and no sliders.
 */
export const esEditableAbierto = (actual: { id: number } | null | undefined): boolean =>
  !!actual && !esDisenoLegado(actual.id);

/** The text of the banner on a legacy vehicle. */
export const TEXTO_LEGADO = 'Vehículo legado: solo lectura';

interface DisenoMinimo { id: number; nombre: string; por_defecto?: boolean }

/** The Aeromóvil S from the list of saved designs: by id, else by its name, else the server's default. */
export function elegirAeromovilS<T extends DisenoMinimo>(lista: T[]): T | null {
  return lista.find(d => d.id === ID_AEROMOVIL_S)
    ?? lista.find(d => /^ae?ro?m[oó]vil\s+s$/i.test(d.nombre.trim()))
    ?? lista.find(d => d.por_defecto)
    ?? null;
}

/** Reads the saved designs and returns the Aeromóvil S (null without network or if it is not there). */
export async function cargarAeromovilS<T extends DisenoMinimo>(): Promise<T | null> {
  try {
    const r = await fetch('/api/aeromovil/disenos', { credentials: 'include' });
    if (!r.ok) return null;
    const l = await r.json();
    return Array.isArray(l) ? elegirAeromovilS(l as T[]) : null;
  } catch { return null; }
}
