// ============================================================================
// ESTUDIO SOBRE LA CONCIENCIA DEL SER HUMANO — el mapa por defecto (2026-11-10)
// ============================================================================
// Eugenio: «haz un esquema de cómo funciona la teoría sintergética de Jacobo
// Grinberg … que se puedan modificar los conceptos, las flechas … pinchar y
// arrastrar los objetos de este mapa».
//
// This file is the map as it ships in the code. What people edit on the page
// lives in `conciencia_mapas` (see `src/server/conciencia.ts`); while nobody has
// saved anything, the page shows this one. «Volver al original» comes back here.
//
// Coordinates are in a fixed world of LIENZO.ancho × LIENZO.alto units; the page
// scales that world to the screen. Colours here are DATA, not styling: every node
// and arrow carries the colour someone chose for it, so they cannot be Tailwind
// tokens (see memory/09_TARGET_ARCHITECTURE/02_TECH_DEBT.md).

export type Forma =
  | 'matriz' | 'campo' | 'estado' | 'nivel' | 'capacidad'
  | 'canal' | 'nota' | 'titulo' | 'estudio' | 'franja' | 'consejos';

export type Icono =
  | 'ninguno' | 'sol' | 'luna' | 'loto' | 'ojo' | 'ojoCerrado' | 'cerebro' | 'red'
  | 'ondas' | 'chispas' | 'mano' | 'oido' | 'voz' | 'olfato' | 'persona' | 'libro'
  | 'orbita' | 'radar' | 'telescopio' | 'infinito' | 'corazon' | 'estrella' | 'atomo' | 'rayo' | 'bombilla';

export type EstiloFlecha = 'continua' | 'discontinua' | 'puntos' | 'onda' | 'energia';
export type Direccion = 'ida' | 'vuelta' | 'doble' | 'ninguna';
export type PosEtiqueta = 'abajo' | 'arriba' | 'izquierda' | 'derecha';

export interface Nodo {
  id: string;
  x: number;
  y: number;
  forma: Forma;
  titulo: string;
  subtitulo?: string;
  /** Lo que se lee al pinchar el concepto. */
  explicacion?: string;
  /** Píldoras bajo el título (p. ej. los cinco sentidos). */
  etiquetas?: string[];
  icono?: Icono;
  color: string;
  /** Escala del concepto: 1 = tamaño normal. */
  tam?: number;
  /** Solo «franja» y «matriz»: su ancho y alto propios (antes de `tam`). */
  ancho?: number;
  alto?: number;
  /** «campo»: dónde va el nombre y hacia dónde mira la cabeza. «matriz»: nombre dentro (sin valor) o debajo/encima. */
  etiquetaPos?: PosEtiqueta;
  espejo?: boolean;
  /** Id de un estudio de `concienciaEstudios.ts`. Nunca una URL libre. */
  estudio?: string;
  /** «consejos»: la lista que se abre en una ventana al pinchar el botón plegado. */
  consejos?: string[];
}

export interface Flecha {
  id: string;
  de: string;
  a: string;
  etiqueta?: string;
  estilo: EstiloFlecha;
  direccion: Direccion;
  color: string;
  /** −0.6 … 0.6: cuánto se curva (0 = recta). */
  curva?: number;
  grosor?: number;
}

export interface MapaConciencia {
  /** Layout generation, see ESQUEMA_ACTUAL. */
  version: number;
  nodos: Nodo[];
  flechas: Flecha[];
}

export const LIENZO = { ancho: 1800, alto: 1120 } as const;

/** La paleta que ofrece el editor. Con nombre, para que se elija sin saber de colores. */
export const PALETA: { color: string; nombre: string }[] = [
  { color: '#f5c25b', nombre: 'Oro · vigilia' },
  { color: '#b48cff', nombre: 'Violeta · meditación' },
  { color: '#7b93ff', nombre: 'Azul noche · sueño' },
  { color: '#5ee6d0', nombre: 'Turquesa · matriz' },
  { color: '#ff8fd1', nombre: 'Rosa · campo mental' },
  { color: '#ffb27a', nombre: 'Coral · otra persona' },
  { color: '#9be58f', nombre: 'Verde · sentidos' },
  { color: '#8ef0ff', nombre: 'Cian · energía' },
  { color: '#fff1c9', nombre: 'Luz · capacidades' },
  { color: '#c9d4e8', nombre: 'Plata · notas' },
];

