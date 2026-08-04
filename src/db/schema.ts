import { relations } from 'drizzle-orm';
import { 
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  doublePrecision,
  primaryKey,
  jsonb,
  geometry,
  date,
  uuid,
  boolean
} from 'drizzle-orm/pg-core';

// Columnas transversales exigidas por 99_CONSTITUTION.md (UUID permanente,
// autor, historial, versionado) y 04_DATABASE.md (auditoría). Se aplican a
// toda entidad de conocimiento mediante spread, para no repetirlas a mano
// tabla por tabla ni olvidarlas al añadir entidades nuevas.
//
// Nota importante: el `id` de texto legible sigue siendo la clave primaria y
// el identificador público (URLs, iconos, GeoJSON). El `uuid` es el
// identificador permanente global que pide la Constitución, no su sustituto.
// `archivedAt` implementa "nunca se elimina conocimiento": archivar en vez
// de borrar. Toda lectura debe filtrar `archived_at IS NULL`.
const auditColumns = {
  uuid: uuid('uuid').notNull().defaultRandom().unique(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  version: integer('version').notNull().default(1),
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
};

export const territories = pgTable('territories', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  parentId: text('parent_id'),
  description: text('description'),
  population: integer('population'),
  areaKm2: doublePrecision('area_km2'),
  geometry: geometry('geometry', { type: 'multipolygon' }),
  centroid: geometry('centroid', { type: 'point' }),
  // Ver drizzle/0011_ai_generated_flag.sql: territorio sembrado con datos de
  // prueba generados por IA, pendiente de revisión humana.
  isAiGenerated: boolean('is_ai_generated').notNull().default(false),
  ...auditColumns,
});

export const objectives = pgTable('objectives', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  ...auditColumns,
});

export const challenges = pgTable('challenges', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  scope: text('scope').notNull(), // global, national, regional, municipal
  description: text('description'),
  priority: text('priority'), // critical, high, medium, low
  ...auditColumns,
});

export const causes = pgTable('causes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type'),
  description: text('description'),
  ...auditColumns,
});

export const solutions = pgTable('solutions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type'),
  description: text('description'),
  impact: text('impact'),
  cost: text('cost'),
  readiness: text('readiness'),
  ...auditColumns,
});

export const indicators = pgTable('indicators', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  unit: text('unit'),
  category: text('category'),
  direction: text('direction'), // higher_is_better, lower_is_better
  weight: doublePrecision('weight'), // peso del indicador en la puntuación del objetivo (0-1)
  methodology: text('methodology'), // explicación del cálculo de la puntuación
  objectiveId: text('objective_id').references(() => objectives.id),
  ...auditColumns,
});

export const indicatorObservations = pgTable('indicator_observations', {
  id: serial('id').primaryKey(),
  indicatorId: text('indicator_id').notNull().references(() => indicators.id),
  territoryId: text('territory_id').notNull().references(() => territories.id),
  value: doublePrecision('value').notNull(),
  rawValue: text('raw_value'), // dato original descriptivo (puede incluir varias métricas)
  score: doublePrecision('score'), // puntuación 0-100
  weightedScore: doublePrecision('weighted_score'), // puntos ponderados (score * weight)
  date: date('date'),
  source: text('source'),
  sourceUrl: text('source_url'),
  // Ver drizzle/0011_ai_generated_flag.sql: valor aleatorio generado por IA
  // para no dejar el indicador vacío, no una medición real todavía.
  isAiGenerated: boolean('is_ai_generated').notNull().default(false),
  ...auditColumns,
});

// Sub-componentes (variables) que desglosan el cálculo de un indicador,
// p.ej. Oxigenación/Nutrientes/... dentro del indicador "Calidad" del agua.
export const markers = pgTable('markers', {
  id: text('id').primaryKey(),
  indicatorId: text('indicator_id').notNull().references(() => indicators.id),
  name: text('name').notNull(), // Variable
  includes: text('includes'), // Incluye: qué mide en concreto
  description: text('description'),
  unit: text('unit'), // Unidad principal
  weight: doublePrecision('weight'), // Peso recomendado dentro del indicador (0-1)
  source: text('source'),
  lastUpdated: date('last_updated'), // fecha de la última toma de datos
  ...auditColumns,
});

