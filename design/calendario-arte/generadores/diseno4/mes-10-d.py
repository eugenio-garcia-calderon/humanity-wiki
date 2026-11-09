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
                      hojita, hoja, flor_simple, flor_grande, ramita, remuestrea, estrella, puntos_dentro, pececillo)
from extra_m910 import (cabeza_album, mano_dedos, manga, sombra, carita, brazito, lenteja, limon, pimiento, arroz,
                        huevo, _wash)

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
# the earthworm, curling happily
gus = Trazo(spline([(640, 772), (664, 756), (690, 770), (716, 788), (742, 774), (756, 758)]), (8, 9, 9, 8, 7))
lz.aguada(gus, '#e88a8a', dens=0.85, tapa=1, irreg=0.3, borde=0.7, toques=[(700, 778, 20, '#c86070', 0.5)], sombra=(-2, -3))
lz.contorno(gus, '#9a4a50', grosor=0.6, presion=0.55)
for p in remuestrea(gus.p, 5)[1:-1]:
    lz.lapiz([[p + (0, -3.5), p + (0, 3.5)]], '#b86070', grosor=0.5, presion=0.45)
carita(lz, 754, 760, 7, expr='feliz')
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
# what we do not throw away goes back to the earth: an apple core, a peel, an eggshell becoming soil
corazon = Poligono([(842, 752), (848, 742), (846, 732), (854, 728), (862, 732), (860, 742), (866, 752), (854, 760)])
_wash(lz, corazon, '#f0d8a0', dens=0.6, toques=[(854, 742, 6, '#d98a5a', 0.4)], lapiz='#9a6a3a')
lz.lapiz([[(854, 728), (856, 720)]], LP, grosor=0.8, presion=0.7)
lz.aguada(Elipse(850, 744, 1.6, 2.4), '#3a2a20', dens=0.9, irreg=0.1)
cascara = Trazo(spline([(880, 776), (896, 768), (914, 774), (926, 766)]), (5, 4, 4, 2))
_wash(lz, cascara, '#e8a040', dens=0.75, lapiz='#9a5a1a')
cas = Poligono([(784, 784), (794, 776), (804, 782), (800, 790), (790, 792)], suave=False)
_wash(lz, cas, '#f3e8d8', dens=0.4, lapiz='#9a8a7a')
for k in range(5):
    lz.lapiz([bezier((850 + k * 14, 762), (856 + k * 12, 778), (846 + k * 16, 798))], '#c8a070', grosor=0.5, presion=0.4, cortes=0.4)

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
FX0, FX1, FY0, FY1 = 560, 920, 128, 700
cuerpo = Poligono([(FX0, FY1 - 20), (FX0, FY0 + 64), (FX0 + 18, FY0 + 18), (FX0 + 70, FY0), (FX1 - 70, FY0), (FX1 - 18, FY0 + 18),
                   (FX1, FY0 + 64), (FX1, FY1 - 20), (FX1 - 14, FY1), (FX0 + 14, FY1)])
for lx in (FX0 + 40, FX1 - 40):     # little legs on the soil
    p = Trazo([(lx, FY1 - 4), (lx + (4 if lx > 700 else -4), FY1 + 12)], (12, 9))
    _wash(lz, p, '#7a5a4a', dens=0.8, lapiz=LP)
sombra(lz, 740, 714, 200, 10, color='#4a3020', dens=0.35)
lado_ = Poligono([(FX0 + 2, FY0 + 50), (FX0 - 26, FY0 + 70), (FX0 - 26, FY1 - 26), (FX0 + 2, FY1 - 8)], suave=False)
lz.aguada(lado_, '#b8443a', dens=1.0, tapa=1, borde=0.7, gran=0.4, toques=[(FX0 - 12, FY1 - 120, 60, '#8a2a24', 0.5)])
lz.contorno(lado_, '#6a2018', grosor=0.9, presion=0.55, cortes=0.2)
lz.aguada(cuerpo, '#e2604c', dens=1.05, tapa=1, borde=0.7, gran=0.35, sombra=(-14, -10, '#b8443a', 0.6),
          toques=[(FX0 + 60, FY0 + 60, 70, '#f39a7a', 0.6), (FX1 - 40, FY1 - 80, 90, '#c8503e', 0.5)])
