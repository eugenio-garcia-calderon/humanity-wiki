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

// 'tercero' (2026-10-18): a value taken from someone who is neither the brand
// nor a measurement — a shop relaying the spec sheet, the press, a regulator,
// Wikipedia. Shown as «Según <host>». Before it, those values read «Según la
// marca» with a source that was not the brand (1,041 of them).
export type Naturaleza = 'declarado' | 'medido' | 'calculado' | 'tercero' | 'no_publicado';
export const NATURALEZAS: Naturaleza[] = ['declarado', 'medido', 'calculado', 'tercero', 'no_publicado'];

/** Where one cell's value came from (`bd_filas.procedencia`, migration 0153). */
export type Procedencia = {
  fuente?: string | null;
  fecha?: string | null;
  naturaleza?: Naturaleza;
  nota?: string | null;
  /** The sentence to show, worked out for its column by `procedenciaDe`. */
  etiqueta?: string;
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
  /** The row's shops as the «Dónde comprarlo» block sees them (W5's
   *  `ofertasDeProducto`, its rule for who may read them): only what the
   *  header needs. Absent on a template or when they could not be read. */
  ofertas?: Array<{ precio_centimos: number | null; agotada: boolean; fuera_de_espana?: boolean }>;
};

export const ROLES = [
  'marca', 'modelo', 'gtin', 'imagen', 'credito_imagen', 'subcategoria', 'tamano', 'resumen', 'estado',
  'precio_min', 'precio_max', 'num_ofertas', 'revisado',
  // 2026-10-18: the shops with a confirmed price, out of `num_ofertas`.
  'ofertas_con_precio',
  'afirmaciones', 'retiradas', 'ofertas', 'retiradas_fecha', 'retiradas_busqueda',
  // Inside related tables:
  'veredicto', 'explicacion', 'fuentes', 'fecha', 'donde', 'pais', 'organismo', 'motivo', 'enlace', 'referencia',
  'precio', 'distribuidor', 'comision',
  // 2026-10-18: «price per watt / per kWh», a formula over the lowest shop price.
  'precio_unidad',
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

/** Two roles arrived after the schema was created in production, and a
 *  column's config cannot be changed through the API yet: their loader keys
 *  in `esquema-bd.json` stand in for them. */
const ROL_POR_CLAVE: Record<string, Rol> = {
  foto: 'imagen', foto_licencia: 'credito_imagen', tipo: 'subcategoria',
  // The size a product is compared at: energy for batteries, peak power for panels.
  // Home batteries: the USABLE capacity, the one «Precio por kWh» divides by.
  // With the total, Powerwall 2's card said 14 kWh next to a €/kWh worked out
  // on 13,5 (production check, 2026-10-18); it is also the figure more of
  // them publish (16 of 18, against 10 for the total).
  capacidad_wh: 'tamano', capacidad_util_kwh: 'tamano', potencia_pico_w: 'tamano', potencia_pico_wp: 'tamano',
};
/** The figures a shopper looks at first, by loader key, in the order the
 *  sheet's header shows them (W1, 2026-10-18: «inspired by Amazon's product
 *  pages»). A table takes the ones it has; `config.destacado: true` on any
 *  column adds it. Same reason as `ROL_POR_CLAVE`: production column config
 *  cannot be patched through the API. */
const DESTACADAS_POR_CLAVE = [
  // portable
  'capacidad_mah', 'capacidad_wh', 'potencia_salida_max_w', 'lumenes_max', 'autonomia_h', 'bateria_wh', 'panel_solar_w', 'potencia_pico_w', 'eficiencia_celula_pct',
  // home
  'potencia_pico_wp', 'eficiencia_pct', 'capacidad_util_kwh', 'potencia_continua_kw', 'ciclos_declarados',
  // everyone
  'peso_kg', 'peso_g', 'ip', 'apto_avion', 'garantia_anios', 'garantia_producto_anios',
];
export const MAX_DESTACADAS = 6;
export function columnasDestacadas(t: TablaFicha): Columna[] {
  const marcadas = t.columnas.filter(c => c.config?.destacado === true);
  const porClave = DESTACADAS_POR_CLAVE.map(k => t.columnas.find(c => c.config?.clave === k)).filter((c): c is Columna => !!c);
  return [...new Set([...marcadas, ...porClave])].filter(c => visible(c) && c.config?.interna !== true);
}

export const rolDe = (c: Columna | undefined): string | undefined =>
  c?.config?.ficha || (c?.config?.clave ? ROL_POR_CLAVE[c.config.clave] : undefined);
export const grupoDe = (c: Columna | undefined): string | undefined => c?.config?.grupo;
export const columnaPorRol = (t: TablaFicha | undefined, rol: Rol): Columna | undefined =>
  t?.columnas.find(c => rolDe(c) === rol);

/** Shown on a page? `visibilidad: 'nunca'` is the table owner saying no. */
export const visible = (c: Columna) => c.config?.visibilidad !== 'nunca';

export const filaActual = (f: Ficha | null | undefined): FilaFicha | undefined =>
  f?.tabla.filas.find(x => x.id === f.fila_id);

/** A price per unit of 0 or less is no price at all: it means the product has
 *  no price yet, and a sheet must never call it «la mejor» (evaluator round 2,
 *  2026-10-18: «0 €/kWh MEJOR» on three batteries with no price). */
const sinPrecioUnidad = (celda: any, c: Columna): boolean =>
  rolDe(c) === 'precio_unidad' && !(typeof celda?.valor === 'number' && celda.valor > 0);

export const tieneValor = (fila: FilaFicha | undefined, c: Columna): boolean => {
  const celda = fila?.celdas?.[c.id];
  if (!celda || celda.estado !== 'ok') return false;
  if (sinPrecioUnidad(celda, c)) return false;
  if (Array.isArray(celda.valor)) return celda.valor.length > 0;
  return celda.valor !== '' && celda.valor !== null;
};

/** The number in a cell, or null. Calculated columns count too. */
export function numeroDe(fila: FilaFicha | undefined, c: Columna): number | null {
  const celda = fila?.celdas?.[c.id];
  if (!celda || celda.estado !== 'ok') return null;
  if (sinPrecioUnidad(celda, c)) return null;
  if (typeof celda.valor === 'number' && Number.isFinite(celda.valor)) return celda.valor;
  if (c.tipo === 'compra' && celda.valor?.precio_centimos != null) return celda.valor.precio_centimos / 100;
  return null;
}

/** How a value reads, with its unit. Empty string = nothing to show. */
export function textoDe(fila: FilaFicha | undefined, c: Columna): string {
  const celda = fila?.celdas?.[c.id];
  if (!celda) return '';
  if (celda.estado === 'ok' && sinPrecioUnidad(celda, c)) return '';
  if (esComunidad(c)) {
    if (celda.estado !== 'ok') return '';
    const m = Number((celda as any).media ?? celda.valor);
    const v = Number((celda as any).votos) || 0;
    return Number.isFinite(m) ? `${m.toLocaleString('es-ES', { maximumFractionDigits: 1 })} / 5${v ? ` · ${v} ${v === 1 ? 'voto' : 'votos'}` : ''}` : '';
  }
  const t = formatear(celda, c, { apuntados: fila?.apuntados?.[c.id] });
  if (!t) return '';
  const ut = c.tipo === 'texto' ? c.config?.unidad || UNIDAD_TEXTO_POR_CLAVE[c.config?.clave] : undefined;
  if (ut) return conUnidad(t, ut);
  const u = c.config?.unidad;
  // A percentage column already prints «%»; a number with unit «%» does not.
  if (!u || !(c.tipo === 'numero' || c.tipo === 'formula' || c.tipo === 'agregado')) return t;
  // «1 año», not «1 años» (EcoFlow 220W, 2026-10-18).
  return `${t} ${t === '1' && SINGULAR[u] ? SINGULAR[u] : u}`;
}
const SINGULAR: Record<string, string> = { años: 'año', ciclos: 'ciclo', meses: 'mes', horas: 'hora' };

/** Text columns that hold figures, by loader key: «5400 / 2400 (ensayo)» on a
 *  panel said nothing without its pascals (evaluator round 3). Same reason
 *  as `ROL_POR_CLAVE`: production column config cannot be patched. */
const UNIDAD_TEXTO_POR_CLAVE: Record<string, string> = { carga_mecanica_pa: 'Pa', gama_potencias_wp: 'Wp', gama_capacidades_kwh: 'kWh' };

/** The unit after the figures of each «;» part, before its parenthesis:
 *  «5400 / 2400 Pa (ensayo); 3600 / 1600 Pa (diseño)». A part that already
 *  has words outside its parenthesis is left as it is. */
export function conUnidad(texto: string, unidad: string): string {
  return texto.split(/\s*;\s*/).map(parte => {
    const m = parte.match(/^([^()]*?)\s*(\(.*\))?$/);
    if (!m || !/\d/.test(m[1]) || /\p{L}/u.test(m[1])) return parte;
    return `${m[1]} ${unidad}${m[2] ? ` ${m[2]}` : ''}`;
  }).join('; ');
}

/** A column's name as a sheet shows it: without a trailing «(años)» when the
 *  value already carries that unit — «Garantía (años): 1 años» said it twice. */
export function etiquetaColumna(c: Columna, hermanas?: Columna[]): string {
  const propia = ETIQUETA_POR_CLAVE[c.config?.clave];
  if (propia) return propia;
  const base = sinUnidad(c);
  // Two columns that differ only by unit would both read «Batería» (Goal
  // Zero, production check 2026-10-18): then the unit stays.
  if (base !== c.nombre && hermanas?.some(x => x.id !== c.id && !ETIQUETA_POR_CLAVE[x.config?.clave] && sinUnidad(x) === base)) return c.nombre;
  return base;
}
function sinUnidad(c: Columna): string {
  const u = String(c.config?.unidad || '').trim().toLowerCase();
  const m = c.nombre.match(/^(.*\S)\s*\(([^)]*)\)$/);
  return u && m && m[2].trim().toLowerCase() === u ? m[1] : c.nombre;
}
/** Names that say WHAT is measured where the column name only says the
 *  unit, by loader key (production column names cannot be patched). */
