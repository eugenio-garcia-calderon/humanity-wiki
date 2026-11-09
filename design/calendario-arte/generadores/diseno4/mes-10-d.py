"""
Mes 10 -- Alimentación -- Diseño 4.

Idea: a hand-painted vintage fridge stands open on a slice of living soil, and
glows from inside like a lantern. Inside, the food has faces and friends: the
lentil hugs the lemon (vitamin C helps it take in the iron) and holds hands
with a grain of rice (together they make a complete protein); the red pepper
gives the lemon a kiss; the fish winks at a slice of lemon; the bread sleeps
in the freezer with a scarf on (freeze it before it goes stale). A boy brings
a basket of autumn produce from the garden, and the milk bottle waves at him.
Below, the soil is alive: roots, an earthworm, mushrooms and their white
threads, tiny creatures, and the peels and the apple core turning back into
earth. On the right an apple breathes golden ethylene over a pear that is
ripening, and two bees come to a flower.

    python3 mes-10-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, rgb, _lapiz_de,
                      hojita, hoja, flor_simple, flor_grande, ramita, remuestrea, estrella, puntos_dentro, pececillo, pajaro)
from extra_m910 import (cabeza_album, mano_dedos, manga, sombra, carita, brazito, lenteja, limon, pimiento, arroz,
                        huevo, _wash, flor_popular)

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-10-d.png'

lz = Lienzo(ANCHO, semilla=1010)
rng = np.random.default_rng(10)

TEAL = '#3f8f8c'
TEAL_OSC = '#2a6464'
CORAL = '#e8735e'
CARMIN = '#c33c4e'
ORO = '#f0c25e'
VERDE = '#5f8f63'
SALVIA = '#86a86c'
LP = '#5e3f30'
TIERRA = '#7a5236'
BRAZO = '#4a3428'          # pencil for the food characters' little arms

# ------------------------------------------------------------------ the living soil (a slice of earth)
SUELO_TOP = lambda x: 700 + 6 * math.sin(x / 47) + 3 * math.sin(x / 13)
xs = np.linspace(330, 1280, 60)
top = [(x, SUELO_TOP(x)) for x in xs]
bot = [(x, 808 + 10 * math.sin(x / 31) + rng.normal(0, 3) - 70 * max(0, 1 - (x - 330) / 70) ** 2 - 70 * max(0, 1 - (1280 - x) / 70) ** 2)
       for x in xs[::-1]]
suelo = Poligono(top + bot, suave=False)
lz.aguada(suelo, '#8a5a36', dens=0.85, tapa=1, irreg=1.6, borde=0.6, gran=0.9, var=0.6,
          toques=[(500, 790, 120, '#b07a4a', 0.6), (900, 800, 140, '#a06a3e', 0.6), (1150, 760, 100, '#6a4228', 0.5)],
          desvanece=None)
# a darker humus band on top
humus = Poligono(top + [(x, SUELO_TOP(x) + 26 + 5 * math.sin(x / 23)) for x in xs[::-1]], suave=False)
lz.aguada(humus, '#4a3020', dens=0.55, irreg=1.0, borde=0.5, gran=0.8)
# ragged edges at both ends: the slice fades into the paper
# pebbles, seeds and tiny creatures (a spoonful of soil holds more lives than there are people, day 13)
for _ in range(26):
    x, y = rng.uniform(360, 1250), rng.uniform(735, 800)
    lz.aguada(Elipse(x, y, rng.uniform(2.5, 6), rng.uniform(2, 4), rng.uniform(0, 180)),
              rng.choice(['#c9b59a', '#a8968a', '#d9c3a0']), dens=0.6, tapa=0.7, irreg=0.3, borde=0.7)
for _ in range(140):
    x, y = rng.uniform(360, 1250), rng.uniform(730, 805)
    lz.gouache(Elipse(x, y, rng.uniform(0.5, 1.1)), rng.choice(['#f6e6c8', '#f6d27a', '#e9b8a0']), alfa=0.8, irreg=0)
for _ in range(9):  # springtails and mites: little bodies with legs
    x, y = rng.uniform(380, 1240), rng.uniform(745, 795)
    lz.aguada(Elipse(x, y, 3, 1.8, rng.uniform(-30, 30)), rng.choice(['#e8d8b0', '#c9e0d0', '#f0c0a0']), dens=0.8, tapa=0.8, irreg=0.1)
    lz.lapiz([[(x - 2 + k * 2, y + 1), (x - 3 + k * 2.5, y + 4)] for k in range(3)], '#3a2a20', grosor=0.4, presion=0.6)
# an earthworm, painted from life: pink-brown, glossy, its saddle band, heading into the compost
gus = Trazo(spline([(1010, 780), (990, 768), (966, 776), (944, 790), (920, 782), (904, 768)]), (6, 7.5, 8, 7.5, 6.5, 5))
lz.aguada(gus, '#d48a7a', dens=0.85, tapa=1, irreg=0.3, borde=0.8, gran=0.4, sombra=(-2, -3, '#9a4a48', 0.6),
          toques=[(966, 776, 10, '#b86a6a', 0.7), (1004, 778, 8, '#e8a898', 0.5)])
lz.aguada(Trazo([(978, 770), (970, 774)], (9, 9)), '#c86a5a', dens=0.6, irreg=0.2)          # clitellum
lz.contorno(gus, '#8a4a44', grosor=0.6, presion=0.5, cortes=0.25)
for p in remuestrea(gus.p, 4.5)[2:-2]:
    lz.lapiz([[p + (0, -2.6), p + (0.6, 2.6)]], '#a86a64', grosor=0.4, presion=0.3)
lz.gouache(Trazo([(1000, 774), (986, 766), (970, 770)], (1.0, 0.8, 0.6)), '#fbe8e0', alfa=0.6, irreg=0)
# roots: a carrot under its feathery top (left), a beetroot (right), fine root hairs everywhere
zan = Trazo([(520, 704), (522, 740), (526, 770)], (16, 9, 2))
_wash(lz, zan, '#ec7a2a', lapiz='#9a3a12')
for k in range(4):
    lz.lapiz([[(516 + k * 3, 722 + k * 10), (512 + k * 3, 726 + k * 10)]], '#9a3a12', grosor=0.5, presion=0.5)
remo = Circulos([(378, 722, 15), (376, 734, 11)])
_wash(lz, remo, '#9a2a4a', toques=[(372, 716, 8, '#c8507a', 0.6)], lapiz='#5a1a2a')
lz.lapiz([bezier((377, 744), (378, 760), (374, 776))], '#7a2a3a', grosor=0.8, presion=0.6)
pelos = []
for x0 in (420, 470, 560, 600, 880, 930, 1060, 1120, 1190):
    y0 = SUELO_TOP(x0) + 4
    for k in range(3):
        pelos.append(bezier((x0, y0), (x0 + rng.normal(0, 8), y0 + 20), (x0 + rng.normal(0, 14), y0 + rng.uniform(30, 60))))
lz.lapiz(pelos, '#e6d2b0', grosor=0.6, presion=0.6, temblor=0.6)
# mushrooms on top and their white threads (mycelium) through the soil
for (x, h, r_) in ((1100, 26, 15), (1126, 18, 10), (1082, 14, 8)):
    y = SUELO_TOP(x)
    pie = Trazo([(x, y + 2), (x + 1, y - h)], (r_ * 0.5, r_ * 0.38))
    _wash(lz, pie, '#f3e6d0', dens=0.55, lapiz='#9a8060')
    som = Poligono(np.vstack([arco(x, y - h, r_, r_ * 0.75, 180, 360, 14), arco(x, y - h, r_, r_ * 0.18, 0, 180, 10)]), suave=False)
    _wash(lz, som, '#c8502e', toques=[(x - r_ * 0.3, y - h - r_ * 0.4, r_ * 0.5, '#e8805a', 0.6)], lapiz='#7a2a1a')
    for j in range(4):
        lz.gouache(Elipse(x + rng.uniform(-r_ * 0.6, r_ * 0.6), y - h - rng.uniform(r_ * 0.15, r_ * 0.55), r_ * 0.08), '#fff6e6',
                   alfa=0.9, irreg=0)
hilos = []
for k in range(14):
    p0 = np.array([1100 + rng.normal(0, 10), SUELO_TOP(1100) + 6])
    pts = [p0]
    for j in range(4):
        pts.append(pts[-1] + (rng.normal(0, 26), rng.uniform(6, 16)))
    hilos.append(spline(pts))
lz.lapiz(hilos, '#fbf3e4', grosor=0.6, presion=0.75, temblor=0.6)
# what we do not throw away goes back to the earth: right under the fridge, peels, dry leaves and an
# apple core are crumbling into dark, rich soil (compost, days 28-29)
bolsa_c = Poligono([(600, 712), (900, 712), (912, 742), (880, 790), (760, 800), (640, 792), (590, 750)])
lz.aguada(bolsa_c, '#2e1c12', dens=0.75, irreg=1.4, borde=0.4, gran=0.9, var=0.6,
          toques=[(700, 760, 80, '#4a2e1c', 0.6), (840, 740, 50, '#3a2414', 0.5)])
restos = [
    (Trazo(spline([(640, 730), (656, 722), (676, 728), (690, 720)]), (6, 7, 6, 3)), '#e8a040'),      # orange peel
    (Trazo(spline([(700, 750), (720, 742), (742, 748)]), (7, 8, 4)), '#d8c050'),                      # banana peel
    (Elipse(812, 734, 14, 7, -20), '#a8703a'),                                                          # dry leaf
    (Elipse(860, 756, 12, 6, 30), '#c08a3a'),                                                           # dry leaf
    (Poligono([(762, 774), (772, 766), (782, 772), (778, 782), (766, 784)], suave=False), '#f3e8d8'),  # eggshell
]
for (f, col) in restos:
    lz.aguada(f, col, dens=0.8, tapa=0.8, irreg=0.5, borde=0.8, gran=0.5, desvanece=None)
    lz.contorno(f, _lapiz_de(col, 0.45), grosor=0.6, presion=0.5, cortes=0.4)
lz.lapiz([[(800, 738), (826, 730)], [(850, 760), (872, 752)]], '#6a4a2a', grosor=0.6, presion=0.6)          # leaf midribs
corazon = Poligono([(726, 728), (732, 718), (730, 708), (738, 704), (746, 708), (744, 718), (750, 728), (738, 736)])
lz.aguada(corazon, '#f0d8a0', dens=0.7, tapa=0.85, irreg=0.4, borde=0.8, toques=[(738, 718, 6, '#c87a4a', 0.6)])
lz.contorno(corazon, '#9a6a3a', grosor=0.6, presion=0.5, cortes=0.2)
lz.lapiz([[(738, 704), (740, 696)]], LP, grosor=0.8, presion=0.7)
# the scraps lose their colour and become crumbs of earth toward the bottom
for _ in range(60):
    x, y = rng.uniform(610, 890), rng.uniform(748, 794)
    lz.aguada(Elipse(x, y, rng.uniform(1.2, 3.2), rng.uniform(1, 2.4)), rng.choice(['#5a3a22', '#7a5032', '#a8703a', '#3a2414']),
              dens=0.8, irreg=0.3)
for _ in range(30):
    lz.gouache(Elipse(rng.uniform(610, 890), rng.uniform(720, 795), rng.uniform(0.5, 1.0)), '#f6e6c8', alfa=0.7, irreg=0)

# plants on the soil surface: sprouts, chard, a carrot top, grass
for x in np.arange(345, 1270, 9) + rng.uniform(-3, 3, 103):
    y = SUELO_TOP(x)
    h = rng.uniform(5, 13)
    lz.lapiz([[(x, y + 1), (x + rng.normal(0, 3), y - h)]], rng.choice(['#5f8f3a', '#7fae5e', '#4f7a3a']), grosor=0.7,
             presion=0.7, temblor=0.2)
for k in range(9):  # carrot tops above the root
    a = math.radians(-60 - k * 7.5)
    ramita(lz, [(520, 702), (520 + math.cos(a) * 18, 702 + math.sin(a) * 22), (520 + math.cos(a) * 30, 702 + math.sin(a) * 40)],
           '#6f9e4a', hojas=4, largo=6, tallo='#4f6f45')
for (x, ang) in ((378, -120), (378, -70), (378, -95)):   # beet leaves
    hoja(lz, x, 708, 38, ang, '#5f8f63', ancho=0.42, toque='#9a2a4a')
# a pumpkin plant with its flower at the far left, a flower for the bees at the far right
flor_grande(lz, 1240, 640, 13, ORO, centro='#e8892e', petalos=6)
lz.lapiz([bezier((1240, 650), (1236, 670), (1244, 690), (1240, 702))], '#4f6f45', grosor=1.1, presion=0.7)
hojita(lz, 1240, 678, 18, -30, VERDE, tapa=1)
hojita(lz, 1240, 690, 16, 210, VERDE, tapa=1)

# ------------------------------------------------------------------ the fridge (back to front)
FX0, FX1, FY0, FY1 = 560, 920, 100, 700
cuerpo = Poligono([(FX0, FY1 - 20), (FX0, FY0 + 64), (FX0 + 18, FY0 + 18), (FX0 + 70, FY0), (FX1 - 70, FY0), (FX1 - 18, FY0 + 18),
                   (FX1, FY0 + 64), (FX1, FY1 - 20), (FX1 - 14, FY1), (FX0 + 14, FY1)])
for lx in (FX0 + 40, FX1 - 40):     # little legs on the soil
    p = Trazo([(lx, FY1 - 4), (lx + (4 if lx > 700 else -4), FY1 + 12)], (12, 9))
    _wash(lz, p, '#7a5a4a', dens=0.8, lapiz=LP)
sombra(lz, 740, 714, 200, 10, color='#4a3020', dens=0.35)
lado_ = Poligono([(FX0 + 2, FY0 + 50), (FX0 - 40, FY0 + 76), (FX0 - 40, FY1 - 30), (FX0 + 2, FY1 - 8)], suave=False)
lz.aguada(lado_, '#b8443a', dens=1.0, tapa=1, borde=0.7, gran=0.4, toques=[(FX0 - 20, FY1 - 120, 60, '#8a2a24', 0.5)])
lz.rayado(lado_, '#9a3428', angulo=86, sep=4.5, presion=0.22, grosor=1.2)
lz.contorno(lado_, '#6a2018', grosor=0.9, presion=0.55, cortes=0.2)
lz.aguada(cuerpo, '#e2604c', dens=1.05, tapa=1, borde=0.7, gran=0.35, sombra=(-14, -10, '#b8443a', 0.6),
          toques=[(FX0 + 60, FY0 + 60, 70, '#f39a7a', 0.6), (FX1 - 40, FY1 - 80, 90, '#c8503e', 0.5)])
lz.rayado(cuerpo, '#c8483a', angulo=84, sep=5, presion=0.2, grosor=1.3)      # the brush strokes of the enamel paint
lz.contorno(cuerpo, '#8a3022', grosor=1.0, presion=0.6, cortes=0.15)
for xh in (FX0 + 8, FX1 - 10):     # enamel shine on the rounded edges
    lz.gouache(Trazo([(xh, FY0 + 80), (xh, FY1 - 40)], (2.4, 1.2)), '#ffe8dc', alfa=0.45, irreg=0.3)
# the cavity, glowing warm from inside
CX0, CX1, CY0, CY1 = 590, 892, 168, 668
cav = Poligono([(CX0, CY1), (CX0, CY0 + 30), (CX0 + 14, CY0), (CX1 - 14, CY0), (CX1, CY0 + 30), (CX1, CY1)], suave=False)
lz.aguada(cav, '#e8b878', dens=0.75, tapa=1, borde=0.5, irreg=0.4,
          toques=[(740, 430, 120, '#f8e2b0', 0.75), (CX0 + 10, CY1 - 20, 90, '#c8884a', 0.65), (CX1 - 10, CY0 + 20, 80, '#d09858', 0.6)])
# inner side walls give depth: the left wall seen at an angle, darker
lz.aguada(Poligono([(CX0, CY0 + 30), (CX0 + 22, CY0 + 40), (CX0 + 22, CY1 - 14), (CX0, CY1)], suave=False), '#e0b07a', dens=0.45,
          irreg=0.3)
lz.aguada(Poligono([(CX0 + 14, CY0), (CX1 - 14, CY0), (CX1 - 26, CY0 + 14), (CX0 + 26, CY0 + 14)], suave=False), '#e8c08a',
          dens=0.4, irreg=0.3)
lz.luz(Elipse(740, 430, 150, 240), '#ffe7a8', fuerza=0.45, suave=40)
lz.luz(Elipse(740, 716, 200, 26), '#ffd890', fuerza=0.35, suave=24)   # the warm light spills onto the soil
lz.contorno(cav, '#8a3022', grosor=0.9, presion=0.55, cortes=0.15)
# folk painting on the fridge: a garland across the top with a bird, big flowers down the side and the frame
pajaro(lz, 740, 136, 15, TEAL, ang=-6, alas='arriba', vientre='#f6d27a')
for (x, y, r_, c, cc) in ((664, 134, 15, '#f6e6c8', CARMIN), (816, 134, 15, '#f6e6c8', CARMIN), (612, 132, 10, ORO, TEAL),
                          (868, 132, 10, ORO, TEAL)):
    flor_popular(lz, x, y, r_, c, cc)
for (x, y, a) in ((690, 140, 20), (790, 140, 160), (636, 142, 160), (842, 142, 20), (590, 140, 200), (890, 140, -20)):
    hojita(lz, x, y, 14, a, '#3f7a6a', tapa=1)
lz.lapiz([spline([(590, 150), (640, 146), (700, 152), (780, 152), (840, 146), (892, 150)])], '#2f5a4a', grosor=0.8, presion=0.55)
for k, y in enumerate(range(196, 680, 54)):          # down the painted side
    flor_popular(lz, FX0 - 19, y, 11 if k % 2 == 0 else 8, ['#f6e6c8', ORO, '#f6b6b0'][k % 3], [TEAL, CARMIN, TEAL][k % 3])
    hojita(lz, FX0 - 19, y + 16, 12, 70 + (k % 2) * 40, '#3f7a6a', tapa=1)
for k, y in enumerate(range(200, 660, 46)):          # small flowers on the frame beside the cavity
    flor_popular(lz, FX0 + 15, y, 7, [ORO, '#f6e6c8'][k % 2], CARMIN, petalos=5)
for k, x in enumerate(range(616, 880, 40)):          # and along the bottom
    flor_popular(lz, x, FY1 - 16, 8, ['#f6e6c8', ORO][k % 2], TEAL, petalos=5)
for k, y in enumerate(range(176, 660, 28)):          # dots on the door hinge side
    lz.gouache(Elipse(FX1 - 8, y, 1.8), '#fbe8c8', alfa=0.85, irreg=0)

# a pumpkin vine grows out of the living soil and climbs the fridge (the garden it comes from)
tallo_v = spline([(540, 706), (528, 650), (540, 590), (526, 530), (538, 466), (526, 404), (538, 340), (528, 280), (544, 214),
                  (566, 128), (604, 92), (660, 78), (730, 76), (800, 82), (850, 94)], False, 10)
lz.aguada(Trazo(tallo_v[::4], (5, 4, 4, 3)), '#6f8f3a', dens=0.85, tapa=1, irreg=0.3)
lz.lapiz([tallo_v], '#3f5f2a', grosor=1.0, presion=0.6, temblor=0.4)
ptsv = remuestrea(tallo_v, 44)
for k, p in enumerate(ptsv[1:-1]):
    sd = 1 if k % 2 else -1
    d = ptsv[k + 2] - ptsv[k]
    base = math.degrees(math.atan2(d[1], d[0]))
    hoja(lz, p[0], p[1], 30 + 6 * (k % 3), base + sd * 70, ['#5f8f63', '#7fae5e', '#4f7a4a'][k % 3], ancho=0.62,
         toque=['#c8c060', None, '#2f5a3a'][k % 3])
    if k % 3 == 1:   # tendrils
        c = np.array(p) + (sd * 10, -6)
        lz.lapiz([np.array([c + (math.cos(t) * (8 - t), math.sin(t) * (8 - t)) for t in np.linspace(0, 7, 40)])], '#5f7f3a',
                 grosor=0.6, presion=0.6)
for (x, y) in ((534, 560), (536, 380), (620, 84)):
    flor_grande(lz, x, y, 12, '#f0a030', centro='#e86a1a', petalos=5)
# a little pumpkin sits on top of the fridge
gaj = Circulos([(732, 60, 15), (746, 58, 17), (760, 60, 15)])
_wash(lz, gaj, '#e8892e', toques=[(740, 52, 10, '#f6b75a', 0.6)], lapiz='#8a3e18')
lz.lapiz([arco(746, 60, 7, 16, -80, 80, 10), arco(746, 60, 7, 16, 100, 260, 10)], '#9a4a1a', grosor=0.6, presion=0.5)
lz.aguada(Trazo([(746, 42), (750, 34), (756, 30)], (5, 3, 2)), '#6a7a3a', dens=0.9, tapa=1)
carita(lz, 746, 62, 10, expr='feliz')

# shelves (glass with a wooden front edge)


def balda(y):
    b = Poligono([(CX0 + 4, y), (CX1 - 4, y), (CX1 - 6, y + 8), (CX0 + 6, y + 8)], suave=False)
    lz.aguada(b, '#d9b07a', dens=0.75, tapa=1, irreg=0.2, borde=0.7)
    lz.contorno(b, '#8a5a32', grosor=0.7, presion=0.5)
    lz.gouache(Trazo([(CX0 + 30, y + 2), (CX1 - 80, y + 1)], (1.2, 0.6)), '#fffbe8', alfa=0.6, irreg=0)


# --- freezer (top): the bread sleeps with a scarf on, berries and broth keep (day 27)
lz.aguada(Poligono([(CX0 + 4, CY0 + 4), (CX1 - 4, CY0 + 4), (CX1 - 4, 262), (CX0 + 4, 262)], suave=False), '#cfe6ec', dens=0.45,
          irreg=0.5, toques=[(700, 200, 60, '#e8f4f6', 0.6)])
for _ in range(16):
    estrella(lz, rng.uniform(CX0 + 20, CX1 - 20), rng.uniform(CY0 + 14, 250), rng.uniform(2, 4.5), '#ffffff', puntas=6)
pan_ = Poligono(np.vstack([arco(672, 258, 50, 50, 180, 360, 24)[:, :] * (1, 1) + (0, 0)]) * (1, 1), suave=False)
pan_ = Poligono([(622, 258), (624, 236), (640, 216), (672, 208), (704, 216), (720, 236), (722, 258)])
_wash(lz, pan_, '#d9963e', toques=[(672, 214, 36, '#9a5a22', 0.6), (636, 250, 20, '#f0c27a', 0.5)], lapiz='#7a4a22')
lz.lapiz([[(648, 222), (668, 230)], [(668, 216), (690, 226)], [(690, 214), (708, 226)]], '#f6e0b0', grosor=1.8, presion=0.75)
carita(lz, 676, 242, 14, expr='cerrado' if False else 'feliz')
lz.lapiz([arco(706, 238, 3, 2.5, 0, 360, 10), arco(714, 228, 4, 3.4, 0, 360, 10)], '#8a9aa8', grosor=0.6, presion=0.5)  # zzz bubbles
for (x, y) in ((640, 222), (700, 214), (662, 210)):
    lz.gouache(Elipse(x, y, 6, 1.8, -10), '#ffffff', alfa=0.8, irreg=0)     # frost on the crust
tarro = Poligono([(760, 260), (758, 214), (764, 206), (796, 206), (802, 214), (800, 260)], suave=False)
_wash(lz, tarro, '#d8e8ee', dens=0.35, lapiz='#6a8a9a')
for (x, y) in ((770, 250), (782, 252), (792, 248), (776, 238), (788, 238), (770, 226), (782, 224), (794, 226)):
    lz.aguada(Elipse(x, y, 5), rng.choice(['#6a3a7a', '#c33c4e', '#3a4a8a']), dens=0.85, irreg=0.2)
lz.aguada(Poligono([(760, 210), (800, 210), (800, 200), (760, 200)], suave=False), TEAL, dens=0.85, tapa=1)
caldo = Poligono([(822, 260), (820, 222), (866, 222), (864, 260)], suave=False)
_wash(lz, caldo, '#e8c070', dens=0.6, lapiz='#9a6a2a', toques=[(840, 248, 14, '#c8902a', 0.5)])
lz.aguada(Poligono([(818, 222), (868, 222), (866, 212), (820, 212)], suave=False), '#f6ead6', dens=0.5, tapa=1)
lz.rayado(Poligono([(818, 222), (868, 222), (866, 212), (820, 212)], suave=False), CARMIN, angulo=0, sep=3, presion=0.5)
lz.gouache(Trazo([(826, 230), (826, 254)], (2, 1)), '#ffffff', alfa=0.6, irreg=0)
balda(262)

# --- dairy and fish shelf
# milk bottle, waving to the boy
lz.aguada(Poligono([(606, 378), (604, 316), (614, 296), (614, 280), (640, 280), (640, 296), (650, 316), (648, 378)]), '#fbfaf4',
          dens=0.3, tapa=1, irreg=0.2)
leche = Poligono([(606, 378), (604, 316), (614, 296), (614, 280), (640, 280), (640, 296), (650, 316), (648, 378)])
lz.aguada(Poligono([(607, 376), (606, 322), (648, 322), (647, 376)]), '#f3eee6', dens=0.4, irreg=0.2,
          toques=[(640, 360, 12, '#d8d0c8', 0.6)])
lz.contorno(leche, '#8a9aa8', grosor=0.8, presion=0.55)
lz.aguada(Poligono([(612, 284), (642, 284), (642, 272), (612, 272)], suave=False), '#3f6f8c', dens=0.85, tapa=1)
lz.gouache(Trazo([(610, 330), (610, 368)], (2.4, 1.6)), '#ffffff', alfa=0.7, irreg=0)
carita(lz, 627, 346, 15, expr='o', mira=(-1, 0))
# a cheese wheel with a wedge cut, smiling
queso = Poligono([(668, 378), (664, 330), (690, 316), (734, 318), (744, 336), (742, 378)])
_wash(lz, queso, '#f2c24e', toques=[(720, 360, 24, '#d99a2a', 0.5)], lapiz='#9a6a1a')
lz.aguada(Poligono([(664, 330), (690, 316), (734, 318), (744, 336), (712, 346), (680, 340)]), '#f8dc7a', dens=0.5, irreg=0.2)
for (x, y, r_) in ((684, 362, 4), (726, 366, 3), (712, 356, 2.5), (694, 372, 2)):
    lz.aguada(Elipse(x, y, r_, r_ * 0.8), '#c88a1a', dens=0.7, irreg=0.2, borde=0.8)
carita(lz, 706, 352, 15, expr='sonrisa', mira=(-0.5, 0))
# two little yogurt jars (glass, reused)
for (x, c) in ((760, '#f6b6b0'), (782, '#c8a0d0')):
    y_ = Poligono([(x - 10, 378), (x - 12, 346), (x + 12, 346), (x + 10, 378)], suave=False)
    lz.aguada(y_, '#fbf6ee', dens=0.4, tapa=1, irreg=0.2, toques=[(x, 372, 8, c, 0.8)])
    lz.contorno(y_, '#9a8a8a', grosor=0.6, presion=0.5)
    lz.aguada(Poligono([(x - 13, 346), (x + 13, 346), (x + 12, 340), (x - 12, 340)], suave=False), c, dens=0.85, tapa=1)
carita(lz, 760, 360, 7, expr='feliz')
# the fish on its plate winks at the slice of lemon (fish and lemon go together)
plato = Elipse(842, 372, 40, 8)
_wash(lz, plato, '#e8eef2', dens=0.5, lapiz='#7a8a9a', toques=[(842, 374, 20, '#9ab8d0', 0.5)])
for k in range(10):
    a = math.radians(k * 36)
    lz.aguada(Elipse(842 + math.cos(a) * 34, 372 + math.sin(a) * 6.5, 1.8), TEAL, dens=0.8, irreg=0.1)
pez = Poligono([(806, 362), (820, 346), (848, 340), (870, 348), (878, 360), (868, 368), (840, 372), (816, 370)])
cola = Poligono([(806, 362), (794, 346), (798, 362), (792, 378)], suave=False)
_wash(lz, pez | cola, '#8fb0c0', toques=[(850, 346, 18, '#4a6a8a', 0.6), (840, 368, 18, '#e8eef0', 0.6)], lapiz='#3a5a6a')
for k in range(6):   # scales
    lz.lapiz([arco(824 + k * 8, 356, 4, 5, 300, 420, 8)], '#4a6a7a', grosor=0.5, presion=0.45)
lz.lapiz([arco(866, 356, 6, 9, 290, 430, 10)], '#3a5a6a', grosor=0.6, presion=0.5)   # gill
lz.lapiz([arco(864, 354, 4, 3, 200, 340, 10)], '#2e211c', grosor=1.0, presion=0.9)          # a wink
lz.aguada(Elipse(866, 360, 4, 2.4), '#e9727a', dens=0.5, suave=1.5)
lz.lapiz([arco(876, 360, 3, 2.5, 20, 120, 8)], '#5a2a2a', grosor=0.7, presion=0.7)
rodaja = Elipse(884, 372, 10, 6)
_wash(lz, rodaja, '#f2cf3a', dens=0.8, lapiz='#a07a12')
lz.lapiz([[(884, 372), (884 + math.cos(math.radians(a)) * 8, 372 + math.sin(math.radians(a)) * 4.6)] for a in range(0, 360, 60)],
         '#fbe88a', grosor=0.6, presion=0.6)
balda(380)

# --- the heroes' shelf: rice, lentil, lemon and pepper (days 3 and 4, and the iron + vitamin C friendship)
# a glass jar lies on its side; lentils and grains of rice walk out of it hand in hand (day 4)
tarro_l = Poligono([(600, 474), (640, 472), (648, 480), (660, 482), (660, 512), (648, 514), (640, 520), (600, 520), (592, 510), (592, 484)])
lz.aguada(tarro_l, '#e6eef0', dens=0.3, tapa=1, irreg=0.2, borde=0.8)
for _ in range(26):
    lenteja(lz, rng.uniform(598, 650), rng.uniform(496, 516), 4.5, rng.uniform(-30, 30))
for _ in range(10):
    arroz(lz, rng.uniform(600, 650), rng.uniform(490, 512), 5, rng.uniform(0, 180))
lz.contorno(tarro_l, '#7a9aa8', grosor=0.8, presion=0.55)
lz.gouache(Trazo([(600, 480), (646, 476)], (1.6, 1.0)), '#ffffff', alfa=0.7, irreg=0)
lz.aguada(Poligono([(660, 470), (668, 470), (668, 522), (660, 522)], suave=False), '#d9c49a', dens=0.6, tapa=1)   # the cork, out
for (x, y) in ((664, 518), (672, 520), (668, 514)):
    lenteja(lz, x, y, 4.5, 10)
# the little chain: lentil, rice, lentil, rice, lentil...
lentil_pos = [(684, 500), (734, 500)]
rice_pos = [(708, 494), (756, 494)]
for (x, y) in rice_pos:
    arroz(lz, x, y, 17, -4)
    carita(lz, x, y - 5, 7.5, expr='feliz')
for k, (x, y) in enumerate(lentil_pos):
    lenteja(lz, x, y, 13, -4)
    carita(lz, x, y - 2, 8.5, expr=['sonrisa', 'risa'][k], mira=(1, 0))
for (x, y) in lentil_pos + rice_pos:     # little legs
    for sd in (-1, 1):
        brazito(lz, [(x + sd * 4, y + 12), (x + sd * 5, y + 18), (x + sd * 8, y + 21)], BRAZO, grosor=1.1, mano_r=1.6)
# hands joined along the chain
for (xa, xb) in ((684, 708), (708, 734), (734, 756)):
    m = ((xa + xb) / 2, 498)
    brazito(lz, [(xa + 9, 496), (m[0] - 2, 500), m], BRAZO, grosor=1.3, mano=False)
    brazito(lz, [(xb - 7, 494), (m[0] + 2, 500), m], BRAZO, grosor=1.3, mano_r=2.6)
# the lemon and the pepper
limon(lz, 806, 466, 42, -12)
carita(lz, 816, 458, 20, expr='feliz')
pimiento(lz, 872, 458, 32)
carita(lz, 866, 452, 16, expr='beso', mira=(-1, 0))
brazito(lz, [(846, 444), (834, 434), (822, 440)], BRAZO, grosor=1.5, mano_r=3.4)
# the last lentil climbs up and hugs the lemon (vitamin C helps it take in the iron)
lenteja(lz, 774, 486, 15, -20)
carita(lz, 776, 482, 9, expr='feliz')
brazito(lz, [(786, 482), (798, 482), (810, 486)], BRAZO, grosor=1.5, mano_r=2.6)
brazito(lz, [(786, 494), (800, 498), (814, 494)], BRAZO, grosor=1.5, mano_r=2.6)
brazito(lz, [(766, 498), (760, 504), (756, 498)], BRAZO, grosor=1.3, mano_r=2.4)     # and still holds the rice's hand
brazito(lz, [(770, 498), (772, 512), (776, 518)], BRAZO, grosor=1.1, mano_r=1.6)
# a tiny heart floats between the pepper and the lemon
cor = Poligono([(842, 410), (837, 403), (842, 398), (847, 403), (852, 398), (857, 403), (852, 410), (847, 416)])
lz.aguada(cor, CARMIN, dens=0.95, tapa=1, irreg=0.1)
lz.contorno(cor, '#7a1f30', grosor=0.6, presion=0.5)
# sparks of vitamin light from the lemon and the pepper to the lentil (iron taken in)
for k in range(11):
    t = k / 10
    x = 830 - t * 60 + 6 * math.sin(t * 6)
    y = 428 - 18 * math.sin(t * 3)
    lz.gouache(Elipse(x, y, 1.5 + (k % 3) * 0.5), '#fff3b0', alfa=0.9, irreg=0)
lz.luz((730, 450, 50), '#ffe7a0', fuerza=0.25)
balda(522)

# --- the crisper drawer: vegetables peeking out over its edge
for (x, ang, L) in ((862, -100, 40), (872, -88, 44), (880, -76, 38)):
    a = math.radians(ang)
    ramita(lz, [(x, 560), (x + math.cos(a) * L * 0.5, 560 + math.sin(a) * L * 0.5), (x + math.cos(a) * L, 560 + math.sin(a) * L)],
           '#6f9e4a', hojas=5, largo=7, tallo='#4f6f45')
brocoli = Circulos([(712, 538, 16), (730, 528, 18), (750, 538, 15), (722, 548, 14), (742, 548, 14)])
lz.aguada(brocoli, '#4f8a4a', dens=0.9, tapa=1, irreg=0.6, borde=0.7, gran=0.6, toques=[(724, 526, 12, '#86b86a', 0.6)])
lz.rayado(brocoli, '#2f5a2a', angulo=60, sep=3, presion=0.35, largo=6)
lz.contorno(brocoli, '#2f5a2a', grosor=0.7, presion=0.5, cortes=0.3)
carita(lz, 731, 540, 10, expr='sonrisa', mira=(-1, 0))
acelga = [hoja(lz, 800, 566, 60, -100, '#4f8a4a', ancho=0.55, toque='#c33c4e'),
          hoja(lz, 818, 566, 54, -72, '#6fa452', ancho=0.55, toque='#e8a040')]
tom = Elipse(632, 546, 17, 15)
_wash(lz, tom, '#d8402e', toques=[(624, 538, 8, '#f39a6a', 0.6)], lapiz='#7a2020')
for a in range(5):
    aa = math.radians(a * 72 - 90)
    lz.lapiz([[(632, 532), (632 + math.cos(aa) * 7, 532 + math.sin(aa) * 4)]], '#4f6f45', grosor=0.9, presion=0.8)
carita(lz, 630, 548, 10, expr='o', mira=(-1, 0))
TOMATE_MANOS = [(616, 548), (618, 562)]
# inside the drawer: a cabbage, carrots, a leek -- painted fully, the glass is only a light glaze
col_ = Circulos([(820, 620, 30), (800, 628, 22), (842, 630, 22)])
lz.aguada(col_, '#7fae6a', dens=0.9, tapa=1, irreg=0.4, borde=0.75, gran=0.4, sombra=(-6, -5), toques=[(812, 610, 16, '#c8e0a0', 0.7)])
lz.lapiz([arco(820, 628, 22, 18, 190, 350, 14), arco(820, 634, 14, 12, 200, 340, 12), bezier((820, 600), (816, 624), (820, 650))],
         '#3f6a3a', grosor=0.7, presion=0.55)
lz.contorno(col_, '#3f6a3a', grosor=0.7, presion=0.5)
for k in range(4):
    z = Trazo([(612 + k * 15, 600 + k * 3), (636 + k * 16, 656)], (13, 3))
    _wash(lz, z, '#ec7a2a', lapiz='#9a3a12', dens=0.95)
puerro = Trazo([(690, 656), (720, 616), (744, 596)], (16, 14, 12))
lz.aguada(puerro, '#f3eee0', dens=0.6, tapa=1, irreg=0.3, toques=[(736, 604, 16, '#86b06a', 0.9), (744, 596, 10, '#4f8a4a', 0.9)])
lz.contorno(puerro, '#7a8a6a', grosor=0.7, presion=0.5)
cajon = Poligono([(CX0 + 8, 560), (CX1 - 8, 560), (CX1 - 10, CY1 - 6), (CX0 + 10, CY1 - 6)], suave=False)
lz.aguada(cajon, '#bfe0dc', dens=0.2, irreg=0.3, borde=0.9)
lz.contorno(cajon, '#3f7a76', grosor=0.8, presion=0.55)
for k in range(3):
    lz.gouache(Trazo([(CX0 + 20 + k * 90, 650), (CX0 + 60 + k * 90, 570)], (1.4, 0.8)), '#ffffff', alfa=0.45, irreg=0)
lz.aguada(Trazo([(712, 584), (768, 584)], (5, 5)), '#e8c08a', dens=0.85, tapa=1, irreg=0.2)
lz.contorno(Trazo([(712, 584), (768, 584)], (5, 5)), '#8a5a32', grosor=0.6, presion=0.5)
lz.gouache(Trazo([(CX0 + 20, 572), (CX0 + 60, 572)], (1.6, 1)), '#ffffff', alfa=0.7, irreg=0)

# ------------------------------------------------------------------ the open door (inside face), with its shelves
DP = [(922, 146), (1082, 104), (1082, 734), (922, 690)]
puerta = Poligono(DP, suave=False)
lz.aguada(puerta, '#e2604c', dens=1.05, tapa=1, borde=0.7, gran=0.35, sombra=(-8, -6, '#b8443a', 0.5),
          toques=[(1060, 420, 80, '#f39a7a', 0.5)])
lz.contorno(puerta, '#8a3022', grosor=1.0, presion=0.6, cortes=0.15)
forro = Poligono([(944, 184), (1058, 154), (1058, 694), (944, 662)], suave=False)
lz.aguada(forro, '#fbe8c0', dens=0.55, tapa=1, borde=0.4, irreg=0.4, toques=[(1000, 400, 90, '#fff3d0', 0.7)])
lz.contorno(forro, '#8a3022', grosor=0.8, presion=0.5)
lz.luz(forro, '#ffe7a8', fuerza=0.18, suave=20)
lz.rayado(Poligono(DP, suave=False) - forro, '#c8483a', angulo=80, sep=5, presion=0.2, grosor=1.3)
# the door is painted too: a bird with two flowers on its top band, flowers down its edge, dots by the hinges
pajaro(lz, 1004, 150, 13, TEAL, ang=-18, alas='arriba', vientre='#f6d27a')
for (x, y, r_, c, cc) in ((962, 168, 9, '#f6e6c8', CARMIN), (1050, 140, 9, ORO, TEAL)):
    flor_popular(lz, x, y, r_, c, cc)
for k, y in enumerate(range(210, 690, 52)):
    flor_popular(lz, 1070, y - 8, 7, ['#f6e6c8', ORO][k % 2], [TEAL, CARMIN][k % 2], petalos=5)
for y in range(170, 690, 18):
    lz.gouache(Elipse(933, y, 1.6), '#fbe8c8', alfa=0.85, irreg=0)
flor_popular(lz, 1000, 712, 10, '#f6e6c8', TEAL)
hojita(lz, 1016, 714, 12, 10, '#3f7a6a', tapa=1)
hojita(lz, 984, 716, 12, 170, '#3f7a6a', tapa=1)


def ybin(x, y0, y1):
    """Interpolate the door's perspective: a line from (936, y0) to (1068, y1)."""
    return y0 + (y1 - y0) * (x - 936) / 132


