import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import dns from 'node:dns';
import net from 'node:net';
import https from 'node:https';

// ============================================================================
// WEBHOOKS SALIENTES (2026-10-06, carril «espacio», #24)
// ============================================================================
// Cuando pasa algo en lo tuyo —una fila nueva o cambiada en una de tus bases
// de datos, una página tuya que se publica— la plataforma hace un POST a la
// dirección que hayas dado. Tres cosas hacen que esto sea seguro de ofrecer:
//
// ── 1 · NADA DE SSRF ─────────────────────────────────────────────────────────
// Una dirección de webhook es una URL que el SERVIDOR visita por orden de un
// usuario. Sin control, cualquiera podría apuntarla a `http://localhost:5432`,
// a la red interna o a `169.254.169.254` (los metadatos de la nube, donde viven
// credenciales) y leer lo que el servidor puede ver y el usuario no. Defensas,
// todas a la vez porque cada una tapa un agujero de otra:
//   · Solo HTTPS, sin usuario:clave en la URL, y solo los puertos 443 y 8443.
//   · Se rechazan `localhost`, `*.local`, `*.internal`… y toda IP no pública
//     (loopback, privadas, CGNAT, link-local, multicast, reservadas y sus
//     formas IPv6, incluidas las IPv4 «mapeadas» dentro de IPv6).
//   · EL NOMBRE SE RESUELVE Y SE COMPRUEBA EN EL MOMENTO DE CONECTAR, y la
//     conexión usa exactamente esa IP (la función `lookup` del socket es la que
//     valida). Comprobar al crear el webhook no basta: el dueño del dominio
//     puede cambiar la respuesta DNS después («DNS rebinding»).
//   · No se siguen redirecciones (una URL pública podría redirigir a una
//     interna), el tiempo máximo es de 8 s y solo se leen 2 KB de respuesta.
//
// ── 2 · FIRMADO ──────────────────────────────────────────────────────────────
// Cada envío lleva `X-Humanity-Signature: t=<segundos>,v1=<hmac>`, con
// HMAC-SHA256 de `"<t>.<cuerpo>"` y el secreto del webhook. Quien recibe
// recalcula la firma y rechaza lo viejo (la marca de tiempo va firmada, así que
// no se puede reutilizar un envío antiguo).
//
// ── 3 · REINTENTOS Y REGISTRO ────────────────────────────────────────────────
// Un fallo (error de red, o respuesta que no sea 2xx) se reintenta a 1 min,
// 5 min, 30 min, 2 h y 12 h; tras el sexto intento la entrega queda en `fallo`
// y se puede reintentar a mano. Si un webhook acumula 10 entregas fallidas
// seguidas se PAUSA solo (y dice por qué): no se sigue martilleando a un
// servidor que ya no existe. Cada entrega, con su código y su error, se ve en
// el registro de la página /desarrolladores (se guardan 30 días).
//
// Los eventos solo salen de lo TUYO (tus bases de datos, tus páginas): un
// webhook nunca recibe datos de lo que otra persona te ha compartido.

export const EVENTOS = ['row.created', 'row.updated', 'page.published'] as const;
export type Evento = typeof EVENTOS[number] | 'ping';
const esEvento = (e: unknown): e is typeof EVENTOS[number] => (EVENTOS as readonly string[]).includes(e as string);

const ESPERAS_MIN = [1, 5, 30, 120, 720];           // tras el intento 1..5
const MAX_INTENTOS = ESPERAS_MIN.length + 1;         // el 6.º es el último
const FALLOS_PARA_PAUSAR = 10;
const MAX_WEBHOOKS = 10;
const DIAS_DE_REGISTRO = 30;

// ── SSRF: ¿ES UNA DIRECCIÓN PÚBLICA? ────────────────────────────────────────
const v4 = (ip: string): number[] | null => {
  const p = ip.split('.');
  if (p.length !== 4 || p.some(x => !/^\d{1,3}$/.test(x))) return null;
  const n = p.map(Number);
  return n.every(x => x <= 255) ? n : null;
};

