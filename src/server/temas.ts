import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { getProvider, providerOfModel } from './ai/provider';

// ============================================================================
// LOS TEMAS: SUBTEMAS COMUNES Y EL MENÚ DE CADA UNO (2026-08-25)
// ============================================================================
// Eugenio: «añade subtemas dentro de los objetivos, que sean grupos de temas
// que a su vez tengan pestañas y tengan subtemas dentro de los subtemas», y
// «haz que el menú izquierdo el usuario lo pueda reordenar y pueda darle a un
// botón de favorito… igual hay algún tema que el usuario quiere ocultar».
//
// Lo que decidió él, preguntado antes de escribir:
//   · comunes, y **cualquiera puede crear uno sin revisión**;
//   · «solo se intenta que no se dupliquen, y que la IA lo organice»;
//   · sin límite de profundidad;
//   · una publicación puede estar en varios, de objetivos distintos;
//   · ocultar quita del menú, no del muro.
//
// ── SIN REVISIÓN NO ES SIN CUIDADO ─────────────────────────────────────────
// Un árbol común donde cualquiera añade sin que nadie mire se degrada de una
// forma concreta y conocida: no por vandalismo, sino por **sinónimos**. A los
// tres meses hay «Desalación», «Desalinización» y «Desalar agua» colgando del
// mismo sitio, cada una con tres cosas dentro, y el tema deja de servir para
// encontrar nada.
//
// Por eso lo que sustituye a la revisión son dos cosas, y las dos actúan ANTES
// de crear:
//   1. la base de datos impide dos hermanos con el mismo nombre reducido;
//   2. la IA compara el nombre nuevo con los hermanos que ya hay y, si
//      significan lo mismo, **devuelve el que existe en vez de crear otro**.
// Nadie tiene que aprobar nada, y aun así el árbol no se llena de copias.

const nuevoId = () => `ST_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`.toUpperCase();

/**
 * El nombre reducido a lo que importa para compararlo: sin tildes, sin
 * mayúsculas, sin signos y sin espacios de más.
 *
 * Es lo que hace que «Desalación» y «desalacion » sean el mismo tema para el
 * índice único. No cubre los sinónimos —eso no lo sabe una función— y de eso
 * se ocupa la IA más abajo.
 */
