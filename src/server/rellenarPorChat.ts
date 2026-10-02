import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { bdInterno } from './bd';
import { tipar, type Tipo } from './bd/tipos';
import { puedeEditarPagina } from './ai/paginaIA';
import { pedirJsonLocal, iaLocalLista, IaLocalNoDisponible, IaLocalOcupada, IaLocalIlegible } from './iaLocal';

// ============================================================================
// RELLENAR BASES DE DATOS HABLANDO, SIN GASTAR IA DE PAGO (2026-10-02)
// ============================================================================
// Eugenio: «diseña unos protocolos y una arquitectura que permita simplificar
// el hecho de añadir información en bases de datos y que simplemente se
// activen instrucciones sin necesidad de que la IA intervenga demasiado; que
// la IA solo intervenga para entender qué se le está pidiendo, pero que ya
// tenga las instrucciones de cómo hacerlo preprogramadas».
//
// ── THE PROTOCOL: RECIPES WITH SLOTS ────────────────────────────────────────
// Everything a person can ask here is one of a closed list of RECIPES
// («recetas»), each with fixed slots:
//
//   anadir_entrada   tabla, entrada (its name), campos [{columna, valor}], texto
//   editar_entrada   tabla, entrada (which one), campos [{columna, valor}]
//
// Understanding a sentence means filling those slots. It happens in two
// stages, cheapest first:
//
//   1. RULES (no model at all): «añade a Productos: Miel, precio 12 €,
//      categoría Dulces» or «cambia el precio de Miel a 14». Most requests
//      phrased like a form never touch a model.
//   2. LOCAL MODEL (`iaLocal.ts`): for free-form sentences. Its output is
//      forced into a JSON schema whose enums are THIS page's real table and
//      column names, so it cannot invent a table, a column or a recipe.
//
// Then ordinary code takes over: names are matched to ids, every value is
// typed with the SAME `tipar` the grid uses, and the result is shown as a
// PROPOSAL. Nothing is written until the person presses «Guardar» — and on
// save everything is validated again on the server, because a proposal is
// just data that came back from a browser.
//
// ── WHY THE MODEL NEVER WRITES ──────────────────────────────────────────────
// House rule (src/server/CLAUDE.md): success is decided by the data that comes
// back, never by the narration; a bug that depends on the model behaving is
// postponed, not fixed. A small model WILL misread sometimes. Here a misread
// is a proposal the person sees and rejects, never a wrong row in their site.
//
// Adding a recipe = one entry in `construirPropuesta` + `ejecutar`, and its
// name in the schema enum. No prompt engineering per database.

/** Tipos que el chat sabe rellenar. Los que apuntan a otras cosas (personas,
 *  relaciones, archivos) o se calculan solos (fórmulas) se dicen, no se adivinan. */
const RELLENABLES = new Set<string>([
  'texto', 'texto_largo', 'numero', 'moneda', 'porcentaje', 'duracion', 'valoracion',
  'fecha', 'casilla', 'url', 'email', 'telefono', 'seleccion', 'seleccion_multiple',
]);

const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const singular = (s: string) => s.replace(/(es|s)$/, '');
const corto = (t: unknown, n = 140) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

type Columna = { id: string; nombre: string; tipo: string; opciones: any[]; config: any };
type Tabla = { id: string; titulo: string; columnas: Columna[]; colTitulo: string | null; filas: Array<{ id: string; titulo: string; pagina_id: string | null }> };

/** Las bases de datos de la página, con sus columnas y entradas. Se lee de la
 *  base de datos por id: nunca de lo que diga el navegador. */
