import type { VehiculoGaraje } from './tipos';

/**
 * Garage vehicles made while the page runs (2026-11-12, Eugenio: «permite en el garaje ver, agregar los otros
 * modelos de vehículos», e.g. the Cuadriciclo Bala clásico next to the Triciclo): the editor's own saved designs,
 * built with the viewer's geometry. They are not in the fixed catalogue (`VEHICULOS_GARAJE`), which the tunnel
 * calibration, the overlay legend and the garage map read; `vehiculoGaraje(id)` finds them here as well, so the
 * viewer places, drags, labels and opens them like any other garage car.
 */
const REGISTRO = new Map<string, VehiculoGaraje>();

export function registrarVehiculo(v: VehiculoGaraje) { REGISTRO.set(v.id, v); }
export function olvidarVehiculo(id: string) { REGISTRO.delete(id); }
export const vehiculoRegistrado = (id: string) => REGISTRO.get(id);