lz.contorno(cuerpo, '#8a3022', grosor=1.0, presion=0.6, cortes=0.15)
# the cavity, glowing warm from inside
CX0, CX1, CY0, CY1 = 590, 892, 168, 668
cav = Poligono([(CX0, CY1), (CX0, CY0 + 30), (CX0 + 14, CY0), (CX1 - 14, CY0), (CX1, CY0 + 30), (CX1, CY1)], suave=False)
lz.aguada(cav, '#fbe8b8', dens=0.6, tapa=1, borde=0.4, irreg=0.4,
          toques=[(740, 420, 160, '#fff3d0', 0.8), (CX0 + 10, CY1 - 20, 80, '#e8b87a', 0.6), (CX1 - 10, CY0 + 20, 60, '#f0c890', 0.5)])
# inner side walls give depth: the left wall seen at an angle, darker
lz.aguada(Poligono([(CX0, CY0 + 30), (CX0 + 22, CY0 + 40), (CX0 + 22, CY1 - 14), (CX0, CY1)], suave=False), '#e0b07a', dens=0.45,
          irreg=0.3)
lz.aguada(Poligono([(CX0 + 14, CY0), (CX1 - 14, CY0), (CX1 - 26, CY0 + 14), (CX0 + 26, CY0 + 14)], suave=False), '#e8c08a',
          dens=0.4, irreg=0.3)
lz.luz(Elipse(740, 430, 150, 240), '#ffe7a8', fuerza=0.35, suave=40)
lz.contorno(cav, '#8a3022', grosor=0.9, presion=0.55, cortes=0.15)
# folk flowers painted on the fridge's frame (a fridge that is a work of art)
for (x, y) in [(FX0 + 14, y) for y in range(230, 680, 38)] + [(x, FY0 + 22) for x in range(640, 860, 40)] + \
              [(x, FY1 - 16) for x in range(620, 880, 44)]:
    flor_simple(lz, x, y, 6.5, rng.choice(['#fbe8c8', ORO, '#f6b6b0']), centro=TEAL)
    if rng.random() < 0.7:
        hojita(lz, x + 6, y + 4, 8, rng.uniform(0, 360), TEAL, tapa=0.8, nervio=False)

# a pumpkin vine grows out of the living soil and climbs the fridge (the garden it comes from)
tallo_v = spline([(540, 706), (528, 650), (540, 590), (526, 530), (538, 466), (526, 404), (538, 340), (528, 280), (544, 214),
                  (566, 156), (604, 120), (660, 106), (730, 104), (800, 110), (850, 122)], False, 10)
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
for (x, y) in ((534, 560), (536, 380), (620, 112)):
    flor_grande(lz, x, y, 12, '#f0a030', centro='#e86a1a', petalos=5)
# a little pumpkin sits on top of the fridge
gaj = Circulos([(732, 88, 15), (746, 86, 17), (760, 88, 15)])
_wash(lz, gaj, '#e8892e', toques=[(740, 80, 10, '#f6b75a', 0.6)], lapiz='#8a3e18')
lz.lapiz([arco(746, 88, 7, 16, -80, 80, 10), arco(746, 88, 7, 16, 100, 260, 10)], '#9a4a1a', grosor=0.6, presion=0.5)
lz.aguada(Trazo([(746, 70), (750, 62), (756, 58)], (5, 3, 2)), '#6a7a3a', dens=0.9, tapa=1)
carita(lz, 746, 90, 10, expr='feliz')

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
bufanda = Trazo([(622, 244), (648, 252), (674, 254), (700, 252), (722, 244)], (10, 11, 11, 11, 10))
_wash(lz, bufanda, CARMIN, lapiz='#7a1f30')
for k in range(7):
    lz.lapiz([[(628 + k * 14, 246 + (3 if 1 < k < 6 else 0)), (630 + k * 14, 256 + (3 if 1 < k < 6 else 0))]], '#f6ead6', grosor=1.0, presion=0.7)
