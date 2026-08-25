import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { OBJECTIVE_ID_BY_KEY } from '../utils/objectiveIds.js';

/**
 * `O008` → `movilidad`. Es `objectiveIds.ts` leído del revés, y se lee del
 * revés en vez de escribir aquí una segunda lista de los catorce: dos listas
 * de lo mismo se separan el día que alguien añade un objetivo, y la que se
 * queda vieja es siempre la copia.
 */
const NOMBRE_DE_OBJETIVO: Record<string, string> = Object.fromEntries(
  Object.entries(OBJECTIVE_ID_BY_KEY).map(([nombre, id]) => [id, nombre]),
);

/**
 * Una lista de textos como UN parámetro de Postgres, para `= ANY(...)`.
 *
 * ── POR QUÉ HACE FALTA ESTA FUNCIÓN ────────────────────────────────────────
 * Metiendo un array de JavaScript directamente en la plantilla `sql`, drizzle
 * lo despliega en `($1, $2, …, $31)` — una lista de parámetros sueltos, no un
 * array — y `ANY()` de un array vacío ni siquiera es SQL válido. Las dos cosas
 * fallan en el momento de la consulta y no antes, así que `tsc` las da por
 * buenas. Aquí se construye el `ARRAY[…]::text[]` explícito, y el caso vacío
 * tiene su propia forma en vez de romper.
 */
/**
 * El mismo texto sin tildes, dentro de Postgres.
 *
 * ── POR QUÉ NO BASTA CON QUITARLE LAS TILDES A LA BÚSQUEDA ─────────────────
 * Buscar «baterias» contra un texto que dice «batería» no encuentra nada, y es
 * el caso normal y no el raro: el tema se llama en plural y el texto habla en
 * singular, y las dos palabras llevan la tilde donde el patrón ya no la tiene.
 * Comprobado aquí mismo: los cinco subtemas de Movilidad devolvían cero de
 * dentro, y no era que no hubiera nada.
 *
 * `unaccent` resolvería esto mejor, pero es una extensión y habría que
 * instalarla en la base de producción; `translate` es SQL de siempre y hace lo
 * mismo para el castellano. Si algún día entra `unaccent`, esto se sustituye
 * por una llamada y las consultas no cambian.
 */
function sinTildes(col: any) {
  return sql`translate(lower(${col}), 'áéíóúàèìòùäëïöüâêîôûñç', 'aeiouaeiouaeiouaeiounc')`;
}

function arreglo(ids: string[]) {
  if (!ids.length) return sql`ARRAY[]::text[]`;
  return sql`ARRAY[${sql.join(ids.map(i => sql`${i}`), sql`, `)}]::text[]`;
}

// ============================================================================
// EL AGREGADOR: QUÉ SE VE AL PULSAR UN TEMA (2026-08-25)
// ============================================================================
// Eugenio, en tres encargos que son una sola pantalla:
//
//   «recopilar las mejores publicaciones de cada tema y subtema […] enseñar
//    contenido relevante en forma de mapas, imágenes, vídeos, textos y
//    gráficas cada vez que alguien pulse en un tema concreto»;
//
//   «puedes añadir un breve comentario como "IA" de por qué es relevante»;
//
//   «también tienes que tener en cuenta si el usuario tiene alguna publicación,
//    proyecto, mapa o página relacionada con ese tema, que le tengas que
//    refrescar y mostrar como contenido propio».
//
// ── TRES CARRILES, Y EL ORDEN IMPORTA ──────────────────────────────────────
// 1. LO TUYO      — tus publicaciones, proyectos y ventanas de este tema.
// 2. LA HUMANIDAD — lo que ha puesto el resto de la plataforma.
// 3. DE FUERA     — las piezas agregadas de YouTube y la web.
//
// Lo tuyo va primero por lo que pidió Eugenio: al entrar en un tema en el que
// tienes cosas, lo primero que quieres saber es si lo tuyo sigue al día. Si lo
// tuyo saliera mezclado por relevancia con un informe de la OCDE, perdería
// siempre — y entonces la plataforma te estaría escondiendo tu propio trabajo
// dentro de tu propio tema.
//
// ── CLASIFICADO Y ENCONTRADO NO SON LO MISMO, Y SE DICE ────────────────────
// Hoy casi nada está clasificado: `subtema_contenido` acaba de nacer. Así que
// además de lo clasificado se BUSCA por palabras, igual que hace hoy el filtro
// por objetivo de `utils/objetivos.ts`.
//
// Lo encontrado así viene marcado `por_busqueda: true` y la pantalla lo dice.
// Es la misma decisión que ya está escrita en `objetivos.ts`: «las palabras son
// para buscar, no para clasificar», y llamar categoría a una búsqueda sería
// afirmar una clasificación que nadie ha hecho.

