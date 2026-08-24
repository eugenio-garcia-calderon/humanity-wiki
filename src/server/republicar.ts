import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// ============================================================================
// REPUBLICAR — de aquí y de cualquier otra red (2026-08-24)
// ============================================================================
// Eugenio: «poder hacer una republicación de otro autor y que aparezca arriba
// el que republica con o sin comentario y abajo el autor original y el
// contenido, y que se pueda republicar de todas las redes sociales, no solo
// contenido de la plataforma».
//
// ── LO QUE NO PUEDE PASAR NUNCA ─────────────────────────────────────────────
// Que al republicar algo parezca tuyo. Toda la función existe para lo
// contrario: enseñar de quién es y desde dónde llega. Por eso la procedencia no
// es un adorno del pie — es lo que se guarda primero y lo único sin lo que no
// se guarda nada.

/**
 * Convierte lo que escribe una persona en una dirección, sin regalar protocolo.
 *
 * ── POR QUÉ NO VALE `crudo.startsWith('http') ? crudo : 'https://' + crudo` ──
 * Porque a `file:///etc/passwd` le pega `https://` delante y sale
 * `https://file:///etc/passwd`, cuya máquina se llama «file». Eso lo acaba
 * rechazando el DNS, así que **parece** que la comprobación de protocolo
 * funciona — y no ha llegado a ejecutarse. Una defensa que aguanta por
 * casualidad se cae el día que alguien toca la línea de al lado, y nadie sabrá
 * por qué.
 *
 * Aquí se mira si YA trae un protocolo. Si lo trae y no es http o https, se
 * rechaza por lo que es. Si no trae ninguno, entonces sí se supone https.
 */
function comoDireccion(crudo: string): { url?: URL; error?: string } {
  const conProtocolo = /^[a-z][a-z0-9+.-]*:/i.test(crudo);
  if (conProtocolo && !/^https?:/i.test(crudo)) {
    return { error: 'Sólo se pueden traer direcciones http y https.' };
  }
  try {
    return { url: new URL(conProtocolo ? crudo : `https://${crudo}`) };
  } catch {
    return { error: 'Esa dirección no se entiende.' };
  }
}

/** El id de una publicación nueva. Mismo formato que el resto del proyecto. */
const nuevoId = () => `PUB_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

/**
 * De qué red viene un enlace. Sirve para el rótulo y para el icono.
 *
 * Se mira el dominio y no el contenido: es lo único que no puede mentir sin
 * que alguien controle el DNS. Lo que no se reconoce se queda en «web», que es
 * verdad y no estorba — no hace falta acertar la red para poder republicar.
 */
export function redDe(url: string): string {
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return 'web'; }
  const tabla: Array<[RegExp, string]> = [
    [/^(x\.com|twitter\.com|t\.co)$/, 'X'],
    [/(^|\.)instagram\.com$/, 'Instagram'],
    [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
    [/(^|\.)tiktok\.com$/, 'TikTok'],
    [/(^|\.)facebook\.com$/, 'Facebook'],
    [/(^|\.)linkedin\.com$/, 'LinkedIn'],
    [/(^|\.)(mastodon\.[a-z.]+|mstdn\.[a-z.]+)$/, 'Mastodon'],
    [/(^|\.)bsky\.app$/, 'Bluesky'],
    [/(^|\.)reddit\.com$/, 'Reddit'],
    [/(^|\.)threads\.net$/, 'Threads'],
    [/(^|\.)twitch\.tv$/, 'Twitch'],
    [/(^|\.)vimeo\.com$/, 'Vimeo'],
    [/(^|\.)substack\.com$/, 'Substack'],
    [/(^|\.)medium\.com$/, 'Medium'],
    [/(^|\.)github\.com$/, 'GitHub'],
  ];
  for (const [re, nombre] of tabla) if (re.test(host)) return nombre;
  return host || 'web';
}

/**
 * ── PEDIRLE UNA PÁGINA A INTERNET DESDE EL SERVIDOR ES UNA PUERTA ──────────
 *
 * Quien escribe la dirección decide a qué máquina llama el servidor. Si no se
 * comprueba, alguien pega `http://127.0.0.1:5432` o la dirección interna del
 * proveedor y el servidor se lo pide **desde dentro de la red**, que es donde
 * están la base de datos y las llaves. Es el fallo con nombre propio: SSRF.
 *
 * Aquí sólo se deja salir a Internet público:
 *   · sólo http y https — nada de `file:`, `gopher:` ni `data:`;
 *   · se resuelve el nombre y **se mira la IP de verdad**, porque un dominio
 *     puede apuntar a 127.0.0.1 y el nombre no lo delata;
 *   · se rechazan las redes privadas, la de enlace local (169.254, la de los
 *     metadatos de los proveedores) y las direcciones especiales.
 */
