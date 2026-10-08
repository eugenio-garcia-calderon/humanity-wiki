-- LA CONSOLA DE UNA WEB (2026-10-08): la cadena de valor de un negocio, con su estado por eslabón.
-- Tabla APARTE y no `knowledge_windows.config`: `config` sale tal cual en las rutas públicas de la web
-- publicada (menú, pie…), y la consola es sólo para quien gestiona la página. Una tabla propia hace
-- imposible filtrarla por descuido: ninguna ruta pública la lee.
CREATE TABLE IF NOT EXISTS consolas (
  pagina_id text PRIMARY KEY REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  datos jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by text REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS consolas_updated_by_idx ON consolas (updated_by);
