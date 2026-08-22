import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { promises as dns } from 'node:dns';

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
        SELECT dp.pagina_id, dp.estado, u.handle
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

      if (!dom.pagina_id) {
        return res.json({ tipo: 'espacio', handle: dom.handle });
      }

      const p = (await db.execute(sql`
        SELECT w.id, w.title, w.kind, w.config, w.indexable, w.slug,
               w.created_at, w.updated_at,
               u.handle, u.display_name, u.name, u.avatar_url
        FROM knowledge_windows w
        JOIN users u ON u.id = w.creator_user_id
        WHERE w.id = ${dom.pagina_id}
          AND w.publico = true
          AND w.archived_at IS NULL AND w.deleted_at IS NULL
      `)).rows[0] as any;

      // El dominio existe pero la página se despublicó. No es lo mismo que un
      // dominio que no apunta a nada, y quien lo abre merece saber cuál de las
      // dos cosas pasa.
      if (!p) {
        return res.status(404).json({
          error: 'Este dominio apunta a una página que ya no está publicada.',
          tipo: 'despublicada',
        });
      }

      res.json({
        tipo: 'pagina',
        id: p.id, titulo: p.title, kind: p.kind, config: p.config,
        indexable: p.indexable, slug: p.slug,
        autor: { handle: p.handle, nombre: p.display_name || p.name, avatar: p.avatar_url },
        created_at: p.created_at, updated_at: p.updated_at,
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
          cname: { nombre: 'www', valor: 'humanity.wiki' },
          a: { nombre: '@', valor: process.env.IP_PUBLICA || '167.233.245.191' },
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
      const traePagina = req.body && 'pagina_id' in req.body;
      const paginaId = traePagina && req.body.pagina_id ? String(req.body.pagina_id) : null;
      if (paginaId) {
        const p = (await db.execute(sql`
          SELECT publico FROM knowledge_windows
          WHERE id = ${paginaId} AND creator_user_id = ${req.user.id}
            AND archived_at IS NULL AND deleted_at IS NULL
        `)).rows[0] as any;
        if (!p) return res.status(404).json({ error: 'Esa página no es tuya o no existe.' });
        if (!p.publico) {
          return res.status(400).json({ error: 'Publica la página antes de ponerle un dominio: si no, el dominio no enseñaría nada.' });
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
      await db.execute(sql`
        INSERT INTO dominios_paginas (id, dominio, propietario_user_id, pagina_id, estado)
        VALUES (${id}, ${d}, ${req.user.id}, ${paginaId}, 'pendiente')
        ON CONFLICT (dominio) DO UPDATE
          SET pagina_id = CASE WHEN ${traePagina} THEN ${paginaId}
                               ELSE dominios_paginas.pagina_id END,
              estado = 'pendiente', ultimo_error = NULL, updated_at = now()
          WHERE dominios_paginas.propietario_user_id = ${req.user.id}
      `);

      res.json({
        dominio: d,
        estado: 'pendiente',
        // Lo que hay que hacer AHORA, en el orden en que hay que hacerlo.
        pasos: [
          `En el panel de tu dominio, crea un registro A: nombre «@», valor ${process.env.IP_PUBLICA || '167.233.245.191'}.`,
          'Y un registro CNAME: nombre «www», valor humanity.wiki.',
          'Espera a que se propague. Suele tardar minutos, a veces horas.',
          `Después abre https://${d} — el certificado se emite solo en esa primera visita.`,
        ],
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Cambiar a qué página apunta, o retirarlo. */
  app.put('/api/dominios/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const retirar = req.body?.retirar === true;
      const paginaId = req.body?.pagina_id === null ? null
        : req.body?.pagina_id ? String(req.body.pagina_id) : undefined;

      const r = await db.execute(sql`
        UPDATE dominios_paginas SET
          estado = CASE WHEN ${retirar} THEN 'retirado' ELSE estado END,
          pagina_id = CASE WHEN ${paginaId !== undefined} THEN ${paginaId ?? null} ELSE pagina_id END,
          updated_at = now()
        WHERE id = ${String(req.params.id)} AND propietario_user_id = ${req.user.id}
        RETURNING dominio, estado, pagina_id
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
  const nuestras = (process.env.IP_PUBLICA || '167.233.245.191')
    .split(',').map(x => x.trim()).filter(Boolean);

  let apunta = false;
  try {
    // `www.` también vale: quien pone el CNAME en `www` y no toca la raíz
    // tiene el dominio apuntando aquí igualmente.
    const [v4, cname] = await Promise.allSettled([
      dns.resolve4(dominio),
      dns.resolveCname(dominio),
    ]);
    if (v4.status === 'fulfilled' && v4.value.some(ip => nuestras.includes(ip))) apunta = true;
    if (!apunta && cname.status === 'fulfilled') {
      apunta = cname.value.some(c => c.replace(/\.$/, '').toLowerCase().endsWith('humanity.wiki'));
    }
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
