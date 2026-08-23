// ============================================================================
// TUS VÍDEOS DE YOUTUBE, TRAÍDOS AQUÍ (2026-08-23) — fase 3 de 5
// ============================================================================
// Eugenio: «…y vídeos guardados de YouTube etc, pero los pintaremos a nuestra
// manera». Este módulo solo TRAE; lo de «a nuestra manera» es la pantalla.
//
// ── POR QUÉ ESTO NO ESTÁ EN `youtube.ts` ────────────────────────────────────
// Porque `youtube.ts` ya existe desde el 2026-08-18 y es OTRA COSA: la pantalla
// de cine de la aldea, que recomienda vídeos de tus suscripciones relacionados
// con tus proyectos. Tiene su propio permiso, su propia tabla de tokens
// (`youtube_accounts`) y su propio flujo.
//
// Estuve a punto de sobrescribirlo por llamarse igual. Que dos cosas usen
// YouTube no las hace la misma cosa: aquella RECOMIENDA lo que no has visto,
// esta ENSEÑA lo que ya has guardado.
//
// ── LO QUE SE TRAE, Y POR QUÉ NO MÁS ────────────────────────────────────────
// Los «me gusta» y las listas de reproducción propias. No las suscripciones
// enteras: alguien con doscientos canales suscritos tiene miles de vídeos
// nuevos al mes, y traérselos sería convertir esta tabla en un espejo de
// YouTube que nadie ha pedido. Lo que la gente llama «mis vídeos guardados» es
// lo que ha marcado a mano.
//
// ── EL PRESUPUESTO DE LA API, QUE ES UNA CUOTA DE VERDAD ────────────────────
// La API de YouTube no cobra en dinero sino en «unidades», y una cuenta tiene
// 10.000 al día. Los números que importan:
//
//   listar una página de una lista   1 unidad   (hasta 50 vídeos)
//   pedir los detalles de 50 vídeos  1 unidad
//   BUSCAR                         100 unidades ← cien veces más caro
//
// Por eso aquí no se busca NUNCA. Una sincronización de alguien con 500 vídeos
// gasta unas 20 unidades: cabe muchas veces al día. Una sola búsqueda gastaría
// cinco veces eso.
//
// ── Y POR ESO LA SINCRONIZACIÓN NO ES AUTOMÁTICA ────────────────────────────
// No hay temporizador que sincronice a todo el mundo cada hora: con cien
// personas conectadas sería gastar la cuota del día en gente que no ha abierto
// la pantalla. Se sincroniza al abrirla si la copia es vieja, y hay un botón.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { tokenDe } from './google.js';

const API = () => process.env.YOUTUBE_API_URL || 'https://www.googleapis.com/youtube/v3';

/** Cada cuánto se vuelve a preguntar, si nadie fuerza. Quince minutos: lo que
 *  tarda alguien en dar a «me gusta» y venir aquí a buscarlo, sin gastar cuota
 *  en cada recarga de la pantalla. */
const FRESCO_MS = 15 * 60 * 1000;

type Video = {
  video_id: string; titulo: string; canal: string | null; miniatura: string | null;
  duracion: string | null; publicado_at: string | null;
  origen: 'gusta' | 'lista'; lista_id: string | null; lista_nombre: string | null;
};

