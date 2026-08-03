import { db } from './index.ts';
import { sql } from 'drizzle-orm';
import { hashPassword, ROLE } from '../server/auth.ts';

// ============================================================================
// Ejemplo completo end-to-end + datos de demostración
// ============================================================================
// Construye la cadena que pidió el usuario, recorrible desde cualquier punto:
//
//   RETO      Contaminación por nitratos del agua
//     -> CAUSAS      (con peso)
//     -> SOLUCIÓN    Humedales artificiales
//        -> NECESIDAD  Monitorización continua de nitratos
//           -> DEMANDA  Se necesitan sensores de calidad del agua
//              -> PRODUCTO Sensor IoT de calidad del agua
//                 -> TRANSACCIÓN (compra)
//                    -> INICIATIVA Recuperación del Arroyo Norte
//                       -> RESULTADOS (indicador antes/después)
//                          -> CASO DE ÉXITO
//                             -> PUBLICACIONES
//
// Más los datos de demostración pedidos: 5 usuarios, 5 organizaciones,
// 5 productos, 5 demandas, 5 retos, 5 soluciones, 5 iniciativas,
// 5 casos de éxito y 20 publicaciones, todo conectado al grafo.
//
// Idempotente: usa ON CONFLICT DO UPDATE y borra sus propios enlaces antes de
// recrearlos, así que puede ejecutarse las veces que haga falta.

const T_ESPANA = 'T003';
const T_MADRID = 'T004';
const T_TALAMANCA = 'T014';
const O_AGUA = 'O001';
const IND_CALIDAD = 'IND_AGUA_CALIDAD';
const MARKER_PUREZA = 'MARKER_AGUA_CALIDAD_PUREZA';
const METRIC_NITRATOS = 'METRIC_AGUA_PUREZA_NITRATOS';

const nowIso = new Date().toISOString().slice(0, 10);

async function exec(q: any) { return db.execute(q); }

/** Inserta pares en una tabla de unión, ignorando duplicados. */
async function link(table: string, colA: string, valA: string, colB: string, values: string[]) {
  for (const v of values) {
    await exec(sql`
      INSERT INTO ${sql.raw(table)} (${sql.raw(colA)}, ${sql.raw(colB)}) VALUES (${valA}, ${v})
      ON CONFLICT DO NOTHING
    `);
  }
}

// ---------------------------------------------------------------------------
// 1. USUARIOS
// ---------------------------------------------------------------------------
const USERS = [
  { id: 'U_DEMO_LUCIA',  email: 'lucia@redhumana.org',  name: 'Lucía Fernández', level: ROLE.KNOWLEDGE, bio: 'Hidrogeóloga. Investigo contaminación difusa por nitratos en acuíferos.', loc: 'Madrid', spec: ['agua', 'hidrogeología', 'nitratos'] },
  { id: 'U_DEMO_MARC',   email: 'marc@redhumana.org',   name: 'Marc Oliver',     level: ROLE.VERIFIED,  bio: 'Ingeniero de sensores IoT ambientales.', loc: 'Barcelona', spec: ['sensores', 'iot', 'telemetría'] },
  { id: 'U_DEMO_AINHOA', email: 'ainhoa@redhumana.org', name: 'Ainhoa Beitia',   level: ROLE.VERIFIED,  bio: 'Técnica municipal de medio ambiente.', loc: 'Talamanca de Jarama', spec: ['gestión municipal', 'restauración fluvial'] },
  { id: 'U_DEMO_SAMUEL', email: 'samuel@redhumana.org', name: 'Samuel Ortega',   level: ROLE.USER,      bio: 'Agricultor en transición a producción ecológica.', loc: 'Vega del Jarama', spec: ['agricultura', 'fertilización'] },
  { id: 'U_DEMO_NEREA',  email: 'nerea@redhumana.org',  name: 'Nerea Salas',     level: ROLE.KNOWLEDGE, bio: 'Bióloga especializada en humedales artificiales.', loc: 'Valencia', spec: ['humedales', 'biodiversidad', 'fitodepuración'] },
];

async function seedUsers() {
  for (const u of USERS) {
    await exec(sql`
      INSERT INTO users (id, email, name, display_name, password_hash, role_level, email_verified, bio, location, specialties, created_by)
      VALUES (${u.id}, ${u.email}, ${u.name}, ${u.name}, ${hashPassword('RedHumana2026!')},
              ${u.level}, true, ${u.bio}, ${u.loc}, ${JSON.stringify(u.spec)}::jsonb, ${u.id})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, display_name = EXCLUDED.display_name, role_level = EXCLUDED.role_level,
        bio = EXCLUDED.bio, location = EXCLUDED.location, specialties = EXCLUDED.specialties,
        updated_at = now()
    `);
  }
  // Territorios donde trabajan
  await link('user_territories', 'user_id', 'U_DEMO_LUCIA', 'territory_id', [T_ESPANA, T_MADRID]);
  await link('user_territories', 'user_id', 'U_DEMO_AINHOA', 'territory_id', [T_TALAMANCA]);
  await link('user_objectives', 'user_id', 'U_DEMO_LUCIA', 'objective_id', [O_AGUA]);
  await link('user_indicators', 'user_id', 'U_DEMO_LUCIA', 'indicator_id', [IND_CALIDAD]);
  console.log(`  ${USERS.length} usuarios`);
}

// ---------------------------------------------------------------------------
// 2. ORGANIZACIONES
// ---------------------------------------------------------------------------
const ORGS = [
  { id: 'ORG_DEMO_HIDRO', name: 'Hidrolab Ibérica', type: 'company', scale: 'nacional', terr: T_ESPANA, desc: 'Laboratorio de análisis de aguas y consultoría hidrológica.' },
  { id: 'ORG_DEMO_SENSE', name: 'SensaAgua Tech', type: 'company', scale: 'nacional', terr: T_ESPANA, desc: 'Fabricante de sensores IoT para calidad del agua.' },
  { id: 'ORG_DEMO_AYTO',  name: 'Ayuntamiento de Talamanca de Jarama', type: 'government', scale: 'municipal', terr: T_TALAMANCA, desc: 'Administración local.' },
  { id: 'ORG_DEMO_COOP',  name: 'Cooperativa Agraria del Jarama', type: 'community', scale: 'local', terr: T_MADRID, desc: 'Agrupación de agricultores de la vega del Jarama.' },
  { id: 'ORG_DEMO_FUND',  name: 'Fundación Ríos Vivos', type: 'ngo', scale: 'nacional', terr: T_ESPANA, desc: 'Restauración de ecosistemas fluviales.' },
];

