# Accepted technical debt

> **What this is**: the list of things we know are wrong and have decided to leave
> alone for now. Every line is a decision, not an oversight.
>
> **How to use it**: when something can be done fast or done right and fast wins, log
> it here with its future cost. When it gets fixed, move it to "Resolved" with the
> date. Never delete an entry.
>
> This replaces a migration plan: a plan expires, this list does not.

Seeded on 2026-08-06 from the audit. **None of these have been decided by Eugenio
yet.** They are here so the decision can be explicit.

---

## Urgent: active risk, not debt

### Google API key exposed in the public repository — needs an action in Google Cloud
- **What**: `firebase-applet-config.json` carried the API key and OAuth client id of the Google project `inteligencia-colectiva-489419`. It arrived with the AI Studio scaffold in the initial commit (2026-08-01) and **nothing in the app ever imported it**. The file was removed on 2026-08-06.
- **Why deleting the file is not the fix**: this repository is **public**, and the key was readable for five days. It remains in the git history. Bots that scrape GitHub for keys will already have it.
- **Severity, honestly**: Firebase web API keys are designed to be public and identify a project rather than authorise access, so by itself this is low severity. The real risk is if the key is **unrestricted**, because then it reaches any other Google API enabled on that project. `metadata.json` declared `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`, so a Gemini quota or billing charge is the plausible abuse path.
- **Action required, and only Eugenio can do it** (it is his Google account): in the Google Cloud console, delete or restrict that API key, and check the project's billing for unexpected usage.
- **Status**: file removed from the repo. **Key rotation pending.** This entry stays here until that is confirmed.

*(The unauthenticated-writes hole was fixed on 2026-08-06 — see "Resolved".)*

---

## Telecommunications (2026-08-22)

### ~~No TURN server~~ — closed the same day, waiting only on two keys
- **What it was**: calls used STUN only, so the 10-15% of attempts behind a symmetric NAT never found a path.
- **How it was closed** (2026-08-22, Eugenio chose Cloudflare): `GET /api/telecom/hielo` mints short-lived Cloudflare credentials server-side — two hours of life, cached one hour, never written into client code. Falls back to STUN-only on any failure, so an outage at Cloudflare costs the hard calls, not all of them.
- **What is still pending, and it is not code**: `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_API_TOKEN`. Both travel to `.env.production` as GitHub secrets, same pattern as `TOGETHER_API_KEY`. Until they exist the platform behaves exactly as before and says so in the Teléfono page — to administrators only.
- **What it will cost**: Cloudflare gives 1,000 GB/month of egress and charges $0.05/GB after that (checked 2026-08-22). A relayed video call is roughly 1 GB/hour, a voice call 45 MB/hour, and only ~1 call in 10 gets relayed. `GET /api/telecom/gasto` counts the real ones instead of guessing.

### Nothing checks the deploy script's syntax until it runs in production
- **What**: the `script:` block inside `.github/workflows/deploy.yml` is bash, but nothing parses it as bash. YAML validity says nothing about it. Three of us now write env vars into `.env.production` from that one block, each with the same `if … fi` shape.
- **How it bit** (2026-08-22): merging prog6's R2 keys next to prog8's TURN keys dropped one `fi` — both blocks ended with the same line, so git kept a single one as common context and left an `if` unclosed. Valid YAML, readable diff, green everything. It would have failed in bash, on the server, in the step that is already touching production.
- **The fix is one step, ten seconds per deploy**: extract the `script:` block and run `bash -n` on it before the `ssh-action` step. Turns "breaks in production halfway through" into "the PR goes red".
- **Whose**: the workflow belongs to Programador 6 (infrastructure). Found and worked around by Programador 8, not fixed — the missing `fi` is back and verified, the check that would have caught it is not there yet.

### Nobody has ever run a call through a real TURN server
- **What**: every path in the credential code is tested — including a stubbed Cloudflare, a 401, a 4-second timeout and a dead host — and the classification of the three paths has its own test with nine cases (`scripts/probar-camino-llamada.ts`). But no call has actually been relayed, because that needs the keys and two machines on hostile networks.
- **How it will be known**: the first relayed call writes `retransmitida` into `llamadas.via` and shows up in `GET /api/telecom/gasto`. If a month passes with keys configured and that counter stays at zero, either nobody is on a hard network or the wiring is wrong — and both are worth knowing.
- **Decided by**: Programador 8.

