// ============================================================================
// EL PEDIDO GESTIONADO (2026-10-18, Wikiproducts W5)
// ============================================================================
// Wikiproducts no tiene almacén. Quien compra paga el PVP de cada oferta en la
// tienda de Wikiproducts (un solo pago, aunque lleve cosas de tres tiendas), y
// Wikiproducts compra a cada distribuidor por su cuenta y lo manda a su casa.
// Es la opción A del plan (§6), en modo pruebas mientras Eugenio no decida.
//
// Todo lo de antes del pago ya existía y se reutiliza: una fila de la base de
// datos «Ofertas» con botón de compra tiene un producto detrás (`bd/tienda.ts`),
// y la cesta, el cobro, el pedido y el recibo son los de cualquier tienda. Lo
// que NO existía es lo de después:
//
//   1. La comisión de cada línea, copiada al pagar (`pedido_lineas`).
//   2. La cola de lo que hay que pedir a cada distribuidor
//      (`pedidos_distribuidor`): una fila por pedido y tienda, con su estado.
//   3. Que el pedido de quien compra avance solo según avanzan esas filas, y
//      que se entere: «hemos pedido tu powerbank a Amazon», «ha salido».
//   4. El envío por distribuidor: dos tiendas son dos cajas y dos portes. La
//      regla de siempre («el porte más caro, porque va todo en una caja») deja
//      de ser verdad en cuanto hay dos remitentes.
//
// ── UNA TIENDA SIN OFERTAS NO NOTA NADA ─────────────────────────────────────
// Todo se decide por `products.distribuidor_id`. Un producto normal no lo
// tiene, así que su pedido, su envío y su recibo son exactamente los de ayer.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { avisar } from './avisos';
import { avisarPorWhatsApp } from './whatsapp.js';
import { calcularEnvio, tarifasDe, zonaDe, type CalculoEnvio, type TarifaZona, type Zona } from './zonasEnvio.js';
import { comisionDeLinea, ordenarOfertas } from '../utils/ofertas.js';

const nuevoId = (p: string) => p + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 46656).toString(36).toUpperCase();

// ── EL ENVÍO, POR DISTRIBUIDOR ──────────────────────────────────────────────

type LineaEnvio = { p: any; unidades: number; precio?: number };
export type EnvioDistribuidor = { distribuidor_id: string | null; distribuidor_nombre: string | null; centimos: number | null; se_envia: boolean };

/**
 * El porte de una cesta en la que cada distribuidor manda su propia caja: la
 * suma de los portes de cada uno, calculado cada uno con las reglas de siempre
 * (el más caro de su grupo, gratis si su parte pasa del umbral). Lo que no
 * tiene distribuidor —lo que envía el propio vendedor— es un grupo más.
 *
 * Sin ninguna línea de distribuidor devuelve EXACTAMENTE `calcularEnvio`: las
 * tiendas de siempre no cambian de porte por esto.
 */
export function calcularEnvioPorDistribuidor(
  fisicas: LineaEnvio[], subtotal: number, zona: Zona, tarifas: Map<string, TarifaZona[]>,
): CalculoEnvio & { por_distribuidor: EnvioDistribuidor[] } {
  if (!fisicas.some(l => l.p?.distribuidor_id)) return { ...calcularEnvio(fisicas, subtotal, zona, tarifas), por_distribuidor: [] };
  const grupos = new Map<string, LineaEnvio[]>();
  for (const l of fisicas) {
    const k = l.p?.distribuidor_id || '';
    grupos.set(k, [...(grupos.get(k) || []), l]);
  }
  let total = 0;
  let gratis = false;
  const por: EnvioDistribuidor[] = [];
  for (const [k, ls] of grupos) {
    const sub = ls.reduce((n, l) => n + (Number(l.precio ?? l.p?.price_cents) || 0) * l.unidades, 0);
    const c = calcularEnvio(ls, sub, zona, tarifas);
    if (!c.se_envia) return { ...c, por_distribuidor: [] };
    total += c.centimos || 0;
    gratis = gratis || c.gratis_por_umbral;
    por.push({ distribuidor_id: k || null, distribuidor_nombre: ls[0].p?.distribuidor_nombre || null, centimos: c.centimos, se_envia: true });
  }
  return { centimos: total, se_envia: true, no_llega: null, zona, gratis_por_umbral: gratis, por_distribuidor: por };
}