/** Las 8 palabras de 16 bits de una IPv6, o null si no se entiende. */
function v6(ip: string): number[] | null {
  let s = ip.toLowerCase();
  const zona = s.indexOf('%'); if (zona >= 0) s = s.slice(0, zona);
  // Sufijo IPv4 («::ffff:1.2.3.4»): se pasa a dos palabras.
  const m = s.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (m) { const q = v4(m[2]); if (!q) return null; s = m[1] + ((q[0] << 8) | q[1]).toString(16) + ':' + ((q[2] << 8) | q[3]).toString(16); }
  const partes = s.split('::');
  if (partes.length > 2) return null;
  const cabeza = partes[0] ? partes[0].split(':') : [];
  const cola = partes.length === 2 && partes[1] ? partes[1].split(':') : [];
  const faltan = 8 - cabeza.length - cola.length;
  if (partes.length === 1 ? faltan !== 0 : faltan < 1) return null;
  const todas = [...cabeza, ...Array(partes.length === 2 ? faltan : 0).fill('0'), ...cola];
  if (todas.length !== 8 || todas.some(x => !/^[0-9a-f]{1,4}$/.test(x))) return null;
  return todas.map(x => parseInt(x, 16));
}

function v4Privada([a, b, c]: number[]): boolean {
  return a === 0 || a === 10 || a === 127 || a >= 224                       // «esta red», privada, loopback, multicast y reservadas
    || (a === 100 && b >= 64 && b <= 127)                                    // CGNAT
    || (a === 169 && b === 254)                                              // link-local (metadatos de la nube)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0 && (c === 0 || c === 2))                        // protocolo IETF y documentación
    || (a === 192 && b === 88 && c === 99)
    || (a === 198 && (b === 18 || b === 19))                                 // pruebas de rendimiento
    || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113);
}

/** true si la IP NO es de internet público. Lo que no se entiende, también (ante la duda, fuera). */
export function ipNoPublica(ip: string): boolean {
  if (net.isIPv4(ip)) { const q = v4(ip); return !q || v4Privada(q); }
  if (net.isIPv6(ip)) {
    const w = v6(ip);
    if (!w) return true;
    const [a, b, c, d, e, f, g, h] = w;
    if (w.every(x => x === 0)) return true;                                  // ::
    if (w.slice(0, 7).every(x => x === 0) && h === 1) return true;           // ::1
    // IPv4 dentro de IPv6: ::ffff:a.b.c.d (mapeada), ::a.b.c.d (compatible) y 64:ff9b::/96 (NAT64).
    const incrustada = [g >> 8, g & 255, h >> 8, h & 255];
    if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && (f === 0xffff || f === 0)) return v4Privada(incrustada);
    if (a === 0x64 && b === 0xff9b) return true;
    if ((a & 0xfe00) === 0xfc00) return true;                                // fc00::/7 (privadas)
    if ((a & 0xffc0) === 0xfe80 || (a & 0xffc0) === 0xfec0) return true;     // link-local y site-local
    if ((a & 0xff00) === 0xff00) return true;                                // multicast
    if (a === 0x2001 && (b === 0 || b === 0xdb8)) return true;              // Teredo y documentación
    if (a === 0x2002) return true;                                           // 6to4 (lleva una IPv4 dentro)
    if (a === 0x100 && b === 0 && c === 0 && d === 0) return true;           // 100::/64 descarte
    return false;
  }
  return true;
}

const HOST_PROHIBIDO = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|home\.arpa)$/i;

/** Valida la FORMA de la dirección (sin red). */
export function urlSegura(texto: string): { ok: true; url: URL } | { ok: false; error: string } {
  let u: URL;
  try { u = new URL(texto); } catch { return { ok: false, error: 'Esa dirección no es una URL válida.' }; }
  if (texto.length > 2000) return { ok: false, error: 'La dirección es demasiado larga.' };
  if (u.protocol !== 'https:') return { ok: false, error: 'La dirección tiene que empezar por https://.' };
  if (u.username || u.password) return { ok: false, error: 'La dirección no puede llevar usuario ni contraseña.' };
  if (u.port && !['443', '8443'].includes(u.port)) return { ok: false, error: 'Solo se permiten los puertos 443 y 8443.' };
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (!host || HOST_PROHIBIDO.test(host) || !host.includes('.') && !net.isIP(host)) return { ok: false, error: 'Esa dirección apunta a la propia máquina o a una red interna, y no se permite.' };
  if (net.isIP(host) && ipNoPublica(host)) return { ok: false, error: 'Esa dirección es de una red privada o reservada, y no se permite.' };
  return { ok: true, url: u };
}

