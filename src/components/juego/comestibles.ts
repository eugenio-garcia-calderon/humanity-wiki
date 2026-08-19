// ============================================================================
// JUEGO VITAL — EL BOSQUE COMESTIBLE IBÉRICO (2026-08-19, petición de Eugenio:
// «genera al menos 40 tipos de árboles y arbustos comestibles de la zona
// ibérica y distribúyelos»).
//
// 48 especies REALES de la península, con su nombre común, su nombre
// científico, su porte, su altura de adulto y el color y tamaño de su fruto.
// No son adornos: cada una se dibuja con su silueta y su fruta, y al pasar
// por su lado el juego te dice qué es y qué da.
//
// El estrato dice en qué fila del camino se planta, como en la agricultura
// sintrópica de verdad: los altos al fondo, los bajos al borde.
// ============================================================================

export type Porte =
  | 'arbol'      // copa redonda ancha (frutales grandes)
  | 'columnar'   // copa alta y estrecha (ciprés, palmera joven)
  | 'parasol'    // copa aparasolada, muy ancha y plana (pino piñonero, algarrobo)
  | 'arbolito'   // frutal pequeño o arbolillo
  | 'arbusto'    // mata leñosa alta
  | 'mata'       // aromática baja
  | 'trepadora'  // vid, sobre parra
  | 'cactus'     // chumbera
  | 'palmera';   // datilera

/**
 * El TIPO DE HOJA (2026-08-19, petición de Eugenio: «hojas distintas para cada
 * especie»). No es un adorno: de aquí sale la silueta de la copa, así que un
 * pino no se parece a una higuera aunque los dos midan lo mismo. Son los
 * tipos botánicos de verdad de estas especies.
 */
export type HojaTipo =
  | 'aciculada'   // aguja: pino piñonero, enebro
  | 'coriacea'    // dura y perenne: encina, naranjo, laurel, madroño
  | 'lanceolada'  // estrecha y larga: olivo, almendro, granado
  | 'ovalada'     // la hoja de frutal de toda la vida: manzano, peral, cerezo
  | 'dentada'     // ancha y con sierra: castaño, avellano, morera, zarza
  | 'compuesta'   // dividida en foliolos: nogal, algarrobo, saúco, serbal
  | 'palmeada'    // lobulada y grande: higuera, vid, majuelo
  | 'abanico'     // palma: palmera datilera
  | 'carnosa'     // sin hoja o suculenta: chumbera, alcaparra
  | 'aguja';      // hojita diminuta de aromática: romero, tomillo, lavanda

export interface Especie {
  id: string;
  nombre: string;
  latin: string;
  porte: Porte;
  /** Qué forma tiene su hoja. Decide la silueta de la copa. */
  hojaTipo: HojaTipo;
  /** Altura adulta en metros: la del juego, ya recortada a escala de aldea. */
  alto: number;
  /** Radio de copa en metros. */
  copa: number;
  /** Color de la hoja. */
  hoja: string;
  /** Color del fruto; null = no se le ven frutos a esta escala. */
  fruta: string | null;
  /** Radio del fruto en metros (una manzana ~0,04; una calabaza no aplica). */
  frutaR: number;
  /** Qué se come, en una línea. */
  da: string;
  /** 1 = borde del camino (bajo) · 2 = medio · 3 = fondo (alto). */
  estrato: 1 | 2 | 3;
}

