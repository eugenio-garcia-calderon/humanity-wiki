import type { VehiculoGaraje } from './tipos';
import { ALTO, ANCHO, BATALLA, LARGO, VIA_DEL, VIA_TRAS, area, envolvente } from './szemissionForma';
import { construir } from './szemissionModelo';

/*
 * SZEmission, the SZEnergy Team's (Széchenyi István University, Győr) battery-
 * electric UrbanConcept for the Shell Eco-marathon, in the 2025-2026 livery
 * (car 701). The Aeromóvil 1 was shaped from photos of this car, so this model
 * is the garage's main comparison. Shape in `szemissionForma.ts`, mesh in
 * `szemissionModelo.ts`.
 *
 * SOURCED
 * - 95 kg, Cd 0.1365, carbon monocoque, one seat: published by the team
 *   (szenergy.hu, «our racing cars»; already cited in the project's
 *   «proyecto.ts» and «carroceria.ts»). Car designed 2018-2019, refined each
 *   year since (alumni.sze.hu, July 2026).
 * - Shell Eco-marathon UrbanConcept limits the car passed at technical
 *   inspection (sem-app results pages, Europe 2025 and Poland 2026): height
 *   1.00-1.30 m, width 1.20-1.30 m, length 2.20-3.50 m, wheelbase ≥ 1.20 m,
 *   track ≥ 1.00 m front and ≥ 0.80 m rear, ground clearance ≥ 0.10 m, rims
 *   14-18″, towing point at the front, door opening ≥ 500 × 800 mm (2018 rules).
 *
 * ESTIMATED (the team publishes no dimensions)
 * - Proportions from Eugenio's photos with solved cameras: three photos solved
 *   together (side view with the team, low 3/4 in front of the building,
 *   head-on shot of car 706) on tyre contact points, nose tip, tail tip and
 *   canopy top. The scale comes from the rules: the photos put the front track
 *   at 0.77 of the body width, so the 1.00 m minimum track gives a 1.28 m body
 *   (inside the 1.20-1.30 m band); the rear track is the 0.80 m minimum, which
 *   the head-on photo agrees with. Check: people standing ~1 m behind the car in
 *   the side photo come out ~1.78 m tall with that camera.
 * - Result: 3.42 × 1.28 × 1.045 m, wheelbase 1.21 m, overhangs 0.97 m front and
 *   1.24 m rear, nose tip at 0.31 m and tail tip at 0.34 m. Margin about ±3 %
 *   (±10 cm in length). An earlier estimate in this project (2026-11-06) read
 *   2.80 × 1.25 × 1.03 m with a 1.15 m wheelbase: it took the side photo as if
 *   it had no perspective; the camera solve shows a wide lens at ~3.7 m, which
 *   shortens the car against its height, and a 1.15 m wheelbase would not pass
 *   the rules (≥ 1.20 m).
 * - Profile, plan and canopy read from the same photos with those cameras
 *   (silhouettes back-projected onto the centre plane and the sides): canopy
 *   from 0.42 m ahead of the front axle to the tail, top at x ≈ −0.6; door
 *   from x −0.31 to −0.90 m with its window, A-pillar at x ≈ −0.32; front-wheel
 *   hatch from x +0.30 to −0.27; slit headlamps from x 0.40 to 0.80.
 * - Tyres 95/80 R16 class (0.556 m): the radius the team's previous UrbanConcept
 *   (SZElectricity) uses in its public ROS configuration (github.com/szenergy,
 *   «szenergy-common», 0.278 m); the photos agree within a few centimetres.
 * - Cabin (seat, steering, dash, roll hoop) is generic for a car of this kind.
 * No logos, sponsor names, team name, emblem or numbers: the number panels are
 * blank and the livery keeps only its colour fields.
 */
const AREA = Math.round(area() * 1000) / 1000;
const AREA_TXT = AREA.toLocaleString('es-ES', { maximumFractionDigits: 2 });

export const VEHICULO: VehiculoGaraje = {
  id: 'szemission', nombre: 'SZEmission (Shell Eco-marathon)',
  largo: LARGO, ancho: ANCHO, alto: ALTO, batalla: BATALLA, viaDel: VIA_DEL, viaTras: VIA_TRAS,
  fuente: 'Publicado por el SZEnergy Team (Universidad Széchenyi, Győr): 95 kg, Cd 0,1365, monocasco de carbono, una plaza. Límites UrbanConcept que pasa en la inspección (páginas de resultados de la Shell Eco-marathon 2025 y 2026): alto 1,00–1,30 m, ancho 1,20–1,30 m, largo ≤ 3,50 m, batalla ≥ 1,20 m, vías ≥ 1,00 y 0,80 m. Las medidas no se publican: 3,42 × 1,28 × 1,045 m, batalla 1,21 m y vías 1,00/0,80 m son estimadas con cámaras resueltas sobre tres fotos (lateral con el equipo, 3/4 bajo ante el edificio y frontal del coche 706), a escala con la vía delantera mínima del reglamento; margen ±3 %. Neumáticos de 0,556 m (95/80 R16), los del coche anterior del equipo',
  aero: {
    cd: 0.1365, area: AREA, masaVacio: 95, plazas: 1,
    fuente: `Cd 0,1365, 95 kg y una plaza: publicados por el SZEnergy Team (szenergy.hu). Área frontal ${AREA_TXT} m², medida sobre este modelo (carrocería, cúpula y lo que asoma de las ruedas), cuyas medidas son estimadas a partir de fotos`,
  },
  envolvente: envolvente(),
  seccion: 3,
  construir,
};