export function claveDe(nombre: string): string {
  return nombre
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * ¿El nombre nuevo significa lo mismo que alguno de los que ya cuelgan de ahí?
 *
 * Devuelve el id del que ya existe, o `null` si de verdad es otro tema.
 *
 * ── POR QUÉ SE LE PREGUNTA A LA IA Y NO A UNA LISTA DE SINÓNIMOS ───────────
 * Porque los temas los escribe la gente y no hay lista que los cubra: «coste
 * energético», «cuánta luz gasta» y «consumo eléctrico» son el mismo subtema y
 * no comparten ni una palabra.
 *
 * ── Y SI LA IA NO CONTESTA, SE CREA ────────────────────────────────────────
 * Es la decisión importante de esta función. Ante la duda, **crear**: un tema
 * duplicado es un incordio que alguien puede arreglar después; un tema que no
 * se deja crear porque un modelo no contestó es una puerta cerrada sin motivo
 * y sin explicación. El fallo tiene que caer del lado que se puede deshacer.
 */
async function yaExisteConOtroNombre(nombre: string, hermanos: Array<{ id: string; nombre: string }>): Promise<string | null> {
  if (!hermanos.length) return null;
  try {
    const modelo = 'claude-haiku-4-5';
    const proveedor = getProvider(providerOfModel(modelo));
    if (!proveedor.isReady()) return null;

    const r: any = await proveedor.complete({
      system: [
        'Decides si un tema nuevo es el MISMO que uno que ya existe.',
        'Mismo significa que alguien que buscara uno esperaría encontrar el otro.',
        'Ser parecidos o estar relacionados NO es ser el mismo: «Riego» y «Riego por goteo» son distintos.',
        'Contesta SOLO con el número de la lista, o con 0 si es un tema nuevo. Nada más.',
      ].join('\n'),
      messages: [{
        role: 'user',
        content: `Tema nuevo: "${nombre}"\n\nYa existen:\n` +
          hermanos.map((h, i) => `${i + 1}. ${h.nombre}`).join('\n'),
      }],
      maxTokens: 8,
      temperature: 0,
      model: modelo,
    });
    const n = parseInt(String(r.text || '').trim().match(/\d+/)?.[0] || '0', 10);
    return n >= 1 && n <= hermanos.length ? hermanos[n - 1].id : null;
  } catch {
    // Ver la nota de arriba: ante la duda se crea.
    return null;
  }
}

export function registrarTemas(app: Express, db: any) {

  /**
   * CREAR UN SUBTEMA — `POST /api/temas`
   * `{ objetivo, padre?, nombre }`
   *
   * Puede cualquiera con sesión y no lo revisa nadie. Lo único que se hace
   * antes es mirar si ya está, con otro nombre. Si estaba, se devuelve **el
   * que había** y se dice que ya existía: quien lo pedía consigue lo que
   * quería y el árbol no crece de más.
   */
  app.post('/api/temas', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión para crear un tema.' });
    try {
      const nombre = String(req.body?.nombre || '').trim().slice(0, 80);
      const objetivo = String(req.body?.objetivo || '').trim();
      const padre = req.body?.padre ? String(req.body.padre) : null;
      if (nombre.length < 2) return res.status(400).json({ error: 'El tema necesita un nombre.' });
      if (!objetivo && !padre) return res.status(400).json({ error: 'Falta de qué objetivo cuelga.' });

      const clave = claveDe(nombre);
      if (!clave) return res.status(400).json({ error: 'Ese nombre no dice nada.' });

      // Los que ya cuelgan del mismo sitio.
      const hermanos = await db.execute(sql`
        SELECT id, nombre, nombre_clave FROM subtemas
        WHERE archived_at IS NULL
          AND coalesce(padre_id, '') = coalesce(${padre}::text, '')
          AND (${padre}::text IS NOT NULL OR objetivo_id = ${objetivo})
      `);
      const lista = hermanos.rows as any[];

      // 1. Mismo nombre exacto: lo resuelve la comparación, sin gastar IA.
      const igual = lista.find(h => h.nombre_clave === clave);
      if (igual) return res.json({ id: igual.id, nombre: igual.nombre, yaExistia: true });

      // 2. Mismo significado con otro nombre.
      const mismo = await yaExisteConOtroNombre(nombre, lista.map(h => ({ id: h.id, nombre: h.nombre })));
      if (mismo) {
        const cual = lista.find(h => h.id === mismo);
        return res.json({ id: mismo, nombre: cual?.nombre, yaExistia: true, porSignificado: true });
      }

      const id = nuevoId();
      await db.execute(sql`
        INSERT INTO subtemas (id, objetivo_id, padre_id, nombre, nombre_clave, creador_user_id, orden)
        VALUES (${id}, ${objetivo || 'O000'}, ${padre}, ${nombre}, ${clave}, ${req.user.id},
                coalesce((SELECT max(orden) + 1 FROM subtemas
                           WHERE archived_at IS NULL
                             AND coalesce(padre_id,'') = coalesce(${padre}::text,'')
                             AND (${padre}::text IS NOT NULL OR objetivo_id = ${objetivo})), 0))
      `);
      res.json({ id, nombre, yaExistia: false });
    } catch (e: any) {
      // El índice único puede saltar si dos personas crean el mismo tema a la
      // vez. No es un error que haya que enseñar: lo que querían ya existe.
      if (String(e?.code) === '23505') {
        const otra = await db.execute(sql`
          SELECT id, nombre FROM subtemas
          WHERE archived_at IS NULL AND nombre_clave = ${claveDe(String(req.body?.nombre || ''))}
            AND coalesce(padre_id,'') = coalesce(${req.body?.padre || null}::text,'')
          LIMIT 1`);
        if (otra.rows.length) return res.json({ ...(otra.rows[0] as any), yaExistia: true });
      }
      console.error('[temas crear]', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * MI MENÚ — `PUT /api/temas/preferencia`
   * `{ clave, favorito?, oculto? }`
   *
   * Vale para un objetivo (`O001`) y para un subtema: la preferencia es la
   * misma cosa y por eso comparte tabla.
   */
  app.put('/api/temas/preferencia', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const clave = String(req.body?.clave || '');
      if (!clave) return res.status(400).json({ error: 'Falta el tema.' });
      const fav = req.body?.favorito;
      const oculto = req.body?.oculto;
      await db.execute(sql`
        INSERT INTO preferencias_menu (user_id, clave, favorito, oculto)
        VALUES (${req.user.id}, ${clave}, ${fav === true}, ${oculto === true})
        ON CONFLICT (user_id, clave) DO UPDATE SET
          -- Sólo se toca lo que viene. Mandar «favorito» no puede desactivar
          -- «oculto» de rebote: son dos decisiones distintas de la misma
          -- persona y se guardan por separado.
          favorito = CASE WHEN ${fav === undefined || fav === null} THEN preferencias_menu.favorito ELSE ${fav === true} END,
          oculto   = CASE WHEN ${oculto === undefined || oculto === null} THEN preferencias_menu.oculto ELSE ${oculto === true} END,
          updated_at = now()
      `);
      res.json({ ok: true });
    } catch (e: any) {
      console.error('[temas preferencia]', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * EL ORDEN — `PUT /api/temas/orden`  `{ claves: [...] }`
   *
   * Llega la lista entera en el orden que quiere la persona, y se guarda la
   * posición de cada una. Se manda entera y no «este se mueve al puesto 3»
   * porque así el resultado no depende de que el servidor y la pantalla estén
   * de acuerdo en cómo estaba antes.
   */
  app.put('/api/temas/orden', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const claves: string[] = Array.isArray(req.body?.claves) ? req.body.claves.map(String).slice(0, 500) : [];
      if (!claves.length) return res.status(400).json({ error: 'Falta el orden.' });
      for (let i = 0; i < claves.length; i++) {
        await db.execute(sql`
          INSERT INTO preferencias_menu (user_id, clave, orden)
          VALUES (${req.user.id}, ${claves[i]}, ${i})
          ON CONFLICT (user_id, clave) DO UPDATE SET orden = ${i}, updated_at = now()
        `);
      }
      res.json({ ok: true });
    } catch (e: any) {
      console.error('[temas orden]', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * TODO EL ÁRBOL DE UNA VEZ — `GET /api/temas`
   *
   * Para la página de preferencias: la rueda enseña los catorce objetivos y
   * todo lo que cuelga de ellos, así que pedirlo objetivo a objetivo serían
   * catorce viajes para pintar un solo dibujo.
   *
   * Es una consulta más grande y aun así la correcta: el árbol entero de la
   * plataforma son los subtemas que ha creado la gente, no un catálogo de
   * millones. Si algún día lo fuera, esto se pagina por objetivo — y entonces
   * la rueda pedirá cada rama al abrirla, que es como ya funciona por dentro.
   */
  app.get('/api/temas', async (req: Request, res: Response) => {
    try {
      const yo = req.user?.id || null;
      const filas = await db.execute(sql`
        SELECT s.id, s.objetivo_id, s.padre_id, s.nombre, s.orden,
               -- ── LA CUENTA ES DE LA RAMA ENTERA, NO DEL NODO (2026-08-25)
               -- Contaba sólo lo colgado de este subtema. Lo cazó prog8
               -- midiendo el árbol: cuatro de sus ramas salían con CERO y
               -- tenían dos o tres hijas llenas cada una. Un padre cuyo
               -- contenido vive en sus hijos aparecía vacío.
               --
               -- Y eso no es un número feo: es un número que MIENTE. Con él,
               -- cualquier criterio de poda —«borra lo que no tiene nada»—
               -- empieza matando a los padres, que es justo lo contrario de lo
               -- que se quería.
               --
               -- Recursivo, y no una cuenta simple, porque el árbol no tiene límite de
               -- profundidad: lo que cuelga de una rama puede estar cuatro
               -- niveles más abajo.
               -- DISTINCT, y cuesta una palabra: sin él esto contaba FILAS de
               -- subtema_contenido y no PIEZAS. Una publicación puede estar
               -- colgada de varias ramas de la misma rama a propósito —0120 lo
               -- permite—, así que se contaba dos y tres veces. El menú decía
               -- 75 en «Movilidad eléctrica ligera» y su página decía 64: el
               -- mismo nodo con dos números en dos pantallas. (Sin acentos
               -- graves aquí: esto va dentro de una plantilla sql y uno solo la
               -- corta en seco.)
               (SELECT count(DISTINCT (c.tipo, c.entity_id))::int FROM subtema_contenido c
                 WHERE c.subtema_id IN (
                   WITH RECURSIVE rama AS (
                     SELECT s.id
                     UNION ALL
                     SELECT h.id FROM subtemas h JOIN rama r ON h.padre_id = r.id
                      WHERE h.archived_at IS NULL
                   ) SELECT id FROM rama)) AS cosas,
               coalesce(p.favorito, false) AS favorito,
               coalesce(p.oculto, false) AS oculto
        FROM subtemas s
        LEFT JOIN preferencias_menu p ON p.clave = s.id AND p.user_id = ${yo}::text
        WHERE s.archived_at IS NULL
        ORDER BY s.objetivo_id, coalesce(p.orden, s.orden), s.created_at
      `);
      // Y las preferencias de los catorce, que no son filas de `subtemas`: sin
      // esto la rueda sabría qué subtemas son favoritos y no qué objetivos.
      const prefs = yo
        ? await db.execute(sql`SELECT clave, favorito, oculto, orden FROM preferencias_menu WHERE user_id = ${yo}`)
        : { rows: [] as any[] };
      res.json({ subtemas: filas.rows, preferencias: prefs.rows });
    } catch (e: any) {
      console.error('[temas todos]', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * BUSCAR UN TEMA MIENTRAS SE ESCRIBE — `GET /api/temas/buscar?q=`
   *
   * Eugenio: «que según vayas escribiendo te diga los temas que ya hay creados,
   * y no te permita duplicarlos».
   *
   * ── ENSEÑAR LO QUE HAY ES LA FORMA DE NO DUPLICAR ─────────────────────────
   * El servidor ya se niega a crear un hermano repetido, y la IA además caza
   * los sinónimos. Pero eso ocurre DESPUÉS de escribir el nombre y pulsar, y
   * llegar hasta ahí para que te digan que no es perder el tiempo de alguien
   * que quería colaborar.
   *
   * Esto lo evita antes: mientras escribes «desal» ya ves «Desalación» y
   * dónde vive. La mayoría de las veces lo que buscabas era eso.
   *
   * Cada resultado viene con SU CAMINO —«AGUA › Desalación › Coste
   * energético»— porque un nombre suelto no dice si es el que buscas: puede
   * haber «Prevención» dentro de Salud y dentro de Ecosistemas, y son dos
   * cosas distintas que se llaman igual.
   */
  app.get('/api/temas/buscar', async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || '').trim();
      if (q.length < 2) return res.json({ q, temas: [] });
      // Se busca por el nombre reducido: así «desalacion» encuentra
      // «Desalación» sin que nadie tenga que poner la tilde.
      const patron = `%${claveDe(q)}%`;
      const r = await db.execute(sql`
        WITH RECURSIVE camino AS (
          SELECT id, objetivo_id, padre_id, nombre, nombre_clave, nombre AS ruta, 1 AS nivel
            FROM subtemas WHERE padre_id IS NULL AND archived_at IS NULL
          UNION ALL
          SELECT s.id, s.objetivo_id, s.padre_id, s.nombre, s.nombre_clave,
                 c.ruta || ' › ' || s.nombre, c.nivel + 1
            FROM subtemas s JOIN camino c ON c.id = s.padre_id
           WHERE s.archived_at IS NULL AND c.nivel < 8
        )
        SELECT id, objetivo_id, padre_id, nombre, ruta, nivel FROM camino
         WHERE nombre_clave LIKE ${patron}
         -- Lo que empieza por lo escrito primero, y lo menos hondo antes: quien
         -- escribe «riego» busca «Riego» y no «Riego por goteo en invernadero».
         ORDER BY (nombre_clave LIKE ${claveDe(q) + '%'}) DESC, nivel, nombre
         LIMIT 12
      `);
      res.json({ q, temas: r.rows });
    } catch (e: any) {
      console.error('[temas buscar]', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** LO MÍO DE LOS 14 OBJETIVOS — `GET /api/temas/mio/objetivos` */
  app.get('/api/temas/mio/objetivos', async (req: Request, res: Response) => {
    if (!req.user) return res.json({ preferencias: [] });
    try {
      const r = await db.execute(sql`
        SELECT clave, favorito, oculto, orden FROM preferencias_menu
        WHERE user_id = ${req.user.id}
      `);
      res.json({ preferencias: r.rows });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  /*
   * ── ESTE VA EL ÚLTIMO, Y NO ES ORDEN ALFABÉTICO ──────────────────────────
   * `/api/temas/:objetivo` se traga CUALQUIER cosa que venga detrás de
   * `/api/temas/`. Registrado antes que `/api/temas/buscar`, una búsqueda se
   * habría atendido como «dame el árbol del objetivo llamado buscar»: cero
   * resultados, 200, y ningún error en ninguna parte. El buscador habría
   * parecido roto y el servidor habría dicho que todo iba bien.
   *
   * En Express gana el primero que encaja, así que lo que lleva comodín se
   * pone SIEMPRE detrás de lo que lleva nombre fijo. Es la misma norma que ya
   * está escrita en `modulos.ts` para el orden de los módulos.
   */
  /**
   * EL ÁRBOL DE UN OBJETIVO — `GET /api/temas/:objetivo`
   *
   * Todo el árbol de una vez, plano, con `padre_id`: quien lo pinta lo monta.
   * Un objetivo no tiene cientos de subtemas, así que traerlo entero cuesta
   * menos que una petición por nivel cada vez que alguien despliega una rama.
   *
   * Y con lo de cada uno pegado: si es tuyo favorito, si lo tienes escondido y
   * en qué orden lo pusiste. Sin sesión, todo eso viene vacío.
   */
  app.get('/api/temas/:objetivo', async (req: Request, res: Response) => {
    try {
      const objetivo = String(req.params.objetivo || '');
      const yo = req.user?.id || null;
      const filas = await db.execute(sql`
        SELECT s.id, s.padre_id, s.nombre, s.orden, s.creador_user_id,
               -- ── LA CUENTA ES DE LA RAMA ENTERA, NO DEL NODO (2026-08-25)
               -- Contaba sólo lo colgado de este subtema. Lo cazó prog8
               -- midiendo el árbol: cuatro de sus ramas salían con CERO y
               -- tenían dos o tres hijas llenas cada una. Un padre cuyo
               -- contenido vive en sus hijos aparecía vacío.
               --
               -- Y eso no es un número feo: es un número que MIENTE. Con él,
               -- cualquier criterio de poda —«borra lo que no tiene nada»—
               -- empieza matando a los padres, que es justo lo contrario de lo
               -- que se quería.
               --
               -- Recursivo, y no una cuenta simple, porque el árbol no tiene límite de
               -- profundidad: lo que cuelga de una rama puede estar cuatro
               -- niveles más abajo.
               -- DISTINCT, y cuesta una palabra: sin él esto contaba FILAS de
               -- subtema_contenido y no PIEZAS. Una publicación puede estar
               -- colgada de varias ramas de la misma rama a propósito —0120 lo
               -- permite—, así que se contaba dos y tres veces. El menú decía
               -- 75 en «Movilidad eléctrica ligera» y su página decía 64: el
               -- mismo nodo con dos números en dos pantallas. (Sin acentos
               -- graves aquí: esto va dentro de una plantilla sql y uno solo la
               -- corta en seco.)
               (SELECT count(DISTINCT (c.tipo, c.entity_id))::int FROM subtema_contenido c
                 WHERE c.subtema_id IN (
                   WITH RECURSIVE rama AS (
                     SELECT s.id
                     UNION ALL
                     SELECT h.id FROM subtemas h JOIN rama r ON h.padre_id = r.id
                      WHERE h.archived_at IS NULL
                   ) SELECT id FROM rama)) AS cosas,
               coalesce(p.favorito, false) AS favorito,
               coalesce(p.oculto, false) AS oculto,
               p.orden AS mi_orden
        FROM subtemas s
        LEFT JOIN preferencias_menu p ON p.clave = s.id AND p.user_id = ${yo}::text
        WHERE s.objetivo_id = ${objetivo} AND s.archived_at IS NULL
        ORDER BY coalesce(p.orden, s.orden), s.created_at
      `);
      res.json({ objetivo, subtemas: filas.rows });
    } catch (e: any) {
      console.error('[temas]', e);
      res.status(500).json({ error: e.message });
    }
  });

}
