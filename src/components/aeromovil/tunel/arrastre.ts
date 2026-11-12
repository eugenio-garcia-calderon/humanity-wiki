import { NU } from './capaLimite';

/**
 * From the flow solution to a drag coefficient, in four parts.
 *
 *  · Friction: turbulent flat plate (Schlichting, Cf = 0.455/(log₁₀Re_L)^2.58) on
 *    the wetted area, times Hoerner's supervelocity factor 1 + 1.5·(d/L)^1.5.
 *  · Pressure and wake: Hoerner's attached-flow pressure term Cf·7·(d/L)³ on the
 *    wetted area, plus the base: the area behind the predicted separation line
 *    (each surface streamline owns the sector of its section where it separates)
 *    times a base-pressure coefficient K_BASE.
 *  · Wheels: each wheel is d × w of frontal area with an isolated rotating-wheel
 *    Cd (K_RUEDA) times how much of it meets the air (EXPOSICION, fixed by kind
 *    of fairing).
 *  · Details: mirrors, seals, gaps, cooling, a rough underbody, small parts and
 *    whatever else the method does not see: one ΔCd for all cars (DCD_DETALLES,
 *    the one calibrated constant).
 *
 * d is the equivalent diameter of the largest section (√(4A/π)) and L the length.
 */

export type TipoRueda = 'dentro' | 'paso' | 'carenado' | 'fuera';
export interface RuedaTunel { d: number; w: number; tipo: TipoRueda }

/** Share of a wheel's frontal area that drags like an isolated wheel, by kind of fairing. Fixed, not fitted. */
export const EXPOSICION: Record<TipoRueda, number> = {
  dentro: 0.1,    // inside the body or behind spats; only the bottom shows
  paso: 0.4,      // in an open wheel arch, as on an ordinary car
  carenado: 0.4,  // in its own pod outside the body, on an arm (the pod and arm drag too)
  fuera: 1.0,     // in the open air
};

/**
 * ONE set of constants for every car.
 *  · K_BASE 0.2: base-pressure coefficient (−Cpb) typical of rounded and cut-off
 *    car tails (Hucho, «Aerodynamics of Road Vehicles», 1998). Not fitted: fitting
 *    it together with DCD_DETALLES is unstable on four cars: 0.165 in the first run,
 *    0.080 after the XL1 and 1-Litre silhouettes were rebuilt the same day
 *    (scripts/tunel-pruebas.ts prints it each time).
 *  · K_RUEDA 0.58: isolated rotating wheel (Fackrell & Harvey, 1975). Not fitted.
 *  · DCD_DETALLES: fitted on 2026-11-09 by scripts/tunel-pruebas.ts on the four
 *    closed garage cars with a published Cd (XL1, 1-Litro, SZEmission, Aptera),
 *    «media» resolution, 80 km/h, least squares on the relative error. The Twizy,
 *    open at the sides, is left out of the fit and shown as a test outside it.
 *    2026-11-12: with the Aptera redrawn the same fit gives 0.0565; 0.051 is
 *    kept by Eugenio's decision so our designs' Cd does not move (see
 *    `CALIBRACION.ajusteActual` in calibracion.ts).
 */
export const CONSTANTES = {
  K_BASE: 0.2,
  K_RUEDA: 0.58,
  DCD_DETALLES: 0.051,
};

export interface Desglose {
  /** Cd parts, referred to the reference area. */
  friccion: number; forma: number; estela: number; ruedas: number; detalles: number; total: number;
  /** Re on the length and flat-plate Cf. */
  re: number; cf: number;
}

export function desgloseCd(o: {
  U: number; largo: number; mojada: number; areaMax: number; areaBase: number; areaRef: number; ruedas: RuedaTunel[];
  k?: typeof CONSTANTES;
}): Desglose {
  const k = o.k ?? CONSTANTES;
  const re = o.U * o.largo / NU, cf = 0.455 / Math.pow(Math.log10(re), 2.58);
  const dL = Math.sqrt(4 * o.areaMax / Math.PI) / o.largo;
  const friccion = cf * (1 + 1.5 * Math.pow(dL, 1.5)) * o.mojada / o.areaRef;
  const forma = cf * 7 * Math.pow(dL, 3) * o.mojada / o.areaRef;
  const estela = k.K_BASE * o.areaBase / o.areaRef;
  const ruedas = o.ruedas.reduce((s, r) => s + k.K_RUEDA * r.d * r.w * EXPOSICION[r.tipo], 0) / o.areaRef;
  const detalles = k.DCD_DETALLES;
  return { friccion, forma, estela, ruedas, detalles, total: friccion + forma + estela + ruedas + detalles, re, cf };
}

