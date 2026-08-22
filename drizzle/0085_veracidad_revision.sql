-- ============================================================================
-- VERACIDAD · FASE 2: QUIÉN MOVIÓ EL SELLO, Y CUÁNDO (2026-08-22)
-- ============================================================================
-- La fase 1 dejó la columna `veracidad` con su escalera —sin_fuente, con_fuente,
-- verificada, disputada, refutada— pero solo se movía sola el primer escalón.
-- Del segundo para arriba decide una PERSONA, y ahí un estado sin firma no vale
-- nada: «verificada» sin decir por quién es exactamente el tipo de afirmación
-- que este sistema existe para no aceptar.
--
-- ── POR QUÉ TEXTO Y NO UNA CLAVE FORÁNEA A `users` ─────────────────────────
-- Igual que `incidencias.respondido_por` (migración 0062): quien revisó algo
-- tiene que seguir constando aunque su cuenta desaparezca. Una clave foránea
-- obligaría a elegir entre borrar la cuenta y borrar la firma.
ALTER TABLE argumentos ADD COLUMN IF NOT EXISTS veracidad_por text;
ALTER TABLE argumentos ADD COLUMN IF NOT EXISTS veracidad_en timestamp;

-- El motivo. Marcar algo como refutado sin decir por qué deja al autor sin
-- nada que responder, y a quien lee sin nada que comprobar.
ALTER TABLE argumentos ADD COLUMN IF NOT EXISTS veracidad_motivo text;

-- «Qué han revisado» y «qué está esperando revisión» son las dos preguntas de
-- la fase 9, y las dos se hacen por este par.
CREATE INDEX IF NOT EXISTS argumentos_veracidad_idx
  ON argumentos (veracidad, veracidad_en DESC) WHERE archived_at IS NULL;

-- ── EL TABLERO, AL DÍA ──────────────────────────────────────────────────────
-- Una tarjeta en verde es una afirmación sobre el producto, y este área existe
-- justamente para no aceptar afirmaciones sin comprobar. Se marcan de una en
-- una, por id, y solo las que se pueden abrir y usar en la pantalla.
UPDATE roadmap_items SET estado = 'hecho', updated_at = now()
WHERE id IN (
  'RM_VER_F1_REGISTRO',   -- el módulo ya está enchufado al servidor
  'RM_VER_F2_ESCALERA',   -- verificada / disputada / refutada, con firma y motivo
  'RM_VER_F2_SELLO',      -- <SelloVeracidad>, el mismo en cualquier pantalla
  'RM_VER_F2_CITA',       -- la fuente guarda la frase exacta y el tipo de prueba
  'RM_VER_F4_PAGINA',     -- /debates y /debates/:slug
  'RM_VER_F4_ESCRIBIR'    -- argumentar y citar sin salir de la pantalla
);

-- Y lo que se ha empezado y no está: los contadores por rama existen (cada
-- argumento dice cuántas respuestas tiene), pero el plegado por tramos de un
-- hilo largo no.
UPDATE roadmap_items SET estado = 'en_curso', updated_at = now()
WHERE id = 'RM_VER_F3_CONTADORES';