### A phone number is declared, not proven
- **What**: `PUT /api/telecom/mi-numero` takes your word for it. There is no SMS provider contracted, so nothing stops somebody from claiming a number that is not theirs and receiving the calls meant for its owner.
- **What limits it today**: the number is unique across the platform (a database index), so whoever claims it first holds it, and it takes a logged-in account — it is not anonymous.
- **What it costs to fix**: an SMS provider and a six-digit code. Cents per message.
- **Where it is said out loud**: on the Teléfono page itself, in an amber box. It is not hidden.
- **Decided by**: Programador 8, not yet by Eugenio.

### A call does not survive a server restart, and that is on purpose
- **What**: live calls are held in memory (`vivas` in `src/server/telecom.ts`), not in the database. A deploy drops every call in progress.
- **Why it is not worth fixing**: the open connections die with the process anyway and both browsers find out immediately. Persisting the state would buy nothing, and it would cost a database round trip on every one of the ~30 signalling messages a call negotiation fires in its first two seconds.
- **What does get persisted**: the `llamadas` row — who called whom, when, how long, how it ended.

### Group calls are not built
- **What**: one to one only. Three people in a call needs either a mesh (every browser sends to every other, which stops working above four) or an SFU — a server that receives one stream and fans it out, which is real infrastructure and real money.
- **Why now**: nobody asked for it yet, and the one-to-one path is what replaces WhatsApp for the thing Eugenio described.

## Data integrity

### 17.421 fabricated observations flagged as not AI-generated
- **What**: objective scores cloned down to indicator level so the weighted average would add up. One municipality has 97 rows and 9 real values.
- **Cost now**: reseeding at objective level (2.506 honest rows) needs the fact table from the target schema.
- **Cost later**: grows with every new territory, and every visualisation built on top inherits the false number.
- **Minimum mitigation without the redesign**: flag those rows with their real provenance and `is_estimated = true`, keeping the current model. One afternoon, and it saves principle 12.

### `territories.geometry` and `centroid` empty in all 242 rows
- **What**: PostGIS installed and unused. Polygons live in `public/geo/*.json`. `/api/geo/tiles` returns 0 bytes.
- **Cost later**: anything needing a territory's centre has to read `src/data/seed.ts`, which already forces special-case rules documented in `memory/02_DATABASE.md`.

---

## Architecture

### 43 of 92 tables are fixed-pair junctions
- **Cost later**: every new entity kind multiplies tables. See `01_TARGET_SCHEMA.md`, decision 3.
- **Rule until fixed**: do not create more. To relate two things, use `graph_entity_links`, which is already generic.

### `server.ts` is 1.891 lines of raw SQL with no authorisation
- **Cost later**: the only part of the backend not following the modular pattern. Every new line there is a line that will have to be moved.
- **Rule until fixed**: frozen. Everything new goes into a module under `src/server/`.

### Two new endpoints were added to the frozen `server.ts` (2026-08-06)
- **What**: `GET /api/db/tables` and `GET /api/db/tables/:name`, for the Base de Datos page, went into `server.ts` — which `src/server/CLAUDE.md` says is frozen ("new endpoints go in a module here"). They belong in a small `src/server/database.ts`.
- **Why it happened**: they read the `pg_class` catalogue, which felt like it belonged next to the other raw-SQL routes. That is not a reason, it is a habit.
- **Cost to fix**: ~15 min. They are self-contained: two handlers, two constants (`SENSITIVE_COLUMNS`, `HIDDEN_TABLES`) and the `requireAdmin` guard, plus one `registerDatabaseRoutes(app, db)` line.
- **Cost later**: `server.ts` grows past 1.900 lines and the "frozen" rule loses its force — the next person reads it as advisory.
- **Note**: the same day, `getSolutionsForChallenges` inside `server.ts` was extended with `challenge_ids`. That one is a fix in place to existing code, which the rule allows.

### `schema.ts` declares 39 of the 92 tables
- **What**: everything social, marketplace, initiatives and AI exists only as raw SQL, untyped.
- **Cost later**: queries have no types, and `drizzle-kit generate` does not know those tables exist.

