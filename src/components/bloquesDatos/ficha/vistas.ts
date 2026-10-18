// ============================================================================
// WHAT EACH SHEET BLOCK SHOWS, DECIDED ONCE (2026-10-18, Wikiproducts W1)
// ============================================================================
// Every block of a product sheet is painted twice: by React in the browser
// and as plain HTML on the server (`html.ts`), which is what search engines
// and AI crawlers read (SEO R1). If each side decided on its own which rows
// a table has, which product «wins» a criterion or what an empty recall list
// says, the two would drift and Google would be reading a page nobody sees.
//
// So the decision lives here, pure, and both painters only draw the result.
// A painter never filters, orders or picks: it loops over what it is given.
import type { Columna } from '../../../utils/formatoCelda';
import {
  type Ficha, type FilaFicha, type TablaFicha, type Procedencia,
  columnaPorRol, rolDe, grupoDe, visible, filaActual, tieneValor, textoDe, numeroDe,
  procedenciaDe, esComunidad, ordenable, mejoresEn, ordenarPor, relacionadasPor, relacionConRol,
  fechaRevision, sitioDe, fechaCorta,
} from './modelo';

/** One value as a painter needs it. `paginaId` = it names another row with
 *  its own page (a brand): the painter turns it into a link. */
export type Valor = { texto: string; paginaId?: string | null; procedencia: Procedencia | null; enlace?: string | null };
export type Linea = { columnaId: string; etiqueta: string; valor: Valor };

/** The groups a sheet is split into (`config.grupo` in `esquema-bd.json`). */
export const GRUPOS: Record<string, string> = {
  identidad: 'Identidad',
  tecnico: 'Datos técnicos',
  origen: 'Origen y fabricación',
  garantia: 'Garantía',
  documentos: 'Documentos y enlaces',
  compra: 'Precio',
};

/** Columns no property list ever shows: they have a block of their own (the
 *  offers, the claims, the recalls, the community score) or are bookkeeping. */
const CON_BLOQUE_PROPIO = new Set(['afirmaciones', 'retiradas', 'ofertas', 'retiradas_busqueda', 'retiradas_fecha', 'revisado', 'comision']);
const listable = (c: Columna) =>
  visible(c) && !esComunidad(c) && !CON_BLOQUE_PROPIO.has(rolDe(c) || '') && c.config?.interna !== true && grupoDe(c) !== 'control';

const URL_SOLA = /^https?:\/\/\S+$/;

function valorDe(f: Ficha, fila: FilaFicha | undefined, c: Columna): Valor {
  const procedencia = procedenciaDe(fila, c);
  let texto = textoDe(fila, c);
  let paginaId: string | null = null;
  if (c.tipo === 'relacion') {
    // A relation to one row that has a page (a brand): its name links there.
    const destino = c.config?.tabla_destino ? f.relacionadas[c.config.tabla_destino] : undefined;
    const a = fila?.apuntados?.[c.id] || [];
    if (a.length === 1) paginaId = destino?.filas.find(x => x.id === a[0].id)?.pagina_id || null;
  }
  const enlace = c.tipo === 'url' && URL_SOLA.test(texto) ? texto : null;
  if (enlace) texto = sitioDe(enlace) || texto;
  return { texto, paginaId, procedencia, enlace };
}

/** A value with nothing in it is left out — unless its provenance says the
 *  maker does not publish it: «not published» is information, an empty row
 *  is not. */
function lineaDe(f: Ficha, fila: FilaFicha | undefined, c: Columna): Linea | null {
  const v = valorDe(f, fila, c);
  if (!v.texto && v.procedencia?.naturaleza !== 'no_publicado') return null;
  if (!v.texto) v.texto = 'No publicado';
  return { columnaId: c.id, etiqueta: c.nombre, valor: v };
}

/** Columns chosen by id or by `config.clave`, in the order given. */
function elegidas(t: TablaFicha, lista: unknown): Columna[] | null {
  if (!Array.isArray(lista) || !lista.length) return null;
  const porId = new Map(t.columnas.map(c => [c.id, c]));
  const porClave = new Map(t.columnas.filter(c => c.config?.clave).map(c => [c.config.clave, c]));
  return lista.map(x => porId.get(String(x)) || porClave.get(String(x))).filter((c): c is Columna => !!c);
}

// ── PROPIEDAD ───────────────────────────────────────────────────────────────

