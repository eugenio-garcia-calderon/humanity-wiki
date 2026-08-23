import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { REGLAS, guardian, ritmo, ipDe } from './limites/index.js';

// ============================================================================
// Motor del Grafo de Conocimiento — Fase 3
// ============================================================================
// Implementa 05_KNOWLEDGE_GRAPH.md: "desde cualquier entidad debe poder
// navegarse hacia todas las relacionadas".
//
// El grafo NO es una tabla nueva: es una vista sobre las tablas de unión que
// ya existen. Declararlo como datos (el mapa EDGES de abajo) en vez de
// escribir una consulta a medida por pareja de entidades evita tener que
// tocar código cada vez que se añade una relación, y garantiza que la
// navegación sea simétrica en ambos sentidos.

/** Entidades del grafo: nombre lógico -> tabla física y columna de etiqueta. */
export const NODE_TYPES: Record<string, { table: string; label: string; extra?: string[] }> = {
  territories:   { table: 'territories',        label: 'name',  extra: ['type'] },
  objectives:    { table: 'objectives',         label: 'title' },
  indicators:    { table: 'indicators',         label: 'name',  extra: ['objective_id', 'unit'] },
  markers:       { table: 'markers',            label: 'name',  extra: ['indicator_id'] },
  metrics:       { table: 'metrics',            label: 'name',  extra: ['marker_id'] },
  challenges:    { table: 'challenges',         label: 'title', extra: ['priority', 'scope'] },
  causes:        { table: 'causes',             label: 'title', extra: ['type'] },
  solutions:     { table: 'solutions',          label: 'title', extra: ['type'] },
  needs:         { table: 'needs',              label: 'title', extra: ['kind', 'urgency', 'status'] },
  products:      { table: 'products',           label: 'name',  extra: ['category', 'price_cents', 'currency', 'kind'] },
  demands:       { table: 'demands',            label: 'title', extra: ['status', 'urgency', 'budget_cents'] },
  initiatives:   { table: 'initiatives',        label: 'name',  extra: ['status', 'territory_id'] },
  success_cases: { table: 'success_cases',      label: 'title' },
  organizations: { table: 'organizations',      label: 'name',  extra: ['type', 'scale'] },
  users:         { table: 'users',              label: 'display_name', extra: ['avatar_url', 'role_level'] },
  publications:  { table: 'publications',       label: 'title' },
  projects:      { table: 'projects',           label: 'name',  extra: ['status'] },
  // Fase 11: los grafos y ventanas de conocimiento son entidades de primera
  // clase del grafo general — aparecen en la búsqueda global, se pueden
  // seguir, valorar y enlazar desde publicaciones.
  knowledge_graphs:  { table: 'knowledge_graphs',  label: 'title', extra: ['slug', 'views'] },
  knowledge_windows: { table: 'knowledge_windows', label: 'title', extra: ['kind'] },
  user_maps: { table: 'user_maps', label: 'title', extra: ['slug', 'views'] },
};

interface Edge {
  /** Tabla de unión. */
  via: string;
  /** Columna que apunta al nodo de origen. */
  from: string;
  /** Columna que apunta al nodo de destino. */
  to: string;
  /** Etiqueta legible de la relación, para explicar el grafo al usuario. */
  label: string;
}

/**
 * Aristas del grafo, declaradas una sola vez por pareja. `buildAdjacency`
 * las registra automáticamente en ambos sentidos, así que navegar de un reto
 * a sus productos y de un producto a sus retos funciona sin duplicar nada.
 */
