import type { ComponentType } from 'react';
import type { Bloque, TipoBloqueDatos } from '../../utils/bloques';
import type { OpcionBloque } from '../knowledge/SelectorBloques';

// Lo que necesita quien construye un bloque de datos. Vive aparte del registro
// a propósito: ver «UNA DEFINICIÓN NUNCA IMPORTA DE AQUÍ» en `registro.tsx`.

/** Lo que recibe el componente que pinta el bloque al leer. */
export interface PropsLectura {
  bloque: Bloque;
  /** `bloque.datos`, nunca `undefined`. */
  datos: Record<string, unknown>;
  /** La página en la que está (si se sabe). */
  paginaId?: string;
}

/** Lo que recibe el componente del editor. */
export interface PropsEditor extends PropsLectura {
  /** Falso en una página bloqueada o mientras la IA escribe. */
  editable: boolean;
  /** Mezcla estos campos en `datos` y guarda. */
  cambiarDatos: (cambios: Record<string, unknown>) => void;
}

export interface DefinicionBloque {
  tipo: TipoBloqueDatos;
  /** El nombre en el menú «+» y en la barra «/». */
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** En qué grupo del selector sale. Sin valor, «Datos». */
  grupo?: OpcionBloque['grupo'];
  desc?: string;
  color?: string;
  /** Palabras con las que también se encuentra al buscar. */
  claves?: string;
  Lectura: ComponentType<PropsLectura>;
  /** Sin editor propio, el editor enseña la lectura (sin poder configurarlo). */
  Editor?: ComponentType<PropsEditor>;
  /** Los `datos` con los que nace al insertarlo. */
  datosIniciales?: () => Record<string, unknown>;
  /** `false` lo deja fuera del menú (a medio construir), pero se sigue
   *  pintando donde ya esté. Sin valor, sale. */
  enMenu?: boolean;
}

/** Sólo da el tipo: así la definición se escribe con autocompletado. */
export const definirBloque = (d: DefinicionBloque) => d;
