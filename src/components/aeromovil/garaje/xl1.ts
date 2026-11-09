import type { VehiculoGaraje } from './tipos';
import { ALTO, ANCHO, BATALLA, LARGO, VIA_DEL, VIA_TRAS, envolvente } from './xl1Forma';
import { construir } from './xl1Modelo';

/*
 * The production Volkswagen XL1 (2013, 250 built): the white car in Eugenio's
 * photo of 2026-11-09 («mejora ... el XL1 de serie 2013, para que sea mucho
 * más real y parecido al producto real»). Shape in `xl1Forma.ts`, mesh in
 * `xl1Modelo.ts`.
 *
 * SOURCED
 * - 3 888 x 1 665 x 1 153 mm, wheelbase 2 224 mm, 795 kg, Cd 0.189: VW press
 *   kit (Geneva 2013, volkswagen-newsroom.com "Der XL1"); cars-data.com,
 *   ultimatecarpage.com (spec 5460) and ADAC give the same four sizes.
 * - Tyres 115/80 R15 front, 145/55 R16 rear (press kit, cars-data.com).
 * - Frontal area 1.5 m2, 158 km/h limited: Wikipedia, «Volkswagen 1-litre
 *   car». (The press kit says 160 km/h; the card keeps the figure the wind
 *   tunnel already used.)
 * - What the body has, from the press kit: no radiator grille; a black
 *   cross-band joining the LED headlamps; slim LED indicators that follow the
 *   wheel arches and form a line under the headlamps; louvres in the lower
 *   intake; a "dolphin" plan view tapering to the tail; wing doors hinged on
 *   the A-pillars and the roof frame that reach far into the roof;
 *   polycarbonate side windows; no rear window; one large lid over engine and
 *   luggage; rear wheels fully covered; a red LED band framing the top and
 *   sides of the tail; a black diffuser under a fully covered floor; cameras
 *   on the doors instead of mirrors.
 *
 * MEASURED ON PHOTOS (no published figure)
 * Five photos: Eugenio's front-three-quarter view (doors closed), the same car
 * with the doors open, a front and a rear view of it, and a front view of a
 * works car. Cameras were solved from known points (number plate 520 x 110
 * mm and the dealer's plate holder, front hub cap, tyre contacts, roof top);
 * features seen in two photos were triangulated.
 * - Tracks 1.46 / 1.24 m: tyre spacing in the front and rear views (no spec
 *   table found gives them). Front overhang 0.70 m (only the sum is published).
 * - Headlamp and indicator corners (triangulated, front + three-quarter): the
 *   lens wraps round the nose's diagonal corner back to x = 0.24 m, 0.56 m up,
 *   which makes the nose a blunt wedge in plan; the cross-band is 5 cm tall.
 * - Windscreen corners (triangulated): base at x = -0.15 m, 0.75 m up; top at
 *   x = -0.69 m, 1.04 m up. Side-window outline, door, spat and lid shut lines,
 *   rear light band and plate position: from the single photos with their
 *   solved cameras.
 * ESTIMATED
 * - There is no side or top view among the photos: the roof line behind the
 *   peak, the tail in side view and the floor are the least certain parts
 *   (fitted to the three-quarter silhouette, a few centimetres either way).
 * - The cabin (seats, dashboard, steering wheel) is a simple stand-in.
 * No logos, badges, lettering or plate characters: the garage compares shapes.
 */
export const VEHICULO: VehiculoGaraje = {
  id: 'xl1',
  nombre: 'VW XL1 2013 (serie)',
  largo: LARGO, ancho: ANCHO, alto: ALTO, batalla: BATALLA, viaDel: VIA_DEL, viaTras: VIA_TRAS,
  fuente: 'Ficha de prensa de VW (Ginebra 2013) y fichas de cars-data.com, ultimatecarpage.com y ADAC: 3 888 × 1 665 × 1 153 mm, batalla 2 224 mm, neumáticos 115/80 R15 y 145/55 R16. Las vías (1,46 / 1,24 m) y los voladizos no se publican: están medidos en cinco fotos del coche de serie con la cámara calculada, igual que el morro, los faros, el parabrisas, las ventanillas y las luces. No había ninguna foto de lado ni de planta, así que el perfil del techo y de la cola es lo menos seguro',
  aero: {
    cd: 0.189, area: 1.5, masaVacio: 795, plazas: 2, vmax: 158,
    // the model's own frontal area, measured with `areaFrontalModelo()` in xl1Forma.ts (2026-11-09): 1.56 m²
    fuente: 'Cd 0,189, área frontal 1,5 m² (CdA 0,28 m²), 795 kg en vacío y 158 km/h limitada: Wikipedia, «Volkswagen 1-litre car» (datos de VW). Este modelo mide 1,56 m² de área frontal',
  },
  envolvente: envolvente(),
  seccion: 2.6,
  construir,
};