async function tablasDePagina(db: any, paginaId: string): Promise<Tabla[]> {
  const w = (await db.execute(sql`SELECT config FROM knowledge_windows WHERE id = ${paginaId}`)).rows[0] as any;
  const ids = [...new Set((Array.isArray(w?.config?.bloques) ? w.config.bloques : [])
    .filter((b: any) => b?.tipo === 'basedatos' && b.tabla_id).map((b: any) => String(b.tabla_id)))].slice(0, 12);
  const tablas: Tabla[] = [];
  for (const id of ids) {
    const t = (await db.execute(sql`SELECT id, titulo FROM bd_tablas WHERE id = ${id} AND deleted_at IS NULL`)).rows[0] as any;
    if (!t) continue;
    const columnas = (await db.execute(sql`
      SELECT id, nombre, tipo, opciones, config FROM bd_columnas
      WHERE tabla_id = ${id} AND archived_at IS NULL ORDER BY orden, created_at
    `)).rows as Columna[];
    // La columna-nombre es la primera de texto: la misma regla que `bd.ts`.
    const colTitulo = columnas.find(c => c.tipo === 'texto')?.id ?? null;
    const filas = (await db.execute(sql`
      SELECT id, valores, pagina_id FROM bd_filas WHERE tabla_id = ${id} AND deleted_at IS NULL ORDER BY orden LIMIT 300
    `)).rows.map((f: any) => ({ id: f.id, pagina_id: f.pagina_id, titulo: colTitulo ? String(f.valores?.[colTitulo] ?? '') : '' }));
    tablas.push({ id: t.id, titulo: t.titulo || 'Sin nombre', columnas, colTitulo, filas });
  }
  return tablas;
}

// ── ETAPA 1: REGLAS ─────────────────────────────────────────────────────────

const VERBO_ANADIR = /^(?:por favor,?\s+)?(?:a[nñ]ade|anade|anadir|a[nñ]adir|agrega|agregar|mete|meter|crea|crear|inserta|insertar|apunta|apuntar|incluye|incluir|registra|registrar|guarda|guardar|nueva?|pon(?:me)?)\b/;
const VERBO_EDITAR = /^(?:por favor,?\s+)?(?:cambia|cambiar|actualiza|actualizar|modifica|modificar|corrige|corregir|pon|poner|edita|editar)\b/;

/** Busca un nombre (de tabla o columna) dentro de un texto ya normalizado. */
function aparece(textoNorm: string, nombre: string): number {
  const n = norm(nombre);
  if (!n) return -1;
  for (const v of [n, singular(n)]) {
    if (v.length < 3) continue;
    const m = new RegExp(`(^|[^a-z0-9])${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(es|s)?(?=$|[^a-z0-9])`).exec(textoNorm);
    if (m) return m.index + m[1].length;
  }
  return -1;
}

/** ¿Se nombra la tabla? Su nombre entero, o alguna palabra con contenido de
 *  él: «AI - Productos» se nombra diciendo «un producto». */
function mencionaTabla(textoNorm: string, titulo: string): boolean {
  return finDeMencion(textoNorm, titulo) >= 0;
}

/** Dónde ACABA la mención de la tabla en el texto (para recortar lo que viene
 *  detrás), o -1. Sirve igual para el nombre entero que para una palabra. */
function finDeMencion(textoNorm: string, titulo: string): number {
  for (const nombre of [titulo, ...norm(titulo).split(/[^a-z0-9]+/).filter(p => p.length >= 4)]) {
    const i = aparece(textoNorm, nombre);
    if (i < 0) continue;
    const base = norm(nombre);
    const largo = textoNorm.slice(i).startsWith(base) ? base.length : singular(base).length;
    const extra = textoNorm.slice(i + largo).match(/^(es|s)/)?.[0].length || 0;
    return i + largo + extra;
  }
  return -1;
}

/** El texto normalizado y, para cada posición, dónde estaba en el original —
 *  así los VALORES se recortan del original y conservan tildes y mayúsculas. */
