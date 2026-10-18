// ============================================================================
// THE PRODUCT SHEET'S DATA MODEL (2026-10-18, Wikiproducts W1)
// ============================================================================
// Pure: no React, no database. The blocks of a product sheet (propiedad,
// comparador, alternativas, afirmación, retirada) read the SAME object in the
// browser and on the server, where it is written into the HTML and into the
// JSON-LD that search engines read. One model so that what a person sees and
// what Google is told cannot say two different things.
//
// ── WHAT A ROW IS FOR A SHEET ───────────────────────────────────────────────
// A Wiki Creator database row (`bd_filas`) with its page. A sheet needs the
// whole table — the comparator and «the best per criterion» look at the
// siblings — plus the rows its relation columns point to (brand, offers,
// claims, recalls).
//
// ── COLUMN ROLES ────────────────────────────────────────────────────────────
// Nothing here guesses a column by its name. A column says what it is in its
// config:
//   config.ficha     its role on the sheet: 'marca', 'modelo', 'gtin',
//                    'imagen', 'resumen', 'precio_min', 'precio_max',
//                    'num_ofertas', 'estado', 'revisado', 'comision', … (ROLES)
//   config.grupo     which section it belongs to: 'identidad', 'tecnico',
//                    'origen', 'garantia', 'documentos', 'control'
//   config.comparar  'mayor' | 'menor': which way is better, for the
//                    comparator's highlight and the ranking. Absent = not
//                    comparable (a text, a port list).
//   config.unidad    printed after the number («86,4 Wh»).
//   config.clave     the stable key the loaders use (`capacidad_wh`).
import { formatear, type Celda, type Columna } from '../../../utils/formatoCelda';

export type Naturaleza = 'declarado' | 'medido' | 'calculado' | 'no_publicado';
export const NATURALEZAS: Naturaleza[] = ['declarado', 'medido', 'calculado', 'no_publicado'];

/** Where one cell's value came from (`bd_filas.procedencia`, migration 0153). */
export type Procedencia = {
  fuente?: string | null;
  fecha?: string | null;
  naturaleza?: Naturaleza;
  nota?: string | null;
};

export type Apuntado = { id: string; etiqueta: string; existe?: boolean; clase?: string; extra?: any };

export type FilaFicha = {
  id: string;
  pagina_id: string | null;
  titulo: string;
  celdas: Record<string, Celda>;
  apuntados?: Record<string, Apuntado[]>;
  procedencia?: Record<string, Procedencia>;
  /** The card the gallery uses: cover image of the row's page. */
  imagen?: string | null;
  updated_at?: string | null;
};

export type TablaFicha = {
  id: string;
  titulo: string;
  icono?: string | null;
  config?: any;
  columnas: Columna[];
  columna_titulo: string | null;
  filas: FilaFicha[];
};

export type Ficha = {
  /** The page being shown: the row's page, or the template page itself. */
  pagina_id: string;
  /** True on the template page: the data shown is a sample row's. */
  vista_previa?: boolean;
  fila_id: string;
  tabla: TablaFicha;
  /** The tables the current row's relation columns point to, keyed by table id,
   *  with only the rows it points to. */
  relacionadas: Record<string, TablaFicha>;
};

export const ROLES = [
  'marca', 'modelo', 'gtin', 'imagen', 'resumen', 'estado',
  'precio_min', 'precio_max', 'num_ofertas', 'revisado',
  'afirmaciones', 'retiradas', 'ofertas', 'retiradas_fecha', 'retiradas_busqueda',
  // Inside related tables:
  'veredicto', 'explicacion', 'fuentes', 'fecha', 'donde', 'pais', 'organismo', 'motivo', 'enlace', 'referencia',
  'precio', 'distribuidor', 'comision',
] as const;
export type Rol = typeof ROLES[number];

/**
 * THE COMMISSION NEVER ORDERS ANYTHING. Wikiproducts' ethics code (plan §2.3):
 * a product never goes up because we earn more from it. Every ranking and
 * every «best» in this folder goes through `ordenable`, and a column with one
 * of these roles is never ordenable, whatever its `comparar` says. A test
 * (`scripts/wikiproducts/probar-ficha.ts`) checks it.
 */
export const NUNCA_ORDENA: ReadonlySet<string> = new Set(['comision']);