const EDGES: Array<[string, string, Edge]> = [
  // Jerarquía territorial y de medición (relaciones directas por clave foránea,
  // no por tabla de unión: se resuelven aparte en DIRECT_EDGES).

  // Retos
  ['challenges', 'territories',   { via: 'challenge_territories', from: 'challenge_id', to: 'territory_id', label: 'afecta a' }],
  ['challenges', 'objectives',    { via: 'challenge_objectives',  from: 'challenge_id', to: 'objective_id', label: 'pertenece a' }],
  ['challenges', 'indicators',    { via: 'challenge_indicators',  from: 'challenge_id', to: 'indicator_id', label: 'afecta a' }],
  ['challenges', 'markers',       { via: 'challenge_markers',     from: 'challenge_id', to: 'marker_id',    label: 'afecta a' }],
  ['challenges', 'metrics',       { via: 'challenge_metrics',     from: 'challenge_id', to: 'metric_id',    label: 'afecta a' }],
  ['challenges', 'causes',        { via: 'challenge_causes',      from: 'challenge_id', to: 'cause_id',     label: 'tiene como causa' }],
  ['challenges', 'solutions',     { via: 'challenge_solutions',   from: 'challenge_id', to: 'solution_id',  label: 'se resuelve con' }],

  // Soluciones
  ['solutions', 'causes',         { via: 'solution_causes',       from: 'solution_id', to: 'cause_id',      label: 'aborda la causa' }],
  ['solutions', 'needs',          { via: 'solution_needs',        from: 'solution_id', to: 'need_id',       label: 'requiere' }],

  // Necesidades
  ['needs', 'territories',        { via: 'need_territories',      from: 'need_id', to: 'territory_id',      label: 'se ubica en' }],

  // Productos
  ['products', 'territories',     { via: 'product_territories',   from: 'product_id', to: 'territory_id',   label: 'disponible en' }],
  ['products', 'objectives',      { via: 'product_objectives',    from: 'product_id', to: 'objective_id',   label: 'contribuye a' }],
  ['products', 'indicators',      { via: 'product_indicators',    from: 'product_id', to: 'indicator_id',   label: 'mejora' }],
  ['products', 'challenges',      { via: 'product_challenges',    from: 'product_id', to: 'challenge_id',   label: 'ayuda con' }],
  ['products', 'solutions',       { via: 'product_solutions',     from: 'product_id', to: 'solution_id',    label: 'materializa' }],
  ['products', 'needs',           { via: 'product_needs',         from: 'product_id', to: 'need_id',        label: 'satisface' }],

  // Demandas
  ['demands', 'territories',      { via: 'demand_territories',    from: 'demand_id', to: 'territory_id',    label: 'se ubica en' }],
  ['demands', 'indicators',       { via: 'demand_indicators',     from: 'demand_id', to: 'indicator_id',    label: 'busca mejorar' }],
  ['demands', 'challenges',       { via: 'demand_challenges',     from: 'demand_id', to: 'challenge_id',    label: 'responde a' }],
  ['demands', 'needs',            { via: 'demand_needs',          from: 'demand_id', to: 'need_id',         label: 'expresa' }],
  ['demands', 'products',         { via: 'demand_products',       from: 'demand_id', to: 'product_id',      label: 'puede cubrirse con' }],

  // Iniciativas
  ['initiatives', 'challenges',   { via: 'initiative_challenges',    from: 'initiative_id', to: 'challenge_id',    label: 'aborda' }],
  ['initiatives', 'solutions',    { via: 'initiative_solutions',     from: 'initiative_id', to: 'solution_id',     label: 'aplica' }],
  ['initiatives', 'objectives',   { via: 'initiative_objectives',    from: 'initiative_id', to: 'objective_id',    label: 'contribuye a' }],
  ['initiatives', 'organizations',{ via: 'initiative_organizations', from: 'initiative_id', to: 'organization_id', label: 'participan' }],
  ['initiatives', 'products',     { via: 'initiative_products',      from: 'initiative_id', to: 'product_id',      label: 'utiliza' }],
  ['initiatives', 'demands',      { via: 'initiative_demands',       from: 'initiative_id', to: 'demand_id',       label: 'cubre' }],
  ['initiatives', 'users',        { via: 'initiative_participants',  from: 'initiative_id', to: 'user_id',         label: 'participan' }],
  ['initiatives', 'territories',  { via: 'initiative_territories',   from: 'initiative_id', to: 'territory_id',    label: 'se ejecuta en' }],

  // Casos de éxito
  ['success_cases', 'initiatives',{ via: 'success_case_initiatives', from: 'success_case_id', to: 'initiative_id', label: 'documenta' }],

  // Organizaciones
  ['organizations', 'objectives', { via: 'organization_objectives', from: 'organization_id', to: 'objective_id', label: 'trabaja en' }],
  ['organizations', 'solutions',  { via: 'organization_solutions',  from: 'organization_id', to: 'solution_id',  label: 'ofrece' }],

  // Usuarios
  ['users', 'territories',        { via: 'user_territories', from: 'user_id', to: 'territory_id', label: 'trabaja en' }],
  ['users', 'objectives',         { via: 'user_objectives',  from: 'user_id', to: 'objective_id', label: 'sigue' }],
  ['users', 'indicators',         { via: 'user_indicators',  from: 'user_id', to: 'indicator_id', label: 'sigue' }],

  // Proyectos (legado, hasta completar la migración a iniciativas)
  ['projects', 'challenges',      { via: 'project_challenges',    from: 'project_id', to: 'challenge_id',    label: 'aborda' }],
  ['projects', 'solutions',       { via: 'project_solutions',     from: 'project_id', to: 'solution_id',     label: 'aplica' }],
  ['projects', 'objectives',      { via: 'project_objectives',    from: 'project_id', to: 'objective_id',    label: 'contribuye a' }],
  ['projects', 'organizations',   { via: 'project_organizations', from: 'project_id', to: 'organization_id', label: 'participan' }],
];

