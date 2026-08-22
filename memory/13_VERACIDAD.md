# Veracity: claims, debates and the spectrum of views

Programmer 5's area, opened 2026-08-22 by Eugenio: *«un sistema de veracidad
dentro de la APP para que lo que la gente publique sea información coherente con
la otra información que hay, y poder generar un espectro de visiones sobre una
verdad, y que haya debates visuales sobre los temas más relevantes. Inspírate en
Kialo.»*

## What this is, in one paragraph

Wikipedia's answer to disagreement is a single article that must converge on one
neutral voice, plus a talk page nobody reads. Kialo's answer is the opposite: the
disagreement **is** the artefact — a thesis at the top, pro and con arguments
hanging off it, each argument itself a thesis that can be argued about, and a
score that says how much each branch actually moves people. This area brings that
into humanity.wiki and connects it to what the platform already has: territories,
indicators, sources and the knowledge graph. The output is not a verdict. It is a
**spectrum of views**, with the reasons for each one visible and rated.

## Why it is not just another graph

The knowledge graph already has `apoya` / `contradice` / `matiza` edges
(`src/utils/relationStyle.ts`), and a debate could in principle be drawn with
them. It is still a separate model, for three reasons:

1. **A graph edge has no stance and no weight.** «A contradicts B» does not say
   how strongly, according to whom, or with what evidence.
2. **A debate is a tree, not a soup.** Kialo's whole value is that an argument
   attaches to *one* parent claim, so the reader always knows what is being
   argued about. A free graph loses that the moment two edges land on a node.
3. **A claim needs its own veracity state and its own sources.** That state has
   to be readable from anywhere in the platform (a publication, an indicator,
   the map), not only from inside a canvas.

Phase 7 draws debates on the existing canvas. The model stays separate.

## The root rule of this area

**No screen ever shows one truth as if it were the only one.** Where there is
real disagreement, the interface shows the spread and lets the reader see who
holds what and why. And, per `src/server/CLAUDE.md`, every part of it must be
able to say «I don't know»: a claim with no source says *sin fuente*, never
nothing at all.

---

## The ten phases

Each phase is one PR from `prog5/…` to `main`, and each one leaves the platform
in a working state. A phase is finished when `npx tsc --noEmit` is clean,
`npm run build` passes, and there is an entry at the end of
`memory/08_CHANGELOG.md`.

| # | Phase | What exists at the end of it |
|---|---|---|
| 1 | **Foundations** | `debates`, `argumentos`, `veracidad_fuentes` tables + `src/server/veracidad.ts` with read/write routes. Nothing visible yet |
| 2 | **The claim and its source** | A claim carries sources and a veracity state (`sin_fuente` → `refutada`). `<SelloVeracidad>` badge, reusable anywhere |
| 3 | **The Kialo tree** | Pro/con/qualifying arguments, nested to any depth, with the tree read in one query |
| 4 | **The debate screen** | `/debates/:slug`: the thesis, its branches, collapse/expand, add an argument |
| 5 | **Impact voting** | Each person rates how much an argument moves them; branches order by impact, not by arrival time |
| 6 | **The spectrum of views** | The distribution of positions, and which arguments hold each one up. This is the phase Eugenio asked for by name |
| 7 | **The visual debate** | The debate drawn on the existing canvas, and hung off an indicator, a challenge or a publication |
| 8 | **Coherence** | When someone publishes something that contradicts what is already there, they are told before publishing, and the contradiction is recorded |
| 9 | **Review, moderation and history** | Level-3 peer review, reports, public change history of a claim |
| 10 | **In the open** | Most relevant debates on the home page, in search, in notifications, and openable by the assistant |

### Phase 1 · Foundations

Three tables and one module.

- **`debates`** — the thesis. Belongs to a territory (constitution rule 3), has
  an author (rule 2), keeps history (rule 4), archives rather than deletes
  (rule 6).
- **`argumentos`** — the tree. `parent_id` NULL means it hangs from the thesis
  itself. `postura` is one of `a_favor` / `en_contra` / `matiza`, deliberately
  the same three words the graph already uses for `apoya` / `contradice` /
  `matiza`.
- **`veracidad_fuentes`** — a source, attached by `(entidad_tipo, entidad_id)`
  so the same table serves debates, arguments and, later, anything else.
  This is not a 44th junction table: a source is owned by what it cites, and it
  carries its own fields (url, author, date, quote).

Votes are **not** a new table: the existing `ratings` table already stores
`(user_id, entity_type, entity_id, score)`. Phase 5 uses it with
`entity_type = 'argumento'`.

### Open questions for Eugenio, in the order they will block

1. **Who may open a debate?** Proposal: level 1, same as a publication. A debate
   is a question, not a claim about the commons.
2. **Who may close one?** Proposal: level 3, and closing never deletes the
   losing side — it marks the state of the discussion at a date.
3. **Does a debate need a territory?** The constitution says every entity
   belongs to one, but «is nuclear power the fastest way to decarbonise» is not
   Spanish or Andalusian. Proposal: territory optional, and a debate with none
   is global.

Number 3 is a real divergence from the constitution and, if he agrees, it goes
in `memory/03_DECISIONS.md`, never into `docs/`.
