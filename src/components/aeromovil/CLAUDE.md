# Aeromóvil editor (`/aeromovil`)

The vehicle editor: a 3D viewer, a side panel of sliders per department, checks, masses, a wind tunnel and a garage of
other cars. Read the root `CLAUDE.md` first. The page is `src/pages/Aeromovil.tsx`; everything else is here.

Layout set on 2026-11-16 (refactor «ordenar», `memory/03_DECISIONS.md`). The old paths (`Visor3D.tsx`,
`geometriaTriciclo.ts`, `geometria.ts`) still export everything they did, so imports from them keep working. New code
should go to the file that owns the topic, below.

## Five vehicles, one `Parametros`

`geometria.ts` holds `Parametros`, the dispatch `crearModelo` / `calcular` / `areas`, and the Gota itself. Each vehicle
has its own field prefix and files:

| Vehicle | Prefix | Model and checks | Defaults | Side panel |
|---|---|---|---|---|
| Aeromóvil Gota | none | `geometria.ts` | `geometria.ts` `PARAMETROS_GOTA` | inline in `pages/Aeromovil.tsx` |
| Aeromóvil 1 | `…A1` | `geometriaA1.ts` | `geometria.ts` `PARAMETROS_A1` | `LadoA1.tsx` |
| Cuadriciclo Bala | `b` | `geometriaBala.ts` | `geometria.ts` `BALA_DEFECTO` | `LadoBala.tsx` |
| Triciclo family (Triciclo, clásico, rombo) | `t` | `triciclo/` | `triciclo/defecto.ts` | `LadoTriciclo.tsx` |
| Cuadriciclo Basculante | `q` | `geometriaBasculante.ts`, `basculante/` | `basculante/defecto.ts` | `basculante/LadoBasculante.tsx` |

Shared panel controls (`Deslizador`, `Selector`, `Bloque`, `Explicacion`, `ListaComprobaciones`, `fmt`, `m2`) are in
`controles.tsx`. Use them; do not write a new slider.

## `triciclo/` — the Triciclo family model (pure, no three.js; the tunnel's Web Worker loads it)

| File | What |
|---|---|
| `campos.ts` | `CamposTriciclo` (every `t…` field), wheels, departments, the slider table `FILAS`, `SELECTORES_TRICICLO`, option predicates (`conPuertas`, `esRombo`…) |
| `defecto.ts` | `TRICICLO_DEFECTO`. Leaf module: imports types only |
| `medidas.ts` | packaging and ranges: `camposTriciclo`, `rangoTriciclo`, `limitarTriciclo`, rows, battery pack, track and steering clearance, `dentroDe` |
| `ocupantes.ts` | rider body points, places, battery boxes, rear rail |
| `bascula.ts` | tilt axes and pose, how far it leans before touching |
| `modelo.ts` | `crearModeloTriciclo` (geometry from the fields) |
| `masas.ts` | parts list with masses, boots, wheel loads, `grupoPieza` |
| `comprobaciones.ts` | `calcularTriciclo`: every check and the results |
| `energia.ts` | consumption, range, solar, areas |

Inside `triciclo/`, import siblings directly (`./medidas`), never the barrel `../geometriaTriciclo`: a cycle through the
barrel would load half-built modules. Calls between siblings are fine only inside functions, never at module top level.

## `visor/` — the 3D builders (`Visor3D.tsx` keeps only the React component, scene, camera and animation loop)

| File | What |
|---|---|
| `capas.ts` | `CAPAS` (the layer menu) and `CapaId` |
| `materiales.ts` | materials, procedural textures, paint (`pintar`) |
| `primitivas.ts` | `tube`, `sphere`, `box`, `capsula`, `muelle`, `etiquetar`… |
| `ocupante.ts` | seats, the rider figure, wheels |
| `triciclo.ts` | Triciclo/Bala family: build, split into layers, steer, lean. The body itself comes from `garaje/balaModelo.ts` and `garaje/balaPiezas.ts` |
| `gota.ts`, `a1.ts` | the other two vehicles |
| `cotas.ts` | dimension lines |
| `garaje.ts` | reference velomobiles, door pivots of garage cars |
| `construir.ts` | dispatch by `modelo.tipo`, and `construirDisenoGaraje` (a saved design drawn in the garage) |