async function seedOrgs() {
  for (const o of ORGS) {
    await exec(sql`
      INSERT INTO organizations (id, name, type, scale, territory_id, description, created_by)
      VALUES (${o.id}, ${o.name}, ${o.type}, ${o.scale}, ${o.terr}, ${o.desc}, 'U_ADMIN_EUGENIO')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = now()
    `);
  }
  await link('organization_objectives', 'organization_id', 'ORG_DEMO_HIDRO', 'objective_id', [O_AGUA]);
  await link('organization_objectives', 'organization_id', 'ORG_DEMO_FUND', 'objective_id', [O_AGUA]);
  console.log(`  ${ORGS.length} organizaciones`);
}

// ---------------------------------------------------------------------------
// 3. RETOS (el principal + 4 más)
// ---------------------------------------------------------------------------
const CHALLENGE_NITRATOS = 'R_DEMO_NITRATOS';
const CHALLENGES = [
  { id: CHALLENGE_NITRATOS, title: 'Contaminación por nitratos del agua', scope: 'regional', priority: 'critical',
    desc: 'La infiltración de nitratos procedentes de fertilización agrícola intensiva y de purines degrada acuíferos y tramos fluviales, comprometiendo el agua de boca y la vida acuática.' },
  { id: 'R_DEMO_MICROPLAST', title: 'Microplásticos en aguas superficiales', scope: 'national', priority: 'high',
    desc: 'Presencia creciente de microplásticos en ríos y embalses procedentes de textiles, neumáticos y residuos urbanos.' },
  { id: 'R_DEMO_CAUDAL', title: 'Pérdida de caudal ecológico', scope: 'regional', priority: 'high',
    desc: 'Las detracciones para riego y abastecimiento reducen el caudal por debajo del mínimo que necesita el ecosistema fluvial.' },
  { id: 'R_DEMO_FUGAS', title: 'Fugas en la red de distribución', scope: 'municipal', priority: 'medium',
    desc: 'Redes envejecidas que pierden un porcentaje significativo del agua potabilizada antes de llegar al consumidor.' },
  { id: 'R_DEMO_RIBERA', title: 'Degradación del bosque de ribera', scope: 'regional', priority: 'medium',
    desc: 'La desaparición de la vegetación de ribera elimina el filtro natural que retenía nutrientes y estabilizaba las márgenes.' },
];

const CAUSES_NITRATOS = [
  { id: 'C_DEMO_FERT', title: 'Fertilización excesiva', type: 'agrícola', pct: 42, desc: 'Aplicación de fertilizantes nitrogenados por encima de la capacidad de absorción del cultivo.' },
  { id: 'C_DEMO_PURIN', title: 'Purines ganaderos', type: 'ganadera', pct: 27, desc: 'Vertido y aplicación de deyecciones de ganadería intensiva sin tratamiento suficiente.' },
  { id: 'C_DEMO_DEPUR', title: 'Depuración insuficiente', type: 'infraestructura', pct: 16, desc: 'Estaciones depuradoras sin tratamiento terciario de eliminación de nitrógeno.' },
  { id: 'C_DEMO_RIBERA2', title: 'Pérdida de ribera filtrante', type: 'ecológica', pct: 10, desc: 'Desaparición de la vegetación que retenía nutrientes antes de alcanzar el cauce.' },
  { id: 'C_DEMO_OTRAS', title: 'Otras', type: 'varias', pct: 5, desc: 'Fuentes difusas menores y episodios puntuales.' },
];

async function seedChallenges() {
  for (const c of CHALLENGES) {
    await exec(sql`
      INSERT INTO challenges (id, title, scope, description, priority, created_by, updated_by)
      VALUES (${c.id}, ${c.title}, ${c.scope}, ${c.desc}, ${c.priority}, 'U_DEMO_LUCIA', 'U_DEMO_LUCIA')
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
        scope = EXCLUDED.scope, priority = EXCLUDED.priority, updated_at = now()
    `);
    await link('challenge_territories', 'challenge_id', c.id, 'territory_id', [T_ESPANA, T_MADRID]);
    await link('challenge_objectives', 'challenge_id', c.id, 'objective_id', [O_AGUA]);
    await link('challenge_indicators', 'challenge_id', c.id, 'indicator_id', [IND_CALIDAD]);
  }
  // El reto principal baja hasta marcador y métrica
  await link('challenge_markers', 'challenge_id', CHALLENGE_NITRATOS, 'marker_id', [MARKER_PUREZA]);
  const m = await exec(sql`SELECT id FROM metrics WHERE id = ${METRIC_NITRATOS}`);
  if (m.rows.length) await link('challenge_metrics', 'challenge_id', CHALLENGE_NITRATOS, 'metric_id', [METRIC_NITRATOS]);

  for (const c of CAUSES_NITRATOS) {
    await exec(sql`
      INSERT INTO causes (id, title, type, description, created_by, updated_by)
      VALUES (${c.id}, ${c.title}, ${c.type}, ${c.desc}, 'U_DEMO_LUCIA', 'U_DEMO_LUCIA')
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, updated_at = now()
    `);
    await exec(sql`
      INSERT INTO challenge_causes (challenge_id, cause_id, percentage)
      VALUES (${CHALLENGE_NITRATOS}, ${c.id}, ${c.pct})
      ON CONFLICT (challenge_id, cause_id) DO UPDATE SET percentage = EXCLUDED.percentage
    `);
  }
  console.log(`  ${CHALLENGES.length} retos + ${CAUSES_NITRATOS.length} causas`);
}

