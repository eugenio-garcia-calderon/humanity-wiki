-- 2026-11-06 (Eugenio): «haz que [el Aeromóvil 1] sea el diseño por defecto al
-- entrar en el proyecto». Desde hoy `PARAMETROS_POR_DEFECTO` es el Aeromóvil 1
-- (eléctrico de cuatro ruedas, `disposicion = 'cuatro'`). Los diseños
-- guardados hasta ahora no llevan `disposicion`: el visor los abre como
-- Aeromóvil Gota (`disposicion = 'rombo'`), así ninguno cambia de forma.
--
-- El diseño de partida del equipo tenía parámetros vacíos («los de por
-- defecto»): si se dejara así, hoy abriría el Aeromóvil 1 con el nombre del
-- Gota. Se le escribe su disposición y pasa a llamarse por lo que es, y se
-- añade el Aeromóvil 1 como nuevo diseño de partida.
UPDATE aeromovil_disenos
SET parametros = parametros || '{"disposicion": "rombo"}'::jsonb,
    nombre = CASE WHEN nombre = 'Gota base (por defecto)' THEN 'Aeromóvil Gota (tándem 1+2)' ELSE nombre END,
    updated_at = now()
WHERE origen = 'equipo' AND NOT (parametros ? 'disposicion');

INSERT INTO aeromovil_disenos (nombre, parametros, autor, origen)
SELECT 'Aeromóvil 1 (por defecto)', '{"disposicion": "cuatro"}'::jsonb, 'Equipo', 'equipo'
WHERE NOT EXISTS (SELECT 1 FROM aeromovil_disenos WHERE origen = 'equipo' AND parametros->>'disposicion' = 'cuatro');