/**
 * The wheels of the garage cars that have a published Cd (and of those without
 * one), from the tyre sizes and fairings described in each model's file
 * (src/components/aeromovil/garaje/). Tyre diameter = rim + 2 × sidewall.
 */
const tyre = (anchoMm: number, perfil: number, llantaPulg: number) => ({ d: llantaPulg * 0.0254 + 2 * anchoMm / 1000 * perfil / 100, w: anchoMm / 1000 });
export const RUEDAS_GARAJE: Record<string, { ruedas: RuedaTunel[]; nota: string }> = {
  // 125/80 R13 front, 145/80 R13 rear, all four outside the body
  twizy: { ruedas: [...Array(2)].map(() => ({ ...tyre(125, 80, 13), tipo: 'fuera' as const })).concat([...Array(2)].map(() => ({ ...tyre(145, 80, 13), tipo: 'fuera' as const }))), nota: 'cuatro ruedas al aire (125/80 R13 y 145/80 R13)' },
  // two front wheels in pods on arms, the rear one inside the keel; 16″ rim, ~0.59 m × 0.165 m (aptera.ts)
  aptera: { ruedas: [{ d: 0.59, w: 0.165, tipo: 'carenado' }, { d: 0.59, w: 0.165, tipo: 'carenado' }, { d: 0.59, w: 0.165, tipo: 'dentro' }], nota: 'dos ruedas delanteras en carenados sobre brazos y la trasera dentro de la quilla' },
  // 115/80 R15 front in arches, 145/55 R16 rear behind spats
  xl1: { ruedas: [{ ...tyre(115, 80, 15), tipo: 'paso' }, { ...tyre(115, 80, 15), tipo: 'paso' }, { ...tyre(145, 55, 16), tipo: 'dentro' }, { ...tyre(145, 55, 16), tipo: 'dentro' }], nota: 'delanteras en pasos de rueda, traseras tapadas' },
  // 95/80 R16 front with openings, 115/70 R16 rear behind spats
  unlitro: { ruedas: [{ ...tyre(95, 80, 16), tipo: 'paso' }, { ...tyre(95, 80, 16), tipo: 'paso' }, { ...tyre(115, 70, 16), tipo: 'dentro' }, { ...tyre(115, 70, 16), tipo: 'dentro' }], nota: 'delanteras con abertura, traseras tapadas' },
  // four 95/80 R16-class wheels (0.556 m) inside the body, only the bottom shows
  szemission: { ruedas: [...Array(4)].map(() => ({ d: 0.556, w: 0.095, tipo: 'dentro' as const })), nota: 'cuatro ruedas dentro de la carrocería' },
  // 6.50-16 (0.71 m, 0.165 m) in open arches
  jaguarD: { ruedas: [...Array(4)].map(() => ({ d: 0.71, w: 0.165, tipo: 'paso' as const })), nota: 'cuatro ruedas en pasos de rueda' },
  // three 20″ bicycle wheels (≈0.50 × 0.05 m) inside the shell
  aerorider: { ruedas: [...Array(3)].map(() => ({ d: 0.5, w: 0.05, tipo: 'dentro' as const })), nota: 'tres ruedas de bicicleta dentro del casco' },
  // 24″ front and rear inside the body (R_DEL 0.305 m, 80 mm tyres), two 20″ laterals in pods on arms
  // (R_LAT 0.254 m, 70 mm tyres): balaForma.ts. The pods and arms themselves are outside the silhouette.
  // 16″ rims with narrow eco tyres (0.55 m × 0.09 m, nusKruceForma.ts) behind black disc covers, in open
  // arches: the front ones flush with the body side, the rear ones under flared fenders
  nusKruce: { ruedas: [...Array(4)].map(() => ({ d: 0.55, w: 0.09, tipo: 'paso' as const })), nota: 'cuatro ruedas en pasos de rueda, con tapacubos lisos' },
  bala: { ruedas: [{ d: 0.61, w: 0.08, tipo: 'dentro' }, { d: 0.61, w: 0.08, tipo: 'dentro' }, { d: 0.508, w: 0.07, tipo: 'carenado' }, { d: 0.508, w: 0.07, tipo: 'carenado' }], nota: 'delantera y trasera dentro de la carrocería, las laterales en carenados sobre brazos' },
};
