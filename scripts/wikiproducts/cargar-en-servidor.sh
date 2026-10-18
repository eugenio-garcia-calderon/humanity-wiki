#!/usr/bin/env bash
# ============================================================================
# LOAD THE WIKIPRODUCTS DATA FROM INSIDE THE SERVER (2026-10-18, W3a)
# ============================================================================
# Eugenio did not want to create an API key by hand («hazlo a través del
# servidor», «resuélvelo tú solo»). So the server makes one for itself, uses it
# and throws it away:
#
#   1. Looks up the owner of the Wikiproducts site (eugenio@lighthumanity.org).
#   2. Makes a random write key IN MEMORY and stores only its sha256 in
#      `api_claves`, exactly as `/desarrolladores` would.
#   3. Runs `crear-esquema.mjs --plantillas` and `cargar.mjs` against the app on
#      127.0.0.1, as that owner. Both are idempotent: a second run only adds
#      what is missing and changes what differs.
#   3b. Runs `expertos.mjs` (W6): the «Consultar a un experto» page, the
#      experts of `expertos.json` (once each; then the panel rules) and the
#      short experts block in every product sheet template. Before step 4,
#      so the «Expertos» menu link that step adds finds the page.
#   4. Runs `enlazar-sitio.mjs`: each table shown in its page of the site, or
#      a visitor sees none of it (a table inherits visibility from its page).
#   5. With WP_FOTOS=si, runs `fotos.mjs`: one photo per product, downloaded
#      from the maker's or a shop's page and stored on this server.
#   6. Deletes the key on exit, whether the load worked or not (`trap`).
#
# The key is never printed, never written to disk and never leaves the server:
# it lives in this shell's environment and is passed to `docker compose exec`
# by name (`-e HW_API_KEY`), so it does not show up in any command line.
# The rows are written through /api/v1, so the ordinary permission checks apply:
# the key can only touch what its owner can, and nobody else's data.
#
# Production, from /opt/humanity-wiki (the workflow `cargar-wikiproducts.yml`
# does this):   bash scripts/wikiproducts/cargar-en-servidor.sh
# Local copy, after `scripts/wikiproducts/local.sh`:
#               CARGA_MODO=local bash scripts/wikiproducts/cargar-en-servidor.sh
set -euo pipefail

EMAIL="${CARGA_EMAIL:-eugenio@lighthumanity.org}"
NOMBRE_CLAVE="Carga Wikiproducts (temporal, se borra sola)"
MODO="${CARGA_MODO:-produccion}"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

if [ "$MODO" = "local" ]; then
  # The copy from local.sh: Postgres in a container on 5434, server on the host.
  export PGHOST=localhost PGPORT="${PUERTO_BD:-5434}" PGUSER=humanity PGPASSWORD=humanity_local PGDATABASE=humanity
  BASE="http://127.0.0.1:${PUERTO:-3005}"
  sql() { psql -v ON_ERROR_STOP=1 -tAqc "$1"; }
  nodo() { HW_API_KEY="$HW_API_KEY" node "scripts/wikiproducts/$1" --base "$BASE" "${@:2}"; }
else
  BASE="http://127.0.0.1:3000"
  sql() {
    $COMPOSE exec -T db sh -c \
      'psql -v ON_ERROR_STOP=1 -tAq -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "$0"' "$1"
  }
  # The app image only carries dist/ and public/, so the loader and its data are
  # copied into the running container first (a tar stream, nothing on disk).
  $COMPOSE exec -T app sh -c 'rm -rf /tmp/wikiproducts'
  tar -C scripts -cf - wikiproducts | $COMPOSE exec -T app tar -C /tmp -xf -
  # The photos are stored here and served from the public address.
  export WP_URL_PUBLICA="${WP_URL_PUBLICA:-https://humanity.wiki}"
  nodo() { $COMPOSE exec -T -e HW_API_KEY -e WP_URL_PUBLICA app node "/tmp/wikiproducts/$1" --base "$BASE" "${@:2}"; }
fi

USUARIO=$(sql "SELECT id FROM users WHERE lower(email) = lower('$EMAIL')")
[ -n "$USUARIO" ] || { echo "No existe la cuenta $EMAIL en esta base de datos."; exit 1; }

# A run that was killed before its trap could fire leaves a key behind: clear
# those first. They are recognised by name and owner, never anyone else's.
sql "DELETE FROM api_claves WHERE user_id = '$USUARIO' AND nombre = '$NOMBRE_CLAVE'" >/dev/null

ID_CLAVE="K_CARGA_WP_$(date +%s)"
borrar_clave() {
  sql "DELETE FROM api_claves WHERE id = '$ID_CLAVE'" >/dev/null 2>&1 \
    && echo "== Clave temporal borrada ==" \
    || echo "AVISO: no se ha podido borrar la clave temporal $ID_CLAVE; bórrala a mano."
  [ "$MODO" = "local" ] || $COMPOSE exec -T app sh -c 'rm -rf /tmp/wikiproducts' >/dev/null 2>&1 || true
}
trap borrar_clave EXIT
trap 'exit 130' INT TERM HUP

# Same shape as the keys /desarrolladores hands out: hw_live_ + 32 random bytes.
HW_API_KEY="hw_live_$(head -c 32 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=\n')"
export HW_API_KEY
HASH=$(printf '%s' "$HW_API_KEY" | sha256sum | cut -d' ' -f1)
sql "INSERT INTO api_claves (id, user_id, nombre, prefijo, hash, alcance)
     VALUES ('$ID_CLAVE', '$USUARIO', '$NOMBRE_CLAVE', 'hw_live_····', '$HASH', 'escritura')" >/dev/null
echo "== Clave temporal creada para $EMAIL (no se muestra) =="

echo "== Esquema: tablas, columnas y plantillas de ficha =="
nodo crear-esquema.mjs --plantillas

echo "== Datos: marcas, distribuidores, productos, afirmaciones, retiradas y ofertas =="
nodo cargar.mjs

echo "== Expertos: su página, sus fichas y el recuadro en cada producto =="
# Before enlazar-sitio.mjs: that one adds the «Expertos» menu link, and only
# to a page «Consultar a un experto» that already exists. Not fatal: without
# it the site still loads, it just offers no experts.
nodo expertos.mjs || echo "AVISO: el paso de expertos ha fallado (arriba dice por qué); el resto de la carga sigue."

echo "== Sitio: cada tabla en su página, para que la vea quien visita =="
nodo enlazar-sitio.mjs

# Only when asked (`fotos=si` in the workflow): it reads a page per product.
if [ "${WP_FOTOS:-no}" = "si" ]; then
  echo "== Fotos: una por producto, de la marca o de la tienda, guardada aquí =="
  nodo fotos.mjs
fi
