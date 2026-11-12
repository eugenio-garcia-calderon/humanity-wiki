import type { VehiculoGaraje } from './tipos';
import { PARAMETROS_BALA } from '../geometria';
import { camposBala, medidasBala } from '../geometriaBala';
import { POD_SEMIANCHO } from './balaMedidas';
import { construir } from './balaModelo';

/**
 * Built from the editor's default Bala (PARAMETROS_BALA, 2026-11-09): one shape
 * code for the garage and the editor. scripts/bala-huella.ts checks that this
 * is still, vertex for vertex, the model first drawn for the garage.
 */
const { F, asientos, aleta } = medidasBala(camposBala(PARAMETROS_BALA));

/*
 * The «Cuadriciclo Bala en rombo» (2026-11-09): Eugenio's own design, not a real
 * vehicle. His words: «Coge el vehículo aerogota tándem 1+2 … duplícalo, haz
 * una versión distinta. Llámalo cuadriciclo bala y mejora su aspecto y
 * estética para que se parezca más a una moto ultra carenada, que sea todavía
 * más con forma de cohete o avión y que sea parecido también a la Aptera, pero
 * como más estrechito», and «que tenga solo dos ocupantes, el piloto y detrás
 * un pasajero a horcajadas, para que sea no muy grande».
 *
 * WHAT IT KEEPS FROM THE AEROMÓVIL GOTA (PARAMETROS_GOTA, geometria.ts)
 * - The rhombus: one front wheel on the centre line, two lateral wheels at
 *   mid-wheelbase, one rear wheel on the centre line.
 * - Wheel sizes: 24″ front and rear (0.61 m), 20″ lateral (0.508 m).
 * WHAT IT CHANGES, AND WHY
 * - Wheelbase 2.45 m (Gota 2.60): two riders astride need less length than
 *   the Gota's 1+2, and it keeps the whole vehicle at 3.70 m with a long
 *   pointed nose and a tail cone. The lateral wheels stay at mid-wheelbase.
 * - Lateral track 1.10 m (Gota 1.05): the lateral wheels sit outside the
 *   narrow body in Aptera-like pods on arms; 5 cm more leaves a visible
 *   ~11 cm gap between body and pod at arm height.
 * - Tyres 80 mm (front, rear) and 70 mm (lateral) wide instead of the Gota's
 *   55 mm bicycle tyres: two adults and a motor, no pedals.
 * THE PROPOSAL (all of it a design, none of it measured)
 * - 3.70 m long, body 0.85 m wide, 1.26 m over the pods, 1.452 m tall.
 * - Pilot in front and one passenger behind, both astride a stepped saddle
 *   (0.44 and 0.48 m up), motorcycle style: handlebar, small dash, footboards
 *   for the pilot, footpegs, grab rail and backrest for the passenger.
 * - Canopy over both riders, hinged at the front; navy frame round it.
 * No published Cd (it does not exist): no `aero`. The wind tunnel estimates
 * one from the silhouette and labels it as an estimate (decision 2026-11-07).
 */
export const VEHICULO: VehiculoGaraje = {
  id: 'bala',
  nombre: 'Cuadriciclo Bala en rombo',
  largo: F.LARGO, ancho: Math.round((F.VIA_LAT + 2 * POD_SEMIANCHO) * 1000) / 1000, alto: F.D.alto, batalla: F.BATALLA,
  fuente: 'Diseño propio (2026-11-09) a partir del Aeromóvil Gota; medidas propuestas, no de una ficha. Del Gota conserva el rombo de ruedas y sus tamaños (24″ delante y detrás, 20″ a los lados, a mitad de batalla); la batalla baja a 2,45 m (2,60 en el Gota) y la vía de las laterales sube a 1,10 m (1,05) para que los carenados queden fuera de la carrocería estrecha. Dos plazas a horcajadas, piloto delante y pasajero detrás. No hay Cd publicado: el del túnel es una estimación a partir de la silueta',
  // the body only: the lateral wheel pods, their arms and the tail fin stand outside it
  envolvente: F.envolvente(),
  // the largest section is an egg 0.85 × 1.34 m whose area (0.90 m²) is that of the ellipse with the same width and height
  seccion: 2,
  construir: () => construir(F, { asientos, aleta }),
};
