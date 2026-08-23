-- ============================================================================
-- 0102 — La cifra de gasto deja de vivir en un solo proceso (2026-08-23)
-- ============================================================================
-- `src/server/gasto.ts` guardaba en memoria lo que contestan las APIs de coste
-- (Hetzner, Anthropic) durante seis horas, para no llamarlas en cada visita.
-- Con un proceso funciona. Con los ocho que va a haber cuando se reparta el
-- trabajo, serían OCHO cachés independientes, cada una tomada en un momento
-- distinto:
--
--   · hasta 8 veces las llamadas a las APIs de fuera, y
--   · sobre todo, LA CIFRA BAILARÍA según qué proceso conteste. Se recarga la
--     página de Servidores y el coste cambia, y la hora de «última lectura»
--     también.
--
-- Y esa página existe precisamente para ser transparente con el dinero de
-- Eugenio. **Un número que baila es peor que uno viejo**: uno viejo se explica
-- con su fecha al lado; uno que cambia al recargar hace dudar de todos los
-- demás números de la página.
--
-- ── UNA SOLA FILA, A PROPÓSITO ─────────────────────────────────────────────
-- No es un histórico: es la última respuesta buena, compartida. El histórico de
-- gasto ya se calcula del libro `ai_usage_charges`, que es la fuente de verdad.
-- Esto solo evita repetir llamadas a APIs de fuera.
--
-- Si la escritura falla, no pasa nada: se pierde la caché de ese rato y se
-- vuelve a preguntar. Nunca puede tumbar la página.
CREATE TABLE IF NOT EXISTS gasto_cache (
  -- Siempre 1. La restricción es lo que garantiza que no haya dos verdades.
  id        int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  datos     jsonb NOT NULL,
  expira    timestamptz NOT NULL,
  guardado  timestamptz NOT NULL DEFAULT now()
);