// ---------------------------------------------------------------------------
// 4. SOLUCIONES
// ---------------------------------------------------------------------------
const SOL_HUMEDALES = 'S_DEMO_HUMEDALES';
const SOLUTIONS = [
  { id: SOL_HUMEDALES, title: 'Humedales artificiales', type: 'nature_based', impact: 'alto', cost: 'medio', readiness: 'probada',
    desc: 'Sistemas de fitodepuración que retienen y transforman el nitrógeno mediante vegetación macrófita y procesos microbianos, antes de que el agua alcance el cauce principal.',
    causes: ['C_DEMO_FERT', 'C_DEMO_DEPUR', 'C_DEMO_RIBERA2'] },
  { id: 'S_DEMO_FERTPRECISA', title: 'Fertilización de precisión', type: 'technical', impact: 'alto', cost: 'medio', readiness: 'probada',
    desc: 'Ajuste de la dosis de nitrógeno a la necesidad real del cultivo mediante análisis de suelo y sensores.', causes: ['C_DEMO_FERT'] },
  { id: 'S_DEMO_CUBIERTAS', title: 'Cubiertas vegetales de invierno', type: 'agronomic', impact: 'medio', cost: 'bajo', readiness: 'probada',
    desc: 'Cultivos de cobertura que capturan el nitrógeno residual y evitan su lixiviación en el periodo de lluvias.', causes: ['C_DEMO_FERT'] },
  { id: 'S_DEMO_TERCIARIO', title: 'Tratamiento terciario en depuradoras', type: 'infrastructure', impact: 'alto', cost: 'alto', readiness: 'probada',
    desc: 'Incorporación de eliminación biológica de nitrógeno en las EDAR existentes.', causes: ['C_DEMO_DEPUR'] },
  { id: 'S_DEMO_RESTRIBERA', title: 'Restauración del bosque de ribera', type: 'nature_based', impact: 'medio', cost: 'medio', readiness: 'probada',
    desc: 'Replantación de vegetación de ribera para recuperar su función de filtro verde.', causes: ['C_DEMO_RIBERA2'] },
];

async function seedSolutions() {
  for (const s of SOLUTIONS) {
    await exec(sql`
      INSERT INTO solutions (id, title, type, description, impact, cost, readiness, created_by, updated_by)
      VALUES (${s.id}, ${s.title}, ${s.type}, ${s.desc}, ${s.impact}, ${s.cost}, ${s.readiness}, 'U_DEMO_NEREA', 'U_DEMO_NEREA')
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
        impact = EXCLUDED.impact, cost = EXCLUDED.cost, readiness = EXCLUDED.readiness, updated_at = now()
    `);
    await link('challenge_solutions', 'challenge_id', CHALLENGE_NITRATOS, 'solution_id', [s.id]);
    await link('solution_causes', 'solution_id', s.id, 'cause_id', s.causes);
  }
  console.log(`  ${SOLUTIONS.length} soluciones`);
}

// ---------------------------------------------------------------------------
// 5. NECESIDADES
// ---------------------------------------------------------------------------
const NEED_SENSORES = 'NEC_DEMO_SENSORES';
const NEEDS = [
  { id: NEED_SENSORES, title: 'Monitorización continua de nitratos', kind: 'producto', qty: '8 estaciones', urgency: 'alta',
    desc: 'Para dimensionar y validar el humedal hace falta medir nitratos en continuo aguas arriba y aguas abajo, no con muestreos puntuales mensuales.', sols: [SOL_HUMEDALES] },
  { id: 'NEC_DEMO_TERRENO', title: 'Terreno para el humedal', kind: 'organizacion', qty: '1,2 ha', urgency: 'alta',
    desc: 'Superficie inundable junto al cauce, cedida o arrendada.', sols: [SOL_HUMEDALES] },
  { id: 'NEC_DEMO_PLANTA', title: 'Planta macrófita autóctona', kind: 'producto', qty: '12.000 ejemplares', urgency: 'media',
    desc: 'Carrizo, espadaña y junco de procedencia local para la plantación del humedal.', sols: [SOL_HUMEDALES] },
  { id: 'NEC_DEMO_FINANC', title: 'Financiación de la obra', kind: 'financiacion', qty: '180.000 €', urgency: 'alta',
    desc: 'Movimiento de tierras, impermeabilización y obra hidráulica.', sols: [SOL_HUMEDALES] },
  { id: 'NEC_DEMO_ASESOR', title: 'Asesoramiento agronómico', kind: 'servicio', qty: '40 explotaciones', urgency: 'media',
    desc: 'Acompañamiento técnico a agricultores para ajustar la fertilización.', sols: ['S_DEMO_FERTPRECISA'] },
];

async function seedNeeds() {
  for (const n of NEEDS) {
    await exec(sql`
      INSERT INTO needs (id, title, description, kind, quantity, urgency, status, created_by, updated_by)
      VALUES (${n.id}, ${n.title}, ${n.desc}, ${n.kind}, ${n.qty}, ${n.urgency}, 'abierta', 'U_DEMO_AINHOA', 'U_DEMO_AINHOA')
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, updated_at = now()
    `);
    await link('solution_needs', 'need_id', n.id, 'solution_id', n.sols);
    await link('need_territories', 'need_id', n.id, 'territory_id', [T_TALAMANCA]);
  }
  console.log(`  ${NEEDS.length} necesidades`);
}

