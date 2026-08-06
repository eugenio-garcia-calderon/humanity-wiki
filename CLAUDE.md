# humanity.wiki

Knowledge platform about the planet's challenges: a knowledge graph, a social
network, a marketplace and a collaborative economy, all organised by territory.
Live in production at `humanity.wiki`.

## Language convention

- **This file, every nested `CLAUDE.md`, and everything under `memory/`: English.**
  These are engineering documents. English keeps them consistent with the code,
  the commit messages and the tooling.
- **`docs/` stays in Spanish.** That is Eugenio's product specification, written by
  him, and it is the project's law. Do not translate it.
- **Talk to the user in Spanish.** The documents are for the code and for the AI;
  the conversation is for the person. Explain in plain Spanish, translate any term
  you use from these docs.
- Code comments in English. Commit messages in English.

## Who you are working with

**Eugenio is not a developer.** This is his first project and he is building it
with AI. That changes how you work:

- Explain in plain language. No untranslated jargon.
- When you propose something technical, say **what he gains**, not what the code gains.
- Do not assume he knows what a change will break. Warn before, not after.
- Anything risky (money, production data, anything irreversible): **ask first**,
  even when it seems obvious.
- He owns the product. *What* to build is his call. *How* to build it is yours, and
  you explain it.

Javier (the technical advisor) may also be in the session. With him you can be
direct and technical.

## Authority: what wins in a conflict

Order set by `docs/99_CONSTITUTION.md`:

```
Constitution > Vision > Architecture > Database > Requirements > UI > Implementation
```

| Folder | What it is | Who writes it |
|---|---|---|
| `docs/` | Product specification, in Spanish. This is the law | **Eugenio**. Do not edit without permission |
| `memory/` | Real technical state, decisions, changelog | Claude |
| `memory/09_TARGET_ARCHITECTURE/` | Where the architecture is heading, and accepted debt | Claude |
| `CLAUDE.md` files | How work is done here | Claude |

When the implementation diverges from `docs/`, **record it in
`memory/03_DECISIONS.md`**. Never edit the specification to match the code.

## Running locally

```bash
# 1. Database. On Apple Silicon use imresamu: the official postgis image has no arm64 build
docker run -d --name humanity-db -p 5433:5432 \
  -e POSTGRES_DB=humanity -e POSTGRES_USER=humanity -e POSTGRES_PASSWORD=humanity_dev \
  imresamu/postgis:17-3.5

# 2. Migrations and seeds, in order. See src/db/CLAUDE.md
psql -h localhost -p 5433 -U humanity -d humanity -f drizzle/0000_first_toad_men.sql   # then the rest

# 3. Server. WARNING: `npm run dev` does NOT load .env (there is no dotenv call in server.ts)
node --env-file=.env node_modules/.bin/tsx server.ts
```

`src/db/index.ts` reads no port variable: the `pg` pool falls back to `PGPORT`. If
the database is not on 5432, set `PGPORT` in `.env`.

## What is real data and what is simulated

**Read this before building anything on top of the data.** Mistaking simulated
data for measured data is the most expensive error made in this project so far.

| Data | Status |
|---|---|
| Water indicators for Spain and its regions | **Real**, from cited sources |
| "Pureza" marker (17 regions) | **Real** |
| Metrics and 15 measurement stations | **Real**, from an official PDF |
| Objective scores | **Simulated**, computed in memory from `src/data/seed.ts`. There is no objective-level observations table |
| The 179 Madrid municipalities | Real territories, **simulated scores** from a spreadsheet, cloned down to indicator level (see debt) |
| The 32 European countries | Real geography, **random scores** |
| `territories.geometry` and `centroid` | **Empty in all 242 rows.** Polygons live in `public/geo/*.json`. A territory's centre comes from `src/data/seed.ts`, not from the column |
| Firebase | **Not wired to anything.** Leftover from the AI Studio scaffold |

## Forbidden, with the reason

1. **`drizzle-kit push`**: hangs in a non-interactive shell and kills the session. Use `generate` + `psql -f`.
2. **Deleting knowledge**: archive with `archived_at`. Constitution, rule 6.
3. **A write route without a role check**: the generic write endpoints shipped with no check at all and had to be closed on 2026-08-06 (PR #25). Every new write route calls `requireAdmin` or `requireLevel`. See `src/server/CLAUDE.md`.
4. **Real secrets in versioned files**, and never copied into `memory/`. To check whether a key is configured, read `process.env.X` at runtime; never print its value.
5. **Hex colours and bare `<button>` in pages**: use `src/components/ui/`.
6. **Creating a new junction table** (`thing_a_thing_b`): there are already 43. See `src/db/CLAUDE.md`.
7. **`git push --force` on `main`**: Eugenio edits files directly in the GitHub web UI. Always `git fetch` + `merge` before pushing.
8. **Adding anything new to `server.ts`**: it is frozen. See `src/server/CLAUDE.md`.

## When something can be done fast or done right

This project moves fast and that is a feature. Your job is not to slow it down, it
is to make the trade-offs conscious.

1. **Make it work first.** Do not block the work for purity.
2. Before you finish, say in two sentences: which pattern you used, which one was
   the right one, and what it costs to switch now versus in a month.
3. **Give a number, not an adjective.** "This is the 16th hand-written colour:
   unifying them is 20 minutes today and 3 hours once there are 40" is useful.
   "This does not scale" is not.
4. If Eugenio says carry on, **carry on without pushing back**, and log it in
   `memory/09_TARGET_ARCHITECTURE/02_TECH_DEBT.md`. It should read as a decision,
   not as an oversight.
5. Once per conversation. If you already raised it, drop it.

Every nested `CLAUDE.md` has a **"Before you change this, decide"** section with
the concrete alternatives for that part of the code.

## Repo map

```
server.ts                 Express: legacy API + membership Stripe + Vite/static. FROZEN
src/
  pages/                  35 pages          → src/pages/CLAUDE.md
  components/                               → src/components/CLAUDE.md
    ui/                   shared primitives → src/components/ui/CLAUDE.md
  contexts/               data and session  → src/contexts/CLAUDE.md
  server/                 7 API modules (the good pattern) → src/server/CLAUDE.md
  db/                     schema, seeds     → src/db/CLAUDE.md
  utils/                  icons by id, score colours, slugify
  services/               map geographic data access
drizzle/                  versioned SQL migrations → drizzle/CLAUDE.md
scripts/geo/              generators for two of the public/geo files → scripts/geo/README.md
public/geo/               territory GeoJSON (the real geometry lives here)
docs/                     the specification, in Spanish. Eugenio's → docs/CLAUDE.md
memory/                   technical state and decisions → memory/CLAUDE.md
deploy/, Dockerfile, docker-compose.prod.yml    production: Hetzner + Caddy
```

## Before calling something done

- `npx tsc --noEmit` clean. It is at zero errors today; keep it there.
- `npm run build` passes.
- Functional change → new entry **at the end** of `memory/08_CHANGELOG.md`.
- Technical decision with alternatives → entry in `memory/03_DECISIONS.md`.
- Shortcut taken → entry in `memory/09_TARGET_ARCHITECTURE/02_TECH_DEBT.md`.
