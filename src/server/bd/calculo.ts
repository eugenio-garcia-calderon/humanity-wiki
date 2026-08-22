// ============================================================================
// TABLAS · FASE 8 — EL ORDEN DE CÁLCULO Y LOS CICLOS
// ============================================================================
// Con fórmulas y agregados sueltos no basta: hace falta saber EN QUÉ ORDEN se
// calculan. El caso que lo obliga es el del criterio de aceptación —«el dinero
// comprometido de un proveedor suma el coste total de sus componentes, que a su
// vez es una fórmula»— o sea UN CÁLCULO QUE AGREGA OTRO CÁLCULO.
//
// Si cada columna se evaluara cuando le toca pintarse, esa suma leería el coste
// total antes de que existiera y devolvería vacío. No daría error: daría un
// número más bajo y perfectamente creíble.
//
// ── CÓMO SE ORDENA ──────────────────────────────────────────────────────────
// Cada columna calculada declara de quién depende: una fórmula, de las columnas
// que nombra; un agregado, de la columna que resume en la otra tabla. Con eso
// sale un grafo, y se recorre en orden topológico: nadie se evalúa antes que
// aquello de lo que depende.
//
// ── LOS CICLOS SE RECHAZAN AL DEFINIR, NO AL EVALUAR ────────────────────────
// «A depende de B, B depende de A» no tiene respuesta. Si se descubriera al
// evaluar, sería un bucle infinito en producción — el servidor dejaría de
// responder y nadie sabría por qué.
// Así que se comprueba al CREAR o MODIFICAR la columna, cuando hay una persona
// delante a quien decírselo y todavía no hay datos que dependan de ello.
import { sql } from 'drizzle-orm';
import { type Celda, error, celdasDe } from './celdas';
import { compilar, evaluar, AMBIGUO, type Contexto } from './formulas';
import { calcularAgregado, type ConfigAgregado } from './agregados';

export type ColumnaCalc = {
  id: string;
  nombre: string;
  tipo: string;
  config: any;
};

/** ¿Es una columna que se calcula, en vez de guardarse? */
export const esCalculada = (tipo: string) => tipo === 'formula' || tipo === 'agregado' || tipo === 'condicional';

/**
 * De qué columnas de ESTA tabla depende una columna calculada.
 *
 * Para un agregado, la dependencia local es su columna de relación: los datos
 * que resume viven en otra tabla y no participan de este orden.
 */
export function dependenciasDe(col: ColumnaCalc, porNombre: Record<string, string>): string[] {
  if (col.tipo === 'formula' || col.tipo === 'condicional') {
    const texto = col.tipo === 'formula'
      ? String(col.config?.formula || '')
      : reglasAFormula(col.config);
    const c = compilar(texto);
    if ('error' in c) return [];
    const ids: string[] = [];
    for (const nombre of c.columnas) {
      const id = porNombre[nombre.toLowerCase()];
      // LA AUTO-REFERENCIA SE INCLUYE. Antes se filtraba (`id !== col.id`) y eso
      // hacía INVISIBLE el ciclo más simple de todos: una columna que se nombra
      // a sí misma. Se aceptaba al crearla y luego no había forma de calcularla.
      if (id) ids.push(id);
    }
    return [...new Set(ids)];
  }
  if (col.tipo === 'agregado') {
    // Solo hay dependencia LOCAL si el agregado sigue mis propios enlaces. Si
    // mira quién me apunta, la columna de relación vive en la otra tabla y no
    // participa del orden de ésta.
    if (col.config?.direccion === 'destino') return [];
    const rel = col.config?.columna_relacion;
    return rel && porNombre ? [rel] : (rel ? [rel] : []);
  }
  return [];
}

/**
 * Una columna CONDICIONAL es azúcar sobre una fórmula: reglas «si esto,
 * entonces aquello» que se traducen a `SI(...; ...; SI(...))` anidados.
 *
 * Se traduce en vez de evaluarse aparte para que haya UN SOLO motor de cálculo.
 * Dos motores es dos sitios donde arreglar el mismo fallo, y donde «vacío» puede
 * acabar significando cosas distintas.
 */
