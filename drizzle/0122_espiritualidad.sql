-- ============================================================================
-- ESPIRITUALIDAD, EL OBJETIVO NÚMERO 15 (2026-08-25)
-- ============================================================================
-- Eugenio: «añade espiritualidad como tema principal dentro de los 14
-- objetivos, es el número 15».
--
-- Los catorce viven en DOS sitios y hay que tocar los dos: `src/utils/objetivos.ts`
-- —que es de donde salen el icono, el color y las palabras con las que se
-- clasifica— y esta tabla, que es la que usan los indicadores, el mapa y todo
-- lo que guarda una puntuación por objetivo.
--
-- Un objetivo que exista sólo en el código sale en el menú y en la rueda y
-- luego no se le puede colgar nada medido; uno que exista sólo aquí no aparece
-- en ninguna pantalla. Por eso van juntos en la misma PR.
INSERT INTO objectives (id, title, description) VALUES
  ('O015', 'ESPIRITUALIDAD',
   'La vida interior y la búsqueda de sentido: prácticas contemplativas, tradiciones religiosas, duelo, propósito y comunidad espiritual.')
ON CONFLICT (id) DO NOTHING;
