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
