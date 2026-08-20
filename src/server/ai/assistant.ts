import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import {
  getProvider, listProviders, providerOfModel, generarImagenNanoBanana, NANO_BANANA_CATALOG_MODEL,
  type AIMessage, type AIContentBlock, AI_MODELS, AI_PLATFORM_FEE,
  elegirModelo, topePremiumCents, NIVEL_PREMIUM,
} from './provider.js';
import { ROLE } from '../auth.js';
import { GRUPOS, ESTADOS, PRIORIDADES } from '../roadmap.js';
import { autoOrganizarCarpetas } from '../knowledge.js';
import { guardarArchivo } from '../uploads.js';

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
  // 2026-08-20: la IA no sabía hacer las cosas de la propia plataforma —
  // Eugenio le pidió «añade una tarea al proyecto Humanity.wiki» y no había
  // ninguna acción para eso. Estas tres son las que se usan a diario.
  CREATE_TAREA:    { minLevel: ROLE.USER, entity: 'roadmap_items', description: 'Crear una tarea en un proyecto' },
  UPDATE_TAREA:    { minLevel: ROLE.USER, entity: 'roadmap_items', description: 'Cambiar una tarea (estado, título, responsable)' },
  CREATE_PROYECTO: { minLevel: ROLE.USER, entity: 'proyectos',     description: 'Crear un proyecto' },
  CREATE_PAGINA:   { minLevel: ROLE.USER, entity: 'knowledge_windows', description: 'Crear una página' },
  // 2026-08-08: "ordename las publicaciones por carpetas" — sin parámetros,
  // el servidor lee todo lo que ha publicado quien pregunta y las agrupa.
  ORGANIZAR_CARPETAS: { minLevel: ROLE.USER, entity: 'carpetas', description: 'Organizar tus publicaciones en carpetas temáticas' },
  // 2026-08-20, fase 3 del calendario: «apúntame una reunión el jueves a las
  // 10». Nivel 1 como todo lo que es TUYO y solo tuyo — un evento en tu
  // calendario no toca el conocimiento común de nadie.
  CREATE_EVENTO: { minLevel: ROLE.USER, entity: 'eventos', description: 'Apuntar un evento en tu calendario' },
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
  /**
   * Construye el prompt de sistema EN DOS PARTES (2026-08-20, caché de
   * prompts; decisión de Eugenio: «caché → medición → contexto dinámico →
   * routing → RAG», empezando por la caché).
   *
   *   · `estable`: idéntica byte a byte en TODAS las llamadas de TODOS los
   *     usuarios. Es lo que Anthropic guarda en caché: la primera llamada la
   *     escribe (25% más cara) y las siguientes la releen al 10% del precio.
   *     Al ser común a todo el mundo, la caché se comparte entre usuarios.
   *   · `variable`: la fecha, la pantalla, el usuario, el contexto recuperado
   *     — todo lo que cambia entre mensajes. Va DESPUÉS, fuera de la caché.
   *
   * LA REGLA: nada interpolado en `estable` que cambie entre llamadas. Una
   * fecha ahí dentro y la caché no acierta nunca — y encima se paga el 25%
   * extra de escritura en cada mensaje, o sea, más caro que no tener caché.
   */
  const buildSystemPrompt = (ctx: any, retrieved: any[], user: any, editMode: string, webSearch: boolean, graphs: any[] = []): { estable: string; variable: string } => {
    const level = user?.roleLevel ?? 0;
    const allowed = Object.entries(ACTION_CATALOG)
      .filter(([, v]) => level >= v.minLevel)
      .map(([k]) => k);

    // --- JUEGO VITAL: dentro del juego NO eres el asistente de la
    // plataforma, eres quien vive en ese mundo. Sin este bloque el modelo
    // respondía a «hazme la entrevista fundacional» con una entrevista sobre
    // territorios y retos (fallo real reportado por el usuario, 2026-08-18).
    const juego = ctx?.juego;
    if (juego) {
      const agente = juego.agente;
      const memoria: string[] = (agente?.memoria || []).map((m: any) => `- ${m.texto}`);

      const quienEres = agente
        ? `Eres «${agente.nombre}»${agente.rol ? `, ${agente.rol}` : ''}, ${agente.tipo === 'persona'
            ? 'un habitante del mundo de este jugador'
            : 'el espíritu del proyecto que lleva ese nombre'}, dentro del Juego Vital.
${agente.descripcion ? `Sobre ti: ${agente.descripcion}` : ''}

LO QUE SABES (te lo ha ido contando el jugador; es TODO lo que recuerdas de tu historia):
${memoria.length ? memoria.join('\n') : '(todavía no te ha contado nada: pregúntale, con curiosidad y sin agobiar)'}
${agente.tipo === 'persona' ? `
IMPORTANTE — no eres esa persona real: eres una representación que el jugador ha creado para pensar con ella. Si te preguntan por hechos de su vida que no están arriba, dilo con naturalidad ("eso no me lo has contado todavía") en vez de inventarlo. Nunca hables como si tuvieras acceso a lo que la persona real piensa o hace fuera de aquí.` : `
Hablas del proyecto en primera persona ("voy despacio", "me falta..."), con la información real de sus tareas cuando la tengas en el contexto.`}

Habla en primera persona, breve y cercano, como un personaje de videojuego: 2-4 frases y una pregunta o propuesta concreta al final. Nada de listas largas ni de tono de informe.`
        : `Eres el ROBOT PERSONAL del jugador dentro del Juego Vital: su compañero, como el Pikachu de Pokémon pero con forma de robot humanoide. Hablas en primera persona, breve y cercano (2-5 frases), con una propuesta concreta al final. Nada de tono de informe.`;

      // El prompt del JUEGO no se parte: la identidad del personaje (nombre,
      // memoria, mundo) está entretejida de principio a fin, así que no hay
      // ningún prefijo idéntico entre usuarios que merezca la caché.
      return { estable: '', variable: `${quienEres}

QUÉ ES EL JUEGO VITAL:
El mundo 3D que el jugador recorre ES su vida real. Cada edificio es un proyecto real suyo, cada persona es alguien real de su vida, y todo lo que se crea aquí existe de verdad en la plataforma (no hay contenido de mentira). El jugador construye su mundo como en Los Sims: se planta donde quiere y crea allí una persona o un proyecto.

MUNDO ACTUAL DEL JUGADOR:
${JSON.stringify({ ...juego, agente: undefined }, null, 2)}
${juego.dentro ? `
DÓNDE ESTÁ AHORA MISMO — IMPORTANTE:
El jugador NO está en la aldea: está DENTRO del edificio del proyecto «${juego.dentro.proyecto.titulo}».
Ese edificio tiene una sala central y una HABITACIÓN por cada grupo de su tablero: ${juego.dentro.habitaciones.map((h: any) => h.label).join(', ')}.
${juego.dentro.sala_actual
    ? `Está dentro de la habitación «${juego.dentro.sala_actual.label}». Cuando diga «esta sala», «esta habitación» o «aquí», se refiere a ESA: el grupo «${juego.dentro.sala_actual.id}» del proyecto «${juego.dentro.proyecto.titulo}». No preguntes cuál es: ya lo sabes.`
    : 'Está en la sala central del edificio, desde la que se ve el avance del proyecto y se entra a las habitaciones.'}
Una habitación es una carpeta: lo que hay dentro flotando son las tarjetas de ese grupo del tablero, con sus notas y sus fotos.` : ''}

USUARIO: ${user ? `${user.displayName || user.email} (nivel ${level}: ${user.roleLabel})` : 'visitante'}

LA ENTREVISTA FUNDACIONAL:
Si el jugador la pide (o si su mundo está casi vacío y viene a hablar contigo), condúcela TÚ. Sirve para llenar el mapa con su vida real, y va de ÉL, no de la plataforma. Una sola pregunta por mensaje, conversacional, sin cuestionarios largos:
1. Las áreas fundamentales de su vida hoy (salud, hogar y familia, proyectos, trabajo, dinero, aprendizaje, comunidad, espíritu…). Que las nombre él, con sus palabras.
2. Área por área: qué objetivos tiene, qué proyectos están vivos, qué principios le guían ahí.
3. Su inventario vital: qué ha construido antes (empresas, obra), a qué público puede llegar (audiencias, clientes, redes), qué sabe hacer mejor que la media, qué infraestructura tiene.
4. Las personas clave de cada área, para plantarlas en el mundo.
Al terminar cada bloque, PROPÓN crear en el mundo lo que ha contado (proyectos y personas) usando el bloque JSON de abajo. Nunca inventes datos de su vida: si no te lo ha dicho, pregúntalo.

${juego.dentro ? `CÓMO CONSTRUYES AQUÍ DENTRO:
Estás DENTRO de un edificio, no en la aldea: aquí NO se crean vecinos ni edificios nuevos. Lo que se puede añadir es contenido a las habitaciones de este proyecto, que son los grupos de su tablero.

a) UNA COSA (una tarea, una nota, un gasto, una idea):
{"acciones_juego": [{"tipo": "tarjeta", "grupo": "<id de la habitación>", "nombre": "...", "descripcion": "..."}]}

b) UNA PERSONA — «mete a Anita aquí», «añade a Gala al proyecto»:
{"acciones_juego": [{"tipo": "habitante", "agente_id": "<id de esa persona>", "nombre": "<su nombre>"}]}
La persona SE UNE AL PROYECTO: entra en su sección de personas (no en el tablero — una persona no es una tarea) y aparece de pie, con su avatar, en la sala «Personas» del edificio. **Mira SIEMPRE la lista \`agentes\` de arriba y usa el \`id\` de la persona que ya existe; \`en_proyectos\` te dice quién está ya dentro.** Duplicar a alguien es un fallo grave (le pasó a Eugenio: pidió a Anita y le apareció una Anita nueva y vacía). Solo si NO hay nadie con ese nombre en la lista, manda la acción sin \`agente_id\` y se creará una vez.
Nunca uses "tarjeta" para una persona.
${juego.dentro.sala_actual
    ? `Si dice «en esta sala», «aquí» o no nombra ninguna, usa grupo "${juego.dentro.sala_actual.id}".`
    : 'Elige la habitación por su significado: una persona va a «personas», un gasto a «dinero», una idea de diseño a «diseno»…'}
Aparece en esa habitación al momento. Si te lo piden claro, hazlo y ya: nada de pedir confirmaciones ni datos que no hacen falta (para meter a alguien basta su nombre).
NO uses "tipo": "persona" ni "proyecto" mientras esté aquí dentro: eso planta cosas en la aldea, fuera del edificio, y no es lo que te está pidiendo.`
        : `CÓMO CONSTRUYES EN SU MUNDO:
Devuelve acciones en el bloque JSON final con este formato:
{"acciones_juego": [{"tipo": "persona"|"proyecto", "nombre": "...", "rol": "...", "descripcion": "..."}]}
Y si te pide APUNTAR algo («apúntame esto», «déjame una nota», «recuérdame X»), clava una NOTA en el suelo de su mundo, junto a él:
{"acciones_juego": [{"tipo": "nota", "nombre": "<título corto>", "descripcion": "<el texto de la nota>"}]}
En \`plantado_en_el_mapa\` tienes lo que ya hay plantado (notas, documentos, imágenes y objetos, con sus coordenadas): úsalo para responder «¿qué notas tengo?» o «¿dónde dejé X?» sin inventar nada.
La interfaz las crea al momento en el mundo, junto al jugador. Propón como mucho 4 de golpe. No repitas lo que ya existe en el mundo (lo tienes arriba).`}

