// ============================================================================
// LA CONEXIÓN CON GOOGLE (2026-08-23) — fase 2 de 5
// ============================================================================
// Eugenio: «desarrollaremos una función para conectarnos a tu cuenta de Google
// mediante API y poder acceder de manera segura a tus correos y vídeos
// guardados de YouTube etc, pero los pintaremos a nuestra manera».
//
// Este módulo es solo el cimiento: conectar, guardar el permiso a salvo,
// renovarlo, enseñar el estado y desconectar. Lo que se PINTA con esos datos
// —YouTube, contactos, calendario— son las fases 3, 4 y 5, y todas piden aquí
// su llave con `tokenDe()`.
//
// ── NO ES «ENTRAR CON GOOGLE». SON DOS COSAS DISTINTAS ──────────────────────
// La plataforma ya tenía «entrar con Google» en `auth.ts`: un identificador
// firmado que dice quién eres y se acaba ahí. No da acceso a nada tuyo.
//
// Esto es un permiso que concedes, que DURA, y que deja a la plataforma pedirle
// cosas a Google en tu nombre hasta que lo retires. Por eso usa otro flujo —el
// de código de autorización, con `access_type=offline`— y por eso necesita un
// secreto de cliente que el de entrar no necesitaba.
//
// NO SE MEZCLAN NUNCA. Si alguien un día hace que entrar con Google conceda de
// paso el acceso al correo, habrá convertido un botón de «entrar» en uno de
// «dame tu correo» sin que nadie lo haya pedido.
//
// ── LO QUE CUESTA CADA PERMISO, QUE NO ES OBVIO ─────────────────────────────
// Google clasifica los permisos en tres cajones y el cajón decide el dinero:
//
//   normal      nada que hacer
//   sensible    hay que verificar la aplicación con Google. Trámite, sin coste
//   restringido verificación **y auditoría de seguridad anual de pago**
//               (500–4.500 $/año, hecha por un laboratorio aprobado)
//
// Gmail está en el tercero. YouTube, Calendario y Contactos, en el segundo.
// Por eso la lista de abajo NO incluye Gmail: decisión de Eugenio el
// 2026-08-23 —«para todos, pero solo con lo barato»—. Enchufar Gmail el día que
// compense pagar es añadir su permiso a esta lista y nada más; está montado
// para que ese día no haya que rehacer nada.
//
// ── SIN LLAVES, ESTO NO SE CAE: SE APAGA ────────────────────────────────────
// Igual que el TURN de Cloudflare. Sin `GOOGLE_CLIENT_ID` y
// `GOOGLE_CLIENT_SECRET`, las rutas contestan que no está configurado y la
// pantalla lo dice. Nada más de la plataforma se entera.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import { cifrar, descifrar, hayClaveMaestra } from './seguridad/cifrado.js';

/** Lo que se le pide a Google, y solo esto.
 *
 *  Cada línea es una pantalla de permiso que verá la persona, así que la lista
 *  es también un texto que alguien lee antes de decir que sí. Pedir de más
 *  «por si acaso» es la forma más rápida de que digan que no. */
const PERMISOS = [
  // Quién eres, para poder enseñar de qué cuenta se trata.
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  // Fase 3: vídeos guardados, «me gusta», suscripciones. Con escritura, que es
  // lo que decidió Eugenio, para poder guardar un vídeo desde la plataforma.
  'https://www.googleapis.com/auth/youtube',
  // Fase 4: la agenda. Enlaza con el importador de contactos del iPhone.
  'https://www.googleapis.com/auth/contacts',
  // Fase 5: el calendario.
  'https://www.googleapis.com/auth/calendar',
];

const AUTORIZAR = 'https://accounts.google.com/o/oauth2/v2/auth';

// ── LAS DIRECCIONES DE GOOGLE SE PUEDEN APUNTAR A OTRO SITIO ────────────────
// Solo para poder probar esto. El Google de verdad exige una cuenta real, una
// pantalla que hay que pulsar a mano, y devolvería un permiso duradero sobre el
// correo de una persona; nada de eso cabe en una prueba automática.
//
// Sin estas variables —que en producción no existen— apuntan a Google. Si
// alguien las pone en un servidor de verdad, lo que consigue es mandarle los
// códigos de autorización de sus usuarios a otro sitio, así que **no se ponen
// nunca fuera de una prueba**.
const CANJEAR = () => process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const USUARIO = () => process.env.GOOGLE_USERINFO_URL || 'https://www.googleapis.com/oauth2/v3/userinfo';
const REVOCAR = () => process.env.GOOGLE_REVOKE_URL || 'https://oauth2.googleapis.com/revoke';

