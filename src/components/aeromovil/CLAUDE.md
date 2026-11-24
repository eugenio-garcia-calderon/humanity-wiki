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
| `masas.ts` | parts list with masses, boots, wheel loads, `grupoPieza` (the section of each part: `../masasSecciones.ts`) |
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

**A new rule of the aerodynamic study** («Carrocería › Aerodinámica › Hacer estudio aerodinámico», 2026-11-17).
The study lives in `estudio/`: `reglas.ts` (the catalogue `REGLAS`), `estudio.ts` (runs the tunnel on the design and on
a copy per proposed change, keeps the best, reruns the checks) and `EstudioAerodinamico.tsx` (the block). One rule is one
object in `REGLAS`:
1. `id`, `zona` (cola, morro, cupula, tamano, bajos, ruedas, detalles), `vehiculos` (`gota`, `a1`, `bala`, `triciclo`,
   `basculante`) and `claves`: every slider or option it may move. **A key belongs to one rule only**: that is what
   keeps two pieces of advice from pulling one slider in opposite directions (`scripts/estudio-aerodinamico.ts`
   fails otherwise). A second weak point on the same slider goes inside the same rule.
2. `evaluar(cx)` returns `null` when the weak point is not there, or `{ titulo, gravedad, porQue, recomendacion, … }`.
   `cx` has the parameters `P`, the model, the checks (`res`), the tunnel result `base` (Cd, area, CdA, the breakdown
   `base.q.cd`, separation `despegue(base)`, slenderness `esbeltez(base)`) and `ficha(k)` (label, place, range).
