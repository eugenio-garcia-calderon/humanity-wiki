// The design's own numbers that the homologation pre-check reads (2026-11-17). One function per vehicle type, from
// the same model and results the rest of the editor shows: the masses of «Peso» (`res.mVeh`, the battery from the
// battery block), the motor's power from the Motor tab's fields (`tKWNom`, the catalogue writes into them), the top
// speed from the same energy calculation as the Motor tab (it needs the tunnel's Cd: null until it is computed).
// Pure (no React, no three.js): `scripts/homologacion.ts` runs it in Node.
import type { Modelo, Parametros, Resultados } from '../geometria';
import { EQUIPAJE, RUEDAS_TRICICLO, cargasRueda, camposTriciclo, energiaTriciclo, limitarTriciclo, type ModeloTriciclo } from '../geometriaTriciclo';
import { EQUIPAJE_B, RUEDAS_BASCULANTE, camposBasculante, energiaBasculante, type ModeloBasculante } from '../geometriaBasculante';
import type { Magnitud, VistaFicha } from './normas';
import { electronicaTriciclo, type Electronica } from '../triciclo/electronica';

/** Petrol density (kg/L), for the fuel in the tank. */
const KG_LITRO_GASOLINA = 0.745;

export interface FichaHomologacion extends VistaFicha {
  vehiculo: string;
  tipo: Modelo['tipo'];
  ruedasFisicas: number;
  /** Physical wheels minus one per pair closer than 460 mm (art. 3.72 of 168/2013). */
  ruedasLegales: number;
  /** Everything the parts list weighs, battery included (kg). */
  masaVacio: number | null;
  masaBateria: number | null;
  /** The fuel in a full tank (kg); mass in running order counts it at 90 %. */
  masaCombustible: number;
  /** Fully laden: every seat taken and the luggage (kg). */
  masaMaxima: number | null;
  masaOcupante: number;
  potenciaContinua: number | null;
  potenciaTermica: number | null;
  vmaxNominal: number | null;
  largo: number | null; ancho: number | null; alto: number | null;
  radioGiro: number | null;
  /** % of the laden mass on the front axle. */
  repartoDelantero: number | null;
  kWporKg: number | null;
  /** How each figure was obtained, for the panel. */
  notas: string[];
  /** (2026-11-17) the Triciclo's power electronics: modes, totals, limiters (triciclo/electronica.ts); null for the others */
  electronica: Electronica | null;
  /** top speed with both motors at once in the strongest mode (km/h), when the Cd is known */
  vmaxConjunta: number | null;
}

/** The tunnel's Cd, when known (the same one the Motor tab uses). */
export interface CdConocido { cd?: number; areaRef?: number }

const conCd = (cd?: CdConocido | null) => cd?.cd != null && cd.areaRef != null ? { cd: cd.cd, areaRef: cd.areaRef } : null;

