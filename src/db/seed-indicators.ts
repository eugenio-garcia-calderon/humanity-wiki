import { db } from './index.ts';
import * as schema from './schema.ts';
import { sql } from 'drizzle-orm';

const OBJECTIVE_ID = 'O001'; // AGUA
const TERRITORY_ID = 'T003'; // España

interface IndicatorSeed {
  id: string;
  name: string;
  unit: string;
  weight: number;
  rawValue: string;
  score: number;
  weightedScore: number;
  methodology: string;
  source: string;
  date?: string;
}

const indicators: IndicatorSeed[] = [
  {
    id: 'IND_AGUA_ACCESO',
    name: 'Acceso',
    unit: '%',
    weight: 0.15,
    rawValue: '84,3% de población con suministro cubierto por el Sistema Nacional de Aguas de Consumo (2024)',
    score: 84.3,
    weightedScore: 12.65,
    methodology: 'Como es un porcentaje de cobertura, puntuación = 84,3.',
    source: 'Ministerio de Sanidad, publicado por INE',
  },
  {
    id: 'IND_AGUA_CALIDAD',
    name: 'Calidad',
    unit: '%',
    weight: 0.12,
    rawValue: '61,5% masas superficiales con buen estado ecológico; 86,6% con buen estado químico; 54,2% masas subterráneas con buen estado global; 75,38% estaciones con nitratos <50 mg/l; 76,14% con fosfatos <0,20 mg P-PO₄/l; 96,27% con DBO₅ <10 mg/l',
    score: 72.1,
    weightedScore: 8.65,
    methodology: 'Índice compuesto: 25% ecológico + 20% químico + 20% subterráneas + 15% nitratos + 10% fosfatos + 10% DBO₅.',
    source: 'INE',
  },
  {
    id: 'IND_AGUA_SANEAMIENTO',
    name: 'Saneamiento',
    unit: '%',
    weight: 0.12,
    rawValue: '98,37% de la carga contaminante de poblaciones >2.000 hab-eq conectada a colectores conforme a la Directiva 91/271/CEE (2022)',
    score: 98.4,
    weightedScore: 11.80,
    methodology: 'Al ser directamente un porcentaje de cobertura, puntuación = 98,37. Es un buen proxy nacional, aunque no equivale exactamente al indicador universal de saneamiento seguro.',
    source: 'INE',
  },
  {
    id: 'IND_AGUA_DISPONIBILIDAD',
    name: 'Disponibilidad',
    unit: '%',
    weight: 0.12,
    rawValue: '73,4% de capacidad de los embalses ocupada, 21/07/2026',
    score: 73.4,
    weightedScore: 8.81,
    methodology: 'Para el MVP, puntuación = nivel de reserva. Es un indicador coyuntural de disponibilidad, no una medida estructural de recursos renovables.',
    source: 'Ministerio de Transición Ecológica',
    date: '2026-07-21',
  },
  {
    id: 'IND_AGUA_ESTRES',
    name: 'Estrés',
    unit: '%',
    weight: 0.10,
    rawValue: '19,95% WEI+ (último dato oficial: 2021)',
    score: 50.1,
    weightedScore: 5.01,
    methodology: 'Escala propuesta: 100 puntos con 0% de estrés, 50 puntos con 20% y 0 puntos con 40% o más. España está prácticamente en el umbral del 20%.',
    source: 'INE',
  },
  {
    id: 'IND_AGUA_CONSUMO',
    name: 'Consumo',
    unit: 'l/hab/día',
    weight: 0.07,
    rawValue: '128 l/hab/día en hogares (2024)',
    score: 72.0,
    weightedScore: 5.04,
    methodology: 'Escala de eficiencia provisional: ≤100 l/día = 100 puntos; ≥200 = 0; entre ambos, interpolación lineal. 128 → 72 puntos.',
    source: 'INE',
  },
  {
    id: 'IND_AGUA_PERDIDAS',
    name: 'Pérdidas',
    unit: '%',
    weight: 0.10,
    rawValue: '14,6% de pérdidas reales en redes (624 hm³ en 2024)',
    score: 77.0,
    weightedScore: 7.70,
    methodology: 'Escala provisional: ≤10% = 100 puntos; ≥30% = 0; interpolación lineal. 14,6% → 77 puntos.',
    source: 'INE',
  },
  {
    id: 'IND_AGUA_REUTILIZACION',
    name: 'Reutilización',
    unit: '%',
    weight: 0.07,
    rawValue: '>450 hm³/año, aproximadamente 10% de los caudales utilizados para abastecimiento urbano',
    score: 50.0,
    weightedScore: 3.50,
    methodology: 'Referencia de alto desempeño: 0% = 0 puntos, 20% = 100. 10% → 50 puntos. El dato nacional encontrado es antiguo, por lo que debe sustituirse por una serie actualizada antes de producción.',
    source: 'Ministerio de Transición Ecológica',
  },
  {
    id: 'IND_AGUA_SEQUIA',
    name: 'Sequía',
    unit: '%',
    weight: 0.05,
    rawValue: 'Reserva nacional 73,4% a 21/07/2026; MITECO mantiene un sistema específico de indicadores de sequía y escasez por cuenca',
    score: 73.0,
    weightedScore: 3.65,
    methodology: 'Provisional: al no existir un único porcentaje nacional de sequía directamente comparable, se usa la reserva hídrica como proxy temporal. El índice definitivo debería calcularse con los indicadores oficiales de sequía y escasez por sistema de explotación.',
    source: 'Ministerio de Transición Ecológica',
    date: '2026-07-21',
  },
];

async function seed() {
  console.log('Seeding AGUA indicators for España...');

  const ids = indicators.map(i => i.id);
  await db.execute(sql`
    DELETE FROM indicator_observations
    WHERE territory_id = ${TERRITORY_ID} AND indicator_id IN ${ids}
  `);

  for (const ind of indicators) {
    await db.insert(schema.indicators).values({
      id: ind.id,
      name: ind.name,
      unit: ind.unit,
      category: 'AGUA',
      direction: 'higher_is_better',
      weight: ind.weight,
      methodology: ind.methodology,
      objectiveId: OBJECTIVE_ID,
    }).onConflictDoNothing();

    await db.insert(schema.indicatorObservations).values({
      indicatorId: ind.id,
      territoryId: TERRITORY_ID,
      value: ind.score,
      rawValue: ind.rawValue,
      score: ind.score,
      weightedScore: ind.weightedScore,
      date: ind.date,
      source: ind.source,
    }).onConflictDoNothing();
  }

  console.log('Seeding completed!');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
