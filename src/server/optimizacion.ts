import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { rolEnPagina, capacidades, quienDe } from './permisos.js';
import { paginaParaIA } from './ai/paginaIA.js';
import { getProvider, providerOfModel } from './ai/provider.js';
import { hayPresupuesto } from './ai/tope.js';

// ============================================================================
// OPTIMIZACIÓN WEB (2026-10-13)
// ============================================================================
// Eugenio: «una herramienta cuando se publica una web: "Optimización web", con dos apartados. Tiempo de carga: qué
// tarda ahora, si ha empeorado respecto a antes, qué recomienda y un botón para aplicar (comprimir imágenes, cargar
// las tablas de arriba abajo, aceptar o deshacer). SEO: si quieres indexarla, cómo organizarla y una propuesta de la
// IA con acciones».
//
// LA MEDICIÓN ES REAL: la hace el servidor pidiendo la página publicada igual que un visitante (la página, sus datos
// y sus imágenes), y guarda cada medición para comparar. No es una estimación. Lo que el servidor no ve (cómo pinta
// cada navegador, la red del visitante) no se mide: se dice en la pantalla.

const DOMINIO = () => process.env.DOMINIO_PUBLICO || 'humanity.wiki';
const MODELO_PROPUESTA = 'claude-haiku-4-5';
const MAX_IMAGENES = 40;
const LIMITE_IMAGEN_BYTES = 300_000;
const LIMITE_TOTAL_BYTES = 800_000;

type Bloque = { tipo?: string; url?: string; texto?: string; tabla_id?: string; optimizada?: boolean; bloques?: Bloque[] };

/** Todos los bloques de la página, también los que van dentro de otros. */
function aplanarBloques(lista: any[] | undefined): Bloque[] {
  const out: Bloque[] = [];
  const walk = (l: any[] | undefined) => {
    for (const b of Array.isArray(l) ? l : []) {
      if (!b || typeof b !== 'object') continue;
      out.push(b);
      if (Array.isArray(b.bloques)) walk(b.bloques);
    }
  };
  walk(lista);
  return out;
}

async function paginaDeGestion(req: Request, res: Response, db: any): Promise<any | null> {
  if (!req.user) { res.status(401).json({ error: 'Entra en tu cuenta.' }); return null; }
  const id = String(req.params.id || '');
  const w = (await db.execute(sql`
    SELECT w.id, w.title, w.config, w.publico, w.indexable, w.slug, u.handle
    FROM knowledge_windows w LEFT JOIN users u ON u.id = w.creator_user_id
    WHERE w.id = ${id} AND w.kind = 'pagina' AND w.deleted_at IS NULL AND w.archived_at IS NULL
  `)).rows[0] as any;
  if (!w) { res.status(404).json({ error: 'Esa página no existe.' }); return null; }
  const acceso = await rolEnPagina(db, quienDe(req), id);
  if (!capacidades(acceso).editar) { res.status(403).json({ error: 'Solo quien edita esta página puede optimizarla.' }); return null; }
  return w;
}

