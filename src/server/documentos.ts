import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import path from 'node:path';
import { completarClaudeStream, getProvider, AI_PLATFORM_FEE } from './ai/provider.js';
import {
  type Bloque, markdownABloques, bloquesAMarkdown, tituloDeBloques, tokenizarInline,
} from '../utils/bloques.js';

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

/** Ventana + permiso de lectura/edición resueltos, o null si ya respondió. */
async function cargarDocumento(db: any, req: Request, res: Response, id: string, paraEditar = false) {
  const r = await db.execute(sql`
    SELECT id, title, kind, config, publico, creator_user_id, deleted_at
    FROM knowledge_windows WHERE id = ${id} AND archived_at IS NULL
  `);
  const w = r.rows[0] as any;
  if (!w || w.deleted_at || w.kind !== 'pagina') { res.status(404).json({ error: 'No existe.' }); return null; }
  const esAutor = !!req.user && req.user.id === w.creator_user_id;
  const esAdmin = ((req.user?.roleLevel ?? 0) >= 4);
  if (paraEditar ? !(esAutor || esAdmin) : (!w.publico && !esAutor && !esAdmin)) {
    res.status(403).json({ error: paraEditar ? 'Solo el autor puede hacerlo.' : 'Este documento es privado.' });
    return null;
  }
  return w;
}

const nombreArchivo = (titulo: string, ext: string) =>
  `${(titulo || 'documento').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 60) || 'documento'}.${ext}`;

