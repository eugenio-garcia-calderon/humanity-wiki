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
# what we do not throw away goes back to the earth: right under the fridge, an apple core, eggshells,
# carrot peelings and dry leaves crumble, little by little, into dark soil (compost, days 28-29)
bolsa_c = Poligono([(596, 712), (904, 712), (914, 744), (880, 792), (760, 802), (640, 794), (588, 752)])
lz.aguada(bolsa_c, '#4a2e1c', dens=0.6, suave=10, gran=0.8, var=0.6, toques=[(740, 790, 90, '#2e1c12', 0.6)],
          desvanece=(0, 820, 0, 708))
lz.aguada(bolsa_c, '#3a2414', dens=0.35, suave=14, desvanece=(0, 712, 0, 800))
for (cx, cy, a) in ((640, 732, 0), (868, 730, 30)):   # carrot peelings, curling
    pel = Trazo(spline([(cx - 18, cy), (cx - 8, cy - 8), (cx + 4, cy - 2), (cx + 2, cy + 8), (cx + 14, cy + 6), (cx + 20, cy - 4)]),
                (5, 6, 6, 5, 4, 2))
    lz.aguada(pel, '#ec7a2a', dens=0.9, tapa=0.9, irreg=0.4, borde=0.8, desvanece=(0, cy - 10, 0, cy + 22))
    lz.contorno(pel, '#9a3a12', grosor=0.6, presion=0.55, cortes=0.3)
for (cx, cy, L, ang, c) in ((760, 756, 30, -20, '#c08a3a'), (820, 770, 26, 200, '#a8703a'), (680, 768, 24, 10, '#d0a040')):  # dry leaves
    hoja(lz, cx, cy, L, ang, c, ancho=0.45, tapa=0.85, dens=0.8)
corazon = Poligono([(720, 740), (728, 726), (726, 712), (736, 706), (746, 712), (744, 726), (752, 740), (736, 750)])
lz.aguada(corazon, '#f3e0b0', dens=0.8, tapa=1, irreg=0.3, borde=0.8, toques=[(736, 726, 7, '#c87a4a', 0.6)], sombra=(-2, -2))
lz.aguada(Poligono([(720, 740), (726, 732), (746, 732), (752, 740), (736, 750)]), '#d94a3a', dens=0.6, irreg=0.3)
lz.contorno(corazon, '#8a5a2a', grosor=0.7, presion=0.55, cortes=0.15)
lz.lapiz([[(736, 706), (738, 696)]], LP, grosor=0.9, presion=0.8)
for (x, y) in ((733, 724), (740, 726)):
    lz.aguada(Elipse(x, y, 1.6, 2.6), '#3a2a20', dens=0.9, irreg=0.1)
for (cx, cy) in ((800, 738), (814, 748)):   # eggshell halves, white with a jagged rim
    cas = Poligono([(cx - 10, cy - 2), (cx - 6, cy - 7), (cx - 2, cy - 3), (cx + 2, cy - 8), (cx + 6, cy - 3), (cx + 10, cy - 6),
                    (cx + 10, cy + 2), (cx + 4, cy + 8), (cx - 4, cy + 8), (cx - 10, cy + 3)], suave=False)
    lz.aguada(cas, '#f8f0e2', dens=0.5, tapa=1, irreg=0.2, toques=[(cx + 3, cy + 3, 5, '#d8c8b0', 0.6)])
    lz.contorno(cas, '#8a7a6a', grosor=0.6, presion=0.5)
# toward the bottom the scraps are only crumbs, then earth
for _ in range(70):
    x, y = rng.uniform(612, 888), rng.uniform(756, 798)
    lz.aguada(Elipse(x, y, rng.uniform(1.2, 3.0), rng.uniform(1, 2.2)), rng.choice(['#5a3a22', '#7a5032', '#c07a3a', '#e8a050', '#f3e8d8']),
              dens=0.75, irreg=0.3)
lz.lapiz([bezier((x, 720), (x + 6, 750), (x - 4, 790)) for x in (660, 700, 790, 850)], '#a8784a', grosor=0.5, presion=0.35, cortes=0.4)

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
lz.aguada(cav, '#d8954e', dens=0.85, tapa=1, borde=0.55, irreg=0.4,
          toques=[(740, 300, 120, '#f6d8a0', 0.75), (CX0 + 10, CY1 - 20, 110, '#a8682e', 0.7), (CX1 - 10, CY1 - 40, 110, '#b0703a', 0.65)])
