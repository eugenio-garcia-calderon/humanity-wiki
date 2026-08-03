# 02 — Base de Datos

Fuente de verdad del esquema: [`src/db/schema.ts`](../src/db/schema.ts) (Drizzle ORM). Este documento explica **qué significa** cada tabla y cómo se relacionan; para tipos exactos de columna, leer siempre el propio `schema.ts` porque puede evolucionar.

Motor: **PostgreSQL 17 + PostGIS 3.6**. Migraciones versionadas en `drizzle/000X_*.sql`, generadas con `drizzle-kit generate` (nunca `drizzle-kit push`, ver `05_STYLE_GUIDE.md`).

## Jerarquía científica (columna vertebral del modelo)

```
objectives (14: Agua, Alimentación, Vivienda, Salud, Convivencia, Ecosistemas,
            Educación, Movilidad, Energía, Tecnología, Empleo, Gobernanza,
            Economía, Cultura)
  └─▶ indicators (41 de los 6 originales + 56 de los 8 nuevos = 97 actualmente) ── objective_id
        └─▶ markers (7 actualmente, solo bajo el indicador "Calidad" de Agua) ── indicator_id
              └─▶ metrics (8 actualmente, solo bajo el marcador "Pureza") ── marker_id
                    └─▶ measurement_stations (15, estaciones físicas georreferenciadas) ── territory_id
                          └─▶ metric_observations (120 filas) ── metric_id + station_id
```

Cada nivel de la jerarquía tiene su propia tabla de "observación por territorio", excepto métricas que se miden por **estación física** en vez de por territorio directamente:

| Nivel | Tabla de definición | Tabla de observación | Clave de observación |
|---|---|---|---|
| Objetivo | `objectives` | *(calculado en memoria en server.ts, no persistido — ver nota)* | — |
| Indicador | `indicators` | `indicator_observations` | `indicator_id` + `territory_id` |
| Marcador | `markers` | `marker_observations` | `marker_id` + `territory_id` |
| Métrica | `metrics` | `metric_observations` | `metric_id` + `station_id` |

> **Nota importante**: las puntuaciones de **objetivo** que se muestran hoy (`getObjectivesForTerritory` en `server.ts`) son datos mock generados en memoria a partir de `seedObjectives`, **no** provienen de una tabla de observaciones real. Si en el futuro se añaden datos reales de objetivo por territorio, considerar crear una tabla `objective_observations` siguiendo el mismo patrón que las otras tres.

## Tablas de dominio científico

### `territories`
Territorio de cualquier tipo (`type`): planeta, continente, país, región/comunidad autónoma. Auto-referenciada vía `parent_id` (jerarquía geográfica, no confundir con la jerarquía de objetivos). Incluye geometría PostGIS (`geometry` multipolígono, `centroid` punto) para renderizado en mapa y consultas espaciales (`ST_AsMVT`, `/api/geo/near`).

> **Trampa conocida:** la columna `centroid` **existe en el esquema pero está vacía (`NULL`) para las 33 filas actuales** (comprobado el 2026-08-03). El centro real de cada territorio que usa el resto de la app viene de `seedTerritories` en `src/data/seed.ts` (campo `coordinates: [lng, lat]`), no de esta columna. Cualquier función nueva que necesite el centro de un territorio (distancias, "alrededores", etc.) debe leer `seedTerritories`, no `territories.centroid` — ver decisión del 2026-08-03 en `03_DECISIONS.md`.

### `objectives`
14 grandes retos (id, title, description): los 6 originales (Agua O001…Ecosistemas O006) más 8 añadidos el 2026-08-03 (Educación O007, Movilidad O008, Energía O009, Tecnología O010, Empleo O011, Gobernanza O012, Economía O013, Cultura O014). Ampliarlos sigue siendo una decisión de producto, no solo técnica (ver `03_DECISIONS.md`) — pero ya no es una decisión "grande" a nivel de arquitectura: el `id`↔`key` se registra en `src/utils/objectiveIds.ts` y todo lo demás (tipos, coloración del mapa, cálculo de "overall") se deriva de esa lista, no hay que tocar una estructura fija por cada objetivo nuevo.

### `indicators`
97 indicadores agrupados bajo un objetivo (`objective_id`): 41 de los 6 objetivos originales (con datos reales para Agua en España) + 56 de los 8 objetivos nuevos (8 objetivos × 7 indicadores idénticos: Accesibilidad, Coste, Soberanía, Eficiencia, Calidad, Sostenibilidad, Innovación — sembrados por `src/db/seed-new-objectives.ts`, **sin observaciones todavía**, por lo que se muestran como "Sin datos" en toda la app hasta que se cargue un dato real). Campos clave: `unit`, `category`, `direction` (`higher_is_better`/`lower_is_better` — para los 7 nuevos, `Coste` es `lower_is_better` y el resto `higher_is_better`), `weight` (peso 0–1 en la puntuación del objetivo — los 7 nuevos usan peso igual `1/7≈0.143` al no haber datos reales de los que derivar una ponderación mejor), `methodology` (texto explicando el cálculo, o una nota de "sin datos reales todavía" para los nuevos).

### `indicator_observations`
Valor real de un indicador para un territorio concreto: `value`, `raw_value` (texto descriptivo libre), `score` (0–100), `weighted_score`, `date`, `source`, `source_url`. 58 filas actuales (España + comunidades autónomas, dominio Agua ampliado a Alimentación/Vivienda/Convivencia/Ecosistemas).

