import { db } from './index.ts';
import * as schema from './schema.ts';
import { sql } from 'drizzle-orm';

// Links existing challenges (already tied to España/T003 via challenge_territories,
// see src/data/seed.ts's original mock content) to specific Indicadores, so the
// map explorer's "Retos" card has something to show at levels below Objetivo.
// Extend this list — or add analogous rows to challenge_markers/challenge_metrics —
// whenever a new challenge should surface at a deeper level.
const CHALLENGE_INDICATOR_LINKS: { challengeId: string; indicatorId: string }[] = [
  { challengeId: 'R017', indicatorId: 'IND_ECOSISTEMAS_BOSQUES' }, // Incendios
  { challengeId: 'R009', indicatorId: 'IND_ECOSISTEMAS_BOSQUES' }, // Contaminación aire
];

async function seed() {
  console.log(`Seeding ${CHALLENGE_INDICATOR_LINKS.length} challenge_indicators links...`);

  for (const link of CHALLENGE_INDICATOR_LINKS) {
    await db.execute(sql`
      DELETE FROM challenge_indicators
      WHERE challenge_id = ${link.challengeId} AND indicator_id = ${link.indicatorId}
    `);
    await db.insert(schema.challengeIndicators).values(link).onConflictDoNothing();
  }

  console.log('Seeding completed!');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
