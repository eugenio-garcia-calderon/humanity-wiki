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

## Where each counter lives

| | Where | Why |
|---|---|---|
| The brake | In memory | Checked on every attempt, has to cost nothing. Losing it on restart gives away one restart's worth of attempts |
| The failure record | `intentos_fallidos` (migration `0076`) | It is the audit trail. It has to survive restarts and it is never cleared |

## Before you change this, decide

**⚠️ `cluster` breaks the brake, and this is the thing to remember.** The brake
is a `Map` in one process. The day the work is spread across the eight cores,
it becomes **eight independent brakes** and the real limit is eight times the
configured one — silently. Two ways out when that day comes: move the brake to
somewhere shared (Postgres or Redis), or divide the numbers by eight
deliberately. Do not discover this in production.

**The trail deliberately does not record what was typed.** Not the password,
nothing derived from it, not even its length. An attempt log that records the
attempt is a password list — and since 2026-08-22 that list would leave the
server in the nightly backup.

**The email is stored as-is, on purpose.** Without it you cannot answer "was
this account attacked?", which is the entire point. It is not a secret the
`users` table does not already hold.

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
