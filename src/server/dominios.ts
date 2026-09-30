import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { promises as dns } from 'node:dns';
import { COMPARTIBLES, compartiblePorTipo } from './compartir.js';

// ============================================================================
// DOMINIO PROPIO PARA UNA PÁGINA — como en Notion (2026-08-22)
// ============================================================================
// Eugenio: «permitir que el usuario ponga su dominio propio en una de sus
// páginas como hace notion».
//
// ── LA PIEZA QUE HACE QUE ESTO NO SEA UNA PUERTA ABIERTA ────────────────────
// Un certificado se emite «bajo demanda»: alguien apunta su dominio aquí,
// llega la primera visita, y Caddy pide el certificado en ese momento. Sin
// control, cualquiera que apunte CUALQUIER dominio del mundo a esta IP haría
// que pidamos un certificado para él — y Let's Encrypt corta el grifo a los
// pocos intentos fallidos, dejando sin certificado también a los dominios
// buenos.
//
// Por eso Caddy pregunta antes: `GET /api/dominios/permitido?host=...`. Sólo
// se responde que sí a un dominio que alguien ha reclamado AQUÍ. La prueba de
// que el dominio es suyo la hace después el propio Let's Encrypt: si el DNS no
// apunta a esta máquina, la validación falla y no hay certificado. O sea, dos
// puertas y ninguna se fía de la otra.

/** Dominios que son de la casa y nadie puede reclamar. */
const RESERVADOS = new Set([
  'humanity.wiki', 'www.humanity.wiki', 'lighthumanity.org', 'localhost',
]);

/**
 * Deja el dominio como se guarda: minúsculas, sin protocolo, sin camino, sin
 * `www.` y sin punto final.
 *
 * `www.` se quita a propósito. Quien escribe `www.sudominio.com` quiere su
 * sitio, no un subdominio distinto, y guardar las dos formas por separado
 * significa que una funciona y la otra no según lo que escribiera ese día.
 * Se guarda la raíz y Caddy sirve las dos.
 */
export function normalizarDominio(entrada: unknown): string | null {
  if (typeof entrada !== 'string') return null;
  let d = entrada.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '');
  d = d.replace(/^www\./, '');
  if (!d) return null;
  // Un dominio de verdad: etiquetas separadas por puntos, letras, dígitos y
  // guiones, al menos un punto, y una extensión de dos letras o más.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d)) return null;
  if (d.length > 253) return null;
  if (!/\.[a-z]{2,}$/.test(d)) return null;
  return d;
}

/** Por qué no se puede usar este dominio, o `null` si se puede. */
export function motivoInvalido(d: string): string | null {
  if (RESERVADOS.has(d)) return 'Ese dominio es de la plataforma.';
  if (d.endsWith('.humanity.wiki')) {
    return 'Los subdominios de humanity.wiki se piden desde «Compartir», no aquí.';
  }
  return null;
}

/**
 * THE SERVER'S PUBLIC IP. Production moved to a new Hetzner machine in
 * September 2026 (37.27.244.35, Helsinki) and `IP_PUBLICA` was not set there,
 * so every custom domain was told to point at the OLD address
 * (167.233.245.191) — which Let's Encrypt then validated against, failing
 * every time. One constant, used by the instructions and by every check.
 * `IP_PUBLICA` (comma-separated) still overrides it.
 */
const IP_POR_DEFECTO = '37.27.244.35';
const nuestrasIps = () => (process.env.IP_PUBLICA || IP_POR_DEFECTO).split(',').map(x => x.trim()).filter(Boolean);

/** Our public IP as written in the DNS instructions (the first one). */
function ipPublica(): string {
  return nuestrasIps()[0];
}

