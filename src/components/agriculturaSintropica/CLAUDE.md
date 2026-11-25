# Agricultura sintrópica

The designer and simulator at `/agricultura-sintropica` (page: `src/pages/AgriculturaSintropica.tsx`).
Also shown on luzhumanidad.com through `APLICACIONES` in `SubpaginaSitio.tsx` (migration 0241).

| File | What it holds |
|---|---|
| `especies.ts` | The reference database of species. One row per species, orientative values |
| `disenos.ts` | The four geometries (a module with numbered positions) and the default consortium of each key species |
| `modelo.ts` | Pure functions: plot layout, size of a plant at year t, the 30-year indicators, the advisor, the steps |
| `Escena3D.tsx` | R3F scene: two InstancedMeshes (crowns, trunks); only matrices change with the year |
| `EditorModulo.tsx` | The module from above, draggable, with its neighbours faded |
| `PanelPatron.tsx` | The «Patrón» tab: every tool that edits the base pattern (templates, size, spacing, ring, symmetry, snapping, typed positions) |
| `exportar.ts` | SVG plan, module sheet with distances, DXF R12, planting CSV, nursery list |
| `FichaEspecie.tsx`, `Grafica.tsx`, `Proyecto.tsx` | Species card, small line chart, the explanatory tab |

Positions: `huecosBase(p)` is what is drawn and stored; `huecosDe(p)` is what is planted (spacing factor applied). Edit the first, display the second; `aBase` converts a dragged position back.

## Before you change this, decide

| If you are about to... | Know that |
|---|---|
| Add a species | One `e(...)` line in `especies.ts`. Check its zones and `mm` against the default zone (Meseta sur, 400 mm), or the advisor will flag the default designs |
| Add a geometry | One entry in `DISENOS` plus its consortium. Run the four key species through `consejos()` and keep the defaults free of «demasiado juntos» |
| Change the yield model | The key's gain is a labelled hypothesis (`hipAgua`, `hipN`, `hipMicro`). Do not present a number from this model as measured |
| Store designs on the server | That is a new write route: `requireLevel`, and a decision for Eugenio (see `memory/03_DECISIONS.md`) |
