# Target schema

> **What this is**: where the data model is heading, and why. Not a dated plan: it
> is the reference the `CLAUDE.md` files point to when someone is about to touch the
> schema, so the choice between "keep the current shortcut" and "adopt the right
> pattern" can be made in the moment, with numbers.
>
> Justification: [`00_DIAGNOSIS.md`](00_DIAGNOSIS.md).
> Day-to-day rules: `src/db/CLAUDE.md`.
> What we consciously left alone: [`02_TECH_DEBT.md`](02_TECH_DEBT.md).
>
> Underlying goal: make the 10 rules of `docs/99_CONSTITUTION.md` impossible to
> violate because they live in the structure, not remembered in a document.

---

## 1. The six decisions

### Decision 1 — `uuid` as the real primary key

**Today**: the PK is text (`T003`, `R001`, `IND_AGUA_ACCESO`), new ids are minted as
`PREFIX_${Date.now()}` in `server.ts:721`, and the `uuid` column the constitution
calls the permanent identifier is secondary and unreferenced.

**Real problem**: rule 7 ("avoid duplicates", meaning merge) cannot be executed.
Merging two duplicate territories means updating 43 tables by hand. And `Date.now()`
collides if two entities are created in the same millisecond.

**Target**: `uuid` is the PK. `slug` for URLs (keeping them readable is a decision
already taken and a correct one). The current readable id (`T003`) survives as
`legacy_id` for a while, so the GeoJSON files in `public/geo/` and the id-keyed icon
maps in `src/utils/*Icons.ts` do not break.

**Verify before writing the migration**: Postgres 17 has no native `uuidv7()`, that
arrives in 18. Options: generate v7 in the application with a ten-line helper
(recommended, leaves the Docker image alone) and keep `gen_random_uuid()` as the
column default so raw-SQL inserts still work. v7 over v4 because it is
time-sortable, which preserves index locality as the tables grow.

### Decision 2 — An `entities` registry: the constitution as a table

Constitution rules 2, 3, 4, 5 and 6 say **every** entity has an author, a territory,
history, a uuid, and is archived rather than deleted. Today that is implemented by
repeating the `auditColumns` spread across 39 tables and trusting nobody forgets.
Some tables already lack it.

```sql
create table entity_kinds (            -- the 14 kinds as DATA, not an enum
  name        text primary key,        -- territory, objective, indicator, ...
  label       text not null,
  url_prefix  text,                    -- 'retos', 'soluciones', ...
  sort_order  integer not null default 0
);

create table entities (
  id              uuid primary key,
  kind            text not null references entity_kinds(name),
  slug            text not null,
  title           text not null,
  summary         text,
  territory_id    uuid references territories(id),     -- rule 3, structural
  author_id       uuid references users(id),           -- rule 2, structural
  status          text not null default 'publicado',
  version         integer not null default 1,          -- rule 5
  is_ai_generated boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz,                         -- rule 6, never deleted
  merged_into     uuid references entities(id),        -- rule 7, duplicate merging
  legacy_id       text unique,
  unique (kind, slug)
);
```

Per-kind tables keep only **their own** attributes plus an FK to `entities(id)`.
`challenges` holds `scope` and `priority`; title, author, territory, version and
archival already live above.

Three consequences that justify the change on their own:

1. Adding an entity kind is **one row in `entity_kinds`**, not a migration.
2. The constitution rules stop being forgettable: there is no way to create an
   entity without an author or a territory.
3. You get **one polymorphic target** for everything cross-cutting: relations,
   history, comments, ratings, publications, search, and eventually embeddings for
   the AI. Today each of those reinvents its own table.

### Decision 3 — One `relations` table with an ontology

**Today**: 43 of 92 tables are fixed-pair junctions. With 14 kinds the ceiling is
around 90, and it is already at 43. Each drags a migration, a branch in `server.ts`,
a `DELETE`+`INSERT` and an endpoint.

**The codebase already invented the fix three times**: `graph_entity_links` (whose
`CHECK relation IN ('trata_sobre','afecta_a','se_apoya_en')` is a miniature
ontology), `publication_links` and `transaction_links`. Generalise what is already
converging.

