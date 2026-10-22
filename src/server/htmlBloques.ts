// ============================================================================
// EL CONTENIDO DE LA PÁGINA, ESCRITO EN EL HTML (2026-10-18, Wikiproducts W2)
// ============================================================================
// Hasta hoy el HTML de una página publicada llevaba el título, la descripción
// y la cabecera; el CUERPO viajaba como JSON dentro de `window.__SITIO__` y lo
// pintaba React en el navegador. Google ejecuta JavaScript (con retraso), pero
// los rastreadores de los buscadores de IA —GPTBot, OAI-SearchBot, ClaudeBot,
// PerplexityBot— en general no: leían una página y veían su título, nada más.
// Requisito R1 del plan de SEO de Wikiproducts
// (`/mnt/project-files/wikiproducto/seo/requisitos-tecnicos.md`).
//
// Esto convierte los bloques de una página en HTML semántico y estático:
// títulos `<h2>`, párrafos, listas, tablas de verdad (`<table>`), imágenes con
// `alt`, enlaces internos. Se escribe dentro de `#root` y `createRoot` lo
// sustituye por la página viva cuando llega el JavaScript.
//
// ── EL MISMO CONTENIDO PARA TODOS ───────────────────────────────────────────
// No se mira quién pide. Servir a los robots un HTML distinto del de las
// personas es *cloaking* y Google lo castiga. Por eso aquí sólo se escribe lo
// que la página enseña al leerla (`BloquesLectura.tsx`), nunca más: ni las
// columnas que su autor ocultó, ni los bloques de miembros (llegan ya
// filtrados por `filtrarBloques`).
//
// ── UN BLOQUE NUEVO TRAE SU HTML ────────────────────────────────────────────
// `registrarHtml(tipo, fn)` es el enchufe: un bloque que no sabe escribirse
// aquí no rompe nada (no sale en el HTML, sale cuando arranca React), pero
// tampoco existe para un buscador de IA. Los bloques de Wikiproducts (ficha,
// comparador, valoraciones…) deben registrarse.
import { sql } from 'drizzle-orm';
import { formatear } from '../components/tablas/Celda';
import { miniatura } from '../utils/miniatura';

/** Lo que hace falta saber, ya preguntado a la base de datos, para escribir
 *  los bloques sin ir y volver por cada uno. */
export interface ContextoHtml {
  /** La dirección de una página dentro del sitio por el que se entró. */
  enlacePagina: (id: string) => string;
  /** La de una ficha con dirección legible (`categoria/producto`, SEO R2,
   *  `rutasFila.ts`). Sin ella, las fichas van por `enlacePagina`. */
  enlaceRuta?: (slug: string) => string;
  /** Las bases de datos que enseña la página (por bloque: ver `claveTabla`). */
  tablas: Map<string, TablaHtml>;
  /** Títulos de las subpáginas enlazadas. */
  titulos: Map<string, string>;
  /** Lo que un bloque registrado haya querido precargar (por tipo). */
  extra: Map<string, any>;
  /** La página que se escribe, tal como la dejaron las ampliaciones
   *  (`ampliarPagina.ts`): p. ej. `pagina.ficha` de la plantilla de ficha. */
  pagina?: any;
}

export interface TablaHtml {
  titulo: string;
  descripcion: string;
  columnas: Array<{ id: string; nombre: string; tipo: string; opciones?: any[]; config?: any }>;
  filas: Array<{ id: string; paginaId: string | null; ruta?: string | null; nombre: string; portada: string | null; valores: Record<string, any> }>;
  /** Cuántas filas tiene en total (se escriben como mucho `MAX_FILAS`). */
  total: number;
}

/** Cuántas filas de una base de datos se escriben en el HTML. Más allá, el
 *  HTML pesa más de lo que ayuda: la página propia de la base de datos
 *  (`/bd/:id`) y el sitemap llevan al resto. */
const MAX_FILAS = 500;

/** Cuántos niveles de bloques dentro de bloques se recorren. */
const PROFUNDIDAD = 12;

// ── EL ENCHUFE PARA LOS BLOQUES NUEVOS ──────────────────────────────────────

type Escritor = (b: any, ctx: ContextoHtml, hijos: (lista: any[]) => string) => string;
type Precarga = (db: any, bloques: any[], ctx: ContextoHtml) => Promise<void>;

const escritores = new Map<string, Escritor>();
const precargas: Precarga[] = [];

