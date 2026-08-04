import { db } from './index.ts';
import { sql } from 'drizzle-orm';

// ============================================================================
// Países de Europa + datos de prueba generados por IA (Fase 10)
// ============================================================================
// El usuario pidió añadir los territorios de los países de Europa e
// introducir números aleatorios para los 14 objetivos, para que no queden
// vacíos, marcando claramente que son datos generados por la IA (pendientes
// de revisión) y no mediciones reales — tanto en el propio territorio como
// en cada valor de indicador, vía la columna `is_ai_generated`
// (drizzle/0011_ai_generated_flag.sql).
//
// España (T003) e Italia (T011) ya existían — el resto de Europa se añade
// aquí. Coordenadas y población son datos reales aproximados (no aleatorios);
// SOLO las puntuaciones de los 14 objetivos son números de prueba.

interface CountrySeed {
  id: string;
  name: string;
  lng: number;
  lat: number;
  population: number;
}

const EUROPE_CONTINENT_ID = 'T002';

const COUNTRIES: CountrySeed[] = [
  { id: 'T034', name: 'Francia', lng: 2.2, lat: 46.6, population: 68000000 },
  { id: 'T035', name: 'Alemania', lng: 10.4, lat: 51.2, population: 84000000 },
  { id: 'T036', name: 'Portugal', lng: -8.0, lat: 39.6, population: 10300000 },
  { id: 'T037', name: 'Reino Unido', lng: -2.0, lat: 54.0, population: 67000000 },
  { id: 'T038', name: 'Países Bajos', lng: 5.3, lat: 52.2, population: 17800000 },
  { id: 'T039', name: 'Bélgica', lng: 4.5, lat: 50.6, population: 11700000 },
  { id: 'T040', name: 'Suiza', lng: 8.2, lat: 46.8, population: 8800000 },
  { id: 'T041', name: 'Austria', lng: 14.1, lat: 47.6, population: 9100000 },
  { id: 'T042', name: 'Polonia', lng: 19.5, lat: 52.0, population: 37700000 },
  { id: 'T043', name: 'Suecia', lng: 15.0, lat: 62.0, population: 10500000 },
  { id: 'T044', name: 'Noruega', lng: 9.0, lat: 61.0, population: 5500000 },
  { id: 'T045', name: 'Dinamarca', lng: 10.0, lat: 56.0, population: 5900000 },
  { id: 'T046', name: 'Finlandia', lng: 26.0, lat: 64.0, population: 5600000 },
  { id: 'T047', name: 'Irlanda', lng: -8.0, lat: 53.4, population: 5100000 },
  { id: 'T048', name: 'Grecia', lng: 22.0, lat: 39.0, population: 10400000 },
  { id: 'T049', name: 'República Checa', lng: 15.5, lat: 49.8, population: 10700000 },
  { id: 'T050', name: 'Hungría', lng: 19.5, lat: 47.2, population: 9700000 },
  { id: 'T051', name: 'Rumanía', lng: 25.0, lat: 45.9, population: 19000000 },
  { id: 'T052', name: 'Bulgaria', lng: 25.5, lat: 42.7, population: 6900000 },
  { id: 'T053', name: 'Croacia', lng: 15.2, lat: 45.1, population: 3900000 },
  { id: 'T054', name: 'Eslovaquia', lng: 19.5, lat: 48.7, population: 5400000 },
  { id: 'T055', name: 'Eslovenia', lng: 14.8, lat: 46.1, population: 2100000 },
  { id: 'T056', name: 'Serbia', lng: 21.0, lat: 44.0, population: 6900000 },
  { id: 'T057', name: 'Estonia', lng: 25.0, lat: 58.6, population: 1300000 },
  { id: 'T058', name: 'Letonia', lng: 24.6, lat: 56.9, population: 1900000 },
  { id: 'T059', name: 'Lituania', lng: 23.9, lat: 55.2, population: 2800000 },
  { id: 'T060', name: 'Luxemburgo', lng: 6.1, lat: 49.8, population: 650000 },
  { id: 'T061', name: 'Islandia', lng: -18.0, lat: 65.0, population: 380000 },
  { id: 'T062', name: 'Malta', lng: 14.4, lat: 35.9, population: 520000 },
  { id: 'T063', name: 'Chipre', lng: 33.4, lat: 35.1, population: 1200000 },
  { id: 'T064', name: 'Ucrania', lng: 32.0, lat: 49.0, population: 38000000 },
  { id: 'T065', name: 'Bielorrusia', lng: 28.0, lat: 53.7, population: 9200000 },
];

