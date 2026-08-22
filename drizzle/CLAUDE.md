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

## Numbering

One migration per number, and the number is the order they run in. Two agents
working the same afternoon will pick the same number — check `drizzle/` against
`origin/main` before you name yours, not after.
