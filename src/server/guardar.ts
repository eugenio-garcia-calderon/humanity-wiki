import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

// ============================================================================
// GUARDAR DE INTERNET (2026-08-20, petición de Eugenio: «cuando esté navegando
// en internet, en YouTube por ejemplo, tener un botón mágico para guardar y
// compartir ese vídeo en una de las herramientas dentro de uno de los
// proyectos»).
// ============================================================================
// DOS VELOCIDADES EN EL MISMO BOTÓN, que es lo que se acordó:
//
//   · UN CLIC — se guarda en «Sin clasificar» y sigues viendo el vídeo. Cero
//     decisiones: interrumpir para preguntar «¿dónde?» es lo que hace que
//     nadie use un botón de guardar.
//   · LA FLECHITA — eliges proyecto. Para cuando ya sabes dónde va.
//
// LO QUE SE GUARDA NO ES UN TIPO NUEVO: es un `knowledge_windows`, como todo
// lo demás. Un vídeo de YouTube es `kind='video'` y cualquier otra página es
// `kind='enlace'` — los dos tipos ya existían y ya se saben pintar. Por eso lo
// guardado aparece solo en Archivos y en el árbol del proyecto sin tocar nada
// más.
//
// LA TRANSCRIPCIÓN se guarda dentro del mismo `config`. Es lo que convierte un
// enlace guardado en algo que puedes BUSCAR: sin ella, «aquel vídeo donde
// hablaban de baterías LFP» no se encuentra jamás.

