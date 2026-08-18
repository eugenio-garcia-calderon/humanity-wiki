-- ============================================================================
-- CUENTA DE SPOTIFY (2026-08-18, petición de Eugenio): al plantar música en el
-- mapa 3D, además de pegar un link o subir un archivo, el jugador puede
-- conectar su Spotify y elegir directamente de sus playlists y canciones
-- guardadas. Mismo trato que youtube_accounts (0033): es una credencial,
-- desconectar BORRA la fila, no se archiva.
-- ============================================================================
CREATE TABLE IF NOT EXISTS spotify_accounts (
  user_id       text PRIMARY KEY REFERENCES users(id),
  access_token  text NOT NULL,
  refresh_token text,
  token_expiry  timestamptz,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