const ETIQUETA_POR_CLAVE: Record<string, string> = { bateria_mah: 'Batería (capacidad)', bateria_wh: 'Batería (energía)' };

// ── PROVENANCE, AS A SENTENCE ───────────────────────────────────────────────
// The house tone (plan §2.6): manufacturer claims are always attributed.

export const ETIQUETA_NATURALEZA: Record<Naturaleza, string> = {
  declarado: 'Según la marca',
  medido: 'Medido por un tercero',
  calculado: 'Calculado',
  tercero: 'Según otra fuente',
  no_publicado: 'El fabricante no lo publica',
};

/** «Not published» depends on WHAT is missing: an absent independent test is
 *  not something the manufacturer fails to publish. A column can say it in
 *  `config.sin_dato`; these are the loader's columns that need it. */
const SIN_DATO_POR_CLAVE: Record<string, string> = {
  pruebas_independientes: 'No hay pruebas independientes publicadas',
  energia_util_medida_wh: 'Nadie ha publicado una medición',
  precio_por_wp_eur: 'Sin precio publicado',
  precio_por_kwh_util_eur: 'Sin precio publicado',
  pais_sede: 'La empresa no lo publica',
  razon_social: 'La empresa no lo publica',
};

/** The provenance as one sentence, with the source's host where it adds
 *  something: «Según la marca · anker.com», «Según pccomponentes.com». */