# inner side walls give depth: the left wall seen at an angle, darker
lz.aguada(Poligono([(CX0, CY0 + 30), (CX0 + 22, CY0 + 40), (CX0 + 22, CY1 - 14), (CX0, CY1)], suave=False), '#e0b07a', dens=0.45,
          irreg=0.3)
lz.aguada(Poligono([(CX0 + 14, CY0), (CX1 - 14, CY0), (CX1 - 26, CY0 + 14), (CX0 + 26, CY0 + 14)], suave=False), '#e8c08a',
          dens=0.4, irreg=0.3)
lz.luz(Poligono([(728, 182), (752, 182), (880, 560), (600, 560)], suave=False), '#ffe2a0', fuerza=0.32, suave=40)   # the cone of light
bombilla = Elipse(740, 182, 10, 8)
lz.aguada(Poligono([(728, 170), (752, 170), (748, 176), (732, 176)], suave=False), '#b8a890', dens=0.7, tapa=1)
lz.aguada(bombilla, '#ffe9a0', dens=0.5, tapa=1, irreg=0.1)
lz.luz((740, 184, 30), '#fff2c0', fuerza=0.9)
lz.luz(Elipse(740, 716, 200, 26), '#ffd890', fuerza=0.35, suave=24)   # the warm light spills onto the soil
lz.contorno(cav, '#8a3022', grosor=0.9, presion=0.55, cortes=0.15)
# folk painting on the fridge, done by brush: few motifs, big and varied, some leaves running past the edges
lz.aguada(Trazo(spline([(592, 150), (640, 140), (700, 152), (780, 150), (840, 140), (896, 146)])[::3], (4, 4, 3)), '#2f6a5a', dens=0.85,
          tapa=1, irreg=0.3)
for (x, y, L, a, c) in ((612, 146, 26, 200, '#2f7a6a'), (700, 150, 30, -14, '#3f8a6a'), (786, 152, 28, 196, '#2f7a6a'),
                        (900, 128, 34, -40, '#3f8a6a'), (580, 132, 30, 220, '#2f7a6a')):
    hoja(lz, x, y, L, a, c, ancho=0.42, tapa=1)
flor_popular(lz, 652, 132, 19, '#f6e6c8', CARMIN, petalos=8)
flor_grande(lz, 840, 134, 16, ORO, centro=CARMIN, petalos=6)
pajaro(lz, 748, 128, 22, TEAL, ang=-10, alas='arriba', vientre='#f6d27a')
# the bottom band: two big leaves and a flower
hoja(lz, 712, 686, 30, 182, '#2f7a6a', ancho=0.45, tapa=1)
hoja(lz, 770, 686, 30, -2, '#3f8a6a', ancho=0.45, tapa=1)
flor_popular(lz, 742, 684, 12, ORO, CARMIN, petalos=6)
# on the side panel, behind the vine: big painted leaves that run past its edge
for (x, y, L, a) in ((524, 300, 36, 196), (522, 470, 34, 160), (526, 620, 32, 200)):
    hoja(lz, x, y, L, a, '#2f7a6a', ancho=0.5, tapa=1)
flor_grande(lz, 541, 246, 13, '#f6b6b0', centro=CARMIN, petalos=7)

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

# --- dairy and fish shelf (lower and a little smaller, so the lentils can have the stage)
leche = Poligono([(606, 350), (604, 302), (612, 288), (612, 276), (636, 276), (636, 288), (646, 302), (644, 350)])
lz.aguada(leche, '#d6e8f0', dens=0.55, tapa=1, irreg=0.2, borde=0.8)
lz.aguada(Poligono([(607, 348), (606, 306), (644, 306), (643, 348)]), '#fdfcf8', dens=0.4, tapa=0.9, irreg=0.2,
          toques=[(638, 336, 12, '#b8c8d8', 0.7)])