def bandeja(y0, y1, h):
    b = Poligono([(946, y0), (1056, ybin(1056, y0, y1)), (1056, ybin(1056, y0, y1) + h * 1.1), (946, y0 + h)], suave=False)
    lz.aguada(b, '#f6d8a8', dens=0.55, tapa=1, irreg=0.2, borde=0.8, toques=[(1000, (y0 + y1) / 2 + h / 2, 40, '#e8b87a', 0.5)])
    lz.contorno(b, '#8a5a32', grosor=0.8, presion=0.55)
    lz.gouache(Trazo([(952, y0 + 3), (1050, ybin(1050, y0, y1) + 3)], (1.2, 1.2)), '#fffbe8', alfa=0.6, irreg=0)


# top bin: eggs, one of them just waking up
for k, x in enumerate((954, 984, 1014, 1044)):
    yb = ybin(x, 252, 218)
    huevo(lz, x, yb - 16, 13, col=['#f3e2c8', '#e8c8a0', '#f3e2c8', '#d9b088'][k])
    carita(lz, x, yb - 14, 8, expr=['feliz', 'sonrisa', 'feliz', 'o'][k])
bandeja(250, 216, 26)
# middle bin: olive oil with an olive sprig (Mediterranean diet, day 20) and a glass of parsley
yb = ybin(970, 430, 392)
aceite = Poligono([(958, yb), (956, yb - 60), (964, yb - 74), (964, yb - 96), (976, yb - 96), (976, yb - 74), (984, yb - 60), (982, yb)])
_wash(lz, aceite, '#9aa83a', dens=0.75, toques=[(970, yb - 30, 16, '#d9c84a', 0.7)], lapiz='#4a5a1a')
lz.aguada(Elipse(970, yb - 98, 7, 4), '#6e4c3c', dens=0.85, tapa=1, irreg=0.1)
lz.luz(Elipse(968, yb - 30, 10, 20), '#fff0a0', fuerza=0.35, suave=6)
ramita(lz, [(984, yb - 70), (1000, yb - 86), (1014, yb - 94)], '#7a9a6a', hojas=6, largo=9, tallo='#5a4a3a')
for (x, y) in ((1000, yb - 80), (1010, yb - 92)):
    lz.aguada(Elipse(x, y, 3.6, 2.8), '#3a4a2a', dens=0.9, tapa=1, irreg=0.1)
