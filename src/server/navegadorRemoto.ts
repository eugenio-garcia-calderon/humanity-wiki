import type { Express, Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import type { Browser, BrowserContext, Page } from 'playwright';
import { esPublica, reescribir } from './navegador';

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


// ════════════════════════════════════════════════════════════════════════════
// LA INSTANTÁNEA: CHROMIUM QUE RENDERIZA UNA VEZ Y SE APARTA (2026-08-23)
// ════════════════════════════════════════════════════════════════════════════
// Eugenio: «esa solución nunca será viable porque va con LAG, y el usuario se
// queja de que va lento, y tiene razón».
//
// La tiene. Retransmitir fotogramas tiene un retardo que no se optimiza: por
// muy rápido que vaya el servidor, entre que mueves el ratón y ves el efecto
// hay una ida y vuelta por internet, y eso se nota siempre. No es un problema
// de eficiencia, es de dónde está el ordenador.
//
// ── LO QUE CAMBIA AQUÍ ──────────────────────────────────────────────────────
// Chromium deja de ser una CÁMARA y pasa a ser una IMPRENTA. Abre la página,
// espera a que el JavaScript termine de dibujarla, se queda con el HTML ya
// montado y lo suelta. A partir de ahí es una página normal en la máquina de
// quien mira: se selecciona el texto, se hace zoom, y no hay retardo porque no
// hay nada viajando.
//
//   Retransmitir  →  retardo en CADA movimiento del ratón
//   Imprimir      →  una espera al CAMBIAR de página, como una web lenta
//
// Medido el 2026-08-23: Amazon buscando «teclado» tarda 3,7 s y devuelve 51.536
// caracteres de página real. Nadie se queja de una web que tarda tres segundos;
// todo el mundo se queja de un ratón que va con retardo.
//
// ── Y EL SERVIDOR RESPIRA ───────────────────────────────────────────────────
// El Chromium está ocupado tres segundos en vez de toda la sesión. La página se
// cierra en cuanto se tiene el HTML, y el navegador se apaga solo cuando no
// queda nadie, como ya hacía.
//
// ── LO QUE ESTO NO ES ───────────────────────────────────────────────────────
// No es un navegador: es una foto en HTML. Los botones que dependan del
// JavaScript de la página no responderán, porque ese JavaScript no viaja. Para
// leer una ficha de producto o un artículo es perfecto; **para entrar en tu
// correo no sirve, y no debe servir** — eso necesita tu sesión, y tu sesión no
// tiene por qué pasar por nuestro servidor.

/** Tres a la vez como mucho. Una instantánea dura segundos, pero si llegan
 *  veinte peticiones juntas —una página con veinte enlaces que alguien abre en
 *  ráfaga— serían veinte Chromium a la vez. */
const MAX_INSTANTANEAS = 3;
let instantaneasEnCurso = 0;

/** Lo que se espera a que la página termine de dibujarse. Pasado esto, se
 *  entrega lo que haya: media página es mucho mejor que una pantalla en
 *  blanco con un mensaje de tiempo agotado. */
const ESPERA_RENDER_MS = 9000;

const MAX_SESIONES = 2;
const RATO_SIN_USO = 3 * 60_000;
const RATO_APAGAR_CHROMIUM = 60_000;
const LADO_MAX = 1920;

interface Sesion {
  id: string;
  usuario: string;
  context: BrowserContext;
  page: Page;
  /** El SSE del cliente que está mirando la pantalla ahora (uno por sesión). */
  cliente: Response | null;
  /** Si el bucle de capturas está corriendo (uno como mucho por sesión). */
  capturando: boolean;
  /** Cuándo tocaste algo por última vez. Mientras esté reciente, la pantalla
   *  va en modo rápido: al desplazarte quieres fluidez, no detalle. */
  ultimoGesto: number;
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
  // LAS INSTANTÁNEAS TAMBIÉN CUENTAN. Sin mirarlas, una sesión que se cierra
  // programaría el apagado y Chromium podría cerrarse con una página a medio
  // dibujar — que se vería como «no se ha podido dibujar esta página» sin que
  // nada estuviera roto.
  if (sesiones.size || instantaneasEnCurso > 0 || !chromium) return;
  if (apagado) clearTimeout(apagado);
  apagado = setTimeout(() => {
    if (!sesiones.size && instantaneasEnCurso === 0) { chromium?.close().catch(() => {}); chromium = null; }
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

/**
 * EL BUCLE DE PANTALLA (2026-08-20). El screencast de Chromium entrega los
 * fotogramas SIEMPRE al tamaño lógico (CSS) e ignora la densidad de píxeles
 * —medido: pedidos 400×300 con escala 2, llegaban a 400×300—, así que en
 * Retina era borroso POR CONSTRUCCIÓN. Las capturas sí salen a píxeles reales.
 *
 * Pero una captura nítida CUESTA, y por eso el desplazamiento iba a tirones
 * («tarda en responder subir y bajar», Eugenio). Medido sobre Wikipedia a
 * 1000×700 con pantalla Retina:
 *
 *     nítida (device, calidad 70) → 98 ms y 286 KB por fotograma → 10 por segundo
 *     rápida (css,    calidad 50) → 17 ms y  85 KB por fotograma → 58 por segundo
 *
 * De ahí las DOS velocidades, que es como funciona cualquier escritorio
 * remoto: mientras algo se mueve manda fotogramas RÁPIDOS (fluidez, que es lo
 * que el ojo pide al desplazarse) y, en cuanto la página se queda quieta,
 * manda UNA nítida (detalle, que es lo que el ojo pide al leer). Cuando no
 * cambia nada no se manda nada.
 */
const CADENCIA_MOVIMIENTO = 30;   // ms entre fotogramas mientras algo cambia
const CADENCIA_QUIETA = 200;      // ms entre comprobaciones con la página parada
const RATO_DE_GESTO = 350;        // ms que se considera «aún te estás moviendo»
/** Cuántas comprobaciones seguidas con cambios hacen falta para dar por hecho
 *  que hay algo animándose de verdad (un vídeo, un carrusel) y no un píxel
 *  suelto. Es la HISTÉRESIS que evita el parpadeo. */
const CAMBIOS_PARA_MODO_RAPIDO = 4;

/** Los tres modos de fotograma. Ver el porqué de cada uno dentro del bucle. */
type Modo = 'gesto' | 'animacion' | 'quieto';
const AJUSTES: Record<Modo, { quality: number; scale: 'css' | 'device' }> = {
  gesto:     { quality: 40, scale: 'device' },  // tú mueves: estás leyendo, quieres nitidez
  animacion: { quality: 50, scale: 'css' },     // se mueve solo: quieres fluidez
  quieto:    { quality: 70, scale: 'device' },  // nada se mueve: el bueno
};

async function bucleDePantalla(s: Sesion) {
  if (s.capturando) return;
  s.capturando = true;
  let ultimoMarco: Buffer | null = null;
  let ultimoModo: Modo | null = null;
  let nitidaEnviada = false;
  let cambiosSeguidos = 0;
  try {
    while (s.cliente && sesiones.has(s.id)) {
      try {
        // ── QUÉ CALIDAD TOCA, Y SE DECIDE ANTES DE CAPTURAR ──────────────
        //
        // CUÁNDO SE VE BORROSO Y CUÁNDO NÍTIDO (2026-08-20, Eugenio: «la
        // definición oscila entre verse borrosa y definida cada x segundos»).
        // Antes bastaba con que UN píxel cambiara para mandar un fotograma
        // borroso y volver al nítido al instante siguiente: en una página con
        // cualquier animación de fondo eso es un parpadeo constante. Por eso
        // el modo de movimiento se reserva para cuando TOCAS algo o para
        // cuando la página lleva varios fotogramas seguidos cambiando.
        //
        // POR QUÉ SE PIXELABA AL DESPLAZAR (B90, 2026-08-21, Eugenio: «cuando
        // se hace scroll down se pixela, no se refresca bien y queda fatal»).
        // No era que la nítida no llegara: llegaba. Era que el fotograma de
        // movimiento salía a MEDIA RESOLUCIÓN. Medido sobre Wikipedia a
        // 1000×700 en Retina:
        //
        //     css    calidad 50 →  43 ms    93 KB   1000×700
        //     device calidad 40 →  71 ms   199 KB   2000×1400
        //     device calidad 70 →  70 ms   321 KB   2000×1400
        //
        // El <img> del cliente estira esos 1000×700 al hueco donde caben
        // 2000×1400: cada píxel enviado cubre cuatro de pantalla. Eso es
        // pixelado por construcción, y por eso pasaba SIEMPRE al desplazarse.
        //
        // La salida sale de la misma medición: a resolución completa la
        // CALIDAD casi no cuesta tiempo (71 ms con 40, 70 ms con 70); lo que
        // cuesta es dibujar el doble de píxeles. Así que mientras el usuario
        // mueve la página se captura a resolución completa con calidad baja:
        // se paga en kilobytes, que sobran, y no en tirones.
        //
        // LA MEDIA RESOLUCIÓN SE QUEDA PARA LO QUE SE ANIMA SOLO —un vídeo, un
        // carrusel—, donde el ojo pide fluidez y no detalle y donde no hay
        // texto que leer. Cuando eres tú quien mueve la página, estás leyendo.
        const tocando = Date.now() - s.ultimoGesto < RATO_DE_GESTO;
        const animandose = !tocando && cambiosSeguidos >= CAMBIOS_PARA_MODO_RAPIDO;

        // UNA SOLA CAPTURA POR VUELTA. La captura ES la sonda: comparar dos
        // fotogramas del mismo modo dice igual de bien si algo se ha movido, y
        // capturar una barata solo para saberlo costaría más que el arreglo.
        const modo: Modo = animandose ? 'animacion' : tocando ? 'gesto' : 'quieto';
        const marco = await s.page.screenshot({ ...AJUSTES[modo], type: 'jpeg', caret: 'initial', timeout: 5000 });

        // COMPARAR SOLO CONTRA UN FOTOGRAMA DEL MISMO MODO. Los tres modos dan
        // imágenes de tamaños y calidades distintos, así que soltar el ratón
        // cambiaría todos los bytes y parecería que la página se ha movido.
        // Cuando el modo cambia no se sabe si hubo movimiento, y entonces no
        // se cuenta ni a favor ni en contra: se manda el fotograma y ya.
        const mismoModo = modo === ultimoModo && !!ultimoMarco;
        const igual = mismoModo && marco.equals(ultimoMarco as Buffer);
        if (mismoModo) cambiosSeguidos = igual ? 0 : cambiosSeguidos + 1;

        if (!igual || !nitidaEnviada) {
          empujar(s, { t: 'marco', d: marco.toString('base64') });
          ultimoMarco = marco;
          ultimoModo = modo;
          // Solo el modo quieto manda el fotograma nítido. Mientras haya
          // movimiento queda PENDIENTE mandar uno nítido en cuanto la página
          // pare: eso es lo que evita quedarse en la versión de baja calidad.
          nitidaEnviada = modo === 'quieto';
        }
      } catch { /* la pestaña estaba navegando u ocupada: se reintenta */ }
      const moviendo = Date.now() - s.ultimoGesto < RATO_DE_GESTO || cambiosSeguidos >= CAMBIOS_PARA_MODO_RAPIDO;
      await new Promise(r => setTimeout(r, moviendo ? CADENCIA_MOVIMIENTO : CADENCIA_QUIETA));
    }
  } finally { s.capturando = false; }
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

  const s: Sesion = {
    id: randomBytes(12).toString('base64url'),
    usuario, context, page, cliente: null, capturando: false, ultimoGesto: 0,
    temporizador: setTimeout(() => {}, 0),
    ancho, alto, escala,
  };
  tocar(s);

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
  /**
   * GET /api/navegador/instantanea?url=… — la página ya dibujada, en HTML.
   *
   * Es el camino para las webs que se pintan solas con JavaScript y que por el
   * proxy de lectura saldrían en blanco. Chromium las abre, espera a que
   * terminen, y aquí sale el HTML resultante **pasado por la misma reescritura
   * que usa el proxy**, para que las imágenes y los estilos sigan viniendo por
   * nosotros y no se rompan.
   *
   * Devuelve HTML y no JSON a propósito: el marco que lo enseña es el mismo
   * `<iframe>` del modo de lectura, y así no hay dos caminos de pintado que
   * mantener sincronizados.
   */
  app.get('/api/navegador/instantanea', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).send('Inicia sesión para navegar.');
    if (instantaneasEnCurso >= MAX_INSTANTANEAS) {
      return res.status(503).send('<!doctype html><meta charset="utf-8"><body style="font:14px system-ui;padding:2rem;color:#475569">'
        + 'Hay varias páginas dibujándose ahora mismo. Prueba en unos segundos.</body>');
    }

    let destino: URL;
    try {
      destino = new URL(String(req.query.url || ''));
      if (!/^https?:$/.test(destino.protocol)) throw new Error('protocolo');
    } catch {
      return res.status(400).send('Dirección no válida.');
    }
    // LA MISMA PUERTA QUE EL RESTO. `esPublica` es lo que impide que alguien
    // use nuestro servidor para asomarse a la red interna del propio servidor
    // — la dirección la escribe quien mira, y sin esto esto sería un agujero.
    if (!(await esPublica(destino.hostname))) {
      return res.status(400).send('Esa dirección no se puede abrir desde aquí.');
    }

    instantaneasEnCurso++;
    let pagina: Page | null = null;
    try {
      const navegador = await arrancarChromium();
      pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
      await pagina.goto(destino.href, { waitUntil: 'domcontentloaded', timeout: ESPERA_RENDER_MS });
      // `networkidle` es lo que separa «el HTML ha llegado» de «la página está
      // dibujada». Si no llega a calmarse, se sigue con lo que haya: una web
      // con un anuncio que nunca termina de cargar no puede dejar a nadie
      // mirando una pantalla en blanco.
      await pagina.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
      const html = await pagina.content();
      const final = new URL(pagina.url());
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(reescribir(html, final));
    } catch (e: any) {
      console.error('[instantanea]', e?.message || e);
      res.status(502).send('<!doctype html><meta charset="utf-8"><body style="font:14px system-ui;padding:2rem;color:#475569">'
        + 'No se ha podido dibujar esta página.</body>');
    } finally {
      instantaneasEnCurso--;
      // La página se cierra SIEMPRE y en cuanto se tiene el HTML. Es lo que
      // hace que esto ocupe segundos y no una sesión entera.
      await pagina?.close().catch(() => {});
      quizasApagar();
    }
  });

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
    void bucleDePantalla(s);
    req.on('close', () => {
      if (s.cliente === res) s.cliente = null;
    });
  });

  /** POST …/:id/entrada — un gesto del usuario, inyectado en la pestaña. */
  app.post('/api/navegador/remoto/:id/entrada', async (req: Request, res: Response) => {
    const s = sesionDe(req, res);
    if (!s) return;
    tocar(s);
    s.ultimoGesto = Date.now();
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
          // `insertText` en vez de `type`: mete el texto TAL CUAL, sin fingir
          // pulsaciones. Es lo que hace que caracteres como «@» —que en un
          // teclado español se escriben con Alt— lleguen bien, y de paso pega
          // instantáneo en vez de letra a letra (Eugenio, 2026-08-20: «el
          // navegador no me permite escribir el arroba»).
          await s.page.keyboard.insertText(String(e.texto || '').slice(0, 2000));
          break;
        case 'copiar':
        case 'cortar': {
          // COPIAR Y CORTAR DE VERDAD (Eugenio, 2026-08-20: «no funciona
          // Command X y Command C»). El Chromium remoto corre en Linux, donde
          // el atajo es Control, no Meta: mandarle «Meta+c» no hacía nada.
          //
          // Y aunque funcionara, el texto acabaría en el portapapeles DEL
          // SERVIDOR, que no le sirve de nada a nadie. Así que se lee la
          // selección y se devuelve, para que el navegador de la persona la
          // ponga en SU portapapeles.
          const sel = await s.page.evaluate(() => String(window.getSelection() || '')).catch(() => '');
          if (e.tipo === 'cortar' && sel) {
            await s.page.keyboard.press('Control+x').catch(() => {});
          }
          empujar(s, { t: 'portapapeles', texto: String(sel).slice(0, 100_000) });
          break;
        }
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
          break;
        }
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: String(err?.message || err).slice(0, 200) });
    }
  });

  /**
   * POST …/:id/transcripcion — la transcripción del vídeo que hay abierto.
   *
   * POR QUÉ ASÍ Y NO CON UNA PETICIÓN NORMAL: se probó primero lo obvio —pedir
   * la página de YouTube desde el servidor y bajar la pista de subtítulos que
   * lleva dentro— y **YouTube devuelve 200 con el cuerpo vacío**, tanto desde
   * el servidor como desde dentro de una página real (comprobado las dos
   * veces, 2026-08-20). Esas direcciones ya no valen por sí solas.
   *
   * Lo que sí funciona es lo que haría una persona: abrir el panel de
   * «Mostrar transcripción» y leerlo. Y para eso hace falta un CLIC DE VERDAD,
   * que es justo lo que Playwright sabe dar y un `element.click()` desde la
   * página no — de ahí que esto viva aquí, en el Chromium que ya tenemos
   * abierto, y no en el módulo de guardar.
   */
  app.post('/api/navegador/remoto/:id/transcripcion', async (req: Request, res: Response) => {
    const s = sesionDe(req, res);
    if (!s) return;
    tocar(s);
    try {
      const url = s.page.url();
      if (!/youtube\.com|youtu\.be/.test(url)) {
        return res.json({ texto: null, motivo: 'no es un vídeo de YouTube' });
      }

      // El botón vive en la descripción, y la descripción tarda en montarse.
      // Se espera a que exista en vez de pulsar a ciegas: el primer intento
      // fallaba justo por esto, no por el selector.
      const boton = s.page.locator(
        'button[aria-label*="ranscripci"], button[aria-label*="ranscript"]'
      ).first();
      try {
        await boton.waitFor({ state: 'attached', timeout: 15000 });
      } catch {
        // Puede seguir escondido dentro de la descripción plegada.
        const expandir = s.page.locator('#expand, tp-yt-paper-button#expand').first();
        if (await expandir.count()) await expandir.click({ timeout: 3000 }).catch(() => {});
        try { await boton.waitFor({ state: 'attached', timeout: 8000 }); }
        catch { return res.json({ texto: null, motivo: 'ese vídeo no tiene transcripción' }); }
      }

      await boton.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
      await boton.click({ timeout: 8000 }).catch(() => {});

      // El panel se llena solo, con su tiempo.
      const seg = s.page.locator('ytd-transcript-segment-renderer').first();
      try { await seg.waitFor({ state: 'attached', timeout: 20000 }); }
      catch { return res.json({ texto: null, motivo: 'la transcripción no ha llegado a cargar' }); }

      const texto: string = await s.page.evaluate(() => {
        const segs = Array.from(document.querySelectorAll('ytd-transcript-segment-renderer'));
        return segs
          .map(x => (x.querySelector('.segment-text') as HTMLElement | null)?.innerText?.trim() || '')
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      });

      if (!texto) return res.json({ texto: null, motivo: 'la transcripción ha salido vacía' });
      res.json({ texto: texto.slice(0, 200_000), palabras: texto.split(/\s+/).length });
    } catch (err: any) {
      res.json({ texto: null, motivo: String(err?.message || err).slice(0, 120) });
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
