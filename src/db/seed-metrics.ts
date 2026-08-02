import { db } from './index.ts';
import * as schema from './schema.ts';
import { sql } from 'drizzle-orm';

const MARKER_ID = 'MARKER_AGUA_CALIDAD_PUREZA';

interface MetricSeed {
  id: string;
  name: string;
  unit: string;
  description: string;
}

const metrics: MetricSeed[] = [
  { id: 'METRIC_PUREZA_MERCURIO', name: 'Mercurio', unit: 'µg/L', description: 'Metal pesado tóxico, indicador de contaminación industrial y minera.' },
  { id: 'METRIC_PUREZA_PLOMO', name: 'Plomo', unit: 'µg/L', description: 'Metal pesado tóxico procedente de vertidos industriales y tuberías antiguas.' },
  { id: 'METRIC_PUREZA_CADMIO', name: 'Cadmio', unit: 'µg/L', description: 'Metal pesado tóxico asociado a fertilizantes fosfatados y actividad industrial.' },
  { id: 'METRIC_PUREZA_NITRATOS', name: 'Nitratos', unit: 'mg/L', description: 'Contaminación por fertilizantes agrícolas y purines ganaderos.' },
  { id: 'METRIC_PUREZA_FOSFATOS', name: 'Fosfatos', unit: 'mg/L', description: 'Contaminación por fertilizantes y detergentes, riesgo de eutrofización.' },
  { id: 'METRIC_PUREZA_GLIFOSATO', name: 'Glifosato', unit: 'µg/L', description: 'Residuo de herbicida de uso agrícola extendido.' },
  { id: 'METRIC_PUREZA_PFAS', name: 'PFAS', unit: 'ng/L', description: 'Contaminantes químicos persistentes ("químicos eternos") de origen industrial.' },
  { id: 'METRIC_PUREZA_PESTICIDAS', name: 'Pesticidas', unit: 'µg/L', description: 'Suma de residuos de plaguicidas de uso agrícola.' },
];

async function seed() {
  console.log('Seeding water contaminant metrics for Pureza...');

  const ids = metrics.map(m => m.id);
  await db.execute(sql`DELETE FROM metrics WHERE id IN ${ids}`);

  for (const m of metrics) {
    await db.insert(schema.metrics).values({
      id: m.id,
      markerId: MARKER_ID,
      name: m.name,
      unit: m.unit,
      description: m.description,
    }).onConflictDoNothing();
  }

  console.log(`Seeding completed! (${metrics.length} metrics). No hay estaciones/valores todavía.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
