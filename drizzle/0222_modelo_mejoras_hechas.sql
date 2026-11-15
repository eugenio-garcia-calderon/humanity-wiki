-- «Mejoras pendientes» board of the Modelo de optimización socioeconómica: record what was done on 2026-11-15
-- (PR «mejoras» and PR «pedagogía»). Only touches the items seeded by 0216, and only while they are still pending,
-- so an administrator's own answer is never overwritten. Safe to run twice.
UPDATE buzon_proyectos SET estado = 'hecha', resuelto_at = now(),
  respuesta = 'Hecho el 15-11-2026: en el móvil, las fuentes, los retos y los bloques más largos se pliegan con «Seguir leyendo». Las ventanas más largas son un 30 % más cortas.'
WHERE proyecto = 'modelo-socioeconomico' AND estado = 'pendiente'
  AND texto = 'Educación y Legal son muy largas en el móvil: plegar más detalle dentro de «Más».';

UPDATE buzon_proyectos SET estado = 'hecha', resuelto_at = now(),
  respuesta = 'Hecho el 15-11-2026: el tipo de cada sueldo sale ahora del tramo (10, 20 y 40 %), así que cambiar un tramo cambia también las cuentas de los sueldos.'
WHERE proyecto = 'modelo-socioeconomico' AND estado = 'pendiente'
  AND texto = 'Recaudación: que las cifras se recalculen al cambiar los tipos de los sueldos según el tamaño de la empresa (10, 20 y 40 %).';

UPDATE buzon_proyectos SET
  respuesta = 'En parte, el 15-11-2026: ya están el programa de Vox, el del PP y lo publicado del Frente Amplio. Falta el del PSOE, que se presentó ese día, y no hay programa nuevo de Sumar ni de Podemos.'
WHERE proyecto = 'modelo-socioeconomico' AND estado = 'pendiente' AND respuesta IS NULL
  AND texto LIKE 'Revisar las fichas de «Otras propuestas»%';

UPDATE buzon_proyectos SET
  respuesta = 'En parte, el 15-11-2026: 27 de 79 fuentes de prensa ya citan al organismo oficial. Las demás no tienen la cifra en una fuente oficial que se pueda leer, o vienen de un estudio privado.'
WHERE proyecto = 'modelo-socioeconomico' AND estado = 'pendiente' AND respuesta IS NULL
  AND texto LIKE 'Sustituir por la fuente oficial%';
