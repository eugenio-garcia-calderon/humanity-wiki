# 01 — Arquitectura Técnica

## Visión general

```
┌─────────────────────────────────────────────────────────────────┐
│                          Navegador                               │
│   React 19 SPA (Vite) ── Mapbox GL JS ── Tailwind CSS 4          │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ HTTP (fetch) + Vite dev middleware
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Express server (server.ts)                   │
│  - Sirve la API REST bajo /api/*                                  │
│  - En dev: monta Vite como middleware (HMR)                       │
│  - En prod: sirve el build estático de Vite + catch-all SPA       │
│  - Integración Stripe (checkout, webhooks, membresías)            │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ Drizzle ORM (SQL)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│           PostgreSQL 17 + extensión PostGIS 3.6                   │
│  - Tablas de dominio (territorios, objetivos, indicadores,        │
│    marcadores, métricas, estaciones de medición, contenido)       │
│  - Geometrías (polígonos de territorios, puntos de estaciones)    │
│  - Vector tiles MVT servidos vía ST_AsMVT                         │
└─────────────────────────────────────────────────────────────────┘
```

## Frontend

- **React 19** + **TypeScript**, bundler **Vite 6**, enrutado con **React Router 7**.
- Estilos con **Tailwind CSS 4** (integrado vía plugin `@tailwindcss/vite`, sin archivo de config clásico).
- **Mapbox GL JS** (`mapbox-gl`) para el mapa interactivo — estilo base `light-v11`, capa raster `mapbox://mapbox.satellite` para la vista "planeta" en zoom bajo, fuentes/capas GeoJSON propias para planetas/continentes/países/regiones, y marcadores DOM (`mapboxgl.Marker`) para etiquetas de territorio y estaciones de medición.
- **Contextos de React** (`src/contexts/`): `AuthContext`, `DataContext`, `DesignContext`, `EditContext`, `SettingsContext` — gestión de sesión, datos globales, tema/diseño editable en vivo (`admin/design`), modo edición de contenido, y preferencias de usuario (tamaño de letra). `SettingsContext` y `DesignContext` comparten el mismo patrón: no hay sistema de cuentas real en uso, así que las preferencias "por usuario" se guardan en `localStorage` (persisten por navegador/dispositivo, no por cuenta) — cualquier preferencia nueva de este tipo debería seguir el mismo patrón en vez de esperar a una tabla de usuarios real.
- **Estructura de páginas** (`src/pages/`): ~25 rutas — listados y fichas de detalle para Territorios, Objetivos, Indicadores, Retos, Soluciones, Proyectos, Organizaciones, además de `Map` (mapa interactivo), `Login`, `AdminDesign`, páginas "Sobre Red Humana", `Contribuye`, `HazteSocio`/`SocioConfirmacion` (flujo de membresía Stripe).
- **Componentes** (`src/components/`): `layout/` (navegación, layout general) y `ui/` (componentes reutilizables), más `HumanityMap.tsx` (el componente de mapa, el más complejo del frontend).
- **Utilidades** (`src/utils/`): `objectiveIds.ts` (mapa id↔clave de los 6 objetivos), `indicatorIcons.ts`/`markerIcons.ts`/`metricIcons.ts` (iconografía por `id` de entidad — nunca por nombre, ver `05_STYLE_GUIDE.md`), `scoreColor.ts` (gradiente de color 0–100), `slugify.ts`, `cn.ts` (helper de clases condicionales).
- **Servicios** (`src/services/`): `MapService.ts`, `MapDataProvider.ts` — capa de acceso a datos geográficos consumida por `HumanityMap`.

## Backend

- **Express 4** (`server.ts`), un único proceso que:
  - En **desarrollo**: crea el servidor Vite en modo middleware y lo monta, dando HMR real sin servidor separado.
  - En **producción**: sirve los archivos estáticos generados por `vite build` y responde con `index.html` en cualquier ruta no reconocida (SPA catch-all).
  - Expone toda la **API REST** bajo `/api/*` (listado completo en `02_DATABASE.md` y en el propio `server.ts`).
- **Stripe**: `getStripe()` inicializa el cliente de forma perezosa leyendo `process.env.STRIPE_SECRET_KEY` (sin fallback hardcodeado — ver decisión de seguridad en `03_DECISIONS.md`). Rutas: creación de checkout session, consulta de estado de sesión, estado de membresía, webhook de eventos.
- **Firebase**: presente en dependencias/config (`firebase-applet-config.json`, `metadata.json`) por ser residuo del scaffold de AI Studio; **no está conectado** a ninguna lógica de runtime actual. No asumir que existe integración activa sin comprobarlo primero.

## Base de datos

