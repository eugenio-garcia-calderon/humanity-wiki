# 03 — Registro de Decisiones

> **Este es el archivo más importante del proyecto.** Cada decisión importante (arquitectura, modelo de datos, seguridad, diseño de producto) se añade aquí en el momento en que se toma.
>
> **Formato obligatorio:** Fecha / Problema / Opciones consideradas / Decisión tomada / Motivo / Consecuencias.
>
> **Regla innegociable: nunca se borran decisiones antiguas.** Si una decisión se revierte o cambia, se añade una **nueva entrada** que referencia a la anterior — la entrada original permanece intacta como registro histórico.

---

## 2026-08-01 — Clave secreta de Stripe hardcodeada en el código

- **Problema**: el `server.ts` exportado desde AI Studio contenía una clave secreta de Stripe **en vivo** (`sk_live_...`) hardcodeada como fallback cuando `STRIPE_SECRET_KEY` no estaba definida en el entorno.
- **Opciones consideradas**: (a) dejarla y solo advertir al usuario; (b) eliminar el fallback y exigir la variable de entorno, tras confirmar con el usuario que la clave expuesta se revoca.
- **Decisión tomada**: opción (b). Se eliminó el fallback hardcodeado; `getStripe()` ahora lee exclusivamente `process.env.STRIPE_SECRET_KEY` y lanza error si falta.
- **Motivo**: una clave secreta en vivo en un repositorio (aunque sea privado) es una vulnerabilidad crítica — permite mover dinero real y crear cargos en nombre del usuario. Se avisó al usuario antes de subir nada a GitHub y este confirmó la revocación de la clave expuesta.
- **Consecuencias**: el arranque del servidor falla explícitamente si `STRIPE_SECRET_KEY` no está en `.env`; cualquier IA futura debe asegurarse de que la variable existe en el entorno antes de probar rutas de Stripe, y **nunca** debe reintroducir un valor hardcodeado como solución rápida a ese fallo.

---

## 2026-08-01 — Motor de base de datos: PostgreSQL 17 (no 16) con PostGIS

- **Problema**: el proyecto necesita datos geoespaciales (polígonos de territorios, puntos de estaciones) con consultas espaciales eficientes.
- **Opciones consideradas**: (a) PostgreSQL 16 + PostGIS; (b) PostgreSQL 17 + PostGIS; (c) prescindir de PostGIS y guardar geometrías como JSON plano.
- **Decisión tomada**: PostgreSQL 17 + PostGIS 3.6.
- **Motivo**: Homebrew solo publica paquetes de PostGIS compatibles con PostgreSQL 17/18, no con 16 (se descubrió tras instalar 16 primero y fallar la instalación de PostGIS). Prescindir de PostGIS habría significado perder `ST_AsMVT` (vector tiles), índices espaciales y funciones de proximidad (`/api/geo/near`).
- **Consecuencias**: cualquier entorno de desarrollo nuevo debe instalar `postgresql@17` (no 16) vía Homebrew antes de instalar la extensión PostGIS. En producción (Cloud SQL u otro proveedor gestionado), verificar la misma compatibilidad de versión antes de aprovisionar.

---

## 2026-08-01 — Flujo de migraciones: `drizzle-kit generate` + `psql` manual, nunca `drizzle-kit push`

- **Problema**: aplicar cambios de esquema (`src/db/schema.ts`) a la base de datos de forma reproducible.
- **Opciones consideradas**: (a) `drizzle-kit push` (aplica el diff directamente, con prompts interactivos de confirmación); (b) `drizzle-kit generate` (genera un archivo `.sql` versionado) seguido de aplicación manual con `psql -f`.
- **Decisión tomada**: opción (b).
- **Motivo**: `drizzle-kit push` se queda colgado indefinidamente en este entorno de shell no interactivo porque espera una confirmación de teclado que nunca llega. Además, generar migraciones versionadas en `drizzle/000X_*.sql` deja un historial auditable de cambios de esquema, alineado con la filosofía de trazabilidad del proyecto.
- **Consecuencias**: todo cambio de esquema futuro debe seguir el flujo: editar `schema.ts` → `npx drizzle-kit generate` → revisar el `.sql` generado → `psql -f drizzle/000X_nombre.sql`. Ver detalle en `01_ARCHITECTURE.md` y `05_STYLE_GUIDE.md`.

