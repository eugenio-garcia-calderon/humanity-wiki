// ============================================================================
// UNA NOTICIA ESCRITA COMO VIÑETA (2026-11-06, luzhumanidad.com)
// ============================================================================
// Las páginas de los proyectos citan lo que se ha publicado de ellos como
// viñetas: «[Título](https://…) — **Medio** · dd/mm/aaaa» (o «**Medio** · fecha —
// [Título](https://…)»). Aquí se leen, para pintarlas como tarjetas con su portada
// y el logo del medio (`GaleriaNoticias`) y para la recopilación de la portada del
// sitio (`seoEscaparate.ts`). Lo usan el navegador y el servidor: un solo criterio.

export type NoticiaDeBloque = {
  titulo: string; url: string; medio: string; fecha: string | null; fechaTexto: string | null;
  imagen: string | null; logo: string | null; video: boolean;
};

export const ENLACE_NOTICIA = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/;
const ID_YT = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** La fecha escrita junto al enlace («24/03/2021», «06/2018», «2021-03-24», «2019»). */
export function fechaDe(t: string): { iso: string; texto: string } | null {
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

/** La noticia que cuenta una viñeta con enlace, o null si no lo es. */
export function noticiaDeBloque(b: any): NoticiaDeBloque | null {
  if (b?.tipo !== 'lista' || typeof b.texto !== 'string') return null;
  const m = ENLACE_NOTICIA.exec(b.texto);
  if (!m) return null;
  const resto = b.texto.replace(m[0], ' ');
  const f = fechaDe(resto);
  const yt = ID_YT.exec(m[2]);
  let host = '';
  try { host = new URL(m[2]).hostname.replace(/^www\./, ''); } catch { /* sin dominio */ }
  return {
    titulo: m[1].replace(/\*\*/g, '').trim(),
    url: m[2],
    medio: ((/\*\*([^*]+)\*\*/.exec(resto) || [])[1] || host).replace(/\s*\(.*\)\s*$/, '').trim(),
    fecha: f?.iso || null,
    fechaTexto: f?.texto || null,
    imagen: typeof b.imagen === 'string' && b.imagen ? b.imagen : yt ? `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` : null,
    logo: typeof b.logo === 'string' && b.logo ? b.logo : null,
    video: !!yt || /vimeo\.com|youtube\.com|youtu\.be/.test(m[2]),
  };
}

/** Un título que abre la lista de lo publicado («En los medios», «En la prensa», «Más información»…). */
export const TITULO_NOTICIAS = /\b(medios|prensa|noticias|hablan de|referencias|fuentes|enlaces)\b|m[aá]s informaci[oó]n/i;

/**
 * Las viñetas de una lista de bloques que son noticias: las marcadas `estilo: 'noticia'` y, con
 * `porTitulo`, las viñetas con enlace que cuelgan de un título de noticias (hasta el título
 * siguiente). Las viñetas con enlace de cualquier otra sección («**Dónde verlo:** en
 * humanity.wiki») no lo son.
 */
export function bloquesNoticia(bloques: any[], porTitulo: boolean): Set<any> {
  const out = new Set<any>();
  let dentro = false;
  for (const b of Array.isArray(bloques) ? bloques : []) {
    if (!b || typeof b !== 'object') continue;
    if (b.tipo === 'titulo1' || b.tipo === 'titulo2' || b.tipo === 'titulo3') { dentro = porTitulo && TITULO_NOTICIAS.test(String(b.texto || '')); continue; }
    if (b.tipo !== 'lista') continue;
    if ((b.estilo === 'noticia' || dentro) && ENLACE_NOTICIA.test(String(b.texto || ''))) out.add(b);
  }
  return out;
}

const PLATAFORMAS = ['blogspot.com', 'wixsite.com', 'wordpress.com', 'github.io', 'substack.com'];
/** El dominio del medio de un enlace, para su logo: el de la noticia archivada si es de
 *  web.archive.org, `youtube.com` para cualquier YouTube y el dominio registrable en el resto
 *  («ayuda.comunidadsolar.es» → «comunidadsolar.es»; un blog de Blogger se queda entero). */
export function dominioDelMedio(url: string): string | null {
  let h = '';
  try { h = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; }
  if (!h) return null;
  if (h === 'web.archive.org') {
    const m = /\/web\/[^/]+\/(https?:\/\/.+)$/.exec(url);
    return m ? dominioDelMedio(m[1]) : null;
  }
  if (h === 'youtu.be' || h === 'm.youtube.com' || h === 'youtube-nocookie.com') return 'youtube.com';
  if (PLATAFORMAS.some(p => h.endsWith('.' + p))) return h;
  const e = h.split('.');
  if (e.length >= 3 && ['com', 'org', 'net', 'gob', 'edu', 'co', 'ac', 'gov'].includes(e[e.length - 2]) && e[e.length - 1].length === 2) return e.slice(-3).join('.');
  return e.slice(-2).join('.');
}
