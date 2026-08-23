#!/bin/sh
# ============================================================================
# Sacar los volcados FUERA de Hetzner (2026-08-22, prog6)
# ============================================================================
# El servicio `copias` deja un volcado al día en un volumen del servidor. Eso
# protege del error humano —recuperar una tabla, volver atrás dos semanas— pero
# NO protege de perder el servidor ni la cuenta: la copia está en el mismo sitio
# que el original.
#
# Esto lo arregla: sube cada volcado nuevo a un almacenamiento de otro
# proveedor. Petición de Eugenio, 2026-08-22: «hagamos el volcado de copia de
# base de datos fuera de hetzner».
#
# SE COPIA, NO SE SINCRONIZA, y es a propósito. `rclone sync` haría que el
# destino fuera un espejo del origen — y entonces un fallo que vaciara /copias
# borraría también la copia de fuera, que es justo de lo que esto protege.
# `rclone copy` solo añade. A 1,3 MB al día son ~475 MB al año, y R2 regala los
# primeros 10 GB: décadas antes de que sea un problema. Si algún día lo es, se
# borra a mano, con la cabeza puesta.
#
# SIN CONFIGURAR NO PASA NADA. Si no hay credenciales, este servicio lo dice y
# se queda quieto. No se cae, no ensucia los avisos y no impide que el volcado
# local se siga haciendo.
# ============================================================================
set -u

ORIGEN="${COPIAS_DIR:-/copias}"
# Solo se pide el nombre del cubo; el «fuera:» es el nombre interno que
# docker-compose le da al proveedor a traves de las variables RCLONE_CONFIG_*.
# Asi Eugenio escribe `humanity-copias` y no `fuera:humanity-copias`.
CUBO="${COPIAS_REMOTO_CUBO:-}"
DESTINO=""
[ -n "$CUBO" ] && DESTINO="fuera:$CUBO"
ESTADO="$ORIGEN/estado-remoto.json"

log() { echo "[remoto] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"; }

escribir_estado() { # resultado, subidos, detalle
  cat > "$ESTADO" <<JSON
{
  "resultado": "$1",
  "momento": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "epoch": $(date -u +%s),
  "destino": "$DESTINO",
  "ficheros_en_destino": $2,
  "detalle": "$3"
}
JSON
}

if [ -z "$DESTINO" ]; then
  log "sin configurar: falta COPIAS_REMOTO_CUBO — no se sube nada"
  log "cómo se configura: deploy/copias/CLAUDE.md"
  escribir_estado "sin_configurar" 0 "faltan las variables COPIAS_REMOTO_* en .env.production"
  # Quieto, pero vivo: así el día que se configuren las credenciales basta con
  # reiniciar el servicio, sin tocar el compose.
  while true; do sleep 3600; done
fi

log "subiendo a $DESTINO cada 15 min — solo añade, nunca borra"

while true; do
  # --ignore-existing: lo que ya está arriba no se vuelve a subir ni a
  # comparar. Los volcados no cambian una vez escritos, así que basta con el
  # nombre; y evita leer 400 MB de histórico cada cuarto de hora.
  #
  # Reintentos cortos a propósito: si el destino no responde, insistir cinco
  # minutos aquí dentro no arregla nada. Se vuelve a intentar en un cuarto de
  # hora, y mientras tanto el estado dice la verdad en vez de quedarse en
  # blanco — que es lo que veríamos si esto se quedara colgado reintentando.
  # DOS PATRONES, NO UNO (2026-08-23). Los volcados diarios se llaman
  # `humanity-*`; los que se hacen a mano justo antes de una migración se llaman
  # `antes-de-*`. Al principio solo subían los primeros — y eso dejaba fuera
  # precisamente los que existen porque algo puede salir mal, viviendo solo en
  # la máquina que podría ser lo que salga mal. Lo destapó prog7 pidiendo uno.
  salida="$(rclone copy "$ORIGEN" "$DESTINO" \
      --include 'humanity-*.dump' \
      --include 'antes-de-*.dump' \
      --ignore-existing \
      --transfers 2 \
      --retries 2 --low-level-retries 3 --contimeout 20s --timeout 120s \
      --stats-one-line --stats 0 2>&1)"
  codigo=$?

  if [ "$codigo" -ne 0 ]; then
    log "ERROR al subir (código $codigo)"
    echo "$salida" | sed 's/^/[remoto]   /'
    # Sin comillas ni saltos, que esto acaba dentro de un JSON.
    escribir_estado "error" 0 "$(echo "$salida" | tr -d '\n"' | cut -c1-300)"
  else
    # LA COMPROBACIÓN QUE IMPORTA: no «he subido», sino «cuántas hay allí».
    # Un `rclone copy` que no encuentra nada que subir también sale con 0.
    n="$(rclone lsf "$DESTINO" --include '*.dump' 2>/dev/null | wc -l | tr -d ' ')"
    if [ "${n:-0}" -eq 0 ]; then
      log "ERROR: el destino responde pero no hay ni un volcado en él"
      escribir_estado "error" 0 "el destino esta vacio despues de copiar"
    else
      log "al día: $n volcado(s) en $DESTINO"
      escribir_estado "ok" "$n" ""
    fi
  fi

  sleep 900
done
