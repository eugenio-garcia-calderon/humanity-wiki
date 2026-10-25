-- 2026-10-25 (Eugenio): la propiedad «Nota» del 1 al 10, con los colores del
-- mapa (`src/utils/nota.ts`). Se guarda un número en la fila, como «número».
ALTER TABLE bd_columnas DROP CONSTRAINT IF EXISTS bd_columnas_tipo_check;
ALTER TABLE bd_columnas ADD CONSTRAINT bd_columnas_tipo_check CHECK (tipo IN (
  'texto', 'numero', 'fecha', 'seleccion', 'casilla',
  'texto_largo', 'url', 'email', 'telefono',
  'moneda', 'porcentaje', 'duracion', 'valoracion', 'seleccion_multiple',
  'persona', 'proyecto', 'publicacion', 'relacion',
  'imagen', 'video', 'documento',
  'formula', 'agregado', 'condicional',
  'compra',
  'comunidad',
  'nota'
));
