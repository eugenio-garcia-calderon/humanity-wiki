import { db } from './index.ts';
import * as schema from './schema.ts';
import { sql } from 'drizzle-orm';

// Causas del reto "Incendios" (R017) en España, para el gráfico de anillo
// interactivo del explorador del mapa. Los porcentajes son el ejemplo
// aportado por el usuario y suman 100.
const CHALLENGE_ID = 'R017';

interface CauseSeed {
  id: string;
  title: string;
  type: string;
  description: string;
  percentage: number;
}

const CAUSES: CauseSeed[] = [
  { id: 'C401', title: 'Humanas', type: 'human', description: 'Quemas agrícolas o de rastrojos descontroladas, hogueras, colillas y otras acciones humanas intencionadas o imprudentes.', percentage: 40 },
  { id: 'C402', title: 'Negligencias', type: 'human', description: 'Descuidos no intencionados: trabajos con maquinaria, barbacoas, fuegos artificiales o quemas mal gestionadas.', percentage: 20 },
  { id: 'C403', title: 'Naturales', type: 'natural', description: 'Rayos y otros fenómenos naturales que inician el fuego sin intervención humana directa.', percentage: 15 },
  { id: 'C404', title: 'Climáticas', type: 'climatic', description: 'Olas de calor, sequía prolongada y baja humedad que aumentan la inflamabilidad de la vegetación.', percentage: 10 },
  { id: 'C405', title: 'Infraestructura', type: 'infrastructure', description: 'Fallos o chispas de líneas eléctricas, tendidos y otras infraestructuras cercanas a masas forestales.', percentage: 8 },
  { id: 'C406', title: 'Otras', type: 'other', description: 'Causas diversas o no determinadas que no encajan en las categorías anteriores.', percentage: 7 },
];

async function seed() {
  console.log(`Seeding ${CAUSES.length} causas del reto Incendios (${CHALLENGE_ID})...`);

  const causeIds = CAUSES.map(c => c.id);
  await db.execute(sql`DELETE FROM challenge_causes WHERE challenge_id = ${CHALLENGE_ID} AND cause_id IN ${causeIds}`);
  await db.execute(sql`DELETE FROM causes WHERE id IN ${causeIds}`);

  for (const cause of CAUSES) {
    await db.insert(schema.causes).values({
      id: cause.id,
      title: cause.title,
      type: cause.type,
      description: cause.description,
    }).onConflictDoNothing();

    await db.insert(schema.challengeCauses).values({
      challengeId: CHALLENGE_ID,
      causeId: cause.id,
      percentage: cause.percentage,
    }).onConflictDoNothing();
  }

  console.log('Seeding completed!');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