---

## 2026-08-01 — Corrección de 13 violaciones de "Rules of Hooks" en páginas

- **Problema**: 13 componentes de página llamaban hooks de React (`useState`, `useEffect`, etc.) después de un `return` condicional temprano (`if (loading) return ...`), violando las reglas de hooks y causando comportamiento indefinido al cambiar el estado de carga.
- **Opciones consideradas**: (a) reordenar todos los hooks antes de cualquier `return` condicional en las 13 páginas; (b) refactorizar a un patrón de carga distinto (p. ej. Suspense).
- **Decisión tomada**: opción (a), cambio mínimo y quirúrgico.
- **Motivo**: es el fix correcto y menos invasivo; no había necesidad de introducir Suspense u otro patrón para resolver un bug de orden de hooks.
- **Consecuencias**: patrón a seguir en cualquier página nueva — todos los hooks van antes de cualquier `return` condicional, sin excepción.

---

## 2026-08-02 — Identificar indicadores/marcadores/métricas por `id`, nunca por `name`

- **Problema**: nombres como "Acceso", "Seguridad", "Calidad" se repiten en varios objetivos/indicadores distintos. Usar el nombre para iconografía o routing causaba icono equivocado o navegación al elemento incorrecto.
- **Opciones consideradas**: (a) forzar nombres únicos en toda la base de datos; (b) mantener nombres repetidos (son correctos semánticamente — "Calidad" del agua y "Calidad" de la vivienda son conceptos distintos) e indexar toda la lógica de UI por `id`.
- **Decisión tomada**: opción (b).
- **Motivo**: los nombres repetidos son válidos y deseables desde el punto de vista de producto; el problema era técnico (uso del nombre como clave), no de datos.
- **Consecuencias**: `INDICATOR_ICONS`, `MARKER_ICONS`, `METRIC_ICONS` (en `src/utils/`) están keyeados por `id`; la navegación de `Indicators.tsx` usa `indicator.id` en vez de `slugify(indicator.name)`. Cualquier mapa nuevo de icono/color/ruta por entidad de este dominio debe seguir el mismo patrón.

---

## 2026-08-02 — Duplicados en `/api/data/indicators` por falta de filtro de territorio en el JOIN

- **Problema**: el endpoint hacía `LEFT JOIN indicator_observations` sin filtrar por territorio, así que al añadir observaciones de varias regiones para el mismo indicador, la lista devolvía filas duplicadas (p. ej. ~17 botones repetidos de "Calidad").
- **Opciones consideradas**: (a) añadir `DISTINCT` sobre el indicador; (b) añadir `AND io.territory_id = ${territoryId}` (por defecto `'T003'`/España) a la condición del JOIN.
- **Decisión tomada**: opción (b).
- **Motivo**: este endpoint alimenta un listado/menú de indicadores (no un desglose por región), así que solo necesita una fila por indicador con el dato de un territorio de referencia; los desgloses por región para el mapa vienen de los endpoints `geo/*` separados, que sí devuelven mapas `territoryId → score`.
- **Consecuencias**: cualquier endpoint de listado similar que se añada en el futuro (para marcadores o métricas) debe filtrar el JOIN de observaciones por un territorio por defecto, dejando los mapas completos por territorio para los endpoints `geo/*`.

---

## 2026-08-02 — Construir la estructura de Marcadores/Métricas antes de tener todos los datos reales