REGLAS:
1. Español, primera persona, tono de personaje — nunca "como asistente de la plataforma".
2. Nada de inventar la vida del jugador: lo que no te haya contado, se pregunta.
3. Sin listas largas ni bloques de informe: esto es una conversación dentro de un juego.
3b. SIEMPRE hay texto antes del bloque JSON: una o dos frases contando lo que acabas de hacer. Nunca respondas solo con el bloque.
3c. Nunca preguntes dónde está ni qué es este sitio: lo tienes arriba. Si sabes hacer lo que te piden, hazlo.
3d. **Si dices que has hecho algo, el bloque JSON con la acción es OBLIGATORIO.** Nada ocurre sin él: decir «¡hecho!» sin bloque es mentirle al jugador, porque no aparece nada en su mundo.
${webSearch ? '4. Puedes buscar en internet cuando ayude de verdad (datos, referencias para un proyecto suyo).' : '4. La búsqueda en internet está desactivada ahora mismo.'}

FORMATO DE RESPUESTA:
Texto normal. Si creas algo, añade AL FINAL:

${juego.dentro ? `Ejemplo real, para «añade a Gala en esta sala» estando en «${juego.dentro.sala_actual?.label || 'Personas'}», con Gala ya en la lista de agentes con id GA123:

Ya está: Gala se une al proyecto — la tienes de pie en la sala de Personas.

\`\`\`redhumana
{"acciones_juego": [{"tipo": "habitante", "agente_id": "GA123", "nombre": "Gala"}]}
\`\`\``
        : `\`\`\`redhumana
{"acciones_juego": [{"tipo": "proyecto", "nombre": "Camión camperizado", "descripcion": "..."}],
 "question": {"text": "¿Empezamos por el hogar o por los proyectos?", "options": ["Hogar", "Proyectos"]}}
\`\`\``}

"question" es opcional (máximo 4 opciones cortas).` };
    }

    // ------------------------- PARTE ESTABLE -------------------------
    // Idéntica en cada llamada. NADA interpolado aquí salvo UI_EVENTS, que es
    // una constante del servidor (cambia solo al desplegar código nuevo, y
    // entonces la caché se regenera una vez, como debe ser).
    const estable = `Eres el asistente de Humanity.wiki, una plataforma que conecta el conocimiento sobre los retos de la humanidad por territorio.

