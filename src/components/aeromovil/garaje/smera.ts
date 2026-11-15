import type { VehiculoGaraje } from './tipos';
import {
  ALTO, ANCHO, ANCHO_RUEDA, BATALLA, INCLINACION_MAX, LARGO, LINK, R_CORONA, R_RUEDA, VIA_DEL, VIA_TRAS, area, envolvente,
} from './smeraForma';
import { construir, ponerBascula } from './smeraModelo';

/*
 * Lumeneo Smera: a French four-wheel tilting electric tandem (1 + 1), shown
 * at the Paris Motor Show in October 2008. Shape in `smeraForma.ts`, mesh and
 * the tilting linkage in `smeraModelo.ts`. Added 2026-11-15 (Eugenio: «falta
 * un vehículo de cuatro ruedas basculantes entre la moto y el microcoche tipo
 * Twizy… ahí añade el vehículo Lumeneo Smera»). A fixed reference car: the
 * editable design family inspired by it is another branch's work.
 *
 * WHICH SMERA. Two sets of figures are published and they do not agree:
 * - The 2008 show car, the same in three independent sources: 2 380–2 400 ×
 *   800 mm, 1 450 mm high, wheelbase 1 700 mm, track 655 mm front and rear,
 *   350 kg (770 lb), two motors, 30 kW (40 hp) in all, 1 000 N·m at the
 *   wheels, 130 km/h (80 mph), 0–100 km/h in 8 s, 150 km of range.
 *   · auto-swiat.pl, «Lumeneo Smera: samochód z szerokością motocykla»
 *     (https://www.auto-swiat.pl/wiadomosci/aktualnosci/lumeneo-smera-samochod-z-szerokoscia-motocykla/88z4s47):
 *     every figure above, the only source with the height and the wheelbase.
 *   · seriouswheels.com, «2009 Lumeneo Smera» (https://seriouswheels.com/2009-lumeneo-smera.htm):
 *     2.40 m × 80 cm, 770 lb, 40 hp, 80 mph, 0–62 mph in 8 s; the tilt is set
 *     by a computer from an inertial unit and «a DC servo-motor moves the
 *     cabin and the four wheels».
 *   · caradisiac.com, «Lumeneo Smera en direct: l'ORNI du Mondial»
 *     (https://www.caradisiac.com/Lumeneo-Smera-en-direct-l-ORNI-du-Mondial-53890.htm):
 *     80 cm wide, 2.40 m long, two seats one behind the other, 130 km/h, 0–100 in 8 s, 150 km.
 * - The later pre-series car: 2 500 × 960 mm, track 655 mm, 110 km/h, 100 km,
 *   «tilts up to 25° in curves» (Wikipedia, «Lumeneo SMERA»,
 *   https://en.wikipedia.org/wiki/Lumeneo_SMERA); 2.50 m × 86 cm, 30 kW, a
 *   10 kWh lithium-ion battery under the driver's seat, 110 km/h, the tilt
 *   driven by actuators at the dampers (techno-science.net,
 *   https://www.techno-science.net/fr/dossiers/lumeneo-smera-entre-scooter-et-voiture-41);
 *   96 cm wide, 550 kg «en orden de marcha», a 9 kWh battery, about €25 000
 *   (diariomotor.com, 8 October 2012,
 *   https://www.diariomotor.com/tecmovia/2012/10/08/lumeneo-smera-mas-adaptado-que-el-twizy-pero-mas-caro/).
 * The garage shows the 2008 car: it is the only one with a complete,
 * consistent set (height and wheelbase are only published for it), and its
 * track is the same as the later car's. The 25° lean is from Wikipedia, about
 * the later car; nothing suggests the linkage changed.
 *
 * - auto123.com, «The Lumeneo Smera prototype» (page 2), as cited by the
 *   cornering circuit's table (`circuito/datos.ts`; that page was not fetched
 *   from here): 2 500 × 860 × 1 480 mm, wheelbase 1 700 mm, track 655 mm,
 *   500 kg with batteries, 145/70 R14, 130 km/h, a 20° lean. The tyres are
 *   the only published size, so the model uses them.
 * Not published for either: ground clearance, the centre of gravity, a drag
 * coefficient or a frontal area.
 * The circuit (merged 2026-11-15) reads the wheelbase, the tracks and the
 * height from this car: the wheelbase and tracks are the same in every
 * source; the height here is the 2008 car's 1.45 m (auto123: 1.48 m).
 *
 * ESTIMATED here: see `smeraForma.ts` (overhangs, tyres, clearance, the
 * linkage's geometry, every line of the body). No photo could be looked at
 * while it was modelled (image hosts are blocked from the environment it was
 * built in), so the body follows the figures and the descriptions: narrow,
 * tall, a slim profile with a prominent side shoulder, four wheels that lean
 * with the cabin.
 */