lz.aguada(Trazo([(606, 330), (644, 330)], (7, 7), suave=False) & leche, '#3f6f8c', dens=0.85, irreg=0.2)
lz.contorno(leche, '#4a6a88', grosor=0.9, presion=0.6)
lz.aguada(Poligono([(610, 280), (638, 280), (638, 268), (610, 268)], suave=False), '#3f6f8c', dens=0.9, tapa=1)
lz.gouache(Trazo([(610, 308), (610, 344)], (2.4, 1.6)), '#ffffff', alfa=0.75, irreg=0)
carita(lz, 625, 316, 13, expr='o', mira=(-1, 0))
queso = Poligono([(664, 350), (660, 312), (686, 300), (728, 302), (738, 318), (736, 350)])
_wash(lz, queso, '#f0b030', toques=[(720, 336, 24, '#d98a1a', 0.6)], lapiz='#9a6a1a', dens=1.0)
lz.aguada(Poligono([(660, 312), (686, 300), (728, 302), (738, 318), (708, 326), (676, 322)]), '#f8d870', dens=0.7, tapa=1, irreg=0.2)
for (x, y, r_) in ((680, 338, 4), (722, 342, 3), (708, 334, 2.5), (690, 346, 2)):
    lz.aguada(Elipse(x, y, r_, r_ * 0.8), '#b8761a', dens=0.8, irreg=0.2, borde=0.8)
carita(lz, 702, 330, 14, expr='sonrisa', mira=(-0.5, 0))
for (x, c) in ((758, '#e86a8a'), (780, '#9a6ac0')):
    y_ = Poligono([(x - 10, 350), (x - 12, 322), (x + 12, 322), (x + 10, 350)], suave=False)
    lz.aguada(y_, '#fbf6ee', dens=0.45, tapa=1, irreg=0.2, toques=[(x, 344, 8, c, 0.9)])
    lz.contorno(y_, '#8a7a8a', grosor=0.6, presion=0.5)
    lz.aguada(Poligono([(x - 13, 322), (x + 13, 322), (x + 12, 316), (x - 12, 316)], suave=False), c, dens=0.95, tapa=1)
carita(lz, 758, 336, 7, expr='feliz')
plato = Elipse(842, 344, 40, 8)
_wash(lz, plato, '#e8eef2', dens=0.55, lapiz='#5a7a8a', toques=[(842, 346, 20, '#8ab0d0', 0.6)])
for k in range(10):
    a = math.radians(k * 36)
    lz.aguada(Elipse(842 + math.cos(a) * 34, 344 + math.sin(a) * 6.5, 1.8), TEAL, dens=0.85, irreg=0.1)
pez = Poligono([(806, 334), (820, 318), (848, 312), (870, 320), (878, 332), (868, 340), (840, 344), (816, 342)])
cola = Poligono([(806, 334), (794, 318), (798, 334), (792, 350)], suave=False)
_wash(lz, pez | cola, '#5f8fb8', toques=[(850, 318, 18, '#2f5a8a', 0.7), (840, 340, 16, '#dfe8ec', 0.7), (820, 326, 12, '#6fb1ad', 0.6)],
      lapiz='#2a4a6a', dens=0.95)
for k in range(6):
    lz.lapiz([arco(824 + k * 8, 328, 4, 5, 300, 420, 8)], '#2a4a6a', grosor=0.5, presion=0.5)
lz.lapiz([arco(866, 328, 6, 9, 290, 430, 10)], '#2a4a6a', grosor=0.6, presion=0.55)
lz.lapiz([arco(864, 326, 4, 3, 200, 340, 10)], '#1e140f', grosor=1.0, presion=0.9)          # a wink
lz.aguada(Elipse(866, 332, 4, 2.4), '#e9727a', dens=0.55, suave=1.5)
lz.lapiz([arco(876, 332, 3, 2.5, 20, 120, 8)], '#5a2a2a', grosor=0.7, presion=0.7)
rodaja = Elipse(884, 346, 10, 6)
_wash(lz, rodaja, '#f2cf3a', dens=0.9, lapiz='#a07a12')
lz.lapiz([[(884, 346), (884 + math.cos(math.radians(a)) * 8, 346 + math.sin(math.radians(a)) * 4.6)] for a in range(0, 360, 60)],
         '#fbe88a', grosor=0.6, presion=0.6)
balda(350)

