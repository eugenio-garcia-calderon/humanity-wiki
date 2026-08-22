// ============================================================================
// Capa de proveedor de IA — Fase 9
// ============================================================================
// El encargo pide explícitamente que "la capa de IA deberá ser independiente"
// y que se pueda añadir OpenAI, Gemini, Mistral o Llama "sin modificar el
// resto de la aplicación".
//
// Por eso el resto del sistema NUNCA importa el SDK de un proveedor concreto:
// habla con la interfaz `AIProvider` de abajo. Cambiar de modelo es registrar
// otro proveedor, no tocar el asistente.

/**
 * Bloque multimodal (Fase 9): una imagen o un PDF adjuntos a un mensaje del
 * usuario, en el mismo formato que espera la API de Claude — así el resto
 * del sistema no depende de un SDK concreto para construirlo.
 */
export type AIContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } };

export interface AIMessage {
  role: 'user' | 'assistant';
  /** Texto simple, o bloques multimodales cuando el mensaje lleva un adjunto. */
  content: string | AIContentBlock[];
}

export interface AICompletionRequest {
  system: string;
  /**
   * LA PARTE ESTABLE DEL PROMPT DE SISTEMA (2026-08-20, para la caché de
   * Anthropic). Si viene, va DELANTE de `system` y marcada como cacheable:
   * la primera llamada la escribe en caché (un 25% más cara) y durante los
   * minutos siguientes cada relectura cuesta el 10%. Como este bloque es
   * idéntico para todos los usuarios, la caché se comparte entre todos.
   *
   * LA REGLA QUE NO SE PUEDE ROMPER: este texto tiene que ser IDÉNTICO byte a
   * byte entre llamadas. Una fecha, un nombre o un contador aquí dentro y la
   * caché no acierta nunca — pagando el 25% extra de escritura en cada
   * mensaje, o sea, más caro que no tener caché. Todo lo que cambie entre
   * llamadas va en `system`, que queda fuera del bloque cacheado.
   */
  systemEstable?: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Activa la búsqueda real en internet (herramienta nativa del proveedor, si la tiene). */
  webSearch?: boolean;
  /** Modelo elegido por el usuario (debe estar en AI_MODELS); si falta, el de la plataforma. */
  model?: string;
}

export interface WebSource {
  url: string;
  title: string;
}

export interface AICompletionResult {
  text: string;
  model: string;
  /** TODA la entrada procesada: normal + escritura de caché + lectura de caché. */
  inputTokens: number;
  outputTokens: number;
  /** Tokens releídos de la caché (ya cobrados al 10% dentro de costCents). */
  cacheReadTokens?: number;
  /** Coste estimado en céntimos de euro (no incluye el coste de las búsquedas web, si las hubo). */
  costCents: number;
  durationMs: number;
  /** Páginas citadas por el modelo al usar la búsqueda web, si `webSearch` estaba activo. */
  webSources: WebSource[];
}

export interface AIProvider {
  readonly name: string;
  /** ¿Está configurado y utilizable? (p. ej. tiene clave de API) */
  isReady(): boolean;
  complete(req: AICompletionRequest): Promise<AICompletionResult>;
}

// ----------------------------------------------------------------------------
// Proveedor: Claude (Anthropic)
// ----------------------------------------------------------------------------
// Se llama a la API por HTTP directamente en vez de añadir el SDK como
// dependencia: son dos peticiones distintas y evita arrastrar un paquete más
// (y sus actualizaciones) para algo que cabe en 30 líneas.

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

/**
 * Catálogo de modelos que el usuario puede elegir para sus creaciones
 * (grafos, mapas, chat). Precios oficiales de Anthropic por millón de
 * tokens, en céntimos de € (aproximación 1$ ≈ 1€ — misma convención que el
 * resto del panel de costes). La facturación al usuario añade un 50% de
 * comisión de la plataforma (ver AI_PLATFORM_FEE).
 */
/** Id de catálogo de Nano Banana — lo que el usuario elige en el chat. Distinto
 *  de `NANO_BANANA_MODEL` (más abajo), que es el id real que se llama en la
 *  API de Google y puede cambiar vía la variable de entorno GEMINI_IMAGE_MODEL. */
export const NANO_BANANA_CATALOG_MODEL = 'gemini-2.5-flash-image';

