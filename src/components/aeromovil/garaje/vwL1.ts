import type { VehiculoGaraje } from './tipos';
import { ALTO, ANCHO, BATALLA, LARGO, VIA_DEL, VIA_TRAS, envolvente } from './unLitroForma';
import { construir } from './unLitroModelo';

/*
 * The Volkswagen 1-Litre car of 2002: the tandem two-seater Ferdinand Piech
 * drove from Wolfsburg to Hamburg in April 2002 (2026-11-07, Eugenio: «añade
 * el XL1 concept... los tres»; 2026-11-08: «que parezca una foto del vehículo
 * real»). Shape in `unLitroForma.ts`, mesh in `unLitroModelo.ts`.
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
 * - Unpainted carbon-fibre skin over a magnesium space frame ("unlackiert");
 *   period reports call it a "black cigar" (motorsport-total.com) and VW's
 *   archive caption describes "a small black car" with a transparent dome.
 * - Tandem seats (fabric on magnesium frames), a dome-like gullwing door 1.5 m
 *   long "drawn down on the left side", no mirrors but cameras in the side
 *   turn signals plus a reversing camera, bi-xenon headlamps, LED daytime
 *   lights, indicators and tail lamps, covered wheels with flat covers, side
 *   cooling inlets that open only when needed, underbody cover, 80-litre
 *   luggage flap in the tail (VW press kit via conceptcarz.com,
 *   autoconcept-reviews.com, ultimatecarpage.com).
 *
 * ESTIMATED (no drawing or photo could be measured for this model)
 * - The whole surface: overhangs (0.60 m front, 0.84 m rear), heights of the
 *   nose, bonnet, shoulder and tail, the plan-view taper, the bubble's shape.
 * - Where the openings and lamps are and how big: front wheel openings,
 *   rear spats, door shut lines, lamp outlines, flap and camera positions.
 * - Wheel-cover colour, interior layout, steering wheel and screens.
 * No logos, badges or lettering: the garage compares shapes, not brands.
 */
export const VEHICULO_1LITRO: VehiculoGaraje = {
  id: 'unlitro', nombre: 'VW 1-Litro Concept 2002',
  largo: LARGO, ancho: ANCHO, alto: ALTO, batalla: BATALLA, viaDel: VIA_DEL, viaTras: VIA_TRAS,
  fuente: 'Ficha de prensa de VW (2002) recogida por ultimatecarpage.com y supercars.net: 3 646 × 1 248 × 1 110 mm, batalla 2 205 mm, vías 1 000 / 810 mm, neumáticos 95/80 R16 y 115/70 R16. La forma (voladizos, perfil, planta, cúpula, luces, aberturas) está estimada: no se ha podido medir ninguna foto ni plano',
  aero: {
    cd: 0.159, area: 1.0, masaVacio: 290, plazas: 2, vmax: 120,
    fuente: 'Cd 0,159 y 290 kg en vacío: Wikipedia, «Volkswagen 1-litre car»; área frontal 1,0 m²: Wikipedia en alemán, «VW 1-Liter-Auto» (este modelo mide 1,00 m²); 120 km/h: ficha de prensa de VW',
  },
  envolvente: envolvente(),
  seccion: 2.6,
  construir,
};