// ── AL PAGAR: COMISIÓN POR LÍNEA Y COLA DE PEDIDOS ──────────────────────────

/**
 * Llamar SIEMPRE después de escribir las líneas de un pedido pagado (los tres
 * sitios que crean pedidos: pago con puntos, pago de una tienda y cobro
 * agregado). Idempotente: Stripe repite avisos, y la segunda vez no cambia
 * nada. Nunca lanza: un fallo aquí no puede dejar sin pedido a quien ya pagó;
 * se canta en el registro y la cola se rellena a mano.
 *
 * Devuelve cuántos pedidos a distribuidor nuevos ha creado.
 */
export async function registrarPedidoGestionado(db: any, pedidoId: string): Promise<number> {
  try {
    const lineas = (await db.execute(sql`
      SELECT l.id, l.unidades, l.precio_unitario_centimos, l.producto_id, l.distribuidor_id AS ya,
             p.comision_pct, p.distribuidor_id, p.distribuidor_nombre, p.kind, p.price_cents
      FROM pedido_lineas l JOIN products p ON p.id = l.producto_id
      WHERE l.pedido_id = ${pedidoId} AND p.distribuidor_id IS NOT NULL
      ORDER BY l.created_at
    `)).rows as any[];
    if (!lineas.length) return 0;

    // 1) La comisión de aquel día, en cada línea. Solo si aún no se copió.
    for (const l of lineas) {
      if (l.ya) continue;
      const pct = l.comision_pct === null ? null : Number(l.comision_pct);
      await db.execute(sql`
        UPDATE pedido_lineas SET comision_pct = ${pct}, comision_centimos = ${comisionDeLinea(Number(l.precio_unitario_centimos), Number(l.unidades), pct)},
               distribuidor_id = ${l.distribuidor_id}, distribuidor_nombre = ${l.distribuidor_nombre}
        WHERE id = ${l.id} AND distribuidor_id IS NULL
      `);
    }

    // 2) Una fila de la cola por distribuidor, con lo que le toca.
    const pedido = (await db.execute(sql`
      SELECT id, codigo, vendedor_user_id, comprador_user_id, direccion_envio, producto_nombre, entrega_tipo FROM pedidos WHERE id = ${pedidoId}
    `)).rows[0] as any;
    if (!pedido) return 0;
    const dir = pedido.direccion_envio || {};
    const zona = zonaDe(dir.country || dir.pais, dir.postal_code || dir.cp);
    const tarifas = await tarifasDe(db, lineas.map(l => l.producto_id));
    const grupos = new Map<string, any[]>();
    for (const l of lineas) grupos.set(l.distribuidor_id, [...(grupos.get(l.distribuidor_id) || []), l]);

    let nuevos = 0;
    const nombres: string[] = [];
    for (const [distId, ls] of grupos) {
      const importe = ls.reduce((n, l) => n + Number(l.precio_unitario_centimos) * Number(l.unidades), 0);
      const fisicas = ls.filter(l => (l.kind || 'fisico') === 'fisico').map(l => ({ p: { id: l.producto_id, name: l.distribuidor_nombre }, unidades: Number(l.unidades) }));
      const envio = pedido.entrega_tipo === 'recogida' ? 0 : (calcularEnvio(fisicas, importe, zona, tarifas).centimos || 0);
      const comision = ls.reduce((n, l) => n + (comisionDeLinea(Number(l.precio_unitario_centimos), Number(l.unidades), l.comision_pct === null ? null : Number(l.comision_pct)) || 0), 0);
      const r = await db.execute(sql`
        INSERT INTO pedidos_distribuidor (id, pedido_id, distribuidor_id, distribuidor_nombre, importe_centimos, envio_centimos, comision_centimos)
        VALUES (${nuevoId('PDI')}, ${pedidoId}, ${distId}, ${ls[0].distribuidor_nombre || 'Distribuidor sin nombre'}, ${importe}, ${envio}, ${comision})
        ON CONFLICT (pedido_id, distribuidor_id) DO NOTHING
        RETURNING id
      `);
      if (r.rows[0]) { nuevos++; nombres.push(ls[0].distribuidor_nombre || 'un distribuidor'); }
    }

    // 3) Quien gestiona se entera de que tiene trabajo: el aviso de «pedido
    // nuevo» de siempre dice que se ha vendido; éste dice a quién comprarlo.
    if (nuevos > 0) {
      await avisar(db, {
        paraQuien: pedido.vendedor_user_id, dePartede: null, tipo: 'pedido_nuevo', entidadTipo: 'pedidos', entidadId: pedidoId,
        datos: {
          texto: `Pedido ${pedido.codigo}: hay que pedirlo a ${nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}` : nombres[0]}. El cliente ya ha pagado.`,
          codigo: pedido.codigo, destino: '/comercio?pestana=distribuidores',
        },
      }).catch(() => {});
    }
    return nuevos;
  } catch (e: any) {
    console.error(`[pedido gestionado] ${pedidoId}: no se ha podido preparar la cola (revisar a mano):`, e?.message || e);
    return 0;
  }
}

// ── LO QUE VE QUIEN COMPRÓ ──────────────────────────────────────────────────

const ESTADO_COMPRADOR: Record<string, string> = {
  pendiente: 'Lo estamos pidiendo a la tienda',
  pedido_hecho: 'Pedido hecho a la tienda',
  enviado: 'Ha salido de la tienda',
  entregado: 'Entregado',
  incidencia: 'Hay un problema con la tienda: te escribimos',
  cancelado: 'Cancelado: no se ha podido servir',
};

/** Las tiendas de un pedido gestionado, para la página «¿dónde está lo mío?».
 *  Sin nota interna ni referencia del distribuidor: eso es de quien gestiona. */
export async function detalleGestionado(db: any, pedidoId: string) {
  const r = await db.execute(sql`
    SELECT distribuidor_id, distribuidor_nombre, estado, seguimiento, importe_centimos, envio_centimos, comision_centimos, updated_at
    FROM pedidos_distribuidor WHERE pedido_id = ${pedidoId} ORDER BY created_at, distribuidor_nombre
  `);
  return (r.rows as any[]).map(d => ({
    distribuidor_id: d.distribuidor_id,
    distribuidor: d.distribuidor_nombre,
    estado: d.estado,
    estado_texto: ESTADO_COMPRADOR[d.estado] || d.estado,
    seguimiento: d.seguimiento || null,
    importe_centimos: Number(d.importe_centimos),
    envio_centimos: Number(d.envio_centimos),
    comision_centimos: Number(d.comision_centimos),
    cambiado_el: d.updated_at,
  }));
}

// ── EL PEDIDO DE QUIEN COMPRÓ AVANZA CON LOS DE LAS TIENDAS ─────────────────

const RANGO: Record<string, number> = { pagado: 0, preparando: 1, enviado: 2, entregado: 3 };

/** El estado del pedido del cliente que se deduce de los de sus tiendas: sale
 *  cuando ha salido TODO, llega cuando ha llegado todo, y se está preparando
 *  en cuanto se pidió algo. Solo hacia delante: un pedido devuelto o cancelado
 *  no lo resucita una tienda que contesta tarde. */
export function estadoDeducido(estados: string[]): 'pagado' | 'preparando' | 'enviado' | 'entregado' {
  const vivos = estados.filter(e => e !== 'cancelado');
  if (!vivos.length) return 'pagado';
  if (vivos.every(e => e === 'entregado')) return 'entregado';
  if (vivos.every(e => e === 'enviado' || e === 'entregado')) return 'enviado';
  if (vivos.some(e => e !== 'pendiente' && e !== 'incidencia')) return 'preparando';
  return 'pagado';
}

// ── RUTAS ───────────────────────────────────────────────────────────────────

const ESTADOS = ['pendiente', 'pedido_hecho', 'enviado', 'entregado', 'incidencia', 'cancelado'];

export function registrarPedidoGestionadoRutas(app: Express, db: any) {
  /** Toda ruta de escritura comprueba el rol (CLAUDE.md, prohibición 3). */
  const requireLevel = (req: Request, res: Response, min: number): boolean => {
    if (!req.user) { res.status(401).json({ error: 'Debes iniciar sesión.' }); return false; }
    if ((req.user.roleLevel ?? 0) < min) { res.status(403).json({ error: `Requiere nivel ${min} o superior.` }); return false; }
    return true;
  };
  const esAdmin = (req: Request) => (req.user?.roleLevel ?? 0) >= 4;

  /**
   * LA COLA — `GET /api/gestion/pedidos-distribuidor?estado=abiertos|todos`
   * Lo que hay que pedir a cada distribuidor, de los pedidos que me han
   * pagado a mí. Con todo lo necesario para hacerlo sin abrir otra pantalla:
   * a dónde va, qué lleva, el enlace de la oferta en la web de la tienda.
   */
  app.get('/api/gestion/pedidos-distribuidor', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, 1)) return;
      const todos = req.query.estado === 'todos';
      const deTodos = esAdmin(req) && req.query.de === 'todos';
      const r = await db.execute(sql`
        SELECT d.*, p.codigo, p.created_at AS pagado_el, p.comprador_nombre, p.comprador_email, p.telefono_contacto,
               p.direccion_envio, p.estado AS estado_pedido, p.entrega_tipo
        FROM pedidos_distribuidor d JOIN pedidos p ON p.id = d.pedido_id
        WHERE (${deTodos} OR p.vendedor_user_id = ${req.user!.id})
          AND (${todos} OR d.estado IN ('pendiente', 'pedido_hecho', 'enviado', 'incidencia'))
        ORDER BY CASE d.estado WHEN 'incidencia' THEN 0 WHEN 'pendiente' THEN 1 WHEN 'pedido_hecho' THEN 2 WHEN 'enviado' THEN 3 ELSE 4 END,
                 d.created_at
        LIMIT 200
      `);
      const filas = r.rows as any[];
      const ids = filas.map(f => f.pedido_id);
      const lineas = ids.length ? (await db.execute(sql`
        SELECT l.pedido_id, l.distribuidor_id, l.producto_nombre, l.unidades, l.precio_unitario_centimos, l.comision_pct, l.comision_centimos,
               pr.oferta_enlace, pr.oferta_plazo
        FROM pedido_lineas l LEFT JOIN products pr ON pr.id = l.producto_id
        WHERE l.pedido_id = ANY(string_to_array(${ids.join(',')}, ',')) AND l.distribuidor_id IS NOT NULL
        ORDER BY l.created_at
      `)).rows as any[] : [];
      res.json(filas.map(f => ({
        id: f.id, codigo: f.codigo, pagado_el: f.pagado_el, estado: f.estado, estado_pedido: f.estado_pedido,
        distribuidor_id: f.distribuidor_id, distribuidor: f.distribuidor_nombre,
        importe_centimos: Number(f.importe_centimos), envio_centimos: Number(f.envio_centimos), comision_centimos: Number(f.comision_centimos),
        referencia_distribuidor: f.referencia_distribuidor, seguimiento: f.seguimiento, nota: f.nota,
        cliente: { nombre: f.comprador_nombre, email: f.comprador_email, telefono: f.telefono_contacto, direccion: f.direccion_envio, recogida: f.entrega_tipo === 'recogida' },
        lineas: lineas.filter(l => l.pedido_id === f.pedido_id && l.distribuidor_id === f.distribuidor_id).map(l => ({
          producto: l.producto_nombre, unidades: Number(l.unidades), precio_unitario_centimos: Number(l.precio_unitario_centimos),
          comision_pct: l.comision_pct === null ? null : Number(l.comision_pct), comision_centimos: l.comision_centimos === null ? null : Number(l.comision_centimos),
          enlace: l.oferta_enlace || null, plazo: l.oferta_plazo || null,
        })),
      })));
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * AVANZAR UN PEDIDO A DISTRIBUIDOR — `PUT /api/gestion/pedidos-distribuidor/:id`
   * { estado?, referencia?, seguimiento?, nota? }. Solo quien vendió (o un
   * administrador). Mueve el pedido del cliente si toca y se lo dice.
   */
  app.put('/api/gestion/pedidos-distribuidor/:id', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, 1)) return;
      const { estado, referencia, seguimiento, nota } = req.body || {};
      if (estado !== undefined && !ESTADOS.includes(estado)) return res.status(400).json({ error: 'Ese estado no existe.' });
      const texto = (v: unknown, max: number) => v === undefined ? null : String(v ?? '').trim().slice(0, max);
      const actual = (await db.execute(sql`
        SELECT d.id, d.estado, d.pedido_id, d.distribuidor_nombre, p.vendedor_user_id, p.codigo, p.comprador_user_id, p.estado AS estado_pedido,
               p.telefono_contacto, p.producto_nombre
        FROM pedidos_distribuidor d JOIN pedidos p ON p.id = d.pedido_id WHERE d.id = ${String(req.params.id)}
      `)).rows[0] as any;
      if (!actual || (actual.vendedor_user_id !== req.user!.id && !esAdmin(req))) {
        return res.status(404).json({ error: 'Ese pedido no es tuyo o no existe.' });
      }
      // A shop entry only moves forward, like the customer's order it feeds:
      // going back would leave the buyer's page saying «delivered» on top and
      // «being ordered» underneath. «Incidencia» is the way out of any open
      // state and back into any; delivered and cancelled are final.
      if (estado !== undefined && estado !== actual.estado) {
        const PASO: Record<string, number> = { pendiente: 0, pedido_hecho: 1, enviado: 2, entregado: 3 };
        if (actual.estado === 'entregado' || actual.estado === 'cancelado') {
          return res.status(409).json({ error: `Este pedido a la tienda ya está ${actual.estado === 'entregado' ? 'entregado' : 'cancelado'} y no se puede cambiar. Si hay un problema, apúntalo en la nota.` });
        }
        if (PASO[estado] !== undefined && PASO[actual.estado] !== undefined && PASO[estado] < PASO[actual.estado]) {
          return res.status(409).json({ error: 'No se puede volver atrás. Si algo ha ido mal, márcalo como «Incidencia».' });
        }
      }
      const ref = texto(referencia, 120), seg = texto(seguimiento, 200), nt = texto(nota, 2000);
      const r = await db.execute(sql`
        UPDATE pedidos_distribuidor SET
          estado = COALESCE(${estado ?? null}, estado),
          referencia_distribuidor = CASE WHEN ${ref !== null} THEN ${ref || null} ELSE referencia_distribuidor END,
          seguimiento = CASE WHEN ${seg !== null} THEN ${seg || null} ELSE seguimiento END,
          nota = CASE WHEN ${nt !== null} THEN ${nt || null} ELSE nota END,
          gestionado_por = ${req.user!.id}, updated_at = now()
        WHERE id = ${actual.id}
        RETURNING estado, seguimiento
      `);
      const nuevo = r.rows[0] as any;

      // El pedido del cliente, deducido de todas sus tiendas. Solo avanza.
      const todos = (await db.execute(sql`SELECT estado, seguimiento FROM pedidos_distribuidor WHERE pedido_id = ${actual.pedido_id}`)).rows as any[];
      const deducido = estadoDeducido(todos.map(t => t.estado));
      let pedidoEstado = actual.estado_pedido;
      if (RANGO[actual.estado_pedido] !== undefined && RANGO[deducido] > RANGO[actual.estado_pedido]) {
        const seguimientos = todos.map(t => t.seguimiento).filter(Boolean).join(' · ').slice(0, 500) || null;
        await db.execute(sql`
          UPDATE pedidos SET estado = ${deducido}, seguimiento = COALESCE(${seguimientos}, seguimiento), updated_at = now() WHERE id = ${actual.pedido_id}
        `);
        pedidoEstado = deducido;
      }

      // Quien compró se entera de lo que le importa de cada tienda: que se ha
      // pedido, que ha salido, que ha llegado, o que hay un problema.
      if (estado && estado !== actual.estado && actual.comprador_user_id) {
        const QUE: Record<string, string> = {
          pedido_hecho: 'ya está pedido a la tienda',
          enviado: `ha salido${nuevo?.seguimiento ? ` (seguimiento ${nuevo.seguimiento})` : ''}`,
          entregado: 'consta como entregado',
          incidencia: 'tiene un problema con la tienda: te escribiremos',
          cancelado: 'no se ha podido servir: te escribiremos para devolverte su importe',
        };
        if (QUE[estado]) {
          await avisar(db, {
            paraQuien: actual.comprador_user_id, dePartede: req.user!.id, tipo: 'pedido_estado', entidadTipo: 'pedidos', entidadId: actual.pedido_id,
            datos: { texto: `Tu pedido ${actual.codigo}: lo de ${actual.distribuidor_nombre} ${QUE[estado]}.`, codigo: actual.codigo, estado, destino: `/pedido?codigo=${actual.codigo}` },
          }).catch(() => {});
        }
      }
      if (estado && estado !== actual.estado && (estado === 'enviado' || estado === 'entregado')) {
        await avisarPorWhatsApp(db, {
          telefono: actual.telefono_contacto, userId: actual.comprador_user_id, motivo: estado === 'enviado' ? 'pedido_enviado' : 'pedido_entregado',
          entidadTipo: 'pedidos', entidadId: actual.pedido_id,
          texto: estado === 'enviado'
            ? `Tu pedido ${actual.codigo}: lo de ${actual.distribuidor_nombre} ha salido${nuevo?.seguimiento ? `. Seguimiento: ${nuevo.seguimiento}` : ''}.`
            : `Tu pedido ${actual.codigo}: lo de ${actual.distribuidor_nombre} consta como entregado.`,
          parametros: [actual.codigo, actual.producto_nombre || '', nuevo?.seguimiento || ''],
        }).catch(() => {});
      }
      res.json({ id: actual.id, estado: nuevo?.estado, estado_pedido: pedidoEstado });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * EL FEED DE GOOGLE MERCHANT CENTER — `GET /api/ofertas/merchant/:handle.xml`
   * (requisito R15 del plan de SEO). Las ofertas que vende esta tienda, con
   * precio, disponibilidad y código de barras, para salir gratis en Google
   * Shopping. Es público a propósito: no dice nada que la ficha no diga ya.
   *
   * El EAN vive en la ficha de producto, no en la oferta: se sigue la
   * propiedad «Producto» de la fila de la oferta hasta la ficha y se lee su
   * columna «EAN / GTIN» (o, si no se le dio ese papel, la que se llame EAN o
   * GTIN). Sin código, se dice `identifier_exists=no` en vez de inventarlo.
   */
  app.get('/api/ofertas/merchant/:handle.xml', async (req: Request, res: Response) => {
    try {
      const handle = String(req.params.handle || '').toLowerCase().trim();
      const u = (await db.execute(sql`SELECT id, coalesce(display_name, name, handle) AS nombre FROM users WHERE lower(handle) = ${handle}`)).rows[0] as any;
      if (!u) return res.status(404).type('text/plain').send('Esa tienda no existe.');
      const productos = (await db.execute(sql`
        SELECT id, name, price_cents, currency, stock, images, envio_centimos, bd_fila_id, bd_tabla_id, distribuidor_nombre
        FROM products
        WHERE created_by = ${u.id} AND distribuidor_id IS NOT NULL AND archived_at IS NULL
          AND status NOT IN ('borrador', 'pausado') AND price_cents IS NOT NULL
          -- A table sent to the bin leaves its products untouched (pre-existing):
          -- the feed must not advertise them.
          AND (bd_tabla_id IS NULL OR EXISTS (SELECT 1 FROM bd_tablas t WHERE t.id = bd_tabla_id AND t.archived_at IS NULL AND t.deleted_at IS NULL))
        ORDER BY name LIMIT 5000
      `)).rows as any[];
      const fichas = await fichasDeOfertas(db, productos.map(p => p.bd_fila_id).filter(Boolean));
      // UNA ENTRADA POR PRODUCTO, NO POR OFERTA. Google pide un artículo por
      // producto y vendedor: dos ofertas del mismo EAN serían un duplicado. Se
      // manda la que va primera en la ficha (`ordenarOfertas`: precio con
      // envío; la comisión no cuenta), con el nombre de la ficha y no el de
      // la fila de la oferta.
      const grupos = new Map<string, any[]>();
      for (const p of productos) {
        const k = fichas.get(p.bd_fila_id)?.ficha || p.id;
        (grupos.get(k) || grupos.set(k, []).get(k)!).push({
          ...p, precio_centimos: Number(p.price_cents), envio_centimos: p.envio_centimos === null ? null : Number(p.envio_centimos),
          nota_distribuidor: null, agotada: p.stock === 0,
        });
      }
      const elegidos = [...grupos.values()].map(g => ordenarOfertas(g)[0]);
      const dominio = process.env.DOMINIO_PUBLICO || 'humanity.wiki';
      const x = (v: unknown) => String(v ?? '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
      const precio = (c: number, m: string) => `${(c / 100).toFixed(2)} ${String(m || 'EUR').toUpperCase()}`;
      const items = elegidos.map(p => {
        const img = Array.isArray(p.images) ? p.images[0] : null;
        const imagen = img ? (String(img).startsWith('http') ? img : `https://${dominio}${String(img).startsWith('/') ? '' : '/'}${img}`) : null;
        const ficha = p.bd_fila_id ? fichas.get(p.bd_fila_id) : undefined;
        const gtin = ficha?.gtin || null;
        const titulo = ficha?.titulo || p.name;
        return [
          '<item>',
          `<g:id>${x(p.id)}</g:id>`,
          `<g:title>${x(titulo)}</g:title>`,
          `<g:description>${x(`${titulo}. Vendido a través de Wikiproducts${p.distribuidor_nombre ? `, servido por ${p.distribuidor_nombre}` : ''}.`)}</g:description>`,
          `<g:link>${x(`https://${handle}.${dominio}/producto/${encodeURIComponent(p.id)}`)}</g:link>`,
          imagen ? `<g:image_link>${x(imagen)}</g:image_link>` : '',
          `<g:availability>${p.stock === 0 ? 'out_of_stock' : 'in_stock'}</g:availability>`,
          `<g:price>${precio(Number(p.price_cents), p.currency)}</g:price>`,
          '<g:condition>new</g:condition>',
          gtin ? `<g:gtin>${x(gtin)}</g:gtin>` : '<g:identifier_exists>no</g:identifier_exists>',
          p.envio_centimos !== null ? `<g:shipping><g:country>ES</g:country><g:price>${precio(Number(p.envio_centimos), p.currency)}</g:price></g:shipping>` : '',
          '</item>',
        ].filter(Boolean).join('');
      });
      res.type('application/xml').set('Cache-Control', 'public, max-age=900').send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>`
        + `<title>${x(u.nombre)}</title><link>${x(`https://${handle}.${dominio}/`)}</link><description>${x(`Ofertas de ${u.nombre}`)}</description>`
        + items.join('\n') + '</channel></rss>',
      );
    } catch (e: any) { console.error(e); res.status(500).type('text/plain').send('No se ha podido generar el feed.'); }
  });
}

/** La ficha de producto de cada fila de oferta: su id, su nombre y su
 *  EAN/GTIN. Solo códigos de 8, 12, 13 o 14 cifras: lo que no lo es no es un
 *  GTIN, y se deja en `null` en vez de mandarlo a Google. */
async function fichasDeOfertas(db: any, filasOferta: string[]): Promise<Map<string, { ficha: string; titulo: string | null; gtin: string | null }>> {
  const m = new Map<string, { ficha: string; titulo: string | null; gtin: string | null }>();
  if (!filasOferta.length) return m;
  const r = await db.execute(sql`
    SELECT e.fila_origen, f.id, f.valores, f.tabla_id
    FROM bd_enlaces e
    JOIN bd_columnas c ON c.id = e.columna_id AND c.config->>'rol' = 'producto'
    JOIN bd_filas f ON f.id = e.destino_id AND f.deleted_at IS NULL
    WHERE e.clase = 'fila' AND e.fila_origen = ANY(string_to_array(${filasOferta.join(',')}, ','))
    ORDER BY e.orden
  `);
  const filas = r.rows as any[];
  const tablas = [...new Set(filas.map(f => f.tabla_id))];
  if (!tablas.length) return m;
  const cols = (await db.execute(sql`
    SELECT id, tabla_id, nombre, tipo, config FROM bd_columnas
    WHERE archived_at IS NULL AND tabla_id = ANY(string_to_array(${tablas.join(',')}, ','))
    ORDER BY orden, created_at
  `)).rows as any[];
  const colGtin = new Map<string, string>(), colTitulo = new Map<string, string>();
  for (const t of tablas) {
    const deTabla = cols.filter(c => c.tabla_id === t);
    const g = deTabla.find(c => c.config?.rol === 'gtin') || deTabla.find(c => /^(ean|gtin)\b/i.test(String(c.nombre || '').trim()));
    if (g) colGtin.set(t, g.id);
    const ti = deTabla.find(c => c.tipo === 'texto');
    if (ti) colTitulo.set(t, ti.id);
  }
  for (const f of filas) {
    if (m.has(f.fila_origen)) continue;
    const cg = colGtin.get(f.tabla_id), ct = colTitulo.get(f.tabla_id);
    const v = cg ? String(f.valores?.[cg] ?? '').replace(/\D/g, '') : '';
    const titulo = ct ? String(f.valores?.[ct] ?? '').trim() : '';
    m.set(f.fila_origen, { ficha: f.id, titulo: titulo || null, gtin: [8, 12, 13, 14].includes(v.length) ? v : null });
  }
  return m;
}
