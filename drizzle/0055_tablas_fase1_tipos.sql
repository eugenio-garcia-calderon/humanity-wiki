-- ============================================================================
-- TABLAS · FASE 1 — LOS TIPOS QUE GUARDAN UN VALOR
-- ============================================================================
-- La capa 1 salió con cinco tipos porque eran los que cambian lo que el sistema
-- puede calcular o validar. Esta fase añade los que faltan de esa misma
-- familia: los que guardan un valor propio, sin apuntar a nada ni traer un
-- fichero. Los que apuntan (persona, proyecto, publicación, relación) son la
-- fase 2, y los que traen ficheros la fase 3.
--
-- Se amplía el CHECK en vez de quitarlo. Un CHECK con la lista escrita es lo que
-- hace imposible que una columna acabe con un tipo que ningún código sabe
-- interpretar: el error salta al guardar, no meses después al leer.
--
-- ── POR QUÉ ESTOS Y NO «TEXTO CON UN ICONO» ────────────────────────────────
-- `url`, `email` y `telefono` sí son texto por dentro, y aun así son tipos:
-- no por el icono, sino porque cada uno sabe VALIDARSE y sabe qué hacer al
-- pulsarlo. Un correo que no es un correo tiene que poder rechazarse al
-- escribirlo.
-- `moneda`, `porcentaje` y `duracion` son números por dentro, y son tipos
-- porque el formato es un dato: 0,15 es «15 %» y 1500 es «1.500,00 €». Guardar
-- el número crudo y formatear al pintar es lo que permite que las sumas de la
-- fase 6 sigan siendo sumas.
-- `valoracion` es un número acotado: sin el tope, una valoración de 7 sobre 5
-- entra sin protestar.
-- ============================================================================

ALTER TABLE bd_columnas DROP CONSTRAINT IF EXISTS bd_columnas_tipo_check;

ALTER TABLE bd_columnas ADD CONSTRAINT bd_columnas_tipo_check CHECK (tipo IN (
  -- Fase 0 (capa 1)
  'texto', 'numero', 'fecha', 'seleccion', 'casilla',
  -- Fase 1: los que guardan un valor propio
  'texto_largo',   -- varias líneas; el de una línea sigue siendo `texto`
  'url', 'email', 'telefono',
  'moneda', 'porcentaje', 'duracion',
  'valoracion',
  'seleccion_multiple'
));

-- ── SELECCIÓN MÚLTIPLE ──────────────────────────────────────────────────────
-- Reutiliza `opciones`, el mismo jsonb de `seleccion`, con los mismos `id`
-- estables. La diferencia vive solo en el valor de la celda: un id contra una
-- lista de ids.
--
-- SE AVISÓ DE QUE ES UNA RELACIÓN DISFRAZADA y el aviso era bueno: en cuanto
-- exista, alguien la usará para modelar lo que debería ser una relación de
-- verdad. Entra igualmente porque el criterio de aceptación —el CRM— la
-- necesita para etiquetas, y porque su alternativa (obligar a crear una tabla
-- de etiquetas para poner «urgente») es peor. Queda dicho para que cuando
-- alguien la use como relación se sepa que fue una decisión y no un descuido.

-- ── EL FORMATO ES UN DATO, NO UNA DECISIÓN DEL QUE PINTA ────────────────────
-- `config` ya existe y es donde vive. Se documenta aquí lo que cada tipo espera,
-- porque un jsonb sin contrato escrito es un sitio donde cada uno guarda lo que
-- quiere:
--
--   numero      { decimales: 0..8, separador_miles: bool }
--   moneda      { moneda: 'EUR'|'USD'|…, decimales }
--   porcentaje  { decimales }            valor 0,15 = 15 %
--   duracion    { formato: 'h:mm'|'h:mm:ss' }   valor en SEGUNDOS
--   valoracion  { maximo: 1..10, icono: 'estrella'|'corazon'|'rayo' }
--   texto_largo { filas: 2..20 }
COMMENT ON COLUMN bd_columnas.config IS
  'Ajustes del tipo. El contrato de cada uno está en drizzle/0055_tablas_fase1_tipos.sql';