function conMapa(original: string) {
  let n = ''; const mapa: number[] = [];
  for (let i = 0; i < original.length; i++) {
    const c = original[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (let k = 0; k < c.length; k++) { n += c[k]; mapa.push(i); }
  }
  mapa.push(original.length);
  return { n, mapa };
}

type Huecos = { receta: 'anadir_entrada' | 'editar_entrada'; tabla?: string; entrada?: string; campos: Array<{ columna: string; valor: string }>; texto?: string };

function porReglas(texto: string, tablas: Tabla[]): Huecos | null {
  const t = texto.trim().replace(/[.!]+$/, '');
  const { n, mapa } = conMapa(t);
  const orig = (a: number, b: number) => t.slice(mapa[a], mapa[Math.min(b, mapa.length - 1)]);

  // «cambia el precio de Miel a 14»
  if (VERBO_EDITAR.test(n)) {
    for (const tb of tablas) for (const c of tb.columnas) {
      const cn = norm(c.nombre).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const m = new RegExp(`^\\S+\\s+(?:el |la |los |las )?${cn}\\s+(?:de |del |de la |de los |de las )(.+?)\\s+(?:a|en|por|=|:)\\s+(.+)$`).exec(n);
      if (m) {
        const iEnt = n.indexOf(m[1], m.index);
        const iVal = n.lastIndexOf(m[2]);
        return { receta: 'editar_entrada', tabla: tb.titulo, entrada: orig(iEnt, iEnt + m[1].length).trim(), campos: [{ columna: c.nombre, valor: orig(iVal, n.length).trim() }] };
      }
    }
  }

  if (!VERBO_ANADIR.test(n)) return null;
  // ¿A qué tabla? La nombrada; si no se nombra ninguna y sólo hay una, ésa.
  let tabla: Tabla | undefined; let finTabla = -1;
  for (const tb of tablas) {
    const i = aparece(n, tb.titulo);
    if (i >= 0 && (!tabla || norm(tb.titulo).length > norm(tabla.titulo).length)) {
      tabla = tb;
      finTabla = finDeMencion(n, tb.titulo);
    }
  }
  if (!tabla) {
    const nombradas = tablas.filter(tb => mencionaTabla(n, tb.titulo));
    if (nombradas.length === 1) { tabla = nombradas[0]; finTabla = finDeMencion(n, tabla.titulo); }
  }
  if (!tabla && tablas.length === 1) tabla = tablas[0];
  if (!tabla) return null;

  // Lo que queda después del verbo y de la tabla.
  let ini = finTabla >= 0 ? finTabla : (VERBO_ANADIR.exec(n)?.[0].length ?? 0);
  const cuerpoN = n.slice(ini);
  const quitaInicio = /^\s*(?:[:,\-]\s*|(?:una?|otra|la|el)\s+(?:nueva\s+)?(?:entrada|fila|ficha|registro|elemento|cosa)\s*|que se llame\s+|llamad[oa]\s+|con (?:el )?nombre\s+|de nombre\s+)+/;
  const salto = quitaInicio.exec(cuerpoN)?.[0].length ?? 0;
  ini += salto;

  // Marcas «columna: valor» / «columna valor» de las columnas de ESA tabla.
  const marcas: Array<{ col: Columna; i: number; fin: number }> = [];
  for (const c of tabla.columnas) {
    const cn = norm(c.nombre);
    if (cn.length < 3) continue;
    const re = new RegExp(`(^|[\\s,;])(${cn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*(?::|=|es\\b|de\\b)?\\s*`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(n))) {
      const i = m.index + m[1].length;
      if (i < ini) continue;
      marcas.push({ col: c, i, fin: m.index + m[0].length });
      break;
    }
  }
  marcas.sort((a, b) => a.i - b.i);

  const campos: Huecos['campos'] = [];
  for (let k = 0; k < marcas.length; k++) {
    const hasta = k + 1 < marcas.length ? marcas[k + 1].i : n.length;
    const valor = orig(marcas[k].fin, hasta).replace(/^[\s:=]+|[\s,;]+(y)?\s*$/gi, '').replace(/\s+y$/i, '').trim();
    if (valor) campos.push({ columna: marcas[k].col.nombre, valor });
  }
  // El nombre: lo que hay antes de la primera columna nombrada.
  const finNombre = marcas.length ? marcas[0].i : n.length;
  let entrada = orig(ini, finNombre).replace(/^[\s:,\-«"']+|[\s,;:\-»"']+$/g, '').replace(/\s+(?:y|con)$/i, '').trim();
  const colNombre = tabla.columnas.find(c => c.id === tabla!.colTitulo);
  const yaNombre = colNombre && campos.find(c => norm(c.columna) === norm(colNombre.nombre));
  if (yaNombre) { entrada = yaNombre.valor; campos.splice(campos.indexOf(yaNombre), 1); }
  if (!entrada || entrada.length > 120) return null;
  return { receta: 'anadir_entrada', tabla: tabla.titulo, entrada, campos };
}

// ── ETAPA 2: EL MODELO LOCAL ────────────────────────────────────────────────

async function porModelo(texto: string, tablas: Tabla[]): Promise<{ huecos: Huecos | null; ms: number }> {
  const nombresTablas = tablas.map(t => t.titulo);
  const nombresCols = [...new Set(tablas.flatMap(t => t.columnas.filter(c => RELLENABLES.has(c.tipo)).map(c => c.nombre)))];
  const esquema = {
    type: 'object',
    required: ['receta', 'tabla', 'entrada', 'campos'],
    properties: {
      receta: { type: 'string', enum: ['anadir_entrada', 'editar_entrada', 'ninguna'] },
      tabla: { type: 'string', enum: nombresTablas },
      entrada: { type: 'string', maxLength: 120 },
      campos: {
        type: 'array', maxItems: 12,
        items: { type: 'object', required: ['columna', 'valor'], properties: {
          columna: { type: 'string', enum: nombresCols.length ? nombresCols : ['-'] },
          valor: { type: 'string', maxLength: 300 },
        } },
      },
      texto: { type: 'string', maxLength: 1500 },
    },
  };
  const descripcion = tablas.map(t => {
    const cols = t.columnas.filter(c => RELLENABLES.has(c.tipo)).map(c => {
      const ops = (c.tipo === 'seleccion' || c.tipo === 'seleccion_multiple') && Array.isArray(c.opciones) && c.opciones.length
        ? ` [opciones: ${c.opciones.map((o: any) => o.label).slice(0, 12).join(', ')}]` : '';
      return `${c.nombre} (${c.tipo})${ops}`;
    });
    const ej = t.filas.slice(0, 15).map(f => f.titulo).filter(Boolean);
    return `- Tabla «${t.titulo}». Columnas: ${cols.join(', ')}.${ej.length ? ` Entradas que ya existen: ${ej.join(', ')}.` : ''}`;
  }).join('\n');
  const sistema = `Conviertes una petición en español en un JSON para rellenar bases de datos. No contestas nada más.
Bases de datos de la página:
${descripcion}

Recetas:
- anadir_entrada: crear una entrada nueva. "entrada" = su nombre. "campos" = los demás datos que diga, cada uno con su columna.
- editar_entrada: cambiar datos de una entrada que ya existe. "entrada" = cuál (su nombre). "campos" = lo que cambia.
- ninguna: si no pide añadir ni cambiar datos de una tabla.
Copia los valores tal como los dice la persona. No inventes datos que no haya dicho. "texto" solo si da una descripción larga.`;
  let respuesta;
  try { respuesta = await pedirJsonLocal({ sistema, usuario: texto, esquema, maxTokens: 350 }); }
  catch (e) { if (e instanceof IaLocalIlegible) return { huecos: null, ms: 0 }; throw e; }
  const { json, ms } = respuesta;
  if (!json || json.receta === 'ninguna' || !json.tabla) return { huecos: null, ms };

  // ── LO QUE NO SE HA DICHO, NO SE GUARDA ─────────────────────────────────
  // Measured on 2026-10-02: asked for «Pan de centeno», the 1.5B model filled
  // price 1.50 €, category «Salados» and «disponible: sí» — none of it said.
  // That is not fixable by prompting a small model; it is fixed here: a value
  // survives only if the person actually said it. A checkbox survives only if
  // its column was named.
  const tn = norm(texto);
  const tabla = tablas.find(t => norm(t.titulo) === norm(json.tabla));
  const campos = (Array.isArray(json.campos) ? json.campos : [])
    .map((c: any) => ({ columna: String(c.columna), valor: String(c.valor ?? '') }))
    .filter((c: { columna: string; valor: string }) => {
      const col = tabla?.columnas.find(x => norm(x.nombre) === norm(c.columna));
      if (col?.tipo === 'casilla') return aparece(tn, col.nombre) >= 0 && (!/^no$/i.test(c.valor.trim()) || /(^|[^a-z])no([^a-z]|$)/.test(tn));
      return dicho(c.valor, tn);
    });
  let entrada = comoLoDijo(corto(String(json.entrada || ''), 120), texto);
  if (entrada && !dicho(entrada, tn)) entrada = '';
  for (const c of campos) c.valor = comoLoDijo(c.valor, texto);
  let receta = json.receta as Huecos['receta'];
  // «Añadir» algo que ya existe con ese nombre es, casi siempre, cambiarlo.
  if (receta === 'anadir_entrada' && tabla?.filas.some(f => norm(f.titulo) === norm(entrada))) receta = 'editar_entrada';
  return {
    ms,
    huecos: {
      receta, tabla: String(json.tabla), entrada, campos,
      texto: json.texto && dicho(json.texto, tn) ? String(json.texto).slice(0, 1500) : undefined,
    },
  };
}

/** El valor con las mayúsculas y tildes con que lo escribió la persona, si
 *  aparece tal cual en su frase («queso_curado» → «Queso curado»). */
function comoLoDijo(valor: string, original: string): string {
  const v = norm(valor.replace(/_/g, ' '));
  if (!v) return valor;
  const { n, mapa } = conMapa(original);
  const i = n.indexOf(v);
  return i >= 0 ? original.slice(mapa[i], mapa[i + v.length]) : valor.replace(/_/g, ' ');
}

const VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'y', 'en', 'a', 'con', 'por', 'para', 'que']);
/** ¿Lo ha dicho la persona? Cada palabra con contenido del valor tiene que
 *  aparecer en la frase (sin tildes ni mayúsculas). */
