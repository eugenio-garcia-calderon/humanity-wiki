import type { VehiculoGaraje } from './tipos';
import { VEHICULO as xl1, VEHICULO_CONCEPTO as xl1concept } from './xl1';
import { VEHICULO_L1 as l1, VEHICULO_1LITRO as unlitro } from './vwL1';
import { VEHICULO as twizy } from './twizy';
import { VEHICULO as aptera } from './aptera';
import { VEHICULO as tesla3 } from './tesla3';
import { VEHICULO as caterham7 } from './caterham7';
import { VEHICULO as jaguarD } from './jaguarD';
import { VEHICULO as suspensionTwizy } from '../piezas/suspensionTwizy';

export type { VehiculoGaraje } from './tipos';
/** Los vehículos del garaje, en el orden en que salen en la barra lateral. La suspensión del Twizy va al final: es una pieza, no un coche, pero se mira con el mismo visor. */
export const VEHICULOS_GARAJE: VehiculoGaraje[] = [twizy, aptera, xl1, xl1concept, l1, unlitro, tesla3, caterham7, jaguarD, suspensionTwizy];
export const vehiculoGaraje = (id: string) => VEHICULOS_GARAJE.find(v => v.id === id);
