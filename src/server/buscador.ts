import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { getProvider, providerOfModel } from './ai/provider';

// ============================================================================
// EL BUSCADOR — sugerencias al escribir, resultados y resumen (2026-08-24)
// ============================================================================
// Eugenio: «que según pones una palabra te encuentra dentro de la base de datos
// publicaciones de ese tema… y cuando el usuario le dé a buscar se abre una
// página con esas publicaciones… y también como hace google arriba te aparece
// un pequeño texto generado por la IA».
//
// ── SIN CUENTA, Y POR ESO SOLO LO PÚBLICO ───────────────────────────────────
// Decisión suya: busca cualquiera. Así que TODA consulta de aquí filtra por lo
// que es público. Un buscador abierto que devolviera un borrador es una fuga
// que además nadie descubriría hasta que fuera tarde: el que lo encuentra no
// avisa.
//
// ── POR QUÉ NO REUTILIZO `/api/search` ──────────────────────────────────────
// Existe y funciona, pero devuelve `id`, `uuid`, `label` y `type`: lo justo
// para pintar un nodo del grafo. Un buscador necesita además el TROZO donde
// aparece lo buscado y a DÓNDE lleva cada resultado. Son dos necesidades
// distintas sobre los mismos datos, no la misma función dos veces.

/** Palabras que no ayudan a buscar y ensucian la puntuación. */
const VACIAS = new Set([
  'los', 'las', 'del', 'una', 'unos', 'unas', 'con', 'por', 'para', 'sobre',
  'más', 'mas', 'este', 'esta', 'esto', 'ese', 'esa', 'sus', 'sin', 'entre',
  'desde', 'hasta', 'todo', 'toda', 'todos', 'todas', 'que', 'qué', 'como',
  'cómo', 'cuando', 'cuándo', 'donde', 'dónde', 'quien', 'quién', 'son', 'ser',
  'está', 'están', 'hay', 'tiene', 'tienen', 'hacer', 'the', 'and', 'for',
]);

function palabrasDe(q: string): string[] {
  return q.toLowerCase()
    .replace(/[^\wáéíóúñü\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !VACIAS.has(w))
    .slice(0, 8);
}

/**
 * El trozo del texto donde aparece lo buscado, con la palabra en su sitio.
 *
 * Un resultado sin esto obliga a abrirlo para saber si sirve. Con esto se
 * decide desde la lista, que es la mitad del valor de un buscador.
 */
function trozo(texto: string | null, palabras: string[], largo = 180): string | null {
  if (!texto) return null;
  const limpio = String(texto).replace(/\s+/g, ' ').trim();
  if (!limpio) return null;
  const bajo = limpio.toLowerCase();
  let i = -1;
  for (const w of palabras) {
    const p = bajo.indexOf(w);
    if (p >= 0 && (i < 0 || p < i)) i = p;
  }
  if (i < 0) return limpio.slice(0, largo) + (limpio.length > largo ? '…' : '');
  // Se empieza un poco antes de la palabra, para que se lea la frase y no
  // caiga justo al principio del recorte.
  const desde = Math.max(0, i - 60);
  const hasta = Math.min(limpio.length, desde + largo);
  return (desde > 0 ? '…' : '') + limpio.slice(desde, hasta) + (hasta < limpio.length ? '…' : '');
}

/**
 * Saca `enPlataforma` y `general` de un texto que quería ser JSON y no llegó.
 *
 * No intenta reparar el JSON: busca cada rótulo y lee la cadena que va detrás,
 * aceptando que la última se acabe sin cerrar. Devuelve `null` si no reconoce
 * ninguno de los dos rótulos — y ese `null` significa «no sé qué es esto»,
 * que es distinto de «no hay nada» y se trata distinto más abajo.
 */
function rescatarPartes(texto: string): { enPlataforma: string; general: string } | null {
  const campo = (nombre: string): string => {
    // La comilla de cierre es opcional a propósito: si el modelo se quedó sin
    // tokens a mitad de frase, esa frase sigue siendo útil.
    const re = new RegExp(`"${nombre}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)("|$)`);
    const m = texto.match(re);
    if (!m) return '';
    return m[1]
      .replace(/\\n/g, ' ')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\s+/g, ' ')
      .trim();
  };
  const enPlataforma = campo('enPlataforma');
  const general = campo('general');
  if (!enPlataforma && !general) return null;
  return { enPlataforma, general };
}