/**
 * The Smera's dynamics, for the cornering simulation (another branch reads this). Metres, kilograms, degrees.
 * `estimado` lists the fields that are not published figures.
 */
export const SMERA_DINAMICA = {
  /** Kerb mass of the 2008 show car (auto-swiat.pl; seriouswheels.com gives 770 lb = 349 kg). The later car: 550 kg (diariomotor.com). */
  masa: 350,
  masaVersionPosterior: 550,
  /** Track between wheel centres, front and rear (auto-swiat.pl; Wikipedia gives the same 655 mm for the later car). */
  viaDel: VIA_DEL, viaTras: VIA_TRAS,
  /** Wheelbase (auto-swiat.pl). */
  batalla: BATALLA,
  /** Maximum lean, either way (Wikipedia: «tilts up to 25° in curves»). */
  inclinacionMax: INCLINACION_MAX,
  /**
   * Centre of gravity height, kerb, upright: ESTIMATED. The battery sits under the driver's seat (techno-science.net)
   * and the floor is low; for a 1.45 m tall body that puts the empty car's centre of mass at about a third of its
   * height. With a 75 kg driver (seat cushion ~0.72 m, the driver's own centre ~0.95 m) it rises to ~0.55 m. Its
   * static rollover threshold upright, half-track over height, is then 0.3275 / 0.55 ≈ 0.60 g: why it has to lean.
   */
  alturaCdg: 0.48,
  alturaCdgConConductor: 0.55,
  /** Height of the lean axis above the road (m): the centres of the tyres' round crowns. ESTIMATED with the tyres. */
  alturaEjeBascula: R_CORONA,
  /** Tyres, all four: 145/70 R14 (0.559 m × 0.145 m), published for the later prototype (auto123.com, via circuito/datos.ts). */
  neumaticos: { delante: '145/70 R14', detras: '145/70 R14', diametro: 2 * R_RUEDA, ancho: ANCHO_RUEDA },
  /** Linkage geometry used by the model (ESTIMATED): arm pivots on the centre line and arm length. */
  varillaje: { ...LINK },
  potenciaKw: 30, vmaxKmh: 130, plazas: 2,
  estimado: ['alturaCdg', 'alturaCdgConConductor', 'alturaEjeBascula', 'varillaje'],
} as const;

const AREA = Math.round(area() * 1000) / 1000;
const AREA_TXT = AREA.toLocaleString('es-ES', { maximumFractionDigits: 2 });

export const VEHICULO: VehiculoGaraje = {
  id: 'smera', nombre: 'Lumeneo Smera (2008)',
  largo: LARGO, ancho: ANCHO, alto: ALTO, batalla: BATALLA, viaDel: VIA_DEL, viaTras: VIA_TRAS,
  masa: SMERA_DINAMICA.masa,
  fuente: `Cuadriciclo basculante francés, dos plazas una detrás de otra, presentado en el Salón de París de 2008. auto-swiat.pl: 2 380 × 800 × 1 450 mm, batalla 1 700 mm, vías 655 / 655 mm, 350 kg, dos motores de 30 kW en total (40 CV), 130 km/h, 0–100 en 8 s, 150 km de autonomía. seriouswheels.com y caradisiac.com: 2,40 m × 80 cm, 770 lb (349 kg), y que un servomotor inclina la cabina y las cuatro ruedas. Wikipedia: se inclina hasta 25° en las curvas. La versión posterior era más grande y pesada: 2 500 × 960 mm, 550 kg, batería de 9–10 kWh, 110 km/h (Wikipedia, techno-science.net, diariomotor.com). auto123.com (prototipo posterior, citado por la tabla del circuito): neumáticos 145/70 R14, que son los que lleva el modelo. Sin publicar, y por tanto estimado aquí: altura libre (0,15 m), voladizos (0,36 y 0,32 m), el paralelogramo de la suspensión y toda la forma de la carrocería (no se pudo ver ninguna foto al modelarlo). No hay Cd publicado; área frontal de este modelo: ${AREA_TXT} m²`,
  envolvente: envolvente(),
  seccion: 2.8,
  construir,
  bascula: { angulo: INCLINACION_MAX, poner: ponerBascula },
};
