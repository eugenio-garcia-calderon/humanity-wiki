import type { Express, Request, Response } from 'express';
import type Stripe from 'stripe';
import crypto from 'node:crypto';
import { sql } from 'drizzle-orm';
import { getStripe } from './stripe.js';
import { avisar } from './avisos.js';
import { enviarCorreo, hayCorreo } from './correo.js';
import { guardian, ritmo, ipDe, type Regla } from './limites/index.js';
import {
  sitioDeSoporte, esEquipo, clienteActual, clienteParaEscribir, dejarCookie, escribir, origenDe,
} from './soporte.js';
import { huecosLibres, limpiarDisponibilidad, zonaValida, reparto } from './expertosAgenda.js';
import { registrarHtml, esc, enLinea } from './htmlBloques.js';
import { sitioDePagina } from './sitios.js';

// ============================================================================
// CONSULTAS DE PAGO CON UN EXPERTO (2026-10-18, W6 de Wikiproducts)
// ============================================================================
// Eugenio: «se puede contratar una consultoría de compra con un especialista
// para decisiones más relevantes, como qué coche me compro o qué sistema de
// calefacción me instalo… les pagas también a través de la página web».
//
// El bloque «Reservar experto» enseña los expertos de un sitio. Quien visita
// elige uno, un hueco de su agenda y paga; al pagar se le abre una
// conversación con el experto (el chat de `soporte.ts`) donde está la fecha, el
// enlace de la videollamada si el experto lo ha dado, y donde se hablan.
//
// ── EL DINERO, QUE ES LO QUE NO PUEDE SALIR MAL ─────────────────────────────
//  · El precio y la comisión los lee el SERVIDOR de la fila del experto en el
//    momento de reservar y se guardan en la consulta. El navegador sólo dice
//    qué experto y qué hueco.
//  · El hueco tiene que ser uno de los que este mismo servidor calcula como
//    libres: no se puede reservar a las 3 de la madrugada de un domingo
//    escribiendo la fecha a mano.
//  · Dos personas no se quedan el mismo hueco: lo impide un índice único de
//    la base de datos, no una comprobación previa que dos peticiones pueden
//    pasar a la vez.
//  · 'reservando' retiene el hueco media hora (lo que dura el pago). Si el
//    pago llega tarde y el hueco ya es de otro, se devuelve el dinero solo.
//  · Se confirma de dos maneras y las dos llaman a la misma función, que es
//    idempotente: el aviso firmado de Stripe (`stripe.ts`, `metadata.kind =
//    'consulta_experto'`) y la vuelta del navegador, que pregunta a Stripe
//    por la sesión. Nunca se cree al navegador que «ha pagado».
//
// ── A QUIÉN LE LLEGA EL DINERO ──────────────────────────────────────────────
//  · Si el experto tiene cuenta con Stripe Connect activa: cobro 'directo'.
//    Stripe le pasa su parte en el acto y la comisión del sitio se queda como
//    `application_fee`.
//  · Si no: cobro 'plataforma'. El pago entra en la cuenta de la plataforma
//    y la consulta apunta lo que se le debe al experto (`neto_experto_centimos`)
//    hasta que el equipo apunte la transferencia. Una deuda se apunta en el
//    momento del cobro, no cuando alguien se acuerda (regla de `liquidaciones.ts`).
//  · Limitación conocida: la comisión (`application_fee`) la recibe la cuenta
//    de la plataforma, no la del dueño del sitio. Para Wikiproducts es la misma
//    persona; para sitios de otros creadores hay que repartirla. Anotado en
//    la deuda técnica.
//
// MODO REAL: Eugenio decidió el 2026-10-18 usar ya el Stripe definitivo, no el
// de pruebas. Nada aquí distingue pruebas de real: lo decide la clave
// `STRIPE_SECRET_KEY` del servidor. Con clave real, cada reserva cobra dinero
// de verdad. El webhook debe recibir `checkout.session.completed` (ya lo usa la
// membresía); `checkout.session.expired` es opcional: sin él, el hueco retenido
// se suelta igual al pasar `expira_at` (`soltarCaducadas`).

const nuevoId = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;
const MINUTOS_PARA_PAGAR = 30;

/** Con una clave de PRUEBAS de Stripe, una tarjeta de verdad se rechaza al
 *  pagar (2026-10-18: producción abrió con `sk_test`). A un visitante no se le
 *  lleva a un pago que va a fallar; el equipo del sitio sí puede probarlo con
 *  la tarjeta 4242. Lo mismo que hace la cesta (`/api/publicar/cobro`, W5). */