/**
 * Un tipo de bloque que sabe escribirse en HTML. `precargar` recibe TODOS los
 * bloques de la página (aplanados) y puede dejar en `ctx.extra` lo que su
 * escritor necesite, en una sola consulta.
 */
export function registrarHtml(tipo: string, escribir: Escritor, precargar?: Precarga) {
  escritores.set(tipo, escribir);
  if (precargar) precargas.push(precargar);
}

// ── TEXTO SEGURO ────────────────────────────────────────────────────────────

export const esc = (t: unknown) => String(t ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Sólo direcciones que no ejecutan nada: `javascript:` y compañía fuera. */
export function hrefSeguro(href: string): string | null {
  const h = String(href || '').trim();
  if (/^(https?:|mailto:|tel:)/i.test(h)) return h;
  if (h.startsWith('/') && !h.startsWith('//')) return h;
  if (h.startsWith('#')) return h;
  return null;
}

// El mismo patrón que `TextoEnriquecido.tsx`, sin las fórmulas: una fórmula
// se escribe tal cual (su TeX), que es texto legible.
const RE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"»])/g;

/** El marcado en línea (negrita, cursiva, código, enlaces) a HTML. */
export function enLinea(texto: string, ctx: Pick<ContextoHtml, 'enlacePagina'>): string {
  const t = String(texto || '');
  let out = '';
  let ultimo = 0;
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(t))) {
    if (m.index > ultimo) out += esc(t.slice(ultimo, m.index));
    const s = m[0];
    if (s.startsWith('**')) out += `<strong>${esc(s.slice(2, -2))}</strong>`;
    else if (s.startsWith('`')) out += `<code>${esc(s.slice(1, -1))}</code>`;
    else if (s.startsWith('*')) out += `<em>${esc(s.slice(1, -1))}</em>`;
    else if (s.startsWith('[')) {
      const l = s.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (!l) out += esc(s);
      else {
        // Las menciones: una página se enlaza dentro del sitio; una fecha o
        // una persona son texto (la ficha de una persona no es del sitio).
        const pag = l[2].match(/^\/paginas\/([A-Za-z0-9_-]+)$/);
        if (pag) out += `<a href="${esc(ctx.enlacePagina(pag[1]))}">${esc(l[1])}</a>`;
        else if (/^fecha:|^\/personas\//.test(l[2])) out += esc(l[1]);
        else {
          const h = hrefSeguro(l[2]);
          out += h ? enlace(h, esc(l[1])) : esc(l[1]);
        }
      }
    } else {
      const h = hrefSeguro(s);
      out += h ? enlace(h, esc(s.replace(/^https?:\/\/(www\.)?/i, ''))) : esc(s);
    }
    ultimo = m.index + s.length;
  }
  if (ultimo < t.length) out += esc(t.slice(ultimo));
  return out;
}

const enlace = (href: string, dentro: string) => /^https?:/i.test(href)
  ? `<a href="${esc(href)}" rel="noopener" target="_blank">${dentro}</a>`
  : `<a href="${esc(href)}">${dentro}</a>`;

// ── PRECARGA ────────────────────────────────────────────────────────────────

/** Todos los bloques, también los de dentro, en una lista. */
function aplanar(bloques: any[], n = 0, out: any[] = []): any[] {
  if (n > PROFUNDIDAD) return out;
  for (const b of Array.isArray(bloques) ? bloques : []) {
    if (!b || typeof b !== 'object') continue;
    out.push(b);
    if (Array.isArray(b.bloques)) aplanar(b.bloques, n + 1, out);
    // Los de maqueta guardan sus hijos por columnas.
    if (Array.isArray(b.columnas)) for (const c of b.columnas) aplanar(c?.bloques, n + 1, out);
  }
  return out;
}