export type EstiloPropiedad = 'tabla' | 'lista' | 'cabecera' | 'texto' | 'pie';
export const ESTILOS_PROPIEDAD: Record<EstiloPropiedad, string> = {
  cabecera: 'Cabecera (nombre, marca, foto)',
  texto: 'Un texto (p. ej. el resumen)',
  tabla: 'Tabla de datos',
  lista: 'Lista de datos',
  pie: 'Pie (fecha de revisión y fuentes)',
};

export type VistaPropiedad =
  | { estilo: 'cabecera'; nombre: string; marca: Valor | null; modelo: string; estado: string; imagen: string | null; gtin: string; categoria: string }
  | { estilo: 'texto'; titulo: string; texto: string; procedencia: Procedencia | null }
  | { estilo: 'tabla' | 'lista'; titulo: string; lineas: Linea[] }
  | { estilo: 'pie'; revisado: string | null; fuentes: string[]; editadoEl: string | null };

export function vistaPropiedad(f: Ficha, datos: Record<string, unknown>): VistaPropiedad | null {
  const fila = filaActual(f);
  if (!fila) return null;
  const t = f.tabla;
  const estilo = (String(datos.estilo || 'tabla') as EstiloPropiedad);
  const titulo = String(datos.titulo || '').trim();
  const porRol = (r: Parameters<typeof columnaPorRol>[1]) => columnaPorRol(t, r);

  if (estilo === 'cabecera') {
    const cMarca = porRol('marca');
    const cImg = porRol('imagen');
    const img = cImg ? textoDe(fila, cImg) : '';
    return {
      estilo,
      nombre: fila.titulo,
      marca: cMarca && tieneValor(fila, cMarca) ? valorDe(f, fila, cMarca) : null,
      modelo: porRol('modelo') ? textoDe(fila, porRol('modelo')!) : '',
      estado: porRol('estado') ? textoDe(fila, porRol('estado')!) : '',
      imagen: (URL_SOLA.test(img) || img.startsWith('/') ? img : '') || fila.imagen || null,
      gtin: porRol('gtin') ? textoDe(fila, porRol('gtin')!) : '',
      categoria: t.titulo,
    };
  }

  if (estilo === 'texto') {
    const c = (datos.columna && elegidas(t, [datos.columna])?.[0]) || porRol((String(datos.rol || 'resumen')) as any);
    if (!c || !tieneValor(fila, c)) return null;
    return { estilo, titulo, texto: textoDe(fila, c), procedencia: procedenciaDe(fila, c) };
  }

  if (estilo === 'pie') {
    // Every source quoted anywhere in the row, by site: «anker.com, ocu.org».
    const fuentes = [...new Set(Object.values(fila.procedencia || {}).map(p => sitioDe(p?.fuente)).filter(Boolean))].sort();
    return { estilo, revisado: fechaRevision(f), fuentes, editadoEl: fila.updated_at ? fila.updated_at.slice(0, 10) : null };
  }

  const grupo = String(datos.grupo || '');
  const columnas = elegidas(t, datos.columnas)
    || t.columnas.filter(c => listable(c) && (grupo ? grupoDe(c) === grupo : grupoDe(c) && grupoDe(c) !== 'identidad'));
  const lineas = columnas.map(c => lineaDe(f, fila, c)).filter((x): x is Linea => !!x);
  if (!lineas.length) return null;
  return { estilo: estilo === 'lista' ? 'lista' : 'tabla', titulo: titulo || (grupo && GRUPOS[grupo]) || '', lineas };
}

// ── COMPARADOR ──────────────────────────────────────────────────────────────

export const MAX_COMPARAR = 4;

export type CeldaComparada = { texto: string; mejor: boolean; procedencia: Procedencia | null };
export type VistaComparador = {
  titulo: string;
  productos: Array<{ id: string; nombre: string; paginaId: string | null; imagen: string | null; actual: boolean }>;
  /** One line per attribute, one cell per product, in the same order. */
  lineas: Array<{ columnaId: string; etiqueta: string; grupo: string; sentido: 'mayor' | 'menor' | null; celdas: CeldaComparada[] }>;
  /** Siblings that could be added, for the picker. */
  candidatos: Array<{ id: string; nombre: string }>;
};

/**
 * Which siblings to show next to the current product when nobody chose:
 * the closest in price, then the closest in the first comparable figure.
 * Neutral on purpose — never «the one we earn most from» (plan §2.3), and not
 * «the best rated» either, which would always pit everything against the same
 * product. Rows without the figure go last, by name.
 */