// ---------------------------------------------------------------------------
// 6. PRODUCTOS
// ---------------------------------------------------------------------------
const PROD_SENSOR = 'PRD_DEMO_SENSOR';
const PRODUCTS = [
  { id: PROD_SENSOR, name: 'Sensor IoT de calidad del agua', cat: 'sensores', price: 189000, kind: 'fisico', modality: 'unico', stock: 40,
    org: 'ORG_DEMO_SENSE', warranty: '3 años', ret: '30 días',
    desc: 'Sonda multiparamétrica con medición continua de nitratos, conductividad, oxígeno disuelto y temperatura. Transmisión por NB-IoT y alimentación solar autónoma.' },
  { id: 'PRD_DEMO_ANALISIS', name: 'Analítica de nitratos en laboratorio', cat: 'servicio', price: 4500, kind: 'digital', modality: 'unico', stock: null,
    org: 'ORG_DEMO_HIDRO', warranty: null, ret: null,
    desc: 'Determinación de nitratos, nitritos y amonio en muestra de agua, con informe acreditado.' },
  { id: 'PRD_DEMO_PLANTA', name: 'Lote de planta macrófita autóctona', cat: 'vegetal', price: 120, kind: 'fisico', modality: 'unico', stock: 20000,
    org: 'ORG_DEMO_FUND', warranty: 'reposición de marras', ret: null,
    desc: 'Ejemplar de carrizo, espadaña o junco de procedencia local, apto para humedal de fitodepuración.' },
  { id: 'PRD_DEMO_PLATAFORMA', name: 'Plataforma de telemetría hídrica', cat: 'software', price: 9900, kind: 'digital', modality: 'suscripcion', stock: null,
    org: 'ORG_DEMO_SENSE', warranty: null, ret: null, period: 'mensual',
    desc: 'Panel de visualización y alertas para redes de sensores de calidad del agua.' },
  { id: 'PRD_DEMO_CONSULT', name: 'Diseño de humedal artificial', cat: 'servicio', price: 450000, kind: 'digital', modality: 'unico', stock: null,
    org: 'ORG_DEMO_HIDRO', warranty: null, ret: null,
    desc: 'Proyecto técnico completo de humedal de flujo subsuperficial, dimensionado según carga de nitrógeno.' },
];

async function seedProducts() {
  for (const p of PRODUCTS) {
    await exec(sql`
      INSERT INTO products (id, name, description, category, price_cents, currency, kind, modality, billing_period,
                            stock, warranty, return_policy, organization_id, created_by, updated_by)
      VALUES (${p.id}, ${p.name}, ${p.desc}, ${p.cat}, ${p.price}, 'EUR', ${p.kind}, ${p.modality},
              ${(p as any).period || null}, ${p.stock}, ${p.warranty}, ${p.ret}, ${p.org}, 'U_DEMO_MARC', 'U_DEMO_MARC')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
        price_cents = EXCLUDED.price_cents, stock = EXCLUDED.stock, updated_at = now()
    `);
    await link('product_territories', 'product_id', p.id, 'territory_id', [T_ESPANA]);
    await link('product_objectives', 'product_id', p.id, 'objective_id', [O_AGUA]);
    await link('product_indicators', 'product_id', p.id, 'indicator_id', [IND_CALIDAD]);
    await link('product_challenges', 'product_id', p.id, 'challenge_id', [CHALLENGE_NITRATOS]);
  }
  // El sensor es lo que satisface la necesidad de monitorización
  await link('product_needs', 'product_id', PROD_SENSOR, 'need_id', [NEED_SENSORES]);
  await link('product_solutions', 'product_id', PROD_SENSOR, 'solution_id', [SOL_HUMEDALES]);
  await link('product_needs', 'product_id', 'PRD_DEMO_PLANTA', 'need_id', ['NEC_DEMO_PLANTA']);
  await link('product_solutions', 'product_id', 'PRD_DEMO_CONSULT', 'solution_id', [SOL_HUMEDALES]);
  console.log(`  ${PRODUCTS.length} productos`);
}

// ---------------------------------------------------------------------------
// 7. DEMANDAS
// ---------------------------------------------------------------------------
const DEMAND_SENSORES = 'DEM_DEMO_SENSORES';
const DEMANDS = [
  { id: DEMAND_SENSORES, title: 'Se necesitan sensores de calidad del agua', budget: 1600000, urgency: 'alta', status: 'cubierta',
    org: 'ORG_DEMO_AYTO',
    desc: 'El Ayuntamiento busca 8 sensores de nitratos en continuo para instrumentar el tramo del Arroyo Norte antes y después del futuro humedal.' },
  { id: 'DEM_DEMO_TERRENO', title: 'Terreno inundable junto al Arroyo Norte', budget: 0, urgency: 'alta', status: 'cubierta', org: 'ORG_DEMO_AYTO',
    desc: 'Se busca parcela de al menos 1 ha cedida o arrendada para implantar el humedal.' },
  { id: 'DEM_DEMO_ASESOR', title: 'Asesoramiento en fertilización de precisión', budget: 2400000, urgency: 'media', status: 'abierta', org: 'ORG_DEMO_COOP',
    desc: 'La cooperativa busca apoyo técnico para 40 explotaciones de la vega.' },
  { id: 'DEM_DEMO_ANALITICA', title: 'Campaña de analítica de acuífero', budget: 900000, urgency: 'media', status: 'en_negociacion', org: 'ORG_DEMO_AYTO',
    desc: 'Analítica trimestral de 25 pozos durante dos años.' },
  { id: 'DEM_DEMO_DIVULGA', title: 'Material divulgativo sobre nitratos', budget: 300000, urgency: 'baja', status: 'abierta', org: 'ORG_DEMO_FUND',
    desc: 'Piezas divulgativas para explicar el problema de los nitratos a la población local.' },
];

async function seedDemands() {
  for (const d of DEMANDS) {
    await exec(sql`
      INSERT INTO demands (id, title, description, budget_cents, currency, urgency, status, organization_id, created_by, updated_by)
      VALUES (${d.id}, ${d.title}, ${d.desc}, ${d.budget}, 'EUR', ${d.urgency}, ${d.status}, ${d.org}, 'U_DEMO_AINHOA', 'U_DEMO_AINHOA')
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
        status = EXCLUDED.status, updated_at = now()
    `);
    await link('demand_territories', 'demand_id', d.id, 'territory_id', [T_TALAMANCA, T_MADRID]);
    await link('demand_indicators', 'demand_id', d.id, 'indicator_id', [IND_CALIDAD]);
    await link('demand_challenges', 'demand_id', d.id, 'challenge_id', [CHALLENGE_NITRATOS]);
  }
  // El eslabón clave: la demanda expresa la necesidad y se cubre con el producto
  await link('demand_needs', 'demand_id', DEMAND_SENSORES, 'need_id', [NEED_SENSORES]);
  await link('demand_products', 'demand_id', DEMAND_SENSORES, 'product_id', [PROD_SENSOR]);
  await link('demand_needs', 'demand_id', 'DEM_DEMO_TERRENO', 'need_id', ['NEC_DEMO_TERRENO']);
  console.log(`  ${DEMANDS.length} demandas`);
}

