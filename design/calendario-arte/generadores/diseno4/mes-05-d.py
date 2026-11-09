"""
Mes 5 -- Arte -- Diseño 4.

Idea: an evening of making things by hand in a village square, where
everything made is shared. At the centre a woman dances, laughing, to an old
man's guitar. The scarf a grandmother is knitting lifts off her needles and
floats through the air into the dancer's hand; a potter raises a pot on the
wheel; a little girl gives away the bowl she made. On the whitewashed wall
behind, a bison like the ones at Altamira, signed with everyone's painted
handprints: a mural made together. Paper lanterns glow; petals fly off the
dancer's skirt and become birds.

    python3 mes-05-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (cosmos, jardin, estrella, libelula, hojita, pececillo, pajaro, remuestrea, Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla,
                      mano, flor_simple, cabeza, extremidad, figura, rgb, _lapiz_de)

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-05-d.png'

lz = Lienzo(ANCHO, semilla=505)

TEAL = '#4f9c9a'
CORAL = '#e8735e'
CARMIN = '#c33c4e'
ORO = '#f0c25e'
OCRE = '#d9a441'
SIENA = '#c0703f'
BARRO = '#c47a52'
LP = '#5e3f30'

# ------------------------------------------------------------------ the bone paper stays bare
# no sky, no floor: the people and what they make float on the paper, with
# only their shadows and one fragment of painted wall behind them.

# a fragment of whitewashed wall, like a piece torn from a cave or a village street
muro = Poligono([(152, 556), (146, 500), (128, 462), (160, 430), (176, 398), (230, 404), (268, 380),
                 (330, 392), (384, 376), (430, 402), (474, 410), (468, 452), (492, 490), (470, 530),
                 (480, 566), (420, 560), (360, 580), (290, 566), (220, 576)], suave=False)
lz.aguada(muro, '#ead6b4', dens=0.6, borde=0.7, irreg=1.6, gran=0.6, var=0.6, tapa=0.7,
          toques=[(420, 520, 80, '#e2c3a0', 0.6), (200, 430, 70, '#f6ead6', 0.6)])
lz.contorno(muro, '#a07a60', grosor=0.9, presion=0.4, cortes=0.45, desfase=1.2)
rng = np.random.default_rng(3)
for k in range(5):
    x0 = rng.uniform(180, 400)
    y0 = rng.uniform(420, 540)
    lz.aguada(Trazo([(x0, y0), (x0 + 40, y0 - 4), (x0 + 80, y0 + 2)], (12, 9, 4)), '#d9bc9c', dens=0.15,
              irreg=1.6, gran=0.8, borde=0.6)


def bisonte(x, y, s=1.0):
    """An Altamira-style bison facing left: great hump, low head, short legs,
    red ochre with dark outline (day 6)."""
    P = lambda pts: [(x + px * s, y + py * s) for px, py in pts]
    cuerpo = Poligono(P([(-62, -2), (-56, -26), (-40, -44), (-18, -54), (2, -50), (22, -38), (44, -32),
                         (60, -22), (66, -4), (60, 14), (46, 22), (20, 22), (-10, 22), (-36, 20), (-52, 12)]))
    lz.aguada(cuerpo, '#bd5a30', dens=0.72, borde=0.7, gran=0.8, irreg=1.3, var=0.6,
              toques=[(x + 36 * s, y - 14 * s, 26 * s, '#8a3a22', 0.6), (x - 20 * s, y - 30 * s, 26 * s, '#d98a4a', 0.6)])
    # dark manganese mane over the hump and the head
    melena = Poligono(P([(-58, -6), (-54, -30), (-34, -50), (-10, -58), (4, -50), (-8, -36), (-26, -24),
                         (-40, -8), (-48, 8)]))
    lz.aguada(melena, '#4a3028', dens=0.6, gran=0.8, irreg=1.2, borde=0.5)
    legs = [Trazo(P([(-40, 12), (-44, 28), (-46, 42)]), (14 * s, 8 * s, 5 * s)),
            Trazo(P([(-22, 14), (-21, 30), (-23, 42)]), (12 * s, 7 * s, 5 * s)),
            Trazo(P([(36, 14), (40, 28), (39, 42)]), (14 * s, 8 * s, 5 * s)),
            Trazo(P([(52, 10), (57, 24), (60, 38)]), (11 * s, 7 * s, 5 * s))]
    for f in legs:
        lz.aguada(f, '#a84a28', dens=0.7, gran=0.8, irreg=1.0)
    tr = [spline(P([(-64, 0), (-58, -26), (-40, -46), (-14, -58), (6, -50), (24, -40), (48, -32), (64, -18),
                    (68, -2), (62, 14)])),
          spline(P([(-64, 0), (-66, 10), (-58, 16)])),                      # muzzle
          spline(P([(-50, -18), (-60, -30), (-56, -38)])),                 # horn
          spline(P([(66, -18), (76, -6), (74, 10)])),                      # tail
          spline(P([(-44, 18), (-10, 24), (30, 22)]))]
    lz.lapiz(tr, '#3e2a24', grosor=1.7, presion=0.7, temblor=1.0, textura=0.9, cortes=0.2)
    lz.lapiz([f.p[::3] for f in legs], '#3e2a24', grosor=1.1, presion=0.45, temblor=0.6, cortes=0.3)
    lz.aguada(Elipse(x - 50 * s, y - 14 * s, 2.5 * s, 2 * s), '#2a1a14', dens=1.0, irreg=0.2)


bisonte(310, 478, 1.15)


def huella(x, y, s, col, ang=0):
    """A painted handprint (everyone signs the mural with their hand, day 24)."""
    a = math.radians(ang)
    R = lambda px, py: (x + (px * math.cos(a) - py * math.sin(a)) * s, y + (px * math.sin(a) + py * math.cos(a)) * s)
    f = Elipse(*R(0, 5), 8 * s, 9 * s, ang)
    for dx, L, w in ((-6.5, 11, 3.6), (-2.2, 14, 3.6), (2.2, 13.5, 3.6), (6.2, 10, 3.2)):
        f = f | Trazo([R(dx, -1), R(dx * 1.35, -1 - L)], (w * s, w * 0.85 * s))
    f = f | Trazo([R(-7, 7), R(-16, -2)], (4.2 * s, 3.6 * s))
    lz.aguada(f, col, dens=0.72, borde=0.8, gran=0.5, irreg=0.6)


for (hx, hy, c, an) in ((200, 440, TEAL, -14), (420, 428, CORAL, 10), (446, 462, OCRE, -4),
                        (150, 452, '#8d73b0', 6), (420, 524, CORAL, -12), (250, 410, OCRE, 4)):
    huella(hx, hy, 1.15, c, an)
# ------------------------------------------------------------------ paper lanterns (light from inside)
cuerda1 = bezier((330, 70), (560, 190), (960, 186), (1180, 64), 200)
lz.lapiz([cuerda1], '#7c5a48', grosor=0.8, presion=0.5, temblor=0.6)
cols = [ORO, CORAL, TEAL, ORO, '#ec9fa0', ORO, CORAL]
for k, t in enumerate(np.linspace(0.1, 0.9, 7)):
    i = int(t * 199)
    x, y = cuerda1[i]
    y += 24
    c = cols[k]
    lz.lapiz([[(x, y - 24), (x, y - 15)]], '#7c5a48', grosor=0.6, presion=0.5)
    f = Elipse(x, y, 15, 17)
    lz.aguada(f, c, dens=0.9, tapa=1, irreg=0.4, borde=0.8, toques=[(x, y - 2, 8, '#fff3c4', 0.8)])
    lz.contorno(f, _lapiz_de(c), grosor=0.7, presion=0.45, cortes=0.2)
    lz.lapiz([arco(x, y, 15, 6, 0, 180, 12), arco(x, y - 2, 7, 17, 270, 450, 12)], _lapiz_de(c), grosor=0.5,
             presion=0.3)
    for dy in (-17, 17):
        lz.aguada(Elipse(x, y + dy, 6, 2.2), '#7c5a48', dens=0.6, irreg=0.2)
    lz.aguada(Elipse(x, y, 34, 30), '#f6c66a', dens=0.16, suave=12, gran=0.05)
    lz.luz((x, y, 8), '#fff2c4', fuerza=0.35)

# ------------------------------------------------------------------ shadows on the floor
for (cx, cy, rx) in ((250, 784, 130), (510, 718, 95), (780, 752, 150), (1030, 724, 90), (1252, 796, 55)):
    lz.aguada(Elipse(cx, cy, rx, 12), '#c9a08a', dens=0.35, suave=9, gran=0.3)


def silla(x, y, col=SIENA, h=98):
    """A rush-seated village chair seen 3/4. (x, y) = centre of the seat."""
    asiento = Poligono([(x - 38, y - 6), (x + 30, y - 10), (x + 42, y + 6), (x - 30, y + 10)], suave=False)
    for lx, ly, L in ((x + 28, y - 10, h - 8), (x - 34, y - 6, h - 6)):
        extremidad(lz, [(lx, ly), (lx, ly + L)], (5, 4.5), col, dens=0.55, tapa=1)
    lz.aguada(asiento, '#d9b06a', dens=0.6, tapa=1, irreg=0.4)
    lz.rayado(asiento, '#9a7238', angulo=80, sep=3, presion=0.4)
    lz.contorno(asiento, _lapiz_de(col), grosor=0.8, presion=0.5)
    for lx, ly, L in ((x - 30, y + 8, h), (x + 40, y + 4, h)):
        extremidad(lz, [(lx, ly), (lx, ly + L)], (5.5, 5), col, dens=0.6, tapa=1)


# ------------------------------------------------------------------ the guitarist (day 4, day 19)
silla(488, 612)
J = dict(cabeza=(474, 474, 26), hi=(446, 518), hd=(500, 518), ci=(454, 602), cd=(496, 604),
         brazo_i=[(448, 526), (424, 590), (414, 558)], brazo_d=[(498, 526), (534, 562), (528, 598)],
         pierna_i=[(462, 606), (538, 612), (546, 704)], pierna_d=[(484, 608), (556, 622), (568, 708)],
         pie_i=0, pie_d=0, delante=['brazo_d', 'brazo_i'])
figura(lz, J, dict(camisa='#f3ead9', pantalon='#3e4f86', piel='piel3', zapato='#5e3f30',
                   camisa_toques=[(446, 590, 50, '#d9c3a8', 0.6)]),
       cara=dict(peinado='corto', pelo='#cfc6bc', canas=True, barba='#d8d0c6', giro=0.5, inclina=12, ojos='cerrados',
                 boca='canta'))
lz.aguada(Poligono([(448, 524), (466, 532), (470, 586), (458, 604), (452, 602)]), '#7a3f6e', dens=0.8, tapa=0.9)
# the guitar across his lap, neck rising to the left
cx, cy, ang = 522, 598, 24
a = math.radians(ang)
R = lambda px, py: (cx + px * math.cos(a) - py * math.sin(a), cy + px * math.sin(a) + py * math.cos(a))
mastil = Trazo([R(-30, 0), R(-150, 0)], (10, 8))
lz.aguada(mastil, '#7a4a2c', dens=0.75, tapa=1, irreg=0.3)
lz.contorno(mastil, LP, grosor=0.7, presion=0.5)
lz.aguada(Poligono([R(-150, -6), R(-172, -8), R(-174, 8), R(-150, 6)], suave=False), '#5e3f30', dens=0.8, tapa=1)
cuerpo_g = Circulos([(*R(16, 0), 31), (*R(-24, 0), 25)])
lz.aguada(cuerpo_g, '#e0a24e', dens=0.7, tapa=1, borde=0.6, gran=0.3, toques=[(*R(28, 12), 22, '#b8692e', 0.6)])
lz.contorno(cuerpo_g, '#7a4a2c', grosor=1.0, presion=0.6, cortes=0.1)
lz.aguada(Elipse(*R(-8, 0), 9), '#3e2a24', dens=0.9, irreg=0.2)
lz.lapiz([[R(-150, k), R(34, k)] for k in (-2.7, -0.9, 0.9, 2.7)], '#f6ecd8', grosor=0.45, presion=0.6,
         temblor=0.05)
mano(lz, *R(-118, -4), -60, 15, 'piel3', 'sujeta')
mano(lz, *R(-2, 6), -110, 15, 'piel3', 'abierta')
extremidad(lz, [(448, 526), (420, 596), R(-116, 4)], (15, 13, 12), '#f3ead9', dens=0.62)
mano(lz, *R(-118, -4), -60, 15, 'piel3', 'sujeta')

# ------------------------------------------------------------------ the knitting grandmother (day 30)
silla(1060, 616, '#9a6a4a')
J = dict(cabeza=(1062, 484, 26), hi=(1034, 528), hd=(1090, 528), ci=(1040, 610), cd=(1086, 612),
         brazo_i=[(1038, 536), (1026, 592), (1050, 576)], brazo_d=[(1088, 536), (1102, 594), (1076, 580)],
         pierna_i=[(1046, 614), (990, 622), (994, 716)], pierna_d=[(1070, 616), (1008, 632), (1014, 720)],
         mano_i=(-20, 'sujeta'), mano_d=(200, 'sujeta'), pie_i=180, pie_d=180, delante=['brazo_i', 'brazo_d'])
figura(lz, J, dict(camisa='#6f9e6a', falda='#8d73b0', piel='piel1', zapato='#6e4c3c',
                   falda_bajo=[(982, 712), (1010, 718), (1050, 714), (1094, 708)],
                   falda_toques=[(1000, 680, 40, '#7d6aa8', 0.5)]),
       cara=dict(peinado='mono', pelo='#d8d2cc', canas=True, giro=-0.45, inclina=-8, ojos='abajo',
                 boca='sonrisa'))
lz.lapiz([arco(1045, 489, 6.5, 5.5, 0, 360, 20), arco(1062, 487, 6.5, 5.5, 0, 360, 20),
          [(1051.5, 488), (1055.5, 488)]], '#7a5a3a', grosor=0.6, presion=0.6, temblor=0.05)
lz.lapiz([[(1028, 556), (1072, 588)], [(1098, 560), (1054, 590)]], '#8a6a52', grosor=1.0, presion=0.75,
         temblor=0.05)
cesta = Poligono([(1110, 690), (1162, 690), (1156, 728), (1116, 728)])
lz.aguada(cesta, '#c99a5a', dens=0.6, tapa=1)
lz.rayado(cesta, '#8a6a3a', angulo=0, sep=4, presion=0.4)
lz.contorno(cesta, '#7a5a3a', grosor=0.8, presion=0.5)
for (bx, by, c) in ((1124, 684, CORAL), (1148, 682, TEAL), (1137, 675, ORO)):
    lz.aguada(Elipse(bx, by, 11, 10), c, dens=0.65, tapa=1, irreg=0.4)
    lz.lapiz([arco(bx, by, 9, 7, 200 + k * 20, 330 + k * 20, 10) for k in range(3)], _lapiz_de(c), grosor=0.5,
             presion=0.4)
lz.lapiz([bezier((1137, 675), (1120, 630), (1090, 610), (1064, 584))], CORAL, grosor=0.9, presion=0.7)

# ------------------------------------------------------------------ the dancer (day 4)
J = dict(cabeza=(742, 256, 31), hi=(708, 306), hd=(774, 302), ci=(724, 394), cd=(762, 392),
         brazo_i=[(710, 312), (664, 258), (652, 192)], brazo_d=[(772, 310), (830, 330), (884, 306)],
         mano_i=(-100, 'abierta'), mano_d=(-25, 'sujeta'),
         pierna_i=[(730, 600), (722, 690), (712, 752)], pie_i=180, delante=['brazo_i', 'brazo_d'])
figura(lz, J, dict(camisa=TEAL, piel='piel2', zapato='#8f2a3c', grosor=0.5,
                   falda=CORAL, falda_bajo=[(668, 520), (630, 610), (648, 690), (720, 730), (800, 728),
                                            (880, 700), (956, 640), (1000, 572), (950, 540), (880, 480)],
                   falda_toques=[(860, 600, 90, CARMIN, 0.7), (700, 540, 70, '#f39a6a', 0.6),
                                 (960, 600, 50, '#b5304a', 0.7)],
                   camisa_toques=[(760, 390, 40, '#2f6467', 0.6)],
                   falda_jardin=dict(paleta=(CORAL, ORO, CARMIN, '#f39ab0', '#ff9a5a', '#8d73b0'),
                                     verdes=('#5f8f63', '#86a86c', '#3f7a6a'), base='#ec7a64', base_dens=0.8,
                                     escala=1.25, densidad=1.15, semilla=55)),
       cara=dict(peinado='mono', pelo='#2e1e18', giro=0.15, inclina=-14, ojos='cerrados', boca='abierta',
                 adorno=CARMIN))
# a carmine sash at the waist, its ends flying with the turn
faja = Trazo([(720, 398), (744, 402), (768, 396)], (14, 15, 14))
lz.aguada(faja, CARMIN, dens=0.9, tapa=1, irreg=0.3)
for pts in ([(770, 398), (800, 412), (826, 404)], [(770, 400), (794, 428), (818, 432)]):
    f = Trazo(pts, (8, 6, 2))
    lz.aguada(f, CARMIN, dens=0.85, tapa=1, irreg=0.3)
    lz.contorno(f, '#7a1f30', grosor=0.6, presion=0.5)
lz.contorno(faja, '#7a1f30', grosor=0.7, presion=0.5)
# folds of the spinning skirt: pencil sweeps from the waist
plis = [bezier((734, 414), (700, 500), (660, 580), (648, 680)), bezier((740, 414), (736, 520), (716, 640), (720, 724)),
        bezier((746, 414), (790, 530), (800, 640), (806, 722)), bezier((752, 412), (830, 500), (890, 590), (900, 690)),
        bezier((756, 410), (860, 470), (940, 530), (990, 568))]
lz.lapiz(plis, '#8f2a3c', grosor=0.9, presion=0.35, temblor=0.6, cortes=0.35)
# ruffled hem (flamenco, day 19): a second, lighter flounce
volante = Trazo([(632, 640), (660, 700), (720, 734), (800, 732), (880, 704), (956, 644), (998, 578)],
                (16, 18, 20, 20, 18, 16, 12))
lz.aguada(volante, CARMIN, dens=0.7, borde=0.9, tapa=0.5, toques=[(800, 732, 120, '#e8735e', 0.6)])
for (x, y) in remuestrea(volante.p, 14)[1:-1]:
    lz.gouache(Elipse(x, y, 2.0), '#fff3cf', alfa=0.9, irreg=0)
lz.lapiz([spline([(626, 650), (648, 690), (684, 718), (720, 742), (760, 738), (800, 742), (840, 728),
                  (880, 716), (918, 690), (956, 660), (984, 620), (1006, 584)])], '#a02c40', grosor=0.9,
         presion=0.5, temblor=1.4)

# ------------------------------------------------------------------ the potter (day 20), foreground left
lz.aguada(Poligono([(98, 674), (170, 674), (166, 686), (102, 686)], suave=False), SIENA, dens=0.6, tapa=1)
for lx in (106, 160):
    extremidad(lz, [(lx, 684), (lx + (5 if lx > 130 else -5), 776)], (6, 5), '#a35a32', dens=0.6)
J = dict(cabeza=(178, 506, 29), hi=(142, 556), hd=(204, 560), ci=(146, 670), cd=(198, 672),
         pierna_i=[(158, 674), (238, 682), (246, 774)], pierna_d=[(186, 678), (262, 694), (272, 782)],
         pie_i=0, pie_d=0)
figura(lz, J, dict(camisa='#e8952a', pantalon='#3f6fb0', piel='piel5', zapato='#7a5544',
                   camisa_toques=[(170, 640, 40, '#c97b2c', 0.5)]),
       cara=dict(peinado='rizado', pelo='#241814', giro=0.5, inclina=14, ojos='abajo', boca='sonrisa'))
# apron
for (x, y, r) in ((176, 640, 7), (192, 612, 5), (164, 660, 5)):   # clay smudges on his shirt
    lz.aguada(Elipse(x, y, r, r * 0.7, 20), BARRO, dens=0.6, irreg=1.0, gran=0.6)
# wheel and the rising pot
base = Poligono([(262, 690), (338, 690), (350, 772), (250, 772)], suave=False)
lz.aguada(base, '#a35a32', dens=0.6, tapa=1, irreg=0.4, toques=[(340, 740, 30, '#7a3a22', 0.6)])
lz.contorno(base, LP, grosor=0.8, presion=0.5)
rueda = Elipse(300, 686, 70, 15)
lz.aguada(rueda, '#8f6a52', dens=0.6, tapa=1, irreg=0.4)
lz.contorno(rueda, LP, grosor=0.8, presion=0.55)
lz.lapiz([arco(300, 686, 56, 10, 200, 330, 20), arco(300, 686, 40, 7, 30, 150, 20)], '#f4e6cf', grosor=0.9,
         presion=0.5)
jarro = Poligono([(276, 682), (270, 656), (280, 634), (278, 612), (288, 600), (312, 600), (322, 612),
                  (320, 634), (330, 656), (324, 682)])
lz.aguada(jarro, BARRO, dens=0.7, tapa=1, borde=0.7, gran=0.5, toques=[(318, 650, 16, '#8f4a2c', 0.7)])
lz.levanta(Trazo([(286, 622), (283, 670)], (3, 4)), 0.5, suave=2)
lz.contorno(jarro, '#7a3a22', grosor=0.9, presion=0.6, cortes=0.1)
lz.lapiz([arco(300, 650, 26, 4, 10, 170, 16), arco(300, 664, 27, 4, 10, 170, 16)], '#8f4a2c', grosor=0.6,
         presion=0.4)
# arms reach around the pot
extremidad(lz, [(146, 566), (210, 640), (272, 640)], (17, 15, 13), '#e8952a', dens=0.76)
mano(lz, 274, 640, 10, 16, 'piel5', 'sujeta')
extremidad(lz, [(202, 568), (262, 606), (326, 628)], (17, 15, 13), '#e8952a', dens=0.76)
mano(lz, 328, 630, 160, 16, 'piel5', 'sujeta')

# ------------------------------------------------------------------ the girl and the bowl she made, foreground right
J = dict(cabeza=(1252, 552, 24), hi=(1228, 592), hd=(1274, 592), ci=(1234, 668), cd=(1268, 668),
         brazo_i=[(1230, 598), (1206, 634), (1178, 632)], brazo_d=[(1272, 598), (1240, 642), (1200, 640)],
         pierna_i=[(1242, 700), (1242, 744), (1238, 790)], pierna_d=[(1262, 700), (1264, 744), (1268, 792)],
         mano_i=(180, 'sujeta'), mano_d=(180, 'sujeta'), pie_i=180, pie_d=0, delante=['brazo_i', 'brazo_d'])
figura(lz, J, dict(camisa='#f0b030', falda='#f0b030', piel='piel4', zapato='#c33c4e', manga='corta', grosor=0.5,
                   falda_bajo=[(1214, 714), (1250, 722), (1286, 712)]),
       cara=dict(peinado='rizado', pelo='#2a1a14', giro=-0.5, ojos='abiertos', boca='abierta', mira=(-1, 0)))
cuenco = Poligono(np.vstack([arco(1186, 624, 24, 6, 180, 360, 14), arco(1186, 624, 24, 19, 0, 180, 16)]),
                  suave=False)
lz.aguada(cuenco, BARRO, dens=0.65, tapa=1, borde=0.6, gran=0.4)
lz.aguada(Trazo([(1166, 632), (1186, 636), (1206, 632)], (4, 4)), TEAL, dens=0.7, irreg=0.3)
lz.contorno(cuenco, '#7a3a22', grosor=0.9, presion=0.6)
mano(lz, 1172, 636, 200, 13, 'piel4', 'sujeta')
mano(lz, 1204, 640, -20, 13, 'piel4', 'sujeta')
flor_simple(lz, 1186, 606, 10, '#f6b6b0', centro=ORO)
lz.lapiz([[(1186, 614), (1188, 624)]], '#4f6f45', grosor=0.8, presion=0.6)

# ------------------------------------------------------------------ magic: the scarf that flies
# the striped scarf leaves the grandmother's needles and floats up into the dancer's hand
camino = np.vstack([bezier((1062, 582), (1140, 470), (1120, 330), (1030, 300), 70),
                    bezier((1030, 300), (950, 272), (960, 220), (912, 230), 40)[1:],
                    bezier((912, 230), (880, 236), (870, 280), (886, 304), 30)[1:]])
d = np.r_[0, np.cumsum(np.hypot(*np.diff(camino, axis=0).T))]
tt = d / d[-1]
ancho = 4 + 11 * np.abs(np.cos(tt * np.pi * 3.2))          # the ribbon twists as it flies
tg = np.gradient(camino, axis=0)
tg /= np.maximum(np.hypot(*tg.T)[:, None], 1e-9)
nr = np.stack([-tg[:, 1], tg[:, 0]], 1)
bandas = [CORAL, ORO, TEAL, '#ec9fa0']
paso = 9
for j, k in enumerate(range(0, len(camino) - 1, paso)):
    k1 = min(len(camino) - 1, k + paso)
    pts = [camino[k] + nr[k] * ancho[k] / 2, camino[k1] + nr[k1] * ancho[k1] / 2,
           camino[k1] - nr[k1] * ancho[k1] / 2, camino[k] - nr[k] * ancho[k] / 2]
    lz.aguada(Poligono(pts, suave=False), bandas[j % 4], dens=0.62, irreg=0.35, borde=0.5, tapa=0.85, gran=0.3)
for k in range(4, len(camino) - 4, 5):   # knit stitches and dots
    lz.lapiz([[camino[k] - nr[k] * ancho[k] * 0.35, camino[k] + nr[k] * ancho[k] * 0.35]], '#7a4a3a', grosor=0.5,
             presion=0.3, temblor=0.05)
    if k % 15 == 4:
        lz.gouache(Elipse(*camino[k], 1.6), '#fff6dc', alfa=0.9, irreg=0)
lz.lapiz([camino + nr * ancho[:, None] / 2, camino - nr * ancho[:, None] / 2], '#7a4a3a', grosor=0.7,
         presion=0.45, temblor=0.4, cortes=0.2)
lz.luz(Trazo(camino[::4], (30,)), '#ffe7b0', fuerza=0.2, suave=10)
# fringe at the free end, by her hand
lz.lapiz([[(886 + k * 3, 312), (884 + k * 3.5, 326)] for k in range(-2, 3)], CORAL, grosor=0.8, presion=0.6)
mano(lz, 884, 306, -25, 15, 'piel2', 'sujeta')

# petals spin off the skirt and turn into paper birds
rng = np.random.default_rng(12)
for k in range(14):
    t = k / 13
    x = 975 + t * 230 + rng.normal(0, 8) - 60 * math.sin(t * 3)
    y = 520 - t * 260 + rng.normal(0, 8)
    if t < 0.7:
        lz.aguada(Elipse(x, y, 7.5 - 2 * t, 4.4, rng.uniform(0, 180)), rng.choice([CORAL, '#f39a6a', CARMIN]),
                  dens=0.65, irreg=0.4, borde=0.6)


pajaro(lz, 1206, 262, 18, CORAL, ang=-18)
pajaro(lz, 1272, 206, 16, TEAL, ang=-8)
pajaro(lz, 1330, 252, 13, ORO, ang=-25)
libelula(lz, 1330, 520, 1.1, ang=200, cuerpo='#4f9c9a', alas='#bcd9e0')

# the music leaves the guitar as a ribbon of night sea: stars and a shoal of tiny fish
musica = Trazo(bezier(R(-6, 0), (580, 480), (540, 330), (650, 300), 60), (4, 18, 26, 14, 3))
cosmos(lz, musica, base='#24335f', toques_col=('#1f6f7a', '#4b3f8f', '#2a7f86'), estrellas=1.6, semilla=58,
       tapa=0.9)
lz.contorno(musica, '#22305a', grosor=0.7, presion=0.45, cortes=0.4, desfase=0.4)
for k, (x, y) in enumerate(((664, 284), (686, 262), (700, 234))):
    estrella(lz, x, y, 7 - k, [ORO, TEAL, CORAL][k], gouache=False)


lz.vineta(margen=30)
lz.guardar(SALIDA)
print('ok', SALIDA)
