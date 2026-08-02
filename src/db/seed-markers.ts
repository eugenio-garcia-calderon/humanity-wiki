import { db } from './index.ts';
import * as schema from './schema.ts';
import { sql } from 'drizzle-orm';

const INDICATOR_ID = 'IND_AGUA_CALIDAD';

interface MarkerSeed {
  id: string;
  name: string;
  includes: string;
  description: string;
  unit: string;
  weight: number;
}

const markers: MarkerSeed[] = [
  {
    id: 'MARKER_AGUA_CALIDAD_OXIGENACION',
    name: 'Oxigenación',
    includes: 'Oxígeno disuelto, DBO₅, DQO',
    description: 'Mide la capacidad del agua para mantener vida acuática y el nivel de contaminación por materia orgánica.',
    unit: 'Índice (mg/L)',
    weight: 0.20,
  },
  {
    id: 'MARKER_AGUA_CALIDAD_NUTRIENTES',
    name: 'Nutrientes',
    includes: 'Nitratos, nitritos, amonio, fósforo, fosfatos',
    description: 'Evalúa la contaminación por fertilizantes y el riesgo de eutrofización.',
    unit: 'Índice (mg/L)',
    weight: 0.20,
  },
  {
    id: 'MARKER_AGUA_CALIDAD_FISICOQUIMICA',
    name: 'Fisicoquímica',
    includes: 'pH, conductividad, temperatura, turbidez, salinidad',
    description: 'Determina las condiciones físico-químicas generales del agua.',
    unit: 'Índice compuesto',
    weight: 0.15,
  },
  {
    id: 'MARKER_AGUA_CALIDAD_TOXICIDAD',
    name: 'Toxicidad',
    includes: 'Metales pesados, pesticidas, hidrocarburos, contaminantes emergentes',
    description: 'Mide la presencia de sustancias tóxicas para los ecosistemas y la salud humana.',
    unit: 'Índice compuesto',
    weight: 0.15,
  },
  {
    id: 'MARKER_AGUA_CALIDAD_MICROBIOLOGIA',
    name: 'Microbiología',
    includes: 'E. coli, enterococos, coliformes y otros patógenos',
    description: 'Evalúa el riesgo sanitario por contaminación microbiológica.',
    unit: 'Índice (UFC/100 mL)',
    weight: 0.10,
  },
  {
    id: 'MARKER_AGUA_CALIDAD_BIODIVERSIDAD',
    name: 'Biodiversidad',
    includes: 'Peces, macroinvertebrados, diatomeas, macrófitos, estado ecológico',
    description: 'Refleja la salud del ecosistema acuático mediante indicadores biológicos.',
    unit: 'Índice ecológico',
    weight: 0.10,
  },
  {
    id: 'MARKER_AGUA_CALIDAD_RESIDUOS',
    name: 'Residuos',
    includes: 'Microplásticos, sólidos flotantes, residuos visibles y basura acuática',
    description: 'Evalúa la contaminación por residuos persistentes y su impacto ambiental.',
    unit: 'Índice compuesto',
    weight: 0.10,
  },
];

async function seed() {
  console.log('Seeding markers for IND_AGUA_CALIDAD...');

  const ids = markers.map(m => m.id);
  await db.execute(sql`DELETE FROM markers WHERE id IN ${ids}`);

  for (const m of markers) {
    await db.insert(schema.markers).values({
      id: m.id,
      indicatorId: INDICATOR_ID,
      name: m.name,
      includes: m.includes,
      description: m.description,
      unit: m.unit,
      weight: m.weight,
      // source / last_updated no vienen especificados en la tabla de origen;
      // se dejan sin rellenar hasta tener el dato real.
    }).onConflictDoNothing();
  }

  console.log(`Seeding completed! (${markers.length} markers)`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
