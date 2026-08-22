# Tablas — the ten phases

The tool the user asked for: user-built databases at the level of Airtable and
Notion, replacing the editor's plain-text table block, insertable into any page,
with real formulas and conditional logic.

Layer 1 (typed columns, five types, grid-less API) already exists: `bd_tablas`,
`bd_columnas`, `bd_filas` and `src/server/bd.ts`, committed as
`User databases, layer 1`. These ten phases build on it.

**Rule for every phase: it is not finished until it is tested. The final test is
a full CRM table exercising everything at once.**

| # | Phase | Done when |
|---|---|---|
| 1 | **The cell types that hold values.** texto largo, url, email, teléfono, moneda, porcentaje, valoración, duración. Plus `select` multiple. | Every type round-trips through the API and rejects what it should |
| 2 | **The cell types that point at things.** persona, proyecto, publicación, and relation to another `bd_tabla` — one generic links table, indexed both ways | A row can point at a real user and a real project, and the reverse side is a query |
| 3 | **The cell types that hold files.** imagen, vídeo, documento, hung off `archivo.ts` so permissions are inherited, not reinvented | A file attached to a cell is visible exactly to whoever can see the row |
| 4 | **The grid.** Ver, add row, edit cell with the control its type deserves, delete, add/remove/reorder column, resize | Every type is editable from the screen, on desktop and at 390px |
| 5 | **Rollups and lookups.** Reading through a relation: count, sum, min, max, average, list | A supplier shows the sum of its components' costs |
| 6 | **The formula engine.** Excel-like: arithmetic, comparison, text, dates, and the three cell states surviving through every operator | A formula over an empty cell says "empty", not zero |
| 7 | **Conditions.** `SI(...)`, AND/OR/NOT, and a conditional column type with rules | A verdict column decides from three inputs and explains itself |
| 8 | **The dependency graph.** Evaluation order, cycle rejection at definition time, aggregate-of-formula | A formula depending on a rollup of another formula computes once, correctly |
| 9 | **Views.** Sort, filter, group, hide columns, saved views | A saved view survives a reload and is per-user |
| 10 | **In the page.** A block that embeds an existing table or creates one, replacing the plain-text table block | An old plain table still renders; a new one is a real database |

## The two rules that carry through all ten

**Identity is never a name.** Columns, select options, rows and views all carry
their own id. A rename must never change a meaning. This is already true in
layer 1 and every phase must keep it true.

**Three cell states, everywhere.** `vacia`, `ok`, `sin_calcular`, `error`. A
formula over a missing value returns empty, not zero. A division by zero returns
an error that says so. Nothing silently becomes a number that looks right.
