# Backend modules

Seven modules, each registering its own routes. This is the good pattern in this
codebase. Everything new goes here.

```
auth.ts          sessions, roles, Google login, password reset
graph.ts         generic graph traversal + global search
knowledge.ts     knowledge graphs, windows, edges, ratings, comments
social.ts        publications, feed, reactions, follows, products, demands, needs
stripe.ts        Connect, product checkout, refunds, seller dashboard
ai/provider.ts   AI provider abstraction (Anthropic today)
ai/assistant.ts  the assistant, action catalogue, usage accounting
```

## Which port each of us runs on

Eugenio's rule, 2026-08-22: **Programador 1 uses 3000, Programador 2 uses 3001.**

`server.ts` reads `PORT` from the environment and falls back to 3000, so the
second person to start no longer collides with the first — which is what
happened the night the two of us worked in parallel. Production defines no
`PORT`, so it stays on 3000 exactly as before.

```bash
PORT=3001 node --env-file=.env node_modules/.bin/tsx server.ts   # Programador 2
```

If you are not sure which of the two you are, ask before starting a server:
taking the other one's port stops their work without telling them.

## `server.ts` is frozen

The root `server.ts` is 1.891 lines of raw SQL holding the legacy `/api/data/*`,
`/api/geo/*`, `/api/explorer/*` routes plus the membership Stripe flow and the
Vite/static wiring.

One authorised exception exists so far: the `PORT` line (2026-08-22, Eugenio),
because with it hardcoded two programmers could not run the platform at once.
It changes no behaviour in production.

**Do not add anything else to it.** New endpoints go in a module here, or in a new one. If
you have to fix something inside `server.ts`, fix it in place and do not grow the
file. Moving those routes out is planned work, not something to do mid-task.

## Module pattern

```ts
export function registerThingRoutes(app: Express, db: any) {
  app.get('/api/things', async (req: Request, res: Response) => {
    try {
      const result = await db.execute(sql`SELECT ... WHERE archived_at IS NULL`);
      res.json(result.rows);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
}
```

Then one line in `server.ts` to register it. That single call is the only coupling
between a module and the rest of the server, and `docs/03_ARCHITECTURE.md` requires it
to stay that way: "changes in one module must not affect the rest".

## Authorisation is not optional

**Every write route checks the role.** This is the rule that was already broken and
left a hole open in production.

```ts
const requireLevel = (req: Request, res: Response, min: number): boolean => {
  if (!req.user) { res.status(401).json({ error: 'Debes iniciar sesión.' }); return false; }
  if ((req.user.roleLevel ?? 0) < min) {
    res.status(403).json({ error: `Requiere nivel ${min} o superior.` }); return false;
  }
  return true;
};
```

`attachUser` runs before every module, so `req.user` is always populated from the
session cookie. `knowledge.ts` has the reference implementation.

### The levels

From `auth.ts`:

```
0 VISITOR    read only
1 USER       publish, comment, react, follow
2 VERIFIED   + create challenges, solutions, products, demands in their territory
3 KNOWLEDGE  + review content, create in any territory
4 ADMIN      everything
```

### Which level for which operation

**Already decided.** The AI action catalogue in `ai/assistant.ts` declares it:

```
CREATE_TERRITORY, CREATE_OBJECTIVE            level 4
UPDATE_INDICATOR, UPDATE_MARKER               level 3
CREATE_CHALLENGE, CREATE_SOLUTION, CREATE_CAUSE,
CREATE_PRODUCT, CREATE_DEMAND, CREATE_NEED    level 2
CREATE_PUBLICATION, CREATE_KNOWLEDGE_GRAPH,
CREATE_MAP                                    level 1
```

Use those numbers for per-entity endpoints. Do not invent a new policy per endpoint.

**Current state after PR #25**: the generic `/api/data/*` write routes and the
`/api/db/*` browser go through `requireAdmin` (`server.ts:1019`), which demands
level 4 for everything. That is stricter than the catalogue above and it costs
nothing today, because editing from the UI is already admin-only.

It stops being enough the moment a level-2 verified user is meant to create a
challenge from the interface. At that point the generic endpoint has to move to the
graduated levels, and that policy belongs in **one shared module** used by the
routes, the assistant and the UI. Until then, `requireAdmin` is the right call and
the guard is copied by hand into each new route.

See the `server.ts` entry in `memory/09_TARGET_ARCHITECTURE/02_TECH_DEBT.md`.

## Reading rules

- **Always filter `archived_at IS NULL`** (and `deleted_at IS NULL` where it exists). An
  unfiltered read returns archived and binned content. Constitution, rule 6 (v1.1).
- Interpolate values through the `sql` template so they are parameterised. Only use
  `sql.raw()` for identifiers, and only from a hardcoded whitelist, the way
  `ENTITY_TABLES` does it.
- Ownership check before an update: `req.user.id === creatorId || roleLevel >= ADMIN`.
  `knowledge.ts` has the helper.