function dicho(valor: string, textoNorm: string): boolean {
  const v = norm(valor).replace(/_/g, ' ');
  if (!v) return false;
  if (textoNorm.includes(v)) return true;
  const palabras = v.split(/[^a-z0-9]+/).filter(p => p && !VACIAS.has(p) && !/^(euros?|eur)$/.test(p));
  return palabras.length > 0 && palabras.every(p => new RegExp(`(^|[^a-z0-9])${p}([^a-z0-9]|$)`).test(textoNorm));
}

// ── DE HUECOS A PROPUESTA: CÓDIGO NORMAL ────────────────────────────────────

/** El valor tal como lo diría una persona → el formato que espera `tipar`. */
function prepararValor(c: Columna, valor: string): { bruto?: any; error?: string } {
  const v = valor.trim();
  if (c.tipo === 'casilla') {
    if (/^(s[ií]|si|verdadero|true|hecho|x|marcad[oa]|1)$/i.test(v)) return { bruto: true };
    if (/^(no|falso|false|0|sin marcar)$/i.test(v)) return { bruto: false };
    return { error: 'Di «sí» o «no».' };
  }
  if (c.tipo === 'seleccion' || c.tipo === 'seleccion_multiple') {
    const ops: any[] = Array.isArray(c.opciones) ? c.opciones : [];
    const partes = c.tipo === 'seleccion_multiple' ? v.split(/\s*(?:,|\by\b)\s*/) : [v];
    const ids: string[] = [];
    for (const p of partes.filter(Boolean)) {
      const o = ops.find(o => norm(o.label) === norm(p)) || ops.find(o => norm(o.label).startsWith(norm(p)) || norm(p).startsWith(norm(o.label)));
      if (!o) return { error: `No hay ninguna opción «${p}». Opciones: ${ops.map(o => o.label).join(', ') || 'ninguna'}.` };
      ids.push(o.id);
    }
    return { bruto: c.tipo === 'seleccion' ? ids[0] : ids };
  }
  if (c.tipo === 'numero' || c.tipo === 'valoracion') return { bruto: v.replace(/[^\d,.\-]/g, '') || v };
  if (c.tipo === 'fecha') return { bruto: fechaHablada(v) ?? v };
  return { bruto: v };
}

