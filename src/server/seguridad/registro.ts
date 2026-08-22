// ============================================================================
// EL REGISTRO SELLADO (fase 0, 2026-08-22)
// ============================================================================
// La tabla y el porqué están en `drizzle/0064_registro_sellado.sql`. Aquí está
// lo que la escribe y, sobre todo, **lo que la verifica**.
//
// ── EL NÚCLEO NO TOCA LA BASE DE DATOS, Y ESO ES A PROPÓSITO ────────────────
// Calcular una huella, comprobar una cadena y construir el resumen de un día
// son funciones puras: se les da unas filas y devuelven un resultado. Así se
// pueden probar sin base de datos, sin claves y sin red — y una comprobación
// que necesita todo eso encendido es una comprobación que se deja de pasar.
// Y, más importante: **cualquiera puede reimplementarlas y auditarnos**, que es
// el sentido de todo esto.
import crypto from 'node:crypto';
import { sql } from 'drizzle-orm';

/** El eslabón cero. No existe ninguna anotación con esta huella: es de dónde
 *  dice venir la primera. */
export const GENESIS = '0'.repeat(64);

/** Separa los campos dentro del texto del que sale la huella. Escrito con su
 *  codigo y no con el caracter suelto: un caracter invisible en el fuente es
 *  un caracter que cualquier editor puede llevarse por delante sin que nadie
 *  lo vea, y cambiarlo cambiaria TODAS las huellas ya escritas. */
const SEPARADOR = '\u001f';

export interface Anotacion {
  n: number;
  momento: string;      // ISO 8601 en UTC, con milisegundos
  clase: string;
  actor: string;
  asunto: string | null;
  datos: unknown;
  sal: string;
  huella_previa: string;
}

/**
 * El texto exacto del que sale la huella. Es el corazón de todo: si dos
 * programas no lo construyen igual, uno de los dos dirá que la cadena está rota
 * cuando está bien — y una alarma que salta sola acaba desconectada.
 *
 * Reglas, y ninguna es un detalle:
 *  · Las claves de `datos` se ordenan siempre igual, hasta el fondo. Sin esto,
 *    el mismo hecho guardado por dos rutas distintas daría huellas distintas.
 *  · Los campos van separados por 0x1F, un carácter de control que no puede
 *    aparecer dentro de ninguno de ellos. Pegados sin separador, una anotación
 *    de clase «ab» y actor «c» daría el mismo texto que otra de clase «a» y
 *    actor «bc»: dos hechos distintos con la misma huella.
 *  · `momento` en UTC y con milisegundos: la misma hora escrita de dos maneras
 *    no puede dar dos huellas.
 */
export function textoDe(a: Anotacion): string {
  const ordenar = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(ordenar);
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, ordenar((v as any)[k])]));
    }
    return v;
  };
  return [
    String(a.n),
    new Date(a.momento).toISOString(),
    a.clase,
    a.actor,
    a.asunto ?? '',
    JSON.stringify(ordenar(a.datos ?? {})),
    a.sal,
    a.huella_previa,
  ].join(SEPARADOR);
}

export const huellaDe = (a: Anotacion): string =>
  crypto.createHash('sha256').update(textoDe(a), 'utf8').digest('hex');

// ── VERIFICAR ───────────────────────────────────────────────────────────────

export type EstadoCadena = 'VERIFICADA' | 'ALTERADA' | 'NO_SE';

export interface Veredicto {
  estado: EstadoCadena;
  /** Cuántas anotaciones se han comprobado de verdad. */
  comprobadas: number;
  /** La primera que no cuadra, si la hay. */
  rota?: { n: number; motivo: 'huella' | 'eslabon' | 'orden'; momento: string };
  /** Por qué no se sabe, cuando no se sabe. */
  porque?: string;
}

/**
 * Recorre las anotaciones EN ORDEN y comprueba dos cosas distintas:
 *   · que cada una tenga la huella que le toca por su contenido (nadie ha
 *     cambiado un dato), y
 *   · que apunte a la anterior (nadie ha quitado ni metido ninguna).
 *
 * Son dos fallos distintos y se informan distinto, porque no se arreglan igual:
 * `huella` es alguien editando una fila; `eslabon` es alguien borrándola.
 *
 * Devuelve NO_SE con una lista vacía. Una cadena vacía no está bien ni mal:
 * no hay nada que comprobar, y decir «VERIFICADA» ahí sería dar por bueno un
 * silencio.
 */
export function verificarCadena(filas: (Anotacion & { huella: string })[]): Veredicto {
  if (!filas.length) return { estado: 'NO_SE', comprobadas: 0, porque: 'No hay ninguna anotación que comprobar.' };

  let previa = filas[0].huella_previa === GENESIS ? GENESIS : filas[0].huella_previa;
  // Si el primer eslabón no es el génesis, se está verificando un trozo de en
  // medio: es legítimo (verificar el último mes no debería exigir recorrerlo
  // todo), pero entonces lo que se comprueba es ese trozo, no el principio.
  const desdeElPrincipio = filas[0].huella_previa === GENESIS;

  for (let i = 0; i < filas.length; i++) {
    const f = filas[i];
    if (i > 0 && f.n <= filas[i - 1].n) {
      return { estado: 'ALTERADA', comprobadas: i, rota: { n: f.n, motivo: 'orden', momento: f.momento } };
    }
    if (f.huella_previa !== previa) {
      return { estado: 'ALTERADA', comprobadas: i, rota: { n: f.n, motivo: 'eslabon', momento: f.momento } };
    }
    if (huellaDe(f) !== f.huella) {
      return { estado: 'ALTERADA', comprobadas: i, rota: { n: f.n, motivo: 'huella', momento: f.momento } };
    }
    previa = f.huella;
  }

  return {
    estado: 'VERIFICADA',
    comprobadas: filas.length,
    porque: desdeElPrincipio ? undefined : 'Comprobado un tramo, no desde el principio.',
  };
}

