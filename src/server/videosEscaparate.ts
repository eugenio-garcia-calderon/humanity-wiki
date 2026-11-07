// ============================================================================
// LOS VÍDEOS DEL ESCAPARATE, PARA GOOGLE (2026-11-07, luzhumanidad.com)
// ============================================================================
// Las páginas de los proyectos llevan vídeos de YouTube (bloques `medio` con
// `medio: 'youtube'`), y Google solo los entiende como vídeos si la página los
// describe: un `VideoObject` en los datos estructurados con su título, una
// descripción, la miniatura, la fecha de subida, la duración y la dirección del
// reproductor.
//
// Esos datos los trae de YouTube (API de datos v3) `scripts/videos-youtube.ts` y
// los deja en `config.sitio.videos` de la raíz del sitio, uno por id:
//   { "<id>": { titulo, descripcion, fecha, duracion, miniatura, canal, canalId, propio, actualizado } }
// El servidor NUNCA llama a YouTube: solo lee eso. Un vídeo sin datos (privado,
// borrado o aún no leído) no lleva `VideoObject`: una fecha inventada es peor que
// ninguna. `propio` dice que lo publicó el canal de la organización (sus perfiles
// en `sitio.seo.perfiles`): solo entonces se dice quién es su autor.

/** Lo que se guarda de un vídeo. */
export type DatosVideo = {
  titulo: string; descripcion: string; fecha: string; duracion: string | null; miniatura: string;
  canal: string | null; propio: boolean;
};

/** El id de un vídeo de YouTube: el guardado (`medioId`) o el que dice su dirección, como
 *  `idDelVideo` en `BloquesLectura.tsx` (el lector pinta el vídeo con ese mismo id). */
const ID_YOUTUBE = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/;
const FORMA_ID = /^[\w-]{6,20}$/;
export function idYoutube(b: any): string | null {
  if (!b || b.tipo !== 'medio' || b.medio !== 'youtube') return null;
  const id = b.medioId ? String(b.medioId) : ID_YOUTUBE.exec(String(b.url || ''))?.[1] || null;
  return id && FORMA_ID.test(id) ? id : null;
}

/** Los bloques de vídeo de YouTube de una lista de bloques, en orden (también los que van dentro
 *  de otros bloques y de las columnas de una maqueta), con su id. */
function bloquesDeVideo(bloques: unknown, out: Array<{ id: string; b: any }> = [], prof = 0): Array<{ id: string; b: any }> {
  if (!Array.isArray(bloques) || prof > 8) return out;
  for (const b of bloques) {
    if (!b || typeof b !== 'object') continue;
    const id = idYoutube(b);
    if (id) out.push({ id, b });
    bloquesDeVideo((b as any).bloques, out, prof + 1);
    const cols = (b as any).columnas;
    if (Array.isArray(cols)) for (const c of cols) bloquesDeVideo(Array.isArray(c) ? c : c?.bloques, out, prof + 1);
  }
  return out;
}

/** Los vídeos de YouTube de una lista de bloques, en orden y sin repetir. */
export function videosDeBloques(bloques: unknown): string[] {
  return [...new Set(bloquesDeVideo(bloques).map(x => x.id))];
}

/** Un pie en texto llano: sin enlaces (se queda su texto), imágenes, negritas, cursivas ni código,
 *  y como mucho `n` letras, cortando por una palabra («…»). */
export function textoDelPie(pie: unknown, n = 300): string {
  if (typeof pie !== 'string') return '';
  const s = pie
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[\s(«"])\*(?!\s)([^*\n]+?)\*(?=[\s).,;:!?»"]|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s+\S*$/, '').replace(/[\s,;:–-]+$/, '') + '…';
}

/** El pie de cada vídeo en la página (el primero que tenga, si sale dos veces): lo que el sitio
 *  cuenta de él, en su idioma y a su manera. */
export function piesDeVideos(bloques: unknown): Map<string, string> {
  const pies = new Map<string, string>();
  for (const { id, b } of bloquesDeVideo(bloques)) {
    const t = textoDelPie(b.pie);
    if (t && !pies.has(id)) pies.set(id, t);
  }
  return pies;
}