export const AI_MODELS: Record<string, {
  label: string; hint: string; input: number; output: number; image?: boolean;
  /** Precio de la entrada RELEÍDA de la caché del proveedor, en céntimos por
   *  millón. Solo lo tienen los modelos abiertos: su proveedor guarda los
   *  prefijos automáticamente y los cobra mucho más baratos. Sin este campo se
   *  cobra la entrada entera, que es lo prudente. */
  cacheado?: number;
  /** La plataforma cubre su coste: el usuario paga 0 por usarlo. */
  gratis?: boolean;
  /** Nivel mínimo para elegirlo. Los de pago son para verificados (2+),
   *  decisión de Eugenio 2026-08-20: «solo los usuarios premium pueden
   *  utilizar el modelo más caro». Sin el campo, cualquiera. */
  nivelMinimo?: number;
  /** Qué conector lo sirve, cuando el prefijo del id no lo dice. */
  proveedor?: string;
}> = {
  // MODELOS ABIERTOS GRATIS (2026-08-20, decisión de Eugenio: «2 modelos
  // intermedios gratis, uno más barato y rápido y otro intermedio»). Los
  // sirve Together AI y su coste —céntimos por millón— lo absorbe la
  // plataforma. Los ids son NUESTROS alias, no los del proveedor: así el día
  // que se cambie Together por otro (DeepSeek directo, Fireworks…) los
  // registros de consumo y las preferencias guardadas siguen valiendo.
  // `cacheado`: lo que cuesta el trozo que el proveedor ya tenía caliente. La
  // proporción sale de su tabla pública (≈1/10 de la entrada, 2026-08-22).
  'abierto-rapido': { label: 'Rápido',      hint: 'Gratis · para preguntas sencillas', input: 14, output: 28,  cacheado: 1.4, gratis: true, proveedor: 'together' },
  'abierto-medio':  { label: 'Equilibrado', hint: 'Gratis · el de cada día',           input: 32, output: 128, cacheado: 3.2, gratis: true, proveedor: 'together' },
  'claude-haiku-4-5': { label: 'Haiku 4.5',  hint: 'Rápido y económico',        input: 100,  output: 500,  nivelMinimo: 2 },
  'claude-sonnet-5':  { label: 'Sonnet 5',   hint: 'Premium (recomendado)',     input: 300,  output: 1500, nivelMinimo: 2 },
  'claude-opus-5':    { label: 'Opus 5',     hint: 'Máxima capacidad',          input: 500,  output: 2500, nivelMinimo: 2 },
  'claude-fable-5':   { label: 'Fable 5',    hint: 'El más potente',            input: 1000, output: 5000, nivelMinimo: 2 },
  // Google Gemini (2026-08-08, petición del usuario): «que se pueda conectar
  // a diferentes modelos tanto de Anthropic como de Google». El prefijo
  // `gemini-` es lo que enruta al proveedor correcto — ver `providerOfModel`.
  // Precios de lista de Google AI, en céntimos de € por millón de tokens
  // (misma aproximación 1$≈1€ que el resto de la tabla); conviene revisarlos
  // cuando Google los cambie.
  // Alias «-latest», no una versión fechada: Google bloquea los IDs con
  // fecha para las claves nuevas ("no longer available to new users") y va
  // rotando qué modelo concreto hay detrás — comprobado en vivo con
  // GET /v1beta/models el 2026-08-08.
  'gemini-flash-latest': { label: 'Gemini Flash', hint: 'Rápido, de Google',    input: 30,  output: 250,  nivelMinimo: 2 },
  'gemini-pro-latest':   { label: 'Gemini Pro',   hint: 'Más capaz, de Google', input: 125, output: 1000, nivelMinimo: 2 },
  // Nano Banana (2026-08-08, petición del usuario): elegible en el mismo
  // selector, pero genera una IMAGEN en vez de texto — `image: true` es lo
  // que el frontend usa para no mostrarle un precio por millón de tokens que
  // no le corresponde. El coste real por imagen no se factura todavía (ver
  // `generarImagenNanoBanana`), así que input/output quedan a 0 en vez de
  // inventar una cifra.
  [NANO_BANANA_CATALOG_MODEL]: { label: 'Nano Banana', hint: 'Genera imágenes, de Google', input: 0, output: 0, image: true },
};

/** Qué proveedor sabe hablar con cada modelo del catálogo. */
export function providerOfModel(model?: string): string {
  const enCatalogo = model && AI_MODELS[model]?.proveedor;
  if (enCatalogo) return enCatalogo;
  return model?.startsWith('gemini-') ? 'gemini' : 'claude';
}

/** Comisión de la plataforma sobre el coste de créditos de Anthropic. */
export const AI_PLATFORM_FEE = 0.5;

// ----------------------------------------------------------------------------
// EL ROUTER: qué modelo atiende cada mensaje
// ----------------------------------------------------------------------------
// (2026-08-20, decisión de Eugenio: «escogiendo entre 3 modelos según la
// complejidad; solo los premium usan el más caro; 2 intermedios gratis».
// Y de la conversación previa: premium = nivel VERIFIED (2+), con el coste
// de Claude cubierto por la plataforma.)
//
// REGLAS FIJAS, NO OTRA IA DECIDIENDO: meter un modelo a elegir modelo sería
// una llamada más, un coste más y un sitio más donde fallar, para ahorrar
// céntimos. Con cuatro señales deterministas se acierta lo que importa.
//
// La escalera, de barato a caro:
//   abierto-rapido  → preguntas cortas y charla (DeepSeek Flash, gratis)
//   abierto-medio   → el de cada día, y las acciones de quien no es premium
//                     (Qwen Plus, gratis; las acciones son seguras de delegar
//                     porque la IA solo PROPONE: el servidor valida y la
//                     persona confirma — la red de seguridad ya existía)
//   Claude          → verificados (2+): acciones, adjuntos con PDF, búsqueda
//                     web (solo Claude la tiene) y mensajes largos. Cubierto
//                     por la plataforma HASTA UN TOPE mensual por usuario;
//                     pasado el tope, se baja al medio y se avisa.

/** Nivel a partir del cual los modelos de pago van cubiertos por la plataforma. */
export const NIVEL_PREMIUM = 2;

/** Tope mensual, en céntimos, de coste de modelos de pago cubierto a cada
 *  usuario premium. Sin tope, un verificado intensivo costaría decenas de
 *  euros al mes sin que nadie se entere. Cambiable por variable de entorno. */
