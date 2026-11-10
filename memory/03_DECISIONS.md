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

---

## 2026-08-03 — CRUD de Retos/Soluciones/Causas/Indicadores/Marcadores/Métricas: sin borrado en cascada propio, y remount-tras-guardado no resuelto a propósito

- **Problema 1 — borrado de un indicador/marcador que todavía tiene hijos**: al dar a un admin la capacidad de borrar indicadores y marcadores desde el panel central, había que decidir qué pasa si todavía tienen marcadores/métricas (o `marker_observations`/`indicator_observations`) dependientes.
- **Opciones consideradas**: (a) implementar borrado en cascada explícito (borrar también los hijos); (b) confiar en las restricciones de clave foránea ya existentes en el esquema (sin `ON DELETE CASCADE`) para que Postgres **rechace** el `DELETE` si quedan hijos, y solo borrar las tablas de observaciones/uniones propias de la entidad (`indicator_observations`, `challenge_indicators`, etc.).
- **Decisión tomada**: opción (b). `handleDeleteEntity` en `server.ts` borra únicamente las filas que pertenecen directamente a la entidad (sus propias observaciones y sus propias filas en las tablas de unión con retos), y dejar que la base de datos rechace el borrado si un indicador todavía tiene marcadores, o un marcador todavía tiene métricas.
- **Motivo**: un borrado en cascada silencioso es fácil de convertir en pérdida de datos accidental (borrar un indicador de un click borra sin avisar todos sus marcadores y métricas hijas); dejar que la base de datos lo rechace hace que el error sea alto y visible (el admin ve que el borrado falla y por qué) en vez de arrastrar borrados no queridos. Coincide con el principio general del proyecto de "nunca fabricar/perder datos silenciosamente" (ver `00_PROJECT_VISION.md`).
- **Consecuencias**: para borrar un indicador con hijos, un admin debe borrar primero sus marcadores/métricas uno a uno desde la propia UI — más pasos, pero ningún borrado accidental en cascada. Si en el futuro se quiere un borrado en cascada explícito (p. ej. "borrar este indicador y todo lo que cuelga de él"), debe ser una acción deliberada y distinta ("Eliminar en cascada"), no el comportamiento por defecto del botón "Eliminar".

- **Problema 2 — el gráfico de causas se cierra al guardar/borrar cualquier cosa**: se detectó que `Layout.tsx` envuelve la página enrutada en `<main key={updateCounter} ...>`, así que cualquier guardado/borrado en cualquier parte de la app (no solo en el propio gráfico) fuerza un remount completo de `Map.tsx`/`EntityExplorerPanel`, reseteando el estado local `selectedChallengeId` y cerrando visualmente el gráfico de anillo abierto.
- **Opciones consideradas**: (a) arreglo rápido y local (mover `selectedChallengeId` a estado no reseteable, p. ej. un ref o contexto); (b) arreglo correcto y consistente con el resto de la app (llevar `selectedChallengeId` a la URL como parámetro, igual que ya hacen `territorio`/`nivel`/`id`, para que sobreviva al remount); (c) no tocarlo ahora y documentarlo como limitación conocida.
- **Decisión tomada**: opción (c), por tiempo y porque es un patrón preexistente de toda la app (afecta a cualquier estado local de cualquier página tras cualquier guardado en cualquier sitio), no algo introducido por esta función ni exclusivo de ella.
- **Motivo**: arreglarlo bien (opción b) es la solución correcta pero toca el patrón de navegación por URL que ya usa toda la página del mapa, y merece hacerse como una mejora deliberada y probada en toda la app, no como un parche apresurado dentro de esta tarea. No es un bug de corrección de datos (verificado por `psql` en cada prueba que los guardados/borrados son correctos), solo un salto de UX (el gráfico se cierra y hay que volver a pinchar la esfera).
- **Consecuencias**: si se retoma este arreglo en el futuro, el patrón a seguir es el mismo que ya usan `territorio`/`nivel`/`id` en `Map.tsx`: añadir `causaSeleccionada`/`retoAbierto` (o similar) como parámetro de la URL de `/mapa`, en vez de `useState` local en `EntityExplorerPanel`.

---

## 2026-08-03 — Los 179 municipios de Madrid: qué fuente de polígonos usar, y cómo emparejar un Excel con nombres parcialmente simulados

- **Problema 1 — fuente de los polígonos**: el usuario pidió pintar los 179 municipios reales de la Comunidad de Madrid como polígonos en el mapa. No existía ninguna fuente de geometría a nivel de municipio en el proyecto (solo `public/geo/regions.json` a nivel de comunidad autónoma).
- **Opciones consideradas**: (a) `martgnz/municipios` (TopoJSON de España completo, extraído de las Líneas Límite Municipales del IGN) — repo que el usuario aprobó explícitamente tras pedírselo; (b) su sucesor `martgnz/es-atlas`, mencionado en el propio README del repo (a) como reemplazo recomendado ("usa es-atlas para tener todas las regiones administrativas... y construir tu propio TopoJSON").
- **Decisión tomada**: se empezó por (a) tal y como se aprobó, pero al inspeccionarlo se descubrió que **sus 8199 geometrías no tienen absolutamente ninguna propiedad** (`properties: null`, sin `id` ni `name`) — inservible para identificar qué polígono corresponde a qué municipio. Se cambió entonces a (b) `es-atlas` (`unpkg.com/es-atlas/es/municipalities.json`), que sí incluye `id` (código INE) y `properties.name` por feature, y proviene exactamente de la misma fuente oficial (IGN, CC-BY 4.0) y del mismo autor.
- **Motivo**: no se volvió a preguntar al usuario antes de usar (b) porque es el sucesor directo y explícitamente recomendado de la fuente ya aprobada, con la misma procedencia (IGN) y licencia — cambiarlo era necesario para que la tarea fuera viable en absoluto (no una elección discrecional entre alternativas), y la alternativa (a) simplemente no podía funcionar. Se documenta aquí para que quede explícito el porqué del cambio de fuente respecto a lo inicialmente aprobado.
- **Consecuencias**: filtrando `es-atlas` por código INE que empieza por `28` se obtienen exactamente los 179 municipios de Madrid, cada uno con nombre oficial y geometría — convertido de TopoJSON a GeoJSON con `topojson-client` (ya presente en `node_modules`) y guardado en `public/geo/madrid_municipios.json`.

- **Problema 2 — el Excel del usuario (`Municipios_Madrid_179_Indicadores_Simulados.xlsx`) solo nombra 10 de los 179 municipios**: las filas 11-179 vienen como placeholders genéricos ("Municipio 11".."Municipio 179"), con datos de las 14 columnas de objetivo ya simulados para todas las 179 filas por igual.
- **Opciones consideradas**: (a) usar literalmente "Municipio 11" etc. como nombre del territorio; (b) sustituir los placeholders por los 169 nombres reales restantes de Madrid, emparejados en algún orden razonable con las filas ya existentes.
- **Decisión tomada**: opción (b), confirmada explícitamente con el usuario. El emparejamiento concreto: las 10 filas ya nombradas se dejaron tal cual (cada una con su propio municipio real, sin reordenar); las 169 filas restantes se completaron con los 169 municipios reales sobrantes, **ordenados por población real descendente** (fuente: tabla de Wikipedia con censo INE 2024) — el mismo criterio implícito que parecía seguir el Excel en sus 10 primeras filas (ciudades grandes primero), aunque se comprobó que el orden exacto del Excel no coincide con el ranking real 2024 (p. ej. Móstoles es hoy más poblado que Alcalá de Henares, pero el Excel los lista al revés) — irrelevante para el resultado, ya que los propios valores de las 14 columnas son datos simulados, no reales, así que no hay un "orden correcto" objetivo que preservar más allá de mantener cada una de las 10 ciudades ya nombradas emparejada consigo misma.
- **Motivo**: con datos explícitamente simulados, la prioridad era (1) no inventar una identidad falsa para las 10 ciudades reales ya nombradas, y (2) dar al resto de municipios placeholder una identidad real y verificable, en un orden plausible (por tamaño) aunque no sea la fuente exacta del Excel original.
- **Consecuencias**: los 2 municipios de Madrid que ya existían como territorio antes de esta tarea (`T014` Talamanca del Jarama, `T005` Montejo de la Sierra) se localizaron por nombre dentro de esta lista de 179 y **reutilizaron sus IDs existentes** en vez de crear duplicados — de paso se corrigió el nombre de `T014` al oficial "Talamanca de Jarama" (sin "del"), tomado de la fuente IGN/INE. Cualquier futuro municipio de otra provincia que se añada debería seguir el mismo patrón: comprobar primero si ya existe como territorio por nombre antes de mintar un ID nuevo.

---

## 2026-08-03 — Fase 1: cómo cumplir UUID, historial y "nunca se elimina conocimiento" sin romper lo existente

- **Problema**: la llegada de los 13 documentos normativos (`/docs`) impone cuatro requisitos transversales que la implementación existente no cumplía: UUID en toda entidad, autor en toda entidad, historial de toda modificación, y nunca eliminar conocimiento. La plataforma ya tenía ~210 territorios, 20 retos, 60 soluciones, 41 indicadores y 17.000 observaciones con IDs de texto legibles y borrado físico.
- **Decisión 1 — UUID junto al id, no en lugar del id** (elegida por el usuario): se añade `uuid uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE` a las 16 tablas de entidad, pero el `id` de texto (`T003`, `O001`, `IND_AGUA_CALIDAD`, `TMAD001`…) sigue siendo la clave primaria y el identificador público. Motivo: ese id está incrustado en las URLs (`?nivel=indicador&id=IND_AGUA_CALIDAD`), en los registros de iconos (`INDICATOR_ICONS`, `MARKER_ICONS`, `METRIC_ICONS`), en los archivos GeoJSON (`territoryId`) y en 9 scripts de siembra. Migrarlo habría roto funcionalidad a cambio de nada funcional: la Constitución pide un identificador permanente y único, y ahora lo hay. Consecuencia: las entidades nuevas (usuarios, publicaciones, productos…) podrán usar `uuid` como clave primaria desde el principio; las antiguas conviven con ambos.
- **Decisión 2 — una tabla de historial polimórfica, no una por entidad**: `04_DATABASE.md` propone `publication_history`, `challenge_history`, `product_history`… Se implementa una única `entity_history` (`entity_type`, `entity_id`, `entity_uuid`, `version`, `operation`, `snapshot` jsonb, `previous` jsonb, `changed_by`, `changed_at`). Motivo: la misma garantía (el `snapshot` guarda la fila completa, así que cualquier versión pasada se reconstruye íntegra) sin tener que crear y mantener sincronizada una tabla nueva cada vez que crece el dominio — y el dominio va a crecer mucho en las fases siguientes. Consecuencia: consultar el historial de cualquier entidad es una sola consulta con el mismo formato; si en el futuro alguna entidad necesita campos de historial propios, puede añadirse su tabla específica sin quitar esta.
- **Decisión 3 — archivar en vez de borrar** (elegida por el usuario): `handleDeleteEntity` pasa a ser `handleArchiveEntity` y hace `UPDATE ... SET archived_at = now()` en vez de `DELETE`. La ruta HTTP sigue siendo `DELETE /api/data/:entity/:id` para no romper el cliente; lo que cambia es la semántica. **Todas** las lecturas filtran `archived_at IS NULL` (19 consultas parcheadas: listados `/api/data/*`, las 4 consultas de retos del explorador, hijos indicador/marcador/métrica, causas de un reto, soluciones por reto, metadatos de indicadores y el `getTable` genérico). Las filas de las tablas de unión **no** se borran al archivar, de modo que restaurar devuelve la entidad con todas sus relaciones intactas (verificado: archivar y restaurar R017 conserva sus 6 causas con sus pesos).
- **Decisión 4 — archivar un padre con hijos vivos se rechaza**: al pasar de borrado físico a archivado se perdía la protección que antes daban las claves foráneas (no se podía borrar un indicador con marcadores). Se reintroduce explícitamente con `ARCHIVE_BLOCKERS`: archivar un objetivo con indicadores activos, un indicador con marcadores activos, un marcador con métricas activas o un territorio con territorios hijos devuelve HTTP 409 con un mensaje claro. Motivo: mantener el criterio "seguro por defecto" ya adoptado el 2026-08-03, y evitar hijos visibles colgando de un padre oculto.
- **Decisión 5 — autor vía cabecera hasta la Fase 2**: no hay sistema de sesiones todavía, así que `actorFromRequest()` lee la cabecera `x-user-id` y cae a `null`. Es el único punto que habrá que cambiar cuando exista autenticación real. `bumpAudit()` se aplica DESPUÉS del upsert en vez de modificar las ~11 ramas `ON CONFLICT DO UPDATE` existentes: mismo resultado, sin tocar ninguna rama ya probada.
- **Endpoints nuevos**: `POST /api/data/:entity/:id/restore` (restaurar), `GET /api/data/:entity/:id/history` (historial completo) y `GET /api/data/:entity/archived` (papelera).
- **Interfaz**: el botón "Eliminar" del `EditModal` pasa a llamarse "Archivar", en ámbar en vez de rojo, con explicación al pasar el ratón. No se ha eliminado ninguna funcionalidad: lo que antes borraba, ahora archiva y puede deshacerse.

---

## 2026-08-03 — Claves de Stripe: aportadas en producción, aparcadas sin activar

- **Problema**: el usuario dejó las claves en `plataforma-evolucion-humanidad/Claves API Stripe/` (dos `.rtf`) para integrarlas "al final". Resultaron ser `sk_live_` y `pk_live_`, de PRODUCCIÓN, cuando lo acordado era usar claves de test. La carpeta además no estaba en `.gitignore`.
- **Decisión**: (1) añadir al `.gitignore` la carpeta y los patrones `*.rtf`, `secrets/`, `*.pem`, `*.key` — comprobado que la carpeta no llegó a subirse a GitHub; (2) mover las claves a `.env` (ya ignorado) pero **aparcadas** en `STRIPE_SECRET_KEY_LIVE` / `VITE_STRIPE_PUBLISHABLE_KEY_LIVE`, que el código NO lee; (3) dejar `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY` y `STRIPE_WEBHOOK_SECRET` **vacías**, que son las que sí lee el código.
- **Motivo**: construir y probar un marketplace contra claves de producción genera cobros, altas de Stripe Connect y suscripciones reales. Con las variables activas vacías, nada de lo que se desarrolle puede tocar dinero real por accidente. Pasar a producción es copiar los valores `_LIVE` a las variables activas, una acción deliberada de una sola línea.
- **Nota**: la clave secreta aportada es DISTINTA de la que se expuso al inicio del proyecto, lo que indica que aquella sí se revocó.

---

## 2026-08-03 — Fase 2: autenticación real. scrypt nativo, sesiones en base de datos y roles verificados en el servidor

