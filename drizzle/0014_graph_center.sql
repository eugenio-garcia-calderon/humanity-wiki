-- ============================================================================
-- Nodo central como FUSIÓN de dos conceptos (Fase 11c, 2026-08-05)
-- ============================================================================
-- Petición del usuario: el centro del grafo debe ser técnico, no
-- sensacionalista — la unión explícita de dos grandes nodos (p. ej. el
-- territorio "Ceuta" × el concepto "Amenaza"), con la atribución al creador
-- de esa fusión de forma sutil debajo.
-- Estructura: {left: {label, sublabel}, right: {label, sublabel}}.
-- Vacío → el lienzo cae al nodo único con el título (borradores de la IA).
ALTER TABLE knowledge_graphs ADD COLUMN IF NOT EXISTS center jsonb NOT NULL DEFAULT '{}'::jsonb;
