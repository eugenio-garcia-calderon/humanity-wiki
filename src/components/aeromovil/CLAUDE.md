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
| `partes3d.ts` | which part each mesh of the body, the glass and the cabin is (`userData.componente`: `carroceria`, `cupula`, `solar`, `retrovisores`, `luces`, `asientos`, `mandos`, `salpicadero`, `acabado`…); `etiquetarPartes(G)` runs at the end of the Bala and Triciclo builds. See «Part tags» below |
| `fichaSolo.ts` | «only this part» in the viewer: layers + tagged meshes, and the box the camera frames |
| `inspeccion.ts` | what the viewer draws, as rows (`window.__am3d`) and where it lands on the screen (`window.__am3dVista`): read-only, for `scripts/robot-3d.ts` |
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
or cabin shared with the garage's Bala, in `garaje/balaPiezas.ts`. Put it in a layer (`CapaId`), give the object a `name`, and
**say which part of the vehicle it is** (below, «Part tags»): a mesh nobody names shows under «Carrocería» (body layer) or
«cabina-varios» (cabin) and under no other menu entry, and `npx tsx scripts/robot-3d.ts` will say so. Click mapping: `zonaTriciclo` in `LadoTriciclo.tsx` maps a click (layer, part names, point) to the block that opens. Its mass goes
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
(`homologando` in `pages/Aeromovil.tsx`; they stay mounted) and shows `PaginaHomologacion.tsx`, which since the afternoon of
2026-11-24 holds ONE thing: the pedal cycle's file (`epac/PaginaEpac.tsx`, below). The other homologations (`L1e-A`
bicycle-class quadricycle, heavy L6e/L7e, the three ways to approve) are a different category each and live in a drawer on
the right, `OtrasHomologaciones.tsx`; the shared drawing of a guide is `GuiaPagina.tsx` (`PaginaGuia`, `ViaDetalle`). The
written content is data in `guias.ts` (`GUIA_L1EA`, `GUIA_PESADO`, `GUIA_EPAC`, `VIAS`, `LIMITES_SERIE_CORTA`): the norm as a
table (a row with `req` shows the design's verdict from `normas.ts`), `revision` (what was checked of what Eugenio pasted:
confirmado / con matiz / no comprobado), the steps and the ways, each with expandable «qué significa y quién lo hace».
**A new homologation**: a category in `CATEGORIAS`, its requirements in `REQUISITOS`, a `Guia` in `guias.ts`, added to `GUIAS`
(it appears in the drawer by itself, except `epac`, which has its own page). L1e-A is a category of the engine (`candidatas`:
pedals and two to four legal wheels): width 1,00 m, length 4,00 m, height 2,50 m, 1 kW, 25 km/h. Not modelled yet: lights and
the rear reflector (`l1eaLuces` / `epacLuces` are «a comprobar»). The EPAC category (`EPAC`) is outside Regulation 168/2013
(art. 2.2.h) and the maker certifies it (RD 339/2014: technical file, declaration, manual, plate, production control; annex VI
for more than two wheels); its guide has `propia` instead of `vias`, plus `tramites` and `cuestiones`. `scripts/homologacion.ts`
checks every guide row points at a requirement of its category. The EN 15194 / EN 17860 texts are paid: only their catalogue
summaries were read (`leido: false`). L1e-A and EPAC have separate requirement lists (`l1eaPedales` vs `epacPedales` in
`normas.ts`): never share a requirement between them.

**The pedal cycle's file** (`homologacion/epac/`, 2026-11-24, Eugenio: «matriz de conformidad normativa… cada obligación
legal vinculada a un plano, cálculo, ensayo, inspección o documento que demuestre su cumplimiento… creo que es la clave»).
It is not an approval: the maker certifies it himself, so the page is his file and says how far along it is (0-100 %) before
the first unit can be sold. Six sections on a side menu: Resumen, Matriz de conformidad, Ensayos, Documentos legales, Archivos,
Normativa y referencia.

