// ============================================================================
// LOS TEXTOS DE LAS PÁGINAS, EDITABLES POR UN ADMINISTRADOR (2026-08-22)
// ============================================================================
// Eugenio: «permite a los ADMIN editar todos los textos de esas páginas de
// información». Ver `drizzle/0077_textos_editables.sql` para el porqué de la
// forma de la tabla; aquí están las tres decisiones del servidor.
//
// ── SE LEE TODO DE UNA VEZ, NO TEXTO A TEXTO ───────────────────────────────
// `GET /api/textos` devuelve el mapa entero. Una página de información tiene
// veinte párrafos: pedirlos de uno en uno serían veinte viajes para enseñar
// una pantalla. Son unos kilobytes y se cachean en el borde como el resto de
// lo público.
//
// ── LO QUE NO SE HA CAMBIADO NUNCA NO OCUPA SITIO ──────────────────────────
// La tabla solo guarda lo editado. Si el mapa viene vacío, todas las páginas
// se ven con el texto que trae el código, que es lo correcto el primer día y
// también el día que alguien borre una fila para volver atrás.
//
// ── EL LÍMITE ES DE VERDAD, NO UN ADORNO ───────────────────────────────────
// Un campo de texto libre que escribe en la base de datos sin tope es una
// forma cómoda de llenarle el disco a alguien. 20.000 caracteres son unas seis
// páginas: de sobra para el párrafo más largo de una página de información, y
// muy lejos de servir para otra cosa.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ROLE } from './auth.js';

/** Unas seis páginas de texto. Ver arriba. */
const MAX_LARGO = 20_000;

/**
 * `pagina.seccion`, en minúsculas. Se valida en vez de confiar porque la clave
 * es la que va a leer una persona dentro de un año buscando de dónde sale un
 * párrafo: si se admite cualquier cosa, en un mes hay claves con espacios,
 * acentos y mayúsculas y el orden alfabético deja de servir para nada.
 */
const CLAVE_VALIDA = /^[a-z0-9]+(?:[._-][a-z0-9]+)+$/;

export function registerTextosRoutes(app: Express, db: any) {
  /**
   * GET /api/textos — todo lo que alguien ha cambiado alguna vez.
   *
   * Público: es el texto de páginas públicas. Se marca cacheable en el borde
   * como el resto de lo que no depende de quién pregunta — y no depende: la
   * respuesta es idéntica con sesión y sin ella.
   */
  app.get('/api/textos', async (_req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`SELECT clave, valor FROM textos_editables`);
      const mapa: Record<string, string> = {};
      for (const f of r.rows as any[]) mapa[f.clave] = f.valor;
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.json(mapa);
    } catch (e: any) {
      console.error('textos:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * PUT /api/textos/:clave — cambiar uno. Solo administrador.
   *
   * El nivel se comprueba AQUÍ, en el servidor. Que el componente esconda el
   * lápiz a quien no es administrador es comodidad, no seguridad: cualquiera
   * puede llamar a esta ruta a mano.
   */
  app.put('/api/textos/:clave', async (req: Request, res: Response) => {
    try {
      if (!req.user || (req.user.roleLevel ?? 0) < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Solo un administrador puede cambiar los textos de la plataforma.' });
      }
      const clave = String(req.params.clave || '').trim();
      if (!CLAVE_VALIDA.test(clave)) {
        return res.status(400).json({ error: 'La clave se escribe «pagina.seccion», en minúsculas y sin espacios.' });
      }
      const valor = String(req.body?.valor ?? '');
      if (valor.length > MAX_LARGO) {
        return res.status(400).json({ error: `Ese texto es demasiado largo (máximo ${MAX_LARGO} caracteres).` });
      }

      await db.execute(sql`
        INSERT INTO textos_editables (clave, valor, editado_por, updated_at)
        VALUES (${clave}, ${valor}, ${req.user.id}, now())
        ON CONFLICT (clave) DO UPDATE
          SET valor = EXCLUDED.valor, editado_por = EXCLUDED.editado_por, updated_at = now()
      `);
      res.json({ clave, valor });
    } catch (e: any) {
      console.error('textos put:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * DELETE /api/textos/:clave — volver al texto del código.
   *
   * No es «borrar el texto», es **deshacer**: al desaparecer la fila, la
   * página vuelve a enseñar lo que trae el componente. Por eso existe: sin
   * esto, la única forma de volver al original sería copiarlo a mano del
   * código, y nadie lo haría bien.
   */
  app.delete('/api/textos/:clave', async (req: Request, res: Response) => {
    try {
      if (!req.user || (req.user.roleLevel ?? 0) < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Solo un administrador puede cambiar los textos de la plataforma.' });
      }
      await db.execute(sql`DELETE FROM textos_editables WHERE clave = ${String(req.params.clave || '')}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