export function fichaHomologacion(P: Parametros, modelo: Modelo, res: Resultados, cd?: CdConocido | null, nombre?: string): FichaHomologacion {
  const base = (): Omit<FichaHomologacion, 'vehiculo' | 'tipo'> => ({
    ruedasFisicas: 4, ruedasLegales: 4, parejas: [], inclina: false, plazas: null, horcajadas: null, manillar: null, cerrado: null, pedaleo: false, propulsion: 'electrico',
    parabrisasPlastico: null, retrovisores: null, ruedasCarga: null, masaVacio: null, masaBateria: null, masaCombustible: 0, masaOrdenMarcha: null, masaMaxima: null,
    masaOcupante: 75, potenciaContinua: null, potenciaPico: null, potenciaTermica: null, potenciaCategoria: null, vmax: null, vmaxNominal: null, velocidadDiseno: null,
    largo: modelo.xn - modelo.xt, ancho: null, alto: null, radioGiro: null, repartoDelantero: null, kWporKg: null, notas: [], electronica: null, vmaxConjunta: null,
  });
  let f: FichaHomologacion;
  if (modelo.tipo === 'triciclo') f = { vehiculo: nombre ?? 'Triciclo', tipo: 'triciclo', ...fichaTriciclo(P, modelo, res, conCd(cd), base()) };
  else if (modelo.tipo === 'basculante') f = { vehiculo: nombre ?? 'Cuadriciclo Basculante', tipo: 'basculante', ...fichaBasculante(P, modelo, res, conCd(cd), base()) };
  else if (modelo.tipo === 'a1') {
    const b = base(), a1 = res.a1;
    f = {
      ...b, vehiculo: nombre ?? 'Aeromóvil 1', tipo: 'a1',
      parejas: [{ nombre: 'delanteras', via: modelo.via.del }, { nombre: 'traseras', via: modelo.via.tras }],
      plazas: P.plazas, horcajadas: false, manillar: false, cerrado: true, parabrisasPlastico: true,
      masaVacio: res.mVeh, masaBateria: a1?.bateriaKg ?? null, masaMaxima: res.mVeh + P.plazas * P.mOcc, masaOcupante: P.mOcc,
      potenciaContinua: P.kWNom, potenciaPico: P.kWPico, vmax: a1?.vmaxPico ?? null, vmaxNominal: a1?.vmaxNominal ?? null, velocidadDiseno: P.speed,
      ancho: modelo.P.W, alto: modelo.P.H,
      notas: ['Masas, potencia y velocidad máxima del Aeromóvil 1 (pestañas Propulsión y Energía).', 'Radio de giro y reparto por ejes: el modelo del Aeromóvil 1 no los calcula.'],
    };
  } else if (modelo.tipo === 'bala') {
    const b = base();
    f = {
      ...b, vehiculo: nombre ?? 'Cuadriciclo Bala', tipo: 'bala',
      parejas: [{ nombre: 'laterales', via: modelo.F.VIA_LAT }], plazas: 2, horcajadas: true, cerrado: true, parabrisasPlastico: true,
      ancho: modelo.anchoTotal, alto: modelo.alto,
      notas: ['El Cuadriciclo Bala es solo la carrocería: su chasis, su motor y su batería no están diseñados, así que la masa, la potencia y la velocidad no se pueden comprobar. Para eso, el Triciclo en rombo (Triciclo › Rodaje › Disposición de las ruedas).'],
    };
  } else {
    // the Gota: pedal-assisted, four wheels in a diamond, three riders
    const b = base(), bat = res.masas['Baterías'] ?? null;
    f = {
      ...b, vehiculo: nombre ?? 'Aeromóvil Gota', tipo: 'gota', pedaleo: true, propulsion: 'pedaleo',
      parejas: [{ nombre: 'laterales', via: P.track }], inclina: true, plazas: 3, horcajadas: true, manillar: true, cerrado: true, parabrisasPlastico: true,
      masaVacio: res.mVeh, masaBateria: bat, masaMaxima: res.mVeh + 3 * P.mOcc, masaOcupante: P.mOcc,
      potenciaContinua: 0.25, vmax: res.vmax, velocidadDiseno: P.speed, ancho: P.W, alto: P.H,
      notas: ['El Gota se calcula con un motor de 250 W y el pedaleo de sus ocupantes; la velocidad es la sostenida con esos 250 W.'],
    };
  }
  // derived figures, the same for every vehicle
  f.ruedasLegales = f.ruedasFisicas - f.parejas.filter(p => p.via <= 0.46).length;
  if (f.masaVacio != null && f.masaOrdenMarcha == null) f.masaOrdenMarcha = f.masaVacio - (f.masaBateria ?? 0) - 0.1 * f.masaCombustible;
  if (f.potenciaCategoria == null && f.potenciaContinua != null) f.potenciaCategoria = f.potenciaContinua + (f.potenciaTermica ?? 0);
  if (f.potenciaCategoria != null && f.masaOrdenMarcha) f.kWporKg = f.potenciaCategoria / f.masaOrdenMarcha;
  return f;
}

