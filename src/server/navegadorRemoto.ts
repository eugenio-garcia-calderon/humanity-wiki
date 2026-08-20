import type { Express, Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import type { Browser, BrowserContext, Page, CDPSession } from 'playwright';
import { esPublica } from './navegador';

// ============================================================================
// EL NAVEGADOR REMOTO (2026-08-20, petición de Eugenio: «dale a Chromium»).
// ============================================================================
// La fase seria del navegador de la app. El proxy de texto (navegador.ts)
// enseña documentos, pero no puede ejecutar aplicaciones — YouTube, Google,
// cualquier web moderna que se dibuja con JavaScript. La salida de verdad es
// correr un navegador COMPLETO (Chromium) en el servidor y enseñar su pantalla
// en la ventana de la app:
//
//   · El servidor abre una pestaña real por sesión (Playwright + Chromium).
//   · La pantalla viaja como fotogramas JPEG por SSE (Page.startScreencast).
//   · Los clics, el teclado y la rueda del usuario viajan de vuelta por POST
//     y se inyectan en la pestaña.
//   · La IA lee la página VIVA (texto y enlaces del DOM real), no una copia.
//
// LO QUE ESTO CUESTA, dicho de frente: cada sesión es un Chromium de verdad
// (150–400 MB de RAM según la web). Por eso hay un tope de sesiones y un
// cierre por inactividad. Y la pantalla viaja SIN SONIDO — el screencast son
// imágenes; para el audio harían falta WebRTC y otra fase. Los vídeos de
// YouTube siguen abriéndose con su reproductor oficial (Navegador.tsx), que
// sí trae sonido.

const MAX_SESIONES = 2;
const RATO_SIN_USO = 3 * 60_000;
const RATO_APAGAR_CHROMIUM = 60_000;
const LADO_MAX = 1920;

interface Sesion {
  id: string;
  usuario: string;
  context: BrowserContext;
  page: Page;
  cdp: CDPSession;
  /** El SSE del cliente que está mirando la pantalla ahora (uno por sesión). */
  cliente: Response | null;
  temporizador: ReturnType<typeof setTimeout>;
  ancho: number;
  alto: number;
  /** Densidad de píxeles de la pantalla del usuario (Retina = 2). Sin esto,
   *  una pantalla Retina recibe fotogramas a la mitad de su resolución y los
   *  estira: «el navegador se ve con baja resolución» (Eugenio, 2026-08-20). */
  escala: number;
}

const sesiones = new Map<string, Sesion>();
let chromium: Browser | null = null;
let apagado: ReturnType<typeof setTimeout> | null = null;

/** En producción (Alpine) Chromium viene del sistema (apk add chromium); en
 *  desarrollo lo trae Playwright (npx playwright install chromium). */
function rutaChromium(): string | undefined {
  const porEnv = process.env.NAVEGADOR_CHROMIUM;
  if (porEnv && existsSync(porEnv)) return porEnv;
  for (const p of ['/usr/bin/chromium-browser', '/usr/bin/chromium']) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

async function arrancarChromium(): Promise<Browser> {
  if (apagado) { clearTimeout(apagado); apagado = null; }
  if (chromium?.isConnected()) return chromium;
  const { chromium: motor } = await import('playwright');
  chromium = await motor.launch({
    headless: true,
    executablePath: rutaChromium(),
    // Sin sandbox de Chromium: dentro del contenedor no hay espacios de
    // nombres de usuario y no arrancaría. La separación real es que este
    // proceso no comparte nada con la app salvo estas rutas. Apuntado en
    // 02_TECH_DEBT.md.
    chromiumSandbox: false,
    // Silencio a propósito: el sonido no viaja por el screencast, así que
    // decodificarlo solo quemaría CPU del servidor.
    args: ['--disable-dev-shm-usage', '--mute-audio', '--no-first-run'],
  });
  chromium.on('disconnected', () => { chromium = null; });
  return chromium;
}

/** Si no queda nadie navegando, Chromium se apaga solo al minuto. */
function quizasApagar() {
  if (sesiones.size || !chromium) return;
  if (apagado) clearTimeout(apagado);
  apagado = setTimeout(() => {
    if (!sesiones.size) { chromium?.close().catch(() => {}); chromium = null; }
  }, RATO_APAGAR_CHROMIUM);
}

function empujar(s: Sesion, dato: Record<string, unknown>) {
  try { s.cliente?.write(`data: ${JSON.stringify(dato)}\n\n`); } catch { /* cliente ido */ }
}

function tocar(s: Sesion) {
  clearTimeout(s.temporizador);
  s.temporizador = setTimeout(() => cerrarSesion(s.id), RATO_SIN_USO);
}

async function cerrarSesion(id: string) {
  const s = sesiones.get(id);
  if (!s) return;
  sesiones.delete(id);
  clearTimeout(s.temporizador);
  empujar(s, { t: 'fin' });
  try { s.cliente?.end(); } catch { /* ya cerrado */ }
  await s.context.close().catch(() => {});
  quizasApagar();
}

/** La misma pared anti-red-interna que el proxy, aplicada a las NAVEGACIONES
 *  del Chromium remoto: sin esto, escribir http://localhost:5432 en la barra
 *  pasearía por dentro del servidor. Solo se comprueban los documentos (las
 *  navegaciones): comprobar cada imagen de cada página sería un peaje de DNS
 *  en todo, y un subrecurso interno no se puede leer desde fuera igualmente. */
const cacheHosts = new Map<string, boolean>();
async function destinoPermitido(url: string): Promise<boolean> {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return u.protocol === 'about:';
    const sabido = cacheHosts.get(u.hostname);
    if (sabido !== undefined) return sabido;
    const ok = await esPublica(u.hostname);
    cacheHosts.set(u.hostname, ok);
    return ok;
  } catch { return false; }
}

async function crearSesion(usuario: string, url: string, ancho: number, alto: number, escala: number): Promise<Sesion> {
  const navegador = await arrancarChromium();
  const context = await navegador.newContext({
    viewport: { width: ancho, height: alto },
    // La pestaña se dibuja a la densidad de la pantalla del usuario: los
    // fotogramas llegan con el doble de pixeles en Retina y el navegador del
    // cliente los encoge a su sitio — nitidez de verdad, no un estirado.
    deviceScaleFactor: escala,
    locale: 'es-ES',
    serviceWorkers: 'block',
  });
  await context.route('**/*', async ruta => {
    if (ruta.request().resourceType() !== 'document') return ruta.continue();
    if (await destinoPermitido(ruta.request().url())) return ruta.continue();
    return ruta.abort('accessdenied');
  });
  const page = await context.newPage();
  // Las ventanas emergentes no caben en una pantalla remota: su dirección se
  // abre en la pestaña principal y la emergente se cierra.
  context.on('page', async emergente => {
    if (emergente === page) return;
    try {
      await emergente.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
      const destino = emergente.url();
      await emergente.close();
      if (destino && destino !== 'about:blank') await page.goto(destino).catch(() => {});
    } catch { /* emergente ya muerta */ }
  });

  const cdp = await context.newCDPSession(page);
  const s: Sesion = {
    id: randomBytes(12).toString('base64url'),
    usuario, context, page, cdp, cliente: null,
    temporizador: setTimeout(() => {}, 0),
    ancho, alto, escala,
  };
  tocar(s);

  cdp.on('Page.screencastFrame', ev => {
    // Sin el ack, Chromium deja de mandar fotogramas: es su control de flujo.
    cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => {});
    empujar(s, { t: 'marco', d: ev.data });
  });
  page.on('framenavigated', fr => {
    if (fr !== page.mainFrame()) return;
    empujar(s, { t: 'url', url: page.url() });
  });
  page.on('load', async () => {
    empujar(s, { t: 'url', url: page.url(), titulo: await page.title().catch(() => '') });
  });

  sesiones.set(s.id, s);
  page.goto(url, { waitUntil: 'commit', timeout: 20000 }).catch(err => {
    empujar(s, { t: 'aviso', texto: `No se ha podido abrir la página: ${String(err?.message || err).slice(0, 120)}` });
  });
  return s;
}

