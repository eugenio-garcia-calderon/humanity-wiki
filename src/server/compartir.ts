import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

// ============================================================================
// LA CAJITA DE COMPARTIR, UNA PARA TODAS (2026-08-25)
// ============================================================================
// Eugenio: «permite compartir los proyectos como si fuesen páginas […] crea un
// módulo que sea como una los dos, para que en un futuro, si queremos también
// compartir otras herramientas, no tengamos que duplicar código y utilicemos
// siempre la misma cajita de compartir, que sea como para todas».
//
// ── QUÉ SIGNIFICA «COMPARTIR» AQUÍ, QUE SON TRES COSAS ─────────────────────
//   1. una dirección larga que siempre funciona:  humanity.wiki/@quien/lo-que-sea
//   2. una corta, la que se enseña:               quien.humanity.wiki/lo-que-sea
//   3. y, si se quiere, un dominio propio:        loquesea.com
//
// Las tres estaban escritas **para páginas** y sólo para páginas: la tabla
// apuntaba a `knowledge_windows`, el resolvedor consultaba `knowledge_windows`
// y la pantalla decía «página». Copiar todo eso para los proyectos habría sido
// duplicar tres rutas, una tabla y una pantalla — y volver a duplicarlo con la
// tercera herramienta.
//
// ── EL REGISTRO ES TODA LA IDEA ────────────────────────────────────────────
// Aquí abajo hay una lista de QUÉ se puede compartir. Cada entrada dice de qué
// tabla sale, cómo se sabe de quién es, cuál es su dirección y cuándo es
// público. Todo lo demás —las tres direcciones, el dominio propio, la pantalla
// de compartir— funciona igual para cualquier cosa que esté en esa lista.
//
// **Añadir «mapas» a lo compartible es añadir un objeto de ocho líneas.** No se
// toca ninguna ruta, ninguna consulta y ninguna pantalla. Ésa era la petición.
//
// ── LO QUE UNA COSA COMPARTIBLE TIENE QUE TENER ────────────────────────────
// Un identificador, un dueño, una dirección legible (`slug`) y una forma de
// decir que es pública. Si una herramienta no tiene `slug`, no puede estar en
// esta lista hasta que lo tenga: sin dirección legible no hay nada que
// compartir, sólo un identificador que nadie puede teclear.

export type Compartible = {
  /** Cómo se llama en `(entidad_tipo, entidad_id)` y en las URL. */
  tipo: string;
  /** En singular y en castellano, para lo que lee una persona. */
  nombre: string;
  tabla: string;
  col: {
    id: string; titulo: string; slug: string; publico: string; duenyo: string;
    /** Las que archivan o borran. Se filtran todas, siempre. */
    archivado?: string; borrado?: string;
  };
};

/**
 * LO QUE HOY SE PUEDE COMPARTIR.
 *
 * `pagina` es lo que ya existía y se describe aquí sin cambiar nada de cómo
 * funciona. `proyecto` es lo nuevo, y lo único que hizo falta para añadirlo fue
 * este objeto: los proyectos ya tenían `slug`, `publico` y `creador_user_id`.
 */
export const COMPARTIBLES: Compartible[] = [
  {
    tipo: 'pagina', nombre: 'página', tabla: 'knowledge_windows',
    col: {
      id: 'id', titulo: 'title', slug: 'slug', publico: 'publico',
      duenyo: 'creator_user_id', archivado: 'archived_at', borrado: 'deleted_at',
    },
  },
  {
    tipo: 'proyecto', nombre: 'proyecto', tabla: 'proyectos',
    col: {
      id: 'id', titulo: 'titulo', slug: 'slug', publico: 'publico',
      duenyo: 'creador_user_id', archivado: 'archived_at', borrado: 'deleted_at',
    },
  },
];

export const compartiblePorTipo = (t: string) => COMPARTIBLES.find(c => c.tipo === t) ?? null;

/**
 * Una consulta por cada cosa compartible, unidas.
 *
 * ── POR QUÉ SE CONSTRUYE CON `sql.raw` Y POR QUÉ ES SEGURO ─────────────────
 * Los nombres de tabla y de columna no pueden ir como parámetros: en SQL un
 * parámetro es un valor, nunca un identificador. Lo que sí se puede —y es lo
 * que se hace— es que esos identificadores salgan **sólo** de la lista de
 * arriba, que está escrita en el código y no la toca nadie de fuera. Los datos
 * que vienen del usuario (el `handle`, el `slug`, el id) siguen yendo
 * parametrizados, como en todas partes.
 *
 * Es la misma regla que `ENTITY_TABLES` en `server.ts`: `sql.raw` sólo con una
 * lista blanca escrita a mano.
 */
