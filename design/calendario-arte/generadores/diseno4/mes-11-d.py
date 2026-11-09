"""
Mes 11 -- Politica -- Diseño 4.

Idea: an assembly in a ring around the great tree of what we share, seen a
little from above (a balcony view). Everybody turns toward the girl who has
the word: she holds out, in the cup of her two hands, a glowing seed that is
sprouting -- her proposal for the neighbourhood. Four hands go up together to
vote. The roots of the tree come up through the ground and reach every seat,
the empty stool in front too: that one is the viewer's. The crown of the tree
holds the whole town -- houses with lit windows, the common house, a school,
a little road -- joined by its branches. A few leaves drift down toward the
empty stool, as an invitation.

    python3 mes-11-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, rgb, extremidad,
                      hoja, hojita, flor_simple, ramita, pajaro, cabeza, puntos_dentro, _lapiz_de, PIEL_LAPIZ)
from extra_m1112 import (mano_dedos, brazo, cara, pliegues, sombra, casita, cuello, pieza, cabeza_perfil,
                         cabeza_espalda)

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-11-d.png'

lz = Lienzo(ANCHO, semilla=1111)

CORAL = '#e8735e'
ORO = '#f0c25e'
OCRE = '#d9a441'
TEAL = '#3f8f8c'
ROSA = '#e58fa0'
INDIGO = '#3f4f86'
CARMIN = '#c33c4e'
CORTEZA = '#8a5a3c'
CORTEZA_LP = '#4e3022'
MADERA = '#a8703e'

C = np.array([742.0, 640.0])          # centre of the ring (the foot of the tree)


def pierna(pts, ancho, color, zapato='#5e3f30', pie_ang=0, pie_lado=1):
    """A leg that bends at the knee (hip, knee, ankle) plus a shoe."""
    f = extremidad(lz, pts, (ancho, ancho * 0.86, ancho * 0.66), color, dens=0.74, sombra=False,
                   toques=[(pts[1][0], pts[1][1], ancho, mezcla(color, '#1a1a2a', 0.3), 0.4)])
    a = np.asarray(pts[2], float)
    z = Poligono([a + (-ancho * 0.35 * pie_lado, -ancho * 0.2), a + (ancho * 0.9 * pie_lado, -ancho * 0.1),
                  a + (ancho * 1.05 * pie_lado, ancho * 0.28), a + (-ancho * 0.4 * pie_lado, ancho * 0.3)])
    lz.aguada(z, zapato, dens=0.85, tapa=1, irreg=0.3)
    lz.contorno(z, _lapiz_de(zapato, 0.45), grosor=0.6, presion=0.5)
    return f


def palo(a, b, w=6, col=MADERA):
    f = Trazo([a, b], (w, w * 0.9))
    lz.aguada(f, col, dens=0.7, tapa=1, irreg=0.3)
    lz.contorno(f, '#5a3a24', grosor=0.6, presion=0.5)


def taburete(x, y, rx=34, ry=11, alto=40):
    """A three-legged stool seen from a little above; (x, y) = centre of the seat."""
    for (a, b) in (((x - rx * 0.7, y + 2), (x - rx * 0.95, y + alto)), ((x + rx * 0.7, y + 2), (x + rx * 0.95, y + alto)),
                   ((x, y + ry * 0.6), (x, y + alto + 6))):
        palo(a, b, 6)
    s_ = Elipse(x, y, rx, ry)
    lz.aguada(s_, '#c98a4a', dens=0.75, tapa=1, irreg=0.3, toques=[(x - rx * 0.3, y - 2, rx * 0.5, '#e6b070', 0.6)])
    lz.contorno(s_, '#6a4428', grosor=0.8, presion=0.55)
    lz.lapiz([arco(x, y, rx * 0.75, ry * 0.7, 200, 340, 16), arco(x, y, rx * 0.45, ry * 0.4, 20, 160, 12)],
             '#8a5a30', grosor=0.5, presion=0.35)


# ------------------------------------------------------------------ the ground: almost only paper
lz.aguada(Elipse(C[0], C[1] + 10, 470, 150), '#efd9b4', dens=0.13, suave=50, gran=0.3)

# ------------------------------------------------------------------ roots that reach every seat
SEATS = [(392, 708), (585, 548), (898, 538), (1112, 708), (590, 806), (928, 806)]
rng = np.random.default_rng(7)
raices = []
for (tx, ty) in SEATS:
    v = np.array([tx, ty]) - C
    nrm = np.array([-v[1], v[0]]) / np.hypot(*v)
    bend = rng.uniform(-0.18, 0.18) * np.hypot(*v)
    pts = [C + v * 0.02, C + v * 0.35 + nrm * bend, C + v * 0.7 - nrm * bend * 0.6, C + v * 0.97]
    p = spline(pts)
    raices.append(p)
    w0 = 15 if abs(v[1]) > 60 else 12
    f = Trazo(p[::3], (w0, w0 * 0.55, w0 * 0.32, 2.6))
    lz.aguada(f, CORTEZA, dens=0.72, tapa=1, borde=0.7, irreg=0.6, gran=0.6,
              toques=[(*(C + v * 0.1), 30, '#5e3a28', 0.5)])
    lz.contorno(f, CORTEZA_LP, grosor=0.7, presion=0.45, cortes=0.3)
    # a thread of golden light runs inside every root
    q = p[2:-2]
    lz.lapiz([q], '#f2c45a', grosor=0.8, presion=0.7, temblor=0.2)
    lz.luz(Trazo(q[::4], (7,)), '#ffe2a0', fuerza=0.3, suave=4)
    # the tip curls round the foot of the seat
    end = p[-1]
    d = (p[-1] - p[-4]) / max(np.hypot(*(p[-1] - p[-4])), 1e-6)
    curl = [end, end + d * 8 + nrm * 4, end + d * 6 + nrm * 10, end + nrm * 10]
    lz.lapiz([spline(curl)], CORTEZA_LP, grosor=1.2, presion=0.6, temblor=0.1)
    # little root hairs
    for k in range(4):
        i = int(len(p) * rng.uniform(0.3, 0.85))
        b = p[i]
        lz.lapiz([[b, b + nrm * rng.choice([-1, 1]) * rng.uniform(5, 10) + d * rng.uniform(2, 6)]], CORTEZA_LP,
                 grosor=0.5, presion=0.4)

# ------------------------------------------------------------------ the trunk
tronco = Poligono([(700, 650), (714, 620), (722, 560), (724, 480), (720, 410), (716, 360), (742, 344), (768, 360),
                   (764, 420), (762, 490), (766, 560), (774, 620), (790, 652), (742, 660)])
lz.aguada(tronco, CORTEZA, dens=0.75, tapa=1, borde=0.7, gran=0.7, var=0.5,
          toques=[(758, 470, 40, '#5e3a28', 0.6), (728, 540, 40, '#b07a4a', 0.6)])
lz.aguada(Poligono([(752, 360), (766, 370), (762, 470), (770, 600), (786, 648), (760, 650), (754, 470)]),
          '#4a3a6a', dens=0.3, suave=5, gran=0.5)                       # cool shadow side
lz.contorno(tronco, CORTEZA_LP, grosor=1.0, presion=0.6, cortes=0.25)
bark = []
for k in range(8):
    x0 = 722 + k * 5.5 + rng.normal(0, 1.5)
    bark.append(spline([(x0, 648), (x0 + rng.normal(0, 2), 560), (x0 + rng.normal(0, 2.5), 470),
                        (x0 * 0.85 + 742 * 0.15, 370)]))
lz.lapiz(bark, CORTEZA_LP, grosor=0.7, presion=0.3, temblor=0.9, cortes=0.55)
for (x, y) in ((732, 520), (750, 440)):                                  # knots
    lz.lapiz([arco(x, y, 5, 3.5, 0, 360, 14)], CORTEZA_LP, grosor=0.7, presion=0.5)

# ------------------------------------------------------------------ the crown: branches that fork and thin out
VERDES = ('#4f8f5f', '#7fa86a', '#2f7a6a', '#93b56e', '#5f9a4e', '#a9c46a')
segs, puntas = [], []


def rama(p, ang, L, w, depth, sem):
    r_ = np.random.default_rng(sem)
    d = np.array([math.cos(math.radians(ang)), math.sin(math.radians(ang))])
    n = np.array([-d[1], d[0]])
    end = p + d * L
    mid = p + d * L * 0.5 + n * L * r_.uniform(-0.12, 0.12)
    segs.append(([p, mid, end], (w, w * 0.82, w * 0.66)))
    if depth == 0:
        puntas.append(end)
        return
    da = r_.uniform(18, 30)
    rama(end, ang - da + r_.normal(0, 4), L * r_.uniform(0.66, 0.78), w * 0.64, depth - 1, sem * 3 + 1)
    rama(end, ang + da + r_.normal(0, 4), L * r_.uniform(0.66, 0.78), w * 0.64, depth - 1, sem * 3 + 2)


TOP = np.array([742.0, 352.0])
for k, (a, L, w) in enumerate(((-160, 118, 20), (-128, 128, 23), (-96, 120, 24), (-62, 128, 23), (-22, 118, 20))):
    rama(TOP, a, L, w, 2, 11 + k)

# foliage: soft wet-in-wet clouds round the branch tips (painted first: the branches show through)
P = np.array(puntas)
nubes = Circulos([(x, y, rng.uniform(42, 58)) for (x, y) in P] +
                 [(742, 230, 120), (620, 250, 80), (870, 250, 80), (742, 150, 90)])
lz.aguada(nubes, '#b9d07e', dens=0.5, tapa=1, borde=0.6, irreg=1.4, gran=0.5, var=0.6,
          toques=[(560, 260, 90, '#6f9f5e', 0.7), (930, 270, 90, '#4f8f6a', 0.7), (742, 110, 100, '#d8d27a', 0.6),
                  (660, 180, 70, '#93b56e', 0.6), (840, 160, 70, '#7fa86a', 0.6), (742, 300, 70, '#5f8f5a', 0.6),
                  (500, 190, 50, '#e0b85a', 0.45), (1000, 200, 50, '#d99a4a', 0.4)])
lz.contorno(nubes, '#4f7a4a', grosor=0.8, presion=0.35, cortes=0.55, desfase=0.8)
# branches: tapered, forking, bark in pencil
for pts, ws in segs:
    f = Trazo(pts, ws)
    lz.aguada(f, CORTEZA, dens=0.75, tapa=0.75, borde=0.6, gran=0.6, irreg=0.4)
    lz.contorno(f, CORTEZA_LP, grosor=0.7, presion=0.5, cortes=0.3)
    if ws[0] > 9:
        lz.lapiz([spline(pts)], CORTEZA_LP, grosor=0.5, presion=0.3, temblor=0.6, cortes=0.5)
# second, darker foliage glazes round the outer branches
for i, (x, y) in enumerate(P):
    if i % 2:
        continue
    cl = Circulos([(x + rng.normal(0, 14), y + rng.normal(0, 10), rng.uniform(16, 26)) for _ in range(4)])
    lz.aguada(cl, VERDES[i % len(VERDES)], dens=0.5, irreg=1.0, borde=0.7, gran=0.5)

# the town that lives in the crown (day 1: polis; day 28: schools, roads)
CASAS_IDX = [1, 5, 9, 13, 17]
pos = [P[i] for i in CASAS_IDX]
estilos = [dict(w=34, h=24, pared='#f6e2bd', tejado=CORAL, ventanas=1),
           dict(w=34, h=26, pared='#f6e6c6', tejado=TEAL, ventanas=1),
           dict(w=58, h=30, pared='#f8ead0', tejado='#b8503e', ventanas=3),      # the common house, long and low
           dict(w=40, h=26, pared='#fbf1e0', tejado='#d06a52', ventanas=2),      # the school
           dict(w=32, h=24, pared='#f1d6ae', tejado='#8d73b0', ventanas=1)]
# a little road from house to house
rd = spline([p + (0, 4) for p in pos])
lz.aguada(Trazo(rd[::4], (5, 5)), '#e6c48a', dens=0.75, tapa=1, irreg=0.3)
lz.lapiz([rd + (0, 2.4), rd - (0, 2.4)], '#8a6040', grosor=0.5, presion=0.4, temblor=0.2, cortes=0.3)
for p_, e in zip(pos, estilos):
    casita(lz, p_[0], p_[1] + 6, e['w'], e['h'], pared=e['pared'], tejado=e['tejado'], ventanas=e['ventanas'])
# the common house has a round window lit like a moon
cx_, cy_ = pos[2][0], pos[2][1] + 6
lz.aguada(Elipse(cx_, cy_ - 30 - 8, 5, 5), '#f6c65a', dens=0.9, tapa=1, toques=[(cx_, cy_ - 38, 3, '#fff0b0', 0.8)])
lz.luz((cx_, cy_ - 38, 8), '#ffe6a0', fuerza=0.5)
# leaves: fewer, varied (leaves, sprigs, little flowers, berries, a few autumn ones)
pts_h = puntos_dentro(nubes - Circulos([(x, y + 4, 34) for (x, y) in pos]), 70, 41, margen=4)
for (x, y) in pts_h:
    k = rng.random()
    if k < 0.45:
        col = VERDES[rng.integers(len(VERDES))] if rng.random() < 0.75 else rng.choice([OCRE, '#e0884a', '#c9a23a'])
        hoja(lz, x, y, rng.uniform(16, 32), rng.uniform(0, 360), col, ancho=rng.uniform(0.28, 0.45), tapa=0.7)
    elif k < 0.62:
        a = rng.uniform(0, 360)
        d = np.array([math.cos(math.radians(a)), math.sin(math.radians(a))]) * rng.uniform(18, 28)
        ramita(lz, [(x, y), (x + d[0] * 0.5 + d[1] * 0.15, y + d[1] * 0.5 - d[0] * 0.15), (x + d[0], y + d[1])],
               VERDES[rng.integers(len(VERDES))], hojas=5, largo=7)
    elif k < 0.8:
        flor_simple(lz, x, y, rng.uniform(4, 6.5), rng.choice([CORAL, ORO, '#f39ab0', '#fff0d0']), centro='#f0a83a')
    else:
        for _ in range(3):
            lz.aguada(Elipse(x + rng.normal(0, 3.5), y + rng.normal(0, 3.5), rng.uniform(2.2, 3.2)), CARMIN, dens=0.9,
                      irreg=0.3, tapa=0.6)
for k in range(40):
    x, y = pts_h[rng.integers(len(pts_h))]
    lz.gouache(Elipse(x + rng.normal(0, 8), y + rng.normal(0, 8), rng.uniform(0.6, 1.3)), '#fff4c8', alfa=0.85,
               irreg=0)
lz.aguada(Elipse(742, 220, 380, 190), '#f6d27a', dens=0.08, suave=60, gran=0.05)

# ------------------------------------------------------------------ G: the girl who has the word (back, right)
sombra(lz, 900, 540, 40, 6)
pierna([(896, 498), (894, 516), (892, 534)], 10, '#e6b48a', zapato=CARMIN, pie_lado=-1)
pierna([(912, 498), (914, 516), (915, 534)], 10, '#e6b48a', zapato=CARMIN, pie_lado=1)
pieza(lz, [(890, 436), (904, 432), (920, 436), (928, 470), (938, 504), (904, 510), (872, 504), (882, 470)],
      '#f2b93a', toques=[(930, 490, 26, '#d98a2c', 0.6), (896, 450, 20, '#f8d77a', 0.5)])
pliegues(lz, [[(898, 470), (892, 490), (886, 506)], [(912, 470), (918, 490), (924, 506)]], '#a86a20')
for (x, y) in ((888, 490), (906, 482), (922, 496), (898, 502), (914, 466)):
    flor_simple(lz, x, y, 3.2, CORAL, centro='#fff3cf')
cuello(lz, 904, 404, 25, 'piel3', (905, 434))
cabeza(lz, 904, 404, 25, piel='piel3', pelo='#2a1a14', peinado='coleta', giro=-0.2, inclina=-6, ojos='abiertos',
       boca='abierta', mira=(-0.6, 0.4))
# arms bend in, the two hands make a cup in front of her chest
brazo(lz, (890, 444), (880, 470), (894, 482), 11, '#f2b93a', pliegue=False)
brazo(lz, (918, 444), (930, 470), (916, 482), 11, '#f2b93a', pliegue=False)
mano_dedos(lz, 892, 484, -8, 19, 'piel3', 'relajada', lado=1, curl=-18, abre=0.3)
mano_dedos(lz, 918, 484, 188, 19, 'piel3', 'relajada', lado=-1, curl=-18, abre=0.3)
# the seed: a small acorn-like seed that glows from inside, with a two-leaf sprout
lz.luz((905, 474, 30), '#ffd27a', fuerza=0.75)
lz.aguada(Elipse(905, 474, 40, 34), '#f6c65a', dens=0.2, suave=14, gran=0.05)
semilla = Elipse(905, 477, 5.5, 4.5)
lz.aguada(semilla, '#d99a3a', dens=0.8, tapa=1, irreg=0.2, toques=[(904, 476, 3, '#fff0b0', 0.9)])
lz.contorno(semilla, '#8a5a22', grosor=0.5, presion=0.5)
lz.lapiz([spline([(905, 473), (904, 465), (906, 458)])], '#3e6a48', grosor=0.9, presion=0.7, temblor=0.1)
hojita(lz, 906, 459, 9, -30, '#6fb05e', nervio=False, tapa=1)
hojita(lz, 905, 460, 8, -150, '#8fc06e', nervio=False, tapa=1)
lz.luz((905, 472, 9), '#fff2c4', fuerza=0.7)
lz.chispas(905, 466, 22, 16, n=7, luz=0.25)

# ------------------------------------------------------------------ W: young woman in a headscarf (back, left)
taburete(585, 520, 26, 8, 30)
pieza(lz, [(556, 492), (600, 488), (626, 500), (640, 524), (640, 546), (604, 552), (566, 548), (552, 520)], ROSA,
      toques=[(632, 536, 26, '#c8607a', 0.55)])                              # skirt over the knees
pliegues(lz, [[(600, 500), (620, 520), (634, 546)], [(580, 504), (590, 528), (588, 550)]], '#a8506a')
for x in (604, 624):
    z = Elipse(x, 554, 9, 4.5)
    lz.aguada(z, '#7a3f3a', dens=0.8, tapa=1, irreg=0.3)
pieza(lz, [(560, 448), (582, 442), (604, 448), (610, 472), (608, 500), (580, 504), (556, 500), (554, 472)],
      '#f0b44a', toques=[(560, 480, 20, '#d9902c', 0.5)])                     # blouse
mano_dedos(lz, 606, 520, 20, 22, 'piel2', 'relajada', lado=-1)               # hand on her knee
brazo(lz, (562, 456), (566, 492), (604, 518), 13, '#f0b44a', pliegue=False)
cuello(lz, 584, 416, 25, 'piel2', (584, 444))
cabeza(lz, 584, 416, 25, piel='piel2', pelo='#2f7f86', peinado='pañuelo', giro=0.6, inclina=8, ojos='abiertos',
       boca='sonrisa', mira=(1, 0.3))

# ------------------------------------------------------------------ A: the grandmother, in profile (left)
sombra(lz, 404, 724, 80, 9)
palo((322, 560), (318, 722), 6)                                          # the chair's back posts
palo((334, 566), (332, 712), 5)
lz.aguada(Trazo([(318, 576), (336, 580)], (5, 5)), MADERA, dens=0.7, tapa=1)
lz.aguada(Trazo([(318, 606), (336, 610)], (5, 5)), MADERA, dens=0.7, tapa=1)
for (a, b) in (((392, 654), (396, 722)), ((372, 660), (374, 716))):
    palo(a, b, 6)
pierna([(436, 650), (452, 676), (452, 704)], 12, '#d8b49a', zapato='#7a3f3a', pie_lado=1)   # shins under the skirt
pieza(lz, [(328, 612), (384, 610), (430, 612), (456, 626), (462, 650), (464, 686), (430, 690), (420, 664),
           (380, 660), (330, 654)], INDIGO, toques=[(450, 670, 30, '#2c3a6a', 0.6), (380, 626, 40, '#5a6aa8', 0.5)])
pliegues(lz, [[(342, 640), (392, 636), (440, 630), (454, 640)], [(440, 640), (446, 664), (440, 688)],
              [(400, 650), (412, 668), (424, 684)]], '#28305a')               # the knee shows under the skirt
for (x, y) in ((360, 630), (404, 624), (446, 660), (424, 640), (380, 646), (438, 680)):
    flor_simple(lz, x, y, 3.3, rng.choice([ORO, '#f6c0c8']), centro='#fff3cf')
pieza(lz, [(332, 540), (356, 534), (376, 544), (386, 572), (386, 610), (360, 622), (330, 616), (322, 590),
           (324, 560)], CORAL, toques=[(330, 590, 30, '#c4503e', 0.55), (372, 556, 24, '#f39a7a', 0.5)])
pliegues(lz, [[(364, 552), (372, 584), (376, 612)]], '#9a3a2e', presion=0.5)
mano_dedos(lz, 404, 618, 8, 26, 'piel1', 'relajada', lado=-1)            # far hand rests on her knee
cuello(lz, 350, 500, 33, 'piel1', (354, 540), ancho=0.4)
cabeza_perfil(lz, 352, 498, 33, piel='piel1', pelo='#dcd6d0', peinado='mono', lado=1, inclina=-6, canas=True,
              gafas=True, ojos='abiertos', boca='sonrisa')
brazo(lz, (362, 550), (404, 520), (414, 446), 17, CORAL)                 # she votes
mano_dedos(lz, 414, 448, -88, 32, 'piel1', 'abierta', lado=-1)

# ------------------------------------------------------------------ R: the young man, in profile (right)
sombra(lz, 1090, 724, 85, 9)
caja = Poligono([(1094, 640), (1176, 636), (1180, 712), (1098, 716)], suave=False)
lz.aguada(caja, '#c99a5a', dens=0.6, tapa=1, irreg=0.4, toques=[(1170, 690, 30, '#a8703e', 0.5)])
lz.rayado(caja, '#8a6a3a', angulo=2, sep=12, presion=0.5, grosor=0.8)
lz.contorno(caja, '#6a4428', grosor=0.8, presion=0.55)
JEAN = '#4a6a9a'
pierna([(1130, 628), (1058, 622), (1056, 698)], 22, mezcla(JEAN, '#202a40', 0.25), zapato='#6e4c3c', pie_lado=-1)
pierna([(1140, 636), (1068, 634), (1066, 708)], 23, JEAN, zapato='#6e4c3c', pie_lado=-1)
pliegues(lz, [[(1090, 626), (1080, 640)], [(1072, 640), (1062, 650), (1066, 664)]], '#2a3a5a')
pieza(lz, [(1106, 546), (1130, 538), (1154, 548), (1160, 590), (1158, 636), (1126, 644), (1100, 636), (1098, 590)],
      TEAL, toques=[(1156, 600, 26, '#2a6a6a', 0.55), (1110, 556, 20, '#6fb1ad', 0.5)])
lz.rayado(Poligono([(1100, 622), (1158, 620), (1158, 636), (1100, 638)], suave=False), '#2a6a6a', angulo=90, sep=3,
          presion=0.45)
mano_dedos(lz, 1086, 628, 188, 26, 'piel2', 'relajada', lado=1)          # far hand on his thigh
cuello(lz, 1124, 502, 33, 'piel2', (1128, 542), ancho=0.42)
cabeza_perfil(lz, 1124, 500, 33, piel='piel2', pelo='#1e1410', peinado='corto', lado=-1, inclina=6, ojos='abiertos',
              boca='sonrisa')
brazo(lz, (1118, 552), (1078, 520), (1070, 450), 17, TEAL)               # he votes
mano_dedos(lz, 1070, 452, -92, 32, 'piel2', 'abierta', lado=1)

# ------------------------------------------------------------------ the empty stool: the viewer's seat
sombra(lz, 930, 812, 46, 7)
taburete(930, 772, 38, 12, 40)
hoja(lz, 918, 768, 24, -10, '#e0a83a', ancho=0.4)

# ------------------------------------------------------------------ B: the man seen from behind (front, left)
sombra(lz, 580, 818, 80, 9)
taburete(580, 772, 40, 12, 40)
# the raised arm goes behind his head? no: in front of the sky, drawn after the back
lomo = pieza(lz, [(532, 664), (556, 650), (580, 646), (606, 650), (630, 666), (634, 700), (628, 760), (580, 772),
                  (534, 764), (526, 712)], '#e2a03a',
             toques=[(540, 720, 40, '#c07a2a', 0.55), (612, 680, 30, '#f2c46a', 0.5)])
pliegues(lz, [[(580, 660), (578, 710), (580, 768)], [(546, 700), (560, 730), (552, 762)],
              [(612, 712), (604, 740), (610, 764)]], '#9a6a1a', presion=0.5)
lz.rayado(Poligono([(534, 744), (628, 744), (628, 764), (580, 772), (534, 764)], suave=False), '#b07a2a', angulo=90,
          sep=3, presion=0.45)                                              # ribbed hem of the jumper
brazo(lz, (538, 672), (524, 718), (540, 752), 19, '#e2a03a', pliegue=False)   # far arm resting
cuello(lz, 580, 612, 35, 'piel5', (580, 652), ancho=0.5)
cabeza_espalda(lz, 580, 610, 35, piel='piel5', pelo='#1e1410', peinado='rizado', giro=0.6)
brazo(lz, (622, 672), (660, 620), (664, 528), 19, '#e2a03a')               # he votes too
mano_dedos(lz, 664, 530, -90, 36, 'piel5', 'abierta', lado=-1)

# ------------------------------------------------------------------ leaves drift down to the empty stool
camino = spline([(990, 330), (1010, 430), (985, 540), (1000, 640), (950, 730)])
for k, t in enumerate((0.0, 0.22, 0.45, 0.68, 0.88)):
    x, y = camino[int(t * (len(camino) - 1))]
    hoja(lz, x, y, 18 + 4 * k, 40 + 70 * k, rng.choice(['#e0a83a', '#7fa86a', '#c9a23a', '#e0884a', '#93b56e']),
         ancho=0.42, tapa=0.9)
lz.lapiz([camino], '#d9a441', grosor=0.5, presion=0.18, temblor=0.8, cortes=0.65)

# clean air: birds leave the crown
pajaro(lz, 1140, 150, 14, TEAL, ang=-14)
pajaro(lz, 1196, 116, 11, CORAL, ang=-6, alas='abajo')

lz.vineta(margen=30)
lz.guardar(SALIDA)
print('ok', SALIDA)
