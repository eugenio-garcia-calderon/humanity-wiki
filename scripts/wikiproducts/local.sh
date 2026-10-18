#!/usr/bin/env bash
# ============================================================================
# UNA COPIA LOCAL DE WIKI CREATOR PARA WIKIPRODUCTS (2026-10-18, frente W0)
# ============================================================================
# Arranca la plataforma entera en esta máquina, con su propia base de datos y
# datos de PRUEBA, sin tocar producción. La usan el bot evaluador del MVP y
# cualquiera que quiera probar un bloque antes de abrir un PR.
#
#   bash scripts/wikiproducts/local.sh            arranca (o dice que ya está)
#   bash scripts/wikiproducts/local.sh parar      para el servidor y la base
#   bash scripts/wikiproducts/local.sh borrar     lo anterior y borra la base
#
# Lo que hace, en orden:
#   1. Postgres con PostGIS en Docker (contenedor `wikiproducts-db`, puerto
#      5434: el 5433 es el de `humanity-db` del CLAUDE.md y no se pisa).
#   2. Todas las migraciones de drizzle/, una vez cada una, apuntadas en
#      `schema_migrations` igual que `deploy/migrate.sh` en producción.
#   3. Dos cuentas: la administradora (eugenio@lighthumanity.org, como en
#      producción) y un miembro normal. Contraseñas sólo de esta copia.
#   4. Una clave de API de escritura para la administradora, creada en la base
#      como la crearía la pantalla «Desarrolladores».
#   5. El servidor en el puerto 3005 (el 3000–3002 son de los programadores).
#   6. Una página «PRUEBA Wikiproducts» creada POR LA API con esa clave: si
#      sale, la clave y la API funcionan. Si existe `scripts/wikiproducts/
#      cargar.mjs` (frente W3), se ejecuta después contra esta copia.
#
# Todo lo que hace falta para hablar con la copia queda en
# `.env.wikiproducts-local` (ignorado por git, como todo `.env*`):
#   HW_URL, HW_API_KEY, y las dos cuentas con su contraseña.
#
# Variables que se pueden cambiar: PUERTO (3005), PUERTO_BD (5434).
# ============================================================================
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$RAIZ"

PUERTO="${PUERTO:-3005}"
PUERTO_BD="${PUERTO_BD:-5434}"
CONTENEDOR="wikiproducts-db"
IMAGEN="${IMAGEN:-imresamu/postgis:17-3.5}"   # la oficial no tiene arm64 (ver CLAUDE.md)
ESTADO="${TMPDIR:-/tmp}/wikiproducts-local"
ENV_LOCAL="$RAIZ/.env.wikiproducts-local"
mkdir -p "$ESTADO"

export PGOPTIONS='-c client_min_messages=warning'
export PGHOST=localhost PGPORT="$PUERTO_BD" PGUSER=humanity PGPASSWORD=humanity_local PGDATABASE=humanity

parar_servidor() {
  if [ -f "$ESTADO/servidor.pid" ] && kill -0 "$(cat "$ESTADO/servidor.pid")" 2>/dev/null; then
    kill "$(cat "$ESTADO/servidor.pid")" && echo "Servidor parado."
  fi
  rm -f "$ESTADO/servidor.pid"
}

case "${1:-arrancar}" in
  parar)  parar_servidor; docker stop "$CONTENEDOR" >/dev/null 2>&1 && echo "Base de datos parada."; exit 0 ;;
  borrar) parar_servidor; docker rm -f "$CONTENEDOR" >/dev/null 2>&1 && echo "Base de datos borrada."; rm -f "$ENV_LOCAL"; exit 0 ;;
  arrancar) ;;
  *) echo "Uso: $0 [arrancar|parar|borrar]"; exit 2 ;;
esac

for prog in docker psql node curl; do
  command -v "$prog" >/dev/null || { echo "Falta «$prog» en esta máquina."; exit 1; }
done
docker info >/dev/null 2>&1 || { echo "Docker no responde. Arráncalo (en Linux: «sudo dockerd &») y vuelve a probar."; exit 1; }
[ -d node_modules ] || { echo "== Instalando dependencias =="; npm ci --legacy-peer-deps --no-audit --no-fund; }

