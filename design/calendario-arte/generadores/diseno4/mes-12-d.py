"""
Mes 12 -- Valores -- Diseño 4.

Idea: peace begins in how we talk to each other. On top of a little arched
footbridge -- gentle enough for a wheelchair -- a grandfather and a young
woman share tea at a small table and look each other in the eyes. She speaks
with an open hand; he listens, leaning in, his hand on his chest. From her
words and from his listening rise two threads of light, gold and rose, that
meet without crossing in a soft heart and go on up as a single thread to
light a star. A child walks up the bridge, inside the railing, carrying a
bowl of soup for them. Every plank of the deck was painted by a different
hand: everybody built the bridge. Below, the river is a ribbon of winter night
that fades into the paper.

    python3 mes-12-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, rgb, extremidad,
                      hojita, flor_simple, estrella, cabeza, remuestrea, _lapiz_de, PIEL_LAPIZ)
from extra_m1112 import (mano_dedos, brazo, pliegues, sombra, cuello, pieza, cabeza_perfil, cielo_mar,
                         desvanecer_x, componer)

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-12-d.png'

lz = Lienzo(ANCHO, semilla=1212)
HOJA = lz
# The two at the table are painted on their own sheet, K times larger, and pasted
# back around (CX, KY): they come forward, while paper grain and pencil of the
# rest of the page keep the series' scale.
K, KY = 1.25, 600.0

CORAL = '#e8735e'
ORO = '#f0c25e'
OCRE = '#d9a441'
TEAL = '#3f8f8c'
ROSA = '#ec9fa0'
CARMIN = '#c33c4e'
CIRUELA = '#7a3f6e'
MADERA = '#9a6a3e'
MADERA_LP = '#5a3a24'
CX = 742.0


def yn(x):
    """Near edge of the deck (a gentle arch)."""
    return 600 + 0.0006 * (np.asarray(x) - CX) ** 2


def yf(x):
    """Far edge of the deck: we look down on the walking surface a little."""
    return yn(x) - 30


def ym(x):
    return yn(x) - 15


def pierna(pts, ancho, color, zapato='#5e3f30', pie_lado=1):
    extremidad(lz, pts, (ancho, ancho * 0.86, ancho * 0.66), color, dens=0.74, sombra=False,
               toques=[(pts[1][0], pts[1][1], ancho, mezcla(color, '#1a1a2a', 0.3), 0.4)])
    a = np.asarray(pts[2], float)
    z = Poligono([a + (-ancho * 0.35 * pie_lado, -ancho * 0.25), a + (ancho * 0.85 * pie_lado, -ancho * 0.12),
                  a + (ancho * 1.05 * pie_lado, ancho * 0.3), a + (-ancho * 0.4 * pie_lado, ancho * 0.32)])
    lz.aguada(z, zapato, dens=0.85, tapa=1, irreg=0.3)
    lz.contorno(z, _lapiz_de(zapato, 0.45), grosor=0.6, presion=0.5)


def palo(a, b, w=6, col=MADERA, tapa=1.0):
    f = Trazo([a, b], (w, w * 0.9))
    lz.aguada(f, col, dens=0.72, tapa=tapa, irreg=0.3, gran=0.4)
    lz.contorno(f, MADERA_LP, grosor=0.6, presion=0.5)


# ------------------------------------------------------------------ the river: a ribbon of winter night
rio_p = spline([(200, 784), (360, 768), (560, 782), (742, 770), (930, 784), (1120, 768), (1290, 780)])
rio = Trazo(rio_p, (30, 50, 58, 60, 58, 50, 30))
cielo_mar(lz, rio, estrellas=1.0, semilla=121)
lz.contorno(rio, '#22305a', grosor=0.6, presion=0.35, cortes=0.55, desfase=0.4)
for x in np.linspace(560, 930, 5):                     # the star's light trembles on the water
    lz.lapiz([[(x - 10, 760 + 5 * math.sin(x)), (x + 10, 760 + 5 * math.sin(x))]], '#f6d27a', grosor=0.9,
             presion=0.6, temblor=0.6)
desvanecer_x(lz, 150, 1340, 720, 830, 200, 420, 1060, 1290)

# ------------------------------------------------------------------ the bridge everybody built
X0, X1 = 262, 1222
# the arch underneath and its struts
arc_x = np.linspace(330, 1154, 80)
arc_y = 772 - 112 * np.sin((arc_x - 330) / (1154 - 330) * np.pi)
for x in np.linspace(380, 1104, 11):
    yb = 772 - 112 * math.sin((x - 330) / (1154 - 330) * math.pi)
    palo((x, yn(x) + 12), (x, yb), 6, '#8a5a36')
f = Trazo(np.stack([arc_x, arc_y], 1), (14, 14))
lz.aguada(f, '#8a5a36', dens=0.7, tapa=1, irreg=0.35, gran=0.5, toques=[(CX, 660, 120, '#6a4428', 0.5)])
lz.contorno(f, MADERA_LP, grosor=0.8, presion=0.5)
# the far railing (behind everybody)
xs_post = np.arange(X0 + 14, X1, 64)
for x in xs_post:
    palo((x, yf(x) - 52), (x, yf(x) + 2), 5, MADERA, tapa=0.7)
xs = np.linspace(X0, X1, 120)
f = Trazo(np.stack([xs, yf(xs) - 52], 1), (5, 5))
lz.aguada(f, MADERA, dens=0.72, tapa=0.7, irreg=0.3, gran=0.4)
lz.contorno(f, MADERA_LP, grosor=0.6, presion=0.45)
# the side beam of the deck
beam = Poligono(np.vstack([np.stack([xs, yn(xs)], 1), np.stack([xs[::-1], yn(xs[::-1]) + 14], 1)]), suave=False)
lz.aguada(beam, '#7a4e30', dens=0.75, tapa=1, irreg=0.3, gran=0.5)
lz.contorno(beam, MADERA_LP, grosor=0.8, presion=0.5)
# the walking surface: planks across it, each painted by a different hand (no flag, no rainbow order)
COLS = ['#e8a07a', '#cfae6a', '#8fb5a8', '#e7b8b0', '#c99a5a', '#a9b88a', '#d98a6a', '#b8a8c8', '#e9c27a',
        '#9cc0c4', '#d7a080', '#c4b07a']
rng = np.random.default_rng(4)
order = rng.permutation(np.arange(70) % len(COLS))
xp = X0
k = 0
while xp < X1:
    w = rng.uniform(15, 21)
    x1 = min(xp + w, X1)
    j0, j1 = rng.normal(0, 1.2, 2)
    pl = Poligono([(xp + j0, yf(xp) + 1), (x1 + j1, yf(x1) + 1), (x1 - j1 * 0.5, yn(x1) - 1), (xp, yn(xp) - 1)],
                  suave=False)
    edge = min(1.0, (min(xp - X0, X1 - xp)) / 150)          # the planks fade near the ends of the bridge
    lz.aguada(pl, COLS[order[k % len(order)]], dens=0.95 * (0.35 + 0.65 * edge), tapa=1, irreg=0.45, borde=0.7,
              gran=0.5)
    # wood grain in pencil, running across the plank
    for g in range(2):
        gx = xp + w * (0.3 + 0.4 * g) + rng.normal(0, 1)
        lz.lapiz([spline([(gx, yf(gx) + 3), (gx + rng.normal(0, 1.5), ym(gx)), (gx + rng.normal(0, 1), yn(gx) - 3)])],
                 '#7a5a40', grosor=0.45, presion=0.3 * edge + 0.05, temblor=0.4)
    lz.lapiz([[(x1, yf(x1) + 1), (x1, yn(x1) - 1)]], MADERA_LP, grosor=0.6, presion=0.5 * edge + 0.1, temblor=0.2)
    # a few planks carry a painted sign of who made them: a flower, a dot, a heart-leaf
    if rng.random() < 0.2 and edge > 0.6:
        flor_simple(lz, xp + w / 2, ym(xp + w / 2), 3.4, rng.choice([CORAL, '#fff0d0', TEAL]), centro=ORO)
    xp = x1
    k += 1
lz.lapiz([np.stack([xs, yf(xs) + 1], 1), np.stack([xs, yn(xs) - 1], 1)], MADERA_LP, grosor=0.8, presion=0.55,
         temblor=0.4)

# ------------------------------------------------------------------ the little table at the top (on its own sheet)
lz = Lienzo(int(round(ANCHO * K)), semilla=1213)
lx = [(CX - 50, 540, CX - 54, ym(CX - 54) + 4), (CX + 50, 540, CX + 54, ym(CX + 54) + 4),
      (CX - 20, 544, CX - 22, yf(CX) + 6)]
for (a0, a1, b0, b1) in lx:
    palo((a0, a1), (b0, b1), 6, '#8a5a36')
mantel = Poligono([(CX - 76, 532), (CX + 76, 532), (CX + 72, 560), (CX + 44, 566), (CX + 6, 560), (CX - 36, 568),
                   (CX - 74, 560)])
lz.aguada(mantel, '#f8f1e2', dens=0.5, tapa=1, irreg=0.4, toques=[(CX + 50, 560, 30, '#d9c8b8', 0.6)],
          sombra=(-6, -6, '#c8b8a8', 0.4))
lz.contorno(mantel, '#9a7a6a', grosor=0.7, presion=0.5)
for x in np.arange(CX - 70, CX + 70, 8):
    lz.lapiz([[(x, 555 + 3 * math.sin(x)), (x + 3.5, 555 + 3 * math.sin(x))]], CARMIN, grosor=0.6, presion=0.6)
tablero = Elipse(CX, 532, 78, 14)
lz.aguada(tablero, '#fbf6ec', dens=0.45, tapa=1, irreg=0.3)
lz.contorno(tablero, '#9a7a6a', grosor=0.7, presion=0.5)
# teapot, two glasses of mint tea, mandarins
tetera = Circulos([(CX - 4, 514, 17), (CX - 4, 506, 13)])
lz.aguada(tetera, TEAL, dens=0.78, tapa=1, irreg=0.3, toques=[(CX - 11, 504, 9, '#8fd0c8', 0.7)], sombra=(-5, -5))
lz.contorno(tetera, '#1f4f4f', grosor=0.7, presion=0.55)
lz.aguada(Trazo([(CX + 11, 516), (CX + 26, 502), (CX + 33, 497)], (6, 3.5, 2.2)), TEAL, dens=0.78, tapa=1)
lz.lapiz([arco(CX - 4, 492, 7, 3, 180, 360, 10)], '#1f4f4f', grosor=0.7, presion=0.55)
lz.aguada(Elipse(CX - 4, 488, 3.5, 3), '#1f4f4f', dens=0.85)
for gx in (CX - 52, CX + 36):
    v = Poligono([(gx - 7, 510), (gx + 7, 510), (gx + 6, 530), (gx - 6, 530)], suave=False)
    lz.aguada(v, '#d9822a', dens=0.6, tapa=1, irreg=0.2, toques=[(gx, 516, 4, '#f6c66a', 0.6)])
    lz.contorno(v, '#7a4a22', grosor=0.5, presion=0.45)
    hojita(lz, gx - 1, 512, 6, -70, '#5f9f63', nervio=False, tapa=1)
    lz.lapiz([spline([(gx, 506), (gx - 4, 494), (gx + 3, 482), (gx - 2, 470)])], '#c9b8a8', grosor=0.7,
             presion=0.3)
for (mx, my) in ((CX + 58, 524), (CX + 68, 523), (CX + 63, 516)):
    lz.aguada(Elipse(mx, my, 7, 6.5), '#ef8a2a', dens=0.85, tapa=1, irreg=0.3, sombra=(-2, -2))
    hojita(lz, mx, my - 5, 6, -60, '#5f8f63', nervio=False)

# ------------------------------------------------------------------ HE: the grandfather listens (left)
# his chair, seen from the side
for (a, b) in (((552, 546), (548, ym(548) + 8)), ((626, 548), (630, ym(630) + 8)), ((550, 446), (556, 548))):
    palo(a, b, 6, MADERA)
lz.aguada(Poligono([(546, 540), (632, 542), (634, 552), (544, 552)], suave=False), '#c99a5a', dens=0.72, tapa=1)
PANT = '#5a5f7a'
pierna([(586, 540), (662, 540), (666, 594)], 28, mezcla(PANT, '#1a1a2a', 0.3), zapato='#4a2e22')
pierna([(600, 546), (676, 548), (680, 600)], 29, PANT, zapato='#4a2e22')
pliegues(lz, [[(640, 536), (656, 546), (668, 540)], [(672, 556), (676, 574)]], '#2a2f44')
ABRIGO = '#d9a441'
cuello(lz, 616, 412, 46, 'piel3', (604, 462), escote=False, giro=0.6, inclina=12)
pieza(lz, [(566, 466), (596, 456), (624, 462), (646, 486), (652, 520), (650, 548), (612, 556), (572, 552),
           (560, 520), (560, 488)], ABRIGO, toques=[(566, 520, 40, '#b07a2a', 0.6), (632, 478, 26, '#f0c870', 0.5)])
pliegues(lz, [[(612, 476), (622, 512), (626, 550)], [(580, 500), (590, 530), (582, 552)]], '#8a5a20', presion=0.5)
for y in (500, 522, 542):
    lz.aguada(Elipse(628, y, 3, 3), '#6a4428', dens=0.9, irreg=0.1)
# red scarf with fringes
bufanda = Trazo([(586, 462), (608, 472), (630, 462)], (16, 18, 15))
lz.aguada(bufanda, CARMIN, dens=0.85, tapa=1, irreg=0.3)
lz.contorno(bufanda, '#7a1f30', grosor=0.6, presion=0.5)
f = Trazo([(626, 468), (636, 498), (632, 524)], (12, 11, 10))
lz.aguada(f, CARMIN, dens=0.85, tapa=1, irreg=0.3)
lz.contorno(f, '#7a1f30', grosor=0.6, presion=0.5)
lz.rayado(f, '#f6d27a', angulo=0, sep=7, presion=0.6, grosor=0.8)
lz.lapiz([[(626 + k * 3, 524), (626 + k * 3, 534)] for k in range(4)], CARMIN, grosor=0.7, presion=0.6)
cabeza_perfil(lz, 616, 410, 46, piel='piel3', pelo='#d8d4ce', peinado='corto', lado=1, inclina=12, canas=True,
              barba='#cfcac4', ojos='abiertos', boca='sonrisa')
# a knitted cap, its brim and a pompom
gorro = Poligono([(574, 392), (582, 368), (606, 356), (632, 360), (648, 376), (652, 392), (630, 386), (604, 384)])
lz.aguada(gorro, '#3f6f8f', dens=0.82, tapa=1, irreg=0.4, sombra=(-5, -5))
lz.rayado(gorro, '#24445a', angulo=100, sep=3, presion=0.5)
lz.contorno(gorro, '#24445a', grosor=0.7, presion=0.55)
lz.aguada(Trazo([(572, 394), (612, 392), (654, 396)], (8, 9, 8)), '#5a8aaa', dens=0.8, tapa=1)
lz.aguada(Elipse(600, 354, 9, 8), '#e6d8c8', dens=0.6, tapa=1, irreg=0.6)
# far arm: his hand round his glass on the table
brazo(lz, (628, 472), (660, 512), (684, 520), 22, ABRIGO, pliegue=False)
mano_dedos(lz, CX - 62, 518, -8, 30, 'piel3', 'sujeta', lado=-1)
# near arm: hand on his chest -- he listens
brazo(lz, (586, 478), (594, 532), (616, 504), 23, ABRIGO)
mano_dedos(lz, 616, 506, -55, 36, 'piel3', 'relajada', lado=-1, abre=0.3)

# ------------------------------------------------------------------ SHE: the young woman speaks (right)
WX, WY, WR = 906, 556, 44
# far wheel and the frame
lz.aguada(Elipse(WX + 10, WY - 4, WR, WR + 2) - Elipse(WX + 10, WY - 4, WR - 6, WR - 4), '#4a5a6a', dens=0.7,
          irreg=0.2)
for pts in ([(850, 548), (930, 548)], [(930, 548), (936, 452)], [(936, 452), (952, 444)],
            [(854, 552), (836, 586)], [(836, 586), (812, 588)], [(842, 556), (840, 588)]):
    f = Trazo(pts, (5, 5))
    lz.aguada(f, '#6a7a8a', dens=0.75, tapa=1, irreg=0.2)
    lz.contorno(f, '#3a4450', grosor=0.5, presion=0.45)
# the front caster: a small wheel on a fork under her feet
lz.aguada(Trazo([(842, 586), (846, 600)], (4, 4)), '#6a7a8a', dens=0.8, tapa=1)
caster = Elipse(846, 604, 8, 8) - Elipse(846, 604, 3, 3)
lz.aguada(caster, '#3a4a5a', dens=0.85, tapa=1, irreg=0.2)
lz.contorno(Elipse(846, 604, 8, 8), '#1e2830', grosor=0.5, presion=0.5)
# legs: thighs forward, knees, shins down to the footrest, feet on it
FALDA = CIRUELA
for (h, k_, a_, sh) in (((896, 544), (840, 540), (826, 580), 0.25), ((908, 550), (852, 548), (838, 586), 0.0)):
    pierna([h, k_, a_], 25, mezcla('#3a2a3a', '#000000', sh), zapato='#b8503e', pie_lado=-1)
pieza(lz, [(930, 506), (906, 512), (868, 520), (838, 528), (832, 548), (850, 560), (900, 560), (932, 552)], FALDA,
      toques=[(840, 540, 26, '#5a2a52', 0.5)])                          # her skirt over the knees
pliegues(lz, [[(900, 524), (868, 534), (840, 538)], [(886, 540), (858, 552)]], '#4a2240')
# coat
cuello(lz, 878, 414, 44, 'piel4', (890, 458), escote=False, giro=-0.6)
pieza(lz, [(868, 462), (892, 454), (916, 460), (932, 490), (934, 524), (930, 552), (898, 556), (870, 548),
           (860, 516), (860, 486)], TEAL, toques=[(928, 520, 40, '#2a6a6a', 0.6), (874, 474, 26, '#6fb1ad', 0.5)])
pliegues(lz, [[(886, 470), (884, 510), (888, 552)], [(916, 486), (920, 520), (914, 552)]], '#1f4f4f', presion=0.5)
for (x, y) in ((902, 496), (876, 528), (918, 534), (894, 474)):
    flor_simple(lz, x, y, 4.0, ROSA, centro='#fff3cf')
# far hand on the wheel's rim
mano_dedos(lz, 930, 536, 120, 28, 'piel4', 'sujeta', lado=1)
cabeza_perfil(lz, 878, 412, 44, piel='piel4', pelo='#2a1a14', peinado='rizado', lado=-1, inclina=-4,
              ojos='abiertos', boca='abierta', ojo=1.35)
# her headwrap, the size of a real one: curls show at the nape and the temple
R_ = lambda dx, dy: (878 - dx * 44, 412 + dy * 44)
envol = Poligono([R_(0.62, -0.42), R_(0.58, -0.88), R_(0.25, -1.16), R_(-0.4, -1.42), R_(-1.0, -1.38),
                  R_(-1.24, -1.0), R_(-1.16, -0.5), R_(-0.92, -0.08), R_(-0.62, -0.02), R_(-0.42, -0.3),
                  R_(-0.08, -0.42), R_(0.3, -0.46)])
lz.aguada(envol, '#e9a43a', dens=0.85, tapa=1, borde=0.8, irreg=0.5, gran=0.3, sombra=(6, -6),
          toques=[(*R_(-0.8, -0.6), 26, '#c4782a', 0.6), (*R_(0.1, -1.0), 22, '#f6c86a', 0.6)])
lz.contorno(envol, '#8a5a1a', grosor=0.8, presion=0.55, cortes=0.2)
# the fabric is wrapped: diagonal folds from the forehead up to the back, and a coral band
pliegues(lz, [[R_(0.55, -0.55), R_(0.0, -0.92), R_(-0.7, -1.3)], [R_(0.5, -0.82), R_(-0.1, -1.12), R_(-0.6, -1.36)],
              [R_(0.2, -0.45), R_(-0.5, -0.8), R_(-1.15, -1.0)], [R_(-0.4, -0.35), R_(-0.85, -0.5), R_(-1.15, -0.7)]],
         '#8a5a1a', presion=0.5)
banda = Trazo([R_(0.6, -0.62), R_(0.0, -0.95), R_(-0.6, -1.2), R_(-1.1, -1.22)], (7, 8, 8, 6))
lz.aguada(banda, CORAL, dens=0.8, tapa=1, irreg=0.4)
lz.contorno(banda, '#9a3a2e', grosor=0.6, presion=0.5)
for (dx, dy) in ((0.25, -0.65), (-0.2, -0.75), (-0.65, -0.95), (-0.95, -0.7), (-0.4, -1.1), (0.1, -1.0),
                 (-0.9, -1.1), (-0.6, -0.4)):
    lz.aguada(Elipse(*R_(dx, dy), 2.6, 2.6), TEAL, dens=0.9, irreg=0.1)
lz.aguada(Elipse(*R_(-0.12, 0.42), 3.2, 3.5), ORO, dens=0.95, irreg=0.1)     # a small gold earring
# near arm: open hand, palm up -- she explains what she feels
brazo(lz, (884, 470), (860, 520), (818, 500), 22, TEAL)
mano_dedos(lz, 818, 500, 200, 38, 'piel4', 'abierta', lado=-1, abre=0.6, curl=10)
# near wheel over her: a ring with spokes and a hand rim
rueda = Elipse(WX, WY, WR, WR + 2) - Elipse(WX, WY, WR - 6, WR - 4)
lz.aguada(rueda, '#3a4a5a', dens=0.85, tapa=1, irreg=0.2)
lz.contorno(rueda, '#1e2830', grosor=0.6, presion=0.5)
lz.lapiz([arco(WX, WY, WR - 10, WR - 8, 0, 360, 40)], '#8a9aaa', grosor=0.7, presion=0.55, temblor=0.05)
lz.lapiz([[(WX, WY), (WX + (WR - 7) * math.cos(a), WY + (WR - 5) * math.sin(a))]
          for a in np.linspace(0, 2 * np.pi, 11)[:-1]], '#5a6a7a', grosor=0.45, presion=0.45, temblor=0.03)
lz.aguada(Elipse(WX, WY, 5, 5), '#6a7a8a', dens=0.8, tapa=1)

componer(HOJA, lz, K, (CX, KY))
lz = HOJA


def T_(p):
    """Where a point of the group sheet lands on the page."""
    p = np.asarray(p, float)
    return (p - (CX, KY)) * K + (CX, KY)


# their shadows on the planks
for (x, r_) in ((600, 70), (CX, 70), (880, 80)):
    q = T_((x, ym(x) + 4))
    sombra(lz, q[0], ym(q[0]) - 2, r_ * K, 7, '#8a6a5a', 0.3)

# ------------------------------------------------------------------ the child brings soup, inside the railing
NX = 430
sombra(lz, NX, ym(NX) + 4, 40, 5, '#8a6a5a', 0.3)
pierna([(NX - 6, 586), (NX - 16, 618), (NX - 26, ym(NX - 26) - 6)], 13, '#4a6a9a', zapato=ORO, pie_lado=1)
pierna([(NX + 8, 586), (NX + 24, 610), (NX + 26, ym(NX + 26) - 10)], 13, '#5a7aaa', zapato=ORO, pie_lado=1)
cuello(lz, NX, 472, 32, 'piel2', (NX + 2, 504), giro=0.55, inclina=6)
pieza(lz, [(NX - 16, 506), (NX + 2, 500), (NX + 20, 506), (NX + 28, 548), (NX + 34, 592), (NX, 598),
           (NX - 30, 592), (NX - 22, 548)], CORAL, toques=[(NX - 22, 570, 28, '#c4503e', 0.6)])
pliegues(lz, [[(NX, 528), (NX - 4, 566), (NX - 8, 594)]], '#9a3a2e')
for y in (520, 540, 560):
    lz.aguada(Elipse(NX + 6, y, 2.6, 2.6), '#f6e2bd', dens=0.9, irreg=0.1)
BX, BY = NX + 46, 548
brazo(lz, (NX - 10, 514), (NX - 4, 548), (BX + 18, 552), 14, CORAL, pliegue=False)        # far arm
mano_dedos(lz, BX + 18, 552, -20, 22, 'piel2', 'sujeta', lado=-1)
sopa = Poligono(np.vstack([arco(BX, BY, 23, 5.5, 180, 360, 12), arco(BX, BY, 23, 16, 0, 180, 14)]), suave=False)
lz.aguada(sopa, '#f3e6cf', dens=0.6, tapa=1, sombra=(-5, -4))
lz.aguada(Elipse(BX, BY, 20, 4), '#e0a040', dens=0.8, irreg=0.2)
lz.lapiz([arco(BX, BY + 9, 19, 4.5, 20, 160, 10)], CORAL, grosor=0.7, presion=0.5)
lz.contorno(sopa, '#9a7a6a', grosor=0.7, presion=0.5)
for k in range(3):
    x = BX - 10 + k * 10
    lz.lapiz([spline([(x, BY - 6), (x - 4, BY - 18), (x + 3, BY - 30), (x - 2, BY - 42)])], '#c9b8a8', grosor=0.7,
             presion=0.35)
brazo(lz, (NX + 12, 512), (NX + 10, 548), (BX - 20, 558), 14, CORAL)                      # near arm
mano_dedos(lz, BX - 20, 558, -15, 22, 'piel2', 'sujeta', lado=1)
cabeza(lz, NX, 470, 32, piel='piel2', pelo='#c9783a', peinado='rizado', giro=0.55, inclina=6, ojos='abiertos',
       boca='sonrisa', mira=(1, 0.3))

# ------------------------------------------------------------------ the near railing, only on the slopes
for x in xs_post:
    if abs(x - CX) < 230:
        continue
    palo((x, yn(x) - 54), (x, yn(x) + 2), 5.5, MADERA)
for (a, b) in ((X0, CX - 230), (CX + 230, X1)):
    xx = np.linspace(a, b, 50)
    f = Trazo(np.stack([xx, yn(xx) - 54], 1), (5.5, 5.5, 5.5, 4))
    lz.aguada(f, MADERA, dens=0.75, tapa=1, irreg=0.3, gran=0.4)
    lz.contorno(f, MADERA_LP, grosor=0.6, presion=0.45)
# the planks and railing fade at both ends of the bridge, into the paper
desvanecer_x(lz, 150, 1340, 560, 790, 180, 330, 1150, 1300, semilla=9)
# a sprig of holly with berries at each end
for (x0, y0, sd) in ((330, yn(330) - 60, -1), (1156, yn(1156) - 60, 1)):
    pts = [(x0, y0 + 10), (x0 + sd * 14, y0 - 12), (x0 + sd * 22, y0 - 34)]
    lz.lapiz([spline(pts)], '#5a3a2a', grosor=1.0, presion=0.6)
    for t, a in ((0.3, -30), (0.6, 200), (0.85, -60)):
        p = np.array(pts[0]) * (1 - t) + np.array(pts[2]) * t
        hojita(lz, p[0], p[1], 14, a if sd > 0 else 180 - a, '#3f7a5a', tapa=1)
    for d in ((0, 0), (5, 3), (-3, 5)):
        lz.aguada(Elipse(x0 + sd * 10 + d[0], y0 - 6 + d[1], 3.2), CARMIN, dens=0.95, tapa=1, irreg=0.2)

# ------------------------------------------------------------------ their words: two threads of light, a heart, a star
SX, SY = CX, 160                                # the star they light
TOP = (CX, 370)                                  # the cleft of the heart: there the two threads become one
# each thread comes from one of them, runs up beside the other WITHOUT crossing it (gold always on the left,
# rose always on the right), draws its half of a soft heart and meets the other at the cleft
oido = spline([(626, 492), (672, 496), (718, 484), (736, 468), (737, 448), (728, 430), (704, 410), (690, 388),
               (694, 362), (712, 348), (731, 352), (741, 370)])            # from his hand on his heart
voz = spline([(836, 438), (808, 456), (768, 476), (748, 468), (747, 448), (756, 430), (780, 410), (794, 388),
              (790, 362), (772, 348), (753, 352), (743, 370)])             # from her mouth
oido, voz = T_(oido), T_(voz)
TOP = tuple(T_(TOP))
uno = bezier(TOP, (CX - 14, 270), (CX + 16, 220), (SX, SY + 26), 60)       # together, one thread
rng2 = np.random.default_rng(12)
for path, col, lp_, w in ((oido, '#eba93a', '#b8781a', 3.2), (voz, '#ec7f92', '#b04a60', 3.2),
                          (uno, '#f2b24a', '#b8781a', 3.8)):
    jit = path + rng2.normal(0, 0.6, path.shape)
    n_ = len(jit)
    ws = tuple(np.interp(np.linspace(0, 1, 8), [0, 0.15, 0.85, 1], [1.2, w, w, w * 0.8]))
    f = Trazo(jit, ws, suave=False)
    lz.aguada(f, col, dens=0.85, tapa=0.7, irreg=0.6, borde=0.8, gran=0.2)
    lz.lapiz([jit], lp_, grosor=0.55, presion=0.45, temblor=0.4, cortes=0.45)
    lz.luz(Trazo(jit[::3], (10,)), '#ffe2a0', fuerza=0.38, suave=5)
    for p in jit[5::9]:
        lz.gouache(Elipse(p[0] + rng2.normal(0, 3), p[1] + rng2.normal(0, 3), rng2.uniform(0.8, 1.6)), '#fffaf0',
                   alfa=0.9, irreg=0)
# the star
pts = []
for j in range(10):
    rr = 30 if j % 2 == 0 else 13
    a_ = math.radians(-90 + j * 36 + 4)
    pts.append((SX + math.cos(a_) * rr * (1 + 0.05 * math.sin(j * 2.3)), SY + math.sin(a_) * rr))
f = Poligono(pts, suave=False)
lz.aguada(Elipse(SX, SY, 60, 56), '#f6c66a', dens=0.14, suave=22, gran=0.05)
lz.aguada(f, '#f2b632', dens=0.9, tapa=1, irreg=0.35, borde=0.9, toques=[(SX, SY, 12, '#fff3c4', 0.9)])
lz.contorno(f, '#a0661a', grosor=0.8, presion=0.55, cortes=0.15, desfase=0.3)
for j in range(0, 10, 2):
    a_ = math.radians(-90 + j * 36 + 4)
    lz.lapiz([[(SX, SY), (SX + math.cos(a_) * 25, SY + math.sin(a_) * 25)]], '#b8781a', grosor=0.5, presion=0.35)
lz.luz((SX, SY, 30), '#fff2c4', fuerza=0.75)
lz.chispas(SX, SY, 70, 56, n=16)

# a very few early stars and snowflakes in the silence
for (x, y, r, c) in ((560, 236, 7, ORO), (948, 210, 6, ROSA), (1040, 300, 5, TEAL)):
    estrella(lz, x, y, r, c, gouache=False)
copos = []
for (x, y) in ((470, 300), (640, 210), (860, 250), (1010, 380), (420, 400)):
    r = 3.4
    for a in (15, 75, 135):
        d = np.array([math.cos(math.radians(a)), math.sin(math.radians(a))]) * r
        copos.append([(x - d[0], y - d[1]), (x + d[0], y + d[1])])
lz.lapiz(copos, '#7f9cc0', grosor=0.6, presion=0.6, temblor=0.05)

lz.vineta(margen=30)
lz.guardar(SALIDA)
print('ok', SALIDA)
