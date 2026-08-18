import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ROLE } from './auth.js';

// ============================================================================
// GRAN PANTALLA DE YOUTUBE (2026-08-18, petición de Eugenio)
// ============================================================================
// En la aldea hay una gran pantalla de cine. Al pulsarla, el jugador conecta
// su cuenta de YouTube (OAuth de Google, permiso de SOLO LECTURA) y la
// pantalla le recomienda vídeos nuevos de sus suscripciones que tengan que
// ver con sus proyectos.
//
// Decisiones que conviene conocer antes de tocar esto:
// - Los vídeos por canal salen del RSS PÚBLICO de YouTube
//   (youtube.com/feeds/videos.xml), que no gasta cuota de la API. La API
//   solo se usa para lo que el RSS no da: la lista de suscripciones del
//   usuario (dato privado, de ahí el OAuth).
// - La relación con los proyectos es por palabras clave del título, la
//   descripción y las tarjetas del tablero, normalizadas sin tildes. Sin IA:
//   determinista, gratis y suficiente para la primera versión.
// - Los tokens viven en `youtube_accounts` (migración 0033). Son una
//   credencial, no conocimiento: desconectar BORRA la fila y revoca el token
//   en Google. Aquí no hay archivado.
// - Reutiliza el MISMO cliente OAuth del login con Google. Necesita
//   GOOGLE_CLIENT_SECRET además del GOOGLE_CLIENT_ID, y que el redirect
//   /api/youtube/callback esté dado de alta en la consola de Google. Si
//   falta algo, responde 503 con el aviso en claro (el patrón de la IA).

const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
const MAX_CANALES = 20;      // suscripciones consultadas (orden de relevancia de YouTube)
const DIAS_NUEVO = 60;       // un vídeo «nuevo» tiene como mucho esto
const CACHE_MS = 10 * 60_000;

const config = () => ({
  id: process.env.GOOGLE_CLIENT_ID,
  secret: process.env.GOOGLE_CLIENT_SECRET,
  app: process.env.APP_URL || 'http://localhost:3000',
});

/** Estados OAuth pendientes (anti-CSRF): state → quién lo pidió y hasta cuándo. */
const pendientes = new Map<string, { userId: string; expira: number }>();

/** Caché de recomendaciones por usuario: 50 RSS por visita sería un abuso. */
const cacheRecs = new Map<string, { t: number; datos: any }>();

// Palabras que no dicen nada del tema (es/en). Corta, a propósito: mejor
// dejar pasar una palabra sosa que perder una relevante.
const VACIAS = new Set([
  'para', 'como', 'este', 'esta', 'esto', 'estos', 'estas', 'donde', 'cuando',
  'sobre', 'entre', 'desde', 'hasta', 'porque', 'aunque', 'tambien', 'todo',
  'toda', 'todos', 'todas', 'hacer', 'hecho', 'tiene', 'tienen', 'quiero',
  'nuevo', 'nueva', 'proyecto', 'proyectos', 'tarea', 'tareas', 'cosas',
  'with', 'this', 'that', 'from', 'have', 'what', 'when', 'where', 'your',
]);

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Palabras clave de un texto: normalizadas, sin vacías, de 4+ letras. */
const palabrasClave = (texto: string): string[] => {
  const limpio = normalizar(texto).replace(/[^a-zñ0-9\s]/g, ' ');
  return [...new Set(limpio.split(/\s+/).filter(w => w.length >= 4 && !VACIAS.has(w)))];
};