const nuevoId = () =>
  `KW${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;

/** El identificador de un vídeo de YouTube, en cualquiera de sus formas. */
export function idDeYoutube(url: string): string | null {
  return url.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/)([\w-]{11})/)?.[1] || null;
}

/**
 * LA TRANSCRIPCIÓN DE UN VÍDEO DE YOUTUBE.
 *
 * No hay una API pública para esto, así que se hace lo que se puede: se pide
 * la página del vídeo y se busca dentro la lista de pistas de subtítulos que
 * el reproductor lleva incrustada. De ahí sale una dirección con el texto en
 * XML, que se limpia.
 *
 * ESTO ES FRÁGIL A PROPÓSITO Y SE ASUME: YouTube cambia el formato de esa
 * página cuando quiere, y el día que lo cambie esto dejará de encontrar la
 * pista. Por eso **nunca hace fallar el guardado**: si no hay transcripción,
 * el vídeo se guarda igual y se dice que no la tiene. La alternativa —una
 * biblioteca que hace lo mismo— tendría la misma fragilidad más una
 * dependencia que mantener.
 *
 * Solo se cogen subtítulos que el vídeo YA TIENE. No se transcribe audio: eso
 * sería mandar el vídeo a un modelo de voz, y cuesta dinero por minuto.
 */
/**
 * Saca el array de `captionTracks` de la página, CONTANDO CORCHETES.
 *
 * Con una expresión regular no vale, y esto costó un rato: `\[.*?\]` corta en
 * el PRIMER corchete de cierre, que no es el del array — dentro de cada pista
 * hay otro array anidado (`"name":{"runs":[…]}`). El resultado era un JSON
 * partido por la mitad, `JSON.parse` fallaba, y como el fallo se traga y
 * devuelve null, parecía que NINGÚN vídeo tenía subtítulos. Recorrer contando
 * es feo pero es correcto.
 */
function extraerPistas(pagina: string) {
  const marca = '"captionTracks":';
  const i = pagina.indexOf(marca);
  if (i < 0) return null;
  const inicio = pagina.indexOf('[', i);
  if (inicio < 0) return null;

  let nivel = 0, dentroDeTexto = false, escapado = false;
  for (let j = inicio; j < pagina.length; j++) {
    const c = pagina[j];
    if (escapado) { escapado = false; continue; }
    if (c === '\\') { escapado = true; continue; }
    if (c === '"') { dentroDeTexto = !dentroDeTexto; continue; }
    if (dentroDeTexto) continue;
    if (c === '[') nivel++;
    else if (c === ']') {
      nivel--;
      if (nivel === 0) {
        try {
          return JSON.parse(pagina.slice(inicio, j + 1)) as Array<{
            baseUrl: string; languageCode: string; kind?: string;
          }>;
        } catch { return null; }
      }
    }
  }
  return null;
}

async function transcripcionDeYoutube(videoId: string): Promise<{ texto: string; idioma: string } | null> {
  try {
    const ctrl = new AbortController();
    const corte = setTimeout(() => ctrl.abort(), 12000);
    const pagina = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      signal: ctrl.signal,
      headers: {
        // Sin un agente de navegador, YouTube devuelve una página distinta y
        // sin las pistas dentro.
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        // EL MURO DE COOKIES. Sin esto, YouTube devuelve la pantalla de
        // «Antes de ir a YouTube» en vez del vídeo, y dentro no hay ninguna
        // pista de subtítulos: la transcripción fallaba SIEMPRE y parecía que
        // ningún vídeo tenía subtítulos (visto al probarlo, 2026-08-20).
        //
        // Esto NO acepta nada en nombre de nadie: es una petición anónima del
        // servidor, sin la sesión de Eugenio ni cuenta ninguna de por medio.
        // Lo único que dice es «sírveme la página, no el aviso».
        Cookie: 'SOCS=CAISEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg',
      },
    }).then(r => r.text()).finally(() => clearTimeout(corte));

    const pistas = extraerPistas(pagina);
    if (!pistas?.length) return null;

    // Se prefiere el español, luego el inglés, luego lo que haya. Y entre dos
    // del mismo idioma, la escrita a mano antes que la automática: la
    // automática no tiene puntuación y se lee mucho peor.
    const puntua = (p: typeof pistas[0]) =>
      (p.languageCode?.startsWith('es') ? 0 : p.languageCode?.startsWith('en') ? 1 : 2) * 10
      + (p.kind === 'asr' ? 1 : 0);
    const pista = [...pistas].sort((a, b) => puntua(a) - puntua(b))[0];
    if (!pista?.baseUrl) return null;

    const ctrl2 = new AbortController();
    const corte2 = setTimeout(() => ctrl2.abort(), 12000);
    const xml = await fetch(pista.baseUrl, { signal: ctrl2.signal })
      .then(r => r.text()).finally(() => clearTimeout(corte2));

    const texto = (xml.match(/<text[^>]*>([\s\S]*?)<\/text>/g) || [])
      .map(t => t.replace(/<[^>]+>/g, ''))
      .join(' ')
      // Las entidades que trae el XML de YouTube, en el orden que toca: el
      // «&amp;» va el último o se desharían las demás dos veces.
      .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();

    if (!texto) return null;
    // Tope: una transcripción de tres horas son cientos de miles de caracteres
    // en una fila jsonb que se lee entera cada vez que abres Archivos.
    return { texto: texto.slice(0, 200_000), idioma: pista.languageCode || '' };
  } catch {
    return null;
  }
}

/** Le pide la transcripción al Chromium que la persona tiene abierto. Se
 *  llama a la propia API por dentro para no duplicar la lógica del panel de
 *  YouTube, que ya vive en el módulo del navegador remoto. */
async function transcripcionDelNavegador(req: Request, sesion: string) {
  try {
    const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
    const r = await fetch(`${base}/api/navegador/remoto/${encodeURIComponent(sesion)}/transcripcion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: req.headers.cookie || '' },
    });
    const d: any = await r.json();
    return d?.texto ? { texto: String(d.texto), idioma: '' } : null;
  } catch { return null; }
}

