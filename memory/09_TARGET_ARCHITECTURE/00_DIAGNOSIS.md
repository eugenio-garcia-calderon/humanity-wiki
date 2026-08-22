# Technical diagnosis

> Audit run on 2026-08-06 against a database built from scratch (19 migrations +
> 16 seeds, 242 territories, 20.557 observations) and the code at `6d358d9`.
>
> **This is not a criticism of the work done.** The platform works, it is in
> production, and it was built in two days. This is the map of what to watch so it
> can keep growing without grinding to a halt.

## Root cause, in one sentence

The project's constitution (`docs/99_CONSTITUTION.md`) is written in prose and
re-implemented by hand in every table, instead of being encoded in the structure.
**That is why it gets violated on its own, without anyone making a mistake.**

## The five structural faults

These are not bugs. They are modelling decisions that are cheap to change today
and expensive to change later.

### 1. A missing table caused data fabrication

There is no `objective_observations`. Objective scores are computed in memory from
simulated data. The Madrid spreadsheet carried scores **at objective level** and,
with nowhere to put them, the seed cloned each score onto every indicator of that
objective so the weighted average would come out right.

```
One Madrid municipality:  97 observations → only 9 distinct scores
T034:                     the same score (56) repeated across 31 indicators
Total:                    20.557 rows encoding roughly 2.000 real facts
```

The problem is not the redundancy. It is that **17.421 of those rows are flagged
`is_ai_generated = false` while being fabricated copies**. On a platform whose
principle 4 is "measure before opining" and whose principle 12 is "all information
must show its provenance", that is an integrity fault, not a performance one.

Practical consequence: today nobody can tell which numbers were measured and which
were invented.

### 2. Territory, the platform's declared axis, cannot be queried

Principle 3 says territory organises everything. Measured:

```
242 territories, 0 with geometry, 0 with centroid
ltree: not installed
WITH RECURSIVE across the whole codebase: 0 occurrences
/api/geo/tiles/:z/:x/:y.pbf: returns 200 with 0 bytes
```

There are 180 municipalities, 20 regions, 37 countries and 3 continents in an
adjacency list (`parent_id` + `type` as free text) that **nobody traverses**.
PostGIS is installed and unused; polygons live in static files under `public/geo/`.

Today it is impossible to ask "every challenge in Spain including its
municipalities", or "which municipality does this point fall in?".

### 3. Split identity

The primary key is text (`T003`, `R001`, `IND_AGUA_ACCESO`) and new ids are minted
as `PREFIX_${Date.now()}` in `server.ts:721`. The `uuid` column, which the
constitution calls the permanent identifier, is secondary and nothing references it.

Consequence: rule 7 ("avoid duplicates", meaning merge them) cannot be executed.
Merging two duplicate territories today means updating 43 tables by hand.

### 4. Forty-three of ninety-two tables are junction tables

With 14 entity kinds and one table per pair, the ceiling is around 90 junction
tables. It is already at 43. Each one drags along a migration, a branch in
`server.ts`, a `DELETE`+`INSERT` and an endpoint. That is why adding one feature
means touching six places.

**The codebase already invented the fix three separate times**, independently:
`graph_entity_links` (with its `CHECK relation IN (...)`, a miniature ontology),
`publication_links` and `transaction_links`. The right design does not need to be
invented, only generalised from what is already converging.

### 5. Three ways to store the same fact

`indicator_observations` (by territory), `marker_observations` (by territory) and
`metric_observations` (by station) are one idea written three times. And the fourth
one is missing, which is fault 1.

## The frontend shows the same pattern

The four newest files in the repo (PRs 13 to 20) each repeat the same three
shortcuts, independently:

| File | raw `fetch` | uses `ui/core` | hand-written hex |
|---|---|---|---|
| `src/pages/Universo.tsx` (432 lines) | 3 | no | **15** |
| `src/pages/Mapas.tsx` | 1 | no | 1 |
| `src/pages/RetoVistas.tsx` | 1 | no | 1 |
| `src/components/knowledge/MetaGraphCanvas.tsx` | 0 | no | 5 |

Project totals: **117 bare `<button>` elements, 24 hex colours**, `ui/core.tsx`
exports 3 primitives used by 10 of 34 pages, and `src/index.css` is **exactly one
line** (`@import "tailwindcss"`), meaning zero design tokens.

Across 8 PRs of work, **no new migration landed**: all the conceptual novelty (the
game-theory tree, the meta-graph, the universe view) was encoded as seed data in
the existing tables. `seed-grafo-teoria-juegos.ts` is 295 lines of hand-authored
content.

None of this is the fault of whoever wrote it: **there was no guidance saying where
things go.** That is what the `CLAUDE.md` files fix.

## The one urgent item, and it is already fixed

The generic write endpoints under `/api/data/:entity` shipped with **no
authorisation check at all**, covering 14 core tables. Found during this audit and
**closed the same day in PR #25**: they now require a session and level 4, verified
locally and in production. Details in
[`02_TECH_DEBT.md`](02_TECH_DEBT.md) under "Resolved".

The operational detail is deliberately not repeated here: this repository is
**public**, and a public document should not carry a recipe for an attack, even a
closed one.

Two lessons worth keeping, because they generalise:

**The policy already existed.** The AI action catalogue in
`src/server/ai/assistant.ts` declares the level required per operation
(`CREATE_TERRITORY: 4`, `UPDATE_INDICATOR: 3`, `CREATE_CHALLENGE: 2`). The
assistant was more restricted than the REST API it sits on top of. When a rule
exists in one place and not the other, the gap is where the bug lives.

**The gap was generational, not careless.** The modules written after
authentication landed (`knowledge.ts`, `social.ts`) all check roles. The routes
written before it never went back. Any codebase with two generations of a pattern
has this shape of hole somewhere, and it is worth looking for it on purpose rather
than waiting to find it.

## What is right and stays

So this does not read as a verdict:

- **PostgreSQL** is the correct choice: graph, geography, time series and money in
  one transactional store.
- **The monolith on Hetzner with Docker and Caddy**, not serverless. Serverless
  fights the connection pool, tiles generated in the database, Stripe webhooks and
  AI streaming.
- **The hand-rolled authentication** (`src/server/auth.ts`): scrypt,
  `timingSafeEqual`, HttpOnly cookie, 5 role levels, Google login. The best-built
  piece in the repo. Do not replace it with better-auth.
- **The AI provider layer** (`src/server/ai/provider.ts`): a real abstraction.
  Switching models means registering another provider.
- **The documentation.** `docs/` as specification and `memory/` as real state, with
  the traps written down. This is rare and it is what makes the project resumable.
  `08_CHANGELOG.md` even records the uncomfortable decisions.

That last point is the reason to believe this approach will work: **the habit of
documenting already exists.** The rules only need to move to where they are read,
which is the folder being worked in.

## Why now

Between 2026-08-05 and 2026-08-06, 20 PRs landed and the project went from 0 to 34
pages. That pace is the reason to decide now: **every day of growth on these
foundations multiplies the cost of fixing them.**

That same pace is what makes it cheap today: the code was generated by an AI in two
days, and the data is small and mostly regenerable from its primary sources. The
database is not the asset. The seeds, the GeoJSON and the documents are.