/** La primera columna de texto es el nombre de la fila (`tituloFila.ts`). */
async function tablaHtml(db: any, tablaId: string, b: any): Promise<TablaHtml | null> {
  const t = (await db.execute(sql`
    SELECT titulo, descripcion FROM bd_tablas WHERE id = ${tablaId} AND deleted_at IS NULL AND archived_at IS NULL
  `)).rows[0] as any;
  if (!t) return null;
  const cols = (await db.execute(sql`
    SELECT id, nombre, tipo, opciones, config FROM bd_columnas
    WHERE tabla_id = ${tablaId} AND archived_at IS NULL ORDER BY orden, created_at
  `)).rows as any[];
  const colTitulo = cols.find(c => c.tipo === 'texto')?.id || null;
  // Las columnas que se ven, como las decide `Rejilla`: la vista que abre el
  // bloque (`vista:<id>`, o la primera vista compartida de su forma); en una
  // galería, las propiedades guardadas en esa vista, si no las del bloque y
  // si no las tres primeras; en una tabla, todas menos las que la vista
  // oculta. Nunca las que su autor ocultó siempre, y sólo las que se pueden
  // escribir como texto sin otra consulta: las relaciones, los ficheros y las
  // calculadas se quedan para React.
  const NO = new Set(['relacion', 'persona', 'proyecto', 'publicacion', 'imagen', 'video', 'documento', 'formula', 'agregado', 'condicional', 'compra']);
  const sel = String(b?.vistaBd || 'galeria');
  const vistaId = sel.startsWith('vista:') ? sel.slice(6) : null;
  const vista = (await db.execute(sql`
    SELECT forma, ocultas, config FROM bd_vistas
    WHERE tabla_id = ${tablaId} AND usuario_id IS NULL AND archived_at IS NULL
      AND (${vistaId}::text IS NOT NULL AND id = ${vistaId} OR ${vistaId}::text IS NULL AND forma = ${sel})
    ORDER BY orden LIMIT 1
  `)).rows[0] as any;
  const forma = vista?.forma || (vistaId ? 'tabla' : sel);
  const candidatas = cols.filter(c => c.id !== colTitulo && c.config?.visibilidad !== 'nunca');
  let elegidas: any[];
  if (forma === 'galeria' || forma === 'carrusel') {
    const ids: string[] | null = Array.isArray(vista?.config?.propiedades) ? vista.config.propiedades
      : Array.isArray(b?.propsGaleria) && b.propsGaleria.length ? b.propsGaleria : null;
    elegidas = ids ? ids.map(id => candidatas.find(c => c.id === id)).filter(Boolean) : candidatas.slice(0, 3);
  } else {
    const ocultas = new Set<string>(Array.isArray(vista?.ocultas) ? vista.ocultas : []);
    elegidas = candidatas.filter(c => !ocultas.has(c.id));
  }
  const columnas = (elegidas as any[]).filter(c => !NO.has(c.tipo));

  const total = Number(((await db.execute(sql`
    SELECT count(*)::int AS n FROM bd_filas WHERE tabla_id = ${tablaId} AND archived_at IS NULL AND deleted_at IS NULL AND oculta = false
  `)).rows[0] as any)?.n || 0);
  const filas = (await db.execute(sql`
    SELECT f.id, f.valores, f.pagina_id, pw.title, pw.slug, pw.config->>'portada' AS portada
    FROM bd_filas f
    LEFT JOIN knowledge_windows pw ON pw.id = f.pagina_id AND pw.deleted_at IS NULL AND pw.archived_at IS NULL
    -- Sin las entradas ocultas (0154): este HTML lo lee cualquiera.
    WHERE f.tabla_id = ${tablaId} AND f.archived_at IS NULL AND f.deleted_at IS NULL AND f.oculta = false
    ORDER BY f.orden, f.created_at LIMIT ${MAX_FILAS}
  `)).rows as any[];
  return {
    titulo: String(t.titulo || '').trim(),
    descripcion: String(t.descripcion || '').trim(),
    columnas,
    filas: filas.map(f => ({
      id: f.id,
      paginaId: f.pagina_id || null,
      ruta: f.slug && String(f.slug).includes('/') ? String(f.slug) : null,
      nombre: String((colTitulo && f.valores?.[colTitulo]) || f.title || '').trim(),
      portada: f.portada || null,
      valores: f.valores || {},
    })),
    total,
  };
}

/** La misma tabla puede verse en dos bloques con vistas distintas. */
const claveTabla = (b: any) => `${b.tabla_id || b.tablaId || ''}|${b.vistaBd || ''}|${(b.propsGaleria || []).join(',')}`;