carita(lz, 970, yb - 40, 9, expr='sonrisa')
yb2 = ybin(1036, 430, 392)
vaso = Poligono([(1024, yb2), (1022, yb2 - 36), (1050, yb2 - 36), (1048, yb2)], suave=False)
lz.aguada(vaso, '#d8ecec', dens=0.35, tapa=1, irreg=0.2)
lz.contorno(vaso, '#6a8a9a', grosor=0.6, presion=0.5)
for k in range(7):
    a = math.radians(-120 + k * 10)
    ramita(lz, [(1036, yb2 - 20), (1036 + math.cos(a) * 30, yb2 - 20 + math.sin(a) * 30)], '#4f8a4a', hojas=4, largo=6)
jam = Poligono([(1000, ybin(1000, 430, 392)), (998, ybin(1000, 430, 392) - 30), (1018, ybin(1000, 430, 392) - 30), (1016, ybin(1000, 430, 392))], suave=False)
_wash(lz, jam, '#b8304a', dens=0.9, toques=[(1006, ybin(1000, 430, 392) - 14, 6, '#e8606a', 0.6)], lapiz='#6a1a2a')
lz.aguada(Poligono([(996, ybin(1000, 430, 392) - 30), (1020, ybin(1000, 430, 392) - 30), (1018, ybin(1000, 430, 392) - 38), (998, ybin(1000, 430, 392) - 38)], suave=False),
          '#f6ead6', dens=0.5, tapa=1)
