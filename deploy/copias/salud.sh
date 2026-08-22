#!/usr/bin/env bash
# ============================================================================
# ¿Se está haciendo la copia? (2026-08-22, prog6)
# ============================================================================
# Es el `healthcheck` del servicio `copias`. Existe porque el fallo peligroso
# de una copia de seguridad no es que falle: es que DEJE DE HACERSE EN SILENCIO
# y nadie se entere hasta el día que hace falta.
#
# Sale 1 —y el contenedor aparece como `unhealthy` en `docker ps`— si la última
# copia salió mal o si tiene más de 36 horas. 36 y no 24 para que un volcado
# lento o un reinicio a deshora no den un falso aviso.
# ============================================================================
set -uo pipefail

ESTADO="${COPIAS_DIR:-/copias}/estado.json"

[ -f "$ESTADO" ] || { echo "todavía no hay ninguna copia ($ESTADO no existe)"; exit 1; }

resultado="$(grep -o '"resultado": *"[^"]*"' "$ESTADO" | cut -d'"' -f4)"
momento="$(grep -o '"momento": *"[^"]*"' "$ESTADO" | cut -d'"' -f4)"

[ "$resultado" = "ok" ] || { echo "la última copia falló: $resultado"; exit 1; }

edad=$(( $(date -u +%s) - $(date -u -d "$momento" +%s) ))
if [ "$edad" -gt 129600 ]; then
  echo "la última copia es de hace $((edad / 3600)) h ($momento) — más de 36"
  exit 1
fi

echo "última copia hace $((edad / 3600)) h, correcta"
