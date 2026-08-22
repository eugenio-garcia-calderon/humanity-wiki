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
               envio_centimos, envio_gratis_desde_centimos, envio_plazo
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
        stock: p.stock === null || p.stock === undefined ? null : Number(p.stock),
        garantia: p.warranty || null,
        devoluciones: p.return_policy || null,
        categoria: p.category || null,
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
  app.post('/api/publicar/comprar', async (req: Request, res: Response) => {
    try {
      const { producto_id, cantidad, volver_a } = req.body || {};
      const unidades = Math.max(1, Math.min(99, Number(cantidad) || 1));

      const p = (await db.execute(sql`
        SELECT id, name, description, price_cents, currency, stock, created_by, modality, billing_period,
               kind, envio_centimos, envio_gratis_desde_centimos, envio_plazo
        FROM products WHERE id = ${String(producto_id || '')} AND archived_at IS NULL
      `)).rows[0] as any;

      if (!p) return res.status(404).json({ error: 'Ese producto ya no está a la venta.' });
      if (!p.price_cents) {
        return res.status(400).json({ error: 'Este producto no tiene precio: hay que preguntar antes de comprarlo.' });
      }
      // `null` sigue sin ser cero: quien no lleva la cuenta del stock puede
      // vender, quien la lleva y está a cero no.
      if (p.stock !== null && p.stock !== undefined && Number(p.stock) < unidades) {
        return res.status(409).json({
          error: Number(p.stock) <= 0 ? 'Se ha agotado.' : `Solo quedan ${p.stock}.`,
          stock: Number(p.stock),
        });
      }

      // La vuelta se limita al propio sitio: aceptar una dirección cualquiera
      // del cuerpo de la petición convertiría esto en un trampolín para mandar
      // a la gente a donde quiera quien monte el enlace.
      const destino = destinoSeguro(volver_a);

      const vendedor = p.created_by
        ? (await db.execute(sql`SELECT stripe_account_id, charges_enabled FROM stripe_accounts WHERE user_id = ${p.created_by}`)).rows[0] as any
        : null;
      const reparte = !!vendedor?.charges_enabled;
      const comision = Math.round((p.price_cents * unidades * COMISION_BPS) / 10000);
      const suscripcion = p.modality === 'suscripcion';

      // ── EL ENVÍO ────────────────────────────────────────────────────────
      // Sólo para lo que se envía de verdad. Un producto digital que pidiera
      // la dirección de casa estaría pidiendo un dato que no necesita, y eso
      // es lo que hace desconfiar a quien compra.
      const esFisico = (p.kind || '') === 'fisico';
      const envioBase = p.envio_centimos === null || p.envio_centimos === undefined
        ? null : Number(p.envio_centimos);
      const total = p.price_cents * unidades;
      const umbral = p.envio_gratis_desde_centimos === null || p.envio_gratis_desde_centimos === undefined
        ? null : Number(p.envio_gratis_desde_centimos);
      const envioCobrado = envioBase === null ? null
        : (umbral !== null && total >= umbral ? 0 : envioBase);

      const opcionesEnvio = esFisico && envioCobrado !== null ? [{
        shipping_rate_data: {
          type: 'fixed_amount' as const,
          fixed_amount: { amount: envioCobrado, currency: (p.currency || 'EUR').toLowerCase() },
          display_name: envioCobrado === 0 ? 'Envío gratis' : 'Envío',
          ...(p.envio_plazo ? { delivery_estimate: undefined } : {}),
        },
      }] : undefined;

      const stripe = getStripe();
      const sesion = await stripe.checkout.sessions.create({
        mode: suscripcion ? 'subscription' : 'payment',
        // Alojada en Stripe, no incrustada: la incrustada necesita que la
        // página monte el componente de Stripe, y esta página se sirve a
        // alguien sin cuenta y sin la aplicación cargada.
        ui_mode: 'hosted',
        line_items: [{
          price_data: {
            currency: (p.currency || 'EUR').toLowerCase(),
            product_data: { name: p.name, description: p.description || undefined },
            unit_amount: p.price_cents,
            ...(suscripcion ? { recurring: { interval: p.billing_period === 'anual' ? 'year' : 'month' } } : {}),
          },
          quantity: unidades,
        }],
        // El correo es lo único que se le pide: es lo que hace falta para
        // mandarle el recibo y para que el vendedor sepa a quién responder.
        ...(suscripcion ? {} : { customer_creation: 'always' as const }),
        // La dirección sólo se pide si hay algo que llevar a algún sitio.
        ...(esFisico ? {
          shipping_address_collection: { allowed_countries: [...PAISES_DE_ENVIO] },
          ...(opcionesEnvio ? { shipping_options: opcionesEnvio } : {}),
        } : {}),
        ...(reparte && !suscripcion ? {
          payment_intent_data: {
            application_fee_amount: comision,
            transfer_data: { destination: vendedor.stripe_account_id },
          },
        } : {}),
        metadata: {
          kind: 'compra_publica',
          product_id: p.id,
          quantity: String(unidades),
          vendedor_id: p.created_by || '',
          envio_centimos: envioCobrado === null ? '' : String(envioCobrado),
        },
        success_url: `${destino}?compra=hecha&sesion={CHECKOUT_SESSION_ID}`,
        cancel_url: `${destino}?compra=cancelada`,
      });

      res.json({
        url: sesion.url, reparte, comision_centimos: comision,
        envio_centimos: envioCobrado,
        pide_direccion: esFisico,
      });
    } catch (e: any) {
      console.error('comprar publico:', e);
      res.status(500).json({ error: 'No se ha podido abrir el pago. Inténtalo dentro de un momento.' });
    }
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
