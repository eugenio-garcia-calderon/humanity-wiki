# 07 — Contexto Rápido para IA (lectura en menos de 5 minutos)

> **Este archivo debe mantenerse siempre actualizado.** Si haces un cambio importante y este archivo queda desactualizado, actualízalo en el mismo turno de trabajo, no lo dejes para después.

## Qué es esto

**Red Humana**: plataforma que mapea los grandes retos sistémicos de la humanidad (agua, alimentación, vivienda, convivencia, ecosistemas...) por territorio, con un modelo de datos jerárquico de 4 niveles: **Objetivo → Indicador → Marcador → Métrica**, cada uno con puntuación real por territorio (o "Sin datos" explícito — nunca inventado). Detalle completo en `00_PROJECT_VISION.md`.

## Stack técnico en una frase por capa

- **Frontend**: React 19 + TypeScript + Vite + React Router 7 + Tailwind CSS 4 + Mapbox GL JS.
- **Backend**: Express (`server.ts`) sirviendo API REST + Vite middleware (dev) / estático (prod).
- **DB**: PostgreSQL 17 + PostGIS 3.6, vía Drizzle ORM (`src/db/schema.ts`).
- **Pagos**: Stripe (checkout + webhooks + membresías).
- **Repo**: GitHub `eugeniogarcia30-cmd/plataforma-evolucion-humanidad` (privado).

Detalle completo: `01_ARCHITECTURE.md`. Esquema completo de tablas: `02_DATABASE.md`. Modelo científico completo: `06_INDICATORS.md`.

## Decisiones que NUNCA debes revertir sin saber por qué (ver `03_DECISIONS.md` completo)

1. **No hardcodear secretos** (había una clave Stripe live hardcodeada, se eliminó por seguridad).
2. **`drizzle-kit push` está prohibido** en este entorno — se cuelga. Usar `generate` + `psql -f` manual.
3. **Identificar indicadores/marcadores/métricas por `id`, nunca por `name`** — los nombres se repiten entre objetivos.
4. **Nunca fabricar puntuaciones** — territorio sin dato real = "Sin datos" (gris `#cbd5e1`), nunca un valor heredado o inventado.
5. La atribución de Mapbox fue eliminada del mapa **a sabiendas de que incumple sus Términos de Servicio** — decisión consciente del usuario, no un descuido; riesgo activo si el proyecto se hace público.

## Estado actual (resumen — detalle en `04_ROADMAP.md`)

Terminado: modelo de 4 niveles con datos reales de agua/pureza para España + comunidades autónomas, filtro en cascada de mapa de 4 niveles, layout de mapa en 3 columnas (filtros/panel de territorio permanente/mapa), sistema `/memory`, páginas de entidad ligadas a territorio para todo el menú de filtros (endpoint único `/api/explorer/:level/:id` + componente único `EntityExplorerPanel`, navegación reflejada en la URL, territorio por defecto vía geolocalización IP).

Pendiente inmediato conocido: hacer las 3 columnas del mapa redimensionables por el usuario (ítem 4 de `MEJORAS_PENDIENTES.md`, añadido por el usuario directamente en GitHub).

**Trampa a recordar**: `territories.centroid` (PostGIS) está vacía en toda la tabla — el centro real de cada territorio viene de `seedTerritories` en `src/data/seed.ts`. Ver `02_DATABASE.md`.

## Filosofía (detalle en `00_PROJECT_VISION.md`)

Honestidad de los datos > completitud. Trazabilidad (fuente + fecha) en todo dato de marcador/métrica. Estructura antes que datos cuando hay que elegir. Español como idioma del dominio de producto.

## Reglas de trabajo obligatorias para cualquier IA en este proyecto

1. **Leer `/memory` completo antes de cualquier tarea importante.**
2. **Actualizar los archivos de `/memory` que correspondan** cada vez que se modifique código importante (nueva tabla → `02_DATABASE.md`; nueva decisión de arquitectura/producto → `03_DECISIONS.md`; cambio de estado de una tarea → `04_ROADMAP.md`; cualquier cambio → una línea en `08_CHANGELOG.md`).
3. **La documentación es parte del proyecto** — un cambio de código sin su documentación correspondiente no está terminado.
4. **`03_DECISIONS.md` y `08_CHANGELOG.md` son de solo-añadir** — nunca borrar una entrada existente, solo añadir nuevas (incluso para revertir o corregir algo anterior).
5. **Este archivo (`07_AI_CONTEXT.md`) debe reflejar siempre el estado real** — si describe algo que ya no es cierto, corregirlo en el mismo turno.

## Por dónde seguir ahora mismo

Ver la sección "En desarrollo / pendiente inmediato" de `04_ROADMAP.md`. A fecha de la última actualización de este archivo, la única mejora pendiente explícitamente registrada por el usuario es el ítem 4 de `MEJORAS_PENDIENTES.md` (columnas redimensionables en el mapa).