cola_b = Trazo([(630, 252), (626, 262), (618, 268)], (9, 8, 7))
_wash(lz, cola_b, CARMIN, lapiz='#7a1f30')
lz.lapiz([[(614 + k * 2.5, 268), (612 + k * 2.5, 274)] for k in range(4)], CARMIN, grosor=0.7, presion=0.7)
lz.gouache(Elipse(706, 214, 5, 2), '#ffffff', alfa=0.8, irreg=0)     # frost
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
brazito(lz, [(606, 340), (592, 324), (584, 304)], BRAZO, mano_r=3.2)
brazito(lz, [(648, 348), (656, 360), (650, 372)], BRAZO, mano_r=3)
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
lz.aguada(Elipse(870, 352, 2.6), '#2e211c', dens=1.3, irreg=0.1)
lz.gouache(Elipse(871, 351, 0.8), '#ffffff', alfa=0.9, irreg=0)
carita(lz, 846, 356, 9, expr='guino', mejillas=True)
rodaja = Elipse(884, 372, 10, 6)
_wash(lz, rodaja, '#f2cf3a', dens=0.8, lapiz='#a07a12')
lz.lapiz([[(884, 372), (884 + math.cos(math.radians(a)) * 8, 372 + math.sin(math.radians(a)) * 4.6)] for a in range(0, 360, 60)],
         '#fbe88a', grosor=0.6, presion=0.6)
balda(380)

# --- the heroes' shelf: rice, lentil, lemon and pepper (days 3 and 4, and the iron + vitamin C friendship)
# little family of lentils and rice grains at their feet
for (x, y) in ((626, 519), (640, 520), (722, 519), (633, 514), (736, 520), (748, 519)):
    lenteja(lz, x, y, 6.5, rng.uniform(-20, 20))
for (x, y, a) in ((660, 518, 80), (672, 520, 100), (666, 514, 60)):
    arroz(lz, x, y, 7, a)
saco = Poligono([(594, 520), (592, 494), (600, 478), (596, 470), (616, 468), (612, 480), (620, 496), (618, 520)])
lz.aguada(saco, '#d9c49a', dens=0.6, tapa=1, irreg=0.4, borde=0.7, gran=0.6, sombra=(-3, -3))
lz.rayado(saco, '#a8906a', angulo=0, sep=2.6, presion=0.3, grosor=0.6)
lz.contorno(saco, '#7a6a4a', grosor=0.7, presion=0.5)
lz.lapiz([[(597, 478), (615, 476)]], CARMIN, grosor=1.4, presion=0.8)
# the rice grain (left)
arroz(lz, 630, 462, 48, -6)
carita(lz, 630, 450, 22, expr='risa', mira=(1, 0))
# the lemon (behind, right of the lentil)
limon(lz, 772, 468, 44, -12)
carita(lz, 784, 460, 22, expr='feliz')
# the red pepper (far right), leaning in to kiss the lemon's cheek
pimiento(lz, 850, 460, 38)
carita(lz, 842, 454, 19, expr='beso', mira=(-1, 0))
# the lentil in front, between them: holds rice's hand and hugs the lemon
lenteja(lz, 702, 478, 42, -6)
carita(lz, 702, 470, 22, expr='sonrisa', mira=(1, -0.3))
# little legs
for (x0, sd) in ((690, -1), (714, 1)):
    brazito(lz, [(x0, 504), (x0 + sd * 3, 514), (x0 + sd * 8, 518)], BRAZO, grosor=1.6, mano_r=3)
for (x0, sd) in ((620, -1), (638, 1)):
    brazito(lz, [(x0, 506), (x0 + sd * 2, 514), (x0 + sd * 7, 518)], BRAZO, grosor=1.6, mano_r=3)
for (x0, sd) in ((838, -1), (860, 1)):
    brazito(lz, [(x0, 498), (x0 + sd * 2, 510), (x0 + sd * 7, 516)], BRAZO, grosor=1.6, mano_r=3)