export const topePremiumCents = () => Number(process.env.AI_TOPE_PREMIUM_CENTS || 300);

/** Señales de que el mensaje pide crear o cambiar algo — lo que más agradece
 *  un modelo capaz. Minúsculas y sin tildes obligatorias a propósito. */
const PIDE_ACCION = /\b(crea|crear|creame|anade|anademe|añade|añademe|apunta|apuntame|apúntame|borra|elimina|cambia|renombra|organiza|ordena|ordename|hazme|genera|generame|grafo|mapa|evento|cita|reunion|reunión|recuerda|recuerdame|recuérdame|tarea|publica|modifica)\b/i;

/**
 * ¿Este mensaje necesita mirar internet DE VERDAD?
 *
 * La interfaz manda `search_web: true` en todos los mensajes, y la búsqueda
 * web es una herramienta que solo tiene Claude. Resultado: cada mensaje de un
 * usuario verificado —«hola», «¿qué es un indicador?»— acababa en el modelo
 * caro por una búsqueda que nadie había pedido. El router quedaba anulado
 * justo para quien más lo usa (visto en pruebas, 2026-08-20).
 *
 * Así que la búsqueda se enciende cuando hace falta: se pide a propósito, o
 * se pregunta por algo que cambia con el tiempo (noticias, precios, un año
 * concreto). Lo demás lo contesta el contexto de la plataforma, que es lo que
 * las propias reglas del prompt mandan priorizar.
 */
const PIDE_WEB = /\b(busca|buscar|búscame|buscame|internet|web|google|noticia|noticias|actualidad|hoy en día|últimas?|ultimas?|reciente|recientes|novedad|novedades|precio|precios|cuánto cuesta|cuanto cuesta|cotiza|dólar|euro hoy|20\d\d|verifica|comprueba|fuente|fuentes)\b/i;

export interface EleccionDeModelo {
  model: string;
  /** gratis: modelo abierto (coste céntimos, lo absorbe la plataforma).
   *  cubierto: modelo de pago que la plataforma paga a un premium.
   *  de_pago: se factura al usuario con comisión, como siempre. */
  cobro: 'gratis' | 'cubierto' | 'de_pago';
  motivo: string;
  /** Si la búsqueda web debe usarse de verdad en esta llamada. */
  webSearch: boolean;
  /** Texto para el usuario cuando no se le da lo que pidió. */
  aviso?: string;
}

