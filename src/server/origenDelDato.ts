// ============================================================================
// DE DÓNDE SALE CADA CIFRA (2026-08-22)
// ============================================================================
// El `CLAUDE.md` de este proyecto lo dice en su primera página: «confundir un
// dato simulado con uno medido es el error más caro cometido en este proyecto».
// Y sigue vivo. Medido hoy contra la base de datos:
//
//     municipios (Madrid)  17.363 observaciones  →  «Excel Municipios Madrid (simulado)»
//     países                3.136 observaciones  →  «IA — número aleatorio, pendiente de revisión»
//     países                   41 observaciones  →  INE, MITECO, FAO, ESS… (reales)
//     regiones                 17 observaciones  →  INE / estimación por comunidad
//
// O sea: **el 99,7 % de lo que se pinta está simulado**, la base de datos lo
// sabe —todas las filas declaran su fuente— y la pantalla no lo dice en ningún
// sitio. Una puntuación inventada se ve exactamente igual que una medida.
//
// ── POR QUÉ ESTO ES UNA FUNCIÓN Y NO UN ICONO EN CADA PANTALLA ──────────────
// Porque el origen tiene que viajar CON el dato. Un icono pegado en el mapa no
// protege al panel del territorio, ni a la ficha del indicador, ni a lo que la
// IA cite en una respuesta. Aquí se clasifica una vez, junto a la cifra, y
// quien la pinte —hoy tres pantallas, mañana las que sean— recibe ya dicho de
// qué se trata.
//
// ── LOS CUATRO ESTADOS, Y POR QUÉ CUATRO ───────────────────────────────────
// `medido`      sale de una fuente citada: INE, MITECO, FAO, una estación.
// `estimado`    real pero derivado: una estimación, un reparto por comunidad.
// `simulado`    inventado para poder enseñar la plataforma. No es un dato.
// `desconocido` NO SE SABE. Sin fuente escrita, no se supone que sea buena.
//
// El cuarto es el que impide repetir el error. La tentación es tratar «sin
// fuente» como «medido» —total, casi todo lo bueno viene sin adornos— y eso es
// exactamente presentar como cierto lo que nadie ha comprobado. Si no consta,
// se dice que no consta.

export type OrigenDelDato = 'medido' | 'estimado' | 'simulado' | 'desconocido';

/** Las marcas que delatan una cifra inventada. En minúsculas y sin tildes: las
 *  fuentes las escriben personas y llegan de las dos maneras. */
const SIMULADO = [
  'simulado', 'simulada', 'aleatorio', 'aleatoria', 'random',
  'ficticio', 'ficticia', 'inventado', 'demo', 'de prueba',
  'pendiente de revision', 'placeholder',
];

/** Real, pero calculado a partir de otra cosa: no se ha medido AQUÍ. */
const ESTIMADO = ['estimacion', 'estimado', 'estimada', 'aproximad', 'extrapolad', 'proyeccion'];

const sinTildes = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Clasifica una fuente. Lo único que hace falta saber para no mentir.
 *
 * SIMULADO GANA A TODO. «IA — número aleatorio» lleva dentro la palabra
 * «aleatorio» y también podría leerse como una fuente citada («IA»); en la
 * duda, lo que manda es la advertencia. Equivocarse hacia «simulado» hace que
 * alguien desconfíe de un dato bueno; hacia «medido», que cite uno inventado.
 * El segundo error es el caro.
 */
export function origenDe(fuente: string | null | undefined): OrigenDelDato {
  const f = sinTildes(String(fuente || '').trim());
  if (!f) return 'desconocido';
  if (SIMULADO.some(m => f.includes(m))) return 'simulado';
  if (ESTIMADO.some(m => f.includes(m))) return 'estimado';
  return 'medido';
}

/** Cómo se llama cada uno en pantalla, y qué hay que entender. El texto vive
 *  aquí, junto a la regla, y no repartido por las pantallas: si un día se
 *  reformula, se reformula una vez. */
export const ETIQUETA_ORIGEN: Record<OrigenDelDato, { corto: string; explicacion: string }> = {
  medido: {
    corto: 'Medido',
    explicacion: 'Sale de una fuente citada y verificable.',
  },
  estimado: {
    corto: 'Estimado',
    explicacion: 'Dato real, pero calculado a partir de otro — no medido aquí.',
  },
  simulado: {
    corto: 'Simulado',
    explicacion: 'Cifra inventada para poder enseñar la plataforma. No sirve para decidir ni para citar.',
  },
  desconocido: {
    corto: 'Sin fuente',
    explicacion: 'No consta de dónde sale. Trátalo como no comprobado.',
  },
};

/**
 * El origen de un CONJUNTO de cifras — el de un territorio, el de un objetivo.
 *
 * MANDA EL PEOR. Un objetivo con nueve indicadores medidos y uno simulado no
 * es un objetivo medido: su puntuación lleva dentro el inventado, y enseñarla
 * como medida sería exactamente el error que esto viene a evitar. Con la marca
 * del peor, quien la lea sabe que hay algo que mirar.
 */
export function origenDeVarios(fuentes: Array<string | null | undefined>): OrigenDelDato {
  if (!fuentes.length) return 'desconocido';
  const orden: OrigenDelDato[] = ['simulado', 'desconocido', 'estimado', 'medido'];
  const encontrados = new Set(fuentes.map(origenDe));
  return orden.find(o => encontrados.has(o)) || 'desconocido';
}