# --- the heroes' shelf, the biggest one: out of a jar, lentils and grains of rice walk hand in hand up a
# wooden spoon to the lemon, and the first lentil to arrive hugs it (days 3 and 4, and iron + vitamin C)
lz.luz(Elipse(760, 440, 160, 90), '#ffe2a0', fuerza=0.3, suave=30)
ramp = lambda x: 518 - (x - 668) * 0.36
cuchara = Trazo([(660, 520), (790, ramp(790))], (9, 10))
lz.aguada(cuchara, '#c8925a', dens=0.85, tapa=1, irreg=0.3, borde=0.7, sombra=(-2, -2))
lz.contorno(cuchara, '#7a4a22', grosor=0.7, presion=0.55)
lz.lapiz([[(670, 517), (786, ramp(786) - 1)]], '#e8c08a', grosor=0.8, presion=0.5)
cuenco_b = Poligono(np.vstack([arco(846, 520, 48, 6, 0, 180, 12)[::-1], arco(846, 470, 40, 12, 180, 360, 16)]), suave=False)
cuenco_b = Poligono([(798, 520), (806, 478), (822, 466), (846, 462), (870, 466), (886, 478), (892, 520)])
lz.aguada(cuenco_b, '#c0703f', dens=0.9, tapa=1, irreg=0.3, borde=0.75, gran=0.4, sombra=(-6, -4),
          toques=[(830, 480, 16, '#e0905a', 0.6)])
lz.contorno(cuenco_b, '#7a3a1a', grosor=0.8, presion=0.55)
for k in range(6):
    lz.aguada(Elipse(812 + k * 14, 500, 3), '#f6e6c8', dens=0.6, tapa=0.8, irreg=0.1)
tarro_l = Poligono([(598, 466), (636, 462), (646, 472), (660, 474), (660, 514), (646, 516), (636, 522), (598, 522), (590, 510), (590, 478)])
lz.aguada(tarro_l, '#dcecf0', dens=0.35, tapa=1, irreg=0.2, borde=0.8)
for _ in range(30):
    lenteja(lz, rng.uniform(598, 652), rng.uniform(490, 516), 5, rng.uniform(-30, 30))
for _ in range(12):
    arroz(lz, rng.uniform(600, 652), rng.uniform(484, 512), 6, rng.uniform(0, 180))
lz.contorno(tarro_l, '#5a8a9a', grosor=0.85, presion=0.6)
lz.gouache(Trazo([(600, 472), (642, 468)], (1.8, 1.0)), '#ffffff', alfa=0.7, irreg=0)
for (x, y) in ((668, 518), (662, 513), (674, 520)):
    lenteja(lz, x, y, 5, 10)
# the pepper peeks over the lemon's shoulder and kisses its cheek; the lemon sits on the bowl
pimiento(lz, 872, 372, 27)
carita(lz, 866, 368, 12, expr='beso', mira=(-1, 0))
limon(lz, 844, 422, 46, -14)
carita(lz, 854, 410, 22, expr='feliz')
brazito(lz, [(852, 388), (840, 378), (832, 386)], BRAZO, grosor=1.6, mano_r=3.4)
cor = Poligono([(830, 346), (825, 339), (830, 334), (835, 339), (840, 334), (845, 339), (840, 346), (835, 352)])
lz.aguada(cor, CARMIN, dens=0.95, tapa=1, irreg=0.1)
lz.contorno(cor, '#7a1f30', grosor=0.6, presion=0.5)
# the chain up the spoon: lentil, rice, lentil, rice
cadena = [('l', 692), ('r', 722), ('l', 752), ('r', 780)]
pos = []
for (kind, x) in cadena:
    if kind == 'l':
        y = ramp(x) - 21
        lenteja(lz, x, y, 19, -10)
        carita(lz, x, y - 3, 11.5, expr='sonrisa' if x < 720 else 'risa', mira=(1, -0.3))
        foot = 12
    else:
        y = ramp(x) - 32
        arroz(lz, x, y, 26, -6)
        carita(lz, x, y - 7, 10, expr='feliz')
        foot = 23
    pos.append((x, y, foot))
    for sd in (-1, 1):
        brazito(lz, [(x + sd * 5, y + foot), (x + sd * 6, ramp(x + sd * 6) - 6), (x + sd * 10, ramp(x + sd * 10) - 1)], BRAZO,
                grosor=1.3, mano_r=2)
for (a, b) in zip(pos[:-1], pos[1:]):
    m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 6)
    brazito(lz, [(a[0] + 11, a[1] + 2), (m[0] - 3, m[1] + 3), m], BRAZO, grosor=1.5, mano=False)
    brazito(lz, [(b[0] - 9, b[1] + 2), (m[0] + 3, m[1] + 3), m], BRAZO, grosor=1.5, mano_r=3)
