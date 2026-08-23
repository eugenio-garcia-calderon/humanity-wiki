import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ROLE } from './auth.js';
import { guardian, REGLAS, ritmo, ipDe } from './limites/index.js';

// ============================================================================
// PUNTOS DE HUMANITY.WIKI (2026-08-08, petición del usuario)
// ============================================================================
// Un sistema de puntos interno con saldo decimal — "en un futuro serán
// puntos tokenizados con blockchain, de momento es un sistema de puntos
// interno". Se usan para comprar dentro de la app y para la IA; se ganan
// céntimos de punto cuando una publicación pública propia recibe una vista.
//
// `otorgarPuntos` es el único sitio que toca `users.puntos` — cualquier
// módulo que necesite mover puntos (una vista, una compra, un gasto de IA)
// lo importa de aquí en vez de hacer su propio UPDATE, para que el saldo y
// su libro de movimientos nunca se desincronicen.

const newId = () => `MP${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;

export type MotivoPuntos = 'regalo_bienvenida' | 'compra' | 'vista_publicacion' | 'gasto_ia' | 'ajuste_admin'
  | 'transferencia_enviada' | 'transferencia_recibida' | 'saldo_inicial' | 'gasto_servicio';

// ============================================================================
// TRANSFERENCIAS ENTRE PERSONAS (2026-08-22, decisión de Eugenio: «van a ser
// transferibles» — piloto de ~1000 usuarios)
// ============================================================================
// DETRÁS DE UN INTERRUPTOR, Y APAGADO POR DEFECTO. Igual que `TIENDAS_COBRO`:
// todo lo que mueve valor lo enciende Eugenio, no un despliegue. Con el
// interruptor apagado la ruta existe y contesta con el motivo — así la UI
// puede probarse en desarrollo poniendo `PUNTOS_TRANSFERENCIA=on` en `.env`
// sin que producción cambie de comportamiento.
//
// Regulación (contexto, no dictamen legal): mientras las transferencias estén
// apagadas el punto es un vale de prepago; encendidas, con mercado abierto,
// empieza a parecerse a dinero electrónico. La decisión de encender en
// producción pasa por Eugenio y por revisión legal — está escrito en la
// página /tokenomics y en su lista de tareas.
const transferenciasActivas = () => process.env.PUNTOS_TRANSFERENCIA === 'on';

/** Tope diario de envío por persona durante el piloto. Configurable sin
 *  desplegar; 100 por defecto — con 1000 usuarios limita el daño de una
 *  cuenta comprometida a un día de tope, no a un saldo entero. */
const topeDiario = () => Number(process.env.PUNTOS_TRANSFERENCIA_TOPE_DIA || 100);

/**
 * Mueve puntos (positivos = ingreso, negativos = gasto) y deja su
 * justificante. No hay comprobación de saldo mínimo para los ingresos; los
 * gastos SÍ deberían comprobarlo antes de llamar (esta función no lo hace
 * por sí sola porque quien gasta sabe mejor qué mensaje de error dar).
 */
export async function otorgarPuntos(
  db: any, userId: string, cantidad: number, motivo: MotivoPuntos,
  extra?: { entidadTipo?: string; entidadId?: string; stripeSessionId?: string },
) {
  await db.execute(sql`UPDATE users SET puntos = puntos + ${cantidad} WHERE id = ${userId}`);
  await db.execute(sql`
    INSERT INTO movimientos_puntos (id, user_id, cantidad, motivo, entidad_tipo, entidad_id, stripe_checkout_session_id)
    VALUES (${newId()}, ${userId}, ${cantidad}, ${motivo}, ${extra?.entidadTipo || null}, ${extra?.entidadId || null}, ${extra?.stripeSessionId || null})
  `);
}

/**
 * LA PUERTA ÚNICA DE GASTO (2026-08-22, Eugenio: «un sistema de puntos bien
 * diseñado que cuando tengamos lo del MiCA solo haya que hacer algún pequeño
 * ajuste»). Cuando un servicio de la plataforma quiera cobrar puntos —
 * almacenamiento, cómputo, una acción de IA — llama AQUÍ, no hace su propio
 * UPDATE: comprueba el saldo y escribe el apunte en una sola transacción, con
 * la fila del usuario cerrada para que dos cobros a la vez no pasen los dos.
 * El día del token, «quemar» puntos es exactamente esta función: por eso
 * existe ya con esta forma.
 *
 * Devuelve el saldo restante, o `null` si no hay saldo suficiente (el
 * servicio que llama decide qué mensaje dar — él sabe qué estaba vendiendo).
 */
export async function cobrarServicio(
  db: any, userId: string, cantidad: number, servicio: string,
  extra?: { entidadTipo?: string; entidadId?: string },
): Promise<number | null> {
  const importe = Math.round(cantidad * 100) / 100;
  if (!Number.isFinite(importe) || importe <= 0) throw new Error(`cobrarServicio: cantidad inválida (${cantidad}) para ${servicio}`);
  let restante: number | null = null;
  await db.transaction(async (tx: any) => {
    const cobro = await tx.execute(sql`
      UPDATE users SET puntos = puntos - ${importe}
      WHERE id = ${userId} AND puntos >= ${importe}
      RETURNING puntos
    `);
    if (!cobro.rows.length) return; // sin saldo: no se escribe nada
    restante = Number((cobro.rows[0] as any).puntos);
    await tx.execute(sql`
      INSERT INTO movimientos_puntos (id, user_id, cantidad, motivo, entidad_tipo, entidad_id)
      VALUES (${newId()}, ${userId}, ${-importe}, 'gasto_servicio', ${extra?.entidadTipo || servicio}, ${extra?.entidadId || null})
    `);
  });
  return restante;
}

// ============================================================================
// PUNTOS EN EL CARRITO (2026-08-22, decisión de Eugenio: descuento en el
// mercado hasta el 100 %). Interruptor `PUNTOS_DESCUENTO`, apagado en
// producción. El vendedor cobra en puntos lo que el comprador paga en puntos:
// una transferencia en el libro, con el pedido como entidad.
// ============================================================================
export const puntosDescuentoActivo = () => process.env.PUNTOS_DESCUENTO === 'on';
/** Cuántos puntos vale un euro de precio al pagar en el carrito (1 hoy: el
 *  precio de venta publicado). Se lee al usar, no al arrancar. */
export const puntosPorEuro = () => Math.max(0.0001, Number(process.env.PUNTOS_POR_EURO || 1));

/**
 * Mueve `puntos` del comprador al vendedor por un pedido, EN UNA TRANSACCIÓN
 * con las dos filas cerradas en orden de id (el mismo patrón que las
 * transferencias): si el comprador ya no tiene saldo, no ocurre nada y
 * devuelve false — quien llama decide qué hacer (no cobrar, o cobrar en euros).
 */
/** La cuenta de la plataforma en el libro (migración 0093) y la comisión en
 *  puntos: 2,5 % por defecto — la mitad del 5 % de las ventas en euros
 *  (Eugenio, 2026-08-23: «un 50 % de descuento en la comisión cuando utilizan
 *  un sistema de intercambio de puntos en vez de moneda fiat»). */
export const CUENTA_PLATAFORMA = 'U_PLATAFORMA';
export const comisionPuntosBps = () => Math.max(0, Math.min(10000, Number(process.env.PUNTOS_COMISION_BPS ?? 250)));

export async function pagarConPuntos(db: any, compradorId: string, vendedorId: string, puntos: number, pedidoId: string): Promise<boolean> {
  const importe = Math.round(puntos * 100) / 100;
  if (!Number.isFinite(importe) || importe <= 0 || compradorId === vendedorId) return false;
  // La comisión sale de lo que recibe el vendedor, nunca de lo que paga el
  // comprador: el precio es el precio. Tres apuntes, un pedido como entidad.
  const comision = Math.round(importe * comisionPuntosBps()) / 10000;
  const comisionRedondeada = Math.round(comision * 100) / 100;
  const netoVendedor = Math.round((importe - comisionRedondeada) * 100) / 100;
  let ok = false;
  await db.transaction(async (tx: any) => {
    await tx.execute(sql`SELECT id FROM users WHERE id IN (${compradorId}, ${vendedorId}, ${CUENTA_PLATAFORMA}) ORDER BY id FOR UPDATE`);
    const cobro = await tx.execute(sql`
      UPDATE users SET puntos = puntos - ${importe} WHERE id = ${compradorId} AND puntos >= ${importe} RETURNING puntos
    `);
    if (!cobro.rows.length) return;
    await tx.execute(sql`UPDATE users SET puntos = puntos + ${netoVendedor} WHERE id = ${vendedorId}`);
    await tx.execute(sql`
      INSERT INTO movimientos_puntos (id, user_id, cantidad, motivo, entidad_tipo, entidad_id)
      VALUES (${newId()}, ${compradorId}, ${-importe}, 'compra_con_puntos', 'pedidos', ${pedidoId})
    `);
    await tx.execute(sql`
      INSERT INTO movimientos_puntos (id, user_id, cantidad, motivo, entidad_tipo, entidad_id)
      VALUES (${newId()}, ${vendedorId}, ${netoVendedor}, 'venta_en_puntos', 'pedidos', ${pedidoId})
    `);
    if (comisionRedondeada > 0) {
      // Si la cuenta de la plataforma no existiera (migración sin aplicar), el
      // UPDATE no toca filas y el INSERT fallaría por la clave foránea: mejor
      // que falle la transacción entera a que se esfume la comisión en silencio.
      await tx.execute(sql`UPDATE users SET puntos = puntos + ${comisionRedondeada} WHERE id = ${CUENTA_PLATAFORMA}`);
      await tx.execute(sql`
        INSERT INTO movimientos_puntos (id, user_id, cantidad, motivo, entidad_tipo, entidad_id)
        VALUES (${newId()}, ${CUENTA_PLATAFORMA}, ${comisionRedondeada}, 'comision_puntos', 'pedidos', ${pedidoId})
      `);
    }
    await tx.execute(sql`UPDATE pedidos SET puntos_usados = ${importe}, updated_at = now() WHERE id = ${pedidoId}`);
    ok = true;
  });
  return ok;
}

/**
 * DEVOLVER LO PAGADO CON PUNTOS (2026-08-23). Deshace `pagarConPuntos` con
 * apuntes contrarios sobre el MISMO pedido: el vendedor devuelve su neto, la
 * plataforma su comisión y el comprador recupera el total. Todo o nada, en
 * una transacción con las filas cerradas en orden de id. Si el vendedor (o la
 * plataforma) ya no tiene saldo, no se devuelve a medias: se devuelve `false`
 * con el motivo y no se toca nada. Repetirla es inocuo: si el pedido ya tiene
 * apuntes de devolución, no hace nada y dice que ya estaba.
 */
export async function devolverPuntos(db: any, pedidoId: string): Promise<{ ok: boolean; motivo?: string; puntos?: number }> {
  const ped = (await db.execute(sql`
    SELECT id, comprador_user_id, vendedor_user_id, puntos_usados::float AS puntos FROM pedidos WHERE id = ${pedidoId}
  `)).rows[0] as any;
  if (!ped) return { ok: false, motivo: 'Ese pedido no existe.' };
  const total = Math.round(Number(ped.puntos || 0) * 100) / 100;
  if (total <= 0) return { ok: true, puntos: 0 };
  if (!ped.comprador_user_id || !ped.vendedor_user_id) return { ok: false, motivo: 'El pedido no tiene comprador o vendedor con cuenta: no se puede devolver en puntos.' };
  // Lo que cada parte recibió, leído del libro (la verdad), no recalculado.
  const apuntes = (await db.execute(sql`
    SELECT user_id, motivo, cantidad::float AS cantidad FROM movimientos_puntos
    WHERE entidad_tipo = 'pedidos' AND entidad_id = ${pedidoId}
  `)).rows as any[];
  if (apuntes.some(a => a.motivo === 'devolucion_puntos')) return { ok: true, puntos: total, motivo: 'Ya estaba devuelto.' };
  const neto = apuntes.filter(a => a.motivo === 'venta_en_puntos').reduce((n, a) => n + a.cantidad, 0);
  const comision = apuntes.filter(a => a.motivo === 'comision_puntos').reduce((n, a) => n + a.cantidad, 0);
  const netoR = Math.round(neto * 100) / 100;
  const comR = Math.round(comision * 100) / 100;
  let resultado: { ok: boolean; motivo?: string; puntos?: number } = { ok: false, motivo: 'No se ha podido devolver.' };
  await db.transaction(async (tx: any) => {
    await tx.execute(sql`SELECT id FROM users WHERE id IN (${ped.comprador_user_id}, ${ped.vendedor_user_id}, ${CUENTA_PLATAFORMA}) ORDER BY id FOR UPDATE`);
    const v = await tx.execute(sql`UPDATE users SET puntos = puntos - ${netoR} WHERE id = ${ped.vendedor_user_id} AND puntos >= ${netoR} RETURNING id`);
    if (!v.rows.length) { resultado = { ok: false, motivo: `No tienes saldo suficiente para devolver los ${netoR.toLocaleString('es-ES')} puntos que cobraste.` }; throw new Error('SIN_SALDO_VENDEDOR'); }
    if (comR > 0) {
      const p = await tx.execute(sql`UPDATE users SET puntos = puntos - ${comR} WHERE id = ${CUENTA_PLATAFORMA} AND puntos >= ${comR} RETURNING id`);
      if (!p.rows.length) { resultado = { ok: false, motivo: 'La cuenta de la plataforma no puede devolver su comisión ahora mismo; avisa al equipo.' }; throw new Error('SIN_SALDO_PLATAFORMA'); }
    }
    await tx.execute(sql`UPDATE users SET puntos = puntos + ${total} WHERE id = ${ped.comprador_user_id}`);
    await tx.execute(sql`
      INSERT INTO movimientos_puntos (id, user_id, cantidad, motivo, entidad_tipo, entidad_id)
      VALUES (${newId()}, ${ped.vendedor_user_id}, ${-netoR}, 'devolucion_puntos', 'pedidos', ${pedidoId})
    `);
    if (comR > 0) {
      await tx.execute(sql`
        INSERT INTO movimientos_puntos (id, user_id, cantidad, motivo, entidad_tipo, entidad_id)
        VALUES (${newId()}, ${CUENTA_PLATAFORMA}, ${-comR}, 'devolucion_puntos', 'pedidos', ${pedidoId})
      `);
    }
    await tx.execute(sql`
      INSERT INTO movimientos_puntos (id, user_id, cantidad, motivo, entidad_tipo, entidad_id)
      VALUES (${newId()}, ${ped.comprador_user_id}, ${total}, 'devolucion_puntos', 'pedidos', ${pedidoId})
    `);
    resultado = { ok: true, puntos: total };
  }).catch((e: any) => { if (!String(e?.message || '').startsWith('SIN_SALDO')) throw e; });
  return resultado;
}

/** Hoy (YYYY-MM-DD) en hora de Madrid: el calendario del equipo, no el del contenedor (UTC). */
export const hoyMadrid = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date());

/** El regalo de bienvenida vigente: `PUNTOS_BIENVENIDA`, 5.000 desde el 2026-08-23 (decisión de Eugenio). */
export const puntosBienvenida = () => Math.max(0, Math.round(Number(process.env.PUNTOS_BIENVENIDA ?? 5000) * 100) / 100);

/**
 * El regalo de bienvenida, ENTERO y en un solo sitio (2026-08-23). Hasta la
 * 0103 el saldo nacía por el DEFAULT 100 de `users.puntos` y aquí solo se
 * dejaba el justificante; con el DEFAULT en 0, esta función pone columna y
 * apunte en la MISMA transacción — la cifra vive en `PUNTOS_BIENVENIDA` y
 * libro y columna no pueden discrepar por cambiarla. Si por lo que sea se
 * llamara dos veces para la misma cuenta, la segunda no hace nada: el libro
 * ya tiene su regalo. Se llama una vez, justo después de cada alta.
 *
 * OJO con la cifra (revisión del Dashboard, 23-08): 5.000 por cuenta nueva
 * es más que todo lo que circulaba hasta hoy (14 cuentas × 100). Con puntos
 * transferibles, crear cuentas sería fabricar valor — por eso ENVIAR puntos
 * exige cuenta verificada (nivel ≥ 2): una cuenta recién creada gasta sus
 * 5.000 en la cesta y el mercado, pero no los consolida en otra.
 */
export async function registrarRegaloBienvenida(db: any, userId: string) {
  const cantidad = puntosBienvenida();
  if (cantidad <= 0) return;
  await db.transaction(async (tx: any) => {
    const ya = await tx.execute(sql`SELECT 1 FROM movimientos_puntos WHERE user_id = ${userId} AND motivo = 'regalo_bienvenida' LIMIT 1`);
    if (ya.rows.length) return;
    await tx.execute(sql`UPDATE users SET puntos = puntos + ${cantidad} WHERE id = ${userId}`);
    await tx.execute(sql`
      INSERT INTO movimientos_puntos (id, user_id, cantidad, motivo)
      VALUES (${newId()}, ${userId}, ${cantidad}, 'regalo_bienvenida')
    `);
  });
}

// ============================================================================
// DÍAS DE USO (2026-08-23): «activo» = al menos N días con sesión en el mes
// ============================================================================
// Una fila por persona y día en `actividad_diaria` (0103), puesta desde el
// middleware de sesión. No guarda qué hizo nadie, solo que estuvo. En memoria
// se recuerda el último día anotado por persona para no escribir en cada
// petición: una por persona y día; si la escritura falla se olvida, para
// reintentar en la siguiente. Best-effort: nunca bloquea una petición.
const ultimoDiaAnotado = new Map<string, string>();
export function anotarActividad(db: any, userId: string) {
  const hoy = hoyMadrid();
  if (ultimoDiaAnotado.get(userId) === hoy) return;
  if (ultimoDiaAnotado.size > 100000) ultimoDiaAnotado.clear();
  ultimoDiaAnotado.set(userId, hoy);
  Promise.resolve(db.execute(sql`INSERT INTO actividad_diaria (user_id, dia) VALUES (${userId}, ${hoy}::date) ON CONFLICT DO NOTHING`))
    .catch(() => { ultimoDiaAnotado.delete(userId); });
}

// ============================================================================
// EL LIBRO MANDA, EL SALDO SE CUADRA (2026-08-22, acuerdo prog7/prog4)
// ============================================================================
// Con puntos transferibles, `users.puntos` deja de ser la verdad y pasa a ser
// un DERIVADO del libro: la suma de tus movimientos ES tu saldo, y la columna
// solo existe para no sumar el libro entero en cada pantalla. El cuadre
// recorre las cuentas, compara columna contra suma, y donde no casan
// (a) lo canta en el registro del servidor con nombre y cifras — una
// discrepancia es un bug o una mano en la base, nunca ruido — y (b) repone la
// columna al valor del libro. Reponer no es un movimiento de valor (nada
// entra ni sale de nadie): es refrescar una caché que se había quedado mal.
//
// El libro es de solo-añadir desde la migración 0074 (disparador en la base),
// y el registro sellado del Programador 4 lo captura por disparador — el
// reparto acordado: nuestro libro es la verdad, su registro es la prueba.
//
// EL CUADRE NACE EN MODO AVISAR (revisión de prog4, la misma doctrina que su
// guardián): informa siempre, y solo REPARA con `PUNTOS_CUADRE_REPARA=on`.
// Reparar mil saldos a ciegas la primera noche, con la lógica estrenada esa
// tarde, es donde esto se torcería de verdad. La migración 0073 deja el
// libro cuadrado por construcción (apunte de apertura), así que la primera
// pasada limpia es lo esperable — y si no lo es, mejor mirarla que taparla.
//
// TODO(prog7→prog4): cuando la PR #231 esté fusionada, anotar cada descuadre
// también en su registro (`anotar(db, { clase: 'descuadre', … })`): la
// detección es un hecho de seguridad, no una línea de consola. La reparación
// ya queda capturada hoy porque `users` está entre sus tablas vigiladas.
const cuadreRepara = () => process.env.PUNTOS_CUADRE_REPARA === 'on';

export async function cuadrarPuntos(db: any): Promise<{ revisadas: number; repara: boolean; descuadres: { user_id: string; columna: number; libro: number }[] }> {
  const filas = await db.execute(sql`
    SELECT u.id AS user_id, u.puntos::float AS columna,
           coalesce(sum(m.cantidad), 0)::float AS libro
    FROM users u LEFT JOIN movimientos_puntos m ON m.user_id = u.id
    GROUP BY u.id, u.puntos
    HAVING abs(u.puntos - coalesce(sum(m.cantidad), 0)) >= 0.005
  `);
  const descuadres = (filas.rows as any[]).map(f => ({ user_id: f.user_id, columna: Number(f.columna), libro: Number(f.libro) }));
  const repara = cuadreRepara();
  for (const d of descuadres) {
    console.error(`[puntos] DESCUADRE en ${d.user_id}: columna ${d.columna} ≠ libro ${d.libro}.${repara ? ' Se repone la columna al valor del libro.' : ' Modo avisar: NO se toca (PUNTOS_CUADRE_REPARA=on para reparar).'}`);
    if (repara) await db.execute(sql`UPDATE users SET puntos = ${d.libro} WHERE id = ${d.user_id}`);
  }
  const total = await db.execute(sql`SELECT count(*)::int AS n FROM users`);
  return { revisadas: Number((total.rows[0] as any)?.n ?? 0), repara, descuadres };
}

export function registerPuntosRoutes(app: Express, db: any) {
  // El cuadre corre al arrancar (al minuto, para no competir con el arranque)
  // y cada 6 horas. No a las 24: con el ritmo de despliegues de este equipo
  // el contenedor se reinicia a diario y un temporizador de 24 h no llegaría
  // a sonar nunca (revisión de prog4). Cuadrar de más es inocuo: una pasada
  // sin descuadres no escribe nada.
  const pasada = () => cuadrarPuntos(db).catch(e => console.error('[puntos] cuadre fallido:', e.message));
  setTimeout(pasada, 60 * 1000);
  setInterval(pasada, 6 * 60 * 60 * 1000);

  /** GET /api/admin/puntos/cuadre — ejecutar el cuadre a mano y ver el resultado. */
  app.get('/api/admin/puntos/cuadre', async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.roleLevel < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      }
      res.json(await cuadrarPuntos(db));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // LA API PÚBLICA DE TOKENOMICS (2026-08-22, rama A decidida por Eugenio)
  // ==========================================================================
  // Las dos cosas que un token de utilidad tiene que poder enseñar a
  // cualquiera SIN pedir cuenta — por eso estas rutas no exigen sesión:
  // qué compra un punto ahora (y qué compró siempre), y cuántos puntos
  // existen y de dónde salieron. Cuando llegue la revisión MiCA, el libro
  // blanco cita estas dos direcciones en vez de prometer transparencia.

  /** GET /api/tokenomics/precios — la cesta vigente, y su historia entera. */
  app.get('/api/tokenomics/precios', async (_req: Request, res: Response) => {
    try {
      const vigentes = await db.execute(sql`
        SELECT DISTINCT ON (servicio) servicio, nombre, unidad, puntos::float, nota, vigente_desde
        FROM tokenomics_precios ORDER BY servicio, vigente_desde DESC
      `);
      const historia = await db.execute(sql`
        SELECT servicio, unidad, puntos::float, vigente_desde
        FROM tokenomics_precios ORDER BY servicio, vigente_desde DESC
      `);
      // Un servicio cuya última fila empieza por RETIRADO ya no está en la
      // cesta: sigue en la historia (solo-añadir) pero no entre los vigentes.
      res.json({
        vigentes: (vigentes.rows as any[]).filter(v => !String(v.nombre || '').startsWith('RETIRADO')),
        historia: historia.rows,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * GET /api/tokenomics/resumen — cuántos puntos existen y de dónde salieron.
   * Todo sale del libro (la única verdad), nunca de un contador aparte:
   * `circulacion` es la suma de TODO el libro, y el desglose agrupa por
   * motivo — emitido (regalos, vistas, aperturas), comprado, gastado.
   */
  app.get('/api/tokenomics/resumen', async (_req: Request, res: Response) => {
    try {
      const porMotivo = await db.execute(sql`
        SELECT motivo, coalesce(sum(cantidad), 0)::float AS total, count(*)::int AS apuntes
        FROM movimientos_puntos GROUP BY motivo ORDER BY motivo
      `);
      const total = await db.execute(sql`
        SELECT coalesce(sum(cantidad), 0)::float AS circulacion,
               count(DISTINCT user_id)::int AS cuentas
        FROM movimientos_puntos
      `);
      res.json({
        circulacion: Number((total.rows[0] as any)?.circulacion ?? 0),
        cuentas: Number((total.rows[0] as any)?.cuentas ?? 0),
        por_motivo: porMotivo.rows,
        nota: 'Los usos de la cesta (almacenamiento, cómputo, IA) aún no cobran puntos; sus precios son orientativos hasta que cada servicio se encienda.',
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * GET /api/admin/tokenomics/reparto?mes=YYYY-MM — EL REPARTO MENSUAL, EN
   * SIMULACIÓN (2026-08-22, decisiones de Eugenio: bote = 50% de la COMISIÓN
   * del mercado; reparto MIXTO — una parte igual por cabeza, otra proporcional
   * al éxito de las publicaciones: vistas válidas, interacción, reseñas
   * positivas). NO PAGA NADA: calcula y enseña. Nace así a propósito — como
   * el cuadre y el guardián de prog4 — para que Eugenio vea números reales
   * durante meses antes de que una sola línea mueva saldo. El día que se
   * active, el pago será recorrer esta misma lista llamando a `otorgarPuntos`
   * con un motivo nuevo; la lista no cambia.
   *
   * Lo que pesa y cuánto (ajustable sin desplegar, y declarado en la
   * respuesta para que nadie tenga que adivinarlo):
   *   vistas válidas ×1 · interacciones (reacciones + comentarios) ×1 ·
   *   reseñas positivas (nota ≥ 7 sobre 10) ×3.
   * Solo cuentan números que no se pueden inflar desde fuera: vistas VÁLIDAS
   * (una por persona y día), nunca el contador bruto.
   *
   * La conversión euros→puntos del bote usa `PUNTOS_POR_EURO` (1 por defecto,
   * el precio de venta actual). Es orientativa y lo dice: el punto se
   * explica por la cesta, no por el euro.
   */
  // El cálculo vive en una función porque lo usan dos rutas y el reloj: la
  // SIMULACIÓN (GET, no escribe nada), la EJECUCIÓN a mano (POST) y el reparto
  // AUTOMÁTICO del día 1. Si fueran cálculos distintos, algún día darían
  // números distintos.
  //
  // EL MODELO (2026-08-23, Eugenio: «que reciba 1000 puntos al mes fijo si
  // está activo y usando la plataforma al menos 3 veces al mes, y luego
  // variables en función de su reputación social»):
  //   · FIJO: `PUNTOS_FIJO_MENSUAL` (1.000) a CADA persona verificada y ACTIVA
  //     en el mes — activa = al menos `PUNTOS_ACTIVIDAD_MIN_DIAS` (3) días
  //     distintos con sesión (`actividad_diaria`). No es un bote que se
  //     divide: es por cabeza, la emisión crece con las personas activas.
  //     Verificada (nivel ≥ 2) sigue siendo la puerta: con puntos
  //     transferibles, pagar 1.000 al mes a cualquier cuenta recién creada
  //     sería invitar a crear cuentas.
  //   · VARIABLE: un bote `PUNTOS_BOTE_VARIABLE` (1.000) al mes repartido entre
  //     las activas en proporción a su REPUTACIÓN SOCIAL del mes: lo que otras
  //     personas hicieron con lo suyo — vistas válidas (una por persona y día,
  //     con sesión), interacciones (reacciones y comentarios) y reseñas
  //     positivas (≥ 7/10; las de productos solo con compra verificada). Son
  //     las señales que no se inflan desde fuera. Si nadie tiene reputación
  //     medible, el bote variable NO se emite y se dice. (`users.reputation`
  //     existe pero nadie lo calcula todavía: cuando haya una puntuación
  //     social de verdad, entra aquí como peso, no en otro sitio.)
  const calcularReparto = async (mes: string) => {
      const desde = `${mes}-01`;
      const fijoPorPersona = Math.max(0, Math.round(Number(process.env.PUNTOS_FIJO_MENSUAL ?? 1000) * 100) / 100);
      const boteVariable = Math.max(0, Math.round(Number(process.env.PUNTOS_BOTE_VARIABLE ?? 1000) * 100) / 100);
      const minDias = Math.max(1, Math.floor(Number(process.env.PUNTOS_ACTIVIDAD_MIN_DIAS ?? 3)));
      const pesos = {
        vista_valida: Number(process.env.PUNTOS_PESO_VISTA ?? 1),
        interaccion: Number(process.env.PUNTOS_PESO_INTERACCION ?? 1),
        resena_positiva: Number(process.env.PUNTOS_PESO_RESENA ?? 3),
      };

      // La comisión del mes se sigue enseñando: es el dato con el que algún
      // día la emisión volverá a atarse a los ingresos reales del mercado.
      const comision = await db.execute(sql`
        SELECT coalesce(sum(platform_fee_cents), 0)::int AS fee_cents, count(*)::int AS operaciones
        FROM transactions
        WHERE status = 'pagado' AND created_at >= ${desde}::date AND created_at < (${desde}::date + interval '1 month')
      `);
      const feeCents = Number((comision.rows[0] as any)?.fee_cents ?? 0);

      // Quién entra: personas verificadas (nivel ≥ 2), vivas, con sus días de
      // uso del mes. Activas = días ≥ minDias; las demás se enseñan aparte.
      const personas = await db.execute(sql`
        SELECT u.id, coalesce(u.display_name, u.name, u.email) AS nombre, coalesce(a.dias, 0)::int AS dias_activos
        FROM users u
        LEFT JOIN (
          SELECT user_id, count(*)::int AS dias FROM actividad_diaria
          WHERE dia >= ${desde}::date AND dia < (${desde}::date + interval '1 month') GROUP BY user_id
        ) a ON a.user_id = u.id
        WHERE u.archived_at IS NULL AND u.role_level >= ${ROLE.VERIFIED}
        ORDER BY a.dias DESC NULLS LAST, u.created_at
      `);
      const verificados = personas.rows as any[];
      const activos = verificados.filter(p => p.dias_activos >= minDias);
      const inactivos = verificados.filter(p => p.dias_activos < minDias);

      // El éxito de cada autor en el mes, por sus ventanas públicas.
      const exito = await db.execute(sql`
        WITH ventanas AS (
          SELECT id, creator_user_id FROM knowledge_windows WHERE publico = true AND creator_user_id IS NOT NULL
        ),
        vv AS (
          SELECT v.creator_user_id AS uid, count(*)::int AS n FROM vistas_validas x JOIN ventanas v ON v.id = x.ventana_id
          WHERE x.dia >= ${desde}::date AND x.dia < (${desde}::date + interval '1 month') GROUP BY v.creator_user_id
        ),
        inter AS (
          SELECT v.creator_user_id AS uid, count(*)::int AS n FROM (
            SELECT entity_id, created_at FROM reactions WHERE entity_type = 'knowledge_windows'
            UNION ALL
            SELECT entity_id, created_at FROM comments WHERE entity_type = 'knowledge_windows'
          ) i JOIN ventanas v ON v.id = i.entity_id
          WHERE i.created_at >= ${desde}::date AND i.created_at < (${desde}::date + interval '1 month') GROUP BY v.creator_user_id
        ),
        res AS (
          -- Reseñas positivas (≥ 7/10) de publicaciones…
          SELECT uid, sum(n)::int AS n FROM (
            SELECT v.creator_user_id AS uid, count(*)::int AS n FROM ratings r JOIN ventanas v ON v.id = r.entity_id
            WHERE r.entity_type = 'knowledge_windows' AND r.score >= 7
              AND r.created_at >= ${desde}::date AND r.created_at < (${desde}::date + interval '1 month') GROUP BY v.creator_user_id
            UNION ALL
            -- …y de PRODUCTOS, solo con COMPRA VERIFICADA: una reseña que pesa
            -- en el reparto tiene que venir de alguien que pagó — si no, es
            -- un número que cualquiera sube desde fuera con cuentas.
            SELECT p.created_by AS uid, count(*)::int AS n
            FROM ratings r JOIN products p ON p.id = r.entity_id LEFT JOIN users u ON u.id = r.user_id
            WHERE r.entity_type = 'products' AND r.score >= 7
              AND r.created_at >= ${desde}::date AND r.created_at < (${desde}::date + interval '1 month')
              AND EXISTS (
                SELECT 1 FROM pedidos pd LEFT JOIN pedido_lineas pl ON pl.pedido_id = pd.id
                WHERE pd.estado NOT IN ('cancelado', 'devuelto')
                  AND (pd.producto_id = p.id OR pl.producto_id = p.id)
                  AND (pd.comprador_user_id = r.user_id OR lower(pd.comprador_email) = lower(u.email))
              )
            GROUP BY p.created_by
          ) x GROUP BY uid
        )
        SELECT u.id AS uid,
               coalesce(vv.n, 0)::int AS vistas_validas,
               coalesce(inter.n, 0)::int AS interacciones,
               coalesce(res.n, 0)::int AS resenas_positivas
        FROM users u
        LEFT JOIN vv ON vv.uid = u.id LEFT JOIN inter ON inter.uid = u.id LEFT JOIN res ON res.uid = u.id
        WHERE u.archived_at IS NULL AND u.role_level >= ${ROLE.VERIFIED}
      `);
      const porUsuario = new Map<string, { vistas_validas: number; interacciones: number; resenas_positivas: number; peso: number }>();
      for (const f of exito.rows as any[]) {
        const peso = f.vistas_validas * pesos.vista_valida + f.interacciones * pesos.interaccion + f.resenas_positivas * pesos.resena_positiva;
        porUsuario.set(f.uid, { vistas_validas: f.vistas_validas, interacciones: f.interacciones, resenas_positivas: f.resenas_positivas, peso });
      }
      // El bote variable se reparte entre quien ESTÁ: solo pesa la reputación
      // de las personas activas.
      let pesoTotal = 0;
      for (const p of activos) pesoTotal += porUsuario.get(p.id)?.peso ?? 0;

      const reparto = activos.map(u => {
        const e = porUsuario.get(u.id) || { vistas_validas: 0, interacciones: 0, resenas_positivas: 0, peso: 0 };
        const variable = pesoTotal ? Math.floor((boteVariable * e.peso / pesoTotal) * 100) / 100 : 0;
        return { user_id: u.id, nombre: u.nombre, dias_activos: Number(u.dias_activos), ...e, fijo: fijoPorPersona, variable, total: Math.round((fijoPorPersona + variable) * 100) / 100 };
      }).sort((a, b) => b.total - a.total || b.dias_activos - a.dias_activos);
      const totalAEmitir = Math.round(reparto.reduce((n, p) => n + p.total, 0) * 100) / 100;

      // ¿Ya se ejecutó este mes? Se pregunta al libro, no a una tabla aparte:
      // cada apunte del reparto lleva el mes como entidad.
      const ejecutado = await db.execute(sql`
        SELECT count(*)::int AS n, coalesce(sum(cantidad), 0)::float AS total
        FROM movimientos_puntos WHERE motivo = 'reparto_mensual' AND entidad_tipo = 'reparto' AND entidad_id = ${mes}
      `);
      return {
        mes,
        modelo: 'fijo_por_persona_activa_mas_bote_variable_por_reputacion',
        fijo_por_persona: fijoPorPersona,
        bote_variable: boteVariable,
        min_dias_activo: minDias,
        pesos,
        comision_mes_eur: feeCents / 100,
        operaciones_pagadas: Number((comision.rows[0] as any)?.operaciones ?? 0),
        verificados: verificados.length,
        activos: activos.length,
        inactivos: inactivos.slice(0, 200).map(p => ({ user_id: p.id, nombre: p.nombre, dias_activos: Number(p.dias_activos) })),
        // `bote_puntos` se conserva para quien lo leía: ahora es el total a emitir.
        bote_puntos: totalAEmitir,
        total_a_emitir: totalAEmitir,
        // Si nadie activo tiene reputación medible, el bote variable no se
        // emite y se dice: repartirlo a partes iguales en silencio sería
        // inventar mérito.
        variable_sin_repartir: pesoTotal ? 0 : boteVariable,
        ya_ejecutado: Number((ejecutado.rows[0] as any)?.n ?? 0) > 0,
        ya_repartido_puntos: Number((ejecutado.rows[0] as any)?.total ?? 0),
        reparto,
      };
  };

  const mesDe = (v: unknown) => /^\d{4}-\d{2}$/.test(String(v || '')) ? String(v) : hoyMadrid().slice(0, 7);
  const mesRepartido = async (mes: string) => {
    const r = await db.execute(sql`SELECT 1 FROM movimientos_puntos WHERE motivo = 'reparto_mensual' AND entidad_tipo = 'reparto' AND entidad_id = ${mes} LIMIT 1`);
    return r.rows.length > 0;
  };

  /**
   * EJECUTA el reparto de un mes: un apunte `reparto_mensual` por persona con
   * el mes como entidad, en UNA transacción — o todos o ninguno. Una vez por
   * mes: si el libro ya tiene apuntes de ese mes, `ya` y no se toca nada; y
   * la garantía de fondo es la base de datos (índice único de la 0101): dos
   * ejecuciones a la vez no pueden pagar dos veces a la misma persona. El
   * reparto EMITE puntos (no salen de ninguna cuenta). Lo llaman el reloj
   * (día 1, mes cerrado) y el botón del administrador: el mismo código.
   */
  type ResultadoReparto = { estado: 'hecho' | 'ya' | 'nada'; calculo: Awaited<ReturnType<typeof calcularReparto>>; filas: any[]; total: number };
  const ejecutarReparto = async (mes: string, actor: string): Promise<ResultadoReparto> => {
    const calculo = await calcularReparto(mes);
    const filas = calculo.reparto.filter(p => p.total > 0);
    if (calculo.ya_ejecutado) return { estado: 'ya', calculo, filas: [], total: 0 };
    if (!filas.length) return { estado: 'nada', calculo, filas: [], total: 0 };
    try {
      await db.transaction(async (tx: any) => {
        // Se cierra el libro del mes ANTES de escribir: dos ejecuciones a la
        // vez (el reloj y un administrador) no pueden repartir dos veces.
        const otra = await tx.execute(sql`
          SELECT 1 FROM movimientos_puntos WHERE motivo = 'reparto_mensual' AND entidad_tipo = 'reparto' AND entidad_id = ${mes} LIMIT 1
        `);
        if (otra.rows.length) throw Object.assign(new Error('YA'), { ya: true });
        for (const p of filas) {
          await tx.execute(sql`UPDATE users SET puntos = puntos + ${p.total} WHERE id = ${p.user_id}`);
          await tx.execute(sql`
            INSERT INTO movimientos_puntos (id, user_id, cantidad, motivo, entidad_tipo, entidad_id)
            VALUES (${newId()}, ${p.user_id}, ${p.total}, 'reparto_mensual', 'reparto', ${mes})
          `);
        }
      });
    } catch (e: any) {
      // `ya`: lo vio la comprobación; 23505: lo paró el índice único de la
      // 0101 (dos transacciones a la vez). Las dos son la misma respuesta.
      const texto = `${e?.message || ''} ${e?.cause?.message || ''}`;
      if (e?.ya || String(e?.code) === '23505' || String(e?.cause?.code) === '23505' || /un_reparto_por_mes|duplicate key/i.test(texto)) {
        return { estado: 'ya', calculo, filas: [], total: 0 };
      }
      throw e;
    }
    const total = Math.round(filas.reduce((n, p) => n + p.total, 0) * 100) / 100;
    console.log(`[puntos] reparto ${mes} ejecutado por ${actor}: ${total} puntos a ${filas.length} personas activas (fijo ${calculo.fijo_por_persona} por persona + bote variable ${calculo.bote_variable}${calculo.variable_sin_repartir ? ', variable sin repartir' : ''}).`);
    return { estado: 'hecho', calculo, filas, total };
  };

  // ==========================================================================
  // REPARTO AUTOMÁTICO (2026-08-23, Eugenio: «haz que sea automático»)
  // ==========================================================================
  // Cada hora (y al minuto y medio de arrancar) el servidor mira si el MES
  // ANTERIOR — el último cerrado, en hora de Madrid — está sin repartir, y si
  // lo está, lo reparte. Cada hora y no «a las 00:05 del día 1» porque el
  // contenedor se reinicia con cada despliegue y un temporizador largo no
  // llega a sonar (lección del cuadre, revisión de prog4); repasar de más es
  // inocuo: un mes repartido se detecta con una consulta y no se toca. Solo
  // el mes anterior — nunca el actual (se paga con el mes cerrado, cuando los
  // días de uso son definitivos) y nunca meses de antes de que el sistema
  // existiera (`PUNTOS_REPARTO_DESDE`). `PUNTOS_REPARTO_AUTO=off` lo apaga y
  // deja solo el botón.
  const mesAnteriorMadrid = () => {
    const [y, m] = hoyMadrid().split('-').map(Number);
    return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  };
  const avisadoSinNadie = new Set<string>();
  const repartoAutomatico = async () => {
    if ((process.env.PUNTOS_REPARTO_AUTO || 'on').toLowerCase() === 'off') return;
    const mes = mesAnteriorMadrid();
    if (mes < (process.env.PUNTOS_REPARTO_DESDE || '2026-08')) return;
    if (await mesRepartido(mes)) return;
    const r = await ejecutarReparto(mes, 'reloj');
    if (r.estado === 'nada' && !avisadoSinNadie.has(mes)) {
      avisadoSinNadie.add(mes);
      console.log(`[puntos] reparto automático de ${mes}: ninguna persona verificada con ≥ ${r.calculo.min_dias_activo} días de uso — no se emite nada.`);
    }
  };
  const tic = () => repartoAutomatico().catch(e => console.error('[puntos] reparto automático fallido:', e.message));
  setTimeout(tic, 90 * 1000);
  setInterval(tic, 60 * 60 * 1000);

  /** GET — la simulación: calcula y enseña, no escribe nada. */
  app.get('/api/admin/tokenomics/reparto', async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.roleLevel < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      }
      const r = await calcularReparto(mesDe(req.query.mes));
      res.json({
        simulacion: true,
        nota: 'Nada se paga con esta llamada: enseña el reparto que tocaría con los números reales del mes. El reloj lo ejecuta solo el día 1 para el mes cerrado; a mano es POST /api/admin/tokenomics/reparto/ejecutar, una vez por mes.',
        automatico: (process.env.PUNTOS_REPARTO_AUTO || 'on').toLowerCase() !== 'off',
        ...r,
        reparto: r.reparto.slice(0, 200),
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * POST /api/admin/tokenomics/reparto/ejecutar  { mes: 'YYYY-MM' }
   * El botón del administrador: adelantar un mes o pagar uno que el reloj no
   * haya podido. Mismo código que el reloj (`ejecutarReparto`), misma
   * garantía. Con el freno de prog6 delante (por cuenta): no por abuso, por
   * el doble clic de alguien con prisa.
   */
  app.post('/api/admin/tokenomics/reparto/ejecutar', guardian(db, REGLAS.transferencia, r => r.user?.id), async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.roleLevel < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      }
      ritmo(db, REGLAS.transferencia, ipDe(req), req.user.id);
      const mes = mesDe(req.body?.mes);
      const r = await ejecutarReparto(mes, req.user.id);
      if (r.estado === 'ya') return res.status(409).json({ error: `El reparto de ${mes} ya se ejecutó (${r.calculo.ya_repartido_puntos} puntos) o se estaba ejecutando en ese mismo instante. No se repite.` });
      if (r.estado === 'nada') return res.status(400).json({ error: `No hay nada que repartir en ${mes}: ninguna persona verificada con al menos ${r.calculo.min_dias_activo} días de uso.` });
      res.json({ ejecutado: true, mes, personas: r.filas.length, puntos_repartidos: r.total, fijo_por_persona: r.calculo.fijo_por_persona, bote_variable: r.calculo.bote_variable, variable_sin_repartir: r.calculo.variable_sin_repartir, reparto: r.filas });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * POST /api/admin/tokenomics/precios  { servicio, nombre, unidad, puntos, nota? }
   * Publicar un precio nuevo. NUNCA edita: inserta una fila con
   * `vigente_desde = now()` y quién la publicó — la historia es de
   * solo-añadir por disparador (0083), igual que el libro.
   */
  app.post('/api/admin/tokenomics/precios', async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.roleLevel < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      }
      const { servicio, nombre, unidad, nota } = req.body || {};
      const puntos = Number(req.body?.puntos);
      if (!servicio || !nombre || !unidad) return res.status(400).json({ error: 'Faltan servicio, nombre o unidad.' });
      if (!Number.isFinite(puntos) || puntos <= 0) return res.status(400).json({ error: 'Indica un precio en puntos mayor que cero.' });
      await db.execute(sql`
        INSERT INTO tokenomics_precios (id, servicio, nombre, unidad, puntos, nota, actor)
        VALUES (${'TP' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase()},
                ${servicio}, ${nombre}, ${unidad}, ${puntos}, ${nota || null}, ${req.user.id})
      `);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * POST /api/puntos/transferir   { para, cantidad }
   *
   * `para` admite el correo o el nombre visible EXACTO de la persona que
   * recibe; el servidor lo resuelve y la respuesta devuelve a quién se envió,
   * para que la interfaz confirme con nombre y apellido y no con un id.
   *
   * TODO EN UNA TRANSACCIÓN: el descuento comprueba el saldo en el mismo
   * UPDATE (`puntos >= cantidad`), y si cualquiera de los cuatro pasos falla
   * (descontar, abonar, dos apuntes del libro), no ocurre ninguno. Una
   * transferencia a medias es dinero creado o destruido.
   */
  // Con freno por cuenta (regla `transferencia` de src/server/limites): diez
  // envíos seguidos gratis, luego espera creciente. Cada envío, salga bien o
  // mal, cuenta para el RITMO — lo que se frena es el bucle, no a la persona —
  // y `ritmo()` solo frena: no escribe en `intentos_fallidos`, que es el
  // rastro de los ataques y no el de las transferencias legítimas (prog6,
  // 2026-08-23, tras ver que `anotarFallo` lo habría enterrado).
  app.post('/api/puntos/transferir', guardian(db, REGLAS.transferencia, r => r.user?.id), async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      ritmo(db, REGLAS.transferencia, ipDe(req), req.user.id);
      if (!transferenciasActivas()) {
        return res.status(403).json({ error: 'Las transferencias de puntos todavía no están activadas. Se anunciará en /tokenomics antes de encenderlas.' });
      }
      // ENVIAR exige cuenta verificada (nivel ≥ 2) desde que la bienvenida es
      // de 5.000 (2026-08-23): si no, crear cuentas sería fabricar puntos y
      // juntarlos en una. Recibir, gastar en la cesta y en el mercado, sí
      // puede cualquiera.
      if (req.user.roleLevel < ROLE.VERIFIED) {
        return res.status(403).json({ error: 'Para enviar puntos hace falta una cuenta verificada. Mientras tanto puedes usarlos en la cesta de servicios y como descuento en el mercado.' });
      }
      const para = String(req.body?.para || '').trim();
      // Céntimos de punto como máximo: la misma precisión que el resto del
      // sistema. Se redondea ANTES de validar para que «10.005» no pase.
      const cantidad = Math.round(Number(req.body?.cantidad) * 100) / 100;
      if (!para) return res.status(400).json({ error: 'Dime a quién: su correo o su nombre visible exacto.' });
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        return res.status(400).json({ error: 'Indica una cantidad mayor que cero.' });
      }

      const destino = await db.execute(sql`
        SELECT id, coalesce(display_name, name, email) AS nombre FROM users
        WHERE archived_at IS NULL AND (lower(email) = lower(${para}) OR display_name = ${para})
        ORDER BY (lower(email) = lower(${para})) DESC
        LIMIT 2
      `);
      if (!destino.rows.length) return res.status(404).json({ error: 'No encuentro a nadie con ese correo o ese nombre.' });
      // Dos personas con el mismo nombre visible: no se elige por ellas.
      if (destino.rows.length > 1) return res.status(400).json({ error: 'Hay más de una persona con ese nombre. Usa su correo.' });
      const receptor = destino.rows[0] as { id: string; nombre: string };
      if (receptor.id === req.user.id) return res.status(400).json({ error: 'No puedes enviarte puntos a ti.' });

      const emisorId = req.user.id;
      await db.transaction(async (tx: any) => {
        // LAS DOS FILAS SE CIERRAN EN ORDEN DE ID, siempre. Si A→B y B→A
        // llegan a la vez y cada una cierra primero su propia fila, Postgres
        // mata una por interbloqueo (40P01) y alguien ve un 500. Cerrando
        // ambas de una vez en el mismo orden, la segunda transacción espera
        // en la primera fila y no hay abrazo mortal (revisión de prog4).
        await tx.execute(sql`
          SELECT id FROM users WHERE id IN (${emisorId}, ${receptor.id}) ORDER BY id FOR UPDATE
        `);

        const cobro = await tx.execute(sql`
          UPDATE users SET puntos = puntos - ${cantidad}
          WHERE id = ${emisorId} AND puntos >= ${cantidad}
          RETURNING puntos
        `);
        if (!cobro.rows.length) {
          // Lanzar dentro de la transacción la revierte entera.
          throw Object.assign(new Error('SALDO'), { esSaldo: true });
        }

        // EL TOPE DIARIO SE CUENTA AQUÍ DENTRO, con la fila del emisor ya
        // cerrada. Fuera de la transacción, dos peticiones a la vez leían el
        // mismo «hoy llevas X» y pasaban las dos — el tope se saltaba con dos
        // pestañas (revisión de prog4). Con el cierre, los envíos del mismo
        // emisor se serializan solos y la cuenta sale bien. Contra el libro,
        // no contra un contador aparte que pudiera contradecirlo.
        const enviadoHoy = await tx.execute(sql`
          SELECT coalesce(-sum(cantidad), 0)::float AS total FROM movimientos_puntos
          WHERE user_id = ${emisorId} AND motivo = 'transferencia_enviada' AND created_at > now() - interval '24 hours'
        `);
        const total = Number((enviadoHoy.rows[0] as any)?.total ?? 0);
        if (total + cantidad > topeDiario()) {
          throw Object.assign(new Error('TOPE'), { esTope: true, llevas: total });
        }

        await tx.execute(sql`UPDATE users SET puntos = puntos + ${cantidad} WHERE id = ${receptor.id}`);
        await tx.execute(sql`
          INSERT INTO movimientos_puntos (id, user_id, cantidad, motivo, entidad_tipo, entidad_id)
          VALUES (${newId()}, ${emisorId}, ${-cantidad}, 'transferencia_enviada', 'user', ${receptor.id})
        `);
        await tx.execute(sql`
          INSERT INTO movimientos_puntos (id, user_id, cantidad, motivo, entidad_tipo, entidad_id)
          VALUES (${newId()}, ${receptor.id}, ${cantidad}, 'transferencia_recibida', 'user', ${emisorId})
        `);
      });

      const saldo = await db.execute(sql`SELECT puntos FROM users WHERE id = ${emisorId}`);
      res.json({ success: true, enviado_a: receptor.nombre, cantidad, puntos: Number((saldo.rows[0] as any)?.puntos ?? 0) });
    } catch (e: any) {
      if (e?.esSaldo) return res.status(400).json({ error: 'No tienes saldo suficiente para esa cantidad.' });
      if (e?.esTope) return res.status(400).json({ error: `Durante el piloto se pueden enviar como mucho ${topeDiario()} puntos al día; hoy llevas ${Number(e.llevas).toFixed(2)}.` });
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/puntos/saldo — tu saldo y tus últimos movimientos. */
  app.get('/api/puntos/saldo', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const saldo = await db.execute(sql`SELECT puntos FROM users WHERE id = ${req.user.id}`);
      const movimientos = await db.execute(sql`
        SELECT id, cantidad, motivo, entidad_tipo, entidad_id, created_at
        FROM movimientos_puntos WHERE user_id = ${req.user.id}
        ORDER BY created_at DESC LIMIT 20
      `);
      res.json({ puntos: Number((saldo.rows[0] as any)?.puntos ?? 0), movimientos: movimientos.rows });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * POST /api/admin/users/:id/puntos   { cantidad }
   * Un administrador regala o retira puntos a mano (motivo `ajuste_admin`).
   * Positivo suma, negativo resta; con decimales, igual que el resto del
   * sistema. Pasa por `otorgarPuntos` como todo lo demás: saldo y libro de
   * movimientos siempre juntos.
   */
  app.post('/api/admin/users/:id/puntos', async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.roleLevel < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      }
      const cantidad = Number(req.body?.cantidad);
      if (!Number.isFinite(cantidad) || cantidad === 0) {
        return res.status(400).json({ error: 'Indica una cantidad distinta de cero (positiva para dar, negativa para quitar).' });
      }
      const existe = await db.execute(sql`SELECT id FROM users WHERE id = ${req.params.id} AND archived_at IS NULL`);
      if (!existe.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado.' });
      await otorgarPuntos(db, req.params.id, cantidad, 'ajuste_admin');
      const saldo = await db.execute(sql`SELECT puntos FROM users WHERE id = ${req.params.id}`);
      res.json({ success: true, puntos: Number((saldo.rows[0] as any)?.puntos ?? 0) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
