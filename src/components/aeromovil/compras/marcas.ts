/**
 * The owner's own marks on the purchasing options (2026-11-27, Eugenio: «Permite eliminar opciones o guardar como
 * favoritas opciones y puntuarlas, cambiarles las estrellas»): favourite, removed, his own stars, per option id.
 *
 * Stored as ONE key of the Aeromóvil's private file on the server (`aeromovil_expediente`, key `compras-carenado`,
 * through the pedal cycle file's client store `homologacion/epac/almacen.ts`): the same versioned, owner-only store, so
 * the marks follow him to the phone and nothing is kept in localStorage. Visitors read the catalogue without marks.
 */
import { cambiar, leer } from '../homologacion/epac/almacen';
import type { OpcionCompra } from './tipos';

export interface Marca { favorita?: boolean; eliminada?: boolean; estrellas?: 1 | 2 | 3 | 4 | 5 }
export type Marcas = Record<string, Marca>;

export const CLAVE_MARCAS = 'compras-carenado';
const VACIO: Marcas = {};

export const leerMarcas = (): Marcas => leer<Marcas>(CLAVE_MARCAS, VACIO);

/** Changes one option's mark; an empty mark is dropped, so the stored value only holds what he touched. */
export function marcar(id: string, cambio: Partial<Marca>) {
  cambiar<Marcas>(CLAVE_MARCAS, VACIO, m => {
    const nueva: Marca = { ...m[id], ...cambio };
    for (const k of Object.keys(nueva) as (keyof Marca)[]) if (nueva[k] === undefined || nueva[k] === false) delete nueva[k];
    const { [id]: _quitada, ...resto } = m;
    return Object.keys(nueva).length ? { ...resto, [id]: nueva } : resto;
  });
}

/** The stars that count: his own when he set them, the catalogue's otherwise. */
export const estrellasDe = (o: OpcionCompra, m: Marca | undefined) => m?.estrellas ?? o.parecido;