lz.rayado(Poligono([(996, ybin(1000, 430, 392) - 30), (1020, ybin(1000, 430, 392) - 30), (1018, ybin(1000, 430, 392) - 38), (998, ybin(1000, 430, 392) - 38)], suave=False),
          TEAL, angulo=45, sep=2.5, presion=0.6)
bandeja(428, 390, 30)
# bottom bin: a jar of chickpeas and a jug of water
yb = ybin(966, 620, 590)
gar = Poligono([(950, yb), (948, yb - 44), (984, yb - 44), (982, yb)], suave=False)
lz.aguada(gar, '#efe6d2', dens=0.35, tapa=1, irreg=0.2)
for _ in range(18):
    lz.aguada(Elipse(966 + rng.uniform(-14, 14), yb - rng.uniform(4, 40), 3.6), '#e8c07a', dens=0.8, irreg=0.2, borde=0.7)
lz.contorno(gar, '#8a7a5a', grosor=0.6, presion=0.5)
lz.aguada(Poligono([(946, yb - 44), (986, yb - 44), (986, yb - 52), (946, yb - 52)], suave=False), TEAL, dens=0.85, tapa=1)
yb2 = ybin(1036, 620, 590)
jarra = Poligono([(1018, yb2), (1016, yb2 - 50), (1024, yb2 - 60), (1052, yb2 - 60), (1056, yb2 - 50), (1054, yb2)])
lz.aguada(jarra, '#cfe6ec', dens=0.4, tapa=1, irreg=0.2, toques=[(1036, yb2 - 16, 16, '#8ec0d0', 0.6)])
lz.contorno(jarra, '#5a8a9a', grosor=0.7, presion=0.5)
but = Poligono([(990, ybin(1000, 620, 590) - 4), (994, ybin(1000, 620, 590) - 20), (1008, ybin(1000, 620, 590) - 22), (1010, ybin(1000, 620, 590) - 6)])
_wash(lz, but, '#f8e08a', dens=0.8, lapiz='#a08a3a')
bandeja(620, 588, 30)
# hinges
for y in (190, 640):
    lz.aguada(Elipse(921, y, 4, 12), '#c8b8a0', dens=0.8, tapa=1, irreg=0.1)

