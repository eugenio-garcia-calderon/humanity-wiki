// Principios de diseño del Calendario Arte para la Humanidad, tal como los
// expuso Eugenio el 2026-11-04. Son la vara con la que se evalúa cada mes.
// Se pueden editar y ampliar desde la web (se guardan en la hoja 0); esto es
// solo el punto de partida.

export interface Principio {
  id: string;
  titulo: string;
  texto: string;
}

export const PRINCIPIOS_POR_DEFECTO: Principio[] = [
  {
    id: 'conciencia',
    titulo: 'Elevar el nivel de conciencia',
    texto: 'Cada mes trata un tema esencial de la humanidad y cada elemento de la hoja tiene que dejar a la persona con más comprensión y con nuevas herramientas, no solo con información.',
  },
  {
    id: 'pedagogia-diaria',
    titulo: 'Una enseñanza cada día',
    texto: 'Cada día del mes lleva un dato curioso e importante, un consejo práctico o una propuesta para hacer hoy. Tiene que ser verdadero y comprobable: mejor un dato menos espectacular que uno inventado.',
  },
  {
    id: 'frase',
    titulo: 'Una frase que no se olvide',
    texto: 'Bajo el título de cada tema va una frase inspiradora de sentido profundo. No la frase que uno espera: juega con la incoherencia o con la belleza y usa emociones fuertes para hacer reflexionar.',
  },
  {
    id: 'luz-sombra',
    titulo: 'Luz y sombra del tema',
    texto: 'Cada ilustración muestra la parte más luminosa del tema y también la más oscura, densa o difícil de digerir: aquello que como humanidad tenemos que cambiar.',
  },
  {
    id: 'sin-letras',
    titulo: 'La ilustración no lleva letras',
    texto: 'Dentro de la ilustración no hay texto. El título del tema y la frase van encima, fuera del dibujo.',
  },
  {
    id: 'original',
    titulo: 'Arte original y novedoso',
    texto: 'Estilo de muralismo contemporáneo: una figura protagonista surrealista donde la naturaleza se funde con objetos y símbolos humanos, ornamento geométrico y color rico. Inspirado en las referencias, nunca copiado.',
  },
  {
    id: 'sin-sobrecarga',
    titulo: 'Sin sobrecargar',
    texto: 'Un foco claro que se entiende a primera vista y pocos elementos secundarios. La hoja respira: si algo no suma, sobra.',
  },
  {
    id: 'herramienta',
    titulo: 'Una herramienta práctica',
    texto: 'Cada mes incluye un juego, dinámica o herramienta que se puede usar de verdad: productos de temporada, sopa de letras, kit de supervivencia, un reto de siete días…',
  },
  {
    id: 'formato',
    titulo: 'Formato de impresión',
    texto: 'Cada mes son dos hojas A4 apaisadas (un A3 vertical): la primera con el tema, la frase y la ilustración; la segunda con el calendario (75 %) y la herramienta (25 %). Se exporta en alta calidad, solo con el contenido definitivo.',
  },
  {
    id: 'respeto',
    titulo: 'Neutral y respetuoso',
    texto: 'En política, economía y relaciones se educa sin partidismo ni juicios: se dan herramientas para pensar, no conclusiones que adoptar.',
  },
];

export type Evaluacion = 'si' | 'parcial' | 'no';
