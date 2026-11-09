"""
Mes 4 -- Bosque y Naturaleza -- Diseño 4.

Idea: "we are part of the forest, not its owners". A slice of forest floats on
the paper, seen in section. Above: an old holm oak full of birds, where a girl
hangs upside down from a branch by her knees, laughing; a young cherry in
blossom; and a grandfather kneeling to plant a little oak while his
granddaughter waters it. Below: the soil the forest stands on -- roots, worms,
a sleeping dormouse, seeds -- and the golden mycelium that joins every tree to
every other. The newly planted oak's first root has just touched the network:
the forest has taken it in.

    python3 mes-04-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, rgb, remuestrea,
                      estrella, hojita, hoja, flor_simple, flor_grande, pajaro, ramita, motas, puntos_dentro, mata,
                      _lapiz_de)
from extra_m134 import cara, mano, miembro, prenda, volumen, cuello, Marco, SEPIA, PIEL_LP

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-04-d.png'

lz = Lienzo(ANCHO, semilla=404)

TEAL = '#3f8f94'
CORAL = '#e8735e'
CARMIN = '#c33c4e'
ORO = '#f0c25e'
OCRE = '#e2a23a'
VERDE_E = '#3f6a4a'     # holm-oak green
rng = np.random.default_rng(4)


def yg(x):
    """Ground line (top of the soil slice)."""
    return 545 + 7 * math.sin(x / 70.0) + 4 * math.sin(x / 23.0 + 1.0)


X0, X1 = 150, 1335
# ------------------------------------------------------------------ the slice of earth
top = [(x, yg(x)) for x in np.linspace(X0, X1, 60)]
bottom = [(X1 - 20, 610), (1260, 690), (1120, 760), (920, 805), (720, 815), (520, 795), (340, 740), (210, 660),
          (X0 + 10, 590)]
SUELO = Poligono(top + bottom, suave=True)
lz.aguada(SUELO, '#c89058', dens=0.78, tapa=1, borde=0.8, flor=3, gran=0.7, var=0.5,
          toques=[(400, 700, 120, '#9a5a32', 0.6), (900, 760, 140, '#8a4a2e', 0.6), (1150, 640, 90, '#d8a868', 0.6),
                  (650, 620, 100, '#b8784a', 0.5)])
# dark humus at the top, paler subsoil below
HUMUS = Poligono(top + [(X1, yg(X1) + 26)] + [(x, yg(x) + 30 + 6 * math.sin(x / 31.0)) for x in np.linspace(X1, X0, 50)]
                 + [(X0, yg(X0) + 20)], suave=False)
lz.aguada(HUMUS & SUELO, '#5a3424', dens=0.6, borde=0.5, gran=0.6, irreg=1.2)
lz.aguada(SUELO, '#e8c890', dens=0.3, desvanece=(740, 820, 740, 640), gran=0.4)
lz.rayado(SUELO, '#7a4a2e', angulo=8, sep=7, presion=0.22, largo=26)
lz.contorno(SUELO, '#6e4630', grosor=1.0, presion=0.55, cortes=0.35, desfase=0.8)
# stones and seeds in the soil
for (x, y) in puntos_dentro(SUELO, 46, 7, margen=10):
    if y < yg(x) + 36:
        continue
    k = rng.random()
    if k < 0.55:
        e = Elipse(x, y, rng.uniform(3, 8), rng.uniform(2, 5), rng.uniform(0, 180))
        volumen(lz, e, rng.choice(['#b8aa98', '#d8c8b0', '#a89a8a', '#c9b49a']), dens=0.6, brillo=0.3,
                lapiz='#6e5e50', contorno=True)
    elif k < 0.8:
        se = Elipse(x, y, 3.2, 2.2, rng.uniform(0, 180))
        lz.aguada(se, '#7a4a2a', dens=0.85, irreg=0.2)
        lz.lapiz([[(x, y), (x + rng.normal(0, 3), y - 6)]], '#9ab86a', grosor=0.6, presion=0.6)     # sprouting
    else:
        lz.aguada(Elipse(x, y, 1.4), '#f6e8c8', dens=0.6, irreg=0.1)

# ------------------------------------------------------------------ roots
TRONCO_X = 560


def raiz(p0, ang, L, w, prof=0, sem=0, col='#7a4a2e'):
    """A root that tapers and branches; returns its tips."""
    r = np.random.default_rng(sem)
    pts = [p0]
    a = math.radians(ang)
    x, y = p0
    for k in range(5):
        a += r.normal(0, 0.25)
        x += math.cos(a) * L / 5
        y += math.sin(a) * L / 5
        pts.append((x, y))
    f = Trazo(pts, (w, w * 0.75, w * 0.5, w * 0.3, w * 0.18, w * 0.08))
    lz.aguada(f, col, dens=0.75, tapa=0.6, irreg=0.4, borde=0.6, gran=0.4)
    lz.contorno(f, '#4a2e1e', grosor=0.6, presion=0.45, cortes=0.3, desfase=0.2)
    tips = [pts[-1]]
    if prof < 2:
        for j in (2, 3):
            b = math.degrees(math.atan2(pts[j + 1][1] - pts[j][1], pts[j + 1][0] - pts[j][0]))
            tips += raiz(pts[j], b + r.choice([-1, 1]) * r.uniform(30, 55), L * 0.55, w * 0.45, prof + 1, sem * 7 + j, col)
    return tips


puntas = []
for k, (ang, L, w) in enumerate(((150, 200, 26), (120, 190, 30), (95, 210, 30), (70, 200, 28), (35, 210, 26),
                                 (165, 150, 16), (15, 160, 16))):
    puntas += raiz((TRONCO_X + (k - 3) * 9, yg(TRONCO_X) + 6), ang, L, w, sem=10 + k)
CER_X = 950
for k, (ang, L, w) in enumerate(((140, 110, 16), (100, 120, 18), (70, 120, 18), (35, 110, 15))):
    puntas += raiz((CER_X + (k - 1.5) * 6, yg(CER_X) + 4), ang, L, w, sem=40 + k, col='#8a5a3a')
ARB_X = 1168
lz.lapiz([spline([(ARB_X, yg(ARB_X) + 4), (ARB_X - 3, yg(ARB_X) + 22), (ARB_X + 4, yg(ARB_X) + 42),
                  (ARB_X - 2, yg(ARB_X) + 62)])], '#e8d8b8', grosor=1.6, presion=0.75)
lz.lapiz([spline([(ARB_X - 1, yg(ARB_X) + 30), (ARB_X - 14, yg(ARB_X) + 40)]),
          spline([(ARB_X + 3, yg(ARB_X) + 46), (ARB_X + 14, yg(ARB_X) + 56)])], '#e8d8b8', grosor=1.0, presion=0.6)
P_ARB = (ARB_X - 2, yg(ARB_X) + 62)

# ------------------------------------------------------------------ the mycelium: golden threads joining every tree
rngm = np.random.default_rng(12)
hilos = []
dentro = lambda x, y: y > yg(x) + 18 and y < 790 and X0 + 30 < x < X1 - 30


def hifa(a, b, n=1):
    """A wandering fungal thread from a to b."""
    for _ in range(n):
        m1 = ((a[0] * 2 + b[0]) / 3 + rngm.normal(0, 22), (a[1] * 2 + b[1]) / 3 + rngm.normal(0, 18))
        m2 = ((a[0] + b[0] * 2) / 3 + rngm.normal(0, 22), (a[1] + b[1] * 2) / 3 + rngm.normal(0, 18))
        p = bezier(a, m1, m2, b, 50)
        p = np.array([q for q in p if dentro(*q)])
        if len(p) > 4:
            hilos.append(p)


P = [q for q in puntas if dentro(*q)]
P.sort(key=lambda q: q[0])
for i in range(len(P) - 1):
    hifa(P[i], P[i + 1], 1 + (i % 2))
    if i + 3 < len(P) and rngm.random() < 0.5:
        hifa(P[i], P[i + 3])
# the new oak's first root has just touched the network
ult = min(P, key=lambda q: (q[0] - P_ARB[0]) ** 2 + (q[1] - P_ARB[1]) ** 2)
hifa(P_ARB, ult, 2)
hifa(P_ARB, (P_ARB[0] + 70, P_ARB[1] + 40), 1)
# fine branching hairs
for h in list(hilos):
    for j in range(5, len(h) - 5, 12):
        a = rngm.uniform(0, 2 * math.pi)
        L = rngm.uniform(8, 20)
        q = (h[j][0] + math.cos(a) * L, h[j][1] + math.sin(a) * L)
        if dentro(*q):
            hilos.append(np.array([h[j], ((h[j][0] + q[0]) / 2 + rngm.normal(0, 3), (h[j][1] + q[1]) / 2), q]))
for h in hilos:
    lz.aguada(Trazo(h[::4] if len(h) > 8 else h, (3.5, 2.5)), '#f6d690', dens=0.35, suave=1.5)
lz.lapiz(hilos, '#f8e2a0', grosor=0.9, presion=0.85, temblor=0.15)
lz.lapiz(hilos[::2], '#e8b84a', grosor=0.5, presion=0.6, temblor=0.15)
for h in hilos[::3]:
    lz.luz((h[len(h) // 2][0], h[len(h) // 2][1], 12), '#ffe2a0', fuerza=0.35)
for q in P[::2]:
    lz.gouache(Elipse(*q, 1.6), '#fff4c0', alfa=0.9, irreg=0)
lz.luz((P_ARB[0], P_ARB[1], 20), '#ffe6a8', fuerza=0.7)
lz.gouache(Elipse(*P_ARB, 2.4), '#fff4c0', alfa=0.95, irreg=0)

# ------------------------------------------------------------------ life in the soil
def lombriz(pts, w=5.5):
    """An earthworm (day 11) with ring segments."""
    f = Trazo(pts, (w * 0.8, w, w, w * 0.7))
    lz.aguada(f, '#e0907a', dens=0.75, tapa=1, irreg=0.3, toques=[(*pts[1], 10, '#c86a6a', 0.6)])
    lz.contorno(f, '#8a4a3a', grosor=0.6, presion=0.55, cortes=0.1, desfase=0.1)
    q = remuestrea(spline(pts), 4)
    for j in range(1, len(q) - 1):
        d = q[j + 1] - q[j - 1]
        n = np.array([-d[1], d[0]]) / (np.hypot(*d) + 1e-9)
        lz.lapiz([[q[j] - n * w * 0.45, q[j] + n * w * 0.45]], '#a85a4a', grosor=0.45, presion=0.4)


lombriz([(300, 640), (330, 628), (356, 646), (384, 634)])
lombriz([(820, 720), (846, 708), (870, 724), (900, 716), (920, 730)])
lombriz([(1040, 610), (1062, 626), (1090, 618)], 4.5)
# a dormouse asleep in a chamber among the roots
cam = Elipse(700, 715, 40, 26)
lz.aguada(cam, '#4a2a1e', dens=0.6, tapa=1, irreg=0.6, toques=[(700, 725, 26, '#6a3a24', 0.6)])
lz.aguada(Elipse(700, 728, 36, 10), '#c9a868', dens=0.7, irreg=0.6)            # a bed of dry leaves
lir = Poligono([(676, 722), (680, 704), (698, 696), (716, 700), (726, 712), (720, 726), (696, 730)])
volumen(lz, lir, '#b8a090', dens=0.7, brillo=0.3, lapiz='#5a4a3a')
lz.aguada(Trazo([(720, 724), (734, 716), (730, 700), (716, 696)], (8, 7, 6, 3)), '#9a8070', dens=0.75, tapa=1)
lz.lapiz([arco(684, 712, 3.5, 2, 20, 160, 8)], '#2a1a14', grosor=0.9, presion=0.85)
lz.aguada(Elipse(688, 702, 5, 4), '#d8b8a8', dens=0.7, tapa=1)
lz.lapiz([arco(700, 712, 40, 26, 0, 360, 40)], '#2e1a12', grosor=0.8, presion=0.5, cortes=0.3)
# an acorn the jay buried and forgot (that is how oaks walk)
bel = Elipse(470, 610, 6, 9, 20)
lz.aguada(bel, '#a8743a', dens=0.85, tapa=1, irreg=0.2)
lz.aguada(Elipse(472, 602, 6.5, 4, 20), '#6e4a2a', dens=0.85, tapa=1, irreg=0.2)
lz.lapiz([[(469, 618), (466, 626)]], '#e8d8b8', grosor=1.0, presion=0.7)

# ------------------------------------------------------------------ grass, flowers and mushrooms on the ground line
for x in np.arange(X0 + 6, X1 - 6, 6.0):
    if rng.random() < 0.2:
        continue
    b0 = (x, yg(x) + 2)
    L = rng.uniform(6, 16)
    a = math.radians(-90 + rng.normal(0, 18))
    blade = Poligono([(x - 2, b0[1]), (x + math.cos(a) * L, b0[1] + math.sin(a) * L), (x + 2, b0[1])], suave=False)
    lz.aguada(blade, rng.choice(['#5f8f63', '#7aa25a', '#3f7a6a', '#8ab05a']), dens=0.8, irreg=0.2, borde=0.4, tapa=0.5)
# mushrooms: the fruit of the fungus whose body is the golden net below (day 15)
for (x, s_) in ((420, 1.0), (436, 0.7), (770, 0.85)):
    y = yg(x)
    pie = Trazo([(x, y + 2), (x + 1, y - 16 * s_)], (8 * s_, 6 * s_))
    lz.aguada(pie, '#f2e6cc', dens=0.5, tapa=1, irreg=0.2)
    lz.contorno(pie, '#8a6a4a', grosor=0.6, presion=0.5)
    som = Poligono([(x - 14 * s_, y - 13 * s_), (x - 10 * s_, y - 24 * s_), (x + 2 * s_, y - 28 * s_),
                    (x + 13 * s_, y - 22 * s_), (x + 15 * s_, y - 13 * s_)])
    volumen(lz, som, '#9a5a2e', dens=0.8, brillo=0.35, lapiz='#5a3420')
    lz.lapiz([[(x, y + 4), (x + rng.normal(0, 6), y + 26)]], '#f8e2a0', grosor=0.7, presion=0.8)
# spring flowers left wild for the insects (day 19)
for x in list(np.arange(180, 330, 13)) + list(np.arange(1230, 1320, 12)) + list(np.arange(830, 880, 14)):
    c = rng.choice([CORAL, '#fff3e0', ORO, '#8d73b0', '#f6a5b5', '#5f86c0'])
    h = rng.uniform(18, 44)
    tip = (x + rng.normal(0, 4), yg(x) - h)
    lz.lapiz([bezier((x, yg(x)), (x + rng.normal(0, 3), yg(x) - h / 2), tip, n=12)], '#4f6f45', grosor=0.8, presion=0.6)
    if rng.random() < 0.3:
        hojita(lz, x, yg(x) - h * 0.4, 9, rng.choice([-150, -30]), '#5f8f63', tapa=0.6)
    flor_simple(lz, *tip, rng.uniform(5, 8.5), c, centro=ORO if c != ORO else CORAL)


def abeja(x, y, s=1.0, ang=0):
    """A small bee: striped body, translucent wings."""
    a = ang
    for sd in (-1, 1):
        lz.aguada(Elipse(x - 1 * s, y - 5 * s, 5 * s, 3 * s, a + sd * 30 - 90), '#dfeef2', dens=0.4, irreg=0.1)
        lz.contorno(Elipse(x - 1 * s, y - 5 * s, 5 * s, 3 * s, a + sd * 30 - 90), '#7a8a96', grosor=0.4, presion=0.4)
    cu = Elipse(x, y, 6 * s, 4 * s, a)
    lz.aguada(cu, '#f0b030', dens=0.9, tapa=1, irreg=0.1)
    lz.lapiz([[(x - 1.5 * s, y - 3.8 * s), (x - 1.5 * s, y + 3.8 * s)], [(x + 2 * s, y - 3.5 * s), (x + 2 * s, y + 3.5 * s)]],
             '#2a1a14', grosor=1.0 * s, presion=0.85)
    lz.aguada(Elipse(x - 6 * s, y, 2.4 * s), '#2a1a14', dens=1.0)


def mariposa(x, y, s=1.0, c1='#e8735e', c2='#f0c25e', ang=0):
    """A butterfly seen from above."""
    M_ = Marco(x, y, ang, s)
    for sd in (-1, 1):
        a1 = Poligono([M_(0, 0), M_(sd * 6, -14), M_(sd * 16, -16), M_(sd * 18, -6), M_(sd * 4, 0)])
        a2 = Poligono([M_(0, 2), M_(sd * 12, 6), M_(sd * 14, 14), M_(sd * 5, 14)])
        lz.aguada(a1, c1, dens=0.8, tapa=1, irreg=0.3, borde=0.8, toques=[(*M_(sd * 12, -10), 5 * s, c2, 0.7)])
        lz.aguada(a2, c2, dens=0.8, tapa=1, irreg=0.3, borde=0.8)
        lz.contorno(a1 | a2, '#5a2a1a', grosor=0.5, presion=0.5, cortes=0.1, desfase=0.1)
        lz.gouache(Elipse(*M_(sd * 13, -11), 1.3 * s), '#fffaf0', alfa=0.9, irreg=0)
    lz.aguada(Trazo([M_(0, -8), M_(0, 12)], (3 * s, 2 * s)), '#3a2a20', dens=0.9)
    lz.lapiz([[M_(0, -8), M_(-4, -15)], [M_(0, -8), M_(4, -15)]], '#3a2a20', grosor=0.5, presion=0.6)


# ------------------------------------------------------------------ the holm oak (back to front: trunk, crown)
TR = [(TRONCO_X - 30, yg(TRONCO_X) + 4), (TRONCO_X - 18, 470), (TRONCO_X - 22, 400), (TRONCO_X - 10, 330)]
TR2 = [(TRONCO_X + 32, yg(TRONCO_X) + 4), (TRONCO_X + 24, 470), (TRONCO_X + 26, 400), (TRONCO_X + 18, 330)]
TRONCO = Poligono(TR + [(TRONCO_X + 4, 300)] + TR2[::-1], suave=True)
RAMA_I = Trazo([(TRONCO_X - 8, 360), (480, 330), (400, 318), (318, 322)], (34, 26, 18, 10))      # the hanging branch
RAMA_D = Trazo([(TRONCO_X + 10, 345), (640, 300), (700, 250)], (30, 22, 12))
RAMA_C = Trazo([(TRONCO_X, 320), (552, 250), (566, 190)], (34, 24, 14))
CORTEZA = TRONCO | RAMA_I | RAMA_D | RAMA_C
volumen(lz, CORTEZA, '#7a5a44', dens=0.8, luz=(-0.6, -0.8), brillo=0.25, lapiz='#3e2a1e',
        toques=[(TRONCO_X - 20, 420, 30, '#9a7a5a', 0.6), (TRONCO_X + 20, 500, 30, '#5a3e2e', 0.6)])
# deep, cracked holm-oak bark
cor = []
for k in range(14):
    x = TRONCO_X - 22 + k * 3.4 + rng.normal(0, 1)
    y0 = rng.uniform(340, 470)
    cor.append(spline([(x, y0), (x + rng.normal(0, 2), y0 + 20), (x + rng.normal(0, 2), y0 + 44)]))
lz.lapiz(cor, '#3e2a1e', grosor=0.8, presion=0.5, temblor=0.4, cortes=0.3)
lz.aguada(Elipse(TRONCO_X + 6, 430, 8, 12), '#2e1e16', dens=0.85, tapa=1, irreg=0.3)      # a hole in the trunk
lz.aguada(Elipse(TRONCO_X + 6, 432, 4, 3), '#9a7a5a', dens=0.7)

COPA_C = [(560, 170, 120), (440, 205, 90), (680, 200, 100), (360, 260, 60), (760, 260, 70), (500, 120, 80),
          (630, 110, 80), (560, 250, 90), (420, 280, 50)]
COPA = Circulos(COPA_C)
lz.aguada(COPA, VERDE_E, dens=0.85, tapa=0.9, borde=0.8, flor=3, gran=0.5, var=0.5,
          toques=[(500, 100, 90, '#7a9a4a', 0.7), (640, 120, 70, '#9ab05a', 0.6), (700, 280, 90, '#2a4a3a', 0.7),
                  (380, 280, 70, '#2f5a4a', 0.6), (560, 200, 60, '#5f8a5a', 0.5)])
lz.aguada(COPA, '#1f3a30', dens=0.35, desvanece=(740, 330, 520, 120), gran=0.4)
# leaves: many small holm-oak leaves in three greens, light on the upper left
for (x, y) in puntos_dentro(COPA, 170, 5, margen=4):
    luzc = (x - 560) * -0.6 + (y - 170) * -0.8
    col = rng.choice(['#9ab05a', '#7a9a4a']) if luzc > 40 else rng.choice(['#3f6a4a', '#2f5a42', '#5f8a5a'])
    hojita(lz, x, y, rng.uniform(9, 14), rng.uniform(0, 360), col, tapa=0.7, nervio=rng.random() < 0.4)
lz.contorno(COPA, '#2a4030', grosor=0.9, presion=0.45, cortes=0.4, desfase=1.0)
# acorns
for (x, y) in puntos_dentro(COPA, 14, 21, margen=12):
    lz.aguada(Elipse(x, y + 3, 3.4, 5), '#b8843a', dens=0.85, tapa=1, irreg=0.2)
    lz.aguada(Elipse(x, y - 1, 3.8, 2.4), '#6e4a2a', dens=0.9, tapa=1, irreg=0.2)
# sunlight filtering through (spring light)
lz.luz((500, 110, 80), '#ffe6a0', fuerza=0.35)
for k in range(6):
    x = 470 + k * 30
    lz.aguada(Poligono([(x, 300), (x + 10, 300), (x - 30, 520), (x - 46, 520)], suave=False), '#f8e4a8', dens=0.12,
              suave=6, gran=0.05)
# a nest with blue eggs in the fork, and birds singing (day 12)
nido = Elipse(640, 262, 22, 9)
lz.aguada(nido, '#a8743a', dens=0.85, tapa=1, irreg=0.6)
lz.lapiz([arco(640, 262, 22 - k * 2, 9 - k, 10 + k * 20, 170 + k * 6, 14) for k in range(5)], '#5a3a20', grosor=0.6,
         presion=0.6, temblor=0.3)
for dx in (-7, 2, 10):
    lz.aguada(Elipse(640 + dx, 254, 4.2, 5), '#9fd0d8', dens=0.8, tapa=1, irreg=0.1)
pajaro(lz, 615, 236, 15, '#c8603a', ang=-18, alas='abajo', vientre='#f3d8b0')                  # a robin at the nest


def abubilla(x, y, s=1.0):
    """A hoopoe perched, crest open (singing)."""
    pajaro(lz, x, y, 16 * s, '#d89a5a', ang=-5, alas='abajo', vientre='#f0d0a8')
    ala = Poligono([(x - 14 * s, y - 2 * s), (x + 4 * s, y - 4 * s), (x + 6 * s, y + 4 * s), (x - 20 * s, y + 6 * s)])
    lz.aguada(ala, '#2a2420', dens=0.85, tapa=1, irreg=0.2)
    lz.lapiz([[(x - 16 + 5 * k, y - 3), (x - 16 + 5 * k, y + 5)] for k in range(5)], '#f6f0e0', grosor=1.0, presion=0.8)
    for k in range(5):
        a = math.radians(-150 + k * 22)
        p0 = (x + 8 * s, y - 6 * s)
        p1 = (p0[0] + math.cos(a) * 14 * s, p0[1] + math.sin(a) * 14 * s)
        lz.aguada(Trazo([p0, p1], (4 * s, 2.5 * s)), '#e0904a', dens=0.85, irreg=0.2)
        lz.aguada(Elipse(*p1, 1.6 * s), '#2a1a14', dens=0.9)
    lz.lapiz([bezier((x + 16 * s, y - 4 * s), (x + 24 * s, y - 2 * s), (x + 30 * s, y + 4 * s), n=8)], '#2a1a14',
             grosor=1.0, presion=0.8)


abubilla(732, 236, 1.1)
# musical breath of the birds: tiny pencil notes would be letters -- instead, little curls of song
for (x, y) in ((760, 205), (590, 214)):
    lz.lapiz([arco(x + k * 10, y - k * 8, 4 + k, 3 + k, 200, 340, 10) for k in range(3)], '#c8603a', grosor=0.6,
             presion=0.5)

# ------------------------------------------------------------------ the girl hanging upside down by her knees
# knees hooked over the left branch at (430, 328); body hangs down, arms dangling toward the grass
CR = (432, 334)
# legs: thighs over the branch, shins hanging behind it
miembro(lz, [(452, 360), (CR[0] + 6, CR[1] - 4), (CR[0] + 28, CR[1] - 30)], (24, 18, 14), '#e8735e', lado=-1)
miembro(lz, [(440, 362), (CR[0] - 8, CR[1] - 6), (CR[0] - 12, CR[1] - 36)], (24, 18, 14), '#d8604e', lado=1)
for (x, y, a) in ((CR[0] + 30, CR[1] - 40, -60), (CR[0] - 12, CR[1] - 46, -100)):
    z = Elipse(x, y, 12, 6.5, a)
    lz.aguada(z, '#5f86c0', dens=0.8, tapa=1, irreg=0.3)
    lz.contorno(z, '#2f4a7a', grosor=0.7, presion=0.55)
lz.aguada(RAMA_I & Elipse(430, 330, 30, 20), '#7a5a44', dens=0.8, tapa=1)        # branch passes in front
lz.contorno(RAMA_I & Elipse(430, 330, 30, 20), '#3e2a1e', grosor=0.9, presion=0.5)
# body hanging: dungarees then T-shirt, upside down
peto = [(426, 344), (466, 346), (470, 380), (464, 410), (424, 410), (420, 378)]
prenda(lz, peto, '#e8735e', luz=(-0.6, -1), pliegues=[[(438, 360), (436, 400)], [(456, 356), (458, 404)]])
lz.gouache(Elipse(434, 396, 3), '#fff3e0', alfa=0.9, irreg=0)
lz.gouache(Elipse(458, 396, 3), '#fff3e0', alfa=0.9, irreg=0)
camis = [(424, 408), (466, 408), (472, 446), (462, 462), (426, 462), (418, 446)]
prenda(lz, camis, ORO, luz=(-0.6, -1), pliegues=[[(436, 420), (444, 450)]])
for (u, v) in ((432, 420), (452, 430), (440, 448), (460, 450)):
    lz.gouache(Elipse(u, v, 2.2), '#fff3e0', alfa=0.9, irreg=0)
# hair falling straight down, towards the grass
pelo = Poligono([(420, 488), (470, 488), (482, 540), (470, 568), (456, 552), (446, 574), (432, 552), (418, 566), (410, 534)])
lz.aguada(pelo, '#6a3a22', dens=0.8, tapa=1, irreg=0.6, borde=0.8, toques=[(446, 530, 16, '#a8603a', 0.6)])
lz.lapiz([spline([(420 + k * 6, 494), (418 + k * 6.3, 530), (414 + k * 6.6, 560)]) for k in range(9)], '#4a2416',
         grosor=0.6, presion=0.45, temblor=0.3)
cuello(lz, (446, 492), 28, (446, 462), piel='piel3', ancho=0.45)
cara(lz, 446, 492, 28, piel='piel3', pelo='#6a3a22', peinado='calvo', orejas=True, giro=-0.2, ang=180,
     ojos='abiertos', mira=(0, 1), boca='risa', semilla=41)
# arms dangling, one reaching for a flower in the grass
miembro(lz, [(428, 452), (410, 490), (402, 528)], (14, 12, 10), 'piel3', lado=1, lapiz=PIEL_LP)
mano(lz, 402, 528, 96, 20, 'piel3', 'abierta', lado=1)
miembro(lz, [(464, 452), (482, 492), (486, 530)], (14, 12, 10), 'piel3', lado=-1, lapiz=PIEL_LP)
mano(lz, 486, 530, 80, 20, 'piel3', 'relajada', lado=-1)

# ------------------------------------------------------------------ the young cherry in blossom
CT = Trazo([(CER_X, yg(CER_X) + 2), (CER_X - 4, 470), (CER_X + 6, 400), (CER_X + 2, 360)], (16, 13, 10, 8))
volumen(lz, CT, '#8a5a4a', dens=0.8, brillo=0.25, lapiz='#4a2e22')
lz.lapiz([[(CER_X - 6 + k * 3, 520 - k * 30), (CER_X - 6 + k * 3 + 6, 520 - k * 30)] for k in range(5)], '#c8a090',
         grosor=0.7, presion=0.5)
for pts in ([(CER_X + 2, 380), (CER_X - 40, 330), (CER_X - 60, 300)], [(CER_X + 4, 370), (CER_X + 46, 320), (CER_X + 70, 300)],
            [(CER_X + 2, 362), (CER_X + 4, 300), (CER_X - 4, 260)]):
    lz.aguada(Trazo(pts, (8, 5, 2)), '#8a5a4a', dens=0.8, tapa=1, irreg=0.3)
CC = Circulos([(CER_X, 300, 70), (CER_X - 60, 320, 46), (CER_X + 62, 316, 48), (CER_X - 30, 262, 46), (CER_X + 34, 258, 46)])
lz.aguada(CC, '#f4b8c4', dens=0.55, tapa=0.6, borde=0.8, irreg=1.2, flor=2,
          toques=[(CER_X - 40, 260, 40, '#fbe0e4', 0.7), (CER_X + 50, 340, 40, '#e88aa0', 0.6), (CER_X, 330, 30, '#b8d098', 0.4)])
for (x, y) in puntos_dentro(CC, 70, 31, margen=3):
    flor_simple(lz, x, y, rng.uniform(4, 6.5), rng.choice(['#f8c8d4', '#fde8ec', '#f0a0b4']), centro='#c33c4e')
lz.contorno(CC, '#b8687a', grosor=0.8, presion=0.4, cortes=0.45, desfase=0.8)
# petals drifting down from the cherry
for k in range(9):
    x, y = CER_X + 60 + k * 18 + rng.normal(0, 8), 360 + k * 16 + rng.normal(0, 10)
    lz.aguada(Elipse(x, y, 4.5, 2.8, rng.uniform(0, 180)), '#f4a8b8', dens=0.75, irreg=0.3, borde=0.7)

# ------------------------------------------------------------------ planting the little oak (day 27: native species)
# the sapling and its fresh soil
lz.aguada(Elipse(ARB_X, yg(ARB_X) + 2, 30, 7), '#5a3424', dens=0.75, tapa=1, irreg=0.8)
lz.lapiz([spline([(ARB_X, yg(ARB_X)), (ARB_X - 2, yg(ARB_X) - 26), (ARB_X + 2, yg(ARB_X) - 54)])], '#6e4a2a', grosor=2.0,
         presion=0.8)
for (dy, a) in ((-20, -150), (-30, -30), (-40, -140), (-50, -40), (-56, -95)):
    hoja(lz, ARB_X + (2 if a > -90 else -2), yg(ARB_X) + dy, 15, a, '#7aa24a', ancho=0.48, toque='#b8c85a')

# the granddaughter, standing, tilting a watering can over it
GN = (1085, yg(1085))
for (hip, kn, an) in (((1080, 438), (1074, 490), (1070, GN[1] - 6)), ((1098, 438), (1104, 490), (1108, GN[1] - 6))):
    miembro(lz, [hip, kn, an], (18, 15, 12), 'piel2', lado=1, lapiz=PIEL_LP)
for x in (1066, 1112):
    z = Elipse(x + 4, GN[1] - 2, 13, 6.5)
    lz.aguada(z, '#3f8f94', dens=0.8, tapa=1, irreg=0.3)
    lz.contorno(z, '#2a5a5e', grosor=0.7, presion=0.55)
vest = [(1068, 344), (1110, 342), (1122, 380), (1134, 430), (1138, 452), (1052, 452), (1056, 420), (1060, 380)]
prenda(lz, vest, '#8d73b0', luz=(-0.6, -1), pliegues=[[(1076, 390), (1070, 446)], [(1100, 392), (1110, 446)]])
for (x, y) in puntos_dentro(Poligono(vest), 12, 3, margen=5):
    flor_simple(lz, x, y, 3.6, rng.choice(['#fff3e0', ORO, '#f6a5b5']), centro=CARMIN)
miembro(lz, [(1070, 352), (1060, 392), (1076, 420)], (14, 12, 10), 'piel2', lado=1, lapiz=PIEL_LP)
cuello(lz, (1090, 306), 34, (1090, 346), piel='piel2', ancho=0.42)
cara(lz, 1090, 306, 34, piel='piel2', pelo='#b0582e', peinado='trenza', giro=0.5, ang=12, ojos='abiertos',
     mira=(1, 1), boca='sonrisa', pecas=True, adorno=ORO, semilla=27)
# the watering can (green tin), held with both hands, spout toward the sapling
reg = Poligono([(1112, 392), (1150, 386), (1156, 420), (1118, 426)])
volumen(lz, reg, '#5f9c6a', dens=0.8, brillo=0.4, lapiz='#2f5a3a')
lz.aguada(Trazo([(1152, 410), (1172, 418), (1180, 436)], (6, 5, 4)), '#5f9c6a', dens=0.8, tapa=1, irreg=0.2)
lz.contorno(Trazo([(1152, 410), (1172, 418), (1180, 436)], (6, 5, 4)), '#2f5a3a', grosor=0.6, presion=0.5)
lz.lapiz([arco(1130, 386, 16, 14, 180, 360, 14)], '#2f5a3a', grosor=1.6, presion=0.8)
mano(lz, 1084, 420, -10, 22, 'piel2', 'agarra', lado=1)
miembro(lz, [(1106, 352), (1118, 368), (1124, 382)], (14, 12, 10), 'piel2', lado=-1, lapiz=PIEL_LP)
mano(lz, 1124, 382, -30, 21, 'piel2', 'agarra', lado=-1)
for k in range(12):
    x, y = 1180 + rng.normal(0, 4) - k * 0.6, 446 + k * 7 + rng.normal(0, 2)
    lz.aguada(Elipse(x, y, 2.2, 3.2), '#6fb8d8', dens=0.8, irreg=0.2, borde=0.8)

# the grandfather, kneeling, pressing the soil around the sapling with both hands
lz.aguada(Elipse(1265, yg(1265) + 4, 90, 10), '#8a6a4a', dens=0.25, suave=6)
pant = [(1230, 460), (1286, 456), (1300, 500), (1306, yg(1300) - 4), (1258, yg(1258) - 2), (1214, yg(1214) - 2),
        (1222, 500)]
prenda(lz, pant, '#6a7aa8', luz=(-0.6, -1), pliegues=[[(1240, 500), (1226, 530)], [(1270, 490), (1290, 530)]])
bota = Elipse(1318, yg(1318) - 8, 18, 9, -10)
lz.aguada(bota, '#6e4a2a', dens=0.85, tapa=1, irreg=0.3)
lz.contorno(bota, '#3e2a1e', grosor=0.7, presion=0.55)
cam = [(1222, 362), (1264, 354), (1292, 388), (1296, 440), (1290, 470), (1228, 474), (1214, 430)]
prenda(lz, cam, '#d8a03a', luz=(-0.6, -1), pliegues=[[(1240, 400), (1236, 460)], [(1270, 400), (1276, 460)]])
lz.rayado(Poligono(cam), '#a8702a', angulo=0, sep=9, presion=0.3, grosor=0.7)      # a checked shirt
lz.rayado(Poligono(cam), '#a8702a', angulo=90, sep=9, presion=0.3, grosor=0.7)
cuello(lz, (1222, 330), 38, (1236, 362), piel='piel4', ancho=0.48)
cara(lz, 1222, 330, 38, piel='piel4', pelo='#3a2a24', peinado='corto', canas=True, barba='#c8c0b8', giro=-0.55,
     ang=24, ojos='cerrados', boca='sonrisa', semilla=13)
# a straw hat
som = Poligono([(1176, 300), (1200, 288), (1240, 284), (1268, 296), (1252, 304), (1196, 312)])
copa_h = Poligono([(1198, 292), (1204, 268), (1232, 262), (1244, 286)])
for f_ in (som, copa_h):
    volumen(lz, f_, '#e8c878', dens=0.75, brillo=0.3, lapiz='#8a6a2a')
lz.aguada(Trazo([(1200, 287), (1242, 283)], (5, 5)), CARMIN, dens=0.85, tapa=1)
lz.rayado(som | copa_h, '#b8984a', angulo=20, sep=3, presion=0.3, grosor=0.6)
# arms reaching down to the soil
miembro(lz, [(1236, 372), (1200, 430), (1184, yg(1184) - 14)], (22, 18, 15), '#d8a03a', lado=1, pliegues=2)
mano(lz, 1184, yg(1184) - 14, 130, 30, 'piel4', 'abierta', lado=-1)
miembro(lz, [(1262, 378), (1222, 440), (1196, yg(1196) - 8)], (22, 18, 15), '#d8a03a', lado=-1, pliegues=2)
mano(lz, 1196, yg(1196) - 8, 110, 30, 'piel4', 'abierta', lado=-1)

# ------------------------------------------------------------------ small lives with intention
abeja(250, 470, 1.4, 10)
abeja(1290, 470, 1.3, -10)
mariposa(300, 430, 1.4, '#e8735e', '#f0c25e', 15)
mariposa(845, 470, 1.2, '#5f86c0', '#bcd9e0', -20)
pajaro(lz, 880, 150, 16, TEAL, ang=-15)
pajaro(lz, 940, 120, 12, ORO, ang=-25)

lz.vineta(margen=26)
lz.guardar(SALIDA)
print('ok', SALIDA)
