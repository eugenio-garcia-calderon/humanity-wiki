# 05 — Guía de Estilo y Normas de Desarrollo

## Arquitectura y patrones establecidos

- **Identificar entidades por `id`, nunca por `name`.** Nombres de indicador/marcador/métrica se repiten entre objetivos distintos. Cualquier mapa de iconos, color o ruta debe usar el `id` único como clave (`INDICATOR_ICONS`, `MARKER_ICONS`, `METRIC_ICONS` en `src/utils/`). Ver decisión completa en `03_DECISIONS.md`.
- **Nunca fabricar puntuaciones.** Si un territorio no tiene observación real en el nivel de filtro activo, se muestra `NO_DATA_COLOR` (`#cbd5e1`) y la etiqueta "Sin datos" — nunca se hereda silenciosamente la puntuación de un nivel superior ni se interpola un valor.
- **Migraciones de esquema**: editar `src/db/schema.ts` → `npx drizzle-kit generate` → aplicar manualmente con `psql -f drizzle/000X_nombre.sql`. **Nunca ejecutar `drizzle-kit push`** (se queda colgado en este entorno no interactivo).
- **Seeds idempotentes**: cada script `src/db/seed-*.ts` debe hacer `DELETE ... WHERE id IN (...)` de sus propias filas antes de volver a insertarlas, para poder re-ejecutarse sin duplicar datos.
- **Filtros en cascada**: cada nivel de filtro (Objetivo→Indicador→Marcador→Métrica) debe resetear los niveles más profundos al cambiar (patrón `handleXChange` en `src/pages/Map.tsx`).
- **Terminología del dominio en español** (Objetivo, Indicador, Marcador, Métrica, Territorio) en UI, nombres de variable de React y documentación, aunque los nombres de tabla/columna en la base de datos estén en inglés (convención de Drizzle/SQL).

## Convenciones de nombres

- Tablas y columnas SQL: `snake_case` (convención de Drizzle/Postgres).
- Variables/props de TypeScript: `camelCase`.
- Componentes React: `PascalCase`, un componente por archivo, nombre de archivo = nombre de componente.
- IDs de entidades de dominio: prefijo legible + código corto (p. ej. `T003` para España, `O00X` para objetivos, `METRIC_PUREZA_MERCURIO` para métricas) — mantener el patrón existente al añadir entidades nuevas, no inventar un esquema de ID distinto.

## Buenas prácticas específicas de este proyecto

- Antes de tocar el mapa (`HumanityMap.tsx`, `Map.tsx`), leer el estado de zoom/capas relevante — hay lógica sensible de capas base de Mapbox (`admin-*`) que se manipula con `setLayerZoomRange` para evitar fronteras falsas; no revertir esa lógica sin entender por qué existe (ver `03_DECISIONS.md`, entrada sobre continentes).
- Cualquier endpoint nuevo de tipo "listado" que haga JOIN con una tabla de observaciones debe filtrar por un territorio de referencia (patrón establecido tras el bug de duplicados en `/api/data/indicators`), para no confundir "listado de entidades" con "desglose por territorio" (que vive en los endpoints `geo/*`).
- No hardcodear ninguna clave/secreto (Stripe, Mapbox u otro) en el código fuente. Todo secreto vive en `.env` (no versionado) y se referencia vía `process.env`/`import.meta.env`.

## Qué NO hacer

- No usar `drizzle-kit push`.
- No indexar iconos, rutas o cualquier lógica de UI por `name` de indicador/marcador/métrica.
- No inventar ni interpolar puntuaciones para territorios sin dato real.
- No hardcodear secretos, ni siquiera "temporalmente para probar".
- No borrar entradas de `03_DECISIONS.md` ni de `08_CHANGELOG.md` — solo añadir.
- No asumir que Firebase está activo en el runtime sin comprobarlo primero (es un residuo del scaffold de AI Studio, ver `01_ARCHITECTURE.md`).
- No hacer `git push` sin antes hacer `git fetch` + `git merge`, ya que el usuario edita `README.md`/`MEJORAS_PENDIENTES.md` directamente en GitHub en paralelo.
- No usar coordenadas de píxel de una captura de pantalla como método fiable de verificación en pruebas automatizadas de navegador — el viewport y el zoom de la captura no siempre coinciden con el DOM real; usar en su lugar selección por texto/atributo (`querySelectorAll` + `.find(...)`) y `getComputedStyle()` para verificar estado visual real.

## Testing manual del mapa (patrón establecido para IA con acceso a navegador)

1. Hacer clic en botones de filtro mediante JS directo, no coordenadas de pantalla:
   ```js
   Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Nombre exacto').click()
   ```
2. Para acceder a la instancia viva de `mapboxgl.Map` desde consola, recorrer el árbol de fibra de React desde el nodo del canvas del mapa hasta encontrar el hook `useRef` cuyo `.current` tenga el método `.queryRenderedFeatures`; se expone también como `window.__mapInstance` en este proyecto para inspección directa (`.setCenter()`, `.setZoom()`, `.fire('click'|'mousemove', {...})`, `.queryRenderedFeatures()`).
3. Verificar estados visuales (activo/hover/color) con `getComputedStyle()`, no confiando en la apariencia de una captura de pantalla — varias falsas alarmas de esta sesión resultaron ser estados `:hover` obsoletos o logs de consola acumulados de una pestaña vieja, no bugs reales.
4. Tras reiniciar el servidor de desarrollo, abrir una pestaña nueva del navegador — una pestaña con una conexión HMR de Vite ya activa puede mostrar errores transitorios de "Failed to fetch" que no son bugs de la app.
