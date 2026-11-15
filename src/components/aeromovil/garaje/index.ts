import type { VehiculoGaraje } from './tipos';
import { VEHICULO as xl1 } from './xl1';
import { VEHICULO_1LITRO as unlitro } from './vwL1';
import { VEHICULO as szemission } from './szemission';
import { VEHICULO as aerorider } from './aerorider';
import { VEHICULO as bala } from './bala';
import { VEHICULO as nusKruce } from './nusKruce';
import { VEHICULO as twizy } from './twizy';
import { VEHICULO as aptera } from './aptera';
import { VEHICULO as tesla3 } from './tesla3';
import { VEHICULO as modeloY } from './modeloY';
import { VEHICULO as caterham7 } from './caterham7';
import { VEHICULO as jaguarD } from './jaguarD';
import { VEHICULO as smera } from './smera';
import { VEHICULO as eqxx } from './eqxx';
import { VEHICULO as suspensionTwizy } from '../piezas/suspensionTwizy';
import { vehiculoRegistrado } from './registro';
import { compararTamano } from './filas';
import { masaGaraje } from './tipos';

export type { VehiculoGaraje } from './tipos';
/** Los vehículos del garaje, en el orden en que salen en la barra lateral. La suspensión del Twizy va al final: es una pieza, no un coche, pero se mira con el mismo visor. */
// 2026-11-08, Eugenio: fuera dos coches «que están repetidos»; se quitaron el XL1 de producción y el L1 2009.
// 2026-11-09, Eugenio, con fotos: los dos XL1 que quiere son el de serie (blanco, 250 unidades) y el concept de
// 2002 (el 1-Litro, negro). Vuelve el de serie y sale el XL1 Concept 2011, que es el repetido: misma carrocería.
// 2026-11-12, Eugenio: «Añada el model Y de Tesla en el garaje de vehículos».
// 2026-11-15, Eugenio: «Garaje con todos los modelos desde el más pequeño al más grande», with the Lumeneo Smera
// and a more aerodynamic four-wheeler (the Mercedes Vision EQXX). The cars go from the shortest to the longest (then
// the lightest first: `compararTamano`); this order is the list's and the second row's. The Twizy's suspension stays last.
const COCHES: VehiculoGaraje[] = [twizy, aptera, xl1, unlitro, szemission, jaguarD, aerorider, bala, nusKruce, modeloY, tesla3, caterham7, smera, eqxx];
export const VEHICULOS_GARAJE: VehiculoGaraje[] = [
  ...[...COCHES].sort((a, b) => compararTamano({ ...a, masa: masaGaraje(a) }, { ...b, masa: masaGaraje(b) })),
  suspensionTwizy,
];
/** A garage vehicle by id: the catalogue's, or one of the editor's designs added to the garage (`registro.ts`). */
export const vehiculoGaraje = (id: string) => VEHICULOS_GARAJE.find(v => v.id === id) ?? vehiculoRegistrado(id);
