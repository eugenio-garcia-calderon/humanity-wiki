# Calendario Arte para la Humanidad — illustration sources

`ilustraciones-fuente/mes-XX.svg` are the vector sources of the twelve final
illustrations. They are **not** served: they take 9-50 s to render because of the
full-canvas paint filters, so the site and the print export use the JPG renders in
`public/calendario-arte/ilustraciones/mes-XX.jpg` (3508 px wide ≈ 300 ppi on A4).

To regenerate a JPG after editing a source:

```bash
rsvg-convert -w 3508 design/calendario-arte/ilustraciones-fuente/mes-01.svg -o /tmp/mes-01.png
python3 -c "from PIL import Image; Image.open('/tmp/mes-01.png').convert('RGB').save('public/calendario-arte/ilustraciones/mes-01.jpg', quality=90, optimize=True, progressive=True)"
```

`public/calendario-arte/bocetos/` keeps the first composition sketches.
