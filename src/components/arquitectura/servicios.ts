// ============================================================================
// ARQUITECTURA · WHAT EACH BUILDING DOES AT EACH SCALE (2026-11-05)
// ============================================================================
// Eugenio: «si pinchas en uno de ellos te aparezca en modo pop-up la escala en
// la que está actuando ese edificio… y los servicios que ofrece… y que se vea
// que hay otras escalas».
//
// One row per function, five columns (nest → city). The community, village and
// city texts are sheet J (the same as ANEXOS in geometria.ts); nest and family
// are what that function looks like before there is a building for it.

import type { Edificio } from './geometria';
import { ANEXOS } from './geometria';
import type { Parametros } from './parametros';

export const ESCALAS_TODAS = ['Nido', 'Familia', 'Comunidad', 'Pueblo', 'Ciudad'] as const;
export type Escala = typeof ESCALAS_TODAS[number];

const n0 = (v: number) => Math.round(v).toLocaleString('es-ES');

/** People living at each scale, from the current sliders (not from the sheet). */
export function personasEscala(p: Parametros): Record<Escala, string> {
  const nidos = Math.max(1, Math.round(p.nidosPorFamilia / 2)) * 2;
  const fam = nidos * p.personasPorNido, com = fam * Math.round(p.familiasPorComunidad);
  const pue = com * Math.round(p.comunidadesPorPueblo), ciu = pue * Math.round(p.pueblosPorCiudad);
  return { Nido: `${p.personasPorNido.toLocaleString('es-ES', { maximumFractionDigits: 1 })} personas de media`, Familia: `≈${n0(fam)} personas`, Comunidad: `≈${n0(com)} personas`, Pueblo: `≈${n0(pue)} personas`, Ciudad: `≈${n0(ciu)} personas` };
}

interface Funcion { nombre: string; sistema?: string; porEscala: Record<Escala, string> }

const desdeAnexos = (k: string, nido: string, familia: string): Funcion => ({
  nombre: ANEXOS[k].nombre,
  sistema: k,
  porEscala: { Nido: nido, Familia: familia, Comunidad: ANEXOS[k].n[0][3], Pueblo: ANEXOS[k].n[1][3], Ciudad: ANEXOS[k].n[2][3] },
});

export const FUNCIONES: Record<string, Funcion> = {
  SA: desdeAnexos('SA', 'Botiquín · autocuidado · primeros auxilios · teleconsulta', 'Cuidados entre la familia · botiquín completo en el centro familiar · persona de referencia en salud'),
  ED: desdeAnexos('ED', 'Aprender en casa · rincón de lectura · crianza', 'Aprendizaje entre generaciones · tutoría de mayores a pequeños'),
  EN: desdeAnexos('EN', 'Placas en la cubierta · ahorro y consumo propio', 'Batería compartida · reparto de excedentes entre nidos'),
  MV: desdeAnexos('MV', 'Bicicletas y velomóvil propio', 'Aparcabicis en los extremos del pétalo · carril bici por el eje'),
  AL: desdeAnexos('AL', 'Anillo de frutales · huerto propio · cocina', 'Bosque comestible con agua en la gota · cocina grande compartida'),
  IT: desdeAnexos('IT', 'Conexión a la red local de la comunidad', 'Punto de red y equipos compartidos'),
  TA: desdeAnexos('TA', 'Taller o estudio en la segunda planta', 'Herramientas compartidas · pequeñas reparaciones'),
  SG: desdeAnexos('SG', 'Detector, extintor y botiquín', 'Plan de emergencia familiar · persona de referencia en protección civil'),
  SO: {
    nombre: 'Centro social',
    porEscala: {
      Nido: 'Salón y cocina propios',
      Familia: 'Cocina grande · comedor 16 · 4 camas de invitados · celebraciones',
      Comunidad: 'Asamblea 80 · comedor · cocina común · biblioteca',
      Pueblo: 'Auditorio 400 · mercado · biblioteca · gobierno',
      Ciudad: 'Auditorio 2.000 · museo · archivo · congresos',
    },
  },
  VI: {
    nombre: 'Vivienda',
    porEscala: {
      Nido: 'Planta 1: salón · cocina · baño · dormitorio. Planta 2: taller o estudio. Planta 3 opcional',
      Familia: 'Nidos en pareja por generaciones, alrededor de la gota de agua',
      Comunidad: 'Las familias, como pétalos, en la mitad de abajo',
      Pueblo: 'Las comunidades, en la mitad de abajo del pueblo',
      Ciudad: 'Los pueblos, en la mitad de abajo de la ciudad',
    },
  },
  ES: {
    nombre: 'Escaparate · mercado',
    porEscala: {
      Nido: 'Lo que sobra del huerto y del taller',
      Familia: 'Intercambio dentro de la familia',
      Comunidad: 'Puestos al borde exterior: lo que produce la comunidad, abierto a quien pasa',
      Pueblo: 'Mercado del pueblo hacia el exterior',
      Ciudad: 'Escaparate de la ciudad · comercio con otras ciudades',
    },
  },
  PR: {
    nombre: 'Producción',
    porEscala: {
      Nido: 'Taller o estudio propio',
      Familia: 'Nodos de sistema de la familia',
      Comunidad: 'Naves de fabricación y almacén, al otro lado de la carretera, junto al campo solar',
      Pueblo: 'Zona productiva del pueblo · campo solar grande',
      Ciudad: 'Parque de fabricación avanzada',
    },
  },
};

/** Which row of FUNCIONES describes this building. */
export function funcionDe(e: Edificio): string {
  if (e.sistema) return e.sistema;
  if (e.tipo === 'nido') return 'VI';
  if (e.tipo === 'escaparate') return 'ES';
  if (e.tipo === 'fabrica') return 'PR';
  return 'SO';
}

/** The short name shown on a building (its function, not a code). */
export function nombreFuncion(e: Edificio): string {
  return FUNCIONES[funcionDe(e)]?.nombre ?? e.nombre;
}

/** The row for a function, with the counts that depend on the sliders filled in. */
export function filaDe(clave: string, p: Parametros): Record<Escala, string> {
  const f = FUNCIONES[clave];
  if (clave === 'VI') {
    const nidos = Math.max(1, Math.round(p.nidosPorFamilia / 2)) * 2;
    const nF = Math.round(p.familiasPorComunidad), nC = Math.round(p.comunidadesPorPueblo), nP = Math.round(p.pueblosPorCiudad);
    return {
      ...f.porEscala,
      Nido: `Hexágono de ${p.ladoNido.toLocaleString('es-ES')} m de lado · ${['vivienda', 'taller o estudio', 'planta opcional'].slice(0, Math.max(1, Math.min(3, Math.round(p.plantasNido)))).join(' + ')} · ${Math.round(p.arbolesPorNido)} frutales`,
      Familia: `${nidos} nidos en pareja por generaciones, alrededor de la gota de agua`,
      Comunidad: `${nF} familias · ${n0(nF * nidos)} nidos`,
      Pueblo: `${nC} comunidades · ${n0(nC * nF * nidos)} nidos`,
      Ciudad: `${nP} pueblos · ${n0(nP * nC * nF * nidos)} nidos`,
    };
  }
  if (clave === 'AL') return { ...f.porEscala, Nido: `${Math.round(p.arbolesPorNido)} frutales · huerto propio · cocina` };
  return f.porEscala;
}
