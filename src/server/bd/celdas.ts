// ============================================================================
// TABLAS · LOS CUATRO ESTADOS DE UNA CELDA
// ============================================================================
// Una celda que sale de aquí NUNCA es un `null` pelado. Siempre dice en qué
// estado está, y esa es la pieza que sostiene las fases 5 a 8 enteras.
//
// POR QUÉ CUATRO Y NO DOS. En cuanto existan fórmulas hay tres formas
// distintas de no tener un número, y confundirlas produce datos incorrectos
// que parecen correctos:
//
//   vacia         nadie ha escrito nada ahí
//   ok            hay un valor
//   sin_calcular  es una columna calculada que todavía no se ha evaluado
//   error         se intentó calcular y no se pudo (dividir entre cero,
//                 sumar texto, una referencia que ya no existe)
//
// Si «error» se devolviera como 0, una suma de costes con una división entre
// cero dentro daría un total más bajo y perfectamente creíble. Nadie lo
// miraría dos veces. Ese es exactamente el fallo que este proyecto ya ha
// pagado caro en otras capas, y aquí se evita por construcción.
//
// Y por eso los cuatro estados existen DESDE LA FASE 1, cuando solo dos pueden
// darse: añadirlos después obliga a cambiar todos los clientes ya escritos.

export type Celda =
  | { estado: 'vacia' }
  | { estado: 'ok'; valor: string | number | boolean | string[] }
  | { estado: 'sin_calcular' }
  | { estado: 'error'; mensaje: string };

export const VACIA: Celda = { estado: 'vacia' };
export const SIN_CALCULAR: Celda = { estado: 'sin_calcular' };
export const error = (mensaje: string): Celda => ({ estado: 'error', mensaje });
export const valor = (v: any): Celda => ({ estado: 'ok', valor: v });

/** ¿Tiene un valor con el que se pueda operar? */
export const tieneValor = (c: Celda): c is { estado: 'ok'; valor: any } => c.estado === 'ok';

/**
 * El número de una celda para poder operar, o `null` si no lo hay.
 *
 * Devolver `null` y no `0` es deliberado y es la regla de toda la capa de
 * cálculo: quien llama TIENE que decidir explícitamente qué hace con la
 * ausencia. Una suma ignora los huecos; una división entre un hueco es un
 * error. Si esto devolviera 0, las dos harían lo mismo y una de las dos estaría
 * mal en silencio.
 */
export function numeroDe(c: Celda): number | null {
  if (c.estado !== 'ok') return null;
  if (typeof c.valor === 'number') return c.valor;
  if (typeof c.valor === 'boolean') return c.valor ? 1 : 0;
  return null;
}

/** Convierte el jsonb guardado de una fila en celdas etiquetadas. */
export function celdasDe(
  valores: Record<string, any>,
  columnas: Array<{ id: string; tipo: string }>,
): Record<string, Celda> {
  const salida: Record<string, Celda> = {};
  for (const c of columnas) {
    const v = valores?.[c.id];
    // Clave ausente = vacía. `false` y `0` SÍ son valores y no caen aquí.
    salida[c.id] = v === undefined || v === null ? VACIA : valor(v);
  }
  return salida;
}
