// ============================================================================
// LA IA DE LA CASA — un modelo abierto que corre en nuestro servidor (2026-10-02)
// ============================================================================
// Eugenio: «que el modelo que se utilice sea un modelo que corra en nuestro
// propio servidor sin gastar ningún tipo de crédito de ningún servidor ni
// ninguna IA externa».
//
// Talks to llama.cpp's `llama-server` (the `llm` service in
// `docker-compose.prod.yml`) through its OpenAI-compatible endpoint. The model
// is Qwen2.5-1.5B-Instruct (Apache-2.0), quantised to ~1 GB.
//
// ── WHAT IT IS FOR, AND WHAT IT IS NOT ──────────────────────────────────────
// A 1.5B model on two CPU cores is not a writer. It is used for ONE job:
// turning a sentence into the slots of a preprogrammed recipe
// (`rellenarPorChat.ts`), with its output forced into a JSON schema by the
// server's grammar — it cannot answer anything that is not that JSON. The
// writing to the database is done by ordinary code, never by the model.
//
// ── ONE AT A TIME ───────────────────────────────────────────────────────────
// The production machine has 2 vCPU shared with the whole site. A second
// request while one is running would not be faster, only make both slower and
// the site with them. So: one in flight, two waiting, the rest told «busy».

const URL_LLM = () => (process.env.LLM_LOCAL_URL || 'http://llm:8080').replace(/\/$/, '');

let enCurso = 0;
const cola: Array<() => void> = [];
const MAX_EN_COLA = 2;

export class IaLocalNoDisponible extends Error {}
export class IaLocalOcupada extends Error {}
/** Answered, but not valid JSON: treat as «not understood», not as «down». */
export class IaLocalIlegible extends Error {}

async function turno<T>(fn: () => Promise<T>): Promise<T> {
  if (enCurso >= 1) {
    if (cola.length >= MAX_EN_COLA) throw new IaLocalOcupada('La IA gratuita está ocupada. Prueba en unos segundos.');
    await new Promise<void>(r => cola.push(r));
  }
  enCurso++;
  try { return await fn(); }
  finally { enCurso--; cola.shift()?.(); }
}

/** ¿Está el modelo cargado y respondiendo? Barato: no genera nada. */
export async function iaLocalLista(): Promise<boolean> {
  try {
    const r = await fetch(`${URL_LLM()}/health`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
}

/**
 * Pide al modelo un JSON que cumpla `esquema`. Temperatura 0: la misma frase
 * debe dar la misma propuesta, o nadie podría fiarse de lo que va a guardar.
 */
export async function pedirJsonLocal(opts: {
  sistema: string; usuario: string; esquema: object; maxTokens?: number;
}): Promise<{ json: any; ms: number }> {
  return turno(async () => {
    const t0 = Date.now();
    let r: Response;
    try {
      r = await fetch(`${URL_LLM()}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(60_000),
        body: JSON.stringify({
          messages: [{ role: 'system', content: opts.sistema }, { role: 'user', content: opts.usuario }],
          temperature: 0,
          max_tokens: opts.maxTokens ?? 300,
          response_format: { type: 'json_schema', json_schema: { name: 'propuesta', schema: opts.esquema } },
        }),
      });
    } catch (e: any) {
      throw new IaLocalNoDisponible(/Timeout|abort/i.test(String(e?.name || e?.message))
        ? 'La IA gratuita ha tardado demasiado.'
        : 'La IA gratuita no está disponible ahora mismo.');
    }
    if (!r.ok) throw new IaLocalNoDisponible(`La IA gratuita ha fallado (código ${r.status}).`);
    const j: any = await r.json();
    const texto = j?.choices?.[0]?.message?.content ?? '';
    try { return { json: JSON.parse(texto), ms: Date.now() - t0 }; }
    catch { throw new IaLocalIlegible('La IA gratuita ha devuelto algo que no se entiende.'); }
  });
}