// Valor de un marcador para un territorio concreto (aún sin datos cargados;
// tabla lista para cuando se disponga de series por territorio).
export const markerObservations = pgTable('marker_observations', {
  id: serial('id').primaryKey(),
  markerId: text('marker_id').notNull().references(() => markers.id),
  territoryId: text('territory_id').notNull().references(() => territories.id),
  value: doublePrecision('value'),
  rawValue: text('raw_value'),
  score: doublePrecision('score'),
  date: date('date'),
  source: text('source'),
  ...auditColumns,
});

// Contaminante/variable concreta medida dentro de un marcador,
// p.ej. Mercurio, Plomo... dentro del marcador "Pureza".
export const metrics = pgTable('metrics', {
  id: text('id').primaryKey(),
  markerId: text('marker_id').notNull().references(() => markers.id),
  name: text('name').notNull(),
  unit: text('unit'),
  description: text('description'),
  ...auditColumns,
});

// Estación de medida física, georreferenciada, asociada a un territorio.
export const measurementStations = pgTable('measurement_stations', {
  id: text('id').primaryKey(),
  territoryId: text('territory_id').notNull().references(() => territories.id),
  name: text('name').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  description: text('description'),
  ...auditColumns,
});

// Lectura de una métrica en una estación concreta (aún sin datos cargados;
// tabla lista para cuando se disponga de las mediciones reales).
export const metricObservations = pgTable('metric_observations', {
  id: serial('id').primaryKey(),
  metricId: text('metric_id').notNull().references(() => metrics.id),
  stationId: text('station_id').notNull().references(() => measurementStations.id),
  value: doublePrecision('value'),
  unit: text('unit'),
  level: text('level'), // bajo | moderado | alto | peligroso
  date: date('date'),
  source: text('source'),
  ...auditColumns,
});

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type'),
  scale: text('scale'),
  territoryId: text('territory_id').references(() => territories.id),
  description: text('description'),
  image: text('image'),
  ...auditColumns,
});

// NOTA: en la Fase 7 esta tabla pasará a llamarse `initiatives` (ver
// 02_DOMAIN_MODEL.md y la decisión del usuario de 2026-08-03). Se mantiene
// como `projects` hasta esa migración para no romper las páginas actuales.
export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type'),
  territoryId: text('territory_id').references(() => territories.id),
  status: text('status'),
  description: text('description'),
  image: text('image'),
  ...auditColumns,
});

export const content = pgTable('content', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type'),
  summary: text('summary'),
  url: text('url'),
  ...auditColumns,
});

// MANY-TO-MANY RELATIONSHIPS

export const challengeTerritories = pgTable('challenge_territories', {
  challengeId: text('challenge_id').notNull().references(() => challenges.id),
  territoryId: text('territory_id').notNull().references(() => territories.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.challengeId, t.territoryId] }),
}));

export const challengeObjectives = pgTable('challenge_objectives', {
  challengeId: text('challenge_id').notNull().references(() => challenges.id),
  objectiveId: text('objective_id').notNull().references(() => objectives.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.challengeId, t.objectiveId] }),
}));

// Ligan un reto a un Indicador/Marcador/Métrica concretos (además del
// objetivo general vía challenge_objectives), para poder mostrar los retos
// relevantes en cualquier nivel del explorador del mapa, no solo a nivel
// de objetivo.
export const challengeIndicators = pgTable('challenge_indicators', {
  challengeId: text('challenge_id').notNull().references(() => challenges.id),
  indicatorId: text('indicator_id').notNull().references(() => indicators.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.challengeId, t.indicatorId] }),
}));

export const challengeMarkers = pgTable('challenge_markers', {
  challengeId: text('challenge_id').notNull().references(() => challenges.id),
  markerId: text('marker_id').notNull().references(() => markers.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.challengeId, t.markerId] }),
}));

export const challengeMetrics = pgTable('challenge_metrics', {
  challengeId: text('challenge_id').notNull().references(() => challenges.id),
  metricId: text('metric_id').notNull().references(() => metrics.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.challengeId, t.metricId] }),
}));