/** Resuelve el nombre y comprueba TODAS sus IP. Devuelve la elegida o el motivo. */
export async function resolverSegura(host: string): Promise<{ address: string; family: 4 | 6 }[]> {
  const h = host.replace(/^\[|\]$/g, '');
  if (net.isIP(h)) {
    if (ipNoPublica(h)) throw new Error('IP no pública');
    return [{ address: h, family: net.isIPv4(h) ? 4 : 6 }];
  }
  const r = await dns.promises.lookup(h, { all: true, verbatim: true });
  if (!r.length) throw new Error('El nombre no se resuelve');
  for (const x of r) if (ipNoPublica(x.address)) throw new Error('El nombre apunta a una IP no pública');
  return r.map(x => ({ address: x.address, family: x.family as 4 | 6 }));
}

/** Lo que Node llama para resolver al conectar: aquí es donde se valida de verdad. */
const lookupSeguro = (host: string, opciones: any, cb: any) => {
  resolverSegura(host).then(
    direcciones => (opciones?.all ? cb(null, direcciones) : cb(null, direcciones[0].address, direcciones[0].family)),
    err => cb(err),
  );
};

// ── EL ENVÍO ────────────────────────────────────────────────────────────────
export const firmar = (secreto: string, t: number, cuerpo: string) =>
  crypto.createHmac('sha256', secreto).update(`${t}.${cuerpo}`).digest('hex');

type Resultado = { ok: boolean; codigo: number | null; error: string | null };

/** Un POST firmado. `lookup` y `tls` solo los cambian las pruebas del propio módulo (no hay ruta HTTP que llegue a ellos). */
export function enviar(url: URL, cuerpo: string, cabeceras: Record<string, string>, opciones: { lookup?: any; tls?: Record<string, any> } = {}): Promise<Resultado> {
  return new Promise(resolve => {
    let terminado = false;
    const fin = (r: Resultado) => { if (!terminado) { terminado = true; resolve(r); } };
    try {
      // Una IP escrita a mano no pasa por `lookup`: se comprueba aquí también.
      const host = url.hostname.replace(/^\[|\]$/g, '');
      if (net.isIP(host) && !opciones.lookup && ipNoPublica(host)) return fin({ ok: false, codigo: null, error: 'IP no pública: no se permite.' });
      const req = https.request({
        protocol: 'https:', hostname: url.hostname.replace(/^\[|\]$/g, ''), port: url.port || 443, path: url.pathname + url.search,
        method: 'POST', timeout: 8000, headers: { ...cabeceras, 'Content-Length': Buffer.byteLength(cuerpo) },
        lookup: opciones.lookup || lookupSeguro, ...(net.isIP(host) ? {} : { servername: host }),
        ...(opciones.tls || {}),
      }, res => {
        let leidos = 0;
        res.on('data', (d: Buffer) => { leidos += d.length; if (leidos > 2048) res.destroy(); });
        res.on('error', () => { /* ya sabemos el código */ });
        const codigo = res.statusCode || 0;
        res.on('close', () => fin(codigo >= 200 && codigo < 300
          ? { ok: true, codigo, error: null }
          : { ok: false, codigo, error: codigo >= 300 && codigo < 400 ? `Respondió con una redirección (${codigo}); no se siguen.` : `Respondió ${codigo}.` }));
        res.resume();
      });
      req.on('timeout', () => { req.destroy(new Error('Tiempo agotado (8 s).')); });
      req.on('error', (e: any) => fin({ ok: false, codigo: null, error: String(e?.message || e).slice(0, 300) }));
      req.end(cuerpo);
    } catch (e: any) { fin({ ok: false, codigo: null, error: String(e?.message || e).slice(0, 300) }); }
  });
}

const iso = (x: any) => (x ? new Date(x).toISOString() : null);
const nid = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const nuevoSecreto = () => 'whsec_' + crypto.randomBytes(24).toString('base64url');

