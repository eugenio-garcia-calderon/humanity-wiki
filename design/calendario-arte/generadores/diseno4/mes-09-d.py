"""
Mes 9 -- Economía -- Diseño 4.

Idea: a market stall in the village square, at the moment of a fair exchange.
A young woman hands the farmer a golden coin, and the bird embossed on the
coin comes alive and flies off: money is a tool, you decide what it serves
(and it can set you free). A trail of little coins follows it and turns into
leaves and then into a flock of small birds. The farmer gives back a bunch of
carrots still with their soil. The tablecloth hanging from her table IS the
countryside the food comes from (fields, an orchard, a farmhouse, a river):
buy local and ask where it comes from. On the table, a balance in
equilibrium (fair trade, price per kilo) where a girl on tiptoe puts an
apple, a bowl mended with gold (repair instead of replace), honey jars that
glow, bread, fruit. The buyer brings her own old basket (reuse).

    python3 mes-09-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, rgb, _lapiz_de,
                      pajaro, hojita, hoja, flor_simple, flor_grande, ramita, motas, remuestrea, mata)
from acuarela import puntos_dentro
from extra_m910 import cabeza_album, mano_dedos, manga, sombra, toldo, banderines, carita


def florecilla(x, y, r, col, centro='#e8735e'):
    """A tiny body-colour flower (gouache) for patterns on dark cloth."""
    for k in range(5):
        a = math.radians(k * 72 + x * 7)
        lz.gouache(Elipse(x + math.cos(a) * r * 0.55, y + math.sin(a) * r * 0.55, r * 0.42), col, alfa=0.88, irreg=0)
    lz.gouache(Elipse(x, y, r * 0.3), centro, alfa=0.9, irreg=0)

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-09-d.png'

lz = Lienzo(ANCHO, semilla=909)
rng = np.random.default_rng(9)

TEAL = '#3f8f8c'
TEAL_OSC = '#2a6464'
CORAL = '#e8735e'
CARMIN = '#c33c4e'
ORO = '#f0c25e'
OCRE = '#d9a441'
SIENA = '#c0703f'
SALVIA = '#86a86c'
VERDE = '#5f8f63'
LP = '#5e3f30'

# ------------------------------------------------------------------ helpers: produce


def tomate(x, y, r, col='#d8402e'):
    f = Elipse(x, y, r, r * 0.88)
    lz.aguada(f, col, dens=0.85, tapa=1, irreg=0.3, borde=0.7, gran=0.2,
              toques=[(x - r * 0.35, y - r * 0.35, r * 0.5, '#f39a6a', 0.6), (x + r * 0.4, y + r * 0.4, r * 0.6, '#8f2020', 0.5)])
    lz.contorno(f, '#7a2020', grosor=0.6, presion=0.45, cortes=0.3, desfase=0.2)
    for a in range(5):
        aa = math.radians(a * 72 - 90)
        lz.lapiz([[(x, y - r * 0.8), (x + math.cos(aa) * r * 0.4, y - r * 0.8 + math.sin(aa) * r * 0.25)]], '#4f6f45',
                 grosor=0.9, presion=0.8)
    lz.gouache(Elipse(x - r * 0.35, y - r * 0.3, r * 0.14, r * 0.08, -30), '#fff3e6', alfa=0.7, irreg=0)


def manzana(x, y, r, col='#d94a3a', toque='#f2c14e'):
    f = Poligono([(x - r, y - r * 0.2), (x - r * 0.75, y - r * 0.85), (x - r * 0.15, y - r * 0.9), (x, y - r * 0.7),
                  (x + r * 0.15, y - r * 0.9), (x + r * 0.75, y - r * 0.85), (x + r, y - r * 0.2), (x + r * 0.7, y + r * 0.75),
                  (x, y + r * 0.9), (x - r * 0.7, y + r * 0.75)])
    lz.aguada(f, col, dens=0.82, tapa=1, irreg=0.3, borde=0.7, gran=0.25,
              toques=[(x - r * 0.4, y - r * 0.2, r * 0.55, toque, 0.65)])
    lz.contorno(f, _lapiz_de(col, 0.5), grosor=0.6, presion=0.45, cortes=0.25, desfase=0.2)
    lz.lapiz([[(x, y - r * 0.7), (x + r * 0.15, y - r * 1.15)]], '#5e3f30', grosor=1.0, presion=0.8)
    hojita(lz, x + r * 0.12, y - r * 1.0, r * 0.75, -20, VERDE, tapa=1)
    lz.gouache(Elipse(x - r * 0.45, y - r * 0.4, r * 0.12, r * 0.07, -40), '#fff3e6', alfa=0.6, irreg=0)


def pera(x, y, r, col='#b8c45a'):
    f = Poligono([(x, y - r * 1.4), (x + r * 0.35, y - r * 1.1), (x + r * 0.45, y - r * 0.5), (x + r * 0.9, y + r * 0.2),
                  (x + r * 0.8, y + r * 0.8), (x, y + r), (x - r * 0.8, y + r * 0.8), (x - r * 0.9, y + r * 0.2),
                  (x - r * 0.45, y - r * 0.5), (x - r * 0.35, y - r * 1.1)])
    lz.aguada(f, col, dens=0.8, tapa=1, irreg=0.3, borde=0.7, toques=[(x + r * 0.4, y + r * 0.3, r * 0.6, '#d98a3a', 0.5)])
    lz.contorno(f, '#5a6a2a', grosor=0.6, presion=0.45, cortes=0.25)
    lz.lapiz([[(x, y - r * 1.35), (x - r * 0.1, y - r * 1.75)]], '#5e3f30', grosor=1.0, presion=0.8)


def calabaza(x, y, r, col='#e8892e'):
    gajos = []
    for k, dx in enumerate((-0.55, -0.2, 0.2, 0.55)):
        e = Elipse(x + dx * r, y, r * 0.42, r * 0.62)
        gajos.append(e)
    f = gajos[0] | gajos[1] | gajos[2] | gajos[3]
    lz.aguada(f, col, dens=0.85, tapa=1, irreg=0.3, borde=0.75, gran=0.3,
              toques=[(x - r * 0.3, y - r * 0.3, r * 0.5, '#f6b75a', 0.6), (x + r * 0.5, y + r * 0.3, r * 0.5, '#b8561e', 0.5)])
    lz.lapiz([arco(x + dx * r, y, r * 0.38, r * 0.6, -80, 80 if dx < 0 else 260, 14) for dx in (-0.2, 0.2)],
             '#9a4a1a', grosor=0.7, presion=0.5)
    lz.contorno(f, '#8a3e18', grosor=0.7, presion=0.5, cortes=0.25)
    lz.aguada(Trazo([(x, y - r * 0.5), (x + r * 0.08, y - r * 0.8), (x + r * 0.22, y - r * 0.9)], (r * 0.16, r * 0.1)),
              '#6a7a3a', dens=0.9, tapa=1, irreg=0.2)


def pan(x, y, w, h, ang=0):
    f = Elipse(x, y, w, h, ang)
    lz.aguada(f, '#d9963e', dens=0.75, tapa=1, irreg=0.35, borde=0.8, gran=0.4,
              toques=[(x, y - h * 0.3, w * 0.6, '#9a5a22', 0.55), (x - w * 0.5, y + h * 0.3, w * 0.4, '#f0c27a', 0.5)])
    lz.contorno(f, '#7a4a22', grosor=0.7, presion=0.5, cortes=0.2)
    a = math.radians(ang)
    for k in (-0.45, 0, 0.45):
        cx, cy = x + math.cos(a) * w * k, y + math.sin(a) * w * k
        lz.lapiz([[(cx - w * 0.12, cy + h * 0.3), (cx + w * 0.12, cy - h * 0.4)]], '#f6e0b0', grosor=1.5, presion=0.7)
        lz.lapiz([[(cx - w * 0.1, cy + h * 0.35), (cx + w * 0.14, cy - h * 0.35)]], '#7a4a22', grosor=0.6, presion=0.5)


def tarro_miel(x, y, w, h):
    """A honey jar that glows from inside (magic light), cloth lid with a ribbon."""
    f = Poligono([(x - w, y - h * 0.8), (x - w * 1.05, y + h * 0.7), (x - w * 0.8, y + h), (x + w * 0.8, y + h),
                  (x + w * 1.05, y + h * 0.7), (x + w, y - h * 0.8)])
    lz.aguada(f, '#e8a02e', dens=0.85, tapa=1, irreg=0.25, borde=0.7, gran=0.1,
              toques=[(x - w * 0.3, y, w * 0.7, '#ffd56a', 0.8), (x + w * 0.6, y + h * 0.6, w * 0.5, '#b8661e', 0.6)])
    lz.luz(Elipse(x - w * 0.2, y + h * 0.1, w * 0.7, h * 0.7), '#ffd97a', fuerza=0.45, suave=w * 0.4)
    lz.contorno(f, '#8a5a1e', grosor=0.7, presion=0.5, cortes=0.15)
    tapa_ = Poligono([(x - w * 1.25, y - h * 0.75), (x - w * 0.9, y - h * 1.15), (x + w * 0.9, y - h * 1.15),
                      (x + w * 1.25, y - h * 0.75), (x + w * 0.6, y - h * 0.62), (x, y - h * 0.72), (x - w * 0.6, y - h * 0.62)])
    lz.aguada(tapa_, '#f6ead6', dens=0.5, tapa=1, irreg=0.3)
    lz.rayado(tapa_, CARMIN, angulo=0, sep=3, presion=0.55)
    lz.rayado(tapa_, CARMIN, angulo=90, sep=3, presion=0.55)
    lz.contorno(tapa_, '#8a3a2a', grosor=0.6, presion=0.5)
    lz.gouache(Trazo([(x - w * 0.6, y - h * 0.4), (x - w * 0.65, y + h * 0.5)], (w * 0.14, w * 0.08)), '#fff6dc', alfa=0.65, irreg=0)


def cesta(x, y, w, h, col='#c99a5a', asa=True):
    f = Poligono([(x - w, y - h * 0.4), (x + w, y - h * 0.4), (x + w * 0.82, y + h * 0.6), (x - w * 0.82, y + h * 0.6)])
    lz.aguada(f, col, dens=0.72, tapa=1, irreg=0.3, borde=0.7, gran=0.4, toques=[(x + w * 0.5, y + h * 0.3, w * 0.5, '#8a6a3a', 0.5)])
    lz.rayado(f, '#7a5a30', angulo=0, sep=4.2, presion=0.45, grosor=0.9)
    lz.rayado(f, '#7a5a30', angulo=80, sep=6, presion=0.3, grosor=0.7)
    lz.contorno(f, '#6a4a2a', grosor=0.8, presion=0.55)
    if asa:
        lz.lapiz([arco(x, y - h * 0.4, w * 0.8, h * 1.1, 180, 360, 30)], '#6a4a2a', grosor=2.0, presion=0.7)
        lz.lapiz([arco(x, y - h * 0.4, w * 0.8, h * 1.1, 180, 360, 30)], '#c99a5a', grosor=0.9, presion=0.6)


# ------------------------------------------------------------------ geometry of the stall
TA = [(700, 520), (1250, 478), (1278, 548), (660, 606)]      # table top: back-left, back-right, front-right, front-left
D, C = np.array(TA[3], float), np.array(TA[2], float)
HEM_D, HEM_C = 772, 690                                          # cloth hem height at each front corner


def tela_y(x, t):
    """y on the hanging cloth at column x and fraction t (0 = table edge, 1 = hem)."""
    u = (x - D[0]) / (C[0] - D[0])
    top = D[1] + (C[1] - D[1]) * u
    hem = HEM_D + (HEM_C - HEM_D) * u
    return top + (hem - top) * t


def banda(t0, t1, x0=None, x1=None, ola0=0.0, ola1=0.0, fase=0.0):
    x0 = D[0] if x0 is None else x0
    x1 = C[0] if x1 is None else x1
    xs = np.linspace(x0, x1, 40)
    up = [(x, tela_y(x, t0) + ola0 * math.sin((x - D[0]) / 70 + fase)) for x in xs]
    dn = [(x, tela_y(x, t1) + ola1 * math.sin((x - D[0]) / 60 + fase + 1)) for x in xs[::-1]]
    return Poligono(up + dn, suave=False)


# ------------------------------------------------------------------ the awning and its poles (back)
for (x0, y0, x1, y1) in ((744, 516, 740, 176), (1236, 480, 1240, 146)):
    p = Trazo([(x0, y0), (x1, y1)], (8, 7))
    lz.aguada(p, '#9a6a4a', dens=0.7, tapa=1, irreg=0.3, gran=0.3)
    lz.contorno(p, LP, grosor=0.7, presion=0.5)
AW = [(730, 172), (1252, 142), (1318, 196), (694, 232)]
toldo(lz, *AW, cols=(CORAL, '#f6ead6', TEAL, '#f6ead6'), n=12, fleco=9, lapiz='#7a4030', dens=0.85)
lz.luz(Poligono(AW), '#ffd9a0', fuerza=0.12, suave=8)
# the underside of the awning in shade, warm
lz.aguada(Poligono([(694, 236), (1318, 200), (1300, 214), (712, 246)], suave=False), '#c9a07a', dens=0.25, suave=3)

# ------------------------------------------------------------------ the farmer, behind her table
FX, FY, FR = 968, 322, 44
blusa = Poligono([(FX - 20, FY + 62), (FX - 58, FY + 78), (FX - 74, FY + 130), (FX - 70, FY + 220), (FX + 74, FY + 224),
                  (FX + 76, FY + 132), (FX + 60, FY + 82), (FX + 20, FY + 64), (FX + 2, FY + 80)])
cabeza_album(lz, FX, FY, FR, piel='#c98a5e', peinado='pañuelo', pelo='#3a2418', pelo2=CARMIN, giro=-0.45, inclina=-6,
             ojos='abiertos', boca='risa', mira=(-1, 0.4), pendiente=ORO, cuello=True)
lz.aguada(blusa, '#e9b04a', dens=0.8, tapa=1, borde=0.6, gran=0.35, sombra=(-14, -8, '#b8701e', 0.6),
          toques=[(FX + 56, FY + 160, 46, '#c4802e', 0.6), (FX - 30, FY + 100, 34, '#f6d27a', 0.6)])
lz.contorno(blusa, '#8a5a22', grosor=0.9, presion=0.55, cortes=0.25)
lz.aguada(Poligono([(FX - 20, FY + 62), (FX + 2, FY + 92), (FX + 20, FY + 64), (FX + 9, FY + 56), (FX - 9, FY + 56)]),
          '#c98a5e', dens=0.6, tapa=1, irreg=0.3, toques=[(FX, FY + 64, 10, '#a06a42', 0.5)])
lz.lapiz([spline([(FX - 22, FY + 62), (FX + 2, FY + 94), (FX + 22, FY + 64)])], '#8a5a22', grosor=0.8, presion=0.6)
mandil = Poligono([(FX - 46, FY + 140), (FX + 50, FY + 142), (FX + 54, FY + 224), (FX - 50, FY + 224)])
lz.aguada(mandil, SALVIA, dens=0.72, tapa=1, borde=0.6, gran=0.35, sombra=(-10, -6), toques=[(FX + 30, FY + 200, 30, '#5f8f63', 0.5)])
lz.contorno(mandil, '#4f6f45', grosor=0.8, presion=0.5)
lz.lapiz([[(FX - 46, FY + 142), (FX - 30, FY + 104), (FX - 22, FY + 66)], [(FX + 50, FY + 144), (FX + 34, FY + 104), (FX + 22, FY + 66)]],
         '#4f6f45', grosor=1.6, presion=0.6)
for k in range(12):
    flor_simple(lz, FX - 36 + (k % 6) * 15, FY + 164 + (k // 6) * 26, 4.6, [CORAL, '#f6ead6', ORO][k % 3], centro=CARMIN)
# her right arm (image right) goes down to the basket on the table
manga(lz, [(FX + 58, FY + 88), (FX + 84, FY + 156), (FX + 70, FY + 198)], (26, 23, 20), '#e9b04a', pliegues=2,
      toques=[(FX + 84, FY + 156, 20, '#c4802e', 0.5)])

# ------------------------------------------------------------------ the table
mesa = Poligono(TA, suave=False)
lz.aguada(mesa, '#c99a6a', dens=0.62, tapa=1, irreg=0.3, borde=0.6, gran=0.45,
          toques=[(1150, 500, 140, '#b07a4a', 0.5), (720, 580, 100, '#e0b888', 0.5)])
lz.lapiz([[(700 - k * 6, 530 + k * 12), (1252 + k * 4, 488 + k * 9)] for k in range(1, 7)], '#9a6a3a', grosor=0.6,
         presion=0.25, temblor=0.9)
lz.contorno(mesa, LP, grosor=0.85, presion=0.5, cortes=0.2)

# the tablecloth hangs in front, and it IS the countryside the food comes from (day 24)
xs = np.linspace(D[0], C[0], 19)
hem = [(x + 4 * (k % 2), tela_y(x, 1.0) + (7 if k % 2 else -3)) for k, x in enumerate(xs)]
mantel = Poligono([tuple(D), tuple(C)] + hem[::-1], suave=False)
lz.aguada(mantel, '#efe0b0', dens=0.5, tapa=1, borde=0.5, gran=0.4,
          toques=[(760, 660, 90, '#f2c36a', 0.5), (1150, 620, 80, '#a8c47a', 0.5)])
lz.aguada(banda(0.0, 0.3, ola1=5), '#d9a83a', dens=0.6, irreg=0.6, borde=0.7, gran=0.5,
          toques=[(900, 600, 90, '#e8c25a', 0.6)])
lz.aguada(banda(0.3, 0.58, x1=950, ola0=5, ola1=8), '#7fae5e', dens=0.62, irreg=0.6, borde=0.7, gran=0.5,
          toques=[(760, 670, 60, '#5f8f63', 0.6)])
lz.aguada(banda(0.3, 0.58, x0=950, ola0=5, ola1=8), '#c9773a', dens=0.6, irreg=0.6, borde=0.7, gran=0.6)
lz.aguada(banda(0.58, 0.86, ola0=8, ola1=4), '#a9c48a', dens=0.55, irreg=0.6, borde=0.7, gran=0.5,
          toques=[(1100, 690, 70, '#86b6a0', 0.5)])
# wheat ears on the gold field
for x in np.arange(684, 1262, 17):
    y = tela_y(x, 0.17)
    lz.lapiz([[(x, y + 9), (x + 1.5, y - 6)]], '#9a6a1a', grosor=0.7, presion=0.6)
    for j in range(3):
        lz.aguada(Elipse(x + 1.5 + (j - 1) * 2.2, y - 6 - j * 2.5, 1.3, 2.6, 15 * (j - 1)), '#b07a1e', dens=0.85, irreg=0.1)
# crop rows in the green field, furrows in the ploughed one
lz.lapiz([[(x, tela_y(x, 0.54)), (x + 22, tela_y(x + 22, 0.36))] for x in np.arange(680, 930, 18)], '#3f6a3a', grosor=0.8,
         presion=0.5, temblor=0.4)
for x in np.arange(690, 930, 18):
    for t in (0.4, 0.47):
        xx = x + (0.54 - t) / 0.18 * 22
        lz.aguada(Elipse(xx, tela_y(xx, t), 2.6, 1.8), '#4f8a4a', dens=0.85, irreg=0.2)
lz.lapiz([[(x, tela_y(x, 0.56)), (x - 10, tela_y(x - 10, 0.33))] for x in np.arange(970, 1270, 14)], '#8a4a22', grosor=0.7,
         presion=0.45)
# a river of teal winding through the meadow
rio = Trazo([(664, tela_y(664, 0.74)), (760, tela_y(760, 0.66)), (860, tela_y(860, 0.78)), (960, tela_y(960, 0.68)),
             (1080, tela_y(1080, 0.8)), (1180, tela_y(1180, 0.7)), (1274, tela_y(1274, 0.76))], (9, 11, 10, 12, 10, 9, 7))
lz.aguada(rio & mantel, '#4f9ea6', dens=0.8, tapa=0.6, irreg=0.4, borde=0.8, toques=[(960, 690, 50, '#2f7f8a', 0.5)])
for x in (720, 850, 1000, 1150):
    lz.gouache(Trazo([(x, tela_y(x, 0.73)), (x + 10, tela_y(x + 10, 0.73))], (1.2, 1.2)), '#e8f6f4', alfa=0.8, irreg=0)
# orchard trees, a farmhouse, sheep: the place the food comes from
for (x, t, r_, col) in ((708, 0.36, 14, VERDE), (736, 0.33, 11, '#86a86c'), (1210, 0.33, 13, VERDE), (1238, 0.31, 9, '#3f7a6a'),
                        (1100, 0.63, 10, VERDE)):
    y = tela_y(x, t)
    lz.lapiz([[(x, y + r_ * 0.6), (x, y + r_ * 1.6)]], '#6e4c3c', grosor=1.1, presion=0.7)
    lz.aguada(Circulos([(x, y, r_), (x - r_ * 0.55, y + 2, r_ * 0.7), (x + r_ * 0.55, y + 2, r_ * 0.7)]), col, dens=0.85,
              tapa=0.8, irreg=0.4, borde=0.7)
    for j in range(4):
        lz.aguada(Elipse(x + rng.uniform(-r_ * 0.6, r_ * 0.6), y + rng.uniform(-r_ * 0.4, r_ * 0.4), 1.8), CORAL, dens=0.9,
                  irreg=0.1)
hx, hy = 1010, tela_y(1010, 0.36)
casa = Poligono([(hx - 18, hy + 12), (hx + 18, hy + 12), (hx + 18, hy - 10), (hx - 18, hy - 10)], suave=False)
lz.aguada(casa, '#fbf3e4', dens=0.6, tapa=1, irreg=0.2)
lz.aguada(Poligono([(hx - 24, hy - 8), (hx, hy - 30), (hx + 24, hy - 8)], suave=False), CARMIN, dens=0.85, tapa=1, irreg=0.2)
lz.aguada(Poligono([(hx - 4, hy + 12), (hx + 5, hy + 12), (hx + 5, hy), (hx - 4, hy)], suave=False), '#6e4c3c', dens=0.8, irreg=0.1)
lz.contorno(casa, LP, grosor=0.6, presion=0.5)
lz.aguada(Elipse(hx + 11, hy - 1, 3), '#f2c14e', dens=0.9, irreg=0.1)
lz.luz((hx + 11, hy - 1, 6), '#ffe2a0', fuerza=0.45)
lz.lapiz([bezier((hx + 6, hy - 22), (hx + 10, hy - 34), (hx + 2, hy - 42))], '#b8a898', grosor=0.8, presion=0.4)  # chimney smoke
for (x, t) in ((800, 0.72), (820, 0.75), (1050, 0.66)):
    y = tela_y(x, t)
    lz.aguada(Elipse(x, y, 6, 4), '#fbf6ec', dens=0.6, tapa=1, irreg=0.2)
    lz.lapiz([arco(x, y, 6, 4, 0, 360, 18)], LP, grosor=0.5, presion=0.5)
    lz.aguada(Elipse(x + 6, y - 1, 2), '#3a2a24', dens=0.9, irreg=0.1)
lz.contorno(mantel, '#8a6a3a', grosor=0.9, presion=0.55, cortes=0.25)
for (x, y) in hem[1:-1]:
    lz.aguada(Elipse(x, y - 6, 3.4), [CORAL, TEAL, ORO][int(x) % 3], dens=0.85, irreg=0.2)
lado = Poligono([(1278, 548), (1250, 478), (1254, 560), (1272, 694)], suave=False)
lz.aguada(lado, '#c9b07a', dens=0.6, tapa=1, irreg=0.3, toques=[(1262, 620, 30, '#a8905a', 0.5)])
lz.contorno(lado, '#8a6a3a', grosor=0.7, presion=0.45)
sombra(lz, 980, 760, 340, 20, dens=0.28)

# ------------------------------------------------------------------ goods on the table (back to front)
# a jug of flowers at the back, behind the bread
for (x, y, c) in ((884, 436, CORAL), (904, 424, ORO), (868, 420, '#ec9fa0'), (916, 446, CARMIN)):
    lz.lapiz([[(892, 496), (x, y)]], '#4f6f45', grosor=0.9, presion=0.7)
    flor_grande(lz, x, y, 10, c, petalos=7)
jarra = Poligono([(876, 466), (908, 466), (914, 484), (910, 506), (874, 506), (870, 484)])
lz.aguada(jarra, TEAL, dens=0.8, tapa=1, irreg=0.3, borde=0.7, sombra=(-5, -4))
lz.contorno(jarra, TEAL_OSC, grosor=0.8, presion=0.55)
pan(868, 506, 32, 14, -4)
calabaza(1112, 476, 28)
calabaza(1156, 490, 19, '#f0a23e')
# honey jars that glow
tarro_miel(724, 566, 14, 18)
tarro_miel(754, 578, 12, 16)
# a bowl mended with gold (kintsugi): repair instead of replace (day 19)
bx, by = 860, 566
cuenco = Poligono(np.vstack([arco(bx, by, 32, 9, 180, 360, 16), arco(bx, by, 32, 26, 0, 180, 20)]), suave=False)
lz.aguada(cuenco, '#3f6f8c', dens=0.82, tapa=1, borde=0.7, gran=0.3, toques=[(bx - 12, by + 8, 14, '#7fa8c8', 0.6)])
lz.aguada(Elipse(bx, by, 32, 9), '#efe6d2', dens=0.5, tapa=1, irreg=0.2)
lz.contorno(cuenco, '#24405a', grosor=0.8, presion=0.55)
for k in range(8):  # painted rim pattern
    a = math.radians(20 + k * 20)
    lz.aguada(Elipse(bx + math.cos(a) * 26, by + 6 + math.sin(a) * 12, 2.4), '#f6ead6', dens=0.7, irreg=0.1)
grieta = [spline([(bx - 8, by + 3), (bx - 3, by + 11), (bx - 10, by + 18), (bx - 6, by + 25)]),
          spline([(bx + 15, by + 5), (bx + 19, by + 13), (bx + 13, by + 21)])]
lz.lapiz(grieta, '#b8862a', grosor=2.4, presion=0.9, temblor=0.2)
lz.lapiz(grieta, '#ffe28a', grosor=1.0, presion=0.8, temblor=0.2)
lz.luz((bx - 4, by + 14, 12), '#ffe2a0', fuerza=0.4)
# eggs
for (x, y) in ((940, 552), (958, 546), (974, 554), (954, 560)):
    lz.aguada(Elipse(x, y, 9, 11, 10), '#f3e2c8', dens=0.6, tapa=1, irreg=0.2, borde=0.7, toques=[(x + 3, y + 3, 6, '#d9b896', 0.6)])
    lz.contorno(Elipse(x, y, 9, 11, 10), '#9a7a5a', grosor=0.6, presion=0.45)
lz.lapiz([arco(957, 564, 28, 6, 0, 180, 16), arco(957, 566, 30, 7, -10, 190, 16)], '#c9a24a', grosor=0.8, presion=0.6, temblor=0.6)

# the balance (fair trade and price per kilo, days 23 and 25): in equilibrium
BX, BY = 1196, 360
col_b = '#b8862a'
pie_b = Trazo([(BX, 512), (BX, BY)], (7, 5))
lz.aguada(pie_b, col_b, dens=0.85, tapa=1, irreg=0.2)
lz.aguada(Elipse(BX, 512, 18, 6), col_b, dens=0.85, tapa=1, irreg=0.2)
viga = Trazo([(BX - 66, BY), (BX + 66, BY)], (4.5, 4.5), suave=False)
lz.aguada(viga, col_b, dens=0.85, tapa=1, irreg=0.2)
lz.contorno(viga | pie_b, '#6a4a1a', grosor=0.7, presion=0.5)
lz.aguada(Elipse(BX, BY - 7, 7), col_b, dens=0.9, tapa=1, irreg=0.2)
lz.luz((BX, BY, 34), '#ffe2a0', fuerza=0.15)
for sx in (-1, 1):
    px = BX + sx * 66
    lz.lapiz([[(px, BY), (px - 20, BY + 70)], [(px, BY), (px + 20, BY + 70)]], '#6a4a1a', grosor=0.6, presion=0.6)
    plato = Poligono(np.vstack([arco(px, BY + 70, 24, 4.5, 180, 360, 12), arco(px, BY + 70, 24, 10, 0, 180, 12)]), suave=False)
    lz.aguada(plato, col_b, dens=0.85, tapa=1, irreg=0.2, toques=[(px - 6, BY + 72, 10, '#f0c25e', 0.6)])
    lz.contorno(plato, '#6a4a1a', grosor=0.6, presion=0.5)
for (dx, dy) in ((-8, -6), (0, -6), (8, -6), (-4, -12), (4, -12), (0, -18), (-12, -12), (12, -12), (-6, -24), (6, -24)):
    lz.aguada(Elipse(BX - 66 + dx, BY + 68 + dy, 5.4), '#7a4a8a', dens=0.85, tapa=1, irreg=0.2, borde=0.7,
              toques=[(BX - 66 + dx - 2, BY + 66 + dy, 3, '#b08ac8', 0.6)])
    lz.contorno(Elipse(BX - 66 + dx, BY + 68 + dy, 5.4), '#4a2a5a', grosor=0.5, presion=0.4)
hojita(lz, BX - 66, BY + 38, 15, -70, VERDE, tapa=1)
manzana(BX + 66, BY + 54, 14, '#e2553e')
pera(BX + 52, BY + 52, 9)
manzana(BX + 66, BY + 54, 14, '#e2553e')

# box of tomatoes, basket of fruit under the farmer's right hand
caja = Poligono([(1036, 500), (1112, 494), (1118, 528), (1042, 534)], suave=False)
for (x, y) in ((1048, 492), (1068, 488), (1088, 486), (1104, 484), (1056, 502), (1078, 498), (1098, 496)):
    tomate(x, y, 11)
lz.aguada(caja, '#c99a5a', dens=0.7, tapa=1, irreg=0.2)
lz.lapiz([[(1038, 514), (1116, 509)]], '#7a5a30', grosor=0.7, presion=0.5)
lz.contorno(caja, '#6a4a2a', grosor=0.8, presion=0.55)
cesta(1060, 566, 44, 26, '#b8864a', asa=False)
for (x, y, f) in ((1032, 542, 'm'), (1058, 536, 'p'), (1084, 542, 'm'), (1046, 552, 'm'), (1072, 552, 'm')):
    (manzana if f == 'm' else pera)(x, y, 12)
cesta(1060, 566, 44, 26, '#b8864a', asa=False)
for (x, y) in ((1040, 546), (1080, 546)):
    manzana(x, y - 4, 11, '#e2553e')
mano_dedos(lz, FX + 70, FY + 196, 70, 36, '#c98a5e', curl=0.45, abre=0.7, lado=1, pulgar=0.4)
lz.aguada(Elipse(FX + 70, FY + 194, 10, 13, 70), '#f0c870', dens=0.75, tapa=1, irreg=0.2)   # rolled cuff

# ------------------------------------------------------------------ the farmer's arm reaching to the buyer, carrots
manga(lz, [(FX - 56, FY + 88), (FX - 92, FY + 140), (FX - 124, FY + 132)], (28, 24, 21), '#e9b04a', pliegues=2,
      toques=[(FX - 90, FY + 140, 22, '#c4802e', 0.5)])
fore = Trazo([(FX - 122, FY + 132), (FX - 158, FY + 120), (FX - 186, FY + 106)], (19, 17, 14))
lz.aguada(fore, '#c98a5e', dens=0.6, tapa=1, irreg=0.3, toques=[(FX - 150, FY + 126, 12, '#a06a42', 0.5)])
lz.contorno(fore, '#6a3a26', grosor=0.7, presion=0.5)
lz.aguada(Elipse(FX - 124, FY + 132, 9, 14, 20), '#f0c870', dens=0.75, tapa=1, irreg=0.2)
lz.contorno(Elipse(FX - 124, FY + 132, 9, 14, 20), '#8a5a22', grosor=0.6, presion=0.5)
# the carrots (with their soil and feathery tops), held by the bunch
CX, CY = FX - 214, FY + 98
for k in range(11):
    a = math.radians(-65 - k * 7)
    ramita(lz, [(CX + 8, CY - 2), (CX + 8 + math.cos(a) * 24, CY - 2 + math.sin(a) * 24),
                (CX + 8 + math.cos(a) * 44 + 6, CY - 2 + math.sin(a) * 50)], '#6f9e4a', hojas=6, largo=7, tallo='#4f6f45')
for k, (ang, L) in enumerate(((-205, 56), (-218, 62), (-196, 50), (-228, 48))):
    a = math.radians(ang)
    tip = (CX + math.cos(a) * L, CY - math.sin(a) * L * 0.2 + 40 + k * 4)
    z = Trazo([(CX + 6, CY + 4 + k * 3), tip], (10, 2))
    lz.aguada(z, '#ec7a2a', dens=0.88, tapa=1, irreg=0.3, borde=0.7, toques=[(CX - 10, CY + 14, 12, '#b84a1a', 0.5)])
    lz.contorno(z, '#9a3a12', grosor=0.6, presion=0.45)
    for j in range(3):
        t = 0.3 + j * 0.2
        px = CX + (tip[0] - CX) * t
        py = CY + (tip[1] - CY) * t
        lz.lapiz([[(px - 2, py - 3), (px + 2, py + 1)]], '#9a3a12', grosor=0.5, presion=0.5)
    lz.aguada(Elipse(tip[0], tip[1], 2.8, 2.2), '#7a5a3a', dens=0.7, irreg=0.5)
for k in range(7):
    lz.aguada(Elipse(CX - 30 + rng.normal(0, 14), CY + 60 + rng.uniform(0, 40), rng.uniform(1, 2.4)), '#7a5a3a', dens=0.7, irreg=0.4)
mano_dedos(lz, FX - 186, FY + 106, 172, 38, '#c98a5e', curl=0.7, abre=0.4, lado=-1, pulgar=0.3)

# ------------------------------------------------------------------ the buyer: a young woman stepping in
PIEL_B = '#9b6141'
sombra(lz, 486, 792, 120, 15, dens=0.32)
HX, HY, BR = 476, 300, 48
# back arm (image left): down, holding her daughter's hand
manga(lz, [(430, 398), (404, 472), (408, 532)], (34, 29, 25), TEAL, pliegues=2, toques=[(404, 472, 28, TEAL_OSC, 0.5)])
# legs (one steps forward) and shoes
for (pts, w) in (([(462, 690), (452, 744), (446, 778)], (20, 16, 13)), ([(500, 690), (530, 738), (556, 766)], (20, 16, 13))):
    f = Trazo(pts, w)
    lz.aguada(f, PIEL_B, dens=0.6, tapa=1, irreg=0.3, toques=[(pts[1][0], pts[1][1], 14, '#7a4a32', 0.4)])
    lz.contorno(f, '#5a3020', grosor=0.6, presion=0.45)
for (x, y, a) in ((440, 786, 178), (568, 772, 20)):
    z = Poligono([(x - 20, y), (x - 10, y - 9), (x + 14, y - 8), (x + 22, y + 2), (x + 8, y + 7), (x - 16, y + 6)])
    if a > 90:
        z = Poligono([(2 * x - px, py) for (px, py) in z.p[::3]])
    lz.aguada(z, CARMIN, dens=0.88, tapa=1, irreg=0.3, toques=[(x, y - 4, 8, '#e05a6a', 0.5)])
    lz.contorno(z, '#7a1f30', grosor=0.7, presion=0.5)
# the dress: fitted bodice, a full skirt swinging with the step, tiny flowers
cuerpo_v = Poligono([(446, 372), (430, 394), (434, 440), (446, 494), (512, 496), (530, 442), (526, 396), (508, 374), (476, 384)])
falda = Poligono([(446, 488), (512, 488), (540, 540), (586, 624), (604, 690), (580, 708), (530, 714), (480, 718), (430, 712),
                  (392, 700), (396, 640), (420, 560)])
lz.aguada(falda, TEAL, dens=0.84, tapa=1, borde=0.75, gran=0.45, sombra=(-16, -10, TEAL_OSC, 0.6),
          toques=[(420, 680, 60, TEAL_OSC, 0.65), (520, 560, 40, '#6fb1ad', 0.6), (580, 680, 40, '#2f6467', 0.5)])
lz.contorno(falda, '#24504e', grosor=0.95, presion=0.6, cortes=0.15)
lz.lapiz([bezier((470, 520), (462, 600), (450, 660), (446, 714)), bezier((492, 520), (514, 600), (548, 660), (566, 706)),
          bezier((458, 524), (430, 600), (414, 650), (404, 698)), bezier((500, 512), (540, 570), (574, 630), (594, 690))],
         '#24504e', grosor=0.85, presion=0.45, temblor=0.4)
lz.aguada(cuerpo_v, TEAL, dens=0.86, tapa=1, borde=0.7, gran=0.4, sombra=(-10, -6, TEAL_OSC, 0.6), toques=[(510, 470, 24, TEAL_OSC, 0.5), (450, 400, 20, '#6fb1ad', 0.5)])
lz.contorno(cuerpo_v, '#24504e', grosor=0.9, presion=0.55)
for f, n in ((falda, 110), (cuerpo_v, 22)):
    for (x, y) in puntos_dentro(f, n, 77 + n, margen=4):
        florecilla(x, y, rng.uniform(2.6, 3.6), rng.choice(['#fbf3e2', '#f6d27a', '#f6b6b0', '#fbf3e2']))
cinta = Trazo([(444, 492), (478, 498), (514, 492)], (10, 11, 10))
lz.aguada(cinta, ORO, dens=0.88, tapa=1, irreg=0.2)
lz.contorno(cinta, '#9a6a1a', grosor=0.6, presion=0.5)
lz.aguada(Trazo([(446, 494), (432, 520), (436, 548)], (7, 4)), ORO, dens=0.85, tapa=1, irreg=0.2)
cabeza_album(lz, HX, HY, BR, piel=PIEL_B, peinado='largo', pelo='#24160f', giro=0.45, inclina=8, ojos='abiertos',
             boca='sonrisa', mira=(1, 0.2), adorno=CORAL, pendiente=ORO)
lz.aguada(Poligono([(452, 372), (476, 392), (502, 374), (488, 364), (464, 364)]), PIEL_B, dens=0.6, tapa=1, irreg=0.3,
          toques=[(476, 368, 12, '#7a4a32', 0.5)])
lz.lapiz([spline([(448, 372), (476, 396), (506, 374)])], '#24504e', grosor=0.9, presion=0.6)
# front arm (image right): reaches out to the farmer; sleeve to the elbow, then the bare forearm
manga(lz, [(516, 398), (566, 444), (604, 446)], (32, 27, 23), TEAL, pliegues=2, toques=[(566, 444, 22, TEAL_OSC, 0.5)])
fore2 = Trazo([(598, 446), (630, 432), (654, 414)], (19, 17, 14))
lz.aguada(fore2, PIEL_B, dens=0.6, tapa=1, irreg=0.3, toques=[(630, 440, 10, '#7a4a32', 0.4)])
lz.contorno(fore2, '#5a3020', grosor=0.7, presion=0.5)
lz.aguada(Elipse(600, 446, 10, 16, 30), '#6fb1ad', dens=0.78, tapa=1, irreg=0.2)
lz.contorno(Elipse(600, 446, 10, 16, 30), '#24504e', grosor=0.6, presion=0.5)

# ------------------------------------------------------------------ the coin, and the bird that leaves it
MX, MY, MR = 696, 378, 30


def moneda(x, y, r):
    lz.aguada(Elipse(x + 3.5, y + 2.5, r, r), '#9a6a1a', dens=0.9, tapa=1, irreg=0.15)
    f = Elipse(x, y, r, r)
    lz.aguada(f, '#e8b440', dens=0.9, tapa=1, irreg=0.15, borde=0.8, gran=0.3,
              toques=[(x - r * 0.4, y - r * 0.4, r * 0.6, '#ffe28a', 0.8), (x + r * 0.5, y + r * 0.5, r * 0.5, '#b8862a', 0.6)])
    lz.contorno(f, '#7a4a12', grosor=0.9, presion=0.65, cortes=0.05, desfase=0.1)
    lz.lapiz([arco(x, y, r * 0.84, r * 0.84, 0, 360, 40)], '#a0701e', grosor=0.6, presion=0.5)
    for k in range(32):
        a = math.radians(k * 360 / 32)
        lz.aguada(Elipse(x + math.cos(a) * r * 0.92, y + math.sin(a) * r * 0.92, r * 0.035), '#a0701e', dens=0.9, irreg=0.1)
    # the bird embossed on the coin: wings raised, in flight
    s = r / 1.05
    P = lambda pts: [(x + px * s, y + py * s) for px, py in pts]
    cuerpo_p = Poligono(P([(-0.62, 0.22), (-0.3, 0.08), (0.1, 0.02), (0.42, -0.06), (0.56, -0.02), (0.46, 0.1),
                           (0.1, 0.24), (-0.3, 0.3)]))
    ala_p = Poligono(P([(-0.2, 0.08), (-0.32, -0.3), (-0.2, -0.62), (0.0, -0.4), (0.06, -0.66), (0.22, -0.4), (0.18, 0.04)]))
    cola_p = Poligono(P([(-0.5, 0.2), (-0.8, 0.05), (-0.75, 0.25), (-0.82, 0.42), (-0.5, 0.3)]), suave=False)
    rel = cuerpo_p | ala_p | cola_p
    lz.aguada(rel, '#c8922e', dens=0.7, irreg=0.1, borde=0.9)
    lz.contorno(rel, '#7a4a12', grosor=0.6, presion=0.65, cortes=0.05, desfase=0.05)
    lz.lapiz([P([(-0.32, -0.3), (-0.2, -0.62), (0.0, -0.4), (0.06, -0.66)]), P([(-0.3, 0.08), (0.42, -0.06)])], '#fff0b8',
             grosor=0.8, presion=0.8)
    lz.luz((x, y, r * 1.5), '#ffe08a', fuerza=0.55)
    lz.gouache(Elipse(x - r * 0.5, y - r * 0.55, r * 0.12, r * 0.06, -45), '#fffbe8', alfa=0.85, irreg=0)


lz.aguada(Elipse(MX, MY, 80), '#f6d27a', dens=0.22, suave=30, gran=0.05)
moneda(MX, MY, MR)
mano_dedos(lz, 652, 416, -42, 46, PIEL_B, curl=0.5, abre=0.35, lado=1, pulgar=0.8)

# the bird lifts off the coin, alive, toward the open paper (freedom)
camino = bezier((MX - 4, MY - 22), (700, 250), (620, 190), (540, 150), 80)
for k, (x, y) in enumerate(camino[6:-10:3]):
    t = k / 21
    lz.gouache(Elipse(x + rng.normal(0, 5), y + rng.normal(0, 5), rng.uniform(0.9, 2.0)), '#fff3c8', alfa=0.9, irreg=0)
    lz.aguada(Elipse(x + rng.normal(0, 7), y + rng.normal(0, 7), rng.uniform(1.0, 2.2)), '#e8b440', dens=0.8, irreg=0.1)
lz.luz(Trazo(camino[::6], (16,)), '#ffe2a0', fuerza=0.16, suave=10)
pajaro(lz, 520, 146, 42, '#3f8f8c', ang=-24, alas='arriba', vientre='#f6d27a')
lz.luz((520, 146, 70), '#ffe2a0', fuerza=0.18)

# the flock that follows: little coins that become leaves, then small birds, off into the silence
traza2 = bezier((MX - 20, MY - 34), (650, 190), (430, 110), (220, 150), 80)
for k, (x, y) in enumerate(traza2[8::7]):
    t = k / 10
    if t < 0.25:
        lz.aguada(Elipse(x, y, 6, 6), '#e8b440', dens=0.88, tapa=1, irreg=0.15, borde=0.8, toques=[(x - 2, y - 2, 3, '#ffe28a', 0.7)])
        lz.contorno(Elipse(x, y, 6, 6), '#7a4a12', grosor=0.5, presion=0.5)
    elif t < 0.55:
        hojita(lz, x, y, 15, -150 + k * 30, [SALVIA, ORO, VERDE][k % 3], tapa=1)
    else:
        pajaro(lz, x, y - 10, 10 + k * 0.8, [CORAL, ORO, TEAL, '#ec9fa0'][k % 4], ang=-30 + k * 3,
               alas='arriba' if k % 2 else 'abajo')

# ------------------------------------------------------------------ the daughter: holds mum's hand, points at the bird
GX, GY, GR = 336, 626, 31
sombra(lz, 340, 822, 62, 10, dens=0.3)
for (pts) in ([(326, 742), (320, 782), (318, 808)], [(346, 742), (354, 782), (360, 808)]):
    f = Trazo(pts, (13, 11, 9))
    lz.aguada(f, '#e6ae88', dens=0.6, tapa=1, irreg=0.3)
    lz.contorno(f, '#8a5440', grosor=0.6, presion=0.45)
for (x, y, sd) in ((312, 814, -1), (366, 814, 1)):
    z = Elipse(x + sd * 4, y, 13, 6, 0)
    lz.aguada(z, '#3f6f8c', dens=0.88, tapa=1, irreg=0.2)
    lz.contorno(z, '#24405a', grosor=0.6, presion=0.5)
vest = Poligono([(314, 676), (358, 676), (366, 704), (390, 752), (338, 764), (286, 752), (306, 704)])
lz.aguada(vest, '#f0b030', dens=0.84, tapa=1, borde=0.75, gran=0.4, sombra=(-8, -6, '#c4702a', 0.6), toques=[(370, 740, 26, '#d9862a', 0.6)])
lz.contorno(vest, '#8a5a12', grosor=0.85, presion=0.55)
lz.lapiz([bezier((330, 712), (322, 732), (312, 758)), bezier((346, 712), (356, 734), (366, 756))], '#9a6a1a', grosor=0.7, presion=0.4)
for k in range(9):  # embroidered hem
    x = 292 + k * 11
    lz.aguada(Elipse(x, 752 + (x - 292) * 0.02, 2.6), [CARMIN, TEAL][k % 2], dens=0.9, irreg=0.1)
cabeza_album(lz, GX, GY, GR, piel='#e6ae88', peinado='rizado', pelo='#5a2e1a', giro=0.2, inclina=-14, ojos='abiertos',
             boca='risa', mira=(-0.3, -1), cuello=True)
lz.aguada(Poligono([(316, 674), (336, 688), (356, 674), (346, 668), (326, 668)]), '#fbf6ec', dens=0.5, tapa=1)
lz.contorno(Poligono([(316, 674), (336, 688), (356, 674), (346, 668), (326, 668)]), '#9a7a5a', grosor=0.6, presion=0.5)
# her right arm (image right) up to mum's hand; her left arm points at the bird
manga(lz, [(356, 684), (382, 626), (402, 566)], (14, 12, 11), '#e6ae88', pliegues=0, lapiz='#8a5440', dens=0.55)
manga(lz, [(314, 684), (284, 632), (268, 574)], (14, 12, 11), '#e6ae88', pliegues=0, lapiz='#8a5440', dens=0.55)
for pts in ([(356, 680), (366, 662)], [(314, 680), (304, 664)]):
    f = Trazo(pts, (17, 15))
    lz.aguada(f, '#f0b030', dens=0.84, tapa=1, irreg=0.2)
    lz.contorno(f, '#8a5a12', grosor=0.6, presion=0.5)
mano_dedos(lz, 268, 574, -110, 28, '#e6ae88', curl=0.05, abre=0.15, lado=-1, pulgar=0.4, dedos=1)
lz.aguada(Elipse(266, 562, 7, 9, -20), '#e6ae88', dens=0.6, tapa=1, irreg=0.3)   # curled fingers under the index
lz.contorno(Elipse(266, 562, 7, 9, -20), '#8a5440', grosor=0.6, presion=0.5)
# mum's hand clasps hers
mano_dedos(lz, 402, 566, -80, 26, '#e6ae88', curl=0.6, abre=0.4, lado=1, pulgar=0.5)
mano_dedos(lz, 408, 532, 100, 38, PIEL_B, curl=0.65, abre=0.4, lado=-1, pulgar=0.4)

# a feather from the bird drifting down toward the girl
pl = Trazo([(332, 392), (346, 372), (354, 348)], (2, 10, 2))
lz.aguada(pl, '#6fb1ad', dens=0.65, irreg=0.3, borde=0.8)
lz.lapiz([[(330, 396), (354, 348)]], TEAL_OSC, grosor=0.6, presion=0.6)

lz.vineta(margen=30)
lz.guardar(SALIDA)
print('ok', SALIDA)
