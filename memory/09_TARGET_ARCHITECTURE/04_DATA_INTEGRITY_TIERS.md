# Protecting data by how much it matters

> Written **2026-08-22** by Programador 4, at Eugenio's request:
>
> *«Céntrate en que nadie pueda corromper los datos. Vamos a generar capas de
> seguridad en base al nivel de relevancia de un dato o contenido para que no
> pueda ser corrompido. Utiliza el estado del arte en ciberseguridad para montar
> todo el sistema en varias fases.»*
>
> Companion to [`03_SECURITY_AND_CHAIN.md`](03_SECURITY_AND_CHAIN.md), which
> covers the chain and the key management. This one is about **what gets which
> protection, and in what order it gets built**. The points/token ledger moved
> to another conversation and is deliberately not here.

---

## 1. Why tiers, and not "protect everything"

Protecting all 129 tables at maximum is not safer. It is slower, more expensive,
and — the part that actually bites — it is how alarms stop being read. An
integrity alert that fires on somebody editing their own saved-map list trains
everyone to close alerts.

Protecting "the important ones" without writing down which those are is worse:
every person pictures a different set, and the day it must be decided quickly,
it is decided wrong.

So the first artefact is not a control. It is **the written decision about what
matters**: `src/server/seguridad/clasificacion.ts`.

### Four grades, not one label

Straight from the **Esquema Nacional de Seguridad** (RD 311/2022, Anexo I),
which is also the framework any Spanish administration adopting this will ask
for:

| Dimension | The question it answers |
|---|---|
| **Integridad** | what happens if somebody CHANGES it |
| **Confidencialidad** | what happens if somebody READS it |
| **Trazabilidad** | how much it matters to know WHO did it and WHEN |
| **Autenticidad** | how much it matters that it is from WHO IT CLAIMS, and from its source |

Four instead of one, because of a case a single label cannot express: **the
commons indicators are public (confidentiality low) and are the gravest thing
that can be corrupted in this platform (integrity high)**. With one label they
are either encrypted for no reason or left unprotected. Availability — the fifth
ENS dimension — is deliberately out: it is about the service staying up, this is
about the data not being corrupted, and mixing them means neither gets done.

The tier is **computed** from the grades. Nobody writes "this is tier 3": they
state how much it matters and the tier follows. Raising something's protection
therefore requires arguing that it matters more, which is the useful argument.

### The ladder, cumulative

| Tier | What it means | Controls |
|---|---|---|
| **0** | recomputable from its source | backups, restore drill |
| **1** | ordinary | + writes only through an authorised route, archive never delete, full history |
| **2** | shared knowledge | + every write appended to the sealed record, daily root anchored outside, periodic verification with three answers |
| **3** | identity, money, measured commons, the trail itself | + every entry signed with a key outside the database, envelope encryption when confidentiality is high, two-person rule for structural changes, immediate alarm |

Measured today: **129 of 129 tables classified — 40 in tier 3, 68 in tier 2, 18
in tier 1, 3 recomputable.** `npm run seguridad:clasificacion` fails the build on
any table nobody has classified: five people work in this repo and tables appear
daily, and the moment to decide how to protect one is the day it is created,
while whoever created it still remembers what it was for.

---

## 2. The phases

Ordered by one rule: **each phase must be verifiable before the next one is
built.** Security work that cannot be checked accumulates into a story about
being protected.

### Phase A — Know what you are protecting · **built 2026-08-22**

The classification, the audit that keeps it honest, and signatures on the sealed
record. Signing matters more than it looks: the hash chain proves nothing has
changed since it was written, and does **not** prove we wrote it — anyone who can
write to the table can forge a whole coherent chain. Ed25519, key outside the
database, key id in every entry so rotation never turns old entries into
"invalid" (which is indistinguishable from "tampered").

> **Verifiable by:** `npm run seguridad:clasificacion` · `npm run seguridad:probar`

### Phase B — Attach it to the real writes · **built 2026-08-22, not applied to production**

I planned to wire this into the same middleware layer as the permission guard.
**That was the wrong place, and building it showed why.** A record written by the
application records what the application does — and the likeliest way to corrupt
data here does not go through the application at all: it is somebody with the
database password writing an `UPDATE` by hand. Middleware cannot see that.

So the capture happens in the database itself (`drizzle/0085_registro_captura.sql`):
`AFTER` triggers on 25 tier-3 tables drop a note in an outbox, and `sellar.mjs`
drains it into the sealed record, chained and signed, outside the request. Two
processes rather than one because they fail for different reasons — a signing
failure must never break somebody's save, or the security gets removed.

What is stored is the **hash of the row, not the row**: enough to prove tampering,
it keeps this from becoming a second copy of the database, and it is the same size
whether one field changed or a hundred. `entity_history` still holds the previous
content; this answers a different question — *is this the same thing that was
there?*

Deleting a note from the outbox before it is sealed leaves a mark: the id is a
sequence, so a missing number is sealed as a gap with its exact range.

`verificar.mjs` runs the chain check plus a **random** sample of rows — random and
not recent, because whoever tampers does it in an old quiet corner. Exit 0 / 1
(altered) / 2 (cannot tell), and it notifies nobody on its own: whoever schedules
it decides what an alarm is.

> **Verified by:** `scripts/probar-captura.ts` — 19 checks written entirely in raw
> SQL, never touching the application, including the one that matters: disable the
> trigger, change the row underneath, and the row's hash no longer matches what was
> sealed.
>
> **What the capture does not cover, and it is the one that hurts:** `sessions`
> is deliberately out. A row inserted there by hand *is* logging in as that
> person, which is exactly what one wants to see — but `auth.ts:223` updates
> `last_seen_at` on every authenticated request, so watching it would fill the
> record with "somebody loaded a page" and the sealer would never catch up. A
> record that is 99 % routine is a record nobody reads. Recovering it means
> recording the session's creation from `auth.ts`, which is an application event
> rather than a row that changes on its own. That is phase B2.

