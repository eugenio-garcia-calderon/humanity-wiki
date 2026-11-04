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
  /** Encuadre de la ilustración dentro de su media hoja, en %. */
  imagen_x?: number;
  imagen_y?: number;
  franja: FranjaMes;
  dias: string[];
  /** La iniciativa que recibe parte de lo recaudado este mes. Vacía = por elegir. */
  iniciativa?: { nombre: string; texto: string; web?: string };
  /** A dónde lleva el QR. Por defecto, la ficha «Conocer más» del mes en humanity.wiki. */
  qr_url?: string;
  /** Evaluación del mes contra los principios de diseño. No se imprime. */
  evaluacion?: Record<string, 'si' | 'parcial' | 'no'>;
  evaluacion_nota?: string;
}

export interface Referencia {
  url: string;
  nota?: string;
}