/**
 * Relaciones por clave foránea directa (sin tabla intermedia): la jerarquía
 * Objetivo -> Indicador -> Marcador -> Métrica y las pertenencias simples.
 */
const DIRECT_EDGES: Array<{ child: string; parent: string; fk: string; childLabel: string; parentLabel: string }> = [
  { child: 'indicators', parent: 'objectives',  fk: 'objective_id',  childLabel: 'contiene',  parentLabel: 'pertenece a' },
  { child: 'markers',    parent: 'indicators',  fk: 'indicator_id',  childLabel: 'contiene',  parentLabel: 'pertenece a' },
  { child: 'metrics',    parent: 'markers',     fk: 'marker_id',     childLabel: 'contiene',  parentLabel: 'pertenece a' },
  { child: 'territories',parent: 'territories', fk: 'parent_id',     childLabel: 'contiene',  parentLabel: 'pertenece a' },
  { child: 'organizations', parent: 'territories', fk: 'territory_id', childLabel: 'tiene',   parentLabel: 'opera en' },
  { child: 'initiatives',parent: 'territories', fk: 'territory_id',  childLabel: 'acoge',     parentLabel: 'se ejecuta en' },
  { child: 'success_cases', parent: 'initiatives', fk: 'initiative_id', childLabel: 'genera', parentLabel: 'proviene de' },
];

interface Adjacency {
  targetType: string;
  via: string;
  selfCol: string;
  otherCol: string;
  label: string;
}

/** Construye la adyacencia bidireccional a partir de EDGES. */
function buildAdjacency(): Record<string, Adjacency[]> {
  const adj: Record<string, Adjacency[]> = {};
  const push = (type: string, entry: Adjacency) => {
    (adj[type] ||= []).push(entry);
  };
  for (const [a, b, e] of EDGES) {
    push(a, { targetType: b, via: e.via, selfCol: e.from, otherCol: e.to, label: e.label });
    push(b, { targetType: a, via: e.via, selfCol: e.to, otherCol: e.from, label: `relacionado con` });
  }
  return adj;
}

const ADJACENCY = buildAdjacency();

/** Columnas a seleccionar para describir un nodo de forma uniforme. */
function nodeSelect(type: string, alias = 'n') {
  const def = NODE_TYPES[type];
  const cols = [`${alias}.id`, `${alias}.uuid`, `${alias}.${def.label} AS label`];
  for (const e of def.extra || []) cols.push(`${alias}.${e}`);
  return cols.join(', ');
}

