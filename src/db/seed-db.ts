import { db } from './index.ts';
import * as schema from './schema.ts';
import { 
  objectives, 
  challenges, 
  causes, 
  solutions, 
  territories, 
  projects, 
  organizations, 
  indicators 
} from '../data/seed.ts';
import { sql } from 'drizzle-orm';

async function seed() {
  console.log("Seeding database...");

  const validTerritories = new Set(territories.map(t => t.id));
  const validObjectives = new Set(objectives.map(o => o.id));
  const validChallenges = new Set(challenges.map(c => c.id));
  const validCauses = new Set(causes.map(c => c.id));
  const validSolutions = new Set(solutions.map(s => s.id));
  const validOrganizations = new Set(organizations.map(o => o.id));
  const validProjects = new Set(projects.map(p => p.id));

  console.log("Seeding territories...");
  for (const t of territories) {
    await db.insert(schema.territories).values({
      id: t.id,
      type: t.type,
      name: t.name,
      parentId: validTerritories.has(t.parent_id) ? t.parent_id : null,
      description: t.description,
      population: t.population,
      areaKm2: t.area_km2,
    }).onConflictDoNothing();
  }

  console.log("Seeding objectives...");
  for (const o of objectives) {
    await db.insert(schema.objectives).values({
      id: o.id,
      title: o.title,
      description: o.description,
    }).onConflictDoNothing();
  }

  console.log("Seeding challenges...");
  for (const c of challenges) {
    await db.insert(schema.challenges).values({
      id: c.id,
      title: c.title,
      scope: c.scope,
      description: c.description,
      priority: c.priority,
    }).onConflictDoNothing();
    
    for (const tId of c.territory_ids || []) {
      if (validTerritories.has(tId)) {
        await db.insert(schema.challengeTerritories).values({
          challengeId: c.id,
          territoryId: tId,
        }).onConflictDoNothing();
      }
    }
    
    for (const oId of c.objectives || []) {
      if (validObjectives.has(oId)) {
        await db.insert(schema.challengeObjectives).values({
          challengeId: c.id,
          objectiveId: oId,
        }).onConflictDoNothing();
      }
    }
  }

  console.log("Seeding causes...");
  for (const c of causes) {
    await db.insert(schema.causes).values({
      id: c.id,
      title: c.title,
      type: c.type,
    }).onConflictDoNothing();
    
    for (const challengeId of c.challenge_ids || []) {
      if (validChallenges.has(challengeId)) {
        await db.insert(schema.challengeCauses).values({
          challengeId: challengeId,
          causeId: c.id,
        }).onConflictDoNothing();
      }
    }
  }

  console.log("Seeding solutions...");
  for (const s of solutions) {
    await db.insert(schema.solutions).values({
      id: s.id,
      title: s.title,
      type: s.type,
      description: s.description,
      impact: s.impact,
      cost: s.cost,
      readiness: s.readiness,
    }).onConflictDoNothing();
    
    for (const causeId of s.cause_ids || []) {
      if (validCauses.has(causeId)) {
        await db.insert(schema.solutionCauses).values({
          solutionId: s.id,
          causeId: causeId,
        }).onConflictDoNothing();
      }
    }
    
    for (const challengeId of s.challenge_ids || []) {
      if (validChallenges.has(challengeId)) {
        await db.insert(schema.challengeSolutions).values({
          challengeId: challengeId,
          solutionId: s.id,
        }).onConflictDoNothing();
      }
    }
  }

  console.log("Seeding organizations...");
  for (const o of organizations) {
    await db.insert(schema.organizations).values({
      id: o.id,
      name: o.name,
      type: o.type,
      scale: o.scale,
      territoryId: validTerritories.has(o.territory_id) ? o.territory_id : null,
      description: o.description,
      image: o.image,
    }).onConflictDoNothing();

    for (const objectiveId of o.objective_ids || []) {
      if (validObjectives.has(objectiveId)) {
        await db.insert(schema.organizationObjectives).values({
          organizationId: o.id,
          objectiveId: objectiveId,
        }).onConflictDoNothing();
      }
    }

    for (const solutionId of o.solution_ids || []) {
      if (validSolutions.has(solutionId)) {
        await db.insert(schema.organizationSolutions).values({
          organizationId: o.id,
          solutionId: solutionId,
        }).onConflictDoNothing();
      }
    }
  }

  console.log("Seeding projects...");
  for (const p of projects) {
    await db.insert(schema.projects).values({
      id: p.id,
      name: p.name,
      type: p.type,
      territoryId: validTerritories.has(p.territory_id) ? p.territory_id : null,
      status: p.status,
      description: p.description,
      image: p.image,
    }).onConflictDoNothing();

    for (const challengeId of p.challenge_ids || []) {
      if (validChallenges.has(challengeId)) {
        await db.insert(schema.projectChallenges).values({
          projectId: p.id,
          challengeId: challengeId,
        }).onConflictDoNothing();
      }
    }

    for (const solutionId of p.solution_ids || []) {
      if (validSolutions.has(solutionId)) {
        await db.insert(schema.projectSolutions).values({
          projectId: p.id,
          solutionId: solutionId,
        }).onConflictDoNothing();
      }
    }
    
    for (const objectiveId of p.objective_ids || []) {
      if (validObjectives.has(objectiveId)) {
        await db.insert(schema.projectObjectives).values({
          projectId: p.id,
          objectiveId: objectiveId,
        }).onConflictDoNothing();
      }
    }

    for (const orgId of p.organization_ids || []) {
      if (validOrganizations.has(orgId)) {
        await db.insert(schema.projectOrganizations).values({
          projectId: p.id,
          organizationId: orgId,
        }).onConflictDoNothing();
      }
    }
  }

  console.log("Seeding completed!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
