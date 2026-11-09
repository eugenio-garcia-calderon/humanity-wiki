"""
Mes 8 -- Salud y Bienestar -- Diseño 4.

Idea: a summer dawn told as one walk. A tree whose crown IS a brain: its
folds are one continuous meandering line that follows the lobes, and its
branches climb into the crown and become dendrites that light up as
neurons. From the trunk hangs a hammock where a young man sleeps; golden
dust falls from the crown on him and his dream rises back into it (sleep
fixes what we learned). From the foot of the tree a path of trodden grass
runs down to the sea: on it a grandfather and his grandson walk barefoot,
hand in hand, and the boy points to the shore, where a woman stretches on
tiptoe toward the light of the rising sun.

    python3 mes-08-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np
import cv2
from skimage import measure

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, rgb, _lapiz_de,
                      hojita, flor_simple, pajaro, estrella, remuestrea, puntos_dentro)
from extra_m678 import (cabeza2, mano2, brazo2, pierna2, torso2, cuello, sombra_lado, piel_lapiz, pie)

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-08-d.png'

lz = Lienzo(ANCHO, semilla=808)
rng = np.random.default_rng(8)
U1 = type('U', (), {'s': 1.0})

TEAL = '#2f8f92'
CORAL = '#e8735e'
ROSA = '#ec9fa0'
ORO = '#f0c25e'
VERDE_O = '#3f6f45'

# ------------------------------------------------------------------ dawn: only a warm glow where the sun rises
SOL = (1350, 566)
lz.aguada(Elipse(SOL[0], SOL[1] - 60, 300, 230), '#f8d69a', dens=0.2, suave=110, gran=0.05)
lz.aguada(Elipse(SOL[0], SOL[1] - 14, 120, 70), '#f6c070', dens=0.28, suave=45, gran=0.05)
lz.aguada(Elipse(SOL[0], SOL[1] - 4, 40, 18), '#f4a852', dens=0.4, suave=16, gran=0.05)

# ------------------------------------------------------------------ the sea: a broad wash that dissolves into the paper
mar = Poligono([(860, 580), (1050, 568), (1300, 566), (1485, 566), (1485, 640), (1300, 646), (1080, 642), (880, 620)])
lz.aguada(mar, '#5fa8b0', dens=0.6, borde=0.2, irreg=2.0, gran=0.5, var=0.6, suave=3,
          toques=[(SOL[0], 586, 80, '#f6c27a', 0.85), (1060, 610, 90, '#3f8f9a', 0.6), (1450, 620, 60, '#3f8f9a', 0.5)],
          desvanece=(1150, 600, 860, 600))
lz.aguada(Poligono([(1300, 566), (1485, 566), (1485, 640), (1300, 646)]), '#5fa8b0', dens=0.2, suave=12,
          desvanece=(1350, 600, 1485, 600))
for k in range(12):
    y = 574 + k * 5.5
    w = 70 - k * 4 + rng.normal(0, 5)
    lz.gouache(Trazo([(SOL[0] - w / 2 + rng.normal(0, 6), y), (SOL[0] + w / 2 + rng.normal(0, 6), y)], (1.6, 1.2)),
               '#ffe6b0', alfa=0.8, irreg=0.3)
lz.lapiz([[(x, y), (x + rng.uniform(16, 34), y + rng.normal(0, 0.6))]
          for x, y in zip(rng.uniform(980, 1460, 22), rng.uniform(584, 636, 22))], '#2f6f7a', grosor=0.55, presion=0.4,
         temblor=0.3)
# sand under the woman, fading
arena = Poligono([(1110, 668), (1200, 648), (1330, 652), (1430, 680), (1330, 712), (1170, 708)])
lz.aguada(arena, '#e8cc90', dens=0.45, suave=12, gran=0.6)

# ------------------------------------------------------------------ meadow and the path from the tree to the sea
prado = Poligono([(250, 800), (380, 742), (560, 716), (780, 712), (960, 700), (1100, 680), (1180, 690), (1150, 740),
                  (1000, 800), (800, 826), (520, 830), (320, 826)])
lz.aguada(prado, '#a9c27a', dens=0.45, suave=16, gran=0.5,
          toques=[(420, 790, 140, '#c9c88a', 0.6), (760, 750, 160, '#86a86c', 0.6), (1080, 720, 80, '#c9c88a', 0.5)])
CAMINO = [(560, 806), (700, 806), (860, 790), (980, 764), (1080, 724), (1150, 684), (1200, 660)]
camino = Trazo(CAMINO, (56, 52, 46, 38, 30, 22, 14))
lz.aguada(camino, '#ead9a8', dens=0.55, irreg=1.4, borde=0.6, gran=0.6, tapa=0.7,
          toques=[(800, 800, 60, '#e2c890', 0.6)])
lz.lapiz([spline(CAMINO)[::1] + np.array([0, 5]), spline(CAMINO)[::1] - np.array([0, 9])], '#c9a86a', grosor=0.5,
         presion=0.35, temblor=0.8, cortes=0.6)
for k in range(110):
    x = rng.uniform(300, 1150)
    y = rng.uniform(720, 826)
    # leave the path itself mostly bare
    p = spline(CAMINO)
    dmin = np.min(np.hypot(p[:, 0] - x, p[:, 1] - y))
    if dmin < 16:
        continue
    lz.lapiz([bezier((x, y), (x + rng.normal(0, 3), y - 8), (x + rng.normal(0, 7), y - rng.uniform(10, 20)))],
             rng.choice(['#4f6f45', '#6f8f4a', '#86a86c']), grosor=0.65, presion=0.55, temblor=0.2)
for k in range(18):
    x, y = rng.uniform(320, 1120), rng.uniform(730, 820)
    if np.min(np.hypot(spline(CAMINO)[:, 0] - x, spline(CAMINO)[:, 1] - y)) < 22:
        continue
    flor_simple(lz, x, y, rng.uniform(3.5, 5.5), rng.choice(['#fff3e0', ORO, CORAL, '#a99bcb', ROSA]), centro='#e7a33e')

# ------------------------------------------------------------------ the brain-tree
BX, BY = 470, 236


def B(u, v):
    return (BX + u, BY + v)


SILUETA = [(-232, 30), (-240, -30), (-214, -100), (-150, -150), (-60, -172), (40, -170), (130, -146), (200, -100),
           (238, -36), (246, 20), (230, 62), (196, 84), (196, 110), (170, 140), (120, 152), (76, 136), (54, 112),
           (10, 118), (-50, 124), (-120, 110), (-176, 86), (-214, 62)]
CEREB = [(140, 98), (180, 98), (192, 118), (176, 138), (138, 144), (108, 134), (112, 112)]
TRONCO = [B(78, 128), B(86, 210), B(74, 300), B(62, 400), B(56, 490), B(50, 548)]
tronco = Trazo(TRONCO, (40, 38, 40, 46, 54, 70))
lz.aguada(tronco, '#9a6e56', dens=0.78, tapa=1, borde=0.6, gran=0.6,
          toques=[(BX + 96, BY + 300, 40, '#6e4a3a', 0.6), (BX + 60, BY + 200, 40, '#c08a6a', 0.6),
                  (BX + 50, BY + 500, 50, '#7a5040', 0.5)])
sombra_lado(lz, tronco, 1, '#4a2e28', dens=0.35)
lz.contorno(tronco, '#4a2e24', grosor=0.9, presion=0.55, cortes=0.3)
lz.lapiz([bezier(B(74 + k * 7, 160), B(72 + k * 7, 320), B(52 + k * 9, 530), n=30) for k in (-2, 0, 2)],
         '#6e4a3a', grosor=0.6, presion=0.35, temblor=0.6, cortes=0.4)
for (a, b, w) in (((50, 538), (-30, 566), 18), ((60, 546), (140, 572), 18), ((54, 544), (18, 578), 13)):
    f = Trazo([B(*a), B((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 6), B(*b)], (w, w * 0.6, w * 0.2))
    lz.aguada(f, '#8a5e46', dens=0.78, tapa=1, gran=0.5)
    lz.contorno(f, '#4a2e24', grosor=0.7, presion=0.5)

# the crown: a rosy brain
cop = Poligono([B(*p) for p in SILUETA])
lz.aguada(cop, '#ef9a8e', dens=0.72, tapa=1, borde=0.85, gran=0.45, flor=2, var=0.5,
          toques=[(BX - 150, BY - 60, 90, '#f4b89a', 0.7), (BX + 160, BY - 40, 80, '#d9707a', 0.7),
                  (BX - 40, BY + 80, 80, '#e98a7e', 0.55), (BX + 40, BY - 120, 70, '#f6c88a', 0.6),
                  (BX - 200, BY + 30, 50, '#c9707a', 0.5)])
cb = Poligono([B(*p) for p in CEREB])
lz.aguada(cb, '#ea8c86', dens=0.7, tapa=1, borde=0.8, gran=0.45, toques=[(BX + 160, BY + 132, 22, '#c96a72', 0.6)])
# its fine folia: many thin parallel curved lines
lz.lapiz([spline([B(110 + k * 1.5, 110 + k * 3.6), B(150, 106 + k * 3.8), B(188, 112 + k * 3.2)]) for k in range(9)],
         '#a8475a', grosor=0.5, presion=0.45, temblor=0.15)
lz.contorno(cb, '#8f3a4a', grosor=0.7, presion=0.5, cortes=0.3)
lz.aguada(cop, '#a0405a', dens=0.22, borde=0.2, desvanece=(BX + 20, BY + 130, BX - 20, BY - 40), gran=0.3)

# the folds: sulci that meander and branch in every direction (skeleton of a random labyrinth),
# cut by the lateral fissure and the central sulcus that separate the lobes
from skimage.morphology import skeletonize
LATERAL = [B(-170, 74), B(-110, 58), B(-50, 50), B(-10, 30), B(40, 22), B(90, 4), B(130, 10)]
CENTRAL = [B(14, -170), B(4, -130), B(-12, -96), B(-4, -60), B(-22, -24), B(-26, 14)]
Mb = (cop.mascara(U1, 0, 0, 1485, 850) > 0.5) & ~(cb.mascara(U1, 0, 0, 1485, 850) > 0.3)
Mi = cv2.erode(Mb.astype(np.uint8), np.ones((11, 11), np.uint8)) > 0
campo = np.random.default_rng(812).normal(0, 1, Mb.shape).astype(np.float32)
campo = cv2.GaussianBlur(campo, (0, 0), 4.6) - 0.7 * cv2.GaussianBlur(campo, (0, 0), 13)
surcos_m = (campo < 0) & Mi
for ln in (LATERAL, CENTRAL):
    tmp = np.zeros(Mb.shape, np.uint8)
    cv2.polylines(tmp, [np.round(spline(ln)).astype(np.int32)], False, 1, thickness=3)
    surcos_m &= ~(cv2.dilate(tmp, np.ones((9, 9), np.uint8)) > 0)
esq = skeletonize(surcos_m)
ys, xs = np.nonzero(esq)
pix = set(zip(ys.tolist(), xs.tolist()))
VEC = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
def vecinos(p):
    return [(p[0] + a, p[1] + b) for a, b in VEC if (p[0] + a, p[1] + b) in pix]
grado = {p: len(vecinos(p)) for p in pix}
usados = set()
caminos = []
def anda(p0, p1):
    cam = [p0, p1]
    usados.add((p0, p1)); usados.add((p1, p0))
    while grado.get(cam[-1], 0) == 2:
        nx = [q for q in vecinos(cam[-1]) if (cam[-1], q) not in usados]
        if not nx:
            break
        usados.add((cam[-1], nx[0])); usados.add((nx[0], cam[-1]))
        cam.append(nx[0])
    return cam
for p in pix:
    if grado[p] != 2:
        for q in vecinos(p):
            if (p, q) not in usados:
                caminos.append(anda(p, q))
for p in pix:
    for q in vecinos(p):
        if (p, q) not in usados:
            caminos.append(anda(p, q))
surcos = []
for cam in caminos:
    if len(cam) < 4:
        continue
    pp = np.array([(x, y) for y, x in cam], float)
    k = 5
    if len(pp) > k:
        for _ in range(3):
            pp = np.vstack([pp[:1], np.array([pp[max(0, i - 2):i + 3].mean(0) for i in range(1, len(pp) - 1)]), pp[-1:]])
    surcos.append(pp)
# grooves: a deeper rosy glaze in each sulcus, then soft carmine pencil
for ln in surcos:
    lz.aguada(Trazo(ln[::3] if len(ln) > 8 else ln, (3.0, 3.0)), '#b84a60', dens=0.28, irreg=0.35, borde=0.6, gran=0.3)
lz.lapiz(surcos, '#94344a', grosor=0.8, presion=0.55, temblor=0.2, cortes=0.0, puntas=0.01)
for ln in (LATERAL, CENTRAL):
    lz.aguada(Trazo(spline(ln)[::3], (5, 4.5, 3)), '#a83e58', dens=0.3, irreg=0.4, borde=0.6)
    lz.lapiz([spline(ln)], '#7e2a42', grosor=0.95, presion=0.5, temblor=0.4)
# the temporal lobe a little rosier and in shade, the frontal lit
lz.aguada(Poligono([B(-200, 60), B(-120, 66), B(-10, 30), B(80, 20), B(60, 110), B(-60, 122), B(-170, 90)]), '#c0566a',
          dens=0.16, suave=10)
lz.levanta(Elipse(BX - 100, BY - 95, 90, 45), 0.22, suave=22)

# branches climb into the crown and become dendrites; at their tips the neurons light up
RAMAS = [[B(78, 128), B(40, 96), B(-20, 80), B(-90, 58)],
         [B(80, 126), B(70, 70), B(40, 10), B(20, -60)],
         [B(82, 128), B(110, 80), B(150, 30), B(176, -20)],
         [B(78, 128), B(20, 110), B(-80, 104), B(-160, 92)]]
nodos = []
for k, rp in enumerate(RAMAS):
    pts = spline(rp)
    f = Trazo(pts[::4], (14, 10, 6, 3))
    lz.aguada(f, '#8a5e46', dens=0.6, tapa=0.5, irreg=0.4, gran=0.4, desvanece=(*rp[0], *rp[-1]))
    lz.lapiz([pts], '#6e4a3a', grosor=0.7, presion=0.45, temblor=0.3, cortes=0.25)
    nodos.append(tuple(rp[-1]))
    nodos.append(tuple(pts[len(pts) // 2]))
for (x, y) in puntos_dentro(cop - cb, 18, 123, margen=14):
    nodos.append((x, y))
sinapsis = []
for i, p in enumerate(nodos):
    dd = sorted(range(len(nodos)), key=lambda j: (nodos[j][0] - p[0]) ** 2 + (nodos[j][1] - p[1]) ** 2)
    for j in dd[1:3]:
        q = nodos[j]
        if (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 < 110 ** 2:
            m = ((p[0] + q[0]) / 2 + rng.normal(0, 9), (p[1] + q[1]) / 2 + rng.normal(0, 9))
            sinapsis.append(bezier(p, m, q, n=20))
lz.lapiz(sinapsis, '#e9b44a', grosor=0.6, presion=0.6, temblor=0.2, cortes=0.25)
for (x, y) in nodos:
    r_ = rng.uniform(3.4, 5.2)
    tr = []
    for k in range(5):          # dendrites: little forked twigs
        a = rng.uniform(0, 2 * math.pi)
        e = (x + math.cos(a) * r_ * 3, y + math.sin(a) * r_ * 3)
        tr.append([(x, y), e])
        tr.append([e, (e[0] + math.cos(a + 0.6) * r_ * 1.3, e[1] + math.sin(a + 0.6) * r_ * 1.3)])
    lz.lapiz(tr, '#c9802e', grosor=0.55, presion=0.6, temblor=0.1)
    lz.aguada(Elipse(x, y, r_), '#f2b630', dens=0.95, tapa=1, irreg=0.2, borde=0.7,
              toques=[(x - 1, y - 1, r_ * 0.6, '#fff1c0', 0.8)])
    lz.luz((x, y, r_ * 2.4), '#fff0b0', fuerza=0.55)
lz.chispas(BX, BY - 20, 200, 120, n=14, semilla=81, luz=0.25)
# a few young leaves on the branches where they leave the trunk (it is still a tree)
for (x, y, a) in ((BX + 50, BY + 104, 200), (BX + 96, BY + 100, -40), (BX + 30, BY + 112, 150), (BX + 110, BY + 70, -70)):
    hojita(lz, x, y, 15, a, '#6f9a4a', tapa=0.9)

# ------------------------------------------------------------------ hammock posts (the trunk and a young olive on the right)
POST = (930, 500)
olivo = Trazo([(918, 766), (922, 680), (930, 590), (928, 500), (936, 440)], (26, 23, 20, 17, 13))
lz.aguada(olivo, '#9a8a6a', dens=0.78, tapa=1, gran=0.6, toques=[(925, 650, 20, '#6e5a4a', 0.6), (930, 520, 20, '#b8a888', 0.5)])
sombra_lado(lz, olivo, 1, '#4a3a2e', dens=0.32)
lz.contorno(olivo, '#4a3a2e', grosor=0.8, presion=0.55, cortes=0.3)
lz.lapiz([bezier((918 + k * 5, 760), (924 + k * 4, 620), (930 + k * 3, 470), n=24) for k in (-1, 1)], '#6e5a4a', grosor=0.5,
         presion=0.35, temblor=0.7, cortes=0.4)
for (p, m, q, w) in (((934, 456), (912, 420), (890, 392), 9), ((936, 446), (956, 410), (984, 382), 8)):
    f = Trazo([p, m, q], (w, w * 0.7, w * 0.35))
    lz.aguada(f, '#9a8a6a', dens=0.78, tapa=1)
    lz.contorno(f, '#4a3a2e', grosor=0.6, presion=0.5)
copa_o = Circulos([(890, 384, 34), (936, 360, 40), (984, 376, 34), (1010, 404, 24), (866, 410, 22), (950, 400, 30)])
lz.aguada(copa_o, '#a9b38a', dens=0.6, tapa=0.7, borde=0.8, irreg=1.6, gran=0.5,
          toques=[(910, 350, 40, '#c9cfa8', 0.6), (990, 410, 40, '#6f8a5a', 0.6)])
for k in range(55):
    x, y = rng.uniform(856, 1024), rng.uniform(330, 426)
    hojita(lz, x, y, rng.uniform(10, 14), rng.uniform(0, 360), rng.choice(['#7a8a5a', '#a9b38a', '#5f7a4a', '#c0c8a0']),
           tapa=0.7, dens=0.75, nervio=False)
for (x, y) in ((884, 382), (960, 356), (1000, 398), (930, 404)):
    lz.aguada(Elipse(x, y, 3.2, 4.2, 20), '#4a3a5a', dens=0.9, tapa=1, irreg=0.2)
TA = (BX + 84, 548)
TB = (POST[0] - 4, 540)
HX0, HX1 = TA[0] + 30, TB[0] - 30
lz.lapiz([[TA, (HX0, 588)], [TA, (HX0 + 4, 600)], [TA, (HX0 - 2, 578)], [TB, (HX1, 588)], [TB, (HX1 - 4, 600)],
          [TB, (HX1 + 2, 578)]], '#a08a6a', grosor=0.8, presion=0.7, temblor=0.2)

# ------------------------------------------------------------------ the sleeper in the hammock
P1 = 'piel2'
atras = Poligono(np.vstack([spline([(HX0, 586), (HX0 + 100, 606), (HX1 - 100, 606), (HX1, 586)]),
                            spline([(HX1, 586), (HX1 - 100, 640), (HX0 + 100, 640), (HX0, 586)])]), suave=False)
lz.aguada(atras, '#d99a4a', dens=0.6, tapa=1, borde=0.7, gran=0.3, toques=[(760, 630, 80, '#b8763a', 0.6)])
lz.contorno(atras, '#8a5a2a', grosor=0.7, presion=0.45, cortes=0.3)
brazo2(lz, (664, 606), (630, 562), (628, 594), 16, '#4f9c9a', P1, 'corta', sombra=-1, mano=None)
torso2(lz, (662, 598), (672, 628), (772, 606), (776, 632), '#4f9c9a', cintura=1.0, sombra=1)
lz.aguada(Trazo([(770, 612), (830, 606), (870, 600)], (26, 22, 16)), '#5a6a9a', dens=0.75, tapa=1)
lz.contorno(Trazo([(770, 612), (830, 606), (870, 600)], (26, 22, 16)), '#3a4a7a', grosor=0.7, presion=0.5)
cojin = Elipse(626, 600, 26, 14, -20)
lz.aguada(cojin, '#ec9fa0', dens=0.7, tapa=1, irreg=0.3, toques=[(630, 606, 12, '#c9707a', 0.6)])
lz.contorno(cojin, '#9a4a5a', grosor=0.6, presion=0.45)
cabeza2(lz, 640, 588, 26, P1, '#7a4a2a', 'corto', giro=0.25, inclina=-62, ojos='dormidos', boca='suave', mejillas=0.6)
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
# an open book rests on his belly (he fell asleep reading); one hand lies on his chest
libro_i = Poligono([(728, 620), (756, 608), (762, 626), (734, 640)], suave=False)
libro_d = Poligono([(756, 608), (786, 602), (790, 620), (762, 626)], suave=False)
lz.aguada(Poligono([(724, 624), (756, 610), (792, 604), (794, 624), (762, 630), (732, 644)], suave=False), '#3f8f8f', dens=0.85, tapa=1,
          irreg=0.3)
for f in (libro_i, libro_d):
    lz.aguada(f, '#fbf3e3', dens=0.35, tapa=1, irreg=0.2)
    lz.contorno(f, '#7c5a4a', grosor=0.6, presion=0.5, cortes=0.1)
lz.lapiz([[(736 + k * 5, 624 - k * 2.2), (752 + k * 5, 617 - k * 2.2)] for k in range(3)] +
         [[(764 + k * 5, 612 - k * 1.2), (782 + k * 5, 608 - k * 1.2)] for k in range(2)], '#a08a7a', grosor=0.45, presion=0.4)
brazo2(lz, (676, 612), (708, 636), (694, 616), 16, '#4f9c9a', P1, 'corta', sombra=1,
       mano=dict(ang=200, gesto='relajada', lado=1, tam=24))
pie(lz, (872, 600), -30, 28, descalzo=True, piel=P1)
pie(lz, (868, 590), -50, 28, descalzo=True, piel=P1)
# a clay pitcher and a glass of water in the grass beside him
jar = Poligono([(744, 778), (740, 750), (750, 736), (748, 726), (764, 726), (762, 736), (772, 750), (768, 778)])
lz.aguada(jar, '#c0703f', dens=0.85, tapa=1, borde=0.7, irreg=0.3, toques=[(766, 756, 10, '#8a4a2a', 0.6)])
lz.contorno(jar, '#7a3a22', grosor=0.7, presion=0.55)
lz.lapiz([arco(772, 748, 6, 9, -90, 90, 10)], '#7a3a22', grosor=0.9, presion=0.6)
vaso = Poligono([(784, 780), (782, 758), (796, 758), (794, 780)], suave=False)
lz.aguada(vaso, '#bfe0e6', dens=0.5, tapa=1, irreg=0.2, toques=[(789, 772, 6, '#7fb5d3', 0.8)])
lz.contorno(vaso, '#6a9aa0', grosor=0.5, presion=0.5)
lz.gouache(Trazo([(785, 762), (785, 776)], (0.9, 0.9)), '#ffffff', alfa=0.8, irreg=0)

# golden dust falls from the crown on the sleeper; his dream rises back into it
sueno = bezier((640, 560), (600, 480), (640, 420), (560, 330), 60)
for k in range(0, 60, 3):
    x, y = sueno[k]
    x += rng.normal(0, 5)
    t = k / 59
    r_ = 1.4 + 2.0 * t
    if k % 12 == 0:
        estrella(lz, x, y, 3 + 3 * t, rng.choice([ORO, '#f6a5b5', '#7fc0c8']), gouache=False)
    else:
        lz.aguada(Elipse(x, y, r_), rng.choice([ORO, '#f2d36b']), dens=0.85, irreg=0.2)
        lz.luz((x, y, r_ * 3), '#fff0b0', fuerza=0.35)
# the golden dust: a gentle fall from the underside of the crown that reaches his forehead
for k in range(70):
    t = rng.uniform(0, 1) ** 0.8
    x = 600 + (630 - 600) * t + rng.normal(0, 40 * (1 - t) + 6)
    y = 360 + (566 - 360) * t
    if rng.random() < 0.3:
        lz.aguada(Elipse(x, y, rng.uniform(1.2, 2.2)), rng.choice([ORO, '#f2d36b']), dens=0.85, irreg=0.2)
        lz.luz((x, y, 5), '#fff0b0', fuerza=0.3)
    else:
        lz.gouache(Elipse(x, y, rng.uniform(0.6, 1.3)), '#fff1b0', alfa=0.85, irreg=0)
lz.luz((628, 570, 18), '#fff0b0', fuerza=0.35)

# ------------------------------------------------------------------ the walkers on the path: grandfather and grandson
PG, PN = 'piel3', 'piel1'
# grandfather: a little stooped, white beard, barefoot on the grass, a walking stick
GX, GY = 1000, 470
pierna2(lz, (994, 622), (982, 694), (966, 770), 29, '#c9a86a', PG, pie_ang=-14, descalzo=True, sombra=-1,
        pie_tam=36)
brazo2(lz, (1014, 532), (1044, 570), (1060, 606), 20, '#8fb0d0', PG, 'tres', sombra=1,
       mano=dict(ang=95, gesto='agarra', lado=1, tam=30))
# the stick
lz.aguada(Trazo([(1058, 600), (1070, 774)], (5, 4)), '#8a5a3a', dens=0.85, tapa=1, irreg=0.2)
lz.lapiz([arco(1052, 600, 8, 6, 180, 360, 10)], '#6a4a2a', grosor=1.6, presion=0.8)
pierna2(lz, (1014, 624), (1030, 698), (1036, 776), 29, '#c9a86a', PG, pie_ang=6, descalzo=True, sombra=1, pie_tam=36)
lz.lapiz([bezier((1000, 640), (996, 670), (990, 690)), bezier((988, 704), (980, 730), (972, 752)), bezier((1020, 650), (1026, 676), (1028, 690)),
          bezier((1030, 708), (1034, 736), (1036, 756)), bezier((976, 756), (968, 760), (962, 764)), bezier((1026, 762), (1036, 764), (1046, 766))],
         '#8a6a3a', grosor=0.6, presion=0.4, temblor=0.3)
cuello(lz, (GX + 14, GY + 12), 27, (GX + 4, GY + 50), PG)
torso2(lz, (976, 518), (1028, 520), (984, 626), (1022, 628), '#8fb0d0', cintura=1.0, sombra=1, escote='v',
       toques=[(1018, 596, 40, '#6a8ab0', 0.6)], pliegues=[[(990, 540), (996, 580), (994, 614)], [(1012, 548), (1016, 600)]])
cabeza2(lz, GX + 14, GY + 12, 27, PG, '#e6e0d8', 'calvo', giro=0.45, inclina=14, ojos='cerrados', boca='abierta', canas=True,
        barba='#ece6de', labios=False)
# the boy: holds his grandfather's hand and points to the sea
BX2, BY2 = 1110, 596
pierna2(lz, (1102, 690), (1092, 732), (1080, 774), 20, None, PN, pie_ang=-10, descalzo=True, sombra=-1, pie_tam=26)
pierna2(lz, (1118, 690), (1132, 728), (1146, 764), 20, None, PN, pie_ang=10, descalzo=True, sombra=1, pie_tam=26)
lz.aguada(Poligono([(1090, 670), (1128, 670), (1134, 702), (1090, 704)]), '#e8735e', dens=0.8, tapa=1, irreg=0.3)
lz.contorno(Poligono([(1090, 670), (1128, 670), (1134, 702), (1090, 704)]), '#9a3a2e', grosor=0.7, presion=0.5)
cuello(lz, (BX2, BY2), 21, (BX2, BY2 + 32), PN)
torso2(lz, (1092, 628), (1128, 630), (1094, 678), (1128, 678), '#f2b33a', cintura=1.0, sombra=1)
cabeza2(lz, BX2, BY2, 21, PN, '#e0a040', 'rizado', giro=0.55, inclina=-10, ojos='abiertos', boca='risa', mira=(1, -1))
brazo2(lz, (1126, 634), (1154, 620), (1184, 600), 14, '#f2b33a', PN, 'corta', sombra=1,
       mano=dict(ang=-30, gesto='senala', lado=-1, tam=21))
# their hands meet
brazo2(lz, (982, 526), (1000, 584), (1056, 640), 20, '#8fb0d0', PG, 'tres', sombra=-1, mano=None)
brazo2(lz, (1094, 636), (1080, 664), (1070, 648), 14, '#f2b33a', PN, 'corta', sombra=-1, mano=None)
mano2(lz, 1058, 640, 20, 28, PG, 'agarra', lado=-1)
mano2(lz, 1072, 650, 200, 20, PN, 'agarra', lado=1)

# ------------------------------------------------------------------ the woman stretching on tiptoe toward the light
PM = 'piel3'
WX, WY = 1262, 694
# long hair blown by the sea breeze (behind)
pelo = Poligono([(1232, 426), (1262, 418), (1300, 432), (1340, 426), (1372, 444), (1340, 450), (1306, 452), (1272, 458),
                 (1246, 454)])
lz.aguada(pelo, '#3a2418', dens=0.8, tapa=1, borde=0.6, gran=0.4, irreg=0.6)
lz.lapiz([bezier((1250, 434), (1300, 426), (1366, 442)), bezier((1252, 444), (1310, 442), (1350, 450)),
          bezier((1260, 428), (1310, 418), (1338, 428))], '#1e120c', grosor=0.6, presion=0.45, temblor=0.4)
lz.aguada(Elipse(1266, 700, 30, 5), '#9a8070', dens=0.6, suave=2)
lz.aguada(Elipse(1050, 778, 110, 10), '#a0a07a', dens=0.3, suave=8)
# legs together, heels up
pierna2(lz, (1262, 562), (1258, 626), (1256, WY - 10), 19, None, PM, pie_ang=118, descalzo=True, sombra=-1, pie_tam=18)
pierna2(lz, (1276, 562), (1276, 628), (1272, WY - 12), 19, None, PM, pie_ang=62, descalzo=True, sombra=1, pie_tam=18)
# arms overhead, bending the whole body into a curve toward the left
brazo2(lz, (1270, 466), (1252, 410), (1218, 364), 13, '#6fb1ad', PM, 'sin', sombra=1,
       mano=dict(ang=-135, gesto='abierta', lado=-1, tam=20, abre=0.4))
cuello(lz, (1238, 440), 19, (1250, 470), PM)
torso2(lz, (1234, 476), (1270, 464), (1258, 554), (1286, 552), '#6fb1ad', cintura=0.82, sombra=1,
       toques=[(1276, 520, 20, '#3f8f8a', 0.6)])
# dress skirt fluttering to the right with the breeze
falda = Poligono([(1254, 544), (1290, 542), (1312, 562), (1340, 580), (1326, 594), (1300, 600), (1262, 604), (1248, 598)])
lz.aguada(falda, '#6fb1ad', dens=0.75, tapa=1, borde=0.7, gran=0.3, toques=[(1310, 570, 20, '#3f8f8a', 0.6)])
lz.contorno(falda, '#2f6f6a', grosor=0.7, presion=0.5, cortes=0.2)
lz.lapiz([bezier((1272, 550), (1290, 570), (1312, 590)), bezier((1262, 554), (1270, 574), (1280, 598))], '#2f6f6a',
         grosor=0.6, presion=0.4)
cabeza2(lz, 1238, 438, 19, PM, '#3a2418', 'corto', giro=-0.35, inclina=-26, ojos='cerrados', boca='sonrisa')
brazo2(lz, (1238, 480), (1212, 424), (1212, 370), 13, '#6fb1ad', PM, 'sin', sombra=-1,
       mano=dict(ang=-110, gesto='abierta', lado=1, tam=20, abre=0.4))
# one swallow flies from the crown toward the light
pajaro(lz, 1090, 300, 13, TEAL, ang=-8)

lz.vineta(margen=26)
lz.guardar(SALIDA)
print('ok', SALIDA)