- **Problema**: hasta ahora el "acceso de administrador" comparaba email y contraseña **literalmente en el código del cliente** (`AuthContext.tsx`) y guardaba `{email, isAdmin:true}` en `localStorage`. Eso significaba que (a) las credenciales de administrador eran legibles por cualquiera que abriese las herramientas de desarrollo, y (b) bastaba escribir ese objeto a mano en `localStorage` para obtener todos los permisos de administración. Todos los controles de la interfaz (`user?.isAdmin`) dependían de ese valor falsificable.
- **Opciones consideradas para el hasheo**: (a) `bcrypt` (requiere compilación nativa); (b) `argon2` (idem, y más pesado de instalar); (c) `bcryptjs` (JS puro pero lento y sin mantenimiento activo); (d) `crypto.scrypt`, incluido en la librería estándar de Node.
- **Decisión tomada**: (d) `scrypt` nativo, con N=16384, r=8, p=1, sal aleatoria de 16 bytes por usuario y comparación en tiempo constante (`timingSafeEqual`). Formato almacenado: `scrypt$N$sal_hex$hash_hex`.
- **Motivo**: scrypt es un KDF diseñado específicamente para contraseñas (memoria-duro, resistente a GPU/ASIC), está en la librería estándar y no añade ninguna dependencia ni compilación nativa que mantener. La única ventaja real de bcrypt/argon2 aquí sería la familiaridad, no la seguridad.
- **Opciones consideradas para la sesión**: (a) JWT firmado; (b) token opaco aleatorio con tabla `sessions`.
- **Decisión tomada**: (b), cookie `httpOnly; SameSite=Lax` (más `Secure` en producción) con un token aleatorio de 32 bytes, respaldado por la tabla `sessions`.
- **Motivo**: un JWT no se puede revocar antes de que caduque — cerrar sesión o expulsar un dispositivo comprometido no surte efecto real. Con tabla de sesiones, revocar es un `UPDATE` inmediato, y además queda rastro auditable de accesos (IP, user-agent, última actividad), que es lo que pide el principio de trazabilidad. Al ser `httpOnly`, el JavaScript de la página no puede leerla ni falsificarla, que era exactamente el fallo del sistema anterior.
- **Consecuencias importantes**:
  - El nivel de rol **solo** lo determina el servidor a partir de la fila de `users`. `PUT /api/auth/me` ignora deliberadamente cualquier `role_level`/`isAdmin` que llegue en el cuerpo (verificado: enviarlos no cambia nada). Ascender a alguien exige `PUT /api/admin/users/:id/role` con nivel 4.
  - Un administrador no puede reducir su propio nivel, para no dejar la plataforma sin ningún administrador por accidente.
  - Cambiar o restablecer la contraseña revoca las demás sesiones abiertas.
  - Login y "he olvidado mi contraseña" devuelven la misma respuesta exista o no la cuenta, para no revelar qué emails están registrados.
  - `actorFromRequest()` en `server.ts` pasa a leer `req.user.id`, de modo que la autoría y el historial de la Fase 1 quedan atribuidos al usuario real. La cabecera `x-user-id` se conserva solo como respaldo para scripts de siembra, que no tienen cookie.
- **Decisión sobre la verificación de email**: los usuarios se crean con `email_verified = true` porque todavía no hay proveedor de correo configurado (instrucción explícita del usuario: "el tema del correo avanza sin verificación primero"). La estructura completa (`password_resets`, endpoints de olvido/restablecimiento) sí está construida y probada; en desarrollo el token se devuelve en la respuesta para poder probar el flujo, y está explícitamente condicionado a `NODE_ENV !== 'production'`. Activar la verificación real será poner ese campo a `false` y enchufar el envío.
- **Nota de arquitectura**: todo vive en `src/server/auth.ts` como módulo independiente que se registra con `registerAuthRoutes(app, db)`, cumpliendo el requisito de modularidad de `03_ARCHITECTURE.md`. Exporta también `requireLevel(n)` como guarda reutilizable para los módulos de las fases siguientes.

---

## 2026-08-03 — Fase 9: el modelo de IA nunca escribe en la base de datos

- **Problema**: el encargo pide que la IA "pueda ejecutar cualquier acción permitida por el rol del usuario" — crear retos, productos, publicaciones, editar indicadores. Darle al modelo capacidad de escritura directa es la forma más rápida de conseguirlo y también la más peligrosa: una alucinación, o una instrucción inyectada en un dato que el modelo lea, se convertiría en una escritura real.
- **Opciones consideradas**: (a) dar al modelo herramientas que escriban directamente; (b) que el modelo solo devuelva intención + parámetros, y que un "agente de acciones" del backend valide y ejecute.
- **Decisión tomada**: (b), que además es lo que pide literalmente el encargo ("Claude nunca modifica directamente la base de datos"). El modelo devuelve un bloque JSON delimitado con `ui_events` y `actions`; las acciones se guardan en `ai_proposed_actions` con estado `propuesta` y **nunca** se ejecutan en la misma petición.
- **Tres controles independientes** antes de que algo se escriba:
  1. **Catálogo cerrado**: solo existen 11 tipos de acción (`ACTION_CATALOG`), cada uno con su nivel mínimo. Cualquier otra cosa que devuelva el modelo se descarta.
  2. **Modo de edición** elegido por el usuario: `manual` (no se generan acciones en absoluto), `aceptar` (cada acción exige un Sí/No explícito) o `autonomo`.
  3. **Revalidación en el momento de ejecutar**: el permiso se comprueba otra vez al aplicar, no solo al proponer. Si el rol del usuario cambió entre medias, la acción se rechaza.
- **Motivo**: separar "lo que la IA quiere hacer" de "lo que el sistema permite hacer" convierte un fallo del modelo en una propuesta rechazada, no en un dato corrupto. Y deja auditoría completa: toda propuesta queda registrada con quién la decidió y cuándo, aceptada o no.
- **Consecuencia**: añadir una capacidad nueva a la IA es añadir una entrada al catálogo y su implementación en `executeAction`, no ampliar los permisos del modelo.

---

## 2026-08-03 — Capa de proveedor de IA independiente del modelo

- **Problema**: el encargo pide preparar la arquitectura para conectar OpenAI, Gemini, Mistral o Llama además de Claude "sin modificar el resto de la aplicación".
- **Decisión tomada**: `src/server/ai/provider.ts` define la interfaz `AIProvider` y un registro de proveedores. Ningún otro archivo importa el SDK de un proveedor concreto. Añadir un modelo nuevo es implementar la interfaz y registrarlo.
- **Decisión secundaria**: se llama a la API de Anthropic por HTTP directamente en vez de añadir el SDK oficial como dependencia — son dos peticiones `fetch` y evita arrastrar un paquete más y sus actualizaciones. Si en el futuro se necesitan funciones avanzadas del SDK, se cambia dentro de `ClaudeProvider` sin tocar nada más.
- **Consecuencia**: mientras `ANTHROPIC_API_KEY` esté vacía, el asistente está construido y enrutado pero responde HTTP 503 con un mensaje que explica exactamente qué falta, en vez de fallar de forma opaca. La interfaz lo muestra en el propio panel.

---

## 2026-08-03 — El antiguo ChatAssistant deja de montarse (no se borra)

- **Problema**: ya existía un `ChatAssistant` flotante en la esquina inferior derecha, exactamente donde el encargo pide el nuevo asistente IA. Dos burbujas flotantes simultáneas sería confuso.
- **Decisión tomada**: `Layout.tsx` pasa a montar `AIAssistant` en su lugar. El archivo `src/components/ui/ChatAssistant.tsx` **se conserva intacto** en el repositorio, respetando la instrucción del usuario de no eliminar componentes.
- **Motivo**: sustituir el punto de montaje es reversible en una línea; borrar el componente no lo sería.

---

## 2026-08-04 — Activación del asistente IA: dos fallos reales encontrados al probarlo con la clave real

- **Contexto**: el usuario proporcionó `ANTHROPIC_API_KEY` para activar el asistente construido en la Fase 9. Al hacer la primera pregunta real ("explícame el reto de nitratos y la solución del Arroyo Norte"), el asistente respondió que no tenía ningún dato en la plataforma, a pesar de que los datos existían (sembrados y verificados el día anterior). Se investigó y se encontraron dos fallos reales, no uno:
  1. **La búsqueda directa comparaba el título contra la pregunta completa**, no contra palabras clave: `WHERE title ILIKE '%' || pregunta_completa || '%'` nunca puede coincidir, porque un título corto ("Contaminación por nitratos del agua") jamás es substring literal de una frase larga como "Explícame en dos frases el reto de contaminación por nitratos...". Se corrigió extrayendo palabras clave (con una lista de palabras funcionales excluidas: "explícame", "cuáles", "está"...) y comparando cada una por separado.
  2. **La tabla `ai_knowledge_chunks` (el índice de texto completo del RAG) estaba vacía**: el endpoint `/api/ai/admin/reindex` se había construido pero nunca se había ejecutado. Se ejecutó una vez (479 fragmentos indexados) y se documenta aquí como paso manual pendiente tras sembrar contenido nuevo — no hay reindexado automático todavía.
  3. **Fallo adicional al corregir (1)**: la primera corrección usó `ILIKE ANY(${array})`, que con este driver interpola cada elemento del array de JavaScript como un parámetro posicional suelto (`$1,$2,$3...`) en vez de como un array nativo de Postgres — `ANY(($1,$2,$3))` es sintaxis de fila (row), no de array, y Postgres la rechaza. Se corrigió construyendo el array explícitamente con `ARRAY[...]` a partir de los mismos parámetros ligados (`sql.join`), que sí es válido y mantiene cada valor protegido de inyección.
- **Verificado tras corregir los tres**: la misma pregunta ahora responde citando datos reales (reducción de nitratos de 62 a 28 mg/l, humedal de 1,2 ha, 8 sensores) con **12 fuentes de la plataforma** correctamente referenciadas (retos, productos, iniciativas, demandas, caso de éxito, publicaciones). Probado también desde el navegador: "Llévame al municipio de Talamanca" identifica correctamente el territorio T014 con el origen "de la plataforma" marcado.
- **Motivo para registrar esto con detalle**: es exactamente el tipo de fallo silencioso que la Fase 9 pretendía evitar mediante fuentes citadas — el sistema, en vez de alucinar una respuesta, dijo honestamente "no tengo datos", lo cual demuestra que las salvaguardas contra inventar información funcionan incluso cuando la recuperación falla. El fallo estaba en la recuperación (RAG), no en el modelo ni en sus salvaguardas.
- **Pendiente para el futuro**: automatizar el reindexado (al terminar cada script de siembra, o con un disparador periódico) en vez de exigir que un administrador lo ejecute a mano tras cada cambio de contenido relevante.

---

## 2026-08-04 — Fase 6: Stripe Connect no se puede activar sin un paso manual del usuario

- **Problema**: al probar el onboarding de Stripe Connect recién construido, la API rechazó la creación de la cuenta Express con: *"You can only create new accounts if you've signed up for Connect, which you can do at https://dashboard.stripe.com/connect."* No es un fallo de código: es una función de la plataforma Stripe (Connect) que hay que activar una vez, a mano, desde el panel de Stripe de la cuenta — algo que solo puede hacer el titular de la cuenta.
- **Decisión tomada**: no intentar rodear ni ocultar esto. El endpoint deja el error de Stripe tal cual (mensaje descriptivo, no genérico), y se documenta como paso pendiente del usuario en `04_ROADMAP.md`. El resto de la Fase 6 (Checkout embebido de productos, panel financiero, reembolsos, webhooks) no depende de Connect y se verificó funcionando sin él — el pago simplemente no se reparte automáticamente con el vendedor mientras Connect no esté activo (`split: false`), que es el comportamiento degradado correcto, no un error.
- **Verificación realizada sin necesitar Connect ni el CLI de Stripe** (no instalado en este entorno): se creó una sesión de Checkout embebida real contra la API de Stripe (confirmada en el navegador, con el sello "TEST MODE" de Stripe), y se probó el flujo completo de creación de transacción enviando un evento sintético de `checkout.session.completed` directamente al propio endpoint de webhook — válido porque `STRIPE_WEBHOOK_SECRET` está vacío (sin proveedor de correo/CLI configurado todavía) y el código ya contempla ese caso (analiza el cuerpo como JSON en vez de verificar la firma). Se confirmó la fila de `transactions` creada, enlazada al grafo, reflejada en el panel financiero, y un intento de reembolso rechazado limpiamente por Stripe al no existir un pago real (prueba de que el endpoint llama de verdad a la API, no simula nada).
- **Consecuencias**: para poder probar Connect de verdad, el usuario debe visitar `https://dashboard.stripe.com/connect` y activarlo en su cuenta de test. Es un paso de configuración de cuenta, no algo que se resuelva con código.

## 2026-08-04 — El SDK de Stripe cambió de nombre un método en tiempo de ejecución: dos sitios con el mismo fallo latente

- **Problema**: al probar el Checkout embebido en el navegador por primera vez, falló con: *"stripe.initEmbeddedCheckout() has been removed. Please use stripe.createEmbeddedCheckoutPage() instead."* El código (tanto el nuevo `EmbeddedCheckoutModal.tsx` como el ya existente `HazteSocio.tsx`) comprobaba `typeof stripeAny.initEmbeddedCheckout === 'function'` como condición PRIMERA, asumiendo que si el método no existiera sería `undefined`. Pero el SDK real de Stripe se carga en tiempo de ejecución desde `js.stripe.com` (no desde `node_modules/@stripe/stripe-js`, que es solo un cargador ligero), y en la versión servida ahora mismo `initEmbeddedCheckout` **sigue existiendo como función** pero lanza esa excepción al ser llamada, en vez de no existir — la detección por `typeof` no puede distinguir "no existe" de "existe pero está descontinuada".
- **Decisión tomada**: invertir el orden de la comprobación en los dos sitios: probar primero `createEmbeddedCheckoutPage` (el nombre nuevo) y caer a `initEmbeddedCheckout` solo si aquel no existe.
- **Motivo para documentarlo con este detalle**: es un fallo que ya existía en `HazteSocio.tsx` desde antes de esta sesión (no lo introduje yo), simplemente nunca se había ejercitado con el SDK real en esta fase del proyecto. Al encontrarlo en el componente nuevo, se corrigió también en el existente por ser exactamente la misma causa raíz — dejarlo sin corregir habría sido dejar conscientemente un flujo de pago roto sabiendo la causa exacta.
- **Consecuencias**: cualquier integración futura con Stripe que use detección de métodos por `typeof` debe tener en cuenta que el SDK cargado en el navegador no es el paquete de `node_modules` — su API real solo se conoce probándola en directo.

## 2026-08-08 — A recycle bin, as an explicit exception to Constitution rule 6

**Context.** Rule 6 of `docs/99_CONSTITUTION.md` forbids deleting knowledge: everything is
archived with `archived_at` and kept forever. Building the Miro-style canvas, Eugenio was
asked what «Borrar» should do in the element menu.

**His decision (verbatim).** «Cuando se borra del lienzo, sigue como elemento disponible en
la base de datos, pero también se le da al usuario la opción de borrar definitivamente de la
base de datos. Cuando lo borras, se va a la papelera de reciclaje durante 15 días, y luego se
elimina definitivamente.»

**What was built.** Two distinct actions, deliberately worded so nobody destroys anything by
accident:
- **Quitar del lienzo** — deletes only the placement (`graph_windows` row) and this canvas's
  edges. The window stays in the database and on every other canvas. Reversible by re-linking.
- **Borrar** — sets `knowledge_windows.deleted_at`. A daily sweep hard-deletes anything past
  15 days, first releasing its foreign keys (placements, edges, ratings, comments).

**Why `deleted_at` and not `archived_at`.** They mean different things and mixing them would
be dangerous: `archived_at` is editorial withdrawal kept forever; `deleted_at` is «the person
asked for this to disappear». Keeping them in separate columns guarantees the purge sweep can
never reach something that was merely archived by another flow.

**What it costs.** Rule 6 no longer holds literally for knowledge windows. Anyone reasoning
about permanence must read this entry. If the rule is ever restored, the fix is one line —
turn the sweep off — and nothing older than 15 days would have been lost in the meantime.

---

## 2026-08-18 — The Juego Vital is a view, not a parallel world

