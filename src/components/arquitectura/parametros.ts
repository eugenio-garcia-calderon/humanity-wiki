// ============================================================================
// ARQUITECTURA · PARAMETERS OF THE CIRCULAR HUMAN COMMUNITY (2026-11-05)
// ============================================================================
// Every measure of the world lives here, in METRES. The 3D view, the plans
// (DXF/SVG) and the dimension table are all computed from this one object, so
// a slider changes the three of them at once and they can never disagree.
//
// The design is Eugenio's ("Comunidad Circular Humana", see the zoom sheet of
// 2026-10-08): nest → family (petal) → community → village → city, the same
// rule repeated at every scale:
//   ▲ up = showcase to the outside, productive · ▼ down = reproductive, life
//   ◄ ► = neighbours of the same scale · ● centre = water + social centre.
//
// Defaults come from the programme table of the sheet (J): CS1 Ø24 m,
// nest hexagon side 4.5 m, 27 fruit trees per nest, etc.

export interface Parametros {
  // --- scales (how many children each unit holds)
  nidosPorFamilia: number;
  familiasPorComunidad: number;
  comunidadesPorPueblo: number;
  pueblosPorCiudad: number;
  personasPorNido: number;
  // --- nest
  ladoNido: number;          // hexagon side (m)
  alturaPlanta: number;      // floor height (m)
  plantasNido: number;       // 1..3 (vivienda, taller, opcional)
  radioFrutales: number;     // ring of fruit trees around the nest (m)
  arbolesPorNido: number;
  copaArbol: number;         // canopy radius of a fruit tree (m)
  // --- family petal
  anchoPetalo: number;       // 0.5..1.1 of the free angular space
  inicioPetalo: number;      // fraction of R where the petal starts
  finPetalo: number;         // fraction of R where it ends
  tamGota: number;           // scale of the water drop / family plaza
  redondezPetalo: number;    // 0 = water drop (pointed at the top) … 1 = round
  diamCentroFamiliar: number;
  radioBosqueFamiliar: number;
  // --- community
  radioComunidad: number;    // R (m)
  desplazamientoDivisoria: number; // fraction of R the dividing road sits above the centre
  radioPlazaComunidad: number;
  diamCentroComunidad: number;    // CS1
  escalaAnexosComunidad: number;  // multiplier for S1, E1…
  radioBosqueComunidad: number;   // fraction of R (the food forest in the centre)
  alturaCarretera: number;        // fraction of R where the village road crosses, above the centre
  radioRotonda: number;           // roundabout where the community meets the village road (m)
  // --- lanes (shared by every scale)
  anchoPeatonal: number;
  anchoBici: number;
  anchoCalzada: number;
  // --- village and city
  separacionComunidades: number;  // gap between neighbouring communities (m)
  margenPueblo: number;
  diamCentroPueblo: number;       // CS2
  escalaAnexosPueblo: number;
  separacionPueblos: number;
  margenCiudad: number;
  diamCentroCiudad: number;       // CS3
  escalaAnexosCiudad: number;
  // --- view
  detalle: 'comunidad' | 'pueblo' | 'ciudad';
  mostrarArboles: boolean;
  mostrarEtiquetas: boolean;
  mostrarCotas: boolean;
}

export const POR_DEFECTO: Parametros = {
  nidosPorFamilia: 6,
  familiasPorComunidad: 7,
  comunidadesPorPueblo: 10,
  pueblosPorCiudad: 10,
  personasPorNido: 1.7,
  ladoNido: 4.5,
  alturaPlanta: 3.0,
  plantasNido: 2,
  radioFrutales: 8,
  arbolesPorNido: 27,
  copaArbol: 1.4,
  anchoPetalo: 0.85,
  inicioPetalo: 0.28,
  finPetalo: 0.98,
  tamGota: 1,
  redondezPetalo: 0.35,
  diamCentroFamiliar: 12,
  radioBosqueFamiliar: 11,
  radioComunidad: 260,
  desplazamientoDivisoria: 0.2,
  radioPlazaComunidad: 30,
  diamCentroComunidad: 24,
  escalaAnexosComunidad: 1,
  radioBosqueComunidad: 0.2,
  alturaCarretera: 0.62,
  radioRotonda: 18,
  anchoPeatonal: 3,
  anchoBici: 2.5,
  anchoCalzada: 6.5,
  separacionComunidades: 40,
  margenPueblo: 60,
  diamCentroPueblo: 48,
  escalaAnexosPueblo: 1,
  separacionPueblos: 250,
  margenCiudad: 300,
  diamCentroCiudad: 96,
  escalaAnexosCiudad: 1,
  detalle: 'pueblo',
  mostrarArboles: true,
  mostrarEtiquetas: true,
  mostrarCotas: true,
};

