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
  | 'canal' | 'nota' | 'titulo' | 'estudio';

export type Icono =
  | 'ninguno' | 'sol' | 'luna' | 'loto' | 'ojo' | 'ojoCerrado' | 'cerebro' | 'red'
  | 'ondas' | 'chispas' | 'mano' | 'oido' | 'voz' | 'olfato' | 'persona' | 'libro'
  | 'orbita' | 'radar' | 'telescopio' | 'infinito' | 'corazon' | 'estrella' | 'atomo' | 'rayo';

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
  /** Solo para «campo»: dónde va el nombre y hacia dónde mira la cabeza. */
  etiquetaPos?: PosEtiqueta;
  espejo?: boolean;
  /** Id de un estudio de `concienciaEstudios.ts`. Nunca una URL libre. */
  estudio?: string;
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
  version: 1;
  nodos: Nodo[];
  flechas: Flecha[];
}

export const LIENZO = { ancho: 1600, alto: 1560 } as const;

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

export const MAPA_POR_DEFECTO: MapaConciencia = {
  version: 1,
  nodos: [
    // ── I · UN SER HUMANO Y LA MATRIZ ───────────────────────────────────────
    { id: 'titulo-1', x: 330, y: 52, forma: 'titulo', titulo: 'I · Un ser humano y la matriz', color: PLATA },
    {
      id: 'campo', x: 800, y: 178, forma: 'campo', icono: 'cerebro', color: ROSA, etiquetaPos: 'derecha',
      titulo: 'Ser humano', subtitulo: 'su campo mental (Grinberg: «campo neuronal»)',
      explicacion: 'Según la teoría sintérgica, la actividad de miles de millones de neuronas forma un campo de energía que no se queda dentro del cráneo: se expande e interactúa con la matriz fundamental del universo. Grinberg lo llamó campo neuronal. De esa interacción nace la experiencia: lo que vemos, oímos y sentimos.',
    },
    {
      id: 'sintergia', x: 1345, y: 150, forma: 'nota', color: PLATA,
      titulo: '¿Qué es la sintergia?',
      explicacion: 'Palabra inventada por Grinberg: síntesis + energía. Mide cuánta coherencia y unidad tiene un campo. Con poca sintergia vemos el mundo fragmentado, desde el «yo»; con mucha, la percepción se vuelve directa y unitaria.',
    },
    {
      id: 'vigilia', x: 300, y: 392, forma: 'estado', icono: 'sol', color: ORO,
      titulo: 'Vigilia', subtitulo: '(estar despierto)',
      explicacion: 'Primera forma de interactuar con la matriz. Despiertos, el campo mental toca la matriz a través de los cinco sentidos: el cerebro decodifica esa información y construye el mundo de objetos, formas, colores y sonidos que llamamos realidad.',
    },
    {
      id: 'meditacion', x: 800, y: 392, forma: 'estado', icono: 'loto', color: VIOLETA,
      titulo: 'Meditación', subtitulo: '(entre la vigilia y el sueño)',
      explicacion: 'El tercer estado, a medio camino entre estar despierto y dormir. El cuerpo descansa como en el sueño, pero la atención sigue despierta. El campo mental se vuelve más coherente y se puede acceder de forma consciente a información de la matriz. Tiene niveles de profundidad.',
    },
    {
      id: 'onirico', x: 1300, y: 392, forma: 'estado', icono: 'luna', color: AZUL,
      titulo: 'Estado onírico', subtitulo: '(estado de sueño)',
      explicacion: 'Segunda forma de interactuar con la matriz. Al dormir, los sentidos se apagan pero el campo mental sigue en contacto con la matriz, sin dirección consciente: la información aparece como imágenes, símbolos y sueños.',
    },
    {
      id: 'nivel-1', x: 800, y: 518, forma: 'nivel', color: VIOLETA,
      titulo: 'Nivel 1 · Calma y coherencia',
      explicacion: 'La atención se aquieta, el ruido mental baja y los dos hemisferios del cerebro empiezan a trabajar sincronizados (Grinberg midió esta coherencia con el electroencefalograma).',
    },
    {
      id: 'nivel-2', x: 800, y: 600, forma: 'nivel', color: VIOLETA,
      titulo: 'Nivel 2 · Percepción sutil',
      explicacion: 'Con los ojos cerrados aparecen luces, imágenes y sensaciones que no llegan por los sentidos. Se empieza a percibir la energía y la información de lo que nos rodea.',
    },
    {
      id: 'nivel-3', x: 800, y: 682, forma: 'nivel', color: VIOLETA,
      titulo: 'Nivel 3 · Alta sintergia',
      explicacion: 'El campo mental es muy coherente y se parece cada vez más a la estructura de la propia matriz. Según Grinberg, en este nivel la percepción deja de depender de los sentidos y se vuelve directa.',
    },
    {
      id: 'extraocular', x: 530, y: 642, forma: 'capacidad', icono: 'ojo', color: LUZ, estudio: 'extraocular-1983',
      titulo: 'Visión extraocular',
      explicacion: 'Percibir imágenes, colores o letras sin usar los ojos. Grinberg trabajó con niños con los ojos vendados que, tras una meditación guiada, intentaban reconocer imágenes impresas pasando los dedos por encima.',
    },
    {
      id: 'remota', x: 530, y: 740, forma: 'capacidad', icono: 'telescopio', color: LUZ,
      titulo: 'Visión remota',
      explicacion: 'Percibir lugares, objetos o escenas lejanas sin estar allí, accediendo a su información a través de la matriz.',
    },
    {
      id: 'telepatia', x: 1075, y: 692, forma: 'capacidad', icono: 'ondas', color: LUZ, estudio: 'epr-1994',
      titulo: 'Telepatía',
      explicacion: 'Comunicación directa entre dos campos mentales, sin pasar por los sentidos. Es lo que Grinberg intentó medir con parejas aisladas en cámaras separadas (ver la parte II del mapa).',
    },
    {
      id: 'estudio-1987', x: 1075, y: 560, forma: 'estudio', icono: 'libro', color: PLATA, estudio: 'interhemisferica-1987',
      titulo: 'Coherencia entre hemisferios (1987)',
    },
    {
      id: 'matriz', x: 800, y: 925, forma: 'matriz', icono: 'red', color: TURQUESA,
      titulo: 'Matriz fundamental del universo', subtitulo: '(Grinberg la llama «lattice»)',
      explicacion: 'La estructura de fondo del espacio-tiempo. Según Grinberg es una red de información en la que cada punto contiene la información de todo lo demás, como un holograma. No vemos la matriz tal cual: el cerebro la decodifica y la convierte en el mundo que percibimos.',
    },

    // ── II · DOS CAMPOS MENTALES QUE SE COMUNICAN ───────────────────────────
    { id: 'titulo-2', x: 330, y: 1112, forma: 'titulo', titulo: 'II · Dos campos mentales que se comunican', color: PLATA },
    {
      id: 'persona-a', x: 300, y: 1268, forma: 'campo', icono: 'cerebro', color: ROSA, etiquetaPos: 'abajo',
      titulo: 'Persona A', subtitulo: 'su campo mental',
      explicacion: 'Cada persona es un campo mental individual. Puede comunicarse con otra de dos maneras: por los sentidos o a través de la matriz.',
    },
    {
      id: 'persona-b', x: 1300, y: 1268, forma: 'campo', icono: 'cerebro', color: CORAL, etiquetaPos: 'abajo', espejo: true,
      titulo: 'Persona B', subtitulo: 'su campo mental',
      explicacion: 'El otro campo mental. Recibe la información de A por los sentidos y, también, por la matriz.',
    },
    {
      id: 'energetico', x: 800, y: 1238, forma: 'canal', icono: 'chispas', color: CIAN, estudio: 'subtle-1992',
      titulo: 'Canal energético', subtitulo: 'a través de la matriz',
      etiquetas: ['visiones con los ojos cerrados', 'sensaciones sin contacto'],
      explicacion: 'La energía y la información que contiene el campo de una persona llegan a la otra a través de la matriz, sin voz ni contacto. Se perciben como visiones con los ojos cerrados y sensaciones sin contacto físico. Grinberg propuso que, al interactuar, los dos campos forman uno común: el «hipercampo».',
    },
    {
      id: 'sensorial', x: 800, y: 1418, forma: 'canal', icono: 'voz', color: VERDE,
      titulo: 'Canal de los sentidos', subtitulo: 'comunicación física',
      etiquetas: ['voz', 'oído', 'vista', 'tacto', 'olfato'],
      explicacion: 'La forma de comunicarnos que todos conocemos: hablar y escuchar, mirarnos, tocarnos, olernos.',
    },
    {
      id: 'estudio-1994', x: 1330, y: 1508, forma: 'estudio', icono: 'libro', color: PLATA, estudio: 'epr-1994',
      titulo: 'Potencial transferido (1994)',
    },
  ],
  flechas: [
    { id: 'f-campo-vigilia', de: 'campo', a: 'vigilia', estilo: 'continua', direccion: 'ida', color: ORO },
    { id: 'f-campo-meditacion', de: 'campo', a: 'meditacion', estilo: 'continua', direccion: 'ida', color: VIOLETA },
    { id: 'f-campo-onirico', de: 'campo', a: 'onirico', estilo: 'continua', direccion: 'ida', color: AZUL },
    { id: 'f-vigilia-matriz', de: 'vigilia', a: 'matriz', estilo: 'continua', direccion: 'doble', color: ORO, etiqueta: 'por los 5 sentidos' },
    { id: 'f-onirico-matriz', de: 'onirico', a: 'matriz', estilo: 'onda', direccion: 'doble', color: AZUL, etiqueta: 'sueños y símbolos' },
    { id: 'f-med-1', de: 'meditacion', a: 'nivel-1', estilo: 'continua', direccion: 'ida', color: VIOLETA },
    { id: 'f-1-2', de: 'nivel-1', a: 'nivel-2', estilo: 'continua', direccion: 'ida', color: VIOLETA },
    { id: 'f-2-3', de: 'nivel-2', a: 'nivel-3', estilo: 'continua', direccion: 'ida', color: VIOLETA },
    { id: 'f-3-matriz', de: 'nivel-3', a: 'matriz', estilo: 'energia', direccion: 'doble', color: VIOLETA, etiqueta: 'acceso consciente a la información', grosor: 3 },
    { id: 'f-3-extraocular', de: 'nivel-3', a: 'extraocular', estilo: 'discontinua', direccion: 'ida', color: LUZ },
    { id: 'f-3-remota', de: 'nivel-3', a: 'remota', estilo: 'discontinua', direccion: 'ida', color: LUZ },
    { id: 'f-3-telepatia', de: 'nivel-3', a: 'telepatia', estilo: 'discontinua', direccion: 'ida', color: LUZ },
    { id: 'f-1-estudio', de: 'nivel-1', a: 'estudio-1987', estilo: 'puntos', direccion: 'ninguna', color: PLATA },
    { id: 'f-a-energia', de: 'persona-a', a: 'energetico', estilo: 'energia', direccion: 'doble', color: CIAN },
    { id: 'f-energia-b', de: 'energetico', a: 'persona-b', estilo: 'energia', direccion: 'doble', color: CIAN },
    { id: 'f-energia-matriz', de: 'energetico', a: 'matriz', estilo: 'energia', direccion: 'doble', color: TURQUESA, etiqueta: 'energía e información' },
    { id: 'f-a-sentidos', de: 'persona-a', a: 'sensorial', estilo: 'continua', direccion: 'doble', color: VERDE },
    { id: 'f-sentidos-b', de: 'sensorial', a: 'persona-b', estilo: 'continua', direccion: 'doble', color: VERDE },
    { id: 'f-energia-estudio', de: 'energetico', a: 'estudio-1994', estilo: 'puntos', direccion: 'ida', color: PLATA, etiqueta: 'medido en el laboratorio' },
  ],
};

/** ¿Es esto un mapa con la forma correcta? Lo usa la página al cargar lo guardado. */
export function esMapaValido(m: unknown): m is MapaConciencia {
  const x = m as MapaConciencia;
  return !!x && typeof x === 'object' && Array.isArray(x.nodos) && Array.isArray(x.flechas)
    && x.nodos.every(n => n && typeof n.id === 'string' && Number.isFinite(n.x) && Number.isFinite(n.y))
    && x.flechas.every(f => f && typeof f.id === 'string' && typeof f.de === 'string' && typeof f.a === 'string');
}