## Recipes

**A new Triciclo slider** (5 places, 4 files, none of them shared with the other vehicles):
1. the field in `CamposTriciclo` — `triciclo/campos.ts`;
2. its row in `FILAS` (same file): `[clave, dep, bloque, claveBala|null, etiqueta, min, max, paso, unidad]`.
   A text option instead goes in `SELECTORES_TRICICLO` and in the `ClaveTexto` union;
3. its default in `TRICICLO_DEFECTO` — `triciclo/defecto.ts`. **The default must reproduce today's car**, or every
   saved design changes: `npx tsx scripts/triciclo-disenos.ts` must still print «Todo OK»;
4. its explanation — `explicaciones/triciclo.ts`;
5. only if needed: how its value reads (`mostrar`) and when it shows (`visible`, `hibridoVisible`, the `fichas`
   filter) inside `LadoTriciclo` — `LadoTriciclo.tsx`.
Then use it where it acts (`triciclo/modelo.ts`, `masas.ts`, `comprobaciones.ts`, a 3D part). Read it with
`limitarTriciclo('tX', T)`, which clamps it to its range.

**A new 3D part of the Triciclo**: draw it in `visor/triciclo.ts` (`construirTriciclo`) or, if it is part of the body
or cabin shared with the garage's Bala, in `garaje/balaPiezas.ts`. Put it in a layer (`CapaId`) and give the
object a `name`: `zonaTriciclo` in `LadoTriciclo.tsx` maps a click (layer, part names, point) to the block that opens. Its mass goes
in `triciclo/masas.ts` `piezasTriciclo`, or the «Peso» list and the centre of gravity will not know it exists.

**A new check**: in `triciclo/comprobaciones.ts` `calcularTriciclo`, one call to
`c(dep, nombre, holgura, minimo, mostrar?)`: it passes when `holgura ≥ minimo`. `dep` picks the department tab that
lists it. If an explanation names it, use the same text as `C` in `explicaciones/triciclo.ts`.

**A new garage vehicle**: one file in `garaje/` exporting `VEHICULO: VehiculoGaraje` (`garaje/tipos.ts`: axes X
forward, Y up, front axle at x = 0, metres; real dimensions with a `fuente`), then add it to `COCHES` in
`garaje/index.ts`. A Cd and frontal area (`aero`) only with a cited source; without one the tunnel estimates its own.
A design saved by a user reaches the garage through `garaje/registro.ts`, not this list.

## Before you change this, decide

- **Moving vs rewriting.** The 2026-11-16 split was cut-and-paste only. Still pending, each a rewrite to verify on its
  own: the Triciclo visibility rules out of `LadoTriciclo.tsx` into `triciclo/campos.ts` next to each row (≈40 lines;
  then a new field touches no `.tsx`), the 60-case `mostrar` switch into `triciclo/` (≈70 lines), and the default
  inside each `FILAS` row (rewrites 150 rows). Logged in `memory/09_TARGET_ARCHITECTURE/02_TECH_DEBT.md`.
- **Equivalence check for a refactor.** Compare the model and results JSON of several designs between two trees
  (`crearModelo` + `calcular` + `areas` for Rombo Bala, the defaults, Bala, A1, Gota) and take headless screenshots with
  `Math.random` seeded: the GTAO pass draws random noise, so unseeded screenshots of the same code differ by ~20,000
  pixels and hide real changes.
- **Never touch the tunnel calibration** (`tunel/calibracion.ts`). `npx tsx scripts/tunel-pruebas.ts | grep -c FALLA`
  must stay at 0.