export function reglasAFormula(config: any): string {
  const reglas: Array<{ si: string; entonces: string }> = Array.isArray(config?.reglas) ? config.reglas : [];
  const porDefecto = config?.si_no ?? '""';
  if (!reglas.length) return String(porDefecto);
  // De atrás hacia delante, para que la primera regla quede la más externa: la
  // primera que se cumple es la que manda, como en una lista de prioridades.
  let salida = String(porDefecto);
  for (let i = reglas.length - 1; i >= 0; i--) {
    const r = reglas[i];
    salida = `SI(${r.si}; ${r.entonces}; ${salida})`;
  }
  return salida;
}

/**
 * Ordena las columnas calculadas para que nadie vaya antes que sus dependencias.
 *
 * Devuelve el orden, o los ciclos encontrados. El algoritmo es Kahn: se van
 * sacando las que ya no dependen de nada pendiente; lo que quede al final es,
 * por definición, un ciclo.
 */
export function ordenar(
  columnas: ColumnaCalc[],
  porNombre: Record<string, string>,
): { orden: string[]; ciclo?: string[] } {
  const calc = columnas.filter(c => esCalculada(c.tipo));
  const ids = new Set(calc.map(c => c.id));
  const nombreDe = new Map(columnas.map(c => [c.id, c.nombre]));

  const deps = new Map<string, string[]>();
  for (const c of calc) {
    // Solo cuentan las dependencias que son a su vez CALCULADAS: una fórmula
    // que lee una columna de texto no tiene que esperar a nadie.
    deps.set(c.id, dependenciasDe(c, porNombre).filter(d => ids.has(d)));
  }

  const orden: string[] = [];
  const pendientes = new Set(calc.map(c => c.id));
  let progreso = true;
  while (pendientes.size && progreso) {
    progreso = false;
    for (const id of [...pendientes]) {
      if ((deps.get(id) || []).every(d => !pendientes.has(d))) {
        orden.push(id); pendientes.delete(id); progreso = true;
      }
    }
  }
  if (pendientes.size) {
    // LAS QUE SÍ SE PUEDEN CALCULAR, SE CALCULAN. Una columna en ciclo no debe
    // callar a las demás: antes, un solo cálculo circular dejaba la tabla
    // entera en blanco y parecía que no funcionaba nada. Se devuelve el orden
    // de las sanas y la lista de las enfermas, y cada una dice lo suyo.
    return { orden, ciclo: [...pendientes].map(id => nombreDe.get(id) || id) };
  }
  return { orden };
}

/**
 * ¿Meter esta columna crearía un ciclo?
 *
 * Se llama AL DEFINIR la columna. Devuelve el mensaje a enseñar, o `null`.
 */
export function detectaCiclo(
  columnas: ColumnaCalc[],
  nueva: ColumnaCalc,
  porNombre: Record<string, string>,
): string | null {
  const conLaNueva = [...columnas.filter(c => c.id !== nueva.id), nueva];
  const r = ordenar(conLaNueva, porNombre);
  // Solo importa si la columna NUEVA es una de las que quedan en el ciclo: si
  // el ciclo ya existía y no la toca, no es culpa suya y bloquearla no lo
  // arreglaría.
  if (r.ciclo && r.ciclo.includes(nueva.nombre)) {
    return `Eso crearía un cálculo circular: ${r.ciclo.join(' → ')} se necesitan entre sí y ninguno podría calcularse.`;
  }
  return null;
}

/**
 * Calcula TODAS las columnas calculadas de una tabla, en el orden correcto.
 *
 * Devuelve, por fila, la celda de cada columna calculada. Se hace de una vez
 * para toda la tabla y no fila a fila porque los agregados necesitan mirar la
 * otra tabla entera: hacerlo por filas sería una consulta por fila.
 */
/**
 * Calcula las columnas calculadas de OTRA tabla, para poder agregarlas.
 *
 * `profundidad` corta la recursión: la tabla A agrega la B, que agrega la A. Un
 * ciclo ENTRE TABLAS no lo detecta el grafo de una sola tabla, así que aquí se
 * pone un tope y se dice, en vez de dejar que el servidor se quede dando
 * vueltas sin responder.
 */