export function porDefecto(t: TablaFicha, actualId: string, n = MAX_COMPARAR - 1): string[] {
  const actual = t.filas.find(x => x.id === actualId);
  const otras = t.filas.filter(x => x.id !== actualId);
  const ref = [columnaPorRol(t, 'precio_min'), ...t.columnas.filter(c => grupoDe(c) === 'tecnico' && ordenable(c))]
    .find(c => c && actual && numeroDe(actual, c) !== null);
  const base = ref && actual ? numeroDe(actual, ref)! : null;
  return otras
    .map(x => ({ x, d: ref && base !== null ? numeroDe(x, ref) : null }))
    .sort((a, b) => {
      if (a.d === null && b.d === null) return a.x.titulo.localeCompare(b.x.titulo, 'es');
      if (a.d === null) return 1;
      if (b.d === null) return -1;
      return Math.abs(a.d - base!) - Math.abs(b.d - base!) || a.x.titulo.localeCompare(b.x.titulo, 'es');
    })
    .slice(0, n)
    .map(o => o.x.id);
}

/** The ids of `?comparar=a,b,c`, cleaned. */
export const idsDeConsulta = (q: string | null | undefined): string[] =>
  String(q || '').split(',').map(s => s.trim()).filter(s => /^[\w-]{1,80}$/.test(s)).slice(0, MAX_COMPARAR);

