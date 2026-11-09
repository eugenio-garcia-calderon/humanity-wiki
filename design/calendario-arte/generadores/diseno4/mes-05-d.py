"""
Mes 5 -- Arte -- Diseño 4.

Idea: one work made by everyone. A woman dances on tiptoe, laughing, one arm
arched over her head and the other lifting the edge of an enormous skirt that
spins into a single spiral -- and the skirt is a garden. Everything comes from
it or goes back into it: its knitted hem comes straight off a grandmother's
needles (half-knitted beside her, fraying into loose wool), a little girl
models in clay a bud that turns into one of its flowers, and an old man's
guitar sends out the music -- a transparent wash that crosses the page and
turns into stars around the dancer's raised hand. From the far edge of the
skirt, flowers become birds and fly into the quiet side of the page.

    python3 mes-05-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, remuestrea,
                      mano, cabeza, extremidad, figura, jardin, estrella, hojita, flor_simple, flor_grande,
                      capullo, pajaro, sombra_bajo, rgb, _lapiz_de)

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


# ------------------------------------------------------------------ the guitarist (up, left)
sombra_suelo(205, 508, 85)
for (x0, y0, x1, y1) in ((150, 428, 146, 506), (226, 432, 230, 506), (160, 420, 156, 330)):
    f = Trazo([(x0, y0), (x1, y1)], (5, 4.5), suave=False)
    lz.aguada(f, '#9a6a4a', dens=0.75, irreg=0.15, tapa=1, gran=0.1)
    lz.contorno(f, SEP, grosor=0.7, presion=0.5, cortes=0.2)
asiento = Poligono([(142, 420), (226, 416), (238, 432), (152, 438)], suave=False)
lz.aguada(asiento, '#d9b06a', dens=0.7, tapa=1, irreg=0.3)
lz.rayado(asiento, '#9a7238', angulo=80, sep=3, presion=0.4)
lz.contorno(asiento, SEP, grosor=0.8, presion=0.5)
# shoulders tilt with the rhythm; one foot flat, the other tapping (toe raised)
J = dict(cabeza=(188, 282, 24), hi=(162, 326), hd=(214, 320), ci=(168, 412), cd=(208, 414),
         pierna_i=[(176, 416), (236, 424), (232, 500)], pierna_d=[(198, 418), (262, 412), (272, 488)],
         pie_i=8, pie_d=-28)
figura(lz, J, dict(camisa='#f3e6cf', pantalon='#3e4f86', piel='piel2', zapato='#5e3f30', cuello=0.55),
       cara=dict(peinado='corto', pelo='#cfc6bc', canas=True, barba='#e3dcd2', giro=0.45, inclina=14,
                 ojos='cerrados', boca='canta'))
lz.aguada(Poligono([(164, 330), (182, 336), (186, 400), (172, 412), (166, 410)]), '#7a3f6e', dens=0.85, tapa=0.9)
# the guitar: body on his thigh, neck rising toward the dancer
G0 = np.array([190.0, 396.0])
a = math.radians(-22)
dG = np.array([math.cos(a), math.sin(a)])
nG = np.array([-dG[1], dG[0]])
Rg = lambda u, v: tuple(G0 + dG * u + nG * v)
mastil = Trazo([Rg(26, 0), Rg(146, 0)], (9, 7.5), suave=False)
lz.aguada(mastil, '#7a4a2c', dens=0.8, tapa=1, irreg=0.15)
lz.contorno(mastil, SEP, grosor=0.7, presion=0.55)
clav = Poligono([Rg(146, -6), Rg(170, -8), Rg(172, 8), Rg(146, 6)], suave=False)
lz.aguada(clav, '#5e3f30', dens=0.85, tapa=1, irreg=0.1)
lz.lapiz([[Rg(152 + 6 * k, -9), Rg(152 + 6 * k, -13)] for k in range(3)], SEP, grosor=1.0, presion=0.7)
cuerpo_g = Circulos([(*Rg(-12, 0), 31), (*Rg(22, 0), 24)])
lz.aguada(cuerpo_g, '#e0a24e', dens=0.75, tapa=1, borde=0.7, gran=0.2, irreg=0.3,
          toques=[(*Rg(-20, 14), 24, '#b8692e', 0.6)], sombra=(-10, -10, '#a8582a', 0.5))
lz.contorno(cuerpo_g, '#6a3a22', grosor=1.0, presion=0.65, cortes=0.1)
lz.aguada(Elipse(*Rg(12, 0), 8.5), '#3e2a24', dens=1.0, irreg=0.1, tapa=1)
lz.aguada(Trazo([Rg(-32, -8), Rg(-32, 8)], (4, 4), suave=False), '#5e3f30', dens=0.9, tapa=1)
lz.lapiz([[Rg(-32, k), Rg(146, k)] for k in (-3, -1, 1, 3)], '#fbf1dc', grosor=0.45, presion=0.7, temblor=0.03)
extremidad(lz, [(166, 334), (142, 384), Rg(-12, -5)], (15, 13, 12), '#f3e6cf', dens=0.8)
mano(lz, *Rg(-12, -5), 40, 20, 'piel2', 'abierta')
extremidad(lz, [(212, 330), (250, 366), Rg(116, 6)], (15, 13, 12), '#f3e6cf', dens=0.8)
mano(lz, *Rg(116, 6), -110, 20, 'piel2', 'sujeta')

# ------------------------------------------------------------------ the music crosses the page
MANO_ALTA = np.array([604.0, 104.0])
musica_pts = bezier(Rg(12, 0), (330, 300), (420, 110), (575, 118), 60)
for k, (col, w0, w1, dd) in enumerate((('#8fc0c8', 14, 70, 0.3), ('#6fa0c8', 8, 46, 0.28),
                                       ('#a99bcb', 5, 28, 0.26))):
    f = Trazo(musica_pts + np.array([0, k * 7]), (w0 * 0.3, w0, (w0 + w1) / 2, w1))
    lz.aguada(f, col, dens=dd, borde=0.95, irreg=1.4, flor=1, gran=0.2, var=0.5)
rng = np.random.default_rng(12)
for k, t in enumerate(np.linspace(0.3, 0.92, 6)):        # notes turning into stars along the way
    x, y = musica_pts[int(t * 59)] + rng.normal(0, 9, 2) + (0, -18)
    estrella(lz, x, y, 3 + 5 * t, rng.choice([ORO, TEAL, '#8d73b0']), gouache=False)
for k in range(9):                                       # ...a little crown of stars around her hand
    a_ = math.radians(-200 + k * 26 + rng.normal(0, 6))
    rr = rng.uniform(34, 52)
    estrella(lz, MANO_ALTA[0] + 10 + math.cos(a_) * rr, MANO_ALTA[1] - 10 + math.sin(a_) * rr * 0.8,
             rng.uniform(4, 9), rng.choice([ORO, ORO, TEAL, CORAL, '#8d73b0']), gouache=False)

# ------------------------------------------------------------------ the skirt-garden (protagonist)
MANO_FALDA = np.array([772.0, 284.0])
BORDE = spline([(596, 350), (560, 430), (512, 516), (470, 588), (500, 640), (560, 690), (640, 720), (730, 724),
                (820, 705), (900, 664), (960, 605), (1000, 530), (1012, 452), (980, 388), (900, 330),
                tuple(MANO_FALDA)], False, 14)
BORDE = remuestrea(BORDE, 2.0)
_d = np.r_[0, np.cumsum(np.hypot(*np.diff(BORDE, axis=0).T))]
_t = np.gradient(BORDE, axis=0)
_t /= np.maximum(np.hypot(*_t.T)[:, None], 1e-9)
_n = np.stack([_t[:, 1], -_t[:, 0]], 1)
_amp = 6 * np.clip((_d - 120) / 60, 0, 1) * np.clip((_d[-1] - _d) / 80, 0, 1)
BORDE = BORDE + _n * (_amp * np.sin(_d / 58 * 2 * np.pi))[:, None]
i_a = int(np.argmin(np.hypot(*(BORDE - (470, 588)).T)))
i_b = int(np.argmin(np.hypot(*(BORDE - (1012, 452)).T)))
HEM = BORDE[i_a:i_b + 1]
FALDA = Poligono(np.vstack([(622, 296), BORDE, (720, 298), (658, 298)]))

# opaque petticoat ruffle under the hem: it hides the legs
enagua = spline([(520, 668), (580, 712), (650, 738), (730, 740), (820, 722), (890, 690)])
lz.aguada(Trazo(enagua, (12, 22, 26, 22, 14)), '#f7ead8', dens=0.6, tapa=1, irreg=0.5, borde=0.8,
          toques=[(700, 745, 60, '#e8c8b8', 0.6)])
lz.lapiz([enagua + (0, 9), *[arco(*p, 7, 5, 20, 160, 8) for p in remuestrea(enagua, 13)[1:-1] + (0, 6)]],
         '#b08a7a', grosor=0.6, presion=0.45, temblor=0.4, cortes=0.2)
# one foot, on tiptoe, carrying her weight -- touching the ground
sombra_suelo(646, 764, 70)
pie = Trazo([(648, 744), (646, 756), (644, 764)], (12, 10, 8), suave=False)
lz.aguada(pie, 'piel3', dens=0.62, tapa=1, irreg=0.2)
zap = Poligono([(637, 750), (656, 748), (654, 766), (646, 770), (638, 764)])
lz.aguada(zap, CARMIN, dens=0.92, tapa=1, irreg=0.2)
lz.contorno(zap, '#6a1f30', grosor=0.8, presion=0.6, cortes=0.05)
lz.lapiz([[(640, 754), (656, 752)]], '#6a1f30', grosor=0.6, presion=0.6)

jardin(lz, FALDA, paleta=(CORAL, ORO, CARMIN, '#f39ab0', '#ff9a5a', '#8d73b0'),
       verdes=('#5f8f63', '#86a86c', '#3f7a6a'), base='#f07a5a', base_dens=0.74, escala=1.6, densidad=1.0,
       semilla=55, destellos=0.0)
# the inside of the skirt where her hand lifts it: the same cloth, in shadow
i_top = int(np.argmin(np.hypot(*(BORDE - (1012, 452)).T)))
tramo = BORDE[i_top:]
forro = Poligono(np.vstack([tramo, tramo[::-1] + (0, 18) + np.linspace(0, 1, len(tramo))[::-1, None] * (-8, 4)]),
                 suave=False)
lz.aguada(forro, '#b8404e', dens=0.7, tapa=1, irreg=0.4, borde=0.8, toques=[(800, 300, 70, '#d86a5a', 0.6)])
lz.lapiz([tramo[::3] + (0, 9)], '#7a1f30', grosor=0.6, presion=0.4, temblor=0.6, cortes=0.4)
for k in range(5):
    p = tramo[int((k + 0.5) / 5 * (len(tramo) - 1))]
    flor_simple(lz, p[0] - 3, p[1] + 9, 4, '#f6c6b0', centro=ORO)
# one spiral of folds: every fold sweeps from the waist the same way the skirt turns
plis = [bezier((632, 304), (600, 380), (540, 470), (486, 590)), bezier((636, 306), (620, 430), (590, 570), (566, 694)),
        bezier((642, 306), (660, 450), (680, 600), (700, 722)), bezier((648, 306), (720, 430), (800, 580), (840, 698)),
        bezier((654, 304), (760, 390), (880, 500), (958, 604)), bezier((660, 300), (790, 330), (930, 400), (1004, 488))]
for k, pl in enumerate(plis):
    if k % 2 == 0:
        sombra_pl = Trazo(pl + (6, 0), (3, 16, 26))
        lz.aguada(sombra_pl, '#8a2a40', dens=0.16, borde=0.5, irreg=1.0, gran=0.3, desvanece=(640, 310, 700, 760))
lz.lapiz(plis, '#7a2236', grosor=0.9, presion=0.32, temblor=0.8, cortes=0.45)
lz.contorno(FALDA, '#7a2236', grosor=1.1, presion=0.6, cortes=0.25, desfase=0.8)

# the hem is knitted: a narrow band of real stitches, one yarn running from the needles
AGUJAS = np.array([392.0, 712.0])
borde_pts = remuestrea(HEM, 3.0)
tg = np.gradient(borde_pts, axis=0)
tg /= np.maximum(np.hypot(*tg.T)[:, None], 1e-9)
nr = np.stack([-tg[:, 1], tg[:, 0]], 1)
WB = 9.0
bandas = [TEAL, ORO, '#f39ab0', '#5f86c0']
nb = 26
for j in range(nb):
    i0 = int(j / nb * (len(borde_pts) - 1))
    i1 = int((j + 1) / nb * (len(borde_pts) - 1))
    seg = borde_pts[i0:i1 + 1]
    pts = np.vstack([seg + nr[i0:i1 + 1] * WB / 2, (seg - nr[i0:i1 + 1] * WB / 2)[::-1]])
    lz.aguada(Poligono(pts, suave=False), bandas[j % 4], dens=0.82, irreg=0.2, borde=0.6, tapa=1, gran=0.25)
st = []
for k in range(1, len(borde_pts) - 1):        # two rows of knit V's, the real texture of stocking stitch
    p, nn_, tt_ = borde_pts[k], nr[k], tg[k]
    for row in (-0.22, 0.22):
        c = p + nn_ * WB * row
        st.append([c + nn_ * WB * 0.18 - tt_ * 1.3, c - nn_ * WB * 0.12, c + nn_ * WB * 0.18 + tt_ * 1.3])
lz.lapiz(st, '#4a3a3a', grosor=0.45, presion=0.35, temblor=0.03)
lz.lapiz([borde_pts + nr * WB / 2, borde_pts - nr * WB / 2], SEP, grosor=0.7, presion=0.5, cortes=0.15)
# ...and beside the grandmother it is still being knitted: it narrows and frays into loose wool
inicio = borde_pts[0]
for k, (c, off) in enumerate(((TEAL, -3), ('#5f86c0', 0), (ORO, 3))):
    hebra = bezier(inicio + (0, off), inicio + (-20, 40 + off * 3), AGUJAS + (40, -30 + off * 4), AGUJAS + (4, off), 30)
    lz.lapiz([hebra], c, grosor=1.1, presion=0.85, temblor=0.6)
punto = Poligono([AGUJAS + (-6, -10), AGUJAS + (20, -14), AGUJAS + (24, 6), AGUJAS + (-2, 10)])
lz.aguada(punto, TEAL, dens=0.8, tapa=1, irreg=0.2)
lz.lapiz([[AGUJAS + (k * 5 - 4, -8), AGUJAS + (k * 5 - 2, -2), AGUJAS + (k * 5, -8)] for k in range(5)],
         '#2a4a4a', grosor=0.45, presion=0.45)

# ------------------------------------------------------------------ the dancer
J = dict(cabeza=(640, 166, 30), hi=(612, 208), hd=(668, 212), ci=(624, 290), cd=(656, 292),
         brazo_i=[(614, 216), (568, 160), MANO_ALTA], brazo_d=[(666, 220), (722, 258), MANO_FALDA - (6, 0)],
         mano_i=(-15, 'abierta'), mano_d=(15, 'sujeta'), delante=['brazo_i', 'brazo_d'])
figura(lz, J, dict(camisa=TEAL, piel='piel3', grosor=0.52, cuello=0.62),
       cara=dict(peinado='mono', pelo='#1e1410', giro=0.3, inclina=-12, ojos='cerrados', boca='ríe',
                 adorno=CARMIN))
faja = Trazo([(620, 294), (640, 300), (662, 294)], (15, 16, 15))
lz.aguada(faja, CARMIN, dens=0.92, tapa=1, irreg=0.3, sombra=(0, -6))
lz.contorno(faja, '#7a1f30', grosor=0.8, presion=0.55)
for pts in ([(662, 296), (686, 312), (706, 306)], [(662, 298), (680, 324), (694, 332)]):
    f = Trazo(pts, (8, 6, 2))
    lz.aguada(f, CARMIN, dens=0.9, tapa=1, irreg=0.3)
    lz.contorno(f, '#7a1f30', grosor=0.6, presion=0.5)

# ------------------------------------------------------------------ the grandmother knits the hem (low, left)
sombra_suelo(330, 826, 100)
taburete = Poligono([(250, 748), (332, 748), (328, 762), (254, 762)], suave=False)
for x0 in (258, 324):
    f = Trazo([(x0, 760), (x0 + (6 if x0 > 290 else -6), 818)], (6, 5), suave=False)
    lz.aguada(f, '#9a6a4a', dens=0.75, irreg=0.15, tapa=1)
    lz.contorno(f, SEP, grosor=0.7, presion=0.5)
lz.aguada(taburete, '#b8845a', dens=0.75, tapa=1, irreg=0.2)
lz.contorno(taburete, SEP, grosor=0.8, presion=0.5)
J = dict(cabeza=(298, 614, 29), hi=(268, 660), hd=(326, 664), ci=(272, 746), cd=(320, 748),
         pierna_i=[(282, 748), (350, 758), (350, 818)], pierna_d=[(308, 752), (372, 766), (376, 822)],
         pie_i=0, pie_d=0)
figura(lz, J, dict(camisa='#8d73b0', falda='#5f8f8a', piel='piel1', zapato='#6e4c3c', cuello=0.55,
                   falda_bajo=[(344, 812), (392, 812), (396, 776)]),
       cara=dict(peinado='mono', pelo='#d8d2cc', canas=True, giro=0.45, inclina=8, ojos='abajo', boca='sonrisa'))
for brazo, col in (([(272, 668), (300, 720), (370, 714)], '#8d73b0'), ([(324, 672), (352, 724), (398, 720)], '#8d73b0')):
    sombra_bajo(lz, brazo, (18, 15, 13), '#3a2a5a', dens=0.25)
    extremidad(lz, brazo, (18, 15, 13), col, dens=0.84)
lz.lapiz([[(356, 694), (420, 734)], [(420, 690), (370, 740)]], '#8a6a52', grosor=1.2, presion=0.85, temblor=0.03)
mano(lz, 370, 714, -10, 24, 'piel1', 'sujeta')
mano(lz, 398, 720, 200, 24, 'piel1', 'sujeta', pulgar=-1)
cesta = Poligono([(196, 784), (256, 784), (250, 824), (202, 824)])
lz.aguada(cesta, '#c99a5a', dens=0.7, tapa=1, irreg=0.3)
lz.rayado(cesta, '#8a6a3a', angulo=0, sep=4, presion=0.45)
lz.contorno(cesta, SEP, grosor=0.8, presion=0.55)
for (bx, by, c) in ((212, 778, TEAL), (236, 776, ORO), (224, 768, '#5f86c0')):
    lz.aguada(Elipse(bx, by, 12, 11), c, dens=0.8, tapa=1, irreg=0.3)
    lz.lapiz([arco(bx, by, 10, 8, 200 + k * 20, 330 + k * 20, 10) for k in range(3)], _lapiz_de(c), grosor=0.5,
             presion=0.45)
lz.lapiz([bezier((224, 768), (280, 760), (330, 770), (372, 716))], '#5f86c0', grosor=1.0, presion=0.75)

# ------------------------------------------------------------------ the girl models in clay a bud that becomes a flower
sombra_suelo(972, 812, 70)
vestido = Poligono([(946, 742), (994, 742), (1016, 770), (1040, 806), (974, 816), (914, 806), (930, 770)])
J = dict(cabeza=(972, 690, 23), hi=(952, 728), hd=(994, 730), ci=(956, 790), cd=(992, 792))
figura(lz, J, dict(camisa=ORO, piel='piel4', cuello=0.55, grosor=0.5),
       cara=dict(peinado='rizado', pelo='#1e1410', giro=-0.5, inclina=-12, ojos='abajo', boca='sonrisa'))
lz.aguada(vestido, ORO, dens=0.84, tapa=1, irreg=0.4, sombra=(-10, -8, '#b07a20', 0.4))
lz.contorno(vestido, '#8a5a1a', grosor=0.9, presion=0.55, cortes=0.25)
lz.lapiz([bezier((944, 780), (964, 790), (984, 808)), bezier((1004, 776), (1014, 792), (1024, 806))], '#8a5a1a',
         grosor=0.7, presion=0.4)
for brazo in ([(954, 736), (936, 770), (912, 754)], [(992, 738), (970, 774), (936, 760)]):
    sombra_bajo(lz, brazo, (12, 11, 10), '#8a5a1a', dens=0.25)
    extremidad(lz, brazo, (12, 11, 10), ORO, dens=0.85)
# the clay bud held out in her hands: terracotta below, already turning coral at the tip
yema = Poligono([(906, 752), (910, 734), (916, 724), (923, 732), (928, 752), (917, 758)])
lz.aguada(yema, BARRO, dens=0.85, tapa=1, irreg=0.3, borde=0.8, toques=[(916, 728, 8, CORAL, 0.9)])
lz.contorno(yema, '#6a3a22', grosor=0.7, presion=0.55, cortes=0.1)
lz.lapiz([[(911, 744), (921, 740)], [(912, 750), (922, 747)]], '#8a4a2a', grosor=0.5, presion=0.4)  # finger marks
mano(lz, 900, 762, -50, 18, 'piel4', 'junta')
mano(lz, 934, 762, 230, 18, 'piel4', 'junta', pulgar=-1)
# from the bud a stem rises into the skirt, where it opens as one of its flowers
tallo = bezier((916, 724), (910, 704), (896, 690), (884, 672), 30)
lz.lapiz([tallo], '#4f6f45', grosor=1.1, presion=0.8, temblor=0.3)
hojita(lz, 903, 698, 12, -170, '#5f8f63', tapa=1)
flor_grande(lz, 882, 662, 17, '#e8506a', centro=ORO)

# ------------------------------------------------------------------ flowers become birds (the quiet side)
for k, (x, y) in enumerate(((1036, 430), (1060, 398))):
    flor_simple(lz, x, y, 7, [CORAL, ORO][k], centro='#fff3cf')
pajaro(lz, 1116, 352, 17, CORAL, ang=-20)
pajaro(lz, 1204, 284, 15, TEAL, ang=-12)
pajaro(lz, 1290, 236, 12, ORO, ang=-24)

lz.vineta(margen=30)
lz.guardar(SALIDA)
print('ok', SALIDA)