const OBJECTIVE_ID_BY_KEY: Record<string, string> = {
  agua: 'O001', alimentacion: 'O002', vivienda: 'O003', salud: 'O004',
  convivencia: 'O005', ecosistemas: 'O006', educacion: 'O007', movilidad: 'O008',
  energia: 'O009', tecnologia: 'O010', empleo: 'O011', gobernanza: 'O012',
  economia: 'O013', cultura: 'O014',
};

const AI_RAW_VALUE = 'Dato de prueba generado por IA';
const AI_SOURCE = 'IA — número aleatorio, pendiente de revisión';

async function ensureSaludIndicator() {
  // O004 (Salud) es el único de los 14 objetivos sin ningún indicador en la
  // base de datos (hueco previo, no introducido en esta sesión). Sin al
  // menos un indicador no hay dónde colgar una indicator_observations, y su
  // puntuación se quedaría siempre en "Sin datos" para los países nuevos.
  // Se crea un indicador compuesto único, con el mismo aviso que ya usan
  // O007-O014 para indicadores creados sin datos reales todavía.
  await db.execute(sql`
    INSERT INTO indicators (id, name, unit, category, direction, weight, methodology, objective_id)
    VALUES ('IND_SALUD_GENERAL', 'Índice general de salud', '%', 'SALUD', 'higher_is_better', 1,
            'Indicador compuesto único mientras no se definan sub-indicadores reales de Salud.', 'O004')
    ON CONFLICT (id) DO NOTHING
  `);
}

async function upsertCountries() {
  console.log(`Upsertando ${COUNTRIES.length} países de Europa...`);
  for (const c of COUNTRIES) {
    await db.execute(sql`
      INSERT INTO territories (id, type, name, parent_id, population, description, is_ai_generated)
      VALUES (${c.id}, 'country', ${c.name}, ${EUROPE_CONTINENT_ID}, ${c.population},
              'Perfil territorial nacional. Datos de los 14 objetivos generados por IA a modo de prueba, pendientes de revisión.',
              true)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, parent_id = EXCLUDED.parent_id, population = EXCLUDED.population,
        is_ai_generated = EXCLUDED.is_ai_generated
    `);
  }
}

async function seedRandomScores() {
  const indicatorsResult = await db.execute(sql`SELECT id, objective_id, weight FROM indicators WHERE archived_at IS NULL`);
  const indicatorsByObjective: Record<string, { id: string; weight: number | null }[]> = {};
  for (const row of indicatorsResult.rows as any[]) {
    (indicatorsByObjective[row.objective_id] ||= []).push({ id: row.id, weight: row.weight != null ? Number(row.weight) : null });
  }

  const territoryIds = COUNTRIES.map(c => c.id);
  console.log('Borrando observaciones previas de estos países (re-ejecución idempotente)...');
  await db.execute(sql`DELETE FROM indicator_observations WHERE territory_id IN ${territoryIds}`);

  const today = new Date().toISOString().slice(0, 10);
  let count = 0;
  for (const c of COUNTRIES) {
    for (const objId of Object.values(OBJECTIVE_ID_BY_KEY)) {
      const objIndicators = indicatorsByObjective[objId] || [];
      if (!objIndicators.length) continue; // no debería ocurrir tras ensureSaludIndicator()
      // Una puntuación aleatoria por objetivo y país, copiada a todos sus
      // indicadores (mismo criterio de simplificación que ya usa
      // seed-madrid-municipios.ts): así el roll-up ponderado del objetivo
      // coincide exactamente con el número sembrado.
      const score = Math.floor(Math.random() * 101);
      for (const ind of objIndicators) {
        const weight = ind.weight != null ? ind.weight : (1 / objIndicators.length);
        await db.execute(sql`
          INSERT INTO indicator_observations
            (indicator_id, territory_id, value, score, weighted_score, raw_value, source, date, is_ai_generated)
          VALUES (${ind.id}, ${c.id}, ${score}, ${score}, ${score * weight}, ${AI_RAW_VALUE}, ${AI_SOURCE}, ${today}, true)
        `);
        count++;
      }
    }
  }
  console.log(`Insertadas ${count} filas de indicator_observations (todas marcadas is_ai_generated = true).`);
}

async function main() {
  await ensureSaludIndicator();
  await upsertCountries();
  await seedRandomScores();
  console.log('\nListo.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
