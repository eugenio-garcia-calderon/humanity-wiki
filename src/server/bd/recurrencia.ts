// ============================================================================
// TABLAS · FILAS QUE SE REPITEN (2026-10-05, carril «bd»)
// ============================================================================
// Dos maneras, como en Notion y en cualquier gestor de tareas:
//
//   al_completar  Al marcar la fila como hecha nace la siguiente, N días,
//                 semanas o meses después de su fecha. La hecha se queda como
//                 está —es historia— y la repetición pasa a la nueva.
//   calendario    La fila es una PLANTILLA: cada N días, semanas o meses se
//                 crea una copia con la fecha que toca, se complete o no la
//                 anterior. La plantilla no cambia; solo avanza su `proxima`.
//
// Aquí solo viven las cuentas (sumar un periodo a una fecha, saber si una
// celda dice «hecho», validar lo que llega). Lo que toca la base de datos
// está en `bd.ts`, junto a los permisos.

export type Recurrencia = {
  cada: number;
  unidad: 'dia' | 'semana' | 'mes';
  modo: 'al_completar' | 'calendario';
  columna_fecha?: string | null;
  columna_hecho?: string | null;
  /** Para una selección: qué opción significa «hecho». */
  valor_hecho?: string | null;
  /** Solo en `calendario`: la fecha de la próxima copia, AAAA-MM-DD. */
  proxima?: string | null;
  /** El día del mes de partida (1-31), para que «cada mes desde el 31» no se
   *  quede en el 30 para siempre después de pasar por un mes corto. */
  ancla?: number | null;
};

const pad = (n: number) => String(n).padStart(2, '0');
export const hoyIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

/**
 * Suma N días, semanas o meses a «AAAA-MM-DD».
 *
 * LOS MESES NO SE DESBORDAN: el 31 de enero más un mes es el 28 (o 29) de
 * febrero, no el 3 de marzo. Es lo que espera quien pone «el último día de
 * cada mes», y lo que hace `Date` por su cuenta es justo lo contrario.
 */
export function sumarPeriodo(iso: string, cada: number, unidad: Recurrencia['unidad'], ancla?: number | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  let a = Number(m[1]), mes = Number(m[2]), d = Number(m[3]);
  if (unidad === 'mes') {
    const total = a * 12 + (mes - 1) + cada;
    a = Math.floor(total / 12); mes = (total % 12) + 1;
    const ultimo = new Date(Date.UTC(a, mes, 0)).getUTCDate();
    // Con ancla, el día de partida manda: 31 ene → 28 feb → 31 mar, y no 28 mar.
    return `${a}-${pad(mes)}-${pad(Math.min(ancla && ancla >= 1 && ancla <= 31 ? ancla : d, ultimo))}`;
  }
  const f = new Date(Date.UTC(a, mes - 1, d + cada * (unidad === 'semana' ? 7 : 1)));
  return f.toISOString().slice(0, 10);
}

/** Lo que llega del cliente, limpio; o el motivo por el que no vale. */
export function validarRecurrencia(d: any): Recurrencia | { error: string } {
  const cada = Math.round(Number(d?.cada));
  if (!Number.isFinite(cada) || cada < 1 || cada > 365) return { error: 'Cada cuánto: un número entre 1 y 365.' };
  if (!['dia', 'semana', 'mes'].includes(d?.unidad)) return { error: 'La unidad es día, semana o mes.' };
  if (!['al_completar', 'calendario'].includes(d?.modo)) return { error: 'El modo es «al completar» o «en calendario».' };
  if (d.modo === 'al_completar' && !d.columna_hecho) return { error: 'Di qué propiedad marca la fila como hecha.' };
  return {
    cada, unidad: d.unidad, modo: d.modo,
    columna_fecha: d.columna_fecha ? String(d.columna_fecha) : null,
    columna_hecho: d.columna_hecho ? String(d.columna_hecho) : null,
    valor_hecho: d.valor_hecho ? String(d.valor_hecho) : null,
    proxima: d.proxima ? String(d.proxima) : null,
    ancla: Number.isFinite(Number(d.ancla)) && Number(d.ancla) >= 1 && Number(d.ancla) <= 31 ? Math.round(Number(d.ancla)) : null,
  };
}

/** ¿Dice esta celda que la fila está hecha? Una casilla marcada, o la opción
 *  elegida como «hecho»; sin elegir, una opción que se llame Hecho,
 *  Completado, Terminado o Done. */
export function diceHecho(valor: any, columna: { tipo: string; opciones?: any[] }, r: Recurrencia): boolean {
  if (columna.tipo === 'casilla') return valor === true;
  if (columna.tipo === 'seleccion') {
    if (r.valor_hecho) return valor === r.valor_hecho;
    const o = (columna.opciones || []).find((x: any) => x?.id === valor);
    return !!o && /^(hech|complet|termin|acabad|cerrad|done|finaliz)/i.test(String(o.label).trim());
  }
  return false;
}
