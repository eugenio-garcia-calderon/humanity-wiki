# 06 — Modelo Científico: Objetivos, Indicadores, Marcadores y Métricas

Este documento explica el **modelo de puntuación** de Red Humana — el "cómo se calcula" que complementa al "qué existe" de `02_DATABASE.md`.

## Los 4 niveles

```
Objetivo  (0-100, 6 fijos)
   │  score = media ponderada de sus Indicadores (weight de cada indicador)
   ▼
Indicador (0-100, 41 actualmente)
   │  score = calculado a partir de indicator_observations.value según methodology/direction
   ▼
Marcador  (0-100, 7 actualmente — solo bajo "Calidad" de Agua)
   │  score = sub-componente ponderado (weight) dentro del cálculo de su indicador
   ▼
Métrica   (nivel de riesgo discreto, no 0-100 — 8 actualmente, bajo "Pureza")
          nivel = bajo | moderado | alto | peligroso, según el valor medido en una estación física
```

## Objetivos (6, fijos)

Los grandes retos sistémicos que la plataforma mapea. Hoy confirmados en el modelo: **Agua**, **Alimentación**, **Vivienda**, **Convivencia**, **Ecosistemas**, + 1 adicional (ver tabla `objectives` para el listado completo y actualizado — este documento no repite los 6 nombres exactos para no quedar desactualizado si cambian; consultar `SELECT * FROM objectives` o `GET /api/data/objectives`).

Cada objetivo tiene un `id` estable (`O001`...) mapeado en `src/utils/objectiveIds.ts` (`OBJECTIVE_ID_BY_KEY`, clave textual en minúsculas → id).

**Cálculo de puntuación de objetivo (estado actual)**: hoy es un **cálculo mock en memoria** (`getObjectivesForTerritory` en `server.ts`, a partir de `seedObjectives`), no proviene de observaciones reales por territorio. Es la próxima pieza de deuda de modelo a resolver — ver `04_ROADMAP.md`.

## Indicadores (41)

Cada indicador pertenece a un objetivo (`objective_id`) y tiene:
- `unit`: unidad de medida.
- `category`: agrupación dentro del objetivo.
- `direction`: `higher_is_better` o `lower_is_better` — determina si un valor más alto puntúa mejor o peor.
- `weight`: peso (0–1) del indicador en la puntuación del objetivo al que pertenece.
- `methodology`: texto que documenta cómo se traduce el `value` bruto a un `score` 0–100.

La puntuación real por territorio vive en `indicator_observations` (`value`, `raw_value`, `score`, `weighted_score`, `date`, `source`, `source_url`). El endpoint de listado `/api/data/indicators` filtra por un territorio de referencia (por defecto España, `T003`) para evitar duplicados — ver decisión en `03_DECISIONS.md`. Los desgloses reales por territorio para colorear el mapa vienen de `getIndicatorScoresByTerritory()` en `server.ts`, embebidos como `indicatorScores` en las respuestas de `/api/geo/territories/polygons` y `/centroids`.

## Marcadores (7 actualmente, todos bajo el indicador "Calidad" del Agua)

Un marcador es un **sub-componente del cálculo de un indicador** — la variable concreta que se mide para poder calcular ese indicador. Ejemplo actual completo (indicador "Calidad" del objetivo Agua):

| Marcador | Qué mide (resumen) |
|---|---|
| Oxigenación | Nivel de oxígeno disuelto |
| Nutrientes | Nitrógeno/fósforo en el agua |
| Fisicoquímica | pH, turbidez, conductividad, etc. |
| **Pureza** (antes "Toxicidad") | Presencia de contaminantes tóxicos — ver renombrado en `03_DECISIONS.md` |
| Microbiología | Presencia de patógenos/bacterias |
| Biodiversidad | Estado del ecosistema acuático asociado |
| Residuos | Presencia de residuos sólidos/plásticos |