- **Problema**: al pedir el filtro en cascada de 3º y 4º nivel (Marcador, Métrica), aún no existían datos reales para todos los territorios en esos niveles.
- **Opciones consideradas**: (a) esperar a tener el dato real completo antes de construir el filtro y el renderizado en mapa; (b) construir la estructura completa (tablas, endpoints, UI de filtro, estado "Sin datos") ahora y rellenar datos reales progresivamente en turnos posteriores.
- **Decisión tomada**: opción (b) — decisión explícita del usuario ante la pregunta directa ("Construye la estructura ahora").
- **Motivo**: permite iterar en la UI/UX del filtro sin bloquear el desarrollo a la disponibilidad de datos, y refuerza el principio de "nunca fabricar datos": los territorios sin observación real muestran "Sin datos" en vez de un valor inventado.
- **Consecuencias**: patrón replicable para cualquier nivel/entidad futura del modelo — construir primero el esqueleto (tabla, endpoint, filtro UI, color gris "Sin datos"), rellenar datos reales después, sin necesidad de tocar la estructura al llegar los datos.

---

## 2026-08-02 — Renombrar el marcador "Toxicidad" a "Pureza"

- **Problema**: el usuario pidió cambiar el nombre del marcador "Toxicidad" (uno de los 7 marcadores de "Calidad" del agua) por "Pureza" en todo el sistema.
- **Opciones consideradas**: (a) cambiar solo el `name` visible manteniendo el `id` interno; (b) además actualizar cualquier referencia textual/documental al nombre antiguo.
- **Decisión tomada**: opción (a) — el `id` interno (p. ej. usado en `MARKER_ICONS`) se mantiene estable; solo cambia el campo `name` mostrado y las referencias en documentación/UI.
- **Motivo**: cambiar el `id` habría roto referencias existentes (observaciones, filtros activos, iconografía keyeada por id); el cambio pedido es de naming de producto, no de identidad del registro.
- **Consecuencias**: cualquier renombrado futuro de una entidad del modelo debe seguir este patrón — el `id` es estable y opaco, el `name` es el único campo que cambia por decisión de producto.

---

## 2026-08-02 — Eliminar la marca de agua/atribución de Mapbox del mapa

- **Problema**: el usuario pidió eliminar el logo y el texto de atribución de Mapbox que aparecen por defecto en las esquinas del mapa.
- **Opciones consideradas**: (a) mantenerlo, cumpliendo los términos de servicio de Mapbox; (b) eliminarlo visualmente vía CSS/configuración del control de atribución.
- **Decisión tomada**: opción (b), **tras advertir explícitamente al usuario que esto incumple los Términos de Servicio de Mapbox**, que exigen mostrar la atribución. El usuario respondió "Eliminarlos igualmente" de forma explícita.
- **Motivo**: decisión de producto del usuario, tomada con pleno conocimiento del incumplimiento contractual que supone.
- **Consecuencias**: **riesgo legal/contractual latente frente a Mapbox permanece activo** mientras esta configuración siga en pie. Cualquier IA futura que trabaje en el mapa debe saber que esto fue una decisión consciente y no un descuido; si se revisa en el futuro (p. ej. por requerimiento de Mapbox), la opción es restaurar el control de atribución nativo de `mapbox-gl`.

---

## 2026-08-02 — Rediseño del mapa a 3 columnas con panel de territorio permanente

