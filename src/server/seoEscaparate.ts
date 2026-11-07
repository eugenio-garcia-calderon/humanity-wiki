// ============================================================================
// EL SEO DE UN SITIO ESCAPARATE (2026-11-06, Eugenio en luzhumanidad.com)
// ============================================================================
// «Prepara toda la web para que se indexe; descripción de las imágenes en el
// meta; un mapa web en el pie dividiendo los proyectos en categorías; que todas
// las URLs estén bien hechas; un trabajo exhaustivo para que el SEO sea
// impresionante.»
//
// Un sitio con `config.sitio.escaparate` (hoy luzhumanidad.com) es un
// laboratorio de proyectos: una portada, una ficha por proyecto (las filas de
// `sitio.proyectos`) y una por persona (`sitio.personas`). La plataforma los
// trataba como fichas de producto («Aeromóvil: datos, precio y opiniones»,
// `@type: Product`) y anunciaba en el sitemap cada pestaña, cada tabla y cada
// página vieja del sitio. Aquí se dice lo que son de verdad:
//
//   · La portada: `WebSite` + `Organization` (con sus datos legales, su logo y
//     sus perfiles en redes, `sitio.seo.perfiles`) + la lista de proyectos.
//   · Un proyecto: `Project` con su descripción, su año, su área, su equipo y
//     las noticias que hablan de él (los enlaces de sus listas), y sus migas.
//   · Una persona: `ProfilePage` con su `Person` y los proyectos en que está.
//   · Títulos de menos de 60 letras, descripciones de menos de 160, el texto
//     alternativo de la imagen al compartir (`og:image:alt`), el idioma y el
//     nombre del sitio. Lo oculto, `noindex`.
//   · El sitemap: la portada, los proyectos y las personas visibles, por su
//     dirección corta. Nada más.
//   · El mapa del pie: los proyectos por área, ya escritos en el HTML.
//
// Todo sale de los datos que la página enseña (lo marcado que no se ve es lo
// que Google castiga). Las direcciones van relativas: `sitios.ts` las completa
// con el dominio canónico.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { registrarAmpliacion } from './ampliarPagina';
import { slugDe } from '../components/sitio/sitioWeb';
import fs from 'fs';
import path from 'path';
import { bloquesNoticia, noticiaDeBloque, dominioDelMedio } from '../utils/noticias';
import { uploadsDir, rutaLocalDeUpload } from './uploads';
import { videosJsonLd, videosDeBloques, datosVideo } from './videosEscaparate';

// LOS LOGOS DE LOS MEDIOS (2026-11-06, Eugenio: «destacando el medio con los logos de esos
// periódicos»). Uno por dominio en /uploads/2026/11/logos/<dominio>.png (los baja y revisa
// `notas/logos.py`). Toda viñeta de «En los medios» sin `logo` recibe el de su dominio al
// servirse, también las que se añadan mañana desde el editor. La carpeta se lee cada 10 min.
const CARPETA_LOGOS = '2026/11/logos';
let logosEnDisco: { t: number; s: Set<string> } | null = null;
export function logoDelMedio(url: string): string | null {
  if (!logosEnDisco || Date.now() - logosEnDisco.t > 10 * 60_000) {
    let s = new Set<string>();
    try { s = new Set(fs.readdirSync(path.join(uploadsDir(), CARPETA_LOGOS)).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4))); } catch { /* aún sin logos */ }
    logosEnDisco = { t: Date.now(), s };
  }
  const d = dominioDelMedio(url);
  return d && logosEnDisco.s.has(d) ? `/uploads/${CARPETA_LOGOS}/${d}.png` : null;
}

/** El orden de los estados en la portada (`VistaProyectosSitio.tsx`). */
const PESO_ESTADO: Record<string, number> = {
  'Estado inicial': 0, 'Desarrollo principal actual': 0, 'Foco principal': 0,
  'Proyecto futuro': 1, 'Desarrollo futuro': 1,
  'En curso': 2, 'En desarrollo': 2, 'En seguimiento': 2, 'Activo': 2,
  'Completado': 3, 'Ideación': 5,
};

// ── DÓNDE ESTÁ CADA PROYECTO (2026-11-07, el mapa «Dónde trabajamos» de la portada) ──────────
// Eugenio pidió una portada con «dónde trabajamos»: cada proyecto con un sitio físico, una
// chincheta. El lugar se guarda en la config de la PÁGINA del proyecto (`config.lugar`), con
// su nombre, su región, su país y sus coordenadas, y sale de su propia página o de las noticias
// que la citan. Un proyecto sin lugar (una plataforma, un diseño, una campaña itinerante) no
// tiene chincheta: es mejor un mapa con huecos que uno con sitios inventados.
export type Lugar = { nombre: string; region: string | null; pais: string; lat: number; lon: number };
const textoCorto = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim().slice(0, n) : null);
/** El `config.lugar` de una página, si está completo y tiene sentido (si no, `null`). */
export function lugarValido(v: any): Lugar | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const nombre = textoCorto(v.nombre, 80), pais = textoCorto(v.pais, 60);
  const { lat, lon } = v;
  if (!nombre || !pais || typeof lat !== 'number' || typeof lon !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { nombre, region: textoCorto(v.region, 80), pais, lat: Math.round(lat * 1e4) / 1e4, lon: Math.round(lon * 1e4) / 1e4 };
}

/** El código ISO 3166-1 de un país por su nombre en español («España» → «ES»), que es lo que pide
 *  Google en `addressCountry` (2026-11-07, revisión). Se saca de `Intl.DisplayNames`, como en el
 *  mapa del cliente; un nombre que no se reconoce devuelve `null` y se escribe tal cual. */
