# Security review — one-time login link for agent accounts

> **2026-08-22.** Reviewed by Programador 4 at the Dashboard's request, before
> Programador 1 builds it. The goal is signed off by Eugenio: *«adelante lo que
> haga falta para que tengan acceso a producción y hacer check de lo que
> construyen pudiendo tener acceso de usuario»*.
>
> **Verdict: yes, with seven blocking conditions.** The shape of the design is
> right — one use, short life, agent accounts only, requested with the owner's
> own token, recorded. What follows is what is missing, and one condition that
> cannot be met by the schema as it stands today.

---

## What this actually changes, said plainly

Today an agent token opens **exactly one door**: the hormiguero. `/api/auth/me`
answers `user: null` with it — it does not turn anybody into anybody.

After this, that same token can be exchanged for **a real level-1 session in
production**. That is not an argument against building it; it is the sentence
that has to be written down, because
`memory/project-usuarios-agente-ia` currently promises the opposite, and two
truths that contradict each other are how people get surprised.

The blast radius of a leaked agent `.env` grows from "can leave a note on the
board" to "can act as that account until the session dies".

---

## The seven blocking conditions

### 1. The account must come from the token, and the schema cannot do that yet

**`agentes_ia` has no `user_id`.** Verified in local *and in production*: the
columns are `id, nombre, token_hash, activo, ultimo_uso, created_at, created_by`.
The agent and its user account were created side by side by
`scripts/agente-ia.mjs` and never linked.

So "the owner requests it with his own token" is **not verifiable today**. Any
implementation would have to take the account as a parameter — and an endpoint
that accepts *which account* from the caller is an endpoint where one agent asks
for another agent's session, or for Eugenio's.

> **Condition:** add `agentes_ia.user_id` (FK to `users`), backfill the three
> existing agents, and derive the account **from the token only**. No account
> parameter in the request, ever. If the token's agent has no linked user, the
> answer is a clean 409, not a guess.
>
> Do not settle for `id LIKE 'U_IA_%'`: a naming convention is not a fact, and
> the day somebody creates a person's account with that prefix it becomes a way
> in.

### 2. Single use has to be one statement, not two

The password-reset flow in `auth.ts:536-547` does it in two: `SELECT … WHERE
used_at IS NULL` and then `UPDATE … SET used_at = now()`. Two requests arriving
together both pass the SELECT and both succeed. For a password reset that is
mild. For a login link it means a link that leaked can be used by the attacker
**and** by the agent, and nothing looks wrong afterwards.

> **Condition:**
> ```sql
> UPDATE enlaces_agente SET usado_at = now()
> WHERE token_hash = $1 AND usado_at IS NULL AND expira_at > now()
> RETURNING agente_id, user_id
> ```
> One statement. No row returned = invalid, expired or already used, and the
> caller is told the same thing for all three. The database decides the winner,
> the same way `registro_sellado_previa_idx` decides who continues the chain.

### 3. Store the fingerprint, never the token

`password_resets.token` holds the raw token today. Anyone who reads the database
— a backup, a replica, an insider, a `pg_dump` in a chat — holds every live link.

> **Condition:** store `sha256(token)` and compare fingerprints, exactly as
> `agentes_ia.token_hash` already does. It costs one line and it is the
> difference between a leaked backup being embarrassing and being an entry.

### 4. The token must not travel in the URL — measured, and smaller than I first wrote

**Corrected after checking production in a browser, 2026-08-22.** I claimed the
query string leaks to third parties through `Referer`. It does not, and the
reason is a header that is already set:

| Measured on `https://humanity.wiki/restablecer?token=…` | |
|---|---|
| `referrer-policy: strict-origin-when-cross-origin` | **present.** Cross-origin requests carry only the origin, never the token |
| Third-party requests from that page | **none.** 17 requests, all to `humanity.wiki` |
| `strict-transport-security: max-age=31536000; includeSubDomains` | present |
| `x-content-type-options: nosniff` · `x-frame-options: SAMEORIGIN` | present |

So the third-party leak is already covered. What stays true:

- **Same-origin** subresources *do* get the full URL as `Referer` under that
  policy — so the token lands in **our own access logs**, and in Cloudflare's.
- Browser history keeps it (`history.length` grew, the URL is intact).
- Every screenshot and every pasted URL keeps it.
- The page is served `cache-control: public, max-age=0`; `public` on a URL that
  carries a credential invites an intermediary to store it.
- And the third-party leak is one `<script>` tag away from coming back — the day
  somebody adds a font or an analytics tag to that page, every live link leaks
  retroactively.

