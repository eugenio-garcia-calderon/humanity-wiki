#!/usr/bin/env bash
# ============================================================================
# Copias de seguridad de la base de datos (2026-08-22, prog6)
# ============================================================================
# Hasta hoy humanity.wiki NO TENÍA NINGUNA COPIA. Los datos vivían en un único
# volumen de un único servidor: `docs/13_DEPLOY.md` daba la casilla por
# pendiente desde agosto y no había ni un `pg_dump` en el repositorio.
#
# Esto corre DENTRO de un contenedor propio, junto a la base de datos, y hace
# un volcado lógico al día. El volcado se guarda en un volumen del servidor,
# así que la copia de disco de Hetzner se lo lleva fuera de la máquina sin que
# nadie haga nada.
#
# POR QUÉ UN VOLCADO Y NO SOLO LA FOTO DE DISCO DE HETZNER: la foto devuelve el
# servidor ENTERO a un momento — no puedes recuperar una sola página que un
# usuario borró por error sin perder todo lo demás. Y fotografía Postgres en
# marcha, como un corte de luz: normalmente se recupera, pero no lo sabes
# hasta que restauras. Un volcado sale coherente por definición y se comprueba.
# Las dos juntas, no una en vez de la otra.
#
# POR QUÉ NO UN `cron` EN EL SERVIDOR: `deploy/CLAUDE.md` tiene escrito lo que
# pasa cuando alguien crea cosas a mano en el servidor — un directorio de root
# tumbó un despliegue entero el 2026-08-22. Un servicio de compose viaja en el
# repositorio, sobrevive al `git reset --hard` del despliegue porque ES el
# repositorio, y no necesita que nadie entre por SSH a instalarlo.
#
# UNA AL DÍA, EN CUANTO SE PUEDE, y no a una hora fija: si el contenedor se
# reinicia (un despliegue, un corte) no se salta el día. Cuesta que el volcado
# caiga a una hora cualquiera; a cambio nunca hay un día sin copia, que es el
# fallo que importa.
# ============================================================================
set -uo pipefail

DESTINO="${COPIAS_DIR:-/copias}"
DIAS="${COPIAS_DIAS:-14}"          # cuántas copias diarias se conservan
MESES="${COPIAS_MESES:-6}"         # la del día 1 de cada mes se guarda más
ESTADO="$DESTINO/estado.json"

mkdir -p "$DESTINO"

log() { echo "[copias] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"; }

# Deja constancia de cómo fue la última copia. El `healthcheck` lee esto: si la
# última tiene más de 36 horas o salió mal, el contenedor sale como `unhealthy`
# y `docker ps` lo enseña. Una copia que dejó de hacerse en silencio es lo
# mismo que no tener copias, y esta es la forma más barata de que se note.
escribir_estado() { # resultado, fichero, bytes, objetos, detalle
  cat > "$ESTADO" <<JSON
{
  "resultado": "$1",
  "momento": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "fichero": "$2",
  "bytes": $3,
  "objetos": $4,
  "detalle": "$5"
}
JSON
}

hacer_copia() {
  local dia fichero temporal bytes objetos
  dia="$(date -u +%Y-%m-%d)"
  fichero="$DESTINO/humanity-$dia.dump"
  temporal="$fichero.parcial"

  log "volcando $PGDATABASE -> $(basename "$fichero")"

  # -Fc: formato propio de Postgres, comprimido y restaurable por partes (una
  # sola tabla, si hace falta). -Z 6: compresión media, el servidor tiene CPU
  # de sobra pero la base comparte máquina con la aplicación.
  if ! pg_dump -Fc -Z 6 -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f "$temporal" 2>/tmp/pg_dump.err; then
    log "ERROR: pg_dump falló"
    sed 's/^/[copias]   /' /tmp/pg_dump.err
    rm -f "$temporal"
    escribir_estado "error" "" 0 0 "pg_dump falló: $(tr -d '\n"' < /tmp/pg_dump.err | cut -c1-300)"
    return 1
  fi

  # UNA COPIA QUE NO SE COMPRUEBA NO ES UNA COPIA. `pg_restore --list` lee el
  # índice del fichero entero: si el volcado se cortó a medias, aquí falla.
  # No prueba que los datos estén bien, prueba que el fichero está completo y
  # que Postgres sabe leerlo, que es lo que falla de verdad.
  objetos="$(pg_restore --list "$temporal" 2>/dev/null | grep -c '^[0-9]')"
  if [ "${objetos:-0}" -lt 50 ]; then
    log "ERROR: el volcado solo tiene ${objetos:-0} objetos — no me lo creo, lo tiro"
    rm -f "$temporal"
    escribir_estado "error" "" 0 "${objetos:-0}" "el volcado salió con ${objetos:-0} objetos, mínimo 50"
    return 1
  fi

  # El `mv` es el último paso a propósito: mientras el volcado está a medias se
  # llama `.parcial`, así que un corte nunca deja un fichero con nombre bueno y
  # contenido roto que luego alguien intente restaurar.
  mv "$temporal" "$fichero"
  bytes="$(stat -c%s "$fichero")"
  log "hecha: $(basename "$fichero"), $((bytes / 1024)) KB, $objetos objetos"
  escribir_estado "ok" "$(basename "$fichero")" "$bytes" "$objetos" ""
  return 0
}

rotar() {
  local guardar limite_mensual
  # Las diarias: se conservan las últimas $DIAS.
  guardar="$(ls -1 "$DESTINO"/humanity-*.dump 2>/dev/null | sort | tail -n "$DIAS")"
  # Y las del día 1 de cada mes aguantan $MESES, para poder volver atrás más
  # de dos semanas sin guardar 180 ficheros.
  limite_mensual="$(date -u -d "$MESES months ago" +%Y-%m-%d 2>/dev/null || echo 0000-00-00)"

  for f in "$DESTINO"/humanity-*.dump; do
    [ -e "$f" ] || continue
    local dia
    dia="$(basename "$f" .dump)"; dia="${dia#humanity-}"
    # ¿está entre las últimas diarias?
    echo "$guardar" | grep -qx "$f" && continue
    # ¿es la del día 1 y aún no ha caducado?
    if [ "${dia: -2}" = "01" ] && [ "$dia" \> "$limite_mensual" ]; then
      continue
    fi
    log "rotando: borro $(basename "$f")"
    rm -f "$f"
  done
}

log "servicio de copias en marcha — destino $DESTINO, $DIAS diarias y $MESES meses"

while true; do
  dia="$(date -u +%Y-%m-%d)"
  if [ ! -f "$DESTINO/humanity-$dia.dump" ]; then
    if hacer_copia; then
      rotar
    fi
  fi
  # Cada cuarto de hora se mira si falta la del día. Barato y se recupera solo
  # de cualquier reinicio.
  sleep 900
done
