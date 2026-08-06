# Database

Schema, migrations and seeds. The most consequential folder in the repo: a mistake
here is expensive to undo, a mistake in a page is not.

Where the model is heading, and why: `memory/09_TARGET_ARCHITECTURE/01_TARGET_SCHEMA.md`.

## Migration flow

```bash
# 1. Edit src/db/schema.ts
# 2. Generate the SQL
npx drizzle-kit generate
# 3. READ the generated drizzle/000X_name.sql before applying it
# 4. Apply it by hand
psql -h localhost -p 5433 -U humanity -d humanity -f drizzle/000X_name.sql
# 5. Update memory/02_DATABASE.md in the same change
```

**Never `drizzle-kit push`.** It hangs waiting for an interactive confirmation and
kills the session. This has already happened; see `memory/03_DECISIONS.md`.

Never edit a migration that has already been applied. Production ran it. Write a new
one.

## Two questions before you add a table

### "Am I creating a junction table?"

A table named `thing_a_thing_b` whose only columns are two foreign keys. **Do not.**
There are already 43 of them out of 92 tables, and with 14 entity kinds the ceiling is
around 90.

The codebase already invented the generic answer three separate times:
`graph_entity_links`, `publication_links`, `transaction_links`, all shaped
`(owner_id, entity_type, entity_id[, relation])`.

Until the target schema lands, **use `graph_entity_links`** or follow that same shape.
And say out loud that you did, so the decision is visible.

### "Am I copying a value from one level to another so a calculation works out?"

**Never.** This already happened and it is the worst thing in the database.

The Madrid spreadsheet held objective-level scores. With no objective-level
observations table, the seed cloned each score onto every indicator of that objective
so the weighted average would produce the right number. Result: one municipality has
**97 observations and 9 distinct values**, and 17.421 rows are flagged
`is_ai_generated = false` while being fabricated copies.

If a datum does not fit the model, the model is wrong. Say so and propose the fix.
Do not make the numbers agree by duplicating them.

## Provenance is mandatory in seeds

Every seeded row declares:

- **Where it came from**: `source` and `source_url`, a real citation. "Spreadsheet
  provided by the user" is acceptable; empty is not.
- **Whether it was measured or estimated.** If a value was derived, computed or
  invented, it must be visibly marked. `is_ai_generated` exists for this and is
  currently wrong on 17.421 rows.

Principle 4 is "measure before opining" and principle 12 is "all information must
show its provenance". A seed that lies about provenance breaks the product, not the
code.

Seeds are idempotent: `DELETE` the rows they own, then `INSERT`, so they can be re-run.

## Real state of the schema

Things that will surprise you and are not bugs to "fix" in passing:

| Fact | Consequence |
|---|---|
| `schema.ts` declares 39 of the 92 tables | Everything social, marketplace, initiatives and AI exists only in raw SQL. `drizzle-kit generate` does not know about them, so **read the generated SQL carefully**: it may try to drop what it cannot see |
| `territories.geometry` and `centroid` are empty in all 242 rows | A territory's centre comes from `seedTerritories` in `src/data/seed.ts` (`coordinates: [lng, lat]`). Polygons come from `public/geo/*.json`. Never read `territories.centroid` |
| There is no `objective_observations` | Objective scores are computed in memory in `getObjectivesForTerritory` in `server.ts` from mock data |
| Metrics are measured per station, not per territory | `metric_observations` keys on `metric_id` + `station_id`, unlike the other two observation tables |
| PKs are readable text (`T003`, `IND_AGUA_ACCESO`) | They are the public identifier: URLs, GeoJSON files and the icon maps in `src/utils/*Icons.ts` all key off them. The `uuid` column exists but nothing references it |
| Icons and routing key off `id`, never `name` | Two indicators under different objectives can share a name. Keying by name caused a real bug; see `memory/03_DECISIONS.md` |

## Seed order

`seed-db` first (base entities), then the hierarchy, then content:

```
seed-db → seed-indicators → seed-indicator-regions → seed-markers
→ seed-marker-observations → seed-metrics → seed-metric-observations
→ seed-new-objectives → seed-madrid-municipios → seed-europe-countries
→ seed-challenge-links → seed-incendios-causas → seed-admin-user
→ seed-example-chain → seed-grafo-* (ceuta, incendios, teoria-juegos)
```

Run each with `node --env-file=.env node_modules/.bin/tsx src/db/<name>.ts`.

Two more scripts live here and are not part of that chain:

| Script | What it does |
|---|---|
| `import-geo.ts` | Loads the GeoJSON in `public/geo/` (continents, countries, regions, spain\*, italy, madrid_municipios) into the database. The only reader of most of those files |
| `migrate-projects-to-initiatives.ts` | One-shot data migration from `projects` to `initiatives`, reusing the same id. Idempotent, safe to re-run. `projects` is left intact on purpose (see `memory/03_DECISIONS.md`, 2026-08-03) |

Every script in this folder is a manual entry point, so import-graph tools will
always report them as unreferenced. That is expected, not dead code.

## Before you change this, decide

| If you are about to... | Current shortcut | Right pattern | Cost of switching now |
|---|---|---|---|
| Relate two entity kinds | A new `a_b` table (43 exist) | `graph_entity_links`, or the `relations` table from the target schema | One table now; the whole collapse is 1-2 weeks |
| Store a datum at a level with no table | Clone it down a level (already done, 17.421 rows) | Single `observations` fact table with `subject_id` at any level | The fix is part of the target schema. Meanwhile: **stop and ask** |
| Add an entity kind | New table + 5 junctions + branch in `server.ts` | Row in `entity_kinds` + attribute table | Roughly 6 files today versus 1 row later |
| Add a column to an entity | Manual `auditColumns` spread | Same, until `entities` exists | Free |
| Query the territory hierarchy | Nobody does; 0 `WITH RECURSIVE` | `ltree` + GiST index | Loading geometry and paths is 2-3 days and unblocks the map |
| Add a real geometry | Static file in `public/geo/` | The `geometry` column with a GiST index | Same effort, and it makes the MVT tile endpoint work |

Anything postponed goes in `memory/09_TARGET_ARCHITECTURE/02_TECH_DEBT.md` with its
future cost.