let paisesIso: Map<string, string> | null = null;
const planoPais = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export function codigoPais(nombre: string): string | null {
  if (!paisesIso) {
    paisesIso = new Map();
    try {
      const dn = new Intl.DisplayNames(['es'], { type: 'region', fallback: 'none' });
      for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
        const c = String.fromCharCode(a, b), n = dn.of(c);
        if (n && n !== c && !paisesIso.has(planoPais(n))) paisesIso.set(planoPais(n), c);
      }
    } catch { /* sin los nombres de `Intl`: se queda el nombre del país */ }
  }
  return paisesIso.get(planoPais(nombre)) || null;
}

// ── LOS HITOS DE «NUESTRA HISTORIA» (2026-11-07) ────────────────────────────────────────────
// La línea del tiempo de la portada se pinta sola con el año de inicio de cada proyecto. Encima
// pueden ir unos pocos hitos escritos a mano en `config.sitio.historia` de la raíz, y cada uno
// lleva su fuente: un hito sin fuente no se enseña.
export type Hito = { ano: string; texto: string; fuente: { nombre: string; url: string }; proyecto: string | null };
export function hitosValidos(v: unknown): Hito[] {
  if (!Array.isArray(v)) return [];
  const out: Hito[] = [];
  for (const h of v.slice(0, 40)) {
    const ano = /^(19|20)\d\d$/.exec(String(h?.ano ?? '').trim())?.[0];
    const texto = textoCorto(h?.texto, 240);
    const url = typeof h?.fuente?.url === 'string' && /^https:\/\/[^\s"<>]+$/.test(h.fuente.url.trim()) ? h.fuente.url.trim() : null;
    const nombre = textoCorto(h?.fuente?.nombre, 80);
    if (!ano || !texto || !url || !nombre) continue;
    out.push({ ano, texto, fuente: { nombre, url }, proyecto: textoCorto(h?.proyecto, 40) });
  }
  return out;
}

type Proyecto = {
  pagina: string; fila: string; titulo: string; url: string; descripcion: string; portada: string | null;
  ano: string | null; estado: string | null; areas: string[]; equipo: string[]; cambio: number; peso: number; orden: number;
  /** El color de su estado en la tabla (el mismo punto que en su tarjeta). */
  color: string | null;
  lugar: Lugar | null;
  /** Una imagen suya servida desde casa (`/uploads/…`): la portada, o si es de fuera (un vídeo de
   *  YouTube), la primera foto de su página. La portada del escaparate no pide nada a terceros. */
  imagenPropia: string | null;
};
const esPropia = (u: unknown): u is string => typeof u === 'string' && /^\/uploads\/(?!privado\/)/.test(u);
function imagenPropia(portada: string | null, bloques: unknown, prof = 0): string | null {
  if (esPropia(portada)) return portada;
  if (!Array.isArray(bloques) || prof > 4) return null;
  for (const b of bloques) {
    if (b?.tipo === 'imagen' && esPropia(b.url)) return b.url;
    const dentro = imagenPropia(null, b?.bloques, prof + 1)
      || (Array.isArray(b?.columnas) ? b.columnas.map((c: any) => imagenPropia(null, Array.isArray(c) ? c : c?.bloques, prof + 1)).find(Boolean) || null : null);
    if (dentro) return dentro;
  }
  return null;
}
type Persona = { pagina: string; fila: string; titulo: string; url: string; foto: string | null; cambio: number; proyectos: string[] };
/** Una noticia que cita un proyecto (un enlace de las listas «En los medios» de su página). */
export type Noticia = {
  titulo: string; url: string; medio: string; fecha: string | null; fechaTexto: string | null;
  imagen: string | null; logo: string | null; video: boolean; proyectos: Array<{ titulo: string; url: string }>;
};
type Modelo = {
  noticias: Noticia[];
  proyectos: Proyecto[];
  personas: Persona[];
  ocultas: Set<string>;
  porPagina: Map<string, Proyecto>;
  personaDe: Map<string, Persona>;
  secciones: Array<{ titulo: string; entradas: Array<{ titulo: string; url: string }> }>;
  /** La imagen al compartir de la portada: la de cualquier página del sitio que no tenga ninguna. */
  imagenRaiz: string | null;
};

const memoria = new Map<string, { t: number; m: Promise<Modelo> }>();
const VIDA_MS = 2 * 60_000;

/** La dirección corta de una fila: la legible si la tiene, si no `/su-nombre` (la red, `sitios.ts`). */
const direccion = (slug: string | null, titulo: string) =>
  slug && slug.includes('/') ? `/${slug}` : `/${slugDe(titulo)}`;
const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
/** Una portada que es un vídeo de YouTube no es una imagen: se usa su miniatura. */
const ID_YT = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;
export const imagenDeVerdad = (u: string | null | undefined): string | null => {
  if (!u) return null;
  const yt = ID_YT.exec(u);
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
  return /^https?:\/\//.test(u) && !/\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i.test(u) ? null : u;
};
/** «a, b y c». */
const enumerar = (xs: string[]) => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
const recorta = (t: string, n: number) => {
  const s = t.replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const corte = s.slice(0, n - 1);
  return corte.slice(0, Math.max(corte.lastIndexOf(' '), n - 20)).replace(/[\s,.;:–-]+$/, '') + '…';
};

async function construir(db: any, cfg: any, raizId: string): Promise<Modelo> {
  const tProy = String(cfg.proyectos || ''), tPers = String(cfg.personas || ''), tSist = String(cfg.sistemas || '');
  const imagenRaiz = ((await db.execute(sql`SELECT config->>'imagenCompartir' AS img FROM knowledge_windows WHERE id = ${raizId}`)).rows[0] as any)?.img || null;
  const cols = (await db.execute(sql`
    SELECT id, nombre, tipo, opciones, config FROM bd_columnas
    WHERE tabla_id = ${tProy} AND archived_at IS NULL ORDER BY orden
  `)).rows as any[];
  const cEstado = cols.find(c => c.tipo === 'seleccion' && c.nombre === 'Estado') || cols.find(c => c.tipo === 'seleccion');
  const cFecha = cols.find(c => c.tipo === 'fecha' && c.nombre === 'Fecha Inicio') || cols.find(c => c.tipo === 'fecha');
  const cArea = cols.find(c => c.tipo === 'relacion' && c.config?.tabla_destino === tSist);
  const cEquipo = cols.find(c => c.tipo === 'relacion' && c.config?.tabla_destino === tPers);
  const etiqueta = new Map<string, string>(((cEstado?.opciones as any[]) || []).map(o => [String(o.id), String(o.label)]));
  const colorDe = new Map<string, string>(((cEstado?.opciones as any[]) || [])
    .filter(o => /^#[0-9a-f]{6}$/i.test(String(o.color || ''))).map(o => [String(o.id), String(o.color)]));

  const filas = (await db.execute(sql`
    SELECT f.id, f.pagina_id, f.valores, f.oculta, f.orden, k.title, k.slug,
           k.config->>'subtitulo' AS sub, k.config->>'portada' AS portada, k.config->'bloques' AS bloques,
           k.config->'lugar' AS lugar,
           GREATEST(k.updated_at, f.updated_at) AS cambio
    FROM bd_filas f JOIN knowledge_windows k ON k.id = f.pagina_id
    WHERE f.tabla_id = ${tProy} AND f.deleted_at IS NULL AND f.archived_at IS NULL
      AND k.deleted_at IS NULL AND k.archived_at IS NULL
  `)).rows as any[];
  const pers = (await db.execute(sql`
    SELECT f.id, f.pagina_id, f.oculta, k.title, k.slug, k.config->>'portada' AS portada,
           GREATEST(k.updated_at, f.updated_at) AS cambio
    FROM bd_filas f JOIN knowledge_windows k ON k.id = f.pagina_id
    WHERE f.tabla_id = ${tPers} AND f.deleted_at IS NULL AND f.archived_at IS NULL
      AND k.deleted_at IS NULL AND k.archived_at IS NULL
  `)).rows as any[];
  const colsRel = [cArea?.id, cEquipo?.id].filter(Boolean) as string[];
  const enlaces = colsRel.length ? (await db.execute(sql`
    SELECT columna_id, fila_origen, destino_id FROM bd_enlaces
    WHERE columna_id IN (${sql.join(colsRel.map(c => sql`${c}`), sql`, `)}) ORDER BY orden
  `)).rows as any[] : [];
  const areasIds = [...new Set(enlaces.filter(e => e.columna_id === cArea?.id).map(e => String(e.destino_id)))];
  const nombreArea = new Map<string, string>();
  if (areasIds.length) {
    const r = await db.execute(sql`
      SELECT f.id, k.title FROM bd_filas f JOIN knowledge_windows k ON k.id = f.pagina_id
      WHERE f.id IN (${sql.join(areasIds.map(a => sql`${a}`), sql`, `)})
    `);
    for (const x of r.rows as any[]) nombreArea.set(String(x.id), String(x.title || '').trim());
  }

  const ocultas = new Set<string>();
  const personaFila = new Map<string, any>(pers.map(p => [String(p.id), p]));
  const proyectos: Proyecto[] = [];
  for (const f of filas) {
    if (f.oculta) { ocultas.add(String(f.pagina_id)); continue; }
    const titulo = String(f.title || '').trim();
    if (!titulo) continue;
    const v = f.valores || {};
    const estado = cEstado ? etiqueta.get(String(v[cEstado.id] || '')) || null : null;
    const ano = cFecha ? (/\b(\d{4})\b/.exec(String(v[cFecha.id] ?? '')) || [])[1] || null : null;
    const suyos = enlaces.filter(e => e.fila_origen === f.id);
    proyectos.push({
      pagina: String(f.pagina_id), fila: String(f.id), titulo, url: direccion(f.slug, titulo),
      descripcion: String(f.sub || '').trim(), portada: imagenDeVerdad(f.portada), ano, estado,
      areas: suyos.filter(e => e.columna_id === cArea?.id).map(e => nombreArea.get(String(e.destino_id)) || '').filter(Boolean),
      equipo: suyos.filter(e => e.columna_id === cEquipo?.id).map(e => personaFila.get(String(e.destino_id))).filter(p => p && !p.oculta).map(p => String(p.pagina_id)),
      cambio: new Date(f.cambio).getTime(), peso: estado ? PESO_ESTADO[estado] ?? 4 : 4, orden: Number(f.orden) || 0,
      color: cEstado ? colorDe.get(String(v[cEstado.id] || '')) || null : null,
      lugar: lugarValido(f.lugar),
      imagenPropia: imagenPropia(imagenDeVerdad(f.portada), f.bloques),
    });
  }
  proyectos.sort((a, b) => a.peso - b.peso || a.orden - b.orden);

  const personas: Persona[] = [];
  for (const p of pers) {
    if (p.oculta) { ocultas.add(String(p.pagina_id)); continue; }
    const titulo = String(p.title || '').trim();
    if (!titulo) continue;
    personas.push({
      pagina: String(p.pagina_id), fila: String(p.id), titulo, url: direccion(p.slug, titulo), foto: imagenDeVerdad(p.portada),
      cambio: new Date(p.cambio).getTime(), proyectos: proyectos.filter(x => x.equipo.includes(String(p.pagina_id))).map(x => x.pagina),
    });
  }

  // EL MAPA DEL PIE: los proyectos por su (primera) área, las áreas con más
  // proyectos delante, y dentro el orden de la portada.
  const grupos = new Map<string, Proyecto[]>();
  for (const p of proyectos) {
    const a = p.areas[0] || 'Otros';
    grupos.set(a, [...(grupos.get(a) || []), p]);
  }
  const secciones = [...grupos.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'es'))
    .map(([titulo, ps]) => ({ titulo, entradas: ps.map(p => ({ titulo: p.titulo, url: p.url })) }));

  // LAS NOTICIAS (2026-11-06, Eugenio: «debajo de las personas, una compilación de todas las
  // noticias, muy visual, con portada y titulares de cada proyecto»). Salen de las listas de
  // enlaces de cada proyecto, con la portada que se guardó en el bloque (`imagen`).
  const porUrl = new Map<string, Noticia>();
  const bloquesDe = new Map<string, any[]>(filas.map(f => [String(f.pagina_id), Array.isArray(f.bloques) ? f.bloques : []]));
  for (const p of proyectos) {
    // Solo las viñetas de «En los medios» (o marcadas `estilo: noticia`): una viñeta con enlace
    // de otra sección («**Dónde verlo:** en humanity.wiki») no es una noticia (2026-11-06).
    for (const b of bloquesNoticia(bloquesDe.get(p.pagina) || [], true)) {
      const n = noticiaDeBloque(b);
      if (!n) continue;
      const ya = porUrl.get(n.url);
      if (ya) {
        if (!ya.proyectos.some(x => x.url === p.url)) ya.proyectos.push({ titulo: p.titulo, url: p.url });
        if (!ya.imagen && n.imagen) ya.imagen = n.imagen;
        if (!ya.logo && n.logo) ya.logo = n.logo;
        continue;
      }
      porUrl.set(n.url, { ...n, logo: n.logo || logoDelMedio(n.url), proyectos: [{ titulo: p.titulo, url: p.url }] });
    }
  }
  const noticias = [...porUrl.values()].sort((x, y) => (y.fecha || '').localeCompare(x.fecha || '') || (y.imagen ? 1 : 0) - (x.imagen ? 1 : 0));

  return {
    noticias, proyectos, personas, ocultas, secciones,
    porPagina: new Map(proyectos.map(p => [p.pagina, p])),
    personaDe: new Map(personas.map(p => [p.pagina, p])),
    imagenRaiz: typeof imagenRaiz === 'string' && imagenRaiz ? imagenRaiz : null,
  };
}

/** El modelo del escaparate de esa raíz, dos minutos en memoria. */
export function modeloEscaparate(db: any, raizId: string, cfg: any): Promise<Modelo> {
  const m = memoria.get(raizId);
  if (m && Date.now() - m.t < VIDA_MS) return m.m;
  const nuevo = construir(db, cfg, raizId);
  memoria.set(raizId, { t: Date.now(), m: nuevo });
  nuevo.catch(() => memoria.delete(raizId));
  return nuevo;
}

const escaparates = new Map<string, { t: number; cfg: any | null }>();
/** La forma de un id de página (`KW…`, mayúsculas, cifras y `_`): lo demás ni se busca. */
export const idDePagina = (v: unknown): v is string => typeof v === 'string' && /^[A-Z0-9_]{6,40}$/.test(v);
/** La config del sitio de esa raíz si es un escaparate (`null` si no). */
export async function configEscaparate(db: any, raizId: string): Promise<any | null> {
  const c = escaparates.get(raizId);
  if (c && Date.now() - c.t < VIDA_MS) return c.cfg;
  const r = (await db.execute(sql`SELECT config->'sitio' AS sitio FROM knowledge_windows WHERE id = ${raizId}`)).rows[0] as any;
  const cfg = r?.sitio?.escaparate === true ? r.sitio : null;
  // La memoria no crece sin fin (2026-11-07, revisión): cada id que alguien se invente en las rutas
  // públicas se quedaba guardado para siempre. Pasado un tope, se tiran los caducados y los «no».
  if (escaparates.size >= 256) for (const [k, v] of escaparates) if (!v.cfg || Date.now() - v.t >= VIDA_MS) escaparates.delete(k);
  escaparates.set(raizId, { t: Date.now(), cfg });
  return cfg;
}

/** Las direcciones del sitemap de un escaparate: la portada, los proyectos y las personas visibles. */
export async function urlsEscaparate(db: any, host: string, raiz: any): Promise<Array<{ loc: string; mod: string; t: number; img: string | null }>> {
  const m = await modeloEscaparate(db, raiz.id, raiz.config.sitio);
  const fecha = (t: number) => new Date(t).toISOString().slice(0, 10);
  const abs = (u: string | null) => !u ? null : /^https?:\/\//.test(u) ? u : `https://${host}${u.startsWith('/') ? '' : '/'}${u}`;
  const ultimo = Math.max(new Date(raiz.updated_at).getTime(), ...m.proyectos.map(p => p.cambio), 0);
  return [
    { loc: `https://${host}/`, mod: fecha(ultimo), t: ultimo, img: abs(raiz.config?.imagenCompartir || raiz.config?.portada || m.proyectos[0]?.portada || null) },
    ...m.proyectos.map(p => ({ loc: `https://${host}${p.url}`, mod: fecha(p.cambio), t: p.cambio, img: abs(p.portada) })),
    ...m.personas.map(p => ({ loc: `https://${host}${p.url}`, mod: fecha(p.cambio), t: p.cambio, img: abs(p.foto) })),
  ];
}

/** Los bloques de imagen sin texto alternativo reciben uno: el pie si lo hay,
 *  si no el nombre de la página y su número. Una imagen sin `alt` no existe
 *  para un buscador ni para quien no ve. */
function rellenarAlts(bloques: any, titulo: string, n = { i: 0 }, prof = 0) {
  if (!Array.isArray(bloques) || prof > 6) return;
  for (const b of bloques) {
    if (b?.tipo === 'imagen' && b.url && !b.alt) {
      n.i += 1;
      b.alt = String(b.pie || '').trim() || (n.i === 1 ? titulo : `${titulo} · imagen ${n.i}`);
    }
    rellenarAlts(b?.bloques, titulo, n, prof + 1);
    if (Array.isArray(b?.columnas)) for (const c of b.columnas) rellenarAlts(Array.isArray(c) ? c : c?.bloques, titulo, n, prof + 1);
  }
}

/** Los enlaces de fuera que la página cita en sus listas («En los medios»). */
function referencias(bloques: any, out: Array<{ nombre: string; url: string }> = [], prof = 0) {
  if (!Array.isArray(bloques) || prof > 6) return out;
  for (const b of bloques) {
    if ((b?.tipo === 'lista' || b?.tipo === 'numerada' || b?.tipo === 'parrafo') && typeof b.texto === 'string') {
      for (const x of b.texto.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)) {
        if (!out.some(o => o.url === x[2])) out.push({ nombre: x[1].replace(/\*\*/g, '').trim(), url: x[2] });
      }
    }
    referencias(b?.bloques, out, prof + 1);
  }
  return out;
}

/** LO QUE PIDE LA PORTADA DEL ESCAPARATE (2026-11-07): la presentación con sus cifras, el mapa
 *  «Dónde trabajamos» y «Nuestra historia». Todo sale del mismo modelo que el SEO y «En los
 *  medios»: los proyectos visibles, su año de inicio, su estado, su lugar y la cuenta de las
 *  noticias. Ninguna cifra se escribe a mano. */
export function datosPortada(m: Pick<Modelo, 'proyectos' | 'noticias'>, cfg: any) {
  return {
    proyectos: m.proyectos.map(p => ({
      pagina: p.pagina, titulo: p.titulo, url: p.url, descripcion: p.descripcion, portada: p.imagenPropia,
      ano: p.ano, estado: p.estado, color: p.color, areas: p.areas, lugar: p.lugar,
    })),
    noticias: m.noticias.length,
    medios: new Set(m.noticias.map(n => n.medio)).size,
    historia: hitosValidos(cfg?.historia),
  };
}

// ── LA IMAGEN AL COMPARTIR (2026-11-07, WhatsApp, LinkedIn, X, Facebook y Telegram) ──────────
// Cada página pública del escaparate lleva su tarjeta de 1200 × 630 (`scripts/imagenes-compartir/`,
// en `config.imagenCompartir`). Aquí se dice de la imagen lo que las redes necesitan para pintarla a
// la primera: su medida (`og:image:width` y `height`; sin ella, Facebook no la enseña la primera vez
// que alguien comparte el enlace, la baja por detrás y sale a la segunda), su tipo y un texto
// alternativo que cuenta lo que se ve.
/** La carpeta de las tarjetas: todas son JPEG de 1200 × 630 (las hace y las comprueba el generador). */
const TARJETAS = '/uploads/2026/11/compartir/';
export const esTarjeta = (u: unknown): boolean => typeof u === 'string' && u.startsWith(TARJETAS) && /\.jpe?g$/i.test(u);
const TIPOS_IMAGEN: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', heif: 'image/avif' };
export type Medida = { ancho: number; alto: number; tipo: string };
const medidas = new Map<string, { t: number; m: Medida | null }>();
let sharpCargado: any = null;
/** La medida y el tipo de una imagen subida al sitio, leídos de su cabecera una sola vez; `null`
 *  si no está en el disco o no se puede leer (y entonces se vuelve a mirar a los cinco minutos). */
export async function medidaDeSubida(url: string): Promise<Medida | null> {
  const limpia = url.split(/[?#]/)[0];
  const ya = medidas.get(limpia);
  if (ya && (ya.m || Date.now() - ya.t < 5 * 60_000)) return ya.m;
  let m: Medida | null = null;
  const ruta = /^\/uploads\/(?!privado\/)/.test(limpia) ? rutaLocalDeUpload(limpia) : null;
  if (ruta && fs.existsSync(ruta)) {
    if (esTarjeta(limpia)) m = { ancho: 1200, alto: 630, tipo: 'image/jpeg' };
    else try {
      if (!sharpCargado) sharpCargado = (await import('sharp')).default;
      const x = await sharpCargado(ruta, { failOn: 'none' }).metadata();
      const girada = (x.orientation || 1) >= 5;
      const tipo = TIPOS_IMAGEN[String(x.format || '')];
      if (x.width && x.height && tipo) m = { ancho: girada ? x.height : x.width, alto: girada ? x.width : x.height, tipo };
    } catch { /* no es una imagen que se pueda leer */ }
  }
  if (medidas.size >= 2000) medidas.clear();
  medidas.set(limpia, { t: Date.now(), m });
  return m;
}
/** La miniatura grande de YouTube mide siempre 480 × 360. */
const MINIATURA_YT = /^https:\/\/i\.ytimg\.com\/vi\/[\w-]+\/hqdefault\.jpg$/;
/** La imagen al compartir de una página, por el mismo orden que `imagenDe` en `sitios.ts` (la
 *  elegida, la portada, la primera imagen), saltándose la que no está en el disco: un `og:image`
 *  roto deja la tarjeta sin foto. Sin ninguna, la de la portada del sitio. */
export async function imagenAlCompartir(config: any, raiz: string | null): Promise<{ url: string; medida: Medida | null } | null> {
  const bloques = Array.isArray(config?.bloques) ? config.bloques : [];
  const candidatas = [config?.imagenCompartir, imagenDeVerdad(config?.portada), bloques.find((b: any) => b?.tipo === 'imagen' && b.url)?.url, raiz];
  for (const c of candidatas) {
    if (typeof c !== 'string' || !c.trim()) continue;
    if (MINIATURA_YT.test(c)) return { url: c, medida: { ancho: 480, alto: 360, tipo: 'image/jpeg' } };
    if (/^https:\/\//.test(c)) return { url: c, medida: null };
    if (!c.startsWith('/uploads/')) continue;
    const medida = await medidaDeSubida(c);
    if (medida) return { url: c, medida };
  }
  return null;
}

export function registrarSeoEscaparate(app?: Express, db?: any) {
  // Las noticias de un escaparate, para la sección de la portada (pública: son enlaces que ya
  // salen en las páginas de los proyectos).
  // Las dos rutas son públicas: un id con otra forma no llega a la base de datos, y un fallo se
  // cuenta en el registro del servidor, no en la respuesta (2026-11-07, revisión).
  if (app && db) app.get('/api/sitio/noticias/:raiz', async (req: Request, res: Response) => {
    try {
      const raiz = req.params.raiz;
      const cfg = idDePagina(raiz) ? await configEscaparate(db, raiz) : null;
      if (!cfg) return res.status(404).json({ error: 'No es un escaparate.' });
      const m = await modeloEscaparate(db, raiz, cfg);
      res.set('Cache-Control', 'public, max-age=300').json({ noticias: m.noticias });
    } catch (e: any) { console.error('noticias:', e); res.status(500).json({ error: 'Error interno' }); }
  });
  // La portada: cifras, lugares y años (pública: es lo mismo que enseñan las fichas de los proyectos).
  if (app && db) app.get('/api/sitio/portada/:raiz', async (req: Request, res: Response) => {
    try {
      const raiz = req.params.raiz;
      const cfg = idDePagina(raiz) ? await configEscaparate(db, raiz) : null;
      if (!cfg) return res.status(404).json({ error: 'No es un escaparate.' });
      const m = await modeloEscaparate(db, raiz, cfg);
      res.set('Cache-Control', 'public, max-age=300').json(datosPortada(m, cfg));
    } catch (e: any) { console.error('portada:', e); res.status(500).json({ error: 'Error interno' }); }
  });
  registrarAmpliacion(async (db, req, pagina) => {
    if (!pagina || pagina.muro) return;
    const sitio = pagina.sitio;
    const cfg = sitio?.config;
    if (!cfg?.escaparate || !sitio.raizId) return;
    const m = await modeloEscaparate(db, sitio.raizId, cfg);

    // LOS DATOS DE LOS VÍDEOS (`config.sitio.videos`, ver `videosEscaparate.ts`) son del servidor:
    // no viajan al navegador con cada página (unos 15 KB que nadie pinta), ni en la config del
    // sitio ni en la de la portada, que es donde se guardan (2026-11-07).
    const { videos: datosVideos, ...cfgPublica } = cfg;
    if (pagina.id === sitio.raizId && pagina.config?.sitio?.videos) {
      const { videos: _soloServidor, ...sitioPublico } = pagina.config.sitio;
      pagina.config = { ...pagina.config, sitio: sitioPublico };
    }
    // El mapa del pie va con la página (también la que pide el navegador):
    // así sale ya escrito en el HTML y no espera a ninguna consulta.
    sitio.config = cfg.pie?.sencillo ? { ...cfgPublica, pie: { ...cfg.pie, mapaProyectos: m.secciones } } : cfgPublica;
    rellenarAlts(pagina.config?.bloques, String(pagina.titulo || '').trim());
    // Cada noticia de «En los medios», con el logo de su medio.
    for (const b of bloquesNoticia(pagina.config?.bloques || [], true)) {
      if (b.logo) continue;
      const n = noticiaDeBloque(b);
      const logo = n ? logoDelMedio(n.url) : null;
      if (logo) b.logo = logo;
    }
    // La imagen al compartir: si la portada es un vídeo, su miniatura (si no, `og:image`
    // apuntaba a la página de YouTube).
    if (pagina.config && !pagina.config.imagenCompartir && pagina.config.portada && imagenDeVerdad(pagina.config.portada) !== pagina.config.portada) {
      const img = imagenDeVerdad(pagina.config.portada);
      if (img) pagina.config.imagenCompartir = img;
    }

    // Lo demás sólo cuenta en el HTML del servidor (el `<head>`).
    if (req) return;
    const marca = String(sitio.titulo || '').trim() || 'Luz & Humanidad';
    const seo = cfg.seo || {};
    const meta = (pagina.meta = pagina.meta || {});
    meta.manda = true;
    // Las verificaciones de Search Console y Bing (`seoSitio.ts`) se quedan.
    const verificaciones = (meta.metas || []).filter((x: any) => x?.name === 'google-site-verification' || x?.name === 'msvalidate.01');
    // La imagen al compartir, medida (`imagenAlCompartir`): `sitios.ts` escribe en `og:image` la que
    // quede en `config.imagenCompartir`, y aquí van su medida, su tipo y su texto alternativo.
    const imagen = pagina.config ? await imagenAlCompartir(pagina.config, m.imagenRaiz) : null;
    if (imagen) pagina.config.imagenCompartir = imagen.url;
    // La de la portada prestada a una página sin imagen propia habla del sitio, no de la página.
    const prestada = !!imagen && imagen.url === m.imagenRaiz && pagina.id !== sitio.raizId;
    const tarjeta = esTarjeta(imagen?.url) && !prestada;
    const comunes = (texto: string | null, alt = prestada ? marca : texto) => [
      ...verificaciones,
      { property: 'og:locale', content: 'es_ES' },
      { property: 'og:site_name', content: marca },
      ...(imagen?.medida ? [
        { property: 'og:image:width', content: String(imagen.medida.ancho) },
        { property: 'og:image:height', content: String(imagen.medida.alto) },
        { property: 'og:image:type', content: imagen.medida.tipo },
      ] : []),
      ...(imagen && alt ? [{ property: 'og:image:alt', content: alt }, { name: 'twitter:image:alt', content: alt }] : []),
    ];
    const org = { '@id': '/#organizacion' };
    const titular = cfg.titular || {};
    // LOS VÍDEOS DE LA PÁGINA, PARA GOOGLE (2026-11-07, `videosEscaparate.ts`): un `VideoObject` por
    // cada vídeo de YouTube que tenga datos; si lo publicó el canal de la organización, firmado por
    // ella. Y su título, para el enlace con miniatura que escribe el HTML del servidor (`htmlBloques.ts`).
    const nombreOrg = String(seo.organizacion || titular.nombre || marca).trim();
    const videos = videosJsonLd(pagina.config?.bloques, datosVideos, { '@type': 'NGO', '@id': '/#organizacion', name: nombreOrg, url: '/' });
    pagina.videos = Object.fromEntries(videosDeBloques(pagina.config?.bloques)
      .map(id => [id, datosVideo(datosVideos?.[id])?.titulo]).filter(([, t]) => t));

    // ── LA PORTADA ──────────────────────────────────────────────────────
    if (pagina.id === sitio.raizId) {
      const lema = String(pagina.config?.subtitulo || '').trim();
      meta.titulo = recorta(lema ? `${marca} · ${lema}` : marca, 60);
      meta.descripcion = recorta(String(seo.descripcion || `${lema || marca}: ${m.proyectos.slice(0, 6).map(p => p.titulo).join(', ')} y más proyectos.`), 160);
      meta.ogType = 'website';
      meta.indexable = true;
      const logo = typeof sitio.icono === 'string' && /^(https?:|\/)/.test(sitio.icono) ? sitio.icono : undefined;
      const perfiles = lista(seo.perfiles).filter(u => /^https:\/\//.test(u));
      meta.jsonLd = [
        {
          '@context': 'https://schema.org', '@type': 'WebSite', '@id': '/#web', name: marca,
          ...(lista(seo.otrosNombres).length ? { alternateName: lista(seo.otrosNombres) } : {}),
          url: '{{canonica}}', inLanguage: 'es-ES', description: meta.descripcion, publisher: org,
        },
        {
          '@context': 'https://schema.org', '@type': 'NGO', '@id': '/#organizacion', name: nombreOrg,
          alternateName: [marca, ...lista(seo.otrosNombres)].filter((x, i, a) => x !== nombreOrg && a.indexOf(x) === i),
          ...(titular.nombre && titular.nombre !== nombreOrg ? { legalName: titular.nombre } : {}),
          ...(titular.nif ? { taxID: titular.nif } : {}),
          url: '{{canonica}}', ...(logo ? { logo, image: logo } : {}),
          ...(cfg.pie?.contacto?.email ? { email: cfg.pie.contacto.email } : {}),
          ...(titular.domicilio ? { address: { '@type': 'PostalAddress', streetAddress: titular.domicilio, addressCountry: 'ES' } } : {}),
          ...(seo.fundador ? { founder: { '@type': 'Person', name: seo.fundador, ...(m.personas.find(p => p.titulo === seo.fundador) ? { url: m.personas.find(p => p.titulo === seo.fundador)!.url } : {}) } } : {}),
          ...(perfiles.length ? { sameAs: perfiles } : {}),
        },
        {
          '@context': 'https://schema.org', '@type': 'ItemList', name: lema ? `Proyectos del ${lema}` : 'Proyectos',
          numberOfItems: m.proyectos.length,
          itemListElement: m.proyectos.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.titulo, url: p.url })),
        },
        ...videos,
      ];
      // La tarjeta de la portada lleva la frase de la presentación sobre un mosaico de proyectos.
      const frase = String(cfg.portada?.lema || '').trim().replace(/[.\s]+$/, '');
      meta.metas = comunes(tarjeta && frase
        ? `${lema ? `${marca} · ${lema}` : marca}: «${frase}», sobre un mosaico de fotos de sus proyectos`
        : lema ? `${marca} · ${lema}` : marca);
      return;
    }

    // ── LO OCULTO NO SE INDEXA ──────────────────────────────────────────
    if (m.ocultas.has(pagina.id)) { meta.indexable = false; return; }

    // ── UN PROYECTO ─────────────────────────────────────────────────────
    const p = m.porPagina.get(pagina.id);
    if (p) {
      const area = p.areas[0];
      const conArea = area ? `${p.titulo} · ${area} | ${marca}` : '';
      meta.titulo = conArea && conArea.length <= 60 ? conArea : recorta(`${p.titulo} | ${marca}`, 60);
      const quien = String(seo.organizacion || marca);
      const contexto = `Proyecto${area ? ` de ${area.toLowerCase()}` : ''} de ${quien}${p.ano ? `${p.estado === 'Completado' ? ' en' : ' desde'} ${p.ano}` : ''}${p.estado ? ` (${p.estado.toLowerCase()})` : ''}.`;
      meta.descripcion = recorta(p.descripcion ? `${p.descripcion.replace(/[.\s]+$/, '')}. ${contexto}` : contexto, 160);
      meta.ogType = 'article';
      meta.indexable = true;
      const fotos = [p.portada, ...((pagina.config?.bloques || []) as any[]).filter(b => b?.tipo === 'imagen' && b.url).map(b => b.url)]
        .filter((x, i, a): x is string => !!x && a.indexOf(x) === i).slice(0, 8);
      const equipo = p.equipo.map(id => m.personaDe.get(id)).filter(Boolean) as Persona[];
      const refs = referencias(pagina.config?.bloques).slice(0, 25);
      meta.jsonLd = [
        {
          '@context': 'https://schema.org', '@type': 'Project', '@id': `${p.url}#proyecto`,
          name: p.titulo, url: '{{canonica}}', inLanguage: 'es-ES',
          ...(p.descripcion ? { description: p.descripcion } : {}),
          ...(fotos.length ? { image: fotos } : {}),
          ...(p.ano ? { foundingDate: p.ano } : {}),
          // Su lugar, el mismo que su chincheta en el mapa de la portada (2026-11-07).
          ...(p.lugar ? { location: {
            '@type': 'Place', name: p.lugar.nombre,
            address: { '@type': 'PostalAddress', ...(p.lugar.region ? { addressRegion: p.lugar.region } : {}), addressCountry: codigoPais(p.lugar.pais) || p.lugar.pais },
            geo: { '@type': 'GeoCoordinates', latitude: p.lugar.lat, longitude: p.lugar.lon },
          } } : {}),
          ...(p.areas.length ? { keywords: p.areas.join(', ') } : {}),
          parentOrganization: org,
          ...(equipo.length ? { member: equipo.map(x => ({ '@type': 'Person', name: x.titulo, url: x.url })) } : {}),
          ...(refs.length ? { subjectOf: refs.map(r => ({ '@type': 'CreativeWork', name: r.nombre, url: r.url })) } : {}),
        },
        {
          '@context': 'https://schema.org', '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: marca, item: '{{inicio}}' },
            { '@type': 'ListItem', position: 2, name: p.titulo, item: '{{canonica}}' },
          ],
        },
        ...videos,
      ];
      // La tarjeta: lo que se lee en ella (el nombre, «año · área · estado» y de quién es) y de qué va
      // la foto, como el texto alternativo de la portada en la página.
      const linea = [p.ano && (p.estado === 'Desarrollo principal actual' || p.estado === 'Foco principal' ? `desde ${p.ano}` : p.ano), area, p.estado].filter(Boolean).join(' · ');
      meta.metas = comunes(tarjeta
        ? `${p.titulo}${p.descripcion ? `: ${p.descripcion.replace(/[.\s]+$/, '')}` : ''}${linea ? ` (${linea})` : ''} · ${marca}`
        : p.descripcion ? `${p.titulo}: ${p.descripcion}` : p.titulo);
      return;
    }

    // ── UNA PERSONA ─────────────────────────────────────────────────────
    const persona = m.personaDe.get(pagina.id);
    if (persona) {
      const suyos = persona.proyectos.map(id => m.porPagina.get(id)).filter(Boolean) as Proyecto[];
      const quien = String(seo.organizacion || marca);
      meta.titulo = recorta(`${persona.titulo} | ${marca}`, 60);
      meta.descripcion = recorta(suyos.length
        ? `${persona.titulo} forma parte del equipo de ${quien} en ${suyos.slice(0, 4).map(x => x.titulo).join(', ')}${suyos.length > 4 ? ' y otros proyectos' : ''}.`
        : `${persona.titulo}, del equipo de ${quien}.`, 160);
      meta.ogType = 'profile';
      meta.indexable = true;
      meta.jsonLd = [
        {
          '@context': 'https://schema.org', '@type': 'ProfilePage', url: '{{canonica}}', inLanguage: 'es-ES',
          mainEntity: {
            '@type': 'Person', name: persona.titulo, url: '{{canonica}}',
            ...(persona.foto ? { image: persona.foto } : {}),
            memberOf: org,
            ...(suyos.length ? { subjectOf: suyos.map(x => ({ '@type': 'Project', name: x.titulo, url: x.url })) } : {}),
          },
        },
        {
          '@context': 'https://schema.org', '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: marca, item: '{{inicio}}' },
            { '@type': 'ListItem', position: 2, name: persona.titulo, item: '{{canonica}}' },
          ],
        },
        ...videos,
      ];
      meta.metas = comunes(tarjeta
        ? `Foto de ${persona.titulo}${suyos.length ? `, del equipo de ${enumerar(suyos.slice(0, 4).map(x => x.titulo))}` : ''} · ${marca}`
        : persona.titulo);
      return;
    }

    // ── CUALQUIER OTRA PÁGINA DEL SITIO (2026-11-07: colabora, prensa, quiénes somos…) ──────
    // Sin esto se quedaban sin idioma, sin nombre del sitio y sin la medida de su imagen.
    const titulo = String(pagina.titulo || '').trim();
    const sub = String(pagina.config?.subtitulo || '').trim();
    meta.metas = [
      ...(meta.metas || []).filter((x: any) => !verificaciones.includes(x)),
      ...comunes(tarjeta ? `${titulo}${sub ? `: ${sub.replace(/[.\s]+$/, '')}` : ''} · ${marca}` : titulo),
    ];
    if (videos.length) meta.jsonLd = [...(Array.isArray(meta.jsonLd) ? meta.jsonLd : meta.jsonLd ? [meta.jsonLd] : []), ...videos];
  });
}