export function registerBuscadorRoutes(app: Express, db: any) {
  /**
   * LO QUE SE VE MIENTRAS SE ESCRIBE — `GET /api/buscar/sugerencias?q=`
   *
   * Dos clases de sugerencia y **se dicen distintas**, porque son cosas
   * distintas y confundirlas engaña:
   *
   *   `contenido` algo que EXISTE. Pinchas y vas ahí. Nunca falla.
   *   `frase`     una forma de completar lo que estás escribiendo. Google las
   *               saca de lo que ha buscado otra gente; aquí no hay historial
   *               todavía, así que se componen con palabras que **sí están en
   *               la plataforma**. Así una sugerencia nunca lleva a un vacío.
   *
   * Tiene que ser rápida: se llama en cada tecla.
   */
  app.get('/api/buscar/sugerencias', async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || '').trim();
      if (q.length < 2) return res.json({ q, sugerencias: [] });

      const patron = `%${q}%`;
      const empieza = `${q}%`;

      const [pubs, retos, proyectos, prods, paginas] = await Promise.all([
        db.execute(sql`
          SELECT id, COALESCE(title, left(body, 60)) AS titulo
          FROM publications
          WHERE archived_at IS NULL AND (title ILIKE ${patron} OR body ILIKE ${patron})
          ORDER BY (title ILIKE ${empieza}) DESC, created_at DESC LIMIT 5`),
        db.execute(sql`
          SELECT id, title AS titulo FROM challenges
          WHERE archived_at IS NULL AND title ILIKE ${patron}
          ORDER BY (title ILIKE ${empieza}) DESC LIMIT 4`),
        db.execute(sql`
          SELECT slug AS id, titulo FROM proyectos
          WHERE archived_at IS NULL AND deleted_at IS NULL AND publico = true AND titulo ILIKE ${patron}
          ORDER BY (titulo ILIKE ${empieza}) DESC LIMIT 3`),
        db.execute(sql`
          SELECT id, name AS titulo FROM products
          WHERE archived_at IS NULL AND name ILIKE ${patron}
          ORDER BY (name ILIKE ${empieza}) DESC LIMIT 3`),
        db.execute(sql`
          SELECT w.slug AS id, w.title AS titulo, u.handle
          FROM knowledge_windows w JOIN users u ON u.id = w.creator_user_id
          WHERE w.kind = 'pagina' AND w.publico = true AND w.slug IS NOT NULL
            AND w.archived_at IS NULL AND w.deleted_at IS NULL AND w.title ILIKE ${patron}
          ORDER BY (w.title ILIKE ${empieza}) DESC LIMIT 3`),
      ]);

      const sugerencias: any[] = [];
      for (const r of pubs.rows as any[]) sugerencias.push({ clase: 'contenido', tipo: 'publicación', texto: r.titulo, url: `/explorar?p=${r.id}` });
      for (const r of retos.rows as any[]) sugerencias.push({ clase: 'contenido', tipo: 'reto', texto: r.titulo, url: `/retos/${r.id}` });
      for (const r of proyectos.rows as any[]) sugerencias.push({ clase: 'contenido', tipo: 'proyecto', texto: r.titulo, url: `/proyectos/${r.id}` });
      for (const r of prods.rows as any[]) sugerencias.push({ clase: 'contenido', tipo: 'producto', texto: r.titulo, url: `/mercado?producto=${r.id}` });
      for (const r of paginas.rows as any[]) sugerencias.push({ clase: 'contenido', tipo: 'página', texto: r.titulo, url: `/@${r.handle}/${r.id}` });

      // ── LAS FRASES ────────────────────────────────────────────────────────
      // Se componen con lo que YA existe: se coge el título de algo que
      // coincide y se ofrece entero. Es completar de verdad —lo que Google
      // hace con el historial de otros— sin inventarse temas que aquí no
      // tienen nada detrás.
      const frases = new Set<string>();
      for (const r of [...(pubs.rows as any[]), ...(retos.rows as any[])]) {
        const t = String(r.titulo || '').replace(/\s+/g, ' ').trim();
        if (t.length > q.length && t.toLowerCase().includes(q.toLowerCase()) && t.length <= 70) {
          frases.add(t);
        }
      }
      for (const f of [...frases].slice(0, 4)) {
        sugerencias.push({ clase: 'frase', texto: f, url: `/buscar?q=${encodeURIComponent(f)}` });
      }

      res.json({ q, sugerencias: sugerencias.slice(0, 12) });
    } catch (e: any) { console.error('sugerencias:', e); res.status(500).json({ error: e.message }); }
  });

  /**
   * LOS RESULTADOS — `GET /api/buscar?q=`
   *
   * Lo que se enseña en la página de resultados: título, el trozo donde
   * aparece lo buscado, y a dónde lleva.
   *
   * ── EL ORDEN ──────────────────────────────────────────────────────────────
   * Cuántas de las palabras buscadas aparecen, y si aparecen en el TÍTULO o
   * sólo en el cuerpo. Un título que coincide vale más que una mención suelta
   * en el párrafo veinte, y sin eso «agua» devuelve primero lo que casualmente
   * menciona agua antes que el reto que se llama Agua.
   */
  app.get('/api/buscar', async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || '').trim();
      if (q.length < 2) return res.json({ q, resultados: [], total: 0 });

      const palabras = palabrasDe(q);
      const patron = `%${q}%`;
      const resultados: any[] = [];

      const [pubs, retos, sols, proyectos, prods, orgs, paginas] = await Promise.all([
        db.execute(sql`
          SELECT id, title, body, created_at FROM publications
          WHERE archived_at IS NULL AND (title ILIKE ${patron} OR body ILIKE ${patron})
          ORDER BY (title ILIKE ${patron}) DESC, created_at DESC LIMIT 20`),
        db.execute(sql`
          SELECT id, title, description FROM challenges
          WHERE archived_at IS NULL AND (title ILIKE ${patron} OR description ILIKE ${patron}) LIMIT 10`),
        db.execute(sql`
          SELECT id, title, description FROM solutions
          WHERE archived_at IS NULL AND (title ILIKE ${patron} OR description ILIKE ${patron}) LIMIT 10`),
        db.execute(sql`
          SELECT slug, titulo, descripcion FROM proyectos
          WHERE archived_at IS NULL AND deleted_at IS NULL AND publico = true
            AND (titulo ILIKE ${patron} OR descripcion ILIKE ${patron}) LIMIT 10`),
        db.execute(sql`
          SELECT id, name, description FROM products
          WHERE archived_at IS NULL AND (name ILIKE ${patron} OR description ILIKE ${patron}) LIMIT 10`),
        db.execute(sql`
          SELECT id, name, description FROM organizations
          WHERE archived_at IS NULL AND (name ILIKE ${patron} OR description ILIKE ${patron}) LIMIT 6`),
        db.execute(sql`
          SELECT w.slug, w.title, w.config, u.handle
          FROM knowledge_windows w JOIN users u ON u.id = w.creator_user_id
          WHERE w.kind = 'pagina' AND w.publico = true AND w.slug IS NOT NULL
            AND w.archived_at IS NULL AND w.deleted_at IS NULL
            AND (w.title ILIKE ${patron} OR w.config::text ILIKE ${patron}) LIMIT 10`),
      ]);

      const meter = (tipo: string, titulo: string, cuerpo: string | null, url: string) => {
        const t = (titulo || '').toLowerCase();
        const c = (cuerpo || '').toLowerCase();
        let punto = 0;
        for (const w of palabras) {
          if (t.includes(w)) punto += 3;
          else if (c.includes(w)) punto += 1;
        }
        if (t.includes(q.toLowerCase())) punto += 4;
        // Un trozo que repite el título no informa de nada y ocupa una línea:
        // pasa cuando la descripción está vacía y el recorte cae sobre el
        // propio nombre. Mejor una línea menos que una línea repetida.
        const t2 = trozo(cuerpo, palabras.length ? palabras : [q]);
        const repetido = t2 && t2.replace(/[…\s]/g, '').toLowerCase() === (titulo || '').replace(/\s/g, '').toLowerCase();
        resultados.push({ tipo, titulo, url, trozo: repetido ? null : t2, punto });
      };

      for (const r of pubs.rows as any[]) meter('publicación', r.title || String(r.body || '').slice(0, 60), r.body, `/explorar?p=${r.id}`);
      for (const r of retos.rows as any[]) meter('reto', r.title, r.description, `/retos/${r.id}`);
      for (const r of sols.rows as any[]) meter('solución', r.title, r.description, `/soluciones/${r.id}`);
      for (const r of proyectos.rows as any[]) meter('proyecto', r.titulo, r.descripcion, `/proyectos/${r.slug}`);
      for (const r of prods.rows as any[]) meter('producto', r.name, r.description, `/mercado?producto=${r.id}`);
      for (const r of orgs.rows as any[]) meter('organización', r.name, r.description, `/organizaciones/${r.id}`);
      for (const r of paginas.rows as any[]) {
        // De una página se saca el primer texto de sus bloques: buscar dentro
        // del JSON entero encontraría también nombres de campos.
        const bloques = (r.config?.bloques || []) as any[];
        const texto = Array.isArray(bloques)
          ? bloques.map(b => (typeof b?.texto === 'string' ? b.texto : '')).filter(Boolean).join(' ')
          : '';
        meter('página', r.title, texto, `/@${r.handle}/${r.slug}`);
      }

      resultados.sort((a, b) => b.punto - a.punto);
      res.json({ q, resultados: resultados.slice(0, 40), total: resultados.length });
    } catch (e: any) { console.error('buscar:', e); res.status(500).json({ error: e.message }); }
  });

  /**
   * EL TEXTO DE ARRIBA — `POST /api/buscar/resumen`
   *
   * Eugenio pidió una mezcla: que la IA use lo que hay en la plataforma **y**
   * lo que ella sabe. Es lo más útil y también lo más peligroso, así que lo
   * que hace falta no es elegir uno: es que **se vea cuál es cuál**.
   *
   * ── POR QUÉ ESO NO ES UN ADORNO ───────────────────────────────────────────
   * Esta plataforma se pasa el día distinguiendo lo medido de lo simulado —hay
   * una página entera que lo cuenta—. Un párrafo donde «según los datos de
   * aquí» y «lo que la IA recuerda de internet» van mezclados sin marcar deja
   * a cualquiera citando como vuestro algo que nadie ha comprobado. Y con
   * vuestra cara detrás.
   *
   * Por eso el modelo tiene que devolver dos partes separadas, y si no puede
   * distinguirlas, decirlo.
   *
   * ── SIN CUENTA ────────────────────────────────────────────────────────────
   * Decisión suya, y trae una consecuencia: cualquiera puede gastar. Se limita
   * el tamaño de lo que entra, se usa el modelo barato por defecto, y **sólo
   * se llama si hay algo que resumir**.
   */
  app.post('/api/buscar/resumen', async (req: Request, res: Response) => {
    try {
      const q = String(req.body?.q || '').trim();
      if (q.length < 2) return res.status(400).json({ error: 'Escribe algo más largo.' });

      const crudos = Array.isArray(req.body?.resultados) ? req.body.resultados : [];
      // Lo que manda el navegador NO se cree: se recorta y se limpia. Es texto
      // de fuera entrando en un prompt.
      const contexto = crudos.slice(0, 10).map((r: any) => ({
        tipo: String(r?.tipo || '').slice(0, 30),
        titulo: String(r?.titulo || '').slice(0, 160),
        trozo: String(r?.trozo || '').slice(0, 300),
      })).filter((r: any) => r.titulo);

      const modelo = MODELOS[String(req.body?.modelo || 'sencillo')] || MODELOS.sencillo;
      const proveedor = getProvider(providerOfModel(modelo));
      if (!proveedor.isReady()) {
        // Que la IA no esté configurada no es un fallo del buscador: los
        // resultados de abajo salen igual. Se dice y ya.
        return res.json({ hay: false, motivo: 'La IA no está disponible ahora mismo.' });
      }

      const sistema = [
        'Eres el resumen que aparece arriba de un buscador, como el de Google.',
        'Respondes en español, en 3 o 4 frases como mucho, sin listas ni títulos.',
        '',
        'Te doy los resultados que la plataforma ha encontrado. Tu respuesta tiene DOS partes y NO se pueden mezclar:',
        '1. "enPlataforma": lo que se puede afirmar SOLO con los resultados dados. Si no dan para nada, deja esta parte vacía.',
        '2. "general": contexto tuyo sobre el tema, que la plataforma NO ha verificado. Puede ir vacío si no aportas nada.',
        '',
        'Nunca pongas en "enPlataforma" algo que no esté en los resultados. Es la regla más importante:',
        'esta plataforma distingue lo que ha medido de lo que no, y tú no puedes borrar esa línea.',
        '',
        'Devuelve SOLO un JSON: {"enPlataforma": "...", "general": "..."}',
      ].join('\n');

      const mensaje = contexto.length
        ? `Búsqueda: "${q}"\n\nResultados de la plataforma:\n` +
          contexto.map((r: any, i: number) => `${i + 1}. [${r.tipo}] ${r.titulo}${r.trozo ? ' — ' + r.trozo : ''}`).join('\n')
        : `Búsqueda: "${q}"\n\nLa plataforma no ha encontrado nada sobre esto. Deja "enPlataforma" vacío.`;

      // ── UN REINTENTO, Y SOLO UNO ──────────────────────────────────────
      // Medido el 2026-08-24: el modelo barato devuelve la respuesta VACÍA
      // aproximadamente una de cada tres veces con la misma pregunta. No es un
      // error que se pueda detectar —contesta 200 sin texto—, así que la única
      // señal es que no hay nada.
      //
      // Uno solo: si a la segunda tampoco, no se insiste. Sale la página sin
      // resumen, que es exactamente lo que ya sabe hacer.
      const pedir = async () => {
        const r = await proveedor.complete({
          system: sistema,
          messages: [{ role: 'user', content: mensaje }],
          // 800 y no 500: se pide un JSON con dos cadenas dentro, y a 500 el
          // modelo barato se quedaba sin sitio a mitad de la segunda. Cortar
          // el JSON es peor que cortar un párrafo, porque se pierde el rótulo
          // de qué parte es cuál.
          maxTokens: 800,
          temperature: 0.3,
          model: modelo,
        });
        return String((r as any).text || '').trim();
      };

      let texto = await pedir();
      if (texto.length < 20) texto = await pedir();
      let partes: any = null;
      try {
        const m = texto.match(/\{[\s\S]*\}/);
        if (m) partes = JSON.parse(m[0]);
      } catch { partes = null; }

      // ── SEGUNDO INTENTO SIN `JSON.parse` ─────────────────────────────────
      // Medido contra producción el 2026-08-24, misma búsqueda cinco veces con
      // el modelo barato: dos de cinco devolvieron el JSON **cortado a la
      // mitad** —se acaban los tokens en medio de la segunda cadena—. Eso hace
      // fallar a `JSON.parse`, y entonces caía en el camino de abajo, que da
      // por prosa lo que en realidad era JSON: al usuario le salían las llaves
      // y las comillas escritas en el bloque gris. Feo, y encima mandaba a la
      // parte «no comprobado» un texto que venía rotulado como comprobado.
      //
      // Un JSON cortado no es un JSON perdido: los rótulos siguen estando. Se
      // sacan los dos campos a mano, y así se recupera la atribución, que es
      // justo lo que no se puede perder. Lo que quede a medias se queda a
      // medias; lo que no se puede leer, no se enseña.
      if (!partes) partes = rescatarPartes(texto);

      // ── CUANDO EL MODELO NO DEVUELVE EL JSON QUE SE LE PIDIÓ ──────────────
      // Pasa, y con el modelo barato pasa a menudo: la misma pregunta dos
      // veces, una sale bien y otra devuelve prosa suelta. Medido el
      // 2026-08-24 con `abierto-rapido`.
      //
      // La salida segura no es tirar la respuesta, es saber DÓNDE ponerla. Si
      // no se puede separar qué viene de los resultados y qué se lo sabe la
      // IA, entonces **no se puede atribuir nada a la plataforma**: el texto
      // entero va a la parte de la IA. Nunca al revés.
      if (!partes || (!partes.enPlataforma && !partes.general)) {
        const suelto = texto.replace(/```[a-z]*|```/g, '').trim();
        // Y SI TODAVÍA PARECE JSON, NO SE ENSEÑA. Aquí ya han fallado el
        // parseo y el rescate, así que lo único que se puede hacer con unas
        // llaves es pintárselas a alguien. Antes salía sin resumen; sigue
        // saliendo sin resumen, pero ahora a propósito.
        const pareceJson = suelto.startsWith('{') || suelto.includes('"enPlataforma"');
        if (suelto.length > 20 && !pareceJson) {
          return res.json({
            hay: true, enPlataforma: null, general: suelto.slice(0, 900),
            modelo: String(req.body?.modelo || 'sencillo'), sinSeparar: true,
          });
        }
        return res.json({ hay: false, motivo: 'No se ha podido preparar el resumen.' });
      }

      res.json({
        hay: true,
        enPlataforma: String(partes.enPlataforma || '').trim() || null,
        general: String(partes.general || '').trim() || null,
        modelo: String(req.body?.modelo || 'sencillo'),
      });
    } catch (e: any) {
      // Un fallo de la IA no puede tumbar la búsqueda: los resultados van
      // aparte y se ven igual. Pero el motivo se registra ENTERO en el
      // servidor: tragárselo es cómo se pasa una tarde adivinando por qué el
      // resumen nunca sale.
      console.error('[buscador] el resumen ha fallado:', e?.message || e);
      res.json({ hay: false, motivo: 'No se ha podido preparar el resumen.' });
    }
  });
}

/**
 * Los tres niveles, con los mismos nombres que el selector del asistente.
 *
 * El barato es el de por defecto **porque busca cualquiera sin cuenta**: quien
 * quiera gastar tiene que elegirlo a mano.
 */
const MODELOS: Record<string, string> = {
  sencillo: 'abierto-rapido',
  medio: 'claude-haiku-4-5',
  mejor: 'claude-sonnet-5',
};
