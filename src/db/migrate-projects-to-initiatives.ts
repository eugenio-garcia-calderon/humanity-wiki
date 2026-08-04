import { db } from './index.ts';
import { sql } from 'drizzle-orm';

// ============================================================================
// Migración de datos: projects -> initiatives (Fase 7)
// ============================================================================
// 02_DOMAIN_MODEL.md llama a esta entidad "Iniciativa"; el proyecto ya tenía
// una tabla `projects` con 19 filas reales y sus relaciones. Se copian a
// `initiatives` (creada en la Fase 3) reutilizando el MISMO id, así no hace
// falta una tabla de mapeo — `legacy_project_id` queda igual al `id` como
// marca explícita de que la fila procede de `projects`.
//
// Decisión (ver 03_DECISIONS.md, 2026-08-03): `projects` se conserva
// intacta — sus páginas (`Projects.tsx`, `ProjectProfile.tsx`) siguen
// funcionando exactamente igual, sin tocar una línea. `initiatives` pasa a
// ser la entidad canónica del grafo de conocimiento de aquí en adelante.
//
// Idempotente: puede ejecutarse las veces que haga falta.

async function main() {
  const projects = (await db.execute(sql`SELECT * FROM projects WHERE archived_at IS NULL`)).rows as any[];
  console.log(`Migrando ${projects.length} proyectos a iniciativas...`);

  for (const p of projects) {
    await db.execute(sql`
      INSERT INTO initiatives (id, name, description, type, status, image, territory_id, legacy_project_id, created_by, updated_by)
      VALUES (${p.id}, ${p.name}, ${p.description}, ${p.type}, ${p.status}, ${p.image}, ${p.territory_id}, ${p.id}, ${p.created_by}, ${p.updated_by})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description, type = EXCLUDED.type,
        status = EXCLUDED.status, image = EXCLUDED.image, territory_id = EXCLUDED.territory_id,
        legacy_project_id = EXCLUDED.legacy_project_id, updated_at = now()
    `);
  }

  // Relaciones: mismo id de fila (initiative_id = project_id), así que basta
  // con copiar cada tabla de unión 1:1.
  const relations: Array<[string, string, string]> = [
    ['project_challenges', 'initiative_challenges', 'challenge_id'],
    ['project_solutions', 'initiative_solutions', 'solution_id'],
    ['project_objectives', 'initiative_objectives', 'objective_id'],
    ['project_organizations', 'initiative_organizations', 'organization_id'],
  ];

  for (const [fromTable, toTable, col] of relations) {
    const rows = (await db.execute(sql`SELECT project_id, ${sql.raw(col)} FROM ${sql.raw(fromTable)}`)).rows as any[];
    for (const r of rows) {
      await db.execute(sql`
        INSERT INTO ${sql.raw(toTable)} (initiative_id, ${sql.raw(col)}) VALUES (${r.project_id}, ${r[col]})
        ON CONFLICT DO NOTHING
      `);
    }
    console.log(`  ${toTable}: ${rows.length} relaciones copiadas`);
  }

  // También como territorio propio de la iniciativa (initiative_territories),
  // que no tiene equivalente directo en projects (solo tenía territory_id).
  for (const p of projects) {
    if (!p.territory_id) continue;
    await db.execute(sql`
      INSERT INTO initiative_territories (initiative_id, territory_id) VALUES (${p.id}, ${p.territory_id})
      ON CONFLICT DO NOTHING
    `);
  }

  const count = (await db.execute(sql`SELECT count(*)::int AS n FROM initiatives WHERE legacy_project_id IS NOT NULL`)).rows[0].n;
  console.log(`\nTotal de iniciativas con procedencia de "projects": ${count}`);
  console.log('La tabla "projects" y sus páginas siguen intactas y funcionando igual que antes.');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
