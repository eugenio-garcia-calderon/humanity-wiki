"""
Mes 4 -- Bosque y Naturaleza -- Diseño 4.

Idea: "we are part of the forest, not its owners". A slice of forest floats on
the paper, seen in section. Above: an old holm oak where a hoopoe feeds its
chicks in a hole in the trunk and a girl hangs upside down from a branch by
her knees, laughing; a young cherry in blossom; and a grandfather kneeling to
plant a little oak while his granddaughter waters it. Below, in a shallow
slice of warm soil that fades into the paper: roots, a worm, and the golden
mycelium that joins every tree to every other. The newly planted oak's first
rootlets are receiving the gold: the forest has taken it in.

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
from acuarela import cuello_natural

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
# ------------------------------------------------------------------ the slice of earth: shallow, warm, fading into the paper
top = [(x, yg(x)) for x in np.linspace(X0, X1, 60)]
bottom = [(X1 - 10, 600), (1240, 650), (1060, 690), (860, 708), (660, 704), (460, 690), (300, 660), (190, 620),
          (X0 + 4, 580)]
SUELO = Poligono(top + bottom, suave=True)
lz.aguada(SUELO, '#c48a54', dens=0.85, tapa=1, borde=0.5, gran=0.7, var=0.5, irreg=1.6,
          toques=[(400, 610, 120, '#a8643a', 0.6), (900, 640, 140, '#b0703e', 0.6), (1150, 610, 90, '#d8a060', 0.6),
                  (650, 600, 100, '#9a5a34', 0.6)],
          desvanece=(740, 600, 740, 712))
# strata: a dark humus band on top, then ochre and sienna layers like a cut bank
HUMUS = Poligono(top + [(x, yg(x) + 24 + 5 * math.sin(x / 31.0)) for x in np.linspace(X1, X0, 50)], suave=False)
lz.aguada(HUMUS & SUELO, '#5a3424', dens=0.65, borde=0.6, gran=0.6, irreg=1.2)
for k, (dy, col) in enumerate(((48, '#e0b070'), (78, '#a8603a'))):
    capa = Poligono([(x, yg(x) + dy + 6 * math.sin(x / 47.0 + k)) for x in np.linspace(X0, X1, 50)]
                    + [(x, yg(x) + dy + 16 + 5 * math.sin(x / 39.0 + k * 2)) for x in np.linspace(X1, X0, 50)], suave=False)
    lz.aguada(capa & SUELO, col, dens=0.35, irreg=1.4, borde=0.5, gran=0.6, desvanece=(740, 620, 740, 700))
lz.rayado(SUELO, '#8a5030', angulo=6, sep=8, presion=0.18, largo=24, desvanece=(740, 560, 740, 690))
lz.contorno(SUELO, '#6e4630', grosor=1.0, presion=0.55, cortes=0.35, desfase=0.8,
            solo=(X0 - 20, 400, X1 + 20, 590))
for (x, y) in puntos_dentro(SUELO, 34, 7, margen=10):
    if y < yg(x) + 34 or y > 665:
        continue
    if rng.random() < 0.7:
        e = Elipse(x, y, rng.uniform(3, 7), rng.uniform(2, 4.5), rng.uniform(0, 180))
        volumen(lz, e, rng.choice(['#b8aa98', '#d8c8b0', '#a89a8a', '#c9b49a']), dens=0.6, brillo=0.3, lapiz='#6e5e50')
    else:
        lz.aguada(Elipse(x, y, 3.2, 2.2, rng.uniform(0, 180)), '#7a4a2a', dens=0.85, irreg=0.2)

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
    f = f & SUELO
    lz.aguada(f, col, dens=0.75, tapa=0.8, irreg=0.4, borde=0.6, gran=0.4, toques=[(*pts[0], w * 2, '#c8905a', 0.5)])
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


puntas = []
for k, (ang, L, w) in enumerate(((160, 110, 22), (132, 95, 26), (104, 80, 26), (76, 85, 24), (44, 105, 22),
                                 (172, 90, 13), (10, 100, 13))):
    puntas += raiz((TRONCO_X + (k - 3) * 9, yg(TRONCO_X) + 6), ang, L, w, sem=10 + k)
CER_X = 950
for k, (ang, L, w) in enumerate(((150, 90, 14), (110, 90, 16), (70, 90, 16), (30, 90, 14))):
    puntas += raiz((CER_X + (k - 1.5) * 6, yg(CER_X) + 4), ang, L, w, sem=40 + k, col='#8a5a3a')
# the little oak: a pale taproot and fine rootlets (they are about to receive the gold)
ARB_X = 1168
yA = yg(ARB_X)
RAIZ_A = [(ARB_X, yA + 4), (ARB_X - 3, yA + 24), (ARB_X + 4, yA + 46), (ARB_X - 2, yA + 70)]
lz.lapiz([spline(RAIZ_A)], '#f2e6cc', grosor=2.0, presion=0.85)
raicillas = []
for k, t in enumerate(np.linspace(0.25, 0.95, 6)):
    p0 = spline(RAIZ_A)[int(t * (len(spline(RAIZ_A)) - 1))]
    sd = 1 if k % 2 else -1
    raicillas.append(np.array([p0, p0 + (sd * 10, 4), p0 + (sd * 20 + rng.normal(0, 3), 10)]))
lz.lapiz([spline(r_) for r_ in raicillas], '#f2e6cc', grosor=1.0, presion=0.7)
TIPS_A = [tuple(r_[-1]) for r_ in raicillas] + [(ARB_X - 2, yA + 70)]

# ------------------------------------------------------------------ the mycelium: a fine, dense, luminous net joining the trees
rngm = np.random.default_rng(12)
hilos = []
dentro = lambda x, y: y > yg(x) + 14 and y < 690 and X0 + 30 < x < X1 - 30


def hifa(a, b, jit=12):
    """A wandering fungal thread from a to b."""
    m1 = ((a[0] * 2 + b[0]) / 3 + rngm.normal(0, jit), (a[1] * 2 + b[1]) / 3 + rngm.normal(0, jit) + 8)
    m2 = ((a[0] + b[0] * 2) / 3 + rngm.normal(0, jit), (a[1] + b[1] * 2) / 3 + rngm.normal(0, jit) + 8)
    p = bezier(a, m1, m2, b, 60)
    p = np.array([q for q in p if dentro(*q)])
    if len(p) > 4:
        hilos.append(p)
    return p


P = [q for q in puntas if dentro(*q)]
for i, q in enumerate(P):
    d = sorted(range(len(P)), key=lambda j: (P[j][0] - q[0]) ** 2 + (P[j][1] - q[1]) ** 2)
    for j in d[1:4]:
        if (P[j][0] - q[0]) ** 2 + (P[j][1] - q[1]) ** 2 < 130 ** 2:
            hifa(q, P[j])
oak = [q for q in P if q[0] < 800]
cer = [q for q in P if q[0] >= 800]
# three long threads from the oak to the cherry, three from the cherry to the little oak's rootlets
for k in range(3):
    hifa(oak[-1 - k * 2] if len(oak) > k * 2 else oak[-1], cer[k] if len(cer) > k else cer[0], jit=18)
cer.sort(key=lambda q: q[0])
for k in range(4):
    hifa(cer[-1 - (k % 2)], TIPS_A[k], jit=14)
# a fine fuzz of hyphae everywhere along the threads
for h in list(hilos):
    for j in range(6, len(h) - 6, 9):
        a = rngm.uniform(0, 2 * math.pi)
        L = rngm.uniform(6, 16)
        q = (h[j][0] + math.cos(a) * L, h[j][1] + math.sin(a) * L)
        if dentro(*q):
            hilos.append(np.array([h[j], ((h[j][0] + q[0]) / 2 + rngm.normal(0, 2), (h[j][1] + q[1]) / 2), q]))
largos = [h for h in hilos if len(h) > 8]
lz.lapiz(hilos, '#6a3a1e', grosor=1.3, presion=0.35, temblor=0.12)
lz.lapiz(hilos, '#e8a830', grosor=0.85, presion=0.9, temblor=0.12)
lz.lapiz(largos, '#fff2b8', grosor=0.45, presion=0.85, temblor=0.12)
for h in largos[::2]:
    lz.luz(Trazo(h[::5], (3, 2)), '#ffd870', fuerza=0.12, suave=2)
for q in P + TIPS_A:
    lz.gouache(Elipse(*q, 1.6), '#fff4c0', alfa=0.9, irreg=0)
    lz.luz((q[0], q[1], 5), '#ffe2a0', fuerza=0.3)
for q in TIPS_A:                 # the little oak lights up where the gold reaches it
    lz.luz((q[0], q[1], 12), '#ffe6a8', fuerza=0.55)

# ------------------------------------------------------------------ one worm (day 11)
def lombriz(pts, w=5.5):
    f = Trazo(pts, (w * 0.8, w, w, w * 0.7))
    lz.aguada(f, '#e0907a', dens=0.75, tapa=1, irreg=0.3, toques=[(*pts[1], 10, '#c86a6a', 0.6)])
    lz.contorno(f, '#8a4a3a', grosor=0.6, presion=0.55, cortes=0.1, desfase=0.1)
    q = remuestrea(spline(pts), 4)
    for j in range(1, len(q) - 1):
        d = q[j + 1] - q[j - 1]
        n = np.array([-d[1], d[0]]) / (np.hypot(*d) + 1e-9)
        lz.lapiz([[q[j] - n * w * 0.45, q[j] + n * w * 0.45]], '#a85a4a', grosor=0.45, presion=0.4)


lombriz([(780, 640), (806, 628), (830, 644), (860, 636), (884, 648)], 6)

# ------------------------------------------------------------------ the ground line: grass, a few varied wild flowers, mushrooms
for x in np.arange(X0 + 6, X1 - 6, 6.0):
    if rng.random() < 0.2:
        continue
    b0 = (x, yg(x) + 2)
    L = rng.uniform(6, 16)
    a = math.radians(-90 + rng.normal(0, 18))
    blade = Poligono([(x - 2, b0[1]), (x + math.cos(a) * L, b0[1] + math.sin(a) * L), (x + 2, b0[1])], suave=False)
    lz.aguada(blade, rng.choice(['#5f8f63', '#7aa25a', '#3f7a6a', '#8ab05a']), dens=0.8, irreg=0.2, borde=0.4, tapa=0.5)
for (x, s_) in ((420, 1.0), (436, 0.7)):
    y = yg(x)
    pie = Trazo([(x, y + 2), (x + 1, y - 16 * s_)], (8 * s_, 6 * s_))
    lz.aguada(pie, '#f2e6cc', dens=0.5, tapa=1, irreg=0.2)
    lz.contorno(pie, '#8a6a4a', grosor=0.6, presion=0.5)
    som = Poligono([(x - 14 * s_, y - 13 * s_), (x - 10 * s_, y - 24 * s_), (x + 2 * s_, y - 28 * s_),
                    (x + 13 * s_, y - 22 * s_), (x + 15 * s_, y - 13 * s_)])
    volumen(lz, som, '#9a5a2e', dens=0.8, brillo=0.35, lapiz='#5a3420')
hifa((428, yg(428) + 4), P[0] if P else (420, 620), jit=6)
lz.lapiz([hilos[-1]], '#e8a830', grosor=0.85, presion=0.9)
lz.lapiz([hilos[-1]], '#fff0b8', grosor=0.4, presion=0.8)


def amapola(x, h):
    lz.lapiz([bezier((x, yg(x)), (x + 3, yg(x) - h / 2), (x + 1, yg(x) - h), n=12)], '#5f7f45', grosor=0.9, presion=0.65)
    for k in range(4):
        a = math.radians(k * 90 + 20)
        lz.aguada(Elipse(x + 1 + math.cos(a) * 4, yg(x) - h + math.sin(a) * 4, 6, 4.5, k * 90 + 20), '#d8402e', dens=0.8,
                  irreg=0.4, borde=0.8, tapa=0.7)
    lz.aguada(Elipse(x + 1, yg(x) - h, 2.2), '#2a1a14', dens=0.9)


def margarita(x, h):
    lz.lapiz([bezier((x, yg(x)), (x - 2, yg(x) - h / 2), (x, yg(x) - h), n=12)], '#5f7f45', grosor=0.8, presion=0.6)
    for k in range(10):
        a = math.radians(k * 36)
        lz.aguada(Trazo([(x, yg(x) - h), (x + math.cos(a) * 7, yg(x) - h + math.sin(a) * 5)], (2.4, 2.0)), '#fffaf0',
                  dens=0.5, tapa=0.9, irreg=0.1)
        lz.lapiz([[(x, yg(x) - h), (x + math.cos(a) * 7, yg(x) - h + math.sin(a) * 5)]], '#c8b8a0', grosor=0.3, presion=0.4)
    lz.aguada(Elipse(x, yg(x) - h, 2.4), '#f0c03a', dens=0.9)


def espliego(x, h):
    lz.lapiz([[(x, yg(x)), (x + 2, yg(x) - h)]], '#6f8a5a', grosor=0.8, presion=0.6)
    for k in range(6):
        lz.aguada(Elipse(x + 2 - k * 0.2, yg(x) - h + k * 3.4, 2.4, 1.8), '#8d73b0', dens=0.85, irreg=0.2)


def aciano(x, h):
    lz.lapiz([[(x, yg(x)), (x - 2, yg(x) - h)]], '#6f8a5a', grosor=0.8, presion=0.6)
    for k in range(7):
        a = math.radians(-160 + k * 23)
        lz.aguada(Trazo([(x - 2, yg(x) - h), (x - 2 + math.cos(a) * 7, yg(x) - h + math.sin(a) * 7)], (1.8, 3)),
                  '#4f78c8', dens=0.85, irreg=0.2)


for (f_, x, h) in ((amapola, 196, 34), (margarita, 214, 22), (espliego, 232, 30), (aciano, 252, 26), (amapola, 274, 40),
                   (margarita, 296, 18), (espliego, 1236, 32), (amapola, 1258, 38), (margarita, 1280, 24), (aciano, 1300, 28)):
    f_(x, h)

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



# ------------------------------------------------------------------ the girl's shins hang BEHIND the branch (drawn before the tree)
KN = (436, 316)                       # her knees, hooked over the top of the branch
for (dx, col) in ((-4, '#d8604e'), (6, '#e8735e')):
    miembro(lz, [(KN[0] + dx, KN[1] + 2), (KN[0] + dx - 10, KN[1] + 34), (KN[0] + dx - 18, KN[1] + 62)], (20, 16, 12),
            'piel3', lado=1, lapiz=PIEL_LP)
    z = Elipse(KN[0] + dx - 22, KN[1] + 72, 7, 12, 10)
    lz.aguada(z, '#5f86c0', dens=0.8, tapa=1, irreg=0.3)
    lz.contorno(z, '#2f4a7a', grosor=0.7, presion=0.55)

# ------------------------------------------------------------------ the holm oak
TR = [(TRONCO_X - 30, yg(TRONCO_X) + 4), (TRONCO_X - 18, 470), (TRONCO_X - 22, 400), (TRONCO_X - 10, 330)]
TR2 = [(TRONCO_X + 32, yg(TRONCO_X) + 4), (TRONCO_X + 24, 470), (TRONCO_X + 26, 400), (TRONCO_X + 18, 330)]
TRONCO = Poligono(TR + [(TRONCO_X + 4, 300)] + TR2[::-1], suave=True)
RAMA_I = Trazo([(TRONCO_X - 8, 360), (480, 334), (400, 326), (318, 330)], (34, 26, 18, 10))      # the hanging branch
RAMA_D = Trazo([(TRONCO_X + 10, 345), (640, 300), (700, 250)], (30, 22, 12))
RAMA_C = Trazo([(TRONCO_X, 320), (552, 250), (566, 190)], (34, 24, 14))
CORTEZA = TRONCO | RAMA_I | RAMA_D | RAMA_C
volumen(lz, CORTEZA, '#7a5a44', dens=0.8, luz=(-0.6, -0.8), brillo=0.25, lapiz='#3e2a1e',
        toques=[(TRONCO_X - 20, 420, 30, '#9a7a5a', 0.6), (TRONCO_X + 20, 500, 30, '#5a3e2e', 0.6)])
cor = []
for k in range(14):
    x = TRONCO_X - 22 + k * 3.4 + rng.normal(0, 1)
    y0 = rng.uniform(340, 470)
    cor.append(spline([(x, y0), (x + rng.normal(0, 2), y0 + 20), (x + rng.normal(0, 2), y0 + 44)]))
lz.lapiz(cor, '#3e2a1e', grosor=0.8, presion=0.5, temblor=0.4, cortes=0.3)
# the hoopoes' nest: a hole in the trunk, two chicks with open beaks
HUECO = (TRONCO_X + 4, 440)
lz.aguada(Elipse(*HUECO, 13, 17), '#2a1a12', dens=0.9, tapa=1, irreg=0.3)
lz.lapiz([arco(*HUECO, 15, 19, 0, 360, 30)], '#5a3e2e', grosor=1.0, presion=0.6)
for (dx, a) in ((-4, -110), (5, -70)):
    lz.aguada(Elipse(HUECO[0] + dx, HUECO[1] + 4, 5, 5), '#b8a090', dens=0.8, tapa=1)
    lz.aguada(Poligono([(HUECO[0] + dx - 2, HUECO[1] + 1), (HUECO[0] + dx + 6 * math.cos(math.radians(a)), HUECO[1] + 1 + 9 * math.sin(math.radians(a))),
                        (HUECO[0] + dx + 2, HUECO[1] + 1)], suave=False), '#f0c060', dens=0.9, tapa=1)

# the crown: irregular masses of dark grey-green, lit on the upper left
def masa(cx, cy, r, sem):
    rr_ = np.random.default_rng(sem)
    ang_ = np.linspace(0, 2 * math.pi, 28, endpoint=False)
    rad_ = r * (1 + 0.16 * np.sin(ang_ * 3 + rr_.uniform(0, 6)) + 0.1 * np.sin(ang_ * 7 + rr_.uniform(0, 6))
                + rr_.normal(0, 0.05, len(ang_)))
    return Poligono(np.stack([cx + np.cos(ang_) * rad_, cy + np.sin(ang_) * rad_ * 0.8], 1))


MASAS = [(560, 160, 118, '#4e6852'), (430, 220, 86, '#3e5a48'), (690, 210, 94, '#455e4c'), (360, 278, 56, '#3a5444'),
         (770, 268, 64, '#3a5444'), (500, 102, 78, '#5e765a'), (640, 98, 76, '#5a7258'), (560, 262, 84, '#344c40'),
         (440, 300, 46, '#344c40')]
COPA = None
for k, (cx_, cy_, r_, col) in enumerate(sorted(MASAS, key=lambda m: m[1])):
    f_ = masa(cx_, cy_, r_, 70 + k)
    COPA = f_ if COPA is None else COPA | f_
for k, (cx_, cy_, r_, col) in enumerate(sorted(MASAS, key=lambda m: -m[1])):
    f_ = masa(cx_, cy_, r_, 70 + k)
    lz.aguada(f_, col, dens=0.9, tapa=0.85, borde=0.8, gran=0.55, irreg=1.2, var=0.5,
              toques=[(cx_ - r_ * 0.35, cy_ - r_ * 0.35, r_ * 0.6, '#8a9a6a', 0.6),
                      (cx_ + r_ * 0.4, cy_ + r_ * 0.4, r_ * 0.5, '#24382e', 0.6)])
    lz.contorno(f_, '#24382e', grosor=0.7, presion=0.4, cortes=0.5, desfase=0.6,
                solo=(cx_ - r_, cy_, cx_ + r_ * 1.2, cy_ + r_))


def hoja_encina(x, y, L, ang, col):
    """A holm-oak leaf: small, leathery, oval, faintly toothed, grey-green."""
    a = math.radians(ang)
    d = np.array([math.cos(a), math.sin(a)])
    n = np.array([-d[1], d[0]])
    t = np.linspace(0, 1, 9)
    w = np.sin(np.pi * t) ** 0.7 * L * 0.32
    dient = 1 + 0.15 * (np.arange(9) % 2)
    izq = np.array([x, y]) + d * (t * L)[:, None] + n * (w * dient)[:, None]
    der = np.array([x, y]) + d * (t * L)[:, None] - n * (w * dient[::-1])[:, None]
    f = Poligono(np.vstack([izq, der[::-1]]), suave=False)
    lz.aguada(f, col, dens=0.85, tapa=0.8, irreg=0.2, borde=0.7, gran=0.2)
    lz.lapiz([[(x, y), (x + d[0] * L * 0.9, y + d[1] * L * 0.9)]], '#c8d0b8', grosor=0.35, presion=0.4)


from skimage import measure as _ms
import cv2 as _cv
_m = np.zeros((900, 1500), np.uint8)
for (cx_, cy_, r_, col) in MASAS:
    _cv.ellipse(_m, (int(cx_), int(cy_)), (int(r_ * 0.98), int(r_ * 0.78)), 0, 0, 360, 255, -1)
_c = max(_ms.find_contours(_m.astype(float), 128), key=len)
for (yy, xx) in _c[::9]:
    a = math.degrees(math.atan2(yy - 200, xx - 560)) + rng.normal(0, 30)
    luzc = (xx - 560) * -0.6 + (yy - 200) * -0.8
    hoja_encina(xx, yy, rng.uniform(11, 15), a, rng.choice(['#8a9a6a', '#6a8460']) if luzc > 40 else
                rng.choice(['#3e5a48', '#2e4a3c', '#4e6852']))
for (x, y) in puntos_dentro(COPA, 60, 9, margen=12):
    luzc = (x - 560) * -0.6 + (y - 200) * -0.8
    hoja_encina(x, y, rng.uniform(9, 12), rng.uniform(0, 360), rng.choice(['#9aa878', '#7a9068']) if luzc > 50 else
                rng.choice(['#2e4a3c', '#3e5a48']))
for (x, y) in puntos_dentro(COPA, 16, 21, margen=14):      # acorns
    lz.aguada(Elipse(x, y + 3, 3.4, 5), '#b8843a', dens=0.85, tapa=1, irreg=0.2)
    lz.aguada(Elipse(x, y - 1, 3.8, 2.4), '#6e4a2a', dens=0.9, tapa=1, irreg=0.2)
lz.luz((500, 100, 80), '#ffe6a0', fuerza=0.3)

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


abubilla(TRONCO_X + 46, 418, 1.7)
# musical breath of the birds: tiny pencil notes would be letters -- instead, little curls of song
for (x, y) in ((TRONCO_X + 80, 390),):
    lz.lapiz([arco(x + k * 10, y - k * 8, 4 + k, 3 + k, 200, 340, 10) for k in range(3)], '#c8603a', grosor=0.6,
             presion=0.5)


# ------------------------------------------------------------------ the girl hanging upside down by her knees
# thighs rise from her hips to the knees hooked over the branch (in front of it)
HIP = (448, 382)
for (dx, col) in ((-5, '#d8604e'), (5, '#e8735e')):
    miembro(lz, [(HIP[0] + dx, HIP[1]), (KN[0] + dx + 4, (HIP[1] + KN[1]) / 2), (KN[0] + dx, KN[1] - 2)], (24, 21, 17),
            col, lado=-1, pliegues=1)
lz.aguada(Elipse(KN[0], KN[1] - 2, 16, 9), '#e8735e', dens=0.8, tapa=1)                  # knees over the top
lz.contorno(Elipse(KN[0], KN[1] - 2, 16, 9), '#8a3a30', grosor=0.7, presion=0.5)
peto = [(426, 376), (470, 376), (468, 410), (462, 440), (432, 440), (426, 410)]
prenda(lz, peto, '#e8735e', luz=(-0.6, -1), pliegues=[[(438, 386), (436, 434)], [(458, 386), (460, 434)]])
lz.gouache(Elipse(436, 428, 3), '#fff3e0', alfa=0.9, irreg=0)
lz.gouache(Elipse(458, 428, 3), '#fff3e0', alfa=0.9, irreg=0)
camis = [(430, 436), (466, 436), (474, 466), (470, 486), (426, 488), (420, 466)]
prenda(lz, camis, ORO, luz=(-0.6, -1), pliegues=[[(436, 448), (444, 478)], [(462, 450), (458, 480)]])
for (u, v) in ((432, 450), (452, 458), (440, 476), (462, 476)):
    lz.gouache(Elipse(u, v, 2.2), '#fff3e0', alfa=0.9, irreg=0)
pelo = Poligono([(422, 514), (474, 514), (484, 560), (472, 590), (458, 574), (448, 596), (434, 574), (420, 588), (412, 556)])
lz.aguada(pelo, '#6a3a22', dens=0.8, tapa=1, irreg=0.6, borde=0.8, toques=[(446, 552, 16, '#a8603a', 0.6)])
lz.lapiz([spline([(422 + k * 6, 520), (420 + k * 6.3, 556), (416 + k * 6.6, 584)]) for k in range(9)], '#4a2416',
         grosor=0.6, presion=0.45, temblor=0.3)
cuello(lz, (448, 516), 28, (448, 488), piel='piel3', ancho=0.45)
cara(lz, 448, 516, 28, piel='piel3', pelo='#6a3a22', peinado='calvo', orejas=True, giro=-0.2, ang=180,
     ojos='abiertos', mira=(0, 1), boca='risa', semilla=41)
miembro(lz, [(428, 478), (400, 506), (384, 540)], (14, 12, 10), 'piel3', lado=1, lapiz=PIEL_LP)
mano(lz, 384, 540, 112, 20, 'piel3', 'abierta', lado=1)
miembro(lz, [(468, 478), (494, 504), (504, 536)], (14, 12, 10), 'piel3', lado=-1, lapiz=PIEL_LP)
mano(lz, 504, 536, 72, 20, 'piel3', 'abierta', lado=-1)

# ------------------------------------------------------------------ the young cherry in blossom
CT = Trazo([(CER_X, yg(CER_X) + 2), (CER_X - 4, 480), (CER_X + 4, 420), (CER_X + 2, 380)], (17, 14, 11, 9))
volumen(lz, CT, '#8a5a4a', dens=0.8, brillo=0.25, lapiz='#4a2e22')
lz.lapiz([[(CER_X - 6, 520 - k * 30), (CER_X + 2, 520 - k * 30)] for k in range(5)], '#c8a090', grosor=0.7, presion=0.5)
RAMAS_C = [[(CER_X + 2, 392), (CER_X - 26, 352), (CER_X - 58, 330), (CER_X - 80, 322)],
           [(CER_X - 26, 352), (CER_X - 34, 316), (CER_X - 30, 282)],
           [(CER_X + 3, 384), (CER_X + 30, 344), (CER_X + 62, 318), (CER_X + 82, 312)],
           [(CER_X + 30, 344), (CER_X + 40, 300), (CER_X + 34, 268)],
           [(CER_X + 2, 382), (CER_X + 6, 330), (CER_X - 2, 270), (CER_X + 6, 246)]]
for k, pts in enumerate(RAMAS_C):
    lz.aguada(Trazo(pts, (9 if k in (0, 2, 4) else 6, 5, 3, 1.5)[:len(pts)]), '#7a4a3a', dens=0.85, tapa=1, irreg=0.3)
    lz.contorno(Trazo(pts, (9 if k in (0, 2, 4) else 6, 5, 3, 1.5)[:len(pts)]), '#4a2e22', grosor=0.5, presion=0.5)
NUBES_C = [(CER_X - 56, 318, 40), (CER_X + 58, 304, 42), (CER_X - 4, 260, 46), (CER_X - 36, 270, 30), (CER_X + 34, 262, 34),
           (CER_X + 4, 312, 30)]
for k, (x, y, r) in enumerate(NUBES_C):
    f_ = masa(x, y, r, 300 + k)
    lz.aguada(f_, '#f4b8c4', dens=0.5, tapa=0.55, borde=0.8, irreg=1.4,
              toques=[(x - r * 0.4, y - r * 0.4, r * 0.6, '#fde4ea', 0.7), (x + r * 0.3, y + r * 0.4, r * 0.5, '#e88aa0', 0.6)])
    for (fx, fy) in puntos_dentro(f_, int(r * 0.5), 31 + k, margen=3):
        flor_simple(lz, fx, fy, rng.uniform(3.8, 6), rng.choice(['#f8c8d4', '#fde8ec', '#f0a0b4']), centro='#c33c4e')
# a few twigs show between the blossom
for pts in ([(CER_X - 30, 300), (CER_X - 44, 286)], [(CER_X + 40, 296), (CER_X + 56, 286)], [(CER_X + 2, 290), (CER_X - 6, 276)]):
    lz.lapiz([pts], '#5a3428', grosor=1.6, presion=0.75)
# petals drifting toward the girl
for k in range(9):
    t = k / 8
    x, y = CER_X + 70 + t * 80 + rng.normal(0, 6), 330 - 20 * math.sin(t * 3) + t * 10 + rng.normal(0, 8)
    lz.aguada(Elipse(x, y, 4.5, 2.8, rng.uniform(0, 180)), '#f4a8b8', dens=0.8, irreg=0.3, borde=0.8)

# ------------------------------------------------------------------ planting the little oak (day 27: native species)
lz.aguada(Elipse(ARB_X, yA + 2, 30, 7), '#5a3424', dens=0.75, tapa=1, irreg=0.8)
lz.lapiz([spline([(ARB_X, yA), (ARB_X - 2, yA - 26), (ARB_X + 2, yA - 54)])], '#6e4a2a', grosor=2.0, presion=0.8)


def hoja_roble(x, y, L, ang, col):
    """A lobed oak leaf (the young Quercus: deep round lobes)."""
    a = math.radians(ang)
    d = np.array([math.cos(a), math.sin(a)])
    n = np.array([-d[1], d[0]])
    t = np.linspace(0, 1, 41)
    w = np.sin(np.pi * t) ** 0.6 * L * 0.3 * (0.72 + 0.28 * np.abs(np.cos(t * math.pi * 4.5)))
    izq = np.array([x, y]) + d * (t * L)[:, None] + n * w[:, None]
    der = np.array([x, y]) + d * (t * L)[:, None] - n * w[:, None]
    f = Poligono(np.vstack([izq, der[::-1]]), suave=False)
    lz.aguada(f, col, dens=0.8, tapa=0.9, irreg=0.2, borde=0.8, toques=[(x + d[0] * L * 0.7, y + d[1] * L * 0.7, L * 0.4, '#b8c85a', 0.6)])
    lz.contorno(f, _lapiz_de(col, 0.45), grosor=0.5, presion=0.5, cortes=0.1, desfase=0.1)
    lz.lapiz([[(x, y), (x + d[0] * L * 0.95, y + d[1] * L * 0.95)]], _lapiz_de(col, 0.45), grosor=0.4, presion=0.5)


for (dy, a) in ((-20, -150), (-30, -30), (-40, -140), (-50, -40), (-56, -95)):
    hoja_roble(ARB_X + (2 if a > -90 else -2), yA + dy, 17, a, '#7aa24a')
# the acorn it came from, half buried by the grandfather's hand
lz.aguada(Elipse(1146, yA - 1, 5, 7, 70), '#b8843a', dens=0.85, tapa=1, irreg=0.2)
lz.aguada(Elipse(1140, yA - 3, 4, 5, 70), '#6e4a2a', dens=0.9, tapa=1, irreg=0.2)
lz.aguada(Elipse(1146, yA + 4, 9, 3), '#5a3424', dens=0.8, tapa=1)

# the granddaughter, standing, tilting a watering can over it
GN = (1085, yg(1085))
for (hip, kn, an) in (((1080, 438), (1068, 490), (1058, GN[1] - 6)), ((1098, 438), (1106, 492), (1104, GN[1] - 6))):
    miembro(lz, [hip, kn, an], (18, 15, 12), 'piel2', lado=1, lapiz=PIEL_LP)
for x in (1052, 1106):
    z = Elipse(x + 4, GN[1] - 2, 13, 6.5)
    lz.aguada(z, '#3f8f94', dens=0.8, tapa=1, irreg=0.3)
    lz.contorno(z, '#2a5a5e', grosor=0.7, presion=0.55)
cuello_natural(lz, 1090, 306, 34, 'piel2', (1090, 346), 50, giro=0.5, inclina=12)
vest = [(1068, 344), (1110, 342), (1122, 380), (1134, 430), (1138, 452), (1052, 452), (1056, 420), (1060, 380)]
prenda(lz, vest, '#8d73b0', luz=(-0.6, -1), pliegues=[[(1076, 390), (1070, 446)], [(1100, 392), (1110, 446)]])
for (x, y) in puntos_dentro(Poligono(vest), 12, 3, margen=5):
    flor_simple(lz, x, y, 3.6, rng.choice(['#fff3e0', ORO, '#f6a5b5']), centro=CARMIN)
miembro(lz, [(1070, 352), (1066, 396), (1110, 420)], (14, 12, 10), 'piel2', lado=1, lapiz=PIEL_LP)
cara(lz, 1090, 306, 34, piel='piel2', pelo='#b0582e', peinado='trenza', giro=0.5, ang=12, ojos='abiertos',
     mira=(1, 1), boca='sonrisa', pecas=True, adorno=ORO, semilla=27)
# the watering can (green tin), held with both hands, spout toward the sapling
reg = Poligono([(1112, 392), (1150, 386), (1156, 420), (1118, 426)])
volumen(lz, reg, '#5f9c6a', dens=0.8, brillo=0.4, lapiz='#2f5a3a')
lz.aguada(Trazo([(1152, 410), (1172, 418), (1180, 436)], (6, 5, 4)), '#5f9c6a', dens=0.8, tapa=1, irreg=0.2)
lz.contorno(Trazo([(1152, 410), (1172, 418), (1180, 436)], (6, 5, 4)), '#2f5a3a', grosor=0.6, presion=0.5)
lz.lapiz([arco(1130, 386, 16, 14, 180, 360, 14)], '#2f5a3a', grosor=1.6, presion=0.8)
mano(lz, 1108, 420, -20, 21, 'piel2', 'agarra', lado=1)
miembro(lz, [(1106, 352), (1118, 368), (1124, 382)], (14, 12, 10), 'piel2', lado=-1, lapiz=PIEL_LP)
mano(lz, 1124, 382, -30, 21, 'piel2', 'agarra', lado=-1)
CHORRO = bezier((1180, 436), (1184, 452), (1178, 478), (1172, 506), 20)
lz.aguada(Trazo(CHORRO, (2.5, 4, 5.5)), '#7fc0dc', dens=0.65, tapa=0.5, irreg=0.3, borde=0.9)
lz.gouache(Trazo(CHORRO[2:-4] + (-0.8, 0), (1.0, 0.7)), '#ffffff', alfa=0.8, irreg=0)
lz.luz(Trazo(CHORRO, (6, 8)), '#e8fbff', fuerza=0.3, suave=3)
for (x, y) in ((1164, 508), (1180, 512), (1172, 516)):
    lz.aguada(Elipse(x, y, 2.4, 3.0), '#7fc0dc', dens=0.8, irreg=0.2, borde=0.8)

# the grandfather, on one knee, pressing the soil around the sapling with both hands
yb = yg(1290)
lz.aguada(Elipse(1270, yb + 4, 95, 10), '#8a6a4a', dens=0.25, suave=6)
# back leg: knee on the ground, shin lying back, boot sole up
miembro(lz, [(1292, 462), (1300, yb - 10), (1352, yb - 8)], (32, 26, 20), '#5a6a98', lado=-1, pliegues=2)
bota = Poligono([(1346, yb - 16), (1372, yb - 22), (1378, yb - 6), (1350, yb - 2)])
lz.aguada(bota, '#6e4a2a', dens=0.85, tapa=1, irreg=0.3)
lz.contorno(bota, '#3e2a1e', grosor=0.7, presion=0.55)
# front leg: knee up toward the sapling, foot flat
miembro(lz, [(1278, 458), (1232, 448), (1240, yb - 10)], (34, 27, 21), '#6a7aa8', lado=1, pliegues=3)
bota2 = Poligono([(1222, yb - 14), (1250, yb - 16), (1256, yb), (1214, yb)])
lz.aguada(bota2, '#6e4a2a', dens=0.85, tapa=1, irreg=0.3)
lz.contorno(bota2, '#3e2a1e', grosor=0.7, presion=0.55)
# far arm
miembro(lz, [(1262, 390), (1252, 452), (1214, yg(1214) - 22)], (22, 17, 13), '#c8902a', lado=-1, pliegues=2)
mano(lz, 1214, yg(1214) - 22, 150, 30, 'piel4', 'abierta', lado=1)
# torso leaning forward over the knee
cam = [(1226, 372), (1262, 360), (1296, 384), (1306, 430), (1300, 470), (1262, 474), (1240, 440), (1222, 404)]
prenda(lz, cam, '#d8a03a', luz=(-0.6, -1), pliegues=[[(1250, 400), (1262, 450)], [(1280, 398), (1290, 456)]])
lz.rayado(Poligono(cam), '#a8702a', angulo=10, sep=9, presion=0.3, grosor=0.7)      # a checked shirt
lz.rayado(Poligono(cam), '#a8702a', angulo=100, sep=9, presion=0.3, grosor=0.7)
cuello(lz, (1214, 352), 38, (1232, 382), piel='piel4', ancho=0.48)
cara(lz, 1214, 352, 38, piel='piel4', pelo='#3a2a24', peinado='corto', canas=True, barba='#c8c0b8', giro=-0.6,
     ang=30, ojos='cerrados', boca='sonrisa', semilla=13)
# a straw hat
HX, HY = 1218, 318
som = Poligono([(HX - 46, HY + 4), (HX - 20, HY - 10), (HX + 20, HY - 12), (HX + 50, HY + 2), (HX + 32, HY + 10),
                (HX - 24, HY + 14)])
copa_h = Poligono([(HX - 22, HY - 6), (HX - 14, HY - 32), (HX + 14, HY - 36), (HX + 24, HY - 8)])
for f_ in (som, copa_h):
    volumen(lz, f_, '#e8c878', dens=0.75, brillo=0.3, lapiz='#8a6a2a')
lz.aguada(Trazo([(HX - 20, HY - 9), (HX + 22, HY - 11)], (6, 6)), CARMIN, dens=0.85, tapa=1)
lz.rayado(som | copa_h, '#b8984a', angulo=20, sep=3, presion=0.3, grosor=0.6)
# near arm, hand pressing the soil
miembro(lz, [(1240, 392), (1232, 462), (1188, yg(1188) - 18)], (23, 18, 13), '#d8a03a', lado=1, pliegues=2)
lz.aguada(Trazo([(1200, yg(1200) - 26), (1192, yg(1192) - 20)], (15, 15)), '#b8802a', dens=0.8, tapa=1)
mano(lz, 1190, yg(1190) - 18, 125, 31, 'piel4', 'abierta', lado=-1)


# ------------------------------------------------------------------ small lives with intention
abeja(214, 488, 2.0, 10)
mariposa(300, 440, 1.5, '#e8735e', '#f0c25e', 15)

lz.vineta(margen=26)
lz.guardar(SALIDA)
print('ok', SALIDA)
