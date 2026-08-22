-- ============================================================================
-- UN ICONO PARA CADA COSA (2026-08-20, petición de Eugenio: «permite cambiar
-- el nombre e icono desde el menú»).
-- ============================================================================
-- El icono es de LA COSA, no de quien la mira: si Eugenio le pone 🚐 a «Camión
-- camperizado», quien vea ese proyecto tiene que ver el 🚐. Por eso va en la
-- fila y no en los ajustes de usuario, que sería más barato pero haría que
-- cada cual viera un icono distinto para lo mismo.
--
-- UN EMOJI, no una imagen: cabe en la fila, no hay que subir nada, se ve igual
-- en todas partes y no cuesta una petición más por cada línea del menú.
--
-- LAS PÁGINAS NO ESTÁN AQUÍ a propósito: `knowledge_windows` ya guarda su
-- icono dentro de `config->>'icono'` desde que se hizo el editor tipo Notion,
-- y el editor lee y escribe ahí. Añadir una columna crearía dos sitios donde
-- vive el mismo dato, que es peor que la pequeña asimetría de tenerlo en dos
-- formas distintas.
ALTER TABLE proyectos        ADD COLUMN IF NOT EXISTS icono text;
ALTER TABLE knowledge_graphs ADD COLUMN IF NOT EXISTS icono text;
ALTER TABLE user_maps        ADD COLUMN IF NOT EXISTS icono text;
ALTER TABLE products         ADD COLUMN IF NOT EXISTS icono text;
ALTER TABLE roadmap_items    ADD COLUMN IF NOT EXISTS icono text;
ALTER TABLE game_agents      ADD COLUMN IF NOT EXISTS icono text;
