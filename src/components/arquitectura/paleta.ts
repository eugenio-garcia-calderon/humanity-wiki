// Colours of the 3D world and of the exported plans.
//
// These are DATA for WebGL materials and CAD layers, not page styling, so they
// live next to the scene (same precedent as `src/components/juego/` PALETA).
// The page itself only uses Tailwind classes.

export const SUELO: Record<string, string> = {
  campo: '#cfd8b8',
  cesped: '#5f9b4c',
  suelo: '#8fbf63',
  agricultura: '#3f7f3a',
  parque: '#6aa84f',
  produccion: '#9a9a8c',
  huerto: '#2f7d32',
  camino: '#b8a888',
  gota: '#f3f0e8',
  bosque: '#1f5a28',
  bancalA: '#7cb342',
  bancalB: '#9c4dcc',
  bancalC: '#ff8f00',
  bancalD: '#c0ca33',
  senda: '#8c7a66',
  plaza: '#d9d4c7',
  agua: '#2f7fd8',
  calzada: '#2a2a2a',
  bici: '#b3452f',
  peatonal: '#cdbf9e',
  marca: '#f5f5f5',
  via: '#4a4440',
  vertipuerto: '#3a3a3a',
};

/** The eight common systems (anexos) and their colours. */
export const SISTEMA: Record<string, { color: string; nombre: string }> = {
  SA: { color: '#f48fb1', nombre: 'Salud' },
  ED: { color: '#8e44c9', nombre: 'Educación' },
  EN: { color: '#ffe600', nombre: 'Energía' },
  MV: { color: '#5c86b0', nombre: 'Movilidad' },
  AL: { color: '#6aa832', nombre: 'Alimentación' },
  IT: { color: '#1fb5c9', nombre: 'Informática' },
  TA: { color: '#8d6e63', nombre: 'Taller' },
  SG: { color: '#e53935', nombre: 'Seguridad' },
};

export const EDIFICIO: Record<string, string> = {
  teja: '#c4622d',
  tejaOscura: '#8a3d18',
  muroNido: '#efe2cf',
  muroSocial: '#e9dcc6',
  tragaluz: '#bfe9ff',
  escaparate: '#e08a2e',
  fabrica: '#9aa0a6',
  panel: '#24477a',
  coche: '#f2f2f2',
  bici: '#202020',
  aeronave: '#fafafa',
  tren: '#d0d4d8',
  bus: '#5c86b0',
};

/** Canopy colours: several species on purpose — a food forest is never a monoculture. */
export const COPAS = ['#2e7d32', '#43a047', '#66bb6a', '#558b2f', '#388e3c', '#1b5e20', '#7cb342', '#c0392b', '#e67e22', '#8e44ad'];

export const CIELO = '#dfeaf2';

/** AutoCAD Colour Index (ACI) per DXF layer. */
export const CAPA_DXF: Record<string, number> = {
  CONTORNO: 7, CESPED: 3, SUELO_FAMILIAR: 82, AGRICULTURA: 94, PARQUE: 83, PRODUCCION: 8,
  HUERTO_NIDO: 96, CAMINO_GENERACIONAL: 33, GOTA: 254, BOSQUE_COMESTIBLE: 96, BANCALES: 62,
  SENDAS: 32, PLAZA: 252, AGUA: 5, VIA_VEHICULOS: 250, CARRIL_BICI: 1, PEATONAL: 41,
  EJES: 7, FERROCARRIL: 9, VERTIPUERTO: 8, ENLACES: 6, ARBOLES: 3,
  NIDOS: 30, CENTRO_SOCIAL: 30, SALUD: 221, EDUCACION: 200, ENERGIA: 2, MOVILIDAD: 150,
  ALIMENTACION: 92, INFORMATICA: 4, TALLER: 34, SEGURIDAD: 1, ESCAPARATE: 40, FABRICA: 8,
  PANELES_SOLARES: 5, VEHICULOS: 7, TEXTOS: 7, COTAS: 2,
};
