import { db } from './index.ts';
import * as schema from './schema.ts';
import { sql } from 'drizzle-orm';

const MARKER_ID = 'MARKER_AGUA_CALIDAD_PUREZA';

interface RegionObservation {
  territoryId: string;
  name: string;
  score: number;
}

const regions: RegionObservation[] = [
  { territoryId: 'T023', name: 'Cantabria', score: 94 },
  { territoryId: 'T020', name: 'Principado de Asturias', score: 93 },
  { territoryId: 'T027', name: 'Galicia', score: 92 },
  { territoryId: 'T029', name: 'Comunidad Foral de Navarra', score: 91 },
  { territoryId: 'T030', name: 'País Vasco', score: 90 },
  { territoryId: 'T031', name: 'La Rioja', score: 89 },
  { territoryId: 'T025', name: 'Castilla y León', score: 87 },
  { territoryId: 'T026', name: 'Extremadura', score: 85 },
  { territoryId: 'T019', name: 'Aragón', score: 84 },
  { territoryId: 'T024', name: 'Castilla-La Mancha', score: 82 },
  { territoryId: 'T022', name: 'Canarias', score: 80 },
  { territoryId: 'T004', name: 'Comunidad de Madrid', score: 79 },
  { territoryId: 'T018', name: 'Andalucía', score: 76 },
  { territoryId: 'T008', name: 'Cataluña', score: 74 },
  { territoryId: 'T021', name: 'Illes Balears', score: 73 },
  { territoryId: 'T009', name: 'Comunidad Valenciana', score: 69 },
  { territoryId: 'T028', name: 'Región de Murcia', score: 65 },
];

async function seed() {
  console.log('Seeding regional Pureza (MARKER_AGUA_CALIDAD_PUREZA) observations...');

  const territoryIds = regions.map(r => r.territoryId);
  await db.execute(sql`
    DELETE FROM marker_observations
    WHERE marker_id = ${MARKER_ID} AND territory_id IN ${territoryIds}
  `);

  for (const r of regions) {
    await db.insert(schema.markerObservations).values({
      markerId: MARKER_ID,
      territoryId: r.territoryId,
      value: r.score,
      rawValue: `${r.score}/100 — pureza del agua en ${r.name}`,
      score: r.score,
      source: 'Estimación por comunidad autónoma',
    }).onConflictDoNothing();
  }

  console.log(`Seeding completed! (${regions.length} regions)`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
