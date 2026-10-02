import express, { type Express, type Request, type Response } from 'express';
import WebSocket from 'ws';
import fs from 'node:fs';
import { hayPresupuesto } from './ai/tope.js';

// ============================================================================
// DICTADO POR VOZ EN TIEMPO REAL (2026-10-02)
// ============================================================================
// Eugenio: «el voice to text no funciona en el botón de IA ni en el chat de
// IA. Tiene que aparecer, como en Claude, el texto según se pronuncia, en
// tiempo real. Y una pestañita para elegir el micrófono».
//
// Por qué no funcionaba: el dictado era el reconocimiento de voz del propio
// navegador (Web Speech). No existe en Firefox, falla en la app instalada del
// iPhone, usa siempre el micrófono por defecto —no se puede elegir otro— y
// cuando falla no dice nada.
//
// Ahora el navegador graba él mismo (eligiendo micrófono) y manda el audio
// aquí, y esto lo pasa a `gemini-3.5-transcribe-live`, que devuelve el texto
// mientras se habla. Medido el 2026-10-02: la primera palabra llega a ~0,4 s
// de decirla, y la frase entera ~0,5 s después de acabar.
//
// ── POR QUÉ HTTP Y NO UN WEBSOCKET CON EL NAVEGADOR ────────────────────────
// Un websocket con el navegador obligaría a tocar `server.ts` (congelado) para
// engancharse al `upgrade`. Con HTTP basta con rutas: el audio sube en trozos
// de 250 ms (`POST …/audio`) y el texto baja por SSE (`GET …/eventos`), igual
// que ya baja el documento que escribe la IA. El websocket sólo existe entre
// este servidor y Google, que es donde hace falta.
//
// ── LO QUE CUESTA Y CÓMO SE LIMITA ─────────────────────────────────────────
//   · Sólo con sesión iniciada, y sólo si queda presupuesto de IA (`tope.ts`).
//   · Una sesión por persona; 5 minutos como mucho; se cierra sola si deja de
//     llegar audio 20 s. Un micrófono olvidado abierto no gasta toda la noche.
//   · Lo que NO se hace todavía: apuntar el gasto del dictado en el contador.
//     Va en `02_TECH_DEBT.md`.

const MODELO = process.env.GEMINI_TRANSCRIBE_MODEL || 'gemini-3.5-transcribe-live';
const DURACION_MAX = 5 * 60_000;
const SIN_AUDIO_MAX = 20_000;
const SESIONES_MAX = 30;

type Sesion = {
  id: string;
  userId: string;
  ws: WebSocket;
  listo: boolean;
  pendiente: Buffer[];
  oyentes: Set<Response>;
  /** Lo que ya se dijo, por si el SSE se conecta después del primer texto. */
  historial: string[];
  ultimoAudio: number;
  /** Lo ya cerrado, y lo cerrado más lo que se está diciendo. */
  cerrado: string;
  enCurso: string;
  /** Para el registro: qué ha pasado en esta sesión. */
  bytes: number;
  trozos: number;
  textos: number;
  conexiones: number;
  creada: number;
  cerrada: boolean;
};

const sesiones = new Map<string, Sesion>();

/**
 * LA LLAVE DE PRUEBA (2026-10-02). Para comprobar el dictado EN PRODUCCIÓN de
 * punta a punta —Cloudflare, Caddy, el transcriptor— sin entrar con la cuenta
 * de nadie. Sólo existe mientras haya un fichero en el servidor
 * (`/tmp/voz-prueba.llave`) que se crea por SSH antes de la prueba y se borra
 * al acabar; sólo abre las rutas de VOZ, y sólo durante una hora desde que se
 * creó. Sin el fichero, esto no hace nada.
 */
const FICHERO_LLAVE = '/tmp/voz-prueba.llave';
function quien(req: Request): string | null {
  if (req.user?.id) return req.user.id;
  const dada = String(req.headers['x-voz-prueba'] || '');
  if (!dada) return null;
  try {
    const st = fs.statSync(FICHERO_LLAVE);
    if (Date.now() - st.mtimeMs > 3600_000) return null;
    const llave = fs.readFileSync(FICHERO_LLAVE, 'utf8').trim();
    return llave.length >= 32 && dada === llave ? 'PRUEBA_VOZ' : null;
  } catch { return null; }
}

const CABECERAS_SSE = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // Sin esto, un proxy por medio puede juntar los trozos y el texto llegaría
  // a golpes en vez de palabra a palabra.
  'X-Accel-Buffering': 'no',
};

