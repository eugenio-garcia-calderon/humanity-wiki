// ============================================================================
// PRUEBA: COMPARTIR Y VÍDEOS DEL ESCAPARATE (2026-11-07, luzhumanidad.com)
// ============================================================================
//   npx tsx scripts/probar-compartir-y-videos.ts
//       las reglas puras: los ids de YouTube, los VideoObject, la limpieza de las descripciones,
//       la medida de la imagen al compartir y el HTML del servidor de un vídeo.
//   npx tsx scripts/probar-compartir-y-videos.ts --produccion [--videos fichero.json]
//       además, la ampliación de verdad (`seoEscaparate.ts`) con los datos de producción, solo
//       leyendo (por SSH, `imagenes-compartir/produccion.mjs`): las etiquetas de las redes y los
//       VideoObject de las páginas con vídeos, contra lo que pide Google para los resultados de
//       vídeo. `--videos` usa ese `config.sitio.videos` en vez del guardado (el que deja
//       `videos-youtube.ts --salida`), para probar antes de escribir.
//   npx tsx scripts/probar-compartir-y-videos.ts --vivo [--sitio luzhumanidad.com]
//       lo mismo contra el HTML publicado (después de desplegar), con los agentes de las redes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opcion = (n: string) => { const i = args.indexOf(`--${n}`); return i < 0 ? null : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'si'); };
// La carpeta de subidas de la prueba, antes de cargar el servidor (`uploadsDir` la lee al llamarse).
const SUBIDAS = fs.mkdtempSync(path.join(os.tmpdir(), 'prueba-compartir-'));
process.env.UPLOADS_DIR = SUBIDAS;

const { idYoutube, videosDeBloques, datosVideo, videoObject, videosJsonLd, limpiarDescripcion } = await import('../src/server/videosEscaparate');
const { esTarjeta, imagenAlCompartir, medidaDeSubida } = await import('../src/server/seoEscaparate');
const { bloquesEnHtml } = await import('../src/server/htmlBloques');

let n = 0;
const ok = async (nombre: string, f: () => void | Promise<void>) => { await f(); n++; console.log(`  ✓ ${nombre}`); };