const pagosEnPruebas = () => (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_test');
const MONEDAS = ['EUR', 'USD', 'GBP'];

/** Reservar: cinco seguidas gratis por IP y cuenta, después 30 s, 60… hasta
 *  un cuarto de hora. Cada reserva retiene un hueco media hora: sin freno, un
 *  bucle vaciaría la agenda de un experto sin pagar nada. */
const REGLA_RESERVAR: Regla = { puerta: 'experto_reservar', gracia: 5, baseSegundos: 30, topeSegundos: 900, alFallar: 'cerrar' };

/** ¿Ha chocado con el índice único del hueco? Drizzle envuelve el error de
 *  Postgres: el nombre de la restricción viene en `cause`, no en `message`
 *  (lo cazó la prueba del pago tardío; con sólo `message` el choque salía
 *  como un 500 en vez de como «ese hueco ya está ocupado»). */
const huecoOcupado = (e: any) =>
  [e, e?.cause].some(x => x?.constraint === 'consultas_hueco_unico'
    || (x?.code === '23505' && /consultas_hueco_unico/.test(String(x?.message || x?.detail || '')))
    || /consultas_hueco_unico/.test(String(x?.message || '')));

const euros = (c: number, moneda = 'EUR') =>
  (c / 100).toLocaleString('es-ES', { style: 'currency', currency: moneda });
const fechaLarga = (iso: string | Date, zona: string) =>
  new Date(iso).toLocaleString('es-ES', { timeZone: zona, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

/** Lo que se enseña de un experto a cualquiera. Nunca su cuenta ni su correo. */
const publico = (e: any) => ({
  id: e.id, nombre: e.nombre, especialidad: e.especialidad || null, bio: e.bio || null, foto: e.foto_url || null,
  precioCentimos: e.precio_centimos, moneda: e.moneda, duracionMin: e.duracion_min,
  comisionBps: e.comision_bps, zonaHoraria: e.zona_horaria,
});

/** Las consultas 'reservando' cuyo plazo pasó dejan de retener el hueco. */
async function soltarCaducadas(db: any, expertoId?: string) {
  await db.execute(sql`
    UPDATE consultas_experto SET estado = 'caducada', updated_at = now()
    WHERE estado = 'reservando' AND expira_at < now()
      ${expertoId ? sql`AND experto_id = ${expertoId}` : sql``}
  `);
}

async function huecosDe(db: any, e: any, ahoraMs = Date.now()) {
  await soltarCaducadas(db, e.id);
  const ocupadas = await db.execute(sql`
    SELECT inicio FROM consultas_experto
    WHERE experto_id = ${e.id} AND estado IN ('reservando', 'pagada', 'hecha') AND inicio > now()
  `);
  const ocupados = new Set<number>((ocupadas.rows as any[]).map(r => new Date(r.inicio).getTime()));
  return huecosLibres({
    franjas: limpiarDisponibilidad(e.disponibilidad).franjas,
    duracionMin: e.duracion_min, antelacionHoras: e.antelacion_horas, zona: e.zona_horaria,
    ocupados, ahoraMs,
  });
}

/**
 * EL PAGO HA LLEGADO: la consulta pasa a 'pagada' y se abre la conversación.
 * Idempotente: el aviso de Stripe y la vuelta del navegador pueden llegar los
 * dos, en cualquier orden, y sólo el primero hace algo.
 */
export async function confirmarConsulta(db: any, consultaId: string, pago: { paymentIntent: string | null; sesion: string | null }) {
  const c = (await db.execute(sql`SELECT * FROM consultas_experto WHERE id = ${consultaId}`)).rows[0] as any;
  if (!c) return { estado: 'desconocida' as const };
  if (['pagada', 'hecha'].includes(c.estado)) return { estado: c.estado };
  if (c.estado === 'cancelada') return { estado: c.estado };

  try {
    // 'reservando' o 'caducada': si caducó y nadie cogió el hueco, sigue
    // siendo suyo. Si alguien lo cogió, el índice único lo dice aquí.
    await db.execute(sql`
      UPDATE consultas_experto SET estado = 'pagada', pagada_at = now(), updated_at = now(),
        stripe_payment_intent = COALESCE(${pago.paymentIntent}, stripe_payment_intent)
      WHERE id = ${consultaId} AND estado IN ('reservando', 'caducada')
    `);
  } catch (e: any) {
    if (!huecoOcupado(e)) throw e;
    // PAGÓ TARDE Y EL HUECO YA ES DE OTRO. Se le devuelve todo, se apunta y
    // se le explica en su conversación. Cobrar por algo que no se puede dar
    // no es una opción.
    let reembolso = false;
    if (pago.paymentIntent) {
      try {
        await getStripe().refunds.create({
          payment_intent: pago.paymentIntent,
          ...(c.cobro === 'directo' ? { reverse_transfer: true, refund_application_fee: true } : {}),
        });
        reembolso = true;
      } catch (err: any) { console.error('[expertos] reembolso por hueco ocupado:', err?.message || err); }
    }
    await db.execute(sql`
      UPDATE consultas_experto SET estado = 'cancelada', updated_at = now(),
        reembolsada_at = ${reembolso ? sql`now()` : sql`NULL`},
        stripe_payment_intent = COALESCE(${pago.paymentIntent}, stripe_payment_intent)
      WHERE id = ${consultaId}
    `);
    const conv = c.conversacion_id ? (await db.execute(sql`SELECT * FROM soporte_conversaciones WHERE id = ${c.conversacion_id}`)).rows[0] as any : null;
    if (conv) {
      await db.execute(sql`UPDATE soporte_conversaciones SET archived_at = NULL WHERE id = ${conv.id}`);
      await escribir(db, {
        conv, de: 'sistema', autor: null,
        texto: reembolso
          ? 'El pago llegó cuando ese hueco ya estaba ocupado por otra persona. Te hemos devuelto el importe completo; elige otro hueco cuando quieras.'
          : 'El pago llegó cuando ese hueco ya estaba ocupado. No hemos podido devolverlo automáticamente: el equipo lo revisará y te lo devolverá.',
      });
    }
    return { estado: 'cancelada' as const, reembolso };
  }

  const e = (await db.execute(sql`SELECT * FROM expertos WHERE id = ${c.experto_id}`)).rows[0] as any;
  const sitio = (await db.execute(sql`SELECT title, creator_user_id FROM knowledge_windows WHERE id = ${c.raiz_id}`)).rows[0] as any;
  const conv = c.conversacion_id ? (await db.execute(sql`SELECT * FROM soporte_conversaciones WHERE id = ${c.conversacion_id}`)).rows[0] as any : null;
  const cuando = fechaLarga(c.inicio, e?.zona_horaria || 'Europe/Madrid');
  if (conv) {
    await db.execute(sql`UPDATE soporte_conversaciones SET archived_at = NULL, estado = 'abierta', updated_at = now() WHERE id = ${conv.id}`);
    const lineas = [
      `Consulta reservada con ${e?.nombre || 'el experto'}: ${cuando} (hora de ${e?.zona_horaria || 'Madrid'}), ${e?.duracion_min || ''} minutos.`,
      c.importe_centimos > 0 ? `Pagado: ${euros(c.importe_centimos, c.moneda)}.` : 'Consulta sin coste.',
      e?.enlace_reunion ? `Enlace de la videollamada: ${e.enlace_reunion}` : 'El experto te escribirá aquí cómo os conectáis.',
      c.tema ? `Lo que quieres consultar: «${c.tema}»` : '',
    ].filter(Boolean);
    await escribir(db, { conv: { ...conv, sin_leer_cliente: 0 }, de: 'sistema', autor: null, texto: lineas.join('\n'), nombreSitio: sitio?.title });
  }
  // QUIEN ATIENDE SE ENTERA. El experto si tiene cuenta; el dueño del sitio
  // siempre, porque es quien responde del cobro.
  const destino = conv?.pagina_id ? `/paginas/${conv.pagina_id}?soporte=${conv.id}` : null;
  for (const para of new Set([e?.user_id, sitio?.creator_user_id].filter(Boolean))) {
    await avisar(db, {
      paraQuien: para as string, dePartede: c.cliente_user_id || null, tipo: 'consulta_reservada',
      entidadTipo: 'soporte', entidadId: conv?.id || c.id,
      datos: { texto: `${c.cliente_nombre || c.cliente_email || 'Alguien'} · ${cuando}`, destino },
    });
  }
  if (c.cliente_email && hayCorreo()) {
    await enviarCorreo({
      para: c.cliente_email,
      asunto: `Consulta reservada con ${e?.nombre || 'el experto'}`,
      texto: `Tu consulta es el ${cuando} (hora de ${e?.zona_horaria || 'Madrid'}).\n`
        + (e?.enlace_reunion ? `Enlace de la videollamada: ${e.enlace_reunion}\n` : 'El experto te escribirá en el chat del sitio cómo os conectáis.\n')
        + `\nPuedes escribirle desde la página donde reservaste.`,
    }).catch((err: any) => console.error('[expertos] correo de reserva:', err?.message || err));
  }
  return { estado: 'pagada' as const };
}

/** Para `stripe.ts`: el aviso firmado de una sesión de consulta pagada. */
export async function consultaPagadaPorStripe(db: any, session: Stripe.Checkout.Session) {
  const id = session.metadata?.consulta_id;
  if (!id || session.payment_status !== 'paid') return;
  await confirmarConsulta(db, id, { paymentIntent: (session.payment_intent as string) || null, sesion: session.id });
}

/** Para `stripe.ts`: la sesión murió sin pagar, el hueco se suelta en el acto. */
export async function consultaCaducadaPorStripe(db: any, session: Stripe.Checkout.Session) {
  await db.execute(sql`
    UPDATE consultas_experto SET estado = 'caducada', updated_at = now()
    WHERE stripe_session_id = ${session.id} AND estado = 'reservando'
  `);
}

// ── EL BLOQUE EN EL HTML DEL SERVIDOR (requisito R1 del plan de SEO) ─────────
// Lo que un buscador puede leer del bloque «Reservar experto»: quién es cada
// experto, de qué sabe, cuánto dura y cuánto cuesta la consulta. Lo mismo que
// enseña la ficha al leerla, nunca más (nada de cuentas ni correos: `publico`).
// La agenda no se escribe: cambia cada minuto y la pinta React al llegar.
const fmtPrecio = (c: number, moneda: string) => {
  try { return (c / 100).toLocaleString('es-ES', { style: 'currency', currency: moneda || 'EUR' }); }
  catch { return `${(c / 100).toFixed(2)} ${moneda || ''}`.trim(); }
};

function registrarHtmlExpertos() {
  registrarHtml('experto', (b, ctx) => {
    const d = b?.datos || {};
    const todos: ReturnType<typeof publico>[] = ctx.extra.get('expertos') || [];
    const ids: string[] = Array.isArray(d.expertos) ? d.expertos.map(String) : [];
    const lista = ids.length ? todos.filter(e => ids.includes(e.id)) : todos;
    // La versión corta (la de la ficha de un producto) lleva su propio título
    // por defecto y no sale si no hay expertos, como en el navegador.
    const tituloTexto = d.titulo || (d.compacto ? '¿Dudas antes de comprar? Consulta a un experto' : 'Pide consejo a un experto');
    const titulo = `<h2>${esc(tituloTexto)}</h2>`;
    const intro = d.intro ? `<p>${enLinea(String(d.intro), ctx)}</p>` : '';
    const enlaceTodos = d.compacto && typeof d.pagina === 'string' && d.pagina
      ? `<p><a href="${esc(ctx.enlacePagina(d.pagina))}">Quiénes son y cómo funcionan las consultas</a></p>` : '';
    if (!lista.length) return d.compacto ? '' : `<section>${titulo}${intro}</section>`;
    const fichas = lista.map(e => {
      const precio = e.precioCentimos > 0 ? fmtPrecio(e.precioCentimos, e.moneda) : 'Gratis';
      return `<li><h3>${esc(e.nombre)}</h3>`
        + (e.especialidad ? `<p>${esc(e.especialidad)}</p>` : '')
        // La versión corta no enseña la bio en el navegador: aquí tampoco.
        + (e.bio && !d.compacto ? `<p>${enLinea(e.bio, ctx)}</p>` : '')
        + `<p>${esc(e.duracionMin)} min · ${esc(precio)}</p></li>`;
    }).join('');
    return `<section>${titulo}${intro}<ul>${fichas}</ul>${enlaceTodos}</section>`;
  }, async (db, bloques, ctx) => {
    if (!bloques.some(b => b?.tipo === 'experto') || !ctx.pagina?.id) return;
    const raiz = (await sitioDePagina(db, String(ctx.pagina.id)))?.raizId || String(ctx.pagina.id);
    const r = await db.execute(sql`
      SELECT * FROM expertos WHERE raiz_id = ${raiz} AND archived_at IS NULL AND activo
      ORDER BY orden, created_at LIMIT 50
    `);
    ctx.extra.set('expertos', (r.rows as any[]).map(publico));
  });
}

/** Valida y normaliza los campos editables de un experto. */
async function camposExperto(db: any, cuerpo: any, soloPropios: boolean): Promise<{ out: Record<string, any> } | { error: string }> {
  const out: Record<string, any> = {};
  const err = (m: string) => ({ error: m });
  if (!soloPropios) {
    if ('nombre' in cuerpo) {
      const n = String(cuerpo.nombre || '').trim();
      if (!n || n.length > 120) return err('El nombre es obligatorio (120 caracteres como mucho).');
      out.nombre = n;
    }
    if ('especialidad' in cuerpo) out.especialidad = String(cuerpo.especialidad || '').trim().slice(0, 200) || null;
    if ('precioCentimos' in cuerpo) {
      const p = Number(cuerpo.precioCentimos);
      if (!Number.isInteger(p) || p < 0 || p > 10000000) return err('El precio no es válido.');
      if (p > 0 && p < 100) return err('El precio mínimo es 1 € (o 0 para una consulta gratuita).');
      out.precio_centimos = p;
    }
    if ('moneda' in cuerpo) {
      const m = String(cuerpo.moneda || 'EUR').toUpperCase();
      if (!MONEDAS.includes(m)) return err(`La moneda es una de: ${MONEDAS.join(', ')}.`);
      out.moneda = m;
    }
    if ('duracionMin' in cuerpo) {
      const d = Number(cuerpo.duracionMin);
      if (!Number.isInteger(d) || d < 15 || d > 240) return err('La duración va de 15 a 240 minutos.');
      out.duracion_min = d;
    }
    if ('comisionBps' in cuerpo) {
      const b = Number(cuerpo.comisionBps);
      if (!Number.isInteger(b) || b < 0 || b > 5000) return err('La comisión va del 0 % al 50 %.');
      out.comision_bps = b;
    }
    if ('activo' in cuerpo) out.activo = !!cuerpo.activo;
    if ('orden' in cuerpo) out.orden = Math.max(0, Math.min(10000, Math.round(Number(cuerpo.orden) || 0)));
    if ('cuentaEmail' in cuerpo) {
      const correo = String(cuerpo.cuentaEmail || '').trim().toLowerCase();
      if (!correo) out.user_id = null;
      else {
        const u = (await db.execute(sql`
          SELECT id FROM users WHERE lower(email) = ${correo} AND archived_at IS NULL AND deleted_at IS NULL
        `)).rows[0] as any;
        if (!u) return err('No hay ninguna cuenta con ese correo. Que el experto se registre primero y vuelve a intentarlo.');
        out.user_id = u.id;
      }
    }
  }
  if ('bio' in cuerpo) out.bio = String(cuerpo.bio || '').trim().slice(0, 3000) || null;
  if ('foto' in cuerpo) {
    const f = String(cuerpo.foto || '').trim();
    if (f && !/^(https:\/\/|\/uploads\/)/.test(f)) return err('La foto tiene que ser una dirección https o una imagen subida.');
    out.foto_url = f || null;
  }
  if ('zonaHoraria' in cuerpo) {
    if (!zonaValida(cuerpo.zonaHoraria)) return err('Esa zona horaria no existe (p. ej. Europe/Madrid).');
    out.zona_horaria = cuerpo.zonaHoraria;
  }
  if ('disponibilidad' in cuerpo) {
    const { franjas, descartadas } = limpiarDisponibilidad(cuerpo.disponibilidad);
    if (descartadas) return err(`${descartadas} franja(s) de la agenda no son válidas: cada una necesita día, hora de inicio y de fin (HH:MM), y el fin después del inicio.`);
    out.disponibilidad = JSON.stringify(franjas);
  }
  if ('antelacionHoras' in cuerpo) {
    const h = Number(cuerpo.antelacionHoras);
    if (!Number.isInteger(h) || h < 0 || h > 720) return err('La antelación va de 0 a 720 horas.');
    out.antelacion_horas = h;
  }
  if ('enlaceReunion' in cuerpo) {
    const l = String(cuerpo.enlaceReunion || '').trim();
    if (l && !/^https:\/\//.test(l)) return err('El enlace de la videollamada tiene que empezar por https://');
    out.enlace_reunion = l.slice(0, 500) || null;
  }
  return { out };
}

/**
 * PUT /api/v1/pages/:id/experts (montada en `apiPublica.ts`, detrás de su
 * puerta de claves). Da de alta o pone al día los expertos del sitio de esa
 * página, por nombre: el script que monta un sitio (`scripts/wikiproducts/
 * expertos.mjs`) lo puede repetir sin duplicar a nadie. Quien llama tiene que
 * ser del equipo del sitio, igual que en el panel. Nunca archiva: un experto
 * que ya no viene en la lista se queda como está (quitarlo es del panel). Con
 * `only_new: true` sólo da de alta a los que faltan y no toca a los demás.
 */
export async function expertosPorApi(db: any, req: Request, paginaId: string, cuerpo: any): Promise<{ codigo: number; cuerpo: any }> {
  const lista = Array.isArray(cuerpo?.experts) ? cuerpo.experts : null;
  if (!lista || !lista.length || lista.length > 20) return { codigo: 400, cuerpo: { error: 'Manda «experts»: una lista de 1 a 20 expertos.' } };
  const s = await sitioDeSoporte(db, req, paginaId);
  if (!s || !(await esEquipo(db, req, s.raiz))) return { codigo: 403, cuerpo: { error: 'Sólo el equipo del sitio da de alta expertos.' } };
  // Nombres en inglés en la API, como el resto de /api/v1.
  const traducir = (x: any) => {
    const o: Record<string, any> = {};
    const mapa: Record<string, string> = {
      name: 'nombre', specialty: 'especialidad', bio: 'bio', photo: 'foto', price_cents: 'precioCentimos',
      currency: 'moneda', duration_min: 'duracionMin', commission_bps: 'comisionBps', timezone: 'zonaHoraria',
      availability: 'disponibilidad', notice_hours: 'antelacionHoras', meeting_url: 'enlaceReunion',
      active: 'activo', order: 'orden', account_email: 'cuentaEmail',
    };
    for (const [k, v] of Object.entries(x || {})) if (mapa[k]) o[mapa[k]] = v;
    return o;
  };
  // Todo o nada: una lista a medias dejaría el sitio distinto de su fichero.
  const validos: Record<string, any>[] = [];
  for (const [i, x] of lista.entries()) {
    const v = await camposExperto(db, traducir(x), false);
    if ('error' in v) return { codigo: 400, cuerpo: { error: `Experto ${i + 1}: ${v.error}` } };
    if (!v.out.nombre) return { codigo: 400, cuerpo: { error: `Experto ${i + 1}: falta «name».` } };
    validos.push(v.out);
  }
  const hechos = [];
  for (const f of validos) {
    const ya = (await db.execute(sql`
      SELECT id FROM expertos WHERE raiz_id = ${s.raiz} AND lower(nombre) = lower(${f.nombre}) AND archived_at IS NULL
      ORDER BY created_at LIMIT 1
    `)).rows[0] as any;
    // `only_new`: el script de montar el sitio no pisa lo que el equipo
    // cambió luego en el panel (el precio, la agenda…).
    if (ya && cuerpo?.only_new) { hechos.push({ id: ya.id, name: f.nombre, created: false, untouched: true }); continue; }
    if (ya) {
      const sets = Object.keys(f).map(k => k === 'disponibilidad'
        ? sql`disponibilidad = ${f[k]}::jsonb`
        : sql`${sql.raw(k)} = ${f[k]}`);
      await db.execute(sql`UPDATE expertos SET ${sql.join(sets, sql`, `)}, updated_at = now() WHERE id = ${ya.id}`);
      hechos.push({ id: ya.id, name: f.nombre, created: false });
    } else {
      const id = nuevoId('EXP');
      await db.execute(sql`
        INSERT INTO expertos (id, raiz_id, user_id, nombre, especialidad, bio, foto_url, precio_centimos, moneda,
                              duracion_min, comision_bps, zona_horaria, disponibilidad, antelacion_horas,
                              enlace_reunion, activo, orden, created_by)
        VALUES (${id}, ${s.raiz}, ${f.user_id ?? null}, ${f.nombre}, ${f.especialidad ?? null}, ${f.bio ?? null},
                ${f.foto_url ?? null}, ${f.precio_centimos ?? 0}, ${f.moneda ?? 'EUR'}, ${f.duracion_min ?? 45},
                ${f.comision_bps ?? 0}, ${f.zona_horaria ?? 'Europe/Madrid'}, ${f.disponibilidad ?? '[]'}::jsonb,
                ${f.antelacion_horas ?? 24}, ${f.enlace_reunion ?? null}, ${f.activo ?? true}, ${f.orden ?? 0},
                ${req.user!.id})
      `);
      hechos.push({ id, name: f.nombre, created: true });
    }
  }
  return { codigo: 200, cuerpo: { site: s.raiz, experts: hechos } };
}

export function registrarExpertos(app: Express, db: any) {
  registrarHtmlExpertos();
  /** El experto de esta ruta, si existe y es de un sitio que quien llama puede ver. */
  const expertoVisible = async (req: Request, id: string) => {
    const e = (await db.execute(sql`SELECT * FROM expertos WHERE id = ${id} AND archived_at IS NULL`)).rows[0] as any;
    if (!e) return null;
    const s = await sitioDeSoporte(db, req, e.raiz_id);
    return s ? { e, s } : null;
  };

  /** ¿Puede quien llama tocar esta consulta? Equipo del sitio o el experto. */
  const atiendeConsulta = async (req: Request, c: any) => {
    if (await esEquipo(db, req, c.raiz_id)) return 'equipo';
    const e = (await db.execute(sql`SELECT user_id FROM expertos WHERE id = ${c.experto_id}`)).rows[0] as any;
    return req.user && e?.user_id === req.user.id ? 'experto' : null;
  };

  // ════ LO QUE VE CUALQUIERA ════════════════════════════════════════════════

  /** GET /api/expertos/sitio/:pagina — los expertos activos del sitio, con su
   *  próximo hueco libre. `?ids=a,b` limita a los que el bloque eligió. */
  app.get('/api/expertos/sitio/:pagina', async (req: Request, res: Response) => {
    try {
      const s = await sitioDeSoporte(db, req, String(req.params.pagina));
      if (!s) return res.status(404).json({ error: 'Esta página no existe o no es pública.' });
      const ids = String(req.query.ids || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 50);
      const r = await db.execute(sql`
        SELECT * FROM expertos
        WHERE raiz_id = ${s.raiz} AND archived_at IS NULL AND activo
          ${ids.length ? sql`AND id IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)})` : sql``}
        ORDER BY orden, created_at
      `);
      const expertos = [];
      for (const e of r.rows as any[]) {
        const h = await huecosDe(db, e);
        expertos.push({ ...publico(e), proximo: h[0]?.inicio || null, huecosLibres: h.length });
      }
      const equipo = await esEquipo(db, req, s.raiz);
      // ¿Es quien mira uno de los expertos? Entonces el bloque le ofrece su panel.
      const soyExperto = !!req.user && (await db.execute(sql`
        SELECT 1 FROM expertos WHERE raiz_id = ${s.raiz} AND user_id = ${req.user.id} AND archived_at IS NULL
      `)).rows.length > 0;
      res.set('Cache-Control', 'private, no-store');
      res.json({ raiz: s.raiz, sitio: s.nombre, equipo, soyExperto, pagosActivos: !!process.env.STRIPE_SECRET_KEY, pagosEnPruebas: pagosEnPruebas(), expertos });
    } catch (e: any) {
      console.error('expertos sitio:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/expertos/:id/huecos — los huecos libres de las próximas tres semanas. */
  app.get('/api/expertos/:id/huecos', async (req: Request, res: Response) => {
    try {
      const v = await expertoVisible(req, String(req.params.id));
      if (!v || !v.e.activo) return res.status(404).json({ error: 'Ese experto no existe.' });
      res.set('Cache-Control', 'private, no-store');
      res.json({ experto: publico(v.e), huecos: await huecosDe(db, v.e) });
    } catch (e: any) {
      console.error('expertos huecos:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/expertos/:id/reservar { inicio, tema?, nombre?, email?, pagina, volver? }
   * Retiene el hueco y devuelve la dirección del pago (o la confirma, si es gratis).
   */
  app.post('/api/expertos/:id/reservar', guardian(db, REGLA_RESERVAR, r => r.user?.id), async (req: Request, res: Response) => {
    try {
      const v = await expertoVisible(req, String(req.params.id));
      if (!v || !v.e.activo) return res.status(404).json({ error: 'Ese experto no existe.' });
      const { e } = v;
      // La página desde la que se reserva: tiene que ser del mismo sitio,
      // porque es donde vivirá la conversación y adonde se vuelve al pagar.
      const paginaId = String(req.body?.pagina || e.raiz_id);
      const s = await sitioDeSoporte(db, req, paginaId);
      if (!s || s.raiz !== e.raiz_id) return res.status(400).json({ error: 'Esa página no es de este sitio.' });

      const inicio = new Date(String(req.body?.inicio || ''));
      if (Number.isNaN(inicio.getTime())) return res.status(400).json({ error: 'Elige un hueco de la agenda.' });
      const hueco = (await huecosDe(db, e)).find(h => new Date(h.inicio).getTime() === inicio.getTime());
      if (!hueco) return res.status(409).json({ error: 'Ese hueco ya no está libre. Elige otro.' });

      const c = await clienteParaEscribir(db, req, e.raiz_id);
      if (c.userId && c.userId === e.user_id) return res.status(400).json({ error: 'No puedes reservar una consulta contigo.' });
      const email = String(req.body?.email || c.email || '').trim().toLowerCase().slice(0, 200);
      if (!EMAIL.test(email)) return res.status(400).json({ error: 'Necesitamos tu correo para mandarte la confirmación.' });
      const nombre = String(req.body?.nombre || c.nombre || '').trim().slice(0, 80) || null;
      const tema = String(req.body?.tema || '').trim().slice(0, 1000) || null;

      const importe = Number(e.precio_centimos) || 0;
      if (importe > 0 && !process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({ error: 'Los pagos no están activados en este servidor todavía (falta la clave de Stripe).' });
      }
      if (importe > 0 && pagosEnPruebas() && !(await esEquipo(db, req, e.raiz_id))) {
        return res.status(503).json({ error: 'Muy pronto podrás reservar y pagar aquí. Todavía no se pueden pagar consultas.' });
      }
      void ritmo(db, REGLA_RESERVAR, ipDe(req), c.userId);

      // ¿Cobra el experto directamente? Sólo si su cuenta de Stripe Connect
      // puede recibir pagos HOY; si no, cobra la plataforma y se apunta la deuda.
      const cuenta = e.user_id
        ? (await db.execute(sql`SELECT stripe_account_id, charges_enabled FROM stripe_accounts WHERE user_id = ${e.user_id}`)).rows[0] as any
        : null;
      const directo = importe > 0 && !!cuenta?.charges_enabled && !!cuenta?.stripe_account_id;
      const { comision, neto } = reparto(importe, e.comision_bps);

      // La conversación nace archivada: no existe para nadie hasta que se paga.
      const convId = nuevoId('SCV');
      await db.execute(sql`
        INSERT INTO soporte_conversaciones (id, raiz_id, pagina_id, cliente_user_id, invitado_huella,
                                            cliente_nombre, cliente_email, experto_id, archived_at)
        VALUES (${convId}, ${e.raiz_id}, ${s.pagina}, ${c.userId}, ${c.userId ? null : c.huella},
                ${nombre}, ${email}, ${e.id}, now())
      `);
      const id = nuevoId('CEX');
      try {
        await db.execute(sql`
          INSERT INTO consultas_experto (id, experto_id, raiz_id, conversacion_id, cliente_user_id, cliente_email,
                                         cliente_nombre, tema, inicio, fin, estado, expira_at,
                                         importe_centimos, comision_centimos, neto_experto_centimos, moneda, cobro)
          VALUES (${id}, ${e.id}, ${e.raiz_id}, ${convId}, ${c.userId}, ${email}, ${nombre}, ${tema},
                  ${hueco.inicio}, ${hueco.fin}, 'reservando',
                  now() + make_interval(mins => ${MINUTOS_PARA_PAGAR}),
                  ${importe}, ${comision}, ${neto}, ${e.moneda},
                  ${importe === 0 ? 'gratis' : directo ? 'directo' : 'plataforma'})
        `);
      } catch (err: any) {
        if (huecoOcupado(err)) {
          return res.status(409).json({ error: 'Alguien acaba de reservar ese hueco. Elige otro.' });
        }
        throw err;
      }
      dejarCookie(res, c);

      if (importe === 0) {
        await confirmarConsulta(db, id, { paymentIntent: null, sesion: null });
        return res.json({ ok: true, consulta: id, pagada: true, conversacion: convId });
      }

      // A dónde se vuelve: la misma página, en el mismo anfitrión desde el que
      // se reserva (dominio propio, subdominio o la casa). Sólo la ruta viene
      // del navegador, y tiene que empezar por «/».
      const ruta = String(req.body?.volver || '/');
      const vuelta = `${origenDe(req)}${ruta.startsWith('/') && !ruta.startsWith('//') ? ruta.split('?')[0] : '/'}`;
      try {
        const sesion = await getStripe().checkout.sessions.create({
          mode: 'payment',
          customer_email: email,
          line_items: [{
            price_data: {
              currency: String(e.moneda || 'EUR').toLowerCase(),
              product_data: {
                name: `Consulta con ${e.nombre} (${e.duracion_min} min)`,
                description: `${fechaLarga(hueco.inicio, e.zona_horaria)} · ${s.nombre}`,
              },
              unit_amount: importe,
            },
            quantity: 1,
          }],
          ...(directo ? {
            payment_intent_data: { application_fee_amount: comision, transfer_data: { destination: cuenta.stripe_account_id } },
          } : {}),
          metadata: { kind: 'consulta_experto', consulta_id: id, experto_id: e.id, raiz_id: e.raiz_id },
          success_url: `${vuelta}?consulta=${id}&sesion={CHECKOUT_SESSION_ID}`,
          cancel_url: `${vuelta}?consulta=${id}&cancelada=1`,
          expires_at: Math.floor(Date.now() / 1000) + MINUTOS_PARA_PAGAR * 60,
        });
        await db.execute(sql`UPDATE consultas_experto SET stripe_session_id = ${sesion.id} WHERE id = ${id}`);
        res.json({ ok: true, consulta: id, url: sesion.url });
      } catch (err: any) {
        // Si Stripe no abre el pago, el hueco no se queda retenido por nada.
        await db.execute(sql`UPDATE consultas_experto SET estado = 'caducada', updated_at = now() WHERE id = ${id}`);
        console.error('[expertos] sesión de pago:', err?.message || err);
        res.status(502).json({ error: 'No se ha podido abrir el pago. Prueba otra vez en un momento.' });
      }
    } catch (e: any) {
      console.error('expertos reservar:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/expertos/consultas/:id/confirmar { sesion } — la vuelta del
   * pago. No se fía de nada del navegador salvo el código de la sesión, y a
   * Stripe se le pregunta si de verdad está pagada.
   */
  app.post('/api/expertos/consultas/:id/confirmar', async (req: Request, res: Response) => {
    try {
      const c = (await db.execute(sql`SELECT * FROM consultas_experto WHERE id = ${String(req.params.id)}`)).rows[0] as any;
      const sesionId = String(req.body?.sesion || '');
      if (!c || !sesionId || c.stripe_session_id !== sesionId) return res.status(404).json({ error: 'Esa reserva no existe.' });
      if (['pagada', 'hecha', 'cancelada'].includes(c.estado)) return res.json({ estado: c.estado, conversacion: c.conversacion_id });
      const sesion = await getStripe().checkout.sessions.retrieve(sesionId);
      if (sesion.metadata?.consulta_id !== c.id) return res.status(404).json({ error: 'Esa reserva no existe.' });
      if (sesion.payment_status !== 'paid') return res.json({ estado: c.estado, pendiente: true });
      const r = await confirmarConsulta(db, c.id, { paymentIntent: (sesion.payment_intent as string) || null, sesion: sesion.id });
      res.json({ ...r, conversacion: c.conversacion_id });
    } catch (e: any) {
      console.error('expertos confirmar:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/expertos/mis-consultas/:pagina — las consultas de quien mira, en este sitio. */
  app.get('/api/expertos/mis-consultas/:pagina', async (req: Request, res: Response) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      const s = await sitioDeSoporte(db, req, String(req.params.pagina));
      if (!s) return res.status(404).json({ error: 'Esta página no existe.' });
      const c = await clienteActual(db, req, s.raiz);
      if (!c) return res.json({ consultas: [] });
      const r = await db.execute(sql`
        SELECT q.id, q.inicio, q.fin, q.estado, q.importe_centimos, q.moneda, q.conversacion_id, e.nombre AS experto
        FROM consultas_experto q
        JOIN expertos e ON e.id = q.experto_id
        JOIN soporte_conversaciones cv ON cv.id = q.conversacion_id
        WHERE q.raiz_id = ${s.raiz} AND q.estado IN ('pagada', 'hecha', 'cancelada')
          AND (${c.userId ? sql`cv.cliente_user_id = ${c.userId}` : sql`false`}
            OR ${c.huella ? sql`cv.invitado_huella = ${c.huella}` : sql`false`})
        ORDER BY q.inicio DESC LIMIT 50
      `);
      res.json({
        consultas: (r.rows as any[]).map(x => ({
          id: x.id, inicio: x.inicio, fin: x.fin, estado: x.estado, experto: x.experto,
          importeCentimos: x.importe_centimos, moneda: x.moneda, conversacion: x.conversacion_id,
        })),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ════ EL EQUIPO DEL SITIO Y LOS EXPERTOS ══════════════════════════════════

  /** GET /api/expertos/gestion/:pagina — todos los expertos (activos o no) y
   *  las consultas, con lo que se debe a cada uno. Equipo, o el propio experto
   *  (que sólo ve lo suyo). */
  app.get('/api/expertos/gestion/:pagina', async (req: Request, res: Response) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const s = await sitioDeSoporte(db, req, String(req.params.pagina));
      if (!s) return res.status(404).json({ error: 'Esta página no existe.' });
      const equipo = await esEquipo(db, req, s.raiz);
      await soltarCaducadas(db);
      const ex = await db.execute(sql`
        SELECT e.*, u.email AS cuenta_email FROM expertos e LEFT JOIN users u ON u.id = e.user_id
        WHERE e.raiz_id = ${s.raiz} AND e.archived_at IS NULL
          AND (${equipo} OR e.user_id = ${req.user.id})
        ORDER BY e.orden, e.created_at
      `);
      if (!equipo && !ex.rows.length) return res.status(403).json({ error: 'Sólo el equipo del sitio gestiona los expertos.' });
      const ids = (ex.rows as any[]).map(e => e.id);
      const cs = ids.length ? await db.execute(sql`
        SELECT id, experto_id, inicio, fin, estado, cliente_nombre, cliente_email, tema, importe_centimos,
               comision_centimos, neto_experto_centimos, moneda, cobro, pagado_experto_at, transferencia_ref,
               conversacion_id, reembolsada_at
        FROM consultas_experto
        WHERE experto_id IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)}) AND estado IN ('pagada', 'hecha', 'cancelada')
        ORDER BY inicio DESC LIMIT 300
      `) : { rows: [] };
      res.json({
        equipo, pagosActivos: !!process.env.STRIPE_SECRET_KEY,
        expertos: (ex.rows as any[]).map(e => ({
          ...publico(e), activo: e.activo, orden: e.orden,
          disponibilidad: limpiarDisponibilidad(e.disponibilidad).franjas,
          antelacionHoras: e.antelacion_horas, enlaceReunion: e.enlace_reunion || '',
          cuentaEmail: equipo || e.user_id === req.user!.id ? e.cuenta_email || null : null,
        })),
        consultas: (cs.rows as any[]).map(q => ({
          id: q.id, experto: q.experto_id, inicio: q.inicio, fin: q.fin, estado: q.estado,
          cliente: q.cliente_nombre || q.cliente_email, email: q.cliente_email, tema: q.tema,
          importeCentimos: q.importe_centimos, comisionCentimos: q.comision_centimos,
          netoExpertoCentimos: q.neto_experto_centimos, moneda: q.moneda, cobro: q.cobro,
          // «Se le debe» es un hecho calculado, no una casilla: cobró la
          // plataforma, la consulta no se canceló y nadie ha apuntado la transferencia.
          seLeDebe: q.cobro === 'plataforma' && q.estado !== 'cancelada' && !q.pagado_experto_at,
          pagadoExperto: q.pagado_experto_at, transferencia: q.transferencia_ref,
          reembolsada: q.reembolsada_at, conversacion: q.conversacion_id,
        })),
      });
    } catch (e: any) {
      console.error('expertos gestión:', e);
      res.status(500).json({ error: e.message });
    }
  });

  const campos = (cuerpo: any, soloPropios: boolean) => camposExperto(db, cuerpo, soloPropios);

  /** POST /api/expertos/gestion/:pagina — dar de alta un experto (equipo). */
  app.post('/api/expertos/gestion/:pagina', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const s = await sitioDeSoporte(db, req, String(req.params.pagina));
      if (!s || !(await esEquipo(db, req, s.raiz))) return res.status(403).json({ error: 'Sólo el equipo del sitio da de alta expertos.' });
      const cuerpo = { nombre: '', precioCentimos: 0, ...(req.body || {}) };
      const v = await campos(cuerpo, false);
      if ('error' in v) return res.status(400).json({ error: v.error });
      const id = nuevoId('EXP');
      const f = v.out;
      await db.execute(sql`
        INSERT INTO expertos (id, raiz_id, user_id, nombre, especialidad, bio, foto_url, precio_centimos, moneda,
                              duracion_min, comision_bps, zona_horaria, disponibilidad, antelacion_horas,
                              enlace_reunion, activo, orden, created_by)
        VALUES (${id}, ${s.raiz}, ${f.user_id ?? null}, ${f.nombre}, ${f.especialidad ?? null}, ${f.bio ?? null},
                ${f.foto_url ?? null}, ${f.precio_centimos}, ${f.moneda ?? 'EUR'}, ${f.duracion_min ?? 45},
                ${f.comision_bps ?? 0}, ${f.zona_horaria ?? 'Europe/Madrid'}, ${f.disponibilidad ?? '[]'}::jsonb,
                ${f.antelacion_horas ?? 24}, ${f.enlace_reunion ?? null}, ${f.activo ?? true}, ${f.orden ?? 0},
                ${req.user.id})
      `);
      res.json({ ok: true, id });
    } catch (e: any) {
      console.error('expertos alta:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** PUT /api/expertos/gestion/experto/:id — editar. El equipo todo; el
   *  experto sólo su agenda, su bio, su foto y su enlace (no su precio). */
  app.put('/api/expertos/gestion/experto/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const e = (await db.execute(sql`SELECT * FROM expertos WHERE id = ${String(req.params.id)} AND archived_at IS NULL`)).rows[0] as any;
      if (!e) return res.status(404).json({ error: 'Ese experto no existe.' });
      const equipo = await esEquipo(db, req, e.raiz_id);
      if (!equipo && e.user_id !== req.user.id) return res.status(403).json({ error: 'No puedes editar este experto.' });
      const v = await campos(req.body || {}, !equipo);
      if ('error' in v) return res.status(400).json({ error: v.error });
      const claves = Object.keys(v.out);
      if (!claves.length) return res.json({ ok: true });
      const sets = claves.map(k => k === 'disponibilidad'
        ? sql`disponibilidad = ${v.out[k]}::jsonb`
        : sql`${sql.raw(k)} = ${v.out[k]}`);
      await db.execute(sql`UPDATE expertos SET ${sql.join(sets, sql`, `)}, updated_at = now() WHERE id = ${e.id}`);
      res.json({ ok: true });
    } catch (e: any) {
      console.error('expertos editar:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** DELETE /api/expertos/gestion/experto/:id — archivar (equipo). Las
   *  consultas ya pagadas siguen: archivar no cancela lo vendido. */
  app.delete('/api/expertos/gestion/experto/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const e = (await db.execute(sql`SELECT * FROM expertos WHERE id = ${String(req.params.id)} AND archived_at IS NULL`)).rows[0] as any;
      if (!e || !(await esEquipo(db, req, e.raiz_id))) return res.status(404).json({ error: 'Ese experto no existe.' });
      await db.execute(sql`UPDATE expertos SET archived_at = now(), activo = false, updated_at = now() WHERE id = ${e.id}`);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * PUT /api/expertos/gestion/consulta/:id { accion: 'hecha' | 'cancelar' | 'pagado_experto', ref? }
   *  · hecha: la consulta se dio (equipo o experto).
   *  · cancelar: se anula y se devuelve el dinero por Stripe (equipo o experto).
   *  · pagado_experto: el equipo apunta que le transfirió su parte (sólo cobro 'plataforma').
   */
  app.put('/api/expertos/gestion/consulta/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const c = (await db.execute(sql`SELECT * FROM consultas_experto WHERE id = ${String(req.params.id)}`)).rows[0] as any;
      const quien = c ? await atiendeConsulta(req, c) : null;
      if (!c || !quien) return res.status(404).json({ error: 'Esa consulta no existe.' });
      const accion = String(req.body?.accion || '');
      const conv = c.conversacion_id ? (await db.execute(sql`SELECT * FROM soporte_conversaciones WHERE id = ${c.conversacion_id}`)).rows[0] as any : null;

      if (accion === 'hecha') {
        if (c.estado !== 'pagada') return res.status(409).json({ error: 'Sólo una consulta pagada puede marcarse como hecha.' });
        await db.execute(sql`UPDATE consultas_experto SET estado = 'hecha', updated_at = now() WHERE id = ${c.id}`);
        return res.json({ ok: true, estado: 'hecha' });
      }

      if (accion === 'cancelar') {
        if (c.estado !== 'pagada') return res.status(409).json({ error: 'Sólo se puede cancelar una consulta pagada que aún no se ha dado.' });
        let reembolso = c.importe_centimos === 0;
        if (c.importe_centimos > 0 && c.stripe_payment_intent) {
          try {
            await getStripe().refunds.create({
              payment_intent: c.stripe_payment_intent,
              ...(c.cobro === 'directo' ? { reverse_transfer: true, refund_application_fee: true } : {}),
            });
            reembolso = true;
          } catch (err: any) {
            console.error('[expertos] reembolso:', err?.message || err);
            return res.status(502).json({ error: 'Stripe no ha aceptado la devolución, así que la consulta sigue en pie. Prueba otra vez o devuélvelo desde Stripe.' });
          }
        }
        await db.execute(sql`
          UPDATE consultas_experto SET estado = 'cancelada', updated_at = now(),
            reembolsada_at = ${reembolso && c.importe_centimos > 0 ? sql`now()` : sql`NULL`}
          WHERE id = ${c.id}
        `);
        if (conv) {
          const motivo = String(req.body?.motivo || '').trim().slice(0, 500);
          await escribir(db, {
            conv, de: 'sistema', autor: null,
            texto: `La consulta se ha cancelado.${c.importe_centimos > 0 ? ` Te hemos devuelto ${euros(c.importe_centimos, c.moneda)}; según tu banco tarda unos días en verse.` : ''}${motivo ? `\nMotivo: ${motivo}` : ''}`,
          });
        }
        return res.json({ ok: true, estado: 'cancelada' });
      }

      if (accion === 'pagado_experto') {
        if (quien !== 'equipo') return res.status(403).json({ error: 'Sólo el equipo del sitio apunta los pagos a expertos.' });
        if (c.cobro !== 'plataforma') return res.status(409).json({ error: 'Esta consulta la cobró el experto directamente: no se le debe nada.' });
        if (c.estado === 'cancelada') return res.status(409).json({ error: 'Una consulta cancelada no se le paga al experto.' });
        const ref = String(req.body?.ref || '').trim().slice(0, 200);
        if (!ref) return res.status(400).json({ error: 'Escribe la referencia de la transferencia: «pagado» tiene que poder comprobarse.' });
        await db.execute(sql`
          UPDATE consultas_experto SET pagado_experto_at = now(), transferencia_ref = ${ref}, updated_at = now()
          WHERE id = ${c.id} AND pagado_experto_at IS NULL
        `);
        return res.json({ ok: true });
      }
      res.status(400).json({ error: 'La acción es «hecha», «cancelar» o «pagado_experto».' });
    } catch (e: any) {
      console.error('expertos consulta:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
