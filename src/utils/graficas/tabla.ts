import { aAlfa2 } from './paises';
import type { Unidad } from './formato';

// ============================================================================
// EL MOTOR DE DATOS DE LAS GRÁFICAS (2026-08-23)
// ============================================================================
// Es el equivalente del `core-table` de Our World in Data, y está aquí por la
// misma razón por la que ellos lo escribieron: una gráfica seria no se dibuja
// desde un array de objetos.
//
// COLUMNAR Y NO POR FILAS. Los datos se guardan por columna. Una gráfica
// pregunta cosas como «el máximo de esta columna», «los años que hay» o «las
// entidades distintas»; sobre filas eso es recorrerlo todo cada vez, y sobre
// columnas es recorrer una.
//
// LAS COLUMNAS TIENEN PAPEL, NO SOLO TIPO. Lo que hace posible el mapa, el
// deslizador del tiempo y comparar países no es que una columna sea «texto» o
// «número», sino que UNA es la entidad, OTRA es el tiempo y las demás son los
// valores. Ese es el modelo entidad × tiempo × variable, y es la decisión de
// diseño de la que cuelga todo lo demás.
//
// SE ADIVINA, PERO SE PUEDE CORREGIR. `adivinarPapeles` acierta casi siempre
// con una tabla normal; lo que decida se le enseña a la persona y se puede
// cambiar. Adivinar y no dejar corregir es peor que no adivinar.

export type Papel = 'entidad' | 'tiempo' | 'valor' | 'ninguno';

export interface Columna {
  id: string;
  nombre: string;
  papel: Papel;
  unidad?: Unidad;
  /** Los valores, en el orden de las filas. `null` es «no hay dato», que NO
   *  es lo mismo que cero y nunca se dibuja como cero. */
  valores: Array<number | string | null>;
}

export interface Tabla {
  columnas: Columna[];
  filas: number;
}

/** Un punto de una serie: cuándo y cuánto. */
export interface Punto { t: number; v: number }

/** Todo lo que hay de UNA entidad para UNA variable. */
export interface Serie {
  /** Cómo se llama en los datos («España»). */
  entidad: string;
  /** Qué variable es (el nombre de la columna). */
  variable: string;
  color?: string;
  puntos: Punto[];
}

// ----------------------------------------------------------------------------
// Construcción
// ----------------------------------------------------------------------------

const aNumero = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  // Se acepta lo que escribe la gente: «1.234,5», «1 234.5», «12 %», «-3”.
  const limpio = String(v).trim()
    .replace(/[%\s ]/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.');
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
};

/** Filas de objetos → tabla columnar. */
export function desdeFilas(
  filas: Array<Record<string, unknown>>,
  columnas: Array<{ id: string; nombre: string; papel?: Papel; unidad?: Unidad }>,
): Tabla {
  return {
    filas: filas.length,
    columnas: columnas.map(c => ({
      id: c.id,
      nombre: c.nombre,
      papel: c.papel ?? 'ninguno',
      unidad: c.unidad,
      valores: filas.map(f => {
        const v = f[c.id];
        return v === undefined || v === '' ? null : (v as number | string);
      }),
    })),
  };
}

export const columna = (t: Tabla, id: string | undefined | null) =>
  (id ? t.columnas.find(c => c.id === id) : undefined);

// ----------------------------------------------------------------------------
// Adivinar qué es cada columna
// ----------------------------------------------------------------------------

const NOMBRES_ENTIDAD = /pa[ií]s|country|entidad|entity|territorio|region|regi[oó]n|estado|provincia|comunidad|municipio|zona|lugar/i;
const NOMBRES_TIEMPO = /a[nñ]o|year|fecha|date|d[ií]a|day|periodo|per[ií]odo|mes|month|tiempo|time/i;

/** Qué proporción de los valores no vacíos cumple algo. */
function proporcion(valores: Array<number | string | null>, cumple: (v: unknown) => boolean): number {
  const llenos = valores.filter(v => v !== null && v !== '');
  if (!llenos.length) return 0;
  return llenos.filter(cumple).length / llenos.length;
}