- **Problema**: el diseño anterior (menú inferior + panel lateral flotante estilo electricitymap.org) se sustituye por una petición explícita de layout en 3 columnas: filtros en acordeón vertical (col. 1, ~1/5), panel de territorio permanente y no flotante (col. 2, ~2/5), mapa (col. 3, ~2/5).
- **Opciones consideradas**: no aplica — especificación directa y detallada del usuario, sin alternativas de diseño evaluadas.
- **Decisión tomada**: implementar exactamente la especificación de 3 columnas descrita, reutilizando el mismo estilo/colores del filtro en cascada existente, solo reorganizado verticalmente con acordeón.
- **Motivo**: preferencia de UX del usuario — quiere el panel de territorio siempre visible (no flotante/cerrable) para comparar datos sin perder el contexto de filtro.
- **Consecuencias**: el patrón de layout de `src/pages/Map.tsx` pasa de "mapa a pantalla completa + overlays flotantes" a "3 columnas flex fijas". Hay una mejora pendiente derivada y ya registrada por el usuario en `MEJORAS_PENDIENTES.md` (ítem 4): hacer estas 3 columnas redimensionables por el usuario, al estilo de los paneles de la UI de Claude Code.

---

## 2026-08-02 — Crear el sistema de memoria persistente `/memory` para desarrollo multi-IA

- **Problema**: el proyecto está pensado para desarrollarse durante años por múltiples sesiones de IA que no comparten memoria entre sí; sin un mecanismo de contexto persistente, cada sesión nueva tendría que re-derivar decisiones, arquitectura y estado del proyecto desde cero, con riesgo de contradecir decisiones ya tomadas (p. ej. reintroducir un fallback de clave hardcodeada, o volver a nombrar entidades por `name` en vez de `id`).
- **Opciones consideradas**: (a) confiar en el historial de git y comentarios de código como única fuente de contexto; (b) crear una carpeta `/memory` versionada con documentación estructurada y viva, con reglas explícitas de actualización obligatoria.
- **Decisión tomada**: opción (b) — 9 archivos Markdown numerados (`00_PROJECT_VISION.md` … `08_CHANGELOG.md`), cada uno con un propósito y una audiencia específicos.
- **Motivo**: el git log y los comentarios de código explican el "qué" pero no el "por qué" ni el estado global del proyecto; una IA nueva necesita poder recuperar el contexto completo en minutos, no reconstruirlo leyendo cientos de commits.
- **Consecuencias — reglas permanentes a partir de ahora**:
  1. Cualquier modificación de código importante debe ir acompañada de la actualización del/de los archivo(s) de `/memory` que correspondan.
  2. La documentación de `/memory` forma parte del proyecto y nunca puede quedarse desactualizada.
  3. Antes de cualquier tarea importante, debe leerse `/memory` completo para recuperar el contexto del proyecto.
  4. `03_DECISIONS.md` (este archivo) y `08_CHANGELOG.md` son de solo-añadir: nunca se borra una entrada existente, solo se añaden nuevas (incluidas las que revierten o corrigen una decisión anterior).

---

## 2026-08-03 — Arquitectura de "páginas" ligadas a territorio para el menú de filtros (Objetivo→Indicador→Marcador→Métrica)

- **Problema**: el usuario pidió que al hacer click en cualquier nivel del menú de filtros (p. ej. Agua → Calidad → Pureza → Mercurio) se abriera en la columna central una "página" con información general de esa entidad más los datos concretos del territorio seleccionado, de forma escalable a cualquier rama del menú y sin romper la sincronía entre las 3 columnas (filtros / panel central / mapa).
- **Opciones consideradas**: (a) crear una página/ruta React Router distinta por cada nivel (objetivo, indicador, marcador, métrica), cada una con su propio fetch y layout; (b) un único componente y un único endpoint backend genérico, parametrizados por `level` + `id`, que devuelven una forma de respuesta común (metadata general + observación del territorio + hijos) y que reciben el nivel activo desde el mismo estado que ya gobierna el filtro en cascada del mapa.
- **Decisión tomada**: opción (b). Nuevo endpoint `GET /api/explorer/:level/:id?territoryId=...` (server.ts) y nuevo componente `src/components/explorer/EntityExplorerPanel.tsx`, reutilizados sin cambios para los 4 niveles.
- **Motivo**: con 4 niveles hoy y la posibilidad de añadir más en el futuro, cuatro endpoints/páginas separadas habrían duplicado la lógica de resolución de territorio y de breadcrumb. Un único endpoint con una rama `if (level === ...)` por nivel, y un único componente que renderiza según las mismas claves de respuesta (`entity`, `territory`, `observation`/`score`, `children`, `stations` solo para métrica), permite añadir un 5º nivel en el futuro tocando un solo archivo en cada lado (back y front).
- **Consecuencias**: cualquier nivel nuevo de la jerarquía científica (ver `06_INDICATORS.md`) debe seguir este mismo patrón — no crear una página/ruta ni un endpoint independiente. El breadcrumb y la resolución de ancestros (objetivo↔indicador↔marcador↔métrica) se calculan en el cliente (`src/pages/Map.tsx`, función `resolveAncestors`) a partir de las listas ya cargadas de indicadores/marcadores/métricas, no en el backend — evita una segunda fuente de verdad para la jerarquía.

