// ============================================================================
// TABLAS · FASE 5 — AGREGADOS: LEER A TRAVÉS DE UNA RELACIÓN
// ============================================================================
// Un agregado no lee su propia fila: lee las filas de OTRA tabla que apuntan a
// ella, o a las que ella apunta, y las resume. «Cuántos componentes tiene este
// proveedor», «cuánto suman sus costes», «cuál es el último ensayo».
//
// Esto es distinto de una fórmula, y por eso va en otra fase: una fórmula mira
// hacia dentro de su fila, un agregado mira hacia fuera a través de un enlace.
// Confundirlos es lo que hace que un motor de cálculo acabe sin saber en qué
// orden evaluar nada.
//
// ── LAS DOS DIRECCIONES ─────────────────────────────────────────────────────
// `origen`  — sigo MIS enlaces: «los componentes que YO he enlazado»
// `destino` — miro quién me apunta a MÍ: «los componentes que me han elegido
//             como proveedor»
// La segunda es la que hace falta más a menudo y es la que sería carísima sin
// el índice por (clase, destino, columna) que creó la fase 2.
//
// ── QUÉ HACE CADA OPERACIÓN CON LOS HUECOS, Y POR QUÉ ───────────────────────
// Ésta es la decisión que más se equivoca en las hojas de cálculo y la que más
// caro sale:
//
//   contar        cuenta FILAS enlazadas, tenga o no valor la celda
//   contar_llenas cuenta solo las que tienen valor
//   suma          IGNORA los huecos. Sumar 10 + vacío es 10, no un error:
//                 un proveedor con un componente sin precio no tiene una suma
//                 rota, tiene una suma de lo que se sabe
//   media         divide entre las que TIENEN valor, no entre todas. Contar los
//                 huecos como ceros hunde la media y nadie lo nota
//   minimo/maximo ignoran huecos
//   lista         enseña lo que hay, en orden
//
// Y en todas: SI NO HAY NINGUNA FILA ENLAZADA, el resultado es VACÍO, no cero.
// Un proveedor sin componentes no tiene «0 €» de coste: no tiene coste. Que la
// diferencia sobreviva hasta la pantalla es justamente para lo que existen los
// cuatro estados de celda.
import { sql } from 'drizzle-orm';
import { type Celda, VACIA, valor, error } from './celdas';

export const OPERACIONES = [
  'contar', 'contar_llenas', 'contar_vacias',
  'suma', 'media', 'minimo', 'maximo',
  'lista', 'unicos',
  'y_todos', 'o_alguno',
] as const;
export type Operacion = typeof OPERACIONES[number];

export type ConfigAgregado = {
  /** La columna de relación por la que se mira. */
  columna_relacion: string;
  /** Hacia dónde: siguiendo mis enlaces, o mirando quién me apunta. */
  direccion?: 'origen' | 'destino';
  /** Qué columna de la otra tabla se resume. Para `contar` puede faltar. */
  columna_destino?: string;
  operacion: Operacion;
};

/**
 * Las filas relacionadas con una fila dada.
 *
 * Se piden de una vez para TODAS las filas de la tabla, no una por fila: con
 * 500 proveedores, ir de uno en uno son 500 consultas cada vez que se pinta.
 */
export async function relacionadasDe(
  db: any,
  opciones: { filaIds: string[]; columnaRelacion: string; direccion: 'origen' | 'destino' },
): Promise<Record<string, string[]>> {
  const { filaIds, columnaRelacion, direccion } = opciones;
  const salida: Record<string, string[]> = {};
  if (!filaIds.length) return salida;
  const lista = filaIds.join(',');

  if (direccion === 'origen') {
    // Mis enlaces: yo soy el origen y lo enlazado es el destino.
    const r = await db.execute(sql`
      SELECT fila_origen AS mia, destino_id AS otra FROM bd_enlaces
      WHERE columna_id = ${columnaRelacion} AND clase = 'fila'
        AND fila_origen = ANY(string_to_array(${lista}, ','))
      ORDER BY orden
    `);
    for (const f of r.rows as any[]) (salida[f.mia] ||= []).push(f.otra);
  } else {
    // Quién me apunta: yo soy el destino. Ésta es la consulta que el índice de
    // la fase 2 existe para hacer barata.
    const r = await db.execute(sql`
      SELECT destino_id AS mia, fila_origen AS otra FROM bd_enlaces
      WHERE columna_id = ${columnaRelacion} AND clase = 'fila'
        AND destino_id = ANY(string_to_array(${lista}, ','))
      ORDER BY orden
    `);
    for (const f of r.rows as any[]) (salida[f.mia] ||= []).push(f.otra);
  }
  return salida;
}

/** Los valores crudos de una columna, por fila. */
export async function valoresDe(
  db: any,
  filaIds: string[],
  columnaId: string,
): Promise<Record<string, any>> {
  const salida: Record<string, any> = {};
  if (!filaIds.length) return salida;
  const r = await db.execute(sql`
    SELECT id, valores FROM bd_filas
    WHERE id = ANY(string_to_array(${filaIds.join(',')}, ','))
      AND archived_at IS NULL AND deleted_at IS NULL
  `);
  for (const f of r.rows as any[]) salida[f.id] = (f.valores || {})[columnaId];
  return salida;
}

/**
 * Resume una lista de valores.
 *
 * `valores` trae `undefined` donde la celda estaba vacía: se conserva a
 * propósito, porque `contar` y `media` necesitan saber cuántas había en total y
 * cuántas tenían algo. Filtrarlos antes de llegar aquí perdería esa diferencia.
 */
