-- 0177 — «Trabaja con nosotros» como motivo del formulario de colaborar (2026-11-09,
-- Eugenio: la tarjeta de donación sale de «Colabora» y entra «Trabaja con nosotros»).
-- Solo se amplía la lista permitida: los mensajes que ya existen (también los de
-- «donación», que siguen en el formulario para no perder su etiqueta) no cambian.
-- Número 0177 porque el 0176 está reservado a las estadísticas, que aún no se han fusionado.
ALTER TABLE sitio_mensajes DROP CONSTRAINT IF EXISTS sitio_mensajes_motivo_check;
ALTER TABLE sitio_mensajes ADD CONSTRAINT sitio_mensajes_motivo_check
  CHECK (motivo IN ('voluntariado', 'donacion', 'empresa', 'prensa', 'trabajo', 'otro'));
