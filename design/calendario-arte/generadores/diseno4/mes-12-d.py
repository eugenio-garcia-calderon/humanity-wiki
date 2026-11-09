"""
Mes 12 -- Valores -- Diseño 4.

Idea: peace begins in how we talk to each other. On top of a little arched
footbridge -- gentle enough for a wheelchair -- an old man and a young woman
share tea at a small table and really listen to each other. He keeps a hand
on his heart; she explains with an open hand. What they say rises as two
threads of light, gold and rose, that braid together over the table and light
up a garland of paper stars strung between two winter trees. A child walks up
the bridge carrying a bowl of soup for them. Each plank of the bridge is
painted a different colour: everybody built it. Below, the river is a ribbon
of night with the first stars and a shoal of tiny fish.

    python3 mes-12-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, rgb, cosmos,
                      hojita, flor_simple, estrella, remuestrea, puntos_dentro, _lapiz_de, PIEL_LAPIZ)
from extra_m1112 import mano_dedos, brazo, cara, pliegues, sombra, cuello, pieza

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-12-d.png'

lz = Lienzo(ANCHO, semilla=1212)

CORAL = '#e8735e'
ORO = '#f0c25e'
OCRE = '#d9a441'
TEAL = '#3f8f8c'
ROSA = '#ec9fa0'
CARMIN = '#c33c4e'
CIRUELA = '#7a3f6e'
MADERA = '#a8703e'
LP = '#5e3f30'


def yd(x):
    """Height of the bridge deck at x (a gentle arch, accessible)."""
    return 522 + 0.00042 * (x - 740) ** 2


# ------------------------------------------------------------------ the river: a ribbon of night
rio_p = spline([(70, 742), (260, 712), (480, 736), (740, 712), (1000, 738), (1220, 714), (1420, 734)])
rio = Trazo(rio_p, (30, 80, 96, 100, 96, 80, 30))
cosmos(lz, rio, base='#24335f', toques_col=('#1f6f7a', '#4b3f8f', '#2a7f86'), estrellas=1.3, semilla=121,
       tapa=1, dens=1.15)
lz.contorno(rio, '#22305a', grosor=0.7, presion=0.4, cortes=0.5, desfase=0.5)
# the garland's lights shimmer in the water
for x in np.linspace(360, 1120, 9):
    lz.lapiz([[(x - 12, 718 + 6 * math.sin(x)), (x + 12, 718 + 6 * math.sin(x))],
              [(x - 7, 728 + 4 * math.cos(x)), (x + 7, 728 + 4 * math.cos(x))]], '#f6d27a', grosor=0.9, presion=0.6,
             temblor=0.6)

# ------------------------------------------------------------------ banks with a little snow
for pts in ([(80, 690), (120, 650), (200, 628), (300, 640), (360, 672), (330, 700), (200, 708)],
            [(1110, 676), (1170, 640), (1280, 628), (1380, 650), (1410, 690), (1300, 708), (1160, 704)]):
    f = Poligono(pts)
    lz.aguada(f, '#e9eef0', dens=0.5, tapa=1, borde=0.9, irreg=1.3, gran=0.4,
              toques=[(pts[-2][0], pts[-2][1] - 10, 70, '#b9c9da', 0.6)])
    lz.contorno(f, '#8aa0b8', grosor=0.7, presion=0.4, cortes=0.5)
    rng = np.random.default_rng(int(pts[0][0]))
    tr = []
    for _ in range(14):
        x = rng.uniform(pts[0][0] + 20, pts[3][0])
        y = 690 + rng.uniform(-6, 10)
        for d in (-1, 0, 1):
            tr.append([(x, y), (x + d * 4 + rng.normal(0, 1), y - rng.uniform(8, 14))])
    lz.lapiz(tr, '#6f8f5a', grosor=0.7, presion=0.45, temblor=0.2)


# ------------------------------------------------------------------ two winter trees hold the garland
def arbol(x0, y0, lado, sem):
    rng = np.random.default_rng(sem)
    tronco = Trazo([(x0, y0), (x0 + lado * 6, y0 - 120), (x0 + lado * 2, y0 - 250), (x0 + lado * 14, y0 - 360)],
                   (26, 18, 12, 5))
    lz.aguada(tronco, '#7a5040', dens=0.75, tapa=1, gran=0.6, toques=[(x0 - lado * 6, y0 - 150, 30, '#4a3a5a', 0.5)])
    lz.contorno(tronco, '#4a2e22', grosor=0.8, presion=0.5, cortes=0.3)
    ramas = []
    for k in range(6):
        t = 0.35 + k * 0.11
        bx, by = x0 + lado * (6 - 4 * t), y0 - 360 * t
        sd = lado if k % 2 == 0 else -lado
        L = rng.uniform(70, 120) * (1.15 - t * 0.6)
        ex, ey = bx + sd * L, by - L * rng.uniform(0.5, 0.9)
        ramas.append(((bx, by), ((bx + ex) / 2 + sd * 6, (by + ey) / 2 + 8), (ex, ey)))
    for (a, m, b) in ramas:
        f = Trazo([a, m, b], (9, 5, 1.5))
        lz.aguada(f, '#7a5040', dens=0.75, tapa=1, gran=0.5)
        lz.lapiz([spline([a, m, b])], '#4a2e22', grosor=0.6, presion=0.4)
        # twigs
        for t in (0.5, 0.8):
            p = np.array(a) * (1 - t) + np.array(b) * t
            q = p + np.array([rng.normal(0, 14), -rng.uniform(12, 24)])
            lz.lapiz([[p, q]], '#5a3a2a', grosor=0.6, presion=0.5)
            lz.gouache(Elipse(*(p * 0.5 + q * 0.5 + (0, -1.5)), 4.5, 1.6, rng.uniform(-30, 30)), '#fbfdff',
                       alfa=0.85, irreg=0.2)                    # snow on the twigs
        # red berries
        for _ in range(3):
            p = np.array(a) * 0.3 + np.array(b) * 0.7 + rng.normal(0, 6, 2)
            lz.aguada(Elipse(*p, 2.6), CARMIN, dens=0.95, irreg=0.2)
    sombra(lz, x0, y0 + 4, 40, 6, '#a8b4c4', 0.4)
    return ramas


rama_i = arbol(232, 662, 1, 5)
rama_d = arbol(1258, 662, -1, 9)

# ------------------------------------------------------------------ the bridge everybody built
xs = np.linspace(168, 1312, 120)
deck = np.stack([xs, yd(xs)], 1)
# under-arch and struts
arco_p = np.stack([np.linspace(300, 1180, 80), np.zeros(80)], 1)
arco_p[:, 1] = 660 - 105 * np.sin(np.linspace(0, np.pi, 80))
for x in np.linspace(360, 1120, 12):
    yb = 660 - 105 * math.sin((x - 300) / 880 * math.pi)
    f = Trazo([(x, yd(x) + 8), (x, yb)], (6, 6))
    lz.aguada(f, '#8a5a36', dens=0.6, tapa=1, irreg=0.3)
    lz.contorno(f, '#5a3a24', grosor=0.6, presion=0.45)
f = Trazo(arco_p, (14, 14))
lz.aguada(f, '#8a5a36', dens=0.7, tapa=1, irreg=0.3, gran=0.5, toques=[(740, 556, 120, '#6a4428', 0.5)])
lz.contorno(f, '#5a3a24', grosor=0.8, presion=0.5)
# the deck: a beam of planks, each painted a different colour by a different hand
COLS = [CORAL, ORO, TEAL, ROSA, OCRE, '#8d73b0', '#7fa86a', '#e0884a', '#6fb1ad', '#f2b93a']
xs_t = np.arange(168, 1312, 22)
rng = np.random.default_rng(4)
for i, x in enumerate(xs_t):
    x1 = min(x + 22, 1312)
    p = [(x, yd(x) - 1), (x1, yd(x1) - 1), (x1, yd(x1) + 17), (x, yd(x) + 17)]
    lz.aguada(Poligono(p, suave=False), COLS[(i * 7) % len(COLS)], dens=0.62, tapa=1, irreg=0.35, borde=0.6,
              gran=0.4)
for x in xs_t:
    lz.lapiz([[(x, yd(x)), (x, yd(x) + 17)]], '#5a3a24', grosor=0.6, presion=0.5, temblor=0.1)
lz.lapiz([deck + (0, -1), deck + (0, 17)], '#5a3a24', grosor=0.9, presion=0.6, temblor=0.4)
# railing: posts and a hand rail (a little higher than the deck, same arch)
rail = np.stack([xs, yd(xs) - 58], 1)
for x in np.arange(190, 1300, 74):
    f = Trazo([(x, yd(x) - 58), (x, yd(x))], (5, 5))
    lz.aguada(f, MADERA, dens=0.65, tapa=0.6, irreg=0.3)
    lz.contorno(f, '#5a3a24', grosor=0.5, presion=0.4)
f = Trazo(rail, (6, 6))
lz.aguada(f, MADERA, dens=0.7, tapa=0.6, irreg=0.3, gran=0.4)
lz.contorno(f, '#5a3a24', grosor=0.6, presion=0.45)

# ------------------------------------------------------------------ the garland of paper stars (lit by their words)
g0, g1 = np.array(rama_i[3][2]), np.array(rama_d[3][2])
cuerda = bezier(g0, (g0[0] + 250, 330), (g1[0] - 250, 330), g1, 160)
lz.lapiz([cuerda], '#7c5a48', grosor=0.8, presion=0.5, temblor=0.5)
SCOLS = [ORO, CORAL, ROSA, ORO, TEAL, ORO, CORAL, ROSA, ORO, TEAL, ORO]
for k, t in enumerate(np.linspace(0.07, 0.93, 11)):
    x, y = cuerda[int(t * 159)]
    y += 20
    lz.lapiz([[(x, y - 20), (x, y - 12)]], '#7c5a48', grosor=0.6, presion=0.5)
    pts = []
    for j in range(10):
        rr = 13 if j % 2 == 0 else 6
        a = math.radians(-90 + j * 36)
        pts.append((x + math.cos(a) * rr, y + 2 + math.sin(a) * rr))
    f = Poligono(pts, suave=False)
    c = SCOLS[k]
    lz.aguada(f, c, dens=0.85, tapa=1, irreg=0.2, borde=0.8, toques=[(x, y + 2, 5, '#fff3c4', 0.85)])
    lz.contorno(f, _lapiz_de(c), grosor=0.55, presion=0.45, cortes=0.1, desfase=0.2)
    for j in range(0, 10, 2):
        a = math.radians(-90 + j * 36)
        lz.lapiz([[(x, y + 2), (x + math.cos(a) * 11, y + 2 + math.sin(a) * 11)]], _lapiz_de(c), grosor=0.4,
                 presion=0.3)
    lz.aguada(Elipse(x, y + 2, 30, 28), '#f6c66a', dens=0.14, suave=11, gran=0.05)
    lz.luz((x, y + 2, 9), '#fff2c4', fuerza=0.4)

# ------------------------------------------------------------------ the little table at the top of the bridge
TX = 744
for (a, b) in (((TX - 46, 452), (TX - 52, yd(TX - 52))), ((TX + 46, 452), (TX + 52, yd(TX + 52))),
               ((TX, 456), (TX, yd(TX) - 2))):
    f = Trazo([a, b], (6, 5))
    lz.aguada(f, '#8a5a36', dens=0.7, tapa=1, irreg=0.3)
    lz.contorno(f, '#5a3a24', grosor=0.6, presion=0.5)
mantel = Poligono([(TX - 70, 444), (TX + 70, 444), (TX + 66, 470), (TX + 40, 476), (TX, 470), (TX - 40, 478),
                   (TX - 68, 470)])
lz.aguada(mantel, '#f6efe0', dens=0.5, tapa=1, irreg=0.4, toques=[(TX + 50, 470, 30, '#d9c8b8', 0.6)])
lz.contorno(mantel, '#9a7a6a', grosor=0.7, presion=0.5)
for x in np.arange(TX - 66, TX + 66, 9):                       # a red-stitched hem
    lz.lapiz([[(x, 466 + 3 * math.sin(x)), (x + 4, 466 + 3 * math.sin(x))]], CARMIN, grosor=0.6, presion=0.6)
tablero = Elipse(TX, 444, 72, 13)
lz.aguada(tablero, '#f8f2e6', dens=0.45, tapa=1, irreg=0.3)
lz.contorno(tablero, '#9a7a6a', grosor=0.7, presion=0.5)
# teapot, two glasses of tea, a bowl of mandarins
tetera = Circulos([(TX - 6, 428, 15), (TX - 6, 420, 12)])
lz.aguada(tetera, TEAL, dens=0.75, tapa=1, irreg=0.3, toques=[(TX - 12, 420, 8, '#8fd0c8', 0.7)])
lz.contorno(tetera, '#1f4f4f', grosor=0.7, presion=0.5)
lz.aguada(Trazo([(TX + 8, 430), (TX + 22, 418), (TX + 28, 414)], (5, 3, 2)), TEAL, dens=0.75, tapa=1)
lz.aguada(Elipse(TX - 6, 405, 5, 3), '#1f4f4f', dens=0.8)
for gx in (TX - 46, TX + 30):
    v = Poligono([(gx - 6, 424), (gx + 6, 424), (gx + 5, 442), (gx - 5, 442)], suave=False)
    lz.aguada(v, '#d9822a', dens=0.6, tapa=1, irreg=0.2, toques=[(gx, 430, 4, '#f6c66a', 0.6)])
    lz.contorno(v, '#7a4a22', grosor=0.5, presion=0.45)
    lz.lapiz([spline([(gx, 420), (gx - 4, 410), (gx + 3, 400), (gx - 2, 390)])], '#c9b8a8', grosor=0.7, presion=0.35)
cuenco = Poligono(np.vstack([arco(TX + 54, 438, 14, 4, 180, 360, 10), arco(TX + 54, 438, 14, 8, 0, 180, 12)]),
                  suave=False)
for (mx, my) in ((TX + 48, 432), (TX + 58, 431), (TX + 53, 425)):
    lz.aguada(Elipse(mx, my, 6.5, 6), '#ef8a2a', dens=0.85, tapa=1, irreg=0.3)
    hojita(lz, mx, my - 5, 6, -60, '#5f8f63', nervio=False)
lz.aguada(cuenco, '#f3e6cf', dens=0.6, tapa=1)
lz.contorno(cuenco, '#9a7a6a', grosor=0.6, presion=0.5)
lz.lapiz([arco(TX + 54, 440, 10, 3, 20, 160, 10)], TEAL, grosor=0.6, presion=0.5)

# ------------------------------------------------------------------ HE: the grandfather who listens (left)
sombra(lz, 612, yd(612) + 2, 70, 5, '#8a6a5a', 0.3)
# his chair
for (a, b) in (((572, 486), (566, yd(566))), ((632, 486), (636, yd(636))), ((570, 390), (574, 486))):
    f = Trazo([a, b], (6, 5))
    lz.aguada(f, MADERA, dens=0.7, tapa=1, irreg=0.3)
    lz.contorno(f, '#5a3a24', grosor=0.6, presion=0.5)
lz.aguada(Poligono([(566, 480), (640, 480), (644, 490), (562, 492)], suave=False), '#c99a5a', dens=0.7, tapa=1)
PANTALON = '#5a5f7a'
# legs: thighs toward the table, shins down
for (h, k, a_, w) in (((606, 474), (664, 472), (670, 517), 26), ((592, 478), (650, 482), (652, 519), 26)):
    f = Trazo([h, k], (w, w * 0.9))
    g = Trazo([k, ((k[0] + a_[0]) / 2 + 2, (k[1] + a_[1]) / 2), a_], (w * 0.9, w * 0.78, w * 0.62))
    lz.aguada(f | g | Elipse(k[0], k[1], w * 0.45), PANTALON, dens=0.74, tapa=1,
              toques=[(k[0], k[1] + 10, 20, '#3a3f5a', 0.5)])
    lz.contorno(f | g | Elipse(k[0], k[1], w * 0.45), '#2a2f44', grosor=0.8, presion=0.5, cortes=0.3)
    z = Poligono([(a_[0] - 10, a_[1] - 4), (a_[0] + 22, a_[1] - 2), (a_[0] + 24, a_[1] + 6), (a_[0] - 10, a_[1] + 6)])
    lz.aguada(z, '#4a2e22', dens=0.85, tapa=1, irreg=0.3)
pliegues(lz, [[(620, 470), (636, 478), (652, 476)]], '#2a2f44')
# his wool coat, leaning toward her
ABRIGO = '#d9a441'
pieza(lz, [(590, 376), (622, 368), (650, 376), (662, 410), (664, 470), (640, 488), (596, 490), (580, 470),
           (578, 420)], ABRIGO, toques=[(586, 450, 40, '#b07a2a', 0.6), (650, 390, 30, '#f0c870', 0.5)])
pliegues(lz, [[(628, 380), (632, 430), (630, 486)], [(600, 440), (612, 460), (604, 486)]], '#8a5a20', presion=0.5)
for y in (418, 444, 468):
    lz.aguada(Elipse(633, y, 3, 3), '#6a4428', dens=0.9, irreg=0.1)
# his red scarf
bufanda = Trazo([(598, 380), (622, 388), (646, 378)], (16, 17, 15))
lz.aguada(bufanda, CARMIN, dens=0.85, tapa=1, irreg=0.3)
lz.contorno(bufanda, '#7a1f30', grosor=0.6, presion=0.5)
f = Trazo([(640, 384), (646, 412), (642, 436)], (12, 11, 10))
lz.aguada(f, CARMIN, dens=0.85, tapa=1, irreg=0.3)
lz.contorno(f, '#7a1f30', grosor=0.6, presion=0.5)
lz.lapiz([[(636 + k * 3, 436), (636 + k * 3, 446)] for k in range(4)], CARMIN, grosor=0.7, presion=0.6)
lz.rayado(f, '#f6d27a', angulo=0, sep=7, presion=0.6, grosor=0.8)
cuello(lz, 630, 336, 40, 'piel3', (626, 378))
cara(lz, 630, 336, 40, piel='piel3', pelo='#e2ded8', peinado='calvo', canas=True, barba='#e8e4de',
     giro=0.45, inclina=10, ojos='abiertos', boca='suave', mira=(1, 0.2))
# a knitted cap
gorro = Poligono([(596, 318), (604, 298), (628, 290), (654, 298), (664, 316), (650, 312), (628, 308), (608, 312)])
lz.aguada(gorro, '#3f6f8f', dens=0.8, tapa=1, irreg=0.4)
lz.rayado(gorro, '#24445a', angulo=90, sep=3, presion=0.5)
lz.contorno(gorro, '#24445a', grosor=0.7, presion=0.5)
# the far hand holds his glass on the table
brazo(lz, (652, 384), (676, 432), (700, 432), 22, ABRIGO)
mano_dedos(lz, TX - 52, 432, -10, 30, 'piel3', 'sujeta', lado=-1)
# the near hand rests on his heart: he listens
brazo(lz, (598, 390), (606, 446), (626, 418), 23, ABRIGO)
mano_dedos(lz, 626, 420, -50, 36, 'piel3', 'relajada', lado=-1, abre=0.3)

# ------------------------------------------------------------------ SHE: the young woman who speaks (right)
sombra(lz, 880, yd(880) + 2, 80, 5, '#8a6a5a', 0.3)
# far wheel of the chair
lz.aguada(Elipse(906, 482, 38, 41) - Elipse(906, 482, 33, 36), '#4a5a6a', dens=0.75, irreg=0.2)
# chair frame: seat, back, armrest, footrest
for pts in ([(852, 478), (926, 478)], [(926, 478), (930, 392)], [(930, 392), (944, 386)], [(856, 478), (826, 512)],
            [(826, 512), (808, 512)], [(860, 446), (918, 446)]):
    f = Trazo(pts, (5, 5))
    lz.aguada(f, '#6a7a8a', dens=0.75, tapa=1, irreg=0.2)
    lz.contorno(f, '#3a4450', grosor=0.5, presion=0.45)
FALDA = CIRUELA
for (h, k, a_, w) in (((884, 474), (838, 470), (832, 506), 24), ((896, 478), (850, 478), (842, 510), 24)):
    f = Trazo([h, k], (w, w * 0.92))
    g = Trazo([k, ((k[0] + a_[0]) / 2 - 2, (k[1] + a_[1]) / 2), a_], (w * 0.8, w * 0.7, w * 0.55))
    lz.aguada(f | Elipse(k[0], k[1], w * 0.45), FALDA, dens=0.76, tapa=1, toques=[(k[0], k[1], 20, '#5a2a52', 0.5)])
    lz.contorno(f | Elipse(k[0], k[1], w * 0.45), '#4a2240', grosor=0.8, presion=0.5, cortes=0.3)
    lz.aguada(g, '#3a2a3a', dens=0.6, tapa=1)                     # dark tights
    z = Poligono([(a_[0] + 8, a_[1] - 4), (a_[0] - 16, a_[1] - 2), (a_[0] - 18, a_[1] + 6), (a_[0] + 8, a_[1] + 6)])
    lz.aguada(z, '#b8503e', dens=0.85, tapa=1, irreg=0.3)
# her coat
pieza(lz, [(866, 376), (892, 368), (918, 374), (930, 410), (928, 476), (900, 484), (868, 480), (856, 440),
           (856, 400)], TEAL, toques=[(924, 450, 40, '#2a6a6a', 0.6), (864, 392, 30, '#6fb1ad', 0.5)])
pliegues(lz, [[(880, 384), (876, 430), (880, 480)], [(912, 400), (918, 440), (912, 478)]], '#1f4f4f', presion=0.5)
for (x, y) in ((900, 420), (872, 452), (914, 462), (890, 398)):
    flor_simple(lz, x, y, 4.0, ROSA, centro='#fff3cf')
cuello(lz, 862, 336, 40, 'piel5', (884, 374))
cara(lz, 862, 336, 40, piel='piel5', pelo=CORAL, peinado='pañuelo', giro=-0.45, inclina=-8, ojos='abiertos',
     boca='abierta', mira=(-1, 0.1))
# a pattern of dots on her headwrap
for (x, y) in ((842, 308), (862, 300), (884, 306), (900, 322), (830, 326), (872, 314)):
    lz.aguada(Elipse(x, y, 2.4, 2.4), '#fff1d0', dens=0.9, irreg=0.1)
# near wheel over her: a ring with spokes
rueda = Elipse(898, 486, 40, 42) - Elipse(898, 486, 34, 36)
lz.aguada(rueda, '#3a4a5a', dens=0.85, tapa=1, irreg=0.2)
lz.contorno(rueda, '#1e2830', grosor=0.6, presion=0.5)
lz.lapiz([[(898, 486), (898 + 34 * math.cos(a), 486 + 36 * math.sin(a))] for a in np.linspace(0, 2 * np.pi, 9)[:-1]],
         '#5a6a7a', grosor=0.45, presion=0.45, temblor=0.03)
lz.aguada(Elipse(898, 486, 5, 5), '#6a7a8a', dens=0.8, tapa=1)
lz.aguada(Elipse(824, 518, 7, 7), '#3a4a5a', dens=0.85, tapa=1)
# far hand on her lap
brazo(lz, (914, 386), (916, 444), (882, 462), 22, TEAL)
mano_dedos(lz, 882, 462, 170, 32, 'piel5', 'relajada', lado=1)
# near hand: open, palm up, she explains what she feels
brazo(lz, (868, 392), (842, 444), (806, 426), 22, TEAL)
mano_dedos(lz, 806, 426, 205, 36, 'piel5', 'abierta', lado=-1, abre=0.6, curl=12)

# ------------------------------------------------------------------ their words: two threads of light that braid
t = np.linspace(0, 1, 120)[:, None]
base_c = bezier((744, 420), (744, 380), (744, 340), (744, 316), 120)
dore = bezier((662, 368), (700, 330), (700, 300), (744, 316), 120)                 # from his heart
rosa = bezier((796, 410), (790, 350), (780, 320), (744, 316), 120)                 # from her open hand
lz.lapiz([dore], '#e8a83a', grosor=1.6, presion=0.75, temblor=0.4)
lz.lapiz([rosa], '#e47a8a', grosor=1.6, presion=0.75, temblor=0.4)
# braided above the table, rising to the garland
h = np.linspace(316, 270, 60)
for ph, col in ((0, '#e8a83a'), (np.pi, '#e47a8a')):
    xx = 744 + 9 * np.sin(np.linspace(0, 4 * np.pi, 60) + ph)
    lz.lapiz([np.stack([xx, h], 1)], col, grosor=1.6, presion=0.75, temblor=0.2)
for p in np.vstack([dore[::10], rosa[::10]]):
    lz.gouache(Elipse(*p, 1.4), '#fff6dc', alfa=0.9, irreg=0)
    lz.luz((p[0], p[1], 7), '#ffe2a0', fuerza=0.3)
lz.luz((744, 300, 26), '#ffe7a8', fuerza=0.5)

# ------------------------------------------------------------------ the child brings soup up the bridge
CX = 452
sombra(lz, CX, yd(CX) + 2, 40, 4, '#8a6a5a', 0.3)
# legs: walking uphill, weight on the front foot
for (h, k, a_) in (((CX - 4, 492), (CX - 16, 520), (CX - 30, yd(CX - 30) - 4)),
                   ((CX + 6, 492), (CX + 20, 516), (CX + 22, yd(CX + 22) - 4))):
    f = Trazo([h, k, a_], (11, 9.5, 8))
    lz.aguada(f, '#e6c2a0', dens=0.5, tapa=1, irreg=0.3)
    lz.aguada(f, '#4a6a9a', dens=0.6, irreg=0.3)                   # blue tights
    lz.contorno(f, '#2a3a5a', grosor=0.6, presion=0.45)
    z = Elipse(a_[0] + 6, a_[1] + 2, 10, 5, -8)
    lz.aguada(z, ORO, dens=0.85, tapa=1, irreg=0.3)
    lz.contorno(z, '#8a6a20', grosor=0.5, presion=0.45)
pieza(lz, [(CX - 14, 410), (CX + 2, 404), (CX + 18, 410), (CX + 26, 450), (CX + 32, 494), (CX, 500),
           (CX - 28, 494), (CX - 20, 450)], CORAL, toques=[(CX - 20, 470, 26, '#c4503e', 0.6)])
pliegues(lz, [[(CX, 430), (CX - 4, 470), (CX - 8, 496)]], '#9a3a2e')
cuello(lz, CX, 376, 28, 'piel2', (CX + 2, 406))
cara(lz, CX, 376, 28, piel='piel2', pelo='#c9783a', peinado='rizado', giro=0.4, inclina=6, ojos='abiertos',
     boca='sonrisa', mira=(1, 0.3))
# the bowl, carried with both hands, steaming
sopa = Poligono(np.vstack([arco(CX + 46, 442, 20, 5, 180, 360, 12), arco(CX + 46, 442, 20, 14, 0, 180, 14)]),
                suave=False)
lz.aguada(sopa, '#f3e6cf', dens=0.6, tapa=1)
lz.aguada(Elipse(CX + 46, 442, 17, 3.5), '#e0a040', dens=0.8, irreg=0.2)
lz.lapiz([arco(CX + 46, 450, 16, 4, 20, 160, 10)], CORAL, grosor=0.7, presion=0.5)
lz.contorno(sopa, '#9a7a6a', grosor=0.7, presion=0.5)
for k in range(3):
    x = CX + 36 + k * 10
    lz.lapiz([spline([(x, 436), (x - 4, 424), (x + 3, 412), (x - 2, 400)])], '#c9b8a8', grosor=0.7, presion=0.35)
brazo(lz, (CX + 12, 414), (CX + 20, 446), (CX + 28, 448), 13, CORAL)
mano_dedos(lz, CX + 28, 448, -10, 20, 'piel2', 'sujeta', lado=1)
brazo(lz, (CX - 8, 416), (CX + 6, 452), (CX + 62, 452), 13, CORAL)
mano_dedos(lz, CX + 62, 452, -5, 20, 'piel2', 'sujeta', lado=-1)

# ------------------------------------------------------------------ the first stars of the night, and snow
rng = np.random.default_rng(77)
for (x, y, r, c) in ((560, 110, 7, ORO), (930, 86, 6, ROSA), (1060, 150, 5, TEAL), (420, 180, 5, ORO),
                     (760, 60, 8, ORO), (1180, 96, 4, CORAL)):
    estrella(lz, x, y, r, c, gouache=False)
for _ in range(26):
    x, y = rng.uniform(330, 1160), rng.uniform(90, 300)
    lz.aguada(Elipse(x, y, rng.uniform(1.4, 2.4)), '#9fb4cc', dens=0.6, irreg=0.2)

lz.vineta(margen=30)
lz.guardar(SALIDA)
print('ok', SALIDA)
