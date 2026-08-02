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
  uuid
} from 'drizzle-orm/pg-core';

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
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const objectives = pgTable('objectives', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const challenges = pgTable('challenges', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  scope: text('scope').notNull(), // global, national, regional, municipal
  description: text('description'),
  priority: text('priority'), // critical, high, medium, low
  createdAt: timestamp('created_at').defaultNow(),
});

export const causes = pgTable('causes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const solutions = pgTable('solutions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type'),
  description: text('description'),
  impact: text('impact'),
  cost: text('cost'),
  readiness: text('readiness'),
  createdAt: timestamp('created_at').defaultNow(),
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
  createdAt: timestamp('created_at').defaultNow(),
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
  createdAt: timestamp('created_at').defaultNow(),
});

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type'),
  scale: text('scale'),
  territoryId: text('territory_id').references(() => territories.id),
  description: text('description'),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type'),
  territoryId: text('territory_id').references(() => territories.id),
  status: text('status'),
  description: text('description'),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const content = pgTable('content', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type'),
  summary: text('summary'),
  url: text('url'),
  createdAt: timestamp('created_at').defaultNow(),
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

export const challengeCauses = pgTable('challenge_causes', {
  challengeId: text('challenge_id').notNull().references(() => challenges.id),
  causeId: text('cause_id').notNull().references(() => causes.id),
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
  createdAt: timestamp('created_at').defaultNow(),
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