/** Lo que el SEO mira en la propia página, sin inventar nada: cada comprobación dice qué pasa y qué hacer. */
function comprobarSeo(w: any) {
  const bloques = aplanarBloques(w.config?.bloques);
  const titulo = String(w.title || '').trim();
  const desc = String(w.config?.descripcion || '').trim();
  const h1 = bloques.filter(b => b.tipo === 'titulo1').length;
  const hs = bloques.filter(b => b.tipo === 'titulo1' || b.tipo === 'titulo2' || b.tipo === 'titulo3').length;
  const palabras = bloques.reduce((n, b) => n + (typeof b.texto === 'string' ? b.texto.trim().split(/\s+/).filter(Boolean).length : 0), 0);
  const imagenes = bloques.filter(b => b.tipo === 'imagen' && b.url).length;
  return [
    { id: 'titulo', nombre: 'Título', ok: titulo.length >= 15 && titulo.length <= 60, texto: titulo.length < 15 ? 'Demasiado corto: un buscador necesita algo que decir.' : titulo.length > 60 ? 'Más largo de 60 caracteres: se corta en Google.' : `Bien: ${titulo.length} caracteres.` },
    { id: 'descripcion', nombre: 'Descripción', ok: desc.length >= 120 && desc.length <= 160, texto: !desc ? 'Falta. Es lo que sale bajo el título en los buscadores.' : desc.length < 120 ? `Corta (${desc.length}): entre 120 y 160 caracteres.` : desc.length > 160 ? `Larga (${desc.length}): se corta a partir de 160.` : `Bien: ${desc.length} caracteres.` },
    { id: 'encabezados', nombre: 'Estructura', ok: h1 >= 1 && hs >= 2, texto: hs < 2 ? 'Pon títulos (títulos 1 a 3) que dividan el texto: es lo que el buscador usa para entender la página.' : `${hs} títulos.` },
    { id: 'texto', nombre: 'Contenido', ok: palabras >= 300, texto: palabras < 300 ? `Solo ${palabras} palabras. Una página que responde algo concreto suele tener 300 o más.` : `${palabras} palabras.` },
    { id: 'imagenes', nombre: 'Imágenes', ok: imagenes >= 1, texto: imagenes ? `${imagenes} imágenes. Ponles un pie que diga qué muestran.` : 'Sin imágenes: una imagen con su pie ayuda a entender la página.' },
    { id: 'publica', nombre: 'Publicada', ok: !!w.publico, texto: w.publico ? 'Está publicada.' : 'Todavía no está publicada: los buscadores no pueden verla.' },
    { id: 'indexable', nombre: 'Indexable', ok: !!w.publico && w.indexable !== false, texto: !w.publico ? 'Primero publícala.' : w.indexable === false ? 'Le has pedido a los buscadores que no la indexen.' : 'Los buscadores pueden indexarla.' },
  ];
}

/** El dominio propio de la página, si lo tiene y ya está activo. Un dominio pendiente todavía no sirve la web. */
async function dominioDePagina(db: any, id: string): Promise<string | null> {
  const r = await db.execute(sql`
    SELECT dominio FROM dominios_paginas
    WHERE entidad_tipo = 'pagina' AND entidad_id = ${id} AND estado = 'activo'
    ORDER BY activo_desde DESC NULLS LAST LIMIT 1
  `);
  return (r.rows[0] as any)?.dominio || null;
}

/** Mide la página publicada tal como la recibe un visitante. Devuelve null si no está publicada o no tiene dirección. */
async function medirPublicada(w: any, base: string, ruta: string) {
  if (!w.publico) return null;
  const html = `${base}${ruta}`;
  const api = `${base}/api/sitio/pagina/${w.id}`;

  const t1 = Date.now();
  const rHtml = await fetch(html, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(15000) });
  const cuerpoHtml = await rHtml.arrayBuffer();
  const msHtml = Date.now() - t1;

  const t2 = Date.now();
  const rApi = await fetch(api, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  const contenido: any = await rApi.json().catch(() => null);
  const msContenido = Date.now() - t2;

  const urls = new Set<string>();
  for (const b of aplanarBloques(contenido?.config?.bloques)) if (b.tipo === 'imagen' && b.url) urls.add(b.url);
  if (contenido?.config?.portada) urls.add(contenido.config.portada);
  const lista = [...urls].slice(0, MAX_IMAGENES).map(u => (/^https?:/.test(u) ? u : `${base}${u.startsWith('/') ? '' : '/'}${u}`));

  const tamanos: number[] = [];
  const t3 = Date.now();
  for (let i = 0; i < lista.length; i += 4) {
    const tanda = await Promise.all(lista.slice(i, i + 4).map(async u => {
      try {
        const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
        return (await r.arrayBuffer()).byteLength;
      } catch { return 0; }
    }));
    tamanos.push(...tanda);
  }
  const msImagenes = Date.now() - t3;
  const bytesImagenes = tamanos.reduce((a, b) => a + b, 0);
  const bytesMax = tamanos.length ? Math.max(...tamanos) : 0;
  const nTablas = aplanarBloques(contenido?.config?.bloques).filter(b => b.tipo === 'basedatos').length;

  return {
    ms_html: msHtml, ms_contenido: msContenido, ms_imagenes: msImagenes, ms_total: msHtml + msContenido + msImagenes,
    bytes_html: cuerpoHtml.byteLength, bytes_imagenes: bytesImagenes, bytes_max: bytesMax,
    n_imagenes: lista.length, n_tablas: nTablas,
  };
}