### `memory/02_DATABASE.md` stopped tracking reality around Fase 8
- **What**: it documents the original scientific/territory schema only. Everything from knowledge graphs onward — `knowledge_graphs`, `knowledge_windows`, `graph_windows`, `graph_edges`, `graph_entity_links`, `publications`, `user_maps`, `proyectos`, `roadmap_items`, `publicacion_meta`, `carpetas`, `carpeta_publicaciones`, the `ai_*` tables, `products`/`demands`/`needs` — is undocumented there, even though every migration since has followed the "update `memory/02_DATABASE.md` in the same change" rule for the *new* tables only, on top of an already-stale base.
- **Why it happened this time (2026-08-08)**: adding 0023/0024's three tables to this file would have made it look current when the other ~30 tables added since Fase 9 still aren't in it — a partial patch would have been more misleading than useful.
- **Cost to fix**: a real afternoon — walk every migration since 0012 and reconcile. `drizzle/` is the source of truth in the meantime; `01_TARGET_SCHEMA.md` documents where the model is *heading*, not what exists today.
- **Rule until fixed**: don't trust `02_DATABASE.md`'s table list. Read the migrations, or query `information_schema.tables`.

### `PORT` is hardcoded to 3000
- **What**: `server.ts:59`. The `PORT` variable in `.env.production` is ignored.
- **Cost**: trivial to fix, but it surprises anyone trying to change the port.

---

## Frontend

### Zero design tokens
- **What**: `src/index.css` is a single line. 117 bare `<button>` elements, 24 hex colours, `ui/core.tsx` with 3 primitives used by 10 of 34 pages.
- **Cost now**: creating the `@theme` block and lifting 12 primitives is one afternoon.
- **Cost later**: grows with every page. The 4 newest files already added 22 more hex values.
- **2026-08-06 update**: `Inicio.tsx` adds 33 more and `BaseDeDatos.tsx` 7 (plus 2 bare `<button>`). Most of `Inicio`'s are inside hand-drawn SVG miniatures, where a Tailwind class does not apply — but the 7 family colours in `BaseDeDatos` and the 3 accents in `Inicio` are the same palette declared for the fourth time in the repo. That palette is the cheapest token to extract first.