/** Pregunta de una vez lo que los bloques de la página necesitan. */
export async function prepararHtml(db: any, bloques: any[], enlacePagina: (id: string) => string, pagina?: any): Promise<ContextoHtml> {
  const ctx: ContextoHtml = { enlacePagina, tablas: new Map(), titulos: new Map(), extra: new Map(), pagina };
  // También en `extra`, para quien ya la busque ahí.
  if (pagina) ctx.extra.set('pagina', pagina);
  const todos = aplanar(bloques);
  for (const b of todos) {
    const tablaId = b.tipo === 'basedatos' ? (b.tabla_id || b.tablaId) : null;
    if (tablaId && !ctx.tablas.has(claveTabla(b))) {
      const t = await tablaHtml(db, String(tablaId), b);
      if (t) ctx.tablas.set(claveTabla(b), t);
    }
  }
  const subs = [...new Set(todos.filter(b => b.tipo === 'subpagina' && b.entityId).map(b => String(b.entityId)))];
  if (subs.length) {
    const r = await db.execute(sql`
      SELECT id, title FROM knowledge_windows
      WHERE id = ANY(string_to_array(${subs.join(',')}, ',')) AND deleted_at IS NULL AND archived_at IS NULL
    `);
    for (const x of r.rows as any[]) ctx.titulos.set(x.id, String(x.title || '').trim());
  }
  for (const p of precargas) {
    try { await p(db, todos, ctx); } catch (e) { console.error('htmlBloques: precarga', e); }
  }
  return ctx;
}

// ── LOS BLOQUES ─────────────────────────────────────────────────────────────

/** Un bloque `basedatos` como tabla: lo que un buscador puede leer y citar. */
function tablaEnHtml(t: TablaHtml, b: any, ctx: ContextoHtml): string {
  const cab = !b.tituloOculto && t.titulo ? `<h2>${esc(t.titulo)}</h2>` : '';
  // Como en la página: con el título oculto tampoco va la descripción (`Rejilla`).
  const desc = !b.tituloOculto && t.descripcion ? `<p>${enLinea(t.descripcion, ctx)}</p>` : '';
  if (!t.filas.length) return `<section>${cab}${desc}</section>`;
  const th = ['Nombre', ...t.columnas.map(c => c.nombre)].map(x => `<th scope="col">${esc(x)}</th>`).join('');
  const filas = t.filas.map(f => {
    const nombre = esc(f.nombre || 'Sin título');
    const img = f.portada && hrefSeguro(f.portada)
      ? `<img src="${esc(miniatura(f.portada, 64))}" alt="${nombre}" loading="lazy" width="64" height="64"> ` : '';
    const href = f.ruta && ctx.enlaceRuta ? ctx.enlaceRuta(f.ruta) : f.paginaId ? ctx.enlacePagina(f.paginaId) : null;
    const primera = href ? `<a href="${esc(href)}">${img}${nombre}</a>` : `${img}${nombre}`;
    const celdas = t.columnas.map(c => {
      const v = f.valores[c.id];
      const texto = v === undefined || v === null ? '' : formatear({ estado: 'ok', valor: v }, c as any);
      const h = c.tipo === 'url' ? hrefSeguro(String(v || '')) : null;
      return `<td>${h ? enlace(h, esc(texto)) : esc(texto)}</td>`;
    }).join('');
    return `<tr><th scope="row">${primera}</th>${celdas}</tr>`;
  }).join('');
  const mas = t.total > t.filas.length ? `<p>${t.filas.length} de ${t.total}.</p>` : '';
  return `<section>${cab}${desc}<table><thead><tr>${th}</tr></thead><tbody>${filas}</tbody></table>${mas}</section>`;
}