// ---------------------------------------------------------------------------
// 8. INICIATIVAS
// ---------------------------------------------------------------------------
const INI_ARROYO = 'INI_DEMO_ARROYO';
const INITIATIVES = [
  { id: INI_ARROYO, name: 'Recuperación del Arroyo Norte', status: 'completada', type: 'restauracion', terr: T_TALAMANCA,
    planned: 21000000, executed: 19740000, start: '2025-03-01', end: '2026-05-30',
    desc: 'Implantación de un humedal artificial de flujo subsuperficial de 1,2 ha en el tramo bajo del Arroyo Norte, con red de 8 sensores de nitratos en continuo aguas arriba y aguas abajo.',
    outcome: 'La concentración media de nitratos aguas abajo del humedal bajó de 62 a 28 mg/l en 14 meses, situándose por debajo del umbral de 50 mg/l de la Directiva de Nitratos.',
    lessons: 'Instrumentar ANTES de construir fue determinante: la serie previa de 6 meses permitió demostrar la mejora con datos propios y no con estimaciones. El sobrecoste evitado vino de dimensionar con datos reales en vez de con valores de tabla.' },
  { id: 'INI_DEMO_FERTVEGA', name: 'Fertilización de precisión en la vega', status: 'en_curso', type: 'agronomica', terr: T_MADRID,
    planned: 8000000, executed: 3100000, start: '2026-01-15', end: null,
    desc: 'Acompañamiento a 40 explotaciones para ajustar la dosis de nitrógeno mediante análisis de suelo.', outcome: null, lessons: null },
  { id: 'INI_DEMO_RIBERA', name: 'Restauración de ribera del Jarama medio', status: 'en_curso', type: 'restauracion', terr: T_MADRID,
    planned: 15000000, executed: 6200000, start: '2025-11-01', end: null,
    desc: 'Replantación de 14 km de bosque de ribera como filtro verde.', outcome: null, lessons: null },
  { id: 'INI_DEMO_TERCIARIO', name: 'Terciario en la EDAR comarcal', status: 'planificada', type: 'infraestructura', terr: T_MADRID,
    planned: 120000000, executed: 0, start: null, end: null,
    desc: 'Incorporación de eliminación biológica de nitrógeno en la depuradora comarcal.', outcome: null, lessons: null },
  { id: 'INI_DEMO_SENSORRED', name: 'Red comarcal de vigilancia de nitratos', status: 'en_curso', type: 'monitorizacion', terr: T_MADRID,
    planned: 4500000, executed: 2800000, start: '2026-02-01', end: null,
    desc: 'Extensión del modelo de sensores del Arroyo Norte a otros seis municipios de la comarca.', outcome: null, lessons: null },
];

async function seedInitiatives() {
  for (const i of INITIATIVES) {
    await exec(sql`
      INSERT INTO initiatives (id, name, description, type, status, territory_id, budget_planned_cents,
                               budget_executed_cents, currency, started_at, ended_at, outcome, lessons,
                               created_by, updated_by)
      VALUES (${i.id}, ${i.name}, ${i.desc}, ${i.type}, ${i.status}, ${i.terr}, ${i.planned}, ${i.executed},
              'EUR', ${i.start}, ${i.end}, ${i.outcome}, ${i.lessons}, 'U_DEMO_AINHOA', 'U_DEMO_AINHOA')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
        status = EXCLUDED.status, budget_executed_cents = EXCLUDED.budget_executed_cents,
        outcome = EXCLUDED.outcome, lessons = EXCLUDED.lessons, updated_at = now()
    `);
    await link('initiative_challenges', 'initiative_id', i.id, 'challenge_id', [CHALLENGE_NITRATOS]);
    await link('initiative_objectives', 'initiative_id', i.id, 'objective_id', [O_AGUA]);
    await link('initiative_territories', 'initiative_id', i.id, 'territory_id', [i.terr]);
  }

  // La iniciativa principal: aplica la solución, usa el producto, cubre la
  // demanda y tiene participantes. Es lo que cierra la cadena.
  await link('initiative_solutions', 'initiative_id', INI_ARROYO, 'solution_id', [SOL_HUMEDALES, 'S_DEMO_RESTRIBERA']);
  await link('initiative_demands', 'initiative_id', INI_ARROYO, 'demand_id', [DEMAND_SENSORES, 'DEM_DEMO_TERRENO']);
  await link('initiative_organizations', 'initiative_id', INI_ARROYO, 'organization_id', ['ORG_DEMO_AYTO', 'ORG_DEMO_HIDRO', 'ORG_DEMO_FUND']);

  await exec(sql`
    INSERT INTO initiative_products (initiative_id, product_id, quantity) VALUES (${INI_ARROYO}, ${PROD_SENSOR}, 8)
    ON CONFLICT (initiative_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity
  `);
  await exec(sql`
    INSERT INTO initiative_products (initiative_id, product_id, quantity) VALUES (${INI_ARROYO}, 'PRD_DEMO_PLANTA', 12000)
    ON CONFLICT (initiative_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity
  `);
  for (const [uid, role] of [['U_DEMO_AINHOA', 'coordinación'], ['U_DEMO_NEREA', 'diseño del humedal'],
                             ['U_DEMO_LUCIA', 'seguimiento analítico'], ['U_DEMO_MARC', 'instrumentación']] as const) {
    await exec(sql`
      INSERT INTO initiative_participants (initiative_id, user_id, role) VALUES (${INI_ARROYO}, ${uid}, ${role})
      ON CONFLICT (initiative_id, user_id) DO UPDATE SET role = EXCLUDED.role
    `);
  }

  // RESULTADOS: indicadores antes/después. Es lo que convierte la iniciativa
  // en impacto medible (principio 13).
  await exec(sql`DELETE FROM initiative_results WHERE initiative_id = ${INI_ARROYO}`);
  await exec(sql`
    INSERT INTO initiative_results (initiative_id, indicator_id, marker_id, value_before, value_after, unit, measured_at, note)
    VALUES
      (${INI_ARROYO}, ${IND_CALIDAD}, ${MARKER_PUREZA}, 62, 28, 'mg/l NO3', ${nowIso},
       'Concentración media de nitratos aguas abajo del humedal.'),
      (${INI_ARROYO}, ${IND_CALIDAD}, ${MARKER_PUREZA}, 54.2, 71.8, '% (índice Pureza)', ${nowIso},
       'Puntuación del marcador Pureza en el tramo instrumentado.')
  `);
  console.log(`  ${INITIATIVES.length} iniciativas + 2 resultados medidos`);
}

