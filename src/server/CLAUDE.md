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

- **Always filter `archived_at IS NULL`.** Nothing is deleted in this project, so an
  unfiltered read returns archived content. Constitution, rule 6.
- Interpolate values through the `sql` template so they are parameterised. Only use
  `sql.raw()` for identifiers, and only from a hardcoded whitelist, the way
  `ENTITY_TABLES` does it.
- Ownership check before an update: `req.user.id === creatorId || roleLevel >= ADMIN`.
  `knowledge.ts` has the helper.

## Writing rules

- Set `created_by` / `updated_by` from `req.user.id`, bump `version`, touch
  `updated_at`.
- Record history where the entity has it (`entity_history`). Constitution, rule 4.
- Archive, never delete. And refuse to archive a parent that still has visible
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
