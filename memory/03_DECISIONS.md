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
