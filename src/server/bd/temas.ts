import { sql } from 'drizzle-orm';
import { nombresDeFilas } from './enlaces';

// ============================================================================
// EL ÁRBOL DE TEMAS (2026-10-22, Eugenio: «un tipo de columna Tema que apunte
// a ese árbol y calcule la herencia; que la red de cada tema sume su subárbol»)
// ============================================================================
// No hay tabla de temas aparte. Un TEMA es una fila de una base de datos con
// «subelementos» (la relación consigo misma madre ↔ hijos, `bd.ts`):
//
//     Sistemas de la Humanidad
//       Energía
//         Energía solar
//           Fotovoltaica
//
// Una columna «Tema» es una relación normal (`config.tema = true`) hacia esa
// tabla. Lo que la hace distinta es la HERENCIA: un proyecto colgado de
// «Fotovoltaica» también está en «Energía solar» y en «Energía», sin que nadie
// lo enlace dos veces. Se etiqueta lo más concreto y sube solo.
//
//   - Al leer la tabla, cada tema enlazado lleva su `ruta` (de la raíz a su
//     madre) y la celda sus `heredados`: filtrar por «Energía» encuentra lo de
//     «Fotovoltaica» (`vistas.ts`).
//   - La red de una página de tema (`redDePagina`) suma lo de sus subtemas.
//
// Con tope de profundidad en todo: un círculo que se hubiera colado (la API lo
// impide, pero los datos viejos no pasaron por ella) no deja nada dando vueltas.

const PROFUNDIDAD = 30;

/** La columna «Elemento madre» de una tabla, si tiene subelementos. */
export async function columnaMadreDe(db: any, tablaId: string): Promise<string | null> {
  const r = await db.execute(sql`
    SELECT id FROM bd_columnas
    WHERE tabla_id = ${tablaId} AND tipo = 'relacion' AND config->>'rol' = 'madre' AND archived_at IS NULL
    ORDER BY orden LIMIT 1
  `);
  return (r.rows[0] as any)?.id || null;
}

export type Escalon = { id: string; etiqueta: string };

/** Los antepasados de varias filas, de la RAÍZ a la madre (sin la fila). */
export async function rutasDe(db: any, colMadre: string, ids: string[]): Promise<Map<string, Escalon[]>> {
  const salida = new Map<string, Escalon[]>();
  const unicos = [...new Set(ids)].filter(Boolean);
  if (!unicos.length) return salida;
  const r = await db.execute(sql`
    WITH RECURSIVE sube(origen, id, nivel) AS (
      SELECT fila_origen, destino_id, 1 FROM bd_enlaces
      WHERE columna_id = ${colMadre} AND clase = 'fila' AND fila_origen = ANY(string_to_array(${unicos.join(',')}, ','))
      UNION
      SELECT s.origen, e.destino_id, s.nivel + 1 FROM bd_enlaces e JOIN sube s ON e.fila_origen = s.id
      WHERE e.columna_id = ${colMadre} AND e.clase = 'fila' AND s.nivel < ${PROFUNDIDAD}
    )
    SELECT s.origen, s.id, s.nivel FROM sube s
    JOIN bd_filas f ON f.id = s.id AND f.deleted_at IS NULL
    ORDER BY s.origen, s.nivel DESC
  `);
  const filas = r.rows as any[];
  const nombres = await nombresDeFilas(db, filas.map(x => x.id));
  for (const x of filas) {
    const lista = salida.get(x.origen) || [];
    if (!lista.some(e => e.id === x.id)) lista.push({ id: x.id, etiqueta: nombres.get(x.id) || 'Sin título' });
    salida.set(x.origen, lista);
  }
  return salida;
}

/** Todos los descendientes de una fila (sus subtemas, los de estos…), con su madre. */
export async function descendientesDe(db: any, colMadre: string, filaId: string): Promise<Array<{ id: string; madre: string; nivel: number }>> {
  const r = await db.execute(sql`
    WITH RECURSIVE baja(id, madre, nivel) AS (
      SELECT fila_origen, destino_id, 1 FROM bd_enlaces
      WHERE columna_id = ${colMadre} AND clase = 'fila' AND destino_id = ${filaId}
      UNION
      SELECT e.fila_origen, e.destino_id, b.nivel + 1 FROM bd_enlaces e JOIN baja b ON e.destino_id = b.id
      WHERE e.columna_id = ${colMadre} AND e.clase = 'fila' AND b.nivel < ${PROFUNDIDAD}
    )
    SELECT b.id, b.madre, min(b.nivel) AS nivel FROM baja b
    JOIN bd_filas f ON f.id = b.id AND f.deleted_at IS NULL AND COALESCE(f.oculta, false) = false
    WHERE b.id <> ${filaId}
    GROUP BY b.id, b.madre
  `);
  return (r.rows as any[]).map(x => ({ id: x.id, madre: x.madre, nivel: Number(x.nivel) }));
}

// ── LA SUGERENCIA DEL TEMA MÁS CONCRETO (fase 4) ────────────────────────────
// Primero sin modelo: las palabras de la entrada contra el nombre de cada tema
// y el de sus antepasados. Gana el tema más PROFUNDO que encaja (Fotovoltaica
// antes que Energía); un antepasado que encaja suma, pero solo como contexto.
// Es instantáneo, gratis y explicable («por: solar, paneles»). Si hay empate o
// nada encaja, `bd.ts` puede preguntar a la IA de la casa entre los mejores.

const VACIAS = new Set(('a al algo algún alguna como con contra cual cuando de del desde donde dos el ella ellas ellos en entre era es esa ese eso esta este esto fue ha hay la las le les lo los más mas me mi muy no nos o otra otro para pero poco por que qué se sea ser si sí sin sobre su sus también tan te tiene todo tras tu un una uno unos unas y ya the of and for to in on with sistema sistemas desarrollo proyecto proyectos nuevo nueva mejora mejoras').split(' '));

export const palabras = (t: string) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9ñ]+/).filter(p => p.length > 2 && !VACIAS.has(p));

/** Una raíz muy simple: «solares» y «solar» son lo mismo para esto. */
const raiz = (p: string) => p.replace(/(es|s)$/, '').slice(0, 7);

export type Candidato = { id: string; nombre: string; ruta: string[]; profundidad: number; puntos: number; por: string[] };

export function puntuarTemas(texto: string, temas: Array<{ id: string; nombre: string; ruta: string[] }>): Candidato[] {
  const enTexto = new Set(palabras(texto).map(raiz));
  return temas.map(t => {
    const propias = [...new Set(palabras(t.nombre).map(raiz))];
    const coinciden = propias.filter(p => enTexto.has(p));
    const deArriba = [...new Set(t.ruta.flatMap(n => palabras(n).map(raiz)))].filter(p => enTexto.has(p) && !coinciden.includes(p));
    // Lo propio pesa mucho más que lo heredado, y la profundidad desempata.
    const puntos = coinciden.length ? coinciden.length * 10 + deArriba.length * 2 + t.ruta.length : 0;
    return { id: t.id, nombre: t.nombre, ruta: t.ruta, profundidad: t.ruta.length, puntos, por: coinciden };
  }).filter(c => c.puntos > 0).sort((a, b) => b.puntos - a.puntos || b.profundidad - a.profundidad);
}
