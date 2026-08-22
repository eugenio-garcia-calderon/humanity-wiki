// ============================================================================
// PASAR EL BUZÓN AL REGISTRO SELLADO (fase B, 2026-08-22)
// ============================================================================
// El disparador de `drizzle/0071_registro_captura.sql` deja una nota por cada
// cambio en `registro_pendiente`, rápido y sin firmar. Esto es lo que las coge
// en orden, las encadena y las firma.
//
// Van separados porque fallan por motivos distintos: escribir en la base de
// datos tiene que seguir funcionando aunque falte la llave de firma, y la firma
// tiene que poder fallar sin tumbar el guardado de nadie. Una seguridad que
// rompe el trabajo de la gente se acaba quitando.
//
// ── LOS HUECOS SE ANOTAN, NO SE IGNORAN ────────────────────────────────────
// El `id` del buzón es una secuencia. Si al sellar falta el 41 entre el 40 y el
// 42, alguien ha borrado esa nota antes de que se sellara. No se puede saber
// QUÉ decía — pero que faltaba sí, y queda escrito en el registro con su clase
// propia. Es la diferencia entre un borrado silencioso y uno que deja marca.
import { sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import { anotar } from './registro.js';

export interface Resumen {
  sellados: number;
  huecos: number;
  /** El último id del buzón que ha quedado sellado. */
  hasta: number | null;
}

/** Hasta dónde se selló la última vez. Sale del propio registro: no hace falta
 *  una tabla de estado que pueda desincronizarse con él. */
async function ultimoSellado(db: any): Promise<number> {
  const r = await db.execute(sql`
    SELECT max((datos ->> 'buzon_id')::bigint) AS n
    FROM registro_sellado WHERE clase IN ('dato', 'hueco')
  `);
  return Number((r.rows[0] as any)?.n ?? 0);
}

/**
 * Sella lo que haya pendiente, en orden. Devuelve cuántas y cuántos huecos.
 *
 * `limite` existe para que una primera pasada sobre una base con mucho atraso
 * no se coma la memoria ni bloquee: se llama otra vez hasta que devuelva cero.
 */
export async function sellarPendientes(db: any, limite = 500): Promise<Resumen> {
  // El buzón puede no existir todavía: la captura por disparadores va en una
  // migración aparte, que sale cuando haya algo que lo vacíe cada pocos
  // minutos. Sin esto, ejecutar el sellador contra una base sin esa migración
  // reventaba con un error de Postgres en crudo en vez de decir que no hay
  // nada que sellar — la misma regla que ya se aplicó al verificador.
  const hayBuzon = await db.execute(sql`SELECT to_regclass('registro_pendiente') IS NOT NULL AS existe`);
  if (!(hayBuzon.rows[0] as any)?.existe) return { sellados: 0, huecos: 0, hasta: null };

  const pendientes = (await db.execute(sql`
    SELECT id, momento, tabla, operacion, clave, huella_nueva, huella_vieja, actor_bd, txid
    FROM registro_pendiente WHERE sellado_at IS NULL
    ORDER BY id ASC LIMIT ${limite}
  `)).rows as any[];

  if (!pendientes.length) return { sellados: 0, huecos: 0, hasta: null };

  let esperado = (await ultimoSellado(db)) + 1;
  let sellados = 0;
  let huecos = 0;

  for (const p of pendientes) {
    const id = Number(p.id);

    if (id > esperado) {
      // Faltan notas. Se anota el tramo que falta, no se pasa por alto.
      await anotar(db, {
        clase: 'hueco', actor: 'sistema', asunto: null,
        datos: { buzon_id: id - 1, desde: esperado, hasta: id - 1, cuantas: id - esperado },
      });
      huecos++;
    }

    await anotar(db, {
      clase: 'dato',
      actor: String(p.actor_bd),
      asunto: `${p.tabla}#${p.clave ?? ''}`,
      datos: {
        buzon_id: id,
        tabla: p.tabla,
        operacion: p.operacion,
        clave: p.clave ?? null,
        huella_nueva: p.huella_nueva ?? null,
        huella_vieja: p.huella_vieja ?? null,
        // Las filas que se escribieron en la misma transacción comparten este
        // número. Es lo que hace demostrable que una transferencia son sus dos
        // apuntes y no dos hechos sueltos.
        tx: String(p.txid),
        momento: new Date(p.momento).toISOString(),
      },
    });

    await db.execute(sql`UPDATE registro_pendiente SET sellado_at = now() WHERE id = ${id}`);
    sellados++;
    esperado = id + 1;
  }

  return { sellados, huecos, hasta: esperado - 1 };
}

// ── ¿ESTA FILA SIGUE SIENDO LA QUE SELLAMOS? ────────────────────────────────

export type EstadoFila = 'IGUAL' | 'DISTINTA' | 'NO_SE';

export interface VeredictoFila {
  estado: EstadoFila;
  porque?: string;
  /** Cuándo se selló por última vez, para poder decir «desde cuándo». */
  sellada_en?: string;
}

/**
 * La pregunta que da sentido a todo lo demás: **¿el contenido de esta fila es
 * el mismo que quedó sellado?**
 *
 * Recalcula su huella ahora y la compara con la última que hay en el registro.
 * Si no cuadra, alguien la ha cambiado por un camino que no pasó por el
 * disparador — quitándolo, restaurando una copia, o escribiendo con permisos
 * que se lo permiten.
 *
 * Devuelve NO_SE cuando no hay nada sellado de esa fila. No es un aprobado ni
 * un suspenso: es que no lo sabemos, y decir otra cosa sería inventar.
 */
export async function comprobarFila(db: any, tabla: string, clave: string): Promise<VeredictoFila> {
  // El nombre de tabla no puede parametrizarse; se valida en vez de confiar.
  if (!/^[a-z_][a-z0-9_]*$/.test(tabla)) {
    return { estado: 'NO_SE', porque: 'Nombre de tabla no válido.' };
  }

  const sellada = (await db.execute(sql`
    SELECT momento, datos ->> 'huella_nueva' AS huella, datos ->> 'operacion' AS operacion
    FROM registro_sellado
    WHERE clase = 'dato' AND datos ->> 'tabla' = ${tabla} AND datos ->> 'clave' = ${clave}
    ORDER BY n DESC LIMIT 1
  `)).rows[0] as any;

  if (!sellada) {
    return { estado: 'NO_SE', porque: 'De esta fila no hay nada sellado todavía.' };
  }
  if (sellada.operacion === 'DELETE') {
    return { estado: 'NO_SE', porque: 'Lo último sellado de esta fila es su borrado.', sellada_en: new Date(sellada.momento).toISOString() };
  }

  const fila = (await db.execute(sql`
    SELECT to_jsonb(t)::text AS json FROM ${sql.raw(tabla)} t WHERE t.id = ${clave}
  `)).rows[0] as any;

  if (!fila) {
    return { estado: 'DISTINTA', porque: 'La fila ya no existe y su borrado no está sellado.', sellada_en: new Date(sellada.momento).toISOString() };
  }

  const ahora = crypto.createHash('sha256').update(fila.json, 'utf8').digest('hex');
  return ahora === sellada.huella
    ? { estado: 'IGUAL', sellada_en: new Date(sellada.momento).toISOString() }
    : { estado: 'DISTINTA', porque: 'El contenido de ahora no da la huella que se selló.', sellada_en: new Date(sellada.momento).toISOString() };
}

// ── LA COMPROBACIÓN PERIÓDICA ───────────────────────────────────────────────

export interface Muestra {
  miradas: number;
  iguales: number;
  distintas: { tabla: string; clave: string; sellada_en?: string }[];
  sinSaber: number;
}

/**
 * Coge unas cuantas filas al azar de las que hay selladas y comprueba que
 * siguen siendo las mismas.
 *
 * **Al azar y no las últimas**, que es la diferencia entre una comprobación y
 * un teatro: quien manipula algo lo hace en un sitio viejo y tranquilo, no en
 * la fila que se acaba de escribir. Con una muestra pequeña cada hora, una
 * manipulación tiene que sobrevivir a muchas tiradas de dados para no salir.
 *
 * No sustituye a verificar la cadena entera: son dos preguntas distintas. La
 * cadena dice si el REGISTRO está intacto; esto dice si los DATOS siguen
 * pareciéndose a lo que el registro afirma.
 */
export async function verificarMuestra(db: any, cuantas = 25): Promise<Muestra> {
  const filas = (await db.execute(sql`
    SELECT DISTINCT ON (datos ->> 'tabla', datos ->> 'clave')
           datos ->> 'tabla' AS tabla, datos ->> 'clave' AS clave
    FROM registro_sellado
    WHERE clase = 'dato' AND datos ->> 'clave' <> ''
    ORDER BY datos ->> 'tabla', datos ->> 'clave', n DESC
  `)).rows as any[];

  // Se barajan aquí y no en SQL: `ORDER BY random()` sobre una tabla que solo
  // crece acaba costando una lectura entera cada vez que se ejecuta.
  for (let i = filas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filas[i], filas[j]] = [filas[j], filas[i]];
  }

  const m: Muestra = { miradas: 0, iguales: 0, distintas: [], sinSaber: 0 };
  for (const f of filas.slice(0, cuantas)) {
    const v = await comprobarFila(db, f.tabla, f.clave);
    m.miradas++;
    if (v.estado === 'IGUAL') m.iguales++;
    else if (v.estado === 'DISTINTA') m.distintas.push({ tabla: f.tabla, clave: f.clave, sellada_en: v.sellada_en });
    else m.sinSaber++;
  }
  return m;
}
