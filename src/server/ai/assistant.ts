import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { getProvider, listProviders, type AIMessage, type AIContentBlock , AI_MODELS, AI_PLATFORM_FEE } from './provider.js';
import { ROLE } from '../auth.js';

// ============================================================================
// Asistente IA universal — Fase 9
// ============================================================================
// Arquitectura en tres piezas deliberadamente separadas:
//
//   1. RECUPERACIÓN (RAG)  -> busca contexto real en el grafo y lo ordena.
//   2. MODELO              -> Claude redacta la respuesta y PROPONE acciones.
//   3. AGENTE DE ACCIONES  -> el backend valida permisos y ejecuta.
//
// El modelo NUNCA escribe en la base de datos. Devuelve intención y
// parámetros; las acciones quedan en `ai_proposed_actions` y solo se aplican
// tras validar el rol del usuario y, según el modo de edición elegido, tras
// su confirmación explícita.

const newId = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;

/** Modos de permiso de edición pedidos por el usuario. */
export const EDIT_MODES = {
  MANUAL: 'manual',     // la IA solo sugiere; no propone cambios aplicables
  ACCEPT: 'aceptar',    // propone y el usuario confirma cada cambio (Sí/No/Otro)
  AUTO: 'autonomo',     // aplica directamente lo que su rol le permita
} as const;

/** Acciones que el agente sabe ejecutar, con el nivel mínimo que exigen. */
const ACTION_CATALOG: Record<string, { minLevel: number; entity?: string; description: string }> = {
  CREATE_PUBLICATION: { minLevel: ROLE.USER,      entity: 'publications', description: 'Crear una publicación' },
  CREATE_CHALLENGE:   { minLevel: ROLE.VERIFIED,  entity: 'challenges',   description: 'Crear un reto' },
  CREATE_SOLUTION:    { minLevel: ROLE.VERIFIED,  entity: 'solutions',    description: 'Crear una solución' },
  CREATE_PRODUCT:     { minLevel: ROLE.VERIFIED,  entity: 'products',     description: 'Crear un producto' },
  CREATE_DEMAND:      { minLevel: ROLE.VERIFIED,  entity: 'demands',      description: 'Crear una demanda' },
  CREATE_NEED:        { minLevel: ROLE.VERIFIED,  entity: 'needs',        description: 'Crear una necesidad' },
  CREATE_CAUSE:       { minLevel: ROLE.VERIFIED,  entity: 'causes',       description: 'Añadir una causa a un reto' },
  UPDATE_INDICATOR:   { minLevel: ROLE.KNOWLEDGE, entity: 'indicators',   description: 'Actualizar un indicador' },
  UPDATE_MARKER:      { minLevel: ROLE.KNOWLEDGE, entity: 'markers',      description: 'Actualizar un marcador' },
  CREATE_OBJECTIVE:   { minLevel: ROLE.ADMIN,     entity: 'objectives',   description: 'Crear un objetivo' },
  CREATE_TERRITORY:   { minLevel: ROLE.ADMIN,     entity: 'territories',  description: 'Crear un territorio' },
  // Fase 11: la IA puede proponer un grafo nuevo cuando alguien busca un tema
  // que aún no existe — siempre en borrador y marcado is_ai_generated,
  // pendiente de revisión humana. Abierto a nivel 1 por decisión del usuario.
  CREATE_KNOWLEDGE_GRAPH: { minLevel: ROLE.USER,  entity: 'knowledge_graphs', description: 'Crear un grafo de conocimiento (borrador)' },
  // Fase 12: mapas de usuario — vistas del mapa publicadas a nombre de la
  // persona, indexadas e integradas con el conocimiento de la plataforma.
  CREATE_MAP: { minLevel: ROLE.USER, entity: 'user_maps', description: 'Crear un mapa público a nombre del usuario' },
};

/**
 * Límite de creación de grafos/mapas vía IA (petición del usuario, 2026-08-05):
 * nivel 1 (Usuario) hasta 5 grafos; nivel 2+ (Verificado) sin límite.
 */
export async function graphLimitReached(db: any, userId: string, roleLevel: number, table: 'knowledge_graphs' | 'user_maps'): Promise<string | null> {
  if (roleLevel >= ROLE.VERIFIED) return null;
  const r = await db.execute(sql`
    SELECT count(*)::int AS n FROM ${sql.raw(table)}
    WHERE creator_user_id = ${userId} AND archived_at IS NULL
  `);
  const n = (r.rows[0] as any).n;
  if (n >= 5) {
    const what = table === 'user_maps' ? 'mapas' : 'grafos de conocimiento';
    return `Has alcanzado el límite de 5 ${what} para el nivel Usuario. Verifica tu cuenta (nivel 2) para crear sin límite, o archiva alguno existente.`;
  }
  return null;
}

/** Eventos de navegación que la IA puede emitir para controlar la interfaz. */
const UI_EVENTS = [
  'OPEN_CHALLENGE', 'OPEN_SOLUTION', 'OPEN_PRODUCT', 'OPEN_DEMAND', 'OPEN_INITIATIVE',
  'OPEN_SUCCESS_CASE', 'OPEN_PUBLICATION', 'OPEN_TERRITORY', 'ZOOM_TO_TERRITORY',
  'FILTER_OBJECTIVE', 'SELECT_INDICATOR', 'SELECT_MARKER', 'SELECT_METRIC',
  'SHOW_MARKET', 'SHOW_FEED', 'SHOW_INITIATIVES',
  'OPEN_KNOWLEDGE_GRAPH', // params: { slug }
  'OPEN_USER_MAP',        // params: { slug }
];