# ── 1. La base de datos ─────────────────────────────────────────────────────
if ! docker ps --format '{{.Names}}' | grep -qx "$CONTENEDOR"; then
  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTENEDOR"; then
    docker start "$CONTENEDOR" >/dev/null
  else
    echo "== Creando la base de datos ($IMAGEN, puerto $PUERTO_BD) =="
    docker run -d --name "$CONTENEDOR" -p "$PUERTO_BD:5432" \
      -e POSTGRES_DB=humanity -e POSTGRES_USER=humanity -e POSTGRES_PASSWORD=humanity_local \
      "$IMAGEN" >/dev/null
  fi
fi
for i in $(seq 1 60); do
  # `pg_isready` dice que sí mientras la imagen todavía instala PostGIS y
  # reinicia; una consulta de verdad no.
  psql -tAqc 'SELECT 1' >/dev/null 2>&1 && break
  [ "$i" = 60 ] && { echo "La base de datos no responde tras 60 s."; exit 1; }
  sleep 1
done

# ── 2. Las migraciones ──────────────────────────────────────────────────────
psql -qc "CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())" >/dev/null
pendientes=0
for f in $(ls drizzle/*.sql | sort); do
  n=$(basename "$f")
  [ "$(psql -tAqc "SELECT 1 FROM schema_migrations WHERE filename = '$n'")" = "1" ] && continue
  if ! psql -v ON_ERROR_STOP=1 -q --single-transaction -f "$f" >"$ESTADO/migracion.log" 2>&1; then
    echo "La migración $n ha fallado:"; tail -5 "$ESTADO/migracion.log"; exit 1
  fi
  psql -qc "INSERT INTO schema_migrations (filename) VALUES ('$n')" >/dev/null
  pendientes=$((pendientes + 1))
done
echo "== Migraciones: $pendientes aplicadas ahora, $(psql -tAqc 'SELECT count(*) FROM schema_migrations') en total =="

# ── 3 y 4. Cuentas y clave (sólo la primera vez) ────────────────────────────
if [ ! -f "$ENV_LOCAL" ]; then
  aleatorio() { node -e "process.stdout.write(require('crypto').randomBytes($1).toString('base64url'))"; }
  CLAVE_ADMIN="local-$(aleatorio 9)"
  CLAVE_MIEMBRO="local-$(aleatorio 9)"
  HW_API_KEY="hw_live_$(aleatorio 32)"
  cat > "$ENV_LOCAL" <<EOF
# Copia local de Wikiproducts (scripts/wikiproducts/local.sh). Sólo vale aquí.
HW_URL=http://localhost:$PUERTO
HW_API_KEY=$HW_API_KEY
ADMIN_EMAIL=eugenio@lighthumanity.org
ADMIN_PASSWORD=$CLAVE_ADMIN
MIEMBRO_EMAIL=miembro.prueba@wikiproducts.local
MIEMBRO_PASSWORD=$CLAVE_MIEMBRO
EOF
fi
set -a; . "$ENV_LOCAL"; set +a

# Lo que lee el servidor. `src/db/index.ts` no lee puerto: lo saca de PGPORT.
ENV_SERVIDOR="$ESTADO/servidor.env"
cat > "$ENV_SERVIDOR" <<EOF
NODE_ENV=development
PORT=$PUERTO
SQL_HOST=localhost
SQL_DB_NAME=humanity
SQL_USER=humanity
SQL_PASSWORD=humanity_local
PGPORT=$PUERTO_BD
EOF
[ -f "$RAIZ/.env.wikiproducts-extra" ] && cat "$RAIZ/.env.wikiproducts-extra" >> "$ENV_SERVIDOR"

# Cada cuenta por separado: si una vuelta anterior se cortó entre las dos, la
# segunda tiene que crearse igual.
cuenta_existe() { [ "$(psql -tAqc "SELECT count(*) FROM users WHERE lower(email) = lower('$1')")" != "0" ]; }
cuenta_existe "$ADMIN_EMAIL" || { echo "== Creando la cuenta administradora =="; node --env-file="$ENV_SERVIDOR" node_modules/.bin/tsx src/db/seed-admin-user.ts >/dev/null; }
cuenta_existe "$MIEMBRO_EMAIL" || { echo "== Creando el miembro de prueba =="; node --env-file="$ENV_SERVIDOR" node_modules/.bin/tsx scripts/wikiproducts/sembrar-miembro.ts; }
ADMIN_ID=$(psql -tAqc "SELECT id FROM users WHERE lower(email) = lower('$ADMIN_EMAIL')")
HASH=$(printf '%s' "$HW_API_KEY" | sha256sum | cut -d' ' -f1)
psql -qc "INSERT INTO api_claves (id, user_id, nombre, prefijo, hash, alcance)
          VALUES ('K_PRUEBA_LOCAL', '$ADMIN_ID', 'PRUEBA copia local', '${HW_API_KEY:0:12}', '$HASH', 'escritura')
          ON CONFLICT (id) DO UPDATE SET hash = EXCLUDED.hash, prefijo = EXCLUDED.prefijo, revocada_en = NULL" >/dev/null

# ── 5. El servidor ──────────────────────────────────────────────────────────
if curl -fsS -o /dev/null "http://localhost:$PUERTO/" 2>/dev/null; then
  echo "== El servidor ya estaba arrancado en http://localhost:$PUERTO =="
else
  echo "== Arrancando el servidor en http://localhost:$PUERTO (registro: $ESTADO/servidor.log) =="
  nohup node --env-file="$ENV_SERVIDOR" node_modules/.bin/tsx server.ts >"$ESTADO/servidor.log" 2>&1 &
  echo $! > "$ESTADO/servidor.pid"
  for i in $(seq 1 120); do
    curl -fsS -o /dev/null "http://localhost:$PUERTO/" 2>/dev/null && break
    kill -0 "$(cat "$ESTADO/servidor.pid")" 2>/dev/null || { echo "El servidor se ha caído al arrancar:"; tail -20 "$ESTADO/servidor.log"; exit 1; }
    [ "$i" = 120 ] && { echo "El servidor no contesta tras 120 s:"; tail -20 "$ESTADO/servidor.log"; exit 1; }
    sleep 1
  done
fi

# ── 6. Datos de prueba, por la API ──────────────────────────────────────────
api() { curl -fsS -H "Authorization: Bearer $HW_API_KEY" -H 'Content-Type: application/json' "$@"; }
if ! api "$HW_URL/api/v1/pages?limit=100" | grep -q '"PRUEBA Wikiproducts"'; then
  MD=$(cat <<'EOF'
# PRUEBA Wikiproducts

Página de prueba creada por `scripts/wikiproducts/local.sh` a través de la API. Se puede borrar.

```bloque
{"tipo": "comparador", "datos": {"nota": "PRUEBA: bloque de datos escrito en markdown"}}
```
EOF
)
  api -X POST "$HW_URL/api/v1/pages" -d "$(node -e 'process.stdout.write(JSON.stringify({title:"PRUEBA Wikiproducts", markdown:process.argv[1]}))' "$MD")" >/dev/null \
    && echo "== API: página «PRUEBA Wikiproducts» creada con la clave local ==" \
    || { echo "La API no ha aceptado la clave local: mira $ESTADO/servidor.log"; exit 1; }
else
  echo "== API: la clave local funciona (la página de prueba ya existía) =="
fi

if [ -f scripts/wikiproducts/cargar.mjs ]; then
  echo "== Cargando los datos de Wikiproducts (cargar.mjs) =="
  node scripts/wikiproducts/cargar.mjs
fi

cat <<EOF

Lista. Copia local en $HW_URL
  Administradora: $ADMIN_EMAIL
  Miembro:        $MIEMBRO_EMAIL
  Contraseñas y clave de API: $ENV_LOCAL
Para pararla: bash scripts/wikiproducts/local.sh parar
EOF
