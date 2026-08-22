# Data security and the chain — strategy

> Written **2026-08-22** by Programador 4, at Eugenio's request:
>
> *«Tu misión es la de generar elementos de seguridad de datos y plantearte
> soluciones como blockchain. Esta herramienta la van a utilizar altos directivos
> y gobiernos y no puede ser corrompible. Utilicemos blockchain y criptografía
> interna para sistema de puntos (tokens) para gastar y sistema de datos
> (información encriptada). Me gusta la propuesta de ecosistema de blockchain
> propuesto por la fundación Linux.»*
>
> Everything measured below was measured against the code at `50a1f37`
> (`origin/develop`) and against production on 2026-08-22. Numbers say where they
> come from, per the house rule.

---

## 0. What "cannot be corrupted" can mean, and what it cannot

A chain does not stop a false statement from being written. It stops a written
record from being **changed afterwards without it showing**. What we are buying is
*integrity* and *attribution*, never *truth*. Anyone who sells the second thing to
a government is selling something that does not exist, and the first person to
notice will be the auditor on the other side of the table.

So the question is not "blockchain yes or no". It is: **who can alter what today,
and what makes each of those paths visible?**

| # | Who can corrupt data today | How | Fixed by |
|---|---|---|---|
| 1 | Anyone with the database password | `UPDATE users SET puntos = …` — leaves no trace | Phase 1 + 2 |
| 2 | Any administrator, through a legitimate route | `POST /api/admin/users/:id/puntos` mints points from nothing, no ceiling (`src/server/puntos.ts:70`) | Phase 1 (double entry) |
| 3 | Anyone with a stolen session cookie or agent token | The token opens the hormiguero; a cookie opens the account | Phase 0 |
| 4 | Anyone who can merge to `main` | The deploy SSHes in and runs `git reset --hard origin/main` (`deploy/CLAUDE.md`) | Phase 0 (signed releases) |
| 5 | Whoever holds the machine (Hetzner, or a court order) | Full disk access | Phase 0 (encryption) + Phase 2 (external anchoring) |

**Path 1 is the one a chain closes and nothing else does**, because the operator of
the database is us. Everything else is ordinary security engineering. Which leads
to the uncomfortable, and important, conclusion:

> **Roughly 80 % of "incorruptible" is bought in phases 0, 1 and 2 — and none of
> those three is a blockchain.** Phase 3 (our own chain) only adds something real
> when the validators are *not all ours*. A chain with a single operator is a
> database with worse performance and a better logo.

That is the order the plan follows: it is also the order that survives being
audited by somebody hostile.

---

## 1. Where we stand today (measured, 2026-08-22)

| Area | State | Evidence |
|---|---|---|
| Points balance | `users.puntos` is the **truth**; `movimientos_puntos` is a **receipt** written next to it | `src/server/puntos.ts:31-38` |
| Supply | Not conserved. `ajuste_admin` creates points out of nothing, no counter-entry, no limit | `src/server/puntos.ts:70-95` |
| Ledger integrity | `movimientos_puntos` accepts `UPDATE`/`DELETE` like any table. No hash chain, no signature | schema |
| Change history | `entity_history` is good and complete — and mutable, and covers only what routes it | `src/server/historial.ts` |
| Encryption at rest | **None.** The only cryptography in the product is password hashing (scrypt, `src/server/auth.ts:50-73`) and agent-token fingerprints (SHA-256, `src/server/agentesIA.ts:47`) | grep over `src/server` |
| Encryption in transit | TLS at Caddy/Cloudflare (Full strict). App↔Postgres inside the Docker network, no TLS | `deploy/Caddyfile` |
| Key management | Secrets live in `.env` on the server and in the container environment. Anyone with a shell reads all of them | `docker exec … printenv` |
| Authorisation | 150 write routes. An automated scan finds an explicit role check inside 67 of them, a session check in 59, and nothing in 24 | scan over `server.ts` + `src/server/**` |
| Backups | Not verified in this audit — **open question, see §7** | — |

### The authorisation finding is not "24 open routes"

