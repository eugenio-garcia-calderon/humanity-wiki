import crypto from 'crypto';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import { slugDe } from '../components/sitio/sitioWeb';
import { paginasDelPie } from './seoEscaparate';
import { TRAMOS_RESERVADOS } from './rutasFila';
import { MAPA_POR_DEFECTO, RECORRIDOS } from '../data/concienciaMapa';
import { ESTUDIOS, LIBROS } from '../data/concienciaEstudios';
import { AMBITOS, APOYOS, EMPLEADORES, ESCALAS, FUENTES, FUNCIONES, GRUPOS_GASTO, IMPUESTOS_HOY, MATRIZ, TERCIOS, TERCIOS_ESCALA, TRAMOS } from '../data/modeloSocioeconomico';

// ============================================================================
// UNA SOLA FUENTE, TODOS LOS IDIOMAS (2026-11-10, regla 11 de la Constitución)
// ============================================================================
// Eugenio: «luzhumanidad.com es la fuente original en español y lighthumanity.org una réplica
// en inglés, y que Google sepa que es la misma página». No hay una copia de las páginas: el
// dominio traducido sirve las MISMAS páginas y tablas, y aquí se cambia cada texto por el suyo.
//
//   · El diccionario es `traducciones_textos`: un texto en español por fila e idioma. La clave es
//     el texto entero, así que un párrafo que cambia es una tarea nueva y los demás siguen valiendo.
//   · LA LISTA DE TAREAS son las filas sin traducción. `barrer` la llena cada 15 minutos mirando
//     lo publicado, sin ganchos: un texto se escribe por muchos caminos y olvidar uno es fácil. Lo
//     escrito en el código lo avisa el navegador (`/api/traducciones/faltan`).
//   · Las traducciones las hace la IA de la sesión de trabajo, una vez al día, por la API con token.
//   · Un proyecto nuevo no sale en la réplica hasta tener su título traducido: mejor faltar un
//     día que enseñar español. Un párrafo cambiado sí puede verse en español hasta el repaso.

export type SitioTraducido = { raiz: string; origen: string; traducciones: Record<string, string> };
export const SITIOS_TRADUCIDOS: SitioTraducido[] = [
  { raiz: 'KWMUO4S4V663', origen: 'luzhumanidad.com', traducciones: { en: 'lighthumanity.org' } },
];
export const dominiosTraducidos = () => SITIOS_TRADUCIDOS.flatMap(s => Object.values(s.traducciones));
const ETIQUETAS: Record<string, string> = { es: 'Español', en: 'English' };
const IDIOMAS_LARGOS: Record<string, string> = { es: 'es-ES', en: 'en' };

const CLAVES_FUERA = new Set(['id', 'tipo', 'tabla_id', 'entityId', 'url', 'src', 'href', 'imagen', 'portada', 'icono', 'color', 'slug', 'ruta', 'aplicacion',
  'encuadre', 'jsonLd', 'dominio', 'email', 'correo', 'telefono', 'handle', 'proveedorCorreo', 'organizacion', 'fundador', 'imagenCompartir', 'colabora', 'proyectos',
  'sistemas', 'personas', 'inspiran', 'vistaInicial', 'vistas', 'fuente']);

const hashDe = (s: string) => crypto.createHash('sha1').update(s.trim()).digest('hex');