## Writing rules

- Set `created_by` / `updated_by` from `req.user.id`, bump `version`, touch
  `updated_at`.
- Record history where the entity has it (`entity_history`). Constitution, rule 4.
- Archive by default. A real delete only happens through the recycle bin sweep, 15 days
  after the creator asked for it. Refuse to archive a parent that still has visible
  children: `ARCHIVE_BLOCKERS` in `server.ts` defines those chains.

## Response shape

- Lists: a bare JSON array.
- Errors: `{ error: "message in Spanish" }` with a real status code. The message is
  shown to the user, so write it in Spanish and make it actionable.
- Never return a `password_hash`, a session token or a Stripe secret. `rowToUser()` in
  `auth.ts` is the whitelist of user fields that may leave the server.

## Secrets

Read from `process.env` lazily, at call time, never at module load and never with a
hardcoded fallback. `getStripe()` in `stripe.ts` is the pattern: it exists because a
live Stripe secret key was once hardcoded in `server.ts`.

When a key is missing, respond 503 with a clear message instead of crashing. The AI
routes do this well: "the assistant is built but inactive, `ANTHROPIC_API_KEY` is
missing".

## Testing in PRODUCTION with an agent account

Eugenio, 2026-08-22: «escribete como codigo poner siempre AI en el titulo de los
elementos que crees a modo de test».

**Everything an agent creates in production carries `AI` in its title.** Not in a
comment, not in a note somewhere: in the title, where anyone sees it without
looking for it. `AI - prueba de permisos`, `AI - tabla de ensayo`.

The reason is not tidiness. Production holds real work by real people, and a row
left behind by a test is indistinguishable from a row someone typed, until
somebody builds on it. The prefix is what makes "is this ours?" answerable at a
glance, by anyone, months later.

Three rules, and the third is the one that gets skipped:

1. **Prefix `AI` in the title.** Always, however small the test.
2. **Delete it when the test ends**, in the same session that created it. Not
   "later": later is how a platform fills up with things nobody dares touch.
3. **If it cannot be deleted, say so out loud.** User tables have no delete
   route today - rows and columns can go, the table cannot. Leaving one behind
   in silence is how a test becomes permanent furniture.

### What an agent account can do, measured

Level 1 is enough for everything the testing was asked for. Verified against
production on 2026-08-22 with `claude2@lighthumanity.org`: create a table 200,
create a typed column 200, create a row and store "120.000" in a money cell as
`120000` 200. And it correctly cannot touch the commons: `POST
/api/data/territories` answers 403.

**Do not ask for a higher level in order to test.** Levels 2 to 4 exist to
protect shared knowledge - territories, indicators, other people's content - and
none of it is needed to check that a screen works. An agent reads the
hormiguero, where anyone can write; the shorter its reach, the less a note
written in bad faith can ever reach.

## Test sessions: local only, announced, and cleaned in both places

A row in `sessions` is a login. Inserting one by hand is entering as that user
without their password. **In local, that is a normal development shortcut. In
production it is never allowed** — not to verify, not to unblock yourself, not
because it is faster. If you need a session in production, ask Eugenio and wait.

Locally, three things, all of them:

1. **Announce it when you create it**, not when someone finds it. One line to
   whoever is coordinating: «created devverif123, deleting it when X is done».
2. **Tag it**: `user_agent = 'claude-dev-verificacion'`, so anyone looking at
   the table can tell at a glance whose it is.
3. **Delete it from BOTH places in the same operation** — the row *and* the
   cookie in the browser.

The third one is the one that bit us on 2026-08-21. The row was deleted, the
cookie was left behind in the shared in-app browser, and the next person to sit
down found a state they could not explain and spent time investigating it. A
dead cookie looks exactly like a live session and cannot say that it is not one.

And prefer not to need any of this: drive verification over HTTP with the cookie
in the header, from a script. Writing into the browser other people share also
overwrites *their* session, which is how Eugenio got silently logged out.

## Before you change this, decide

| If you are about to... | Current shortcut | Right pattern | Cost of switching now |
|---|---|---|---|
| Add an endpoint to `server.ts` | it has 35 routes | New or existing module here | Same effort, and it does not add to the debt |
| Write a route without a role check | 4 legacy routes do | `requireLevel` with the catalogue level | ~2 min per route |
| Define a new permission level | — | Reuse the `ai/assistant.ts` catalogue | Free, it is already decided |
| Query with `db.execute(sql...)` | almost everything | Fine for now. Typed repositories are planned, not current | — |
| Add a table to relate two entities | 43 junction tables | See `src/db/CLAUDE.md` first | — |

## The root principle: everything must be able to say «I don't know»

**Every component must be able to say «I don't know» or «that does not exist»
in a way that is DISTINGUISHABLE from a valid result.**

