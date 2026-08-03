# 04 — Hoja de ruta

> Estado real del plan por fases acordado con el usuario el 2026-08-03 tras la
> llegada de los documentos normativos de `/docs`. Se actualiza al cerrar cada
> fase; ver el detalle de lo hecho en `08_CHANGELOG.md`.

## Estado por fases

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Cimientos: UUID, autoría, versionado, historial, archivado | **Completada** |
| 2 | Usuarios, 4 niveles de rol, perfiles, sesiones | **Completada** |
| 3 | Grafo de conocimiento + Necesidades | **Completada** |
| 4 | Red social: publicaciones, feed, seguir, comentar, notificaciones | **Completada (API)** |
| 5 | Mercado: productos y demandas | **Completada** |
| 6 | Economía y Stripe | **Estructura lista, inactiva** |
| 7 | Iniciativas y casos de éxito | **Estructura y datos listos** |
| 8 | Ejemplo completo y datos de demostración | **Completada** |
| 9 | Asistente IA universal | **Construido, inactivo** |

## Lo que falta para dar cada fase por cerrada del todo

### Fase 4 — Red social (falta interfaz)
La API está completa y probada. Falta construir las páginas: muro/feed,
perfil público de usuario, y los componentes de publicar/comentar/seguir
embebidos en las fichas de entidad.

### Fase 6 — Economía (bloqueada por claves)
Las tablas (`transactions`, `stripe_accounts`, `supports`, `refunds`) y el
grafo de transacciones existen. Falta:
- Claves de **test** de Stripe (`sk_test_`, `pk_test_`, webhook secret). Las
  claves de producción que aportó el usuario están **aparcadas sin activar**
  en `.env` (ver `03_DECISIONS.md`).
- Checkout embebido, Stripe Connect (onboarding de vendedores), webhooks,
  reembolsos y panel financiero por usuario.

### Fase 7 — Iniciativas (falta migrar `projects`)
`initiatives`, `success_cases` e `initiative_results` existen y tienen datos.
Falta:
- Migrar las 19 filas de `projects` a `initiatives` (la columna
  `legacy_project_id` está preparada para dejar trazada la procedencia).
- Páginas de listado y ficha de iniciativa y de caso de éxito.

### Fase 9 — Asistente IA (bloqueado por clave)
Todo construido: proveedor abstracto, RAG, agente de acciones con catálogo
cerrado, panel flotante con permisos de edición, panel de administración con
costes y vacíos de conocimiento. Falta:
- `ANTHROPIC_API_KEY` en `.env` para activarlo.
- Proveedor de búsqueda en internet (el botón y la distinción de origen ya
  están; falta decidir con qué buscador se resuelve).
- Multimodal (voz, imágenes, PDF, Excel): la estructura de mensajes lo admite,
  falta la ingesta.
- Embeddings reales para el RAG (hoy usa índice de texto completo en español;
  `ai_knowledge_chunks.embedding` está preparado y habría que añadir pgvector).

## Transversal pendiente
- **Correo**: sin proveedor configurado. Por eso los usuarios se crean con
  `email_verified = true` y la recuperación de contraseña devuelve el token en
  desarrollo. Activar la verificación real es enchufar el envío y poner ese
  campo a `false`.
- **Panel derecho** de `11_UI_GUIDELINES.md` en las fichas de entidad.
- **Provincia y Barrio** en la jerarquía territorial.