function esIpPrivada(ip: string): boolean {
  if (isIP(ip) === 6) {
    const b = ip.toLowerCase();
    if (b === '::1' || b === '::') return true;
    if (b.startsWith('fc') || b.startsWith('fd')) return true;   // única local
    if (b.startsWith('fe80')) return true;                        // enlace local
    /*
     * ── IPv6 QUE ENVUELVE UNA IPv4, EN SUS DOS ESCRITURAS ──────────────────
     * `::ffff:127.0.0.1` es 127.0.0.1 vestida de IPv6. Pero **el navegador y
     * Node la reescriben**: `new URL('http://[::ffff:127.0.0.1]/').hostname`
     * devuelve `[::ffff:7f00:1]`, en hexadecimal y sin puntos.
     *
     * Aquí sólo se miraba la forma con puntos, así que la reescrita pasaba de
     * largo. Encontrado probándolo: la petición acabó rechazada, pero por no
     * haber nadie escuchando en ese puerto — o sea, por suerte. En un servidor
     * con algo en 127.0.0.1:80 habría entrado.
     *
     * Se aceptan las dos escrituras, que son la misma dirección.
     */
    const conPuntos = b.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (conPuntos) return esIpPrivada(conPuntos[1]);
    const enHex = b.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (enHex) {
      const alto = parseInt(enHex[1], 16);
      const bajo = parseInt(enHex[2], 16);
      return esIpPrivada(`${alto >> 8}.${alto & 255}.${bajo >> 8}.${bajo & 255}`);
    }
    return false;
  }
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(n => Number.isNaN(n))) return true;
  if (p[0] === 10 || p[0] === 127 || p[0] === 0) return true;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
  if (p[0] === 192 && p[1] === 168) return true;
  if (p[0] === 169 && p[1] === 254) return true;   // metadatos del proveedor
  if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true;
  if (p[0] >= 224) return true;                    // multicast y reservadas
  return false;
}

async function puedeSalirAhi(url: URL): Promise<string | null> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return 'Sólo se pueden traer direcciones http y https.';
  }
  // ── UNA IP ESCRITA A PELO NO PASA POR EL DNS ─────────────────────────────
  // `http://[::1]/` o `http://127.0.0.1/` no son nombres que resolver: son la
  // dirección. Sin esta rama, `dnsLookup('[::1]')` falla por los corchetes y la
  // petición se rechaza — pero por no haberla entendido, no por ser interna. El
  // día que ese `lookup` acepte corchetes, el agujero se abre solo.
  const literal = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(literal)) {
    return esIpPrivada(literal) ? 'Esa dirección apunta a la red interna.' : null;
  }

  try {
    const dir = await dnsLookup(url.hostname, { all: true });
    if (!dir.length) return 'No se ha podido resolver esa dirección.';
    // TODAS tienen que ser públicas. Si una sola es privada se rechaza: un
    // dominio puede devolver varias y quedarse con la buena sería dejar que
    // quien lo controla elija cuál toca en el segundo intento.
    if (dir.some(d => esIpPrivada(d.address))) return 'Esa dirección apunta a la red interna.';
  } catch {
    return 'No se ha podido resolver esa dirección.';
  }
  return null;
}

/** Lee una etiqueta `<meta>` de Open Graph o su equivalente de Twitter. */
function meta(html: string, ...nombres: string[]): string | null {
  for (const n of nombres) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)\\s*=\\s*["']${n}["'][^>]*>`, 'i');
    const etiqueta = html.match(re)?.[0];
    if (!etiqueta) continue;
    const valor = etiqueta.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (valor) return recortar(desescapar(valor), 600);
  }
  return null;
}

function desescapar(s: string): string {
  return s
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

const recortar = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + '…' : s);