export function vistaComparador(t: TablaFicha, ids: string[], opciones: { actualId?: string | null; titulo?: string; columnas?: unknown } = {}): VistaComparador | null {
  const porId = new Map(t.filas.map(x => [x.id, x]));
  const orden = [...new Set([...(opciones.actualId ? [opciones.actualId] : []), ...ids])];
  const filas = orden.map(id => porId.get(id)).filter((x): x is FilaFicha => !!x).slice(0, MAX_COMPARAR);
  if (!filas.length) return null;
  const cols = elegidas(t, opciones.columnas)
    || t.columnas.filter(c => (listable(c) && ['tecnico', 'garantia', 'origen', 'compra'].includes(grupoDe(c) || '')) || esComunidad(c));
  // Community scores first (what people think), then the price, then the rest.
  const peso = (c: Columna) => (esComunidad(c) ? 0 : grupoDe(c) === 'compra' ? 1 : grupoDe(c) === 'tecnico' ? 2 : 3);
  const lineas = cols
    .filter(c => filas.some(x => tieneValor(x, c)))
    .sort((a, b) => peso(a) - peso(b))
    .map(c => {
      const mejores = mejoresEn(filas, c);
      return {
        columnaId: c.id, etiqueta: c.nombre, grupo: esComunidad(c) ? 'Valoración de la comunidad' : GRUPOS[grupoDe(c) || ''] || '',
        sentido: ordenable(c) ? (esComunidad(c) ? 'mayor' as const : c.config?.comparar) : null,
        celdas: filas.map(x => ({ texto: textoDe(x, c) || '—', mejor: mejores.has(x.id), procedencia: procedenciaDe(x, c) })),
      };
    });
  const elegidos = new Set(filas.map(x => x.id));
  return {
    titulo: String(opciones.titulo || '').trim(),
    productos: filas.map(x => ({ id: x.id, nombre: x.titulo, paginaId: x.pagina_id, imagen: x.imagen || imagenDe(t, x), actual: x.id === opciones.actualId })),
    lineas,
    candidatos: t.filas.filter(x => !elegidos.has(x.id)).map(x => ({ id: x.id, nombre: x.titulo })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  };
}

function imagenDe(t: TablaFicha, x: FilaFicha): string | null {
  const c = columnaPorRol(t, 'imagen');
  const v = c ? textoDe(x, c) : '';
  return URL_SOLA.test(v) || v.startsWith('/') ? v : null;
}

// ── ALTERNATIVAS: LA MEJOR EN CADA CRITERIO ─────────────────────────────────

export type VistaAlternativas = {
  titulo: string;
  criterios: Array<{
    columnaId: string;
    criterio: string;
    ganador: { id: string; nombre: string; paginaId: string | null; valor: string };
    /** The current product IS the best one in this criterion. */
    esEsta: boolean;
    /** Where the current product stands: «3.º de 12». Null without a value. */
    puesto: { n: number; de: number } | null;
  }>;
};

/**
 * For each criterion with a direction, the best product of the table
 * (plan §3.5: «Nutella wins on taste, X wins on health»). Every ranking goes
 * through `ordenarPor`, which goes through `ordenable`: the commission can
 * never be a criterion, whatever its config says.
 */
export function vistaAlternativas(f: Ficha, datos: Record<string, unknown>): VistaAlternativas | null {
  const t = f.tabla;
  const actual = filaActual(f);
  if (!actual || t.filas.length < 2) return null;
  const cols = (elegidas(t, datos.columnas) || t.columnas.filter(c =>
    esComunidad(c) ? c.config?.criterio !== 'media' : listable(c) && ['tecnico', 'compra', 'garantia'].includes(grupoDe(c) || '')))
    .filter(ordenable);
  const max = Math.max(1, Math.min(12, Number(datos.max) || 8));
  const criterios: VistaAlternativas['criterios'] = [];
  for (const c of cols) {
    const orden = ordenarPor(t.filas, c);
    // A «best» among fewer than two products is not a comparison, and a tie
    // for first between everyone says nothing.
    if (orden.length < 2 || !mejoresEn(t.filas, c).size) continue;
    const g = orden[0];
    const i = orden.findIndex(x => x.id === actual.id);
    criterios.push({
      columnaId: c.id,
      criterio: c.nombre,
      ganador: { id: g.id, nombre: g.titulo, paginaId: g.pagina_id, valor: textoDe(g, c) },
      esEsta: mejoresEn(t.filas, c).has(actual.id),
      puesto: i >= 0 ? { n: i + 1, de: orden.length } : null,
    });
    if (criterios.length >= max) break;
  }
  if (!criterios.length) return null;
  return { titulo: String(datos.titulo || '').trim(), criterios };
}

// ── AFIRMACIONES PUBLICITARIAS ──────────────────────────────────────────────

export type Veredicto = 'cierta' | 'matizable' | 'falsa' | 'sin_pruebas' | 'desconocido';
export const ETIQUETA_VEREDICTO: Record<Veredicto, string> = {
  cierta: 'Cierta', matizable: 'Matizable', falsa: 'Falsa', sin_pruebas: 'Sin pruebas', desconocido: 'Sin revisar',
};

/** «Sin pruebas» → 'sin_pruebas'. Read from the label, so a table typed by
 *  hand works as well as one created by the schema script. */
export function veredictoDe(texto: string): Veredicto {
  const t = texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (t.startsWith('cierta') || t.startsWith('verdadera')) return 'cierta';
  if (t.startsWith('matiz') || t.startsWith('parcial') || t.startsWith('engan')) return 'matizable';
  if (t.startsWith('falsa')) return 'falsa';
  if (t.startsWith('sin prueba') || t.startsWith('no demostr') || t.startsWith('no verific')) return 'sin_pruebas';
  return 'desconocido';
}

export type Afirmacion = {
  texto: string; veredicto: Veredicto; explicacion: string; fuentes: string;
  donde: string | null; fecha: string; paginaId: string | null;
};
export type VistaAfirmaciones = { titulo: string; items: Afirmacion[]; vacia: string | null };

const textoRol = (t: TablaFicha, x: FilaFicha, r: Parameters<typeof columnaPorRol>[1]) => {
  const c = columnaPorRol(t, r);
  return c ? textoDe(x, c) : '';
};

export function vistaAfirmaciones(f: Ficha | null, datos: Record<string, unknown>): VistaAfirmaciones | null {
  const titulo = String(datos.titulo || '').trim();
  if (datos.modo === 'manual' || !f) {
    const items = (Array.isArray(datos.items) ? datos.items : []).map((i: any) => ({
      texto: String(i?.afirmacion || i?.texto || '').trim(),
      veredicto: veredictoDe(String(i?.veredicto || '')),
      explicacion: String(i?.explicacion || ''), fuentes: String(i?.fuentes || ''),
      donde: URL_SOLA.test(String(i?.donde || '')) ? String(i.donde) : null, fecha: '', paginaId: null,
    })).filter(i => i.texto);
    return items.length ? { titulo, items, vacia: null } : null;
  }
  const c = relacionConRol(f, 'afirmaciones', 'veredicto');
  if (!c) return null;
  const rel = relacionadasPor(f, c);
  const items = (rel?.filas || []).map(x => {
    const donde = textoRol(rel!.tabla, x, 'donde');
    const fecha = columnaPorRol(rel!.tabla, 'fecha');
    return {
      texto: x.titulo,
      veredicto: veredictoDe(textoRol(rel!.tabla, x, 'veredicto')),
      explicacion: textoRol(rel!.tabla, x, 'explicacion'),
      fuentes: textoRol(rel!.tabla, x, 'fuentes'),
      donde: URL_SOLA.test(donde) ? donde : null,
      fecha: fecha && tieneValor(x, fecha) ? fechaCorta(String((x.celdas[fecha.id] as any).valor)) : '',
      paginaId: x.pagina_id,
    };
  });
  // Worst first: what a buyer most needs to know is what is false.
  const peso: Record<Veredicto, number> = { falsa: 0, sin_pruebas: 1, matizable: 2, cierta: 3, desconocido: 4 };
  items.sort((a, b) => peso[a.veredicto] - peso[b.veredicto]);
  return { titulo, items, vacia: items.length ? null : 'Todavía no hemos revisado ninguna afirmación publicitaria de este producto.' };
}

// ── RETIRADAS Y ALERTAS ─────────────────────────────────────────────────────

export type Retirada = {
  titulo: string; pais: string; organismo: string; fecha: string; motivo: string;
  referencia: string; enlace: string | null; paginaId: string | null;
};
/**
 * `estado` is what the painters must keep apart (plan §2.6, «say I don't
 * know»): 'hay' recalls listed; 'ninguna' = somebody searched and found none,
 * on a date; 'sin_comprobar' = nobody has looked yet. «No recalls» and «we
 * have not checked» are different sentences, and the second must never read
 * like the first.
 */
export type VistaRetiradas = {
  titulo: string;
  estado: 'hay' | 'ninguna' | 'sin_comprobar';
  items: Retirada[];
  comprobado: string | null;
  busqueda: string;
};

export function vistaRetiradas(f: Ficha | null, datos: Record<string, unknown>): VistaRetiradas | null {
  const titulo = String(datos.titulo || '').trim();
  if (datos.modo === 'manual' || !f) {
    const items = (Array.isArray(datos.items) ? datos.items : []).map((i: any): Retirada => ({
      titulo: String(i?.titulo || '').trim(), pais: String(i?.pais || ''), organismo: String(i?.organismo || ''),
      fecha: fechaCorta(String(i?.fecha || '')) || String(i?.fecha || ''), motivo: String(i?.motivo || ''),
      referencia: String(i?.referencia || ''), enlace: URL_SOLA.test(String(i?.enlace || '')) ? String(i.enlace) : null, paginaId: null,
    })).filter(i => i.titulo);
    const comprobado = fechaCorta(String(datos.comprobado || '')) || null;
    if (!items.length && !comprobado) return { titulo, estado: 'sin_comprobar', items, comprobado: null, busqueda: '' };
    return { titulo, estado: items.length ? 'hay' : 'ninguna', items, comprobado, busqueda: String(datos.busqueda || '') };
  }
  const fila = filaActual(f);
  const c = relacionConRol(f, 'retiradas', 'organismo');
  const rel = c ? relacionadasPor(f, c) : null;
  const items = (rel?.filas || []).map((x): Retirada => {
    const t = rel!.tabla;
    const enlace = textoRol(t, x, 'enlace');
    return {
      titulo: x.titulo, pais: textoRol(t, x, 'pais'), organismo: textoRol(t, x, 'organismo'),
      fecha: textoRol(t, x, 'fecha'), motivo: textoRol(t, x, 'motivo'), referencia: textoRol(t, x, 'referencia'),
      enlace: URL_SOLA.test(enlace) ? enlace : null, paginaId: x.pagina_id,
    };
  });
  const cFecha = columnaPorRol(f.tabla, 'retiradas_fecha');
  const cBusq = columnaPorRol(f.tabla, 'retiradas_busqueda');
  const comprobado = cFecha && tieneValor(fila, cFecha) ? textoDe(fila, cFecha) : null;
  const busqueda = cBusq ? textoDe(fila, cBusq) : '';
  if (!c && !cFecha) return null;
  return { titulo, estado: items.length ? 'hay' : comprobado ? 'ninguna' : 'sin_comprobar', items, comprobado, busqueda };
}

/** The sentence for an empty recall list. Shared so both painters say it the
 *  same way. */
export function fraseSinRetiradas(v: VistaRetiradas): string {
  if (v.estado === 'ninguna') return `No conocemos ninguna retirada ni alerta de seguridad de este producto a fecha ${v.comprobado}.`;
  return 'Todavía no hemos comprobado si este producto tiene retiradas o alertas de seguridad.';
}

/** The sentence under the header of a sheet that is a template preview. */
export const DESCRIPCION_NATURALEZA = 'Junto a cada dato se indica de dónde viene: lo que dice la marca, lo que midió un tercero o lo que calculamos.';
