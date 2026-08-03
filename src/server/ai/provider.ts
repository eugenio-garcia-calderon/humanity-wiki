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

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AICompletionRequest {
  system: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface AICompletionResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Coste estimado en céntimos de euro. */
  costCents: number;
  durationMs: number;
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

// Precios por millón de tokens en dólares, convertidos a céntimos de euro con
// una tasa aproximada. Sirve para el panel de costes del administrador; no es
// facturación real.
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

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: req.maxTokens ?? 2048,
        temperature: req.temperature ?? 0.2,
        system: req.system,
        messages: req.messages,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Error de la API de Claude (${res.status}): ${detail.slice(0, 300)}`);
    }

    const json: any = await res.json();
    const text = (json.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n');

    const inputTokens = json.usage?.input_tokens ?? 0;
    const outputTokens = json.usage?.output_tokens ?? 0;

    return {
      text,
      model: json.model || CLAUDE_MODEL,
      inputTokens,
      outputTokens,
      costCents:
        (inputTokens / 1_000_000) * PRICE_PER_MTOK.input +
        (outputTokens / 1_000_000) * PRICE_PER_MTOK.output,
      durationMs: Date.now() - started,
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