/**
 * ¿Se puede ofrecer esto?
 *
 * NO BASTA CON TENER LAS LLAVES DE GOOGLE. Hace falta también poder cifrar, y
 * eso es `CLAVE_MAESTRA`. Sin ella el fallo llegaría en el peor momento
 * posible: la persona ya habría dado el permiso en la pantalla de Google, y al
 * volver no podríamos guardarlo. Habría concedido acceso a su cuenta a cambio
 * de un mensaje de error.
 *
 * Comprobarlo aquí convierte eso en un botón que sencillamente no aparece.
 */
const configurado = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) && hayClaveMaestra();

/** A dónde vuelve Google después de que digas que sí.
 *
 *  Tiene que coincidir LETRA POR LETRA con la que esté dada de alta en la
 *  consola de Google, o el intercambio falla con un error que no dice cuál de
 *  las dos está mal. Por eso se puede fijar por entorno: en local es otra. */
const vuelta = (req: Request) =>
  process.env.GOOGLE_REDIRECT_URI
  || `${req.protocol}://${req.get('host')}/api/google/vuelta`;

// ── EL PASE DE IDA Y VUELTA ─────────────────────────────────────────────────
// Google devuelve a la persona a nuestra dirección con un código. Sin nada más,
// cualquiera podría fabricar esa vuelta y colar una cuenta ajena en la sesión
// de otro. El `state` es lo que lo impide: se firma aquí antes de mandar a
// Google, y al volver se comprueba que lo firmamos nosotros y para quién.
//
// Caduca a los diez minutos: es un viaje de ida y vuelta por una pantalla de
// permiso, no una sesión.
const SECRETO = () => process.env.SESSION_SECRET || 'sin-secreto-en-desarrollo';
const VIDA_PASE_MS = 10 * 60 * 1000;

function firmarPase(userId: string): string {
  const cuerpo = Buffer.from(JSON.stringify({ u: userId, t: Date.now() })).toString('base64url');
  const firma = crypto.createHmac('sha256', SECRETO()).update(cuerpo).digest('base64url');
  return `${cuerpo}.${firma}`;
}

function abrirPase(pase: string): string | null {
  const [cuerpo, firma] = String(pase).split('.');
  if (!cuerpo || !firma) return null;
  const esperada = crypto.createHmac('sha256', SECRETO()).update(cuerpo).digest('base64url');
  // Comparación en tiempo constante: comparar firmas con `===` filtra cuántos
  // caracteres acertaste por lo que tarda.
  const a = Buffer.from(firma), b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const { u, t } = JSON.parse(Buffer.from(cuerpo, 'base64url').toString());
    if (!u || Date.now() - t > VIDA_PASE_MS) return null;
    return String(u);
  } catch { return null; }
}

/**
 * La llave de acceso de alguien, lista para usar.
 *
 * ES LO QUE LLAMAN LAS FASES 3, 4 Y 5, y por eso está exportada: ninguna de
 * ellas debería saber cómo se renueva un permiso de Google ni dónde vive.
 *
 * Devuelve `null` cuando no hay conexión o cuando Google ya no la acepta —y en
 * ese segundo caso deja la marca en la fila, para que la pantalla pueda decir
 * «se ha desconectado, vuelve a conectarla» en vez de fallar con un error
 * técnico que no le dice nada a nadie.
 */
export async function tokenDe(db: any, userId: string): Promise<string | null> {
  if (!configurado()) return null;
  const r = await db.execute(sql`
    SELECT refresco_cifrado, refresco_llave FROM cuentas_google
    WHERE user_id = ${userId} AND rota_desde IS NULL
  `);
  const fila = r.rows[0] as any;
  if (!fila) return null;

  let refresco: string;
  try {
    refresco = descifrar(fila.refresco_cifrado, fila.refresco_llave);
  } catch {
    // El cifrado dice que el dato no cuadra. No se intenta adivinar: se marca
    // rota y se pide reconectar. Un token medio descifrado no es un token.
    await marcarRota(db, userId, 'no se ha podido descifrar la llave guardada');
    return null;
  }

  try {
    const r2 = await fetch(CANJEAR(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refresco,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(10000),
    });
    const j: any = await r2.json().catch(() => null);
    if (!r2.ok || !j?.access_token) {
      // `invalid_grant` es lo que contesta Google cuando la persona ha retirado
      // el permiso desde su cuenta, ha cambiado la contraseña, o el permiso
      // lleva seis meses sin usarse. Es una desconexión, no un fallo nuestro.
      if (j?.error === 'invalid_grant') {
        await marcarRota(db, userId, 'Google ya no acepta el permiso: hay que volver a conectarla');
      }
      return null;
    }
    db.execute(sql`UPDATE cuentas_google SET usada_at = now() WHERE user_id = ${userId}`)
      .catch(() => { /* la marca de uso no puede tumbar una petición */ });
    return String(j.access_token);
  } catch {
    // Google no responde. NO se marca rota: la conexión está bien, es la red la
    // que falla, y marcarla obligaría a la persona a reconectar por un corte.
    return null;
  }
}