// ---------------------------------------------------------------------------
// 9. TRANSACCIÓN (la compra que enlaza demanda -> producto -> iniciativa)
// ---------------------------------------------------------------------------
async function seedTransaction() {
  const txId = 'TRX_DEMO_SENSORES';
  await exec(sql`
    INSERT INTO transactions (id, kind, status, amount_cents, currency, platform_fee_cents,
                              payer_user_id, payee_organization_id, concept)
    VALUES (${txId}, 'compra', 'pagado', 1512000, 'EUR', 45360,
            'U_DEMO_AINHOA', 'ORG_DEMO_SENSE',
            'Compra de 8 sensores IoT de calidad del agua para la iniciativa Recuperación del Arroyo Norte')
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()
  `);
  await exec(sql`DELETE FROM transaction_links WHERE transaction_id = ${txId}`);
  for (const [t, i] of [['products', PROD_SENSOR], ['demands', DEMAND_SENSORES], ['initiatives', INI_ARROYO],
                        ['challenges', CHALLENGE_NITRATOS], ['territories', T_TALAMANCA],
                        ['objectives', O_AGUA], ['indicators', IND_CALIDAD]] as const) {
    await exec(sql`
      INSERT INTO transaction_links (transaction_id, entity_type, entity_id) VALUES (${txId}, ${t}, ${i})
      ON CONFLICT DO NOTHING
    `);
  }
  console.log('  1 transacción (compra) enlazada a 7 entidades del grafo');
}

// ---------------------------------------------------------------------------
// 10. CASOS DE ÉXITO
// ---------------------------------------------------------------------------
const CASE_ARROYO = 'CAS_DEMO_ARROYO';
const CASES = [
  { id: CASE_ARROYO, title: 'El Arroyo Norte vuelve a estar por debajo del límite de nitratos', ini: INI_ARROYO, terr: T_TALAMANCA, cost: 19740000,
    problem: 'El tramo bajo del Arroyo Norte superaba de forma sostenida los 50 mg/l de nitratos exigidos por la Directiva, con picos de 78 mg/l tras las lluvias de otoño.',
    sol: 'Humedal artificial de flujo subsuperficial de 1,2 ha, instrumentado con 8 sensores de nitratos en continuo instalados seis meses antes de la obra para disponer de línea base propia.',
    impact: 'Reducción del 55% en la concentración media de nitratos (62 -> 28 mg/l) y subida del marcador Pureza de 54,2% a 71,8% en 14 meses. Coste final un 6% por debajo del presupuesto.' },
  { id: 'CAS_DEMO_FERT', title: 'Menos fertilizante y misma cosecha en la vega del Jarama', ini: 'INI_DEMO_FERTVEGA', terr: T_MADRID, cost: 3100000,
    problem: 'Sobrefertilización sistemática por aplicar dosis de tabla en vez de dosis según análisis.',
    sol: 'Análisis de suelo por parcela y ajuste de la dosis de nitrógeno.',
    impact: 'Reducción media del 23% en nitrógeno aplicado sin pérdida de rendimiento en las primeras 12 explotaciones.' },
  { id: 'CAS_DEMO_RIBERA', title: '14 km de ribera recuperados como filtro verde', ini: 'INI_DEMO_RIBERA', terr: T_MADRID, cost: 6200000,
    problem: 'Márgenes desnudas sin capacidad de retención de nutrientes ni sombra para el cauce.',
    sol: 'Replantación con especies autóctonas de ribera y cerramiento temporal frente a ganado.',
    impact: 'Supervivencia del 87% a los 12 meses y descenso medible de la temperatura del agua en verano.' },
  { id: 'CAS_DEMO_RED', title: 'Una red comarcal de vigilancia nacida de un piloto municipal', ini: 'INI_DEMO_SENSORRED', terr: T_MADRID, cost: 2800000,
    problem: 'Cada municipio medía por su cuenta, con métodos y frecuencias distintas, y los datos no eran comparables.',
    sol: 'Extensión del modelo de instrumentación del Arroyo Norte a seis municipios con el mismo protocolo.',
    impact: 'Primera serie comarcal homogénea de nitratos, con 34 puntos de medida en continuo.' },
  { id: 'CAS_DEMO_COMPRA', title: 'Compra agrupada de sensores entre seis ayuntamientos', ini: 'INI_DEMO_SENSORRED', terr: T_MADRID, cost: 900000,
    problem: 'El precio unitario del sensor hacía inviable la instrumentación para municipios pequeños.',
    sol: 'Agregación de la demanda de seis municipios en un único pedido.',
    impact: 'Reducción del 20% en el precio unitario y de los costes de instalación y mantenimiento.' },
];

async function seedCases() {
  for (const c of CASES) {
    await exec(sql`
      INSERT INTO success_cases (id, title, problem, solution_summary, impact, cost_cents, currency,
                                 territory_id, initiative_id, created_by, updated_by)
      VALUES (${c.id}, ${c.title}, ${c.problem}, ${c.sol}, ${c.impact}, ${c.cost}, 'EUR',
              ${c.terr}, ${c.ini}, 'U_DEMO_AINHOA', 'U_DEMO_AINHOA')
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, problem = EXCLUDED.problem,
        solution_summary = EXCLUDED.solution_summary, impact = EXCLUDED.impact, updated_at = now()
    `);
    await link('success_case_initiatives', 'success_case_id', c.id, 'initiative_id', [c.ini]);
  }
  console.log(`  ${CASES.length} casos de éxito`);
}