function fichaTriciclo(P: Parametros, m: ModeloTriciclo, res: Resultados, cd: { cd: number; areaRef: number } | null, b: Omit<FichaHomologacion, 'vehiculo' | 'tipo'>): Omit<FichaHomologacion, 'vehiculo' | 'tipo'> {
  const T = camposTriciclo(P), r = res.triciclo!, L = (k: Parameters<typeof limitarTriciclo>[0]) => limitarTriciclo(k, T);
  const mOcc = L('tMOcc'), ph = m.phev;
  const e = cd ? energiaTriciclo(m, res.mTot, cd) : null;
  const vGas = e?.hibrido?.vmaxGasolina ?? 0;
  // (2026-11-17) the category's power is the electronics' continuous total in its strongest mode (134/2014, annex X,
  // app. 2.4: every hybrid mode, the highest result). Defaults: the e-motor's nominal plus the engine, as before
  const el = electronicaTriciclo(T);
  // the wheel loads (masas.ts `cargasRueda`: everyone on board and the luggage); not for the diamond, whose four
  // supports it does not share out
  const cargas = !m.rombo ? cargasRueda(m, r.piezas) : null;
  const notas = [
    `Masa: la lista «Peso» (${Math.round(res.mVeh)} kg) menos la batería (${Math.round(r.bateria.kg)} kg)${ph ? ' y el 10 % del combustible (la norma cuenta el depósito al 90 %)' : ''}.`,
    `Potencia continua: la nominal del motor (pestaña Motor: ${limitarTriciclo('tKWNom', T).toLocaleString('es-ES')} kW${m.cuatro ? ', los dos motores juntos' : ''})${ph ? ` más los ${el.termicoNeto.toLocaleString('es-ES')} kW del motor de gasolina` : ''}${el.limCont != null || el.modos.length > 1 ? `, con la electrónica de potencia (Motor › Electrónica de potencia): ${el.contTotal.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kW en el modo más potente («${el.modoCont.nombre}»)` : ''}.`,
    e ? 'Velocidad máxima: la que alcanza con la potencia máxima, con el Cd del túnel (la misma cuenta que la pestaña Motor).' : 'Velocidad máxima: hace falta el Cd del túnel, que se está calculando.',
  ];
  if (m.rombo) notas.push('Rombo: el reparto de peso entre sus cuatro ruedas no se calcula, así que el peso en el eje delantero y la carga de cada neumático quedan por comprobar.');
  return {
    ...b,
    ruedasFisicas: m.rombo || m.cuatro ? 4 : 3,
    parejas: [{ nombre: m.rombo ? 'laterales' : 'delanteras', via: m.F.VIA_LAT }, ...(m.traseras ? [{ nombre: 'traseras', via: m.traseras.VIA_LAT }] : [])],
    // (2026-11-24) the driver's chainless pedals (bici/pedales.ts): the pedal-assist category enters the comparison
    pedaleo: !!m.pedalesBici,
    inclina: !!m.bascula, plazas: r.ocupantes, horcajadas: T.tAsientos === 'horcajadas', manillar: T.tMando === 'manillar', cerrado: true,
    propulsion: T.tPropulsion === 'phev' ? 'phev' : 'electrico', parabrisasPlastico: true, retrovisores: T.tRetrovisores === 'camaras' ? 'camaras' : 'espejos',
    masaVacio: res.mVeh, masaBateria: r.bateria.kg, masaCombustible: ph ? ph.litros * KG_LITRO_GASOLINA : 0,
    masaMaxima: cargas ? cargas.masa : res.mVeh + r.ocupantes * mOcc + EQUIPAJE, masaOcupante: mOcc,
    potenciaContinua: L('tKWNom'), potenciaPico: el.picoTotal, potenciaTermica: ph ? el.termicoNeto : null, potenciaCategoria: el.contTotal, electronica: el, vmaxConjunta: e ? e.vmaxConjunta : null,
    vmax: e ? Math.max(e.vmaxPico, vGas) : null, vmaxNominal: e ? e.vmaxNominal : null, velocidadDiseno: L('tVel'),
    largo: m.xn - m.xt, ancho: m.anchoTotal, alto: m.alto,
    radioGiro: r.giro.radio, repartoDelantero: m.rombo ? null : r.vuelco.repartoDel * 100,
    ruedasCarga: cargas ? [
      { nombre: 'cada rueda delantera', carga: cargas.del, capacidad: RUEDAS_TRICICLO[T.tRuedaDel].carga },
      { nombre: m.cuatro ? 'cada rueda trasera' : 'la rueda trasera', carga: cargas.tras, capacidad: RUEDAS_TRICICLO[T.tRuedaTras].carga },
    ] : null,
    notas,
  };
}

function fichaBasculante(P: Parametros, m: ModeloBasculante, res: Resultados, cd: { cd: number; areaRef: number } | null, b: Omit<FichaHomologacion, 'vehiculo' | 'tipo'>): Omit<FichaHomologacion, 'vehiculo' | 'tipo'> {
  const Q = camposBasculante(P), r = res.basculante!;
  const e = cd ? energiaBasculante(m, res.mTot, cd, 0) : null;
  const mOcc = res.mTot && r.ocupantes ? (res.mTot - res.mVeh) / r.ocupantes : 75;
  const masaMaxima = res.mVeh + r.ocupantes * mOcc + EQUIPAJE_B, del = r.basculacion.repartoDel;
  return {
    ...b,
    ruedasFisicas: 4, parejas: [{ nombre: 'delanteras', via: m.via.del }, { nombre: 'traseras', via: m.via.tras }],
    inclina: true, plazas: r.ocupantes, horcajadas: false, manillar: false, cerrado: true, parabrisasPlastico: true, retrovisores: null,
    masaVacio: res.mVeh, masaBateria: r.bateria.kg, masaMaxima, masaOcupante: mOcc,
    potenciaContinua: Q.qKWNom, potenciaPico: Q.qKWPico, vmax: e ? e.vmaxPico : null, vmaxNominal: e ? e.vmaxNominal : null, velocidadDiseno: Q.qVel,
    largo: m.xn - m.xt, ancho: m.anchoTotal, alto: m.alto, radioGiro: r.basculacion.radio, repartoDelantero: del * 100,
    ruedasCarga: [
      { nombre: 'cada rueda delantera', carga: masaMaxima * del / 2, capacidad: RUEDAS_BASCULANTE[Q.qRuedaDel].carga },
      { nombre: 'cada rueda trasera', carga: masaMaxima * (1 - del) / 2, capacidad: RUEDAS_BASCULANTE[Q.qRuedaTras].carga },
    ],
    notas: [
      `Masa: la lista «Peso» (${Math.round(res.mVeh)} kg) menos la batería (${Math.round(r.bateria.kg)} kg).`,
      `Potencia continua: la nominal de los dos motores juntos (${Q.qKWNom.toLocaleString('es-ES')} kW).`,
      e ? 'Velocidad máxima: con la potencia máxima y el Cd del túnel.' : 'Velocidad máxima: hace falta el Cd del túnel, que se está calculando.',
    ],
  };
}

/** A measured value of the ficha, by name (null: unknown). */
export function valorDe(f: FichaHomologacion, k: Magnitud): number | null {
  return f[k] ?? null;
}
