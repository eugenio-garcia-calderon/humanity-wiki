// ============================================================================
// EL ARCHIVO — los ficheros se quedan colgados de algo (2026-08-21)
// ============================================================================
// Subir ficheros YA SE PODÍA (ver `uploads.ts`): el chat, el editor y el Mundo
// 3D lo hacen desde hace tiempo. Lo que no había es MEMORIA: entraba un
// fichero, se usaba una vez y no había forma de volver a encontrarlo. En
// palabras del Tester, que es quien lo destapó: «puedo enseñarle mi informe de
// CFD a la IA una vez, pero no dejarlo colgado del proyecto para que mañana lo
// abra otro».
//
// Este módulo NO toca los bytes. Los bytes siguen donde ya estaban —el volumen
// /data/uploads, fuera del repositorio— y aquí solo se anota de qué cuelga
// cada uno. Reaprovechar el almacén que ya funciona evita inventar un segundo
// sitio donde las cosas puedan perderse.
//
// PERMISOS HEREDADOS, sin excepción: un fichero se ve si se ve la cosa de la
// que cuelga. No hay permisos por fichero. Cada consulta comprueba el
// CONTENEDOR, nunca el fichero, así que no hay dos verdades que puedan
// contradecirse.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

const nuevoId = () => `ARCH${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

type Contenedor = { campo: 'proyecto_id' | 'tarea_id' | 'pagina_id'; id: string };

/** Cuál de los tres contenedores viene en la petición. Exactamente uno. */
function contenedorDe(o: any): Contenedor | null {
  const pares: Array<[Contenedor['campo'], any]> = [
    ['proyecto_id', o?.proyecto_id],
    ['tarea_id', o?.tarea_id],
    ['pagina_id', o?.pagina_id],
  ];
  const puestos = pares.filter(([, v]) => !!v);
  if (puestos.length !== 1) return null;
  return { campo: puestos[0][0], id: String(puestos[0][1]) };
}

export function registerArchivoRoutes(app: Express, db: any) {
  /**
   * ¿Puede esta persona ver / tocar ese contenedor?
   *
   * Devuelve `null` si sí, o el mensaje de por qué no. Se pregunta por el
   * CONTENEDOR, que es donde vive la verdad sobre quién puede ver qué. Si un
   * día cambia la privacidad de un proyecto, sus ficheros la siguen sin que
   * haya que migrar nada.
   */
  async function puedeCon(req: Request, c: Contenedor, escribir: boolean): Promise<string | null> {
    const yo = req.user?.id || null;
    const admin = (req.user?.roleLevel ?? 0) >= 4;

    if (c.campo === 'proyecto_id') {
      const r = await db.execute(sql`
        SELECT creador_user_id, publico FROM proyectos
        WHERE id = ${c.id} AND archived_at IS NULL AND deleted_at IS NULL
      `);
      const p = r.rows[0] as any;
      if (!p) return 'Ese proyecto no existe.';
      if (p.creador_user_id === yo || admin) return null;
      if (escribir) return 'Solo quien creó el proyecto puede añadir archivos.';
      return p.publico ? null : 'Ese proyecto es privado.';
    }

    if (c.campo === 'tarea_id') {
      // Una tarea hereda de SU proyecto. Una tarea suelta (sin proyecto) es de
      // la hoja de ruta de la plataforma: la lleva un administrador.
      const r = await db.execute(sql`
        SELECT r.proyecto_id, p.creador_user_id, p.publico
        FROM roadmap_items r LEFT JOIN proyectos p ON p.id = r.proyecto_id
        WHERE r.id = ${c.id} AND r.archived_at IS NULL
      `);
      const t = r.rows[0] as any;
      if (!t) return 'Esa tarea no existe.';
      if (!t.proyecto_id) return admin ? null : 'Esa tarea es de la hoja de ruta de la plataforma.';
      if (t.creador_user_id === yo || admin) return null;
      if (escribir) return 'Solo quien creó el proyecto puede añadir archivos a sus tareas.';
      return t.publico ? null : 'Ese proyecto es privado.';
    }

    const r = await db.execute(sql`
      SELECT creator_user_id, publico FROM knowledge_windows
      WHERE id = ${c.id} AND archived_at IS NULL AND deleted_at IS NULL
    `);
    const w = r.rows[0] as any;
    if (!w) return 'Esa página no existe.';
    if (w.creator_user_id === yo || admin) return null;
    if (escribir) return 'Solo quien creó la página puede añadir archivos.';
    return w.publico ? null : 'Esa página es privada.';
  }

  /**
   * POST /api/archivo — colgar un fichero YA SUBIDO de un proyecto, una tarea
   * o una página.
   *
   * Se separa de `/api/uploads` a propósito: subir bytes y decidir de qué
   * cuelgan son dos cosas, y mezclarlas obligaría a que todo lo que ya sube
   * ficheros supiera además de contenedores.
   */
  app.post('/api/archivo', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const d = req.body || {};
      const c = contenedorDe(d);
      if (!c) return res.status(400).json({ error: 'Dime de qué cuelga: un proyecto, una tarea o una página. Solo uno.' });

      const url = String(d.url || '').trim();
      // La ruta tiene que ser de NUESTRO almacén. Sin esto, cualquiera podría
      // colgar del proyecto una dirección de fuera y la plataforma la
      // enseñaría como si fuera un fichero suyo.
      if (!url.startsWith('/uploads/') || url.includes('..')) {
        return res.status(400).json({ error: 'Esa dirección no es de un archivo subido aquí.' });
      }
      const nombre = String(d.nombre || 'archivo').slice(0, 200);
      if (!d.mime) return res.status(400).json({ error: 'Falta el tipo del archivo.' });

      const no = await puedeCon(req, c, true);
      if (no) return res.status(403).json({ error: no });

      const id = nuevoId();
      await db.execute(sql`
        INSERT INTO archivos (id, url, nombre, mime, bytes, clase, descripcion, subido_por,
                              proyecto_id, tarea_id, pagina_id)
        VALUES (${id}, ${url}, ${nombre}, ${String(d.mime)}, ${Number(d.bytes) || 0},
                ${String(d.clase || 'archivo')}, ${d.descripcion || null}, ${req.user.id},
                ${c.campo === 'proyecto_id' ? c.id : null},
                ${c.campo === 'tarea_id' ? c.id : null},
                ${c.campo === 'pagina_id' ? c.id : null})
      `);
      const fila = await db.execute(sql`SELECT * FROM archivos WHERE id = ${id}`);
      res.json(fila.rows[0]);
    } catch (e: any) {
      console.error('archivo POST:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/archivo?proyecto_id=… — lo que cuelga de una cosa. */
  app.get('/api/archivo', async (req: Request, res: Response) => {
    try {
      const c = contenedorDe(req.query);
      if (!c) return res.status(400).json({ error: 'Dime de qué: un proyecto, una tarea o una página.' });
      const no = await puedeCon(req, c, false);
      if (no) return res.status(403).json({ error: no });

      const filas = await db.execute(sql`
        SELECT a.*, u.display_name AS subido_por_nombre
        FROM archivos a LEFT JOIN users u ON u.id = a.subido_por
        WHERE a.archived_at IS NULL
          AND a.${sql.raw(c.campo)} = ${c.id}
        ORDER BY a.created_at DESC
      `);
      res.json(filas.rows);
    } catch (e: any) {
      console.error('archivo GET:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * DELETE /api/archivo/:id — se ARCHIVA, no se borra (regla 6 de la
   * Constitución). Los bytes tampoco se tocan: puede haber una página o un
   * mensaje del chat apuntando a esa misma dirección, y borrar el fichero
   * dejaría un hueco en sitios que este módulo no conoce.
   */
  app.delete('/api/archivo/:id', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const r = await db.execute(sql`SELECT * FROM archivos WHERE id = ${req.params.id} AND archived_at IS NULL`);
      const a = r.rows[0] as any;
      if (!a) return res.status(404).json({ error: 'Ese archivo no está.' });

      const campo: Contenedor['campo'] = a.proyecto_id ? 'proyecto_id' : a.tarea_id ? 'tarea_id' : 'pagina_id';
      const no = await puedeCon(req, { campo, id: a[campo] }, true);
      if (no) return res.status(403).json({ error: no });

      await db.execute(sql`UPDATE archivos SET archived_at = now() WHERE id = ${a.id}`);
      res.json({ ok: true });
    } catch (e: any) {
      console.error('archivo DELETE:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });
}