**Decision.** The 3D game (`/juego`, design in `10_JUEGO_VITAL.md`) renders EXISTING entities
(projects, publications, tasks, people, challenges) and writes through the EXISTING routes.
It gets no schema of its own until the Builder needs to persist positions (F2: `game_worlds`,
`game_objects`). In F1 the village layout is deterministic from a seeded PRNG.

**Alternative rejected.** A `game_*` schema mirroring entities into game objects. Rejected
because every mirror table is a synchronisation bug waiting to happen, and because the
platform already owns visibility, trash, history and roles — the game inherits them for free
only if it reads the real rows.

**What it costs.** Until F2, moving a building is impossible (layout is code). Accepted:
walking your real life was the thing to validate first.

**Also decided (product, Eugenio):** stylized HD art over photorealism; mobile+desktop from
day 1; landscape-only play on phones; photo→3D as library-match now, paid generation later;
person avatars ship only with the consent safeguards written in `10_JUEGO_VITAL.md`; no
unofficial WhatsApp bridges (ban risk on his personal number) — `wa.me` deep links in F3.

---

## 2026-08-18 — Las migraciones las aplica el despliegue, no una persona

**Decisión.** `deploy/migrate.sh` corre en cada despliegue, ANTES de reconstruir la app.
Lleva su propio registro (`schema_migrations`, una fila por fichero de `drizzle/`), aplica
solo lo pendiente, en orden y cada fichero dentro de una transacción. Si algo falla, el
script sale con error, `script_stop: true` aborta el job y **el código nuevo no llega a
arrancar**: la app vieja sigue en pie con el esquema que ya tenía.

**Por qué.** Hasta hoy se aplicaban a mano por SSH después del despliegue. Ese hueco ya
mordió: el builder del Juego Vital estuvo listo para fusionar con su tabla sin crear en
producción, y detectarlo dependió de acordarse. Un paso manual que hay que recordar en
cada migración no es un proceso, es una apuesta.

**Línea base.** La primera ejecución marca como aplicadas todas las migraciones hasta
`0028_presentaciones.sql` — el estado real de producción, confirmado en el changelog
(0025/0026 el 2026-08-07; 0027 y 0028 después). Solo se hace si la tabla de registro
acaba de nacer Y la base ya tiene esquema (`users` existe): en una base nueva y vacía no
se marca nada y se aplica todo desde `0000`.

**Alternativa descartada.** `drizzle-kit migrate` en el arranque de la app: acopla el
esquema al ciclo de vida del contenedor (dos réplicas migrarían a la vez) y este proyecto
ya tiene prohibido `drizzle-kit push` por colgarse en shells no interactivas.

**Coste.** Las migraciones tienen que ser correctas al fusionar, no "arreglables luego a
mano". A cambio, desplegar deja de tener un paso que solo existe en la cabeza de alguien.
Verificado antes de tocar producción ejecutando la misma lógica contra la base local: 29
marcadas como línea base, 0029 aplicada, y una segunda pasada sin cambios.

## 2026-08-20 — Open models served by Together AI, chosen over DeepSeek's own API

**Decision**: the two free chat models (`abierto-rapido` = DeepSeek V4 Flash,
`abierto-medio` = Qwen3.7-Plus) are served by Together AI.

**Alternatives considered**: DeepSeek's own API (rejected: more expensive even
off-peak — $0.22–0.44/$0.66–1.32 vs Together's $0.14/$0.28 per Mtok, only
DeepSeek models, and data processed in China with GDPR still pending on the
roadmap); Fireworks/Groq/DeepInfra (viable, noted as fallbacks; not worth a
second account today); OpenRouter (useful as a testing bench, adds a fee).

**Reversibility**: the connector speaks the OpenAI chat format — the de facto
standard shared by all of the above. Switching provider is `ABIERTO_BASE_URL` +
`ABIERTO_API_KEY` (+ per-model id overrides), no code. Catalog ids are OUR
aliases (`abierto-*`) precisely so stored usage rows and user preferences
survive a provider change.

## 2026-08-20 — Model router: fixed rules, not an LLM choosing an LLM

**Decision**: `elegirModelo()` in provider.ts routes each chat message with
deterministic rules (manual pick → gate by level; PDF/web-search → Claude;
action-verbs regex or >700 chars → top tier available; <180 chars → fast model;
else medium). Premium = role level ≥ 2 (VERIFIED), Claude cost covered by the
platform up to `AI_TOPE_PREMIUM_CENTS` (default 300 ¢/month/user), then
auto-downgrade with a visible notice. Both decisions are Eugenio's
(2026-08-20), including "cost included" over pay-per-use.

**Alternative rejected**: a classifier LLM picking the model — one more call,
one more cost, one more failure point, to save céntimos. Free-user actions go
to the open medium model on purpose: the proposal/validation safety net
(server validates, user confirms) already bounds the damage of a weaker model.

---

## 2026-08-22 — A debate may have no territory

**Context**: constitution rule 3 says every entity belongs to a territory. The
veracity area (`memory/13_VERACIDAD.md`) stores debates, and a thesis like «is
nuclear the fastest way to decarbonise» is not Spanish or Andalusian.

**Decision**: `debates.territory_id` is nullable, and NULL means *global* — not
a territory that is missing, but a debate that has none. A debate about a
territory's water still carries its territory and is found by it.

**Alternative rejected**: forcing a territory and defaulting to the world or to
the author's own. Both invent a datum to fill a box, and an invented datum that
looks correct is exactly the failure this project has paid for most (see the
`grupos[0]` fallback, 2026-08-20).

**Status**: divergence from the constitution, **confirmed by Eugenio on 2026-08-22**.
`docs/` is not touched — the specification is his. If he prefers the rule kept,
the fix is one migration (`SET NOT NULL` plus a global territory row) and no
application code.

---

## 2026-08-23 — Las dos rutas `resolve` se quedan, aunque no las llame nadie

**Contexto**: `GET /api/graphs/resolve` y `GET /api/publications/resolve`
(`src/server/knowledge.ts`) eran el camino rápido del chat para abrir un grafo o
una publicación sin gastar IA. Su único cliente dejó de poder llamarlas el
**2026-08-20** (`99446b3`, «One assistant everywhere»): la llamada quedó detrás
de `mode !== 'dock'` y `mode` pasó a ser la constante `'dock'`. El código muerto
del cliente se retiró en la #330; las rutas siguen ahí, sin nadie que las use.

**Opciones consideradas**:
1. Borrarlas ahora. Ahorro real: cero — son dos manejadores registrados.
2. Registrar cada llamada y esperar dos o tres semanas antes de decidir.
3. Dejarlas, con el criterio de borrado escrito.

**Decisión**: la 3.

**Motivo**: el motivo para no borrarlas **no es técnico**.
`docs/12_KNOWLEDGE_GRAPHS.md` («Resolución desde el chat/buscador») nombra
`GET /api/graphs/resolve` como el **«Fast-path sin IA»**, y `docs/` es la
especificación de Eugenio. Borrar la ruta sin más sería incumplir la
especificación por la puerta de atrás.

**Y el matiz que lo resuelve: la promesa del documento se sigue cumpliendo.** El
camino rápido sin IA existe hoy — lo hace `/api/search` desde la #290, y con más
alcance: busca en las 20 tablas del grafo, no solo en grafos y publicaciones. Lo
que sobra es **la implementación vieja, no la función**. Esto es lo que hace que
la divergencia sea de forma y no de fondo, y por eso queda aquí anotado en vez
de tocar `docs/`.

La opción 2 se descartó por lo que cuesta de verdad: no escribir el registro,
sino leerlo. Un pendiente que depende de que alguien lea un fichero de registro
dentro de tres semanas es un pendiente que no se hace.

**Consecuencias**: las dos rutas siguen respondiendo, **públicas y sin sesión**,
como han estado siempre. Se borran cuando alguien toque `knowledge.ts` por otro
motivo, y ese día esta entrada dice por qué se pueden borrar sin incumplir nada.
Ver la deuda con su criterio en `09_TARGET_ARCHITECTURE/02_TECH_DEBT.md`.

**Lo que NO demuestra la medición por ruta**, por si alguien la usa para esto:
`src/server/medicion.ts` vive en memoria y se pierde en cada reinicio, y cada
despliegue reinicia. Sirve para «qué se está pidiendo ahora», nunca para «desde
cuándo no lo pide nadie».
## 2026-08-22 — Who opens a debate, and who closes it

**Context**: the veracity area needed a permission level for each operation, and
`src/server/CLAUDE.md` says to reuse the catalogue rather than invent a policy
per endpoint.

**Decision**, confirmed by Eugenio the same day:

| Operation | Level | Why |
|---|---|---|
| Open a debate, argue, cite a source | 1 (USER) | Same standing as publishing. A thesis asserts nothing about the commons: it asks. What it costs to be wrong is an argument against, which is what the thing is for |
| Close or reopen a debate | 3 (KNOWLEDGE) | Saying "this discussion is over" is a judgement about the commons |
| Move the veracity badge to verificada / disputada / refutada | 3 (KNOWLEDGE), **and never your own argument** | Signing your own claim as verified is not a review, it is an assertion with extra steps. An admin is not exempt: the rule is about who wrote it, not about rank |
| Move it to sin_fuente / con_fuente | **nobody** | Those two follow the citations. A hand that could set them would make the badge say something the sources do not |

**Alternative rejected**: level 2 (VERIFIED) to open a debate. It would have made
the area quiet by default, and a debate with nobody in it is worth less than a
wrong debate somebody corrects.

**Consequence**: `refutada` and `disputada` demand a written reason. Marking
something false without saying why leaves the author nothing to answer and the
reader nothing to check — the same rule as citing a source for a figure.

## 2026-08-26 — The trunk of knowledge is a GRAPH, not a tree (prog2)

Eugenio asked for a tree above the wheel: root "Red de Conocimiento" → three
areas (social / ecology / technology) → the fifteen objectives → down to
millions of pages, "each page linked like a mycelium to different branches".

**The decision, and it was his.** I offered a tree (one mother per branch) and a
graph (several). I recommended the tree and said why: with two mothers the same
branch is drawn in two places and "where does this live?" stops having one
answer. He chose the graph. Recorded here so that in a year it reads as a
decision, not an oversight.

**What the graph costs, concretely, and what was built to pay it:**

| Cost | Paid with |
|---|---|
| A cycle makes the drawing recurse forever — the browser hangs, no error | `seLlegaBajando` runs before every write. It carries a `vistos` set, which is not an optimisation: without it, a graph that already has a cycle hangs the very check meant to prevent one |
| Removing the last mother leaves a branch written but undrawable — alive in the database, invisible | `DELETE /api/tronco/arista` refuses the last edge and says why |
| The same node drawn twice reads as a duplicate someone will "fix" by deleting one | Nodes are keyed by PATH, not id; repeats are hollow, dashed, say "·también aquí", and do not expand — so their children are counted once, not twice |

**Two tables for one tree, on purpose.** `tronco_aristas` holds root → branches →
objectives; `subtemas` (0120) holds everything below. It looks like duplication
and is not: above there are fifteen names the house decides and that change once
a year; below, a million the public proposes, changing hourly. Different write
rates, different guarantees, different tables.

**The mycelium needs no new table.** `subtema_contenido` has been many-to-many
since 0120, so a page already hangs from as many subthemes as it likes. The rule
is: *a branch has one place, a page has many* — and that is what keeps the
left-to-right drawing drawable.

**The reparto is A, and its number is 7.** SOCIAL carries 7 of the 15. I said a
branch holding half of everything does not sort anything, and offered a 5×3
alternative. He chose A. Phase 1 is draggable precisely so that number can be
felt and changed by looking, not argued.

## 2026-09-30 — Carpetas reuse the `proyectos` table instead of a new one

**Context.** Eugenio renamed projects to folders that hold pages only.

**Options.** (a) A new `carpetas_paginas` table and move pages over; (b) keep
`proyectos` as the folder and change what the product does with it.

**Chosen: (b).** Pages already hung from projects through
`knowledge_windows.proyecto_id` (0043), and shared links, `/@who/slug`, custom
domains (`dominios_paginas.entidad_tipo = 'proyecto'`) and the share registry
all key on the project row. A new table would have broken every one of them
for a rename. The name `carpetas` was also taken: 0024's bookmark folders for
publications (`/api/carpetas`, `ORGANIZAR_CARPETAS`) — a different feature.

**Cost.** Internal names say `proyecto` while the product says `carpeta`
(`/api/proyectos`, `tipo: 'proyecto'`, `proyecto_id`). Renaming them is a
multi-table migration plus every client; not worth it until something else
forces it.

**Rescue, not move.** What a project held that is not a page was *copied* into
pages (0132), and the originals were left in place: tasks still live in
`roadmap_items` and show in `/tareas`. Nothing was deleted, so the rescue can be
redone or improved later without data loss.

## 2026-10-02 — Filling databases by chat with a model on our own server (recipes, not prompts)

**Context.** Eugenio: filling a site's databases by talking to the chat must cost
nothing — no credits on any external AI — and the AI should only *understand*
the request; *how* to do it must be preprogrammed.

**Architecture (`src/server/rellenarPorChat.ts`, `src/server/iaLocal.ts`).**

| Layer | What it does | Model? |
|---|---|---|
| Gate | Is this about data? (data verb, a table name or one of its words, or an existing entry + a column) | No |
| Rules | Form-like sentences: «añade a Productos: Miel, precio 12 €», «cambia el precio de Miel a 14» | No |
| Local model | Free-form sentences → slots of a recipe, output forced into a JSON schema whose enums are the page's real table and column names | Qwen2.5-1.5B on llama.cpp, in our container |
| Guard | Drops any value the person did not say (measured: the model invents prices and categories), recovers original casing, converts spoken dates, turns «add» of an existing name into «edit» | No |
| Typing | Every value through the grid's own `tipar`; select options matched by label | No |
| Proposal | Shown as a card; nothing is written until «Guardar» | — |
| Save | Re-validates everything server-side, then `bdInterno.crearFila` + `bdInterno.escribirCeldas` — the same permission and validation path as the grid | No |

Recipes today: `anadir_entrada`, `editar_entrada`. Adding one = a case in
`construirPropuesta` + `guardar` and its name in the schema enum.

**Why not let the model write.** House rule: a bug that depends on the model
behaving is postponed, not fixed. A 1.5B model misreads; here a misread is a
card the person discards.

**Why this model.** 2 vCPU / 3.8 GB shared with the site. Qwen2.5-1.5B-Instruct
Q4_K_M: ~1.1 GB, Apache-2.0, good Spanish, 2–4 s per request on a laptop.
Container capped at 1.5 CPU / 1.8 GB, one request at a time, queue of 2, 15
requests per person per minute. The 3B would be better at understanding but
its licence is not Apache and it would not leave room on this machine.

**Never silently paid.** If the local model is down or busy the chat says so and
offers «Pedírselo a la IA de pago»; it never falls through to a paid model by
itself.

**`bd.ts` change.** The body of `PUT /api/bd/filas/:id` became
`escribirCeldas()` (exposed on `bdInterno`), unchanged in behaviour, so the
chat and the grid share one write path.

## 2026-10-05 — A feed per theme without a theme column: keywords with the badge on

**Context.** No table ties a page, a row or a folder to one of the 15 themes
(`objetivos.ts` says so; `subtema_contenido` exists but almost nothing uses
it). Eugenio wanted a landing with everything about a theme, mine and public.

**Options.** (a) Add `objetivo_id` to every content table and ask people to
classify; (b) classify with the local AI at write time; (c) search by
keywords at read time, and show which signal each card came from.