3. What the tunnel can see (the body's silhouette, its section, which wheels are inside): give `pruebas` with
   `mover(cx, k, delta)`, `poner(cx, k, valor)` or `ambos(cx, k, paso)` (null at the slider's end, so never a change
   that changes nothing). The study computes each one and recommends only a gain of at least `RUIDO` (1 % of CdA);
   otherwise the finding goes to «Probado y descartado». What it cannot see (mirrors, the pods' shape, a spat): add
   `estimacion: { dCdA, fuente }` with the source of the figure, and mark the `pruebas` `tunel: false`.
4. `porQue` is one sentence in plain Spanish with this design's number; cite the general knowledge (Hucho, Hoerner…).
Then `npx tsx scripts/estudio-aerodinamico.ts [diseño.json]` prints every design's findings and must end «Todo OK».
The study only reads the tunnel: never change `tunel/calibracion.ts` or `tunel/arrastre.ts` constants for it.

**The weight of a section** («desplegable», 2026-11-17). Every side-panel block that maps to mass shows it in its
header («Cúpula · 4,8 kg») and, inside, what it is made of. One helper, `masasSecciones.ts`, from the same parts list as
«Peso: todos los componentes» and the department tabs (`PesosDepartamento.ts`) — never a second total:
1. a new part of the parts list goes to a section by its name: add or widen a rule in `seccionesTriciclo` (or
   `seccionesBasculante`, `seccionesA1`, `seccionesGota`): `[dep, bloque, /^Nombre/]`. A part no rule takes lands in
   `sinSeccion` and is listed in the department's first block («Sin desplegable propio: …»), so it is never lost;
2. a block whose sliders set other sections' masses («Masas», «Material y espesores») goes in the second list
   (`ajusta`): its header reads «ajusta 62,0 kg» and it does not count in the sums;
3. show it: `<Bloque … peso={textoPesoSeccion(pesoSeccion(pesos, dep, bloque))}>` and, inside,
   `<DesglosePeso s={pesoSeccion(pesos, dep, bloque)} />` (`PesoSeccion.tsx`). A section with no mass shows nothing;
4. a lump split into pieces (the body's laminate by zone, the frame into tube groups and joints) must add up to the
   part exactly: give the remainder to the last piece. Then `npx tsx scripts/pesos-secciones.ts [diseño.json]` must
   end «Todo OK»: sections + «sin desplegable» = each department tab = the empty vehicle, every split = its part.
The frame's joints are the parts list's own figure (the part minus its tubes); how they split into bolts, brackets and
gussets is an estimate by count (`Fijaciones`), scaled down with a warning when the count would weigh more.
The engine blocks (dep `propulsion`) are computed but not shown yet (`sinPeso` in `LadoTriciclo.tsx`).

## Before you change this, decide

- **Moving vs rewriting.** The 2026-11-16 split was cut-and-paste only. Still pending, each a rewrite to verify on its
  own: the Triciclo visibility rules out of `LadoTriciclo.tsx` into `triciclo/campos.ts` next to each row (≈40 lines;
  then a new field touches no `.tsx`), the 60-case `mostrar` switch into `triciclo/` (≈70 lines), and the default
  inside each `FILAS` row (rewrites 150 rows). Logged in `memory/09_TARGET_ARCHITECTURE/02_TECH_DEBT.md`.
- **Equivalence check for a refactor.** Compare the model and results JSON of several designs between two trees
  (`crearModelo` + `calcular` + `areas` for Rombo Bala, the defaults, Bala, A1, Gota) and take headless screenshots with
  `Math.random` seeded: the GTAO pass draws random noise, so unseeded screenshots of the same code differ by ~20,000
  pixels and hide real changes.
- **The study's rules as code vs as data.** Today a rule is a function (its condition and its sentences need this
  design's numbers). A table of rules in JSON that Eugenio could edit would need a small expression language for the
  conditions: ≈ 1 day now, more once there are 50 rules. Until someone other than an agent writes rules, keep code.
- **Never touch the tunnel calibration** (`tunel/calibracion.ts`). `npx tsx scripts/tunel-pruebas.ts | grep -c FALLA`
  must stay at 0.

## `homologacion/` — the homologation pre-check («Homologación» tab, 2026-11-17)

The design against the EU type-approval rules for L-category vehicles (Reglamento 168/2013 and its delegated acts
3/2014, 44/2014, 134/2014) and M1 above them. An orientative pre-check, never a legal approval: the panel says so.

| File | What |
|---|---|
| `normas.ts` | THE RULES AS DATA: `FUENTES` (every legal text with its URL and whether it was read), `CATEGORIAS` (EPAC, L3e, L2e, L5e-A, L6e-A, L6e-BP, L7e-CP, L7e-A2, L7e-A1, M1, cheapest first) and `REQUISITOS` |
| `ficha.ts` | `fichaHomologacion(P, modelo, res, cd)`: the design's own numbers (mass in running order = «Peso» minus the traction battery, continuous power = the Motor tab's nominal kW, top speed = the Motor tab's energy calc with the tunnel's Cd, size, seats, wheels, turning radius, wheel loads) for each of the five vehicles |
| `evaluar.ts` | `evaluarCategoria` (one result per requirement: cumple / no / condicion = fixable with a limiter / comprobar), `elegirCategoria` (the category it falls in), `fraseMargen`, `fallosHomologacion` |
| `PanelHomologacion.tsx` | the panel under the 3D view and `ResumenHomologacion`, the side card |

**A new requirement**: one object in `REQUISITOS` with `id`, `grupo`, `titulo`, `detalle` (the rule in full, plain
Spanish), `ref` (article/annex/point), `fuente` (a key of `FUENTES`), `categorias`, and one of:
- `medida: { magnitud, limite: { 'L7e-CP': 450, … }, sentido: 'max' | 'min' | 'igual', limitable?, decide? }` — a
  number of the ficha against a limit per category; a listed category with no entry in `limite` reads «sin límite».
  `limitable` (a sentence: how a limiter fixes it) turns a failure into «se arregla limitando»; `decide` makes a failure
  rule the category out of the automatic choice;
- `comprobar(f, cat)` → `{ estado, texto }` or null (the model cannot tell);
- `queHaceFalta`: what would be needed to check it (shown when it is «no se puede comprobar»).
A new number the model knows goes in `FichaHomologacion`/`VistaFicha` (and in `Magnitud` + `UNIDAD` if a `medida` reads it).

**A new category**: one entry in `CATEGORIAS` (in climbing order), then add its id to the `categorias` and `limite`
of every requirement that applies. `npx tsx scripts/homologacion.ts [diseño.json]` checks the catalogue (unique ids,
known sources, no limit for an unlisted category, every category with requirements), prints each design's category,
what fails and the margins, and must end «Todo OK».

**The whole-page «Homologación»** (2026-11-24). Picking the tab hides the garage, the 3D view and the side panel
(`homologando` in `pages/Aeromovil.tsx`; they stay mounted) and shows `PaginaHomologacion.tsx`: one card per homologation
(`L1e-A` bicycle-class quadricycle, heavy L6e/L7e) and one for the three ways to approve. The written content is data in
`guias.ts` (`GUIA_L1EA`, `GUIA_PESADO`, `VIAS`, `LIMITES_SERIE_CORTA`): the norm as a table (a row with `req` shows the
design's verdict from `normas.ts`), `revision` (what was checked of what Eugenio pasted: confirmado / con matiz / no
comprobado), the steps and the ways, each with expandable «qué significa y quién lo hace». **A new homologation**: a
category in `CATEGORIAS`, its requirements in `REQUISITOS`, a `Guia` in `guias.ts`, added to `GUIAS`. L1e-A is a category
of the engine (`candidatas`: pedals and two to four legal wheels): width 1,00 m, length 4,00 m, height 2,50 m, 1 kW, 25 km/h.
Not modelled yet: lights and the rear reflector (`l1eaLuces` is «a comprobar»).

**Before you change this, decide**: the figures were read on 2026-11-17 mostly from legislation.gov.uk (the EU text
as of 31-1-2020) and the consolidated 44/2014 on EUR-Lex; `FUENTES[x].leido: false` marks what was cited without
rereading. Re-check against EUR-Lex consolidated texts before trusting a margin of a few kg or kW.

## `precios/` — prices and labour (2026-11-17)

The price of every part rides on the mass sections (`masasSecciones.ts`): `precios.ts` gives each part a price by its
name — the catalogue's published price when the design picked a priced part (`catalogoTren.ts`), otherwise an estimate
from a rule in `estimar` (per kg of laminate, m², kWh, kW, or per unit), always with its reason in `como`. The user's
own price is `P.precios[nombre]`; labour is `manoObra.ts` (`P.manoObra[id]`: hours × €/h); `coste.ts` adds them up for
«Proyecto › Coste del prototipo» (`BloqueCoste.tsx`) and the «Mano de obra» tab (`PanelManoObra.tsx`, a tab id like
«Masas», not a `Departamento`). In the Triciclo panel a section's header reads «4,8 kg · 550 €» (`textoPesoPrecio`) and
`DesglosePeso` takes `precios={{ s: precioSeccion(…), alCambiar }}`: each price is a link that opens the editor
(`EditorPrecio.tsx`). **A new part** needs no price code if the fallback (20 €/kg) is fair; otherwise one rule in
`estimar`, before the fallbacks. Then `npx tsx scripts/precios-secciones.ts [diseño.json]` must end «Todo OK».
Renaming a part drops its saved user price (the name is the key).

**The user's own weight of a part** (2026-11-24). Beside the price, the weight on each line of «De qué está hecho este peso» is a link that opens a slider and a number box (`precios/EditorPeso.tsx`, `PesoSeccion.tsx` `Parte`). It is stored in the design as `P.pesos[nombre]` (kg, by the part's name, like `P.precios`) and applied once, in `triciclo/comprobaciones.ts` `calcularTriciclo`, right after the parts list is built (the tilt system is still sized on the estimates): the parts of that name are scaled to the figure, so the totals, the centre of gravity, the wheel loads, the sections, the department tabs and the per-kg prices all follow. `res.triciclo.pesosBase` keeps the estimates (for «Volver al estimado»). Only the Triciclo family and only the top-level parts (not a frame's tubes or the laminate's zones; a frame set lighter than its tubes scales them down so the pieces still add up). `scripts/pesos-secciones.ts` runs every part ×0.5 and ×2.
## Power electronics («Motor › Electrónica de potencia», 2026-11-17) and the L7e study

- `triciclo/electronica.ts` (pure): from the `tEp…` fields, the driving modes and, per mode, the engine's net power, the
  e-motor's continuous and peak, and the drive's continuous and peak totals; the strongest mode is what homologation
  counts (134/2014 annex X app. 2.4). `energia.ts` drives the electric speeds/acceleration with its limited power and
  adds `vmaxConjunta`; `homologacion/ficha.ts` takes `potenciaCategoria = contTotal`. **Defaults change nothing** (0 =
  no limit, «libre», no sport, «normal» map, start at 10 % SOC = USABLE): keep it so.
- `electronica/BloqueElectronica.tsx` draws the block with its own grouped sliders; `LadoTriciclo` leaves the block
  `BLOQUE_ELECTRONICA` out of its generic list. A new `tEp…` field: campos.ts row/selector + default + explanation + one
  line in the block.
- `homologacion/l7e.ts` + `EstudioL7e.tsx`: the L7e-A2 OK / No OK / A comprobar points (901/2014 fields 1.8.3–1.8.9,
  modes, two limiters, tampering), the scenarios table, and the tests (`ensayosL7e`, one tab each, all «pendiente»).
  `scripts/homologacion.ts` prints them and checks the study's numbers (28 / 45 / 15 kW).

## `bici/` — bicycle components and the driver's chainless pedals (2026-11-24)

A Triciclo-family design is built from one of two classes of parts: `tClase: 'pesado'` (moped, motorcycle and car parts:
the default, and every design saved before) or `'bici'` (cargo-bicycle wheels, bicycle brakes and shocks, thin tube, small
hub motors, an e-bike battery). The class changes three things only (`bici/clase.ts`): the range and step of the sliders
whose heavy range starts above any bicycle part (`RANGOS_BICI`, read by `triciclo/medidas.ts` `rangoTriciclo` /
`pasoTriciclo`), how the running gear is sized for its load, and the equipment's standing draw.

| File | What |
|---|---|
| `bici/clase.ts` | `esBici`, `RANGOS_BICI`, the sizing rules, `VALORES_BICI` (what «pasar a bicicleta» sets). Leaf module |
| `bici/catalogo.ts` | bicycle brakes, shocks and pedal generators, each with mass, PRICE and source, published or estimated, said either way; `precioRuedaBici` |
| `bici/pedales.ts` | the optional fields (`tBiciFreno`, `tBiciSusp`, `tPed…`: not in `FILAS`, as the cooling's), `pedalesDe` (where the crank axle goes and the room of feet and knees all the way round), the pedals' part, `pedaleo` (what the legs change), `comprobacionesBici` |
| `BiciTriciclo.tsx` | the two blocks: «Rodaje › Componentes de bicicleta» and «Motor › Pedales» |
| `visor/bici.ts` | generator, cranks and pedals in 3D (layer «Motor», `componente: 'pedales'`) |
| `triciclo/propuestaBici.ts` | the built-in design «Vehículo de producción (bicicleta)»: saved design 19 as read on 2026-11-24 + the bicycle values |

- **The mark.** Catalogue options carry `clase: 'bici' | 'pesado'`: wheels (`ruedas/catalogo.ts` `claseRueda`: the
  wheel's `perfil`), motors and controllers (`catalogoTren.ts` `clase`, absent = heavy). `controles.tsx` `Selector`
  groups them («De bicicleta» / «De vehículo pesado») and shows `MarcaClase` next to the chosen one.
- **A new bicycle part**: one object in the list of its kind with `kg`, `masa` (what of it is published), `precio`
  (`tipo: 'publicado'` only with the shop's page in `fuente`), `nota`, `fuente`. A new bicycle wheel also needs its
  entry in `PRECIO_RUEDA_BICI`. Prices reach the panel through `precios/precios.ts` `estimarBici`, which runs before
  the heavy-vehicle rules.
- **Pedalling is chainless, always**: the legs' watts times the generator's efficiency join the battery's bus. No maker
  publishes that efficiency; 82 % is an estimate and the panel says so.
- `npx tsx scripts/bici.ts` checks the catalogue and the built-in design and prints its parts with mass and price, its
  red checks and its pedalling; it must end «Todo OK».

**Before you change this, decide**: the built-in bicycle design is a COPY of design 19's numbers taken on one day, not a
view of it (the same choice as «Aeromóvil BWB»). A button «versión de bicicleta» that applies `VALORES_BICI` to whatever
design is open already exists in effect (the class selector); a live link to design 19 would need the proposals to be
computed from the fetched list (≈ 1 hour) and would change under Eugenio's feet when he edits the original.

## `estrategia/` — the strategy tree («Estrategia», `/aeromovil/estrategia`, 2026-11-19)

Eugenio and Claude work out, as a branching tree, how to get from today to a factory. Milestone 1 (one road-legal
vehicle in Spain) is the only one developed in depth; the rest is sketched on purpose.

| File | What |
|---|---|
| `arbol.ts` | THE TREE AS DATA: `ARBOL` (goal, milestones, decisions, options, assumptions), `fallosArbol()` |
| `almacen.ts` | Eugenio's marks (sí / no / dudo), notes and answers — `localStorage` only, never the server |
| `VistaEstrategia.tsx` | the drawing (boxes left to right, a parent on its first child's row), the detail card, the questions list |

**More than one strategy (2026-11-24).** `ESTRATEGIAS` in `arbol.ts` lists the trees: each has its own root
(`padre: null`), the boxes open on a first visit and the box chosen when its button is pressed. The second,
«Cuadriciclo estilo bicicleta», is `arbolBici.ts` (ids `b-…`). The tree on screen is the one the chosen box belongs to
(`raizDe`). A third strategy: a new file with its nodes, spread into `ARBOL`, and one entry in `ESTRATEGIAS`.

**A new node or an answer from Eugenio**: edit `arbol.ts`. `comprobado: 'leido'` only when the source in `fuentes` was
read and says it; otherwise `'por-confirmar'`. A question for him goes in `preguntas` of the node that needs it. When he
answers (in chat, or pasting «Copiar mis respuestas»), move the answer into the node's text and drop the question.
Then `fallosArbol()` must return `[]`.

**Reading his marks.** They are in `localStorage` (`aeromovil.estrategia.v1`) of the browser he used. When the Chrome
extension is connected, open `humanity.wiki/aeromovil/estrategia` in a new tab, read that key, close the tab; otherwise
ask him to paste «Copiar mis respuestas». A door carries `descarta` (what would close it) and its steps as child nodes
of `tipo: 'paso'`, numbered in the title.

**The page is public.** No personal figures (savings, limits, family, friends' names) in `arbol.ts`: write «tope
fijado», not the amount. That is also why his answers stay in his browser.

**Before you change this, decide**: marks in `localStorage` (today: private, zero server code, but one device only and
Claude cannot read them) vs a per-account table (≈ half a day: migration, an owner-only route, a store like
`notas/almacen.ts`). Worth it the day he uses two devices or wants Claude to read his marks without pasting.
