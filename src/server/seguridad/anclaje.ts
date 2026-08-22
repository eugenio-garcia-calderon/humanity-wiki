// ============================================================================
// PUBLICAR EL RESUMEN DEL DÍA DONDE NO MANDAMOS (fase D, 2026-08-22)
// ============================================================================
// Todo lo demás del registro sellado es verificable **por nosotros**: la cadena
// de huellas, la firma, la captura por disparadores. Eso vale contra el
// accidente y contra alguien con prisa. No vale contra quien pueda reescribir
// la base de datos y recalcular las huellas con calma — porque las llaves y el
// código también son nuestros.
//
// Esto es lo que cierra ese hueco, y es la pieza más pequeña de todas: **una
// vez al día se publica UN número** —el resumen de todo lo anotado ese día— en
// un sitio que no controlamos. A partir de ahí, cambiar el pasado exige cambiar
// también algo que está fuera de nuestro alcance.
//
// ── QUÉ SALE, Y QUÉ NO ─────────────────────────────────────────────────────
// Sale la raíz de Merkle del día: 32 bytes. **Ni un dato de nadie**, ni
// siquiera en forma de huella de un dato: las hojas del árbol son huellas de
// anotaciones que llevan su propia sal, guardada aquí dentro. Las directrices
// finales del Comité Europeo de Protección de Datos (02/2025 v2.0) prohíben
// poner en una cadena datos personales «ni en claro, ni cifrados, ni en forma
// de huella», y esto lo cumple por construcción.
//
// ── OPENTIMESTAMPS, Y POR QUÉ ESE ──────────────────────────────────────────
// Es gratis, no hace falta monedero ni monedas, no depende de que nosotros
// tengamos cuenta en ningún sitio, y lo verifica cualquiera con software libre.
// El calendario agrupa muchos resúmenes en uno y lo escribe en Bitcoin: el
// coste por día es cero y la prueba la puede comprobar un tercero dentro de
// veinte años sin pedirnos nada.
//
// ── TRES ESTADOS, PORQUE SON TRES COSAS DISTINTAS ──────────────────────────
//   calculado   la raíz existe aquí. No demuestra nada frente a nadie.
//   enviado     un calendario la tiene y ha devuelto su recibo. Ya hay una
//               constancia fuera, con su hora, que nosotros no podemos alterar.
//   confirmado  el recibo se ha completado con la prueba de Bitcoin. Falta
//               (necesita volver a pedirla ~1 h después). Está escrito en el
//               documento de fases, no fingido aquí.
//
// **Calculado no es publicado.** Confundirlos sería prometer una prueba que no
// existe, que es exactamente el fallo que este módulo existe para no cometer.
import { sql } from 'drizzle-orm';
import { calcularAnclajeDelDia } from './registro.js';

/** Los calendarios públicos. Se manda a varios a propósito: si uno está caído
 *  hoy, o desaparece dentro de diez años, la prueba sigue estando en los otros.
 *
 *  Se leen del entorno (`CALENDARIOS_ANCLAJE`, separados por comas) para poder
 *  cambiarlos sin desplegar el día que uno cierre — y para que las pruebas
 *  apunten a uno de mentira en vez de depender de que internet vaya. */
const calendarios = () => (process.env.CALENDARIOS_ANCLAJE
  ? process.env.CALENDARIOS_ANCLAJE.split(',').map((s) => s.trim()).filter(Boolean)
  : [
    'https://a.pool.opentimestamps.org',
    'https://b.pool.opentimestamps.org',
    'https://alice.btc.calendar.opentimestamps.org',
  ]);

export type EstadoAnclaje = 'ANCLADO' | 'NADA_QUE_ANCLAR' | 'NO_SE';

export interface ResultadoAnclaje {
  estado: EstadoAnclaje;
  dia?: string;
  raiz?: string;
  calendarios?: string[];
  porque?: string;
}

/** Manda la raíz a un calendario y devuelve su recibo, o null si no contesta. */
async function enviarA(url: string, raiz: Buffer, msTope = 15000): Promise<Buffer | null> {
  try {
    const corte = AbortSignal.timeout(msTope);
    const r = await fetch(`${url}/digest`, {
      method: 'POST',
      body: raiz,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/vnd.opentimestamps.v1' },
      signal: corte,
    });
    if (!r.ok) return null;
    const bytes = Buffer.from(await r.arrayBuffer());
    // Un recibo vacío no es un recibo. Mejor «no sé» que una prueba de humo.
    return bytes.length > 0 ? bytes : null;
  } catch {
    return null;
  }
}

