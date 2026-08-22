# Protecting people's data from the people who run the platform

> **2026-08-22.** Written by Programador 4 after Eugenio asked for it in one
> line: *«haz lo que falte para que los datos de los usuarios estén seguros
> incluso protegidos de los administradores e IAs»*.
>
> Everything measured below was measured, not assumed.

---

## 1. What an administrator can reach today

| | |
|---|---|
| `GET /api/db/tables/:name` | **The full contents of any table**, from the platform's own screen. Private conversations, the finances people write into their Juego Vital, the rows of the tables they create |
| `GET /api/admin/users` | Everybody's email |
| The ownership helpers (`canEdit`, `puedeConTabla`, `accesoPublicacion`) | All of them end in `… || roleLevel >= 4`. Level 4 is a master key over other people's content |
| A trace of any of it | **None, until today** |

Level 4 is one role. There is no separation between "can moderate a reported
comment" and "can read two strangers' conversation": both are `roleLevel >= 4`.

## 2. What the AI can reach today — better than expected, and worth writing down

I went looking for a leak and did not find one:

- `ai_knowledge_chunks`, the index the assistant searches, holds **only the
  commons** — challenges, solutions, products — plus publications with
  `status = 'publicada'`. No private content is indexed.
- The live retrieval of "your things" filters by the asker's id in **every**
  query (`assistant.ts:121, 283, 292, 1175-1190`). Somebody asking the assistant
  cannot pull somebody else's page.
- Agent accounts are level 1 by design, and the agent token opens the hormiguero
  and nothing else.

So the AI's *retrieval* was not the problem. **Its conversations were.**

Writing the audit that checks this found one: `POST /api/ai/chat` took
`conversation_id` from the request **body** and used it as given — loading that
conversation's last twelve messages as the model's context and writing the new
ones into it. Send somebody else's id and the assistant answers you using what
they told it, and your messages land in their history.

And the ids were guessable: timestamp in base 36 plus a number between 0 and
1295. Knowing the second somebody chatted leaves ~1.300 combinations, and the
route needs no session and has no rate limit.

Closed with two locks, and both are needed: a conversation with an owner who is
not you is silently replaced by a new one (never an error — «that conversation
is not yours» would confirm it exists), and new conversations get an
unguessable id.

What remains, said plainly: for an **anonymous** conversation its id is the only
credential there is. It can no longer be guessed; somebody who finds one written
down still gets in. Closing that requires the anonymous chat to stop existing,
and that is Eugenio's call.

**And so it does not come back:** `scripts/auditar-contexto-ia.mjs` fails the
build if any query in the AI module reads a table with personal content without
filtering by its owner. Legitimate exceptions are *declared* with a
`// contexto-ia:` comment next to the query — never deduced. It is green today.

It is the **fourth** appearance of the same shape in one day: identity taken
from what the caller sends instead of from the session (prog1's login link,
prog7's daily cap, the Stripe membership, and this). That is not four mistakes;
it is a habit, and it deserves a line in the house rules rather than four
separate fixes.

## 3. What shipped today, and exactly what it does not do

`src/server/seguridad/transparencia.ts`:

1. **The wide door is closed.** Twelve tables are no longer served by the generic
   database browser — to anyone, including an administrator. The list is in the
   code with a reason per table, and the criterion is not "important" but
   **"the content belongs to a person, not to us"**.
2. **Everything else privileged is recorded.** Reading the user list, listing
   tables, opening the security board: each lands in the sealed record, chained
   and signed, **where the person who did it cannot erase it**.
3. **Anyone with an account can read that log** (`GET /api/seguridad/miradas`),
   not only administrators. A surveillance log only its subjects cannot read is
   not surveillance of anything.

### The owner keeps a key, and it is written down

Closing the door on administrators is right. Closing it on the person who owns
the platform **without leaving him a documented key** is how somebody ends up in
`psql` at three in the morning, where nothing is recorded at all. So the key
exists, and it is narrow on purpose:

`GET /api/seguridad/dato/:tabla/:id?motivo=…`

| | |
|---|---|
| One row, by its id | Never a whole table |
| A written reason, at least 20 characters | Stored forever, next to the name of whoever asked |
| **Recorded before the read, and if it cannot be recorded, there is no read** | That order is the whole mechanism: the record is not a side effect of looking, it is the permission to look |
| The answer says so | «This query has been recorded with your name and your reason, where it cannot be deleted, and anybody with an account can see it» |

What this makes impossible is not looking. It is **looking in silence**.

**What it does not do, said plainly.** An administrator can still reach most of
that content through the product's normal screens, and anybody with the database
password skips all of it. What changed is that **looking stopped being free**:
there is now a place where it shows who looked at what and when. Against
carelessness and casual abuse that works. Against a determined person with server
access it does not.

## 4. The four levels, and where the honesty line is

| Level | What it protects against | Cost | State |
|---|---|---|---|
| **1 · Transparency** | Casual abuse, curiosity, the "I only looked once" | Almost none | **Done today** |
| **2 · Least privilege** | An admin's mistake, a bug in one route, a stolen admin session | Weeks of work | Phase C: the app's role stops being superuser; admin splits into moderation / support / owner; row-level security |
| **3 · Encryption with split keys** | Whoever has the database or a backup | Weeks + a vault | Envelope encryption is written (`cifrado.ts`); what is missing is that decrypting the most sensitive data requires **two people**, so no single administrator can |
| **4 · End to end** | **Us. All of us, including Eugenio** | A product decision with a price | Not started. Needs the decision below |

Levels 1 to 3 make abuse visible, hard and traceable. **Only level 4 makes it
impossible** — and it is impossible precisely because we no longer hold the key.

## 5. What I recommend building next, in order

1. **A rule with a test for the AI's context.** Every query that feeds the
   assistant must filter by the asker's id. Today all of them do; nothing stops
   the next one from not doing it. The test walks the retrieval queries and fails
   the build on one without an owner filter. Cheap, and it freezes today's good
   state.
2. **Split level 4.** Moderating a reported comment and reading a private
   conversation are not the same power and should not be the same number. This is
   a product decision as much as a technical one.
3. **Two-person decryption** for the most sensitive fields, using the vault of
   phase 0. An administrator alone stops being able to read them; two people can,
   and the record says who and when.
4. **End to end, for one thing first.** Not for everything at once.

## 6. The decision that is Eugenio's, with its price

**End-to-end encryption means the key is derived from the person's password and
never reaches the server.** Then nobody here can read that content: not an
administrator, not the AI, not a court order served on us, not me.

It costs exactly this, and none of it can be engineered away:

| | |
|---|---|
| **If they lose their password, the content is gone** | Not "we can restore it": gone. The only mitigation is a recovery code they save somewhere, which many people will not do |
| No search on the server | Searching inside content the server cannot read requires either sending the key or a much more complex scheme |
| The AI cannot use it | The assistant cannot summarise what it cannot read. For E2E content it works only if the browser sends the plain text at that moment, with the person's explicit consent |
| Moderation cannot see it | A reported private message cannot be reviewed. That has to be decided before, not the first time somebody reports one |

**My recommendation: start with private messages** (`mensajes`), and only those.

It is the clearest case — two people, no third party has any business in there —
it does not need search, moderation of private messages is not a promised
feature, and the volume is small enough that the migration is simple. If it works
there, documents come next.

And a sentence that should go on the public page if this ships, because it is
the whole point: **"we cannot read your messages, and this is what we did so that
we cannot"** — followed by a link to the code that proves it.
