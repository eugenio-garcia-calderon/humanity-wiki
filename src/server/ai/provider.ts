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
  inputTokens: number;
  outputTokens: number;
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

export const AI_MODELS: Record<string, { label: string; hint: string; input: number; output: number; image?: boolean }> = {
  'claude-haiku-4-5': { label: 'Haiku 4.5',  hint: 'Rápido y económico',        input: 100,  output: 500 },
  'claude-sonnet-5':  { label: 'Sonnet 5',   hint: 'Equilibrado (recomendado)', input: 300,  output: 1500 },
  'claude-opus-5':    { label: 'Opus 5',     hint: 'Máxima capacidad',          input: 500,  output: 2500 },
  'claude-fable-5':   { label: 'Fable 5',    hint: 'El más potente (premium)',  input: 1000, output: 5000 },
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
  'gemini-flash-latest': { label: 'Gemini Flash', hint: 'Rápido, de Google',    input: 30,  output: 250 },
  'gemini-pro-latest':   { label: 'Gemini Pro',   hint: 'Más capaz, de Google', input: 125, output: 1000 },
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
  return model?.startsWith('gemini-') ? 'gemini' : 'claude';
}

/** Comisión de la plataforma sobre el coste de créditos de Anthropic. */
export const AI_PLATFORM_FEE = 0.5;

// Precio del modelo por defecto de la plataforma (respuestas automáticas de
// la IA, comentarios, etc. — no facturadas al usuario).
const PRICE_PER_MTOK = { input: 300, output: 1500 }; // céntimos de € por millón

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
      // 8192: crear un grafo entero (ventanas+aristas en el bloque de acciones)
      // no cabía en 2048 y el JSON llegaba truncado sin cerrar el bloque.
      max_tokens: req.maxTokens ?? 8192,
      temperature: req.temperature ?? 0.2,
      system: req.system,
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

    const inputTokens = json.usage?.input_tokens ?? 0;
    const outputTokens = json.usage?.output_tokens ?? 0;

    const price = AI_MODELS[model] || PRICE_PER_MTOK;
    return {
      text,
      model: json.model || model,
      inputTokens,
      outputTokens,
      costCents:
        (inputTokens / 1_000_000) * price.input +
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
      systemInstruction: { parts: [{ text: req.system }] },
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
      temperature: 0.3,
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
// Registro de proveedores
// ----------------------------------------------------------------------------
// Añadir OpenAI/Mistral en el futuro es implementar `AIProvider` y
// registrarlo aquí. Ningún otro archivo cambia.
const providers: Record<string, AIProvider> = {
  claude: new ClaudeProvider(),
  gemini: new GeminiProvider(),
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
