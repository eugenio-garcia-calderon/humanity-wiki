import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ROLE } from './auth.js';

// ============================================================================
// CUENTA DE SPOTIFY (2026-08-18, petición de Eugenio)
// ============================================================================
// Al plantar música en el mapa 3D, además de pegar un link o subir un archivo,
// el jugador conecta su Spotify y elige de SUS playlists y canciones guardadas.
// Gemelo del módulo de YouTube (youtube.ts): OAuth con ventanita, tokens en
// `spotify_accounts` (migración 0034), 503 con aviso claro si faltan
// SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET, y desconectar BORRA la fila.
// Permisos de solo lectura: playlists privadas y canciones guardadas.

const SCOPE = 'playlist-read-private user-library-read';

const config = () => ({
  id: process.env.SPOTIFY_CLIENT_ID,
  secret: process.env.SPOTIFY_CLIENT_SECRET,
  app: process.env.APP_URL || 'http://localhost:3000',
});

const pendientes = new Map<string, { userId: string; expira: number }>();

export function registerSpotifyRoutes(app: Express, db: any) {
  const requiereUsuario = (req: Request, res: Response): boolean => {
    if (!req.user) { res.status(401).json({ error: 'Debes iniciar sesión.' }); return false; }
    if ((req.user.roleLevel ?? 0) < ROLE.USER) {
      res.status(403).json({ error: 'Necesitas una cuenta para conectar Spotify.' }); return false;
    }
    return true;
  };

  const cuentaDe = async (userId: string) => {
    const r = await db.execute(sql`SELECT * FROM spotify_accounts WHERE user_id = ${userId}`);
    return r.rows[0] as any | undefined;
  };

  /** El token de Spotify caduca cada hora: se refresca al vuelo cuando toca. */
  const tokenVigente = async (userId: string): Promise<string | null> => {
    const c = await cuentaDe(userId);
    if (!c) return null;
    const caducado = c.token_expiry && new Date(c.token_expiry).getTime() < Date.now() + 60_000;
    if (!caducado) return c.access_token;
    if (!c.refresh_token) return null;
    const { id, secret } = config();
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: c.refresh_token }),
    });
    if (!r.ok) {
      await db.execute(sql`DELETE FROM spotify_accounts WHERE user_id = ${userId}`);
      return null;
    }
    const t: any = await r.json();
    const expiry = new Date(Date.now() + (t.expires_in || 3600) * 1000);
    await db.execute(sql`
      UPDATE spotify_accounts SET access_token = ${t.access_token},
        refresh_token = COALESCE(${t.refresh_token || null}, refresh_token),
        token_expiry = ${expiry.toISOString()}, updated_at = now()
      WHERE user_id = ${userId}
    `);
    return t.access_token;
  };

  app.get('/api/spotify/estado', async (req: Request, res: Response) => {
    try {
      const { id, secret } = config();
      const configurado = !!(id && secret);
      if (!req.user) return res.json({ configurado, conectado: false, cuenta: null });
      const c = await cuentaDe(req.user.id);
      res.json({
        configurado,
        conectado: !!c,
        cuenta: c ? { nombre: c.display_name, foto: c.avatar_url } : null,
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  app.get('/api/spotify/conectar', async (req: Request, res: Response) => {
    if (!requiereUsuario(req, res)) return;
    const { id, secret, app: base } = config();
    if (!id || !secret) {
      return res.status(503).send('La conexión con Spotify está construida pero inactiva: faltan SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET en el servidor.');
    }
    const state = `sp${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
    pendientes.set(state, { userId: req.user!.id, expira: Date.now() + 10 * 60_000 });
    for (const [k, v] of pendientes) if (v.expira < Date.now()) pendientes.delete(k);
    const url = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
      client_id: id,
      response_type: 'code',
      redirect_uri: `${base}/api/spotify/callback`,
      scope: SCOPE,
      state,
    });
    res.redirect(url);
  });

  app.get('/api/spotify/callback', async (req: Request, res: Response) => {
    const cerrar = (mensaje: string, ok: boolean) => res.send(`<!doctype html><meta charset="utf-8">
<body style="font-family:system-ui;display:grid;place-items:center;height:96vh;background:#0f172a;color:#e2e8f0">
<div style="text-align:center"><p style="font-size:2rem">${ok ? '✅' : '⚠️'}</p><p>${mensaje}</p></div>
<script>if(window.opener){try{window.opener.postMessage('spotify:${ok ? 'conectado' : 'error'}','*')}catch(e){};setTimeout(()=>window.close(),${ok ? 400 : 2500})}else{setTimeout(()=>{location.href='/juego'},1500)}</script>`);
    try {
      const { id, secret, app: base } = config();
      const state = String(req.query.state || '');
      const pend = pendientes.get(state);
      pendientes.delete(state);
      if (!pend || pend.expira < Date.now()) return cerrar('La conexión caducó. Vuelve a intentarlo.', false);
      if (req.query.error) return cerrar('No se dio permiso a Spotify. No se ha conectado nada.', false);
      const code = String(req.query.code || '');
      if (!code) return cerrar('Spotify no devolvió el código.', false);

      const r = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code', code,
          redirect_uri: `${base}/api/spotify/callback`,
        }),
      });
      if (!r.ok) { console.error('spotify token', await r.text()); return cerrar('Spotify rechazó el intercambio de tokens.', false); }
      const t: any = await r.json();
      const expiry = new Date(Date.now() + (t.expires_in || 3600) * 1000);

      let cuenta = { nombre: null as string | null, foto: null as string | null };
      try {
        const mr = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${t.access_token}` } });
        const mj: any = await mr.json();
        cuenta = { nombre: mj.display_name || null, foto: mj.images?.[0]?.url || null };
      } catch { /* sin nombre la conexión vale igual */ }

      await db.execute(sql`
        INSERT INTO spotify_accounts (user_id, access_token, refresh_token, token_expiry, display_name, avatar_url)
        VALUES (${pend.userId}, ${t.access_token}, ${t.refresh_token || null}, ${expiry.toISOString()}, ${cuenta.nombre}, ${cuenta.foto})
        ON CONFLICT (user_id) DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = COALESCE(EXCLUDED.refresh_token, spotify_accounts.refresh_token),
          token_expiry = EXCLUDED.token_expiry,
          display_name = EXCLUDED.display_name,
          avatar_url = EXCLUDED.avatar_url,
          updated_at = now()
      `);
      cerrar('Spotify conectado. Ya puedes cerrar esta ventana.', true);
    } catch (e: any) { console.error(e); cerrar('Algo falló conectando con Spotify.', false); }
  });

  app.post('/api/spotify/desconectar', async (req: Request, res: Response) => {
    if (!requiereUsuario(req, res)) return;
    try {
      // Spotify no tiene endpoint de revocación: quitar el permiso del todo se
      // hace desde spotify.com/account/apps. Borrar la credencial ya corta
      // todo lo que ESTA app puede hacer.
      await db.execute(sql`DELETE FROM spotify_accounts WHERE user_id = ${req.user!.id}`);
      res.json({ ok: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Para el selector de música: tus playlists y tus canciones guardadas. */
  app.get('/api/spotify/eleccion', async (req: Request, res: Response) => {
    if (!requiereUsuario(req, res)) return;
    try {
      const token = await tokenVigente(req.user!.id);
      if (!token) return res.status(401).json({ error: 'Spotify no está conectado (o la conexión caducó).' });
      const auth = { headers: { Authorization: `Bearer ${token}` } };
      const [pl, tr] = await Promise.all([
        fetch('https://api.spotify.com/v1/me/playlists?limit=20', auth).then(r => r.ok ? r.json() : { items: [] }),
        fetch('https://api.spotify.com/v1/me/tracks?limit=20', auth).then(r => r.ok ? r.json() : { items: [] }),
      ]);
      res.json({
        playlists: ((pl as any).items || []).map((p: any) => ({
          nombre: p.name,
          url: p.external_urls?.spotify,
          imagen: p.images?.[0]?.url || null,
          pistas: p.tracks?.total ?? null,
        })).filter((p: any) => p.url),
        canciones: ((tr as any).items || []).map((i: any) => ({
          nombre: i.track?.name,
          artista: (i.track?.artists || []).map((a: any) => a.name).join(', '),
          url: i.track?.external_urls?.spotify,
          imagen: i.track?.album?.images?.[2]?.url || i.track?.album?.images?.[0]?.url || null,
        })).filter((c: any) => c.url),
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });
}
