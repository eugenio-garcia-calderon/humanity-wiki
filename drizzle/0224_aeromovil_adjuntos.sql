-- 2026-11-17 (Eugenio): «que todos los componentes, aparte de tener un peso y un precio, se pueda elegir un proveedor y
-- un modelo… permitir que aparte de escribir el nombre… también se pueda meter un enlace o subir un archivo. De ese
-- componente, subir varios archivos, igual hay presupuestos, hay información más detallada, un PDF o lo que sea».
--
-- The supplier, the model and their links travel INSIDE the design (`Parametros.proveedores`, by part name), like the
-- price (`Parametros.precios`). So does the list of a part's attachments: each entry carries this table's id and the
-- file's URL. This table is only the REGISTER of what was uploaded and by whom:
--  · the bytes live in the platform's upload store (`uploads.ts` `guardarArchivo`, the Docker volume `UPLOADS_DIR`),
--    served with nosniff, a CSP and `Content-Disposition: attachment` for everything but images and PDF;
--  · without this table a file would be an anonymous UUID on disk: nobody could say whose it is, take one down, or
--    find what an emptied account uploaded.
-- One row per file. Not a junction table: no foreign key to a part (a part is a name inside a design's JSON).
--
-- ── WHAT LEAVES THE BUILDING EVERY NIGHT ─────────────────────────────────────
-- The nightly dump copies this table: the file's original name, its type and size, and an opaque user id. Not the
-- bytes (the dump is the database only, deploy/copias/CLAUDE.md). The original name is cut to 160 characters and is
-- the only free text here. Removing a file (`DELETE /api/aeromovil/adjuntos/:id`, its uploader or an admin) deletes the
-- bytes from disk and archives the row: the name stays in the register, the content is gone.
CREATE TABLE IF NOT EXISTS aeromovil_adjuntos (
  id          serial PRIMARY KEY,
  url         text    NOT NULL UNIQUE CHECK (url LIKE '/uploads/%'),
  nombre      text    NOT NULL CHECK (char_length(nombre) BETWEEN 1 AND 160),
  tipo        text    NOT NULL,
  bytes       integer NOT NULL CHECK (bytes > 0),
  pieza       text    NOT NULL CHECK (char_length(pieza) BETWEEN 1 AND 160),
  created_by  text    REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS aeromovil_adjuntos_created_by_idx ON aeromovil_adjuntos(created_by);