async function marcarRota(db: any, userId: string, porque: string) {
  await db.execute(sql`
    UPDATE cuentas_google SET rota_desde = now(), rota_porque = ${porque}
    WHERE user_id = ${userId} AND rota_desde IS NULL
  `).catch(() => {});
}

export function registerGoogleRoutes(app: Express, db: any) {
  /**
   * GET /api/google/estado — ¿hay cuenta conectada, y cuál?
   *
   * Contesta también cuando no hay nada configurado, y lo dice. La pantalla
   * necesita distinguir «no la has conectado» de «esto todavía no está
   * disponible»: son dos frases distintas y una de las dos no es culpa tuya.
   */
  app.get('/api/google/estado', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      if (!configurado()) return res.json({ disponible: false, conectada: false });
      const r = await db.execute(sql`
        SELECT email, permisos, conectada_at, usada_at, rota_desde, rota_porque
        FROM cuentas_google WHERE user_id = ${req.user.id}
      `);
      const c = r.rows[0] as any;
      res.json({
        disponible: true,
        conectada: Boolean(c) && !c.rota_desde,
        email: c?.email || null,
        permisos: c?.permisos || [],
        desde: c?.conectada_at || null,
        usada: c?.usada_at || null,
        rota: Boolean(c?.rota_desde),
        porque: c?.rota_porque || null,
      });
    } catch (e: any) {
      console.error('[google] estado:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/google/conectar — empieza el permiso.
   *
   * Redirige a Google. `prompt=consent` va a propósito: sin él, Google devuelve
   * un `refresh_token` **solo la primera vez**, y quien reconecte después de
   * haber desconectado se quedaría sin llave y sin saber por qué.
   */
  app.get('/api/google/conectar', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    if (!configurado()) {
      return res.status(503).json({ error: 'La conexión con Google todavía no está configurada.' });
    }
    const p = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: vuelta(req),
      response_type: 'code',
      scope: PERMISOS.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state: firmarPase(req.user.id),
    });
    res.redirect(`${AUTORIZAR}?${p}`);
  });

  /**
   * GET /api/google/vuelta — Google devuelve aquí a la persona.
   *
   * Devuelve una PÁGINA y no JSON: quien llega aquí es un navegador que viene
   * de la pantalla de permisos de Google, no una llamada de nuestro código.
   * Enseña qué ha pasado y se cierra sola.
   */
  app.get('/api/google/vuelta', async (req: Request, res: Response) => {
    const pagina = (titulo: string, detalle: string, bien: boolean) => res.send(
      `<!doctype html><meta charset="utf-8"><title>${titulo}</title>`
      + `<body style="font:15px/1.5 system-ui;padding:3rem;max-width:34rem;margin:auto;color:#0f172a">`
      + `<h1 style="font-size:1.1rem">${bien ? '✅' : '⚠️'} ${titulo}</h1>`
      + `<p style="color:#475569">${detalle}</p>`
      + `<p style="color:#94a3b8;font-size:.85rem">Puedes cerrar esta ventana.</p>`
      + `<script>setTimeout(()=>{try{window.opener&&window.opener.postMessage({google:'${bien ? 'ok' : 'error'}'},'*');window.close()}catch(e){}},${bien ? 1200 : 6000})</script>`,
    );

    try {
      if (String(req.query.error || '')) {
        // Decir que no es una respuesta legítima, no un error. Se dice así.
        return pagina('No se ha conectado', 'Has cancelado el permiso, o Google no lo ha concedido. No se ha guardado nada.', false);
      }
      const userId = abrirPase(String(req.query.state || ''));
      if (!userId) return pagina('Esta vuelta no vale', 'El pase ha caducado o no es nuestro. Vuelve a empezar desde la plataforma.', false);

      const codigo = String(req.query.code || '');
      if (!codigo) return pagina('Falta el código', 'Google no ha devuelto el código de autorización.', false);

      const r = await fetch(CANJEAR(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code: codigo,
          grant_type: 'authorization_code',
          redirect_uri: vuelta(req),
        }),
        signal: AbortSignal.timeout(15000),
      });
      const j: any = await r.json().catch(() => null);
      if (!r.ok || !j?.refresh_token) {
        console.error('[google] canje sin refresh_token:', j?.error || r.status);
        return pagina('No se ha podido completar', 'Google no ha devuelto un permiso duradero. Prueba otra vez.', false);
      }

      // Quién es, para poder enseñar de qué cuenta se trata. Si esto falla, la
      // conexión sigue siendo válida: solo se queda sin etiqueta.
      let email: string | null = null;
      let sub = '';
      try {
        const info: any = await (await fetch(USUARIO(), {
          headers: { Authorization: `Bearer ${j.access_token}` },
          signal: AbortSignal.timeout(8000),
        })).json();
        email = info?.email || null;
        sub = String(info?.sub || '');
      } catch { /* sin etiqueta, pero conectada */ }

      const { paquete, llaveEnvuelta } = cifrar(String(j.refresh_token));
      // LA LISTA DE PERMISOS SE MANDA COMO JSON Y SE CONVIERTE EN SQL. Pasar el
      // array de JavaScript tal cual a la plantilla produce una tupla, no un
      // array de Postgres, y la consulta se rompe. La alternativa —coser el
      // literal a mano con comillas— es donde nacen las inyecciones.
      //
      // Y un aviso para quien edite esa consulta: **no se pueden usar comillas
      // invertidas dentro de la plantilla**, ni en un comentario. Cierran el
      // literal y lo de después se evalúa como código. Costó un rato.
      const concedidos = String(j.scope || '').split(' ').filter(Boolean);
      await db.execute(sql`
        INSERT INTO cuentas_google (user_id, google_sub, email, refresco_cifrado, refresco_llave, permisos)
        VALUES (${userId}, ${sub}, ${email}, ${JSON.stringify(paquete)}::jsonb,
                ${JSON.stringify(llaveEnvuelta)}::jsonb,
                -- La lista de permisos, parametrizada: ver la nota de arriba.
                ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(concedidos)}::jsonb)))
        ON CONFLICT (user_id) DO UPDATE SET
          google_sub = EXCLUDED.google_sub, email = EXCLUDED.email,
          refresco_cifrado = EXCLUDED.refresco_cifrado, refresco_llave = EXCLUDED.refresco_llave,
          permisos = EXCLUDED.permisos, conectada_at = now(),
          rota_desde = NULL, rota_porque = NULL
      `);

      // LO QUE CONCEDIÓ PUEDE SER MENOS DE LO QUE SE PIDIÓ. Google deja quitar
      // permisos en su pantalla, y entonces la fase que dependa de uno que no
      // está fallaría sin explicación. Se guarda lo concedido, no lo pedido.
      const faltan = PERMISOS.filter(p => p.startsWith('https://') && !concedidos.includes(p));
      return pagina(
        'Cuenta de Google conectada',
        faltan.length
          ? `Conectada como ${email || 'tu cuenta'}, pero no diste todos los permisos: ${faltan.length} funciones quedarán apagadas hasta que los concedas.`
          : `Conectada como ${email || 'tu cuenta'}. Puedes retirarla cuando quieras desde la plataforma.`,
        true,
      );
    } catch (e: any) {
      console.error('[google] vuelta:', e);
      return pagina('Algo ha fallado', 'No se ha podido completar la conexión. No se ha guardado nada.', false);
    }
  });

  /**
   * DELETE /api/google/conexion — retirar el permiso.
   *
   * SE LE DICE A GOOGLE, no solo se borra aquí. Borrar nuestra fila y callarnos
   * dejaría el permiso vivo en la cuenta de la persona: ella creería haberlo
   * retirado y en su lista de aplicaciones seguiríamos apareciendo. Eso es
   * mentir con una pantalla.
   *
   * Y la fila se borra **igualmente** aunque Google no conteste: lo que la
   * persona ha pedido es que dejemos de tener acceso, y eso sí depende de
   * nosotros.
   */
  app.delete('/api/google/conexion', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const token = await tokenDe(db, req.user.id);
      if (token) {
        await fetch(`${REVOCAR()}?token=${encodeURIComponent(token)}`, {
          method: 'POST', signal: AbortSignal.timeout(8000),
        }).catch(() => { /* se borra igual */ });
      }
      await db.execute(sql`DELETE FROM cuentas_google WHERE user_id = ${req.user.id}`);
      res.json({ ok: true, avisadoAGoogle: Boolean(token) });
    } catch (e: any) {
      console.error('[google] desconectar:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
