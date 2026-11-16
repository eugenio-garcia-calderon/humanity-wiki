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

## Illustrations in depth planes (planos.py, since 2026-11-15)

Eugenio: «a partir de ahora todas las ilustraciones… al menos entre 3 y 5 planos y capas de
profundidad… juega con las luces». The rule, in Spanish and for whoever draws, is
`encargos/PLANOS.md`. The first two are May and June, design 5 (`mes-05-e`, `mes-06-e`).

`generadores/diseno4/planos.py` builds the picture as a stack of sprites:

```python
esc = Escena(ancho, semilla=616, sol=(1250, 170))      # where the light comes from
lz = esc.lienzo
...paint the sky on lz...                              # becomes fondo.jpg, static
esc.empieza('lomas', 'Las lomas', plano=4, fija=True)  # landscape band: seen, not draggable
esc.empieza('pueblo', 'El pueblo', plano=3, escala=0.8, ancla=(1446, 818), mueve=(12, -54))
esc.empieza('nina', 'La niña', plano=2, proyecta=dict(suelo=600, dentro=HOJA1))
esc.rayos(...)                                         # light shafts between two planes
esc.halos('luz_bombilla', 'La luz de la bombilla', [(534, 482, 64, 0.26)])
esc.termina()
esc.marco(margen=16)                                   # fade to the calendar paper, fixed on top
esc.guardar('mes-06-e.jpg', carpeta_capas)
```

- Each element is painted alone on a clean sheet, turned into an RGBA sprite, treated as
  its plane says (haze toward the air colour, shade, dark side away from the light, rim
  light, cast shadow, blur), then laid over the picture. The final JPG and the web's movable
  elements are the same sprites, so they match by construction.
- **Opaque by reserve.** Anything painted with `tapa` (or gouache, or collage) is solid
  in its sprite. Without that, a cream shirt or a white glider becomes a ghost over what is
  behind it. Washes with no reserve (a cast shadow, the music ribbon) stay transparent.
  `acuarela.Lienzo.TAPA` records it; it is `None` by default, so design 4 re-renders
  byte-identical.
- Pieces of earlier designs are reused as functions: `piezas_05.py` and `piezas_06.py` are
  verbatim copies of the design-4 scripts' blocks. The design-4 scripts are not touched.
- `fija: true` in `capas.json`: landscape bands, light and the paper border. The web shows
  them, but does not let them be dragged or selected.

```bash
cd design/calendario-arte/generadores/diseno4
python3 mes-06-e.py 1485 /tmp/prueba.png                                   # iterate
python3 mes-06-e.py 3508 ../../../../public/calendario-arte/ilustraciones/mes-06-e.jpg \
        ../../../../public/calendario-arte/capas/mes-06-e                   # final + pieces
python3 capas_a_ts.py
```

Every illustration then goes through the evaluator (`.claude/agents/evaluador-ilustraciones.md`)
at least twice.


## People as a realistic watercolour (figuras_real.py, since 2026-11-16)

Eugenio: «cambia el estilo del dibujo… para que los personajes sean más realistas, ahora
parece mucho que lo ha pintado un niño, tiene que ser una acuarela realista, mantén todos
los elementos». First done for May and June as design 6 (`mes-05-f`, `mes-06-f`), copies of
the design-5 scripts, so designs 4 and 5 render exactly as before.

`generadores/diseno4/figuras_real.py` paints the same calls the figures already make
(`cabeza`, `cabeza3`, `mano`, `mano2`, `extremidad`, `brazo3`, `pierna3`, `torso`, `torso3`
through `modelar`, `cuello3`, `cuello_natural`), only differently. `activar(luz, *modulos,
lineas=0.6)` swaps them in for one run and softens every pencil outline:

```python
import figuras_real as FR
FR.activar((0.6, -0.8), personajes_06, piezas_06, lineas=0.6)   # before the people are painted
```