```sql
create table predicates (
  name            text primary key,      -- 'afecta_a', 'requiere', 'causa', ...
  label           text not null,
  inverse_of      text references predicates(name),
  source_kind     text references entity_kinds(name),   -- null = any
  target_kind     text references entity_kinds(name),
  is_hierarchical boolean not null default false,
  allows_weight   boolean not null default false
);

create table relations (
  id            uuid primary key,
  source_id     uuid not null references entities(id),
  predicate     text not null references predicates(name),
  target_id     uuid not null references entities(id),
  weight        double precision,        -- e.g. "human causes: 40%"
  attributes    jsonb not null default '{}',
  source_ref    uuid references sources(id),   -- where this claim comes from
  author_id     uuid references users(id),
  created_at    timestamptz not null default now(),
  archived_at   timestamptz,
  unique (source_id, predicate, target_id)
);
create index on relations (target_id, predicate);
create index on relations (predicate) where archived_at is null;
```

**The predicate vocabulary is already written** in `docs/05_KNOWLEDGE_GRAPH.md`,
which literally lists the domain relations: `contiene`, `mide`, `pertenece_a`,
`afecta_a`, `tiene`, `requiere`, `se_resuelve_con`, `satisface`, `participa_en`,
`aplica`, `mejora`, `genera`, `referencia`, `crea`. Plus the three the graphs already
use (`trata_sobre`, `se_apoya_en`, `contradice`) and `causa` with a weight, for a
challenge's cause percentages.

Predicate names stay in Spanish: they are domain vocabulary defined by the
specification, and they surface in the UI.

That document stops being prose and becomes the contents of a table. It is exactly
what principle 2 ("explicit relations") asks for, and it makes the "Discovery"
section of `docs/05_KNOWLEDGE_GRAPH.md` a single query instead of 43.

### Decision 4 — Territory, for real

**Today**: 0 of 242 territories have `geometry` or `centroid`. PostGIS is installed
and unused. `/api/geo/tiles/:z/:x/:y.pbf` returns **200 with 0 bytes**. The 8-level
hierarchy that principle 3 calls the platform's organising axis is an adjacency list
that **nobody traverses**: zero `WITH RECURSIVE` in the codebase.

```sql
create table territory_levels (        -- the 8 levels as data
  name       text primary key,         -- planeta, continente, pais, region,
  depth      integer not null unique,  -- provincia, municipio, barrio, comunidad
  label      text not null
);

create table territories (
  id          uuid primary key,
  slug        text not null unique,
  name        text not null,
  level       text not null references territory_levels(name),
  parent_id   uuid references territories(id),
  path        ltree not null,          -- mundo.europa.espana.madrid.alcobendas
  iso_code    text,
  population  integer,
  area_km2    double precision,
  geometry    geometry(MultiPolygon, 4326),
  centroid    geometry(Point, 4326),
  legacy_id   text unique
);
create index on territories using gist (path);
create index on territories using gist (geometry);
create index on territories using gist (centroid);
```

`ltree` plus a GiST index solves in one move what is impossible today:

```sql
-- Everything in Spain including its 180 municipalities: one indexed query
select * from entities e join territories t on t.id = e.territory_id
where t.path <@ 'mundo.europa.espana';

-- Which municipality does this point fall in? Today: impossible
select * from territories
where level = 'municipio' and st_contains(geometry, st_point(-3.70, 40.41));
```

With geometry actually loaded, the tile endpoint starts returning bytes, which is
what it was written for.

**Decide at implementation time**: `centroid` as a generated column
(`generated always as (st_centroid(geometry)) stored`) if `ST_Centroid` is confirmed
IMMUTABLE in PostGIS 3.5, otherwise via trigger. `path` is maintained by a trigger on
`parent_id` so it cannot drift.

This also removes the **6 `*_territories` tables** (`challenge_`, `product_`,
`demand_`, `need_`, `initiative_`, `user_`): the primary territory is a column on
`entities`, and secondary territories are relations with the `pertenece_a` predicate.

### Decision 5 — A single fact table

**Today**: three shapes for one concept (`indicator_observations` by territory,
`marker_observations` by territory, `metric_observations` by station) and **a fourth
one missing**, the objective-level table.

