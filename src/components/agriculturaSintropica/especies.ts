// ============================================================================
// AGRICULTURA SINTRÓPICA · REFERENCE DATABASE OF SPECIES (2026-11-25)
// ============================================================================
// Eugenio: «esto tiene que ser como la base de datos de referencia de cualquier
// diseñador de bosques sintrópicos». Every plant the designer, the simulator,
// the advisor and the species cards use is described here, once.
//
// The values are ORIENTATIVE references for a Spanish (Iberian) setting, meant
// to be reviewed by the project team (agronomists, foresters and syntropic
// farmers). They are not measurements of this project. The page says so.
//
// Classification axes (the three the project uses):
//  · estrato: vertical layer at maturity (Götsch): emergente > alto > medio > bajo > suelo.
//  · gen: «generación» = time to first harvest/function, the table Eugenio shared:
//      1 Principal (>10 años) · 2 Secundario (5–10) · 3 Tercero (3–5) · 4 Cuaternario (1–3) · 5 Quinario (<1).
//  · sucesion: placenta (pioneers, < 2 años) · secundaria · clímax.
// Colours are 3D material data (see paleta.ts for why they live in this folder).

export type Estrato = 'emergente' | 'alto' | 'medio' | 'bajo' | 'suelo';
export type Sucesion = 'placenta' | 'secundaria' | 'climax';
export type Forma = 'redonda' | 'columnar' | 'extendida' | 'arbusto' | 'cepa' | 'mata' | 'palmera' | 'hierba';
export type Ciclo = 'anual' | 'perenne' | 'lenosa';
export type Funcion = 'fruto' | 'fijaN' | 'biomasa' | 'polinizadores' | 'aromatica' | 'cobertura' | 'forraje' | 'madera' | 'cortavientos' | 'hortaliza' | 'tutor';
export type Zona = 'GA' | 'MN' | 'EB' | 'EX' | 'MS' | 'LV' | 'AO' | 'AE' | 'SE';

export interface Especie {
  id: string;
  nombre: string;
  cientifico: string;
  clave?: boolean;          // one of the project's four key species
  estrato: Estrato;
  gen: 1 | 2 | 3 | 4 | 5;
  sucesion: Sucesion;
  ciclo: Ciclo;
  funciones: Funcion[];
  altura: number;           // adult height (m)
  copa: number;             // adult crown diameter (m)
  madurez: number;          // years to reach adult size
  fruto: number;            // years to first harvest (0 = no food harvest)
  vida: number;             // lifespan (years)
  sale?: number;            // years it usually stays in a syntropic design (pioneers, annuals)
  agua: 1 | 2 | 3 | 4;      // drops: 1 very dry … 4 riverbank / irrigated
  mm: number;               // minimum annual water (rain + irrigation, mm) for decent growth
  helada: number;           // minimum winter temperature tolerated (°C)
  zonas: Zona[];
  alimento: string;         // what it produces
  valor: 1 | 2 | 3;         // economic value of the harvest (1 low … 3 high)
  valorTxt: string;         // what the value is
  kgPlanta?: number;        // adult harvest per plant, rainfed, orientative (kg)
  kgRegadio?: number;       // same with irrigation (key species)
  autoctona: boolean;
  aviso?: string;           // toxicity, invasiveness, allelopathy…
  notas: string;            // designer's tip
  forma: Forma;
  color: string;            // crown colour (3D / plans)
}

export const ZONAS: { id: Zona; nombre: string; corto: string; fila: number; col: number; lluvia: number; tMin: number }[] = [
  { id: 'GA', nombre: 'Galicia y Cornisa Cantábrica', corto: 'Norte atlántico', fila: 0, col: 0, lluvia: 1100, tMin: -4 },
  { id: 'MN', nombre: 'Meseta norte (Castilla y León)', corto: 'Meseta norte', fila: 0, col: 1, lluvia: 450, tMin: -15 },
  { id: 'EB', nombre: 'Valle del Ebro y Cataluña interior', corto: 'Ebro', fila: 0, col: 2, lluvia: 400, tMin: -12 },
  { id: 'EX', nombre: 'Extremadura', corto: 'Extremadura', fila: 1, col: 0, lluvia: 550, tMin: -6 },
  { id: 'MS', nombre: 'Meseta sur (Castilla-La Mancha, Madrid)', corto: 'Meseta sur', fila: 1, col: 1, lluvia: 400, tMin: -12 },
  { id: 'LV', nombre: 'Litoral mediterráneo (Cataluña, Valencia, Baleares)', corto: 'Litoral med.', fila: 1, col: 2, lluvia: 450, tMin: -3 },
  { id: 'AO', nombre: 'Andalucía occidental (Guadalquivir)', corto: 'Guadalquivir', fila: 2, col: 0, lluvia: 550, tMin: -4 },
  { id: 'AE', nombre: 'Andalucía oriental y sierras béticas', corto: 'Béticas', fila: 2, col: 1, lluvia: 450, tMin: -9 },
  { id: 'SE', nombre: 'Sureste árido (Murcia, Almería)', corto: 'Sureste árido', fila: 2, col: 2, lluvia: 280, tMin: -2 },
];
export const zona = (id: Zona) => ZONAS.find(z => z.id === id)!;