### Phase C — Take the power away from the application

> **Measured in production, 2026-08-22, read-only:** the application connects as
> `humanity`, and that role is a **superuser**. It owns the tables, can create
> roles, and bypasses row-level security. Every one of the 150 write routes runs
> with full power over the database, and no grant we could revoke would change
> it while the role stays super. `scripts/auditar-privilegios.mjs` prints this in
> one command and reads only the catalogue — it writes nothing.
>
> This also decides the order: **making the role non-super comes before every
> other control in this phase**, because until then the triggers, the revoked
> privileges and the append-only record are all things the application could
> undo by accident.

State of the art here is not cryptography, it is **least privilege**, and this is
the phase that protects against our own code being wrong:

- The application's database role loses `DDL`. It cannot create, alter or drop a
  table. Migrations run as a different role, from a deploy that is signed.
- On `registro_sellado`: `INSERT` only. No `UPDATE`, no `DELETE`, no `TRUNCATE`,
  revoked at role level and not only by trigger — a trigger stops the accident,
  a revoked privilege stops the application entirely.
- Row-level security where a row belongs to a person, so a query with a bug
  cannot return somebody else's row.
- A **read-only replica** for everything that only reads, and immutable backups
  (3-2-1-1-0: three copies, two media, one offsite, one immutable, zero errors on
  a restore that was actually run).

> **Verifiable by:** the application, with its own credentials, failing to
> `UPDATE registro_sellado` and failing to `DROP TABLE`.

### Phase D — Publish the proof where we cannot reach it

The daily Merkle root to OpenTimestamps (Bitcoin) — free, no wallet, verifiable by
anyone. Only the salted root travels: EDPB Guidelines 02/2025 v2.0 (final,
7 July 2026) are explicit that a hash of personal data is still personal data.

Until this runs daily, everything above is verifiable **by us**, on our own
machine, against our own database — which is worth a lot against accident and an
insider in a hurry, and nothing against someone who can rewrite the database and
recompute every hash at leisure.

> **Verifiable by:** a stranger, with a public script and no access to our
> systems, confirming yesterday's root.

### Phase E — Two people for the gravest changes

Two-person integrity, which is old, boring and effective. For tier 3 structural
changes — granting an administrator role, permanently deleting knowledge,
changing an indicator that has a cited source — one person proposes and a second
approves, both recorded in the sealed record.

Plus a **break-glass** path: one person alone can act in an emergency, and doing
so raises an alarm nobody can silence, including them. A rule with no emergency
exit gets bypassed the first time it is inconvenient, and then it protects
nothing.

> **Verifiable by:** the same person being unable to approve their own proposal.

### Phase F — Where the content came from, and who may read it

> **Added 2026-08-22, measured against production:** `/uploads` is served by
> `express.static` with **no session check at all** — a file returns `200` with no
> cookie. Found while reviewing the new security board: the note can be hidden and
> **its attachment cannot**. It applies to every private document anybody uploads,
> not only to security notes.
>
> Closing it is not a patch, it is a decision table: a profile photo is public, a
> document inside a private project is not, and today both live in the same
> folder served the same way. That table comes before the code. Note
> `INCMT4IJNSRHCM`.

For a platform whose value is that its data is trustworthy, provenance is not a
luxury:

- **C2PA / Content Credentials** on uploaded images and documents, so an image
  can carry a verifiable statement of where it came from — and, more usefully,
  so the absence of one is visible. This is the current answer to synthetic
  media, and it is what public bodies are starting to require.
- Sources (`veracidad_fuentes`) signed and pinned: what a figure cites should not
  be editable after the figure has been used to decide something.

> **Verifiable by:** an altered image losing its credential, visibly, rather than
> silently passing.

### Phase G — Notice without being told

- **Continuous verification**: the whole chain nightly, a random sample hourly.
- **Canaries**: rows whose only purpose is to be verified. Anything that rewrites
  the database wholesale trips them.
- Alerts that distinguish *tampered* from *cannot check right now*, and that go
  somewhere a human actually looks.

> **Verifiable by:** a deliberate tamper drill, run on a schedule, that must be
> caught every time.

### Phase H — The keys, properly

Everything above rests on keys that today live in environment variables. In a
vault (OpenBao) the signature happens **inside** and the key never leaves — which
is when a signature starts to mean something against whoever administers the
server too. Then: rotation on a schedule, split control of the anchoring key
(Shamir), and hybrid post-quantum signatures for records meant to outlive the
algorithms.

> **Verifiable by:** rotating a key and having everything signed with the
> previous one still verify.

---

## 3. What this does not do

Said plainly, because the expensive mistake in security work is believing a
control is attached to something it is not:

| | |
|---|---|
| Phase A is built | and it is wired to **nothing**: the guard only warns, no route encrypts, nothing writes to the sealed record |
| The triggers on the sealed record | are hygiene. They stop the accident, not somebody with rights to drop them |
| Everything through phase C | is verifiable only by us, on our own machine |
| Nothing here stops a lie | being written correctly by an authorised person. That is [`05_VERACIDAD`](.) territory — a different problem, owned by somebody else |

The honest answer to "can this be corrupted?" stays **not yet fully** until phase
D runs daily. Saying that, rather than the other thing, is the difference between
security and the appearance of it.