CADENA DE CONOCIMIENTO DE LA PLATAFORMA:
Territorio → Objetivo → Indicador → Marcador → Reto → Solución → Necesidad → Producto → Demanda → Transacción → Iniciativa → Resultados → Caso de éxito

CALENDARIO: la fecha de HOY la tienes más abajo, en el estado de la conversación. Cuando alguien diga «el jueves», «mañana» o «la semana que viene», resuélvelo TÚ a partir de esa fecha y manda «inicio» en ISO completo con hora. Para apuntar algo en su calendario usa CREATE_EVENTO con {titulo, inicio, fin?, todo_el_dia?, lugar?, descripcion?, repeticion?}. El campo «repeticion» va en formato RRULE de iCalendar si es algo que se repite (p. ej. "FREQ=WEEKLY;BYDAY=TH").

GRAFOS DE CONOCIMIENTO: la lista de los ya publicados la tienes más abajo. Si la consulta del usuario encaja con uno, emite el evento OPEN_KNOWLEDGE_GRAPH con su slug en vez de responder largo.
Si el usuario pide CREAR un grafo (o explorar un tema del que NO existe grafo), propón la acción CREATE_KNOWLEDGE_GRAPH con title, slug, description, trigger_keywords y hasta 12 windows iniciales. Cada window: {title, kind, config, relation, relation_label}. kind SOLO puede ser: publicacion (config: {title, body}), imagen ({image_url, caption, source}), video ({youtube_id, channel}), wikipedia ({wiki_lang, wiki_page}), enlace ({url, title}), grafica ({chart: 'line'|'donut', series/segments...}), ficha ({rows: [{label, value}]}), texto ({body}). relation (la arista desde el centro): contexto | causa | dato | fuente | apoya | contradice | matiza, con relation_label como pregunta corta (p. ej. "¿qué está pasando?"). Investiga ANTES en internet si está activado y llena las ventanas con datos, cifras y fuentes REALES (nunca inventadas); el grafo nace en borrador para revisión humana. Es una de tus funciones principales: sé un auténtico creador de grafos.
Si el usuario pide crear un MAPA a su nombre (una vista pública del mapa de la humanidad), propón la acción CREATE_MAP con title, description y opcionalmente territorio (slug, p. ej. "espana"), nivel ("objetivo"|"indicador"|"marcador"|"metrica") e id (el id de esa entidad) — se publicará a su nombre y podrá abrirse con OPEN_USER_MAP {slug}. Límite: los usuarios de nivel 1 pueden tener hasta 5 grafos y 5 mapas; nivel 2+ sin límite.
Si el usuario pide ORDENAR, ORGANIZAR o CLASIFICAR sus publicaciones en carpetas (por ejemplo "ordename las publicaciones por carpetas"), propón la acción ORGANIZAR_CARPETAS SIN parámetros (params: {}): el servidor lee todo lo que ha publicado y las agrupa por tema, creando las carpetas que hagan falta. Una misma publicación puede acabar en varias carpetas a la vez.

REGLAS:
1. Responde SIEMPRE en español, de forma directa y sin adornos.
2. Distingue explícitamente lo que sale de la plataforma de lo que sepas por tu cuenta. Si un dato no está en el contexto recuperado, dilo.
3. NUNCA inventes cifras, indicadores ni entidades. Si no hay dato, di que no hay dato.
4. Puedes proponer navegación devolviendo eventos de interfaz.
5. Puedes proponer cambios en los datos SOLO mediante acciones. Tú no escribes en la base de datos: el servidor valida y ejecuta.
(Las reglas 6 a 8 dependen de quién eres y de esta conversación: están más abajo, en el estado.)

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
Eventos de interfaz válidos: ${UI_EVENTS.join(', ')}.

APUNTAR ALGO EN EL CALENDARIO. Si te piden una cita, una reunión, un recordatorio o «apúntame X el día Y», NO basta con decir que lo apuntas: hay que MANDAR LA ACCIÓN o no se crea nada. Resuelve tú la fecha a partir de la de hoy y mándala completa:

\`\`\`redhumana
{"actions": [{"type": "CREATE_EVENTO", "params": {"titulo": "Reunión con el taller", "inicio": "2026-08-24T10:00:00+02:00", "fin": "2026-08-24T11:00:00+02:00"}, "rationale": "lo ha pedido"}]}
\`\`\`

Parámetros: titulo (obligatorio), inicio (ISO con hora y zona, obligatorio), fin, todo_el_dia, lugar, descripcion, repeticion (RRULE de iCalendar, p. ej. "FREQ=WEEKLY", si se repite).

LAS COSAS DE LA PROPIA PLATAFORMA. Sabes hacer esto, y se hace igual: mandando la acción en el bloque. No digas que no puedes.

· CREATE_TAREA — «añade una tarea a X», «apúntame que hay que…». Parámetros:
  titulo (obligatorio), proyecto (el NOMBRE del proyecto, tal cual lo diga),
  resumen, grupo (la etiqueta), responsable (el nombre de una persona suya),
  estado (por_hacer | en_curso | hecho), prioridad (alta | media | baja).
  Sin «proyecto» la tarea queda suelta; si nombra un proyecto que no existe,
  el servidor te lo dirá y entonces se lo cuentas.
· UPDATE_TAREA — «marca X como hecha», «pon en curso lo del baño». Parámetros:
  tarea (parte del título basta), estado, prioridad, titulo_nuevo, resumen.
· CREATE_PROYECTO — titulo (obligatorio), descripcion, publico (true/false).
· CREATE_PAGINA — titulo (obligatorio), texto (el contenido inicial).

Ejemplo, para «añade una tarea de prueba en el proyecto Humanity.wiki»:

\`\`\`redhumana
{"actions": [{"type": "CREATE_TAREA", "params": {"titulo": "Tarea de prueba", "proyecto": "Humanity.wiki"}, "rationale": "lo ha pedido"}]}
\`\`\``;

    // ------------------------- PARTE VARIABLE -------------------------
    // Todo lo que cambia entre mensajes vive aquí, fuera de la caché.
    const variable = `HOY ES ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (${new Date().toISOString()}).

${ctx?.ultimoFallo ? `SU ÚLTIMO INTENTO SE ROMPIÓ ANTES DE LLEGARTE. Pidió «${ctx.ultimoFallo.peticion}» y el navegador falló con: ${ctx.ultimoFallo.motivo} (error ${ctx.ultimoFallo.estado}). NO te llegó ese mensaje, así que no lo respondiste. Si te pregunta qué ha fallado, cuéntale ESTO — nunca digas que no te consta ningún fallo.\n` : ''}
${ctx?.mio ? `LO QUE TIENE ESTA PERSONA EN LA PLATAFORMA (sus proyectos, sus tareas, su gente). Cuando pregunte «mis proyectos», «mis tareas» o «qué tengo pendiente», la respuesta está AQUÍ, no en el conocimiento común de abajo. Y cuando te pida crear una tarea «en X», el proyecto es uno de estos:
${JSON.stringify(ctx.mio, null, 2)}
` : ''}
ESTADO ACTUAL DE LA PANTALLA DEL USUARIO:
${JSON.stringify({ ...(ctx || {}), mio: undefined }, null, 2)}
${ctx?.mirando ? `AHORA MISMO ESTÁ MIRANDO: ${ctx.mirando}. La plataforma son ventanas: \`ventanas\` es lo que tiene abierto y la marcada con \`delante\` es la que ve. \`paginaWeb\`, si viene, es la dirección abierta en su navegador. Cuando pregunte por «esto», «esta página» o «lo que estoy viendo», se refiere a eso — no a la ruta de fondo.` : ''}

