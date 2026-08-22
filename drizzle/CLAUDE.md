# Migrations

Versioned SQL under `drizzle/`, applied in order at deploy time. Generate with
`drizzle-kit generate` and apply with `psql -f`; **never `drizzle-kit push`**, which
hangs in a non-interactive shell.

## Every foreign key carries an index

Measured on 2026-08-22: **94 of the 187 declared foreign keys had no index.** On a
copy of a join table with 2,000,000 rows the same lookup went from **59.3 ms to
1.3 ms — 47 times faster** (mean of 5 runs). And the cost nobody counts: deleting a
parent row makes Postgres check every child table, so without indexes deleting
*one* territory scans all 15 tables that reference it, end to end.

Write the index in the same migration that declares the key. **This failure never
announces itself**: nothing breaks, `tsc` stays clean, review sees nothing. It only
shows up under traffic, which is the worst moment to find it.

## The number is a label, not a promise

**A migration may only depend on another that is already in production**, never on
one with a lower number. `migrate.sh` sorts by name *within one deploy*; between
deploys, what decides is the order the deploys went out.

Measured in production on 2026-08-22:

```
0079_veracidad_tablero.sql      15:52:25
0078_veracidad_debates.sql      15:52:24
0077_textos_editables.sql       16:10:44   <-- eighteen minutes later
0076_intentos_fallidos.sql      15:41:40
```

0078 and 0079 ran before 0077, and nothing was broken: they went out in an earlier
deploy. That is not a bug to fix, it is how it works — but it means "the 0080 runs
after the 0079" is only true if they travel together or if 0079 shipped first.

## Numbering

One migration per number, and the number is the order they run in. Two agents
working the same afternoon will pick the same number — **check `drizzle/` against
`origin/main` before you name yours, not after.**

`schema_migrations` records **file names**, so two files sharing a number both get
applied and the order between them is whatever the filesystem lists first. That is
a coincidence, not an order.

**Reserve the file name the moment you pick a number**, before writing the SQL:

```
node scripts/equipo.mjs reservar drizzle/0075_lo_que_sea.sql --motivo "para qué"
```

The claim system already prevents this and nobody was using it for numbers. Four
collisions happened on 2026-08-22 for want of one command.

**It already happened on 2026-08-22**, with five agents working in parallel:

| Number | Files |
|---|---|
| `0064` | `cache_medida` and `envio_de_productos` |
| `0066` | `chat_anonimo_contabilizado` and `pedidos` |

Both pairs are already applied in production and neither depends on the other, so
nothing is broken today. Left as they are on purpose: renaming an applied migration
is worse than the duplicate. The next one is the one to avoid — a third file on a
used number, or two that do depend on each other.
