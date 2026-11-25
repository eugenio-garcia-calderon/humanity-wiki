// Colours of the 3D plot and of the exported plans.
//
// These are DATA for WebGL materials and CAD/SVG layers, not page styling, so they
// live next to the scene (same precedent as components/arquitectura/paleta.ts).
// Species crown colours live with each species in especies.ts. The page itself
// only uses Tailwind classes.

export const COLOR = {
  cielo: '#dfe9ef',
  cieloLuz: '#f4f8ff',
  sueloLuz: '#8a7a5a',
  campo: '#d9cfae',
  acolchado: '#9c8a5c',
  desnudo: '#d8c29a',
  pasillo: '#e6d6b8',
  pavimento: '#c9c2b0',
  agua: '#6f9fe0',
  piedra: '#a08660',
  sonrisa: '#7c9a58',
  alcorque: '#7a5a38',
  tronco: '#6b4f35',
  persona: '#e07a3a',
  apagado: '#c8ccc4',
  macho: '#c9a44a',
  modulo: '#bfeccd',
  moduloBorde: '#8fc9a2',
};

/** Colour of each number of the module (the circles of Eugenio's top-view sketch). */
export const COLOR_ROL: Record<number, string> = {
  1: '#f6d860',
  2: '#6f97e3',
  3: '#ddd6f4',
  4: '#a9792a',
  5: '#7cc24a',
};