export function registerGraphRoutes(app: Express, db: any) {

  /**
   * Vecinos de una entidad, agrupados por tipo. Es la consulta que responde a
   * las preguntas de 05_KNOWLEDGE_GRAPH.md: qué productos ayudan a este reto,
   * qué personas trabajan aquí, qué iniciativas usan esta solución...
   */
  const getNeighbours = async (type: string, id: string) => {
    const out: Record<string, any[]> = {};
    const def = NODE_TYPES[type];
    if (!def) return out;

    // 1. Relaciones vía tabla de unión
    for (const a of ADJACENCY[type] || []) {
      const targetDef = NODE_TYPES[a.targetType];
      if (!targetDef) continue;
      const rows = await db.execute(sql`
        SELECT ${sql.raw(nodeSelect(a.targetType))}, ${a.label} AS relation
        FROM ${sql.raw(a.via)} j
        JOIN ${sql.raw(targetDef.table)} n ON n.id = j.${sql.raw(a.otherCol)}
        WHERE j.${sql.raw(a.selfCol)} = ${id} AND n.archived_at IS NULL
      `);
      if (rows.rows.length) {
        (out[a.targetType] ||= []).push(...rows.rows);
      }
    }

    // 2. Relaciones por clave foránea directa (jerarquía)
    for (const d of DIRECT_EDGES) {
      if (d.child === type) {
        const parentDef = NODE_TYPES[d.parent];
        const rows = await db.execute(sql`
          SELECT ${sql.raw(nodeSelect(d.parent))}, ${d.parentLabel} AS relation
          FROM ${sql.raw(def.table)} c
          JOIN ${sql.raw(parentDef.table)} n ON n.id = c.${sql.raw(d.fk)}
          WHERE c.id = ${id} AND n.archived_at IS NULL
        `);
        if (rows.rows.length) (out[d.parent] ||= []).push(...rows.rows);
      }
      if (d.parent === type) {
        const childDef = NODE_TYPES[d.child];
        const rows = await db.execute(sql`
          SELECT ${sql.raw(nodeSelect(d.child))}, ${d.childLabel} AS relation
          FROM ${sql.raw(childDef.table)} n
          WHERE n.${sql.raw(d.fk)} = ${id} AND n.archived_at IS NULL
        `);
        if (rows.rows.length) (out[d.child] ||= []).push(...rows.rows);
      }
    }

    // 3. Publicaciones que referencian esta entidad. Cumple la regla "toda
    //    publicación debe aparecer automáticamente en todas las entidades
    //    relacionadas" sin que nadie tenga que enlazarlas a mano.
    const pubs = await db.execute(sql`
      SELECT p.id, p.uuid, COALESCE(p.title, left(p.body, 80)) AS label,
             p.created_at, p.author_user_id, 'menciona' AS relation
      FROM publication_links pl
      JOIN publications p ON p.id = pl.publication_id
      WHERE pl.entity_type = ${type} AND pl.entity_id = ${id}
        AND p.archived_at IS NULL AND p.status = 'publicada'
      ORDER BY p.created_at DESC
      LIMIT 50
    `);
    if (pubs.rows.length) out.publications = pubs.rows;

    // 4. Transacciones ligadas (09_STRIPE.md: toda transacción se relaciona
    //    con el grafo).
    const txs = await db.execute(sql`
      SELECT t.id, t.kind, t.status, t.amount_cents, t.currency, t.created_at, 'financia' AS relation
      FROM transaction_links tl
      JOIN transactions t ON t.id = tl.transaction_id
      WHERE tl.entity_type = ${type} AND tl.entity_id = ${id}
      ORDER BY t.created_at DESC LIMIT 50
    `);
    if (txs.rows.length) out.transactions = txs.rows;

    // Deduplicar por id dentro de cada tipo (una entidad puede estar unida por
    // más de un camino, p. ej. un producto ligado a un reto y a su solución).
    for (const k of Object.keys(out)) {
      const seen = new Set<string>();
      out[k] = out[k].filter((r: any) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
    }
    return out;
  };

  /**
   * GET /api/graph/:type/:id
   * Ficha completa de una entidad más todos sus vecinos del grafo.
   */
  app.get('/api/graph/:type/:id', async (req: Request, res: Response) => {
    try {
      const { type, id } = req.params;
      const def = NODE_TYPES[type];
      if (!def) return res.status(400).json({ error: `Tipo de entidad desconocido: ${type}` });

      const node = await db.execute(sql`
        SELECT * FROM ${sql.raw(def.table)} WHERE id = ${id} AND archived_at IS NULL
      `);
      if (!node.rows.length) return res.status(404).json({ error: 'No encontrado' });

      const neighbours = await getNeighbours(type, id);
      const counts = Object.fromEntries(Object.entries(neighbours).map(([k, v]) => [k, v.length]));

      res.json({
        type,
        entity: node.rows[0],
        neighbours,
        counts,
        totalRelations: Object.values(counts).reduce((a: number, b: any) => a + b, 0),
      });
    } catch (e: any) {
      console.error('graph error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/graph/:type/:id/neighbours?types=products,demands
   * Solo los vecinos, opcionalmente filtrados por tipo.
   */
  app.get('/api/graph/:type/:id/neighbours', async (req: Request, res: Response) => {
    try {
      const { type, id } = req.params;
      if (!NODE_TYPES[type]) return res.status(400).json({ error: `Tipo desconocido: ${type}` });
      const neighbours = await getNeighbours(type, id);
      const filter = (req.query.types as string)?.split(',').filter(Boolean);
      const result = filter
        ? Object.fromEntries(Object.entries(neighbours).filter(([k]) => filter.includes(k)))
        : neighbours;
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** Mapa del grafo: qué tipos existen y cómo se conectan. Útil para la IA. */
  app.get('/api/graph/schema', (_req: Request, res: Response) => {
    res.json({
      nodes: Object.keys(NODE_TYPES),
      edges: EDGES.map(([a, b, e]) => ({ from: a, to: b, label: e.label, via: e.via })),
      hierarchy: DIRECT_EDGES.map(d => ({ child: d.child, parent: d.parent, label: d.parentLabel })),
    });
  });

  /**
   * GET /api/search?q=...
   * Búsqueda global sobre todas las entidades del grafo
   * (06_SOCIAL_NETWORK.md: buscar personas, organizaciones, publicaciones,
   * retos, soluciones, productos, demandas, iniciativas).
   */
  // ══ CON FRENO DESDE 2026-08-23 ═══════════════════════════════════════════
  // Esta ruta pasó de llamarse al pulsar a llamarse al teclear, y por dentro
  // recorre 20 tablas con `ILIKE` sin pedir sesión. El freno está calibrado
  // para que escribir no lo toque nunca y para que un bucle deje de salir
  // gratis. Se avisa con `ritmo` y NO con `anotarFallo`: buscar no es fallar, y
  // meter búsquedas legítimas en el rastro de intentos fallidos enterraría lo
  // que ese rastro existe para enseñar.
  app.get('/api/search', guardian(db, REGLAS.buscar, () => null), async (req: Request, res: Response) => {
    void ritmo(db, REGLAS.buscar, ipDe(req));
    try {
      const q = String(req.query.q || '').trim();
      if (q.length < 2) return res.json({ query: q, results: [] });
      const limitPerType = Math.min(Number(req.query.limit) || 5, 20);
      const pattern = `%${q}%`;
      const results: any[] = [];

      // ══ BUSCAR POR PALABRAS, NO SOLO POR LA FRASE ENTERA ═════════════════
      // (2026-08-22, «buscador first»: el chat busca antes de gastar IA.)
      //
      // Con `ILIKE '%frase entera%'`, «agua en Madrid» no encuentra NADA: no
      // hay ningún título que contenga esas tres palabras seguidas en ese
      // orden. Y cero resultados, ahora que buscar es lo primero, es lo que
      // manda al usuario a gastar una llamada al modelo. Así que si la
      // búsqueda trae varias palabras, vale con que aparezca alguna de ellas
      // — y las que traigan más, salen antes.
      //
      // Las palabras de relleno («de», «en», «la»…) se caen: exigirlas o
      // premiarlas es ordenar por gramática en vez de por tema.
      const VACIAS = new Set([
        'los', 'las', 'del', 'una', 'unos', 'unas', 'con', 'por', 'para', 'sobre',
        'más', 'mas', 'este', 'esta', 'esto', 'ese', 'esa', 'sus', 'sin', 'entre',
        'desde', 'hasta', 'todo', 'toda', 'todos', 'todas',
        // LAS DE PREGUNTAR, TAMBIÉN. «¿Qué es el zumbido de las praderas?»
        // encontraba media plataforma porque «qué» está en un montón de
        // títulos: la palabra con la que se pregunta no es el tema por el que
        // se pregunta.
        'que', 'qué', 'cual', 'cuál', 'cuales', 'cuáles', 'como', 'cómo',
        'cuando', 'cuándo', 'donde', 'dónde', 'quien', 'quién', 'quienes',
        'son', 'ser', 'está', 'esta', 'están', 'hay', 'tiene', 'tienen', 'hacer']);
      const palabras = q.toLowerCase()
        .replace(/[^\wáéíóúñü\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !VACIAS.has(w))
        .slice(0, 8);

      // Una sola palabra no necesita nada de esto: la frase Y la palabra son
      // lo mismo, y la consulta se queda como estaba.
      const porPalabras = palabras.length > 1;
      const patrones = sql`ARRAY[${sql.join(palabras.map(w => sql`${'%' + w + '%'}`), sql.raw(', '))}]`;

      /** Cuántas de las palabras buscadas aparecen en este título. Es lo que
       *  convierte «alguna de ellas» en un orden con sentido. */
      const cuantasCoinciden = (col: any) =>
        sql.join(palabras.map(w => sql`(CASE WHEN ${col} ILIKE ${'%' + w + '%'} THEN 1 ELSE 0 END)`), sql.raw(' + '));

      // ══ Y EL MEJOR PRIMERO, DENTRO DEL LÍMITE ════════════════════════════
      // Sin `ORDER BY` esto devolvía las cinco filas que la base de datos
      // tuviera a mano, y el orden de una tabla no es ningún orden. El
      // problema no era solo estético: con `LIMIT 5` por tipo, **la
      // coincidencia exacta podía quedarse fuera** — buscar «Agua» y no ver el
      // reto que se llama «Agua», porque cinco títulos que la contienen
      // llegaron antes. Ordenar dentro de la consulta es lo único que arregla
      // eso; ordenar después, en el navegador, solo ordena lo que ya se salvó.
      //
      // El criterio, de mejor a peor: se llama exactamente así, empieza por
      // ello, contiene la frase entera, y luego cuántas palabras sueltas trae.
      // A igualdad, el título más corto, que es el más específico.
      //
      // `q` VA COMO PARÁMETRO, NUNCA PEGADO AL TEXTO DE LA CONSULTA. Lo que se
      // pega con `sql.raw` es solo el nombre de la columna, que sale de
      // NODE_TYPES —una constante de este fichero—, jamás lo que ha escrito
      // quien busca. Escapar comillas a mano en un buscador público es la
      // forma clásica de acabar teniendo una inyección.
      const orden = (label: string) => {
        const col = sql.raw(`n.${label}`);
        return sql`
          CASE
            WHEN lower(${col}) = lower(${q}) THEN 0
            WHEN lower(${col}) LIKE lower(${q}) || '%' THEN 1
            WHEN ${col} ILIKE ${pattern} THEN 2
            ELSE 3
          END,
          ${porPalabras ? sql`(${cuantasCoinciden(col)}) DESC,` : sql``}
          length(${col})
        `;
      };

      for (const [type, def] of Object.entries(NODE_TYPES)) {
        const col = sql.raw(`n.${def.label}`);
        const rows = await db.execute(sql`
          SELECT ${sql.raw(nodeSelect(type))}
          FROM ${sql.raw(def.table)} n
          WHERE n.archived_at IS NULL
            AND (${col} ILIKE ${pattern}${porPalabras ? sql` OR ${col} ILIKE ANY(${patrones})` : sql``})
          ORDER BY ${orden(def.label)}
          LIMIT ${limitPerType}
        `);
        for (const r of rows.rows) results.push({ ...r, type });
      }

      // Las publicaciones se buscan también por cuerpo, no solo por título.
      const pubs = await db.execute(sql`
        SELECT id, uuid, COALESCE(title, left(body, 80)) AS label, 'publications' AS type
        FROM publications
        WHERE archived_at IS NULL AND status = 'publicada'
          AND (title ILIKE ${pattern} OR body ILIKE ${pattern}${porPalabras
            ? sql` OR title ILIKE ANY(${patrones}) OR body ILIKE ANY(${patrones})`
            : sql``})
        -- Lo que lo lleva en el TÍTULO antes que lo que solo lo menciona en el
        -- cuerpo: una publicación que se llama como lo que buscas es casi
        -- siempre la que buscabas.
        ORDER BY
          (CASE WHEN title ILIKE ${pattern} THEN 0 ELSE 1 END),
          ${porPalabras ? sql`(${cuantasCoinciden(sql.raw('title'))}) DESC,` : sql``}
          length(COALESCE(title, body))
        LIMIT ${limitPerType}
      `);
      for (const r of pubs.rows) {
        if (!results.some(x => x.type === 'publications' && x.id === r.id)) results.push(r);
      }

      res.json({ query: q, count: results.length, results });
    } catch (e: any) {
      console.error('search error:', e);
      res.status(500).json({ error: e.message });
    }
  });
}

export { NODE_TYPES as GRAPH_NODE_TYPES };
