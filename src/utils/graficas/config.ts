import type { Unidad } from './formato';

// ============================================================================
// UNA GRÁFICA ES UN JSON (2026-08-23)
// ============================================================================
// La decisión de arquitectura que copia a Our World in Data, y la que de
// verdad importa: una gráfica NO es código, es una configuración. En su
// plataforma una gráfica es una fila de la base de datos validada contra un
// esquema (`grapher-schema.011.json`), y por eso pueden tener miles de
// gráficas mantenidas por gente que no programa.
//
// Aquí igual: esto es lo que se guarda, lo que se comparte por enlace, lo que
// se mete en una página o en el lienzo, y lo que un día editará un formulario
// sin tocar una línea de TypeScript.
//
// `version` está desde el primer día. El día que cambie la forma de esto habrá
// gráficas guardadas con la forma vieja, y sin un número no hay manera de
// saber cuál es cuál sin adivinar.

export type TipoGrafica = 'linea' | 'barras' | 'mapa';
export type Pestaña = 'grafica' | 'mapa' | 'tabla';

export interface OrigenTabla {
  clase: 'tabla';
  /** La tabla de `/api/bd/tablas/:id` de la que salen los datos. */
  tablaId: string;
}

export type Origen = OrigenTabla;

export interface ConfigGrafica {
  version: 1;
  titulo: string;
  subtitulo?: string | null;
  /** De dónde salen los números. */
  origen: Origen;
  /** Qué columna hace cada papel. Se adivina al crear y se puede corregir. */
  papeles: {
    entidad?: string | null;
    tiempo?: string | null;
    valores: string[];
  };
  tipo: TipoGrafica;
  pestañas: Pestaña[];
  unidad?: Unidad;
  /** El tiempo son fechas, no años. */
  porDias?: boolean;
  ejeY?: {
    escala?: 'lineal' | 'log';
    desdeCero?: boolean;
  };
  /** Qué entidades se enseñan al abrir. Vacío = las que más destaquen. */
  entidades?: string[];
  tiempo?: { desde?: number | null; hasta?: number | null };
  transformar?: {
    /** Media móvil de N puntos. */
    mediaMovil?: number | null;
    /** Base 100 en el primer punto. */
    relativo?: boolean;
    /** Dividir por otra columna (per cápita y cualquier otra tasa). */
    dividirPor?: string | null;
    /** Por cuánto se multiplica después de dividir (por 100 000 habitantes…). */
    factor?: number | null;
  };
  nota?: string | null;
  fuente?: string | null;
}

export const CONFIG_VACIA: ConfigGrafica = {
  version: 1,
  titulo: 'Gráfica sin título',
  origen: { clase: 'tabla', tablaId: '' },
  papeles: { valores: [] },
  tipo: 'linea',
  pestañas: ['grafica', 'tabla'],
  ejeY: { escala: 'lineal', desdeCero: false },
};

/**
 * Lo que llega guardado puede ser de una versión vieja, estar a medias o venir
 * de una tabla que ya no tiene esas columnas. Se completa con lo que falte en
 * vez de reventar: una gráfica rota que se puede arreglar en pantalla es mejor
 * que una pantalla en blanco.
 */
export function normalizar(bruto: unknown): ConfigGrafica {
  const c = (bruto || {}) as Partial<ConfigGrafica>;
  return {
    ...CONFIG_VACIA,
    ...c,
    version: 1,
    origen: c.origen?.clase === 'tabla' ? c.origen : CONFIG_VACIA.origen,
    papeles: { valores: [], ...(c.papeles || {}) },
    pestañas: c.pestañas?.length ? c.pestañas : CONFIG_VACIA.pestañas,
    ejeY: { ...CONFIG_VACIA.ejeY, ...(c.ejeY || {}) },
  };
}