// ── EMITIR: lo llaman bd.ts y compartir.ts ──────────────────────────────────
/**
 * Encola el evento para cada webhook activo de `duenos` que lo pida. Nunca
 * lanza ni se espera: un fallo aquí no puede romper el guardado de una fila.
 */
export async function emitirEvento(db: any, evento: Evento, duenos: (string | null | undefined)[], data: Record<string, any>, tablaId?: string | null) {
  try {
    const ids = [...new Set(duenos.filter((x): x is string => !!x))];
    if (!ids.length) return;
    const r = await db.execute(sql`
      SELECT id FROM webhooks
      WHERE activo AND user_id IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)})
        AND ${evento} = ANY(eventos) AND (tabla_id IS NULL OR tabla_id = ${tablaId ?? null})
    `);
    for (const w of r.rows as any[]) {
      const id = nid('WD');
      await db.execute(sql`
        INSERT INTO webhook_entregas (id, webhook_id, evento, payload)
        VALUES (${id}, ${w.id}, ${evento}, ${JSON.stringify({ id, event: evento, created_at: new Date().toISOString(), data })}::jsonb)
      `);
    }
    if (r.rows.length) setImmediate(() => { void procesarCola(db); });
  } catch (e: any) { console.error('[webhooks] emitir:', e?.message || e); }
}

/** Valores de una fila con el nombre de cada columna (lo que entiende quien integra), sin ficheros ni enlaces. */
const valoresPorNombre = (valores: Record<string, any>, columnas: { id: string; nombre: string; tipo: string }[]) => {
  const out: Record<string, any> = {};
  for (const c of columnas) if (valores?.[c.id] !== undefined && valores[c.id] !== null) out[c.nombre] = valores[c.id];
  return out;
};

/** Evento de una fila: los dueños son el de la tabla y el de su proyecto (nadie más). */
export async function emitirEventoFila(db: any, evento: 'row.created' | 'row.updated', tablaId: string, filaId: string, valores: Record<string, any>, columnas: any[]) {
  try {
    const t = (await db.execute(sql`
      SELECT t.titulo, t.creador_user_id, p.creador_user_id AS proyecto_creador
      FROM bd_tablas t LEFT JOIN proyectos p ON p.id = t.proyecto_id WHERE t.id = ${tablaId}
    `)).rows[0] as any;
    if (!t) return;
    await emitirEvento(db, evento, [t.creador_user_id, t.proyecto_creador], {
      database_id: tablaId, database_title: t.titulo, row_id: filaId, values: valoresPorNombre(valores, columnas),
    }, tablaId);
  } catch (e: any) { console.error('[webhooks] fila:', e?.message || e); }
}

/** Evento de página publicada: solo para quien la creó. */
export async function emitirPaginaPublicada(db: any, paginaId: string) {
  try {
    const p = (await db.execute(sql`SELECT title, slug, creator_user_id FROM knowledge_windows WHERE id = ${paginaId} AND kind = 'pagina' AND deleted_at IS NULL`)).rows[0] as any;
    if (!p) return;
    await emitirEvento(db, 'page.published', [p.creator_user_id], { page_id: paginaId, title: p.title || '', slug: p.slug || null });
  } catch (e: any) { console.error('[webhooks] página:', e?.message || e); }
}