export const FORMAS: { forma: Forma; nombre: string }[] = [
  { forma: 'estado', nombre: 'Estado de conciencia' },
  { forma: 'nivel', nombre: 'Nivel' },
  { forma: 'capacidad', nombre: 'Capacidad' },
  { forma: 'canal', nombre: 'Canal / percepción' },
  { forma: 'campo', nombre: 'Campo mental (persona)' },
  { forma: 'matriz', nombre: 'Matriz' },
  { forma: 'nota', nombre: 'Nota con texto' },
  { forma: 'estudio', nombre: 'Estudio científico' },
  { forma: 'titulo', nombre: 'Título de zona' },
  { forma: 'franja', nombre: 'Franja (fondo de una zona)' },
  { forma: 'consejos', nombre: 'Claves plegadas (se abren en una ventana)' },
];

export const ICONOS: { icono: Icono; nombre: string }[] = [
  { icono: 'ninguno', nombre: 'Sin icono' },
  { icono: 'sol', nombre: 'Sol' },
  { icono: 'luna', nombre: 'Luna' },
  { icono: 'loto', nombre: 'Loto' },
  { icono: 'ojo', nombre: 'Ojo' },
  { icono: 'ojoCerrado', nombre: 'Ojo cerrado' },
  { icono: 'cerebro', nombre: 'Cerebro' },
  { icono: 'red', nombre: 'Red' },
  { icono: 'ondas', nombre: 'Ondas' },
  { icono: 'chispas', nombre: 'Chispas' },
  { icono: 'mano', nombre: 'Tacto' },
  { icono: 'oido', nombre: 'Oído' },
  { icono: 'voz', nombre: 'Voz' },
  { icono: 'olfato', nombre: 'Olfato' },
  { icono: 'persona', nombre: 'Persona' },
  { icono: 'libro', nombre: 'Libro' },
  { icono: 'orbita', nombre: 'Órbita' },
  { icono: 'radar', nombre: 'Radar' },
  { icono: 'telescopio', nombre: 'Telescopio' },
  { icono: 'infinito', nombre: 'Infinito' },
  { icono: 'corazon', nombre: 'Corazón' },
  { icono: 'estrella', nombre: 'Estrella' },
  { icono: 'atomo', nombre: 'Átomo' },
  { icono: 'rayo', nombre: 'Rayo' },
  { icono: 'bombilla', nombre: 'Bombilla' },
];

export const ESTILOS: { estilo: EstiloFlecha; nombre: string }[] = [
  { estilo: 'continua', nombre: 'Continua' },
  { estilo: 'discontinua', nombre: 'Discontinua' },
  { estilo: 'puntos', nombre: 'Puntos' },
  { estilo: 'onda', nombre: 'Onda' },
  { estilo: 'energia', nombre: 'Energía' },
];

const ORO = '#f5c25b', VIOLETA = '#b48cff', AZUL = '#7b93ff', TURQUESA = '#5ee6d0',
  ROSA = '#ff8fd1', CORAL = '#ffb27a', VERDE = '#9be58f', CIAN = '#8ef0ff', LUZ = '#fff1c9', PLATA = '#c9d4e8';

/**
 * The layout generation of the map. 2 = the three-lane layout of 2026-11-10;
 * 3 = the same, with names only on the map and five folded keys per lane
 * (human 1 left, matrix centre, human 2 right). A map saved with an older
 * generation is ignored in favour of this one — it is still in the history.
 */
export const ESQUEMA_ACTUAL = 3;

