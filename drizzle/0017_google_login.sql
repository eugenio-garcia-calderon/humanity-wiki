-- ============================================================================
-- Login con cuenta de Google (Fase 13, 2026-08-05)
-- ============================================================================
-- `google_id` es el `sub` estable del ID token de Google: identifica la
-- cuenta aunque el usuario cambie de email. Una cuenta creada por email y
-- contraseña puede vincularse después a Google (mismo email verificado).
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id text UNIQUE;
