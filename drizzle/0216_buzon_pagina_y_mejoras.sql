-- 2026-11-13 (Eugenio): «que ese comentario, cuando se guarde, esté relacionado
-- con la página en la que está ese usuario … y una lista pendiente de mejoras;
-- tú puedes agregar algunas de las mejoras que ves necesarias para que no quede
-- vacío». Each proposal now records where it was written (`pagina`: the
-- section's anchor, e.g. 'vivienda-rustica'), and the model's board starts with
-- the open items its own builders found. The seed only adds what is not there.
ALTER TABLE buzon_proyectos ADD COLUMN IF NOT EXISTS pagina text;

INSERT INTO buzon_proyectos (proyecto, texto, autor, pagina)
SELECT 'modelo-socioeconomico', v.texto, 'Equipo del modelo', v.pagina
FROM (VALUES
  ('Revisar las fichas de «Otras propuestas» cuando los partidos publiquen sus programas completos para las elecciones del 29 de noviembre: hoy varias usan el programa de 2023.', 'impuestos-propuestas'),
  ('Casas en el campo: fijar un tamaño mínimo de finca o un tope por vivienda. Con la regla del 10 %, una finca de 10 hectáreas permitiría 10.000 m² de casas.', 'vivienda-rustica'),
  ('Decidir de dónde sale, durante la transición, el dinero para pagar la deuda heredada y la pensión única: las cuentas del modelo aún no lo incluyen.', 'deuda-heredada'),
  ('Justicia y seguridad reciben en el modelo menos dinero que hoy (unos 23.100 frente a 28.628 millones). Ajustar su peso si se quieren los unos 6.100 jueces que faltan.', 'justicia-cola'),
  ('Banca: decidir qué pasa con el crédito al consumo (coches, viajes, estudios). Hoy la página lo deja por decidir.', 'banca-propuesta'),
  ('Ocupación: encajar el desalojo rápido con la obligación de valorar antes la situación de familias vulnerables y menores.', 'justicia-ocupacion'),
  ('Sustituir por la fuente oficial las cifras que hoy citan prensa porque la web del organismo no se dejaba leer (INE, Ministerio de Sanidad, Ministerio de Vivienda).', 'inicio'),
  ('Educación y Legal son muy largas en el móvil: plegar más detalle dentro de «Más».', 'educacion'),
  ('Recaudación: que las cifras se recalculen al cambiar los tipos de los sueldos según el tamaño de la empresa (10, 20 y 40 %).', 'impuestos'),
  ('Digital: estimar cuánto costaría el sistema de firma con el móvil y el teléfono de atención para quien no tiene móvil.', 'digital-propuesta')
) AS v(texto, pagina)
WHERE NOT EXISTS (
  SELECT 1 FROM buzon_proyectos b WHERE b.proyecto = 'modelo-socioeconomico' AND b.texto = v.texto
);