> **Condition (unchanged, for weaker reasons):** redeem by `POST`, or carry the
> token in the fragment (`#`), which is never sent to any server. Add
> `Referrer-Policy: no-referrer` and `Cache-Control: no-store` **on that route**,
> and replace the URL as the first thing after redeeming.
>
> And a rule for us, not for the code: **a live one-use link pasted into a chat
> transcript is a credential sitting in a log.** With a two-minute life that is
> survivable. With an hour it is not.

### 5. Two clocks, both short, and the second one is the one people forget

A one-use link that opens a 30-day session (what `login` grants today) is a
password with extra steps.

> **Condition:** link **2 minutes**, session **30 minutes**, both written in the
> code as constants with the reason next to them. The session row must carry its
> own `expires_at`; do not reuse the login default.

### 6. `SEGURIDAD_MODO` is the wrong switch

`SEGURIDAD_MODO` says whether the permission guard **warns or enforces**. Its
default is `avisar`. Gating a login door on it means the door's existence depends
on a variable that is about something else, and in the default mode the answer is
ambiguous — which is the collapse of two different truths into one flag.

> **Condition:** its own variable, `ENLACE_AGENTE`, **default off**, and it works
> as a kill switch: turning it off must also invalidate every unused link and
> every session opened this way. A switch that only stops *new* doors is not a
> kill switch.

### 7. The record has to be somewhere it cannot be deleted

"Registrado" in an ordinary table is a row that whoever misuses the door can
delete afterwards.

> **Condition:** every creation and every redemption goes to `registro_sellado`
> (`clase: 'sesion_agente'`), which only grows and is hash-chained. And for that
> record to mean anything, **`CLAVE_FIRMA_REGISTRO` has to be set in
> production** — otherwise entries are written unsigned and say so, which is
> honest but is not proof.
>
> Record: which agent, which account, when, from which IP, whether it was used,
> and when the session died.

---

## Also required, not blocking

| | |
|---|---|
| **Turning off an agent must close its doors** | `agente-ia.mjs apagar` sets `activo = false` and nothing else. It must also revoke that agent's live sessions and unused links, or "revoked" is a word |
| **Rate limit** | Confirmed against production, not just by reading: **ten wrong passwords in a row on `/api/auth/login` answered `401` ten times.** No `429`, no delay, no lockout. Cap link creation per agent (say 5/hour) and per IP. 32 bytes of entropy makes guessing hopeless, but a stolen token minting links forever should be noisy |
| **One live link per agent** | Creating a new one invalidates the previous. Two live links is one more than anybody needs |
| **Mark the session** | `sessions.user_agent = 'agente:AIA…'` so anybody looking at the table can tell a machine's session from a person's at a glance |
| **Answer identically** | Invalid, expired and already-used must be indistinguishable to the caller. Different messages are a free oracle |
| **Sweep** | Delete unused expired links on a schedule; they are credentials with a dead clock |

## Two things to fix in the same PR, or they become the next surprise

1. **`src/server/CLAUDE.md` says test sessions in production are "never
   allowed"**. This creates a sanctioned path. Update that rule in the same
   change, or the written rule and the shipped code will say opposite things.
2. **`memory/project-usuarios-agente-ia` says the token "does not turn you into
   anybody"**. After this it can. Say so there.

## What is out of scope for this door, and should stay out

The agent account is **level 1** and must stay level 1. A session that can be
minted from a token that reads the hormiguero — where anybody can write — should
never be able to touch the commons. That is the reasoning already written in
`src/server/CLAUDE.md`, and this change does not weaken it as long as the level
stays where it is.

## Two things found while checking, that have nothing to do with this door

Both measured against production on 2026-08-22, and both older than this change:

1. **The login has no brute-force protection at all.** Ten consecutive failures
   from one address, ten `401`s, no throttling. That is credential stuffing with
   the door held open, and it is worth more than this review: it applies to every
   human account, including Eugenio's.
2. **No `Content-Security-Policy`, no `Permissions-Policy`.** On a platform that
   renders content written by its users, CSP is the control that keeps an
   injected script from acting as whoever is logged in. The session cookie is
   `HttpOnly`, which stops it being *read* — it does not stop it being *used*
   from the page.

Neither blocks this PR. Both should become notes on the board.

## What I could not check

Whether the redeem page will run inside the shared in-app browser. If it does,
the cookie it sets **overwrites whoever was logged in there** — which is how
Eugenio was silently logged out on 2026-08-21. Ask for it to be driven over HTTP
with the cookie in a header, from a script, as `src/server/CLAUDE.md` already
recommends.
