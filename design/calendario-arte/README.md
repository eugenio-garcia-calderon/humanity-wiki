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

The cover uses 900 px thumbnails in `public/calendario-arte/miniaturas/mes-XX.jpg`.
After replacing a final JPG, regenerate its thumbnail:

```bash
python3 -c "from PIL import Image; im=Image.open('public/calendario-arte/ilustraciones/mes-01.jpg'); im.resize((900, round(im.height*900/im.width)), Image.LANCZOS).save('public/calendario-arte/miniaturas/mes-01.jpg', quality=85, optimize=True, progressive=True)"
```

## Illustrations as movable elements (capas, since 2026-11-12)

Eugenio: «en las nuevas ilustraciones a partir de ahora, créalas de tal manera que
cada elemento de la ilustración puedas pincharlo y arrastrarlo… y hacerlo más grande
o más pequeño». **Every new illustration drawn in this repo is drawn this way.** The
first two are June and May, design 4 (`mes-06-d`, `mes-05-d`).

How a generator does it (see `generadores/diseno4/mes-06-d.py`):

```python
from capas import Capas
CARPETA_CAPAS = sys.argv[3] if len(sys.argv) > 3 else None
lz = Lienzo(ANCHO, semilla=606)
capas = Capas(lz, activo=bool(CARPETA_CAPAS))
lz = capas.lienzo                     # draw on this from here on
capas.empieza('sol', 'El sol')        # everything until the next mark is «El sol»
...
capas.empieza('nina', 'La niña')
...
capas.termina()                       # before the vignette
lz.vineta(margen=26)
lz.guardar(SALIDA)
if CARPETA_CAPAS:
    capas.guardar(CARPETA_CAPAS)
```

- One mark per thing a person would want to grab: a figure, a vehicle, a bird. The
  name is what the web shows when it is selected, so write it in Spanish, for a person.
- Keep the ids stable when you redraw: what people moved is saved per id.
- Without the third argument the generator behaves exactly as before. With it, the
  composite JPG comes out **identical** (checked: mean difference 0.0 against the
  published JPG for both months) — the elements are painted twice, once on the real
  sheet and once on a clean twin sheet, never instead.

Then:

```bash
cd design/calendario-arte/generadores/diseno4
python3 mes-06-d.py 3508 /tmp/mes-06-d.jpg ../../../../public/calendario-arte/capas/mes-06-d
python3 capas_a_ts.py      # rewrites src/data/calendarioArteCapas.ts
```

The web picks the elements up by the illustration's file name (`mes-06-d.jpg` →
`capas/mes-06-d/`). The composite JPG is still what the cover, the thumbnails and the
folders show.

**Not yet for the automatic drawer** («Crear nuevo diseño», `DIBUJANTE.md`): its
designs live in `/uploads` and the database, and the elements need a commit (the
positions travel inside the web bundle so the print copy has them at once).
