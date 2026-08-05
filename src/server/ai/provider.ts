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
export const AI_MODELS: Record<string, { label: string; hint: string; input: number; output: number }> = {
  'claude-haiku-4-5': { label: 'Haiku 4.5',  hint: 'Rápido y económico',        input: 100,  output: 500 },
  'claude-sonnet-5':  { label: 'Sonnet 5',   hint: 'Equilibrado (recomendado)', input: 300,  output: 1500 },
  'claude-opus-5':    { label: 'Opus 5',     hint: 'Máxima capacidad',          input: 500,  output: 2500 },
  'claude-fable-5':   { label: 'Fable 5',    hint: 'El más potente (premium)',  input: 1000, output: 5000 },
};

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
      max_tokens: req.maxTokens ?? 2048,
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
// Registro de proveedores
// ----------------------------------------------------------------------------
// Añadir OpenAI/Gemini/Mistral en el futuro es implementar `AIProvider` y
// registrarlo aquí. Ningún otro archivo cambia.
const providers: Record<string, AIProvider> = {
  claude: new ClaudeProvider(),
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
