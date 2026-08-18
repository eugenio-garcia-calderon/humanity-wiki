#!/usr/bin/env bash
# ============================================================================
# Aplicador de migraciones en producción (2026-08-18)
# ============================================================================
# Hasta hoy las migraciones se aplicaban A MANO por SSH después de cada
# despliegue, y eso ya causó un despliegue con la tabla sin crear. Ahora el
# propio despliegue las aplica: se ejecuta ANTES de reconstruir la app, así
# que si una migración falla, el código nuevo no llega a arrancar.
#
# Lleva su propio registro en `schema_migrations`: cada fichero de drizzle/ se
# aplica UNA sola vez, en orden, dentro de una transacción.
#
# Se ejecuta en el servidor, desde /opt/humanity-wiki:
#   bash deploy/migrate.sh
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

# La última migración que YA estaba aplicada en producción cuando se automatizó
# esto (confirmado en memory/08_CHANGELOG.md: 0025/0026 aplicadas el 2026-08-07,
# 0027 y 0028 desplegadas después). Todo lo anterior o igual se da por hecho la
# primera vez; a partir de aquí, el registro manda.
BASELINE="0028_presentaciones.sql"

# psql dentro del contenedor: usuario y base salen de las variables que el
# propio contenedor ya tiene, así que no hay que repetir credenciales aquí.
psql_c() { # una sentencia, devuelve el valor pelado
  $COMPOSE exec -T db sh -c \
    'psql -v ON_ERROR_STOP=1 -tAq -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "$0"' "$1"
}
psql_f() { # un fichero entero, todo o nada
  $COMPOSE exec -T db sh -c \
    'psql -v ON_ERROR_STOP=1 -q --single-transaction -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$1"
}

echo "== Migraciones: esperando a la base de datos =="
$COMPOSE up -d db
for i in $(seq 1 30); do
  if $COMPOSE exec -T db sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
    break
  fi
  [ "$i" = "30" ] && { echo "La base de datos no responde tras 60s."; exit 1; }
  sleep 2
done

psql_c "CREATE TABLE IF NOT EXISTS schema_migrations (
          filename text PRIMARY KEY,
          applied_at timestamptz NOT NULL DEFAULT now())" >/dev/null

# --- Línea base, solo la primera vez y solo si la base YA tiene el esquema ---
# (en una base nueva y vacía no se marca nada: se aplica todo desde 0000).
registradas=$(psql_c "SELECT count(*) FROM schema_migrations")
hay_esquema=$(psql_c "SELECT to_regclass('public.users') IS NOT NULL")
if [ "$registradas" = "0" ] && [ "$hay_esquema" = "t" ]; then
  echo "== Primera vez: marcando como aplicadas las migraciones hasta $BASELINE =="
  for f in drizzle/*.sql; do
    n=$(basename "$f")
    if [ ! "$n" \> "$BASELINE" ]; then
      psql_c "INSERT INTO schema_migrations (filename) VALUES ('$n') ON CONFLICT DO NOTHING" >/dev/null
    fi
  done
fi

# --- Aplicar lo que falte, en orden ---
pendientes=0
for f in $(ls drizzle/*.sql | sort); do
  n=$(basename "$f")
  ya=$(psql_c "SELECT 1 FROM schema_migrations WHERE filename = '$n'")
  [ "$ya" = "1" ] && continue
  echo "-> aplicando $n"
  psql_f "$f"
  psql_c "INSERT INTO schema_migrations (filename) VALUES ('$n')" >/dev/null
  pendientes=$((pendientes + 1))
done

if [ "$pendientes" = "0" ]; then
  echo "== Sin migraciones pendientes =="
else
  echo "== $pendientes migración(es) aplicada(s) =="
fi