export const challengeCauses = pgTable('challenge_causes', {
  challengeId: text('challenge_id').notNull().references(() => challenges.id),
  causeId: text('cause_id').notNull().references(() => causes.id),
  // % de peso de esta causa dentro de ESTE reto en concreto (0-100), para el
  // gráfico de anillo de causas — es una propiedad de la relación reto+causa,
  // no de la causa en sí, ya que la misma causa puede pesar distinto en retos
  // diferentes.
  percentage: doublePrecision('percentage'),
}, (t) => ({
  pk: primaryKey({ columns: [t.challengeId, t.causeId] }),
}));

export const challengeSolutions = pgTable('challenge_solutions', {
  challengeId: text('challenge_id').notNull().references(() => challenges.id),
  solutionId: text('solution_id').notNull().references(() => solutions.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.challengeId, t.solutionId] }),
}));

export const solutionCauses = pgTable('solution_causes', {
  solutionId: text('solution_id').notNull().references(() => solutions.id),
  causeId: text('cause_id').notNull().references(() => causes.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.solutionId, t.causeId] }),
}));

export const projectChallenges = pgTable('project_challenges', {
  projectId: text('project_id').notNull().references(() => projects.id),
  challengeId: text('challenge_id').notNull().references(() => challenges.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.challengeId] }),
}));

export const projectSolutions = pgTable('project_solutions', {
  projectId: text('project_id').notNull().references(() => projects.id),
  solutionId: text('solution_id').notNull().references(() => solutions.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.solutionId] }),
}));

export const projectObjectives = pgTable('project_objectives', {
  projectId: text('project_id').notNull().references(() => projects.id),
  objectiveId: text('objective_id').notNull().references(() => objectives.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.objectiveId] }),
}));

export const projectOrganizations = pgTable('project_organizations', {
  projectId: text('project_id').notNull().references(() => projects.id),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.organizationId] }),
}));

export const organizationObjectives = pgTable('organization_objectives', {
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  objectiveId: text('objective_id').notNull().references(() => objectives.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.organizationId, t.objectiveId] }),
}));

export const organizationSolutions = pgTable('organization_solutions', {
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  solutionId: text('solution_id').notNull().references(() => solutions.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.organizationId, t.solutionId] }),
}));

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').default('user'),
  // Preferencias de interfaz grabadas en la cuenta (ancho de paneles, etc.),
  // ver drizzle/0010_user_ui_settings.sql.
  uiSettings: jsonb('ui_settings').notNull().default({}),
  ...auditColumns,
});

// Historial universal exigido por 99_CONSTITUTION.md (principio 4: toda
// modificación genera historial) y 04_DATABASE.md.
//
// 04_DATABASE.md sugiere una tabla por entidad (challenge_history,
// product_history...). Se implementa como UNA tabla polimórfica: misma
// garantía y mismo contenido, pero sin tener que crear y mantener una tabla
// nueva cada vez que el dominio crece — que es justo lo que ocurrirá en las
// fases siguientes (publicaciones, productos, demandas, iniciativas...).
// `snapshot` guarda la fila completa resultante, de modo que cualquier
// versión pasada puede reconstruirse íntegramente.
export const entityHistory = pgTable('entity_history', {
  id: serial('id').primaryKey(),
  entityType: text('entity_type').notNull(), // 'challenges', 'solutions'...
  entityId: text('entity_id').notNull(),
  entityUuid: uuid('entity_uuid'),
  version: integer('version').notNull(),
  operation: text('operation').notNull(), // create | update | archive | restore
  snapshot: jsonb('snapshot').notNull(),
  previous: jsonb('previous'),
  changedBy: text('changed_by'),
  changedAt: timestamp('changed_at').notNull().defaultNow(),
});

export const memberships = pgTable('memberships', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeCheckoutSessionId: text('stripe_checkout_session_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  status: text('status').notNull().default('inactive'),
  membershipType: text('membership_type').notNull().default('socio_regular'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const stripeEvents = pgTable('stripe_events', {
  id: text('id').primaryKey(),
  stripeEventId: text('stripe_event_id').notNull().unique(),
  type: text('type').notNull(),
  processedAt: timestamp('processed_at').defaultNow(),
});

// We can define Drizzle relations below as needed for easy querying
