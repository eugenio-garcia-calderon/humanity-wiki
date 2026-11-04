// ============================================================================
// CALENDARIO ARTE PARA LA HUMANIDAD (2026-11-04)
// ============================================================================
// Eugenio: doce ilustraciones, una por mes, con una franja de herramienta o
// juego y una frase pedagógica para cada día; editable desde cualquier
// dispositivo, con una carpeta de referencias por mes y un buzón de ideas que
// la IA lee de vez en cuando para implementar las mejoras pendientes.
//
// Tablas en `drizzle/0161_calendario_arte.sql`. El contenido por defecto vive
// en `src/data/calendarioArte.ts`: aquí solo se guarda lo que alguien cambió.
//
// ── QUIÉN PUEDE QUÉ ────────────────────────────────────────────────────────
// Leer: cualquiera (es una página pública, como un calendario colgado).
// Proponer una idea: cualquiera con sesión (nivel 1).
// Editar textos, imágenes, referencias y cerrar ideas: nivel 3
// («generador de conocimiento») o más. Es contenido que se va a imprimir y
// repartir: abrirlo a nivel 1 sería dejar que cualquier cuenta nueva cambie
// lo que acaba en papel.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ROLE } from './auth.js';

const NIVEL_EDITAR = ROLE.KNOWLEDGE;
const NIVEL_IDEA = ROLE.USER;

/** Un mes entero cabe holgado en 60 kB (31 frases, franja, textos). */
const MAX_CONTENIDO = 200_000;
const MAX_REFERENCIAS = 200;
const MAX_IDEA = 4_000;

function anioValido(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 2020 && n <= 2100 ? n : null;
}
function mesValido(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
}
/** Para las hojas: 1-12 son los meses y 0 lo común (principios, carpeta de estilo). */
function hojaValida(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 12 ? n : null;
}

/** Solo imágenes subidas a la plataforma o enlaces https. Nada de
 *  `javascript:` ni `data:` gigantes metidos en la base de datos. */
function urlImagenValida(u: unknown): u is string {
  return typeof u === 'string' && u.length < 2_000
    && (u.startsWith('/uploads/') || u.startsWith('/calendario-arte/') || u.startsWith('https://'));
}

function nivel(req: Request): number {
  return req.user?.roleLevel ?? 0;
}

function exigir(req: Request, res: Response, min: number, que: string): boolean {
  if (!req.user) { res.status(401).json({ error: 'Debes iniciar sesión.' }); return false; }
  if (nivel(req) < min) { res.status(403).json({ error: `${que} requiere nivel ${min} o superior.` }); return false; }
  return true;
}

/** Limpia la lista de referencias: url válida y una nota corta opcional. */
function limpiarReferencias(lista: unknown): { url: string; nota?: string }[] | null {
  if (!Array.isArray(lista) || lista.length > MAX_REFERENCIAS) return null;
  const out: { url: string; nota?: string }[] = [];
  for (const r of lista) {
    if (!r || !urlImagenValida((r as any).url)) return null;
    const nota = typeof (r as any).nota === 'string' ? (r as any).nota.slice(0, 500) : undefined;
    out.push(nota ? { url: (r as any).url, nota } : { url: (r as any).url });
  }
  return out;
}

