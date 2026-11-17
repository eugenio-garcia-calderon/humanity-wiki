import type { VehiculoGaraje } from './tipos';
import { ALTO, ANCHO, HELICE, LARGO, ROTOR, VIA_PRINCIPAL, X_COLA, X_PRINCIPAL, X_PUNTA } from './autogiroForma';
import { construir } from './autogiroModelo';

/*
 * ELA Aviación's latest autogyro, the Eclipse REVO (2026-11-17, Eugenio with a photo of a copper one: «haz un modelo
 * 3D del autogiro de ELA Aviación, el último modelo»). Shape in `autogiroForma.ts`, mesh in `autogiroModelo.ts`.
 *
 * WHICH MODEL. ELA (Fuente Obejuna, Córdoba) builds the enclosed tandem ELA 10 Eclipse (2014), the Eclipse EVO
 * (Rotax 915 iS, 140 hp) and, newest, the Eclipse REVO: shown at AERO Friedrichshafen 2024, in production, listed as
 * 2026 aircraft. Same enclosed tandem airframe, with a Rotax 916 iS (160 hp) that also drives a stronger prerotator
 * (rotor spun to 500 rpm before the take-off), so it can leave the ground in about 10 m. The photo is that airframe.
 *
 * SOURCED (fetched 2026-11-17)
 * - REVO: Rotax 916 iS, 160 hp; prerotator to 500 rpm (300 on the other ELA models); take-off under 10 m; the drive
 *   rework added about 20 kg; in production (evtol.news, «AERO Friedrichshafen 2024»; revo.elaaviacion.com;
 *   elaaviacion.com «REVO: taking off into the future of personal aviation», April 2024).
 * - REVO listing (aircraft.com, «2026 ELA Aviation Eclipse REVO»): 916 iS 160 hp, Helix composite propeller,
 *   MTOW 530 kg, cruise up to 160 km/h, range over 500 km.
 * - EVO type sheet (DULV, ELA 10-Eclipse EVO, 988-22): rotor 8.53 m, NACA 8H12; propeller Helix H60V, 3 blades,
 *   1.72 m; Rotax 915 iS; empty 331 kg, maximum 560 kg, 2 seats.
 * - EVO (aeroexpo.online; elaaviacion.com/eclipse-evo): 81 l tank, cruise 180 km/h, VNE 200 km/h, range 600 km.
 * Not published in text: length, height, width, track, wheelbase, cabin width (ELA's technical sheet is an image that
 * could not be fetched), and the REVO's own empty mass.
 *
 * ESTIMATED: every dimension but the rotor and the propeller, from the photo with those two as scale; the empty mass
 * 351 kg = the EVO's 331 kg + the REVO's ≈ 20 kg of drive rework.
 *
 * AN AIRCRAFT, NOT A ROAD VEHICLE: no `envolvente` and no `aero`, like the Vision Jet. The wind tunnel, the
 * consumption comparison and the stability circuit are built for cars on the road and leave it out; the aerodynamic
 * study only looks at our own design. The rotor is parked fore and aft, so its blades reach 2.6 m ahead of the nose
 * and 1.5 m behind the tail, 2.7 m up (above every car next to it in the row).
 */
const ROTOR_TXT = ROTOR.toLocaleString('es-ES'), HELICE_TXT = HELICE.toLocaleString('es-ES');
const m = (v: number) => v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const VEHICULO: VehiculoGaraje = {
  id: 'autogiro',
  nombre: 'Autogiro ELA Eclipse REVO',
  largo: LARGO, ancho: ANCHO, alto: ALTO, batalla: -X_PRINCIPAL,
  viaDel: 0, viaTras: VIA_PRINCIPAL,
  fuente: `El autogiro más nuevo de ELA Aviación (Fuente Obejuna, Córdoba): el Eclipse REVO, presentado en AERO Friedrichshafen 2024 y en producción. Biplaza en tándem cerrado; motor Rotax 916 iS de 160 CV, que también hace girar el rotor antes de despegar (a 500 rpm) para salir en unos 10 m (evtol.news; revo.elaaviacion.com). Anuncio de un REVO 2026 (aircraft.com): 530 kg de peso máximo al despegue, crucero hasta 160 km/h, más de 500 km de autonomía. Del Eclipse EVO, la misma célula (ficha DULV 988-22): rotor de ${ROTOR_TXT} m, hélice Helix de tres palas y ${HELICE_TXT} m, 331 kg en vacío; 81 l de depósito y 200 km/h de velocidad máxima (aeroexpo, elaaviacion.com). ESTIMADO en la foto, con el rotor y la hélice como escala (ELA no publica estas medidas en texto): ${m(LARGO)} m de largo sin el rotor, ${m(ANCHO)} m de ancho, ${m(ALTO)} m de alto, batalla ${m(-X_PRINCIPAL)} m, vía ${m(VIA_PRINCIPAL)} m, cabina de 0,80 m; y 351 kg en vacío (los 331 del EVO más unos 20 kg del nuevo arrastre del rotor). Es una aeronave: fuera del túnel de viento y de las comparaciones de consumo, que son para coches`,
  masa: 351,
  morroCola: [X_PUNTA, X_COLA],
  construir,
};
