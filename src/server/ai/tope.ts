// ============================================================================
// EL TECHO DE GASTO DE IA DE LA PLATAFORMA (2026-08-23, Programador 8)
// ============================================================================
// Nota del tablero de seguridad: **el chat de IA no tiene techo de gasto**.
//
// ── ES UN TOPE DE LA PLATAFORMA, NO DE NADIE ───────────────────────────────
// Eugenio decidió que las preguntas gratis NO tienen límite por persona, y eso
// no se toca aquí: esto no mira quién pregunta. Lo que impide es que la
// plataforma entera se gaste más de X en un mes, venga de donde venga.
//
// Hace falta porque **el chat responde sin sesión**. Un bucle desde fuera no
// se nota en el uso —no hay una cuenta a la que mirar— y a mes vencido aparece
// en la factura. Un tope es la diferencia entre un susto y un problema.
//
// ── DE DÓNDE SALEN LOS NÚMEROS ─────────────────────────────────────────────
// Medido el 2026-08-23, no elegido a ojo:
//
//   · Gasto real de IA de la plataforma en TODO agosto de 2026: 0,74 €.
//   · Una respuesta del modelo rápido cuesta entre 0,003 € y 0,006 €.
//
// Con 20 €/mes caben unas 3.000–6.000 respuestas: veintisiete veces el pico
// real. Un mes normal no lo roza ni multiplicando por veinte el uso de hoy, y
// un bucle a una petición por segundo lo agota en una o dos horas — que es
// justo lo que se quiere acotar. **Un tope que se toca por uso normal enseña a
// subirlo, y a la tercera se quita.**
//
// ── Y UN TOPE DIARIO, QUE ES LO QUE CONVIERTE EL CORTE EN UN MODO ──────────
// Con solo tope mensual, ese bucle de una hora se lleva el mes entero y deja
// el chat sin modelo **los veintinueve días siguientes**: la degradación deja
// de ser un modo y pasa a ser un mes. El tope diario (la décima parte) hace
// que el peor caso sea «hoy no hay IA» y que mañana vuelva solo. Un día normal
// son 0,025 €, así que 2 €/día son ochenta días normales.
//
// ── SE COMPRUEBA ANTES DE LLAMAR, NUNCA DURANTE ────────────────────────────
// Cortar a mitad de una respuesta sería gastar el dinero y además no dar la
// respuesta. Se pregunta antes; lo que ya empezó, termina.
//
// ── CÓMO SE CUENTA SIN UNA CONSULTA POR PETICIÓN ───────────────────────────
// Se lee la suma de la base de datos como mucho una vez por minuto, y entre
// lectura y lectura se van sumando en memoria los cargos según se apuntan
// (`apuntarGasto`). Así el número está al día al céntimo sin preguntarle a la
// base de datos en cada mensaje. Si el servidor se reinicia, la siguiente
// lectura lo recupera todo de la base: lo que hay en memoria es un adelanto,
// nunca la verdad.
import { sql } from 'drizzle-orm';
import { avisar } from '../avisos.js';

/** Un número de euros de una variable de entorno, o el de por defecto.
 *
 *  SI EL VALOR NO SE ENTIENDE, SE USA EL DE POR DEFECTO Y SE DICE. Un
 *  `TOPE_IA_EUR_MES=veinte` que se interpretara como 0 apagaría la IA de toda
 *  la plataforma en silencio; uno que se interpretara como infinito quitaría
 *  el techo. Las dos lecturas son peores que ignorarlo en voz alta. */
const euros = (nombre: string, porDefecto: number): number => {
  const bruto = process.env[nombre];
  if (bruto === undefined || bruto === '') return porDefecto;
  const n = Number(String(bruto).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) {
    console.warn(`[tope-ia] ${nombre}="${bruto}" no es un número de euros; se usa ${porDefecto} €.`);
    return porDefecto;
  }
  return n;
};

/** NO SE APAGA. Un techo que hay que acordarse de poner no protege de nada, así
 *  que viene puesto. Se cambia con la variable, no se quita. */
export const topeMesEur = () => euros('TOPE_IA_EUR_MES', 20);
export const topeDiaEur = () => euros('TOPE_IA_EUR_DIA', +(topeMesEur() / 10).toFixed(2));