async function pedir(token: string, ruta: string, params: Record<string, string>) {
  const r = await fetch(`${API()}/${ruta}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(12000),
  });
  const j: any = await r.json().catch(() => null);
  if (!r.ok) throw new Error(String(j?.error?.errors?.[0]?.reason || j?.error?.message || r.status));
  return j;
}

async function sincronizar(db: any, userId: string, token: string) {
  const videos: Video[] = [];

  // ── LOS «ME GUSTA» ────────────────────────────────────────────────────────
  // `myRating=like` los da con sus detalles, sin pasar por la lista intermedia.
  // Es la llamada más barata que hay para esto.
  let pagina: string | undefined;
  do {
    const j = await pedir(token, 'videos', {
      part: 'snippet,contentDetails', myRating: 'like', maxResults: '50',
      ...(pagina ? { pageToken: pagina } : {}),
    });
    for (const v of j.items || []) {
      videos.push({
        video_id: String(v.id),
        titulo: String(v.snippet?.title || 'Sin título'),
        canal: v.snippet?.channelTitle || null,
        miniatura: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || null,
        duracion: v.contentDetails?.duration || null,
        publicado_at: v.snippet?.publishedAt || null,
        origen: 'gusta', lista_id: null, lista_nombre: null,
      });
    }
    pagina = j.nextPageToken;
    // Tope de seguridad: 10 páginas son 500 vídeos. Quien tenga más los verá en
    // la siguiente, y nadie se come la cuota del día de una sentada.
  } while (pagina && videos.length < 500);

  // ── LAS LISTAS PROPIAS ────────────────────────────────────────────────────
  const listas = await pedir(token, 'playlists', { part: 'snippet', mine: 'true', maxResults: '50' });
  for (const l of (listas.items || []).slice(0, 20)) {
    const items = await pedir(token, 'playlistItems', {
      part: 'snippet,contentDetails', playlistId: String(l.id), maxResults: '50',
    });
    for (const it of items.items || []) {
      const id = it.contentDetails?.videoId;
      if (!id) continue;
      videos.push({
        video_id: String(id),
        titulo: String(it.snippet?.title || 'Sin título'),
        canal: it.snippet?.videoOwnerChannelTitle || null,
        miniatura: it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || null,
        duracion: null,
        publicado_at: it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt || null,
        origen: 'lista', lista_id: String(l.id), lista_nombre: l.snippet?.title || null,
      });
    }
  }

  // ── DEJAR LA TABLA IGUAL QUE LA CUENTA ────────────────────────────────────
  // Se borra y se reescribe, EN UNA TRANSACCIÓN. Sin ella, un fallo de red a
  // mitad dejaría a la persona con la pantalla vacía y sus vídeos borrados de
  // aquí — que se ve exactamente igual que «has perdido tus vídeos».
  //
  // Podría compararse qué falta y qué sobra en vez de reescribir. No compensa:
  // son unos cientos de filas, y la comparación es donde nacen los duplicados.
  await db.transaction(async (tx: any) => {
    await tx.execute(sql`DELETE FROM videos_guardados WHERE user_id = ${userId}`);
    for (const v of videos) {
      await tx.execute(sql`
        INSERT INTO videos_guardados
          (user_id, video_id, titulo, canal, miniatura, duracion, publicado_at, origen, lista_id, lista_nombre)
        VALUES (${userId}, ${v.video_id}, ${v.titulo}, ${v.canal}, ${v.miniatura}, ${v.duracion},
                ${v.publicado_at}, ${v.origen}, ${v.lista_id}, ${v.lista_nombre})
        ON CONFLICT DO NOTHING
      `);
    }
  });

  return { traidos: videos.length };
}

export function registerMisVideosRoutes(app: Express, db: any) {
  /**
   * GET /api/mis-videos — lo que hay, y de cuándo es.
   *
   * SIEMPRE DICE DE CUÁNDO ES. La pantalla enseña «al día hace 3 minutos» en
   * vez de fingir que es lo que hay ahora mismo en tu cuenta: un listado viejo
   * presentado como actual es la forma más barata de que alguien crea que ha
   * perdido un vídeo.
   */
  app.get('/api/mis-videos', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const forzar = String(req.query.forzar || '') === 'si';

      const antes = await db.execute(sql`
        SELECT max(visto_at) AS ultima FROM videos_guardados WHERE user_id = ${req.user.id}
      `);
      const ultima = (antes.rows[0] as any)?.ultima as string | null;
      const vieja = !ultima || Date.now() - new Date(ultima).getTime() > FRESCO_MS;

      let aviso: string | null = null;
      if (forzar || vieja) {
        const token = await tokenDe(db, req.user.id);
        if (!token) {
          // NO ES UN ERROR: no hay cuenta conectada, o se ha soltado. Se dice
          // así, y se sirve lo que hubiera guardado, que sigue siendo suyo.
          aviso = 'sin-cuenta';
        } else {
          try {
            await sincronizar(db, req.user.id, token);
          } catch (e: any) {
            // AQUÍ TAMPOCO SE VACÍA NADA. YouTube puede estar caído o la cuota
            // agotada; lo que había sigue valiendo y se dice que es viejo, en
            // vez de enseñar una pantalla en blanco.
            console.error('[mis-videos] sincronizando:', e?.message || e);
            aviso = String(e?.message || '').toLowerCase().includes('quota') ? 'cuota' : 'no-responde';
          }
        }
      }

      const r = await db.execute(sql`
        SELECT video_id, titulo, canal, miniatura, duracion, publicado_at, origen,
               lista_id, lista_nombre, visto_at
        FROM videos_guardados WHERE user_id = ${req.user.id}
        ORDER BY publicado_at DESC NULLS LAST, titulo
        LIMIT 500
      `);
      const filas = r.rows as any[];
      res.json({ videos: filas, alDia: filas[0]?.visto_at || null, aviso });
    } catch (e: any) {
      console.error('[mis-videos]', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/mis-videos/gusta — quitar (o poner) el «me gusta», desde aquí.
   *
   * Es la única escritura de esta fase, y es la que justifica haber pedido
   * permiso de escritura: sin ella, «tus vídeos guardados» sería una pantalla
   * de solo mirar, y para quitar uno habría que irse a YouTube.
   *
   * SE ESCRIBE EN GOOGLE PRIMERO Y AQUÍ DESPUÉS. Al revés, un fallo de red
   * dejaría el vídeo quitado en nuestra pantalla y puesto en su cuenta: la
   * siguiente sincronización lo devolvería, y eso se lee como «la aplicación no
   * me hace caso».
   */
  app.post('/api/mis-videos/gusta', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const videoId = String(req.body?.videoId || '');
      const poner = req.body?.poner !== false;
      if (!videoId) return res.status(400).json({ error: 'Falta el vídeo.' });

      const token = await tokenDe(db, req.user.id);
      if (!token) return res.status(409).json({ error: 'No tienes conectada tu cuenta de Google.' });

      const r = await fetch(`${API()}/videos/rate?${new URLSearchParams({ id: videoId, rating: poner ? 'like' : 'none' })}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) {
        const j: any = await r.json().catch(() => null);
        return res.status(502).json({ error: j?.error?.message || 'YouTube no ha aceptado el cambio.' });
      }

      if (poner) {
        // No se inventa la fila: se marca la copia como vieja para que la
        // próxima apertura la traiga de verdad, con su título y su miniatura.
        await db.execute(sql`UPDATE videos_guardados SET visto_at = to_timestamp(0) WHERE user_id = ${req.user.id}`);
      } else {
        await db.execute(sql`
          DELETE FROM videos_guardados
          WHERE user_id = ${req.user.id} AND video_id = ${videoId} AND origen = 'gusta'
        `);
      }
      res.json({ ok: true });
    } catch (e: any) {
      console.error('[mis-videos] gusta:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