export const rolDe = (c: Columna | undefined): string | undefined => c?.config?.ficha;
export const grupoDe = (c: Columna | undefined): string | undefined => c?.config?.grupo;
export const columnaPorRol = (t: TablaFicha | undefined, rol: Rol): Columna | undefined =>
  t?.columnas.find(c => rolDe(c) === rol);

/** Shown on a page? `visibilidad: 'nunca'` is the table owner saying no. */
export const visible = (c: Columna) => c.config?.visibilidad !== 'nunca';

export const filaActual = (f: Ficha | null | undefined): FilaFicha | undefined =>
  f?.tabla.filas.find(x => x.id === f.fila_id);

export const tieneValor = (fila: FilaFicha | undefined, c: Columna): boolean => {
  const celda = fila?.celdas?.[c.id];
  if (!celda || celda.estado !== 'ok') return false;
  if (Array.isArray(celda.valor)) return celda.valor.length > 0;
  return celda.valor !== '' && celda.valor !== null;
};

/** The number in a cell, or null. Calculated columns count too. */
export function numeroDe(fila: FilaFicha | undefined, c: Columna): number | null {
  const celda = fila?.celdas?.[c.id];
  if (!celda || celda.estado !== 'ok') return null;
  if (typeof celda.valor === 'number' && Number.isFinite(celda.valor)) return celda.valor;
  if (c.tipo === 'compra' && celda.valor?.precio_centimos != null) return celda.valor.precio_centimos / 100;
  return null;
}

/** How a value reads, with its unit. Empty string = nothing to show. */
export function textoDe(fila: FilaFicha | undefined, c: Columna): string {
  const celda = fila?.celdas?.[c.id];
  if (!celda) return '';
  const t = formatear(celda, c, { apuntados: fila?.apuntados?.[c.id] });
  if (!t) return '';
  const u = c.config?.unidad;
  // A percentage column already prints «%»; a number with unit «%» does not.
  return u && (c.tipo === 'numero' || c.tipo === 'formula' || c.tipo === 'agregado') ? `${t} ${u}` : t;
}

// ── PROVENANCE, AS A SENTENCE ───────────────────────────────────────────────
// The house tone (plan §2.6): manufacturer claims are always attributed.

export const ETIQUETA_NATURALEZA: Record<Naturaleza, string> = {
  declarado: 'Según la marca',
  medido: 'Medido por un tercero',
  calculado: 'Calculado',
  no_publicado: 'El fabricante no lo publica',
};

export const procedenciaDe = (fila: FilaFicha | undefined, c: Columna): Procedencia | null => {
  const p = fila?.procedencia?.[c.id];
  return p && typeof p === 'object' ? p : null;
};