export function registerAIRoutes(app: Express, db: any) {

  // ==========================================================================
  // 1. RECUPERACIÓN — contexto real desde el grafo
  // ==========================================================================
  /**
   * Busca en la plataforma el contexto relevante para una pregunta. Usa
   * búsqueda de texto completo en español sobre los fragmentos indexados y,
   * en paralelo, coincidencias directas por nombre en las entidades.
   * Todo lo que devuelve lleva su procedencia, para poder distinguir después
   * lo que viene de la plataforma de lo que venga de internet.
   */
  // Palabras funcionales frecuentes en preguntas, sin valor de búsqueda —
  // evita que "explícame"/"cuáles"/"está" compitan con los términos de
  // dominio reales ("nitratos", "reto", "Arroyo"...) a la hora de matchear.
  const STOPWORDS = new Set([
    'explicame', 'explícame', 'cuales', 'cuáles', 'donde', 'dónde', 'como', 'cómo',
    'esta', 'está', 'estan', 'están', 'para', 'sobre', 'este', 'esta', 'esos', 'esas',
    'dime', 'quiero', 'puedes', 'podrias', 'podrías', 'frases', 'palabras', 'aplicando',
    'siendo', 'entre', 'desde', 'hacia', 'todos', 'todas', 'algun', 'algún', 'alguna',
  ]);

  const extractKeywords = (question: string) =>
    question.toLowerCase()
      .replace(/[^\wáéíóúñü\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOPWORDS.has(w));

  const retrieveContext = async (question: string, limit = 12) => {
    const found: any[] = [];
    const words = extractKeywords(question);

    // Coincidencias directas por palabra clave (no por la frase completa:
    // "explícame el reto de nitratos" nunca sería substring de un título
    // corto como "Contaminación por nitratos del agua").
    //
    // `ANY(${array})` no funciona con el driver: interpola cada elemento como
    // un parámetro posicional suelto ($1,$2,$3...) en vez de como un array de
    // Postgres, y `ANY(($1,$2,$3))` es sintaxis de fila, no de array. Se
    // construye el array explícitamente con ARRAY[...] a partir de
    // parámetros individuales (sql.join), que sí es válido y mantiene cada
    // valor ligado de forma segura.
    if (words.length) {
      const patternArray = sql`ARRAY[${sql.join(words.map(w => sql`${'%' + w + '%'}`), sql.raw(', '))}]`;
      const direct = await db.execute(sql`
        SELECT 'challenges' AS entity_type, id, title AS label, description AS content FROM challenges
          WHERE archived_at IS NULL AND (title ILIKE ANY(${patternArray}) OR description ILIKE ANY(${patternArray}))
        UNION ALL
        SELECT 'solutions', id, title, description FROM solutions
          WHERE archived_at IS NULL AND (title ILIKE ANY(${patternArray}) OR description ILIKE ANY(${patternArray}))
        UNION ALL
        SELECT 'products', id, name, description FROM products
          WHERE archived_at IS NULL AND (name ILIKE ANY(${patternArray}) OR description ILIKE ANY(${patternArray}))
        UNION ALL
        SELECT 'initiatives', id, name, description FROM initiatives
          WHERE archived_at IS NULL AND (name ILIKE ANY(${patternArray}) OR description ILIKE ANY(${patternArray}))
        UNION ALL
        SELECT 'knowledge_graphs', id, title, description FROM knowledge_graphs
          WHERE archived_at IS NULL AND status = 'publicado'
            AND (title ILIKE ANY(${patternArray}) OR description ILIKE ANY(${patternArray}))
        LIMIT ${limit}
      `);
      for (const r of direct.rows as any[]) found.push({ ...r, source: 'plataforma' });
    }

    // Búsqueda por palabras sueltas sobre el índice de texto completo.
    if (words.length) {
      const tsQuery = words.slice(0, 6).join(' | ');
      const chunks = await db.execute(sql`
        SELECT entity_type, entity_id AS id, content,
               ts_rank(to_tsvector('spanish', content), to_tsquery('spanish', ${tsQuery})) AS rank
        FROM ai_knowledge_chunks
        WHERE to_tsvector('spanish', content) @@ to_tsquery('spanish', ${tsQuery})
        ORDER BY rank DESC LIMIT ${limit}
      `);
      for (const r of chunks.rows as any[]) found.push({ ...r, source: 'plataforma' });
    }

    // Deduplicar
    const seen = new Set<string>();
    return found.filter(f => {
      const k = `${f.entity_type}:${f.id}`;
      return seen.has(k) ? false : (seen.add(k), true);
    }).slice(0, limit);
  };

  /** Construye la instrucción de sistema con el contexto visual y el rol. */
  const buildSystemPrompt = (ctx: any, retrieved: any[], user: any, editMode: string, webSearch: boolean, graphs: any[] = []) => {
    const level = user?.roleLevel ?? 0;
    const allowed = Object.entries(ACTION_CATALOG)
      .filter(([, v]) => level >= v.minLevel)
      .map(([k]) => k);

    return `Eres el asistente de Humanity.wiki, una plataforma que conecta el conocimiento sobre los retos de la humanidad por territorio.

CADENA DE CONOCIMIENTO DE LA PLATAFORMA:
Territorio → Objetivo → Indicador → Marcador → Reto → Solución → Necesidad → Producto → Demanda → Transacción → Iniciativa → Resultados → Caso de éxito

ESTADO ACTUAL DE LA PANTALLA DEL USUARIO:
${JSON.stringify(ctx || {}, null, 2)}

USUARIO: ${user ? `${user.displayName || user.email} (nivel ${level}: ${user.roleLabel})` : 'visitante no registrado (solo consulta, no puede modificar nada)'}
MODO DE EDICIÓN: ${editMode}

CONTEXTO RECUPERADO DE LA PLATAFORMA (${retrieved.length} fragmentos):
${retrieved.map(r => `- [${r.entity_type}:${r.id}] ${r.label || ''} ${(r.content || '').slice(0, 300)}`).join('\n') || '(sin coincidencias en la plataforma)'}

GRAFOS DE CONOCIMIENTO PUBLICADOS (lienzos curados de un tema; si la consulta del usuario encaja con uno, emite el evento OPEN_KNOWLEDGE_GRAPH con su slug en vez de responder largo):
${graphs.map(g => `- slug: ${g.slug} — "${g.title}" (claves: ${(Array.isArray(g.trigger_keywords) ? g.trigger_keywords : []).join(', ')})`).join('\n') || '(todavía no hay grafos publicados)'}
Si el usuario pide CREAR un grafo (o explorar un tema del que NO existe grafo), propón la acción CREATE_KNOWLEDGE_GRAPH con title, slug, description, trigger_keywords y hasta 12 windows iniciales. Cada window: {title, kind, config, relation, relation_label}. kind SOLO puede ser: publicacion (config: {title, body}), imagen ({image_url, caption, source}), video ({youtube_id, channel}), wikipedia ({wiki_lang, wiki_page}), enlace ({url, title}), grafica ({chart: 'line'|'donut', series/segments...}), ficha ({rows: [{label, value}]}), texto ({body}). relation (la arista desde el centro): contexto | causa | dato | fuente | apoya | contradice | matiza, con relation_label como pregunta corta (p. ej. "¿qué está pasando?"). Investiga ANTES en internet si está activado y llena las ventanas con datos, cifras y fuentes REALES (nunca inventadas); el grafo nace en borrador para revisión humana. Es una de tus funciones principales: sé un auténtico creador de grafos.
Si el usuario pide crear un MAPA a su nombre (una vista pública del mapa de la humanidad), propón la acción CREATE_MAP con title, description y opcionalmente territorio (slug, p. ej. "espana"), nivel ("objetivo"|"indicador"|"marcador"|"metrica") e id (el id de esa entidad) — se publicará a su nombre y podrá abrirse con OPEN_USER_MAP {slug}. Límite: los usuarios de nivel 1 pueden tener hasta 5 grafos y 5 mapas; nivel 2+ sin límite.

REGLAS:
1. Responde SIEMPRE en español, de forma directa y sin adornos.
2. Distingue explícitamente lo que sale de la plataforma de lo que sepas por tu cuenta. Si un dato no está en el contexto recuperado, dilo.
3. NUNCA inventes cifras, indicadores ni entidades. Si no hay dato, di que no hay dato.
4. Puedes proponer navegación devolviendo eventos de interfaz.
5. Puedes proponer cambios en los datos SOLO mediante acciones. Tú no escribes en la base de datos: el servidor valida y ejecuta.
6. Acciones permitidas para el nivel de este usuario: ${allowed.length ? allowed.join(', ') : 'NINGUNA (solo consulta)'}.
${editMode === EDIT_MODES.MANUAL ? '7. El usuario está en modo MANUAL: puedes sugerir cambios en texto, pero NO devuelvas acciones.' : ''}
${webSearch
  ? '8. Tienes activada la búsqueda en internet: úsala SOLO para lo que el contexto de la plataforma no cubra (datos externos, actualidad, verificación). Prioriza siempre el contexto recuperado de la plataforma cuando exista.'
  : '8. La búsqueda en internet está desactivada para esta pregunta: responde solo con el contexto de la plataforma y tu conocimiento general, sin inventar que has buscado nada.'}

FORMATO DE RESPUESTA:
Responde en texto normal. Si quieres navegar o proponer cambios, añade AL FINAL un bloque JSON delimitado así:

\`\`\`redhumana
{
  "ui_events": [{"type": "ZOOM_TO_TERRITORY", "params": {"territoryId": "T003"}}],
  "actions": [{"type": "CREATE_PRODUCT", "params": {"name": "..."}, "rationale": "por qué"}],
  "question": {"text": "¿Qué enfoque prefieres para el grafo?", "options": ["Toda España", "Solo grandes ciudades"]}
}
\`\`\`

"question" es OPCIONAL: úsala solo cuando necesites una decisión del usuario para continuar bien (enfoque, territorio, alcance…). Máximo 4 opciones cortas y claras — la interfaz añade «Otro» automáticamente. No la uses para trivialidades: si puedes decidir con buen criterio, decide y actúa.
Eventos de interfaz válidos: ${UI_EVENTS.join(', ')}.`;
  };

  /** Extrae el bloque JSON de la respuesta del modelo. */
  const parseModelBlock = (text: string): { clean: string; ui_events: any[]; actions: any[]; question: any } => {
    // El cierre ``` puede faltar si la respuesta se truncó por max_tokens:
    // aun así el bloque se RETIRA del texto visible (nunca se enseña JSON
    // crudo al usuario) aunque sus acciones ya no se puedan recuperar.
    const m = text.match(/```redhumana\s*([\s\S]*?)(?:```|$)/);
    if (!m) return { clean: text.trim(), ui_events: [], actions: [], question: null };
    let parsed: any = {};
    try { parsed = JSON.parse(m[1]); } catch { /* bloque mal formado o truncado: se ignora */ }
    // Pregunta con opciones (estilo Claude Code): {text, options[]} — la
    // interfaz las pinta como botones y añade «Otro» por su cuenta.
    const q = parsed.question;
    const question = q && typeof q.text === 'string' && Array.isArray(q.options) && q.options.length >= 2
      ? { text: q.text, options: q.options.slice(0, 4).map((o: any) => String(o)) }
      : null;
    return {
      clean: text.replace(m[0], '').trim(),
      ui_events: Array.isArray(parsed.ui_events) ? parsed.ui_events.filter((e: any) => UI_EVENTS.includes(e?.type)) : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      question,
    };
  };

  // ==========================================================================
  // 2. CONVERSACIÓN
  // ==========================================================================
  app.get('/api/ai/status', (_req: Request, res: Response) => {
    const provider = (() => { try { return getProvider(); } catch { return null; } })();
    res.json({
      ready: !!provider?.isReady(),
      providers: listProviders(),
      // Mensaje explícito para que quede claro por qué no responde.
      message: provider?.isReady()
        ? 'Asistente activo.'
        : 'El asistente está construido pero inactivo: falta configurar ANTHROPIC_API_KEY en el archivo .env.',
      editModes: Object.values(EDIT_MODES),
      actionCatalog: ACTION_CATALOG,
      uiEvents: UI_EVENTS,
      models: AI_MODELS,
      platformFee: AI_PLATFORM_FEE,
    });
  });

  /** Consumo de IA del usuario: saldo pendiente y últimas llamadas. */
  app.get('/api/ai/usage', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const pending = await db.execute(sql`
        SELECT coalesce(sum(total_cents), 0)::float AS total, count(*)::int AS calls
        FROM ai_usage_charges WHERE user_id = ${req.user.id} AND settled_at IS NULL
      `);
      const recent = await db.execute(sql`
        SELECT kind, model, input_tokens, output_tokens, cost_cents, fee_cents, total_cents, settled_at, created_at
        FROM ai_usage_charges WHERE user_id = ${req.user.id}
        ORDER BY created_at DESC LIMIT 30
      `);
      res.json({
        pending_cents: (pending.rows[0] as any).total,
        pending_calls: (pending.rows[0] as any).calls,
        platform_fee: AI_PLATFORM_FEE,
        recent: recent.rows,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/ai/conversations', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.json([]);
      const rows = await db.execute(sql`
        SELECT c.*, (SELECT count(*)::int FROM ai_messages m WHERE m.conversation_id = c.id) AS message_count
        FROM ai_conversations c
        WHERE c.user_id = ${req.user.id} AND c.archived_at IS NULL
        ORDER BY c.updated_at DESC LIMIT 50
      `);
      res.json(rows.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/ai/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
      const rows = await db.execute(sql`
        SELECT * FROM ai_messages WHERE conversation_id = ${req.params.id} ORDER BY created_at ASC
      `);
      res.json(rows.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Tipos de adjunto admitidos en el chat y su límite de tamaño (Fase 9, multimodal). */
  const ATTACHMENT_LIMITS: Record<string, number> = {
    'image/jpeg': 5 * 1024 * 1024,
    'image/png': 5 * 1024 * 1024,
    'image/gif': 5 * 1024 * 1024,
    'image/webp': 5 * 1024 * 1024,
    'application/pdf': 15 * 1024 * 1024,
  };

  /**
   * POST /api/ai/chat
   * Cuerpo: { message, conversation_id?, context?, edit_mode?, search_web?, attachment? }
   * `attachment`, si lo hay: { name, media_type, data } con `data` en base64
   * sin el prefijo `data:...;base64,`.
   */
  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    try {
      const { message, context, edit_mode, search_web, attachment } = req.body || {};
      if (!message) return res.status(400).json({ error: 'Falta el mensaje.' });

      const provider = getProvider();
      if (!provider.isReady()) {
        return res.status(503).json({
          error: 'El asistente está construido pero inactivo: falta ANTHROPIC_API_KEY en .env.',
          ready: false,
        });
      }

      // El adjunto se valida aquí (tipo y tamaño) y se convierte al bloque
      // multimodal que espera la API de Claude — nunca se guarda el binario
      // en la base de datos, solo se usa para esta llamada al modelo.
      let attachmentBlock: AIContentBlock | null = null;
      if (attachment?.data && attachment?.media_type) {
        const maxBytes = ATTACHMENT_LIMITS[attachment.media_type];
        if (!maxBytes) {
          return res.status(400).json({ error: 'Tipo de archivo no admitido. Solo imágenes (JPG, PNG, GIF, WEBP) o PDF.' });
        }
        const rawBytes = (String(attachment.data).length * 3) / 4;
        if (rawBytes > maxBytes) {
          return res.status(400).json({ error: `El archivo pesa demasiado (máximo ${Math.round(maxBytes / (1024 * 1024))} MB).` });
        }
        attachmentBlock = attachment.media_type === 'application/pdf'
          ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: attachment.data } }
          : { type: 'image', source: { type: 'base64', media_type: attachment.media_type, data: attachment.data } };
      }

      const editMode = Object.values(EDIT_MODES).includes(edit_mode) ? edit_mode : EDIT_MODES.MANUAL;

      // Conversación (se crea si no existe)
      let conversationId = req.body.conversation_id as string | undefined;
      if (!conversationId) {
        conversationId = newId('CONV');
        await db.execute(sql`
          INSERT INTO ai_conversations (id, user_id, title, edit_mode)
          VALUES (${conversationId}, ${req.user?.id || null}, ${String(message).slice(0, 80)}, ${editMode})
        `);
      }

      const storedContent = attachment?.name ? `${message}\n\n[Adjunto: ${attachment.name}]` : message;
      await db.execute(sql`
        INSERT INTO ai_messages (conversation_id, role, content) VALUES (${conversationId}, 'user', ${storedContent})
      `);

      // RAG
      const retrieved = await retrieveContext(String(message));

      // Historial reciente
      const history = await db.execute(sql`
        SELECT role, content FROM ai_messages
        WHERE conversation_id = ${conversationId} ORDER BY created_at DESC LIMIT 12
      `);
      const messages: AIMessage[] = (history.rows as any[])
        .reverse()
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      // El adjunto solo viaja en ESTE turno — no se vuelve a mandar en
      // preguntas posteriores de la misma conversación (el binario nunca se
      // guardó, así que tampoco podría).
      if (attachmentBlock && messages.length) {
        messages[messages.length - 1] = {
          role: 'user',
          content: [attachmentBlock, { type: 'text', text: String(message) }],
        };
      }

      // Los grafos publicados van SIEMPRE en el prompt (son pocos y cortos):
      // así el modelo puede enrutar "Ceuta frontera amenaza" → OPEN_KNOWLEDGE_GRAPH
      // aunque las palabras no coincidan literalmente con las claves.
      const publishedGraphs = await db.execute(sql`
        SELECT slug, title, trigger_keywords FROM knowledge_graphs
        WHERE archived_at IS NULL AND status = 'publicado'
        ORDER BY views DESC LIMIT 40
      `);

      const system = buildSystemPrompt(context, retrieved, req.user, editMode, !!search_web, publishedGraphs.rows as any[]);
      // Modelo elegido por el usuario (validado contra el catálogo).
      const chosenModel = typeof req.body?.model === 'string' && AI_MODELS[req.body.model] ? req.body.model : undefined;
      const result = await provider.complete({ system, messages, webSearch: !!search_web, model: chosenModel });
      const { clean, ui_events, actions, question } = parseModelBlock(result.text);

      // Las acciones se GUARDAN como propuestas. Nunca se ejecutan aquí.
      const proposed: any[] = [];
      if (editMode !== EDIT_MODES.MANUAL) {
        for (const a of actions) {
          const spec = ACTION_CATALOG[a?.type];
          if (!spec) continue;
          const level = req.user?.roleLevel ?? 0;
          const allowed = level >= spec.minLevel;
          const insert = await db.execute(sql`
            INSERT INTO ai_proposed_actions (conversation_id, user_id, action_type, entity_type, params, rationale, status)
            VALUES (${conversationId}, ${req.user?.id || null}, ${a.type}, ${spec.entity || null},
                    ${JSON.stringify(a.params || {})}::jsonb, ${a.rationale || null},
                    ${allowed ? 'propuesta' : 'rechazada'})
            RETURNING id, action_type, entity_type, params, rationale, status
          `);
          proposed.push({
            ...insert.rows[0],
            allowed,
            requiredLevel: spec.minLevel,
            description: spec.description,
            // En modo autónomo se aplicará; en modo aceptar, espera confirmación.
            autoApply: allowed && editMode === EDIT_MODES.AUTO,
          });
        }
      }

      const sources = [
        ...retrieved.map(r => ({ type: r.entity_type, id: r.id, origin: 'plataforma' })),
        // Solo aparecen aquí las páginas que el modelo realmente citó al usar
        // la herramienta de búsqueda — si activó `search_web` pero no hizo
        // falta buscar nada, no se añade ninguna (a diferencia del aviso fijo
        // anterior, que se mostraba siempre aunque no se hubiese buscado).
        ...result.webSources.map(w => ({ type: 'web', id: w.url, url: w.url, title: w.title, origin: 'internet' })),
      ];

      await db.execute(sql`
        INSERT INTO ai_messages (conversation_id, role, content, sources, entities_used, actions,
                                 model, input_tokens, output_tokens, cost_cents, duration_ms)
        VALUES (${conversationId}, 'assistant', ${clean},
                ${JSON.stringify(sources)}::jsonb,
                ${JSON.stringify(retrieved.map(r => `${r.entity_type}:${r.id}`))}::jsonb,
                ${JSON.stringify(proposed)}::jsonb,
                ${result.model}, ${result.inputTokens}, ${result.outputTokens},
                ${result.costCents}, ${result.durationMs})
      `);
      await db.execute(sql`UPDATE ai_conversations SET updated_at = now() WHERE id = ${conversationId}`);

      // Si no encontró nada en la plataforma, se registra como vacío de
      // conocimiento para el panel del administrador.
      if (retrieved.length === 0) {
        await db.execute(sql`
          INSERT INTO ai_knowledge_gaps (question) VALUES (${String(message).slice(0, 500)})
        `);
      }

      res.json({
        conversation_id: conversationId,
        reply: clean,
        ui_events,
        proposed_actions: proposed,
        question,
        sources,
        usage: {
          model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens,
          costCents: result.costCents, durationMs: result.durationMs,
          feeCents: result.costCents * AI_PLATFORM_FEE,
          totalCents: result.costCents * (1 + AI_PLATFORM_FEE),
        },
      });

      // Libro de consumo: coste de créditos + 50% de comisión, a nombre del
      // usuario (fire-and-forget; nunca bloquea la respuesta).
      if (req.user) {
        db.execute(sql`
          INSERT INTO ai_usage_charges (user_id, kind, model, input_tokens, output_tokens, cost_cents, fee_cents, total_cents, conversation_id)
          VALUES (${req.user.id}, 'chat', ${result.model}, ${result.inputTokens}, ${result.outputTokens},
                  ${result.costCents}, ${result.costCents * AI_PLATFORM_FEE}, ${result.costCents * (1 + AI_PLATFORM_FEE)},
                  ${conversationId})
        `).catch((e: any) => console.error('ai charge error:', e));
      }
    } catch (e: any) {
      console.error('ai chat error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // 3. AGENTE DE ACCIONES — el único que puede tocar los datos
  // ==========================================================================
  /**
   * POST /api/ai/actions/:id/decide  { decision: 'aceptar' | 'rechazar' }
   * Es el "Sí / No / Otro" del encargo. La ejecución revalida SIEMPRE el
   * permiso en el momento de aplicar, no solo cuando se propuso.
   */
  app.post('/api/ai/actions/:id/decide', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const { decision, params_override } = req.body || {};

      const row = await db.execute(sql`SELECT * FROM ai_proposed_actions WHERE id = ${Number(req.params.id)}`);
      const action = row.rows[0] as any;
      if (!action) return res.status(404).json({ error: 'Acción no encontrada.' });
      if (action.status !== 'propuesta') {
        return res.status(409).json({ error: `Esta acción ya está ${action.status}.` });
      }
      if (action.user_id && action.user_id !== req.user.id && req.user.roleLevel < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Esta acción pertenece a otra conversación.' });
      }

      if (decision !== 'aceptar') {
        await db.execute(sql`
          UPDATE ai_proposed_actions SET status = 'rechazada', decided_by = ${req.user.id}, decided_at = now()
          WHERE id = ${action.id}
        `);
        return res.json({ status: 'rechazada' });
      }

      const spec = ACTION_CATALOG[action.action_type];
      if (!spec) return res.status(400).json({ error: `Acción desconocida: ${action.action_type}` });
      // Revalidación del permiso en el momento de ejecutar.
      if (req.user.roleLevel < spec.minLevel) {
        await db.execute(sql`
          UPDATE ai_proposed_actions SET status = 'rechazada', decided_by = ${req.user.id}, decided_at = now(),
            result = ${JSON.stringify({ error: 'permiso insuficiente' })}::jsonb
          WHERE id = ${action.id}
        `);
        return res.status(403).json({ error: `Esta acción requiere nivel ${spec.minLevel}. Tu nivel es ${req.user.roleLevel}.` });
      }

      const params = { ...(action.params || {}), ...(params_override || {}) };
      const result = await executeAction(action.action_type, params, req.user.id, req.user.roleLevel ?? 0);

      await db.execute(sql`
        UPDATE ai_proposed_actions
        SET status = ${result.ok ? 'ejecutada' : 'fallida'}, decided_by = ${req.user.id}, decided_at = now(),
            entity_id = ${result.entityId || null}, result = ${JSON.stringify(result)}::jsonb
        WHERE id = ${action.id}
      `);
      res.json({ status: result.ok ? 'ejecutada' : 'fallida', ...result });
    } catch (e: any) {
      console.error('decide action error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** Ejecuta una acción validada. Único punto donde la IA acaba escribiendo. */
  const executeAction = async (type: string, params: any, actorId: string, actorLevel: number = 0): Promise<any> => {
    try {
      switch (type) {
        case 'CREATE_PUBLICATION': {
          const id = newId('PUB');
          await db.execute(sql`
            INSERT INTO publications (id, author_user_id, title, body, created_by, updated_by)
            VALUES (${id}, ${actorId}, ${params.title || null}, ${params.body || ''}, ${actorId}, ${actorId})
          `);
          for (const [t, ids] of Object.entries(params.entity_links || {})) {
            for (const eid of (ids as string[])) {
              await db.execute(sql`
                INSERT INTO publication_links (publication_id, entity_type, entity_id) VALUES (${id}, ${t}, ${eid})
                ON CONFLICT DO NOTHING
              `);
            }
          }
          return { ok: true, entityId: id, entityType: 'publications' };
        }
        case 'CREATE_KNOWLEDGE_GRAPH': {
          // Siempre nace en borrador y marcado como generado por IA: un humano
          // tiene que revisarlo y publicarlo. Las ventanas iniciales (si el
          // modelo las propone) se crean con la misma marca.
          // Límite: nivel 1 → 5 grafos; nivel 2+ sin límite.
          const limitMsg = await graphLimitReached(db, actorId, actorLevel, 'knowledge_graphs');
          if (limitMsg) return { ok: false, error: limitMsg };
          const id = newId('KG');
          let slug = String(params.slug || params.title || id).toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          // El slug es UNIQUE (incluye grafos archivados): si ya existe, se
          // le a\u00f1ade un sufijo en vez de tumbar toda la creaci\u00f3n.
          const clash = await db.execute(sql`SELECT 1 FROM knowledge_graphs WHERE slug = ${slug} LIMIT 1`);
          if ((clash.rows as any[]).length) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
          await db.execute(sql`
            INSERT INTO knowledge_graphs (id, title, slug, description, creator_user_id, trigger_keywords,
                                          status, is_ai_generated, created_by, updated_by)
            VALUES (${id}, ${params.title}, ${slug}, ${params.description || null}, ${actorId},
                    ${JSON.stringify(params.trigger_keywords || [])}::jsonb,
                    'borrador', true, ${actorId}, ${actorId})
          `);
          // Los `kind` que proponga el modelo se sanean contra el CHECK de la
          // tabla (un kind inventado tumbaba TODA la creación del grafo); una
          // ventana defectuosa se salta sin arrastrar a las demás.
          const VALID_KINDS = new Set(['publicacion', 'imagen', 'video', 'wikipedia', 'enlace', 'mapa',
            'grafica', 'ficha', 'cronologia', 'autores', 'documento', 'grafo', 'producto', 'soluciones', 'texto']);
          const VALID_RELATIONS = new Set(['contexto', 'causa', 'dato', 'fuente', 'apoya', 'contradice', 'matiza']);
          let i = 0;
          for (const w of (params.windows || []).slice(0, 12)) {
            if (!w?.title) continue;
            try {
              const wid = newId('KW');
              const kind = VALID_KINDS.has(w.kind) ? w.kind : 'ficha';
              await db.execute(sql`
                INSERT INTO knowledge_windows (id, title, kind, config, creator_user_id, is_ai_generated, created_by, updated_by)
                VALUES (${wid}, ${w.title}, ${kind}, ${JSON.stringify(w.config || {})}::jsonb,
                        ${actorId}, true, ${actorId}, ${actorId})
              `);
              const angle = (i / Math.max((params.windows || []).length, 1)) * 2 * Math.PI;
              await db.execute(sql`
                INSERT INTO graph_windows (graph_id, window_id, x, y)
                VALUES (${id}, ${wid}, ${Math.round(Math.cos(angle) * 620)}, ${Math.round(Math.sin(angle) * 450)})
              `);
              const relation = VALID_RELATIONS.has(w.relation) ? w.relation : 'contexto';
              await db.execute(sql`
                INSERT INTO graph_edges (graph_id, from_window_id, to_window_id, relation, label)
                VALUES (${id}, NULL, ${wid}, ${relation}, ${w.relation_label || null})
              `);
              i++;
            } catch (we) {
              console.error('CREATE_KNOWLEDGE_GRAPH: ventana saltada:', (we as any)?.message);
            }
          }
          return { ok: true, entityId: id, entityType: 'knowledge_graphs', slug, status: 'borrador', windows: i };
        }
        case 'CREATE_MAP': {
          // Mapa público a nombre del usuario: una vista del mapa de la
          // humanidad (territorio + nivel + objetivo) con título, indexada.
          const limitMsg = await graphLimitReached(db, actorId, actorLevel, 'user_maps');
          if (limitMsg) return { ok: false, error: limitMsg };
          const id = newId('UM');
          const slug = String(params.slug || params.title || id).toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          // Config alineada con los parámetros reales de la URL del mapa
          // interactivo (Map.tsx): territorio (slug), nivel + id (el nivel
          // del explorador: objetivo/indicador/marcador/metrica + su id).
          const config = {
            territorio: params.territorio || params.territory_slug || null,
            nivel: params.nivel || params.level || null,
            id: params.id || params.entity_id || params.objective_id || null,
          };
          await db.execute(sql`
            INSERT INTO user_maps (id, title, slug, description, creator_user_id, config, trigger_keywords, status, is_ai_generated, created_by, updated_by)
            VALUES (${id}, ${params.title}, ${slug}, ${params.description || null}, ${actorId},
                    ${JSON.stringify(config)}::jsonb, ${JSON.stringify(params.trigger_keywords || [])}::jsonb,
                    'publicado', false, ${actorId}, ${actorId})
          `);
          return { ok: true, entityId: id, entityType: 'user_maps', slug, status: 'publicado' };
        }
        case 'CREATE_CHALLENGE': {
          const id = params.id || newId('R');
          await db.execute(sql`
            INSERT INTO challenges (id, title, scope, description, priority, created_by, updated_by)
            VALUES (${id}, ${params.title}, ${params.scope || 'regional'}, ${params.description || null},
                    ${params.priority || 'medium'}, ${actorId}, ${actorId})
            ON CONFLICT (id) DO NOTHING
          `);
          for (const tid of params.territory_ids || []) {
            await db.execute(sql`INSERT INTO challenge_territories (challenge_id, territory_id) VALUES (${id}, ${tid}) ON CONFLICT DO NOTHING`);
          }
          for (const oid of params.objective_ids || []) {
            await db.execute(sql`INSERT INTO challenge_objectives (challenge_id, objective_id) VALUES (${id}, ${oid}) ON CONFLICT DO NOTHING`);
          }
          return { ok: true, entityId: id, entityType: 'challenges' };
        }
        case 'CREATE_SOLUTION': {
          const id = params.id || newId('S');
          await db.execute(sql`
            INSERT INTO solutions (id, title, type, description, impact, cost, readiness, created_by, updated_by)
            VALUES (${id}, ${params.title}, ${params.type || null}, ${params.description || null},
                    ${params.impact || null}, ${params.cost || null}, ${params.readiness || null}, ${actorId}, ${actorId})
            ON CONFLICT (id) DO NOTHING
          `);
          for (const cid of params.challenge_ids || []) {
            await db.execute(sql`INSERT INTO challenge_solutions (challenge_id, solution_id) VALUES (${cid}, ${id}) ON CONFLICT DO NOTHING`);
          }
          return { ok: true, entityId: id, entityType: 'solutions' };
        }
        case 'CREATE_PRODUCT': {
          const id = params.id || newId('PRD');
          await db.execute(sql`
            INSERT INTO products (id, name, description, category, price_cents, currency, kind, modality, created_by, updated_by)
            VALUES (${id}, ${params.name}, ${params.description || null}, ${params.category || null},
                    ${params.price_cents ?? null}, ${params.currency || 'EUR'}, ${params.kind || 'fisico'},
                    ${params.modality || 'unico'}, ${actorId}, ${actorId})
            ON CONFLICT (id) DO NOTHING
          `);
          return { ok: true, entityId: id, entityType: 'products' };
        }
        case 'CREATE_DEMAND': {
          const id = params.id || newId('DEM');
          await db.execute(sql`
            INSERT INTO demands (id, title, description, budget_cents, urgency, status, created_by, updated_by)
            VALUES (${id}, ${params.title}, ${params.description || null}, ${params.budget_cents ?? null},
                    ${params.urgency || null}, 'abierta', ${actorId}, ${actorId})
            ON CONFLICT (id) DO NOTHING
          `);
          return { ok: true, entityId: id, entityType: 'demands' };
        }
        case 'CREATE_NEED': {
          const id = params.id || newId('NEC');
          await db.execute(sql`
            INSERT INTO needs (id, title, description, kind, urgency, status, created_by, updated_by)
            VALUES (${id}, ${params.title}, ${params.description || null}, ${params.kind || null},
                    ${params.urgency || null}, 'abierta', ${actorId}, ${actorId})
            ON CONFLICT (id) DO NOTHING
          `);
          return { ok: true, entityId: id, entityType: 'needs' };
        }
        case 'CREATE_CAUSE': {
          const id = params.id || newId('C');
          await db.execute(sql`
            INSERT INTO causes (id, title, type, description, created_by, updated_by)
            VALUES (${id}, ${params.title}, ${params.type || null}, ${params.description || null}, ${actorId}, ${actorId})
            ON CONFLICT (id) DO NOTHING
          `);
          if (params.challenge_id) {
            await db.execute(sql`
              INSERT INTO challenge_causes (challenge_id, cause_id, percentage)
              VALUES (${params.challenge_id}, ${id}, ${params.percentage ?? null})
              ON CONFLICT (challenge_id, cause_id) DO UPDATE SET percentage = EXCLUDED.percentage
            `);
          }
          return { ok: true, entityId: id, entityType: 'causes' };
        }
        default:
          return { ok: false, error: `Acción no implementada: ${type}` };
      }
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  };

  // ==========================================================================
  // 4. PANEL DE ADMINISTRACIÓN DE LA IA
  // ==========================================================================
  app.get('/api/ai/admin/stats', async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.roleLevel < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      }
      const [convs, msgs, cost, gaps, actions, topEntities] = await Promise.all([
        db.execute(sql`SELECT count(*)::int AS n FROM ai_conversations`),
        db.execute(sql`SELECT count(*)::int AS n FROM ai_messages`),
        db.execute(sql`
          SELECT COALESCE(sum(cost_cents), 0) AS total,
                 COALESCE(sum(cost_cents) FILTER (WHERE created_at > now() - interval '1 day'), 0) AS today,
                 COALESCE(sum(cost_cents) FILTER (WHERE created_at > now() - interval '30 days'), 0) AS month,
                 COALESCE(sum(input_tokens), 0)::int AS input_tokens,
                 COALESCE(sum(output_tokens), 0)::int AS output_tokens
          FROM ai_messages
        `),
        db.execute(sql`SELECT question, occurrences, last_seen_at FROM ai_knowledge_gaps WHERE status = 'abierto' ORDER BY occurrences DESC, last_seen_at DESC LIMIT 20`),
        db.execute(sql`SELECT status, count(*)::int AS n FROM ai_proposed_actions GROUP BY status`),
        db.execute(sql`
          SELECT e AS entity, count(*)::int AS n
          FROM ai_messages, jsonb_array_elements_text(entities_used) AS e
          GROUP BY e ORDER BY n DESC LIMIT 15
        `),
      ]);
      res.json({
        conversations: convs.rows[0].n,
        messages: msgs.rows[0].n,
        cost: cost.rows[0],
        knowledgeGaps: gaps.rows,
        actionsByStatus: actions.rows,
        mostConsultedEntities: topEntities.rows,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * Reindexa la base de conocimiento para el RAG a partir del grafo.
   * Se ejecuta a demanda; cuando haya embeddings, este es el punto donde se
   * calcularán.
   */
  app.post('/api/ai/admin/reindex', async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.roleLevel < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      }
      await db.execute(sql`DELETE FROM ai_knowledge_chunks`);
      const sources: Array<[string, string, string, string]> = [
        ['challenges', 'challenges', 'title', 'description'],
        ['solutions', 'solutions', 'title', 'description'],
        ['products', 'products', 'name', 'description'],
        ['demands', 'demands', 'title', 'description'],
        ['needs', 'needs', 'title', 'description'],
        ['initiatives', 'initiatives', 'name', 'description'],
        ['success_cases', 'success_cases', 'title', 'impact'],
        ['causes', 'causes', 'title', 'description'],
        ['indicators', 'indicators', 'name', 'methodology'],
        ['markers', 'markers', 'name', 'description'],
        ['objectives', 'objectives', 'title', 'description'],
        ['territories', 'territories', 'name', 'description'],
        ['knowledge_graphs', 'knowledge_graphs', 'title', 'description'],
        ['knowledge_windows', 'knowledge_windows', 'title', 'kind'],
      ];
      let total = 0;
      for (const [type, table, labelCol, bodyCol] of sources) {
        const r = await db.execute(sql`
          INSERT INTO ai_knowledge_chunks (entity_type, entity_id, content)
          SELECT ${type}, id, concat_ws('. ', ${sql.raw(labelCol)}, ${sql.raw(bodyCol)})
          FROM ${sql.raw(table)} WHERE archived_at IS NULL
          RETURNING id
        `);
        total += r.rows.length;
      }
      // Las publicaciones también son conocimiento.
      const p = await db.execute(sql`
        INSERT INTO ai_knowledge_chunks (entity_type, entity_id, content)
        SELECT 'publications', id, concat_ws('. ', title, body)
        FROM publications WHERE archived_at IS NULL AND status = 'publicada'
        RETURNING id
      `);
      total += p.rows.length;
      res.json({ success: true, indexed: total });
    } catch (e: any) {
      console.error('reindex error:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