function emitir(s: Sesion, tipo: string, datos: any) {
  const linea = `event: ${tipo}\ndata: ${JSON.stringify(datos)}\n\n`;
  // Se guarda para quien se conecte tarde, con tope: con cada palabra llega
  // una línea y cinco minutos de dictado son muchas.
  if (s.historial.length < 400) s.historial.push(linea);
  for (const r of s.oyentes) r.write(linea);
}

function cerrar(s: Sesion, motivo?: string) {
  if (s.cerrada) return;
  s.cerrada = true;
  // UNA LÍNEA POR DICTADO (2026-10-02). Sin ella, «no funciona» no se podía
  // localizar: no se sabía si había llegado audio, si el transcriptor había
  // contestado ni si alguien escuchaba el canal del texto.
  console.log(`[voz] ${s.id}: ${Math.round(s.bytes / 1024)} KB en ${s.trozos} trozos, ${s.textos} textos, ${s.conexiones} conexiones al canal (${s.oyentes.size} abiertas), ${Math.round((Date.now() - s.creada) / 1000)} s${motivo ? `, ${motivo}` : ''}`);
  if (motivo) emitir(s, 'error', { mensaje: motivo });
  emitir(s, 'fin', {});
  for (const r of s.oyentes) r.end();
  try { s.ws.close(); } catch { /* ya cerrado */ }
  sesiones.delete(s.id);
}

// Cada 5 s se cierran las que se pasaron de tiempo o se quedaron mudas.
setInterval(() => {
  const ahora = Date.now();
  for (const s of sesiones.values()) {
    if (ahora - s.creada > DURACION_MAX) cerrar(s, 'El dictado se ha cortado a los 5 minutos. Vuelve a pulsar el micrófono para seguir.');
    else if (ahora - s.ultimoAudio > SIN_AUDIO_MAX) cerrar(s);
  }
}, 5000).unref?.();