function seleccionDe(c: Compartible, donde: any) {
  const vivos = [
    c.col.archivado ? sql.raw(`AND e.${c.col.archivado} IS NULL`) : sql``,
    c.col.borrado ? sql.raw(`AND e.${c.col.borrado} IS NULL`) : sql``,
  ];
  return sql`
    SELECT ${sql.raw(`'${c.tipo}'`)}::text AS tipo,
           e.${sql.raw(c.col.id)}::text     AS id,
           e.${sql.raw(c.col.titulo)}::text AS titulo,
           e.${sql.raw(c.col.slug)}::text   AS slug,
           u.handle, u.display_name, u.name, u.avatar_url
    FROM ${sql.raw(c.tabla)} e
    JOIN users u ON u.id = e.${sql.raw(c.col.duenyo)}
    WHERE ${donde} AND e.${sql.raw(c.col.publico)} = true ${vivos[0]} ${vivos[1]}
  `;
}

/** Lo mismo que devuelve el resolvedor, para que las dos rutas coincidan. */
const comoSeDevuelve = (f: any) => ({
  tipo: f.tipo,
  id: f.id,
  titulo: f.titulo,
  slug: f.slug,
  autor: { handle: f.handle, nombre: f.display_name || f.name, avatar: f.avatar_url },
});