/**
 * Qué papel tiene cada columna. Manda lo que dicen LOS DATOS por encima del
 * nombre: una columna llamada «año» llena de texto no es el tiempo, y una
 * llamada «zona» llena de países sí es la entidad. El nombre solo desempata.
 */
export function adivinarPapeles(t: Tabla): Tabla {
  const puntuadas = t.columnas.map(c => {
    const esNumero = proporcion(c.valores, v => aNumero(v) !== null);
    const esPais = proporcion(c.valores, v => typeof v === 'string' && aAlfa2(v) !== null);
    // Un año es un entero entre 1500 y 2200. Cualquier otro número no lo es,
    // por muy «año» que se llame la columna.
    const esAnio = proporcion(c.valores, v => {
      const n = aNumero(v);
      return n !== null && Number.isInteger(n) && n >= 1500 && n <= 2200;
    });
    const distintos = new Set(c.valores.filter(v => v !== null)).size;
    return { c, esNumero, esPais, esAnio, distintos };
  });

  // 1) La entidad: la columna con más países reconocidos; si no hay ninguna,
  //    una de texto que se repita (varias filas por entidad es lo normal).
  const candidataEntidad = puntuadas
    .filter(p => p.esPais >= 0.6)
    .sort((a, b) => b.esPais - a.esPais)[0]
    || puntuadas
      .filter(p => p.esNumero < 0.5 && p.distintos > 1 && p.distintos < t.filas)
      .sort((a, b) => Number(NOMBRES_ENTIDAD.test(b.c.nombre)) - Number(NOMBRES_ENTIDAD.test(a.c.nombre)))[0];

  // 2) El tiempo: la que más parece años; si empatan, la que se llame como el
  //    tiempo.
  const candidataTiempo = puntuadas
    .filter(p => p !== candidataEntidad && p.esAnio >= 0.8)
    .sort((a, b) => (b.esAnio - a.esAnio) || (Number(NOMBRES_TIEMPO.test(b.c.nombre)) - Number(NOMBRES_TIEMPO.test(a.c.nombre))))[0];

  for (const p of puntuadas) {
    if (p === candidataEntidad) { p.c.papel = 'entidad'; continue; }
    if (p === candidataTiempo) { p.c.papel = 'tiempo'; continue; }
    p.c.papel = p.esNumero >= 0.8 ? 'valor' : 'ninguno';
  }

  // Una tabla SIN tiempo no es un error: es una foto de un momento, y se
  // dibuja igual (barras, mapa). Lo que no se puede es inventarle un año.
  return t;
}

// ----------------------------------------------------------------------------
// De la tabla a las series que se dibujan
// ----------------------------------------------------------------------------

export interface PeticionSeries {
  entidad?: string | null;
  tiempo?: string | null;
  /** Las columnas de valores que se quieren pintar. */
  valores: string[];
  /** Solo estas entidades (vacío = todas). */
  soloEntidades?: string[];
  desde?: number | null;
  hasta?: number | null;
}

/**
 * Series listas para dibujar, ordenadas por tiempo.
 *
 * Sin columna de entidad, todo es una sola serie por variable. Sin columna de
 * tiempo, el tiempo es el número de fila — que es lo que permite dibujar una
 * tabla suelta sin obligar a nadie a inventarse una columna de años.
 */
export function series(t: Tabla, p: PeticionSeries): Serie[] {
  const colE = columna(t, p.entidad);
  const colT = columna(t, p.tiempo);
  const filtro = p.soloEntidades?.length ? new Set(p.soloEntidades) : null;

  const salida: Serie[] = [];
  for (const idValor of p.valores) {
    const colV = columna(t, idValor);
    if (!colV) continue;
    const porEntidad = new Map<string, Punto[]>();

    for (let i = 0; i < t.filas; i++) {
      const v = aNumero(colV.valores[i]);
      if (v === null) continue;                       // sin dato no se dibuja nada
      const e = colE ? String(colE.valores[i] ?? '') : (colV.nombre || 'Total');
      if (!e) continue;
      if (filtro && !filtro.has(e)) continue;
      const tt = colT ? aNumero(colT.valores[i]) : i;
      if (tt === null) continue;
      if (p.desde != null && tt < p.desde) continue;
      if (p.hasta != null && tt > p.hasta) continue;
      let puntos = porEntidad.get(e);
      if (!puntos) { puntos = []; porEntidad.set(e, puntos); }
      puntos.push({ t: tt, v });
    }

    for (const [entidad, puntos] of porEntidad) {
      puntos.sort((a, b) => a.t - b.t);
      salida.push({ entidad, variable: colV.nombre, puntos });
    }
  }
  return salida;
}