interface Lectura { cuando: number; mesCent: number; diaCent: number; dia: string; mes: string; }

let ultima: Lectura | null = null;
/** Lo gastado desde la última lectura, apuntado sobre la marcha. */
let enMemoriaCent = 0;
const VIGENCIA_MS = 60_000;

const hoy = () => new Date().toISOString().slice(0, 10);
const mesDeHoy = () => new Date().toISOString().slice(0, 7);

/** Lo que se lleva gastado hoy y este mes, en céntimos. */
async function leer(db: any): Promise<Lectura> {
  const r = await db.execute(sql`
    SELECT
      COALESCE(SUM(cost_cents) FILTER (WHERE created_at >= date_trunc('month', now())), 0) AS mes,
      COALESCE(SUM(cost_cents) FILTER (WHERE created_at >= date_trunc('day',   now())), 0) AS dia
    FROM ai_usage_charges
  `);
  const f = (r.rows?.[0] || {}) as any;
  enMemoriaCent = 0;
  return {
    cuando: Date.now(),
    mesCent: Number(f.mes || 0),
    diaCent: Number(f.dia || 0),
    dia: hoy(),
    mes: mesDeHoy(),
  };
}

/** Apunta un cargo recién hecho, para no tener que releer la base de datos.
 *
 *  Se llama DESPUÉS de gastar, con lo que costó de verdad. No estima: si el
 *  cargo no se llega a escribir, tampoco se cuenta aquí, y la siguiente
 *  lectura pone las dos cosas de acuerdo. */
export function apuntarGasto(costeCent: number) {
  if (Number.isFinite(costeCent) && costeCent > 0) enMemoriaCent += costeCent;
}

export interface EstadoTope {
  tope_mes_eur: number;
  tope_dia_eur: number;
  gastado_mes_eur: number;
  gastado_dia_eur: number;
  /** Del tope del mes, en tanto por ciento. Es el que se enseña. */
  porcentaje_mes: number;
  /** `true` si NO se puede llamar al modelo ahora mismo. */
  alcanzado: boolean;
  /** Cuál de los dos topes es el que corta, para poder decirlo. */
  motivo: 'mes' | 'dia' | null;
}

export async function estadoDelTope(db: any): Promise<EstadoTope> {
  // Se relee si ha pasado el minuto, si cambió el día o si cambió el mes: un
  // contador de «hoy» que sobrevive a la medianoche cortaría el día siguiente
  // por lo que se gastó el anterior.
  if (!ultima || Date.now() - ultima.cuando > VIGENCIA_MS || ultima.dia !== hoy() || ultima.mes !== mesDeHoy()) {
    try {
      ultima = await leer(db);
    } catch (e: any) {
      // ══ SI NO SE PUEDE CONTAR, NO SE CORTA ═══════════════════════════════
      // Una base de datos que no responde no es una señal de que se esté
      // gastando dinero. Dejar el chat sin IA por no poder leer una suma sería
      // convertir un fallo de lectura en una caída de una función entera.
      console.error('[tope-ia] no se pudo leer el gasto:', e.message);
      const tope = topeMesEur();
      return {
        tope_mes_eur: tope, tope_dia_eur: topeDiaEur(),
        gastado_mes_eur: 0, gastado_dia_eur: 0,
        porcentaje_mes: 0, alcanzado: false, motivo: null,
      };
    }
  }
  const mesCent = ultima.mesCent + enMemoriaCent;
  const diaCent = ultima.diaCent + enMemoriaCent;
  const topeMes = topeMesEur();
  const topeDia = topeDiaEur();
  const gastadoMes = mesCent / 100;
  const gastadoDia = diaCent / 100;
  const motivo = gastadoMes >= topeMes ? 'mes' : gastadoDia >= topeDia ? 'dia' : null;
  return {
    tope_mes_eur: topeMes,
    tope_dia_eur: topeDia,
    gastado_mes_eur: +gastadoMes.toFixed(4),
    gastado_dia_eur: +gastadoDia.toFixed(4),
    porcentaje_mes: topeMes > 0 ? Math.min(999, Math.round((gastadoMes / topeMes) * 100)) : 0,
    alcanzado: motivo !== null,
    motivo,
  };
}

