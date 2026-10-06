-- ============================================================================
-- ESTADÍSTICAS DE PÁGINA SIN DATOS PERSONALES (2026-10-06, carril acceso)
-- ============================================================================
-- Visitas por día, visitantes únicos y de dónde vienen, para el dueño de la
-- página. Hasta hoy sólo había un contador `views` que no distinguía días ni
-- personas.
--
-- ── QUÉ SE GUARDA, Y SOBRE TODO QUÉ NO ──────────────────────────────────────
-- NO se guarda la IP, ni el agente de usuario, ni ninguna cookie. De cada
-- visita se guarda una huella = sha256(sal del día + IP + agente). La sal es
-- aleatoria, se genera cada día y NO se guarda en la base de datos (vive en
-- la memoria del servidor y se descarta a medianoche): pasado el día, la
-- huella ya no se puede relacionar con ninguna IP, ni siquiera por quien tenga
-- la base de datos. Por eso:
--   · «visitantes únicos» es POR DÍA (una persona que vuelve mañana cuenta
--     otra vez; es el precio de no poder seguirla);
--   · del referente se guarda sólo el nombre del sitio (`google.com`), nunca
--     la dirección completa, que puede llevar búsquedas o identificadores.
CREATE TABLE IF NOT EXISTS pagina_visitas (
  pagina_id   text NOT NULL REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  dia         date NOT NULL,
  huella      text NOT NULL,
  -- 'directo', 'buscador', 'red', o el nombre del otro sitio.
  origen      text NOT NULL DEFAULT 'directo',
  visitas     integer NOT NULL DEFAULT 1,
  ultima      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pagina_id, dia, huella)
);
-- Para barrer lo viejo (se conservan 400 días) y listar por día.
CREATE INDEX IF NOT EXISTS pagina_visitas_dia ON pagina_visitas (dia);