USUARIO: ${user ? `${user.displayName || user.email} (nivel ${level}: ${user.roleLabel})` : 'visitante no registrado (solo consulta, no puede modificar nada)'}
MODO DE EDICIÓN: ${editMode}

CONTEXTO RECUPERADO DE LA PLATAFORMA (${retrieved.length} fragmentos):
${retrieved.map(r => `- [${r.entity_type}:${r.id}] ${r.label || ''} ${(r.content || '').slice(0, 300)}`).join('\n') || '(sin coincidencias en la plataforma)'}

GRAFOS DE CONOCIMIENTO PUBLICADOS (las instrucciones de qué hacer con ellos están arriba):
${graphs.map(g => `- slug: ${g.slug} — "${g.title}" (claves: ${(Array.isArray(g.trigger_keywords) ? g.trigger_keywords : []).join(', ')})`).join('\n') || '(todavía no hay grafos publicados)'}

REGLAS DE ESTA CONVERSACIÓN (continúan las de arriba):
6. Acciones permitidas para el nivel de este usuario: ${allowed.length ? allowed.join(', ') : 'NINGUNA (solo consulta)'}.
${editMode === EDIT_MODES.MANUAL ? '7. El usuario está en modo MANUAL: puedes sugerir cambios en texto, pero NO devuelvas acciones.' : ''}
${webSearch
  ? '8. Tienes activada la búsqueda en internet: úsala SOLO para lo que el contexto de la plataforma no cubra (datos externos, actualidad, verificación). Prioriza siempre el contexto recuperado de la plataforma cuando exista.'
  : '8. La búsqueda en internet está desactivada para esta pregunta: responde solo con el contexto de la plataforma y tu conocimiento general, sin inventar que has buscado nada.'}