export const ESTRATOS: { id: Estrato; nombre: string; desc: string }[] = [
  { id: 'emergente', nombre: 'Emergente', desc: 'Por encima de todo (15–30 m). Recibe el sol pleno; pocos individuos.' },
  { id: 'alto', nombre: 'Alto', desc: 'Árboles grandes (8–20 m). Sombra parcial y mucha biomasa.' },
  { id: 'medio', nombre: 'Medio', desc: 'Frutales y árboles pequeños (4–8 m). Aquí suelen estar las especies clave.' },
  { id: 'bajo', nombre: 'Bajo', desc: 'Arbustos y subarbustos (1–4 m): fijadoras, frutos rojos, aromáticas.' },
  { id: 'suelo', nombre: 'Suelo', desc: 'Herbáceas, hortalizas y cubiertas (< 1 m). Protegen el suelo.' },
];
export const GENERACIONES: Record<number, { nombre: string; plazo: string }> = {
  1: { nombre: 'Principal', plazo: '> 10 años' },
  2: { nombre: 'Secundario', plazo: '5–10 años' },
  3: { nombre: 'Tercero', plazo: '3–5 años' },
  4: { nombre: 'Cuaternario', plazo: '1–3 años' },
  5: { nombre: 'Quinario', plazo: '3 meses – 1 año' },
};
export const SUCESIONES: Record<Sucesion, string> = {
  placenta: 'Placenta (pionera)',
  secundaria: 'Secundaria',
  climax: 'Clímax',
};
export const FUNCIONES: Record<Funcion, string> = {
  fruto: 'Fruto / alimento', fijaN: 'Fija nitrógeno', biomasa: 'Biomasa (poda y acolchado)', polinizadores: 'Atrae polinizadores',
  aromatica: 'Aromática', cobertura: 'Cubre el suelo', forraje: 'Forraje', madera: 'Madera', cortavientos: 'Cortavientos',
  hortaliza: 'Hortaliza', tutor: 'Tutor de trepadoras',
};

const T = (z: string) => z.split(' ').filter(Boolean) as Zona[];
const TODAS: Zona[] = ['GA', 'MN', 'EB', 'EX', 'MS', 'LV', 'AO', 'AE', 'SE'];

// Compact constructor. Order: id, nombre, científico, estrato, gen, sucesión, ciclo, funciones,
// altura, copa, madurez, fruto, vida, agua, mm, helada, zonas, alimento, valor, valorTxt, autóctona, forma, color, notas, extra.
function e(
  id: string, nombre: string, cientifico: string, estrato: Estrato, gen: Especie['gen'], sucesion: Sucesion, ciclo: Ciclo,
  funciones: string, altura: number, copa: number, madurez: number, fruto: number, vida: number,
  agua: Especie['agua'], mm: number, helada: number, zonas: Zona[] | string, alimento: string, valor: Especie['valor'], valorTxt: string,
  autoctona: boolean, forma: Forma, color: string, notas: string, extra: Partial<Especie> = {},
): Especie {
  return {
    id, nombre, cientifico, estrato, gen, sucesion, ciclo, funciones: funciones.split(' ') as Funcion[], altura, copa, madurez, fruto, vida,
    agua, mm, helada, zonas: typeof zonas === 'string' ? (zonas === '*' ? TODAS : T(zonas)) : zonas, alimento, valor, valorTxt, autoctona, forma, color, notas, ...extra,
  };
}

