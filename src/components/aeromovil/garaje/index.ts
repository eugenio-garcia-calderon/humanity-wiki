import type { VehiculoGaraje } from './tipos';
import { VEHICULO as xl1 } from './xl1';
import { VEHICULO_1LITRO as unlitro } from './vwL1';
import { VEHICULO as szemission } from './szemission';
import { VEHICULO as aerorider } from './aerorider';
import { VEHICULO as twizy } from './twizy';
import { VEHICULO as aptera } from './aptera';
import { VEHICULO as tesla3 } from './tesla3';
import { VEHICULO as caterham7 } from './caterham7';
import { VEHICULO as jaguarD } from './jaguarD';
import { VEHICULO as suspensionTwizy } from '../piezas/suspensionTwizy';

export type { VehiculoGaraje } from './tipos';
/** Los vehículos del garaje, en el orden en que salen en la barra lateral. La suspensión del Twizy va al final: es una pieza, no un coche, pero se mira con el mismo visor. */
// 2026-11-08, Eugenio: fuera dos coches «que están repetidos»; se quitaron el XL1 de producción y el L1 2009.
// 2026-11-09, Eugenio, con fotos: los dos XL1 que quiere son el de serie (blanco, 250 unidades) y el concept de
// 2002 (el 1-Litro, negro). Vuelve el de serie y sale el XL1 Concept 2011, que es el repetido: misma carrocería.
export const VEHICULOS_GARAJE: VehiculoGaraje[] = [twizy, aptera, xl1, unlitro, szemission, jaguarD, aerorider, tesla3, caterham7, suspensionTwizy];
export const vehiculoGaraje = (id: string) => VEHICULOS_GARAJE.find(v => v.id === id);
