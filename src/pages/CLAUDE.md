# Pages

34 route components. This is where most of the work happens, so this is the file
that matters most.

Read the root `CLAUDE.md` first for the decision protocol and the hard rules.

## Anatomy of a page

```tsx
export default function Challenges() {
  const { challenges, loading } = useData();       // 1. data from the context
  const [filter, setFilter] = useState('all');      // 2. local UI state only
  if (loading) return <Spinner />;                  // 3. loading state, always
  return (
    <Card>                                          // 4. primitives from ui/
      ...
    </Card>
  );
}
```

Then register it in two places, both by hand:

1. `src/App.tsx` — the `<Route>`, inside the `<Layout />` route.
2. `src/components/layout/Layout.tsx` — the nav entry, if it belongs in the menu.
   The nav is **hardcoded JSX** around lines 72-106, not a data-driven array. Copy
   an existing `<Link>` and keep the same `cn(...)` active-state pattern.

> The hardcoded nav is known debt. If you find yourself adding a fourth or fifth
> entry, that is the moment to propose turning it into an array of
> `{ to, label, icon, match }`. Say what it costs and let Eugenio choose.

## Where data comes from

**Never `fetch` directly in a page.** Read from the context:

```tsx
const { territories, objectives, challenges, solutions,
        projects, organizations, causes, indicators,
        loading, refetchData, saveEntity, deleteEntity } = useData();
```

`DataContext` loads those eight collections once on boot and shares them. A page
that fetches on its own duplicates a request that already happened, and its data
goes stale when something is edited elsewhere.

If you need something the context does not expose, **add it to the context**, do not
add a `fetch` to the page. See `src/contexts/CLAUDE.md`.

Legitimate exception: an endpoint that only one page uses, is parameterised by the
URL, and would be pointless to preload. `/api/explorer/:level/:id` on the map is the
canonical example. If you take the exception, say so in a comment on the line.

Current state, measured 2026-08-06: `Universo.tsx` has 3 raw fetches, `Mapas.tsx`
and `RetoVistas.tsx` one each. None of them are the legitimate exception.

## Styling

Use the primitives in `src/components/ui/`. Never a bare `<button>`, never a hex
colour. Full rules in `src/components/ui/CLAUDE.md`.

Measured 2026-08-06: **117 bare `<button>` elements and 24 hex colours** across the
project. `Universo.tsx` alone introduced 15 hex values. `ui/core.tsx` exports 3
primitives and only 10 of 34 pages import them.

This is the single cheapest thing to fix in the whole repo and it gets worse with
every page.

## When a new visualisation deserves its own page

This is the decision that has cost the most churn. Three "Universo" pages were built
and two were deleted (`c1bf725`).

**It deserves its own page when** it has its own URL worth sharing, its own data
shape, and someone would arrive at it directly.

**It should be a view of an existing page when** it shows the same data in a
different shape. Then it is a mode with a tab and a URL parameter, not a new file:

```
/retos/:id?vista=arbol        good: one page, several views
/retos-vistas/:id             a separate page for what is a view of a challenge
```

**It is an experiment when** you are not sure yet. Then say so out loud, build it as
a view with a parameter, and agree when the decision gets made. Building `Universo`,
`Universo2` and `Universo3` as three pages meant three routes, three nav entries and
three files to delete. As three values of one `?modo=` parameter it would have been
one file and one deletion.

Before creating a page, ask: **is this a new place, or a new way of looking at a
place that already exists?**

## Heavy visualisations

Map, graph canvas and universe pages are the heaviest thing in the bundle
(3.17 MB single chunk today). When you create or touch one:

- Load the heavy library with a dynamic `import()` so the landing page does not pay
  for Mapbox and React Flow.
- Keep canvas state inside the component. Do not lift camera position, zoom or node
  layout into a global context: it forces every page to re-render.
- `src/main.tsx` deliberately does **not** use `StrictMode`, because its double mount
  breaks React Flow 12's panZoom. Do not add it back.

## Before you change this, decide

| If you are about to... | Current shortcut | Right pattern | Cost of switching now |
|---|---|---|---|
| Fetch data in the page | 4 pages already do it | Add the field to `DataContext` | ~10 min per field |
| Write a colour | 24 hex values already | Token in `index.css` + Tailwind class | One afternoon for all of them, then free |
| Write a `<button>` | 117 already | `<Button variant="...">` from `ui/core` | ~2 min per button |
| Create a page for a new view | `Universo` I/II/III, `RetoVistas` | A `?view=` parameter on the existing page | Cheaper now than after the nav entry exists |
| Add a nav entry | Hardcoded JSX, 3 entries | Array of nav items in `Layout.tsx` | ~20 min, worth it at the 4th entry |

Log whatever gets postponed in `memory/09_TARGET_ARCHITECTURE/02_TECH_DEBT.md`.
