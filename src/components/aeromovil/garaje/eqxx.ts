import type { VehiculoGaraje } from './tipos';
import { ALTO, ANCHO, BATALLA, LARGO, VIA_DEL, VIA_TRAS, area, envolvente } from './eqxxForma';
import { construir } from './eqxxModelo';

/*
 * Mercedes-Benz Vision EQXX (2022): the four-wheel car built to spend as
 * little energy as possible, with the lowest drag coefficient of any
 * electric car when it was shown. Shape in `eqxxForma.ts`, mesh in
 * `eqxxModelo.ts`. Added 2026-11-15 (Eugenio: «falta un coche más
 * aerodinámico de 4 ruedas, que estaría entre el Aptera y el Model Y»).
 *
 * Why this one (the other candidates were the Lightyear 0, the Hyundai
 * Ioniq 6 and the Lucid Air): it has the lowest Cd of the four (0.17), its
 * mass (1 755 kg) sits between the Aptera's and the Model Y's, it is the only
 * one whose frontal area is published (2.12 m², so the model can be checked
 * against it), and it is the car that proved the point on the road: 1 202 km
 * on one charge. It is a concept, not a car on sale. Like all four
 * candidates it is longer than the Model Y (4 977 against 4 797 mm), so in
 * the garage ordered by length it stands after it, not between the two.
 *
 * SOURCED (fetched 2026-11-15)
 * - 4 977 × 1 870 × 1 350 mm, wheelbase 2 800 mm, rear track 50 mm narrower
 *   than the front, 1 755 kg, Cd 0.17, frontal area 2.12 m² (0.39 m² less than
 *   an EQS 450+), 100 kWh, 150 kW, Bridgestone 185/65 R20 tyres, forged
 *   magnesium wheels behind semi-transparent covers, front and rear wheels
 *   flush with the body, a teardrop profile ending in a kammback, glass
 *   mirrors (not cameras), light bars at the front and the rear, 117 solar
 *   cells on the roof; 1 008 km Sindelfingen–Cassis (8.7 kWh/100 km) and
 *   1 202 km Stuttgart–Silverstone (8.3 kWh/100 km): Wikipedia,
 *   «Mercedes-Benz Vision EQXX» (https://en.wikipedia.org/wiki/Mercedes-Benz_Vision_EQXX).
 * - 4 977 × 1 870 × 1 350 mm, wheelbase 2 800 mm, 1 755 kg, Cd 0.17,
 *   185/65 R20, four seats, 100 kWh, 495 kg of battery: auto-data.net
 *   (https://www.auto-data.net/en/mercedes-benz-vision-eqxx-100-kwh-245hp-45675).
 * - Cd «0.17» on page 2 and «0,172» on page 10 of Mercedes-Benz's own press kit
 *   on aerodynamics (https://media.mercedes-benz.fr/download/a3710190-135f-4412-9cd3-7fd11375063d/pm_aerodynamics_en.pdf).
 * - InsideEVs (https://insideevs.com/news/558394/mercedes-eqxx-concept-solar-ev/):
 *   the press release said 0.18, the presenters 0.17; about 1 750 kg; 2.8 m wheelbase.
 * Not published: the tracks themselves (only their difference), the top speed.
 *
 * ESTIMATED: overhangs, tracks, ground clearance, every line of the body;
 * see `eqxxForma.ts`. No photo could be looked at while it was modelled.
 *
 * Wind tunnel: it goes through the tunnel like the others and its estimate
 * is shown next to the published 0.17, but it is NOT part of the calibration
 * fit (`fueraDelAjuste` in tunel/arrastre.ts), as with the Model Y: adding it
 * does not move the Cd of any of our designs.
 */
const AREA = Math.round(area() * 100) / 100;
const AREA_TXT = AREA.toLocaleString('es-ES', { maximumFractionDigits: 2 });

export const VEHICULO: VehiculoGaraje = {
  id: 'eqxx', nombre: 'Mercedes Vision EQXX (2022)',
  largo: LARGO, ancho: ANCHO, alto: ALTO, batalla: BATALLA, viaDel: VIA_DEL, viaTras: VIA_TRAS,
  fuente: `Prototipo de Mercedes-Benz hecho para gastar lo mínimo (2022), el coche eléctrico con el Cd más bajo cuando se presentó; hizo 1 202 km con una carga (Stuttgart–Silverstone, 8,3 kWh/100 km). Wikipedia y auto-data.net: 4 977 × 1 870 × 1 350 mm, batalla 2 800 mm, vía trasera 50 mm más estrecha que la delantera, 1 755 kg, Cd 0,17 (0,172 en el dosier de prensa de Mercedes), área frontal 2,12 m², 100 kWh, 150 kW, neumáticos 185/65 R20 tras tapacubos lisos, ruedas enrasadas con la carrocería, cola cortada, retrovisores de cristal, barras de luz delante y detrás y 117 células solares en el techo. Estimado (sin planos ni fotos a mano al modelarlo): voladizos 0,92 y 1,26 m, vías 1,585 y 1,535 m, altura libre, perfil y secciones`,
  aero: {
    cd: 0.17, area: AREA, masaVacio: 1755, plazas: 4,
    fuente: `Cd 0,17 (Wikipedia; Mercedes-Benz, dosier de aerodinámica: 0,17 y 0,172). 1 755 kg (Wikipedia, auto-data.net). Área frontal ${AREA_TXT} m², medida sobre este modelo (Mercedes publica 2,12 m²)`,
  },
  envolvente: envolvente(),
  seccion: 3.2,
  construir,
};