/**
 * Ancla un día. Idempotente: si ese día ya está publicado, no lo vuelve a
 * mandar — la fecha y el recibo de la primera vez son los que valen.
 *
 * `dia` en formato `YYYY-MM-DD`. Por defecto, AYER: el día de hoy todavía está
 * creciendo, y anclar un día a medias obligaría a anclarlo otra vez, con dos
 * raíces distintas para la misma fecha y ninguna forma de saber cuál es «la»
 * raíz de ese día.
 */
export async function anclarDia(db: any, dia?: string): Promise<ResultadoAnclaje> {
  const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const fecha = dia || ayer;

  try {
    const ya = await db.execute(sql`
      SELECT raiz, publicado_en FROM registro_anclajes WHERE dia = ${fecha}::date
    `);
    const fila = ya.rows[0] as any;
    if (fila?.publicado_en) {
      return { estado: 'ANCLADO', dia: fecha, raiz: fila.raiz, calendarios: [fila.publicado_en] };
    }

    // Calcula la raíz si no estaba, o la reutiliza si ya se calculó.
    const calculado = fila ? { raiz: fila.raiz as string } : await calcularAnclajeDelDia(db, fecha);
    if (!calculado) {
      return { estado: 'NADA_QUE_ANCLAR', dia: fecha, porque: 'Ese día no se anotó nada en el registro.' };
    }

    const raiz = Buffer.from(calculado.raiz, 'hex');
    const recibos = await Promise.all(calendarios().map(async (url) => ({ url, recibo: await enviarA(url, raiz) })));
    const logrados = recibos.filter((r) => r.recibo);

    if (!logrados.length) {
      // Ni un calendario ha contestado. NO se marca como publicado: es la
      // diferencia entre «hay constancia fuera» y «lo intentamos».
      return {
        estado: 'NO_SE', dia: fecha, raiz: calculado.raiz,
        porque: 'Ningún calendario ha contestado. La raíz queda calculada y SIN publicar; se reintenta.',
      };
    }

    // El recibo se guarda entero: es lo que un tercero necesita para comprobar
    // la prueba, y sin él la fecha de arriba es una afirmación nuestra más.
    const referencia = JSON.stringify(
      Object.fromEntries(logrados.map((r) => [r.url, r.recibo!.toString('base64')])),
    );
    await db.execute(sql`
      UPDATE registro_anclajes
      SET publicado_en = ${logrados.map((r) => new URL(r.url).host).join(', ')},
          publicado_at = now(),
          referencia = ${referencia}
      WHERE dia = ${fecha}::date
    `);

    return { estado: 'ANCLADO', dia: fecha, raiz: calculado.raiz, calendarios: logrados.map((r) => r.url) };
  } catch (e: any) {
    return { estado: 'NO_SE', dia: fecha, porque: e?.message || String(e) };
  }
}

/**
 * Lo pone a correr solo. Mira cada hora si ayer está anclado, y lo ancla si no.
 *
 * Cada hora y no una vez al día: si el contenedor se reinicia justo a la hora
 * del anclaje, un reloj diario se salta el día entero y nadie se entera hasta
 * que alguien pide la prueba. Mirando cada hora, un día solo se pierde si la
 * plataforma está caída veinticuatro horas seguidas — y entonces hay problemas
 * mayores.
 */
export function registrarAnclajeAutomatico(_app: unknown, db: any) {
  const pasada = async () => {
    try {
      const r = await anclarDia(db);
      if (r.estado === 'ANCLADO' && r.calendarios?.length) {
        console.log(`[registro] día ${r.dia} anclado fuera (${r.calendarios.length} calendario/s)`);
      } else if (r.estado === 'NO_SE') {
        console.warn(`[registro] no se ha podido anclar el día ${r.dia}: ${r.porque}`);
      }
    } catch (e: any) {
      console.error('[registro] fallo al anclar:', e?.message || e);
    }
  };
  pasada();
  const reloj = setInterval(pasada, 60 * 60 * 1000);
  reloj.unref?.();
}

/** Lo que se le enseña a cualquiera para que compruebe por su cuenta. */
export async function anclajesPublicos(db: any, cuantos = 60) {
  const r = await db.execute(sql`
    SELECT dia, raiz, desde_n, hasta_n, publicado_en, publicado_at, referencia
    FROM registro_anclajes ORDER BY dia DESC LIMIT ${cuantos}
  `);
  return (r.rows as any[]).map((f) => ({
    dia: f.dia,
    raiz: f.raiz,
    anotaciones: `${f.desde_n}–${f.hasta_n}`,
    estado: f.publicado_en ? 'publicado' : 'calculado, sin publicar',
    publicado_en: f.publicado_en,
    publicado_at: f.publicado_at,
    // El recibo va entero: sin él, la fecha es una afirmación nuestra.
    recibo: f.referencia,
  }));
}