# ------------------------------------------------------------------ the apple ripens the pear (ethylene, day 25)
fuente = Poligono(np.vstack([arco(1170, 676, 48, 10, 180, 360, 16), arco(1170, 676, 44, 24, 0, 180, 18)]), suave=False)
manz = Poligono([(1150, 668), (1132, 660), (1130, 640), (1140, 626), (1152, 628), (1158, 632), (1164, 626), (1178, 630),
                 (1182, 646), (1176, 664)])
_wash(lz, manz, '#d94a3a', toques=[(1146, 640, 14, '#f2c14e', 0.6)], lapiz='#7a2020')
lz.lapiz([[(1158, 630), (1160, 618)]], LP, grosor=1.0, presion=0.8)
hojita(lz, 1160, 622, 14, -30, VERDE, tapa=1)
carita(lz, 1156, 648, 9, expr='o', mira=(1, 0))
pera_ = Poligono([(1200, 600), (1208, 616), (1210, 634), (1222, 650), (1220, 668), (1200, 674), (1182, 668), (1180, 650),
                  (1192, 634), (1194, 616)])
lz.aguada(pera_, '#a8c45a', dens=0.85, tapa=1, irreg=0.3, borde=0.75, sombra=(-4, -3),
          toques=[(1210, 652, 16, '#f0c24a', 0.8), (1196, 616, 10, '#86a84a', 0.5)])
