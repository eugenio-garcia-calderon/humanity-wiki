#!/usr/bin/env bash
# ============================================================================
# EXPORT THE PUBLIC WIKIPRODUCTS SITE FROM INSIDE THE SERVER (2026-10-18, W3a)
# ============================================================================
# For the evaluator's local copy (W7), which cannot reach production. Read-only:
# two SELECTs in the database container, then `exportar.mjs` in the app
# container shapes them and copies the stored product photos. Writes a tar to
# STDOUT (everything else goes to stderr) with:
#   paginas.json  the site root, the subcategory pages and «Cómo trabajamos»,
#                 and every page hanging from them through «Página» blocks;
#                 the site's sitio_config / sitio_categorias /
#                 sitio_restricciones rows and its dominios_paginas row
#   fotos.json    [{ tabla, nombre, archivo, mime, credito }]
#   fotos.tar     the photo files named in fotos.json
#
# What is NOT exported, on purpose: members (sitio_miembros), their sessions
# and magic links (sitio_enlaces: e-mail + token), orders, users, keys, .env.
# Only pages owned by the site's owner, not deleted, not archived and not
# members-only. No API key is created: nothing here writes anything.
#
# From /opt/humanity-wiki (the workflow `exportar-wikiproducts.yml` does this):
#   bash scripts/wikiproducts/exportar-en-servidor.sh > wikiproducts.tar
# Local copy, after `scripts/wikiproducts/local.sh` (RAICES = its root page):
#   CARGA_MODO=local RAICES=KW… bash scripts/wikiproducts/exportar-en-servidor.sh > x.tar
set -euo pipefail

EMAIL="${CARGA_EMAIL:-eugenio@lighthumanity.org}"
DOMINIO="wikiproducts.humanity.wiki"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"
DIR=/tmp/wikiproducts-export

# Roots: the site's home, the 5 subcategory pages and «Cómo trabajamos», all by
# id from sitio.json (the categories hang from the home page). Ids only: the
# check below keeps anything else out of the SQL.
if [ -z "${RAICES:-}" ]; then
  RAICES=$(grep -o 'KW[A-Z0-9]\{10\}' scripts/wikiproducts/sitio.json | sort -u | tr '\n' ',' | sed 's/,$//')
  RAICES="$RAICES,KWMVDTQPSR76"
fi
[[ "$RAICES" =~ ^[A-Z0-9,]+$ ]] || { echo "Ids de sitio.json inesperados." >&2; exit 1; }

limpiar() { [ "${CARGA_MODO:-produccion}" = "local" ] && return 0; $COMPOSE exec -T app sh -c "rm -rf /tmp/wikiproducts $DIR" >/dev/null 2>&1 || true; }
trap limpiar EXIT

read -r -d '' CONSULTA <<SQL || true
WITH RECURSIVE
duena AS (SELECT id FROM users WHERE lower(email) = lower('$EMAIL') LIMIT 1),
baja(id, n) AS (
  SELECT r, 0 FROM unnest(string_to_array('$RAICES', ',')) r
  UNION
  SELECT h.hija, b.n + 1 FROM baja b
  JOIN knowledge_windows w ON w.id = b.id
  CROSS JOIN LATERAL (
    SELECT DISTINCT x #>> '{}' AS hija
    FROM jsonb_path_query(w.config, 'lax \$.** ? (@.tipo == "subpagina").entityId') x
  ) h
  WHERE b.n < 8
),
paginas AS (
  SELECT w.* FROM knowledge_windows w, duena d
  WHERE w.id IN (SELECT id FROM baja) AND w.creator_user_id = d.id
    AND w.deleted_at IS NULL AND w.archived_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM sitio_restricciones r WHERE r.pagina_id = w.id AND r.bloque_id = '')
),
dominio AS (SELECT * FROM dominios_paginas WHERE dominio = '$DOMINIO'),
raiz AS (SELECT COALESCE(pagina_id, CASE WHEN entidad_tipo = 'pagina' THEN entidad_id END) AS id FROM dominio)
SELECT jsonb_build_object(
  'knowledge_windows', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM paginas p), '[]'::jsonb),
  'sitio_config', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM sitio_config s WHERE s.raiz_id IN (SELECT id FROM raiz)), '[]'::jsonb),
  'sitio_categorias', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM sitio_categorias s WHERE s.raiz_id IN (SELECT id FROM raiz)), '[]'::jsonb),
  'sitio_restricciones', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM sitio_restricciones s WHERE s.raiz_id IN (SELECT id FROM raiz)), '[]'::jsonb),
  'dominios_paginas', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM dominio x), '[]'::jsonb),
  'fotos', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('tabla_titulo', t.titulo, 'nombre', f.valores->>cn.id,
                                        'url', f.valores->>cf.id, 'credito', f.valores->>cl.id))
    FROM bd_tablas t JOIN duena d ON t.creador_user_id = d.id
    JOIN bd_columnas cf ON cf.tabla_id = t.id AND cf.config->>'clave' = 'foto' AND cf.archived_at IS NULL
    LEFT JOIN bd_columnas cn ON cn.tabla_id = t.id AND cn.nombre = 'Nombre' AND cn.archived_at IS NULL
    LEFT JOIN bd_columnas cl ON cl.tabla_id = t.id AND cl.config->>'clave' = 'foto_licencia' AND cl.archived_at IS NULL
    JOIN bd_filas f ON f.tabla_id = t.id AND f.deleted_at IS NULL AND f.archived_at IS NULL AND f.oculta = false
    WHERE t.deleted_at IS NULL AND t.archived_at IS NULL
  ), '[]'::jsonb)
)
SQL

echo "== Exportando el sitio público $DOMINIO (sólo lectura) ==" >&2
if [ "${CARGA_MODO:-produccion}" = "local" ]; then
  # The copy from local.sh: Postgres on 5434, uploads in ./uploads. For testing.
  export PGHOST=localhost PGPORT="${PUERTO_BD:-5434}" PGUSER=humanity PGPASSWORD=humanity_local PGDATABASE=humanity
  L=$(mktemp -d)
  psql -v ON_ERROR_STOP=1 -tAq -c "$CONSULTA" | UPLOADS_DIR="${UPLOADS_DIR:-$PWD/uploads}" node scripts/wikiproducts/exportar.mjs "$L" >&2
  (cd "$L" && tar -C fotos -cf fotos.tar . && rm -rf fotos && tar -cf - paginas.json fotos.json fotos.tar)
  rm -rf "$L"
else
  $COMPOSE exec -T app sh -c "rm -rf /tmp/wikiproducts $DIR"
  tar -C scripts -cf - wikiproducts | $COMPOSE exec -T app tar -C /tmp -xf -
  $COMPOSE exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -tAq -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "$0"' "$CONSULTA" \
    | $COMPOSE exec -T app node /tmp/wikiproducts/exportar.mjs "$DIR" >&2
  $COMPOSE exec -T app sh -c "cd $DIR && tar -C fotos -cf fotos.tar . && rm -rf fotos && tar -cf - paginas.json fotos.json fotos.tar"
fi
echo "== Hecho ==" >&2
