// ============================================================================
// LAS PUNTUACIONES DE OBJETIVO DE UN TERRITORIO (movido aquí el 2026-08-22)
// ============================================================================
// Son los catorce porcentajes que se ven en la portada de objetivos, en el
// mapa, en la ficha de un territorio y en el lienzo del explorador. Vivían
// dentro de `server.ts`, encerradas en el ámbito de `registerRoutes`, y por eso
// nadie más podía llamarlas.
//
// ── POR QUÉ SE HA MOVIDO ────────────────────────────────────────────────────
// Porque la IA responde sobre esos mismos números y no tenía forma de saber de
// dónde salen. La alternativa era que el asistente clasificara por su cuenta
// las observaciones del territorio… y eso daba «medido» para España mientras la
// pantalla, mirando los porcentajes de objetivo, decía «simulado». Dos
// respuestas distintas a la misma pregunta, que es el fallo de esta casa.
//
// La función es PURA: recibe las puntuaciones y los pesos ya leídos y no toca
// la base de datos. Quien la llame trae los datos; `server.ts` los cachea y el
// asistente los pide para un territorio.

import { objectives as seedObjectives } from '../data/seed.js';
import { OBJECTIVE_ID_BY_KEY } from './objectiveIds.js';
import { origenDeVarios, peorOrigen, type OrigenDelDato } from './origenDelDato.js';

export type MetaIndicador = { id: string; objectiveId: string; weight: number | null };

// Keys that have historical mock progress data in src/data/seed.ts and keep
// defaulting to a neutral 50 when a territory isn't listed there (legacy
// behavior, preserved as-is). Newer objectives have no mock data at all, so
// they correctly report "Sin datos" (null) until real data is added — see
// the 2026-08-03 decision in memory/03_DECISIONS.md about never fabricating
// scores for objectives that don't have any.
export const LEGACY_MOCK_OBJECTIVE_KEYS = new Set(['agua', 'alimentacion', 'vivienda', 'salud', 'convivencia', 'ecosistemas']);

// Helper to retrieve objective scores for any territory ID. Loops over every
// objective in OBJECTIVE_ID_BY_KEY instead of hardcoding one lookup per
// objective, so adding a new objective there is enough on its own — no
// changes needed here.
//
// Score priority per objective: (1) a weighted average of that objective's own
// indicators' indicator_observations for this territory, WHEN THOSE
// OBSERVATIONS ARE REAL (using each indicator's `weight`, defaulting to an
// equal split if unset); (2) otherwise the legacy mock progress_by_territory
// entry in src/data/seed.ts, if present; (3) otherwise that same weighted
// average even when its sources are simulated — this is what makes territories
// seeded ONLY with indicator data (e.g. the Madrid municipios) show a roll-up
// instead of "Sin datos"; (4) a neutral 50 for the 6 original objectives with
// none of the above (legacy behaviour), or null ("Sin datos") for newer ones.
//
// ── POR QUÉ UN DATO REAL GANA A LA TABLA ESCRITA A MANO (2026-08-22) ────────
// Decisión de Eugenio, y el orden estaba al revés. La tabla de
// `src/data/seed.ts` existe para RELLENAR donde no hay nada, y sin embargo
// ganaba siempre: España tiene 41 observaciones reales de agua —INE, MITECO,
// FAO, ESS— y su porcentaje de AGUA salía de un 98 escrito a mano. Los datos
// buenos estaban en la base de datos, cargados, y no llegaban a ninguna
// pantalla.
//
// SOLO GANA SI ES REAL. Entre dos rellenos —observaciones simuladas contra
// tabla escrita a mano— no hay motivo para preferir ninguno, así que se deja
// lo que ya había: cambiar por cambiar movería los números de los 179
// municipios y de los 32 países sin que nadie ganara nada. Lo que cambia es
// exactamente lo que tenía que cambiar.
//
// ── Y DE DÓNDE SALE CADA UNA (2026-08-22) ──────────────────────────────────
// Los tres caminos de arriba NO valen lo mismo, y hasta hoy salían por la
// pantalla exactamente iguales:
//   (1) el número escrito a mano en `src/data/seed.ts` — inventado;
//   (2) la media ponderada de observaciones reales — vale lo que valga la
//       peor de sus fuentes;
//   (3) el 50 neutro para los 6 objetivos antiguos sin dato — que no es una
//       puntuación baja ni alta: es un relleno, y se enseñaba con su barra
//       de progreso como cualquier otro.
// El origen se decide EN LA MISMA RAMA que decide el número, que es la única
// forma de que no se separen. Se devuelve por `origenesFuera` para no
// cambiarle la forma del resultado a los cuatro sitios que ya llaman aquí.
export const getObjectivesForTerritory = (
  tid: string,
  indicatorScoresForTid: Record<string, number> = {},
  indicatorsMeta: { id: string; objectiveId: string; weight: number | null }[] = [],
  fuentesForTid: Record<string, string | null> = {},
  origenesFuera?: Record<string, OrigenDelDato>
): Record<string, number | null> => {
  const result: Record<string, number | null> = {};
  let sum = 0;
  let count = 0;
  for (const [key, id] of Object.entries(OBJECTIVE_ID_BY_KEY)) {
    const seedEntry = seedObjectives.find(o => o.id === id);
    const raw = seedEntry?.progress_by_territory?.[tid];

    // La media ponderada de las observaciones de este objetivo, se use luego o
    // no: hay que calcularla ANTES para saber si es real, y si lo es, gana.
    const objIndicators = indicatorsMeta.filter(i => i.objectiveId === id);
    let weightedSum = 0;
    let weightTotal = 0;
    const fuentesUsadas: Array<string | null> = [];
    for (const ind of objIndicators) {
      const score = indicatorScoresForTid[ind.id];
      if (score != null) {
        const w = ind.weight != null ? ind.weight : (1 / objIndicators.length);
        weightedSum += score * w;
        weightTotal += w;
        // Solo cuentan las fuentes de los indicadores que DE VERDAD entran en
        // la media: uno sin observación aquí no ensucia el resultado.
        fuentesUsadas.push(fuentesForTid[ind.id] ?? null);
      }
    }
    const media = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : null;
    const origenDeLaMedia = weightTotal > 0 ? origenDeVarios(fuentesUsadas) : null;
    const mediaEsReal = origenDeLaMedia === 'medido' || origenDeLaMedia === 'estimado';

    let value: number | null;
    let origen: OrigenDelDato | null;
    if (media != null && (mediaEsReal || raw == null)) {
      // Medido o estimado: gana a cualquier relleno. Y si no hay relleno, la
      // media es lo único que hay, valga lo que valga.
      value = media;
      origen = origenDeLaMedia;
    } else if (raw != null) {
      // Escrito a mano en el fichero de semillas para poder enseñar la
      // plataforma. No mide nada.
      value = raw;
      origen = 'simulado';
    } else if (LEGACY_MOCK_OBJECTIVE_KEYS.has(key)) {
      value = 50;
      origen = 'simulado';
    } else {
      value = null;
      origen = null;
    }
    result[key] = value;
    if (origenesFuera && origen) origenesFuera[key] = origen;
    if (value != null) { sum += value; count++; }
  }
  result.overall = count > 0 ? Math.round(sum / count) : null;
  // La global lleva dentro todas las demás: vale lo que la peor de ellas.
  if (origenesFuera && result.overall != null) {
    origenesFuera.overall = peorOrigen(Object.values(origenesFuera));
  }
  return result;
};
