import type { VehiculoGaraje } from './tipos';
import { ALTO, ANCHO, BATALLA, LARGO, VIA_DEL, VIA_TRAS, envolvente } from './nusKruceForma';
import { construir } from './nusKruceModelo';

/*
 * The NUS KRUCE ("Kent Ridge Urban Concept Ecocar"), the National University
 * of Singapore's hydrogen fuel-cell car for the UrbanConcept class of the
 * Shell Eco-marathon: the metallic blue two-box teardrop in Eugenio's photos
 * of 2026-11-09 («Hazlo con un bot y ponlo en el garaje»). Modelled as it
 * raced (black disc wheel covers); shape in `nusKruceForma.ts`, mesh in
 * `nusKruceModelo.ts`.
 *
 * WHICH CAR
 * - NUS launched KRUCE on 20 April 2009 as "the first Singapore-designed,
 *   eco-friendly urban concept car" (NUS press release, reproduced on the
 *   tsikot.com forum, 21 April 2009; Channel NewsAsia and TODAY, 20-21 April
 *   2009, collected on wildsingaporenews.blogspot.com). It ran in the
 *   UrbanConcept class at Shell Eco-marathon Europe 2009 (Lausitz, Germany).
 * - Its successor KRUCE 2 won the UrbanConcept fuel-cell category at the
 *   first Shell Eco-marathon Asia, Sepang, July 2010, at 612.4 km/l, plus the
 *   Safety, Technical Innovation and Autodesk design awards (NUS College of
 *   Design and Engineering, "NUS ECO Car" page; The Star, 15 July 2010;
 *   fuelsandlubes.com). No source found says whether KRUCE 2 kept the 2009
 *   body or which of the two cars the race photo shows: the launch photo is
 *   the 2009 KRUCE and the race photo is the same body.
 *
 * SOURCED
 * - Length 2.7 m, 130 kg, single seat, 40 km/h top speed, 1.2 kW hydrogen
 *   fuel cell driving a wheel hub motor, aluminium and carbon-fibre structure
 *   (2009 KRUCE: TODAY and Straits Times, April 2009; NUS press release).
 * - The release says the body has lower drag than its predecessor, but gives
 *   no Cd, and no frontal area has been published: no `aero`. The wind tunnel
 *   estimates one from the silhouette (decision 2026-11-07).
 * - Bounds from the UrbanConcept rules of those years (Shell Eco-marathon
 *   2008 rules, art. 45 and 52; the 2012 rules quoted by NAU's capstone team
 *   give the same numbers): height 1.00-1.30 m, width 1.20-1.30 m, length
 *   2.20-3.50 m, wheelbase >= 1.20 m, tracks >= 1.00 m front and >= 0.80 m
 *   rear, ground clearance >= 10 cm, 16 or 17-inch rims.
 *
 * MEASURED ON PHOTOS (no published figure)
 * Three photos: the launch (side-rear three-quarter, silver five-spoke rims),
 * the rear view and the race photo (front three-quarter, black disc covers).
 * The launch camera was solved from the two rims (16-inch, the rule) and the
 * tyre contacts, and the model was fitted to that photo (outline, window,
 * door, arches); the rear view gives the width against the rear track. The
 * race photo does NOT fit one pinhole camera with these proportions: its
 * nose looks some 20 cm longer and the car taller for its length. Either the
 * race photo was resized unevenly in the collage or the 2010 car differs;
 * it was used only for the details (band, lamps, canopy, discs, panel).
 * - Wheelbase 1.65 m (the launch-photo solve gives 1.6-1.75 m; the published
 *   length then fixes 0.62 m front and 0.43 m rear overhang).
 * - Height 1.19 m, width 1.26 m, tracks 1.10 / 1.04 m.
 * - The glass canopy (windscreen, glass roof and rear glass in one smoked
 *   piece between two blue roof rails), the side windows with the pillar at
 *   the door's front edge, the door, the arches, the front band, the rear
 *   light bar and the number panel: from the photos with the solved cameras.
 * ESTIMATED
 * - The plan view (no photo from above) and the floor; the cabin (seat,
 *   wheel, bulkhead) is a simple stand-in. No mirrors are visible in the
 *   photos, so none are modelled.
 * No logos, sponsor names, flags, lettering or race numbers: plain metallic
 * blue, and the number panels are blank.
 */
export const VEHICULO: VehiculoGaraje = {
  id: 'nusKruce',
  nombre: 'NUS KRUCE (UrbanConcept)',
  largo: LARGO, ancho: ANCHO, alto: ALTO, batalla: BATALLA, viaDel: VIA_DEL, viaTras: VIA_TRAS,
  fuente: 'KRUCE (Kent Ridge Urban Concept Ecocar), Universidad Nacional de Singapur, presentado el 20 de abril de 2009 (nota de prensa de la NUS; TODAY y Channel NewsAsia): 2,7 m de largo, 130 kg, una plaza, pila de hidrógeno de 1,2 kW. Su sucesor, el KRUCE 2, ganó la categoría UrbanConcept de hidrógeno en la Shell Eco-marathon Asia 2010 en Sepang (612,4 km/l). Solo el largo está publicado: la batalla (1,65 m), el alto (1,19 m), el ancho (1,26 m) y las vías (1,10 / 1,04 m) son estimaciones medidas en la foto de la presentación (con la cámara calculada a partir de las llantas) y en la foto trasera, dentro de los límites del reglamento UrbanConcept de esos años (alto 1,00–1,30 m, ancho 1,20–1,30 m, llantas de 16″). La foto de carrera no encaja del todo con estas proporciones (en ella el morro parece unos 20 cm más largo) y no había foto desde arriba, así que el morro y la planta son lo menos seguro. No hay Cd publicado: el del túnel es una estimación a partir de la silueta',
  envolvente: envolvente(),
  // the largest section is a rounded box: wide round lower tub, narrower glasshouse
  seccion: 2.6,
  construir,
};