/** The host of a source URL, for a short label («anker.com»). */
export function sitioDe(url: string | null | undefined): string {
  if (!url) return '';
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

/** «2026-10-18» → «18/10/2026». Split, not `new Date`: see `formatoCelda.ts`. */
export const fechaCorta = (iso: string | null | undefined) =>
  iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split('-').reverse().join('/') : '';

// ── COMPARING ───────────────────────────────────────────────────────────────

export const sentidoDe = (c: Columna): 'mayor' | 'menor' | null => {
  if (NUNCA_ORDENA.has(rolDe(c) || '')) return null;
  const s = c.config?.comparar;
  return s === 'mayor' || s === 'menor' ? s : null;
};

/** Can this column rank rows? Only numeric ones with a declared direction,
 *  and never the commission. */
export const ordenable = (c: Columna): boolean => sentidoDe(c) !== null;

/** The ids of the rows holding the best value of `c` among `filas` (ties: all
 *  of them). Empty when fewer than two rows have a value — a «best» of one
 *  is not a comparison. */
export function mejoresEn(filas: FilaFicha[], c: Columna): Set<string> {
  const s = sentidoDe(c);
  if (!s) return new Set();
  const con = filas.map(f => [f.id, numeroDe(f, c)] as const).filter(([, n]) => n !== null) as [string, number][];
  if (con.length < 2) return new Set();
  const mejor = s === 'mayor' ? Math.max(...con.map(x => x[1])) : Math.min(...con.map(x => x[1]));
  if (con.every(([, n]) => n === mejor)) return new Set();
  return new Set(con.filter(([, n]) => n === mejor).map(([id]) => id));
}

/** Rows ordered best-first by `c`; rows without a value are left out. */
export function ordenarPor(filas: FilaFicha[], c: Columna): FilaFicha[] {
  const s = sentidoDe(c);
  if (!s) return [];
  return filas
    .map(f => ({ f, n: numeroDe(f, c) }))
    .filter((x): x is { f: FilaFicha; n: number } => x.n !== null)
    .sort((a, b) => (s === 'mayor' ? b.n - a.n : a.n - b.n) || a.f.titulo.localeCompare(b.f.titulo, 'es'))
    .map(x => x.f);
}

// ── RELATED ROWS ────────────────────────────────────────────────────────────

/** The rows a relation column of the current row points to, with their table. */
export function relacionadasPor(f: Ficha, c: Columna): { tabla: TablaFicha; filas: FilaFicha[] } | null {
  const destino = c.config?.tabla_destino;
  const tabla = destino ? f.relacionadas[destino] : undefined;
  if (!tabla) return null;
  const ids = (filaActual(f)?.apuntados?.[c.id] || []).map(a => a.id);
  const porId = new Map(tabla.filas.map(x => [x.id, x]));
  return { tabla, filas: ids.map(id => porId.get(id)).filter((x): x is FilaFicha => !!x) };
}

/** The relation column of the current table with a role (`afirmaciones`…),
 *  or the first relation pointing at a table that has a column with `rolDentro`. */
export function relacionConRol(f: Ficha, rol: Rol, rolDentro?: Rol): Columna | undefined {
  const directa = columnaPorRol(f.tabla, rol);
  if (directa) return directa;
  if (!rolDentro) return undefined;
  return f.tabla.columnas.find(c => c.tipo === 'relacion' && !!columnaPorRol(f.relacionadas[c.config?.tabla_destino], rolDentro));
}

// ── R10: THE QUALITY BAR FOR BEING INDEXED ──────────────────────────────────
// A sheet stays `noindex` until it is worth reading (SEO requirements R10):
// a photo, a neutral summary, at least 8 technical values WITH a source, at
// least one offer (or «not sold in Spain» said in its status), and a review
// date. Google punishes thin pages in bulk («scaled content abuse»); this is
// what keeps a thousand empty sheets from dragging the good ones down.

export const MINIMO_DATOS_CON_FUENTE = 8;

export function calidadFicha(f: Ficha): { indexable: boolean; faltan: string[]; datosConFuente: number } {
  const fila = filaActual(f);
  const t = f.tabla;
  const faltan: string[] = [];
  const img = columnaPorRol(t, 'imagen');
  if (!(img && tieneValor(fila, img)) && !fila?.imagen) faltan.push('una foto');
  const res = columnaPorRol(t, 'resumen');
  if (!(res && tieneValor(fila, res))) faltan.push('el resumen');
  const datosConFuente = t.columnas.filter(c => grupoDe(c) === 'tecnico' && tieneValor(fila, c) && !!procedenciaDe(fila, c)?.fuente).length;
  if (datosConFuente < MINIMO_DATOS_CON_FUENTE) faltan.push(`${MINIMO_DATOS_CON_FUENTE - datosConFuente} datos técnicos más con su fuente`);
  const nOf = columnaPorRol(t, 'num_ofertas');
  const ofertas = nOf ? numeroDe(fila, nOf) ?? 0 : 0;
  const estado = columnaPorRol(t, 'estado');
  const noSeVende = estado ? /no se vende/i.test(textoDe(fila, estado)) : false;
  if (!ofertas && !noSeVende) faltan.push('una oferta (o decir «no se vende en España» en el estado)');
  const rev = columnaPorRol(t, 'revisado');
  if (!(rev && tieneValor(fila, rev))) faltan.push('la fecha de revisión');
  return { indexable: faltan.length === 0, faltan, datosConFuente };
}

/** The last day the data was checked: the review date, else the newest
 *  provenance date. Never «today» by default (R11). */
export function fechaRevision(f: Ficha): string | null {
  const fila = filaActual(f);
  const rev = columnaPorRol(f.tabla, 'revisado');
  const celda = rev ? fila?.celdas?.[rev.id] : undefined;
  if (celda?.estado === 'ok' && typeof celda.valor === 'string') return celda.valor.slice(0, 10);
  const fechas = Object.values(fila?.procedencia || {}).map(p => p?.fecha).filter((x): x is string => !!x && /^\d{4}-\d{2}-\d{2}/.test(x));
  return fechas.length ? fechas.sort().at(-1)!.slice(0, 10) : null;
}
