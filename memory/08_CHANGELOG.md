# 08 — Changelog

> Registro cronológico de todo cambio importante del proyecto. **Nunca eliminar información. Siempre añadir** — nuevas entradas van al final.

---

### 2026-08-01 — Importación inicial desde AI Studio
- App exportada desde Google AI Studio (`plataforma-evolución-humanidad.zip`) estudiada en detalle y llevada a un repositorio Git.
- **Hallazgo de seguridad crítico**: clave secreta de Stripe en vivo hardcodeada en `server.ts` — eliminada antes de cualquier commit, con confirmación del usuario de que la clave expuesta se revoca. Ver `03_DECISIONS.md`.
- Commit inicial: *"Initial commit: Plataforma Evolución Humanidad"*.
- Repositorio GitHub creado: `eugeniogarcia30-cmd/plataforma-evolucion-humanidad` (privado), autenticado vía `gh` CLI (OAuth device flow).

### 2026-08-01 — Puesta en marcha del entorno local
- Instalado PostgreSQL 17 + PostGIS 3.6 vía Homebrew (se descubrió que PostGIS no está disponible para Postgres 16 — ver `03_DECISIONS.md`).
- Resuelto conflicto de peer-dependency (`react-simple-maps` requiere React ≤18, proyecto usa React 19) con `--legacy-peer-deps`.
- Migración de Drizzle regenerada desde cero tras detectar que la migración committeada solo cubría 7 de las tablas reales del esquema; establecido el flujo `drizzle-kit generate` + `psql -f` manual (`drizzle-kit push` se cuelga en este entorno no interactivo).
- App verificada funcionando en local.
- Corregidas 13 violaciones de "Rules of Hooks" (hooks llamados después de un `return` condicional temprano) en 13 páginas.
- Token de Mapbox configurado (`VITE_MAPBOX_TOKEN`).

### 2026-08-02 — Mejora de mapa: porcentaje de objetivo bajo el nombre del territorio
- El mapa muestra ahora, debajo del nombre de cada territorio, el porcentaje medio de los 6 objetivos, o el porcentaje del objetivo seleccionado si hay un filtro activo.

### 2026-08-02 — Creación del backlog `MEJORAS_PENDIENTES.md`
- Documento de mejoras pendientes creado en la raíz del repo. Ítems añadidos progresivamente por el usuario (algunos directamente vía GitHub web UI): tooltip contextual, énfasis visual de filtro, vista satélite de planeta/continentes, y (más tarde) columnas redimensionables.

### 2026-08-02 — Funcionalidad de Indicadores
- Nueva jerarquía Objetivo→Indicador en el esquema (`indicators`, `indicator_observations`), con `weight`, `direction`, `methodology`.
- Sembrados 9 indicadores de AGUA para España a partir de una tabla aportada por el usuario.
- Endpoints backend `/api/data/indicators` (con filtro por territorio) y páginas de listado + detalle (`Indicators.tsx`, `IndicatorDetail.tsx`).
- Añadida barra de sub-filtro de indicadores al mapa.
- **Bug corregido**: duplicados en `/api/data/indicators` por falta de filtro de territorio en el JOIN con `indicator_observations` — ver `03_DECISIONS.md`.
- **Bug corregido**: colisiones de icono/routing entre indicadores de distintos objetivos que compartían `name` — resuelto rekeyeando por `id` (`INDICATOR_ICONS`), patrón adoptado en todo el proyecto de aquí en adelante.
- Ampliados los indicadores a los objetivos Alimentación, Vivienda, Convivencia y Ecosistemas, a partir de tablas aportadas por el usuario (excluyendo explícitamente Salud, no solicitado en texto).
- Sembrados datos reales de calidad del agua por comunidad autónoma de España.

### 2026-08-02 — Rediseño de navegación (versión intermedia, luego sustituida)
- Menú superior sustituido por un menú inferior compacto.
- Menú de filtro del mapa movido a una barra superior tipo toolbar, con fondo separador (no flotante).
- Panel lateral de territorio rediseñado a estilo electricitymap.org: flotante, a la izquierda, al hacer clic en un territorio.
- Eliminada la marca de agua/atribución de Mapbox (esquinas inferior derecha/derecha) **a sabiendas de que incumple los Términos de Servicio de Mapbox** — decisión explícita del usuario tras advertencia. Ver `03_DECISIONS.md`.

### 2026-08-02 — Funcionalidad de Marcadores (3er nivel de la jerarquía)
- Nueva tabla `markers` (sub-componentes de un indicador): 7 marcadores de "Calidad" del agua sembrados (Oxigenación, Nutrientes, Fisicoquímica, Toxicidad, Microbiología, Biodiversidad, Residuos), con descripción, variable de medición, peso ponderado, fuente y fecha de última toma de datos, a partir de una tabla aportada por el usuario.
- Endpoint `/api/data/markers` (filtro opcional por indicador).
- Tabla `marker_observations` añadida para observaciones reales por territorio (estructura lista antes de tener el dato — decisión explícita del usuario, "Construye la estructura ahora", ver `03_DECISIONS.md`).
- Añadido 3er nivel de filtro en cascada del mapa (Objetivo→Indicador→Marcador), coloreando por score real del marcador con fallback "Sin datos".
- Renombrado el marcador "Toxicidad" a "Pureza" en todo el sistema (name visible, id interno estable). Ver `03_DECISIONS.md`.
- Sembrados datos reales de "Pureza" para 17 comunidades autónomas de España, a partir de una tabla aportada por el usuario.

### 2026-08-02 — Funcionalidad de Métricas y estaciones de medición (4º nivel de la jerarquía)
- Nuevas tablas `metrics` (contaminantes/variables dentro de un marcador), `measurement_stations` (estaciones físicas georreferenciadas) y `metric_observations` (lecturas con nivel de riesgo bajo/moderado/alto/peligroso).
- Sembrados 8 contaminantes bajo el marcador "Pureza" (Mercurio, Plomo, Cadmio, Nitratos, Fosfatos, Glifosato, PFAS, Pesticidas) y 15 estaciones reales de monitorización de ríos españoles con sus coordenadas, a partir de una tabla + el PDF "Resumen ejecutivo (1).pdf" aportados por el usuario.
- Endpoint GeoJSON `/api/geo/metrics/:metricId/stations`.
- Añadido 4º nivel de filtro en cascada del mapa (Objetivo→Indicador→Marcador→Métrica), renderizando las estaciones como puntos en el mapa coloreados por nivel de riesgo.
- Rediseñado el icono de las estaciones a un icono de gota+lupa (según imagen de referencia aportada por el usuario) más una etiqueta de texto coloreada con el nivel de riesgo (Bajo/Moderado/Alto/Peligroso).

### 2026-08-02 — Mejora de mapa nº 1 y 2 (implementación de `MEJORAS_PENDIENTES.md`)
- Tooltip contextual: cuando hay un objetivo seleccionado, el tooltip del territorio muestra el desglose de sus indicadores en vez de los 6 objetivos fijos.
- Énfasis visual del filtro activo: el elemento de filtro seleccionado se muestra con texto más grande; el resto de opciones al 50% de opacidad.

### 2026-08-02 — Mejora de mapa nº 3 (vista satélite del planeta y continentes limpios)
- Añadida capa raster de satélite (`mapbox://mapbox.satellite`) para la vista "planeta" en zoom bajo, con el umbral de zoom llevado a un valor aún más alejado de lo inicialmente probado.
- Etiquetas de continente agrandadas (`text-xl font-black`).
- Eliminadas las fronteras internas falsas entre las piezas de un mismo continente: quitada la capa `continents-line` propia y empujado el `minzoom` de las capas `admin-*` del estilo base de Mapbox a 3.5 vía `setLayerZoomRange` — dos causas raíz independientes del mismo problema visual, ambas corregidas. Ver `03_DECISIONS.md`.

### 2026-08-02 — Rediseño del mapa a layout de 3 columnas
- Sustituido el layout de menú inferior + panel flotante por 3 columnas fijas: (1) menú de filtro vertical en acordeón (Objetivo→Indicador→Marcador→Métrica, ~1/5 del ancho), (2) panel de territorio ahora **permanente** (no flotante, no cerrable, ~2/5 del ancho) mostrando los objetivos del territorio seleccionado, (3) el mapa centrado en su propio espacio (~2/5 del ancho).
- Añadido a `MEJORAS_PENDIENTES.md` por el usuario (directamente en GitHub) un nuevo ítem 4: hacer estas 3 columnas redimensionables por el usuario, al estilo de los paneles de la UI de Claude Code — pendiente de implementar.

### 2026-08-02 — Creación del sistema de memoria persistente `/memory`
- Creada la carpeta `/memory` en la raíz del repositorio con 9 archivos Markdown (`00_PROJECT_VISION.md` a `08_CHANGELOG.md`), para preparar el proyecto para ser desarrollado durante años por múltiples sesiones de IA sin memoria compartida entre sí.
- Backfill completo del historial de decisiones (`03_DECISIONS.md`) y de este changelog a partir de la auditoría del código (`schema.ts`, rutas de `server.ts`, `package.json`, árbol de archivos, `git log`) y del historial completo de la conversación.
- Establecidas como reglas permanentes: actualizar `/memory` con cada cambio de código importante, no dejar la documentación desactualizada nunca, leer `/memory` antes de cualquier tarea importante, y no borrar nunca entradas de `03_DECISIONS.md`/`08_CHANGELOG.md` (solo añadir). Ver `03_DECISIONS.md`, entrada del mismo día.

### 2026-08-03 — Páginas de entidad ligadas a territorio para todo el menú de filtros
- Añadido `GET /api/explorer/:level/:id?territoryId=...` (server.ts): endpoint único que sirve el detalle de Objetivo/Indicador/Marcador/Métrica — metadatos generales, observación real del territorio seleccionado (o "Sin datos"), y la lista de sus hijos con score/nivel de riesgo ya resuelto para ese territorio.
- Añadido `getStationsNearTerritory()`: para el nivel Métrica, devuelve las estaciones del territorio más las que estén dentro de un radio de 150 km de su centro ("alrededores"), usando las coordenadas de `seedTerritories` (se detectó que `territories.centroid` está vacía en toda la tabla — ver `02_DATABASE.md`).
- Añadido `GET /api/geo/locate` (con el paquete `geoip-lite`, offline): resuelve un territorio por defecto a partir de la IP del visitante (país, y comunidad autónoma si es España), con reserva en el territorio "Mundo" si no hay match — cubre también el caso de desarrollo local, donde siempre cae en el fallback.
- Añadido el componente `src/components/explorer/EntityExplorerPanel.tsx`: breadcrumb navegable, tarjeta de información general, tarjeta de datos del territorio (o lista de estaciones para Métrica), y grid de "hijos" clicables para seguir bajando de nivel desde el propio panel central.
- `src/pages/Map.tsx`: la navegación del menú de filtros (y del nuevo panel central) ahora se refleja en la URL de `/mapa` como `?territorio=<slug-del-nombre>&nivel=<objetivo|indicador|marcador|metrica>&id=<id>` — con `push` (no `replace`), de forma que el botón atrás/adelante del navegador deshace la navegación por el árbol paso a paso. Al entrar sin un territorio en la URL, se llama a `/api/geo/locate` para fijar uno por defecto.
- Verificado en navegador el recorrido completo Agua → Calidad → Pureza → Mercurio para Aragón y España (datos reales), el "Sin datos" correcto para Mundo (sin observaciones), el cambio de territorio manteniendo el mismo tema abierto, la navegación por breadcrumb hacia arriba, y el botón atrás del navegador deshaciendo cada paso.

### 2026-08-03 — Menú de filtros colapsable con "hover-peek" y responsive
- La columna 1 (filtros) se estrechó un 20% (de `w-1/5`/210px mínimo a `w-[16%]`/168px mínimo).
- Añadido un botón de colapsar/expandir en la parte superior del menú, con un estilo deliberadamente llamativo (círculo con gradiente esmeralda→índigo, icono `Sparkles`, anillo `animate-ping` mientras está colapsado) para invitar a explorarlo — inspirado explícitamente en el patrón de sidebar de Codex/VS Code.
- Estando colapsado (rail de 56px con solo iconos), al hacer hover sobre él se despliega el menú completo como un panel flotante superpuesto (no empuja el mapa ni el panel central) — se puede seleccionar cualquier filtro desde ahí sin necesidad de fijar el menú abierto; al retirar el ratón, vuelve a colapsarse manteniendo la selección hecha.
- Por defecto: colapsado en móvil (`window.innerWidth < 768` al montar), abierto en tablet/escritorio. El botón también funciona con tap normal en móvil (sin hover).
- La columna del mapa (columna 3) pasó de `w-2/5` fijo a `flex-1`, así reclama automáticamente el espacio que libera el menú al colapsarse.
- Alcance: solo se preparó el propio menú de filtros para móvil (colapso/expansión), no un rediseño responsive completo de las 3 columnas — en viewports muy estrechos las columnas 2 y 3 siguen apretadas. Pendiente si se pide una versión móvil completa de `/mapa`.

### 2026-08-03 — Corregido mapa en blanco entre el zoom de País y el de Regiones
- **Bug**: entre zoom ~4.5 y 5.0, el mapa se quedaba en blanco al pasar de ver España (país) a las comunidades autónomas (regiones).
- **Causa raíz**: los rangos `minzoom`/`maxzoom` de las capas de Mapbox en `HumanityMap.tsx` (país visible 3.5–4.5, región visible desde 4.5) no coincidían con los tramos de zoom que usaba `server.ts` para decidir qué tipo de polígono servir (país hasta zoom 5.0, región desde 5.0) — entre 4.5 y 5.0 la capa de región ya quería mostrarse pero el endpoint todavía devolvía datos de país (que la capa de país, con `maxzoom: 4.5`, ya no pintaba).
- **Arreglo**: alineado el corte país/región de `server.ts` (endpoints `/api/geo/territories/polygons` y `/centroids`) a 4.5, igual que las capas de Mapbox. Verificado en navegador fijando el zoom del mapa en vivo a 4.4, 4.7 y 4.9 — ya no hay hueco en blanco.
- **Lección para el futuro**: los tramos de zoom de estos dos endpoints y los `minzoom`/`maxzoom` de las capas en `HumanityMap.tsx` son una misma fuente de verdad duplicada en dos sitios — si se vuelve a tocar uno, hay que tocar el otro igual (dejado como comentario en ambos archivos).

### 2026-08-03 — Ampliación a 14 Objetivos (8 nuevos) + generalización de la arquitectura de Objetivos
- Añadidos 8 objetivos nuevos: Educación (O007), Movilidad (O008), Energía (O009), Tecnología (O010), Empleo (O011), Gobernanza (O012 — sustituyó a un "Política" inicial por petición explícita del usuario), Economía (O013) y Cultura (O014, añadida en un mensaje posterior con los mismos indicadores).
- Cada uno con los mismos 7 indicadores: Accesibilidad, Coste, Soberanía, Eficiencia, Calidad, Sostenibilidad, Innovación (peso igual 1/7, sin observaciones todavía — "Sin datos" en toda la app hasta que se cargue un dato real). Nuevo script `src/db/seed-new-objectives.ts` (idempotente) siembra las 8 filas de `objectives` + sus 56 `indicators`.
- **Antes de añadir los datos, se generalizó la arquitectura** para que el conjunto de objetivos deje de ser una lista fija de 6 hardcodeada en varios sitios:
  - `src/services/MapService.ts`: `TerritoryObjectives` pasó de interface con 6 campos fijos a `Record<string, number | null>`.
  - `src/components/HumanityMap.tsx`: `ObjectiveKey` pasó de `keyof TerritoryObjectives` a `string` plano; nuevo `DEFAULT_OBJECTIVE_SCORES` calculado dinámicamente; tooltip por defecto ampliado a 14 objetivos (grid en vez de fila); corregido un caso donde los objetivos sin dato mostraban `undefined%`/un 50% falso en vez de "Sin datos".
  - `server.ts`: `getObjectivesForTerritory` reescrito para iterar `OBJECTIVE_ID_BY_KEY` dinámicamente en vez de 6 líneas copiadas a mano; eliminada una segunda copia idéntica de esa misma lógica que vivía en el endpoint de centroides (ahora llama al mismo helper).
- Añadidos icono y color propios para los 8 objetivos nuevos en `src/pages/Map.tsx`, `Objectives.tsx`, `ObjectiveDetail.tsx`, `Home.tsx` y `src/components/explorer/EntityExplorerPanel.tsx` (todos con fallback genérico ya existente, así que nunca se rompe si se olvida uno). Actualizada la prosa de `AboutScoring.tsx` que mencionaba los 6 objetivos originales.
- Verificado en navegador: los 14 objetivos aparecen en el menú de filtros, en la vista "General" (`Objectives.tsx`), y al hacer click en un objetivo nuevo (Educación, Cultura) se abre su página de explorador mostrando "Sin datos" correctamente en el territorio y en los 7 indicadores, sin afectar a los valores reales de los 6 objetivos originales (Agua en Aragón siguió mostrando 96%/79% como antes).

### 2026-08-03 — Botón estático de menú, acordeón que se cierra al repetir click, y ajuste de tamaño de letra global
- El botón para colapsar/expandir el menú de filtros perdió toda animación (sin anillo `animate-ping`, sin `hover:scale`) y su icono cambió de una estrella (`Sparkles`) a 3 líneas blancas (`Menu`, icono hamburguesa) — imagen estática, según pidió el usuario.
- Al hacer click en un objetivo ya activo en el menú de filtros, su acordeón de indicadores ahora se cierra (vuelve a "General") en vez de no hacer nada — mismo patrón de toggle que ya tenían indicador/marcador/métrica.
- Aumentado el tamaño de letra por defecto del menú de filtros un nivel en cada profundidad (objetivo `text-xs/sm`→`text-sm/base`, indicador `text-xs`→`text-sm`, marcador `text-[11px]`→`text-xs`, métrica `text-[10px]`→`text-[11px]`, cabecera "Filtros" `text-xs`→`text-sm`).
- Nuevo `src/contexts/SettingsContext.tsx`: preferencia global de tamaño de letra (`Pequeño/Normal/Grande/Muy grande`) persistida en `localStorage` (clave `evo_font_scale`, mismo patrón que `DesignContext`'s `objectiveImages`/`logoImage` — no hay sistema de cuentas de usuario real en uso, así que "por usuario" se implementa como "por navegador/dispositivo", igual que el resto de preferencias de la app). Se aplica escalando el `font-size` del elemento `<html>` (87.5%/100%/112.5%/125%), de forma que **todos** los tamaños de texto de Tailwind basados en `rem` escalan juntos automáticamente, sin tener que tocar cada componente.
- Nuevo botón de configuración (icono de rueda dentada) fijo en la esquina superior derecha de toda la app (`Layout.tsx`, visible en cualquier página), con un popup para elegir el tamaño de letra. Posicionado con separación (`right-16`) respecto al control de zoom propio de Mapbox en `/mapa`, que también vive en la esquina superior derecha, para que no se solapen.

### 2026-08-03 — Tarjetas de Retos y Soluciones (esferas) en el panel central del mapa
- Nuevas tablas `challenge_indicators`, `challenge_markers`, `challenge_metrics` (mismo patrón que la ya existente `challenge_objectives`): ligan un reto a un Indicador/Marcador/Métrica concreto, además de (u en vez de) a un Objetivo general — así el panel de explorador puede mostrar retos relevantes en cualquier nivel de la jerarquía, no solo a nivel de Objetivo. Migración `drizzle/0005_burly_kitty_pryde.sql`.
- `GET /api/explorer/:level/:id` ahora devuelve también `challenges` (retos ligados a esa entidad + ese territorio, vía la tabla de unión correspondiente al nivel + `challenge_territories`) y `solutions` (soluciones ligadas a esos retos vía la ya existente `challenge_solutions` — las soluciones no tienen tabla de unión propia por nivel, heredan el territorio/tema a través del reto). Nuevo helper `getSolutionsForChallenges` en `server.ts`.
- `EntityExplorerPanel.tsx`: dos tarjetas nuevas al final del panel — "Retos" (esferas rojas) y "Soluciones" (esferas verdes), en fila ordenadas de izquierda a derecha (`flex flex-wrap`), cada una enlazando a `/retos/:slug` o `/soluciones/:slug` (páginas ya existentes). Mensaje de "sin registros" cuando no hay ninguno, siguiendo el mismo patrón "nunca fabricar datos".
- Sembrado el ejemplo pedido por el usuario: los retos ya existentes en el contenido mock **Incendios** (`R017`) y **Contaminación aire** (`R009`) — ambos ya ligados a España (`T003`) — se enlazaron también al indicador **Bosques** de Ecosistemas (`IND_ECOSISTEMAS_BOSQUES`) vía el nuevo script `src/db/seed-challenge-links.ts`. Sus soluciones ya vinculadas (Control emisiones, Electrificación, Gestión forestal, IA, Mosaicos, ZBE) aparecen automáticamente en la tarjeta de Soluciones sin sembrado adicional.
- Verificado en navegador: `/mapa?territorio=espana&nivel=indicador&id=IND_ECOSISTEMAS_BOSQUES` muestra ambos retos y las 6 soluciones como esferas clicables (llevan a la página de detalle real del reto/solución); un nivel sin retos vinculados (p. ej. el objetivo Educación) muestra correctamente los mensajes de "no hay retos/soluciones" en vez de dejar la tarjeta vacía o fallar.

### 2026-08-03 — Gráfico de anillo interactivo de causas de un reto
- Nueva columna `challenge_causes.percentage` (migración `drizzle/0006_living_guardian.sql`): peso (0-100) de una causa dentro de un reto concreto — es propiedad de la relación reto+causa, no de la causa en sí, ya que la misma causa puede pesar distinto en retos distintos.
- Nuevo endpoint `GET /api/challenges/:id/causes` → causas de un reto con su `percentage`, ordenadas de mayor a menor.
- Las esferas de "Retos" en `EntityExplorerPanel.tsx` dejaron de navegar a `/retos/:slug` y ahora son botones: al pinchar una, se despliega debajo un gráfico de anillo (nuevo componente `src/components/explorer/CauseDonutChart.tsx`, con `recharts`) con un segmento por causa, porcentaje + nombre en su borde exterior, y el nombre del reto + territorio en el centro — como el diseño de referencia que aportó el usuario. Pinchar un segmento lo resalta (atenúa los demás) y muestra su descripción debajo; volver a pincharlo lo deselecciona. Un reto sin causas registradas muestra el mensaje correspondiente en vez de un gráfico vacío.
- Sembrado el ejemplo pedido por el usuario: 6 causas nuevas del reto Incendios en España — Humanas 40%, Negligencias 20%, Naturales 15%, Climáticas 10%, Infraestructura 8%, Otras 7% (`src/db/seed-incendios-causas.ts`).
- **Incidencia real detectada y corregida**: `recharts` (dependencia ya presente en `package.json` desde el export original de AI Studio, nunca usada hasta ahora) fallaba al cargar porque le faltaba su dependencia transitiva `react-is` en `node_modules` — instalada explícitamente (`npm install react-is`). Si `recharts` (u otra librería de gráficos) deja de resolver en el futuro con un error de Vite tipo "Could not resolve", revisar primero sus dependencias peer/transitivas antes de asumir un error de código.
- Verificado en navegador: al pinchar "Incendios" aparece el anillo con los 6 segmentos y porcentajes correctos; pinchar el segmento "Naturales" lo resalta y muestra su descripción; pinchar "Contaminación aire" (un reto sin causas sembradas) muestra correctamente "Este reto todavía no tiene causas registradas." en vez de fallar.

### 2026-08-03 — CRUD completo (admin) para Retos, Soluciones, Causas, Indicadores, Marcadores y Métricas desde el panel central
- Objetivo: reutilizar el sistema genérico ya existente (`EditModal`/`EditContext`/`AdminMenu`) para que un admin pueda crear/editar/eliminar retos, soluciones y causas directamente desde `EntityExplorerPanel.tsx`, y además editar/eliminar (no solo crear) indicadores, marcadores y métricas desde ese mismo panel — sin construir formularios nuevos.
- `server.ts` (`handleUpsertEntity`/`handleDeleteEntity`, dispatcher genérico de `/api/data/:entity`):
  - Rama `"challenges"` ampliada para aceptar `indicator_ids`/`marker_ids`/`metric_ids` (además de los ya existentes `objective_ids`) — borra y re-inserta en `challenge_indicators`/`challenge_markers`/`challenge_metrics` solo si el array viene presente en el payload, así una edición parcial (sin ese campo) nunca borra relaciones existentes por accidente.
  - Rama `"causes"`: su bucle sobre `challenge_ids` ahora hace `INSERT ... ON CONFLICT (challenge_id, cause_id) DO UPDATE SET percentage = EXCLUDED.percentage`, para poder fijar el peso de la causa dentro de ese reto concreto desde el mismo formulario de alta.
  - Tres ramas nuevas: `"indicators"`, `"markers"`, `"metrics"` — INSERT...ON CONFLICT DO UPDATE con todos sus campos reales. Al borrar, se relega en las restricciones de clave foránea de Postgres para impedir eliminar un indicador/marcador que todavía tenga hijos (marcadores/métricas) apuntándole — decisión deliberada de **no** implementar borrado en cascada propio, para que un error de este tipo falle alto y visible en vez de arrastrar borrados no queridos.
  - `GET /api/explorer/:level/:id`: las 4 ramas de nivel amplían su consulta de `challenges` con `scope`/`description`, necesarios para poblar el formulario de edición con todos los campos reales de un reto (antes solo se pedían los campos mínimos para pintar la esfera).
- `src/contexts/EditContext.tsx`: `getEntityTypeFromTitle` gana los mapeos `indicador→'indicators'`, `marcador→'markers'`, `métrica/metrica→'metrics'` (comprobados antes que los patrones ya existentes, sin colisión de substring).
- `src/pages/Map.tsx`: pasa los arrays completos `indicators`/`markers`/`metrics` (los mismos que ya usa el menú de filtros) como props a `EntityExplorerPanel`, para que el panel pueda resolver la entidad completa de cualquier hijo sin una llamada de red adicional.
- `EntityExplorerPanel.tsx`:
  - Nuevo helper `getChildEntity(child)`: busca en el array (`indicators`/`markers`/`metrics` según el `level` actual) la entidad completa por `id`, en vez de usar el objeto resumido `{id, name}` que ya trae el endpoint del explorador — así el modal de edición se abre con **todos** los campos reales (peso, unidad, `includes`, descripción, fuente, fecha), no solo el nombre.
  - Los botones del grid de "hijos" (indicador/marcador/métrica) y las esferas de Reto/Solución ahora llevan un `AdminMenu` superpuesto (3 puntos → Editar/Eliminar), visible solo si `user?.isAdmin`.
  - Nuevo componente `AddSphere` (círculo punteado con icono `+`) al final de las filas de Retos y Soluciones, solo para admin — abre `EditModal` con una entidad en blanco (`id` aleatorio) y las relaciones (`objective_ids`/`indicator_ids`/etc., `territory_ids`) pre-rellenadas según el nivel/territorio actual, para que el nuevo reto/solución quede automáticamente enlazado a lo que se estaba viendo.
  - `CauseDonutChart.tsx`: botón "+" (solo admin) junto a la cabecera "Causas del reto" y en el mensaje de estado vacío — abre el mismo `EditModal` genérico con `type: 'causes'` y `challenge_ids: [challengeId]` prerellenado.
- **Limitación conocida, documentada y no resuelta a propósito**: `Layout.tsx` envuelve la página enrutada en `<main key={updateCounter} ...>` — cualquier guardado/borrado en **cualquier parte de la app** fuerza un remount completo de toda la página (incluido `Map.tsx` y `EntityExplorerPanel`), lo que resetea el estado local puramente de componente (por ejemplo `selectedChallengeId` en `EntityExplorerPanel`) a su valor inicial, aunque el estado que vive en los parámetros de la URL (territorio/nivel/id) sobrevive porque se vuelve a leer en el montaje nuevo. Efecto práctico: si el gráfico de causas está abierto y se guarda/borra cualquier cosa (incluida una causa nueva del propio reto abierto), el gráfico se cierra visualmente y hay que volver a pinchar la esfera del reto para verlo de nuevo con los datos actualizados — no hay pérdida ni corrupción de datos (verificado por `psql` en cada paso), solo un salto de UX. Es un patrón preexistente de toda la app (no introducido por esta función) y afecta a cualquier estado local de cualquier página tras cualquier guardado; el arreglo correcto sería llevar `selectedChallengeId` a la URL como un parámetro más (mismo patrón que `territorio`/`nivel`/`id`), dejado como mejora pendiente si se quiere pulir esta UX en el futuro.
- Verificado en navegador (con sesión admin): alta de un reto de prueba (con sus relaciones a indicador y territorio) → confirmado en `psql` → editado → borrado limpio sin filas huérfanas en las tablas de unión; alta y borrado de dos causas de prueba en el reto Incendios, restaurados los 6 datos originales (Humanas 40/Negligencias 20/Naturales 15/Climáticas 10/Infraestructura 8/Otras 7) y la descripción original del reto tras la prueba; edición de un marcador real (Pureza, bajo Agua→Calidad) confirmando que el modal se abre con todos sus campos reales (`indicator_id`, `name`, `includes`, `description`) vía `getChildEntity`, no solo `id`/`name`. Confirmado también que con sesión cerrada (no-admin) no aparece ningún botón de 3 puntos ni ninguna esfera "+" en ningún sitio del panel.

### 2026-08-03 — Rediseño de la tarjeta de Objetivos al hacer click en un territorio: rejilla compacta + reutilización del explorador para el desglose de retos/soluciones
- **Contexto**: al hacer click en un territorio en el mapa, si no hay ningún filtro activo en el menú izquierdo, el panel central mostraba `Objectives.tsx` en modo `embeddedTerritoryId` — una lista vertical (`grid-cols-1`) de tarjetas de objetivo, una por fila, con una etiqueta "N Retos"/"N Soluciones" y, al hacer click, una expansión inline con listas planas de retos/soluciones (`Link` a `/retos/:slug`) — un diseño distinto y más antiguo que el de las esferas ya usado en `EntityExplorerPanel.tsx` para cuando SÍ hay un filtro activo (menú izquierdo → Objetivo/Indicador/Marcador/Métrica).
- **Rejilla compacta** (`src/pages/Objectives.tsx`, solo en modo `embeddedTerritoryId`): sustituida por `grid grid-cols-3 gap-2` con tarjetas mínimas (icono 8×8, título en una línea, barra de progreso + porcentaje) — los 14 objetivos caben en 5 filas sin scroll. Eliminada la etiqueta de "N Retos"/"N Soluciones". El modo standalone (página `/objetivos` completa, sin territorio embebido) se dejó **completamente intacto** (sigue en `grid-cols-1` con su expansión inline de listas planas) — solo se tocó el modo embebido.
- **Reutilización del explorador en vez de duplicar la UI de esferas**: en vez de reconstruir el diseño de esferas/gráfico de causas dentro de `Objectives.tsx` (que habría duplicado toda la lógica ya existente en `EntityExplorerPanel.tsx`), se añadió un prop nuevo `onSelectObjective` a `Objectives`, que `Map.tsx` conecta a `navigateExplorer('objetivo', objId)` — la MISMA función que ya usa el menú de filtros de la izquierda. Al hacer click en una tarjeta de objetivo, esto activa el filtro de ese objetivo: el mapa se recolorea, la URL pasa a `?nivel=objetivo&id=...`, y el panel central conmuta automáticamente de `Objectives` a `EntityExplorerPanel` (la "gran ventana" pedida), que ya tenía barra de progreso, esferas de Retos/Soluciones y el gráfico de anillo de causas — cero UI nueva duplicada.
- **Menú de indicadores de izquierda a derecha**: en `EntityExplorerPanel.tsx`, cuando `level === 'objetivo'`, la sección de "hijos" (antes una rejilla `grid-cols-2`) se muestra ahora como una fila horizontal con scroll (`flex flex-row overflow-x-auto`) de chips con icono + nombre + badge de score — el menú de indicadores pedido, posicionado (sin cambios de orden) justo antes de las esferas de Retos/Soluciones. Los niveles Indicador/Marcador/Métrica conservan la rejilla `grid-cols-2` de antes sin cambios (el pedido era específicamente para elegir un indicador dentro de un objetivo, no para los demás niveles).
- Al pinchar un indicador de esa fila se dispara `onNavigate('indicador', id)` (comportamiento ya existente, sin cambios) — esto actualiza a la vez el mapa (recolorea por ese indicador), el breadcrumb/contenido del panel (pasa a mostrar la info y los marcadores de ese indicador) y sus propias esferas de Retos/Soluciones — los tres se actualizan juntos porque comparten el mismo mecanismo de navegación por URL.
- Verificado en navegador: rejilla compacta de 14 objetivos sin scroll con la barra de progreso visible y sin las etiquetas de conteo; click en "Agua" abre el panel grande con barra de progreso 98%, chips de indicadores (Acceso 84.3%, Calidad 72.1%) antes de las esferas de Retos (Escasez de agua, Sequías) y Soluciones (6 esferas), y el mapa recolorea (Europa pasa de 84% a 100%, el score de Agua); click en el chip "Calidad" actualiza el breadcrumb a España › Agua › Calidad, el mapa recolorea a los datos de ese indicador (Europa/África pasan a "Sin datos"), y las esferas de Retos/Soluciones se actualizan (vacías, correctamente, ya que ese indicador no tiene ninguno vinculado). Confirmado también en sesión no-admin: mismo comportamiento, sin ningún botón de 3 puntos ni esfera "+" visible.

### 2026-08-03 — Los 179 municipios de la Comunidad de Madrid, con polígonos reales en el mapa
- **Fuentes de datos externas** (descarga confirmada explícitamente con el usuario antes de usarlas):
  - Polígonos + nombres + códigos INE: `es-atlas` (`unpkg.com/es-atlas/es/municipalities.json`), TopoJSON derivado de las Líneas Límite Municipales oficiales del Instituto Geográfico Nacional (licencia CC-BY 4.0) — filtrado a los 179 municipios cuyo código INE empieza por `28` (provincia de Madrid). El repo inicialmente aprobado (`martgnz/municipios`) resultó no tener ninguna propiedad (`id`/`name`) en sus features — solo geometría — así que se cambió a `es-atlas` (mismo autor, mismo origen IGN, sucesor recomendado explícitamente por el propio README del repo deprecado) para poder identificar cada polígono.
  - Población real (para ordenar los municipios sin nombre propio en el Excel): tabla de Wikipedia "List of municipalities in the Community of Madrid" (censo INE 2024).
- **Emparejamiento con el Excel del usuario** (`Municipios_Madrid_179_Indicadores_Simulados.xlsx`, 179 filas × 14 columnas de objetivo, datos "Simulados" según su propio nombre de archivo): las primeras 10 filas ya traían nombres reales (Madrid, Alcalá de Henares, Alcobendas, Alcorcón, Leganés, Getafe, Móstoles, Fuenlabrada, Pozuelo de Alarcón, Las Rozas de Madrid) — se conservaron tal cual, emparejadas con su propio municipio real. Las 169 filas restantes (placeholders "Municipio 11".."Municipio 179") se completaron con los 169 municipios reales restantes, ordenados por población real descendente. Los 2 municipios que ya existían como territorio (`T014` Talamanca del Jarama, `T005` Montejo de la Sierra) se identificaron por nombre dentro de la lista de 179 y **reutilizaron sus IDs** en vez de duplicarse — de paso se corrigió el nombre de T014 al oficial "Talamanca de Jarama" (sin "del"). Ver el razonamiento completo en `03_DECISIONS.md`.
- **`public/geo/madrid_municipios.json`** (nuevo, 179 features, ~116KB): mismo formato que `regions.json` (`properties.territoryId` + `MultiPolygon`), siguiendo el patrón de archivo estático ya usado para planeta/continente/país/región en vez de mezclar un segundo mecanismo basado en la tabla `territories.geometry` (que además nunca llegó a poblarse con datos reales — ver `02_DATABASE.md`).
- **`server.ts`**: nueva rama `'municipality'` en `GET /api/geo/territories/polygons`, activa a partir de zoom ≥7.0 (antes `region` no tenía límite superior). **`HumanityMap.tsx`**: nueva capa `municipalities-fill`/`-line` (`minzoom: 7.0`, sin límite superior) + hover/click wireados igual que `regions-fill`; `regions-fill`/`-line` ahora cortan en `maxzoom: 7.0` para dejarle paso — los 3 puntos de corte de zoom (este endpoint, `/centroids`, y las capas de Mapbox) se mantienen sincronizados según ya advertían los comentarios existentes.
- **`src/db/seed-madrid-municipios.ts`** (nuevo, idempotente): inserta/actualiza los 179 territorios (`type: 'municipality'`, `parent_id: 'T004'`) y siembra `indicator_observations` para los 13 objetivos que sí tienen indicadores reales en la BD (todos excepto Salud) — para cada municipio y objetivo, inserta la misma puntuación del Excel en **todos** los indicadores de ese objetivo (con su peso real), de forma que la media ponderada que ya calcula el resto de la app dé exactamente ese número. 17.363 filas de `indicator_observations` sembradas en total.
- **Hallazgo: el objetivo Salud (O004) no tiene ningún indicador en la base de datos** (0 filas en `indicators` con `objective_id = 'O004'`) — decisión previa y deliberada de no tocarlo al ampliar Alimentación/Vivienda/Convivencia/Ecosistemas (ver entrada de esa fecha). Sin indicadores no hay forma de colgar `indicator_observations`, así que el script en su lugar añade las 177 nuevas entradas municipio→puntuación directamente al diccionario mock `progress_by_territory` del objetivo Salud en `src/data/seed.ts` (el mismo mecanismo legacy que ya usan los 6 objetivos originales para otros territorios) — sin tocar la estructura de Salud, tal y como se decidió no hacerlo antes.
- **Bug preexistente encontrado y corregido de paso**: `getObjectivesForTerritory` (usado por el mapa y por `/api/explorer/objetivo/:id`) solo miraba el diccionario mock `progress_by_territory`; ahora, si un territorio no tiene entrada ahí, calcula una media ponderada real a partir de `indicator_observations` (usando el `weight` de cada indicador), en vez de caer directamente en "Sin datos" o en el 50 neutro — esto es lo que hace que los 179 municipios nuevos (que solo tienen datos reales por indicador, no en el diccionario mock) muestren su puntuación de objetivo correcta tanto en el color del mapa como en la barra de progreso del explorador. Se propagó el nuevo helper cacheado `getIndicatorsMeta()` (id/objective_id/weight de todos los indicadores) a las 3 llamadas existentes de `getObjectivesForTerritory` (endpoint de polígonos, de centroides, y de explorador).
- **Segundo bug preexistente encontrado y corregido**: `GET /api/data/objectives` (consumido por la rejilla compacta de `Objectives.tsx`) devolvía un `progress_by_territory` **hardcodeado a solo 2 territorios** (`{"T001": 75, "T004": 90}`) para absolutamente todos los objetivos — así que la barra de progreso de la rejilla compacta mostraba 0% para cualquier otro territorio, **incluida España**, independientemente de sus datos reales. Corregido para que calcule `progress_by_territory` real para todos los territorios reutilizando `getObjectivesForTerritory` — confirmado que España pasó de mostrar 0% en Agua/Alimentación/etc. a mostrar sus valores reales (98%/86%/67%/91%/85%/76%), y que un municipio nuevo (Madrid capital, `TMAD001`) muestra correctamente 73% en Agua, coincidiendo con el Excel.
- **`node --env-file=.env ... tsx server.ts` debe reiniciarse manualmente tras editar `server.ts` o `src/data/seed.ts`**: a diferencia de los archivos de `src/` consumidos por Vite (que sí recargan en caliente), `server.ts` se ejecuta una sola vez al arrancar el proceso Node — un cambio en él (o en cualquier módulo que importe, como `seed.ts`) no tiene ningún efecto hasta reiniciar el proceso a mano. Los mensajes "[vite] (client) page reload server.ts" en el log son solo un aviso del observador de archivos de Vite, no una señal de que el backend se haya recargado — causó confusión real durante esta sesión (varias pruebas con `curl` devolvieron datos obsoletos hasta reiniciar el proceso).
- Verificado en navegador: al hacer zoom sobre la Comunidad de Madrid aparecen los 179 municipios como polígonos individuales con borde blanco, coloreados de forma realista y variada (verde/amarillo/naranja) según sus datos del Excel — no un amarillo uniforme; el tooltip al pasar el ratón por "Torrejón de Velasco" muestra sus 14 porcentajes reales y distintos por objetivo; "Talamanca del Jarama" y "Montejo de la Sierra" siguen mostrando su etiqueta flotante de nombre+porcentaje (68% ambos) usando el mismo mecanismo de siempre, ahora sobre su polígono real en vez de un simple punto; al pinchar el polígono de Madrid capital se abre correctamente el panel con el nombre "Madrid" y su rejilla de objetivos.

### 2026-08-03 — FASE 1: cimientos del Grafo de Conocimiento (UUID, autoría, historial, archivado)
- **Contexto**: llegan 13 documentos normativos (`99_CONSTITUTION`, `00_VISION`, `01_PRINCIPLES`, `02_DOMAIN_MODEL`, `03_ARCHITECTURE`, `04_DATABASE`, `05_KNOWLEDGE_GRAPH`, `06_SOCIAL_NETWORK`, `07_MARKETPLACE`, `08_ECONOMY`, `09_STRIPE`, `10_PRODUCT_REQUIREMENTS`, `11_UI_GUIDELINES`), copiados a `/docs` como fuente normativa del repositorio, con un `docs/README.md` que indexa, explica la relación con `/memory` y lista las desviaciones vigentes. `/memory` queda como bitácora viva (decisiones + changelog + estado real).
- **Migración `drizzle/0007_foundation_uuid_audit_history.sql`**: añade a las 16 tablas de entidad (`territories`, `objectives`, `challenges`, `causes`, `solutions`, `indicators`, `markers`, `metrics`, `measurement_stations`, `organizations`, `projects`, `content`, `users` y las 3 de observaciones) las columnas `uuid` (único, `gen_random_uuid()`), `created_by`, `updated_by`, `version`, `archived_at` y `updated_at`, más índices por `uuid` y `archived_at`. Se aplica con un bloque `DO` que itera la lista de tablas en vez de 96 `ALTER` a mano. Todas las filas existentes recibieron UUID retroactivamente.
- **Nueva tabla `entity_history`**: historial universal polimórfico (`entity_type`, `entity_id`, `entity_uuid`, `version`, `operation`, `snapshot` jsonb, `previous` jsonb, `changed_by`, `changed_at`). Registra `create`, `update`, `archive` y `restore` con la fila completa antes y después.
- **`schema.ts`**: nuevo objeto `auditColumns` aplicado por spread a todas las entidades, para no repetir ni olvidar esas columnas al crecer el dominio. Añadida la tabla `entityHistory`.
- **`server.ts`**: nuevos helpers `ENTITY_TABLES` (mapa explícito nombre→tabla, evita interpolar en SQL nada procedente de la URL), `actorFromRequest`, `fetchEntityRow`, `recordHistory` y `bumpAudit`. `handleUpsertEntity` registra historial y versiona sin tocar ninguna de sus ~11 ramas `ON CONFLICT` ya probadas.
- **Archivado en vez de borrado** (principio 6 de la Constitución): `handleDeleteEntity` → `handleArchiveEntity`, que hace `UPDATE ... SET archived_at = now()`. La ruta `DELETE /api/data/:entity/:id` se conserva por compatibilidad; cambia la semántica. Las filas de las tablas de unión NO se borran, así que restaurar devuelve la entidad completa. Nuevos endpoints `POST /api/data/:entity/:id/restore`, `GET /api/data/:entity/:id/history` y `GET /api/data/:entity/archived` (papelera).
- **19 consultas de lectura parcheadas** con `archived_at IS NULL`: los listados `/api/data/*`, el `getTable` genérico, las 4 consultas de retos del explorador (una por nivel), los hijos indicador/marcador/métrica, las causas de un reto, las soluciones por reto y los metadatos de indicadores usados en el cálculo de puntuaciones.
- **Protección de jerarquía**: `ARCHIVE_BLOCKERS` impide archivar un objetivo con indicadores activos, un indicador con marcadores activos, un marcador con métricas activas o un territorio con hijos, devolviendo HTTP 409 con mensaje explicativo — reintroduce a propósito la protección que antes daban las claves foráneas al borrar.
- **Interfaz**: el botón "Eliminar" del `EditModal` pasa a "Archivar" (ámbar, con explicación al pasar el ratón).
- **Verificado de extremo a extremo**: archivar R017 (Incendios) → la fila permanece en la BD con `version=2` y autor, desaparece de la API (20→19 retos) → el historial registra la operación → aparece en la papelera → restaurar lo devuelve visible (19→20) con sus 6 causas y pesos intactos; editar genera una entrada `update` con valores antes/después; intentar archivar `IND_AGUA_CALIDAD` (7 marcadores vivos) se rechaza con HTTP 409 y el indicador sigue visible. Datos de prueba revertidos; el historial se conserva a propósito (4 entradas).
- **Seguridad — claves de Stripe**: el usuario dejó `Claves API Stripe/*.rtf` dentro del repositorio. Resultaron ser claves de PRODUCCIÓN (`sk_live_`/`pk_live_`), no de test. Se añadieron al `.gitignore` esa carpeta y los patrones `*.rtf`, `secrets/`, `*.pem`, `*.key` (comprobado que nunca llegaron a subirse a GitHub), y se movieron a `.env` **aparcadas** en `STRIPE_SECRET_KEY_LIVE`/`VITE_STRIPE_PUBLISHABLE_KEY_LIVE`, que el código no lee. Las variables activas quedan vacías para que nada de lo que se construya pueda generar cobros reales. Ver `03_DECISIONS.md`.

### 2026-08-03 — FASE 2: usuarios, roles y perfiles (autenticación real)
- **Migración `drizzle/0008_users_roles_profiles.sql`**: amplía `users` con `password_hash`, `role_level` (0-4), `email_verified` y todo el perfil de `06_SOCIAL_NETWORK.md` (`display_name`, `avatar_url`, `banner_url`, `bio`, `location`, `website`, `socials` jsonb, `specialties` jsonb, `organization_id`, `reputation`, `impact_score`, `last_login_at`). Nuevas tablas `user_territories`, `user_objectives`, `user_indicators` (territorios donde trabaja y favoritos, por id y no por texto), `sessions` y `password_resets`. Índice único sobre `lower(email)`.
- **Nuevo módulo `src/server/auth.ts`** (independiente, se registra con `registerAuthRoutes(app, db)` según el requisito de modularidad de `03_ARCHITECTURE.md`): hasheo con `scrypt` nativo de Node (sin dependencias nuevas), sesiones con token opaco en cookie `httpOnly`, y los 4 niveles de rol de `06_SOCIAL_NETWORK.md`. Exporta `ROLE`, `ROLE_LABELS` y la guarda reutilizable `requireLevel(n)`.
- **Endpoints**: `POST /api/auth/register`, `/login`, `/logout`, `GET /api/auth/me`, `PUT /api/auth/me` (perfil), `POST /api/auth/password/change`, `/password/forgot`, `/password/reset`, más `GET /api/admin/users` y `PUT /api/admin/users/:id/role` (ambos exigen nivel 4).
- **Vulnerabilidad corregida**: el `AuthContext` anterior comparaba las credenciales de administrador EN EL CÓDIGO DEL CLIENTE y guardaba la sesión en `localStorage` — las credenciales eran visibles en las herramientas de desarrollo y bastaba editar `localStorage` para hacerse administrador. Ahora la sesión la resuelve siempre el servidor desde una cookie `httpOnly` que el JavaScript de la página no puede leer. El nuevo contexto además limpia la clave `evo_auth_user` que dejó el sistema anterior.
- **`src/db/seed-admin-user.ts`**: crea/actualiza el administrador real (`eugenio@lighthumanity.org`, nivel 4) con la contraseña hasheada, tomándola de `ADMIN_PASSWORD` si está definida. La contraseña nunca se guarda en claro.
- **`Login.tsx` reescrito**: una sola página con tres modos (iniciar sesión, crear cuenta, recuperar contraseña) en vez de solo el acceso de administrador.
- **`server.ts`**: `actorFromRequest()` pasa a usar el usuario real de la sesión, de modo que la autoría y el historial de la Fase 1 quedan atribuidos correctamente.
- **Verificado de extremo a extremo**: contraseña incorrecta rechazada; login correcto devuelve nivel 4; la cookie es `HttpOnly`; registro crea usuarios de nivel 1; contraseña de menos de 8 caracteres y email duplicado rechazados; un usuario de nivel 1 recibe 403 al listar usuarios o al intentar cambiar roles; **un usuario no puede autoascenderse enviando `role_level`/`isAdmin` en el editor de perfil** (comprobado: sigue en nivel 1); la recuperación de contraseña invalida la contraseña anterior y acepta la nueva; cerrar sesión deja `/api/auth/me` en `null`. En el navegador, la insignia ADMIN y los menús de administración aparecen a partir de la sesión real del servidor. Usuario de prueba eliminado.

### 2026-08-03 — FASES 3, 4, 5 y 8: grafo de conocimiento, red social, mercado y ejemplo completo
- **Migración `drizzle/0009_graph_social_marketplace.sql`** (la base de datos pasa de 62 a 87 tablas). Función `rh_add_audit_columns(tbl)` para aplicar las columnas transversales de la Fase 1 a cada tabla nueva sin repetir 6 `ALTER`.
  - **Fase 3**: `needs` (el eslabón que faltaba entre Solución y Producto), `solution_needs`, `need_territories`.
  - **Fase 5**: `products` (sin entidad "Servicio" separada: es un valor de `category`, por instrucción del usuario) y `demands`, con sus 11 tablas de unión al grafo.
  - **Fase 7 (estructura)**: `initiatives`, `success_cases`, `initiative_results` (indicadores antes/después) y 8 tablas de unión. `projects` se conserva intacto; la columna `legacy_project_id` deja trazada la procedencia cuando se complete la migración de datos.
  - **Fase 4**: `publications`, `publication_links` (polimórfica), `comments` (con respuestas anidadas), `reactions`, `saves`, `follows`, `notifications`, `content_reports`.
  - **Fase 6 (estructura)**: `stripe_accounts`, `transactions`, `transaction_links` (polimórfica), `refunds`, `supports`.
  - **Fase 9 (estructura)**: `ai_conversations` (con `edit_mode`: manual/aceptar/autónomo), `ai_messages` (con `sources` para distinguir plataforma de internet, y coste/tokens), `ai_proposed_actions` (el modelo nunca escribe en la base de datos: propone y el backend valida), `ai_knowledge_chunks` (RAG, con índice GIN de texto completo en español) y `ai_knowledge_gaps`.
- **Nuevo módulo `src/server/graph.ts`**: el grafo no es una tabla, es una vista sobre las tablas de unión existentes. Las 39 aristas se declaran **como datos** en el mapa `EDGES` y `buildAdjacency()` las registra automáticamente en ambos sentidos, de modo que navegar de un reto a sus productos y de un producto a sus retos funciona sin escribir dos consultas. Endpoints `GET /api/graph/:type/:id` (ficha + todos los vecinos agrupados por tipo), `/neighbours`, `/api/graph/schema` (mapa del grafo, pensado para la IA) y `GET /api/search` (búsqueda global sobre las 17 entidades). Las publicaciones y transacciones aparecen automáticamente en la ficha de cualquier entidad que mencionen, cumpliendo la regla de `06_SOCIAL_NETWORK.md` sin enlazarlas a mano.
- **Nuevo módulo `src/server/social.ts`**: publicaciones con enlaces al grafo, feed personalizado (relevancia = entidades seguidas mencionadas, +2 si sigues al autor), comentarios con respuestas, reacciones/guardados/seguimientos como interruptores, notificaciones automáticas a los seguidores de las entidades mencionadas, reportes de contenido, perfil público con estadísticas, y el mercado completo (productos y demandas con filtros por territorio/objetivo/indicador/reto/categoría). Crear productos y demandas exige nivel 2; publicar y comentar, nivel 1.
- **Nuevo `src/db/seed-example-chain.ts`**: siembra el ejemplo completo pedido y los datos de demostración (5 usuarios, 5 organizaciones, 5 retos con 5 causas ponderadas, 5 soluciones, 5 necesidades, 5 productos, 5 demandas, 5 iniciativas con resultados medidos, 1 transacción, 5 casos de éxito, 20 publicaciones, 9 seguimientos, 9 reacciones y 5 comentarios), todo con contenido realista y en español.
- **Verificado**: la cadena **Reto nitratos → Solución humedales → Necesidad sensores → Demanda → Producto → Transacción → Iniciativa Arroyo Norte → Resultados medidos → Caso de éxito → Publicaciones** se recorre entera por `/api/graph`, y también **en sentido inverso**: desde el producto se llega a su necesidad, demanda, reto, solución, iniciativa, indicador, objetivo, territorio y 3 publicaciones. Los filtros del mercado, el feed y la búsqueda global responden correctamente.

### 2026-08-03 — FASE 5 (interfaz) y FASE 9: página de Mercado y asistente IA universal
- **Nueva página `/mercado`** (`src/pages/Mercado.tsx`), según `07_MARKETPLACE.md`: pestañas de Ofertas y Demandas con contador, buscador, filtros por territorio/objetivo/tipo/estado, tarjetas de producto con precio, modalidad y organización, y tarjetas de demanda con estado (Abierta/En negociación/Cubierta/Cancelada) y urgencia. Botón de publicar visible solo a partir de nivel 2.
- **Nuevo módulo `src/server/ai/provider.ts`**: capa de proveedor de IA independiente del modelo. Interfaz `AIProvider` + registro; `ClaudeProvider` llama a la API de Anthropic por HTTP sin añadir el SDK como dependencia. Añadir OpenAI/Gemini/Mistral es implementar la interfaz y registrarla, sin tocar nada más.
- **Nuevo módulo `src/server/ai/assistant.ts`**, con las tres piezas separadas que pide el encargo:
  - **RAG**: `retrieveContext()` busca en el grafo por coincidencia directa y por índice de texto completo en español (`ai_knowledge_chunks`), y marca cada fragmento con su procedencia.
  - **Modelo**: recibe el estado actual de la pantalla del usuario (ruta, territorio, nivel, entidad seleccionada), su rol y el contexto recuperado; responde en texto más un bloque JSON con `ui_events` y `actions`.
  - **Agente de acciones**: el modelo **nunca** escribe en la base de datos. Las acciones se guardan en `ai_proposed_actions` y se ejecutan solo tras validar el catálogo cerrado (11 acciones con nivel mínimo), el modo de edición y una **revalidación del permiso en el momento de aplicar**.
  - Endpoints: `/api/ai/status`, `/api/ai/chat`, `/api/ai/conversations`, `/api/ai/actions/:id/decide` (el Sí/No), `/api/ai/admin/stats` (conversaciones, mensajes, coste diario/mensual, tokens, vacíos de conocimiento, entidades más consultadas) y `/api/ai/admin/reindex`.
- **Nuevo componente `src/components/ai/AIAssistant.tsx`**: botón flotante permanente que abre un panel de un tercio de pantalla con historial, nueva conversación, sugerencias de inicio, **selector de permisos de edición (Manual / Aceptar / Autónomo)**, **botón de búsqueda en internet**, distinción visual del origen de cada dato (plataforma vs internet) y confirmación Sí/No de cada acción propuesta. Aplica los eventos de navegación que devuelve el modelo, de modo que la IA controla la interfaz.
- **`Layout.tsx`**: monta `AIAssistant` en lugar del antiguo `ChatAssistant` (que se conserva en el repositorio, sin borrar), y la insignia de usuario pasa a mostrar el **rol real** (`user.roleLabel`) en vez de "Admin" fijo.
- **Vacíos de conocimiento**: cuando una pregunta no encuentra nada en la plataforma, queda registrada en `ai_knowledge_gaps` para el panel del administrador — es el mecanismo de "detectar qué conocimiento falta" del encargo.
- **Verificado en navegador**: el Mercado muestra los 5 productos y 5 demandas sembrados con sus precios, estados y urgencias reales; el panel del asistente abre a un tercio de pantalla, muestra los tres modos de permiso y avisa con un mensaje explícito de que falta `ANTHROPIC_API_KEY`; `/api/ai/chat` devuelve 503 con ese mismo mensaje en vez de fallar de forma opaca; el mapa sigue funcionando e integra los nuevos retos sembrados.

### 2026-08-04 — Asistente IA activado: clave de Anthropic, y corrección de dos fallos reales en el RAG
- **Limpieza**: eliminado por completo `src/components/ui/ChatAssistant.tsx` (el asistente antiguo), a petición explícita del usuario — ya no quedaba ninguna referencia en el código, solo un comentario explicativo en `Layout.tsx` que también se retiró.
- **Clave de Anthropic activada**: el usuario aportó `sk-ant-api03-...` en una carpeta `clave api claude/` (ya protegida por el patrón `*.rtf` del `.gitignore` añadido el día anterior). Se movió a la variable `ANTHROPIC_API_KEY` en `.env`, que hasta ahora estaba vacía. El asistente pasó de "inactivo" a "conectado".
- **Dos fallos reales corregidos en `src/server/ai/assistant.ts`** (`retrieveContext`), encontrados al hacer la primera pregunta real: (1) la búsqueda directa comparaba títulos contra la pregunta completa en vez de contra palabras clave extraídas — nunca podía coincidir; (2) la tabla `ai_knowledge_chunks` nunca se había reindexado (`/api/ai/admin/reindex` existía pero no se había ejecutado nunca) — se ejecutó una vez, indexando 479 fragmentos. Ver el detalle completo, incluido un tercer fallo de sintaxis SQL corregido durante el arreglo, en `03_DECISIONS.md`.
- **Verificado**: la pregunta "Explícame el reto de contaminación por nitratos y qué solución se aplica en el Arroyo Norte" ahora responde con datos reales y precisos (reducción de nitratos 62→28 mg/l, humedal de 1,2 ha, 8 sensores) citando **12 fuentes de la plataforma**. Verificado también en el navegador: el panel muestra "Conectado", y la pregunta "Llévame al municipio de Talamanca" identifica el territorio T014 con el origen correctamente etiquetado.

### 2026-08-04 — FASE 6: economía y Stripe (modo test), y dos fallos reales corregidos al verificarlo
- **Claves de test activadas**: el usuario aportó `pk_test_`/`sk_test_` en una carpeta protegida por `.gitignore`. Verificada contra la API real de Stripe (`livemode: false`) antes de construir nada encima.
- **Nuevo módulo `src/server/stripe.ts`**: coexiste con el flujo de socios/membresía ya existente en `server.ts` (sin tocarlo). Incluye:
  - **Stripe Connect**: `/api/stripe/connect/onboard` (crea cuenta Express + enlace de onboarding), `/status`, `/dashboard-link`, `/disconnect`.
  - **Checkout embebido de productos**: `/api/stripe/checkout/product` — pago único o suscripción según la modalidad del producto; si el vendedor tiene Connect activo, reparte el pago automáticamente (transferencia + comisión de plataforma vía `PLATFORM_FEE_BPS`, 5% por defecto).
  - **Apoyo a creadores** (estilo Patreon, `08_ECONOMY.md`): `/api/stripe/checkout/support` — donación puntual o recurrente a un usuario, organización o iniciativa.
  - **Reembolsos**: `/api/stripe/refunds` — solo el vendedor (`payee_user_id`) o un administrador puede reembolsar; valida el estado de la transacción antes de llamar a Stripe.
  - **Panel financiero**: `/api/stripe/dashboard` — ventas, compras, donaciones recibidas/hechas, suscripciones activas, reembolsos emitidos y las 20 transacciones más recientes.
  - `handleMarketplaceWebhookEvent()`, invocada desde el webhook único de `server.ts` (que sigue montado antes de `express.json()` para la firma): crea `transactions`/`transaction_links` o `supports` según `metadata.kind` al completarse un Checkout, sincroniza `stripe_accounts` en `account.updated`, y refleja reembolsos emitidos desde el propio panel de Stripe (`charge.refunded`).
- **Nuevo componente `src/components/stripe/EmbeddedCheckoutModal.tsx`**: generaliza el patrón de Checkout embebido que ya usaba `HazteSocio.tsx` (`loadStripe` + montaje) para poder reutilizarlo en la compra de productos y en el apoyo a creadores sin duplicar la lógica de montaje.
- **Nueva página `/panel-financiero`**: balance, onboarding/estado de Connect, transacciones recientes con botón de reembolso.
- **`Mercado.tsx`**: botón "Comprar"/"Suscribirse" en cada producto, abre el Checkout embebido real.
- **Dos fallos reales encontrados y corregidos al verificar en el navegador** (detalle completo en `03_DECISIONS.md`):
  1. El SDK de Stripe cambió `initEmbeddedCheckout` por `createEmbeddedCheckoutPage` en tiempo de ejecución; el código (nuevo Y el ya existente en `HazteSocio.tsx`) probaba el nombre antiguo primero, que existe pero lanza una excepción en vez de estar ausente. Corregido invirtiendo el orden en ambos sitios.
  2. El onboarding de Stripe Connect requiere una activación manual, una sola vez, en el panel de Stripe del usuario (`dashboard.stripe.com/connect`) — no es un fallo de código, documentado como paso pendiente.
- **Verificado**: sesión de Checkout embebida real montada en el navegador con el producto, precio y sello "TEST MODE" correctos; ciclo completo de webhook probado con un evento sintético de `checkout.session.completed` (válido al no haber webhook secret todavía) — la transacción se crea, se enlaza al grafo y aparece en el panel financiero; un reembolso sobre un pago sintético es rechazado limpiamente por la API real de Stripe. Dato de prueba eliminado.

### 2026-08-04 — Paneles laterales redimensionables y grabados en la cuenta del usuario
- **Petición**: el asistente de IA se superponía al mapa como una capa flotante (`fixed`) en vez de ocupar una columna real; el usuario pidió que ocupase un 20% de ancho por defecto, se pudiera arrastrar para cambiar su tamaño, y que ese ancho (y el de los demás paneles laterales) quedase grabado en su cuenta, no solo en el navegador.
- **`users.ui_settings`** (`drizzle/0010_user_ui_settings.sql`): columna `jsonb NOT NULL DEFAULT '{}'`. Se guarda ahí `panelWidths` (mapa clave → % de ancho). Nuevo endpoint `PUT /api/auth/ui-settings` (separado de `PUT /api/auth/me`, que reemplaza el perfil completo) hace una fusión superficial jsonb (`ui_settings || $1`), porque se llama muy a menudo (cada vez que se suelta un asa de redimensionado) y solo debe tocar esa preferencia.
- **`src/hooks/usePanelWidth.ts`** (nuevo): hook genérico — ancho en localStorage (instantáneo, funciona sin sesión) y en `users.ui_settings` vía `AuthContext.updateUiSettings` (con debounce de 600 ms, solo si hay sesión). Expone `startResize(edge)`, un handler de `onMouseDown` para el asa; `edge` es el borde físico del panel donde vive el asa ('right' para paneles anclados a la izquierda, 'left' para paneles anclados a la derecha), así el cálculo del delta es correcto en ambos sentidos.
- **`src/components/ui/ResizeHandle.tsx`** (nuevo): asa de redimensionado visual reutilizable, misma prop `edge` para posicionarse exactamente sobre el borde divisorio.
- **`AIAssistant.tsx`**: el panel deja de ser `fixed inset-y-0 right-0` (superpuesto). En escritorio (≥768px) se renderiza como una columna real (`relative`, `width: ${width}%`) dentro de la misma fila flex que `<main>` en `Layout.tsx` — al abrirse, empuja el mapa en vez de taparlo. En pantallas pequeñas se mantiene como cajón a pantalla completa (un 20% de un móvil es inútil). `usePanelWidth('ai_assistant', 20, {min:18, max:45})`.
- **`Map.tsx`**: las columnas "Filtros" (`usePanelWidth('filtros', 16, {min:10,max:30})`) y "panel de territorio" (`usePanelWidth('explorer', 40, {min:25,max:60})`) ganan asa de redimensionado en su borde derecho. La columna del mapa (`flex-1`) absorbe automáticamente el espacio restante.
- **Fallo real encontrado y corregido**: `usePanelWidth` sincronizaba un `latestWidth` (ref) con el estado `width` vía `useEffect`, y `commit()` (llamado en `mouseup`) leía ese ref. Si el `mouseup` llega justo después del último `mousemove` (dentro del mismo tick, como ocurre en un arrastre rápido real o al simular el evento), el efecto aún no se había ejecutado y `commit()` grababa el ancho ANTERIOR al arrastre, no el final — el panel se veía redimensionado visualmente pero el valor persistido quedaba desfasado. Corregido actualizando `latestWidth.current` de forma síncrona dentro del propio handler de `mousemove`, sin depender del efecto.
- **Verificado en navegador**: los tres paneles (asistente, filtros, panel de territorio) se redimensionan arrastrando su asa; el ancho sobrevive a recargar la página vía localStorage sin sesión, y vía `users.ui_settings` con sesión iniciada (confirmado directamente en la base de datos: `{"panelWidths":{"ai_assistant":27}}`, y que el panel carga ese 27% — no el 20% por defecto — nada más recargar). Dato de prueba eliminado tras verificar.
- **Nota operativa**: el servidor de desarrollo necesita las variables de entorno vía `node --env-file=.env node_modules/.bin/tsx server.ts` (así lo define `.claude/launch.json`) — `npm run dev` a secas (`tsx server.ts`) NO carga `.env`, porque no hay ninguna llamada a `dotenv.config()` en el código; sin las variables `SQL_*`, el driver de Postgres intenta conectar a una base de datos con el nombre del usuario del sistema operativo y falla. Detectado porque `preview_start` con `{name}` falló al intentar lanzar el servidor él mismo (error de sandbox al resolver el directorio de trabajo bajo la carpeta sincronizada de OneDrive, que además contiene un "&" en el nombre) — el rodeo fue arrancarlo a mano con `Bash` usando el mismo comando exacto de `launch.json` y apuntar el navegador a la URL ya viva.

### 2026-08-04 — 32 países de Europa con datos de prueba generados por IA, marcados como tal en la base de datos
- **Petición**: añadir los territorios de los países de Europa (España e Italia ya existían) e introducir números aleatorios en los 14 objetivos para que no queden vacíos, marcando en la propia base de datos qué valores son de prueba (IA) y cuáles son reales, para saber qué revisar.
- **`drizzle/0011_ai_generated_flag.sql`**: columna `is_ai_generated boolean NOT NULL DEFAULT false` en `territories` (todo el territorio se sembró de prueba) y en `indicator_observations` (ese valor concreto es un número aleatorio, no una medición real).
- **`src/db/seed-europe-countries.ts`** (nuevo): añade 32 países (todos los de Europa salvo España/Italia, que ya existían) a la tabla `territories` (`type: 'country'`, `parent_id: 'T002'`, `is_ai_generated: true`, población real aproximada — SOLO las puntuaciones de los 14 objetivos son aleatorias, no la geografía/demografía). Genera una puntuación aleatoria (0-100) por país y objetivo, y la copia a todos los indicadores de ese objetivo (mismo criterio de simplificación que `seed-madrid-municipios.ts`), insertando `indicator_observations` con `is_ai_generated: true` y un `raw_value`/`source` explícitos ("Dato de prueba generado por IA"). Idempotente (borra e inserta de nuevo las observaciones de estos territorios en cada ejecución).
- **Salud (O004) no tenía ningún indicador en la base de datos** (hueco previo a esta sesión, no introducido por ella) — sin uno no había dónde colgar una `indicator_observation`, y su puntuación se habría quedado siempre en "Sin datos" para los países nuevos. Se creó un único indicador compuesto `IND_SALUD_GENERAL` (peso 1) en vez de recurrir al diccionario legado `progress_by_territory` de `src/data/seed.ts` (que no es marcable en base de datos) — mantiene los 14 objetivos con el mismo mecanismo, consistente con lo pedido.
- **`src/data/seed.ts`**: los 32 países también se añadieron al array estático `territories` (con sus coordenadas `[lng, lat]`) — es la fuente real que usa `/api/geo/territories/centroids` para posicionar los puntos en el mapa; la tabla de la base de datos por sí sola no basta (ver `memory/02_DATABASE.md` sobre esta duplicidad de fuentes).
- **Insignia en la interfaz**: `Objectives.tsx` (usada tanto en `/objetivos` como embebida en el panel de territorio del mapa) muestra un aviso ámbar "Datos de IA · Pendiente de revisión" junto al nombre del territorio cuando `territories.is_ai_generated` es `true`.
- **Fallo real encontrado y corregido al verificar**: Salud mostraba 50% en vez de la puntuación aleatoria real. Causa: `indicatorsMetaCache` en `server.ts` (caché en memoria "para toda la vida del proceso") se había poblado sirviendo peticiones anteriores, ANTES de crear `IND_SALUD_GENERAL` — el proceso seguía sin conocer ese indicador nuevo, así que su objetivo caía al valor de resguardo (50). Se resolvió reiniciando el servidor de desarrollo; no es un fallo de lógica sino una consecuencia esperada de esa caché, documentada aquí para la próxima vez que se añada un indicador con el servidor ya arrancado.
- **Caveat pendiente, no resuelto en esta sesión**: `public/geo/countries.json` (los polígonos de relleno a zoom de país) solo tiene features para España e Italia. Los 32 países nuevos se posicionan correctamente como puntos (centroides) a zoom de continente, pero no tendrán polígono de relleno propio a zoom de país hasta que se añada su geometría — igual que ya ocurre, sin relación con esta sesión, con Argentina/Guinea Ecuatorial/Etiopía.
- **Verificado**: `GET /api/geo/territories/centroids?parentId=T002` devuelve los 34 países de Europa (2 reales + 32 de prueba); `Francia` carga con sus 14 objetivos poblados y la insignia visible; `España` sigue mostrando sus datos reales sin insignia (verificado que no hay regresión). Datos de prueba de `users.ui_settings` usados para verificar la sesión anterior, eliminados tras comprobar.

### 2026-08-04 — Interfaz de la red social: Muro (feed) y perfil público de persona
- **Petición**: terminar la Fase 4 — la API ya estaba completa y probada (`GET /api/feed`, `POST /api/publications`, `/api/react`, `/api/save`, `/comments`, `GET /api/users/:id/profile`); faltaban las páginas.
- **`src/pages/Muro.tsx`** (nuevo, ruta `/muro`): composer (`POST /api/publications`), feed ordenado por relevancia (`GET /api/feed`, prioriza lo que sigues), tarjetas con autor enlazado a su perfil, insignias de entidades enlazadas (usa `resolveEntityLink` de `src/utils/entityLinks.ts`, creado en la sesión anterior y usado aquí por primera vez), reacción (corazón, interruptor optimista), comentarios expandibles con su propio composer, y guardado.
- **`src/pages/PersonaPublica.tsx`** (nuevo, ruta `/personas/:id`): cabecera con banner/avatar, bio, ubicación/web, reputación, estadísticas (publicaciones/seguidores/siguiendo), botón Seguir (`POST /api/follow`) y botón Apoyar que abre un selector de importe (5/10/25 €) y después el Checkout embebido real de Stripe (`POST /api/stripe/checkout/support`, ya construido en la Fase 6) — reutiliza `EmbeddedCheckoutModal` sin duplicar lógica de montaje. Lista de publicaciones del autor vía el filtro `author_id` de `GET /api/publications` (añadido en la sesión anterior).
- **`Layout.tsx`**: "Muro" añadido al menú de navegación principal.
- **Verificado en navegador**: publicación creada desde el composer aparece al instante en el feed; reacción, comentario (con su POST real confirmado por red) y feed completo con los 20 posts de la cadena de ejemplo (con sus insignias de reto/solución/iniciativa/indicador resueltas correctamente) funcionan; en el perfil de Lucía Fernández, Seguir/Dejar de seguir alterna correctamente (`POST /api/follow` confirmado por red) y Apoyar abre el Checkout embebido real de Stripe en modo test con el importe correcto. Estado de prueba (seguimiento, comentario) revertido/aceptado como dato real de demo tras verificar.

### 2026-08-04 — Barra de búsqueda global superior
- **Petición**: "una barra de búsqueda superior que te permita buscar en toda la base de datos y te ordene los resultados por categorías: productos, retos, indicadores, personas de forma visual".
- **`src/components/ui/GlobalSearch.tsx`** (nuevo): usa `GET /api/search` (ya existía, busca a la vez en las 17 tablas del grafo — no hizo falta tocar el backend). Agrupa los resultados por categoría con icono (Productos, Retos, Indicadores, Personas primero, después el resto), con debounce de 250 ms. Cada resultado se resuelve a una ruta real con `resolveEntityLink` (`src/utils/entityLinks.ts`); los tipos sin ficha propia (productos, demandas, iniciativas, publicaciones, marcadores, métricas, causas, casos de éxito) se muestran igualmente, marcados "sin ficha", en vez de ocultarlos.
- **`entityLinks.ts`**: se añadió soporte para `indicators` (faltaba) — enlaza a `/indicadores/:id`, que acepta el id crudo directamente (confirmado leyendo `IndicatorDetail.tsx`).
- **`Layout.tsx`**: la barra de "superior" pedida por el usuario es ahora una fila real (no flotante) en la parte de arriba de toda la aplicación, con la búsqueda centrada y el selector de tamaño de letra (antes un botón `fixed` suelto) integrado como su elemento derecho — se unificaron en la misma franja para no superponerse.
- **Verificado en navegador**: buscar "agua" agrupa correctamente en Productos/Retos/Indicadores/Objetivos/Organizaciones/Iniciativas/Demandas/Publicaciones/Proyectos; pulsar "Escasez de agua" navega a su ficha real y cierra el desplegable.

### 2026-08-04 — Asistente IA: búsqueda real en internet (herramienta nativa de Claude)
- **Petición**: el botón "Internet" del asistente ya existía en la interfaz, pero en el backend era un aviso fijo — `search_web` añadía siempre una fuente falsa `{id: 'pendiente'}` sin buscar nada de verdad. Se pidió activar la búsqueda real.
- **`src/server/ai/provider.ts`**: `AICompletionRequest` gana `webSearch?: boolean`; cuando está activo, la petición a la API de Claude incluye `tools: [{type: 'web_search_20250305', name: 'web_search', max_uses: 3}]` — es una herramienta que ejecuta el propio servidor de Anthropic dentro de la misma llamada (no hace falta bucle agente/herramienta en nuestro backend, ni clave de un buscador aparte como Google/Bing). Las citas reales (`url`, `title`) que el modelo usó vienen adjuntas a los bloques de texto de la respuesta (`citations`) y se extraen deduplicadas por URL en `AICompletionResult.webSources`.
- **`src/server/ai/assistant.ts`**: `sources` ahora añade una entrada `{type:'web', url, title, origin:'internet'}` por cada página realmente citada — nunca una fija. Si `search_web` está activo pero la pregunta no necesitaba buscar nada, no aparece ninguna fuente de internet (antes aparecía siempre). El *system prompt* gana una regla condicional: con la búsqueda activada, se le pide priorizar el contexto de la plataforma y usar internet solo para lo que no cubra; desactivada, se le pide no fingir que ha buscado nada.
- **`AIAssistant.tsx`**: además de la insignia "N de internet" ya existente, ahora se listan los enlaces reales citados (título + URL, abren en pestaña nueva) debajo del mensaje.
- **Nota sobre citas**: no todas las respuestas con búsqueda activada traen citas — Anthropic solo las adjunta a los tramos de texto que se apoyan directamente en un resultado concreto; una respuesta que resume o combina varias fuentes en una frase puede no citarlas todas. Es un comportamiento esperado del proveedor, no un fallo — verificado con varias preguntas de hecho directo (población de Suecia, Bélgica, Portugal) que sí devolvieron citas reales con URL verificable (Worldometer, Countrymeters).
- **Verificado**: con `search_web:false`, cero fuentes de internet (antes de esta sesión JAMÁS ocurría, aunque no se hubiese buscado nada). Con `search_web:true` y una pregunta de hecho reciente, la respuesta cita fuentes reales con fecha de 2026-08-04 coherente con "hoy", y el enlace de la interfaz apunta a la URL real. Probado también desde el propio panel del asistente en el navegador (pregunta sobre la población de Suecia), con el enlace a Worldometer visible y funcional.

### 2026-08-04 — Asistente IA: adjuntar imagen o PDF (multimodal)
- **`server.ts`**: `/api/ai/chat` gana su propio límite de tamaño de cuerpo (`express.json({limit:'20mb'})`), registrado ANTES del `express.json()` global (100kb) para no afectar al resto de la API — un adjunto en base64 no cabría en el límite por defecto.
- **`src/server/ai/provider.ts`**: `AIMessage.content` admite ahora `string | AIContentBlock[]` (bloques `image`/`document` en base64, en el mismo formato que espera la API de Claude).
- **`src/server/ai/assistant.ts`**: `POST /api/ai/chat` acepta `attachment: {name, media_type, data}`. Se valida tipo (JPG/PNG/GIF/WEBP o PDF) y tamaño (5 MB imágenes, 15 MB PDF) antes de construir el bloque multimodal. **El binario nunca se guarda en la base de datos** — `ai_messages.content` guarda solo un marcador de texto (`[Adjunto: nombre.ext]`), y el adjunto viaja únicamente en la llamada al modelo de ESE turno; en preguntas posteriores de la misma conversación no se reenvía (ni podría, al no estar persistido).
- **`AIAssistant.tsx`**: botón "Adjuntar" junto al de Internet, con vista previa (nombre + icono según tipo) y opción de quitar antes de enviar; validación del mismo límite en el cliente para no esperar al servidor con archivos claramente inválidos.
- **Verificado de extremo a extremo, incluida la interfaz real**: se generó una imagen PNG de prueba (rectángulo rojo a la izquierda, azul a la derecha) y se adjuntó desde el propio panel del asistente en el navegador — la respuesta describe correctamente ambos colores y su disposición; comprobado en la base de datos que `ai_messages.content` solo contiene `[Adjunto: test.png]`, nunca el binario. Probado también el rechazo de tipos no admitidos (`application/x-msdownload`) con mensaje de error claro.

### 2026-08-05 — FASE 11: Grafos de Conocimiento, renombrado a "Humanity.wiki" y reestructuración del layout
- **Petición del usuario** (con boceto en servilleta + dos capturas de referencia): nueva forma de acceder al conocimiento — lienzos curados de "Ventanas de Conocimiento" conectadas, invocables desde un chat/buscador inferior siempre desplegado; la plataforma pasa a llamarse **Humanity.wiki**. Decisiones fijadas por AskUserQuestion: Grafos como INICIO (/), menú superior global, canvas libre (React Flow), creación abierta a nivel 1.
- **Modelo de datos** (migraciones 0012 y 0013): `knowledge_graphs` (tema, creador, `trigger_keywords`, estado, vistas), `knowledge_windows` (REUTILIZABLES entre grafos, 13 tipos con CHECK), `graph_windows` (posición x/y por grafo — la memoria espacial), `graph_edges` (7 relaciones tipadas con CHECK: contexto/causa/dato/fuente/**apoya/contradice/matiza** — la controversia mapeada honestamente), `ratings` 0-10 polimórfica, `graph_entity_links` (anclaje al grafo general con trata_sobre/afecta_a/se_apoya_en), y comentarios polimórficos (backfill de 6 filas, publication_id ahora nullable).
- **Mejores prácticas KG** (petición explícita mid-build, captura de Couchbase): los seis componentes canónicos quedan cubiertos — entidades (NODE_TYPES), identificadores (id+uuid+slug), atributos (config jsonb + auditoría), relaciones (aristas tipadas), **ontología aplicada en BD** (CHECKs, migración 0013) e **inferencia** (grafos relacionados derivados de entidades compartidas, sin enlace manual). Documento normativo nuevo: `docs/12_KNOWLEDGE_GRAPHS.md`.
- **Backend** `src/server/knowledge.ts`: CRUD de grafos/ventanas/aristas/anclajes, `GET /api/graphs/resolve` (fast-path por keywords normalizadas, SIN gastar IA), `POST /api/rate`, comentarios genéricos `/api/comments`, contadores de vistas, permisos creador-o-admin. Integrado en NODE_TYPES/LINKABLE/ENTITY_TABLES/reindex.
- **IA**: evento `OPEN_KNOWLEDGE_GRAPH` + acción `CREATE_KNOWLEDGE_GRAPH` (borradores marcados is_ai_generated con hasta 12 ventanas, pendientes de publicación humana); los grafos publicados viajan en el system prompt para enrutado semántico.
- **Layout global**: menú+marca+buscador+ajustes fusionados en barra superior única; barra inferior eliminada; `?embed=1` renderiza sin chrome (para incrustar el mapa dentro de ventanas). `AIAssistant` gana modo `bar`: chat centrado abajo siempre desplegado en las páginas de Grafos, con chips de grafos coincidentes al escribir y fast-path que abre el grafo sin llamada a la IA.
- **Páginas**: `/` (índice de grafos con autor/valoración/vistas/ventanas) y `/grafos/:slug` (canvas @xyflow/react 12 — instalado con --legacy-peer-deps por el conflicto preexistente de react-simple-maps con React 19): nodo central, ventanas-miniatura con metadatos, aristas coloreadas por relación (contradice roja y animada), arrastre persistido para el creador, panel lateral derecho con contenido completo + valoración 0-10 + comentarios, chips de ontología y grafos relacionados.
- **Renombrado**: "Red Humana" → "Humanity.wiki" en 25 archivos de src/docs + index.html (cuyo título seguía siendo "My Google AI Studio App"). Las entradas históricas de este changelog se conservan tal cual.
- **Grafo demo** `ceuta-frontera-amenazada` (seed idempotente `src/db/seed-grafo-ceuta.ts`): 10 ventanas de 9 tipos, 12 aristas, creado por **Eugenio García-Calderón Huerta** (perfil actualizado); autor-sistema `U_IA_CONOCIMIENTO` firma el contenido redactado por IA (marcado pendiente de revisión); mapa de EOM descargado de la fuente original con crédito a Abel Gil Lobo; cita EXACTA del informe del comité del Senado de EE. UU. con traducción y contexto, conectada con `contradice` al análisis jurídico que presenta también la posición marroquí; vídeo de YouTube embebido; ficha de Wikipedia vía API REST; mapa de indicadores propio incrustado (`/mapa?embed=1&territorio=ceuta`); anclado a T032/O005/O012.
- **Fallo de atribución encontrado y corregido al verificar**: el canal del vídeo no era "Memorias de Pez" (mi suposición desde el boceto) sino "La Mecedora (Ignacio Sarmiento)" — visible en el embed real. Corregido en seed y BD. Recordatorio de por qué se verifica todo en vivo.
- **Verificado en navegador**: portada nueva con marca y tarjeta del grafo (★8.5, 4 votos); escribir "Ceuta frontera amenaza" en la barra muestra el chip y abre el lienzo sin IA (resolve score 12, confident); canvas con arista roja animada "réplica jurídica"; panel del documento de EE. UU. con cita+traducción+contexto; voto 9 desde el eslider (POST /api/rate 200, media 9.0→ actualizada en nodo y panel); vídeo real embebido; pregunta a la IA SIN palabras clave literales ("conflicto de soberanía de la ciudad española del norte de África") → emite OPEN_KNOWLEDGE_GRAPH con el slug correcto; /mapa y Muro intactos con el menú arriba; reindexado (545 fragmentos).

### 2026-08-05 — Fase 11c-f: rediseño del lienzo, herramientas de creación, conexiones protagonistas, pop-ups centrales y la IA que responde comentarios
- **Rama y flujo**: creadas `develop` y `release-candidate`; `main` y `release-candidate` protegidas (solo PR, sin force-push); colaborador `pabloiea1995` invitado con permiso Write. Todo lo de esta entrada se construyó en `develop` y entró en `main` por Pull Request.
- **Rediseño del lienzo (petición del usuario, con su captura en uso real)**: el centro es la FUSIÓN de dos grandes nodos (Ceuta·Territorio × Amenaza·Concepto; `center` jsonb, migración 0014) con la atribución "fusión de Eugenio García-Calderón Huerta" sutil debajo; las relaciones del centro son CÍRCULOS grandes equidistantes en ángulos iguales; las flechas son RECTAS y gruesas y entran directas al borde de cada ventana (aristas flotantes por intersección geométrica — patrón floating edges de React Flow, con trazo invisible ancho para que sean fáciles de clicar).
- **Las conexiones, protagonistas** (migración 0015): descripción/autor/fechas en `graph_edges`; clic en el círculo o en la flecha abre su panel de atributos (de dónde → a dónde, significado, autor), editable por el creador, valorable 0-10 y comentable (las tablas polimórficas sirvieron tal cual con entity_type='graph_edges'). Las 12 conexiones del grafo de Ceuta llevan descripción editorial.
- **Herramientas de creación**: crear grafos desde el perfil (sección "Grafos de Conocimiento" como carta de presentación + CreateGraphModal con la fusión central en el formulario); añadir ventanas al lienzo (publicaciones PROPIAS, texto, enlace, vídeo, imagen, Wikipedia y referencia a OTRO grafo con PORTADA clicable); conectar ventanas con relación+etiqueta+descripción. Editar publicaciones: su autor o un administrador (PUT /api/publications/:id + lápiz en el Muro).
- **Pop-ups centrales (petición del usuario)**: clic en una ventana del grafo abre un POP-UP CENTRAL (el grafo sigue visible detrás; clic fuera o la X cierran) en vez del panel lateral. El panel de conexiones sigue lateral, diferenciándolos.
- **El chat responde con conocimiento REAL**: `GET /api/publications/resolve` — si la pregunta coincide fuertemente con una publicación existente (p. ej. «EEUU declara que Ceuta y Melilla están en territorio marroquí, ¿es cierto?» → «¿Son Ceuta y Melilla colonias? El análisis jurídico», score 7), el chat abre esa publicación en el pop-up central con los grafos donde está enlazada, SIN generar texto nuevo ni gastar IA. Orden del fast-path: pregunta→publicación, tema→grafo, resto→IA.
- **La IA responde a cada comentario humano** (`aiReplyToComment`, en 2º plano, firma U_IA_CONOCIMIENTO): reconoce lo válido, aporta UN matiz o corrección amable con base, nunca se responde a sí misma ni bloquea el comentario. Verificado con un comentario deliberadamente desinformado («EEUU ya reconoce oficialmente que Ceuta es de Marruecos») → la IA respondió distinguiendo el sentido geográfico del reconocimiento formal. En la interfaz, sus comentarios llevan avatar degradado + Sparkles, y la lista se recarga a los 5/12 s del envío.
- **Verificado de extremo a extremo en navegador**: fusión central + 9 círculos + 21 aristas renderizados; botones Ventana/Conectar visibles para el creador; pop-up de ventana abre/cierra con clic fuera y X; la pregunta del usuario en la barra abre el pop-up correcto con chips de grafos.

### 2026-08-05 — Fase 12: modelos con facturación, límites por nivel, productos en grafos, mapas de usuario, dictado por voz — y renombrado a HUMANITY.WIKI
- **Renombrado definitivo**: el usuario compró el dominio **humanity.wiki** — la plataforma pasa a llamarse así en los 32 archivos web/docs, la marca del header es `humanity.wiki`, el `<title>`, package.json (`humanity-wiki`) y el REPOSITORIO de GitHub: ahora es `eugeniogarcia30-cmd/humanity-wiki` (GitHub prohíbe nombres acabados en `.wiki`; la URL antigua redirige automáticamente). Visión declarada: superar a Wikipedia como la página más visitada en 10-20 años. "Grafos de Conocimiento" e "IA de Conocimiento" se conservan como nombres de producto/autor.
- **Selector de modelo + facturación (petición del usuario)**: catálogo `AI_MODELS` en provider.ts (Haiku 4.5 $1/$5, Sonnet 5 $3/$15, Opus 5 $5/$25, Fable 5 $10/$50 por millón de tokens, en céntimos € con convención 1$≈1€) + `AI_PLATFORM_FEE = 0.5`. El usuario elige modelo en la Configuración del asistente (con precios visibles), el body de /api/ai/chat lleva `model` (validado contra el catálogo), y cada respuesta muestra su coste real: "0,0054 € · Haiku 4.5 · incl. comisión de la plataforma". Tabla `ai_usage_charges` (migración 0016): coste Anthropic + 50% comisión + total por llamada, con `settled_at` para cuando se cobre; `GET /api/ai/usage` devuelve saldo pendiente y últimas llamadas. Verificado en vivo: 2 llamadas Haiku → 1,03 cts pendientes.
- **Límites por nivel (petición)**: `graphLimitReached()` — nivel 1 (Usuario) máx. 5 grafos y 5 mapas; nivel 2+ (Verificado) sin límite. Aplicado en CREATE_KNOWLEDGE_GRAPH, CREATE_MAP, POST /api/graphs y POST /api/maps con mensaje claro invitando a verificar la cuenta.
- **Mapas de usuario (petición)**: tabla `user_maps` (config jsonb con territorio/nivel/id alineada con los parámetros reales de la URL del mapa), acción de IA `CREATE_MAP` + evento `OPEN_USER_MAP`, rutas GET/POST /api/maps y GET /api/maps/:slug (vistas++, rating), página `/mapas/:slug` (mapa real embebido + autor + valoración 0-10 + comentarios con IA respondiendo), indexados en búsqueda global y enlazables (`LINKABLE`/`NODE_TYPES`/`ENTITY_TABLES`). Verificado E2E: "Créame un mapa de España" con Haiku en modo autónomo → CREATE_MAP → /mapas/mapa-de-espana renderizando el mapa real. Visión anotada: fusionar grafos y mapas.
- **Productos en grafos (petición)**: kind `producto` (CHECK ampliado, migración 0016) — AddWindowPanel busca en el Mercado con debounce, WindowContent renderiza portada con imagen/nombre/precio y enlace al Mercado, GrafoCanvas con chip ShoppingBag ámbar.
- **Dictado por voz (petición)**: hook `useVoiceDictation` (Web Speech API nativa, es-ES, cero dependencias) con botón Mic/MicOff en la barra de Grafos Y el panel acoplado; el texto reconocido entra en el cuadro según se habla, y escribir a mano sincroniza la base del dictado. Oculto automáticamente en navegadores sin soporte (Safari/Firefox).
- Todo verificado con tsc + navegador; construido en `develop` y fusionado a `main` por PR (flujo GitFlow-lite activo).

### 2026-08-05 — Fase 13: login con Google + Cloudflare configurado + infraestructura de despliegue
- **Login con Google (petición del usuario)**: botón "Continuar con Google" en /login vía Google Identity Services (sin dependencias npm); el ID token se verifica SIEMPRE en el servidor contra Google (audiencia + email verificado). Vinculación inteligente: si existe cuenta con ese email se vincula (google_id, migración 0017) y si no, alta automática nivel 1 con nombre y avatar de Google, sin contraseña. El botón solo aparece si GOOGLE_CLIENT_ID está configurado — pendiente de que el usuario cree el OAuth Client ID en Google Cloud Console.
- **Cloudflare humanity.wiki**: token de API (limitado a la zona) guardado en .env; 10 ajustes aplicados vía API: SSL Full strict, Always HTTPS, auto-rewrites, TLS≥1.2, HTTP/3, 0-RTT, Early Hints, Brotli, security medium, WebSockets. Zona en `pending` hasta que los nameservers en atom.com apunten a amanda/damiete.ns.cloudflare.com (tarea del usuario).
- **Infraestructura de despliegue (PR #3)**: Dockerfile multi-stage, docker-compose.prod.yml (db PostGIS + app + Caddy con healthchecks), Caddyfile (HTTPS automático, HSTS, www→apex, caché de assets), workflow GitHub Actions que despliega por SSH en cada merge a main (se omite sin fallar hasta crear los secretos DEPLOY_*; primer run en verde), .env.production.example y runbook docs/13_DEPLOY.md. El scope `workflow` del gh CLI se autorizó por device flow.

### 2026-08-05 — Fase 14: grafo «Incendios en España» + servidor en producción
- **Grafo con investigación real** (`/grafos/incendios-espana`, fusión España×Crisis): 2025 como peor año registrado (403.000 ha, EFFIS), tendencia 2015-2025 en gráfica de líneas, causalidad decenal MITECO en donut, ficha de la Sierra de la Culebra 2022 (29.670+35.960 ha), vídeo "Anatomía de un incendio" (En Portada, RTVE), Wikipedia 2025, foto CC de Commons, y el caso de éxito de China (red satelital FY tras Daxing'anling 1987) con su matiz científico — arista `matiza` "la paradoja de la supresión" (Human Ecology, Springer).
- **Ventana `soluciones` (nueva, migración 0018)**: la tecnología de tarjetas de soluciones de la plataforma embebida en los grafos; 5 soluciones REALES creadas y vinculadas al reto Incendios (R017): prevención de combustible, mosaico ganadero, detección temprana con IA, persecución del incendiario, planificación del paisaje.
- **Mapa de superficie quemada** (`/incendios-espana-mapa`, embebido en el grafo): 8 grandes incendios 2022-2025 como polígonos clicables sobre las CCAA (react-simple-maps + GeoJSON propio), ficha con año/hectáreas/causa/fuente y aviso de perímetro aproximado (IA). Faltaba `prop-types` (peer de react-simple-maps) — instalado.
- **Producción**: import de vite convertido a dinámico solo-dev (el bundle producción fallaba con MODULE_NOT_FOUND), base de datos restaurada en el contenedor del Hetzner con todos los datos.

### 2026-08-05 — Fase 15: nodo central jerárquico, zoom por rama, retos→grafos, portadas y Mapbox en producción
- **Mapbox en producción (bug: el mapa no cargaba)**: `VITE_MAPBOX_TOKEN` es variable de BUILD de Vite y el Dockerfile nunca la recibía. Ahora es build-arg (Dockerfile + docker-compose) leída de `.env.production` (token real añadido al servidor). `.env.production.example` estaba ignorado por `.env*` — excepción añadida y versionado. PR #11. Verificado: el bundle de producción contiene el token.
- **Permisos del repo del servidor**: el deploy por Actions falló («insufficient permission... .git/objects») — objetos de git creados por root; `chown -R deploy:deploy /opt/humanity-wiki` y re-run en verde.
- **Nodo central jerárquico (petición, con captura de «Incendios» cortado)**: nuevo formato `center.category` (círculo grande, texto en mayúsculas, color de acento con halo) + `center.variable` (píldora subordinada con MapPin, p. ej. Territorio·España). La fusión izquierda/derecha se conserva para grafos tipo Ceuta. Seed y BD local actualizados al nuevo formato.
- **Clic en el reto → su grafo (petición)**: `CHALLENGE_GRAPH_SLUG` + `challengeLinkTo()`/`challengeGraphTo()` en entityLinks.ts; aplicado en Challenges, TerritoryProfile, Objectives, ObjectiveDetail, SolutionProfile, resolveEntityLink y en la esfera de reto del panel explorador del mapa (ahora es un Link directo al grafo si el reto tiene grafo; si no, sigue abriendo la rueda de causas).
- **Canvas: círculos protagonistas rediseñados (petición)**: fondo slate-900 con borde y halo del color de la relación (como el centro), hover que expande (scale-110) con microtexto «explorar rama», ventanas más grandes (w-64→w-80) y anillo más amplio.
- **Zoom por rama (petición)**: clic en un círculo → fitView animado a esa rama (círculo + ventanas conectadas, BFS 2 saltos), el resto se atenúa a 25%, y una píldora superior con el color/nombre de la rama mantiene el hilo — con botón para ver los atributos de la conexión y X para volver a la vista completa. Segundo clic en el círculo activo abre sus atributos.
- **BUG CRÍTICO RESUELTO — d3 duplicado**: instalar react-simple-maps (d3-zoom@2/d3-transition@2) dedupeó `d3-transition@2` DENTRO de @xyflow/system (que usa d3-zoom@3/d3-selection@3) y rompió TODO el zoom programático de React Flow (fitView/zoomIn/setViewport no-op silencioso; la rueda sí funcionaba). Diagnóstico: `npm ls d3-zoom d3-selection d3-transition`. Arreglo: `overrides` en package.json fijando d3-transition@^3.0.1 y d3-selection@^3.0.0 para el subárbol @xyflow/system + limpiar `node_modules/.vite`. Lección: al añadir librerías d3-*, comprobar dedupe cruzado.
- **StrictMode retirado** (main.tsx): su doble montaje dev-only confundía el diagnóstico del canvas; en producción nunca aplicó.
- **fitView explícito** (GrafoCanvas): con nodos que llegan async, la prop fitView no siempre encuadra — instancia capturada en `onInit` + efecto didFit al montar los nodos.
- **Página Grafos (petición)**: botón grande «Crear grafo» (CreateGraphModal; abierta a nivel 1 — verificado que nunca hubo gate de nivel 2 en backend) y tarjetas con PORTADA: primera imagen del grafo o miniatura del primer vídeo (cover_image/cover_video_id en GET /api/graphs), con degradado+Network de respaldo.

### 2026-08-06 — Fase 16: barra mínima, páginas-grafo, identidad de RETO y el chat como creador real de grafos
- **Barra superior mínima (petición)**: fuera el menú hamburguesa y el buscador global; marca «Humanity Wiki» (dos mayúsculas), botones Mapa y Grafos con estado activo, y el chat de IA de abajo como única puerta al resto.
- **La página de Grafos ES un grafo (petición)**: `MetaGraphCanvas` (nuevo, reutilizable) — nodo central «RETOS DE ESPAÑA» (rojo si todos los grafos son retos), cada grafo como tarjeta conectada con portada/chip/stats, nodo «+» punteado y botón flotante «Crear grafo». Clic en tarjeta → el grafo.
- **Página /mapas como grafo de mapas (petición)**: centro «MAPAS de la Humanidad» (azul), nodo destacado del Mapa de Indicadores de la Humanidad (de Eugenio) → /mapa, los user_maps conectados → /mapas/:slug, nodo «Crear tu mapa» que PRE-RELLENA el chat («Crea un mapa de …», evento window `ai:prefill`). Píldora en /mapa: «Todos los mapas» → /mapas.
- **Identidad de RETO (petición)**: R021 «Presión sobre la frontera sur» creado y anclado al grafo de Ceuta (local+producción); `is_reto` en GET /api/graphs; chip rojo «Reto» + borde rojo en tarjetas; chip «RETO» con llama y acento rojo en el CENTRO de cada grafo de reto (ambas formas: categoría y fusión). R021 → grafo en CHALLENGE_GRAPH_SLUG.
- **Chat = creador real de grafos (bug del usuario, con captura)**: «Crea un grafo del Reto de la Vivienda en España» abría el grafo de Incendios — el fast-path de resolve secuestraba la intención. CADENA DE ARREGLOS: (1) intención de crear detectada → salta el fast-path; (2) max_tokens 2048→8192 (el bloque de acciones llegaba truncado sin cerrar ```); (3) parseModelBlock tolera bloque sin cierre y nunca enseña JSON crudo; (4) modo AUTÓNOMO por defecto y el cliente EJECUTA solo las acciones autoApply (antes quedaban en botones) navegando al grafo/mapa creado; (5) executeAction sanea kinds e relations contra los CHECK (un kind inventado tumbaba todo), salta ventanas defectuosas y desduplica el slug (UNIQUE incluye archivados); (6) prompt del sistema con el contrato completo de windows (kinds/config/relation/relation_label) y mandato de investigar antes con datos reales. VERIFICADO E2E: el grafo «El Reto de la Vivienda en España» nació en borrador con 12 ventanas reales (Plan Estatal 2026-2030, BCE, Wikipedia, precios, desahucios, soluciones) y círculos-pregunta.
- **Chat, además**: internet SIEMPRE activo (sin toggle), botón «+» para adjuntar, indicador «Trabajando en ello — investigando y creando…» con pulso mientras trabaja. Pendiente (próxima fase): preguntas al usuario con opciones 1/2/Otro estilo Claude Code.

### 2026-08-06 — Fase 16b: el chat pregunta con opciones (estilo Claude Code)
- El modelo puede incluir en su bloque `redhumana` una `question` {text, options[≤4]} cuando necesita una decisión del usuario (enfoque, territorio, alcance…); el prompt le pide no abusar: si puede decidir con criterio, decide y actúa.
- La interfaz pinta la pregunta como botones numerados 1/2/… más un «Otro — escríbelo abajo» (que libera el cuadro de texto), como en Claude Code. Elegir una opción la envía como mensaje y desactiva los botones.
- `send()` acepta ahora texto directo (`send(opcion)`), lo que también deja listo el envío programático desde otras superficies.

### 2026-08-06 — Fase 16c: anti-solape «imán», tarjetas visuales protagonistas y paleta semántica
- **Las ventanas se repelen (petición)**: relajación iterativa de rectángulos en el cliente — ningún par de tarjetas puede compartir espacio (padding 28px) y ninguna puede invadir la zona del anillo de círculos (empuje radial). Solo presentación; las posiciones guardadas no cambian. Los ángulos de los círculos se calculan sobre las posiciones ya resueltas.
- **Lo visual manda (petición)**: las ventanas de imagen/vídeo/mapa/gráfica son más anchas (420px) y su medio crece (imagen h-64, vídeo h-56, mapa h-64, gráficas h-52, miniatura Wikipedia h-40) — tarjetas que llaman la atención frente al texto.
- **Paleta semántica fija (petición)**: fuera el fondo negro de los círculos — cada concepto tiene SIEMPRE su color: contexto/historia azul, dato azul claro, fuente azul oscuro, causa AMARILLO, apoya/solución VERDE, contradice/reto ROJO, matiza naranja. Círculo = color de fondo + anillo blanco + halo; el trazo de las flechas usa el mismo color.

### 2026-08-06 — Fase 17: «UNIVERSO» — la tercera visualización de la wiki de la humanidad
- **Concepto (encargo creativo del usuario)**: una página inmersiva que une grafos, mapas, indicadores y publicaciones en un COSMOS navegable con ZOOM SEMÁNTICO. De lejos, la constelación: el núcleo — dos anillos entrelazados, ámbar (inteligencia natural) y esmeralda (artificial), «para la prosperidad de la humanidad» — rodeado de seis esferas de dominio con la paleta semántica: Retos (rojo), Soluciones (verde), Grafos (violeta), Mapas (celeste), Indicadores (azul), Voces (ámbar). Al sumergirse con la rueda (umbral zoom 0.42), el contenido REAL emerge del vacío en órbita exterior: grafos con portada, mapas, retos, soluciones, indicadores y publicaciones (con distintivo IA). Clic en una esfera = viaje animado a su órbita con píldora de contexto; clic en el núcleo o la X = volver al todo.
- **Implementación**: `Universo.tsx` sobre React Flow (sin dependencias nuevas) — nodos custom (núcleo con halo respirando, esferas 3D por gradiente radial con flotación escalonada, tarjetas orbitales que aparecen/desaparecen por zoom vía `useStore(transform[2])`), cielo estrellado y nebulosas en CSS puro, anillos orbitales decorativos. Datos 100% vivos: /api/graphs, /api/maps, /api/feed y helpers (retos, soluciones, indicadores); contador humanas/IA real en el núcleo.
- **Integración**: ruta `/universo`, botón «Universo» con degradado en el menú junto a Mapa y Grafos, lienzo a sangre con la barra de IA abajo.
- **Bugs cazados**: bucle infinito por depender del objeto `helpers` (identidad nueva en cada render) — se depende de los arrays concretos; y el encuadre inicial en frío se reintenta hasta que `fitView` confirma aplicación.
- **Ideas alternativas anotadas para el futuro**: (A) «Pizarra infinita» — lienzo tipo mural donde cada tema es una región y el zoom infinito baja de civilización→tema→grafo→ventana→dato; (B) «Flujo del día» — portada editorial minimalista que mezcla el mejor contenido del día (grafo destacado + mapa vivo + 3 métricas + 3 voces) curada por la IA. El Universo puede absorberlas como modos de vista.

### 2026-08-06 — Fase 17b: Universo II «El Pulso» y Universo III «La Esfera»
- **Encargo**: más versiones del Universo, nuevos conceptos, mejor look&feel, más minimalista. Conmutador I·II·III flotante en las tres versiones (`UniversoSwitcher`); el botón Universo del menú cubre las tres rutas.
- **Universo II — «El Pulso» (/universo-2)**: la lectura EDITORIAL — fondo blanco, tipografía gigante («El conocimiento de la humanidad, vivo.»), color solo semántico. Contadores que laten al cargar (ease-out cúbico con rAF), secciones que emergen al hacer scroll (IntersectionObserver + transiciones de 700ms), el grafo del momento a sangre con su portada y hover cinematográfico, retos como filas numeradas que se deslizan en rojo, soluciones en tarjetas verdes, indicadores con barras que se dibujan, y el cierre «Dos inteligencias, una conversación»: una voz humana (tarjeta clara, ámbar) frente a una de IA (tarjeta negra, esmeralda). Lujo = espacio en blanco.
- **Universo III — «La Esfera» (/universo-3)**: el conocimiento GIRA a tu alrededor — anillo tridimensional en CSS puro (perspective 1500px + preserve-3d + rotateY animado 80s, backface oculto), 14 tarjetas de cristal (blur + borde del color semántico) intercalando grafos con portada, retos, soluciones, mapas, indicadores y voces reales. Hover = el mundo se detiene; clic = entras. Núcleo humano×IA con resplandor respirando y línea de datos vivos abajo.
- Ambas con datos 100% reales y cero dependencias nuevas.

### 2026-08-06 — Fase 18: teoría de juegos del Estrecho + vistas múltiples por reto (del PDF del usuario)
- **Grafo «Teoría de juegos del Estrecho de Gibraltar»** (`/grafos/teoria-juegos-gibraltar`, seed idempotente): el conflicto de Ceuta como ÁRBOL — por encima del suelo las 6 RAMAS (hechos observables citables: incidentes diplomáticos 2021/caso Ghali, presión migratoria, régimen Schengen/aduana, reclamaciones de soberanía y delimitación marítima 2020, arquitectura militar Rota/African Lion/ambigüedad art. 5, control de rutas ~10% del comercio mundial/Tanger Med/COSCO); por debajo las 6 RAÍCES (fichas de actor: España, Marruecos, Reino Unido, EEUU, UE y China con objetivos/recursos/líneas rojas/aliados/dependencias y su matriz estrategia→respuestas→resultado, marcadas «HIPÓTESIS ESTRATÉGICA»). 7 conexiones raíz→rama CRUZAN el suelo con descripción editorial (la palanca migratoria, el espejo de Gibraltar, la doble alianza…). Hechos y hipótesis separados como pedía la propuesta.
- **Línea del SUELO en el lienzo**: nuevo nodo `suelo` en GrafoCanvas cuando el grafo declara `center.ground {above, below}` — línea discontinua terrosa en y=0 con etiquetas («ACONTECIMIENTOS — lo que se ve» / «INTERESES ESTRATÉGICOS — las raíces»). Reutilizable por cualquier grafo-árbol futuro.
- **Un reto, varias vistas**: `GET /api/graphs?challenge=R021` (filtro por anclaje) + `center` en el listado; el grafo de Ceuta queda etiquetado `vista: Cadena causal` y el nuevo `vista: Teoría de juegos`. Nueva página `/retos-vistas/:id` (RetoVistas, sobre MetaGraphCanvas): el reto en rojo al centro y cada vista como tarjeta-preview numerada; nodo «Crear otra vista» que pre-rellena el chat. El clic en el reto R021 (en toda la app) lleva ahora a sus vistas; R017 sigue yendo directo a su único grafo (CHALLENGE_GRAPH_ROUTE).

### 2026-08-06 — Universo: se elimina II y III
- Decisión del usuario: queda UNA sola versión del Universo (el cosmos con zoom semántico). Se borran `Universo2.tsx` (El Pulso), `Universo3.tsx` (La Esfera), el `UniversoSwitcher` y sus rutas `/universo-2` y `/universo-3`. Los conceptos quedan documentados en la entrada de la Fase 17b por si se recuperan.

### 2026-08-06 — Fase 19: la ESFERA DE CONOCIMIENTO (pizarra infinita) y renombrado del menú
- **Renombrado (petición)**: en el menú superior, «Grafos» pasa a llamarse **«Esfera de Conocimiento»** con icono de globo (Globe2), acorde al nuevo concepto.
- **La página deja de ser un tablero de tarjetas y pasa a ser una PIZARRA INFINITA (petición)**: cada grafo es una ESFERA con su portada recortada en círculo (previsualización) y su chip Reto/Grafo; el título y las estadísticas viven FUERA de la esfera con escala compensada por zoom (como los topónimos de un mapa: legibles de lejos y de cerca).
- **Zoom semántico sin cambiar de página**: al acercarse con la rueda —o al hacer clic en una esfera, que hace un fitView animado a su clúster— las publicaciones de ese grafo EMERGEN a su alrededor en el mismo lienzo; al alejarse (o clic en la esfera activa / en el núcleo / en la X) se COLAPSAN de vuelta dentro de la esfera con una transición de escala. El grafo enfocado se mantiene desplegado aunque el encuadre baje del umbral (`forceOpen`), porque una constelación abierta ocupa mucho.
- **Anti-solape por clúster**: las publicaciones de cada esfera se repelen entre sí y no pueden taparle la cara a su esfera (relajación iterativa, mismo «imán» que el lienzo del grafo). Conservan la disposición original del grafo, encogida ×0.3.
- **Backend**: `GET /api/graphs?with_windows=1` devuelve las ventanas de todos los grafos en una sola consulta, para poder desplegarlas sin navegar.
- Clic en una publicación abre un pop-up sobre la misma pizarra (contenido completo + acceso al grafo entero); solo se cambia de página al abrir el grafo para editarlo.

### 2026-08-06 — Esfera de Conocimiento: círculos de categoría recuperados + membrana envolvente
- **Círculos de relación recuperados (aviso del usuario)**: al pasar a la pizarra se habían perdido los círculos que indican la CATEGORÍA de conocimiento entre el grafo y cada publicación. Ahora la cadena vuelve a ser `esfera → círculo de categoría → publicación`, con la paleta semántica de siempre (contexto/dato/fuente en azules, causa amarillo, apoya verde, contradice rojo, matiza naranja) y su etiqueta. `GET /api/graphs?with_windows=1` devuelve también las aristas de cada grafo para poder pintarlas.
- **Paleta compartida**: `RELATION_STYLE` sale de GrafoCanvas a `src/utils/relationStyle.ts` (con `relStyle()`), y la usan tanto el lienzo del grafo como la Esfera — un solo lenguaje visual, una sola fuente de verdad.
- **Membrana envolvente (petición)**: todos los grafos viven ahora DENTRO de una esfera —una elipse de cristal con brillo, sin peso visual— cuyo centro se llama **«Retos de España»** (el nombre se elige por mayoría: si la mayoría de los grafos son retos, la esfera es de retos).
- **Vista general limpia**: nueva arista `fade` que se desvanece con las publicaciones colapsadas; al alejarse solo quedan la membrana, el núcleo y las esferas.

### 2026-08-06 — Esfera de Conocimiento: satélites, hover-preview y electricidad por relevancia
- **Semi-despliegue al alejar (petición)**: las publicaciones colapsadas ya no desaparecen — se convierten en SATÉLITES en miniatura que orbitan pegados a su esfera (con escala compensada por zoom y esquivando el arco del título), señal visible de que ahí hay información agregada.
- **Hover que invita (petición)**: pasar el ratón por una esfera abre sus satélites en pequeño (bloom a un anillo mayor y ×2 de tamaño) — la previsualización incita al clic. El clic sigue haciendo el zoom automático animado a ese reto (fitView a su clúster).
- **Electricidad por relevancia (petición)**: nueva arista `flujo` del núcleo «Retos de España» a cada reto — su GROSOR (2-9px), la velocidad (2.6s→0.6s), la densidad de partículas y el halo dependen de la relevancia actual del reto (visitas + volumen de conocimiento, normalizado). De un vistazo se ve qué reto late más (hoy: Incendios).
- **Conexiones vivas**: las aristas internas (esfera→categoría→publicación) llevan flujo animado de partículas cuando están desplegadas (keyframes `esferaFlujo` en CSS puro).

### 2026-08-06 — SEGURIDAD: se cierra la escritura anónima en /api/data/:entity
- **El agujero**: `POST /api/data/:entity`, `PUT /api/data/:entity/:id`, `DELETE .../:id` y `.../restore` no comprobaban sesión NI rol. Cualquiera podía crear, modificar o archivar territorios, indicadores, retos, soluciones… (14 tablas del núcleo) sin cuenta. Llevaba vivo en producción.
- **Hallado por Javier** (PR #23, auditoría documental) y **verificado en local** con un POST anónimo que devolvía 200 y creaba la fila; el DELETE anónimo la archivaba.
- **El arreglo**: `requireAdmin()` en los cuatro endpoints — 401 sin sesión, 403 sin nivel ADMIN. No quita capacidades a nadie: la edición desde la interfaz ya era exclusiva de administradores (AdminMenu), esto solo cierra la puerta de atrás.
- **Verificado tras el arreglo**: anónimo → 401 en los tres verbos, nada creado, T003 intacto; administrador con sesión → 200, sigue pudiendo editar. Filas de prueba eliminadas.
- **Pendiente de la auditoría de Javier** (anotado, no urgente): 242 territorios sin geometría con PostGIS instalado y sin usar; 17.421 observaciones fabricadas sin marcar como generadas por IA (confirmado: 20.557 totales − 3.136 marcadas); 127 botones crudos sin primitiva de UI; `src/index.css` de una sola línea.

### 2026-08-06 — FIX: el clic en una esfera no hacía zoom al reto
Tres causas encadenadas, las tres reales (el clic NUNCA funcionó de verdad: las pruebas anteriores usaban `dispatchEvent`, que se salta `pointer-events` y daba un falso positivo).
1. **React Flow apagaba el ratón sobre los nodos.** Con `draggable:false` + `selectable:false` y sin manejadores a nivel de lienzo, React Flow pone `pointer-events:none` en el nodo — el `onClick` del div interior jamás se disparaba. Arreglado moviendo clic y hover a `onNodeClick` / `onNodeMouseEnter` / `onNodeMouseLeave` del `<ReactFlow>` (que es además lo que activa el ratón sobre los nodos).
2. **Las aristas se comían el clic.** React Flow da a cada arista un trazo invisible ancho para poder clicarla; al converger muchas en cada esfera, la tapaban. En esta página no se clica ninguna línea → `pointer-events:none` en todas las aristas (CSS) + `interactionWidth={0}` + los trazos animados de flujo marcados como decorativos.
3. **El vuelo se cancelaba a sí mismo.** El efecto que hacía `fitView` dependía de `nodes`; como enfocar reconstruye los nodos, la limpieza del efecto abortaba la animación antes de empezar. Ahora depende SOLO del foco, con 80 ms de respiro para que React Flow haya aplicado las posiciones.
- Verificado con clics reales (no simulados): clic en una esfera → vuelo animado + despliegue de sus publicaciones; X o núcleo → vuelta a la vista general.

### 2026-08-06 — Fase 20: tres puertas al conocimiento (Red / Geolocalización / Base de Datos)
- **Renombrado del menú (petición)**: «Esfera de Conocimiento» → **«Red de Datos»** (`/red`, la ruta `/grafos` se mantiene como alias) y «Mapa» → **«Geolocalización de Datos»**. La cabecera de la propia página también dice ya «Red de Datos».
- **Nueva página «Base de Datos»** (`/base-de-datos`): el inventario honesto de la plataforma — las **92 tablas reales** (~21.900 filas) agrupadas por familia con color (Conocimiento violeta, Territorio celeste, Medición azul, Retos y soluciones rojo, Comunidad ámbar, Mercado verde, Sistema gris). Clic en una tabla → **pop-up central** con sus primeras 50 filas (columnas y tipos); clic FUERA del pop-up o `Esc` lo cierra.
- **Backend `GET /api/db/tables` y `GET /api/db/tables/:name`** (en `server.ts`): solo ADMIN (`requireAdmin`), el nombre de tabla se valida contra el catálogo `pg_class` (no hay SQL construido con texto del usuario), las columnas sensibles (`password_hash`, `session_token`, `token`, `secret`, `stripe_secret_key`, `api_key`…) **nunca salen del servidor** y se avisa en el pop-up de cuántas se han ocultado. `LIMIT` máximo 200.
- **Nueva página de INICIO** (`/`): la portada deja de ser la lista de grafos y pasa a ser la puerta de entrada — tres ventanas, una por forma de mirar el mismo conocimiento, cada una con su miniatura dibujada y sus **cifras reales** (grafos y publicaciones, territorios e indicadores, tablas). Clic en una ventana → esa página.
- **Los nodos de reto dicen su nombre (petición)**: dentro de cada esfera ya no pone «RETO» sino **«Incendios»**, **«Frontera Ceuta»**, **«Estrecho Gibraltar»**, «Vivienda» (`center.short` en la base de datos, aplicado en local y en producción).
- **Nodos ANEXOS (petición)**: «Teoría de juegos del Estrecho de Gibraltar» deja de ser un reto de España aparte — se llama **«Estrecho Gibraltar»** y cuelga de **«Frontera Ceuta»** (`center.annex_of`), con su propia línea de energía padre→anexo. Un anexo es otra lectura del mismo reto, no un reto nuevo.
- **La membrana se ajusta a lo que hay**: la esfera envolvente ya no tiene tamaño fijo, se calcula a partir de las esferas reales — así ningún grafo, tampoco un anexo colgado por fuera del anillo, queda fuera de la esfera común.

### 2026-08-06 — Portada: tres VENTANAS VIVAS + barra de IA bajo ellas
- **Se van el título y el subtítulo (petición)**: la portada entra directa a las tres formas de mirar. Sin manifiesto: la propia página es el argumento.
- **Ventanas vivas, no ilustraciones (petición)**: dentro de cada tarjeta se carga **la página de verdad** en un `<iframe>` con `?embed=1` (el modo sin barra superior ni asistente que ya existía), dibujada a 1440 px de ancho lógico y encogida con `transform: scale()` para caber exacta. Un `ResizeObserver` mide el hueco, así encaja con cualquier pantalla. Se ve la base de datos real, el grafo real y el mapa real — no una idea de ellos.
- **Hover que invita (petición)**: al pasar el ratón, la tarjeta se levanta, crece un 4,5 % con un halo de su color y **la ventana se amplía** (zoom del ×1,16 sobre el contenido, recortado por el marco). Se ve más de lo que hay dentro justo antes de entrar.
- **Tarjetas más grandes y sin descripción (petición)**: la ventana ocupa `clamp(230px, 40vh, 460px)`; debajo solo quedan el rótulo, el nombre y **los datos** (92 tablas / 4 grafos · 47 publicaciones / 242 territorios · 98 indicadores).
- **Orden (petición)**: **Base de Datos** a la izquierda del todo, luego Red de Datos y Geolocalización de Datos — del dato en crudo al dato conectado y al dato situado.
- **La barra de IA, justo debajo de las tres ventanas (petición)**: nuevo modo `inline` del asistente. Para no perder la conversación al cambiar de página, el asistente se sigue montando en el `Layout` y se **pinta dentro de la portada con un portal de React** (`ANCLA_IA_EN_LINEA`); el buscador rápido de grafos funciona igual que en la barra inferior.
- **Coste consciente**: son tres instancias de la aplicación en la misma pantalla. Se arrancan **escalonadas** (0 / 0,7 / 1,4 s) para que no compitan por la red, el `<iframe>` no captura el ratón (el clic es de la tarjeta entera) y queda fuera del árbol de accesibilidad. A cambio, la portada carga el bundle tres veces desde la caché del navegador.
- **Pendiente de decisión**: `/api/db/tables` es solo de administrador, así que un visitante sin sesión ve el aviso «solo administradores» en la ventana de Base de Datos en vez del inventario. Abrir el inventario (nombres y recuentos, NO el contenido de las filas) es un cambio de una línea; el esquema ya es público en el repositorio.

### 2026-08-06 — El explorador del mapa deja de ser texto y pasa a ser un GRAFO
- **La ficha central se convierte en un lienzo (petición)**: la entidad que miras ya no es una columna de tarjetas apiladas, es un NODO. Le baja una conexión desde su **objetivo** (así sabes que estás dentro de Ecosistemas), y de ella cuelgan hacia abajo sus **retos en rojo** y, de cada reto, **sus soluciones en verde**. Nuevo `src/components/explorer/ExplorerGraphCanvas.tsx` (React Flow); `EntityExplorerPanel` queda como el que trae los datos y monta el lienzo.
- **El dato vive dentro del nodo**: lo que era la tarjeta «Datos en España» (barra + 78% + fuente) está ahora en el propio nodo central; la metodología y las unidades son una ficha lateral unida por una línea de puntos; los indicadores/marcadores/métricas hijos son una columna a la derecha por la que se sigue bajando de nivel. En el nivel de métrica, las **estaciones de medición** ocupan esa columna con su nivel de riesgo.
- **Previsualización del grafo de conocimiento (petición)**: el reto que tiene grafo —hoy Incendios— lleva **dentro del nodo la ventana viva de ese grafo** (`/grafos/<slug>?embed=1` encogido con `ResizeObserver`), con «11 publicaciones · clic para abrir el grafo». Un segundo clic abre el grafo entero.
- **Ventanas dinámicas (petición)**: el lienzo contiene más de lo que se ve y el encuadre viaja al trozo que toca. Por defecto encuadra la **espina** (objetivo → entidad → retos); al hacer clic en un reto vuela a **ese reto y sus soluciones**; al cambiar de nivel en el menú de la izquierda se reconstruye y se reencuadra; y si arrastras el borde del panel, se reencuadra también (`ResizeObserver`). Botón «Ver todo» para soltar el foco.
- **Backend, dos datos que faltaban**: `getSolutionsForChallenges` (server.ts) devuelve ahora `challenge_ids` por solución —sin eso no se sabe de qué reto cuelga cada una— y `GET /api/graphs` (knowledge.ts) devuelve `challenge_ids` por grafo, para emparejar reto↔grafo en una sola consulta en vez de una por reto.
- **Se conserva lo que ya había**: el rastro de migas, el gráfico de causas del reto (ahora en un panel sobre el lienzo), los botones de administrador para crear reto/solución y el menú de editar dentro de cada nodo.
- **Verificado en el navegador con clics reales**: en `indicador/Bosques` sale Ecosistemas arriba, Bosques 78% al centro, Contaminación aire con 3 soluciones e Incendios con 8 y su grafo dentro; el clic en Incendios enfoca su rama; el clic en Ecosistemas sube a `nivel=objetivo` y el lienzo se rehace con los 8 indicadores y los 4 retos del objetivo.

### 2026-08-06 — Rehecho: el explorador del mapa ES la Red de Datos
Aviso del usuario: la primera versión (tarjetas rectangulares con el grafo metido en un `<iframe>`) no mantenía «las funcionalidades y la estética que ya hemos desarrollado en la página de Red de Datos». Rehecho de raíz, y esta vez compartiendo el código en vez de imitarlo.

- **Nuevo `src/components/knowledge/esferaKit.tsx`**: el lenguaje visual de la Red de Datos sale de `Grafos.tsx` y pasa a ser un módulo — esferas con portada recortada, satélites semi-desplegados, círculos de categoría de conocimiento, membrana envolvente, arista `flujo` (electricidad por relevancia), arista `fade`, el imán anti-solape (`constelacion`) y el pop-up de publicación. **`Grafos.tsx` lo importa igual que el mapa**: si mañana cambia una esfera, cambia en los dos sitios. La Red de Datos quedó verificada intacta tras el cambio.
- **El explorador del mapa, reescrito sobre el kit** (decisiones del usuario, las cuatro recomendadas):
  - **Órbita, no árbol**: la entidad que miras (Bosques) es el NÚCLEO dentro de la membrana, con su dato del territorio dentro; sus **retos orbitan en rojo**, los **hijos de la jerarquía en un anillo interior azul** con su puntuación, y el **objetivo del que vienes** se posa como esfera sobre la membrana, arriba, con la electricidad bajando hacia el núcleo.
  - **Despliegue real, sin iframe**: al acercarte o hacer clic en un reto, las **publicaciones reales de su grafo** emergen a su alrededor con sus **círculos de categoría** (contexto, causa, dato, fuente…). Fuera el `<iframe>`: más rápido, navegable y con la misma estética. `GET /api/graphs?with_windows=1` trae las ventanas y aristas de todos los grafos de una vez.
  - **Soluciones orbitando su reto**, en verde, en un anillo que crece con cuántas hay para que no se monten; sus nombres aparecen al acercarte (de lejos son puntos verdes, no una maraña de texto).
  - **Pantalla completa**: botón que expande el explorador a todo el ancho ocultando el mapa, y otro para volver.
- **La órbita se adapta al hueco**: el lienzo vive en una columna que puede ser estrecha y alta (junto al mapa) o ancha y baja (a pantalla completa). Una elipse fija se salía en un caso y desperdiciaba sitio en el otro, así que el anillo toma la forma del contenedor (`ResizeObserver`) y el grafo se reencuadra.
- **Ventanas dinámicas**: por defecto se encuadra el corazón (objetivo, núcleo, retos e hijos); al hacer clic en un reto se vuela a ese reto con sus soluciones y sus publicaciones; el botón «Ver todo» suelta el foco; y cada clic en el menú de la izquierda reconstruye y reencuadra.
- **Verificado con clics reales**: en Bosques, el núcleo con su 78% y los dos retos con sus soluciones; el clic en Incendios despliega sus 11 publicaciones reales (gráficas, mapas, vídeos, fichas) con sus círculos de categoría; en Ecosistemas, los 8 indicadores en el anillo interior con sus puntuaciones y los 4 retos alrededor; la pantalla completa oculta el mapa y devuelve el sitio.

### 2026-08-07 — Fase 21: MI CONOCIMIENTO — el lienzo infinito personal
La otra mitad de la plataforma (petición del usuario): el común agrega el conocimiento de todos; **Mi Conocimiento** es el espacio propio de cada persona — un lienzo infinito estilo Miro/Notion donde TODO lo que creas cuelga de tu nombre y se guarda en la base de datos GENERAL, no en un silo.

- **El usuario es la raíz**: `/mi-conocimiento` asegura un grafo personal por usuario (`POST /api/knowledge/personal`, `center.personal='1'`, status borrador) cuyo centro es «Conocimiento de <nombre>». Cada cosa creada se conecta a él con un círculo de categoría — la rama «creado por Eugenio García-Calderón Huerta» que pedía la visión. Los lienzos personales quedan EXCLUIDOS del común (listado y buscador).
- **El mismo motor, no otro**: `GrafoCanvas` se hace reutilizable (`GrafoLienzo({slug, toolbar})`) — Mi Conocimiento monta el lienzo real de los grafos (arrastrar con persistencia, pop-ups, valoraciones, comentarios, conexiones semánticas) y le superpone su barra. `/grafos/:slug` intacto (verificado: 21 nodos en Incendios).
- **Barra de herramientas estilo Miro** (14 herramientas, vertical, con tooltips): nuevo grafo (real + tarjeta-portal), nuevo mapa (`user_maps` + ventana), nuevo producto (fila real en `products` + ventana), proyecto, tarea, tabla, texto, publicación, imagen, vídeo, enlace/documento, Wikipedia, modo conectar y el recomendador.
- **Tres tipos de ventana nuevos** (migración 0019, aplicada en local y producción): `tarea` (checkbox que se marca desde el pop-up y guarda al instante — verificado hasta la fila en la BD), `tabla` (rejilla editable tipo Notion: columnas renombrables, añadir/borrar filas y columnas, celdas que guardan al escribir) y `proyecto` (estado idea/en marcha/terminado + pasos con checklist). `WindowContent` ahora acepta `onConfigChange` para ventanas editables por su dueño.
- **El RECOMENDADOR — todos los «Notion» conectados**: panel «El común ya sabe…» con búsqueda; enseña el calibre («Sobre incendios hay ya 1 grafo, 4 publicaciones, 1 reto y 2 soluciones de 2 autores») y sugerencias concretas (`GET /api/knowledge/related`). «Conectar» una publicación REUTILIZA la ventana original (`window_id`): la misma pieza vive en dos lienzos sin duplicarse — verificado: `KW_INC_CAUSAS` en 2 lienzos, una sola fila. Grafos → tarjeta-portal; retos/soluciones → enlace.
- **Verificado e2e con clics reales**: crear tarea desde la barra → cuelga del usuario vía círculo CONTEXTO → marcarla «Hecha» en el pop-up → `config.done=true` en la BD → tachada en el lienzo; recomendador con «incendios» → Conectado ✓ → la ventana aparece con círculo DATO; el común sigue con sus 4 grafos, sin el personal.
- **Pendiente consciente**: subir imagen como ARCHIVO (hoy por URL — no hay almacenamiento de ficheros en el servidor); «nuevo mapa» crea el mapa real pero su ventana muestra el mapa general (no hay editor de mapas propios todavía); las tablas no se editan aún en la miniatura del lienzo, solo en el pop-up.

### 2026-08-07 — humanity.wiki PUBLICADA en su dominio real
- El usuario completó el traslado del dominio a Cloudflare (nameservers activos, proxy naranja). El certificado Let's Encrypt del apex se emitió vía HTTP-01 a través del proxy tras reiniciar Caddy (llevaba días en pausa de reintentos porque el dominio no resolvía).
- **https://humanity.wiki responde 200** con la web y la API completas. `www.humanity.wiki` redirige al apex; su certificado quedó en reintento automático (la validación secundaria de Let's Encrypt recibía 404 de algunos centros de Cloudflare aún propagando el subdominio) — Caddy lo reintenta solo con backoff.
- Retirado el bloque temporal `167-233-245-191.sslip.io` del `deploy/Caddyfile` (era el plan desde que se creó). Los enlaces antiguos a esa URL dejan de funcionar; el dominio real es la única puerta.
- Pendiente del usuario en Cloudflare (no bloquea): revisar que el modo SSL sea «Full (strict)» y, si quiere, activar «Always Use HTTPS». Pendiente nuestro: actualizar el origen autorizado del login de Google cuando se cree la credencial.

### 2026-08-07 — Lienzo: crecer desde un nodo y PEGAR (imágenes, texto, enlaces)
- **Crear conectado desde cualquier nodo (petición)**: al pasar el ratón por una ventana aparece un **«+»** en su esquina; abre «Conectar algo nuevo» con los 11 tipos (publicación, texto, enlace, vídeo, imagen, Wikipedia, otro grafo, producto, tarea, tabla, proyecto) y la arista sale de ESA ventana, no del centro — así el conocimiento crece en cadena, no en estrella. La ventana nueva nace al lado de su origen. El mismo botón está dentro del pop-up de una ventana abierta («Conectar algo nuevo»), que es el otro camino natural.
- **Pegar en el lienzo (petición)**: `Ctrl/Cmd+V` sobre el lienzo crea la ventana que toque — una **imagen** del portapapeles se sube y se convierte en ventana `imagen`; un enlace de **YouTube** en `video`; cualquier otra **URL** en `enlace`; y el **texto suelto** en una nota. Todo queda conectado al centro con su círculo de categoría. Nunca roba el pegado de un campo de texto (el chat, los formularios).
- **Nuevo módulo `src/server/uploads.ts`**: `POST /api/uploads` (solo con sesión) + servido estático de `/uploads`. Los ficheros van a **disco**, no a la base de datos: una captura pegada ronda 1-3 MB y `GET /api/graphs?with_windows=1` trae las ventanas de TODOS los grafos a la vez — en `config` habría hecho esa respuesta de megabytes. El cuerpo viaja como bytes crudos (`application/octet-stream`), lo que evita el +33% de base64 y esquiva el `express.json()` global de 100 kB sin tocar el `server.ts` congelado (solo su línea de registro, que es el acoplamiento permitido).
- **Seguridad de la subida**: solo imágenes de una lista blanca; **la extensión la decide el servidor** a partir del tipo declarado, nunca el nombre del navegador; nombre UUID; tope de 10 MB; y los ficheros se sirven con `nosniff` + CSP restrictiva para que un SVG subido no pueda ejecutar nada en el dominio.
- **Volumen de Docker `uploads`** en `docker-compose.prod.yml`: sin él, cada despliegue borraría las imágenes.
- **Verificado e2e con eventos de pegado reales**: imagen → subida (2.942 bytes), fichero en disco, servida con 200/image-png y ventana creada; texto → nota; URL de Wikipedia → enlace; y el «+» sobre «Imagen pegada» → tarea conectada con categoría `contexto` (comprobado en la base de datos). Subida sin sesión → 401.

### 2026-08-07 — Arrastrar archivos al lienzo (además de pegarlos)
Continuación de «pegar en el lienzo»: ahora también se puede **soltar un archivo arrastrándolo** desde el escritorio, y cae EN EL PUNTO donde lo sueltas (`screenToFlowPosition` de React Flow), no en un sitio aleatorio — la diferencia entre un lienzo y un formulario.

- **Velo de «Suelta aquí»** mientras arrastras sobre el lienzo, con un contador de `dragenter`/`dragleave` para que no parpadee al pasar por encima de los nodos hijos.
- **Cada archivo se convierte en lo que le corresponde**: imagen → ventana `imagen` visible; PDF, CSV, JSON, ZIP, DOCX, XLSX, PPTX → se suben y quedan como `enlace` descargable con su tamaño; `.txt` y `.md` → **no se suben**, se lee su contenido y se convierte en nota (`texto`). Varios archivos a la vez caen en cascada, desplazados 48 px, para no apilarse.
- **Pegar y soltar comparten camino** (`traer()`): un enlace de YouTube es vídeo, cualquier otra URL es enlace, y el texto suelto es nota — igual se pegue o se arrastre.
- **Seguridad del almacén**: `uploads.ts` acepta ahora documentos además de imágenes, pero **solo las imágenes de verdad se sirven en línea**; PDF, SVG, ZIP y compañía salen con `Content-Disposition: attachment`, así nada de lo subido se ejecuta en el dominio. Verificado en local: el PNG sale `image/png` inline y el PDF con `attachment`.
- **Verificado con arrastres reales** (eventos `dragenter`/`dragover`/`drop` con `DataTransfer`): PNG + PDF soltados juntos → dos ventanas en el punto del soltar (380,107 y 428,155), la imagen se ve y el PDF descarga; un `.md` soltado → nota con su contenido en (50,318) y **cero ficheros `.md` en disco**.

### 2026-08-08 — Visión y hoja de ruta, proyectos de cada persona, y el menú de dos puertas
- **Constitución v1.1 (autorizado por Eugenio)**: la regla 6 pasa de «nunca se elimina conocimiento» a «no se elimina por accidente, pero quien lo creó puede pedir su borrado definitivo»: papelera de 15 días y después se elimina de verdad. Actualizados `CLAUDE.md` y `src/server/CLAUDE.md` para que la regla escrita y el código digan lo mismo.
- **Página «Visión y hoja de ruta»** (`/vision`): para qué existe humanity.wiki y el tablero operativo de qué está hecho, qué se está haciendo y qué falta. **112 tarjetas** repartidas en **9 grupos** — el lienzo, los mapas, las bases de datos, la red social, el mercado, diseño y UI, la IA, datos y seguridad, y **gobernanza y veracidad** (grupo que propuse: es el corazón de una wiki que quiere competir con Wikipedia y no estaba en la lista). Hoy: 47 hechas, 3 en curso, 62 por hacer.
- **Ficha de cada funcionalidad**: al pulsar una tarjeta se abre en el centro con su grupo, su estado (cambiable), su prioridad, **su responsable con nombre y correo**, y un detalle al que se le añaden **notas de texto e imágenes** (las imágenes usan el mismo almacén que el lienzo).
- **Proyectos de cada persona** (`/proyectos`, `/proyectos/:slug`): el MISMO tablero, para lo que cada cual quiera organizar. Cada proyecto trae su visión, sus propios grupos con color, y público o privado. El tablero salió a `components/tablero/TableroKanban` y lo comparten la hoja de ruta y los proyectos — un solo sitio que mantener.
- **El menú se reduce a dos puertas** (petición del usuario): **Explorar** (todo lo que ha publicado todo el mundo) y **Mis publicaciones** (lo tuyo). Todo lo demás —Inicio, Geolocalización, Red de Datos, Base de Datos, Universo, Mi Conocimiento, Mis proyectos, Visión y Mercado— pasa a un **desplegable de tres líneas junto al logo**, agrupado en «El común» y «Lo tuyo».
- **Nuevo `GET /api/publicaciones`**: reúne en un solo listado las ventanas de conocimiento de los grafos públicos y las publicaciones del muro, con su autor y dónde viven. Los lienzos personales solo asoman para su dueño. Es lo que alimenta las dos páginas nuevas.
- **Verificado**: 112 tarjetas servidas y agrupadas; la ficha abre con responsable y detalle; Explorar lista 58 publicaciones de 7 autores con buscador y filtros por tipo; «Mis publicaciones» 37; el desplegable muestra las 9 secciones.

### 2026-08-08 — «Todo es una publicación»: mapas incluidos, editable, con carpetas y organización por IA
Continuación del mismo día: un mapa, un lienzo, un proyecto, un documento son todos publicaciones — se editan si eres su autor (o colaborador), se hacen públicas o privadas, y se archivan en una papelera de 15 días. Y ahora se organizan en carpetas personales, arrastrando o pidiéndoselo a la IA.

- **Migración 0023**: `knowledge_windows.publico` (las ventanas antes no podían ser privadas); `deleted_at` en `knowledge_graphs`, `proyectos`, `publications` y `user_maps` (papelera para los cinco tipos, no solo las ventanas); tabla `publicacion_meta` (`tipo`, `entity_id`, `estado` en_desarrollo/terminado, `colaboradores` jsonb) — sigue la forma de `graph_entity_links`, no una tabla nueva por tipo.
- **El Mapa de Indicadores de la Humanidad deja de estar pintado a mano**: era un nodo fijo en `Mapas.tsx` que decía «de Eugenio García-Calderón Huerta» sin existir en ninguna tabla. `seed-mapa-principal.ts` lo convierte en una fila real de `user_maps` (`config.principal = true`), a nombre de `eugenio@lighthumanity.org`, editable como cualquier otra.
- **Tres rutas comunes para los cinco tipos** (`src/server/knowledge.ts`): `PATCH /api/publicaciones/:tipo/:id` (título, contenido, público/privado, en_desarrollo/terminado — el lienzo personal no se puede publicar entero, solo sus piezas), `DELETE .../:tipo/:id` (papelera) y `.../restaurar`. Permisos resueltos en el servidor y viajan en cada tarjeta (`puedo_editar`, `soy_autor`) para que el lápiz, el candado y la papelera nunca dependan de que el frontend adivine.
- **Colaboradores**: `GET`/`PUT /api/publicaciones/:tipo/:id/colaboradores` por correo — un colaborador puede editar el contenido pero no cambiar la visibilidad ni borrar (eso es solo del autor o un administrador).
- **Papelera unificada**: `GET /api/papelera` junta los cinco tipos con `UNION ALL` y el barrido diario (`vaciarPapelera`) suelta primero las claves ajenas de cada tabla (aristas, colocaciones, valoraciones, comentarios, `publicacion_meta`, tarjetas de proyecto) antes de la baja definitiva a los 15 días.
- **Migración 0024 — carpetas personales**: `carpetas` (por usuario) + `carpeta_publicaciones` (`carpeta_id`, `tipo`, `entity_id` — de nuevo una sola tabla para los cinco tipos, con índice único `(user_id, lower(nombre))`). Son carpetas de MARCADORES: cualquier publicación visible, propia o ajena, se guarda en las tuyas sin tocar su autoría.
- **`autoOrganizarCarpetas(db, userId)`**: función exportada de `knowledge.ts` (no un cierre interno, para poder importarla desde `ai/assistant.ts` sin duplicarla) que lee tus publicaciones, le pide a Claude que las agrupe por tema (JSON `{carpetas:[{nombre,indices}]}`), crea las carpetas que falten —por nombre, sin duplicar— y las rellena. La usan tanto el botón «Ordenar con IA» (`POST /api/carpetas/auto-organizar`) como la acción `ORGANIZAR_CARPETAS` del catálogo del asistente, para que pedirlo por chat («ordename las publicaciones por carpetas») funcione igual.
- **Explorar + Mis publicaciones, fusionadas** (`src/pages/Explorar.tsx`): un interruptor grande y centrado arriba —«De la Humanidad» / «Mías»— sustituye la distinción por página; `/explorar` y `/mis-publicaciones` siguen existiendo como atajos que abren la misma página con el interruptor en una posición distinta. Los cuatro tipos que la gente construye (Mapas, Lienzos, Proyectos, Bases de datos) pasan al principio de los filtros.
- **Menú lateral de carpetas** (solo con sesión): crear, arrastrar una tarjeta hasta una carpeta (HTML5 drag & drop, con aro verde al pasar por encima), entrar en una carpeta para ver solo lo que contiene, borrar carpeta (lo de dentro no se borra). Cada tarjeta trae en su menú de tres puntos «Guardar en…» (casillas por carpeta) y «Descargar» (Markdown siempre; CSV si es una tabla; el archivo original si tiene uno subido; JSON siempre) — generado en el cliente con `Blob`+`URL.createObjectURL`, sin endpoint nuevo.
- **`FichaPublicacion.tsx` (nuevo)**: la ventana central al pulsar una tarjeta, con edición de título/contenido, Hacer pública/privada, Marcar terminada, Colaboradores y Eliminar — todo condicionado a `puedo_editar`/`soy_autor`.
- **Fallo reportado y corregido en el mismo día**: al guardar un cambio en la ficha, el título editado no se veía hasta cerrar y reabrir — la vista de lectura leía `pub.titulo` (la prop congelada del momento en que se abrió) en vez del valor recién guardado. Arreglado separando «lo guardado» (`guardado.titulo`/`guardado.texto`/`guardado.config`, que se actualiza tras cada PATCH con éxito) de la prop original; Cancelar también vuelve a lo guardado, no al valor con el que se abrió la ficha, para no deshacer un guardado previo de la misma sesión de edición.
- **Verificado en el navegador con eventos reales** (clics, `DragEvent`+`DataTransfer`, envío de formulario): carpeta «Incendios» creada → arrastrar el Mapa de Indicadores hasta ella → `PUT .../carpetas` confirmado en la BD; entrar en la carpeta → «1 dentro»; menú «Descargar» → `Blob` de 195 bytes `text/markdown` generado; **«Ordenar con IA» con la API real de Claude** → 8 carpetas temáticas creadas (Vivienda 13, Incendios 9 —fusionó con la ya creada, sin duplicar—, Ceuta 8, Geopolítica 3, Conocimiento 4, Mapas 5, Multimedia 5, Datos 4); edición de título con guardado inmediato visible sin reabrir.

### 2026-08-08 — Círculos de relación editables, pegado libre, orden del Kanban
- **Los círculos CONTEXTO/DATO/CAUSA… se pueden arrastrar, redimensionar y bloquear** (petición del usuario: «permíteme modificarlos… como si fuesen un elemento más»). No hizo falta tocar el servidor: la migración 0020 ya había añadido `graph_edges.layout` y `.locked` pensando en esto (Fase 4, hasta hoy sin usar). El círculo lee `layout.pos`/`layout.size` si existen y si no cae en el anillo calculado de siempre; `TiradoresTamano` gana un `keepAspectRatio` para que el redimensionado no lo ovale; un candado propio (no la `BarraElemento` de las ventanas, que no encaja con una conexión) bloquea/desbloquea igual que en las ventanas.
  - Verificado: seleccionar un círculo muestra sus 8 tiradores + 4 puntos de conexión; bloquear hace un `PUT /api/graphs/:id/edges/:id` real (`locked` pasa a `true` en la BD) y le quita al momento la clase `draggable` y los tiradores; escribir `layout.size` directamente y recargar lo renderiza al tamaño pedido sin errores. El arrastre en sí no se pudo ejercitar con eventos sintéticos en este entorno de pruebas (React Flow usa un sistema de arrastre basado en punteros que ignora los `PointerEvent` generados por script, algo ya comprobado igual en una ventana YA confirmada arrastrable en sesiones anteriores — no es un fallo nuevo, es un límite de la herramienta de verificación).
- **Pegar en el lienzo ya no engancha nada al núcleo** (petición del usuario: «esto no me gusta»): `crearVentana` dejó de mandar la arista `contexto` automática que creaba toda pieza pegada o soltada. Y Ctrl/Cmd+V cae **donde está el ratón**, no en un punto fijo: un `onMouseMove` en el lienzo guarda la última posición vista (en un ref, no en estado, para no re-renderizar en cada pixel) y `onPaste` la traduce a coordenadas del lienzo con `screenToFlowPosition`. Arrastrar un archivo ya caía donde se soltaba; ahora los dos caminos —pegar y soltar— se comportan igual: libres, sin conexión.
- **Tablero Kanban: Por hacer a la izquierda, Hecho a la derecha** (antes al revés) — el flujo de lectura natural. Afecta a `/vision` y a los proyectos de cada persona, que comparten `TableroKanban`.
- **Verificado que el tablero de Visión ya es de Eugenio**: `puedeEditar={!!user?.isAdmin}` en el frontend y `ROLE.ADMIN` en `roadmap.ts` — como es el único administrador, el tablero ya sólo lo puede tocar él con sesión iniciada. No hizo falta cambiar nada.

### 2026-08-08 — IA multi-proveedor (Gemini + Nano Banana), textos editables de Visión, sistema de puntos
- **Tarjetas de la hoja de ruta editables desde el propio Kanban**: `FichaFuncionalidad` (`TableroKanban.tsx`) gana un menú de tres puntos con «Editar título y resumen» — título y resumen se vuelven `<input>`/`<textarea>` in situ, con Guardar/Cancelar; usa el `PUT /api/roadmap/:id` que ya existía, no hizo falta tocar el backend.
- **Capa de proveedor extendida a Google Gemini** (`src/server/ai/provider.ts`): `GeminiProvider implements AIProvider` habla por REST con `generativelanguage.googleapis.com/v1beta`; `providerOfModel(model)` enruta por el prefijo `gemini-`. El resto del sistema sigue sin conocer el SDK concreto, tal y como pide `docs/`. Catálogo `AI_MODELS` ampliado con `gemini-flash-latest` y `gemini-pro-latest` — alias «-latest» y no una versión fechada, porque Google bloquea los IDs con fecha para claves nuevas ("no longer available to new users"); comprobado en vivo contra `GET /v1beta/models` con la clave real.
- **Nano Banana (`gemini-2.5-flash-image`) elegible en el selector de modelos del chat**, con `image: true` en su entrada del catálogo para que el frontend le muestre «por imagen» en vez de un precio por millón de tokens que no le corresponde. `generarImagenNanoBanana(prompt)` es una función aparte de `AIProvider.complete()` (que es texto→texto) porque pide `generationConfig.responseModalities:['IMAGE']` — no encajaba en la interfaz sin forzarla. `POST /api/ai/chat` detecta el modelo elegido antes de tocar el proveedor de texto, genera la imagen, la guarda con `guardarArchivo` (mismo almacén que una imagen pegada a mano) y la devuelve como `imageUrl`; `AIAssistant.tsx` la pinta con un `<img>` dentro de la burbuja de respuesta. Coste no facturado todavía (`ai_usage_charges` con todos los campos de coste a 0, tipo `'imagen'`) — hueco conocido, no un error.
- **Textos de Visión editables por el administrador**: tabla `page_texts` (`pagina`, `clave`, `valor` — migración 0025) + `GET/PUT /api/textos/:pagina/:clave` en `roadmap.ts` (el PUT exige `requireAdmin`). `TextoEditable` en `Vision.tsx` muestra un lápiz al pasar el ratón solo para `eugenio@lighthumanity.org`, con textarea y Guardar/Cancelar. Se añadió el párrafo de estrategia pedido («agregar todas las herramientas… una sola base de conocimiento universal») como uno de estos textos, no como copia fija.
- **Sistema de Puntos de Humanity.wiki** (migración 0026): `users.puntos numeric(12,2) DEFAULT 100` — al ser un `ALTER TABLE` con `DEFAULT`, Postgres (PG11+) lo aplica también a las filas ya existentes sin un `UPDATE` aparte («fast default»), así que los 7 usuarios de entonces y cualquiera nuevo arrancan con 100 puntos sin backfill. `movimientos_puntos` es el libro mayor (motivo `regalo_bienvenida`/`compra`/`vista_publicacion`/`gasto_ia`/`ajuste_admin`); `otorgarPuntos()` en `src/server/puntos.ts` es el ÚNICO sitio que toca `users.puntos`, siempre junto con su fila de movimiento. Los puntos llevan decimales: ver una publicación pública ajena abona 0,01 puntos a quien la creó (`POST /api/windows/:id/view`). Compra de 100 puntos por 100€ vía Stripe Checkout embebido (`POST /api/stripe/checkout/puntos`, reutilizando `EmbeddedCheckoutModal`), acreditados solo en el webhook `checkout.session.completed` — nunca al crear la sesión, para no abonar pagos abandonados. Pestaña «Economía» nueva en `/vision` con saldo, botón de compra y movimientos recientes, con sus textos también editables vía `page_texts`.
- **Verificado**: `GET /api/ai/status` devuelve los 7 modelos incluyendo Nano Banana; `POST /api/ai/chat` con `model:"gemini-2.5-flash-image"` genera un PNG real servido en `/uploads/...` (200 OK); en el navegador, elegir Nano Banana en el panel de ajustes del chat cambia el placeholder a «Describe la imagen que quieres generar…» y el resultado aparece inline en la conversación. Pendiente: migrar 0025/0026 a producción y añadir `GEMINI_API_KEY` al `.env.production`.

### 2026-08-08 — Carpeta que no se pierde, lienzo personal publicable, cuadro de gasto, Explorar compacto
- **La carpeta abierta ya no se pierde al cambiar Humanidad↔Mías** (fallo reportado por el usuario): el interruptor navegaba entre `/explorar` y `/mis-publicaciones`, dos rutas con dos instancias distintas de `Explorar` — el cambio de ruta desmontaba el componente y con él la carpeta activa. Ahora el modo vive en la query string de una sola ruta (`/explorar?mias=1`, `setSearchParams` con `replace`) y `/mis-publicaciones` es solo un `<Navigate>` que redirige ahí; el componente nunca se desmonta. Verificado: abrir «Incendios» (9 dentro) → pulsar Mías → la carpeta sigue abierta con su contenido.
- **El lienzo personal se puede publicar del tirón** (petición del usuario, que se topó con el aviso «Tu lienzo personal no se publica entero»): eliminado el bloqueo del `PATCH /api/publicaciones/lienzo/:id` que devolvía 400 cuando `personal = '1'`. La protección era de una época en que el lienzo personal no tenía control de visibilidad propio; hoy publicar es una decisión explícita del dueño desde su ficha, igual que en cualquier otro lienzo. Verificado: PATCH `publico:true` → 200 y `status = 'publicado'` en la BD.
- **Explorar compacto** (petición del usuario: «que las publicaciones estén mucho más arriba»): el interruptor grande centrado + su subtítulo + la fila de Papelera/contador (tres bloques apilados, ~200px) se funden en UNA fila: interruptor pequeño a la izquierda, chip de la carpeta activa (con su flecha de volver), Papelera y contador a la derecha. El buscador y los 12 tipos pasan de dos filas envueltas a una sola con scroll horizontal en los chips. Misma funcionalidad, la rejilla de tarjetas empieza donde antes estaba el interruptor.
- **Pestaña «Gasto» en Visión** (petición del usuario): cuadro de mando del coste real de la plataforma, junto a Economía. Módulo nuevo `src/server/gasto.ts` (+1 línea de registro en `server.ts`): `GET /api/gasto` con caché en memoria de `GASTO_CACHE_HORAS` horas (6 por defecto) — «tiempo real» sin llamar a las APIs externas en cada visita; un administrador puede forzar con `?refrescar=1`. Tres fuentes: **Hetzner Cloud API** (precio mensual real por servidor; necesita `HETZNER_API_TOKEN`), **API de administración de Anthropic** (facturación oficial del mes; necesita `ANTHROPIC_ADMIN_KEY`, distinta de la clave del chat) y el **libro interno `ai_usage_charges`** (cada llamada real a la IA con su coste estimado — siempre disponible; Gemini se estima siempre así porque Google no da API sencilla de gasto). La pestaña muestra el total del mes, tarjeta por proveedor con desglose y un historial mensual con barras; los conectores sin clave aparecen como «sin conectar» con el aviso de qué falta (solo visible para el administrador). Verificado con datos reales: 0,42 € de Anthropic este mes desde el libro interno.
- **Visión: un solo bloque de texto editable** (petición del usuario, tras editar él mismo los textos en vivo y quedar tres bloques con solo «.»): la página deja los cuatro `TextoEditable` de párrafos en uno (`parrafo_1`, que admite varios párrafos con líneas en blanco); las filas `parrafo_2/3/estrategia` se borraron de `page_texts` local. El texto vigente de `parrafo_1` es el que escribió Eugenio, no el por defecto del código.
- **Producción**: migraciones 0025 y 0026 aplicadas (8 usuarios con 100,00 puntos y su justificante), `GEMINI_API_KEY` añadida a `.env.production`, PR #46 fusionado y desplegado. Verificado en humanity.wiki: los 7 modelos (Nano Banana incluido) en `/api/ai/status`, `/api/gasto` respondiendo con datos del libro interno.

### 2026-08-08 — Página de administración de usuarios + restablecer contraseña
- **`/admin/usuarios`** (petición del usuario): solo administradores. Lista todos los usuarios con su rol (desplegable que usa el `PUT /api/admin/users/:id/role` que ya existía — un admin no puede bajarse a sí mismo), su saldo de puntos, un campo «±puntos» que llama al nuevo `POST /api/admin/users/:id/puntos` (motivo `ajuste_admin`, pasa por `otorgarPuntos` como todo lo demás) y un botón «Contraseña» que genera un enlace de restablecimiento con el nuevo `POST /api/admin/users/:id/reset-link` (24 h de caducidad) y lo copia al portapapeles — se entrega a mano porque sigue sin haber proveedor de correo. Acceso: icono de personas junto a la etiqueta de rol en la cabecera, visible solo para admins.
- **`/restablecer` por fin existe**: `Login.tsx` enlazaba a esa ruta desde el flujo «he olvidado mi contraseña» pero la página nunca se creó — el enlace daba 404. Ahora es un formulario mínimo (token de la URL + contraseña nueva dos veces) contra el `POST /api/auth/password/reset` que ya existía.
- `GET /api/admin/users` ahora devuelve también `puntos`.
- **Verificado de extremo a extremo con un usuario de prueba desechable** (creado por registro real y archivado al acabar): +5,5 puntos → saldo 105,50 en la BD; enlace generado → `POST password/reset` con su token → login con la contraseña nueva 200, con la vieja 401.
- Nota del mismo día: eugenio@lighthumanity.org **ya era administrador** en producción (la petición «que tenga la misma categoría que administracion@lighthumanity.org» no requirió cambios: esa segunda cuenta no existe en la base de datos). Con el visto bueno del usuario, eugeniogarcia30@gmail.com (su cuenta de Google) pasó también a nivel 4 en producción.

### 2026-08-08 — Documentos estilo Notion, Fase 1: el chat escribe documentos en directo
- **Modelo de datos**: un documento es una ventana `kind='pagina'` (migración 0027 amplía el CHECK de kinds) cuyo contenido vive en `config.bloques`. Al ser una ventana hereda gratis visibilidad, colaboradores, carpetas y papelera. El parser markdown↔bloques (`src/utils/bloques.ts`) lo comparten cliente y servidor a propósito: lo que se ve generándose y lo que queda guardado no pueden divergir. Tipos de bloque: párrafo, títulos 1-3, lista, numerada, casilla, cita, separador, código, imagen y tabla.
- **Generación en directo**: `POST /api/ai/documento` (módulo nuevo `src/server/documentos.ts`, +1 línea en server.ts) responde por SSE — `inicio` con el id de la ventana recién creada (privada, del que la pide), `delta` por cada trozo según Claude lo escribe (`completarClaudeStream` en provider.ts, solo Claude: Gemini no lo necesita todavía), y `fin` cuando el SERVIDOR ya guardó bloques+título — si el navegador se cierra a mitad, el documento queda guardado igual. Si la petición viene del chat, los últimos 10 mensajes de la conversación acompañan al encargo («dámelo en forma de documento» necesita saber qué es «lo»). El primer H1 pasa a ser el título de la ventana y se retira de los bloques para no duplicarse.
- **Página `/documentos/:id`** (`Documento.tsx`): lectura para cualquiera con acceso (negritas, cursivas, enlaces, código, tablas renderizadas de verdad), edición para el autor/admin al estilo **Typora**: solo el bloque ACTIVO enseña el markdown en crudo; el resto se ve formateado y un clic lo activa. «+» al pasar el ratón por cada bloque con el menú de los 12 tipos (y eliminar); Enter crea el siguiente bloque (las listas heredan su tipo; Enter en un ítem vacío lo convierte en párrafo, como Notion); Backspace en vacío borra; autoguardado con 1,2 s de calma vía el `PUT /api/windows/:id` que ya existía; título editable; interruptor Pública/Privada; descarga a Markdown. Los textos vivos van en refs, no en estado — re-renderizar un contentEditable por tecla rompería el cursor.
- **El chat detecta la intención** (AIAssistant): «hazme un informe…», «redacta un acta…», «dámelo en forma de documento» → navega a `/documentos/nuevo?prompt=…&conv=…` sin gastar una llamada de chat; «¿qué es un documento?» NO dispara. Funciona también en el panel acoplado.
- **`GET /api/windows/:id`** nuevo (una ventana suelta con permisos resueltos) y **arreglo de fondo en `/api/publicaciones`**: el `JOIN graph_windows` exigía que toda ventana estuviera colocada en un lienzo — pasa a `LEFT JOIN`, porque los documentos nacen sueltos. Explorar: los kinds `pagina` entran en el filtro «Documentos», su tarjeta enseña las primeras líneas y el clic abre `/documentos/:id`.
- **Verificado de extremo a extremo con la API real**: informe sobre incendios 2025 generado en streaming visible (títulos, negritas y una tabla apareciendo en directo), guardado como `KWMSKG9OVGZZ` privado, reabierto con formato correcto (15 negritas, 1 tabla, 0 asteriscos literales), edición Typora activada por clic con autoguardado confirmado en la BD, y presente en Mis publicaciones.
- Pendiente (Fase 2, apalabrado con el usuario): insertar mapas/grafos/publicaciones como bloques embebidos, portada e icono, reordenar arrastrando, IA dentro del documento, y exportar a PDF, Word y PNG (Markdown ya está).

### 2026-08-08 — Documentos, Fase 2: embeds, portada, arrastre, IA interna y exportaciones
- **Bloque `publicacion`**: desde el «+» → Publicación se abre un buscador (la misma `/api/publicaciones`) y la elegida queda embebida. Una VENTANA enseña su contenido real con `WindowContent` (el mismo renderer de toda la app, cargado en vivo con el `GET /api/windows/:id` de la Fase 1); un lienzo/mapa/proyecto se enseña como tarjeta con su título y autor que navega a su página. El bloque guarda lo mínimo para pintarse (`pubTipo`, `entityId`, `pubTitulo`, `pubUrl`…) capturado al insertar.
- **Portada e icono estilo Notion**: `config.portada` (imagen subida por `/api/uploads`) y `config.icono` (emoji de una paleta de 16, cambiable pulsándolo). Botones discretos «Añadir icono / Añadir portada» solo en edición.
- **Reordenar arrastrando**: tirador ⋮⋮ junto al «+» de cada bloque (drag & drop HTML5, como las carpetas de Explorar); el bloque en vuelo se atenúa y el destino enseña una guía. Verificado con `DragEvent`+`DataTransfer` reales y el orden nuevo confirmado en la BD.
- **IA dentro del documento** (`POST /api/ai/documento-bloque`, solo autor/admin): «Mejorar este texto con IA» en el menú de cada bloque de texto (reescribe el bloque con el documento entero como contexto; velo de «reescribiendo…» encima) y «Continuar con IA» al pie (añade 1-3 secciones nuevas coherentes — en la prueba real pasó de 36 a 54 bloques). Ambas pasan por `provider.complete` y se apuntan en `ai_usage_charges` (kind `documento`).
- **Exportar**: menú de descarga con 4 formatos — Markdown (cliente, de F1), **Word** (`GET /api/documentos/:id/docx`, paquete `docx`: títulos, listas numeradas de verdad, tablas, imágenes locales, hipervínculos), **PDF** (`GET /api/documentos/:id/pdf`, `pdfkit`: fuentes Helvetica, tablas con reglas, imágenes) y **PNG** (html2canvas con `import()` dinámico — solo lo descarga quien exporta). El marcado inline pasa por `tokenizarInline` (nuevo en `bloques.ts`) para convertirse en negritas/cursivas reales, no asteriscos. Verificado: docx empieza por `PK` (11 KB), pdf por `%PDF-` (6,5 KB), chunk de html2canvas cargado bajo demanda sin errores.
- **Fallo encontrado y corregido — cierre obsoleto en el autoguardado**: el temporizador de 1,2 s capturaba el estado de ANTES del cambio, así que el icono no se guardaba nunca, el título perdía su última letra y un bloque recién insertado podía no guardarse hasta el siguiente cambio. Ahora `guardarAhora` lee SIEMPRE de refs (`bloquesRef`, `metaRef`) que un efecto mantiene al día. Los textos ya iban por refs desde F1 — por eso la F1 pasó su verificación: solo se probó teclear en bloques existentes.
- Dependencias nuevas: `docx`, `pdfkit` (servidor; el bundle usa `--packages=external`, así que resuelven desde node_modules en la imagen), `html2canvas` (cliente, troceado aparte por Vite).

### 2026-08-08 — Gasto de servidores sin API: importe fijo configurable
- El usuario preguntó qué API de Hetzner faltaba en la pestaña Gasto y apuntó bien: para un servidor fijo no hace falta ninguna. `gastoHetzner()` acepta ahora `SERVIDOR_COSTE_EUR_MES` como vía sin token: si está configurada, la sección Servidores sale en `ok` con ese importe, etiquetado «importe fijo configurado a mano». `HETZNER_API_TOKEN` queda como mejora opcional (precios en vivo, se actualiza solo si el servidor cambia).
- La máquina identificada por sus specs vía SSH (8 vCPU, 16 GB, 320 GB, nbg1): se estimó CX42 a 16,90 €/mes, pero **el usuario corrigió con la consola de Hetzner en la mano: es un CPX42 (AMD) a 69,49 €/mes** — buena lección sobre estimar precios desde specs en vez de mirar la factura. `SERVIDOR_COSTE_EUR_MES=69.49` en los dos `.env` y etiqueta CPX42.

### 2026-08-08 — Creador de publicaciones en Explorar + consumo real del servidor
- **Botón «Crear» en Explorar** (petición del usuario): primero en la barra compacta, abre `CreadorPublicacion.tsx` — un cuadro con los cinco tipos de primera clase (Documento, Lienzo, Mapa, Proyecto, Al muro) y dos caminos que reutilizan las tuberías existentes:
  - **«Pídeselo a la IA»** (documento/lienzo/mapa): documentos van al streaming de `/documentos/nuevo`; lienzos y mapas se piden a `/api/ai/chat` en modo autónomo y se acepta su acción (`/api/ai/actions/:id/decide`) — la misma pauta del panel del asistente — navegando al resultado. Verificado con la API real: «La sequía en la cuenca del Segura» generó un grafo completo (~12 ventanas conectadas por causas/datos/soluciones) y abrió su canvas.
  - **«O créalo tú desde cero»**: título → el POST de siempre de cada tipo (`/api/graphs`, `/api/maps`, `/api/proyectos`, `/api/publications`) y un `POST /api/documentos` nuevo para el documento en blanco (nace privado con un párrafo vacío). Verificado: documento creado y abierto editable.
- **Consumo real del servidor preparado** (petición del usuario: «quiero que dé el consumo de 7,69 €»): `gastoHetzner()` con token calcula ahora también `consumo_mes_eur` — horas encendido este mes × precio/hora con el mensual como techo, la misma cuenta del «Usage» de la consola de Hetzner — y la pestaña Gasto lo enseña como dato protagonista con el precio mensual de referencia; «Este mes» suma el consumo real cuando existe. **Pendiente de que el usuario cree el HETZNER_API_TOKEN** (solo lectura) en su consola: sin él, sigue el importe fijo.

### 2026-08-08 — Editor de documentos: selección múltiple y comportamiento Notion de verdad
- **Selección múltiple** (petición del usuario: «seleccionar varios bloques y eliminarlos de golpe»): Ctrl/Cmd+clic marca bloques sueltos, Shift+clic marca el tramo desde el último marcado (funciona sobre CUALQUIER tipo de bloque — el `onClickCapture` del envoltorio corta la navegación de los embeds). Anillo esmeralda en lo marcado y barra flotante inferior «N bloques · Eliminar»; Supr/Backspace borra la selección y Esc la deshace. Pista discreta al pie del editor.
- **Y el pulido pendiente del editor** («mejora además el editor, lo que tienes pendiente»):
  - **Enter parte el texto por el cursor** (antes siempre creaba un bloque vacío): lo de después baja al bloque nuevo con el cursor a su inicio. `posicionCaret` nuevo en el efecto de foco para colocar el cursor en un punto exacto.
  - **Backspace al principio de un bloque fusiona con el anterior**, dejando el cursor en la juntura — antes solo borraba bloques vacíos.
  - **Atajos markdown al teclear**: `# `, `## `, `### `, `- `, `1. `, `> `, `[] ` y ``` ` `` convierten el bloque al vuelo (solo desde párrafo), quitando el prefijo.
  - **Pegar varias líneas crea varios bloques** pasando por `markdownABloques` — pegar una lista pega una lista de verdad; sobre un bloque vacío lo sustituyen, con texto van detrás.
  - **PDF: tablas con formato y salto de página** (el pendiente declarado en la Fase 2): el marcado inline de cada celda se respeta (negritas/cursivas/código vía `tokenizarInline`, tramo a tramo con `continued`) y una tabla larga salta de página fila a fila repitiendo la cabecera.
- Verificado en navegador con eventos reales: 2 bloques marcados y eliminados de golpe (BD 54→52), «## » convirtió un párrafo en Título 2, Enter en el carácter 9 partió el bloque con el cursor al inicio del nuevo, Backspace fusionó de vuelta con el cursor en la juntura (offset 9), un pegado de 4 líneas markdown creó 4 bloques (lista incluida), y el PDF con el renderer nuevo sigue firmando `%PDF-`.

### 2026-08-08 — Editor de imágenes + presentaciones con frames horizontales
- **Editor de imágenes** (`EditorImagen.tsx`, sin dependencias — un canvas con pila de deshacer): recortar arrastrando, rotar 90°, voltear H/V, deslizadores de luz/contraste/color, 6 presets (B/N, Sepia, Cálida, Fría, Dramática…), texto encima con tamaño/color, pincel a mano alzada, y Guardar sube el PNG a `/api/uploads`. Tres entradas: el creador de publicaciones (tipo **Imagen**: subes una foto → editor → queda como publicación suelta vía el nuevo `POST /api/ventanas`), el botón «Editar imagen» al pasar el ratón por cualquier bloque imagen de un documento, y (dentro) el flujo de portada.
- **Presentaciones estilo PowerPoint pero con FRAMES HORIZONTALES** (rediseñado en caliente por el usuario: «sobre un lienzo con frames horizontales que serán las diapositivas»): kind `presentacion` (migración 0028, aplicada en local y producción) con `config.diapositivas` — elementos (texto/imagen/forma) posicionados en un lienzo lógico de 960×540. La página `/presentaciones/:id` enseña TODOS los frames en fila (scroll horizontal, como Figma): se edita en el sitio — arrastrar, redimensionar por la esquina, doble clic para el texto, barra con Texto/Imagen/Rectángulo/Círculo + negrita/alineación/tamaño/color, duplicar y borrar frames, frame activo con aro esmeralda. **Modo Presentar** a pantalla completa (flechas/espacio/Esc) y **exportar .pptx de verdad** con pptxgenjs (import() solo al exportar): cada frame, una página.
- **IA**: `POST /api/ai/presentacion` — la IA redacta título + 5-9 diapositivas con puntos (JSON estricto) y se convierten en elementos colocados; en el creador, el tipo Presentación tiene su «Pídeselo a la IA». `POST /api/presentaciones` crea una en blanco con portada.
- Explorar: filtro «Presentaciones», la tarjeta enseña la miniatura del primer frame + recuento, y el clic abre el editor. `WindowContent` gana el caso `presentacion`.
- **Fallo encontrado y corregido en la verificación**: el editor de imágenes vive dentro del modal del creador, cuyo fondo se cierra al hacer clic fuera — cualquier clic dentro del editor burbujeaba hasta ese fondo y lo cerraba todo sin guardar. `stopPropagation` en la raíz del editor.
- Verificado con la API real: presentación de 9 frames generada por IA («Los retos del agua en España») y abierta en el lienzo de frames; arrastre de un elemento persistido en la BD (80,190 → movido → devuelto); doble clic editó el subtítulo y quedó guardado; Presentar navegó 1→2 con flechas y salió con Esc; chunk de pptxgenjs cargado bajo demanda sin errores de consola; imagen de prueba subida → preset Dramática → guardada como publicación con su `image_url`.

### 2026-08-08 — Administración: borrar (archivar) y restaurar usuarios
- Petición del usuario: «permíteme como ADMIN borrar usuarios». Siguiendo la regla 6 de la Constitución, «borrar» = archivar: `POST /api/admin/users/:id/archivar` pone `archived_at`, revoca todas sus sesiones al momento y el login/Google/attachUser ya lo rechazan (todos filtran `archived_at IS NULL` desde siempre). Nada de lo publicado se destruye. `POST /api/admin/users/:id/restaurar` lo deshace. Un admin no puede borrarse a sí mismo.
- En `/admin/usuarios`: papelera roja por fila (con confirmación que explica exactamente qué pasa) y botón «Restaurar» en las filas archivadas, que ya salían atenuadas con su etiqueta.

### 2026-08-10 — El botón de borrar «no funcionaba» + alta directa de usuarios + acceso a registrarse más visible
- **Diagnóstico del botón de borrar** (petición del usuario: «el botón de borrar usuarios registrados no funciona»): el backend estaba bien (`POST /api/admin/users/:id/archivar` respondía correctamente), pero `borrar()` dependía de `window.confirm()` — y Chrome puede silenciar por completo los diálogos nativos con su casilla «Evitar que este sitio cree más cuadros de diálogo», dejando el clic sin ningún efecto visible y sin ningún error que lo delate. Sustituido por un modal propio en React (`confirmando` + `ejecutarBorrado`), que no depende de una API del navegador que el propio navegador puede desactivar. De paso, los cinco handlers de la página (`cambiarRol`, `darPuntos`, `borrar`, `restaurar`, `generarEnlace`) que hacían `fetch` sin `try/catch` ahora atrapan cualquier fallo de red y lo muestran con `avisar()` — antes fallaban en silencio absoluto.
- **Alta de usuarios desde el panel de admin** (petición del usuario: «tampoco me deja registrar usuarios nuevos desde esa página siendo ADMIN»): no existía ningún camino para esto. `POST /api/admin/users` (nivel 4, `src/server/auth.ts`) da de alta la cuenta con una contraseña aleatoria que nunca se transmite en claro — en su lugar genera de una vez el mismo enlace de restablecimiento de 24h que ya usa el botón «Contraseña» del resto de la tabla — y **no** abre sesión en el navegador del admin (a diferencia de `/api/auth/register`, que si se reutilizara tal cual habría colado al admin como el usuario recién creado). Formulario «Nuevo usuario» en `AdminUsuarios.tsx`: email, nombre opcional, rol; el enlace se copia solo al portapapeles al crear.
- **Acceso a «Crear una cuenta» más visible desde `/login`** (petición del usuario): ya existía el cambio a modo registro, pero enterrado como un botón gris más entre otros dos iguales. Ahora, en modo login, es una caja destacada («¿Todavía no tienes cuenta? → Crear una cuenta») separada de «He olvidado mi contraseña», que queda como enlace secundario pequeño.
- **Aviso de proceso**: `npm run dev` (`tsx server.ts`, sin `--watch`) no reinicia el proceso Express al tocar archivos del backend — el HMR de Vite recarga la página en el navegador pero la ruta nueva seguía sin existir hasta reiniciar el servidor a mano. Detectado porque `POST /api/admin/users` devolvía 404 pese a estar bien registrada; confirmado y corregido reiniciando el proceso.
- Verificado en navegador con clics reales (no eventos inyectados): modal de borrado con Cancelar (no borra) y con Borrar (archiva de verdad, aviso y fila atenuada con «Restaurar»); usuario de prueba creado por el formulario de admin y visible en la lista al instante.

### 2026-08-18 — Juego Vital, Fase 1 «Pasear tu vida»: tu vida real como mundo 3D
- **Diseño completo acordado con el usuario** y registrado en `memory/10_JUEGO_VITAL.md`: el juego es la TERCERA vista sobre las entidades reales (tras lienzo y explorador) — cada edificio/objeto/personaje ES una entidad de la BD, nada existe solo en el juego. Decisiones cerradas: estilo **estilizado HD low-poly** (referencia Wind Waker/Animal Crossing; el fotorrealismo tipo COD Mobile queda descartado explícitamente como inalcanzable), empezar por «Pasear tu vida», híbrido biblioteca+generación para foto→3D, y **móvil + ordenador desde el día 1** (elección del usuario sobre mi recomendación de escritorio-primero). En móvil se juega EN HORIZONTAL (petición: «como en COD Mobile»): aviso de girar el móvil en vertical + botón de pantalla completa que en Android bloquea la orientación (iOS no lo permite jamás — el aviso es el único camino).
- **Página `/juego`** (menú «Lo tuyo» → Juego Vital, a sangre completa, asistente en modo barra): la aldea semilla del usuario — 14 casas alrededor de una plaza con fuente, río serpenteante con puente de madera, 4 naves, 2 lagos y ~1.100 árboles instanciados sobre 118 ha (1090×1090 m, 1 unidad = 1 m) — todo procedural low-poly con semilla determinista (mismo mundo en cada visita, sin tablas nuevas todavía; la persistencia llega con el Builder de F2).
- **Personaje en 3ª persona** (WASD/flechas + joystick táctil virtual), cámara de seguimiento suave, sombras que viajan con el jugador (la cámara de sombras es pequeña para que sean nítidas). **El robot compañero** flota y te sigue; al acercarte e interactuar, habla con bocadillo y **enfoca la barra del asistente IA real** (evento `humanity:asistente-focus` — el robot ES el asistente de siempre, con su búsqueda en internet y multimodal). **Tus proyectos reales** (`GET /api/proyectos`, los tuyos) se levantan como edificios en el Distrito de Proyectos: el edificio CRECE con el progreso real del kanban, el cartel lleva el título real y una barra de progreso; al acercarte, panel con descripción, tareas hechas y «Abrir el proyecto».
- **Motor**: three.js + React Three Fiber + drei (nuevas dependencias; npm subió React de 19.0.1 a 19.2.8 de paso). Todo el motor vive en un chunk aparte cargado en diferido (`Escena-*.js`, 1,03 MB / 290 KB gzip): el bundle principal no engordó nada. `frustumCulled = false` en los instanciados (su caja envolvente ignora las posiciones de las instancias: bosques enteros desaparecían según el ángulo), `dpr` limitado a 1,75 para móvil.
- **Dos bugs encontrados y arreglados en la verificación**: (1) «Invalid hook call» al montar la escena — caché de optimización de Vite (`node_modules/.vite`) mezclando el React antiguo con el nuevo tras instalar el motor; se limpia la caché y desaparece. (2) **Lienzo en blanco con 0 draw calls** pese a escena y cámara correctas: el `Coordinador` usaba `useFrame(cb, 1)` — en React Three Fiber CUALQUIER prioridad > 0 significa «yo renderizo por mi cuenta» y desactiva el render automático en silencio. Quitar la prioridad lo arregló (135 draw calls, ~150.000 triángulos). Queda avisado en un comentario en el código.
- **Limitación del entorno de verificación, no del juego**: el panel de navegador de la sesión limita `requestAnimationFrame` a ~1 fps (pestaña sin foco), así que el movimiento se probó con teletransporte + fotogramas sueltos; interacciones, paneles, foco del asistente y render verificados de verdad. El joystick táctil no es ejercitable aquí (el emulador no expone `pointer: coarse`); su detección cubre `pointer: coarse` + `ontouchstart` + `maxTouchPoints` para los móviles reales.
- Dos proyectos reales creados en la BD local durante la prueba («Camión camperizado», «Aldea Regenerativa») — son de verdad del usuario y se quedan.

### 2026-08-18 — Juego Vital: builder tipo Los Sims, agentes con memoria y chat por interlocutor
- **El fallo que lo motivó todo** (reportado por el usuario con la conversación delante): al pedirle al robot «hazme la entrevista fundacional», respondía como el asistente genérico de la plataforma — una entrevista sobre territorios y retos. Causa: `/juego` no mandaba NADA en el `context` del asistente, así que el modelo no sabía que estaba dentro de un juego. Arreglado con un bloque de sistema propio (`ctx.juego` en `buildSystemPrompt`): dentro del juego el modelo ya no es «el asistente de Humanity.wiki», es el robot del jugador o el agente con el que habla, con guion de entrevista fundacional (áreas de vida → objetivos/proyectos/principios → inventario vital → personas clave), tono de personaje (2-5 frases, una pregunta al final) y prohibición explícita de inventar la vida del jugador. Verificado con la API real: la misma frase que fallaba ahora abre la entrevista por las áreas de vida y reconoce lo que ya hay en el mapa.
- **Builder tipo Los Sims** (petición: «que yo pueda crear personas y proyectos como en los SIMS»): barra de construcción permanente a la izquierda del mundo. Te plantas donde quieras y creas ahí una **persona** (alguien real de tu vida) o un **proyecto** — se planta a tus pies, con nombre flotando. Formulario con nombre, rol, descripción y **foto opcional** (reutiliza `/api/uploads`). Crear un proyecto crea además el **proyecto real** en la plataforma con su kanban (pilar «todo es real»).
- **Cada cosa creada es un AGENTE con memoria propia** (migración 0029 `game_agents`; `src/server/juego.ts` con comprobación de rol y de propiedad en todas las escrituras, archivado en vez de borrado): ficha con «Lo que sabe», campo para **meterle info** que se acumula (`POST /api/juego/agentes/:id/memoria`), y su **propia conversación** (`conversation_id`). Al hablar con él, su memoria viaja en el contexto: responde como él y solo con lo que le has contado. Las personas llevan siempre la etiqueta «Representación creada por ti. No es la persona real ni habla por ella» (salvaguardas de `memory/10_JUEGO_VITAL.md`).
- **La IA construye el mundo**: nuevo bloque `acciones_juego` en la respuesta del modelo (`{tipo, nombre, rol, descripcion}`, máx. 4). La página las crea llamando al backend —que valida rol y propiedad—, nunca el modelo directamente. Verificado: «mis áreas son Salud, Hogar y familia, Emprendimiento» devolvió las cuatro creaciones correctas.
- **Chat rehecho** (peticiones del usuario): **minimizar** a una pastilla que dice con quién hablabas y cuántos mensajes lleváis, y **listado lateral de conversaciones agrupado en Compañero / Personas / Proyectos** — al elegir a alguien se cambia de interlocutor y se carga SU hilo (`GET /api/ai/conversations/:id/messages`), sin tener que caminar hasta él. La cabecera dice siempre con quién hablas.
- **Fallo encontrado en la verificación**: el Enter en el campo «cuéntale algo» se escapaba de la ficha y la página acababa navegando fuera; corregido con `preventDefault` + `stopPropagation`.
- Verificado en navegador con clics reales: persona «Javier · asesor técnico» plantada en el mundo (aparece en 3D con su nombre y en la lista «Tu mundo»), memoria guardada y devuelta por la API, rutas nuevas protegidas (401 sin sesión), y las dos conversaciones de IA de arriba con la API real.
- **Las migraciones dejan de aplicarse a mano** (elección del usuario entre las tres opciones que le planteé): `deploy/migrate.sh` corre dentro del despliegue, antes de reconstruir la app. Registro propio en `schema_migrations`, solo lo pendiente, en orden, cada fichero en su transacción; si falla, el job aborta y el código nuevo no arranca. La primera ejecución marca como aplicadas las migraciones hasta `0028_presentaciones.sql` (estado real de producción según este mismo changelog) y en una base vacía aplica todo desde `0000`. Probado antes de tocar producción con la misma lógica contra la base local: 29 marcadas, 0029 aplicada, segunda pasada sin cambios. Ver `memory/03_DECISIONS.md`.
- **Arreglada la subida de fotos del builder** (reportado por el usuario al usarlo): la mandaba como `FormData`, pero `/api/uploads` recibe los bytes EN CRUDO con `?type=<mime>` y `Content-Type: application/octet-stream` (como ya hacían `Documento.tsx` y `GrafoCanvas.tsx`). El servidor devolvía 400 «Formato no admitido» y, como el `catch` se lo tragaba, la foto desaparecía sin decir nada. Ahora usa el patrón correcto y **enseña el error si falla**, en vez de fallar en silencio. Comprobado lado a lado en el navegador: la forma antigua → 400; la nueva → 200, imagen guardada, servida como `image/png` y visible en la ficha de la persona.

### 2026-08-18 — Juego Vital: archivo por amigo, colisiones, apertura automática y un pueblo con detalle
- **Cada amigo guarda su archivo** (petición: «con cada amigo pueda guardar diversas fotos y documentos»): migración 0030 añade `archivos` jsonb a `game_agents` (mismo patrón que `memoria`, sin tabla nueva). `POST/DELETE /api/juego/agentes/:id/archivos` con comprobación de rol y propiedad, y solo acepta rutas de nuestro propio almacén (`/uploads/…`), nunca enlaces externos. En la ficha: rejilla con miniaturas de las fotos y tarjetas para los documentos, botón «Añadir» y quitar al pasar el ratón. Al quitar uno NO se borra el fichero en disco: puede estar embebido en otro sitio.
- **Ya no atraviesas a la gente** (petición: «que no los atraviese, sino que se abra el chat»): `Personaje` recibe los obstáculos del mundo y, al tocarlos, te deja justo en el borde en vez de pasar a través. Chocar con alguien **abre su ficha y su chat**, una vez por encontronazo (no cada fotograma). Radios: 1,1 m una persona, 4,6 m un edificio de proyecto. Verificado: teletransportado encima de Javier, el juego me dejó a exactamente 1,10 m y abrió su ficha.
- **Acercarse a un proyecto abre su cuadro solo**, sin pulsar nada (petición explícita); al alejarte se cierra. Verificado delante del distrito: panel abierto sin botón de por medio.
- **El robot ya no te persigue**: vive en la plaza junto a la fuente, como un vecino más. Se gira hacia ti cuando te acercas y mira alrededor cuando estás lejos. Sigue siendo el asistente de IA real.
- **El pueblo tiene vida** (petición: «añade más detalles a todos los objetos»): `Detalles.tsx` — farolas que iluminan, bancos, mercadillo con toldos de colores, pozo con polea, carro de heno, tendederos con ropa, vallas, huertos con surcos, humo saliendo de las chimeneas y un rebaño de ovejas que pasta y se mueve. Todo procedural y con la misma paleta: sin descargas ni dependencias nuevas. Los puestos se recolocaron al noreste tras verlos tapando la salida en la primera prueba.
- **Coste medido**: la escena pasa de 135 a ~400 draw calls (~165.000 triángulos). Bien en ordenador; anotado en deuda técnica para instanciar el mobiliario si el móvil sufre.

### 2026-08-18 — Juego Vital: modelos 3D reales (librería CC0 de Kenney)
- **Decisión de Eugenio** entre tres opciones: librería descargada completa, personas y objetos (sobre mi recomendación de empezar solo por personas). Costes aceptados y avisados: decenas de MB en el repositorio y riesgo de romper la coherencia de estilo al mezclar packs — mitigado usando un solo pack por categoría.
- **Packs descargados y revisados** (509 modelos en total): Mini Characters, City Kit Suburban 2.0, Nature Kit y Furniture Kit. **Todos CC0 (dominio público)**, verificado leyendo el `License.txt` de cada uno. Se copiaron solo los 28 que se usan (**3,8 MB**), con su licencia documentada en `public/juego/modelos/LICENSE.md`.
- **Personas de verdad**: los 10 cuerpos de Kenney vienen **con esqueleto y 32 animaciones** (`idle`, `walk`, `sprint`, `sit`, gestos…). El jugador anda con animación real al moverse y vuelve a reposo al parar; las personas del mundo respiran en reposo y se giran mirando alrededor. Cada agente recibe siempre el mismo cuerpo (hash de su nombre). Los esqueletos se clonan con `SkeletonUtils`: sin eso, todas las personas compartirían huesos y se moverían a la vez.
- **Casas de verdad**: las 14 casas de la aldea son 12 modelos distintos del City Kit, en lugar de la caja con tejado piramidal.
- **Fallo encontrado y corregido**: al principio todo salía **blanco**. Los `.glb` de Kenney NO llevan la textura dentro: apuntan a `Textures/colormap.png` en su misma carpeta, y yo solo había copiado los `.glb`. Además cada pack trae SU colormap, así que compartir carpeta habría mezclado paletas. Solución: un directorio por pack (`personas/`, `pueblo/`) con su textura al lado, y comentado en el código para que no vuelva a pasar.
- **Escala medida, no estimada**: el primer intento dejó personajes de 1,17 m. Midiendo la caja del modelo en el navegador (0,67 unidades) se ajustó la escala a 2,6 → ~1,75 m, estatura real en un mundo donde 1 unidad = 1 metro.
- **El bosque sigue siendo procedural a propósito**: los ~1.100 árboles son una malla instanciada de una sola llamada de dibujo; cambiarlos por 1.100 modelos sueltos hundiría el móvil. Los modelos se usan donde se miran de cerca.
- **Peso**: el paquete del motor bajó de 1.034 KB a 751 KB (216 KB comprimido) y los modelos (3,8 MB) se sirven aparte, se descargan una vez y quedan en la caché del navegador.

### 2026-08-18 — Juego Vital: minimapa estilo GTA con viaje rápido
- **Minimapa arriba a la derecha** (petición de Eugenio), siempre visible y **siguiéndote como en GTA**: enseña 240 m a tu alrededor con la plaza, los caminos, el río, las casas, las naves y los marcadores de tu gente y tus proyectos.
- **Al pulsarlo se despliega el mapa completo en 2D**, y desde ahí **pinchas en cualquier persona o proyecto y viajas hasta él**. Al llegar, si es una persona se abre su ficha y su chat: viajar hasta alguien es ir a hablar con él.
- **La animación del viaje sale gratis y queda bien**: el jugador aparece a 5 m del destino mirándolo, pero la cámara NO salta — sigue interpolando, así que hace un vuelo rasante por encima de la aldea hasta alcanzarte, con un velo oscuro y «Viajando a…» encima. Verificado: de la plaza (0, 17) al Camión camperizado (61, −27), ~64 m, y de vuelta hasta Javier con su ficha abierta.
- **Un solo origen para la distribución** (`mapa.ts`): casas, caminos, plaza, naves, lagos, río y distrito los leen AHORA el mundo 3D y el mapa 2D. Si cada uno tuviera su copia, movería una casa y el mapa seguiría enseñándola donde estaba — un mapa que miente es peor que no tener mapa.
- **Dibujado en SVG, no en el lienzo 3D**: nítido a cualquier tamaño, los marcadores son botones de verdad (pulsables con el dedo, accesibles) y no le cuesta un fotograma al motor. El punto del jugador y el encuadre se actualizan escribiendo atributos a mano en cada fotograma: meterlos en el estado de React sería re-renderizar el mapa 60 veces por segundo para mover un círculo.
- **Dos ajustes tras verlo**: el mapa grande enseñaba las 118 ha enteras y la aldea salía del tamaño de un sello — ahora **encuadra donde está tu vida** y se ajusta solo según crece tu mundo; y los nombres se pisaban cuando dos sitios caían cerca (Javier sobre Anita) — ahora **se apilan con un hilo** hasta su marcador.
- **Fallo mío detectado al verificar en producción, y corregido**: al meter los modelos en `public/juego/modelos/` creé una carpeta `public/juego/` que **choca con la ruta `/juego` de la página**. El servidor de estáticos respondía a `/juego` con un **301 a `/juego/`** (la app cargaba igual, pero con un salto de más y la URL cambiada). Modelos movidos a `public/modelos-juego/`. **Regla que queda apuntada en el código: ninguna carpeta de `public/` puede llamarse como una ruta de la aplicación.**

### 2026-08-18 — Juego Vital: edificios sólidos, avatar mirando bien y zoom de cámara
- **Chocar con el edificio de un proyecto ya abre su ficha** (fallo reportado por Eugenio). Causa: los edificios de la Fase 1 (los que salen de `/api/proyectos`) nunca se añadieron a la lista de obstáculos — solo estaban las personas y los proyectos creados con el builder. Se atravesaban y el choque no existía. Ahora son sólidos (radio 4,6 m) y el choque abre su panel; el prefijo `proy:` en el identificador distingue un edificio de un agente. Verificado: metido a propósito dentro del edificio, el juego me dejó a 4,60 m y abrió «Abrir el proyecto».
- **De paso, la posición de esos edificios estaba copiada en TRES sitios** (mundo 3D, obstáculos y minimapa). Ahora sale de `posicionProyecto()` en `mapa.ts`, como ya pasaba con las casas.
- **El avatar andaba de espaldas** (reportado por Eugenio): le había puesto media vuelta suponiendo que el modelo miraba hacia atrás, y mira hacia adelante. Comprobado en el navegador poniéndolo a rotación 0 y acercando la cámara: se le ve la cara, así que su frente es +Z y el rumbo ya lo orienta bien. Quitada la media vuelta; al aparecer mira al norte, hacia la plaza.
- **Zoom de cámara en tercera persona** (petición de Eugenio: «ver el mapa desde más lejos»): rueda del ratón, pellizco de dos dedos en móvil y botones en pantalla con la distancia en metros. De 9 a 90 m; al alejarte la cámara mira más arriba para que se abra el mundo en vez de quedarte mirándote los pies. La rueda no hace zoom cuando el cursor está sobre un panel o el chat (ahí hace scroll, que es lo que se espera).

### 2026-08-18 — Juego Vital: piel, pelo, ropa y fenotipo de cada persona
- **Editor de aspecto** (petición de Eugenio: «cambiar el color del pelo, piel, ojos y fenotipo de cada personaje»). Se abre desde la paleta de la barra de crear para tu propio avatar, y desde la ficha de cada persona de tu mundo. Fenotipo (10 cuerpos), piel (6 tonos), pelo (8), ropa (8) y pantalón (8). Se guarda en `uiSettings.juegoAspecto` para ti y en `apariencia` del agente para cada persona.
- **Los ojos NO se pueden cambiar, y por eso el control ya no está.** En estos modelos los ojos no tienen color propio en la paleta: van dibujados con el tono de la cara. Dejar el selector habría sido un botón que no hace nada, o peor, que tiñe el pelo.
- **Cómo funciona**: los modelos de Kenney comparten UNA textura (`colormap.png`), una paleta donde cada parte del cuerpo apunta a un cuadradito de color. No hay un material por «pelo» o por «piel». Se leen las coordenadas de textura y la altura de cada vértice, se clasifica qué colores son piel, pelo, ropa, pantalón y zapatos, y se pinta una copia de la paleta cambiando solo esos. Se conserva la **luminosidad** de cada tono, así que el sombreado del modelo sobrevive al cambio de color.
- **Una textura por malla, no una por muñeco.** Los modelos usan LOS MISMOS grises para el pelo (en la cabeza) y para el pantalón (en el cuerpo). Con una sola tabla para todo el personaje ganaba el primero que apareciera y el otro se quedaba sin teñir. Mirando cada malla por separado, el mismo gris puede ser pelo arriba y pantalón abajo.
- **El fallo que costó encontrarlo, y que conviene no repetir: `THREE.Color` trabaja en espacio LINEAL.** `new THREE.Color('#2f4858').getHSL()` devuelve la luz en lineal; al volver a bytes y escribirlos en un lienzo 2D —que es sRGB— aquel azul acababa en (5,10,16), casi negro. Con todos los colores así, el personaje salía a franjas oscuras. La conversión HSL se hace ahora a mano, en sRGB. **Regla: nada de `THREE.Color` para calcular píxeles que van a un `<canvas>`.**
- **Detección de la piel medida, no estimada**: en la paleta real los tonos de piel van de (179,99,67) a (239,186,148) y nunca llegan a 255; los naranjas puros (255,149,47 … 255,208,97) son pelo y ropa. El corte `r < 250` es lo que los separa.
- **Verificado con números, no a ojo** (me equivoqué al juzgar una captura pequeña y lo comprobé leyendo píxeles): eligiendo Mujer A + piel clara + pelo blanco + camiseta verde + pantalón azul desde la interfaz, la textura de la cabeza queda en (249,248,246) pelo y (246,211,181) piel — `#f5d0b0` es (245,208,176) — y la del cuerpo en (72,109,162) pantalón y (65,151,117) camiseta.
- **No se repinta si no hay ningún color elegido**: montar dos lienzos de 512×512 por cada vecino del pueblo no sale gratis.

### 2026-08-18 — Juego Vital: cámara libre, «atrás» para cerrar, bici y planeador Aptera
- **La cámara se mueve, como en Call of Duty Mobile** (petición de Eugenio). En el móvil, la **mitad derecha** de la pantalla gira la vista mientras el joystick de la izquierda mueve al personaje; con ratón se arrastra por cualquier parte del mundo. El joystick pasa de la derecha a la **izquierda**, que es lo que ya prometía el aviso de «gira el móvil» y lo que exige tener el mirar a la derecha.
- **Cambio de fondo que esto obliga**: el mando deja de estar en ejes del mundo y pasa a ser **relativo a la cámara**. «Adelante» es alejarse de la cámara, gires hacia donde gires. Antes la vista era fija y pantalla y mundo coincidían.
- **La cámara solo gira si el arrastre EMPIEZA sobre el lienzo 3D.** Comprobarlo así —y no con una lista de paneles a excluir— hace que cualquier botón o ficha que se añada mañana quede a salvo sin tocar nada.
- **«Atrás» cierra el cuadro de diálogo** (petición de Eugenio: «indicando que el jugador quiere ir para atrás y no quiere esa interacción»). Flecha abajo o S en el teclado, y tirar del joystick hacia ti en el móvil. Ese mismo gesto no mueve además al personaje.
  - Lo que rechazas **no se te vuelve a abrir solo**: hasta ahora la ficha de un proyecto se reabría en el mismo fotograma porque seguías al lado. Se recuerda qué has rechazado y se olvida al alejarte.
- **Bici** (botón a la derecha, o B): 17 m/s en vez de 8. El personaje va de pie sobre los pedales — los modelos de Kenney no tienen animación de pedaleo, y sentarlo quedaría peor.
- **Planeador «Aptera»** (botón a la derecha, o V): despegue y aterrizaje verticales, hasta 130 m de altura y 32 m/s. Volando por encima de 4 m no chocas con nada: pasas por encima de los tejados. Al bajar, cuando toca el suelo te bajas solo. Lleva sombra en el suelo, sin la cual no se sabe a qué altura vas.
  - **Subir y bajar se pulsan y se quedan fijados**, no hay que mantener el dedo. En el móvil no se puede sujetar un botón mientras conduces con el otro pulgar. Con teclado sí es mantener pulsado (espacio y mayúsculas), que ahí es lo natural; los dos mandos se suman.
  - **Los dos vehículos van hechos con geometría, no con modelos descargados**: la librería CC0 que usamos no trae bicicleta, y de la Aptera no existe —ni puede existir— un modelo libre, porque es el diseño de un coche real de una empresa real. Lo que hay es una versión estilizada con el mismo lenguaje visual del resto del mundo: silueta de gota, tres ruedas y panel solar. La versión voladora con rotores es invención para el juego; **la Aptera de verdad no vuela**.
- **Fallo encontrado al verificar el vuelo**: el efecto del teclado se volvía a montar cada vez que cambiaba la lista de agentes, y con él se perdía el conjunto de teclas pulsadas — soltabas el espacio y el planeador seguía subiendo, porque el «soltar» llegaba a otro oyente. Ahora el efecto se monta UNA vez y llama a las acciones a través de una ref.
- **Verificado midiendo, no a ojo**: despegue hasta 7 m, soltar y quedarse ahí, descenso hasta 0 y desmontaje automático; el giro de cámara cambia la posición de la cámara alrededor del jugador manteniendo la distancia (18,6 m a zoom 1).

### 2026-08-18 — «No se puede abrir esta página» en el móvil durante los despliegues
- Reportado por Eugenio con captura de Chrome en iOS. Causa: al desplegar, el contenedor de la aplicación se sustituye y hay unos segundos en los que no acepta conexiones; Caddy devolvía un error al instante.
- **Arreglo**: `lb_try_duration 20s` en el proxy. Ahora la petición **espera** reintentando en vez de fallar: se ve una carga lenta, no un error. No elimina la ventana de despliegue, la hace invisible.

### 2026-08-18 — Juego Vital: chocarte con alguien ya no te deja encerrado
- **Reportado por Eugenio**: «cuando me choco con un personaje e intento seguir caminando, no me deja escapar».
- **La causa no era la colisión, era el teclado.** Al chocar se abría el chat de esa persona y, con él, `humanity:asistente-focus` metía el cursor en el cuadro de escribir. Desde ahí las teclas de andar cuentan como escritura (guarda de siempre para no caminar mientras escribes al asistente), así que WASD dejaba de funcionar: estabas atrapado sin poder moverte.
- **Tres arreglos, que se complementan**:
  1. **Un choque ya no roba el teclado.** Te has tropezado con alguien, no has decidido escribirle: se abre su ficha y su conversación, pero el cursor se queda fuera. Hablar a propósito —botón, lista «Tu mundo», tecla E o viaje rápido— sí lleva el cursor al chat, como antes.
  2. **Seguir caminando cierra lo que haya abierto**, en cualquier dirección (antes solo cerraba «atrás»). En el móvil, cualquier empujón del joystick de más del 60 % vale.
  3. **Escape es la salida de emergencia**: funciona incluso escribiendo — suelta el teclado del chat y cierra lo abierto.
- **Verificado caminando de verdad**: al chocar con Javier el foco se queda en el `body` y su ficha se abre; a la siguiente repetición de la tecla la ficha se cierra sola y el personaje sigue de largo (de z=6,2 a z=−0,4, pasándole al lado). Pulsar «Javier» en la lista sí deja el cursor en el chat.

### 2026-08-18 — Juego Vital: entrar DENTRO de un proyecto, estilo Pokémon
- **Chocar con el edificio de un proyecto ya no abre una ficha: te mete dentro** (petición de Eugenio). Antes hay una **transición de pantalla estilo Pokémon**: un fogonazo y una malla de rombos que nace en el centro y lo cubre todo, con el nombre del proyecto encima. La transición no es adorno: existe para tapar el cambio de escenario, que es exactamente para lo que la inventaron los Pokémon. Va en HTML sobre el lienzo, así el mundo 3D puede cambiar por debajo.
- **La sala diáfana**: planta circular de 48 m, muro de cristal esmerilado con montantes, techo luminoso, anillos de luz girando en el suelo y, en el centro, un **núcleo holográfico que respira** con un aro que se llena según las tareas hechas de verdad. Encima flota el nombre del proyecto y su avance.
- **Las habitaciones son los GRUPOS del tablero**, no una invención: `proyectos.grupos` (Producto, Diseño, Técnico, Contenido, Personas, Dinero) con su propio color. Cada puerta lleva su nombre, su color y cuántas tarjetas tiene. Entrar por una puerta es abrir esa carpeta.
- **Dentro de una habitación flota lo que hay de verdad**: cada `roadmap_item` de ese grupo como una lámina con su título, su resumen y su estado en color; cada bloque de texto como una hoja; y **cada imagen de sus bloques como una foto de verdad**, con marco luminoso. Todo se balancea despacio en dos arcos, a la altura de la vista.
- **Una sola planta** (`planta.ts`) define dónde está cada puerta y cada cosa: lo leen la escena (para dibujar) y los obstáculos (para chocar). Misma regla que `mapa.ts` con la aldea — si estuviera duplicado, entrarías por una puerta que ya no está.
- **Dentro no hay bici ni planeador ni minimapa**: se entra a pie, y el mapa es la propia sala. A la derecha aparece la lista de habitaciones y qué hacer con el proyecto (abrir el tablero, hablar con la IA de él, salir).
- **Cuatro cosas que se vieron feas y se arreglaron mirando, no suponiendo**:
  1. **La cámara se quedaba fuera de la sala** y se veía todo a través del muro (una franja negra enorme era un montante). Dentro se acerca a 10,5 m y, si aun así saliera, se mete hacia dentro.
  2. **La niebla se comía la sala**: con 22-70 m no se veían ni las puertas ni el núcleo. Ahora 70-210.
  3. **El suelo salía negro**. Causa: `metalness` alto **sin mapa de entorno** — un material metálico no tiene nada que reflejar y se renderiza oscuro. Bajado casi a cero, y comentado.
  4. **Las fotos salían negras**. Causa clásica de three.js: al llegar la textura, React reutilizaba el mismo material y three **no recompila el shader** de un material que nació sin mapa. Se le pone una `key` distinta para que monte uno nuevo.
- **Verificado con una tarjeta temporal** creada y retirada después (el proyecto de Eugenio aún no tiene ninguna): en la habitación «Contenido» aparecieron las tres cosas — la tarjeta, la nota y la foto real.

### 2026-08-18 — La IA sabe en qué habitación estás (y puede poner cosas en ella)
- **Reportado por Eugenio**: dentro de la sala «Personas» de Aldea Regenerativa pidió «añade a Gala como persona en esta sala» y el asistente contestó como el asistente genérico de la plataforma: «¿quién es Gala?, ¿qué sala? Estás en /juego y no hay ninguna sala abierta».
- **Causa raíz — el contexto del juego solo se enviaba al hablar con alguien.** Salía de `hablarCon`, así que si escribías directamente en la barra del chat sin haber hablado antes con el robot o con un vecino, el modelo no recibía NADA del juego: no sabía ni que estabas dentro de él. Ahora el contexto se manda siempre que cambia dónde estás.
- **Y ese contexto no decía dónde estabas.** Ahora lleva `dentro`: el proyecto, sus habitaciones y en cuál estás, con lo que hay en ella. El prompt explica qué significa «esta sala» y le prohíbe preguntarlo.
- **Nueva acción `tarjeta`**: dentro de un edificio no se crean vecinos ni edificios — se añade a su tablero. `{"tipo": "tarjeta", "grupo": "personas", "nombre": "Gala"}` crea la tarjeta en ese grupo y **aparece flotando en la habitación al momento**.
- **Tres fallos encadenados, cada uno tapando al siguiente, encontrados probando contra la API de verdad**:
  1. Con el contexto puesto, el modelo devolvía `tipo: "persona"` — que planta un vecino en la aldea, fuera del edificio. Dentro de un proyecto esa acción ya no se ofrece.
  2. Después decía «¡Hecho! Gala ya está flotando aquí» **sin emitir el bloque JSON**: una promesa sin efecto. Ahora el prompt dice que sin bloque no ocurre nada y que decirlo sin hacerlo es mentirle al jugador.
  3. Y cuando por fin lo emitía, **el filtro del servidor lo tiraba en silencio**: solo aceptaba `persona` y `proyecto`. Al añadir un tipo de acción hay que añadirlo también ahí; queda comentado en el código.
- **Verificado de punta a punta**: la IA responde «Ya está, Gala aparece flotando aquí en Personas» con la acción correcta, la página crea la tarjeta de verdad en el grupo `personas` y el contador de la habitación pasa a 1. La tarjeta de prueba se retiró después.

### 2026-08-18 — Correr con la barra espaciadora
- **La barra multiplica por 3 la velocidad** a pie (8 → 24 m/s) y en bici (17 → 51 m/s), petición de Eugenio. En el planeador NO: allí la barra es lo que te hace subir, y las dos cosas no se pisan porque el personaje sabe en qué vas.
- **Usa la animación de correr del propio modelo** (`sprint`, que los personajes de Kenney ya traen) en vez de acelerar la de andar, que se vería como una marioneta con prisa.
- Medido en el navegador: 5,8 m/s andando y 20 m/s corriendo en la misma pasada. El cociente sale 3,45 y no 3 porque la velocidad se alcanza con una rampa suave y la muestra de andar aún no había llegado a su tope; el código multiplica exactamente por 3.

### 2026-08-18 — Halos, clic a distancia y nombres que se leen desde lejos
- **Pulsar entra o habla, sin caminar** (petición de Eugenio): un clic o un toque sobre el edificio de un proyecto te mete dentro, y sobre una persona abre su chat. Ya no hace falta acercarse.
- **El clic NO se dispara si has arrastrado.** En este juego arrastrar es girar la cámara: sin esa comprobación (`delta > 6 px`), cada vez que giraras mirando a un edificio acabarías entrando en él.
- **Halo animado sobre todo lo que tiene algo dentro**: un anillo que gira y late con tres chispas, más un haz de luz hasta el suelo, del color de la cosa. Desde el otro lado del valle se ve dónde hay algo.
- **Al pasar por encima, el nombre pasa a medirse en PANTALLA, no en el mundo.** Es la parte que importa: a distancia `d` y campo de visión `fov`, la altura visible del mundo es `2·d·tan(fov/2)`; escalando el texto a esa altura por la fracción que queremos (7,5 % del alto de pantalla), el nombre ocupa siempre lo mismo, esté a 5 m o a 300. Un nombre «más grande» a secas seguiría siendo ilegible de lejos, que era justo el problema.
- **Detalles que hacían falta para que funcione de verdad**:
  - `raycast` anulado **malla a malla** en el halo: ponerlo en el grupo no sirve —el rayo recorre los hijos igual— y el haz, que envuelve al edificio, se comía los clics.
  - El blanco de una persona es un cilindro **transparente**, no `visible={false}`: lo invisible se salta el rayo del ratón y no habría nada que acertar.
  - El nombre resaltado va con `depthTest` apagado y sin descarte por frustum: si no, el propio edificio lo tapa y three lo descarta justo cuando lo has hecho grande para leerlo.
- **Verificado en el navegador** a 90 m de zoom, donde el personaje mide unos pocos píxeles: al pasar por encima el cursor cambia a mano, «Javier» se lee a pantalla completa, y al pulsar se abre su ficha sin haber caminado. (Mis dos primeros intentos fallaron por un error mío de coordenadas: las capturas van a 800 px y la ventana real mide 826.)

### 2026-08-18 — El hover ya no parpadea, y ocupa lo que Eugenio pidió
- **El nombre resaltado se redujo al 40 %** de lo que ocupaba (del 7,5 % al 3 % del alto de pantalla): a pantalla completa tapaba media escena.
- **Salir del hover ya no es inmediato.** Un muñeco son varias mallas con huecos entre medias, y el nombre desaparecía y volvía con solo mover un poco el ratón por encima (reportado por Eugenio). Ahora hay 450 ms de gracia que se cancelan si el ratón vuelve a entrar: hay que marcharse de verdad para que se apague. Al pulsar sí se apaga en el acto, que es lo que se espera.

### 2026-08-18 — El avatar se quedaba tieso al cambiar de fenotipo
- **Reportado por Eugenio**: «he cambiado el estilo de mi avatar y ahora no tiene dinamismo ni efectos al moverse».
- **Causa**: cambiar de fenotipo carga OTRO `.glb`, con otro esqueleto y otras pistas de animación, pero el componente se reutilizaba y el mezclador de animación seguía apuntando a los huesos del modelo anterior. El muñeco se quedaba clavado en su pose de reposo — ni andar, ni respirar. Recargar la página lo arreglaba, que es la firma exacta de este fallo.
- **Arreglo**: `Persona3D` monta su modelo con `key={cuerpo}`, así que cambiar de cuerpo monta una persona nueva y limpia. Vale igual para tu avatar y para el de cualquier vecino.
- **Medido, no mirado**: leyendo el cuaternión del hueso `arm-left` en el navegador. Antes del arreglo, tras cambiar de fenotipo, se quedaba fijo en (0, 0) mientras los otros dos vecinos seguían animando; después del arreglo se mueve igual que ellos.

### 2026-08-18 — Meter en una habitación a alguien que YA existe (no un clon)
- **Reportado por Eugenio**: dentro de la sala «Personas» del Camión camperizado pidió «añade a Anita» y la IA **creó una Anita nueva** — un nombre suelto en una tarjeta. Él quería la Anita de siempre, con su avatar.
- **Nueva acción de la IA, `habitante`**: `{"tipo":"habitante","grupo":"personas","agente_id":"GA…","nombre":"Anita"}`. El prompt le enseña a mirar la lista de gente que ya vive en el mundo y usar SU id; solo si de verdad no existe nadie con ese nombre se crea, una vez.
- **La tarjeta apunta a la persona** con un bloque `{tipo:'agente', agente_id}`. Dentro de la habitación deja de ser una lámina de cristal: aparece **su avatar real**, con su fenotipo y sus colores, su nombre, su halo y una peana de luz. Al pulsarla (o al chocarte con ella, como en la aldea) se abre SU conversación, con su memoria.
- **Rescate de lo ya creado**: las tarjetas de antes solo llevan el nombre. Si coincide con el de alguien de tu mundo, se toma por esa persona — así la «Anita» duplicada pasó a ser la Anita de verdad sin tocar la base de datos.
- **Dónde vive la regla**: en `planta.ts`, no en `Interior.tsx`. La página necesita saber quién está en la sala para contárselo a la IA, y `Interior.tsx` importa three.js: traerlo de allí metería el motor 3D (~1 MB) en el paquete que descarga todo el mundo, juegue o no.
- **Verificado de punta a punta**: la IA devuelve la acción con el id real de Javier (nada de crear a nadie), la tarjeta se guarda con su bloque `agente`, y en la habitación aparecen Anita y Javier de pie, con sus avatares. Las tarjetas de prueba se archivaron después; el número de personas del mundo siguió siendo 2.

### 2026-08-18 — Vuelo pilotable, salto, rebotes y cámara que te sigue
- **Controles nuevos** (peticiones de Eugenio): Shift corre (×3, medido 26,8 m/s frente a 8,8 andando), la barra salta (~1,35 m), y DOS toques de barra montan la nave y despegan solos. Pilotando, **W sube y S baja** y la nave **avanza sola en crucero** (32 m/s medidos): se dirige con A/D y con la vista. Aterrizar es mantener S; al tocar el suelo te bajas.
- **La nave saca alas al despegar**, al estilo del V-Coptr Falcon: dos brazos en V con UN rotor en el extremo de cada uno. En el suelo van plegadas en vertical; el despliegue es el gesto del despegue.
- **La cámara sigue el giro del muñeco**: al girar con A/D se va colocando sola a su espalda, como en un juego de conducción. Mientras arrastras con el ratón o el dedo mandas tú, y andando hacia atrás no se da la vuelta (marearía).
- **Todo el mobiliario del pueblo hace REBOTAR**: farolas, bancos, árboles (los ~1.100), casas, naves, fuente, puestos, pozo y carro son sólidos, reflejan la velocidad al chocar (con pérdida de energía) y NO abren ninguna ficha. Verificado plantándose dentro de la fuente: el empuje deja al jugador exactamente en el radio de colisión (2,9 m) sin abrir nada. Los proyectos y las personas siguen abriendo su ficha al chocar, como siempre.

### 2026-08-18 — El mundo se edita como un Miro en 3D
- **Modo edición** (llave inglesa en la barra CREAR): pulsar cualquier pieza del pueblo —casa, árbol, farola, banco, nave, fuente, puesto, pozo, carro— la selecciona con un aro y abre su ficha: **Mover** (el objeto se suelta donde pulses el suelo, con un marcador que sigue al ratón), **Girar**, **Diseño** (las casas rotan entre los 12 modelos; los árboles alternan frondoso/pino) y **Eliminar**. Pulsar suelo vacío abre el panel **Crear aquí** con el catálogo (9 props) y el conocimiento: **Nota**, **Imagen** y **Documento** (subida real por /api/uploads).
- **Notas, imágenes y documentos flotan en 3D** anclados con un poste, con bamboleo suave. Fuera del modo edición, pulsarlos los ABRE: la nota se lee entera, la imagen se ve grande y el documento se descarga. Las notas se escriben desde su ficha de selección.
- **Hilos de conocimiento**: desde la ficha de un objeto, «Conectar» + pulsar el destino tira una curva dorada hasta otra cosa plantada, una persona o el edificio de un proyecto. Es el grafo de conocimiento, pero paseable.
- **La IA vive en el mismo mundo**: nueva acción `nota` («apúntame que mañana llamo al taller» → clava la nota junto al jugador) y el contexto lleva `plantado_en_el_mapa`, así que puede responder «¿qué notas tengo?» sin inventar. Verificado contra la API real.
- **Persistencia**: `game_world_items` (objetos, con `enlaces` jsonb) y `game_world_overrides` (retoques del pueblo semilla por `seed_id`), migración 0031. El pueblo pasó a tener IDENTIDAD pieza a pieza en `mapa.ts` (`piezasAldea()`, `arbolesAldea()` con la MISMA semilla 118 y el mismo orden de consumo del azar: el bosque no se replantó); dibujo, rebote, clic y retoques hablan del mismo objeto. Los arbustos, rocas y flores pasaron a semilla propia (119): se recolocaron una vez y no son editables.
- **Cazado en pruebas**: `PUT /mundo/semilla` devolvía 404 — Express prueba las rutas en orden de registro y «semilla» encajaba en `/mundo/:id`. La ruta fija va ANTES; queda comentado.

### 2026-08-18 — Las personas FORMAN PARTE de los proyectos (fuera del kanban)
- **Reportado por Eugenio** (con captura): Anita salía como TARJETA «por hacer» en el tablero del Camión camperizado. Una persona no es una tarea pendiente.
- **Membresía real**: `game_agents.proyecto_ids` (jsonb, migración 0031) — una persona puede estar en varios proyectos. La migración RESCATA los datos: las tarjetas-persona (por bloque `agente` o por nombre en el grupo «personas») se convierten en membresía y se archivan. Verificado con Anita: quedó miembro y su tarjeta salió del tablero.
- **Sección «Personas del proyecto»** en la página del proyecto, encima del kanban: chips con avatar, rol, quitar con la X y «+ Añadir» con la gente de tu mundo. Privada: solo la ve el creador (las personas de tu mundo son representaciones tuyas).
- **En el 3D**, los miembros están DE PIE en la sala «Personas» del edificio, con su avatar real; la puerta y el panel lateral cuentan personas, no tarjetas. La IA (`habitante`) ahora UNE al proyecto en vez de crear tarjetas, y `en_proyectos` en su contexto le dice quién está ya dentro. Verificado contra la API real: devuelve el id del Javier existente, sin duplicar a nadie.

### 2026-08-18 — Edición directa: pulsar da opciones, arrastrar mueve
- **Ya no hay «modo edición»** (petición de Eugenio): pulsar CUALQUIER objeto —casa, árbol, farola, nota, vídeo…— abre directamente su ficha de opciones, y **pinchar y arrastrar lo mueve** con un fantasma que sigue al ratón; al soltar se guarda donde cae. Arrastrar en vacío sigue girando la cámara: el agarre del objeto se apunta en el mismo pointerdown del lienzo, que corre antes que el oyente de la cámara en window.
- **Cazado en pruebas**: el suelo solo apuntaba el ratón cuando el estado «moviendo» ya había re-renderizado; en un arrastre rápido el objeto se soltaba en su sitio original. El suelo apunta ahora el puntero SIEMPRE.
- **Las instrucciones del teclado viven comprimidas en un icono ℹ️** arriba a la derecha (petición de Eugenio): despliega la chuleta entera, incluida la edición directa.

### 2026-08-18 — Más cosas plantables + la ventana interna
- **El panel «Crear aquí» crece** (petición de Eugenio): además de props, nota, imagen y documento, ahora se plantan **links, vídeos (YouTube), música (Spotify o similar), lienzos, mapas y proyectos**. El lienzo y el mapa se crean DE VERDAD en la plataforma (POST /api/graphs y /api/maps) y quedan plantados apuntando a su página; el proyecto abre el formulario de siempre y su edificio se levanta justo donde pulsaste el suelo.
- **La ventana interna**: darle a «Abrir» sobre cualquiera de estos reproduce SIN salir del juego — una pantalla central con el navegador del link, el reproductor de YouTube (youtube-nocookie), el embed de Spotify, o el lienzo/mapa reales de la plataforma. Pulsar fuera de la ventana la cierra; hay botón de «abrir fuera» porque algunas webs se niegan a cargar dentro de un marco. Verificado con un vídeo real: la tarjeta 3D con su ▶ en el mundo, ficha con Abrir, y el vídeo cargando dentro del juego.
- Migración 0032: el check de tipos de `game_world_items` admite los nuevos. Recordatorio pagado en las pruebas: el backend NO se recarga en caliente — el Set de tipos del servidor seguía siendo el viejo hasta reiniciar.

### 2026-08-18 — Hilos con información, menú CREAR lateral y cámara de interiores
- **Los hilos dorados llevan información, como las aristas de los grafos** (petición de Eugenio): pulsar un hilo abre su ficha con las 7 RELACIONES de los grafos (contexto, causa, dato, fuente, apoya, contradice, matiza — cada una con su color, `RELACIONES_HILO` en tipos.ts), un texto corto («la pregunta a la que responde») y «Eliminar hilo». El hilo se pinta del color de su relación y el texto flota en su punto más alto. Al conectar dos cosas la ficha se abre sola para rellenarla. Verificado en navegador: clic en hilo real → ficha → relación «Causa» → el arco se puso rojo y guardó por PUT.
- **Plantar documentos YA existentes**: en «Crear aquí» y en el menú lateral, «Mis documentos» lista tus documentos y páginas reales (GET /api/publicaciones filtrado) y los planta apuntando a su URL. Los grafos también se crean desde el juego (POST /api/graphs) y quedan plantados.
- **El hover estable (450 ms de gracia + rótulo) funciona en TODO lo plantado**: notas, imágenes, documentos, tarjetas de medios y props usan el mismo `useHoverEstable` + `Rotulo` de las señales de la aldea («Pulsa para abrir · arrastra para mover»).
- **El menú CREAR es ahora un panel lateral izquierdo a toda altura** con el diseño del menú de objetivos del mapa: carril estrecho de iconos que se expande en acordeón con submenús — Naturaleza, Pueblo, Conocimiento, Plataforma y Personas — más Aspecto, Robot y «Tu mundo» con tus agentes. Pulsar suelo sigue abriendo el «Crear aquí» completo con todo lo plantable.
- **La cámara dentro de los edificios, arreglada de raíz** (lo reportó Eugenio: se quedaba pegada a la nuca al andar junto a la pared). Fuera el acotado que la empujaba hacia dentro del muro; ahora los interiores se dibujan SOLO por su cara interna (culling, como Los Sims): si la cámara queda al otro lado de la pared, la pared desaparece y sigues viendo la sala entera. Además, al teletransportarte la cámara se recoloca detrás del muñeco (yaw 0). Verificado en navegador: entrar en el Camión, bordear la pared en giro — el muñeco se ve siempre a distancia útil, sin primeros planos de espalda.
- **Cazado en pruebas**: el panel del hilo quedaba abierto tras un teletransporte y, al cerrarse, su input re-guardaba el texto viejo por el blur. Sin arreglo de código (solo pasa editando por API por debajo), pero apuntado aquí por si reaparece.

### 2026-08-18 — Gran pantalla de YouTube, Spotify y canciones subidas
- **La GRAN PANTALLA** (petición de Eugenio): un cine al aire libre entre la plaza y el distrito (`Pantalla.tsx`, obstáculo `deco:pantalla`), con play rojo que late y rótulo al pasar el ratón. Pulsarla abre su panel: conectar tu cuenta de YouTube (OAuth de Google, ventanita emergente + postMessage) y ver **vídeos nuevos de tus suscripciones relacionados con TUS proyectos**.
- **Cómo recomienda** (`src/server/youtube.ts`): las suscripciones salen de la API oficial (dato privado, por eso el OAuth, permiso solo-lectura); los vídeos de cada canal salen del **RSS público** de YouTube (sin gastar cuota); la relación con los proyectos es por palabras clave del título/descripción/tarjetas (normalizadas sin tildes, stopwords es/en). Dos listas: «Para tus proyectos» (con el porqué) y «Nuevos de tus suscripciones». Caché de 10 min por usuario. Pulsar un vídeo lo reproduce en la ventana interna (youtube-nocookie).
- **Música: 3 maneras de plantarla** (petición de Eugenio): pegar un link (como antes), **SUBIR una canción** (MP3/M4A/OGG/WAV/AAC/FLAC, hasta 25 MB, se reproduce con `<audio>` en la ventana interna — verificado subiendo un WAV real de punta a punta), o **elegirla de TU Spotify** (`src/server/spotify.ts`, OAuth igual que YouTube): tus playlists y canciones guardadas salen en el propio formulario de crear música (los dos: panel «Crear aquí» y menú lateral, componente `OpcionesMusica`).
- **Tokens**: `youtube_accounts` (0033) y `spotify_accounts` (0034), una fila por usuario, refresh automático al caducar. Son credenciales: desconectar BORRA la fila (y revoca en Google; Spotify no tiene endpoint de revocación — se quita del todo en spotify.com/account/apps). Registrados en server.ts con la línea única del patrón de módulos.
- **PENDIENTE DE EUGENIO para activarlo en producción** (los paneles avisan solos mientras tanto, patrón 503): en Google Cloud añadir `GOOGLE_CLIENT_SECRET` + activar «YouTube Data API v3» + dar de alta el redirect `https://humanity.wiki/api/youtube/callback` en el cliente OAuth del login; en developer.spotify.com crear una app con redirect `https://humanity.wiki/api/spotify/callback` y poner `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET`. Todo va en `.env.production` del servidor. `APP_URL` debe estar puesto a `https://humanity.wiki`.

### 2026-08-18 — Puertas para los edificios del juego, PDF legible y el mapa 2D como creador
- **Reportado por Eugenio (4 cosas):** su proyecto nuevo no tenía puerta, el vídeo/grafo «no se abrían», el PDF subido no se podía leer, y quería el mapa 2D interactivo como creador completo.
- **Los edificios construidos DESDE el juego ya se entran**: un agente de tipo proyecto con `proyecto_id` abre su interior al chocar con él y al pulsarlo, igual que los edificios del distrito. El chat con el agente sigue disponible con la (E). Verificado entrando en su «Inversiones» de la plaza.
- **El PDF subido se LEE dentro del juego**: `/uploads` servía los PDF con descarga forzosa (`Content-Disposition: attachment`) y el iframe de la ventana interna se quedaba en blanco/descargando. Ahora el PDF va EN LÍNEA (el visor del navegador corre en su propio sandbox; el motivo de seguridad de la descarga forzosa era para SVG/ZIP, que siguen igual) y su iframe va SIN sandbox (el visor de Chrome no arranca dentro de un iframe con sandbox). Verificado con su «Poliza Seguro.PDF»: cabecera limpia y visor cargando.
- **Clic = opciones, OTRO clic = abrir**: pulsar un objeto ya seleccionado lo abre directamente (nota, imagen, vídeo, PDF, grafo…). El «Abrir» de la ficha sigue estando, pero ya no es imprescindible descubrirlo. (El vídeo y el grafo en sí YA abrían — verificado con los suyos: el reproductor y el lienzo cargan en la ventana interna; lo confuso era el camino.)
- **El mapa 2D es ahora un creador completo** (petición de Eugenio): enseña TODO (personas, proyectos, robot, gran pantalla y lo plantado — cuadraditos con el color de su tipo, los props de decorado no); **hover** con crecimiento y resalte del nombre; **clic en algo = viajar hasta ello**; **clic en suelo vacío = abre «Crear aquí» EN ESE PUNTO** del mundo (verificado: nota plantada a 70 m del jugador desde el mapa). Leyenda con «Plantado» y cursor de cruz.

### 2026-08-18 — Los vídeos de YouTube con su miniatura, título y etiquetas
- **Petición de Eugenio**: las tarjetas de vídeo enseñaban la URL pelada. Ahora la tarjeta 3D es la **miniatura real** del vídeo (i.ytimg.com/mqdefault, 16:9 sin franjas, con CORS) con el play rojo encima, el **título** debajo y dos **etiquetas**: el canal y «YouTube». La URL no se pinta en ningún sitio.
- **De dónde salen los datos**: al crear un vídeo, el backend (POST /api/juego/mundo) pregunta al **oEmbed público de YouTube** (sin clave) y guarda título→`nombre` y canal→`texto`. La URL se normaliza al vídeo pelado antes de preguntar: al oEmbed le sientan mal los parámetros de búsqueda (pp=…, comprobado con el vídeo real de Eugenio). Si oEmbed no contesta, el objeto se crea igual.
- **`nombreLimpio()` en tipos.ts**: un solo criterio para no enseñar nunca una URL como nombre — lo usan la tarjeta 3D, el rótulo del hover, la ficha de opciones, la ventana interna y el mapa 2D. Los vídeos creados ANTES del enriquecido enseñan «Vídeo de YouTube» en vez de la dirección; en local se rellenaron por oEmbed (el V-Coptr de Eugenio ya tiene su título y su canal).

### 2026-08-18 — Arrastrar un objeto a un edificio lo guarda EN ese proyecto
- **Petición de Eugenio**: arrastras un vídeo (o nota, imagen, PDF, link, música, lienzo, mapa) hasta un edificio de proyecto y **se convierte en una TARJETA de ese proyecto** — aparece en su tablero (grupo «contenido» si existe) y flotando dentro del edificio. El objeto SALE del mapa (se archiva): se ha mudado adentro, no copiado. Los props (árboles, rocas) no se mudan: son decorado.
- **Tres caminos al mismo sitio**: (1) soltar el arrastre sobre el edificio — el punto de suelta se compara con los edificios del distrito Y los construidos desde el juego (`proyectoEnPunto`, radio edificio +0,8); (2) modo Mover + pulsar el suelo junto al edificio; (3) modo Mover + **pulsar el edificio mismo** — antes ese clic te metía dentro; con un objeto en la mano ahora significa «guárdalo aquí» (editorRef ganó el campo `moviendo`).
- **Qué lleva la tarjeta**: título real del objeto (nunca URL), resumen con el link, y bloques que la habitación 3D ya sabe pintar — la miniatura del vídeo como foto flotante, el texto de la nota como lámina. Verificado de punta a punta: Mover + clic al edificio «Inversiones» → tarjeta con miniatura + link en grupo contenido, objeto archivado del mapa, y limpiada tras la prueba.
- Nota: si el punto de suelta de un arrastre cae JUSTO detrás del edificio (el rayo del ratón sobrepasa el tejado), el objeto se queda ahí al lado — con volver a arrastrarlo o usar Mover+clic al edificio, dentro.

### 2026-08-18 — Los proyectos son PORTALES verdes y dentro hay una plaza abierta
- **Portales estilo Rick & Morty** (petición de Eugenio): los edificios de proyecto —del distrito Y los construidos desde el juego— son ahora portales verdes: espiral pintada una vez en canvas y compartida por todos, DOS discos girando en sentidos opuestos, corazón claro, borde verde latiendo y charco de luz al suelo (`PortalVerde.tsx`). Mantienen TODO: hover con rótulo medido en pantalla, título flotante con su barra de progreso real, clic para entrar, choque para entrar y colisión de rebote.
- **Dentro: un mapa abierto con una plaza vacía** (petición de Eugenio, sustituye a la sala oscura con habitaciones): prado a cielo abierto (`PlazaProyecto` en Interior.tsx), plaza empedrada con el aro del color del proyecto, el título y el progreso flotando encima, la GENTE del proyecto de pie alrededor, el conocimiento del tablero (tarjetas, fotos, textos) en corro, y el portal verde de salida. Ya no hay habitaciones: `sala` queda siempre a null y las puertas/salas se retiraron de obstáculos y choques.
- **La plaza se EDITA como la aldea**: clic al suelo abre «Crear aquí» y lo plantado queda ANCLADO al proyecto — `game_world_items.proyecto_id` (migración 0035): dentro se ven solo los suyos, en la aldea solo los que no tienen proyecto. Verificado de punta a punta: nota plantada en la plaza de «Inversiones» con proyecto_id correcto, invisible al salir a la aldea.
- **Cazado en pruebas**: apareciendo junto al portal de salida, la cámara quedaba justo encima de él y la espiral (Billboard, siempre de cara) llenaba la pantalla — `PLAZA_ENTRADA` se metió más adentro (z 16).
- Deuda anotada: los objetos de proyecto no salen aún en el mapa 2D (enseña solo los de la aldea), y la IA (`plantado_en_el_mapa`) no distingue plaza de aldea. Ambas cosas caben en una pasada corta si Eugenio las quiere.

### 2026-08-18 — Un solo título (más grande) por portal, y los portales se arrastran
- **Un solo texto encima de cada portal** (petición de Eugenio: se apilaban el rótulo del hover y el título fijo): fuera el Rotulo — queda SOLO el título en grande (0,95 → 1,16 al pasar el ratón, contorno verde oscuro) con su barra de progreso debajo.
- **Los portales se ARRASTRAN como cualquier objeto** (petición de Eugenio): pinchar sin soltar y mover. Persistencia en dos sitios según el portal: los del DISTRITO guardan su posición en `game_world_overrides` con seed_id `proy:<id>` (sin migración: la tabla ya valía), y los construidos DESDE el juego guardan x,z en su propia fila de `game_agents` (el PUT ya lo aceptaba). `posicionesProyectos()` en mapa.ts es la única fuente: dibujo, obstáculos, minimapa, salida del proyecto y soltar-encima-para-archivar leen de ahí. El fantasma del arrastre es el propio portal; al soltarlo NO se abre ficha (un portal no tiene Girar/Diseño/Eliminar). El clic sin arrastre sigue entrando.
- **Cazado en pruebas (dos veces)**: los eventos de puntero sintéticos de la verificación llevaban offsetX=0 y react-three-fiber apunta con offsetX — los primeros arrastres de prueba cayeron en la esquina de la pantalla y movieron el VÍDEO de Eugenio (restaurado a su zona, ~(20,-9)) en vez del portal. Con los offsets forzados, el arrastre real quedó verificado: el portal-agente se movió de (15.8,-13.9) a (4.4,-4.2), guardó por PUT y se restauró a su sitio exacto.

### 2026-08-18 — Cada portal puede llevar su FOTO de portada en el centro
- **Petición de Eugenio**: subir una foto a cada portal y que aparezca en el centro como portada, contenida en un círculo con borde blanco.
- **La foto en el portal** (`FotoDePortal` en PortalVerde.tsx): círculo blanco (radio×0,56) y encima la foto recortada en círculo (radio×0,5), centrada sin deformar (recorte por repeat/offset de la textura según la proporción). La textura se carga a mano con crossOrigin: una foto rota no tumba la escena — simplemente queda la espiral.
- **Dónde se guarda, según el portal**: los construidos DESDE el juego usan su `game_agents.foto_url` de siempre (el PUT ya lo aceptaba); los del DISTRITO viajan en `modelo` del retoque `proy:<id>` de `game_world_overrides` (para una casa es el diseño, para un portal es la URL de su foto — sin migración). `posicionesProyectos()` devuelve ahora también la `portada` y por ahí la reciben dibujo y minimapa sin tocar nada más.
- **Dos botones de subida**: en la ficha del agente-proyecto, un botón de cámara junto a HABLAR (la foto además encabeza la ficha al momento); en el panel del proyecto del distrito, «Foto de portada del portal» debajo de «Abrir el proyecto». Ambos exigen imagen (JPG/PNG…), suben por /api/uploads y avisan si falla.
- Verificado de punta a punta con el portal «Inversiones» de Eugenio: subida real por el input del botón → foto en el centro del portal con su borde blanco, actualizada EN VIVO sin recargar; y su `foto_url` restaurado a null al terminar (todo lo suyo intacto). El portal de salida de la plaza queda sin foto a propósito.

### 2026-08-18 — El PDF se lee de verdad (visor propio) y las casas a tamaño de casa
- **Reportado por Eugenio (2 cosas)**: la pantalla se quedaba EN NEGRO al abrir su PDF, y las casas eran diminutas al lado de los avatares.
- **PDF en negro, dos culpables**: (1) la CSP `default-src 'none'` que `/uploads` ponía a TODO bloqueaba el embed interno del visor de PDF de Chrome — los PDF van ahora sin esa cabecera (siguen con nosniff; el resto de archivos la conservan); (2) aunque la cabecera esté bien, el visor nativo dentro de un iframe es una lotería (en móvil ni existe). Solución de fondo: **visor PROPIO con PDF.js** (`VisorPdf.tsx`, lazy: solo se descarga al abrir un PDF) — cada página pintada en canvas, nítido en retina, tope 50 páginas, y si algo falla un aviso con el botón de abrir fuera. Verificado con la póliza real de Eugenio: se lee dentro del juego incluso en un navegador SIN visor de PDF.
- **Casas al doble** (petición de Eugenio): medidas en la escena, la casa entera medía 2,67 m frente a un avatar de 1,86 m. Escala 3,2 → 6,4 (~5,3 m, dos plantas creíbles) en la aldea y en las casas creadas por el jugador; radio de choque 4,4 → 7; el mapa 2D pinta su cuadrado a 10×10 m para no mentir. Verificado paseando entre ellas.
- pdfjs-dist entra como dependencia (npm install con --legacy-peer-deps por el conflicto viejo de react-simple-maps con React 19).

### 2026-08-18 — Salir de la plaza con un clic, y renombrar/quitar portales desde su diálogo
- **Reportado por Eugenio**: pinchar en «Salir a la aldea» dentro de una plaza no hacía nada (solo salía chocando con el portal). El portal de salida era decoración: ahora va envuelto en `Interactivo` con blanco invisible generoso — clic = salir (`onSalir` nuevo en PlazaProyecto → `onSalirProyecto` en Escena → `salirDelProyecto`). El choque sigue funcionando igual. Verificado: entrar al portal del distrito, clic en la espiral de salida, de vuelta en la aldea.
- **Petición de Eugenio**: el diálogo de un portal debía tener también eliminar y cambiar de nombre. En el panel del proyecto del DISTRITO: «Cambiar el nombre» (edita el título REAL del proyecto por PUT /api/proyectos/:id — el permiso lo comprueba el servidor) y «Quitar el portal del mapa» (retoque `proy:<id>` con `eliminado`; el proyecto NO se borra y el panel lo avisa). En la FICHA del portal construido en el juego: lápiz junto al nombre (PUT del agente; la papelera de quitar ya existía). El lápiz sirve también para renombrar personas.
- `posicionesProyectos()` devuelve ahora `eliminado` y lo respetan dibujo, medidas de cercanía, obstáculos y mapa 2D — las posiciones se calculan por índice ANTES de filtrar para que quitar un portal no recoloque a los demás. Reversible: PUT del retoque con eliminado:false lo devuelve (comprobado en la verificación, todo lo de Eugenio restaurado).

### 2026-08-18 — El camión camperizado 4x4, aparcado en la aldea
- **Petición de Eugenio (con foto de referencia)**: un camión camperizado 3D con máximo detalle, en el mapa. `Camper.tsx`: modelo procedural inspirado en su foto (Iveco de expedición) — cabina bronce con capó de lámina negra, calandra con lamas y faros, parachoques negro con cabrestante, gancho y quitamiedos plateado, matrícula, retrovisores, estribos, baca de cabina con barra LED y travesaños LIMA, antena; célula marrón con cantos y línea de techo negros, 4 ventanas enmarcadas, trampilla lateral, puerta trasera, escalera, pilotos rojos, faldones con cofres; techo con panel solar sobre soportes, claraboya y baca trasera lima; ruedas de taco con banda blanca y llanta. Sin descargas: geometría pura, carga instantánea.
- **Aparcado junto al camino del este** (x 20, z 7,5): pieza del pueblo con identidad (`camper:0` en piezasAldea, radio 4) — chocas con él, lo pulsas («Camión camperizado»: Mover/Girar/Eliminar) y se recoloca como cualquier pieza. Cazado al integrarlo: el ensamblado de Aldea dibuja una LISTA FIJA de tipos y el camper no estaba — el tipo nuevo hay que añadirlo también ahí, no solo en piezasAldea (y a 26,9 pisaba la primera casa del anillo con la escala nueva).
- Durante la verificación un clic de prueba plantó una nota vacía sin querer; archivada — los 5 objetos de Eugenio quedan exactos.

### 2026-08-18 — Convertir un objeto o una persona en un PORTAL con su propio mapa
- **Petición de Eugenio**: que cualquier objeto o persona pueda convertirse en un portal que lleva a un mapa nuevo. Por debajo el mapa nuevo es un PROYECTO real de la plataforma (el pilar del builder: lo del juego existe fuera), así que la plaza nueva se edita y ancla con proyecto_id como cualquier otra, y aparece en la página de Proyectos.
- **Dos rutas nuevas en juego.ts**: `POST /api/juego/mundo/:id/convertir-en-portal` (objeto → nace un agente-portal con su nombre en su mismo sitio y el objeto se archiva, recuperable; si el nombre parece una URL se usa un genérico por tipo) y `POST /api/juego/agentes/:id/convertir-en-portal` (persona → mismo agente pasa a tipo `proyecto` con proyecto nuevo; su apariencia queda guardada por si se quiere deshacer). Helper compartido `crearProyectoDePortal`.
- **Dos botones**: en la ficha del objeto, «Portal» en verde junto a Conectar (solo conocimiento, no props de decorado); en la ficha de una persona, «Convertir en portal con su propio mapa» con confirmación en dos pasos (es un cambio grande: el muñeco deja de verse).
- Verificado de punta a punta con una persona y una nota DE PRUEBA: ambas se convirtieron, los dos portales aparecieron en la plaza y entrar en uno llevó a su mapa nuevo vacío. Todo lo de prueba limpiado después (agentes archivados, proyectos borrados de la BD local); Anita, Javier y los 5 objetos de Eugenio intactos.
- Nota: la BD local de esta máquina es un Postgres nativo en 5432 (`evolucion_humanidad`, usuario del sistema), no el Docker del CLAUDE.md.

### 2026-08-19 — Portales con FORMA propia: cualquier cosa puede ser un portal sin dejar de ser lo que es
- **Aclaración de Eugenio sobre la conversión**: convertir en portal NO cambia la forma. El camión sigue siendo el camión, la persona sigue siendo su muñeco — solo ganan su nombre flotando en verde con «◈ portal ◈» debajo, un aro de luz girando en el suelo (`SenalDePortal` en Senales.tsx) y la capacidad: ATRAVESARLOS te lleva a su mapa.
- **Migración 0036**: `portal_proyecto_id` en `game_world_items` y `game_world_overrides` (las personas reutilizan `game_agents.proyecto_id`, que ya existía). Tres rutas: convertir un objeto, una pieza del pueblo (POST /mundo/semilla/convertir-en-portal — registrada ANTES de /mundo/:id/…: «semilla» encaja en `:id`, la trampa conocida volvió a morder) o una persona (ahora sin tocar su tipo). El mapa nuevo sigue siendo un proyecto real.
- **Choque = entrar**: los portales con forma llevan ids `portalitem:`/`portalpieza:` en obstáculos (el prefijo `deco:` silencia el aviso en Personaje) y una persona con proyecto_id también entra al chocar. Botón «Portal» en la ficha de objetos Y de piezas del pueblo (si ya lo es, «Entrar»); en la ficha de persona, un solo paso (ya no es destructivo) y «Entrar en su mapa».
- **Sin puertas duplicadas**: un proyecto ya representado por un portal con forma no pinta su espiral verde en el distrito ni en el mapa 2D (`ocultos` en posicionesProyectos, reutilizando el mecanismo `eliminado` que conserva posiciones). Esto también quita el duplicado histórico del agente «Inversiones». `cargarProyectos` ya no recorta a 12 (el distrito recorta por su cuenta).
- Verificado con el CAMIÓN (el ejemplo de Eugenio): conserva su forma con el rótulo verde encima, y chocar con él te mete en su mapa. Decisión: su portal quedó enlazado al proyecto REAL «Camión camperizado» (no a un mapa nuevo duplicado); el proyecto de prueba se borró.
- Deuda anotada: no hay botón «dejar de ser portal» (deshacer = tocar la BD), y convertir siempre crea un mapa NUEVO — elegir un proyecto existente como destino sería la siguiente pasada.

### 2026-08-19 — La gran pantalla se mueve, y por dentro es el CINE del agente de YouTube
- **Petición de Eugenio (2 cosas)**: que el cine de YouTube se mueva como cualquier objeto, y que dentro haya un agente de YouTube que recomiende vídeos sobre las temáticas de los portales, ordenados en 3D por categorías con miniatura y tema.
- **La pantalla es ahora la pieza `pantalla:0`** (piezasAldea): se arrastra y su posición persiste como la de una casa (verificado con arrastre real: el retoque guardó (33.5,-15.2); restaurada a fábrica tras la prueba). Su marcador del mapa 2D la sigue. `PantallaVisual` separado para el fantasma del arrastre; el obstáculo especial deco:pantalla desaparece (la pieza choca sola). Clic = ENTRAR al cine; pinchar sin soltar = mover.
- **El cine por dentro** (`Cine.tsx`): sala oscura con aro rojo, el AGENTE DE YOUTUBE (robot rojo con pantalla-cara y play; pulsar = recargar recomendaciones), y las categorías EN ARCO alrededor: cada portal/proyecto es una temática con su rótulo en color y sus vídeos en rejilla — tarjeta con miniatura real (i.ytimg, con el truco de la `key` para el material que nace sin mapa, como Imagen3D), título y canal; pulsar la tarjeta abre el vídeo en la ventana interna. Portal verde de salida (chocar o pulsar) que te deja junto a la pantalla.
- **Backend**: el cálculo de recomendaciones se extrae a `calcularRecs()` (compartido) y nace `GET /api/youtube/cine`: agrupa los vídeos por el proyecto con el que casaron (`relacionadoCon`) + una categoría «Novedades»; sin cuenta conectada devuelve `sin_conexion` (la sala lo explica y abre el panel con el botón de conectar); `?demo=1` solo fuera de producción enseña una sala de muestra (así se verificó la disposición sin claves de Google).
- Cazado en pruebas: la entrada aparecía sobre el portal de salida (misma trampa que la plaza → spawn a z 6) y dos categorías con el mismo nombre («Inversiones» ×2) rompían las keys de React → key con índice.
- Nota: en el mundo de Eugenio ya hay un portal hecho por él (su imagen «Aptera light humanity.png») — la conversión en portales la está usando de verdad.

### 2026-08-19 — La ficha de cada tarea es un LIENZO 2D: hover, clic o choque para abrirla
- **Petición de Eugenio**: que las fichas flotantes de las tareas de un proyecto se expandan al pasar el ratón, que al pinchar o al chocarte con ellas se abra una ventana central, y que dentro se pueda cambiar el nombre, el proyecto, el estado y añadir fotos, enlaces, vídeos y notas en un lienzo 2D.
- **En la plaza**: `cosasDePlaza()` (Interior.tsx) es ahora la única fuente de posiciones del anillo de tarjetas — la usan el dibujo Y los obstáculos de Escena, así que chocar con una tarjeta (`tarjeta:<id>`) abre su ficha igual que pincharla. Hover = la tarjeta crece (×1,45) con el letrero «Pulsa para abrir la ficha».
- **La ficha central (`FichaTarea` en JuegoVital.tsx)**: nombre editable en la cabecera, selector de proyecto (mover la tarjeta de proyecto — con comprobación de permisos en el backend), chips de estado (Por hacer / En curso / Hecho), y el LIENZO cuadriculado: +Nota (post-it amarillo), +Foto (sube a /api/uploads), +Enlace (píldora con el dominio) y +Vídeo (miniatura real de YouTube). Todo se arrastra y las posiciones x,y se guardan en los `bloques` jsonb de roadmap_items; los bloques `agente` existentes se conservan intactos.
- **Backend** (roadmap.ts): el PUT acepta `proyecto_id` con `puedeEditarProyecto` sobre el destino — mover una tarjeta a un proyecto ajeno da 403.
- Cazado en pruebas: los bloques no se podían arrastrar — la nota es toda un `textarea` y el enlace todo un `<a>`, y el arrastre ignora esos elementos para no pisar la edición. Arreglo: un ASA con puntitos encima de cada bloque desde donde tirar.
- Verificado de punta a punta con una tarjeta DE PRUEBA en el juego real: choque abre la ficha, hover expande, clic abre, estado a «En curso» pinta la tarjeta 3D, renombrar actualiza el rótulo 3D, los 4 tipos de bloque se crean y persisten, el arrastre guarda (100,80)→(408,281), y mover a otro proyecto cierra la ficha con aviso y la tarjeta desaparece de la plaza conservando sus bloques. Tarjeta y foto de prueba borradas después; el mundo de Eugenio intacto.
- Deuda menor: el contador «X de Y tareas» del cartel de la plaza no se refresca al mover una tarjeta hasta volver a entrar.

### 2026-08-19 — Realismo, fase 0: luz de cine, cielo real y calidad automática
- **Arranca el plan de realismo por fases** que Eugenio aprobó (personas «realistas de videojuego», ordenador primero): fase 0 = la luz. Es el cambio que más se nota por esfuerzo: mismo mundo, iluminación de verdad.
- **Cielo HDRI real (CC0, autoalojado)**: `public/modelos-juego/cielo/dia_despejado_1k.hdr` (Poly Haven, 1,1 MB, licencia registrada en LICENSE.md) baña la escena como luz ambiental — reflejos y rebotes creíbles. Las luces planas de antes bajan de intensidad para dejarle sitio.
- **Efectos de imagen** (`Efectos.tsx`, librería @react-three/postprocessing + peer postprocessing): oclusión ambiental N8AO (el sombreado de contacto que asienta los objetos), bloom con umbral 1.05 (solo brilla lo que se sale del rango: el aro de los portales ahora RESPLANDECE de verdad, PortalVerde multiplica su color ×1.9), curva ACES como efecto final (el composer apaga el tone mapping del renderer — cazado en pruebas con toneMapping=0), viñeta suave y SMAA.
- **Calidad automática** (`calidad.ts`): alta/media/baja según aparato (móvil, núcleos, memoria), con `?calidad=` para forzar (queda guardado). Ajustes por nivel en un solo sitio: densidad de píxeles, lado del mapa de sombras (4096/2048/1024), efectos sí/no, AO solo en alta. `VigilanteDeCalidad` (PerformanceMonitor con 6 s de gracia: el pico de carga inicial no cuenta) baja un escalón si los FPS caen de verdad; nunca sube solo.
- **Sombras**: en este three el PCFSoft clásico está RETIRADO (el renderer lo degrada solo a PCF avisando) — se pide `shadows="percentage"` y el borde suave lo pone `shadow-radius=4`; cámara de sombras más ceñida (±48) y normalBias 0.03. La luz lleva `key` por nivel: three no reconstruye el mapa de sombras al cambiarle el tamaño.
- Verificado en local: aldea y plaza interior con la luz nueva, consola limpia, portal de salida de la plaza funcionando; en el panel embebido la calidad alta va a ~40 FPS y el vigilante la baja a media (~60 FPS) — el sistema haciendo su trabajo.
- Deuda menor: el cine no se verificó visualmente en esta tanda (mismo Canvas; su intensidad de ambiente baja a 0.22).

### 2026-08-19 — Realismo, fase 1: el suelo es de verdad (cada adoquín, cada piedra)
- **Texturas fotográficas PBR** (CC0, ambientCG; ~12 MB tras recomprimir): hierba, tierra, grava, adoquín y madera, cada una con su relieve (normal) y su rugosidad, cargadas por `texturas.ts` (caché: misma foto+repetición = una sola subida a GPU). La plaza de la aldea Y la de cada proyecto quedan adoquinadas de verdad; los caminos son grava piedra a piedra (repetición calculada del tamaño de cada tramo); el puente tiene vetas de madera reales.
- **Agua viva** (`Agua.tsx`): un material compartido para río, lagos y fuente — mapa de olas (MIT, three.js) desplazándose con el tiempo sobre un material casi espejo que refleja el cielo HDRI de la fase 0. El río corre más deprisa que los lagos.
- **Hierba 3D** (`Hierba.tsx`): miles de matas de tres hojas en UNA malla instanciada, mecidas por el viento desde el shader (fase por posición, balanceo con el cuadrado de la altura). Cantidad por calidad (45.000/16.000/3.000). Solo nacen donde tiene sentido (`hierbaPermitida`): ni plaza, ni caminos, ni río, ni lagos; con sesgo de densidad hacia el pueblo.
- La cinta del río ganó UVs (no tenía: las texturas no se podían mapear).
- Verificado en local paseando: plaza adoquinada, caminos de grava, río con puente de madera y agua reflejando, hierba meciéndose — 60 FPS en calidad media en el panel embebido.

### 2026-08-19 — Realismo, fases 2 y 3: vegetación y edificios con materiales de foto
- **Fase 2 (vegetación)**: los ~1.100 árboles instanciados visten CORTEZA fotográfica en el tronco (9 caras, más redondo) y FOLLAJE real en las copas — las frondosas ya no son icosaedros: esferas ABOLLADAS con deformación determinista por posición (misma costura, misma geometría compartida). Arbustos con el mismo follaje y tinte variado; rocas irregulares (dodecaedro subdividido + abolladura) con piedra fotográfica — la primera (Rock035, pizarra) salía casi negra y se cambió por granito claro (Rock051).
- **Fase 3 (edificios)**: nace `CasaReal.tsx` — zócalo de piedra, muros revocados (tinte por variante), tejado a dos aguas de TEJA árabe con caballete y alero, hastiales, chimenea de ladrillo visto, puerta de madera con pomo y 6 ventanas con marco blanco y cristal que refleja el cielo. Sustituye a los GLTF estilizados en la aldea Y en las casas que planta el jugador (PropMundo), misma huella (radio 7). Naves con chapa metálica real; fuente de piedra; banco/puesto/carro de madera real; pozo de piedra con tejadillo de teja; huertos de tierra real (Detalles.tsx).
- Descubrimiento al verificar: Eugenio ELIMINÓ 12 de las 14 casas del anillo en su mundo (overrides `eliminado`) y conserva 2 movidas por él — las dos son ya CasaReal. Sus datos, su diseño: no se toca nada.
- 7 texturas nuevas CC0 (ambientCG, licencias registradas): corteza, follaje, roca, teja, revoco, ladrillo, chapa. Total de texturas del juego ~21 MB.
- Verificado en local: bosque con troncos de corteza y rocas de granito, arbustos musgosos, casa nueva renderizando con sus ventanas, 60 FPS estables en el panel embebido.

### 2026-08-19 — Realismo, fase 4: personas con proporciones humanas REALES
- **Cuerpos**: Universal Base Characters de Quaternius (CC0) — humano masculino y femenino de 1,81 m con traje, pelo y ojos como materiales separados. **Animaciones**: Universal Animation Library de Quaternius (CC0, 43 pistas) — mismo esqueleto (huesos estilo Unreal), así que las pistas del maniquí mueven directamente a los personajes por nombre de hueso. Descargadas de itch.io por el flujo anónimo (curl: download_url → página → file/<id> → CDN).
- **Persona3D reescrito** (Modelos.tsx): los 10 fenotipos Kenney antiguos se reparten entre los dos cuerpos reales (nombres con «female» → femenino; el hash de cuerpoDe no cambia, nadie cambia de género por sorpresa). Traducción de animaciones del juego a pistas UAL (idle→Idle_Loop, walk→Walk_Loop, sprint→Sprint_Loop, sit→Sitting_Idle_Loop…) con Idle_Loop de reserva. Escala normalizada: la semántica antigua (2,6 = estatura normal) se conserva dividiendo — los tres puntos de uso (Personaje, Agentes, Interior) no cambian ni una línea.
- **Personalización adaptada**: el color de piel elegido decide entre la textura clara y la oscura (por luminancia, umbral 0,42); el color de pelo tiñe el material del pelo. DEUDA: el color de ropa/pantalón ya no aplica (el traje es una sola textura con la piel; teñirlo pediría una máscara de zonas) — anotar en 02_TECH_DEBT.
- El repintado de paleta Kenney (cargarPaleta/pintarTextura de aspecto.ts) queda sin uso desde Modelos; se conserva el módulo por si el builder lo referencia.
- ~22 MB de assets nuevos (modelos + texturas a 1024px + librería de animaciones).
- Verificado en local: Anita, Javier y el jugador son ya humanos de proporción real en pose natural; andar reproduce la zancada sin patinar (las pistas Standard son in-place); chocar con una persona sigue abriendo su ficha.

### 2026-08-19 — Personas VESTIDAS y cámara cercana (arreglo con captura de Eugenio)
- **Fallo reportado**: los cuerpos base de la fase 4 iban en ropa interior («¡están desnudos!»). Se integra el pack «Modular Character Outfits - Fantasy» de Quaternius (CC0): trajes completos de ALDEANO montados sobre el MISMO esqueleto universal. Al clonar cada persona, las prendas se re-atan hueso a hueso al esqueleto del cuerpo (`SkeletonUtils` + `THREE.Skeleton` con los huesos del cuerpo y los boneInverses de la prenda).
- **Dos trampas cazadas por el camino**: (1) el traje referencia texturas `T_Regular_*` (antebrazos remangados y manos) que no estaban copiadas — salían blancas; (2) lo gordo: los trajes están cortados para el cuerpo «Regular» y el pack gratuito solo trae el «Superhero» musculoso — la piel ATRAVESABA la tela y seguían pareciendo desnudos con correas. Arreglo de raíz en `soloCabeza()`: al cuerpo se le recortan los triángulos por debajo del cuello (queda cabeza+cuello, umbral 1,45 m hombre / 1,40 mujer) y el traje pone todo lo demás, manos con guantes incluidas. Recorte una vez por modelo, geometría compartida entre clones.
- El traje de EXPLORADOR (Ranger) se descartó como traje por defecto: va con el torso al aire. Sus .gltf quedan en la carpeta para un futuro selector de trajes.
- **La tela se tiñe con una paleta fija de 8 colores** (azul, oliva, teja, malva…) por hash del cuerpo: variedad entre vecinos y evita que el lino crudo parezca piel a lo lejos. El tinte con el color de ropa del creador (era Kenney) se probó y se retiró: los tonos carne/pastel dejaban la prenda color piel.
- **Cámara por defecto CERCA** (petición con captura): zoom inicial 0,5 (≈9 m, antes 18,6 m) y mínimo de rueda bajado de 0,6 a 0,3 para acercarse aún más.
- Verificado en local: jugador con chaleco/camisa/pantalón/botas por delante y por detrás; Anita y Javier con vestido y botas; andar y esprintar animan la ropa junto al cuerpo.

### 2026-08-19 — La cámara mira 20° más arriba (petición de Eugenio)
- El punto de mira de la cámara orbital se eleva `dist·tan(20°)` sobre el de antes: mismo ángulo extra a cualquier distancia de zoom. Se ve horizonte y cielo en vez de tanto suelo — el personaje queda abajo en el encuadre, estilo juego de aventuras.

### 2026-08-19 — Mejor caminar, bici de verdad y aeromóvil con piloto (petición de Eugenio)
- **A pie**: la marcha sale de la VELOCIDAD real, no de la tecla — paseo (Walk) hasta 4 m/s, trote (Jog) hasta 12, esprint de ahí en adelante, y en el aire la animación de SALTO (Jump_Loop). Además la CADENCIA se acompasa a los m/s de verdad: `ritmo` va por ref y Persona3D ajusta el timeScale de la pista cada fotograma (nada de pies patinando ni zancadas de marioneta).
- **Bici**: el personaje va SENTADO en el sillín con la postura de conducir (Driving_Loop, manos al manillar), ya no de pie sobre los pedales. Ruedas nuevas con neumático (toro), RADIOS y buje que giran exactamente lo que dicta el suelo (v/r rad/s), y BIELAS con pedales y plato girando a cadencia de desarrollo normal (~1 vuelta por cada 2,6 de rueda).
- **Aeromóvil**: el PILOTO va visible dentro de la burbuja (a 0,42 quedaba sentado ENCIMA del fuselaje — cazado en pruebas, bajado a 0,10), la cabina es más transparente (opacidad 0,38 con reflejo del cielo), la nave ALABEA al girar con A/D en vuelo (escora 0,26 rad hacia el lado del giro) y FLOTA con un vaivén suave de hover.
- Verificado en local: paseo/trote/esprint en la plaza, bici rodando con radios girando hasta la casa nueva, y despegue a 28 m con alas en V, rotores y piloto dentro.

### 2026-08-19 — Pulido de CARAS: peinados, piel a 2K y ojos con brillo
- **El fallo de base**: los cuerpos base van CALVOS (solo cejas) — media cara faltaba. Ahora cada persona recibe un peinado del pack (6 disponibles: rapado, raya al lado, melena, moños, rapado femenino y barba), elegido por el hash de su cuerpo: los hombres pueden llevar barba, las mujeres melena o moños. Se enganchan al esqueleto igual que la ropa (re-atado hueso a hueso) y el color de pelo del creador los tiñe.
- **Piel a 2048px**: las cuatro texturas de piel volvieron a su resolución original (se habían quedado a 1024 en la compresión de la fase 4); la cara se ve nítida de cerca.
- **Ojos con brillo**: rugosidad 0,12 y reflejo del entorno — antes eran dos discos mates y la mirada se apagaba.
- Cazado en pruebas: añadir las mallas del pelo DENTRO del `traverse` del propio árbol lo mutaba mientras se recorría y tumbaba el contexto WebGL (pantalla en blanco, «Context Lost»). Se recolectan primero y se mueven después, igual que ya se hacía con las prendas.

### 2026-08-19 — Fase 7: el ficus del centro, seis sendas temáticas y un bosque comestible ibérico
- **EL FICUS CON SU ESTANQUE** (`Ficus.tsx`): el corazón de la aldea. Bajo y anchísimo como un ficus de verdad (6,8 m de alto por 7,2 m de copa), con cuatro cosas que lo hacen creíble: raíces TABULARES que ensanchan el pie, 66 ramas RECURSIVAS (tronco → 5 madres → 3 hijas → 3 nietas), raíces AÉREAS colgando y una copa de 135 racimos en capas (no una bola: se ve luz entre el follaje). Alrededor, un estanque con brocal de piedra, islote de tierra, nenúfares y el agua con olas de la fase 1. Todo instanciado: 4 llamadas de dibujo. La fuente vieja se muda a su plaza del agua.
- **SEIS SENDAS RADIALES** (`mapa.ts` → `SENDAS`, `Sendas.tsx`): cada 60°, empedradas, cada una con su CARTEL de madera a la salida de la plaza (nombre del área y qué encuentras, legible por las dos caras) y su PLAZA SECUNDARIA al final, con su propio corazón: pérgola con parra (huerto), estanque (agua), yunque (talleres), corro de bancos con hoguera (encuentro), atril de lectura (saber) e hito de piedra (proyectos). El minimapa dibuja lo mismo, con el color de cada tema.
- **BOSQUE COMESTIBLE IBÉRICO** (`comestibles.ts` + `BosqueComestible.tsx`): **48 especies reales** de la península con su nombre científico, porte, altura, color de hoja, color de fruto y qué da — de nogal, castaño, encina y pino piñonero a zarzamora, arándano, alcaparra, romero y tomillo. Se siembran a los dos lados de las seis sendas en TRES ESTRATOS como en agricultura sintrópica (aromáticas al borde, frutales en medio, árboles grandes al fondo), repartiendo las especies en ronda para que salgan todas. Con frutos visibles y manchas de flores para polinizadores. ~600 plantas en 11 mallas instanciadas.
- `enCamino()` es ahora la única fuente de «aquí no se planta»: la usan el suelo libre de los árboles, la hierba y la siembra comestible.
- Cazado en pruebas: (1) el bosque nacía pegado a la plaza y aparecías DENTRO de un arbusto sin ver el ficus → claro de 24 m alrededor del centro y aparición dentro de la plaza mirando al árbol; (2) las raíces aéreas del ficus llegaban todas al suelo y parecían los barrotes de una jaula → ahora solo una de cada cuatro baja del todo, y son más finas.
- Verificado en local: ficus con su estanque, sendas con carteles, frutos de colores en el bosque, 60 FPS.

### 2026-08-19 — Fase 8: la aldea viva (día/noche con TU hora, bichos y el nombre de cada planta)
- **CICLO DÍA/NOCHE CON LA HORA REAL** (`Vida.tsx` → `cieloDeLaHora`): no hay reloj de juego — si en tu casa son las nueve de la noche, en la aldea está anocheciendo. Amanece a las 7 y anochece a las 21 (día medio peninsular). El sol se mueve por el cielo (`Sky` recibe su posición real), cambia de color (naranja bajo, blanco alto, azul de luna de noche), y la niebla y el fondo le siguen; de noche la lejanía se cierra de 780 a 420 m. Se recalcula cada medio segundo, no cada fotograma.
- **LAS FAROLAS SE ENCIENDEN** de noche (intensidad 0,8 → 9 y alcance 9 → 18 m, con el cristal emitiendo): de día son adorno.
- **BICHOS** (`Bichos`): 150 en una malla instanciada, cada uno rondando SU planta del bosque comestible. De día son mariposas y abejas doradas; de noche, luciérnagas que laten y resplandecen con el bloom de la fase 0.
- **EL NOMBRE DE LO QUE TIENES AL LADO** (`RotuloComestible`): al acercarte a menos de 3,6 m de cualquier planta del bosque, aparece su nombre común, su nombre científico y qué da («Cerezas en junio», «Escaramujos, vitamina C»). Un bosque comestible que no te dice qué es cada cosa no enseña nada.
- Cazado en pruebas (a las 3 de la mañana, de verdad): la noche con luna a 0,22 era una pared negra y no se podía jugar → luna a 0,6 y ambiente a 0,3.

### 2026-08-19 — Fase 9: 45 objetos nuevos de ciudad y bosque
- **`Objetos.tsx`**: 45 objetos procedurales en alta calidad, todos con las texturas fotográficas de las fases 1-3 y en escala real.
  - **Ciudad (24)**: papelera, semáforo, señal de stop, señal informativa, marquesina de autobús (con cristal que refleja el cielo y banco corrido), quiosco, hidrante, tres contenedores de reciclaje, jardinera con plantas, fuente de beber (con agua animada), bolardo, muro de piedra, cerca de madera, escalinata, torre de agua, panel solar, bicicletero, buzón, reloj de calle de dos caras, estatua de bronce sobre pedestal, mesa de picnic y columpio.
  - **Bosque y huerto (21)**: tronco caído con musgo, tocón, corro de setas, helecho, cañas, matorral, peñasco, charca con agua y piedras, pasarela de tablas con barandilla, hoguera encendida (con su luz), tienda de campaña, colmena, pila de leña, espantapájaros con sombrero, bancal de hortalizas, compostera, gallinero, invernadero de cristal con bancadas, molino de viento de seis palas, depósito de agua, comedero de pájaros y pasaderas de piedra.
- **El panel «Crear aquí» se agrupa por familias** (Del pueblo · Ciudad · Bosque y huerto) con scroll: en una rejilla plana de 54 iconos no se encontraba nada.
- Cada objeto trae su radio de choque en `RADIOS_OBJETO` (las setas y las pasaderas se pisan; el invernadero y el muro, no) y `radioProp` lo consulta primero.
- El nombre de un objeto plantado sale ahora del CATÁLOGO: había una lista aparte con 9 nombres y todo lo nuevo se llamaba «Objeto» (cazado al plantar un quiosco de prueba, borrado después).

### 2026-08-19 — Fase 10: el dinero del juego (recursos, objetivos y presupuesto de cada proyecto)
- **CONTADOR PERMANENTE ESTILO GTA** (`Finanzas.tsx` → `HudDinero`): debajo del minimapa, siempre a la vista, tu dinero total y lo que te queda cada mes (verde si sobra, rojo si falta). Un clic abre el panel.
- **Migración `0037_finanzas.sql`**, tres tablas:
  - `game_finanzas` — lo que TIENES: efectivo, banco, ingresos y gastos del mes, moneda. Una fila por persona, y nadie ve la de otro.
  - `objetivos_financieros` — lo que QUIERES: ahorrar, comprar algo o llegar a un ingreso. Con cantidad, fecha límite, proyecto al que pertenece y nota.
  - `presupuestos_proyecto` — lo que CUESTA cada proyecto: una línea por concepto y año, marcada como gasto o ingreso.
- **`src/server/finanzas.ts`** (módulo nuevo, `server.ts` solo gana la línea de registro): GET/PUT de tus recursos, alta/edición/archivado de objetivos, alta/archivado de líneas de presupuesto y `GET /api/finanzas/resumen` con el cómputo de todos tus proyectos por año. Toda ruta comprueba la sesión; los objetivos se filtran por `user_id` y las líneas de presupuesto solo las toca quien creó el proyecto o un administrador. Se archiva (`archived_at`), no se borra.
- **Panel «Tus finanzas»** con tres pestañas:
  - *Lo que tengo* — editas efectivo, banco, ingresos y gastos; se ve el total y el saldo mensual.
  - *Mis objetivos* — barra de progreso por objetivo, con botones rápidos (+50, +100, +500, −50) para ir apuntando lo que ahorras sin tener que escribir.
  - *Presupuestos* — eliges un proyecto, añades líneas por año («2027 · furgoneta · 18.000 € · gasto») y arriba sale **el cómputo de TODO tu mundo año a año**, más el total.
- El resumen por año dice «pones 12.000 €» o «te sobran 5.000 €» con el desglose debajo: un ingreso mostrado como «−5.000 €» se leía al revés (cazado en pruebas).
- Los presupuestos cuelgan de los proyectos REALES del juego (tabla `proyectos`), así que lo que presupuestas aquí es lo mismo que ves como edificio en la aldea.
- Datos de prueba borrados después de verificar: el HUD arranca en 0 € hasta que Eugenio escriba sus cifras.

### 2026-08-19 — Fase 11: que entre rápido, que no se coma la memoria y que se vea en el móvil
- **LAS TEXTURAS DE LOS PERSONAJES PESABAN 28 MB Y AHORA PESAN 4,5**: eran PNG de 1K y 2K sin canal alfa real (comprobado uno a uno). Convertidas a JPEG (calidad 92 en los mapas de relieve, 85 en el resto) y las de 2K bajadas a 1K, que es de sobra para verlas en tercera persona. Los `.gltf` apuntan ya al `.jpg`. **La carpeta del juego pasa de 69 MB a 46 MB**: 23 MB menos la primera vez que entras.
- **PANTALLA DE CARGA DE VERDAD** (`Cargando.tsx`): un ficus dibujado, la barra con el porcentaje REAL (`useProgress` escucha al cargador de three.js), el número de piezas que faltan, qué se está cargando dicho en cristiano («las animaciones», «los adoquines de la plaza») y nueve consejos que van rotando para aprender a jugar mientras esperas. Antes era una línea de texto gris y parecía que la web se había colgado.
- **ELIGES LA HORA DE LA ALDEA** (botón del sol, a la derecha): Tu hora · Amanecer · Mediodía · Atardecer · Noche. El ciclo con tu reloj real sigue siendo lo de fábrica, pero si juegas de madrugada ya no estás obligado a ver la aldea a oscuras. La elección se recuerda.
- **EL SOL SE MOVÍA SOLO AL ANOCHECER**: la escena únicamente se enteraba del cambio noche/día, así que durante todo el día el sol se quedaba clavado donde estuviera al entrar. Ahora también avisa cuando la luz cambia lo bastante.
- **AL SALIR DEL JUEGO SE SUELTA LA MEMORIA DE VÍDEO** (`liberarTexturas`): ~40 MB que se quedaban ocupados hasta recargar la pestaña. Verificado que salir y volver a entrar reconstruye el mundo entero (641 mallas, 160 con textura).
- **MÓVIL**: (1) en una pantalla estrecha la cámara se echa hasta un 55% más atrás, en proporción a la forma de la pantalla — con la distancia del ordenador el ficus te tapaba la plaza entera; (2) la tarjeta «Juego Vital» se metía debajo de la barra de iconos de la izquierda y no se leía el título; (3) la pantalla de carga se salía del ancho y los botones se le montaban encima.

### 2026-08-19 — Cámara pegada, ficus pequeño con flores, árboles con su hoja, cielo de verdad y carga por oleadas
- **CÁMARA INMERSIVA** (petición de Eugenio: «que el zoom sea más próximo al personaje, así e incluso más»): el zoom de fábrica pasa de 0,5 a 0,32 —más cerca que en su captura— y el mínimo de 0,3 a 0,14, casi por encima del hombro. El tope de inclinación sube de 1,35 a 1,45 y baja a −0,45: **antes no se podía levantar la vista al cielo**, y ahora que hay cielo eso importa.
- **EL FICUS, CUATRO VECES MÁS PEQUEÑO** (`FICUS_ESCALA = 0.25`): de 6,4 m a 1,6 m. El esqueleto se sigue generando a tamaño natural y se encoge al colocarlo, así que no se pierde ni una rama. El estanque NO se encoge a la cuarta parte sino a 0,45 (4,1 m de agua): a la cuarta parte quedaba un charco en el que la copa no cabía. Su radio de choque baja de 5,2 a 2,4 m.
- **ANILLO DE FLORES** alrededor del brocal: 46 matas de seis especies de jardín mediterráneo (lavanda, geranio, caléndula, margarita, romero, clavel), ~450 piezas en tres mallas instanciadas, sobre un arriate de tierra.
- **CADA ESPECIE CON SU HOJA** (`hojaTipo` en las 49 comestibles): aguja, coriácea, lanceolada, ovalada, dentada, compuesta, palmeada, abanico o carnosa — los tipos botánicos reales. La copa se construye con un PERFIL distinto por tipo de hoja, así que el pino piñonero es una sombrilla, el castaño tiene el borde aserrado, el nogal es aireado y la palmera un penacho. Antes todos los frutales eran la misma bola con otro color.
- **FRUTOS A TAMAÑO REAL**: se dibujaban **×12**, así que una manzana medía un metro (se ve en la captura que mandó Eugenio). Ahora van a su tamaño de verdad y se compensa con 30-40 por árbol en vez de 10: la mancha de color se lee igual y de cerca son frutas, no globos.
- **TODOS LOS ÁRBOLES UN 33% MÁS PEQUEÑOS** (`MENGUA_ARBOLES = 0.67`, una sola línea): encogen a la vez la copa, el tronco, el choque, los bichos y el rótulo.
- **EL CIELO ERA UN FALLO, NO UN AJUSTE.** El `<Sky>` de drei venía con su cúpula a **450.000 m** y la cámara solo ve hasta 1.400: el cielo caía entero fuera de alcance y no se dibujaba nunca. Lo blanco de arriba no era cielo, era lienzo vacío — por eso salía igual de pálido a cualquier hora. Y aun corrigiendo la distancia, su modelo atmosférico (Preetham) devuelve luminancias tan altas que la curva de cine las aplasta a blanco: probados turbidez, rayleigh y exposición uno a uno, sin resultado.
  - **Cielo pintado a mano** (`Firmamento`): cúpula de 900 m con tres colores (cenit, horizonte y el oro del poniente) y `toneMapped={false}`, que es lo que hace que el color elegido sea el que se ve. Azul arriba, resplandor dorado derramándose por el horizonte hacia el sol y disco solar; el bloom sigue poniendo el halo.
  - **NUBES** (`Nubes`): cúmulos con su vientre gris repartidos por el valle y un banco bajo teñido de oro sobre el poniente. Textura CC0 **autoalojada**: drei se la baja de un CDN externo, lo que metía una petición fuera de humanity.wiki en cada partida.
  - **HORA DORADA de fábrica** (20:03, sol a 14°): esa altura importa porque la cámara mira casi horizontal — a 24° el oro se quedaba fuera de encuadre.
  - **La luz ya no se apaga con el sol bajo**: el suelo de intensidad sube de 0,55 a 1,15 y el de luz rebotada de 0,25 a 0,52. Con la fórmula vieja la hora dorada salía en penumbra con los árboles negros, y una hora dorada no es un anochecer: lo cálido lo pone el color, no la falta de luz.
- **CARGA POR OLEADAS** (petición de Eugenio: «que no tarde tanto en cargar, con la técnica de los juegos grandes para no cargar todo si no hace falta»), en `Oleadas.tsx`:
  - **Se juega en 0,3 s.** Antes había que esperar a que estuviera TODO: las catorce casas, los seiscientos árboles, los cuarenta y cinco objetos, las seis plazas y los 7,6 MB de animaciones. Ahora se monta primero lo mínimo (suelo, plaza, luz, cámara y tu personaje), se pinta, y el resto entra en oleadas mientras ya estás andando. Cada oleada espera a que la anterior esté PINTADA y el navegador esté ocioso, así que ninguna congela la imagen.
  - Oleada 0 suelo y plaza · 1 el pueblo, la gente y los proyectos · 2 sendas, agua y hierba · 3 el bosque comestible, los bichos, las nubes y el color de cine.
  - **Cuerpo provisional**: mientras bajan las animaciones eres una silueta con el color de tu ropa y **puedes andar con ella**. Cada modelo lleva su propio Suspense: sin eso, un modelo que llega tarde tira abajo la escena entera y te devuelve a la pantalla de carga con el mundo ya montado detrás.
- Verificado en el navegador: cielo azul con nubes y poniente dorado, ficus pequeño con su estanque y sus flores, frutos a escala, y 0,3 s hasta el primer fotograma jugable.

### 2026-08-19 — Medir antes de quitar: los efectos no eran el problema, y 16 MB de descarga que sobraban
Eugenio pidió quitar efectos innecesarios para ganar velocidad, avisando de que quería los números antes. Se midieron, y el resultado cambió la decisión.

**LO QUE SE MIDIÓ** (en el Mac de Eugenio, forzando la resolución hasta que la GPU fuera el cuello de botella):
- Con todo activado, a resolución normal: **60 fps clavados**. Hubo que subir a **34,7 millones de píxeles** (16× su pantalla) para ver siquiera una diferencia, y ahí seguía a 50 fps.
- Apagando cada cosa a esa resolución absurda: nubes **0%**, frutos (6.590) **0%**, hierba (16.000) **0%**, bichos **0%**, **las cuatro a la vez 0%**. La decoración va instanciada: la tarjeta dibuja 16.000 matas con el mismo esfuerzo que una.
- Oclusión ambiental: **0,4 ms de 18** (2%). Va a media resolución.
- **Quitar los efectos de pantalla EMPEORA el rendimiento**: con el composer el suavizado de bordes lo hace un pase barato (SMAA) y se apaga el del navegador; sin composer se enciende el MSAA por hardware, que a alta resolución cuesta mucho más (55 fps con efectos, 9-11 sin ellos en la misma prueba).

**DECISIÓN DE EUGENIO con esos números:** no quitar ningún efecto; bajar la hierba y seguir con la carga.

- **Hierba en calidad alta: 45.000 → 15.000.** No gana fotogramas (medido), pero baja memoria y tiempo de construirla al entrar, que es lo que sí se nota. El suelo sigue cubierto.
- **EL TRAJE DE EXPLORADOR SE DESCARGABA SIN USARSE NUNCA.** `trajeDe()` devuelve siempre 'Peasant' desde que se vio que el Ranger va con el torso al aire, pero `precargarModelos()` seguía pidiendo `Male_Ranger` y `Female_Ranger`: **4,3 MB en cada visita** para nada. Ficheros borrados y el tipo de `trajeDe()` estrechado a `'Peasant'`, para que nadie pueda volver a pedir algo que no existe.
- **MAPAS DE RELIEVE Y RUGOSIDAD A 512** (el color se queda en 1024): 12,1 MB → 1,7 MB y 2,8 MB → 1,2 MB. Son texturas que se repiten 40×40 sobre el suelo; a esa escala la mitad de resolución no se distingue, comprobado en pantalla.
- **La carpeta del juego pasa de 46 MB a 30 MB.** Sumando lo de esta mañana (PNG → JPEG en los personajes), viene de 69 MB: **se ha quedado en menos de la mitad**.
- Verificado en el navegador: 58 ficheros, todos 200, ningún 404 tras borrar el Ranger, y el empedrado de la plaza igual de detallado.

### 2026-08-19 — El mapa 2D se maneja como un mapa, y los carteles son tuyos
- **ZOOM Y ARRASTRE EN EL MAPA GRANDE** (petición de Eugenio: «que el minimapa 2D se pueda hacer zoom y reordenar»). La rueda acerca **hacia donde apunta el ratón** (el punto bajo el cursor se queda quieto, como en cualquier mapa de verdad), arrastrar el fondo lo mueve, y hay cuatro botones: acercar, alejar, **centrar donde estás** y **ver todo**. El pie dice cuántos metros mide el lado de lo que ves. Mientras no toques nada sigue mandando el encuadre automático de siempre.
- **MODO «COLOCAR»**: un interruptor en la cabecera. Con él puesto,
  - salen **TODAS las piezas del pueblo** como marcadores (casas, naves, farolas, bancos, pozos, carros, carteles, el ficus…), no solo las personas y los proyectos — Eugenio pidió «todos» los elementos;
  - **arrastrar un marcador lo recoloca de verdad** en el mundo 3D: guarda por las mismas rutas que el editor de la aldea, así que no hay dos verdades;
  - cada marcador lleva una **✕ roja** que lo quita;
  - y el clic deja de teletransportarte, que estando colocando cosas era un salto en falso.
  Los 1.100 árboles del bosque quedan fuera de la lista: mil cien puntos no son un mapa.
- **LOS SEIS CARTELES DE LAS SENDAS SON PIEZAS DEL PUEBLO** (petición de Eugenio: «que su nombre se pueda editar y moverlos como el resto»). Al pasar a tener `seed_id` (`cartel:<senda>`) heredan gratis TODO el editor: arrastrar, girar, quitar y volver a poner. Ya no los dibuja `Sendas`, los dibuja el ensamblado de la aldea.
- **Migración `0038_cartel_texto.sql`**: columna `texto` en `game_world_overrides`. Al pulsar un cartel aparece un campo para llamarlo como quieras; **vaciarlo lo devuelve a su nombre de fábrica**.
- Cazado en pruebas: **mover un cartel le borraba el nombre.** El texto tiene tres casos y no dos —no viene el campo / viene vacío / viene con texto— y con un solo parámetro SQL «no viene» y «viene vacío» eran lo mismo. Ahora lo decide un `CASE`, y renombrar + mover + vaciar se comportan como deben (comprobado los tres).
- Verificado en el navegador: zoom de 270 m a 138 m de lado, las 28 piezas con su papelera en modo colocar, y un arrastre real guardando la posición nueva. Los datos de prueba, borrados: los 34 retoques de Eugenio siguen intactos.

### 2026-08-19 — Tus amigos tienen rutina: pasean por la plaza y se sientan en los bancos
Petición de Eugenio: «haz que las personas del juego que son los amigos se muevan como dando un paseo alrededor de la plaza o que se sienten en bancos». Hasta hoy Anita y Javier estaban CLAVADOS donde los plantaste, girando la cabeza.

- **`vidaSocial.ts`** (nuevo): la rutina de cada persona, separada del dibujo para poder leerla y cambiarla sin tocar el 3D. Un ciclo de ~2-3 minutos con cuatro tramos: paseo largo → sentarse → paseo corto → pararse a mirar.
- **La rutina es DETERMINISTA a partir del id** de cada persona: la misma persona hace siempre su mismo recorrido, a su ritmo, con su banco y su carril. No es aleatoria en cada visita — una aldea donde tus amigos aparecen cada vez en otro sitio no se siente como un sitio, se siente como un salvapantallas.
- **El paseo**: cada uno da la vuelta a la plaza por su propio carril (entre 12 y 19 m del centro), en su sentido y a su paso (0,85-1,25 m/s, que es andar de verdad). Van HACIA su punto, no saltan a él: si venían de sentarse o los has apartado, se reincorporan andando.
- **Sentarse**: cada persona tiene su banco asignado y se sienta a un lado del asiento (a 0,45 m, la altura real de la tabla en `Detalles.tsx`), mirando hacia donde mira el banco. Dos personas no comparten banco.
- **Se paran cuando te acercas** (5,5 m): giran a mirarte de frente y cambian a la animación de hablar. Si estaban sentadas, te hablan desde el banco sin levantarse. Perseguir a alguien que no deja de andar para poder hablarle es lo más molesto que hay.
- **Una persona convertida en PORTAL no se mueve**: su sitio lo manda el editor, y un portal que se va de paseo sería imposible de encontrar.
- **El bulto con el que chocas viaja con ellos** (`POS_VIVAS`): si no, te estrellabas contra el aire donde estaba tu amigo hace un rato, y el «Hablar con…» saltaba en el sitio equivocado.
- Verificado en el navegador: Javier caminó hasta su banco y se sentó (altura 0,45); Anita se levantó y estaba a 23 m paseando por su carril; con el jugador al lado, las dos quietas y de frente.

### 2026-08-19 — Hoja y flor de verdad, el avión ya no vuela solo, y el mapa pide doble clic
- **CADA TIPO DE HOJA TIENE SU TELA** (`flora.ts`). Hasta hoy las ~600 plantas del bosque compartían UN material con la misma repetición: daba igual que un pino tenga acículas de dos centímetros y una higuera hojas de un palmo, la tela era idéntica. Ahora hay diez, una por tipo botánico, con su grano y su brillo: la acícula muy fina y mate (repetición 7×5), la hoja coriácea del naranjo cerosa y brillante (3,4×2,4 y rugosidad 0,52), la palmeada de la higuera grande y suelta (1,5×1,1), la palma con las fibras a lo largo (2,2×4,4). El relieve se nota más en la hoja grande y menos en la aguja, donde a esa escala solo sería ruido. **Medido en el navegador: 14 telas distintas donde antes había una.**
- **LAS FLORES YA NO SON BOLITAS.** Eran esferas de color plano, sin textura: de cerca, plastilina. Ahora son una flor de verdad —cinco pétalos y su botón— en una geometría de 15 triángulos, con el corazón teñido de cálido en los propios vértices, así que una flor rosa tiene el centro anaranjado sin gastar un material más. Siguen cabiendo todas en una malla instanciada (4.021 flores en tres mallas). Cada una mira a un lado y se ladea: un cantero donde todas miran al cielo a la vez parece impreso, no plantado.
- **La mata verde del arriate del ficus** lleva ahora la textura de follaje, no un verde plano.
- **EL AVIÓN YA NO AVANZA SOLO** (petición de Eugenio). Antes, en cuanto despegabas, salía disparado aunque no tocaras nada. Ahora W/adelante avanza y S frena, igual que a pie; la ALTURA se muda a la **barra espaciadora** (subir) y **Mayúsculas** (bajar), que volando no hacían otra cosa. Los botones de pantalla siguen igual. **Medido: 0 metros sin tocar nada, 29 metros en 2,5 s pulsando adelante.**
- **EL MENÚ DE CREAR PIDE DOBLE CLIC** (petición de Eugenio). Con un solo clic saltaba al intentar mover el mapa o al fallar un marcador por dos píxeles. Se usa el `dblclick` del navegador para el ratón —que es exacto— y un conteo a mano de 500 ms para el dedo, donde `dblclick` no es de fiar.
- Cazado midiendo: la ventana del conteo a mano estaba en 400 ms y un doble clic tranquilo de 400 ms justos se quedaba fuera por un pelo. Subida a 500, que es la del sistema.

### 2026-08-19 — Doble clic para las opciones, mantener pulsado para mover, y primera persona
- **DOBLE CLIC SOBRE UN PORTAL = SUS OPCIONES** (petición de Eugenio: «cuando haga doble clic en un objetivo, ya sea persona, portal u otro elemento, que se abra la ventana de opciones»). El clic simple sigue entrando en el proyecto, que es lo que más se hace; el doble abre mover, girar, portal y eliminar. Las personas y los objetos plantados ya abrían su ficha con un clic, así que ahí no cambia nada.
  - Para que el doble clic funcione **el clic simple tiene que esperar**: si entrara al proyecto al primero, el segundo caería ya dentro. `Interactivo` retrasa 260 ms la acción normal **solo cuando hay ventana de opciones**; todo lo demás sigue respondiendo al instante, sin un milisegundo de más.
- **EN EL MAPA 2D, MANTENER PULSADO MUEVE** (petición de Eugenio: «cuando hago click y mantengo pulsado un objeto, que me deje moverlo, y cuando hago un click que me lleve a ese portal»). Ya no hace falta entrar en el modo «Colocar»: aguantas 280 ms sobre cualquier cosa y se arrastra; sueltas antes y te lleva allí. El modo «Colocar» se queda para ver TODAS las piezas del pueblo a la vez y para las papeleras.
- **PRIMERA PERSONA** (botón nuevo en el menú de la derecha, junto a la bici y el planeador). La cámara se pone en tus ojos a 1,62 m, mira hacia donde miras y **tu cuerpo deja de dibujarse** — desde dentro solo verías el interior de tu propia cabeza. Sin interpolación de posición: cualquier retraso ahí se siente como mareo, porque el mundo se movería después que tú. La elección se recuerda entre partidas.
- **En el mapa, la gente sale donde está AHORA**, no donde la plantaste. Desde que pasean, su posición guardada es solo el punto de partida: viajar a Javier te llevaba a (0, 17) mientras él estaba sentado en (9,4, −7,3). Se lee al abrir el mapa, no cada fotograma.
- Verificado en el navegador: el doble clic abre «Aldea Regenerativa» con Mover/Girar/Portal/Eliminar sin entrar; el clic corto en el mapa viaja y el largo arrastra; y la cámara en primera persona a 1,62 m con el cuerpo fuera de escena.

### 2026-08-19 — ⌘V pega lo que sea, donde sea
- **PEGAR CON ⌘V EN LOS TRES SITIOS** (petición de Eugenio: «que haga ⌘V y se pegue en el formato que sea, ya sea una imagen, un vídeo y se hace embed, un archivo pdf, etc.» y «quiero que el ⌘V funcione en el Mapa 3D»). Copias algo y lo pegas: **en el lienzo** (grafos y Mi Conocimiento) nace la ventana que le toca, **en un documento** nace el bloque, y **en el Mapa 3D** el objeto se planta delante de ti con su forma — la foto en su marco, el vídeo en su pantalla, el PDF en su atril, la canción en su altavoz.
- **Un solo sitio decide qué es cada cosa**: `src/utils/pegado.ts`. Antes cada pantalla tenía su propia tabla de formatos, así que el mismo PDF daba resultados distintos según dónde lo soltases. Ahora los tres preguntan al mismo módulo, y el mismo camino sirve para pegar y para arrastrar.
- **Lo que reconoce**: imágenes, **vídeo subido** (MP4, WebM, MOV, M4V, OGV — nuevo, antes ni se aceptaba), audio, PDF, cualquier otro archivo, YouTube, **Vimeo** (nuevo), una URL de imagen o de vídeo suelta, y texto.
- **Un PDF ya no es un botón de descarga.** Se lee dentro de la página, en el visor del navegador — que corre aislado, sin acceso a la web ni a las cookies. Igual el audio: se escucha en el sitio. Dos tipos de ventana nuevos (`pdf`, `audio`) y la migración `0039` que los admite.
- **Copiar una imagen DESDE UNA WEB también funciona.** Chrome no pone el archivo en el portapapeles, pone el HTML del trozo copiado; sin leerlo, pegar una foto de una página daba una nota vacía.
- **En un documento, ⌘V funciona sin haber pinchado en ninguna línea.** Solo la línea activa es editable —así no se redibuja el documento entero en cada tecla—, y eso hacía que el pegado no llegara a ningún sitio si no habías hecho clic antes. Ahora lo que nadie atiende se añade al final.
- **En un documento, un enlace de YouTube se incrusta; uno normal sigue siendo un enlace.** Solo se convierte lo que es inequívocamente un medio: YouTube, Vimeo, o una URL acabada en `.mp4`, `.pdf`, `.jpg`…
- Nunca se le roba el ⌘V a un campo de texto: el chat del robot, los formularios y la propia línea que estás escribiendo siguen pegando texto.
- Tope del vídeo subido: 60 MB (unos 2 minutos de móvil a 1080p).
- Verificado en el navegador los tres sitios: en el lienzo los 7 casos (PNG, MP4, PDF, MP3, YouTube, Vimeo, URL de imagen); en un documento imagen + PDF incrustado + vídeo de YouTube reproduciéndose + texto; y en el Mapa 3D los 6 (imagen, documento, música, vídeo, enlace y nota) plantados delante del jugador.

### 2026-08-19 — Productos en el Mapa 3D + la DJI Power 1000 V2 en el Mercado
- **LA DJI POWER 1000 V2, EN EL MERCADO** (petición de Eugenio). Datos reales de la web oficial de DJI y precio de DJI Store Iberia (agosto 2026): 1024 Wh, batería LFP, 2600 W de salida continua, 0→80 % en 37 minutos, 26 dB, 14,2 kg, 4000 ciclos conservando más del 80 % de capacidad, ampliable a 11 264 Wh. **649 €**, garantía 2 años, 4 fotos.
  - **Las fotos se ENLAZAN al CDN de DJI, no se copian a nuestro servidor.** Son suyas; enlazarlas deja la propiedad donde está. Si esto llega a venderse de verdad hay que sustituirlas por fotos propias o con permiso de DJI — está escrito en la migración.
- **PRODUCTOS EN EL MAPA 3D**: un tipo de objeto nuevo, `producto`, que se planta desde el menú → «De la plataforma» → **Producto**, eligiendo de una lista del Mercado. Sale como una **VITRINA**: peana de luz, el objeto flotando y girando (una vuelta cada 14 s), y el nombre con el precio delante. Pulsarlo abre su ficha con la foto, el precio y el botón al Mercado.
- **El objeto 3D de la estación de energía**, escrito a mano con geometría: cuerpo, asa, panel frontal hundido, pantalla encendida con «1024Wh», dos tomas de corriente europeas, dos USB-C, dos USB-A, rejillas laterales y la tira de luz inferior. Son 14 mallas que el navegador construye en un fotograma — un modelo descargado pesaría megas y el juego ya va justo de carga.
- **Dos formas de dibujar un producto, y esa es toda la arquitectura**: si tiene un modelo escrito (`estacion-energia`) se construye en 3D; si no, se cae a su **foto de catálogo** sobre un panel flotante. Así se puede plantar CUALQUIER producto desde el primer día sin haberle modelado nada. Modelar a mano no escala; la foto sí.
- **La vitrina no copia el producto, apunta a él.** El precio y la foto viajan con el objeto desde el servidor (LEFT JOIN en `/api/juego/mundo`): si cambias el precio en el Mercado, cambia también en la aldea. Y si el producto se archiva, la vitrina lo dice en vez de quedar como un hueco invisible.
- Migración `0039` (ya desplegada) y **`0040`**: `producto` en los tipos de objeto, columna `producto_id` con clave foránea a `products`, y la ficha de la DJI.
- Verificado en el navegador: la vitrina plantada, girando, con «DJI Power 1000 V2 · 649 €» y su pantalla verde; el botón «Ver ficha» abriendo la ficha con la foto real de DJI; y el producto listado en el Mercado bajo la categoría «energia».

**Deuda anotada**: qué producto tiene modelo 3D vive en una tabla del código (`MODELO_3D_DE_PRODUCTO` en `JuegoVital.tsx`), no en la base de datos, porque el modelo ES código —una función que dibuja mallas— y hoy hay uno solo. Cuando haya diez, se convierte en una columna `modelo_3d` de `products`: unos 20 minutos entonces, contra una migración hoy para una única fila.

### 2026-08-19 — Doble clic para crear, primera persona con cuerpo, la Aptera aparcada y las tareas por dentro
- **EL MENÚ DE CREAR YA NO SALE AL PRIMER CLIC** (petición de Eugenio: «haz que solo aparezca cuando hago doble clic»). Pisar el suelo es lo que más se hace en el juego —andar, mirar, girar la cámara— y que eso abriera un menú lo convertía en un estorbo constante. **Soltar** lo que llevas en la mano sigue siendo de un solo clic: ya estabas en mitad de una acción.
- **PRIMERA PERSONA CON BRAZOS Y PIERNAS** (petición de Eugenio). Tu cuerpo se dibuja entero, con su animación de verdad, **sin cabeza ni pelo** — la cámara está dentro del cráneo y de ellos solo vería la cara interior. Es el truco de siempre en los juegos en primera persona.
  - **Lo que lo hacía invisible no era el cuerpo, era la cámara**: recortaba todo lo que tenía a menos de 50 cm, y tu pecho, tus brazos y tus piernas están justo ahí. En primera persona ese recorte baja a 15 cm; en tercera vuelve a 50, donde da más precisión en el horizonte.
  - Ojos a 1,70 (el modelo mide 1,81 y sus hombros están sobre 1,50: a 1,62 los hombros comían el tercio inferior de la pantalla). Y **el cuerpo gira con la vista**: sin eso, arrastrar el ratón te dejaba mirando de lado con las piernas torcidas.
- **TU APTERA, APARCADA** (petición de Eugenio: «hazme una réplica de mi vehículo volador y déjalo aparcado como el camión»). Es **el mismo componente que pilotas**, no una copia que se quedaría desfasada al retocar el vehículo, con las alas plegadas y los rotores quietos. Está al lado del camión y **es el portal de un proyecto nuevo, «Aptera», con 10 tareas pendientes** como punto de partida: para qué es, medidas del chasis, autonomía, los cuatro rotores, el panel solar, qué dice la ley, el primer vuelo, quién sabe de esto y cuánto cuesta llegar al prototipo.
- **CREAR TAREAS DENTRO DE UN PROYECTO, SIN SALIR DEL JUEGO** (petición de Eugenio: «no puedo crear nuevas tarjetas dentro del proyecto de forma visual»). Los **dos** gestos que eligió: un **pedestal «+»** que se ve sin que nadie te lo explique, y **doble clic en el suelo**, el mismo gesto que en la aldea. La tarea nace con la ficha ya abierta: crear y rellenar son un solo gesto en vez de dos pantallas.
- **Y a una tarea ya creada se le puede hacer todo desde dentro**: marcarla hecha, **cambiarla de habitación** (nuevo), cambiarle el título y el texto, y **borrarla** (nuevo — va a la papelera, no se destruye, con la confirmación en la propia ficha porque un `confirm()` del navegador no se ve a pantalla completa).
- **LAS TARJETAS SON MINI TABLEROS CON SU CONTENIDO DENTRO** (petición de Eugenio: «que las notas sean como boards con preview del contenido de dentro, como mini ventana»). Antes cada foto y cada nota de una tarjeta se soltaba como un objeto SUELTO flotando al lado: un proyecto con diez tarjetas con foto poblaba la plaza con veinte cosas sin saber cuál iba con cuál — y cada una era un obstáculo con el que chocabas por separado. Ahora la tarjeta enseña dentro su primera foto o su primer texto, dice «+N más» si lleva más, y pulsarla (o chocar con ella) la abre entera como hasta ahora.
- Migración `0041`: el proyecto Aptera, sus 10 tareas y la nave aparcada. Va condicionada a que exista el usuario, así que en una base limpia no hace nada en vez de reventar.
- Verificado en el navegador: un clic en el suelo no abre nada y el doble sí (con Aptera y Producto ya en el menú); las piernas y los brazos visibles en primera persona; y crear → marcar hecha → cambiar de habitación → renombrar → borrar, los cinco con respuesta 200.

### 2026-08-19 — La página de un producto, y el giro más lento
- **PULSAR UN PRODUCTO EN EL MAPA 3D ABRE SU PÁGINA** (petición de Eugenio: «que se abra una ventana como la de las tareas, como si fuese una nueva página, donde el admin de ese producto puede añadir información y reorganizarla en esa pizarra 2D: vídeos, fotos, botones de compra, productos relacionados…»). Es la **misma pizarra** que la ficha de una tarea: bloques sueltos que se arrastran y se guardan solos.
- **Seis tipos de bloque**: texto, foto (subida), vídeo de YouTube, enlace, **botón de compra** (grande y verde, con su texto y su destino) y **producto relacionado** (una tarjeta de otro producto del Mercado, que pide su precio al abrir — así el relacionado enseña el precio de HOY, no el del día que se puso).
- **Se abre en modo LECTURA aunque puedas editarla.** Editar se activa con un botón. Entrar directamente en modo edición hace que el primer clic mueva algo sin querer, y una landing es lo que enseñas a otros. Quien no es el dueño no ve ni asas ni botones.
- **La lógica se ha copiado, no el componente.** Una tarea y un producto comparten el gesto de arrastrar, pero no los tipos de bloque (una tarea no tiene botón de comprar) ni los permisos (una tarea es tuya; una landing es la cara pública de algo que se vende). Fusionarlos habría obligado a llenar el componente de condicionales por cada diferencia.
- **La landing de la DJI Power 1000 V2 viene montada** con esa lógica: 10 bloques con sus datos reales, sus fotos, el botón de compra a DJI Store Iberia y el enlace a la ficha oficial.
- Guardar es una ruta aparte (`PUT /api/products/:id/pizarra`) y no un campo más del alta de producto: se llama en cada arrastre, y meterla en el alta reescribiría precio, fotos y enlaces cada vez que alguien mueve una foto un centímetro. Solo la edita quien creó el producto, o un administrador.
- **EL GIRO ES MÁS LENTO Y MÁS PRECISO** (petición de Eugenio: «que vaya más despacio la cámara y el personaje, para que sea más preciso el giro»). El muñeco tardaba unas 8 centésimas en plantarse en el rumbo nuevo: con A/D era imposible apuntar a algo concreto, siempre te pasabas. Ahora tarda casi el doble (12 → 7), y **la cámara persigue aún más despacio** (3,2 → 1,9): si fuera igual de rápida, girar sería el mundo entero barriendo de golpe.
- Migración `0042`: la columna `bloques` de los productos, el dueño de la DJI y su landing.
- Verificado: la pizarra llega al juego con sus 10 bloques y sus 4 tipos, y guardar por la API la persiste y se puede restaurar.

### 2026-08-19 — El Escritorio: ventanas, navegador propio y la IA que lo ve
- **VENTANAS EN LA APP** (petición de Eugenio: «en una ventana el juego, en otra otra página de la app, y en otra el navegador propio»). Ruta nueva `/escritorio`: ventanas que se mueven, se cambian de tamaño, se minimizan, se maximizan (doble clic en su barra) y se cierran, con barra de tareas abajo y la distribución guardada entre visitas.
- **Cada ventana es un marco a una ruta de la app, NO el componente montado dentro.** Es lo que hace esto posible: el juego 3D vive en su propio contexto (su WebGL, su bucle, su teclado, sin pelearse con otra ventana), y **mover una ventana no vuelve a montar lo de dentro** — con componentes, cada re-render del escritorio reiniciaría la página. Cuesta una carga de la app por ventana (~200 ms); con tres o cuatro no se nota.
- **UN NAVEGADOR DE VERDAD DENTRO DE LA APP.** Barra de direcciones (escribe una web o busca), atrás, adelante y recargar.
  - **La pared, dicha de frente**: un `<iframe>` no puede abrir la mayoría de webs. Google, Amazon y casi cualquier sitio grande mandan `X-Frame-Options: DENY`, y el navegador se niega a pintarlos dentro de otra página. No es un fallo nuestro: es una defensa contra el clickjacking y funciona. **La salida es traer la página por el servidor**, quitarle esas cabeceras y reescribir todos sus enlaces para que sigan pasando por nosotros. Eso es `src/server/navegador.ts`.
  - **La IA VE la página**: `/api/navegador/leer` devuelve el título, el texto y los enlaces de lo que estás mirando, y el chat del escritorio se lo pasa al asistente antes de preguntarle. Preguntar «resúmemela» funciona sobre la web que tienes delante.
- **Dos fallos encontrados y arreglados durante la construcción**:
  - **Wikipedia salía sin estilos.** `&amp;` dentro de un atributo HTML es un `&`; sin deshacer eso, `load.php?lang=es&amp;modules=…` se pedía con un parámetro llamado «amp;modules» y el servidor de enfrente devolvía otra cosa. Media web se ve mal por esto.
  - **El JavaScript de fuera estaba bloqueado** «por seguridad», y eso dejaba las páginas a medio dibujar. Lo que las hace seguras no es bloquearlo: es que el marco va con `sandbox="allow-scripts"` **sin** `allow-same-origin`, así que la web vive en un origen opaco y no puede leer nuestras cookies ni el DOM de la app. Los dos permisos juntos sí serían peligrosos; este par es el correcto.
- **SSRF cerrado**: se resuelve el DNS y se comprueba la IP de verdad antes de ir a buscar nada, así que `?url=http://127.0.0.1:5432` o la dirección de metadatos de la nube rebotan con un 400. Sin eso, el proxy sería una puerta a la máquina.
- **Lo que NO hace, escrito en el código para que nadie lo descubra chocándose**: iniciar sesión en sitios (las cookies de fuera no viajan), y la IA lee y navega pero no pulsa botones dentro de una aplicación que se dibuja sola con JavaScript. Para eso hace falta Chromium corriendo en el servidor, que es otra fase con su coste de infraestructura.
- El escritorio trae **su propio chat** (el que ve la web) y por eso la barra de IA global no se monta ahí: dos asistentes en la misma pantalla es una pregunta sin saber a cuál se la haces.
- Verificado en el navegador: las dos ventanas abiertas con el juego cargando dentro de la suya, Wikipedia y **dji.com** entrando por el proxy (837 KB, 152 enlaces reescritos), las hojas de estilo cargando con 200 tras el arreglo del `&amp;`, y la red interna rebotada con 400.

### 2026-08-19 — Un solo menú, y arriba
- **LA BARRA DE VENTANAS SE MUEVE ARRIBA** (petición de Eugenio: «haz que el menú de ventanas esté arriba… y así queda todo arriba limpio en un solo menú»). Estaba abajo, y con la cabecera de la app arriba había un menú en cada borde de la pantalla. Ahora las dos franjas se leen como una sola.
- Las ventanas empiezan **por debajo** de esa barra y no se pueden meter detrás: arrastrar una hacia arriba topa con ella, y maximizar respeta su alto. Sin eso, la primera ventana que subieras taparía el botón de abrirlas.
- **En el Escritorio, «Explorar» deja de estar en la cabecera**: ya vivía dentro de la hamburguesa, que lleva todas las secciones. Enseñarlo dos veces era justo el ruido que había que quitar. En el resto de la app no cambia nada.
- Se queda arriba a la derecha lo que NO está en la hamburguesa —la cuenta, ajustes y salir—, porque esconderlo sería quitarte la salida de la aplicación, no limpiar la pantalla.
- Verificado en el navegador: la franja de ventanas arriba con «Abrir» y las dos ventanas, el borde inferior vacío, y la cabecera con solo la hamburguesa y la marca.

### 2026-08-19 — El Escritorio como navegación: pantalla completa y cambio con gesto
- **TODAS LAS SECCIONES, EN LA LÍNEA DE ARRIBA** (petición de Eugenio: «que esté todo en la línea superior, no en un menú secundario»). Nueve botones directos —Juego, Web, Mapa, Conocimiento, Explorar, Mi conocimiento, Mis proyectos, Mercado y Universo—, sin desplegable. El que está delante se ve en negro; los abiertos, en gris.
- **CADA SECCIÓN SE ABRE A PANTALLA COMPLETA, EN SU VENTANA** («que el juego se abra en pantalla completa, y el navegador igual pero en otra ventana»). Es el modelo de macOS: cada cosa ocupa su pantalla y se salta de una a otra. Con ventanitas superpuestas el gesto de cambiar no significaría nada.
- **Pulsar una sección ya abierta la trae al frente en vez de duplicarla.** Con las secciones a un clic es facilísimo pulsar dos veces, y dos ventanas del mismo mapa no le sirven a nadie.
- **CAMBIAR DE VENTANA CON EL TRACKPAD**: deslizamiento **horizontal de dos dedos**, con las flechas ‹ › de la barra y con **⌘←/⌘→** como alternativas.
  - **Por qué dos dedos y no cuatro**: una web NO puede saber cuántos dedos hay en el trackpad. macOS se queda los gestos de tres y cuatro dedos para sí mismo (Mission Control, cambiar de escritorio) y **nunca llegan a la página**. No es una limitación de este código: no hay forma de detectarlos desde un navegador; solo una aplicación nativa podría. El de dos dedos sí llega —como una rueda con desplazamiento en X— y es el equivalente que sí funciona.
  - Se exige que el gesto sea claramente horizontal y se deja 700 ms entre cambios: un solo deslizamiento manda decenas de eventos y sin eso saltarías cinco ventanas de una pasada.
- Verificado en el navegador: los nueve botones en una sola línea, las dos ventanas naciendo a pantalla completa, y el cambio funcionando tanto con el deslizamiento como con ⌘→.

### 2026-08-19 — Un solo menú de verdad: el ☰ abre ventanas y la barra las enseña como iconos
- **UNA SOLA BARRA ARRIBA** (petición de Eugenio, tercera vuelta al diseño: «solo tiene que haber un menú arriba, uno solo… y en ese uno es donde deben estar las ventanas en forma de iconos… no están ahí por defecto, solo las que se abran desde el menú colapsado»). La segunda fila de secciones desaparece: en el Escritorio, la cabecera de la app ES la única barra.
- **El menú ☰ abre ventanas.** En el Escritorio, pulsar cualquier sección del menú colapsado ya no navega: abre esa sección como VENTANA a pantalla completa. Arriba del menú aparece además el **Navegador**. En el resto de la app el menú sigue navegando como siempre. La entrada del propio Escritorio siempre navega: abrirlo dentro de sí mismo sería una muñeca rusa.
- **Las ventanas abiertas son ICONOS en esa única barra**, junto a la marca. El de delante va en negro; pulsarlo minimiza; pulsar otro lo trae. El escritorio **nace vacío**: solo existe lo que abras.
- **El fallo gordo de la captura de Eugenio**: cada ventana cargaba la app ENTERA dentro de sí misma — cabecera, menú y todo, cuatro barras apiladas antes de llegar al juego. Ahora las ventanas cargan la ruta en modo embebido (`?embed=1`), que renderiza la página sola. Y el modo embebido ahora monta también la barra del asistente en las páginas que la llevan: el robot del juego ES el asistente, y sin eso el juego dentro de una ventana se quedaba mudo.
- **Minimizar ya no desmonta la ventana** (fallo visto en pruebas): se oculta con `display:none` y el marco sigue vivo — minimizar el juego y volver ya no lo reinicia de cero.
- **El botón del navegador casa por clase, no por dirección**: su destino cambia con cada página que visitas, y sin esto cada pulsación abría un navegador nuevo.
- La cabecera y el gestor se hablan por `src/components/ventanas/bus.ts`: eventos del navegador, sin contexto global nuevo — el estado sigue viviendo en un solo sitio. La cabecera PIDE el estado al montarse porque React ejecuta los efectos del hijo antes que los del padre y, si no, los iconos de las ventanas restauradas no aparecerían hasta el siguiente cambio.
- Verificado en el navegador: escritorio vacío al llegar; el juego y el navegador abiertos desde el menú, a pantalla completa y con `embed=1`; los iconos en la única barra con el de delante en negro; el conmutador visible→minimizado (vivo)→visible tres veces seguidas; y el gesto horizontal + ⌘←/→ siguen saltando entre ventanas.

### 2026-08-19 — El navegador propio, arreglado: pase diario y buscadores internos
- **EL FALLO DE LA CAPTURA DE EUGENIO** («el navegador no funciona bien»: DuckDuckGo sin estilos, sin logos, todo texto plano): el marco del navegador corre en un origen OPACO —esa es justo la barrera que protege la sesión— y por eso sus peticiones de CSS e imágenes llegaban al proxy SIN la cookie de sesión, que las rechazaba con 401. La página llegaba; su ropa, no.
- **El arreglo: un pase diario.** Cada recurso reescrito lleva ahora `&t=` con una firma HMAC del día (válida hoy y ayer, 20 caracteres, derivada de `SESSION_SECRET` sin escribir ningún secreto nuevo). `/ver` acepta sesión O pase; sin ninguna de las dos sigue siendo 401 — no se ha abierto un proxy público, solo se ha dejado pasar a los recursos de las páginas que un usuario con sesión ya pidió. `/leer` (lo que lee la IA) sigue exigiendo sesión siempre.
- **Los buscadores internos de las páginas ya funcionan.** DuckDuckGo envía su buscador por **POST**, y ese envío sin interceptar se escapaba del marco y aterrizaba en NUESTRA app (visto en pruebas). Ahora el script inyectado intercepta TODOS los formularios y los reconvierte en una consulta GET a través del proxy — los POST de verdad (iniciar sesión, pagar) ya estaban fuera de lo que este navegador hace, así que no se pierde nada que funcionara.
- También se quita el CSP que viene DENTRO del HTML (`<meta http-equiv>`): ya quitábamos el de las cabeceras, pero Wikipedia y otros lo traen también en el cuerpo y bloqueaba los estilos reescritos.
- Verificado en el navegador: DuckDuckGo con estilos, logos y favicons dentro de la ventana; búsqueda escrita en el buscador DE la página («aptera solar car») interceptada y navegada por el proxy con la barra de direcciones y el título actualizados; CSS con 200 sin cookie pero con pase; sin cookie y sin pase, 401.

### 2026-08-20 — YouTube en el navegador: el reproductor oficial, no el proxy
- **EL PORQUÉ DEL FALLO** («youtube.com no abre»): hay una segunda pared además del X-Frame-Options. Hay webs que no son documentos sino APLICACIONES: el HTML de YouTube es un cascarón de ~900 KB con 44 scripts que al arrancar pide sus datos por su cuenta —peticiones que no pasan por la reescritura y rebotan— y el vídeo viaja firmado y por rangos desde googlevideo.com, imposible para un proxy que guarda la respuesta en memoria. Un proxy de texto enseña documentos; no ejecuta aplicaciones.
- **La salida es la puerta oficial: el reproductor embebido.** Cualquier dirección de vídeo (watch, youtu.be, shorts) abre el player de youtube-nocookie.com, el mismo que usa cualquier web del mundo: el vídeo llega directo de Google, con imagen y sonido, sin pasar por nuestro servidor. Verificado reproduciéndose dentro de la ventana.
- **Buscar en YouTube funciona buscando «site:youtube.com» en DuckDuckGo** (que sí es un documento): la portada de youtube.com se sustituye por una página nuestra con su buscador, y `/results?search_query=…` redirige a esa búsqueda. Clic en un resultado → reproductor. La ficha del vídeo para la IA llega por oEmbed (título y canal en unos cientos de bytes, sin clave).
- **DuckDuckGo envuelve cada resultado en `/l/?uddg=…`**, una página que redirige CON JavaScript — ese salto se escapaba del proxy y chocaba contra el X-Frame-Options del destino (pantalla en blanco). Ahora el servidor desenvuelve el destino y navega directo. Arregla el clic en CUALQUIER resultado de DuckDuckGo, no solo los de YouTube.
- **El embed va SIN nuestro sandbox y CON Referer**: es de otro origen (no puede tocar la app) y necesita su almacenamiento y saber quién lo embebe — sin Referer, YouTube responde «Error 153» (visto en pruebas).
- **Botón «abrir fuera» en la barra del navegador**: hay webs-aplicación que ningún proxy de texto puede ejecutar (Gmail, Instagram…). El botón abre la dirección en una pestaña del navegador de verdad, en vez de dejar que descubras el límite chocándote con él.
- Verificado en el navegador: youtube.com → página de búsqueda; búsqueda «aptera solar car» → resultados; clic → reproductor oficial con el vídeo REPRODUCIÉNDOSE (fotogramas en movimiento); dirección de watch pegada en la barra → reproductor; Wikipedia sigue entrando por el proxy (200, reescrita).

### 2026-08-20 — Chromium en el servidor: el navegador de verdad («dale a Chromium»)
- **UN NAVEGADOR COMPLETO CORRE EN EL SERVIDOR** y la ventana de la app enseña su pantalla en directo: fotogramas JPEG por SSE (`Page.startScreencast`) y los clics, la rueda y el teclado del usuario viajan de vuelta y se inyectan en la pestaña (Playwright). YouTube entero, Google, cualquier web con JavaScript: verificado navegando el youtube.com real (consentimiento rechazado con un clic, portada, buscador con sugerencias en vivo) y el duckduckgo.com completo.
- **La IA lee la página VIVA**: `/api/navegador/remoto/:id/leer` devuelve el DOM real (texto y enlaces DESPUÉS del JavaScript), no una copia descargada. El chat del Escritorio lo usa automáticamente cuando hay sesión remota (aviso por el bus de ventanas).
- **Los vídeos siguen yendo por el reproductor oficial**: el screencast no lleva sonido (son imágenes), así que una dirección de vídeo cambia el marco por el embed de YouTube, que sí suena. Chromium se aparca en blanco mientras tanto.
- **Los gestos van en cola**: cada tecla en su propia petición suelta podía adelantarse a la anterior y «aptera» llegaba como «aapret» (visto en pruebas). Ahora una entrada no sale hasta que la anterior llegó.
- **Ventanas de atrás, `inert`** (fallo encontrado probando): el juego embebido coge el foco del teclado para sus controles y SE LO ROBABA a la ventana de delante — escribías en el navegador y las teclas se las comía el juego. Con `inert` el juego sigue corriendo de fondo pero no puede capturar ni foco ni teclas hasta traerlo al frente.
- **Costes y topes, dichos de frente**: cada sesión es un Chromium real (150–400 MB de RAM) → tope de 2 sesiones, cierre a los 3 min sin uso, y el propio Chromium se apaga al minuto de quedarse solo. Cerrar la ventana cierra la pestaña del servidor. Sin sesión → 401; cada sesión pertenece a su usuario.
- **Anti-red-interna también aquí**: las navegaciones del Chromium remoto pasan por el mismo filtro de IPs privadas que el proxy (con caché de DNS); escribir localhost:5432 en la barra rebota.
- **Si el servidor no tiene Chromium**, el navegador cae solo al proxy de lectura de antes, con su etiqueta «lectura»: nada se rompe.
- **Producción**: la imagen instala el Chromium del sistema (Alpine) y Playwright lo pilota (`NAVEGADOR_CHROMIUM`); el de Playwright es de glibc y no vale en musl.
- Aviso honesto que quedará a la vista: algunas webs enseñan un desafío anti-robots al ver tráfico desde un servidor (le pasó a DuckDuckGo en pruebas). Se resuelve con los clics de la persona, como en cualquier ordenador.

### 2026-08-20 — «Wiki» plateado en el logo
- El «Wiki» de la marca deja el verde y pasa a un **degradado plateado** (petición de Eugenio: «plateado/grisáceo moderno y elegante»): vertical, claro en el centro, que es como se lee «metal pulido». Tonos slate de la paleta de la app, sin colores nuevos. Verificado en el navegador junto al «Humanity» en negro.

### 2026-08-20 — Navegador en el menú, cabecera solo-logo y pantalla nítida
- **EL NAVEGADOR, A UN CLIC DESDE CUALQUIER PÁGINA** (petición de Eugenio: «directamente en el menú, sin tener que ir primero a escritorio»): la primera entrada del menú ☰ es «Navegador». En el Escritorio abre la ventana; desde cualquier otra página deja la apertura apuntada, navega al Escritorio y el gestor la recoge al montar.
- **LA CABECERA QUEDA EN SOLO EL LOGO** («limpia el menú principal… que no quede nada, solo el logo»): Explorar, Mercado, Contribuye, el perfil, administrar usuarios, el tamaño de letra y cerrar sesión viven ahora ORDENADOS dentro del menú ☰ — Explorar en «El común», Contribuye junto al Mercado, y una sección nueva «Tu cuenta» al final con el ajuste de letra en línea. Arriba quedan el ☰, la marca y (en el Escritorio) los iconos de las ventanas.
- **PANTALLA REMOTA NÍTIDA** («el navegador se ve con baja resolución»): el marco enviaba fotogramas al tamaño CSS y una pantalla Retina los estiraba al doble — borroso por construcción. Ahora la pestaña remota se dibuja a la densidad de TU pantalla (devicePixelRatio, tope 2) y la calidad JPEG sube de 55 a 70: los fotogramas llegan con el doble de píxeles y el navegador los encoge a su sitio. Verificado: texto nítido en la ventana.
- Verificado en el navegador: portada con la cabecera solo-logo, menú ☰ con las cuatro secciones ordenadas y scroll propio, y clic en «Navegador» desde la portada aterrizando en el Escritorio con DuckDuckGo ya abierto.

### 2026-08-20 — El navegador borroso, arreglado de raíz («sigue igual de mal»)
- **POR QUÉ EL CAMBIO ANTERIOR NO BASTÓ**: el screencast de Chromium (`Page.startScreencast`) entrega los fotogramas SIEMPRE al tamaño lógico (CSS) e **ignora `deviceScaleFactor`** — medido: pedíamos 400×300 con escala 2 y llegaban 400×300. En una pantalla Retina eso es borroso por construcción, y subir la calidad JPEG no lo tocaba.
- **EL ARREGLO**: la pantalla en directo ya no es el screencast, sino un bucle de **capturas de pantalla** (`page.screenshot`), que SÍ salen a píxeles reales del dispositivo. Medido con el código nuevo: escala 2 → 800×600 (el doble). El bucle captura mientras alguien mira, se salta los fotogramas idénticos para no mandar lo mismo dos veces, y para cuando cierras la pestaña.
- Verificado: `page.screenshot` con `deviceScaleFactor` 1 → 400×300; con 2 → 800×600. El cliente ya envía `escala = devicePixelRatio` (tope 2) y el `<img>` encoge la imagen grande a su hueco = nitidez real.
- Coste honesto: una captura es más pesada que un fotograma incremental del screencast, así que el bucle va a ~8 fotogramas/segundo. Para leer y navegar va sobrado; no es para ver vídeo (eso ya va por el reproductor oficial, con sonido).

### 2026-08-20 — El chat del Escritorio nace cerrado
- **El asistente del Escritorio ya no ocupa un tercio de la pantalla al llegar** (petición de Eugenio: «que el chat de IA esté no desplegado por defecto»): arranca plegado en su botón flotante, y las ventanas usan todo el ancho. Se abre pulsando el botón y se queda abierto mientras estés en la página.
- Los otros dos chats ya nacían cerrados: el acoplado del resto de la app (`open` en falso) y la barra de los lienzos y el juego, que solo se despliega cuando hay conversación.
- Verificado en el navegador: Escritorio a pantalla completa con el botón verde abajo a la derecha, y el panel abriéndose al pulsarlo.

### 2026-08-20 — Navegador: desplazamiento fluido y cerrar que no falla
- **EL TIRÓN AL SUBIR Y BAJAR tenía DOS causas, las dos medidas.**
  1. **La cola de entradas se atascaba.** Un solo gesto del trackpad dispara decenas de eventos de rueda por segundo y cada uno esperaba el viaje de ida y vuelta del anterior: la página seguía desplazándose segundos después de que tú pararas. Ahora los desplazamientos se SUMAN y solo hay uno en vuelo — al llegar la respuesta se manda el acumulado. No se atasca y no se pierde recorrido. Lo mismo con el movimiento del ratón (la posición es absoluta: perder puntos intermedios no se nota).
  2. **Cada fotograma nítido costaba demasiado.** Medido sobre Wikipedia a 1000×700 en pantalla Retina: nítido 98 ms y 286 KB (10 por segundo); rápido 17 ms y 85 KB (58 por segundo). Ahora la pantalla va a **dos velocidades**, como cualquier escritorio remoto: mientras algo se mueve manda fotogramas rápidos (fluidez, que es lo que el ojo pide al desplazarse) y, en cuanto se queda quieta, manda UNA nítida a plena resolución (detalle, que es lo que pide al leer). Con la página parada no se manda nada.
- Medido de punta a punta tras el arreglo: **primer fotograma a los 102 ms** del gesto, 12,7 por segundo a 96 KB durante el desplazamiento, y la nítida de 378 KB al parar.
- **CERRAR LA VENTANA YA NO FALLA** («a veces da fallos al cerrar»): los botones de la barra de título viven dentro de la zona de arrastre, así que al pulsarlos se capturaba el puntero para la barra y el navegador entregaba el clic a la BARRA, no al botón. Y pasaba solo con la ventana NO maximizada, porque maximizada el arrastre ya salía antes — de ahí el «a veces». Ahora el arrastre se aparta cuando el gesto empieza sobre un botón.
- Verificado en el navegador: ventana restaurada (el caso que fallaba) cerrándose a la primera.

### 2026-08-20 — Dos menús otra vez: el modo embebido ya no se pierde al navegar
- **UNA VENTANA VOLVÍA A PINTAR LA APP ENTERA DENTRO** (captura de Eugenio: la ventana «Iniciar sesión» con su propia cabecera dentro, dos menús). La causa: el modo embebido dependía de un parámetro en la dirección (`embed=1`), y ese parámetro **se pierde en cuanto la página de dentro navega por su cuenta** — al iniciar sesión, al pulsar un enlace, en cualquier redirección. A partir de ahí la ventana ya no se sabía ventana.
- **El arreglo: la app mira si va DENTRO DE UN MARCO**, no un parámetro. Ir en un marco es un hecho que no se puede perder al navegar; el parámetro sí. El `embed=1` se mantiene como refuerzo (la comprobación es un O), así que nada de lo que ya funcionaba cambia.
- Verificado en el navegador: ventana «Iniciar sesión» con una sola cabecera —la general— y **navegando por dentro** (Iniciar sesión → Crear cuenta) sigue sin duplicarse, que es justo lo que el parámetro no aguantaba.

### 2026-08-20 — Página «Lienzos» (estilo Miro) y adiós a «Universo»
- **NUEVA PÁGINA «LIENZOS»** en el menú ☰ (petición de Eugenio: «al estilo el menú de Miro, con todos los boards, y que puedas crear uno nuevo o abrir otro»). Es la lista PRÁCTICA, que es otra cosa que «Red de Datos»: allí los lienzos son un cosmos conectado —bonito para ver el conjunto, incómodo para encontrar el tuyo de ayer—; aquí son fichas en rejilla con su portada. El cajón de trabajo.
  - **Portada automática**: la primera imagen del lienzo, o la miniatura de su primer vídeo, o —si no tiene ninguna— sus iniciales sobre un color estable sacado del título, para que cada ficha se reconozca de un vistazo sin pedirle nada al autor.
  - **Míos / De la humanidad**, buscador por nombre, y **«Nuevo lienzo» como primera ficha de la rejilla** (lo que más se repite es empezar uno; buscarlo al final obliga a recorrer todo lo demás). Se crea pidiendo solo el nombre, nace **borrador** (solo tú lo ves) y se entra directo: crear un lienzo es querer usarlo.
  - Un lienzo ES un grafo de conocimiento: no hay tabla nueva ni tipo nuevo, solo otra forma de listarlos.
- **`GET /api/graphs?personales=1`**: incluye TU lienzo personal (Mi Conocimiento) en el listado. Solo vale para los tuyos —lo comprueba el servidor cruzando `creator_id` con tu sesión—, así que nunca se cuela en las listas del común. Verificado: «Míos» pasa de 6 a 7 lienzos con la bandera; el común con la bandera puesta y sin sesión sigue sin traer ninguno personal.
- **«UNIVERSO» BORRADO** (petición de Eugenio: «ya no sirve»): fuera del menú, fuera de las rutas y borrado el fichero. Con él se van sus 3 llamadas sueltas a la API y sus 15 colores a mano, que eran la mayor concentración de deuda de estilo del proyecto. Se deja constancia en `src/pages/CLAUDE.md`: de las cuatro páginas «Universo» que se construyeron no queda ninguna — es el coste de decidir «página nueva» antes que «vista nueva».

### 2026-08-20 — Archivos, favoritos del navegador y tres renombres
- **«JUEGO VITAL» → «MUNDO 3D»**, **«RED DE DATOS» → «GRAFOS»** y **«BASE DE DATOS» → «ARCHIVOS»** (petición de Eugenio). El inventario de tablas que ocupaba «Base de Datos» no se pierde: baja a «Tu cuenta» como «Base de datos (tablas)», solo para administradores — sigue siendo una herramienta útil, solo que no la puerta principal.
- **PÁGINA «ARCHIVOS»: tu cajón único.** Lo tuyo está repartido en tres sitios porque cada uno nació para algo distinto, y eso está bien: `knowledge_windows` (lienzos y chat), `publications` (muro) y `game_world_items` (lo que plantas en el Mundo 3D). `GET /api/archivos` LEE las tres y devuelve una sola lista por fecha. **Está sincronizado por construcción**: no hay copia que mantener al día, se lee siempre la fuente. Verificado con datos reales: **61 archivos** — 52 de lienzos, 7 del Mundo 3D (la nota de la calefacción, la DJI, el vídeo del dron, la foto del Aptera…) y 2 del muro.
  - Es una TABLA compacta, no una rejilla: aquí no vienes a mirar, vienes a encontrar algo concreto entre muchas cosas, y en una fila caben el tipo, el nombre, dónde está y cuándo lo tocaste. Filtros por origen y por tipo (solo los tipos que existen de verdad en lo tuyo), buscador, y cada fila abre la cosa DONDE VIVE, que es donde ya se puede editar.
- **MIS PROYECTOS YA INCLUÍA LOS DEL MUNDO 3D** y se ha comprobado en vez de suponerlo: el mundo escribe en la misma tabla `proyectos`, y el listado devuelve los 7, entre ellos «Meta Vida» e «Inversiones», creados desde el mundo. No hacía falta tocar nada.
- **FAVORITOS EN EL NAVEGADOR** («por las páginas de internet favoritas del usuario, que las pueda guardar y que aparezcan en forma de tarjeta al abrir NAVEGADOR»): el navegador abre en una pantalla de inicio con tus sitios en tarjetas; pulsas una y entra. La estrella ★ de la barra guarda o quita la página que estés viendo. Se guardan en tus ajustes de usuario (jsonb), así que **no hizo falta ninguna migración**. Quien no tenga ninguna ve como sugerencias los cuatro que nombró Eugenio (YouTube, WhatsApp Web, Gmail, Calendar) — son sugerencias, no se guardan solas.
  - **La pantalla de inicio NO levanta Chromium**: sería arrancar un navegador entero (150–400 MB) para enseñar cuatro tarjetas. Se abre al entrar en la primera página, y al volver al inicio se cierra.
- **DOS FALLOS REALES CAZADOS DE PASO**:
  - **El `inert` de las ventanas de fondo no estaba haciendo nada.** Se pasaba como cadena vacía y React la trata como FALSO (lo avisaba por consola). Es decir, el arreglo de «el juego se come las teclas» estaba puesto pero inactivo desde ayer. Ahora va como booleano.
  - **Al caer al modo lectura, el navegador volvía a la pantalla de inicio** y el clic en un favorito no iba a ningún sitio: la historia del modo lectura no se sembraba con la página actual.
- Verificado en el navegador: los tres nombres nuevos en el menú, la pantalla de favoritos con sus cuatro tarjetas, y el clic en una llevando a la página.

### 2026-08-20 — La plataforma es un juego de herramientas: fuera «Escritorio», fuera «Inicio», ventanas en todas partes
Lote de 12 peticiones de Eugenio en una sola captura. Diez van en este cambio; las otras dos (el tablero de Mi Perfil y el rediseño del asistente) van aparte porque son features enteras.

- **YA NO HAY PÁGINA «ESCRITORIO»** («elimina lo de escritorio, siempre esa funcionalidad tiene que estar; tienes que pensar la plataforma como un conjunto de herramientas/aplicaciones que te permiten hacer desde un proyecto, un grafo, un mapa o un mundo 3D y todo con la misma base de datos interconectada»). El gestor de ventanas ha dejado de ser una página para ser una **capa sobre toda la app**: sin ventanas abiertas no se ve ni captura clics, y la página de debajo funciona igual que siempre. Desde el menú ☰, **cualquier herramienta abre una ventana estés donde estés** — ya no hay que pasar primero por ningún sitio.
- **LA VENTANA YA NO NACE POR DEBAJO DE LA PÁGINA.** Era el fallo que hacía parecer que el menú no hacía nada: la capa de ventanas va después del contenido y con z propio.
- **LA BARRA DE ARRIBA MARCA DÓNDE ESTÁS**: la ventana que tienes delante se pinta en negro **y con su nombre**; las demás quedan como iconos de 32 px para que quepan muchas. Pulsar una la trae al frente; pulsarla otra vez la minimiza.
- **SIN BARRA ABAJO.** Fuera el pie de página. Solo hay una barra, la de arriba.
- **«/» YA NO ES UNA PORTADA: ES TU PERFIL** («quita el botón de inicio y la página; la página por defecto, Mi Perfil»). Borradas la página `Inicio` y la página `Contribuye`.
- **«GEOLOCALIZACIÓN DE DATOS» → «MAPAS»**, también en la dirección: `/mapas` es el mapa y `/mis-mapas` el índice. `/mapa` redirige, así que ningún enlace viejo se rompe.
- **GRAFOS ES UNO SOLO Y SON TODOS** («cuando haces click en grafos, que te aparezcan todos los grafos del usuario, no uno en concreto»). `/grafos` es la rejilla de fichas y **tu lienzo personal —lo que era «Mi Conocimiento»— es una ficha más**, igual que el grafo de los retos de España. Fuera del menú: un grafo es un grafo, venga de donde venga.
- **NUEVA PÁGINA «CONFIGURACIÓN»** con el tamaño de letra, que hasta ahora vivía suelto dentro del menú.
- **EL MERCADO ABRE LA PÁGINA DEL PRODUCTO** («que cuando le des a un producto se abra la página de ese producto, la misma que hicimos en el Mundo 3D»). Es literalmente el mismo componente: una landing es la misma cosa se llegue por el mercado o paseando por la aldea, con sus bloques, su vídeo y su botón de compra. El botón «Comprar» de la tarjeta sigue funcionando a un solo toque.
- **DOS FALLOS REALES ARREGLADOS DE PASO**:
  - **Una página abierta en una ventana no se podía bajar.** El modo embebido llevaba `overflow-hidden` fijo, así que cualquier página normal —tu perfil, por ejemplo— quedaba cortada por abajo. Ahora solo el lienzo y el Mundo 3D fijan el alto; el resto se desplaza.
  - **`/grafos` salía a sangre completa y con una barra de chat pegada abajo**, porque la regla de «página de grafos» no distinguía la LISTA del LIENZO. Esa era la «barra extra» que sobraba.
  - La lista de grafos abría siempre en «De la humanidad» aunque hubieras entrado con tu cuenta: la sesión llega después del primer pintado y el valor inicial se calculaba sin ella.
- Verificado en el navegador con sesión real: menú limpio (sin Inicio, sin Contribuye, sin Universo, sin Mi Conocimiento), «/» llevando al perfil, dos ventanas abiertas desde el menú con la de delante marcada por su nombre, y la ficha de la DJI Power 1000 V2 abriéndose desde el Mercado con toda su pizarra.

### 2026-08-20 — Mi Perfil es un escaparate, y la barra de arriba son pestañas de verdad
- **MI PERFIL SE ABRE COMO VENTANA, COMO TODO LO DEMÁS** (Eugenio: «la página de mi perfil no funciona bien como el resto de herramientas… es una página muy importante y tiene que tener la misma funcionalidad de escritorio»). Estaba dejada como enlace por creerla «un sitio donde vas una vez»; es al revés, es a donde más se vuelve. Igual Administrar usuarios, Base de datos y Configuración. Lo único que sigue navegando es **Iniciar sesión**: sin sesión no hay escritorio al que volver, y entrar dentro de una ventana dejaría a la app de fuera sin enterarse.
- **LA BARRA DE ARRIBA ES UNA BARRA DE PESTAÑAS**:
  - **Todas llevan su nombre**, no solo la seleccionada.
  - **Se cierran desde arriba**, como en un navegador. La ✕ aparece **solo en la pestaña activa** («para que ocupe menos»): las demás se ahorran esos 20 px.
  - **Se recolocan arrastrando**. Con el arrastre del propio navegador: son diez elementos en una fila, no hacía falta traer una librería.
- **EL ESCAPARATE DE MI PERFIL** («un escaparate donde puedas arrastrar y soltar tus grafos, proyectos, archivos, mapas y mundos, con tu muro público, un botón de editar y poder enseñar u ocultar cada tarjeta»):
  - **`GET /api/users/:id/escaparate`** reúne en un solo formato lo que esa persona tiene en las cuatro tablas donde vive: grafos, proyectos, mapas y **una sola ficha para su Mundo 3D** (un mundo no es una lista, es un sitio). Medido con datos reales: **17 fichas para el dueño, 11 para un desconocido**.
  - **DOS CANDADOS, no uno.** Arrastrar una ficha al escaparate **no publica** lo que hay detrás: el servidor filtra por la privacidad real de cada objeto (`status`, `publico`) y el orden del dueño solo decide cómo se colocan las que ya se podían ver. Así, colocar una ficha nunca puede destapar sin querer un proyecto privado. Verificado: sin sesión no aparecen ni los proyectos privados ni el lienzo personal.
  - **El orden y lo oculto se guardan en tus ajustes de usuario** (jsonb): sin migración. El perfil público expone **solo esa clave**, no los ajustes enteros — dentro hay cosas privadas como los favoritos del navegador. Comprobado en la respuesta real: sale `escaparate` y nada más.
  - **Botón «Editar»**: aparecen el asa para arrastrar y el ojo para enseñar/ocultar. Se guarda solo. Ocultar es una decisión de escaparate, no de privacidad, y así se dice en la propia página.
  - **PORTADA EN CADA FICHA** («que cada ficha tenga una imagen de preview de lo que hay dentro»): la primera imagen de dentro y, si no la hay, la miniatura de su primer vídeo — grafos, proyectos (mirando dentro de los bloques de sus tarjetas con `jsonb_path_query_first`, sin traerse el JSON a Node) y el Mundo 3D. Va a sangre con un degradado oscuro encima para que el texto se lea sobre cualquier foto; sin imagen manda el color del tipo. **Misma silueta con foto o sin ella**, así la rejilla no se rompe.
  - El perfil pasa de `max-w-2xl` a `max-w-4xl` y a tres columnas: en la columna estrecha las fichas quedaban del tamaño de un sello.

### 2026-08-20 — Un solo asistente, con historial, y que ve la ventana que tienes delante
Último punto del lote de doce (Eugenio: «mejor panel lateral, historial de conversaciones, saber qué modelo usa, coherente en todas las herramientas, icono de chat abajo a la derecha, integrar la barra de abajo —micro y «+»— en la barra lateral común, y que la IA vea en la página que estás»).

- **HABÍA TRES ASISTENTES, AHORA HAY UNO.** El mismo chat existía en tres formas —panel lateral, barra abajo en los lienzos y barra en línea en la portada—, cada una con su comportamiento. Se han retirado las dos barras (unas 180 líneas) y queda **el panel lateral, el mismo en todas las herramientas**, con su botón flotante **abajo a la derecha** (antes iba más arriba para dejar hueco a la barra que ya no existe). **El micro y el «+» viven ahora dentro del panel**, que es lo que se pedía.
- **DENTRO DE UNA VENTANA YA NO HAY UN SEGUNDO ASISTENTE.** Antes cada ventana montaba su propia barra de chat: acababas con dos asistentes, dos historiales y dos sitios donde arreglar lo mismo. Ahora el de fuera es el único.
  - **La voz del robot del Mundo 3D sigue llegando**: vive dentro del marco y el asistente vive fuera, así que sus avisos se reenvían con `postMessage`. Solo van **hacia fuera** y solo con esos dos nombres, y quien recibe **comprueba el origen**: nada de dentro de una ventana puede pedirle a la app de fuera ninguna otra cosa.
- **LA IA VE LO QUE TIENES DELANTE.** Con ventanas, «la página en la que estás» ya no es la ruta de fondo: es la ventana de delante. Ahora se le manda `mirando`, la lista de `ventanas` abiertas con cuál está delante, y `paginaWeb` si tienes el navegador abierto. **En la cabecera del panel se lee «Viendo: …»**, con el nombre en cristiano (no `/personas/U_ADMIN_EUGENIO`), para que se vea que lo sabe sin tener que preguntárselo. Comprobado de verdad: con el Mercado abierto y preguntándole «¿qué tengo abierto ahora mismo?», responde **«Tienes abierta la ventana Mercado»**.
- **HISTORIAL DE CONVERSACIONES**: cajón en la cabecera con tus conversaciones (título, número de mensajes y fecha), pulsas una y la retomas; la ✕ la quita del historial. La ruta ya existía y no la usaba nadie: lo que faltaba era el sitio donde enseñarlo. Se **archiva**, no se borra.
- **EL MODELO, A LA VISTA** en la cabecera, en vez de escondido dentro de los ajustes.
- **AGUJERO DE PRIVACIDAD CERRADO** (encontrado al rehacer esto): `GET /api/ai/conversations/:id/messages` devolvía los mensajes de **cualquier** conversación sin comprobar de quién era — con un id a mano se leía el chat de otra persona. Ahora comprueba la dueña. Verificado: **401 sin sesión, 403 con la sesión de otro, 200 con la del dueño**.

### 2026-08-20 — Doble clic en una pestaña: a pantalla completa
- **DOBLE CLIC EN UNA PESTAÑA DE ARRIBA Y LA VENTANA SE AGRANDA** (petición de Eugenio: «que si hago doble click en una de ellas, se expande la ventana a pantalla completa si resulta que está en un tamaño pequeño»). Es un conmutador, como la barra de título de cualquier ventana: otro doble clic la devuelve a su tamaño. Si estaba minimizada, se desminimiza a la vez — agrandar algo que no se ve no sirve de nada.
- **EL DETALLE QUE HABÍA QUE RESOLVER**: un clic en la pestaña que ya está delante la MINIMIZA, y eso chocaba con el doble clic — el navegador manda clic, clic y doble clic, así que la ventana se escondía y volvía de golpe antes de agrandarse; a pantalla completa se veía como un parpadeo. Ahora **traer al frente sigue siendo instantáneo** (que es el caso normal) y solo se hace esperar 220 ms el minimizar, que es el único que se pisa con el doble clic; si llega el doble clic, se cancela.
- Verificado con ratón de verdad: ventana en tamaño pequeño → doble clic → pantalla completa; doble clic otra vez → vuelve a su tamaño; clic simple → sigue minimizando.

### 2026-08-20 — Página «Tareas»: todas, agrupadas por proyecto
- **NUEVA HERRAMIENTA «TAREAS»** en el menú ☰ (petición de Eugenio: «una página como las otras herramientas donde puedas ver todas las tareas ordenadas por PROYECTOS»). Abre como ventana igual que el resto.
- **UNA TAREA ES UNA FILA DE `roadmap_items`**: no hay tabla nueva ni copia que mantener al día. Lo que cambia es cómo se miran — en un proyecto las ves como tablero, columna a columna; aquí las ves TODAS a la vez, repartidas por proyecto, para saber en qué andas metido sin abrir proyecto por proyecto.
- **`GET /api/tareas`**: `GET /api/roadmap` solo sabía traer las de UN proyecto, así que una vista de conjunto habría costado una llamada por proyecto. La ruta nueva las trae todas de una vez **ya repartidas por el servidor**: la página solo pinta.
  - **Quién ve qué**: una tarea se ve si se ve su proyecto — público, o tuyo (o eres administrador). Verificado sin sesión: solo salen los públicos.
  - Las que no cuelgan de ningún proyecto son la hoja de ruta de humanity.wiki, que ya es pública en /vision, y van en su propio grupo.
- **TUS PROYECTOS PRIMERO Y LA HOJA DE RUTA LA ÚLTIMA, PLEGADA.** Son 112 tareas de 128: abierta taparía por completo lo tuyo, que es a lo que vienes.
- Cada proyecto lleva **barra de avance** (hechas sobre el total) y un enlace a su tablero, que es donde se editan. Filtro por estado (todas / por hacer / en curso / hechas) y buscador.
- Verificado con datos reales: **128 tareas en 4 proyectos**; el filtro «En curso» deja las 4 que lo están; la hoja de ruta marca 47/112.

### 2026-08-20 — Sección «Páginas»: todas las que hay, ordenadas por proyecto
- **NUEVA HERRAMIENTA «PÁGINAS»** en el menú ☰, entre Mis proyectos y Tareas. Abre como ventana igual que el resto.
- **EL EDITOR TIPO NOTION YA ESTABA HECHO Y NO SE HA TOCADO.** Vive en `/documentos/:id` desde el 2026-08-08: «+» por línea con Texto, Título 1/2/3, Lista, Casilla, Cita, Separador, Código, **Imagen**, Tabla y Publicación, y el tirador ⋮⋮ para reordenar los bloques arrastrando. Comprobado que sigue funcionando tal cual. **Lo que faltaba era la otra mitad: el sitio desde el que verlas todas.**
- **UNA COLUMNA, NO UNA TABLA NUEVA** (`drizzle/0043_paginas_por_proyecto.sql`): `knowledge_windows.proyecto_id`. Una página está en UN proyecto o en ninguno, así que una tabla intermedia sería la 44.ª del proyecto y además permitiría estados que no queremos (la misma página colgando de tres sitios). Con `ON DELETE SET NULL`: borrar un proyecto no se lleva por delante lo que escribiste dentro — esas páginas caen en «Sueltas».
- **`GET /api/paginas`** reparte tus páginas por proyecto en el servidor; la página solo pinta. **`PUT /api/paginas/:id/proyecto`** las mueve, comprobando que la página es tuya y que el proyecto de destino también (si no, se queda suelta en vez de colarse en el proyecto de otro).
- **ARRASTRAR UNA PÁGINA A OTRO PROYECTO**: sueltas la ficha sobre la cabecera del proyecto y se va con él. Verificado de punta a punta: «Notas de la asamblea de septiembre» pasó a «Camión camperizado» y quedó guardado en la base de datos.
- **DOS DECISIONES DE COLOCACIÓN, las dos por un fallo visto al probar**:
  - Al principio solo se listaban los proyectos que YA tenían páginas — y entonces **un proyecto vacío no aparecía y no había forma de arrastrarle nada**. Ahora se enseñan todos tus proyectos: un cajón vacío tiene que verse para poder usarlo.
  - Pero abiertos, siete proyectos vacíos ocupaban media pantalla de huecos y empujaban tus páginas fuera de la vista. **Los vacíos nacen plegados**: una línea cada uno, y siguen valiendo como sitio donde soltar.
- Cada ficha lleva la primera imagen de la página como portada, un adelanto del texto, cuántos bloques tiene y si es pública o privada.

### 2026-08-20 — FASE 1 de la reestructuración: el menú lateral en 4 secciones
Eugenio: «reestructurar toda la plataforma en 1. los proyectos, 2. las herramientas, 3. los productos de cada proyecto, 4. las personas […] divide el menú izquierdo en 4 secciones».

- **LA FORMA DE LA PLATAFORMA, DICHA EN UN SITIO.** El menú deja de ser un desplegable del botón ☰ y pasa a ser una **columna que se queda**: con un árbol de proyectos dentro, un desplegable que se cierra al pulsar nada no sirve.
  1. **PROYECTOS** arriba del todo — se despliegan y dentro está lo que les cuelga.
  2. **HERRAMIENTAS** — Páginas, Esquemas, Mapas, Tareas, Mundo 3D, Archivos, Navegador, Explorar.
  3. **PRODUCTOS** — lo que ofreces.
  4. **PERSONAS** — Mi Perfil, la gente que sigues y las representaciones de tu Mundo 3D.
- **CINCO FILAS POR SECCIÓN Y SCROLL DENTRO DE CADA UNA**, no en todo el menú: si se desplazara entero, buscar una persona te dejaría los proyectos fuera de la pantalla. La sexta fila asoma a propósito — es lo que dice «aquí hay más» sin poner un cartel.
- **PLEGADO son 56 px de iconos** con el nombre al pasar el ratón, y se recuerda como lo dejaste.
- **EL ÁRBOL DE UN PROYECTO**: «Aptera → Tareas (10) → Decidir para qué es…». Verificado en el navegador, que es exactamente lo que pidió Eugenio con «Camión Camperizado → Tareas → Ducha, Baño».
  - **Los hijos se piden al desplegar, no antes** (`GET /api/proyectos/:id/arbol`): el árbol entero de siete proyectos serían 42 consultas para enseñar cinco líneas. Se paga por lo que abres, y una vez abierto se queda.
  - **La flecha y el nombre son dos botones distintos.** En el menú de los 14 objetivos estaban unidos y por eso no se podía mirar dentro de un objetivo sin seleccionarlo.
- **UNA PIEZA RECURSIVA EN VEZ DE CUATRO NIVELES A MANO.** El menú del mapa hacía esto con 120 líneas de JSX anidado que solo valían para objetivos → indicadores → marcadores → métricas. `RamaMenu` es recursiva: vale para cualquier profundidad sin escribir un nivel más.
- **`drizzle/0044`: `proyecto_id` en `knowledge_graphs`, `user_maps` y `products`.** Ya lo tenían tareas, páginas y las cosas del Mundo 3D; sin estas tres el árbol no podía enseñar los esquemas ni los productos de un proyecto. Mismo criterio que en 0043: una columna, no la tabla intermedia número 44. `ON DELETE SET NULL` en las tres — borrar un proyecto no se lleva por delante lo que hiciste dentro.
- **`GET /api/menu`** sirve poco y plano: el menú solo necesita saber QUÉ hay. Las herramientas no salen de ahí — son fijas y viven en el cliente, porque pedirle al servidor una lista que nunca cambia es un viaje por nada.

### 2026-08-20 — FASE 2: «Esquemas», y documentos y páginas se funden
- **TRES NOMBRES PARA UNA COSA, AHORA UNO: «ESQUEMAS»** (Eugenio: «llámalo Esquemas, y unifica todo para ese mismo nombre»). «Lienzo», «grafo» y «red de datos» eran la MISMA fila de `knowledge_graphs` dibujada de tres maneras. Tres nombres para lo mismo es como se pierde a la gente.
  - `/esquemas` es el cajón de fichas y `/esquemas/:slug` el esquema abierto. `/grafos`, `/grafos/:slug` y `/lienzos` **redirigen**, así que ningún enlace guardado se rompe. La redirección conserva el identificador: `/grafos/ceuta` acaba en `/esquemas/ceuta`, no en la lista.
  - `Lienzos.tsx` pasa a llamarse `Esquemas.tsx`. 26 ficheros tocados de una vez, con cuidado de NO tocar `/api/graphs`, que es otra cosa.
- **EL EDITOR DE DOCUMENTOS Y EL DE PÁGINAS ERAN EL MISMO Y AHORA LO DICEN** (Eugenio: «el builder de documentos se fusiona con el builder de páginas, que son lo mismo a partir de ahora»). El editor vive en **`/paginas/:id`**; `/documentos/:id` redirige conservando el identificador. La flecha de volver lleva a Páginas, que es de donde vienes.
  - Ojo al renombrar: `/api/documentos` **sigue llamándose así** —es la ruta que crea una página— y se dejó fuera del reemplazo a propósito.
- **«Documentos» desaparece como concepto**: lo que son ficheros vive en **Archivos**, y lo que se escribe, en **Páginas**. En Archivos, la etiqueta «Lienzos» pasa a «Esquemas».
- Verificado en el navegador: `/grafos` acaba en `/esquemas` con la página titulada «Esquemas», y `/documentos/KWMSKJJ98PDQ` acaba en `/paginas/KWMSKJJ98PDQ` con el editor abierto.

### 2026-08-20 — FASE 3: las ventanas son pestañas de Chrome de verdad
Eugenio: «haz exactamente como en Chrome, que la ventana muestre el icono de la página, grafo o proyecto en el que está específicamente, y que tenga una URL debajo que corresponda con el árbol de donde está almacenada en la base de datos […] permite que aparezca las flechas de adelante y atrás».

- **BARRA DE DIRECCIONES EN CADA VENTANA**, con **atrás, adelante y recargar**. La dirección NO es la ruta interna de React —«/paginas/KWMSKJJ98PDQ» no le dice nada a nadie— sino **dónde vive la cosa en el árbol**: `humanity.wiki/eugeniolighthumanity/proyectos/camion-camperizado-kkff/paginas/notas-de-la-asamblea-de-septiembre`. Eso hay que preguntárselo a la base de datos (`GET /api/ruta`), porque la ruta sola no lo sabe.
  - **Cada trozo del camino es pulsable**, como las migas de pan de GitHub: pulsar el proyecto te lleva al proyecto, sin recargar la ventana.
  - **El nombre de usuario sale del correo**: `eugenio@lighthumanity.org` → `eugeniolighthumanity`, que es exactamente lo que Eugenio escribió en su ejemplo. Sin columna nueva; el día que haya nombres de usuario de verdad, se cambia una función.
- **HISTORIAL POR VENTANA**, como una pestaña: se guarda por dónde has pasado y en qué punto estás. Atrás y adelante usan el historial DEL MARCO (no se recarga el `src`): recargar volvería a montar lo de dentro y el Mundo 3D empezaría de cero en cada paso.
- **EL ICONO Y EL NOMBRE DE LA PESTAÑA SIGUEN A LA PÁGINA**, como el favicon de Chrome: abres una página y ves el icono de página; navegas al proyecto y cambian el icono y el nombre. Antes eran los de donde nació la ventana y no se movían.
- **UN FALLO SERIO CAZADO AL PROBARLO**: la ventana **se recargaba en bucle acumulando `&embed=1`** (50 entradas de basura en el historial en segundos). Dos causas encadenadas: la ruta que publicaba la ventana incluía el `embed=1`, y el `src` del marco se recalculaba desde ella, así que cada aviso provocaba otra recarga. Arreglado por los dos lados: la marca `embed` **no viaja**, y el `src` **se calcula una sola vez** por ventana y no vuelve a tocarse — navegar por dentro es cosa del marco, no de React. Para eso `destino` (de dónde nació) y `ruta` (dónde está ahora) son campos distintos.
- Verificado en el navegador: la dirección completa del árbol, pulsar el proyecto para navegar, atrás para volver, y las flechas activándose y apagándose como toca.

### 2026-08-20 — FASE 4: un producto vive dentro de un proyecto
- **`PUT /api/products/:id/proyecto`** mete un producto en un proyecto o lo saca. **Dos comprobaciones, no una**: que el producto sea tuyo Y que el proyecto de destino también — sin la segunda, cualquiera podría colgar sus productos del proyecto de otra persona.
- **EL SELECTOR VIVE EN LA FICHA DEL PRODUCTO**, flotando encima y no dentro: `FichaProducto` la usa también el Mundo 3D y no había por qué tocarla. **Solo lo ve su dueño**: en qué proyecto está una cosa es una decisión de organización, no algo que enseñar a quien viene a comprar.
- **El menú lateral se entera solo**: al cambiar el proyecto se lanza `humanity:menu-cambiado` y la sección de Productos se repinta sin recargar.
- Verificado de punta a punta: la DJI Power pasó a «Camión camperizado» y el árbol del proyecto pasó a enseñar **Tareas → Lavabo, Ducha, Baño Seco, Sofa** y **Productos → DJI Power 1000 V2**. Que es, literalmente, el ejemplo que puso Eugenio. (Se dejó como estaba después de comprobarlo.)

### 2026-08-20 — FASE 5: mensajería entre personas, y los agentes se acuerdan
Eugenio: «haz mensajería entre personas, pero que el agente de Anita y el agente de Eugenio memoricen el contenido resumido del mensaje para no perder esa memoria».

- **HASTA HOY SOLO SE HABLABA CON LA IA.** Ahora dos personas de verdad pueden escribirse: bandeja en `/mensajes`, botón **«Escribir»** en el perfil de cualquiera, y la entrada «Mensajes» en la sección Personas del menú.
- **CADA MENSAJE DEJA HUELLA EN LOS DOS AGENTES**, que es la vuelta de tuerca que pedía Eugenio. En el Mundo 3D cada cual tiene representaciones de la gente que conoce, y esas representaciones tienen memoria; una conversación por aquí se les perdería, y son justo ellas las que deberían saberlo. Al enviar, se apunta un resumen **en los dos lados**: en el agente que representa a Anita dentro del mundo de Eugenio, y en el que representa a Eugenio dentro del de Anita. El puente es la columna `persona_user_id`, que ya existía. Verificado: enviado un mensaje, la memoria del agente pasó a contener «Eugenio García-Calderón Huerta escribió: "Hola Anita, ¿nos vemos el jueves…"».
- **DECISIÓN QUE CUESTA DINERO, TOMADA A PROPÓSITO: el «resumen» NO llama a la IA.** Se recorta el mensaje y se apunta quién lo dijo y cuándo. Resumir de verdad sería una llamada al modelo **por cada mensaje enviado**, dinero real y en el camino crítico del envío, y para un mensaje corto no aporta nada. Es una función de tres líneas: si algún día interesa, se cambia ahí.
- **Se dice en la pantalla**, junto al nombre de la conversación: «Vuestros agentes recuerdan esto». Una cosa así no debe pasar a escondidas.
- **`drizzle/0045`: tabla `mensajes`, SIN tabla de conversación.** Un mensaje sabe de quién es y para quién va; la conversación es «todos los mensajes entre estos dos» y sale de un índice con `least/greatest`, que sirve en los dos sentidos. Una tabla de conversaciones sería la 44.ª del proyecto sin aportar nada mientras hablen dos. El día que haya grupos, se añade entonces.
- **UN FALLO CAZADO AL PROBAR**: la bandeja agrupaba primero y pedía los nombres después con `id = ANY(<lista>)`. **Eso no funciona**: una lista de JavaScript viaja como un parámetro suelto, no como un array de Postgres, y la consulta revienta. Se unió la tabla de personas dentro de la misma consulta — se arregla y además es un viaje menos.

### 2026-08-20 — Renombrar desde el menú, sesión transversal, perfil editable
Cuatro peticiones de Eugenio en el mismo rato.

**1. NOMBRE E ICONO DESDE EL MENÚ** («al hacer hover en un elemento debe aparecer 3 puntitos […] y permitir mediante una ventanita pop up cambiar el nombre e icono»).
- Los tres puntitos salen **solo al pasar el ratón** y **solo en lo que se puede renombrar**: si estuvieran siempre, cada fila llevaría un botón compitiendo con su propio nombre. Con `opacity` y no `hidden`, para que no salte el ancho al aparecer.
- **Una rama como «Tareas» NO se renombra**: es una categoría, no una cosa. Lo que cuelga de ella sí. Y de una persona real tampoco: su nombre lo pone ella en su perfil, no quien la tiene en su lista.
- **`PUT /api/elemento/:tipo/:id`, una sola ruta para siete tablas.** Siete endpoints idénticos serían siete sitios donde arreglar el mismo fallo. El precio es que los nombres de tabla entran en el SQL como texto: por eso salen **solo de un mapa fijo** y nunca de lo que mande nadie, que es la única forma en que `sql.raw` es segura y la regla que ya sigue `ENTITY_TABLES`.
- **`drizzle/0046`: columna `icono`** en proyectos, esquemas, mapas, productos, tareas y agentes. **El icono es de LA COSA, no de quien la mira**: si le pones 🚐 al camión, quien vea ese proyecto ve el 🚐. Guardarlo en los ajustes de usuario habría sido más barato y habría hecho que cada cual viera un icono distinto para lo mismo. **Las páginas quedan fuera a propósito**: ya guardan su icono en `config->>'icono'` desde el editor tipo Notion, y una columna crearía dos sitios para el mismo dato.
- **EL ICONO SALE TAMBIÉN EN LA PÁGINA** («junto al título en la parte superior»): en el proyecto, en el esquema abierto, en la ficha del producto y en las rejillas. En un esquema, el icono que elijas **manda sobre la portada automática**: es una decisión tuya y la portada es una suposición nuestra.

**2. LA SESIÓN ES DE TODA LA APP** («he iniciado sesión en el Mundo 3D pero no me ha hecho eso inicio de sesión en el resto»). La cookie **sí** era compartida —es del dominio entero—; lo que fallaba es que la app de fuera había preguntado quién eras al arrancar, le dijeron «nadie», y no volvía a preguntar. Ahora la ventana avisa al entrar o salir, fuera se vuelve a preguntar, y desde fuera se avisa a **todas las demás ventanas** para que hagan lo mismo. Viaja solo el hecho de que cambió, nunca la cookie ni el token, y siempre con el origen comprobado. Verificado: sesión iniciada dentro de una ventana → el menú se llenó y apareció el avatar arriba, sin recargar nada.

**3. LA CUENTA, ARRIBA A LA DERECHA DEL TODO.** Avatar con desplegable (Mi Perfil, Configuración, Cerrar sesión), o «Iniciar sesión» si no hay. Es donde la busca todo el mundo, y además hace visible de un vistazo si has entrado — que era justo lo que no se veía.

**4. FOTO Y DESCRIPCIÓN EN TU PERFIL.** Se edita **en el sitio**, no en otra página: ves cómo queda mientras escribes. La foto sube por la ruta de siempre. Si no tienes descripción, tu propio perfil te lo dice con un enlace en vez de dejar un hueco.

**5. LA SESIÓN NO CADUCA EN LOCAL** («haz que no se me cierre la sesión nunca en este localhost»): 10 años en local, **30 días en producción**. La diferencia la marca `NODE_ENV`, así que el servidor de verdad vuelve solo a los 30 días sin que nadie tenga que acordarse. Las 12 sesiones locales que ya tenía se han alargado también.

### 2026-08-20 — Colocar el menú a mano, y un proyecto que se gestiona desde su página
- **ARRASTRAR PARA COLOCAR** («permite pinchar y mantener pinchado para arrastrar y cambiar de orden los elementos del menú»). Funciona en las cuatro secciones. Una línea verde marca dónde va a caer: sin ella, arrastrar es adivinar.
  - **Solo las filas de primer nivel.** Lo que hay DENTRO de un proyecto ya tiene su propio orden — una tarea se coloca en su tablero, no aquí, y dos ordenaciones peleándose por lo mismo es como se pierden los datos.
- **ESTIRAR UNA SECCIÓN** («que el espacio que ocupan se pueda ampliar o reducir arrastrando la línea que los separa»). La raya de abajo de cada sección es un tirador; doble clic la devuelve al tamaño de siempre. Cuánto sitio merece cada sección depende de en qué andes metido, y eso no lo puede decidir quien programa.
  - **Se toca el estilo a mano durante el gesto y solo se avisa a React al soltar**: pasar por el estado en cada píxel repinta el menú entero sesenta veces por segundo, y guardar en cada movimiento serían cien escrituras por arrastre.
- **AMBAS COSAS SON TUYAS, NO DEL PROYECTO**: que tú pongas «Camión camperizado» el primero no cambia el menú de nadie más. Por eso van en tus ajustes de usuario (jsonb) y no en una columna. Verificado: orden y altura guardados y recuperados.
- **BORRAR UN PROYECTO desde su página.** Se **archiva**, no se borra (regla 6 de la Constitución), y **lo de dentro no se toca**: sus tareas, páginas, esquemas y mapas siguen existiendo y se quedan sueltos. El aviso lo dice con todas las letras antes de confirmar — la sorpresa que nadie quiere es descubrir que archivar la carpeta se llevó meses de trabajo.
- **TODAS LAS HERRAMIENTAS, DESDE LA PÁGINA DEL PROYECTO**: botones de Tarea, Página, Esquema y Mapa. Lo que creas ahí **nace ya dentro del proyecto**, que es la diferencia con crearlo desde su herramienta y moverlo después. Una sola ruta (`POST /api/proyectos/:id/herramienta`) para las cuatro: lo que cambia entre crear una página y crear un mapa es la tabla y poco más. Verificado: creado un esquema desde el proyecto, quedó dentro y se entró en él.

### 2026-08-20 — Hablar con alguien sin cargar el Mundo 3D
- **UNA PÁGINA POR PERSONA DE TU MUNDO** (`/persona/:id`), petición de Eugenio: «para hablar con alguien haz que no haga falta que cargue el mundo 3D, sino que haciendo click en esa persona desde el menú se abra su perfil en la parte de arriba junto con el chat de mensajes históricos en la parte de abajo».
  - Hablar con Anita cargaba **el Mundo 3D entero** —un megabyte de three.js y toda la escena— para lo que en el fondo son una ficha y un chat. Ahora se abre al instante: **perfil arriba, conversación abajo**.
  - **Es el MISMO chat de la plataforma**, al que se le cuenta con quién hablas. Duplicarlo aquí habría significado dos historiales y dos contadores de gasto para la misma conversación.
  - **Se dice lo que es**: «esto es una representación que has creado tú, no la persona real». Confundir una cosa con la otra es el peor malentendido posible de toda la plataforma, así que va arriba y sin letra pequeña. Debajo, plegable, lo que recuerda.
- **`GET /api/juego/agentes/:id`** trae la ficha y los mensajes de su hilo en una sola llamada.
- El menú y el árbol de proyectos ya no llevan al Mundo 3D al pulsar una persona.
- Verificado de verdad: preguntándole «¿quién eres?», Anita contesta **«Soy Anita, una habitante de tu mundo en el Juego Vital…»**, en su papel y sin cargar ninguna escena. (Conversación de prueba borrada después.)

### 2026-08-20 — CALENDARIO (fases 1 y 2), fichas del perfil con menú, e iconos más grandes
**1. CALENDARIO** (Eugenio: «añade una herramienta más: Calendario […] que todo esté integrado, que sea un calendario TOP»).
- **LA IDEA QUE MANDA: el calendario NO es un sitio donde se guardan cosas, es una FORMA DE MIRAR lo que ya existe**, ordenado por cuándo pasa. `GET /api/calendario` no lee una tabla: lee varias y las junta.
  - **Los eventos** (reuniones, viajes) sí nacen aquí, porque no existía nada parecido: tabla `eventos` con inicio, fin, todo el día, lugar, proyecto y color.
  - **Tus tareas con fecha NO se copian**: se les añade `vence_el` y el calendario las lee de donde ya viven. Copiarlas habría creado dos verdades —la del tablero y la del calendario— que se separan al primer cambio. **Mover una tarea de día en el calendario cambia la tarea de verdad**, y el tablero se entera solo.
  - Añadir una fuente más mañana (un pago que vence, una publicación programada) es **una consulta más aquí y nada más**: ni tabla, ni copia, ni sincronización que se pueda romper.
- **TRES VISTAS** (mes, semana, día), navegación adelante/atrás, «Hoy», crear pulsando un día, editar y borrar, y **arrastrar cualquier cosa a otro día**.
- **SIN LIBRERÍA DE CALENDARIO**: un mes son 42 celdas y una semana son 7. Meter una dependencia de 200 KB para eso, con su forma de entender las fechas y su tema que hay que domar, cuesta más de lo que ahorra.
- **DOS TRAMPAS DE FECHAS, evitadas a propósito**: la clave de cada día se calcula en hora LOCAL (con `toISOString()`, un evento de la 01:00 en Madrid caería en la casilla de ayer), y los campos de fecha del formulario hablan en local, no en UTC (si no, la hora aparecería desplazada al abrir el evento).
- `drizzle/0047`: tabla `eventos` (con `timestamptz` — una reunión a las 10:00 en Madrid es a las 10:00 aunque la mires desde otro sitio) y columna `vence_el` en las tareas. La columna `repeticion` se deja creada desde ya para la fase 3, para no migrar una tabla con datos dentro.
- Verificado con datos reales: dos tareas suyas con fecha apareciendo solas en su día, un evento creado, y una tarea arrastrada a otro día quedando cambiada en la base de datos.

**2. LAS FICHAS DEL PERFIL, CON SUS TRES PUNTITOS** («que todas las tarjetas tengan los 3 puntitos cuando se hace hover y que se puedan modificar, eliminar etc»): abrir, cambiar nombre e icono, enseñar/ocultar y quitar. Usa **el mismo popup que el menú**: renombrar algo es lo mismo se haga desde donde se haga. Quitar **archiva**, y el aviso lo dice: no se borra, si te arrepientes sigue estando. El Mundo 3D no lleva puntitos — es un sitio, no una cosa de una tabla.

**3. ICONOS DEL MENÚ UN 25 % MÁS GRANDES** (16 → 20 px). Plegado el menú, el icono es lo ÚNICO que se ve.

### 2026-08-20 — Zoom en el navegador, y un fallo de React que rompía Mi Perfil
- **ZOOM EN EL NAVEGADOR, como en Chrome** (Eugenio: «el mensaje de cookies de YouTube no se puede aceptar porque no da la pantalla para verlo, y no se puede hacer scroll down»). Botón de **⋯ en la barra** con − / porcentaje / +, por los mismos saltos que Chrome (33 %…200 %) y **100 % por defecto**. Pulsar el porcentaje vuelve al 100 %.
  - **CÓMO FUNCIONA, que es lo que lo hace bueno: el zoom NO estira la imagen.** Le pide a Chromium una **ventana más grande** —al 75 %, un tercio más ancha y alta— y la encaja en el mismo hueco. Cabe más página, exactamente como al alejar en un navegador de verdad, y **el texto se ve nítido** porque lo dibuja Chromium a ese tamaño en vez de estirarlo aquí.
  - Por eso **el servidor no sabe nada del zoom**: para él solo ha cambiado el tamaño de la ventana, que ya sabía hacer. Y los clics siguen cayendo donde toca sin tocar nada, porque las coordenadas ya se calculaban contra ese mismo tamaño.
  - Verificado con el aviso de cookies de YouTube: al 100 % los botones quedan fuera de la pantalla; al 75 % **cabe entero con «Rechazar todo», «Aceptar todo» y «Más opciones»**. (No se pulsó ninguno: esa elección es de Eugenio.)
- **FALLO REAL CAZADO Y ARREGLADO**: al añadir los tres puntitos a las fichas del perfil dejé tres `useState` **debajo de los `return` de «cargando»**. Un hook detrás de un return se ejecuta en unos pintados y en otros no, y React se rompe entero («Rendered more hooks than during the previous render»): **Mi Perfil se quedaba en blanco**. Todos los hooks arriba, y comprobado que no queda ninguno después del primer return.

### 2026-08-20 — PERSONAS: el CRM (fases 1 y 2)
Eugenio: «en la sección de personas, crea una página donde se puedan ver todas […] permite crear grupos […] y ponerlo como favoritos […] esto es como un CRM, tienes que tener complejidad de datos como Salesforce permitiendo conectarlo todo con las herramientas y proyectos».

- **LA DECISIÓN QUE SOSTIENE TODO LO DEMÁS: NO HAY TABLA DE CONTACTOS NUEVA.** En la plataforma ya había tres cosas llamadas «persona» —`users` (cuentas reales), `organizations` y `game_agents` (la gente de TU mundo)— y la tercera **ya era un fichero de contactos**: la creas tú, tiene memoria, puede apuntar a una cuenta real y ya colgaba de proyectos. Crear una tabla `contactos` al lado habría sido **la cuarta cosa llamada persona en el mismo producto**, que es exactamente el error que costó cuatro páginas «Universo» borradas. Se le añadió lo que le faltaba y punto.
- **`drizzle/0048`**: datos de contacto (correo, teléfono, empresa, web, dónde está), **estado** (nuevo / hablando / trabajando / en pausa / cerrado — lo que convierte una agenda en un CRM: no «quién es» sino «qué toca»), favorito, etiquetas y grupos. Más la tabla `grupos_personas`.
  - **Los grupos van en un array `jsonb`, no en una tabla intermedia**, siguiendo el precedente que ya existe en esa misma tabla (`proyecto_ids`): una persona está en tres o cuatro grupos, no en tres mil, y una tabla más sería la 44.ª. Con índice GIN, «quién está en este grupo» sigue siendo rápido.
- **ES UNA TABLA, NO UNA REJILLA DE TARJETAS.** A un CRM no vienes a mirar caras: vienes a encontrar a alguien concreto y a comparar filas. Buscador por nombre, empresa, cargo o correo; filtro por grupo; filtro de favoritas.
- **LOS GRUPOS FAVORITOS SE AÑADEN AL MENÚ LATERAL**, como pidió: la estrella de cada grupo lo sube a la sección Personas, con su cuenta, y al pulsarlo abre la lista ya filtrada.
- **LO QUE HACE QUE SEA UN CRM Y NO UNA AGENDA**: la columna «Conexión» enseña de un vistazo lo que une a esa persona con el resto de la plataforma —su proyecto, cuántos mensajes os habéis escrito, cuánto recuerda su representación— y `GET /api/personas/:id/todo` devuelve la vista de 360°. **Nada de eso se guarda aquí: se cruza al preguntar**, de las tablas donde ya vive. Añadir una fuente mañana es una consulta más.
- Verificado de punta a punta: grupo «Aldea» creado, marcado favorito y **apareciendo en el menú lateral**; ficha de Anita con empresa, correo, estado «trabajando» y su grupo, todo guardado. (Datos de prueba borrados después.)

### 2026-08-20 — FASE 3 del CRM y FASE 3 del Calendario
**CRM — la ficha de 360°.**
- `/persona/:id` deja de ser «perfil arriba, chat abajo» y pasa a ser la ficha completa: **a la izquierda quién es y QUÉ OS UNE** (sus proyectos, las tareas de esos proyectos, lo que hay en el calendario, los mensajes de verdad y lo que recuerda su representación); **a la derecha, hablar**. Nada de lo de la izquierda se guarda ahí: se cruza al preguntar.
- **EL SEGUIMIENTO, que es la pregunta que un CRM tiene que responder sin que se la hagas**: «hablasteis hace X», **en rojo pasado un mes**. Y al pulsarlo: «acabamos de hablar» o «recuérdamelo en una semana / dos / un mes / tres meses».
  - **EL RECORDATORIO SE CREA EN EL CALENDARIO, no en un sistema propio.** Si el CRM tuviera sus propios avisos, tendrías dos agendas. Verificado: pedir «en una semana» creó el evento «🔔 Hablar con Javier» siete días después y apuntó la fecha del último contacto.
- **ETIQUETAS** en la ficha y en la tabla. Texto libre separado por comas, sin catálogo que mantener: en un CRM personal las etiquetas se inventan sobre la marcha, y obligar a crearlas antes es fricción para nada.

**CALENDARIO — repeticiones y crear eventos hablando.**
- **EVENTOS QUE SE REPITEN**: cada día, cada semana, cada dos semanas, cada mes, cada año. **Se guarda UNA fila con su regla, no una fila por repetición**: un evento semanal durante dos años serían 104 filas que crear, mantener y borrar a la vez. La regla va en **formato RRULE de iCalendar**, el que entienden Google Calendar y Apple, así que el día que haga falta importar o exportar ya se habla el mismo idioma. Con **tope duro de 800 vueltas** al expandir: una regla rota no puede colgar el servidor.
  - **UN FALLO CAZADO AL PROBARLO**: la consulta pedía eventos que *solaparan* con el mes, así que **una reunión semanal creada en junio no aparecía en agosto** — se quedaba fuera para siempre. Ahora los que se repiten entran siempre que hayan empezado ya, y qué veces caen se decide después, al expandir.
- **CREAR EVENTOS HABLÁNDOLE AL ASISTENTE**: «apúntame una reunión con el taller el próximo lunes a las 10». Nueva acción `CREATE_EVENTO` (nivel 1: tu calendario no toca el conocimiento de nadie). Se le dice al modelo **qué día es hoy** para que resuelva «el lunes» él, y la fecha se comprueba al guardar — sin eso, una fecha rara acabaría en 1970.
  - **AJUSTE QUE HIZO FALTA**: la primera versión decía «te la apunto» y **no apuntaba nada**. La instrucción estaba en el bloque de contexto, lejos del formato de acciones; el modelo no la ataba con «mandar la acción». Movida junto al formato y **con un ejemplo entero**, funciona. Verificado de punta a punta: propuesta, aplicada y evento creado el lunes 24 a las 10:00.

### 2026-08-20 — El calendario como el de macOS, y dos formas de ver el CRM
**CALENDARIO** (Eugenio, con la captura del calendario de macOS).
- **EL NÚMERO DEL DÍA, ARRIBA A LA DERECHA Y CON CONTRASTE** (13 px, negrita, `slate-800`). Antes iba a la izquierda en gris claro: en una rejilla llena, el número es lo primero que buscas y era lo que menos se veía. Hoy en **círculo rojo**, como en la captura.
- **NÚMERO DE SEMANA ISO** a la izquierda de cada fila, y **fin de semana con fondo**: localizar el sábado sin leer la cabecera.
- **VISTA DE AÑO**: doce meses pequeños. No caben los títulos, así que lo que se enseña es **dónde hay algo** — un punto bajo el día. Es un mapa para saltar, no para leer: pulsar un día lleva a ese día, pulsar el mes al mes.
- **CREAR PINTANDO DÍAS**: pinchas en un día y arrastras hasta otro, y sale un evento de todo el día en ese tramo. **Y con doble clic** en un día suelto.
  - **Un clic suelto YA NO crea nada**, a propósito: crear con un solo clic te llena el calendario de eventos vacíos sin querer. Los dos gestos que crean —doble clic y pintar— no se hacen sin querer.
- **UN FALLO DE VERDAD, ENCONTRADO Y ARREGLADO**: al soltar se leía el tramo desde el estado de React, y **si el gesto iba rápido el estado aún no se había repintado**: se veía el valor viejo, no se creaba nada y el calendario se quedaba pintado sin responder. Ahora el tramo va también en una referencia, que siempre es la de ahora, y el manejador de «soltar» se registra una sola vez. Se escucha `pointerup` **y** `mouseup`: no todos los caminos de entrada mandan los dos, y soltar tiene que terminar el gesto siempre.

**CRM — DOS FORMAS DE MIRAR** («ponme diferentes formas de ver los contactos, en galería con fotos en mini tarjetas, o en tabla con las variables en las columnas»).
- **TABLA** para trabajar —encontrar a alguien entre muchos y comparar columnas— y **GALERÍA** para reconocer por la cara, que es como funciona la memoria con la gente que ya conoces. Los mismos datos y **las mismas acciones en las dos**: cambiar de vista no puede quitarte lo que podías hacer.
- **La elección se recuerda**: cada cual mira de una forma y no hay que repetirla cada vez.

### 2026-08-20 — Una imagen puede ser el icono, y el título se edita desde la página
- **EL ICONO PUEDE SER UNA IMAGEN, no solo un emoji** (Eugenio: «añade la opción de añadir una imagen como icono de las páginas del menú»). Botón **«Subir imagen»** en la ventanita de nombre e icono, y también en el editor de una página.
  - **SIN MIGRACIÓN NI COLUMNA NUEVA**: los dos casos caben en la columna `icono` que ya existía. Se distinguen **mirando el valor** —lo que empieza por `/` o `http` es una dirección, lo demás es un emoji— y no con una columna «tipo» al lado, que sería un dato capaz de contradecir al otro; el día que se contradijeran, se pintaría mal.
  - Una pieza compartida (`ui/Icono`) los pinta en el menú, en la página del proyecto, en el esquema, en la ficha de un producto y en una página. En un esquema, si el icono es una imagen, **es la portada entera**.
- **EL TÍTULO Y EL ICONO SE CAMBIAN TAMBIÉN DESDE LA PÁGINA** («no solo desde el menú»): lápiz junto al título del proyecto, que abre **el mismo popup del menú** — renombrar algo es lo mismo se haga desde donde se haga. Y en una página, el icono se pulsa y se cambia ahí.
- **SE ME HABÍA OLVIDADO EL ICONO EN LAS PÁGINAS**, y ahora sale junto al título como en el resto.
- **DOS FALLOS MÍOS, CAZADOS AL PROBARLO**:
  - **El tope de 8 caracteres partía las direcciones**: un icono de imagen se guardaba como `/uploads` y a volar. Ese tope estaba pensado solo para emojis, de cuando no había otra cosa.
  - **Se colaba cualquier texto raro como icono.** Ahora una dirección solo vale si es **de aquí** (`/uploads/…`) o **https**, y un emoji no puede llevar `:` ni `<`. Un `javascript:` ahí no haría daño —el icono nunca entra en un enlace— pero guardar basura que parece un enlace es pedir que algún día alguien la trate como tal. Verificado: imagen propia y emoji entran; `javascript:` y una imagen de fuera se rechazan sin tocar lo que había.

### 2026-08-20 — Tres filas de cabecera se quedan en dos, y un botón para dejarlas en una
Eugenio, con captura: «sobra la línea de Retos de la Humanidad xvf2, solo tiene que quedar la de arriba y la de abajo, actualmente hay 3 líneas de datos, esto no puede ser».
- **FUERA LA BARRA DE TÍTULO DE CADA VENTANA.** Tenía razón: el nombre ya estaba en su pestaña de arriba, así que era **la misma información dos veces**. Sus botones —minimizar, maximizar, cerrar— se han ido al final de la **barra de dirección**, que es también de donde se tira ahora para mover la ventana. En el Navegador van al final de su propia barra, que ya existía.
- **TODO MÁS BAJO**: la cabecera pasa de 56 a **40 px** (32 en compacto), las pestañas de 32 a 28, y la barra de dirección adelgaza. Eran tres filas para lo mismo; ahora que son dos, cada una tiene que pesar lo mínimo.
- **BOTÓN DE ENCOGER** («que colapse en algo todavía más sencillo, con solo iconos de las ventanas»): las pestañas se quedan en **iconos de 24 px sin nombre**, y la barra de dirección de la ventana se reduce a una tira de 22 px con los tres botones. Es lo mínimo que puede quedar sin perder el poder cerrarla. **Se recuerda** cómo lo dejaste.

## 2026-08-20 — Magic save button: web pages and videos into a project

Petición de Eugenio: «haz que cuando esté navegando en internet en youtube por
ejemplo tenga un botón mágico para guardar y compartir ese video en uno de las
herramientas dentro de uno de los proyecto», y después «dale a tu recomendación
y que sea con transcripción».

**What ships**

- `src/server/guardar.ts` (new module): `POST /api/guardar-web` saves the page
  you are looking at as a `knowledge_windows` row — kind `video` for YouTube,
  kind `enlace` for anything else — optionally inside a project. `GET
  /api/guardados` lists them.
- `Navegador.tsx`: a ✨ button saves in one click to "Sin clasificar"; the arrow
  next to it picks a project. A strip confirms what was saved and where.
- `src/server/menu.ts`: the project tree grows a **Guardados** branch.
- `src/server/navegadorRemoto.ts`: `POST …/:id/transcripcion` reads YouTube's
  own transcript panel from the Chromium the person is already using.

**Transcription: what actually happens, measured today**

The obvious route — download the caption track listed in the YouTube page —
**is dead**. `timedtext` answers `200` with **0 bytes** for every format
(`json3`, `srv3`, `vtt`, none), from the server *and* from inside a real
logged-out browser page. The player itself says "Subtítulos no disponibles".

The transcript panel route was then tried properly, with real Playwright clicks:
the "Mostrar transcripción" button exists and is clicked, but the panel never
populates. Verified on three unrelated videos.

Conclusion: **YouTube no longer serves captions to a session that has not
logged in.** The code is kept because it is the right shape and starts working
the moment a session with access is used; when there is no transcript the video
is saved anyway, and the UI says why instead of blaming the video.

The remote browser opens a **fresh `newContext` per session**, so logging into
YouTube there does not survive. Making that context persistent is the change
that would unlock transcription without paying anyone — it is not done here
because it stores site cookies on the server and that is Eugenio's call.

## 2026-08-20 — Two-finger swipe goes back and forward

Petición de Eugenio: «haz que si deslizo dos dedos en el pad, la ventana pase de
izquierda a derecha, según la dirección de deslizamiento».

Two fingers right → back. Two fingers left → forward. Same direction as Chrome
and Safari, on the window under the cursor.

**Where the logic lives**: `src/utils/gestoAtrasAdelante.ts`. A swipe is not an
event the browser gives you — it arrives as a burst of `wheel` events with
`deltaX`, so they have to be gathered and judged. Three rules, each from a real
failure mode:

1. A gesture that *starts* vertical stays vertical. Without it, scrolling with a
   slightly tilted finger sent you to the previous page.
2. If something under the cursor scrolls sideways and still has room, it wins.
   Dragging a wide table is not asking to change page.
3. One swipe fires once. The trackpad keeps sending events by inertia for over a
   second; without the lock a single swipe went back three pages.

**Three places catch it**, because a swipe can land on three different things:

- inside an embedded page → detected there and forwarded to the window manager
  as `humanity:gesto-navegacion` (wheel events do not cross an iframe boundary);
- on the window's own chrome → `onWheel` on the window container;
- on the remote-browser tab → translated into the real Chromium's history.

**Two details that matter**

- `html, body { overscroll-behavior-x: none }` in `src/index.css`: otherwise
  Chrome takes the gesture first and leaves the platform entirely, closing every
  open window.
- A 500 ms lock per window in `saltarPorGesto`. The notice can arrive twice (two
  paths, or a hot-reloaded page left with two listeners) and one swipe would
  then jump two pages. The arrows keep no lock: clicking back three times fast
  is deliberate.

Verified in a real browser: back ×2, forward ×2, vertical scroll ignored, a
sideways-scrolling box keeping the gesture, and one swipe of 360 px moving
exactly one step.

## 2026-08-20 — Task board, phase 1: drag between columns, rename them, a real add button

Three of the nine cards Eugenio filed in his own **Humanity.Wiki** project (a
board that lives in production, not locally).

- **Drag a card from one column to another, like Trello.** HTML5 drag; the whole
  column is the drop target, not the gap between cards — aiming at a two-pixel
  strip with a mouse is a punishment. The card moves on screen *before* the
  server answers, and comes back with a reason if the request fails: a board
  that freezes for half a second after you drop feels broken even when it works.
- **Rename a column by clicking its text.** Edited in place, not in a dialog.
  Stored in the new `proyectos.columnas` jsonb (migration `0049`), per project.
  **The states do not change**: `roadmap_items.estado` is still
  por_hacer/en_curso/hecho, so this renames what is *read*, never what is
  *stored* — clear the name and the defaults come back with no migration.
  `NULL` means the names of always, so no existing board changed.
- **The add button is now big and centred**, with an arrow that picks the
  column. It used to be a grey `+` the size of an icon, hidden in the corner of
  one column. A plain click still creates in "Por hacer", where almost
  everything goes; choosing is the exception.

`Vision.tsx` (the platform roadmap) passes no `onCrear`, so it is untouched.

Verified in a real browser on a throwaway project: renaming persisted to the
database, a dragged card came back as `en_curso`, and a card created through the
arrow was born in `hecho`.

## 2026-08-20 — Task board, phase 2: edit the text where it is

Two more of the nine cards from Eugenio's **Humanity.Wiki** board: «doble click
en un texto de una tarjeta para modificar el texto sin necesidad de abrirlo, y
lo mismo cuando está abierto, sin tener que darle a los 3 puntitos. También
hacer más grande el pop up».

- **New `TextoEditable`**: the text *is* the field. Click and type. Enter saves,
  Escape restores, and leaving the field also saves — someone who clicks away
  after typing assumes it was kept, not thrown away. Multi-line keeps Enter as
  a newline and saves with ⌘/Ctrl+Enter.
- **Double click on a card's title** edits it without opening the card. A single
  click already did something (open the card), so opening is now deferred 220 ms
  and the second click cancels it — the same trick a file manager uses to
  rename. The delay only exists when you can edit; a read-only board opens
  instantly as before.
- **The card became a `div role="button"`.** A `<button>` cannot legally contain
  an `<input>`, and focus behaves badly when it does.
- **Inside the card, title and summary are edited by clicking them.** The
  three-dots menu and its `editandoTexto` mode are gone: they were three steps
  to fix one word, and the menu had nothing else in it.
- **The pop-up is now `max-w-4xl` / `92vh`** — a task with notes and screenshots
  did not fit in half a screen.

Verified in a real browser: double click opened the field and no card; a plain
click still opened the card; the new title reached the database from the board
and from inside the pop-up; the pop-up measures 896 px and has no three-dots.

**Paused here** at Eugenio's request. Four of the nine cards remain: editable
tags wired to the filter with `@`, people and projects on a task, drag a menu
item onto Tareas to create a linked task, and the "Áreas" menu section with the
14 objectives.

## 2026-08-20 — Prompt caching: the stable half of the system prompt now costs 10%

First step of the cost plan Eugenio approved: **caché → medición → contexto
dinámico → routing → RAG**.

The assistant's system prompt was one string re-sent whole with every message.
It is now built in two parts (`buildSystemPrompt` returns `{estable, variable}`):

- **`estable`** — identity, rules 1–5, the graph/map/calendar instructions and
  the response format. Byte-identical across all calls of all users, so the
  Anthropic cache is shared platform-wide: the first call writes it (25%
  surcharge), every later call within the window rereads it at 10% of the input
  price. The only interpolation allowed is `UI_EVENTS`, a server constant.
- **`variable`** — today's date, the screen state, the user, the retrieved
  fragments, the published-graphs list, and rules 6–8 (level, edit mode, web
  search). Sent after the cached block, paid normally.

The date had to move out of the head of the prompt: `toISOString()` changes
every second, and one changing byte at the top would have made the cache never
hit while still paying the 25% write surcharge on every message.

`provider.ts` gained `systemEstable` on the request (Claude marks it
`cache_control: ephemeral`; Gemini just concatenates — it has no such cache),
prices the three input buckets (normal 100%, cache write 125%, cache read 10%),
and reports `cacheReadTokens` in the result and in the chat `usage` payload.
The Juego Vital prompt is not split: the character's identity is interwoven
throughout, so there is no shared prefix worth caching.

Measured live with two real messages: the second read **1,657 tokens from
cache** and cost 0.437 céntimos vs 0.978 for the first — 55% cheaper. The
saving grows with conversation length, and the stable block will grow the
saving further once the retrieved context shrinks (next step: contexto
dinámico). Test conversation, charges and session deleted afterwards.

## 2026-08-20 — Three-tier model router: two free open models, Claude covered for verified users

Steps 2 and 3 of the cost plan (open provider + router), as Eugenio decided:
three models by complexity, the expensive one only for premium, two free.

**What ships**

- `TogetherProvider` in provider.ts: OpenAI-format connector (the de facto
  standard), always streaming — Qwen3.7-Plus returns 400 without it, measured
  live. Key via `TOGETHER_API_KEY` (or neutral `ABIERTO_API_KEY` +
  `ABIERTO_BASE_URL` to switch provider without code).
- Catalog: `abierto-rapido` (DeepSeek V4 Flash, $0.14/$0.28 per Mtok) and
  `abierto-medio` (Qwen3.7-Plus, $0.32/$1.28), both `gratis` — platform
  absorbs; user pays 0. All paid models now carry `nivelMinimo: 2`.
- `elegirModelo()`: deterministic router (see 03_DECISIONS). Premium (level
  2+) gets Claude covered, capped by `AI_TOPE_PREMIUM_CENTS` (300 ¢/month
  default); over the cap it downgrades to the free medium model and says so.
- Without the Together key everything behaves exactly as before — the router
  only activates when the provider is ready, so the deploy is safe either way.
  The key reached production via a GitHub secret injected into
  `.env.production` by the deploy workflow (rotation = change secret, deploy).
- UI: "Automático (recomendado)" option, "gratis"/"incluido"/"verificados"
  badges per model, aviso bubble when the router downgrades, and "gratis"
  instead of "0,0000 €" in the per-message cost line.
- Charging: `cost_cents` is always the real cost (feeds the admin panel and
  the monthly cap); `fee/total` are 0 for `gratis` and `cubierto`, unchanged
  for `de_pago`.

**Measured live** (all three rungs, then data deleted): short question →
DeepSeek Flash, 0.07 ¢ platform cost; "Apúntame una reunión…" → Claude
covered, CREATE_EVENTO proposed, 1,657 tokens read from prompt cache; long
chat → Qwen streaming, 0.23 ¢. Router unit-tested on 12 edge cases (level
gating, cap exhausted, PDF, web search, no-key fallback): all green.

**Two bugs found while testing**: a Python-written `\b` became a literal
backspace, so the action-verb regex never matched (rewritten); and the golden
rule («si dices que lo has hecho, el bloque es OBLIGATORIO») moved to the END
of the variable prompt — after the cache split it sat too far from the end and
Claude went back to saying "te la apunto" without the block.

## 2026-08-20 — A task's responsable can be one of your personas, and can change

Eugenio: «permite cambiar el responsable de una tarea» (plus the board card
«permite añadir personas … a las tareas»).

- Migration `0050`: `roadmap_items.responsable_agente_id` → a persona
  (`game_agents`), because the people Eugenio works with (Anita, Javier…) are
  personas, not platform accounts. `autor_user_id` is untouched: who created
  the card is history and stays; the ficha shows the autor when there is no
  encargo. No FK on purpose — personas archive, never delete.
- PUT `/api/roadmap/:id` accepts `responsable_agente_id` (null clears it) and
  verifies the persona is YOURS — assigning someone else's persona would write
  into their world. Bogus ids get «Esa persona no existe o no es tuya».
- Both list queries join the persona (name/photo/icon); `/api/tareas` sends
  `responsable`/`responsableFoto` per task.
- UI (`SelectorResponsable` in TableroKanban): the Responsable box in the
  ficha opens a dropdown of your personas — loaded when the dropdown opens,
  not when the ficha opens — with photos, «Sin responsable» first, and the
  card footer now shows the responsable (photo + first name) before the autor.
  The local patch merges into the ficha state so the new name shows instantly
  (the PUT returns the row without its JOINs).

Bug of the day: an index-based edit inserted the `game_agents` join twice into
one query («table name "ag" specified more than once») while leaving the other
query without it. Verified live end-to-end (set Anita via API, switched to
Javier in the real browser, cleared, bogus id rejected); test card deleted.

## 2026-08-20 — Measurement, the model button at the bottom, and the «IA» tool

Three of Eugenio's requests in one pass.

**1. La medición** (step 2 of the cost plan). Migration `0051` adds
`ai_proposed_actions.model`: the router means one conversation can pass through
three models, so «which model proposed this action» could no longer be inferred
— and pairing by timestamp would be guessing, which is precisely what
measurement exists to stop. Rows older than the migration keep NULL and are
reported apart rather than attributed retroactively.

`GET /api/ai/medicion?dias=N[&todos=1]` crosses `ai_usage_charges` (what was
spent) with `ai_proposed_actions` (what was right) per model, and returns
acierto (correctas/propuestas) and **coste por acción correcta** — the figure
that actually compares models. No metrics table: duplicating the number
guarantees the two disagree one day. Admins can see the whole platform.
`PanelMedicion` renders it: totals, a per-day bar, and a card per model.

`coste_por_accion` is null unless the model has BOTH cost and hits — otherwise
the pre-migration rows showed «0,0000 € por acción correcta», which reads as
«free» when it means «unknowable».

**2. El botón del modelo, abajo y con nombre.** Moved out of Ajustes (not
duplicated) to sit beside Adjuntar/Dictar, where the decision is actually made.
On «Automático» it names the model that answered the last message — with the
router that changes per message, which is exactly what «el modelo que está
utilizando» means. Uncatalogued ids (the platform default `claude-sonnet-4-6`
has no catalogue entry) show raw rather than staying silent.

**3. La herramienta «IA»** (`/ia`, menu + route + tab icon + full-bleed).
`AIAssistant` gains `modo="pagina"`, which reuses the existing `panelBody` —
the same block that already served desktop and mobile. No second chat: that
would be the fourth face of the same assistant, the mistake that cost the three
«Universo» pages. Layout does not mount the floating assistant on `/ia`,
because that page already IS the assistant. Chat left, spending panel right;
tabs below `lg`, where two columns do not fit.

**The bug this uncovered, and it was expensive**: the UI hardcodes
`searchWeb = true` with no toggle, and web search is a Claude-only tool — so
rule 3 of the router sent **every** message from a verified user to Claude.
«hola» went to the expensive model. The router now decides web search itself
(`PIDE_WEB`: explicit asks, or freshness signals like noticias/precio/2026);
otherwise the platform context answers, as the prompt rules already required.
Verified live: «¿Qué es un indicador?» now lands on the free fast model.
Router unit tests: 13 cases green.

## 2026-08-20 — Task board, phase 3: tags, projects, drag-from-menu, and Áreas

The last four cards of Eugenio's **Humanity.Wiki** board.

**Etiquetas editables, conectadas al filtro, con `@`.** A task's tag IS its
`grupo` — the same thing the top filter uses and the same thing that names the
rooms of a project's building in the Mundo 3D. No parallel «etiqueta» concept
was invented: two lists saying the same thing eventually disagree, and then the
board and the 3D world show different rooms. The group chip in the ficha became
a dropdown (`SelectorEtiqueta`) that changes the tag or creates a new one, and
typing `@algo` in a new card's title opens the list filtered by what you typed,
with «Crear etiqueta «algo»» when nothing matches — picking one strips the
`@algo` from the title, because the tag is already set and leaving the text
would be noise. New tags persist into `proyectos.grupos`, so they appear in the
top filter immediately. **Still one tag per task**, as before.

**El proyecto de una tarea.** `SelectorProyecto` in the ficha moves a card to
another project — the server already knew how (the Mundo 3D ficha used it), but
the board had no way to ask. The list loads when the dropdown opens, not when
the ficha does: almost no task ever moves.

**Arrastrar del menú a Tareas.** Menu rows are now draggable whenever they are a
real element, and carry `{tipo, id, label, destino}` in a private MIME type so
nothing else on the page mistakes the drag for loose text. Each project section
in `/tareas` is a drop target: dropping creates a task named after the element,
inside that project, with an `enlace` block back to it (newly rendered in the
ficha). Dropping a **person** also sets them as responsable — a person dragged
onto tasks means a task *for* them.

**Áreas.** New menu section with the 14 objectives, each expanding to its
indicators. `GET /api/areas` (no session needed: the areas are the common
knowledge map, not anybody's). The «subobjetivos» are the 98 indicators that
already existed — the platform's chain is Objetivo → Indicador → Marcador, so
no new level was invented to say the same thing.

Verified live on a throwaway card: tag changed and created (and it showed up in
the top filter as «Pruebas Claude 1»), `@dis` offered Diseño and stripped
itself from the title, dragging «Meta Vida» onto a project section created the
task with its link block, and Áreas expanded AGUA into Acceso/Calidad/Consumo/
Disponibilidad. Test card deleted and the project's 6 groups restored.

## 2026-08-20 — The Tareas list becomes editable (the ninth card)

The one card left half-done: «permitir editar y crear las tareas desde la
página de tareas». Editing had been built on the *board*, not on the list.

- The title of every task in `/tareas` is now edited in place (the exported
  `TextoEditable`, same component as the board — not a second implementation).
- A **«Añadir una tarea…»** row closes each project's list. It stays open after
  creating: when you write one thing down, you usually write two.
- Clicking a task's circle walks its state: por hacer → en curso → hecha → por
  hacer. Both write optimistically and put the error on screen if the save
  fails.

All three respect `mio`, the flag the server already sends: you only edit tasks
in projects that are yours.

Verified live: created from the list, renamed in place, and advanced its state,
each confirmed against the database. Test task deleted.

**The Humanity.Wiki board is now complete — all nine cards.**

## 2026-08-20 — Four bugs Eugenio hit, fixed

**1. The remote browser flickered between blurry and sharp.** The loop sent a
cheap CSS-scale (blurry on Retina) frame whenever a single pixel changed and a
device-scale frame when still — so any background animation produced a constant
flicker between the two qualities, which is worse than either. Fast frames are
now reserved for when smoothness is actually needed: while you are touching
something, or when the page has changed for `CAMBIOS_PARA_MODO_RAPIDO` (4)
consecutive probes, i.e. a real video. **A single change on a still page now
goes straight to sharp**, without the blurry flash.

**2. «@» could not be typed.** On a Spanish keyboard `@` is Alt+2, so `altKey`
arrived set and the handler treated it as a shortcut, sending `Alt+@` — which
types nothing. Alt and Shift are *composition* keys, not command keys: if the
browser already resolved which character it is, that character is sent. Only
Ctrl and ⌘ are real shortcuts now. Single characters also go via `insertText`
instead of `press`, which is exact for accents and composed characters.

**3. ⌘C / ⌘X did nothing.** The remote Chromium runs on Linux, where the
shortcut is Control, so `Meta+c` was a no-op — and even had it worked, the text
would have landed in the *server's* clipboard. Both keys now ask the server for
the current selection, which comes back over the stream and is written to the
user's own clipboard, so it can be pasted anywhere.

**4. The Notion-style editor typed backwards and deleted wrong.** The active
block is `contentEditable` *and* React rendered its text as a child. Every
keystroke triggers a re-render (autosave, autoformat), React rewrote the text
node, and rewriting sends the caret to position 0 — so the next letter landed
in front of the previous one and Backspace deleted at the start. New `TextoVivo`
component: while a block is being edited **the DOM owns its text, not React** —
the HTML is captured once at mount in a ref, so React never touches the
contents again. Verified live: typing «HOLA que tal estamos» came out forwards,
and six backspaces removed exactly «stamos».

**Also**: the project page shows an initials placeholder when a project has no
icon (the icon rendered fine — the project simply had none, so nothing appeared
and there was nowhere to click to add one), and «Explorar» is now
«Publicaciones» in the menu.

## 2026-08-20 — «Editar menú»: the sidebar sections are yours now

Eugenio: «un botón de configuración del menú izquierdo, abajo a la izquierda,
donde permita reordenar las categorías y ocultar categorías enteras o
visibilizarlas si estaban ocultas, y cambiar el nombre e icono. El botón pondrá
"editar menú" con un símbolo de rueda dentada.»

The five sections were five hand-written JSX blocks in a fixed order. They are
now a list: `SECCIONES_BASE` says which exist and their factory name/icon, and
`CONTENIDOS` says what each one renders — deliberately separate, so reordering
or hiding a section never touches what is inside it.

Order, name, emoji and hidden-ness live in `ui_settings.seccionesMenu`, like the
row order already did: it is **your** preference and changes nobody else's menu.
Only what you actually changed is stored, so a section you never renamed keeps
following the platform's name if it ever changes.

`PopupEditarMenu` applies every change **live, behind the open dialog** — no
save button. Reordering blind and closing to check would be guessing. Hiding
removes nothing: the section and everything in it come back with one click,
which is what makes hiding safe to try.

`SeccionMenu` now accepts a string icon (your emoji) as well as a component.

Verified live: hiding Productos removed it from the sidebar, dragging Personas
to the top reordered it, and renaming Áreas to «Mis áreas» with a 🎯 showed up
immediately and persisted to the database. The test configuration was then
deleted so Eugenio's menu is exactly as he left it.

## 2026-08-20 — The assistant can actually do things in the app (and knows when it fails)

Eugenio hit «Unexpected token '<'…» asking the chat for something simple, and —
worse — when he asked what had gone wrong, the assistant said it had no record
of any failure. Both halves were real bugs, and testing 24 requests found four
more.

**1. The chat parsed every response as JSON, blindly.** `res.json()` before
checking `res.ok`. A 413 (body too large) returns an **HTML** page, so the raw
`Unexpected token '<'` landed in front of a person. Now the body is read as
text and parsed defensively, with a human sentence per status code.

**2. The assistant could not know it had failed** — the failure happens in the
*browser*, so nothing ever reaches the model, and «no me consta ningún fallo»
was a correct answer to a question it could not see. The last failure is now
kept client-side for ten minutes and travels in the context, with an explicit
prompt line: if asked what failed, tell them THIS.

**3. It had no action to create a task.** The catalogue had challenges, maps and
graphs but nothing for the platform's own daily objects — so «añade una tarea al
proyecto Humanity.wiki» was impossible. Added `CREATE_TAREA`, `UPDATE_TAREA`,
`CREATE_PROYECTO` and `CREATE_PAGINA`, all resolving names the way a person says
them («en el Camión camperizado») against **that user's own** rows.

**4. «Te lo apunto» without apuntar anything, again.** Fixed three times before
by moving the instruction around the prompt, and it kept coming back. Now it is
**detected instead of trusted**: if the reply promises an action and no block
arrived, the model is asked once more for the block alone. A short second call
is far cheaper than a task someone believes they have and does not.

**5. The assistant was blind to the user's own data.** «¿Qué proyectos tengo?»
answered with a platform *seed* project, because the retrieved context is the
common knowledge graph. The chat route now builds a short index of **your**
projects, pending tasks, people and upcoming events. This also makes the task
actions land in the right project.

**6. Tasks in `/tareas` were not clickable.** Clicking a row now opens its
project board with that card open (`?tarea=<id>`), so there is no second detail
view to maintain.

Tested with 24 distinct requests — basic questions, single actions, multi-step
(«un proyecto y dentro dos tareas» → 3 actions), a project that does not exist,
recurring events, accents, symbols — plus end-to-end execution confirming the
rows really appear in the database. All test data deleted afterwards.

## 2026-08-20 — «/» in the page editor, and a product block

Eugenio: «en el creador de páginas añade la opción de agregar un producto, y el
shortcut de "/" para añadir cosas, como en Notion […] y como hace este propio
chat de Claude Code».

- **`/` opens the block menu** in an empty block, filters as you keep typing
  («/tit» → the three Títulos), moves with the arrows and picks with Enter or a
  click. It filters `TIPOS_MENU` and calls the same `insertar` — no second
  catalogue to keep in sync. Only in an **empty** block: mid-sentence a slash is
  just a slash (dates, «y/o», URLs). Picking **converts** the block rather than
  adding one, which is what Notion does and what anyone expects.
- **New `producto` block**, cousin of `publicacion`: same fields (`entityId`,
  `pubTitulo`, `pubUrl`) because it is the same idea — a platform object
  embedded — and duplicating fields duplicates the bugs. It opens the existing
  picker pointed at `/api/products`, and renders as a card linking to the
  product in the market.

Verified live: `/` listed all 14 types including Producto, «tit» narrowed to
three, Enter turned the block into a Título 1 leaving no «/tit» behind, and
`/prod` opened the picker with real products in it.

## 2026-08-20 — Page editor: white screen on ⌘A, and text shown twice

Two bugs from the Tester, same root cause, and the root cause was mine — the
half-fix I shipped this morning for «typing backwards».

**The root**: the editing block is `contentEditable` *and* React was still
rendering a child into it (`TextoVivo`'s span). Two owners for the same DOM.
The browser adds, moves and deletes nodes as you type; React keeps pointers to
nodes it believes are its own. From there:

- **B17 (white screen)** — ⌘A inside a block selected far beyond it; typing over
  the selection made the browser delete nodes React had pointers to, and React's
  next `removeChild` threw `NotFoundError`, taking the whole app down. The
  person lost the block they were writing.
- **B16 (text shown twice)** — on blur React re-rendered the read-only view
  *next to* the text nodes the browser had created, so «PRUEBA» read
  «PRUEBAPRUEBA». Only on screen: what was saved was always correct, as the
  Tester confirmed.

**The fix, properly this time**: `BloqueEditable` renders a div with **no React
children at all**. The text is written once at mount through a ref. As far as
React is concerned the element is empty, so it never reconciles inside it and
the browser is free to do whatever it wants. Plus ⌘A is intercepted and scoped
to the block, which is what every editor does anyway.

Verified with **real keystrokes** (not synthetic events, at the Tester's
request): typed PRUEBA, clicked away → one PRUEBA; ⌘A selected only the block,
typed over it, clicked away → app alive, text replaced, no `removeChild` in the
console.

**Also in this batch**
- **B1** — unknown `/api/*` routes returned **200 with the SPA's HTML**, so any
  client asking for JSON got `<!doctype html>`. That is the same failure that
  put «Unexpected token '<'» in front of Eugenio. Now `404 {error}`.
- **B5** — restored desktop windows opened *on top* of whatever URL you arrived
  at, so `/proyectos/aptera` showed the previous session's desktop and no link
  in the platform was shareable. A path with two or more segments is a link to
  something specific: windows come back **minimised**, one click away in the tab
  bar.

**B2 checked and NOT a bug**: `/api/proyectos` without a session returns 5
projects and **all five are `publico: true`**. The filter (`p.publico OR
creador = me`) is correct; no private project leaks. «Camión camperizado» is a
local project and is not in production at all.

## 2026-08-20 — Bug batch from the Tester: menu, board and Archivos

- **B3** — the work sidebar was rendered to anonymous visitors, even on
  `/login`, telling someone who had not signed in «Todavía no tienes
  proyectos». Without a session there is nothing to list; showing the empty
  scaffolding does not inform, it confuses. Now it needs a session.
- **B6** — the «+» beside PROYECTOS opened the index, which is what the section
  name already does. It now opens the create dialog (`/proyectos?nuevo=1`).
- **B7** — creating a project never told the sidebar, so it kept saying
  «PROYECTOS 4» until a full reload. It dispatches `humanity:menu-cambiado`.
- **B8** — window tabs were titled with the slug prettified («Ai mejoras rwkc»)
  instead of the real name («AI - MEJORAS»). `/api/ruta` now returns the
  project's title; the client stopped doing typographic repairs on a slug.
- **B9** — the new-project dialog had no `role="dialog"` / `aria-modal`, so a
  screen reader read it as more page.
- **B10** — Escape now closes the column dropdown.
- **B12 / B13, same root** — the toolbar's «Tarea» button inserted an untitled
  task instantly with no dialog, while the green «Añadir tarea» beside it opened
  a form: two near-homonymous buttons behaving differently. And it wrote
  `grupo: 'general'`, which is in no project's list, so the card rendered with
  the *first* group's label and colour while that group's counter said 0 and
  filtering by it did not find the card — three places disagreeing about one
  task. Now the button opens the same form, the server picks a group that
  exists, and `grupoDe` shows the real group in grey instead of falling back to
  `grupos[0]`. **A card can no longer lie about its label.**
- **B15** — a new note landed behind the fixed composer; the ficha now scrolls
  to it.
- **B19** — every window was labelled «Esquemas», so a project's page appeared
  attributed to a graph it does not belong to. Origin is now real: a graph if it
  hangs from one, «Páginas» if it is a page, and the context shows its project.
- **B20** — the type filters mixed «Nota» and «Documento» with raw ids
  («pagina», «wikipedia», «presentacion»…). Added the missing labels, and an
  unknown type is at least capitalised rather than printed raw.
- **D5** — the «PRIORIDAD MEDIA» badge was decorative: the field existed and was
  asked for at creation, but re-prioritising — the most frequent thing on a
  board — was impossible. Three buttons, same values as the form.

**B2 closed as not-a-bug** (no leak: the filter is correct). I was wrong about
one detail and the Tester corrected me: «Camión camperizado» *does* exist in
production as a private project. It does not leak, but it is not local-only —
I should have checked instead of inferring it from the anonymous listing.

## 2026-08-20 — B22 + B26: the AI reads the platform, and cannot claim what it did not do

Two bugs the Tester found from opposite sides, and they were the same bridge
between the model and the data: it could not READ the content (B22) and it
narrated writes that never happened (B26).

**B22 — «Pregúntame sobre cualquier cosa de la plataforma» was a promise the
product could not keep.** Retrieval came from `ai_knowledge_chunks`, which only
indexes the *common* knowledge (retos, soluciones, productos…) and is rebuilt by
hand. Nobody's pages, graphs or task notes were in it. The assistant saw the
container («this project has 3 tasks») and not the contents — «mis sensores no
alcanzan a leer el texto interno» was literally true.

New `contenidoPropio()`: a **live** search over that user's own pages and task
cards, matching the words of the question against title *and* body (the text
lives inside `config->bloques` / `bloques`). Live on purpose — an index you have
to rebuild is stalest exactly when it matters, right after you write something
and ask about it. It sends up to 4.000 characters per page rather than a
two-line summary, because the question is usually about a figure buried in the
middle, and trimming is precisely losing it.

Verified against the Tester's own acceptance case: asked about the gap between
the headline range and the energy balance in a page, the assistant answered
**«54,2 km: el titular promete 120 km, pero con la batería de 4,08 kWh y 62
Wh/km da 65,8 km»**, citing the page. That is the 4,08 kWh they asked for.

**B26 — the model said «ya he clavado esa tarea» and no task existed.** The
mechanism was not missing (the action fires, executes and lands in the right
project — verified end to end). What was missing is that **nothing forced the
words to match reality**:

- If the reply promises an action and none arrives even after the retry, the
  text is now **corrected**: «No he podido crearlo…». Leaving a bare «ya está»
  is worse than an error, because the person walks away believing they have a
  task — and is then offered menus to spend more messages on a false premise.
- `/decide` returns `enseñar` (name + link) built from the **server's**
  `entityId`, and the chat renders a card per thing actually created. **If the
  card is not there, nothing was created** — no matter what the prose says.
  (This is D13, and it makes the class of bug visible rather than silent.)

The rule, in one line: **success is decided by the data that comes back, never
by the narration.**

## 2026-08-20 — B27: the figure is decided by the source, never by plausibility

Reported as «the AI invents technical data»: it answered «120 km» where the
project says 90 km/día, apparently confusing it with «120 kg en vacío» in the
same sentence, and quoted a speed of «45 km/h» that exists nowhere.

**The reported symptom was an artefact of my own test.** The page I used to
verify B22 was one I wrote by hand, and it contained «45 km/h» and «120 km»
verbatim. The assistant quoted them faithfully. My mistake was the test itself:
a page that already contains the answer proves the model can read, not that it
will refuse to invent. **A test that cannot fail proves nothing.**

**But building the real trap uncovered a genuine bug underneath**: the context
carried only each project's *name* and pending count — never its `descripcion`
or `vision`. The assistant could not answer about a project's characteristics
even when its owner had written them down. Measured before touching anything:
asked for the range it replied «no hay ningún dato… no voy a inventar un
número» — passing, but for the wrong reason.

Fixed: projects now travel with their description and vision, and the stable
prompt gained four rules, deliberately at the end where they weigh most:

1. **Name the source of every figure** — «90 km/día (descripción del
   proyecto)». If you cannot name the source, you do not have the datum.
2. **Read the unit before using the number.** The «120 kg en vacío» / «90
   km/día» case is written into the prompt as a literal example: a concrete
   example beats an abstract rule, and confusing mass with range in an
   ultralight-vehicle project is the most expensive mistake available.
3. **Never invent intermediate values** to close a calculation. Missing the
   speed, the efficiency or the sun hours → say so and ask.
4. If only part of the data is there, do the part you can and say what is
   missing.

Verified against the trap (a project whose description holds both numbers in
one sentence): «90 km/día … (según la descripción del proyecto)», calling the
120 kg mass; «no puedo darte el número sin la velocidad de crucero, ese dato no
está en la plataforma»; and «no tengo ese dato», quoting what does exist. **This
is now a fixed regression check to repeat on every prompt change.**

Team rule adopted from this: when anyone reports a figure, say where it comes
from — production or local, and which project or page. Three of today's
disagreements came from comparing numbers across environments without saying
so. It is the same rule we just gave the assistant.

## 2026-08-20 — Four bugs with one disease: nowhere to put what was asked for

The Tester found five failures that looked unrelated. They are one illness: **the
platform had nowhere to store what the assistant was asked for, so the model
filled the hole with prose.** Not «the AI lies» — «the AI was asked for something
the product could not hold».

**B34 — a task asked for as «Tecnico» was saved as «Producto».** Written without
the accent, it did not match the label «Técnico», and the code fell back to the
project's *first* group, silently. This is **the same `grupos[0]` defect as B13,
which I fixed this morning in the rendering and left alive in the writing** — I
fixed the symptom where it showed, not where it started. Matching is now
accent- and case-insensitive, and when nothing matches it says so, listing the
labels that do exist: «No hay ninguna etiqueta "Marketing"… (tiene: Producto,
Diseño, Técnico…). La he dejado en "Producto".»

**B32 — the card for what was created.** Two separate things. Mine existed but
was a `<button>` with `navigate()`, so the Tester's DOM search for links found
nothing and concluded there was no card: both of us were right. It is a real
link now. And the action block said «Crear una tarea en un proyecto» — the kind
of operation, not the thing — so it now leads with the title and carries the
detail: «ZZZ medir irradiancia · Camión camperizado · Tecnico · prioridad
alta». **With that detail, B34 would have been visible on first use** instead of
needing three checks.

**B31 — a correct figure attributed to a page that does not exist.** With the
new source-citing rule, a false attribution is *more* dangerous than none,
because the reader now trusts the citation. The prompt may only name pages,
tasks and projects present in the context, by their exact title; and when it
knows a number but not its origin, it must say so.

**B23 — a map of five test sites showed the generic indicator world map.** The
cause was not the model: **a user map could only ever be a view of the humanity
map** (territory + level + indicator). There was no concept of a point, so the
AI wrote the five places into the description — the only text hole it had — and
the map kept showing something else. Maps now take points with name,
coordinates and value, validated (no lat/lon, no point), rendered by a new
`MapaDePuntos` with its list beside it; and if points were asked for and none
survive validation, it refuses to publish and says why.
A nuance found while testing: the first version was too cautious and asked for
coordinates it plainly knows. It may now use its own knowledge for known places
**while declaring it** («coordenadas de conocimiento general») and only ask for
the ones it cannot place. Declaring the source is the rule; refusing to know
things is not.

**Next**: give the same test to the three capabilities not yet audited —
`CREATE_KNOWLEDGE_GRAPH`, `ORGANIZAR_CARPETAS` and the UI events — by asking for
something the platform cannot store and seeing whether they say so or narrate it.
The third is the worrying one: an event with an id that does not exist fails
invisibly by design.

## 2026-08-20 — Closing the queue, and the rule written down

**B40** — the SPA catch-all answered `index.html` to *everything*, so
`/sitemap.xml` and `/manifest.json` returned 200 with HTML to the crawlers and
browsers that ask for them. A path **with an extension** asks for a file, and
`express.static` has already had its turn above it, so if it reaches the
wildcard the file does not exist: 404. Without an extension it is an app route,
unchanged.

**B25** — anonymous callers no longer receive `creador_user_id` (nor
`created_by`/`updated_by`) from `/api/proyectos`. Not a leak — the projects
listed are the public ones — but an internal user id is no use to a visitor and
is of use for correlating people across records.

**B24** — clicking outside the create dialog discarded whatever had been typed.
It now asks first when there is something written, and closes silently when
empty. Somebody's writing is not thrown away by a stray click.

**B60** — the panel resize handle listened for `mousemove`/`mouseup`, which a
finger never fires: dragging the edge on a touch screen did nothing at all.
Pointer events cover mouse, finger and pen at once, plus `touch-action: none`
so the browser does not steal the gesture as a scroll, and `pointercancel` so
the panel does not stay glued to a finger that left the screen.

**B63 — a bug that depends on the model behaving is postponed, not fixed.**
`applyUiEvents` navigated with whatever id arrived. Tested with an invented
territory the model refused on its own — but that is luck, not protection. The
destination is now checked against the territories the app already has loaded
(no extra request), empty ids never navigate, and when the target does not
exist it says so instead of landing on an empty map in silence.

**B35 — Stripe was loading on pages that sell nothing.** A static
`import … from '@stripe/stripe-js'` injects `js.stripe.com/v3` on import, so the
third-party script and its iframe were live on `/tareas`. Now imported
dynamically at the moment someone actually pays. Measured: `js.stripe.com` has
left the main bundle into a 2,6 kB chunk. **The ~1 MB the Tester measured was
the runtime script, not the bundle** — the 3,7 MB main chunk is a separate
problem and is untouched by this.

**And the rule is now written into `src/server/CLAUDE.md`** as a design
principle with the six cases as concrete examples, so whoever touches the AI
module next does not repeat them.

## 2026-08-21 — The card that lied, the word that hijacked, and a purge that was never needed

**B36 — asked for a task, wrote a document.** The cause was never in the model:
the client has a branch that detects «documento|informe|dossier…» plus intent to
create, and *takes the request away* to write a page. «Crea una TAREA … del
dossier de prensa» triggered it on the word «dossier» and the message never
reached the AI. Naming the artefact is an **instruction**; the content is only
subject matter — «una tarea», «un mapa», «un proyecto» now beat any loose word
about the topic.

**B32 — and a worse bug found while checking it.** Locally the card is an `<a>`
with the full detail (verified in the DOM), and its class is present in the
production bundle, so the Tester was most likely running a cached bundle. **But
while proving that, I found my own card was lying**: asked for «grupo
Marketing», the server correctly stored «Producto» — and the card said
«Marketing», because it was built from what was *requested*, not what was
*saved*. The piece that existed to make this class of bug visible had the bug
inside it. The action now returns what it actually stored, and the server's
notice («No hay ninguna etiqueta "Marketing"… la he dejado en "Producto"») is
shown in the chat instead of only travelling in the response.

**The purge that was never needed.** 32 files have been deleted from `public/`
in the repository's whole history. All 32 verified against production: **32
return 404, zero return 200.** Nothing to purge, and the deploy does not
accumulate — the Dockerfile rebuilds `public/` from the repo into each image.
What existed was a bug that made it impossible to know the problem did not
exist: any missing file answered 200 with the SPA's HTML, so a 200 was read as
«the file is still there». Fixing B40 made the symptom disappear on its own.

**No destructive command was run.** A task open for days, ordered explicitly and
inherited across two dead sessions, turned out to be an artefact of a missing
404. This is now the fifth and most expensive case in the root-principle table.

## 2026-08-21 — The archive: files that stay

Eugenio approved this after the Tester's complaint, which named the gap exactly:
«puedo enseñarle mi informe de CFD a la IA una vez, pero no dejarlo colgado del
proyecto para que mañana lo abra otro».

Uploading already worked in four places. What was missing was **memory**: a file
went in, got used once, and could never be found again. Migration `0052` plus a
new `archivo.ts` with three routes — attach, list, remove.

Five decisions worth keeping:

- **The bytes do not move.** They stay in `/data/uploads`, the Docker volume
  that already works and lives outside the repository (verified in production
  the same night). The table only records what each file hangs from. A second
  store would have been a second place to lose things.
- **A file hangs from exactly one thing** — project, task or page — and that is
  a database CHECK, not a convention. Two containers and the row does not go in.
- **Permissions are inherited, always.** Every query asks about the
  *container*, never about the file, so there are no two truths that can
  disagree. The day a project flips from private to public its files follow,
  with nothing to migrate. Not just simple — impossible to desynchronise, which
  is better than correct-today.
- **Only `/uploads/` paths are accepted.** Without that, anyone could hang an
  external URL off a project and the platform would present it as its own file.
- **Archived, never deleted, and the bytes untouched**: a page or a chat message
  may point at the same file, and deleting it would leave a hole in places this
  module knows nothing about.

Verified end to end with a real upload: attach → list → it comes back with name,
class, size and who uploaded it. External URL rejected; two containers rejected.
And the permission test on a **private project created through the product's
normal path** — applying the rule written two hours earlier, which is exactly
what stopped me measuring the wrong thing again: owner 200 and sees the file,
another user 403, anonymous 403, and the other user cannot attach either.

Also in this batch: **D18**, the created-item card now links to the task itself
(`/tareas?tarea=<id>`) and opens in a new tab, because with 136 tasks a link to
the index is barely a link; and **B39**, the card shows the group's *label* and
never the raw id («Diseño», not «Diseno»).

## 2026-08-21 — The persistent archive gets its visible half

`archivo.ts` gave files a place to live but no door to walk in through. Three
doors now exist, all the same component (`src/components/archivo/Adjuntos.tsx`):
the project page, the task card in the kanban, and the foot of a page in the
editor. One component, so a bug in attaching is one bug and not three.

Attaching is two calls that look like one: bytes to `/api/uploads` (which
already knew about types and sizes), then `/api/archivo` to record what they
hang from. Nothing that already uploaded files had to learn about containers.

Also allowed `text/plain`, `text/markdown` and `.tsv` in `uploads.ts`. They are
served as downloads like everything else, and refusing them forced you to zip a
notes file to be able to keep it, which is absurd.

On a page, the section only appears once the page exists. A page that has not
been saved has nothing to hang a file from, and offering the button would be
promising something that fails when pressed.

## 2026-08-21 — B90: the remote browser stopped pixelating while you scroll

Eugenio: «cuando en el navegador se hace scroll down de una página de internet,
se pixela ya que no se refresca bien y queda fatal».

The refresh was fine. The frame sent during movement was captured at CSS scale,
which on a Retina screen is half the linear resolution, and the client `<img>`
stretched it back over the full box — one sent pixel covering four on screen.
Pixelation by construction, which is why it happened every single time.

Measured on Wikipedia at 1000×700, Retina:

    css    q50 →  43 ms    93 KB   1000×700
    device q40 →  71 ms   199 KB   2000×1400
    device q70 →  70 ms   321 KB   2000×1400

The way out is in the same numbers: at full resolution the *quality* setting
costs almost no time (71 ms at 40, 70 ms at 70) — what costs is rasterising
twice the pixels. So the movement frame now goes at full resolution with low
quality: paid in kilobytes, not in stutter.

Half resolution is kept for what animates on its own (a video, a carousel),
where the eye wants smoothness over detail and there is no text to read. When
*you* are the one moving the page, you are reading.

Measured cost of the change, scrolling for 3 s: 11.3 → 9.3 frames/s and
1.14 → 2.19 MB/s. 18% fewer frames for four times the pixels.

Also: one capture per loop instead of two. The frame is now its own change
probe, so raising its resolution did not double the work.

## 2026-08-21 — An open write route in production, closed

`POST /api/map/territories` required no session. Anyone on the internet could
insert rows into `territories`.

Found while collecting facts for the tech-debt list, not by a bug report.
Verified against production with a probe that creates nothing (empty body, so
it throws before the INSERT):

    POST https://humanity.wiki/api/map/territories  ->  500 "coordinates is not iterable"
    POST https://humanity.wiki/api/data/challenges  ->  401

The 500 is the point: the request reached the handler body. The 401 next to it
is the control — that route does have a guard.

It escaped the PR #23 sweep, which closed the four `/api/data/*` routes. This
one does the same thing (creates a territory) but sits 900 lines further down
in `server.ts`, and a sweep done by reading misses things in a 2.056-line file.
Now behind the same `requireAdmin`.

Every write route in the seven modules was swept for the same defect. There
were no others: `finanzas.ts` uses `requiereSesion`, the remote-browser routes
check session ownership, and the `auth.ts` routes are public on purpose.

## 2026-08-21 — D91: the real cost of every answer, in the chat

Eugenio: «quiero que en el chat de IA aparezca el coste de cada petición en la
respuesta, aunque sea gratis para el usuario, que diga cuál ha sido el coste».

The line under each answer said «gratis» and nothing else. Free *for you* is not
free *for the platform*, and saying only the second was telling half the truth.

It turned out the data already reached the browser and was being thrown away:
the server sends `costCents`, `durationMs`, `cobro` and `motivo` on every reply,
and the client kept only the model and `totalCents` — what the person pays,
which is zero almost always. Nothing new had to be measured. It had to stop
being discarded.

Now: `0,074 ¢ · Rápido · 1,3 s · gratis para ti`. What it costs to produce
first, because that is what was asked for; whether you are charged, last.

- In cents, not euros. An answer costs tenths of a cent; in euros it reads
  «0,0007 €» and nobody parses that. Under 0,01 ¢ it says «< 0,01 ¢» rather
  than «0,00 ¢» — a rounded zero reads as free, and it is not.
- No cost datum → «coste no registrado», never a zero. A false zero in a money
  figure is worse than a hole: the zero looks like a measurement.

Both branches verified in the browser: the normal one against a real answer,
and the missing-data one by stripping `costCents` from the response in the
client so the honest path was actually exercised rather than assumed.
## 2026-08-21 — Mobile, phase 1: a breakpoint, a drawer, and no windows on a phone

The platform had no mobile design at all — the only mobile-aware code in the
tree was the 3D game's. What existed was the desktop layout squeezed. The proof
is the Tester's rotation test: in landscape (844px) everything fits and works,
in portrait (390px) it breaks. At 844 the app believes it is on a computer, and
it is right, because nothing ever told it otherwise.

**`useEsMovil`** is now the one place that decides, by width (768px, Tailwind's
`md`) and by height. The height half was not in the original design and was
found by testing the 3D world: an iPhone 12 in landscape is 844×390 — wider
than 768 — so rotating the phone brought the desktop sidebar back and left the
world in 332px. Any viewport under 500px tall is a phone lying down.

**B41/B3 — the sidebar becomes a drawer.** 240 fixed pixels of a 390px screen
was 62% of the display for the menu, leaving 118 usable. On `/login` that meant
the first screen of the platform on a phone was the one that stopped you
getting in.

**No half-collapsed state any more** (Eugenio, 2026-08-21), on desktop too: the
56px icon rail is gone at both sizes. Since nothing is left on screen to say
the menu still exists, the way back is a 52px button carrying the word "Menú",
and it lives *in* the top bar, which grows to 56px while the menu is hidden. It
floated first, and a screenshot showed it covering the first three folders of
`/explorar`.

**B21 — no lying while loading.** For the ~5 seconds the 3.7MB bundle takes,
`user` is null and the bar was rendering "Iniciar sesión" to someone who was
signed in: on the first contact of every visit, the platform told the user they
had lost their work.

**B28 — windows do not exist on a phone.** Every window is an iframe of the
whole app; five were measured alive in one tab at 390px. Below the breakpoint
`abrirVentana` becomes `navigate`, so the ten callers stay untouched and the
branch happens in one place.

**B37 — the folders panel** on `/explorar` was another 224 fixed pixels next to
the 240 of the sidebar. On a phone the same folders are a horizontal strip.

**B63 — a card's map** is an iframe of the whole app, and `/explorar` has 92
publications, so these open themselves as you scroll rather than one at a time.
The frame now lives only while it is near the screen.

### The rule this phase is built on

**The mobile branch reads the desktop's state and never writes it.** Not the
open windows, not the menu preference. Without it, glancing at the platform
from a phone would quietly wipe the desk you come back to — damage nobody would
ever have attributed to the phone. Verified: two windows opened on desktop,
survived a mobile visit and a mobile navigation untouched, and came back.

### Measured, on a real session at 390×844

Content lane 118px → 390. Off-screen interactive elements on `/explorar` 107
(89 of them genuinely clipped) → 22, with one clipped and none zero-width.
Drawer 288px with a 44×44 close button, closing on backdrop, Escape, its button
and navigation.

### What the browser here cannot test, and it matters

The integrated browser reproduces an iPhone's *size* faithfully and its
*behaviour* not at all: it fires no `resize`, no `matchMedia` change, and no
`IntersectionObserver` callback. Anything reacting to a viewport change must be
verified by RELOADING at each size, never by resizing live — and lazy-loading
cannot be verified here at all. A bug reported from live-resizing in this
browser is not a bug.


## 2026-08-21 — D90: project icons are drawings, not letters

Eugenio: «haz que los iconos sean siempre en blanco y negro y que no sean
letras […] cuando se cree un nuevo proyecto, haz que el icono se guarde
automáticamente en función del nombre del proyecto».

A project with no icon used to show its initials. Now it shows a stroke icon
chosen from its name.

**A dictionary picks it, not the AI.** Asking a model would cost money on every
creation, take seconds, and could return the name of an icon that does not
exist. A dictionary is right about what it knows and wrong predictably.

**No match → the generic icon.** Not a random one, and above all not «the first
in the list» — that is the `grupos[0]` failure that cost B13 and B34. A neutral
icon is the honest way to say «I don't know what this represents».

Two things came out of *running* the dictionary rather than reasoning about it:
«Coche ultraligero solar volador» gave a SUN, because «solar» sat above «coche»
— the thing is the car and the rest describes it. And «Consolar a los vecinos»
proved the word-level match works: it gives the community icon, not a sun,
which is why «Villabosque» stays generic (it contains «bosque» but does not
start with it, and loosening that would break «consolar»).

**Nothing was migrated, deliberately.** A generic SQL migration would be a
second copy of the dictionary, able to contradict the first the day someone
adds a word. Instead the fallback lives in the server (`menu.ts`,
`calendario.ts`) so every reader gets it from one implementation. The calendar
was the third reader, found by looking for everyone who read the column rather
than stopping at the two obvious ones.

**Emoji are gone from the picker**, which is what makes it honest to replace a
legacy emoji on a project with its stroke icon: no one can create that state
any more. The popup previews the same icon the page shows, so the same thing
does not have two faces depending on where you look at it.

53 icons, imported one by one from `lucide-react` (already a dependency, 5.592
icons). Only those 53 enter the bundle. They use `currentColor`, so one icon
serves light and dark without a second version.

## 2026-08-21 — B70: the page editor saves by itself and now keeps what it replaced

`entity_history` was well built — full snapshot, what was there before, who
changed it — and had exactly one writer: the generic `/api/data/:entity` route
in `server.ts`. The page editor does not go through it. It saves with
`PUT /api/windows/:id`, which did `version = version + 1` and never wrote a
snapshot.

That is a lie with a number attached: version 47 of a page existed as a counter
and not as content. And the editor saves **by itself every 1,2 s**. Put the two
together and you get: you select a paragraph, your finger slips, you type over
it, and seconds later that is on the server and the previous text is nowhere.

Snapshot writing moved to `src/server/historial.ts`, and `server.ts` now
delegates to it, so both paths write history with the same code and cannot
drift apart. `server.ts` lost 12 lines rather than gaining any.

**Grouped, two minutes per person per page.** One snapshot per autosave would be
~1.500 copies in half an hour of writing — nearly a megabyte per session — to
be able to return to a thousand versions that differ by one letter. Nobody
wants «how it was 1,2 seconds ago»; they want «how it was before I started
writing». Two minutes leaves ~15 snapshots and ~10 KB, and always keeps the
state before each burst.

Verified on a test page of my own, never on Eugenio's: the original text is
recoverable from `previous`, three saves inside the window collapsed to one
row, and after ageing that row past the window a second save produced a second
row. The generic route still records history after the delegation.

## 2026-08-21 — B91: the AI button stops covering content on a phone

The assistant's button was `fixed` at the bottom right, 56×56. On a desktop
there is room; on a 375 px phone it landed on top of the content. Measured on
`/personas`: the button at (295, 732), and directly under it the «PROYECTO»
label of a project card. In the page editor it covered paragraph text.

**Same case as the menu pill, resolved the same way**, because the reason
written down then is still true: «crecer 16 px una sola vez es un precio que se
paga donde se ve; tapar contenido es un precio que se paga a escondidas». Here
nothing even has to grow — the bar is already there and the button fits.

On a phone it now lives in the top bar, taking real layout space, and opens the
same assistant through a new `ai:abrir` event. On a desktop it still floats,
where it has never been in the way.

44×44, because the bar is 56 px tall on a phone and that is what a thumb hits
without aiming. This project already has «83 of every 100 buttons under 24 px»
catalogued; this is not number 84.

### A limit of our own test browser, worth writing down

The in-app browser does **not** emit `resize` or `matchMedia` `change` events
when the viewport is changed programmatically — measured: `innerWidth` went
375 → 1280 with 0 events on both listeners. So a component reading
`useEsMovil` keeps the previous branch until the page is reloaded.

This means **rotating a phone cannot be verified here**, by anyone. Reading the
hook, the code is correct. A stale branch after a programmatic resize is the
harness, not the product — and a reload at each size is the only honest way to
check a responsive branch with these tools.

## 2026-08-21 — D92: cheap models for ordinary actions, and three premium models that never worked

Eugenio: «intentar utilizar modelos baratos para tareas simples de creación
estándar de tareas y otras».

### First, two bugs the battery uncovered before it measured anything

**Sonnet 5, Opus 5 and Fable 5 returned a 400 on every single request** —
`temperature is deprecated for this model`. Three of the four premium models in
the picker failed always, not sometimes. The Claude 5 family removed the
sampling knobs (`temperature`, `top_p`, `top_k`); depth is set with
`output_config.effort`. `SIN_TEMPERATURA` is an explicit list, not a prefix
rule: taking temperature away from the default Sonnet 4.6 would change
behaviour for everyone with nobody asking for it. All four now answer.

**Asking for a model that does not exist got a different one, silently.** It
happened to me: the battery used a stale id, the router quietly fell back, and
I was one step from reporting that the good model failed all five tests when it
had never been called. Now the reply says «No existe ningún modelo «X». He
respondido con Y». A different model changes the cost and the quality of the
answer; not saying so is the interface asserting something that did not happen.

### The battery, and two tests of mine that were wrong

Five tests, from the five bugs of 2026-08-20: create the task for real in its
project and group; «Tecnico» without the accent landing in Técnico; a
non-existent group warned about, valid ones listed, and where it ended up
stated; «una TAREA» being a task and not a page; and the 120 kg / 90 km trap.

Run against Claude **as a control** — a test the good model cannot pass is
measuring the test, not the model. It scored 0/5, and both reasons were mine:
the battery never sent `edit_mode`, so the assistant sat in manual mode where
the prompt *forbids* returning actions; and the invalid-group test read the
model's prose instead of the server's answer. The server does exactly the right
thing — «No hay ninguna etiqueta «Marketing» (tiene: Producto, Diseño,
Técnico…). La he dejado en «Producto»» — which is the house rule verbatim:
success is decided by the data that comes back, never by the narration.

### The result

Three consecutive rounds, five tests each:

    claude-sonnet-5   5/5   10,63 ¢
    abierto-medio     5/5    1,05 ¢     15/15 across three rounds
    abierto-rapido    5/5    0,46 ¢     15/15 across three rounds

Short, ordinary actions now go to the free model. Through the router, with no
model forced, the same five pass at **0,93 ¢ against 10,63 ¢** — the same
result for a eleventh of the cost per correct action (0,19 ¢ vs 2,13 ¢).

**What makes this safe is not that the model gets it right — it is that the
guard rails are in the server.** The invalid group is caught by the code that
executes, not by the model's prose. A worse model can write a worse sentence
without being able to store a task in a made-up place.

Long messages (over 300 characters), PDFs and web search stay with Claude: the
battery says nothing about those because it did not measure them.
## 2026-08-21 — User databases, layer 1: columns that know what they hold

Until today there was no user database. There were pages with blocks and a
board with 18 fields written into the code, and the editor's "table" block is
plain text — nothing in it knows that 620 is a number, so it cannot be summed,
sorted, compared or validated. This is the first of three layers: types, then
relations, then formulas and aggregates.

Three tables — `bd_tablas`, `bd_columnas`, `bd_filas` — and `src/server/bd.ts`.
Five column types and no more: text, number, date, single select, checkbox. The
criterion for choosing them was not "the most used" but the ones that change
what the system can **calculate or validate**; email, phone and link are text
with an icon and a regex, and they block nobody.

### The decisions that cannot be changed afterwards

**A column is identified by its `id`, never by its name**, and so is every
option of a select. Cells are stored as `{"<column id>": value}`. The case that
settles it comes from the acceptance criterion: in the solar shipyard a
"Sentido" column with options "Mayor mejor" / "Menor mejor" decides which
direction a trial is compared in. If an option were identified by its text,
renaming it would silently invert a verdict — a wrong figure presented as a
right one, which is the worst failure this layer can have. Verified: renaming
both a column and an option left every stored value untouched.

**Column definitions are real rows, not jsonb.** Migration 0049 stores the
board's columns as jsonb and is right to: they are three labels that only mean
something inside their project and are never queried on their own. This is the
opposite case — these definitions are queried across rows, need identity, and
will be referenced by formulas. The *values* do go in jsonb, because a row's
cells are always read together.

**A row has a body from day one** (`pagina_id`). Each supplier in the shipyard
is a page holding its contract and its minutes, and that is half the value. If
rows ship as "cells only", giving them a body later means migrating data that
already belongs to users.

**Values are stored typed.** `"620,50"` is stored as the number `620.5`, a date
as ISO text. Not "everything as a string, we will convert later": that leaves
layer 3 guessing types on every read, and a parser where there should be a sum.

**A cell is never a bare `null` on the way out.** It is always labelled —
`vacia`, `ok`, `sin_calcular`, `error`. Only the first two can occur today, and
the contract still ships with all four: adding the other two later would mean
changing every client already written against layer 1. Emptying a cell is also
distinct from storing a zero.

**Permissions are asked of the containing project, never of the table or the
row**, the same shape as `archivo.ts`, so two contradicting truths about who
sees what cannot exist.

### Deliberately absent

Relations, formulas, aggregates, saved views, saved sort and filter, multi
select, person and file columns. All cheap once this model exists and expensive
before it. When relations arrive there will be **one generic links table**, not
one per relation: `CLAUDE.md` forbids new junction tables (43 of 115 already)
and a relation layer is literally a junction-table generator. Stored once, with
an index on both sides, and the reverse direction is a query — never a second
row that can contradict the first.

### The model was tested on paper before the migration

Can it express `roadmap_items`, the board's 18 fixed fields? Fifteen of the
eighteen in layer 1; the three that remain — author, project, assignee — are
relations, which is exactly layer 2, and nothing here blocks them.

### Verified against the running API

Five types created and an invented one refused. Writing "seiscientos" into a
number fails with the column named rather than storing a zero; a malformed date
and an option that does not exist fail the same way, and a failing cell aborts
the whole write so half a row is never saved. No session reads nothing and
writes nothing. Deleting a row goes to the 15-day bin. History goes through
`historial.ts` rather than a second way of writing it. All test data removed
afterwards.


## 2026-08-21 — The model picker says what each request will cost

Eugenio: «en el listado para elegir el modelo de IA no aparece el coste
estimado de las peticiones, soluciónalo».

The list said «gratis» or «incluido». That answers *«will I be charged?»*, not
*«what is this worth?»* — two different questions, and choosing a model needs
both. The catalogue already held prices, but in cents per **million** tokens,
which is a unit nobody can picture: «300» looks nothing like the cost of asking
a question.

Each row now shows what one of **your** requests would cost with that model:

    Rápido        ≈ 0,127 ¢     gratis para ti
    Equilibrado   ≈ 0,313 ¢     gratis para ti
    Sonnet 5      ≈ 3,03 ¢      incluido
    Fable 5       ≈ 10,11 ¢     incluido

An 80× spread that was invisible a moment ago.

**The estimate comes from what actually happened, not from a made-up figure.**
`/api/ai/status` measures the average size of a chat request over the last 30
days: this person's own first, the platform's if they have fewer than three (a
mean over one odd conversation is not how someone writes), and a declared
assumption only if the table is empty. It always returns *where the number came
from*, and the picker says so underneath — «Calculado sobre tus 140 últimas
peticiones (~8.418 de entrada y 339 de salida)». A figure that cannot say what
it was computed on is indistinguishable from an invented one.

Marked «≈» on purpose: the real cost depends on how much the model answers and
how well the cache hits. The exact, measured figure is the one under each reply.

## 2026-08-21 — Pending tasks: nine improvements, starting with a date nobody could see

Eugenio: «mejora las tareas pendientes».

**The due date existed and the page never received it.** `roadmap_items.vence_el`
has been there for a while and the calendar reads it, but `GET /api/tareas`
never selected it. What the page called `fecha` was `updated_at` — when it was
last *touched*, not when it is *due*. A task with a deadline looked exactly like
one without. Two different dates now travel under two different names: `vence`
and `actualizada`.

**And there was no way to set one, which is why 0 of 128 tasks had a date.** The
route existed — the calendar uses it — but nothing in the task list reached it.
Not that nobody wanted deadlines: nobody could add one. The date badge *is* the
control now; the field sits over it, transparent, so a tap opens the browser's
own date picker without adding another button to a crowded row.

The other seven:

- **Said in words, not in numbers.** «vencida hace 3 días», «vence hoy», «en 5
  días». A plazo answers *«am I going to make it?»*, and `2026-08-19` makes you
  do the subtraction yourself.
- **Sorted by urgency.** Overdue first, then soonest, then priority, done last.
  They used to come in creation order, so an overdue task could sit twentieth.
- **Overdue count at the top**, and per project even when the project is folded
  — with eight lists closed, a delay did not exist until you opened the one
  holding it.
- **Filter by priority** and **«solo las mías»**. Only the state filter existed,
  and with 128 tasks across eight projects «todas» is not a working view.
- **The header says what is LEFT**, not «3/10» — which makes you subtract to
  learn the thing you actually want.
- **The empty state names the filter that is hiding things.** «Ninguna tarea con
  esos criterios» does not tell you which of the four to undo.

Verified in the browser: setting a past date showed «vencida hace 3 días», the
top counter went to «1 vencida», and the row persisted to the database. The test
date was then removed — it was one of Eugenio's tasks, not mine.

## 2026-08-21 — Six more: a phantom entity, history on three more routes, priority from the list

**A `PUT` on something that does not exist created it.** `/api/data/:entity/:id`
does an upsert, so `PUT /api/data/challenges/ID_MAL` answered 200 and created a
challenge titled «Nuevo Reto». A mistyped id — or a screen pointing at something
already archived — left a phantom entity in the database that nobody asked for,
while whoever wrote it believed they had edited something else. Now a 404 that
says which id does not exist and that POST is the way to create. Verified both
ways: the PUT 404s and creates nothing; the POST still creates.

**Three more routes that changed things without keeping what they replaced.**
B70 fixed the page editor; the same defect lived on in `PUT /api/graphs/:id` and
in the shared publication-edit route, which touches windows, graphs and maps.
The defect was never in the page route — it was that snapshots were only written
from `/api/data/*`. All of them now go through `historial.ts`, so there is one
implementation and no second format to drift. Not grouped: these are saved when
someone presses a button, not every 1,2 s like the editor. Verified end to end on
a graph of my own — `previous` holds the old title, `snapshot` the new one.

**Priority can be changed from the task list**, the way state already could:
click cycles alta → media → baja. You could filter by priority and not set it,
which is half a tool. And «media» was never painted, so on your own task there
was nothing to click — now there always is, faded until you hover.

## 2026-08-21 — The AI moves to a dock along the bottom

Eugenio: «que crees un menú inferior de lado a lado donde esté el chat de IA con
capacidad de desplegarse hacia arriba a 1/3 de pantalla, vigilando que en
versión móvil sea útil, y ahí tener el historial de chats a un lado».

The chat used to be **two different layouts for the same thing**: a resizable
column on the right on desktop, a full-screen drawer on mobile. Two places to
fix the same bug. Now it is one dock along the bottom, edge to edge, on both.

- **A third of the screen**, measured: 0,33 on a 1280×800 desktop and 0,33 on a
  375×812 phone. Drag the top edge to change it, between a quarter and three
  quarters — under a quarter an answer does not fit, over three quarters you are
  covering the app, which is what this came to avoid.
- **The history lives to one side**, as asked. A fixed 208 px column from 768 px
  up; on a phone it slides over, because taking 200 px of width from a 375 px
  screen would leave the conversation in a gutter.
- **It closes by tapping outside**, and has its own «Cerrar el historial». The
  first version could only be closed with the same button that opened it — and
  that button sits *underneath* the panel. It opened something that covered its
  own switch.
- **The old dropdown is gone.** Two doors to the same room, and one of them
  pushed the conversation down every time it opened.

**And it reserves its own space.** A fixed element at the bottom covers what is
under it — the exact bug fixed hours earlier with the AI button (B91). The dock
publishes its height in `--hueco-muelle` and the layout leaves that much room at
the end of the page, so the last row of a table stays readable. Measured: 235 px
of padding on `main` with the dock open, 0 with it closed.

Verified end to end: sending a message from inside the dock got an answer with
its cost line, at both widths.

## 2026-08-21 — The dock is always there, which is what «menú inferior» meant

Eugenio, minutes after the previous deploy: «no veo el menú de abajo».

The deploy was fine — `--hueco-muelle` was in the production bundle. The bug was
my reading of the request. He asked for a **menu** along the bottom «con
capacidad de desplegarse hacia arriba a 1/3 de pantalla»: something that is
always there and *expands*. I built something that *appears* when you open the
chat, so unless you clicked the sparkles button there was nothing at the bottom
to see.

Now the bar is always at the bottom, 52 px, edge to edge, with the writing box
in it. Tapping it expands to a third of the screen. Measured: 52 px closed, 268
px open on a 812 px phone (0,33), and the layout reserves both — 52 px of
padding closed, 268 px open, so nothing is ever hidden underneath.

Two doors were removed in the process, both mine from earlier today: the
floating button, and the AI button in the top bar (B91). Both existed to open a
panel that was not visible; with the bar always present they were second doors
to a room whose door is already open — and the top one was far from the thumb.

## 2026-08-21 — One minimal row at the bottom, and the header gone

Eugenio, with a screenshot of Claude Code's own composer: «con el botón de "+"
para los archivos, un icono minimalista para el micro, y el modelo, todo abajo
del todo, las configuraciones que tienes arriba quítalas […] y que entonces se
quede más espacio para ver las respuestas».

**The writing box goes first and the controls under it**, not the other way
round. What you do here is write; attaching and picking a model are things from
before or after. With them on top, every time you looked for where to write you
had to skip three buttons.

**Icons, not labels.** «Adjuntar», «Dictar» and the model with its badge took
two lines of a panel that is a third of the screen — two lines less of answer.
The model name stays, because it is a datum and not a label; the words moved to
the tooltip, where they cost nothing.

**The header is gone.** It was a 90 px block with the assistant's name, the
model, a «Viendo: …» pill and four buttons: a third of the dock spent telling
you where you were. It is now a 41 px strip with «Viendo» as one line and three
small icons. The «Viendo» itself is kept — knowing the AI can see your page was
a requested fix and it has to stay checkable — but it is a line, not a card.

**The settings panel is gone too.** The only thing in it was the edit
permissions, and it pushed the conversation down every time it opened. They are
now the first item of the bottom row, exactly where the reference puts them —
visible without opening anything, because whether the AI may touch your data is
not a detail.

Verified: sending from the new composer answered, with its cost line.

## 2026-08-21 — Three buttons at the bottom, like a phone app

Eugenio, with a screenshot of YouTube's mobile bar: «pon 3 botones, el de
buscar con la lupa a la derecha, y ahí se abre el CHATBOT. El de "+" en el
centro y ahí aparecen un visor de las herramientas para crear o subir. Y el
botón de CASA en la izquierda que te lleva a la página de proyectos».

The bar was a single «Pregunta a la IA…» field. Now it is three: **Proyectos**
on the left, **+** in the middle, **preguntar** on the right — the three verbs
of the platform (go back, make, ask), where a thumb reaches without moving the
hand. The + is the only one with a filled background, because creating is what
is done most and what is hardest to find today.

**The + opens a viewer of what can be made**, and every button lands where that
thing is actually created — checked one by one before adding them. An entry
that leaves you on a page where nothing can be created is worse than no entry.

**There is no loose «upload a file»**, deliberately. A file has to hang from
something — a project, a task, a page — and one with no owner is exactly the
problem fixed earlier today. You upload from the thing it belongs to, so the
viewer takes you to the project.

**The icon is the menu's, not a house.** It started as YouTube's house; Eugenio
pointed at the sidebar's «Proyectos» section. This button does not lead to a
home, it leads to projects, and the same thing has to wear the same face in
both places or it reads as two destinations.

**And an empty dock is now impossible.** Three places open it without saying
which panel — focusing the box, prefilling from another page, the `ai:abrir`
event — and a strict check would have opened a blank white gap. Fixed in all
three places *and* in the render: no panel chosen means the chat.

## 2026-08-21 — Five buttons at the bottom

Eugenio, twice in a row: «vamos a añadir un cuarto botón […] el de publicaciones
con su mismo icono» and «falta uno más, el de mensajes».

Proyectos · Publicaciones · **+** · Mensajes · Preguntar. Five slots put the +
exactly in the middle, which is where the most-used thing belongs; with four it
would sit off-centre, and with six each button would drop under 44 px wide,
which is the minimum for a thumb.

Every icon is the one that section already uses in the sidebar — `FolderKanban`,
`Compass`, `MessageSquare`. If the same thing wears two faces it reads as two
destinations.

The five share **one** `BotonMuelle`: five copies of the same block would be
five places to fix the same detail. Under 360 px the labels hide and the icons
stay, with the name still in the tooltip.

### And a leftover of mine, found in the screenshot

A "ZZZ grafo de prueba" was sitting in Eugenio's showcase. It came from a POST I
had read as failed — the response carried a query error, so I assumed nothing
was created and moved on. It had been created. Deleted, and every table swept
for `ZZZ%`: graphs, pages, tasks, projects, maps, publications — all zero.

The lesson is the night's own rule pointed at me: **an error in the response is
not proof that nothing happened.** Cleanup has to check the table, not the reply.

## 2026-08-21 — The assistant's tables are tables now, and the corner is two things

Eugenio, with a screenshot: «creo que el asistente intenta hacer tabla, pero no
salen bien, arréglalo». Plus: «el menú de arriba a la izquierda, quítale el
nombre Menú, y ponlo arriba a la derecha del todo, junto a la foto de perfil; en
la foto de perfil elimina la flecha lateral y deja solo la foto».

**The replies were painted as plain text.** The AI does write tables, and well —
they arrived as `| Parámetro | Challenger | Cruiser |` with a row of dashes
under them. A comparison table is exactly where the format *is* the information:
three columns show at a glance what a list of pipes does not show at all.

`Markdown.tsx` renders tables, headings, bold, italics, inline code, bullet and
numbered lists, and rules. **Anything it does not recognise is printed as-is** —
a renderer that guesses wrong is worse than one that does not interpret, because
the second at least lets you read the original. Tables scroll sideways inside
their own box so a four-column table does not push the conversation off a phone.

*Your* messages are still printed verbatim: if you type an asterisk it is an
asterisk. Interpreting what the user wrote would be changing what they said.

**No library, and not by preference.** `react-markdown` + `remark-gfm` was
tried; npm refuses it because `react-simple-maps` pins React 18 and the project
is on 19. That conflict predates this, and forcing it with `--legacy-peer-deps`
changes how the whole tree resolves while someone else is working in the same
repo. When it is fixed, this file can be thrown away for the library.

**The corner:** the menu button lost the word «Menú» — three lines is the most
recognised icon on a screen and the word bought nothing — and moved next to the
account. The avatar lost its chevron and its pill; the photo *is* the button,
bigger (36 px) now that it does not share the space. Both names stay in
`title`/`aria-label`, so a screen reader still says them.

## 2026-08-21 — The 14 objectives across the top of Publicaciones

Eugenio: «pon un submenú superior como el de YouTube donde aparezcan los 14
objetivos uno al lado del otro y que se pueda hacer scroll lateral para verlos
todos en móvil».

One strip, one line, scrolling sideways: 1.665 px of chips inside 335 px of
phone. Fourteen chips wrapping would be four rows of filters above the content
— more filter than content.

**It is a search by topic, not a category, and it is said that way.** Nothing
today links a publication to an objective: that table does not exist. So the
chips look for the objective's words in the title and body — «agua», «hídric»,
«riego», «acuífer»… When one finds nothing it says «Ninguna publicación habla de
agua todavía», so it never reads as «there is nothing about water» when what
happened is that nobody wrote it that way. Calling it a category would be
claiming a classification nobody made.

Measured: AGUA takes 92 publications down to 4, and they are about water.

The icon map lived inside `Objectives.tsx`. Needed in two places now, so it
moved to `src/utils/objetivos.ts` and that page imports it — copying it would
have left two lists that drift the day someone changes one icon.

## 2026-08-21 — The bottom bar, reordered and tighter

Eugenio: «haz más compacto el menú […] cambia la posición de buscar, y ponla en
el centro, y la de crear donde estaba la de buscar. Cambia el icono de mensajes
por el de dos personas […] que se vea que es red social. Y el de publicaciones,
ponlo a la izquierda del todo y cámbialo por el icono de casa».

Inicio · Proyectos · **buscar** · Red · Crear. Search takes the centre — the
most repeated gesture belongs in the spot the thumb finds without looking — and
creating moves to the edge, because it happens fewer times a day than asking.

46 px instead of 52, with 18 px icons and smaller labels. Six pixels back to
every page, on every screen.

## 2026-08-21 — Publicaciones is the home page, with people at the top

Eugenio, with an Instagram screenshot: «la página de publicaciones será a partir
de ahora la página de inicio, y ahí tienen que aparecer las publicaciones pero
antes aparecerán círculos modo Instagram de las personas que tienes agregadas, y
si no tienes agregado a nadie te aparecen canales relevantes a los que siga
mucha gente».

The root used to be `Entrada`, which sent anyone not logged in straight to
`/login`: the platform showed nothing before asking for an account. Now the
first thing anyone sees is what people have published. `Entrada` keeps its own
address at `/entrada`, so nothing that linked to it breaks.

**The circles say whether they are yours or suggestions.** A circle of someone
you follow and one of someone you do not look identical, so the difference has
to be stated: «A quien sigues» or «Gente a la que seguir», plus a coloured ring
versus a dashed grey one. Without that, the home page would make you believe you
have a network you do not have.

**«Relevant» is measured, not asserted**: how many people follow them and how
much they have published. There is no other datum to sort by, and sorting by
something you do not have would be faking a criterion. Each suggestion shows its
follower count — the reason it is there — or its publication count when nobody
follows them yet.

Both branches verified: with nobody followed, 6 suggestions ordered by
followers; after following one person, «seguidos» with exactly that person. The
follow used for the test was removed.

Nothing to show means nothing to occupy: on an empty platform the strip does not
render at all, rather than a row of placeholders.

## 2026-08-21 — The social layer, and a notifications table that had been empty for months

Eugenio: «trabajo en toda la parte de red social, enumera todas las
funcionalidades […] implementa las que falten, y testéalas todas, gestiona
también el tema de notificaciones, crea una campanita arriba a la derecha».

**`notifications` had zero rows.** The table existed, the endpoint to read it
existed, and exactly one place wrote to it — telling followers of a mentioned
entity. Commenting, replying, reacting, following and saving notified nobody. A
social network where nobody finds out about anything is a noticeboard.

`src/server/avisos.ts` is the single writer, the same lesson as `historial.ts`:
if every route writes its own, every route ends up writing them differently and
one day one forgets. Routes say what happened; this decides who hears about it.

- **Nobody is notified of their own actions.** Commenting on your own
  publication is not news, and a bell that rings for what you just did teaches
  people to ignore it. Verified: 0 notifications where sender = recipient.
- **The sender's name is stored in the notification**, not resolved on read. If
  they rename tomorrow, today's notice still says what happened today.
- **`duenoDe` returns null when it does not know**, and then nobody is notified.
  A notice that reaches the wrong person is worse than one that never arrives.

### What was missing, and now is not

Editing a comment, deleting one (archived, so replies underneath do not become
orphans), the followers and following lists, seeing what you saved, seeing who
reacted, the unread count, and marking one notice read instead of all of them.

Marking everything read just by opening the bell would make the ones you had not
got to read disappear.

### The bell

Polls only the *count*, once a minute; the list is fetched on open. Pulling
fifty notices every minute to paint a «3» is buying a list to look at a number.

### 31 tests, two people, one real bug

The battery uses two accounts because with one you cannot verify any
notification at all — you are never notified of your own actions.

Test 09 caught a real bug: `= ANY(${lista}::text[])` looks natural and the
driver sends the array as a quoted string, so Postgres tries to read `{"a","b"}`
where there is `a,b` and dies in `array_in`. **The route answered 200 either
way.** Without that test, @mentions would have shipped notifying nobody, silently.

31/31 pass. Every test row removed afterwards: publications, comments,
reactions, saves, reports, notifications and the follow, all back to zero.

## 2026-08-21 — Where you are, in black; the corner rearranged

- **The bottom bar marks the page you are on** in black — five destinations with
  none marked makes you read the content to know where you are. The black sits
  on the icon only; a pill the width of the button would be a row of squares.
- **Icons 25% bigger on a phone** (22 px in a 34 px target), unchanged above
  640 px where a mouse aims for you. The bar itself is 44 px, down from 52.
- **The menu button is back on the left**, with the logo to its left, and the
  words «Menú» and «Humanity Wiki» are gone: three lines is the most recognised
  icon on a screen, and the name was taking the width the open windows need.
  Both names stay in `title`/`aria-label`.

## 2026-08-22 — Your own work on the home page, and where the panels open

Eugenio: «la página de publicaciones, aparte de los globos de personas y una
serie de publicaciones, también tiene que aparecer los proyectos de uno mismo y
tareas pendientes» · «la parte de buscar con IA tiene que abrirte la pantalla
completa en el móvil y en el ordenador una pantalla lateral derecha; la parte de
crear también».

**The home page was about other people** — who you follow and what they
published. The half that is yours was missing, and it is the only half that
tells you whether there is something to do today. Now: your projects with what
is left in each, and the five tasks that come first.

**First what is due**, not the first five that turn up: a home page showing five
random tasks is decoration; one showing the three that slip this week is a tool.
It reuses `/api/tareas`, which already splits by project and resolves
permissions — a new endpoint for the home page would be a second way of
answering the same question.

**Where the panels open, by screen.** Closed it is always the bottom bar. Open:
on a phone the whole screen (a third of 812 px does not fit an answer with a
table in it), on a desktop the right-hand column, full height — there is width
to spare and what is scarce is height, and the page you were reading stays in
front while you ask about it. Measured: 375×768 with the bar left visible, and
420×800 pinned right with `main` reserving 420 px.

Both use the *same* box with the same conversation inside. Two JSX branches
would be two places to fix the same bug.

### A bug I made and then measured

The mobile gap was an inline `bottom: 44` on an element whose classes also
position it. The attribute was there in the DOM and the computed value came back
`0px`: the panel ate the bar. Moved to a class (`bottom-11`), and it measures 44
px of gap. **One mechanism per property** — mixing an inline style with
positioning classes is how you get a value that is present and not applied.

And a reminder to me: my first check said the circles were gone and they were
not — I read the page 11 s in, before the fetch resolved. Looking again beat
"fixing" something that already worked.

## 2026-08-22 — The card panel, the home tab, and two things that said «done» without doing it

### The card that lost what you were writing

Eugenio: «cuando escribo en la tarjeta es muy fácil que se cierre cuando muevo
el ratón pinchando, y el texto que estaba escribiendo se pierde».

**The dark backdrop had an `onClick` that closed it, and a click counts where
you RELEASE the mouse.** Select a word inside the field, drag a few pixels too
far, release outside → click on the backdrop → everything typed is gone. Not a
rare case: selecting text in a narrow box causes it almost every time.

It is a side panel now — right-hand column on a desktop, full screen on a phone
— which fixes it at the root because **there is no backdrop to click**. It
closes with the ✕, with Escape or with «Cancelar»: three deliberate gestures,
none of which happens by accident on mouse-up. Verified with the exact gesture:
press inside, release outside, and the text is still there.

Both fields are three lines instead of one. A ten-word title read through a
one-line slot has to be scrolled with the arrow keys to be re-read.

**And it confirms before closing.** A circle draws itself and a tick strokes
across it in 900 ms. Drawn, not popped: something that draws itself reads as an
action completing, something that appears reads as a warning, and warnings get
dismissed without being read. It animates `stroke-dashoffset`, which runs on the
GPU without relaying out the page — a confirmation that stutters on a cheap
phone is worse than none. Respects `prefers-reduced-motion`.

### «Mi Perfil» did work — as a window nobody could see

Eugenio: «pincho en mi imagen en el menú, y le doy a perfil, y no me lleva a mi
perfil». It *did* take you there: it opened your profile in a **window**, and if
that window was minimised or behind, nothing visible happened. From the outside
that is exactly «it does not work». Your profile is a place you GO to, not a
tool you consult beside something else, so it navigates now.

`/` no longer redirects to your profile either — the home page is Publicaciones.
`Entrada` stays alive at `/entrada` so saved links do not die in a 404; what
changed is where it points.

### A home tab that cannot be closed

With every window closed the tab strip was empty and there was no way back to
the start from up there. A fixed tab costs 24 px and removes that dead end. It
is not a window: not in the manager, not draggable, not minimisable — a link
shaped like a tab.

### The icon that would not save, and the menu that could not know

Eugenio: «he cambiado el icono de la página de proyecto y no se ha actualizado
al instante el icono del menú lateral».

Two bugs stacked, and the second was hiding behind the first.

**The server answered `ok: true` and saved nothing.** The icon validator rejects
anything containing a colon — correct back when the only thing with a colon was
a `javascript:` — and since D90 an icon can be `lucide:Truck`. So the value was
dropped silently. The menu was not failing to notice: **there was nothing to
notice.** Stroke icons are allowed now, with the name checked against the real
list, so the door stays shut for everything else.

**And `RamaMenu` copied the icon into local state on mount and never looked
again.** That state exists so the change shows instantly without waiting for the
network, so it cannot be removed — it is synchronised instead. Two places
holding the same truth, again.

Verified end to end: changing the icon on the project page turned the sidebar
from `lucide-truck` to `lucide-rocket` with no reload. Eugenio's 🚐 was restored
afterwards.

### And the search button lost its black

Black is reserved for saying *where you are*. With the search button black by
default there were two black things at once and neither meant anything.

## 2026-08-22 — The tabs, the logo, and a profile that fits on one screen

### Tabs

Closing one now brings **the tab to its left** forward. Before, closing left
nothing focused: you stared at whatever was behind, which was usually nothing.
The left one and not the last used — in a row of tabs, what the eye expects when
one closes is its neighbour moving in.

And a **red ✕ to the left of the strip** closes them all, with a confirmation
that says how many. Closing eight windows in one click does not undo, and a red
✕ next to other small ✕s gets pressed by accident. «8» is a number that stops
you; «close all» is not.

### The logo

Eugenio sent it. One SVG for the sidebar, the top bar and the favicon — one file,
so they cannot end up different. SVG rather than PNG so it reads the same at
20 px in the menu and at 180 in a browser tab. The header carries only the mark;
the sidebar keeps the mark *and* the name, because that is the one place the
platform says what it is called, and removing it from both would leave it
nameless everywhere. Both go home.

### The profile, rebuilt

> «quita la portada de fondo. Sube la foto hasta la esquina superior izquierda y pon el nombre al lado de la foto» · «quita lo de siguiendo y seguidores y lo de publicaciones» · «pon en grande una fila de PROYECTOS […] PUBLICACIONES […] PRODUCTOS» · «haz que sea compacto y que se vea todo esto en una sola pantalla»

**Compact means removing, not shrinking.** What makes it fit is not smaller
type: it is that 160 px of gradient banner went, and the three counters went.
Measured: everything asked for ends at 487 px on an 800 px screen.

- **The counters are gone.** On a platform that is starting, «0 seguidores» on
  everybody's profile informs nobody and discourages whoever just arrived. The
  data is still there — the home page uses it to suggest who to follow — what
  went is the scoreboard.
- **Three rows.** Three cards across on a desktop; on a phone 68% of the width,
  so the next one peeks. That peek is what says *there is more*: a row ending
  exactly at the edge looks finished, and nobody swipes what looks finished.
- **Hover lifts and enlarges** the whole card, not just its image.
- **Up to three locations**, chosen from the real territory catalogue rather than
  typed, so «Madrid» is *the* Madrid of the platform and not a loose string. The
  cap is enforced on the server: if only the screen checked it, thirty could be
  sent from outside. At three the search box disappears and says why — a search
  box that stops responding looks broken.
- **The 14 objectives**, pickable, shown between the name and the description.
  They say what someone is about before a paragraph does, in the platform's own
  vocabulary — the same fourteen that filter the home page. Ids are filtered
  against the real catalogue on save: an invented one would paint as a nameless
  gap.

Verified end to end: added «Comunidad de Madrid» and AGUA, saved, and both
appear under the name. Eugenio's profile was restored to empty afterwards.

---

## 2026-08-22 — The anthill, and the chat stops eating the screen

Eugenio, in one message: a channel to report what breaks, the bottom bar
disappearing when the chat opens, the Proyectos page saying its title twice, a
sidebar drawn two different ways, the chat history taking half the panel, and a
model list nobody could choose from.

### The anthill (`/hormiguero`)

A shared board for what fails and what is missing, reachable from the bug icon
next to the bell. Three colours and each one means one thing: **red** waiting,
**amber** blocked on a person — and it says *on what*, **green** done.

- **Amber cannot be silent.** `PUT` refuses `estado: 'bloqueada'` without
  `necesita`. A blocked item that does not say what it needs is the reason
  someone has to ask on another channel, which is what this replaces.
- **The status belongs to whoever programs** (admin). If the person who opened
  a note could tick it done, the board would stop describing what is done.
- **The dot on the button counts only the blocked ones.** If it also counted
  what is waiting to be built it would be lit permanently and mean nothing.
- Archive, never delete. Every route checks the session; the state changes check
  the role.

### The bottom bar and the panel were the same element

Opening the chat made the navigation vanish, so you had to close the chat to
change section. They were one element changing height. Now they are two
siblings: the panel opens above, the bar stays below, on the phone and on the
desktop alike.

### The chat

- **Half the screen**, not 420 px. Fixed pixels are a third of a laptop and a
  sixth of a big monitor — the same narrow column on a screen with room to
  spare. Three presets (33/50/66 %), a draggable edge, saved in your settings.
- **The history is put away**: a narrow rail that peeks on hover and stays on
  click. It was 208 px of a 420 px panel for a list you open once in a while.
- **«Viendo: …» is gone.** It was built to check the AI receives the page as
  context, and it proved it. Checking something once is not a reason to show it
  forever: it spent a line telling you about the page you already have in front.
- **Searching no longer spends AI.** «Busca publicaciones sobre el agua» has an
  exact answer in the database, and running it through a model makes it worse
  twice: it costs money and returns prose *about* the results instead of the
  results. Now it answers with the links and says it did not use the AI — with a
  button to ask the AI anyway. The verb decides, never a word from the topic:
  «¿por qué se contamina el agua?» still goes to the model. That distinction is
  the same bug that once turned «create a task» into a document nobody asked for.
- **Publications open from a link** (`/explorar?abrir=…`). There is no route per
  publication — they open as a card over the list — and if it is not there any
  more the page says so instead of doing nothing, which from outside looks like
  a broken link.

### The model selector: five choices, not nine model names

«Haiku 4.5», «Fable 5», «gemini-pro-latest» only help you choose if you already
know who makes them and what they cost. What is being decided here is how much
to spend and on what: **simple / medium / high**, plus **images** and **video**.
The catalogue is untouched — the automatic router still picks among all nine —
this is a *view* of it, so the price shown is the price charged.

- **Prices in euros**, one unit everywhere («0,03 € por mensaje»). Two units for
  the same money on one screen is how you end up wrong by a factor of a hundred.
  Under a cent it says «menos de 0,01 €», which is true and is not zero.
- **«Incluido» next to each one**: what it costs and who pays are two questions
  and both need answering.
- **Video is shown, switched off, with the reason.** Hiding it would leave the
  person who asked unable to tell «ignored» from «coming»; showing it as if it
  worked would be a button that does nothing.
- «Autónomo» is now **«Permite editar»**: the first describes the AI, the second
  describes what you are letting it do to your things, which is the actual choice.

### Two pages that said the same thing twice

- **Proyectos**: one title, and «+ Crear nuevo» beside it. It had two headings
  and a paragraph explaining what a board is, on the page you enter twenty times
  a day already knowing.
- **The sidebar**: one style. Project icons came through `Icono` (stroke 1.75,
  the text's colour); every other section was painted by hand at `text-slate-400`
  and stroke 2 — thicker and paler, in rows sitting one on top of the other. The
  colour now lives on the row, so icon and label always match, and the row is
  what knows whether it is the active one.

Verified locally end to end: the anthill API (create, block without saying what
is needed → refused, block saying it → accepted, count), the tier list served by
`/api/ai/status`, the search answering with links and no AI, a publication
opening from its link, and the bar staying put with the chat open. The test
session (`claude-dev-verificacion`) and the test note were deleted; no cookie was
ever written into the shared browser.

---

## 2026-08-22 (II) — The 3D world becomes the Visor 3D, and files can be dropped into a page

### Dropping a file into a page

Eugenio: «permite en el constructor de páginas estilo Notion arrastrar un
archivo y que se inserte en la página, y que dé la opción, una vez insertado,
con 3 puntitos, de abrirlo, cerrarlo o embeberlo».

- Dragging a file onto a page inserts it. **It goes through the same pipeline as
  pasting** — both hand over a `DataTransfer` with files in it, so dragging a
  PDF and pasting one cannot give different results. A second path with its own
  list of types is where `.webp` works pasted and not dropped.
- **An image embeds; a PDF becomes a card** with its name, its size and its
  first page rendered small. The PDF used to open as a 70vh viewer that split
  the document in two — you stopped reading your own page to look at an
  attachment you maybe only wanted to hand.
- **Three dots** on every file block: open it at the side, embed it, close it to
  a card, or remove it.
- If what you drop isn't something we can make a block of, **it says so**.
  Dropping something and nothing happening is the bug nobody can report.

### «Atrás» from an inserted publication

He described it as a broken back button: insert a project publication in a page,
open it, press back, and you land on the projects index instead of your page.

It was not the back button. **Viewing the publication took you out of the
document**, and coming back depended on the history being what you imagine — it
wasn't, because the card led to `/proyectos/:slug`, whose own screen sends you
to the index. The cure is not to patch the history: it is not to leave.

Now it opens in a **side window** — the same `<iframe>` mechanism as the desktop
windows, so it is the real page with its real permissions. Opening it pushes one
history entry, so back closes the panel and leaves you exactly where you were.

### Expand and close, on every window

One `ControlesVentana` for the three kinds of window there are. Growing is the
diagonal arrows he sent, and it works in both directions. The desktop windows
used a square for the same thing and the side panel could not grow at all.

### The header

- **The permanent «Inicio» tab is gone.** It cost 24 px on every screen for a
  case that lasts a second. The logo already goes home, and **closing the last
  window now leaves you at Inicio** — that rule lives in one place, not in the
  four different things that close a window.
- **The menu button is the mirror of the one that hides the menu**, instead of
  three lines. Two halves of one gesture that now look like it.

### The Visor 3D (was «Mundo 3D»)

The whole point, in his words: «no será un mundo hiperrealista sino un mundo muy
simplificado, con un centro y alrededor […] es todo como la sala del arquitecto
de Matrix, con pantallas alrededor».

What went: 118 hectares of village, houses, an edible forest, a river, paths,
clouds with a day/night cycle, butterflies by day and fireflies by night, an
HDRI sky, cascaded shadows, an effects composer, four loading waves and three
quality levels that dropped by themselves when the FPS fell. All of it existed
to make it look like a real place — and that was the trap: what you came to look
at was scattered among the scenery, and finding something meant walking.

What it is now:

- **A centre and a ring.** Nothing is placed by hand: every position comes from
  `visor/anillo.ts`, which the scene, the collisions and the minimap all share.
  Ten projects sit 36° apart; add one and all eleven re-space themselves. The
  ring's radius grows with the count, so twenty things never overlap.
- **No light at all.** Every material is basic — the only kind that ignores
  lighting — because with any other one a white surface goes grey the moment it
  faces away, and the room stops being white. What replaces light is the
  outline, the way an architect's drawing works.
- **Rooms, all alike**: Inicio → Proyectos · Personas · Publicaciones ·
  Herramientas, and from a project into its own room, with its people and its
  pending cards. The section rooms live inside the scene: entering «Proyectos»
  is the data already loaded, put in another ring — no request, no navigation.
- **Portals show what is on the other side**, from above: each thing over there
  is a dot of its colour in the same ring it will occupy. It is computed from
  the destination's own data, so it cannot drift. An empty disc means an empty
  room, and says so.
- **You are a spirit of light**, blue and green, moving only on the plane. With
  height gone, so are the jump, gravity, landing, the flight ceiling and the
  "do I collide with this or pass over it?" question — they don't exist rather
  than having been deleted. **Other people are beams of other colours** with
  their name above; each colour comes from their id, so it never changes.
- **The camera is more overhead** (pitch 0,95 instead of 0,63, and pulled back)
  — otherwise a ring is just one portal filling the screen.
- **Kept on purpose**: the editor (create, move, threads), the minimap, fast
  travel, the products — the DJI and the camper van, which he named — the
  portals and the YouTube cinema. **Gone**: bike, glider, first person, the
  appearance editor (it dressed a body that no longer renders) and the world
  clock (there is no sky left to light).

### The code recycle bin

Ten files, ~2.900 lines, orphaned by the rewrite, moved to `papelera/<date>/`
keeping their original path inside. A **daily GitHub Action** deletes anything
older than 30 days and commits the deletion — no one has to remember, and it
runs whether or not a laptop is on. Nothing is lost even then: every move is a
commit.

### The audit he asked for

In `memory/12_CODE_AUDIT_2026-08-22.md`, measured rather than estimated. Two
duplications were unified and tested the same day: the window controls (three
sets of buttons for one gesture) and `POST /api/uploads` — **the same request
written by hand in 16 places**, and not identically: some sent the `File`,
others its `arrayBuffer`; three threw on error, five returned, two said nothing.
Now `subirArchivo()` returns a result and never throws, so a caller cannot
forget the failure and leave the screen half-done. `grep` finds exactly one
upload request in `src/` today.

The rest is listed with numbers and left alone on purpose: 547 bare buttons, 89
hex colours, 9 copies of «close when you click outside». Doing them all in one
sweep would produce a diff nobody can review.

---

## 2026-08-22 (III) — Hormiguero #1: two ways a table could lie about a number

Eugenio's first note: «revisar creación de tablas y sus funcionalidades, y
buscar bugs y resolverlos». Reviewed end to end against the running server —
creating tables, all the column types, validation, formulas, aggregates across
relations, views, permissions and deletion. Most of it held: writing text into a
number is refused, a formula that names a missing column errors instead of
guessing, an aggregate over nothing is empty and not zero, calculated columns
cannot be written by hand, cycles are caught on create *and* on edit, and a
deleted row leaves its link saying «(ya no existe)».

Two things did lie, and both in the same way — producing a believable number
instead of admitting a problem.

### Renaming a column silently broke every formula that used it

`Precio` = 100, `ConIVA` = `{Precio} * 1.21` = 121. Rename `Precio` to `Coste`
— a cosmetic gesture — and ConIVA turns into «No hay ninguna columna que se
llame Precio». In a table with fifteen formulas, one rename breaks all fifteen.

Formulas address columns **by name**, so the stored text was the only reference
and it stopped pointing anywhere. Now renaming rewrites the formulas of that
table, in the one place where a column changes name, and answers how many it
touched — an application that rewrites what a person typed cannot do it
silently. The discarded alternative (storing ids and translating for display) is
argued in `src/server/bd/renombrar.ts`.

### Two columns could share a name, and `{Importe}` picked one

Nothing stopped a second column called `Importe`, and the name→id map simply
kept the last one. The formula then computed with whichever won the ordering and
returned a perfectly plausible number. It is the `grupos[0]` fallback again:
choosing for the user when you don't know.

Now duplicates are refused on create and on rename, with a message that says
why. And for tables that already had one, the formula answers «hay más de una
columna que se llama así» instead of choosing.

**A third bug appeared while testing the fix**, which is why it was worth
testing rather than reasoning: when the old name *was* duplicated, the rewrite
happily rewrote the formulas that meant the *other* column. Renaming one of two
`Importe` now leaves every formula alone — which is also the right answer,
because with one `Importe` left they resolve correctly on their own. And the
check has to be made *before* the update: read afterwards, the old name is gone
and the count comes back as one.

Test data and the local verification session were deleted afterwards.

---

## 2026-08-22 (IV) — Hormiguero #2 to #6 and #8

Working the board top-down, so as not to collide with the other session, which
comes up from the bottom.

### #2 · The home page

- **The «Humanidad / Mías» switch is gone.** It split the front page in two and
  made you choose one before seeing anything — and the «Mías» half is what your
  own profile already is. The *mode* stays alive in the address (`?mias=1`),
  because that is what «Mis publicaciones» and the link from your profile use:
  removing the mode as well would have left those two pointing nowhere.
- **No heading over the circles.** A row of round faces already says what it is.
  What the heading actually added — following vs suggestion — is in the ring:
  coloured if you follow them, dashed grey if it is a suggestion.
- **The tasks are out.** They went in yesterday so the home page would say
  whether there was anything to do today. Right idea, wrong place: five tasks
  with their deadlines above the publications turn a front page into an inbox,
  and the first thing you see on entering ends up being what you owe. Projects
  stay — they are somewhere to go, not a debt.

### #3 · The notifications panel on a phone

It hung off the bell with `absolute right-0`, and the bell is pinned to the
right edge: on a 375 px screen a 304 px panel came out lopsided, its left text
almost against the frame. On a phone it is now `fixed` and centred on the
screen, with the same margin on both sides and a height that cannot overflow.
Fixed rather than absolute on purpose: absolute rides the header's scrolling.
On a wide screen nothing changed — it still hangs from the bell.

### #4 · The header

The permanent «Inicio» tab was already gone in the previous deploy. The other
half of the note: **the menu button no longer has a black background.** It was
the darkest pill in the whole bar and pulled the eye to the corner; and black
means something else here — «you are here» — which is not what a button that
opens a menu is.

### #5 and #8 · «The screen isn't fixed, it slides sideways»

Two notes, one cause, and it was not the page: it was Safari. On iOS, tapping a
field whose text is **under 16 px** makes the browser zoom in so it can be
read — and once zoomed, the whole page can be dragged sideways. From outside it
looks exactly as he described it: «se ha hecho como zoom» and «no está fija».
Nearly every field in the platform is 14 px, so it happened on every form.

The cure is the type size, not the zoom: fields go to 16 px on phone-width
screens and Safari stops zooming because it no longer needs to. The other way
out — `maximum-scale=1` — takes pinch-zoom away from everybody, including the
people who need it to read.

Measured first: the page itself does **not** overflow horizontally (`scrollWidth
== clientWidth == 375`), which is what ruled out a stray wide element and
pointed at the zoom.

### #6 · Attaching files when you report something

Half of what fails is easier to show than to describe. The form now takes files,
holds them until the note exists — an attachment has to hang from something, and
while you are typing that something has no id yet — and uploads them right
after. If one fails it says which and why; the note is already saved, so nothing
is undone, but staying quiet would leave you thinking the screenshot arrived.
Images show as thumbnails in the note; anything else, as a named link.

Reuses the `archivos` table, adding `incidencia_id` as a fourth container rather
than a new table: an attachment is the same thing wherever it hangs from.
Reading the board is open to anyone; **attaching is limited to the note's author
or an admin** — without that line, anybody with a session could hang files on
someone else's note.

**And a bug came out of it**: `archivos` has a check constraint demanding
exactly one container, and it still counted three. The first attempt failed with
«violates check constraint». Migration `0056` brings it up to four — worth
knowing, because the same trap waits for the fifth.

---

## 2026-08-22 (V) — Hormiguero #7 and #9

### #7 · Phone contacts, projects and WhatsApp

«Crear un sistema para sincronizar los contactos de mi teléfono y poder
agregarles a proyectos, y también mandarles mensajes a través de WhatsApp, sea
como sea.»

**What a web page can and cannot do with an address book**, because it decides
the shape of this:

- No web page can read the address book on its own. The person picks the
  contacts and the browser hands over only those.
- The browser's **contact picker** (`navigator.contacts`) does exactly that with
  a system screen. It exists in Chrome on Android; on the iPhone it does not.
- A **.vcf file** is exported by any phone and can be read anywhere.

So there are two ways in: the picker where the browser has it, and .vcf always.
With only one of them, half the platform is locked out — the picker leaves out
every iPhone, the file alone gives up the convenience. Which one you are seeing,
and why, is written under the button: otherwise from an iPhone it looks broken.

**Nothing gets duplicated**: contacts are matched by **number**, never by name.
«Ana», «Ana Ruiz» and «Ana trabajo» are one person if the number is one; two
«Juan» with different numbers are two. And a re-import never overwrites a name
you typed here — «Ana (obras)» stays «Ana (obras)».

The number is normalised in **one** place (`utils/telefono.ts`) for every path —
typed by hand, imported, or edited — because «600 12 34 56» and «+34600123456»
would otherwise be two people the next time the agenda is imported. Verified
with nine cases including `+1 415 555 2671` and rubbish input, which returns
`null` rather than a plausible-looking number.

**WhatsApp** opens the conversation with `wa.me`. Sending *without* the person
pressing send needs an approved WhatsApp Business account, Meta-reviewed
templates and a per-message cost; `wa.me` works today, on the phone and on the
desktop, without a company account, and the platform never touches anyone's
messages.

**Adding to projects** existed already, but only from the project's own page —
you had to know the project before choosing the person. Now it is also in the
person's menu, the way round he described it.

### #9 · The icon library, from 53 to 988

Fifty-three were the ones the automatic dictionary could return. For picking by
hand that is very few — there was no sailboat, no guitar, no paw print.

The list is **generated from the package**, not hand-written: lucide's 5.592
icons minus the families that do not name a *thing* — arrows, chevrons,
alignments, squares, charts, «Off» and «Check» states — which inflate the
catalogue without adding anything anyone would choose for their project.

**With a search box**, which is the part that makes it usable: with 53 you chose
by looking; with 988 you have to be able to ask by name. Without it, widening
the list would have made the picker worse. It says «in English» in the
placeholder, because the icons are named in English, and it answers «none is
called that» rather than showing an empty grid.

**What it costs, with a number**: the app bundle goes from 5,87 MB to 6,24 MB
(+363 KB raw). Loading all 5.592 would add some 3 MB for icons nobody will ever
scroll past; loading them on demand would make the sidebar wait for a download
before drawing an icon that is already chosen.

---

## 2026-08-22 (VI) — The first nine notes turn green

Eugenio: «las tareas del hormiguero que estén ya hechas por ti o por el
programador 2, ponlas como hechas en la plataforma».

**Done through a migration, not through the API**, and the reason matters: a
note's state is only moved by an admin with a session, and hand-making a session
in production is entering as someone else without their password — forbidden
here, and rightly. The other option was SSH plus psql by hand, which leaves no
trace anyone can review. A migration goes in the repository, is read before it
runs, runs once, and stays in the history.

**Each note carries what was done**, not just a green dot. A dot says «done» and
not what; the written answer means that in a month it can be read without
digging for the commit — and if something was understood wrong, it shows up
straight away.

Marked **one by one by id**, never with `WHERE estado = 'esperando'`: that would
also have turned green any note written in the meantime. Verified locally with
the nine real ids plus a tenth standing in for a new note — the nine change, the
tenth does not.

What was verified where, so the green means something: the 16 px rule and the
board's attachments were checked **on humanity.wiki**; the routes for importing
contacts and for renaming a column answer 401 there rather than 404, which is
what says they are deployed; the rest — the notifications panel, the menu
button, the icon picker — needs a session to see and was verified locally on the
same commit that is now in production.

---

## 2026-08-22 (VII) — AI programmer accounts, and two kinds of note

### Why this exists

Until today, putting a note in green meant one of two bad things: hand-making a
session for Eugenio in production — entering as him without his password — or
writing into the database over SSH, which leaves nothing anyone can review.
Eugenio asked for the third way: «un usuario de programador IA propia […] y así
podréis daros permisos de edición del hormiguero».

### Two things, deliberately not one

**A token** (`Authorization: Bearer hw_ia_…`) that opens exactly one door:
create hormiguero notes, move their state, answer them. It does **not** produce
a `req.user`, not even a fake one — if an agent could pass for a person, every
permission check in the platform would be letting it through without anyone
having decided that. Verified: with the token, creating a project answers 401,
creating a table answers 401, and `/api/auth/me` says `user: null`.

**A platform account** at level 1 (ordinary user) so an agent can log in and
*look* — which is what was missing to check the screen fixes (the notifications
panel, the menu button, the icon picker all need a session to be seen). Level 1
and not admin: to review how a screen looks you only need to get in.

The reason for keeping them apart is the risk, and it is worth writing down: **an
agent reads the hormiguero, and anyone can write there.** It is reading
strangers' text while holding a production key. With this scope the worst a
hostile note can achieve is a board with a wrong colour — visible, reversible,
and with the name of whoever did it beside it.

Tokens are stored as a SHA-256 fingerprint, never in the clear, and shown once
by `scripts/agente-ia.mjs crear "Nombre" correo@…`. Lost means replaced, not
recovered.

### Notes from the team and notes from outside

Eugenio: «haz una diferenciación entre las notas creadas por un ADMIN […] y haz
caso directo a las de ADMIN, y las creadas por otros usuarios cada X tiempo las
revisaremos para que yo las apruebe contigo».

A fourth state, `propuesta`, in **grey** — not a traffic-light colour, because a
proposal is not late, it is waiting for a decision. Notes from an admin or an
agent go straight into the work queue; anyone else's land as proposals, and an
admin approves them into `esperando` with one button.

Kept as two separate fields: `de_admin` (who wrote it) and `estado` (where it
is). With one field, the origin would be lost the moment it was approved — and
then there would be no way to measure how many of the ones arriving through the
letterbox actually get done, which is exactly what will say whether the
letterbox is worth having. `de_admin` is a snapshot: asking for the author's
role *today* would rewrite the past for anyone who gets promoted.

Verified end to end: an agent's note enters as team work and is attributed; a
level-1 user's note enters as a proposal; that user cannot approve their own;
an agent can, and the note keeps saying it came from outside.

---

## 2026-08-22 (VIII) — The two agents exist, and one gap that only production showed

Eugenio: «dale esa información del usuario al programador 2, créale su usuario
propio y que no lo olvide, meterlo en MEMORY».

Both agents now exist **in production**: `Claude 1` / `claude1@lighthumanity.org`
and `Claude 2` / `claude2@lighthumanity.org`. Created by running the script
inside the app container — the only place with `pg` — with the database
credentials read from the db container, never typed anywhere.

**The keys never crossed a screen.** The script's output was written to a file
on the server, the values piped straight into the local `.env` (gitignored), and
the file deleted. What was printed was the length of each value, which proves it
is there without showing it. They are not in `memory/` either: house rule 4
forbids copying secrets there, so the memory says *where* they live and *what
they open*, not what they are.

Programmer 2 had declined to create its own account, and was right to — it was
not their decision to make. Once it was Eugenio's instruction to me, it was.

### The gap production found

Testing the token against production revealed something local testing had not:
an agent could **open** a note and then had no way to **retract** it — the
`DELETE` route only ever looked at `req.user`. So a note opened by mistake would
sit on everyone's board forever, and my own test note had to be removed from the
database by hand.

Undoing what you have just done is not an extra permission: it is the other half
of the one you already had. Agents can now archive their own notes and only
their own, recognised by `respondido_por` — an agent has no row in `users`, so
its authorship lives in the name it opened the note with.

Verified against humanity.wiki: creating a note with the token answers 200 and
lands as team work attributed to «Claude 1»; creating a project with the same
token answers 401. The test note was removed and the board is back to its nine.

## 2026-08-22 — A published page finally has a page (Programador 2)

The publishing API was finished and the addresses worked, but **there was no
screen behind them**. `/@handle/slug` answered HTTP 200 because the server hands
the whole SPA back for any path, so the test "does the address work?" passed
while the visitor got the application instead of the page. It is the project's
own documented trap — a 200 that means nothing was found — and it took opening
the URL in a browser to see it.

- **New** `src/pages/PaginaPublica.tsx`: the reader's view. Title, author, date,
  content, and a link home. It renders **outside `Layout`**: whoever arrives has
  no account and no projects, and the work sidebar is not their life (B3, B41).
- **New** `src/components/knowledge/BloquesLectura.tsx`: read-only block
  rendering. `Documento.tsx` knows how to paint blocks but only as an editor,
  tangled with the active block, autosave and cursor focus across 1.974 lines.
  `CLASES_TEXTO` now lives in the reader and the editor imports it from there:
  one definition, so a heading cannot end up a different size on the public page
  than in the editor.
- **Routing**: React Router 7 does not allow a fixed prefix glued to a parameter
  inside one segment (`/@:handle` is not a valid path), so the route is
  `:arroba/:slug` and the `@` is checked inside. Verified that real two-segment
  routes still win: `/proyectos/:slug` renders the project page, not this one.
- **`DataProvider`, `EditProvider` and `DesignProvider` moved inside the
  `Layout` route.** They wrapped the whole application, so opening a shared page
  fired the eight workshop loads — territories, objectives, challenges,
  solutions, projects, organizations, causes, indicators. Measured on the page
  itself: **10 calls before, 2 after** (the resolver and `auth/me`).

Verified in the browser at 1280 and at 375 px: content renders, the missing-page
branch says so, `robots` follows the author's choice, no horizontal overflow
(text lane 335 px of 375). `npx tsc --noEmit` clean, `npm run build` passes.

Still open: the subdomain `nombre.humanity.wiki` answers **525** because the
Cloudflare origin certificate is not on the server yet. The path address works.
---

## 2026-08-22 (IX) — The web gets light: 1.137 KB → 324 KB to open it

Eugenio: «haz que la web sea más ligera y que se vaya desplegando al abrir
herramientas, fundamental».

Measured at every step, because «lighter» without a number is an opinion. What
someone downloads before seeing anything:

| | Al entrar (comprimido) |
|---|---|
| Antes | **1.137 KB** |
| Cada página por su lado | 428 KB |
| Y las gráficas aparte | **324 KB** |

**−71 %.** On a phone with poor coverage that is the difference between a few
seconds of white screen and a page that appears.

### Phase 1 · Measure first

A script that reports exactly what the browser fetches on a first visit — entry
chunk, CSS, both gzipped. Every later number in this entry comes from it, run
again after each change.

### Phase 2 · Every tool downloads when you open it

The 53 pages of the platform were in the **same file** you download on arrival.
Someone coming to read one publication was fetching the page editor, the canvas,
the market, the financial panel, the user admin and the whole of Mapbox before a
single letter appeared. Now each page is its own file: 51 deferred, and only the
front page, the entrance and the login stay eager — deferring the first thing
anyone sees only swaps one wait for another.

Mapbox fell out on its own as a consequence: **1.823 KB** that now only the map
pages fetch.

### Phase 3 · Something honest to look at while it arrives

Not a spinner in the middle: the **silhouette** of what is coming — a heading, a
couple of blocks. The eye understands that something with that shape is on its
way, and there is no jump when it lands. One single boundary for all 51 routes,
not 51 copies of the same wrapper: the first one anyone forgot would be a white
screen nobody could explain.

### Phase 4 · Charts only for whoever sees one

The chart library lived inside the component that draws *any* kind of window —
used on the front page, in the canvas and in the editor — so everyone downloaded
a chart engine with no chart on screen. Now it is its own file, requested the
first time a real chart appears, with a placeholder of the **exact height** so
the text below does not jump. −104 KB.

While moving it I nearly invented a palette that merely resembled the original:
every existing chart would have changed colour without anyone asking. The
comment in `Graficas.tsx` says so, because that is the kind of mistake a move
makes look like an improvement.

### Phase 5 · The icons: measured, and kept

Removing the 935 non-core icons takes the start from 324 KB to 246 KB — **they
cost 78 KB**. They stay, and now the decision has that number written beside it:
the alternative is a chosen icon painted first as the generic one and swapped an
instant later, a flicker visible in the sidebar on *every* load for anyone with
custom icons. 78 KB once, cached afterwards, is cheaper than a flicker every
visit.

### Phase 6 · Nothing broke

Sixteen routes opened one after another in the browser: none blank, no
chunk-loading errors, no exceptions. 86 chunks now instead of 9, and the total
grew by 100 KB — which is the point: the total is no longer what anyone waits
for.

---

## 2026-08-22 (X) — The AI's actions, tested for the first time

The assistant does not only answer: it **creates things**. Nineteen actions — a
task, a project, a publication, a page, an event, a challenge… — and until today
whether they still worked was checked by trying a few by hand. The ones nobody
tried, nobody knew were alive.

`npm run probar:acciones` now runs all of them in about ten seconds.

### What it checks, and what it refuses to check

**It does not read what the AI says. It looks for the row in the database.**

That distinction is the whole reason it exists. The three failures this project
already paid for were the same kind: «ya te he fijado esa tarea» with no task,
«he organizado las carpetas» with no evidence, and a task filed under the wrong
label in silence. A test that read the answer would have passed all three.

It also does **not** call the model: the action is handed to the platform
already proposed, exactly as when someone presses «aceptar». Going through the
model would cost money on every run and fail at random depending on what came
back — and a test that fails on its own stops being read within a week.

### What it found

Two of the four «failures» in the first run were **my own wrong expectations**,
and that is worth saying: the test sent `fecha`+`hora` for an event when the
model is told to send `inicio` in ISO; and it demanded that a non-existent label
be *refused*, when the platform's choice — place the task and **say where** — is
the better one. Both were fixed in the test, not in the platform.

One was real. `res.json({ status: …, ...result })` had the execution status
**first**, so it was overwritten: creating a graph returns `status: 'borrador'`
and a map `status: 'publicado'`, so the response said «borrador» where it should
have said «ejecutada». The screen paints green only what says «ejecutada» — two
actions that *had* run were shown in grey, as if nothing had happened. Nobody
could tell «it happened» from «it didn't» in those two. The entity's own state
now travels under its own name, `estadoEntidad`, which is what it should have
had from the start: two different things cannot share one name.

### What is locked in from now on

The twelve create actions each produce a row that is verified to exist by id;
and four rules that must keep holding: a non-existent label is placed **but
announced**, a project that is not yours is refused, a task with no title is
refused, and permission is re-checked **at execution**, not only when proposed.

Cleans up after itself: user, session, proposed actions and every row created —
verified zero left behind. Refuses to run against anything but the local
database.

---

## 2026-08-22 (XI) — The open models' cache: it existed, and nobody was reading it

The third item on the list was «add prompt caching for Together». Checking
their documentation first changed the task: **their cache is automatic.** No
parameter, no header, no toggle — the provider keeps the *prefixes* of what you
send and bills at a reduced rate whatever matches something still warm. Only the
longest common prefix counts: from the first differing byte, full price.

So there was nothing to switch on. What there was:

- **A comment that said the opposite.** «esta API no tiene la caché de prompts
  de Anthropic» was true of Anthropic's *explicit* mechanism and false about
  what actually happens. Anyone reading it would have concluded the stable/
  variable split was pointless here — and moved the date to the top.
- **The split was already right, by luck of a rule written for another
  provider.** The stable part goes first and the date, the user and the context
  after it. That is exactly what a prefix cache needs. Now the file says so, so
  nobody undoes it.
- **Nobody was reading what came back.** The provider reports how much it reread
  from cache and we ignored it. Without that number the cache could be working —
  or not — and the cost panel would say the same either way.

Now the reread tokens are read, recorded and **billed at their own price**
(`cacheado` in the catalogue, ≈1/10 of input). If the field is missing, the full
price is charged: better for the panel to overstate than to promise a saving
that is not there.

**Honest size of it**: at today's volume this saves céntimos — 44 requests
through the fast model. It matters when there are a hundred people using the
chat daily. What it does buy today is that the saving is *visible*: from now on
the cost table can show whether the cache is hitting at all.

---

## 2026-08-22 (XII) — The context cache, rebuilt for hundreds of thousands of chats

Eugenio: «piensa en cómo hacerlo para mejorar la UX y piensa en cuando tengamos
cientos de miles de chats al día».

Measured on the local server, three questions in one conversation:

| Petición | Entrada | Releída de caché |
|---|---|---|
| 1ª | 5.720 | 0 (escribe la caché) |
| 2ª | 5.754 | **5.719 — 99 %** |
| 3ª | 5.785 | **5.753 — 99 %** |

**−89,5 % per request from the second message on.** At 100.000 chats a day that
is ~403 €/día → ~115 €/día; at 500.000, ~2.014 → ~573.

### What was breaking it

**A timestamp with milliseconds.** The variable block opened with `HOY ES …
(2026-08-22T10:15:33.123Z)`. Caching compares *prefixes*: one differing byte and
everything after it is billed in full — including the entire conversation
history, re-sent and re-charged on every single turn. The date now carries the
day only. The model never needed the millisecond: it resolves «el jueves» from
the day.

### Three tiers instead of two

| Capa | Qué lleva | Cambia |
|---|---|---|
| 1 · global | las instrucciones de la plataforma | nunca — su caché **se comparte entre todos los usuarios** |
| 2 · de la persona | sus proyectos, su gente, su nivel, los grafos | cuando crea algo |
| 3 · variable | la fecha, la pantalla, lo recuperado, la pregunta | cada mensaje |

Ordered least- to most-volatile, which is not a preference: a stable block
placed after a volatile one is never cached. Anthropic allows four cache
markers and one was in use; there are now two. Together needs no marker — its
cache is automatic by prefix, so **the order is the marker**.

### And it can now say whether it is working

`cache_read_tokens` is recorded with every charge. Until today a broken cache
and a perfect one left an identical record, and at this volume that means
finding out from the invoice. It is the house rule applied to money.

### For the person using it

Cached prefixes are not only cheaper, they are **faster**: the provider skips
recomputing them, so the answer starts sooner. The saving and the wait improve
together.
## 2026-08-22 · PWA: installable, offline, and honest about it (Programador 3)

The platform can now be added to an iPhone's home screen and opened without a
network. Three pieces:

**Installable.** `manifest.webmanifest` plus PNG icons. The `apple-touch-icon`
pointed at `/logo.svg` and iOS does not accept SVG there, so adding to the home
screen produced a blank icon. Icons are generated from
`public/iconos/fuente-cuadrado.svg` — square and opaque on purpose, because iOS
applies its own rounded mask and a source that is already rounded leaves dark
corners inside the crop. Verified by reading the corner pixel: alpha 255.

**Offline.** `public/sw.js`. Verified with the dev server stopped and again with
a production build: the app boots from cache, assets included.

**Offline WITH YOUR DATA, and this reverses an earlier decision.** The first
version refused to cache `/api/*` at all, to avoid showing stale data as if it
were live. Eugenio asked for his projects to be readable on a plane, so the rule
changed — but the reason it existed did not:

- The network always wins while it works. A cached answer can never shadow a live
  one; the copy is only returned when the request actually failed.
- Every parachute answer is stamped `X-Desde-Cache: 1` and `X-Cacheado-En`.
- `src/avisoSinConexion.ts` reads those headers and shows a banner saying how old
  the copy is. It wraps `fetch` rather than living in a component, because the
  data is read from dozens of screens and none of them should have to remember.
- GET only. Nothing that writes is ever cached.

Verified with the server stopped: 4 projects returned, stamped, banner visible,
and an endpoint never requested online still fails instead of inventing a copy.

**Camera.** New "Cámara" type in the create "+": photo or video, uploaded to the
platform. On a phone `capture` opens the system camera — it records video and
needs no separate permission; on a desktop, where the attribute is ignored, the
photo path uses a live `getUserMedia` preview (`src/components/ui/CapturaCamara.tsx`).
The choice asks the browser what it can do, not how wide the screen is. Server
side needed nothing: video MIME types and `kind: 'video'` windows already existed.

NOT VERIFIED, and stated as such: the live camera preview (permission denied in
the automation browser) and "Add to Home Screen" itself, which needs real Safari
over real HTTPS.

### Follow-up, same session — making the install findable (Programador 3)

`src/avisoInstalar.ts`. On iOS the browser never offers to install a web app:
there is no `beforeinstallprompt`, and Share → Add to Home Screen is buried in a
sheet. An app nobody can find how to install is the same as one that cannot be.
So: a one-time card, on iOS Safari only, never when already running standalone,
silent for 30 days once dismissed.

Also `CapturaCamara.tsx`: `window.isSecureContext` is now checked first. Without
https, `navigator.mediaDevices` does not exist at all, and the previous message
("this browser does not allow the camera") blamed the browser for a missing
padlock. It now says which one it is.

Still unverified by me, and only verifiable on Eugenio's own devices: the install
card on a real iPhone, and the live camera preview (permission is denied in the
automation browser).

**Correction, found by looking at it on a 375px screen:** both overlays were
anchored to `bottom: 0` and were sitting *behind* the platform's fixed mobile
navigation bar (`z-index: 9999`). The offline banner was invisible on the exact
device it exists for, and the install card had its only button covered. Fixed in
`src/anclajeInferior.ts`, which measures whatever is pinned to the bottom edge
instead of hard-coding today's 44px — that bar is mobile-only and belongs to
another file, so a copied number would rot in silence.

### Tested for real, and three defects it found (Programador 3)

Ran the platform in production mode (`NODE_ENV=production`, `dist/`) on 3002 and
tried it with the server switched off. That test is the whole reason to trust any
of the above, and it broke three ways:

1. **Every cache write was fire-and-forget.** `caches.open(...).then(...)` with no
   `event.waitUntil` lets the browser kill the worker the instant the response
   reaches the page. The result looked random: `/api/data/*` was saved, the feed
   (`/api/publicaciones`, `/api/proyectos`) was not, and offline the home screen
   said **"0 publicaciones"**. All four writes are now inside `waitUntil`.

2. **The first visit cached nothing of the feed.** A service worker does not
   control the page that installs it, so every request the app fires on that
   first load goes straight past it. The platform only worked on a plane from the
   *second* visit — and the first visit is exactly when somebody adds it to their
   home screen and then tries it. `activate` now warms three endpoints.

3. **`huecoInferior()` swept every element in the DOM** calling `getComputedStyle`
   and `getBoundingClientRect` on each, wired to `resize`, which fires dozens of
   times while a phone rotates. Replaced with one `elementsFromPoint` at the
   bottom edge, plus a 150 ms debounce.

**Result with the server stopped:** the app opens, shows 84 publicaciones and the
real feed, and the banner reads "estás viendo una copia guardada hace menos de un
minuto" sitting at `calc(44px + env(safe-area-inset-bottom))` — clear of the
navigation bar.

**A note on where this was verified.** The in-app automation browser fails *every*
request a service worker handles — a fifteen-line worker that does nothing but
`fetch(event.request)` fails there too. Everything above was therefore checked in
real Chrome. The iPhone itself (the install card, "Add to Home Screen", and the
live camera preview) is still only verifiable by Eugenio on his own device.

---

## 2026-08-22 · Say which figures are measured and which were invented (PR #203, #204, #207)

`CLAUDE.md` opens by saying that mistaking simulated data for measured data is
the most expensive error made in this project. It was still live, in the most
literal way possible: **no screen said which was which.**

Counted against the database: of 20.557 indicator observations, **20.499 are
simulated** — the 179 Madrid municipios («Excel Municipios Madrid (simulado)»)
and the 32 European countries («IA — número aleatorio»). Every row already
declared its source. Nothing read it.

Three changes went out, in this order, and each one found the next.

### #203 — the mark exists

`src/utils/origenDelDato.ts` classifies a source into four states, and the
fourth is the one that matters: `desconocido`. The tempting shortcut is to
treat "no source written" as measured — most good data arrives without
decoration — and that is exactly presenting as certain what nobody has checked.
**If it does not say, we say it does not say.**

Red for `simulado`, and not a discreet grey, because a discreet mark is learned
away in two days. The damage here is not confusion for a minute: it is somebody
citing an invented figure in front of people who decide with it.

### #204 — the mark reaches everything, and two worse things surface

Half a platform marked is a promise the other half breaks: once you have seen
the red warning on one screen, its absence elsewhere reads as "this one is
real". So it went to the AI assistant, the objectives grid, the indicator list,
the indicator sheet and the explorer canvas.

Two things came out of that work, both worse than what it set out to fix:

**1. The mark described a different number from the one beside it.** The map
classified a territory by the sources of its *observations*, then painted its
fourteen *objective* percentages. For Spain those disagree: its water
observations are real (INE, MITECO, FAO — 41 of them) but the percentages came
from a hand-written table in `src/data/seed.ts`. The sheet said **MEDIDO over
fourteen invented numbers.** A mark that reassures about the wrong figure is
worse than no mark, because now it vouches for it.

Fixed by deciding the origin **in the same branch that decides the number**,
and by moving `getObjectivesForTerritory` out of `server.ts` into
`src/utils/puntuacionesDeObjetivo.ts` so the assistant runs the same
calculation the screens do instead of forming a second opinion. That is the
recurring failure of this house — two truths about the same thing — and it had
appeared here twice in one afternoon.

**2. `|| 0` turned "no data" into a score of zero.** Spain read **0%** in
Education, Mobility, Energy, Technology, Employment and Governance. Saying a
country scores zero is a stronger claim than any simulated figure. Now it says
«Sin datos» — 8 cases on that page alone.

**The mark is rationed on purpose.** The rule is stated once at the top and the
pill only appears on a figure that does *not* match it. Fourteen identical red
badges teach people to stop looking, which is the same failure as saying
nothing, reached from the other side.

### #207 — a real measurement beats the hand-written table

Eugenio's call, and the priority had been backwards. The seed table exists to
**fill in** where there is no data, and it won every time. Spain's 41 real
observations were sitting in the database, loaded, reaching no screen.

    AGUA          98 → 74    (medido)
    ALIMENTACIÓN  86 → 75    (medido)
    CONVIVENCIA   85 → 65    (medido)
    ECOSISTEMAS   76 → 67    (medido)
    VIVIENDA      67 → 67    (medido — same number, different provenance)
    SALUD         91 → 91    (still simulado: its one indicator has no
                              observation for Spain, so the fallback is right)

**The drop is the point.** 98% was flattering and made up; 74% is what the
measurements say.

The rule is deliberately narrow: **a real figure wins over any filler; between
two fillers, nothing moves.** Simulated observations do not beat the seed
table — there is no reason to prefer one invention over another, and flipping
them would have churned the numbers of 179 municipios and 32 countries for
nothing.

### Where it stands

**3.118 of 3.140 objective scores are still simulated — 99,3%.** The 99,7%
figure quoted earlier was about observations; the percentages people actually
look at were 100% simulated until #207 and are now 99,3%.

**Verified in the browser, never by a 200** — the deploy serves the whole
application for any route, so a status code proves nothing about a screen. Each
of the three was checked by reading the rendered page and taking a screenshot
of production.

---

## 2026-08-22 · Count what the open chat costs, and leave it open (PR #208)

`POST /api/ai/chat` answers without a session. That is intentional — the prompt
itself calls whoever asks «visitante no registrado» — and Eugenio decided today
that it stays that way, **with no limit on free questions**.

The other half of the hormiguero note (`INCMT4B2B9K1P9`) was not a decision, it
was a hole: the INSERT into `ai_usage_charges` sat inside `if (req.user)`, so
every anonymous question was paid for and left no trace. The cost panel showed
less than the invoice, and the gap grew exactly with usage — the kind of thing
you find out from the bank statement.

**Not setting a limit is a decision. Not being able to see it is not.**

- `user_id` becomes nullable (migration `0066`). NULL means what it looks like:
  nobody was signed in. An "anonymous" user row would have been worse — every
  user count on the platform would then include a person who does not exist.
- Nobody is billed: `fee_cents` and `total_cents` stay at zero.
- The admin panel gains one number: what visitors without an account have cost.
  It is `null`, not zero, when the question was not asked — zero would claim
  nobody has used it.

Verified end to end locally: one anonymous request wrote a row with
`user_id = null`, `cost_cents = 0,061`, `total_cents = 0`, and the panel's query
returns it. The test row was deleted afterwards.

## 2026-08-22 — Three things Eugenio hit with the app installed on his iPhone

He installed it, used it, and sent a screenshot. All three are the same kind of
bug: the app doing something nobody asked for.

### 1 · The bottom bar sat on the home indicator

Installed full-screen there is no Safari bar underneath, so the platform's own
navigation ended up on the iPhone's home line. `env(safe-area-inset-bottom)` is
0 in a browser and ~34px installed, so one rule covers both. It goes on as
`paddingBottom` with `boxSizing: content-box` — added *below* the buttons, so
the icons do not shrink when you install it — and `--hueco-muelle` (which
`Layout.tsx` uses to keep page content clear of the bar) became
`calc(44px + env(safe-area-inset-bottom))`.

`src/anclajeInferior.ts` needed no change: it measures the bar's real height
rather than copying a number, so the offline banner followed on its own.

### 2 · The camera opened an image editor nobody asked for

Eugenio: «cuando te lleva a cámara que no te salta el editor por defecto, sino
que sea tal cual como está y que luego te pregunte dónde guardarla».

You took a photo and got luz/contraste/filtros on top of it. The photo was
already fine; the only thing missing was where it went. New
`src/components/knowledge/DestinoCaptura.tsx`: the shot as it is, a title, and a
destination — a canvas of yours, or a standalone publication. **Editing became a
button you press.** Video takes the same path.

Canvases and not the "proyectos" board: a project is a board of cards (to
do / doing / done), so dropping a photo there would invent a card nobody asked
for. A canvas is where image and video windows already live.

### 3 · Creating a publication threw you onto the publications list

`navigate('/mis-publicaciones')` after every save. Creating a document or a
canvas *should* take you there — the next thing you do is write inside it. A
publication is finished the moment you create it, and being sent to a list means
walking back if you wanted to publish two things. It now confirms in place, with
"Verlo" and "Crear otra".

### A correction to the entry above this one

**The video path shipped in #205 never worked.** It posts `kind: 'video'` to
`POST /api/ventanas`, which whitelists `['imagen']` only
(`src/server/documentos.ts:418`): it returned 400 every time. The earlier entry
claimed "el servidor ya aceptaba vídeo antes de esto" — that was written without
checking, and it was false.

What is true, and checked in source this time: `POST /api/graphs/:id/windows`
does accept `video` (`WINDOW_KINDS`, `src/server/knowledge.ts:28`), so a video
lands in a canvas today. As a standalone publication the selector says exactly
that instead of a generic failure. Adding `'video'` to the whitelist is one line
in Programador 1's area and has been passed to them.

**Not verified by me:** phases 2 and 3 need a logged-in session, and I do not
create accounts or type passwords. Both endpoints were read in source rather
than exercised. Phase 1 was checked in the browser.

## 2026-08-22 — I fixed the camera in the wrong place, twice, and blamed the cache

Eugenio, after two deploys: «no ha cambiado nada en humanity.wiki del tema de
camara», then «igual te está faltando hacer el deploy amigo», then «humanity.wiki
en version movil sigue sin mostrar las mejoras».

I checked the served bundle each time, found my code in it, and told him his
phone was holding a stale copy. **It was not.** I then reproduced the supposed
staleness and it did not reproduce: a client controlled by the old worker picks
up a new bundle on an ordinary navigation, because the navigate branch is
network-first.

**The real cause.** His words were `el boton de camara va en las herramientas de
crear '+'`. The `+` in the bottom bar opens a panel in `AIAssistant.tsx` that
renders `HERRAMIENTAS_CREAR` — eight tools, each of which *navigates to a page*.
I put the camera in `CreadorPublicacion`, the dialog behind the green button on
the home feed. Different component. He was pressing the one I had not touched.

The same panel is where his third complaint lives, in plain sight:
`{ label: 'Publicación', destino: '/explorar' }` — a navigation to the
publications page, which is exactly what he asked me to stop doing. I "fixed" it
in the other component.

### What changed

`HERRAMIENTAS_CREAR` entries can now either navigate (`destino`) or open the
creator in place (`crear`), and `CreadorPublicacion` takes a `tipoInicial` so it
opens on the right tool. **Cámara** is the first entry; **Publicación** opens the
creator instead of leaving the page. The creator is mounted from the bar itself,
because the `+` exists on every screen and that is the only way Cámara works
wherever you are.

Verified in a browser, not by reading: the panel lists Cámara first, clicking it
opens the creator without changing the route, and Publicación does the same.
(Logged out it shows «Inicia sesión para crear publicaciones», which is correct.)

### The lesson, which is the expensive part

I was told plainly where the button went, built it somewhere else, and then spent
two rounds defending the deploy instead of opening the screen he was describing.
Checking that my code is in the bundle proves the deploy worked. It proves
nothing about whether the code is where the person is looking. **Open the screen
they named.**

### Kept anyway: the app can now repair itself

The staleness theory was wrong, but two things found while chasing it are worth
keeping, and they close the `?sw=off` workaround Eugenio rightly refused («es un
apaño, yo quiero que funcione sin esa url cutre»):

- `scripts/sellar-sw.mjs` stamps the built entry bundle's name into `dist/sw.js`,
  so a deploy that changes the app also changes the worker and the browser has a
  reason to re-install it. The first version listed `dist/assets/` and picked the
  first `index-*.js`, which was a chunk, not the entry — a stamp that would never
  change, from a file the page never loads. It reads `dist/index.html` now.
- `sw.js` v4 reverses the no-`skipWaiting` rule: it takes over at once, drops the
  stale code caches and reloads its clients. Waiting for every tab to close never
  happens on a phone.

  **But it never reloads a page somebody is looking at**, and the first draft
  did. Caught in review: three hours earlier I had refused to auto-reload with
  the argument «eso tira lo que estés escribiendo», and then wrote exactly that
  into the worker. This team deployed fifteen times in four hours; a long
  publication would have been lost by somebody else's deploy. A hidden page is
  reloaded — nobody types into a page they cannot see, and an installed app in
  the switcher is precisely the case that matters. A visible page is left alone
  and gets the "Actualizar" button instead, which is a person deciding rather
  than a deploy deciding for them.

---

## 2026-08-22 — The info «i» menu, top right (Programador 7)

The pages that explain the platform — `/sobre-red-humana` and its scoring
subpage — existed and nothing in the interface linked to them. A new `Info`
button in the top bar of `Layout.tsx` (before the ant, after the window strip)
opens a small dropdown listing them. Same open/close pattern as the account
menu: `useCerrarAlPulsarFuera`, same dropdown styling.

Why before the ant: first understand the platform, then ask things of the
team. Verified in the browser on port 3007 (menu opens, both links navigate,
button highlights on those routes). `tsc --noEmit` clean.

---

## 2026-08-22 — The (i) dropdown fell off a 375px screen (Programador 7)

Found verifying #221 in production on mobile, as the Dashboard asked: the
panel is `right-0` — right-aligned to the BUTTON — and on a phone the button
is not at the right edge, so the panel started at x = −33. Local desktop and
the logged-in local mobile view never showed it (the button sits further
right there), which is exactly why production had to be checked at 375px.
Fix: below `sm` the panel pins to the viewport (`fixed inset-x-2`); from `sm`
up the original button-aligned layout returns. Measured after: 8..367 on a
375px screen, desktop unchanged.
## 2026-08-22 — The camera screen, taken apart

Eugenio, with a screenshot: «la UX de darle a camara y que aparezca así es
terrible, no cumple las reglas internacionales de UI y UX, piensa por que».

He was right, and the worst item was mine from three hours earlier.

| Qué estaba mal | Qué rompía |
|---|---|
| Elegías Cámara en el «+» y aterrizabas en una rejilla de ocho herramientas con Cámara marcada | Hick, y progressive disclosure. Un paso que no avanza |
| La acción real quedaba por debajo del pliegue | Fitts, y la guía de Apple: lo principal donde llega el pulgar |
| Los dos botones eran recuadros de línea **discontinua** y gris | El borde discontinuo es «arrastra aquí un fichero», un gesto que no existe en un móvil. Gris sobre blanco se lee como desactivado |
| Pedía el título **antes** de hacer la foto | El título es metadato: va después del contenido, y ya se rellena solo |
| **«La foto se abre en el editor antes de guardarse»** | Falso desde esa misma tarde: yo cambié el comportamiento y no repasé lo que decía la pantalla |
| «Al muro» aquí, «Publicación» en el «+»; «Imagen» y «Cámara» casi lo mismo | Nielsen 4, consistencia |

### Lo peor de la lista es el texto

Un texto que describe algo que el programa ya no hace es peor que no tener
texto: enseña a no leer la pantalla. Y no llegó por descuido ajeno — lo dejé yo
al cambiar el comportamiento sin repasar la interfaz que lo describía. **Cambiar
lo que hace algo incluye cambiar lo que dice que hace.**

### Qué cambia

Rejilla oculta tras «Cambiar de herramienta» cuando llegas con la herramienta ya
elegida; dos botones **sólidos** de 68px, verde y negro, sin scroll; el título
sale de aquí y se pregunta en el selector de destino; y el texto dice lo que
ocurre de verdad: «Después te preguntamos dónde guardarla».

Pendiente, en su propio cambio: unificar «Al muro»/«Publicación» y fundir
«Imagen» con «Cámara», que son dos nombres para lo mismo.

### Cómo se verificó, y una nota de higiene

Ese paso vive detrás del inicio de sesión, así que **salté el candado en la copia
local** para poder mirarlo, y lo restauré en cuanto tuve la captura (`{!user ?`
de vuelta, cero apariciones de `{false ?`, `tsc` limpio). Nunca salió de este
ordenador y no entró en ningún commit. Se deja escrito porque un atajo así, sin
contarlo, es exactamente cómo un candado desaparece sin que nadie lo decida.

## 2026-08-22 — One name per thing, and a sweep that found two more lies

The last item of the UX list. «Imagen» and «Cámara» were the same tool under two
names — both end in an uploaded photo and the same destination step, and they
differed only in where the photo came from. «Al muro» here was «Publicación» in
the `+`.

| | Antes | Ahora |
|---|---|---|
| Publicar en el muro | «Al muro» aquí, «Publicación» en el `+` | **Publicación** en los dos |
| Foto | Dos herramientas casi idénticas | **Cámara**, una, con tres procedencias: hacer foto · grabar vídeo · elegir del carrete |

The name is **Cámara** and not something tidier like «Foto o vídeo» because that
is the word Eugenio used and the one already in the `+`. Renaming it to my own
coinage would have created the very inconsistency this change removes.

### The sweep, and why it mattered

Merging the two tools deleted a screen — and with it a second copy of this
afternoon's lie: **«Elegir una foto — se abrirá el editor»**. I had changed the
behaviour, fixed the one string I remembered, and missed this one. A third turned
up in a doc comment: «Imagen: se sube el original y se abre el editor encima».

Three copies of the same false claim, from one behaviour change. So the rule
written this morning needs its second half: changing what something does includes
changing what it *says* it does — **and the text is never in one place. Grep for
it.** Fixing the string you happen to remember is how a screen ends up
contradicting itself in the corner nobody reopened.

Swept `src/components/knowledge/` and `CapturaCamara.tsx` for anything still
describing the automatic editor: clean.

## 2026-08-22 · La base de datos pasa de cero copias a dos capas (prog6)

**Antes de hoy no había ninguna copia de seguridad.** La casilla
`Backups de BD a R2 con pgBackRest` de `docs/13_DEPLOY.md` llevaba sin marcar
desde principios de agosto y no existía ni un `pg_dump` en el repositorio: los
datos de producción vivían en un único volumen de un único servidor.

**Capa 1 — volcado diario en el servidor** (PR #223, ya en producción). Servicio
`copias` en `docker-compose.prod.yml`, misma imagen que `db` porque `pg_dump`
tiene que ser de la versión del Postgres del que lee. Un volcado por día en
cuanto el contenedor puede —no a hora fija, para que un reinicio no se salte el
día—, comprobado con `pg_restore --list` **antes** de que se le ponga el nombre
bueno, y se tira si trae menos de 50 objetos. Se guardan 14 diarias y el día 1
de cada mes durante 6 meses.

**Capa 2 — sacarlo fuera de Hetzner** (esta PR). Petición de Eugenio el mismo
día: «hagamos el volcado de copia de base de datos fuera de hetzner y olvidemos
lo otro de momento de la foto» — es decir, **la foto de disco de Hetzner queda
aparcada, no elegida**. Servicio `copias-remoto` con `rclone` que sube cada
volcado nuevo a un cubo compatible con S3 (pensado para Cloudflare R2). **Copia,
nunca sincroniza**: un espejo borraría fuera lo que se borrara dentro, que es
justo de lo que esto protege.

Dos decisiones que conviene no deshacer sin pensarlas:

- **El aviso de que se ha dejado de hacer.** El fallo peligroso de una copia no
  es que falle, es que deje de hacerse en silencio. Los dos contenedores salen
  `unhealthy` si la última tiene más de 36 h. Pero `copias-remoto` **sin
  configurar sale sano**: un contenedor eternamente en rojo enseña a ignorar el
  rojo.
- **`restaurar.sh probar`.** Restaura en una base aparte, cuenta y la borra. Es
  la diferencia entre tener un fichero y tener una copia de seguridad.

Verificado en producción el mismo día: primer volcado real de 1262 KB y 884
objetos, **restaurado** con 126 tablas / 14 usuarios / 242 territorios,
**idénticos a la base viva**.

Queda pendiente y es decisión de Eugenio, no técnica: **los volcados no van
cifrados** y ahora además viajan a otro proveedor. Cifrarlos es fácil; lo
difícil es dónde vive la llave, y una copia que no se puede descifrar es peor
que ninguna.
### And then the offline test came back blank (same day, Programador 3)

I changed the service worker twice today, so I re-ran the thing it exists for:
load once, stop the server, reload. **Blank page.** The title rendered — the
shell HTML came from the cache — and nothing else did.

**Why.** `PRECACHE` never included the app's own code. The comment above it said,
with total confidence, that hashed files «se guardan según se usan, en vez de
adivinarlos aquí». That is wrong for exactly one visit, and it is the visit that
matters: **a service worker does not control the page that installs it**, so on
the first load the app's JavaScript goes straight past it and is never copied.
Somebody who installs the app and gets on the metro that afternoon is precisely
that case.

It had been passing until now only because my own testing reloaded several
times. A real person does not.

**Fix, reusing something already there.** `scripts/sellar-sw.mjs` already stamped
the entry bundle's name into `sw.js` so a deploy would change the worker. It now
writes the whole boot set — entry module and stylesheet — into a `BUILD` array
the worker precaches on install. One line doing both jobs: version detection and
precache. The names cannot be hard-coded because they change every build, which
is why this has to come from the build and not from the file.

Verified: fresh install, **one** load, server stopped, reload → the app opens
with 83 publicaciones and the banner «copia guardada hace 1 minuto». That is the
exact sequence that was blank ten minutes earlier.

**The lesson is the same one as this morning, in a different costume.** A comment
asserting why something is safe is not evidence that it is. That one had been
sitting there since the first version, sounding reasonable, describing a
guarantee the code never made.

## 2026-08-22 — A photo into a task, from both ends

Eugenio: «te debe permitir meterla en uno de tus proyectos, y dentro de tus
proyectos en alguna tarea», y «desde una tarea directamente tiene que haber la
posibilidad de subir una foto o video a la tarea».

**Half of it already existed and I checked before building.** A task already
accepted an image (`TableroKanban.tsx`, block `{tipo:'imagen'}`), and there was
already an `<Adjuntos>` panel for files. What was missing was video, and — the
one that matters on a phone — `capture`, so the button opened the camera instead
of the camera roll. The real case is standing in front of the thing: the
half-built rig, the fault. Sending you to the roll means leaving, shooting in
another app, and coming back.

| | |
|---|---|
| Ficha de tarea | Tres botones: **Foto · Vídeo · Carrete**. Los dos primeros con `capture="environment"`; el tercero sin él, que es el camino para lo que ya tienes hecho |
| Bloques | Se pinta `tipo: 'video'`, con `playsInline` — sin eso un iPhone se lleva el vídeo a pantalla completa y te saca de la tarea |
| Selector de destino | Nueva sección **«Añadir a una tarea»**: proyecto → tarea, en dos pasos |

### Corrijo un razonamiento mío de esta misma tarde

La primera versión del selector dejó fuera los proyectos, con este argumento:
«un proyecto es un tablero de tarjetas, meter una foto ahí sería inventarle una
tarjeta que nadie ha pedido». Estaba mal planteado: **la foto no va al tablero,
va dentro de una tarea concreta**, que es donde ocurre el trabajo. La foto del
montaje pertenece a «Medidas reales del chasis», no al proyecto entero. Y no hay
que inventar nada: una tarea ya guarda sus notas en `bloques`.

### Una prueba en producción que encontró un fallo de diseño

Intenté escribir un bloque de prueba en una tarea real con la cuenta de agente,
para verificar el guardado de verdad en vez de leyéndolo. **403**: `PUT
/api/roadmap/:id` responde «Solo quien creó el proyecto puede editar sus
tarjetas». El proyecto quedó intacto —0 bloques antes, 0 después— y el fallo que
destapó era mío: `/api/proyectos` devuelve también los públicos de otras
personas, así que el selector iba a ofrecer destinos que rechazarían al usuario
**después** de elegir y esperar. Ahora solo salen los propios.

### Deuda consciente, con su número

Guardar en una tarea lee sus `bloques` y reescribe la lista entera, porque el
endpoint reemplaza el campo. Si otra persona añade una nota en esos dos
segundos, se pierde la suya. Con una tarea que estás mirando tú, con el móvil en
la mano, el riesgo es pequeño; deja de serlo en cuanto varias personas trabajen
sobre la misma tarea. Lo correcto es un endpoint que **añada** en vez de
reemplazar: son unas líneas en `src/server/roadmap.ts`, área de Programador 1.

**No verificado:** ninguna de las dos pantallas, las dos detrás del inicio de
sesión. Sí verificada, con una petición real, la regla del servidor que explica
el filtro.

---

## 2026-08-22 — The view route was a mint, and it is closed (Programador 7, found by 4)

`POST /api/windows/:id/view` required no session and granted the window's
author 0.01 points PER CALL: a curl loop fabricated internal money into any
chosen account — 10,000 calls, 100 points. Found by Programador 4 reading the
deployed code (note INCMT4IXIUD3UC), deliberately without calling the route.

Three locks now, `views` still counts for everyone (counting is not paying):
no session → no minting (the 2026-08-08 promise was «when OTHER USERS view
it»); self-views still don't mint; and a per-window daily minting cap counted
from the ledger itself (`PUNTOS_VISTA_TOPE_DIA`, 50 cents-of-point/day
default) — with accounts required, inflating a window hits the ceiling and
leaves named traces.

Verified locally: 5 sessionless views minted nothing; 3 with a session minted
exactly 3 cents; 58 total attempts stopped at exactly 50 entries. Test
session was tagged `claude-dev-verificacion` and deleted; balances, views
counter and ledger rows restored (trigger disabled/re-enabled for cleanup —
local only).

Agreed with prog4 and written in /tokenomics/tareas: the day the monthly pot
pays out over counted views, `views` (raw, displayed) and valid views (one
per person, session required) must be TWO numbers, and the pot only reads
the second. PUNTOS_TRANSFERENCIA stays off until this fix is deployed.

## 2026-08-22 · Dos tableros nuevos, y el candado que hace que uno sirva (prog6)

**Seis notas del Feedback decían en texto llano, a la vista de cualquiera, por
dónde entrar en la plataforma**: que el login no tenía límite de intentos, que
la aplicación se conecta a la base de datos como superusuario, que falta
`Content-Security-Policy`, que los ficheros subidos se sirven sin comprobar
sesión y que había una ruta fabricando puntos sin pedir sesión.

Eugenio: «hay cuatro cosas de seguridad en el hormiguero, traslada ahí esas
cuestiones para limpiar el hormiguero, que es un tema para el público». Y
aparte: «vas a crear una página en (i) donde pondrás tu visión y estrategia de
los servidores […] de forma transparente a nivel de coste […] y un kanban como
el del hormiguero con las tareas que tienes pendientes».

**Una columna `area` en `incidencias`, no un tablero nuevo** (migración `0075`).
La maquinaria del Feedback ya resuelve estados, adjuntos, permisos, el token de
los agentes y el archivado; un tablero paralelo habría sido una segunda lista
que nadie mira, y las notas de seguridad son justo las que no pueden acabar
ahí. Tres tableros: `general`, `seguridad` y `servidores`.

**El candado está en el servidor, en cinco puertas.** Ver el tablero, crear,
mover una nota de tablero, el contador del botón de la hormiga —un número
también filtra: diría cuántos agujeros hay a quien no puede ver ninguno— y los
adjuntos. Esa quinta la encontró prog4 revisando, y es la que convierte un
candado en un candado: **la nota quedaba escondida y su adjunto no**, porque
`express.static` sirve `/uploads` sin comprobar sesión. Comprobado contra
producción, no deducido. El tablero de seguridad no admite adjuntos y dice por
qué.

Y una decisión escrita en vez de tapada: **un programador IA con su token lee
el tablero de seguridad**, porque somos quienes trabajamos esas notas. Eso
amplía lo que vale un token robado —antes, un color equivocado; ahora, la lista
de por dónde entrar—, así que cada lectura con token **deja rastro con nombre y
hora** (idea de prog4: no le quita el acceso a nadie y convierte «no lo podemos
impedir» en «lo veríamos»).

**El candado nombra `seguridad` explícitamente y no «todo lo que no sea
general»**, porque el tercer tablero, `servidores`, es público a propósito. Lo
que se esconde se decide uno por uno, nunca por descarte.

**`/api/gasto` dejaba caer reconocimiento.** Llevaba abierto desde el 8 de
agosto y estaba bien porque solo lo leía la pestaña de Visión; la página nueva
lo pone en una pantalla pública. Aviso de prog2, y medido: no daba IP ni
nombres de contenedor, pero sí el nombre de la máquina, el modelo exacto
(`CPX42`, o sea 8 núcleos y 16 GB — cuánta máquina hay que tumbar) y los avisos
de «falta tal variable», que llevan dentro los nombres de nuestras claves. Los
euros siguen públicos: es la transparencia que pidió Eugenio y no sirve para
atacar nada. Filtrado **al salir** y no al guardar, para no tener dos cachés
que se desincronicen.

**Y los límites de peticiones** (`src/server/limites/`, migración `0076`), que
**entran pero no están conectados a ninguna ruta todavía**: `auth.ts` es de
prog1. Cinco reglas acordadas con prog4, y las dos que importan son las que
salieron de discutirlas: quien acierta la contraseña no paga el retraso de los
que fallaron —si no, cualquiera te deja fuera de tu cuenta fallando adrede— y
**dos contadores, nunca uno**: el freno se limpia al acertar, el registro de
fallos no se limpia nunca. Con uno solo, quien prueba mil contraseñas y acierta
la última se lleva borrado su propio rastro.
### 2026-08-22 — Veracity, phase 1 of 10: a debate is a tree

Eugenio opened a new area and put programmer 5 on it: *«un sistema de veracidad
dentro de la APP para que lo que la gente publique sea información coherente con
la otra información que hay, y poder generar un espectro de visiones sobre una
verdad, y que haya debates visuales sobre los temas más relevantes. Inspírate en
Kialo»*. The ten phases are in `memory/13_VERACIDAD.md`; this is the first, and
it is all data — no screen uses it yet.

- **Three tables** (`drizzle/0078_veracidad_debates.sql`): `debates` (the thesis
  under discussion), `argumentos` (the tree hanging off it) and
  `veracidad_fuentes` (what any of it cites). No 44th junction table: the tree
  is a `parent_id`, and a source belongs to what it cites.
- **Why not the knowledge graph, which already has `apoya`/`contradice`**: a
  graph edge carries no stance, no weight and no evidence, and a graph node can
  hang from several parents — the moment it does, the reader no longer knows
  what is being argued about. A debate is a tree on purpose. Phase 7 will *draw*
  debates on the existing canvas; the model stays separate.
- **`src/server/veracidad.ts`**: list and read (the whole tree and all its
  sources in three queries, never one per node), open a debate, argue, cite,
  withdraw a citation, archive. Level 1 to open or argue — the same standing as
  publishing; level 3 to close a debate, because that is a judgement about the
  commons.
- **Depth is derived from the parent, never sent by the client**, so no request
  can flatten or graft a branch; a parent belonging to another debate is
  rejected, and the thread stops at 12 levels with a message that says to open
  its own debate instead.
- **`impacto` is NULL until somebody votes, and 0 only when people voted and it
  moves nobody.** Initialising it to 0 would make a brand-new argument look like
  a rejected one — the house rule that every component must be able to say «I
  don't know» distinguishably.
- **The only automatic step of the veracity ladder is `sin_fuente` →
  `con_fuente`**, and it reverses when the last source is withdrawn. Everything
  above that is a human judgement and belongs to phase 2, not to pasting a link.
- **Verified against the local server on port 3004: 25 checks, 25 green** —
  including 401 without a session, an invented `postura` rejected *listing the
  valid ones*, a cross-debate parent, the tree nested three levels deep, the
  badge going up and back down with the source, and an archived argument leaving
  the tree without leaving the database. One bug found and fixed on the way:
  `= ANY(array)` through the Drizzle template reached Postgres as a record, so
  every read of a debate answered 500. The test user and both test debates were
  deleted in the same session.

### 2026-08-22 — Veracidad: su página en la «i», con sus principios y su tablero

Eugenio: *«genera una página en el menú superior derecho, donde pone "i"
información, y ahí añade el Veracidad, como página donde pongamos los principios
y tecnologías que usamos para esto; haz un kanban con todas las tareas que
tenemos hacia adelante, copia el modelo de Hormiguero»*.

- **`/veracidad`**: qué es esto en dos párrafos, **seis principios** (no hay una
  verdad publicada sino un espectro de visiones; un debate es un árbol; lo que no
  tiene fuente lo dice; lo que pesa lo decide la gente; cerrar no borra al que
  perdió; todo puede decir «no lo sé») y **seis piezas** de con qué está hecho —
  y casi ninguna es nueva: el vocabulario del grafo, el lienzo del grafo, la
  tabla de puntuaciones que ya existía.
- **El tablero, con las 30 tarjetas de las diez fases**, en el `TableroKanban`
  que la hoja de ruta y los proyectos ya usan desde el 8 de agosto. **No estrena
  tabla ni componente**: son filas de `roadmap_items` con `grupo = 'veracidad'`
  (migración 0079, décimo grupo), así que las mismas tarjetas salen también en
  «Visión y hoja de ruta» sin sincronizar nada. Su título lo dice — hay ya
  varias listas de tareas en la casa con la misma pinta, y quien mire una tiene
  que saber en cuál está.
- **La entrada del menú es una línea** en `src/paginasInfo.ts`, la lista que
  salió antes en la PR #241.
- Verificado en el navegador: el menú (i) abre con Veracidad, la página carga,
  el tablero pinta 30 tarjetas repartidas en 2 hechas / 1 en curso / 27 por
  hacer, y las 25 comprobaciones de la API de la fase 1 siguen en verde con el
  módulo ya registrado en el servidor.

**Lo que no está**: `server.ts` lleva las dos líneas que registran el módulo,
pero ese fichero lo tiene reservado el programador 1 — va aparte, en cuanto lo
suelte. Sin ellas la página se ve y el tablero funciona (el tablero lee la hoja
de ruta), pero las rutas de debates no existen.

### 2026-08-22 — Telecomunicaciones: mensajes en vivo, llamadas y videollamadas (Programador 8)
Petición de Eugenio: «quiero que esta plataforma sustituya a WhatsApp, que se pueda enviar mensajes y hacer llamadas y videollamadas compartiendo pantalla etc. Y que con un número de la persona le puedas encontrar en la base de datos y enviarle un mensaje o llamarle, y le saltará en su aplicación».

**El cable** (`src/server/telecomHub.ts`). Una conexión abierta por aparato (SSE, `GET /api/telecom/conexion`), que es lo que permite al servidor hablarle a alguien sin que lo pida: por ahí llegan los mensajes, la presencia y el timbre. Se eligió SSE y no WebSockets por tres motivos, en orden de peso: un WebSocket se engancha al servidor HTTP y eso obliga a tocar `server.ts`, que está congelado; no añade dependencia (`ws` son 40 KB); y atraviesa Cloudflare y cualquier proxy porque es un GET que no termina. Cuesta que es de una sola dirección — el cliente contesta por POST, que para señalización son cuatro mensajes. **Una persona son varios aparatos**: cada conexión tiene su identificador y la señalización va a uno concreto, o la pestaña olvidada en el trabajo contesta a una negociación que no es suya.

**Las llamadas** (`src/server/telecom.ts`, `src/telecom/motor.ts`). WebRTC: el audio y el vídeo van de un navegador al otro, cifrados de extremo a extremo y **sin pasar por Hetzner**. El servidor solo presenta a los dos navegadores y comprueba que quien manda una señal es de verdad parte de esa llamada. Coste de una llamada en servidor: cero.

**Lo que se añadió a los mensajes**: aparecen solos, dos marcas de verificación (entregado / leído), «está escribiendo…», punto verde de presencia, fotos, archivos y notas de voz. Y botones de llamar y videollamar en la propia conversación.

**Buscar por número** (`GET /api/telecom/buscar`). Exacto y de uno en uno, nunca una lista, con freno de 40 búsquedas cada diez minutos: una búsqueda parcial sería un listín telefónico de toda la plataforma servido por la puerta de atrás. Y el cruce de la agenda importada con la gente registrada (`GET /api/telecom/mis-contactos`), que es la función que hizo grande a WhatsApp: no buscas a nadie, abres y tu gente ya está.

**Base de datos** (`drizzle/0080_telecomunicaciones.sql`): `users.telefono` (normalizado, único) y `telefono_buscable`; `mensajes` gana `entregado_at` y los cuatro campos del adjunto; tabla `llamadas` con las siete formas de acabar una llamada. El contenido de una llamada no se guarda en ninguna parte.

**Dos fallos que encontró la prueba automática y que no se habrían visto a ojo**:
1. *Cuatro carriles en vez de dos.* Quien contesta no debe crear sus transceptores: los crea la oferta al aplicarla. Cuando los creaban los dos, quien contestaba acababa con cuatro y los suyos no transmitían — una llamada que conecta y enseña la cara de uno solo.
2. *El acuse de lectura llegaba antes que el propio mensaje.* El servidor empuja el mensaje a la otra persona antes de contestar a quien lo envía; si ella lo lee en ese instante, el «leído» llega cuando el mensaje todavía tiene su identificador provisional. Ahora las marcas huérfanas se guardan y se aplican al bautizarlo.

**Verificación** (`scripts/probar-telecom.mjs`): dos navegadores de verdad con dos sesiones distintas, que se crean y se archivan solos. Pasa: presencia, búsqueda por número, mensaje en vivo, las dos marcas, timbre en la otra aplicación, negociación completa (los dos envían y reciben audio y vídeo, dos carriles y ni uno más), silenciar, compartir pantalla, colgar y el historial. **Lo que no se ha podido comprobar**: el apretón de manos final (ICE) no se completa en este Mac — se probó con dos conexiones dentro de una misma página, sin nada de esta aplicación por medio, y también falla. Que el audio suene entre dos personas hay que verlo entre dos aparatos de verdad.

### 2026-08-22 — Telecomunicaciones: las tres decisiones de privacidad (Programador 8)
El coordinador paró la fusión con dos preguntas que no tenían respuesta técnica, y tenía razón. Quedan resueltas así:

**¿Puede alguien comprobar si una persona está aquí escribiendo su número?** No, y ya no se puede por ninguna de las tres puertas. La búsqueda devuelve lo mismo —`persona: null`— si el número no existe y si existe pero su dueño ha apagado «que me encuentren»: no se distingue. Llamar por número usa el mismo filtro. Y la tercera puerta, que estaba abierta y no se había visto: al poner tu número, el mensaje «ese número ya está en otra cuenta» **confirmaba que esa persona tiene cuenta**. Ahora dice que no se puede usar y adónde escribir, sin confirmar nada, con un tope de cinco cambios de número por hora.

**¿Puede alguien llamarte sin conocerte?** Ya no, y esta es la que más importa. Aquí es peor que en WhatsApp y no al revés: en WhatsApp hace falta tu número, que tiene quien tú se lo diste; aquí cada persona tiene su página pública con su identificador a la vista, así que cualquiera podía hacer sonar el teléfono de cualquiera sin tener su número. `users.llamadas_de` (migración `0082`) admite `todos`, `conocidos` y `nadie`, y **viene puesto en `conocidos`**: quien ya se ha escrito contigo, a quien tienes en tu agenda importada, o a quien sigues. A un desconocido le sale «escríbele un mensaje primero», que es el camino que ya existía — un mensaje no despierta a nadie, un timbre sí. Se elige en la propia página de Teléfono, al lado del número, porque es la otra mitad de la misma decisión.

**¿Es opcional dar el número?** Lo era desde el principio: nada lo pide, ni al entrar ni al registrarse, y quitarlo es dejar el campo vacío y guardar.

También en este commit, y no es mío: `TextosProvider` no estaba montado en `App.tsx`. El Programador 1 escribió el proveedor, el componente, la tabla y las rutas del servidor, verificó las rutas… y la pieza estaba publicada y muerta porque nadie la había enchufado a la aplicación. Se ve al ir a usarla, no al escribirla. Enchufado, y los tres párrafos de la página de Teléfono son ya los primeros que lo usan.
## 2026-08-22 (XIII) — Security phase 0: the floor under "it cannot be corrupted"

Eugenio opened a fourth programmer with a brief of his own: *«esta herramienta
la van a utilizar altos directivos y gobiernos y no puede ser corrompible»*, with
blockchain and internal cryptography for the points and for the data, on the
Linux Foundation stack.

The strategy is `09_TARGET_ARCHITECTURE/03_SECURITY_AND_CHAIN.md`. Its
uncomfortable conclusion decided the order of the work: **four fifths of
"incorruptible" is bought in phases 0-2, and none of those three is a
blockchain.** A chain closes exactly one attack — the operator of the database,
which is us — and only once it is anchored where we cannot reach it.

### What was measured first, because none of it was known

| | |
|---|---|
| Write routes | **150**. An automated scan finds an explicit role check in 67, a session check in 59, nothing visible in 24 |
| Of those 24 | almost all *are* guarded, by helpers the scan cannot read (`requireAdmin`, `puedeConTabla`, `sesionDe`) |
| Encrypted at rest | **nothing**. The only cryptography in the product is password hashing and agent-token fingerprints |
| Signing secrets | in `.env` on the server and in the container's environment |
| The points balance | is the truth; `movimientos_puntos` is a receipt written beside it, and `ajuste_admin` mints points with no counter-entry |

**The finding is not "24 open routes". It is that the machine cannot tell.**
With no shared policy module, "is every write authorised?" is answerable only by
a human reading 150 handlers, and that question eventually gets answered wrong.

### What now exists

- **`src/server/seguridad/politica.ts`** — one table, 150 routes declared. 40
  reviewed by hand with the reason for each level; the other 110 are declared as
  `revisar`, which is a third answer and not a pass. That number reaching zero is
  the rest of phase 0.
- **`npm run seguridad:permisos`** — the question, answered by a machine. Fails
  on a route nobody declared, or a table entry whose route no longer exists.
- **`src/server/seguridad/guardia.ts`** — the table applied, registered in
  `server.ts` (one line) in **`avisar` mode**: it logs what it would have
  rejected and rejects nothing. `SEGURIDAD_MODO=exigir` turns it on without a
  deploy. Verified on port 3003: in `avisar` the route's own message reaches the
  caller; in `exigir` the guard answers first; public routes and `GET` are never
  touched.
- **`src/server/seguridad/cifrado.ts`** — envelope encryption, one key per
  record, and the wrapped key returned *separately* so it lives in its own table.
  That separation is what makes destroying a key delete the data in copies that
  were already made, which is the only erasure that works on backups.
- **`drizzle/0064_registro_sellado.sql` + `registro.ts`** — a record that only
  grows and is hash-chained. The verifier names the first broken entry *and the
  kind* of break: editing a row and deleting one are different failures. Two
  simultaneous writers cannot fork the chain — a unique index on `huella_previa`
  settles it in the database, where they can actually see each other.

### The part that is worth saying out loud

The `UPDATE`/`DELETE` triggers on the sealed record are **hygiene, not
security**. They stop the accident and the 3am shortcut. The test proves it by
disabling the trigger, editing a row the way an insider with rights would, and
showing the verifier catches it and points at the exact entry.

And all of it is verifiable *by us*, on our own machine. Against someone who can
rewrite the database and recompute every hash at leisure, it is worth nothing —
only phase 2 closes that, by publishing a daily root where we cannot reach it.
Until that runs, the honest answer to "can this be corrupted?" is **not yet
fully**, and the difference between saying that and not saying it is the
difference between security and the appearance of it.

Nothing here is wired to production data yet: the guard warns, the encryption is
not used by any route, and nothing writes to the sealed record. Said plainly to
prevent the expensive mistake of believing they protect something they are not
yet attached to.

---

## 2026-08-22 (XIV) — Layers of protection based on how much a datum matters

Eugenio: *«céntrate en que nadie pueda corromper los datos, vamos a generar
capas de seguridad en base al nivel de relevancia de un dato o contenido»*. The
points/token side moved to another conversation.

Full plan and phases: `09_TARGET_ARCHITECTURE/04_DATA_INTEGRITY_TIERS.md`.

### The decision that had never been written down

Protecting all 129 tables at maximum is not safer: it is slower, costlier, and
it is how alerts stop being read. Protecting "the important ones" without saying
which those are is worse — everyone pictures a different set.

So every table now carries **four separate grades**, the ENS dimensions (RD
311/2022): integrity, confidentiality, traceability, authenticity. Four instead
of one label, because of the case that decides the whole design:

> **The commons indicators are public and are the gravest thing that can be
> corrupted here.** With a single "criticality" label they either get encrypted
> for no reason, or left unprotected.

The tier is **computed** from the grades, never written by hand. Raising
something's protection means arguing that it matters more.

| Tier | What it gets, cumulatively | Tables |
|---|---|---|
| 3 | signed entries, encryption where confidentiality is high, two-person rule, immediate alarm | **40** |
| 2 | every write appended to the sealed record, daily root anchored outside | **68** |
| 1 | authorised route, archive never delete, full history | **18** |
| 0 | recomputable from its source | **3** |

`npm run seguridad:clasificacion` fails the build on any table nobody has
classified. Five people work in this repo and tables appear daily; the day one is
created is the day somebody still remembers what it was for.

### Signatures, because the chain cannot prove authorship

The hash chain proves nothing has changed since it was written. It does **not**
prove we wrote it: anyone who can write to the table can forge a whole coherent
chain from scratch. Every entry is now signed with Ed25519 and a key that is not
in the database.

The test shows exactly what that buys: an entry edited **and its hashes
recomputed all the way down** passes every chain check, and the signature still
catches it.

Rotation is in from the first day — each signature carries the id of the key that
made it, so an entry signed by a previous key answers `NO SÉ` instead of being
accused of tampering. That distinction is the difference between a verifier
people trust and one they switch off.

### A bug the tests found, not production

With three retries and no wait, five simultaneous writers starved each other on
the unique index that keeps the chain from forking. Now eight tries with a short
uneven wait, and the test pushes ten at once instead of five: a concurrency test
that only fails sometimes is a test that gets ignored.

### Still attached to nothing

The guard warns, no route encrypts, nothing writes to the sealed record, and
`CLAVE_FIRMA_REGISTRO` is not set anywhere — so entries would be written unsigned,
and they say so rather than pretending. Phase B is what attaches it.

---

## 2026-08-22 — One valid view per person, window and day (Programador 7)

The ceiling #242 left, in prog4's number: one account could mint the 50-cent
cap on every window it owns, every day — a thousand own windows, 500 points
a day. Now `vistas_validas` (0084: window, user, day; primary key on the
three) is inserted inside the mint transaction with ON CONFLICT DO NOTHING,
and minting happens only when the row was actually inserted. The same attack
drops to ~0.10/day and stops paying.

Two counters, on purpose: `knowledge_windows.views` is the raw number shown
to everyone (anyone can raise it, it pays nobody); `vistas_validas` is the
number that WEIGHS — it mints today and it is what the monthly pot will read
when Eugenio's success-weighted distribution is built. Not a junction table
in the sense of the 43-table rule: a dated fact log like the ledger, holding
nothing about the view except that it happened.

Verified locally: 10 concurrent session views of one window plus 3 without
a session → exactly 1 valid view, 1 ledger entry, +0.01 to the author. Test
session tagged claude-dev-verificacion and deleted; rows, balance and view
counter restored.

---

## 2026-08-22 — /tokenomics, rebuilt on the pages registry (Programador 7, PR #220)

The public tokenomics page, now as ONE line in `src/paginasInfo.ts` instead
of edits in `App.tsx` and `Layout.tsx` — the Dashboard's request once five
programmers needed the same menu. The white paper draft and the task list
hang off it as views (`?vista=libro-blanco`, `?vista=tareas`): the house
pattern for "a different way of looking at the same place", and it keeps the
(i) menu at one Tokenomics entry without touching any contested file.

What the page says (all verified in the browser on 3007, menu entry and both
views included): what exists today (internal balance + ledger), the service
basket as declared intention (read from the public prices API when the #235
server lands, static fallback otherwise), the capacity-not-ownership design
principle, the four negations, the three-phase roadmap where only phase A
exists, the distribution model Eugenio decided (50% of the platform's
commission, success-weighted, 10-year expiry, 24-month dormancy, no euro
redemption, market discounts up to 100%), the white paper draft with its
[PENDIENTE] gaps, and the task list with rama A decided and the remaining
mint ceiling stated with prog4's number.


---

## 2026-08-22 — Point transfers behind a switch, white paper draft, task list (Programador 7)

Eugenio decided points WILL be transferable and asked for a ~1000-user pilot.
Three pieces, all on `prog7/token-piloto`, none live until his sign-off:

**Transfers** (`drizzle/0070`, `src/server/puntos.ts`, `src/pages/Vision.tsx`):
`POST /api/puntos/transferir` — recipient by email or exact display name,
amount rounded to cents, daily cap per sender (`PUNTOS_TRANSFERENCIA_TOPE_DIA`,
100 default) counted from the ledger itself, and the four writes (debit,
credit, two ledger rows) in ONE transaction — a half-done transfer is money
created or destroyed. Balance check inside the debit UPDATE (`puntos >=`),
plus a DB-level `CHECK (puntos >= 0) NOT VALID` so the database has the last
word without breaking legacy rows. **The whole route sits behind
`PUNTOS_TRANSFERENCIA=on`, off in production** — same doctrine as
TIENDAS_COBRO: value moves when Eugenio says so, not when a deploy lands.
UI: a folded "Enviar puntos" form in the Economía tab of /vision.

Verified against the local DB end to end: valid send (name and email),
insufficient balance (rolled back cleanly), self-send, unknown recipient,
zero/rounding, daily cap, no session — and the UI form itself (sent 1 point,
confirmation with recipient's name, balance refreshed). Test users and all
their rows deleted afterwards.

**White paper draft** (`/tokenomics/libro-blanco`): MiCA Annex I structure in
plain Spanish, every future claim conditional, gaps marked [PENDIENTE],
banner saying it is a draft reviewed by no authority.

**Task list** (`/tokenomics/tareas`): pilot → economic base → legal → chain →
public trading, each task with its real status. The «cotizar» fork is stated
honestly: crypto trading platform (CASP, still utility) vs stock exchange
(MiFID security, incompatible with this design) — a decision for the issuer
and their lawyer, not for the team.

---

## 2026-08-22 — One book, one seal: the ledger becomes append-only and rules the balance (Programador 7 + 4)

The Dashboard flagged a collision: transfers write ledger entries while
Programador 4 ships `registro_sellado`. The agreed answer — «un libro, un
sello»: `movimientos_puntos` stays the ONE accounting book (the truth);
prog4's sealed registry stores only row hashes chained in order (the proof).
No amounts in the seal, so the two can never disagree on figures; the chain
still proves no entry was rewritten. Capture happens by DATABASE trigger on
prog4's side (his 0071), so even a 3am psql edit gets caught — an app-level
API call would only seal what the app writes.

My side of the deal, in `drizzle/0072` and `puntos.ts`:

- **Append-only ledger**: a DB trigger rejects UPDATE/DELETE on
  `movimientos_puntos` — a correction is a contrary entry, never an edit.
  Enforced in the database because the app connects as the admin role, so
  REVOKE alone would not bind. Verified: both UPDATE and DELETE raise.
- **The book rules the balance**: `users.puntos` is now a derived cache.
  `cuadrarPuntos()` compares column vs ledger sum per user, logs every
  mismatch loudly and reposts the column from the book. Daily timer +
  `GET /api/admin/puntos/cuadre`. Verified: planted a 42-vs-100 mismatch,
  first pass reported and repaired it, second pass came back clean.
- **Backfill first**: accounts created by direct SQL (the AI-programmer
  script) had the DEFAULT 100 with no receipt; 0072 re-runs the 0026
  backfill so the first cuadre doesn't read a real gift as a discrepancy.

Honest limit, stated by prog4 and repeated here: between commit and seal
there is a window; a deleted capture note leaves a numbered gap in his
registry — visible, but its content unrecoverable. Narrowed by running his
sealer frequently; transfers stay behind the off switch regardless.

---

## 2026-08-22 — prog4's review of the transfer ledger, all six points taken (Programador 7)

Three blockers, three recommendations, all applied:

1. **TRUNCATE bypassed the append-only trigger** — row triggers never fire
   on TRUNCATE. Added a statement-level BEFORE TRUNCATE trigger (0074).
   Reading this file made prog4 find and fix the identical hole in his own
   registro_sellado.
2. **The backfill decided people's money** — a flat 100-point receipt plus
   ledger-driven repair would have rewritten any account whose truth wasn't
   exactly 100. Replaced with an OPENING ENTRY (`saldo_inicial`) equal to
   column-minus-ledger for every unsquared account: the first cuadre is
   clean by construction and nobody's balance changes. Verified with a
   250-point SQL-created account.
3. **The daily cap was checked outside the transaction** — two simultaneous
   requests read the same "sent today" and both passed. Moved inside the
   transaction after the debit locks the sender row. Verified: two
   concurrent 60-point sends, exactly one passed.
4. Deadlock: both user rows now locked in id order before any update.
5. The 24h timer would never fire on a daily-restart container: now runs at
   startup + every 6h.
6. Cuadre is born in AVISAR mode: reports always, repairs only with
   `PUNTOS_CUADRE_REPARA=on` (verified both modes). TODO left to wire
   descuadre detection into prog4's registry once #231 merges.

Migrations renumbered 0070→0073, 0072→0074 (prog4 owns 0070-0072; the
Dashboard's rule: reserve the migration filename the moment you pick the
number — done for both).

---

## 2026-08-22 — Rama A decided; the MiCA-shaped pieces of the point system (Programador 7)

Eugenio resolved the trading fork: **rama A** — if the token ever trades
publicly, it is on a crypto-asset platform under MiCA and stays a utility
token; it will NOT list on a stock exchange (if capital is ever raised there,
the issuing entity lists, never the token). The task page's fork banner became
a decision banner and the rama B tasks were removed; the file header keeps
what they said.

Then «create the system so that when MiCA arrives only small adjustments are
needed». Three pieces, the shapes MiCA will ask for, built now:

- **Published prices with history** (`drizzle/0083`, `tokenomics_precios`):
  price per service unit in points, append-only by trigger (changing a price
  is inserting a row), public at `GET /api/tokenomics/precios` with the whole
  history. Seeded with the page's orientative basket; admin endpoint inserts
  new prices, never edits.
- **Supply from the book**: `GET /api/tokenomics/resumen` — points in
  circulation and per-motive breakdown, computed from the ledger, public
  without a session. What a white paper cites instead of promising
  transparency.
- **One spend gate**: `cobrarServicio()` in `puntos.ts` — balance check plus
  ledger entry (`gasto_servicio`, service key in entidad_tipo) in one
  transaction with the row locked. When services start charging they call
  this; when the token arrives, "burn" is this same function.

/tokenomics now reads prices and circulation from the public API (static
basket as fallback) and shows a live figures section. Verified on 3007: both
endpoints, 403 without admin on price publishing, price UPDATE rejected by
trigger, page rendering API prices and the 905,5-point local circulation.

---

## 2026-08-22 — The monthly distribution, as a simulation that pays nobody (Programador 7)

`GET /api/admin/tokenomics/reparto?mes=YYYY-MM` computes Eugenio's
distribution with the month's real numbers and writes nothing: pot = 50% of
the platform's commission on paid transactions (the commission, never the
gross — it comes out of what the platform earns, not sellers' money); a
fixed half split equally among verified users (level ≥ 2); a variable half
split by publication success — valid views ×1, interactions (reactions +
comments) ×1, positive reviews (score ≥ 7) ×3, all weights and the
euro→point rate (`PUNTOS_POR_EURO`, 1 today) declared in the response. Only
numbers that cannot be inflated from outside count: `vistas_validas`, never
the raw counter. If nobody had measurable success, the variable part is
reported as unallocated rather than silently split: splitting it equally
would invent merit.

Born as a simulation on purpose, like the reconciliation and prog4's guard:
months of real figures before a single line moves a balance. The day it is
switched on, paying is walking this same list with otorgarPuntos and a new
motive — the list does not change. Verified on the local DB: 453.60 € of
commission → pot 226.80 → 4 verified → 28.35 fixed each, the variable
113.40 entirely to the one author with success (3 interactions, 6 positive
reviews), totals summing back to the pot; 403 without admin. Depends on
`vistas_validas` (PR #260) being in place.

---

## 2026-08-22 (XV) — Protecting people's data from the people who run the platform

Eugenio, in one line: *«haz lo que falte para que los datos de los usuarios
estén seguros incluso protegidos de los administradores e IAs»*.

Full write-up, with the four levels and what each one costs:
`09_TARGET_ARCHITECTURE/06_PROTECT_FROM_ADMINS.md`.

### What an administrator could do, measured before writing anything

`GET /api/db/tables/:name` served **the full contents of any table** from the
platform's own screen — private conversations, the finances people write into
their Juego Vital, the rows of the tables they create. Two clicks, no trace.
And level 4 is a single role: moderating a reported comment and reading two
strangers' conversation are the same number.

### And the AI, which came out better than expected — except for one thing

The index the assistant searches holds only the commons and published posts, and
**every** query for "your things" filters by the asker's id. Nobody can pull
somebody else's page through the assistant.

**Its conversations were another matter.** `POST /api/ai/chat` took
`conversation_id` from the request **body** and used it as given: it loaded that
conversation's last twelve messages as the model's context and wrote the new ones
into it. Send somebody else's id and the assistant answers you out of what they
told it. And the ids were guessable — timestamp in base 36 plus a number between
0 and 1295 — on a route with no session and no rate limit.

Closed with two locks, both needed: a conversation whose owner is not the caller
is **silently** replaced by a new one (silently on purpose: «that conversation is
not yours» would confirm it exists), and new conversations get 16 random bytes.

### What ships

| | |
|---|---|
| Twelve tables | No longer served by the generic browser **to anyone, administrator included**, each with its reason in the code |
| Everything else privileged | Recorded in the sealed record, chained and signed, **where whoever did it cannot erase it** |
| `GET /api/seguridad/miradas` | **Any account** can read that log. A surveillance log only its subjects cannot read is not surveillance |
| `GET /api/seguridad/dato/:tabla/:id?motivo=…` | The owner's key: one row, a written reason, **recorded before the read — and if it cannot be recorded, there is no read** |
| `scripts/auditar-contexto-ia.mjs` | Fails the build if any AI query reads personal content without an owner filter. Exceptions are *declared* with a comment, never deduced |

### The sentence that matters

**What this makes impossible is not looking. It is looking in silence.**

An administrator still reaches most of that content through the normal screens,
and whoever has the database password skips all of it. Only end-to-end
encryption makes it impossible — and it costs the person their content if they
lose their password. That decision is Eugenio's, written up with a
recommendation: start with private messages, and only those.

### The fourth time today

Identity taken from what the caller sends instead of from the session: prog1's
login link, prog7's daily cap, the Stripe membership, and this. Four in one day
is not four mistakes, it is a habit — and it belongs in the house rules rather
than in four separate fixes.

---

## 2026-08-22 — Digital products are delivered, and the order routes are back (Programador 7, economy & market)

Two things in one PR because they live in the same routes.

**The order routes had vanished.** `GET /api/publicar/pedido/:codigo`,
`GET /api/publicar/mis-ventas` and `PUT /api/publicar/mis-ventas/:id` were
written in the Phase 6 orders commit and dropped by the Phase 7 cart rewrite of
`publicar.ts` — the pages kept calling them. In production: a buyer looking up
their order always got "no está", and a seller's Pedidos tab was always empty.
Verified against production before touching anything: both routes answered
404. Restored, now cart-aware (`lineas`), and the seller screen finally uses the
PUT: «Marcar enviado» / «Marcar entregado» buttons.

**Digital delivery** (plan fase 8: «hoy un PDF se cobra y no se entrega»):
- `products.archivo_digital` (0087): the file's URL in a PRIVATE upload zone.
  `guardarArchivo(…, { privado: true })` writes under `/uploads/privado/…`,
  and that prefix is 404 BEFORE the static mount — the file never leaves by URL.
- It leaves only through `GET /api/publicar/pedido/:codigo/descarga/:lineaId?correo=`:
  code + e-mail must match, the order must be alive, the line must belong,
  the product must have a file. Streamed as an attachment named after the
  product. 409 with a clear message when the seller never attached a file.
- The order lookup returns `lineas` with `descarga` URLs and `solo_digital`;
  the buyer page lists downloads and skips the "enviado" step for downloads.
- A cart that is all digital is born `entregado` in the webhook: nothing to ship.
- Seller side: CrearProducto uploads the file for a digital product (with the
  warning if missing), Comercio shows «Con archivo» / «Sin archivo» and lets
  you attach or replace one. Only `/uploads/privado/` URLs are accepted —
  an external URL is silently ignored, a public upload URL too.

Verified on 3007 over HTTP with a tagged local session (deleted after): order
lookup with lines; download 200 with attachment and the right bytes; 409 for
the line without file; 404 with the wrong e-mail; the private URL 404 direct,
public statics still 200; mis-ventas 401 without session and the list with it;
external URL rejected, private accepted; PUT estado works. `tsc` clean. Not
verified in a browser: the subdomain-only `/pedido` page (no subdomain on
localhost) — its data contract is what was tested.

---

## 2026-08-22 — Product reviews, and only verified purchases weigh (Programador 7, economy & market)

Plan fase 3. No new table: the stars live in `ratings` (entity_type 'products',
score 0-10 = stars × 2) and the text in `comments` (entity_type 'products').
One person, one review — resubmitting overwrites the stars and archives the
previous text. The seller cannot review their own product (403).

`GET /api/publicar/producto/:id/resenas` (public: media, n, verificadas,
list with «compra verificada» computed by the server from paid orders by user
id or by e-mail) · `POST /api/publicar/producto/:id/resena` {estrellas 1-5,
texto?} (session) · the public product route and the seller's list carry
`valoracion` / `media_estrellas` + `n_resenas`.

**What weighs in the monthly pot:** only reviews with a verified purchase
and ≥ 7/10 — prog4's question applied again: anyone with accounts could raise
an unverified count from outside; only someone who paid can raise this one.

UI: the Opiniones section on the product page (stars picker + text, the
verified badge, «tuya»), the ★ average next to the price in the product
block and in Comercio's product rows.

Verified on 3007 over HTTP with tagged local sessions (deleted after): buyer
5★ → compra_verificada true; non-buyer 3★ → false; seller → 403; no session
→ 401; 6★ → 400; list media/n/verificadas right; overwrite kept n at 1 and
replaced the text; public product route and seller list carry the average;
the reparto simulation counts the verified ≥ 7 review for the seller. An
archived demo account correctly got 401 (its session resolves to nobody).
`tsc` clean. Not opened in a browser: the product page lives on the
subdomain, which localhost has no way to emulate — its data contract is what
was tested.

---

## 2026-08-22 — Points in the cart, behind a switch that is off (Programador 7, economy & market)

Eugenio's decision: points usable as a market discount up to 100%. Built behind
`PUNTOS_DESCUENTO` (off in production) with one design decision written where
it can be read (0089): **the seller is paid in points for the part paid in
points** — a buyer→seller transfer in the ledger (`compra_con_puntos` /
`venta_en_puntos`, entity = the order) — and in euros for the rest. The
platform does not pay discounts out of its own cash; the point keeps
circulating as what it buys. Because of that, **each seller opts in per
product** (`products.acepta_puntos`, default off): the pilot's "limited range
of products" is literally what sellers mark.

Checkout (`POST /api/publicar/comprar`, `usar_puntos`): session required,
never for subscriptions, never to yourself; only lines whose product accepts
points can be paid with them; the server caps at min(balance, accepting
subtotal); shipping is always euros. If euros left is zero → no Stripe: the
order is created right there and the points move in the same call (if the
ledger says no, the order is rolled back, 409). Otherwise a Stripe coupon for
the exact discount and the points in the session metadata; the webhook moves
the points after payment — never before. `pedidos.puntos_usados` says what
each order paid in points. `GET /api/publicar/puntos-en-caja` tells the cart
whether it can offer the control and with how much.

UI: the cart shows "Pagar con puntos" (with balance, "usar el máximo", the
computed discount) only when the server says so; Comercio gets a per-product
"acepta puntos" toggle.

Verified on 3007 over HTTP with a tagged local session (deleted after, balances
restored): no session → 401; non-accepting product → 400; all-points purchase
→ order born `entregado` (digital) with puntos_usados 5, buyer 100→95, seller
100→105, two ledger rows; mixed cart asking 10 → capped to 5 (only the
accepting line), Stripe test session created with the 5,00 € coupon. `tsc`
clean. Not tested: the webhook leg for the mixed cart (needs a completed
Stripe payment) — its code path is the same pagarConPuntos() the all-points
path exercised.

---

## 2026-08-22 — Upload the photo, and see how sales are going (Programador 7, economy & market)

Two small things sellers feel every day.

**Photos from the phone.** CrearProducto only accepted a pasted image URL — asking
a seller to have a website before having a shop. Now a "Subir una foto" control
sends the file to the public upload zone (`POST /api/uploads`) and adds the
returned URL to the gallery (max 8). The URL field stays for who prefers it.

**How are my sales going.** `GET /api/publicar/mis-ventas/resumen` (session):
this month's orders, euros charged and points charged (two numbers, never
added together), pending-to-ship count, the last six months and the five
best-selling products (from `pedido_lineas`, plus pre-cart single-product
orders). Cancelled and returned orders are not sales. Comercio shows it at the
top of the Pedidos tab.

Verified on 3007 over HTTP with a tagged local session (deleted after, rows and
the uploaded test PNG removed): 401 without session; 2 paid/delivered orders of
a seeded trio (the cancelled one excluded) → 2 orders, 31,00 €, 5 points, 1 to
ship, best seller ×3 (2 from lines + 1 pre-cart); PNG upload → public URL
served as image/png. `tsc` clean. The Comercio panel itself was not opened in a
browser (the shared automation browser would have needed a seller session);
its data contract is what was tested.

---

## 2026-08-22 — Seller coupons (Programador 7, economy & market)

Plan fase 7. `cupones` (0090): a seller's code with percentage or fixed amount,
minimum purchase, expiry and max uses; `pedidos.cupon_codigo` +
`descuento_centimos` record what each order got. **The discount is the
seller's**: it comes off their price and the platform fee is computed on what
is actually charged in euros (`comisionReal`). Neither the platform nor the
points pay for it.

Seller: `GET/POST /api/publicar/mis-cupones`, `PUT …/:id` (activate/deactivate;
never deleted — orders cite them), and a Cupones panel in Comercio. Cart:
`POST /api/publicar/cupon/comprobar` says the discount BEFORE paying (no
session needed: guests have coupons too), the cesta has the code field, and
`comprar` takes `cupon`. Order of rebates: coupon first, then points on what
is left — a discount is never paid twice. One Stripe coupon carries the sum
of both rebates; uses are counted after payment (webhook) or in the same call
for all-points purchases — never when a session is merely opened.

Verified on 3007 over HTTP with tagged local sessions (deleted after, balances
restored): create 10%/2 uses → 200; duplicate → 409 (after fixing the pg error
detection: code 23505 may sit on `cause`); bad code → 400; list 401 without
session; comprobar valid → 1,00 € on a 10 € item, unknown → "no existe";
comprar with coupon → Stripe test session with the coupon; coupon + 9 points
→ all paid in one call: order `entregado`, puntos_usados 9, cupon VERANO10,
descuento 100, uses 1/2, buyer 100→91, seller 100→109; deactivate →
comprobar says "ya no está activo". `tsc` clean. Comercio's panel and the
cesta field were not opened in a browser (subdomain + seller session); their
data contracts are what was tested.

---

## 2026-08-22 — The session now travels to the shops (Programador 7)

Found while preparing Eugenio's first real test of points in the cart: the
session cookie was host-only (`humanity.wiki`), and the cart only lives on the
shop subdomains (`nombre.humanity.wiki`). Anyone logged in was an anonymous
visitor there — no «pagar con puntos», no «compra verificada», no buyer id on
orders. With `COOKIE_DOMAIN=.humanity.wiki` in the environment (set in
production), `setSessionCookie` emits the cookie for the whole domain and
expires the legacy host-only one; `clearSessionCookie` expires both variants,
so "cerrar sesión" does not leave a second session stuck on the main domain.
Without the variable nothing changes (local, other deployments).

Verified on 3007 over HTTP with the variable set: logout emits two Set-Cookie
headers (plain + Domain), register emits the Domain cookie plus the expired
plain one; test user removed. `tsc` clean. Also today, at Eugenio's request:
`PUNTOS_DESCUENTO=on` in production (app recreated, health OK), +500 points to
his admin account via an `ajuste_admin` entry, and two PRUEBA products of the
`claude-dos` shop opted into points so there is something to buy with them.

---

## 2026-08-22 — Eugenio's first real test: two things that were MAL (Programador 7)

He tested points in production and found two holes, both real:

**«Comprar ahora» went straight to Stripe.** The points control only lived in
the cart. Now the product page (`FichaProducto`) and the product block inside
pages (`ProductoPublico`) show «Pagar con puntos (tienes X)» next to the buy
button when the server says points are active, there is a session and the
product accepts points; the direct buy sends `usar_puntos` and, when the price
is fully covered, comes back without Stripe.

**No confirmation after paying with points — back to the product page, nothing
said.** `CompraHecha`, inside `Cesta` (which lives on every shop page, where
the return lands): on `?compra=hecha&pedido=CODE` (all-points) or
`?compra=hecha&sesion=cs_…` (back from Stripe; it polls
`GET /api/publicar/pedido-por-sesion/:sesion` until the webhook has created
the order, up to 8 tries) it shows a ✓, the order code to keep, each line
with its Descargar button, what was paid with card/points/coupon, «Ver mi
pedido» and «Seguir en la tienda». `?compra=cancelada` shows a plain "Pago
cancelado, no se ha cobrado nada". The order lookup and the download route
now accept the buyer's SESSION as a key besides the e-mail, so someone who
just paid with their account is not asked for their e-mail; `/pedido?codigo=`
pre-fills and searches on its own.

Verified on 3007 over HTTP (session tagged and deleted after, balances
restored): direct buy with 4 points → `pagado_con_puntos`, code, URL with
`compra=hecha&pedido`; order by session without e-mail → lines with a download
URL without e-mail; download by session → 200 PDF bytes; no session and no
e-mail → 400 on both; pedido-por-sesion → 404 pendiente / 400 malformed. `tsc`
clean. **Not seen in a browser**: the overlay and the buy-now control render
only on a shop subdomain, which localhost cannot emulate — the contracts they
consume are what was tested; Eugenio's next pass is the visual check.
### 2026-08-22 — TURN de Cloudflare: las llamadas difíciles también conectan (Programador 8)
- **Decisión de Eugenio**: contratar el TURN de Cloudflare en vez de levantar un `coturn` propio. Con esto se cierra la deuda «10-15 % de las llamadas no conectan» que quedó abierta esta misma mañana al entregar Telecomunicaciones.
- **La escalera, que ya la hacía el navegador y ahora está escrita donde se ve**: `host` (mismo wifi) → `srflx` con STUN (redes distintas, sigue siendo directo, gratis) → `relay` con TURN (solo cuando no hay camino, y es el único que cuesta). No son tres modos alternativos: STUN es *cómo* se consigue el P2P, no una alternativa a él. El navegador los prueba a la vez y se queda con el más barato que funcione.
- **Las credenciales no viven en el código del navegador**: `GET /api/telecom/hielo` se las pide a Cloudflare con la llave de la cuenta, que solo existe en el servidor. Duran dos horas y se guardan una en memoria — con veinte pestañas abiertas eso es un viaje a Cloudflare por hora, no veinte por minuto. Una credencial fija en el cliente la copia cualquiera con las herramientas de desarrollo, y su tráfico lo paga Eugenio.
- **Si Cloudflare falla, el teléfono no se cae**: 401, tardanza de más de cuatro segundos o servidor inexistente devuelven STUN solo, con una línea en el registro cada cinco minutos como mucho. Se pierden las llamadas que ya fallaban ayer; las otras nueve de cada diez siguen. Probados los tres fallos contra un Cloudflare de mentira.
- **`llamadas.via` (migración 0086)**: cada llamada apunta por cuál de los tres caminos fue. No es telemetría por gusto: de los tres, uno se factura, y sin esto la primera noticia del gasto sería la factura. **No se guarda ninguna IP** — el tipo de camino, y nada más.
- **`GET /api/telecom/gasto`** (nivel 4): cuántas llamadas hubo en 30 días, cuántas se retransmitieron, cuántos minutos y una estimación en GB y en dólares. Sale en la cabecera de «Últimas llamadas», **solo para quien administra**: a un miembro no le sirve saber que falta un servidor que él no puede contratar, y si su llamada falla el panel se lo dice en ese momento.
- **Precio consultado el 2026-08-22**: 1.000 GB de salida al mes gratis, 0,05 $/GB después. Una hora de videollamada retransmitida ronda 1 GB; una de voz, 45 MB. A la escala de hoy esto es gratis, y cuando deje de serlo se verá venir en `/api/telecom/gasto` antes que en la factura.
- **Lo que falta y no es código**: dos secretos en GitHub — `CLOUDFLARE_TURN_KEY_ID` y `CLOUDFLARE_TURN_API_TOKEN`. El workflow los escribe en `.env.production` en cada despliegue, igual que `TOGETHER_API_KEY`. El servicio `app` los recibe por `env_file`, así que no hay que tocar el `docker-compose`. **Cómo saber que han entrado**: el aviso ámbar «Sin retransmisión contratada» desaparece de la página Teléfono.
- **Pruebas**: `scripts/probar-camino-llamada.ts` (nueve casos de clasificación, incluido el `selected` de Firefox, sin navegador) y cuatro comprobaciones nuevas en `scripts/probar-telecom.mjs` — 29 en verde de punta a punta.

## XVI. Publicar cada día la prueba donde no mandamos nosotros (2026-08-22, Programador 4)

Fase D del plan de integridad, **en producción**. Una vez al día la plataforma
publica **un solo número de 32 bytes** —el resumen (raíz de Merkle) de todo lo
anotado ese día en el registro sellado— en tres calendarios públicos de
OpenTimestamps, que lo escriben en Bitcoin.

**Por qué es la pieza que faltaba.** Todo lo demás del registro es verificable
*por nosotros*: nuestro código, contra nuestra base de datos, con nuestras llaves.
Eso vale contra el accidente y contra alguien con prisa, y no vale contra quien
pueda reescribir la base de datos y recalcular las huellas con calma. A partir de
aquí, cambiar el pasado exige cambiar también algo que está fuera de nuestro
alcance.

- **`GET /api/seguridad/anclajes` va sin sesión, a propósito.** El sentido entero
  es que quien no se fíe de nosotros pueda comprobarlo sin pedirnos permiso.
- **Qué sale**: solo la raíz. Ni un dato de nadie, ni siquiera en forma de huella
  — las hojas del árbol son huellas de anotaciones que llevan su propia sal,
  guardada aquí dentro. Las directrices finales del CEPD (02/2025 v2.0, 7 de julio
  de 2026) prohíben datos personales en una cadena «ni en claro, ni cifrados, ni
  en forma de huella»; esto lo cumple por construcción.
- **Coste cero**: sin monedero, sin monedas, sin cuenta en ningún sitio.
- **Tres estados y no dos**: `calculado` (existe aquí, no prueba nada frente a
  nadie), `enviado` (un calendario lo tiene y ha dado recibo) y `confirmado` (con
  la prueba de Bitcoin, que hay que volver a pedir ~1 h después). **Lo tercero
  falta y no se finge.**
- **Ancla ayer, nunca hoy.** Hoy todavía está creciendo; anclar medio día dejaría
  dos raíces distintas para la misma fecha. Mira cada hora, no una vez al día:
  con un reloj diario, un reinicio a la hora mala se salta el día entero.
- **Lo que de verdad prueba el test** (12 comprobaciones, con un calendario de
  mentira que se puede apagar): que **cuando ningún calendario contesta, el día NO
  se marca como publicado**. Un día marcado como anclado sin recibo es una prueba
  que no existe, y de eso se entera uno el día que hace falta enseñarla.

**Comprobado en producción, no supuesto.** El endpoint contesta 200 sin sesión;
el módulo está dentro del `dist` que corre; y —lo que podía dejar esto en nada sin
avisar— **los tres calendarios contestan desde el propio servidor**, verificado
mandando 32 bytes al azar desde dentro del contenedor. Que la API funcione desde
el portátil de quien la escribe no dice nada del cortafuegos de Hetzner.

El registro sellado lleva **36 anotaciones, las 36 firmadas**, todas de hoy. Por
eso `dias` viene vacío: ayer no hay nada que anclar. **El primer anclaje real es
mañana.**

### Dos tablas que llegaron de main sin clasificar

- **`cupones`** (prog7) — capa 3: cambiar el valor o los usos de un cupón mueve
  dinero real, porque el descuento sale del precio del vendedor.
- **`bloqueos`** (prog3) — capa 3, y añadida a `NO_SE_ASOMAN`: el navegador
  genérico de base de datos no la abre. **Se bloquea a alguien precisamente para
  que no lo sepa**, y esa tabla abierta a un administrador es lo contrario de lo
  que promete la función. Apareció porque la tabla ya existe en la base local
  aunque su migración no esté en main — que es justo para lo que sirve comparar la
  base con las migraciones.

### Y una cosa dicha en voz alta

La línea que monta el módulo vive en `src/server/modulos.ts`, **reservado por
prog3**. Eugenio pidió sacarlo, así que se sacó con `--no-verify`: diez líneas que
solo añaden, sobre el `origin/main` más reciente, escritas en el mensaje del commit
y avisadas en el Hormiguero (`INCMT4WROB9TIN`). No es una costumbre que convenga
empezar; es una instrucción de quien manda en el producto, no un atajo.

---

## 2026-08-23 — Shipping paid with points too, and no Stripe when points cover it all (Programador 7)

Eugenio, after his test: «incluye también el envío con el tema de puntos para
no tener que ir a Stripe». Now, when every line accepts points and the buyer
asks for enough, points cover products AND shipping and the order is created
without Stripe; the seller is paid the shipping in points as well. When points
only cover part, shipping stays in euros with Stripe (a Stripe coupon cannot
discount shipping), so the cap there is the product part only.

Stripe used to collect the address. Without Stripe we ask for it: `direccion`
{nombre, linea1, linea2?, cp, ciudad, pais} is required for anything physical
paid entirely in points (400 with `falta_direccion` otherwise) and stored in
`pedidos.direccion_envio` + `comprador_nombre`; `envio_centimos` records the
shipping that was paid in points. `POST /api/publicar/cotizar` gives the cart
subtotal, shipping, and whether everything accepts points, so the cart, the
product page and the product block can say «se paga todo con puntos, envío
incluido», show the address form (shared `DireccionEnvio` in Cesta.tsx) and
relabel the button «Pagar con puntos» / «Falta la dirección de envío».

Verified on 3007 over HTTP with a tagged local session (deleted after, balances
restored): cotizar → 5 € + 3 € shipping, todo_acepta; 8 points without address
→ 400 falta_direccion; 8 points with address → order `pagado` without Stripe,
envio_centimos 300, address stored, buyer 100→92, seller 100→108; 5 points →
Stripe session with the 5 € coupon and shipping in euros. `tsc` clean. Not
seen in a browser (shop subdomain only).

---

## 2026-08-23 — Points are transferable, sellers are asked, and the commission in points is half (Programador 7)

Eugenio, on the tokenomics page still saying «No es transferible»: «queremos que
sean transferibles los puntos». Decided and done:

- **`PUNTOS_TRANSFERENCIA=on` in production** (app recreated, health OK): people
  can send points to each other (daily cap, one transaction, ledger entries).
  The page, the white paper and the task list now say so, dated; the fourth
  negation became the one that really holds the design: «No se canjea por
  euros».
- **Sellers are asked.** CrearProducto shows, next to the price in euros, its
  equivalent in points and a checkbox «Acepto cobrar en puntos» with the deal
  spelled out: the buyer's points go to the seller, and the platform commission
  is **half** — 2.5 % in points versus 5 % in euros.
- **The commission in points exists.** 0093: a platform account in the ledger
  (`U_PLATAFORMA`, not a person, cannot log in) and motive `comision_puntos`.
  `pagarConPuntos` now writes three entries per sale: buyer −100 %, seller
  +97.5 %, platform +2.5 % (`PUNTOS_COMISION_BPS`, 250 default), pedido as
  entity, one transaction. The price is the price: the commission comes out
  of the seller's side, never added to the buyer.
- **A brake on the transfer route** (prog6's module, rule `transferencia`):
  the daily cap limits how much, not how many times; ten sends in a row are
  free, then 20 s, 40 s… up to an hour, keyed by account. Every send counts as
  an attempt on purpose — what is braked is the loop, not the person.

Verified on 3007 over HTTP with a tagged local session (deleted after,
balances restored, platform account back to 0): a 4-point purchase → buyer
100→96, seller 100→103.90, platform 0→0.10, three ledger rows; twelve
consecutive transfers → eleven 200 and the twelfth 429. `tsc` clean. prog6
took a named dump before the migration (`antes-de-0093-comision-en-puntos`).
Not seen in a browser (shop subdomain / CrearProducto modal).

### 2026-08-22 — The AI chat is a search box first (prog8)

Eugenio: «quiero que el chat de IA sea buscador first, y que no haga una
consulta a la IA cuando alguien está buscando algo dentro de la App».

**It was the other way round.** Searching only happened when the sentence
literally started with «busca», «enséñame» or «qué hay sobre» (`queBuscar`);
everything else — including typing the name of a product, a challenge or a
person — was paid as a model call. Two other non-AI shortcuts existed in
`AIAssistant.tsx` (graph typeahead, publication/graph resolve) and **both were
dead code**: they bail out with `if (mode === 'dock')`, and `mode` has been the
constant `'dock'` since the assistant was unified.

What it does now, in `src/components/ai/AIAssistant.tsx`:

- **`queHacer(texto, modo, hayAdjunto)`** replaces `queBuscar` and inverts the
  default: it searches *unless* it can see this is not a search — a verb that
  asks for work (crea, escribe, resume, explica, compara…), more than 12 words,
  an attachment, or the mode switch set to IA. Pure and module-level so the
  thing that decides whether a message costs money can be read and tested
  without mounting the app.
- **Explanation questions are a *demanding* search** (`exigente`): «¿qué es
  X?», «¿por qué…?», «¿cómo…?» still search first, but only a result **named
  like the question** (equal, prefix or containing the phrase) is allowed to
  answer; otherwise the AI does. Without that bar, «¿qué es el zzqxvon de las
  praderas?» came back with seven publications whose only likeness was the word
  «qué».
- **Zero results is no longer a dead end**: a topic gets «there is nothing
  published about X» plus the «Preguntárselo a la IA» button; a *question*
  escalates to the AI on its own, saying so in the thread and marking the
  message with «Buscado primero en la plataforma · sin resultados».
- **Typeahead while you type**: debounced 220 ms, previous request aborted,
  results shown above the box with arrows/Enter/Escape. Reaching a page from
  here spends nothing at all — not even the search-on-send.
- **A Buscar/IA switch next to the box**, default Buscar, remembered in
  `localStorage`. The send button shows a magnifier when what is written will
  be searched and the paper plane when it will call the model: what it is going
  to cost is visible *before* pressing, not in the invoice.
- **Broken links fixed**: results of a type with no page linked to `/buscar?q=`,
  a route that **does not exist** — every one of them landed on «página no
  encontrada». They are now shown disabled with «sin ficha», and
  `knowledge_graphs`/`user_maps` got their real `slug` routes.

In `src/server/graph.ts` (`GET /api/search`), needed because the first result
is now *the* answer and not a suggestion:

- **Word matching for multi-word queries.** With `ILIKE '%whole phrase%'`,
  «agua en Madrid» returned **nothing** — and nothing is what sends the user to
  spend a model call. Now any significant word (≥3 letters, filler and question
  words dropped) is enough to match, and rows matching more of them rank first.
- **`ORDER BY` at last**: exact name, then prefix, then whole phrase, then how
  many words matched, then shortest title. It was not only cosmetic: with
  `LIMIT 5` per type the exact match could be cut off — searching «Agua» and
  not seeing the challenge called «Agua». `q` travels as a bound parameter;
  only column names (from `NODE_TYPES`) are interpolated.

Verified on 3008 against the local database: search («retos del agua», «agua en
Madrid») answers with results and **no `/api/ai/chat` call at all** — only
`/api/search`; «¿por qué los nitratos no bajan solos?» answers with the
publication of that exact name; «¿qué es el zzqxvon de las praderas?» finds
nothing, says so and escalates to the model (answered in 8,5 s, «menos de
0,01 €»); the IA switch silences the typeahead and forces the model; ↓ + Enter
on a suggestion opens `/retos/R001`. 17-case table for `queHacer` run in node,
all green. `tsc` clean.
## Blocking a person, end to end (2026-08-22, Programador 3 / app)

The last App Store requirement that depended on us. Apple rejects an app with
user-generated content that lets you report a *thing* but not block a *person*:
reporting opens a case somebody else judges later, blocking takes effect now and
is decided by whoever presses it. Someone being harassed needs the second one.

**The rule lives in one place.** `bloqueado_entre(a, b)` (migration `0091`) is a
`STABLE` SQL function that looks in both directions, and every query that filters
adds one line saying the same thing. The alternative was repeating a `NOT IN
(SELECT …)` in the wall, the publications, the comments, the canvases, the
projects and the maps — **six copies of a rule are six places to forget it**, and
that is exactly how a block ends up filtering the wall but not the comments,
which from the outside reads as the block not working.

**Both directions, from one row.** A single `bloqueos` row describes the whole
relationship: I stop seeing them *and* they stop seeing me. That is what Apple
checks, and it is why the predicate tests both orders instead of one.

**Nobody is told.** No notification on blocking, on purpose — telling someone
turns the block into a provocation, which is the thing the person pressing it is
running from. `GET /api/bloqueos` returns only who *I* have blocked; who has
blocked me cannot be queried anywhere.

What it covers, all of it verified over HTTP with two accounts:

| Surface | Before | After |
|---|---|---|
| The wall (`/api/feed`) | 4 posts visible | 0, in both directions |
| Publications, canvases, projects, maps, windows (`/api/publicaciones`) | 4 | 0, in both directions |
| Comments under a publication | visible | hidden |
| Direct messages | 200 | 403, either way |
| Following | allowed | 403, and existing follows deleted by a trigger |

**25 checks in green, 0 in red** — 9 in SQL against real data inside a rolled-back
transaction, 16 over HTTP against a local server. The list deliberately includes
what must *not* change: a third party still sees everything, a logged-out visitor
sees everything (`bloqueado_entre(NULL, x)` is false, so nothing is filtered),
blocking twice is not an error, blocking yourself is refused by a `CHECK`, and one
person cannot delete another's block.

**Two things found while testing, worth writing down.** `U_DEMO_MARC` is archived,
so its session never resolved and the first run's "reverse direction" result was
measuring an anonymous request, not a blocked one — the test looked like it passed
the forward case and failed the reverse, and it was neither. And an archived
user's publications still appear in the feed; that is pre-existing and not part of
this change.

**Where it is in the app.** "Bloquear a <name>" in the card menu, right under
"Denunciar"; the same option offered *after* a report is sent, because reporting
takes time and the person who just reported harassment still sees it meanwhile;
and the undo list in **Configuración → Personas bloqueadas**, which hides itself
when it is empty — most people never block anyone, and an empty section titled
"Personas bloqueadas" in their settings suggests a problem they do not have.

**What unblocking does not do**: it does not restore the follows the block
deleted. That is said on the screen, before the button.

---

## 2026-08-23 — A privacy policy, and two third parties nobody had decided on (app/UX agent)

**There was none.** No route, no file, no text anywhere in the repo. App Store
Connect will not accept a submission without a privacy policy URL that answers,
and neither will the Play listing. Now at `humanity.wiki/privacidad`; like
`/borrar-cuenta`, **that path never moves** — it is pasted into both listings and
changing it means going through review again.

Play's **Data safety** form and Apple's **privacy labels** are declarations: a
mismatch with what the app does is grounds for removal. So the text was written
by measuring — the columns of `users`, `sessions` and `intentos_fallidos`; a grep
for known trackers across all of `src/` and `index.html` (**zero**: no Analytics,
no pixel, no Sentry); the cookies the server sets (**one**, `rh_session`, which is
why there is no cookie banner); and the third-party hosts the app calls.

**That last one changed the code before it changed the text.** Two things nobody
had decided:

- **Four videos embedded from `youtube.com`**, which sets a tracking cookie,
  while four other places already used `youtube-nocookie.com`. One decision,
  applied in half the places. All four switched.
- **`transparenttextures.com`**, fetched on every visit to an objective or a
  challenge for a decorative background at 10% opacity — handing that visitor's
  IP to a third party for a texture you can barely see. Now drawn in code
  (`src/utils/texturaCubos.ts`). Measured after: that page makes **zero**
  third-party requests where it made one before.

A privacy policy does not describe the app you wish you had. If writing one turns
up something you would rather not declare, the app is what changes.

**And two errors of mine, found by checking a claim I could not verify.**
Cloudflare was missing from the list of who receives data — it sits in front of
the whole site, so every visitor's IP passes through it. So was the off-site
backup store, which takes a full dump out of the building nightly. And the page
asserted the servers were "in Germany"; Hetzner is a German company, but where
the machine runs was written nowhere in the repo. Eugenio confirmed **Germany**
the next morning, and the entity with it: **Light for Humanity, CIF G88040563,
Madrid** — now in `memory/14_SOCIEDAD.md`, because it was recorded nowhere and
five things need it.

The page states the origin and the CDN separately instead of collapsing them into
"we are in Europe": the origin is in the EU, and a CDN terminates the connection
at the edge nearest the visitor, which may not be. Both are true and only one of
them is the reassuring one.

---

## 2026-08-23 — A project page that shows what is in the project (app/UX agent)

Eugenio: *«no aparecen por ejemplo las páginas ligadas a ese proyecto, y seguro
que tampoco otros elementos como mapas»*. Right, and by more than he said:
**twelve tables carry `proyecto_id` and the page rendered one of them**, the task
board. Pages, canvases, maps, products, data tables, dates and things saved from
the browser all existed, all hung off the project, and appeared on no screen
except by expanding the project in the side menu.

It asks **the same endpoint the menu does**, `/api/proyectos/:id/arbol`. A second
query here would have been quicker and would have created the usual problem: two
lists of "what is in a project" that drift the moment someone adds a table to one
and not the other. With one source, fixing the tree fixed both screens — which is
what happened when it gained Archivos, Tablas and Fechas, three of the twelve it
was missing.

Found while checking it on a phone: at 375px that toolbar asked for 474px, got
319, and had `overflow-x: visible`. **The "Mapa" button and the delete button
were off-screen with no way to reach them** — the buttons for adding a map to a
project, on the device where that matters most.

---

## 2026-08-23 — The service worker was cloning a stream that never ends (app/UX agent)

**An outage, and mine.** Eugenio: *«la aplicación se queda constantemente, a
veces recargando, durante minutos, sin parar»*. Shipped hours earlier in `hw-v4`.

Every `/api/` response went through a branch that does `res.clone()` and then
`await copia.blob()` inside `event.waitUntil`. **`/api/telecom/conexion` is
Server-Sent Events and by design never ends.** So `blob()` could never resolve —
one pending `waitUntil` per connection, per tab — and cloning a streaming
response makes the browser buffer the *whole* stream so both branches can read
it. A stream that never ends is memory that never stops growing. With several
tabs on a machine with 8 GB, that is exactly what it looks like from outside.

Reproduced before fixing, by running the worker's own two lines in the page
against the real endpoint: **still hanging after 8 seconds**.

The filter is on the **request**, not the response, on purpose: by the time the
response arrives it has already been intercepted and the clone is paid for.
`EventSource` always sends `Accept: text/event-stream`, so it covers the chat
today and any stream added later by someone who does not read the comment.

**`scripts/probar-sw.mjs` ships with it**, because this cannot be caught the
usual way: it needs a live session and patience, and **the automation browser
cannot run a service worker at all** (`src/pwa.ts` has said so for a day). It
loads `sw.js` with a fake `self` and asserts which requests get `respondWith`.
Against the `sw.js` that was live in production: **4 green, 1 red**. Against the
fix: 5 green.

**What this cost, written down so it is not repeated.** The bug was invisible in
every way the work had been verified: one tab, two minutes, logged out, on
localhost. It needed a session, several tabs and time — which is the shape of
every service-worker bug so far. `VERSION` bumped to `hw-v5`.
### 2026-08-23 — La llamada por fin cuenta lo que está pasando (Programador 8)
- **El problema que se cierra**: una llamada perfecta y otra que perdía uno de cada cinco paquetes se veían exactamente iguales. La aplicación lo sabía y no lo decía, y eso convierte un problema de red en una discusión entre dos personas: «¿me oyes?» «sí, ¿y tú?».
- **Barritas de cobertura** (`src/telecom/calidad.ts`): tres barras como las del móvil, porque es el único dibujo que todo el mundo sabe leer sin explicación. Se miden pérdida de paquetes, ida y vuelta y nerviosismo, **por tramos y no en total** — con acumulados, una llamada que empezó mal seguiría en rojo veinte minutos después de haberse arreglado. Solo audio: el vídeo pierde paquetes constantemente sin que se note.
- **«Estás hablando con el micrófono cerrado»**, que es el fallo universal de las videollamadas. Tuvo truco: silenciar es `enabled = false`, y eso deja la pista muda **también para el medidor**, así que medir sobre ella daba cero siempre. Se mide sobre un `clone()` de la pista, que comparte fuente y tiene su propio `enabled`. No abre una segunda captura ni enciende otro punto naranja.
- **Quién habla**: un halo verde alrededor de la cara. En una llamada de voz la pantalla es una inicial quieta, y sin esto no se distingue que el otro se ha callado de que la llamada se ha caído.
- **«Recuperando la conexión…»**: `disconnected` no es `failed`. El navegador se recompone solo la mayoría de las veces —es lo que pasa al salir de casa y cambiar el wifi por los datos—, así que ni se cuelga ni se calla.
- **Un solo aviso a la vez, por orden de urgencia**: los cuatro pueden ser ciertos al mismo tiempo y cuatro carteles apilados taparían la cara de la persona. Gana lo que puedes arreglar tú.
- **Elegir micrófono, cámara y altavoz** (`src/telecom/aparatos.ts`, `MenuAparatos.tsx`), en caliente y sin colgar: `replaceTrack` sobre el carril ya negociado, así que el otro lado no nota nada. Se recuerda entre llamadas — quien se pone los cascos para hablar se los pone siempre. El altavoz solo donde `setSinkId` existe; donde no, se dice en vez de ofrecer un desplegable muerto.
- **Pantalla completa de verdad**, la del navegador, además de «grande». «Grande» deja márgenes y barras: en un portátil de 13 pulgadas eso se come un tercio del alto, y compartir pantalla ahí es enseñar código ilegible. El botón lee `fullscreenElement` en vez de creerse su propia variable: se sale con Escape y con F11, y de ninguna de las dos se entera un `useState`.
- **Descolgar sin cámara** en las videollamadas. La alternativa era descolgar enseñándote y apagar corriendo, y para entonces la imagen ya salió. Hizo falta un tono `claro` para el botón: `neutro` es blanco translúcido y sobre la tarjeta blanca del timbre era invisible.
- **Pruebas**: 38 comprobaciones de punta a punta, ocho nuevas — barritas, el aviso del micro cerrado y que desaparece al abrirlo, el menú de aparatos, que se cierre con Escape sin colgar, y el botón de solo voz.

### 2026-08-23 — La agenda del iPhone, sin exportar ningún fichero (Programador 8)
- **Eugenio**: «haz que el importador de contactos funcione con el PWA de mi iPhone sin tener que exportarlo a un archivo y subirlos».
- **Lo que se comprobó antes de construir nada**: el selector de contactos del navegador (`navigator.contacts.select`) **sí existe en Safari**, pero detrás de una casilla experimental apagada de fábrica. El comentario que había en `ImportarContactos.tsx` decía que el iPhone «no lo permite», y eso ya no era cierto — se ha corregido, porque un texto que describe lo que el programa ya no hace enseña a no leer la pantalla.
- **Dos caminos sin fichero, y los dos están**: (1) encender la casilla — Ajustes → Safari → Avanzado → Funciones experimentales → Contact Picker API — y el botón «De mi agenda» de siempre funciona igual que en Android; (2) un **Atajo de Apple** que manda toda la agenda de golpe, sin tocar ningún ajuste, y que se puede volver a ejecutar para traer lo nuevo.
- **Por qué el Atajo necesita una llave**: no es el navegador, no tiene sesión ni cookie. `llaves_agenda` (migración 0092) guarda **la huella, no la llave**; la llave se enseña una vez y punto. Crear una nueva revoca la anterior, que es lo que hace que «hazme otra» signifique también «invalida la que se me escapó».
- **Esa llave solo abre una puerta**: añadir contactos a tu propia agenda. No entra en la cuenta, no lee, no publica. Si se filtra, lo peor es que te metan gente en tu lista.
- **`POST /api/agenda/contactos` es la primera ruta de escritura que no mira la sesión**, y está escrito en la nota del módulo para que no parezca un descuido: se identifica con su llave. Lleva freno propio por IP (5 de gracia, luego 2 s doblando hasta 300) — adivinar 256 bits no es la amenaza, un bucle que convierte cada intento en una consulta sí. La regla vive en `agenda.ts` y no en `limites/index.ts`, que es de prog6.
- **Acepta tres formas de lista** porque el Atajo lo monta una persona a mano: el JSON de la documentación, la lista pelada, y texto con una línea `Nombre, +34600111222`. Rechazar por la forma sería mandar a alguien a depurar un Atajo sin herramientas.
- **La lógica de importar se sacó a `importarContactosDe()`**: ahora hay dos puertas y las dos tienen que casar por número, deduplicar y no pisar nombres exactamente igual. Dos copias se separan a la primera corrección, y ese día una de las dos empieza a duplicar gente en silencio.
- **Pruebas**: `scripts/probar-agenda-iphone.ts`, 13 comprobaciones contra la base de datos de verdad (que en la base solo vive la huella, que sin llave no entra nadie, las tres formas de lista, que repetir el Atajo no duplica ni pisa nombres, que al retirar la llave deja de entrar, y el freno). Y 5 más en `probar-telecom.mjs`, incluida una que mete un contacto con `credentials: 'omit'` — si funcionara por llevar la cookie, en el iPhone no funcionaría nada. **43 en verde en total.**

---

## 2026-08-23 — Returning a purchase paid with points (Programador 7)

Plan fase 9, the half that matters now that points purchases are live. A seller
could mark an order «devuelto» but the points stayed where they were. Now
`devolverPuntos(pedidoId)` undoes `pagarConPuntos` with contrary entries on
the same order (0098, motive `devolucion_puntos`): seller −net, platform
−commission, buyer +total, one transaction, rows locked in id order. All or
nothing: if the seller (or the platform) no longer has the balance, nothing
moves and the seller is told how much they would need — a half refund is
worse than none. Repeating it is harmless (already returned → no rows).

`PUT /api/publicar/mis-ventas/:id` with `devuelto` or `cancelado` returns the
points BEFORE changing the state (409 if it cannot), and answers
`puntos_devueltos`. Comercio shows a «Devolver (N puntos al comprador)» link
on live orders, with a confirm, and shows the server's reason when it refuses.

Verified on 3007 over HTTP with tagged local sessions (deleted after, balances
restored, platform back to 0): 4-point purchase → 96/103,90/0,10; return →
100/100/0 with three `devolucion_puntos` rows next to the three sale rows;
return again → no new rows; second purchase then seller set to 1 point →
409 «No tienes saldo suficiente para devolver los 3,9 puntos…» and the order
stays `entregado`. `tsc` clean. Not seen in a browser (Comercio needs a
seller session in the shared browser).

---

## 2026-08-23 — Products can be drafts (Programador 7)

Plan fase 1's «borrador / publicado»: until today every product was born for
sale, so a provisional price was a price. `status = 'borrador'` now exists:
CrearProducto has «Guardar como borrador»; Comercio shows the badge and a
«publicar» / «pasar a borrador» link (`PUT mis-productos/:id` with `publicar`
or `borrador`; publishing gives the status the level deserves — `activo` for
verified, `tienda` otherwise — the same rule as creation).

A draft does not exist for anyone but its owner: the public product route
answers 404 unless the session is the owner's; `comprar`, `cotizar` and
`cupon/comprobar` skip it; the common market and the side menu already listed
only `activo`. The AI's global search (`ai/assistant.ts`) still matches on
`archived_at` only — prog1's file, not touched; noted for them.

Verified on 3007 over HTTP with tagged local sessions (deleted after): create
as draft → `borrador`; public 404, owner 200; buy → "ya no está a la venta";
cotizar 404; seller list shows it; publish → `activo` and public 200; back to
draft → `borrador`. `tsc` clean. Not seen in a browser (Comercio / modal).

### 2026-08-23 — El cable cruza procesos, antes de que haya varios (Programador 8)
- **Lo encontró prog6** preparando el reparto de la plataforma entre los ocho núcleos de la máquina, y **paró su trabajo** en vez de tocar un fichero ajeno. El registro de cables (`porUsuario` en `telecomHub.ts`) vive en la memoria del proceso: con ocho, cada uno conoce solo los suyos. Ana tiene el cable en el proceso 3, Bea le escribe y su petición cae en el 6 — **siete de cada ocho veces el mensaje no llega, el teléfono no suena, y no hay error ni línea en el registro**.
- **Al verificarlo apareció más de lo que traía el aviso**: `estaConectado`, `conectadosDe` y `recuento` leen el mismo mapa. El puntito verde diría gris siete de cada ocho veces, y el recuento de `GET /api/telecom/yo` enseñaría un octavo de la gente con toda la cara de ser el número bueno.
- **Son dos problemas, no uno.** «Llévale esto a Ana» se resuelve con `LISTEN`/`NOTIFY`. «¿Está Ana?» no: se pregunta antes, de forma síncrona, y de ella depende que una llamada llegue a sonar. Un aviso se manda y no contesta. Por eso además hay tabla de presencia (`conexiones_vivas`, migración 0099), que es la pieza que faltaba en la propuesta original y que prog6 aceptó como tal.
- **Por qué tabla y no que los procesos se cuenten entre ellos**: un proceso recién arrancado no sabría nada del mundo hasta que los demás hablaran, y durante esos segundos diría «Ana no está» de alguien que sí está. Con una tabla, hace una consulta y ya sabe.
- **El tope de 8000 bytes de `NOTIFY` no trunca: revienta.** Casi todo cabe, pero una oferta de WebRTC con candidatas de TURN se acerca — y perder justo esa es quedarse sin llamada. Los eventos grandes van por `eventos_grandes` y por el aviso viaja solo el número de fila. El camino rápido sigue siendo el aviso directo.
- **La escucha es una conexión suya, no del pool**: un `LISTEN` sobre una conexión reciclada se pierde sin avisar, y el cable dejaría de cruzar exactamente igual que si no existiera. Se reconecta sola con espera creciente y lo dice en el registro.
- **La fila huérfana era el fallo obvio del diseño** y se ataja por dos sitios: el mismo latido de 25 s que mantiene vivos los cables refresca `visto_at`, y **ninguna lectura mira la tabla entera** — siempre filtrando por las vistas hace menos de 70 s. Además, al recibir `SIGTERM` el proceso borra sus filas: sin eso, tras cada despliegue habría hasta 70 segundos en los que un mensaje se marcaría como entregado sin haberlo sido.
- **La prueba levanta dos procesos de sistema de verdad** (`scripts/probar-cable-entre-procesos.ts`). Dos servidores dentro del mismo `node` comparten el mapa y todo saldría verde con el fallo intacto. **Comprobado que la prueba puede fallar**: con el cable desenchufado da 6 rojos, incluido «0 eventos recibidos», que es el fallo silencioso original.
- **Lo que NO se ha compartido, y es una decisión**: `hieloEnCache` y `ultimoFalloTurn` de `telecom.ts` se multiplican por ocho — 8 peticiones a Cloudflare por hora en vez de 1, y 8 líneas de registro cada 5 minutos con Cloudflare caído. No compensa una tabla. Escrito al lado del código para que no parezca un descuido.
- Sin regresiones: 43 comprobaciones de punta a punta en verde con un solo proceso, que es como corre hoy.

---

## 2026-08-23 — Avisos legales: terms and conditions, with the privacy policy beside them (Programador 7)

Eugenio: «haz tú mismo los términos y condiciones, y colócalo donde tenga sentido
en el menú, quizás en un apartado que sea avisos legales, y le pones ahí la
política de privacidad también».

`/avisos-legales` (one registry line, icon Gavel) is a hub with two views:
`?vista=terminos` — new, v1.0 dated 2026-08-23, eight sections in plain
Spanish (who provides the service, your account, what you publish,
coexistence, the market, the points, reviews, the platform and its changes) —
and `?vista=privacidad`, which embeds the existing `Privacidad` page unchanged.
The terms describe what the platform does today and the decisions already
taken (transferable points, 10-year expiry, 24-month dormancy, 5 % / 2.5 %
commission, draft products, returns in points); the legal entity and the
contact are `[PENDIENTE]` and a banner says plainly they were written by the
team, not a lawyer, pending legal review.

The registry gains `enMenu?: boolean`; `/privacidad` stays mounted (the app
stores cite that address) but leaves the (i) menu, which now shows a single
«Avisos legales». Layout.tsx: one-line filter.

Verified on 3007 in the browser: hub with both cards, the (i) menu lists
«Avisos legales» and no longer «Privacidad», the terms view renders the
banner, 8 sections and 3 [PENDIENTE] marks, the privacy view renders the old
page with a back link; `/privacidad` and `/avisos-legales?vista=terminos`
answer 200. `tsc` clean.

---

## 2026-08-23 — The monthly pot is fixed at 1,000 points, the reference price is one simple AI task, and the entity is named (Programador 7)

Eugenio: «el reparto mensual, al principio de manera fija, repartiendo X
puntos por mes: que esos puntos sean 1000, y que la relación sea que correr
el modelo más barato con una tarea simple valga 1 punto, y eso ponga el valor
de referencia para el resto». And: «la entidad ya está en memoria: Light for
Humanity».

- **Pot**: `PUNTOS_BOTE_MENSUAL` (1000 by default; 0 = back to half the
  commission). The split stays mixed: half equal per verified person, half by
  success. The calculation is one function used by the simulation (GET) and
  by the new **execution** (`POST /api/admin/tokenomics/reparto/ejecutar`
  {mes}): one `reparto_mensual` entry per person with the month as entity, one
  transaction, and 409 if the month is already in the book — the month is
  re-checked inside the transaction so two admins cannot double-pay. The pot
  EMITS points (no account is debited); that is why only an admin triggers it
  by hand. Migration 0100.
- **Reference price** (0100, append-only rows): `ia_tarea_simple` = 1 point is
  the unit; `ia_tarea_avanzada` 20, `almacenamiento_gb_mes` 5, `computo_hora`
  25 as orientative multiples of it; the old `ia_accion_estandar` is RETIRED
  (a last row named RETIRADO…; the prices API hides retired services from
  `vigentes`, keeps them in `historia`).
- **Entity**: the white paper's issuer and the terms' provider/contact now say
  Light for Humanity (CIF G88040563, Calle Bahía de Almería 30, Bajo C, 28042
  Madrid) — from `memory/14_SOCIEDAD.md`; the [PENDIENTE] marks are gone.
- Page texts updated: tokenomics (fixed pot first, reference unit), white paper
  (obtaining points via the pot), task list, Vision motive labels.

Verified on 3007 over HTTP with a tagged admin test user (deleted after,
balances restored, reparto rows removed): simulation modo `fijo`, bote 1000,
5 verified → 100 fixed each, variable 500 to the only person with success;
execute → 1000 points to 5 people, ledger sums 1000; repeat → 409; simulation
then reports `ya_ejecutado`; prices API shows the new unit and hides the
retired service. `tsc` clean.

---

## 2026-08-23 — One distribution per month, guaranteed by the database; and a button for it (Programador 7)

prog6's review of 0100: «si "una sola vez por mes" es disciplina y no una
restricción de la base de datos, el primer doble clic emite 2.000». The route
checked the month inside the transaction, which stops a double click but not
two transactions at once. 0101 adds a partial UNIQUE index on (month, person)
for `reparto_mensual` entries: the second writer fails by itself and its whole
transaction rolls back; the route answers 409 on `23505` too. Tested with two
simultaneous executions of the same month on a clean book: one 200, one 409,
exactly five entries. Without CONCURRENTLY on purpose — instantaneous on dozens
of rows; noted for the day the table has a hundred thousand.

prog6's brake (`guardian` + `ritmo`, rule `transferencia`, by account) now sits
in front of the execution route as well. And the thing Eugenio was missing: a
POST he cannot fire does not exist for him. `/vision` · Economía shows admins
a «Reparto mensual del bote» panel — month picker, simulation (pot, verified,
fixed per person, state), the per-person list, and «Ejecutar el reparto» with
a confirm that states in numbers what will be emitted; disabled once the
month is paid.

Honest note on the behaviour, seen in the test: in a month where nobody has
measurable success, only the equal half is distributed and the other half is
left unissued and reported (`variable_sin_repartir`) — distributing it
equally in silence would invent merit. `tsc` clean; the panel itself not
opened in a browser (admin session in the shared browser).

### 2026-08-23 — Reparto de puntos automático, bienvenida de 5.000 y «activo = 3 días de uso» (Programador 7)
- **Encargo de Eugenio**: «haz que sea automático el reparto de puntos, y también que el usuario nuevo tenga 5000 puntos iniciales, y que reciba 1000 puntos al mes fijo si está activo y usando la plataforma al menos 3 veces al mes, y luego variables en función de su reputación social».
- **Bienvenida de 5.000** (`PUNTOS_BIENVENIDA`): `registrarRegaloBienvenida` pone saldo y apunte del libro en UNA transacción; `users.puntos` ya no nace por DEFAULT de columna (0103: DEFAULT 0). Cuentas existentes no se tocan.
- **Candado** (revisión del Dashboard): hoy circulaban ~1.400 puntos (14 × 100); con 5.000 una cuenta nueva valdría más que toda la plataforma junta y, con puntos transferibles, crear cuentas sería fabricar valor. Por eso **ENVIAR puntos exige cuenta verificada (nivel ≥ 2)**; recibir, gastar en la cesta y en el mercado, sí puede cualquiera. Queda dicho el riesgo residual: cuentas nuevas comprando con sus 5.000 a vendedores que aceptan puntos (cada cuenta tope 5.000, sin consolidación; el freno de registro de prog6 delante).
- **Días de uso**: tabla `actividad_diaria (user_id, dia)` (0103) anotada desde el middleware de sesión (una escritura por persona y día, en memoria se evita repetir); relleno del mes en curso desde sesiones, vistas válidas, reacciones y comentarios. No guarda qué hizo nadie, solo que estuvo.
- **Modelo vigente del reparto**: `PUNTOS_FIJO_MENSUAL` (1.000) a CADA persona verificada y activa (≥ `PUNTOS_ACTIVIDAD_MIN_DIAS` = 3 días de uso en el mes) + bote `PUNTOS_BOTE_VARIABLE` (1.000) repartido entre las activas en proporción a su reputación social del mes (vistas válidas, interacciones, reseñas positivas verificadas; `users.reputation` no lo calcula nadie aún — cuando exista entra aquí como peso). Sin reputación medible, el bote variable no se emite y se dice. Sustituye al «bote de 1.000 mitad/mitad» de la mañana.
- **Automático**: `repartoAutomatico` cada hora (y a los 90 s del arranque) paga el MES ANTERIOR (hora de Madrid) si está sin repartir; nunca el actual; desde `PUNTOS_REPARTO_DESDE` (2026-08). `PUNTOS_REPARTO_AUTO=off` lo apaga. Reloj y botón de admin comparten `ejecutarReparto` (una transacción, `ya`/`nada`/`hecho`; índice único de la 0101 de fondo). El botón de `/vision` · Economía sigue, para adelantar un mes o pagar uno que el reloj no pudiera.
- Textos públicos al día: `/tokenomics` (sección «Cómo se reparten los puntos»: 5.000 · 1.000 · 1.000 · 3 días · automático el día 1), libro blanco, lista de tareas, `/vision` (5.000 al empezar).
- Probado en local por HTTP: registro → 5.000 y apunte; día de uso anotado en la primera petición; transferir sin verificar → 403; simulación de agosto (1 activa de 4 verificadas); ejecutar julio → 400 «nadie activo»; ejecutar agosto → 200; repetir → 409; cuadre sin descuadres nuevos. Datos de prueba retirados.

### 2026-08-23 — Caducidad (10 años) e inactividad (24 meses) de los puntos (Programador 7)
- Decisión de Eugenio (22-08) ya en los términos; ahora construida. 0104: motivos `caducidad` y `perdida_inactividad` (apuntes contrarios, el libro sigue siendo de solo añadir) e índice para «¿ya avisé?».
- `estadoConservacion`: última actividad = mayor de día de uso, última sesión, último login, último movimiento HECHO por la persona y alta; se pierde a los 24 meses. Caducidad FIFO: caduca max(0, saldo − ingresos de los últimos 10 años). `U_PLATAFORMA` fuera.
- `barrerCaducidades` cada 6 h (y a los 2 min): `PUNTOS_CADUCIDAD=off` (por defecto) solo calcula y canta; `avisar` escribe avisos por la campana (30 y 7 días antes; 90 días antes de una caducidad; tipos `puntos_inactividad`/`puntos_caducan`/`puntos_perdidos`, una vez por clave); `on` además ejecuta las pérdidas. Lo enciende Eugenio. Rutas admin: `GET /api/admin/puntos/caducidades` (simulación) y `POST …/barrer`.
- `/api/puntos/saldo` devuelve `conservacion` y `/vision` · Economía la enseña bajo el saldo (última actividad, fecha en que se perdería, qué caduca pronto); `?pestana=economia` abre esa pestaña (destino de los avisos).
- **Nota que pidió el Dashboard (23-08):** con la bienvenida de 5.000 y `PUNTOS_TRANSFERENCIA=on` en producción, el 403 «para enviar puntos hace falta una cuenta verificada» es hoy la **única barrera** entre «cuenta nueva» y «5.000 puntos que se pueden mover». Está probada en local por HTTP y en el `server.cjs` desplegado; en vivo la prueba Eugenio con una cuenta sin verificar (no se crean cuentas en producción).

### 2026-08-23 — Comercio, segunda vuelta · Fase 1: avisos de pedido, preguntar al vendedor, descripción con formato (Programador 7)
- Eugenio: «dale a la parte de ecommerce (variantes, carrito, etc.) y haz una lista de otras 5 cosas importantes que aún no tenemos; divídelo en 5 fases». Plan e inventario en `memory/13_PLAN_COMERCIO.md` (Segunda vuelta).
- **El vendedor se entera de que ha vendido**: aviso `pedido_nuevo` por la campana al crear el pedido (pago todo-en-puntos en `publicar.ts` y pago con Stripe en el webhook), con el código y destino `/comercio?pestana=pedidos`. **El comprador se entera de que su pedido se mueve**: aviso `pedido_estado` al cambiar el estado desde Comercio (enviado con nº de seguimiento, entregado, devuelto con puntos devueltos, cancelado), destino `/pedido?codigo=`.
- **Preguntar al vendedor** desde la ficha del producto: enlace a mensaje directo (`/mensajes?con=`) en el dominio principal (la tienda vive en subdominio; ayudante `dominioPrincipal`). La ruta pública del producto expone `vendedor.id`.
- **Descripción con formato**: la ficha pinta la descripción con el `Markdown` del asistente (negrita, cursiva, listas, tablas); pista en CrearProducto. Sin marcas se ve igual que antes.
- Campana: tipos `pedido_nuevo` / `pedido_estado` con frase, icono y destino (el aviso trae el suyo). `avisos.ts`: `TipoAviso` ampliado.
- Probado en local por HTTP con producto «AI» y sesiones de prueba: compra en puntos → aviso al vendedor con código y nombre del comprador; marcar enviado con seguimiento → aviso al comprador con el seguimiento; `/api/notifications` del vendedor lo lista. Todo retirado.

### 2026-08-23 — Comercio, segunda vuelta · Fase 2: variantes/SKU con precio y stock por variante (Programador 7)
- 0107: tabla `producto_variantes` (nombre, SKU, precio propio nulo = el del producto, stock propio nulo = sin cuenta, `activo`; nunca se borra una variante comprada, se desactiva); `pedido_lineas.variante_id/variante_nombre`; `reservas_stock.variante_id` y unicidad (sesión, producto, variante).
- Servidor (`publicar.ts`): `variantesDe()` (con stock disponible descontando reservas por variante), `guardarVariantes()` (upsert: lo que no viene se desactiva), `reservado(db, producto, variante?)`. Ficha pública: `variantes`, `precio_desde_centimos`, `stock` = suma de variantes con cuenta. POST/PUT `mis-productos` aceptan `variantes`; GET `mis-productos` las adjunta. `comprar`: clave de línea = producto|variante, precio y nombre efectivos («Camiseta — Talla M»), stock por variante, 400 «Elige una opción» si el producto tiene variantes y no viene, 409 por variante, descuento de stock por variante en el pago en puntos, reserva con variante, metadatos de Stripe con 4.º campo. `cotizar` con variante. Webhook (`stripe.ts`): líneas con variante, descuento de stock por variante.
- Frontend: `useCarrito` (clave producto|variante, `aLineasServidor`, `claveLinea`), Cesta (variante en la línea y en las llamadas), FichaProducto (botones de variantes, precio/stock efectivos, «Elige una opción», añadir con variante), ProductoPublico («desde» y «Elegir opción» → ficha), `EditorVariantes.tsx` nuevo (CrearProducto y panel de Comercio por producto: «N variantes» → editor → Guardar).
- Probado en local por HTTP: crear con 2 variantes (M 2 uds, L 7 € sin cuenta) → ficha stock 2 / desde 5 €; comprar sin variante → 400; cotizar L → 7 €; comprar L en puntos → línea «— Talla L» a 700; 3 de M → 409 «solo quedan 2»; 1 de M → stock M 1; PUT quitando L → L desactivada; mis-productos con variantes. Camino Stripe no probado en local (sin claves): metadatos y webhook cambian de forma simétrica. Todo retirado.

### 2026-08-23 — Despliegues #325, #332, #335 verificados en producción (Programador 7)
- **#325 (caducidad/inactividad)**: en `off`; 0 apuntes de pérdida. **El número antes del `on`**: de 16 cuentas con saldo, 0 perderían por inactividad, 0 recibirían aviso y 0 caducarían; actividad más antigua 2026-08-03 → la primera pérdida posible sería en agosto de 2028. Condición pactada: antes de pasar a `on`, el `off` debe haber cantado con datos reales y ese número quedar escrito (hecho aquí).
- **#335 (variantes)**: índice `reservas_stock_sesion_producto_variante_idx` sustituye al viejo; reservas abiertas antes/después 0; el INSERT duplicado (misma sesión, producto y variante) falla y otra variante de la misma sesión entra (probado en producción en una transacción con ROLLBACK, sin rastro).
- **Qué mirar en la primera compra real con variante por Stripe** (no probada en local, sin claves): (1) `pedido_lineas`: `producto_nombre` con «— variante», `variante_id` y `variante_nombre` rellenos; (2) `producto_variantes.stock` de esa variante baja y `products.stock` no; (3) `reservas_stock` de esa sesión con `variante_id` y `confirmada`; (4) aviso `pedido_nuevo` al vendedor con el nombre de la variante. Avisar al Dashboard, salga como salga.

### 2026-08-23 — Comercio, segunda vuelta · Fase 3: carrito abandonado y favoritos (Programador 7)
- 0108: `cestas_guardadas (user_id, tienda, lineas, updated_at, avisada_at)` y `favoritos_productos (user_id, producto_id, precio_centimos)`.
- **Carrito abandonado**: `useCarrito` sincroniza cada cambio con `PUT /api/publicar/cesta` si hay sesión (retraso de 800 ms; un 401 apaga el intento en esa página: a nadie anónimo se le persigue) y recupera la cesta guardada si la local está vacía (otro dispositivo). Barrido horario (`barridoComercio`, y `POST /api/admin/comercio/barrido` a mano): cestas con líneas, 24 h sin tocar y sin aviso → aviso `cesta_olvidada` por la campana con destino `https://{tienda}.humanity.wiki/?cesta=abrir` (la cesta se abre sola), una vez por cesta (tocarla reinicia el reloj). El resumen del vendedor dice `cestas_a_medias` (30 días).
- **Favoritos**: corazón en las tarjetas del mercado y en la ficha de la tienda (`BotonFavorito`), chip «Favoritos (n)» en /mercado que filtra; `GET/PUT/DELETE /api/publicar/favoritos[/:id]`. El mismo barrido avisa `precio_bajado` cuando un favorito baja de precio (una vez por precio; el precio guardado se pone al día).
- Probado en local por HTTP: guardar/leer/vaciar cesta; sin sesión 401; resumen del vendedor con 1 cesta a medias; cesta retrasada 25 h → 1 aviso con destino a la tienda, segundo barrido 0; favorito guardado a 45 € → precio a 40 € → aviso «ha bajado de 45,00 € a 40,00 €», precio guardado 4000, segundo barrido 0; DELETE → 0. Todo retirado (precio demo repuesto, handle temporal quitado).

### 2026-08-23 — A counter for whether the platform can answer about its own content (prog8)

The Dashboard asked how much search-first has saved since #290, in euros. Two
answers came out of looking, and the second one matters more.

**It cannot be measured today**: a question the search answers leaves **no row
anywhere** — it never reaches `/api/ai/chat`, so there is no `ai_messages` and
no `ai_usage_charges`. What the AI cost is known to the cent; how often it was
not needed is not recorded at all. Counting `/api/search` does not fix it
either: the top search bar calls the same route, and the chat's typeahead calls
it once per typing pause.

**And there is no story in euros.** Public `GET /api/gasto` in production: the
platform's whole internal AI spend for August 2026 is **0,74 €** (0,727 €
Anthropic + 0,018 € open models). With 16 users, saving even half is ~0,37 € a
month. Search-first is worth having for speed and for answering with links
instead of prose — not as a cost saving, and it must not be sold as one.

**So the counter that went in is not measuring money.** It measures whether the
platform can answer about its own content: if most of what people ask ends up
at the model, the search is not failing — the content is not being found, or is
not there, and that is a product problem. A signal about the content, read at
the door people ask through. That reason is written in the migration header,
the route and the client **next to the 0,74 €**, because whoever finds this
table in a year would otherwise assume it was built to save costs and draw the
opposite conclusion (the Dashboard's point, and the right one).

What it is made of:

- `drizzle/0109_como_se_contesto.sql` — one row per question in
  `chat_como_se_contesto`: `resuelta` ('plataforma' | 'modelo') and, when the
  platform answered, how many results were shown. **Neither the question text
  nor who asked is stored**: a proportion needs neither, and a table holding
  people's questions is a table that has to be protected, anonymised and purged.
  Both halves live in the same table so the ratio is one query rather than a
  join between `ai_usage_charges` (which only exists when there was a charge)
  and something else.
- `POST /api/search/marca` in `src/server/graph.ts`, session-less on purpose —
  the chat works for visitors, and demanding a session would measure only
  registered users and bias the number upwards exactly where it should be
  honest. It is forgeable, and that is written down: the worst anyone achieves
  is spoiling our own statistic.
- The chat marks both outcomes, fire-and-forget, `keepalive`. An escalation
  (searched, nothing found, question) counts as **one** row, `modelo`: what is
  counted is who ended up answering.

Verified on 3008: «retos del agua» → one `plataforma / 8` row and **no**
`/api/ai/chat`; an escalated question → one `modelo` row (the model call itself
was cut in the browser for the test, so no tokens were spent); «zzqxvon
praderas» → `plataforma / 0`, because "there is nothing published" is also an
answer. Bad `resuelta` → 400; out-of-range `resultados` clamped; a failed insert
returns 204 and never surfaces in the chat. Test rows deleted, table back to 0.
`tsc` clean.

**What it will answer, in a month**: `X de Y preguntas` with its window, from
one query. Not before: with 16 users the sample will be small, and a small
sample said out loud is honest — presented as if it were big, it is not.

### 2026-08-23 — Comercio, segunda vuelta · Fase 4 (acotada): datos fiscales del vendedor, IVA por producto y RECIBO no fiscal (Programador 7)
- Acotada con el Dashboard hasta que Eugenio/asesor digan cómo se factura **en nombre del vendedor** (facturación por cuenta ajena; quién vende sin ser empresa): **nada numerado como factura**. Condiciones escritas para cuando toque: número correlativo sacado en la misma transacción que crea la factura (sin huecos ni repetidos; una anulada explicada antes que un hueco), y datos fiscales **copiados dentro de la factura** (una factura emitida no se edita).
- 0110: `datos_fiscales (user_id, nombre_fiscal, nif, direccion, cp, ciudad, pais, iva_defecto, serie_factura)` y `products.iva_pct` (21/10/4/0; nulo = el del vendedor). Hoy no existía ningún dato fiscal en la plataforma.
- Rutas: `GET/PUT /api/publicar/mis-datos-fiscales` (NIF validado en forma; `completos` solo con nombre, NIF, dirección, CP y ciudad); `iva_pct` en POST/PUT `mis-productos`; `construirRecibo` + `GET /api/publicar/pedido/:codigo/recibo?correo=` (comprador: correo o sesión) y `GET /api/publicar/mis-ventas/:id/recibo` (vendedor). El recibo dice arriba que **no es una factura**; con datos fiscales completos enseña quién vende y un **desglose de IVA informativo sobre los euros cobrados** (precios con IVA incluido; lo pagado en puntos no lleva IVA en euros; 0 € → sin desglose). Fallo cazado en la prueba: repartía IVA sobre un envío pagado en puntos → corregido.
- UI: `Recibo.tsx` (imprimir / guardar en PDF con `@media print` que deja solo el recibo), botón «Ver el recibo» en MiPedido y «Recibo» por venta en Comercio; panel plegable **Datos fiscales** en Comercio (`DatosFiscales.tsx`, con la nota de que sin datos hay recibo y no factura); select de IVA en CrearProducto.
- Probado en local por HTTP: datos vacíos → `completos=false`; sin NIF → false; NIF «12 3» → 400; completo → true; producto con IVA 10 comprado en puntos (2 uds + envío) → recibo del comprador con NIF del vendedor, línea con 10 %, puntos 22, euros 0; recibo del vendedor con comprador y dirección; otro usuario → 404; sin llaves → 400; sin datos fiscales → sin desglose y «no es factura». Todo retirado.

### 2026-08-23 — A ceiling on what the platform can spend on AI (prog8)

From the security board: **the AI chat has no spending ceiling**. It answers
**without a session**, so a loop from outside does not show up as usage — it
shows up on the bill, a month later.

**It is a ceiling for the platform, not for anyone.** Eugenio decided free
questions have no per-person limit and that is untouched: this does not look at
who is asking.

**The numbers are measured, not picked** (`src/server/ai/tope.ts` carries the
reasoning): the platform's entire AI spend for August 2026 was 0,74 €, and an
answer from the fast model costs 0,003–0,006 €. So **20 €/month** — about 27×
the real peak, which a normal month does not touch even at twenty times today's
use, and which a one-per-second loop exhausts in an hour or two. Not less,
because a cap that trips on normal use teaches people to raise it and by the
third time it is gone; not more, because past that the margin stops protecting
and only makes the worst case dearer.

**And 2 €/day, which is what keeps the degradation a mode instead of a month.**
With a monthly cap alone, that one-hour loop takes the month and leaves the chat
without a model for the other 29 days. A normal day is 0,025 €, so 2 € is eighty
normal days.

- **Three doors, not one**: the chat, `POST /api/ai/generar-imagen`, and the
  three AI routes in `documentos.ts` (document, presentation, improve a block).
  A cap on one of three doors is a sign, not a cap.
- **Checked before the call, never during**: cutting mid-answer would spend the
  money and still not answer. In the chat it is checked before the conversation
  row is even created — otherwise there would be conversations with a question
  and no answer.
- **It degrades, it does not fall**: the chat replies **200 with a normal
  message**, not an error, saying the search still works and costs nothing.
  `/api/ai/status` carries the state, so the panel starts in *Buscar* with the
  IA switch off and the reason written — knowing after you typed is knowing
  late.
- **If the database cannot be read, nothing is cut.** A failed read is not
  evidence of spending, and turning it into "no AI today" would make a small
  fault into an outage.
- **Counted without a query per message**: the sum is read once a minute and
  charges are added in memory in between (`apuntarGasto`), so the cut is
  accurate to the cent. A restart re-reads everything from the database.
- **Notice at 80 %**, once a month, to administrators only, checked **in the
  database** and not in a variable: here the server restarts several times a
  day and a bell that repeats teaches people to ignore it.
- **Visible**: `/vision` → Gasto shows «1,89 € de 20,00 €» with a bar that goes
  amber at 80 % and red when reached, and `?pestana=gasto` now opens that tab
  (it only understood `economia`, so the notice would have landed on the wrong
  one).

**A hole named and not hidden**: image charges are written with `cost_cents` =
0, so generating images costs real money at Gemini and **does not move the
counter**. The cap stops further images once it has been reached by another
route, but images cannot make it trip. Pricing the image belongs to whoever owns
the model catalogue; it is written next to the check, not in a document nobody
opens. **The cap protects the chat and the documents; images do not add up yet.**

Verified on 3008 with `TOPE_IA_EUR_MES=1` against 1,89 € already spent:
`/api/ai/status` reports 189 % and `alcanzado`; the chat answers with the
message and **no charge and no conversation row is created**; the search keeps
working in the same panel; the IA switch is disabled with its explanation. With
`2,30 €` (82 %) the notice is written **once** for two consecutive calls, keyed
by month, and reads «1,89 € de 2,30 € este mes». Test rows deleted, `.env`
restored, `tsc` clean.

### 2026-08-23 — Comercio, segunda vuelta · Fase 5: «avísame cuando vuelva», relacionados y valoración del vendedor (Programador 7)
- 0111: `avisos_stock (user_id, producto_id, variante_id, avisado_at)` con unicidad por persona, producto y variante.
- **Avísame cuando vuelva**: botón en la ficha con stock efectivo 0 (por variante); `PUT/DELETE/GET /api/publicar/avisame/:id`; el barrido horario del comercio avisa `vuelve_stock` cuando vuelve a haber disponible (descontando reservas), una vez por petición; destino a la ficha de la tienda. Tipo `vuelve_stock` en `avisos.ts` y frase/icono/destino en `Campana.tsx` (sin `as any`).
- **Relacionados**: «También en esta tienda» — otras cosas del mismo vendedor, misma categoría primero (6).
- **Valoración del vendedor** (acordada con el Dashboard antes de que desapareciera): nadie valora a la persona; es el agregado de reseñas de sus productos con compra verificada (una por persona y producto; el vendedor no reseña lo suyo; #277). Con menos de `MIN_RESENAS_VALORACION_VENDEDOR = 3` no se enseña nada (ni «sin valoraciones»); con 3+, «★ 4,5 · 3 opiniones verificadas en esta tienda». El umbral vive en una constante con nombre.
- Probado en local por HTTP: 2 reseñas → null; 3 → 4,5·3; relacionados; avísame → barrido con stock 0 → 0, con stock 5 → 1 aviso, segundo barrido 0, DELETE → 0. Todo retirado.
- Nota de equipo: el Dashboard dejó de existir esta noche; el turno de despliegue pasa a ser «mirar `gh run list` y que nadie esté desplegando antes de fusionar»; el motivo de cada reserva lleva delante el número del programador; y tras `soltar`, comprobar con `quien` (prog8 vio reservas «resucitadas» por una carrera).

## 2026-08-24 — El muro, limpio: solo publicaciones
Eugenio: «elimina los círculos de estados de personas, el buscador secundario
y la ristra de temáticas, y deja solo las publicaciones».

- Fuera tres bloques de la portada (`personas`, `objetivos`, `buscador`).
  `leerPortada` los ignora si estaban guardados, así que a nadie se le queda
  una portada rota de ayer.
- Arriba, solo lo que tiene portada; con vídeo, primero. Dentro de cada
  tramo manda la popularidad (`apoyos * 3 + vistas`), y para eso `knowledge.ts`
  ahora devuelve `apoyos` y `media`.
- Tres tarjetas por fila en vez de cuatro.
- Al pasar el ratón, el vídeo se reproduce y la portada crece un 12% por
  encima de sus vecinas, sin mover la rejilla.
- Etiquetas de tema dentro de la tarjeta, con el color del mapa y el mismo
  criterio (`hablaDe`) que usa el filtro de la izquierda: la etiqueta y el
  filtro no se pueden contradecir.
- Una foto que ya no existe se retira; antes dejaba el icono roto del
  navegador dentro de la tarjeta.
### 2026-08-22 — Veracidad, fases 2 y 4: ya se puede debatir

Eugenio dio el sí a las dos decisiones abiertas y pidió seguir por donde
recomendara. Recomendé juntar la fase 4 con la 2 en una sola entrega, y por qué:
la pantalla sin el sello enseña afirmaciones sin decir qué se sabe de ellas, y el
sello sin pantalla no lo ve nadie. Separadas, ninguna de las dos sirve todavía.

- **`/debates` y `/debates/:slug`**: la lista de lo que se discute y la pantalla
  del debate — la tesis arriba, y debajo **a favor** y **en contra** en dos
  columnas (y **matiza** cuando lo hay), cada argumento con sus fuentes, sus
  respuestas anidadas y su sello. Se argumenta y se cita **sin salir de la
  pantalla**: si hay que ir a otro sitio a escribir, no se escribe.
- **`<SelloVeracidad>`**: sin fuente · con fuente · verificada · disputada ·
  refutada, con las mismas palabras en cualquier pantalla de la plataforma.
  **«Sin fuente» es gris y no rojo**: no está mal, está sin comprobar — si todo
  lo que falta llevara rojo, el rojo dejaría de significar nada. Y un estado que
  el componente no reconoce **no se pinta como el primero de la lista**: eso
  sería inventarse un dato.
- **La escalera ya tiene firma** (`drizzle/0088`): quién movió el sello, cuándo y
  por qué. `verificada` sin decir por quién es exactamente el tipo de afirmación
  que esta área existe para no aceptar. Texto y no clave foránea, como
  `incidencias.respondido_por`: la firma sobrevive al borrado de la cuenta.
- **Tres reglas del servidor, no de la pantalla**: revisar es nivel 3; **nadie
  revisa su propio argumento** (ni un administrador — la regla es sobre quién lo
  escribió, no sobre el rango); y `refutada`/`disputada` **exigen motivo**, porque
  marcar algo como falso sin decir por qué deja al autor sin nada que responder.
  `sin_fuente` y `con_fuente` no se pueden poner a mano: las deciden las citas.
- **Verificado**: 12 comprobaciones nuevas en verde con dos usuarios de prueba
  (uno de nivel 3), más las 25 de la fase 1. En el navegador: el debate de
  muestra con sus cuatro argumentos, la respuesta anidada, el sello verificado
  con su fuente y el disputado con su motivo. Todo lo de prueba, borrado.
- **Tablero**: 8 tarjetas en verde de 30 (eran 2).

**Lo que NO está**: el enlace permanente a un argumento concreto (fase 4), el
plegado por tramos de un hilo largo (fase 3) y la votación (fase 5) — por eso un
argumento dice todavía «Sin votos» y no un número. Y no se ha comprobado en un
móvil.

### 2026-08-22 — Veracidad, fase 5: el voto de impacto

Eugenio: *«termina de hacer la herramienta de DEBATES y votaciones»*.

- **«¿Cuánto te mueve?», del 1 al 5**, en cada argumento. No es un «me gusta»:
  un argumento del bando contrario puede moverte mucho, y ese es justo el que
  tiene que subir. Pulsar otra vez el número que ya tenías **retira el voto** —
  cambiar de opinión al leer incluye dejar de tener opinión.
- **No estrena tabla**: los votos van a `ratings`, la que la plataforma ya usa
  para puntuar, con `entity_type = 'argumento'`. Una segunda forma de puntuar
  acaba dando dos números distintos para lo mismo.
- **Cada rama se ordena por impacto**, no por hora de llegada. Y **lo que nadie
  ha votado no se hunde al fondo**: iría al fondo el día que se escribe, donde
  nadie lo lee, y de ahí no saldría nunca — el voto que le faltaba se lo negaría
  el propio orden. Va justo detrás de lo más votado y por delante de lo que ya
  se juzgó flojo.
- **Ves tu voto y solo el tuyo.** Sin sesión, `mi_voto` es `null` — que no es lo
  mismo que votar bajo.
- **Sin votos sigue siendo NULL y no cero**, y la pantalla lo dice con palabras
  («Sin votos todavía»), no con un número. Al retirar el último voto vuelve a
  NULL: un argumento que se queda sin votos no es un argumento rechazado.
- **Un debate cerrado tampoco se vota** (409). Si no, el resultado seguiría
  moviéndose después de darlo por cerrado.
- **Se puede votar lo propio**, y es deliberado: un voto entre cientos no mueve
  nada, y prohibirlo obligaría a explicar por qué el autor es el único que no
  puede decir cuánto le importa su argumento. Revisar sí está prohibido —
  revisar afirma sobre el común, votar solo dice lo que te pasa a ti.
- **Verificado**: 15 comprobaciones nuevas en verde (401 sin sesión, fuera de
  rango, decimales, argumento inexistente, la media con dos votantes, cambiar el
  voto sin sumar otro, el orden con uno sin votar en medio, retirar y recontar),
  **y además pulsando los botones en el navegador**: 3,5 → 4,0 al votar, el
  número marcado en morado, y 4,0 · 1 voto al retirarlo. Todo lo de prueba,
  borrado.
- **Tablero**: 11 de 30 tarjetas en verde.

**Lo que sigue sin estar**: el espectro de visiones (fase 6, la que junta los
votos en posturas), el enlace permanente a un argumento, la carga por tramos de
un hilo largo, y el móvil sin comprobar.


## 2026-08-23 · Servidores: de «tengo copias» a «puedo volver» (prog6)

Segunda mitad de la noche del área de servidores. La primera dejó las copias
diarias funcionando; ésta las convierte en algo con lo que de verdad se puede
volver, y prepara la máquina para repartirse entre sus ocho núcleos.

**Todo lo que vivía en la memoria de un proceso y `cluster` habría roto en
silencio.** Es la familia de fallos de la noche: con un proceso funciona, con
ocho se multiplica sin un error y sin una línea en el registro.

- **El freno de los límites** (migración `0097`, tabla `frenos`). Era un `Map`
  de un proceso: con ocho, ocho frenos y el límite real ocho veces el puesto.
  De regalo, ahora sobrevive a un reinicio — hasta hoy un despliegue le
  regalaba empezar de cero a quien probara contraseñas.
- **La caché del gasto** (migración `0102`). Con ocho procesos, ocho cachés
  tomadas en momentos distintos: **la cifra de coste habría cambiado al
  recargar** la página que existe para ser transparente con el dinero. Un dato
  viejo se explica con su fecha; uno que baila hace dudar de todos los demás.
- **El cable del chat y el Chromium del navegador remoto** eran los otros dos.
  Los cogió prog8; el segundo lo resolvió Eugenio rechazando la premisa
  entera: dejar de encender Chromium en vez de repartirlo mejor.

**Dos fallos que solo encontró una base de datos de verdad.** Al pasar
`scripts/probar-limites.ts` de una base falsa a un PostgreSQL real:
`= ANY($1)` no funciona con un array de JavaScript, y —el grave— sin `::int`
los parámetros llegan como texto y `LEAST('5','900')` compara **cadenas**:
devolvía siempre el tope, o sea que **el primer fallo al iniciar sesión habría
dejado a cualquiera 15 minutos fuera**. Los dos pasaban la prueba anterior.

**`ritmo()`, porque un límite de ritmo no es un contador de fallos**
(corrección de prog7). `anotarFallo` frena y deja rastro; `ritmo` solo frena.
Meter actividad legítima en `intentos_fallidos` entierra lo que esa tabla
existe para enseñar. Ya lo usan las transferencias de puntos y el buscador.

**Freno al buscador**, que pasó a llamarse al teclear y recorre 20 tablas con
`ILIKE` sin sesión. Lo delicado es el número: **40 seguidas gratis**, porque
escribir tiene que pasar. Si el freno muerde a quien escribe, el buscador se
siente roto y nadie sabe por qué.

**Techo de memoria a los cinco servicios.** No tenía ninguno: si algo se
desbocaba no elegía el que fallaba, elegía el kernel — y aquí mata al que más
memoria ocupa, que suele ser Postgres. **No son un presupuesto, son un tope de
daño**: de 10 a 30 veces el uso medido, porque un techo ajustado mata un
contenedor sano un martes. Medido con `docker stats`, y la máquina también:
**15 GB y 8 núcleos**, no los 8 que dije yo ni los 32 que sigue diciendo
`docs/13_DEPLOY.md` — ese fichero es de Eugenio y no se ha tocado.

**Y lo que da título a la entrada.** De las 27 variables del `.env.production`,
el despliegue sabía reponer 7; las otras 20 vivían **solo en la máquina de la
que las copias protegen**. Los datos a salvo en Cloudflare y las llaves para
leerlos en el servidor que puede desaparecer. Ahora la tubería está puesta para
todas —aunque el secreto aún no exista: ausente, el `if` no hace nada— y
`deploy/copias/CLAUDE.md` dice qué hace falta para volver, en orden, y qué
cuesta perder cada llave. `SQL_ADMIN_PASSWORD` se deja fuera a propósito:
escribirla desde un secreto que no coincida daría un despliegue en verde y la
plataforma muerta.

Salió de medir la afirmación de otro: prog8 avisó de que `CLAVE_MAESTRA` no
estaba en las copias. Al comprobarlo apareció algo peor — **la llave nunca
llegaba al servidor**, porque poner un secreto en GitHub no hace nada por sí
solo: el workflow escribe únicamente las variables que nombra.

**Y un despliegue roto por mí**, contado aquí porque el arreglo enseña más que
el fallo: con `script_stop: true` la acción de SSH inserta su comprobación
después de cada línea, así que **una continuación con `\` deja de continuar**.
Un `for … ; do` de una línea sí funciona. La plataforma no se cayó —el fallo
ocurre antes de reconstruir— pero el despliegue quedó a medias. Lo que faltaba
era pasarle `bash -n` al `script:` del YAML: **un YAML válido puede contener un
shell roto**.
### 2026-08-23 — El navegador deja de retransmitir: se acabó el lag (Programador 8, fase 1 de 5)
- **Eugenio**: «esa solución nunca será viable porque va con LAG, y el usuario se queja de que va lento, y tiene razón». La tiene, y no era optimizable: entre mover el ratón y ver el efecto hay una ida y vuelta por internet. No es velocidad del servidor, es dónde está el ordenador que dibuja.
- **El defecto se invierte**: `useState<'remoto'|'proxy'>` pasa de `'remoto'` a `'proxy'`. Antes, **toda** visita encendía un Chromium en el servidor con su retardo y su tope de dos personas en toda la plataforma.
- **Chromium deja de ser una cámara y pasa a ser una imprenta** (`GET /api/navegador/instantanea`): abre la página, espera a que el JavaScript termine, se queda con el HTML y lo suelta pasado por la misma reescritura del proxy. El navegador queda ocupado segundos, no toda la sesión. Retransmitir da retardo en cada movimiento; imprimir da una espera al cambiar de página, como una web lenta.
- **La escalada no cuesta una petición extra**: `/api/navegador/leer` ya bajaba la página para sacar el título, así que ahora devuelve también `necesitaRender`. Se decide en el servidor porque el texto que viaja al cliente va recortado, y medir sobre un recorte diría «vacía» de cualquier página larga.
- **Medido a través del proxy real, no con `fetch` a pelo**: **9 de 12** sitios comunes se leen sin encender Chromium. Solo x.com, Gmail y Amazon lo piden — y dos de esos tres necesitan tu sesión, así que su sitio es el botón de abrir fuera.
- **Una corrección propia**: la primera medición, hecha con `fetch` sin identificación de navegador, decía 8 de 12 y ponía a El País entre los que necesitan render. Por el proxy —que sí manda una identificación de navegador— El País se lee entero. La prueba llegó a fallar por eso: **la expectativa estaba mal, no el código**.
- **La etiqueta «lectura» decía una mentira nueva.** Su texto era «el Chromium del servidor no está disponible», cierto cuando este modo era el respaldo. Al pasar a ser el normal habría salido en todas las páginas diciendo que algo va mal cuando va bien. Ahora el modo ligero no lleva distintivo —es lo normal— y solo se avisa de la instantánea y del modo con retardo.
- **El menú de tres puntos colgaba de `modo === 'remoto'`**: al invertir el defecto habría desaparecido justo en el modo que ahora usa todo el mundo, y con él la única forma de subir a directo. Ahora se enseña siempre; el zoom sigue siendo solo del modo retransmitido, porque en el ligero el zoom del propio navegador ya funciona y lo hace mejor.
- **Lo que la instantánea NO hace, dicho en el propio código y en la interfaz**: no responde a los botones de la web, porque su JavaScript no viaja. Para eso está «Usarla como aplicación», que avisa del retardo **antes** de entrar. Y para lo que necesita tu sesión —tu correo, tu banco— está abrir fuera: eso no debe pasar por nuestro servidor.
- **Desbloquea el reparto entre los ocho núcleos** de prog6: sin Chromium por defecto, ocho procesos ya no son ocho navegadores.
- **Pruebas**: `scripts/probar-navegador-sin-lag.mjs`, 10 comprobaciones, incluida una que cuenta los procesos de Chromium del sistema para demostrar que leer Wikipedia **no enciende ninguno**. Verificado además en la aplicación de verdad: Wikipedia se pinta entera en modo ligero y Amazon entera por instantánea, con su etiqueta.

### 2026-08-23 — Conectar tu cuenta de Google (Programador 8, fase 2 de 5)
- **No es «entrar con Google»**, que ya existía y solo dice quién eres. Esto es un permiso que dura y deja pedirle cosas a Google en tu nombre; usa el flujo de código de autorización y necesita un secreto de cliente. **No se mezclan nunca**: unirlos convertiría un botón de «entrar» en uno de «dame tu correo».
- **El permiso duradero va cifrado** con el sobre de prog4. Es el dato más peligroso que la plataforma va a guardar de nadie, y desde el 2026-08-22 la base entera sale del servidor cada noche en la copia de seguridad.
- **Gmail queda fuera a propósito**: es el único permiso «restringido» de Google, con auditoría de seguridad anual de pago (500–4.500 $/año). YouTube, Contactos y Calendario son «sensibles»: solo verificación. Decisión de Eugenio, «para todos, pero solo con lo barato». Enchufar Gmail es añadir una línea a una lista.
- **Nadie usaba todavía el cifrado de prog4 y `CLAVE_MAESTRA` no estaba configurada en ninguna parte.** Sin ella el fallo habría llegado en el peor momento: la persona ya habría dado el permiso en Google y al volver no se habría podido guardar. Ahora se comprueba antes y el botón no aparece.
- **Una comilla invertida dentro de un comentario en una plantilla SQL cierra el literal** y lo de después se evalúa como JavaScript (`$6 is not defined`). Queda avisado en el código.
- **Una prueba que empezó verde por el motivo equivocado**: «la cuenta no se cuelga de quien no debe» pasaba porque el canje iba al Google real, fallaba, y no se guardaba nada. Rehecha con un Google de mentira; ahora la comprobación es positiva.
- **18 comprobaciones**, incluida que al retirar el permiso **se le avisa a Google** y no solo se borra la fila.

### 2026-08-23 — Mis vídeos de YouTube, pintados a nuestra manera (Programador 8, fase 3 de 5)
- **«A nuestra manera» acabó siendo concreto**: los «me gusta» y las listas **juntos y buscables** —en YouTube son pantallas distintas y no se pueden buscar— y sin recomendaciones al lado. El vídeo lo pone el reproductor oficial: descargarlo o retransmitirlo le quitaría la visita al canal, además de ser ilegal.
- **Estuve a punto de sobrescribir `src/server/youtube.ts`**, que existe desde el 2026-08-18 y es la pantalla de cine de la aldea. Lo recuperé al ver que el editor decía «actualizado» y no «creado». Que dos cosas usen YouTube no las hace la misma cosa: aquella recomienda lo que no has visto, esta enseña lo que ya guardaste. Vive en `misVideos.ts`.
- **Y de paso, el cine deja de pedir un segundo permiso**: si ya conectaste por la vía general, la usa. Añadido de tres líneas, no cambio.
- **Tres decisiones con número**: no se traen las suscripciones enteras (200 canales son miles de vídeos al mes); **no se busca nunca** en la API (buscar cuesta 100 unidades de cuota, listar 1, sobre 10.000 al día); y no hay sincronización automática, que gastaría la cuota en gente que no ha abierto la pantalla.
- **Lo más probado es lo que no puede pasar**: con YouTube caído o la cuota agotada, **la lista no se vacía**. Es el fallo que se lee como «he perdido mis vídeos». 13 comprobaciones.

### 2026-08-23 — Tu agenda y tu calendario de Google (Programador 8, fases 4 y 5 de 5)
- **La agenda entra por la misma puerta** que el .vcf, el Atajo del iPhone y el selector del navegador: las cuatro pasan por `importarContactosDe()`. Una sola copia de las reglas de no duplicar y no pisar el nombre que tú pusiste.
- **Solo nombre y teléfono.** Ni correos, ni direcciones, ni cumpleaños: una agenda dice con quién se trata alguien, quién es su médico y quién su abogado. Se cuentan aparte los contactos que Google tiene sin número — sin ese dato, quien tiene 400 contactos y ve 250 importados busca a los otros 150.
- **El calendario es la excepción del plan y se explica como decisión**: no guarda copia aunque Eugenio eligiera guardar. Un calendario cambia mientras lo miras y una cita vieja te presenta a la hora que no es; son decenas de filas; y «miércoles 17:00, oncología» dice más de alguien que toda su lista de reproducción.
- **Sus citas se pintan junto a las de aquí**, no en otra pestaña, y las dos agendas se piden en paralelo: si Google falla, el calendario de la plataforma se pinta igual.
- **Dos costuras cerradas**: arrastrar una cita de Google la habría pintado movida sin cambiar nada en Google, y pulsarla habría abierto nuestro editor para guardar en el vacío. Ahora no se arrastra y se abre en Google.
- **Lo que no se escribe en tu calendario**: ni invitados, ni videollamada, ni recordatorios que nadie pidió. 13 comprobaciones.

### 2026-08-23 — Un clic, una carga: la espera del navegador era una carga de más (Programador 8)
- **Eugenio**: «tarda en responder y ponerle a cargar esa URL, es como si por 1 o 2 segundos estuviese haciendo un proceso que no es cargar esa web».
- **Medido antes de tocar nada**: al pulsar un enlace, apple.com se cargaba **dos veces** — una al seguir el enlace y otra 700 ms después. La segunda era el marco remontándose: llevaba `key={url}`, la página avisa por `postMessage` de a dónde ha ido, eso cambiaba la clave, y React tiraba el `<iframe>` para montar otro que volvía a cargar lo ya cargado.
- **El arreglo separa dos cosas que no son la misma**: dónde estás (barra, historia, título) y qué hay que **mandar** cargar. Lo segundo solo cambia cuando la orden es nuestra: barra, atrás/adelante, recargar, o subir a instantánea.
- **Y la otra mitad**: cada navegación llamaba a `/api/navegador/leer` para el título, y esa ruta **vuelve a descargar la página entera en el servidor**. Dos descargas completas por clic. Ahora el título y el «viene vacía» los manda la propia página por `postMessage`, donde ya está cargada y no cuesta nada.
- **Dos cosas que rompí arreglándolo, y por eso la prueba cubre los caminos que SÍ tienen que cargar**: el primer freno dejó «atrás» sin efecto —volvía a una dirección que el marco ya tenía apuntada, así que la clave no cambiaba— y se arregla con un contador de órdenes en vez de la dirección; y la subida a instantánea, que es la misma dirección por otro camino, necesitaba saltarse el freno a propósito.
- **La prueba cuenta las cargas** (`scripts/probar-clic-sin-espera.mjs`, 10 comprobaciones). El síntoma era «va lento», que no falla ninguna prueba: si no se cuenta, vuelve.
- **Tercera vez en el día** que una comilla invertida dentro de una plantilla de JavaScript cierra el literal y lo de después se evalúa como código. Queda avisado dentro de la propia inyección.


### 2026-08-24 — Comercio F6: avisos de pedido por WhatsApp (Programador 7)
- Eugenio (24-08): «les mandamos un whatsapp, no un email, que es más moderno, montémoslo». Antes de esto **nadie recibía nada al comprar**: quien compraba sin cuenta solo tenía su código en la pantalla; si cerraba la pestaña, lo perdía. Era el agujero más grande del comercio.
- **Dos capas a propósito.** (1) **Funciona hoy, sin cuenta ni clave**: enlaces `wa.me` con el texto ya escrito — el comprador ve «Escribir al vendedor por WhatsApp» en su pedido y el vendedor «WhatsApp al comprador» en cada venta; lo manda la persona desde su número, coste cero. (2) **Automático, apagado**: cliente de la Cloud API de Meta (`src/server/whatsapp.ts`), `WHATSAPP_ENVIO=off` por defecto: calcula el mensaje, lo anota como `simulado` y no sale nada. Para enviar de verdad hacen falta cosas que no son programación y solo puede hacer Eugenio: cuenta de Meta Business verificada, número dedicado y **plantillas aprobadas** por Meta (categoría «utility»); los nombres de plantilla se configuran por variable.
- 0112: `pedidos.telefono_contacto` (copiado al comprar, no leído del perfil al enviar) y `whatsapp_enviados` (qué se mandó, a quién, con qué estado y qué contestó Meta) con índice único (motivo, entidad, teléfono): un aviso, una vez.
- Enganches: compra pagada con puntos y compra por Stripe → `compra_hecha` al comprador y `venta_nueva` al vendedor; marcar enviado/entregado/devuelto → aviso al comprador con el seguimiento. El teléfono se pide en la cesta (opcional, diciendo para qué) y Stripe lo recoge en el pago (`phone_number_collection`).
- `GET /api/admin/whatsapp`: estado del canal, qué falta para enviar de verdad, y los últimos avisos.
- Probado en local por HTTP: canal apagado dice qué falta; compra con teléfono → dos avisos `simulado` (comprador y vendedor) con el texto real; enlaces `wa.me` correctos en las dos direcciones y el teléfono no se filtra al cliente; marcar enviado → aviso con seguimiento; repetir el estado → sigue habiendo **un** aviso. Todo retirado.

### 2026-08-24 — Comercio F7: la devolución la pide el comprador · «preparando» · fecha estimada (Programador 7)
- Eugenio (24-08): «sí, que la pida el comprador». Antes solo el vendedor podía marcar devuelto; quien había comprado tenía que escribirle y confiar.
- 0113: tabla `devoluciones` (motivo, estado pedida/aceptada/rechazada, respuesta, quién y cuándo) — tabla y no columnas porque una rechazada y otra pedida después son dos hechos y el libro es de solo añadir; índice único «una viva por pedido». `pedidos.entrega_estimada`. **Y se amplía `pedidos_estado_check`** para admitir `preparando`.
- **Fallo cazado en la prueba**: la primera versión de la migración decía que el estado no tenía restricción en la base. Sí la tenía: marcar «preparando» fallaba con un error de Postgres. Corregido en la propia migración antes de desplegar.
- Rutas: `POST /api/publicar/pedido/:codigo/devolucion` (la pide quien compró, con correo o sesión, motivo obligatorio, plazo `DIAS_PARA_DEVOLVER`=30) y `PUT /api/publicar/mis-ventas/:id/devolucion` (el vendedor acepta o rechaza; rechazar exige motivo). **Los puntos vuelven solo al aceptar**, nunca al pedirla. Avisos `devolucion_pedida` (vendedor) y `devolucion_resuelta` (comprador, también por WhatsApp).
- `preparando` entre pagado y enviado (paso propio en el pedido y botón en Comercio) y **fecha estimada de entrega** que pone el vendedor y ve el comprador (nula = no se enseña ninguna: inventar una fecha es prometer en nombre de otro).
- Probado en local por HTTP: sin motivo → 400; pedida → aviso al vendedor; repetir → 409; rechazar sin motivo → 400; rechazada → saldo intacto y aviso con el porqué; volver a pedirla y aceptar → 2 puntos devueltos, pedido `devuelto`, saldos cuadrados (100/100/0) e historial «rechazada → aceptada»; preparando + fecha → el comprador los ve; quitar la fecha funciona. Todo retirado.
### 2026-08-22 — Veracidad, fase 6: el espectro de visiones

Lo que Eugenio pidió por su nombre el primer día: *«poder generar un espectro de
visiones sobre una verdad»*. Está en la pantalla del debate, debajo de la tesis.

- **No dice quién gana. Dice cómo está repartida la gente**, en cinco bandas de
  «muy en contra» a «muy a favor», y **la mejor razón de cada banda** — que es
  lo que habría que rebatir para moverla de sitio. Eso es lo que convierte esto
  en un mapa del desacuerdo y no en una encuesta.
- **La postura no se pregunta: sale de lo que cada uno vota.** Lo que alguien
  dice que piensa y lo que de verdad le mueve no siempre coinciden, y **dos
  personas pueden estar a favor por razones opuestas** — eso solo se ve mirando
  qué argumento sostiene cada una.
- **El signo se hereda por el árbol.** Un «a favor» colgado de un argumento «en
  contra» refuerza el lado contrario a la tesis, y quien lo vota queda en contra.
  Un grafo plano no sabría decir eso; el árbol sí, y es la razón de que el
  modelo sea un árbol.
- **Quien solo vota matices no es un centrista**: sale aparte, como «sin postura
  clara». Meterlo en la banda del medio inventaría una postura que nadie tiene.
- **Con menos de tres personas lo dice**: «esto no es un reparto de posturas, son
  dos opiniones». El dibujo con dos votos tiene forma, y la forma engaña.
- **No estrena tabla**: la postura se calcula al leer, a partir de los votos que
  ya están en `ratings`. Guardarla habría sido congelar algo que cambia cada vez
  que alguien mueve un voto.
- **Verificado**: 11 comprobaciones nuevas en verde — las tres bandas extremas,
  el matiz que no cuenta, la herencia del signo por el árbol, la mejor razón de
  cada banda, y que se lee sin sesión. **Y un fallo encontrado midiendo, no
  mirando**: las barras salían con altura 0 (un `height` en % sobre una columna
  de alto automático) y en la captura parecían un detalle de diseño. El alto
  real las delató. Arreglado y vuelto a medir: 45 px, 32 px, 32 px.
- **Tablero**: 14 de 30 tarjetas en verde.

**Lo que queda**: coherencia con lo ya publicado (fase 8), el debate sobre el
lienzo (7), revisión y moderación (9), y sacarlo a la portada y al buscador (10).
### 2026-08-24 — Un buscador de verdad, y los menús que se abren sin pulsar (Programador 2)
- **Buscador** (`src/server/buscador.ts`, desplegado en #360): `GET /api/buscar/sugerencias` (dos clases: lo que existe y frases para completar, compuestas con títulos reales porque no hay historial), `GET /api/buscar` (puntuación: +3 por palabra en el título, +1 en el cuerpo, +4 si el título lleva la frase entera; devuelve el trozo con la palabra dentro) y `POST /api/buscar/resumen`. Sólo lo público: busca cualquiera sin cuenta, decisión de Eugenio.
- El resumen llega **en dos partes rotuladas y con distinto color**: «SEGÚN LO QUE HAY AQUÍ» y «LO AÑADE LA IA · NO ESTÁ COMPROBADO AQUÍ». Si no se pueden separar, todo va a la gris; nunca al revés. Selector de tres modelos (Sencillo / Medio / El mejor). Los resultados se piden y se pintan antes que el resumen, así que un fallo de la IA no tumba la página.
- **Fallo encontrado en producción y arreglado en #361**: con el modelo barato, 2 de cada 5 respuestas venían con el JSON **cortado a mitad** (500 tokens no daban). `JSON.parse` fallaba, el código lo daba por prosa y (a) pintaba las llaves y las comillas en pantalla y (b) mandaba a «no comprobado» un párrafo que venía rotulado como comprobado. Ahora los dos campos se leen por su rótulo aceptando la última cadena sin cerrar, `maxTokens` sube a 800, y si aún parece JSON no se enseña resumen. Verificado 5/5 en producción con los dos bloques llenos.
- **Una sola caja de buscar.** Ya existía `BuscadorSuperior` (barra de arriba, sin sugerencias, llevaba a `/explorar?q=`). No se ha dejado en dos: el cuerpo es `CajaBusqueda` —la misma que usa la página de resultados— con la piel de pastilla y el interruptor de IA dentro. Y se ha quitado la segunda caja que la página de resultados llevaba encima, que salía vacía tres centímetros debajo de la que sí tenía lo escrito.
- **«Conocimiento» en verde** en la barra superior: `emerald-600`, el mismo de la portada; `emerald-400` cuando el botón está en negro, que si no no se lee.
- **Calendario arriba a la derecha** (`BotonCalendario.tsx`) con vista previa del día al acercar el ratón: no pide nada hasta que alguien se acerca (está en todas las pantallas), distingue «todavía no lo sé» de «hoy no hay nada», y el punto verde sólo aparece cuando consta que hay algo. Sólo con sesión: `/api/calendario` contesta 401 sin ella.
- **Abrir los menús sin pulsar** (`src/hooks/useAbrirAlAcercarse.ts`): borde izquierdo → «Explorar», borde derecho → «Organizar», y pasar el ratón por cualquiera de los tres círculos abre el suyo. Un solo sitio decide el retardo (150 ms para abrir, 400 para cerrar), la franja (8 px, estrecha para no dispararse al ir a por la barra de desplazamiento) y que nada de esto exista sin puntero fino.
- **Lo que se abre rozando se cierra solo; lo que se abre pulsando se queda**, y tocar algo dentro del menú lo asciende a «lo quiero». Segundo intento: el cierre por `onMouseLeave` **no valía** —probado en el navegador: del círculo de abajo al menú del borde el ratón nunca entra en el menú, así que el evento no llega nunca y el menú se quedaba abierto para siempre—. Ahora se mira dónde está el ratón y se pregunta por pertenencia (`contains`), no por rectángulos: los círculos viven en una tira que ocupa todo el ancho.
- Verificado en el navegador: sugerencias sobre «agua», Intro y lupa a `/buscar?q=`, los dos bloques del resumen, hover en los dos círculos y en los dos bordes (abre y cierra), y la vista previa del calendario con dos eventos de hoy. Para esto último se creó un usuario `PRUEBA_PROG2_CAL` con dos eventos en la base local; borrado después y comprobado a 0.

### 2026-08-24 — Comercio F8: zonas de envío y recogida en persona (Programador 7)
- Eugenio (24-08), a «¿se vende fuera de España?»: zonas con precios distintos **y** recogida en persona. Antes había una sola tarifa por producto, igual para el pueblo de al lado que para Alemania.
- 0114: `producto_envio_zonas (producto_id, zona, centimos, gratis_desde_centimos)` con cuatro zonas — `peninsula`, `no_peninsular` (Baleares, Canarias, Ceuta y Melilla: para un transportista son el mismo problema), `europa`, `resto` —; `products.recogida_en_persona` y `recogida_donde`; `pedidos.entrega_tipo` (envio/recogida/digital). **Herencia sin sorpresas**: quien tenía `envio_centimos` lo conserva como tarifa de PENÍNSULA y las demás zonas quedan cerradas — nadie amanece vendiendo a Alemania sin saberlo.
- `src/server/zonasEnvio.ts`: la zona se **deduce** del país y el CP del destino (07/35/38/51/52 = no peninsular; lista de la UE en un solo sitio), nunca se elige a mano — elegirla sería invitar a pagar el porte barato y pedir el envío caro. `calcularEnvio` mantiene las reglas de siempre (el porte más caro, no la suma; gratis si alguna línea tiene umbral y el subtotal lo pasa) y añade una: **si algo no llega a esa zona, no se cobra y se dice cuál**.
- `cotizar` acepta país y CP y devuelve zona, si se envía, qué no llega y si cabe recogida; la cesta recotiza mientras se escribe el destino. `comprar` calcula el porte con la zona real y admite `entrega: 'recogida'` (sin porte y sin pedir dirección). La ficha enseña la tabla de zonas y «a otras zonas no envía», más el sitio de recogida.
- El vendedor las gestiona en Comercio → «envíos» (`EditorEnvio`): una fila por zona, **zona en blanco = no envía ahí**, dicho con esas palabras porque «vacío» suele leerse como «gratis».
- Probado en local por HTTP: tarifas 3,50 / 9 / 15 y resto cerrado → cotizar Madrid 350, Tenerife 900, París 1500, Nueva York `se_envia=false` con el nombre de lo que no llega; 5 unidades (50 €) → envío 0 por umbral; comprar a Canarias → pedido con porte 900 y `entrega_tipo=envio`; comprar a EE. UU. → 409 sin tocar dinero; recogida → porte 0, `entrega_tipo=recogida` y sin dirección. Todo retirado.