lz.aguada(Elipse(1210, 652, 7, 5), '#ec8a6a', dens=0.5, suave=3)
lz.contorno(pera_, '#5a6a2a', grosor=0.7, presion=0.55)
lz.lapiz([[(1200, 602), (1196, 588)]], LP, grosor=1.0, presion=0.8)
carita(lz, 1202, 646, 9, expr='feliz')
lz.aguada(fuente, TEAL, dens=0.9, tapa=1, borde=0.75, gran=0.4, sombra=(-5, -4), toques=[(1190, 690, 20, TEAL_OSC, 0.5)])
lz.contorno(fuente, TEAL_OSC, grosor=0.8, presion=0.55)
for k in range(9):
    a = math.radians(20 + k * 17)
    lz.gouache(Elipse(1170 + math.cos(a) * 36, 684 + math.sin(a) * 12, 2.2), '#fbe8c0', alfa=0.85, irreg=0)
# the apple breathes golden ethylene over the pear
for k in range(14):
    t = k / 13
    x = 1168 + t * 34 + 5 * math.sin(t * 9)
    y = 636 - 30 * math.sin(t * 3.0) - t * 4
    lz.gouache(Elipse(x, y, 1.2 + 0.8 * (k % 2)), '#ffe9a0', alfa=0.9, irreg=0)
