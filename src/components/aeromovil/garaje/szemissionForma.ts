import { E, areaFrontal, envolventeDe, semiAncho, type Est } from './forma';
import { estacion } from './apteraPiel';

/*
 * The shape of the garage SZEmission (SZEnergy Team, Shell Eco-marathon
 * UrbanConcept): main dimensions, the body and the canopy as stations
 * (`forma.ts`), the tunnel envelope and the frontal area. The mesh is built in
 * `szemissionModelo.ts`; the sourcing is listed in `szemission.ts`.
 *
 * Axes of the garage: X forward (nose at x > 0), front axle at x = 0, Y up,
 * ground at y = 0, Z lateral with +Z the car's right. Metres.
 *
 * Every number below was read from Eugenio's photos with solved cameras
 * (three photos solved together: the side view with the team, the low 3/4 in
 * front of the building and the head-on shot of car 706), with the scale set
 * by the front track, which the rules fix at 1.00 m minimum and the photos put
 * at 0.77 of the body width (so 1.00 m with a 1.28 m body; the rules allow
 * 1.20-1.30 m). The rear track is the rules' 0.80 m minimum, which the head-on
 * photo agrees with.
 */

export const VIA_DEL = 1.0, VIA_TRAS = 0.8;
export const BATALLA = 1.21;
/** x of the nose tip and of the tail tip. */
export const X_MORRO = 0.97, X_COLA = -2.45;
export const LARGO = X_MORRO - X_COLA; // 3.42
export const ANCHO = 1.28, ALTO = 1.045;
/** Tyre: 95/80 R16 class (outer diameter 0.556 m, 95 mm wide), the size the team's previous UrbanConcept ran. */
export const R_RUEDA = 0.278, ANCHO_RUEDA = 0.095, R_LLANTA = 0.2032;

/**
 * The body, nose tip to tail tip. Low and wide, a flat floor at 14 cm, the
 * nose a blunt wedge (a wide "U" in plan, a lens in side view, tip at 0.31 m),
 * the deck rising to 0.72 m at the door and falling straight into the tail lip
 * at 0.34 m. The sections are near-rectangular with rounded corners (exponent
 * about 3 over the cabin, rounder towards the tips) and lean in above the shoulder.
 */
export const CUERPO: Est[] = [
  E(0.976, 0.302, 0.328, 0.022, 0.026, 0.016, 2.0),
  E(0.962, 0.250, 0.392, 0.110, 0.135, 0.090, 2.2),
  E(0.930, 0.205, 0.448, 0.200, 0.235, 0.160, 2.5),
  E(0.870, 0.175, 0.492, 0.290, 0.330, 0.230, 2.7),
  E(0.780, 0.157, 0.530, 0.380, 0.420, 0.295, 2.9),
  E(0.640, 0.147, 0.572, 0.465, 0.510, 0.355, 3.0),
  E(0.450, 0.143, 0.617, 0.535, 0.588, 0.405, 3.0),
  E(0.200, 0.142, 0.662, 0.568, 0.628, 0.430, 3.0),
  E(-0.150, 0.142, 0.700, 0.580, 0.638, 0.430, 3.0),
  E(-0.500, 0.142, 0.718, 0.575, 0.632, 0.435, 3.0),
  E(-0.850, 0.144, 0.718, 0.556, 0.612, 0.425, 3.0),
  E(-1.200, 0.154, 0.698, 0.512, 0.566, 0.390, 2.9),
  E(-1.500, 0.175, 0.658, 0.450, 0.502, 0.340, 2.8),
  E(-1.800, 0.210, 0.598, 0.375, 0.425, 0.280, 2.6),
  E(-2.100, 0.257, 0.528, 0.290, 0.332, 0.210, 2.45),
  E(-2.300, 0.292, 0.462, 0.212, 0.245, 0.150, 2.3),
  E(-2.400, 0.314, 0.408, 0.140, 0.162, 0.098, 2.2),
  E(-2.438, 0.328, 0.370, 0.068, 0.080, 0.046, 2.1),
  E(-2.450, 0.336, 0.352, 0.016, 0.019, 0.011, 2.0),
];