## 2026-08-03 — La navegación del menú de filtros se refleja en la URL (`nivel`+`id`+`territorio`)

- **Problema**: había que decidir si el estado del filtro en cascada (territorio + nivel + entidad activa) vive solo en memoria del componente o se refleja en la URL del navegador.
- **Opciones consideradas**: (a) estado interno únicamente (más simple, pero no compartible ni recargable); (b) reflejar el estado en query params de `/mapa`, con el territorio identificado por el **nombre** (slugificado) en vez de por su id interno (`T0XX`).
- **Decisión tomada**: opción (b), decisión explícita del usuario. Esquema final: `/mapa?territorio=<slug-del-nombre>&nivel=<objetivo|indicador|marcador|metrica>&id=<id-de-la-entidad>`. Solo se guarda el nivel más profundo activo (`nivel`+`id`); los niveles superiores (objetivo, indicador, marcador) se derivan en el cliente a partir de las listas ya cargadas, así que añadir un 5º nivel no añade un nuevo parámetro de URL, solo un nuevo valor posible de `nivel`.
- **Motivo**: el usuario quiere poder compartir/guardar el enlace exacto a una combinación territorio+tema (p. ej. "Pureza del agua en Aragón"), y que el botón atrás/adelante del navegador funcione para deshacer la navegación por el árbol. Usar el nombre del territorio en la URL (no su id `T0XX`) hace la URL legible y estable de cara al usuario, aunque el id siga siendo la clave interna real.
- **Consecuencias**: el slug se resuelve contra la lista de territorios ya cargada por `DataContext` (`slugify(t.name) === param`); si en el futuro dos territorios distintos generan el mismo slug (colisión de nombres tras quitar acentos/mayúsculas), se resuelve por el primer match encontrado — limitación conocida, no resuelta, aceptable mientras el catálogo de territorios sea pequeño (33 filas a fecha de esta decisión).

## 2026-08-03 — Territorio por defecto: geolocalización por IP con fallback al Planeta

- **Problema**: si el usuario entra en `/mapa` sin un territorio ya elegido (ni en la URL ni por click previo), había que decidir qué territorio mostrar por defecto para que el menú de filtros fuera útil desde el primer segundo.
- **Opciones consideradas**: (a) fijar España como valor por defecto fijo; (b) bloquear el panel central hasta que el usuario elija territorio explícitamente; (c) intentar adivinar el territorio a partir de la IP del visitante, con reserva ("Mundo"/Planeta) si no se puede determinar.
- **Decisión tomada**: opción (c), decisión explícita del usuario. Nuevo endpoint `GET /api/geo/locate` (server.ts) usa el paquete `geoip-lite` (offline, sin llamadas de red externas) para resolver país (y, si es España, comunidad autónoma vía tabla de códigos ISO 3166-2:ES) a partir de la IP del request; si no hay match, devuelve el territorio de tipo `planet` (Mundo, T001).
- **Motivo**: en local (IPs privadas/loopback) `geoip-lite` nunca resuelve, así que el fallback a "Mundo" es también el comportamiento normal en desarrollo — coincide exactamente con lo que el usuario pidió ("si esta información no está, pon por defecto el Planeta").
- **Consecuencias**: la precisión geográfica es deliberadamente tosca (no hay verificación de que el usuario esté realmente donde indica su IP, ni consentimiento explícito pedido) — aceptable porque solo afecta a qué territorio se muestra por defecto, no a ningún dato personal almacenado ni mostrado a terceros. Si en el futuro se añaden más países al catálogo de territorios, hay que ampliar `COUNTRY_NAME_BY_ISO2` en `server.ts`; si se añaden más regiones de otro país con subdivisiones ISO 3166-2, replicar el patrón de `ES_REGION_NAME_BY_ISO_CODE`.

