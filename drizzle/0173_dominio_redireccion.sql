-- 0173 — UN DOMINIO QUE REDIRIGE A OTRA WEB (2026-11-06, Eugenio: «redirigir
-- lighthumanity.org a luzhumanidad.com desde la configuración de Humanity.Wiki»).
-- Con `redirigir_a` puesto, el dominio deja de servir su página y contesta con
-- un 301 a esa dirección. Vacío, todo como siempre.
ALTER TABLE dominios_paginas ADD COLUMN IF NOT EXISTS redirigir_a text;