export function etiquetaProcedencia(p: Procedencia, c?: Columna): string {
  const host = sitioDe(p.fuente);
  if (p.naturaleza === 'tercero') return host ? `Según ${host}` : ETIQUETA_NATURALEZA.tercero;
  if (p.naturaleza === 'no_publicado') {
    const propio = typeof c?.config?.sin_dato === 'string' && c.config.sin_dato.trim() ? c.config.sin_dato.trim() : '';
    const base = propio || (c?.config?.clave && SIN_DATO_POR_CLAVE[c.config.clave]) || ETIQUETA_NATURALEZA.no_publicado;
    return host ? `${base} · ${host}` : base;
  }
  const base = p.naturaleza ? ETIQUETA_NATURALEZA[p.naturaleza] : '';
  return host ? `${base} · ${host}` : base;
}

export const procedenciaDe = (fila: FilaFicha | undefined, c: Columna): Procedencia | null => {
  // A formula that says how it is worked out (`config.explicacion`) is
  // «Calculado» by construction, and «no price yet» when it has nothing:
  // a formula cell has no stored provenance of its own.
  if (c.tipo === 'formula' && typeof c.config?.explicacion === 'string') {
    if (tieneValor(fila, c)) return { naturaleza: 'calculado', nota: c.config.explicacion, etiqueta: ETIQUETA_NATURALEZA.calculado };
    return c.config?.sin_dato ? { naturaleza: 'no_publicado', etiqueta: etiquetaProcedencia({ naturaleza: 'no_publicado' }, c) } : null;
  }
  const p = fila?.procedencia?.[c.id];
  if (!p || typeof p !== 'object') return null;
  // An unknown nature (data newer than this code) shows nothing rather than «undefined».
  if (p.naturaleza && !NATURALEZAS.includes(p.naturaleza)) return null;
  return { ...p, etiqueta: p.naturaleza ? etiquetaProcedencia(p, c) : undefined };
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

/** A community score column (W4, `valoraciones/ESQUEMA.md`): tipo
 *  'comunidad', `config.criterio` = calidad | precio | … | media. Its cell's
 *  `valor` is the adjusted (Bayesian) score, used to ORDER; `media` is the
 *  plain mean, the one SHOWN; `votos` the voter count. Under 3 voters the
 *  cell is empty: «not enough votes yet» is not a number. */
export const esComunidad = (c: Columna | undefined) => c?.tipo === 'comunidad';
export const criterioDe = (c: Columna | undefined): string | undefined => (esComunidad(c) ? c?.config?.criterio : undefined);

export const sentidoDe = (c: Columna): 'mayor' | 'menor' | null => {
  if (NUNCA_ORDENA.has(rolDe(c) || '')) return null;
  if (esComunidad(c)) return 'mayor';
  const s = c.config?.comparar;
  return s === 'mayor' || s === 'menor' ? s : null;
};

/**
 * What a gallery card shows when nobody chose: on a product table, the brand,
 * the figure that says how big it is (or the first comparable technical one),
 * the «from» price and the community score — the four things a reader scans a
 * catalogue for. `null` on any other table, which keeps its first columns.
 */
export function propiedadesTarjeta(columnas: Columna[], tituloId?: string | null): string[] | null {
  const por = (r: Rol) => columnas.find(c => c.id !== tituloId && rolDe(c) === r && c.config?.visibilidad !== 'nunca');
  const marca = por('marca');
  const precio = por('precio_min');
  if (!marca && !precio) return null;
  const cifra = por('tamano') || columnas.find(c => grupoDe(c) === 'tecnico' && sentidoDe(c) && c.config?.visibilidad !== 'nunca');
  const nota = columnas.find(c => criterioDe(c) === 'media');
  return [marca, cifra, precio, por('precio_unidad'), nota].filter((c): c is Columna => !!c).map(c => c.id);
}

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
// a neutral summary, at least 8 technical values WITH a source, at least one
// offer (or «not sold in Spain» said in its status), and a review date.
// Google punishes thin pages in bulk («scaled content abuse»); this is what
// keeps a thousand empty sheets from dragging the good ones down.
//
// A photo is NOT required (2026-10-18). The first catalogue went live with
// no photos at all (the brand photos are still pending) and the rule kept
// every sheet out of Google, rich ones included. A sheet with sourced data
// and offers is not thin; a photo helps it rank, it does not make it worth
// reading. It is still listed in `mejoras` so the editor knows it is missing.

export const MINIMO_DATOS_CON_FUENTE = 8;

export function calidadFicha(f: Ficha): { indexable: boolean; faltan: string[]; mejoras: string[]; datosConFuente: number } {
  const fila = filaActual(f);
  const t = f.tabla;
  const faltan: string[] = [];
  const mejoras: string[] = [];
  const img = columnaPorRol(t, 'imagen');
  if (!(img && tieneValor(fila, img)) && !fila?.imagen) mejoras.push('una foto');
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
  return { indexable: faltan.length === 0, faltan, mejoras, datosConFuente };
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

/**
 * `GET /api/bd/tablas/:id` → a `TablaFicha`. The same conversion on the server
 * (`bd/plantillaFicha.ts`) and in the browser (a comparator pinned to a table).
 * `ocultarInternas` drops `config.interna` columns (working notes) for readers
 * who cannot edit; `soloFilas` keeps only those rows.
 */
export function aTablaFicha(cuerpo: any, opciones: { ocultarInternas?: boolean; soloFilas?: Set<string> } = {}): TablaFicha | null {
  if (!cuerpo?.tabla) return null;
  const columnas: Columna[] = (cuerpo.columnas || []).filter((x: any) => !opciones.ocultarInternas || x.config?.interna !== true);
  const ids = new Set(columnas.map(x => x.id));
  const titulo = (cuerpo.columna_titulo ?? null) as string | null;
  const filas: FilaFicha[] = (cuerpo.filas || [])
    .filter((f: any) => !opciones.soloFilas || opciones.soloFilas.has(f.id))
    .map((f: any) => {
      const celdas: Record<string, Celda> = {};
      for (const [k, v] of Object.entries(f.celdas || {})) if (ids.has(k)) celdas[k] = v as Celda;
      const procedencia: Record<string, Procedencia> = {};
      for (const [k, v] of Object.entries(f.procedencia || {})) if (ids.has(k)) procedencia[k] = v as Procedencia;
      const t = titulo ? f.celdas?.[titulo] : null;
      return {
        id: f.id,
        pagina_id: f.pagina_id || null,
        titulo: String(t?.estado === 'ok' ? t.valor : f.pagina?.titulo || '').trim() || 'Sin título',
        celdas,
        apuntados: f.apuntados || {},
        procedencia,
        imagen: f.pagina?.imagen || null,
        updated_at: f.updated_at ? new Date(f.updated_at).toISOString() : null,
      };
    });
  return {
    id: cuerpo.tabla.id, titulo: cuerpo.tabla.titulo, icono: cuerpo.tabla.icono || null,
    config: { plantilla: cuerpo.tabla.config?.plantilla || null },
    columnas, columna_titulo: titulo, filas,
  };
}
