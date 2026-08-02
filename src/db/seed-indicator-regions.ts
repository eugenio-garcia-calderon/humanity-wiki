import { db } from './index.ts';
import * as schema from './schema.ts';
import { sql } from 'drizzle-orm';

const INDICATOR_ID = 'IND_AGUA_CALIDAD';
const WEIGHT = 0.12; // matches indicators.weight for IND_AGUA_CALIDAD

interface RegionObservation {
  territoryId: string;
  name: string;
  score: number;
  nivel: string;
}

const regions: RegionObservation[] = [
  { territoryId: 'T030', name: 'País Vasco', score: 90, nivel: 'Muy alta' },
  { territoryId: 'T029', name: 'Comunidad Foral de Navarra', score: 88, nivel: 'Muy alta' },
  { territoryId: 'T031', name: 'La Rioja', score: 86, nivel: 'Muy alta' },
  { territoryId: 'T023', name: 'Cantabria', score: 85, nivel: 'Muy alta' },
  { territoryId: 'T020', name: 'Principado de Asturias', score: 84, nivel: 'Alta' },
  { territoryId: 'T027', name: 'Galicia', score: 83, nivel: 'Alta' },
  { territoryId: 'T025', name: 'Castilla y León', score: 81, nivel: 'Alta' },
  { territoryId: 'T019', name: 'Aragón', score: 79, nivel: 'Alta' },
  { territoryId: 'T008', name: 'Cataluña', score: 76, nivel: 'Media-Alta' },
  { territoryId: 'T026', name: 'Extremadura', score: 75, nivel: 'Media-Alta' },
  { territoryId: 'T004', name: 'Comunidad de Madrid', score: 73, nivel: 'Media' },
  { territoryId: 'T024', name: 'Castilla-La Mancha', score: 72, nivel: 'Media' },
  { territoryId: 'T018', name: 'Andalucía', score: 69, nivel: 'Media' },
  { territoryId: 'T028', name: 'Región de Murcia', score: 63, nivel: 'Media-Baja' },
  { territoryId: 'T009', name: 'Comunidad Valenciana', score: 61, nivel: 'Media-Baja' },
  { territoryId: 'T021', name: 'Illes Balears', score: 58, nivel: 'Baja' },
  { territoryId: 'T022', name: 'Canarias', score: 56, nivel: 'Baja' },
];

async function seed() {
  console.log('Seeding regional water quality (IND_AGUA_CALIDAD) observations...');

  const territoryIds = regions.map(r => r.territoryId);
  await db.execute(sql`
    DELETE FROM indicator_observations
    WHERE indicator_id = ${INDICATOR_ID} AND territory_id IN ${territoryIds}
  `);

  for (const r of regions) {
    const weightedScore = Math.round(r.score * WEIGHT * 100) / 100;
    await db.insert(schema.indicatorObservations).values({
      indicatorId: INDICATOR_ID,
      territoryId: r.territoryId,
      value: r.score,
      rawValue: `${r.score}/100 (Nivel: ${r.nivel}) — estimación del estado ecológico y químico de las masas de agua de ${r.name}`,
      score: r.score,
      weightedScore,
      source: 'INE / estimación por comunidad autónoma',
    }).onConflictDoNothing();
  }

  console.log(`Seeding completed! (${regions.length} regions)`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