export const MAPA_POR_DEFECTO: MapaConciencia = {
  version: ESQUEMA_ACTUAL,
  // 2026-11-10 (tarde), Eugenio: «simplifica más los 3 caminos, quita datos».
  // On the map, only names; everything else is in `explicacion` (read by
  // tapping) and in the five keys of each lane (the folded «consejos» chips).
  nodos: [
    // ── The three lanes: three ways two conscious beings interact ─────────
    {
      id: 'franja-vigilia', x: 900, y: 205, forma: 'franja', color: ORO, ancho: 1060, alto: 230,
      titulo: 'Vigilia', subtitulo: 'por los sentidos',
      explicacion: 'Primera forma de interactuar. Despiertos, nos comunicamos por la voz, el oído, la vista, el tacto y el olfato. La información viaja como algo físico —una vibración del aire, la luz, una presión— y cada cerebro la traduce con un código que ha aprendido: su idioma y su cultura.',
    },
    {
      id: 'franja-onirico', x: 900, y: 480, forma: 'franja', color: AZUL, ancho: 1060, alto: 230,
      titulo: 'Sueño', subtitulo: 'por el hipercampo',
      explicacion: 'Segunda forma de interactuar: el estado onírico. Al dormir, los sentidos físicos se apagan y los campos neuronales siguen en contacto con la matriz. Según la teoría sintérgica, dos campos que interactúan forman un campo común, el hipercampo. Lo que llega por ahí no entra por los ojos ni por los oídos: actúan sentidos energéticos que todavía no conocemos.',
    },
    {
      id: 'franja-meditacion', x: 900, y: 800, forma: 'franja', color: VIOLETA, ancho: 1060, alto: 330,
      titulo: 'Meditación', subtitulo: 'por percepción directa',
      explicacion: 'El tercer estado, a medio camino entre estar despierto y dormir: el cuerpo descansa y la atención sigue despierta. El campo neuronal gana coherencia (alta sintergia) y se puede acceder de forma consciente a la información de la matriz: la de otros seres (telepatía), la de objetos cercanos (visión extraocular) y la de lugares lejanos (visión remota).',
    },
    {
      id: 'matriz', x: 900, y: 528, forma: 'matriz', icono: 'red', color: TURQUESA, ancho: 230, alto: 505, etiquetaPos: 'abajo',
      titulo: 'Matriz fundamental del universo', subtitulo: '(«lattice»)',
      explicacion: 'La estructura de fondo del espacio-tiempo; Grinberg la llamó «lattice». Según él es una red de información en la que cada punto contiene la información de todo lo demás, como un holograma. Toda interacción entre seres conscientes pasa por ella: la vibración del aire de una palabra, el hipercampo del sueño y la percepción directa de la meditación.',
    },

    // ── The two conscious beings ─────────────────────────────────────────
    {
      id: 'persona-a', x: 175, y: 520, forma: 'campo', icono: 'cerebro', color: ROSA, etiquetaPos: 'abajo', tam: 1.3,
      titulo: 'Ser humano 1', subtitulo: 'campo neuronal',
      explicacion: 'Cada cerebro genera un campo de energía —Grinberg lo llamó campo neuronal— con la misma forma de malla que la matriz, porque es una distorsión de ella. Ese campo es lo que interactúa con la matriz y, a través de ella, con otros seres. Cuanta más coherencia tiene (más «sintergia», de síntesis + energía), más directa es la percepción.',
    },
    {
      id: 'persona-b', x: 1625, y: 520, forma: 'campo', icono: 'cerebro', color: CORAL, etiquetaPos: 'abajo', espejo: true, tam: 1.3,
      titulo: 'Ser humano 2', subtitulo: 'campo neuronal',
      explicacion: 'El otro ser consciente. Recibe lo que viene del ser humano 1 de tres maneras: por los sentidos (vigilia), por el hipercampo (sueño) y por la percepción directa (meditación).',
    },

    // ── The five keys of each lane: folded, they open in a window ───────
    {
      id: 'claves-vigilia', x: 1290, y: 122, forma: 'consejos', icono: 'bombilla', color: ORO,
      titulo: '5 claves para comunicar mejor',
      consejos: [
        'Usa un código compartido: palabras que el otro entienda. Si dudas, pregúntale qué ha entendido.',
        'Escucha con todo el cuerpo: mira a la persona, deja el móvil y no prepares tu respuesta mientras habla.',
        'Que tu tono y tus gestos digan lo mismo que tus palabras: el cuerpo comunica más que la voz.',
        'Habla de lo que sientes y necesitas («yo siento…, necesito…»), no de lo que el otro hace mal.',
        'Comprueba el sentido: resume lo que has entendido antes de responder («¿quieres decir que…?»).',
      ],
    },
    {
      id: 'claves-onirico', x: 1290, y: 398, forma: 'consejos', icono: 'bombilla', color: AZUL,
      titulo: '5 claves para comunicar mejor',
      consejos: [
        'Antes de dormir, piensa en la persona con la que quieres conectar y en una intención clara.',
        'Llega en calma al sueño: sin pantallas la última hora y con unas respiraciones lentas.',
        'Ten un cuaderno junto a la cama y escribe lo que hayas soñado nada más despertar, antes de moverte.',
        'Fíjate en las imágenes, las emociones y los símbolos, no solo en la historia: ahí suele estar el mensaje.',
        'Compártelo con la otra persona y comparad: así aprendéis a reconocer lo que os llega.',
      ],
    },
    {
      id: 'claves-meditacion', x: 1290, y: 668, forma: 'consejos', icono: 'bombilla', color: VIOLETA,
      titulo: '5 claves para comunicar mejor',
      consejos: [
        'Medita cada día, aunque sean diez minutos: la coherencia del campo se entrena con constancia.',
        'Respira lento y profundo hasta que la mente se aquiete, antes de intentar percibir nada.',
        'Meditad juntos antes de comunicaros: en los experimentos de Grinberg, la conexión aparecía en parejas que antes habían meditado juntas.',
        'Recibe sin juzgar: anota la primera imagen o sensación que llegue, sin interpretarla todavía.',
        'Comprueba con la otra persona lo que has percibido y apunta aciertos y fallos: es la forma honesta de saber si funciona.',
      ],
    },

    // ── Lane 1 · Waking ─────────────────────────────────────────────────
    {
      id: 'codifica', x: 500, y: 228, forma: 'capacidad', icono: 'voz', color: ORO,
      titulo: 'Codifica',
      explicacion: 'El ser humano 1 tiene una idea y la traduce a un código que ha aprendido: las palabras y los gestos de su idioma y de su cultura. Su voz convierte ese código en vibración.',
    },
    {
      id: 'vibra', x: 900, y: 228, forma: 'capacidad', icono: 'ondas', color: ORO,
      titulo: 'El aire vibra',
      explicacion: 'La voz empuja el aire y forma una onda de presión que se propaga a través de la matriz. Es una vibración física: no lleva el significado, solo la forma del sonido.',
    },
    {
      id: 'decodifica', x: 1300, y: 228, forma: 'capacidad', icono: 'oido', color: ORO,
      titulo: 'Decodifica',
      explicacion: 'El oído del ser humano 2 convierte la vibración en impulsos nerviosos. Su campo neuronal los decodifica con el mismo código cultural y lingüístico, y aparece el sentido: entiende lo que el otro quiso decir.',
    },

    // ── Lane 2 · Dreaming ───────────────────────────────────────────────
    {
      id: 'hipercampo', x: 900, y: 492, forma: 'capacidad', icono: 'infinito', color: AZUL, estudio: 'subtle-1992',
      titulo: 'Hipercampo',
      explicacion: 'Grinberg propuso que los campos neuronales individuales se combinan en un campo colectivo: el hipercampo. En el sueño, sin los sentidos físicos, los dos campos se entrelazan en la matriz, y lo que llega del otro lo traen sentidos energéticos que aún no conocemos: se vive como imágenes, emociones y símbolos.',
    },

    // ── Lane 3 · Meditation ─────────────────────────────────────────────
    {
      id: 'coherencia', x: 520, y: 852, forma: 'nivel', color: VIOLETA,
      titulo: 'Campo coherente',
      explicacion: 'Meditando, la mente se aquieta, los dos hemisferios se sincronizan y el campo neuronal se vuelve muy coherente (alta sintergia). Según Grinberg, cuanto más coherente es un campo, más directa es su interacción con la matriz.',
    },
    {
      id: 'telepatia', x: 900, y: 705, forma: 'capacidad', icono: 'ondas', color: LUZ, estudio: 'epr-1994',
      titulo: 'Telepatía',
      explicacion: 'Comunicación directa entre dos seres conscientes, sin voz ni contacto. Es lo que Grinberg intentó medir con parejas que meditaban juntas y después se aislaban en cámaras separadas: el «potencial transferido».',
    },
    {
      id: 'extraocular', x: 900, y: 805, forma: 'capacidad', icono: 'ojo', color: LUZ, estudio: 'extraocular-1983',
      titulo: 'Visión extraocular',
      explicacion: 'Percibir imágenes, colores o letras sin usar los ojos. Grinberg trabajó con niños con los ojos vendados que, tras una meditación guiada, intentaban reconocer imágenes impresas pasando los dedos por encima.',
    },
    {
      id: 'remota', x: 900, y: 905, forma: 'capacidad', icono: 'telescopio', color: LUZ,
      titulo: 'Visión remota',
      explicacion: 'Percibir lugares, objetos o seres lejanos sin estar allí, accediendo a su información a través de la matriz.',
    },
    {
      id: 'objeto-cercano', x: 1270, y: 805, forma: 'nivel', color: PLATA,
      titulo: 'Objeto cercano',
      explicacion: 'Lo que percibe la visión extraocular: algo que está al alcance —una imagen, un color, una letra— sin mirarlo con los ojos.',
    },
    {
      id: 'lugar-lejano', x: 1270, y: 905, forma: 'nivel', color: PLATA,
      titulo: 'Lugar lejano',
      explicacion: 'Lo que percibe la visión remota: otros lugares, objetos y seres, estén donde estén.',
    },
  ],
  flechas: [
    // Waking
    { id: 'f-a-codifica', de: 'persona-a', a: 'codifica', estilo: 'continua', direccion: 'ida', color: ORO },
    { id: 'f-codifica-vibra', de: 'codifica', a: 'vibra', estilo: 'onda', direccion: 'ida', color: ORO },
    { id: 'f-vibra-decodifica', de: 'vibra', a: 'decodifica', estilo: 'onda', direccion: 'ida', color: ORO },
    { id: 'f-decodifica-b', de: 'decodifica', a: 'persona-b', estilo: 'continua', direccion: 'ida', color: ORO },
    // Dreaming
    { id: 'f-a-hipercampo', de: 'persona-a', a: 'hipercampo', estilo: 'energia', direccion: 'doble', color: AZUL },
    { id: 'f-hipercampo-b', de: 'hipercampo', a: 'persona-b', estilo: 'energia', direccion: 'doble', color: AZUL },
    // Meditation
    { id: 'f-a-coherencia', de: 'persona-a', a: 'coherencia', estilo: 'continua', direccion: 'ida', color: VIOLETA },
    { id: 'f-coherencia-telepatia', de: 'coherencia', a: 'telepatia', estilo: 'continua', direccion: 'ida', color: VIOLETA },
    { id: 'f-coherencia-extraocular', de: 'coherencia', a: 'extraocular', estilo: 'continua', direccion: 'ida', color: VIOLETA },
    { id: 'f-coherencia-remota', de: 'coherencia', a: 'remota', estilo: 'continua', direccion: 'ida', color: VIOLETA },
    { id: 'f-telepatia-b', de: 'telepatia', a: 'persona-b', estilo: 'energia', direccion: 'ida', color: VIOLETA },
    { id: 'f-extraocular-objeto', de: 'extraocular', a: 'objeto-cercano', estilo: 'energia', direccion: 'ida', color: LUZ },
    { id: 'f-remota-lugar', de: 'remota', a: 'lugar-lejano', estilo: 'energia', direccion: 'ida', color: LUZ },
  ],
};