export function registerCalendarioArteRoutes(app: Express, db: any) {
  /** GET /api/calendario-arte/:anio — lo editado de los doce meses. */
  app.get('/api/calendario-arte/:anio', async (req: Request, res: Response) => {
    try {
      const anio = anioValido(req.params.anio);
      if (!anio) return res.status(400).json({ error: 'Año no válido.' });
      const r = await db.execute(sql`
        SELECT mes, contenido, referencias, version, updated_at
        FROM calendario_arte_meses WHERE anio = ${anio} ORDER BY mes
      `);
      res.set('Cache-Control', 'no-store');
      res.json({
        anio,
        meses: r.rows,
        puedeEditar: nivel(req) >= NIVEL_EDITAR,
        puedeProponer: nivel(req) >= NIVEL_IDEA,
      });
    } catch (e: any) {
      console.error('calendario-arte get:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * PUT /api/calendario-arte/:anio/:mes — guardar el contenido de un mes.
   * Cuerpo: { contenido, version }. `version` es la que tenía la pantalla al
   * empezar a editar (0 si el mes nunca se había guardado). Si no coincide,
   * 409: alguien guardó entretanto y hay que recargar antes de pisarle.
   */
  app.put('/api/calendario-arte/:anio/:mes', async (req: Request, res: Response) => {
    try {
      if (!exigir(req, res, NIVEL_EDITAR, 'Editar el calendario')) return;
      const anio = anioValido(req.params.anio);
      const mes = hojaValida(req.params.mes);
      if (!anio || mes === null) return res.status(400).json({ error: 'Año o mes no válido.' });
      const contenido = req.body?.contenido;
      if (!contenido || typeof contenido !== 'object' || Array.isArray(contenido)) {
        return res.status(400).json({ error: 'Falta el contenido del mes.' });
      }
      const texto = JSON.stringify(contenido);
      if (texto.length > MAX_CONTENIDO) return res.status(413).json({ error: 'El contenido de este mes es demasiado grande.' });
      if (contenido.imagen && !urlImagenValida(contenido.imagen)) {
        return res.status(400).json({ error: 'La ilustración tiene que ser una imagen subida a la plataforma.' });
      }
      const version = Number(req.body?.version ?? 0);

      const r = await db.execute(sql`
        INSERT INTO calendario_arte_meses (anio, mes, contenido, version, updated_by, updated_at)
        VALUES (${anio}, ${mes}, ${texto}::jsonb, 1, ${req.user!.id}, now())
        ON CONFLICT (anio, mes) DO UPDATE
          SET contenido = EXCLUDED.contenido,
              version = calendario_arte_meses.version + 1,
              updated_by = EXCLUDED.updated_by,
              updated_at = now()
          WHERE calendario_arte_meses.version = ${version}
        RETURNING mes, contenido, referencias, version, updated_at
      `);
      if (!r.rows.length) {
        return res.status(409).json({ error: 'Otra persona ha guardado este mes mientras lo editabas. Recarga para ver sus cambios antes de guardar los tuyos.' });
      }
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('calendario-arte put:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * PUT /api/calendario-arte/:anio/:mes/referencias — la carpeta del mes.
   * Va aparte del contenido para que añadir una foto de referencia no choque
   * con alguien que está corrigiendo frases al mismo tiempo.
   */
  app.put('/api/calendario-arte/:anio/:mes/referencias', async (req: Request, res: Response) => {
    try {
      if (!exigir(req, res, NIVEL_EDITAR, 'Cambiar la carpeta de referencias')) return;
      const anio = anioValido(req.params.anio);
      const mes = hojaValida(req.params.mes);
      if (!anio || mes === null) return res.status(400).json({ error: 'Año o mes no válido.' });
      const referencias = limpiarReferencias(req.body?.referencias);
      if (!referencias) return res.status(400).json({ error: `Lista de referencias no válida (máximo ${MAX_REFERENCIAS} imágenes subidas a la plataforma).` });
      const r = await db.execute(sql`
        INSERT INTO calendario_arte_meses (anio, mes, referencias, version, updated_by, updated_at)
        VALUES (${anio}, ${mes}, ${JSON.stringify(referencias)}::jsonb, 0, ${req.user!.id}, now())
        ON CONFLICT (anio, mes) DO UPDATE
          SET referencias = EXCLUDED.referencias, updated_by = EXCLUDED.updated_by, updated_at = now()
        RETURNING mes, contenido, referencias, version, updated_at
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('calendario-arte referencias:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * DELETE /api/calendario-arte/:anio/:mes — volver al contenido original del
   * código. Las referencias NO se tocan: son trabajo de alguien, no un ajuste.
   */
  app.delete('/api/calendario-arte/:anio/:mes', async (req: Request, res: Response) => {
    try {
      if (!exigir(req, res, NIVEL_EDITAR, 'Restaurar el calendario')) return;
      const anio = anioValido(req.params.anio);
      const mes = hojaValida(req.params.mes);
      if (!anio || mes === null) return res.status(400).json({ error: 'Año o mes no válido.' });
      await db.execute(sql`
        UPDATE calendario_arte_meses
        SET contenido = '{}'::jsonb, version = version + 1, updated_by = ${req.user!.id}, updated_at = now()
        WHERE anio = ${anio} AND mes = ${mes}
      `);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── BUZÓN DE IDEAS ────────────────────────────────────────────────────────

  const listarIdeas = async (anio: number, estado: string | null) => db.execute(sql`
    SELECT i.id, i.mes, i.texto, i.estado, i.respuesta, i.created_at, i.resuelta_at,
           COALESCE(u.display_name, u.name) AS autor
    FROM calendario_arte_ideas i
    LEFT JOIN users u ON u.id = i.created_by
    WHERE i.anio = ${anio} AND (${estado}::text IS NULL OR i.estado = ${estado})
    ORDER BY (i.estado = 'pendiente') DESC, i.created_at DESC
    LIMIT 500
  `);

  /** GET /api/calendario-arte/:anio/ideas[?estado=pendiente] */
  app.get('/api/calendario-arte/:anio/ideas', async (req: Request, res: Response) => {
    try {
      const anio = anioValido(req.params.anio);
      if (!anio) return res.status(400).json({ error: 'Año no válido.' });
      const estado = ['pendiente', 'hecha', 'descartada'].includes(String(req.query.estado)) ? String(req.query.estado) : null;
      const r = await listarIdeas(anio, estado);
      res.set('Cache-Control', 'no-store');
      res.json(r.rows);
    } catch (e: any) {
      console.error('calendario-arte ideas:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/calendario-arte/:anio/ideas.txt — las pendientes en texto plano,
   * listas para pegárselas a la IA: «haz todas las tareas de esta lista».
   */
  app.get('/api/calendario-arte/:anio/ideas.txt', async (req: Request, res: Response) => {
    try {
      const anio = anioValido(req.params.anio);
      if (!anio) return res.status(400).type('text/plain').send('Año no válido.');
      const r = await listarIdeas(anio, 'pendiente');
      const lineas = (r.rows as any[]).map(i =>
        `#${i.id} [${i.mes ? `mes ${i.mes}` : 'general'}] ${String(i.texto).replace(/\s+/g, ' ').trim()}`);
      res.set('Cache-Control', 'no-store');
      res.type('text/plain; charset=utf-8').send(
        `Calendario Arte para la Humanidad ${anio} — ideas pendientes (${lineas.length})\n\n${lineas.join('\n')}\n`);
    } catch (e: any) {
      res.status(500).type('text/plain').send(e.message);
    }
  });

  /** POST /api/calendario-arte/:anio/ideas — { texto, mes? } */
  app.post('/api/calendario-arte/:anio/ideas', async (req: Request, res: Response) => {
    try {
      if (!exigir(req, res, NIVEL_IDEA, 'Proponer una idea')) return;
      const anio = anioValido(req.params.anio);
      if (!anio) return res.status(400).json({ error: 'Año no válido.' });
      const texto = String(req.body?.texto ?? '').trim();
      if (!texto) return res.status(400).json({ error: 'Escribe la idea antes de enviarla.' });
      if (texto.length > MAX_IDEA) return res.status(400).json({ error: `La idea es demasiado larga (máximo ${MAX_IDEA} caracteres).` });
      const mes = req.body?.mes == null || req.body?.mes === '' ? null : mesValido(req.body.mes);
      const r = await db.execute(sql`
        INSERT INTO calendario_arte_ideas (anio, mes, texto, created_by)
        VALUES (${anio}, ${mes}, ${texto}, ${req.user!.id})
        RETURNING id, mes, texto, estado, respuesta, created_at, resuelta_at
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('calendario-arte idea post:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** PATCH /api/calendario-arte/ideas/:id — { estado, respuesta? } */
  app.patch('/api/calendario-arte/ideas/:id', async (req: Request, res: Response) => {
    try {
      if (!exigir(req, res, NIVEL_EDITAR, 'Cerrar una idea')) return;
      const id = Number(req.params.id);
      const estado = String(req.body?.estado ?? '');
      if (!Number.isInteger(id) || !['pendiente', 'hecha', 'descartada'].includes(estado)) {
        return res.status(400).json({ error: 'Estado no válido: pendiente, hecha o descartada.' });
      }
      const respuesta = req.body?.respuesta == null ? null : String(req.body.respuesta).slice(0, MAX_IDEA);
      const r = await db.execute(sql`
        UPDATE calendario_arte_ideas
        SET estado = ${estado},
            respuesta = COALESCE(${respuesta}, respuesta),
            resuelta_at = CASE WHEN ${estado} = 'pendiente' THEN NULL ELSE now() END
        WHERE id = ${id}
        RETURNING id, mes, texto, estado, respuesta, created_at, resuelta_at
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Esa idea no existe.' });
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
