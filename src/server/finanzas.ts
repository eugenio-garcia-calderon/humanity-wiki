// ============================================================================
// FINANZAS DEL JUEGO VITAL (2026-08-19, fase 10). El backend de los recursos
// del jugador, sus objetivos y el presupuesto de cada proyecto.
//
// Regla de la casa: toda ruta que escribe comprueba la sesión, y nadie ve ni
// toca las finanzas de otro. Los presupuestos van por proyecto y solo los
// edita quien puede editar ese proyecto.
// ============================================================================
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

/** Id corto y legible, del mismo estilo que el resto del juego. */
const nuevoId = (p: string) => `${p}${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;

function requiereSesion(req: Request, res: Response): string | null {
  const id = (req as Request & { user?: { id: string } }).user?.id;
  if (!id) {
    res.status(401).json({ error: 'Debes iniciar sesión para ver tus finanzas.' });
    return null;
  }
  return id;
}

/** Un número que llega del cliente, saneado. Nunca confiar en el navegador. */
function num(v: unknown, porDefecto = 0): number {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) ? n : porDefecto;
}

export function registerFinanzasRoutes(app: Express, db: any) {
  // -------------------------------------------------------------------------
  // LO QUE TIENES + LO QUE QUIERES, en una sola llamada (lo pinta el HUD).
  // -------------------------------------------------------------------------
  app.get('/api/finanzas', async (req: Request, res: Response) => {
    try {
      const uid = requiereSesion(req, res);
      if (!uid) return;

      const fin = await db.execute(sql`SELECT * FROM game_finanzas WHERE user_id = ${uid}`);
      // Sin fila todavía: se devuelve todo a cero, no un error. La primera vez
      // que guardes se crea sola.
      const recursos = fin.rows[0] || {
        user_id: uid, efectivo: 0, banco: 0, ingresos_mes: 0, gastos_mes: 0, moneda: 'EUR',
      };

      const obj = await db.execute(sql`
        SELECT * FROM objetivos_financieros
        WHERE user_id = ${uid} AND archived_at IS NULL
        ORDER BY (acumulado / NULLIF(objetivo, 0)) DESC NULLS LAST, creado_at DESC
      `);

      // El cómputo total de lo que necesitan TODOS tus proyectos, por año.
      const presu = await db.execute(sql`
        SELECT p.anio,
               SUM(CASE WHEN p.tipo = 'gasto' THEN p.importe ELSE 0 END)   AS gasto,
               SUM(CASE WHEN p.tipo = 'ingreso' THEN p.importe ELSE 0 END) AS ingreso
        FROM presupuestos_proyecto p
        JOIN proyectos pr ON pr.id = p.proyecto_id
        WHERE p.archived_at IS NULL AND pr.archived_at IS NULL AND pr.creador_user_id = ${uid}
        GROUP BY p.anio ORDER BY p.anio
      `);

      res.json({ recursos, objetivos: obj.rows, porAnio: presu.rows });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  /** Guardar cuánto tienes. Crea la fila la primera vez. */
  app.put('/api/finanzas', async (req: Request, res: Response) => {
    try {
      const uid = requiereSesion(req, res);
      if (!uid) return;
      const d = req.body || {};
      await db.execute(sql`
        INSERT INTO game_finanzas (user_id, efectivo, banco, ingresos_mes, gastos_mes, moneda)
        VALUES (${uid}, ${num(d.efectivo)}, ${num(d.banco)}, ${num(d.ingresos_mes)}, ${num(d.gastos_mes)}, ${String(d.moneda || 'EUR').slice(0, 8)})
        ON CONFLICT (user_id) DO UPDATE SET
          efectivo = EXCLUDED.efectivo,
          banco = EXCLUDED.banco,
          ingresos_mes = EXCLUDED.ingresos_mes,
          gastos_mes = EXCLUDED.gastos_mes,
          moneda = EXCLUDED.moneda,
          actualizado_at = now()
      `);
      const fin = await db.execute(sql`SELECT * FROM game_finanzas WHERE user_id = ${uid}`);
      res.json(fin.rows[0]);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // -------------------------------------------------------------------------
  // OBJETIVOS: ahorrar, comprar algo, llegar a un ingreso.
  // -------------------------------------------------------------------------
  app.post('/api/finanzas/objetivos', async (req: Request, res: Response) => {
    try {
      const uid = requiereSesion(req, res);
      if (!uid) return;
      const d = req.body || {};
      const titulo = String(d.titulo || '').trim();
      if (!titulo) return res.status(400).json({ error: 'El objetivo necesita un nombre.' });
      const objetivo = num(d.objetivo);
      if (objetivo <= 0) return res.status(400).json({ error: 'Pon una cantidad mayor que cero.' });
      const tipo = ['ahorro', 'adquisicion', 'ingreso'].includes(d.tipo) ? d.tipo : 'ahorro';
      const id = nuevoId('OF');
      await db.execute(sql`
        INSERT INTO objetivos_financieros (id, user_id, titulo, tipo, objetivo, acumulado, fecha_limite, proyecto_id, nota)
        VALUES (${id}, ${uid}, ${titulo}, ${tipo}, ${objetivo}, ${num(d.acumulado)},
                ${d.fecha_limite || null}, ${d.proyecto_id || null}, ${d.nota || null})
      `);
      const r = await db.execute(sql`SELECT * FROM objetivos_financieros WHERE id = ${id}`);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/finanzas/objetivos/:id', async (req: Request, res: Response) => {
    try {
      const uid = requiereSesion(req, res);
      if (!uid) return;
      const d = req.body || {};
      // El WHERE lleva el user_id: nadie edita el objetivo de otro.
      await db.execute(sql`
        UPDATE objetivos_financieros SET
          titulo = COALESCE(${d.titulo ?? null}, titulo),
          objetivo = COALESCE(${d.objetivo != null ? num(d.objetivo) : null}, objetivo),
          acumulado = COALESCE(${d.acumulado != null ? num(d.acumulado) : null}, acumulado),
          fecha_limite = COALESCE(${d.fecha_limite ?? null}, fecha_limite),
          nota = COALESCE(${d.nota ?? null}, nota)
        WHERE id = ${req.params.id} AND user_id = ${uid}
      `);
      const r = await db.execute(sql`SELECT * FROM objetivos_financieros WHERE id = ${req.params.id} AND user_id = ${uid}`);
      if (!r.rows[0]) return res.status(404).json({ error: 'Ese objetivo no es tuyo.' });
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  /** Archivar (no borrar: la Constitución manda guardar el rastro). */
  app.delete('/api/finanzas/objetivos/:id', async (req: Request, res: Response) => {
    try {
      const uid = requiereSesion(req, res);
      if (!uid) return;
      await db.execute(sql`
        UPDATE objetivos_financieros SET archived_at = now()
        WHERE id = ${req.params.id} AND user_id = ${uid}
      `);
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // -------------------------------------------------------------------------
  // PRESUPUESTOS POR PROYECTO Y AÑO.
  // -------------------------------------------------------------------------
  /** Las líneas de un proyecto, con sus totales por año ya sumados. */
  app.get('/api/finanzas/presupuestos', async (req: Request, res: Response) => {
    try {
      const uid = requiereSesion(req, res);
      if (!uid) return;
      const proyecto = String(req.query.proyecto || '');
      if (!proyecto) return res.status(400).json({ error: 'Falta el proyecto.' });
      const lineas = await db.execute(sql`
        SELECT * FROM presupuestos_proyecto
        WHERE proyecto_id = ${proyecto} AND archived_at IS NULL
        ORDER BY anio, concepto
      `);
      const totales = await db.execute(sql`
        SELECT anio,
               SUM(CASE WHEN tipo = 'gasto' THEN importe ELSE 0 END)   AS gasto,
               SUM(CASE WHEN tipo = 'ingreso' THEN importe ELSE 0 END) AS ingreso
        FROM presupuestos_proyecto
        WHERE proyecto_id = ${proyecto} AND archived_at IS NULL
        GROUP BY anio ORDER BY anio
      `);
      res.json({ lineas: lineas.rows, totales: totales.rows });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/finanzas/presupuestos', async (req: Request, res: Response) => {
    try {
      const uid = requiereSesion(req, res);
      if (!uid) return;
      const d = req.body || {};
      const proyecto = String(d.proyecto_id || '');
      const concepto = String(d.concepto || '').trim();
      if (!proyecto || !concepto) return res.status(400).json({ error: 'Faltan el proyecto y el concepto.' });
      // Solo el dueño del proyecto (o un admin) toca su presupuesto.
      const pr = await db.execute(sql`SELECT creador_user_id FROM proyectos WHERE id = ${proyecto} AND archived_at IS NULL`);
      const dueno = pr.rows[0]?.creador_user_id;
      const nivel = (req as Request & { user?: { roleLevel?: number } }).user?.roleLevel ?? 0;
      if (!pr.rows[0]) return res.status(404).json({ error: 'Ese proyecto no existe.' });
      if (dueno !== uid && nivel < 4) return res.status(403).json({ error: 'Ese proyecto no es tuyo.' });

      const anio = Math.round(num(d.anio, new Date().getFullYear()));
      const id = nuevoId('PP');
      await db.execute(sql`
        INSERT INTO presupuestos_proyecto (id, proyecto_id, anio, concepto, importe, tipo, nota, creado_by)
        VALUES (${id}, ${proyecto}, ${anio}, ${concepto}, ${num(d.importe)},
                ${d.tipo === 'ingreso' ? 'ingreso' : 'gasto'}, ${d.nota || null}, ${uid})
      `);
      const r = await db.execute(sql`SELECT * FROM presupuestos_proyecto WHERE id = ${id}`);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/finanzas/presupuestos/:id', async (req: Request, res: Response) => {
    try {
      const uid = requiereSesion(req, res);
      if (!uid) return;
      const nivel = (req as Request & { user?: { roleLevel?: number } }).user?.roleLevel ?? 0;
      await db.execute(sql`
        UPDATE presupuestos_proyecto SET archived_at = now()
        WHERE id = ${req.params.id}
          AND (creado_by = ${uid} OR ${nivel} >= 4
               OR proyecto_id IN (SELECT id FROM proyectos WHERE creador_user_id = ${uid}))
      `);
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * EL CÓMPUTO TOTAL: lo que necesitan todos tus proyectos, proyecto a
   * proyecto y año a año. Es la vista que pidió Eugenio para ver de un
   * vistazo cuánto dinero pide su mundo entero.
   */
  app.get('/api/finanzas/resumen', async (req: Request, res: Response) => {
    try {
      const uid = requiereSesion(req, res);
      if (!uid) return;
      const r = await db.execute(sql`
        SELECT pr.id AS proyecto_id, pr.titulo AS proyecto, p.anio,
               SUM(CASE WHEN p.tipo = 'gasto' THEN p.importe ELSE 0 END)   AS gasto,
               SUM(CASE WHEN p.tipo = 'ingreso' THEN p.importe ELSE 0 END) AS ingreso
        FROM presupuestos_proyecto p
        JOIN proyectos pr ON pr.id = p.proyecto_id
        WHERE p.archived_at IS NULL AND pr.archived_at IS NULL AND pr.creador_user_id = ${uid}
        GROUP BY pr.id, pr.titulo, p.anio
        ORDER BY pr.titulo, p.anio
      `);
      res.json(r.rows);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
}
