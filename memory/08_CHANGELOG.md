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