export function elegirModelo(x: {
  pedido?: string;
  nivel: number;
  mensaje: string;
  llevaDocumento?: boolean;
  webSearch?: boolean;
  juego?: boolean;
  topeAgotado?: boolean;
  abiertosListos: boolean;
}): EleccionDeModelo {
  const premium = x.nivel >= NIVEL_PREMIUM;
  // Buscar de verdad solo si el mensaje lo pide. Y solo Claude sabe hacerlo.
  const buscar = !!x.webSearch && PIDE_WEB.test(x.mensaje);

  // Sin clave de Together todo sigue EXACTAMENTE como hoy: Claude (o lo que
  // pidan) facturado con comisión. Así este código se puede desplegar antes
  // de que exista la cuenta sin cambiar nada para nadie.
  if (!x.abiertosListos) {
    return { model: x.pedido || CLAUDE_MODEL, cobro: 'de_pago', motivo: 'sin proveedor de modelos abiertos', webSearch: !!x.webSearch };
  }

  const claudeCubierto = (motivo: string): EleccionDeModelo =>
    x.topeAgotado
      ? { model: 'abierto-medio', cobro: 'gratis', motivo: `${motivo}, pero tope mensual agotado`, webSearch: false, aviso: 'Has llegado al tope mensual de uso premium cubierto: este mes seguirás con el modelo Equilibrado (gratis).' }
      : { model: CLAUDE_MODEL, cobro: 'cubierto', motivo, webSearch: buscar };

  // 1. ELECCIÓN MANUAL: se respeta — con la puerta del nivel.
  if (x.pedido && AI_MODELS[x.pedido]) {
    const entrada = AI_MODELS[x.pedido];
    if (entrada.gratis) return { model: x.pedido, cobro: 'gratis', motivo: 'elegido por el usuario', webSearch: false };
    if (x.nivel >= (entrada.nivelMinimo ?? 0)) {
      return x.topeAgotado
        ? { model: 'abierto-medio', cobro: 'gratis', motivo: 'elegido premium, tope agotado', webSearch: false, aviso: 'Has llegado al tope mensual de uso premium cubierto: este mes seguirás con el modelo Equilibrado (gratis).' }
        : { model: x.pedido, cobro: 'cubierto', motivo: 'elegido por el usuario (premium)', webSearch: buscar };
    }
    return { model: 'abierto-medio', cobro: 'gratis', motivo: 'pidió un modelo premium sin nivel', webSearch: false, aviso: 'Ese modelo es para usuarios verificados: he usado el Equilibrado (gratis).' };
  }

  // 2. PDF adjunto: solo Claude sabe leerlos.
  if (x.llevaDocumento) {
    if (premium) return claudeCubierto('lleva PDF');
    return { model: 'abierto-medio', cobro: 'gratis', motivo: 'PDF sin nivel premium', webSearch: false, aviso: 'Leer PDF necesita un modelo premium (usuarios verificados): respondo sin poder abrir el documento.' };
  }

  // 3. Búsqueda web: es una herramienta nativa de Claude; los abiertos no la
  // tienen. Para quien no es premium, el prompt ya dice que está apagada.
  if (buscar && premium) return claudeCubierto('búsqueda web');

  // 4. El juego va al medio: necesita personalidad y el bloque JSON, pero es
  // charla de alto volumen — quemar el tope premium ahí no tiene sentido.
  if (x.juego) return { model: 'abierto-medio', cobro: 'gratis', motivo: 'juego', webSearch: false };

  // 5. Complejidad: pide crear/cambiar algo, o es un mensajón.
  //
  // LAS ACCIONES CORTAS Y CORRIENTES VAN AL BARATO (D92, 2026-08-21, Eugenio:
  // «intentar utilizar modelos baratos para tareas simples de creación
  // estándar de tareas y otras»).
  //
  // NO SE HIZO A CIEGAS. Crear una tarea es justo donde estalló todo el 20 de
  // agosto —B26, B32, B34, B36— así que antes de bajarlo se le pasó al modelo
  // barato la misma batería que verificó aquellos arreglos: crear la tarea de
  // verdad en su proyecto y grupo; «Tecnico» sin tilde acabando en Técnico;
  // grupo inexistente avisado, con los válidos enumerados y diciendo dónde la
  // dejó; «una TAREA» siendo tarea y no página; y la trampa de 120 kg / 90 km.
  // Resultado, tres rondas seguidas: 15 de 15 en «Equilibrado» y 15 de 15 en
  // «Rápido», igual que Claude. Y coste de las cinco pruebas: 10,63 ¢ con
  // Claude, 1,05 ¢ con el Equilibrado.
  //
  // LO QUE HACE QUE ESTO SEA SEGURO no es que el modelo acierte, sino que las
  // barreras están en el SERVIDOR: el grupo inválido lo caza el código al
  // ejecutar, no la prosa del modelo. Por eso un modelo peor puede fallar la
  // redacción sin poder guardar una tarea en un sitio inventado.
  //
  // LO LARGO Y LO ADJUNTO SIGUE SIENDO DE CLAUDE. Un mensaje de más de 300
  // caracteres suele traer varias cosas a la vez, y ahí la batería no dice
  // nada porque no lo midió.
  if (PIDE_ACCION.test(x.mensaje) || x.mensaje.length > 700) {
    const accionCorriente = x.mensaje.length <= 300 && !x.llevaDocumento && !buscar;
    if (accionCorriente) {
      return { model: 'abierto-medio', cobro: 'gratis', motivo: 'acción corta y corriente', webSearch: false };
    }
    if (premium) return claudeCubierto('acción o mensaje largo');
    return { model: 'abierto-medio', cobro: 'gratis', motivo: 'acción, sin nivel premium', webSearch: false };
  }

  // 6. Corto y sin señales → el rápido. Lo demás → el medio.
  if (x.mensaje.length < 180) return { model: 'abierto-rapido', cobro: 'gratis', motivo: 'pregunta corta', webSearch: false };
  return { model: 'abierto-medio', cobro: 'gratis', motivo: 'conversación normal', webSearch: false };
}

// Precio del modelo por defecto de la plataforma (respuestas automáticas de
// la IA, comentarios, etc. — no facturadas al usuario).
const PRICE_PER_MTOK = { input: 300, output: 1500 }; // céntimos de € por millón

/**
 * MODELOS DE ANTHROPIC QUE RECHAZAN `temperature` (2026-08-21, D92).
 *
 * Se descubrió con la batería de pruebas: pedir Sonnet 5 devolvía
 * `400 · «temperature is deprecated for this model»` y NINGUNA respuesta. O
 * sea que el selector ofrecía cuatro modelos premium y tres de ellos fallaban
 * siempre — no a veces: siempre.
 *
 * En la familia 5 los mandos de muestreo (`temperature`, `top_p`, `top_k`)
 * están retirados; la profundidad se controla con `output_config.effort`. Los
 * anteriores —Haiku 4.5 y el Sonnet 4.6 que la plataforma usa por defecto— los
 * siguen aceptando, así que la lista es EXPLÍCITA y no una regla por prefijo:
 * quitarle la temperatura al modelo por defecto cambiaría el comportamiento de
 * todo el mundo sin que nadie lo haya pedido.
 */
const SIN_TEMPERATURA = new Set([
  'claude-sonnet-5', 'claude-opus-5', 'claude-fable-5',
  'claude-opus-4-8', 'claude-opus-4-7',
]);

/** ¿A este modelo se le puede mandar `temperature` sin que devuelva un 400? */
export const admiteTemperatura = (model: string) => !SIN_TEMPERATURA.has(model);

export class ClaudeProvider implements AIProvider {
  readonly name = 'claude';