**That missing table is the direct cause of the data fabrication.** The Madrid
spreadsheet carried objective-level scores. With nowhere to store them, the seed
cloned each onto every indicator of the objective so the weighted average the
application computes would produce the right number. Measured result: one
municipality has 97 observations and only 9 distinct values, and 17.421 rows ended up
flagged `is_ai_generated = false` while being copies.

```sql
create table observations (
  id              uuid primary key,
  subject_id      uuid not null references entities(id),  -- objective|indicator|marker|metric
  territory_id    uuid references territories(id),
  station_id      uuid references measurement_stations(id),
  period          daterange not null,
  value           double precision,
  raw_value       text,
  unit            text,
  score           double precision,      -- normalised 0-100
  risk_level      text,                  -- bajo|moderado|alto|peligroso
  is_estimated    boolean not null default false,   -- measured vs derived
  method          text,                  -- how it was derived, if it was
  source_id       uuid references sources(id),
  is_ai_generated boolean not null default false,
  author_id       uuid references users(id),
  created_at      timestamptz not null default now(),
  check (territory_id is not null or station_id is not null)
);
create unique index on observations
  (subject_id, coalesce(territory_id, station_id), period);
```

The key is that `subject_id` points at `entities`, so it **accepts a fact at any
level of the hierarchy, including objective level**. With that:

| | Today | Target |
|---|---|---|
| Madrid spreadsheet (179 municipalities × 14 objectives) | 17.363 fabricated indicator rows | **2.506 honest rows** at objective level |
| Provenance | 17.421 rows lie (`is_ai_generated=false`) | `source_id` + `is_estimated` + `method` on every row |
| Objective scores | computed in memory from mock data | materialised view over real facts |

Aggregates (an objective score derived from its indicators when there is no direct
measurement) are **materialised views**, not duplicated rows and not JavaScript
loops. And `is_estimated` permanently separates measured from computed, which is what
principles 4 and 12 demand and what is unknowable today.

### Decision 6 — `sources`: provenance as an entity

This platform is about contested facts. The Ceuta graph quotes a US Senate report
verbatim and sets it against the Moroccan position. Today that is free text inside a
window, and a datum's provenance is a pair of `source` / `source_url` columns.

```sql
create table sources (
  id            uuid primary key,
  kind          text not null,       -- informe|dataset|articulo|api|libro|ley
  title         text not null,
  publisher     text,
  authors       text,
  url           text,
  published_on  date,
  retrieved_at  timestamptz,
  license       text,
  excerpt       text,
  reliability   text                 -- lets conflicting sources be weighted
);
```

Referenced from `observations`, from `relations` (a claim that A causes B has a
source) and from graph windows. Principle 12 is not satisfied by a text field.

---

## 2. Mapping the current 92 tables

| Group | Today | Target |
|---|---|---|
| Knowledge entities | `territories`, `objectives`, `indicators`, `markers`, `metrics`, `challenges`, `causes`, `solutions`, `needs`, `products`, `demands`, `initiatives`, `success_cases`, `organizations`, `projects`, `content` | Row in `entities` + own-attribute table |
| Fixed-pair junctions (**40**) | `challenge_*` (7), `product_*` (6), `demand_*` (5), `initiative_*` (9), `project_*` (4), `solution_*` (2), `organization_*` (2), `user_*` (3), `need_territories`, `success_case_initiatives` | **One `relations` table** with a predicate |
| Already-generic junctions (3) | `graph_entity_links`, `publication_links`, `transaction_links` | `relations` (they are the prototype of the fix) |
| Observations (3) | `indicator_observations`, `marker_observations`, `metric_observations` | **One `observations` table**, plus the objective-level rows that do not exist today |
| History | `entity_history` | Same, but keyed on `entities(id)` instead of a text `(entity_type, entity_id)` pair |
| Social | `publications`, `comments`, `reactions`, `saves`, `follows`, `notifications`, `content_reports` | Kept; entity links move to `relations` |
| Economy | `transactions`, `refunds`, `supports`, `stripe_accounts`, `stripe_events`, `memberships` | Kept as-is. It is money: do not touch what works |
| Graphs | `knowledge_graphs`, `knowledge_windows`, `graph_windows`, `graph_edges`, `user_maps` | Kept. `graph_edges` stays separate because it is **presentation** (canvas position), not knowledge |
| Auth | `users`, `sessions`, `password_resets` | Unchanged except uuid PKs |
| AI | `ai_conversations`, `ai_messages`, `ai_usage_charges`, `ai_proposed_actions`, `ai_knowledge_chunks`, `ai_knowledge_gaps` | Kept; chunks gain an `entity_id` into `entities` |
| PostGIS | `spatial_ref_sys`, `geometry_columns`, `geography_columns` | System |

