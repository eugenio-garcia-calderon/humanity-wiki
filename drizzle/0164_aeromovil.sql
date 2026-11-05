-- 2026-11-05 (Eugenio): «Aeromóvil Gota» publicado en humanity.wiki/aeromovil.
-- Una página propia (sin el menú de Wiki Creator) con el diseño 3D por capas,
-- planos de fabricación, exportación a CAD, el plan de desarrollo y un buzón
-- de comentarios de mejora que se convierten en las tareas pendientes del
-- menú superior.
--
-- ── UNA SOLA TABLA: COMENTARIO = TAREA ─────────────────────────────────────
-- Eugenio pidió que los comentarios de mejora «se añadan en un menú superior
-- como tareas pendientes». Son la misma cosa vista en dos momentos, así que es
-- una fila con estado, como `calendario_arte_ideas`. `origen` distingue lo que
-- escribió alguien desde la página de lo que dejó el equipo al publicarla.
--
-- `autor` es un nombre libre y opcional (sin cuenta). No se guarda IP ni
-- correo: en la copia de seguridad de mañana esta tabla solo lleva texto.
CREATE TABLE IF NOT EXISTS aeromovil_tareas (
  id          serial PRIMARY KEY,
  area        text    NOT NULL DEFAULT 'general'
              CHECK (area IN ('general', 'carenado', 'chasis', 'suspension', 'ruedas', 'asientos', 'motor', 'baterias', 'planos')),
  texto       text    NOT NULL,
  autor       text,
  origen      text    NOT NULL DEFAULT 'comentario' CHECK (origen IN ('comentario', 'equipo')),
  estado      text    NOT NULL DEFAULT 'pendiente'
              CHECK (estado IN ('pendiente', 'en_curso', 'hecha', 'descartada')),
  respuesta   text,
  created_by  text    REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resuelta_at timestamptz
);
CREATE INDEX IF NOT EXISTS aeromovil_tareas_estado_idx ON aeromovil_tareas(estado, created_at DESC);
CREATE INDEX IF NOT EXISTS aeromovil_tareas_created_by_idx ON aeromovil_tareas(created_by);

-- Lo que quedó pendiente al entregar el primer diseño CAD (2026-11-05).
INSERT INTO aeromovil_tareas (area, texto, origen) VALUES
  ('carenado', 'Comprobar el giro máximo de la rueda delantera dentro del morro y ensanchar el hueco si roza.', 'equipo'),
  ('carenado', 'Validar el Cd con una simulación CFD (OpenFOAM o SimScale) antes de fabricar el molde; hoy es una estimación por esbeltez.', 'equipo'),
  ('suspension', 'Las ruedas laterales quedan a 1-3 cm del carenado inclinadas 20°: decidir entre más ancho, menos vía o limitar la inclinación.', 'equipo'),
  ('suspension', 'Elegir el bloqueo de inclinación para parado (freno de disco en el paralelogramo o bloqueo hidráulico).', 'equipo'),
  ('chasis', 'Calcular la viga con elementos finitos incluyendo frenada y bache; hoy es un cálculo de dos vanos con factor 2,5.', 'equipo'),
  ('chasis', 'Diseñar la dirección completa: varillaje desde el manillar a la horquilla y radio de giro.', 'equipo'),
  ('motor', 'Elegir el generador de pedalier y el controlador chainless (relación pedaleo-motor y freno regenerativo).', 'equipo'),
  ('general', 'Confirmar la categoría de homologación: con tres plazas probablemente no encaje como bicicleta de pedaleo asistido (250 W, 25 km/h).', 'equipo'),
  ('asientos', 'Añadir cinturones y anclajes, y comprobar el acceso con cada tipo de puerta (cúpula, gaviota, tipo Aptera).', 'equipo'),
  ('carenado', 'Diseñar la ventilación del habitáculo (tomas NACA y salida en la cola) para no depender solo de abrir la cúpula.', 'equipo'),
  ('carenado', 'Elegir los paneles solares flexibles del techo y cómo se laminan sobre la curvatura sin romper las células.', 'equipo');