export function registrarVoz(app: Express, db: any) {
  /** Empezar a dictar: abre la conexión con el transcriptor. */
  app.post('/api/voz/sesion', async (req: Request, res: Response) => {
    try {
      const yo = quien(req);
      if (!yo) return res.status(401).json({ error: 'Inicia sesión para dictar por voz.' });
      if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'El dictado no está configurado en este servidor.' });
      const presupuesto = await hayPresupuesto(db);
      if (!presupuesto.ok) return res.status(429).json({ error: presupuesto.mensaje });
      // Una por persona: la anterior se cierra (otra pestaña, o un doble clic).
      for (const s of sesiones.values()) if (s.userId === yo) cerrar(s);
      if (sesiones.size >= SESIONES_MAX) return res.status(503).json({ error: 'Ahora mismo hay demasiada gente dictando. Prueba en un momento.' });

      const id = `VOZ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
      const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${process.env.GEMINI_API_KEY}`);
      const s: Sesion = { id, userId: yo, ws, listo: false, pendiente: [], oyentes: new Set(), historial: [], cerrado: '', enCurso: '', bytes: 0, trozos: 0, textos: 0, conexiones: 0, ultimoAudio: Date.now(), creada: Date.now(), cerrada: false };
      sesiones.set(id, s);

      ws.on('open', () => ws.send(JSON.stringify({ setup: { model: `models/${MODELO}`, inputAudioTranscription: {} } })));
      ws.on('message', raw => {
        let m: any; try { m = JSON.parse(raw.toString()); } catch { return; }
        if (m.setupComplete) {
          s.listo = true;
          for (const b of s.pendiente) enviarAudio(s, b);
          s.pendiente = [];
          emitir(s, 'listo', {});
          return;
        }
        const sc = m.serverContent || {};
        // ── UN SOLO TEXTO, EL DE TODA LA SESIÓN ──────────────────────────
        // Medido el 2026-10-02, el transcriptor no es constante: el texto «en
        // curso» a veces trae TODO lo dicho desde el principio y a veces sólo
        // la frase actual; el «cerrado» igual; y pega frases sin espacio
        // («plataforma.Hola»). Pintar lo que manda tal cual duplicaba trozos
        // («datos dede proyectos»). Así que aquí se reconstruye un único texto
        // y al navegador sólo le llega ése, entero, cada vez.
        const enCurso = sc.interimInputTranscription?.text;
        const cerrado = sc.inputTranscription?.text;
        if (enCurso || cerrado) s.textos++;
        if (enCurso) { s.enCurso = unir(s.cerrado, enCurso); emitir(s, 'texto', { texto: s.enCurso }); }
        if (cerrado) { s.cerrado = unir(s.cerrado, cerrado); s.enCurso = s.cerrado; emitir(s, 'texto', { texto: s.cerrado }); }
      });
      ws.on('close', (codigo, razon) => cerrar(s, codigo !== 1000 ? `el transcriptor cerró (${codigo} ${String(razon).slice(0, 120)})` : undefined));
      ws.on('error', e => { console.error('[voz] transcriptor:', e.message); cerrar(s, 'Se ha cortado la conexión con el dictado.'); });

      res.json({ id });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * PRUEBA DEL CANAL (2026-10-02). Cinco mensajes, uno cada 300 ms, sin
   * sesión ni coste: sirve para comprobar desde fuera que el texto atraviesa
   * Cloudflare y Caddy palabra a palabra y no de golpe al final.
   */
  app.get('/api/voz/prueba-canal', (req: Request, res: Response) => {
    res.writeHead(200, CABECERAS_SSE);
    res.write(': ok\n\n');
    let n = 0;
    const t = setInterval(() => {
      n++;
      res.write(`event: texto\ndata: ${JSON.stringify({ texto: `prueba ${n}`, t: Date.now() })}\n\n`);
      if (n >= 5) { clearInterval(t); res.write('event: fin\ndata: {}\n\n'); res.end(); }
    }, 300);
    req.on('close', () => clearInterval(t));
  });

  /** El texto, según llega. */
  app.get('/api/voz/sesion/:id/eventos', (req: Request, res: Response) => {
    const s = sesiones.get(req.params.id);
    if (!s || s.userId !== quien(req)) return res.status(404).json({ error: 'Ese dictado ya no está abierto.' });
    res.writeHead(200, CABECERAS_SSE);
    res.write(': ok\n\n');
    for (const l of s.historial) res.write(l);
    s.oyentes.add(res);
    s.conexiones++;
    req.on('close', () => s.oyentes.delete(res));
  });

  /** Un trozo de audio: PCM de 16 bits, 16 kHz, mono. */
  app.post('/api/voz/sesion/:id/audio', express.raw({ type: 'application/octet-stream', limit: '256kb' }), (req: Request, res: Response) => {
    const s = sesiones.get(req.params.id);
    if (!s || s.userId !== quien(req)) return res.status(404).json({ error: 'Ese dictado ya no está abierto.' });
    const b = req.body as Buffer;
    if (!Buffer.isBuffer(b) || !b.length) return res.status(400).json({ error: 'Audio vacío.' });
    s.ultimoAudio = Date.now();
    s.bytes += b.length; s.trozos++;
    if (s.listo) enviarAudio(s, b); else s.pendiente.push(b);
    res.status(204).end();
  });

  /** Dejar de dictar: se avisa del final del audio para que cierre la frase. */
  app.post('/api/voz/sesion/:id/fin', (req: Request, res: Response) => {
    const s = sesiones.get(req.params.id);
    if (!s || s.userId !== quien(req)) return res.status(204).end();
    try { if (s.listo) s.ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } })); } catch { /* ya cerrado */ }
    // Se le da un momento para devolver la última frase cerrada.
    setTimeout(() => cerrar(s), 2500);
    res.status(204).end();
  });
}

// Sólo letras y números: el transcriptor a veces corrige una coma de lo ya
// dicho, y eso no debe hacer que se repita la frase entera.
const sinEspacios = (t: string) => t.normalize('NFD').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
/** Espacio tras el punto si dos frases vienen pegadas. */
const limpio = (t: string) => t.replace(/([.!?…;:,])(?=\p{L})/gu, '$1 ').replace(/\s+/g, ' ').trim();

/**
 * Lo cerrado más un texto nuevo del transcriptor. Si el nuevo ya empieza por
 * todo lo cerrado, es el texto entero de la sesión y se queda él; si no, es
 * sólo la frase de ahora y va detrás.
 */
function unir(cerrado: string, nuevo: string): string {
  if (!cerrado) return limpio(nuevo);
  if (sinEspacios(nuevo).startsWith(sinEspacios(cerrado))) return limpio(nuevo);
  return limpio(`${cerrado} ${nuevo}`);
}

function enviarAudio(s: Sesion, b: Buffer) {
  try {
    s.ws.send(JSON.stringify({ realtimeInput: { audio: { data: b.toString('base64'), mimeType: 'audio/pcm;rate=16000' } } }));
  } catch { /* la conexión se cerró: `cerrar` ya avisa */ }
}