Result: from **92 tables to roughly 45**, and the survivors all have a reason to
exist beyond "connect kind A to kind B".

**Do not over-unify**: `graph_edges` must **not** merge into `relations`. An edge on a
knowledge-graph canvas is an editorial decision about a layout (position, colour,
visible label). A relation is a claim about the world. Merging them would mean
dragging a window changes the knowledge.

---

## 3. Migration strategy: rebuild, do not migrate

The decision that makes this cheap: **the data is small and mostly regenerable from
primary sources.** The database is not the asset; the seeds, the GeoJSON and the
spreadsheet are.

### Irreplaceable (genuinely migrate)

| What | Volume | Why |
|---|---|---|
| `users`, `memberships`, `stripe_*` | few rows | Cannot be regenerated. Sessions can be dropped: people log in again |
| The knowledge graphs (Ceuta, wildfires, game theory) | tens of windows and edges | **Hand-authored content.** The most valuable thing in the repo |
| Real water observations for Spain | 58 indicator, 17 marker, 120 metric | Sourced from PDFs and cited sources |
| Real publications and comments, if any | to be counted | User content |

### Regenerable (reseed, do not migrate)

- **Territories**: from `public/geo/*.json` + `src/data/seed.ts`, this time **loading
  the geometry into the table**, which is what fixes decision 4.
- **Objectives, indicators, markers, metrics**: from the seed scripts.
- **Madrid spreadsheet**: reseeded at objective level. 2.506 honest rows instead of
  17.363 fabricated ones.
- **The 32 European countries with random scores**: reseeded at objective level with
  `is_ai_generated = true` for real, or dropped. They are test data.
- **The demo content** (`seed-example-chain`: 5 users, 5 organisations, 5 challenges,
  20 publications...): reseeded.

### Procedure

1. New branch. New database (`humanity_v2`) in parallel. The current one is never
   touched.
2. Target migrations from zero, new numbering. The current 19 are archived under
   `drizzle/_v1/` as historical reference.
3. Target seeds rewritten, with provenance mandatory.
4. A migration script only for the irreplaceable list above.
5. **Verification checklist** built from the queries that are impossible today:
   everything in Spain including municipalities, point-in-polygon, one-hop neighbours
   of an entity, and an MVT tile that returns more than 0 bytes.
6. Row counts compared v1 against v2, entity by entity, so nothing is lost silently.
7. Swap the connection variable and `docker compose up`. **Rollback is pointing back
   at the old database**, which is still intact in its volume.

### What has to be accepted

- The frontend and the ~110 routes get rewritten against the new schema. That is the
  bulk of the work and it is unavoidable, which is why the Next.js question should be
  settled *before* starting, to avoid rewriting twice.
- Readable ids (`T003`) survive as `legacy_id` while the GeoJSON files and the
  id-keyed icon maps still use them. Retiring them is later work.
- Feature work has to freeze during the switch, or be redone. At 7 PRs a day, that is
  what makes the timing decision urgent.

---

## 4. What this unlocks

Queries that are impossible today, or that would need a redesign, and become one line:

- All knowledge in a territory and its descendants, at any depth.
- Which territory does this point fall in? And therefore: geolocated challenges,
  automatic station assignment, per-municipality heatmaps.
- One-hop neighbours of any entity in the graph without knowing its kind, which is
  literally what the "Discovery" section of `docs/05_KNOWLEDGE_GRAPH.md` describes.
- Merging two duplicate entities (rule 7) without touching 43 tables.
- Telling a measured value from an estimated one, and where each came from.
- Adding the 15th objective, or a 5th level below metric, **with no migration**.
- Storing an objective-level datum without inventing 17.000 rows.
