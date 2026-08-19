import type { Express, Request, Response } from 'express';
import { createHmac, randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// ============================================================================
// EL NAVEGADOR DE LA APP (2026-08-19, petición de Eugenio: «un navegador propio
// que la IA interna de la app puede ver e interactuar a través del chat»).
// ============================================================================
// LA PARED, dicha de frente: un `<iframe>` NO puede abrir la mayoría de webs.
// Google, Amazon, casi cualquier sitio grande manda `X-Frame-Options: DENY` o
// una CSP con `frame-ancestors`, y el navegador se niega a pintarlos dentro de
// otra página. No es un fallo nuestro ni se arregla con código de cliente: es
// una defensa contra el «clickjacking» y funciona.
//
// La salida es traer la página por AQUÍ: el servidor la descarga, le quita esas
// cabeceras, reescribe los enlaces para que sigan pasando por nosotros y la
// sirve. Eso es lo que hace este módulo.
//
// LO QUE ESTO SÍ HACE: leer la web. Artículos, documentación, fichas de
// producto, wikis, noticias. Y como el HTML pasa por el servidor, la IA puede
// LEER lo mismo que estás viendo tú y navegar por ti.
//
// LO QUE NO HACE: iniciar sesión en sitios. Las cookies de la web de fuera NO
// viajan (el marco va en un origen opaco), así que todo lo que exija estar
// dentro de una cuenta —tu Gmail, tu banco— queda fuera. Y la IA LEE la página
// y puede navegar por ti, pero no pulsa botones dentro de una aplicación que se
// dibuja sola con JavaScript. Para eso hace falta un navegador de verdad
// corriendo en el servidor (Chromium headless), que es otra fase con su coste
// de infraestructura. Está escrito aquí para que nadie descubra el límite a
// base de chocarse con él.

/**
 * EL PASE DEL DÍA (2026-08-19, fallo visto en la captura de Eugenio: las
 * páginas salían SIN estilos y con las imágenes rotas). El porqué: la web va
 * en un marco aislado (origen opaco) y, desde ahí, sus estilos e imágenes
 * llegan aquí SIN la cookie de sesión — y este endpoint exigía sesión, así que
 * el documento entraba pero todo lo que colgaba de él rebotaba con un 401.
 *
 * La salida no es abrir el proxy a cualquiera: es firmar cada dirección
 * reescrita con un pase que caduca a diario. Quien tiene sesión recibe el HTML
 * con sus recursos ya firmados; quien no, no puede fabricar la firma.
 */
const SECRETO = process.env.SESSION_SECRET || randomBytes(16).toString('hex');
const tokenDia = (desfase = 0) =>
  createHmac('sha256', SECRETO)
    .update('navegador:' + new Date(Date.now() - desfase * 864e5).toISOString().slice(0, 10))
    .digest('base64url').slice(0, 20);
/** Vale el de hoy y el de ayer: una página abierta a medianoche no se rompe. */
const paseValido = (t: string) => t === tokenDia(0) || t === tokenDia(1);

/** Tope de descarga. Una página de texto no llega a 2 MB; más que eso es o un
 *  binario o un intento de tumbarnos. */
const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 15000;

/**
 * SSRF: que nadie use nuestro servidor para llamar a la red interna. Sin esto,
 * `?url=http://localhost:5432` o `http://169.254.169.254` (los metadatos del
 * proveedor de nube) convertirían este proxy en una puerta a la máquina.
 * Se resuelve el DNS y se comprueba la IP DE VERDAD, no el nombre: un dominio
 * puede apuntar a 127.0.0.1.
 */
const PRIVADAS = [
  /^127\./, /^10\./, /^192\.168\./, /^169\.254\./, /^0\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
];
async function esPublica(host: string): Promise<boolean> {
  try {
    const ips = isIP(host) ? [host] : (await lookup(host, { all: true })).map(r => r.address);
    if (!ips.length) return false;
    return ips.every(ip => {
      if (ip.includes(':')) return !(ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80'));
      return !PRIVADAS.some(re => re.test(ip));
    });
  } catch { return false; }
}

/** ¿Es una dirección que podemos ir a buscar? */
function urlValida(crudo: string): URL | null {
  try {
    const u = new URL(crudo);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u;
  } catch { return null; }
}

/** La dirección de un recurso, pasada por nuestro proxy, CON el pase del
 *  día: es lo que deja entrar a los estilos y las imágenes sin cookie. */
const porElProxy = (abs: string) => `/api/navegador/ver?url=${encodeURIComponent(abs)}&t=${tokenDia()}`;

/**
 * Reescribe el HTML para que TODO siga pasando por nosotros: los enlaces, las
 * imágenes, los estilos. Sin esto, la primera imagen relativa (`/logo.png`) se
 * pediría a humanity.wiki y saldría rota, y el primer enlace te sacaría del
 * navegador de la app.
 *
 * Se hace con expresiones regulares y no con un parser de HTML a propósito: un
 * parser completo son megas de dependencia y aquí no hace falta entender el
 * documento, solo tocar los atributos de dirección.
 */
function reescribir(html: string, base: URL): string {
  // `&amp;` dentro de un atributo HTML es un `&`. Sin deshacer eso, una URL
  // como `load.php?lang=es&amp;modules=…` se pide con un parámetro llamado
  // «amp;modules» y el servidor de enfrente devuelve otra cosa: es lo que hacía
  // que Wikipedia saliera SIN ESTILOS (visto en pruebas, 2026-08-19).
  const desescapar = (v: string) => v
    .replace(/&amp;/g, '&').replace(/&#38;/g, '&').replace(/&#x26;/gi, '&');

  const abs = (v: string): string | null => {
    const t = desescapar(v).trim();
    if (!t || t.startsWith('data:') || t.startsWith('blob:') || t.startsWith('#')
      || t.startsWith('javascript:') || t.startsWith('mailto:') || t.startsWith('tel:')) return null;
    try { return new URL(t, base).href; } catch { return null; }
  };

  let out = html;

  // <base> propio: rompería nuestras rutas relativas.
  out = out.replace(/<base\b[^>]*>/gi, '');

  // Una CSP incrustada en <meta> seguiría mandando aunque quitemos las
  // cabeceras, y bloquearía los recursos reencaminados y nuestro script.
  out = out.replace(/<meta[^>]+content-security-policy[^>]*>/gi, '');

  // Atributos de dirección: href, src, poster… y los srcset con sus tamaños.
  out = out.replace(/\s(href|src|poster|data-src)\s*=\s*("([^"]*)"|'([^']*)')/gi,
    (todo, attr, _q, dob, sim) => {
      const v = dob ?? sim ?? '';
      const a = abs(v);
      return a ? ` ${attr}="${porElProxy(a)}"` : todo;
    });
  out = out.replace(/\ssrcset\s*=\s*("([^"]*)"|'([^']*)')/gi, (todo, _q, dob, sim) => {
    const v = dob ?? sim ?? '';
    const partes = v.split(',').map((p: string) => {
      const [u, ...resto] = p.trim().split(/\s+/);
      const a = abs(u);
      return a ? [porElProxy(a), ...resto].join(' ') : null;
    }).filter(Boolean);
    return partes.length ? ` srcset="${partes.join(', ')}"` : todo;
  });

  // url(...) dentro de los estilos en línea y las hojas incrustadas.
  out = out.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (todo, q, v) => {
    const a = abs(v);
    return a ? `url(${q}${porElProxy(a)}${q})` : todo;
  });

  // Que los formularios y los enlaces no intenten salirse del marco, y avisar
  // a la app de dónde estamos para que la barra de direcciones lo enseñe.
  const inyeccion = `
<style>html{scrollbar-width:thin}</style>
<script>
(function(){
  var BASE = ${JSON.stringify(base.href)};
  var TOK = ${JSON.stringify(tokenDia())};
  var proxi = function(u){ return '/api/navegador/ver?url=' + encodeURIComponent(u) + '&t=' + TOK; };
  try { parent.postMessage({ navegadorHumanity: 'aqui', url: BASE }, '*'); } catch(e){}
  // Los enlaces con target=_blank sacarían la web de la ventana: se quedan.
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest && e.target.closest('a');
    if (a && a.target === '_blank') a.target = '_self';
  }, true);
  // TODOS los formularios se reconvierten a una consulta por el proxy. No solo
  // los GET: DuckDuckGo envía su buscador por POST, y un envío sin interceptar
  // se escapaba del marco y aterrizaba en NUESTRA app (visto en pruebas,
  // 2026-08-19). Los POST de verdad —iniciar sesión, pagar— ya están fuera de
  // lo que este navegador hace, así que convertirlos a GET no pierde nada que
  // funcionara antes.
  document.addEventListener('submit', function(e){
    var f = e.target;
    if (!f || !f.getAttribute) return;
    e.preventDefault();
    var accion = f.getAttribute('action') || BASE;
    var m = accion.match(/[?&]url=([^&]+)/);
    if (m) accion = decodeURIComponent(m[1]);
    var u;
    try { u = new URL(accion, BASE); } catch (err) { return; }
    u.search = new URLSearchParams(new FormData(f)).toString();
    location.href = proxi(u.href);
  }, true);
})();
</script>`;
  if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, `${inyeccion}</body>`);
  else out += inyeccion;

  return out;
}

