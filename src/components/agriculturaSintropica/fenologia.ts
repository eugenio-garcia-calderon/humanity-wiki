// ============================================================================
// AGRICULTURA SINTRÓPICA · THE YEAR OF EACH SPECIES (2026-11-25)
// ============================================================================
// Eugenio: «permite una animación de las 4 estaciones, con flores, hojas caducas,
// luces del sol, vientos». What each plant looks like in each month, for an
// Iberian setting: when the deciduous ones leaf out and drop their leaves, the
// colour they turn in autumn, and when and in what colour they flower.
// Months are 0–12 (0 = 1 January, 1.5 = mid-February). Orientative, like the rest
// of the species database; colours are 3D material data.

export interface Fenologia {
  caduca?: [number, number];        // leaf-out month, leaf-fall month (absent = evergreen)
  otono?: string;                   // autumn colour of the leaves
  flor?: [number, number, string];  // flowering from, to, colour
}

const AMARILLO = '#d9a93a', NARANJA = '#d9822f', ROJO = '#b8412b', DORADO = '#e3bb45', OCRE = '#b8893c';
const BLANCO = '#f7f3ea', ROSA_BLANCO = '#f6dfe6', ROSA = '#ec9fc0', AMARILLO_FLOR = '#f2d23a', MORADO = '#9a7fd1', LILA = '#b9a8e3';

