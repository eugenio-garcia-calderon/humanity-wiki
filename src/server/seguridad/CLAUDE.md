# The sealed record

Written by Programador 4 on 2026-08-22, split out of the security branch so that
the agent login link (Programador 1) can record itself somewhere that cannot be
edited. It carries **only** the record: no permission guard, no encryption, no
classification — those stay in `prog4/seguridad-cadena`.

```
registro.ts   append-only, hash-chained, signed; and the verifier
firma.ts      Ed25519: proves WE wrote it, which the hash chain cannot
```

Migration: `drizzle/0064_registro_sellado.sql` — two new tables,
`registro_sellado` and `registro_anclajes`.

## This PR changes no behaviour

Nothing calls `anotar()` yet. The two tables are created empty and stay empty
until somebody writes to them on purpose. That is deliberate: it is the smallest
thing that can be deployed, and it unblocks a feature that must not ship with
half an audit trail.

## Why `entity_history` was not enough

It records what changed, very well, and it can be edited and deleted like any
other table. Whoever alters a figure can alter its trace, and then the trace is
worth nothing.

Here each entry carries the hash of the previous one, so removing, editing or
inserting one breaks every hash after it — and the verifier says **which** entry
broke and **how**: `huella` is somebody editing a row, `eslabon` is somebody
deleting one. Different failures, different fixes.

## And why the signature, on top of the chain

The chain proves nothing has changed *since it was written*. It does not prove we
wrote it: anyone who can write to the table can forge a whole coherent chain from
scratch. Ed25519 with the key outside the database closes that.

The test shows exactly what it buys: an entry edited **and every following hash
recomputed** passes all the chain checks, and the signature still catches it.

Each signature carries the id of the key that made it, so rotating a key does not
turn everything older into "invalid" — which would be indistinguishable from
"tampered". Without the public key, the answer is `NO SÉ`, never an accusation.

## Using it

```ts
import { anotar, leerCadena, verificarCadena } from './seguridad/registro.js';

await anotar(db, { clase: 'sesion_agente', actor: agenteId, asunto: userId, datos: { ip } });

const v = verificarCadena(await leerCadena(db), { [claveId]: publicaBase64 });
// v.estado: VERIFICADA | ALTERADA | NO_SE      ← three answers, never two
// v.firmas.estado: VALIDAS | ALGUNA_INVALIDA | SIN_FIRMAR | NO_SE
```

**Never put a token, a hash of a token, or anything identifying in `datos`.** The
daily root of this table is meant to be published outside (phase 2), and the
EDPB's final guidelines are explicit that the hash of personal data is still
personal data.

## The key

`CLAVE_FIRMA_REGISTRO`, base64 of a PKCS8 Ed25519 private key. **It is not set
anywhere yet**, so entries are written unsigned — and they say so (`firma NULL`,
`firmas.estado = 'SIN_FIRMAR'`) rather than pretending. Generate one with
`generarPareja()` in `firma.ts`.

Until that key exists in production, this table proves *nothing was changed*. It
does not yet prove *we wrote it*.

## Checking it

```bash
npx tsx scripts/probar-registro.ts
```

Creates its own throwaway database, applies the migration, writes, tampers —
including disabling the trigger and editing a row the way somebody with rights
would — and drops the database at the end. **If no Postgres is reachable it says
NO SÉ and exits non-zero**: a skipped test that reports green is worse than no
test.

## Before you change this, decide

| If you are about to… | Why it matters | What to do instead |
|---|---|---|
| Change `SEPARADOR`, `textoDe()` or the Merkle rule | **Every hash ever written changes**, and the whole record reads as tampered | Never. Add a new version tag and keep reading the old one |
| Trust the `UPDATE`/`DELETE` triggers as security | They stop the accident and the 3am shortcut, not somebody with rights to drop them | The chain, the signature, and the external anchor |
| Take a lock to avoid two writers | A lock has to be remembered; one place that forgets it removes the guarantee | The unique index on `huella_previa`: the database decides who continues the chain |
| Publish anything from here | A hash of personal data is still personal data | Only the salted daily root |