  isReady(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResult> {
    if (!this.isReady()) {
      throw new Error('ANTHROPIC_API_KEY no está configurada. El asistente IA está construido pero inactivo.');
    }
    const started = Date.now();

    // Solo se aceptan modelos del catálogo: nunca un ID arbitrario del cliente.
    const model = req.model && AI_MODELS[req.model] ? req.model : CLAUDE_MODEL;

    const body: Record<string, any> = {
      model,
      // La temperatura solo va si el modelo la admite: ver `SIN_TEMPERATURA`.
      ...(admiteTemperatura(model) ? { temperature: req.temperature ?? 0.2 } : {}),
      // 8192: crear un grafo entero (ventanas+aristas en el bloque de acciones)
      // no cabía en 2048 y el JSON llegaba truncado sin cerrar el bloque.
      max_tokens: req.maxTokens ?? 8192,
      // Con parte estable, el system va en DOS bloques: el estable marcado
      // para caché y el variable detrás. El orden importa: la caché de
      // Anthropic compara el prefijo de la petición, así que lo que cambia
      // tiene que ir siempre al final.
      system: req.systemEstable
        ? [
            { type: 'text', text: req.systemEstable, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: req.system },
          ]
        : req.system,
      messages: req.messages,
    };
    // Herramienta de búsqueda web nativa de Anthropic: la ejecuta el propio
    // servidor de Claude dentro de esta misma llamada (no hace falta bucle
    // agente-herramienta en nuestro backend, ni clave de un buscador aparte).
    if (req.webSearch) {
      body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }];
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Error de la API de Claude (${res.status}): ${detail.slice(0, 300)}`);
    }

    const json: any = await res.json();
    const content: any[] = json.content || [];
    const text = content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n');

    // Las citas de páginas reales usadas por el modelo viajan dentro de los
    // bloques de texto que se apoyaron en la búsqueda (`citations`), no en un
    // campo aparte — se deduplican por URL.
    const webSources: WebSource[] = [];
    for (const block of content) {
      if (block.type !== 'text' || !Array.isArray(block.citations)) continue;
      for (const c of block.citations) {
        if (c.url && !webSources.some(w => w.url === c.url)) {
          webSources.push({ url: c.url, title: c.title || c.url });
        }
      }
    }

    // La entrada llega repartida en tres cubos, cada uno con su precio:
    // normal (100%), escritura de caché (125%) y lectura de caché (10%).
    // Son los precios publicados de Anthropic para prompt caching.
    const inputNormal = json.usage?.input_tokens ?? 0;
    const cacheWrite = json.usage?.cache_creation_input_tokens ?? 0;
    const cacheRead = json.usage?.cache_read_input_tokens ?? 0;
    const outputTokens = json.usage?.output_tokens ?? 0;

    const price = AI_MODELS[model] || PRICE_PER_MTOK;
    return {
      text,
      model: json.model || model,
      // El total se sigue informando junto: para el panel de costes «cuánto
      // contexto llevó este mensaje» es esta suma, venga de donde venga.
      inputTokens: inputNormal + cacheWrite + cacheRead,
      outputTokens,
      cacheReadTokens: cacheRead,
      costCents:
        (inputNormal / 1_000_000) * price.input +
        (cacheWrite / 1_000_000) * price.input * 1.25 +
        (cacheRead / 1_000_000) * price.input * 0.1 +
        (outputTokens / 1_000_000) * price.output,
      durationMs: Date.now() - started,
      webSources,
    };
  }
}

// ----------------------------------------------------------------------------
// Proveedor: Gemini (Google)
// ----------------------------------------------------------------------------
// API REST directa (`generateContent`), igual que Claude: nada de SDK nuevo
// para una interfaz de 30 líneas. La única traducción real es de forma —
// Gemini llama `model` a lo que aquí es `assistant`, y el system prompt va
// en `systemInstruction`, no como primer mensaje.
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta';

/** Bloques Claude → `parts` de Gemini (texto, imagen o PDF en base64). */
const aPartesGemini = (content: string | AIContentBlock[]) => {
  if (typeof content === 'string') return [{ text: content }];
  return content.map(b => b.type === 'text'
    ? { text: b.text }
    : { inlineData: { mimeType: b.source.media_type, data: b.source.data } });
};

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';

  isReady(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResult> {
    if (!this.isReady()) {
      throw new Error('GEMINI_API_KEY no está configurada. Consíguela en aistudio.google.com/apikey y añádela a .env.');
    }
    const started = Date.now();
    const model = req.model && AI_MODELS[req.model] && providerOfModel(req.model) === 'gemini'
      ? req.model : 'gemini-flash-latest';

    const body: Record<string, any> = {
      // Gemini no tiene la caché de prompts de Anthropic: la parte estable
      // simplemente se antepone y se paga entera, como siempre.
      systemInstruction: { parts: [{ text: req.systemEstable ? `${req.systemEstable}\n\n${req.system}` : req.system }] },
      contents: req.messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: aPartesGemini(m.content),
      })),
      generationConfig: {
        maxOutputTokens: req.maxTokens ?? 8192,
        temperature: req.temperature ?? 0.2,
      },
    };
    // Búsqueda real de Google, herramienta nativa igual que en Claude.
    if (req.webSearch) body.tools = [{ googleSearch: {} }];

    const res = await fetch(`${GEMINI_API}/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Error de la API de Gemini (${res.status}): ${detail.slice(0, 300)}`);
    }
    const json: any = await res.json();
    const parts: any[] = json.candidates?.[0]?.content?.parts || [];
    const text = parts.filter(p => p.text).map(p => p.text).join('\n');

    // Las citas de la búsqueda viajan en `groundingMetadata`, con forma
    // distinta a la de Claude — se homogeneizan aquí, no fuera de este archivo.
    const webSources: WebSource[] = [];
    const chunks = json.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    for (const c of chunks) {
      if (c.web?.uri && !webSources.some(w => w.url === c.web.uri)) {
        webSources.push({ url: c.web.uri, title: c.web.title || c.web.uri });
      }
    }

    const inputTokens = json.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = json.usageMetadata?.candidatesTokenCount ?? 0;
    const price = AI_MODELS[model] || AI_MODELS['gemini-flash-latest'];
    return {
      text, model,
      inputTokens, outputTokens,
      costCents: (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output,
      durationMs: Date.now() - started,
      webSources,
    };
  }
}

// ----------------------------------------------------------------------------
// NANO BANANA — generación de imágenes con Gemini (2026-08-08, petición del
// usuario). No encaja en la interfaz `AIProvider` (su salida es una imagen,
// no texto), así que es una función aparte que usa la MISMA clave
// `GEMINI_API_KEY` y el mismo endpoint `generateContent`, pidiendo una
// modalidad de respuesta distinta.
// ----------------------------------------------------------------------------
/** El nombre real del modelo puede cambiar por parte de Google; queda en una
 *  variable de entorno para poder corregirlo sin tocar código. */
const NANO_BANANA_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

export interface ImagenGenerada { mimeType: string; base64: string }

export async function generarImagenNanoBanana(prompt: string): Promise<ImagenGenerada> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY no está configurada. Consíguela en aistudio.google.com/apikey y añádela a .env.');
  }
  const res = await fetch(`${GEMINI_API}/models/${NANO_BANANA_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Nano Banana no ha podido generar la imagen (${res.status}): ${detail.slice(0, 300)}`);
  }
  const json: any = await res.json();
  const parts: any[] = json.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData?.data);
  if (!imagePart) throw new Error('Nano Banana no ha devuelto ninguna imagen.');
  return { mimeType: imagePart.inlineData.mimeType || 'image/png', base64: imagePart.inlineData.data };
}

// ----------------------------------------------------------------------------
// STREAMING — el texto según se genera (2026-08-08, para los documentos:
// «según lo va generando aparece»). Solo Claude por ahora: es el único sitio
// que lo necesita y añadir el parseo SSE de Gemini sin usarlo sería código
// muerto. `AIProvider.complete()` sigue siendo la vía normal; esto es una
// función aparte, como Nano Banana, porque su contrato es distinto (recibe un
// callback por trozo en vez de devolver el texto entero).
// ----------------------------------------------------------------------------
export interface StreamResult {
  texto: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  durationMs: number;
}

export async function completarClaudeStream(
  req: { system: string; messages: AIMessage[]; maxTokens?: number; model?: string },
  onDelta: (texto: string) => void,
): Promise<StreamResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY no está configurada.');
  }
  const started = Date.now();
  const model = req.model && AI_MODELS[req.model] && providerOfModel(req.model) === 'claude'
    ? req.model : (process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 8192,
      ...(admiteTemperatura(model) ? { temperature: 0.3 } : {}),
      system: req.system,
      messages: req.messages,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Error de la API de Claude (${res.status}): ${detail.slice(0, 300)}`);
  }

