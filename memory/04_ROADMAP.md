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
| 4 | Red social: publicaciones, feed, seguir, comentar, notificaciones | **Completada** |
| 5 | Mercado: productos y demandas | **Completada** |
| 6 | Economía y Stripe | **Activa (claves de test)** |
| 7 | Iniciativas y casos de éxito | **Completada** (`projects` migrado) |
| 8 | Ejemplo completo y datos de demostración | **Completada** |
| 9 | Asistente IA universal | **Activo** (Claude conectado, RAG corregido) |
| 10 | Paneles redimensionables, países de Europa, búsqueda global | **Completada** |
| 11 | Grafos de Conocimiento + renombrado "Humanity.wiki" | **Completada** (2026-08-05) |

## Lo que falta para dar cada fase por cerrada del todo

### Fase 6 — Economía (activa en modo test, pendiente de producción)
Checkout embebido, Stripe Connect, webhooks, reembolsos y panel financiero,
todo construido y verificado en modo test. Pendiente, acción del usuario:
- **Bloqueante antes de activar cobros reales**: configurar `STRIPE_WEBHOOK_SECRET`
  en el `.env` del servidor, cogiéndolo del panel de Stripe. Sin él la verificación
  de firma del webhook no puede funcionar. Está probado con eventos sintéticos, así
  que solo falta el valor real.
  > Detalle operativo no documentado aquí a propósito: este repositorio es
  > **público**. El estado exacto de la verificación de firma se comprueba en el
  > servidor, no se publica.
- Activar Stripe Connect una vez en `dashboard.stripe.com/connect`.
- Cuando se quiera pasar a producción: las claves `_LIVE` ya están aportadas
  y aparcadas sin activar en `.env`.

### Fase 9 — Asistente IA (activo, solo queda una decisión pendiente)
Proveedor abstracto, RAG (con dos fallos reales corregidos), agente de
acciones con catálogo cerrado, panel acoplado con permisos de edición y ancho
redimensionable, panel de administración con costes y vacíos de conocimiento,
**búsqueda real en internet** (herramienta nativa `web_search_20250305` de
Claude, con citas reales verificadas) y **multimodal — imagen y PDF**
(bloques de contenido nativos de Claude, el binario nunca se guarda en BD),
ambas completadas y verificadas el 2026-08-04. Voz/Excel/Word explícitamente
aparcados (necesitan pipelines aparte, no pedidos todavía). Pendiente:
- Embeddings reales para el RAG (hoy usa índice de texto completo en
  español, que funciona; `ai_knowledge_chunks.embedding` está preparado por
  si se decide añadir pgvector — necesitaría una clave de Voyage AI u otro
  proveedor de embeddings, decisión pendiente del usuario).

### Fase 11 — Grafos de Conocimiento (completada; mejoras naturales siguientes)
Ver `docs/12_KNOWLEDGE_GRAPHS.md`. Posibles siguientes pasos, no pedidos aún:
- Editor visual de grafos (crear/conectar ventanas desde el lienzo; hoy la
  creación manual va por API y la IA crea borradores).
- Cola de revisión para publicar borradores generados por la IA.
- Sub-grafos tipo "Debates" del boceto (el tipo de ventana `grafo` ya existe).

## Transversal pendiente
- **Correo**: sin proveedor configurado. Por eso los usuarios se crean con
  `email_verified = true` y la recuperación de contraseña devuelve el token en
  desarrollo. Activar la verificación real es enchufar el envío y poner ese
  campo a `false`.
- **Panel derecho** de `11_UI_GUIDELINES.md` en las fichas de entidad.
- **Provincia y Barrio** en la jerarquía territorial.
- **Barra de búsqueda global** con resultados agrupados por categoría
  (productos, retos, indicadores, personas) — pedida por el usuario, aún no
  construida.
- **Polígonos de país** para los 32 países de Europa añadidos el 2026-08-04:
  se posicionan como puntos (centroides) pero no tienen relleno propio a
  zoom de país todavía (`public/geo/countries.json` solo tiene España e
  Italia) — mismo hueco preexistente que Argentina/Guinea Ecuatorial/Etiopía.
