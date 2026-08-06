# Accepted technical debt

> **What this is**: the list of things we know are wrong and have decided to leave
> alone for now. Every line is a decision, not an oversight.
>
> **How to use it**: when something can be done fast or done right and fast wins, log
> it here with its future cost. When it gets fixed, move it to "Resolved" with the
> date. Never delete an entry.
>
> This replaces a migration plan: a plan expires, this list does not.

Seeded on 2026-08-06 from the audit. **None of these have been decided by Eugenio
yet.** They are here so the decision can be explicit.

---

## Urgent: active risk, not debt

*(empty — the unauthenticated-writes hole was fixed on 2026-08-06, see "Resolved")*

---

## Data integrity

### 17.421 fabricated observations flagged as not AI-generated
- **What**: objective scores cloned down to indicator level so the weighted average would add up. One municipality has 97 rows and 9 real values.
- **Cost now**: reseeding at objective level (2.506 honest rows) needs the fact table from the target schema.
- **Cost later**: grows with every new territory, and every visualisation built on top inherits the false number.
- **Minimum mitigation without the redesign**: flag those rows with their real provenance and `is_estimated = true`, keeping the current model. One afternoon, and it saves principle 12.

### `territories.geometry` and `centroid` empty in all 242 rows
- **What**: PostGIS installed and unused. Polygons live in `public/geo/*.json`. `/api/geo/tiles` returns 0 bytes.
- **Cost later**: anything needing a territory's centre has to read `src/data/seed.ts`, which already forces special-case rules documented in `memory/02_DATABASE.md`.

---

## Architecture

### 43 of 92 tables are fixed-pair junctions
- **Cost later**: every new entity kind multiplies tables. See `01_TARGET_SCHEMA.md`, decision 3.
- **Rule until fixed**: do not create more. To relate two things, use `graph_entity_links`, which is already generic.

### `server.ts` is 1.891 lines of raw SQL with no authorisation
- **Cost later**: the only part of the backend not following the modular pattern. Every new line there is a line that will have to be moved.
- **Rule until fixed**: frozen. Everything new goes into a module under `src/server/`.

### Two new endpoints were added to the frozen `server.ts` (2026-08-06)
- **What**: `GET /api/db/tables` and `GET /api/db/tables/:name`, for the Base de Datos page, went into `server.ts` — which `src/server/CLAUDE.md` says is frozen ("new endpoints go in a module here"). They belong in a small `src/server/database.ts`.
- **Why it happened**: they read the `pg_class` catalogue, which felt like it belonged next to the other raw-SQL routes. That is not a reason, it is a habit.
- **Cost to fix**: ~15 min. They are self-contained: two handlers, two constants (`SENSITIVE_COLUMNS`, `HIDDEN_TABLES`) and the `requireAdmin` guard, plus one `registerDatabaseRoutes(app, db)` line.
- **Cost later**: `server.ts` grows past 1.900 lines and the "frozen" rule loses its force — the next person reads it as advisory.
- **Note**: the same day, `getSolutionsForChallenges` inside `server.ts` was extended with `challenge_ids`. That one is a fix in place to existing code, which the rule allows.

### `schema.ts` declares 39 of the 92 tables
- **What**: everything social, marketplace, initiatives and AI exists only as raw SQL, untyped.
- **Cost later**: queries have no types, and `drizzle-kit generate` does not know those tables exist.

### `PORT` is hardcoded to 3000
- **What**: `server.ts:59`. The `PORT` variable in `.env.production` is ignored.
- **Cost**: trivial to fix, but it surprises anyone trying to change the port.

---

## Frontend

### Zero design tokens
- **What**: `src/index.css` is a single line. 117 bare `<button>` elements, 24 hex colours, `ui/core.tsx` with 3 primitives used by 10 of 34 pages.
- **Cost now**: creating the `@theme` block and lifting 12 primitives is one afternoon.
- **Cost later**: grows with every page. The 4 newest files already added 22 more hex values.
- **2026-08-06 update**: `Inicio.tsx` adds 33 more and `BaseDeDatos.tsx` 7 (plus 2 bare `<button>`). Most of `Inicio`'s are inside hand-drawn SVG miniatures, where a Tailwind class does not apply — but the 7 family colours in `BaseDeDatos` and the 3 accents in `Inicio` are the same palette declared for the fourth time in the repo. That palette is the cheapest token to extract first.