// ══ EL AVISO DEL 80 %, UNA VEZ POR MES Y SOLO A QUIEN PUEDE HACER ALGO ══════
// Enterarse al llegar al tope es enterarse tarde: cuando el chat ya no
// contesta, la decisión de subir el tope o de mirar qué está pasando llega
// después del corte. Al 80 % todavía hay margen para las dos cosas.
//
// UNA VEZ POR MES, y comprobado EN LA BASE DE DATOS y no en una variable: un
// reinicio del servidor —que aquí pasa en cada despliegue, varias veces al
// día— volvería a mandarlo, y una campana que repite lo mismo enseña a
// ignorarla. La clave es el mes (`2026-08`), así que el mes que viene vuelve a
// avisar una vez, que es lo que se quiere.
//
// SOLO A QUIEN ADMINISTRA: a quien no puede cambiar el tope ni mirar el gasto,
// saber que la plataforma va por el 80 % no le sirve de nada y le convierte la
// campana en ruido.
let comprobando = false;

async function avisarDel80(db: any, estado: EstadoTope) {
  // Ni antes del 80 %, ni cuando ya se ha llegado al tope (para eso el chat ya
  // dice lo que pasa, y avisar entonces sería avisar de algo consumado).
  if (estado.porcentaje_mes < 80 || estado.alcanzado) return;
  if (comprobando) return;          // una sola comprobación a la vez
  comprobando = true;
  try {
    const mes = mesDeHoy();
    const ya = await db.execute(sql`
      SELECT 1 FROM notifications
      WHERE type = 'gasto_ia_80' AND entity_type = 'gasto_ia' AND entity_id = ${mes}
      LIMIT 1
    `);
    if (ya.rows?.length) return;
    const admins = await db.execute(sql`
      SELECT id FROM users
      WHERE role_level >= 4 AND archived_at IS NULL AND deleted_at IS NULL
    `);
    // Las dos cifras con coma decimal, que es como se escriben los euros aquí.
    // Mezclar «1,89 €» con «2.3 €» en la misma frase se lee como un error de
    // la plataforma antes que como un aviso.
    const enEuros = (n: number) => n.toFixed(2).replace('.', ',');
    const texto = `${enEuros(estado.gastado_mes_eur)} € de ${enEuros(estado.tope_mes_eur)} € este mes`;
    for (const a of (admins.rows || []) as any[]) {
      await avisar(db, {
        paraQuien: a.id,
        dePartede: null,
        tipo: 'gasto_ia_80',
        entidadTipo: 'gasto_ia',
        entidadId: mes,
        datos: { texto, porcentaje: estado.porcentaje_mes, tope_eur: estado.tope_mes_eur },
      });
    }
  } catch (e: any) {
    console.error('[tope-ia] no se pudo avisar del 80 %:', e.message);
  } finally {
    comprobando = false;
  }
}

/** Lo que se le dice a quien pregunta cuando no hay presupuesto.
 *
 *  DICE QUÉ SIGUE FUNCIONANDO, no solo qué no. «No hay respuestas de la IA» a
 *  secas se lee como «el chat está roto»; el buscador sigue entero y es
 *  gratis, así que se nombra. */
export const MENSAJE_SIN_PRESUPUESTO = {
  mes: 'La plataforma ha llegado a su tope de gasto en IA de este mes, así que hoy no hay respuestas del modelo. '
    + 'El buscador sigue funcionando igual: puedes buscar lo que haya publicado, y eso no cuesta nada.',
  dia: 'La plataforma ha llegado a su tope de gasto en IA de hoy, así que las respuestas del modelo vuelven mañana. '
    + 'El buscador sigue funcionando igual: puedes buscar lo que haya publicado, y eso no cuesta nada.',
};

/** ¿Se puede llamar a un modelo ahora mismo? Se pregunta ANTES de llamar. */
export async function hayPresupuesto(db: any): Promise<{ ok: boolean; mensaje?: string; estado: EstadoTope }> {
  const estado = await estadoDelTope(db);
  // Sin esperar: nadie debe esperar por una campana antes de que le contesten.
  void avisarDel80(db, estado);
  if (!estado.alcanzado) return { ok: true, estado };
  return { ok: false, mensaje: MENSAJE_SIN_PRESUPUESTO[estado.motivo || 'mes'], estado };
}