## 2026-08-03 — "Alrededores" de una métrica: radio de distancia desde el centroide del territorio

- **Problema**: al ver el detalle de una métrica (p. ej. Mercurio), el usuario pidió mostrar los datos del territorio seleccionado "y alrededores", sin que exista un concepto de "territorios vecinos" en la base de datos.
- **Opciones consideradas**: (a) radio de distancia fijo desde el centro del territorio (p. ej. 150 km), usando las estaciones ya georreferenciadas; (b) limitarse al territorio exacto; (c) construir una tabla nueva de adyacencia territorial real.
- **Decisión tomada**: opción (a), elegida explícitamente por el usuario. Nueva función `getStationsNearTerritory` en `server.ts`: devuelve las estaciones cuyo `territory_id` coincide con el territorio seleccionado, más cualquier estación dentro de un radio (150 km por defecto, parámetro `radioKm` de la query) del centro del territorio, calculado con `ST_DWithin`/`ST_Distance` sobre geografías punto a partir de lat/lng.
- **Motivo/hallazgo importante durante la implementación**: la columna `territories.centroid` (PostGIS) **existe en el esquema pero nunca se ha poblado** — está vacía (`NULL`) para las 33 filas actuales. El centro real de cada territorio que usa el resto de la app (incluida esta función) viene de `seedTerritories` en `src/data/seed.ts` (campo `coordinates: [lng, lat]`), no de la columna `centroid`. `getStationsNearTerritory` se implementó por tanto contra `seedTerritories`, no contra `territories.centroid`. Ver también `02_DATABASE.md`.
- **Consecuencias**: cualquier función futura que necesite el centro de un territorio debe leer `seedTerritories`/`src/data/seed.ts`, **no** asumir que `territories.centroid` tiene datos — es una trampa fácil de caer si solo se mira el esquema (`schema.ts`) sin comprobar el contenido real de la tabla.

---

## 2026-08-03 — Ampliación a 14 Objetivos: generalizar la arquitectura en vez de hardcodear 8 más