export function registrarRepublicar(app: Express, db: any) {
  /**
   * LA PREVIA DE UN ENLACE DE FUERA — `GET /api/republicar/previa?url=`
   *
   * Se pide ANTES de republicar, y por dos razones que no son la misma:
   *
   *   1. quien republica ve qué va a salir, en vez de fiarse de una dirección;
   *   2. lo que se ve es lo que se guarda, así que la copia y lo que aprobó la
   *      persona son lo mismo.
   *
   * Con sesión: esto hace que el servidor llame a una dirección que escribe
   * quien pregunta, y eso no se le da a cualquiera que pase por aquí.
   */
  app.get('/api/republicar/previa', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión para republicar.' });
    const crudo = String(req.query.url || '').trim();
    if (!crudo) return res.status(400).json({ error: 'Falta la dirección.' });

    const leida = comoDireccion(crudo);
    if (leida.error || !leida.url) return res.status(400).json({ error: leida.error });
    const url = leida.url;

    const motivo = await puedeSalirAhi(url);
    if (motivo) return res.status(400).json({ error: motivo });

    try {
      // Un límite de tiempo y otro de tamaño: sin ellos, una página que no
      // termina nunca deja la petición colgada, y una de 200 MB se traga la
      // memoria del servidor. 8 s y 512 KB — las etiquetas van en la cabeza
      // del documento, así que con el principio basta.
      const corte = AbortSignal.timeout(8000);
      const r = await fetch(url.toString(), {
        signal: corte,
        redirect: 'follow',
        headers: {
          // Sin esto muchos sitios devuelven una página vacía o un aviso de
          // robot. Se dice quién es de verdad: no se disfraza de nadie.
          'user-agent': 'humanity.wiki/1.0 (+https://humanity.wiki) previsualizador de enlaces',
          'accept': 'text/html,application/xhtml+xml',
          'accept-language': 'es,en;q=0.8',
        },
      });
      if (!r.ok) return res.status(400).json({ error: `Esa página ha contestado ${r.status}.` });

      const tipo = r.headers.get('content-type') || '';
      if (!/text\/html|application\/xhtml/.test(tipo)) {
        return res.status(400).json({ error: 'Esa dirección no es una página web.' });
      }

      const trozos: string[] = [];
      let bytes = 0;
      const lector = (r.body as any)?.getReader?.();
      if (lector) {
        const dec = new TextDecoder();
        while (bytes < 512 * 1024) {
          const { done, value } = await lector.read();
          if (done) break;
          bytes += value.length;
          trozos.push(dec.decode(value, { stream: true }));
          // En cuanto se acaba la cabeza del documento no hace falta más.
          if (trozos.join('').includes('</head>')) break;
        }
        try { await lector.cancel(); } catch { /* ya cerrado */ }
      } else {
        trozos.push((await r.text()).slice(0, 512 * 1024));
      }
      const html = trozos.join('');

      const fuente = {
        red: redDe(url.toString()),
        url: url.toString(),
        titulo: meta(html, 'og:title', 'twitter:title')
          || recortar(desescapar(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || ''), 300)
          || null,
        texto: meta(html, 'og:description', 'twitter:description', 'description'),
        imagen: meta(html, 'og:image', 'twitter:image'),
        // De quién es. En X y Mastodon el autor va en el propio camino de la
        // dirección; donde no, se usa el nombre del sitio, que es lo que se
        // puede afirmar sin inventar.
        autor: meta(html, 'og:site_name') || autorDelCamino(url) || null,
        // CUÁNDO SE VIO, y no «cuándo se publicó»: de una página de fuera no
        // sabemos lo segundo. Decir la fecha equivocada es peor que no decirla.
        visto_el: new Date().toISOString(),
      };

      if (!fuente.titulo && !fuente.texto) {
        return res.status(400).json({ error: 'De esa página no se ha podido leer nada que enseñar.' });
      }
      res.json({ fuente });
    } catch (e: any) {
      const porTiempo = e?.name === 'TimeoutError' || e?.name === 'AbortError';
      res.status(400).json({
        error: porTiempo ? 'Esa página ha tardado demasiado en contestar.' : 'No se ha podido leer esa página.',
      });
    }
  });

  /**
   * REPUBLICAR — `POST /api/republicar`
   *
   * `{ pubId }`  → algo de la plataforma
   * `{ url, fuente }` → algo de fuera, con la copia que se enseñó en la previa
   * `{ comentario }` → opcional, en los dos casos. Eugenio: «con o sin
   *                    comentario».
   */
  app.post('/api/republicar', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión para republicar.' });
    try {
      const pubId = req.body?.pubId ? String(req.body.pubId) : null;
      const url = req.body?.url ? String(req.body.url).trim() : null;
      const comentario = req.body?.comentario ? String(req.body.comentario).slice(0, 2000) : null;

      if (!pubId && !url) return res.status(400).json({ error: 'Di qué quieres republicar.' });
      if (pubId && url) return res.status(400).json({ error: 'O una publicación de aquí, o un enlace de fuera.' });

      let fuente: any = null;

      if (pubId) {
        const orig = await db.execute(sql`
          SELECT id, author_user_id, republica_pub_id
          FROM publications
          WHERE id = ${pubId} AND archived_at IS NULL AND deleted_at IS NULL
            AND coalesce(visibility, 'publica') <> 'privada'
        `);
        if (!orig.rows.length) return res.status(404).json({ error: 'Esa publicación ya no está.' });
        const o = orig.rows[0] as any;

        // NO SE REPUBLICA UNA REPUBLICACIÓN EN CADENA. Se apunta al original,
        // que es lo que la gente quiere ver: tres capas de «fulano republicó a
        // mengano que republicó a zutano» esconden el contenido detrás de la
        // genealogía. Es lo que hacen las redes que funcionan.
        if (o.republica_pub_id) {
          return res.status(400).json({ error: 'Republica el original.', original: o.republica_pub_id });
        }
        // Y no lo tuyo: para eso está fijar la publicación, no duplicarla.
        if (o.author_user_id === req.user.id) {
          return res.status(400).json({ error: 'Esto ya es tuyo.' });
        }
      } else {
        const f = req.body?.fuente || {};
        const leida = comoDireccion(url!);
        if (leida.error || !leida.url) return res.status(400).json({ error: leida.error });
        const u = leida.url;
        const motivo = await puedeSalirAhi(u);
        if (motivo) return res.status(400).json({ error: motivo });

        // La copia se REHACE aquí con lo que manda el navegador, recortada. No
        // se cree tal cual: es texto de fuera que va a pintarse en el muro de
        // todo el mundo, y lo que no se recorta aquí lo recorta la pantalla de
        // alguien.
        fuente = {
          red: redDe(u.toString()),
          url: u.toString(),
          titulo: f.titulo ? recortar(String(f.titulo), 300) : null,
          texto: f.texto ? recortar(String(f.texto), 600) : null,
          imagen: typeof f.imagen === 'string' && /^https?:\/\//.test(f.imagen) ? f.imagen.slice(0, 500) : null,
          autor: f.autor ? recortar(String(f.autor), 120) : null,
          visto_el: new Date().toISOString(),
        };
      }

      const id = nuevoId();
      await db.execute(sql`
        INSERT INTO publications
          (id, author_user_id, body, republica_pub_id, republica_url, republica_fuente, created_by, updated_by)
        VALUES
          (${id}, ${req.user.id}, ${comentario}, ${pubId}, ${pubId ? null : fuente.url},
           ${fuente ? JSON.stringify(fuente) : null}::jsonb, ${req.user.id}, ${req.user.id})
      `);

      // AVISAR A QUIEN LO ESCRIBIÓ. Que alguien reparta lo tuyo es de las pocas
      // cosas que de verdad quieres saber. Nunca a ti mismo, y que falle el
      // aviso no puede tumbar la republicación.
      if (pubId) {
        try {
          await db.execute(sql`
            INSERT INTO notifications (user_id, type, payload, entity_type, entity_id)
            SELECT p.author_user_id, 'republicacion',
                   jsonb_build_object('publication_id', ${id}, 'original_id', ${pubId}),
                   'publications', ${pubId}
            FROM publications p
            WHERE p.id = ${pubId} AND p.author_user_id IS NOT NULL
              AND p.author_user_id <> ${req.user.id}
          `);
        } catch (e) { console.error('[republicar] el aviso ha fallado:', e); }
      }

      res.json({ id });
    } catch (e: any) {
      console.error('[republicar]', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * CUÁNTAS VECES SE HA REPUBLICADO — `GET /api/republicar/cuenta/:id`
   * Se pide sola, no en la lista del muro: es un dato de la ficha, y meterlo en
   * la consulta de la lista sería una subconsulta por fila para algo que casi
   * nadie mira.
   */
  app.get('/api/republicar/cuenta/:id', async (req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`
        SELECT count(*)::int AS n FROM publications
        WHERE republica_pub_id = ${req.params.id} AND archived_at IS NULL AND deleted_at IS NULL
      `);
      res.json({ veces: (r.rows[0] as any)?.n || 0 });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}

/** En X, Mastodon o Bluesky el nombre de quien escribe va en la dirección. */
function autorDelCamino(url: URL): string | null {
  const red = redDe(url.toString());
  if (!['X', 'Mastodon', 'Bluesky', 'TikTok', 'Instagram', 'Threads'].includes(red)) return null;
  const primero = url.pathname.split('/').filter(Boolean)[0] || '';
  const limpio = primero.replace(/^@/, '');
  if (!limpio || limpio.length > 40 || /^(p|status|watch|home|explore)$/.test(limpio)) return null;
  return `@${limpio}`;
}