// ---------------------------------------------------------------------------
// 11. PUBLICACIONES (20, enlazadas al grafo)
// ---------------------------------------------------------------------------
const PUBS: Array<{ author: string; title: string; body: string; links: Array<[string, string]> }> = [
  { author: 'U_DEMO_LUCIA', title: 'Por qué los nitratos no bajan solos', body: 'Llevamos seis campañas midiendo el mismo tramo. La conclusión incómoda es que sin cambiar la fertilización aguas arriba, cualquier medida de final de tubería solo desplaza el problema.', links: [['challenges', CHALLENGE_NITRATOS], ['indicators', IND_CALIDAD]] },
  { author: 'U_DEMO_NEREA', title: 'Cómo dimensionamos el humedal del Arroyo Norte', body: 'Partimos de la carga real de nitrógeno medida durante seis meses, no de valores de tabla. Eso cambió la superficie necesaria de 2,1 a 1,2 hectáreas.', links: [['solutions', SOL_HUMEDALES], ['initiatives', INI_ARROYO]] },
  { author: 'U_DEMO_MARC', title: 'Un año de sensores en continuo: lo que aprendimos', body: 'La telemetría por NB-IoT aguantó bien el invierno. El punto débil fue el biofouling de la sonda: hubo que pasar de limpieza trimestral a mensual.', links: [['products', PROD_SENSOR], ['initiatives', INI_ARROYO]] },
  { author: 'U_DEMO_AINHOA', title: 'El humedal ya está en funcionamiento', body: 'Después de catorce meses, el tramo bajo del Arroyo Norte está por debajo de 30 mg/l de forma sostenida. Gracias a todos los que habéis empujado esto.', links: [['initiatives', INI_ARROYO], ['success_cases', CASE_ARROYO], ['territories', T_TALAMANCA]] },
  { author: 'U_DEMO_SAMUEL', title: 'He bajado un 25% el abonado sin perder cosecha', body: 'Llevaba años echando la dosis que me decían en la cooperativa. Con el análisis de suelo he visto que sobraba nitrógeno en la mitad de mis parcelas.', links: [['solutions', 'S_DEMO_FERTPRECISA'], ['initiatives', 'INI_DEMO_FERTVEGA']] },
  { author: 'U_DEMO_LUCIA', title: 'Serie histórica de nitratos del Jarama medio', body: 'Publicamos la serie 2015-2026 de los 25 puntos de control. Se ve claramente el patrón estacional ligado a las aplicaciones de primavera.', links: [['indicators', IND_CALIDAD], ['territories', T_MADRID]] },
  { author: 'U_DEMO_NEREA', title: 'Qué planta poner y cuál no', body: 'El carrizo funciona pero se come el humedal si no lo controlas. Mezclar con espadaña y junco da más estabilidad a medio plazo.', links: [['solutions', SOL_HUMEDALES], ['products', 'PRD_DEMO_PLANTA']] },
  { author: 'U_DEMO_MARC', title: 'Comparativa de sondas de nitrato', body: 'Hemos probado cuatro modelos en las mismas condiciones durante ocho meses. Adjuntamos la deriva medida de cada uno.', links: [['products', PROD_SENSOR], ['challenges', CHALLENGE_NITRATOS]] },
  { author: 'U_DEMO_AINHOA', title: 'Buscamos terreno inundable', body: 'Seguimos necesitando parcelas junto al cauce para replicar el modelo en el siguiente tramo. Cesión o arrendamiento.', links: [['demands', 'DEM_DEMO_TERRENO'], ['needs', 'NEC_DEMO_TERRENO']] },
  { author: 'U_DEMO_LUCIA', title: 'La depuradora comarcal necesita terciario', body: 'Los datos aguas abajo del vertido no dejan lugar a dudas: sin eliminación de nitrógeno en la EDAR no llegaremos al objetivo.', links: [['solutions', 'S_DEMO_TERCIARIO'], ['initiatives', 'INI_DEMO_TERCIARIO']] },
  { author: 'U_DEMO_NEREA', title: 'Los humedales también son biodiversidad', body: 'A los ocho meses ya teníamos nidificación de dos especies de anátidas. El beneficio no es solo depurativo.', links: [['solutions', SOL_HUMEDALES], ['objectives', O_AGUA]] },
  { author: 'U_DEMO_SAMUEL', title: 'Dudas sobre las cubiertas de invierno', body: '¿Alguien las ha probado en secano en esta comarca? Me preocupa que compitan por el agua con el cultivo siguiente.', links: [['solutions', 'S_DEMO_CUBIERTAS']] },
  { author: 'U_DEMO_MARC', title: 'Abrimos la plataforma de telemetría', body: 'Los datos de los 8 sensores del Arroyo Norte son públicos desde hoy, con actualización cada 15 minutos.', links: [['products', 'PRD_DEMO_PLATAFORMA'], ['initiatives', INI_ARROYO]] },
  { author: 'U_DEMO_AINHOA', title: 'Coste real frente a presupuesto', body: 'Cerramos en 197.400 € sobre un presupuesto de 210.000 €. Detallamos las partidas por si sirve a otros municipios.', links: [['initiatives', INI_ARROYO], ['success_cases', CASE_ARROYO]] },
  { author: 'U_DEMO_LUCIA', title: 'Microplásticos: el siguiente frente', body: 'Mientras peleamos con los nitratos, las primeras analíticas de microplásticos en el embalse dan cifras que merecen atención.', links: [['challenges', 'R_DEMO_MICROPLAST']] },
  { author: 'U_DEMO_NEREA', title: 'La ribera como filtro verde', body: 'Catorce kilómetros replantados. La supervivencia a doce meses es del 87%, mejor de lo que esperábamos.', links: [['initiatives', 'INI_DEMO_RIBERA'], ['solutions', 'S_DEMO_RESTRIBERA']] },
  { author: 'U_DEMO_MARC', title: 'Compra agrupada: un 20% menos por sensor', body: 'Seis ayuntamientos juntando pedido. El ahorro no es solo el precio: también el mantenimiento compartido.', links: [['success_cases', 'CAS_DEMO_COMPRA'], ['products', PROD_SENSOR]] },
  { author: 'U_DEMO_SAMUEL', title: 'Lo que nadie te cuenta del análisis de suelo', body: 'Hay que muestrear bien. La primera campaña la hice mal y los resultados no tenían sentido.', links: [['solutions', 'S_DEMO_FERTPRECISA']] },
  { author: 'U_DEMO_AINHOA', title: 'Extendemos el modelo a la comarca', body: 'Lo que empezó como un piloto municipal es ya una red de 34 puntos en seis municipios.', links: [['initiatives', 'INI_DEMO_SENSORRED'], ['territories', T_MADRID]] },
  { author: 'U_DEMO_LUCIA', title: 'Balance de nitrógeno de la cuenca', body: 'Publicamos el balance completo: entradas por fertilización y ganadería, salidas por cosecha y lixiviación. El desequilibrio explica casi todo.', links: [['challenges', CHALLENGE_NITRATOS], ['causes' as any, 'C_DEMO_FERT']] },
];

