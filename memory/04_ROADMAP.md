# 04 — Roadmap

> Estado a fecha 2026-08-02. Actualizar esta fecha y las secciones correspondientes cada vez que cambie el estado de una tarea.

## Terminado

- ✅ Entorno de desarrollo local completo (Postgres 17 + PostGIS, `gh` CLI, `.env`).
- ✅ Repositorio GitHub creado y sincronizado (`eugeniogarcia30-cmd/plataforma-evolucion-humanidad`, privado).
- ✅ Corrección de seguridad crítica: clave secreta de Stripe hardcodeada eliminada.
- ✅ Corrección de 13 violaciones de Rules of Hooks.
- ✅ Token de Mapbox configurado.
- ✅ Modelo de datos jerárquico completo: `objectives` → `indicators` (41) → `markers` (7, bajo Calidad/Agua) → `metrics` (8, bajo Pureza) → `measurement_stations` (15) → `metric_observations` (120).
- ✅ Datos reales de indicadores para Agua, Alimentación, Vivienda, Convivencia y Ecosistemas (España + comunidades autónomas donde hay dato).
- ✅ Datos reales de marcador "Pureza" para 17 comunidades autónomas.
- ✅ Datos reales de 15 estaciones de medición de ríos españoles + 120 lecturas de métricas de contaminantes.
- ✅ Filtro en cascada de mapa de 4 niveles (Objetivo→Indicador→Marcador→Métrica), con estado "Sin datos" explícito en cada nivel.
- ✅ Porcentaje de objetivo (medio o filtrado) bajo el nombre del territorio en el mapa.
- ✅ Tooltip contextual del mapa: desglose de indicadores en vez de los 6 objetivos fijos, cuando hay un objetivo seleccionado.
- ✅ Énfasis visual del filtro activo (texto más grande, resto al 50% de opacidad).
- ✅ Vista "planeta" satélite en zoom bajo + continentes sin fronteras internas falsas (mejora nº 3 de `MEJORAS_PENDIENTES.md`).
- ✅ Icono droplet+lupa y etiqueta de nivel de riesgo (Bajo/Moderado/Alto/Peligroso) para estaciones de medición.
- ✅ Eliminación de la marca de agua/atribución de Mapbox (con riesgo contractual aceptado explícitamente por el usuario — ver `03_DECISIONS.md`).
- ✅ Rediseño del mapa a layout de 3 columnas (filtros en acordeón / panel de territorio permanente / mapa).
- ✅ Sistema de documentación viva `/memory` (este conjunto de archivos).
- ✅ Páginas de entidad ligadas a territorio para todo el menú de filtros (Objetivo→Indicador→Marcador→Métrica): endpoint único `/api/explorer/:level/:id`, componente único `EntityExplorerPanel`, navegación reflejada en la URL (`?territorio=<slug>&nivel=&id=`), territorio por defecto vía geolocalización IP con reserva en "Mundo" (`/api/geo/locate`), "alrededores" de una métrica por radio de distancia (150 km) desde el centro del territorio.
- ✅ Menú de filtros colapsable estilo Codex/VS Code (rail de 56px + flyout en hover), 20% más estrecho, con default responsive (colapsado en móvil, abierto en tablet/escritorio) y botón de colapsar/expandir con estilo llamativo.

## En desarrollo / pendiente inmediato

- 🔲 **Ítem 4 de `MEJORAS_PENDIENTES.md`** (pendiente, añadido por el usuario directamente en GitHub, aún sin implementar): hacer que las 3 columnas principales del mapa sean redimensionables por el usuario, al estilo de los paneles de la UI de Claude Code.
- 🔲 Rediseño responsive completo de `/mapa` para móvil: hoy solo el menú de filtros está preparado para móvil (colapsa por defecto); las columnas 2 (panel de territorio) y 3 (mapa) siguen apretadas en viewports estrechos.

## Falta por hacer (no iniciado, sin fecha)

- 🔲 Tabla `objective_observations` con datos reales de objetivo por territorio (hoy son datos mock en memoria, ver `02_DATABASE.md`).
- 🔲 Ampliar marcadores/métricas a indicadores fuera de "Calidad" del agua (hoy solo existe esa rama del árbol con 3º y 4º nivel poblado).
- 🔲 Ampliar territorios más allá de España (comunidades autónomas) — el modelo ya soporta cualquier país/región, falta cargar geometría y datos.
- 🔲 Consolidar los 7 scripts `seed-*.ts` en un único comando `npm run seed` (hoy se ejecutan manualmente uno a uno).
- 🔲 Confirmar y documentar el despliegue en producción (Cloud SQL, hosting del frontend/backend) — hoy solo está probado el entorno local.
- 🔲 Revisar la decisión de eliminar la atribución de Mapbox si el proyecto pasa a producción pública (riesgo contractual activo, ver `03_DECISIONS.md`).
- 🔲 Flujo de membresía Stripe: probado a nivel de código, no confirmado end-to-end con claves de producción reales.
- 🔲 Tabla `users` está vacía (0 filas) — no hay autenticación de usuarios reales probada en este entorno.

## Prioridades sugeridas (a validar con el usuario en cada sesión, no asumir sin confirmar)

1. **Alta**: implementar el ítem 4 de `MEJORAS_PENDIENTES.md` (columnas redimensionables), por ser la única mejora pendiente explícitamente registrada por el usuario.
2. **Media**: seguir ampliando datos reales de marcadores/métricas a otros indicadores además de Calidad del Agua, para que el filtro de 3º/4º nivel deje de ser una única rama del árbol.
3. **Media**: consolidar el proceso de seeding.
4. **Baja / a decidir con el usuario**: expansión territorial fuera de España, despliegue en producción, revisión de la atribución de Mapbox.
