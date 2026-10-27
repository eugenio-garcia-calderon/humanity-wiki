#!/bin/sh
# render.sh nombre ancho alto  -> nombre.png desde nombre.html
cd "$(dirname "$0")"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --timeout=6000 --user-data-dir="$PWD/chrome-prof" --window-size=${2:-1400},${3:-1000} --screenshot="$PWD/$1.png" "file://$PWD/$1.html" >/dev/null 2>&1
ls -la "$1.png" | awk '{print $5, $9}'
