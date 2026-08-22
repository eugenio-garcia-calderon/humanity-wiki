#!/usr/bin/env bash
# ============================================================================
# Restaurar una copia de seguridad (2026-08-22, prog6)
# ============================================================================
# UNA COPIA QUE NUNCA SE HA RESTAURADO NO SE SABE SI SIRVE. Este script existe
# para las dos cosas, y la primera importa más que la segunda:
#
#   bash deploy/copias/restaurar.sh probar                  <- SIN RIESGO
#   bash deploy/copias/restaurar.sh probar humanity-2026-08-22.dump
#
#       Restaura la copia en una base de datos APARTE, cuenta lo que ha
#       entrado y la borra. No toca humanity. Es la única forma de saber que
#       la copia vale ANTES del día que haga falta. Se puede correr cuando sea.
#
#   bash deploy/copias/restaurar.sh restaurar humanity-2026-08-22.dump
#
#       La de verdad: DEVUELVE LA BASE DE DATOS DE PRODUCCIÓN a ese momento.
#       Todo lo ocurrido después se pierde. Pide confirmación escrita y hace
#       un volcado de seguridad de lo que hay AHORA antes de tocar nada.
#
# Se ejecuta en el servidor, desde /opt/humanity-wiki, igual que migrate.sh.
# ============================================================================
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"
MODO="${1:-listar}"
FICHERO="${2:-}"

# Todo pasa dentro del contenedor `copias`, que es el que tiene el volumen
# montado y las herramientas de Postgres de la misma versión que la base.
en_copias() { $COMPOSE exec -T copias bash -c "$1"; }

listar() {
  echo "== Copias disponibles =="
  en_copias 'ls -lh --time-style=+%Y-%m-%d /copias/humanity-*.dump 2>/dev/null | awk "{print \$5, \$6, \$7}"' \
    || echo "   (ninguna todavía)"
  echo
  echo "== Estado de la última =="
  en_copias 'cat /copias/estado.json 2>/dev/null' || echo "   (sin estado)"
}

# La copia más reciente, si no se dice cuál.
ultima() {
  en_copias 'ls -1 /copias/humanity-*.dump 2>/dev/null | sort | tail -1 | xargs -r basename'
}

case "$MODO" in

  listar)
    listar
    echo
    echo "Para comprobar que la última copia sirve, sin tocar nada:"
    echo "  bash deploy/copias/restaurar.sh probar"
    ;;

  probar)
    [ -n "$FICHERO" ] || FICHERO="$(ultima)"
    [ -n "$FICHERO" ] || { echo "No hay ninguna copia que probar."; exit 1; }
    echo "== Probando $FICHERO en una base de datos aparte =="
    echo "   La base de datos de producción NO se toca."

    # Base desechable. Se borra al principio también, por si una prueba
    # anterior se cortó a la mitad y la dejó ahí.
    en_copias '
      set -e
      psql -h "$PGHOST" -U "$PGUSER" -d postgres -q -c "DROP DATABASE IF EXISTS humanity_prueba_copia"
      psql -h "$PGHOST" -U "$PGUSER" -d postgres -q -c "CREATE DATABASE humanity_prueba_copia"
    '

    # `|| true`: pg_restore avisa de extensiones que ya existen (PostGIS) y de
    # permisos de roles que no están en una base recién creada. Son ruido, no
    # fallos. Lo que decide si la copia sirve es el recuento de después.
    en_copias "pg_restore --no-owner --no-privileges -h \$PGHOST -U \$PGUSER -d humanity_prueba_copia /copias/$FICHERO 2>&1 | tail -5 || true"

    echo
    echo "== Lo que ha entrado =="
    en_copias '
      psql -h "$PGHOST" -U "$PGUSER" -d humanity_prueba_copia -q -c "
        SELECT
          (SELECT count(*) FROM information_schema.tables WHERE table_schema = '"'"'public'"'"') AS tablas,
          (SELECT count(*) FROM users)        AS usuarios,
          (SELECT count(*) FROM territories)  AS territorios;"
    '

    en_copias 'psql -h "$PGHOST" -U "$PGUSER" -d postgres -q -c "DROP DATABASE humanity_prueba_copia"'
    echo "== Base de prueba borrada. La copia se restaura. =="
    ;;

  restaurar)
    [ -n "$FICHERO" ] || { echo "Di qué copia: restaurar.sh restaurar humanity-2026-08-22.dump"; exit 1; }

    echo "======================================================================"
    echo " VAS A DEVOLVER LA BASE DE DATOS DE PRODUCCIÓN A $FICHERO"
    echo " Todo lo que hayan hecho los usuarios desde entonces SE PIERDE."
    echo "======================================================================"
    echo
    read -r -p 'Escribe exactamente RESTAURAR PRODUCCION para seguir: ' respuesta
    [ "$respuesta" = "RESTAURAR PRODUCCION" ] || { echo "Cancelado."; exit 1; }

    # Antes de destruir nada, una copia de lo que hay ahora. Si la restauración
    # resulta ser un error, esto es lo único que permite deshacerla.
    marca="antes-de-restaurar-$(date -u +%Y-%m-%dT%H%M%SZ).dump"
    echo "== Guardando lo que hay AHORA en $marca =="
    en_copias "pg_dump -Fc -Z 6 -h \$PGHOST -U \$PGUSER -d \$PGDATABASE -f /copias/$marca"

    # La aplicación se para: restaurar con la app escribiendo deja la base a
    # medias entre dos momentos distintos.
    echo "== Parando la aplicación =="
    $COMPOSE stop app

    echo "== Restaurando =="
    en_copias "pg_restore --clean --if-exists --no-owner --no-privileges -h \$PGHOST -U \$PGUSER -d \$PGDATABASE /copias/$FICHERO 2>&1 | tail -20 || true"

    echo "== Arrancando la aplicación =="
    $COMPOSE start app

    echo
    echo "Hecho. Comprueba humanity.wiki antes de dar esto por bueno."
    echo "Si algo salió mal, lo de antes está en $marca."
    ;;

  *)
    echo "Modos: listar | probar [fichero] | restaurar <fichero>"
    exit 1
    ;;
esac