const texto = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');
/** Una fecha con hora y zona (ISO 8601), como la da YouTube (`2019-09-12T10:00:03Z`). */
const FECHA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
/** Una duración ISO 8601 (`PT4M13S`, `P1DT2H`); `P0D` es la de un directo: no cuenta. */
const DURACION = /^P(?=\d|T\d)(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/;

/** Una entrada de `config.sitio.videos`, comprobada; `null` si le falta lo que Google exige
 *  (título, miniatura y fecha de subida). */
export function datosVideo(v: unknown): DatosVideo | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const titulo = texto(o.titulo, 200);
  const fecha = typeof o.fecha === 'string' && FECHA.test(o.fecha) && !Number.isNaN(Date.parse(o.fecha)) ? o.fecha : '';
  const miniatura = typeof o.miniatura === 'string' && /^https:\/\/[^\s"<>]+$/.test(o.miniatura) ? o.miniatura : '';
  if (!titulo || !fecha || !miniatura) return null;
  const duracion = typeof o.duracion === 'string' && DURACION.test(o.duracion) && !/^P0D$|^PT0S$/.test(o.duracion) ? o.duracion : null;
  return { titulo, descripcion: texto(o.descripcion, 300), fecha, duracion, miniatura, canal: texto(o.canal, 120) || null, propio: o.propio === true };
}

/** El `VideoObject` de un vídeo. `org` es quien firma lo publicado en su propio canal; `pie`, lo
 *  que la página cuenta del vídeo.
 *
 *  LA DESCRIPCIÓN (2026-11-07, revisión): el pie del vídeo en la página, que escribió el sitio, en
 *  español; la de YouTube es a veces de otros, en inglés o de anuncio («(NASDAQ: SEV) is a solar
 *  mobility company…»). Sin pie, la de YouTube limpia; sin ninguna, su título (nunca un texto
 *  inventado aquí).
 *
 *  SIN `contentUrl` (2026-11-07, revisión): Google pide que sea la dirección del fichero de vídeo
 *  y dice expresamente que no se ponga la página donde vive; de un vídeo de YouTube solo se tiene
 *  esa página (`watch?v=`). Basta `embedUrl`, la del reproductor (Google pide una de las dos). Es
 *  la de `youtube.com`, la que Google asocia al vídeo; la página incrusta la misma con
 *  `youtube-nocookie.com`, que es el mismo reproductor sin cookie, y estos datos no los pide el
 *  navegador de nadie. */
export function videoObject(id: string, v: DatosVideo, org?: Record<string, unknown> | null, pie?: string | null): Record<string, unknown> {
  return {
    '@context': 'https://schema.org', '@type': 'VideoObject',
    name: v.titulo,
    description: (pie && pie.trim()) || v.descripcion || v.titulo,
    thumbnailUrl: [v.miniatura],
    uploadDate: v.fecha,
    ...(v.duracion ? { duration: v.duracion } : {}),
    embedUrl: `https://www.youtube.com/embed/${id}`,
    ...(v.propio && org ? { author: org, publisher: org } : {}),
  };
}

/** Los `VideoObject` de una página: uno por vídeo de sus bloques que tenga datos. */
export function videosJsonLd(bloques: unknown, videos: unknown, org?: Record<string, unknown> | null): Array<Record<string, unknown>> {
  const todos = videos && typeof videos === 'object' && !Array.isArray(videos) ? videos as Record<string, unknown> : {};
  const pies = piesDeVideos(bloques);
  const out: Array<Record<string, unknown>> = [];
  for (const id of videosDeBloques(bloques)) {
    const v = datosVideo(todos[id]);
    if (v) out.push(videoObject(id, v, org, pies.get(id)));
  }
  return out;
}

/** Una descripción de YouTube, limpia: sin enlaces, sin etiquetas, sin «suscríbete», sin los
 *  datos de contacto ni las frases que presentaban un enlace («léela aquí:»), sin emojis, y como
 *  mucho 300 letras, cortando por una frase (o por una palabra, con «…»). */
export function limpiarDescripcion(t: string): string {
  const lineas = String(t || '').split(/\r?\n/).map(l => l.trim()).filter(l => l
    && !/https?:\/\/|www\.|\.(com|org|es|net|solar)\b|\S+@\S+/i.test(l)
    && !/^#/.test(l) && !/:$/.test(l)
    && !/suscr[ií]b|s[ií]gu(e|enos)|follow|instagram|facebook|twitter|tiktok|linkedin|patreon|bizum|donaci[oó]n|copyright|©|todos los derechos/i.test(l)
    && !/tel[eé]fono|e-?mail|correo electr|direcci[oó]n:|whatsapp|(?:\+\d{1,3}[ .-]?)?(?:\d[ .-]?){8,}\d/i.test(l));
  const s = lineas.join(' ').replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, '').replace(/#[\p{L}\d_]+/gu, '')
    .replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').replace(/([.!?])\.+(?=\s|$)/g, '$1').trim();
  if (s.length <= 300) return s;
  const corte = s.slice(0, 300);
  const frase = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('! '), corte.lastIndexOf('? '));
  if (frase >= 140) return corte.slice(0, frase + 1);
  return corte.slice(0, 299).replace(/\s+\S*$/, '').replace(/[\s,;:–-]+$/, '') + '…';
}