### `markers`
Sub-componentes que desglosan el cálculo de un indicador (`indicator_id`). Ejemplo actual: 7 marcadores bajo "Calidad" del agua — Oxigenación, Nutrientes, Fisicoquímica, Pureza (antes "Toxicidad", renombrado — ver `03_DECISIONS.md`), Microbiología, Biodiversidad, Residuos. Campos: `name` (variable), `includes` (qué mide en concreto), `description`, `unit`, `weight` (peso recomendado 0–1 dentro del indicador), `source`, `last_updated` (fecha de última toma de datos).

### `marker_observations`
Valor de un marcador para un territorio. 17 filas actuales: datos reales de "Pureza" para 17 comunidades autónomas de España. Estructura idéntica en espíritu a `indicator_observations` (`value`, `raw_value`, `score`, `date`, `source`).

### `metrics`
Contaminante o variable física concreta dentro de un marcador (`marker_id`). 8 filas actuales, todas bajo el marcador "Pureza": Mercurio, Plomo, Cadmio, Nitratos, Fosfatos, Glifosato, PFAS, Pesticidas.

### `measurement_stations`
Estación de medición física georreferenciada (`lat`/`lng`), asociada a un territorio (`territory_id`). 15 estaciones reales de monitorización de ríos españoles (fuente: PDF "Resumen ejecutivo" aportado por el usuario).

### `metric_observations`
Lectura de una métrica en una estación concreta: `value`, `unit`, `level` (`bajo`/`moderado`/`alto`/`peligroso` — escala discreta de riesgo, distinta de la escala continua 0–100 de indicador/marcador), `date`, `source`. 120 filas actuales.

## Tablas editoriales / de contenido

- **`challenges`** (retos): `scope` (`global`/`national`/`regional`/`municipal`), `priority` (`critical`/`high`/`medium`/`low`).
- **`causes`** (causas raíz de un reto).
- **`solutions`** (soluciones propuestas): `impact`, `cost`, `readiness`.
- **`organizations`**: entidades que trabajan en algún objetivo/solución, opcionalmente ancladas a un `territory_id`.
- **`projects`**: iniciativas concretas, opcionalmente ancladas a un `territory_id`, con `status`.
- **`content`**: contenido editorial genérico (artículos/recursos externos) con `url`.

### Tablas puente muchos-a-muchos
Todas con clave primaria compuesta (`primaryKey({ columns: [...] })`), sin columna `id` propia:

| Tabla | Relaciona |
|---|---|
| `challenge_territories` | reto ↔ territorio |
| `challenge_objectives` | reto ↔ objetivo |
| `challenge_indicators` | reto ↔ indicador (añadida 2026-08-03, mismo patrón que `challenge_objectives` pero un nivel más profundo) |
| `challenge_markers` | reto ↔ marcador (2026-08-03) |
| `challenge_metrics` | reto ↔ métrica (2026-08-03) |
| `challenge_causes` | reto ↔ causa, con `percentage` (0-100, añadido 2026-08-03): peso de esa causa dentro de ESE reto, para el gráfico de anillo del explorador — es propiedad de la relación, no de la causa (la misma causa puede pesar distinto en retos distintos) |
| `challenge_solutions` | reto ↔ solución |
| `solution_causes` | solución ↔ causa |
| `project_challenges` | proyecto ↔ reto |
| `project_solutions` | proyecto ↔ solución |
| `project_objectives` | proyecto ↔ objetivo |
| `project_organizations` | proyecto ↔ organización |
| `organization_objectives` | organización ↔ objetivo |
| `organization_solutions` | organización ↔ solución |

## Tablas de cuenta / membresía (Stripe)

- **`users`**: `email` único, `role` (default `user`).
- **`memberships`**: vincula `user_id` con identificadores de Stripe (`stripe_customer_id`, `stripe_checkout_session_id`, `stripe_subscription_id`), `status`, `membership_type` (default `socio_regular`), fechas de inicio/fin.
- **`stripe_events`**: registro idempotente de eventos de webhook procesados (`stripe_event_id` único) para evitar procesar el mismo evento dos veces.

## Recuento de filas actual (auditado el 2026-08-02)

| Tabla | Filas |
|---|---|
| territories | 33 |
| objectives | 6 |
| challenges | 20 |
| causes | 5 |
| solutions | 60 |
| indicators | 41 |
| indicator_observations | 58 |
| markers | 7 |
| marker_observations | 17 |
| metrics | 8 |
| measurement_stations | 15 |
| metric_observations | 120 |
| organizations | 21 |
| projects | 19 |
| users | 0 |

## Cómo crecerá en el futuro

- **Más países/regiones**: añadir filas en `territories` con `parent_id` apuntando al continente/país correspondiente y su `geometry`/`centroid`; el resto del modelo (indicadores, marcadores, métricas) ya está preparado para cualquier `territory_id`.
- **Más indicadores/marcadores/métricas**: son tablas abiertas, no hay límite fijado; solo hay que decidir el `weight` y la `methodology`/`description` con cuidado, ya que alimentan el cálculo de puntuación del nivel superior.
- **Objetivo real por territorio**: cuando se disponga de datos reales de objetivo (no mock), crear `objective_observations` siguiendo el patrón de `indicator_observations`.
- **Nuevos dominios de contaminantes/estaciones**: replicar el patrón Marcador→Métrica→Estación→Observación usado en Agua/Pureza para cualquier otro indicador que lo necesite (no es exclusivo del agua).
- **Semillas**: los 7 scripts en `src/db/seed-*.ts` son idempotentes (`DELETE ... WHERE id IN (...)` antes de `INSERT`) pero se ejecutan manualmente uno a uno; si el número de seeds sigue creciendo, valorar consolidarlos en un único `npm run seed`.