- **PostgreSQL 17** (no 16 — PostGIS solo publica paquetes Homebrew para 17/18) con extensión **PostGIS 3.6** para tipos y funciones geoespaciales.
- En **desarrollo local**: instancia Homebrew (`brew services start postgresql@17`), autenticación `trust` (no requiere contraseña real, aunque drizzle-kit exige que `SQL_PASSWORD` no esté vacía en `.env`).
- En **producción** (previsto, no confirmado como desplegado): Cloud SQL para PostgreSQL — mismo motor y extensión, mismas migraciones.
- **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`) define el esquema en TypeScript (`src/db/schema.ts`) y genera migraciones SQL versionadas en `drizzle/000X_*.sql`.
- **Flujo de migraciones establecido** (importante — ver `05_STYLE_GUIDE.md`):
  1. Editar `src/db/schema.ts`.
  2. `npx drizzle-kit generate` → genera un nuevo `drizzle/000X_nombre.sql`.
  3. Aplicar manualmente con `psql -f drizzle/000X_nombre.sql` (contra la variable de conexión local).
  - **Nunca usar `drizzle-kit push`**: en este entorno de shell no interactivo, el prompt de confirmación de `push` se queda colgado indefinidamente.
- **Vector tiles**: `GET /api/geo/tiles/:z/:x/:y.pbf` genera tiles MVT en el propio Postgres vía `ST_AsMVT`, sin servicio de teselas externo.

## Control de versiones y despliegue

- Repositorio: **GitHub**, `eugeniogarcia30-cmd/plataforma-evolucion-humanidad` (privado).
- El usuario edita directamente en GitHub (vía web UI) en paralelo a las sesiones de desarrollo local (típicamente `README.md` y `MEJORAS_PENDIENTES.md`) — **siempre hacer `git fetch` + `git merge` antes de `git push`** para evitar sobrescribir esos cambios.
- CLI `gh` autenticado vía OAuth device flow para crear/gestionar el repo desde el entorno de desarrollo.

## Variables de entorno (`.env`, no versionado — plantilla en `.env.example`)

```
VITE_MAPBOX_TOKEN=          # token público de Mapbox (prefijo VITE_ = expuesto al bundle de frontend)
SQL_HOST=
SQL_DB_NAME=
SQL_USER=
SQL_PASSWORD=
SQL_ADMIN_USER=
SQL_ADMIN_PASSWORD=
STRIPE_SECRET_KEY=          # clave secreta de Stripe — NUNCA debe hardcodearse en server.ts ni escribirse en /memory
STRIPE_WEBHOOK_SECRET=
VITE_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_ID=
```

> Ninguna de estas claves reales debe copiarse jamás dentro de `/memory` ni de ningún otro archivo versionado. Si una IA futura necesita saber si una clave está configurada, debe comprobar `process.env.X` en tiempo de ejecución, no imprimir su valor.

## Organización del código (resumen de carpetas)

```
/
├── server.ts                  # Express + API + Stripe + Vite middleware/estático
├── src/
│   ├── App.tsx                 # Definición de rutas (React Router)
│   ├── pages/                  # ~25 páginas/rutas
│   ├── components/
│   │   ├── layout/             # navegación y layout general
│   │   ├── ui/                 # componentes reutilizables
│   │   └── HumanityMap.tsx     # componente de mapa (Mapbox GL)
│   ├── contexts/                # Auth, Data, Design, Edit
│   ├── services/                # MapService, MapDataProvider
│   ├── utils/                   # iconos por id, colores de score, slugify, cn
│   └── db/
│       ├── schema.ts            # esquema Drizzle (fuente de verdad — ver 02_DATABASE.md)
│       ├── index.ts             # conexión/cliente Drizzle
│       └── seed-*.ts            # 7 scripts de siembra de datos (idempotentes, DELETE+INSERT)
├── drizzle/                     # migraciones SQL generadas + drizzle/meta
├── public/geo/                  # GeoJSON de territorios (planetas, continentes, países, regiones)
├── memory/                      # ← este directorio de documentación viva
└── MEJORAS_PENDIENTES.md        # backlog corto mantenido por el usuario directamente en GitHub
```

## Patrón de filtro en cascada del mapa (Objetivo → Indicador → Marcador → Métrica)

```
activeObjective ──▶ activeIndicatorId ──▶ activeMarkerId ──▶ activeMetricId
      │                    │                    │                  │
      ▼                    ▼                    ▼                  ▼
  colorea por          colorea por          colorea por      pinta estaciones
  score de           score de indicador   score de marcador  de medición en el
  objetivo                                                    mapa, coloreadas
                                                                por nivel de riesgo
```

Cada cambio de nivel resetea los niveles más profundos (`handleObjectiveChange`, `handleIndicatorChange`, `handleMarkerChange` en `src/pages/Map.tsx`). Los territorios sin dato en el nivel activo se pintan en gris `NO_DATA_COLOR` (`#cbd5e1`) con etiqueta "Sin datos", nunca heredan una puntuación del nivel superior.

