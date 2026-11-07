// ============================================================================
// LOS DATOS DE LOS VÍDEOS DEL ESCAPARATE, DESDE YOUTUBE (2026-11-07, luzhumanidad.com)
// ============================================================================
// Para que Google entienda los vídeos de las páginas del escaparate, cada página
// describe los suyos con un `VideoObject` (`src/server/videosEscaparate.ts`). El
// servidor no llama nunca a YouTube: lee los datos que deja aquí este programa en
// `config.sitio.videos` de la raíz del sitio, uno por id de vídeo:
//   { titulo, descripcion (≤ 300, limpia), fecha y duracion (ISO 8601), miniatura (la
//     mejor, https), canal, canalId, propio (lo publicó el canal de la organización),
//     actualizado }
//
//   npx tsx scripts/videos-youtube.ts --env /ruta/al/.env           lee, pregunta y guarda
//   npx tsx scripts/videos-youtube.ts --env /ruta/al/.env --seco    solo dice lo que haría
// Opciones: --sitio <dominio> (luzhumanidad.com) o --raiz <id de la página raíz>; --salida <fichero>
// deja en JSON lo que se guardaría.
//
// Se vuelve a pasar cuando se añaden vídeos a las páginas (los bots de las notas de
// prensa los siguen añadiendo): recorre todas las páginas públicas del escaparate, junta
// los vídeos de YouTube de sus bloques (los mismos que pinta el lector y que mira el
// servidor: `videosDeBloques`) y pregunta a la API de datos de YouTube (v3,
// `videos.list`, partes `snippet` y `contentDetails`) por todos de una vez, de 50 en 50.
// Un vídeo que YouTube ya no da (privado o borrado) sale de la lista: su página se queda
// sin `VideoObject`, que es lo correcto; nunca una fecha inventada.
//
// LA CLAVE (`YOUTUBE_API_KEY`) se lee del entorno o del fichero `--env`, y no se escribe en
// ningún sitio: ni en pantalla, ni en el registro, ni en la base de datos. Los errores de
// la API se cuentan sin la dirección (que la lleva dentro).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { videosDeBloques, limpiarDescripcion } from '../src/server/videosEscaparate';
// @ts-ignore — módulo JS compartido con el generador de imágenes
import { leer, copiar, escribirClave, literal } from './imagenes-compartir/produccion.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opcion = (n: string, def: string | null = null): string | null => { const i = args.indexOf(`--${n}`); return i < 0 ? def : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'si'); };
const SECO = !!opcion('seco');
const SITIO = String(opcion('sitio', 'luzhumanidad.com')).replace(/^https?:\/\//, '').replace(/\/+$/, '');

// ── LA CLAVE ────────────────────────────────────────────────────────────────
function clave(): string {
  if (process.env.YOUTUBE_API_KEY) return process.env.YOUTUBE_API_KEY.trim();
  const f = opcion('env', path.join(AQUI, '..', '.env'))!;
  if (!fs.existsSync(f)) throw new Error(`no hay YOUTUBE_API_KEY en el entorno ni fichero ${f}`);
  const linea = fs.readFileSync(f, 'utf8').split('\n').find(l => /^\s*YOUTUBE_API_KEY\s*=/.test(l));
  const k = linea ? linea.slice(linea.indexOf('=') + 1).trim().replace(/^(['"])(.*)\1$/, '$2') : '';
  if (!k) throw new Error(`${f} no tiene YOUTUBE_API_KEY`);
  return k;
}
const KEY = clave();
/** Una llamada a la API de datos de YouTube. El error nunca lleva la dirección (lleva la clave). */
async function youtube(recurso: string, params: Record<string, string>): Promise<any> {
  const q = new URLSearchParams({ ...params, key: KEY });
  for (let i = 0; i < 3; i++) {
    let r: Response;
    try { r = await fetch(`https://www.googleapis.com/youtube/v3/${recurso}?${q}`, { headers: { accept: 'application/json' } }); }
    catch { await new Promise(res => setTimeout(res, 1000 * (i + 1))); continue; }
    const j: any = await r.json().catch(() => null);
    if (r.ok) return j;
    const motivo = String(j?.error?.errors?.[0]?.reason || j?.error?.status || r.status).replace(/key=[^&\s]+/g, 'key=…');
    if (r.status >= 500 && i < 2) { await new Promise(res => setTimeout(res, 1000 * (i + 1))); continue; }
    throw new Error(`YouTube ${recurso}: ${r.status} ${motivo}`);
  }
  throw new Error(`YouTube ${recurso}: sin respuesta`);
}

// ── LA RAÍZ DEL SITIO Y SUS PÁGINAS PÚBLICAS ───────────────────────────────
async function raizDelSitio(): Promise<string> {
  const propia = opcion('raiz');
  if (propia && propia !== 'si') return propia;
  const h = await (await fetch(`https://${SITIO}/`, { headers: { accept: 'text/html' } })).text();
  const i = h.indexOf('window.__SITIO__=');
  if (i < 0) throw new Error(`no se encuentra la raíz de ${SITIO}`);
  const desde = i + 'window.__SITIO__='.length;
  const id = JSON.parse(h.slice(desde, h.indexOf('</script>', desde)).trim().replace(/;$/, ''))?.resolver?.body?.id;
  if (!id) throw new Error(`no se encuentra la raíz de ${SITIO}`);
  return id;
}
const RAIZ = await raizDelSitio();
if (!/^[A-Z0-9_]{6,40}$/.test(RAIZ)) throw new Error('id de raíz raro');
const [raiz] = leer(`SELECT id, title, config->'sitio' AS sitio, config->'hijas' AS hijas, config->'bloques' AS bloques FROM knowledge_windows WHERE id = ${literal(RAIZ)}`);
if (!raiz?.sitio?.escaparate) throw new Error(`${RAIZ} no es la raíz de un escaparate`);
const sitio = raiz.sitio;

/** Las páginas públicas que cuelgan de la raíz: las filas visibles de sus tablas (proyectos,
 *  personas, las hijas del menú y las tablas que enseñen sus bloques) y sus subpáginas, hasta
 *  tres saltos. Lo oculto, borrado o archivado no se mira: no se publica. */
type Pagina = { id: string; title: string; bloques: unknown };
const paginas = new Map<string, Pagina>([[RAIZ, { id: RAIZ, title: raiz.title, bloques: raiz.bloques }]]);
const tablasVistas = new Set<string>();
const aplanar = (bs: unknown, out: any[] = [], n = 0): any[] => {
  if (!Array.isArray(bs) || n > 8) return out;
  for (const b of bs) { if (!b || typeof b !== 'object') continue; out.push(b); aplanar(b.bloques, out, n + 1); if (Array.isArray(b.columnas)) for (const c of b.columnas) aplanar(Array.isArray(c) ? c : c?.bloques, out, n + 1); }
  return out;
};
let frontera: Pagina[] = [paginas.get(RAIZ)!];
const tablasIniciales = [sitio.proyectos, sitio.personas, raiz.hijas?.tabla_id].filter((t: unknown) => typeof t === 'string' && t);
const colabora = typeof sitio.colabora === 'string' ? sitio.colabora : sitio.colabora?.pagina || sitio.colabora?.id;
for (let salto = 0; salto < 3 && frontera.length; salto++) {
  const tablas = new Set<string>(salto === 0 ? tablasIniciales : []);
  const subpaginas = new Set<string>(salto === 0 && typeof colabora === 'string' && /^[A-Z0-9_]{6,40}$/.test(colabora) ? [colabora] : []);
  for (const p of frontera) for (const b of aplanar(p.bloques)) {
    if (b.tipo === 'basedatos' && (b.tabla_id || b.tablaId)) tablas.add(String(b.tabla_id || b.tablaId));
    if (b.tipo === 'subpagina' && b.entityId) subpaginas.add(String(b.entityId));
  }
  const nuevasTablas = [...tablas].filter(t => /^[A-Z0-9_]{6,40}$/.test(t) && !tablasVistas.has(t));
  nuevasTablas.forEach(t => tablasVistas.add(t));
  const ids = [...subpaginas].filter(id => /^[A-Z0-9_]{6,40}$/.test(id) && !paginas.has(id));
  const filas: Pagina[] = (nuevasTablas.length || ids.length) ? leer(`
    SELECT k.id, k.title, k.config->'bloques' AS bloques FROM knowledge_windows k
    WHERE k.deleted_at IS NULL AND k.archived_at IS NULL AND (
      ${nuevasTablas.length ? `k.id IN (SELECT f.pagina_id FROM bd_filas f WHERE f.tabla_id IN (${nuevasTablas.map(literal).join(', ')})
        AND f.deleted_at IS NULL AND f.archived_at IS NULL AND f.oculta = false)` : 'false'}
      OR ${ids.length ? `k.id IN (${ids.map(literal).join(', ')})` : 'false'})`) : [];
  frontera = filas.filter(p => !paginas.has(p.id));
  frontera.forEach(p => paginas.set(p.id, p));
}

// ── LOS VÍDEOS ──────────────────────────────────────────────────────────────
const dondeEsta = new Map<string, string[]>();
for (const p of paginas.values()) for (const id of videosDeBloques(p.bloques)) dondeEsta.set(id, [...(dondeEsta.get(id) || []), p.title]);
const ids = [...dondeEsta.keys()];
console.log(`· ${SITIO}: ${paginas.size} páginas públicas, ${ids.length} vídeos de YouTube distintos`);

/** Los canales de la organización: los de YouTube entre sus perfiles y las redes del pie. */
const perfiles = [...(Array.isArray(sitio.seo?.perfiles) ? sitio.seo.perfiles : []), ...(Array.isArray(sitio.pie?.redes) ? sitio.pie.redes.map((r: any) => r?.url) : [])]
  .filter((u: unknown): u is string => typeof u === 'string' && /youtube\.com\//.test(u));
const canalesPropios = new Set<string>();
for (const u of new Set(perfiles)) {
  const directo = /youtube\.com\/channel\/(UC[\w-]{20,})/.exec(u)?.[1];
  if (directo) { canalesPropios.add(directo); continue; }
  const handle = /youtube\.com\/(@[\w.-]+)/.exec(u)?.[1];
  if (!handle) continue;
  const j = await youtube('channels', { part: 'id', forHandle: handle });
  for (const c of j?.items || []) canalesPropios.add(c.id);
}

const MINIATURAS = ['maxres', 'standard', 'high', 'medium', 'default'];

const ahora = new Date().toISOString();
const nuevos: Record<string, any> = {};
for (let i = 0; i < ids.length; i += 50) {
  const j = await youtube('videos', { part: 'snippet,contentDetails', id: ids.slice(i, i + 50).join(','), hl: 'es', maxResults: '50' });
  for (const v of j?.items || []) {
    const s = v.snippet || {};
    const loc = s.localized || {};
    const mini = MINIATURAS.map(k => s.thumbnails?.[k]?.url).find((u: unknown) => typeof u === 'string' && /^https:\/\//.test(u));
    if (!s.publishedAt || !mini) continue;
    nuevos[v.id] = {
      titulo: String(loc.title || s.title || '').replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, '').replace(/\s+/g, ' ').trim(),
      descripcion: limpiarDescripcion(loc.description || s.description || ''),
      fecha: s.publishedAt,
      duracion: v.contentDetails?.duration && v.contentDetails.duration !== 'P0D' ? v.contentDetails.duration : null,
      miniatura: mini,
      canal: s.channelTitle || null,
      canalId: s.channelId || null,
      propio: canalesPropios.has(s.channelId),
      actualizado: ahora,
    };
  }
}

// ── LO QUE CAMBIA ───────────────────────────────────────────────────────────
const antes: Record<string, any> = sitio.videos && typeof sitio.videos === 'object' && !Array.isArray(sitio.videos) ? sitio.videos : {};
const faltan = ids.filter(id => !nuevos[id]);
const despues: Record<string, any> = {};
// Lo de antes que ya no está en ninguna página se queda (no estorba y vuelve si vuelve el vídeo);
// lo que YouTube ya no da, sale.
for (const [id, v] of Object.entries(antes)) if (!dondeEsta.has(id)) despues[id] = v;
Object.assign(despues, nuevos);
const igual = (a: any, b: any) => a && b && JSON.stringify({ ...a, actualizado: 0 }) === JSON.stringify({ ...b, actualizado: 0 });
const cambiados = Object.keys(nuevos).filter(id => !igual(antes[id], nuevos[id]));
console.log(`· YouTube da ${Object.keys(nuevos).length} de ${ids.length}; ${cambiados.length} nuevos o cambiados; ${Object.values(nuevos).filter((v: any) => v.propio).length} del canal propio`);
for (const id of faltan) console.log(`  ✗ sin datos (privado o borrado): ${id} — ${dondeEsta.get(id)!.join(', ')}`);
for (const id of cambiados) console.log(`  ✓ ${id} ${nuevos[id].fecha.slice(0, 10)} ${nuevos[id].duracion || '—'} ${nuevos[id].propio ? '(propio) ' : ''}${nuevos[id].titulo.slice(0, 70)}`);
// `--salida <fichero>`: lo que se guardaría, en JSON, para revisarlo (sin la clave, que no va dentro).
const salida = opcion('salida');
if (salida && salida !== 'si') fs.writeFileSync(salida, JSON.stringify(despues, null, 1));
if (SECO) { console.log('· --seco: no se escribe nada'); process.exit(0); }
if (!cambiados.length && Object.keys(despues).length === Object.keys(antes).length) { console.log('· nada que guardar'); process.exit(0); }
const copia = copiar([RAIZ], 'videos-youtube');
escribirClave('{sitio,videos}', [{ id: RAIZ, valor: despues }]);
console.log(`· guardados ${Object.keys(despues).length} vídeos en config.sitio.videos de ${RAIZ} (copia de antes: ${copia})`);