### The nav is hardcoded JSX and now has 5 entries
- **What**: `Layout.tsx` repeats the same `<Link>` + `cn(...)` block five times (Inicio, Geolocalización de Datos, Red de Datos, Base de Datos, Universo). `src/pages/CLAUDE.md` says the 4th entry is the moment to turn it into an array; we passed it at the 5th.
- **Cost now**: ~20 min to lift it to `const NAV = [{ to, label, icon, match }]` and map over it.
- **Cost later**: every rename touches 5 places and the active-state logic drifts. This renaming round already proved it: three labels changed and one of them (the page's own header pill) was missed until it was seen in the browser.

### Single 3.17 MB bundle (893 KB gzipped)
- **What**: no code splitting. Mapbox, React Flow, Recharts and react-simple-maps all land in the first chunk even though the landing page uses none of them.
- **Cost to fix**: low. Vite config plus dynamic `import()` on the map and graph pages.

### Dead dependencies
- **What**: `leaflet`, `react-leaflet`, `d3-geo`, `motion` with 0 imports. AI Studio scaffold leftovers.
- **Cost**: install weight and confusion. They do not affect the bundle, because code that is never imported is never bundled. Removing them is 10 minutes.
- **Partly done 2026-08-06**: `firebase`, `firebase-admin` and `@google/genai` removed, along with `firebase-applet-config.json` and `metadata.json`. The remaining four are still here because `react-simple-maps` (which *is* used) is the reason `--legacy-peer-deps` exists, and untangling that deserves its own pass.

### Two lockfiles
- **What**: `bun.lock` and `package-lock.json` coexist. The Dockerfile uses `npm ci`.
- **Risk**: local and production installing different versions.

### Loose scripts in the repo root
- **What**: `fix_layout.cjs`, `fix_map2.cjs`, `fix_map_continents.cjs`, `fix_server.cjs`, `fix_server2.cjs`, `update_map.cjs`, `make_continents.cjs`, `create_planet.cjs`, `test_comp.tsx`.
- **Cost**: no technical cost, but nine files nobody knows are safe to delete.

---

## Operations

### Zero tests
- **What**: not a single test file, with 92 tables and payment flows.
- **Cost later**: the biggest maintenance risk. Every refactor is blind.
- **Minimum viable**: 20 smoke tests, including one asserting that writes require a session.

### The compose image does not run on Apple Silicon
- **What**: `postgis/postgis:17-3.5` publishes no arm64 build. Irrelevant on the x86 Hetzner box.
- **Known workaround**: use `imresamu/postgis:17-3.5` locally.

### `npm run dev` does not load `.env`
- **What**: no `dotenv.config()` in `server.ts`. Must start with `node --env-file=.env node_modules/.bin/tsx server.ts`.
- **Cost**: trivial, but it is the trap that costs newcomers the most time.

---

## Accepted legal risk

### Mapbox attribution removed
- **What**: explicit decision recorded in `memory/03_DECISIONS.md` on 2026-08-02, taken knowing it breaches the Mapbox Terms of Service.
- **Risk**: Mapbox account suspension, which would blank every map in production.
- **Logged here** to keep it visible, not to reopen the decision.

---

## Resolved

### Unauthenticated writes on `/api/data/:entity` — fixed 2026-08-06
- **What it was**: `POST`, `PUT`, `DELETE` and `.../restore` across 14 core tables with no session and no role check. Found by Javier in PR #23, reproduced live (anonymous POST returned 200 and created the row; anonymous DELETE archived it).
- **Fix**: `requireAdmin()` on the four endpoints — 401 without a session, 403 below ADMIN. No capability was removed: editing from the UI was already admin-only.
- **Verified after the fix**: anonymous → 401 on all three verbs, nothing created; admin with a session → 200. Checked locally and against production.
- **What it left behind**: `server.ts` still has no authorisation *pattern*, only this guard. See "server.ts is 1.891 lines of raw SQL with no authorisation" above — new endpoints added on 2026-08-06 (`/api/db/tables`) had to call `requireAdmin` by hand.

### Juego Vital F1 shortcuts — 2026-08-18
- **World layout lives in code, not in the DB**: the village is rebuilt from a seeded PRNG on
  every visit (`src/components/juego/paleta.ts` + `Aldea.tsx`). Fine while nothing is editable;
  becomes real debt the moment the Builder (F2) ships. Cost to fix now: the `game_worlds` /
  `game_objects` tables planned in `memory/10_JUEGO_VITAL.md` (~half a session).
- **3D palette is hex-in-file**: three.js needs raw colour strings, so the "no hex in pages"
  rule is honoured by centralising ALL world colours in `paleta.ts` (outside `src/pages/`).
  If the UI tokens ever move to `index.css` variables, the game palette should read them.
- **Sign text loads its font from the network** (drei `<Text>`/troika default): offline or
  behind a strict CSP the project-building signs would render blank. Bundling a woff and
  passing `font=` fixes it in ~15 min when it matters.
- **`react-simple-maps` still pins React ≤18** (install needs `--legacy-peer-deps`; npm now
  reports every React 19 consumer as "invalid"). Harmless today, but each new dependency
  install repeats the warning noise. Replacing it is an old entry above; the game install
  bumped React 19.0.1 → 19.2.8 without incident.

### Juego Vital: mobiliario sin instanciar — 2026-08-18
`Detalles.tsx` dibuja cada banco, farola, puesto y oveja como mallas sueltas: la escena
pasó de 135 a ~400 draw calls. En escritorio no se nota; en un móvil de gama media es el
primer sitio donde mirar si va a tirones. Arreglo: `InstancedMesh` por tipo de objeto
(como ya hace `Vegetacion`), ~1 hora. No se hizo ahora para no retrasar la verificación
visual de lo que el usuario pidió.

### `public/` y las rutas de la app comparten espacio de nombres — 2026-08-18
Cualquier carpeta creada en `public/` se sirve como estática y **gana** a la ruta del
mismo nombre: `public/juego/` hizo que `/juego` devolviera un 301 a `/juego/` en
producción. Hoy hay `geo/`, `illustrations/`, `knowledge/` y `modelos-juego/`, y
ninguna colisiona. No hay nada que impida repetirlo: la salvaguarda sería una
comprobación en el build que compare los nombres de `public/*` con las rutas de
`App.tsx` (~30 min). Mientras tanto, la regla vive comentada en `Modelos.tsx`.

## Navegador remoto (Chromium) — 2026-08-20
- **Chromium corre sin su sandbox interno** (`chromiumSandbox: false`): dentro del
  contenedor Alpine no hay espacios de nombres de usuario y no arrancaría. El
  aislamiento real es el del contenedor. Camino correcto: imagen con seccomp de
  Playwright o user namespaces; ~half a day cuando el navegador tenga uso real.
- **El filtro anti-red-interna solo mira las NAVEGACIONES** (documentos), no cada
  subrecurso: comprobar DNS en cada imagen sería un peaje enorme y un subrecurso
  interno no es legible desde la página. El rebinding de DNS queda como riesgo
  teórico aceptado.
- **La pantalla viaja sin sonido** (el screencast son JPEG). Los vídeos van por el
  embed oficial, que sí suena. Audio de verdad = WebRTC (fase futura, tipo neko).
- **Las sesiones no guardan cookies**: cada ventana nueva es un Chromium virgen
  (consentimientos y logins se repiten). Mitigable con un perfil persistente por
  usuario (`userDataDir`) — decisión de producto pendiente, tiene implicaciones de
  privacidad y disco.

## Lienzos.tsx: fichas como `<button>` sueltos — 2026-08-20
`ui/core.tsx` exporta `Button`, pensado para acciones (relleno, redondeado). Una
ficha de 4:3 con portada no es eso, así que la página usa 6 `<button>` con clases
propias (las dos del conmutador, la ficha de crear, el enlace del estado vacío, cada
ficha y el cierre del modal). El patrón correcto sería un primitivo `CardButton` en
`ui/core`: ~20 minutos hoy, y crece con cada rejilla nueva (Explorar y Mercado ya
tienen la suya). No se hizo ahora para no mezclar un refactor de primitivos con una
página nueva. Sin colores a mano: todo son clases de la paleta.

## Archivos: tres consultas en una ruta, sin paginar — 2026-08-20
`GET /api/archivos` lanza tres SELECT (ventanas, muro, mundo 3D) con LIMIT 300 cada
uno y ordena en memoria. Con las 61 filas de hoy sobra; a partir de ~1.000 por
usuario habrá que paginar de verdad (cursor por fecha sobre una vista UNION). Se
hizo así para no crear una vista ni una tabla nueva antes de saber cómo se usa la
página. Coste de cambiarlo: ~1 hora, y no antes de que alguien note la espera.

## Buscador: `ILIKE '%…%'` sin índices, y a partir de cuántas filas deja de valer — 2026-08-23
`GET /api/search` recorre las **20 tablas del grafo** con `ILIKE '%…%'` y, desde el
«buscador primero» (#290), también busca **mientras se teclea**: una tanda de
consultas por cada pausa al escribir, no una por pulsar enviar. Ningún índice sirve
para eso — un `%algo%` no puede usar un B-tree — y `pg_trgm` **no está instalado**.

Con los datos de hoy sobra de lejos: 83 publicaciones en producción y 78 filas
sumando las otras 19 tablas. Por eso no se hace ahora: instalar una extensión en la
base de datos para eso sería pagar hoy una complejidad que no se cobra hasta dentro
de mucho.

**El disparador, medido y no estimado** (Postgres local, caché caliente, tablas
temporales; en el servidor será del mismo orden, no el mismo número):

| Forma de la consulta | Filas | Tiempo |
|---|---|---|
| Un título corto, una palabra | 200.000 | 135 ms |
| Un título corto, **tres palabras** (`ILIKE ANY`, que es como busca hoy) | 200.000 | 421 ms |
| Un cuerpo de publicación de ~2 KB, una palabra | 50.000 | 679 ms |
| Un cuerpo de ~2 KB, **tres palabras** | 50.000 | **2,6 s** |

Un desplegable que se pinta mientras escribes deja de parecer instantáneo por encima
de **~200 ms**. Con eso:

- **Las publicaciones son las que se rompen primero, y con mucha diferencia**, porque
  `body ILIKE` recorre texto largo: ~50 µs por fila y palabra. **A partir de unas
  4.000 publicaciones** una búsqueda de tres palabras se sale del presupuesto. Ése es
  el número que hay que vigilar; es alcanzable en un año normal.
- Las otras 19 tablas, que buscan sobre títulos cortos, aguantan hasta **~100.000
  filas sumadas** con la misma cuenta.

**Cuando se cruce cualquiera de los dos**: `CREATE EXTENSION pg_trgm` + un índice GIN
`gin_trgm_ops` por cada columna que se busca. Eso convierte el recorrido completo en
una búsqueda por índice y aguanta dos órdenes de magnitud más. Es trabajo de quien
lleve escalabilidad, no del buscador: mete una extensión en la base.

**Cómo saber en qué punto estamos**, sin adivinarlo:

```sql
SELECT (SELECT count(*) FROM publications WHERE archived_at IS NULL) AS publicaciones,
       (SELECT sum(n_live_tup) FROM pg_stat_user_tables
         WHERE relname IN ('challenges','solutions','products','users','territories',
           'organizations','initiatives','knowledge_graphs','knowledge_windows','user_maps',
           'indicators','objectives','markers','metrics','causes','needs','demands',
           'success_cases','projects')) AS filas_del_grafo;
```