/** Las entidades distintas, en el orden en que aparecen. */
export function entidadesDe(t: Tabla, idEntidad?: string | null): string[] {
  const c = columna(t, idEntidad);
  if (!c) return [];
  const vistas = new Set<string>();
  const orden: string[] = [];
  for (const v of c.valores) {
    const s = v === null ? '' : String(v);
    if (!s || vistas.has(s)) continue;
    vistas.add(s); orden.push(s);
  }
  return orden;
}

/** El primer y el último instante que hay en los datos. */
export function rangoDeTiempo(t: Tabla, idTiempo?: string | null): [number, number] | null {
  const c = columna(t, idTiempo);
  if (!c) return null;
  let min = Infinity, max = -Infinity;
  for (const v of c.valores) {
    const n = aNumero(v);
    if (n === null) continue;
    if (n < min) min = n;
    if (n > max) max = n;
  }
  return Number.isFinite(min) ? [min, max] : null;
}

// ----------------------------------------------------------------------------
// Transformaciones
// ----------------------------------------------------------------------------

/**
 * Media móvil de `ventana` puntos. Suaviza el ruido diario sin inventar datos:
 * los primeros puntos, que no tienen ventana completa, se calculan con lo que
 * hay y NO se rellenan con ceros.
 */
export function mediaMovil(s: Serie, ventana: number): Serie {
  if (ventana < 2) return s;
  const puntos: Punto[] = [];
  for (let i = 0; i < s.puntos.length; i++) {
    const desde = Math.max(0, i - ventana + 1);
    const trozo = s.puntos.slice(desde, i + 1);
    puntos.push({ t: s.puntos[i].t, v: trozo.reduce((a, p) => a + p.v, 0) / trozo.length });
  }
  return { ...s, puntos };
}

/**
 * Relativo al primer punto (base 100). Es la forma honrada de comparar países
 * de tamaños muy distintos: no compara cuánto, compara cuánto ha cambiado.
 */
export function relativoAlPrimero(s: Serie): Serie {
  const base = s.puntos[0]?.v;
  if (!base) return s;                                 // sin base (o base 0) no hay relativo
  return { ...s, puntos: s.puntos.map(p => ({ t: p.t, v: (p.v / base) * 100 })) };
}

/**
 * Dividir una serie por otra, punto a punto: es lo que hace el «per cápita» y
 * cualquier otra tasa. Solo se emiten los instantes que están en LAS DOS: un
 * país con dato de emisiones y sin dato de población no tiene emisiones por
 * persona, y rellenarlo sería inventárselo.
 */
export function dividir(numerador: Serie, denominador: Serie, factor = 1): Serie {
  const den = new Map(denominador.puntos.map(p => [p.t, p.v]));
  const puntos: Punto[] = [];
  for (const p of numerador.puntos) {
    const d = den.get(p.t);
    if (d === undefined || d === 0) continue;
    puntos.push({ t: p.t, v: (p.v / d) * factor });
  }
  return { ...numerador, puntos };
}

/** El valor de cada entidad en un instante (para el mapa y las barras). */
export function corte(series: Serie[], t: number | 'ultimo'): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of series) {
    if (!s.puntos.length) continue;
    if (t === 'ultimo') { m.set(s.entidad, s.puntos[s.puntos.length - 1].v); continue; }
    // El valor exacto de ese instante, sin interpolar: un mapa que interpola
    // enseña un dato que nadie ha medido.
    const p = s.puntos.find(x => x.t === t);
    if (p) m.set(s.entidad, p.v);
  }
  return m;
}

export { aNumero };