  // La API emite Server-Sent Events: líneas `data: {json}` separadas por
  // líneas en blanco. Los trozos de texto llegan en `content_block_delta`;
  // los tokens de entrada en `message_start` y los de salida en
  // `message_delta` del final.
  let texto = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let buffer = '';
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lineas = buffer.split('\n');
    buffer = lineas.pop() || '';
    for (const linea of lineas) {
      if (!linea.startsWith('data:')) continue;
      let ev: any;
      try { ev = JSON.parse(linea.slice(5)); } catch { continue; }
      if (ev.type === 'message_start') inputTokens = ev.message?.usage?.input_tokens ?? 0;
      else if (ev.type === 'content_block_delta' && ev.delta?.text) { texto += ev.delta.text; onDelta(ev.delta.text); }
      else if (ev.type === 'message_delta') outputTokens = ev.usage?.output_tokens ?? outputTokens;
    }
  }

  const price = AI_MODELS[model] || PRICE_PER_MTOK;
  return {
    texto, model, inputTokens, outputTokens,
    costCents: (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output,
    durationMs: Date.now() - started,
  };
}

// ----------------------------------------------------------------------------
// Proveedor: modelos abiertos (Together AI, formato estándar de OpenAI)
// ----------------------------------------------------------------------------
// Sirve los modelos «abierto-*» del catálogo (2026-08-20, decisión de Eugenio:
// dos modelos gratis cubiertos por la plataforma). Se eligió Together AI y no
// la API directa de DeepSeek con la tabla de precios delante (2026-08-20):
// Together cobra MENOS DE LA MITAD para el mismo modelo ($0,14/$0,28 frente a
// $0,22–0,44/$0,66–1,32 por millón), da varias familias con una sola cuenta y
// procesa en EE. UU. — la API de DeepSeek procesa en China, y con el RGPD
// pendiente en la hoja de ruta eso era abrir un frente legal innecesario.
//
// CAMBIAR DE PROVEEDOR ES CONFIGURACIÓN, NO CÓDIGO: habla el formato de chat
// de OpenAI, que es el estándar de facto — DeepSeek directo, Fireworks, Groq
// y OpenRouter usan el mismo. Bastan `ABIERTO_BASE_URL` y `ABIERTO_API_KEY`
// (con `TOGETHER_API_KEY` como nombre natural mientras sea Together), y los
// ids reales por variable si el nuevo proveedor los llama distinto.
const ABIERTO_BASE = () => process.env.ABIERTO_BASE_URL || 'https://api.together.xyz/v1';
const ABIERTO_KEY = () => process.env.ABIERTO_API_KEY || process.env.TOGETHER_API_KEY || '';

