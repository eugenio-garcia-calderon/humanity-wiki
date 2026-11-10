-- 2026-11-10 (Eugenio): «Haz que cuando se cargue la página de Aeromóvil
-- aparezca ese diseño con ese editor para diseñar ese triciclo bala por
-- defecto». The team's Triciclo Bala base design (0182, renumbered 0186 the same day; applied first as 0182) becomes the default
-- design: the one a first visit opens and «Empezar uno nuevo» loads. At most one
-- default (unique index from 0174), so the previous one is cleared first, in a
-- separate statement, to never have two at once. If that row is missing,
-- nothing changes. The owner can move the star back from the menu at any time.
UPDATE aeromovil_disenos SET por_defecto = false
WHERE por_defecto AND EXISTS (
  SELECT 1 FROM aeromovil_disenos
  WHERE origen = 'equipo' AND parametros->>'disposicion' = 'triciclo' AND archived_at IS NULL
);
UPDATE aeromovil_disenos SET por_defecto = true
WHERE id = (
  SELECT id FROM aeromovil_disenos
  WHERE origen = 'equipo' AND parametros->>'disposicion' = 'triciclo' AND archived_at IS NULL
  ORDER BY id LIMIT 1
);