| File | What |
|---|---|
| `catalogo.ts` | THE MATRIX AS DATA: `OBLIGACIONES` (52, each with `peso` 3/2/1, what the law asks, where, `verificada`, `diseno` = the id of a 3D-design requirement whose verdict shows beside it, and its `huecos`: slots of type plano / cálculo / ensayo / inspección / documento; a slot with `ensayo`, `doc` or `fab` takes its state from there) and `GRUPOS_MATRIZ` |
| `ensayos.ts` | the 14 tests: instruments, preparation, proposed procedure, criterion (`criterioLegal` only where a law gives the figure), the fields to write down (`diseno` = what the 3D design says, to compare) |
| `documentos.ts` | the 11 legal documents as sections with a GENERATOR each (draft from the design, the maker's details and the state of tests and matrix); `CARPETA_LEGAL` = the eight documents of the pasted text |
| `textoAportado.ts`, `referencia.ts` | what Eugenio pasted, kept whole and split by heading; `referencia.ts` adds what was checked against the law (`contraste`) and the inspector's checklist (`INSPECCION`) |
| `tipos.ts`, `progreso.ts` | what is stored; the pure maths (states, 0-100 %, «lo que falta», `contextoDoc`). `scripts/expediente.ts` imports both in Node |
| `almacen.ts` | the client store: local value at once, saved a second after the last keystroke, one request per key with the `version` read (409 = somebody else saved: the newer value replaces it and the page says so). Nothing in `localStorage` |
| `PaginaEpac.tsx` + `Panel*.tsx`, `MatrizConformidad.tsx`, `Editor*.tsx`, `Referencia.tsx`, `Adjuntos.tsx`, `ui.tsx`, `exportar.ts` | the screens; `exportar.ts` builds the self-contained HTML of a report or document (escaped: what the engineer types is data) |

- **The server.** `src/server/aeromovilExpediente.ts`: table `aeromovil_expediente(clave, valor jsonb, version, updated_by,
  updated_at)`, `GET /api/aeromovil/expediente` and `PUT /api/aeromovil/expediente/:clave`, only the owner of the Aeromóvil
  or a level-4 role (the file holds a company's legal papers). One key per obligation (`matriz-o03`), per test
  (`ensayo-e01`), per document (`doc-d10`), plus `fabricante` and `biblioteca`; 80,000 characters per key (the biggest
  obligation, filled to the limit of its fields, is 10,426). jsonb does not keep the order of object keys, lists keep theirs:
  never rely on key order. Files go through the existing `POST /api/aeromovil/adjuntos` (public by an unguessable URL).
- **A new obligation**: one object in `OBLIGACIONES` (next free id of its group), `verificada: true` only if the law's text
  was read; slots with `ensayo`/`doc` must name a real test/document. **A new test**: one object in `ENSAYOS` and a slot with
  `ensayo` in the obligation it proves. **A new document**: one object in `DOCUMENTOS`; a generator writes `pc('qué falta')`
  where only a person can know. Then `npx tsx scripts/expediente.ts` must end «Todo OK» (ids, references, every generator
  runs, the biggest value fits the server's limit).
- **A section marked «revisada» freezes its text** (so an approved document never changes when the design's numbers do);
  «Volver al borrador automático» undoes it. A report or document with a `[por completar: …]` cannot be approved.
- **The percentages**: a slot is 1 done, 0,5 in progress; an obligation is the mean of its slots; the group and the total weigh
  each obligation by `peso`; «lo imprescindible» is the same over weight 3 only; «no aplica» leaves the count only with its
  reason written. A slot marked done by hand with no file is flagged (an inspector will ask to see it).
- **Not verified, and the page says so**: EN 15194 / EN 17860 full texts (paid), EN 17860-6, the Commission's statement of
  11-2-2025, the date and the internal-control claim of Regulation 2023/1230, the details of Regulation 2023/1542 (batteries),
  the year of manufacture on the plate (Directive 2006/42/CE annex I 1.7.3), whether the GPSR applies, the DGT and insurance
  statements. Lights and reflectors are not in the 3D design.

**Before you change this, decide**: the figures were read on 2026-11-17 mostly from legislation.gov.uk (the EU text
as of 31-1-2020) and the consolidated 44/2014 on EUR-Lex; `FUENTES[x].leido: false` marks what was cited without
rereading. Re-check against EUR-Lex consolidated texts before trusting a margin of a few kg or kW.

**And for the pedal cycle's file**: today one JSON document per key on the server (a table, two routes, versioned writes:
the file follows Eugenio to any device and Claude can read and fill it) versus a row per obligation, attempt and document
(≈ 1 day: migrations, a route per thing). The second pays the day more than one person edits at once, or an inspection asks
for who changed what and when: today a save replaces the key's value and keeps no history (tech debt, 2026-11-24). Reports
and documents are HTML built in the browser (`exportar.ts`), not PDF files on the server: printing to PDF is the browser's.

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

## `fichas/` — a record for each component of the 3D view (2026-11-24)

Eugenio: inside a department the 3D shows only that department's components (every tab but «Proyecto» opens isolated and its
button reads «Mostrar todo»); hovering a component shows a label (its number, name, weight, price, stock); clicking it (a tap
on a phone) leaves only that component in the 3D, which can be turned, and opens its whole record under the viewer.
Proven on Interior › Asientos; the rest of the departments plug in with one entry each.

| File | What |
|---|---|
| `registro.ts` | THE ONE FILE TO EXTEND: `FICHAS` (a component = department + 3D layers + its section of the mass model per vehicle kind), `fichaEn`, `fichasDe`, `numeroPorDefecto` |
| `almacen.ts` | the records on the server (internal number, characteristics, stock, alternatives, reference images, documents, notes): a client store, saved 900 ms after the last keystroke, a 409 adopts the server's copy |
| `datos.ts` | a component's weight and price, read from the design's own lists (`masasSecciones.ts`, `precios/`) |
| `usarFichas.ts` | the page's hook: which one is selected or hovered, Esc, what the viewer must show |
| `PanelFicha.tsx`, `EtiquetaFicha.tsx` | the record under the 3D (it embeds `DesglosePeso`, so parts, weight, price and supplier are the design's own) and the hover label |
| `../visor/fichaSolo.ts` | «only this component» inside the viewer (layers + meshes tagged `userData.componente`); the garage's cars and the name labels leave with it |

Server: `src/server/aeromovilFichas.ts` and the table `aeromovil_fichas` (migration 0236). One JSON document per vehicle
family (`P.disposicion`) and component `id`; everybody reads, only the owner of the page or an admin writes (`dueno` +
`puedeDecidir` of `aeromovil.ts`, imported).

**A new component** (say «Rodaje › Ruedas»), in this order:
1. append an object to `FICHAS` in `registro.ts`, inside its department's block, **never reordering or renaming**: the number
   «Rodaje 1, 2…» is the position among the entries of the same `prefijo`, and `id` is the server key. Fields: `id`
   (`'dep/name'`), `dep`, `nombre`, `prefijo`, `capas` (layers of `visor/capas.ts`), optional `componentes` (meshes tagged
   `userData.componente`: to tell the wheel from the caliper when they share a layer), `secciones` (`{ triciclo: 'rodaje|Ruedas' }`:
   the key of its section in `masasSecciones.ts`, for each vehicle kind that has it) and `queEs` (one sentence);
2. `npx tsx scripts/fichas.ts` must end «Todo OK» (it checks the layer, the section, the weight and the price in every
   vehicle it names, and that a click on its layer finds it);
3. nothing else: hover, click, number, weight, price, parts and the server record come from the entry. No change in
   `pages/Aeromovil.tsx` or in the viewer.
A sub-part of a component (a wheel's spokes, tyre, hub) is today a row of the record's «Piezas» list (the section's own
parts, with the design's weight, price and supplier); it has no record of its own yet.

**Before you change this, decide**: records keyed by vehicle family (today: the seats of «the Triciclo» are one record
whichever design is open) vs by saved design (one record per design: the same seat retyped for every variant; ≈ 1 hour to
switch, and what was typed under the family is orphaned). A record for a sub-part (its own number, supplier, images): the
store already takes any `id`, so it is an entry whose `id` is `'rodaje/ruedas/neumatico'` plus a way to click it (its own
mesh tag): ≈ 2 hours for the first one, then one entry each.

## `partes/` — every department's parts, each with its options and its star (2026-11-24)

Rodaje first (Eugenio: «en rodaje, añade las diferentes partes … que se comporte como un elemento en sí»), then, the same
day, the rest («haz lo mismo … para el resto de elemento del vehículo»). Each department of the Triciclo family that has
parts shows a row of tabs above the 3D view (`Resumen · <part> · <part>…`, Triciclo family only). Picking a part: the 3D shows
only that part (`CAPAS_DEP_TRICICLO` in `pages/Aeromovil.tsx` is overridden by `subsistema(id).capas`; «Mostrar todo» undoes
it) and a panel opens UNDER the 3D with what the project carries today (kg and € of that part), its options with a star, the
design's own numbers for it, why it matters and the decisions taken. Eugenio: «la opción favorita es la que luego muestra el
peso y el precio y lo manda arriba al proyecto … y de ahí también se sacan los planos de la opción favorita».

| Department | Parts (the registry's order) |
|---|---|
| Rodaje | Ruedas · Frenos · Dirección · Suspensión (catalogue parts) |
| Motor | Motor eléctrico · Controlador · Reductora (catalogue parts) · Motor de gasolina (catalogue part, only in the plug-in hybrid) |
| Carrocería | Carrocería · Cúpula · Paneles solares · Puertas y maletero · Retrovisores · Luces (model parts) |
| Interior | Asientos · Mando · Salpicadero · Acabado interior (model parts) |
| Batería | Batería (one part: no row of tabs) |
| Chasis | Bastidor (since 2026-11-27 it is the last part of the merged tab «Chasis y carrocería», below) |

A department with a single part has no row (`SubmenuPartes` returns null under two); its panel opens directly.

| File | What |
|---|---|
| `tipos.ts` | `IdSub` (a string), `OpcionRodaje` (id, name, kg, price, parts list, pros/cons, sources with `leido`, and for model options `decision`, `grupo`, `calculando`, `proyecto`), `ParteOpcion`, `DecisionRodaje`. Leaf module |
| `subsistemas.ts` | THE REGISTRY: `SUBSISTEMAS`, one object per part: `dep`, name, which mass-list lines are it (`piezas` regex on the line's name), which 3D layers show it (`capas`), where its options come from (`origen`), which design field holds the favourite (`campo`) or which selectors are its decisions (`selectores`), which of the model's checks speak of it (`comprobaciones` regex), `visible` (only some designs have it). `partesDe(dep, P)`, `tieneSub`, `esSub`, `NOMBRE_DEP`, `DE_DEP` |
| `opciones.ts` | the option lists: the brakes, suspension and wheels of `bici/catalogo.ts` / `ruedas/catalogo.ts` dressed as options; for the model parts `deSelectores` (one option per choice of `SELECTORES_TRICICLO`), `selectorVisible` (which choices this design offers), `opcionesDe(sub, P)`, `elegidasDe`, `favoritaDe`, `camposDeFavorita` |
| `opcionesCatalogo.ts` | the motor makers' catalogue (`catalogoTren.ts`) dressed as options: motors, controllers, reduction gears, petrol engines. Published figures say so; what the maker does not publish says «no lo publica» and is estimated by the project |
| `alternativas.ts` | `evaluar(sub, P, cambios)`: an option is TRIED on a copy of the design (`ajustarCarenado` → `crearModelo` → `calcular` → `costeProyecto`, ≈ 60–80 ms) and the part's lines are read from the result; `useEvaluaciones` does it in the background, a try at a time, 600 ms after the design stops changing; `conEvaluaciones` fills the kg, € and «what changes» of each option |
| `datosDiseno.ts` | `datosDelDiseno(sub, P, modelo, res)`: [label, value] rows with the numbers of this design for the part (power asked of the motor, the pack's litres, the tubes, a body's m², the boot's litres…), read from what the page already computes |
| `numeros.ts` | what the design says today per part (from the price list), the steering's inputs, `aguantaRueda` |
| `direccion.ts`, `geometriaDireccion.ts`, `DibujosGeometria.tsx`, `PlanoDireccion.tsx` | the steering only: 4 options, the 7 angle concepts, the Ackermann maths, the six drawings and the downloadable plan |
| `decisiones.ts` | the log (`Parametros.decisionesRodaje`, 12 per part, newest last), `anotarDecision` |
| `Opciones.tsx` | option cards + the comparison table |
| `PanelSubsistema.tsx` | `SubmenuPartes` (the tabs), `ResumenPartes` (the department's summary), `PanelSubsistema` (the panel). One generic panel for every part; the steering keeps its own extra blocks (`sub === 'direccion'`) |

- **THE FAVOURITE IS A FIELD OF THE DESIGN, not a second list.** *Catalogue parts*: the star writes the field of the part
  (`tBiciFreno`, `tBiciSusp`, `tRuedaDel`/`tRuedaTras`, `tDirOpc`, `tCatMotor`, `tCatCtrl`, `tCatReductora`, `tCatTermico`; the
  bicycle ones are in `bici/pedales.ts`, not in `FILAS`). The mass list, prices, checks and every department tab follow it with
  no new code, and the star and the old selectors are the same thing. `'medida'` (nothing starred) reproduces today's car
  exactly: `npx tsx scripts/triciclo-disenos.ts` and `scripts/bici.ts` must still end «Todo OK». *Model parts*: the options
  ARE the page's own choices (`SELECTORES_TRICICLO`: the battery's place, the tubes' material, the body's laminate, doors,
  seats, trim…); the id of an option is `clave:valor` (`tChMat:carbono`) and the star writes that field. There is nothing to
  «reproduce today's car»: the star already sits on what the design carries.
- **A model option's figures are not in a table**: they are what the model says when it is chosen (`alternativas.ts`). Until
  its try is done an option says «calculando…» and is left out of the comparison's minimum. A part that shares nothing with
  the rest of the design (one figure) would not need this; a battery that moves the centre of gravity does.
- **A part is its lines of the mass list.** `piezas` is a regex on the line's name (`Bastidor`, `Cinturones de tres puntos (2)`,
  `Interior: molduras de madera`…). `scripts/partes.ts` checks, over four designs, that no line belongs to two parts and that a
  part's lines are of its own department (`grupoPieza` in `triciclo/masas.ts`) and that a department's parts plus the lines no
  part claims add up to its mass. Those lines (`numeros.ts` `sinParteDe`: the pedals of a bicycle design, the hybrid's planetary
  gear and generator, the tilt system) are listed under the summary of a department, so its figure matches its tab; «Varios»
  (the bolt-ons, department Batería) has no summary because Batería has one part.
- Where a favourite touches the model: steering → `triciclo/masas.ts` `dimensionar` and `precios/precios.ts` `estimarBici`;
  motors, controllers, reduction gears and petrol engines were already read from `tCat…` by `catalogoTren.ts`. The petrol
  engine's price is split among its five lines by mass (`precios.ts`), because the catalogue price is for the whole engine.
- **A new option**: for a catalogue part, one object in the list of its kind (`bici/catalogo.ts`, `ruedas/catalogo.ts`,
  `catalogoTren.ts`, `direccion.ts`), with its parts if the maker publishes them, `pros`, `contras` and `fuentes` (`leido`
  is the day WE opened the page, `false` when it is only cited). For a model part, a new choice in `SELECTORES_TRICICLO`
  (and, if it only exists in some designs, a rule in `selectorVisible`). Then `npx tsx scripts/partes.ts` must end «Todo OK».
- **A new part** (a department or another piece): a row in `SUBSISTEMAS` (`piezas`, `capas`, `origen`, `campo` or `selectores`,
  `comprobaciones`), its options (catalogue: a list in `opciones.ts`' `LISTAS`, and its field in `camposDeFavorita`/`favoritaDe`;
  model: nothing else), a `case` in `datosDelDiseno` if it has numbers of its own, and a line in the script's registry check.
  The panel draws the generic sections by itself; extra ones (geometry, plan) are `sub === '…'` blocks in `PanelSubsistema.tsx`.
- **What is NOT done, and the screens say so**: the plan exists for the steering only; **a part with no mesh of its own in this design
  shows nothing and says so** (`SIN_PIEZA`: no brakes on a hub-motor wheel, no reduction gear on a hub motor, no petrol engine on
  an electric design); parts that share a 3D layer are told apart by mesh tags (`visor/partes3d.ts`), so a new mesh without a
  name lands in a catch-all tag; model options carry the page's own text and the model's figures, no new product research (no
  cell catalogue for the battery, no seat or upholstery supplier prices beyond the model's rules); a catalogue maker that
  publishes no mass leaves the model's estimate in place (`kg 0` and «calculando» → the try shows the project's figure); the
  steering's prices of the kart, reclined-trike and own-design options are ESTIMATES except the tie rods and the Gemini rack;
  the kart spindles (Magickart) and the university references were not opened.
- The 3D is not clickable per part yet: the per-component records (`fichas/`, above) only cover Interior › Asientos so far.
  Interior › Asientos therefore has two ways in (the part's tab and the record under the 3D) and they do not count the same:
  the record reads the page's section `interior|Asientos` (the seats alone), the part's regex also takes the upholstery and
  the belts (the page's «Tapicería» section), because its choices are the seats', the upholstery's and the belts'.

### Part tags and the 3D robot (2026-11-24)

Eugenio: «selecciono cúpula o paneles solares o retrovisores, no termina de funcionar bien lo que se muestra … paneles solares
pincho y no se muestran los paneles solares, o retrovisores pincho y se muestra todo el vehículo salvo la cúpula … en interior
pincho en mando, salpicadero, asientos y no cambia lo que se ve en 3D». **Root cause**: a part could only switch whole LAYERS
(`capas`); the mirrors, the solar panels, the doors, the dashboard, the wheel and the seats are a few meshes INSIDE the layers of
the body (`carenado`, `cristales`) and of the cabin (`asientos`), and the `solar` layer is empty (the panels hang in the body and
glass layers). So «Retrovisores» drew the whole skin, «Paneles solares» nothing, and the four interior parts drew one cabin.

- **Every mesh of `carenado`, `cristales` and `asientos` carries `userData.componente` = the part it is** (`PARTES_3D` in
  `visor/partes3d.ts`). Two sources: `parteDeMalla` reads the mesh's own name and its parents' (the builders already name most:
  `panel-solar`, `retrovisor-casco`, `faro-led`, `forro-puerta`, `salpicadero`…; the order of its rules is the order of
  precedence: a solar panel on the boot lid is a solar panel), and the cabin's anonymous meshes (seat posts, spokes, vents) are
  tagged while they are built: `cabina()` in `garaje/balaPiezas.ts` calls `marcar('asientos' | 'mandos' | 'salpicadero' | …)`
  after each block (it tags what was added since the last call), and `garaje/balaInterior.ts` names its cupholders and belt
  hardware. A mesh that already has a `componente` (the cooling grille, the brake discs) keeps it. `etiquetarPartes(G)` runs at
  the end of `construirTriciclo` and `construirBala`.
- **Each `Subsistema` lists the tags it shows in `componentes`**, and its `capas` must include every layer where they live
  («Acabado interior» is in `asientos` AND `carenado`: the door lining hangs on the doors). `pages/Aeromovil.tsx` `parteSolo`
  passes `{capas, componentes}` to the viewer's `fichaSolo` (a record's selection, `fichas.solo`, wins), which hides every other
  layer and every other tagged mesh, hides the garage's cars and the labels, and frames the camera on what is left
  (`cajaDeSeleccion` reads the selection itself, not the page's layers, which have not caught up in that render).
- **The riders (`ocupantes`) are in no part**: they would hide the seat, the belts and the wheel.
- **The 3D window is 30 % lower** (Eugenio: «un 30 % más estrechita, para que se vea mejor también lo que está debajo»):
  `h-[50vh]` on a desktop with the parts' row (was 72), 43vh on a phone (was 62), 39vh with a record open (was 56).
- **The robot**: `npx tsx scripts/robot-3d.ts [--url http://localhost:3000] [--diseno completo,puertas] [--dep carroceria] [--movil]`
  (the dev server up; if Playwright's browser is missing, `ROBOT_CHROMIUM=/path/to/chromium`). It opens the real page with each of
  five designs (`DISENOS`), goes to every department, clicks every part of its row and reads `window.__am3d()` (what is drawn:
  `visor/inspeccion.ts`) and `window.__am3dVista()` (where it lands on the screen). Per part: it draws something, or the page
  says why not; every piece of the part is drawn and nothing else (`ESPERA`: what each part is, written apart from the tags, by the
  builders' own names); it is on the screen and big enough; no two parts of a department draw the same; the 3D window is at most
  52 % of the screen's height and the part's panel starts on the first screen. Before the fix it reported 17 failures in
  Carrocería and Interior of the full design (Retrovisores drew the same 122 meshes as Carrocería; Mando, Salpicadero and
  Asientos the same 138). It must end «Todo OK»: run it after touching a builder, `SUBSISTEMAS`, `partes3d.ts` or `parteSolo`.
- **A new mesh in the body or the cabin**: name it (`malla(geo, mat, 'nombre')`) and, if its name is not already a rule of
  `parteDeMalla`, add the rule; in `cabina()`, put it inside a block that ends with `marcar(...)`. Without that it shows only
  under «Carrocería» (body layers) or under no part (cabin) and the robot says «se ve lo que no es suyo».

**Before you change this, decide**: the favourite as a design field (today: zero server code, the model already reads it, a
star can be undone by pressing another) versus a table of studies per part with their own history and several favourites per
scenario (≈ 1.5 days: migration, route, store, and every reader of the mass list reading it instead of the field). Worth it the
day two people argue over which option is the favourite, or a favourite must differ per vehicle variant. The decisions log is
in the design (12 per part): it travels with copies, and is lost if a design is deleted. And: an option tried on a copy of the
design (today: exact, ≈ 70 ms each, 16–19 options on the busiest parts ≈ 1.2 s in the background) versus precomputed tables
(instant, but a second source that drifts the day someone changes a mass rule): keep tries until a part has ≈ 60 options.

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

## `compras/` — the purchasing department («Compras», 2026-11-27)

A whole-page tab like «Homologación» (`comprando` / `paginaEntera` in `pages/Aeromovil.tsx`), last among the department tabs
of the Aeromóvil 1 and of every vehicle with departments. First and only purchase so far: the body shell, the bottleneck.

| File | What |
|---|---|
| `tipos.ts` | `OpcionCompra`, `CategoriaCompra`, `Via` (comprar / adaptar / a-medida / referencia) |
| `carenado.ts` | THE CATALOGUE AS DATA: `OPCIONES_CARENADO` (139 on 2026-11-27), `RECOMENDACION` (the green box), `CATEGORIAS`, `VIAS`, `FECHA_BUSQUEDA` |
| `PaginaCompras.tsx` | the page: ranking (`puntuacion`), filters, a card per option that opens its detail |
| `marcas.ts` | the owner's marks per option id: favourite, removed, his own stars (`estrellasDe`). ONE key, `compras-carenado`, of the private file on the server (`aeromovil_expediente`, through `homologacion/epac/almacen.ts`): versioned, owner-only, no localStorage. Visitors see the catalogue without marks |

- **A new option**: one object in `OPCIONES_CARENADO`, unique `id`, the price exactly as the page shows it (or «a consultar» and
  an `estimacion` that says it is one), `verificado` = «sí, página abierta el …» only if the page was opened, else «no: …».
  Something made to our design (`via: 'a-medida'`) gets at most 4 stars: the shape is ours, but nobody has seen theirs yet.
  Then `npx tsx scripts/compras.ts` must end «Todo OK».
- **A new purchase** (seats, wheels…): a second catalogue file of the same shape and a selector at the top of the page.
- **Marks (2026-11-27)**: favourites always go first in any order; a removed option leaves the list and the counts and comes back
  from «Ver eliminadas»; his stars (blue) replace the catalogue's (yellow) in the score and in «Parecido mínimo». A mark is keyed by
  the option's `id`: **never rename an id**, or its marks are orphaned.
- **Public page**: no personal budgets or figures of Eugenio's in the texts.

## «Chasis y carrocería» — one tab, two departments (2026-11-27)

Eugenio: «fusionen esas dos partes del menú, chasis y carrocería… ponlas en un mismo link y vamos a trabajar como si fuesen una
cosa sola». Only the TABS merged: `carroceria` and `chasis` are still two departments everywhere else (`FILAS`, selectors, mass
sections, `grupoPieza`, checks, `SUBSISTEMAS`, prices, labour, the A1's `Departamento` objects). `partes/subsistemas.ts`:
`DEPS_DE_PESTANA` (`carroceria` → `['carroceria', 'chasis']`), `depsDePestana`, `pestanaDe`, `partesDePestana`, `PESTANAS_CON_PARTES`;
`NOMBRE_DEP.carroceria` is the tab's name. In `pages/Aeromovil.tsx`: `depTri` maps `chasis` to `carroceria` and an effect does the
same for the A1, so any way of reaching «chasis» lands on the merged tab; `lemaTab` / `unirTab` give the tab both one-liners and the
sum of kg and €; `CAPAS_DEP*.carroceria` include the frame's layer; the side panel is `LadoTriciclo` / `LadoBasculante` / `LadoA1`
rendered once per department, with `unido` on the first two (the frame's half has no vehicle summary; «Comprobaciones de la
carrocería / del chasis»). **A new block of the frame**: its row with `dep: 'chasis'` as before; it shows in the merged tab by itself.
`scripts/robot-3d.ts` walks tabs (`PESTANAS_CON_PARTES`; `--dep chasis` means the merged tab).

## `materiales/` — «Materiales y estructura» (2026-11-27)

Under the 3D of «Chasis y carrocería» on every vehicle with tabs, lazy-loaded (recharts). Which fibre where (carbon, glass, aramid,
flax, against aluminium and steel), and a full-composite chassis against a metal + fibre hybrid, by weight, safety and cost.

| File | What |
|---|---|
| `datos.ts` | THE SECTION AS DATA: `MATERIALES` (laminate E and density, fibre fraction, €/kg, crush energy, CO₂, how it breaks, where to use and not), `RESINA`, `panelIgual` (a panel as stiff as `PANEL_REF`: 2 mm of glass), `ZONAS`, `ARQUITECTURAS` (mass, prototype cost, hours, 1–5 marks on `CRITERIOS`), `PRESETS`, `puntuacion`, `RECOMENDACION`, `SEGURIDAD`, `UNIONES`, `FUENTES` |
| `PanelMateriales.tsx` | the drawing: recommendation, weight-vs-cost scatter (★ = best with the priorities), priority picker + score bars, architectures table, four small bar charts, fibre cards, zones table, safety, joints, sources |

- Every figure is a range plus the middle the charts use; prices are small-quantity estimates; `FUENTES` are search-engine titles
  (`leida: false`). Say so on the page; never present them as a datasheet or a quote.
- **A new material or architecture**: one object in its list; the marks must agree with the masses and costs (a lighter one never
  has a worse «Peso» mark). Then `npx tsx scripts/materiales.ts` must end «Todo OK».
- Chart colours: fibres `--color-blue-600`, metals `--color-orange-600` (validated as a pair with the dataviz validator).

## `proyectos.ts` — three projects: bicycle, car, aircraft (2026-11-27)

Eugenio: «en el menú superior izquierdo, te deje elegir entre 3 tipos de vehículos … cada uno con su homologación, sus costes,
sus planes, su estrategia». A project is a LENS on the one editor, not a second editor. `PROYECTOS`: `estrella` (the design that
opens when the project is picked: −19 the bicycle proposal, 19 «Vehiculo de producción», 17 «Aeromovil Alado»), `garaje` (reference
ids of `garaje/index.ts`), `homologacion` (`epac` / `pesado` / `avion`), `estrategia` (a root of `estrategia/arbol.ts`).
- **Which project a design is in**: `proyectoDeDiseno(d)`: `parametros.proyecto` (written by «Guardar como nuevo» since 2026-11-27),
  else the star's, else bicycle parts or the Gota → bicycle, wings in the name → aircraft, the rest → car.
- **In the page** (`pages/Aeromovil.tsx`): state `proyecto` (`?proyecto=`, then `localStorage['aeromovil.proyecto']`, then the open
  design's); `abrirDiseno` moves it to the design's project; `elegirProyecto` opens the star through `eleccion.elegir` (unsaved
  changes ask first; the project changes only when the design opens). The garage's references and saved designs are filtered by it
  (`useDisenosGaraje({ proyecto })`); a project opened for the first time in a browser shows all its references (except the car's,
  which is the old garage). `MenuDisenos` takes `proyecto`/`alProyecto`; `PaginaHomologacion` takes `proyecto`
  (`homologacion/PaginasProyecto.tsx` for car and aircraft); `VistaEstrategia` takes `proyecto` and shows that tree only.
- **A new reference vehicle**: add its id to the `garaje` of every project it belongs to; `npx tsx scripts/proyectos.ts` fails on a
  vehicle in no project, an unknown id, a missing strategy root or a star placed in another project. Must end «Todo OK».
- **Aircraft homologation** (`homologacion/avion.ts`): data only, every figure «por confirmar» (sources seen by title); the editor
  checks mass only (no wings yet). **Still shared by the three**: Tareas, Plan, Componentes, Planos, Compras.
