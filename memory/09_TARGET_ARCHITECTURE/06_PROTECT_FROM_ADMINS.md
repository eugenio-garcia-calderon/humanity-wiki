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

So the AI is not today's problem. What is missing is that **nothing stops a
future route from handing it somebody else's content**: the rule lives in the
habits of whoever writes the query. That is what the audit in §5 is for.

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