// ── LA COLA ─────────────────────────────────────────────────────────────────
let procesando = false;
export async function procesarCola(db: any, opciones: { lookup?: any; tls?: Record<string, any> } = {}): Promise<number> {
  if (procesando) return 0;
  procesando = true;
  let hechas = 0;
  try {
    // Se «reserva» sumando un arrendamiento de 2 min a `proximo_intento`: si el
    // proceso muere a mitad, la entrega vuelve sola; y con varios procesos,
    // SKIP LOCKED evita que dos manden la misma.
    const r = await db.execute(sql`
      UPDATE webhook_entregas e SET intentos = e.intentos + 1, proximo_intento = now() + interval '2 minutes'
      WHERE e.id IN (
        SELECT id FROM webhook_entregas WHERE estado = 'pendiente' AND proximo_intento <= now()
        ORDER BY proximo_intento LIMIT 10 FOR UPDATE SKIP LOCKED)
      RETURNING e.id, e.webhook_id, e.evento, e.payload, e.intentos
    `);
    for (const e of r.rows as any[]) {
      hechas++;
      const w = (await db.execute(sql`SELECT id, url, secreto, activo FROM webhooks WHERE id = ${e.webhook_id}`)).rows[0] as any;
      let res: Resultado;
      if (!w || !w.activo) {
        res = { ok: false, codigo: null, error: 'El webhook está pausado o ya no existe.' };
        await db.execute(sql`UPDATE webhook_entregas SET estado = 'fallo', ultimo_error = ${res.error} WHERE id = ${e.id}`);
        continue;
      }
      const seg = urlSegura(w.url);
      if ('error' in seg) {
        res = { ok: false, codigo: null, error: seg.error };
      } else {
        const cuerpo = JSON.stringify(e.payload);
        const t = Math.floor(Date.now() / 1000);
        res = await enviar(seg.url, cuerpo, {
          'Content-Type': 'application/json', 'User-Agent': 'Humanity-Webhooks/1',
          'X-Humanity-Event': e.evento, 'X-Humanity-Delivery': e.id,
          'X-Humanity-Signature': `t=${t},v1=${firmar(w.secreto, t, cuerpo)}`,
        }, opciones);
      }
      if (res.ok) {
        await db.execute(sql`UPDATE webhook_entregas SET estado = 'ok', ultimo_codigo = ${res.codigo}, ultimo_error = NULL, entregada_en = now() WHERE id = ${e.id}`);
        await db.execute(sql`UPDATE webhooks SET fallos_seguidos = 0 WHERE id = ${w.id}`);
      } else if (e.intentos >= MAX_INTENTOS) {
        await db.execute(sql`UPDATE webhook_entregas SET estado = 'fallo', ultimo_codigo = ${res.codigo}, ultimo_error = ${res.error} WHERE id = ${e.id}`);
        await db.execute(sql`
          UPDATE webhooks SET fallos_seguidos = fallos_seguidos + 1,
            activo = CASE WHEN fallos_seguidos + 1 >= ${FALLOS_PARA_PAUSAR} THEN false ELSE activo END,
            motivo_pausa = CASE WHEN fallos_seguidos + 1 >= ${FALLOS_PARA_PAUSAR} THEN ${`Pausado solo tras ${FALLOS_PARA_PAUSAR} entregas fallidas seguidas.`} ELSE motivo_pausa END
          WHERE id = ${w.id}
        `);
      } else {
        const espera = ESPERAS_MIN[Math.min(e.intentos, ESPERAS_MIN.length) - 1];
        await db.execute(sql`
          UPDATE webhook_entregas SET ultimo_codigo = ${res.codigo}, ultimo_error = ${res.error},
            proximo_intento = now() + (${espera}::int * interval '1 minute') WHERE id = ${e.id}
        `);
      }
    }
  } catch (e: any) { console.error('[webhooks] cola:', e?.message || e); }
  finally { procesando = false; }
  return hechas;
}