### The nav is hardcoded JSX and now has 5 entries
- **What**: `Layout.tsx` repeats the same `<Link>` + `cn(...)` block five times (Inicio, Geolocalización de Datos, Red de Datos, Base de Datos, Universo). `src/pages/CLAUDE.md` says the 4th entry is the moment to turn it into an array; we passed it at the 5th.
- **Cost now**: ~20 min to lift it to `const NAV = [{ to, label, icon, match }]` and map over it.
- **Cost later**: every rename touches 5 places and the active-state logic drifts. This renaming round already proved it: three labels changed and one of them (the page's own header pill) was missed until it was seen in the browser.

### Single 3.17 MB bundle (893 KB gzipped)
- **What**: no code splitting. Mapbox, React Flow, Recharts and react-simple-maps all land in the first chunk even though the landing page uses none of them.
- **Cost to fix**: low. Vite config plus dynamic `import()` on the map and graph pages.

### Dead dependencies
- **What**: `firebase`, `firebase-admin`, `@google/genai`, `leaflet`, `react-leaflet`, `d3-geo`, `motion` with 0 imports. AI Studio scaffold leftovers, along with `firebase-applet-config.json` and `metadata.json`.
- **Cost**: install weight and confusion ("do we use Firebase?"). Removing them is 10 minutes.

### Two lockfiles
- **What**: `bun.lock` and `package-lock.json` coexist. The Dockerfile uses `npm ci`.
- **Risk**: local and production installing different versions.

### Loose scripts in the repo root
- **What**: `fix_layout.cjs`, `fix_map2.cjs`, `fix_map_continents.cjs`, `fix_server.cjs`, `fix_server2.cjs`, `update_map.cjs`, `make_continents.cjs`, `create_planet.cjs`, `test_comp.tsx`.
- **Cost**: no technical cost, but nine files nobody knows are safe to delete.

---

## Operations

### Zero tests
- **What**: not a single test file, with 92 tables and payment flows.
- **Cost later**: the biggest maintenance risk. Every refactor is blind.
- **Minimum viable**: 20 smoke tests, including one asserting that writes require a session.

### The compose image does not run on Apple Silicon
- **What**: `postgis/postgis:17-3.5` publishes no arm64 build. Irrelevant on the x86 Hetzner box.
- **Known workaround**: use `imresamu/postgis:17-3.5` locally.

### `npm run dev` does not load `.env`
- **What**: no `dotenv.config()` in `server.ts`. Must start with `node --env-file=.env node_modules/.bin/tsx server.ts`.
- **Cost**: trivial, but it is the trap that costs newcomers the most time.

---

## Accepted legal risk

### Mapbox attribution removed
- **What**: explicit decision recorded in `memory/03_DECISIONS.md` on 2026-08-02, taken knowing it breaches the Mapbox Terms of Service.
- **Risk**: Mapbox account suspension, which would blank every map in production.
- **Logged here** to keep it visible, not to reopen the decision.

---

## Resolved

### Unauthenticated writes on `/api/data/:entity` — fixed 2026-08-06
- **What it was**: `POST`, `PUT`, `DELETE` and `.../restore` across 14 core tables with no session and no role check. Found by Javier in PR #23, reproduced live (anonymous POST returned 200 and created the row; anonymous DELETE archived it).
- **Fix**: `requireAdmin()` on the four endpoints — 401 without a session, 403 below ADMIN. No capability was removed: editing from the UI was already admin-only.
- **Verified after the fix**: anonymous → 401 on all three verbs, nothing created; admin with a session → 200. Checked locally and against production.
- **What it left behind**: `server.ts` still has no authorisation *pattern*, only this guard. See "server.ts is 1.891 lines of raw SQL with no authorisation" above — new endpoints added on 2026-08-06 (`/api/db/tables`) had to call `requireAdmin` by hand.
