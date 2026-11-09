import type { VehiculoGaraje } from './tipos';
import { ALTO, ANCHO, BATALLA, LARGO, VIA_DEL, VIA_TRAS, envolvente } from './unLitroForma';
import { construir } from './unLitroModelo';

/*
 * The Volkswagen 1-Litre car of 2002: the tandem two-seater Ferdinand Piech
 * drove from Wolfsburg to Hamburg in April 2002 (2026-11-07, Eugenio: «añade
 * el XL1 concept... los tres»; 2026-11-08: «que parezca una foto del vehículo
 * real»; 2026-11-09: «mejora el Xl1 concept 2002... para que sean mucho más
 * reales y parecidos al producto real»). Shape in `unLitroForma.ts`, mesh in
 * `unLitroModelo.ts`.
 *
 * SOURCED
 * - 3 646 x 1 248 x 1 110 mm, wheelbase 2 205 mm, track 1 000 / 810 mm, 290 kg:
 *   VW press-release spec table as reproduced by ultimatecarpage.com (spec
 *   1316) and supercars.net; traumautoarchiv.de and the German press release
 *   (3,65 m) agree. English Wikipedia says 3.47 m: it disagrees with every
 *   spec table found and is not used.
 * - Tyres 95/80 R16 front, 115/70 R16 rear on 16-inch composite rims
 *   (supercars.net table; "16-Zoll-Felgen", autokiste.de).
 * - Cd 0.159 (Wikipedia); frontal area 1.0 m2 (de.wikipedia, «VW 1-Liter-Auto»).
 * - Unpainted carbon-fibre skin over a magnesium space frame ("unlackiert";
 *   supercars.net: "to save weight, it is of course not painted").
 * - Tandem seats, a canopy door, no mirrors but cameras in the side turn
 *   signals plus a reversing camera, bi-xenon headlamps, LED daytime lights,
 *   indicators and tail lamps, side cooling inlets that open only when needed,
 *   80-litre luggage space in the tail (VW press kit via conceptcarz.com,
 *   autoconcept-reviews.com, ultimatecarpage.com).
 *
 * MEASURED ON ONE PHOTO (2026-11-09)
 * One VW press photo of the car on the test track, front-left 3/4 (Eugenio's
 * collage, and the same frame at 799 x 533 in the public mono/SkiaSharp.Extended
 * concept-car collection). Its camera was solved from the left wheels, the EU
 * number plate (520 x 110 mm) and the published height (residuals 2-7 px), and
 * photo features were read back onto the car: the glass base along the sides at
 * y 0.78-0.79, the windscreen starting at x = +0.11 on the centre line, the
 * canopy's flat top from x -0.9 to -1.7, the bubble ending on the tail at
 * x -2.5; the nose face at x 0.63-0.67 (front overhang 0.67 m, so 0.77 m at
 * the rear); the front arch (lip top at ~0.62, from x +0.33 to -0.29); the
 * door's two hoops on the canopy and its lower outline on the left side; the
 * headlamps (two round lamps under one cover on each nose corner); the LED
 * strip below them; the side indicator pods; the sill crease; the side inlet;
 * the black wheel discs; the floor rising to ~0.19 m over the rear axle; the
 * driver's head at x ~ -1.3. Expect a few centimetres of error, more towards
 * the tail.
 *
 * ESTIMATED (no side, rear or top photo could be measured)
 * - The cross-sections (only their outline in that one view is checked), the
 *   tail and its lamps, the right-hand side (taken as the mirror of the left
 *   apart from the door), the bonnet crown, the cabin.
 * - The model's frontal area is 1.09 m2, 9 % above the published 1.0 m2: the
 *   real sections are probably slimmer low down than this reconstruction.
 * No logos, badges or lettering: the garage compares shapes, not brands.
 */
export const VEHICULO_1LITRO: VehiculoGaraje = {
  id: 'unlitro', nombre: 'VW 1-Litro Concept 2002',
  largo: LARGO, ancho: ANCHO, alto: ALTO, batalla: BATALLA, viaDel: VIA_DEL, viaTras: VIA_TRAS,
  fuente: 'Ficha de prensa de VW (2002) recogida por ultimatecarpage.com y supercars.net: 3 646 × 1 248 × 1 110 mm, batalla 2 205 mm, vías 1 000 / 810 mm, neumáticos 95/80 R16 y 115/70 R16; carrocería de fibra de carbono sin pintar. Medido sobre una foto de prensa (vista 3/4 delantera, cámara calculada con las ruedas y la matrícula): altura de la línea de cintura, inicio y techo de la cúpula, voladizo delantero (0,67 m), paso de rueda, faros, marcos de la puerta, tapas negras de las ruedas. Estimado: las secciones, la cola y sus pilotos y el interior, porque no se encontró ninguna foto de lado, de atrás ni de arriba',
  aero: {
    cd: 0.159, area: 1.0, masaVacio: 290, plazas: 2, vmax: 120,
    fuente: 'Cd 0,159 y 290 kg en vacío: Wikipedia, «Volkswagen 1-litre car»; área frontal 1,0 m²: Wikipedia en alemán, «VW 1-Liter-Auto» (este modelo mide 1,09 m²: su sección es algo más llena que la real); 120 km/h: ficha de prensa de VW',
  },
  envolvente: envolvente(),
  seccion: 2.6,
  construir,
};