const mostrar = (c: Columna, valor: any): string => {
  if (valor === undefined || valor === null) return '';
  if (c.tipo === 'casilla') return valor ? 'Sí' : 'No';
  if (c.tipo === 'seleccion') return (c.opciones || []).find((o: any) => o.id === valor)?.label ?? String(valor);
  if (c.tipo === 'seleccion_multiple') return (Array.isArray(valor) ? valor : []).map(id => (c.opciones || []).find((o: any) => o.id === id)?.label ?? id).join(', ');
  if (c.tipo === 'porcentaje') return `${Math.round(Number(valor) * 10000) / 100} %`;
  if (c.tipo === 'moneda') return `${valor} ${(c.config || {}).moneda || '€'}`;
  return String(valor);
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** «15 de noviembre», «15 de noviembre de 2026», «hoy», «mañana» → AAAA-MM-DD.
 *  Sin año: el de este año, o el próximo si esa fecha ya ha pasado. `null`
 *  si no es una fecha dicha así, y entonces la juzga `tipar` tal cual. */
function fechaHablada(v: string): string | null {
  const n = norm(v); const hoy = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (n === 'hoy') return iso(hoy);
  if (n === 'manana') return iso(new Date(hoy.getTime() + 864e5));
  if (n === 'pasado manana') return iso(new Date(hoy.getTime() + 2 * 864e5));
  const m = /^(?:el\s+)?(\d{1,2})\s+de\s+([a-z]+)(?:\s+(?:de|del)\s+(\d{4}))?$/.exec(n);
  if (!m) return null;
  const mes = MESES.indexOf(m[2] === 'setiembre' ? 'septiembre' : m[2]);
  if (mes < 0) return null;
  let anyo = m[3] ? Number(m[3]) : hoy.getFullYear();
  let d = new Date(anyo, mes, Number(m[1]));
  if (d.getMonth() !== mes) return null;
  if (!m[3] && d < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) d = new Date(++anyo, mes, Number(m[1]));
  return iso(d);
}

export type Propuesta = {
  receta: 'anadir_entrada' | 'editar_entrada';
  tabla_id: string; tabla: string;
  fila_id?: string; entrada: string;
  campos: Array<{ columna_id: string; columna: string; bruto: any; valor: any; mostrar: string }>;
  texto?: string;
  fallos: Array<{ columna: string; error: string }>;
};

type Resultado =
  | { tipo: 'propuesta'; propuesta: Propuesta; origen: 'reglas' | 'modelo'; ms?: number }
  | { tipo: 'pregunta'; texto: string; opciones?: Array<{ label: string; tabla_id?: string }> };

function construirPropuesta(h: Huecos, tablas: Tabla[]): Resultado {
  const tabla = tablas.find(t => norm(t.titulo) === norm(h.tabla)) || (tablas.length === 1 ? tablas[0] : undefined);
  if (!tabla) return { tipo: 'pregunta', texto: '¿En qué base de datos?', opciones: tablas.map(t => ({ label: t.titulo, tabla_id: t.id })) };
  const p: Propuesta = { receta: h.receta, tabla_id: tabla.id, tabla: tabla.titulo, entrada: corto(h.entrada, 120), campos: [], fallos: [], texto: h.texto };

  if (h.receta === 'editar_entrada') {
    const fila = tabla.filas.find(f => norm(f.titulo) === norm(h.entrada))
      || tabla.filas.find(f => norm(f.titulo).includes(norm(h.entrada)) && norm(h.entrada).length >= 3);
    if (!fila) {
      return { tipo: 'pregunta', texto: `No encuentro «${h.entrada}» en «${tabla.titulo}». ¿Cuál es?`, opciones: tabla.filas.slice(0, 8).map(f => ({ label: f.titulo })).filter(o => o.label) };
    }
    p.fila_id = fila.id; p.entrada = fila.titulo;
  } else if (!p.entrada) {
    return { tipo: 'pregunta', texto: `¿Cómo se llama la nueva entrada de «${tabla.titulo}»?` };
  }

  for (const c of h.campos) {
    const col = tabla.columnas.find(x => norm(x.nombre) === norm(c.columna));
    if (!col) { p.fallos.push({ columna: c.columna, error: `«${tabla.titulo}» no tiene esa columna.` }); continue; }
    if (col.id === tabla.colTitulo && h.receta === 'anadir_entrada') { p.entrada = corto(c.valor, 120); continue; }
    if (!RELLENABLES.has(col.tipo)) { p.fallos.push({ columna: col.nombre, error: 'Esta columna todavía no se rellena desde el chat: hazlo en la tabla.' }); continue; }
    const prep = prepararValor(col, c.valor);
    if (prep.error) { p.fallos.push({ columna: col.nombre, error: prep.error }); continue; }
    const r = tipar(col.tipo as Tipo, prep.bruto, col.opciones || [], col.config || {});
    if ('error' in r) { p.fallos.push({ columna: col.nombre, error: r.error }); continue; }
    if (r.valor === undefined) continue;
    p.campos.push({ columna_id: col.id, columna: col.nombre, bruto: prep.bruto, valor: r.valor, mostrar: mostrar(col, r.valor) });
  }
  return { tipo: 'propuesta', propuesta: p, origen: 'reglas' };
}

/** ¿Merece la pena intentarlo? Sin verbo de datos ni nombre de tabla, no se
 *  despierta al modelo: cada mensaje del chat pasaría si no unos segundos de
 *  CPU del servidor por nada. */
const pareceDeDatos = (texto: string, tablas: Tabla[]) => {
  const n = norm(texto);
  return VERBO_ANADIR.test(n) || VERBO_EDITAR.test(n) || tablas.some(t =>
    mencionaTabla(n, t.titulo)
    // «la mermelada de higo ya no está disponible»: ni verbo ni tabla, pero
    // nombra una entrada que existe y una de sus columnas.
    || (t.filas.some(f => norm(f.titulo).length >= 3 && n.includes(norm(f.titulo))) && t.columnas.some(c => aparece(n, c.nombre) >= 0)));
};

// Freno por persona: el modelo es gratis para ella, pero no para la máquina.
const usos = new Map<string, number[]>();
function frenar(userId: string): boolean {
  const ahora = Date.now();
  const lista = (usos.get(userId) || []).filter(t => ahora - t < 60_000);
  if (lista.length >= 15) return true;
  lista.push(ahora); usos.set(userId, lista);
  if (usos.size > 5000) usos.clear();
  return false;
}

export function registerRellenarPorChatRoutes(app: Express, db: any) {
  /** ¿Está la IA gratuita encendida? Para que la pantalla lo diga. */
  app.get('/api/datos-chat/estado', async (_req: Request, res: Response) => {
    res.json({ lista: await iaLocalLista() });
  });

  /**
   * ENTENDER — `POST /api/datos-chat/entender` { pagina_id, texto }
   * Devuelve una propuesta (no escribe nada), una pregunta, `no_es_dato` (que
   * siga su camino el chat normal) o `no_disponible`.
   */
  app.post('/api/datos-chat/entender', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const paginaId = String(req.body?.pagina_id || '');
      const texto = String(req.body?.texto || '').slice(0, 1500).trim();
      if (!texto || !/^[A-Za-z0-9_-]{4,64}$/.test(paginaId)) return res.json({ tipo: 'no_es_dato' });
      if (!(await puedeEditarPagina(db, req.user.id, req.user.roleLevel ?? 0, paginaId))) return res.json({ tipo: 'no_es_dato' });
      let tablas = await tablasDePagina(db, paginaId);
      // Respuesta a «¿en qué base de datos?»: la misma frase, ya con la tabla.
      const forzada = req.body?.tabla_id ? tablas.filter(t => t.id === String(req.body.tabla_id)) : [];
      if (forzada.length) tablas = forzada;
      else if (!tablas.length || !pareceDeDatos(texto, tablas)) return res.json({ tipo: 'no_es_dato' });

      const deReglas = porReglas(texto, tablas);
      if (deReglas) {
        const r = construirPropuesta(deReglas, tablas);
        // Las reglas sólo se dan por buenas si no dejaron nada sin entender.
        if (r.tipo === 'pregunta' || !r.propuesta.fallos.length) return res.json({ ...r, origen: 'reglas' });
      }

      if (frenar(req.user.id)) return res.json({ tipo: 'no_disponible', motivo: 'Has hecho muchas peticiones seguidas. Espera un minuto.' });
      let modelo;
      try { modelo = await porModelo(texto, tablas); }
      catch (e: any) {
        if (e instanceof IaLocalNoDisponible || e instanceof IaLocalOcupada) return res.json({ tipo: 'no_disponible', motivo: e.message });
        throw e;
      }
      if (!modelo.huecos) return res.json({ tipo: 'no_es_dato' });
      const r = construirPropuesta(modelo.huecos, tablas);
      res.json(r.tipo === 'propuesta' ? { ...r, origen: 'modelo', ms: modelo.ms } : r);
    } catch (e: any) { console.error('[datos-chat entender]', e); res.status(500).json({ error: e.message }); }
  });

  /**
   * GUARDAR — `POST /api/datos-chat/guardar` { pagina_id, propuesta }
   * Se vuelve a validar TODO contra las columnas de ahora: la propuesta ha
   * ido y vuelto por el navegador y no se fía de nada de lo que trae.
   */
  app.post('/api/datos-chat/guardar', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const paginaId = String(req.body?.pagina_id || '');
      const p = req.body?.propuesta || {};
      if (!(await puedeEditarPagina(db, req.user.id, req.user.roleLevel ?? 0, paginaId))) return res.status(403).json({ error: 'No puedes editar esa página.' });
      const tablas = await tablasDePagina(db, paginaId);
      const tabla = tablas.find(t => t.id === p.tabla_id);
      if (!tabla) return res.status(400).json({ error: 'Esa base de datos ya no está en la página.' });
      const huecos: Huecos = {
        receta: p.receta === 'editar_entrada' ? 'editar_entrada' : 'anadir_entrada',
        tabla: tabla.titulo,
        entrada: p.receta === 'editar_entrada' ? (tabla.filas.find(f => f.id === p.fila_id)?.titulo ?? '') : corto(p.entrada, 120),
        campos: (Array.isArray(p.campos) ? p.campos : []).map((c: any) => {
          const col = tabla.columnas.find(x => x.id === c.columna_id);
          // El valor tal como lo vio la persona, re-tipado. Para selección se
          // reescribe la etiqueta: `prepararValor` vuelve a buscar la opción.
          return { columna: col?.nombre ?? '', valor: col && (col.tipo === 'seleccion' || col.tipo === 'seleccion_multiple' || col.tipo === 'casilla') ? String(c.mostrar ?? '') : String(c.bruto ?? '') };
        }),
        texto: p.texto ? String(p.texto) : undefined,
      };
      const r = construirPropuesta(huecos, tablas);
      if (r.tipo !== 'propuesta') return res.status(400).json({ error: r.texto });
      const prop = r.propuesta;
      if (prop.fallos.length) return res.status(400).json({ error: 'Hay datos que no se pueden guardar.', fallos: prop.fallos });
      if (!bdInterno.crearFila || !bdInterno.escribirCeldas) return res.status(503).json({ error: 'Las bases de datos no están disponibles.' });

      const quien = { user: req.user } as Pick<Request, 'user'>;
      let filaId = prop.fila_id; let paginaFila: string | null = null;
      if (prop.receta === 'anadir_entrada') {
        const f = await bdInterno.crearFila(quien, tabla.id, prop.entrada);
        if ('error' in f) return res.status(f.codigo).json({ error: f.error });
        filaId = f.id; paginaFila = f.pagina_id;
      } else {
        paginaFila = tabla.filas.find(f => f.id === filaId)?.pagina_id ?? null;
      }
      if (prop.campos.length) {
        const celdas = Object.fromEntries(prop.campos.map(c => [c.columna_id, c.bruto]));
        const w = await bdInterno.escribirCeldas(quien, filaId!, celdas);
        if (w.codigo !== 200) return res.status(w.codigo).json(w.cuerpo);
      }
      if (prop.texto && paginaFila) {
        const bloques = [{ id: `B${Date.now().toString(36)}0`, tipo: 'parrafo', texto: prop.texto }];
        await db.execute(sql`
          UPDATE knowledge_windows SET config = jsonb_set(coalesce(config, '{}'::jsonb), '{bloques}',
            coalesce(config->'bloques', '[]'::jsonb) || ${JSON.stringify(bloques)}::jsonb), updated_at = now()
          WHERE id = ${paginaFila}
        `);
      }
      res.json({ ok: true, fila_id: filaId, creado: { titulo: prop.entrada, url: paginaFila ? `/paginas/${paginaFila}` : null } });
    } catch (e: any) { console.error('[datos-chat guardar]', e); res.status(500).json({ error: e.message }); }
  });
}

// Para las pruebas: las dos etapas sin HTTP.
export const _paraProbar = { porReglas, porModelo, construirPropuesta };