export const ESPECIES: Especie[] = [
  // ---------------------------------------------------------------- the four key species
  e('almendro', 'Almendro', 'Prunus dulcis', 'medio', 3, 'secundaria', 'lenosa', 'fruto polinizadores', 6, 6, 7, 3, 50,
    2, 300, -15, 'MN EB EX MS LV AO AE SE', 'Almendra (grano)', 3, 'Fruto seco de alto valor; España es el mayor almendral del mundo en superficie', true, 'redonda', '#9bbf6a',
    'Sol pleno. Florece muy pronto (enero–marzo): donde hay heladas tardías elige variedades de floración tardía o extra-tardía. El agua en primavera y verano decide la cosecha.',
    { clave: true, kgPlanta: 2.5, kgRegadio: 6, aviso: 'Floración temprana: riesgo de helada en la flor.' }),
  e('olivo', 'Olivo', 'Olea europaea', 'medio', 3, 'climax', 'lenosa', 'fruto', 7, 7, 12, 4, 500,
    2, 250, -10, 'EB EX MS LV AO AE SE', 'Aceituna y aceite', 3, 'Aceite de oliva; España es el primer productor mundial', true, 'redonda', '#7f9a6d',
    'Muy resistente a la sequía, pero agradece agua en floración (mayo) y en el engorde del fruto (otoño). Longevo: es la estructura permanente del sistema.',
    { clave: true, kgPlanta: 20, kgRegadio: 35 }),
  e('vid', 'Vid (viña)', 'Vitis vinifera', 'bajo', 4, 'secundaria', 'lenosa', 'fruto', 1.8, 1.6, 4, 3, 80,
    2, 300, -18, '*', 'Uva (vino, mesa, pasas)', 3, 'Vino y uva de mesa', true, 'cepa', '#6f9a3c',
    'En vaso aguanta el secano. Es trepadora: en sintrópico puede subir a un árbol tutor (la «vid casada» con morera, olmo o almez de la tradición mediterránea).',
    { clave: true, kgPlanta: 2, kgRegadio: 4 }),
  e('pistacho', 'Pistacho', 'Pistacia vera', 'medio', 3, 'secundaria', 'lenosa', 'fruto', 6, 6, 12, 6, 150,
    2, 300, -20, 'EB EX MS AO AE SE', 'Pistacho', 3, 'Fruto seco de muy alto valor; cultivo emergente en Castilla-La Mancha', false, 'redonda', '#a7b86a',
    'Necesita veranos largos y calurosos e inviernos fríos (horas de frío). Se injerta sobre terebinto o UCB-1. No tolera el encharcamiento.',
    { clave: true, kgPlanta: 3, kgRegadio: 8, aviso: 'Es dioico: hace falta un pie macho por cada 8–10 hembras para que haya cosecha.' }),

  // ---------------------------------------------------------------- emergent and tall: biomass, shade, structure
  e('chopo', 'Álamo negro (chopo)', 'Populus nigra', 'emergente', 1, 'secundaria', 'lenosa', 'biomasa cortavientos madera', 25, 8, 12, 0, 100,
    4, 650, -30, '*', '—', 1, 'Madera y mucha biomasa para acolchar', true, 'columnar', '#4f8a3c',
    'Crece muy deprisa y da biomasa para el chop & drop. Al norte de la línea para no sombrear.',
    { sale: 15, aviso: 'Raíces extensas y sedientas: solo con agua freática o junto a zanjas, y lejos de la clave.' }),
  e('fresno', 'Fresno', 'Fraxinus angustifolia', 'alto', 1, 'secundaria', 'lenosa', 'biomasa forraje madera', 15, 8, 15, 0, 150,
    3, 500, -20, 'GA MN EB EX MS LV AO AE', 'Hoja para el ganado', 1, 'Forraje y leña; admite trasmocho', true, 'redonda', '#4d8a46',
    'Clásico de los setos: se trasmocha y rebrota. Ideal para producir biomasa sin quitar sitio.'),
  e('almez', 'Almez', 'Celtis australis', 'alto', 2, 'secundaria', 'lenosa', 'biomasa fruto forraje', 15, 10, 15, 8, 300,
    2, 350, -15, 'EB EX MS LV AO AE SE', 'Almezas (bayas dulces)', 1, 'Sombra, forraje y madera flexible', true, 'redonda', '#5a8f45',
    'Una vez arraigado aguanta la sequía muy bien. Buen árbol alto para el norte de la clave y tutor para la vid.'),
  e('morera', 'Morera', 'Morus alba', 'medio', 3, 'secundaria', 'lenosa', 'fruto forraje biomasa tutor', 10, 8, 8, 4, 150,
    2, 400, -20, '*', 'Moras blancas; hoja forrajera', 2, 'Fruta, forraje y mucha biomasa tras la poda', false, 'redonda', '#5f9a3f',
    'Rebrota con fuerza tras la poda: la gran productora de biomasa del secano. Tradicional tutor de la vid.'),
  e('moral', 'Moral', 'Morus nigra', 'medio', 3, 'secundaria', 'lenosa', 'fruto biomasa', 8, 7, 10, 5, 200,
    2, 400, -15, '*', 'Moras negras', 2, 'Fruta fresca muy apreciada', false, 'redonda', '#4f8a3a',
    'Más lento que la morera, fruto excelente.'),
  e('nogal', 'Nogal', 'Juglans regia', 'alto', 1, 'climax', 'lenosa', 'fruto madera', 20, 15, 25, 6, 200,
    3, 600, -25, 'GA MN EB EX MS AE', 'Nueces', 3, 'Nuez y madera noble', false, 'redonda', '#3f7a3a',
    'De semilla tarda 10–15 años en dar fruto; injertado, 3–5.',
    { aviso: 'Juglona: sus raíces y hojas frenan a otras plantas (manzano, tomate, frambueso, alfalfa…). Lejos de la clave.' }),
  e('castano', 'Castaño', 'Castanea sativa', 'alto', 1, 'climax', 'lenosa', 'fruto madera', 20, 15, 30, 8, 500,
    3, 700, -20, 'GA MN EX AE', 'Castañas', 3, 'Castaña y madera', true, 'redonda', '#3d7536',
    'Solo en suelos ácidos y frescos. No es para el secano calizo del almendro o el pistacho.'),
  e('encina', 'Encina', 'Quercus ilex', 'alto', 1, 'climax', 'lenosa', 'fruto cortavientos madera', 15, 12, 40, 15, 700,
    1, 300, -20, '*', 'Bellotas (ganado, harina)', 2, 'Bellota y leña; el árbol clímax del monte mediterráneo', true, 'redonda', '#4a6b3a',
    'Lenta pero eterna. Es hacia donde camina el sistema: el bosque mediterráneo de Quercus.'),
  e('algarrobo', 'Algarrobo', 'Ceratonia siliqua', 'alto', 1, 'climax', 'lenosa', 'fruto forraje', 10, 10, 20, 7, 500,
    1, 250, -4, 'LV AO AE SE', 'Algarrobas (harina, pienso)', 2, 'Garrofín y algarroba', true, 'redonda', '#456b37',
    'Muy resistente a la sequía, pero sensible a la helada: solo en el litoral cálido. Aunque es leguminosa, no fija nitrógeno.'),
  e('aliso', 'Aliso', 'Alnus glutinosa', 'alto', 2, 'secundaria', 'lenosa', 'fijaN biomasa', 18, 8, 12, 0, 100,
    4, 800, -25, 'GA MN EB EX MS AE', '—', 1, 'Fija nitrógeno (con Frankia) y da biomasa', true, 'columnar', '#4b8243',
    'Árbol de ribera: solo junto a agua permanente o en el fondo de zanjas húmedas.'),
  e('robinia', 'Falsa acacia (robinia)', 'Robinia pseudoacacia', 'alto', 2, 'placenta', 'lenosa', 'fijaN biomasa polinizadores madera', 18, 10, 10, 0, 80,
    2, 400, -25, '*', 'Flores para miel', 1, 'Madera durísima, miel', false, 'redonda', '#6b9a48',
    'Fija nitrógeno y crece rápido.',
    { aviso: 'Exótica con tendencia invasora (rebrota de raíz). Evítala cerca de ríos y espacios naturales.' }),
  e('acacia3', 'Acacia de tres espinas', 'Gleditsia triacanthos', 'alto', 2, 'secundaria', 'lenosa', 'forraje biomasa', 15, 10, 12, 6, 120,
    2, 400, -25, '*', 'Vainas dulces (ganado)', 1, 'Forraje', false, 'extendida', '#7aa356',
    'Copa ligera que deja pasar la luz.',
    { aviso: 'A menudo citada como fijadora, pero no forma nódulos: no aporta nitrógeno. Espinas grandes.' }),
  e('cinamomo', 'Cinamomo', 'Melia azedarach', 'medio', 2, 'placenta', 'lenosa', 'biomasa', 10, 8, 8, 0, 60,
    2, 350, -12, 'EX MS LV AO AE SE', '—', 1, 'Sombra y biomasa', false, 'redonda', '#6a9a4a',
    'Crecimiento rápido.', { aviso: 'Frutos tóxicos para personas y animales. Exótica.' }),
  e('tilo', 'Tilo', 'Tilia platyphyllos', 'alto', 2, 'climax', 'lenosa', 'polinizadores biomasa', 20, 12, 25, 0, 300,
    3, 650, -25, 'GA MN EB', 'Flor para infusión', 2, 'Tila y miel', true, 'redonda', '#4c8a40',
    'De montaña y suelos frescos.'),
  e('sauce', 'Sauce', 'Salix alba', 'alto', 2, 'placenta', 'lenosa', 'biomasa', 15, 8, 8, 0, 60,
    4, 700, -30, '*', '—', 1, 'Mimbre y biomasa', true, 'redonda', '#7fae6a',
    'Para el borde húmedo de las zanjas y balsas.'),
  e('palmera', 'Palmera datilera', 'Phoenix dactylifera', 'alto', 1, 'climax', 'lenosa', 'fruto', 15, 6, 20, 7, 150,
    2, 300, -8, 'LV SE AO', 'Dátiles', 2, 'Dátil', false, 'palmera', '#6f8f4a',
    'Necesita mucho calor para madurar el dátil.'),
  e('cerezo', 'Cerezo', 'Prunus avium', 'alto', 2, 'secundaria', 'lenosa', 'fruto polinizadores madera', 12, 8, 12, 5, 80,
    3, 600, -25, 'GA MN EB EX MS AE', 'Cerezas', 3, 'Cereza', true, 'redonda', '#5b9442',
    'Zonas frescas de montaña (Jerte, Bierzo, Aragón).'),
  e('serbal', 'Serbal común', 'Sorbus domestica', 'alto', 1, 'climax', 'lenosa', 'fruto polinizadores', 12, 8, 20, 10, 300,
    2, 450, -25, 'MN EB EX MS LV AE', 'Serbas', 1, 'Fruta tradicional', true, 'redonda', '#5d8f45',
    'Longevo y rústico.'),

  // ---------------------------------------------------------------- medium: fruit trees and service trees
  e('higuera', 'Higuera', 'Ficus carica', 'medio', 2, 'secundaria', 'lenosa', 'fruto', 6, 7, 8, 3, 100,
    2, 300, -10, 'EB EX MS LV AO AE SE', 'Higos y brevas', 2, 'Fruta fresca y seca', true, 'extendida', '#5d9a45',
    'Sobrevive en secano extremo. Copa ancha: pódala para que no tape a la clave.', { kgPlanta: 15 }),
  e('granado', 'Granado', 'Punica granatum', 'bajo', 3, 'secundaria', 'lenosa', 'fruto polinizadores', 4, 3.5, 6, 3, 200,
    2, 350, -12, 'EB EX MS LV AO AE SE', 'Granadas', 2, 'Fruta', false, 'arbusto', '#6aa34c',
    'Aguanta la sal y la sequía. Bueno al sur de la clave: no le quita sol.', { kgPlanta: 12 }),
  e('membrillo', 'Membrillero', 'Cydonia oblonga', 'medio', 3, 'secundaria', 'lenosa', 'fruto', 5, 4, 7, 4, 50,
    3, 500, -20, '*', 'Membrillos', 2, 'Dulce de membrillo', false, 'redonda', '#7aa85a', 'Rústico, agradece algo de agua.', { kgPlanta: 15 }),
  e('azufaifo', 'Azufaifo', 'Ziziphus jujuba', 'medio', 3, 'secundaria', 'lenosa', 'fruto', 6, 4, 8, 3, 150,
    1, 250, -20, 'EB EX MS LV AO AE SE', 'Azufaifas', 2, 'Fruta', false, 'redonda', '#7aa24c',
    'De los frutales más resistentes a la sequía y al calor.', { kgPlanta: 10 }),
  e('nispero', 'Níspero', 'Eriobotrya japonica', 'medio', 3, 'secundaria', 'lenosa', 'fruto', 6, 5, 8, 3, 50,
    3, 500, -8, 'LV AO AE SE', 'Nísperos', 2, 'Fruta de primavera', false, 'redonda', '#3f7b3a', 'Florece en invierno: solo donde no hiela fuerte.', { kgPlanta: 20 }),
  e('albaricoquero', 'Albaricoquero', 'Prunus armeniaca', 'medio', 3, 'secundaria', 'lenosa', 'fruto polinizadores', 6, 6, 8, 3, 60,
    2, 400, -20, 'EB MS LV AE SE', 'Albaricoques', 2, 'Fruta', false, 'redonda', '#77a854', 'Floración temprana.', { kgPlanta: 25 }),
  e('ciruelo', 'Ciruelo', 'Prunus domestica', 'medio', 3, 'secundaria', 'lenosa', 'fruto polinizadores', 6, 5, 8, 3, 60,
    3, 500, -25, '*', 'Ciruelas', 2, 'Fruta', false, 'redonda', '#6a9f50', '', { kgPlanta: 25 }),
  e('manzano', 'Manzano', 'Malus domestica', 'medio', 2, 'secundaria', 'lenosa', 'fruto polinizadores', 6, 6, 10, 4, 80,
    3, 600, -25, 'GA MN EB', 'Manzanas', 2, 'Fruta y sidra', false, 'redonda', '#6aa050', 'Zonas frescas.', { kgPlanta: 40 }),
  e('peral', 'Peral', 'Pyrus communis', 'medio', 2, 'secundaria', 'lenosa', 'fruto polinizadores', 8, 5, 10, 5, 100,
    3, 600, -25, 'GA MN EB EX MS', 'Peras', 2, 'Fruta', true, 'columnar', '#679c4c', '', { kgPlanta: 40 }),
  e('caqui', 'Caqui', 'Diospyros kaki', 'medio', 3, 'secundaria', 'lenosa', 'fruto', 7, 6, 10, 4, 80,
    3, 600, -15, 'LV AO', 'Caquis', 2, 'Fruta', false, 'redonda', '#6c9a45', '', { kgPlanta: 40 }),
  e('acerolo', 'Acerolo', 'Crataegus azarolus', 'bajo', 3, 'secundaria', 'lenosa', 'fruto polinizadores', 5, 4, 10, 4, 150,
    1, 300, -20, 'EB EX MS LV AO AE SE', 'Acerolas', 1, 'Fruta tradicional', false, 'redonda', '#6d9550', 'Muy rústico; sirve de pie para injertar perales y nísperos.', { kgPlanta: 8 }),
  e('madrono', 'Madroño', 'Arbutus unedo', 'medio', 2, 'climax', 'lenosa', 'fruto polinizadores', 5, 4, 10, 5, 200,
    2, 450, -12, 'GA EX MS LV AO AE', 'Madroños', 1, 'Fruta y miel', true, 'redonda', '#3f6f3a', 'Prefiere suelos ácidos.'),
  e('acebuche', 'Acebuche', 'Olea europaea var. sylvestris', 'medio', 2, 'climax', 'lenosa', 'cortavientos forraje', 6, 6, 20, 0, 500,
    1, 250, -8, 'EX LV AO AE SE', 'Acebuchina (fauna)', 1, 'Pie para injertar olivos', true, 'redonda', '#566f45', 'El olivo silvestre.'),
  e('laurel', 'Laurel', 'Laurus nobilis', 'medio', 2, 'climax', 'lenosa', 'aromatica cortavientos', 8, 4, 12, 3, 150,
    3, 550, -12, 'GA EB LV AO AE', 'Hoja de laurel', 2, 'Condimento', true, 'columnar', '#365f31', 'Buen seto cortavientos.'),
  e('arbolamor', 'Árbol del amor', 'Cercis siliquastrum', 'medio', 2, 'secundaria', 'lenosa', 'polinizadores', 7, 6, 10, 0, 100,
    2, 350, -15, 'EB EX MS LV AO AE', 'Flores comestibles', 1, 'Ornamental y melífero', false, 'extendida', '#8aa064', 'Leguminosa que no fija nitrógeno.'),
  e('taraje', 'Taraje', 'Tamarix gallica', 'medio', 3, 'placenta', 'lenosa', 'biomasa cortavientos', 5, 4, 5, 0, 60,
    2, 300, -20, '*', '—', 1, 'Biomasa; aguanta la sal', true, 'arbusto', '#8aa57a', 'Para suelos salinos y bordes de zanja.'),
  e('tagasaste', 'Tagasaste', 'Chamaecytisus proliferus', 'medio', 4, 'placenta', 'lenosa', 'fijaN forraje biomasa', 4, 4, 3, 0, 20,
    2, 350, -7, 'EX LV AO AE SE', 'Forraje', 1, 'Nitrógeno y forraje', true, 'arbusto', '#8db35a',
    'La gran fijadora de crecimiento rápido (nativa de Canarias). Se poda a menudo y se deja en el suelo.', { sale: 12 }),
  e('eleagnus', 'Árbol del paraíso', 'Elaeagnus angustifolia', 'medio', 3, 'placenta', 'lenosa', 'fijaN fruto cortavientos', 6, 6, 6, 4, 60,
    1, 250, -30, 'MN EB MS LV AE SE', 'Frutos harinosos', 1, 'Nitrógeno y cortavientos', false, 'redonda', '#9cae86',
    'Fija nitrógeno y aguanta frío, sal y sequía.', { aviso: 'Exótica que puede asilvestrarse en riberas: vigílala.' }),

  // ---------------------------------------------------------------- low: shrubs, N-fixers, berries
  e('retamaolor', 'Retama de olor', 'Spartium junceum', 'bajo', 4, 'placenta', 'lenosa', 'fijaN polinizadores biomasa', 2.5, 2, 2, 0, 20,
    1, 250, -15, '*', '—', 1, 'Nitrógeno y flores para polinizadores', true, 'mata', '#b8b54a', 'Fijadora autóctona de crecimiento rápido. Se poda y se deja en el suelo.', { sale: 10 }),
  e('retama', 'Retama', 'Retama sphaerocarpa', 'bajo', 4, 'placenta', 'lenosa', 'fijaN biomasa', 2.5, 2.5, 3, 0, 40,
    1, 200, -15, 'EX MS AO AE SE EB', '—', 1, 'Nitrógeno; bajo su copa crece la hierba', true, 'mata', '#a9ae55', 'La «isla de fertilidad» del secano manchego y extremeño.'),
  e('espantalobos', 'Espantalobos', 'Colutea arborescens', 'bajo', 4, 'placenta', 'lenosa', 'fijaN polinizadores', 3, 2, 3, 0, 30,
    1, 300, -20, '*', '—', 1, 'Nitrógeno', true, 'arbusto', '#93b05a', 'Fijadora autóctona que aguanta frío y caliza.', { sale: 12 }),
  e('alfalfaarborea', 'Alfalfa arbórea', 'Medicago arborea', 'bajo', 4, 'placenta', 'lenosa', 'fijaN forraje', 2, 2, 2, 0, 20,
    1, 250, -5, 'LV AO AE SE', 'Forraje', 1, 'Nitrógeno y forraje', true, 'arbusto', '#a3b56a', 'Solo donde no hiela fuerte.', { sale: 10 }),
  e('caragana', 'Caragana', 'Caragana arborescens', 'bajo', 4, 'placenta', 'lenosa', 'fijaN', 4, 3, 4, 0, 40,
    1, 300, -40, 'MN EB MS', 'Semillas (aves)', 1, 'Nitrógeno en zonas muy frías', false, 'arbusto', '#93ad5e', 'Fijadora para la meseta fría.'),
  e('olivootono', 'Olivo de otoño', 'Elaeagnus umbellata', 'bajo', 3, 'placenta', 'lenosa', 'fijaN fruto', 4, 4, 5, 3, 40,
    2, 400, -30, 'GA MN EB MS', 'Bayas rojas', 1, 'Nitrógeno y fruta', false, 'arbusto', '#a1ad86', '', { aviso: 'Invasora en otros países: úsala con cuidado.' }),
  e('sauco', 'Saúco', 'Sambucus nigra', 'bajo', 3, 'secundaria', 'lenosa', 'fruto polinizadores biomasa', 5, 4, 5, 3, 60,
    3, 550, -25, 'GA MN EB EX MS AE', 'Flores y bayas (cocinadas)', 1, 'Jarabe, mermelada', true, 'arbusto', '#5d8f45', 'Rebrota fuerte tras la poda.', { aviso: 'Las bayas crudas y las hojas son tóxicas.' }),
  e('avellano', 'Avellano', 'Corylus avellana', 'bajo', 3, 'secundaria', 'lenosa', 'fruto biomasa', 4, 4, 8, 4, 80,
    3, 650, -25, 'GA MN EB', 'Avellanas', 2, 'Fruto seco', true, 'arbusto', '#5f9446', 'Necesita frescor o riego.', { kgPlanta: 3 }),
  e('frambueso', 'Frambueso', 'Rubus idaeus', 'bajo', 4, 'secundaria', 'perenne', 'fruto', 1.5, 1, 2, 1, 15,
    3, 600, -25, 'GA MN EB', 'Frambuesas', 3, 'Fruto rojo', true, 'mata', '#5a9a46', 'Agradece la media sombra de los árboles.', { kgPlanta: 1 }),
  e('grosellero', 'Grosellero', 'Ribes rubrum', 'bajo', 4, 'secundaria', 'perenne', 'fruto', 1.5, 1.2, 2, 2, 20,
    3, 600, -30, 'GA MN EB', 'Grosellas', 2, 'Fruto rojo', false, 'mata', '#629a48', 'Media sombra.', { kgPlanta: 2 }),
  e('zarzamora', 'Zarzamora', 'Rubus ulmifolius', 'bajo', 4, 'placenta', 'perenne', 'fruto cobertura polinizadores', 2, 2, 2, 2, 30,
    2, 350, -20, '*', 'Moras', 1, 'Fruto silvestre', true, 'mata', '#4e8a3c', 'Protege a los plantones del ganado.', { aviso: 'Muy expansiva: contrólala.' }),
  e('mirto', 'Mirto', 'Myrtus communis', 'bajo', 3, 'climax', 'lenosa', 'aromatica polinizadores', 3, 2, 8, 3, 100,
    2, 400, -10, 'EX LV AO AE', 'Bayas (licor)', 1, 'Aromática', true, 'arbusto', '#3e6e3a', ''),
  e('lentisco', 'Lentisco', 'Pistacia lentiscus', 'bajo', 3, 'climax', 'lenosa', 'cobertura cortavientos', 3, 3, 10, 0, 200,
    1, 250, -8, 'EX LV AO AE SE', 'Almáciga (resina)', 1, 'Refugio de fauna', true, 'arbusto', '#486d3a', 'Pariente silvestre del pistacho.'),
  e('aladierno', 'Aladierno', 'Rhamnus alaternus', 'bajo', 3, 'climax', 'lenosa', 'polinizadores cortavientos', 4, 3, 10, 0, 100,
    1, 300, -12, 'EB EX MS LV AO AE SE', '—', 1, 'Refugio y alimento de aves', true, 'arbusto', '#3e6a36', ''),
  e('adelfa', 'Adelfa', 'Nerium oleander', 'bajo', 4, 'secundaria', 'lenosa', 'polinizadores', 3, 3, 4, 0, 60,
    2, 300, -10, 'EX LV AO AE SE', '—', 1, 'Ornamental', true, 'arbusto', '#5d8a4f', '', { aviso: 'Muy tóxica para personas y animales.' }),
  e('hierbaluisa', 'Hierba luisa', 'Aloysia citrodora', 'bajo', 4, 'secundaria', 'perenne', 'aromatica polinizadores', 1.5, 1.2, 2, 1, 15,
    3, 500, -5, 'LV AO AE SE', 'Hojas (infusión)', 2, 'Infusión', false, 'mata', '#88b05e', ''),

  // ---------------------------------------------------------------- aromatics
  e('romero', 'Romero', 'Salvia rosmarinus', 'bajo', 5, 'climax', 'perenne', 'aromatica polinizadores cobertura', 1.2, 1.2, 2, 1, 20,
    1, 200, -12, '*', 'Hojas (condimento)', 2, 'Aromática, aceite esencial, miel', true, 'mata', '#6d8b6a', 'Atrae polinizadores en invierno, cuando florece el almendro.'),
  e('espliego', 'Espliego (lavanda)', 'Lavandula latifolia', 'bajo', 5, 'climax', 'perenne', 'aromatica polinizadores', 0.8, 0.8, 2, 1, 15,
    1, 250, -15, '*', 'Flor (aceite esencial)', 2, 'Aceite esencial y miel', true, 'mata', '#8d86b8', ''),
  e('tomillo', 'Tomillo', 'Thymus vulgaris', 'suelo', 5, 'climax', 'perenne', 'aromatica polinizadores cobertura', 0.3, 0.4, 1, 1, 10,
    1, 200, -15, '*', 'Hojas (condimento)', 2, 'Aromática y miel', true, 'mata', '#7d8c6a', 'Cubre el suelo seco entre los árboles.'),
  e('salvia', 'Salvia', 'Salvia lavandulifolia', 'suelo', 5, 'climax', 'perenne', 'aromatica polinizadores', 0.5, 0.5, 1, 1, 10,
    1, 250, -15, 'MN EB MS AE EX', 'Hojas (infusión)', 2, 'Aromática', true, 'mata', '#8a9a7a', ''),
  e('santolina', 'Santolina', 'Santolina chamaecyparissus', 'suelo', 5, 'climax', 'perenne', 'aromatica cobertura', 0.5, 0.6, 1, 0, 10,
    1, 200, -15, '*', '—', 1, 'Repele insectos', true, 'mata', '#a4ab7a', ''),

  // ---------------------------------------------------------------- ground: perennial vegetables and covers (preferred)
  e('alcachofa', 'Alcachofa', 'Cynara scolymus', 'suelo', 5, 'secundaria', 'perenne', 'hortaliza', 1.2, 1.2, 1, 1, 6,
    3, 500, -8, 'EB LV AO AE SE', 'Alcachofas', 2, 'Hortaliza perenne', false, 'mata', '#8aa58c', 'Hortaliza perenne: 5–6 años en el mismo sitio.', { kgPlanta: 1.5 }),
  e('cardo', 'Cardo', 'Cynara cardunculus', 'suelo', 5, 'secundaria', 'perenne', 'hortaliza biomasa polinizadores', 1.5, 1.2, 1, 1, 8,
    2, 350, -10, '*', 'Pencas', 1, 'Hortaliza de invierno', true, 'mata', '#94a99a', 'Raíz profunda que rompe la suela de labor.'),
  e('esparrago', 'Espárrago', 'Asparagus officinalis', 'suelo', 4, 'secundaria', 'perenne', 'hortaliza', 1.5, 0.6, 2, 2, 15,
    2, 400, -20, '*', 'Espárragos', 2, 'Hortaliza perenne', true, 'hierba', '#8ab86a', '15 años de cosecha en el mismo sitio.', { kgPlanta: 0.4 }),
  e('fresa', 'Fresa silvestre', 'Fragaria vesca', 'suelo', 4, 'secundaria', 'perenne', 'fruto cobertura', 0.2, 0.4, 1, 1, 4,
    3, 550, -20, 'GA MN EB EX MS AE', 'Fresas', 2, 'Fruto rojo', true, 'hierba', '#4f9a45', 'Cubre el suelo a la sombra.', { kgPlanta: 0.2, sale: 4 }),
  e('alfalfa', 'Alfalfa', 'Medicago sativa', 'suelo', 5, 'placenta', 'perenne', 'fijaN forraje cobertura', 0.8, 0.5, 1, 0, 6,
    2, 350, -25, '*', 'Forraje', 1, 'Nitrógeno y forraje', false, 'hierba', '#7fb35a', 'Raíz muy profunda. Se siega y se deja como acolchado.', { sale: 6 }),
  e('esparceta', 'Esparceta', 'Onobrychis viciifolia', 'suelo', 5, 'placenta', 'perenne', 'fijaN forraje polinizadores', 0.6, 0.5, 1, 0, 5,
    1, 300, -25, 'MN EB MS AE', 'Forraje', 1, 'Nitrógeno en secano calizo', true, 'hierba', '#9ab86a', 'La cubierta fijadora del secano calizo frío.', { sale: 5 }),
  e('consuelda', 'Consuelda', 'Symphytum officinale', 'suelo', 5, 'secundaria', 'perenne', 'biomasa', 0.9, 0.8, 1, 0, 20,
    3, 500, -25, 'GA MN EB EX MS', '—', 1, 'Acumula nutrientes; acolchado', true, 'mata', '#4f8f45', 'Se corta 3–4 veces al año y se deja al pie de la clave.'),
  e('azafran', 'Azafrán', 'Crocus sativus', 'suelo', 5, 'secundaria', 'perenne', 'hortaliza', 0.15, 0.15, 1, 1, 4,
    1, 300, -15, 'MS EB AE', 'Azafrán (estigmas)', 3, 'La especia más cara del mundo', false, 'hierba', '#9b8fc4', 'Tradición de La Mancha.', { sale: 4 }),
  e('cebollino', 'Cebollino', 'Allium schoenoprasum', 'suelo', 5, 'secundaria', 'perenne', 'hortaliza', 0.3, 0.2, 1, 1, 5,
    3, 500, -25, '*', 'Hojas', 1, 'Condimento', true, 'hierba', '#6ab05a', ''),
  e('acedera', 'Acedera', 'Rumex acetosa', 'suelo', 5, 'secundaria', 'perenne', 'hortaliza', 0.5, 0.3, 1, 1, 5,
    3, 500, -25, 'GA MN EB', 'Hojas', 1, 'Verdura', true, 'hierba', '#5f9e4e', ''),

  // ---------------------------------------------------------------- placenta: annuals and green manure
  e('abonoverde', 'Abono verde (veza + avena)', 'Vicia sativa + Avena sativa', 'suelo', 5, 'placenta', 'anual', 'fijaN cobertura biomasa', 0.8, 0.3, 0.5, 0, 1,
    1, 250, -12, '*', '—', 1, 'Nitrógeno y biomasa el primer año', true, 'hierba', '#a6c46a', 'Se siembra en otoño y se siega en primavera dejándolo como acolchado.', { sale: 2 }),
  e('habas', 'Habas', 'Vicia faba', 'suelo', 5, 'placenta', 'anual', 'fijaN hortaliza', 1, 0.3, 0.5, 0.5, 1,
    2, 300, -8, '*', 'Habas', 1, 'Legumbre de invierno', true, 'hierba', '#78a85a', 'Siembra de otoño: fija nitrógeno y da comida en primavera.', { sale: 2, kgPlanta: 0.3 }),
  e('garbanzo', 'Garbanzo', 'Cicer arietinum', 'suelo', 5, 'placenta', 'anual', 'fijaN hortaliza', 0.5, 0.3, 0.5, 0.5, 1,
    1, 250, -5, '*', 'Garbanzos', 1, 'Legumbre de secano', true, 'hierba', '#a3b468', '', { sale: 2, kgPlanta: 0.05 }),
  e('judia', 'Judía', 'Phaseolus vulgaris', 'suelo', 5, 'placenta', 'anual', 'fijaN hortaliza', 0.6, 0.3, 0.3, 0.3, 1,
    3, 450, 2, '*', 'Judías', 1, 'Hortaliza de verano', false, 'hierba', '#5d9a48', '', { sale: 2, kgPlanta: 0.3 }),
  e('calabaza', 'Calabaza', 'Cucurbita maxima', 'suelo', 5, 'placenta', 'anual', 'hortaliza cobertura', 0.5, 1.5, 0.4, 0.4, 1,
    3, 450, 2, '*', 'Calabazas', 1, 'Hortaliza que cubre el suelo', false, 'hierba', '#4a8a38', 'Sus hojas grandes sombrean el suelo en verano.', { sale: 2, kgPlanta: 5 }),
  e('tomate', 'Tomate', 'Solanum lycopersicum', 'suelo', 5, 'placenta', 'anual', 'hortaliza', 1.2, 0.6, 0.4, 0.3, 1,
    3, 500, 2, '*', 'Tomates', 2, 'Hortaliza de verano', false, 'mata', '#4f8f3f', '', { sale: 2, kgPlanta: 3 }),
  e('acelga', 'Acelga', 'Beta vulgaris var. cicla', 'suelo', 5, 'placenta', 'anual', 'hortaliza', 0.5, 0.4, 0.3, 0.3, 2,
    3, 450, -8, '*', 'Hojas', 1, 'Verdura de rebrote', false, 'hierba', '#4e9a44', '', { sale: 2, kgPlanta: 1 }),
  e('capuchina', 'Capuchina', 'Tropaeolum majus', 'suelo', 5, 'placenta', 'anual', 'cobertura polinizadores', 0.3, 0.8, 0.3, 0.3, 1,
    3, 450, 0, '*', 'Flores y hojas', 1, 'Atrae al pulgón lejos de los frutales', false, 'hierba', '#6aa64a', '', { sale: 2 }),
];

export const ESPECIE: Record<string, Especie> = Object.fromEntries(ESPECIES.map(s => [s.id, s]));
export const CLAVES = ESPECIES.filter(s => s.clave);
export const especie = (id: string): Especie => ESPECIE[id] ?? ESPECIES[0];

/** Pairs that do not cooperate, beyond crowns that overlap (used by the advisor). */
export const SENSIBLES_JUGLONA = new Set(['manzano', 'tomate', 'frambueso', 'alfalfa', 'grosellero', 'peral']);