lz.luz((1190, 626, 26), '#ffe2a0', fuerza=0.3)

# ------------------------------------------------------------------ two bees coming to the flower (pollinators, day 18)


def abeja(x, y, s, ang=0):
    cuerpo_ = Elipse(x, y, 7 * s, 5 * s, ang)
    for sd in (-1, 1):
        ala = Elipse(x - 1 * s, y - 6 * s, 5 * s, 3 * s, ang - 90 + sd * 25)
        lz.aguada(ala, '#d8ecf4', dens=0.45, irreg=0.2, borde=0.9)
        lz.contorno(ala, '#6a8a9a', grosor=0.5, presion=0.45)
    _wash(lz, cuerpo_, '#f2c03a', dens=0.9, lapiz='#5a3a1a')
    for k in (-2.5, 1.5):
        lz.lapiz([[(x + k * s, y - 4.5 * s), (x + k * s + 0.5, y + 4.5 * s)]], '#3a2a1a', grosor=1.6 * s, presion=0.9)
    lz.aguada(Elipse(x + 6.5 * s, y - 0.5 * s, 1.0 * s), '#2a1a14', dens=1.2, irreg=0.1)


abeja(1198, 552, 1.3, -10)
abeja(1278, 604, 1.1, 20)
lz.lapiz([bezier((1170, 540), (1186, 520), (1196, 560), (1186, 552))], '#9a8a7a', grosor=0.5, presion=0.4, cortes=0.6)
lz.lapiz([bezier((1300, 580), (1310, 600), (1290, 614), (1276, 604))], '#9a8a7a', grosor=0.5, presion=0.4, cortes=0.6)