// ── LO QUE GOOGLE PIDE A UN VideoObject ──────────────────────────────────────
// https://developers.google.com/search/docs/appearance/structured-data/video — obligatorias:
// name, thumbnailUrl, uploadDate; recomendadas: description, duration, embedUrl, contentUrl.
// Las direcciones, absolutas; la fecha, ISO 8601 con zona; la duración, ISO 8601.
export function fallosVideoGoogle(v: any): string[] {
  const f: string[] = [];
  const https = (u: unknown) => typeof u === 'string' && /^https:\/\/[^\s]+$/.test(u);
  if (v?.['@type'] !== 'VideoObject') f.push('@type no es VideoObject');
  if (v?.['@context'] !== 'https://schema.org') f.push('@context');
  if (typeof v?.name !== 'string' || !v.name.trim()) f.push('falta name');
  const mini = Array.isArray(v?.thumbnailUrl) ? v.thumbnailUrl : [v?.thumbnailUrl];
  if (!mini.length || !mini.every(https)) f.push('thumbnailUrl no es una dirección https');
  if (typeof v?.uploadDate !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(v.uploadDate) || Number.isNaN(Date.parse(v.uploadDate))) f.push('uploadDate no es ISO 8601 con zona');
  else if (Date.parse(v.uploadDate) > Date.now() + 86_400_000) f.push('uploadDate en el futuro');
  if (typeof v?.description !== 'string' || !v.description.trim()) f.push('falta description');
  if (v?.duration !== undefined && !/^P(?=\d|T\d)(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/.test(v.duration)) f.push('duration no es ISO 8601');
  if (!https(v?.embedUrl)) f.push('embedUrl');
  if (!https(v?.contentUrl)) f.push('contentUrl');
  for (const k of ['author', 'publisher']) if (v?.[k] !== undefined && (typeof v[k]?.name !== 'string' || !v[k].name)) f.push(`${k} sin nombre`);
  return f;
}

// ── LAS REGLAS ──────────────────────────────────────────────────────────────
console.log('Reglas');
await ok('el id de un vídeo: el guardado o el de su dirección, en todas sus formas', () => {
  const m = (x: any) => idYoutube({ tipo: 'medio', medio: 'youtube', ...x });
  assert.equal(m({ medioId: 'Yjb26ysgIbs', url: 'https://www.youtube.com/watch?v=otro123' }), 'Yjb26ysgIbs');
  assert.equal(m({ url: 'https://www.youtube.com/watch?v=Bib6N9c_FZI&t=3s' }), 'Bib6N9c_FZI');
  assert.equal(m({ url: 'https://youtu.be/_z7hXFxA10U' }), '_z7hXFxA10U');
  assert.equal(m({ url: 'https://www.youtube.com/shorts/3-CQZhJTm80' }), '3-CQZhJTm80');
  assert.equal(m({ url: 'https://www.youtube-nocookie.com/embed/36VSoP5__Uk' }), '36VSoP5__Uk');
  assert.equal(m({ url: 'https://www.youtube.com/watch?feature=x&v=ot5qVGCd3yM' }), 'ot5qVGCd3yM');
  assert.equal(m({ url: 'https://vimeo.com/123' }), null);
  assert.equal(m({ medioId: '"><script>' }), null);
  assert.equal(idYoutube({ tipo: 'medio', medio: 'vimeo', url: 'https://www.youtube.com/watch?v=Bib6N9c_FZI' }), null);
  assert.equal(idYoutube({ tipo: 'parrafo', texto: 'https://youtu.be/_z7hXFxA10U' }), null);
});
await ok('los vídeos de una página: en orden, sin repetir, también dentro de columnas y bloques', () => {
  const v = (id: string) => ({ tipo: 'medio', medio: 'youtube', medioId: id });
  const bloques = [
    { tipo: 'parrafo', texto: 'hola' }, v('aaaaaa1'),
    { tipo: 'columnas', columnas: [{ bloques: [v('bbbbbb2')] }, [v('cccccc3'), v('aaaaaa1')]] },
    { tipo: 'desplegable', bloques: [{ tipo: 'medio', medio: 'youtube', url: 'https://youtu.be/dddddd4' }] },
    { tipo: 'lista', texto: '[Un vídeo](https://www.youtube.com/watch?v=eeeeee5)', estilo: 'noticia' },
  ];
  assert.deepEqual(videosDeBloques(bloques), ['aaaaaa1', 'bbbbbb2', 'cccccc3', 'dddddd4']);
  assert.deepEqual(videosDeBloques(null), []);
});
const bueno = { titulo: 'La luz del Amazonas', descripcion: 'Lámparas solares en Breves.', fecha: '2019-09-12T10:00:03Z', duracion: 'PT3M', miniatura: 'https://i.ytimg.com/vi/Yjb26ysgIbs/maxresdefault.jpg', canal: 'Luz & Humanidad', propio: true };
await ok('los datos de un vídeo: sin título, fecha o miniatura no hay VideoObject', () => {
  assert.ok(datosVideo(bueno));
  assert.equal(datosVideo({ ...bueno, fecha: '' }), null);
  assert.equal(datosVideo({ ...bueno, fecha: '2019-09-12' }), null, 'una fecha sin hora ni zona no vale');
  assert.equal(datosVideo({ ...bueno, miniatura: 'http://i.ytimg.com/x.jpg' }), null);
  assert.equal(datosVideo({ ...bueno, titulo: '   ' }), null);
  assert.equal(datosVideo('basura'), null);
  assert.equal(datosVideo({ ...bueno, duracion: 'P0D' })?.duracion, null, 'un directo no tiene duración');
  assert.equal(datosVideo({ ...bueno, duracion: '3 minutos' })?.duracion, null);
  assert.equal(datosVideo({ ...bueno, propio: 'true' })?.propio, false);
});
await ok('el VideoObject cumple lo que pide Google, y solo firma la organización lo de su canal', () => {
  const org = { '@type': 'NGO', '@id': '/#organizacion', name: 'Light Humanity', url: '/' };
  const v = videoObject('Yjb26ysgIbs', datosVideo(bueno)!, org);
  assert.deepEqual(fallosVideoGoogle(v), []);
  assert.equal(v.embedUrl, 'https://www.youtube.com/embed/Yjb26ysgIbs');
  assert.equal(v.contentUrl, 'https://www.youtube.com/watch?v=Yjb26ysgIbs');
  assert.deepEqual(v.author, org);
  const ajeno = videoObject('Bib6N9c_FZI', datosVideo({ ...bueno, propio: false, descripcion: '' })!, org);
  assert.equal(ajeno.author, undefined); assert.equal(ajeno.publisher, undefined);
  assert.equal(ajeno.description, bueno.titulo, 'sin descripción, la del título');
  const lista = videosJsonLd([{ tipo: 'medio', medio: 'youtube', medioId: 'Yjb26ysgIbs' }, { tipo: 'medio', medio: 'youtube', medioId: 'sinDatos1' }], { Yjb26ysgIbs: bueno }, org);
  assert.equal(lista.length, 1, 'un vídeo sin datos no lleva VideoObject');
});
await ok('la descripción de YouTube, limpia y de 300 letras como mucho', () => {
  const t = limpiarDescripcion('Ahora es el momento. 🌞 Ahorra desde el primer día.\nTeléfono: 900 80 28 12\nEmail: info@comunidad.solar\nMás en https://ejemplo.org\n#energia #solar\nPuedes leer la entrevista completa aquí:\nSuscríbete al canal');
  assert.equal(t, 'Ahora es el momento. Ahorra desde el primer día.');
  const largo = limpiarDescripcion(('Una frase que se repite bastante. ').repeat(20));
  assert.ok(largo.length <= 300 && largo.endsWith('.'), largo);
  const sinPunto = limpiarDescripcion('palabra '.repeat(80));
  assert.ok(sinPunto.length <= 300 && sinPunto.endsWith('…') && !/palab…$/.test(sinPunto));
  assert.equal(limpiarDescripcion('Entre 2019 - 2021 se instalaron 1.200 lámparas.'), 'Entre 2019 - 2021 se instalaron 1.200 lámparas.');
});
await ok('la imagen al compartir: la tarjeta (1200 × 630), una foto medida, la que falta se salta', async () => {
  const sharp = (await import('sharp')).default;
  fs.mkdirSync(path.join(SUBIDAS, '2026/11/compartir'), { recursive: true });
  fs.mkdirSync(path.join(SUBIDAS, '2026/10'), { recursive: true });
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#123' } }).jpeg().toFile(path.join(SUBIDAS, '2026/11/compartir/aeromovil-0123456789.jpg'));
  await sharp({ create: { width: 640, height: 853, channels: 4, background: '#abc' } }).png().toFile(path.join(SUBIDAS, '2026/10/foto.png'));
  assert.ok(esTarjeta('/uploads/2026/11/compartir/aeromovil-0123456789.jpg'));
  assert.ok(!esTarjeta('/uploads/2026/10/foto.png'));
  assert.deepEqual(await medidaDeSubida('/uploads/2026/10/foto.png?w=400'), { ancho: 640, alto: 853, tipo: 'image/png' });
  assert.equal(await medidaDeSubida('/uploads/privado/x.png'), null);
  assert.equal(await medidaDeSubida('/uploads/../../etc/passwd'), null);
  let r = await imagenAlCompartir({ imagenCompartir: '/uploads/2026/11/compartir/aeromovil-0123456789.jpg', portada: '/uploads/2026/10/foto.png' }, null);
  assert.deepEqual(r, { url: '/uploads/2026/11/compartir/aeromovil-0123456789.jpg', medida: { ancho: 1200, alto: 630, tipo: 'image/jpeg' } });
  r = await imagenAlCompartir({ imagenCompartir: '/uploads/2026/11/no-existe.jpg', portada: '/uploads/2026/10/foto.png' }, null);
  assert.equal(r?.url, '/uploads/2026/10/foto.png', 'la que no está en el disco se salta');
  r = await imagenAlCompartir({ portada: 'https://www.youtube.com/watch?v=Yjb26ysgIbs' }, null);
  assert.deepEqual(r, { url: 'https://i.ytimg.com/vi/Yjb26ysgIbs/hqdefault.jpg', medida: { ancho: 480, alto: 360, tipo: 'image/jpeg' } });
  r = await imagenAlCompartir({ bloques: [] }, '/uploads/2026/11/compartir/aeromovil-0123456789.jpg');
  assert.equal(r?.url, '/uploads/2026/11/compartir/aeromovil-0123456789.jpg', 'sin ninguna, la de la portada del sitio');
  assert.equal(await imagenAlCompartir({}, null), null);
});
await ok('el HTML del servidor de un vídeo: enlace con su miniatura y un texto alternativo, sin iframe', () => {
  const ctx: any = { enlacePagina: (id: string) => `/p/${id}`, tablas: new Map(), titulos: new Map(), extra: new Map(), pagina: { videos: { Yjb26ysgIbs: 'LA LUZ DEL AMAZONAS' } } };
  const h = bloquesEnHtml([{ tipo: 'medio', medio: 'youtube', url: 'https://www.youtube.com/watch?v=Yjb26ysgIbs', pie: 'La luz del **Amazonas**' }], ctx);
  assert.match(h, /^<figure><a href="https:\/\/www\.youtube\.com\/watch\?v=Yjb26ysgIbs" rel="noopener" target="_blank"><img src="https:\/\/i\.ytimg\.com\/vi\/Yjb26ysgIbs\/hqdefault\.jpg" alt="Vídeo: LA LUZ DEL AMAZONAS" width="480" height="360" loading="lazy" decoding="async" referrerpolicy="no-referrer"><\/a><figcaption>La luz del <strong>Amazonas<\/strong><\/figcaption><\/figure>$/);
  assert.ok(!/iframe/i.test(h));
  const sinDatos = bloquesEnHtml([{ tipo: 'medio', medio: 'youtube', medioId: 'Bib6N9c_FZI', pie: 'Eugenio explica la factura' }], { ...ctx, pagina: {} });
  assert.match(sinDatos, /alt="Vídeo: Eugenio explica la factura"/);
  const otro = bloquesEnHtml([{ tipo: 'medio', medio: 'pdf', url: '/uploads/x.pdf', pie: 'El informe' }], ctx);
  assert.equal(otro, '<p><a href="/uploads/x.pdf">El informe</a></p>');
});

// ── CON LOS DATOS DE PRODUCCIÓN (solo lectura) ──────────────────────────────
if (opcion('produccion')) {
  console.log('Producción (solo lectura)');
  // @ts-ignore — módulo JS
  const { leer, literal } = await import('./imagenes-compartir/produccion.mjs');
  const { PgDialect } = await import('drizzle-orm/pg-core');
  const dialecto = new PgDialect();
  // Un `db` que manda cada consulta de drizzle a producción por SSH y solo admite SELECT.
  const db = {
    execute: async (q: any) => {
      const { sql: texto, params } = dialecto.sqlToQuery(q);
      if (!/^\s*(SELECT|WITH)\b/i.test(texto)) throw new Error('la prueba solo lee');
      const sql = texto.replace(/\$(\d+)/g, (_m, i) => { const v = params[Number(i) - 1]; return v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : literal(String(v)); });
      return { rows: leer(sql) };
    },
  };
  const RAIZ = 'KWMUO4S4V663';
  const [raiz] = leer(`SELECT id, title, config FROM knowledge_windows WHERE id = ${literal(RAIZ)}`);
  const cfgSitio = { ...raiz.config.sitio };
  if (opcion('videos') && opcion('videos') !== 'si') cfgSitio.videos = JSON.parse(fs.readFileSync(opcion('videos')!, 'utf8'));
  const { registrarSeoEscaparate } = await import('../src/server/seoEscaparate');
  const { ampliar } = await import('../src/server/ampliarPagina');
  registrarSeoEscaparate();
  // Las imágenes que se van a medir, bajadas a la carpeta de subidas de la prueba.
  const bajar = async (u: unknown) => {
    if (typeof u !== 'string' || !u.startsWith('/uploads/')) return;
    const f = path.join(SUBIDAS, u.slice('/uploads/'.length).split('?')[0]);
    if (fs.existsSync(f)) return;
    const r = await fetch(`https://luzhumanidad.com${u}`);
    if (!r.ok) return;
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  };
  const armar = async (id: string) => {
    const [w] = leer(`SELECT id, title, config FROM knowledge_windows WHERE id = ${literal(id)}`);
    await bajar(w.config?.imagenCompartir); await bajar(w.config?.portada); await bajar(raiz.config?.imagenCompartir);
    const pagina: any = { id: w.id, titulo: w.title, config: w.config, sitio: { config: { ...cfgSitio }, raizId: RAIZ, titulo: raiz.title, icono: raiz.config.icono } };
    await ampliar(db, undefined, pagina);
    return pagina;
  };
  const conVideos = leer(`
    SELECT k.id, k.title FROM bd_filas f JOIN knowledge_windows k ON k.id = f.pagina_id
    WHERE f.tabla_id = ${literal(cfgSitio.proyectos)} AND f.oculta = false AND f.deleted_at IS NULL AND f.archived_at IS NULL
      AND k.deleted_at IS NULL AND k.config::text LIKE '%youtu%' ORDER BY k.title`);
  let paginasConVideo = 0, totalVideos = 0;
  for (const { id, title } of conVideos) {
    const p = await armar(id);
    const ld = (p.meta?.jsonLd || []) as any[];
    const videos = ld.filter(x => x?.['@type'] === 'VideoObject');
    const esperados = videosDeBloques(p.config?.bloques).filter(v => datosVideo(cfgSitio.videos?.[v]));
    assert.equal(videos.length, esperados.length, `${title}: ${videos.length} VideoObject y ${esperados.length} vídeos con datos`);
    for (const v of videos) assert.deepEqual(fallosVideoGoogle(v), [], `${title}: ${v.name}`);
    assert.ok(!JSON.stringify(p.sitio.config).includes('"videos"'), 'los datos de los vídeos no viajan al navegador');
    if (videos.length) { paginasConVideo++; totalVideos += videos.length; }
    console.log(`  · ${title}: ${videos.length} VideoObject${videos.length ? ` (${videos.map(v => `${v.duration || '—'}${v.author ? ', propio' : ''}`).join('; ')})` : ''}`);
  }
  await ok(`VideoObject válidos para Google en ${paginasConVideo} páginas (${totalVideos} vídeos)`, () => {
    if (cfgSitio.videos) assert.ok(paginasConVideo >= 3, 'al menos tres páginas con vídeos');
  });
  await ok('las etiquetas para las redes de la portada, un proyecto, una persona y otra página', async () => {
    const hijas = leer(`SELECT f.pagina_id AS id FROM bd_filas f WHERE f.tabla_id = ${literal(raiz.config.hijas?.tabla_id || '')} AND f.oculta = false AND f.deleted_at IS NULL LIMIT 1`);
    for (const id of [RAIZ, 'KWNTX8WIA8DL4N5', 'KWMUVO3ZW55F49', ...hijas.map((h: any) => h.id)]) {
      const p = await armar(id);
      const metas = Object.fromEntries((p.meta?.metas || []).map((x: any) => [x.property || x.name, x.content]));
      console.log(`  · ${p.titulo}: og:image ${p.config.imagenCompartir || '—'} ${metas['og:image:width'] || '?'}×${metas['og:image:height'] || '?'} ${metas['og:image:type'] || ''}\n      alt: ${metas['og:image:alt'] || '—'}`);
      assert.equal(metas['og:locale'], 'es_ES');
      assert.equal(metas['og:site_name'], raiz.title);
      if (p.config.imagenCompartir) {
        assert.ok(metas['og:image:alt'] && metas['twitter:image:alt'], `${p.titulo}: alt`);
        if (String(p.config.imagenCompartir).startsWith('/uploads/')) assert.ok(metas['og:image:width'] && metas['og:image:height'] && metas['og:image:type'], `${p.titulo}: medida`);
      }
    }
  });
}

// ── EL HTML PUBLICADO, COMO LO LEEN LAS REDES (después de desplegar) ────────
if (opcion('vivo')) {
  const SITIO = opcion('sitio') && opcion('sitio') !== 'si' ? opcion('sitio') : 'luzhumanidad.com';
  console.log(`Publicado (${SITIO})`);
  const AGENTES = ['facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'Twitterbot/1.0',
    'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)', 'WhatsApp/2.23.20.0 A', 'TelegramBot (like TwitterBot)'];
  const rutas = (opcion('rutas') && opcion('rutas') !== 'si' ? opcion('rutas')! : '/,/canada-solar,/luz-del-amazonas,/pedaleo-solar,/maria-roca').split(',');
  for (const ruta of rutas) for (const ua of AGENTES) {
    const h = await (await fetch(`https://${SITIO}${ruta}`, { headers: { 'user-agent': ua }, redirect: 'manual' })).text();
    const meta = (p: string) => new RegExp(`<meta (?:property|name)="${p}" content="([^"]*)"`).exec(h)?.[1];
    const falta = ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:width', 'og:image:height', 'og:image:type', 'og:image:alt', 'og:site_name', 'og:locale', 'twitter:card'].filter(p => !meta(p));
    assert.deepEqual(falta, [], `${ruta} con ${ua.split('/')[0]}: falta ${falta.join(', ')}`);
    assert.match(meta('og:image')!, /^https:\/\//);
    assert.equal(meta('og:locale'), 'es_ES');
    assert.equal(meta('twitter:card'), 'summary_large_image');
    if (ua === AGENTES[0]) {
      const videos = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1])).filter(x => x['@type'] === 'VideoObject');
      for (const v of videos) assert.deepEqual(fallosVideoGoogle(v), [], `${ruta}: ${v.name}`);
      console.log(`  · ${ruta}: ${meta('og:image')} (${meta('og:image:width')}×${meta('og:image:height')}), ${videos.length} VideoObject`);
    }
  }
  await ok('las cinco redes reciben en el HTML inicial todas las etiquetas, y los vídeos valen para Google', () => {});
}

fs.rmSync(SUBIDAS, { recursive: true, force: true });
console.log(`\n${n} comprobaciones, todas bien.`);