REGLA DE ORO, LA ÚLTIMA Y LA MÁS IMPORTANTE: si dices que has hecho, apuntado o creado algo, el bloque \`\`\`redhumana con la acción es OBLIGATORIO en ESTA respuesta. Sin bloque no se crea nada: decir «te lo apunto» sin bloque es mentirle al usuario.`;

    return { estable, variable };
  };

  /** Extrae el bloque JSON de la respuesta del modelo. */
  const parseModelBlock = (text: string): { clean: string; ui_events: any[]; actions: any[]; question: any; acciones_juego: any[] } => {
    // El cierre ``` puede faltar si la respuesta se truncó por max_tokens:
    // aun así el bloque se RETIRA del texto visible (nunca se enseña JSON
    // crudo al usuario) aunque sus acciones ya no se puedan recuperar.
    const m = text.match(/```redhumana\s*([\s\S]*?)(?:```|$)/);
    if (!m) return { clean: text.trim(), ui_events: [], actions: [], question: null, acciones_juego: [] };
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
      // Juego Vital: personas y proyectos en la aldea, y tarjetas dentro de la
      // habitación de un proyecto. La página las crea llamando a la API (que
      // comprueba rol y propiedad), nunca el modelo directamente.
      //
      // OJO al filtro: cuando se añadió «tarjeta» y no se puso aquí, el modelo
      // decía «¡hecho, Gala ya está en la sala!» y la acción se tiraba en
      // silencio — el jugador veía una promesa y ningún efecto.
      acciones_juego: Array.isArray(parsed.acciones_juego)
        ? parsed.acciones_juego
            .filter((a: any) => a
              && (a.tipo === 'persona' || a.tipo === 'proyecto'
                || a.tipo === 'tarjeta' || a.tipo === 'habitante' || a.tipo === 'nota')
              && typeof a.nombre === 'string')
            .slice(0, 4)
        : [],
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

  // ==========================================================================
  // LA MEDICIÓN (2026-08-20, paso 2 del plan de costes acordado con Eugenio)
  // ==========================================================================
  // La pregunta que hay que poder responder antes de tocar nada más:
  // ¿CUÁNTO CUESTA UNA ACCIÓN CORRECTA EN CADA MODELO? Un modelo diez veces
  // más barato que falla el triple sale caro; compararlos por precio del token
  // es justo el error que esta pantalla existe para evitar.
  //
  // Se cruzan dos tablas que ya existían —`ai_usage_charges` (lo que se gastó)
  // y `ai_proposed_actions` (lo que se acertó)— por la columna `model` que
  // añade la migración 0051. No hay tabla nueva de métricas: duplicar el dato
  // es garantizar que algún día los dos números se contradigan.
  //
  // Cada persona ve LO SUYO; un administrador ve el total de la plataforma
  // (?todos=1), que es lo que hace falta para decidir de proveedor.
  app.get('/api/ai/medicion', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const global = req.query.todos === '1' && req.user.roleLevel >= ROLE.ADMIN;
      const quien = global ? null : req.user.id;
      const dias = Math.min(Math.max(Number(req.query.dias) || 30, 1), 365);

      const [gasto, acciones, porDia] = await Promise.all([
        // Lo que se gastó, por modelo.
        db.execute(sql`
          SELECT model,
                 count(*)::int AS llamadas,
                 coalesce(sum(cost_cents), 0)::float AS coste_cents,
                 coalesce(sum(total_cents), 0)::float AS pagado_cents,
                 coalesce(sum(input_tokens), 0)::bigint AS entrada,
                 coalesce(sum(output_tokens), 0)::bigint AS salida
          FROM ai_usage_charges
          WHERE created_at > now() - (${dias} * interval '1 day')
            AND (${quien}::text IS NULL OR user_id = ${quien})
          GROUP BY model
        `),
        // Lo que se acertó, por modelo. «Correcta» = la persona la aceptó y
        // el servidor la ejecutó. Rechazada = dijo que no (el modelo propuso
        // algo que no quería). Fallida = parámetros que no valían.
        db.execute(sql`
          SELECT model,
                 count(*)::int AS propuestas,
                 count(*) FILTER (WHERE status = 'ejecutada')::int AS correctas,
                 count(*) FILTER (WHERE status = 'rechazada')::int AS rechazadas,
                 count(*) FILTER (WHERE status = 'fallida')::int AS fallidas,
                 count(*) FILTER (WHERE status = 'propuesta')::int AS pendientes
          FROM ai_proposed_actions
          WHERE created_at > now() - (${dias} * interval '1 day')
            AND (${quien}::text IS NULL OR user_id = ${quien})
          GROUP BY model
        `),
        // La curva de gasto, para ver si algo se disparó.
        db.execute(sql`
          SELECT date_trunc('day', created_at)::date AS dia,
                 coalesce(sum(cost_cents), 0)::float AS coste_cents,
                 count(*)::int AS llamadas
          FROM ai_usage_charges
          WHERE created_at > now() - (${dias} * interval '1 day')
            AND (${quien}::text IS NULL OR user_id = ${quien})
          GROUP BY 1 ORDER BY 1
        `),
      ]);

      // Se unen por modelo en memoria: son un puñado de filas, y hacerlo en
      // SQL con FULL OUTER JOIN sobre dos agregados se lee mucho peor.
      const porModelo = new Map<string, any>();
      // El proveedor devuelve el id con fecha (claude-haiku-4-5-20251001) y el
      // catálogo usa el corto: se empareja por prefijo, igual que hace el chat.
      const delCatalogo = (m: string) =>
        AI_MODELS[m] || Object.entries(AI_MODELS).find(([id]) => m?.startsWith(id))?.[1];
      const fila = (m: string) => {
        const clave = m || '(sin modelo)';
        if (!porModelo.has(clave)) {
          porModelo.set(clave, {
            model: clave,
            etiqueta: delCatalogo(m)?.label || clave,
            gratis: !!delCatalogo(m)?.gratis,
            llamadas: 0, coste_cents: 0, pagado_cents: 0, entrada: 0, salida: 0,
            propuestas: 0, correctas: 0, rechazadas: 0, fallidas: 0, pendientes: 0,
          });
        }
        return porModelo.get(clave);
      };
      for (const g of gasto.rows as any[]) {
        Object.assign(fila(g.model), {
          llamadas: g.llamadas, coste_cents: g.coste_cents, pagado_cents: g.pagado_cents,
          entrada: Number(g.entrada), salida: Number(g.salida),
        });
      }
      for (const a of acciones.rows as any[]) {
        const f = fila(a.model);
        Object.assign(f, {
          propuestas: a.propuestas, correctas: a.correctas,
          rechazadas: a.rechazadas, fallidas: a.fallidas, pendientes: a.pendientes,
        });
      }

      const modelos = [...porModelo.values()].map(f => ({
        ...f,
        // Las dos cifras que de verdad comparan modelos. `null` cuando todavía
        // no hay datos: un 0% inventado se lee como «falla siempre».
        acierto: f.propuestas ? f.correctas / f.propuestas : null,
        // Hace falta gasto Y aciertos. Las acciones anteriores a la migración
        // 0051 no saben de qué modelo salieron: sin llamadas que les
        // correspondan, «0,0000 € por acción» diría «gratis» cuando lo que
        // pasa es que no se puede saber.
        coste_por_accion: f.correctas && f.llamadas ? f.coste_cents / f.correctas : null,
        coste_por_llamada: f.llamadas ? f.coste_cents / f.llamadas : null,
      })).sort((a, b) => b.coste_cents - a.coste_cents);

      res.json({
        dias,
        global,
        modelos,
        porDia: porDia.rows,
        total: {
          coste_cents: modelos.reduce((n, m) => n + m.coste_cents, 0),
          pagado_cents: modelos.reduce((n, m) => n + m.pagado_cents, 0),
          llamadas: modelos.reduce((n, m) => n + m.llamadas, 0),
          correctas: modelos.reduce((n, m) => n + m.correctas, 0),
          propuestas: modelos.reduce((n, m) => n + m.propuestas, 0),
        },
      });
    } catch (e: any) {
      console.error('ai medicion:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
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

  // Las conversaciones son PRIVADAS. Esta ruta devolvía los mensajes de
  // cualquier id sin comprobar de quién era: con un id a mano se leía el chat
  // de otra persona. Se comprueba la dueña antes de contestar (encontrado al
  // rehacer el asistente, 2026-08-20).
  app.get('/api/ai/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const duena = await db.execute(sql`
        SELECT user_id FROM ai_conversations WHERE id = ${req.params.id}
      `);
      if (!duena.rows.length) return res.status(404).json({ error: 'Esa conversación no existe.' });
      if ((duena.rows[0] as any).user_id !== req.user.id) {
        return res.status(403).json({ error: 'Esa conversación no es tuya.' });
      }
      const rows = await db.execute(sql`
        SELECT * FROM ai_messages WHERE conversation_id = ${req.params.id} ORDER BY created_at ASC
      `);
      res.json(rows.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Quitar una conversación del historial. Se ARCHIVA, no se borra. */
  app.delete('/api/ai/conversations/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const r = await db.execute(sql`
        UPDATE ai_conversations SET archived_at = now()
        WHERE id = ${req.params.id} AND user_id = ${req.user.id} AND archived_at IS NULL
        RETURNING id
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Esa conversación no existe o no es tuya.' });
      res.json({ ok: true });
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

      // Modelo pedido a mano por el usuario (validado contra el catálogo).
      const pedido = typeof req.body?.model === 'string' && AI_MODELS[req.body.model] ? req.body.model : undefined;

      // EL ROUTER (2026-08-20): con la clave de Together puesta, cada mensaje
      // va al modelo que le toca por complejidad — ver `elegirModelo` en
      // provider.ts, donde está la escalera entera. Sin la clave, todo sigue
      // como siempre. El tope mensual de uso premium cubierto se mira aquí
      // porque necesita la base de datos y el router es una función pura.
      const nivel = req.user?.roleLevel ?? 0;
      const abiertosListos = getProvider('together').isReady();
      let topeAgotado = false;
      if (abiertosListos && nivel >= NIVEL_PREMIUM && req.user) {
        const gastado = await db.execute(sql`
          SELECT coalesce(sum(cost_cents), 0)::float AS c FROM ai_usage_charges
          WHERE user_id = ${req.user.id} AND total_cents = 0 AND cost_cents > 0
            AND model NOT LIKE 'abierto-%'
            AND created_at >= date_trunc('month', now())
        `);
        topeAgotado = ((gastado.rows[0] as any)?.c ?? 0) >= topePremiumCents();
      }
      const eleccion = elegirModelo({
        pedido,
        nivel,
        mensaje: String(message),
        llevaDocumento: attachment?.type === 'document' || attachment?.media_type === 'application/pdf',
        webSearch: !!search_web,
        juego: !!context?.juego,
        topeAgotado,
        abiertosListos,
      });
      const chosenModel = eleccion.model;
      // Nano Banana genera una IMAGEN, no texto: no encaja en AIProvider.complete()
      // (texto→texto), así que se trata aparte más abajo y aquí no pasa por
      // el proveedor de chat de texto.
      const esNanoBanana = chosenModel === NANO_BANANA_CATALOG_MODEL;
      const provider = esNanoBanana ? null : getProvider(providerOfModel(chosenModel));
      if (esNanoBanana) {
        if (!process.env.GEMINI_API_KEY) {
          return res.status(503).json({ error: 'Nano Banana está construido pero inactivo: falta GEMINI_API_KEY en .env.', ready: false });
        }
      } else if (!provider!.isReady()) {
        return res.status(503).json({
          error: provider!.name === 'gemini'
            ? 'Gemini está construido pero inactivo: falta GEMINI_API_KEY en .env.'
            : provider!.name === 'together'
              ? 'Los modelos abiertos están construidos pero inactivos: falta TOGETHER_API_KEY en .env.'
              : 'El asistente está construido pero inactivo: falta ANTHROPIC_API_KEY en .env.',
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

      // Nano Banana responde aquí mismo, sin RAG ni historial ni prompt de
      // sistema — esa maquinaria es para el chat de texto y no le sirve a un
      // modelo que solo sabe transformar un prompt en una imagen.
      if (esNanoBanana) {
        const started = Date.now();
        const imagen = await generarImagenNanoBanana(String(message));
        const guardada = guardarArchivo(imagen.mimeType, Buffer.from(imagen.base64, 'base64'));
        const durationMs = Date.now() - started;
        const clean = 'He generado esta imagen a partir de tu descripción.';
        await db.execute(sql`
          INSERT INTO ai_messages (conversation_id, role, content, model, duration_ms)
          VALUES (${conversationId}, 'assistant', ${clean}, ${NANO_BANANA_CATALOG_MODEL}, ${durationMs})
        `);
        await db.execute(sql`UPDATE ai_conversations SET updated_at = now() WHERE id = ${conversationId}`);
        if (req.user) {
          db.execute(sql`
            INSERT INTO ai_usage_charges (user_id, kind, model, input_tokens, output_tokens, cost_cents, fee_cents, total_cents, conversation_id)
            VALUES (${req.user.id}, 'imagen', ${NANO_BANANA_CATALOG_MODEL}, 0, 0, 0, 0, 0, ${conversationId})
          `).catch((e: any) => console.error('ai charge error:', e));
        }
        return res.json({
          conversation_id: conversationId,
          reply: clean,
          imageUrl: guardada.url,
          ui_events: [],
          proposed_actions: [],
          sources: [],
          usage: { model: NANO_BANANA_CATALOG_MODEL, inputTokens: 0, outputTokens: 0, costCents: 0, durationMs, feeCents: 0, totalCents: 0 },
        });
      }

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

      // La búsqueda web la decide el ROUTER, no el cliente: la interfaz la
      // manda siempre encendida y es una herramienta que solo tiene Claude,
      // así que hacerle caso mandaba cada «hola» al modelo caro.
      const buscarWeb = eleccion.webSearch;
      // EL CONTEXTO NO PUEDE SER INFINITO. Llega del navegador con lo que
      // tienes abierto, y una ventana con mucho dentro lo dispara: pasado el
      // límite del servidor la petición ni entra (413 con una página HTML,
      // que es lo que rompía el chat). Se recorta aquí, que es barato, en vez
      // de confiar en que el cliente se porte bien.
      // LO QUE TIENES TÚ (2026-08-20). Sin esto, preguntarle «¿qué proyectos
      // tengo?» daba un proyecto semilla de la plataforma en vez de los suyos:
      // el contexto recuperado son entidades del conocimiento común, y de los
      // proyectos, tareas y personas de cada persona no sabía nada. Ahora se
      // le da un índice corto —nombres, no contenidos— que además es lo que
      // necesita para acertar el proyecto al que va una tarea.
      const mio = req.user ? await (async () => {
        try {
          const [proy, tareas, gente, evs] = await Promise.all([
            db.execute(sql`
              SELECT p.id, p.titulo, p.slug,
                     (SELECT count(*)::int FROM roadmap_items r
                       WHERE r.proyecto_id = p.id AND r.archived_at IS NULL AND r.estado <> 'hecho') AS pendientes
              FROM proyectos p
              WHERE p.creador_user_id = ${req.user!.id} AND p.archived_at IS NULL AND p.deleted_at IS NULL
              ORDER BY p.updated_at DESC NULLS LAST LIMIT 30
            `),
            db.execute(sql`
              SELECT r.titulo, r.estado, p.titulo AS proyecto
              FROM roadmap_items r LEFT JOIN proyectos p ON p.id = r.proyecto_id
              WHERE p.creador_user_id = ${req.user!.id} AND r.archived_at IS NULL AND r.estado <> 'hecho'
              ORDER BY r.updated_at DESC NULLS LAST LIMIT 40
            `),
            db.execute(sql`
              SELECT nombre, rol FROM game_agents
              WHERE user_id = ${req.user!.id} AND archived_at IS NULL AND tipo = 'persona' LIMIT 30
            `),
            db.execute(sql`
              SELECT titulo, inicio FROM eventos
              WHERE creador_user_id = ${req.user!.id} AND archived_at IS NULL
                AND inicio > now() - interval '1 day'
              ORDER BY inicio LIMIT 15
            `),
          ]);
          return {
            proyectos: proy.rows.map((p: any) => `${p.titulo} (${p.pendientes} pendientes)`),
            tareas_pendientes: tareas.rows.map((t: any) => `${t.titulo} [${t.estado}]${t.proyecto ? ` · ${t.proyecto}` : ''}`),
            personas: gente.rows.map((g: any) => g.rol ? `${g.nombre} (${g.rol})` : g.nombre),
            proximos_eventos: evs.rows.map((e: any) => `${e.titulo} · ${new Date(e.inicio).toLocaleString('es-ES')}`),
          };
        } catch { return null; }
      })() : null;

      const contextoSano = (() => {
        try {
          const txt = JSON.stringify(context || {});
          if (txt.length <= 20_000) return context;
          return { ...context, recortado: true, aviso: 'El contexto era muy grande y se ha recortado.' };
        } catch { return {}; }
      })();
      const prompt = buildSystemPrompt({ ...contextoSano, mio }, retrieved, req.user, editMode, buscarWeb, publishedGraphs.rows as any[]);
      const result = await provider.complete({
        system: prompt.variable,
        // La parte estable viaja aparte para que el proveedor la marque como
        // cacheable (ver `systemEstable` en provider.ts). En el juego llega
        // vacía y todo va como antes.
        systemEstable: prompt.estable || undefined,
        messages, webSearch: buscarWeb && providerOfModel(chosenModel) === 'claude', model: chosenModel,
      });
      let { clean, ui_events, actions, question, acciones_juego } = parseModelBlock(result.text);

      // «TE LO APUNTO» SIN APUNTAR NADA (2026-08-20). Es el fallo que más ha
      // costado en este proyecto: el modelo dice que ha hecho algo y no manda
      // el bloque, así que no se crea nada y la persona se queda pensando que
      // sí. Se ha intentado arreglar tres veces moviendo la instrucción de
      // sitio en el prompt, y vuelve.
      //
      // Así que se DETECTA en vez de confiar: si el texto promete una acción y
      // no vino ninguna, se le pide el bloque otra vez —una sola vez, y solo
      // el bloque—. Una segunda llamada corta es mucho más barata que una
      // tarea que la persona cree tener y no tiene.
      const PROMETE = /\b(te (lo|la|los|las) apunto|lo apunto|ya (está|lo tienes)|hecho|apuntad[oa]|cread[oa]|añadid[oa]|he (creado|añadido|apuntado)|queda (creado|apuntado))\b/i;
      if (!actions.length && !acciones_juego.length && PROMETE.test(clean)) {
        try {
          const reintento = await provider.complete({
            system: prompt.variable,
            systemEstable: prompt.estable || undefined,
            messages: [
              ...messages,
              { role: 'assistant', content: result.text },
              { role: 'user', content: 'Has dicho que lo hacías pero no mandaste el bloque ```redhumana con la acción, así que no se ha creado nada. Responde AHORA solo con ese bloque, sin texto alrededor.' },
            ],
            model: chosenModel,
          });
          const segundo = parseModelBlock(reintento.text);
          if (segundo.actions.length || segundo.acciones_juego.length) {
            actions = segundo.actions;
            acciones_juego = segundo.acciones_juego;
            console.warn('[IA] bloque recuperado en el reintento:', actions.map((a: any) => a?.type));
          }
        } catch (e) { console.error('[IA] el reintento del bloque falló:', e); }
      }

      // Las acciones se GUARDAN como propuestas. Nunca se ejecutan aquí.
      const proposed: any[] = [];
      if (editMode !== EDIT_MODES.MANUAL) {
        for (const a of actions) {
          const spec = ACTION_CATALOG[a?.type];
          if (!spec) continue;
          const level = req.user?.roleLevel ?? 0;
          const allowed = level >= spec.minLevel;
          const insert = await db.execute(sql`
            INSERT INTO ai_proposed_actions (conversation_id, user_id, action_type, entity_type, params, rationale, status, model)
            VALUES (${conversationId}, ${req.user?.id || null}, ${a.type}, ${spec.entity || null},
                    ${JSON.stringify(a.params || {})}::jsonb, ${a.rationale || null},
                    ${allowed ? 'propuesta' : 'rechazada'},
                    -- Qué modelo la propuso: es lo que permite medir el coste
                    -- por acción correcta ahora que el router reparte.
                    ${result.model})
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
        acciones_juego,
        sources,
        usage: {
          model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens,
          // Cuánta de esa entrada vino de la caché de prompts (ya cobrada al
          // 10% dentro de costCents). Es el dato que dice si la caché acierta.
          cacheReadTokens: result.cacheReadTokens ?? 0,
          costCents: result.costCents, durationMs: result.durationMs,
          // Lo que paga la persona: nada en modelos gratis y en premium cubierto.
          feeCents: eleccion.cobro === 'de_pago' ? result.costCents * AI_PLATFORM_FEE : 0,
          totalCents: eleccion.cobro === 'de_pago' ? result.costCents * (1 + AI_PLATFORM_FEE) : 0,
          cobro: eleccion.cobro, motivo: eleccion.motivo,
        },
        // Si el router no dio lo pedido (sin nivel, tope agotado), se dice.
        aviso_modelo: eleccion.aviso || undefined,
      });

      // Libro de consumo (fire-and-forget; nunca bloquea la respuesta).
      // `cost_cents` es SIEMPRE el coste real — es lo que ve el panel de
      // administración y lo que alimenta el tope mensual. Lo que cambia según
      // el router es lo que paga la persona: en los modelos gratis y en el
      // uso premium cubierto, cero.
      if (req.user) {
        const dePago = eleccion.cobro === 'de_pago';
        db.execute(sql`
          INSERT INTO ai_usage_charges (user_id, kind, model, input_tokens, output_tokens, cost_cents, fee_cents, total_cents, conversation_id)
          VALUES (${req.user.id}, 'chat', ${result.model}, ${result.inputTokens}, ${result.outputTokens},
                  ${result.costCents},
                  ${dePago ? result.costCents * AI_PLATFORM_FEE : 0},
                  ${dePago ? result.costCents * (1 + AI_PLATFORM_FEE) : 0},
                  ${conversationId})
        `).catch((e: any) => console.error('ai charge error:', e));
      }
    } catch (e: any) {
      console.error('ai chat error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/ai/generar-imagen   { prompt }
   * Nano Banana (Gemini 2.5 Flash Image), 2026-08-08: genera una imagen desde
   * una descripción y la deja en el MISMO almacén que una imagen pegada o
   * subida a mano — el resultado es una URL de `/uploads/…` que cualquier
   * lienzo ya sabe convertir en una ventana `imagen`.
   */
  app.post('/api/ai/generar-imagen', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const prompt = String(req.body?.prompt || '').trim();
      if (!prompt) return res.status(400).json({ error: 'Falta describir la imagen que quieres.' });
      const started = Date.now();
      const imagen = await generarImagenNanoBanana(prompt);
      const guardada = guardarArchivo(imagen.mimeType, Buffer.from(imagen.base64, 'base64'));
      db.execute(sql`
        INSERT INTO ai_usage_charges (user_id, kind, model, input_tokens, output_tokens, cost_cents, fee_cents, total_cents)
        VALUES (${req.user.id}, 'imagen', ${process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'}, 0, 0, 0, 0, 0)
      `).catch((e: any) => console.error('ai charge error:', e));
      res.json({ url: guardada.url, prompt, duration_ms: Date.now() - started });
    } catch (e: any) {
      console.error('nano banana error:', e);
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
        case 'CREATE_TAREA': {
          // A QUÉ PROYECTO VA. La IA manda el nombre o el id; aquí se busca
          // entre los TUYOS. Sin proyecto, la tarea queda suelta, que es
          // mejor que inventarse uno.
          let proyectoId: string | null = null;
          const pista = String(params.proyecto || params.proyecto_id || '').trim();
          if (pista) {
            const p = await db.execute(sql`
              SELECT id FROM proyectos
              WHERE creador_user_id = ${actorId} AND archived_at IS NULL AND deleted_at IS NULL
                AND (id = ${pista} OR slug = ${pista} OR lower(titulo) = lower(${pista})
                     OR lower(titulo) LIKE lower(${'%' + pista + '%'}))
              ORDER BY (lower(titulo) = lower(${pista})) DESC LIMIT 1
            `);
            if (!p.rows.length) return { ok: false, error: `No encuentro un proyecto tuyo que se llame «${pista}».` };
            proyectoId = (p.rows[0] as any).id;
          }
          const titulo = String(params.titulo || params.nombre || '').trim();
          if (!titulo) return { ok: false, error: 'La tarea necesita un título.' };

          // El grupo (la etiqueta) tiene que existir en ESE proyecto, o la
          // tarjeta nace en una columna que el tablero no sabe pintar.
          let grupo = String(params.grupo || '').trim();
          if (proyectoId) {
            const g = await db.execute(sql`SELECT grupos FROM proyectos WHERE id = ${proyectoId}`);
            const lista = ((g.rows[0] as any)?.grupos || []) as any[];
            const encaja = lista.find(x => x.id === grupo || String(x.label || '').toLowerCase() === grupo.toLowerCase());
            grupo = encaja ? encaja.id : (lista[0]?.id || 'producto');
          } else if (!(GRUPOS as readonly string[]).includes(grupo)) {
            grupo = GRUPOS[0];
          }

          // El responsable, si lo nombra: una de TUS personas.
          let responsable: string | null = null;
          const quien = String(params.responsable || '').trim();
          if (quien) {
            const a2 = await db.execute(sql`
              SELECT id FROM game_agents
              WHERE user_id = ${actorId} AND archived_at IS NULL AND lower(nombre) LIKE lower(${'%' + quien + '%'})
              LIMIT 1
            `);
            responsable = a2.rows.length ? (a2.rows[0] as any).id : null;
          }

          const id = newId('RM');
          await db.execute(sql`
            INSERT INTO roadmap_items (id, grupo, titulo, resumen, estado, prioridad, autor_user_id,
                                       bloques, orden, proyecto_id, responsable_agente_id, created_by, updated_by)
            VALUES (${id}, ${grupo}, ${titulo.slice(0, 300)}, ${params.resumen || null},
                    ${ESTADOS.has(String(params.estado)) ? String(params.estado) : 'por_hacer'},
                    ${PRIORIDADES.has(String(params.prioridad)) ? String(params.prioridad) : 'media'},
                    ${actorId}, '[]'::jsonb, 0, ${proyectoId}, ${responsable}, ${actorId}, ${actorId})
          `);
          return { ok: true, entityId: id, entityType: 'roadmap_items' };
        }

        case 'UPDATE_TAREA': {
          const pista = String(params.tarea || params.id || params.titulo || '').trim();
          if (!pista) return { ok: false, error: 'No sé qué tarea cambiar.' };
          // Solo tareas de proyectos tuyos: cambiar la de otro sería escribir
          // en su tablero.
          const t = await db.execute(sql`
            SELECT r.id FROM roadmap_items r
            LEFT JOIN proyectos p ON p.id = r.proyecto_id
            WHERE r.archived_at IS NULL AND p.creador_user_id = ${actorId}
              AND (r.id = ${pista} OR lower(r.titulo) LIKE lower(${'%' + pista + '%'}))
            ORDER BY r.updated_at DESC NULLS LAST LIMIT 1
          `);
          if (!t.rows.length) return { ok: false, error: `No encuentro una tarea tuya que se llame «${pista}».` };
          const tid = (t.rows[0] as any).id;
          const estado = ESTADOS.has(String(params.estado)) ? String(params.estado) : null;
          const prioridad = PRIORIDADES.has(String(params.prioridad)) ? String(params.prioridad) : null;
          await db.execute(sql`
            UPDATE roadmap_items SET
              titulo    = COALESCE(${params.titulo_nuevo ?? null}, titulo),
              resumen   = COALESCE(${params.resumen ?? null}, resumen),
              estado    = COALESCE(${estado}, estado),
              prioridad = COALESCE(${prioridad}, prioridad),
              updated_at = now(), updated_by = ${actorId}
            WHERE id = ${tid}
          `);
          return { ok: true, entityId: tid, entityType: 'roadmap_items' };
        }

        case 'CREATE_PROYECTO': {
          const titulo = String(params.titulo || params.nombre || '').trim();
          if (!titulo) return { ok: false, error: 'El proyecto necesita un nombre.' };
          const id = newId('PRY');
          const slug = `${titulo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}-${Math.random().toString(36).slice(2, 6)}`;
          await db.execute(sql`
            INSERT INTO proyectos (id, titulo, descripcion, slug, creador_user_id, grupos, publico, created_by, updated_by)
            VALUES (${id}, ${titulo.slice(0, 200)}, ${params.descripcion || null}, ${slug}, ${actorId},
                    ${JSON.stringify([
                      { id: 'producto', label: 'Producto', color: '#7c3aed' },
                      { id: 'diseno', label: 'Diseño', color: '#db2777' },
                      { id: 'tecnico', label: 'Técnico', color: '#0284c7' },
                    ])}::jsonb, ${params.publico === true}, ${actorId}, ${actorId})
          `);
          return { ok: true, entityId: id, entityType: 'proyectos' };
        }

        case 'CREATE_PAGINA': {
          const titulo = String(params.titulo || params.nombre || '').trim();
          if (!titulo) return { ok: false, error: 'La página necesita un título.' };
          const id = newId('KW');
          await db.execute(sql`
            INSERT INTO knowledge_windows (id, title, kind, config, created_by, updated_by)
            VALUES (${id}, ${titulo.slice(0, 200)}, 'documento',
                    ${JSON.stringify({ bloques: params.texto
                      ? [{ id: 'b1', tipo: 'parrafo', texto: String(params.texto).slice(0, 20000) }] : [] })}::jsonb,
                    ${actorId}, ${actorId})
          `);
          return { ok: true, entityId: id, entityType: 'knowledge_windows' };
        }

        case 'CREATE_EVENTO': {
          // La IA manda la fecha ya resuelta en ISO: interpretar «el jueves»
          // es cosa suya, que para eso sabe qué día es hoy (se lo decimos en
          // la instrucción). Aquí solo se comprueba que sea una fecha de
          // verdad — si no, se guardaría un evento en el año 1970.
          const inicio = new Date(String(params.inicio || ''));
          if (Number.isNaN(inicio.getTime())) {
            return { ok: false, error: 'No he entendido la fecha.' };
          }
          const fin = params.fin ? new Date(String(params.fin)) : null;
          if (fin && (Number.isNaN(fin.getTime()) || fin < inicio)) {
            return { ok: false, error: 'La hora de fin no cuadra.' };
          }
          const id = newId('EVT');
          await db.execute(sql`
            INSERT INTO eventos (id, titulo, descripcion, inicio, fin, todo_el_dia, lugar,
                                 icono, repeticion, proyecto_id, creador_user_id, created_by, updated_by)
            VALUES (${id}, ${String(params.titulo || 'Evento').slice(0, 200)},
                    ${params.descripcion || null}, ${inicio.toISOString()},
                    ${fin ? fin.toISOString() : null}, ${!!params.todo_el_dia},
                    ${params.lugar || null}, ${params.icono || null},
                    ${params.repeticion || null}, ${params.proyecto_id || null},
                    ${actorId}, ${actorId}, ${actorId})
          `);
          return { ok: true, entityId: id, entityType: 'eventos' };
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
        case 'ORGANIZAR_CARPETAS': {
          const resultado = await autoOrganizarCarpetas(db, actorId);
          if (resultado.ok === false) return { ok: false, error: resultado.error };
          return { ok: true, entityId: null, entityType: 'carpetas', carpetas: resultado.carpetas };
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