# ------------------------------------------------------------------ the boy brings autumn produce from the garden (day 2)
# and hands a little pumpkin to the tomato, who reaches out for it from the drawer
PIEL = '#7a4a32'
NX, NY, NR = 476, 474, 38
sombra(lz, 456, 712, 70, 9, color='#4a3020', dens=0.35)
for (pts, w) in (([(436, 622), (428, 664), (422, 700)], (24, 21, 18)), ([(476, 620), (490, 658), (498, 698)], (24, 21, 18))):
    manga(lz, pts, w, '#3f6f8c', pliegues=1, sombra=(-4, -3))
    lz.lapiz([[(pts[0][0] + d, pts[0][1] + 8), (pts[2][0] + d, pts[2][1] - 6)] for d in (-5, 0, 5)], '#2a4a6a', grosor=0.5,
             presion=0.35)
for (x, y) in ((414, 706), (504, 704)):
    z = Poligono([(x - 14, y + 4), (x - 12, y - 6), (x + 6, y - 8), (x + 18, y), (x + 14, y + 6)])
    _wash(lz, z, '#c0703f', dens=0.9, lapiz='#6a3a1a')
cabeza_album(lz, NX, NY, NR, piel=PIEL, peinado='rizado', pelo='#1e140f', giro=0.55, inclina=10, ojos='abiertos', boca='risa',
             mira=(1, 0.4), base=(468, 536), ancho_base=72)
# jumper, leaning toward the fridge, with folds where the body bends
jersey = Poligono([(434, 524), (494, 518), (514, 548), (512, 630), (422, 634), (414, 556)])
lz.aguada(jersey, '#f0a828', dens=0.98, tapa=1, borde=0.7, gran=0.4, sombra=(-10, -6, '#c4702a', 0.6))
lz.contorno(jersey, '#8a5a12', grosor=0.9, presion=0.55)
for y in (570, 578):
    lz.aguada(Trazo([(414, y), (514, y - 4)], (5, 5), suave=False) & jersey, TEAL, dens=0.9, irreg=0.2)
for k in range(8):
    lz.aguada(Elipse(424 + k * 11, 592 - k * 0.4, 2.2), CARMIN, dens=0.9, irreg=0.1)
lz.lapiz([bezier((440, 604), (452, 614), (450, 630)), bezier((490, 600), (500, 614), (502, 630)), bezier((470, 540), (484, 548), (500, 546))],
         '#a0661a', grosor=0.7, presion=0.45)
lz.lapiz([spline([(440, 526), (466, 540), (492, 522)])], TEAL, grosor=2.2, presion=0.75)     # ribbed collar
# back arm (image left) hangs down and grips the basket's handle; the basket rests by his foot
manga(lz, [(436, 538), (422, 590), (422, 632)], (26, 23, 20), '#f0a828', pliegues=2)
cesto = Poligono([(372, 662), (470, 662), (462, 704), (380, 704)])
for (x, y) in ((388, 656), (406, 652)):
    c_ = Poligono([(x - 7, y + 5), (x - 7, y - 2), (x, y - 7), (x + 7, y - 2), (x + 7, y + 5)])
    _wash(lz, c_, '#7a3a1a', toques=[(x - 2, y - 2, 3, '#a8603a', 0.6)], lapiz='#3a1a0a')
granada = Elipse(430, 650, 15, 14)
_wash(lz, granada, '#b8304a', toques=[(424, 642, 8, '#e8606a', 0.6)], lapiz='#6a1a2a')
lz.aguada(Poligono([(428, 636), (432, 628), (436, 636)], suave=False), '#8a2a3a', dens=0.9, tapa=1)
lz.aguada(Elipse(434, 654, 7, 6), '#f6e0c8', dens=0.6, tapa=1, irreg=0.2)
for _ in range(10):
    lz.aguada(Elipse(434 + rng.uniform(-5, 5), 654 + rng.uniform(-4, 4), 1.6), '#d0203a', dens=1.0, irreg=0.1)
caqui = Circulos([(456, 656, 12)])
_wash(lz, caqui, '#f08a2a', toques=[(452, 650, 6, '#f8c06a', 0.6)], lapiz='#9a4a12')
lz.aguada(Poligono([(450, 644), (456, 640), (462, 644), (456, 648)], suave=False), '#5a6a2a', dens=0.9, tapa=1)
lz.aguada(cesto, '#c99a5a', dens=0.85, tapa=1, irreg=0.3, borde=0.7, gran=0.4, sombra=(-5, -4))
lz.rayado(cesto, '#7a5a30', angulo=0, sep=4.2, presion=0.45, grosor=0.9)
lz.rayado(cesto, '#7a5a30', angulo=80, sep=6, presion=0.3, grosor=0.7)
lz.contorno(cesto, '#6a4a2a', grosor=0.8, presion=0.55)
asa = arco(421, 662, 44, 34, 180, 360, 30)
lz.lapiz([asa], '#6a4a2a', grosor=2.4, presion=0.75)
lz.lapiz([asa], '#c99a5a', grosor=1.0, presion=0.6)
mano_dedos(lz, 422, 630, 92, 30, PIEL, curl=0.9, abre=0.25, lado=-1, pulgar=0.2)
# front arm (image right) holds out the little pumpkin to the tomato
cal = Circulos([(588, 560, 11), (598, 558, 12), (608, 560, 11)])
_wash(lz, cal, '#e8892e', toques=[(592, 552, 7, '#f6b75a', 0.6)], lapiz='#8a3e18')
lz.lapiz([arco(598, 560, 5, 11, -80, 80, 10), arco(598, 560, 5, 11, 100, 260, 10)], '#9a4a1a', grosor=0.6, presion=0.5)
lz.aguada(Trazo([(598, 548), (601, 540), (606, 537)], (4, 2.5, 2)), '#6a7a3a', dens=0.9, tapa=1)
manga(lz, [(496, 532), (534, 568), (568, 574)], (26, 23, 20), '#f0a828', pliegues=2)
mano_dedos(lz, 566, 576, -8, 30, PIEL, curl=0.55, abre=0.35, lado=1, pulgar=0.7)
for (a, b) in ((TOMATE_MANOS[0], (610, 554)), (TOMATE_MANOS[1], (610, 566))):
    brazito(lz, [a, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 2), b], BRAZO, grosor=1.5, mano_r=3)

# ------------------------------------------------------------------ magic: autumn leaves drift out of the fridge's light
# the vine's last leaves have turned autumn colours and drift off, light, toward the open paper
for k, (x, y, a, c) in enumerate(((880, 86, -20, ORO), (930, 64, 40, '#e8892e'), (986, 54, -50, CARMIN), (1046, 40, 20, '#c0703f'))):
    hoja(lz, x, y, 30 - k * 3, a, c, ancho=0.5)
lz.lapiz([bezier((852, 94), (900, 84), (960, 50), (1060, 26))], '#c8b8a0', grosor=0.5, presion=0.3, cortes=0.6)
lz.chispas(740, 160, 140, 20, n=8, tam=(0.7, 1.6), luz=0.2)

lz.vineta(margen=30)
lz.guardar(SALIDA)
print('ok', SALIDA)