/** Ruta local de una imagen subida (/uploads/…), o null si es externa. */
function rutaImagenLocal(url?: string): string | null {
  if (!url || !url.startsWith('/uploads/')) return null;
  const raiz = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
  const rel = url.replace('/uploads/', '');
  if (rel.includes('..')) return null;
  return path.join(raiz, rel);
}

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

  /**
   * POST /api/documentos   { titulo? }
   * Un documento EN BLANCO, sin IA: nace privado con un párrafo vacío y se
   * abre en /documentos/:id para escribir a mano. Lo usa el creador de
   * publicaciones de Explorar (2026-08-08).
   */
  app.post('/api/documentos', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión para crear documentos.' });
      const titulo = String(req.body?.titulo || '').trim() || 'Documento sin título';
      const id = newId('KW');
      const bloques = [{ id: `B${Date.now().toString(36)}0`, tipo: 'parrafo', texto: '' }];
      await db.execute(sql`
        INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by)
        VALUES (${id}, ${titulo}, 'pagina', ${JSON.stringify({ bloques })}::jsonb,
                false, ${req.user.id}, false, ${req.user.id}, ${req.user.id})
      `);
      res.json({ id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * POST /api/ai/documento-bloque   { window_id, accion: 'mejorar'|'continuar', texto? }
   * IA dentro del documento (Fase 2): «mejorar» reescribe el texto de un
   * bloque; «continuar» añade contenido nuevo al final teniendo el documento
   * entero como contexto. Respuesta corta y sin streaming: no lo necesita.
   */
  app.post('/api/ai/documento-bloque', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const { window_id, accion, texto } = req.body || {};
      if (!['mejorar', 'continuar'].includes(accion)) {
        return res.status(400).json({ error: 'Acción no reconocida (mejorar | continuar).' });
      }
      const w = await cargarDocumento(db, req, res, String(window_id || ''), true);
      if (!w) return;

      const md = bloquesAMarkdown((w.config?.bloques || []) as Bloque[]);
      const provider = getProvider('claude');
      const encargo = accion === 'mejorar'
        ? `Este es un documento titulado «${w.title}»:\n\n${md.slice(0, 6000)}\n\nReescribe SOLO este fragmento mejorando claridad y estilo, en el mismo idioma, conservando su formato markdown inline (negritas, enlaces). Devuelve únicamente el fragmento reescrito, sin comentarios:\n\n${String(texto || '')}`
        : `Este es un documento titulado «${w.title}»:\n\n${md.slice(0, 6000)}\n\nContinúa el documento desde donde termina, con 1-3 secciones o párrafos nuevos coherentes con lo anterior, en markdown (títulos ##, listas, tablas si procede). Devuelve únicamente la continuación, sin comentarios.`;

      const r = await provider.complete({
        system: SYSTEM_DOCUMENTO,
        messages: [{ role: 'user', content: encargo }],
        maxTokens: 2048,
      });

      db.execute(sql`
        INSERT INTO ai_usage_charges (user_id, kind, model, input_tokens, output_tokens, cost_cents, fee_cents, total_cents)
        VALUES (${req.user.id}, 'documento', ${r.model}, ${r.inputTokens}, ${r.outputTokens},
                ${r.costCents}, ${r.costCents * AI_PLATFORM_FEE}, ${r.costCents * (1 + AI_PLATFORM_FEE)})
      `).catch((e: any) => console.error('documento charge error:', e));

      if (accion === 'mejorar') {
        res.json({ texto: r.text.trim() });
      } else {
        res.json({ bloques: markdownABloques(r.text) });
      }
    } catch (e: any) {
      console.error('documento-bloque error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/documentos/:id/docx — el documento como Word de verdad.
   * Los bloques se traducen a párrafos/tablas del paquete `docx`; el marcado
   * inline (negrita, cursiva, código, enlaces) pasa por `tokenizarInline`
   * para convertirse en runs con formato, no en asteriscos literales.
   */
  app.get('/api/documentos/:id/docx', async (req: Request, res: Response) => {
    try {
      const w = await cargarDocumento(db, req, res, req.params.id);
      if (!w) return;
      const docx = await import('docx');
      const {
        Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow,
        TableCell, WidthType, ExternalHyperlink, ImageRun,
      } = docx;

      const runs = (texto: string, extra: Record<string, any> = {}) =>
        tokenizarInline(texto).map(t => t.enlace
          ? new ExternalHyperlink({
              children: [new TextRun({ text: t.texto, style: 'Hyperlink' })],
              link: t.enlace,
            })
          : new TextRun({
              text: t.texto, bold: t.negrita, italics: t.cursiva,
              font: t.codigo ? 'Courier New' : undefined, ...extra,
            }));

      const hijos: any[] = [new Paragraph({ text: w.title, heading: HeadingLevel.TITLE })];
      const bloques: Bloque[] = w.config?.bloques || [];
      for (const b of bloques) {
        const texto = b.texto || '';
        switch (b.tipo) {
          case 'titulo1': hijos.push(new Paragraph({ children: runs(texto), heading: HeadingLevel.HEADING_1 })); break;
          case 'titulo2': hijos.push(new Paragraph({ children: runs(texto), heading: HeadingLevel.HEADING_2 })); break;
          case 'titulo3': hijos.push(new Paragraph({ children: runs(texto), heading: HeadingLevel.HEADING_3 })); break;
          case 'lista': hijos.push(new Paragraph({ children: runs(texto), bullet: { level: 0 } })); break;
          case 'numerada': hijos.push(new Paragraph({ children: runs(texto), numbering: { reference: 'numerada', level: 0 } })); break;
          case 'tarea': hijos.push(new Paragraph({ children: [new TextRun({ text: b.hecho ? '☑ ' : '☐ ' }), ...runs(texto)] })); break;
          case 'cita': hijos.push(new Paragraph({ children: runs(texto, { italics: true }), indent: { left: 720 } })); break;
          case 'separador': hijos.push(new Paragraph({ text: '⸻' })); break;
          case 'codigo':
            for (const linea of texto.split('\n')) {
              hijos.push(new Paragraph({ children: [new TextRun({ text: linea, font: 'Courier New', size: 18 })] }));
            }
            break;
          case 'imagen': {
            const ruta = rutaImagenLocal(b.url);
            if (ruta) {
              try {
                const { readFileSync } = await import('node:fs');
                const ext = path.extname(ruta).slice(1).toLowerCase();
                hijos.push(new Paragraph({
                  children: [new ImageRun({
                    data: readFileSync(ruta),
                    transformation: { width: 480, height: 320 },
                    type: (ext === 'jpg' ? 'jpg' : ext) as any,
                  })],
                }));
              } catch { /* imagen ilegible: se omite */ }
            }
            if (b.pie) hijos.push(new Paragraph({ children: runs(b.pie, { italics: true, size: 18 }) }));
            break;
          }
          case 'tabla': {
            const filas = b.filas || [];
            if (!filas.length) break;
            hijos.push(new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: filas.map((fila, fi) => new TableRow({
                children: fila.map(celda => new TableCell({
                  children: [new Paragraph({ children: runs(celda, fi === 0 ? { bold: true } : {}) })],
                })),
              })),
            }));
            break;
          }
          case 'publicacion':
            hijos.push(new Paragraph({
              children: [new TextRun({ text: `▣ ${b.pubTitulo || 'Publicación'} (en humanity.wiki)`, italics: true })],
            }));
            break;
          default: hijos.push(new Paragraph({ children: runs(texto) }));
        }
      }

      const doc = new Document({
        numbering: { config: [{ reference: 'numerada', levels: [{ level: 0, format: 'decimal' as any, text: '%1.', alignment: 'start' as any }] }] },
        sections: [{ children: hijos }],
      });
      const buffer = await Packer.toBuffer(doc);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo(w.title, 'docx')}"`);
      res.send(Buffer.from(buffer));
    } catch (e: any) {
      console.error('docx error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/documentos/:id/pdf — el documento como PDF, generado con pdfkit
   * en el servidor (sin depender del diálogo de imprimir del navegador).
   */
  app.get('/api/documentos/:id/pdf', async (req: Request, res: Response) => {
    try {
      const w = await cargarDocumento(db, req, res, req.params.id);
      if (!w) return;
      const PDFDocument = (await import('pdfkit')).default;
      const doc = new PDFDocument({ size: 'A4', margins: { top: 64, bottom: 64, left: 64, right: 64 } });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo(w.title, 'pdf')}"`);
      doc.pipe(res);

      /** Texto con marcado inline → tramos `continued` con la fuente adecuada. */
      const escribir = (texto: string, tamano: number, base: 'Helvetica' | 'Helvetica-Bold' = 'Helvetica', opts: any = {}) => {
        const tramos = tokenizarInline(texto);
        tramos.forEach((t, i) => {
          const fuente = t.codigo ? 'Courier'
            : t.negrita ? 'Helvetica-Bold'
            : t.cursiva ? 'Helvetica-Oblique'
            : base;
          doc.font(fuente).fontSize(tamano).fillColor(t.enlace ? '#047857' : '#1e293b');
          doc.text(t.texto, { ...opts, continued: i < tramos.length - 1, link: t.enlace || undefined, underline: !!t.enlace });
        });
      };

      doc.font('Helvetica-Bold').fontSize(24).fillColor('#0f172a').text(w.title);
      doc.moveDown(0.8);

      const bloques: Bloque[] = w.config?.bloques || [];
      for (const b of bloques) {
        const texto = b.texto || '';
        switch (b.tipo) {
          case 'titulo1': doc.moveDown(0.6); escribir(texto, 18, 'Helvetica-Bold'); doc.moveDown(0.3); break;
          case 'titulo2': doc.moveDown(0.5); escribir(texto, 14, 'Helvetica-Bold'); doc.moveDown(0.25); break;
          case 'titulo3': doc.moveDown(0.4); escribir(texto, 12, 'Helvetica-Bold'); doc.moveDown(0.2); break;
          case 'lista': escribir(`• ${texto}`, 10.5, 'Helvetica', { indent: 12 }); doc.moveDown(0.15); break;
          case 'numerada': escribir(`– ${texto}`, 10.5, 'Helvetica', { indent: 12 }); doc.moveDown(0.15); break;
          case 'tarea': escribir(`${b.hecho ? '☑' : '☐'} ${texto}`, 10.5); doc.moveDown(0.15); break;
          case 'cita':
            doc.moveDown(0.2);
            doc.font('Helvetica-Oblique').fontSize(10.5).fillColor('#475569').text(texto.replace(/\n/g, ' '), { indent: 20 });
            doc.moveDown(0.3);
            break;
          case 'separador':
            doc.moveDown(0.4);
            doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor('#cbd5e1').stroke();
            doc.moveDown(0.4);
            break;
          case 'codigo':
            doc.moveDown(0.2);
            doc.font('Courier').fontSize(8.5).fillColor('#334155').text(texto);
            doc.moveDown(0.3);
            break;
          case 'imagen': {
            const ruta = rutaImagenLocal(b.url);
            if (ruta) {
              try { doc.moveDown(0.3); doc.image(ruta, { fit: [460, 320] }); doc.moveDown(0.3); } catch { /* se omite */ }
            }
            if (b.pie) { doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#64748b').text(b.pie); doc.moveDown(0.2); }
            break;
          }
          case 'tabla': {
            const filas = b.filas || [];
            if (!filas.length) break;
            doc.moveDown(0.3);
            const ancho = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / (filas[0].length || 1);
            const fondoPagina = () => doc.page.height - doc.page.margins.bottom;
            for (let fi = 0; fi < filas.length; fi++) {
              // Una tabla larga salta de página fila a fila, repitiendo la
              // cabecera para que la continuación se entienda sola.
              if (doc.y + 24 > fondoPagina()) {
                doc.addPage();
                if (fi > 0) {
                  const yCab = doc.y;
                  let altoCab = 0;
                  filas[0].forEach((celda, ci) => {
                    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b');
                    doc.text(celda.replace(/\*\*/g, ''), doc.page.margins.left + ci * ancho + 4, yCab + 3, { width: ancho - 8 });
                    altoCab = Math.max(altoCab, doc.y - yCab);
                  });
                  doc.y = yCab + altoCab + 6;
                  doc.moveTo(doc.page.margins.left, doc.y - 2).lineTo(doc.page.width - doc.page.margins.right, doc.y - 2).strokeColor('#cbd5e1').stroke();
                }
              }
              const y0 = doc.y;
              let alto = 0;
              filas[fi].forEach((celda, ci) => {
                // El marcado inline de la celda (negritas, código) se respeta
                // igual que en los párrafos, tramo a tramo con `continued`.
                const x = doc.page.margins.left + ci * ancho + 4;
                const tramos = tokenizarInline(celda);
                tramos.forEach((t, ti) => {
                  doc.font(fi === 0 || t.negrita ? 'Helvetica-Bold' : t.codigo ? 'Courier' : t.cursiva ? 'Helvetica-Oblique' : 'Helvetica')
                    .fontSize(9).fillColor('#1e293b');
                  if (ti === 0) doc.text(t.texto, x, y0 + 3, { width: ancho - 8, continued: ti < tramos.length - 1 });
                  else doc.text(t.texto, { width: ancho - 8, continued: ti < tramos.length - 1 });
                });
                alto = Math.max(alto, doc.y - y0);
              });
              doc.y = y0 + alto + 6;
              doc.moveTo(doc.page.margins.left, doc.y - 2).lineTo(doc.page.width - doc.page.margins.right, doc.y - 2).strokeColor('#e2e8f0').stroke();
            }
            doc.x = doc.page.margins.left;
            doc.moveDown(0.3);
            break;
          }
          case 'publicacion':
            escribir(`▣ ${b.pubTitulo || 'Publicación'} — humanity.wiki${b.pubUrl || ''}`, 10, 'Helvetica-Bold');
            doc.moveDown(0.2);
            break;
          default: escribir(texto, 10.5); doc.moveDown(0.35);
        }
      }
      doc.end();
    } catch (e: any) {
      console.error('pdf error:', e);
      if (!res.headersSent) res.status(500).json({ error: e.message });
      else res.end();
    }
  });
}