# the first lentil to arrive hugs the lemon (vitamin C helps it take in the iron)
lx, ly = 808, 446
lenteja(lz, lx, ly, 19, -24)
carita(lz, lx, ly - 5, 11.5, expr='feliz')
brazito(lz, [(lx + 14, ly - 8), (lx + 28, ly - 8), (lx + 40, ly - 2)], BRAZO, grosor=1.6, mano_r=3)
brazito(lz, [(lx + 14, ly + 6), (lx + 30, ly + 10), (lx + 44, ly + 6)], BRAZO, grosor=1.6, mano_r=3)
brazito(lz, [(lx - 14, ly + 4), (lx - 18, ly + 10), (pos[-1][0] + 8, pos[-1][1] + 4)], BRAZO, grosor=1.4, mano_r=2.6)   # still holds the rice
for sd in (-1, 1):
    brazito(lz, [(lx + sd * 5, ly + 12), (lx + sd * 7, ly + 18), (lx + sd * 10, 466)], BRAZO, grosor=1.3, mano_r=2)
for k in range(12):   # sparks of vitamin light from the lemon and pepper down the chain
    t = k / 11
    x = 836 - t * 140 + 6 * math.sin(t * 6)
    y = 396 - 30 * math.sin(t * 3) + t * 40
    lz.gouache(Elipse(x, y, 1.5 + (k % 3) * 0.5), '#fff3b0', alfa=0.9, irreg=0)
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
# the door is painted too: a big bird on its top band and a flowering branch down its outer edge,
# its leaves running out past the door
pajaro(lz, 1000, 150, 17, CORAL, ang=-16, alas='arriba', vientre='#f6d27a')
rama = spline([(1068, 716), (1074, 640), (1066, 560), (1074, 470), (1066, 380), (1074, 290), (1068, 200)], False, 10)
lz.aguada(Trazo(rama[::3], (4, 3.5, 3)), '#2f6a5a', dens=0.85, tapa=1, irreg=0.3)
qq = remuestrea(rama, 46)
for k, p in enumerate(qq[1:-1]):
    sd = 1 if k % 2 else -1
    hoja(lz, p[0], p[1], 26 + 4 * (k % 2), -90 + sd * 62, ['#2f7a6a', '#3f8a6a'][k % 2], ancho=0.45, tapa=1)
flor_popular(lz, 1072, 610, 13, '#f6e6c8', CARMIN, petalos=7)
flor_grande(lz, 1070, 430, 12, CORAL, centro=ORO, petalos=6)
flor_popular(lz, 1072, 262, 11, ORO, TEAL, petalos=5)


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
jersey = Poligono([(450, 524), (430, 536), (422, 562), (428, 600), (420, 634), (504, 628), (496, 598), (510, 560), (502, 528), (486, 520)])
lz.aguada(jersey, '#f0a828', dens=0.98, tapa=1, borde=0.7, gran=0.4, sombra=(-10, -6, '#c4702a', 0.6))
lz.contorno(jersey, '#8a5a12', grosor=0.9, presion=0.55)
for y in (570, 578):
    lz.aguada(Trazo([(414, y), (514, y - 4)], (5, 5), suave=False) & jersey, TEAL, dens=0.9, irreg=0.2)
for k in range(8):
    lz.aguada(Elipse(424 + k * 11, 592 - k * 0.4, 2.2), CARMIN, dens=0.9, irreg=0.1)
lz.lapiz([bezier((432, 600), (452, 594), (470, 604)), bezier((476, 598), (488, 592), (498, 600)),       # bends at the waist
          bezier((486, 540), (496, 552), (504, 548)), bezier((440, 610), (446, 620), (442, 630)), bezier((492, 610), (496, 620), (498, 628)),
          bezier((428, 548), (436, 556), (432, 570))], '#a0661a', grosor=0.75, presion=0.5)
lz.aguada(Trazo([(422, 626), (504, 620)], (9, 9), suave=False) & jersey, '#d9902a', dens=0.6, irreg=0.2)          # ribbed hem
lz.lapiz([[(426 + k * 6, 620 - k * 0.05), (426 + k * 6, 630)] for k in range(14)], '#a0661a', grosor=0.5, presion=0.4)
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

lz.vineta(margen=30)
lz.guardar(SALIDA)
print('ok', SALIDA)