/** Nuestro alias de catálogo → id real en el proveedor. Alias nuestros a
 *  propósito: los registros de consumo guardan el alias y sobreviven a un
 *  cambio de proveedor. Ids comprobados en docs.together.ai el 2026-08-20. */
const MODELOS_ABIERTOS: Record<string, () => string> = {
  'abierto-rapido': () => process.env.ABIERTO_MODELO_RAPIDO || 'deepseek-ai/DeepSeek-V4-Flash-0731',
  'abierto-medio': () => process.env.ABIERTO_MODELO_MEDIO || 'Qwen/Qwen3.7-Plus',
};

/** Bloques nuestros → contenido del formato OpenAI. Los PDF no viajan: ese
 *  formato no los admite en el mensaje — el router manda los adjuntos con
 *  documento a Claude antes de llegar aquí. */
const aContenidoOpenAI = (content: string | AIContentBlock[]) => {
  if (typeof content === 'string') return content;
  return content.map(b => {
    if (b.type === 'text') return { type: 'text', text: b.text };
    if (b.type === 'image') {
      return { type: 'image_url', image_url: { url: `data:${b.source.media_type};base64,${b.source.data}` } };
    }
    return { type: 'text', text: '[documento adjunto: solo los modelos premium pueden leerlo]' };
  });
};

export class TogetherProvider implements AIProvider {
  readonly name = 'together';