# hands: lentil <-> rice ; lentil hugs lemon ; lemon hugs lentil back ; pepper's hand on the lemon's shoulder
brazito(lz, [(664, 484), (656, 492), (650, 490)], BRAZO, grosor=1.6, mano_r=3.8)
brazito(lz, [(648, 470), (652, 482), (650, 490)], BRAZO, grosor=1.6, mano=False)
brazito(lz, [(740, 470), (756, 456), (772, 462), (778, 478)], BRAZO, grosor=1.6, mano_r=3.8)
brazito(lz, [(750, 486), (734, 462), (718, 446), (704, 440)], BRAZO, grosor=1.6, mano_r=3.8)
brazito(lz, [(820, 446), (808, 436), (796, 444)], BRAZO, grosor=1.6, mano_r=3.8)
# a tiny heart floats between the pepper and the lemon
cor = Poligono([(810, 418), (805, 411), (810, 406), (815, 411), (820, 406), (825, 411), (820, 418), (815, 424)])
lz.aguada(cor, CARMIN, dens=0.95, tapa=1, irreg=0.1)
lz.contorno(cor, '#7a1f30', grosor=0.6, presion=0.5)
# sparks of vitamin light from the lemon and the pepper to the lentil (iron taken in)
for k in range(11):
    t = k / 10
    x = 790 - t * 80 + 6 * math.sin(t * 6)
    y = 418 - 18 * math.sin(t * 3)
    lz.gouache(Elipse(x, y, 1.5 + (k % 3) * 0.5), '#fff3b0', alfa=0.9, irreg=0)
lz.luz((730, 450, 50), '#ffe7a0', fuerza=0.25)
balda(522)

# --- the crisper drawer: vegetables peeking out over its edge
for (x, ang, L) in ((628, -100, 46), (640, -88, 50), (650, -76, 44)):
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
tom = Elipse(860, 548, 17, 15)
_wash(lz, tom, '#d8402e', toques=[(852, 540, 8, '#f39a6a', 0.6)], lapiz='#7a2020')
for a in range(5):
    aa = math.radians(a * 72 - 90)
    lz.lapiz([[(860, 534), (860 + math.cos(aa) * 7, 534 + math.sin(aa) * 4)]], '#4f6f45', grosor=0.9, presion=0.8)
carita(lz, 860, 550, 9, expr='guino')
cajon = Poligono([(CX0 + 8, 560), (CX1 - 8, 560), (CX1 - 10, CY1 - 6), (CX0 + 10, CY1 - 6)], suave=False)
lz.aguada(cajon, '#bfe0dc', dens=0.45, tapa=0.35, irreg=0.3, borde=0.8, toques=[(740, 640, 80, '#9ccac4', 0.5)])
lz.contorno(cajon, '#3f7a76', grosor=0.8, presion=0.55)
# through the frosted glass: a jumble of leaves and roots, only hinted
lz.aguada(Poligono([(602, 600), (640, 590), (700, 600), (760, 592), (820, 600), (880, 594), (880, 660), (602, 660)])
          & Poligono([(CX0 + 10, 562), (CX1 - 10, 562), (CX1 - 12, CY1 - 8), (CX0 + 12, CY1 - 8)], suave=False), '#86b06a',
          dens=0.35, irreg=1.2, borde=0.6, toques=[(650, 630, 40, '#ec9a5a', 0.6), (840, 630, 40, '#d86a6a', 0.5)])
lz.lapiz([arco(620 + k * 34, 640 + (k % 2) * 6, 16, 10, 190, 350, 12, k * 20) for k in range(8)], '#5f8a5a', grosor=0.6,
         presion=0.35, cortes=0.3)
lz.aguada(Trazo([(712, 584), (768, 584)], (5, 5)), '#e8c08a', dens=0.85, tapa=1, irreg=0.2)
lz.contorno(Trazo([(712, 584), (768, 584)], (5, 5)), '#8a5a32', grosor=0.6, presion=0.5)
lz.gouache(Trazo([(CX0 + 20, 572), (CX0 + 60, 572)], (1.6, 1)), '#ffffff', alfa=0.7, irreg=0)

# ------------------------------------------------------------------ the open door (inside face), with its shelves
DP = [(922, 146), (1082, 104), (1082, 734), (922, 690)]
puerta = Poligono(DP, suave=False)
lz.aguada(puerta, '#e2604c', dens=1.05, tapa=1, borde=0.7, gran=0.35, sombra=(-8, -6, '#b8443a', 0.5),
          toques=[(1060, 420, 80, '#f39a7a', 0.5)])
