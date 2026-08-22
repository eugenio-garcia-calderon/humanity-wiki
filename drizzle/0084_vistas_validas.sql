-- VISTAS VÁLIDAS: UNA POR PERSONA, VENTANA Y DÍA (2026-08-22, cierre del
-- techo que dejó la #242 — revisión de prog4: «una sola cuenta puede acuñar
-- los 50 céntimos del tope en cada ventana, todos los días; mil ventanas
-- propias son 500 puntos al día». Con una vista por persona, el mismo ataque
-- baja a ~0,10).
--
-- Es la separación definitiva entre CONTAR y PAGAR que pide el reparto del
-- bote que decidió Eugenio: `knowledge_windows.views` sigue siendo el número
-- bruto que se enseña (lo sube cualquiera, no paga a nadie); esta tabla es
-- el número que PESA — el que acuña hoy y el que leerá el reparto mañana — y
-- no se puede subir apretando F5: la clave primaria lo impide.
--
-- NO ES UNA TABLA DE UNIÓN ENTRE ENTIDADES (la regla de las 43 de
-- src/db/CLAUDE.md): es un registro de hechos con fecha, como el libro de
-- movimientos. No se guarda nada de la vista salvo que ocurrió: quién, qué y
-- qué día — lo mínimo para que «una por persona» sea comprobable.
CREATE TABLE IF NOT EXISTS vistas_validas (
  ventana_id  text NOT NULL REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dia         date NOT NULL DEFAULT current_date,
  created_at  timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (ventana_id, user_id, dia)
);
-- Para el reparto: «cuántas vistas válidas tuvo esta ventana en este mes».
CREATE INDEX IF NOT EXISTS vistas_validas_ventana_dia_idx ON vistas_validas (ventana_id, dia);
-- Y para «cuántas personas distintas vio X este mes» y auditoría por persona.
CREATE INDEX IF NOT EXISTS vistas_validas_user_dia_idx ON vistas_validas (user_id, dia);