/** Palabras vacías: aparecen en cualquier texto y no distinguen ningún tema. */
const VACIAS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'o', 'u', 'en', 'con', 'por',
  'para', 'un', 'una', 'unos', 'unas', 'al', 'a', 'que', 'se', 'su', 'sus',
]);

/** Sin tildes y en minúsculas: mismo criterio que `claveDe` en `temas.ts`. */
function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Las palabras con las que se busca un tema.
 *
 * Se usan el nombre del subtema Y el de sus padres, porque un subtema hondo
 * suele llamarse con una palabra sola —«GBFS», «Reparto urbano»— y sin la rama
 * de arriba no se entiende de qué habla. Buscar «Reparto urbano» a secas trae
 * paquetería de furgoneta; con «Bicicleta de carga» delante, no.
 *
 * Fuera van las palabras de menos de cuatro letras: «VMP» sí sirve, pero se
 * añade aparte porque es una sigla, y «con» o «por» sólo traen ruido.
 */
function palabrasDe(nombres: string[]): string[] {
  const fuera = new Set<string>();
  for (const n of nombres) {
    for (const p of normalizar(n).replace(/[^a-z0-9áéíóúñ\s]/gi, ' ').split(/\s+/)) {
      if (!p || VACIAS.has(p)) continue;
      // Las siglas cortas en mayúsculas del nombre original sí valen.
      if (p.length < 4 && !/^[A-ZÁÉÍÓÚÑ]{2,}$/.test(n.match(new RegExp(p, 'i'))?.[0] || '')) continue;
      fuera.add(p);
    }
  }
  return [...fuera].slice(0, 8);
}