/** ¿Es un texto para personas? Fuera direcciones, identificadores y valores de ajustes («grande»). */
export function esTexto(s: string): boolean {
  const t = s.trim();
  if (t.length < 2 || t.length > 12000 || !/\p{L}/u.test(t)) return false;
  if (/^(https?:|mailto:|tel:|\/|#|\{\{)/.test(t) || /^[A-Z0-9_]{6,}$/.test(t)) return false;
  // Fechas ISO e identificadores externos (los canales de YouTube, por ejemplo).
  if (/^\d{4}-\d{2}-\d{2}/.test(t) || /^[A-Za-z0-9_-]{16,}$/.test(t)) return false;
  if (/^[a-záéíóúñü_-]+$/.test(t) || /^[a-z]+([A-Z][a-z0-9]*)+$/.test(t)) return false;
  return true;
}

/** Los textos de cualquier objeto de la configuración de una página. */
export function textosDe(x: unknown, salida: Set<string> = new Set(), clave = ''): Set<string> {
  if (typeof x === 'string') { if (!CLAVES_FUERA.has(clave) && esTexto(x)) salida.add(x.trim()); }
  else if (Array.isArray(x)) x.forEach(v => textosDe(v, salida, clave));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) if (!CLAVES_FUERA.has(k)) textosDe(v, salida, k);
  return salida;
}

type Diccionario = {
  textos: Map<string, string>; interfaz: Record<string, string>; valores: Set<string>;
  slugs: Map<string, string>; inversos: Map<string, string>;
};
const vacio = (): Diccionario => ({ textos: new Map(), interfaz: {}, valores: new Set(), slugs: new Map(), inversos: new Map() });
const diccionarios = new Map<string, Diccionario>();
let dominiosActivos = new Set<string>();
let paginasConocidas: Array<{ title: string; slug: string | null }> = [];

const dominioDe = (host: string) => SITIOS_TRADUCIDOS.flatMap(s => Object.entries(s.traducciones).map(([idioma, dominio]) => ({ s, idioma, dominio }))).find(x => x.dominio === host.replace(/^www\./, '')) || null;
const hostDe = (req: Request) => String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');

/** El idioma traducido de este anfitrión, o `null` si es un sitio en su idioma original. */
export const idiomaDeHost = (host: string): string | null => dominioDe(host)?.idioma || null;
const dic = (idioma: string) => diccionarios.get(idioma) || vacio();

/** ¿Está traducido este texto? Lo usa quien decide si un proyecto nuevo ya se enseña. */
export const estaTraducido = (texto: string, idioma: string) => !diccionarios.has(idioma) || dic(idioma).textos.has(String(texto || '').trim());

const MESES: Record<string, string> = { enero: 'January', febrero: 'February', marzo: 'March', abril: 'April', mayo: 'May', junio: 'June', julio: 'July', agosto: 'August', septiembre: 'September', octubre: 'October', noviembre: 'November', diciembre: 'December' };

function traducirCadena(s: string, idioma: string, d: Diccionario, origen: string, destino: string): string {
  if (s === 'es-ES') return IDIOMAS_LARGOS[idioma] || idioma;
  const t = s.trim();
  // Lo que ya está traducido no se vuelve a traducir (un «en» es el idioma, no la preposición).
  if (t === idioma || d.valores.has(t)) return s;
  const v = d.textos.get(t);
  if (v !== undefined) return s.replace(t, () => v);
  if (d.slugs.has(t)) return d.slugs.get(t)!;
  if (t.startsWith('/') && d.slugs.has(t.slice(1))) return `/${d.slugs.get(t.slice(1))}`;
  if (t.startsWith(`https://${origen}`)) {
    const resto = t.slice(`https://${origen}`.length);
    return `https://${destino}${d.slugs.has(resto.slice(1)) ? `/${d.slugs.get(resto.slice(1))}` : resto}`;
  }
  if (idioma === 'en') {
    const f = /^(\d{1,2}) de (\p{L}+) de (\d{4})$/u.exec(t);
    if (f && MESES[f[2].toLowerCase()]) return `${MESES[f[2].toLowerCase()]} ${Number(f[1])}, ${f[3]}`;
  }
  return s;
}

/** Valores que el programa compara: un nombre corto como «conciencia» aquí no es una dirección. */
const NO_SE_TOCAN = new Set(['id', 'tipo', 'aplicacion', 'vistaInicial', 'vistas', 'forma', 'modo', 'variante']);

/** Cambia cada texto conocido de un objeto. Los nombres de columna no: la aplicación los busca por su nombre. */
function profundo(x: any, idioma: string, d: Diccionario, origen: string, destino: string): any {
  if (typeof x === 'string') return traducirCadena(x, idioma, d, origen, destino);
  if (Array.isArray(x)) return x.map(v => profundo(v, idioma, d, origen, destino));
  if (!x || typeof x !== 'object' || x instanceof Date) return x;
  const o: any = {};
  for (const [k, v] of Object.entries(x)) {
    if (k === 'columnas' && Array.isArray(v)) o[k] = v.map((c: any) => (c && typeof c === 'object' ? { ...c, opciones: profundo(c.opciones, idioma, d, origen, destino) } : c));
    else o[k] = NO_SE_TOCAN.has(k) ? v : profundo(v, idioma, d, origen, destino);
  }
  return o;
}

export function traducirProfundo<T>(x: T, host: string): T {
  const q = dominioDe(host);
  return q ? profundo(x, q.idioma, dic(q.idioma), q.s.origen, q.dominio) : x;
}

/** Los tramos de una dirección traducida, tal como se llaman en el original. */
export function tramosOriginales(host: string, tramos: string[]): string[] {
  const idioma = idiomaDeHost(host);
  if (!idioma) return tramos;
  const d = dic(idioma);
  return tramos.map(t => d.inversos.get(t.toLowerCase()) || t);
}

const sinEntidades = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const conEntidades = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const jsonSeguro = (x: unknown) => JSON.stringify(x).replace(/</g, String.raw`\u003c`);

/** El HTML ya armado: lo que el servidor escribe entero (títulos, etiquetas, datos para Google). */
export function traducirHtml(html: string, host: string): string {
  const q = dominioDe(host);
  if (!q) return html;
  const d = dic(q.idioma);
  const cambiar = (s: string) => traducirCadena(s, q.idioma, d, q.s.origen, q.dominio);
  // Las líneas `hreflang` se quedan como están: cada una apunta a su propio dominio.
  return html.split(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<link rel="alternate" hreflang[^>]*>)/i).map((trozo, i) => {
    if (i % 2) {
      const m = /^(<script\b[^>]*>)([\s\S]*)(<\/script>)$/i.exec(trozo);
      if (!m) return trozo;
      try {
        if (/ld\+json/.test(m[1])) return m[1] + jsonSeguro(profundo(JSON.parse(m[2]), q.idioma, d, q.s.origen, q.dominio)) + m[3];
        const p = /^window\.__SITIO__=([\s\S]*)$/.exec(m[2].trim());
        if (p) return `${m[1]}window.__SITIO__=${jsonSeguro(profundo(JSON.parse(p[1]), q.idioma, d, q.s.origen, q.dominio))}${m[3]}`;
      } catch { /* si no se entiende, se deja como estaba */ }
      return trozo;
    }
    return trozo
      .replace(/>([^<>]*\p{L}[^<>]*)</gu, (t, texto: string) => { const n = sinEntidades(texto); const c = cambiar(n); return c === n ? t : `>${conEntidades(c)}<`; })
      .replace(/\b(alt|title|aria-label|placeholder|content)="([^"]*\p{L}[^"]*)"/gu, (t, a: string, v: string) => { const n = sinEntidades(v); const c = cambiar(n); return c === n ? t : `${a}="${conEntidades(c)}"`; })
      .replace(/\bhref="(\/[^"?#]*|https:\/\/[^"]*)"/g, (t, v: string) => { const c = cambiar(v); return c === v ? t : `href="${conEntidades(c)}"`; });
  }).join('');
}

/** La misma página en cada idioma, para decírselo a Google. Nada si no hay traducción publicada. */
export function versionesDe(host: string, camino: string, titulo: string): Array<{ idioma: string; url: string }> {
  const q = dominioDe(host);
  const s = q?.s || SITIOS_TRADUCIDOS.find(x => x.origen === host);
  if (!s) return [];
  const salida: Array<{ idioma: string; url: string }> = [];
  for (const [idioma, dominio] of Object.entries(s.traducciones)) {
    if (!dominiosActivos.has(dominio)) continue;
    const d = dic(idioma);
    const tramos = camino.split('/').filter(Boolean);
    if (tramos.length && !d.textos.has(String(titulo || '').trim()) && !q) continue;
    const originales = q ? tramosOriginales(host, tramos) : tramos;
    salida.push({ idioma, url: `https://${dominio}/${originales.map(t => d.slugs.get(t) || t).join('/')}` });
    if (salida.length === 1) salida.push({ idioma: 'es', url: `https://${s.origen}/${originales.join('/')}` });
  }
  return salida;
}

/** Las líneas `hreflang`: se apuntan unas a otras, y cada versión también a sí misma. */
export function hreflangDe(host: string, camino: string, titulo: string): string[] {
  const v = versionesDe(host, camino, titulo);
  if (!v.length) return [];
  const general = v.find(x => x.idioma === 'en') || v[0];
  return [...v, { idioma: 'x-default', url: general.url }].map(x => `<link rel="alternate" hreflang="${x.idioma}" href="${conEntidades(x.url)}">`);
}

/** Lo que el navegador necesita saber del idioma: cuál es, el otro y, en la réplica, la interfaz. */
export function datosDeIdioma(html: string, host: string): string {
  const q = dominioDe(host);
  const s = q?.s || SITIOS_TRADUCIDOS.find(x => x.origen === host);
  if (!s) return html;
  const [idioma, dominio] = Object.entries(s.traducciones)[0];
  if (!dominiosActivos.has(dominio)) return html;
  const d = dic(idioma);
  const datos = q
    ? { actual: idioma, otro: { idioma: 'es', host: s.origen, etiqueta: ETIQUETAS.es }, rutas: Object.fromEntries(d.inversos) }
    : { actual: 'es', otro: { idioma, host: dominio, etiqueta: ETIQUETAS[idioma] || idioma }, rutas: Object.fromEntries(d.slugs) };
  const extra = q ? `window.__TRADUCCIONES__=${jsonSeguro(d.interfaz)};` : '';
  return html.replace('</head>', () => `    <script>window.__IDIOMA_SITIO__=${jsonSeguro(datos)};${extra}</script>\n  </head>`);
}

/** Lo publicado de un sitio, con su contexto: de aquí sale la lista de tareas. */
async function recogerPublicado(db: any, s: SitioTraducido) {
  const raiz = (await db.execute(sql`SELECT id, title, slug, config FROM knowledge_windows WHERE id = ${s.raiz} AND deleted_at IS NULL`)).rows[0] as any;
  if (!raiz) return { textos: [] as Array<{ texto: string; tipo: string; contexto: string }>, paginas: [] as any[] };
  const textos: Array<{ texto: string; tipo: string; contexto: string }> = [];
  const anadir = (conjunto: Iterable<string>, contexto: string, tipo = 'contenido') => { for (const texto of conjunto) textos.push({ texto, tipo, contexto }); };
  const cfg = raiz.config?.sitio || {};
  const { bloques: _b, sitio: _s, ...resto } = raiz.config || {};
  anadir([raiz.title], 'Portada');
  anadir(textosDe(raiz.config?.sitio), 'Portada: menú, pie y ajustes');
  anadir(textosDe(resto), 'Portada');
  const paginas: any[] = [{ title: raiz.title, slug: null }];
  const conCuerpo = async (id: string) => {
    const p = (await db.execute(sql`SELECT id, title, slug, config FROM knowledge_windows WHERE id = ${id} AND deleted_at IS NULL AND archived_at IS NULL`)).rows[0] as any;
    if (!p) return;
    paginas.push({ title: p.title, slug: p.slug });
    anadir([p.title], p.title);
    // Tal como se sirve: la Sala de prensa, por ejemplo, arma sus resúmenes al leerla.
    const { paginaPublica } = await import('./sitios');
    const servida = await paginaPublica(db, id).catch(() => null);
    anadir(textosDe(servida?.config || p.config), p.title);
  };
  for (const p of await paginasDelPie(db, raiz)) await conCuerpo(p.id);
  for (const [tabla, cuerpos] of [[cfg.proyectos, true], [cfg.personas, true], [cfg.sistemas, false], [cfg.inspiran, false]] as Array<[string, boolean]>) {
    if (!tabla) continue;
    const cols = (await db.execute(sql`SELECT nombre, opciones FROM bd_columnas WHERE tabla_id = ${tabla} AND archived_at IS NULL`)).rows as any[];
    anadir(cols.flatMap(c => (Array.isArray(c.opciones) ? c.opciones.map((o: any) => String(o?.label || '')) : [])).filter(esTexto), 'Etiquetas de las tablas');
    anadir(cols.map(c => String(c.nombre || '')).filter(esTexto), 'Nombres de las columnas');
    const filas = (await db.execute(sql`
      SELECT f.pagina_id, w.title, w.slug, w.config->>'subtitulo' AS subtitulo FROM bd_filas f JOIN knowledge_windows w ON w.id = f.pagina_id
      WHERE f.tabla_id = ${tabla} AND f.deleted_at IS NULL AND f.archived_at IS NULL AND COALESCE(f.oculta, false) = false AND w.deleted_at IS NULL AND w.archived_at IS NULL
    `)).rows as any[];
    for (const f of filas) {
      if (cuerpos) await conCuerpo(f.pagina_id);
      else { paginas.push({ title: f.title, slug: f.slug }); anadir([f.title, ...(f.subtitulo ? [f.subtitulo] : [])], `Categoría: ${f.title}`); }
    }
  }
  // Los esquemas (el mapa de la teoría sintérgica): el guardado o, si no hay, el que viene en el código.
  const guardado = (await db.execute(sql`SELECT datos FROM conciencia_mapas WHERE clave = 'principal'`).catch(() => ({ rows: [] }))).rows[0] as any;
  anadir(textosDe(guardado?.datos || MAPA_POR_DEFECTO), 'Esquema de la teoría sintérgica');
  anadir(textosDe(MAPA_POR_DEFECTO), 'Esquema de la teoría sintérgica', 'interfaz');
  anadir(textosDe(RECORRIDOS), 'Esquema de la teoría sintérgica: recorridos', 'interfaz');
  anadir(textosDe(ESTUDIOS), 'Estudios sobre la conciencia', 'interfaz');
  anadir(textosDe(LIBROS), 'Libros de Grinberg', 'interfaz');
  // The socioeconomic model page writes its scales, areas, matrix and sources in code; the rest of
  // its text (sentences built with figures) reaches the list through the browser (`/api/traducciones/faltan`).
  anadir(textosDe({ ESCALAS, AMBITOS, MATRIZ, IMPUESTOS_HOY, FUNCIONES, FUENTES, TRAMOS, EMPLEADORES, GRUPOS_GASTO, TERCIOS, TERCIOS_ESCALA, APOYOS }), 'Modelo socioeconómico optimizado', 'interfaz');
  return { textos, paginas };
}

async function guardarTextos(db: any, idioma: string, textos: Array<{ texto: string; tipo: string; contexto: string }>) {
  const unicos = new Map(textos.map(t => [hashDe(t.texto), t]));
  const lista = [...unicos.entries()];
  for (let i = 0; i < lista.length; i += 200) {
    await db.execute(sql`
      INSERT INTO traducciones_textos (idioma, hash, original, tipo, contexto)
      VALUES ${sql.join(lista.slice(i, i + 200).map(([h, t]) => sql`(${idioma}, ${h}, ${t.texto.trim()}, ${t.tipo}, ${t.contexto.slice(0, 200)})`), sql`, `)}
      ON CONFLICT (idioma, hash) DO UPDATE SET visto_at = now(), tipo = CASE WHEN EXCLUDED.tipo = 'interfaz' THEN 'interfaz' ELSE traducciones_textos.tipo END
    `);
  }
}

/** Mira lo publicado y apunta en la lista lo que aún no tiene traducción. */
export async function barrerTraducciones(db: any): Promise<number> {
  let n = 0;
  const todas: any[] = [];
  for (const s of SITIOS_TRADUCIDOS) {
    const { textos, paginas } = await recogerPublicado(db, s);
    todas.push(...paginas);
    for (const idioma of Object.keys(s.traducciones)) await guardarTextos(db, idioma, textos);
    n += textos.length;
  }
  paginasConocidas = todas;
  await recargarDiccionarios(db);
  return n;
}

/** Títulos y nombres cortos de lo publicado, sin leer los cuerpos: al arrancar las direcciones en
 *  inglés tienen que estar listas enseguida, no cuando acabe el primer barrido. */
async function cargarPaginasConocidas(db: any) {
  const todas: any[] = [];
  for (const s of SITIOS_TRADUCIDOS) {
    const raiz = (await db.execute(sql`SELECT id, title, config FROM knowledge_windows WHERE id = ${s.raiz}`)).rows[0] as any;
    if (!raiz) continue;
    const cfg = raiz.config?.sitio || {};
    const tablas = [cfg.proyectos, cfg.personas, cfg.sistemas].filter(Boolean).map(String);
    const pie = (await paginasDelPie(db, raiz)).map(p => p.id);
    todas.push({ title: raiz.title, slug: null });
    const r = await db.execute(sql`
      SELECT w.title, w.slug FROM knowledge_windows w
      WHERE w.deleted_at IS NULL AND w.archived_at IS NULL AND (w.id = ANY(string_to_array(${pie.join(',')}, ','))
        OR w.id IN (SELECT pagina_id FROM bd_filas WHERE tabla_id = ANY(string_to_array(${tablas.join(',')}, ',')) AND deleted_at IS NULL))
    `);
    todas.push(...(r.rows as any[]));
  }
  paginasConocidas = todas;
}

export async function recargarDiccionarios(db: any) {
  const filas = (await db.execute(sql`SELECT idioma, original, traduccion, tipo FROM traducciones_textos WHERE traduccion IS NOT NULL`)).rows as any[];
  const nuevos = new Map<string, Diccionario>();
  for (const f of filas) {
    const d = nuevos.get(f.idioma) || vacio();
    nuevos.set(f.idioma, d);
    d.textos.set(f.original, f.traduccion);
    d.valores.add(f.traduccion);
    // Al navegador va lo escrito en el programa y todo lo corto (etiquetas, filtros): pinta con ello lo que no viene del servidor.
    if (f.tipo === 'interfaz' || String(f.original).length <= 120) d.interfaz[f.original] = f.traduccion;
  }
  for (const d of nuevos.values()) {
    const usados = new Set<string>();
    for (const p of paginasConocidas) {
      const en = d.textos.get(String(p.title || '').trim());
      if (!en || (p.slug && String(p.slug).includes('/'))) continue;
      const es = p.slug || slugDe(p.title), nuevo = slugDe(en);
      if (!es || !nuevo || es === nuevo || usados.has(nuevo) || TRAMOS_RESERVADOS.has(nuevo)) continue;
      usados.add(nuevo); d.slugs.set(es, nuevo); d.inversos.set(nuevo, es);
    }
  }
  diccionarios.clear();
  for (const [k, v] of nuevos) diccionarios.set(k, v);
  const dominios = SITIOS_TRADUCIDOS.flatMap(s => Object.values(s.traducciones));
  const r = await db.execute(sql`SELECT dominio FROM dominios_paginas WHERE dominio IN (${sql.join(dominios.map(x => sql`${x}`), sql`, `)}) AND redirigir_a IS NULL AND entidad_id IS NOT NULL AND estado IN ('pendiente', 'activo')`);
  dominiosActivos = new Set((r.rows as any[]).map(x => String(x.dominio)));
}

/** Una traducción que pierde una dirección o una cifra no se acepta: vuelve a la lista. */
export function errorDeTraduccion(original: string, traduccion: string): string | null {
  if (!traduccion.trim()) return 'vacía';
  for (const u of original.match(/https?:\/\/[^\s)\]>"]+/g) || []) if (!traduccion.includes(u)) return `falta la dirección ${u}`;
  const cifras = (t: string) => (t.match(/\d+/g) || []).join('').split('').sort().join('');
  if (cifras(original) !== cifras(traduccion)) return 'las cifras no coinciden';
  return null;
}

const PARECE_ESPANOL = /[áéíóúñ¿¡]|\b(de|la|el|los|las|en|para|con|del|una?|que|tu|más|por|al)\b/i;
const visitas = new Map<string, { n: number; t: number }>();

function conToken(req: Request, res: Response): boolean {
  const clave = process.env.TRADUCCIONES_TOKEN || '';
  const dada = /^Bearer (.+)$/.exec(String(req.headers.authorization || ''))?.[1] || '';
  const a = Buffer.from(clave), b = Buffer.from(dada);
  if (!clave || a.length !== b.length || !crypto.timingSafeEqual(a, b)) { res.status(401).json({ error: 'Hace falta la llave de traducciones.' }); return false; }
  return true;
}

export function registrarTraducciones(app: Express, db: any) {
  const repasar = () => recargarDiccionarios(db).catch(e => console.error('[traducciones] diccionario:', e.message));
  const barrer = () => barrerTraducciones(db).catch(e => console.error('[traducciones] barrido:', e.message));
  cargarPaginasConocidas(db).catch(e => console.error('[traducciones] páginas:', e.message)).finally(repasar);
  setTimeout(barrer, 30_000).unref?.();
  setInterval(barrer, 15 * 60_000).unref?.();
  setInterval(repasar, 60_000).unref?.();

  // Delante de las rutas: lo que sale hacia el dominio traducido, ya traducido.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const host = hostDe(req);
    // Una sola dirección por página: `www.` lleva al dominio sin `www.`.
    if (host.startsWith('www.') && idiomaDeHost(host) && !req.path.startsWith('/.well-known/')) return res.redirect(301, `https://${host.slice(4)}${req.originalUrl}`);
    const idioma = req.method === 'GET' && /^\/api\/(sitio|bd\/tablas|bd\/paginas|conciencia\/mapa)/.test(req.path) ? idiomaDeHost(host) : null;
    if (!idioma) return next();
    const json = res.json.bind(res);
    res.json = (cuerpo: any) => {
      let b = cuerpo;
      const titulado = (t: unknown) => !t || estaTraducido(String(t), idioma);
      if (/^\/api\/bd\/tablas\//.test(req.path) && Array.isArray(b?.filas)) b = { ...b, filas: b.filas.filter((f: any) => titulado(f?.pagina?.titulo)) };
      if (req.path.startsWith('/api/sitio/portada/') && Array.isArray(b?.proyectos)) b = { ...b, proyectos: b.proyectos.filter((p: any) => titulado(p?.titulo)) };
      if (req.path === '/api/conciencia/mapa' && b && 'datos' in b) b = { ...b, datos: b.datos ?? MAPA_POR_DEFECTO, puedeGuardar: false };
      return json(traducirProfundo(b, host));
    };
    next();
  });

  app.get('/api/traducciones/pendientes', async (req: Request, res: Response) => {
    if (!conToken(req, res)) return;
    try {
      const idioma = String(req.query.idioma || 'en');
      const limite = Math.min(500, Math.max(1, Number(req.query.limite) || 200));
      await barrerTraducciones(db);
      const filas = (await db.execute(sql`
        SELECT hash, original, tipo, contexto FROM traducciones_textos
        WHERE idioma = ${idioma} AND traduccion IS NULL AND visto_at > now() - interval '3 days' ORDER BY contexto, creada_at LIMIT ${limite}
      `)).rows;
      const total = Number(((await db.execute(sql`SELECT count(*) AS n FROM traducciones_textos WHERE idioma = ${idioma} AND traduccion IS NULL AND visto_at > now() - interval '3 days'`)).rows[0] as any).n);
      res.set('Cache-Control', 'no-store').json({ idioma, total, tareas: filas });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  app.post('/api/traducciones', express.json({ limit: '8mb' }), async (req: Request, res: Response) => {
    if (!conToken(req, res)) return;
    try {
      const idioma = String(req.body?.idioma || 'en');
      const items: Array<{ hash: string; traduccion: string }> = Array.isArray(req.body?.items) ? req.body.items : [];
      let guardadas = 0;
      const rechazadas: Array<{ hash: string; motivo: string }> = [];
      for (const it of items.slice(0, 1000)) {
        const f = (await db.execute(sql`SELECT original FROM traducciones_textos WHERE idioma = ${idioma} AND hash = ${String(it.hash)}`)).rows[0] as any;
        if (!f) { rechazadas.push({ hash: String(it.hash), motivo: 'no existe' }); continue; }
        const motivo = errorDeTraduccion(f.original, String(it.traduccion || ''));
        if (motivo) { rechazadas.push({ hash: String(it.hash), motivo }); continue; }
        await db.execute(sql`UPDATE traducciones_textos SET traduccion = ${String(it.traduccion).trim()}, traducida_at = now() WHERE idioma = ${idioma} AND hash = ${String(it.hash)}`);
        guardadas++;
      }
      await recargarDiccionarios(db);
      res.json({ guardadas, rechazadas });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  app.post('/api/traducciones/interfaz', async (req: Request, res: Response) => {
    if (!conToken(req, res)) return;
    try {
      const idioma = String(req.body?.idioma || 'en');
      // Lo que se ve en pantalla, aunque sea una palabra en minúscula («proyectos»).
      const textos = (Array.isArray(req.body?.textos) ? req.body.textos : []).map((t: unknown) => String(t).trim()).filter((t: string) => t.length >= 2 && t.length <= 4000 && /\p{L}/u.test(t)).slice(0, 2000);
      await guardarTextos(db, idioma, textos.map((texto: string) => ({ texto, tipo: 'interfaz', contexto: String(req.body?.contexto || 'Interfaz') })));
      res.json({ apuntados: textos.length });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // El navegador avisa de lo escrito en el código que aún sale en español. Sin sesión, así que corto.
  app.post('/api/traducciones/faltan', async (req: Request, res: Response) => {
    try {
      const host = hostDe(req), idioma = idiomaDeHost(host);
      if (!idioma) return res.status(204).end();
      const ip = String(req.headers['cf-connecting-ip'] || req.ip || '');
      const v = visitas.get(ip);
      if (v && Date.now() - v.t < 3600_000 && v.n >= 20) return res.status(204).end();
      visitas.set(ip, v && Date.now() - v.t < 3600_000 ? { n: v.n + 1, t: v.t } : { n: 1, t: Date.now() });
      if (visitas.size > 5000) visitas.clear();
      const abiertas = Number(((await db.execute(sql`SELECT count(*) AS n FROM traducciones_textos WHERE idioma = ${idioma} AND traduccion IS NULL AND tipo = 'interfaz'`)).rows[0] as any).n);
      if (abiertas >= 3000) return res.status(204).end();
      const d = dic(idioma);
      const textos = (Array.isArray(req.body?.textos) ? req.body.textos : []).slice(0, 40).map((t: unknown) => String(t).trim())
        .filter((t: string) => t.length <= 300 && esTexto(t) && PARECE_ESPANOL.test(t) && !d.valores.has(t) && !d.textos.has(t));
      if (textos.length) await guardarTextos(db, idioma, textos.map((texto: string) => ({ texto, tipo: 'interfaz', contexto: `Visto en ${String(req.body?.camino || '').slice(0, 120)}` })));
      res.status(204).end();
    } catch { res.status(204).end(); }
  });
}