- **Problema**: el usuario pidió añadir 8 objetivos nuevos (Educación, Movilidad, Energía, Tecnología, Empleo, Gobernanza, Economía, Cultura — Gobernanza sustituyó a un "Política" inicial por petición explícita, y Cultura se añadió en un mensaje posterior con los mismos 7 indicadores), cada uno con los mismos 7 indicadores (Accesibilidad, Coste, Soberanía, Eficiencia, Calidad, Sostenibilidad, Innovación), pidiendo explícitamente que quedaran "integrados de forma eficiente" y que se revisaran **todos** los lugares del front donde aparecen los objetivos.
- **Opciones consideradas**: (a) añadir los 8 objetivos siguiendo el patrón existente tal cual (que hardcodeaba los 6 objetivos originales como campos fijos en varios sitios: un `interface TerritoryObjectives` con 6 propiedades literales, un `ObjectiveKey` derivado de ese interface, y un `getObjectivesForTerritory` en `server.ts` con 6 `.find()` copiados a mano + una duplicación exacta de esa misma lógica en el endpoint de centroides); (b) generalizar primero esas piezas para que sean listas dinámicas basadas en `objectiveIds.ts`, y solo entonces añadir los 8 objetivos como datos.
- **Decisión tomada**: opción (b).
  - `src/services/MapService.ts`: `TerritoryObjectives` pasó de interface con 6 campos fijos a `Record<string, number | null>`.
  - `src/components/HumanityMap.tsx`: `ObjectiveKey` pasó de `keyof TerritoryObjectives` a `string` plano; se creó `DEFAULT_OBJECTIVE_SCORES` calculado dinámicamente desde `OBJECTIVE_ID_BY_KEY`.
  - `server.ts`: `getObjectivesForTerritory` reescrito para iterar `Object.entries(OBJECTIVE_ID_BY_KEY)` en vez de tener 6 líneas copiadas a mano; el endpoint de centroides (que tenía una **segunda copia idéntica** de esa misma lógica) ahora llama al mismo helper en vez de duplicarlo.
  - Solo entonces se añadieron los 8 objetivos: 1 línea nueva en `objectiveIds.ts` por objetivo, más un nuevo script de siembra (`src/db/seed-new-objectives.ts`) para las filas de `objectives`/`indicators`.
- **Motivo**: con el diseño anterior, cada objetivo nuevo habría requerido tocar el mismo patrón de "6 líneas copiadas" en 3 sitios distintos (el tipo, el helper del mapa, el endpoint de centroides) — exactamente el tipo de duplicación fértil en errores que ya había causado un bug real (ver la entrada de "mapa en blanco" anterior, motivada por la misma clase de duplicación). Generalizar una vez cuesta lo mismo que añadir 8 objetivos a mano y deja el sistema listo para el 15º, 20º, etc.
- **Decisión de datos — no fabricar `progress_by_territory` para los 8 nuevos**: los 6 objetivos originales tienen un diccionario `progress_by_territory` (mock, en `src/data/seed.ts`) con fallback a 50 cuando un territorio no aparece listado — comportamiento legacy, preservado tal cual. Los 8 objetivos nuevos **no tienen ninguna entrada mock**: `getObjectivesForTerritory` los deja en `null` (no en 50), así que se muestran como "Sin datos" en el mapa, en el tooltip y en la página de explorador de objetivo, consistente con el principio de "nunca fabricar datos" (ver `00_PROJECT_VISION.md`). El campo `overall` (la media general) sigue calculándose solo con los objetivos que sí tienen dato, así que el valor mostrado hoy en "General" no cambia respecto a antes de esta ampliación.
- **Indicadores nuevos — estructura antes que datos**: los 56 indicadores nuevos (8 objetivos × 7 indicadores) se crearon sin `indicator_observations`, siguiendo el mismo patrón ya usado para Marcadores/Métricas de Agua ("Construye la estructura ahora", decisión del 2026-08-02). Peso igual (`1/7≈0.143`) para los 7 indicadores de cada objetivo nuevo, ya que no hay datos reales de los que derivar una ponderación distinta; `direction` asignado por semántica de cada nombre (`Coste` → `lower_is_better`, el resto → `higher_is_better`).
- **Consecuencias**: añadir un 15º objetivo en el futuro requiere solo: (1) una línea en `objectiveIds.ts`, (2) una fila en `objectives` (+ sus indicadores si aplica), (3) opcionalmente un icono/color en los 5-6 sitios de UI que todavía mapean icono por título/id a mano (`Objectives.tsx`, `ObjectiveDetail.tsx`, `Home.tsx`, `EntityExplorerPanel.tsx`, `Map.tsx`, el tooltip de `HumanityMap.tsx`) — estos últimos no se generalizaron en una única fuente de verdad porque habría sido una refactorización más grande y arriesgada de lo que pedía la tarea; todos tienen fallback a un icono/color genérico si se olvida añadir una entrada, así que omitir este paso no rompe nada, solo deja el objetivo con estilo genérico.
