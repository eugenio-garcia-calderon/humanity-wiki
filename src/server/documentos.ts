import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { completarClaudeStream, AI_PLATFORM_FEE } from './ai/provider.js';
import { markdownABloques, tituloDeBloques } from '../utils/bloques.js';

// ============================================================================
// DOCUMENTOS estilo Notion (2026-08-08, petición del usuario) — Fase 1
// ============================================================================
// «Haz que el chat tenga la capacidad de generar documentos, y que esos
// documentos aparezcan en la pantalla como un documento generado, que según
// lo va generando aparece, y se guarda en las publicaciones del usuario.»
//
// Un documento es una ventana `kind = 'pagina'` cuyo contenido vive en
// `config.bloques` (ver src/utils/bloques.ts, compartido con el cliente).
// Al ser una ventana, hereda GRATIS visibilidad, colaboradores, carpetas,
// papelera y las tres rutas comunes de /api/publicaciones — nada nuevo que
// mantener.
//
// La generación transmite por SSE: un evento `inicio` con el id de la
// ventana recién creada (privada), eventos `delta` con cada trozo de texto
// según lo escribe el modelo, y un `fin` cuando el servidor ya ha guardado
// los bloques definitivos — así, aunque el navegador se cierre a mitad, el
// documento queda guardado igualmente en el servidor.

const newId = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;

const SYSTEM_DOCUMENTO = `Eres el redactor de documentos de humanity.wiki, una plataforma de conocimiento en español.
Tu única salida es el DOCUMENTO pedido, en markdown, sin ningún comentario antes ni después (nada de «Aquí tienes…» ni preguntas finales).
Reglas:
- Empieza SIEMPRE con un título de nivel 1 (# Título) corto y claro.
- Estructura con títulos de nivel 2 y 3, listas, tablas cuando los datos lo pidan, y citas para testimonios o fragmentos literales.
- Escribe en el idioma en el que se te pide el documento (normalmente español).
- Sé completo pero sin relleno: cada sección debe aportar algo.`;

export function registerDocumentosRoutes(app: Express, db: any) {
  /**
   * GET /api/windows/:id — una ventana suelta, con permisos resueltos.
   * No existía: las ventanas siempre viajaban dentro de un grafo o de la
   * lista de publicaciones. La página del documento necesita cargar una sola.
   */
  app.get('/api/windows/:id', async (req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`
        SELECT id, title, kind, config, publico, creator_user_id, views, created_at, updated_at, deleted_at
        FROM knowledge_windows WHERE id = ${req.params.id} AND archived_at IS NULL
      `);
      const w = r.rows[0] as any;
      if (!w || w.deleted_at) return res.status(404).json({ error: 'No existe.' });
      const esAutor = !!req.user && req.user.id === w.creator_user_id;
      const esAdmin = (req.user?.roleLevel ?? 0) >= 4;
      if (!w.publico && !esAutor && !esAdmin) {
        return res.status(403).json({ error: 'Este documento es privado.' });
      }
      const autor = await db.execute(sql`SELECT COALESCE(display_name, name, email) AS nombre FROM users WHERE id = ${w.creator_user_id}`);
      res.json({ ...w, autor_nombre: (autor.rows[0] as any)?.nombre || null, puedo_editar: esAutor || esAdmin });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * POST /api/ai/documento   { prompt, conversation_id? }   →  SSE
   * Crea el documento (privado, del usuario) y lo escribe en directo.
   * Si viene de una conversación del chat, los últimos mensajes acompañan al
   * encargo — «dámelo en forma de documento» necesita saber qué es «lo».
   */
  app.post('/api/ai/documento', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión para crear documentos.' });
    const prompt = String(req.body?.prompt || '').trim();
    if (!prompt) return res.status(400).json({ error: 'Falta describir el documento que quieres.' });

    try {
      let contexto = '';
      const conversationId = req.body?.conversation_id;
      if (conversationId) {
        const historia = await db.execute(sql`
          SELECT role, content FROM ai_messages
          WHERE conversation_id = ${conversationId} ORDER BY created_at DESC LIMIT 10
        `);
        const lineas = (historia.rows as any[])
          .reverse()
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${String(m.content).slice(0, 2000)}`);
        if (lineas.length) contexto = `Conversación previa (para contexto):\n${lineas.join('\n')}\n\n`;
      }

      const id = newId('KW');
      await db.execute(sql`
        INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by)
        VALUES (${id}, 'Documento en preparación…', 'pagina', '{"bloques":[]}'::jsonb,
                false, ${req.user.id}, true, ${req.user.id}, ${req.user.id})
      `);

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write(`event: inicio\ndata: ${JSON.stringify({ id })}\n\n`);

      const resultado = await completarClaudeStream(
        {
          system: SYSTEM_DOCUMENTO,
          messages: [{ role: 'user', content: `${contexto}Encargo del documento: ${prompt}` }],
        },
        delta => res.write(`event: delta\ndata: ${JSON.stringify({ t: delta })}\n\n`),
      );

      let bloques = markdownABloques(resultado.texto);
      const titulo = tituloDeBloques(bloques, prompt.slice(0, 100));
      // El primer H1 pasa a ser el título de la ventana: dejarlo también como
      // bloque lo duplicaría en pantalla.
      if (bloques[0]?.tipo === 'titulo1') bloques = bloques.slice(1);
      await db.execute(sql`
        UPDATE knowledge_windows SET
          title = ${titulo},
          config = ${JSON.stringify({ bloques })}::jsonb,
          version = version + 1, updated_at = now(), updated_by = ${req.user.id}
        WHERE id = ${id}
      `);

      db.execute(sql`
        INSERT INTO ai_usage_charges (user_id, kind, model, input_tokens, output_tokens, cost_cents, fee_cents, total_cents)
        VALUES (${req.user.id}, 'documento', ${resultado.model}, ${resultado.inputTokens}, ${resultado.outputTokens},
                ${resultado.costCents}, ${resultado.costCents * AI_PLATFORM_FEE}, ${resultado.costCents * (1 + AI_PLATFORM_FEE)})
      `).catch((e: any) => console.error('documento charge error:', e));

      res.write(`event: fin\ndata: ${JSON.stringify({ id, titulo, durationMs: resultado.durationMs })}\n\n`);
      res.end();
    } catch (e: any) {
      console.error('documento error:', e);
      // Si la cabecera SSE ya salió, el error viaja como evento; si no, como JSON normal.
      if (res.headersSent) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: e.message })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: e.message });
      }
    }
  });
}
