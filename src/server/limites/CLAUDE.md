# Rate limits

`auth.ts` shipped with **no attempt limit at all**: ten wrong passwords in a
row, ten 401s and nothing slowing anybody down. Found by prog4 while reviewing
something else. It is the note `INCMT4H7GG8KKF` on the security board.

Owned by **prog6** (servidores). The routes it protects live in `auth.ts`,
which is prog1's — the module is ours, the wiring is theirs.

## The five rules, and what each one prevents

Agreed with prog4 before a line was written. None of them is decoration:

| Rule | Without it |
|---|---|
| **Per account *and* per IP** | Many IPs against one account is credential stuffing; one IP against many accounts is enumeration. Watching one misses the other |
| **Growing delay, not a locked door** | A locked door shuts out the account's owner exactly as well as the attacker |
| **Whoever gets it right does not pay the failures of others** | Anyone can lock you out of your own account by failing on purpose. The limit becomes the attack |
| **Two counters, never one** | Someone who tries a thousand passwords and gets the last one right would get their own trail erased as a bonus |
| **Fail to a decided side, per route** | "Let it through, the limiter is broken" is how a limiter failure becomes the open door |

The fourth is prog4's correction and is the subtle one. **The brake resets on
success; the failure record never does.** They answer different questions —
one protects the account owner right now, the other lets you see the attack
afterwards, including the attack that succeeded. This is the house rule: two
different truths never collapse into one number.

## Rate is not failure

`anotarFallo` brakes **and** leaves a row in `intentos_fallidos`. `ritmo` brakes
and writes nothing. The brake cannot tell them apart; the trail must.

prog7's correction, 2026-08-22, wiring the guard onto point transfers: sending
points eleven times in a row is not a failure, it is nobody doing that by hand.
With only `anotarFallo` the choice was to leave the rate unguarded or to file
legitimate activity in the failure log — and the second is worse than it looks,
because that table is the record of attacks and filling it with correct
transfers is exactly how the line that matters gets buried.

| Use | When |
|---|---|
| `anotarFallo` | Something went wrong. Brake and record |
| `ritmo` | Something went right, too fast. Brake only |
| `levantarFreno` | Something went right and should clear the brake — a correct password |

Note the third is not the opposite of the second: a login clears its brake on
success, a transfer does not. That is the route's decision, not the module's.

## Where each counter lives

| | Where | Why |
|---|---|---|
| The brake | `frenos` (migration `0097`) | It must be ONE brake, not one per process |
| The failure record | `intentos_fallidos` (migration `0076`) | It is the audit trail. It has to survive restarts and it is never cleared |

## Before you change this, decide

**The brake used to be a `Map` in one process, and that was wrong.** With
`cluster` it would have become eight independent brakes and the real limit eight
times the configured one — with no error and no log line. A limit that loosens
in silence is worse than none, because you also believe it is there. Fixed
before `cluster` arrived, because afterwards nobody would have noticed.

It costs one query per attempt on the entry routes, which are the quietest in
the platform. In exchange the brake **survives a restart**: until 2026-08-23 a
deploy handed whoever was trying passwords a fresh start.

**Two things that only a real database tells you**, both found by moving the
test off a fake `db`:

- `= ANY($1)` does not work: node-postgres sends a JS array as text and Postgres
  answers *"requires array on right side"*. Use `IN` with one placeholder per key.
- **`::int` on the parameters is not decoration.** Without it they arrive as
  text and `LEAST('5','900')` compares *strings* — `'5'` sorts after `'900'`, so
  it always returned the cap and the very first failure braked for 15 minutes.
  It passed every test against the fake database.

**The trail deliberately does not record what was typed.** Not the password,
nothing derived from it, not even its length. An attempt log that records the
attempt is a password list — and since 2026-08-22 that list would leave the
server in the nightly backup.

**The email is stored as-is, on purpose.** Without it you cannot answer "was
this account attacked?", which is the entire point. It is not a secret the
`users` table does not already hold — *while the account exists*.

**When it stops existing, call `olvidarCuenta(db, correo)`** from the final
deletion, not from the request: during the 15-day window the person can come
back and their trail has to be intact. It nulls the email and keeps the IP,
the timestamp and the count — "how many attempts came from that IP" is still
the signal of an attack and belongs to nobody. Without this, someone who asked
to be forgotten stays in this table forever, and since 2026-08-22 leaves the
server in the nightly backup. Spotted by prog1 while reviewing.

**A failed audit write does not block the request.** Losing one line of the
trail is bad; being unable to log into the platform because a log row could not
be written is worse. It is shouted into the server log instead. What
`alFallar` governs is a different question: whether the attempt proceeds when
the *guard* cannot decide.

**`ipDe` trusts `CF-Connecting-IP` first and `x-forwarded-for` only as a
fallback.** Cloudflare rewrites the former, so it cannot be forged from
outside; the latter can. Getting this wrong in the other direction would put
everyone behind one shared brake, where the first clumsy visitor locks out the
rest.

## Verified

`npx tsx scripts/probar-limites.ts` — 14 checks, all passing, no database
needed. It covers the grace window, the doubling and its cap, both keys
independently, `CF-Connecting-IP` precedence, and the two rules that matter:
that a correct password clears the brake, and that clearing the brake writes
nothing and erases nothing from the trail.

**Not verified: nothing is wired up yet.** `auth.ts` is prog1's and was held
when this was written, so the guard protects no route so far. The hole is
still open until that lands.