## Páginas de entidad ligadas a territorio (Objetivo→Indicador→Marcador→Métrica)

Además de colorear el mapa, cada nivel del filtro en cascada abre en la columna central una "página" con información general de la entidad más los datos concretos del territorio seleccionado (y, para métricas, de sus estaciones "y alrededores"). Arquitectura (añadida 2026-08-03, ver decisión completa en `03_DECISIONS.md`):

- **Backend**: un único endpoint genérico `GET /api/explorer/:level/:id?territoryId=...&radioKm=...` (`server.ts`), con una rama `if (level === 'objetivo'|'indicador'|'marcador'|'metrica')`. Cada rama devuelve `{ level, entity, territory, observation|score, hasData, children, challenges, solutions }`; el nivel métrica devuelve además `stations` (sin `children`, es el nivel hoja). Los `children` de un nivel son directamente los hijos del siguiente nivel de la jerarquía, con su score/nivel de riesgo ya resuelto para el territorio — así el propio panel central permite seguir bajando de nivel, no solo el menú de la izquierda. `challenges` sale de la tabla de unión reto↔nivel correspondiente (`challenge_objectives`/`challenge_indicators`/`challenge_markers`/`challenge_metrics`) filtrada por `challenge_territories`; `solutions` sale de `challenge_solutions` a partir de esos mismos retos (las soluciones no tienen tabla de unión propia por nivel — heredan territorio/tema del reto).
- **"Alrededores" de una métrica**: `getStationsNearTerritory()` en `server.ts` devuelve las estaciones del territorio más las que estén dentro de un radio (150 km por defecto) de su centro, usando `ST_DWithin`/`ST_Distance` sobre las coordenadas de `seedTerritories` (¡no `territories.centroid`, que está vacía! — ver `02_DATABASE.md`).
- **Frontend**: un único componente `src/components/explorer/EntityExplorerPanel.tsx` renderiza los 4 niveles a partir de la misma forma de respuesta (breadcrumb + info general + datos del territorio + hijos clicables). `src/pages/Map.tsx` centraliza la navegación: `navigateExplorer(level, id)` resuelve toda la cadena de ancestros (a partir de las listas ya cargadas de indicadores/marcadores/métricas, sin llamada extra al backend) y actualiza tanto los 4 estados `activeObjective/activeIndicatorId/activeMarkerId/activeMetricId` (que ya gobernaban el coloreado del mapa) como la URL.
- **Escalabilidad**: añadir un 5º nivel futuro (p. ej. un nuevo objetivo con datos propios) solo requiere una rama más en el endpoint y ningún cambio en el componente ni en el esquema de URL.

### Esquema de URL de `/mapa`

```
/mapa?territorio=<slug-del-nombre-del-territorio>&nivel=<objetivo|indicador|marcador|metrica>&id=<id-de-la-entidad>
```

- `territorio` usa el **nombre** del territorio slugificado (p. ej. `aragon`, `espana`, `mundo`), no su id interno `T0XX` — decisión explícita del usuario para que la URL sea legible y compartible. Se resuelve contra la lista de territorios de `DataContext` con `slugify(t.name) === param`.
- Solo se guarda el nivel más profundo activo (`nivel`+`id`); los niveles superiores se derivan en el cliente. Los clics del menú, del breadcrumb y de los "hijos" del panel central usan `push` (no `replace`), así que el botón atrás/adelante del navegador deshace la navegación por el árbol paso a paso.
- Si no hay `territorio` en la URL al entrar, se pide `GET /api/geo/locate` (geolocalización por IP, `geoip-lite`, sin llamadas de red externas) para elegir un territorio por defecto, con reserva en el territorio de tipo `planet` ("Mundo") si no se puede determinar — ver decisión en `03_DECISIONS.md`.

## Diseño visual del mapa por nivel de zoom

- **Zoom bajo (vista "planeta")**: capa raster de satélite (`mapbox://mapbox.satellite`, minzoom 0, maxzoom `PLANET_MAX_ZOOM = 2.0`), continentes con relleno semitransparente (opacity 0.35) y **sin líneas divisorias internas** (las piezas de `continents.json` comparten `territoryId` pero son ~90 polígonos por país; no se dibuja `continents-line` para evitar fronteras falsas). Las capas `admin-*` del propio estilo base de Mapbox se empujan a `minzoom 3.5` vía `setLayerZoomRange` por el mismo motivo.
- **Zoom alto**: capas `countries-fill/line` y `regions-fill/line` con fronteras reales, marcadores DOM por territorio (punto + nombre + score) y, cuando hay un marcador activo de tipo métrica, marcadores DOM de estaciones de medición (icono gota+lupa + etiqueta de nivel de riesgo coloreada).