Cada marcador (tabla `markers`) documenta: `name` (variable), `includes` (qué mide en concreto, texto libre), `description`, `unit`, `weight` (peso recomendado 0–1 dentro del cálculo del indicador padre), `source`, `last_updated` (fecha de la última toma de datos).

**Dato real disponible hoy**: solo el marcador "Pureza" tiene observaciones reales por territorio (`marker_observations`, 17 comunidades autónomas de España). Los otros 6 marcadores existen en el modelo (estructura lista) pero sin observaciones — se mostrarán como "Sin datos" en el filtro de mapa hasta que se carguen.

## Métricas (8 actualmente, todas bajo el marcador "Pureza")

Una métrica es un **contaminante o variable física concreta** dentro de un marcador — el nivel más granular del modelo, medido en una **estación física** en vez de directamente por territorio.

| Métrica | Icono (`src/utils/metricIcons.ts`) |
|---|---|
| Mercurio | Thermometer |
| Plomo | Weight |
| Cadmio | Battery |
| Nitratos | Sprout |
| Fosfatos | FlaskConical |
| Glifosato | Leaf |
| PFAS | Atom |
| Pesticidas | Bug |

A diferencia de objetivo/indicador/marcador (escala continua 0–100), las métricas usan una **escala discreta de riesgo de 4 niveles**, definida en `src/utils/metricIcons.ts` (`LEVEL_COLORS`/`LEVEL_LABELS`):

| Nivel | Color | Hex |
|---|---|---|
| Bajo | verde | `#22c55e` |
| Moderado | amarillo | `#facc15` |
| Alto | naranja | `#f97316` |
| Peligroso | rojo | `#dc2626` |

## Estaciones de medición

Cada métrica se mide en **estaciones físicas georreferenciadas** (`measurement_stations`: `lat`/`lng`, asociadas a un `territory_id`). Hoy hay 15 estaciones reales de monitorización de ríos españoles (fuente: PDF "Resumen ejecutivo" aportado por el usuario). Cada lectura (`metric_observations`) vincula una `metric_id` con una `station_id` y registra `value`, `unit`, `level`, `date`, `source` — 120 lecturas actuales.

En el mapa, al seleccionar una métrica (4º nivel del filtro en cascada), se renderizan marcadores DOM por cada estación con un icono de gota+lupa y una etiqueta de texto coloreada según el nivel de riesgo (`HumanityMap.tsx`, efecto keyeado en `activeMetricId`).

## Fuentes de datos incorporadas hasta ahora

- Tabla de indicadores de pureza del agua por comunidad autónoma (aportada directamente por el usuario en chat).
- Tabla de los 7 marcadores de calidad del agua con su descripción/peso/fuente/fecha (aportada por el usuario vía captura de pantalla).
- Tabla de los 8 contaminantes/métricas + PDF "Resumen ejecutivo (1).pdf" con 15 estaciones reales de monitorización de ríos españoles y sus coordenadas.

## Cómo añadir un nuevo nivel de datos (guía práctica)

1. Si es un **indicador** nuevo bajo un objetivo existente: insertar en `indicators` con su `objective_id`, `weight`, `direction`, `methodology`; añadir observaciones en `indicator_observations` por territorio.
2. Si es un **marcador** nuevo bajo un indicador existente: insertar en `markers` con `indicator_id`, `weight`, `unit`, `source`, `last_updated`; añadir `MARKER_ICONS[id]` en `src/utils/markerIcons.ts`; añadir observaciones en `marker_observations` cuando haya dato real (si no, queda como "Sin datos", que es un estado válido — ver decisión en `03_DECISIONS.md`).
3. Si es una **métrica** nueva bajo un marcador existente: insertar en `metrics` con `marker_id`; añadir `METRIC_ICONS[id]` en `src/utils/metricIcons.ts`; si hay estaciones físicas nuevas, insertarlas en `measurement_stations`; añadir lecturas en `metric_observations` con su `level` correspondiente.
4. En todos los casos, identificar la entidad por su `id` en cualquier icono/ruta/filtro nuevo — nunca por `name` (ver `05_STYLE_GUIDE.md`).