// ── The animated walkthroughs («Ver cómo funciona») ──────────────────────────
// The drawing of each step lives in `components/conciencia/Animacion.tsx` and
// finds the concepts by these ids. If someone deletes or renames one of them,
// that step just draws less: the animation never breaks the map.

export type Canal = 'vigilia' | 'onirico' | 'meditacion';

export interface PasoRecorrido { titulo: string; texto: string; resaltar: string[] }

export const RECORRIDOS: Record<Canal, { nombre: string; color: string; pasos: PasoRecorrido[] }> = {
  vigilia: {
    nombre: 'Vigilia: por los sentidos', color: ORO,
    pasos: [
      { titulo: 'Una idea se codifica', resaltar: ['persona-a', 'codifica'],
        texto: 'El ser humano 1 quiere decir algo. Su campo neuronal traduce la idea a palabras de su idioma: un código cultural y lingüístico aprendido.' },
      { titulo: 'La voz hace vibrar el aire', resaltar: ['persona-a', 'codifica', 'vibra'],
        texto: 'Al hablar, empuja el aire. Se forma una onda mecánica —compresiones y expansiones— que viaja a través de la matriz. La onda no lleva el significado, solo la forma del sonido.' },
      { titulo: 'El oído recibe la vibración', resaltar: ['vibra', 'decodifica', 'persona-b'],
        texto: 'La vibración llega al oído del ser humano 2, que la convierte en impulsos nerviosos: de algo físico a algo eléctrico.' },
      { titulo: 'El campo neuronal le da sentido', resaltar: ['decodifica', 'persona-b'],
        texto: 'Su campo neuronal decodifica los impulsos con el mismo código cultural y lingüístico, y aparece el sentido. Si los dos no compartieran el código, la vibración llegaría igual, pero no se entendería.' },
    ],
  },
  onirico: {
    nombre: 'Sueño: por el hipercampo', color: AZUL,
    pasos: [
      { titulo: 'Los sentidos físicos se apagan', resaltar: ['persona-a', 'persona-b'],
        texto: 'Al dormir, los ojos, los oídos y la piel dejan de traer información de fuera. Las dos personas no se ven ni se oyen.' },
      { titulo: 'Los campos neuronales se expanden', resaltar: ['persona-a', 'persona-b', 'franja-onirico'],
        texto: 'Sin el ruido de los sentidos, cada campo neuronal sigue interactuando con la matriz y se extiende más allá del cuerpo.' },
      { titulo: 'Se forma el hipercampo', resaltar: ['persona-a', 'hipercampo', 'persona-b'],
        texto: 'Según Grinberg, los campos neuronales que interactúan se combinan en un campo colectivo, el hipercampo. Las dos mallas se entrelazan en la matriz.' },
      { titulo: 'Llega como imágenes y símbolos', resaltar: ['hipercampo', 'persona-b'],
        texto: 'Lo que llega del otro no entra por los sentidos físicos: actúan sentidos energéticos que todavía no conocemos. Se vive como imágenes, emociones y símbolos del sueño.' },
    ],
  },
  meditacion: {
    nombre: 'Meditación: percepción directa', color: VIOLETA,
    pasos: [
      { titulo: 'El campo se vuelve coherente', resaltar: ['persona-a', 'coherencia'],
        texto: 'Meditando, entre la vigilia y el sueño, la mente se aquieta y la malla del campo neuronal se ordena: alta sintergia.' },
      { titulo: 'Telepatía: con otros seres', resaltar: ['coherencia', 'telepatia', 'persona-b'],
        texto: 'La información pasa de un campo neuronal a otro directamente, a través de la matriz, sin voz ni contacto. El ser humano 2 la recibe como una imagen o una sensación.' },
      { titulo: 'Visión extraocular: con lo cercano', resaltar: ['coherencia', 'extraocular', 'objeto-cercano'],
        texto: 'El campo percibe un objeto cercano —una imagen, un color, una letra— sin usar los ojos.' },
      { titulo: 'Visión remota: con lo lejano', resaltar: ['coherencia', 'remota', 'lugar-lejano'],
        texto: 'El campo accede a la información de lugares, objetos o seres lejanos, estén donde estén.' },
    ],
  },
};

/** ¿Es esto un mapa con la forma correcta? Lo usa la página al cargar lo guardado. */
export function esMapaValido(m: unknown): m is MapaConciencia {
  const x = m as MapaConciencia;
  return !!x && typeof x === 'object' && Array.isArray(x.nodos) && Array.isArray(x.flechas)
    && x.nodos.every(n => n && typeof n.id === 'string' && Number.isFinite(n.x) && Number.isFinite(n.y))
    && x.flechas.every(f => f && typeof f.id === 'string' && typeof f.de === 'string' && typeof f.a === 'string');
}
