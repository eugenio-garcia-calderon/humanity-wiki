// The «Fenómenos» tab of the consciousness page (2026-11-12, Eugenio: «añade
// una pestaña donde se expongan los fenómenos que nos hacen creer que tenemos
// esa capacidad de percepción más allá de los sentidos»).
//
// Each phenomenon is told in two voices on purpose: what has been observed and
// how the theory reads it, and — next to it, always visible — what research has
// found so far, including the failed replications. The page argues a position;
// the reader still gets the evidence to judge it. Checked against sources on
// 2026-11-12; two of Eugenio's details were corrected (see 03_DECISIONS.md):
// Stargate lasted about 23 years (1972–1995), not 50, and it used remote-viewing
// protocols with coordinates and relaxation, not hypnosis.
import type { Canal } from './concienciaMapa';

export type IconoFenomeno = 'mirada' | 'extraocular' | 'remota' | 'suenos' | 'ganzfeld' | 'cerebros';

export interface Fenomeno {
  id: string;
  /** Which of the three ways of feeling it shows up in. */
  forma: Canal;
  icono: IconoFenomeno;
  titulo: string;
  /** One line under the title. */
  lema: string;
  /** The exposition: what happens, in plain words. */
  texto: string[];
  /** What science has found so far, the good and the bad. */
  ciencia: string;
  fuentes: { texto: string; url?: string }[];
}

/** The project's position, in Eugenio's words, with the honesty note that goes with it. */
export const INTRO_FENOMENOS = {
  titulo: 'Fenómenos que apuntan más allá de los sentidos',
  postura:
    'Muchas personas viven experiencias que hacen pensar que percibimos más allá de los sentidos físicos tradicionales. Desde este ' +
    'proyecto, siguiendo a Jacobo Grinberg, planteamos que la ciencia todavía no sabe explicarlas porque parte de una simplificación ' +
    'de la conciencia humana: la reduce a lo que entra por los sentidos físicos tradicionales y ocurre dentro del cuerpo, y deja fuera ' +
    'el intercambio de percepción y de conciencia que va más allá de ellos.',
  honestidad:
    'Para que cada cual saque sus conclusiones, junto a cada fenómeno contamos también qué ha encontrado la investigación hasta hoy. ' +
    'Algunos resultados son llamativos; ninguno está aceptado por la ciencia mayoritaria y varios no se han podido repetir.',
};

