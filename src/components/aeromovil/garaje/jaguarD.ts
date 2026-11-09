import type { VehiculoGaraje } from './tipos';
import { ALTO, ANCHO, BATALLA, LARGO, VIA_DEL, VIA_TRAS, envolvente } from './jaguarDForma';
import { construir } from './jaguarDModelo';

/*
 * Jaguar D-Type, 1955 short-nose production ("customer") car, right-hand
 * drive, with the headrest fairing and fin in one piece (2026-11-06, Eugenio:
 * the Aeromóvil's «Opción Jaguar» wraps the wheels in round bulges «como el
 * D-Type»; 2026-11-08: «a un nivel de calidad muy alta y alto detalle»).
 * Shape in `jaguarDForma.ts`, mesh in `jaguarDModelo.ts`, parts and materials
 * in `jaguarDPiezas.ts`.
 *
 * WHY THIS VERSION: it is the one with a consistent published spec table
 * (3 912 mm long, wheelbase 2 300 mm, track 1 270 / 1 219 mm) and the only
 * D-Type photo that could be loaded here (a short-nose car with the fin, 3/4
 * front, from the public GitHub repository aaronplja/motorauto) shows it.
 * The 1955 works long-nose car is 7½ in (190 mm) longer in the nose.
 *
 * SOURCED
 * - Length 3 912 mm: supercars.net «1954 Jaguar D-Type» table and
 *   uniquecarsandparts.com.au (production car); ultimatecarpage.com spec 1598
 *   gives 4 102 mm for the 1955 long nose, i.e. 3 912 + 7½ in (Wikipedia).
 * - Width 1 664 mm (supercars.net) or 1 651 mm (uniquecarsandparts): the
 *   model is 1 660 mm, in between.
 * - Height 800 mm (uniquecarsandparts; ultimatecarpage the same): the body,
 *   without the fin. `alto` is that published figure.
 * - Wheelbase 2 300 mm, track 1 270 mm front and 1 219 mm rear, tyres 6.50-16
 *   on 16 x 5.5 in wheels front and rear (supercars.net). Other sources give
 *   wheelbase 2 286 and 2 294 mm.
 * - Kerb weight just over 862 kg (uniquecarsandparts); 880 kg for the long
 *   nose (ultimatecarpage). Not used: there is no `aero`.
 * - Offset bonnet bulge over the Webers' ram pipes (Wikipedia, after Porter);
 *   headrest fairing and fin one piece from 1955 (Wikipedia); Dunlop alloy
 *   disc wheels with cooling holes drilled near the rim (Motor Sport, «X-ray
 *   spec: Jaguar D-type», June 2004); exhaust manifolds on the left feeding a
 *   box along the lower left of the body (uniquecarsandparts); Perspex
 *   wraparound screen, tonneau over the passenger seat, faired-in headlamps.
 *
 * NO Cd: no published drag coefficient was found. Motor Sport (2004) gives
 * only its own estimate of CdA (about 0.60 m² in 1954, 0.54 m² in 1955), and
 * other pages give drag "28 % less than the C-Type". Following the 2026-11-07
 * decision, `aero` is left out and the wind tunnel says it does not know.
 * Frontal area measured on this model (every triangle seen from the front,
 * 2 mm pixels): 1.18 m² with the screen, fin and tyres; the body alone 1.04 m².
 *
 * PHOTO MATCH (the method of `aptera.ts`): the camera of the 3/4 photo was
 * solved from the near front and rear hubs and both front tyre contacts, with
 * the two headlamps as an unknown symmetric pair. With the focal length free
 * the solve drifts to a very long lens; the residual falls from 13 px at a
 * normal lens to about 3 px at f = 2 500–4 000 px, so the overlay uses 3 000.
 * Read off the photo that way: nose tip x = 0.73–0.83 m (model 0.79), headlamp
 * centres at z = ±0.60, y = 0.56 (moved there from ±0.50), headrest about
 * 0.25 m further back than first drawn (moved: it now rises over the front
 * edge of the rear arch), fin top at the rear 1.11–1.17 m depending on the
 * lens (model 1.075, between that and the orthographic limit of 1.02).
 * Before/after overlays are in the bot's report, not in the repo.
 *
 * ESTIMATED (one 3/4 photo and the published sizes; no drawing was found)
 * - Overhangs (0.79 m front, 0.82 m rear) and the whole surface: heights of
 *   the nose, wing crests (0.80 m) and bonnet, the plan-view waist at the
 *   cockpit, the tail, the size and place of the arches.
 * - Fin top (1.075 m from the ground) and the headrest shape; tyre
 *   diameter (710 mm); the screen's height and rake; the cockpit, door and
 *   bonnet outlines; the positions of the fuel filler, catches, mirror, tail
 *   lamps and side exhaust outlet; the number and size of the wheel holes and
 *   the two-eared spinner.
 * - Colour: British Racing Green with green leather; the photographed car is
 *   red, and customer cars came in several colours.
 * No badges, no lettering, no race numbers: the roundels are blank.
 */
export const VEHICULO: VehiculoGaraje = {
  id: 'jaguarD', nombre: 'Jaguar D-Type 1955 (morro corto)',
  largo: LARGO, ancho: ANCHO, alto: ALTO, batalla: BATALLA, viaDel: VIA_DEL, viaTras: VIA_TRAS,
  fuente: 'D-Type de producción de 1955, morro corto, con aleta. Largo 3 912 mm, batalla 2 300 mm, vías 1 270 / 1 219 mm y neumáticos 6.50-16: tabla de supercars.net, y largo y alto 800 mm (a la carrocería, sin la aleta) de uniquecarsandparts.com.au; ancho 1 651–1 664 mm según la fuente (el modelo, 1 660). La forma está reconstruida con esas medidas y una sola foto de 3/4: voladizos, alturas, pasos de rueda, aleta (≈1,07 m), parabrisas y piezas pequeñas son estimados. Faros y reposacabezas colocados midiendo la foto. Sin Cd publicado: no se da dato aerodinámico. Área frontal medida en el modelo: ≈1,18 m²',
  envolvente: envolvente(),
  seccion: 2.6,
  construir,
};
