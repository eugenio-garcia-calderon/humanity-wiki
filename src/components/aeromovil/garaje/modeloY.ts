import type { VehiculoGaraje } from './tipos';
import { ALTO, ANCHO, BATALLA, LARGO, VIA_DEL, VIA_TRAS, area, envolvente } from './modeloYForma';
import { construir } from './modeloYModelo';

/*
 * Tesla Model Y, current car: the 2025 refresh («Juniper», on sale in China
 * from January 2025 and in Europe and North America from March 2025). Shape in
 * `modeloYForma.ts`, mesh in `modeloYModelo.ts`. Added 2026-11-12 (Eugenio:
 * «Añada el model Y de Tesla en el garaje de vehículos»).
 *
 * SOURCED (fetched 2026-11-12)
 * - 4 797 × 1 920 (without mirrors; 2 129 with them) × 1 624 mm, wheelbase
 *   2 890 mm, tracks 1 636 / 1 636 mm, ground clearance 167 mm, Cd 0.22, kerb
 *   1 994 kg, 78.4 kWh, 201 km/h, tyres 255/45 R19 (or 255/40 R20):
 *   evspecifications.com, «2025 Tesla Model Y Long Range AWD»
 *   (https://www.evspecifications.com/en/model/583c331).
 * - Length 4 797 mm, wheelbase 2 890 mm and Cd 0.22 «versus 0.23 for the
 *   previous Model Y»: CarNewsChina, 10 January 2025, on the launch in China
 *   (https://carnewschina.com/2025/01/10/tesla-model-y-juniper-launched-in-china-ahead-of-the-us-starts-at-35950-usd/).
 * - Track 1 636 mm, clearance 167 mm and a frontal area of 2.65 m²:
 *   evkx.net (https://evkx.net/models/tesla/model_y/model_y_rwd/specifications/);
 *   the area is a database figure with no stated method, so the tunnel uses
 *   this model's own (2.63 m², within 1 % of it).
 * - The earlier car (2020–2024): Cd 0.23 (Wikipedia, «Tesla Model Y», citing
 *   Motor Authority, March 2019) and 4 751 mm long; width, height and
 *   wheelbase unchanged (basenor.com, «Model Y Juniper dimensions»). The US
 *   sites give the refresh as 4 790 mm long; the Chinese and European figure,
 *   4 797 mm, is used here.
 * - What the body has, from the same articles and Wikipedia: a thin
 *   full-width light bar across the front (the daytime running lights), the
 *   headlamps lower in the bumper, a full-width tail light bar with a
 *   ducktail spoiler, a glass roof, redesigned aero wheels.
 *
 * ESTIMATED: the overhangs (0.93 / 0.977 m), the side-view lines and the
 * sections; see `modeloYForma.ts`. No photos were used (image hosts are
 * usually blocked from the environment it was built in, and none was tried),
 * so it was drawn from the figures and those descriptions: honest proportions,
 * simple details.
 *
 * Wind tunnel: the car goes through the tunnel like the others and its
 * estimate is shown next to the published 0.22, but it is NOT part of the
 * calibration fit (`fueraDelAjuste` in tunel/arrastre.ts; Eugenio's decision
 * of 2026-11-12 not to move the calibration).
 */
const AREA = Math.round(area() * 100) / 100;
const AREA_TXT = AREA.toLocaleString('es-ES', { maximumFractionDigits: 2 });

export const VEHICULO: VehiculoGaraje = {
  id: 'modeloY', nombre: 'Tesla Model Y (2025)',
  largo: LARGO, ancho: ANCHO, alto: ALTO, batalla: BATALLA, viaDel: VIA_DEL, viaTras: VIA_TRAS,
  fuente: 'Model Y actual (renovación de 2025, «Juniper»). evspecifications.com (Long Range AWD 2025): 4 790–4 797 × 1 920 mm sin retrovisores (2 129 con ellos) × 1 624 mm, batalla 2 890 mm, vías 1 636 / 1 636 mm, altura libre 167 mm, Cd 0,22, 1 994 kg, 78,4 kWh, neumáticos 255/45 R19. CarNewsChina (10/01/2025, lanzamiento en China): 4 797 mm de largo y Cd 0,22 frente a 0,23 del Model Y anterior. evkx.net: área frontal 2,65 m². Estimado (sin planos acotados ni fotos a mano al modelarlo): voladizos 0,93 y 0,98 m, perfil, secciones, y la posición de la barra de luz, los faros y el piloto',
  aero: {
    cd: 0.22, area: AREA, masaVacio: 1994, plazas: 5, vmax: 201,
    fuente: `Cd 0,22 del Model Y renovado (CarNewsChina, enero de 2025; evspecifications.com); el anterior daba 0,23 (Wikipedia). 1 994 kg en vacío y 201 km/h (Long Range AWD, evspecifications.com). Área frontal ${AREA_TXT} m², medida sobre este modelo (evkx.net da 2,65 m²)`,
  },
  envolvente: envolvente(),
  seccion: 3.2,
  construir,
};