lz.contorno(puerta, '#8a3022', grosor=1.0, presion=0.6, cortes=0.15)
forro = Poligono([(936, 168), (1068, 134), (1068, 706), (936, 670)], suave=False)
lz.aguada(forro, '#fbe8c0', dens=0.55, tapa=1, borde=0.4, irreg=0.4, toques=[(1000, 400, 90, '#fff3d0', 0.7)])
lz.contorno(forro, '#8a3022', grosor=0.8, presion=0.5)
lz.luz(forro, '#ffe7a8', fuerza=0.18, suave=20)


def ybin(x, y0, y1):
    """Interpolate the door's perspective: a line from (936, y0) to (1068, y1)."""
    return y0 + (y1 - y0) * (x - 936) / 132


def bandeja(y0, y1, h):
    b = Poligono([(938, y0), (1066, y1), (1066, y1 + h * 1.1), (938, y0 + h)], suave=False)
    lz.aguada(b, '#f6d8a8', dens=0.55, tapa=1, irreg=0.2, borde=0.8, toques=[(1000, (y0 + y1) / 2 + h / 2, 40, '#e8b87a', 0.5)])
    lz.contorno(b, '#8a5a32', grosor=0.8, presion=0.55)
    lz.gouache(Trazo([(946, y0 + 3), (1056, y1 + 3)], (1.2, 1.2)), '#fffbe8', alfa=0.6, irreg=0)


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

# ------------------------------------------------------------------ the boy bringing autumn produce from the garden (day 2)
PIEL = '#7a4a32'
NX, NY, NR = 446, 470, 38
sombra(lz, 448, 714, 64, 9, color='#4a3020', dens=0.35)
# legs: corduroy trousers, one knee bent as he steps up to the fridge
for (pts, w) in (([(430, 620), (424, 664), (420, 700)], (24, 21, 18)), ([(462, 620), (474, 660), (476, 698)], (24, 21, 18))):
    manga(lz, pts, w, '#3f6f8c', pliegues=0, sombra=(-4, -3))
    lz.lapiz([[(pts[0][0] + d, pts[0][1] + 8), (pts[2][0] + d, pts[2][1] - 6)] for d in (-5, 0, 5)], '#2a4a6a', grosor=0.5,
             presion=0.35)
for (x, y, sd) in ((414, 706, -1), (482, 704, 1)):
    z = Poligono([(x - 14, y + 4), (x - 12, y - 6), (x + 6, y - 8), (x + 18 * sd if sd > 0 else x + 12, y), (x + 14, y + 6)])
    _wash(lz, z, '#c0703f', dens=0.85, lapiz='#6a3a1a')
# back arm (image left), under the basket
manga(lz, [(414, 530), (418, 592), (468, 622)], (26, 23, 20), '#f0a828', pliegues=2)
# jumper: mustard with a teal band
jersey = Poligono([(420, 516), (472, 516), (488, 548), (490, 630), (404, 630), (402, 548)])
lz.aguada(jersey, '#f0a828', dens=0.95, tapa=1, borde=0.7, gran=0.4, sombra=(-10, -6, '#c4702a', 0.6))
lz.contorno(jersey, '#8a5a12', grosor=0.9, presion=0.55)
for y in (566, 574):
    lz.aguada(Trazo([(404, y), (490, y)], (5, 5), suave=False) & jersey, TEAL, dens=0.9, irreg=0.2)
for k in range(8):
    lz.aguada(Elipse(410 + k * 11, 588, 2.2), CARMIN, dens=0.9, irreg=0.1)
lz.lapiz([bezier((430, 600), (440, 612), (436, 628)), bezier((470, 596), (476, 612), (478, 628))], '#a0661a', grosor=0.7, presion=0.45)
cabeza_album(lz, NX, NY, NR, piel=PIEL, peinado='rizado', pelo='#1e140f', giro=0.5, inclina=6, ojos='abiertos', boca='risa',
             mira=(1, 0.2))
lz.aguada(Poligono([(428, 514), (446, 524), (466, 514), (456, 508), (436, 508)]), PIEL, dens=0.6, tapa=1, irreg=0.2)
lz.lapiz([spline([(424, 516), (446, 528), (470, 516)])], '#8a5a12', grosor=1.6, presion=0.7)
# the basket of autumn produce he holds out
BX, BY = 540, 600
for (x, y, r_, c) in ((520, 572, 22, '#e8892e'),):          # pumpkin
    gaj = Circulos([(x - 10, y, 14), (x, y - 2, 15), (x + 10, y, 14)])
    _wash(lz, gaj, c, toques=[(x - 6, y - 6, 8, '#f6b75a', 0.6)], lapiz='#8a3e18')
    lz.lapiz([arco(x, y, 6, 14, -80, 80, 10), arco(x, y, 6, 14, 100, 260, 10)], '#9a4a1a', grosor=0.6, presion=0.5)
    lz.aguada(Trazo([(x, y - 14), (x + 4, y - 24)], (4, 2.5)), '#6a7a3a', dens=0.9, tapa=1)