When a system cannot say that something is missing, the observer fills the gap
with a guess — and the guess is usually wrong. This happened four times in four
different layers on 2026-08-20, and it was always the same illness:

| Layer | What could not say «no» | What was concluded instead |
|---|---|---|
| The API | `/api/proyectos` read 220 chars into the response | «Private projects are leaking» (they were not) |
| A test | A test page written by hand already contained the answer | «The AI confuses kg with km» (it did not) |
| The web server | A missing file answered 200 with the SPA's HTML | «There are 24 MB of dead files in production» (there were none — 32 of 32 verified 404) |
| The model | No way to say «I know this number but not its source» | It invented the source |
| A permissions test | Test rows inserted by hand skipped the column default (`publico` defaults to TRUE) | «Anyone can read another user's private page» — the page had been created public by the test itself. Almost reported as a live leak |
| The deploy | A deleted file answered 200 with the SPA's HTML | «24 MB of dead files need purging» — a task open for days, two sessions spent trying to execute it, and **32 of 32 deleted files verified 404**: there was nothing there |

The last one is the most expensive of all: a failure that hid the *absence* of a
problem cost a task open for days and two sessions trying to run a destructive
command against production to fix something that did not exist.

That fifth row is also a rule for us, not just for the code: **when testing
permissions or visibility, create the test content through the product's normal
path, never with raw SQL.** Inserting by hand skips the defaults the product
relies on, and then you measure something other than what you meant to.

All of them were cured by the same medicine in different places: B40's 404, B31's
source-citing rule, B32's card built from the server's id, and the team's own
habit of stating where a figure comes from.

So this is not a rule of the AI module. It is a rule of the product.

## When the AI can ask for something: the rule of two halves

This section comes out of six bugs on 2026-08-20 that looked like six and were
one.

**Every time the AI can ask for something, two things are needed:**

1. **Somewhere to put it.**
2. **A way to say it cannot be done.**

Without the second, the model substitutes prose. Not out of bad faith — it is
the only thing it can do when there is no slot. The result is always the same:
a paragraph shaped like a report describing something that never happened.

### The six cases, so the pattern is recognisable

| What was asked | What had no home | What came out |
|---|---|---|
| A map with five test sites | `user_maps` could only ever be a view of the humanity map | Published the generic indicator world map with the places written into the description |
| A project's figures | The context carried the name, never the `descripcion` | «My sensors cannot reach the inner text» |
| A task with «grupo Tecnico» (no accent) | No way to FAIL the match: it fell to `grupos[0]` | Stored it as «Producto», silently |
| Creating a task | `CREATE_TAREA` did not exist | «I've already pinned that task», and it did not exist |
| Organising into folders | Nothing was returned to show | «Done», with no evidence at all |
| Going to a territory | The destination was never validated | Navigated blindly to an empty map, no warning |
| A task, «grupo Marketing» | The client guessed the artefact from a content word («dossier») | Wrote a whole document nobody asked for, and never mentioned the invalid group |

### What to demand before calling a new capability finished

- **Success is decided by the data that comes back, never by the narration.**
  If the action returns no id for what it created, the interface can show
  nothing — and then nobody can tell «done» from «not done» without going to
  check by hand.
- **A figure is decided by its source, never by plausibility.** Every number the
  model produces must be able to say where it came from, and it may only cite
  documents present in the context it was given.
- **A bug that depends on the model behaving is postponed, not fixed.** If it
  works because the model got it right, validate it in the code.
- **Never choose for the user when you do not know.** Falling back to the first
  item of a list is inventing a datum that looks correct. Fail, and say so,
  listing the options that do exist.

### And a trap that has already cost us twice

A fix placed where the bug SHOWS is not the same as one placed where the bug
STARTS. The `grupos[0]` fallback was corrected first in the rendering and stayed
alive in the writing for half a day. When you find a bug of this kind, go and
find every place that same decision is made.

## Editable page texts (`textos.ts`, 2026-08-22)

Eugenio: *«permite a los ADMIN editar todos los textos de esas páginas de
información»*. One piece for the five people who need it, rather than five ways
of editing a paragraph.

- **The default text stays in the component, not in the table.** `textos_editables`
  holds only what somebody changed. A page with an empty table renders in full,
  and deleting a row *is* the undo — no code needed for it.
- **One language, and it is a decision.** `clave → valor`, no `idioma` column.
  The platform is entirely in Spanish and translation is not planned; a column
  nobody uses is guessing the future and charging for it up front. If languages
  ever arrive the key becomes `(clave, idioma)` with `'es'` backfilled — a short
  migration. Written down so it reads as a decision and not an oversight.
- **Keys are written for a person to read**: `servidores.intro`, never `texto_17`.
  The day somebody sees an odd paragraph in production, the key is the only thing
  that helps them find it.
- **The pencil hiding is convenience; the server is the security.** The level is
  checked on every `PUT` and `DELETE`. Anyone can call the route by hand.