**Chosen: (c), with (a)'s existing links honoured first.** Classified items
(`subtema_contenido`, `publication_links`) come first and say «Del tema»;
everything else says «Por palabras». Nobody is told that a keyword match is a
classification — that was the rule written in `objetivos.ts` on 2026-08-21.

**What it cost to get the keywords right** (three rounds): sub-topic names
looked like free vocabulary and were not — «público», «personas», «carga»,
«crisis» pulled posts from other themes. Kept: the theme's hand-picked stems
(title: one; body: two, three in long texts) and sub-topic names as whole
phrases. Dropped: single sub-topic words. Recall is lower; precision was the
complaint every round.

**Next step when it hurts:** (b). The free local model (`iaLocal.ts`) could
tag pages on save into `subtema_contenido`, turning «Por palabras» into «Del
tema» over time without a schema change.

## 2026-10-06 — A shop inside a database: roles on existing types, a product behind each row

**Context.** Eugenio wants the page/database builder to double as a product
builder, Notion style: properties «Precio», «Variantes», «Envío» and a «Botón
de compra» with a units selector, created by hand like any other property.

**Options.** (a) A parallel shop on `bd_filas`: its own cart lines, checkout,
stock and orders keyed by row. (b) New column types `precio`, `envio`,
`variantes` everywhere a type is switched on. (c) Existing types plus a
`config.rol`, one new type (`compra`), and an ordinary `products` row behind
each selling row.

**Chosen: (c).** Cart, checkout, reservations, orders, payouts and receipts
are reused untouched; a «Precio» sorts, filters, sums and charts as the
`moneda` it is. New code: `bd/tienda.ts`, `BotonCompra.tsx`, five entries in
the property picker, migration 0144.

**The copy is made on READ, not on write.** A row changes through many doors
(cells, title, photos, renamed options, AI filling). Each read of a table
with a buy button hashes the relevant values per row and writes only when
`products.bd_huella` differs; rows that left the table archive their product.
Cost: one extra SELECT per read of a shop table. It also means an anonymous
read can write — but only a deterministic copy of the owner's own data.

**Known edges.** Editing a database-backed product in Comercio is overwritten
by the row on the next read (the row is the source). Variants are by name and
share the product price/stock. The unverified-seller cap (30) applies: rows
beyond it show the reason instead of a button.

## 2026-10-18 — Published pages carry their content in the server HTML (Wikiproducts W2, SEO R1/R3/R16)

**Context.** Public pages shipped title + description in the HTML and the body
only as JSON in `window.__SITIO__`. AI search crawlers (GPTBot, ClaudeBot,
PerplexityBot) do not run JavaScript, so they saw nothing else. Wikiproducts'
SEO plan (`/mnt/project-files/wikiproducto/seo/requisitos-tecnicos.md`) makes
this the top blocker.

**Options.** (a) Full React SSR + `hydrateRoot` of the reading view;
(b) a separate static block→HTML writer injected into `#root`, replaced by
`createRoot` when JS boots; (c) prerender per bot (cloaking, rejected).

**Chosen: (b)**, `src/server/htmlBloques.ts`. It already matched how the custom
domain header worked (`cabeceraSitio.tsx`), needs no change to the client, and
the reading components fetch their own data (`Rejilla`, `RelacionesPublicas`),
which makes (a) a rewrite. Same HTML for every visitor; it only writes what the
page shows when read. **Cost:** two renderers of the same blocks can drift. A
new block type that wants to be indexable must register a writer
(`registrarHtml`). Moving to (a) later means making the reading view
data-in/props-out first.

**Canonical (R3).** Every page now declares one canonical URL: its site's active
custom domain, else its user subdomain. 301 redirects from the other forms are
**not** done yet: they change behaviour for every existing site and wait for
Eugenio's OK.

**Known gaps.** The database table in the HTML ignores the view's filters and
sort (it lists rows in their stored order, capped at 500); relation, file and
computed columns are left to React. The row page's own properties are not in
the public reading view today, so they are not in the HTML either: W1's
`Propiedad` block will add them, with its writer.

## 2026-10-18 — Community ratings: one criterion = one computed column (`comunidad`)

**Context.** Wikiproducts (plan §2.3, 3.3, 3.10): members rate each product 1-5
on calidad, precio, garantía, ecología, salud, estética and ética, and each
distributor on atención al cliente; the gallery sorts by any criterion; the
ranking must never read commission.

**Options.** (a) A rating block with its own criteria list in `bloque.datos`
and a separate «sort by criterion» feature in the gallery. (b) A new computed
column type whose cell is the score, filled on read from a `valoraciones`
table, like the buy button is filled from `products`.

**Chosen: (b).** Sorting (`?orden=`), filtering, formulas, the public API, the
comparator and «la mejor en cada criterio» (W1) all read a number in a cell
with zero new code. The block reads the table's `comunidad` columns as its
criteria. Pieces: `drizzle/0152_valoraciones.sql`, `src/server/bd/comunidad.ts`
(the maths, pure), `src/server/valoraciones.ts` (routes), the block in
`src/components/bloquesDatos/valoracion/`.

**The numbers.** Bayesian with a neutral prior: (5·3 + Σ w·x)/(5 + Σ w),
verified buyer w = 2, nothing shown under 3 voters. The prior is the scale's
middle (3), not the table's mean: measured in `scripts/probar-valoraciones.ts`,
with the table's mean as prior one popular 4.6 product lifts the prior and
three 5s outrank it (4.75 vs 4.6). The adjusted note ORDERS; the plain mean is
what is SHOWN, because «3,75» for three people who all gave 5 reads as a bug.

**Verified buyer is read, not stored.** A paid/sent/delivered order of the
product behind the row, or behind a row that links to it (offer → distributor).
A refund removes the weight by itself. Cost: one CTE over `pedidos` per read of
a rated table, limited to people who voted.

**Commission.** `bd/comunidad.ts` receives votes and row ids, never row cells;
the test fails if the word appears in that file or if 50 random commission
changes move the order.

## 2026-10-18 — A database's sheet template is a page; sheet blocks decide once and paint twice (Wikiproducts W1)

**Template.** `bd_tablas.config.plantilla.pagina_id` points to an ordinary
private page. Rejected: a new «layout» object with its own editor (weeks, and a
second editor to maintain). Cost of the choice: the row page in the editor
shows only its own blocks, not the template's; the template is edited on its
own page. On publish, the ampliación (`server/bd/plantillaFicha.ts`) puts the
template's blocks in front of the row's.

**Decide once.** Every sheet block is drawn by React and again as server HTML
for crawlers (SEO R1). What each shows (which rows, who is best, which
sentence for an empty recall list) lives in pure functions
(`bloquesDatos/ficha/vistas.ts`); both painters only loop over the result.
Rejected: each painter deciding on its own — they would drift, and Google
penalises markup that differs from the visible page.

**Roles by config, never by name.** A column says what it is in
`config.ficha` (sheet role), `config.grupo`, `config.comparar`. W5's offers
use `config.rol` on the offers table (its contract); the schema sets both
where they meet (EAN has `ficha: 'gtin'` and `rol: 'gtin'`).

**Offers: one table per category**, each with a «Producto» relation
(`rol: producto`, `reciproca`) to its product table, as W5 reads them. A single
offers table would have needed five product columns, four empty per row. The
products' «price from/to» and «number of offers» are aggregates over that
relation seen from the product side (`direccion: destino`), so there is one
list of links, not two that can disagree.

**Provenance per cell** in `bd_filas.procedencia` (jsonb by column id), not a
side table: it travels with the row, is read in the same query, and adds no
junction table (CLAUDE.md rule 6).

## 2026-10-18 — Readable row URLs from a per-table template (Wikiproducts W2, SEO R2)

**Context.** Product sheets are database rows, each with its page at `/p/BDF…`.
SEO R2 asks for `/category/brand-model`. Agreed with W1 (product sheet) and W3
(data loading) through the coordinator: one product table per subcategory, the
URL's category is fixed text in the template.

**Chosen.** `bd_tablas.config.ruta` holds a template (`powerbanks/{Marca}-{Modelo}`);
the resulting path is stored in the row page's existing `knowledge_windows.slug`
(unique per owner) with `/` inside, and old ones go to a history table
`direcciones_anteriores` that answers 301 forever. Alternatives rejected: a
`ruta` column on `bd_filas` (a second address field next to `slug`, two
lookups), and computing the path on every request without storing it (renames
could not redirect).

**Computed on read, not on write.** A row is written by five paths (grid, page,
public API, assistant, recurrences); hooking all of them is how one gets
forgotten. `asegurarRutas` runs from the sitemap, on a `/p/:id` visit and from
`POST /api/bd/tablas/:id/rutas`, and writes only what changed. **Cost:** a row
renamed in the grid keeps its old URL until one of those runs; the old URL
still works and the sitemap fixes it on the next crawl.

**At least two segments**, the first never an app route (`TRAMOS_RESERVADOS`),
so a row URL can never shadow an ordinary page (`/my-page`) or an app path.
On a custom domain an unknown two-segment path still answers 200 with the site's
root page, as before; on a subdomain and in casa it is a 404.

## 2026-10-18 — Wikiproducts purchases: one seller, a managed order per distributor (W5)

