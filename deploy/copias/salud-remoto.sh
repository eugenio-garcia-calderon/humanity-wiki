#!/bin/sh
# ============================================================================
# ¿Están llegando los volcados fuera de Hetzner? (2026-08-22, prog6)
# ============================================================================
# `healthcheck` del servicio `copias-remoto`.
#
# SIN CONFIGURAR SALE SANO, y es una decisión, no un descuido: un contenedor
# permanentemente en rojo enseña a la gente a ignorar el rojo, y el día que se
# ponga rojo de verdad nadie lo mirará. Que falte configurar se dice en el
# registro y se le cuenta a Eugenio; no se grita para siempre en `docker ps`.
# ============================================================================
set -u

ESTADO="${COPIAS_DIR:-/copias}/estado-remoto.json"

[ -f "$ESTADO" ] || { echo "el servicio no ha llegado a escribir su estado"; exit 1; }

leer() { grep -o "\"$1\": *\"[^\"]*\"" "$ESTADO" | cut -d'"' -f4; }

resultado="$(leer resultado)"
momento="$(leer momento)"
# El instante va tambien en segundos porque este contenedor es Alpine y el
# `date` de busybox no sabe leer un ISO-8601 con T y Z. Un numero no se
# interpreta mal en ningun sitio.
epoch="$(grep -o '"epoch": *[0-9]*' "$ESTADO" | tr -dc 0-9)"

case "$resultado" in
  sin_configurar)
    echo "sin configurar: no se sube nada fuera de Hetzner (a propósito, ver CLAUDE.md)"
    exit 0
    ;;
  ok) ;;
  *)
    echo "la última subida falló: $resultado"
    exit 1
    ;;
esac

edad=$(( $(date -u +%s) - ${epoch:-0} ))
if [ "$edad" -gt 129600 ]; then
  echo "la última subida correcta es de hace $((edad / 3600)) h ($momento) — más de 36"
  exit 1
fi

echo "última subida hace $((edad / 3600)) h, correcta"