export const FENOLOGIA: Record<string, Fenologia> = {
  almendro: { caduca: [2.6, 10.8], otono: NARANJA, flor: [1.2, 2.8, ROSA_BLANCO] },
  olivo: { flor: [4.6, 5.6, '#e9e4c2'] },
  vid: { caduca: [3.6, 10.6], otono: ROJO },
  pistacho: { caduca: [3.6, 10.6], otono: ROJO },
  chopo: { caduca: [2.8, 10.8], otono: DORADO },
  fresno: { caduca: [3.2, 10.6], otono: AMARILLO },
  almez: { caduca: [3.3, 10.8], otono: AMARILLO },
  morera: { caduca: [3.4, 10.6], otono: DORADO },
  moral: { caduca: [3.6, 10.6], otono: AMARILLO },
  nogal: { caduca: [3.8, 10.4], otono: OCRE },
  castano: { caduca: [3.8, 10.8], otono: OCRE, flor: [5.5, 6.5, '#efe3a0'] },
  aliso: { caduca: [3, 11] },
  robinia: { caduca: [3.8, 10.6], otono: AMARILLO, flor: [4.3, 5.3, BLANCO] },
  acacia3: { caduca: [3.8, 10.4], otono: DORADO },
  cinamomo: { caduca: [3.6, 10.8], otono: AMARILLO, flor: [4.2, 5.2, LILA] },
  tilo: { caduca: [3.4, 10.4], otono: AMARILLO, flor: [5.5, 6.3, '#efe6a6'] },
  sauce: { caduca: [2.8, 11], otono: AMARILLO },
  cerezo: { caduca: [3, 10.6], otono: ROJO, flor: [2.8, 3.8, BLANCO] },
  serbal: { caduca: [3.3, 10.6], otono: NARANJA, flor: [4, 5, BLANCO] },
  higuera: { caduca: [3.2, 10.8], otono: AMARILLO },
  granado: { caduca: [3.4, 10.8], otono: AMARILLO, flor: [4.6, 6.5, '#e0582f'] },
  membrillo: { caduca: [3, 10.8], otono: AMARILLO, flor: [3.6, 4.6, ROSA_BLANCO] },
  azufaifo: { caduca: [3.8, 10.8], otono: AMARILLO },
  albaricoquero: { caduca: [2.8, 10.6], otono: NARANJA, flor: [2, 3.2, ROSA_BLANCO] },
  ciruelo: { caduca: [2.8, 10.6], otono: NARANJA, flor: [2.3, 3.3, BLANCO] },
  manzano: { caduca: [3.2, 10.8], otono: AMARILLO, flor: [3.6, 4.8, ROSA_BLANCO] },
  peral: { caduca: [3, 10.8], otono: ROJO, flor: [3, 4.2, BLANCO] },
  caqui: { caduca: [3.4, 11], otono: NARANJA },
  acerolo: { caduca: [3, 10.8], otono: NARANJA, flor: [3.6, 4.8, BLANCO] },
  arbolamor: { caduca: [3.6, 10.8], otono: AMARILLO, flor: [2.8, 4.2, '#c74a9b'] },
  taraje: { caduca: [3, 11], flor: [3.5, 5, ROSA] },
  eleagnus: { caduca: [3.4, 11], otono: '#b9b79a', flor: [4.5, 5.5, AMARILLO_FLOR] },
  olivootono: { caduca: [3.2, 11], flor: [4, 5, '#f2eac0'] },
  caragana: { caduca: [3.3, 10.6], otono: AMARILLO, flor: [4, 5, AMARILLO_FLOR] },
  sauco: { caduca: [2.8, 10.8], otono: AMARILLO, flor: [4.3, 5.6, '#f1ecd2'] },
  avellano: { caduca: [3, 10.8], otono: AMARILLO },
  frambueso: { caduca: [3, 10.8], otono: ROJO },
  grosellero: { caduca: [2.8, 10.4], otono: AMARILLO },
  espantalobos: { caduca: [3, 10.8], otono: AMARILLO, flor: [3.8, 6, AMARILLO_FLOR] },
  esparrago: { caduca: [2.8, 10.6], otono: DORADO },
  // evergreen that flower visibly
  retamaolor: { flor: [3.8, 6.5, AMARILLO_FLOR] },
  retama: { flor: [2.5, 4.3, '#f4efd2'] },
  tagasaste: { flor: [1, 3.5, BLANCO] },
  alfalfaarborea: { flor: [1.5, 5, AMARILLO_FLOR] },
  madrono: { flor: [9.5, 12, BLANCO] },
  adelfa: { flor: [4.5, 9.5, ROSA] },
  romero: { flor: [0.5, 4.5, '#a9c0e8'] },
  espliego: { flor: [6, 8.5, MORADO] },
  tomillo: { flor: [2.8, 5, '#e6c6dc'] },
  salvia: { flor: [4.5, 6.5, LILA] },
  santolina: { flor: [5, 7, AMARILLO_FLOR] },
  mirto: { flor: [5.5, 7.5, BLANCO] },
  laurel: { flor: [2, 3.5, '#e4dc8c'] },
  nispero: { flor: [9.5, 12, BLANCO] },
  alcachofa: { flor: [5, 6.8, MORADO] },
  cardo: { flor: [5.5, 7.5, MORADO] },
  esparceta: { flor: [4.2, 6, ROSA] },
  alfalfa: { flor: [4.5, 8.5, LILA] },
  azafran: { flor: [9.5, 10.6, MORADO] },
  habas: { flor: [1.5, 3.5, BLANCO] },
  capuchina: { flor: [3.5, 9.5, NARANJA] },
  zarzamora: { flor: [4.5, 6.5, ROSA_BLANCO] },
  fresa: { flor: [3, 5, BLANCO] },
  hierbaluisa: { caduca: [3.6, 11], flor: [6, 8.5, BLANCO] },
};

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const nombreMes = (m: number) => MESES[Math.floor(((m % 12) + 12) % 12)];
export function estacionDe(m: number): 'primavera' | 'verano' | 'otono' | 'invierno' {
  const x = ((m % 12) + 12) % 12;
  return x >= 2.65 && x < 5.65 ? 'primavera' : x >= 5.65 && x < 8.7 ? 'verano' : x >= 8.7 && x < 11.7 ? 'otono' : 'invierno';
}

const rampa = (x: number, a: number, b: number) => Math.max(0, Math.min(1, (x - a) / (b - a)));

/** Leaves (0 bare … 1 full), how far into autumn colour (0 … 1) and flowering (0 … 1) in month m. */
export function aspecto(id: string, m: number): { hoja: number; otono: number; flor: number } {
  const f = FENOLOGIA[id], x = ((m % 12) + 12) % 12;
  let hoja = 1, otono = 0, flor = 0;
  if (f?.caduca) {
    const [b, c] = f.caduca;
    hoja = Math.min(rampa(x, b - 0.2, b + 0.8), 1 - rampa(x, c - 0.3, c + 0.4));
    otono = rampa(x, c - 1.6, c - 0.3);
  }
  if (f?.flor) {
    const [a, z] = f.flor;
    const dentro = a <= z ? x >= a && x <= z : x >= a || x <= z;
    if (dentro) { const d = a <= z ? z - a : 12 - a + z, p = ((x - a + 12) % 12) / d; flor = Math.min(1, Math.sin(Math.PI * p) * 1.6); }
  }
  return { hoja, otono, flor };
}