/** El texto legible de una página, para que la IA lea LO MISMO que ves tú. */
function soloTexto(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

const tituloDe = (html: string) =>
  html.match(/<title[^>]*>([\s\S]{0,300}?)<\/title>/i)?.[1]?.trim() || null;

/** Los enlaces de la página, con su texto: es lo que deja a la IA «pulsar». */
function enlacesDe(html: string, base: URL, tope = 60) {
  const out: Array<{ texto: string; url: string }> = [];
  const re = /<a\b[^>]*href\s*=\s*("([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  const vistos = new Set<string>();
  while ((m = re.exec(html)) && out.length < tope) {
    const href = m[2] ?? m[3] ?? '';
    const texto = soloTexto(m[4]).slice(0, 120);
    if (!texto) continue;
    let u: string;
    try { u = new URL(href, base).href; } catch { continue; }
    if (!/^https?:/.test(u) || vistos.has(u)) continue;
    vistos.add(u);
    out.push({ texto, url: u });
  }
  return out;
}

/** Trae una página, con sus topes y su comprobación de destino. */
async function traer(crudo: string) {
  const u = urlValida(crudo);
  if (!u) throw Object.assign(new Error('Esa dirección no es válida.'), { estado: 400 });
  if (!(await esPublica(u.hostname))) {
    throw Object.assign(new Error('Esa dirección apunta a la red interna.'), { estado: 400 });
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(u.href, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        // Un agente honesto: decimos quiénes somos en vez de disfrazarnos.
        'User-Agent': 'Mozilla/5.0 (compatible; HumanityWiki/1.0; +https://humanity.wiki)',
        'Accept': 'text/html,application/xhtml+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });
    const tipo = r.headers.get('content-type') || 'application/octet-stream';
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      throw Object.assign(new Error('La página pesa demasiado.'), { estado: 413 });
    }
    // `r.url` y no `u.href`: si hubo redirecciones, la base para reescribir es
    // la dirección FINAL, o todos los enlaces relativos saldrían mal.
    return { tipo, buf, final: new URL(r.url || u.href), estado: r.status };
  } finally { clearTimeout(t); }
}

export function registerNavegadorRoutes(app: Express) {
  /**
   * GET /api/navegador/ver?url=… — la página, lista para meter en el marco.
   * Cualquiera con sesión puede navegar: es un navegador, no una herramienta
   * de administración. Sin sesión, no: no somos un proxy abierto de internet.
   */
  app.get('/api/navegador/ver', async (req: Request, res: Response) => {
    // Con sesión, o con el pase del día que va cosido a cada dirección
    // reescrita (los estilos y las imágenes del marco llegan sin cookie).
    if (!req.user && !paseValido(String(req.query.t || ''))) {
      return res.status(401).send('Inicia sesión para navegar.');
    }
    try {
      const { tipo, buf, final, estado } = await traer(String(req.query.url || ''));

      // Nunca dejamos que la respuesta de fuera imponga sus cabeceras: ni sus
      // cookies, ni su CSP, ni su X-Frame-Options (que es justo lo que impide
      // que se vea aquí dentro).
      res.status(estado === 304 ? 200 : estado);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store');

      if (/^text\/html/i.test(tipo)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(reescribir(buf.toString('utf8'), final));
      }
      if (/^text\/css/i.test(tipo)) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        // Las hojas de estilo también traen url(...) que hay que reencaminar.
        const css = buf.toString('utf8').replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (todo, q, v) => {
          try { return `url(${q}${porElProxy(new URL(v, final).href)}${q})`; } catch { return todo; }
        });
        return res.send(css);
      }
      // El JavaScript de fuera SÍ se sirve. Lo que lo hace seguro no es
      // bloquearlo, es dónde corre: el marco va con `sandbox="allow-scripts"`
      // y SIN `allow-same-origin`, así que la página vive en un origen OPACO —
      // no puede leer nuestras cookies, ni nuestro almacenamiento, ni el DOM
      // de la app, aunque venga servida desde nuestro dominio. Bloquearlo
      // dejaba media web a medio dibujar, que es peor que no enseñarla.
      res.setHeader('Content-Type', tipo);
      return res.send(buf);
    } catch (e: any) {
      res.status(e.estado || 502).send(`No se ha podido abrir la página: ${e.message}`);
    }
  });

  /**
   * GET /api/navegador/leer?url=… — LO QUE LA IA VE. El título, el texto y los
   * enlaces de la página, en JSON. Es la mitad de «que la IA pueda ver el
   * navegador»: la otra mitad es que el chat le pase la dirección donde estás.
   */
  app.get('/api/navegador/leer', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión para navegar.' });
    try {
      const { tipo, buf, final } = await traer(String(req.query.url || ''));
      if (!/^text\/html/i.test(tipo)) {
        return res.json({ url: final.href, titulo: null, texto: null, tipo, enlaces: [] });
      }
      const html = buf.toString('utf8');
      const texto = soloTexto(html);
      res.json({
        url: final.href,
        titulo: tituloDe(html),
        // 40 000 caracteres: suficiente para un artículo largo y lejos de
        // reventar el contexto de la IA con una página infinita.
        texto: texto.slice(0, 40000),
        recortado: texto.length > 40000,
        enlaces: enlacesDe(html, final),
      });
    } catch (e: any) {
      res.status(e.estado || 502).json({ error: e.message });
    }
  });
}
