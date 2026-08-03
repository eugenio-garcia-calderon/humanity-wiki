import fs from 'fs';
import path from 'path';
import { db } from './index.ts';
import { sql } from 'drizzle-orm';
import municipiosData from '../data/madrid-municipios-seed-data.json' with { type: 'json' };

// The 179 municipios of the Comunidad de Madrid, sourced from:
// - Geometry/names/INE codes: es-atlas (unpkg.com/es-atlas), IGN-derived, CC-BY 4.0.
// - Population (for ordering the un-named Excel rows): Wikipedia's "List of
//   municipalities in the Community of Madrid" (INE 2024 census).
// - Objective-level percentages: the user-provided
//   "Municipios_Madrid_179_Indicadores_Simulados.xlsx" (fully simulated demo
//   data, per its own filename) — one percentage per objective per municipio,
//   with no finer per-indicator breakdown. See memory/03_DECISIONS.md for the
//   full provenance/matching write-up.
//
// Two of the 179 (Talamanca de Jarama, Montejo de la Sierra) already existed
// as territories (T014/T005) with hand-typed mock data — this script reuses
// those exact IDs instead of creating duplicates, and overwrites their
// population/objective data with the Excel-derived values for consistency
// with the other 177.

const REUSED_IDS = new Set(['T014', 'T005']);

interface MunicipioSeed {
  territoryId: string;
  name: string;
  ine_id: string;
  population: number;
  excelRow: number;
  objectives: Record<string, number>;
}

const municipios = municipiosData as MunicipioSeed[];

async function upsertTerritories() {
  console.log(`Upserting ${municipios.length} territorios...`);
  for (const m of municipios) {
    if (REUSED_IDS.has(m.territoryId)) {
      await db.execute(sql`
        UPDATE territories SET name = ${m.name}, population = ${m.population}
        WHERE id = ${m.territoryId}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO territories (id, type, name, parent_id, population)
        VALUES (${m.territoryId}, 'municipality', ${m.name}, 'T004', ${m.population})
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, population = EXCLUDED.population
      `);
    }
  }
}

async function seedIndicatorObservations() {
  // Every indicator's objective_id + weight, grouped once — Salud (O004) has
  // no indicators at all (a pre-existing gap, not something to fix here; its
  // score is seeded instead via the legacy progress_by_territory mock, see
  // patchSaludMockData below).
  const indicatorsResult = await db.execute(sql`SELECT id, objective_id FROM indicators`);
  const indicatorIdsByObjective: Record<string, string[]> = {};
  for (const row of indicatorsResult.rows as any[]) {
    if (!indicatorIdsByObjective[row.objective_id]) indicatorIdsByObjective[row.objective_id] = [];
    indicatorIdsByObjective[row.objective_id].push(row.id);
  }

  const OBJECTIVE_ID_BY_KEY: Record<string, string> = {
    agua: 'O001', alimentacion: 'O002', vivienda: 'O003', salud: 'O004',
    convivencia: 'O005', ecosistemas: 'O006', educacion: 'O007', movilidad: 'O008',
    energia: 'O009', tecnologia: 'O010', empleo: 'O011', gobernanza: 'O012',
    economia: 'O013', cultura: 'O014',
  };

  const territoryIds = municipios.map(m => m.territoryId);
  console.log('Clearing previous observations for these territorios (idempotent re-run)...');
  await db.execute(sql`DELETE FROM indicator_observations WHERE territory_id IN ${territoryIds}`);

  const today = new Date().toISOString().slice(0, 10);
  let count = 0;
  for (const m of municipios) {
    for (const [key, score] of Object.entries(m.objectives)) {
      const objId = OBJECTIVE_ID_BY_KEY[key];
      const indicatorIds = indicatorIdsByObjective[objId] || [];
      for (const indId of indicatorIds) {
        await db.execute(sql`
          INSERT INTO indicator_observations (indicator_id, territory_id, value, score, raw_value, source, date)
          VALUES (${indId}, ${m.territoryId}, ${score}, ${score}, 'Dato simulado', 'Excel Municipios Madrid (simulado)', ${today})
        `);
        count++;
      }
    }
  }
  console.log(`Inserted ${count} indicator_observations rows.`);
}

// Salud (O004) has no indicators in the DB to hang real observations off —
// its score comes exclusively from the legacy progress_by_territory mock
// dictionary in src/data/seed.ts (same mechanism the 6 original objectives
// already use for other territories). This patches that one dictionary with
// the 179 new municipio entries, preserving every existing entry.
function patchSaludMockData() {
  const seedPath = path.join(process.cwd(), 'src', 'data', 'seed.ts');
  let text = fs.readFileSync(seedPath, 'utf8');

  const marker = 'id: "O004"';
  const markerIdx = text.indexOf(marker);
  if (markerIdx === -1) throw new Error('Could not find O004 (Salud) objective entry in seed.ts');

  const dictStart = text.indexOf('progress_by_territory: {', markerIdx);
  const dictEnd = text.indexOf('}', dictStart);
  if (dictStart === -1 || dictEnd === -1) throw new Error('Could not find O004 progress_by_territory dict in seed.ts');

  const existing = text.slice(dictStart, dictEnd);
  // Skip any municipio already present (re-run safety) — reused IDs T014/T005
  // are already in the legacy dict, so don't duplicate them.
  const newEntries = municipios
    .filter(m => !existing.includes(`"${m.territoryId}"`))
    .map(m => `"${m.territoryId}": ${m.objectives.salud}`);

  if (newEntries.length === 0) {
    console.log('Salud mock dictionary already contains all 179 municipios — nothing to patch.');
    return;
  }

  const patched = existing.trimEnd() + ', ' + newEntries.join(', ') + ' ';
  text = text.slice(0, dictStart) + patched + text.slice(dictEnd);
  fs.writeFileSync(seedPath, text);
  console.log(`Patched src/data/seed.ts: added ${newEntries.length} Salud (O004) mock entries.`);
}

async function main() {
  await upsertTerritories();
  await seedIndicatorObservations();
  patchSaludMockData();
  console.log('Done.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
