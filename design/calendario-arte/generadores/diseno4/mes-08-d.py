"""
Mes 8 -- Salud y Bienestar -- Diseño 4.

Idea: a summer dawn. A tree whose crown IS a brain: its folds are branches,
and at every fork a neuron lights up. Its brainstem goes down into the
earth as the trunk. From that trunk hangs a hammock where a young man
sleeps; his dream rises as a thread of little lights into the crown and
switches on new connections (sleeping fixes what we learned). Below, a
grandfather and his grandson walk barefoot on the grass, hand in hand,
talking; by the water a woman stretches toward the rising sun, and
someone swims far off.

    python3 mes-08-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, rgb, _lapiz_de,
                      hoja, hojita, flor_simple, flor_grande, mata, ramita, pajaro, estrella, motas, pececillo,
                      remuestrea, puntos_dentro)
from extra_m678 import (cabeza2, mano2, brazo2, pierna2, torso2, cuello, sombra_lado, piel_lapiz, pie, manga_poly)

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-08-d.png'

lz = Lienzo(ANCHO, semilla=808)
rng = np.random.default_rng(8)

TEAL = '#2f8f92'
CORAL = '#e8735e'
ROSA = '#ec9fa0'
CARMIN = '#c33c4e'
ORO = '#f0c25e'
VERDE = '#5f8f4a'
VERDE_O = '#3f6f45'
LP = '#5e3f30'

# ------------------------------------------------------------------ the rising sun on the water (right)
SOL = (1342, 556)
lz.aguada(Elipse(SOL[0], SOL[1] - 20, 210, 150), '#f7c98a', dens=0.18, suave=60, gran=0.05)
sol = Poligono(np.vstack([arco(SOL[0], SOL[1], 58, 58, 180, 360, 40), [(SOL[0] + 58, SOL[1]), (SOL[0] - 58, SOL[1])]]),
               suave=False)
lz.aguada(sol, '#f4a442', dens=0.9, borde=0.8, gran=0.3, flor=1,
          toques=[(SOL[0], SOL[1] - 30, 30, '#f8d07a', 0.8), (SOL[0] + 30, SOL[1] - 6, 26, '#e8735e', 0.6)])
lz.contorno(sol, '#c0602e', grosor=0.8, presion=0.45, cortes=0.4)
lz.luz((SOL[0], SOL[1] - 22, 46), '#fff0c0', fuerza=0.55)
rays = []
for k in range(13):
    a = math.radians(180 + 7 + k * 166 / 12)
    rays.append([(SOL[0] + math.cos(a) * 70, SOL[1] + math.sin(a) * 70),
                 (SOL[0] + math.cos(a) * (88 + 14 * (k % 2)), SOL[1] + math.sin(a) * (88 + 14 * (k % 2)))])
lz.lapiz(rays, '#e0902e', grosor=0.9, presion=0.55, temblor=0.3)
# the water: a band of sea that fades out at both ends, the sun's road on it
agua = Poligono([(990, 562), (1200, 554), (1450, 556), (1455, 600), (1300, 618), (1080, 616), (980, 598)])
lz.aguada(agua, '#5fa8b0', dens=0.72, borde=0.7, gran=0.45, flor=1,
          toques=[(SOL[0], 580, 60, '#f6c27a', 0.85), (1100, 590, 60, '#2f7f8a', 0.6), (1420, 590, 40, '#2f7f8a', 0.6)],
          desvanece=None)
for k in range(9):
    y = 566 + k * 5.5
    w = 60 - k * 4 + rng.normal(0, 4)
    lz.gouache(Trazo([(SOL[0] - w / 2 + rng.normal(0, 6), y), (SOL[0] + w / 2 + rng.normal(0, 6), y)], (1.8, 1.4)),
               '#ffe6b0', alfa=0.85, irreg=0.2)
lz.lapiz([[(1060 + k * 40 + rng.normal(0, 8), 590 + rng.normal(0, 8)), (1080 + k * 40, 590 + rng.normal(0, 8))]
          for k in range(9)], '#2f6f7a', grosor=0.6, presion=0.4, temblor=0.3)
# a swimmer far off: head and one arm out of the water
lz.aguada(Elipse(1250, 578, 5.5, 5), '#9b6141', dens=0.8, tapa=1, irreg=0.2)
lz.aguada(Elipse(1250, 575, 5.6, 3.2), '#e8735e', dens=0.85, tapa=1, irreg=0.2)   # swim cap
lz.aguada(Trazo([(1258, 580), (1266, 566), (1276, 562)], (3, 2.6, 2.2)), '#9b6141', dens=0.8, tapa=1)
lz.lapiz([arco(1250, 584, 12, 3, 0, 360, 20), arco(1250, 586, 18, 4, 200, 340, 20)], '#e9f4f0', grosor=0.7, presion=0.7)
# the shore under the stretching woman
orilla = Poligono([(1030, 612), (1130, 606), (1240, 616), (1300, 640), (1190, 656), (1070, 650), (1010, 634)])
lz.aguada(orilla, '#e8cc90', dens=0.5, gran=0.6, irreg=1.2, toques=[(1210, 630, 40, '#d9a86a', 0.6)])

# ------------------------------------------------------------------ meadow under the tree and the walkers
prado = Poligono([(90, 790), (200, 740), (380, 716), (560, 704), (760, 708), (930, 730), (1000, 770), (900, 806),
                  (640, 820), (360, 824), (150, 818)])
lz.aguada(prado, '#a9c27a', dens=0.45, suave=14, gran=0.5,
          toques=[(300, 780, 140, '#c9c88a', 0.6), (700, 740, 140, '#86a86c', 0.6)])
for k in range(70):
    x = rng.uniform(140, 960)
    y = rng.uniform(724, 812) if x < 300 or x > 820 else rng.uniform(712, 812)
    lz.lapiz([bezier((x, y), (x + rng.normal(0, 3), y - 8), (x + rng.normal(0, 7), y - rng.uniform(12, 22)))],
             rng.choice(['#4f6f45', '#6f8f4a', '#86a86c']), grosor=0.65, presion=0.55, temblor=0.2)
for k in range(16):
    x, y = rng.uniform(160, 940), rng.uniform(736, 806)
    flor_simple(lz, x, y, rng.uniform(3.5, 5.5), rng.choice(['#fff3e0', ORO, CORAL, '#a99bcb', ROSA]), centro='#e7a33e')

# ------------------------------------------------------------------ the brain-tree
BX, BY = 500, 236          # centre of the crown


def B(u, v):
    return (BX + u, BY + v)


SILUETA = [(-232, 30), (-240, -30), (-214, -100), (-150, -150), (-60, -172), (40, -170), (130, -146), (200, -100),
           (238, -36), (246, 20), (230, 62), (196, 84), (196, 110), (170, 140), (120, 152), (76, 136), (54, 112),
           (10, 118), (-50, 124), (-120, 110), (-176, 86), (-214, 62)]
CEREB = [(150, 92), (200, 96), (206, 124), (180, 148), (130, 156), (96, 140), (104, 112)]
# trunk = brainstem, then roots into the meadow
tronco = Trazo([B(78, 128), B(84, 200), B(70, 300), B(56, 400), B(48, 490), B(40, 540)], (44, 40, 40, 44, 52, 66))
lz.aguada(tronco, '#9a6e56', dens=0.78, tapa=1, borde=0.6, gran=0.6,
          toques=[(BX + 90, BY + 300, 40, '#6e4a3a', 0.6), (BX + 50, BY + 200, 40, '#c08a6a', 0.6),
                  (BX + 40, BY + 500, 50, '#7a5040', 0.5)])
sombra_lado(lz, tronco, 1, '#4a2e28', dens=0.35)
lz.contorno(tronco, '#4a2e24', grosor=0.9, presion=0.55, cortes=0.3)
lz.lapiz([bezier(B(70 + k * 7, 160), B(66 + k * 7, 300), B(44 + k * 8, 520), n=30) for k in (-2, 0, 2)],
         '#6e4a3a', grosor=0.6, presion=0.35, temblor=0.6, cortes=0.4)
for (a, b, w) in (((40, 530), (-30, 560), 16), ((50, 540), (130, 566), 16), ((44, 536), (10, 572), 12)):
    f = Trazo([B(*a), B((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 6), B(*b)], (w, w * 0.6, w * 0.2))
    lz.aguada(f, '#8a5e46', dens=0.78, tapa=1, gran=0.5)
    lz.contorno(f, '#4a2e24', grosor=0.7, presion=0.5)

# the crown: a rosy brain made of foliage
cop = Poligono([B(*p) for p in SILUETA])
lz.aguada(cop, '#ef9a8e', dens=0.72, tapa=1, borde=0.85, gran=0.45, flor=2, var=0.5,
          toques=[(BX - 150, BY - 60, 90, '#f4b89a', 0.7), (BX + 160, BY - 40, 80, '#d9707a', 0.7),
                  (BX - 40, BY + 80, 80, '#9fbf8a', 0.55), (BX + 40, BY - 120, 70, '#f6c88a', 0.6),
                  (BX - 200, BY + 30, 50, '#c9707a', 0.5)])
cb = Poligono([B(*p) for p in CEREB])
lz.aguada(cb, '#d97a7e', dens=0.75, tapa=1, borde=0.8, gran=0.45, toques=[(BX + 150, BY + 130, 30, '#a95060', 0.6)])
lz.lapiz([spline([B(110 + k * 5, 100 + k * 12), B(150, 98 + k * 12), B(196, 104 + k * 10)]) for k in range(4)],
         '#9a3a4a', grosor=0.6, presion=0.45, temblor=0.2)
lz.contorno(cb, '#8f3a4a', grosor=0.8, presion=0.5, cortes=0.3)
lz.contorno(cop, '#8f3a4a', grosor=1.0, presion=0.55, cortes=0.25)
# soft shade on the lower half (volume)
lz.aguada(cop, '#a0405a', dens=0.25, borde=0.2, desvanece=(BX + 20, BY + 130, BX - 20, BY - 40), gran=0.3)


# the folds: meandering branches (gyri) that are twigs; neurons light up at the forks
def pliegue(p0, p1, amp, ondas, sem):
    r_ = np.random.default_rng(sem)
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    t = np.linspace(0, 1, 90)
    d = p1 - p0
    n = np.array([-d[1], d[0]]) / max(np.linalg.norm(d), 1e-6)
    ph = r_.uniform(0, 6.28)
    w = amp * np.sin(t * ondas * 2 * np.pi + ph) * np.sin(np.pi * t) ** 0.4
    return p0[None] + d[None] * t[:, None] + n[None] * w[:, None]


lineas = []
lineas.append(np.array(spline([B(-160, 74), B(-80, 44), B(0, 18), B(70, -4), B(140, 0)])))          # lateral sulcus
lineas.append(np.array(spline([B(14, -170), B(-4, -100), B(-24, -40), B(-36, 16)])))                # central sulcus
# the folds as a labyrinth: iso-lines of a band-passed random field (looks like real gyri)
import cv2
from skimage import measure
x0b, y0b = BX - 260, BY - 190
fw, fh = 520, 360
campo = np.random.default_rng(88).normal(0, 1, (fh, fw)).astype(np.float32)
campo = cv2.GaussianBlur(campo, (0, 0), 7.5) - 0.6 * cv2.GaussianBlur(campo, (0, 0), 22)
campo = cv2.resize(cv2.resize(campo, (fw // 2, fh)), (fw, fh))
for cc in measure.find_contours(campo, 0.0):
    p = np.stack([cc[:, 1] + x0b, cc[:, 0] + y0b], 1)
    if len(p) > 12:
        lineas.append(p)
interior = cop - cb
Mi = interior.mascara(type('U', (), {'s': 1.0}), 0, 0, 1485, 850)
Mi = cv2.erode((Mi > 0.5).astype(np.uint8), np.ones((13, 13), np.uint8))
recorte = []
for ln in lineas:
    ln = remuestrea(ln, 1.5)
    ok = np.array([Mi[int(min(849, max(0, y))), int(min(1484, max(0, x)))] > 0 for x, y in ln])
    idx = np.flatnonzero(np.diff(np.r_[0, ok.astype(int), 0]))
    for i0, i1 in zip(idx[::2], idx[1::2]):
        if i1 - i0 > 8:
            seg = ln[i0:i1]
            n = len(seg)
            j = 0
            while j < n:                      # small gaps: a hand that lifts the pencil
                L = int(rng.uniform(40, 110))
                if min(n, j + L) - j > 6:
                    recorte.append(seg[j:min(n, j + L)])
                j += L + int(rng.uniform(3, 7))
# the sulci: a darker glaze in each groove, then the pencil
for ln in recorte:
    if len(ln) > 4:
        lz.aguada(Trazo(ln[::3] if len(ln) > 9 else ln, (3.2, 3.2)), '#b84a5e', dens=0.22, irreg=0.3, borde=0.5, gran=0.3)
lz.lapiz(recorte[:2], '#7a2a3e', grosor=1.6, presion=0.75, temblor=0.4)
lz.lapiz(recorte[2:], '#9a3a4a', grosor=0.9, presion=0.5, temblor=0.3)
# light on the top of each fold (gouache-like lifted line just above the groove)
lz.levanta(Elipse(BX - 90, BY - 90, 90, 50), 0.25, suave=20)
# the crown is foliage: a rim of leaves all round the brain, and a few blossoms
pts_s = remuestrea(np.array(spline([B(*p) for p in SILUETA], cerrada=True)), 9)
for i, (x, y) in enumerate(pts_s):
    a = math.degrees(math.atan2(y - BY, x - BX))
    if y > BY + 95 and BX - 20 < x < BX + 220:
        continue
    if math.sin(i * 0.45) + rng.normal(0, 0.5) < 0.2:      # leaves come in clusters, with bare stretches
        continue
    hojita(lz, x + rng.normal(0, 3), y + rng.normal(0, 3), rng.uniform(12, 20), a + rng.normal(0, 35), rng.choice(['#5f8f4a', '#7aa456', '#3f7a6a', '#9fbf6a']),
           tapa=0.8, dens=0.8)
    if i % 7 == 3:
        flor_simple(lz, x + rng.normal(0, 4), y + rng.normal(0, 4), 5, rng.choice(['#fff1e0', ORO, '#f6c0c8']), centro='#e7a33e')
# neurons: golden nodes joined by fine threads, lit from inside
sel = [recorte[i] for i in rng.choice(np.arange(2, len(recorte)), size=min(30, len(recorte) - 2), replace=False)]
nodos = [ln[len(ln) // 2] for ln in sel]
nodos = [tuple(p) for p in nodos]
sinapsis = []
for i, p in enumerate(nodos):
    dd = sorted(range(len(nodos)), key=lambda j: (nodos[j][0] - p[0]) ** 2 + (nodos[j][1] - p[1]) ** 2)
    for j in dd[1:3]:
        q = nodos[j]
        if (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 < 95 ** 2:
            m = ((p[0] + q[0]) / 2 + rng.normal(0, 8), (p[1] + q[1]) / 2 + rng.normal(0, 8))
            sinapsis.append(bezier(p, m, q, n=20))
lz.lapiz(sinapsis, '#e9b44a', grosor=0.6, presion=0.6, temblor=0.2, cortes=0.2)
for (x, y) in nodos:
    r_ = rng.uniform(3.2, 5.0)
    lz.aguada(Elipse(x, y, r_), '#f2b630', dens=0.95, tapa=1, irreg=0.2, borde=0.7, toques=[(x - 1, y - 1, r_ * 0.6, '#fff1c0', 0.8)])
    for k in range(3):     # dendrites
        a = rng.uniform(0, 2 * math.pi)
        lz.lapiz([[(x, y), (x + math.cos(a) * r_ * 2.4, y + math.sin(a) * r_ * 2.4)]], '#d9902e', grosor=0.5, presion=0.6)
    lz.luz((x, y, r_ * 2.2), '#fff0b0', fuerza=0.55)
lz.chispas(BX, BY - 20, 200, 120, n=26, semilla=81, luz=0.25)

# ------------------------------------------------------------------ hammock posts (the trunk and a young olive on the right)
POST = (930, 500)
olivo = Trazo([(918, 766), (924, 660), (932, 560), (926, 480), (940, 420)], (26, 22, 20, 17, 12))
lz.aguada(olivo, '#9a8a6a', dens=0.78, tapa=1, gran=0.6, toques=[(925, 650, 20, '#6e5a4a', 0.6), (930, 520, 20, '#b8a888', 0.5)])
sombra_lado(lz, olivo, 1, '#4a3a2e', dens=0.32)
lz.contorno(olivo, '#4a3a2e', grosor=0.8, presion=0.55, cortes=0.3)
lz.lapiz([bezier((918 + k * 5, 760), (926 + k * 4, 620), (928 + k * 3, 470), n=24) for k in (-1, 1)], '#6e5a4a', grosor=0.5,
         presion=0.35, temblor=0.7, cortes=0.4)
for (p, q) in (((930, 470), (884, 400)), ((940, 424), (990, 372)), ((934, 448), (976, 430))):
    f = Trazo([p, q], (8, 3))
    lz.aguada(f, '#9a8a6a', dens=0.78, tapa=1)
    lz.contorno(f, '#4a3a2e', grosor=0.6, presion=0.5)
copa_o = Poligono([(850, 400), (868, 352), (920, 326), (980, 330), (1020, 360), (1024, 404), (990, 432), (940, 428),
                   (900, 436), (860, 426)])
lz.aguada(copa_o, '#a9b38a', dens=0.62, tapa=0.7, borde=0.8, irreg=1.8, gran=0.5, flor=1,
          toques=[(900, 350, 40, '#c9cfa8', 0.6), (990, 410, 40, '#6f8a5a', 0.6)])
for k in range(60):
    x, y = rng.uniform(850, 1025), rng.uniform(330, 434)
    hojita(lz, x, y, rng.uniform(10, 14), rng.uniform(0, 360), rng.choice(['#7a8a5a', '#a9b38a', '#5f7a4a', '#c0c8a0']),
           tapa=0.7, dens=0.75, nervio=False)
for (x, y) in ((880, 380), (960, 352), (1004, 398), (930, 410)):
    lz.aguada(Elipse(x, y, 3.2, 4.2, 20), '#4a3a5a', dens=0.9, tapa=1, irreg=0.2)      # olives
# ropes
TA = (BX + 74, 548)      # on the trunk
TB = (POST[0] - 4, 540)
HX0, HX1 = TA[0] + 30, TB[0] - 30
lz.lapiz([[TA, (HX0, 588)], [TA, (HX0 + 4, 600)], [TA, (HX0 - 2, 578)], [TB, (HX1, 588)], [TB, (HX1 - 4, 600)],
          [TB, (HX1 + 2, 578)]], '#a08a6a', grosor=0.8, presion=0.7, temblor=0.2)

# ------------------------------------------------------------------ the sleeper in the hammock
P1 = 'piel2'
# far rim of the fabric, seen behind him
atras = Poligono(np.vstack([spline([(HX0, 586), (HX0 + 100, 606), (HX1 - 100, 606), (HX1, 586)]),
                            spline([(HX1, 586), (HX1 - 100, 640), (HX0 + 100, 640), (HX0, 586)])]), suave=False)
lz.aguada(atras, '#d99a4a', dens=0.6, tapa=1, borde=0.7, gran=0.3, toques=[(760, 630, 80, '#b8763a', 0.6)])
lz.contorno(atras, '#8a5a2a', grosor=0.7, presion=0.45, cortes=0.3)
# the arm folded behind his head (drawn first: the head lies on it)
brazo2(lz, (664, 606), (630, 562), (628, 594), 16, '#4f9c9a', P1, 'corta', sombra=-1, mano=None)
# torso and legs inside the hammock (only the upper edge will show)
torso2(lz, (662, 598), (672, 628), (772, 606), (776, 632), '#4f9c9a', cintura=1.0, sombra=1)
lz.aguada(Trazo([(770, 612), (830, 606), (870, 600)], (26, 22, 16)), '#5a6a9a', dens=0.75, tapa=1)
lz.contorno(Trazo([(770, 612), (830, 606), (870, 600)], (26, 22, 16)), '#3a4a7a', grosor=0.7, presion=0.5)
# a small cushion and his head, tilted back, asleep
cojin = Elipse(626, 600, 26, 14, -20)
lz.aguada(cojin, '#ec9fa0', dens=0.7, tapa=1, irreg=0.3, toques=[(630, 606, 12, '#c9707a', 0.6)])
lz.contorno(cojin, '#9a4a5a', grosor=0.6, presion=0.45)
cabeza2(lz, 640, 588, 26, P1, '#7a4a2a', 'corto', giro=0.25, inclina=-62, ojos='dormidos', boca='suave', mejillas=0.6)
# the near rim of the hammock wraps him; a striped cloth with a fringe
frente = Poligono(np.vstack([spline([(HX0 + 2, 590), (HX0 + 40, 622), (HX0 + 120, 646), (HX1 - 120, 646),
                                     (HX1 - 30, 620), (HX1 - 2, 590)]),
                             spline([(HX1 - 2, 590), (HX1 - 30, 650), (HX1 - 120, 684), (HX0 + 120, 684), (HX0 + 30, 650),
                                     (HX0 + 2, 590)])]), suave=False)
lz.aguada(frente, '#f2c04a', dens=0.8, tapa=1, borde=0.7, gran=0.35,
          toques=[(760, 676, 90, '#e8952a', 0.6), (HX0 + 60, 640, 40, '#f8d880', 0.6)])
for k, col in enumerate((CORAL, TEAL, CORAL)):
    y0 = 640 + k * 12
    bd = spline([(HX0 + 14 + k * 6, 604 + k * 10), (HX0 + 110, y0 + 8), (HX1 - 110, y0 + 8), (HX1 - 14 - k * 6, 604 + k * 10)])
    lz.aguada(Trazo(bd[::3], (2, 5, 5, 2)), col, dens=0.72, irreg=0.3)
lz.contorno(frente, '#9a6a2a', grosor=0.8, presion=0.55, cortes=0.2)
bajo_ = spline([(HX0 + 30, 650), (HX0 + 120, 684), (HX1 - 120, 684), (HX1 - 30, 650)])
lz.lapiz([[(x, y), (x - 1, y + 13)] for (x, y) in remuestrea(bajo_, 9)[1:-1]], '#c98a4a', grosor=0.7, presion=0.6,
         temblor=0.2)
# his arm draped over the rim, fingers relaxed; bare feet crossed out of the far end
brazo2(lz, (676, 612), (694, 646), (690, 690), 16, '#4f9c9a', P1, 'corta', sombra=1,
       mano=dict(ang=96, gesto='relajada', lado=1, tam=25))
pie(lz, (872, 600), -30, 28, descalzo=True, piel=P1)
pie(lz, (868, 590), -50, 28, descalzo=True, piel=P1)
# a clay pitcher and a glass of water in the grass beside him (drink before you're thirsty)
jar = Poligono([(744, 742), (740, 714), (750, 700), (748, 690), (764, 690), (762, 700), (772, 714), (768, 742)])
lz.aguada(jar, '#c0703f', dens=0.85, tapa=1, borde=0.7, irreg=0.3, toques=[(766, 720, 10, '#8a4a2a', 0.6)])
lz.contorno(jar, '#7a3a22', grosor=0.7, presion=0.55)
lz.lapiz([arco(772, 712, 6, 9, -90, 90, 10)], '#7a3a22', grosor=0.9, presion=0.6)
vaso = Poligono([(784, 744), (782, 722), (796, 722), (794, 744)], suave=False)
lz.aguada(vaso, '#bfe0e6', dens=0.5, tapa=1, irreg=0.2, toques=[(789, 736, 6, '#7fb5d3', 0.8)])
lz.contorno(vaso, '#6a9aa0', grosor=0.5, presion=0.5)
lz.gouache(Trazo([(785, 726), (785, 740)], (0.9, 0.9)), '#ffffff', alfa=0.8, irreg=0)

# ------------------------------------------------------------------ the dream: little lights rise into the crown
sueno = bezier((640, 560), (600, 480), (690, 440), (620, 330), 60)
for k in range(0, 60, 3):
    x, y = sueno[k]
    x += rng.normal(0, 5)
    t = k / 59
    r_ = 1.4 + 2.2 * t
    if k % 9 == 0:
        estrella(lz, x, y, 3 + 3 * t, rng.choice([ORO, '#f6a5b5', '#7fc0c8']), gouache=False)
    else:
        lz.aguada(Elipse(x, y, r_), rng.choice([ORO, '#f2d36b']), dens=0.85, irreg=0.2)
        lz.luz((x, y, r_ * 3), '#fff0b0', fuerza=0.35)
lz.lapiz([sueno], '#e9b44a', grosor=0.5, presion=0.35, temblor=0.6, cortes=0.6)
for (x, y) in ((608, 452), (632, 392), (612, 476)):      # 'z' as tiny curls, no letters: just spirals
    lz.lapiz([arco(x, y, 4, 4, 0, 300, 16)], '#c9a0b0', grosor=0.5, presion=0.4)

# ------------------------------------------------------------------ the walkers: grandfather and grandson, barefoot
PG, PN = 'piel4', 'piel1'
YG = 806
# grandfather (walking right, mid-step, turned to the boy)
pierna2(lz, (196, 586), (184, 690), (164, YG - 14), 30, '#e9dcc0', PG, pie_ang=-30, descalzo=True, sombra=-1, bajo='corto')
brazo2(lz, (236, 470), (262, 518), (276, 566), 22, '#7aa0c8', PG, 'larga', sombra=1,
       mano=dict(ang=90, gesto='relajada', lado=1, tam=33))
pierna2(lz, (222, 588), (252, 690), (262, YG - 2), 30, '#e9dcc0', PG, pie_ang=5, descalzo=True, sombra=1, bajo='corto')
cuello(lz, (214, 426), 30, (212, 466), PG)
torso2(lz, (180, 466), (240, 470), (192, 592), (230, 594), '#7aa0c8', cintura=0.95, sombra=1, escote='v',
       toques=[(230, 560, 40, '#4a6f9a', 0.6)], pliegues=[[(200, 500), (206, 550), (204, 588)]])
cabeza2(lz, 214, 426, 30, PG, '#e8e2da', 'corto', giro=0.6, inclina=12, ojos='cerrados', boca='abierta', canas=True,
        barba='#e4ddd4')
# the boy (looking up at his grandfather, laughing)
pierna2(lz, (306, 708), (300, 752), (280, YG - 6), 22, None, PN, pie_ang=-15, descalzo=True, sombra=-1)
pierna2(lz, (320, 708), (338, 750), (346, YG), 22, None, PN, pie_ang=10, descalzo=True, sombra=1)
brazo2(lz, (330, 640), (346, 670), (352, 698), 15, '#f2b33a', PN, 'corta', sombra=1,
       mano=dict(ang=80, gesto='relajada', lado=1, tam=22))
lz.aguada(Poligono([(296, 690), (334, 690), (338, 718), (296, 720)]), '#e8735e', dens=0.8, tapa=1, irreg=0.3)   # shorts
lz.contorno(Poligono([(296, 690), (334, 690), (338, 718), (296, 720)]), '#9a3a2e', grosor=0.7, presion=0.5)
cuello(lz, (314, 592), 22, (314, 626), PN)
torso2(lz, (296, 626), (332, 628), (298, 694), (332, 694), '#f2b33a', cintura=1.0, sombra=1)
cabeza2(lz, 314, 592, 22, PN, '#e0a040', 'rizado', giro=-0.5, inclina=-14, ojos='abiertos', boca='risa', mira=(-1, -1))
# their hands meet: the grandfather's near arm comes down, the boy's reaches up
brazo2(lz, (186, 476), (220, 560), (270, 626), 22, '#7aa0c8', PG, 'larga', sombra=-1, mano=None)
brazo2(lz, (300, 634), (286, 660), (282, 640), 15, '#f2b33a', PN, 'corta', sombra=-1, mano=None)
mano2(lz, 270, 626, 40, 32, PG, 'agarra', lado=-1)
mano2(lz, 282, 642, -110, 22, PN, 'agarra', lado=1)

# ------------------------------------------------------------------ the woman who stretches toward the sun
PM = 'piel3'
YM = 628
pierna2(lz, (1130, 520), (1122, 574), (1116, YM - 6), 20, '#c33c4e', PM, pie_ang=180, descalzo=True, sombra=-1)
pierna2(lz, (1146, 520), (1160, 572), (1172, YM - 2), 20, '#c33c4e', PM, pie_ang=0, descalzo=True, sombra=1)
torso2(lz, (1122, 428), (1156, 424), (1126, 524), (1152, 522), '#6fb1ad', cintura=0.86, sombra=1,
       toques=[(1150, 500, 20, '#3f8f8a', 0.6)])
cuello(lz, (1146, 396), 19, (1140, 426), PM)
cabeza2(lz, 1146, 394, 19, PM, '#1e1410', 'mono', giro=0.5, inclina=-24, ojos='cerrados', boca='sonrisa')
brazo2(lz, (1126, 432), (1116, 380), (1130, 330), 14, '#6fb1ad', PM, 'sin', sombra=-1,
       mano=dict(ang=-70, gesto='abierta', lado=1, tam=21))
brazo2(lz, (1154, 430), (1176, 382), (1200, 336), 14, '#6fb1ad', PM, 'sin', sombra=1,
       mano=dict(ang=-60, gesto='abierta', lado=-1, tam=21))
# morning swallows: they leave the crown and fly to the sun
for (x, y, s, c, a) in ((820, 170, 13, TEAL, -10), (930, 150, 11, CORAL, -18), (1040, 190, 10, '#4f6fa0', 6)):
    pajaro(lz, x, y, s, c, ang=a)

lz.vineta(margen=26)
lz.guardar(SALIDA)
print('ok', SALIDA)
