// Tipos del Calendario Arte para la Humanidad. El contenido por defecto está en
// `calendarioArte.ts` (generado desde el borrador de los doce meses); lo que
// alguien edita en la web se guarda en `calendario_arte_meses` y se mezcla
// encima, campo a campo.

export type TipoFranja = 'lista' | 'sopa' | 'pasos' | 'texto';

export interface FranjaMes {
  tipo: TipoFranja;
  titulo: string;
  texto: string;
  items: string[];
}

export interface ContenidoMes {
  mes: number;
  tema: string;
  subtitulo: string;
  lema: string;
  /** Lo que se podría dibujar: guía para quien ilustra, no se imprime si hay imagen. */
  ilustracion_idea: string;
  /** `/uploads/...` o https. Vacío = todavía sin ilustración. */
  imagen?: string;
  /** Los diseños de la casa (2026-11-05), en orden: Diseño 1, 2, 3… Vienen del
   *  código, nunca se guardan: los que pide alguien con «Crear nuevo diseño»
   *  viven en `calendario_arte_disenos` y se añaden detrás al cargar.
   *  La que se imprime sigue siendo `imagen`. */
  disenos?: string[];
  /** Antes del Diseño 3 era el único alternativo. Se conserva por si quedó
   *  guardado en algún mes; ya no se escribe. */
  alternativa?: string;
  /** El diseño favorito (2026-11-05, Eugenio: «que el usuario seleccione, no
   *  el que se va a imprimir, sino cuál es el favorito, con una estrella»).
   *  Es el que se ve al abrir la página. Sin elegir = el Diseño 2. */
  favorito?: string;
  /** Encuadre de la ilustración dentro de su media hoja, en %. */
  imagen_x?: number;
  imagen_y?: number;
  franja: FranjaMes;
  dias: string[];
  /** La iniciativa que recibe parte de lo recaudado este mes. Vacía = por elegir. */
  iniciativa?: { nombre: string; texto: string; web?: string };
  /** «Mi reto personal del mes» (2026-11-09): la pregunta que invita a escribir
   *  un reto propio sobre el tema. Debajo van líneas en blanco para apuntarlo. */
  reto?: string;
  /** A dónde lleva el QR. Por defecto, la ficha «Conocer más» del mes en humanity.wiki. */
  qr_url?: string;
  /** Evaluación del mes contra los principios de diseño. No se imprime. */
  evaluacion?: Record<string, 'si' | 'parcial' | 'no'>;
  evaluacion_nota?: string;
}

/** Qué es cada imagen de la carpeta de un mes. Sin tipo = referencia. */
export type TipoCarpeta = 'ilustracion' | 'boceto' | 'referencia';

export interface Referencia {
  url: string;
  nota?: string;
  tipo?: TipoCarpeta;
}

/** Los textos de la portada (hoja 0, campo `portada`). Vacío = el original. */
export interface PortadaCalendario {
  titulo: string;
  subtitulo: string;
  texto: string;
  recaudacion: string;
  pie: string;
}

export const PORTADA_POR_DEFECTO: PortadaCalendario = {
  titulo: 'Arte para la Humanidad',
  subtitulo: 'Doce temas para mirar el mundo con otros ojos',
  texto: 'Cada mes, una ilustración con la luz y la sombra de un tema que nos atañe a todos, una enseñanza para cada día y una herramienta para ponerla en práctica.',
  recaudacion: 'Parte de lo recaudado con este calendario apoya iniciativas que mejoran cada una de estas áreas de la humanidad.',
  pie: 'Asociación Luz & Humanidad · humanity.wiki',
};
