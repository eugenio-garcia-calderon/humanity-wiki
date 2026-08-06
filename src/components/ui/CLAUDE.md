# Design system

This folder is the only place where visual style is defined. Every page imports from
here.

**Current state, measured 2026-08-06**: `core.tsx` exports 3 primitives (`Card`,
`Badge`, `Button`), imported by 10 of 34 pages. `src/index.css` is **one line**
(`@import "tailwindcss"`), so there are no design tokens at all. The project has 117
bare `<button>` elements and 24 hand-written hex colours.

That is the gap this file exists to close.

## The two rules

1. **No hex colours outside this folder.** A colour lives as a token, is used through
   a Tailwind class, and gets changed in one place.
2. **The rule of two**: the second time you write the same markup, it moves here as a
   primitive. Not the third.

## Tokens go in `src/index.css`

Tailwind 4 has no config file. Tokens are declared with `@theme` and become utility
classes automatically:

```css
@import "tailwindcss";

@theme {
  /* Brand */
  --color-brand:        oklch(0.62 0.14 162);   /* emerald, the platform accent */
  --color-brand-soft:   oklch(0.95 0.03 162);

  /* Score scale, 0-100. Today hardcoded in src/utils/scoreColor.ts */
  --color-score-bad:    ...;
  --color-score-mid:    ...;
  --color-score-good:   ...;
  --color-no-data:      oklch(0.87 0.02 250);   /* #cbd5e1, the "Sin datos" grey */

  /* Risk levels: bajo | moderado | alto | peligroso */
  --color-risk-low:     ...;
  --color-risk-medium:  ...;
  --color-risk-high:    ...;
  --color-risk-danger:  ...;

  /* Surfaces and borders, replacing the repeated slate-100/slate-200 */
  --color-surface:      ...;
  --color-border-soft:  ...;

  --radius-card:        1rem;      /* the repeated rounded-2xl */
}
```

Where to source the real values before writing them: `src/utils/scoreColor.ts` (the
0-100 gradient), the risk-level colours in the map and station markers, and the
`rounded-2xl border border-slate-100 p-5 shadow-sm` card pattern that appears
verbatim in at least four places.

Do this **before** lifting primitives: a primitive built on hardcoded colours has to
be rewritten later.

## Primitives that exist

| Primitive | Variants |
|---|---|
| `Card` | — |
| `Badge` | `default` `success` `warning` `danger` `info` |
| `Button` | `primary` `outline` `ghost` |

## Primitives that are missing

Ordered by how often the raw markup is currently repeated. Each one should be lifted
the next time a page needs it, not in a big-bang refactor:

- `IconButton` — the square icon-only button, repeated with `rounded-xl border flex items-center justify-center transition-colors`
- `Section` / `SectionTitle` — page and panel headers
- `EmptyState` — the dashed-border placeholder (`rounded-xl border-2 border-dashed`), currently duplicated
- `Spinner` / `Skeleton` — every page invents its own loading state
- `ScoreBadge` — a 0-100 score with its colour from the token scale
- `RiskBadge` — a risk level with its colour
- `Field` / `Label` / `Input` / `Select` — form controls, currently raw
- `Modal` — `EditModal` and `EmbeddedCheckoutModal` each implement their own shell
- `Tabs` — needed for the "views of one page" pattern in `src/pages/CLAUDE.md`
- `Tooltip`
- `Table`

## How to add a primitive

1. Find every place the markup already appears (`grep` the class string).
2. Extract it here with a `variant` prop covering the cases found, and `className`
   passthrough merged with `cn()` so callers can still adjust spacing.
3. Replace the call sites you are already touching. **Do not migrate all of them in
   the same change**: it makes the diff unreviewable and Eugenio cannot tell what
   actually changed behaviour.
4. Add it to the table above.

## What does not belong here

- Anything domain-specific. `ScoreBadge` yes (a score is a UI concept with a colour
  scale); `ChallengeCard` no, that goes in `src/components/knowledge/`.
- Data fetching. Primitives take props and render.
- Anything with local storage or context. `DesignContext` handles the editable logo
  and objective images, and it is not a theming system.

## Before you change this, decide

| If you are about to... | Current shortcut | Right pattern | Cost of switching now |
|---|---|---|---|
| Use a colour in a page | 24 hex values | Add the token here, use the class | The token block is one afternoon, then free |
| Copy markup a second time | happens constantly | Lift it into a primitive | ~15 min, and it pays back on the next page |
| Add a variant to a primitive | — | Fine, that is what variants are for | — |
| Style a one-off | — | Fine. Tailwind classes in the page are OK for genuinely unique layout | — |

The last row matters: **this is not a rule against Tailwind in pages.** Layout and
spacing belong in the page. Colour, radius and repeated component shapes belong here.
