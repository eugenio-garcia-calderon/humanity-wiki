-- 2026-11-04 (Eugenio): «Calendario Arte para la Humanidad».
-- Doce meses, cada uno con una ilustración, una franja con una herramienta o
-- juego y una frase para cada día. Editable desde cualquier dispositivo, con
-- una carpeta de imágenes de referencia por mes y un buzón de ideas que la IA
-- lee de vez en cuando para implementar mejoras.
--
-- ── UNA FILA POR MES, NO UNA POR FRASE ─────────────────────────────────────
-- Se edita y se imprime un mes entero de cada vez; guardar 365 filas sueltas
-- obligaría a 31 escrituras por mes para algo que la pantalla trata como una
-- sola hoja. `contenido` es el mes completo (tema, lema, franja, días…). El
-- contenido por defecto vive en el código (`src/data/calendarioArte.ts`): la
-- fila solo existe cuando alguien ha cambiado algo, como `textos_editables`.
--
-- ── `version` PARA QUE DOS PERSONAS NO SE PISEN ───────────────────────────
-- Si dos personas editan el mismo mes desde dos móviles, el segundo en guardar
-- recibe un 409 en vez de borrar en silencio lo del primero.
CREATE TABLE IF NOT EXISTS calendario_arte_meses (
  anio        integer NOT NULL,
  -- mes 0 = lo común a todo el año: principios de diseño y carpeta de estilo.
  mes         integer NOT NULL CHECK (mes BETWEEN 0 AND 12),
  contenido   jsonb   NOT NULL DEFAULT '{}'::jsonb,
  referencias jsonb   NOT NULL DEFAULT '[]'::jsonb,
  version     integer NOT NULL DEFAULT 1,
  updated_by  text    REFERENCES users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (anio, mes)
);
CREATE INDEX IF NOT EXISTS calendario_arte_meses_updated_by_idx ON calendario_arte_meses(updated_by);

-- El buzón de ideas y mejoras. `estado` lo cambia quien edita el calendario
-- (o la IA a través de una persona) cuando la idea se ha implementado.
CREATE TABLE IF NOT EXISTS calendario_arte_ideas (
  id          serial PRIMARY KEY,
  anio        integer NOT NULL,
  mes         integer CHECK (mes BETWEEN 1 AND 12),
  texto       text    NOT NULL,
  estado      text    NOT NULL DEFAULT 'pendiente'
              CHECK (estado IN ('pendiente', 'hecha', 'descartada')),
  respuesta   text,
  created_by  text    REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resuelta_at timestamptz
);
CREATE INDEX IF NOT EXISTS calendario_arte_ideas_estado_idx ON calendario_arte_ideas(anio, estado);
CREATE INDEX IF NOT EXISTS calendario_arte_ideas_created_by_idx ON calendario_arte_ideas(created_by);
