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

## `server.ts` is frozen

The root `server.ts` is 1.891 lines of raw SQL holding the legacy `/api/data/*`,
`/api/geo/*`, `/api/explorer/*` routes plus the membership Stripe flow and the
Vite/static wiring.

**Do not add anything to it.** New endpoints go in a module here, or in a new one. If
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

Use those numbers. Do not invent a new policy per endpoint. Note the current oddity:
the AI is **more** restricted than the REST API, because the legacy `/api/data/*`
write routes check nothing at all.

That policy belongs in one shared module used by both the routes and the assistant.
Extracting it is the first item in
`memory/09_TARGET_ARCHITECTURE/02_TECH_DEBT.md`.

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

## Before you change this, decide

| If you are about to... | Current shortcut | Right pattern | Cost of switching now |
|---|---|---|---|
| Add an endpoint to `server.ts` | it has 35 routes | New or existing module here | Same effort, and it does not add to the debt |
| Write a route without a role check | 4 legacy routes do | `requireLevel` with the catalogue level | ~2 min per route |
| Define a new permission level | — | Reuse the `ai/assistant.ts` catalogue | Free, it is already decided |
| Query with `db.execute(sql...)` | almost everything | Fine for now. Typed repositories are planned, not current | — |
| Add a table to relate two entities | 43 junction tables | See `src/db/CLAUDE.md` first | — |

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