export function registrarAgregador(app: Express, db: any) {
  /**
   * QUÉ TEMAS TIENEN RAMAS — `GET /api/agregador/temas/cuantos`
   *
   * Devuelve `{ O001: 0, …, O008: 31 }`.
   *
   * ── POR QUÉ HACE FALTA, SI YA ESTÁ `GET /api/temas/:objetivo` ────────────
   * El menú pide el árbol de un tema **al abrirlo**, no al cargar: catorce
   * árboles por adelantado, para catorce flechas que casi nadie pulsa, es
   * pagar la portada entera de golpe.
   *
   * Pero entonces el menú no sabe **en cuál dibujar la flecha**, y ahí no hay
   * salida buena: pintarla en los catorce hace que trece se abran vacías, y no
   * pintarla ninguna esconde la única que tiene algo. Esta ruta es una sola
   * consulta agregada que contesta exactamente esa pregunta y ninguna otra.
   */
  app.get('/api/agregador/temas/cuantos', async (_req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`
        SELECT objetivo_id, count(*)::int AS cuantos
        FROM subtemas WHERE archived_at IS NULL
        GROUP BY objetivo_id
      `);
      const m: Record<string, number> = {};
      for (const f of r.rows as any[]) m[f.objetivo_id] = f.cuantos;
      res.json({ cuantos: m });
    } catch (e: any) {
      console.error('[agregador cuantos]', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * LO QUE SE VE AL PULSAR UN TEMA — `GET /api/agregador/tema/:id`
   *
   * Devuelve el tema, sus ramas y los tres carriles. Sin sesión, `tuyo` viene
   * vacío y no se pide: no hay nadie de quien sea nada.
   */
  app.get('/api/agregador/tema/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id || '');
      const yo = req.user?.id || null;

      const suyo = await db.execute(sql`
        SELECT id, objetivo_id, padre_id, nombre FROM subtemas
        WHERE id = ${id} AND archived_at IS NULL
      `);
      if (!suyo.rows.length) return res.status(404).json({ error: 'Ese tema no existe.' });
      const tema = suyo.rows[0] as any;

      // ── EL CAMINO HASTA AQUÍ ────────────────────────────────────────────
      // Para las migas de pan y para las palabras de búsqueda. Recursivo hacia
      // ARRIBA: son como mucho unos pocos niveles, y el árbol no tiene límite
      // de profundidad, así que un número fijo de consultas no valdría.
      const camino = await db.execute(sql`
        WITH RECURSIVE subida AS (
          SELECT id, padre_id, nombre, 0 AS altura FROM subtemas WHERE id = ${id}
          UNION ALL
          SELECT s.id, s.padre_id, s.nombre, subida.altura + 1
          FROM subtemas s JOIN subida ON s.id = subida.padre_id
        )
        SELECT id, nombre FROM subida ORDER BY altura DESC
      `);

      // ── TODA LA RAMA, PARA CONTAR ───────────────────────────────────────
      // Pulsar «Baterías» tiene que enseñar también lo que hay en «Fuga
      // térmica»: si no, el padre sale vacío y parece que no hay nada, cuando
      // lo que pasa es que está un nivel más abajo.
      const rama = await db.execute(sql`
        WITH RECURSIVE bajada AS (
          SELECT id FROM subtemas WHERE id = ${id}
          UNION ALL
          SELECT s.id FROM subtemas s JOIN bajada ON s.padre_id = bajada.id
          WHERE s.archived_at IS NULL
        )
        SELECT id FROM bajada
      `);
      const ramaIds = arreglo((rama.rows as any[]).map(r => r.id));

      const hijos = await db.execute(sql`
        SELECT s.id, s.nombre,
               (SELECT count(*)::int FROM subtema_contenido c WHERE c.subtema_id = s.id) AS cosas
        FROM subtemas s
        WHERE s.padre_id = ${id} AND s.archived_at IS NULL
        ORDER BY s.orden, s.nombre
      `);

      // ── CARRIL 3: LO DE FUERA ───────────────────────────────────────────
      const fuera = await db.execute(sql`
        SELECT DISTINCT a.id, a.origen, a.formato, a.url, a.origen_id, a.titulo,
               a.fuente, a.idioma, a.publicado_el, a.nota_ia, a.calidad, a.estado
        FROM contenido_agregado a
        JOIN subtema_contenido c ON c.entity_id = a.id AND c.tipo = 'agregado'
        WHERE c.subtema_id = ANY(${ramaIds}) AND a.archived_at IS NULL
        ORDER BY a.calidad DESC, a.titulo
      `);

      // ── CARRILES 1 Y 2: LO DE DENTRO ────────────────────────────────────
      // Primero lo clasificado de verdad; luego, lo que se parece.
      const clasificado = await db.execute(sql`
        SELECT DISTINCT c.tipo, c.entity_id FROM subtema_contenido c
        WHERE c.subtema_id = ANY(${ramaIds}) AND c.tipo <> 'agregado'
      `);
      const idsPub = arreglo((clasificado.rows as any[]).filter(r => r.tipo === 'publicacion').map(r => r.entity_id));
      const idsProy = arreglo((clasificado.rows as any[]).filter(r => r.tipo === 'proyecto').map(r => r.entity_id));
      const idsVent = arreglo((clasificado.rows as any[]).filter(r => r.tipo === 'ventana').map(r => r.entity_id));

      // ── LAS PALABRAS: LAS DE ESTE TEMA **Y** LAS DE SU RAMA ──────────────
      // Con todas juntas en un solo «o» esto se llenaba de ruido: «España: VMP
      // y DGT» traía «Evolución precio vivienda España» e «Incendios
      // forestales de España», porque bastaba con acertar UNA palabra y la
      // palabra que acertaban era «españa».
      //
      // Así que la rama de arriba no ensancha, ESTRECHA: hay que decir algo de
      // este tema **y además** algo de la rama en la que está. «España» y
      // «movilidad» a la vez ya no lo cumple una noticia de vivienda.
      const propias = palabrasDe([tema.nombre]);
      // El OBJETIVO entra en la rama, y no es un adorno: el padre de un subtema
      // hondo no siempre lleva la palabra del tema. «Tratamiento y purificación
      // del agua» cuelga de «Infraestructura y distribución urbana», donde la
      // palabra «agua» ya no está — y sin ella la única ventana de agua de la
      // plataforma se quedaba fuera de su propio subtema.
      const heredadas = palabrasDe([
        ...(camino.rows as any[]).slice(0, -1).map(r => r.nombre),
        NOMBRE_DE_OBJETIVO[tema.objetivo_id] ?? '',
      ]);
      const palabras = [...new Set([...propias, ...heredadas])];
      // `%palabra%` sobre título y cuerpo. `unaccent` no está instalado, así
      // que se compara en minúsculas y se acepta que «batería» y «bateria» no
      // sean la misma búsqueda; por eso las palabras salen ya sin tildes y se
      // busca también la forma con tilde tal cual está escrita.
      const patron = propias.length ? '(' + propias.join('|') + ')' : null;
      // Sin rama por encima —el tema de primer nivel— no hay nada que
      // estrechar, y entonces la segunda condición sobra en vez de vaciarlo.
      const patronRama = heredadas.length ? '(' + heredadas.join('|') + ')' : null;

      const dentro: any[] = [];

      const pubs = await db.execute(sql`
        SELECT p.id, p.title, p.body, p.created_at, p.updated_at, p.author_user_id,
               u.name AS autor,
               (p.id = ANY(${idsPub})) AS clasificado
        FROM publications p LEFT JOIN users u ON u.id = p.author_user_id
        WHERE p.archived_at IS NULL AND p.deleted_at IS NULL
          AND p.visibility = 'public'
          AND (
            p.id = ANY(${idsPub})
            OR (${patron}::text IS NOT NULL
                AND (${sinTildes(sql`coalesce(p.title, '')`)} ~ ${patron}
                  OR ${sinTildes(sql`coalesce(p.body, '')`)}  ~ ${patron})
                AND (${patronRama}::text IS NULL
                  OR ${sinTildes(sql`coalesce(p.title, '') || ' ' || coalesce(p.body, '')`)} ~ ${patronRama}))
          )
        ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC
        LIMIT 40
      `);
      for (const r of pubs.rows as any[]) {
        dentro.push({
          tipo: 'publicacion', id: r.id, titulo: r.title || '(sin título)',
          extracto: (r.body || '').slice(0, 220), autor: r.autor,
          duenyo: r.author_user_id, fecha: r.updated_at || r.created_at,
          ruta: `/muro?p=${r.id}`, por_busqueda: !r.clasificado,
        });
      }

      const proys = await db.execute(sql`
        SELECT p.id, p.titulo, p.descripcion, p.slug, p.updated_at, p.created_at,
               p.creador_user_id, (p.id = ANY(${idsProy})) AS clasificado
        FROM proyectos p
        WHERE p.archived_at IS NULL AND p.deleted_at IS NULL AND p.publico = true
          AND (
            p.id = ANY(${idsProy})
            OR (${patron}::text IS NOT NULL
                AND (${sinTildes(sql`coalesce(p.titulo, '')`)} ~ ${patron}
                  OR ${sinTildes(sql`coalesce(p.descripcion, '')`)} ~ ${patron})
                AND (${patronRama}::text IS NULL
                  OR ${sinTildes(sql`coalesce(p.titulo, '') || ' ' || coalesce(p.descripcion, '')`)} ~ ${patronRama}))
          )
        ORDER BY p.updated_at DESC NULLS LAST
        LIMIT 20
      `);
      for (const r of proys.rows as any[]) {
        dentro.push({
          tipo: 'proyecto', id: r.id, titulo: r.titulo,
          extracto: (r.descripcion || '').slice(0, 220),
          duenyo: r.creador_user_id, fecha: r.updated_at || r.created_at,
          ruta: `/proyectos/${r.slug || r.id}`, por_busqueda: !r.clasificado,
        });
      }

      const vents = await db.execute(sql`
        SELECT v.id, v.title, v.kind, v.slug, v.updated_at, v.created_at,
               v.creator_user_id, (v.id = ANY(${idsVent})) AS clasificado
        FROM knowledge_windows v
        WHERE v.archived_at IS NULL AND v.deleted_at IS NULL AND v.publico = true
          AND (
            v.id = ANY(${idsVent})
            OR (${patron}::text IS NOT NULL
                AND ${sinTildes(sql`coalesce(v.title, '')`)} ~ ${patron}
                AND (${patronRama}::text IS NULL
                  OR ${sinTildes(sql`coalesce(v.title, '')`)} ~ ${patronRama}))
          )
        ORDER BY v.updated_at DESC NULLS LAST
        LIMIT 20
      `);
      for (const r of vents.rows as any[]) {
        dentro.push({
          tipo: r.kind === 'map' ? 'mapa' : r.kind === 'chart' ? 'grafica' : 'ventana',
          id: r.id, titulo: r.title, extracto: '',
          duenyo: r.creator_user_id, fecha: r.updated_at || r.created_at,
          ruta: `/w/${r.slug || r.id}`, por_busqueda: !r.clasificado,
        });
      }

      // El reparto entre los dos carriles se hace aquí y no en SQL para no
      // repetir tres consultas casi idénticas con y sin el filtro de dueño.
      const tuyo = yo ? dentro.filter(d => d.duenyo === yo) : [];
      const humanidad = dentro.filter(d => !yo || d.duenyo !== yo);

      res.json({
        tema,
        camino: camino.rows,
        hijos: hijos.rows,
        palabras,
        tuyo,
        humanidad: humanidad.slice(0, 30),
        fuera: fuera.rows,
      });
    } catch (e: any) {
      console.error('[agregador tema]', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * PONER ALGO EN UN TEMA — `POST /api/agregador/tema/:id/contenido`
   * `{ tipo, entity_id }`
   *
   * La pieza que faltaba: 0120 creó la tabla `subtema_contenido` y no dejó
   * ninguna ruta que escribiera en ella, así que el árbol no se podía llenar
   * ni por una persona ni por el agregador.
   *
   * ── QUIÉN PUEDE ────────────────────────────────────────────────────────
   * Cualquiera con sesión puede clasificar **lo suyo**. Para meter lo de otro
   * hace falta nivel 4, porque poner el proyecto de otra persona en un tema es
   * hablar por ella. Es más estricto que crear un subtema —que 0120 dejó
   * abierto a todos a propósito— y la diferencia tiene motivo: crear una rama
   * vacía no afecta a nadie; colgar el trabajo de alguien de una rama, sí.
   */
  app.post('/api/agregador/tema/:id/contenido', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión para poner algo en un tema.' });
    try {
      const subtema = String(req.params.id || '');
      const tipo = String(req.body?.tipo || '').trim();
      const entity = String(req.body?.entity_id || '').trim();
      if (!tipo || !entity) return res.status(400).json({ error: 'Falta qué se pone y de qué tipo.' });

      const hay = await db.execute(sql`SELECT id FROM subtemas WHERE id = ${subtema} AND archived_at IS NULL`);
      if (!hay.rows.length) return res.status(404).json({ error: 'Ese tema no existe.' });

      // ¿Es suyo? Cada tipo guarda al dueño en una columna distinta.
      let duenyo: string | null = null;
      if (tipo === 'publicacion') {
        const r = await db.execute(sql`SELECT author_user_id AS d FROM publications WHERE id = ${entity}`);
        duenyo = (r.rows[0] as any)?.d ?? null;
      } else if (tipo === 'proyecto') {
        const r = await db.execute(sql`SELECT creador_user_id AS d FROM proyectos WHERE id = ${entity}`);
        duenyo = (r.rows[0] as any)?.d ?? null;
      } else if (tipo === 'ventana') {
        const r = await db.execute(sql`SELECT creator_user_id AS d FROM knowledge_windows WHERE id = ${entity}`);
        duenyo = (r.rows[0] as any)?.d ?? null;
      } else if (tipo === 'agregado') {
        const r = await db.execute(sql`SELECT id FROM contenido_agregado WHERE id = ${entity}`);
        if (!r.rows.length) return res.status(404).json({ error: 'Esa pieza no existe.' });
      } else {
        return res.status(400).json({ error: 'Ese tipo de contenido no se puede clasificar todavía.' });
      }

      // `roleLevel` es el nombre real del campo (`auth.ts`), y 4 es ADMIN.
      const nivel = req.user.roleLevel ?? 0;
      if (tipo !== 'agregado' && duenyo !== req.user.id && nivel < 4) {
        return res.status(403).json({ error: 'Sólo puedes poner en un tema lo que es tuyo.' });
      }
      if (tipo === 'agregado' && nivel < 4) {
        return res.status(403).json({ error: 'Clasificar contenido agregado es cosa de administración.' });
      }

      await db.execute(sql`
        INSERT INTO subtema_contenido (subtema_id, tipo, entity_id, puesto_por)
        VALUES (${subtema}, ${tipo}, ${entity}, ${req.user.id})
        ON CONFLICT DO NOTHING
      `);
      res.json({ ok: true });
    } catch (e: any) {
      console.error('[agregador poner]', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });
}
