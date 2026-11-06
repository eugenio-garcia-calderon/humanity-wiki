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

/** El orden de los estados en la portada (`VistaProyectosSitio.tsx`). */
const PESO_ESTADO: Record<string, number> = {
  'Estado inicial': 0, 'Desarrollo principal actual': 0, 'Foco principal': 0,
  'Proyecto futuro': 1, 'Desarrollo futuro': 1,
  'En curso': 2, 'En desarrollo': 2, 'En seguimiento': 2, 'Activo': 2,
  'Completado': 3, 'Ideación': 5,
};

type Proyecto = {
  pagina: string; fila: string; titulo: string; url: string; descripcion: string; portada: string | null;
  ano: string | null; estado: string | null; areas: string[]; equipo: string[]; cambio: number; peso: number; orden: number;
};
type Persona = { pagina: string; fila: string; titulo: string; url: string; foto: string | null; cambio: number; proyectos: string[] };
/** Una noticia que cita un proyecto (un enlace de las listas «En los medios» de su página). */
export type Noticia = {
  titulo: string; url: string; medio: string; fecha: string | null; fechaTexto: string | null;
  imagen: string | null; video: boolean; proyectos: Array<{ titulo: string; url: string }>;
};
type Modelo = {
  noticias: Noticia[];
  proyectos: Proyecto[];
  personas: Persona[];
  ocultas: Set<string>;
  porPagina: Map<string, Proyecto>;
  personaDe: Map<string, Persona>;
  secciones: Array<{ titulo: string; entradas: Array<{ titulo: string; url: string }> }>;
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
const recorta = (t: string, n: number) => {
  const s = t.replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const corte = s.slice(0, n - 1);
  return corte.slice(0, Math.max(corte.lastIndexOf(' '), n - 20)).replace(/[\s,.;:–-]+$/, '') + '…';
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** La fecha escrita junto al enlace («24/03/2021», «06/2018», «2021-03-24», «2019»). */
function fechaDe(t: string): { iso: string; texto: string } | null {
  let m = /\b(\d{2})\/(\d{2})\/(\d{4})\b/.exec(t);
  if (m) return { iso: `${m[3]}-${m[2]}-${m[1]}`, texto: `${Number(m[1])} ${MESES[Number(m[2]) - 1] || ''} ${m[3]}` };
  m = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(t);
  if (m) return { iso: `${m[1]}-${m[2]}-${m[3]}`, texto: `${Number(m[3])} ${MESES[Number(m[2]) - 1] || ''} ${m[1]}` };
  m = /\b(\d{2})\/(\d{4})\b/.exec(t);
  if (m) return { iso: `${m[2]}-${m[1]}`, texto: `${MESES[Number(m[1]) - 1] || ''} ${m[2]}` };
  m = /\b(\d{4})-(\d{2})\b/.exec(t);
  if (m) return { iso: `${m[1]}-${m[2]}`, texto: `${MESES[Number(m[2]) - 1] || ''} ${m[1]}` };
  m = /\b(20\d{2}|19\d{2})\b/.exec(t);
  return m ? { iso: m[1], texto: m[1] } : null;
}

async function construir(db: any, cfg: any): Promise<Modelo> {
  const tProy = String(cfg.proyectos || ''), tPers = String(cfg.personas || ''), tSist = String(cfg.sistemas || '');
  const cols = (await db.execute(sql`
    SELECT id, nombre, tipo, opciones, config FROM bd_columnas
    WHERE tabla_id = ${tProy} AND archived_at IS NULL ORDER BY orden
  `)).rows as any[];
  const cEstado = cols.find(c => c.tipo === 'seleccion' && c.nombre === 'Estado') || cols.find(c => c.tipo === 'seleccion');
  const cFecha = cols.find(c => c.tipo === 'fecha' && c.nombre === 'Fecha Inicio') || cols.find(c => c.tipo === 'fecha');
  const cArea = cols.find(c => c.tipo === 'relacion' && c.config?.tabla_destino === tSist);
  const cEquipo = cols.find(c => c.tipo === 'relacion' && c.config?.tabla_destino === tPers);
  const etiqueta = new Map<string, string>(((cEstado?.opciones as any[]) || []).map(o => [String(o.id), String(o.label)]));

  const filas = (await db.execute(sql`
    SELECT f.id, f.pagina_id, f.valores, f.oculta, f.orden, k.title, k.slug,
           k.config->>'subtitulo' AS sub, k.config->>'portada' AS portada, k.config->'bloques' AS bloques,
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
    for (const b of bloquesDe.get(p.pagina) || []) {
      if (b?.tipo !== 'lista' || typeof b.texto !== 'string') continue;
      const m = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/.exec(b.texto);
      if (!m) continue;
      const ya = porUrl.get(m[2]);
      if (ya) { if (!ya.proyectos.some(x => x.url === p.url)) ya.proyectos.push({ titulo: p.titulo, url: p.url }); continue; }
      const resto = b.texto.replace(m[0], ' ');
      const f = fechaDe(resto);
      const yt = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(m[2]);
      let host = '';
      try { host = new URL(m[2]).hostname.replace(/^www\./, ''); } catch { /* sin dominio */ }
      porUrl.set(m[2], {
        titulo: m[1].replace(/\*\*/g, '').trim(), url: m[2],
        medio: ((/\*\*([^*]+)\*\*/.exec(resto) || [])[1] || host).replace(/\s*\(.*\)\s*$/, '').trim(),
        fecha: f?.iso || null, fechaTexto: f?.texto || null,
        imagen: typeof b.imagen === 'string' ? b.imagen : yt ? `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` : null,
        video: !!yt || /vimeo\.com|youtube\.com|youtu\.be/.test(m[2]),
        proyectos: [{ titulo: p.titulo, url: p.url }],
      });
    }
  }
  const noticias = [...porUrl.values()].sort((x, y) => (y.fecha || '').localeCompare(x.fecha || '') || (y.imagen ? 1 : 0) - (x.imagen ? 1 : 0));

  return {
    noticias, proyectos, personas, ocultas, secciones,
    porPagina: new Map(proyectos.map(p => [p.pagina, p])),
    personaDe: new Map(personas.map(p => [p.pagina, p])),
  };
}

/** El modelo del escaparate de esa raíz, dos minutos en memoria. */
export function modeloEscaparate(db: any, raizId: string, cfg: any): Promise<Modelo> {
  const m = memoria.get(raizId);
  if (m && Date.now() - m.t < VIDA_MS) return m.m;
  const nuevo = construir(db, cfg);
  memoria.set(raizId, { t: Date.now(), m: nuevo });
  nuevo.catch(() => memoria.delete(raizId));
  return nuevo;
}

const escaparates = new Map<string, { t: number; cfg: any | null }>();
/** La config del sitio de esa raíz si es un escaparate (`null` si no). */
export async function configEscaparate(db: any, raizId: string): Promise<any | null> {
  const c = escaparates.get(raizId);
  if (c && Date.now() - c.t < VIDA_MS) return c.cfg;
  const r = (await db.execute(sql`SELECT config->'sitio' AS sitio FROM knowledge_windows WHERE id = ${raizId}`)).rows[0] as any;
  const cfg = r?.sitio?.escaparate === true ? r.sitio : null;
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

export function registrarSeoEscaparate(app?: Express, db?: any) {
  // Las noticias de un escaparate, para la sección de la portada (pública: son enlaces que ya
  // salen en las páginas de los proyectos).
  if (app && db) app.get('/api/sitio/noticias/:raiz', async (req: Request, res: Response) => {
    try {
      const cfg = await configEscaparate(db, String(req.params.raiz));
      if (!cfg) return res.status(404).json({ error: 'No es un escaparate.' });
      const m = await modeloEscaparate(db, String(req.params.raiz), cfg);
      res.set('Cache-Control', 'public, max-age=300').json({ noticias: m.noticias });
    } catch (e: any) { console.error('noticias:', e); res.status(500).json({ error: e.message }); }
  });
  registrarAmpliacion(async (db, req, pagina) => {
    if (!pagina || pagina.muro) return;
    const sitio = pagina.sitio;
    const cfg = sitio?.config;
    if (!cfg?.escaparate || !sitio.raizId) return;
    const m = await modeloEscaparate(db, sitio.raizId, cfg);

    // El mapa del pie va con la página (también la que pide el navegador):
    // así sale ya escrito en el HTML y no espera a ninguna consulta.
    if (cfg.pie?.sencillo) sitio.config = { ...cfg, pie: { ...cfg.pie, mapaProyectos: m.secciones } };
    rellenarAlts(pagina.config?.bloques, String(pagina.titulo || '').trim());
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
    const comunes = (alt: string | null) => [
      ...verificaciones,
      { property: 'og:locale', content: 'es_ES' },
      { property: 'og:site_name', content: marca },
      ...(alt ? [{ property: 'og:image:alt', content: alt }, { name: 'twitter:image:alt', content: alt }] : []),
    ];
    const org = { '@id': '/#organizacion' };
    const titular = cfg.titular || {};

    // ── LA PORTADA ──────────────────────────────────────────────────────
    if (pagina.id === sitio.raizId) {
      const lema = String(pagina.config?.subtitulo || '').trim();
      const nombreOrg = String(seo.organizacion || titular.nombre || marca).trim();
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
      ];
      meta.metas = comunes(lema ? `${marca} · ${lema}` : marca);
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
      ];
      meta.metas = comunes(p.portada ? (p.descripcion ? `${p.titulo}: ${p.descripcion}` : p.titulo) : null);
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
      ];
      meta.metas = comunes(persona.foto ? persona.titulo : null);
    }
  });
}
