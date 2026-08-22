-- TEXTOS DE PÁGINA EDITABLES (2026-08-08, user request): "permite a
-- eugenio@lighthumanity.org como ADMIN cambiar todos los textos de esta web
-- de visión". The prose on /vision (headline, paragraphs, the new strategy
-- statement) was hardcoded JSX. Rather than one bespoke edit flow per
-- paragraph, one small generic table: any page can register editable spots
-- by (pagina, clave), and the admin's own text overrides the code default
-- until someone touches it again.
--
-- No row means "use the default baked into the component" — a missing key
-- is not an error, so shipping a new editable spot never needs a seed.
CREATE TABLE IF NOT EXISTS page_texts (
  pagina     text NOT NULL,
  clave      text NOT NULL,
  valor      text NOT NULL,
  updated_by text,
  updated_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (pagina, clave)
);