export function resumir(operacion: Operacion, valores: any[]): Celda {
  const llenas = valores.filter(v => v !== undefined && v !== null);
  const numeros = llenas
    .map(v => (typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : null))
    .filter((n): n is number => n !== null);

  switch (operacion) {
    case 'contar':        return valor(valores.length);
    case 'contar_llenas': return valor(llenas.length);
    case 'contar_vacias': return valor(valores.length - llenas.length);

    case 'suma':
      // Sin ninguna fila enlazada NO es cero: es vacío. Un proveedor sin
      // componentes no tiene 0 € de coste, no tiene coste.
      if (!valores.length) return VACIA;
      // Con filas pero ninguna con número, tampoco: eso es «no se sabe».
      if (!numeros.length) return VACIA;
      return valor(Number(numeros.reduce((a, b) => a + b, 0).toFixed(10)));

    case 'media':
      if (!numeros.length) return VACIA;
      // Dividido entre las que TIENEN valor. Contar los huecos como ceros
      // hunde la media y no lo nota nadie.
      return valor(Number((numeros.reduce((a, b) => a + b, 0) / numeros.length).toFixed(10)));

    case 'minimo': return numeros.length ? valor(Math.min(...numeros)) : VACIA;
    case 'maximo': return numeros.length ? valor(Math.max(...numeros)) : VACIA;

    case 'lista':
      if (!llenas.length) return VACIA;
      return valor(llenas.map(v => String(v)).join(', '));

    case 'unicos': {
      if (!llenas.length) return VACIA;
      return valor([...new Set(llenas.map(v => String(v)))].join(', '));
    }

    // «Todas cumplen» y «alguna cumple». Sobre casillas es lo natural:
    // «¿están todos los ensayos aprobados?».
    case 'y_todos':
      if (!llenas.length) return VACIA;
      return valor(llenas.every(v => v === true || v === 1));
    case 'o_alguno':
      if (!llenas.length) return VACIA;
      return valor(llenas.some(v => v === true || v === 1));

    default:
      return error(`Operación desconocida: ${operacion}`);
  }
}

/**
 * Calcula una columna de agregado para todas las filas de una tabla.
 *
 * Devuelve una celda por fila. Tres consultas en total, sean 10 filas o 5.000:
 * los enlaces, los valores de la otra tabla, y ya.
 */
export async function calcularAgregado(
  db: any,
  opciones: {
    filaIds: string[];
    config: ConfigAgregado;
    /** Para resumir una columna CALCULADA de la otra tabla hay que calcular esa
     *  tabla primero. Lo hace quien llama (`bd/calculo.ts`), que es quien sabe
     *  ordenar y cortar la recursión. */
    calcularOtra?: (tablaId: string, profundidad: number) => Promise<Record<string, Record<string, Celda>> | { error: string }>;
  },
): Promise<Record<string, Celda>> {
  const { filaIds, config } = opciones;
  const salida: Record<string, Celda> = {};

  if (!config?.columna_relacion) {
    for (const id of filaIds) salida[id] = error('Esta columna no dice por qué relación mirar.');
    return salida;
  }
  if (!OPERACIONES.includes(config.operacion)) {
    for (const id of filaIds) salida[id] = error(`Operación desconocida: ${config.operacion}`);
    return salida;
  }

  const relacionadas = await relacionadasDe(db, {
    filaIds,
    columnaRelacion: config.columna_relacion,
    direccion: config.direccion === 'destino' ? 'destino' : 'origen',
  });

  const cuenta = new Set<string>();
  for (const ids of Object.values(relacionadas)) ids.forEach(i => cuenta.add(i));

  // `contar` no necesita mirar ninguna columna de la otra tabla.
  const necesitaValores = config.operacion !== 'contar' && !!config.columna_destino;
  let valores: Record<string, any> = {};

  if (necesitaValores) {
    // ¿La columna que se resume es CALCULADA? Entonces su valor no está en el
    // jsonb de la fila: hay que calcular la otra tabla. Éste es el caso del
    // «dinero comprometido que suma un coste total que es una fórmula».
    const c = await db.execute(sql`
      SELECT tipo, tabla_id FROM bd_columnas WHERE id = ${config.columna_destino!} AND archived_at IS NULL
    `);
    const destino = c.rows[0] as any;
    const calculada = destino && ['formula', 'agregado', 'condicional'].includes(destino.tipo);

    if (calculada && opciones.calcularOtra) {
      const otras = await opciones.calcularOtra(destino.tabla_id, 0);
      // `typeof === 'string'` y no `'error' in`: sin `strict`, TypeScript no
      // estrecha la unión y `otras.error` acabaría tipado como el propio mapa.
      const fallo = (otras as any)?.error;
      if (typeof fallo === 'string') {
        const salidaErr: Record<string, Celda> = {};
        for (const id of filaIds) salidaErr[id] = error(fallo);
        return salidaErr;
      }
      const calculadas = otras as Record<string, Record<string, Celda>>;
      for (const filaId of cuenta) {
        const celda = (calculadas[filaId] || {})[config.columna_destino!];
        // Solo cuentan las que dieron un valor. Una celda de la otra tabla que
        // dio error no se convierte aquí en un cero: se queda fuera del resumen,
        // igual que un hueco.
        valores[filaId] = celda && celda.estado === 'ok' ? celda.valor : undefined;
      }
    } else {
      valores = await valoresDe(db, [...cuenta], config.columna_destino!);
    }
  }

  for (const id of filaIds) {
    const otras = relacionadas[id] || [];
    if (config.operacion === 'contar') { salida[id] = valor(otras.length); continue; }
    if (!config.columna_destino) {
      salida[id] = error('Esta columna no dice qué campo resumir de la otra tabla.');
      continue;
    }
    salida[id] = resumir(config.operacion, otras.map(o => valores[o]));
  }
  return salida;
}