export function registerGuardarRoutes(app: Express, db: any) {
  /**
   * POST /api/guardar-web  { url, titulo?, imagen?, proyecto_id? }
   * Guarda lo que estás viendo. Sin `proyecto_id` cae en «Sin clasificar».
   */
  app.post('/api/guardar-web', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión para guardar.' });
    try {
      const url = String(req.body?.url || '').trim();
      if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'Esa dirección no vale.' });

      // El proyecto, solo si es tuyo: si no, se guarda suelto en vez de
      // colarse en el de otra persona.
      let proyecto: string | null = null;
      if (req.body?.proyecto_id) {
        const p = await db.execute(sql`
          SELECT creador_user_id FROM proyectos
          WHERE id = ${String(req.body.proyecto_id)} AND archived_at IS NULL
        `);
        if (p.rows.length && ((p.rows[0] as any).creador_user_id === req.user.id
          || (req.user.roleLevel ?? 0) >= 4)) {
          proyecto = String(req.body.proyecto_id);
        }
      }

      const video = idDeYoutube(url);
      const titulo = String(req.body?.titulo || '').trim().slice(0, 300)
        || (video ? 'Vídeo de YouTube' : url.replace(/^https?:\/\//, '').slice(0, 120));

      // LA TRANSCRIPCIÓN. Primero se intenta leerla del Chromium que tienes
      // abierto —el único camino que funciona hoy, ver el comentario de la
      // ruta `…/transcripcion`—; si no hay sesión, se prueba lo anónimo, que
      // sigue valiendo para algún vídeo suelto.
      //
      // Nunca puede tumbar el guardado: si no hay transcripción, el vídeo se
      // guarda igual. Perder el enlace por no tener subtítulos sería absurdo.
      let trans: { texto: string; idioma: string } | null = null;
      if (video) {
        const sesion = String(req.body?.sesion || '').trim();
        if (sesion) {
          trans = await transcripcionDelNavegador(req, sesion);
        }
        if (!trans) trans = await transcripcionDeYoutube(video);
      }

      const config: Record<string, unknown> = video
        ? {
            youtube_id: video,
            url,
            title: titulo,
            image_url: `https://i.ytimg.com/vi/${video}/hqdefault.jpg`,
            transcripcion: trans?.texto || undefined,
            transcripcion_idioma: trans?.idioma || undefined,
          }
        : {
            url,
            title: titulo,
            image_url: (typeof req.body?.imagen === 'string' && req.body.imagen.startsWith('http'))
              ? req.body.imagen : undefined,
          };

      const id = nuevoId();
      await db.execute(sql`
        INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id,
                                       is_ai_generated, created_by, updated_by, proyecto_id)
        VALUES (${id}, ${titulo}, ${video ? 'video' : 'enlace'}, ${JSON.stringify(config)}::jsonb,
                false, ${req.user.id}, false, ${req.user.id}, ${req.user.id}, ${proyecto})
      `);

      res.json({
        id,
        tipo: video ? 'video' : 'enlace',
        proyecto_id: proyecto,
        transcripcion: !!trans,
        // Cuánto se ha guardado, para poder decirlo sin rodeos en la interfaz.
        palabras: trans ? trans.texto.split(/\s+/).length : 0,
      });
    } catch (e: any) {
      console.error('guardar web error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/guardados — lo guardado de internet, para el buzón. */
  app.get('/api/guardados', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const rows = await db.execute(sql`
        SELECT w.id, w.title, w.kind, w.created_at, w.proyecto_id,
               w.config->>'url' AS url,
               w.config->>'image_url' AS imagen,
               w.config->>'youtube_id' AS youtube_id,
               (w.config ? 'transcripcion') AS tiene_transcripcion,
               p.titulo AS proyecto_titulo, p.slug AS proyecto_slug
        FROM knowledge_windows w
        LEFT JOIN proyectos p ON p.id = w.proyecto_id AND p.archived_at IS NULL
        WHERE w.creator_user_id = ${req.user.id}
          AND w.kind IN ('enlace', 'video')
          AND w.config ? 'url'
          AND w.archived_at IS NULL AND w.deleted_at IS NULL
        ORDER BY w.created_at DESC
        LIMIT 300
      `);
      res.json({ guardados: rows.rows });
    } catch (e: any) {
      console.error('guardados error:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
