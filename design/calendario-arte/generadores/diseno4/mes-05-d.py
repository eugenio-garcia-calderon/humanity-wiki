"""
Mes 5 -- Arte -- Diseño 4.

Idea: one work made by everyone. A woman dances, laughing, holding up the
hem of an enormous skirt that is a garden in flight. Everything comes from
it or goes back into it: the grandmother's knitting IS its hem (the border
comes straight off her needles), a girl kneels to paint a new flower on it
with paint kept in a clay pot from which seeds sprout, and an old man's
guitar sends out the music -- a transparent wash where the notes turn into
stars -- that makes it spin. From the top of the skirt, flowers become
birds and fly off into the quiet side of the page.

    python3 mes-05-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, remuestrea,
                      mano, cabeza, extremidad, figura, torso, jardin, estrella, hojita, flor_simple, flor_grande,
                      pajaro, rgb, _lapiz_de)

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-05-d.png'

lz = Lienzo(ANCHO, semilla=505)

TEAL = '#3f8f8c'
CORAL = '#e8735e'
CARMIN = '#c33c4e'
ORO = '#f0b030'
BARRO = '#c06a42'
SEP = '#6b4433'


def sombra_suelo(cx, cy, rx):
    lz.aguada(Elipse(cx, cy, rx, rx * 0.11), '#c9a08a', dens=0.35, suave=8, gran=0.2)


# ------------------------------------------------------------------ the guitarist (behind, left)
sombra_suelo(282, 640, 95)
# a plain village chair: thin legs in wash and pencil
for (x0, y0, x1, y1) in ((222, 548, 218, 640), (300, 552, 304, 640), (236, 540, 232, 455)):
    f = Trazo([(x0, y0), (x1, y1)], (5, 4.5), suave=False)
    lz.aguada(f, '#9a6a4a', dens=0.75, irreg=0.15, tapa=1, gran=0.1)
    lz.contorno(f, SEP, grosor=0.7, presion=0.5, cortes=0.2)
asiento = Poligono([(214, 540), (300, 536), (312, 552), (224, 558)], suave=False)
lz.aguada(asiento, '#d9b06a', dens=0.7, tapa=1, irreg=0.3)
lz.rayado(asiento, '#9a7238', angulo=80, sep=3, presion=0.4)
lz.contorno(asiento, SEP, grosor=0.8, presion=0.5)
J = dict(cabeza=(262, 398, 25), hi=(236, 440), hd=(290, 440), ci=(242, 532), cd=(286, 534),
         pierna_i=[(250, 536), (310, 548), (306, 628)], pierna_d=[(274, 538), (336, 552), (338, 632)],
         pie_i=10, pie_d=10)
figura(lz, J, dict(camisa='#f3e6cf', pantalon='#3e4f86', piel='piel2', zapato='#5e3f30'),
       cara=dict(peinado='corto', pelo='#cfc6bc', canas=True, barba='#e3dcd2', giro=0.4, inclina=12, ojos='cerrados',
                 boca='canta'))
lz.aguada(Poligono([(238, 446), (258, 452), (262, 520), (246, 532), (240, 530)]), '#7a3f6e', dens=0.85, tapa=0.9)
# the guitar: body on his right thigh, neck rising to the viewer's right
G0 = np.array([252.0, 506.0])
ang = -24
a = math.radians(ang)
dG = np.array([math.cos(a), math.sin(a)])
nG = np.array([-dG[1], dG[0]])
Rg = lambda u, v: tuple(G0 + dG * u + nG * v)
mastil = Trazo([Rg(26, 0), Rg(150, 0)], (10, 8), suave=False)
lz.aguada(mastil, '#7a4a2c', dens=0.8, tapa=1, irreg=0.15)
lz.contorno(mastil, SEP, grosor=0.7, presion=0.55)
clavijero = Poligono([Rg(150, -6), Rg(176, -8), Rg(178, 8), Rg(150, 6)], suave=False)
lz.aguada(clavijero, '#5e3f30', dens=0.85, tapa=1, irreg=0.1)
lz.lapiz([[Rg(156 + 6 * k, -9), Rg(156 + 6 * k, -13)] for k in range(3)], SEP, grosor=1.0, presion=0.7)
cuerpo_g = Circulos([(*Rg(-12, 0), 33), (*Rg(24, 0), 26)])
lz.aguada(cuerpo_g, '#e0a24e', dens=0.75, tapa=1, borde=0.7, gran=0.2, irreg=0.3,
          toques=[(*Rg(-20, 14), 24, '#b8692e', 0.6)], sombra=(-10, -10, '#a8582a', 0.5))
lz.contorno(cuerpo_g, '#6a3a22', grosor=1.0, presion=0.65, cortes=0.1)
boca_g = Elipse(*Rg(14, 0), 9)
lz.aguada(boca_g, '#3e2a24', dens=1.0, irreg=0.1, tapa=1)
lz.aguada(Trazo([Rg(-34, -8), Rg(-34, 8)], (4, 4), suave=False), '#5e3f30', dens=0.9, tapa=1)   # bridge
lz.lapiz([[Rg(-34, k), Rg(150, k)] for k in (-3, -1, 1, 3)], '#fbf1dc', grosor=0.45, presion=0.7, temblor=0.03)
# arms: the right hand strums between the sound hole and the bridge; the left frets the neck
extremidad(lz, [(240, 448), (214, 500), Rg(-14, -6)], (16, 14, 12), '#f3e6cf', dens=0.8)
mano(lz, *Rg(-14, -6), 30, 22, 'piel2', 'abierta')
extremidad(lz, [(288, 448), (320, 488), Rg(118, 6)], (16, 14, 12), '#f3e6cf', dens=0.8)
mano(lz, *Rg(118, 6), -110, 22, 'piel2', 'sujeta')

# ------------------------------------------------------------------ the skirt-garden (protagonist)
CINTURA_I, CINTURA_D = np.array([628.0, 322.0]), np.array([664.0, 324.0])
MANO_FALDA = np.array([778.0, 304.0])
# outer edge of the skirt, with godet folds rippling along it
BORDE = spline([(540, 600), (520, 676), (570, 704), (640, 722), (722, 718), (802, 700), (880, 662), (950, 596),
                (998, 508), (1012, 430), (990, 372), (900, 320), tuple(MANO_FALDA)], False, 14)
BORDE = remuestrea(BORDE, 2.0)
_d = np.r_[0, np.cumsum(np.hypot(*np.diff(BORDE, axis=0).T))]
_t = np.gradient(BORDE, axis=0)
_t /= np.maximum(np.hypot(*_t.T)[:, None], 1e-9)
_n = np.stack([_t[:, 1], -_t[:, 0]], 1)            # outward normal (outline runs clockwise)
_amp = 7 * np.clip(_d / 60, 0, 1) * np.clip((_d[-1] - _d) / 80, 0, 1)
BORDE = BORDE + _n * (_amp * np.sin(_d / 62 * 2 * np.pi))[:, None]
i_hem = int(np.argmin(np.hypot(*(BORDE - (998, 508)).T)))
HEM = BORDE[:i_hem + 1]
FALDA = Poligono(np.vstack([CINTURA_I, (598, 400), (566, 500), BORDE, (720, 316), CINTURA_D]))

# the music: a transparent, widening wash from the guitar that wraps the skirt and makes it turn
musica_pts = bezier(Rg(14, 0), (380, 400), (470, 330), (600, 360), 50)
for k, (col, w0, w1, dd) in enumerate((('#8fc0c8', 18, 90, 0.32), ('#6fa0c8', 10, 60, 0.3), ('#a99bcb', 6, 36, 0.28))):
    f = Trazo(musica_pts + np.array([0, k * 6]), (w0 * 0.3, w0, (w0 + w1) / 2, w1))
    lz.aguada(f, col, dens=dd, borde=0.9, irreg=1.3, flor=1, gran=0.2, var=0.5)
arco_m = bezier((600, 360), (500, 560), (620, 790), (900, 760), 50)
lz.aguada(Trazo(arco_m, (60, 40, 26, 10)), '#8fc0c8', dens=0.22, borde=0.9, irreg=1.4, gran=0.2)

jardin(lz, FALDA, paleta=(CORAL, ORO, CARMIN, '#f39ab0', '#ff9a5a', '#8d73b0'),
       verdes=('#5f8f63', '#86a86c', '#3f7a6a'), base='#f07a5a', base_dens=0.72, escala=1.6, densidad=1.1,
       semilla=55)
# where her hand lifts it we see the inside of the skirt: a pale lilac lining
i_top = int(np.argmin(np.hypot(*(BORDE - (1012, 430)).T)))
tramo = BORDE[i_top:]
forro = Poligono(np.vstack([tramo, (tramo[::-1] + (0, 26) + (np.linspace(0, 1, len(tramo))[::-1, None] * (-10, 6)))]),
                 suave=False)
lz.aguada(forro, '#e6c2dc', dens=0.75, tapa=1, irreg=0.4, borde=0.8, toques=[(800, 320, 60, '#f6d6e0', 0.7)],
          sombra=(0, -10, '#b88ab0', 0.4))
lz.contorno(forro, '#8f5a7a', grosor=0.8, presion=0.5, cortes=0.3)
for k in range(9):
    p = tramo[int(k / 8 * (len(tramo) - 1))]
    lz.gouache(Elipse(p[0] - 4, p[1] + 13, 1.6), '#fff6f0', alfa=0.85, irreg=0)
# the skirt's volume: two hard-edged glazes (the folds that turn)
for pts in ([(640, 340), (600, 460), (585, 600), (610, 715), (650, 720), (650, 560), (660, 420)],
            [(700, 330), (790, 470), (880, 640), (930, 600), (860, 470), (760, 340)]):
    lz.aguada(Poligono(pts), '#9c2a48', dens=0.28, borde=0.8, irreg=1.0, gran=0.3)
plis = [bezier((640, 330), (610, 470), (590, 600), (600, 712)), bezier((648, 330), (660, 480), (680, 620), (690, 720)),
        bezier((656, 328), (730, 470), (790, 600), (820, 696)), bezier((664, 326), (800, 420), (900, 540), (930, 610)),
        bezier((700, 318), (850, 360), (950, 430), (995, 480))]
lz.lapiz(plis, '#8f2a3c', grosor=1.0, presion=0.4, temblor=0.7, cortes=0.35)
lz.contorno(FALDA, '#8f2a3c', grosor=1.1, presion=0.55, cortes=0.3, desfase=0.8)

# the hem is knitted: striped border with V stitches, coming straight off the grandmother's needles
AGUJAS = np.array([462.0, 702.0])
borde_pts = np.vstack([bezier(AGUJAS, (480, 690), (500, 676), tuple(HEM[0]), 12), HEM[1:]])
borde_pts = remuestrea(borde_pts, 4.0)
d = np.r_[0, np.cumsum(np.hypot(*np.diff(borde_pts, axis=0).T))]
tg = np.gradient(borde_pts, axis=0)
tg /= np.maximum(np.hypot(*tg.T)[:, None], 1e-9)
nr = np.stack([-tg[:, 1], tg[:, 0]], 1)
wb = np.interp(d, [0, 60, d[-1]], [6, 17, 15])
bandas = [TEAL, ORO, '#f39ab0', '#5f86c0']
L = d[-1]
nb = 22
for j in range(nb):
    i0 = np.searchsorted(d, L * j / nb)
    i1 = min(len(d) - 1, np.searchsorted(d, L * (j + 1) / nb) + 1)
    seg = borde_pts[i0:i1 + 1]
    if len(seg) < 2:
        continue
    pts = np.vstack([seg + nr[i0:i1 + 1] * wb[i0:i1 + 1, None] / 2, (seg - nr[i0:i1 + 1] * wb[i0:i1 + 1, None] / 2)[::-1]])
    lz.aguada(Poligono(pts, suave=False), bandas[j % 4], dens=0.85, irreg=0.25, borde=0.7, tapa=1, gran=0.2)
for k in range(2, len(borde_pts) - 1, 2):     # knitted V stitches
    p, nn_, tt_ = borde_pts[k], nr[k], tg[k]
    w_ = wb[k] * 0.35
    lz.lapiz([[p + nn_ * w_ - tt_ * 2, p, p + nn_ * w_ + tt_ * 2], [p - nn_ * w_ * 0.2 - tt_ * 2, p - nn_ * w_, p - nn_ * w_ * 0.2 + tt_ * 2]],
             '#4a3a3a', grosor=0.55, presion=0.4, temblor=0.05)
lz.lapiz([borde_pts + nr * wb[:, None] / 2, borde_pts - nr * wb[:, None] / 2], SEP, grosor=0.8, presion=0.5,
         cortes=0.2)

# ------------------------------------------------------------------ the dancer
sombra_suelo(660, 752, 120)
# standing leg (weight on it), the other foot on tiptoe behind
extremidad(lz, [(652, 690), (650, 722), (648, 746)], (18, 14, 11), 'piel3', dens=0.62, lapiz=SEP)
lz.aguada(Elipse(642, 750, 16, 7, 0), CARMIN, dens=0.9, tapa=1, irreg=0.2)
lz.contorno(Elipse(642, 750, 16, 7, 0), '#7a1f30', grosor=0.8, presion=0.6)
extremidad(lz, [(700, 712), (716, 732), (724, 742)], (12, 10, 8), 'piel3', dens=0.62, lapiz=SEP)
lz.aguada(Elipse(730, 744, 11, 5, 30), CARMIN, dens=0.9, tapa=1, irreg=0.2)
J = dict(cabeza=(644, 180, 30), hi=(614, 226), hd=(672, 230), ci=(630, 318), cd=(662, 320),
         brazo_i=[(616, 234), (572, 176), (606, 120)], brazo_d=[(670, 238), (724, 282), MANO_FALDA - (6, 0)],
         mano_i=(18, 'abierta'), mano_d=(10, 'sujeta'), delante=['brazo_i', 'brazo_d'])
figura(lz, J, dict(camisa=TEAL, piel='piel3', grosor=0.5),
       cara=dict(peinado='mono', pelo='#1e1410', giro=0.3, inclina=-12, ojos='cerrados', boca='ríe',
                 adorno=CARMIN))
faja = Trazo([(626, 322), (646, 328), (666, 322)], (16, 17, 16))
lz.aguada(faja, CARMIN, dens=0.92, tapa=1, irreg=0.3, sombra=(0, -6))
lz.contorno(faja, '#7a1f30', grosor=0.8, presion=0.55)
for pts in ([(666, 324), (690, 340), (712, 334)], [(666, 326), (684, 352), (700, 360)]):
    f = Trazo(pts, (8, 6, 2))
    lz.aguada(f, CARMIN, dens=0.9, tapa=1, irreg=0.3)
    lz.contorno(f, '#7a1f30', grosor=0.6, presion=0.5)

# ------------------------------------------------------------------ the grandmother knits the hem (front left)
sombra_suelo(410, 818, 100)
taburete = Poligono([(330, 742), (412, 742), (408, 756), (334, 756)], suave=False)
for x0 in (338, 404):
    f = Trazo([(x0, 754), (x0 + (6 if x0 > 370 else -6), 812)], (6, 5), suave=False)
    lz.aguada(f, '#9a6a4a', dens=0.75, irreg=0.15, tapa=1)
    lz.contorno(f, SEP, grosor=0.7, presion=0.5)
lz.aguada(taburete, '#b8845a', dens=0.75, tapa=1, irreg=0.2)
lz.contorno(taburete, SEP, grosor=0.8, presion=0.5)
J = dict(cabeza=(378, 606, 29), hi=(348, 652), hd=(406, 656), ci=(352, 740), cd=(400, 742),
         pierna_i=[(362, 742), (430, 752), (430, 812)], pierna_d=[(388, 746), (452, 760), (456, 816)],
         pie_i=0, pie_d=0)
figura(lz, J, dict(camisa='#8d73b0', falda='#5f8f8a', piel='piel1', zapato='#6e4c3c',
                   falda_bajo=[(424, 806), (470, 806), (474, 770)]),
       cara=dict(peinado='mono', pelo='#d8d2cc', canas=True, giro=0.45, inclina=8, ojos='abajo', boca='sonrisa'))
# arms bring the hands together at the needles
extremidad(lz, [(352, 660), (380, 712), (438, 704)], (18, 15, 13), '#8d73b0', dens=0.82)
extremidad(lz, [(404, 664), (432, 716), (468, 712)], (18, 15, 13), '#8d73b0', dens=0.82)
lz.lapiz([[(426, 684), (486, 724)], [(486, 680), (444, 730)]], '#8a6a52', grosor=1.2, presion=0.85, temblor=0.03)
mano(lz, 438, 704, -10, 24, 'piel1', 'sujeta')
mano(lz, 468, 712, 200, 24, 'piel1', 'sujeta', pulgar=-1)
# yarn basket
cesta = Poligono([(282, 778), (342, 778), (336, 818), (288, 818)])
lz.aguada(cesta, '#c99a5a', dens=0.7, tapa=1, irreg=0.3)
lz.rayado(cesta, '#8a6a3a', angulo=0, sep=4, presion=0.45)
lz.contorno(cesta, SEP, grosor=0.8, presion=0.55)
for (bx, by, c) in ((298, 772, TEAL), (322, 770, ORO), (310, 762, '#f39ab0')):
    lz.aguada(Elipse(bx, by, 12, 11), c, dens=0.8, tapa=1, irreg=0.3)
    lz.lapiz([arco(bx, by, 10, 8, 200 + k * 20, 330 + k * 20, 10) for k in range(3)], _lapiz_de(c), grosor=0.5,
             presion=0.45)
lz.lapiz([bezier((310, 762), (360, 720), (420, 740), (452, 708))], '#5f86c0', grosor=1.0, presion=0.75)

# ------------------------------------------------------------------ the girl paints a flower on the skirt (front right)
sombra_suelo(940, 836, 70)
J = dict(cabeza=(944, 690, 24), hi=(924, 728), hd=(968, 730), ci=(930, 796), cd=(962, 798),
         pierna_i=[(936, 800), (900, 822), (930, 830)], pierna_d=[(958, 800), (994, 818), (1010, 830)],
         pie_i=180, pie_d=0)
figura(lz, J, dict(camisa=ORO, pantalon='#c33c4e', piel='piel4', zapato='#5e3f30', grosor=0.5),
       cara=dict(peinado='rizado', pelo='#1e1410', giro=-0.5, inclina=-14, ojos='abiertos', boca='sonrisa',
                 mira=(-1, -1)))
# brush arm raised to the skirt
extremidad(lz, [(926, 736), (900, 708), (906, 668)], (13, 11, 10), ORO, dens=0.85)
mano(lz, 906, 668, -100, 20, 'piel4', 'sujeta')
lz.aguada(Trazo([(908, 660), (918, 626)], (3, 2), suave=False), '#7a4a2c', dens=0.9, irreg=0.1)
lz.aguada(Elipse(919, 622, 3, 5, 20), CARMIN, dens=1.0, irreg=0.2)
flor_grande(lz, 928, 606, 14, '#e8506a', centro=ORO)     # the flower she is painting, still wet
for k in range(3):                                       # a drip of wet paint
    lz.aguada(Elipse(930 + k * 2, 628 + k * 8, 2.2 - k * 0.4), '#e8506a', dens=0.9, irreg=0.2)
# the clay pot of paint, with seeds sprouting from it
extremidad(lz, [(966, 736), (990, 766), (986, 784)], (13, 11, 10), ORO, dens=0.85)
olla = Poligono([(972, 784), (1012, 784), (1018, 800), (1010, 822), (976, 824), (968, 802)])
lz.aguada(olla, BARRO, dens=0.85, tapa=1, borde=0.8, gran=0.5, sombra=(-8, -6))
lz.contorno(olla, '#6a3a22', grosor=0.9, presion=0.6, cortes=0.1)
lz.aguada(Elipse(992, 785, 20, 5), '#e8506a', dens=0.9, tapa=1, irreg=0.2)
mano(lz, 986, 784, 80, 20, 'piel4', 'sujeta')
for (x0, ang_, L) in ((984, -110, 34), (1000, -70, 28)):
    a_ = math.radians(ang_)
    tip = (x0 + math.cos(a_) * L, 784 + math.sin(a_) * L)
    lz.lapiz([bezier((x0, 784), (x0 + math.cos(a_) * L * 0.4, 770), tip)], '#4f6f45', grosor=1.0, presion=0.7)
    hojita(lz, *tip, 11, ang_ - 40, '#5f8f63', tapa=1)
    hojita(lz, *tip, 10, ang_ + 40, '#86a86c', tapa=1)

# ------------------------------------------------------------------ music becomes stars; flowers become birds
rng = np.random.default_rng(12)
for k, t in enumerate(np.linspace(0.15, 0.95, 8)):
    i = int(t * (len(musica_pts) - 1))
    x, y = musica_pts[i] + rng.normal(0, 10, 2) + (0, -16)
    estrella(lz, x, y, 4 + 5 * t, rng.choice([ORO, TEAL, CORAL, '#8d73b0']), gouache=False)
for k, (x, y) in enumerate(((1030, 404), (1050, 372))):    # the last flowers lift off the skirt...
    flor_simple(lz, x, y, 7, [CORAL, ORO][k], centro='#fff3cf')
pajaro(lz, 1112, 330, 17, CORAL, ang=-20)                   # ...and become birds
pajaro(lz, 1200, 262, 15, TEAL, ang=-12)
pajaro(lz, 1286, 214, 12, ORO, ang=-24)

lz.vineta(margen=30)
lz.guardar(SALIDA)
print('ok', SALIDA)