// ── EL RESUMEN DE UN DÍA (para el anclaje de la fase 2) ─────────────────────

/**
 * Raíz de Merkle de las huellas de un día: un solo número que resume muchos, y
 * que permite demostrar que UNA anotación concreta estaba dentro sin enseñar
 * las demás. Es lo único que sale de aquí hacia fuera.
 *
 * Con un número impar de hojas se duplica la última, que es lo que hace todo el
 * mundo. Se documenta porque quien reimplemente esto para auditarnos tiene que
 * hacer exactamente lo mismo o le saldrá otra raíz.
 */
export function raizMerkle(huellas: string[]): string | null {
  if (!huellas.length) return null;
  let nivel = huellas.map((h) => Buffer.from(h, 'hex'));
  while (nivel.length > 1) {
    const siguiente: Buffer[] = [];
    for (let i = 0; i < nivel.length; i += 2) {
      const a = nivel[i];
      const b = i + 1 < nivel.length ? nivel[i + 1] : nivel[i];
      siguiente.push(crypto.createHash('sha256').update(Buffer.concat([a, b])).digest());
    }
    nivel = siguiente;
  }
  return nivel[0].toString('hex');
}

// ── ESCRIBIR (esto sí toca la base de datos) ────────────────────────────────

export interface Hecho {
  clase: string;
  actor: string;
  asunto?: string | null;
  datos?: unknown;
}

/**
 * Anota un hecho. Lee la última huella, calcula la siguiente y escribe.
 *
 * Si dos peticiones lo hacen a la vez, las dos leen la misma última huella y la
 * segunda choca contra el índice único de `huella_previa` — que es justo lo que
 * se quiere: en vez de partir la cadena, reintenta leyendo la nueva última.
 * Tres intentos son de sobra; si a la tercera sigue chocando, lo que hay no es
 * concurrencia, es un problema, y entonces hay que enterarse.
 */
export async function anotar(db: any, hecho: Hecho, intentos = 3): Promise<{ n: number; huella: string }> {
  for (let intento = 1; intento <= intentos; intento++) {
    const ultima = await db.execute(sql`SELECT huella FROM registro_sellado ORDER BY n DESC LIMIT 1`);
    const previa = (ultima.rows[0] as any)?.huella ?? GENESIS;
    const siguiente = await db.execute(sql`SELECT nextval(pg_get_serial_sequence('registro_sellado', 'n')) AS n`);
    const n = Number((siguiente.rows[0] as any).n);

    const a: Anotacion = {
      n,
      momento: new Date().toISOString(),
      clase: hecho.clase,
      actor: hecho.actor,
      asunto: hecho.asunto ?? null,
      datos: hecho.datos ?? {},
      sal: crypto.randomBytes(16).toString('hex'),
      huella_previa: previa,
    };
    const huella = huellaDe(a);

    try {
      await db.execute(sql`
        INSERT INTO registro_sellado (n, momento, clase, actor, asunto, datos, sal, huella, huella_previa)
        VALUES (${a.n}, ${a.momento}, ${a.clase}, ${a.actor}, ${a.asunto},
                ${JSON.stringify(a.datos)}::jsonb, ${a.sal}, ${huella}, ${a.huella_previa})
      `);
      return { n, huella };
    } catch (e: any) {
      const choque = String(e?.cause?.message || e?.message || '').includes('registro_sellado_previa_idx');
      if (!choque || intento === intentos) throw e;
    }
  }
  throw new Error('No se pudo anotar: la cadena está recibiendo escrituras más rápido de lo que se puede encadenar.');
}

/** Lee un tramo para verificarlo. Sin límite por defecto a propósito: una
 *  verificación parcial que no dice que es parcial es una verificación que
 *  miente. Quien quiera un tramo, que lo pida. */
export async function leerCadena(db: any, desde = 1, hasta?: number) {
  const r = await db.execute(sql`
    SELECT n, momento, clase, actor, asunto, datos, sal, huella, huella_previa
    FROM registro_sellado
    WHERE n >= ${desde} ${hasta ? sql`AND n <= ${hasta}` : sql``}
    ORDER BY n ASC
  `);
  return (r.rows as any[]).map((f) => ({
    ...f,
    n: Number(f.n),
    momento: new Date(f.momento).toISOString(),
  })) as (Anotacion & { huella: string })[];
}

/** Calcula el resumen de un día. Calcular no es publicar: esto deja
 *  `publicado_en` a NULL, y hasta que alguien lo publique el verificador tiene
 *  que seguir diciendo «todavía no está anclado». */
export async function calcularAnclajeDelDia(db: any, dia: string) {
  const r = await db.execute(sql`
    SELECT n, huella FROM registro_sellado
    WHERE momento >= ${dia}::date AND momento < (${dia}::date + interval '1 day')
    ORDER BY n ASC
  `);
  const filas = r.rows as any[];
  if (!filas.length) return null;
  const raiz = raizMerkle(filas.map((f) => f.huella))!;
  await db.execute(sql`
    INSERT INTO registro_anclajes (dia, raiz, desde_n, hasta_n)
    VALUES (${dia}::date, ${raiz}, ${Number(filas[0].n)}, ${Number(filas[filas.length - 1].n)})
    ON CONFLICT (dia) DO NOTHING
  `);
  return { dia, raiz, desde_n: Number(filas[0].n), hasta_n: Number(filas[filas.length - 1].n), anotaciones: filas.length };
}