- **Heads.** An ellipsoid seen at a real 3/4 angle (deeper than wide: in 3/4 the back of the
  skull shows and the ear sits behind the face), with a relief on it (brow, eye sockets,
  nose, cheekbones, lips, chin) lit from the scene's light. Adults' heads are about 0.86 of
  the old circle; children keep a round low cheek, a small nose with no bridge, thin brows.
  The shadow is about one and a half values, with lost (wet) edges; hard edges only at the
  wing of the nose, under the lower lip and along the jaw. Eyes: cream whites, a dark iris
  with a pupil and a catch-light, a lashes line thicker toward the outer corner.
- **Bodies.** Limbs taper (deltoid into the shoulder, a narrower joint, the forearm or calf
  swelling below it, a slim wrist or ankle); bent elbows and knees push the outline out and
  gather V folds inside; trousers stop above the ankle; shirts have a waist and the
  shoulders slope from the neck.
- **Painting.** Every form is modelled as watercolour is: a wash, the shadow in two glazes
  that dry with an edge and granulate, a little of it graded, coloured-pencil hatching that
  follows the form in the shadow, pencil on the outline only where it turns from the light.
  No airbrushed highlights: they were what made the first version read as plastic.
- `personajes_real.py` redraws the figures whose silhouette had to change, not only their
  painting (the kneeling girl, the grandmother's lap and hands, the boy's weight, the hand
  with the phone…). It also has `persona_espalda()` and `nuca()` in figuras_real for small
  people seen from behind, and `cabeza_perfil()` for small heads in profile.

The evaluator judged it in two rounds. In the first, repainting the inside of the old
silhouettes was not enough: they still read as mannequins and the faces as masks. That is why
the rules above are about outlines as much as about paint.


## A face painted from a real 3D face (retrato.py, since 2026-11-16)

Eugenio, after design 6: «quiero caras y cuerpos realistas, quiero diseños no tan abstractos y
creepes» … «hazlo que sea realista, pero utilizan esta suscripcion sin gastar dinero,
apañatelas, hazlo solo de la cara de la bailarina del diseño de Arte, para simplificar, y luego
vemos resultados». So: no paid image generator, only code, and only one face — the dancer in
May, as design 7 (`mes-05-g`, a copy of `mes-05-f.py` that calls `PR.bailarina(retrato=True)`).

`generadores/diseno4/retrato.py` starts from MediaPipe's canonical face mesh
(`datos/canonical_face_model.obj`, 468 points of a real adult face, Apache 2.0, see
`datos/README.md`) instead of an ellipsoid with bumps:

- **Shape.** `_expresion` narrows the mesh's sides to a real 13.5 cm across (it is 15.3 cm at the
  ears), closes its half-parted lips, lifts the upper lids (more when she looks up), and adds the
  smile. A skull fitted to the mesh (`CRANEO_C`, `CRANEO_R`) carries the forehead on to the
  hairline and closes the top and the back; it is pushed 1.5 cm back for the depth test only, so
  the two meshes never leave a gap.
- **Light.** The head is posed (turn, tilt, `alza` to look up), rasterised to depth, normals and
  head-frame coordinates, and painted: a graded mid-tone and a soft shadow family from the
  normals, cast shadows marched on the depth buffer, hollows from the depth, warm cheeks, nose
  and ears. Eyes, brows, nostrils and lips are drawn on the mesh's own landmarks.
- **Hair, bun and ear** are placed in the same 3D frame, so they turn with the head: a rounded
  hairline a third of the face above the brows, the hair pulled over the ears to the bun.
- **Neck.** `retrato.cuello_natural` puts figuras_real's neck under this head (behind the chin,
  about 9 cm across, `_cuello(ancho=, prof=)`), because the old neck was sized for wider heads
  and showed beside the narrower face.
- `retrato.cabeza` / `retrato.cuello_natural` are drop-ins for `acuarela.figura`'s head and neck;
  `personajes_real.bailarina(retrato=True)` swaps them in for that one figure.

The blind evaluator preferred it to design 6's face (realism 5 vs 4, «not creepy» 6 vs 4,
expression 5 vs 3) and asked for the gaze toward the raised hand, a symmetric smile and a
narrower, lighter neck. Those three were changed afterwards and checked by eye, not by a second
evaluator round. Its remark on the body (the figure is about 12 heads tall) is out of this
round's scope.