granada = Elipse(556, 570, 16, 15)
_wash(lz, granada, '#b8304a', toques=[(550, 562, 8, '#e8606a', 0.6)], lapiz='#6a1a2a')
lz.aguada(Poligono([(554, 556), (558, 548), (562, 556)], suave=False), '#8a2a3a', dens=0.9, tapa=1)
abierta = Elipse(560, 574, 7, 6)
lz.aguada(abierta, '#f6e0c8', dens=0.6, tapa=1, irreg=0.2)
for _ in range(10):
    lz.aguada(Elipse(560 + rng.uniform(-5, 5), 574 + rng.uniform(-4, 4), 1.6), '#d0203a', dens=1.0, irreg=0.1)
caqui = Circulos([(584, 578, 13)])
_wash(lz, caqui, '#f08a2a', toques=[(580, 572, 6, '#f8c06a', 0.6)], lapiz='#9a4a12')
lz.aguada(Poligono([(578, 566), (584, 562), (590, 566), (584, 570)], suave=False), '#5a6a2a', dens=0.9, tapa=1)
carita(lz, 584, 580, 7, expr='feliz')
for (x, y) in ((534, 588), (548, 590)):   # chestnuts
    c_ = Poligono([(x - 7, y + 5), (x - 7, y - 2), (x, y - 7), (x + 7, y - 2), (x + 7, y + 5)])
    _wash(lz, c_, '#7a3a1a', toques=[(x - 2, y - 2, 3, '#a8603a', 0.6)], lapiz='#3a1a0a')
    lz.aguada(Trazo([(x - 7, y + 4), (x + 7, y + 4)], (3, 3)), '#c8a070', dens=0.7, irreg=0.1)
cesto = Poligono([(498, 584), (604, 584), (594, 630), (508, 630)])
lz.aguada(cesto, '#c99a5a', dens=0.8, tapa=1, irreg=0.3, borde=0.7, gran=0.4, sombra=(-5, -4))
lz.rayado(cesto, '#7a5a30', angulo=0, sep=4.2, presion=0.45, grosor=0.9)
lz.rayado(cesto, '#7a5a30', angulo=80, sep=6, presion=0.3, grosor=0.7)
lz.contorno(cesto, '#6a4a2a', grosor=0.8, presion=0.55)
lz.lapiz([arco(551, 584, 46, 50, 200, 340, 30)], '#6a4a2a', grosor=2.2, presion=0.7)
# front arm (image right) holds the basket's rim
manga(lz, [(472, 530), (494, 576), (518, 596)], (26, 23, 20), '#f0a828', pliegues=2)
mano_dedos(lz, 516, 596, -10, 30, PIEL, curl=0.75, abre=0.35, lado=1, pulgar=0.3)
mano_dedos(lz, 470, 624, -4, 30, PIEL, curl=0.5, abre=0.4, lado=-1, pulgar=0.3)

# ------------------------------------------------------------------ magic: autumn leaves drift out of the fridge's light
# the vine's last leaves have turned autumn colours and drift off, light, toward the open paper
for k, (x, y, a, c) in enumerate(((878, 112, -20, ORO), (928, 86, 40, '#e8892e'), (984, 72, -50, CARMIN), (1044, 52, 20, '#c0703f'))):
    hoja(lz, x, y, 30 - k * 3, a, c, ancho=0.5)
lz.lapiz([bezier((852, 122), (900, 112), (960, 70), (1060, 40))], '#c8b8a0', grosor=0.5, presion=0.3, cortes=0.6)
lz.chispas(740, 120, 120, 30, n=8, tam=(0.7, 1.6), luz=0.2)

lz.vineta(margen=30)
lz.guardar(SALIDA)
print('ok', SALIDA)