export function registerYoutubeRoutes(app: Express, db: any) {
  const requiereUsuario = (req: Request, res: Response): boolean => {
    if (!req.user) { res.status(401).json({ error: 'Debes iniciar sesión.' }); return false; }
    if ((req.user.roleLevel ?? 0) < ROLE.USER) {
      res.status(403).json({ error: 'Necesitas una cuenta para conectar YouTube.' }); return false;
    }
    return true;
  };

  const cuentaDe = async (userId: string) => {
    const r = await db.execute(sql`SELECT * FROM youtube_accounts WHERE user_id = ${userId}`);
    return r.rows[0] as any | undefined;
  };

  /** Token vigente para llamar a la API; refresca si está caducado o al caer. */
  const tokenVigente = async (userId: string): Promise<string | null> => {
    const c = await cuentaDe(userId);
    if (!c) return null;
    const caducado = c.token_expiry && new Date(c.token_expiry).getTime() < Date.now() + 60_000;
    if (!caducado) return c.access_token;
    if (!c.refresh_token) return null;
    const { id, secret } = config();
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: id!, client_secret: secret!,
        refresh_token: c.refresh_token, grant_type: 'refresh_token',
      }),
    });
    if (!r.ok) {
      // El usuario retiró el permiso desde Google: la conexión ya no vale.
      await db.execute(sql`DELETE FROM youtube_accounts WHERE user_id = ${userId}`);
      return null;
    }
    const t: any = await r.json();
    const expiry = new Date(Date.now() + (t.expires_in || 3600) * 1000);
    await db.execute(sql`
      UPDATE youtube_accounts SET access_token = ${t.access_token},
        token_expiry = ${expiry.toISOString()}, updated_at = now()
      WHERE user_id = ${userId}
    `);
    return t.access_token;
  };

  /** ¿Está montado el OAuth y conectada la cuenta de este usuario? */
  app.get('/api/youtube/estado', async (req: Request, res: Response) => {
    try {
      const { id, secret } = config();
      const configurado = !!(id && secret);
      if (!req.user) return res.json({ configurado, conectado: false, canal: null });
      const c = await cuentaDe(req.user.id);
      res.json({
        configurado,
        conectado: !!c,
        canal: c ? { titulo: c.channel_title, foto: c.channel_thumb } : null,
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Arranque del OAuth: manda al consentimiento de Google (en una ventanita). */
  app.get('/api/youtube/conectar', async (req: Request, res: Response) => {
    if (!requiereUsuario(req, res)) return;
    const { id, secret, app: base } = config();
    if (!id || !secret) {
      return res.status(503).send('La conexión con YouTube está construida pero inactiva: faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en el servidor.');
    }
    const state = `yt${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
    pendientes.set(state, { userId: req.user!.id, expira: Date.now() + 10 * 60_000 });
    for (const [k, v] of pendientes) if (v.expira < Date.now()) pendientes.delete(k);
    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: id,
      redirect_uri: `${base}/api/youtube/callback`,
      response_type: 'code',
      scope: SCOPE,
      access_type: 'offline',   // para el refresh_token: la pantalla funciona sin re-pedir permiso
      prompt: 'consent',
      state,
    });
    res.redirect(url);
  });

  /** Vuelta de Google: cambia el código por tokens y guarda la cuenta. */
  app.get('/api/youtube/callback', async (req: Request, res: Response) => {
    const cerrar = (mensaje: string, ok: boolean) => res.send(`<!doctype html><meta charset="utf-8">
<body style="font-family:system-ui;display:grid;place-items:center;height:96vh;background:#0f172a;color:#e2e8f0">
<div style="text-align:center"><p style="font-size:2rem">${ok ? '✅' : '⚠️'}</p><p>${mensaje}</p></div>
<script>if(window.opener){try{window.opener.postMessage('youtube:${ok ? 'conectado' : 'error'}','*')}catch(e){};setTimeout(()=>window.close(),${ok ? 400 : 2500})}else{setTimeout(()=>{location.href='/juego'},1500)}</script>`);
    try {
      const { id, secret, app: base } = config();
      const state = String(req.query.state || '');
      const pend = pendientes.get(state);
      pendientes.delete(state);
      if (!pend || pend.expira < Date.now()) return cerrar('La conexión caducó. Vuelve a intentarlo desde la pantalla.', false);
      if (req.query.error) return cerrar('No se dio permiso a YouTube. No se ha conectado nada.', false);
      const code = String(req.query.code || '');
      if (!code) return cerrar('Google no devolvió el código.', false);

      const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code, client_id: id!, client_secret: secret!,
          redirect_uri: `${base}/api/youtube/callback`, grant_type: 'authorization_code',
        }),
      });
      if (!r.ok) { console.error('youtube token', await r.text()); return cerrar('Google rechazó el intercambio de tokens.', false); }
      const t: any = await r.json();
      const expiry = new Date(Date.now() + (t.expires_in || 3600) * 1000);

      // El nombre y la foto del canal, para que la pantalla salude con él.
      let canal = { titulo: null as string | null, foto: null as string | null };
      try {
        const cr = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
          headers: { Authorization: `Bearer ${t.access_token}` },
        });
        const cj: any = await cr.json();
        const sn = cj.items?.[0]?.snippet;
        if (sn) canal = { titulo: sn.title || null, foto: sn.thumbnails?.default?.url || null };
      } catch { /* sin nombre de canal la conexión vale igual */ }

      // Un re-consent puede venir SIN refresh_token: se conserva el que había.
      await db.execute(sql`
        INSERT INTO youtube_accounts (user_id, access_token, refresh_token, token_expiry, channel_title, channel_thumb)
        VALUES (${pend.userId}, ${t.access_token}, ${t.refresh_token || null}, ${expiry.toISOString()}, ${canal.titulo}, ${canal.foto})
        ON CONFLICT (user_id) DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = COALESCE(EXCLUDED.refresh_token, youtube_accounts.refresh_token),
          token_expiry = EXCLUDED.token_expiry,
          channel_title = EXCLUDED.channel_title,
          channel_thumb = EXCLUDED.channel_thumb,
          updated_at = now()
      `);
      cacheRecs.delete(pend.userId);
      cerrar('YouTube conectado. Ya puedes cerrar esta ventana.', true);
    } catch (e: any) { console.error(e); cerrar('Algo falló conectando con YouTube.', false); }
  });

  /** Desconectar: revoca en Google y borra la credencial (borrado real). */
  app.post('/api/youtube/desconectar', async (req: Request, res: Response) => {
    if (!requiereUsuario(req, res)) return;
    try {
      const c = await cuentaDe(req.user!.id);
      if (c) {
        try {
          await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(c.refresh_token || c.access_token), { method: 'POST' });
        } catch { /* revocar es cortesía; borrar la fila es lo que manda */ }
        await db.execute(sql`DELETE FROM youtube_accounts WHERE user_id = ${req.user!.id}`);
      }
      cacheRecs.delete(req.user!.id);
      res.json({ ok: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * Las recomendaciones: vídeos nuevos de tus suscripciones, puntuados contra
   * las palabras clave de TUS proyectos. Dos listas: `relacionados` (con la
   * explicación de con qué proyecto casan) y `recientes` (el resto, por fecha).
   */
  app.get('/api/youtube/recomendaciones', async (req: Request, res: Response) => {
    if (!requiereUsuario(req, res)) return;
    try {
      const cache = cacheRecs.get(req.user!.id);
      if (cache && Date.now() - cache.t < CACHE_MS) return res.json(cache.datos);

      const token = await tokenVigente(req.user!.id);
      if (!token) return res.status(401).json({ error: 'YouTube no está conectado (o la conexión caducó). Conéctalo desde la pantalla.' });

      // 1) Tus suscripciones, en el orden de relevancia que ya calcula YouTube.
      const sr = await fetch(`https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=${MAX_CANALES}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!sr.ok) {
        console.error('youtube subs', await sr.text());
        return res.status(502).json({ error: 'YouTube no devolvió tus suscripciones. Prueba a reconectar.' });
      }
      const sj: any = await sr.json();
      const canales: Array<{ id: string; titulo: string }> = (sj.items || [])
        .map((i: any) => ({ id: i.snippet?.resourceId?.channelId, titulo: i.snippet?.title }))
        .filter((c: any) => c.id);

      // 2) Los vídeos recientes de cada canal, por su RSS público (sin cuota).
      const desde = Date.now() - DIAS_NUEVO * 86_400_000;
      const porCanal = await Promise.allSettled(canales.map(async (c) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        try {
          const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${c.id}`, { signal: ctrl.signal });
          const xml = await r.text();
          return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 8).map((m) => {
            const e = m[1];
            const saca = (re: RegExp) => (e.match(re) || [])[1] || '';
            return {
              videoId: saca(/<yt:videoId>([^<]+)<\/yt:videoId>/),
              titulo: saca(/<title>([^<]*)<\/title>/),
              descripcion: saca(/<media:description>([\s\S]*?)<\/media:description>/).slice(0, 400),
              miniatura: saca(/<media:thumbnail url="([^"]+)"/),
              publicado: saca(/<published>([^<]+)<\/published>/),
              canal: c.titulo,
            };
          }).filter(v => v.videoId && new Date(v.publicado).getTime() > desde);
        } finally { clearTimeout(timer); }
      }));
      const videos = porCanal.flatMap(p => p.status === 'fulfilled' ? p.value : []);

      // 3) Las palabras clave de TUS proyectos (título, descripción y tarjetas).
      const proys = (await db.execute(sql`
        SELECT p.id, p.titulo,
               concat_ws(' ', p.titulo, p.descripcion,
                 (SELECT string_agg(concat_ws(' ', r.titulo, r.resumen), ' ')
                    FROM roadmap_items r WHERE r.proyecto_id = p.id AND r.archived_at IS NULL)) AS texto
        FROM proyectos p
        WHERE p.archived_at IS NULL AND p.creador_user_id = ${req.user!.id}
      `)).rows as Array<{ id: string; titulo: string; texto: string }>;
      const temas = proys.map(p => ({ titulo: p.titulo, claves: palabrasClave(p.texto || '') }));

      // 4) Puntuar: cuántas claves de cada proyecto aparecen en el vídeo.
      const puntuados = videos.map(v => {
        const enTitulo = normalizar(v.titulo);
        const enTodo = `${enTitulo} ${normalizar(v.descripcion)}`;
        let puntos = 0;
        const relacionadoCon: string[] = [];
        for (const t of temas) {
          const aciertos = t.claves.filter(k => enTodo.includes(k));
          if (!aciertos.length) continue;
          relacionadoCon.push(t.titulo);
          puntos += aciertos.length * 2 + aciertos.filter(k => enTitulo.includes(k)).length;
        }
        return { ...v, url: `https://www.youtube.com/watch?v=${v.videoId}`, puntos, relacionadoCon };
      });

      const orden = (a: any, b: any) => new Date(b.publicado).getTime() - new Date(a.publicado).getTime();
      const relacionados = puntuados.filter(v => v.puntos > 0)
        .sort((a, b) => b.puntos - a.puntos || orden(a, b)).slice(0, 12);
      const idsRel = new Set(relacionados.map(v => v.videoId));
      const recientes = puntuados.filter(v => !idsRel.has(v.videoId)).sort(orden).slice(0, 12);

      const datos = { relacionados, recientes, canales: canales.length, proyectos: temas.map(t => t.titulo) };
      cacheRecs.set(req.user!.id, { t: Date.now(), datos });
      res.json(datos);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });
}