export type ClaveNumerica = { [K in keyof Parametros]: Parametros[K] extends number ? K : never }[keyof Parametros];

export interface Deslizable {
  clave: ClaveNumerica;
  etiqueta: string;
  min: number;
  max: number;
  paso: number;
  unidad?: string;
}

export interface Grupo {
  id: string;
  titulo: string;
  items: Deslizable[];
}

export const GRUPOS: Grupo[] = [
  {
    id: 'escalas', titulo: 'Escalas fractales', items: [
      { clave: 'nidosPorFamilia', etiqueta: 'Nidos por familia', min: 2, max: 10, paso: 2 },
      { clave: 'familiasPorComunidad', etiqueta: 'Familias por comunidad', min: 4, max: 10, paso: 1 },
      { clave: 'comunidadesPorPueblo', etiqueta: 'Comunidades por pueblo', min: 4, max: 12, paso: 1 },
      { clave: 'pueblosPorCiudad', etiqueta: 'Pueblos por ciudad', min: 4, max: 12, paso: 1 },
      { clave: 'personasPorNido', etiqueta: 'Personas por nido (media)', min: 1, max: 2, paso: 0.1 },
    ],
  },
  {
    id: 'nido', titulo: 'Nido (hexágono)', items: [
      { clave: 'ladoNido', etiqueta: 'Lado del hexágono', min: 3, max: 8, paso: 0.1, unidad: 'm' },
      { clave: 'alturaPlanta', etiqueta: 'Altura de planta', min: 2.6, max: 4, paso: 0.1, unidad: 'm' },
      { clave: 'plantasNido', etiqueta: 'Plantas (vivienda · taller · opcional)', min: 1, max: 3, paso: 1 },
      { clave: 'radioFrutales', etiqueta: 'Radio del anillo de frutales', min: 5, max: 16, paso: 0.5, unidad: 'm' },
      { clave: 'arbolesPorNido', etiqueta: 'Frutales por nido', min: 0, max: 40, paso: 1 },
      { clave: 'copaArbol', etiqueta: 'Copa de cada frutal', min: 0.6, max: 3, paso: 0.1, unidad: 'm' },
    ],
  },
  {
    id: 'familia', titulo: 'Familia (pétalo y gota)', items: [
      { clave: 'anchoPetalo', etiqueta: 'Anchura del pétalo', min: 0.5, max: 1.1, paso: 0.01 },
      { clave: 'inicioPetalo', etiqueta: 'Inicio del pétalo (× R)', min: 0.15, max: 0.4, paso: 0.01 },
      { clave: 'finPetalo', etiqueta: 'Final del pétalo (× R)', min: 0.8, max: 1, paso: 0.01 },
      { clave: 'redondezPetalo', etiqueta: 'Forma del pétalo (gota ↔ redondo)', min: 0, max: 1, paso: 0.01 },
      { clave: 'tamGota', etiqueta: 'Tamaño de la gota', min: 0.6, max: 1.4, paso: 0.01 },
      { clave: 'diamCentroFamiliar', etiqueta: 'Ø centro social familiar', min: 6, max: 24, paso: 0.5, unidad: 'm' },
      { clave: 'radioBosqueFamiliar', etiqueta: 'Radio bosque comestible familiar', min: 5, max: 20, paso: 0.5, unidad: 'm' },
    ],
  },
  {
    id: 'comunidad', titulo: 'Comunidad', items: [
      { clave: 'radioComunidad', etiqueta: 'Radio de la comunidad (R)', min: 100, max: 400, paso: 5, unidad: 'm' },
      { clave: 'desplazamientoDivisoria', etiqueta: 'Divisoria sobre el centro (× R)', min: 0.05, max: 0.4, paso: 0.01 },
      { clave: 'radioPlazaComunidad', etiqueta: 'Radio de la plaza central', min: 25, max: 70, paso: 1, unidad: 'm' },
      { clave: 'diamCentroComunidad', etiqueta: 'Ø centro comunitario', min: 12, max: 40, paso: 1, unidad: 'm' },
      { clave: 'escalaAnexosComunidad', etiqueta: 'Tamaño de los anexos de la comunidad', min: 0.5, max: 1.6, paso: 0.05, unidad: '×' },
      { clave: 'radioBosqueComunidad', etiqueta: 'Bosque comestible central (× R)', min: 0.1, max: 0.3, paso: 0.01 },
      { clave: 'alturaCarretera', etiqueta: 'Carretera del pueblo: altura de paso (× R)', min: 0.45, max: 0.85, paso: 0.01 },
      { clave: 'radioRotonda', etiqueta: 'Radio de la rotonda', min: 10, max: 30, paso: 0.5, unidad: 'm' },
    ],
  },
  {
    id: 'vias', titulo: 'Vías (en todas las escalas)', items: [
      { clave: 'anchoPeatonal', etiqueta: 'Peatonal (adoquín)', min: 1.5, max: 6, paso: 0.1, unidad: 'm' },
      { clave: 'anchoBici', etiqueta: 'Carril bici', min: 1.5, max: 4, paso: 0.1, unidad: 'm' },
      { clave: 'anchoCalzada', etiqueta: 'Calzada vehículos', min: 4, max: 10, paso: 0.1, unidad: 'm' },
    ],
  },
  {
    id: 'pueblo', titulo: 'Pueblo', items: [
      { clave: 'separacionComunidades', etiqueta: 'Separación entre comunidades', min: 0, max: 200, paso: 5, unidad: 'm' },
      { clave: 'margenPueblo', etiqueta: 'Margen exterior', min: 20, max: 300, paso: 5, unidad: 'm' },
      { clave: 'diamCentroPueblo', etiqueta: 'Ø centro del pueblo', min: 24, max: 90, paso: 1, unidad: 'm' },
      { clave: 'escalaAnexosPueblo', etiqueta: 'Tamaño de los anexos del pueblo', min: 0.5, max: 1.6, paso: 0.05, unidad: '×' },
    ],
  },
  {
    id: 'ciudad', titulo: 'Ciudad', items: [
      { clave: 'separacionPueblos', etiqueta: 'Separación entre pueblos', min: 0, max: 1000, paso: 10, unidad: 'm' },
      { clave: 'margenCiudad', etiqueta: 'Margen exterior', min: 50, max: 1500, paso: 10, unidad: 'm' },
      { clave: 'diamCentroCiudad', etiqueta: 'Ø centro de la ciudad', min: 48, max: 180, paso: 2, unidad: 'm' },
      { clave: 'escalaAnexosCiudad', etiqueta: 'Tamaño de los anexos de la ciudad', min: 0.5, max: 1.6, paso: 0.05, unidad: '×' },
    ],
  },
];

