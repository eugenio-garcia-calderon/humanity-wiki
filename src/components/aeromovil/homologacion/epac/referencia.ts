// What Eugenio pasted (2026-11-24, 12:49), kept in full and checked section by section against the legal text
// (`textoAportado.ts` is the text itself; this file says what holds). Same three verdicts as the guides (guias.ts):
// confirmado (read in the legal text on 2026-11-24), con matiz (true but with a catch) and no comprobado (the page does
// not claim it). Nothing here is legal advice.
import type { Veredicto } from '../guias';
import { TEXTO_APORTADO, type EntradaTexto } from './textoAportado';

export interface Contraste { v: Veredicto; texto: string }
export interface EntradaReferencia extends EntradaTexto { contraste: Contraste[] }

const CONTRASTE: Record<string, Contraste[]> = {
  'intro': [
    { v: 'confirmado', texto: 'No hay inspección previa de la Administración: el RD 339/2014 (art. 4) pone la responsabilidad en el fabricante y la vigilancia en el mercado (art. 5).' },
  ],
  '1-tu-posicion-juridica-como-fabricante': [
    { v: 'confirmado', texto: 'Art. 4: el fabricante responde de la conformidad, elabora el expediente técnico antes de comercializar y firma la declaración. El expediente se conserva al menos diez años.' },
    { v: 'confirmado', texto: 'Los ensayos puede hacerlos el propio fabricante: el anexo III habla de «los resultados de los ensayos realizados por el fabricante, por su representante autorizado o por un organismo elegido por cualquiera de estos», y le obliga a someter los componentes y el ciclo a los ensayos necesarios. No exige un laboratorio.' },
    { v: 'matiz', texto: 'Puedes ensayar tú, pero la ley no da el método ni las cifras de casi ningún ensayo: salen de las normas técnicas (EN 15194, ISO 4210, EN 17860), que son de pago. Hasta tenerlas, el informe debe decir qué criterio usaste y de dónde lo sacaste.' },
  ],
  'a-clasificacion-legal-del-vehiculo': [
    { v: 'confirmado', texto: 'Definición de ciclo (RD 339/2014, art. 2), 250 W y 25 km/h (Orden PJC/780/2025) y exclusión de la homologación de categoría L (Reglamento 168/2013, art. 2.2.h).' },
    { v: 'matiz', texto: 'La tabla del texto resume la definición; el motor, para contar como ayuda, tiene que dejar de empujar al dejar de pedalear y no puede haber un mando que lo mueva sin pedalear.' },
  ],
  'b-seguridad-mecanica-del-vehiculo': [
    { v: 'confirmado', texto: 'Los doce puntos de la tabla salen del anexo VI del RD 339/2014 (más de dos ruedas): datos generales, aristas, transmisión, frenos, dirección, neumáticos, luces, reflectores, estabilidad, pasajeros y timbre.' },
    { v: 'matiz', texto: 'El anexo VI no da cifras de frenado ni de estabilidad. La matriz las deja como «criterio que adopta el ingeniero» salvo las luces (4 a 60 cd delante, 4 a 12 cd detrás).' },
  ],
  'c-seguridad-electrica-y-electronica': [
    { v: 'matiz', texto: 'La ficha pública de la EN 15194 la enlaza con la Directiva de máquinas 2006/42/CE (anexo ZA). La respuesta de la Comisión del 11-2-2025 que cita el texto no la he abierto.' },
    { v: 'no comprobado', texto: 'Que el Reglamento 2023/1230 sustituya a la Directiva desde el 20-1-2027, que el control interno de la producción baste para este vehículo y que la EN 15194 tenga una restricción por vibraciones: son afirmaciones del texto que no he releído en las fuentes. Confírmalas con alguien que conozca la normativa de máquinas antes de firmar la declaración UE.' },
    { v: 'no comprobado', texto: 'Batería LMT del Reglamento (UE) 2023/1542 y lista de normas (EN 17860-3 y -5): no he releído los textos. La parte 6 de la EN 17860 (pasajeros) no la encontré en el catálogo.' },
  ],
  'd-documentacion-obligatoria-del-fabrican': [
    { v: 'confirmado', texto: 'Anexo III (expediente técnico) y anexo I (declaración de conformidad, ocho datos): leídos en el BOE.' },
  ],
  'expediente-tecnico-del-modelo': [
    { v: 'matiz', texto: 'Los ocho apartados son la forma de ordenarlo que propone el texto; el anexo III lista los contenidos (descripción, planos, cálculos, ensayos, normas, manual, control de producción) sin esa numeración. El documento D03 los recoge.' },
    { v: 'no comprobado', texto: 'Que haya que integrar el expediente de máquinas y el del RD 339/2014 en uno solo es una recomendación, no una obligación.' },
  ],
  '3-que-debes-poner-fisicamente-en-cada-ve': [
    { v: 'confirmado', texto: 'Art. 3: placa visible, legible e indeleble con razón social, dirección completa y número de serie; modelo identificado de forma permanente; documentación de conformidad y manual con cada unidad; información y advertencias al menos en castellano.' },
    { v: 'no comprobado', texto: 'El año de fabricación no lo pide el RD 339/2014: lo pide el marcado de máquinas (Directiva 2006/42/CE, anexo I, 1.7.3), que no he releído.' },
  ],
  '4-que-te-pueden-pedir-en-una-inspeccion-': [
    { v: 'confirmado', texto: 'Art. 5: la Administración puede comprobar productos ya comercializados, pedir documentación y ordenar corrección, prohibición, retirada y, en casos graves, destrucción.' },
    { v: 'confirmado', texto: 'Tampoco hay una lista legal de pruebas ni un número de ensayos destructivos por unidad: el plan de validación lo justifica el fabricante.' },
  ],
  '5-como-organizaria-tus-ensayos-siendo-tu': [
    { v: 'matiz', texto: 'Es una recomendación de método, no una obligación legal. Es la que sigue el generador de informes de la pestaña «Ensayos».' },
  ],
  '6-mi-recomendacion-prepara-estos-ocho-do': [
    { v: 'matiz', texto: 'Los ocho documentos son la propuesta del texto, no una lista legal. Están todos en la pestaña «Documentos», con generador y editor.' },
  ],
  'dos-advertencias-que-no-dejaria-pasar': [
    { v: 'matiz', texto: 'Son dos declaraciones distintas (la del RD 339/2014 y la UE de máquinas): el expediente tiene un documento para cada una (D06 y D07).' },
    { v: 'confirmado', texto: 'La clasificación se revisa antes de congelar el diseño: es la obligación O07 de la matriz. Con cuatro ruedas, volante o pasajeros hay que cuidar que no entre nada que lo convierta en vehículo a motor.' },
  ],
  'normativa-que-guardaria-como-referencia': [
    { v: 'no comprobado', texto: 'Los seis enlaces son los del texto; abrí el RD 339/2014 en el BOE y no abrí los demás.' },
  ],
};

