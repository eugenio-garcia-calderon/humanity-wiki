import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ROLE } from './auth.js';

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

/**
 * Solo el justificante del regalo de bienvenida — el saldo de 100 ya lo puso
 * el DEFAULT de `users.puntos` al crear la fila (migración 0026), así que
 * esto NO toca el saldo: si lo hiciera, lo duplicaría. Se llama una vez,
 * justo después de dar de alta a cada usuario nuevo.
 */
export async function registrarRegaloBienvenida(db: any, userId: string) {
  await db.execute(sql`
    INSERT INTO movimientos_puntos (id, user_id, cantidad, motivo)
    VALUES (${newId()}, ${userId}, 100, 'regalo_bienvenida')
    ON CONFLICT DO NOTHING
  `);
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
      res.json({ vigentes: vigentes.rows, historia: historia.rows });
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
   * POST /api/admin/tokenomics/precios  { servicio, nombre, unidad, puntos, nota? }
   * Publicar un precio nuevo. NUNCA edita: inserta una fila con
   * `vigente_desde = now()` y quién la publicó — la historia es de
   * solo-añadir por disparador (0077), igual que el libro.
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
  app.post('/api/puntos/transferir', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      if (!transferenciasActivas()) {
        return res.status(403).json({ error: 'Las transferencias de puntos todavía no están activadas. Se anunciará en /tokenomics antes de encenderlas.' });
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