/** Which slider groups edit an element of a given kind (for the selection card). */
export const GRUPO_DE_TIPO: Record<string, string[]> = {
  nido: ['nido'],
  centroFamiliar: ['familia'],
  centroSocial1: ['comunidad'], anexo1: ['comunidad'],
  centroSocial2: ['pueblo'], anexo2: ['pueblo'],
  centroSocial3: ['ciudad'], anexo3: ['ciudad'],
  sistemaFamiliar: ['familia'],
};

const CLAVE_LOCAL = 'arquitectura-parametros-v1';

export function cargarParametros(): Parametros {
  // 1) the URL hash (shareable link), 2) this browser, 3) defaults.
  try {
    const h = window.location.hash.replace(/^#/, '');
    if (h.startsWith('p=')) return { ...POR_DEFECTO, ...JSON.parse(decodeURIComponent(h.slice(2))) };
  } catch { /* malformed link: fall through */ }
  try {
    const s = window.localStorage.getItem(CLAVE_LOCAL);
    if (s) return { ...POR_DEFECTO, ...JSON.parse(s) };
  } catch { /* storage blocked */ }
  return { ...POR_DEFECTO };
}

export function guardarParametros(p: Parametros) {
  try { window.localStorage.setItem(CLAVE_LOCAL, JSON.stringify(p)); } catch { /* ignore */ }
}

export function enlaceCompartible(p: Parametros): string {
  const cambios: Partial<Parametros> = {};
  (Object.keys(p) as (keyof Parametros)[]).forEach(k => {
    if (p[k] !== POR_DEFECTO[k]) (cambios as any)[k] = p[k];
  });
  return `${window.location.origin}/arquitectura#p=${encodeURIComponent(JSON.stringify(cambios))}`;
}