export async function calcularOtraTabla(
  db: any,
  tablaId: string,
  profundidad: number,
): Promise<Record<string, Record<string, Celda>> | { error: string }> {
  if (profundidad > 3) {
    return { error: 'Hay tablas que se resumen entre sí en círculo y no se pueden calcular.' };
  }
  const c = await db.execute(sql`
    SELECT id, nombre, tipo, opciones, config FROM bd_columnas
    WHERE tabla_id = ${tablaId} AND archived_at IS NULL ORDER BY orden, created_at
  `);
  const columnas = c.rows as any[];
  if (!columnas.some(x => esCalculada(x.tipo))) return {};

  const f = await db.execute(sql`
    SELECT id, valores FROM bd_filas
    WHERE tabla_id = ${tablaId} AND archived_at IS NULL AND deleted_at IS NULL
  `);
  const filas = (f.rows as any[]).map(x => ({
    id: x.id,
    celdas: celdasDe(x.valores || {}, columnas),
  }));
  const r = await calcularTabla(db, { columnas, filas, profundidad: profundidad + 1 });
  return r.porFila;
}

export async function calcularTabla(
  db: any,
  opciones: {
    columnas: ColumnaCalc[];
    filas: Array<{ id: string; celdas: Record<string, Celda> }>;
    profundidad?: number;
  },
): Promise<{ porFila: Record<string, Record<string, Celda>>; ciclo?: string[] }> {
  const { columnas, filas } = opciones;
  // ══ DOS COLUMNAS CON EL MISMO NOMBRE NO SE RESUELVEN A LA BUENA ══════════
  // (2026-08-22, encontrado revisando las tablas.)
  //
  // Las fórmulas nombran columnas por su nombre. Si dos se llaman «Importe»,
  // este mapa se quedaba con la última y `{Importe}` calculaba en silencio con
  // una de las dos —la que ganara el orden— sin que nada lo dijera. Es el mismo
  // fallo que el `grupos[0]` de agosto: elegir por el usuario cuando no se sabe
  // produce un resultado creíble y equivocado.
  //
  // Ahora un nombre repetido se marca con `AMBIGUO` y el evaluador contesta
  // «hay dos columnas que se llaman así». Las rutas ya impiden crear el
  // segundo, pero esto tiene que aguantar igual: las tablas que ya existían
  // pudieron quedarse con nombres repetidos, y ahí lo honesto es decirlo, no
  // seguir eligiendo.
  const porNombre: Record<string, string> = {};
  for (const c of columnas) {
    const clave = c.nombre.toLowerCase();
    porNombre[clave] = clave in porNombre ? AMBIGUO : c.id;
  }

  const r = ordenar(columnas, porNombre);
  const porFila: Record<string, Record<string, Celda>> = {};
  for (const f of filas) porFila[f.id] = {};
  const porId = new Map(columnas.map(c => [c.id, c]));

  // Las que están en ciclo dicen que lo están; las demás se calculan igual.
  if (r.ciclo?.length) {
    const msg = `Cálculo circular: ${r.ciclo.join(' → ')}`;
    const idsEnCiclo = columnas.filter(c => r.ciclo!.includes(c.nombre)).map(c => c.id);
    for (const f of filas) for (const id of idsEnCiclo) porFila[f.id][id] = error(msg);
  }

  for (const colId of r.orden) {
    const col = porId.get(colId)!;

    if (col.tipo === 'agregado') {
      const celdas = await calcularAgregado(db, {
        filaIds: filas.map(f => f.id),
        config: (col.config || {}) as ConfigAgregado,
        // EL CASO QUE OBLIGA A TODO ESTO: si lo que se resume es a su vez una
        // columna calculada de la otra tabla, hay que calcular la otra tabla
        // primero. Sin esto, sumar un «coste total» que es una fórmula devolvía
        // vacío — y vacío es exactamente lo que no se distingue de «no hay
        // componentes». La profundidad la corta `calcularOtraTabla`.
        calcularOtra: (tablaId: string, prof: number) => calcularOtraTabla(db, tablaId, prof),
      });
      for (const f of filas) porFila[f.id][colId] = celdas[f.id] ?? error('No se pudo calcular.');
      continue;
    }

    const texto = col.tipo === 'formula'
      ? String(col.config?.formula || '')
      : reglasAFormula(col.config);
    const compilada = compilar(texto);

    for (const f of filas) {
      if ('error' in compilada) { porFila[f.id][colId] = error(compilada.error); continue; }
      // El contexto incluye lo ya calculado en esta misma pasada: por eso el
      // orden importa y por eso un cálculo puede leer otro cálculo.
      const ctx: Contexto = { celdas: { ...f.celdas, ...porFila[f.id] }, porNombre };
      porFila[f.id][colId] = evaluar(compilada.nodo, ctx);
    }
  }

  return r.ciclo?.length ? { porFila, ciclo: r.ciclo } : { porFila };
}
