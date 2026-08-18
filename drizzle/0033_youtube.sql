-- ============================================================================
-- GRAN PANTALLA DE YOUTUBE (2026-08-18, petición de Eugenio): el jugador
-- conecta su cuenta de YouTube (OAuth de Google, solo lectura) y la pantalla
-- del pueblo le recomienda vídeos nuevos de sus suscripciones relacionados
-- con sus proyectos. Aquí viven los tokens de esa conexión, uno por usuario.
-- Es una credencial, no conocimiento: al desconectar se BORRA de verdad
-- (y se revoca en Google), no se archiva.
-- ============================================================================
CREATE TABLE IF NOT EXISTS youtube_accounts (
  user_id       text PRIMARY KEY REFERENCES users(id),
  access_token  text NOT NULL,
  refresh_token text,
  token_expiry  timestamptz,
  channel_title text,
  channel_thumb text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
