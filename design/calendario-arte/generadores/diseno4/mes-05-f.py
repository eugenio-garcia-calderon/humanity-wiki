"""
Mes 5 -- Arte -- Diseño 6: design 5's scene with the people painted as a realistic watercolour.

Eugenio (2026-11-16): «cambia el estilo del dibujo de ambas, para que los personajes sean
más realistas, ahora parece mucho que lo ha pintado un niño, tiene que ser una acuarela
realista, mantén todos los elementos, pero cambia el estilo, y para no perder el diseño
anterior, añádelo en un nuevo diseño».

Same composition, planes and movable pieces as mes-05-e.py. What changes: figuras_real
paints every head, hand, limb, neck and garment (realistic proportions, form from light,
layered glazes, almost no outline), every pencil outline is softened, and the small people
of the middle distance (the painter, the children at the puppet theatre, the neighbours at
the café) are rebuilt with real proportions instead of blobs.

What follows is design 5's own description.

Mes 5 -- Arte -- Diseño 5: the same scene, built in depth planes.

Eugenio (2026-11-15): «utiliza al menos entre 3 y 5 planos y capas de profundidad…
reutilizando los elementos que has diseñado… detallitos ocultos en el fondo pero bien
ilustrados… juega con las luces».

Design 4's idea (one work made by everyone: a woman dances and her skirt is a garden; its
hem comes off a grandmother's needles, a girl models in clay a bud that becomes one of its
flowers, an old man's guitar sends out the music that turns into stars, flowers fly off as
birds) now happens in a village square on a May evening, at the hour the sun sets behind
the roofs and the festival lights come on. Two lights: the low sun from the left, gold;
the paper lanterns on the right, warm in the blue dusk.

  5  very far   violet hills with an old walled town
  4  far        the houses round the square, windows lighting up, a bell tower
  3  middle     the paved square, a mural on a wall with its ladder and paint pots,
                a painter at an easel, a puppet theatre with children watching,
                a big tree and a string of festival lights
     (light)    the last rays of the sun across the square
  2  main       the dancer and her skirt-garden, the guitarist, the grandmother, the
                girl with the clay, the music, the flowers turning into birds
  1  near       a pot of geraniums, a table of brushes, jars and clay, paper lanterns
                hanging from the top edge, vine leaves in the top corner

    python3 mes-05-f.py [ancho_px] [salida.jpg|.png] [carpeta_capas]
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, hoja, hojita, flor_simple, mata,
                      remuestrea, estrella, cabeza, extremidad, mano)
from planos import Escena
import piezas_05 as P
import piezas_06 as P6
import figuras_real as FR
import personajes_real as PR

LUZ = (-0.85, -0.5)                      # the setting sun low on the left
FR.activar(LUZ, P, P6, lineas=0.6)
cabeza, extremidad, mano = FR.cabeza, FR.extremidad, FR.mano

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-05-f.jpg'
CARPETA_CAPAS = sys.argv[3] if len(sys.argv) > 3 else None

SOL = (66, 306)
esc = Escena(ANCHO, semilla=515, sol=SOL, color_luz='#ffd9a0', aire_calido='#f4d2a4', aire_frio='#b9b8d8',
             radio_luz=640, color_sombra='#2e2a4a')
lz = esc.lienzo
P.usar(lz)
P6.usar(lz, semilla=55)
rng = np.random.default_rng(25)

HORIZONTE = 476        # the far edge of the square, where the houses stand

# ======================================================================== the sky at dusk (static background)
cielo = Poligono([(-30, -30), (1515, -30), (1515, 560), (-30, 560)], suave=False)
lz.aguada(cielo, '#f1cfa8', dens=0.3, suave=60, gran=0.1, var=0.4)
lz.aguada(cielo, '#6f74ab', dens=0.5, suave=90, gran=0.15, var=0.5, desvanece=(1400, -40, 600, 520))
lz.aguada(cielo, '#9aa2cf', dens=0.3, suave=80, gran=0.1, var=0.4, desvanece=(200, -40, 500, 400))
lz.aguada(Elipse(SOL[0], SOL[1] + 30, 520, 300), '#f6c76f', dens=0.36, suave=110, gran=0.06)
lz.aguada(Elipse(SOL[0], SOL[1], 220, 130), '#f4a85e', dens=0.3, suave=60, gran=0.05)
lz.levanta(Elipse(SOL[0], SOL[1], 40), 1.0, suave=6)
lz.aguada(Elipse(SOL[0], SOL[1], 34), '#ffd27e', dens=0.7, suave=2)
lz.aguada(Elipse(SOL[0] + 5, SOL[1] - 5, 18), '#fff3c8', dens=0.3, suave=7)
lz.luz((SOL[0], SOL[1], 160), '#fff0c4', fuerza=0.55)


def nube_larga(x0, x1, y, alto, cuerpo, borde_luz='#ffcf8a', dens=0.3):
    """A long sunset cloud: a violet streak lit from below by the sun that has gone."""
    pts = [(x0, y), (x0 + (x1 - x0) * 0.3, y - alto * 0.6), (x0 + (x1 - x0) * 0.7, y - alto * 0.5), (x1, y)]
    f = Trazo(list(bezier(*pts, n=20)), (alto * 0.2, alto * 0.7, alto, alto * 0.6, alto * 0.15))
    lz.aguada(f, cuerpo, dens=dens, irreg=1.3, borde=0.3, gran=0.2, var=0.5)
    lz.luz(Trazo([(p[0], p[1] + alto * 0.35) for p in bezier(*pts, n=20)], (alto * 0.1, alto * 0.25, alto * 0.3,
                                                                              alto * 0.2, alto * 0.05)),
           borde_luz, fuerza=0.5, suave=3)


nube_larga(760, 1180, 214, 26, '#a98aa8')
nube_larga(1060, 1460, 300, 22, '#9a84a8')
nube_larga(220, 520, 250, 16, '#b494a8')
nube_larga(930, 1230, 380, 14, '#b18ea0', dens=0.26)
# the first stars, high in the blue
for k in range(16):
    x, y = rng.uniform(720, 1470), rng.uniform(20, 170)
    lz.gouache(Elipse(x, y, rng.uniform(0.7, 1.4)), '#fff6dc', alfa=0.85, irreg=0)
estrella(lz, 1386, 54, 4.5, '#fff6dc', gouache=True)
estrella(lz, 1050, 34, 3.5, '#fff6dc', gouache=True)


def cresta(x0, x1, base, picos, amp, semilla, paso=16):
    r_ = np.random.default_rng(semilla)
    xs = np.arange(x0, x1 + paso, paso, dtype=float)
    y = np.full_like(xs, base)
    for (px, ph, pw) in picos:
        y -= ph * np.exp(-((xs - px) / pw) ** 2)
    y += amp * np.cumsum(r_.normal(0, 1, len(xs))) / np.sqrt(len(xs))
    return np.stack([xs, y], 1)


def altura(linea, x):
    return float(np.interp(x, linea[:, 0], linea[:, 1]))


# ======================================================================== plane 5: violet hills, an old walled town
esc.empieza('colinas', 'Las colinas', plano=5, fija=True, neblina=0.45)
C5b = cresta(-40, 1530, 350, [(300, 30, 220), (820, 36, 200), (1250, 50, 180)], 3, 13)
lz.aguada(Poligono(np.vstack([C5b, [(1530, 560), (-40, 560)]]), suave=False), '#a99cc2', dens=0.5, tapa=1, irreg=1.2,
          borde=0.6, gran=0.3, toques=[(160, 360, 260, '#e2b0b0', 0.6)])
C5 = cresta(-40, 1530, 384, [(220, 72, 110), (420, 40, 150), (760, 26, 140), (1000, 40, 200), (1290, 50, 150)], 4, 3)
lz.aguada(Poligono(np.vstack([C5, [(1530, 560), (-40, 560)]]), suave=False), '#7d74a8', dens=0.62, tapa=1, irreg=1.2,
          borde=0.7, gran=0.3, toques=[(200, 400, 260, '#c98aa0', 0.6), (1300, 410, 200, '#6a6aa0', 0.5)])

# the old walled town on the near hill, against the light: pale lavender-gold, a few windows lit
esc.empieza('pueblo_lejano', 'El pueblo amurallado', plano=5, neblina=0.3, borde_luz=0.6, ancho_borde=1.4)
MURO = '#d7bebe'
x = 156
while x < 290:
    y = altura(C5, x + 6) + 4
    h = rng.uniform(9, 12)
    lz.aguada(Poligono([(x, y + 8), (x + 12, y + 8), (x + 12, y - h), (x, y - h)], suave=False), MURO, dens=0.85, tapa=1,
              irreg=0.1)
    for j in range(3):                            # battlements
        lz.aguada(Poligono([(x + j * 4, y - h), (x + j * 4 + 2.2, y - h), (x + j * 4 + 2.2, y - h - 2.8), (x + j * 4, y - h - 2.8)],
                           suave=False), MURO, dens=0.85, tapa=1)
    x += 12
for (x, h, c) in ((160, 26, '#cdb0b4'), (190, 32, '#d2b4b6'), (246, 24, '#cdb0b4'), (272, 30, '#c9aab0')):
    y = altura(C5, x + 6) + 2
    lz.aguada(Poligono([(x, y), (x + 12, y), (x + 12, y - h), (x, y - h)], suave=False), c, dens=0.9, tapa=1)
    lz.aguada(Poligono([(x - 1, y - h), (x + 13, y - h), (x + 6, y - h - 11)], suave=False), '#b88a8a', dens=0.9, tapa=1)
    lz.aguada(Elipse(x + 6, y - h * 0.55, 1.2, 1.8), '#ffcf70', dens=0.95, tapa=1)
    lz.luz((x + 6, y - h * 0.55, 4), '#ffe0a0', fuerza=0.55)
lz.lapiz([[(156, altura(C5, 160) - 6), (290, altura(C5, 286) - 6)]], '#a88a8e', grosor=0.45, presion=0.5, temblor=0.2)
for k in range(9):
    wx = rng.uniform(160, 286)
    wy = altura(C5, wx) - rng.uniform(1, 6)
    lz.aguada(Poligono([(wx, wy), (wx + 2, wy), (wx + 2, wy + 3), (wx, wy + 3)], suave=False), '#ebc378', dens=0.7, tapa=1)
y = altura(C5, 222) + 2                           # the church: a nave and a tower half again as tall as the others
lz.aguada(Poligono([(208, y), (232, y), (232, y - 20), (208, y - 20)], suave=False), '#dcc2c0', dens=0.9, tapa=1)
lz.aguada(Poligono([(214, y - 20), (224, y - 20), (224, y - 48), (214, y - 48)], suave=False), '#dcc2c0', dens=0.9, tapa=1)
lz.aguada(Poligono([(212, y - 48), (226, y - 48), (219, y - 66)], suave=False), '#b88a8a', dens=0.9, tapa=1)
lz.aguada(Poligono(list(arco(219, y - 42, 2.6, 3, 180, 360, 8)) + [(221.6, y - 37), (216.4, y - 37)]), '#6a5060', dens=0.9, tapa=1)
lz.aguada(Elipse(219, y - 30, 1.2, 2.0), '#ffcf70', dens=0.95, tapa=1)
lz.luz((219, y - 30, 5), '#ffe0a0', fuerza=0.55)

# ======================================================================== plane 4: the houses round the square
esc.empieza('casas', 'Las casas de la plaza', plano=4, fija=True, neblina=0.1, aclara_alfa=False, desenfoque=0, borde_luz=1.0, ancho_borde=2.2,
            color_borde='#f0be6e', tinte=dict(color='#5f557f', fuerza=0.62, de=(0, 0), a=(700, 0)))
casas = [  # x, w, d, h, kind, wall, roof
    (-30, 150, 20, 136, 'alero', '#f0d9b8', '#b8553a'),
    (126, 70, 18, 96, 'hastial', '#eda38a', '#a0634a'),
    (200, 66, 16, 82, 'alero', '#f6ead6', '#c4553a'),
    (270, 80, 20, 110, 'hastial', '#a9c3d9', '#a0634a'),
    (354, 60, 16, 90, 'alero', '#f4e2a8', '#b8553a'),
    (420, 72, 18, 104, 'hastial', '#f6ead6', '#9a3a3a'),
    (500, 90, 20, 92, 'alero', '#e8c06a', '#c4553a'),
    (598, 70, 18, 116, 'hastial', '#f2d4b8', '#8a5a3a'),
    (676, 84, 20, 96, 'alero', '#dfe3d6', '#6f5a8a'),
    (768, 66, 16, 110, 'hastial', '#f0b8a8', '#b8553a'),
    (842, 86, 20, 92, 'alero', '#f6ead6', '#c4553a'),
    (936, 70, 18, 120, 'hastial', '#e2b25e', '#9a3a3a'),
    (1016, 80, 20, 98, 'alero', '#f6ead6', '#b8643f'),
    (1146, 70, 18, 104, 'hastial', '#eda38a', '#6f5a8a'),
    (1224, 90, 20, 88, 'alero', '#a9c3d9', '#c4553a'),
    (1322, 76, 18, 112, 'hastial', '#f4e2a8', '#8a4a3a'),
    (1406, 100, 20, 96, 'alero', '#f6ead6', '#b8553a'),
]
for k, (x, w, d, h, tipo, pared, teja) in enumerate(casas):
    if tipo == 'alero':
        P6.casa_alero(x, HORIZONTE, w, d, h, pared, teja, 300 + k, pisos=0, cols=1, balcon=(k % 3 == 1))
    else:
        P6.casa_hastial(x, HORIZONTE, w, d, h, pared, teja, 300 + k, pisos=0, cols=1, chimenea=(k % 2 == 0))
    # windows: on the dusk side most are lit, on the sunset side they only catch a glint
    encendidas = 0.68 if x > 900 else (0.4 if x > 560 else 0.15)
    cols = max(2, int(w / 24))
    for fila in range(3):
        for c in range(cols):
            wx = x + w * (c + 0.5) / cols - 3
            wy = HORIZONTE - 30 - fila * (h - 40) / 2.4
            if wy < HORIZONTE - h + 10:
                continue
            q = Poligono([(wx, wy), (wx + 6, wy), (wx + 6, wy + 8.5), (wx, wy + 8.5)], suave=False)
            if rng.random() < encendidas:
                lz.aguada(q, '#ffcd78', dens=0.95, tapa=1, irreg=0.1)
                lz.luz((wx + 3, wy + 4, 9), '#ffd890', fuerza=0.55)
            else:
                lz.aguada(q, rng.choice(['#4a4a6a', '#5a5470', '#3e3e5e']), dens=0.85, tapa=1, irreg=0.1)
                if x < 560:
                    lz.gouache(Elipse(wx + 1.5, wy + 2, 0.9, 1.6), '#ffd8a0', alfa=0.7, irreg=0)
            if rng.random() < 0.4:
                for sd in (-1, 1):
                    lz.aguada(Poligono([(wx + 3 + sd * 3, wy), (wx + 3 + sd * 5.4, wy), (wx + 3 + sd * 5.4, wy + 8.5), (wx + 3 + sd * 3, wy + 8.5)],
                                       suave=False), rng.choice(['#4f9c9a', '#2f6f45', '#8a3a3a']), dens=0.85, tapa=1)
P6.campanario(1100, HORIZONTE, 40, 16, 196)
lz.aguada(Elipse(1120, HORIZONTE - 196 * 0.48, 7.5), '#f2dcb4', dens=0.62, tapa=1, irreg=0.2)   # no clock hands: no numbers
# arches of the arcade at ground level, warm inside
for x in (20, 80, 1040, 1250, 1440):
    o = Poligono(list(arco(x, HORIZONTE - 18, 16, 20, 180, 360, 14)) + [(x + 16, HORIZONTE), (x - 16, HORIZONTE)])
    lz.aguada(o, '#5a3a3a', dens=0.85, tapa=1, irreg=0.2, toques=[(x, HORIZONTE - 6, 10, '#c98a3a', 0.8)])
    lz.luz((x, HORIZONTE - 8, 14), '#ffcf80', fuerza=0.35)
for (x, h) in ((182, 70), (586, 60), (1012, 66)):
    P6.cipres(x, HORIZONTE + 2, h, int(x))
puerta_cafe = Poligono([(1352, HORIZONTE), (1370, HORIZONTE), (1370, HORIZONTE - 30), (1352, HORIZONTE - 30)], suave=False)
lz.aguada(puerta_cafe, '#ffc870', dens=0.95, tapa=1, irreg=0.1)
lz.luz(puerta_cafe, '#ffe0a0', fuerza=0.7, suave=6)

# the mural on the big house at the left, a ladder and its paint pots: art made for the whole square
esc.empieza('mural', 'El mural', plano=4, neblina=0.18, tinte=dict(color='#8a7caa', fuerza=0.2, de=(0, 0), a=(700, 0)))
MX, MY = 424, 384            # on the wall behind the painter
marco_m = Poligono([(MX - 2, MY - 6), (MX + 66, MY - 6), (MX + 66, MY + 50), (MX - 2, MY + 50)], suave=False)
lz.contorno(marco_m, '#c98a3a', grosor=1.6, presion=0.8, cortes=0.05)
P.pajaro(lz, MX + 30, MY + 16, 15, '#3f8f8c', ang=-12, vientre='#f6c46e')                     # a big painted bird
for (x, y, ang) in ((MX + 6, MY + 18, 120), (MX + 58, MY + 22, 60), (MX + 14, MY + 2, 160)):
    hojita(lz, x, y, 9, ang, '#5f8f63', nervio=False, tapa=0.9)
for k, c in enumerate(['#e8735e', '#c33c4e', '#8d73b0']):
    flor_simple(lz, MX + 8 + k * 12, MY + 40 + (k % 2) * 3, 4.2, c, centro='#f2d36b')
# the corner not painted yet: flowers only drawn
lz.lapiz([arco(MX + 50 + k * 7, MY + 38, 3, 3, 0, 360, 12) for k in range(2)] +
         [[(MX + 50 + k * 7, MY + 41), (MX + 50 + k * 7, MY + 48)] for k in range(2)], '#7a6a5a', grosor=0.45, presion=0.5)
# the ladder leaning on the wall beside it and the pots at its foot
for dx in (0, 10):
    lz.lapiz([[(500 + dx, HORIZONTE + 4), (488 + dx, MY - 14)]], '#8a6a4a', grosor=1.3, presion=0.85, temblor=0.05)
lz.lapiz([[(499 - k * 0.9, HORIZONTE - k * 12), (509 - k * 0.9, HORIZONTE - k * 12)] for k in range(1, 8)], '#8a6a4a',
         grosor=1.0, presion=0.8, temblor=0.05)
for k, c in enumerate(['#e8735e', '#3f8f8c']):
    x = 512 + k * 9
    lz.aguada(Poligono([(x, HORIZONTE + 6), (x + 7, HORIZONTE + 6), (x + 6, HORIZONTE - 3), (x + 1, HORIZONTE - 3)], suave=False),
              '#b9b2a8', dens=0.85, tapa=1)
    lz.aguada(Elipse(x + 3.5, HORIZONTE - 3, 2.8, 1.0), c, dens=0.95, tapa=1)

# ======================================================================== plane 3: the square
esc.empieza('plaza', 'La plaza', plano=3, fija=True, neblina=0.0, borde_luz=0)
plaza = Poligono([(-30, HORIZONTE - 2), (1515, HORIZONTE - 2), (1515, 880), (-30, 880)], suave=False)
lz.aguada(plaza, '#d6bf9e', dens=0.6, tapa=1, irreg=0.3, borde=0.2, gran=0.5, var=0.5,
          toques=[(240, 560, 260, '#f0c88c', 0.7), (1260, 700, 300, '#a99ab8', 0.6), (760, 840, 300, '#c9a888', 0.5)])
# cobbles in perspective: small and close together at the far edge, big and spaced near us
y = HORIZONTE + 2
fila = 0
while y < 880:
    t = (y - HORIZONTE) / (880 - HORIZONTE)
    paso = 4 + 30 * t ** 1.2
    alto_ = 1.2 + 4.5 * t
    x = -20 + (fila % 2) * paso * 0.5
    arcos = []
    while x < 1500:
        p_ = paso * rng.uniform(0.85, 1.15)
        arcos.append(arco(x + p_ / 2, y, p_ * 0.46, alto_, 200, 340, 6))
        if t > 0.1 and rng.random() < 0.14:          # every stone a little different
            lz.aguada(Elipse(x + p_ / 2, y - alto_ * 0.5, p_ * 0.42, alto_ * 0.8), rng.choice(['#c9b090', '#e2cba8', '#b9a08a']),
                      dens=0.35, irreg=0.3)
        x += p_
    if t > 0.1:
        lz.lapiz(arcos, '#9a8068', grosor=0.3 + 0.5 * t, presion=0.06 + 0.3 * t, temblor=0.3, cortes=0.25)
    y += 4 + 18 * t
    fila += 1
# rings of stones round the middle of the square, where she dances: a stage made by the town
for k, rx in enumerate((170, 240, 320, 410, 520)):
    lz.lapiz([arco(720, 770, rx, rx * 0.17, 0, 360, 120)], '#9a7a62', grosor=0.9 + 0.15 * k, presion=0.42, temblor=0.4,
             cortes=0.15)
lz.aguada(Elipse(720, 770, 170, 29), '#e9cfa0', dens=0.3, irreg=0.6, suave=6)
# the near stones lie in the shade of the houses behind us: cool, darker toward the bottom edge
lz.aguada(plaza, '#7f6f9f', dens=0.42, irreg=0.8, var=0.5, desvanece=(700, 880, 700, 700))
lz.aguada(plaza, '#6a5f8a', dens=0.22, irreg=0.8, var=0.5, desvanece=(1500, 760, 1000, 560))
# the houses on the left throw their shadow across the square toward us and to the right; the sun gets through
# the gaps between them in three golden stripes that reach the skirt
sombra_casas = Poligono([(-30, HORIZONTE), (640, HORIZONTE), (600, 572), (-30, 600)], suave=False)
franjas = None
for (x0, w) in ((120, 38), (300, 30), (470, 26)):
    f = Poligono([(x0, HORIZONTE), (x0 + w, HORIZONTE), (x0 + w + 210, 600), (x0 + 210, 600)], suave=False)
    franjas = f if franjas is None else (franjas | f)
lz.aguada(sombra_casas - franjas, '#6f6294', dens=0.42, irreg=1.6, borde=0.1, var=0.5, suave=7)
lz.aguada(franjas & Poligono([(-30, HORIZONTE), (900, HORIZONTE), (900, 640), (-30, 640)], suave=False), '#f6c27a',
          dens=0.26, irreg=1.4, suave=8, desvanece=(100, HORIZONTE, 700, 640))
# chalk drawings by the children: a flower, a spiral, a hopscotch of empty squares
tiza = []
cx_, cy_ = 452, 628
for k in range(8):
    a = math.radians(k * 45)
    tiza.append(arco(cx_ + math.cos(a) * 16, cy_ + math.sin(a) * 6, 10, 4, 0, 360, 14))
tiza.append(arco(cx_, cy_, 6, 2.6, 0, 360, 12))
lz.lapiz(tiza, '#f2a0b0', grosor=1.1, presion=0.6, temblor=0.4)
lz.lapiz([[(cx_, cy_ + 6), (cx_ - 6, cy_ + 40)]], '#8fc08a', grosor=1.1, presion=0.6, temblor=0.4)
sol_t = [arco(398, 612, 13, 5, 0, 360, 20)] + [[(398 + math.cos(a) * 17, 612 + math.sin(a) * 6.5),
                                                (398 + math.cos(a) * 25, 612 + math.sin(a) * 9.6)] for a in np.radians(np.arange(0, 360, 30))]
lz.lapiz(sol_t, '#f6d06a', grosor=1.2, presion=0.65, temblor=0.4)
cas = []
for k in range(5):
    y0 = 700 - k * 18
    w = 30 - k * 2.5
    cas.append([(520 - w, y0 + 110), (520 + w, y0 + 110), (520 + w * 0.92, y0 + 92), (520 - w * 0.92, y0 + 92), (520 - w, y0 + 110)])

for k in range(40):
    x, y = rng.uniform(470, 1100), rng.uniform(760, 850)
    lz.aguada(Elipse(x, y, rng.uniform(1.6, 3.2), rng.uniform(1.0, 2.0), rng.uniform(0, 180)),
              rng.choice(['#e8735e', '#f39ab0', '#f0b030', '#c33c4e', '#8d73b0']), dens=0.85, irreg=0.2, tapa=1)
# the last sun lies on the stones in long warm patches
for (x, y, rx, ry) in ((160, 540, 220, 26), (420, 600, 180, 18), (240, 700, 260, 30)):
    lz.luz(Elipse(x, y, rx, ry), '#ffd890', fuerza=0.3, suave=20)

# the painter at her easel, painting the sunset
esc.empieza('pintora', 'La pintora del caballete', plano=3, neblina=0.08, escala=1.1, ancla=(420, 548),
            proyecta=dict(suelo=548, largo=0.75, alto=0.2, fuerza=0.62, difusa=1.6, color='#766296'))
EX, EY = 400, 548
for (x0, x1) in ((EX - 20, EX - 6), (EX + 14, EX + 2), (EX - 2, EX - 4)):
    lz.lapiz([[(x0, EY), (x1, EY - 92)]], '#7a5a3a', grosor=1.4, presion=0.85, temblor=0.05)
lienzo_ = Poligono([(EX - 28, EY - 96), (EX + 14, EY - 100), (EX + 16, EY - 56), (EX - 26, EY - 52)], suave=False)
canto = Poligono([(EX + 14, EY - 100), (EX + 17.5, EY - 99), (EX + 19.5, EY - 57), (EX + 16, EY - 56)], suave=False)
lz.aguada(canto, '#c9b090', dens=0.85, tapa=1, irreg=0.05)                     # the canvas's edge, in shade
lz.aguada(lienzo_, '#f6ecd8', dens=0.9, tapa=1, irreg=0.1)
# her painting of the sunset, inside the canvas's white margin: gold sky, the sun, violet hills
pintura = Poligono([(EX - 25, EY - 93), (EX + 11, EY - 96.5), (EX + 13, EY - 59), (EX - 23, EY - 55)], suave=False)
lz.aguada(pintura, '#f2c27a', dens=0.55, irreg=0.3, toques=[(EX - 6, EY - 80, 14, '#f0a060', 0.6)])
lz.aguada(pintura & Poligono([(EX - 30, EY - 70), (EX - 8, EY - 76), (EX + 20, EY - 72), (EX + 20, EY - 50), (EX - 30, EY - 50)]),
          '#8d73b0', dens=0.55, irreg=0.5)
lz.aguada(Elipse(EX - 6, EY - 79, 6), '#f2b630', dens=0.8, irreg=0.3)
lz.contorno(lienzo_, '#6a5040', grosor=0.45, presion=0.45)
# she stands with her back half turned, a beret, a brush raised to the canvas, the palette in her other hand
PX = EX + 40
cima_p = FR.persona_espalda(lz, PX + 1, EY, 74, '#c33c4e', '#2a1a14', pantalon='#3e4f86', brazo=(PX - 29, EY - 77),
                            piel='piel3', peinado='mono', nino=False)
lz.lapiz([[(PX - 30, EY - 79), (PX - 38, EY - 87)]], '#5e3f30', grosor=0.7, presion=0.8)          # the brush
boina = Elipse(cima_p[0] + 1, cima_p[1] + 2.2, 7.4, 2.8, -8)
FR.volumen(lz, boina, '#3f8f8c', LUZ, dens=0.9, prof=0.5, linea=False, duro=0.4)
lz.aguada(Elipse(cima_p[0] + 2, cima_p[1] - 0.6, 1.0), '#2a5a58', dens=0.9, tapa=1)
paleta = Poligono([(PX + 9, EY - 42), (PX + 27, EY - 39), (PX + 28, EY - 35), (PX + 10, EY - 38)])
FR.volumen(lz, paleta, '#c9a06a', LUZ, dens=0.9, prof=0.4, linea=False, duro=0.4)
for k, c in enumerate(['#f2b630', '#e8735e', '#3f8f8c']):
    lz.aguada(Elipse(PX + 15 + k * 4, EY - 39, 1.3), c, dens=0.95, tapa=1)

# the puppet theatre, with children watching from the stones
esc.empieza('teatrillo', 'El teatrillo de títeres', plano=3, neblina=0.06,
            proyecta=dict(suelo=626, largo=0.75, alto=0.2, fuerza=0.62, difusa=1.6, color='#766296'))
TX, TY = 1130, 626
caja = Poligono([(TX, TY), (TX + 112, TY), (TX + 112, TY - 118), (TX, TY - 118)], suave=False)
lz.aguada(caja, '#3f8f8c', dens=0.85, tapa=1, irreg=0.2, borde=0.7, toques=[(TX + 20, TY - 60, 30, '#5fafa8', 0.6)])
for k in range(7):
    c = '#f6ecd8' if k % 2 else '#c33c4e'
    x = TX - 6 + k * 18
    lz.aguada(Poligono([(x, TY - 118), (x + 18, TY - 118), (x + 18, TY - 130), (x + 9, TY - 124), (x, TY - 130)], suave=False),
              c, dens=0.9, tapa=1, irreg=0.1)
esc_boca = Poligono([(TX + 14, TY - 46), (TX + 98, TY - 46), (TX + 98, TY - 104), (TX + 14, TY - 104)], suave=False)
lz.aguada(esc_boca, '#3a2a3a', dens=0.9, tapa=1, irreg=0.1, toques=[(TX + 56, TY - 70, 30, '#7a4a3a', 0.7)])
lz.luz(esc_boca, '#ffcf80', fuerza=0.25, suave=8)
for sd in (-1, 1):         # the red curtains, drawn back
    x = TX + 56 + sd * 42
    lz.aguada(Poligono([(x, TY - 104), (x - sd * 16, TY - 104), (x - sd * 4, TY - 76), (x, TY - 46)]), '#c33c4e', dens=0.9,
              tapa=1, irreg=0.2)
# two puppets: a sun and a little bird, talking
lz.aguada(Elipse(TX + 40, TY - 66, 9), '#f2b630', dens=0.95, tapa=1, irreg=0.2)
for k in range(10):
    a = math.radians(k * 36)
    lz.lapiz([[(TX + 40 + math.cos(a) * 10, TY - 66 + math.sin(a) * 10), (TX + 40 + math.cos(a) * 14, TY - 66 + math.sin(a) * 14)]],
             '#ec8a2e', grosor=1.1, presion=0.8)
lz.aguada(Elipse(TX + 74, TY - 64, 8, 6, -10), '#e8735e', dens=0.95, tapa=1)
lz.aguada(Poligono([(TX + 81, TY - 66), (TX + 88, TY - 64), (TX + 81, TY - 62)], suave=False), '#f2b630', dens=0.95, tapa=1)
for (x, y) in ((TX + 37, TY - 68), (TX + 44, TY - 68), (TX + 76, TY - 66)):
    lz.aguada(Elipse(x, y, 1.0), '#2a1a14', dens=0.95, tapa=1)
lz.lapiz([[(TX + 40, TY - 56), (TX + 40, TY - 46)], [(TX + 74, TY - 58), (TX + 74, TY - 46)]], '#5e3f30', grosor=0.9, presion=0.8)
lz.contorno(caja, '#2a5a58', grosor=0.6, presion=0.5, cortes=0.2)
# the audience, seen from behind and all different: a girl on her father's shoulders, a boy standing and
# pointing at the bird, two small ones sitting on the stones
esc.empieza('publico', 'Los niños del teatrillo', plano=3, neblina=0.06, proyecta=dict(suelo=708, largo=0.75, alto=0.2, fuerza=0.62, difusa=1.6, color='#766296'))
SUELO_P = 708


def espalda(x, y_pies, alto, ropa, pelo, pantalon='#4a5a7a', sentado=False, brazo=None, peinado='corto'):
    """A small person seen from behind, with real proportions (figuras_real.persona_espalda)."""
    return FR.persona_espalda(lz, x, y_pies, alto, ropa, pelo, pantalon=pantalon, sentado=sentado, brazo=brazo,
                              piel='piel3', peinado=peinado)


TXP = 1130
espalda(TXP + 6, SUELO_P - 4, 54, '#f2b630', '#2a1a14', sentado=True, peinado='rizado')
espalda(TXP + 36, SUELO_P, 60, '#5f86c0', '#7a4a2a', brazo=(TXP + 48, SUELO_P - 64))
cima = espalda(TXP + 78, SUELO_P + 2, 92, '#6a8a5a', '#3a2a24', pantalon='#3e3a4a')
# the girl on his shoulders, seen from behind: her legs hang over his chest, her arms are up
cx_h, cy_h = cima
for sd in (-1, 1):
    FR.volumen(lz, Trazo([(cx_h + sd * 5, cy_h + 3), (cx_h + sd * 11, cy_h + 12), (cx_h + sd * 10, cy_h + 22)], (4.4, 3.8, 3.0)),
               '#e8735e', LUZ, dens=0.85, prof=0.5, linea=False, duro=0.5)
    lz.aguada(Elipse(cx_h + sd * 10, cy_h + 23.5, 2.6, 1.6), '#5a3a34', dens=0.85, tapa=1)
for sd in (-1, 1):
    FR.volumen(lz, Trazo([(cx_h + sd * 5, cy_h - 11), (cx_h + sd * 10, cy_h - 19), (cx_h + sd * 12, cy_h - 28)], (3.2, 2.8, 2.4)),
               '#e8735e', LUZ, dens=0.85, prof=0.5, linea=False, duro=0.5)
    lz.aguada(Elipse(cx_h + sd * 12, cy_h - 29.5, 1.5, 1.9), 'piel3', dens=0.75, tapa=1)
FR.volumen(lz, Poligono([(cx_h - 7.5, cy_h + 4), (cx_h + 7.5, cy_h + 4), (cx_h + 6.5, cy_h - 12), (cx_h, cy_h - 14),
                         (cx_h - 6.5, cy_h - 12)]), '#e8735e', LUZ, dens=0.85, prof=0.5, linea=False, duro=0.5)
FR.nuca(lz, cx_h, cy_h - 19, 5.2, '#c9a06a', 'piel3', LUZ, 'largo')
espalda(TXP + 108, SUELO_P - 2, 50, '#8d73b0', '#1e1410', sentado=True, peinado='mono')

# a cat sitting on the stones, watching the puppets too
esc.empieza('gato', 'El gato', plano=3, neblina=0.04, escala=0.42, ancla=(1080, 722), proyecta=dict(suelo=722, largo=0.75, alto=0.2, fuerza=0.62, difusa=1.6, color='#766296'))
GX, GY = 1080, 722
gato = Poligono(list(spline([(GX - 13, GY), (GX - 15, GY - 16), (GX - 9, GY - 30), (GX, GY - 34), (GX + 9, GY - 30),
                             (GX + 14, GY - 14), (GX + 12, GY)], cerrada=True)))
lz.aguada(gato, '#4a4048', dens=0.9, tapa=1, irreg=0.3, borde=0.7, toques=[(GX - 8, GY - 22, 8, '#8a7a7a', 0.5)])
cab = Circulos([(GX, GY - 42, 9.5)])
lz.aguada(cab, '#4a4048', dens=0.9, tapa=1, irreg=0.2)
for sd in (-1, 1):
    lz.aguada(Poligono([(GX + sd * 3, GY - 49), (GX + sd * 9, GY - 47), (GX + sd * 8, GY - 58)], suave=False), '#4a4048',
              dens=0.9, tapa=1)
lz.aguada(Trazo(list(bezier((GX + 10, GY - 2), (GX + 26, GY), (GX + 30, GY - 12), (GX + 22, GY - 18), n=14)), (4, 3.5, 3, 2)),
          '#4a4048', dens=0.9, tapa=1)

# two neighbours at a café table by the tree, a lantern between them
esc.empieza('cafe', 'La mesa del café', plano=3, neblina=0.08, proyecta=dict(suelo=532, largo=0.75, alto=0.2, fuerza=0.62, difusa=1.6, color='#766296'))
MX_, MY_ = 1330, 532
lz.aguada(Elipse(MX_, MY_ - 30, 22, 5), '#f6ecd8', dens=0.85, tapa=1, irreg=0.1)
lz.lapiz([[(MX_, MY_ - 26), (MX_, MY_)], [(MX_ - 9, MY_), (MX_ + 9, MY_)]], '#4a4048', grosor=1.0, presion=0.85)
for sd, (ropa, pelo, piel, pein, edad) in ((-1, ('#5f86c0', '#d8d2cc', 'piel2', 'corto', 'mayor')),
                                           (1, ('#e8735e', '#2a1a14', 'piel4', 'mono', 'adulto'))):
    x = MX_ + sd * 34
    lz.lapiz([[(x - sd * 6, MY_), (x - sd * 8, MY_ - 22)], [(x + sd * 8, MY_), (x + sd * 6, MY_ - 22)],
              [(x + sd * 8, MY_ - 22), (x + sd * 10, MY_ - 46)]], '#6a4a3a', grosor=1.0, presion=0.8)   # chair
    # thigh to the table, shin down to the floor, the shoe
    FR.volumen(lz, Trazo([(x + sd * 2, MY_ - 22), (x - sd * 10, MY_ - 22), (x - sd * 17, MY_ - 20)], (7.5, 6.5, 5.5)),
               '#5a5048', LUZ, dens=0.85, prof=0.5, linea=False, duro=0.5)
    FR.volumen(lz, Trazo([(x - sd * 17, MY_ - 21), (x - sd * 18, MY_ - 10), (x - sd * 18, MY_ - 3)], (5.4, 4.6, 3.8)),
               '#5a5048', LUZ, dens=0.85, prof=0.5, linea=False, duro=0.5)
    lz.aguada(Elipse(x - sd * 21, MY_ - 1.6, 4.4, 1.8), '#3a2a24', dens=0.9, tapa=1)
    # the back leaning a little toward the table, shoulders, the arm resting on the table
    torso_c = Poligono([(x - 8, MY_ - 22), (x + 8, MY_ - 22), (x + 7.5 - sd * 2.5, MY_ - 44), (x + 4 - sd * 3, MY_ - 48),
                        (x - 4 - sd * 3, MY_ - 48), (x - 7.5 - sd * 2.5, MY_ - 44)])
    FR.volumen(lz, torso_c, ropa, LUZ, dens=0.85, prof=0.5, espesor=6, proyecta=1.5, duro=0.5, grosor=0.25, presion=0.25)
    FR.volumen(lz, Trazo([(x - sd * 3, MY_ - 44), (x - sd * 8, MY_ - 36), (x - sd * 18, MY_ - 33)], (4.6, 4.0, 3.4)),
               ropa, LUZ, dens=0.85, prof=0.5, linea=False, duro=0.5)
    lz.aguada(Elipse(x - sd * 19.5, MY_ - 33, 2.2, 1.6), piel, dens=0.75, tapa=1)
    # the neck and the head, turned to each other
    FR.volumen(lz, Trazo([(x - sd * 3, MY_ - 47), (x - sd * 3.5, MY_ - 53)], (4.2, 4.0)), piel, LUZ, dens=0.6, prof=0.45,
               linea=False, duro=0.3)
    PR.cabeza_perfil(lz, x - sd * 3.5, MY_ - 59.5, 6.6, piel, pelo, mira=-sd, peinado=pein, canas=(edad == 'mayor'))
for x in (MX_ - 9, MX_ + 9):
    lz.aguada(Poligono([(x - 3, MY_ - 34), (x + 3, MY_ - 34), (x + 2.6, MY_ - 40), (x - 2.6, MY_ - 40)], suave=False), '#fbf4e8',
              dens=0.9, tapa=1)
lz.aguada(Elipse(MX_, MY_ - 40, 3.2, 5), '#f2b630', dens=0.9, tapa=1)
lz.luz((MX_, MY_ - 40, 14), '#ffe2a0', fuerza=0.6)

# the big tree on the right, with lanterns in its branches
esc.empieza('arbol', 'El árbol de los farolillos', plano=3, neblina=0.06,
            proyecta=dict(suelo=646, largo=0.25, alto=0.05, fuerza=0.62, difusa=2.0, color='#766296'))
tronco = Trazo(list(spline([(1418, 636), (1412, 560), (1404, 470), (1396, 380), (1384, 300)])), (28, 22, 18, 15, 12))
lz.aguada(tronco, '#7a5a44', dens=0.85, tapa=1, irreg=0.5, borde=0.7, gran=0.5, sombra=(-6, -2, '#4a3a34', 0.6))
lz.rayado(tronco, '#4a3a30', angulo=80, sep=3.2, presion=0.35, largo=12)
for pts in ([(1396, 360), (1350, 320), (1300, 300), (1260, 270)], [(1400, 400), (1450, 350), (1500, 330)],
            [(1390, 320), (1370, 250), (1380, 190)]):
    lz.aguada(Trazo(list(spline(pts)), (10, 7, 5, 3)), '#7a5a44', dens=0.85, tapa=1, irreg=0.4)
rng_arbol = np.random.default_rng(77)      # its own seed: the crown does not change when other things are added
for k in range(15):
    x = rng_arbol.uniform(1250, 1500)
    y = rng_arbol.uniform(140, 330) if x > 1300 else rng_arbol.uniform(230, 320)
    r = rng_arbol.uniform(36, 54)
    mata(lz, x, y, r, rng.choice(['#3f5e5c', '#46625a', '#3a5652']), semilla=600 + k)
FAROLES_ARBOL = [(1262, 296), (1316, 330), (1356, 288), (1446, 360), (1300, 252)]
for (x, y) in FAROLES_ARBOL:
    lz.aguada(Elipse(x, y - 8, 36, 24), '#e8a850', dens=0.5, suave=10)
pie_ = Poligono([(1394, 646), (1402, 626), (1432, 626), (1442, 646), (1426, 642), (1418, 650), (1408, 642)], suave=False)
lz.aguada(pie_, '#7a5a44', dens=0.88, tapa=1, irreg=0.4, borde=0.7, sombra=(-6, -2, '#4a3a34', 0.6))
for (x, y) in FAROLES_ARBOL:
    lz.lapiz([[(x, y - 22), (x, y - 9)]], '#4a3a30', grosor=0.6, presion=0.7)
    f = Elipse(x, y, 7.5, 9)
    lz.aguada(f, rng.choice(['#f2b630', '#ec8a2e', '#e8735e']), dens=0.9, tapa=1, irreg=0.2, toques=[(x - 2, y - 2, 4, '#fff1c0', 0.8)])
    lz.lapiz([arco(x, y, 7.5 * k / 3, 9, 270, 450, 10) for k in (1, 2)], '#a8603a', grosor=0.45, presion=0.45)
    lz.luz((x, y, 13), '#ffe2a0', fuerza=0.55)

# the festival lights: a string across the square, from the big house to the tree
esc.empieza('verbena', 'Las luces de verbena', plano=3, neblina=0.04, borde_luz=0)
cuerda = bezier((150, 352), (520, 470), (980, 470), (1330, 320), 120)
lz.lapiz([cuerda], '#4a3a40', grosor=0.6, presion=0.6, temblor=0.2)
FAROLES = []
for k in range(4, 118, 6):
    x, y = cuerda[k]
    c = ['#f2b630', '#e8735e', '#3f8f8c', '#f6c44e', '#c33c4e'][k % 5]
    lz.aguada(Elipse(x, y + 7, 4.6, 5.6), c, dens=0.9, tapa=1, irreg=0.15, toques=[(x - 1, y + 5, 2.5, '#fff1c0', 0.8)])
    lz.lapiz([[(x, y), (x, y + 2)]], '#4a3a40', grosor=0.5, presion=0.7)
    lz.luz((x, y + 7, 9), '#ffe2a0', fuerza=0.5)
    FAROLES.append((x, y + 7))

# ======================================================================== the festival lights glow, the last sun crosses the square
esc.halos('luces_plaza', 'La luz de los farolillos', [(x, y, 16, 0.32) for (x, y) in FAROLES] +
          [(x, y, 30, 0.38) for (x, y) in FAROLES_ARBOL] + [(1330, 495, 30, 0.3), (1361, 462, 22, 0.35)], color='#ffc878')
esc.rayos(haces=5, abertura=(8, 26), largo=1100, fuerza=0.36, motas=40, semilla=21, motas_zona=(140, 320, 760, 640),
          brillo=0.3)

# ======================================================================== plane 2: the people and their work
SOMBRA = dict(largo=1.6, alto=0.09, fuerza=0.72, difusa=1.6, color='#5a4a80')
FIG = dict(plano=2, borde_luz=1.0, ancho_borde=2.4, volumen=0.3, color_borde='#facd96', borde_irregular=True)
# the guitarist comes forward and down, nearer than the painter, his white hair rimmed by the sun
GUIT = dict(escala=0.86, ancla=(245, 505), mueve=(-60, 100))
esc.empieza('guitarrista', 'El guitarrista', proyecta=dict(suelo=608, **SOMBRA), **FIG, **GUIT)
PR.guitarrista(sombra=False)
# the dancer, her skirt and its flowers a little smaller and to the right, so her raised hand and the stars
# stay clear of the web page's buttons
DANZA = dict(escala=0.9, ancla=(650, 785), mueve=(60, 0))
mano_alta = Escena.punto(P.MANO_ALTA, **DANZA)
esc.empieza('musica', 'La música', plano=2, borde_luz=0, volumen=0, opaco=False)
BOCA = Escena.punto(P.Rg(12, 0), **GUIT)
P.musica_desde(BOCA, mano_alta, salida=(BOCA[0] + 120, BOCA[1] + 40), corona=(10, 8))
esc.empieza('falda', 'La falda-jardín', tinte=dict(color='#7a6aa8', fuerza=0.3, de=(1045, 0), a=(860, 0)), **FIG, **DANZA)
lz.aguada(Elipse(817, 811, 158, 16), '#5a4a80', dens=0.48, suave=7, gran=0.1)
lz.aguada(Elipse(648, 781, 19, 4), '#5a4a80', dens=0.5, suave=1.5)
inicio_hebra = P.falda(sombra=False, con_hebra=False)
PR.pie_bailarina()
esc.empieza('bailarina', 'La bailarina', **FIG, **DANZA)
PR.bailarina()
esc.empieza('flores', 'Las flores que se vuelven pájaros', **FIG)
ROJO = '#d8434e'
# 1. a flower on the hem whose top petals begin to lift (about 24 across)
for k in range(5):
    a = math.radians(k * 72 + 20)
    lift = -7 if k in (0, 1) else 0
    lz.aguada(Elipse(1046 + math.cos(a) * 6.5, 470 + math.sin(a) * 6.5 + lift, 6.5, 3.6, math.degrees(a)), ROJO, dens=0.9,
              tapa=1, irreg=0.2)
lz.aguada(Elipse(1046, 470, 2.8), '#f2d36b', dens=0.95, tapa=1)
# 2. half flower, half bird (about 30): two petals are wings, a head with an eye and a little bill
lz.aguada(Elipse(1062, 424, 9, 5, -20), ROJO, dens=0.9, tapa=1, irreg=0.2)
for sd in (-1, 1):
    lz.aguada(Elipse(1058 + sd * 4, 414 + sd * 3, 10, 4.2, -62 + sd * 32), ROJO, dens=0.9, tapa=1, irreg=0.2)
lz.aguada(Elipse(1073, 419, 3.2), ROJO, dens=0.92, tapa=1)
lz.aguada(Elipse(1074, 418.4, 0.9), '#1e1410', dens=0.95, tapa=1)
lz.aguada(Poligono([(1076, 418.5), (1079.5, 419.5), (1076, 420.8)], suave=False), '#e8a030', dens=0.95, tapa=1)
# 3. a bird (about 36) whose tail is still an open corolla of five petals
P.pajaro(lz, 1086, 380, 12, ROJO, ang=-20)
for k in range(5):
    a = math.radians(150 + k * 15)
    lz.aguada(Elipse(1072 + math.cos(a) * 7, 386 + math.sin(a) * 7, 7, 2.8, math.degrees(a)), ROJO, dens=0.9, tapa=1)
esc.empieza('lana', 'La lana', plano=2, borde_luz=0.5, volumen=0)
PR.hebra(Escena.punto(inicio_hebra, **DANZA))
esc.empieza('abuela', 'La abuela que teje', proyecta=dict(suelo=822, **SOMBRA), **FIG)
PR.abuela(sombra=False)
esc.empieza('nina', 'La niña del barro', proyecta=dict(suelo=816, **SOMBRA), **FIG)
PR.nina(sombra=False)
lz.aguada(Elipse(913, 733, 6, 5), '#965aaa', dens=0.6, irreg=0.4, borde=0.9)
lz.lapiz([[(912, 727), (912, 732)]], '#4f6f45', grosor=1.1, presion=0.8)
for k, (x, y, s_, c, a) in enumerate(((1118, 346, 17, '#d8434e', -20), (1204, 284, 15, P.TEAL, -12), (1290, 236, 12, P.ORO, -24))):
    esc.empieza(f'pajaro{k + 1}', ['El pájaro coral', 'El pájaro turquesa', 'El pájaro dorado'][k], **FIG)
    P.pajaro(lz, x, y, s_, c, ang=a)

# ======================================================================== plane 1: what is nearest
esc.empieza('parra', 'La parra de arriba', plano=1, sombra=0.56, color_sombra='#3a2c38', borde_luz=0.55, ancho_borde=1.4, color_borde='#e9b25a')


def hoja_parra(cx, cy, r, giro, color):
    """A vine leaf: five pointed, toothed lobes, light veins from the stalk."""
    pts = []
    for k in range(5):
        a0 = math.radians(giro - 140 + k * 70)
        for (da, rr) in ((-26, 0.5), (-18, 0.72), (-12, 0.66), (-6, 0.9), (0, 1.0), (6, 0.9), (12, 0.66), (18, 0.72), (26, 0.5)):
            a = a0 + math.radians(da)
            pts.append((cx + math.cos(a) * r * rr, cy + math.sin(a) * r * rr))
        pts.append((cx + math.cos(a0 + math.radians(35)) * r * 0.38, cy + math.sin(a0 + math.radians(35)) * r * 0.38))
    f = Poligono(pts, suave=False)
    lz.aguada(f, color, dens=0.95, tapa=1, irreg=0.25, borde=0.85, toques=[(cx + r * 0.2, cy - r * 0.2, r * 0.5, '#5a7040', 0.5)])
    lz.lapiz([[(cx, cy), (cx + math.cos(math.radians(giro - 140 + k * 70)) * r * 0.85,
                          cy + math.sin(math.radians(giro - 140 + k * 70)) * r * 0.85)] for k in range(5)], '#7a8a5a',
             grosor=0.6, presion=0.55)


for (pts, n_) in (([(-20, 70), (70, 40), (170, 52), (250, 30), (318, 6)], 7), ([(30, -10), (24, 80), (20, 150), (36, 210)], 4)):
    rama = list(spline(pts))
    lz.aguada(Trazo(rama, (7, 6, 5, 4, 3)), '#4a3a30', dens=0.9, tapa=1, irreg=0.4)
    for capa_ in range(2):                                  # two layers: the back leaves darker
        for k, (x, y) in enumerate(remuestrea(rama, 300 / n_)[1:]):
            hoja_parra(x + rng.normal(0, 12), y + rng.uniform(10, 30), rng.uniform(30, 45), rng.uniform(60, 120),
                       ['#26331f', '#2d3c26'][capa_] if capa_ == 0 else rng.choice(['#2d3c28', '#384a30']))
uvas = [(214 + rng.normal(0, 5) - j * 0.6, 84 + j * 4.2 + rng.normal(0, 1)) for j in range(11)]
for (x, y) in uvas:                                          # a bunch of grapes, not a grid
    lz.aguada(Elipse(x, y, 3.8), '#4a3460', dens=0.92, tapa=1, irreg=0.15)
    lz.gouache(Elipse(x - 1, y - 1.4, 0.8), '#e8d8f0', alfa=0.65, irreg=0)

esc.empieza('maceta', 'La maceta de geranios', plano=1, sombra=0.56, color_sombra='#3a2c38', borde_luz=0.55, ancho_borde=1.4, color_borde='#e9b25a', escala=1.4, ancla=(-10, 870))
maceta = Poligono([(-10, 760), (150, 760), (138, 870), (2, 870)], suave=False)
lz.aguada(maceta, '#b8603a', dens=0.85, tapa=1, irreg=0.3, borde=0.7, gran=0.4, toques=[(40, 800, 60, '#d9804a', 0.6)])
lz.aguada(Poligono([(-14, 748), (156, 748), (156, 766), (-14, 766)], suave=False), '#a8503a', dens=0.9, tapa=1, irreg=0.2)
lz.contorno(maceta, '#6a3020', grosor=0.7, presion=0.55, cortes=0.2)


def hoja_geranio(x, y, r):
    """A geranium leaf: round and scalloped, with its darker horseshoe ring."""
    festones = Circulos([(x + math.cos(a) * r * 0.72, y + math.sin(a) * r * 0.62, r * 0.38)
                         for a in np.radians(np.arange(0, 360, 45) + rng.uniform(0, 45))] + [(x, y, r * 0.7)])
    lz.aguada(festones, rng.choice(['#2f5a32', '#3a6638', '#2a4f2e']), dens=0.92, tapa=1, irreg=0.3, borde=0.85,
              toques=[(x - r * 0.2, y - r * 0.25, r * 0.45, '#6a8a44', 0.5)])
    if rng.random() < 0.3:      # the dark horseshoe of the geranium, on a few
        lz.aguada(Circulos([(x, y, r * 0.55)]) - Circulos([(x, y, r * 0.32)]) - Poligono([(x, y), (x + r, y + r), (x - r, y + r)]),
                  '#1f3320', dens=0.45, suave=1.2)


for (x0_, x1_) in ((30, 46), (80, 70), (120, 104)):         # stalks from the soil, under the leaves
    lz.lapiz([[(x0_, 756), (x1_, 700)]], '#3f5a36', grosor=1.6, presion=0.8)
for k in range(26):
    hoja_geranio(rng.uniform(-20, 168), rng.uniform(650, 760), rng.uniform(9, 24))
for (x, y, r) in ((14, 652, 12), (38, 668, 14), (22, 694, 11), (46, 700, 10)):   # leaves with the sun through them
    hoja_geranio(x, y, r)
    lz.aguada(Circulos([(x, y, r * 0.8)]), '#9aac58', dens=0.55, suave=2)
    lz.luz((x, y, r * 0.9), '#ffe2a0', fuerza=0.35)
lz.aguada(maceta, '#5f4452', dens=0.6, desvanece=(150, 800, 80, 800))
for (x, y) in ((20, 625), (55, 640), (10, 668), (105, 676), (140, 668)):
    lz.lapiz([bezier((x + rng.normal(0, 6), y + 80), (x + 4, y + 44), (x, y + 8), n=12)], '#3f5a36', grosor=1.8, presion=0.85)
    for j in range(16):                        # an umbel: a ball of five-petalled flowers on its stalk
        a = rng.uniform(0, 2 * math.pi)
        rr = rng.uniform(0, 11) ** 0.85
        flor_simple(lz, x + math.cos(a) * rr, y + math.sin(a) * rr * 0.85, 6.4, rng.choice(['#e8323e', '#f0434e', '#d82a3a', '#ff605a']),
                    centro='#f2d36b')

esc.empieza('mesa', 'La mesa de los pinceles', plano=1, sombra=0.56, color_sombra='#3a2c38', borde_luz=0.55, ancho_borde=1.4, color_borde='#e9b25a')
TOP_Y, FRENTE_Y = 752, 792
tablero = Poligono([(1124, FRENTE_Y), (1515, FRENTE_Y), (1515, TOP_Y), (1150, TOP_Y)], suave=False)
lz.aguada(tablero, '#a8744a', dens=0.85, tapa=1, irreg=0.3, borde=0.7, gran=0.4, toques=[(1180, 770, 60, '#c9905a', 0.6)])
lz.rayado(tablero, '#6a4a30', angulo=0, sep=5, presion=0.3, largo=40)
frente = Poligono([(1124, FRENTE_Y), (1515, FRENTE_Y), (1515, 880), (1124, 880)], suave=False)
lz.aguada(frente, '#6a4430', dens=0.9, tapa=1, irreg=0.3, borde=0.7)
lz.lapiz([[(1124, FRENTE_Y), (1515, FRENTE_Y)]], '#3a2418', grosor=1.0, presion=0.7)
# a jar of brushes standing on the table
JX = 1346
jar = Poligono([(JX - 17, 786), (JX + 17, 786), (JX + 15, 726), (JX - 15, 726)], suave=False)
lz.aguada(jar, '#9cc7d6', dens=0.55, tapa=1, irreg=0.2, borde=0.9)
for k in range(6):
    x0 = JX - 10 + k * 4
    tip = (x0 + (k - 2.5) * 8, 668 - k * 3 + rng.normal(0, 3))
    lz.lapiz([[(x0, 780), tip]], rng.choice(['#c9a06a', '#8a5a3a', '#e8735e']), grosor=1.6, presion=0.85, temblor=0.03)
    lz.aguada(Elipse(*tip, 2.2, 5, math.degrees(math.atan2(tip[1] - 780, tip[0] - x0)) + 90),
              rng.choice(['#3f8f8c', '#c33c4e', '#f2b630', '#5e3f30']), dens=0.95, tapa=1)
lz.contorno(jar, '#5a7a8a', grosor=0.5, presion=0.5)
# a clay jug, still unglazed
jarra = Poligono(list(spline([(1276, 784), (1260, 752), (1266, 720), (1282, 704), (1280, 692), (1308, 692), (1306, 704),
                              (1322, 720), (1328, 752), (1312, 782)], cerrada=True)))
lz.aguada(jarra, '#c06a42', dens=0.85, tapa=1, irreg=0.3, borde=0.7, sombra=(-6, -4, '#8a4a2a', 0.5))
lz.lapiz([[(1264, 732), (1324, 732)], [(1262, 750), (1328, 750)]], '#8a4a2a', grosor=0.5, presion=0.4)
lz.contorno(jarra, '#6a3a22', grosor=0.6, presion=0.55)
# paint pots and a palette
for k, c in enumerate(['#f2b630', '#e8735e', '#5f86c0']):
    x = 1384 + k * 24
    pot = Poligono([(x, 784), (x + 18, 784), (x + 17, 766), (x + 1, 766)], suave=False)
    lz.aguada(pot, '#e9e2d6', dens=0.8, tapa=1)
    lz.aguada(Elipse(x + 9, 766, 8.5, 2.6), c, dens=0.95, tapa=1)
pal = Elipse(1482, 778, 30, 9, -4)
lz.aguada(pal, '#d9a46a', dens=0.85, tapa=1, irreg=0.2)
for k, c in enumerate(['#c33c4e', '#f2b630', '#3f8f8c', '#8d73b0', '#e8735e']):
    lz.aguada(Elipse(1462 + k * 8, 776 + (k % 2) * 3, 3.0, 1.9), c, dens=0.95, tapa=1)

esc.empieza('farolillos', 'Los farolillos de arriba', plano=1, sombra=0.0, borde_luz=0.3, volumen=0)
for (x, y, r, c) in ((1186, 92, 30, '#ec8a2e'), (1296, 140, 24, '#e8735e'), (1412, 74, 34, '#f2b630')):
    lz.lapiz([[(x, -10), (x, y - r * 1.1)]], '#3a2a2a', grosor=0.9, presion=0.8)
    f = Elipse(x, y, r * 0.86, r)
    lz.aguada(f, c, dens=0.85, tapa=1, irreg=0.25, borde=0.9, toques=[(x - r * 0.2, y - r * 0.1, r * 0.5, '#fff1c0', 0.85)])
    lz.lapiz([arco(x, y, r * 0.86 * k / 4, r, 270, 450, 14) for k in (1, 2, 3)] +
             [arco(x, y, r * 0.86 * k / 4, r, 90, 270, 14) for k in (1, 2, 3)], mezcla(c, '#5a2a1a', 0.5), grosor=0.6,
             presion=0.5)
    for sd in (-1, 1):
        lz.aguada(Poligono([(x - r * 0.4, y + sd * r * 0.95), (x + r * 0.4, y + sd * r * 0.95), (x + r * 0.36, y + sd * r * 1.1),
                            (x - r * 0.36, y + sd * r * 1.1)], suave=False), '#3a2a2a', dens=0.9, tapa=1)
    lz.luz((x, y, r * 1.3), '#ffe6a6', fuerza=0.75)
esc.halos('luz_farolillos', 'La luz de los farolillos de arriba',
          [(1186, 92, 64, 0.3), (1296, 140, 50, 0.3), (1412, 74, 72, 0.3)], color='#ffc070')

esc.termina()
esc.marco(margen=22, irreg=1.2, acuarela=True, blooms=[(1420, 820, 30), (40, 52, 28), (1460, 260, 22), (700, 834, 26)])
esc.guardar(SALIDA, CARPETA_CAPAS)
print('ok', SALIDA)