/**
 * The canopy: a separate bubble sitting on the deck, from the windshield base
 * (x 0.42, 45 cm ahead of the front axle) to the tail, where it runs out into
 * the deck. Its top is the car's highest point, 1.045 m at x ≈ −0.6; its base is
 * 0.60 m wide over the cabin. Its lower part is inside the body and is cut away.
 */
export const CUPULA: Est[] = [
  E(0.430, 0.560, 0.615, 0.050, 0.048, 0.034, 2.2),
  E(0.360, 0.545, 0.648, 0.150, 0.146, 0.100, 2.2),
  E(0.240, 0.550, 0.690, 0.215, 0.208, 0.145, 2.2),
  E(0.100, 0.560, 0.745, 0.255, 0.246, 0.175, 2.2),
  E(-0.050, 0.580, 0.818, 0.280, 0.270, 0.192, 2.2),
  E(-0.200, 0.600, 0.898, 0.292, 0.282, 0.200, 2.2),
  E(-0.380, 0.610, 0.990, 0.298, 0.288, 0.205, 2.2),
  E(-0.580, 0.615, 1.045, 0.300, 0.290, 0.206, 2.2),
  E(-0.760, 0.615, 1.036, 0.298, 0.288, 0.204, 2.2),
  E(-0.950, 0.610, 0.988, 0.288, 0.278, 0.197, 2.2),
  E(-1.200, 0.590, 0.900, 0.263, 0.254, 0.180, 2.2),
  E(-1.450, 0.560, 0.800, 0.228, 0.220, 0.156, 2.2),
  E(-1.700, 0.520, 0.695, 0.186, 0.180, 0.127, 2.2),
  E(-1.950, 0.470, 0.590, 0.138, 0.134, 0.094, 2.2),
  E(-2.150, 0.425, 0.505, 0.094, 0.091, 0.064, 2.2),
  E(-2.300, 0.395, 0.440, 0.045, 0.044, 0.031, 2.1),
  E(-2.360, 0.390, 0.418, 0.006, 0.006, 0.004, 2.0),
];

/** Half-width of the body skin at (x, y): 0 outside. */
export const anchoCuerpo = (x: number, y: number) => semiAncho(estacion(CUERPO, x), y);
/** Half-width of the canopy skin at (x, y): 0 outside. */
export const anchoCupula = (x: number, y: number) => (x > 0.43 || x < -2.36 ? 0 : semiAncho(estacion(CUPULA, x), y));

/** Silhouette for the wind tunnel: body and canopy together (the canopy only adds height). */
export function envolvente(): [number, number, number, number][] {
  const c = envolventeDe(CUERPO), k = envolventeDe(CUPULA);
  return c.map(([x, yb, yt, hw]) => {
    let top = yt;
    for (let i = 0; i < k.length - 1; i++) if ((k[i][0] - x) * (k[i + 1][0] - x) <= 0) {
      const a = k[i], b = k[i + 1], t = b[0] !== a[0] ? (x - a[0]) / (b[0] - a[0]) : 0;
      top = Math.max(top, a[2] + (b[2] - a[2]) * t);
      break;
    }
    return [x, yb, Math.round(top * 1000) / 1000, hw];
  });
}

/** Frontal area (m²): body, canopy and what shows of the four tyres below the floor. */
export function area(): number {
  const bajo = 0.142; // floor height: below it only the tyres show
  const rueda = (z: number): [number, number, number, number] => [z - ANCHO_RUEDA / 2, z + ANCHO_RUEDA / 2, 0, bajo];
  return areaFrontal([
    { es: CUERPO, z0: 0 }, { es: CUPULA, z0: 0 },
    { rect: rueda(VIA_DEL / 2) }, { rect: rueda(-VIA_DEL / 2) }, { rect: rueda(VIA_TRAS / 2) }, { rect: rueda(-VIA_TRAS / 2) },
  ]);
}
