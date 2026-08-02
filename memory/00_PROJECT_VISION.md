# 00 — Visión del Proyecto

> Este archivo es la brújula del proyecto. Cualquier IA o persona que trabaje aquí debe leerlo antes de tomar decisiones que afecten el propósito del producto.

## Qué es Red Humana

**Red Humana** (nombre técnico del repositorio: `plataforma-evolucion-humanidad`) es una plataforma web que **mapea los grandes retos sistémicos de la humanidad por territorio**, mostrando de forma visual e interactiva cómo de cerca o lejos está cada territorio (planeta → continente → país → región/comunidad autónoma) de resolverlos.

La plataforma parte de un modelo científico jerárquico de 4 niveles:

```
Objetivo (6, fijos)
  └── Indicador (41, ampliable)
        └── Marcador (ampliable, sub-componentes de un indicador)
              └── Métrica (ampliable, variables físicas medibles en campo)
```

Cada nivel tiene una puntuación (0–100) por territorio, calculada a partir de datos reales cuando existen, y con un estado explícito de "Sin datos" cuando no existen — nunca se inventan puntuaciones.

## Qué pretende conseguir

- Dar una **fotografía honesta y visual** del estado de la humanidad frente a sus grandes retos (agua, alimentación, vivienda, convivencia, ecosistemas, y los que se añadan).
- Permitir **bajar de nivel de abstracción progresivamente**: de "cómo está el mundo" a "cómo está España" a "cómo está Aragón en el marcador Pureza del agua" a "qué dice la estación de medición del río Ebro sobre nitratos".
- Ser una base de datos **viva y creciente**: hoy hay datos reales solo para agua/pureza en España, pero el sistema está diseñado para admitir cualquier objetivo/indicador/marcador/métrica en cualquier territorio del mundo sin cambios estructurales.
- Financiarse mediante membresías (Stripe) para sostener el mantenimiento y expansión de los datos.

## Qué problemas resuelve

- **Fragmentación de datos**: hoy los datos sobre calidad del agua, retos alimentarios, vivienda, etc. están dispersos en informes, PDFs y organismos distintos. Red Humana los normaliza en un único modelo consultable.
- **Falta de granularidad territorial**: la mayoría de paneles globales muestran el dato a nivel país; Red Humana permite bajar hasta la estación de medición física.
- **Falta de trazabilidad**: cada dato debe llevar fuente y fecha de última actualización (ver `marker_observations`, `metric_observations`, tabla `measurement_stations`).

## Cómo está estructurada (resumen — detalle en `01_ARCHITECTURE.md` y `02_DATABASE.md`)

- **Frontend**: React 19 + TypeScript + Vite, mapa interactivo con Mapbox GL JS.
- **Backend**: Express (API REST) + Drizzle ORM sobre PostgreSQL/PostGIS.
- **Modelo de datos**: 4 niveles jerárquicos (Objetivo/Indicador/Marcador/Métrica) + territorios + entidades de contenido editorial (retos, causas, soluciones, proyectos, organizaciones).
- **Interfaz de mapa**: filtro en cascada de 4 niveles + vista "planeta" (satélite) al alejar el zoom, y vista territorial (continentes/países/regiones) al acercar.

## Filosofía y principios de diseño

1. **Nunca fabricar datos.** Si no hay dato real para un territorio en un nivel, se muestra "Sin datos" (color gris `#cbd5e1`), nunca una puntuación inventada ni heredada silenciosamente de un nivel superior.
2. **Trazabilidad ante todo.** Todo dato de marcador/métrica debe poder responder: ¿de dónde sale?, ¿cuándo se tomó?, ¿qué peso tiene en el cálculo del nivel superior?
3. **Estructura antes que datos.** Cuando hay que elegir entre esperar a tener todos los datos reales o construir la estructura y filtros primero, se prioriza construir la estructura (decisión explícita del usuario, ver `03_DECISIONS.md`), dejando el sistema listo para recibir datos progresivamente.
4. **Identificar por `id`, nunca por `name`.** Nombres de indicadores/marcadores/métricas se repiten entre objetivos distintos (p. ej. "Calidad", "Acceso", "Seguridad"); toda lógica de routing, iconografía y filtrado usa el `id` único, nunca el nombre.
5. **Terminología en español** en todo el dominio (Objetivos, Indicadores, Marcadores, Métricas, Territorios) — es un producto para el público hispanohablante y el modelo de datos usa esos mismos términos como nombres de concepto, aunque el código (tablas, variables) esté en inglés.
6. **Diseño progresivo por capas de zoom**: la experiencia de mapa cambia de "planeta visto desde el espacio" a "territorio con fronteras reales" según el nivel de zoom, sin fronteras falsas entre piezas de un mismo continente.
7. **Multi-IA por diseño.** El proyecto está pensado para ser desarrollado a lo largo de años por distintas sesiones de asistentes de IA que no comparten memoria entre sí. La carpeta `/memory` (este mismo archivo incluido) es el mecanismo que sustituye a esa memoria compartida — ver `07_AI_CONTEXT.md` y las normas al final de ese archivo.

## Qué nunca debe perder el proyecto

- La **honestidad de los datos** (principio "nunca fabricar datos").
- La **trazabilidad** (fuente + fecha en cada dato de marcador/métrica).
- La **estructura jerárquica de 4 niveles** como columna vertebral del modelo — cualquier ampliación de dominio (nuevo objetivo, nuevo país) debe encajar en ella, no crear un modelo paralelo.
- La **documentación viva en `/memory`** — ver reglas obligatorias en `07_AI_CONTEXT.md` y `08_CHANGELOG.md`.
- El histórico de decisiones en `03_DECISIONS.md`, que no se borra nunca.
