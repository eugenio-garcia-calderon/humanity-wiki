// ============================================================================
// TU CALENDARIO DE GOOGLE (2026-08-23) — fase 5 de 5
// ============================================================================
// Cierra el plan. Tus citas de Google, en la plataforma, y poder crear una
// desde aquí sin cambiar de aplicación.
//
// ── ESTE NO GUARDA COPIA, Y ES LA EXCEPCIÓN DEL PLAN ────────────────────────
// Eugenio eligió «guardarlos para ir rápido» para lo de Google, y para los
// vídeos y los contactos se ha hecho así. Aquí no, y conviene decir por qué en
// vez de que parezca un olvido:
//
//   1. UN CALENDARIO CAMBIA MIENTRAS LO MIRAS. Alguien te mueve una reunión y
//      la copia te la enseña donde estaba. En una lista de vídeos, un dato de
//      hace diez minutos no hace daño; en una cita, sí — te presentas a la hora
//      que no es.
//   2. NO HACE FALTA. Se piden los eventos de una ventana de fechas concreta,
//      no la vida entera: son unas decenas de filas y Google contesta rápido.
//   3. Y ES EL DATO MÁS DELICADO DE LOS TRES. «Miércoles 17:00, oncología» dice
//      más de una persona que toda su lista de reproducción. No guardarlo es
//      no tenerlo que proteger, y no verlo salir del servidor cada noche en la
//      copia de seguridad.
//
// Si algún día hace falta caché por velocidad, que sea una decisión con esto
// delante y no por copiar lo que hacen los otros dos módulos.
import type { Express, Request, Response } from 'express';
import { tokenDe } from './google.js';

const API = () => process.env.CALENDAR_API_URL || 'https://www.googleapis.com/calendar/v3';

export function registerCalendarioGoogleRoutes(app: Express, db: any) {
  /**
   * GET /api/calendario/google?desde=…&hasta=… — tus citas de esa ventana.
   *
   * `singleEvents=true` desarrolla las series: sin él, una reunión semanal
   * llega como UNA cita con una regla de repetición y habría que interpretarla
   * aquí — que es la clase de código que se equivoca con el cambio de hora.
   */
  app.get('/api/calendario/google', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const token = await tokenDe(db, req.user.id);
      if (!token) return res.status(409).json({ error: 'No tienes conectada tu cuenta de Google.' });

      const ahora = new Date();
      const desde = String(req.query.desde || ahora.toISOString());
      const hasta = String(req.query.hasta
        || new Date(ahora.getTime() + 30 * 24 * 3600 * 1000).toISOString());

      const r = await fetch(`${API()}/calendars/primary/events?${new URLSearchParams({
        timeMin: desde, timeMax: hasta,
        singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
      })}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(12000),
      });
      const j: any = await r.json().catch(() => null);
      if (!r.ok) {
        console.error('[calendario-google]', j?.error?.message || r.status);
        return res.status(502).json({ error: 'Google no ha podido darnos tu calendario ahora mismo.' });
      }

      // SE DEVUELVE LO MÍNIMO, no el evento entero de Google. Un evento trae la
      // lista de invitados con sus correos, los enlaces de la videollamada y
      // los adjuntos; nada de eso hace falta para pintar una agenda, y lo que
      // no se manda al navegador no se puede filtrar desde el navegador.
      const citas = (j.items || []).map((e: any) => ({
        id: e.id,
        titulo: e.summary || '(sin título)',
        // `date` en vez de `dateTime` significa que dura todo el día. Se
        // distingue porque se pinta distinto y porque el huso horario no
        // aplica: un cumpleaños es el día 4 en todo el mundo.
        todoElDia: Boolean(e.start?.date),
        empieza: e.start?.dateTime || e.start?.date || null,
        acaba: e.end?.dateTime || e.end?.date || null,
        donde: e.location || null,
        enlace: e.htmlLink || null,
      }));
      res.json({ citas, desde, hasta });
    } catch (e: any) {
      console.error('[calendario-google]', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/calendario/google — crear una cita.
   *
   * La otra escritura del plan, junto al «me gusta» de YouTube. Es lo que
   * convierte esto en una agenda de verdad en vez de un escaparate: quedar con
   * alguien de la plataforma y que la cita aparezca en su Google.
   *
   * NO SE ESCRIBE NADA QUE NO HAYA PEDIDO LA PERSONA. Sin invitados
   * automáticos, sin videollamada creada por su cuenta, sin recordatorios que
   * nadie configuró. Una cita que aparece en el calendario de alguien con
   * cosas que él no puso es la forma más rápida de que retire el permiso.
   */
  app.post('/api/calendario/google', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const titulo = String(req.body?.titulo || '').trim().slice(0, 200);
      const empieza = String(req.body?.empieza || '');
      const acaba = String(req.body?.acaba || '');
      if (!titulo || !empieza || !acaba) {
        return res.status(400).json({ error: 'Hacen falta el título y las dos horas.' });
      }
      if (new Date(acaba) <= new Date(empieza)) {
        // Google lo aceptaría y crearía una cita imposible. Se para aquí, que
        // es donde se puede explicar.
        return res.status(400).json({ error: 'La cita no puede acabar antes de empezar.' });
      }

      const token = await tokenDe(db, req.user.id);
      if (!token) return res.status(409).json({ error: 'No tienes conectada tu cuenta de Google.' });

      const r = await fetch(`${API()}/calendars/primary/events`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: titulo,
          description: String(req.body?.nota || '').slice(0, 2000) || undefined,
          location: String(req.body?.donde || '').slice(0, 300) || undefined,
          start: { dateTime: new Date(empieza).toISOString() },
          end: { dateTime: new Date(acaba).toISOString() },
        }),
        signal: AbortSignal.timeout(12000),
      });
      const j: any = await r.json().catch(() => null);
      if (!r.ok) {
        console.error('[calendario-google] crear:', j?.error?.message || r.status);
        return res.status(502).json({ error: j?.error?.message || 'Google no ha aceptado la cita.' });
      }
      res.json({ ok: true, id: j.id, enlace: j.htmlLink || null });
    } catch (e: any) {
      console.error('[calendario-google] crear:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