**Context.** Wikiproducts sells products it does not stock: the customer pays
the shop's retail price on our site and we buy it from the distributor, who
pays us a commission. The commission must be visible on every line and must
never decide the order (Eugenio's ethics code).

**Options.** (a) Each distributor a seller with its own Stripe account (the
existing multi-store cart, one payment per shop). (b) Every offer row belongs
to the Wikiproducts account: one cart, one payment, and the order is split
afterwards into one entry per distributor that a person places by hand.
(c) Affiliate links only, no checkout.

**Chosen: (b), with (c) alongside.** Distributors have no accounts here and
will not onboard to Stripe Connect for an MVP; (b) reuses cart, checkout,
reservations, receipts and webhooks untouched. The «Ver en la tienda» link
keeps (c) for shops we do not buy from. New: `pedidos_distribuidor` (0157),
offer roles on the existing column types (no new types), commission
snapshotted on `pedido_lineas` at payment.

**Rules fixed in code.** `ordenarOfertas` takes no commission input that it
reads; shipping is summed per distributor (one box each, the free threshold
measured on that shop's part only); a shop entry only moves forward
(«Incidencia» is the exit, delivered and cancelled are final) and the
customer's order is deduced from all entries and never goes back.

**Diverges from `docs/`?** Not that we know of; payment option A in Stripe
test mode is the plan's default, real keys wait for Eugenio.

## 2026-10-18 — Site support chat and paid expert consultations (Wikiproducts W6)

**Own tables, not `mensajes`.** Direct messages are person-to-person and need
a platform session. A site's support is answered by whoever is on the site's
team, and most askers have no account. `soporte_conversaciones` +
`soporte_mensajes` reuse the same notification paths (`avisar`, `telecomHub`).
Visitors without an account are identified by a random token in an HttpOnly
cookie on that host; only its sha256 is stored.

**No AI auto-answer yet.** Answering with the model when nobody is online is
one call per question and, on an encyclopedia that sells «no invented
claims», a wrong answer is worse than «we'll reply here». Left for Eugenio.

**Expert payments: Connect when the expert has it, else the platform holds
the money and records the debt on the consultation** (`cobro = 'plataforma'`,
`neto_experto_centimos`, cleared only with a transfer reference). Not reusing
`liquidaciones`: it is keyed by `pedido_id` and its unique index is per order.
Price and commission are read server-side from the expert row and frozen on
the consultation. The commission is shown to the buyer in euros.

**Double booking is prevented by a partial unique index**
`(experto_id, inicio) WHERE estado IN ('reservando','pagada','hecha')`, not
by a check-then-insert. A held slot expires with the 30-minute Stripe session.
Late payment for a taken slot is refunded automatically.

**Availability is stored in the expert's local time** (`zona_horaria`) and
converted per day with `Intl`, so DST does not move consultations; no date
library added.

### 2026-10-18 — W6: help chat hidden, expert payments on live Stripe

**Decision (Eugenio):** do not offer the site help chat for now, and use the
live Stripe account rather than test mode for expert consultations.

**How:** the `chat` block gets `enMenu: false` (kept in code: expert
consultations reuse the same conversation server, and blocks already placed
still render). Live vs test is decided only by `STRIPE_SECRET_KEY` on the
server, so no code path changes. Re-offering the chat is deleting one line.

**Consequence:** the paid Checkout flow was never exercised against Stripe
(not reachable from the build environment). The first real booking after the
merge is the first real test; a low-priced test consultation, refunded from
the management panel, is the cheapest way to check it.

## 2026-10-18 — Offers inherit the product sheet's visibility, same owner only

**Context.** `puedeConTabla` makes a table public only when it is embedded in a published page; an offers table is shown only through the sheet's «Ofertas» block, so visitors saw nothing. **Options.** (a) Ask authors to also embed the offers table somewhere public (leaks every row, every commission, as a table). (b) Treat any table with a «Producto» relation to a visible sheet as visible (lets anyone advertise on someone else's sheet). (c) Visible sheet + same owner for both tables. **Chosen: (c)**, in `permisoOfertas` (`src/server/ofertas.ts`). Only `OfertaPublica` fields leave; the commission is public by design.

## 2026-10-18 — What a Wikiproducts sitemap and site search contain (W2)

- **Sitemap.** A site where at least one table has a route template lists only
  pages and rows with a readable path. Rows without one (offers, auxiliary
  tables) and `/bd/…` table pages are left out: they still open, but they are
  not offered to search engines as pages. Alternative: list everything (510
  URLs, 409 of them `/p/…` rows that are thin or duplicate) or give every table
  a route. Sites without any template keep the old behaviour, so the change
  only reaches sites that opted into readable URLs.
- **Site search order.** Tiers derived from table structure, not names: rows of
  tables with a sheet template, then targets of those tables' direct relation
  columns (brands), then the rest. Alternative: a per-table priority setting —
  more control, one more field nobody would fill in.
- **R10 without a photo.** The spec (`requisitos-tecnicos.md` R10) lists a
  licensed photo as part of the indexing bar. Dropped from the bar and kept as
  `mejoras`, because the first catalogue went live with no photos and the rule
  kept every sheet out of Google. Diverges from the SEO requirements text.

## 2026-10-18 — Sheet: a fifth provenance nature, and the first paint waits for the sheet's blocks (W1)

- **`tercero` nature.** Values relayed by a shop, the press, a regulator or
  Wikipedia were stored as `declarado` and read «Según la marca» with a source
  that was not the brand (1,041 values). They now take `tercero`, shown as
  «Según <host>». Approved by the coordinator; W3a reclassifies by host.
  `no_publicado` reads per column (`config.sin_dato`, else a short map by
  loader clave, else «El fabricante no lo publica»).
- **Alternatives: same type AND comparable size.** Half to double the row's
  `tamano` column (energy or peak power), dropped if it leaves fewer than three.
  Alternative considered: a hand-set «segment» column per product; rejected
  because nobody fills it in and the size is already in the data.
- **CLS.** `main.tsx` waits (max 1.5 s, in parallel with the app chunk) for the
  reading chunks of the data blocks on the page the server sent, and for its
  community scores; meanwhile the server HTML stays visible. Alternative:
  importing the sheet blocks eagerly into the entry chunk — rejected, every
  humanity.wiki page would pay for them. Measured locally: 0.78 → 0.00.
- **«Sugerir una corrección»** reuses `POST /api/report` (`content_reports`,
  reviewed at level 3) with the reason prefixed «Corrección sugerida». Needs an
  account, like voting. A dedicated corrections queue is the right shape once
  volume justifies it; today the table has zero rows.
## 2026-10-18 — Site search tolerance, the 404 page, and the menu over the API (W2)
- **Search matches word by word, not the whole phrase.** Every word (singularised: `paneles` → `panel`) must appear somewhere in the page's "haystack" (title, table name, visible column values, block text), in any order. Typos are corrected only for words that appear in no title of the site, against that site's own title vocabulary (edit distance 1 for 4–5 letters, 2 from 6), and the correction is shown. Synonyms are a short hard-coded Spanish energy list in `buscadorSitio.ts` (`SINONIMOS`). Alternatives: `pg_trgm` (needs an extension in production and still no synonyms), or full-text search with a Spanish dictionary (stemming, but no typo tolerance). The in-code list is the cheapest that solves «powerbak» and «placa»; per-site synonyms in `config.sitio` are the next step if a second site needs other words.
- **An unknown address on a custom domain shows a 404 page, not the home page.** This replaces the 2026-08-22 decision («`lamieldelasierra.com/loquesea` shows the honey»): since SEO R16 the server already answered 404 + `noindex`, so the screen contradicted the status code. The home is one click away from the 404 page.
- **The menu API only accepts destinations inside the site** (a page of the same owner, the home, or a path starting with `/`), like the blocks API: a leaked key cannot plant an external link in a published menu. External links stay an editor-only action.
- **Contrast and 16 px are fixed with a scoped stylesheet** (`.sitio-lectura` in `index.css`) over the published reading frame, not by editing each block's classes. See the tech-debt entry.


## 2026-10-18 — Turning on a site's members from a migration (Wikiproducts)

Members can only be activated with the owner's session (`PUT /api/sitio-miembros/:raiz/config`); the `/api/v1` key does not reach it. For Wikiproducts the activation went into migration 0159, keyed by the site's address and guarded by "no config yet", rather than a new public-API endpoint or a step in `cargar-en-servidor.sh` (owned by W3a). Alternative kept open: a `/api/v1` members endpoint, if other sites need it scripted. Cost of switching later: the migration is a one-off, nothing depends on it.
## 2026-10-18 — Product sheet header from columns, and the layout as a script (W1)

**Decision.** The shop-style header is the existing `propiedad` block in `cabecera` style. It reads price, score and key figures from the row's columns, and no new block type was added. The key figures are chosen by loader key, in code (`DESTACADAS_POR_CLAVE`).

**Why.**
- The key figures live in code because production column config cannot be patched through `/api/v1`; it is the same reason `ROL_POR_CLAVE` exists.
- The order of the sheet lives in `plantilla-ficha.json` and is applied by a script, because a template's blocks can only be changed one by one through the API.

**Alternatives.**
- A new «compra» block. Rejected: the price and the score would then be painted by two blocks.
- Editing each template by hand. Rejected: there are five templates, and a by-hand edit cannot be reproduced on a fresh copy.

**Cost of the shortcut.**
- `plantillaInicial()` repeats the JSON's order: two lists to keep in step, about 5 minutes to unify when the API can read a file.
- The script rewrites every data block of a template when the order differs, which is about 28 API writes per table, once.


## 2026-10-18 — A row whose last route segment has an empty column gets its title there (W2)

Before: a missing column anywhere in the route template left the sheet at `/p/:id` "until its data is complete". In Wikiproducts some products genuinely have no model code (Riapow, two lights), so they would never get a readable address, and the search linked them to `/p/…`. Now an empty column in the LAST segment falls back to the row's title. In any other segment the old rule stands, because a half address (`/-a1689`) is worse than `/p/:id`. If the data arrives later the address changes, and the old one is kept in `direcciones_anteriores`, which redirects. Alternative rejected: an explicit fallback syntax in the template (`{Modelo|Nombre}`). It is more general, but it costs a parser change and a migration of every template for a case that today has one answer.

## 2026-10-18 — Folding a guide through the API instead of rewriting the page (W2)

The subcategory guide had to fold on load. Options: (a) `PATCH` the whole block list from the loader, (b) let `crear-esquema`/`cargar` write it folded, (c) a narrow `fold` route on API v1. Chose (c): API v1 only edits text, so (a) would have opened a general write path; (b) only covers new pages. The route moves the blocks that follow a top-level heading into it (until the next heading of the same or higher level or a database block), is idempotent and checks ownership with `paginaParaEditar`.
## 2026-10-18 — Shop conditions live on the distributor row, not on each offer (W5, evaluator round 2)
- **Decision**: delivery days, shipping rule, returns, warranty handler and the policy link are typed columns of «Distribuidores» (found by `config.rol`: `entrega_min`, `entrega_max`, `envio_tienda`, `envio_gratis_desde`, `devolucion_dias`, `devolucion_gratis`, `garantia`, `envia_espana`, `condiciones`, `condiciones_fecha`). The offer row keeps `plazo`/`envio`, which override the shop's rule when present.
- **Why**: these are per-shop policies. Copying them into 143 offer rows would mean 143 places to update when a shop changes its returns window.
- **Alternatives**: per-offer columns (rejected, duplication); free text on the distributor (the old `envio`/`devoluciones` texto_largo; kept for history, not read by the box, since a sentence cannot be compared or say «unknown» distinctly).
- **Rule**: conditions are read only from a distributors table with the same owner as the offers table, so a foreign row cannot promise «free returns» on someone's sheet.
- **Unit**: delivery is shown as plain «días». Shops publish working days, calendar days or neither; the published unit travels in each value's provenance note.

## 2026-10-18 — Third-party ratings are a separate, sourced fact, never a vote (W4)

The evaluator (round 2) scored criterion 4 at 5 because no sheet had any rating, and community ratings cannot be invented. We now show ratings published elsewhere (Trustpilot for shops; the maker's shop or a retailer for products) as a fact with source, link and the day it was read, in a box apart from the community block. They never feed `bd/comunidad.ts`, the ordering or the AggregateRating JSON-LD (Google only accepts ratings collected on the page, and a borrowed one would be a made-up rating to us). Amazon is excluded: robots.txt blocks it and its terms only allow its stars through its API.

**Alternatives.**
- Mix them into the community score as prior votes. Rejected: the score would stop meaning "what people here said", and a sheet could rank on a figure nobody here gave.
- A dedicated column type. Rejected for now: a hidden long-text column with JSON plus a validator costs nothing in the column editor. A real type is about 1 h (editor + cell + export) once a second site needs it.

**Cost of the shortcut.** The figures are copied by hand and go stale; the date is shown so a reader sees how old they are. Refreshing them is a re-run of the research, not automated.


## 2026-10-18 — Rubric criteria in «La mejor en cada criterio»: votes first, named data until then (W4)

Evaluator round 3 (fix 5): the alternatives block ranked by technical figures only, so «the best in ecology / in ethics» did not exist. The block now leads with the rubric criteria. Each is decided by community votes once two products have a note, and until then by one published figure that is named on the line: price per unit, warranty years, declared cycles or annual degradation, and recalls among searched products. Quality, aesthetics and ethics show only with votes.

**Alternatives.**
- A new block. Rejected: two «best in» lists on one sheet.
- A composite «ecology score» mixing chemistry, repairability and cycles. Rejected: the weights would be our opinion presented as data.

**Cost.** The criterion → column map (`RUBRICA` in `ficha/vistas.ts`) is by `config.clave`, so a new table needs its keys there. That is about 5 minutes per table.
## 2026-10-18 — Catalog filters as visitor chips over the existing view filters (W2)

Evaluator round 3 wanted category filters visible. Options: (a) a new block config listing which filters to show, set by the loader; (b) derive them from column roles/keys at render time; (c) open the generic «Filtrar» menu by default. Chose (b): zero loader changes, works for any catalog-like table, and the tramos come from the data (thirds, two significant digits). Filters go through the existing visitor path (`filtros`/`orden` URL params on `/api/bd/tablas/:id`), ANDed with the author's view filters. Cost of moving to (a) later: one config field read by `MandosCatalogo`.
## 2026-10-19 — Gallery «Comparar» reuses the sheet comparator (W4)

Evaluator round 4: the visitor should choose what to compare. Options: (a) a new compare page with mode `url`, which needs a page per site created by the loader; (b) link to the first ticked product's sheet with `?comparar=` for the rest, reusing mode `fila`; (c) a comparison modal inside the gallery. Chose (b): no new page, no loader change, the address is shareable, and the first product is pinned on the left on phones as on any sheet. Shown only when the table has ≥2 `config.comparar` columns, so non-product galleries never change. Cost of moving to (a) later: the bar's `href` only.

## 2026-10-19 — A catalog's default order is decided by the server in reading mode (W2)

Evaluator round 4: «"Orden de la página" no explica qué criterio sigue». Options: (a) relabel the manual row order; there is no honest name for it, it is the loader's insertion order; (b) have the loader create a table view sorted by size; that needs a views endpoint in `/api/v1` plus a full load, and the editor would lose drag-to-reorder for those tables; (c) the client applies a sort after the first load; a second fetch and the cards reorder on screen (layout shift); (d) the server sorts by `columnaOrdenCatalogo` when there is no author or visitor order and the request says `lectura=1`. Chosen (d): one rule in one helper, the selector's label reads the same helper, and the editor is untouched. Cost of switching to (b) later: the views endpoint (~1 h) and deleting four lines in `bd.ts`.

## 2026-11-04 — Calendario Arte: one JSONB row per month, defaults in code
Options: (a) one row per day phrase and per field; (b) one `contenido` JSONB per (year, month) holding only what was edited, merged over `src/data/calendarioArte.ts`; (c) all content seeded into the database by the migration. Chose (b): the screen edits and prints a whole month at once, an empty table renders the full calendar (same idea as `textos_editables`), and `version` gives optimistic locking per month (409 instead of silent overwrite). Month 0 holds what is common to the year (design principles, style folder). References live in their own column and route so adding a photo never conflicts with someone editing phrases. Cost of moving to (a) later: a migration that explodes the JSON (~1 h) and the merge function.

## 2026-11-04 — Calendario Arte: print through the browser, not a server PDF
Options: (a) server-side PDF with the Playwright already in dependencies; (b) `window.print()` of a portal rendered at real millimetres, with `@page` A3 or A4. Chose (b): what is printed is exactly the component on screen, text stays vector, uploaded illustrations go out at full resolution, and no server CPU (2 cores) is spent. Cost: the person has to pick «Guardar como PDF», margins none and background graphics; the export menu says so. Moving to (a) later is ~2 h (an endpoint that loads the same page headless).

## 2026-11-04 — Calendario Arte: who edits
Editing what ends up printed needs level 3; proposing an idea, level 1. Reading is public, because the QR on paper has to open without an account. Declared in `seguridad/politica.ts`.

## 2026-11-05 — Calendario Arte: editing open to anyone, without an account
Eugenio: «haz que cualquier persona sin necesidad de registrarse pueda editar el contenido desde este enlace, pero que no se indexe en Google». This supersedes the 2026-11-04 decision («Editing what ends up printed needs level 3»).
Options for "anyone": (a) open routes, made safe by history + rate brake; (b) a secret edit token in the URL, with the public link read-only; (c) keep login. Chose (a) because it is literally what was asked («desde este enlace»). What makes it acceptable: a snapshot before every change (at most one per 10 minutes while editing, always before restore/reset), restore available to anyone, the house brake (`frenos`) keyed by IP and hour (600 writes, 40 images, 30 ideas per hour), and images only from our own uploads (an external URL would let anyone plant a tracking pixel). Constitution rule 2 («toda entidad tiene autor»): anonymous edits are recorded with author NULL, shown as «Visitante sin cuenta»; no IP is stored anywhere (the brake keys expire in 2 days). Switching to (b) later: ~1 h (token column, check in the five write routes, read-only UI without it).
Not indexed: `X-Robots-Tag: noindex, nofollow, noarchive, noimageindex` on `/calendario-arte*` and `/api/calendario-arte*` plus a `robots` meta tag from the page. Deliberately not in `robots.txt`: a blocked URL can still be indexed because Google never reads its `noindex`.

## 2026-11-05 — Calendario Arte as a standalone app outside the Layout
Eugenio asked for its own logo and menu and none of Wiki Creator's chrome. Options: (a) a "bare" flag on the Layout; (b) a top-level route like `/formulario/:token` and the public pages. Chose (b): the Layout's tools, search, login, feedback and AI buttons simply never mount, and nothing in the Layout has to learn about this page. Global things that run outside React still had to be told: the iOS install prompt (`avisoInstalar.ts`) now skips `/calendario-arte`. Editing is always on (Notion-like) with a «Vista final» toggle instead of an «Editar» mode. Fonts are self-hosted with @fontsource and loaded on demand (none of the 10 families is in the main bundle). Folder items are the same `referencias` list with a `tipo` (ilustracion | boceto | referencia); untyped = referencia, so older items keep working.

## 2026-11-05 — Aeromóvil Gota: one geometry in TypeScript, mirrored in a CadQuery script
Eugenio asked for a CAD deliverable with layers and a page where the design can be tuned. Options: (a) generate STEP on the server on every change (CadQuery/OpenCASCADE in the container, ~1 min per model and ~400 MB of wheels); (b) compute everything in the browser and ship a STEP of the default design plus the script and a params JSON to regenerate it locally; (c) browser-only meshes, no STEP. Chose (b): the server stays as it is, the page is instant, and a real STEP with named layers exists. Cost: the formulas live twice (`src/components/aeromovil/geometria.ts` and `public/aeromovil/aeromovil_cad.py`) and must be changed together; the header comment of both says so. Doors exist only in the viewer; the STEP skin is closed.
Improvement mailbox: a comment IS a pending task (one table, `aeromovil_tareas`, with a state), copied from the Calendario Arte pattern: open without account, IP+hour brake, honeypot, nothing deleted. Page outside the Layout like `/calendario-arte`; the iOS install prompt skips `/aeromovil`.

## 2026-11-05 — Aeromóvil Gota: ownership through a page row, and `config.ruta`
The sidebar only lists pages inside a project, so "appear in his sidebar as a page" needs a project and a `knowledge_windows` page owned by Eugenio (migration 0165, looked up by e-mail, idempotent). Options for where the page points: (a) a normal document with a link to /aeromovil; (b) a `config.ruta` that the menu and the document opener follow. Chose (b): one click lands on the app, and any future standalone screen can get its sidebar entry the same way. Only internal paths matching `^/[a-z0-9][a-z0-9-/]*$` are followed, never another host. The owner of the Aeromóvil is that page's `creator_user_id`; changing a task's state now needs the owner or an admin (`PATCH /api/aeromovil/tareas/:id` moved from `publica` to `propietario`), while commenting stays open. If the row is missing, only admins decide.

## 2026-11-05 — Arquitectura: one parametric geometry feeding 3D, plans and numbers
Eugenio asked for an editable 3D world of the Circular Human Community with sliders, plans in a CAD format, top and front views and the map dimensions. Options: (a) model it in a CAD tool and publish files; (b) a parametric model in the browser from which the 3D view, the DXF/SVG plans and the dimension table are all derived; (c) a 3D-only toy. Chose (b): a slider changes all three at once, so the plan downloaded is exactly what is on screen. `src/components/arquitectura/geometria.ts` is pure (no three.js) and is run by the exporters too. Rendering a 30 km city in a few dozen draw calls: flat surfaces merged per layer and painted without depth test in a fixed order (no z-fighting from 20 km to 2 m), everything else instanced, trees only inside a "detail" scope, logarithmic depth buffer. DXF is AutoCAD R12 (AC1009) with a LAYER table and `$INSUNITS = 6` (metres): the most widely readable flavour; R12 has no Unicode, so texts are transliterated to ASCII. Nothing is persisted server-side (no table, no route): parameters live in localStorage and in a shareable `#p=` link; moving to a saved-designs table is ~2 h if versions need to be shared between people.
## 2026-11-05 — Aeromóvil Gota: saved designs store parameters, edited by creator key
A design is `{nombre, parametros}` in `aeromovil_disenos` (migration 0167): parameters, not geometry, so old designs benefit from model fixes; `{}` means "the current defaults". Options for who edits: (a) anyone (like the calendar, with history); (b) accounts only; (c) creator via a random key kept in their browser, plus the owner/admins. Chose (c): it keeps saving open without an account and stops one visitor overwriting another's design without needing a history table. Only the SHA-256 of the key is stored, so a backup carries nothing that can edit. Removing archives (`archived_at`). Weight model: tubes are weighed from the model geometry with the chosen material; bought parts and laminate per m² come from sliders whose min/max define the «todo ligero / todo pesado» range.

## 2026-11-05 — Arquitectura: prototypes with baked vertex colours, tinted per instance
Eugenio asked for more realistic buildings and roads, loading identical buildings only once. Options: (a) glTF models downloaded per building type; (b) procedural prototypes built once in code (`prototipos.ts`), merged into one geometry each with per-vertex colours (wall, glass, tile…), drawn with InstancedMesh and tinted by instance colour; (c) per-building meshes. Chose (b): no download, one GPU call per model type, and the instance colour multiplies the vertex colour so one nest/annex model serves every system colour while glass and tiles stay readable. Ground textures are painted on 256 px canvases at first use (`texturas.ts`) and mapped in world metres. Switching to (a) later (artist-made glTF) only replaces the factory functions; the instancing stays.

## 2026-11-05 — Aeromóvil Gota: other velomobiles are silhouettes, not CAD
Eugenio asked to "extract the 3D model" of the AeroRider and the Quatrevelo from web photos and drawings and compare it with ours. No CAD of either is public, and the agent cannot measure pixels of web photos it only displays. Options: (a) hand-model each one in CadQuery from photos (~half a day each, still a guess); (b) a silhouette model — side profile (top/bottom), plan half-width and wheel positions, in metres with our origin — built from the published dimensions, rendered as superelliptic sections; (c) a table of numbers only. Chose (b): it is enough to compare size, shape and footprint, and the same structure is what the photo tool produces, so catalog and user models share one renderer and one comparison. The catalog lives in code (`referencias.ts`); user models in `aeromovil_referencias` (0168) with the same creator-key rule as designs. Photo processing runs in the browser (corner-colour background, largest connected blob) so photos never reach the server. The ghost is drawn without depth test so it reads over our opaque body in the side view.

## 2026-11-05 — Aeromóvil Gota: ground clearance lifts the whole interior
`clear` used to move only the fairing bottom while the chassis sat at fixed heights (YS 0.20, HIP_Y 0.36), so at Eugenio's default of 21 cm the main beam stuck 5 cm out of the bottom. Options: (a) keep two parameters (skin clearance and chassis height); (b) one "altura de los bajos" that offsets every chassis-mounted height by `clear − BAJOS_BASE` (0.13, the clearance the interior heights were designed for); (c) clamp the slider so the skin never goes above the beam. Chose (b): it is what "underbody height" means to a person, and the beam can never poke out again. Wheels stay on the ground; swingarm pivot, parallelogram arms and uprights follow the frame, with the upright stretched down to the hub. The bottom bracket keeps its own height (max(0.48, beam + 0.10)) because raising it pushes the pedals into the fork crown. Same change in `aeromovil_cad.py`.

## 2026-11-05 — Aeromóvil Gota: autosave only what this browser created
Eugenio asked for designs to save themselves. Options: (a) autosave whatever design is open; (b) autosave only designs whose creation key is in this browser, manual save for the rest; (c) also auto-create a design when none is open. Chose (b): designs have no history, so autosaving the base design or someone else's on the first slider move would overwrite work with no way back; and (c) would fill the shared list with every visitor's experiments. Throttled to one write per 40 s after 3 s idle, under the server brake of 120/hour/IP; a final keepalive PUT on pagehide. Cost of (a) later: a `aeromovil_disenos_historial` table and an undo (~2 h).

## 2026-11-05 — Aeromóvil Gota: long-wheelbase recumbent frame with a direct chopper bar
Eugenio asked for a Tour Easy-style frame and bar. The indirect steering (mast between the knees plus drag link) is replaced by a stem on the steerer and a bar sweeping back outside the knees: fewer parts, and the brake levers sit where the hands are. Cost: a tiller effect (grips ~0.6 m behind the steering axis swing sideways when turning), which is why the fairing check rotates the bar ±15°. Curved tubes are a list of pass points through one Catmull-Rom shared by viewer, drawings, mass and the CadQuery script (as overlapping straight segments there: a swept spline in OCC made the STEP fragile). The windshield start was anchored to BB+0.13 so moving the BB back 3 cm did not change the skin split, which had tripled the STEP size.
## 2026-11-05 — Calendario Arte: «Crear nuevo diseño» is a queue drawn by Eugenio's own scheduled Claude, not a server-side AI call
Eugenio asked for a button that gets Claude to draw a new design without the chat, paid by his Claude subscription rather than API credits, checking every 30 s. Options: (a) call the Anthropic API from the server (~1–1.5 € per design, would also drain the platform's 2 €/day AI cap and switch off the chat); (b) put his subscription token (`claude setup-token`) on the server and spawn Claude Code per request — **not allowed**: subscriptions may not serve third parties or be stored on a server (code.claude.com/docs/en/legal-and-compliance); (c) the button only writes a row to `calendario_arte_disenos` (0169), and a scheduled task in his account draws the queue. Chosen (c). Scheduled tasks start at most hourly, so each run polls `POST /robot/pasada` every 30 s from a shell loop (no model tokens while idle) for ~55 min; the next hourly run takes over. Claiming a job is atomic (PATCH to `dibujando` only from `en_cola` or stale >2 h). The routes are open like the rest of the calendar (rate-limited, images must be uploaded here). Needs `humanity.wiki` in the cloud environment's allowed domains. Instructions for the bot: `design/calendario-arte/DIBUJANTE.md`.

## 2026-11-05 — Calendario Arte: designs listed in code, favourite separate from the printed one
`ContenidoMes.disenos` (generated, never saved) lists the house designs 1..N; generated designs come from the queue table and are appended at load. `favorito` (saved) is what the page shows on load — default Design 2, Eugenio's choice — and is independent of `imagen`, which is what prints. «Vista final» shows the printed one. Only designs someone has looked at are loaded (3+ print-size JPGs × 12 months would be >100 MB).
## 2026-11-05 — /arquitectura: the community breaks the "ring at 0.2·R" rule
Eugenio asked for the forest in the centre, the hub further north and the village road bending over the top through a roundabout. Options: (a) move the parent ring itself further from the community centre — the whole village geometry (ring radius, spacing, village size) would change; (b) keep the ring where it is and **bend it locally** over each community with a C1 bump that rejoins the ring tangentially at ±X. Chose (b): the village and city stay identical, the bend is contained in each community, and the ring arcs are simply cut between bends. Village and city keep the original rule. `desplazamientoDivisoria` still positions the community relative to the ring.
Animation: one instanced mesh per crowd, matrices rewritten each frame, agents loop along precomputed lane polylines (`Mundo.rutas`); no collision or right-of-way. Chosen over a traffic simulation because the goal is to show life in the plan, not to model traffic.

## 2026-11-06 — Aeromóvil 1: a second vehicle in the same page, not a second page
Eugenio asked for the Aeromóvil 1 (a four-wheel electric car shaped like the SZEmission) to become the default, with every layer, cut, occupants, doors, trunks, batteries and components. Options: (a) a new page `/aeromovil-1` with its own viewer and sidebar; (b) one page and one viewer, with `Parametros.disposicion` choosing between two geometry modules (`geometriaA1.ts`, `geometria.ts`'s Gota) behind one `Modelo` union and one `Superficie` abstraction (frame + section + zones + doors); (c) rewrite the Gota into the A1 and drop the Gota. Chose (b): designs, autosave, the catalogue of other velomobiles, drawings and export keep working for both, old saved designs (no `disposicion`) still open as the Gota, and the viewer code that was already generic (skin grid, doors on pivots, chassis tubes) is shared. Cost: `Aeromovil.tsx` carries two sidebars and the viewer two "mobile" builders; ~15 % of the viewer is Gota-only and could move to its own file (~1 h) if a third vehicle ever comes.

## 2026-11-06 — Aeromóvil 1: shape fitted by an evaluator agent, in rounds
The first A1 did not look like the photos and the agent could not measure what it drew. Options: (a) keep eyeballing; (b) a separate evaluator agent that reads photos and renders, measures silhouettes in pixels and returns quantitative, prioritised changes in terms of the model's control curves, applied by the builder, iterated; (c) image-based optimisation of the parameters. Chose (b), three rounds. Round 1 overshot in two places (canopy width 0.66 instead of 0.48, windshield at u = 0.10 instead of 0.19) and round 2 corrected them with grid measurements, which is why the evaluator must measure and not describe. What remains (sharp shoulder crease, concave fillet at the canopy base, rear-wheel fairings as bulges) is below what one superellipse exponent per half can express.

## 2026-11-06 — Aeromóvil 1 CAD: the viewer exports geometry, the script converts it
The Gota's CadQuery script duplicates every formula of `geometria.ts` (known debt). For the A1, options: (a) duplicate again (~400 lines of Python to keep in step); (b) `cad.ts` serialises the computed geometry (skin patches as point grids merged into large faces, tubes with pass points, wheels, boxes, seats, mannequins) and `aeromovil_1_cad.py` only builds solids from it; (c) opencascade.js in the browser. Chose (b): one source of truth, and the script is 200 lines that never change when the shape does. The STEP is bigger (22 MB raw, 5.8 MB zipped) because each patch is a thickened B-spline face instead of one lofted solid; a loft of the exported control sections (`cuadernas`, also in the JSON) is the way back to a small file (~2 h). The Gota keeps its script until someone needs to touch it.

## 2026-11-06 — Aeromóvil 1 components: catalogue in code, choice in the design
Each component page shows weight (from the parametric model), an estimated cost, suppliers and alternatives. Options for where "which alternative" lives: (a) a table per design; (b) `P.variantes` inside the design's parameters, with each alternative carrying the parameter patch it implies (`mMotor: 8`, `whKg: 125`…). Chose (b): the choice is saved and autosaved with the design, the 3D mass and the checks recompute from the patched parameters, and no migration was needed. Costs are hand-written estimates from public catalogues (Nov 2026) and will drift; the catalogue (`componentes.ts`) is code, so updating a price is a PR.

## 2026-11-06 — Aeromóvil 1 cabin: one canopy surface, zones for glass, pillars as a sloped boundary
Eugenio asked for an XL1-style flat windshield (default, no bubble option), raked A-pillar bars, side windows and a solar roof sloping to the tail like the Aptera. Options: (a) model windshield, windows and roof as separate surfaces; (b) keep the single canopy surface and express glass vs solar as zones in (u, θ), with the raked pillar and the raked window rear edge as θ-ranges that depend on u (`Zona.tDe`), and draw the frames as sunk tubes along those same lines. Chose (b): doors, trunk lid, checks, areas, CAD export and the click-to-component all keep working unchanged, and the cell-by-cell boundary is hidden under the frame tube. The evaluator agent measured the first render against the photos and its eight changes were applied in one pass; a second round was skipped at Eugenio's request to publish after one.

## 2026-11-06 — Aeromóvil render: image-to-image from the viewer's own capture, raw body, session + brake
Eugenio wants a "photo of the built vehicle" of the view he is looking at. Options: (a) text-to-image from a description (cheap, but it never matches the shape or the view); (b) image-to-image: capture the WebGL canvas and ask Gemini to turn that frame into a photograph (`generarImagenDesdeImagen`, same `gemini-2.5-flash-image` family already used elsewhere); (c) a local path-tracer in the browser (hours of work, no "real world" look). Chose (b). The capture (~0.1–1 MB) cannot travel as JSON because `server.ts` is frozen with a 100 kB `express.json` limit, so the route takes `application/octet-stream` with its own `express.raw` (6 MB) and the view name and a short description go in the query string. Each call costs money, so the route needs a session and `FRENO_RENDER` (12/h per IP, then closes), listed in `politica.ts`. The image comes back as a data URL and is not stored: a gallery of renders per design would be the next step if people use it (one table, ~1 h).

## 2026-11-06 — Aeromóvil 1: gaskets, divider and the navy nose are skin zones, not extra meshes
Eugenio asked for credible windows, door cut lines like the XL1/Aptera and an Aptera-style navy nose with the logo. Options: (a) draw gaskets and the nose as separate meshes floated over the skin (z-fighting, duplicated area, invisible to the CAD); (b) two new `Piel` kinds, `marco` and `morro`, resolved by the same zone machinery as glass and solar, so the viewer, the areas and the CAD export all see them, and the CAD treats both as body. Chose (b). Cost: every `Record<Piel, …>` grows by two entries, and a zone boundary sloped in (u, θ) still shows the mesh's teeth, which is why the frame tubes now run along the gasket's outer edge. The body opening under the canopy is a `hueco` zone for the same reason: the cabin floor is the chassis, not the skin.

## 2026-11-06 — Aeromóvil 1: the door closes on structure (pillar bar + safety hoop), the rear gives up its towers
Eugenio asked for a steel hoop between the two seats where the pilot's door closes, hinges on real bars, and a rear end without a cage so the trunk is flat and as big as possible. Options for the hoop: (a) a decorative tube in the viewer only; (b) a chassis `tubo` with a curve (counted in mass and exported to CAD) that also becomes the door's rear edge (`uArco`) and the window divider. Chose (b). For the rear suspension: (a) keep the McPherson pair (needs 70 cm towers in the trunk); (b) trailing arms with laid-down dampers anchored at `ys + 16 cm` under a flat trunk floor. Chose (b): the floor height is computed from what sits beneath it (`yMaletero`), so a taller motor or inverter raises the floor rather than poking through it. Cost: the rear roll stiffness now depends on the stabiliser bar and the arm geometry is a sketch — a real design needs a kinematics check before any part is cut.

## 2026-11-07 — Escaparate pages (Colabora, Sala de prensa, Quiénes somos): one data block with sections, not a page-level view
Options: (a) special blocks rendered by `BloquesLectura` and by `htmlBloques`; (b) a page-level view like `VistaProyectosSitio`. Chose (a), through the existing data-block registry (`bloquesDatos/escaparate`): the text stays as ordinary blocks Eugenio edits, the editor already shows registered data blocks, and `htmlBloques` already has `registrarHtml`. One type with `datos.seccion` rather than fourteen types: one folder, one registry entry, one server writer. The data travel inside the block (`datos.precargado`, added by an ampliación) so the first client paint equals the server HTML, which is rendered with the same component through `renderToStaticMarkup`: no skeleton, no extra request; the editor asks `/api/sitio/escaparate/:raiz/:seccion`. Cost: the page payload carries the data (the press room sends ~120 kB of JSON for ~170 news items, ~60 kB gzipped for the whole HTML). If the archive reaches the thousands, `medios` should page from the API instead (about an hour). Review of the same day: the escaparate header goes only to pages that carry an `escaparate` section and are not the visible row of a table (the first rule, «everything that is not the root, a project or a person», changed 17 existing public pages); the alternative, an explicit `config.paginaEscaparate` flag, was rejected because the sections already say it and a flag could drift from them.

## 2026-11-07 — Garage Twizy from a third-party mesh; wind tunnel as an illustration, not CFD
**Twizy body.** Options: (a) keep improving the hand-coded lofts; (b) use StreetDrone's SD-TwizyModel STL (Apache 2.0, the only openly licensed Twizy mesh found); (c) a commercial model. Chose (b): it is the real car's shape, the licence allows redistribution with the notice and a statement of changes (both in `public/aeromovil/garaje/LICENSE-SDTwizy.txt`), and the conversion is a script in the repo that reproduces the binary byte for byte. The STL disagrees with Renault's sheet (wheelbase 1 650 vs 1 686, height 1 577 vs 1 454, the rear pod 18 cm past the rear wheel when the sheet says flush), so the sheet wins: per-axis scale plus a smooth quadratic compression of everything behind the rear seat. Its wheels were boxes and are drawn in code. Format: a custom `TWZ1` binary (int16 positions at 0.1 mm, uint16 indices, parts grouped by material) instead of glTF, to avoid shipping `GLTFLoader` for one model; if a second garage model comes from a mesh, switching to GLB costs about an hour and is the right call then. Cost now: the part indices in the script depend on the STL's connected-component order, so a different STL needs a re-check.
**Wind tunnel.** Options: (a) a real solver (lattice Boltzmann in a worker or on the GPU); (b) a kinematic illustration from each car's silhouette. Chose (b): a believable 3D solver in the browser is days of work and would still be wrong in ways nobody here could audit, while the decision Eugenio needs — how much the air costs each car — comes from Cd and frontal area, which the card shows with their sources. The lines conserve the area the car takes from the air (r² = r0² + R(x)², ground reflected), never enter the body, take one side for good, and get a wake sized by the tail's last section; the screen says it is an illustration. Each garage vehicle opts in with `aero` and `envolvente` in `VehiculoGaraje`; without them the tunnel draws nothing for it and the card shows no row, rather than inventing a Cd.

## 2026-11-07 — Aptera drawn from stations; overlay with a depth pre-pass; tunnel card at the wheels
**Aptera.** No openly licensed mesh exists (marketplace models are paid or unlicensed), so the body is a set of superelliptic stations in `garaje/forma.ts`. The mesh, the tunnel silhouette and the frontal area all come from the same stations, so they cannot disagree. Windows, solar panels and lights are separate patches 2–3 mm off the skin whose edges follow curves (belt line, roof cut); classifying the body quads instead gave stair-stepped edges. Track, overhangs and body width are not published and come from press photos, inside the published overall sizes; this is written in the file header and in the card's sources.
**Overlay.** Options: (a) a translucent hull rebuilt from each car's silhouette, like the velomobile comparison; (b) the real model, translucent. Chose (b) with a depth-only pre-pass plus a «less or equal» colour pass, so only the front skin of each ghost shows instead of every interior part on top of the others, and with silhouette lines drawn over everything. Only the line that reads in the current view is shown: side profile, plan outline or largest section. Cost: the GTAO pass sees the pre-pass depth, which adds a little grain on the ghosts; acceptable for a comparison view.
**Tunnel card.** At the wheels (air + rolling), not at the battery: the A1's 88 % efficiency and 250 W of equipment are this project's assumptions and would be invented for the other cars. Rolling uses Crr 0.009 for every car with car tyres; it is the A1's value, and the default A1 runs the same tyre sizes as the Twizy. The other cars' rows say it is assumed.

## 2026-11-08 — Aeromóvil import duties: one data module, rates read from TARIC mirrors, prices estimated

**What.** New section `/aeromovil/aranceles` (Eugenio: «aranceles de importación de China a España con todos los componentes… menos el chasis y el carenado… si es solo IVA ponlo aparte… compáralo con importar el vehículo completo»). Data and arithmetic in `src/components/aeromovil/aranceles.ts`, layout in `Aranceles.tsx`.
**Why a section and not a component field.** The duty depends on the CN code, and one catalogue component is declared under several codes (wheels = aluminium rims 8708 70 50 + tyres 4011 10 00, each with its own anti-dumping). So each piece carries `partidas` with a share of its price, instead of one rate per component in `componentes.ts`.
**Sources.** Conventional rates were read code by code on third-party TARIC mirrors (celna24.pl, zolltarifnummern.de, tariffnumber.com) because `ec.europa.eu/taxation_customs/dds2/taric` refuses automated reads (robots). Lines not read for the exact code carry `confirmar`. Trade defence from the regulations: BEV countervailing duty 2024/2754 (category L excluded, per the Commission's Access2Markets notice), tyres 2026/1540 (45.3 % used: unnamed maker), aluminium wheels 2023/112 (22.3 %), fasteners 2022/191 (listed, not computed).
**Estimates, said on the page.** Prices in China (no quotation), freight (1 000 € parts / 1 400 € vehicle), destination costs, Chinese chassis and body at 50 % of the catalogue, 1 500 € Chinese assembly and margin. The comparison shows that the complete L7e vehicle can come out cheaper landed than parts + Spanish chassis/body even after the 10 % duty, and says Spanish assembly is not counted.
**Alternatives not taken.** Putting the rates into `componentes.ts` (would mix sourced catalogue prices with tariff data and still need the per-code split); a live TARIC lookup (no public API we can call from the browser, and robots-blocked).

## 2026-11-08 — Garage realism: Aptera matched to photos by solved cameras; 1-Litre rebuilt on the press spec, not on Wikipedia

**Aptera.** Options: (a) keep tuning stations by eye against photos; (b) solve each press photo's camera from known points (three tyre contacts, nose centre, roof top), draw the model over it with that camera and ray-cast the photo's features (pillars, glass corners, shut lines) onto the model. Chose (b): it turns «looks a bit off» into centimetres. The two best photos still disagree by 10–15 cm along the car around the doors; the model sits in the middle, and the header says so. The tail stays a 1.26 m wing (Launch Edition photos) although the 2020–21 prototypes were ~1.5 m wide. Detail lives in two new files (`apteraPiel.ts` skin patches, `apteraDetalle.ts` materials, procedural canvas textures, wheels, cabin); textures are drawn in code, nothing is downloaded. 229k triangles; `construir()` ~60 ms warm.
**1-Litre.** English Wikipedia gives 3.47 m; the VW press-release spec tables (ultimatecarpage, supercars.net, traumautoarchiv, the German press release) give 3.646 m with wheelbase 2.205 m and tracks 1.000/0.810 m. Chose the press tables: they agree with each other and with the 1.0 m² frontal area on German Wikipedia. Body changed from silver to black unpainted carbon (press release: «unlackiert»; period press: «schwarze Zigarre»). No photo could be loaded in the sandbox, so the surface is a reconstruction checked only against the published dimensions; the header says it. The model is built once per page and cloned (first build ~300 ms, later ~10 ms); 129k triangles.
**Cost.** Neither model's canvas textures or materials are disposed when the garage is emptied (same as the other garage cars): a few hundred kB per page visit, not per rebuild for the 1-Litre (cached), per rebuild for the Aptera. Disposing them in the viewer's garage cleanup is ~15 minutes if it ever shows up in memory.

## 2026-11-09 — Garage: SZEmission re-measured at 3.42 m; the catalogue card reads the garage stations; the A1 is left alone

**SZEmission size.** The 2026-11-06 reading (2.80 × 1.25 × 1.03 m, wheelbase 1.15 m) scaled the side photo by height as if it had no perspective. Solving the cameras of three photos together (side with the team, low 3/4, head-on 706) gives 3.42 × 1.28 × 1.045 m, wheelbase 1.21 m, ±3 %.
- **Scale.** Front track measured at 0.77 of body width, set to the rules' 1.00 m minimum.
- **Independent checks.**
  - The tyre is 0.556 m, the team's earlier car per its public ROS config.
  - People about 1 m behind the car come out about 1.78 m tall.
  - 1.15 m would fail the rules' wheelbase minimum of ≥ 1.20 m.
- **Mechanism, rechecked by hand.** With a camera about 4 m from the centreline, the near-side ground contact is about 0.5 m closer than the canopy top and the nose and tail tips. That inflates apparent height by about 13 % against length, which matches the gap between 2.8 and 3.4.
- **Still an estimate.** The team publishes no dimensions; searched again in English and Hungarian, nothing found.

**One source for one car.** Options:
- (a) keep the «Otros velomóviles» card's own hand-traced curves and only change its numbers;
- (b) have the card sample the garage model's stations (`szemissionForma.ts` via `estacion`).

Chose (b): two hand-made silhouettes of the same car had already disagreed by 60 cm. The cost is that `referencias.ts` now imports from `garaje/` (and `three`, through `apteraPiel.ts`). The removed helpers `suave` and `perfilDePuntos` had no other user.

**The Aeromóvil 1 is not rescaled.** It was born as «SZEmission × 1.3» from the old reading. Against the new one it is +15 % long, +21 % wide and +6 % high. Whether that changes the design is Eugenio's call. Only sentences stating the SZEmission's size, or the 30 % to its builders, were corrected. Dated code comments recording how the A1 was born keep the history.

**Jaguar D-Type.** Modelled the 1955 short-nose customer car, not the 1955 works long-nose car (190 mm longer): its published dimensions agree across sources, and it is the car in the only photo that loaded. `alto` is the published 0.80 m without the fin, so the fin is not in the tunnel envelope.

**AeroRider.** Modelled as a non-tilting trike. No source says it tilts, and the full AQUA equipment list would have said so. No photo was found, so the surface is a reconstruction on the published sizes.

**Storage.** Bumped to `aeromovil_garaje_v4`, forgetting only the stored `jaguarD` entry (hidden while it was a placeholder), as was done for the XL1 between v2 and v3.

## 2026-11-09 — Garage: production XL1 back, 2011 Concept out; layout reset once; overlap guard on load; 3D fullscreen

**XL1.** On 2026-11-08 «estos dos… están repetidos» was read as the production XL1 and the L1 2009. On 2026-11-09 Eugenio's photos made clear that the two XL1s he wants are the production car (white, 2013) and the 2002 concept (the 1-Litre). The production car (`xl1`, already in `xl1.ts`) comes back. The 2011 Qatar Concept (`xl1concept`), which drew the same body, leaves, and its export is deleted. The 1-Litre keeps id `unlitro` and is renamed «VW 1-Litro Concept 2002». VW never called the 2002 car "XL1"; the name keeps "1-Litro" so it stays true.

**Why the 1-Litre "disappeared".** Saved garages keep each car's `z`, and the defaults have changed three times. Eugenio's saved list (layout of 2026-11-07) had the 1-Litre at −9 m, and the new Jaguar default was −9 m. Options considered:
- (a) bump the key and drop only the affected entries, as done for v3 and v4;
- (b) reset the layout once;
- (c) resolve overlaps on load.

Chose (b) + (c). With (b) everyone lands on the clean default layout now. With (c) the next new car cannot hide an old one even if someone moved cars around. (c) uses footprints from `largo`/`ancho`/`batalla`, swaps them when the car is turned 90°, adds a 0.3 m margin, and keeps a fixed footprint for the Aeromóvil at the centre. It runs only on load, not while dragging.

**Fullscreen.** Uses the Fullscreen API on the viewer `<section>` when `document.fullscreenEnabled` is true. Otherwise (iPhone Safari) it falls back to `fixed inset-0 z-[100] h-[100dvh]` with body scroll locked and Esc to close. The canvas already follows its box through a `ResizeObserver`, so both modes resize the renderer. Cards in the top-right corner move to `right-[52px]` from `sm` up, and below the button on phones. The wind-tunnel card stays outside the section (2026-11-07 decision), so it is not visible in fullscreen.

## 2026-11-09 — Viewer render layers: photographed environment, fitted sun shadow, Neutral tone mapping; no bloom

**Environment.** Candidates were three Poly Haven HDRIs (CC0, fetched from `pmndrs/drei-assets` with a blobless sparse clone): Rooitou Park, Potsdamer Platz and Kiara dawn.
- Potsdamer Platz (overcast city) gave the most "photographic" reflection lines. But it greyed dark paint against our sunny background and tinted rims red from the paving.
- Chose Rooitou Park and edited it:
  - Its sun is painted out by interpolating the clean sky across ±230 px and keeping only darker pixels (trees). Our own sun sphere is added to the PMREM scene, so glints stay aligned with the shadow.
  - Below the horizon, grass becomes an asphalt-grey gradient.
- Shipped as an sRGB JPG of radiance/1.2 (35 kB) instead of the 1.6 MB `.hdr`. The sky's peak radiance after removing the sun is ~1.15, so 8-bit loses only ~2 % median (measured).
- The HDR file would have been ~1.5 MB per visit after each deploy, because only the entry bundle is precached and code caches are purged on activate.
- Settings: `environmentIntensity` 1.5. Measured alternatives: 0.55–1.0 left paint dull; the procedural sky stays until the JPG loads.

**Shadow.** The sun's ortho shadow box was fixed at ±5 m around the origin, so garage cars at 9–12 m had no shadow. It is now fitted to the box of `coche ∪ grupoRef ∪ grupoGaraje`, projected into light space, whenever those change and once per second (for models that finish loading late). `mapSize` stays 2048:
- the A1 alone gets ~2.4 mm/texel (was ~5);
- the full garage, ~13 mm.

4096 was tried and made every frame several times slower on the software renderer used for checks. The cost on real GPUs was not measured, so it was not shipped.

**Tone mapping.** Moved from ACES Filmic to Neutral. ACES desaturates and greys whites; most garage cars are white, and Neutral is meant for product renders. AgX was also compared.

**Bloom.** UnrealBloomPass was tried at threshold 1.6 and at 6. At 1.6 it veiled white bodywork. At 6 it turned the sun glint on the canopy into a large blob. Removed; it can come back for emissive lamps alone with a selective (layer-masked) bloom, ~1 h.

## 2026-11-09 — The two XL1s rebuilt against Eugenio's photos

**Production XL1.** Rebuilt as `xl1Forma.ts` + `xl1Modelo.ts`, adapted from the 1-Litre's section pipeline. Cameras were solved on 4 photos; headlamp and windscreen points were triangulated across two of them. Tracks measured on photos are 1.46 / 1.24 m (was 1.41 / 1.29). No published tracks were found. `vmax` stays 158 (Wikipedia); the VW press kit says 160, as the header notes. Known defect at merge: glass and frit edges are cell-stepped at close range. The same bot is fixing it as a follow-up.

**1-Litre 2002.** Measured on one photo; the same frame was found on public GitHub (`mono/SkiaSharp.Extended`) at 799×533.
- **Paint.** Kept "unpainted carbon under clear coat" against the photo's charcoal look: the sources say unpainted, and the photo's luminance (body 50–60 vs tyres 15) fits clear-coated carbon in daylight. The weave was lightened instead of repainting.
- **Removed.** The rear spats and engine-cover lines were invented in the 2026-11-08 version; the photo shows no evidence of them, so they are gone.
- **Frontal area.** On the model it is 1.09 m² against the published 1.0. The tunnel and the consumption figures keep using the published value.

## 2026-11-09 — Wind tunnel: source-panel method + integral boundary layer, one fitted constant, shown next to (not instead of) the editor's Cd

**Method.** Options:
- (a) keep the illustration;
- (b) a 2D/axisymmetric estimate;
- (c) a 3D constant-strength source-panel method on each silhouette (`envolvente` + section exponent), half-model with symmetry and a mirror image under the road, dense LU in a Web Worker, cached by shape;
- (d) real CFD.

Chose (c).
- **Separation:** Thwaites, then Michel transition or a laminar bubble, then Head turbulent with separation at H = 2.4, along traced surface streamlines.
- **Cd:** flat-plate friction × Hoerner form factor; plus the base area behind separation × 0.2 (Hucho); plus rotating wheels 0.58 × exposed frontal area (Fackrell & Harvey); plus a fixed details increment.
- **Fit:** only the details increment (0.051) is fitted, on the four closed cars with a published Cd. The Twizy (open sides) is excluded.
- **Uncertainty band:** the leave-one-out RMS, ±15 % with today's XL1 and 1-Litre silhouettes.

**Not adopted by the editor.** The tunnel gives 0.125 for the default A1 against the formula's 0.153 (−19 %). Energy, range and department figures keep `res.Cd`. The decision belongs to Eugenio, and the card puts the two side by side.

**Stored calibration.** `tunel/calibracion.ts` keeps the calibration table so the card does not recompute five cars on every visit. `scripts/tunel-pruebas.ts` fails when it no longer matches the code. It failed at integration, because the XL1 and 1-Litre silhouettes changed the same day. The table was re-run before merging. **Rerun the script after any change to a garage silhouette.**

## 2026-11-09 — Wind tunnel explanations: text generated from the computed result, sliders read from the editor, «Probar» runs on a copy

**Where the text lives.** `tunel/explicaciones.ts` builds each panel from the live `ResultadoTunel`, so the numbers in it are this car's and this speed's. Options considered:
- (a) static text per point type;
- (b) text assembled from the result, with a «calculado»/«general» tag on every sentence.

Chose (b): Eugenio asked for an explanation *of this value*, and the tags keep computed claims apart from textbook claims.

**Slider names are copied, not shared.** Corrected the same day: this entry first said the options read the label from the editor's own slider definitions. They do not. `tunel/explicaciones.ts` keeps its own `A1` and `GOTA` tables (label, section, range) copied from `src/pages/Aeromovil.tsx`; I had read `fichas[clave]` without looking at where `fichas` came from. All 19 labels matched the page on 2026-11-09, but a slider renamed in the page will keep its old name in the tunnel until someone edits both (see tech debt).

**No typed figures for the default design.** The bot's options carried six figures measured on the default designs (e.g. «Cd 0,122 → 0,108»). Removed at integration and replaced by the direction alone. Nothing checked them, and they would go stale silently when the defaults or the calibration change. «Probar» gives the live figure for the visitor's own design.

**«Probar» never writes.** The worker rebuilds the model from a modified copy of the parameters, runs the numbers-only tunnel and returns before → after. It is open to everyone, including visitors who cannot edit, because nothing is saved. Persisting a change stays with the slider and its existing owner check.

**Garage cars.** A short sentence per car on what its maker did, keyed by id in `GARAJE`. A car with no entry falls back to «Es un coche del garaje: su forma la decidió su fabricante». That fallback is wrong for any design of our own added to the garage, so such a car needs its own entry.

## 2026-11-09 — Cuadriciclo Bala: our own design in the garage, and the all-cars camera that never moved

**What it is.** A fixed garage model (`garaje/bala*.ts`), not a parametric design in the editor.
- It keeps the Gota's rhombus and wheel sizes. Wheelbase 2.45 m, lateral track 1.10 m.
- No `aero`; `fuente` says it is a proposal.
- The envelope is the body only. The pods, arms and fin are outside it.
- Making it a third editor design (a `PARAMETROS_BALA` family) would give it sliders and «Probar». That is days of work in `geometria*.ts`, and it is Eugenio's call.

**Tunnel seams owned at integration.**
- `RUEDAS_GARAJE` had no `bala` entry, so its wheels counted 0. Added: front and rear `dentro` (0.61 × 0.08 m), laterals `carenado` (0.508 × 0.07 m). The estimate went from 0.113 to 0.138.
- `explicaciones.ts` fell back to «su forma la decidió su fabricante». It got its own sentence, which says that the pods and arms are not in the calculation.
- The shared footer now says «Probar» works with «el diseño del editor», no longer «nuestro diseño», since the Bala is also ours.

**All-cars framing.**
- The effect behind «Cd y consumo» and the tunnel computed a camera distance (`d = 1 + ancho/6`). OrbitControls then clamped it to `maxDistance = 25`, so with cars from z = −12 to +12 the nearest ones were always cut off.
- Now `distanciaParaVer()` fits every car's box, its label and (with the tunnel) 2 m of wake into the real field of view.
- The camera keeps the distance it effectively had (`min(old, 25)`) and backs off only when something does not fit.
- While that view lasts, `maxDistance` is lifted to match, and it is restored when the camera gets home.
- Fog near/far and the ground disc scale with the distance beyond 25 m. Options considered: a wider FOV (distorts) or a broadside camera (needs the same distance), so the fog and the ground move instead.

## 2026-11-09 — NUS KRUCE: identified from a photo collage; only the length is published

**Identification.** The car in the photo collage is the NUS KRUCE (Kent Ridge Urban Concept Ecocar), launched 2009-04-20. The race photo (number 413) may show KRUCE 2 (Shell Eco-marathon Asia 2010). No source says whether the body changed, so the model follows the launch photo's proportions and the race photo's details.
- Sources: the NUS press release, TODAY and Channel NewsAsia, the NUS «ECO Car» page, and The Star of 2010-07-15.

**Dimensions.** Only the length (2.70 m) is published. The wheelbase, height, width and tracks were solved from the launch photo (camera solved from the rims) and the rear photo, and checked against the UrbanConcept rule bounds of 2008–2012. The race photo does not fit one pinhole camera with those proportions: its nose looks ~20 cm longer. It is used for details only, and `fuente` says so.

**No `aero`.** There is no published Cd or frontal area. The tunnel estimates Cd 0.198, and the car does not join the calibration.

**Paint.** The bot's 0x1f78d1 at metalness 0.55 rendered royal blue under the park environment. Lightened at integration to 0x3a95e0 at 0.4, closer to the photos' sky blue.

## 2026-11-09 — The Bala in the editor: one shape code, the garage builder parametrised

**Method.** The garage builder (`balaForma`, `balaPiezas`, `balaModelo`) was parametrised instead of rewriting the Bala as editor `Superficie` patches.
- It keeps the look Eugenio approved.
- The default is provably identical: `scripts/bala-huella.ts` compared the new code against main's code at integration and printed «IGUAL».
- The hand-drawn keyframes stay. Other dimensions reach them through:
  - a piecewise-linear x stretch between nose tip, front axle, canopy start and end, rear axle and tail tip;
  - a width factor;
  - a belly lift;
  - a scale above the widest point.

**Types.**
- `ModeloBala` is a third member of the `Modelo` union, without the Gota/A1 fields (frame, sec, superficies, tubos…). TypeScript listed every consumer, and each got a deliberate branch.
- `ModeloConPiel` (Gota | A1) is what `planos.ts` and `cad.ts` take.
- The Bala's parameters are optional fields of `Parametros`, prefixed `b`. Gota and A1 designs never carry them, so old designs open bit-identical.

**Sliders.** Labels, blocks and ranges live in one table, `DESLIZADORES_BALA`, read by both the page and `tunel/explicaciones.ts`. The ranges are symmetric about the garage values because the existing slider widget recentres on the default.

**No editor Cd for the Bala.** The Gota formula does not apply to this shape, and the screen says so. The tunnel's reference area is the body section, as for the garage car, not the 1.09 m² that includes the pods.

**Head clearance.** The rider is a mannequin scaled to the ANSUR II 2012 sitting heights for men (91.8 cm at the 50th percentile, 97.7 cm at the 95th), trunk leaning 5° forward, no helmet. The 5° lean is an assumption, picked because it reproduces the 7 and 1 cm stated for the pilot.

**Dragging.** Each slider step builds a quick model (half the rows, no small details) on the next frame. The full model follows 0.3 s after the last change.

## 2026-11-09 — A team base design for the Bala in «Diseños»

The editable Bala shipped with an entry in the «Vehículo» picker only. Eugenio looked for it in «Diseños», which lists rows of `aeromovil_disenos`. I had worded his choice as «un diseño más en "Diseños"», so the delivery did not match the promise, and the seam was mine.

Migration 0178 adds a team base design, `{"disposicion": "bala"}`, following 0170 (Aeromóvil 1). `deDiseno` fills the rest from `PARAMETROS_BALA`. The insert is idempotent and checks only non-archived team rows.

**Alternative not taken:** listing the three families as built-in entries in the menu, outside the database. It would duplicate what the base rows already do for the A1 and the Gota.

## 2026-11-09 — The vehicle is chosen in one place: the logo menu; header in one line

**One selector.** Eugenio asked for one selector, at the top. The «Vehículo» radio block duplicated the designs menu, which already held a team base design per family (0170, 0178), so it was removed. The designs menu's button became the page logo: the car mark, the vehicle name and a chevron, with the open design and its save state underneath.

**List grouped by family.** The menu lists its designs grouped by family (`VEHICULOS`, moved to `Disenos.tsx`). A family with no design left shows «Medidas de partida», which calls `cambiarVehiculo`. Without it, archiving a base design would leave that vehicle unreachable.

**One line.** The A1's eleven departments went from a second row to a dropdown at the end of the header line. Section labels show from 1360 px; below that the inactive sections are icons with `title`/`aria-label`. On phones the section strip scrolls sideways. Options considered:
- shortening the labels;
- a two-level menu.

Eugenio asked for one line and an elegant look; the dropdown keeps every name readable.

**Kept.** «Otros velomóviles» is a reference catalogue for comparison, not a selector of the vehicle being designed. It stays.

## 2026-11-10 — solarcrowd.com is an ordinary site made of pages, not a second escaparate

Eugenio asked to rescue solarcrowd.com (it lived on Softr) «con la arquitectura de Humanity Wiki, como Luz y Humanidad», and to turn it into a «portal» that publishes entities needing a loan.

**Chosen.** A normal published site: a root page («SolarCrowd», `KWMWAFZMATPX`) with its own menu and footer in `config.sitio`, a gallery of the database «Préstamos SolarCrowd» (`BDTMWAFL7L4XKCM`, route `prestamos/{Nombre}`), one page per loan, and three subpages (contracts, risks, for entities). All of it is content: built through the same calls the editor uses, editable by Eugenio in the editor, no code of its own.

**Rejected: a second escaparate** (`sitio.escaparate`, the luzhumanidad.com machinery). It would have brought the map, the history and the forms for free, but it speaks of «el laboratorio» in several fixed strings, hides category filters and assumes the Sistemas/Personas tables. Bending it to a lending portal meant several code changes inside a component that luzhumanidad.com depends on. Switching later costs one afternoon: point `sitio.proyectos` at the loans table and set `escaparate: true`.

**The only code change:** `menu.logoHorizontal` / `pie.logoHorizontal`, opt-in, so a wordmark logo is shown whole instead of cropped to a square. Off for every existing site.

## 2026-11-10 — Consciousness map: saving for everyone needs an account

`/conciencia` is a map people refine by editing it. Two ways to store edits were possible:

- **Open to anyone without an account**, like the Calendario Arte and the Aeromóvil. Eugenio asked for that explicitly on 2026-11-05 for those two pages. He did not ask for it here.
- **A signed-in account, level 1** (the catalogue level of `CREATE_KNOWLEDGE_GRAPH`, which is what a concept map is). Chosen, because `src/server/CLAUDE.md` says every write route checks the role and the open exception was granted page by page.

Without an account the page still lets anyone move and change things. Their changes stay in `localStorage` (`conciencia.mapa.borrador`) and can be downloaded as JSON. The page says so and links to the login.

Opening it later is one constant, `NIVEL_GUARDAR`, plus `puedeGuardar` in `src/server/conciencia.ts`. History (a copy every 10 minutes at most, always before restoring or resetting; 300 kept) and the per-IP brake are already there, so the open variant would be safe too.

**Storage shape:** one row per map with the whole map as JSONB (`conciencia_mapas`, key `principal`), `datos` NULL meaning «the map in the code», and `version` for 409 on concurrent saves. Same pattern as `calendario_arte_meses`. Node and edge rows were rejected: one drag would be dozens of writes, and the map is always read and drawn whole.

## 2026-11-10 — A site page can be an app (`config.aplicacion`)

The consciousness map had to live on luzhumanidad.com as one of its projects, at `/conciencia-del-ser-humano/teoria-sintergica`. Options:

- **A route in `AplicacionDeDominio`.** Rejected. That file exists so routes do not leak onto every customer's domain.
- **An iframe block pointing at humanity.wiki/conciencia.** Rejected. Two scroll bars on a phone and a second app download.
- **Chosen: a project page whose `config.aplicacion` names a screen.** `SubpaginaSitio` renders that screen (lazy) instead of the blocks. The blocks are still written, because the project card, the server HTML and search engines read them. The allowed names are a closed list in code (`APLICACIONES`), so data cannot load arbitrary code.

The project row was created by migration 0181, with ids read from production through the public read API. The alternative was creating it through the editor with Eugenio's session. That was not possible from this session: his Chrome sends every humanity.wiki address to the installed app.

## 2026-11-10 — The consciousness mailbox is open to anyone

«Añadir mejora o comentario» accepts posts without an account, like the Aeromóvil's improvement mailbox. Safeguards:
- a per-IP brake (20 an hour);
- a honeypot field;
- a cap of 500 pending items.

Marking items done or discarded is admin-only (level 4). Saving the map itself still needs an account (level 1), as decided earlier today.

## 2026-11-10 — Formalizing a loan: one contract function, the block as the source of truth, files kept private

Eugenio asked for a «Realizar préstamo» flow on solarcrowd.com: lender's details, conditions with a signature, transfer receipt, and a copy of what was signed mailed to the lender.

**Chosen.**
- A **data block** (`prestamo`) holds the loan's terms in `bloque.datos`. Each funding page carries its own block, editable in the page editor.
- The server reads the terms **from the stored page**, never from the request, so a visitor can only choose among the options the publisher offered.
- **One function writes the contract** (`contrato.ts`), imported by the screen, the server and the PDF. What the person reads in the fold is word for word what is signed, hashed and mailed. Every signed row keeps its own text and SHA-256, so editing the terms changes only future signatures.
- **The body arrives as `application/x-prestamo-json`, parsed with its own 12 MB limit.** `server.ts` is frozen and parses JSON globally with a 100 kB cap, which a receipt does not fit in.
- **Signature, receipt and PDF are private** (`/uploads/privado/`). They leave only through the managers' route or as e-mail attachments. Managers are whoever has `gestionar` on the page.

**Rejected.**
- **A site form** (`formulariosSitio.ts`). It stores fields, not contracts: no signature, no attachments, no per-page terms.
- **A database form** (`bd_formularios`). It writes rows that the editor can change later, which is wrong for a signed record.
- **An e-signature provider** (DocuSign and the like). Money and an account Eugenio did not ask for. What is collected is a simple electronic signature (eIDAS «simple»): a drawn signature, the time, the text's hash and the e-mail copy.

**The public write route has no role check, on purpose.** The lender has no account; the portal is account-free by Eugenio's design. In its place, the route has:
- a check that the request comes from the site itself (origin);
- the page must be visible and the block open;
- a trap field and a minimum of 15 s;
- per-IP and per-loan brakes;
- the files' own first bytes must match their type.

This is the same shape as the site forms.
