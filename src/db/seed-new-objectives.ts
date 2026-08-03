import { db } from './index.ts';
import * as schema from './schema.ts';
import { sql } from 'drizzle-orm';

interface ObjectiveSeed {
  id: string;
  title: string;
  description: string;
}

const OBJECTIVES: ObjectiveSeed[] = [
  { id: 'O007', title: 'EDUCACIÓN', description: 'Acceso a una educación de calidad, equitativa e inclusiva a lo largo de toda la vida.' },
  { id: 'O008', title: 'MOVILIDAD', description: 'Capacidad de las personas para desplazarse de forma segura, eficiente y sostenible.' },
  { id: 'O009', title: 'ENERGÍA', description: 'Acceso a energía asequible, segura, sostenible y soberana.' },
  { id: 'O010', title: 'TECNOLOGÍA', description: 'Desarrollo y acceso equitativo a la tecnología como palanca de progreso.' },
  { id: 'O011', title: 'EMPLEO', description: 'Acceso a un empleo digno, estable y con condiciones justas.' },
  { id: 'O012', title: 'GOBERNANZA', description: 'Calidad institucional, participación democrática y buen gobierno.' },
  { id: 'O013', title: 'ECONOMÍA', description: 'Estabilidad, equidad y solidez del sistema económico.' },
  { id: 'O014', title: 'CULTURA', description: 'Acceso a la creación, expresión y patrimonio cultural de los pueblos.' },
];

interface IndicatorTemplate {
  slug: string;
  name: string;
  direction: 'higher_is_better' | 'lower_is_better';
  methodology: string;
}

// Same 7 indicators requested for every new objective in OBJECTIVES above. No
// observations are seeded yet — territories correctly show "Sin datos" until
// real data is added, following the same "build the structure first" pattern
// already used for markers/metrics under Agua (see 03_DECISIONS.md).
const INDICATOR_TEMPLATE: IndicatorTemplate[] = [
  { slug: 'ACCESIBILIDAD', name: 'Accesibilidad', direction: 'higher_is_better', methodology: 'Mide el grado de acceso de la población a este ámbito. Estructura creada sin datos reales todavía.' },
  { slug: 'COSTE', name: 'Coste', direction: 'lower_is_better', methodology: 'Mide el coste económico que supone para la población. Estructura creada sin datos reales todavía.' },
  { slug: 'SOBERANIA', name: 'Soberanía', direction: 'higher_is_better', methodology: 'Mide el grado de autosuficiencia y control propio frente a la dependencia externa. Estructura creada sin datos reales todavía.' },
  { slug: 'EFICIENCIA', name: 'Eficiencia', direction: 'higher_is_better', methodology: 'Mide la relación entre los recursos empleados y los resultados obtenidos. Estructura creada sin datos reales todavía.' },
  { slug: 'CALIDAD', name: 'Calidad', direction: 'higher_is_better', methodology: 'Mide el nivel de calidad percibida y objetiva. Estructura creada sin datos reales todavía.' },
  { slug: 'SOSTENIBILIDAD', name: 'Sostenibilidad', direction: 'higher_is_better', methodology: 'Mide la capacidad de mantenerse en el tiempo sin agotar recursos ni generar impactos negativos. Estructura creada sin datos reales todavía.' },
  { slug: 'INNOVACION', name: 'Innovación', direction: 'higher_is_better', methodology: 'Mide el grado de incorporación de nuevas soluciones y mejoras. Estructura creada sin datos reales todavía.' },
];

// Equal weighting — there's no real data yet to derive a more informed split.
const WEIGHT = Math.round((1 / INDICATOR_TEMPLATE.length) * 1000) / 1000;

function stripAccents(text: string) {
  return text
    .replace(/Á/g, 'A')
    .replace(/É/g, 'E')
    .replace(/Í/g, 'I')
    .replace(/Ó/g, 'O')
    .replace(/Ú/g, 'U');
}

async function seed() {
  console.log(`Seeding ${OBJECTIVES.length} objectives (${OBJECTIVES.map(o => o.title).join(', ')}) + their indicators...`);

  const objectiveIds = OBJECTIVES.map(o => o.id);
  await db.execute(sql`DELETE FROM indicators WHERE objective_id IN ${objectiveIds}`);
  await db.execute(sql`DELETE FROM objectives WHERE id IN ${objectiveIds}`);

  for (const obj of OBJECTIVES) {
    await db.insert(schema.objectives).values({
      id: obj.id,
      title: obj.title,
      description: obj.description,
    }).onConflictDoNothing();

    const objectiveSlug = stripAccents(obj.title).replace(/\s+/g, '_');
    for (const ind of INDICATOR_TEMPLATE) {
      const indicatorId = `IND_${objectiveSlug}_${ind.slug}`;
      await db.insert(schema.indicators).values({
        id: indicatorId,
        name: ind.name,
        unit: '%',
        category: obj.title,
        direction: ind.direction,
        weight: WEIGHT,
        methodology: ind.methodology,
        objectiveId: obj.id,
      }).onConflictDoNothing();
    }
  }

  console.log(`Seeding completed! (${OBJECTIVES.length} objetivos x ${INDICATOR_TEMPLATE.length} indicadores = ${OBJECTIVES.length * INDICATOR_TEMPLATE.length} indicadores). Sin observaciones todavía.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