export const ESPECIES: Especie[] = [
  // --- ÁRBOLES GRANDES (estrato 3, al fondo) -------------------------------
  { id: 'nogal', nombre: 'Nogal', latin: 'Juglans regia', porte: 'arbol', alto: 9.5, copa: 4.6, hojaTipo: 'compuesta', hoja: '#5d7b46', fruta: '#8a7a3f', frutaR: 0.06, da: 'Nueces en otoño', estrato: 3 },
  { id: 'castano', nombre: 'Castaño', latin: 'Castanea sativa', porte: 'arbol', alto: 10, copa: 4.8, hojaTipo: 'dentada', hoja: '#4f7038', fruta: '#7d5c2e', frutaR: 0.06, da: 'Castañas en otoño', estrato: 3 },
  { id: 'encina', nombre: 'Encina', latin: 'Quercus ilex', porte: 'parasol', alto: 8.5, copa: 5.2, hojaTipo: 'coriacea', hoja: '#3f5c39', fruta: '#6b5a2a', frutaR: 0.04, da: 'Bellotas dulces', estrato: 3 },
  { id: 'alcornoque', nombre: 'Alcornoque', latin: 'Quercus suber', porte: 'parasol', alto: 8.8, copa: 5, hojaTipo: 'coriacea', hoja: '#44603c', fruta: '#6b5a2a', frutaR: 0.04, da: 'Bellotas y corcho', estrato: 3 },
  { id: 'pino_pinonero', nombre: 'Pino piñonero', latin: 'Pinus pinea', porte: 'parasol', alto: 11, copa: 5.6, hojaTipo: 'aciculada', hoja: '#3c5a44', fruta: '#6d5433', frutaR: 0.09, da: 'Piñones', estrato: 3 },
  { id: 'algarrobo', nombre: 'Algarrobo', latin: 'Ceratonia siliqua', porte: 'parasol', alto: 8, copa: 5, hojaTipo: 'compuesta', hoja: '#496b45', fruta: '#4a3524', frutaR: 0.05, da: 'Algarrobas', estrato: 3 },
  { id: 'olivo', nombre: 'Olivo', latin: 'Olea europaea', porte: 'arbol', alto: 6.5, copa: 3.8, hojaTipo: 'lanceolada', hoja: '#7e9376', fruta: '#3f4a2a', frutaR: 0.035, da: 'Aceitunas y aceite', estrato: 3 },
  { id: 'morera', nombre: 'Morera', latin: 'Morus nigra', porte: 'arbol', alto: 8, copa: 4.2, hojaTipo: 'dentada', hoja: '#5b7f42', fruta: '#4a1f3d', frutaR: 0.04, da: 'Moras negras', estrato: 3 },
  { id: 'higuera', nombre: 'Higuera', latin: 'Ficus carica', porte: 'arbol', alto: 6, copa: 4.4, hojaTipo: 'palmeada', hoja: '#618f4b', fruta: '#6a4b6e', frutaR: 0.06, da: 'Higos y brevas', estrato: 3 },
  { id: 'palmera_datilera', nombre: 'Palmera datilera', latin: 'Phoenix dactylifera', porte: 'palmera', alto: 9, copa: 3.2, hojaTipo: 'abanico', hoja: '#6f8c48', fruta: '#a3671f', frutaR: 0.045, da: 'Dátiles', estrato: 3 },

  // --- FRUTALES MEDIANOS (estrato 2) --------------------------------------
  { id: 'almendro', nombre: 'Almendro', latin: 'Prunus dulcis', porte: 'arbolito', alto: 5.2, copa: 3.2, hojaTipo: 'lanceolada', hoja: '#7d9455', fruta: '#9aa06a', frutaR: 0.04, da: 'Almendras; flor en enero', estrato: 2 },
  { id: 'cerezo', nombre: 'Cerezo', latin: 'Prunus avium', porte: 'arbolito', alto: 5.8, copa: 3, hojaTipo: 'ovalada', hoja: '#5a8348', fruta: '#a3102a', frutaR: 0.035, da: 'Cerezas en junio', estrato: 2 },
  { id: 'ciruelo', nombre: 'Ciruelo', latin: 'Prunus domestica', porte: 'arbolito', alto: 4.8, copa: 2.8, hojaTipo: 'ovalada', hoja: '#5f8a4c', fruta: '#5b3a6b', frutaR: 0.04, da: 'Ciruelas', estrato: 2 },
  { id: 'melocotonero', nombre: 'Melocotonero', latin: 'Prunus persica', porte: 'arbolito', alto: 4.4, copa: 2.8, hojaTipo: 'lanceolada', hoja: '#618f4f', fruta: '#dd7a3c', frutaR: 0.045, da: 'Melocotones', estrato: 2 },
  { id: 'albaricoquero', nombre: 'Albaricoquero', latin: 'Prunus armeniaca', porte: 'arbolito', alto: 4.6, copa: 2.9, hojaTipo: 'ovalada', hoja: '#5e8a4a', fruta: '#e29a3c', frutaR: 0.04, da: 'Albaricoques', estrato: 2 },
  { id: 'manzano', nombre: 'Manzano', latin: 'Malus domestica', porte: 'arbolito', alto: 4.8, copa: 3, hojaTipo: 'ovalada', hoja: '#5c8746', fruta: '#c0392b', frutaR: 0.045, da: 'Manzanas', estrato: 2 },
  { id: 'peral', nombre: 'Peral', latin: 'Pyrus communis', porte: 'arbolito', alto: 5.4, copa: 2.6, hojaTipo: 'ovalada', hoja: '#568040', fruta: '#c9b86e', frutaR: 0.045, da: 'Peras', estrato: 2 },
  { id: 'membrillero', nombre: 'Membrillero', latin: 'Cydonia oblonga', porte: 'arbolito', alto: 4, copa: 2.6, hojaTipo: 'ovalada', hoja: '#6a8a55', fruta: '#e0c04a', frutaR: 0.05, da: 'Membrillos', estrato: 2 },
  { id: 'granado', nombre: 'Granado', latin: 'Punica granatum', porte: 'arbolito', alto: 4.2, copa: 2.6, hojaTipo: 'lanceolada', hoja: '#6d9350', fruta: '#a72f2a', frutaR: 0.05, da: 'Granadas', estrato: 2 },
  { id: 'naranjo', nombre: 'Naranjo', latin: 'Citrus sinensis', porte: 'arbolito', alto: 4.4, copa: 2.6, hojaTipo: 'coriacea', hoja: '#3f6b3a', fruta: '#e8791a', frutaR: 0.045, da: 'Naranjas', estrato: 2 },
  { id: 'limonero', nombre: 'Limonero', latin: 'Citrus limon', porte: 'arbolito', alto: 4, copa: 2.4, hojaTipo: 'coriacea', hoja: '#43703c', fruta: '#e8d33a', frutaR: 0.04, da: 'Limones todo el año', estrato: 2 },
  { id: 'mandarino', nombre: 'Mandarino', latin: 'Citrus reticulata', porte: 'arbolito', alto: 3.8, copa: 2.3, hojaTipo: 'coriacea', hoja: '#3f6b3a', fruta: '#eb8b28', frutaR: 0.038, da: 'Mandarinas', estrato: 2 },
  { id: 'nispero', nombre: 'Níspero', latin: 'Eriobotrya japonica', porte: 'arbolito', alto: 5, copa: 2.8, hojaTipo: 'dentada', hoja: '#4d6f3f', fruta: '#e5a33a', frutaR: 0.04, da: 'Nísperos en abril', estrato: 2 },
  { id: 'caqui', nombre: 'Caqui', latin: 'Diospyros kaki', porte: 'arbolito', alto: 5.2, copa: 3, hojaTipo: 'ovalada', hoja: '#527f43', fruta: '#e0642a', frutaR: 0.05, da: 'Caquis en otoño', estrato: 2 },
  { id: 'avellano', nombre: 'Avellano', latin: 'Corylus avellana', porte: 'arbusto', alto: 4, copa: 2.6, hojaTipo: 'dentada', hoja: '#688b4c', fruta: '#9a7a45', frutaR: 0.035, da: 'Avellanas', estrato: 2 },
  { id: 'madrono', nombre: 'Madroño', latin: 'Arbutus unedo', porte: 'arbusto', alto: 4.2, copa: 2.4, hojaTipo: 'coriacea', hoja: '#3f6b42', fruta: '#d94b2b', frutaR: 0.035, da: 'Madroños en otoño', estrato: 2 },
  { id: 'serbal', nombre: 'Serbal', latin: 'Sorbus domestica', porte: 'arbolito', alto: 6, copa: 2.8, hojaTipo: 'compuesta', hoja: '#5b7f4a', fruta: '#c96a2e', frutaR: 0.03, da: 'Serbas', estrato: 2 },
  { id: 'acerolo', nombre: 'Acerolo', latin: 'Crataegus azarolus', porte: 'arbolito', alto: 4, copa: 2.4, hojaTipo: 'dentada', hoja: '#5d8149', fruta: '#d9863a', frutaR: 0.03, da: 'Acerolas', estrato: 2 },
  { id: 'azufaifo', nombre: 'Azufaifo', latin: 'Ziziphus jujuba', porte: 'arbolito', alto: 4.4, copa: 2.5, hojaTipo: 'ovalada', hoja: '#6b8c4a', fruta: '#8c4a2a', frutaR: 0.035, da: 'Azufaifas', estrato: 2 },
  { id: 'chumbera', nombre: 'Chumbera', latin: 'Opuntia ficus-indica', porte: 'cactus', alto: 2.6, copa: 1.5, hojaTipo: 'carnosa', hoja: '#6f9160', fruta: '#c9452e', frutaR: 0.05, da: 'Higos chumbos', estrato: 2 },

  // --- ARBUSTOS Y BAYAS (estrato 1, al borde del camino) ------------------
  { id: 'zarzamora', nombre: 'Zarzamora', latin: 'Rubus ulmifolius', porte: 'arbusto', alto: 1.8, copa: 1.6, hojaTipo: 'dentada', hoja: '#4d7040', fruta: '#241426', frutaR: 0.03, da: 'Moras de zarza', estrato: 1 },
  { id: 'frambueso', nombre: 'Frambueso', latin: 'Rubus idaeus', porte: 'arbusto', alto: 1.6, copa: 1.1, hojaTipo: 'dentada', hoja: '#5d8149', fruta: '#c0304a', frutaR: 0.025, da: 'Frambuesas', estrato: 1 },
  { id: 'grosellero', nombre: 'Grosellero', latin: 'Ribes rubrum', porte: 'arbusto', alto: 1.4, copa: 1.1, hojaTipo: 'palmeada', hoja: '#5f8747', fruta: '#c02a35', frutaR: 0.02, da: 'Grosellas', estrato: 1 },
  { id: 'arandano', nombre: 'Arándano', latin: 'Vaccinium myrtillus', porte: 'mata', alto: 0.8, copa: 0.75, hojaTipo: 'ovalada', hoja: '#48703f', fruta: '#2f3d6b', frutaR: 0.018, da: 'Arándanos', estrato: 1 },
  { id: 'sauco', nombre: 'Saúco', latin: 'Sambucus nigra', porte: 'arbusto', alto: 3.4, copa: 2.2, hojaTipo: 'compuesta', hoja: '#4f7a44', fruta: '#231832', frutaR: 0.02, da: 'Flor y bayas de saúco', estrato: 1 },
  { id: 'majuelo', nombre: 'Majuelo', latin: 'Crataegus monogyna', porte: 'arbusto', alto: 3.2, copa: 2, hojaTipo: 'palmeada', hoja: '#527f43', fruta: '#b8302a', frutaR: 0.022, da: 'Majuelas', estrato: 1 },
  { id: 'endrino', nombre: 'Endrino', latin: 'Prunus spinosa', porte: 'arbusto', alto: 2.8, copa: 1.8, hojaTipo: 'ovalada', hoja: '#4a6f3d', fruta: '#2b2f5e', frutaR: 0.025, da: 'Endrinas (pacharán)', estrato: 1 },
  { id: 'escaramujo', nombre: 'Rosal silvestre', latin: 'Rosa canina', porte: 'arbusto', alto: 2, copa: 1.5, hojaTipo: 'compuesta', hoja: '#5b8148', fruta: '#c4442a', frutaR: 0.022, da: 'Escaramujos, vitamina C', estrato: 1 },
  { id: 'lentisco', nombre: 'Lentisco', latin: 'Pistacia lentiscus', porte: 'arbusto', alto: 2.4, copa: 1.7, hojaTipo: 'compuesta', hoja: '#41663c', fruta: '#5a2233', frutaR: 0.018, da: 'Resina de almáciga', estrato: 1 },
  { id: 'mirto', nombre: 'Mirto', latin: 'Myrtus communis', porte: 'arbusto', alto: 2.2, copa: 1.5, hojaTipo: 'coriacea', hoja: '#3d6540', fruta: '#2a2140', frutaR: 0.018, da: 'Murtones aromáticos', estrato: 1 },
  { id: 'enebro', nombre: 'Enebro', latin: 'Juniperus communis', porte: 'columnar', alto: 3, copa: 1.1, hojaTipo: 'aciculada', hoja: '#4a6b4e', fruta: '#3b4a6b', frutaR: 0.018, da: 'Enebrinas (ginebra)', estrato: 1 },
  { id: 'laurel', nombre: 'Laurel', latin: 'Laurus nobilis', porte: 'columnar', alto: 4.2, copa: 1.5, hojaTipo: 'coriacea', hoja: '#3c5f39', fruta: '#20202e', frutaR: 0.02, da: 'Hoja de laurel', estrato: 1 },
  { id: 'alcaparra', nombre: 'Alcaparra', latin: 'Capparis spinosa', porte: 'mata', alto: 0.9, copa: 1.2, hojaTipo: 'carnosa', hoja: '#6f8f5c', fruta: '#4f6b33', frutaR: 0.02, da: 'Alcaparras y alcaparrones', estrato: 1 },
  { id: 'vid', nombre: 'Vid', latin: 'Vitis vinifera', porte: 'trepadora', alto: 2.4, copa: 1.9, hojaTipo: 'palmeada', hoja: '#5f8a3f', fruta: '#4a2247', frutaR: 0.022, da: 'Uvas en septiembre', estrato: 1 },
  { id: 'romero', nombre: 'Romero', latin: 'Rosmarinus officinalis', porte: 'mata', alto: 1.1, copa: 0.85, hojaTipo: 'aguja', hoja: '#5c7a5e', fruta: '#8fa4d4', frutaR: 0.012, da: 'Hoja y flor melífera', estrato: 1 },
  { id: 'tomillo', nombre: 'Tomillo', latin: 'Thymus vulgaris', porte: 'mata', alto: 0.55, copa: 0.6, hojaTipo: 'aguja', hoja: '#6d7f5a', fruta: '#b892c4', frutaR: 0.01, da: 'Tomillo para guisos', estrato: 1 },
  { id: 'lavanda', nombre: 'Lavanda', latin: 'Lavandula angustifolia', porte: 'mata', alto: 0.85, copa: 0.7, hojaTipo: 'aguja', hoja: '#7d8f77', fruta: '#8b6fc4', frutaR: 0.014, da: 'Flor para infusión y abejas', estrato: 1 },
  { id: 'salvia', nombre: 'Salvia', latin: 'Salvia officinalis', porte: 'mata', alto: 0.7, copa: 0.65, hojaTipo: 'lanceolada', hoja: '#8a9c86', fruta: '#9d7fc4', frutaR: 0.012, da: 'Hoja para infusión', estrato: 1 },
  { id: 'oregano', nombre: 'Orégano', latin: 'Origanum vulgare', porte: 'mata', alto: 0.5, copa: 0.55, hojaTipo: 'aguja', hoja: '#6f8a5a', fruta: '#c9a6d4', frutaR: 0.01, da: 'Orégano', estrato: 1 },
];

/** Cuántas especies hay: lo enseña el cartel del huerto. */
export const TOTAL_ESPECIES = ESPECIES.length;

/** Las de un estrato, en el orden del catálogo. */
export function porEstrato(n: 1 | 2 | 3): Especie[] {
  return ESPECIES.filter(e => e.estrato === n);
}
