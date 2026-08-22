// ============================================================================
// DIRECCIONES PÚBLICAS — el nombre de cada usuario y el de cada página
// ============================================================================
// Hasta hoy una página publicada se compartía como
// `humanity.wiki/paginas/KWMSKG9OVGZZ`: no se puede dictar por teléfono, no
// dice de qué va y no dice de quién es.
//
// Lo que hay aquí es la RESERVA DEL NOMBRE, no la forma de servirlo. Esa
// separación es deliberada y es lo que permite que el subdominio llegue después
// sin romper ningún enlace ya compartido:
//
//     hoy          humanity.wiki/@lighthumanity/astillero-solar
//     con comodín  lighthumanity.humanity.wiki/astillero-solar
//
// Las dos direcciones se resuelven contra las mismas dos columnas. Lo único que
// falta para la segunda es un DNS comodín y un certificado, y ninguna de las dos
// cosas está en este repositorio (ver `drizzle/0054_direcciones_publicas.sql`).
//
// ── LA UNICIDAD ES POR USUARIO, NO GLOBAL ───────────────────────────────────
// Si hubiera una sola bolsa de direcciones, el primero que publicara
// «astillero-solar» se lo quedaría para siempre. Por eso el índice único es
// (usuario, slug): es exactamente para lo que sirve dar un subdominio a cada
// uno.
import type { Express, Request, Response } from 'express';
import { getStripe } from './stripe';
import { rutaLocalDeUpload } from './uploads';
import { puntosDescuentoActivo, puntosPorEuro, pagarConPuntos } from './puntos';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';

/** El alfabeto de un subdominio: minúsculas, números y guiones interiores. */
const FORMATO_HANDLE = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$/;

/**
 * Convierte un texto libre en algo que pueda vivir en una dirección.
 *
 * Quita los acentos en vez de rechazar la palabra: «Astillero Solar — Operación»
 * tiene que poder llegar a «astillero-solar-operacion» sin que nadie tenga que
 * saber qué caracteres se admiten. Fallar aquí y pedirle al usuario que lo
 * arregle sería trasladarle un problema nuestro.
 */
export function aDireccion(texto: string): string {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // «ó» → «o»
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')                        // todo lo demás, un guión
    .replace(/^-+|-+$/g, '')                            // sin guiones en los bordes
    .replace(/-{2,}/g, '-')
    .slice(0, 60)
    .replace(/-+$/, '');                                // por si el corte dejó uno
}

/** Por qué NO vale un nombre, o `null` si vale. En español: se le enseña. */
export function motivoInvalido(handle: string): string | null {
  if (!handle) return 'Escribe un nombre.';
  if (handle.length < 3) return 'Necesita al menos 3 caracteres.';
  if (handle.length > 30) return 'Como mucho 30 caracteres.';
  if (!FORMATO_HANDLE.test(handle)) {
    return 'Solo minúsculas, números y guiones, y no puede empezar ni acabar en guión.';
  }
  // Un nombre que es solo números se confunde con un identificador y además
  // impide que algún día una ruta pueda distinguirlos.
  if (/^[0-9]+$/.test(handle)) return 'No puede ser solo números.';
  return null;
}

