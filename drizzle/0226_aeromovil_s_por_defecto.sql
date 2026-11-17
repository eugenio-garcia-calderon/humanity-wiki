-- Aeromóvil: the «Aeromovil S» (id 16) becomes the default design (2026-11-17, Eugenio: «ahora me quiero centrar en el
-- aeromóvil S… es el que vamos a trabajar sobre él y va a ser el que realmente salga a producción»).
-- The same change the owner's «Marcar por defecto» (POST /api/aeromovil/disenos/:id/por-defecto) makes: one row true,
-- the rest false. Only if design 16 exists, is not archived and is still called «Aer(o)movil S», so a database where
-- id 16 is something else is left untouched. Nothing is archived or deleted. Safe to run twice.
UPDATE aeromovil_disenos SET por_defecto = (id = 16)
WHERE (por_defecto OR id = 16)
  AND EXISTS (
    SELECT 1 FROM aeromovil_disenos s
    WHERE s.id = 16 AND s.archived_at IS NULL AND s.nombre ~* '^\s*ae?ro?m[oó]vil\s+s\s*$'
  );