/** Un bloque. `hijos` escribe una lista de bloques (para los que contienen). */
function bloqueEnHtml(b: any, ctx: ContextoHtml, hijos: (lista: any[]) => string, todos: any[], i: number): string {
  const propio = escritores.get(b.tipo);
  if (propio) {
    try { return propio(b, ctx, hijos); } catch (e) { console.error('htmlBloques:', b.tipo, e); return ''; }
  }
  const txt = () => enLinea(b.texto || '', ctx);
  const dentro = Array.isArray(b.bloques) ? b.bloques : [];
  switch (b.tipo) {
    // `<h1>` es el título de la página (la cabecera). Los títulos de dentro
    // bajan un escalón: un solo h1 por página (R14).
    case 'titulo1': return `<h2 id="${esc(b.id || '')}">${txt()}</h2>`;
    case 'titulo2': return `<h3 id="${esc(b.id || '')}">${txt()}</h3>`;
    case 'titulo3': return `<h4 id="${esc(b.id || '')}">${txt()}</h4>`;
    case 'parrafo': return b.texto ? `<p>${txt()}</p>` : '';
    case 'cita': return `<blockquote>${txt()}</blockquote>`;
    case 'codigo': return `<pre><code>${esc(b.texto || '')}</code></pre>`;
    case 'ecuacion': return `<p><code>${esc(b.texto || '')}</code></p>`;
    case 'separador': return '<hr>';
    case 'aviso': return `<aside><p>${txt()}</p>${hijos(dentro)}</aside>`;
    case 'desplegable':
      // `<details>`: lo de dentro está en el HTML aunque se vea cerrado.
      return `<details${b.abierto ? ' open' : ''}><summary>${txt()}</summary>${hijos(dentro)}</details>`;
    case 'sincronizado': return hijos(dentro);
    case 'lista': case 'numerada': case 'tarea': {
      // Los ítems seguidos del mismo tipo forman UNA lista: sólo el primero la abre.
      const etiqueta = b.tipo === 'numerada' ? 'ol' : 'ul';
      if (todos[i - 1]?.tipo === b.tipo) return '';
      let html = '';
      for (let k = i; k < todos.length && todos[k]?.tipo === b.tipo; k++) {
        const x = todos[k];
        const marca = x.tipo === 'tarea' ? (x.hecho ? '☑ ' : '☐ ') : '';
        const sub = Array.isArray(x.bloques) && x.bloques.length ? hijos(x.bloques) : '';
        html += `<li>${marca}${enLinea(x.texto || '', ctx)}${sub}</li>`;
      }
      return `<${etiqueta}>${html}</${etiqueta}>`;
    }
    case 'imagen': {
      const h = hrefSeguro(b.url || '');
      if (!h) return '';
      const pie = b.pie ? `<figcaption>${enLinea(b.pie, ctx)}</figcaption>` : '';
      return `<figure><img src="${esc(miniatura(h, 1000))}" alt="${esc(b.pie || b.texto || '')}" loading="lazy">${pie}</figure>`;
    }
    case 'medio': {
      const h = hrefSeguro(b.url || '');
      return h ? `<p>${enlace(h, esc(b.pie || b.texto || b.url))}</p>` : '';
    }
    case 'tabla': {
      const f: string[][] = Array.isArray(b.filas) ? b.filas : [];
      if (!f.length) return '';
      const [cab, ...resto] = f;
      return `<table><thead><tr>${cab.map(c => `<th scope="col">${enLinea(c, ctx)}</th>`).join('')}</tr></thead>`
        + `<tbody>${resto.map(r => `<tr>${r.map(c => `<td>${enLinea(c, ctx)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    case 'basedatos': {
      const t = ctx.tablas.get(claveTabla(b));
      return t ? tablaEnHtml(t, b, ctx) : '';
    }
    case 'subpagina': {
      if (!b.entityId) return '';
      const titulo = ctx.titulos.get(String(b.entityId)) ?? b.pubTitulo;
      // Una subpágina borrada no es un enlace: sería un 404 dentro del sitio.
      if (titulo === undefined) return '';
      // Ya está en las tarjetas del bloque «secciones» de esta página.
      if ((ctx.extra.get('subpaginas-en-tarjetas') as Set<string> | undefined)?.has(String(b.entityId))) return '';
      return `<p><a href="${esc(ctx.enlacePagina(String(b.entityId)))}">${esc(titulo || 'Sin título')}</a></p>`;
    }
    case 'marcador': {
      const h = hrefSeguro(b.url || '');
      if (!h) return '';
      const d = b.enlaceDescripcion ? ` — ${esc(b.enlaceDescripcion)}` : '';
      return `<p>${enlace(h, esc(b.enlaceTitulo || b.url))}${d}</p>`;
    }
    case 'boton': {
      const h = b.boton?.tipo === 'enlace' ? hrefSeguro(b.boton.url || '') : null;
      return h ? `<p>${enlace(h, esc(b.texto || h))}</p>` : '';
    }
    case 'portada': {
      const t = b.titulo ? `<h2>${esc(b.titulo)}</h2>` : '';
      const s = b.subtitulo ? `<p>${enLinea(b.subtitulo, ctx)}</p>` : '';
      const h = b.boton_url ? hrefSeguro(b.boton_url) : null;
      const bt = h && b.boton_texto ? `<p>${enlace(h, esc(b.boton_texto))}</p>` : '';
      return `<section>${t}${s}${bt}</section>`;
    }
    case 'columnas': case 'franja': {
      const t = b.titulo ? `<h2>${esc(b.titulo)}</h2>` : '';
      const cols = Array.isArray(b.columnas) ? b.columnas.map((c: any) => hijos(c?.bloques || [])).join('') : '';
      return `<section>${t}${cols}${hijos(dentro)}</section>`;
    }
    // Lo que vive fuera de la página (una web incrustada, una pizarra, un
    // producto de la tienda, las migas que se preguntan al pintar) no se
    // escribe: React lo trae. Un `embed` de terceros nunca va al HTML.
    default:
      return '';
  }
}

/** Una lista de bloques, ya en HTML. */
export function bloquesEnHtml(bloques: any[], ctx: ContextoHtml, n = 0): string {
  if (n > PROFUNDIDAD) return '';
  const lista = (Array.isArray(bloques) ? bloques : []).filter(b => b && typeof b === 'object');
  const hijos = (l: any[]) => bloquesEnHtml(l, ctx, n + 1);
  let out = '';
  lista.forEach((b, i) => {
    const html = bloqueEnHtml(b, ctx, hijos, lista, i);
    // Los hijos de un bloque normal van debajo (los que contienen ya los pintaron).
    const contiene = ['desplegable', 'aviso', 'sincronizado', 'lista', 'numerada', 'tarea', 'columnas', 'franja'].includes(b.tipo) || escritores.has(b.tipo);
    out += html + (!contiene && Array.isArray(b.bloques) && b.bloques.length ? hijos(b.bloques) : '');
  });
  return out;
}

/**
 * El cuerpo entero de una página publicada: sus bloques en HTML, listos para
 * ir dentro del `<article>`. `pagina` es lo que contesta `paginaPublica`
 * (`sitios.ts`), ya filtrado para un anónimo.
 */
export async function cuerpoEnHtml(db: any, pagina: any, enlacePagina: (id: string) => string, enlaceRuta?: (slug: string) => string): Promise<string> {
  const bloques = pagina?.config?.bloques || pagina?.config?.blocks || [];
  if (!Array.isArray(bloques) || !bloques.length) return '';
  const ctx = await prepararHtml(db, bloques, enlacePagina, pagina);
  ctx.enlaceRuta = enlaceRuta;
  return bloquesEnHtml(bloques, ctx);
}

// ── LA PRESENTACIÓN Y LA INFOGRAFÍA (2026-10-22) ────────────────────────────
// Todo su texto vive en `datos`: aquí se escribe como títulos, párrafos e
// imágenes, para que la página se lea y se indexe sin JavaScript.
const parrafosHtml = (t: unknown, ctx: ContextoHtml) => String(t || '').split(/\n\s*\n/).filter(Boolean).map(p => `<p>${enLinea(p, ctx)}</p>`).join('');
const itemsHtml = (items: unknown, ctx: ContextoHtml) => {
  const lista = Array.isArray(items) ? items.filter((x: any) => x && typeof x === 'object') : [];
  if (!lista.length) return '';
  return `<ul>${lista.map((it: any) => `<li>${[it.fecha, it.valor].filter(Boolean).map(esc).join(' · ')}${it.fecha || it.valor ? ' — ' : ''}${it.titulo ? `<strong>${esc(it.titulo)}</strong>. ` : ''}${enLinea(String(it.texto || ''), ctx)}</li>`).join('')}</ul>`;
};
registrarHtml('presentacion', (b, ctx) => {
  const secciones = Array.isArray(b.datos?.secciones) ? b.datos.secciones : [];
  return secciones.filter((s: any) => s && typeof s === 'object').map((s: any) => {
    const t = s.titulo ? `<h2${s.id ? ` id="${esc(s.id)}"` : ''}>${esc(String(s.titulo).replace(/\*\*/g, ''))}</h2>` : '';
    const img = s.imagen ? `<img src="${esc(s.imagen)}" alt="${esc(s.pie || String(s.titulo || '').replace(/\*\*/g, ''))}" loading="lazy">` : '';
    const bots = (Array.isArray(s.botones) ? s.botones : []).map((x: any) => { const h = x?.url ? hrefSeguro(x.url) : null; return h && x.texto ? `<p>${enlace(h, esc(x.texto))}</p>` : ''; }).join('');
    return `<section>${s.antetitulo ? `<p>${esc(s.antetitulo)}</p>` : ''}${t}${parrafosHtml(s.texto, ctx)}${itemsHtml(s.items, ctx)}${img}${bots}</section>`;
  }).join('');
});
registrarHtml('infografiaRed', (b, ctx) => {
  const d = b.datos || {};
  return `<section>${d.titulo ? `<h2>${esc(d.titulo)}</h2>` : ''}${parrafosHtml(d.texto, ctx)}${itemsHtml(d.pasos, ctx)}</section>`;
});
