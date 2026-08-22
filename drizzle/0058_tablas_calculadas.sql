-- ============================================================================
-- TABLAS · FASES 5-8 — LAS COLUMNAS QUE SE CALCULAN
-- ============================================================================
-- Tres tipos que NO guardan nada: su valor se calcula al leer.
--
--   formula      mira su propia fila:  {Precio} * {Cantidad}
--   agregado     mira a través de una relación: la suma de los costes de sus
--                componentes
--   condicional  reglas «si esto, entonces aquello». Es azúcar sobre `formula`
--                y se traduce a `SI(...)` anidados, para que haya UN motor de
--                cálculo y no dos sitios donde arreglar el mismo fallo.
--
-- No llevan columna en `bd_filas`: una columna calculada que guardara su
-- resultado tendría dos verdades —lo guardado y lo que sale de recalcular— y
-- llegaría el día en que no coincidieran. Se calcula al leer y se acabó.
--
-- `config` de cada uno:
--   formula      { formula: '{Precio} * {Cantidad}' }
--   agregado     { columna_relacion, direccion: 'origen'|'destino',
--                  columna_destino, operacion: 'suma'|'media'|'contar'|... }
--   condicional  { reglas: [{si: '{Nota} >= 4', entonces: '"Apto"'}, ...],
--                  si_no: '"No apto"' }
-- ============================================================================

ALTER TABLE bd_columnas DROP CONSTRAINT IF EXISTS bd_columnas_tipo_check;

ALTER TABLE bd_columnas ADD CONSTRAINT bd_columnas_tipo_check CHECK (tipo IN (
  'texto', 'numero', 'fecha', 'seleccion', 'casilla',
  'texto_largo', 'url', 'email', 'telefono',
  'moneda', 'porcentaje', 'duracion', 'valoracion', 'seleccion_multiple',
  'persona', 'proyecto', 'publicacion', 'relacion',
  'imagen', 'video', 'documento',
  -- Fases 5-8: las que se calculan
  'formula', 'agregado', 'condicional'
));