// ── RUTAS: gestionar tus webhooks (con sesión, no con clave de API) ─────────
export function registrarWebhooks(app: Express, db: any) {
  const entrar = (req: Request, res: Response) => {
    if (!req.user) { res.status(401).json({ error: 'Inicia sesión.' }); return null; }
    return req.user.id as string;
  };
  const publico = (w: any) => ({
    id: w.id, url: w.url, eventos: w.eventos, tabla_id: w.tabla_id, activo: w.activo, motivo_pausa: w.motivo_pausa,
    fallos_seguidos: w.fallos_seguidos, creado_en: iso(w.creado_en),
  });
  const validarEventos = (v: unknown): string[] | null => {
    const l = Array.isArray(v) ? [...new Set(v.map(String))] : [];
    return l.length && l.every(esEvento) ? l : null;
  };
  const validarUrl = async (texto: string): Promise<string | null> => {
    const s = urlSegura(texto);
    if ('error' in s) return s.error;
    try { await resolverSegura(s.url.hostname); }
    catch (e: any) { return /no p[uú]blica/.test(e?.message) ? 'Esa dirección apunta a una red privada o reservada, y no se permite.' : 'No se ha podido resolver esa dirección. ¿Está bien escrita?'; }
    return null;
  };
  const tablaTuya = async (yo: string, tablaId: string) => !!(await db.execute(sql`
    SELECT 1 FROM bd_tablas t LEFT JOIN proyectos p ON p.id = t.proyecto_id
    WHERE t.id = ${tablaId} AND t.deleted_at IS NULL AND (t.creador_user_id = ${yo} OR p.creador_user_id = ${yo})
  `)).rows.length;

  app.get('/api/desarrolladores/webhooks', async (req: Request, res: Response) => {
    try {
      const yo = entrar(req, res); if (!yo) return;
      const r = await db.execute(sql`
        SELECT w.*, (SELECT max(creada_en) FROM webhook_entregas e WHERE e.webhook_id = w.id) AS ultima_entrega,
          (SELECT count(*)::int FROM webhook_entregas e WHERE e.webhook_id = w.id AND e.estado = 'pendiente') AS pendientes
        FROM webhooks w WHERE w.user_id = ${yo} ORDER BY w.creado_en DESC
      `);
      res.json({ webhooks: (r.rows as any[]).map(w => ({ ...publico(w), ultima_entrega: iso(w.ultima_entrega), pendientes: w.pendientes })), eventos: EVENTOS });
    } catch (e: any) { console.error('webhooks lista:', e); res.status(500).json({ error: 'No se han podido leer tus webhooks.' }); }
  });

  app.post('/api/desarrolladores/webhooks', async (req: Request, res: Response) => {
    try {
      const yo = entrar(req, res); if (!yo) return;
      const url = String(req.body?.url || '').trim();
      const eventos = validarEventos(req.body?.eventos);
      if (!eventos) return res.status(400).json({ error: `Elige al menos un evento: ${EVENTOS.join(', ')}.` });
      const err = await validarUrl(url);
      if (err) return res.status(400).json({ error: err });
      const tabla = req.body?.tabla_id ? String(req.body.tabla_id) : null;
      if (tabla && !(await tablaTuya(yo, tabla))) return res.status(404).json({ error: 'Esa base de datos no es tuya.' });
      const n = Number(((await db.execute(sql`SELECT count(*)::int AS n FROM webhooks WHERE user_id = ${yo}`)).rows[0] as any).n);
      if (n >= MAX_WEBHOOKS) return res.status(400).json({ error: `Ya tienes ${MAX_WEBHOOKS} webhooks: borra alguno antes.` });
      const id = nid('WH'), secreto = nuevoSecreto();
      await db.execute(sql`
        INSERT INTO webhooks (id, user_id, url, secreto, eventos, tabla_id)
        VALUES (${id}, ${yo}, ${url}, ${secreto}, ${sql`ARRAY[${sql.join(eventos.map(e => sql`${e}`), sql`, `)}]::text[]`}, ${tabla})
      `);
      const w = (await db.execute(sql`SELECT * FROM webhooks WHERE id = ${id}`)).rows[0];
      res.json({ webhook: publico(w), secreto });
    } catch (e: any) { console.error('webhook crear:', e); res.status(500).json({ error: 'No se ha podido crear el webhook.' }); }
  });

  const mio = async (req: Request, res: Response) => {
    const yo = entrar(req, res); if (!yo) return null;
    const w = (await db.execute(sql`SELECT * FROM webhooks WHERE id = ${req.params.id} AND user_id = ${yo}`)).rows[0] as any;
    if (!w) { res.status(404).json({ error: 'Ese webhook no existe.' }); return null; }
    return w;
  };

  app.put('/api/desarrolladores/webhooks/:id', async (req: Request, res: Response) => {
    try {
      const w = await mio(req, res); if (!w) return;
      const url = req.body?.url !== undefined ? String(req.body.url).trim() : w.url;
      if (url !== w.url) { const err = await validarUrl(url); if (err) return res.status(400).json({ error: err }); }
      const eventos = req.body?.eventos !== undefined ? validarEventos(req.body.eventos) : w.eventos;
      if (!eventos) return res.status(400).json({ error: 'Elige al menos un evento.' });
      const activo = req.body?.activo !== undefined ? !!req.body.activo : w.activo;
      await db.execute(sql`
        UPDATE webhooks SET url = ${url}, eventos = ${sql`ARRAY[${sql.join((eventos as string[]).map(e => sql`${e}`), sql`, `)}]::text[]`},
          activo = ${activo}, fallos_seguidos = CASE WHEN ${activo} AND NOT ${w.activo} THEN 0 ELSE fallos_seguidos END,
          motivo_pausa = CASE WHEN ${activo} THEN NULL ELSE motivo_pausa END
        WHERE id = ${w.id}
      `);
      res.json({ webhook: publico((await db.execute(sql`SELECT * FROM webhooks WHERE id = ${w.id}`)).rows[0]) });
    } catch (e: any) { console.error('webhook editar:', e); res.status(500).json({ error: 'No se ha podido guardar.' }); }
  });

  app.post('/api/desarrolladores/webhooks/:id/regenerar', async (req: Request, res: Response) => {
    try {
      const w = await mio(req, res); if (!w) return;
      const secreto = nuevoSecreto();
      await db.execute(sql`UPDATE webhooks SET secreto = ${secreto} WHERE id = ${w.id}`);
      res.json({ secreto });
    } catch (e: any) { res.status(500).json({ error: 'No se ha podido regenerar el secreto.' }); }
  });

  app.delete('/api/desarrolladores/webhooks/:id', async (req: Request, res: Response) => {
    try {
      const w = await mio(req, res); if (!w) return;
      await db.execute(sql`DELETE FROM webhooks WHERE id = ${w.id}`);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: 'No se ha podido borrar.' }); }
  });

  /** Un envío de prueba: el mismo camino que uno real (firma, SSRF, registro). */
  app.post('/api/desarrolladores/webhooks/:id/probar', async (req: Request, res: Response) => {
    try {
      const w = await mio(req, res); if (!w) return;
      const id = nid('WD');
      await db.execute(sql`
        INSERT INTO webhook_entregas (id, webhook_id, evento, payload)
        VALUES (${id}, ${w.id}, 'ping', ${JSON.stringify({ id, event: 'ping', created_at: new Date().toISOString(), data: { mensaje: 'Esto es una prueba de humanity.wiki.' } })}::jsonb)
      `);
      setImmediate(() => { void procesarCola(db); });
      res.json({ ok: true, entrega: id });
    } catch (e: any) { res.status(500).json({ error: 'No se ha podido enviar la prueba.' }); }
  });

  app.get('/api/desarrolladores/webhooks/:id/entregas', async (req: Request, res: Response) => {
    try {
      const w = await mio(req, res); if (!w) return;
      const r = await db.execute(sql`
        SELECT id, evento, estado, intentos, proximo_intento, ultimo_codigo, ultimo_error, creada_en, entregada_en
        FROM webhook_entregas WHERE webhook_id = ${w.id} ORDER BY creada_en DESC LIMIT 50
      `);
      res.json({ entregas: (r.rows as any[]).map(e => ({ ...e, proximo_intento: iso(e.proximo_intento), creada_en: iso(e.creada_en), entregada_en: iso(e.entregada_en) })) });
    } catch (e: any) { res.status(500).json({ error: 'No se ha podido leer el registro.' }); }
  });

  app.post('/api/desarrolladores/entregas/:id/reintentar', async (req: Request, res: Response) => {
    try {
      const yo = entrar(req, res); if (!yo) return;
      const r = await db.execute(sql`
        UPDATE webhook_entregas e SET estado = 'pendiente', intentos = 0, proximo_intento = now()
        FROM webhooks w WHERE e.id = ${req.params.id} AND w.id = e.webhook_id AND w.user_id = ${yo} AND e.estado = 'fallo'
        RETURNING e.id
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Esa entrega no existe o no ha fallado.' });
      setImmediate(() => { void procesarCola(db); });
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: 'No se ha podido reintentar.' }); }
  });

  // El trabajador: cada 10 s, y una limpieza por hora de lo que pasa de 30 días.
  // `unref()`: el temporizador no impide que el proceso termine.
  setInterval(() => { void procesarCola(db); }, 10_000).unref();
  setInterval(() => {
    db.execute(sql`DELETE FROM webhook_entregas WHERE creada_en < now() - (${DIAS_DE_REGISTRO}::int * interval '1 day')`).catch(() => {});
  }, 3_600_000).unref();
}
