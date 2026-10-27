#!/bin/sh
# ver.sh nombre -> renderiza todas las páginas nombre_pN.html
cd "$(dirname "$0")"
for f in "$1"_p*.html; do b="${f%.html}"; ./render.sh "$b" 1400 770 >/dev/null; echo "$b.png"; done