export const FENOMENOS: Fenomeno[] = [
  {
    id: 'mirada',
    forma: 'vigilia',
    icono: 'mirada',
    titulo: 'Sentir que te miran',
    lema: 'Te giras y tus ojos van justo a quien te observa',
    texto: [
      'Muchos animales, también los seres humanos, notan a veces que alguien los está mirando aunque los mire por la espalda. Se dan la vuelta y dirigen la mirada exactamente al lugar de donde viene la observación.',
      'Ocurre estando despiertos, pero sin pasar por ninguno de los sentidos tradicionales: no se ve, no se oye y no se toca. Para la teoría sintérgica, la atención de quien mira deforma la matriz y el campo neuronal de quien es mirado lo registra.',
    ],
    ciencia:
      'Rupert Sheldrake reunió miles de pruebas informales con resultados positivos. En el laboratorio, un metaanálisis de 15 experimentos que medían la piel de la persona observada encontró un efecto pequeño, con la advertencia de que faltan réplicas independientes (Schmidt y otros, 2004). Wiseman y Schlitz repitieron el mismo experimento en el mismo lugar: el efecto apareció con ella y no con él, y en un estudio conjunto posterior, con cien voluntarios, no apareció con ninguno de los dos. La explicación habitual es que recordamos las veces que nos giramos y alguien miraba, y olvidamos las demás.',
    fuentes: [
      { texto: 'Schmidt, Schneider, Utts y Walach (2004). Distant intentionality and the feeling of being stared at: two meta-analyses. British Journal of Psychology', url: 'https://doi.org/10.1348/000712604773952449' },
      { texto: 'Wiseman y Schlitz (1997). Experimenter effects and the remote detection of staring. Journal of Parapsychology', url: 'https://gwern.net/doc/psychology/parapsychology/2005-wiseman.pdf' },
      { texto: 'Sheldrake (2003). El séptimo sentido: la sensación de ser observado' },
    ],
  },
  {
    id: 'extraocular',
    forma: 'meditacion',
    icono: 'extraocular',
    titulo: 'Visión extraocular',
    lema: 'Ver con los ojos vendados',
    texto: [
      'Jacobo Grinberg estudió en la UNAM a siete niños de entre 5 y 13 años que, tras un periodo de entrenamiento, distinguían con los ojos vendados colores, figuras y formas, e incluso leían textos impresos. Según su trabajo, esa visión seguía las mismas leyes de perspectiva que la de los ojos.',
      'Hoy hay talleres en México y en otros países que la enseñan a niños. Quienes la practican dicen que se aprende mucho mejor antes de la adolescencia, con la mente en calma, como en la meditación.',
    ],
    ciencia:
      'No conocemos réplicas independientes publicadas con controles que descarten mirar por los huecos de la venda, que es la objeción principal. Por eso la ciencia mayoritaria no la reconoce, aunque los casos y las demostraciones siguen apareciendo.',
    fuentes: [
      { texto: 'Grinberg-Zylberbaum (1983). Extraocular vision', url: 'https://scholar.google.com/scholar?q=%22Extraocular%20vision%22%20Grinberg-Zylberbaum' },
      { texto: 'Grinberg-Zylberbaum. Visión extraocular: evidencias experimentales (congreso, UNAM)' },
    ],
  },
  {
    id: 'stargate',
    forma: 'meditacion',
    icono: 'remota',
    titulo: 'Proyecto Stargate: visión remota',
    lema: 'Espías que describían lugares lejanos con la mente',
    texto: [
      'Durante unos 23 años, de 1972 a 1995, la inteligencia de Estados Unidos (la CIA, el Ejército y la Agencia de Inteligencia de Defensa) financió programas de «visión remota»: describir un lugar lejano sin estar allí. Empezaron en el Stanford Research Institute y pasaron por varios nombres (Grill Flame, Center Lane, Sun Streak) hasta llamarse Stargate en 1991.',
      'Una unidad militar en Fort Meade recibía unas coordenadas o un sobre cerrado y, en estado de relajación profunda, describía y dibujaba lo que había allí: entre otros objetivos, instalaciones militares soviéticas. No usaban hipnosis, sino protocolos de relajación y meditación.',
    ],
    ciencia:
      'En 1995 la CIA encargó una evaluación al American Institutes for Research. La estadística Jessica Utts concluyó que en el laboratorio había un efecto real; el psicólogo Ray Hyman no estuvo de acuerdo. La conclusión común fue que ninguna sesión había dado información útil para una operación, y el programa se cerró y se desclasificó. Costó unos 20 millones de dólares.',
    fuentes: [
      { texto: 'Federation of American Scientists. STAR GATE [Controlled Remote Viewing]', url: 'https://irp.fas.org/program/collect/stargate.htm' },
      { texto: 'CIA, sala de lectura. Documentos desclasificados de Grill Flame y Center Lane', url: 'https://www.cia.gov/readingroom/node/333255' },
      { texto: 'Mumford, Rose y Goslin (1995). An evaluation of remote viewing: research and applications. American Institutes for Research' },
    ],
  },
  {
    id: 'suenos',
    forma: 'onirico',
    icono: 'suenos',
    titulo: 'Sueños telepáticos',
    lema: 'Soñar con la imagen que otra persona mira',
    texto: [
      'Entre 1964 y 1978, en el laboratorio del sueño del hospital Maimonides de Nueva York, Montague Ullman y Stanley Krippner pedían a una persona que se concentrara en una imagen elegida al azar mientras otra dormía en otra sala. Al despertarla en mitad del sueño, sus sueños se comparaban con la imagen.',
      'En muchos casos el sueño recogía la imagen de forma sorprendente. Es la forma dormida de comunicarse: el hipercampo une los dos campos cuando los sentidos descansan.',
    ],
    ciencia:
      'La mayoría de los estudios de Maimonides salieron por encima del azar. Un metaanálisis de los experimentos de sueños entre 1966 y 2016 encontró un efecto pequeño pero significativo (Storm y otros, 2017). Los críticos señalan que otros laboratorios no lograron repetirlo, y la ciencia mayoritaria no lo acepta.',
    fuentes: [
      { texto: 'Ullman, Krippner y Vaughan (1973). Dream Telepathy' },
      { texto: 'Psi Encyclopedia. Maimonides Dream Telepathy Research', url: 'https://psi-encyclopedia.spr.ac.uk/articles/maimonides-dream-telepathy-research/' },
      { texto: 'Storm, Sherwood, Roe, Tressoldi, Rock y Di Risio (2017). A meta-analysis of dream-ESP studies, 1966–2016. International Journal of Dream Research', url: 'https://digital.library.adelaide.edu.au/dspace/bitstream/2440/109699/3/hdl_109699.pdf' },
    ],
  },
  {
    id: 'ganzfeld',
    forma: 'meditacion',
    icono: 'ganzfeld',
    titulo: 'Experimentos Ganzfeld',
    lema: 'Con los sentidos en silencio, aparece la imagen del otro',
    texto: [
      'Una persona se relaja con medias pelotas de ping-pong sobre los ojos, una luz roja suave y un ruido blanco en los oídos, para que los sentidos dejen de traer información. En otra sala, alguien mira una imagen elegida al azar y trata de «enviarla».',
      'Después, quien recibía elige entre cuatro imágenes la que cree que era. Por azar acertaría una de cada cuatro (25 %). Con los sentidos apagados, como en la meditación, la percepción directa tendría sitio para aparecer.',
    ],
    ciencia:
      'Los estudios automatizados de Bem y Honorton (1994) acertaron un 32 %. Un metaanálisis de más de 40 años de estudios (1974–2020) encuentra un efecto pequeño que resiste las pruebas de sesgo de publicación (Tressoldi y Storm, 2024). Críticos como Ray Hyman o Milton y Wiseman señalan fallos de método y réplicas que no salieron, y el debate sigue abierto.',
    fuentes: [
      { texto: 'Bem y Honorton (1994). Does psi exist? Replicable evidence for an anomalous process of information transfer. Psychological Bulletin', url: 'https://rainbow.ldeo.columbia.edu/~alexeyk/Papers/BemHonorton1994.pdf' },
      { texto: 'Tressoldi y Storm (2024). Anomalous perception in a Ganzfeld condition: a meta-analysis of more than 40 years investigation. F1000Research', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11134153' },
      { texto: 'Milton y Wiseman (1999). Does psi exist? Lack of replication of an anomalous process of information transfer. Psychological Bulletin' },
    ],
  },
  {
    id: 'cerebros',
    forma: 'meditacion',
    icono: 'cerebros',
    titulo: 'Cerebros que se sincronizan a distancia',
    lema: 'Una luz en un cerebro aparece en el otro',
    texto: [
      'Es el experimento central de Grinberg, el «potencial transferido». Dos personas meditan juntas, se separan en dos salas aisladas del sonido y de las ondas electromagnéticas y a una de ellas se le encienden destellos de luz. En el electroencefalograma de la otra, que no ve nada, aparece una respuesta parecida.',
      'Para la teoría sintérgica, los dos campos neuronales quedaron unidos en la matriz al meditar juntos, y lo que recibe uno lo recibe el otro.',
    ],
    ciencia:
      'Laboratorios de Alemania, Estados Unidos y Escocia lo han intentado repetir. Wackermann y su equipo lo publicaron en Neuroscience Letters en 2003 diciendo que no se conoce ningún mecanismo que lo explique. Otros intentos, como el de Ambach (2008), dieron resultados mixtos, y hay críticos que lo atribuyen a la forma de analizar los datos.',
    fuentes: [
      { texto: 'Grinberg-Zylberbaum y otros (1994). The Einstein-Podolsky-Rosen paradox in the brain: the transferred potential. Physics Essays', url: 'https://scholar.google.com/scholar?q=%22The%20Einstein-Podolsky-Rosen%20paradox%20in%20the%20brain%3A%20the%20transferred%20potential%22' },
      { texto: 'Wackermann, Seiter, Keibel y Walach (2003). Correlations between brain electrical activities of two spatially separated human subjects. Neuroscience Letters', url: 'https://doi.org/10.1016/S0304-3940(02)01248-X' },
      { texto: 'Ambach (2008). Correlations between the EEGs of two spatially separated subjects: a replication study. European Journal of Parapsychology' },
    ],
  },
];