export const REFERENCIA: EntradaReferencia[] = TEXTO_APORTADO.map(e => ({ ...e, contraste: CONTRASTE[e.id] ?? [] }));
export const IDS_CONTRASTE = Object.keys(CONTRASTE);

/** «Lo que te pueden pedir en una inspección» as a checklist tied to the matrix (the text's table, one row each). */
export const INSPECCION: { pregunta: string; entregas: string; obligaciones: string[] }[] = [
  { pregunta: '¿Quién es el fabricante?', entregas: 'Datos de empresa y responsable', obligaciones: ['O50', 'O61'] },
  { pregunta: '¿Qué producto estás vendiendo?', entregas: 'Ficha técnica y planos', obligaciones: ['O10', 'O60'] },
  { pregunta: '¿Cumple 250 W?', entregas: 'Ficha de motor y ensayo', obligaciones: ['O03'] },
  { pregunta: '¿Corta a 25 km/h?', entregas: 'Informe de ensayo', obligaciones: ['O04'] },
  { pregunta: '¿Se desconecta al dejar de pedalear?', entregas: 'Informe de ensayo', obligaciones: ['O05', 'O02'] },
  { pregunta: '¿Es estable?', entregas: 'Cálculos e informes de pruebas', obligaciones: ['O20'] },
  { pregunta: '¿Frena correctamente?', entregas: 'Ensayos de frenado', obligaciones: ['O13', 'O14'] },
  { pregunta: '¿Es estructuralmente seguro?', entregas: 'Cálculos y ensayos de resistencia', obligaciones: ['O23'] },
  { pregunta: '¿Es seguro eléctricamente?', entregas: 'Informe técnico y documentación eléctrica', obligaciones: ['O34', 'O35', 'O36'] },
  { pregunta: '¿Qué riesgos tiene?', entregas: 'Evaluación de riesgos', obligaciones: ['O30'] },
  { pregunta: '¿Cómo se fabrica?', entregas: 'Procedimientos de producción', obligaciones: ['O70', 'O71'] },
  { pregunta: '¿Cómo controlas las unidades?', entregas: 'Registros de calidad y trazabilidad', obligaciones: ['O72', 'O73'] },
  { pregunta: '¿Qué información recibe el comprador?', entregas: 'Manual y declaración de conformidad', obligaciones: ['O53', 'O54', 'O55'] },
  { pregunta: '¿Tiene identificación?', entregas: 'Placa y número de serie', obligaciones: ['O50', 'O51', 'O52'] },
];
