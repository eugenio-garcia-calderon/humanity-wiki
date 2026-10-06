import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { rolEnPagina, capacidades, quienDe } from './permisos.js';
import { paginaVisible } from './sitios.js';

// ============================================================================
// PRESENCIA EN UNA PÁGINA Y AVISO DE «ALGUIEN HA GUARDADO» (2026-10-06)
// ============================================================================
// Primer paso de la edición simultánea. El diseño completo, lo que falta y el
// camino a un CRDT (Yjs) están en la cabecera de `src/utils/colaboracion.ts`.
//
// ── POR QUÉ SSE ────────────────────────────────────────────────────────────
// Lo mismo que `telecomHub.ts`: un WebSocket exige tocar `server.ts`
// (congelado); SSE es una ruta de Express y atraviesa Cloudflare. El navegador
// baja avisos por aquí y todo lo demás sube por peticiones normales.
//
// ── UNA SOLA PERSONA PUEDE TENER VARIAS PESTAÑAS ───────────────────────────
// Cada conexión lleva su propio `conexion` (uuid). La lista que se enseña
// agrupa por persona (una cara por persona, no por pestaña), y el aviso
// `guardado` no se manda a la pestaña que acaba de guardar: ella ya lo sabe.
//
// ── LÍMITES CONOCIDOS ──────────────────────────────────────────────────────
// El registro vive en la memoria de ESTE proceso. Con varios procesos cada uno
// vería sólo a quienes están conectados a él: habría que repartirlo con
// `LISTEN/NOTIFY` (ver «y cuando haya ocho procesos» en `telecomHub.ts`).
// Hoy hay un proceso.

interface Visitante {
  conexion: string;
  userId: string;
  nombre: string;
  avatar: string | null;
  color: string;
  /** Si puede escribir (no se enseña a quien sólo mira, sólo se marca). */
  edita: boolean;
  res: Response;
}

/** página → conexiones abiertas. */
const salas = new Map<string, Map<string, Visitante>>();

/** Colores de las caras: los mismos para la misma persona en todas las
 *  páginas (salen de su id), así «la de verde» es siempre la misma. */
const COLORES = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#ef4444', '#14b8a6'];
const colorDe = (id: string) => COLORES[[...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORES.length];

/** Quién hay, una vez por persona. */
function lista(pagina: string) {
  const sala = salas.get(pagina);
  if (!sala) return [];
  const porPersona = new Map<string, { id: string; nombre: string; avatar: string | null; color: string; edita: boolean; pestanas: number }>();
  for (const v of sala.values()) {
    const p = porPersona.get(v.userId);
    if (p) { p.pestanas++; p.edita = p.edita || v.edita; }
    else porPersona.set(v.userId, { id: v.userId, nombre: v.nombre, avatar: v.avatar, color: v.color, edita: v.edita, pestanas: 1 });
  }
  return [...porPersona.values()];
}

const escribir = (res: Response, evento: string, dato: unknown) => {
  try { res.write(`event: ${evento}\ndata: ${JSON.stringify(dato)}\n\n`); } catch { /* conexión cerrada: la suelta su `close` */ }
};

function repartirPresencia(pagina: string) {
  const sala = salas.get(pagina);
  if (!sala) return;
  const quienes = lista(pagina);
  for (const v of sala.values()) escribir(v.res, 'presencia', { personas: quienes });
}

/**
 * «Alguien ha guardado la página»: lo llama quien escribe la página (el PUT de
 * `/api/windows/:id`). `desdeConexion` es la pestaña que guardó, que no se
 * entera por aquí.
 */
export function avisarGuardado(pagina: string, version: number, userId: string | null, desdeConexion?: string | null) {
  const sala = salas.get(pagina);
  if (!sala) return;
  const quien = userId ? [...sala.values()].find(v => v.userId === userId) : undefined;
  for (const v of sala.values()) {
    if (desdeConexion && v.conexion === desdeConexion) continue;
    escribir(v.res, 'guardado', { version, por: quien?.nombre || null, porId: userId });
  }
}

export function registrarColaboracion(app: Express, db: any) {
  /**
   * `GET /api/paginas/:id/presencia` — SSE. Lo abre el editor mientras tiene
   * la página en pantalla. Primer evento `hola` con el identificador de esta
   * pestaña (que el editor manda de vuelta al guardar), luego `presencia` cada
   * vez que alguien entra o sale, y `guardado` cuando alguien guarda.
   * Hace falta sesión y poder VER la página: saber quién la tiene abierta es
   * contar algo de ella.
   */
  app.get('/api/paginas/:id/presencia', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const id = req.params.id;
      const acceso = capacidades(await rolEnPagina(db, quienDe(req), id));
      if (!acceso.ver && !await paginaVisible(db, id)) return res.status(404).json({ error: 'Esa página no existe o no es visible.' });

      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        // Sin esto, nginx/Cloudflare guardan la respuesta hasta que acabe, que no acaba nunca.
        'X-Accel-Buffering': 'no',
      });
      const u = (await db.execute(sql`SELECT COALESCE(display_name, name, email) AS nombre, avatar_url FROM users WHERE id = ${req.user.id}`)).rows[0] as any;
      const conexion = randomUUID();
      const v: Visitante = {
        conexion, userId: req.user.id, nombre: u?.nombre || 'Alguien', avatar: u?.avatar_url || null,
        color: colorDe(req.user.id), edita: acceso.editar, res,
      };
      let sala = salas.get(id);
      if (!sala) { sala = new Map(); salas.set(id, sala); }
      sala.set(conexion, v);
      escribir(res, 'hola', { conexion, yo: req.user.id });
      repartirPresencia(id);

      // Latido: un comentario cada 25 s mantiene viva la conexión a través de
      // proxies, y si la pestaña murió sin avisar el `write` falla y se limpia.
      const latido = setInterval(() => { try { res.write(': latido\n\n'); } catch { cerrar(); } }, 25_000);
      const cerrar = () => {
        clearInterval(latido);
        const s = salas.get(id);
        if (!s || !s.delete(conexion)) return;
        if (s.size === 0) salas.delete(id); else repartirPresencia(id);
      };
      req.on('close', cerrar);
    } catch (e: any) {
      console.error('presencia:', e);
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  });
}