export function registerPublicarRoutes(app: Express, db: any) {

  const exigeSesion = (req: Request, res: Response): boolean => {
    if (!req.user) { res.status(401).json({ error: 'Debes iniciar sesión.' }); return false; }
    return true;
  };

  /** ¿Está cogido o reservado? Se pregunta a las dos tablas. */
  async function estaLibre(handle: string, exceptoUsuario: string | null): Promise<string | null> {
    const r = await db.execute(sql`SELECT motivo FROM handles_reservados WHERE handle = ${handle}`);
    if (r.rows[0]) return 'Ese nombre está reservado por la plataforma.';
    const u = await db.execute(sql`SELECT id FROM users WHERE handle = ${handle}`);
    const dueno = u.rows[0] as any;
    if (dueno && dueno.id !== exceptoUsuario) return 'Ese nombre ya está cogido.';
    return null;
  }

  // ── EL NOMBRE DEL USUARIO ─────────────────────────────────────────────────

  /**
   * Comprobar un nombre ANTES de guardarlo, para poder decirlo mientras se
   * escribe. Sin esto, la única forma de saber si está libre es intentar
   * guardarlo y que falle, que es la peor forma de enterarse.
   */
  app.get('/api/publicar/handle-libre', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const handle = aDireccion(String(req.query.handle || ''));
      const malo = motivoInvalido(handle);
      if (malo) return res.json({ libre: false, handle, motivo: malo });
      const cogido = await estaLibre(handle, req.user!.id);
      res.json({ libre: !cogido, handle, motivo: cogido });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * Elegir o cambiar el nombre.
   *
   * SE PUEDE CAMBIAR, y el aviso de que los enlaces antiguos dejan de funcionar
   * se da en la interfaz. Prohibirlo sería más fácil para nosotros y peor para
   * quien se equivoca al escribirlo el primer día; y el nombre viejo NO se
   * libera aquí, se queda reservado a su antiguo dueño, para que nadie pueda
   * cogerlo al minuto siguiente y heredar los enlaces que ya circulan. Ése es
   * el fallo que convierte un cambio de nombre en una suplantación.
   */
  app.put('/api/publicar/handle', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const handle = aDireccion(String((req.body || {}).handle || ''));
      const malo = motivoInvalido(handle);
      if (malo) return res.status(400).json({ error: malo });
      const cogido = await estaLibre(handle, req.user!.id);
      if (cogido) return res.status(409).json({ error: cogido });

      const previo = await db.execute(sql`SELECT handle FROM users WHERE id = ${req.user!.id}`);
      const antiguo = (previo.rows[0] as any)?.handle as string | null;

      await db.execute(sql`UPDATE users SET handle = ${handle}, updated_at = now() WHERE id = ${req.user!.id}`);

      // El nombre que se abandona queda reservado. Cuesta una fila y evita que
      // los enlaces ya compartidos acaben apuntando a otra persona.
      if (antiguo && antiguo !== handle) {
        await db.execute(sql`
          INSERT INTO handles_reservados (handle, motivo)
          VALUES (${antiguo}, ${'abandonado por ' + req.user!.id})
          ON CONFLICT (handle) DO NOTHING
        `);
      }
      res.json({ handle, anterior: antiguo });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ── LA DIRECCIÓN DE UNA PÁGINA ────────────────────────────────────────────

  /**
   * Publicar una página en una dirección, o cambiarla.
   *
   * Si no se manda ninguna, se propone a partir del título — y se le añade un
   * sufijo solo SI hace falta, mirando primero si está libre. Numerar siempre
   * («astillero-solar-1» de entrada) ensucia la dirección de todo el mundo para
   * resolver un choque que casi nunca ocurre.
   */
  app.put('/api/publicar/paginas/:id', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const d = req.body || {};

      const p = await db.execute(sql`
        SELECT id, title, creator_user_id, publico, slug FROM knowledge_windows
        WHERE id = ${req.params.id} AND archived_at IS NULL AND deleted_at IS NULL
      `);
      const pagina = p.rows[0] as any;
      if (!pagina) return res.status(404).json({ error: 'Esa página no existe.' });
      if (pagina.creator_user_id !== req.user!.id && (req.user!.roleLevel ?? 0) < 4) {
        return res.status(403).json({ error: 'Solo quien creó la página puede publicarla.' });
      }

      const u = await db.execute(sql`SELECT handle FROM users WHERE id = ${req.user!.id}`);
      const handle = (u.rows[0] as any)?.handle as string | null;
      // No se puede publicar en una dirección sin tener nombre: la dirección
      // ENTERA es «<nombre>/<pagina>», así que falta la mitad. Se dice cuál.
      if (!handle) {
        return res.status(409).json({ error: 'Antes de publicar, elige tu nombre de espacio.', falta: 'handle' });
      }

      let slug = aDireccion(d.slug || pagina.slug || pagina.title || 'pagina');
      if (!slug) slug = 'pagina';

      // Libre DENTRO de este usuario. La misma dirección en otro espacio no
      // estorba, que es justamente el motivo de que haya espacios.
      const choca = async (s: string) => {
        const r = await db.execute(sql`
          SELECT id FROM knowledge_windows
          WHERE creator_user_id = ${req.user!.id} AND slug = ${s} AND id <> ${pagina.id}
            AND archived_at IS NULL AND deleted_at IS NULL
        `);
        return !!r.rows[0];
      };
      if (await choca(slug)) {
        let n = 2;
        while (await choca(`${slug}-${n}`) && n < 100) n++;
        slug = `${slug}-${n}`;
      }

      const publico = d.publico === undefined ? true : !!d.publico;
      const indexable = d.indexable === undefined ? undefined : !!d.indexable;

      await db.execute(sql`
        UPDATE knowledge_windows SET
          slug      = ${slug},
          publico   = ${publico},
          indexable = COALESCE(${indexable === undefined ? null : indexable}::boolean, indexable),
          updated_at = now()
        WHERE id = ${pagina.id}
      `);

      res.json({
        slug, handle, publico,
        // Se devuelven LAS DOS formas. La de ruta funciona hoy; la de subdominio
        // funcionará en cuanto exista el DNS comodín, y se manda ya para que la
        // interfaz no tenga que aprender la regla por su cuenta el día que
        // cambie.
        url: `/@${handle}/${slug}`,
        url_subdominio: `https://${handle}.humanity.wiki/${slug}`,
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Dejar de publicar. La página no se toca: solo deja de ser alcanzable. */
  app.delete('/api/publicar/paginas/:id', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const p = await db.execute(sql`SELECT creator_user_id FROM knowledge_windows WHERE id = ${req.params.id}`);
      const pagina = p.rows[0] as any;
      if (!pagina) return res.status(404).json({ error: 'Esa página no existe.' });
      if (pagina.creator_user_id !== req.user!.id && (req.user!.roleLevel ?? 0) < 4) {
        return res.status(403).json({ error: 'Solo quien creó la página puede dejar de publicarla.' });
      }
      // El `slug` NO se borra: si vuelve a publicarse, recupera su misma
      // dirección y los enlaces que ya circulaban vuelven a funcionar.
      await db.execute(sql`UPDATE knowledge_windows SET publico = false, updated_at = now() WHERE id = ${req.params.id}`);
      res.json({ ok: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ── RESOLVER UNA DIRECCIÓN ────────────────────────────────────────────────

  /**
   * De `<nombre>/<pagina>` a la página. Sirve para las dos formas de dirección:
   * la ruta la llama con el nombre del camino, y el día que exista el comodín la
   * llamará con el nombre sacado del `Host`. Por eso la resolución vive aquí y
   * no en el enrutador: cambiar de forma no debe cambiar de lógica.
   *
   * NO EXIGE SESIÓN — es la cara pública. Y solo devuelve lo público: una
   * página despublicada responde 404 igual que una que no existe, porque decir
   * «existe pero no puedes verla» ya filtra que existe.
   */
  /**
   * LA PORTADA DE UN ESPACIO — `/api/publicar/espacio/:handle`
   *
   * Quién es esta persona y qué tiene publicado. Es lo que se enseña al entrar
   * en `nombre.humanity.wiki` a secas, sin pedir página.
   *
   * Sin sesión, y a propósito: quien llega viene de fuera. Por eso devuelve
   * SOLO lo que su autor decidió publicar —`publico = true`— y nada más. Un
   * borrador, una página archivada o una que dejó de compartirse no salen de
   * aquí ni para su dueño: si hiciera falta verlas, se entra a la plataforma.
   *
   * Devuelve `null` en `espacio` si el nombre no existe, en vez de una lista
   * vacía. «Esta persona no existe» y «esta persona no ha publicado nada» son
   * dos respuestas distintas y la portada las enseña distinto.
   */
  app.get('/api/publicar/espacio/:handle', async (req: Request, res: Response) => {
    try {
      const handle = String(req.params.handle || '').toLowerCase();
      const u = (await db.execute(sql`
        SELECT id, handle, display_name, name, avatar_url, bio
        FROM users WHERE handle = ${handle}
      `)).rows[0] as any;
      if (!u) return res.status(404).json({ error: 'Ese espacio no existe.' });

      const paginas = (await db.execute(sql`
        SELECT id, title, slug, kind, updated_at, config
        FROM knowledge_windows
        WHERE creator_user_id = ${u.id}
          AND publico = true AND slug IS NOT NULL
          AND archived_at IS NULL AND deleted_at IS NULL
        ORDER BY updated_at DESC
        LIMIT 60
      `)).rows as any[];

      res.json({
        espacio: {
          handle: u.handle,
          nombre: u.display_name || u.name,
          avatar: u.avatar_url,
          bio: u.bio || null,
        },
        paginas: paginas.map(p => ({
          titulo: p.title,
          slug: p.slug,
          tipo: p.kind,
          actualizado: p.updated_at,
          // Un adelanto de una línea, para que la lista no sea sólo títulos.
          // Se saca del primer bloque con texto; si no hay, va `null` y la
          // tarjeta enseña sólo el título, que es honesto.
          adelanto: primerTexto(p.config),
        })),
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * UN PRODUCTO PARA UNA PÁGINA PÚBLICA — `/api/publicar/producto/:id`
   *
   * Existe `GET /api/products`, pero devuelve el catálogo ENTERO. Una página
   * con tres productos no puede descargar todo el mercado tres veces.
   *
   * Sin sesión: es lo que ve quien llega por un enlace. Y devuelve sólo lo
   * que se enseña en un escaparate — nombre, precio, foto, disponibilidad,
   * garantía, devoluciones. Nada de quién lo creó ni a qué proyecto pertenece:
   * eso es del taller, no del escaparate.
   *
   * `stock` merece una nota. La columna admite nulo, y nulo NO es cero: «no
   * lleva la cuenta» y «se ha agotado» son dos cosas distintas y la tarjeta
   * las dice distinto. Aplastar una en la otra pondría «agotado» en todo lo
   * que nadie inventaría.
   */
  app.get('/api/publicar/producto/:id', async (req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`
        SELECT id, name, description, price_cents, currency, images, kind,
               modality, billing_period, stock, warranty, return_policy, category,
               envio_centimos, envio_gratis_desde_centimos, envio_plazo, acepta_puntos,
               (SELECT round(avg(score) / 2.0, 1)::float FROM ratings WHERE entity_type = 'products' AND entity_id = products.id) AS media_estrellas,
               (SELECT count(*)::int FROM ratings WHERE entity_type = 'products' AND entity_id = products.id) AS n_resenas
        FROM products
        WHERE id = ${String(req.params.id)} AND archived_at IS NULL
      `);
      const p = r.rows[0] as any;
      if (!p) return res.status(404).json({ error: 'Ese producto no existe.' });

      const imagenes = Array.isArray(p.images) ? p.images.filter((x: any) => typeof x === 'string') : [];
      res.json({
        id: p.id,
        nombre: p.name,
        descripcion: p.description || null,
        precio_centimos: p.price_cents ?? null,
        moneda: p.currency || 'EUR',
        imagen: imagenes[0] || null,
        imagenes,
        tipo: p.kind || null,
        modalidad: p.modality || null,
        periodo: p.billing_period || null,
        // Una suscripción no cabe en una cesta: el cobro la rechaza si va con
        // cualquier otra cosa, porque un pago único y una cuota mensual no
        // tienen un «total» que signifique nada. Se dice AQUÍ para que la
        // tarjeta no pinte un botón que iba a fallar.
        se_puede_encestar: (p.modality || 'unico') !== 'suscripcion',
        // El stock que se enseña es el que se puede COMPRAR: lo que hay
        // menos lo que otra persona está pagando ahora mismo. Enseñar el
        // bruto pondría «queda 1» a alguien que va a recibir un «se ha
        // agotado» treinta segundos después.
        stock: p.stock === null || p.stock === undefined
          ? null
          : Math.max(0, Number(p.stock) - await reservado(db, p.id)),
        garantia: p.warranty || null,
        devoluciones: p.return_policy || null,
        categoria: p.category || null,
        // Las opiniones, resumidas: media en estrellas (1-5) y cuántas. `null`
        // = nadie ha opinado, que no es lo mismo que cero estrellas.
        valoracion: { media: p.media_estrellas ?? null, n: Number(p.n_resenas || 0) },
        // Si el vendedor acepta cobrar en puntos (y el interruptor está
        // encendido, que lo decide el servidor en /api/publicar/puntos-en-caja).
        acepta_puntos: !!p.acepta_puntos,
        // El envío se cuenta ANTES de comprar, no en la última pantalla. Un
        // coste que aparece al final es la primera causa de carrito
        // abandonado, y en una tienda de una persona es peor: parece un truco.
        envio: {
          // `null` = no lo ha configurado, y entonces no se ofrece envío.
          // `0` = gratis dicho a propósito. No son lo mismo.
          centimos: p.envio_centimos === null || p.envio_centimos === undefined ? null : Number(p.envio_centimos),
          gratis_desde_centimos: p.envio_gratis_desde_centimos === null || p.envio_gratis_desde_centimos === undefined
            ? null : Number(p.envio_gratis_desde_centimos),
          plazo: p.envio_plazo || null,
          // Un archivo no se envía por mensajero. Se dice aquí para que la
          // tarjeta no tenga que adivinarlo del tipo.
          hace_falta: (p.kind || '') === 'fisico',
        },
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * CÓMO VAN MIS VENTAS — `GET /api/publicar/mis-ventas/resumen` (2026-08-22,
   * fase 10 del plan de comercio, la parte que no necesita nada nuevo: leer
   * los pedidos que ya existen y contarlos bien).
   *
   * Este mes (pedidos, euros cobrados, puntos cobrados, sin enviar), la serie
   * de los últimos 6 meses y lo más vendido. Los euros son `importe_centimos`
   * del pedido (lo que pagó el comprador por tarjeta, envío incluido) y los
   * puntos `puntos_usados`: dos columnas, dos números, nunca sumados entre sí.
   * Pedidos devueltos y cancelados no cuentan como venta.
   */
  app.get('/api/publicar/mis-ventas/resumen', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const uid = req.user.id;
      const [mes, serie, top, sinEnviar] = await Promise.all([
        db.execute(sql`
          SELECT count(*)::int AS pedidos,
                 coalesce(sum(importe_centimos), 0)::int AS euros_centimos,
                 coalesce(sum(puntos_usados), 0)::float AS puntos
          FROM pedidos
          WHERE vendedor_user_id = ${uid} AND estado NOT IN ('cancelado', 'devuelto')
            AND created_at >= date_trunc('month', now())
        `),
        db.execute(sql`
          SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS mes,
                 count(*)::int AS pedidos,
                 coalesce(sum(importe_centimos), 0)::int AS euros_centimos,
                 coalesce(sum(puntos_usados), 0)::float AS puntos
          FROM pedidos
          WHERE vendedor_user_id = ${uid} AND estado NOT IN ('cancelado', 'devuelto')
            AND created_at >= date_trunc('month', now()) - interval '5 months'
          GROUP BY 1 ORDER BY 1
        `),
        db.execute(sql`
          SELECT x.producto_id, max(x.nombre) AS nombre, sum(x.unidades)::int AS unidades
          FROM (
            SELECT pl.producto_id, pl.producto_nombre AS nombre, pl.unidades
            FROM pedido_lineas pl JOIN pedidos pd ON pd.id = pl.pedido_id
            WHERE pd.vendedor_user_id = ${uid} AND pd.estado NOT IN ('cancelado', 'devuelto')
            UNION ALL
            -- Pedidos de antes del carrito: una sola cosa, sin líneas.
            SELECT pd.producto_id, pd.producto_nombre, coalesce(pd.unidades, 1)
            FROM pedidos pd
            WHERE pd.vendedor_user_id = ${uid} AND pd.estado NOT IN ('cancelado', 'devuelto')
              AND NOT EXISTS (SELECT 1 FROM pedido_lineas pl WHERE pl.pedido_id = pd.id)
          ) x
          WHERE x.producto_id IS NOT NULL
          GROUP BY x.producto_id ORDER BY unidades DESC LIMIT 5
        `),
        db.execute(sql`SELECT count(*)::int AS n FROM pedidos WHERE vendedor_user_id = ${uid} AND estado = 'pagado'`),
      ]);
      res.json({
        mes: mes.rows[0],
        serie: serie.rows,
        mas_vendido: top.rows,
        sin_enviar: Number((sinEnviar.rows[0] as any)?.n ?? 0),
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // CUPONES DEL VENDEDOR (2026-08-22, fase 7 del plan de comercio)
  // ==========================================================================
  /** Mis cupones. */
  app.get('/api/publicar/mis-cupones', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const r = await db.execute(sql`
        SELECT id, codigo, tipo, valor, minimo_centimos, caduca_at, usos_max, usos, activo, created_at
        FROM cupones WHERE vendedor_user_id = ${req.user.id} ORDER BY created_at DESC
      `);
      res.json(r.rows);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Crear un cupón: { codigo, tipo 'porcentaje'|'fijo', valor, minimo_centimos?, caduca?, usos_max? } */
  app.post('/api/publicar/mis-cupones', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const b = req.body || {};
      const codigo = String(b.codigo || '').trim().toUpperCase().replace(/\s+/g, '');
      if (!/^[A-Z0-9\-_]{3,24}$/.test(codigo)) return res.status(400).json({ error: 'El código: de 3 a 24 letras o números, sin espacios.' });
      const tipo = b.tipo === 'fijo' ? 'fijo' : 'porcentaje';
      const valor = Math.round(Number(b.valor));
      if (!Number.isFinite(valor) || valor <= 0 || (tipo === 'porcentaje' && valor > 100)) {
        return res.status(400).json({ error: tipo === 'porcentaje' ? 'El porcentaje va de 1 a 100.' : 'El importe tiene que ser mayor que cero.' });
      }
      const minimo = Math.max(0, Math.round(Number(b.minimo_centimos) || 0));
      const caduca = b.caduca ? new Date(String(b.caduca)) : null;
      if (caduca && Number.isNaN(caduca.getTime())) return res.status(400).json({ error: 'La fecha de caducidad no se entiende.' });
      const usosMax = b.usos_max === null || b.usos_max === undefined || b.usos_max === '' ? null : Math.max(1, Math.round(Number(b.usos_max) || 1));
      const id = 'CUP' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase();
      try {
        await db.execute(sql`
          INSERT INTO cupones (id, vendedor_user_id, codigo, tipo, valor, minimo_centimos, caduca_at, usos_max)
          VALUES (${id}, ${req.user.id}, ${codigo}, ${tipo}, ${valor}, ${minimo}, ${caduca ? caduca.toISOString() : null}, ${usosMax})
        `);
      } catch (e: any) {
        // pg dice 23505 en el error o en su `cause` según quién lo envuelva;
        // se mira en los dos y también en el texto, que es lo que no cambia.
        const texto = `${e?.message || ''} ${e?.cause?.message || ''}`;
        if (String(e?.code) === '23505' || String(e?.cause?.code) === '23505' || /duplicate key|unique/i.test(texto)) {
          return res.status(409).json({ error: 'Ya tienes un cupón con ese código.' });
        }
        throw e;
      }
      res.json({ id, codigo, tipo, valor, minimo_centimos: minimo, caduca_at: caduca, usos_max: usosMax, usos: 0, activo: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Activar / desactivar un cupón mío. Nunca se borra: los pedidos lo citan. */
  app.put('/api/publicar/mis-cupones/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const r = await db.execute(sql`
        UPDATE cupones SET activo = ${!!req.body?.activo}, updated_at = now()
        WHERE id = ${String(req.params.id)} AND vendedor_user_id = ${req.user.id}
        RETURNING id, activo
      `);
      if (!r.rows[0]) return res.status(404).json({ error: 'Ese cupón no es tuyo o no existe.' });
      res.json(r.rows[0]);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * ¿VALE ESTE CÓDIGO PARA ESTA CESTA? — `POST /api/publicar/cupon/comprobar`
   * { codigo, lineas: [{ producto_id, cantidad }] } → { valido, descuento_centimos, motivo }
   * Lo mismo que comprueba el cobro, pero sin cobrar: para que la cesta diga
   * el descuento ANTES de pulsar pagar. Sin sesión: quien compra sin cuenta
   * también tiene cupones.
   */
  app.post('/api/publicar/cupon/comprobar', async (req: Request, res: Response) => {
    try {
      const codigo = String(req.body?.codigo || '').trim().toUpperCase();
      const lineas: any[] = Array.isArray(req.body?.lineas) ? req.body.lineas : [];
      if (!codigo || !lineas.length) return res.json({ valido: false, descuento_centimos: 0, motivo: 'Escribe un código.' });
      const ids = lineas.map(l => String(l?.producto_id || '')).filter(Boolean);
      const productos = (await db.execute(sql`
        SELECT id, price_cents, created_by FROM products
        WHERE id = ANY(string_to_array(${ids.join(',')}, ',')) AND archived_at IS NULL
      `)).rows as any[];
      const vendedores = new Set(productos.map(p => p.created_by));
      if (vendedores.size !== 1) return res.json({ valido: false, descuento_centimos: 0, motivo: 'El cupón es de una sola tienda.' });
      const vendedorId = productos[0].created_by;
      const subtotal = lineas.reduce((n, l) => {
        const p = productos.find(x => x.id === String(l.producto_id));
        return n + (p?.price_cents || 0) * Math.max(1, Math.min(99, Number(l.cantidad) || 1));
      }, 0);
      const c = (await db.execute(sql`
        SELECT codigo, tipo, valor, minimo_centimos, caduca_at, usos_max, usos, activo
        FROM cupones WHERE vendedor_user_id = ${vendedorId} AND codigo = ${codigo}
      `)).rows[0] as any;
      const motivo = !c ? 'Ese código no existe en esta tienda.'
        : !c.activo ? 'Ese código ya no está activo.'
        : c.caduca_at && new Date(c.caduca_at).getTime() < Date.now() ? 'Ese código ha caducado.'
        : c.usos_max !== null && Number(c.usos) >= Number(c.usos_max) ? 'Ese código ya se ha usado todas las veces posibles.'
        : subtotal < Number(c.minimo_centimos || 0) ? `Pide una compra mínima de ${(Number(c.minimo_centimos) / 100).toFixed(2)} €.`
        : null;
      if (motivo) return res.json({ valido: false, descuento_centimos: 0, motivo });
      const descuento = c.tipo === 'porcentaje'
        ? Math.min(subtotal, Math.round((subtotal * Math.min(100, Number(c.valor))) / 100))
        : Math.min(subtotal, Number(c.valor));
      res.json({ valido: true, descuento_centimos: descuento, codigo: c.codigo, motivo: null });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * ¿SE PUEDE PAGAR CON PUNTOS AQUÍ, Y CON CUÁNTOS? — `GET /api/publicar/puntos-en-caja`
   * Lo pregunta la cesta antes de pintar el control. `activo` lo decide el
   * servidor (interruptor PUNTOS_DESCUENTO); `saldo` solo con sesión.
   */
  app.get('/api/publicar/puntos-en-caja', async (req: Request, res: Response) => {
    try {
      const activo = puntosDescuentoActivo();
      let saldo: number | null = null;
      if (activo && req.user) {
        saldo = Number(((await db.execute(sql`SELECT puntos FROM users WHERE id = ${req.user.id}`)).rows[0] as any)?.puntos ?? 0);
      }
      res.json({ activo, con_sesion: !!req.user, saldo, puntos_por_euro: puntosPorEuro() });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // RESEÑAS DE PRODUCTO (2026-08-22, fase 3 del plan de comercio, Programador 7)
  // ==========================================================================
  // Sin tabla nueva: la estrella vive en `ratings` (entity_type 'products',
  // score 0-10 = estrellas × 2) y el texto en `comments` (entity_type
  // 'products'). Una persona, una reseña: la estrella se sobreescribe y el
  // texto anterior se archiva cuando llega el nuevo.
  //
  // «COMPRA VERIFICADA» ES LO QUE PESA. Cualquiera con sesión puede opinar,
  // pero solo la reseña de quien tiene un pedido pagado de ese producto lleva
  // la marca — y solo esas cuentan en el reparto del bote. La pregunta de
  // seguridad de siempre: ¿quién puede subir este número desde fuera? Con la
  // marca, solo quien pagó. El vendedor no puede reseñarse a sí mismo.
  const compraVerificada = async (productoId: string, userId: string, email: string | null) => {
    const r = await db.execute(sql`
      SELECT 1 FROM pedidos pd
      LEFT JOIN pedido_lineas pl ON pl.pedido_id = pd.id
      WHERE pd.estado NOT IN ('cancelado', 'devuelto')
        AND (pd.producto_id = ${productoId} OR pl.producto_id = ${productoId})
        AND (pd.comprador_user_id = ${userId} OR (${email}::text IS NOT NULL AND lower(pd.comprador_email) = lower(${email})))
      LIMIT 1
    `);
    return r.rows.length > 0;
  };

  /** GET /api/publicar/producto/:id/resenas — públicas; `mia` si hay sesión. */
  app.get('/api/publicar/producto/:id/resenas', async (req: Request, res: Response) => {
    try {
      const pid = String(req.params.id);
      const lista = await db.execute(sql`
        SELECT r.user_id, r.score, r.created_at, r.updated_at,
               coalesce(u.display_name, u.name, 'Alguien') AS autor,
               u.avatar_url AS avatar,
               (SELECT c.body FROM comments c
                 WHERE c.entity_type = 'products' AND c.entity_id = r.entity_id
                   AND c.author_user_id = r.user_id AND c.archived_at IS NULL
                 ORDER BY c.created_at DESC LIMIT 1) AS texto,
               EXISTS (
                 SELECT 1 FROM pedidos pd LEFT JOIN pedido_lineas pl ON pl.pedido_id = pd.id
                 WHERE pd.estado NOT IN ('cancelado', 'devuelto')
                   AND (pd.producto_id = r.entity_id OR pl.producto_id = r.entity_id)
                   AND (pd.comprador_user_id = r.user_id OR lower(pd.comprador_email) = lower(u.email))
               ) AS compra_verificada
        FROM ratings r LEFT JOIN users u ON u.id = r.user_id
        WHERE r.entity_type = 'products' AND r.entity_id = ${pid}
        ORDER BY r.updated_at DESC NULLS LAST, r.created_at DESC
        LIMIT 100
      `);
      const filas = (lista.rows as any[]).map(f => ({
        autor: f.autor, avatar: f.avatar || null,
        estrellas: Math.round(Number(f.score) / 2),
        texto: f.texto || null,
        compra_verificada: !!f.compra_verificada,
        fecha: f.updated_at || f.created_at,
        mia: !!req.user && f.user_id === req.user.id,
      }));
      const n = filas.length;
      const media = n ? Math.round((filas.reduce((s, f) => s + f.estrellas, 0) / n) * 10) / 10 : null;
      res.json({ media, n, verificadas: filas.filter(f => f.compra_verificada).length, resenas: filas });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** POST /api/publicar/producto/:id/resena  { estrellas 1-5, texto? } */
  app.post('/api/publicar/producto/:id/resena', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Entra para dejar tu opinión.' });
      const pid = String(req.params.id);
      const estrellas = Math.round(Number(req.body?.estrellas));
      const texto = String(req.body?.texto || '').trim().slice(0, 2000);
      if (!Number.isFinite(estrellas) || estrellas < 1 || estrellas > 5) {
        return res.status(400).json({ error: 'Elige de 1 a 5 estrellas.' });
      }
      const p = (await db.execute(sql`SELECT id, created_by FROM products WHERE id = ${pid} AND archived_at IS NULL`)).rows[0] as any;
      if (!p) return res.status(404).json({ error: 'Ese producto no existe.' });
      if (p.created_by === req.user.id) return res.status(403).json({ error: 'No puedes reseñar lo que vendes tú.' });

      await db.execute(sql`
        INSERT INTO ratings (user_id, entity_type, entity_id, score)
        VALUES (${req.user.id}, 'products', ${pid}, ${estrellas * 2})
        ON CONFLICT (user_id, entity_type, entity_id)
        DO UPDATE SET score = EXCLUDED.score, updated_at = now()
      `);
      // El texto anterior se archiva (nunca se borra) y entra el nuevo.
      await db.execute(sql`
        UPDATE comments SET archived_at = now()
        WHERE entity_type = 'products' AND entity_id = ${pid} AND author_user_id = ${req.user.id} AND archived_at IS NULL
      `);
      if (texto) {
        await db.execute(sql`
          INSERT INTO comments (id, entity_type, entity_id, publication_id, author_user_id, body, created_by, updated_by)
          VALUES (${'CMT' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase()},
                  'products', ${pid}, NULL, ${req.user.id}, ${texto}, ${req.user.id}, ${req.user.id})
        `);
      }
      const verificada = await compraVerificada(pid, req.user.id, req.user.email || null);
      res.json({ success: true, estrellas, compra_verificada: verificada });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * COMPRAR SIN CUENTA — `POST /api/publicar/comprar`
   *
   * Fase 3 del plan de tiendas, y la que decide si esto es una tienda o un
   * escaparate. Hasta hoy, comprar exigía sesión: quien llegaba a la tienda de
   * alguien por un enlace tenía que registrarse en una plataforma de la que no
   * había oído hablar ANTES de poder pagar doce euros de miel. Eso no es una
   * fricción, es una puerta cerrada — y quien la encuentra no se registra, se
   * va.
   *
   * ── POR QUÉ NO REUTILIZA `/api/stripe/checkout/product` ────────────────────
   * Aquella ruta exige sesión y guarda `buyer_id` en los metadatos, porque
   * nació para el mercado de dentro. Aquí no hay comprador con cuenta. Es la
   * misma pasarela y la misma comisión, pero la identidad del comprador es un
   * correo, no una fila de `users`.
   *
   * ── QUÉ SE COMPRUEBA ANTES DE COBRAR ──────────────────────────────────────
   * Que el producto exista, que tenga precio y que quede stock. Cobrar primero
   * y descubrir después que no había es la peor forma de conocer a un cliente.
   * El descuento de stock NO se hace aquí: se hace cuando Stripe confirma el
   * pago, porque una sesión abierta y abandonada no debe reservar nada.
   *
   * ── A DÓNDE VUELVE ────────────────────────────────────────────────────────
   * A la tienda de donde salió, no al dominio principal. Quien compra en
   * `nombre.humanity.wiki` termina ahí; mandarlo a `humanity.wiki/mercado`
   * sería sacarlo de la tienda justo al pagar.
   */
  /**
   * COMPRAR SIN CUENTA, UNA COSA O VARIAS — `POST /api/publicar/comprar`
   *
   * Fase 3 (comprar sin cuenta) y fase 7 (carrito). Acepta las dos formas:
   *   { producto_id, cantidad }              una sola cosa
   *   { lineas: [{ producto_id, cantidad }] } un carrito
   *
   * ── POR QUÉ NO REUTILIZA `/api/stripe/checkout/product` ────────────────────
   * Aquella ruta exige sesión y guarda `buyer_id`, porque nació para el
   * mercado de dentro. Aquí no hay comprador con cuenta: su identidad es un
   * correo, no una fila de `users`.
   *
   * ── TODO DEL MISMO VENDEDOR ───────────────────────────────────────────────
   * Un pago va a UNA cuenta de Stripe. Mezclar dos vendedores en un cobro
   * obligaría a repartir el dinero entre dos destinos, y si uno de los dos no
   * ha terminado su alta, el otro cobraría por él. Se rechaza y se dice por
   * qué, en vez de cobrar y repartir mal.
   *
   * ── EL ENVÍO SE COBRA UNA VEZ ─────────────────────────────────────────────
   * Tres tarros del mismo sitio van en la misma caja. Se cobra el envío más
   * caro de lo que se lleva, no la suma: sumarlos cobraría tres portes por un
   * paquete.
   */
  app.post('/api/publicar/comprar', async (req: Request, res: Response) => {
    try {
      // ── EL INTERRUPTOR DEL COBRO ────────────────────────────────────────
      // Todo lo de vender salió en dos despliegues: primero lo que sólo
      // ENSEÑA (la ficha de producto, la portada, la maquetación) y después lo
      // que COBRA. Mientras el segundo no esté encendido, esta ruta no existe
      // para nadie — y el botón tampoco se pinta, porque `GET
      // /api/publicar/cobro` se lo dice al navegador.
      //
      // Es la norma de Eugenio del 2026-08-22: un despliegue, un cambio. Con
      // dinero de por medio, un despliegue que enseña y cobra a la vez deja
      // sin saber cuál de los dos rompió algo.
      if (!COBRO_ENCENDIDO) {
        return res.status(503).json({ error: 'La compra todavía no está abierta en esta tienda.' });
      }
      const cuerpo = req.body || {};
      // Las dos formas acaban siendo la misma lista.
      const crudas: any[] = Array.isArray(cuerpo.lineas) && cuerpo.lineas.length
        ? cuerpo.lineas
        : [{ producto_id: cuerpo.producto_id, cantidad: cuerpo.cantidad }];

      if (crudas.length > MAX_LINEAS) {
        return res.status(400).json({ error: `No se pueden comprar más de ${MAX_LINEAS} cosas distintas de una vez.` });
      }

      // Un mismo producto repetido en el carrito se suma en una sola línea: si
      // no, se reservaría dos veces y el stock se comprobaría contra sí mismo.
      const pedidas = new Map<string, number>();
      for (const l of crudas) {
        const id = String(l?.producto_id || '').trim();
        if (!id) continue;
        const n = Math.max(1, Math.min(99, Number(l?.cantidad) || 1));
        pedidas.set(id, Math.min(99, (pedidas.get(id) || 0) + n));
      }
      if (pedidas.size === 0) return res.status(400).json({ error: 'No has elegido nada.' });

      const productos = (await db.execute(sql`
        SELECT id, name, description, price_cents, currency, stock, created_by, modality,
               billing_period, kind, envio_centimos, envio_gratis_desde_centimos, envio_plazo, acepta_puntos
        FROM products
        WHERE id = ANY(string_to_array(${[...pedidas.keys()].join(',')}, ','))
          AND archived_at IS NULL
      `)).rows as any[];

      // Se comprueba TODO antes de cobrar NADA. Cobrar la mitad de un carrito
      // y descubrir en la segunda línea que no había es peor que no cobrar.
      const lineas: any[] = [];
      for (const [id, unidades] of pedidas) {
        const p = productos.find(x => x.id === id);
        if (!p) return res.status(404).json({ error: 'Una de las cosas que llevas ya no está a la venta.', producto_id: id });
        if (!p.price_cents) {
          return res.status(400).json({ error: `«${p.name}» no tiene precio: hay que preguntar antes de comprarlo.`, producto_id: id });
        }
        const llevaCuenta = p.stock !== null && p.stock !== undefined;
        const disponible = llevaCuenta ? Number(p.stock) - await reservado(db, p.id) : null;
        if (disponible !== null && disponible < unidades) {
          return res.status(409).json({
            error: disponible <= 0
              ? `«${p.name}» se ha agotado.`
              : `De «${p.name}» solo ${disponible === 1 ? 'queda 1' : `quedan ${disponible}`}.`,
            producto_id: id, stock: Math.max(0, disponible),
          });
        }
        lineas.push({ p, unidades, llevaCuenta });
      }

      const vendedores = new Set(lineas.map(l => l.p.created_by || ''));
      if (vendedores.size > 1) {
        return res.status(400).json({
          error: 'Todo lo que se paga junto tiene que ser de la misma persona. Haz un pago por cada tienda.',
        });
      }

      // Una suscripción no se mezcla con nada: se cobra sola y con su
      // periodicidad. Un pago único y una cuota mensual en la misma sesión no
      // tienen un «total» que signifique algo.
      const suscripciones = lineas.filter(l => l.p.modality === 'suscripcion');
      if (suscripciones.length && lineas.length > 1) {
        return res.status(400).json({ error: 'Una suscripción se paga por separado.' });
      }
      const suscripcion = suscripciones.length === 1;

      const moneda = (lineas[0].p.currency || 'EUR').toLowerCase();
      if (lineas.some(l => (l.p.currency || 'EUR').toLowerCase() !== moneda)) {
        return res.status(400).json({ error: 'No se pueden pagar juntas cosas en monedas distintas.' });
      }

      const subtotal = lineas.reduce((n, l) => n + l.p.price_cents * l.unidades, 0);
      const destino = destinoSeguro(cuerpo.volver_a);
      const esFisico = lineas.some(l => (l.p.kind || '') === 'fisico');

      // El porte más caro de lo que se lleva, no la suma: va todo en una caja.
      // Y si CUALQUIERA de las líneas tiene umbral de envío gratis y el
      // subtotal lo pasa, sale gratis: quien puso el umbral está diciendo «a
      // partir de aquí lo pago yo».
      const fisicas = lineas.filter(l => (l.p.kind || '') === 'fisico');
      const conPorte = fisicas.filter(l => l.p.envio_centimos !== null && l.p.envio_centimos !== undefined);
      const gratisPorUmbral = fisicas.some(l =>
        l.p.envio_gratis_desde_centimos !== null && l.p.envio_gratis_desde_centimos !== undefined &&
        subtotal >= Number(l.p.envio_gratis_desde_centimos));
      const envioCobrado = !esFisico ? null
        : conPorte.length === 0 ? null
        : gratisPorUmbral ? 0
        : Math.max(...conPorte.map(l => Number(l.p.envio_centimos)));

      const vendedorId = lineas[0].p.created_by;
      const vendedor = vendedorId
        ? (await db.execute(sql`SELECT stripe_account_id, charges_enabled FROM stripe_accounts WHERE user_id = ${vendedorId}`)).rows[0] as any
        : null;
      const reparte = !!vendedor?.charges_enabled;
      const comision = Math.round((subtotal * COMISION_BPS) / 10000);

      // ══ CUPÓN DEL VENDEDOR (2026-08-22, fase 7 del plan) ═══════════════
      // Un código del vendedor de TODA la cesta (ya se ha exigido un solo
      // vendedor). Se valida aquí mismo — activo, no caducado, con usos, con
      // el mínimo — y se rebaja del subtotal antes que los puntos. Si no vale,
      // no se cobra a ciegas con otro precio: se dice y se para.
      let cuponCent = 0;
      let cuponRow: any = null;
      const codigoCupon = String(cuerpo.cupon || '').trim().toUpperCase();
      if (codigoCupon) {
        if (suscripcion) return res.status(400).json({ error: 'Una suscripción no admite cupón.' });
        cuponRow = (await db.execute(sql`
          SELECT id, codigo, tipo, valor, minimo_centimos, caduca_at, usos_max, usos, activo
          FROM cupones WHERE vendedor_user_id = ${vendedorId} AND codigo = ${codigoCupon}
        `)).rows[0] as any;
        const motivo = !cuponRow ? 'Ese código no existe en esta tienda.'
          : !cuponRow.activo ? 'Ese código ya no está activo.'
          : cuponRow.caduca_at && new Date(cuponRow.caduca_at).getTime() < Date.now() ? 'Ese código ha caducado.'
          : cuponRow.usos_max !== null && Number(cuponRow.usos) >= Number(cuponRow.usos_max) ? 'Ese código ya se ha usado todas las veces posibles.'
          : subtotal < Number(cuponRow.minimo_centimos || 0) ? `Ese código pide una compra mínima de ${(Number(cuponRow.minimo_centimos) / 100).toFixed(2)} €.`
          : null;
        if (motivo) return res.status(400).json({ error: motivo, cupon: false });
        cuponCent = cuponRow.tipo === 'porcentaje'
          ? Math.min(subtotal, Math.round((subtotal * Math.min(100, Number(cuponRow.valor))) / 100))
          : Math.min(subtotal, Number(cuponRow.valor));
      }

      // ══ PUNTOS EN EL CARRITO (2026-08-22, interruptor PUNTOS_DESCUENTO) ══
      // El comprador con sesión puede pagar con puntos la parte de la cesta
      // cuyos productos ACEPTAN puntos (lo marca cada vendedor), hasta el
      // 100 % de esa parte. El envío siempre va en euros. El vendedor cobra
      // esos puntos por el libro (pagarConPuntos). Si el total en euros se
      // queda en cero, no se abre Stripe: el pedido nace aquí mismo.
      let puntosUsados = 0;
      let descuentoCentimos = 0;
      const pidePuntos = Number(cuerpo.usar_puntos) || 0;
      if (pidePuntos > 0) {
        if (!puntosDescuentoActivo()) {
          return res.status(403).json({ error: 'Pagar con puntos todavía no está activado en esta tienda.' });
        }
        if (!req.user) return res.status(401).json({ error: 'Entra en tu cuenta para pagar con puntos.' });
        if (suscripcion) return res.status(400).json({ error: 'Una suscripción no se paga con puntos.' });
        if (req.user.id === vendedorId) return res.status(400).json({ error: 'No puedes comprarte a ti con puntos.' });
        const aceptan = lineas.filter(l => !!l.p.acepta_puntos).reduce((n, l) => n + l.p.price_cents * l.unidades, 0);
        if (aceptan <= 0) return res.status(400).json({ error: 'Nada de lo que llevas acepta puntos.' });
        const saldo = Number(((await db.execute(sql`SELECT puntos FROM users WHERE id = ${req.user.id}`)).rows[0] as any)?.puntos ?? 0);
        const tasa = puntosPorEuro();
        // Los puntos cubren como mucho lo que acepta puntos y queda por
        // pagar después del cupón: un descuento no se paga dos veces.
        const topePuntos = Math.floor(Math.min(saldo, (Math.min(aceptan, subtotal - cuponCent) / 100) * tasa) * 100) / 100;
        puntosUsados = Math.min(Math.round(pidePuntos * 100) / 100, topePuntos);
        if (puntosUsados <= 0) return res.status(400).json({ error: 'No tienes puntos suficientes para usar aquí.' });
        descuentoCentimos = Math.min(aceptan, Math.round((puntosUsados / tasa) * 100));
      }
      const totalEuros = subtotal - cuponCent - descuentoCentimos + (envioCobrado || 0);
      // La comisión va sobre lo que de verdad se cobra en euros por los
      // productos (sin envío), no sobre el precio de etiqueta.
      const comisionReal = Math.round((Math.max(0, subtotal - cuponCent - descuentoCentimos) * COMISION_BPS) / 10000);

      if (puntosUsados > 0 && totalEuros <= 0) {
        // TODO EN PUNTOS: sin pasarela. El pedido se crea aquí, y el cobro
        // en puntos se hace en la misma llamada; si el libro dice que no
        // (saldo cambió), no hay pedido.
        const pedidoId = 'PED' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase();
        const codigo = Math.random().toString(36).replace(/[^a-hj-np-z2-9]/g, '').slice(0, 8).toUpperCase().padEnd(8, '7');
        const resumen = lineas.length === 1 ? lineas[0].p.name : `${lineas[0].p.name} y ${lineas.length - 1} ${lineas.length === 2 ? 'cosa más' : 'cosas más'}`;
        const todoDigital = lineas.every(l => (l.p.kind || '') === 'digital');
        await db.execute(sql`
          INSERT INTO pedidos (id, codigo, producto_id, producto_nombre, unidades, importe_centimos, envio_centimos, moneda,
                               comprador_user_id, comprador_email, comprador_nombre, vendedor_user_id, estado)
          VALUES (${pedidoId}, ${codigo}, ${lineas.length === 1 ? lineas[0].p.id : null}, ${resumen},
                  ${lineas.length === 1 ? lineas[0].unidades : null}, 0, 0, ${moneda.toUpperCase()},
                  ${req.user!.id}, ${req.user!.email || null}, ${req.user!.displayName || null},
                  ${vendedorId}, ${todoDigital ? 'entregado' : 'pagado'})
        `);
        const ok = await pagarConPuntos(db, req.user!.id, vendedorId, puntosUsados, pedidoId);
        if (!ok) {
          await db.execute(sql`DELETE FROM pedidos WHERE id = ${pedidoId} AND puntos_usados = 0`);
          return res.status(409).json({ error: 'Tu saldo de puntos ha cambiado y ya no alcanza. Vuelve a intentarlo.' });
        }
        if (cuponRow) {
          await db.execute(sql`UPDATE cupones SET usos = usos + 1, updated_at = now() WHERE id = ${cuponRow.id}`);
          await db.execute(sql`UPDATE pedidos SET cupon_codigo = ${cuponRow.codigo}, descuento_centimos = ${cuponCent} WHERE id = ${pedidoId}`);
        }
        for (const l of lineas) {
          await db.execute(sql`
            INSERT INTO pedido_lineas (id, pedido_id, producto_id, producto_nombre, unidades, precio_unitario_centimos)
            VALUES (${'PLN' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase()},
                    ${pedidoId}, ${l.p.id}, ${l.p.name}, ${l.unidades}, ${l.p.price_cents})
          `);
          if (l.llevaCuenta) {
            await db.execute(sql`UPDATE products SET stock = GREATEST(0, stock - ${l.unidades}) WHERE id = ${l.p.id} AND stock IS NOT NULL`);
          }
        }
        return res.json({
          pagado_con_puntos: true, codigo, puntos_usados: puntosUsados,
          subtotal_centimos: subtotal, descuento_centimos: descuentoCentimos, envio_centimos: envioCobrado,
          url: `${destino}${destino.includes('?') ? '&' : '?'}compra=hecha&pedido=${codigo}`,
        });
      }

      // PARTE EN PUNTOS + RESTO EN EUROS: un cupón de Stripe por el importe
      // exacto del descuento, y los puntos viajan en los metadatos para que el
      // webhook los cobre al confirmar el pago (nunca antes: una sesión
      // abandonada no mueve puntos).
      const stripe = getStripe();
      // Un solo cupón de Stripe con la suma de las dos rebajas (la del
      // vendedor y la de los puntos), con el nombre que se verá en el recibo.
      const rebajaTotal = descuentoCentimos + cuponCent;
      const cupon = rebajaTotal > 0
        ? await stripe.coupons.create({
            amount_off: rebajaTotal, currency: moneda, duration: 'once',
            name: [cuponRow ? `Cupón ${cuponRow.codigo}` : '', puntosUsados > 0 ? `${puntosUsados} puntos` : ''].filter(Boolean).join(' + '),
          })
        : null;
      const sesion = await stripe.checkout.sessions.create({
        mode: suscripcion ? 'subscription' : 'payment',
        ...(cupon ? { discounts: [{ coupon: cupon.id }] } : {}),
        ui_mode: 'hosted',
        line_items: lineas.map(l => ({
          price_data: {
            currency: moneda,
            product_data: { name: l.p.name, description: l.p.description || undefined },
            unit_amount: l.p.price_cents,
            ...(suscripcion ? { recurring: { interval: l.p.billing_period === 'anual' ? 'year' as const : 'month' as const } } : {}),
          },
          quantity: l.unidades,
        })),
        ...(suscripcion ? {} : { customer_creation: 'always' as const }),
        ...(esFisico ? {
          shipping_address_collection: { allowed_countries: [...PAISES_DE_ENVIO] },
          ...(envioCobrado !== null ? {
            shipping_options: [{
              shipping_rate_data: {
                type: 'fixed_amount' as const,
                fixed_amount: { amount: envioCobrado, currency: moneda },
                display_name: envioCobrado === 0 ? 'Envío gratis' : 'Envío',
              },
            }],
          } : {}),
        } : {}),
        ...(reparte && !suscripcion ? {
          payment_intent_data: {
            application_fee_amount: comisionReal,
            transfer_data: { destination: vendedor.stripe_account_id },
          },
        } : {}),
        metadata: {
          kind: 'compra_publica',
          vendedor_id: vendedorId || '',
          puntos: puntosUsados > 0 ? String(puntosUsados) : '',
          buyer_id: puntosUsados > 0 && req.user ? req.user.id : '',
          cupon_id: cuponRow ? String(cuponRow.id) : '',
          cupon_codigo: cuponRow ? String(cuponRow.codigo) : '',
          cupon_centimos: cuponCent > 0 ? String(cuponCent) : '',
          envio_centimos: envioCobrado === null ? '' : String(envioCobrado),
          // Qué llevaba el carrito, para que el aviso de Stripe pueda crear el
          // pedido sin volver a preguntarle al navegador — que para entonces
          // ya no está.
          lineas: JSON.stringify(lineas.map(l => [l.p.id, l.unidades, l.p.price_cents])),
          // Se conservan para los pedidos de una sola cosa, que es lo que ya
          // existía y sigue funcionando igual.
          product_id: lineas.length === 1 ? lineas[0].p.id : '',
          quantity: lineas.length === 1 ? String(lineas[0].unidades) : '',
        },
        success_url: `${destino}?compra=hecha&sesion={CHECKOUT_SESSION_ID}`,
        cancel_url: `${destino}?compra=cancelada`,
        expires_at: Math.floor(Date.now() / 1000) + MINUTOS_DE_RESERVA * 60,
      });

      // Las reservas se anotan DESPUÉS de que Stripe acepte: si la sesión
      // falla, no queda stock retenido por una compra que nunca existió.
      for (const l of lineas) {
        if (!l.llevaCuenta) continue;
        await db.execute(sql`
          INSERT INTO reservas_stock (id, producto_id, unidades, stripe_session_id, estado, expira_at)
          VALUES (${'RSV' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase()},
                  ${l.p.id}, ${l.unidades}, ${sesion.id}, 'abierta',
                  now() + (${MINUTOS_DE_RESERVA} || ' minutes')::interval)
          ON CONFLICT (stripe_session_id, producto_id) DO NOTHING
        `);
      }

      res.json({
        url: sesion.url, reparte, comision_centimos: comision,
        subtotal_centimos: subtotal,
        envio_centimos: envioCobrado,
        pide_direccion: esFisico,
        lineas: lineas.length,
        puntos_usados: puntosUsados, descuento_centimos: descuentoCentimos,
        cupon: cuponRow ? cuponRow.codigo : null, cupon_centimos: cuponCent,
      });
    } catch (e: any) {
      console.error('comprar publico:', e);
      res.status(500).json({ error: 'No se ha podido abrir el pago. Inténtalo dentro de un momento.' });
    }
  });

  /**
   * VENDER LO TUYO SIN PERMISO ESPECIAL — fase 8 del plan de tiendas
   *
   * Crear un producto exigía nivel 2, y el motivo era bueno: `POST
   * /api/products` mete cosas en el MERCADO COMÚN, colgadas de territorios,
   * retos y soluciones. Eso es conocimiento compartido y se protege.
   *
   * Pero vender tu propia miel en tu propia tienda no es eso. Nadie tiene que
   * verificarte para poner un tarro a la venta en tu casa, igual que nadie te
   * verifica para escribir una página.
   *
   * ── LO QUE SE ABRE Y LO QUE SIGUE CERRADO ─────────────────────────────────
   * Lo que se crea aquí nace con `status = 'tienda'`: sale en TU tienda y
   * **no** en el mercado común, porque `GET /api/products` sólo mira los
   * `activo`. Así la puerta del mercado sigue exactamente donde estaba —no la
   * he tocado— y aun así puedes vender desde el primer día.
   *
   * Colgar un producto de un territorio o de un reto sigue siendo nivel 2.
   * Eso sí es escribir en lo de todos.
   *
   * ── EL LÍMITE ─────────────────────────────────────────────────────────────
   * Diez productos mientras no estés verificado. No es desconfianza: es que un
   * límite se puede subir cuando alguien lo necesita, y una puerta cerrada
   * sólo se puede abrir del todo. Diez tarros son una tienda; mil son otra
   * cosa y merecen una conversación.
   */
  app.post('/api/publicar/mis-productos', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const nivel = req.user.roleLevel ?? 0;

      const {
        nombre, descripcion, precio_centimos, moneda, tipo, categoria,
        stock, envio_centimos, envio_gratis_desde_centimos, envio_plazo,
        garantia, devoluciones, imagenes, periodo, archivo_digital, acepta_puntos,
      } = req.body || {};
      // El archivo de una descarga: solo de nuestra zona privada (ver PUT).
      const archivo = typeof archivo_digital === 'string' && archivo_digital.startsWith('/uploads/privado/') ? archivo_digital : null;

      const nom = String(nombre || '').trim();
      if (!nom) return res.status(400).json({ error: 'Ponle un nombre.' });
      if (nom.length > 200) return res.status(400).json({ error: 'El nombre es demasiado largo.' });

      // El precio puede faltar —«precio a consultar» es una respuesta válida—
      // pero si viene tiene que ser un número entero de céntimos y positivo.
      // Un precio negativo sería pagarle a quien compra.
      let precio: number | null = null;
      if (precio_centimos !== null && precio_centimos !== undefined && precio_centimos !== '') {
        precio = Math.round(Number(precio_centimos));
        if (!Number.isFinite(precio) || precio < 0) {
          return res.status(400).json({ error: 'El precio no es un número válido.' });
        }
      }

      if (nivel < 2) {
        const n = (await db.execute(sql`
          SELECT COUNT(*) AS n FROM products
          WHERE created_by = ${req.user.id} AND archived_at IS NULL
        `)).rows[0] as any;
        if (Number(n.n) >= MAX_PRODUCTOS_SIN_VERIFICAR) {
          return res.status(409).json({
            error: `De momento puedes tener ${MAX_PRODUCTOS_SIN_VERIFICAR} productos. Para tener más, verifica tu cuenta.`,
            limite: MAX_PRODUCTOS_SIN_VERIFICAR,
          });
        }
      }

      // ── QUÉ CLASE DE COSA SE VENDE ────────────────────────────────────
      // Cuatro, y no dos. Un servicio no se envía ni se descarga —una hora de
      // asesoría, un taller, una visita— y una suscripción se cobra otra vez
      // cada mes, que en Stripe es un modo de pago distinto, no un detalle.
      //
      // Sin esto no se podía dar de alta ni un servicio ni una SaaS, que son
      // dos de las tres formas de vender que tiene la gente. Sólo se podía
      // vender lo que cabe en una caja.
      const TIPOS = new Set(['fisico', 'digital', 'servicio']);
      const esSuscripcion = tipo === 'suscripcion';
      const clase = esSuscripcion ? 'digital' : (TIPOS.has(String(tipo)) ? String(tipo) : 'fisico');
      // Mensual salvo que se diga otra cosa. `anual` y `trimestral` son lo que
      // entiende el cobro; cualquier otra cosa se trata como mensual en vez de
      // rechazar el alta por una palabra.
      const PERIODOS = new Set(['mensual', 'trimestral', 'anual']);
      const cadaCuanto = esSuscripcion
        ? (PERIODOS.has(String(periodo)) ? String(periodo) : 'mensual')
        : null;

      const id = 'PRD' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase();
      // `tienda` para quien no está verificado; `activo` para quien sí, que es
      // lo que ya podía hacer por la otra puerta.
      const estado = nivel >= 2 ? 'activo' : 'tienda';
      const fotos = Array.isArray(imagenes) ? imagenes.filter((x: any) => typeof x === 'string').slice(0, 8) : [];

      await db.execute(sql`
        INSERT INTO products (id, name, description, category, price_cents, currency, kind,
                              modality, billing_period,
                              stock, warranty, return_policy, images, status, created_by, updated_by,
                              envio_centimos, envio_gratis_desde_centimos, envio_plazo, archivo_digital, acepta_puntos)
        VALUES (${id}, ${nom}, ${String(descripcion || '').trim() || null},
                ${String(categoria || 'OTROS').toUpperCase()}, ${precio},
                ${String(moneda || 'EUR').toUpperCase()},
                ${clase},
                ${esSuscripcion ? 'suscripcion' : 'unico'}, ${cadaCuanto},
                ${stock === null || stock === undefined || stock === '' ? null : Math.max(0, Math.round(Number(stock) || 0))},
                ${String(garantia || '').trim() || null}, ${String(devoluciones || '').trim() || null},
                ${JSON.stringify(fotos)}::jsonb, ${estado}, ${req.user.id}, ${req.user.id},
                ${envio_centimos === null || envio_centimos === undefined || envio_centimos === '' ? null : Math.max(0, Math.round(Number(envio_centimos) || 0))},
                ${envio_gratis_desde_centimos === null || envio_gratis_desde_centimos === undefined || envio_gratis_desde_centimos === '' ? null : Math.max(0, Math.round(Number(envio_gratis_desde_centimos) || 0))},
                ${String(envio_plazo || '').trim() || null},
                ${clase === 'digital' ? archivo : null}, ${acepta_puntos === true})
      `);

      res.json({
        id, estado, tipo: clase, suscripcion: esSuscripcion, periodo: cadaCuanto,
        // Se dice en la respuesta, no se deja que lo descubra al no verlo en
        // el mercado: quien vende tiene derecho a saber dónde sale su cosa.
        en_el_mercado_comun: estado === 'activo',
        aviso: estado === 'tienda'
          ? 'Está a la venta en tu tienda. Para que salga también en el mercado común, verifica tu cuenta.'
          : null,
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * ¿ESTÁ ABIERTA LA COMPRA? — `GET /api/publicar/cobro`
   *
   * Lo pregunta la ficha de producto antes de pintar el botón. Sin esto, el
   * botón saldría igual y fallaría al pulsarlo, que es exactamente lo que se
   * evitó en la fase 2: un botón que se puede pulsar es una promesa.
   */
  app.get('/api/publicar/cobro', (_req: Request, res: Response) => {
    // `pruebas` NO es un detalle técnico: es lo que hay que decirle a quien va
    // a pagar. Con una clave de pruebas, Stripe rechaza cualquier tarjeta de
    // verdad — así que quien lo intente se llevará un error sin entender por
    // qué, y peor: alguien puede creer que ha comprado algo. Se avisa antes,
    // en el botón, no después.
    res.json({
      abierto: COBRO_ENCENDIDO,
      pruebas: (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_test'),
    });
  });

  /** Lo que tengo a la venta. Con sesión: son mis cosas. */
  app.get('/api/publicar/mis-productos', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const r = await db.execute(sql`
        SELECT id, name, price_cents, currency, kind, stock, status, images,
               envio_centimos, envio_gratis_desde_centimos, envio_plazo, created_at,
               (archivo_digital IS NOT NULL) AS con_archivo, acepta_puntos,
               (SELECT round(avg(score) / 2.0, 1)::float FROM ratings WHERE entity_type = 'products' AND entity_id = products.id) AS media_estrellas,
               (SELECT count(*)::int FROM ratings WHERE entity_type = 'products' AND entity_id = products.id) AS n_resenas,
               (archivo_digital IS NOT NULL) AS con_archivo
        FROM products
        WHERE created_by = ${req.user.id} AND archived_at IS NULL
        ORDER BY created_at DESC
      `);
      res.json({
        productos: r.rows,
        limite: (req.user.roleLevel ?? 0) >= 2 ? null : MAX_PRODUCTOS_SIN_VERIFICAR,
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * CAMBIAR O RETIRAR LO MÍO.
   *
   * El `WHERE created_by` no es un adorno: sin él, cualquiera con sesión
   * podría cambiarle el precio a otro. Y retirar es `archived_at`, nunca
   * borrar: hay pedidos que apuntan a este producto y tienen que seguir
   * diciendo qué se vendió (regla 2 de la casa).
   */
  app.put('/api/publicar/mis-productos/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const b = req.body || {};
      const num = (v: any) => v === null || v === undefined || v === '' ? null : Math.max(0, Math.round(Number(v) || 0));

      const r = await db.execute(sql`
        UPDATE products SET
          name = COALESCE(${b.nombre ? String(b.nombre).trim() : null}, name),
          description = COALESCE(${b.descripcion !== undefined ? String(b.descripcion).trim() : null}, description),
          price_cents = COALESCE(${num(b.precio_centimos)}, price_cents),
          stock = CASE WHEN ${b.stock !== undefined} THEN ${num(b.stock)} ELSE stock END,
          envio_centimos = CASE WHEN ${b.envio_centimos !== undefined} THEN ${num(b.envio_centimos)} ELSE envio_centimos END,
          envio_gratis_desde_centimos = CASE WHEN ${b.envio_gratis_desde_centimos !== undefined} THEN ${num(b.envio_gratis_desde_centimos)} ELSE envio_gratis_desde_centimos END,
          envio_plazo = COALESCE(${b.envio_plazo !== undefined ? String(b.envio_plazo).trim() || null : null}, envio_plazo),
          archived_at = CASE WHEN ${b.retirar === true} THEN now() ELSE archived_at END,
          -- El archivo de un producto digital: solo URLs de NUESTRA zona
          -- privada. Una URL externa aquí sería «entregar» un enlace que no
          -- controlamos, y una pública de /uploads sería regalar el archivo.
          archivo_digital = CASE
            WHEN ${typeof b.archivo_digital === 'string' && b.archivo_digital.startsWith('/uploads/privado/')} THEN ${typeof b.archivo_digital === 'string' ? b.archivo_digital : null}
            ELSE archivo_digital END,
          acepta_puntos = CASE WHEN ${b.acepta_puntos !== undefined} THEN ${!!b.acepta_puntos} ELSE acepta_puntos END,
          updated_by = ${req.user.id},
          updated_at = now()
        WHERE id = ${String(req.params.id)} AND created_by = ${req.user.id}
        RETURNING id, name, price_cents, stock, status, archived_at, (archivo_digital IS NOT NULL) AS con_archivo
      `);
      if (!r.rows[0]) return res.status(404).json({ error: 'Ese producto no es tuyo o no existe.' });
      res.json(r.rows[0]);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ══ LOS PEDIDOS, DE VUELTA (2026-08-22, Programador 7) ═══════════════════
  // Las tres rutas de la fase 6 —«¿dónde está lo mío?», «¿qué tengo que
  // enviar?» y «marcar como enviado»— DESAPARECIERON en el commit del carrito
  // (747b82c): la pantalla /pedido y la pestaña Pedidos de /comercio las
  // siguieron llamando y producción contestaba 404 a las dos. Se reponen aquí
  // tal como eran, con dos añadidos: las LÍNEAS del pedido (desde el carrito un
  // pedido tiene varias) y la DESCARGA de lo digital, que es lo que faltaba
  // para que «se cobra y se entrega» sea verdad.

  /**
   * ¿DÓNDE ESTÁ LO MÍO? — `GET /api/publicar/pedido/:codigo?correo=`
   *
   * Quien compró sin cuenta no tiene un «mis pedidos»: el código es su llave,
   * y el correo la segunda llave — con 8 caracteres, sin correo alguien podría
   * probar códigos hasta leer la dirección de un desconocido. La respuesta es
   * 404 tanto si el código no existe como si el correo no cuadra: decir «el
   * código existe pero el correo no» ya confirmaría el código.
   *
   * Devuelve las líneas, y en cada línea digital con archivo, la URL de
   * descarga (que vuelve a pedir el correo: la llave viaja con el enlace).
   */
  /**
   * ¿YA EXISTE MI PEDIDO? — `GET /api/publicar/pedido-por-sesion/:sesion`
   * Al volver de Stripe la página solo sabe el id de la sesión de pago; el
   * pedido lo crea el webhook un instante después. La confirmación pregunta
   * aquí hasta que aparece. Solo devuelve el código: con él y el correo (o la
   * sesión de quien compró) se consulta el resto.
   */
  app.get('/api/publicar/pedido-por-sesion/:sesion', async (req: Request, res: Response) => {
    try {
      const sid = String(req.params.sesion || '').trim();
      if (!sid.startsWith('cs_')) return res.status(400).json({ error: 'Esa sesión de pago no se entiende.' });
      const r = await db.execute(sql`SELECT codigo FROM pedidos WHERE stripe_session_id = ${sid}`);
      if (!r.rows[0]) return res.status(404).json({ pendiente: true, error: 'Todavía estamos confirmando el pago.' });
      res.json({ codigo: (r.rows[0] as any).codigo });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  app.get('/api/publicar/pedido/:codigo', async (req: Request, res: Response) => {
    try {
      const codigo = String(req.params.codigo || '').toUpperCase().trim();
      const correo = String(req.query.correo || '').toLowerCase().trim();
      // Dos llaves: el correo, o la sesión de quien compró con cuenta.
      const quien = req.user?.id || null;
      if (!codigo || (!correo && !quien)) {
        return res.status(400).json({ error: 'Hacen falta el código y el correo con el que se compró.' });
      }
      const r = await db.execute(sql`
        SELECT id, codigo, producto_nombre, unidades, importe_centimos, envio_centimos,
               moneda, estado, seguimiento, created_at, updated_at, direccion_envio,
               puntos_usados, cupon_codigo, descuento_centimos, comprador_email
        FROM pedidos
        WHERE codigo = ${codigo}
          AND ((${correo} <> '' AND lower(comprador_email) = ${correo}) OR (${quien}::text IS NOT NULL AND comprador_user_id = ${quien}))
      `);
      const p = r.rows[0] as any;
      if (!p) return res.status(404).json({ error: 'No hay ningún pedido con ese código y ese correo.' });

      const lineas = (await db.execute(sql`
        SELECT l.id, l.producto_nombre, l.unidades, l.precio_unitario_centimos,
               coalesce(pr.kind, 'fisico') AS kind,
               (pr.archivo_digital IS NOT NULL) AS con_archivo
        FROM pedido_lineas l LEFT JOIN products pr ON pr.id = l.producto_id
        WHERE l.pedido_id = ${p.id}
        ORDER BY l.created_at
      `)).rows as any[];
      const vivo = !['cancelado', 'devuelto'].includes(p.estado);

      res.json({
        codigo: p.codigo,
        producto: p.producto_nombre,
        unidades: Number(p.unidades),
        importe_centimos: Number(p.importe_centimos),
        envio_centimos: Number(p.envio_centimos),
        moneda: p.moneda,
        estado: p.estado,
        seguimiento: p.seguimiento || null,
        ciudad: p.direccion_envio?.city || null,
        hecho_el: p.created_at,
        cambiado_el: p.updated_at,
        // Lo que se pagó con puntos y con cupón, para que la confirmación y
        // «¿dónde está lo mío?» lo digan sin consultar el libro.
        puntos_usados: Number(p.puntos_usados || 0),
        cupon: p.cupon_codigo || null,
        descuento_centimos: Number(p.descuento_centimos || 0),
        // Un pedido sin nada físico no se envía: la pantalla no debe pintar
        // «enviado» como un paso pendiente que nunca llegará.
        solo_digital: lineas.length > 0 && lineas.every(l => l.kind === 'digital'),
        lineas: lineas.map(l => ({
          id: l.id,
          producto: l.producto_nombre,
          unidades: Number(l.unidades),
          precio_unitario_centimos: Number(l.precio_unitario_centimos),
          digital: l.kind === 'digital',
          // `null` con tres significados distinguibles desde la pantalla:
          // no es digital (nada que descargar), es digital pero el vendedor
          // no subió el archivo (se dice), o el pedido no está vivo.
          descarga: l.kind === 'digital' && l.con_archivo && vivo
            ? `/api/publicar/pedido/${encodeURIComponent(p.codigo)}/descarga/${encodeURIComponent(l.id)}${correo ? `?correo=${encodeURIComponent(correo)}` : ''}`
            : null,
          sin_archivo: l.kind === 'digital' && !l.con_archivo,
        })),
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * LA DESCARGA — `GET /api/publicar/pedido/:codigo/descarga/:lineaId?correo=`
   *
   * La única puerta por la que sale un archivo de la zona privada. Comprueba
   * las dos llaves (código + correo), que la línea sea de ESE pedido, que el
   * producto sea digital y tenga archivo, y que el pedido no esté cancelado ni
   * devuelto. Se sirve siempre como descarga (Content-Disposition), con el
   * nombre del producto y no el UUID del disco.
   */
  app.get('/api/publicar/pedido/:codigo/descarga/:lineaId', async (req: Request, res: Response) => {
    try {
      const codigo = String(req.params.codigo || '').toUpperCase().trim();
      const correo = String(req.query.correo || '').toLowerCase().trim();
      // Dos llaves válidas: el correo del pedido, o la SESIÓN de quien lo
      // compró con cuenta (2026-08-22: la confirmación de compra enseña las
      // descargas sin pedir el correo a quien acaba de pagar con su sesión).
      const quien = req.user?.id || null;
      if (!codigo || (!correo && !quien)) return res.status(400).json({ error: 'Hacen falta el código y el correo.' });
      const r = await db.execute(sql`
        SELECT pr.archivo_digital, l.producto_nombre, p.estado
        FROM pedidos p
        JOIN pedido_lineas l ON l.pedido_id = p.id AND l.id = ${String(req.params.lineaId)}
        JOIN products pr ON pr.id = l.producto_id
        WHERE p.codigo = ${codigo}
          AND ((${correo} <> '' AND lower(p.comprador_email) = ${correo}) OR (${quien}::text IS NOT NULL AND p.comprador_user_id = ${quien}))
          AND coalesce(pr.kind, 'fisico') = 'digital'
      `);
      const fila = r.rows[0] as any;
      if (!fila) return res.status(404).json({ error: 'No hay ninguna descarga con ese código y ese correo.' });
      if (['cancelado', 'devuelto'].includes(fila.estado)) {
        return res.status(410).json({ error: 'Este pedido se canceló o se devolvió; la descarga ya no está disponible.' });
      }
      if (!fila.archivo_digital) {
        return res.status(409).json({ error: 'Quien vende todavía no ha subido el archivo de este producto. Escríbele: tu pedido está pagado.' });
      }
      const ruta = rutaLocalDeUpload(fila.archivo_digital);
      if (!ruta || !existsSync(ruta)) {
        console.error(`[comercio] archivo digital ausente en disco para ${codigo}/${req.params.lineaId}: ${fila.archivo_digital}`);
        return res.status(404).json({ error: 'El archivo no está donde debería. Avisa a quien vende: tu pedido está pagado.' });
      }
      const ext = path.extname(ruta);
      const nombre = String(fila.producto_nombre || 'descarga').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 80) || 'descarga';
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(nombre + ext)}`);
      res.setHeader('Cache-Control', 'private, no-store');
      createReadStream(ruta).pipe(res);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * ¿QUÉ TENGO QUE ENVIAR? — `GET /api/publicar/mis-ventas`
   * Con sesión: los pedidos de quien vende, y solo los suyos. Aquí sí va la
   * dirección entera, que es lo que hay que escribir en la caja.
   */
  app.get('/api/publicar/mis-ventas', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const r = await db.execute(sql`
        SELECT id, codigo, producto_nombre, unidades, importe_centimos, envio_centimos,
               moneda, comprador_email, comprador_nombre, direccion_envio,
               estado, seguimiento, created_at
        FROM pedidos
        WHERE vendedor_user_id = ${req.user.id}
        ORDER BY created_at DESC
        LIMIT 200
      `);
      res.json({ pedidos: r.rows });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * MARCAR UN PEDIDO — `PUT /api/publicar/mis-ventas/:id` { estado?, seguimiento?, nota? }
   * Solo quien lo vendió. El `WHERE vendedor_user_id` no es un adorno: sin él,
   * cualquiera con sesión podría marcar como entregado el pedido de otro.
   */
  app.put('/api/publicar/mis-ventas/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const { estado, seguimiento, nota } = req.body || {};
      const VALIDOS = ['pagado', 'enviado', 'entregado', 'devuelto', 'cancelado'];
      if (estado && !VALIDOS.includes(estado)) return res.status(400).json({ error: 'Ese estado no existe.' });
      const r = await db.execute(sql`
        UPDATE pedidos SET
          estado = COALESCE(${estado || null}, estado),
          seguimiento = COALESCE(${seguimiento ?? null}, seguimiento),
          nota_vendedor = COALESCE(${nota ?? null}, nota_vendedor),
          updated_at = now()
        WHERE id = ${String(req.params.id)} AND vendedor_user_id = ${req.user.id}
        RETURNING codigo, estado, seguimiento
      `);
      if (!r.rows[0]) return res.status(404).json({ error: 'Ese pedido no es tuyo o no existe.' });
      res.json(r.rows[0]);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * CÓMO ESTÁ COMPARTIDA ESTA PÁGINA — `GET /api/publicar/estado/:id`
   *
   * Lo que la pantalla de compartir necesita saber al ABRIRSE: si está
   * publicada, con qué dirección, y si se dijo que sí o que no a los
   * buscadores.
   *
   * Sin esto la pantalla suponía. Y suponía que sí: quien había elegido «no
   * aparecer en Google» reabría el diálogo y veía «Sí» marcado, con lo que un
   * clic descuidado en cualquier otra cosa podía volver a indexarla. Una
   * pantalla que no lee el estado real acaba escribiéndolo mal.
   */
  app.get('/api/publicar/estado/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const r = await db.execute(sql`
        SELECT w.publico, w.indexable, w.slug, u.handle
        FROM knowledge_windows w
        JOIN users u ON u.id = w.creator_user_id
        WHERE w.id = ${String(req.params.id)} AND w.creator_user_id = ${req.user.id}
      `);
      const w = r.rows[0] as any;
      if (!w) return res.status(404).json({ error: 'Esa página no es tuya o no existe.' });
      res.json({
        publico: !!w.publico,
        // `null` cuando nunca se ha publicado: «no se ha decidido» no es lo
        // mismo que «se dijo que no», y la pantalla los enseña distinto.
        indexable: w.publico ? !!w.indexable : null,
        slug: w.slug, handle: w.handle,
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  app.get('/api/publicar/resolver/:handle/:slug', async (req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`
        SELECT w.id, w.title, w.kind, w.config, w.indexable, w.created_at, w.updated_at,
               u.handle, u.display_name, u.name, u.avatar_url
        FROM knowledge_windows w
        JOIN users u ON u.id = w.creator_user_id
        WHERE u.handle = ${String(req.params.handle).toLowerCase()}
          AND w.slug = ${String(req.params.slug).toLowerCase()}
          AND w.publico = true
          AND w.archived_at IS NULL AND w.deleted_at IS NULL
      `);
      const w = r.rows[0] as any;
      if (!w) return res.status(404).json({ error: 'Esa página no existe o no está publicada.' });
      res.json({
        id: w.id, titulo: w.title, tipo: w.kind, config: w.config,
        indexable: w.indexable,
        autor: { handle: w.handle, nombre: w.display_name || w.name, avatar: w.avatar_url },
        created_at: w.created_at, updated_at: w.updated_at,
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });
}

/** El primer texto que tenga la página, para el adelanto. `null` si no hay. */
function primerTexto(config: any): string | null {
  const bloques = config?.bloques || config?.blocks;
  if (!Array.isArray(bloques)) return null;
  for (const b of bloques) {
    const t = typeof b?.texto === 'string' ? b.texto.trim() : '';
    if (t) return t.length > 160 ? t.slice(0, 160) + '…' : t;
  }
  return null;
}

/** La misma comisión que cobra el mercado de dentro. Una sola cifra. */
const COMISION_BPS = Number(process.env.PLATFORM_FEE_BPS || 500);

/**
 * A dónde puede volver el comprador después de pagar.
 *
 * Sólo direcciones de este sitio. Si se aceptara la que venga en la petición,
 * cualquiera podría montar un enlace de compra que devuelve a su propia página
 * —con el aspecto de haber pasado por humanity.wiki— y usarlo para engañar.
 */
function destinoSeguro(propuesta: unknown): string {
  const base = process.env.APP_URL || 'https://humanity.wiki';
  if (typeof propuesta !== 'string' || !propuesta) return base;
  try {
    const u = new URL(propuesta);
    const anfitrion = u.hostname.toLowerCase();
    const valido = anfitrion === 'humanity.wiki' || anfitrion.endsWith('.humanity.wiki');
    if (!valido || u.protocol !== 'https:') return base;
    return u.origin + u.pathname;
  } catch { return base; }
}

/**
 * A dónde se puede enviar hoy.
 *
 * España y la Unión Europea. No es una limitación técnica: es que un envío
 * fuera de la UE lleva aduana, declaración e impuestos en destino, y ofrecerlo
 * sin resolver eso sería vender un envío que el vendedor no puede cumplir.
 * Cuando alguien lo necesite, se amplía aquí y se resuelve la aduana entonces.
 */
const PAISES_DE_ENVIO = [
  'ES', 'PT', 'FR', 'IT', 'DE', 'NL', 'BE', 'LU', 'IE', 'AT', 'DK', 'SE',
  'FI', 'PL', 'CZ', 'SK', 'SI', 'HR', 'HU', 'RO', 'BG', 'GR', 'EE', 'LV',
  'LT', 'MT', 'CY',
] as const;

/** Media hora para pagar: lo que dura la reserva y lo que dura la sesión. */
const MINUTOS_DE_RESERVA = 30;

/** Cuántas cosas distintas caben en un pago. Un carrito de cincuenta líneas
 *  es casi siempre un error o alguien probando, no una compra. */
const MAX_LINEAS = 20;

/**
 * Cuántos productos puede tener a la venta quien todavía no está verificado.
 *
 * Empezó en 10 con el argumento de que «un límite se sube cuando alguien lo
 * necesita». Alguien lo necesitó **el mismo día**: montar una tienda de
 * prueba realista —seis mieles, tres servicios y tres planes de suscripción—
 * lo agotó antes de terminar. Una SaaS con tres planes y dos servicios ya va
 * por cinco sin haber vendido nada.
 *
 * 30 es una tienda pequeña de verdad y sigue acotando el abuso: quien intente
 * llenar esto de basura con treinta piezas se ve igual de lejos y se retira
 * igual de rápido. El número no protege de nada que 10 no protegiera; sólo
 * estorbaba a quien iba en serio.
 */
const MAX_PRODUCTOS_SIN_VERIFICAR = 30;

/**
 * ¿Se puede pagar ya?
 *
 * Apagado por defecto **a propósito**: así el despliegue que lleva las fichas
 * de producto y la maquetación no lleva de tapadillo el cobro. Se enciende
 * poniendo `TIENDAS_COBRO=1` en el `.env.production` del servidor, que es un
 * cambio de una línea y su propio despliegue.
 */
const COBRO_ENCENDIDO = process.env.TIENDAS_COBRO === '1';

/**
 * Cuántas unidades de este producto está pagando alguien AHORA MISMO.
 *
 * Sólo cuentan las reservas abiertas y sin caducar. Las caducadas no se
 * borran —dicen que hubo un intento, y eso es información— pero dejan de
 * retener en cuanto pasa su hora, sin que nadie tenga que limpiarlas: la
 * condición está en la propia consulta.
 */
async function reservado(db: any, productoId: string): Promise<number> {
  const r = await db.execute(sql`
    SELECT COALESCE(SUM(unidades), 0) AS n
    FROM reservas_stock
    WHERE producto_id = ${productoId} AND estado = 'abierta' AND expira_at > now()
  `);
  return Number(r.rows[0]?.n || 0);
}