export function registerDominiosRoutes(app: Express, db: any) {
  /**
   * ¿PUEDO EMITIR UN CERTIFICADO PARA ESTE DOMINIO? — lo pregunta Caddy.
   *
   * Sin sesión y a propósito: quien pregunta es el propio servidor web, antes
   * de que exista ninguna petición de usuario. Devuelve 200 si el dominio está
   * reclamado y 403 si no; Caddy sólo mira el código.
   *
   * Es la ruta más caliente de la plataforma en un ataque: quien apunte mil
   * dominios a esta IP genera mil preguntas. Por eso es una consulta por
   * índice único y nada más — ni JOIN, ni sesión, ni registro por línea.
   */
  app.get('/api/dominios/permitido', async (req: Request, res: Response) => {
    try {
      // ── LOS DOS NOMBRES, A PROPÓSITO ──────────────────────────────────
      // Caddy llama con `?domain=`. Yo lo había escrito leyendo `?host=` y mis
      // pruebas pasaban porque las hacía yo mismo con `?host=` — o sea, probé
      // el lado equivocado de la conversación. Lo vio prog6 revisando.
      //
      // Fallaba hacia el lado seguro (nunca habría emitido un certificado en
      // vez de emitir de más), pero habría significado que **ningún dominio
      // propio funcionara jamás**, y sin ningún error visible.
      //
      // Se aceptan los dos y así deja de importar cuál manda esta versión.
      const d = normalizarDominio(req.query.domain ?? req.query.host);
      if (!d) return res.status(403).send('no');

      const r = await db.execute(sql`
        SELECT 1 FROM dominios_paginas
        WHERE dominio = ${d} AND estado IN ('pendiente', 'activo')
        LIMIT 1
      `);
      if (!r.rows[0]) return res.status(403).send('no');

      // ── Y QUE EL DNS APUNTE AQUÍ DE VERDAD ────────────────────────────
      // Estar reclamado NO es ser suyo. Reclamar es un formulario con sesión
      // de nivel 1, y el registro está abierto: cualquiera podía escribir
      // trescientos dominios ajenos, hacer que pidiéramos trescientos
      // certificados, fallar las trescientas validaciones y agotar el cupo de
      // Let's Encrypt —dejando sin certificado a los dominios buenos y a las
      // renovaciones de la casa—. Es exactamente el daño que este `ask` decía
      // evitar, entrando por la otra puerta. Lo vio prog6 revisando.
      //
      // Así que se comprueba lo mismo que va a comprobar Let's Encrypt un
      // segundo después. Hacerlo aquí convierte un fallo caro en un 403 gratis.
      if (!(await apuntaAqui(d))) return res.status(403).send('no');

      res.status(200).send('ok');
    } catch {
      // Ante la duda, NO. Un fallo de base de datos o de DNS no puede
      // convertirse en «emite certificados para lo que sea».
      res.status(403).send('no');
    }
  });

  /**
   * RESOLVER UNA VISITA POR DOMINIO PROPIO — `/api/dominios/resolver?host=`
   *
   * Qué hay que enseñar cuando alguien entra por `lamieldelasierra.com`. Sin
   * sesión: quien llega viene de fuera.
   *
   * Devuelve o una página, o un espacio, y lo dice con `tipo` en vez de
   * hacerle adivinar al navegador por qué campos vienen rellenos.
   */
  app.get('/api/dominios/resolver', async (req: Request, res: Response) => {
    try {
      const d = normalizarDominio(req.query.host ?? req.query.domain);
      if (!d) return res.status(404).json({ error: 'Dominio no válido.' });

      const dom = (await db.execute(sql`
        SELECT dp.entidad_tipo, dp.entidad_id, dp.estado, u.handle
        FROM dominios_paginas dp
        JOIN users u ON u.id = dp.propietario_user_id
        WHERE dp.dominio = ${d} AND dp.estado IN ('pendiente', 'activo')
      `)).rows[0] as any;
      if (!dom) return res.status(404).json({ error: 'Ese dominio no apunta a nada aquí.' });

      // La primera vez que se sirve de verdad se anota. Es lo que distingue
      // «configurado» de «funcionando», y sin ello la pantalla de ajustes
      // diría «activo» de algo que nadie ha conseguido abrir nunca.
      if (dom.estado !== 'activo') {
        await db.execute(sql`
          UPDATE dominios_paginas
          SET estado = 'activo', activo_desde = COALESCE(activo_desde, now()),
              ultimo_error = NULL, updated_at = now()
          WHERE dominio = ${d}
        `);
      }

      if (!dom.entidad_id) {
        return res.json({ tipo: 'espacio', handle: dom.handle });
      }

      // ── UN DOMINIO PUEDE APUNTAR A CUALQUIER COSA COMPARTIBLE (2026-08-25) ─
      // Aquí había una consulta a `knowledge_windows` escrita a mano, y por eso
      // un dominio sólo podía servir una página. Ahora se mira el tipo que
      // guarda la fila y se pregunta a la tabla que le toque, según el registro
      // de `compartir.ts`. Añadir mapas a lo compartible no vuelve a tocar esto.
      const c = compartiblePorTipo(dom.entidad_tipo);
      if (!c) {
        return res.status(404).json({ error: 'Este dominio apunta a algo que ya no se puede compartir.' });
      }

      const p = (await db.execute(sql`
        SELECT e.${sql.raw(c.col.id)}::text AS id,
               e.${sql.raw(c.col.titulo)}::text AS titulo,
               e.${sql.raw(c.col.slug)}::text AS slug,
               u.handle, u.display_name, u.name, u.avatar_url
        FROM ${sql.raw(c.tabla)} e
        JOIN users u ON u.id = e.${sql.raw(c.col.duenyo)}
        WHERE e.${sql.raw(c.col.id)} = ${dom.entidad_id}
          AND e.${sql.raw(c.col.publico)} = true
          ${c.col.archivado ? sql.raw(`AND e.${c.col.archivado} IS NULL`) : sql``}
          ${c.col.borrado ? sql.raw(`AND e.${c.col.borrado} IS NULL`) : sql``}
      `)).rows[0] as any;

      // El dominio existe pero lo que servía se despublicó. No es lo mismo que
      // un dominio que no apunta a nada, y quien lo abre merece saber cuál de
      // las dos cosas pasa.
      if (!p) {
        return res.status(404).json({
          error: `Este dominio apunta a ${/a$/.test(c.nombre) ? 'una ' + c.nombre : 'un ' + c.nombre} que ya no está ${/a$/.test(c.nombre) ? 'publicada' : 'publicado'}.`,
          tipo: 'despublicada',
        });
      }

      res.json({
        tipo: c.tipo,
        id: p.id, titulo: p.titulo, slug: p.slug,
        // La dirección larga viaja con la respuesta: quien llega por un dominio
        // propio puede así ir a la misma cosa dentro de la plataforma sin que
        // la pantalla tenga que saber cómo se arma cada URL.
        ruta: `/@${p.handle}/${p.slug}`,
        autor: { handle: p.handle, nombre: p.display_name || p.name, avatar: p.avatar_url },
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Los dominios que tengo, con su estado y lo que hay que hacer con cada uno. */
  app.get('/api/dominios', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const r = await db.execute(sql`
        SELECT d.id, d.dominio, d.pagina_id, d.estado, d.ultimo_error,
               d.activo_desde, d.created_at, w.title AS pagina_titulo
        FROM dominios_paginas d
        LEFT JOIN knowledge_windows w ON w.id = d.pagina_id
        WHERE d.propietario_user_id = ${req.user.id} AND d.estado <> 'retirado'
        ORDER BY d.created_at DESC
      `);
      res.json({
        dominios: r.rows,
        // Lo que hay que poner en el DNS. Se manda desde el servidor para que
        // el día que cambie la IP no haya que buscarlo en una pantalla.
        instrucciones: {
          a: { nombre: '@', valor: ipPublica() },
          // `www` es OTRO registro A, no un CNAME a humanity.wiki (2026-09-30).
          // humanity.wiki está detrás de Cloudflare, así que un CNAME hacia él
          // llevaba `www.sudominio` a Cloudflare, que no tiene certificado
          // para ese nombre ni sabe de él: la dirección con www no abría
          // nunca. Lo destapó luzhumanidad.com, el primer dominio real.
          // La clave se sigue llamando `cname` para las pantallas ya
          // desplegadas; `tipo` dice lo que es.
          cname: { tipo: 'A', nombre: 'www', valor: ipPublica() },
        },
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * RECLAMAR UN DOMINIO — `POST /api/dominios`
   *
   * No comprueba el DNS aquí. A propósito: el DNS tarda en propagarse y pedirle
   * a alguien que lo tenga ya listo ANTES de poder guardarlo le obliga a
   * configurar a ciegas. Se reserva primero, se dice qué poner, y la prueba la
   * hace el certificado cuando llegue la primera visita.
   */
  app.post('/api/dominios', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });

      const d = normalizarDominio(req.body?.dominio);
      if (!d) {
        return res.status(400).json({ error: 'Eso no parece un dominio. Escríbelo como midominio.com.' });
      }
      const malo = motivoInvalido(d);
      if (malo) return res.status(400).json({ error: malo });

      // Si apunta a una página, tiene que ser suya y estar publicada: un
      // dominio propio sobre una página privada sería una dirección que no
      // enseña nada.
      // `undefined` y `null` NO son lo mismo aquí, y confundirlos cuesta caro:
      // no mandar el campo significa «deja la página como está», y mandarlo a
      // `null` significa «apúntalo al espacio entero». Al probarlo, volver a
      // reclamar un dominio sin nombrar la página lo desconectaba de la suya
      // en silencio, que es la peor forma de perder algo.
      // ── A QUÉ APUNTA: PÁGINA (como siempre) O CUALQUIER COSA COMPARTIBLE ─
      // `pagina_id` se sigue aceptando tal cual: hay dominios funcionando con
      // esa forma y una pantalla que la usa. Es exactamente lo mismo que
      // mandar `{tipo:'pagina', entidad_id:…}`, y se traduce aquí para que
      // debajo haya una sola forma y no dos.
      const traeEntidad = !!req.body && ('entidad_id' in req.body || 'pagina_id' in req.body);
      const tipoPedido = req.body?.entidad_id !== undefined
        ? String(req.body?.tipo || 'pagina')
        : 'pagina';
      const entidadId = !traeEntidad ? null
        : (req.body?.entidad_id ?? req.body?.pagina_id)
          ? String(req.body.entidad_id ?? req.body.pagina_id)
          : null;

      let cTipo = 'pagina';
      if (entidadId) {
        const c = compartiblePorTipo(tipoPedido);
        if (!c) return res.status(400).json({ error: 'Eso no se puede compartir todavía.' });
        cTipo = c.tipo;
        const p = (await db.execute(sql`
          SELECT e.${sql.raw(c.col.publico)} AS publico
          FROM ${sql.raw(c.tabla)} e
          WHERE e.${sql.raw(c.col.id)} = ${entidadId}
            AND e.${sql.raw(c.col.duenyo)} = ${req.user.id}
            ${c.col.archivado ? sql.raw(`AND e.${c.col.archivado} IS NULL`) : sql``}
            ${c.col.borrado ? sql.raw(`AND e.${c.col.borrado} IS NULL`) : sql``}
        `)).rows[0] as any;
        if (!p) return res.status(404).json({ error: `${/a$/.test(c.nombre) ? 'Esa' : 'Ese'} ${c.nombre} no es ${/a$/.test(c.nombre) ? 'tuya' : 'tuyo'} o no existe.` });
        if (!p.publico) {
          return res.status(400).json({
            error: `Publica ${/a$/.test(c.nombre) ? 'la ' + c.nombre : 'el ' + c.nombre} antes de ponerle un dominio: si no, el dominio no enseñaría nada.`,
          });
        }
      }

      const ya = (await db.execute(sql`
        SELECT propietario_user_id, estado FROM dominios_paginas WHERE dominio = ${d}
      `)).rows[0] as any;
      if (ya && ya.propietario_user_id !== req.user.id) {
        // No se dice de quién es. Saber que está cogido basta para entender que
        // no se puede usar; decir quién lo tiene sería contar dónde vive otro.
        return res.status(409).json({ error: 'Ese dominio ya está reclamado.' });
      }

      const id = 'DOM' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase();
      // `pagina_id` se sigue rellenando **sólo** cuando lo que se comparte es
      // una página, para no dejar tirado lo que aún la lee. La pareja
      // `(entidad_tipo, entidad_id)` es la que manda.
      await db.execute(sql`
        INSERT INTO dominios_paginas (id, dominio, propietario_user_id, pagina_id, entidad_tipo, entidad_id, estado)
        VALUES (${id}, ${d}, ${req.user.id},
                ${cTipo === 'pagina' ? entidadId : null},
                ${entidadId ? cTipo : null}, ${entidadId}, 'pendiente')
        ON CONFLICT (dominio) DO UPDATE
          SET pagina_id    = CASE WHEN ${traeEntidad} THEN ${cTipo === 'pagina' ? entidadId : null} ELSE dominios_paginas.pagina_id END,
              entidad_tipo = CASE WHEN ${traeEntidad} THEN ${entidadId ? cTipo : null} ELSE dominios_paginas.entidad_tipo END,
              entidad_id   = CASE WHEN ${traeEntidad} THEN ${entidadId} ELSE dominios_paginas.entidad_id END,
              estado = 'pendiente', ultimo_error = NULL, updated_at = now()
          WHERE dominios_paginas.propietario_user_id = ${req.user.id}
      `);

      res.json({
        dominio: d,
        estado: 'pendiente',
        // Lo que hay que hacer AHORA, en el orden en que hay que hacerlo.
        pasos: [
          `En el panel de tu dominio, crea un registro A: nombre «@», valor ${ipPublica()}.`,
          `Y otro registro A: nombre «www», el mismo valor ${ipPublica()}.`,
          'Espera a que se propague. Suele tardar minutos, a veces horas.',
          `Después abre https://${d} — el certificado se emite solo en esa primera visita.`,
        ],
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * COMPROBAR LA CONEXIÓN — `POST /api/dominios/:id/comprobar` (2026-09-30)
   *
   * Eugenio: «crea un botón que sea COMPROBAR conexión de dominio, y que haga
   * el tema de comprobar que se ha conectado correctamente».
   *
   * Hasta hoy la única prueba era abrir el dominio y mirar. Si fallaba, no se
   * sabía POR QUÉ: DNS sin propagar, la nube naranja de Cloudflare, un A que
   * apunta a otra máquina o un certificado que no llegó se ven iguales desde
   * el navegador. Aquí se miran de uno en uno, en el orden en que dependen
   * unos de otros, y se dice cuál falla y qué hacer.
   *
   * Consulta el DNS en fresco (sin la caché de un minuto) y deja el resultado
   * en esa caché: así, quien acaba de arreglar su DNS no espera a que caduque
   * un «no» viejo para que Caddy le emita el certificado.
   */
  /*
   * SOLICITAR EL CERTIFICADO — `POST /api/dominios/:id/certificado` (2026-09-30)
   *
   * Eugenio: «que no revise cada minuto, sino cuando se le da a un botón de
   * solicitar certificado para conectar dominio». Same route body as
   * `comprobar`, with `solicitar`: public resolvers must agree first, then
   * the certificate is requested now, patiently, instead of on the first
   * visit — so it is ready before anyone opens the domain.
   */
  app.post(['/api/dominios/:id/comprobar', '/api/dominios/:id/certificado'], async (req: Request, res: Response) => {
    const solicitar = req.path.endsWith('/certificado');
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const fila = (await db.execute(sql`
        SELECT id, dominio, estado FROM dominios_paginas
        WHERE id = ${String(req.params.id)} AND propietario_user_id = ${req.user.id}
          AND estado <> 'retirado'
      `)).rows[0] as any;
      if (!fila) return res.status(404).json({ error: 'Ese dominio no es tuyo o no existe.' });

      // Cada comprobación hace consultas de DNS y una petición HTTPS hacia
      // fuera. Sin freno, el botón es una manera gratis de ponernos a
      // golpear un dominio ajeno.
      const ahora = Date.now();
      const ultima = ultimaComprobacion.get(fila.id) ?? 0;
      // Requesting waits longer between presses: each one may reach Let's Encrypt.
      const espera = solicitar ? 30_000 : ESPERA_COMPROBAR_MS;
      if (ahora - ultima < espera) {
        const s = Math.ceil((espera - (ahora - ultima)) / 1000);
        return res.status(429).json({ error: `Espera ${s} s antes de volver a ${solicitar ? 'solicitarlo' : 'comprobar'}.` });
      }
      ultimaComprobacion.set(fila.id, ahora);
      if (ultimaComprobacion.size > 1000) ultimaComprobacion.clear();

      const r = await comprobarConexion(fila.dominio, { solicitar });

      // Se guarda lo que ha salido. `estado` sólo sube a 'activo' cuando todo
      // está bien; si algo falla NO se pone 'fallo', porque `permitido` sólo
      // deja emitir certificados a 'pendiente' y 'activo': marcarlo como
      // fallido impediría justo el arreglo que se está esperando.
      await db.execute(sql`
        UPDATE dominios_paginas SET
          estado = CASE WHEN ${r.listo} THEN 'activo' ELSE estado END,
          activo_desde = CASE WHEN ${r.listo} THEN COALESCE(activo_desde, now()) ELSE activo_desde END,
          ultimo_error = ${r.listo ? null : r.resumen},
          updated_at = now()
        WHERE id = ${fila.id}
      `);

      res.json({ dominio: fila.dominio, estado: r.listo ? 'activo' : fila.estado, ...r });
    } catch (e: any) { console.error('[dominios comprobar]', e); res.status(500).json({ error: e.message }); }
  });

  /** Cambiar a qué página apunta, o retirarlo. */
  app.put('/api/dominios/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const retirar = req.body?.retirar === true;
      // Igual que al reclamarlo: `pagina_id` sigue valiendo y significa
      // `{tipo:'pagina'}`. `undefined` es «no lo toques» y `null` es
      // «apúntalo al espacio entero» — confundirlos desconectaba un dominio
      // de su página en silencio, y eso ya costó una vez.
      const traeEntidad = !!req.body && ('entidad_id' in req.body || 'pagina_id' in req.body);
      const entidadId = !traeEntidad ? undefined
        : ((req.body?.entidad_id ?? req.body?.pagina_id) ? String(req.body.entidad_id ?? req.body.pagina_id) : null);
      const tipo = entidadId ? String(req.body?.tipo || 'pagina') : null;
      if (tipo && !compartiblePorTipo(tipo)) {
        return res.status(400).json({ error: 'Eso no se puede compartir todavía.' });
      }

      const r = await db.execute(sql`
        UPDATE dominios_paginas SET
          estado = CASE WHEN ${retirar} THEN 'retirado' ELSE estado END,
          pagina_id    = CASE WHEN ${entidadId !== undefined} THEN ${tipo === 'pagina' ? entidadId : null} ELSE pagina_id END,
          entidad_tipo = CASE WHEN ${entidadId !== undefined} THEN ${tipo} ELSE entidad_tipo END,
          entidad_id   = CASE WHEN ${entidadId !== undefined} THEN ${entidadId ?? null} ELSE entidad_id END,
          updated_at = now()
        WHERE id = ${String(req.params.id)} AND propietario_user_id = ${req.user.id}
        RETURNING dominio, estado, entidad_tipo, entidad_id
      `);
      if (!r.rows[0]) return res.status(404).json({ error: 'Ese dominio no es tuyo o no existe.' });
      res.json(r.rows[0]);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });
}

/**
 * ¿El DNS de este dominio apunta a esta máquina?
 *
 * Es la misma pregunta que hará Let's Encrypt al validar. Hacerla antes evita
 * pedir certificados condenados a fallar, que es lo que agota el cupo.
 *
 * ── LA CACHÉ ES CORTA Y GUARDA TAMBIÉN LOS «NO» ─────────────────────────────
 * Sesenta segundos. Guardar sólo los «sí» dejaría abierta la puerta de golpear
 * con dominios que fallan: cada intento sería una consulta de DNS nueva. Y no
 * puede ser larga, porque quien acaba de configurar su DNS quiere que funcione
 * ya, no dentro de una hora.
 */
const cacheDns = new Map<string, { apunta: boolean; hasta: number }>();
const VIDA_CACHE_MS = 60_000;

async function apuntaAqui(dominio: string): Promise<boolean> {
  const ahora = Date.now();
  const guardado = cacheDns.get(dominio);
  if (guardado && guardado.hasta > ahora) return guardado.apunta;

  // Nuestras direcciones. Se leen del entorno para que cambiar de máquina no
  // sea buscar una IP escrita a mano en un fichero de código.
  const nuestras = nuestrasIps();

  let apunta = false;
  try {
    // `www.` también vale: quien pone el CNAME en `www` y no toca la raíz
    // tiene el dominio apuntando aquí igualmente.
    const [v4, cname] = await Promise.allSettled([
      dns.resolve4(dominio),
      dns.resolveCname(dominio),
    ]);
    if (v4.status === 'fulfilled' && v4.value.some(ip => nuestras.includes(ip))) apunta = true;
    // A CNAME to humanity.wiki no longer counts: it resolves to Cloudflare,
    // which cannot serve this name. `resolve4` already follows CNAMEs, so a
    // chain that really ends at our IP is still accepted above.
    void cname;
  } catch {
    apunta = false;
  }

  // Se guarda el resultado sea cual sea: ver la nota de arriba.
  cacheDns.set(dominio, { apunta, hasta: ahora + VIDA_CACHE_MS });
  // Un mapa que sólo crece es una fuga. Con mil entradas se vacía entero: son
  // sesenta segundos de caché, no un índice que haya que conservar.
  if (cacheDns.size > 1000) cacheDns.clear();
  return apunta;
}

// ============================================================================
// LA COMPROBACIÓN, PASO A PASO
// ============================================================================

const ultimaComprobacion = new Map<string, number>();
const ESPERA_COMPROBAR_MS = 10_000;

/**
 * Los rangos de Cloudflare que más se ven. Si el A del dominio cae aquí, lo que
 * pasa casi siempre es que está con la «nube naranja» (proxy) y el DNS no
 * enseña nuestra IP. Es el fallo más común y el más desconcertante: el panel
 * dice la IP buena y nosotros vemos otra.
 */
function esDeCloudflare(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (a === 104 && b >= 16 && b <= 31) || (a === 172 && b >= 64 && b <= 71)
    || (a === 188 && b === 114) || (a === 162 && b === 158) || (a === 141 && b === 101);
}

type Paso = { clave: string; ok: boolean; aviso?: boolean; titulo: string; detalle: string };

/**
 * What public resolvers see for the root A record. Let's Encrypt validates
 * from outside, so «our resolver says yes» is not enough: if Cloudflare or
 * Google still see the old value, the validation can fail — and five failures
 * lock the domain out for an hour.
 */
async function ipsPublicas(dominio: string): Promise<Array<{ quien: string; ips: string[] }>> {
  const RESOLUTORES = [{ quien: 'Cloudflare', ip: '1.1.1.1' }, { quien: 'Google', ip: '8.8.8.8' }];
  return Promise.all(RESOLUTORES.map(async r => {
    const res = new dns.Resolver({ timeout: 4000, tries: 2 });
    res.setServers([r.ip]);
    try { return { quien: r.quien, ips: await res.resolve4(dominio) }; }
    catch { return { quien: r.quien, ips: [] }; }
  }));
}

const pausa = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * @param solicitar  The «Solicitar certificado» button (2026-09-30): also
 *   require the public resolvers to agree before asking for anything, and be
 *   patient with the HTTPS step — it is the request that makes Caddy obtain
 *   the certificate, so it retries while Caddy is still issuing.
 */
export async function comprobarConexion(dominio: string, { solicitar = false } = {}): Promise<{
  listo: boolean; resumen: string; pasos: Paso[];
}> {
  const nuestras = nuestrasIps();
  const pasos: Paso[] = [];

  // ── 1. EL REGISTRO A DE LA RAÍZ ────────────────────────────────────────
  const [v4, cname] = await Promise.allSettled([dns.resolve4(dominio), dns.resolveCname(dominio)]);
  const ips = v4.status === 'fulfilled' ? v4.value : [];
  const cnames = cname.status === 'fulfilled' ? cname.value.map(c => c.replace(/\.$/, '').toLowerCase()) : [];
  const raizOk = ips.some(ip => nuestras.includes(ip));

  let detalleA: string;
  if (raizOk) detalleA = `Apunta a ${ips.join(', ')}. Correcto.`;
  else if (ips.length === 0) detalleA = `Todavía no hay registro A. Crea uno con nombre «@» y valor ${nuestras[0]}. Si ya lo has creado, espera: puede tardar minutos u horas en propagarse.`;
  else if (ips.every(esDeCloudflare)) detalleA = `Apunta a ${ips.join(', ')}, que son de Cloudflare. En Cloudflare, pulsa la nube naranja del registro para dejarla gris («DNS only»).`;
  else detalleA = `Apunta a ${ips.join(', ')}, que no es esta plataforma. Cambia el valor del registro A a ${nuestras[0]}.`;
  pasos.push({ clave: 'a', ok: raizOk, titulo: `Registro A de ${dominio}`, detalle: detalleA });

  // ── 2. EL «www» ────────────────────────────────────────────────────────
  // No bloquea: la página funciona sin él. Pero quien escribe www.sudominio
  // y ve un error cree que todo está roto, así que se avisa.
  const www = `www.${dominio}`;
  const [wv4, wcn] = await Promise.allSettled([dns.resolve4(www), dns.resolveCname(www)]);
  const wips = wv4.status === 'fulfilled' ? wv4.value : [];
  const wcns = wcn.status === 'fulfilled' ? wcn.value.map(c => c.replace(/\.$/, '').toLowerCase()) : [];
  // Only our IP counts. `resolve4` follows a CNAME to the root domain, so that
  // setup still passes; a CNAME to humanity.wiki lands on Cloudflare and fails.
  const wwwOk = wips.some(ip => nuestras.includes(ip));
  const wwwAHumanity = wcns.some(c => c.endsWith('humanity.wiki'));
  pasos.push({
    clave: 'www', ok: wwwOk, aviso: !wwwOk, titulo: `Registro de ${www}`,
    detalle: wwwOk ? 'Correcto.'
      : wwwAHumanity ? `Es un CNAME a humanity.wiki, y así no funciona. Bórralo y crea en su lugar un registro A con nombre «www» y valor ${nuestras[0]}.`
      : wips.length && wips.every(esDeCloudflare) ? 'Está detrás de la nube naranja de Cloudflare. Déjala gris.'
      : `Falta o apunta a otro sitio. Crea un registro A con nombre «www» y valor ${nuestras[0]}. No es imprescindible: sin él solo falla la dirección con «www».`,
  });

  // ── 2b. QUE TODO INTERNET LO VEA YA (sólo al solicitar) ────────────────
  // Asking for a certificate while the DNS is half-propagated is the most
  // expensive way to fail: Let's Encrypt counts it. So the button refuses to
  // ask until the public resolvers agree, and says who is still behind.
  let propagado = true;
  if (solicitar && raizOk) {
    const vistas = await ipsPublicas(dominio);
    const atrasados = vistas.filter(v => !v.ips.some(ip => nuestras.includes(ip)));
    propagado = atrasados.length === 0;
    pasos.push({
      clave: 'propagacion', ok: propagado, titulo: 'Propagación del DNS',
      detalle: propagado
        ? `${vistas.map(v => v.quien).join(' y ')} ya ven tu dominio apuntando aquí.`
        : `${atrasados.map(v => `${v.quien} todavía ve ${v.ips.join(', ') || 'nada'}`).join('; ')}. Aún no pedimos el certificado: si lo pidiéramos ahora podría fallar y bloquear tu dominio una hora. Vuelve a pulsar en unos minutos.`,
    });
  }

  // La caché del `ask` de Caddy se pone al día con lo que acabamos de ver:
  // si no, un «no» de hace treinta segundos seguiría negando el certificado.
  cacheDns.set(dominio, { apunta: raizOk, hasta: Date.now() + VIDA_CACHE_MS });

  // ── 3. HTTPS, CERTIFICADO Y QUE RESPONDEMOS NOSOTROS ───────────────────
  // Sin DNS bueno no se intenta: la petición iría a otra máquina y no
  // demostraría nada (y sería ir a llamar a una puerta ajena).
  if (!raizOk || !propagado) {
    pasos.push({ clave: 'https', ok: false, titulo: 'Conexión segura (HTTPS)',
      detalle: !raizOk ? 'Se comprobará cuando el registro A esté bien.' : 'Se pedirá cuando el DNS se haya propagado.' });
  } else {
    // Esta petición es además la «primera visita» que hace que Caddy pida
    // el certificado; por eso se le da tiempo de sobra. When requesting,
    // up to three tries: a TLS error right after the first one usually means
    // Caddy is still talking to Let's Encrypt.
    let ok = false; let detalle = '';
    const intentos = solicitar ? 3 : 1;
    for (let i = 0; i < intentos && !ok; i++) {
      if (i > 0) await pausa(8_000);
      try {
        const r = await fetch(`https://${dominio}/api/dominios/resolver?host=${encodeURIComponent(dominio)}`, {
          signal: AbortSignal.timeout(20_000), redirect: 'manual',
          headers: { accept: 'application/json' },
        });
        const j: any = await r.json().catch(() => null);
        if (j && (j.tipo || j.error)) {
          ok = r.ok;
          detalle = r.ok ? 'Certificado válido y la página responde desde tu dominio.'
            : `El dominio llega bien, pero: ${j.error}`;
        } else {
          detalle = `Responde (código ${r.status}), pero no es esta plataforma. Revisa que no haya otro servicio delante.`;
        }
      } catch (e: any) {
        const c = String(e?.cause?.code || e?.name || '');
        detalle = /CERT|SSL|TLS|ALTNAME|SELF_SIGNED/i.test(c)
          ? 'El DNS está bien, pero el certificado aún no está listo. Suele tardar un minuto; si el DNS se cambió hace poco, Let\'s Encrypt puede tardar hasta una hora en volver a intentarlo.'
          : /Timeout|Abort/i.test(c)
            ? 'No ha respondido a tiempo. El certificado puede estar emitiéndose: vuelve a comprobar en un minuto.'
            : `No se ha podido conectar (${c || 'error de red'}). Si acabas de cambiar el DNS, espera unos minutos.`;
      }
    }
    if (!ok && solicitar && /certificado aún no está listo/.test(detalle)) {
      detalle = 'Hemos pedido el certificado pero no ha llegado. Espera unos minutos y vuelve a pulsar; si sigue igual, avísanos: puede ser un problema de nuestro servidor.';
    }
    pasos.push({ clave: 'https', ok, titulo: 'Conexión segura (HTTPS)', detalle });

    // The www certificate too, so www.<domain> works on the first visit.
    // Best effort: it never blocks the result.
    if (ok && solicitar && wwwOk) {
      await fetch(`https://www.${dominio}/`, { signal: AbortSignal.timeout(20_000), redirect: 'manual' }).catch(() => {});
    }
  }

  const bloqueante = pasos.find(p => !p.ok && !p.aviso);
  return {
    listo: !bloqueante,
    resumen: bloqueante ? bloqueante.detalle : 'Conectado correctamente.',
    pasos,
  };
}
