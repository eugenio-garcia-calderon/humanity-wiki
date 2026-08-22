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
               billing_period, kind, envio_centimos, envio_gratis_desde_centimos, envio_plazo
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

      const stripe = getStripe();
      const sesion = await stripe.checkout.sessions.create({
        mode: suscripcion ? 'subscription' : 'payment',
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
            application_fee_amount: comision,
            transfer_data: { destination: vendedor.stripe_account_id },
          },
        } : {}),
        metadata: {
          kind: 'compra_publica',
          vendedor_id: vendedorId || '',
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
        garantia, devoluciones, imagenes,
      } = req.body || {};

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

      const id = 'PRD' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase();
      // `tienda` para quien no está verificado; `activo` para quien sí, que es
      // lo que ya podía hacer por la otra puerta.
      const estado = nivel >= 2 ? 'activo' : 'tienda';
      const fotos = Array.isArray(imagenes) ? imagenes.filter((x: any) => typeof x === 'string').slice(0, 8) : [];

      await db.execute(sql`
        INSERT INTO products (id, name, description, category, price_cents, currency, kind,
                              stock, warranty, return_policy, images, status, created_by, updated_by,
                              envio_centimos, envio_gratis_desde_centimos, envio_plazo)
        VALUES (${id}, ${nom}, ${String(descripcion || '').trim() || null},
                ${String(categoria || 'OTROS').toUpperCase()}, ${precio},
                ${String(moneda || 'EUR').toUpperCase()},
                ${tipo === 'digital' ? 'digital' : 'fisico'},
                ${stock === null || stock === undefined || stock === '' ? null : Math.max(0, Math.round(Number(stock) || 0))},
                ${String(garantia || '').trim() || null}, ${String(devoluciones || '').trim() || null},
                ${JSON.stringify(fotos)}::jsonb, ${estado}, ${req.user.id}, ${req.user.id},
                ${envio_centimos === null || envio_centimos === undefined || envio_centimos === '' ? null : Math.max(0, Math.round(Number(envio_centimos) || 0))},
                ${envio_gratis_desde_centimos === null || envio_gratis_desde_centimos === undefined || envio_gratis_desde_centimos === '' ? null : Math.max(0, Math.round(Number(envio_gratis_desde_centimos) || 0))},
                ${String(envio_plazo || '').trim() || null})
      `);

      res.json({
        id, estado,
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
    res.json({ abierto: COBRO_ENCENDIDO });
  });

  /** Lo que tengo a la venta. Con sesión: son mis cosas. */
  app.get('/api/publicar/mis-productos', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const r = await db.execute(sql`
        SELECT id, name, price_cents, currency, kind, stock, status, images,
               envio_centimos, envio_gratis_desde_centimos, envio_plazo, created_at
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
          updated_by = ${req.user.id},
          updated_at = now()
        WHERE id = ${String(req.params.id)} AND created_by = ${req.user.id}
        RETURNING id, name, price_cents, stock, status, archived_at
      `);
      if (!r.rows[0]) return res.status(404).json({ error: 'Ese producto no es tuyo o no existe.' });
      res.json(r.rows[0]);
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

/** Cuántos productos puede tener a la venta quien todavía no está
 *  verificado. Un límite se sube cuando alguien lo necesita; una puerta
 *  cerrada sólo se puede abrir del todo. */
const MAX_PRODUCTOS_SIN_VERIFICAR = 10;

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