Spot-checking the 24 says most of them *are* guarded, by a helper the scanner
cannot see: `requireAdmin` in `server.ts:1088`, `puedeConTabla` in
`src/server/bd.ts:80`. `/api/data/:entity` was open once and was closed (PR #23);
production answers `401` to an anonymous `POST` today, verified by curl.

**The finding is that the scan cannot tell the difference.** With no single policy
module, "is every write route authorised?" can only be answered by a human reading
150 handlers, which means it will be answered wrong eventually. That is already
item #1 of `02_TECH_DEBT.md`, and for a platform used by governments it stops being
tech debt and becomes the floor.

---

## 2. The five properties, and the cheapest thing that buys each

| Property | What it means to Eugenio | Cheapest mechanism | Phase | Needs a chain? |
|---|---|---|---|---|
| **Integrity** | Nobody can change what was recorded without it showing | Hash-chained append-only log, signed | 0-1 | No |
| **Non-repudiation** | Every movement carries a name that cannot be denied later | Ed25519 signature per entry, key not extractable by humans | 1 | No |
| **External verifiability** | Somebody outside can check us **without trusting us** | Daily Merkle root published outside our control | 2 | Public anchor only |
| **Confidentiality** | Sensitive data is unreadable even with the disk in hand | Envelope encryption, per-record key, KEK in a vault | 0 | No |
| **Shared governance** | No single party — including Eugenio — can rewrite the rules | Permissioned chain, validators in different hands | 3 | **Yes** |

---

## 3. The plan

Each phase states what it buys, what it costs, and **how we know it worked**. A
phase without a measurable acceptance criterion is a phase that will be declared
finished by narration, which the house rules forbid.

> **State on 2026-08-22, the same day this was written.** Items 1, 3 and 4 of
> phase 0 are built, tested and pushed on `prog4/seguridad-cadena`
> (`src/server/seguridad/`, `drizzle/0070_registro_sellado.sql`). None of it is
> attached to production data yet: the guard only warns, no route encrypts
> anything, and nothing writes to the sealed record. What is left in phase 0 is
> **110 routes still to review by hand**, the key vault (item 2), signed releases
> (item 5) and the restore drill (item 6). Details and the honest limits in
> `src/server/seguridad/CLAUDE.md`.

### Phase 0 — The floor (no chain). ~2-3 weeks

1. **One authorisation policy module.** Every write route and the AI action
   catalogue read the same table of `operation → minimum level`. A test walks the
   Express router and fails the build if any write route is not in the table. This
   turns "are we authorised correctly?" into a question a machine answers.
2. **Keys leave `.env`.** [OpenBao](https://openbao.org) (Linux Foundation, the
   open fork of Vault) or the hosting KMS. The app receives short-lived tokens;
   signing happens *inside* the vault (transit engine), so the signing key is
   usable by the app and **extractable by nobody**, including us. This is what
   makes a signature mean anything.
3. **Encryption at rest, per record.** AES-256-GCM with one data key per record,
   wrapped by a master key in the vault (envelope encryption). Applied first to:
   private documents, messages, `finanzas`, personal fields of accounts.
   Erasure = destroy that record's key (*crypto-shredding*) — which is also the
   GDPR answer in §4.
4. **Append-only audit log**, hash-chained: every entry carries the hash of the
   previous one, so removing or editing one breaks every hash after it. Signed in
   the vault. Postgres permissions revoke `UPDATE`/`DELETE` on that table from the
   application role.
5. **Signed releases.** The deploy trusts a git tag signed by a key that is not on
   the server, so "whoever controls `main`" is no longer "whoever controls
   production". [sigstore](https://sigstore.dev) / `git tag -s`.
6. **App↔Postgres over TLS**, and a restore drill: a backup that has never been
   restored is a belief, not a backup.

> **Acceptance:** a deliberate `UPDATE` run by hand against the audit table is
> detected by the verifier within one minute, and named as such — not as "an
> error".

### Phase 1 — The ledger of points, done properly (no chain). ~2 weeks

The points become a **double-entry ledger**, which is the same technology banks
used before computers and it is not an accident that it survived.

- Every movement is **two entries that sum to zero**: 100 points to a person come
  *from* the treasury account, never from nowhere. Total supply becomes a fact you
  can recompute, and minting becomes an event with an author instead of an
  `UPDATE`.
- `movimientos_puntos` becomes **append-only and hash-chained**, each entry signed
  in the vault. A correction is a new counter-entry, never an edit — the same rule
  the platform already applies to knowledge (`archived_at`, never `DELETE`).
- **The balance stops being the truth.** `users.puntos` becomes a cache derived
  from the ledger, recomputed and compared nightly. Today it is the other way
  round, and if the two ever disagree, nothing notices.
- **A verifier with three answers**, per the house rule that every component must
  be able to say "I don't know" distinguishably:
  `VERIFICADO` · `ALTERADO` · `NO SÉ TODAVÍA` (not yet anchored).

> **Acceptance:** `SELECT sum(cantidad) FROM movimientos_puntos` = 0 across the
> whole ledger, every night; and a hand-made `UPDATE` on a balance is reported as
> `ALTERADO` with the id of the first broken entry.

### Phase 2 — Public anchoring: the moment "not even we can change it" becomes true. ~1 week

Once a day, the Merkle root of everything appended that day is published where we
do not control it:

- [OpenTimestamps](https://opentimestamps.org) on Bitcoin — free, no wallet, no
  token, and the proof is verifiable by anyone in a browser.
- Optionally a cheap EVM L2 in parallel, so verification does not depend on one
  network.

Cost: **céntimos a day.** What it buys is the sentence that a government auditor
actually wants to hear: *"the record of 12 August existed on 12 August, and this is
provable without asking humanity.wiki for anything."*

Only the root travels. **No personal data, not even hashed** — see §4.

> **Acceptance:** an outsider, with a public script and no access to our systems,
> confirms yesterday's root. If they cannot, the answer is `NO SÉ`, never a green
> tick.

### Phase 3 — Our own permissioned chain, when it is worth it. Not before

**Trigger condition — write it down, do not fudge it:** at least **three
independent institutions** willing to run a validator node. Until then, phases 1-2
give the same guarantees at a fraction of the cost and complexity.

When the condition is met:

| Piece | Why this one |
|---|---|
| **Hyperledger Besu**, QBFT consensus | EVM, Apache-2.0, LF Decentralized Trust. It is also **what EBSI/Europeum-EDIC runs** for EU cross-border public services (Besu, IBFT 2.0), so the government audience is being offered their own stack, not ours |
| **Hyperledger FireFly** | The "supernode": REST API, event streams, key management, so the platform never speaks raw JSON-RPC. It is what keeps the chain from leaking into all 150 routes |
| **Paladin** | Programmable privacy on EVM (private token flows, privacy groups). Graduated in 2025, adopted by central banks. **Tessera privacy is deprecated since Besu 24.12.0** — do not use it, it is what most tutorials still show |
| **Hyperledger Cacti** | Only if we ever need to bridge to another chain. Not now |

The points become a **non-transferable token contract** (an ERC-20 with transfers
disabled between people), because of §7's legal question.

Cost: 4 validator nodes ≈ 2 vCPU / 8 GB each ≈ **80-150 €/month** plus operations.
**It cannot run on Eugenio's Mac** (8 GB, and it already falls over with five
Claude sessions — `project-maquina-y-sesiones`): phase 3 needs cloud, and that is a
real, new, permanent cost, not a rounding error.

### Phase 4 — Identity: proving who a senior official is without holding their ID

Governments will not accept "email + password" as proof of office, and we do not
want their identity documents in our database — the safest personal data is the
kind we never store.

1. **Now:** `did:web` + W3C Verifiable Credentials. The organisation signs "this
   person holds this role"; we verify the signature and store the *claim*, not the
   evidence.
2. **Later:** AnonCreds / Hyperledger Indy (also available as *Indy on Besu*) for
   selective disclosure — proving "I am a public official of Spain" without
   revealing which one.
3. **Aligned with eIDAS 2.0 / the EUDI wallet**, which is the format European
   administrations will be issuing into anyway. Building our own identity scheme
   against that tide would be work with an expiry date.

### Phase 5 — Post-quantum, for records meant to outlive us

A record anchored in 2026 that must still be provable in 2050 needs signatures
that survive a quantum computer.

- Hash-based anchoring (phase 2) is **already** post-quantum safe.
- Signatures migrate to **ML-DSA (FIPS 204)** in hybrid mode (classical +
  post-quantum together) when the vault supports it. Ed25519 today is correct;
  what matters is that the format carries an algorithm field from day one, so the
  migration is a new entry type and not a rewrite.

---

## 4. The rules that are not negotiable

**This is the part that decides the architecture, so it is not an appendix.**

On **7 July 2026** the EDPB adopted the final version (v2.0) of *Guidelines
02/2025 on processing of personal data through blockchain technologies*. Its
position, in one line: **do not put personal data on a chain — not in clear, not
encrypted, and not hashed** — and "it is technically impossible to erase" is not a
defence that works against GDPR article 17.

What that forces, and what we do about it:

| Rule | Our design |
|---|---|
| No personal data on chain | On chain travels **only** a Merkle root over a batch. Nothing on chain identifies anyone, even indirectly |
| A hash of personal data is still personal data | Leaves are **salted** commitments, with the salt stored off-chain, in the database, next to the record |
| The right to erasure must work | Erasure destroys the record **and its salt and its key**. What survives on chain is a root that no longer relates to any person: erasure by destroying the key, not by editing history |
| Encryption is not anonymisation | We never claim it is. Encrypted data is still personal data, and is treated as such |

Also in scope, depending on who adopts the platform:

- **ENS** (Esquema Nacional de Seguridad, RD 311/2022) if any Spanish
  administration uses it — it is a certification, and phases 0-1 are most of what
  it asks for.
- **eIDAS 2.0** for identity (phase 4).
- **House rule 4** (`CLAUDE.md`): no real secret in a versioned file, ever, and
  never copied into `memory/`.

---

## 5. Why the Linux Foundation ecosystem is the right instinct

Because of who the users are. A government cannot adopt a stack it cannot inspect,
cannot fork, and cannot keep running if the vendor disappears. LF Decentralized
Trust (the Hyperledger Foundation since September 2024) is Apache-2.0, vendor
neutral, and — the part that matters most — **Besu is what the EU's own EBSI
infrastructure runs**. Choosing it means an interoperability conversation instead
of a migration conversation.

| Project | Verdict |
|---|---|
| **OpenBao** (LF) | **Adopt in phase 0.** Nothing else on this list means anything while the signing key sits in a `.env` |
| **Besu** (QBFT) | Adopt in phase 3, under the three-validator condition |
| **FireFly** | Adopt with Besu, from the first day — retrofitting it later means touching every route |
| **Paladin** | Evaluate in phase 3 if confidential token flows are needed. **Not Tessera** (deprecated) |
| **Indy / Aries / AnonCreds** | Phase 4, after `did:web` proves the flow |
| **Cacti** | Not now. Bridges are the most attacked component in this industry |
| **sigstore / in-toto** (LF) | Phase 0, for the deploy chain |

---

## 6. What it costs

| Phase | Infrastructure | Work | Runs on the Mac? |
|---|---|---|---|
| 0 · Floor | 0-20 €/month (vault) | 2-3 weeks | Yes |
| 1 · Ledger | 0 | ~2 weeks | Yes |
| 2 · Anchoring | ~0 (céntimos/day) | ~1 week | Yes |
| 3 · Own chain | 80-150 €/month | 4-6 weeks + permanent operations | **No** |
| 4 · Identity | 0-30 €/month | 3-4 weeks | Yes |
| 5 · Post-quantum | 0 | Migration, when the vault supports it | Yes |

---

## 7. Decisions that are Eugenio's, not ours

1. **Are points transferable between people?** Today they are not, and they are
   bought with real money (100 points = 100 €, `src/server/stripe.ts:261`). A
   closed-loop, non-transferable point is a voucher and stays out of financial
   regulation. **The day one person can send points to another, it starts to look
   like a payment instrument, and MiCA and e-money rules enter the room** — with
   licensing, capital and reporting attached. This is a product decision with a
   legal price tag, and it should be taken deliberately, not discovered.
2. **Area assignment.** All of this lives in `src/server/**` and `src/db/**`, which
   `equipo/REPARTO.md` assigns to Programador 1. Security and chain need their own
   area (`src/server/seguridad/**`, `src/server/cadena/**`, plus ledger migrations)
   or two people will build it twice.
3. **Backups**: not audited yet. Whether one has ever been restored is a question
   with a one-word answer that nobody has asked.
4. **Go-ahead for phases 0 and 1**, which are worth doing whatever is decided about
   the chain.