export function registrarCompartir(app: Express, db: any) {
  /**
   * QUÉ SE PUEDE COMPARTIR — `GET /api/compartir/tipos`
   *
   * Lo pide la pantalla para no llevar la lista escrita también en el front.
   * Dos listas de lo mismo se separan, y la que se queda vieja es siempre la
   * copia — ya pasó hoy con `objectiveIds.ts` y los quince objetivos.
   */
  app.get('/api/compartir/tipos', (_req: Request, res: Response) => {
    res.json({ tipos: COMPARTIBLES.map(c => ({ tipo: c.tipo, nombre: c.nombre })) });
  });

  /**
   * QUÉ HAY EN ESTA DIRECCIÓN — `GET /api/compartir/resolver/:handle/:slug`
   *
   * Sirve para las dos formas de dirección, la larga y la del subdominio, que
   * acaban siendo la misma pregunta: de quién y con qué nombre.
   *
   * ── SE BUSCA EN TODO, Y EL ORDEN IMPORTA ──────────────────────────────────
   * Dos herramientas distintas de la misma persona pueden tener el mismo
   * `slug` — nada lo impide hoy, y una página «aptera» y un proyecto «aptera»
   * son perfectamente razonables. Gana **la primera de la lista**, o sea la
   * página, porque es lo que ya funcionaba antes de existir esto y cambiarlo
   * movería direcciones que alguien ya ha compartido por ahí.
   *
   * Se devuelve también `otros`, para que la pantalla pueda decir «además hay
   * un proyecto con esta misma dirección» en vez de que el segundo sea
   * invisible para siempre.
   */
  app.get('/api/compartir/resolver/:handle/:slug', async (req: Request, res: Response) => {
    try {
      const handle = String(req.params.handle || '').toLowerCase().replace(/^@/, '');
      const slug = String(req.params.slug || '').toLowerCase();
      if (!handle || !slug) return res.status(404).json({ error: 'Falta la dirección.' });

      const encontrados: any[] = [];
      for (const c of COMPARTIBLES) {
        const r = await db.execute(seleccionDe(c, sql`u.handle = ${handle} AND lower(e.${sql.raw(c.col.slug)}) = ${slug}`));
        for (const f of r.rows) encontrados.push(comoSeDevuelve(f));
      }
      if (!encontrados.length) {
        return res.status(404).json({ error: 'Aquí no hay nada publicado con esa dirección.' });
      }
      res.json({ ...encontrados[0], otros: encontrados.slice(1) });
    } catch (e: any) {
      console.error('[compartir resolver]', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * LO COMPARTIDO DE UNA COSA — `GET /api/compartir/:tipo/:id`
   *
   * Lo que necesita la cajita de compartir para pintarse: si está publicado, su
   * dirección, sus dos URL y qué dominios propios apuntan a ella.
   */
  app.get('/api/compartir/:tipo/:id', async (req: Request, res: Response) => {
    try {
      // `/api/compartir/resolver/quien/` —con la barra final y el `slug`
      // vacío— colapsa a dos tramos y cae AQUÍ, con `tipo = 'resolver'`. La
      // ruta hace lo correcto; el mensaje era el que confundía, porque decía
      // «eso no se puede compartir» de una dirección que sí existe. Se
      // distingue, que es la regla de la casa: «no lo sé» y «no existe» no
      // pueden contestar lo mismo.
      if (req.params.tipo === 'resolver' || req.params.tipo === 'tipos') {
        return res.status(404).json({ error: 'Falta la dirección: /api/compartir/resolver/<quien>/<qué>.' });
      }
      const c = compartiblePorTipo(String(req.params.tipo));
      if (!c) return res.status(400).json({ error: 'Eso no se puede compartir todavía.' });

      const r = await db.execute(sql`
        SELECT e.${sql.raw(c.col.id)}::text AS id,
               e.${sql.raw(c.col.titulo)}::text AS titulo,
               e.${sql.raw(c.col.slug)}::text AS slug,
               e.${sql.raw(c.col.publico)} AS publico,
               e.${sql.raw(c.col.duenyo)}::text AS duenyo,
               u.handle
        FROM ${sql.raw(c.tabla)} e
        LEFT JOIN users u ON u.id = e.${sql.raw(c.col.duenyo)}
        WHERE e.${sql.raw(c.col.id)} = ${req.params.id}
      `);
      const cosa = r.rows[0] as any;
      if (!cosa) return res.status(404).json({ error: 'Eso no existe.' });

      const yo = req.user?.id;
      const nivel = req.user?.roleLevel ?? 0;
      const puedeCompartir = !!yo && (cosa.duenyo === yo || nivel >= 4);

      // Los dominios sólo se le enseñan a quien puede tocarlos: son suyos, y
      // saber qué dominios apuntan a algo no le hace falta a quien sólo mira.
      const dominios = puedeCompartir
        ? (await db.execute(sql`
            SELECT dominio, estado, ultimo_error, activo_desde
            FROM dominios_paginas
            WHERE entidad_tipo = ${c.tipo} AND entidad_id = ${cosa.id}
            ORDER BY created_at
          `)).rows
        : [];

      res.json({
        tipo: c.tipo, nombre: c.nombre,
        id: cosa.id, titulo: cosa.titulo, slug: cosa.slug,
        publico: !!cosa.publico,
        handle: cosa.handle,
        puedeCompartir,
        // Las direcciones se arman aquí y no en la pantalla: son la misma regla
        // para las tres herramientas, y escrita en un sitio no se pueden
        // separar entre ellas.
        urls: cosa.handle && cosa.slug ? {
          larga: `/@${cosa.handle}/${cosa.slug}`,
          corta: `https://${cosa.handle}.humanity.wiki/${cosa.slug}`,
        } : null,
        dominios,
      });
    } catch (e: any) {
      console.error('[compartir estado]', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * PUBLICAR O DEJAR DE PUBLICAR — `PUT /api/compartir/:tipo/:id`
   * `{ publico?, slug? }`
   *
   * ── EL SLUG SE PUEDE CAMBIAR, Y ESO TIENE UN PRECIO QUE SE DICE ──────────
   * Cambiarlo rompe cualquier enlace que alguien haya compartido ya. No se
   * impide —es su dirección— pero la pantalla lo avisa antes, que es lo único
   * que se puede hacer honestamente al respecto.
   */
  app.put('/api/compartir/:tipo/:id', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const c = compartiblePorTipo(String(req.params.tipo));
      if (!c) return res.status(400).json({ error: 'Eso no se puede compartir todavía.' });

      const duenyo = await db.execute(sql`
        SELECT e.${sql.raw(c.col.duenyo)}::text AS duenyo
        FROM ${sql.raw(c.tabla)} e WHERE e.${sql.raw(c.col.id)} = ${req.params.id}
      `);
      const d = (duenyo.rows[0] as any)?.duenyo;
      if (!d) return res.status(404).json({ error: 'Eso no existe.' });
      if (d !== req.user.id && (req.user.roleLevel ?? 0) < 4) {
        return res.status(403).json({ error: `Ese ${c.nombre} no es tuyo.` });
      }

      const publico = req.body?.publico;
      const slug = req.body?.slug === undefined ? undefined
        : String(req.body.slug).toLowerCase().trim()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (slug !== undefined && slug.length < 2) {
        return res.status(400).json({ error: 'La dirección necesita al menos dos letras.' });
      }

      await db.execute(sql`
        UPDATE ${sql.raw(c.tabla)} SET
          ${sql.raw(c.col.publico)} = CASE WHEN ${publico === undefined} THEN ${sql.raw(c.col.publico)} ELSE ${!!publico} END,
          ${sql.raw(c.col.slug)}    = CASE WHEN ${slug === undefined} THEN ${sql.raw(c.col.slug)} ELSE ${slug ?? null}::text END
        WHERE ${sql.raw(c.col.id)} = ${req.params.id}
      `);
      res.json({ ok: true });
    } catch (e: any) {
      if (String(e?.cause?.code || e?.code) === '23505') {
        return res.status(409).json({ error: 'Ya tienes algo con esa dirección.' });
      }
      console.error('[compartir publicar]', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });
}
