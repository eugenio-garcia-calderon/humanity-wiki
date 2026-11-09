"""
Mes 11 -- Politica -- Diseño 4.

Idea: an assembly under the great tree of what we share. Four neighbours of
every age sit in a ring open towards us (the empty stool in front is the
viewer's seat). A girl has the word: she offers the circle a seed that is
already sprouting, her proposal for the neighbourhood. A grandmother and a
young woman raise their hands to vote, and the leaves that leave their hands
fly up to become part of the tree. A young man listens with his chin on his
hand. The crown of the tree holds the whole town -- houses with lit windows,
a school with its bell, a health centre -- joined by its branches: the polis
is a living thing everybody keeps growing.

    python3 mes-11-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, rgb, jardin,
                      hoja, hojita, flor_simple, pajaro, estrella, remuestrea, _lapiz_de, PIEL_LAPIZ)
from extra_m1112 import mano_dedos, brazo, cara, pliegues, sombra, casita

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
LP = '#5e3f30'


def pieza(pts, color, dens=0.74, toques=None, tapa=1.0, lapiz=None, suave_pol=True, flor=0, **kw):
    f = Poligono(pts, suave=suave_pol)
    lz.aguada(f, color, dens=dens, tapa=tapa, toques=toques, flor=flor, **kw)
    lz.contorno(f, lapiz or _lapiz_de(color), grosor=0.9, presion=0.55, cortes=0.3)
    return f


def cuello(x, y, r, piel, base, ancho=0.46):
    """A slender neck from under the head (x, y, r) down to the collar point."""
    f = Trazo([(x, y + r * 0.55), base], (r * ancho, r * ancho * 1.12))
    lz.aguada(f, piel, dens=0.58, tapa=1, irreg=0.4, borde=0.4,
              toques=[(x, y + r * 0.95, r * 0.45, mezcla(piel, '#8a4a32', 0.55), 0.7)])
    lz.contorno(f, PIEL_LAPIZ, grosor=0.7, presion=0.4, cortes=0.4)


# ------------------------------------------------------------------ the ground of the square
# only a warm disc of trodden earth under the ring; the rest of the sheet stays bare
suelo = Elipse(745, 700, 500, 112)
lz.aguada(suelo, '#e9c99a', dens=0.32, borde=0.3, irreg=1.8, gran=0.6, var=0.6, suave=0,
          toques=[(745, 690, 260, '#f2dcb4', 0.6), (420, 730, 140, '#e2b98c', 0.5)])
# roots: the tree reaches every seat
raices = []
rr_ = np.random.default_rng(7)
for (tx, ty) in ((380, 760), (600, 650), (900, 680), (1120, 762), (745, 790)):
    b = bezier((745 + (tx - 745) * 0.06, 614), (745 + (tx - 745) * 0.35, 628 + (ty - 628) * 0.15),
               (745 + (tx - 745) * 0.7, ty - 25), (tx, ty), 40)
    b = b + rr_.normal(0, 1.2, b.shape)
    raices.append(b)
lz.lapiz(raices, '#a8784e', grosor=1.0, presion=0.28, temblor=1.4, cortes=0.55)
for r_ in raices:
    lz.aguada(Trazo(r_[:14], (18, 3)), '#9a6a48', dens=0.45, irreg=1.2, gran=0.6)

# ------------------------------------------------------------------ the tree: trunk and branches
tronco = Poligono([(668, 620), (700, 596), (716, 540), (718, 460), (712, 390), (706, 340), (736, 322),
                   (772, 322), (796, 340), (790, 400), (786, 470), (790, 548), (806, 598), (840, 622),
                   (790, 616), (752, 624), (712, 616)])
lz.aguada(tronco, CORTEZA, dens=0.75, tapa=1, borde=0.7, gran=0.7, var=0.5,
          toques=[(770, 450, 40, '#5e3a28', 0.6), (724, 520, 40, '#b07a4a', 0.6), (760, 340, 30, '#6e4a34', 0.5)])
lz.contorno(tronco, '#4e3022', grosor=1.0, presion=0.6, cortes=0.3)
# bark: pencil furrows
rng = np.random.default_rng(11)
corteza = []
for k in range(9):
    x0 = 720 + k * 8 + rng.normal(0, 2)
    corteza.append(spline([(x0, 610), (x0 + rng.normal(0, 3), 520), (x0 + rng.normal(0, 4), 430),
                           (x0 * 0.8 + 752 * 0.2, 340)]))
lz.lapiz(corteza, '#4e3022', grosor=0.8, presion=0.3, temblor=0.8, cortes=0.5)
lz.aguada(Poligono([(770, 330), (792, 340), (788, 470), (792, 560), (812, 608), (780, 612), (772, 470)]), '#4a3a6a',
          dens=0.35, suave=6, gran=0.5)                                   # cool violet shadow side
lz.levanta(Trazo([(726, 600), (730, 480), (726, 360)], (8, 6)), 0.35, suave=4)   # warm light side

# ------------------------------------------------------------------ the crown: one glowing garden
VERDES = ('#4f8f5f', '#7fa86a', '#2f7a6a', '#93b56e', '#5f9a4e')
FLORES = (CORAL, ORO, '#f39ab0', CARMIN)
rng = np.random.default_rng(31)
cs = []
for k in range(26):
    t = k / 26 * 2 * np.pi
    cs.append((770 + math.cos(t) * 262 * rng.uniform(0.92, 1.05), 196 + math.sin(t) * 100 * rng.uniform(0.9, 1.05),
               rng.uniform(40, 56)))
cs.append((770, 196, 190))
cs += [(620, 196, 105), (920, 196, 105), (770, 160, 110), (770, 240, 100)]
copa = Circulos(cs)
lz.aguada(copa, '#b5cf7a', dens=0.62, tapa=1, borde=0.7, irreg=1.2, gran=0.5, var=0.6, flor=2,
          toques=[(560, 220, 90, '#5f9a5e', 0.75), (980, 230, 90, '#3f8a6a', 0.75), (770, 120, 110, '#d8d27a', 0.6),
                  (700, 260, 80, '#7fb06a', 0.6), (880, 100, 70, '#4f8f5f', 0.7), (640, 90, 60, '#93b56e', 0.6),
                  (1010, 150, 60, '#e0c060', 0.5), (560, 140, 50, '#e8b04a', 0.55), (920, 290, 50, '#d98a4a', 0.4)])
# second glaze: darker green in the shady lower half
lz.aguada(Elipse(770, 280, 280, 60), '#3e7a5a', dens=0.32, suave=30, gran=0.4)
lz.contorno(copa, '#3e6a48', grosor=0.9, presion=0.45, cortes=0.5, desfase=0.8)
# branches inside the crown, each one reaching a house (they are the network that joins the town)
CASAS = [(560, 224, 36, 26, '#f6e2bd', CORAL, 1, {}), (676, 156, 46, 30, '#f3dcb0', '#b8503e', 2, {'campana': True}),
         (840, 132, 34, 26, '#f6e6c6', TEAL, 1, {}), (912, 210, 30, 22, '#f1d6ae', OCRE, 1, {}),
         (1000, 232, 44, 28, '#fbf1e0', '#d06a52', 2, {'cruz': True}), (756, 262, 32, 24, '#f6e2bd', '#8d73b0', 1, {})]
ramas = []
for (hx, hy, *_r) in CASAS:
    a_ = (752, 335)
    m = ((752 + hx) / 2 + (hx - 752) * 0.08, (335 + hy) / 2 + 26)
    ramas.append(Trazo([a_, m, (hx, hy + 4)], (30, 14, 5)))
for f in ramas:
    lz.aguada(f, CORTEZA, dens=0.72, tapa=1, borde=0.6, gran=0.6, toques=[(752, 335, 40, '#5e3a28', 0.5)])
    lz.contorno(f, '#4e3022', grosor=0.8, presion=0.5, cortes=0.3)
# leaves everywhere except over the houses and the branches
evita = Circulos([(hx, hy - h * 0.6, w * 0.9) for (hx, hy, w, h, *_r) in CASAS])
for f in ramas:
    evita = evita | f
zona = copa - evita
P = __import__('acuarela').puntos_dentro(zona, 230, 41, margen=2)
for i, (x, y) in enumerate(P):
    k = rng.random()
    if k < 0.74:
        col = VERDES[rng.integers(len(VERDES))] if rng.random() < 0.8 else rng.choice([OCRE, '#e0884a', '#c9a23a'])
        hoja(lz, x, y, rng.uniform(20, 34), rng.uniform(0, 360), col,
             toque=rng.choice([None, '#e0c060', '#2f5a4a']), tapa=0.7)
    elif k < 0.86:
        flor_simple(lz, x, y, rng.uniform(4, 7), FLORES[rng.integers(len(FLORES))], centro='#fff3cf')
    else:
        for _ in range(3):
            lz.aguada(Elipse(x + rng.normal(0, 4), y + rng.normal(0, 4), rng.uniform(2, 3.2)), CARMIN, dens=0.9,
                      irreg=0.3, tapa=0.6)
# leaves breaking out of the silhouette, pointing outward
for t in np.linspace(0, 2 * np.pi, 40, endpoint=False):
    x, y = 770 + math.cos(t) * 276, 196 + math.sin(t) * 116
    if y > 280 and abs(x - 770) < 120:
        continue
    hoja(lz, x - math.cos(t) * 10, y - math.sin(t) * 10, rng.uniform(22, 32), math.degrees(t) + rng.normal(0, 25),
         VERDES[rng.integers(len(VERDES))], tapa=0.8)
for k in range(60):
    x, y = P[rng.integers(len(P))]
    lz.gouache(Elipse(x + rng.normal(0, 6), y + rng.normal(0, 6), rng.uniform(0.6, 1.3)), '#fff4c8', alfa=0.85, irreg=0)

# the town that lives in the crown (day 1: polis; day 28: schools, hospitals, roads)
for (hx, hy, w, h, pared, tejado, nv, kw) in CASAS:      # the school has a bell, the health centre a cross
    casita(lz, hx, hy, w, h, pared=pared, tejado=tejado, ventanas=nv, **kw)
# a little road winds from house to house
camino = [(578, 222), (620, 200), (652, 156)], [(700, 156), (770, 150), (822, 132)], \
         [(858, 132), (890, 166), (904, 208)], [(927, 210), (960, 218), (978, 232)]
for c in camino:
    p = spline(c) if len(c) > 2 else np.asarray(c, float)
    lz.aguada(Trazo(p, (5, 5)), '#e6c48a', dens=0.8, tapa=1, irreg=0.3)
    lz.lapiz([p + (0, 2.4), p - (0, 2.4)], '#8a6040', grosor=0.5, presion=0.4, temblor=0.2)
# the windows glow: a golden breath around the crown
lz.aguada(Elipse(770, 190, 360, 175), '#f6d27a', dens=0.12, suave=50, gran=0.05)

# ------------------------------------------------------------------ C: the young woman in a headscarf (back left)
sombra(lz, 595, 650, 85, 12)
pieza([(545, 600), (565, 572), (600, 566), (636, 574), (660, 600), (672, 640), (600, 652), (528, 642)],
      ROSA, toques=[(640, 630, 40, '#c8607a', 0.5)])                          # her skirt, sitting on the ground
pieza([(562, 496), (596, 488), (628, 496), (638, 540), (640, 592), (600, 602), (558, 594), (554, 540)],
      '#f0b44a', toques=[(570, 560, 30, '#d9902c', 0.5)])                     # blouse
cuello(600, 452, 32, 'piel2', (598, 494))
pliegues(lz, [[(600, 580), (590, 610), (575, 640)], [(620, 585), (628, 615), (640, 640)]], '#a8506a')
# the hand that rests on her knee
brazo(lz, (568, 506), (560, 560), (596, 598), 18, '#f0b44a')
mano_dedos(lz, 596, 598, 15, 30, 'piel2', 'relajada', lado=-1)
cara(lz, 600, 452, 32, piel='piel2', pelo='#2f7f86', peinado='pañuelo', giro=0.35, inclina=6, ojos='abiertos',
     boca='sonrisa', mira=(1, 0))
# her raised hand: she votes yes
brazo(lz, (624, 506), (664, 462), (668, 398), 18, '#f0b44a')
mano_dedos(lz, 668, 400, -94, 36, 'piel2', 'abierta', lado=-1)

# ------------------------------------------------------------------ D: the girl who has the word (back right)
sombra(lz, 908, 680, 55, 9)
for (p0, p1, sh) in (((896, 590), (892, 668), 180), ((918, 590), (924, 670), 0)):
    lz.aguada(Trazo([p0, p1], (13, 10)), 'piel3', dens=0.55, tapa=1, irreg=0.4)
    lz.contorno(Trazo([p0, p1], (13, 10)), PIEL_LAPIZ, grosor=0.7, presion=0.45, cortes=0.3)
    z = Elipse(p1[0] + (8 if sh == 0 else -8), p1[1] + 5, 13, 6)
    lz.aguada(z, CARMIN, dens=0.85, tapa=1, irreg=0.3)
    lz.contorno(z, '#7a1f30', grosor=0.6, presion=0.5)
vestido = pieza([(882, 478), (906, 472), (930, 478), (938, 520), (952, 570), (966, 604), (930, 612), (900, 614),
                 (858, 606), (868, 568), (876, 520)], '#f2b93a',
                toques=[(950, 590, 40, '#d98a2c', 0.6), (880, 500, 30, '#f8d77a', 0.5)])
pliegues(lz, [[(900, 530), (890, 570), (878, 604)], [(918, 532), (926, 575), (944, 606)]], '#a86a20')
for (x, y) in ((884, 556), (912, 548), (930, 584), (898, 590), (942, 560), (874, 588), (918, 600)):
    flor_simple(lz, x, y, 4.2, CORAL, centro='#fff3cf')
cuello(905, 440, 30, 'piel3', (906, 478))
cara(lz, 905, 440, 30, piel='piel3', pelo='#2a1a14', peinado='coleta', giro=-0.4, inclina=-6,
     ojos='abiertos', boca='abierta', mira=(-1, 0))
# both hands offer the sprouting seed to the circle (her proposal)
brazo(lz, (916, 488), (910, 540), (872, 536), 15, '#f2b93a', piel='piel3', manga='corta')
mano_dedos(lz, 874, 538, 186, 32, 'piel3', 'relajada', lado=1, curl=-10, abre=0.4)   # palm up, the seed on it
semilla = Elipse(850, 522, 13, 10, -10)
lz.aguada(semilla, '#b97a3a', dens=0.85, tapa=1, irreg=0.3, toques=[(846, 518, 7, '#f6d27a', 0.8)])
lz.contorno(semilla, '#6a3a1a', grosor=0.7, presion=0.55)
brote = spline([(852, 512), (848, 494), (856, 476), (852, 456)])
lz.lapiz([brote], '#3e6a48', grosor=1.3, presion=0.75, temblor=0.2)
hojita(lz, 854, 474, 20, -40, '#5f9f63')
hojita(lz, 850, 490, 16, -150, '#7fb56e')
lz.luz((850, 496, 36), '#ffe7a8', fuerza=0.6)
lz.aguada(Elipse(850, 496, 44, 40), '#f6d27a', dens=0.18, suave=14, gran=0.05)

# ------------------------------------------------------------------ the empty stool: the seat that waits for you
sombra(lz, 745, 790, 48, 8)
for (a, b) in (((716, 744), (706, 790)), ((774, 744), (786, 788)), ((748, 750), (748, 798))):
    lz.aguada(Trazo([a, b], (7, 6)), '#a8703e', dens=0.7, tapa=1, irreg=0.3)
    lz.contorno(Trazo([a, b], (7, 6)), '#6a4428', grosor=0.6, presion=0.5)
asiento = Elipse(745, 742, 40, 13)
lz.aguada(asiento, '#c98a4a', dens=0.75, tapa=1, irreg=0.3, toques=[(735, 738, 20, '#e6b070', 0.6)])
lz.contorno(asiento, '#6a4428', grosor=0.8, presion=0.55)
lz.lapiz([arco(745, 742, 30, 9, 200, 340, 16), arco(745, 742, 18, 5, 20, 160, 12)], '#8a5a30', grosor=0.5,
         presion=0.35)
hoja(lz, 734, 738, 26, -12, '#e0a83a', ancho=0.38)

# ------------------------------------------------------------------ A: the grandmother votes (front left)
sombra(lz, 395, 778, 120, 14)
# her chair
for (a, b, w) in (((288, 640), (282, 772), 8), ((312, 646), (316, 760), 7), ((392, 640), (396, 766), 7)):
    lz.aguada(Trazo([a, b], (w, w * 0.9)), '#a8703e', dens=0.7, tapa=1, irreg=0.3)
    lz.contorno(Trazo([a, b], (w, w * 0.9)), '#6a4428', grosor=0.6, presion=0.5)
lz.aguada(Poligono([(282, 628), (400, 626), (402, 642), (284, 646)], suave=False), '#b88048', dens=0.7, tapa=1)
# skirt over her lap, hem to the ankles
falda = pieza([(292, 572), (384, 566), (432, 576), (468, 594), (482, 630), (480, 690), (492, 756), (446, 768),
               (398, 762), (388, 708), (372, 662), (330, 650), (292, 640)], INDIGO,
              toques=[(470, 700, 50, '#2c3a6a', 0.6), (360, 600, 50, '#5a6aa8', 0.5)])
rng = np.random.default_rng(5)
for _ in range(16):
    x, y = rng.uniform(330, 470), rng.uniform(590, 750)
    if y > 660 and x < 400:
        continue
    flor_simple(lz, x, y, rng.uniform(3.2, 4.6), rng.choice([ORO, '#f6c0c8', CORAL]), centro='#fff3cf')
pliegues(lz, [[(440, 640), (452, 700), (462, 758)], [(410, 650), (418, 708), (420, 760)],
              [(380, 600), (420, 610), (466, 606)]], '#28305a')
for (x, ang) in ((432, 0), (470, 0)):                                              # shoes
    z = Elipse(x + 6, 768, 16, 7, ang)
    lz.aguada(z, '#7a3f3a', dens=0.8, tapa=1, irreg=0.3)
    lz.contorno(z, '#4a2420', grosor=0.6, presion=0.5)
# cardigan
pieza([(300, 462), (336, 456), (372, 462), (388, 480), (394, 522), (390, 572), (340, 584), (292, 578),
       (282, 530), (286, 488)], CORAL, toques=[(296, 540, 40, '#c4503e', 0.6), (360, 480, 30, '#f39a7a', 0.5)])
pliegues(lz, [[(338, 470), (340, 520), (338, 578)]], '#9a3a2e', presion=0.55)
for y in (492, 516, 540, 564):
    lz.aguada(Elipse(344, y, 3, 3), '#f6e2bd', dens=0.9, irreg=0.1)
# the hand on her lap
brazo(lz, (300, 482), (310, 556), (372, 590), 25, CORAL)
mano_dedos(lz, 372, 590, 12, 40, 'piel1', 'relajada', lado=-1)
cuello(334, 402, 40, 'piel1', (338, 460))
cara(lz, 334, 402, 40, piel='piel1', pelo='#dcd6d0', peinado='mono', canas=True, giro=0.42, inclina=-4,
     ojos='cerrados', boca='sonrisa')
lz.lapiz([arco(346, 404, 9, 7.5, 0, 360, 22), arco(368, 403, 8, 7, 0, 360, 20), [(355, 404), (360, 404)]],
         '#8a6a4a', grosor=0.7, presion=0.6, temblor=0.05)                         # her round glasses
# her raised hand
brazo(lz, (378, 478), (436, 436), (446, 352), 25, CORAL)
mano_dedos(lz, 446, 354, -96, 48, 'piel1', 'abierta', lado=-1)

# ------------------------------------------------------------------ B: the young man listens (front right)
sombra(lz, 1140, 778, 125, 14)
# a wooden crate as his seat
caja = Poligono([(1150, 610), (1246, 604), (1250, 762), (1154, 768)], suave=False)
lz.aguada(caja, '#c99a5a', dens=0.6, tapa=1, irreg=0.4, toques=[(1230, 700, 40, '#a8703e', 0.5)])
lz.rayado(caja, '#8a6a3a', angulo=2, sep=13, presion=0.5, grosor=0.9)
lz.contorno(caja, '#6a4428', grosor=0.8, presion=0.55)
# far leg, then near leg (jeans)
JEAN = '#4a6a9a'
for (k0, a0, w) in (((1100, 626), (1112, 752), 26), ((1062, 628), (1066, 756), 29)):
    f = Trazo([k0, ((k0[0] + a0[0]) / 2 + 3, (k0[1] + a0[1]) / 2), a0], (w, w * 0.88, w * 0.72))
    lz.aguada(f, JEAN, dens=0.74, tapa=1, toques=[(a0[0], a0[1] - 30, 30, '#344e7a', 0.5)])
    lz.contorno(f, '#2a3a5a', grosor=0.8, presion=0.5, cortes=0.3)
    z = Poligono([(a0[0] + 12, a0[1] - 4), (a0[0] - 26, a0[1] + 2), (a0[0] - 30, a0[1] + 12),
                  (a0[0] + 14, a0[1] + 12)])
    lz.aguada(z, '#6e4c3c', dens=0.8, tapa=1, irreg=0.3)
    lz.contorno(z, '#3a2418', grosor=0.6, presion=0.5)
muslos = pieza([(1150, 588), (1226, 594), (1226, 632), (1150, 642), (1076, 644), (1046, 628), (1052, 600),
                (1100, 590)], JEAN, toques=[(1080, 630, 40, '#344e7a', 0.5)])
pliegues(lz, [[(1110, 600), (1100, 620), (1110, 640)], [(1180, 600), (1170, 615)]], '#2a3a5a')
# sweater, leaning forward toward the girl
pieza([(1122, 478), (1160, 470), (1196, 478), (1216, 520), (1228, 598), (1172, 612), (1144, 604), (1116, 548),
       (1104, 504)], TEAL, toques=[(1210, 560, 40, '#2a6a6a', 0.6), (1130, 500, 30, '#6fb1ad', 0.5)])
lz.rayado(Poligono([(1124, 590), (1226, 586), (1228, 604), (1124, 610)], suave=False), '#2a6a6a', angulo=90,
          sep=3, presion=0.5)                                                     # ribbed hem
# the arm resting on his far thigh
brazo(lz, (1190, 492), (1206, 570), (1140, 606), 25, TEAL)
mano_dedos(lz, 1140, 606, 176, 40, 'piel4', 'relajada', lado=1)
cuello(1124, 440, 40, 'piel4', (1146, 482))
cara(lz, 1124, 440, 40, piel='piel4', pelo='#1e1410', peinado='corto', giro=-0.5, inclina=-14,
     ojos='abiertos', boca='suave', mira=(-1, 0.4))
# elbow on the knee, chin on the hand: he listens
# a short beard along the jaw, in pencil
_c, _s = math.cos(math.radians(-14)), math.sin(math.radians(-14))
_R = lambda dx, dy: (1124 + dx * _c - dy * _s, 440 + dx * _s + dy * _c)
barba = Poligono([_R(-34, 6), _R(-30, 26), _R(-20, 38), _R(-6, 41), _R(8, 37), _R(20, 26), _R(30, 8),
                  _R(18, 22), _R(4, 31), _R(-12, 30), _R(-24, 22)])
lz.aguada(barba, '#4a3428', dens=0.35, irreg=0.8, gran=0.6, borde=0.2)
lz.rayado(barba, '#2a1a14', angulo=75, sep=1.7, presion=0.45, grosor=0.6, largo=6)
brazo(lz, (1134, 504), (1058, 598), (1112, 500), 25, TEAL)
mano_dedos(lz, 1112, 502, -78, 42, 'piel4', 'apoyada', lado=-1)

# ------------------------------------------------------------------ the votes become leaves of the tree
for (p0, p1, p2, p3, sm) in (((452, 300), (440, 250), (470, 300), (500, 320), 1),
                             ((672, 350), (690, 320), (700, 330), (720, 318), 2)):
    pass
hojas_voto = [
    # from the grandmother's hand up to the left clump
    [(452, 296, 15, -60, ORO), (444, 270, 16, -110, '#e0a83a'), (462, 248, 17, -30, '#7fa86a'),
     (456, 222, 17, -130, ORO), (482, 204, 19, -70, '#5f9f63')],
    # from the young woman's hand up into the middle
    [(676, 352, 14, -70, '#7fa86a'), (664, 330, 15, -120, ORO), (684, 318, 16, -50, '#e0a83a')],
]
for grupo in hojas_voto:
    for (x, y, L, a, c) in grupo:
        hojita(lz, x, y, L, a, c, tapa=0.9, dens=0.8)
    pts = [(x, y) for (x, y, *_r) in grupo]
    lz.lapiz([spline(pts)], '#d9a441', grosor=0.6, presion=0.25, temblor=0.6, cortes=0.6)
    for (x, y, *_r) in grupo[::2]:
        lz.luz((x, y, 10), '#ffe7a8', fuerza=0.35)

# clean air: birds leave the crown
pajaro(lz, 1120, 120, 15, TEAL, ang=-14)
pajaro(lz, 1176, 84, 12, CORAL, ang=-6, alas='abajo')
pajaro(lz, 1226, 110, 10, OCRE, ang=-20)

lz.vineta(margen=30)
lz.guardar(SALIDA)
print('ok', SALIDA)