  isReady(): boolean {
    return !!ABIERTO_KEY();
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResult> {
    if (!this.isReady()) {
      throw new Error('TOGETHER_API_KEY no está configurada. Los modelos abiertos están construidos pero inactivos.');
    }
    const started = Date.now();
    const alias = req.model && MODELOS_ABIERTOS[req.model] ? req.model : 'abierto-medio';
    const modeloReal = MODELOS_ABIERTOS[alias]();

    // ══ LA CACHÉ DE ESTE PROVEEDOR ES AUTOMÁTICA (comprobado 2026-08-22) ═══
    // No se activa con ningún parámetro ni cabecera: el proveedor guarda los
    // PREFIJOS de lo que se le manda y cobra a precio reducido la parte que
    // coincide con algo que ya tenía caliente. Solo cuenta el prefijo común
    // más largo: a partir del primer byte distinto, se paga entero.
    //
    // Por eso la parte ESTABLE va delante y la variable detrás. Ya iba así, y
    // ahora se sabe por qué importa: si la fecha o el nombre del usuario
    // estuvieran arriba, el prefijo cambiaría en cada mensaje y no habría
    // acierto nunca. La regla está escrita en `buildSystemPrompt`, y esta es la
    // otra mitad que la hace valer.
    //
    // (El comentario anterior decía que esta API no tenía caché de prompts. Era
    // cierto para el mecanismo EXPLÍCITO de Anthropic —marcar un bloque— y
    // falso para lo que hay: una caché de prefijos que no hay que pedir.)
    const system = req.systemEstable ? `${req.systemEstable}

${req.system}` : req.system;

    const res = await fetch(`${ABIERTO_BASE()}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ABIERTO_KEY()}`,
      },
      body: JSON.stringify({
        model: modeloReal,
        max_tokens: req.maxTokens ?? 8192,
        temperature: req.temperature ?? 0.2,
        // SIEMPRE en streaming: algunos modelos (Qwen3.7-Plus, comprobado en
        // vivo el 2026-08-20) devuelven 400 sin él. Se junta aquí y se
        // entrega entero, igual que sin streaming.
        stream: true,
        stream_options: { include_usage: true },
        messages: [
          { role: 'system', content: system },
          ...req.messages.map(m => ({ role: m.role, content: aContenidoOpenAI(m.content) })),
        ],
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Error del proveedor de modelos abiertos (${res.status}): ${detail.slice(0, 300)}`);
    }

    // El SSE del formato OpenAI: líneas `data: {json}` y un `data: [DONE]`.
    // El consumo llega en el último trozo gracias a `include_usage`.
    let text = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheRead = 0;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lineas = buffer.split('\n');
      buffer = lineas.pop() || '';
      for (const linea of lineas) {
        if (!linea.startsWith('data:')) continue;
        const cuerpo = linea.slice(5).trim();
        if (cuerpo === '[DONE]') continue;
        let ev: any;
        try { ev = JSON.parse(cuerpo); } catch { continue; }
        const delta = ev.choices?.[0]?.delta?.content;
        if (typeof delta === 'string') text += delta;
        if (ev.usage) {
          inputTokens = ev.usage.prompt_tokens ?? inputTokens;
          outputTokens = ev.usage.completion_tokens ?? outputTokens;
          // CUÁNTO SE HA RELEÍDO DE LA CACHÉ. El proveedor lo informa aquí
          // cuando hay acierto. Sin leerlo, la caché podría estar funcionando
          // —o no— y el panel de costes diría lo mismo en los dos casos: no
          // habría forma de saber si sirve de algo.
          cacheRead = ev.usage.prompt_tokens_details?.cached_tokens
            ?? ev.usage.cached_tokens
            ?? cacheRead;
        }
      }
    }

    // El precio se calcula con NUESTRO alias de catálogo: es la cifra que ve
    // el panel de costes, y es coste de la plataforma (el usuario paga 0).
    const price = AI_MODELS[alias] || PRICE_PER_MTOK;
    // LO RELEÍDO DE LA CACHÉ SE COBRA A SU PRECIO, no al de entrada. El
    // proveedor lo descuenta de verdad; si aquí se cobrara entero, el panel de
    // costes diría que gastamos más de lo que la factura dice, y una cifra que
    // no cuadra con la factura no sirve para decidir nada.
    //
    // El descuento se declara en el catálogo (`cacheado`). Sin él se cobra
    // entero, que es lo prudente: preferimos que el panel se pase de caro a
    // que prometa un ahorro que no existe.
    const sinCache = Math.max(0, inputTokens - cacheRead);
    const precioCache = (price as any).cacheado ?? price.input;
    return {
      text,
      model: alias,
      inputTokens,
      outputTokens,
      cacheReadTokens: cacheRead,
      costCents:
        (sinCache / 1_000_000) * price.input +
        (cacheRead / 1_000_000) * precioCache +
        (outputTokens / 1_000_000) * price.output,
      durationMs: Date.now() - started,
      webSources: [],
    };
  }
}

// ----------------------------------------------------------------------------
// Registro de proveedores
// ----------------------------------------------------------------------------
// Añadir OpenAI/Mistral en el futuro es implementar `AIProvider` y
// registrarlo aquí. Ningún otro archivo cambia.
const providers: Record<string, AIProvider> = {
  claude: new ClaudeProvider(),
  gemini: new GeminiProvider(),
  together: new TogetherProvider(),
};

export function getProvider(name?: string): AIProvider {
  const key = name || process.env.AI_PROVIDER || 'claude';
  const p = providers[key];
  if (!p) throw new Error(`Proveedor de IA desconocido: ${key}. Disponibles: ${Object.keys(providers).join(', ')}`);
  return p;
}

export function listProviders() {
  return Object.values(providers).map(p => ({ name: p.name, ready: p.isReady() }));
}

// ============================================================================
// LOS NIVELES DEL SELECTOR (2026-08-22, Eugenio: «las opciones, deja escoger
// entre 3: modelo sencillo, medio, alto. Y pon uno especial de generación de
// imágenes, y otro de generación de vídeos»).
// ============================================================================
// EL CATÁLOGO NO ES EL MENÚ. Arriba hay nueve modelos con sus nombres de
// fábrica —«Haiku 4.5», «Fable 5», «gemini-pro-latest»— y esos nombres solo
// significan algo si ya sabes quién los hace y cuánto valen. Para elegir hace
// falta otra cosa: cuánto quieres gastarte y en qué. Eso son tres niveles.
//
// El catálogo sigue entero y se sigue usando: el router automático elige entre
// los nueve, y quien ya tenga guardado un modelo concreto lo conserva. Esto es
// una VISTA del catálogo, no un catálogo nuevo — si fuera otra lista, un día
// diría un precio que la de arriba ya no cobra.
export interface NivelModelo {
  clave: 'sencillo' | 'medio' | 'alto' | 'imagen' | 'video';
  label: string;
  /** Qué modelo del catálogo hay detrás. `null` = todavía no hay ninguno. */
  modelo: string | null;
  /** Para qué sirve, en una línea. Va debajo del nombre, con el precio. */
  para: string;
  /** Por qué no se puede elegir todavía. Solo cuando `modelo` es null.
   *
   *  UNA OPCIÓN QUE NO EXISTE TIENE QUE PODER DECIRLO. La alternativa era no
   *  enseñar «vídeos» hasta tenerlo, y entonces quien lo pidió no sabe si se
   *  ignoró o está por llegar; o enseñarlo como si funcionara, y entonces se
   *  pulsa y no pasa nada. Se enseña, apagado, con el motivo escrito. */
  porQueNo?: string;
}

export const NIVELES_MODELO: NivelModelo[] = [
  {
    clave: 'sencillo', label: 'Modelo sencillo', modelo: 'abierto-rapido',
    para: 'Preguntas cortas, buscar algo, charlar.',
  },
  {
    clave: 'medio', label: 'Modelo medio', modelo: 'abierto-medio',
    para: 'El de cada día: crear cosas, resumir, organizar.',
  },
  {
    clave: 'alto', label: 'Modelo alto', modelo: 'claude-sonnet-5',
    para: 'Textos largos, documentos y razonar de verdad.',
  },
  {
    clave: 'imagen', label: 'Generar imágenes', modelo: NANO_BANANA_CATALOG_MODEL,
    para: 'Dibuja una imagen a partir de lo que le describas.',
  },
  {
    clave: 'video', label: 'Generar vídeos', modelo: null,
    para: 'Crear un vídeo a partir de una descripción.',
    // Ningún conector de esta plataforma genera vídeo hoy. Decirlo es más
    // barato que dejar un botón que no hace nada.
    porQueNo: 'Todavía no hay ningún generador de vídeo conectado.',
  },
];
