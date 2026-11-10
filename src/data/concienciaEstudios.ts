// ============================================================================
// ESTUDIO SOBRE LA CONCIENCIA — los estudios citados bajo el mapa (2026-11-10)
// ============================================================================
// Every reference here was checked against a source on 2026-11-10 (journal,
// volume, pages; DOI only where an index such as PubMed, Crossref-based Scilit
// or the publisher showed it). Where no DOI could be confirmed the link is a
// Google Scholar search for the exact title, never a guessed DOI.
//
// The map's nodes point here by `id` (`Nodo.estudio`), so an id is a contract:
// rename one and the node that points at it loses its «Ver estudio» link.

export type TipoEstudio = 'grinberg' | 'posterior';

export interface Estudio {
  id: string;
  tipo: TipoEstudio;
  anio: number;
  autores: string;
  titulo: string;
  publicacion: string;
  /** Qué se hizo, en castellano llano. */
  queHizo: string;
  /** Qué se encontró (o qué se afirmó). */
  queEncontro: string;
  enlace?: { url: string; texto: string };
}

const scholar = (titulo: string) => `https://scholar.google.com/scholar?q=${encodeURIComponent(`"${titulo}"`)}`;

export const ESTUDIOS: Estudio[] = [
  // ── Jacobo Grinberg y su laboratorio ─────────────────────────────────────
  {
    id: 'sintergica-1981', tipo: 'grinberg', anio: 1981,
    autores: 'Grinberg-Zylberbaum, J.',
    titulo: 'The transformation of neuronal activity into conscious experience: the syntergic theory',
    publicacion: 'Journal of Social and Biological Structures, 4, 201–210',
    queHizo: 'Primera exposición de la teoría sintérgica en una revista científica internacional.',
    queEncontro: 'Propone que el cerebro crea un campo (el campo neuronal) que interactúa con la estructura energética del espacio, la «lattice», y que la experiencia consciente surge de esa interacción.',
    enlace: { url: scholar('The transformation of neuronal activity into conscious experience'), texto: 'Buscar el artículo' },
  },
  {
    id: 'comunicacion-1982', tipo: 'grinberg', anio: 1982,
    autores: 'Grinberg-Zylberbaum, J.',
    titulo: 'Psychophysiological correlates of communication, gravitation and unity: the syntergic theory',
    publicacion: 'Psychoenergetics, vol. 4',
    queHizo: 'Desarrolla la teoría: el campo neuronal sale del cráneo, cambia el contenido de información del espacio que lo rodea y puede afectar a otros campos neuronales.',
    queEncontro: 'Plantea que un cerebro de alta sintergia experimenta unidad y uno de baja sintergia experimenta la realidad desde el «yo» personal. Una copia se conserva en el archivo desclasificado de la CIA (colección STARGATE).',
    enlace: { url: 'https://www.cia.gov/readingroom/search/site/Grinberg-Zylberbaum', texto: 'Archivo desclasificado de la CIA' },
  },
  {
    id: 'extraocular-1983', tipo: 'grinberg', anio: 1983,
    autores: 'Grinberg-Zylberbaum, J.',
    titulo: 'Extraocular vision',
    publicacion: 'Psychoenergetics, 5, 141–158',
    queHizo: 'Trabajó con niños con los ojos vendados. Tras una meditación guiada, intentaban reconocer imágenes impresas recorriéndolas con los dedos.',
    queEncontro: 'Grinberg informó de que, en algunos casos, el detalle y la precisión de lo que describían se parecían a los de la visión normal con los ojos.',
    enlace: { url: scholar('Extraocular vision Grinberg-Zylberbaum'), texto: 'Buscar el artículo' },
  },
  {
    id: 'interhemisferica-1987', tipo: 'grinberg', anio: 1987,
    autores: 'Grinberg-Zylberbaum, J. y Ramos, J.',
    titulo: 'Patterns of interhemispheric correlation during human communication',
    publicacion: 'International Journal of Neuroscience, 36 (1–2), 41–53',
    queHizo: 'Registró con electroencefalograma cómo se correlaciona la actividad de los dos hemisferios cerebrales de cada persona, primero sin comunicación y después mientras dos personas intentaban comunicarse de forma directa, sin hablar, sin mirarse y sin tocarse.',
    queEncontro: 'Durante la comunicación, los patrones de los dos cerebros se volvieron parecidos, y no en las sesiones de control. Según el equipo, no se explicaba por cansancio ni por costumbre, y quien tenía más coherencia «arrastraba» al otro hacia su propio nivel.',
    enlace: { url: 'https://doi.org/10.3109/00207458709002138', texto: 'DOI del artículo' },
  },
  {
    id: 'subtle-1992', tipo: 'grinberg', anio: 1992,
    autores: 'Grinberg-Zylberbaum, J., Delaflor, M., Sánchez Arellano, M. E., Guevara, M. A. y Pérez, M.',
    titulo: 'Human communication and the electrophysiological activity of the brain',
    publicacion: 'Subtle Energies, 3 (3), 25–43',
    queHizo: 'Tres experimentos con parejas que primero se comunicaban en silencio unos 20 minutos y luego se separaban en dos cámaras aisladas de ruido y de campos electromagnéticos. A una persona se le daban destellos de luz (y sonidos) al azar; la otra no recibía nada.',
    queEncontro: 'En el cerebro de la persona no estimulada apareció un «potencial transferido» parecido a la respuesta de la estimulada: en el segundo experimento, en 8 de 14 personas. No apareció en parejas que no se habían comunicado antes. Los autores lo vieron como apoyo al «hipercampo» de la teoría sintérgica.',
    enlace: { url: 'https://seemj.journals.publicknowledgeproject.org/index.php/seemj/article/download/154/119/245', texto: 'Leer el artículo (PDF)' },
  },
  {
    id: 'epr-1994', tipo: 'grinberg', anio: 1994,
    autores: 'Grinberg-Zylberbaum, J., Delaflor, M., Attie, L. y Goswami, A.',
    titulo: 'The Einstein-Podolsky-Rosen paradox in the brain: the transferred potential',
    publicacion: 'Physics Essays, 7 (4), 422–428',
    queHizo: 'Siete parejas meditaron juntas 20 minutos y después cada persona entró en una jaula de Faraday distinta, a más de 14 metros. A una se le aplicaron destellos de luz al azar mientras se registraba el electroencefalograma de las dos.',
    queEncontro: 'En aproximadamente una de cada cuatro sesiones, el cerebro de la persona no estimulada mostró actividad parecida a la de su pareja. No ocurrió con parejas sin interacción previa ni cuando no había destellos. Lo compararon con el entrelazamiento cuántico (la paradoja EPR); el físico Amit Goswami firmó el artículo.',
    enlace: { url: scholar('The Einstein-Podolsky-Rosen paradox in the brain: the transferred potential'), texto: 'Buscar el artículo' },
  },
  {
    id: 'mente-1997', tipo: 'grinberg', anio: 1997,
    autores: 'Grinberg-Zylberbaum, J.',
    titulo: 'Ideas about a new psychophysiology of consciousness: the syntergic theory',
    publicacion: 'The Journal of Mind and Behavior, 18 (4), 443–458',
    queHizo: 'Publicado tres años después de su desaparición: resume la teoría sintérgica para la psicología y la neurociencia.',
    queEncontro: 'Reúne en un solo marco el campo neuronal, la lattice, la sintergia y los niveles de experiencia.',
    enlace: { url: scholar('Ideas about a new psychophysiology of consciousness: the syntergic theory'), texto: 'Buscar el artículo' },
  },

  // ── Lo que vino después: réplicas y críticas ────────────────────────────
  {
    id: 'wackermann-2003', tipo: 'posterior', anio: 2003,
    autores: 'Wackermann, J., Seiter, C., Keibel, H. y Walach, H.',
    titulo: 'Correlations between brain electrical activities of two spatially separated human subjects',
    publicacion: 'Neuroscience Letters, 336 (1), 60–64',
    queHizo: 'Repitió la idea en Alemania con parejas en dos salas blindadas: una veía estímulos visuales y la otra descansaba.',
    queEncontro: 'Encontraron desviaciones significativas en la mayoría de las personas no estimuladas, aunque no una copia de la onda del otro, y escribieron que no se conoce ningún mecanismo biofísico que lo explique. El artículo recibió un comentario crítico sobre el método (Kalitzin y Suffczynski, Neuroscience Letters 350, 2003).',
    enlace: { url: 'https://doi.org/10.1016/S0304-3940(02)01248-X', texto: 'DOI del artículo' },
  },
  {
    id: 'standish-2004', tipo: 'posterior', anio: 2004,
    autores: 'Standish, L. J., Kozak, L., Johnson, L. C. y Richards, T.',
    titulo: 'Electroencephalographic evidence of correlated event-related signals between the brains of spatially and sensory isolated human subjects',
    publicacion: 'Journal of Alternative and Complementary Medicine, 10 (2), 307–314',
    queHizo: 'Registró el EEG de 30 parejas en salas separadas por 10 metros.',
    queEncontro: 'Se detectaron señales correlacionadas en una pequeña parte de las personas, y al repetir la prueba con cuatro parejas, una volvió a mostrar el efecto.',
    enlace: { url: 'https://doi.org/10.1089/107555304323062293', texto: 'DOI del artículo' },
  },
  {
    id: 'radin-2004', tipo: 'posterior', anio: 2004,
    autores: 'Radin, D. I.',
    titulo: 'Event-related electroencephalographic correlations between isolated human subjects',
    publicacion: 'Journal of Alternative and Complementary Medicine, 10 (2), 315–323',
    queHizo: '13 parejas (amigos, y madres e hijas): una persona recibía estímulos y la otra estaba aislada en otra sala.',
    queEncontro: 'Tres de las 13 parejas mostraron correlaciones significativas por sí solas, y cuanto más fuerte era la respuesta de la persona estimulada, mayor era la de la aislada.',
    enlace: { url: 'https://pubmed.ncbi.nlm.nih.gov/15165412/', texto: 'Ficha en PubMed' },
  },
  {
    id: 'richards-2005', tipo: 'posterior', anio: 2005,
    autores: 'Richards, T. L., Kozak, L., Johnson, L. C. y Standish, L. J.',
    titulo: 'Replicable functional magnetic resonance imaging evidence of correlated brain signals between physically and sensory isolated subjects',
    publicacion: 'Journal of Alternative and Complementary Medicine, 11 (6), 955–963',
    queHizo: 'Usó resonancia magnética funcional: la persona no estimulada estaba dentro del escáner, con gafas que la aislaban de la luz.',
    queEncontro: 'Observaron cambios en zonas visuales del cerebro (áreas 18 y 19) de la persona no estimulada cuando su pareja veía los estímulos.',
    enlace: { url: scholar('Replicable functional magnetic resonance imaging evidence of correlated brain signals between physically and sensory isolated subjects'), texto: 'Buscar el artículo' },
  },
  {
    id: 'ambach-2008', tipo: 'posterior', anio: 2008,
    autores: 'Ambach, W.',
    titulo: 'Correlations between the EEGs of two spatially separated subjects – a replication study',
    publicacion: 'European Journal of Parapsychology, 23 (2), 131–146',
    queHizo: 'Repitió el diseño de Wackermann con salas blindadas separadas 8 metros.',
    queEncontro: 'No confirmó el efecto, y advirtió de que algunas formas de analizar los datos pueden producir correlaciones aparentes que en realidad no existen. Antes, otra réplica (Sabell, Clarke y Fenwick, 2001) tampoco lo había confirmado.',
    enlace: { url: scholar('Correlations between the EEGs of two spatially separated subjects a replication study'), texto: 'Buscar el artículo' },
  },
  {
    id: 'kittenis-2008', tipo: 'posterior', anio: 2008,
    autores: 'Kittenis, M. D.',
    titulo: 'Event-related EEG correlations between physically isolated participants',
    publicacion: 'Tesis doctoral, Universidad de Edimburgo',
    queHizo: 'Tres experimentos con el mismo método, comparando parejas que se conocían bien, parejas de desconocidos y personas solas.',
    queEncontro: 'Los dos primeros mostraron efectos en parejas que se conocían y no en desconocidos, pero el tercero no los repitió, así que el autor concluyó que el resultado global no es concluyente.',
    enlace: { url: 'https://era.ed.ac.uk/handle/1842/29200', texto: 'Leer la tesis' },
  },
];

export const ESTUDIOS_POR_ID: Record<string, Estudio> = Object.fromEntries(ESTUDIOS.map(e => [e.id, e]));

/** Libros de Grinberg citados en la página (sin enlace: son libros). */
export const LIBROS: { anio: number; titulo: string; editorial: string }[] = [
  { anio: 1979, titulo: 'El cerebro consciente (Psicofisiología de la conciencia 2)', editorial: 'Trillas' },
  { anio: 1980, titulo: 'Pachita. Las manifestaciones del ser', editorial: 'Editores Asociados' },
  { anio: 1981, titulo: 'El espacio y la conciencia', editorial: 'Trillas' },
  { anio: 1990, titulo: 'Los chamanes de México, vol. V: El cerebro y los chamanes', editorial: 'INPEC / Facultad de Psicología, UNAM' },
  { anio: 1991, titulo: 'La teoría sintérgica', editorial: 'INPEC' },
];
