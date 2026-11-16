"""
Mes 6 -- Tecnología y Energía -- Diseño 6: design 5's scene with the people painted as a
realistic watercolour.

Eugenio (2026-11-16): «cambia el estilo del dibujo de ambas, para que los personajes sean
más realistas, ahora parece mucho que lo ha pintado un niño, tiene que ser una acuarela
realista, mantén todos los elementos, pero cambia el estilo, y para no perder el diseño
anterior, añádelo en un nuevo diseño».

Same composition, planes and movable pieces as mes-06-e.py. What changes: figuras_real
paints every head, hand, limb, neck and garment (realistic proportions, form from light,
layered glazes and pencil hatching, almost no outline); personajes_real redraws the boy,
the grandfather's hands and the hand with the phone; every pencil outline is softened;
the bulb and the sun light the people; the storks have bodies.

What follows is design 5's own description.

Mes 6 -- Tecnología y Energía -- Diseño 5: the same scene, built in depth planes.

Eugenio (2026-11-15): «utiliza al menos entre 3 y 5 planos y capas de profundidad…
reutilizando los elementos que has diseñado, pero pudiendo añadirlos en diferentes
planos o añadiendo otros elementos de fondo… detallitos ocultos en el fondo pero bien
ilustrados… juega con las luces».

The idea is design 4's (a sunflower whose face is a solar panel shares the June sun with
a grandfather and a girl mending a lamp, a boy sowing seeds that are wind turbines, a
hill town of solar roofs, a hand whose phone lets a swallow out), now placed in a deep
June evening landscape lit from the low sun at the upper right:

  5  very far   a range of mountains, almost air
  4  far        green ridges with a wind farm, a small town and a lake catching the light,
                a balloon and a glider in the golden air
  3  middle     meadows, a field of little sunflowers that are solar panels too, a stone
                bridge with a solar train, beehives, the hill town with its velomobiles,
                the big glider and the satellite
     (light)    shafts of sun and pollen between the middle distance and the protagonists
  2  main       the giant sunflower with the three people, the seeds, the bee, the threads
                of light to the roofs, the swallow
  1  near       grasses, wheat, poppies and a dandelion clock against the light, a branch
                over the top-left corner, the hand with the phone

    python3 mes-06-f.py [ancho_px] [salida.jpg|.png] [carpeta_capas]
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, hoja, hojita, flor_simple, mata,
                      remuestrea)
from planos import Escena
import piezas_06 as P
import personajes_06
import figuras_real as FR

FR.activar((0.6, -0.8), personajes_06, P, lineas=0.6)
from personajes_06 import nina, labio_hoja                              # noqa: E402
from personajes_real import abuelo_y_lampara, nino, mano_con_telefono, nina06   # noqa: E402

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-06-f.jpg'
CARPETA_CAPAS = sys.argv[3] if len(sys.argv) > 3 else None

SOL = (1250, 170)
esc = Escena(ANCHO, semilla=616, sol=SOL, color_luz='#ffe3a6', aire_calido='#f5d9a6', aire_frio='#c9d0e3',
             radio_luz=560, color_sombra='#26304a')
lz = esc.lienzo
P.usar(lz)
rng = np.random.default_rng(16)
# the swallow is painted inside mano_con_telefono(), which marks it itself
esc.config['golondrina'] = dict(plano=2)

# the hill town goes back into the middle distance: smaller, higher, on its own hill
PUEBLO = dict(escala=0.8, ancla=(1446, 818), mueve=(12, -54))


def en_pueblo(p):
    return Escena.punto(p, PUEBLO['escala'], PUEBLO['ancla'], PUEBLO['mueve'])


# ======================================================================== the sky (static background)
cielo = Poligono([(-30, -30), (1515, -30), (1515, 720), (-30, 720)], suave=False)
lz.aguada(cielo, '#aebedb', dens=0.34, suave=70, gran=0.12, var=0.45, desvanece=(250, -40, 980, 600))
lz.aguada(Elipse(SOL[0], SOL[1] + 60, 820, 470), '#f6dcaa', dens=0.34, suave=130, gran=0.08, var=0.3)
lz.aguada(Elipse(SOL[0], SOL[1] + 10, 400, 270), '#f3c278', dens=0.3, suave=95, gran=0.06, var=0.25)
lz.aguada(Poligono([(-30, 470), (1515, 440), (1515, 700), (-30, 700)]), '#f0c6a2', dens=0.22, suave=55, var=0.4)
# the sun: a warm disc with a wide halo, the brightest thing in the picture
lz.aguada(Elipse(SOL[0], SOL[1], 230), '#ffd28c', dens=0.26, suave=90, gran=0.04)
lz.levanta(Elipse(SOL[0], SOL[1], 52), 1.0, suave=7)
lz.aguada(Elipse(SOL[0], SOL[1], 64), '#f9d683', dens=0.26, suave=10)
lz.levanta(Elipse(SOL[0], SOL[1], 38), 1.0, suave=2)
lz.aguada(Elipse(SOL[0], SOL[1], 170) - Elipse(SOL[0], SOL[1], 58), '#efae52', dens=0.34, suave=34, gran=0.04)
lz.aguada(Elipse(SOL[0], SOL[1], 46) - Elipse(SOL[0], SOL[1], 38), '#f2c260', dens=0.5, suave=3)
lz.gouache(Elipse(SOL[0], SOL[1], 40), '#fdf9e8', alfa=0.95, irreg=0)
lz.luz((SOL[0], SOL[1], 150), '#fff0c4', fuerza=0.55)
lz.aguada(Elipse(540, 455, 120, 85), '#b4b6c6', dens=0.28, suave=45)      # cooler air behind the heads: the bulb stands out


def nube(x0, x1, base, alto, semilla, cuerpo='#b4a9c6', panza='#958cb0', fuerza_borde=0.55, dens=0.32):
    """A cumulus lit from behind: lumps on a flat belly, lavender body, a darker belly,
    a golden rim on the side of the sun."""
    r_ = np.random.default_rng(semilla)
    cs = []
    n_ = max(4, int((x1 - x0) / (alto * 0.7)))
    for k in range(n_):
        t = (k + 0.5) / n_
        r = alto * (0.45 + 0.55 * math.sin(math.pi * t)) * r_.uniform(0.75, 1.15)
        cs.append((x0 + (x1 - x0) * t + r_.normal(0, alto * 0.12), base - r * 0.55 + r_.normal(0, alto * 0.08), r))
    for k in range(n_ // 2):                       # a second row of lumps on top, near the middle
        t = r_.uniform(0.25, 0.75)
        r = alto * r_.uniform(0.35, 0.6)
        cs.append((x0 + (x1 - x0) * t, base - alto * 0.85 - r * 0.3, r))
    f = Circulos(cs) & Poligono([(x0 - 80, base + 2), (x1 + 80, base + 2), (x1 + 80, base - 400), (x0 - 80, base - 400)],
                                suave=False)
    dentro = Circulos([(x, y, max(1.0, r - 5)) for (x, y, r) in cs]) & Poligono(
        [(x0 - 80, base - 3), (x1 + 80, base - 3), (x1 + 80, base - 400), (x0 - 80, base - 400)], suave=False)
    lz.aguada(dentro, cuerpo, dens=dens * 0.5, suave=3, tapa=1)             # hides the sun, never shows a rim
    lz.aguada(f, cuerpo, dens=dens, irreg=1.5, borde=0.3, gran=0.2, var=0.5)
    y0, y1 = min(c[1] - c[2] for c in cs), base
    lz.aguada(f, panza, dens=dens * 0.9, irreg=1.2, desvanece=(0, y1, 0, y1 - (y1 - y0) * 0.6))
    cx = np.mean([c[0] for c in cs])
    cy = np.mean([c[1] for c in cs])
    ux, uy = SOL[0] - cx, SOL[1] - cy
    n = math.hypot(ux, uy)
    k = 3.0 + 3.0 * fuerza_borde
    sombra = Circulos([(x - ux / n * k, y - uy / n * k, r) for (x, y, r) in cs])
    lz.aguada(f - sombra, '#f5c35a', dens=0.8 * fuerza_borde, suave=2.5)
    lz.luz(f - sombra, '#ffd98a', fuerza=fuerza_borde, suave=3)


# the cloud bank crosses in front of the lower half of the sun: its top catches fire
nube(1150, 1360, 232, 38, 1, cuerpo='#c2b2b2', panza='#968798', fuerza_borde=1.0, dens=0.62)
nube(905, 1105, 372, 30, 2, dens=0.3, fuerza_borde=0.8)
nube(150, 370, 180, 28, 3, dens=0.26, fuerza_borde=0.45)
nube(-30, 190, 506, 30, 4, dens=0.26, fuerza_borde=0.4)
nube(1360, 1500, 424, 22, 5, dens=0.26, fuerza_borde=0.7)


def cresta(x0, x1, base, picos, amp, semilla, paso=18):
    """A ridge line: a sum of gentle bumps plus noise."""
    r_ = np.random.default_rng(semilla)
    xs = np.arange(x0, x1 + paso, paso, dtype=float)
    y = np.full_like(xs, base)
    for (px, ph, pw) in picos:
        y -= ph * np.exp(-((xs - px) / pw) ** 2)
    y += amp * np.cumsum(r_.normal(0, 1, len(xs))) / np.sqrt(len(xs))
    y += r_.normal(0, amp * 0.25, len(xs))
    return np.stack([xs, y], 1)


def altura(linea, x):
    return float(np.interp(x, linea[:, 0], linea[:, 1]))


# ======================================================================== plane 5: the far range
esc.empieza('cordillera', 'La cordillera', plano=5, fija=True)
C5 = cresta(-40, 1530, 586, [(260, 58, 120), (520, 36, 90), (840, 18, 140), (1110, 50, 110), (1420, 64, 130)], 6, 5)
lz.aguada(Poligono(np.vstack([C5, [(1530, 720), (-40, 720)]]), suave=False), '#8996bf', dens=0.6, irreg=0.8, borde=0.4, tapa=1,
          gran=0.3, var=0.4, toques=[(1250, 560, 260, '#c9a7b8', 0.6), (300, 560, 200, '#7f8cba', 0.5)])
# folds of the mountains, a few dry pencil lines down the slopes
for (px, ph, pw) in [(260, 58, 120), (1110, 50, 110), (1420, 64, 130)]:
    for k in range(5):
        x = px + rng.normal(0, pw * 0.4)
        y = altura(C5, x) + 4
        lz.lapiz([bezier((x, y), (x + rng.normal(0, 10), y + 12), (x + rng.normal(0, 18), y + rng.uniform(26, 40)))],
                 '#6a6f9a', grosor=0.5, presion=0.3, temblor=0.4)

# the wind farm on the far ridges: the same seeds, grown up
esc.empieza('eolico', 'El parque eólico lejano', plano=4, neblina=0.5)


def aerogenerador(x, y, h, ang):
    lz.aguada(Trazo([(x, y), (x, y - h)], (2.2, 1.1)), '#f6f2ea', dens=0.9, tapa=1, irreg=0.05)
    lz.lapiz([[(x + 0.8, y), (x + 0.5, y - h)]], '#7a7a8a', grosor=0.35, presion=0.45, temblor=0.02)
    for k in range(3):
        a = math.radians(ang + k * 120)
        tip = (x + math.cos(a) * h * 0.46, y - h + math.sin(a) * h * 0.46)
        lz.aguada(Trazo([(x, y - h), tip], (1.4, 0.4)), '#f6f2ea', dens=0.95, tapa=1, irreg=0.05)
        lz.lapiz([[(x, y - h), tip]], '#8a8a9a', grosor=0.3, presion=0.4, temblor=0.02)
    lz.aguada(Elipse(x, y - h, 1.4), '#d9d4cc', dens=0.9, tapa=1)


for (x, h) in [(318, 34), (372, 30), (430, 27), (958, 26), (1004, 28), (1052, 31), (1452, 36)]:
    aerogenerador(x, altura(C5, x) + 3, h, rng.uniform(0, 120))

# ======================================================================== plane 4: green ridges, a small town, a lake
esc.empieza('lomas', 'Las lomas', plano=4, fija=True)
C4 = cresta(-40, 1530, 634, [(120, 26, 160), (470, 34, 130), (760, 12, 120), (1000, 30, 140), (1330, 22, 120)], 4, 7)
lomas = Poligono(np.vstack([C4, [(1530, 760), (-40, 760)]]), suave=False)
lz.aguada(lomas, '#7f9f8c', dens=0.62, irreg=0.8, borde=0.35, gran=0.35, var=0.45, tapa=1,
          toques=[(1150, 640, 220, '#a9a97a', 0.6), (380, 640, 180, '#6f8f8a', 0.5)])
# a patchwork of fields on the ridges, hatched lightly
for k in range(14):
    x = rng.uniform(20, 1460)
    y = altura(C4, x) + rng.uniform(10, 34)
    w, hh = rng.uniform(30, 70), rng.uniform(6, 12)
    q = [(x, y), (x + w, y - 3), (x + w + 6, y + hh), (x + 4, y + hh + 2)]
    c = rng.choice(['#a9b47a', '#c9b878', '#8fa880', '#b7a98a'])
    lz.aguada(Poligono(q, suave=False), c, dens=0.4, irreg=0.6, borde=0.5)
    lz.rayado(Poligono(q, suave=False), mezcla(c, '#5a5a4a', 0.4), angulo=rng.uniform(-20, 20), sep=3.4, presion=0.2,
              grosor=0.45, largo=20)
lz.lapiz([C4[(C4[:, 0] > -10) & (C4[:, 0] < 1495)]], '#5f7f74', grosor=0.5, presion=0.3, temblor=0.5, cortes=0.5)


def arbolito(x, y, h, tipo, color='#3f6a54', luz_='#e2dc8a'):
    """A small far tree, its sunny side lit: a cypress (pointed) or an oak (lobed)."""
    if tipo == 'cipres':
        f = Poligono(list(spline([(x, y - h), (x + h * 0.17, y - h * 0.5), (x + h * 0.12, y), (x - h * 0.12, y),
                                  (x - h * 0.17, y - h * 0.5)], cerrada=True)))
    else:
        f = Circulos([(x + rng.normal(0, h * 0.12), y - h * 0.55 + rng.normal(0, h * 0.1), h * rng.uniform(0.28, 0.4))
                      for _ in range(4)])
        lz.lapiz([[(x, y), (x, y - h * 0.3)]], '#5a4a3a', grosor=0.5, presion=0.6)
    lz.aguada(f, color, dens=0.85, tapa=1, irreg=0.4, borde=0.6)
    lado = f - (Poligono(list(spline([(x - h, y - h * 2), (x + h * 0.08, y - h * 2), (x + h * 0.08, y + h), (x - h, y + h)])))
                 if tipo == 'cipres' else Circulos([(x - h * 0.12, y - h * 0.48, h * 0.42)]))
    lz.aguada(lado, luz_, dens=0.75, irreg=0.3, tapa=0.5)


# rows of trees along the ridges
for k in range(34):
    x = rng.uniform(0, 1480)
    y = altura(C4, x) + rng.uniform(4, 22)
    arbolito(x, y, rng.uniform(8, 14), rng.choice(['cipres', 'encina', 'encina']))

# the lake in the valley catches the evening light
esc.empieza('lago', 'El lago', plano=4, fija=True, neblina=0.3)
lago = Poligono([(744, 656), (770, 646), (812, 643), (846, 636), (884, 639), (930, 632), (972, 637), (1016, 634),
                 (1058, 641), (1094, 646), (1112, 652), (1084, 659), (1046, 662), (1008, 668), (962, 664), (918, 671),
                 (874, 667), (836, 671), (796, 664), (762, 664)])
lz.aguada(lago, '#8fb0c8', dens=0.6, irreg=0.4, borde=0.7, tapa=1,
          toques=[(990, 648, 90, '#f6dfa6', 0.9), (900, 652, 50, '#fbecc4', 0.8)])
lz.luz(Elipse(980, 650, 110, 10), '#fff1c4', fuerza=0.45, suave=6)
for k in range(26):
    x = rng.uniform(800, 1070)
    y = rng.uniform(642, 658)
    lz.gouache(Trazo([(x, y), (x + rng.uniform(4, 10), y)], (0.8, 0.5)), '#fff3cf', alfa=0.8, irreg=0.1)
lz.lapiz([[(770, 662), (900, 666), (1040, 662)]], '#6f8a9a', grosor=0.4, presion=0.3, temblor=0.3, cortes=0.4)
for k in range(30):          # the sky's warm light, laid on the water in horizontal strokes
    x = rng.uniform(780, 1080)
    y = rng.uniform(642, 664)
    lz.lapiz([[(x, y), (x + rng.uniform(10, 34), y + rng.normal(0, 0.4))]], rng.choice(['#f2c27a', '#e9a98a', '#f6dca0']),
             grosor=0.7, presion=0.55, temblor=0.15)
for k in range(10):          # the far town and its church, upside down and broken by ripples
    x = rng.uniform(842, 904)
    lz.lapiz([[(x, 644 + k % 3), (x + rng.uniform(3, 7), 644 + k % 3)]], rng.choice(['#e8b8a0', '#d98a6a', '#f2dcb4']),
             grosor=0.9, presion=0.5)

# a small town on the far ridge, with its church: a detail for the second look
esc.empieza('pueblo_lejano', 'El pueblo lejano', plano=4, neblina=0.42)


def casita(x, y, w, h, pared, teja):
    lz.aguada(Poligono([(x, y), (x + w, y), (x + w, y - h), (x, y - h)], suave=False), pared, dens=0.8, tapa=1, irreg=0.1)
    lz.aguada(Poligono([(x - 1, y - h), (x + w + 1, y - h), (x + w * 0.5, y - h - w * 0.4)], suave=False), teja, dens=0.9,
              tapa=1, irreg=0.1)
    lz.aguada(Elipse(x + w * 0.5, y - h * 0.5, 0.7, 1.0), '#5a5a7a', dens=0.8, tapa=1)


for (x, w, h, pared, teja) in [(842, 9, 7, '#f6ead6', '#c4553a'), (852, 8, 9, '#eda38a', '#8a4a3a'),
                               (862, 10, 6, '#f4e2a8', '#b8553a'), (874, 9, 8, '#f6ead6', '#6f5a8a'),
                               (884, 8, 6, '#dfe3d6', '#c4553a'), (894, 10, 7, '#f6ead6', '#9a3a3a')]:
    casita(x, altura(C4, x + w / 2) + 6, w, h, pared, teja)
# the church: a tower with a pointed roof
tx = 868
ty = altura(C4, tx) + 2
lz.aguada(Poligono([(tx, ty), (tx + 6, ty), (tx + 6, ty - 22), (tx, ty - 22)], suave=False), '#f2dcb4', dens=0.85, tapa=1)
lz.aguada(Poligono([(tx - 1, ty - 22), (tx + 7, ty - 22), (tx + 3, ty - 33)], suave=False), '#a8503a', dens=0.95, tapa=1)
lz.aguada(Elipse(tx + 3, ty - 17, 1.3), '#3e3a5a', dens=0.9, tapa=1)

# a balloon drifting in the golden air, and the small glider
esc.empieza('globo', 'El globo', plano=4, neblina=0.34)
GX, GY, GR = 438, 318, 19
env = Poligono(list(spline([(GX, GY - GR), (GX + GR * 0.95, GY - GR * 0.35), (GX + GR * 0.6, GY + GR * 0.55),
                            (GX + GR * 0.18, GY + GR * 1.05), (GX - GR * 0.18, GY + GR * 1.05), (GX - GR * 0.6, GY + GR * 0.55),
                            (GX - GR * 0.95, GY - GR * 0.35)], cerrada=True)))
lz.aguada(env, '#e8735e', dens=0.85, tapa=1, borde=0.7, irreg=0.3,
          toques=[(GX + 8, GY - 6, 12, '#f6c66e', 0.7), (GX - 10, GY + 4, 10, '#c4503a', 0.5)])
for k, c in enumerate(['#f2b630', '#2f8f92', '#f2b630']):
    u = (k - 1) * 0.42
    gaj = Poligono([(GX + u * GR - 2.4, GY - GR * 0.97 + abs(u) * 6), (GX + u * GR + 2.4, GY - GR * 0.97 + abs(u) * 6),
                    (GX + u * GR * 0.4 + 1.6, GY + GR), (GX + u * GR * 0.4 - 1.6, GY + GR)])
    lz.aguada(gaj, c, dens=0.85, tapa=1, irreg=0.2)
lz.contorno(env, '#8a3a2a', grosor=0.5, presion=0.5, cortes=0.2)
lz.lapiz([[(GX - 4, GY + GR * 1.05), (GX - 3, GY + GR + 9)], [(GX + 4, GY + GR * 1.05), (GX + 3, GY + GR + 9)]], '#5e3f30',
         grosor=0.4, presion=0.5)
lz.aguada(Poligono([(GX - 4, GY + GR + 9), (GX + 4, GY + GR + 9), (GX + 3, GY + GR + 14), (GX - 3, GY + GR + 14)], suave=False),
          '#9a6a3a', dens=0.9, tapa=1)
esc.empieza('bandada', 'Las cigüeñas', plano=4, neblina=0.3)


def ciguena(x, y, env, alza):
    """A stork in profile flying right, built so it reads as a bird even small: a full white
    body tapering to the tail, the neck stretched forward with a small head and the long red
    bill, red legs trailing past the tail, and broad wings -- white in front, black behind,
    the black flight feathers splayed like fingers at the tip."""
    cuerpo = Poligono([(x - env * 0.26, y + env * 0.02), (x - env * 0.12, y - env * 0.06), (x + env * 0.1, y - env * 0.07),
                       (x + env * 0.2, y - env * 0.04), (x + env * 0.22, y + env * 0.02), (x + env * 0.06, y + env * 0.07),
                       (x - env * 0.16, y + env * 0.06)])
    lz.aguada(cuerpo, '#f6f4f0', dens=0.95, tapa=1, irreg=0.05)
    lz.aguada(Elipse(x, y + env * 0.035, env * 0.17, env * 0.03, -3), '#c8ccd8', dens=0.55, suave=0.6)
    cuello = Trazo([(x + env * 0.17, y - env * 0.03), (x + env * 0.36, y - env * 0.07), (x + env * 0.52, y - env * 0.08)],
                   (env * 0.07, env * 0.045, env * 0.04))
    lz.aguada(cuello, '#f6f4f0', dens=0.95, tapa=1, irreg=0.05)
    lz.aguada(Elipse(x + env * 0.54, y - env * 0.085, env * 0.05, env * 0.04), '#f6f4f0', dens=0.95, tapa=1)
    lz.aguada(Elipse(x + env * 0.555, y - env * 0.09, env * 0.012), '#2a2424', dens=0.9, tapa=1)
    for f_ in (cuerpo, cuello):
        lz.contorno(f_, '#968c82', grosor=0.4, presion=0.55, cortes=0.15)
    lz.lapiz([[(x + env * 0.58, y - env * 0.085), (x + env * 0.8, y - env * 0.05)]], '#d0402a', grosor=0.85, presion=0.95)
    for dy in (0.0, 0.025):
        lz.lapiz([[(x - env * 0.2, y + env * (0.04 + dy)), (x - env * 0.56, y + env * (0.08 + dy))]], '#d0402a',
                 grosor=0.45, presion=0.9)
    ang = math.radians(-112 if alza > 0 else 122)
    ux, uy = math.cos(ang), math.sin(ang)
    nx, ny = -uy, ux
    L = env * 0.72
    raiz = (x + env * 0.02, y - env * 0.02)
    def P_(t, w):
        return (raiz[0] + ux * L * t + nx * w, raiz[1] + uy * L * t + ny * w)
    sd = 1 if alza > 0 else -1
    blanco = Poligono([P_(0, sd * env * 0.02), P_(0.9, sd * env * 0.01), P_(0.84, sd * env * 0.09), P_(0.05, sd * env * 0.13)])
    negro = Poligono([P_(0, 0), P_(0.92, 0), P_(1.0, -sd * env * 0.04), P_(0.86, -sd * env * 0.13), P_(0.1, -sd * env * 0.12)])
    lz.aguada(negro, '#26242b', dens=0.95, tapa=1, irreg=0.05)
    for k in range(4):                                         # the splayed primaries
        a0 = P_(0.8, -sd * env * (0.02 + 0.03 * k))
        a1 = P_(1.08 - 0.03 * k, -sd * env * (0.0 + 0.05 * k))
        lz.aguada(Trazo([a0, a1], (env * 0.035, env * 0.012)), '#26242b', dens=0.95, tapa=1)
    lz.aguada(blanco, '#f6f4f0', dens=0.95, tapa=1, irreg=0.05)
    lz.contorno(blanco, '#968c82', grosor=0.35, presion=0.5, cortes=0.2)


for (x, y, al, t) in ((342, 330, 1, 31), (312, 348, -1, 28), (282, 366, 1, 26), (254, 384, -1, 24), (304, 304, -1, 29),
                      (270, 284, 1, 25)):
    ciguena(x, y, t, al)
esc.empieza('planeador2', 'El planeador pequeño', plano=4, neblina=0.3)
P.planeador(1338, 404, 78, inclina=-24, franja='#e8735e')

# ======================================================================== plane 3: meadows, a field, a bridge, the town
esc.empieza('praderas', 'Las praderas', plano=3, fija=True)
C3 = cresta(-40, 1530, 692, [(150, 30, 170), (520, 20, 140), (880, 6, 160), (1250, 18, 200)], 3, 9)
prado = Poligono(np.vstack([C3, [(1530, 880), (-40, 880)]]), suave=False)
lz.aguada(prado, '#a3bd78', dens=0.62, irreg=0.9, borde=0.3, gran=0.4, var=0.5, tapa=1,
          toques=[(1000, 700, 260, '#c9c26a', 0.6), (300, 760, 220, '#7fa45e', 0.6), (700, 820, 200, '#6f9a52', 0.5),
                  (1300, 760, 200, '#9fb46a', 0.5)])
# hedgerows and round trees along the field edges
for linea in ([(-10, 728), (140, 716), (300, 724), (430, 740)], [(980, 712), (1110, 722), (1240, 740)]):
    for (x, y) in remuestrea(spline(linea), 11):
        arbolito(x + rng.normal(0, 3), y + 6, rng.uniform(12, 20), rng.choice(['encina', 'encina', 'cipres']),
                 color=rng.choice(['#4f7a44', '#5f8a4a', '#466e40']), luz_='#c9cf78')
for (x, y, r) in [(90, 700, 13), (250, 708, 11), (1180, 716, 12), (1060, 704, 9)]:
    P.arbol(x, y, r, '#5f8f4a', int(x))
for (x, y, h) in [(470, 732, 44), (486, 736, 38), (1300, 724, 40)]:
    P.cipres(x, y, h, int(x) + 3)
# a path through the meadow, toward the bridge
camino = Trazo(list(spline([(560, 880), (520, 830), (470, 790), (420, 760), (360, 742)])), (14, 12, 9, 7, 5))
lz.aguada(camino, '#e6d3a4', dens=0.6, tapa=0.8, irreg=0.6, desvanece=(560, 880, 360, 742))

# a stone bridge with a little solar train: a detail under the big leaf
esc.empieza('rio', 'El río', plano=3, fija=True)
rio = Trazo(list(spline([(200, 780), (250, 770), (320, 762), (380, 768), (440, 760), (520, 772), (600, 742), (680, 704),
                         (744, 674)])), (6, 6, 7, 8, 7, 6, 5, 4, 3))
lz.aguada(rio, '#9fbad0', dens=0.7, irreg=0.5, toques=[(380, 765, 30, '#f3dca0', 0.7)])
for k in range(8):
    x = 280 + k * 30 + rng.normal(0, 4)
    lz.gouache(Trazo([(x, 765 + rng.normal(0, 1.5)), (x + 6, 765)], (0.6, 0.4)), '#fff3cf', alfa=0.75, irreg=0.1)
esc.empieza('puente', 'El puente y el tren solar', plano=3,
            proyecta=dict(suelo=772, largo=0.55, alto=0.18, fuerza=0.6, difusa=2.2, color='#2f4a38'))
DY = 726
# the embankments: the line comes from behind the grass and goes on behind the sunflower's stem
for q in ([(130, DY + 22), (262, DY + 4), (262, DY - 6), (130, DY + 10)], [(548, DY + 4), (650, DY + 20), (650, DY + 8), (548, DY - 6)]):
    lz.aguada(Poligono(q, suave=False), '#b9a27a', dens=0.8, tapa=1, irreg=0.4)
lz.lapiz([[(130, DY + 9), (262, DY - 7), (548, DY - 7), (650, DY + 7)], [(130, DY + 12), (262, DY - 4.5), (548, DY - 4.5),
                                                                     (650, DY + 10)]],
         '#5e5048', grosor=0.6, presion=0.6, temblor=0.1)
tablero = Poligono([(262, DY - 6), (548, DY - 6), (548, DY + 4), (262, DY + 4)], suave=False)
pilas = Poligono([(262, DY + 4), (548, DY + 4), (548, 772), (262, 772)], suave=False)
ojos = None
for k in range(4):
    cx = 298 + k * 72
    o = Poligono(list(arco(cx, 772, 28, 34, 180, 360, 16)) + [(cx + 28, 772)])
    ojos = o if ojos is None else (ojos | o)
lz.aguada(pilas - ojos, '#d9c3a0', dens=0.8, tapa=1, irreg=0.3, borde=0.7, gran=0.5,
          toques=[(300, 750, 40, '#e9d9b8', 0.6), (520, 750, 40, '#b9a07a', 0.6)])
# the inside of each arch in shadow, darker on the side away from the sun
for k in range(4):
    cx = 298 + k * 72
    intra = Poligono(list(arco(cx, 772, 33, 39, 180, 360, 16)) + list(arco(cx, 772, 28, 34, 360, 180, 16)))
    lz.aguada(intra, '#7a6a68', dens=0.75, irreg=0.2, tapa=1)
    lz.aguada(Poligono([(cx - 36, DY + 4), (cx - 28, DY + 4), (cx - 28, 772), (cx - 36, 772)], suave=False), '#8a7a74',
              dens=0.35, irreg=0.3)
lz.rayado(pilas - ojos, '#9a8060', angulo=0, sep=4.2, presion=0.25, grosor=0.45, largo=10)
lz.aguada(tablero, '#c9b08a', dens=0.85, tapa=1, irreg=0.2)
lz.contorno(pilas - ojos, '#7a6040', grosor=0.5, presion=0.45, cortes=0.3)
# the train: three cream cars with a teal band and solar roofs, warm lit windows
for k in range(3):
    x0 = 330 + k * 46
    car = Poligono([(x0, DY - 6), (x0 + 42, DY - 6), (x0 + 42, DY - 22), (x0 + 3, DY - 22), (x0, DY - 18)], suave=False)
    if k == 0:
        car = Poligono([(x0 - 6, DY - 6), (x0 + 42, DY - 6), (x0 + 42, DY - 22), (x0 + 6, DY - 22), (x0 - 6, DY - 12)])
    lz.aguada(car, '#f6ecd8', dens=0.9, tapa=1, irreg=0.15, borde=0.7)
    lz.aguada(Poligono([(x0 - 4, DY - 11), (x0 + 42, DY - 11), (x0 + 42, DY - 8), (x0 - 4, DY - 8)], suave=False), '#2f8f92',
              dens=0.9, tapa=1)
    P.tejado_solar([(x0 + 6, DY - 24), (x0 + 40, DY - 24), (x0 + 40, DY - 21.5), (x0 + 6, DY - 21.5)], 900 + k)
    for j in range(4):
        wx = x0 + 9 + j * 8.5
        lz.aguada(Poligono([(wx, DY - 19), (wx + 5, DY - 19), (wx + 5, DY - 14), (wx, DY - 14)], suave=False), '#f7d36a',
                  dens=0.9, tapa=1)
        lz.luz((wx + 2.5, DY - 16.5, 4), '#fff0b0', fuerza=0.3)
    lz.contorno(car, '#5e5a5a', grosor=0.45, presion=0.5, cortes=0.1)

# the field of little sunflowers, all turned to the evening sun, each face a small solar panel
esc.empieza('campo_girasoles', 'El campo de girasoles', plano=3)


def girasolito(x, y, r, t=0.0):
    """A little sunflower of the field, turned up and right to the sun; t = distance (0 near, 1 far)."""
    aire = '#c9d0e3'
    lz.lapiz([[(x, y), (x + rng.normal(0, 1.5), y + r * 3.0)]], '#4f7a3a', grosor=max(0.5, r * 0.09), presion=0.7,
             temblor=0.1)
    hojita(lz, x, y + r * 1.4, r * 0.9, rng.uniform(150, 200), '#5f8f4a', nervio=False, tapa=0.9)
    hojita(lz, x, y + r * 1.9, r * 0.9, rng.uniform(-20, 20), '#6f9a52', nervio=False, tapa=0.9)
    giro = math.radians(rng.uniform(-48, -10))  # each face tilts its own way toward the evening sun
    if rng.random() < 0.15:                      # some show us their backs: petal tips peep round a green disc
        for k in range(8):
            a = math.radians(k * 45 + rng.normal(0, 8))
            lz.aguada(Elipse(x + math.cos(a) * r * 0.78, y + math.sin(a) * r * 0.78, r * 0.26, r * 0.11, math.degrees(a)),
                      mezcla('#f2b630', aire, 0.4 * t), dens=0.9, tapa=1)
        lz.aguada(Elipse(x, y, r * 0.66), mezcla('#5f8a42', aire, 0.4 * t), dens=0.92, tapa=1, irreg=0.15)
        for k in range(12):                       # a crown of pointed bracts
            a = math.radians(k * 30 + rng.normal(0, 6))
            p0 = (x + math.cos(a) * r * 0.5, y + math.sin(a) * r * 0.5)
            lz.aguada(Poligono([(p0[0] + math.cos(a + 1.3) * r * 0.12, p0[1] + math.sin(a + 1.3) * r * 0.12),
                                (x + math.cos(a) * r * 0.86, y + math.sin(a) * r * 0.86),
                                (p0[0] + math.cos(a - 1.3) * r * 0.12, p0[1] + math.sin(a - 1.3) * r * 0.12)], suave=False),
                      mezcla('#4a7a3a', aire, 0.4 * t), dens=0.92, tapa=1)
        lz.aguada(Elipse(x, y, r * 0.14), mezcla('#3f6a32', aire, 0.4 * t), dens=0.95, tapa=1)
        return
    cg, sg = math.cos(giro), math.sin(giro)
    Q = lambda u, v: (x + u * cg - v * sg, y + u * sg + v * cg)
    for k in range(14):
        a = math.radians(k * 360 / 14 + rng.normal(0, 6))
        px, py = Q(math.cos(a) * r * 0.46, math.sin(a) * r * 0.9)
        lz.aguada(Elipse(px, py, r * 0.32, r * 0.14, math.degrees(math.atan2(math.sin(a) * 0.9, math.cos(a) * 0.46) + giro)),
                  mezcla(rng.choice(['#f2b630', '#ec9a2e', '#f6c44e']), aire, 0.4 * t), dens=0.9, tapa=1, irreg=0.15)
    lz.aguada(Elipse(*Q(r * 0.2, 0), r * 0.24, r * 0.5, math.degrees(giro)), mezcla('#2f3f72', aire, 0.45 * t), dens=0.95,
              tapa=1, irreg=0.15)
    lz.gouache(Elipse(*Q(r * 0.2, -r * 0.18), r * 0.09, r * 0.14), '#fff1c8', alfa=0.75, irreg=0)


filas = []
for fila in range(9):
    t = fila / 8
    y0 = 852 - t * 150
    x0 = 650 + t * 250
    r = 17 - t * 12
    n = int(8 + t * 5)
    paso = 30 - t * 19
    for k in range(n):
        x = x0 + k * paso + rng.normal(0, 2)
        filas.append((y0 - k * (2.4 + t * 1.5) + rng.normal(0, 1.5), x, r * rng.uniform(0.8, 1.2), t))
for (y, x, r, t) in sorted(filas):
    girasolito(x, y, r, t)

# beehives at the edge of the field
esc.empieza('colmenas', 'Las colmenas', plano=3, proyecta=dict(suelo=812, largo=0.9, alto=0.25, fuerza=0.3))
for k, c in enumerate(['#f2d36b', '#9cc7d6', '#e8a08a']):
    x0 = 900 + k * 24
    y0 = 812 - k * 3
    for j in range(2):
        q = [(x0, y0 - j * 9), (x0 + 18, y0 - j * 9), (x0 + 18, y0 - j * 9 - 8.5), (x0, y0 - j * 9 - 8.5)]
        lz.aguada(Poligono(q, suave=False), mezcla(c, '#ffffff', 0.15 * j), dens=0.85, tapa=1, irreg=0.1, borde=0.7)
        lz.contorno(Poligono(q, suave=False), '#6a5040', grosor=0.4, presion=0.45)
    lz.aguada(Poligono([(x0 - 2, y0 - 18), (x0 + 20, y0 - 18), (x0 + 18, y0 - 22), (x0, y0 - 22)], suave=False), '#a8603a',
              dens=0.9, tapa=1)
    lz.aguada(Elipse(x0 + 9, y0 - 2.2, 2.4, 1.0), '#3e2a24', dens=0.9, tapa=1)

# the hill town, its fields, road and planted turbines (design 4's), further back
esc.empieza('pueblo', 'El pueblo', plano=3, neblina=0.16, **PUEBLO)
tejados = P.pueblo()
esc.empieza('velomoviles', 'Los velomóviles y la bici', plano=3, neblina=0.12, **PUEBLO)
P.velomoviles()

# in the sky: the big glider and the satellite
esc.empieza('planeador1', 'El planeador grande', plano=3, neblina=0.12)
P.planeador(1060, 104, 150, inclina=24, franja='#e8735e')
esc.empieza('satelite', 'El satélite', plano=3, neblina=0.26, escala=0.52, ancla=(214, 262), mueve=(10, 0))
P.satelite(214, 262, 1.0, ang=-14, orbita=False)
lz.gouache(Elipse(240, 254, 2.2), '#fff1c0', alfa=0.85, irreg=0)

# ======================================================================== the light, between the distance and the protagonists
esc.haces('rayos', 'Los rayos de sol', [(1196, 236, 30, 975, 584, 70), (1250, 240, 55, 1064, 592, 110),
                                         (1306, 238, 80, 1168, 596, 150)], color='#fff8e6', fuerza=0.55)

# ======================================================================== plane 2: the sunflower and its people
esc.empieza('girasol', 'El girasol', plano=2)
P.tallo()
HOJA2, _ = P.hojas_altas()
for (x_, y_) in ((800, 444), (890, 444)):                 # where the boy's shoes rest
    lz.aguada(Elipse(x_, y_, 15, 2.6, -6), '#285028', dens=0.6, suave=1.2)
P.cabeza_girasol()
HOJA1, _ = P.hoja_banco()
P.hilo_luz()
labio_hoja(lz)
import figuras_v3
figuras_v3.MIRA_FUERZA = 1.2         # the gaze goes to the bulb and to the seeds, not to us (more empties the eye)
SOBRE_HOJA = dict(largo=0.45, alto=0.1, fuerza=0.56, difusa=2.0, color='#22402c')
RIM = dict(borde_luz=1.0, ancho_borde=2.6, color_borde='#facd96', borde_irregular=True)
esc.empieza('abuelo', 'El abuelo y la lámpara', plano=2, proyecta=dict(suelo=606, dentro=HOJA1, **SOBRE_HOJA), **RIM)
figuras_v3.MIRA_FUERZA = 0.9
abuelo_y_lampara(lz, P.BULBO, bombilla=False)
figuras_v3.MIRA_FUERZA = 1.2
esc.empieza('nina', 'La niña', plano=2, proyecta=dict(suelo=600, dentro=HOJA1, **SOBRE_HOJA), **RIM)
nina06(lz)
# threads of light leave the lower right edge of the panel, pass behind the boy (he is painted over them),
# come out on his right and run below the trail of seeds to every solar roof, where each lights a spark
esc.empieza('hilos', 'Los hilos de luz', plano=2, borde_luz=0, volumen=0)
for k, t_ in enumerate(tejados):
    tx, ty = en_pueblo(t_)
    a_ = bezier((834, 272 + k * 5), (868, 278 + k * 3), (900, 284 + k * 3), (928 + k * 3, 298 + k * 6), 40)
    b_ = bezier((928 + k * 3, 298 + k * 6), (968 + k * 4, 430 + k * 6), (1040 + k * 10, 618), (tx, ty + 2), 60)
    p = np.vstack([a_, b_[1:]])
    lz.luz(Trazo(p[::6], (5,)), '#ffd27a', fuerza=0.35, suave=3)
    lz.lapiz([p], '#f0b440', grosor=1.25, presion=0.75, temblor=0.2)
    lz.lapiz([p[::2] + (0.6, -0.6)], '#fff1c4', grosor=0.5, presion=0.6, temblor=0.2, cortes=0.4)
    for j in (52, 70, 86):
        lz.aguada(Elipse(*p[j], 2.0), '#f6c44e', dens=0.95, irreg=0.1, tapa=1)
    lz.gouache(Elipse(tx, ty + 2, 2.6), '#fff4d0', alfa=0.95, irreg=0)
    lz.luz((tx, ty + 2, 9), '#fff0b0', fuerza=0.7)
figuras_v3.MIRA_FUERZA = 0.6         # he looks up at his hand: turned further, the iris leaves the eye
esc.empieza('nino', 'El niño', plano=2, proyecta=dict(suelo=436, dentro=HOJA2, **SOBRE_HOJA), **RIM)
nino(lz)
figuras_v3.MIRA_FUERZA = 1.0
# the new bulb, lit: a pear of light with its screw cap toward the socket
esc.empieza('bombilla', 'La bombilla', plano=2, borde_luz=0, volumen=0)
pera = Circulos([(537, 476, 8.6)]) | Poligono([(531, 481), (541, 484), (533, 497), (527, 494)], suave=False)
lz.gouache(pera, '#fffbec', alfa=0.97, irreg=0)
lz.contorno(pera, '#d9a43a', grosor=0.5, presion=0.6, cortes=0.05)
rosca = Poligono([(526, 493), (534, 497), (531, 503), (523, 499)], suave=False)
lz.aguada(rosca, '#9a9a90', dens=0.9, tapa=1, irreg=0.05)
lz.lapiz([[(525, 495.5), (533, 499.5)], [(524, 498), (532, 502)]], '#5a5a52', grosor=0.4, presion=0.6)
lz.lapiz([[(534 + 5 * t_, 477 + 1.2 * math.sin(t_ * 12)) for t_ in np.linspace(0, 1, 20)]], '#e8901e', grosor=0.5, presion=0.85)
# its warm light on her palm and fingers, her cheek, his hand on the lamp and the inside of the tipped shade
brazo_l = Trazo([(519, 503), (509, 495)], (1.6, 1.4))                                        # the shade's brass arm
lz.aguada(brazo_l, '#be9646', dens=0.95, tapa=1)
lz.lapiz([[(518, 501.6), (509, 494.2)]], '#f2d68a', grosor=0.4, presion=0.8)
lz.aguada(Elipse(509, 494, 2.6), '#a8803a', dens=0.95, tapa=1)                               # its hinge, round
lz.gouache(Elipse(508.4, 493.2, 0.8), '#fff0c0', alfa=0.9, irreg=0)

lz.luz((537, 480, 30), '#fff0b0', fuerza=0.8)
esc.halos('luz_bombilla', 'La luz de la bombilla', [(537, 480, 45, 0.32), (537, 486, 72, 0.16), (549, 494, 14, 0.55),
                                                    (606, 442, 14, 0.5), (600, 450, 12, 0.4), (527, 503, 8, 0.5),
                                                    (535, 541, 14, 0.4), (512, 488, 14, 0.6), (514, 540, 14, 0.22),
                                                    (452, 452, 14, 0.35), (566, 496, 14, 0.45)],
          color='#ffd7a0')

esc.empieza('semillas', 'Las semillas-molinillo', plano=2)
P.semillas()
esc.empieza('abeja', 'La abeja', plano=2)
P.abeja(908, 170, 1.2, -20)

# ======================================================================== plane 1: what is nearest, against the light
esc.empieza('rama', 'La rama de arriba', plano=1)
for (pts, g) in (([(-20, 22), (80, 40), (190, 64), (290, 84), (366, 116), (400, 148)], 11),
                 ([(150, 58), (210, 34), (268, 26), (322, 30)], 5),
                 ([(40, 40), (30, 110), (22, 180), (30, 262)], 7)):
    rama = list(spline(pts))
    lz.aguada(Trazo(rama, tuple(np.linspace(g, 1.5, len(pts)))), '#4a3a30', dens=0.9, tapa=1, irreg=0.3, borde=0.7)
    L = len(rama)
    for k in range(4, L - 2, 3):
        if rng.random() < 0.3:
            continue
        x, y = rama[k]
        tx, ty = rama[min(L - 1, k + 1)][0] - x, rama[min(L - 1, k + 1)][1] - y
        base = math.degrees(math.atan2(ty, tx))
        sd = rng.choice([-1, 1])
        largo = rng.uniform(40, 62) * (1.15 - 0.4 * k / L)
        ang = base + sd * rng.uniform(35, 80) + 60
        ancho = rng.choice([0.38, 0.32, 0.18])          # some leaves turn edge-on
        hoja(lz, x, y, largo, ang, rng.choice(['#2f4a35', '#36513a', '#2a4232', '#3d5a3c']), ancho=ancho, tapa=1,
             dens=1.0, toque=rng.choice(['#9ab04a', '#2a3a30', '#2a3a30']))
    # a few small leaves and buds at the tip
    tip = rama[-1]
    for j in range(3):
        hojita(lz, tip[0] + rng.normal(0, 3), tip[1] + rng.normal(0, 3), rng.uniform(9, 14), rng.uniform(40, 140), '#5a7a44',
               nervio=False, tapa=1)

esc.empieza('hierbas', 'Las hierbas del primer plano', plano=1, sombra=0.3, volumen=0, ancho_borde=1.6, borde_luz=0.8,
            color_borde='#dcaf5f')


def brizna(x, y_top, ancho, color, curva):
    """A blade with a slight S: it leans one way low down and bends back near the tip."""
    h = 880 - y_top
    cae = curva * (0.6 if rng.random() < 0.33 else 0.0)        # a third of them droop at the tip
    pts = [(x, 880), (x - curva * 0.5, 880 - h * 0.35), (x + curva * 1.1, 880 - h * 0.72), (x + curva + cae, y_top + abs(cae) * 0.4)]
    lz.aguada(Trazo(list(bezier(*pts, n=14)), (ancho, ancho * 0.8, ancho * 0.5, ancho * 0.15)), color, dens=0.95,
              tapa=1, irreg=0.2, borde=0.25, var=0.15)


def hoja_grande(x, y, largo, ang, color):
    """A broad leaf in the shade with light, wet veins (dark pencil veins read as stamped)."""
    hoja(lz, x, y, largo, ang, color, ancho=0.42, venas=False, tapa=1, dens=0.95, toque='#3e5a3e')
    a = math.radians(ang)
    d = np.array([math.cos(a), math.sin(a)])
    n = np.array([-d[1], d[0]])
    p0 = np.array([x, y], float)
    tr = [[p0, p0 + d * largo * 0.95]]
    for k in np.linspace(0.2, 0.8, 4):
        b = p0 + d * largo * k
        for sd in (-1, 1):
            tr.append([b, b + d * largo * 0.14 + n * sd * largo * 0.15 * math.sin(math.pi * k)])
    lz.lapiz(tr, '#5f7d5a', grosor=0.9, presion=0.55, temblor=0.1)


def espiga(x, y_top, color='#6a4426'):
    """A bulrush: a velvet brown cylinder on its stalk, a thin spike above."""
    lz.lapiz([[(x, 880), (x + 4, y_top)]], '#4a5a32', grosor=1.1, presion=0.8, temblor=0.2)
    cil = Trazo([(x + 4, y_top + 6), (x + 4.2, y_top + 22), (x + 4.4, y_top + 40)], (4.2, 5.2, 4.4))
    lz.aguada(cil, color, dens=0.95, tapa=1, irreg=0.1, borde=0.4, gran=0.6, sombra=(5, -4, '#3a2414', 0.6))
    lz.lapiz([[(x + 4, y_top + 6), (x + 4.6, y_top - 14)]], '#7a6a42', grosor=0.6, presion=0.7)


def amapola(x, y, r):
    tallo_ = Trazo(list(bezier((x, 880), (x - 6, (880 + y) / 2), (x, y + r), n=12)), (3.2, 2.6, 2.0))
    lz.aguada(tallo_, '#3f5a36', dens=0.95, tapa=1, irreg=0.1)
    lz.lapiz([[(x + 0.6, y + r), (x - 2, (880 + y) / 2)]], '#7a9a5a', grosor=0.5, presion=0.5)
    for k in range(4):
        a = math.radians(k * 90 + rng.normal(0, 12))
        lz.aguada(Elipse(x + math.cos(a) * r * 0.5, y + math.sin(a) * r * 0.42, r * 0.66, r * 0.52, math.degrees(a)),
                  rng.choice(['#c4322e', '#d8432e', '#b02a2e']), dens=0.9, tapa=1, irreg=0.3, borde=0.9)
    lz.aguada(Elipse(x, y, r * 0.22), '#2a2030', dens=0.95, tapa=1)


def diente_leon(x, y, r):
    """A dandelion clock against the light: a sphere of white parachutes glowing in front of the dark
    reeds, painted in body colour (pale pencil would vanish on anything light)."""
    lz.aguada(Trazo(list(bezier((x, 880), (x + 8, (880 + y) / 2), (x, y + 2), n=14)), (2.2, 2.0, 1.8)), '#46553c', dens=0.95,
              tapa=1)
    lz.gouache(Elipse(x, y, r * 1.02), '#f6f0e0', alfa=0.18, irreg=0.2)
    for k in range(90):
        a = rng.uniform(0, 2 * math.pi)
        rr = r * rng.uniform(0.72, 1.0)
        tip = (x + math.cos(a) * rr, y + math.sin(a) * rr)
        lz.gouache(Trazo([(x + math.cos(a) * 2.5, y + math.sin(a) * 2.5), tip], (0.45, 0.3)), '#f6f0e0', alfa=0.6, irreg=0)
        for j in range(5):
            b = a + (j - 2) * 0.4
            lz.gouache(Trazo([tip, (tip[0] + math.cos(b) * 3.6, tip[1] + math.sin(b) * 3.6)], (0.32, 0.15)), '#f6f0e0',
                       alfa=0.5, irreg=0)
    lz.aguada(Elipse(x, y, 3.6), '#8a6a3a', dens=0.9, tapa=1)
    # seeds already flying off toward the light and the pollen
    for (dx, dy) in ((-34, -38), (-62, -58), (-98, -66), (-138, -92), (-180, -104)):
        sx, sy = x + dx, y + dy
        lz.gouache(Trazo([(sx, sy), (sx - 2, sy + 7)], (0.4, 0.3)), '#fffaf0', alfa=0.9, irreg=0)
        for b in np.linspace(-2.6, -0.5, 6):
            lz.gouache(Trazo([(sx, sy), (sx + math.cos(b) * 4, sy + math.sin(b) * 4)], (0.3, 0.15)), '#fffdf4', alfa=0.85,
                       irreg=0)


VERDES = ['#2c4832', '#3a562e', '#243e3c']
# left clump: high, in front of the arm
for k in range(70):
    x = rng.uniform(-20, 360)
    top = 640 + (max(x, 0) / 360) ** 1.5 * 170 + rng.normal(0, 30)
    brizna(x, top, rng.uniform(4, 8), rng.choice(VERDES), rng.normal(0, 30))
for (x, y) in [(60, 650), (150, 690), (232, 720)]:
    espiga(x, y)
hoja_grande(-20, 860, 190, -38, '#2a4232')
hoja_grande(40, 880, 150, -70, '#304434')
amapola(118, 740, 13)
amapola(196, 770, 11)
# low middle: three tufts, so the stem rises out of the meadow
for (cx, n_) in ((318, 9), (500, 7), (760, 8)):
    for k in range(n_):
        x = cx + rng.normal(0, 16)
        brizna(x, 800 + rng.normal(0, 16), rng.uniform(3, 5.5), rng.choice(VERDES), rng.normal(6, 16))
amapola(560, 806, 9)
amapola(845, 812, 8)
# right clump: tall, reeds and wheat against the sun (the big leaf first, the blades over it)
for k in range(80):
    x = rng.uniform(1080, 1510)
    top = 790 - ((x - 1080) / 430) ** 1.3 * 230 + rng.normal(0, 30)
    brizna(x, top, rng.uniform(4, 8), rng.choice(VERDES[:2]), rng.normal(-10, 30))
for (x, y) in [(1290, 640), (1350, 610), (1404, 590), (1452, 600)]:
    espiga(x, y)
amapola(1236, 742, 12)

# the fourth character, nearest of all: a hand with its phone; a swallow flies out into the sky
esc.empieza('mano', 'La mano con el móvil', plano=1, sombra=0.14, borde_luz=0.6)
mano_con_telefono(lz, esc)

esc.termina()
esc.marco(margen=22, irreg=1.2, acuarela=True, blooms=[(1428, 60, 30), (64, 806, 34), (1456, 422, 22)])
esc.guardar(SALIDA, CARPETA_CAPAS)
print('ok', SALIDA)
