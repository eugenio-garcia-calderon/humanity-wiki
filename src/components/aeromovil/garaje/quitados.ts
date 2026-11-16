// ============================================================================
// Reference cars taken out of the garage (2026-11-16)
// ============================================================================
// Eugenio: «permite que se puedan borrar también los coches de referencia».
// Reference cars are models in the code, shared by everybody: «borrar» takes one out of THIS garage (the list and the
// 3D), not out of the catalogue. The mark rides on the garage's own saved list (`aeromovil_garaje_v5`, one entry per
// car with `visible`), so it is remembered per browser, like the garage's places: the phone app keeps its own list.

/** A garage place as the page keeps it; `quitado` = removed from the garage until «Recuperar». */
export type ConQuitado = { id: string; visible: boolean; quitado?: boolean };

/** Takes a reference car out of the garage: hidden, and out of the lists until it is recovered. */
export const quitarReferencia = <T extends ConQuitado>(g: T[], id: string): T[] => g.map(x => (x.id === id ? { ...x, visible: false, quitado: true } : x));

/** Brings a removed reference car back, on show. */
export const recuperarReferencia = <T extends ConQuitado>(g: T[], id: string): T[] => g.map(x => (x.id === id ? { ...x, visible: true, quitado: false } : x));

/** Shows or hides a car that is in the garage (a removed one stays out). */
export const alternarReferencia = <T extends ConQuitado>(g: T[], id: string): T[] => g.map(x => (x.id === id && !x.quitado ? { ...x, visible: !x.visible } : x));