export function registrarOptimizacion(app: Express, db: any) {
  /** Lo último medido, lo anterior para comparar, y lo que conviene hacer. */
  app.get('/api/optimizacion/:id', async (req: Request, res: Response) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      const w = await paginaDeGestion(req, res, db); if (!w) return;
      const dominio = await dominioDePagina(db, w.id);
      const destinoActual = dominio || DOMINIO();
      const todas = (await db.execute(sql`
        SELECT id, medido_at, destino, ms_html, ms_contenido, ms_imagenes, ms_total, bytes_html, bytes_imagenes, bytes_max, n_imagenes, n_tablas
        FROM optimizacion_mediciones WHERE pagina_id = ${w.id} ORDER BY medido_at DESC LIMIT 30
      `)).rows as any[];
      // Solo se compara con lo medido en el mismo sitio: el dominio propio y humanity.wiki no son comparables.
      const mediciones = todas.filter(m => (m.destino || DOMINIO()) === destinoActual);
      const bloques = aplanarBloques(w.config?.bloques);
      const tablas = bloques.filter(b => b.tipo === 'basedatos');
      const pesadas = bloques.filter(b => b.tipo === 'imagen' && b.url && !b.optimizada).length;
      res.json({
        publicada: !!w.publico && !!w.slug,
        urlPublica: dominio ? `https://${dominio}/` : w.publico && w.slug && w.handle ? `https://${DOMINIO()}/@${w.handle}/${w.slug}` : null,
        destino: destinoActual,
        indexable: w.indexable !== false,
        mediciones,
        ultima: mediciones[0] || null,
        anterior: mediciones[1] || null,
        empeorado: !!(mediciones[0] && mediciones[1] && mediciones[0].ms_total > mediciones[1].ms_total * 1.2 && mediciones[0].ms_total - mediciones[1].ms_total > 300),
        recomendaciones: recomendar(mediciones[0] || null, mediciones[1] || null, { tablas: tablas.length, imagenesSinComprimir: pesadas }),
        seo: comprobarSeo(w),
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Mide ahora la página publicada y guarda la medición. */
  app.post('/api/optimizacion/:id/medir', async (req: Request, res: Response) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      const w = await paginaDeGestion(req, res, db); if (!w) return;
      // Se mide por la misma dirección por la que entra un visitante (la del propio servidor, detrás de su proxy).
      const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0];
      const dominio = await dominioDePagina(db, w.id);
      const m = dominio
        ? await medirPublicada(w, `https://${dominio}`, '/')
        : await medirPublicada(w, `${proto}://${req.get('host')}`, w.handle && w.slug ? `/@${w.handle}/${w.slug}` : '/');
      if (!m) return res.status(400).json({ error: 'Publica la página para poder medirla: un visitante es quien la mide.' });
      await db.execute(sql`
        INSERT INTO optimizacion_mediciones (pagina_id, destino, ms_html, ms_contenido, ms_imagenes, ms_total, bytes_html, bytes_imagenes, bytes_max, n_imagenes, n_tablas)
        VALUES (${w.id}, ${dominio || DOMINIO()}, ${m.ms_html}, ${m.ms_contenido}, ${m.ms_imagenes}, ${m.ms_total}, ${m.bytes_html}, ${m.bytes_imagenes}, ${m.bytes_max}, ${m.n_imagenes}, ${m.n_tablas})
      `);
      res.json({ ok: true, medicion: m });
    } catch (e: any) {
      console.error(e);
      res.status(502).json({ error: 'No se ha podido medir: la página no respondió a tiempo. Vuelve a intentarlo.' });
    }
  });

  /** ¿Quieres que los buscadores la indexen? Solo cambia esa marca. */
  app.post('/api/optimizacion/:id/indexar', async (req: Request, res: Response) => {
    try {
      const w = await paginaDeGestion(req, res, db); if (!w) return;
      const indexable = !!req.body?.indexable;
      await db.execute(sql`UPDATE knowledge_windows SET indexable = ${indexable}, updated_at = now() WHERE id = ${w.id}`);
      res.json({ ok: true, indexable });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Propuesta de la IA: acciones concretas de SEO sobre el texto de la página. Lo aplica quien la lee. */
  app.post('/api/optimizacion/:id/propuesta-seo', async (req: Request, res: Response) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      const w = await paginaDeGestion(req, res, db); if (!w) return;
      const texto = await paginaParaIA(db, req.user!.id, req.user!.roleLevel ?? 1, w.id);
      if (!texto) return res.status(403).json({ error: 'No puedes leer esta página para proponer cambios.' });
      const presupuesto = await hayPresupuesto(db);
      if (!presupuesto.ok) return res.status(429).json({ error: presupuesto.mensaje });
      const proveedor = getProvider(providerOfModel(MODELO_PROPUESTA));
      if (!proveedor.isReady()) return res.status(503).json({ error: 'La IA no está configurada en este servidor.' });

      const sistema = 'Eres un experto en SEO para webs pequeñas. Propón acciones concretas para que una página se encuentre y se entienda en buscadores. Responde SOLO con JSON válido: {"acciones":[{"titulo":"","detalle":"","prioridad":"alta|media|baja","tipo":"titulo|descripcion|estructura|contenido|imagenes|enlaces"}]}. Máximo 8 acciones, en español, sin inventar datos que la página no tenga.';
      const r = await proveedor.complete({
        system: sistema,
        messages: [{ role: 'user', content: `Título: ${w.title}\n\nContenido de la página:\n${texto.slice(0, 12000)}` }],
        maxTokens: 1200, temperature: 0.3, model: MODELO_PROPUESTA,
      });
      const bruto = String((r as any).text || '');
      const m = bruto.match(/\{[\s\S]*\}/);
      let acciones: any[] = [];
      try { acciones = JSON.parse(m ? m[0] : '{}').acciones || []; } catch { acciones = []; }
      acciones = acciones.slice(0, 8).map((a: any) => ({
        titulo: String(a?.titulo || '').slice(0, 160), detalle: String(a?.detalle || '').slice(0, 600),
        prioridad: ['alta', 'media', 'baja'].includes(a?.prioridad) ? a.prioridad : 'media',
        tipo: String(a?.tipo || 'contenido').slice(0, 30),
      })).filter((a: any) => a.titulo);
      if (!acciones.length) return res.status(502).json({ error: 'La IA no ha devuelto una propuesta utilizable. Vuelve a intentarlo.' });
      res.json({ acciones });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });
}

/** Las recomendaciones salen de lo medido y de lo que tiene la página; no de una lista fija. */
function recomendar(
  ultima: any, anterior: any,
  x: { tablas: number; imagenesSinComprimir: number },
) {
  const r: Array<{ id: string; titulo: string; detalle: string; accion: string | null }> = [];
  if (ultima && (ultima.bytes_max > LIMITE_IMAGEN_BYTES || ultima.bytes_imagenes > LIMITE_TOTAL_BYTES) && x.imagenesSinComprimir > 0) {
    r.push({
      id: 'comprimir', accion: 'comprimir_imagenes',
      titulo: 'Comprimir las imágenes',
      detalle: `${ultima.n_imagenes === 1 ? 'Su imagen pesa' : `Sus ${ultima.n_imagenes} imágenes pesan`} ${(ultima.bytes_imagenes / 1_000_000).toFixed(1).replace('.', ',')} MB; la mayor, ${(ultima.bytes_max / 1000).toFixed(0)} KB. Redimensionadas a 1.600 px y comprimidas quedan en una fracción.`,
    });
  }
  if (ultima && ultima.ms_total > 2500) {
    r.push({
      id: 'lento', accion: null,
      titulo: 'Tarda más de 2,5 segundos',
      detalle: `Medida: ${(ultima.ms_total / 1000).toFixed(1)} s en total (${ultima.ms_contenido} ms de contenido, ${ultima.ms_imagenes} ms de imágenes). Si lo de arriba no basta, revisa cuántas tablas tienen muchas filas con imágenes.`,
    });
  }
  if (anterior && ultima && ultima.ms_total > anterior.ms_total * 1.2 && ultima.ms_total - anterior.ms_total > 300) {
    r.push({
      id: 'empeorado', accion: null,
      titulo: 'Ha empeorado desde la última medición',
      detalle: `Pasó de ${(anterior.ms_total / 1000).toFixed(1)} s a ${(ultima.ms_total / 1000).toFixed(1)} s. Mira qué se añadió desde entonces.`,
    });
  }
  return r;
}
