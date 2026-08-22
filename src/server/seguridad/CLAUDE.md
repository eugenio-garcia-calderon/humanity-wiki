# Security

Phase 0 of `memory/09_TARGET_ARCHITECTURE/03_SECURITY_AND_CHAIN.md`, written by
Programador 4 on 2026-08-22. Read that document before changing anything here:
the order of the phases is the argument, and it is not arbitrary.

```
clasificacion.ts  how much each of the 129 tables matters, and the tier that follows
politica.ts       the single table: who may write what, and why
guardia.ts        the table, applied, before any route sees the request
cifrado.ts        envelope encryption: one key per record, key destruction = deletion
firma.ts          Ed25519: proves WE wrote it, which the hash chain cannot
registro.ts       the sealed record: append-only, hash-chained, signed, verifiable by anyone
```

Tiers and the phased plan: `memory/09_TARGET_ARCHITECTURE/04_DATA_INTEGRITY_TIERS.md`.

Migration: `drizzle/0070_registro_sellado.sql`.

## The commands

```bash
npm run seguridad:permisos       # is every write route declared? fails the build if not
npm run seguridad:clasificacion  # is every table classified? fails the build if not
npm run seguridad:probar         # the four test scripts
npx tsx scripts/probar-registro.ts   # creates a throwaway database, and drops it
```

`seguridad:probar` needs Postgres reachable for the sealed-record part. **If it
cannot reach one it says NO SÉ and exits non-zero** — a skipped test that reports
green is worse than no test.

## What is real today, and what is still paper

| Piece | State |
|---|---|
| The classification | **129 of 129 tables**: 40 tier 3, 68 tier 2, 18 tier 1, 3 recomputable |
| Signatures | Ed25519 with key rotation built in. **`CLAVE_FIRMA_REGISTRO` is not set anywhere**, so entries are written unsigned and say so |
| The policy table | 150 routes declared. **40 reviewed by hand, 110 still `revisar`** |
| The guard | Wired in `server.ts`, running in `avisar` mode: it logs, it blocks nothing |
| Encryption | Module and tests done. **Nothing in the product uses it yet**, and there is no key table |
| The sealed record | Table, writer and verifier done and tested. **Nothing writes to it in production yet** |
| Anchoring (phase 2) | The `registro_anclajes` table exists and the daily root can be computed. **Nothing publishes it** |

Saying it plainly costs nothing and prevents the expensive mistake: believing
these are protecting something they are not yet wired to.

## `revisar` is the third answer, not a pass

A route marked `revisar` means *the scan saw a guard and no person has confirmed
it is the right one*. The guard deliberately enforces nothing on those routes.

**Bringing that number to zero is the remaining work of phase 0.** Reviewing one
means opening the handler, reading what it actually checks, deciding what it
*should* check, and replacing the entry with a real `guardia` plus a `nota`
saying why that level and not another. Do not batch-convert them: a policy
deduced from the code being audited certifies whatever the code already does.

## Turning the guard on

```bash
SEGURIDAD_MODO=exigir      # enforce
SEGURIDAD_MODO=avisar      # default: log only
```

Verified locally on 2026-08-22, port 3003:

| Mode | `POST /api/data/territories`, no session | Log |
|---|---|---|
| `avisar` | 401 with the route's own message — the guard did not intervene | `habría devuelto 401 … exige nivel 4` |
| `exigir` | 401 with the guard's message, before the route ran | — |

Public routes (`/api/auth/login`) reach their handler in both modes, and `GET`
is never touched.

**Read the `avisar` log for a few days before flipping it.** One wrong line in
the table and somebody cannot do their job, in production, and the cause looks
like anything but a policy table. Flipping back is an environment variable, not
a deploy — that is the point of having the two modes.

## Before you change this, decide

| If you are about to… | Why it matters | What to do instead |
|---|---|---|
| Add a write route | The audit fails the build until it is declared | Add it to `politica.ts` with its reason |
| Mark many routes as reviewed at once | A policy deduced from the audited code always passes | Review one at a time, and write the `nota` |
| Change `SEPARADOR`, `textoDe` or the Merkle rule | **Every hash ever written changes**, and the whole record reads as tampered | Never. Add a new version tag and keep reading the old one |
| Store the wrapped key in the same row as the data | A backup carries both, and destroying the key never reaches that copy | Its own table, which is what gets purged |
| Write a tier by hand in `clasificacion.ts` | The tier is computed; a hand-written one hides the argument about why it matters | Change the grades, and say why in `porque` |
| Let confidentiality raise the tier | You end up signing and anchoring private chats while public indicators stay unsigned | Confidentiality decides encryption, integrity and authenticity decide the tier |
| Put personal data on a chain, even hashed | EDPB Guidelines 02/2025 v2.0 (7 July 2026): a hash of personal data is still personal data | Only the salted daily root leaves |
| Trust the `registro_sellado` triggers as security | They stop the accident, not somebody with rights to drop them | The chain, and phase 2's external anchor |

## The honest limit of all of this

Everything here is verifiable **by us**, on our own machine, against our own
database. That is worth a great deal against accident and against an insider in
a hurry — and it is worth nothing against someone who can rewrite the database
and recompute every hash at leisure.

Only phase 2 closes that, and it closes it by publishing a number where we
cannot reach it. Until that runs daily, the correct answer to "can this be
corrupted?" is **not yet fully** — and saying so is the difference between
security and the appearance of it.
