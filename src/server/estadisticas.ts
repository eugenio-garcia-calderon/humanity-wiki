import type { Express, Request, Response } from 'express';
import crypto from 'node:crypto';
import { sql } from 'drizzle-orm';
import { rolEnPagina, capacidades, quienDe } from './permisos.js';
import { paginaVisible } from './sitios.js';
import { accesoMiembro } from './miembros.js';
import { ipDe } from './limites/index.js';

// ============================================================================
// ESTADÍSTICAS DE PÁGINA, SIN DATOS PERSONALES (2026-10-06, carril «acceso»)
// ============================================================================
// Visitas por día, visitantes únicos y de dónde vienen, para quien administra
// la página. El porqué de qué se guarda y qué no está en la migración 0139;
// aquí, lo que importa de la implementación:
//
//   · LA SAL DEL DÍA vive sólo en la memoria de este proceso y se descarta al
//     cambiar de día. Con ella se calcula la huella de cada visitante
//     (IP + agente); sin ella, la huella no se puede deshacer ni cotejar con
//     ninguna IP. Si el servidor se reinicia a mitad del día la sal cambia y
//     alguien puede contar dos veces ese día: se prefiere eso a guardarla.
//   · SÓLO CUENTA LO QUE SE PUBLICA. La visita la manda el navegador de una
//     página pública (o de un sitio con miembros) ya cargada; no se cuentan las
//     del editor, ni las de quien administra la página, ni los robots.
//   · NO SE PUEDE INFLAR DESDE FUERA: una huella es una fila por día, así que
//     repetir la petición no crea visitantes únicos nuevos, y las visitas de
//     una misma huella no suben más de una cada 20 segundos.

let salDe = { dia: '', sal: '' };
function sal(dia: string) {
  if (salDe.dia !== dia) salDe = { dia, sal: crypto.randomBytes(24).toString('hex') };
  return salDe.sal;
}
const hoy = () => new Date().toISOString().slice(0, 10);

const ROBOTS = /bot|crawl|spider|slurp|preview|fetch|monitor|headless|curl|wget|python|node-fetch|facebookexternalhit|whatsapp|telegram/i;
const BUSCADORES = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave|yandex|baidu|qwant|startpage)\./i;
const REDES = /(^|\.)(facebook|instagram|twitter|x|t|linkedin|reddit|youtube|tiktok|pinterest|whatsapp|telegram|threads|mastodon|bsky)\.(com|co|me|app|social)$/i;

/** De un referente, sólo el nombre del sitio, agrupado. Nunca la dirección. */
export function origenDe(referente: unknown, propios: string[]): string {
  if (typeof referente !== 'string' || !referente) return 'directo';
  let host = '';
  try { host = new URL(referente).hostname.toLowerCase().replace(/^www\./, ''); } catch { return 'directo'; }
  if (!host || propios.some(p => host === p || host.endsWith('.' + p))) return 'directo';
  if (BUSCADORES.test(host + '.')) return 'buscador';
  if (REDES.test(host)) return 'red';
  return host.slice(0, 80);
}

export function registrarEstadisticas(app: Express, db: any) {
  /** Barrido de lo viejo: una vez al día, 400 días de historia. */
  const barrer = () => db.execute(sql`DELETE FROM pagina_visitas WHERE dia < current_date - 400`).catch(() => {});
  setTimeout(barrer, 60_000).unref?.();
  setInterval(barrer, 24 * 3600_000).unref?.();

  /** Una visita. `{ referente }` lo manda el navegador (`document.referrer`). */
  app.post('/api/estadisticas/visita/:id', async (req: Request, res: Response) => {
    try {
      // Siempre 204: quien cuenta no debe poder usar esto para averiguar nada.
      const fin = () => res.status(204).end();
      if (ROBOTS.test(String(req.headers['user-agent'] || '')) || !req.headers['user-agent']) return fin();
      const id = String(req.params.id);
      const a = await rolEnPagina(db, quienDe(req), id);
      if (!a.existe) return fin();
      // Quien la administra no cuenta: sus visitas son sus ediciones.
      if (capacidades(a).gestionar) return fin();
      const m = await accesoMiembro(db, req, id);
      const visible = capacidades(a).ver || await paginaVisible(db, id) || (!!m && m.permitido && (m.restringida || m.esEquipo));
      if (!visible) return fin();
      const dia = hoy();
      const huella = crypto.createHash('sha256').update(`${sal(dia)}|${ipDe(req)}|${req.headers['user-agent']}`).digest('hex').slice(0, 32);
      const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].toLowerCase().replace(/:\d+$/, '');
      const origen = origenDe(req.body?.referente, [host, 'humanity.wiki']);
      await db.execute(sql`
        INSERT INTO pagina_visitas (pagina_id, dia, huella, origen)
        VALUES (${id}, ${dia}, ${huella}, ${origen})
        ON CONFLICT (pagina_id, dia, huella) DO UPDATE
          SET visitas = pagina_visitas.visitas + 1, ultima = now()
          WHERE pagina_visitas.ultima < now() - interval '20 seconds'
      `);
      fin();
    } catch { res.status(204).end(); }
  });

  /** Las cifras para quien administra la página. `?dias=` de 7 a 365. */
  app.get('/api/estadisticas/pagina/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const id = String(req.params.id);
      const a = await rolEnPagina(db, quienDe(req), id);
      if (!a.existe) return res.status(404).json({ error: 'Esa página no existe.' });
      if (!capacidades(a).gestionar) return res.status(403).json({ error: 'Las estadísticas las ve quien administra la página.' });
      const dias = Math.min(365, Math.max(7, Number(req.query.dias) || 30));
      const porDia = await db.execute(sql`
        SELECT d::date AS dia, COALESCE(sum(v.visitas), 0)::int AS visitas, count(v.huella)::int AS unicos
        FROM generate_series(current_date - (${dias - 1})::int, current_date, interval '1 day') d
        LEFT JOIN pagina_visitas v ON v.pagina_id = ${id} AND v.dia = d::date
        GROUP BY d ORDER BY d
      `);
      const origenes = await db.execute(sql`
        SELECT origen, count(*)::int AS unicos, sum(visitas)::int AS visitas
        FROM pagina_visitas WHERE pagina_id = ${id} AND dia > current_date - (${dias})::int
        GROUP BY origen ORDER BY unicos DESC, visitas DESC LIMIT 12
      `);
      const otros = await db.execute(sql`
        SELECT (SELECT count(*)::int FROM follows WHERE entity_type = 'pagina' AND entity_id = ${id}) AS seguidores,
               (SELECT count(*)::int FROM comentarios_pagina WHERE pagina_id = ${id} AND hilo_id IS NULL AND borrado_en IS NULL) AS hilos
      `);
      const dia = (porDia.rows as any[]).map(r => ({ dia: String(r.dia).slice(0, 10), visitas: r.visitas, unicos: r.unicos }));
      res.json({
        dias, por_dia: dia,
        total_visitas: dia.reduce((s, r) => s + r.visitas, 0),
        // Suma de los únicos de cada día: una persona que vuelve otro día
        // cuenta otra vez. No se puede hacer mejor sin seguirla (ver 0139).
        unicos_por_dia: dia.reduce((s, r) => s + r.unicos, 0),
        origenes: origenes.rows, ...(otros.rows[0] as any),
      });
    } catch (e: any) { console.error('estadisticas:', e); res.status(500).json({ error: e.message }); }
  });
}