/** Sesión del usuario, o null (y la respuesta ya enviada). */
function sesionDe(req: Request, res: Response): Sesion | null {
  if (!req.user) { res.status(401).json({ error: 'Inicia sesión para navegar.' }); return null; }
  const s = sesiones.get(String(req.params.id || ''));
  if (!s || s.usuario !== req.user.id) {
    res.status(404).json({ error: 'Esa sesión de navegación ya no existe.' });
    return null;
  }
  return s;
}

export function registerNavegadorRemotoRoutes(app: Express) {
  /** POST /api/navegador/remoto — abre una pestaña real en el servidor. */
  app.post('/api/navegador/remoto', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión para navegar.' });
    // El tope es global y pequeño a propósito: cada sesión es un Chromium.
    // Antes de rechazar, se recicla la sesión más vieja del MISMO usuario:
    // abrir y cerrar la ventana del navegador no debe ir gastando huecos.
    if (sesiones.size >= MAX_SESIONES) {
      const propia = [...sesiones.values()].find(x => x.usuario === req.user!.id);
      if (propia) await cerrarSesion(propia.id);
    }
    if (sesiones.size >= MAX_SESIONES) {
      return res.status(503).json({ error: 'El navegador está ocupado ahora mismo. Prueba en un momento.' });
    }
    try {
      const url = String(req.body?.url || 'about:blank');
      const ancho = Math.min(Math.max(Number(req.body?.ancho) || 1024, 320), LADO_MAX);
      const alto = Math.min(Math.max(Number(req.body?.alto) || 768, 240), LADO_MAX);
      // Tope 2: mas alla, el peso de cada fotograma crece sin que el ojo lo note.
      const escala = Math.min(Math.max(Number(req.body?.escala) || 1, 1), 2);
      if (!(await destinoPermitido(url))) {
        return res.status(400).json({ error: 'Esa dirección apunta a la red interna.' });
      }
      const s = await crearSesion(req.user.id, url, ancho, alto, escala);
      res.json({ sesion: s.id });
    } catch (e: any) {
      // Lo más probable: Chromium no está instalado en esta máquina. El
      // cliente cae al proxy de lectura, que no necesita nada.
      console.error('[navegador remoto]', e?.message || e);
      res.status(503).json({ error: 'El navegador remoto no está disponible en este servidor.' });
    }
  });

  /** GET …/:id/pantalla — la pantalla en directo, por SSE. */
  app.get('/api/navegador/remoto/:id/pantalla', async (req: Request, res: Response) => {
    const s = sesionDe(req, res);
    if (!s) return;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    try { s.cliente?.end(); } catch { /* había otro mirando */ }
    s.cliente = res;
    tocar(s);
    empujar(s, { t: 'url', url: s.page.url(), titulo: await s.page.title().catch(() => '') });
    try {
      await s.cdp.send('Page.startScreencast', {
        format: 'jpeg', quality: 70,
        maxWidth: Math.round(s.ancho * s.escala), maxHeight: Math.round(s.alto * s.escala),
      });
    } catch { /* la pestaña murió entre medias */ }
    req.on('close', () => {
      if (s.cliente === res) {
        s.cliente = null;
        s.cdp.send('Page.stopScreencast').catch(() => {});
      }
    });
  });

  /** POST …/:id/entrada — un gesto del usuario, inyectado en la pestaña. */
  app.post('/api/navegador/remoto/:id/entrada', async (req: Request, res: Response) => {
    const s = sesionDe(req, res);
    if (!s) return;
    tocar(s);
    const e = req.body || {};
    try {
      switch (e.tipo) {
        case 'raton': {
          const x = Number(e.x) || 0, y = Number(e.y) || 0;
          const boton = e.boton === 2 ? 'right' : e.boton === 1 ? 'middle' : 'left';
          if (e.accion === 'mueve') await s.page.mouse.move(x, y);
          if (e.accion === 'abajo') { await s.page.mouse.move(x, y); await s.page.mouse.down({ button: boton, clickCount: Number(e.cuenta) || 1 }); }
          if (e.accion === 'arriba') await s.page.mouse.up({ button: boton, clickCount: Number(e.cuenta) || 1 });
          break;
        }
        case 'rueda':
          await s.page.mouse.move(Number(e.x) || 0, Number(e.y) || 0);
          await s.page.mouse.wheel(Number(e.dx) || 0, Number(e.dy) || 0);
          break;
        case 'tecla':
          await s.page.keyboard.press(String(e.k || '').slice(0, 40));
          break;
        case 'texto':
          await s.page.keyboard.type(String(e.texto || '').slice(0, 2000));
          break;
        case 'navegar': {
          const destino = String(e.url || '');
          if (!(await destinoPermitido(destino))) {
            empujar(s, { t: 'aviso', texto: 'Esa dirección apunta a la red interna.' });
            break;
          }
          await s.page.goto(destino, { waitUntil: 'commit', timeout: 20000 }).catch(err => {
            empujar(s, { t: 'aviso', texto: `No se ha podido abrir: ${String(err?.message || err).slice(0, 120)}` });
          });
          break;
        }
        case 'atras': await s.page.goBack({ timeout: 10000 }).catch(() => {}); break;
        case 'adelante': await s.page.goForward({ timeout: 10000 }).catch(() => {}); break;
        case 'recargar': await s.page.reload({ timeout: 20000 }).catch(() => {}); break;
        case 'tamano': {
          s.ancho = Math.min(Math.max(Number(e.ancho) || s.ancho, 320), LADO_MAX);
          s.alto = Math.min(Math.max(Number(e.alto) || s.alto, 240), LADO_MAX);
          await s.page.setViewportSize({ width: s.ancho, height: s.alto });
          if (s.cliente) {
            await s.cdp.send('Page.stopScreencast').catch(() => {});
            await s.cdp.send('Page.startScreencast', {
              format: 'jpeg', quality: 70,
              maxWidth: Math.round(s.ancho * s.escala), maxHeight: Math.round(s.alto * s.escala),
            }).catch(() => {});
          }
          break;
        }
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: String(err?.message || err).slice(0, 200) });
    }
  });

  /** GET …/:id/leer — LO QUE LA IA VE: el DOM vivo, no una copia descargada.
   *  Es la diferencia con `/api/navegador/leer`: aquí se lee lo que hay EN la
   *  pestaña después de que la página se dibujara y tú tocaras lo que sea. */
  app.get('/api/navegador/remoto/:id/leer', async (req: Request, res: Response) => {
    const s = sesionDe(req, res);
    if (!s) return;
    tocar(s);
    try {
      const texto: string = await s.page.evaluate(() => document.body?.innerText || '');
      const enlaces: Array<{ texto: string; url: string }> = await s.page.evaluate(() => {
        const vistos = new Set<string>();
        const out: Array<{ texto: string; url: string }> = [];
        for (const a of Array.from(document.querySelectorAll('a[href]'))) {
          const url = (a as HTMLAnchorElement).href;
          const t = (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);
          if (!t || !/^https?:/.test(url) || vistos.has(url)) continue;
          vistos.add(url);
          out.push({ texto: t, url });
          if (out.length >= 60) break;
        }
        return out;
      });
      res.json({
        url: s.page.url(),
        titulo: await s.page.title().catch(() => null),
        texto: texto.slice(0, 40000),
        recortado: texto.length > 40000,
        enlaces,
      });
    } catch (err: any) {
      res.status(500).json({ error: String(err?.message || err).slice(0, 200) });
    }
  });

  /** DELETE …/:id — cerrar la ventana cierra la pestaña del servidor. */
  app.delete('/api/navegador/remoto/:id', async (req: Request, res: Response) => {
    const s = sesionDe(req, res);
    if (!s) return;
    await cerrarSesion(s.id);
    res.json({ ok: true });
  });
}