async function seedPublications() {
  for (let i = 0; i < PUBS.length; i++) {
    const p = PUBS[i];
    const id = `PUB_DEMO_${String(i + 1).padStart(2, '0')}`;
    await exec(sql`
      INSERT INTO publications (id, author_user_id, title, body, created_by, updated_by)
      VALUES (${id}, ${p.author}, ${p.title}, ${p.body}, ${p.author}, ${p.author})
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, updated_at = now()
    `);
    await exec(sql`DELETE FROM publication_links WHERE publication_id = ${id}`);
    for (const [t, eid] of p.links) {
      await exec(sql`
        INSERT INTO publication_links (publication_id, entity_type, entity_id) VALUES (${id}, ${t}, ${eid})
        ON CONFLICT DO NOTHING
      `);
    }
  }
  console.log(`  ${PUBS.length} publicaciones enlazadas al grafo`);
}

// ---------------------------------------------------------------------------
// 12. INTERACCIONES SOCIALES
// ---------------------------------------------------------------------------
async function seedSocial() {
  const follows: Array<[string, string, string]> = [
    ['U_DEMO_SAMUEL', 'users', 'U_DEMO_LUCIA'],
    ['U_DEMO_SAMUEL', 'users', 'U_DEMO_NEREA'],
    ['U_DEMO_AINHOA', 'users', 'U_DEMO_MARC'],
    ['U_DEMO_MARC', 'users', 'U_DEMO_LUCIA'],
    ['U_DEMO_SAMUEL', 'challenges', CHALLENGE_NITRATOS],
    ['U_DEMO_AINHOA', 'challenges', CHALLENGE_NITRATOS],
    ['U_DEMO_MARC', 'territories', T_TALAMANCA],
    ['U_DEMO_NEREA', 'objectives', O_AGUA],
    ['U_DEMO_LUCIA', 'indicators', IND_CALIDAD],
  ];
  for (const [u, t, e] of follows) {
    await exec(sql`
      INSERT INTO follows (follower_user_id, entity_type, entity_id) VALUES (${u}, ${t}, ${e})
      ON CONFLICT DO NOTHING
    `);
  }

  const reactions: Array<[string, string]> = [
    ['U_DEMO_SAMUEL', 'PUB_DEMO_01'], ['U_DEMO_AINHOA', 'PUB_DEMO_01'], ['U_DEMO_MARC', 'PUB_DEMO_01'],
    ['U_DEMO_LUCIA', 'PUB_DEMO_04'], ['U_DEMO_NEREA', 'PUB_DEMO_04'], ['U_DEMO_SAMUEL', 'PUB_DEMO_04'],
    ['U_DEMO_MARC', 'PUB_DEMO_04'], ['U_DEMO_LUCIA', 'PUB_DEMO_02'], ['U_DEMO_AINHOA', 'PUB_DEMO_03'],
  ];
  for (const [u, p] of reactions) {
    await exec(sql`
      INSERT INTO reactions (user_id, entity_type, entity_id, kind) VALUES (${u}, 'publications', ${p}, 'apoyo')
      ON CONFLICT DO NOTHING
    `);
  }

  const comments: Array<[string, string, string, string]> = [
    ['CMT_DEMO_01', 'PUB_DEMO_01', 'U_DEMO_SAMUEL', 'Como agricultor lo confirmo: el problema empieza en la parcela, no en el río.'],
    ['CMT_DEMO_02', 'PUB_DEMO_01', 'U_DEMO_NEREA', 'De acuerdo, pero el humedal compra tiempo mientras cambia la práctica agrícola.'],
    ['CMT_DEMO_03', 'PUB_DEMO_04', 'U_DEMO_LUCIA', 'Enhorabuena. Los datos de los últimos tres meses son muy sólidos.'],
    ['CMT_DEMO_04', 'PUB_DEMO_03', 'U_DEMO_AINHOA', '¿Cada cuánto recomiendas la limpieza en aguas con mucha carga orgánica?'],
    ['CMT_DEMO_05', 'PUB_DEMO_12', 'U_DEMO_NEREA', 'En secano yo iría a veza o similar, que gasta menos agua que la mostaza.'],
  ];
  for (const [id, pub, author, body] of comments) {
    await exec(sql`
      INSERT INTO comments (id, publication_id, author_user_id, body, created_by, updated_by)
      VALUES (${id}, ${pub}, ${author}, ${body}, ${author}, ${author})
      ON CONFLICT (id) DO UPDATE SET body = EXCLUDED.body, updated_at = now()
    `);
  }
  console.log(`  ${follows.length} seguimientos, ${reactions.length} reacciones, ${comments.length} comentarios`);
}

// ---------------------------------------------------------------------------
async function main() {
  console.log('Sembrando ejemplo completo y datos de demostración...\n');
  await seedUsers();
  await seedOrgs();
  await seedChallenges();
  await seedSolutions();
  await seedNeeds();
  await seedProducts();
  await seedDemands();
  await seedInitiatives();
  await seedTransaction();
  await seedCases();
  await seedPublications();
  await seedSocial();
  console.log('\nCadena completa sembrada:');
  console.log('  Reto nitratos -> Solución humedales -> Necesidad sensores ->');
  console.log('  Demanda -> Producto -> Transacción -> Iniciativa Arroyo Norte ->');
  console.log('  Resultados medidos -> Caso de éxito -> Publicaciones');
  console.log('\nContraseña de todos los usuarios de demostración: RedHumana2026!');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
