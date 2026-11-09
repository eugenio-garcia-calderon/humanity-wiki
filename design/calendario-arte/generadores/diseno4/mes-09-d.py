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
from acuarela import puntos_dentro, pececillo, Mascara
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




# ------------------------------------------------------------------ the village square, sketched pale in the distance
# One continuous line of arcades curving behind the stall (nearer and taller at the sides, farther and
# lower in the middle), painted in pale washes and pencil. Under the arches, people trade with gestures.
PAL = '#a8927e'          # pale pencil for the far plaza


def base_soportal(x):
    """Ground line of the arcade: the square is round, the middle is farther away."""
    return 404 - 30 * math.sin(math.pi * (x - 30) / 1450)


def alto_arco(x):
    return 118 - 34 * math.sin(math.pi * (x - 30) / 1450)


def gente(x, yf, h, ropa, piel='#e0b090', pelo='#6a4a3a', falda=False, brazo_d=None, brazo_i=None, inclina=0.0, lleva=None):
    """A small far-away person with a real gesture: arms bent at the elbow (shoulder->elbow->hand angles),
    a slight lean, maybe something in the hand ('cantaro', 'tela', 'cesta')."""
    r = h / 8.0
    hx = x + inclina
    hy = yf - h + r
    sh = hy + r * 1.7
    hip = sh + r * 2.6
    cuerpo_ = Poligono([(hx - r * 0.95, sh), (hx + r * 0.95, sh), (x + (r * 1.6 if falda else r * 0.85), hip + (r * 1.8 if falda else 0)),
                        (x - (r * 1.6 if falda else r * 0.85), hip + (r * 1.8 if falda else 0))])
    for sd in (-1, 1):
        lz.lapiz([[(x + sd * r * 0.45, hip + (r * 1.6 if falda else 0)), (x + sd * r * 0.7, yf)]], PAL, grosor=1.1, presion=0.55)
    lz.aguada(cuerpo_, ropa, dens=0.5, tapa=1, irreg=0.4, borde=0.7, gran=0.3, sombra=(-2, -2))
    lz.contorno(cuerpo_, PAL, grosor=0.6, presion=0.4, cortes=0.3)
    manos = []
    for sd, br in ((1, brazo_d), (-1, brazo_i)):
        a1, a2 = br if br else (100 - sd * 10, 95)
        p0 = (hx + sd * r * 0.8, sh + r * 0.3)
        p1 = (p0[0] + math.cos(math.radians(a1)) * r * 1.6, p0[1] + math.sin(math.radians(a1)) * r * 1.6)
        p2 = (p1[0] + math.cos(math.radians(a2)) * r * 1.5, p1[1] + math.sin(math.radians(a2)) * r * 1.5)
        lz.aguada(Trazo([p0, p1, p2], (r * 0.55, r * 0.5, r * 0.42)), ropa, dens=0.45, tapa=1, irreg=0.3)
        lz.lapiz([[p0, p1, p2]], PAL, grosor=0.6, presion=0.45)
        lz.aguada(Elipse(p2[0], p2[1], r * 0.3), piel, dens=0.5, tapa=1, irreg=0.2)
        manos.append(p2)
    lz.aguada(Elipse(hx, hy, r, r * 1.08), piel, dens=0.5, tapa=1, irreg=0.2)
    lz.aguada(Elipse(hx - inclina * 0.05, hy - r * 0.4, r * 1.04, r * 0.72), pelo, dens=0.45, irreg=0.3)
    lz.contorno(Elipse(hx, hy, r, r * 1.08), PAL, grosor=0.5, presion=0.35, cortes=0.3)
    return manos


xs_s = np.linspace(30, 1480, 120)
techo = [(x, base_soportal(x) - alto_arco(x) - 58 - 6 * math.sin(x / 40)) for x in xs_s]
muro_s = Poligono(techo + [(x, base_soportal(x) + 2) for x in xs_s[::-1]], suave=False)
lz.aguada(muro_s, '#efd9b8', dens=0.42, tapa=1, irreg=1.6, borde=0.6, gran=0.7, var=0.7,
          toques=[(200, 330, 120, '#f0c8a0', 0.5), (760, 300, 160, '#e8d0c0', 0.5), (1380, 330, 100, '#f2d0a8', 0.5)],
          desvanece=None)
# roof: a band of terracotta tiles
teja = Poligono([(x, y - 2) for (x, y) in techo] + [(x, y + 10) for (x, y) in techo[::-1]], suave=False)
lz.aguada(teja, '#d9987a', dens=0.45, tapa=1, irreg=0.8, gran=0.5)
lz.lapiz([[(x, y - 2), (x - 2, y + 10)] for (x, y) in techo[::2]], '#b8786a', grosor=0.5, presion=0.35)
# the arches, one after another, getting smaller toward the middle
arcos_s = []
x = 52
while x < 1470:
    h = alto_arco(x)
    w = h * 0.62
    yb = base_soportal(x)
    cx_, ra = x + w / 2, w * 0.36
    yt = yb - h + ra
    hueco = Poligono(np.vstack([[(cx_ - ra, yb)], arco(cx_, yt, ra, ra, 180, 360, 18), [(cx_ + ra, yb)]]), suave=False)
    lz.aguada(hueco, '#c4ae9a', dens=0.42, tapa=1, irreg=0.5, borde=0.6, gran=0.4, toques=[(cx_, yt, ra, '#b49a88', 0.6)])
    lz.contorno(hueco, PAL, grosor=0.7, presion=0.42, cortes=0.3)
    arcos_s.append((cx_, ra, yb, h))
    # a window with shutters above some arches, flowerpots on the sill
    if len(arcos_s) % 2 == 1:
        wy = yb - h - 30
        lz.aguada(Poligono([(cx_ - 8, wy - 14), (cx_ + 8, wy - 14), (cx_ + 8, wy + 8), (cx_ - 8, wy + 8)], suave=False), '#8aa8b0',
                  dens=0.4, tapa=1, irreg=0.3)
        for sd in (-1, 1):
            lz.aguada(Poligono([(cx_ + sd * 8, wy - 14), (cx_ + sd * 15, wy - 14), (cx_ + sd * 15, wy + 8), (cx_ + sd * 8, wy + 8)],
                               suave=False), '#7fa89a', dens=0.4, tapa=1, irreg=0.3)
        for j in (-1, 1):
            lz.aguada(Elipse(cx_ + j * 5, wy + 6, 4, 3.4), rng.choice([CORAL, '#ec9fa0', ORO]), dens=0.55, irreg=0.3)
            lz.aguada(Poligono([(cx_ + j * 5 - 3, wy + 9), (cx_ + j * 5 + 3, wy + 9), (cx_ + j * 5 + 2, wy + 14), (cx_ + j * 5 - 2, wy + 14)],
                               suave=False), '#c0703f', dens=0.5, irreg=0.2)
    x += w
lz.contorno(muro_s, PAL, grosor=0.6, presion=0.35, cortes=0.5)
for (x0_, x1_) in ((0, 150), (1340, 1485)):
    lz.levanta(Poligono([(x0_, 150), (x1_, 150), (x1_, 470), (x0_, 470)], suave=False) &
               Mascara(lambda lz_, a, b, c, d, x0_=x0_, x1_=x1_: np.clip(((np.arange(a, c) + 0.5) / lz_.s - (x1_ if x0_ == 0 else x0_)) /
                                                                            ((x0_ - x1_) if x0_ == 0 else (x1_ - x0_)), 0, 1)[None, :].repeat(d - b, 0).astype(np.float32),
                       (x0_, 150, x1_, 470)), 0.95, suave=6)
# the square's floor: a pale wash with a few paving lines
suelo_p = Poligono([(x, base_soportal(x)) for x in xs_s] + [(x, base_soportal(x) + 40 + 10 * math.sin(x / 90)) for x in xs_s[::-1]],
                   suave=False)
lz.aguada(suelo_p, '#ead6b6', dens=0.3, irreg=1.6, borde=0.2, gran=0.6, desvanece=(0, 400, 0, 450))
lz.lapiz([[(x, base_soportal(x) + 10 + (k % 2) * 8), (x + 16, base_soportal(x + 16) + 10 + (k % 2) * 8)]
          for k, x in enumerate(np.arange(40, 1460, 26))], PAL, grosor=0.5, presion=0.3, cortes=0.3)

# people trading under the arches (left): a woman holds out a clay jug to a man who reaches for it;
# a girl tries a shawl on while the weaver holds its other end
yb = base_soportal(110)
m1 = gente(96, yb, 50, '#c8805a', brazo_d=(10, -20), inclina=3)
lz.aguada(Poligono([(m1[0][0] - 2, m1[0][1] - 8), (m1[0][0] + 8, m1[0][1] - 10), (m1[0][0] + 12, m1[0][1] + 2), (m1[0][0] + 4, m1[0][1] + 8)]),
          '#c0703f', dens=0.6, tapa=1, irreg=0.3)
gente(148, yb, 52, '#7aa0b0', falda=False, brazo_i=(170, 200), inclina=-3, pelo='#3a2a24')
yb = base_soportal(250)
gente(236, yb, 48, '#e0a860', falda=True, brazo_d=(-60, -110), brazo_i=(-120, -70), pelo='#8a5a3a')
lz.aguada(Trazo([(220, yb - 40), (236, yb - 36), (252, yb - 40), (262, yb - 26), (276, yb - 20)], (6, 8, 6, 5, 4)), CORAL, dens=0.55,
          tapa=1, irreg=0.4)    # the shawl over her shoulders, its end held by the weaver
gente(290, yb, 50, '#a088b8', falda=True, brazo_i=(160, 190), pelo='#3a2a24')
# (right) an old man weighs a melon in his hands before a basket seller
yb = base_soportal(1380)
mm = gente(1366, yb, 52, '#9ab08a', brazo_d=(60, -40), brazo_i=(120, -140), pelo='#d0c8c0')
lz.aguada(Elipse(1366, mm[0][1] - 4, 9, 7), '#c8c860', dens=0.6, tapa=1, irreg=0.3)
gente(1426, yb, 48, '#d9987a', falda=True, brazo_i=(160, 170), pelo='#4a3a2a')
for j in range(3):
    lz.aguada(Poligono([(1440 + j * 10, yb), (1436 + j * 10, yb - 12), (1448 + j * 10, yb - 12), (1446 + j * 10, yb)], suave=False),
              '#c9a06a', dens=0.5, tapa=1, irreg=0.3)
# the fountain, coherent: water rises from the column and falls from the top bowl into the basin
FUx, FUy = 186, 470
lz.aguada(Elipse(FUx, FUy, 58, 11), '#a8c8cc', dens=0.45, tapa=1, irreg=0.4, toques=[(FUx + 20, FUy, 20, '#7fb0b8', 0.6)])
pila = Poligono(np.vstack([arco(FUx, FUy, 58, 11, 180, 360, 16)[::-1][::-1], arco(FUx, FUy + 22, 58, 11, 0, 180, 16)]), suave=False)
pila = Poligono(np.vstack([arco(FUx, FUy, 58, 11, 0, 180, 16), arco(FUx, FUy + 22, 58, 11, 180, 0, 16)]), suave=False)
lz.aguada(pila, '#dcc8aa', dens=0.5, tapa=1, irreg=0.5, gran=0.5, toques=[(FUx + 30, FUy + 20, 30, '#c8b090', 0.5)])
lz.contorno(pila | Elipse(FUx, FUy, 58, 11), PAL, grosor=0.6, presion=0.45, cortes=0.3)
lz.aguada(Trazo([(FUx, FUy + 4), (FUx, FUy - 40)], (9, 6)), '#dcc8aa', dens=0.5, tapa=1, irreg=0.3)
copa = Poligono(np.vstack([arco(FUx, FUy - 44, 20, 5, 180, 360, 12), arco(FUx, FUy - 44, 16, 9, 0, 180, 12)]), suave=False)
lz.aguada(copa, '#dcc8aa', dens=0.55, tapa=1, irreg=0.3)
lz.contorno(copa, PAL, grosor=0.6, presion=0.45)
lz.lapiz([bezier((FUx, FUy - 46), (FUx - 1, FUy - 62), (FUx, FUy - 70))], '#7fb0b8', grosor=0.9, presion=0.6)   # the jet
for sd in (-1, 1):
    for k in range(3):
        lz.lapiz([bezier((FUx + sd * (14 + k * 3), FUy - 45), (FUx + sd * (30 + k * 6), FUy - 52 + k * 4), (FUx + sd * (40 + k * 5), FUy - 4))],
                 '#7fb0b8', grosor=0.7, presion=0.5)
for k in range(9):
    lz.gouache(Elipse(FUx + rng.normal(0, 14), FUy - 60 + rng.normal(0, 6), 0.9), '#eaf6f6', alfa=0.85, irreg=0)
pajaro(lz, FUx + 50, FUy - 6, 7, '#a8b8b0', ang=0, alas='abajo')

# ------------------------------------------------------------------ geometry of the stall
TA = [(700, 520), (1250, 478), (1278, 548), (660, 606)]      # table top: back-left, back-right, front-right, front-left
D, C = np.array(TA[3], float), np.array(TA[2], float)
HEM_D, HEM_C = 772, 690                                          # cloth hem height at each front corner
PL = (C[0] - D[0]) / 8                                           # width of one drape fold


def tela_y(x, t):
    """y on the hanging cloth at column x and fraction t (0 = table edge, 1 = hem). The cloth hangs in soft
    folds: the lower it is, the more every line dips between the folds."""
    u = (x - D[0]) / (C[0] - D[0])
    top = D[1] + (C[1] - D[1]) * u
    hem = HEM_D + (HEM_C - HEM_D) * u + 15 * abs(math.sin(math.pi * (x - D[0]) / PL))
    return top + (hem - top) * t


def parche(x0, x1, t0, t1, n=24):
    xs_ = np.linspace(x0, x1, n)
    return Poligono([(x, tela_y(x, t0)) for x in xs_] + [(x, tela_y(x, t1)) for x in xs_[::-1]], suave=False)


def costura(x0, x1, t, color='#7a4a2a'):
    xs_ = np.linspace(x0, x1, 30)
    lz.lapiz([[(x, tela_y(x, t)) for x in xs_]], color, grosor=0.7, presion=0.6, cortes=0.75, temblor=0.2)


def costura_v(x, t0, t1, color='#7a4a2a'):
    ts = np.linspace(t0, t1, 12)
    lz.lapiz([[(x + 1.5 * math.sin(t * 9), tela_y(x, t)) for t in ts]], color, grosor=0.7, presion=0.6, cortes=0.75, temblor=0.2)


# ------------------------------------------------------------------ the awning and its poles (back)
for (x0, y0, x1, y1) in ((744, 516, 740, 176), (1236, 480, 1240, 146)):
    p = Trazo([(x0, y0), (x1, y1)], (8, 7))
    lz.aguada(p, '#9a6a4a', dens=0.7, tapa=1, irreg=0.3, gran=0.3)
    lz.contorno(p, LP, grosor=0.7, presion=0.5)
AW = [(730, 172), (1252, 142), (1318, 196), (694, 232)]
toldo(lz, *AW, cols=(CORAL, '#f6ead6', TEAL, '#f6ead6'), n=12, fleco=9, lapiz='#7a4030', dens=1.0)
lz.luz(Poligono(AW), '#ffd9a0', fuerza=0.12, suave=8)
lz.aguada(Poligono([(694, 236), (1318, 200), (1300, 214), (712, 246)], suave=False), '#c9a07a', dens=0.25, suave=3)

# ------------------------------------------------------------------ the farmer, behind her table
FX, FY, FR = 968, 322, 44
blusa = Poligono([(FX - 20, FY + 62), (FX - 58, FY + 78), (FX - 74, FY + 130), (FX - 70, FY + 220), (FX + 74, FY + 224),
                  (FX + 76, FY + 132), (FX + 60, FY + 82), (FX + 20, FY + 64), (FX + 2, FY + 80)])
for pts, w in (([(FX + 44, FY + 20), (FX + 62, FY + 48), (FX + 66, FY + 84)], (13, 10, 5)),
               ([(FX + 46, FY + 22), (FX + 76, FY + 36), (FX + 90, FY + 66)], (12, 9, 4))):
    t_ = Trazo(pts, w)
    lz.aguada(t_, CARMIN, dens=0.85, tapa=1, irreg=0.3, borde=0.7, sombra=(-3, -3))
    lz.contorno(t_, '#7a1f30', grosor=0.6, presion=0.5)
lz.aguada(Elipse(FX + 46, FY + 20, 10, 9), '#b0304a', dens=0.9, tapa=1, irreg=0.2)
lz.contorno(Elipse(FX + 46, FY + 20, 10, 9), '#7a1f30', grosor=0.6, presion=0.5)
cabeza_album(lz, FX, FY, FR, piel='#c98a5e', peinado='pañuelo', pelo='#3a2418', pelo2=CARMIN, giro=0.4, inclina=6,
             ojos='abiertos', boca='risa', mira=(1, 0.4), pendiente=ORO, cuello=True, base=(FX + 2, FY + 74), ancho_base=118)
lz.aguada(blusa, '#e9a83a', dens=0.95, tapa=1, borde=0.6, gran=0.35, sombra=(-14, -8, '#b8701e', 0.6),
          toques=[(FX + 56, FY + 160, 46, '#c4802e', 0.6), (FX - 30, FY + 100, 34, '#f6d27a', 0.6)])
lz.contorno(blusa, '#8a5a22', grosor=0.9, presion=0.55, cortes=0.25)
lz.lapiz([bezier((FX - 40, FY + 120), (FX - 30, FY + 160), (FX - 36, FY + 200)), bezier((FX + 44, FY + 116), (FX + 52, FY + 160), (FX + 46, FY + 204))],
         '#a8702a', grosor=0.7, presion=0.45)
lz.lapiz([spline([(FX - 22, FY + 62), (FX + 2, FY + 94), (FX + 22, FY + 64)])], '#8a5a22', grosor=0.9, presion=0.6)
mandil = Poligono([(FX - 46, FY + 140), (FX + 50, FY + 142), (FX + 54, FY + 224), (FX - 50, FY + 224)])
lz.aguada(mandil, SALVIA, dens=0.75, tapa=1, borde=0.6, gran=0.35, sombra=(-10, -6), toques=[(FX + 30, FY + 200, 30, '#5f8f63', 0.5)])
lz.contorno(mandil, '#4f6f45', grosor=0.8, presion=0.5)
lz.lapiz([[(FX - 46, FY + 142), (FX - 30, FY + 104), (FX - 22, FY + 66)], [(FX + 50, FY + 144), (FX + 34, FY + 104), (FX + 22, FY + 66)]],
         '#4f6f45', grosor=1.6, presion=0.6)
for k in range(12):
    florecilla(FX - 36 + (k % 6) * 15, FY + 164 + (k // 6) * 26, 4.4, ['#fbf3e2', '#f6d27a', '#f6b6b0'][k % 3], centro=CARMIN)

# ------------------------------------------------------------------ the table
mesa = Poligono(TA, suave=False)
lz.aguada(mesa, '#c99a6a', dens=0.75, sombra=(-10, -6), tapa=1, irreg=0.3, borde=0.6, gran=0.45,
          toques=[(1150, 500, 140, '#b07a4a', 0.5), (720, 580, 100, '#e0b888', 0.5)])
lz.lapiz([[(700 - k * 6, 530 + k * 12), (1252 + k * 4, 488 + k * 9)] for k in range(1, 7)], '#9a6a3a', grosor=0.6,
         presion=0.25, temblor=0.9)
lz.contorno(mesa, LP, grosor=0.85, presion=0.5, cortes=0.2)

# the tablecloth hangs in folds, and it IS the countryside the food comes from (day 24): a patchwork of
# fields sewn from scraps of cloth, each field a different scrap, the seams stitched by hand
xs = np.linspace(D[0], C[0], 90)
hem = [(x, tela_y(x, 1.0)) for x in xs]
mantel = Poligono([tuple(D), tuple(C)] + hem[::-1], suave=False)
lz.aguada(mantel, '#efe0b0', dens=0.5, tapa=1, borde=0.5, gran=0.4)
X0, X1 = D[0], C[0]
ORO_T = ['#e2b448', '#d9a03a', '#e8c25a', '#cf9a3a', '#e6b850', '#d8a848', '#e8c25a', '#d9a03a']
MED_T = ['#6fa452', '#c9773a', '#86b06a', '#9cbf6a', '#c9773a', '#7fae5e', '#b8803e', '#86b06a']
PRA_T = ['#a9c98a', '#b8d090', '#98c0a0', '#a9c98a', '#b0cc8c', '#98c0a0', '#b8d090', '#a9c98a']
cortes_t = []
for k in range(8):
    a_ = X0 + k * PL
    b_ = a_ + PL
    t1_, t2_ = 0.22 + 0.1 * ((k * 37) % 10) / 10, 0.5 + 0.12 * ((k * 53) % 10) / 10
    cortes_t.append((a_, b_, t1_, t2_))
    xm = (a_ + b_) / 2
    for (t0, t1, col) in ((0.0, t1_, ORO_T[k]), (t1_, t2_, MED_T[k]), (t2_, 1.0, PRA_T[k])):
        lz.aguada(parche(a_, b_, t0, t1) & mantel, col, dens=0.84, irreg=0.5, borde=0.75, gran=0.6, var=0.5,
                  toques=[(xm, tela_y(xm, (t0 + t1) / 2), PL * 0.4, mezcla(col, '#ffffff', 0.3), 0.55)])
    for xx in np.arange(a_ + 5, b_ - 3, 6):   # wheat strokes
        y = tela_y(xx, rng.uniform(0.05, t1_ - 0.04))
        lz.lapiz([[(xx, y + 5), (xx + 2, y - 5)]], '#a8702a', grosor=0.55, presion=0.4)
    if MED_T[k] in ('#c9773a', '#b8803e'):     # ploughed furrows
        lz.lapiz([[(xx, tela_y(xx, t2_ - 0.03)), (xx - 6, tela_y(xx - 6, t1_ + 0.03))] for xx in np.arange(a_ + 8, b_, 9)], '#8a4a22',
                 grosor=0.65, presion=0.45)
    else:                                         # rows of young plants
        brotes = []
        for xx in np.arange(a_ + 8, b_ - 4, 10):
            for t in np.arange(t1_ + 0.06, t2_ - 0.02, 0.08):
                y = tela_y(xx, t)
                brotes += [[(xx, y + 2), (xx - 2.5, y - 2.5)], [(xx, y + 2), (xx + 2.5, y - 2.5)]]
        lz.lapiz(brotes, '#2f6a32', grosor=0.6, presion=0.6)
# stitched seams: across each panel, and down every fold valley
for (a_, b_, t1_, t2_) in cortes_t:
    costura(a_ + 2, b_ - 2, t1_, '#f6ead6')
    costura(a_ + 2, b_ - 2, t2_, '#f6ead6')
    if a_ > X0 + 1:
        costura_v(a_, 0.04, 0.98, '#f6ead6')
# the drape: each panel rounds out -- shadow toward the valleys, light on the ridge
for k in range(8):
    a_ = X0 + k * PL
    b_ = a_ + PL
    for (e, c_) in ((a_, a_ + PL * 0.45), (b_, b_ - PL * 0.45)):
        lz.aguada(parche(min(e, c_), max(e, c_), 0.12, 1.0) & mantel, '#5a3a22', dens=0.26, suave=4, desvanece=(e, 0, c_, 0))
    xr = (a_ + b_) / 2
    lz.levanta(Trazo([(xr, tela_y(xr, 0.25)), (xr, tela_y(xr, 0.97))], (5, 12)) & mantel, 0.16, suave=5)
    lz.lapiz([[(a_ + 1, tela_y(a_, 0.3)), (a_ + 2, tela_y(a_, 0.96))]], '#6a4a2a', grosor=0.6, presion=0.35, cortes=0.4)
# the river of teal winding through the meadows
rio = Trazo([(664, tela_y(664, 0.76)), (760, tela_y(760, 0.68)), (860, tela_y(860, 0.8)), (960, tela_y(960, 0.7)),
             (1080, tela_y(1080, 0.82)), (1150, tela_y(1150, 0.74)), (1274, tela_y(1274, 0.78))], (9, 11, 10, 12, 10, 12, 7))
lz.aguada(rio & mantel, '#3f96a2', dens=0.9, tapa=0.6, irreg=0.4, borde=0.8, toques=[(960, 690, 50, '#2f7f8a', 0.5)])
for x in (720, 850, 1000):
    lz.gouache(Trazo([(x, tela_y(x, 0.74)), (x + 10, tela_y(x + 10, 0.74))], (1.2, 1.2)), '#e8f6f4', alfa=0.8, irreg=0)
# orchard trees, the farmhouse, sheep: the place the food comes from
for (x, t, r_, col) in ((704, 0.4, 14, VERDE), (732, 0.37, 11, '#86a86c'), (1200, 0.4, 13, VERDE), (1232, 0.38, 10, '#3f7a6a'),
                        (1110, 0.66, 10, VERDE)):
    y = tela_y(x, t)
    lz.lapiz([[(x, y + r_ * 0.6), (x, y + r_ * 1.6)]], '#6e4c3c', grosor=1.1, presion=0.7)
    lz.aguada(Circulos([(x, y, r_), (x - r_ * 0.55, y + 2, r_ * 0.7), (x + r_ * 0.55, y + 2, r_ * 0.7)]), col, dens=0.9,
              tapa=0.8, irreg=0.4, borde=0.7)
    for j in range(8):
        lz.aguada(Elipse(x + rng.uniform(-r_ * 0.8, r_ * 0.8), y + rng.uniform(-r_ * 0.6, r_ * 0.3), 1.2), [CORAL, ORO][j % 2], dens=0.85,
                  irreg=0.1)
hx, hy = 1016, tela_y(1016, 0.42)
casa = Poligono([(hx - 18, hy + 12), (hx + 18, hy + 12), (hx + 18, hy - 10), (hx - 18, hy - 10)], suave=False)
lz.aguada(casa, '#fbf3e4', dens=0.6, tapa=1, irreg=0.2)
lz.aguada(Poligono([(hx - 24, hy - 8), (hx, hy - 28), (hx + 24, hy - 8)], suave=False), CARMIN, dens=0.85, tapa=1, irreg=0.2)
lz.aguada(Poligono([(hx - 4, hy + 12), (hx + 5, hy + 12), (hx + 5, hy), (hx - 4, hy)], suave=False), '#6e4c3c', dens=0.8, irreg=0.1)
lz.contorno(casa, LP, grosor=0.6, presion=0.5)
lz.aguada(Elipse(hx + 11, hy - 1, 3), '#f2c14e', dens=0.9, irreg=0.1)
lz.luz((hx + 11, hy - 1, 6), '#ffe2a0', fuerza=0.45)
for (x, t) in ((800, 0.86), (822, 0.88), (1070, 0.68)):
    y = tela_y(x, t)
    lz.aguada(Elipse(x, y, 6, 4), '#fbf6ec', dens=0.6, tapa=1, irreg=0.2)
    lz.lapiz([arco(x, y, 6, 4, 0, 360, 18)], LP, grosor=0.5, presion=0.5)
    lz.aguada(Elipse(x + 6, y - 1, 2), '#3a2a24', dens=0.9, irreg=0.1)
lz.contorno(mantel, '#8a6a3a', grosor=0.9, presion=0.55, cortes=0.25)
for x in np.arange(X0 + 10, X1 - 4, 16):
    lz.aguada(Elipse(x, tela_y(x, 1.0) - 6, 3.2), [CORAL, TEAL, ORO][int(x / 16) % 3], dens=0.88, irreg=0.2)
# the river does not stop at the hem: it pours out of the cloth into a pool on the ground
wx = 1150
wy0 = tela_y(wx, 0.74)
cascada = Trazo([(wx - 4, wy0), (wx + 4, tela_y(wx, 1.0) + 2), (wx + 22, 742), (wx + 34, 768)], (13, 15, 12, 16))
charca = Elipse(wx + 40, 776, 72, 12)
lz.aguada(charca, '#3f96a2', dens=0.9, tapa=1, irreg=0.6, borde=0.8, gran=0.4, toques=[(wx + 60, 776, 30, '#2f7f8a', 0.6)])
lz.contorno(charca, '#2f6a72', grosor=0.7, presion=0.5, cortes=0.4)
lz.aguada(cascada, '#3f96a2', dens=0.9, tapa=1, irreg=0.4, borde=0.8, toques=[(wx + 6, 740, 12, '#2f7f8a', 0.5)])
for k in range(4):
    lz.gouache(Trazo([(wx - 6 + k * 3.5, wy0 + 12), (wx + 2 + k * 3, tela_y(wx, 1.0)), (wx + 16 + k * 3, 736 + k * 4)], (1.2, 1.0, 0.7)),
               '#eef8f6', alfa=0.8, irreg=0)
for k in range(9):
    a = math.radians(180 + k * 20)
    lz.gouache(Elipse(wx + 34 + math.cos(a) * 16, 768 + math.sin(a) * 7, 1.4), '#eef8f6', alfa=0.85, irreg=0)
lz.lapiz([arco(wx + 34, 774, 40, 6, 200, 340, 20), arco(wx + 50, 776, 22, 3, 190, 350, 14)], '#e8f6f4', grosor=0.9, presion=0.7)
pececillo(lz, wx + 70, 748, 7, -40, CORAL, gouache=False)
pececillo(lz, wx + 92, 760, 5.5, 30, ORO, gouache=False)
lz.lapiz([arco(wx + 80, 760, 16, 14, 200, 330, 12)], '#7fb8b8', grosor=0.6, presion=0.4, cortes=0.4)
lado = Poligono([(1278, 548), (1250, 478), (1254, 560), (1272, 694)], suave=False)
lz.aguada(lado, '#c9b07a', dens=0.6, tapa=1, irreg=0.3, toques=[(1262, 620, 30, '#a8905a', 0.5)])
lz.contorno(lado, '#8a6a3a', grosor=0.7, presion=0.45)
sombra(lz, 980, 760, 340, 20, dens=0.28)

# ------------------------------------------------------------------ goods on the table (back to front)
pan(868, 506, 32, 14, -4)
calabaza(1112, 476, 28)
calabaza(1156, 490, 19, '#f0a23e')
caja = Poligono([(1036, 500), (1112, 494), (1118, 528), (1042, 534)], suave=False)
for (x, y) in ((1048, 492), (1068, 488), (1088, 486), (1104, 484), (1056, 502), (1078, 498), (1098, 496)):
    tomate(x, y, 11)
lz.aguada(caja, '#c99a5a', dens=0.7, tapa=1, irreg=0.2)
lz.lapiz([[(1038, 514), (1116, 509)]], '#7a5a30', grosor=0.7, presion=0.5)
lz.contorno(caja, '#6a4a2a', grosor=0.8, presion=0.55)
# a bowl mended with gold (kintsugi): repair instead of replace (day 19)
bx, by = 860, 566
cuenco = Poligono(np.vstack([arco(bx, by, 32, 9, 180, 360, 16), arco(bx, by, 32, 26, 0, 180, 20)]), suave=False)
lz.aguada(cuenco, '#3f6f8c', dens=0.85, tapa=1, borde=0.7, gran=0.3, toques=[(bx - 12, by + 8, 14, '#7fa8c8', 0.6)])
lz.aguada(Elipse(bx, by, 32, 9), '#efe6d2', dens=0.5, tapa=1, irreg=0.2)
lz.contorno(cuenco, '#24405a', grosor=0.8, presion=0.55)
for k in range(8):
    a = math.radians(20 + k * 20)
    lz.gouache(Elipse(bx + math.cos(a) * 26, by + 6 + math.sin(a) * 12, 2.2), '#f6ead6', alfa=0.8, irreg=0)
grieta = [spline([(bx - 8, by + 3), (bx - 3, by + 11), (bx - 10, by + 18), (bx - 6, by + 25)]),
          spline([(bx + 15, by + 5), (bx + 19, by + 13), (bx + 13, by + 21)])]
lz.lapiz(grieta, '#b8862a', grosor=2.4, presion=0.9, temblor=0.2)
lz.lapiz(grieta, '#ffe28a', grosor=1.0, presion=0.8, temblor=0.2)
lz.luz((bx - 4, by + 14, 12), '#ffe2a0', fuerza=0.4)
# eggs in straw, honey jars that glow
for (x, y) in ((940, 552), (958, 546), (974, 554), (954, 560)):
    lz.aguada(Elipse(x, y, 9, 11, 10), '#f3e2c8', dens=0.6, tapa=1, irreg=0.2, borde=0.7, toques=[(x + 3, y + 3, 6, '#d9b896', 0.6)])
    lz.contorno(Elipse(x, y, 9, 11, 10), '#9a7a5a', grosor=0.6, presion=0.45)
lz.lapiz([arco(957, 564, 28, 6, 0, 180, 16), arco(957, 566, 30, 7, -10, 190, 16)], '#c9a24a', grosor=0.8, presion=0.6, temblor=0.6)
tarro_miel(1010, 556, 13, 17)
tarro_miel(1038, 566, 11, 15)
cesta(1110, 552, 36, 22, '#b8864a', asa=False)
for (x, y, f) in ((1088, 530, 'm'), (1110, 524, 'p'), (1132, 530, 'm'), (1100, 540, 'm'), (1122, 540, 'm')):
    (manzana if f == 'm' else pera)(x, y, 11)
cesta(1110, 552, 36, 22, '#b8864a', asa=False)
# a small balance at the front corner (fair trade, price per kilo -- days 23 and 25)
BX, BY = 742, 508
col_b = '#b8862a'
pie_b = Trazo([(BX, 588), (BX, BY)], (4.5, 3.5))
lz.aguada(pie_b, col_b, dens=0.88, tapa=1, irreg=0.2)
lz.aguada(Elipse(BX, 588, 12, 4), col_b, dens=0.88, tapa=1, irreg=0.2)
viga = Trazo([(BX - 38, BY), (BX + 38, BY)], (3, 3), suave=False)
lz.aguada(viga, col_b, dens=0.88, tapa=1, irreg=0.2)
lz.contorno(viga | pie_b, '#6a4a1a', grosor=0.6, presion=0.5)
lz.aguada(Elipse(BX, BY - 5, 4.5), col_b, dens=0.9, tapa=1, irreg=0.2)
for sx in (-1, 1):
    px = BX + sx * 38
    lz.lapiz([[(px, BY), (px - 12, BY + 40)], [(px, BY), (px + 12, BY + 40)]], '#6a4a1a', grosor=0.5, presion=0.6)
    plato = Poligono(np.vstack([arco(px, BY + 40, 14, 3, 180, 360, 12), arco(px, BY + 40, 14, 6, 0, 180, 12)]), suave=False)
    lz.aguada(plato, col_b, dens=0.88, tapa=1, irreg=0.2, toques=[(px - 4, BY + 41, 6, '#f0c25e', 0.6)])
    lz.contorno(plato, '#6a4a1a', grosor=0.5, presion=0.5)
for (dx, dy) in ((-5, -4), (0, -4), (5, -4), (-2.5, -8), (2.5, -8), (0, -12)):
    lz.aguada(Elipse(BX - 38 + dx, BY + 40 + dy, 3.4), '#7a4a8a', dens=0.88, tapa=1, irreg=0.2, borde=0.7)
manzana(BX + 38, BY + 30, 8, '#e2553e')

# ------------------------------------------------------------------ the farmer's two arms: carrots for the mother, an apple for the boy
# left arm (image left): the bunch of carrots for the mother
manga(lz, [(FX - 56, FY + 88), (FX - 92, FY + 140), (FX - 124, FY + 132)], (28, 24, 21), '#e9b04a', pliegues=2,
      toques=[(FX - 90, FY + 140, 22, '#c4802e', 0.5)])
fore = Trazo([(FX - 122, FY + 132), (FX - 158, FY + 120), (FX - 186, FY + 106)], (19, 17, 14))
lz.aguada(fore, '#c98a5e', dens=0.6, tapa=1, irreg=0.3, toques=[(FX - 150, FY + 126, 12, '#a06a42', 0.5)], sombra=(-3, -3))
lz.contorno(fore, '#6a3a26', grosor=0.7, presion=0.5)
lz.aguada(Elipse(FX - 124, FY + 132, 9, 14, 20), '#f0c870', dens=0.75, tapa=1, irreg=0.2)
lz.contorno(Elipse(FX - 124, FY + 132, 9, 14, 20), '#8a5a22', grosor=0.6, presion=0.5)
CX, CY = FX - 214, FY + 98
for k in range(11):
    a = math.radians(-65 - k * 7)
    ramita(lz, [(CX + 8, CY - 2), (CX + 8 + math.cos(a) * 24, CY - 2 + math.sin(a) * 24),
                (CX + 8 + math.cos(a) * 44 + 6, CY - 2 + math.sin(a) * 50)], '#6f9e4a', hojas=6, largo=7, tallo='#4f6f45')
for k, (ang, L) in enumerate(((-205, 56), (-218, 62), (-196, 50), (-228, 48))):
    a = math.radians(ang)
    tip = (CX + math.cos(a) * L, CY - math.sin(a) * L * 0.2 + 40 + k * 4)
    z = Trazo([(CX + 6, CY + 4 + k * 3), tip], (10, 2))
    lz.aguada(z, '#ec7a2a', dens=0.9, tapa=1, irreg=0.3, borde=0.7, toques=[(CX - 10, CY + 14, 12, '#b84a1a', 0.5)])
    lz.contorno(z, '#9a3a12', grosor=0.6, presion=0.45)
    for j in range(3):
        t = 0.3 + j * 0.2
        px = CX + (tip[0] - CX) * t
        py = CY + (tip[1] - CY) * t
        lz.lapiz([[(px - 2, py - 3), (px + 2, py + 1)]], '#9a3a12', grosor=0.5, presion=0.5)
    lz.aguada(Elipse(tip[0], tip[1], 2.8, 2.2), '#7a5a3a', dens=0.7, irreg=0.5)
mano_dedos(lz, FX - 186, FY + 106, 172, 38, '#c98a5e', curl=0.7, abre=0.4, lado=-1, pulgar=0.3)
# right arm (image right): reaches over the table and holds out an apple to the boy, on her open palm
manga(lz, [(FX + 58, FY + 88), (FX + 84, FY + 140), (FX + 114, FY + 160)], (28, 25, 22), '#e9b04a', pliegues=2,
      toques=[(FX + 84, FY + 140, 20, '#c4802e', 0.5)])
fa2 = Trazo([(FX + 110, FY + 158), (FX + 148, FY + 142), (FX + 180, FY + 120)], (19, 17, 14))
lz.aguada(fa2, '#c98a5e', dens=0.6, tapa=1, irreg=0.3, sombra=(-4, -3))
lz.contorno(fa2, '#6a3a26', grosor=0.7, presion=0.5)
lz.aguada(Elipse(FX + 112, FY + 158, 9, 14, 30), '#f0c870', dens=0.78, tapa=1, irreg=0.2)
lz.contorno(Elipse(FX + 112, FY + 158, 9, 14, 30), '#8a5a22', grosor=0.6, presion=0.5)
mano_dedos(lz, FX + 180, FY + 120, -30, 38, '#c98a5e', curl=0.35, abre=0.5, lado=-1, pulgar=0.7)
manzana(FX + 206, FY + 96, 15, '#e2553e')

# ------------------------------------------------------------------ the boy on a crate, offering the drawing he made
cajon = Poligono([(1296, 724), (1380, 720), (1384, 790), (1300, 794)], suave=False)
lz.aguada(Poligono([(1296, 724), (1380, 720), (1372, 710), (1304, 714)], suave=False), '#8a5a32', dens=0.75, tapa=1, irreg=0.2)
lz.aguada(cajon, '#c99a5a', dens=0.8, tapa=1, irreg=0.3, borde=0.7, sombra=(-5, -4))
lz.lapiz([[(1298, 746 + k * 22), (1382, 744 + k * 22)] for k in range(2)], '#7a5a30', grosor=0.8, presion=0.55)
lz.contorno(cajon, '#6a4a2a', grosor=0.8, presion=0.55)
sombra(lz, 1342, 796, 60, 9, dens=0.3)
NX, NY, NR = 1326, 550, 30
PIEL_N = '#7a4a32'
for (pts) in ([(1324, 654), (1312, 686), (1320, 716)], [(1348, 654), (1356, 688), (1358, 716)]):
    manga(lz, pts, (18, 15, 11), PIEL_N, pliegues=0, dens=0.6, lapiz='#4a2a1a')
    k_ = pts[1]
    lz.lapiz([arco(k_[0] + 2, k_[1], 5, 3, 200, 340, 8)], '#4a2a1a', grosor=0.6, presion=0.5)     # knee
lz.aguada(Poligono([(1314, 640), (1362, 640), (1368, 670), (1342, 672), (1336, 664), (1330, 672), (1306, 670)]), '#6e4c3c', dens=0.85, tapa=1, irreg=0.3, sombra=(-4, -3))
lz.contorno(Poligono([(1314, 640), (1362, 640), (1368, 670), (1342, 672), (1336, 664), (1330, 672), (1306, 670)]), '#3a2418', grosor=0.7, presion=0.5)
lz.lapiz([[(1322, 646), (1326, 660)], [(1350, 646), (1354, 662)]], '#3a2418', grosor=0.6, presion=0.45)
for (x, sd) in ((1318, -1), (1362, 1)):
    z = Elipse(x + sd * 3, 720, 12, 5.5)
    lz.aguada(z, '#3f6f8c', dens=0.9, tapa=1, irreg=0.2)
    lz.contorno(z, '#24405a', grosor=0.6, presion=0.5)
cabeza_album(lz, NX, NY, NR, piel=PIEL_N, peinado='rizado', pelo='#1e140f', giro=-0.5, inclina=-8, ojos='abiertos', boca='risa',
             mira=(-1, -0.4), base=(1332, 592), ancho_base=48)
camisa_n = Poligono([(1308, 588), (1354, 586), (1368, 610), (1366, 646), (1338, 652), (1312, 648), (1302, 612)])
lz.aguada(camisa_n, '#5f9a6a', dens=0.95, tapa=1, borde=0.7, gran=0.4, sombra=(-8, -6, '#3f6a4a', 0.6))
lz.contorno(camisa_n, '#2f5a3a', grosor=0.8, presion=0.55)
for k in range(4):
    lz.lapiz([[(1304, 600 + k * 12), (1368, 598 + k * 12)]], '#f6ead6', grosor=1.2, presion=0.6)   # stripes
lz.lapiz([bezier((1316, 612), (1326, 626), (1322, 646)), bezier((1352, 608), (1346, 628), (1354, 644))], '#2f5a3a', grosor=0.7, presion=0.45)
manga(lz, [(1360, 596), (1378, 622), (1376, 650)], (14, 12, 11), '#5f9a6a', pliegues=1)
mano_dedos(lz, 1376, 650, 96, 22, PIEL_N, curl=0.5, abre=0.5, lado=1, pulgar=0.4)
lz.lapiz([spline([(1322, 590), (1338, 600), (1354, 590)])], '#2f5a3a', grosor=1.4, presion=0.7)
# the drawing: crayon sun, hills, a house and two people holding hands (no letters)
papel = Poligono([(1196, 470), (1262, 478), (1258, 524), (1192, 516)], suave=False)
lz.aguada(papel, '#fbf6ea', dens=0.25, tapa=1, irreg=0.1, borde=0.3)
lz.contorno(papel, '#9a8a7a', grosor=0.7, presion=0.55, cortes=0.05)
for k in range(6):   # a big crayon flower, a bird, the grass: no stick people
    a = math.radians(k * 60)
    lz.aguada(Elipse(1218 + math.cos(a) * 7, 492 + math.sin(a) * 7, 5.5, 3.6, k * 60), '#e8735e', dens=0.75, irreg=0.3)
lz.aguada(Elipse(1218, 492, 3.4), '#f0c25e', dens=0.9, irreg=0.2)
lz.lapiz([bezier((1218, 500), (1216, 508), (1220, 518))], '#4f8a3a', grosor=1.1, presion=0.8)
lz.aguada(Elipse(1226, 510, 5, 2.4, -30), '#6fa452', dens=0.8, irreg=0.2)
lz.lapiz([[(1196, 516), (1258, 520)]], '#86b06a', grosor=1.4, presion=0.7, temblor=0.6)
lz.lapiz([[(1240, 488), (1246, 484), (1250, 488)], [(1250, 488), (1254, 484), (1258, 488)]], '#3f6f8c', grosor=0.9, presion=0.8)
# his raised arm holds the drawing by its corner
manga(lz, [(1310, 598), (1294, 568), (1266, 522)], (14, 12, 11), '#5f9a6a', pliegues=2)
mano_dedos(lz, 1266, 522, -128, 24, PIEL_N, curl=0.6, abre=0.4, lado=-1, pulgar=0.6)

# ------------------------------------------------------------------ the mother: a young woman stepping in, paying
PIEL_B = '#9b6141'
sombra(lz, 494, 792, 100, 14, dens=0.32)
HX, HY, BR = 476, 300, 48
for (pts, w) in (([(460, 690), (454, 744), (450, 780)], (22, 18, 13)), ([(500, 690), (516, 734), (530, 768)], (22, 18, 13))):
    f = Trazo(pts, w)
    lz.aguada(f, PIEL_B, dens=0.6, tapa=1, irreg=0.3, toques=[(pts[1][0], pts[1][1], 14, '#7a4a32', 0.4)], sombra=(-3, -2))
    lz.contorno(f, '#5a3020', grosor=0.6, presion=0.45)
for (x, y, a) in ((444, 788, 178), (542, 776, 20)):
    z = Poligono([(x - 20, y), (x - 10, y - 9), (x + 14, y - 8), (x + 22, y + 2), (x + 8, y + 7), (x - 16, y + 6)])
    if a > 90:
        z = Poligono([(2 * x - px, py) for (px, py) in z.p[::3]])
    lz.aguada(z, CARMIN, dens=0.9, tapa=1, irreg=0.3, toques=[(x, y - 4, 8, '#e05a6a', 0.5)])
    lz.contorno(z, '#7a1f30', grosor=0.7, presion=0.5)
cuerpo_v = Poligono([(448, 376), (430, 394), (434, 440), (446, 494), (512, 496), (530, 442), (526, 396), (506, 376), (490, 386),
                     (476, 392), (462, 386)], suave=True)
falda = Poligono([(446, 488), (512, 488), (540, 540), (586, 624), (604, 690), (580, 708), (530, 714), (480, 718), (430, 712),
                  (392, 700), (396, 640), (420, 560)])
lz.aguada(falda, TEAL, dens=1.0, tapa=1, borde=0.75, gran=0.45, sombra=(-16, -10, TEAL_OSC, 0.6),
          toques=[(420, 680, 60, TEAL_OSC, 0.65), (520, 560, 40, '#6fb1ad', 0.6), (580, 680, 40, '#2f6467', 0.5)])
lz.contorno(falda, '#24504e', grosor=0.95, presion=0.6, cortes=0.15)
lz.lapiz([bezier((470, 520), (462, 600), (450, 660), (446, 714)), bezier((492, 520), (514, 600), (548, 660), (566, 706)),
          bezier((458, 524), (430, 600), (414, 650), (404, 698)), bezier((500, 512), (540, 570), (574, 630), (594, 690))],
         '#24504e', grosor=0.85, presion=0.45, temblor=0.4)
cabeza_album(lz, HX, HY, BR, piel=PIEL_B, peinado='largo', pelo='#24160f', giro=0.45, inclina=8, ojos='abiertos',
             boca='sonrisa', mira=(1, -0.5), adorno=CORAL, pendiente=ORO,
             base=(478, 388), ancho_base=96)
lz.aguada(cuerpo_v, TEAL, dens=1.0, tapa=1, borde=0.7, gran=0.4, sombra=(-10, -6, TEAL_OSC, 0.6),
          toques=[(510, 470, 24, TEAL_OSC, 0.5), (450, 400, 20, '#6fb1ad', 0.5)])
lz.contorno(cuerpo_v, '#24504e', grosor=0.9, presion=0.55)
# a round neckline with a gold-stitched edge and a fine necklace on the skin
lz.lapiz([spline([(448, 378), (462, 388), (476, 393), (490, 388), (506, 378)])], ORO, grosor=1.6, presion=0.75)
lz.lapiz([spline([(458, 372), (470, 384), (482, 386), (494, 374)])], '#b8862a', grosor=0.6, presion=0.7)
lz.aguada(Elipse(476, 386, 2.4), ORO, dens=0.95, irreg=0.1)
for f, n in ((falda, 110), (cuerpo_v, 22)):
    for (x, y) in puntos_dentro(f, n, 77 + n, margen=4):
        florecilla(x, y, rng.uniform(2.6, 3.6), rng.choice(['#fbf3e2', '#f6d27a', '#f6b6b0', '#fbf3e2']))
cinta = Trazo([(444, 492), (478, 498), (514, 492)], (10, 11, 10))
lz.aguada(cinta, ORO, dens=0.88, tapa=1, irreg=0.2)
lz.contorno(cinta, '#9a6a1a', grosor=0.6, presion=0.5)
# her bag of cloth (reused) on the back arm, carrot tops and bread peeking out
manga(lz, [(432, 398), (410, 462), (402, 514)], (34, 29, 25), TEAL, pliegues=2, toques=[(414, 466, 28, TEAL_OSC, 0.5)])
for k in range(5):
    a = math.radians(-100 + k * 12)
    ramita(lz, [(396, 524), (396 + math.cos(a) * 20, 524 + math.sin(a) * 26)], '#6f9e4a', hojas=4, largo=6)
pan(414, 514, 26, 7, -60)
bolsa = Poligono([(368, 522), (428, 520), (436, 594), (362, 598)])
lz.aguada(bolsa, '#efe2c4', dens=0.65, tapa=1, irreg=0.4, borde=0.7, gran=0.5, sombra=(-5, -4))
for k in range(5):
    lz.lapiz([[(370 + k * 14, 524), (366 + k * 16, 596)]], CORAL, grosor=1.6, presion=0.6)
lz.contorno(bolsa, '#8a7a5a', grosor=0.8, presion=0.55)
mano_dedos(lz, 402, 512, 95, 36, PIEL_B, curl=0.7, abre=0.35, lado=-1, pulgar=0.3)
manga(lz, [(516, 398), (566, 444), (604, 446)], (32, 27, 23), TEAL, pliegues=2, toques=[(566, 444, 22, TEAL_OSC, 0.5)])
fore2 = Trazo([(598, 446), (630, 432), (654, 414)], (19, 17, 14))
lz.aguada(fore2, PIEL_B, dens=0.6, tapa=1, irreg=0.3, toques=[(630, 440, 10, '#7a4a32', 0.4)], sombra=(-3, -3))
lz.contorno(fore2, '#5a3020', grosor=0.7, presion=0.5)
lz.aguada(Elipse(600, 446, 10, 16, 30), '#6fb1ad', dens=0.78, tapa=1, irreg=0.2)
lz.contorno(Elipse(600, 446, 10, 16, 30), '#24504e', grosor=0.6, presion=0.5)

# ------------------------------------------------------------------ the coin, and the bird that is leaving it
MX, MY, MR = 686, 384, 30


def pajaro_perfil(x, y, s, ang, col, flip=True):
    """A bird in profile, wings raised. Returns (body union, transform) so a part of it can become gold."""
    f = -1 if flip else 1
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))

    def T(pts):
        return [(x + (px * f * s) * ca - (py * s) * sa, y + (px * f * s) * sa + (py * s) * ca) for px, py in pts]
    ala_lejos = Poligono(T([(-0.05, -0.2), (0.12, -0.8), (0.3, -1.0), (0.38, -0.55), (0.3, -0.2)]))
    cuerpo_b = Poligono(T([(-0.9, 0.05), (-0.5, -0.2), (0.1, -0.28), (0.55, -0.32), (0.85, -0.24), (1.0, -0.06), (0.9, 0.12),
                           (0.5, 0.26), (-0.2, 0.26), (-0.7, 0.18)]))
    cola_b = Poligono(T([(-0.78, 0.0), (-1.55, -0.32), (-1.32, 0.06), (-1.6, 0.38), (-0.78, 0.17)]), suave=False)
    ala = Poligono(T([(-0.42, -0.12), (-0.3, -0.7), (-0.05, -1.32), (0.12, -1.22), (0.24, -1.3), (0.36, -1.05), (0.44, -0.62),
                      (0.36, -0.16)]))
    pico = Poligono(T([(0.97, -0.14), (1.32, -0.06), (0.97, 0.03)]), suave=False)
    lz.aguada(ala_lejos, mezcla(col, '#1a2a3a', 0.3), dens=0.9, tapa=1, irreg=0.3, borde=0.7)
    lz.aguada(cola_b, mezcla(col, '#1a2a3a', 0.2), dens=0.9, tapa=1, irreg=0.3, borde=0.7)
    lz.aguada(cuerpo_b, col, dens=0.92, tapa=1, irreg=0.3, borde=0.75, gran=0.3, sombra=(-3, -4),
              toques=[(*T([(0.3, 0.12)])[0], s * 0.45, '#f6d27a', 0.85), (*T([(0.75, -0.15)])[0], s * 0.25, mezcla(col, '#1a2a3a', 0.3), 0.6)])
    lz.aguada(ala, mezcla(col, '#ffffff', 0.15), dens=0.92, tapa=1, irreg=0.3, borde=0.8, gran=0.3,
              toques=[(*T([(0.1, -1.1)])[0], s * 0.35, mezcla(col, '#1a2a3a', 0.35), 0.7)])
    lz.aguada(pico, '#e7a33e', dens=0.95, tapa=1, irreg=0.2)
    lp = _lapiz_de(col, 0.4)
    lz.contorno(cuerpo_b | cola_b, lp, grosor=0.8, presion=0.6, cortes=0.15, desfase=0.2)
    lz.contorno(ala | ala_lejos, lp, grosor=0.75, presion=0.55, cortes=0.15, desfase=0.2)
    lz.lapiz([T([(-0.25 + k * 0.12, -0.25), (-0.2 + k * 0.14, -1.0 + abs(k - 2) * 0.08)]) for k in range(5)], lp, grosor=0.55,
             presion=0.45)  # feathers
    ex, ey = T([(0.74, -0.13)])[0]
    lz.aguada(Elipse(ex, ey, s * 0.075), '#1a1210', dens=1.3, irreg=0.1)
    lz.gouache(Elipse(ex + s * 0.02, ey - s * 0.02, max(0.5, s * 0.025)), '#fffdf6', alfa=0.95, irreg=0)
    return cuerpo_b | cola_b | ala | ala_lejos, T


def moneda(x, y, r):
    lz.aguada(Elipse(x + 3.5, y + 2.5, r, r), '#9a6a1a', dens=0.9, tapa=1, irreg=0.15)
    f = Elipse(x, y, r, r)
    lz.aguada(f, '#e8b440', dens=0.92, tapa=1, irreg=0.15, borde=0.8, gran=0.3,
              toques=[(x - r * 0.4, y - r * 0.4, r * 0.6, '#ffe28a', 0.8), (x + r * 0.5, y + r * 0.5, r * 0.5, '#b8862a', 0.6)])
    lz.contorno(f, '#7a4a12', grosor=0.9, presion=0.65, cortes=0.05, desfase=0.1)
    lz.lapiz([arco(x, y, r * 0.84, r * 0.84, 0, 360, 40)], '#a0701e', grosor=0.6, presion=0.5)
    for k in range(32):
        a = math.radians(k * 360 / 32)
        lz.aguada(Elipse(x + math.cos(a) * r * 0.92, y + math.sin(a) * r * 0.92, r * 0.035), '#a0701e', dens=0.9, irreg=0.1)
    return f


lz.aguada(Elipse(MX - 10, MY - 14, 110), '#f6d27a', dens=0.3, suave=40, gran=0.05)
lz.aguada(Elipse(MX - 6, MY - 8, 60), '#f2c25a', dens=0.25, suave=20, gran=0.05)
lz.lapiz([[(MX + math.cos(math.radians(a)) * 40, MY + math.sin(math.radians(a)) * 40),
           (MX + math.cos(math.radians(a)) * (58 + 10 * (k % 2)), MY + math.sin(math.radians(a)) * (58 + 10 * (k % 2)))]
          for k, a in enumerate(range(-170, 60, 16))], '#e8b440', grosor=0.9, presion=0.55, cortes=0.3)

f_moneda = moneda(MX, MY, MR)
# the bird: its tail and the back of its body are still gold relief on the coin, its head and its wings already alive
cuerpo_pj, T = pajaro_perfil(MX - 14, MY - 10, 41, 38, '#2f8a88', flip=True)
oro = cuerpo_pj & Elipse(MX, MY, MR * 0.9, MR * 0.9)
lz.aguada(oro, '#dca238', dens=0.95, tapa=1, irreg=0.1, borde=0.95, gran=0.3,
          toques=[(MX - 6, MY - 8, 12, '#ffe28a', 0.8), (MX + 10, MY + 10, 12, '#a8701e', 0.6)])
lz.contorno(oro, '#7a4a12', grosor=0.8, presion=0.75, cortes=0.02, desfase=0.05)
lz.lapiz([T([(-0.85, 0.06), (-0.2, 0.2)]), T([(-1.3, 0.05), (-0.9, 0.08)]), T([(-1.35, 0.25), (-0.9, 0.14)])], '#fff0b8', grosor=0.8,
         presion=0.85)
# where gold turns into feathers: a seam of light and a few golden flecks lifting off
for k in range(16):
    a = math.radians(160 + k * 8)
    px, py = MX + math.cos(a) * MR * 0.88, MY + math.sin(a) * MR * 0.88
    lz.gouache(Elipse(px + rng.normal(0, 2), py + rng.normal(0, 2), rng.uniform(0.6, 1.4)), '#fff3c0', alfa=0.9, irreg=0)
lz.luz((MX - 16, MY - 18, 64), '#ffe08a', fuerza=0.65)
lz.gouache(Elipse(MX + MR * 0.45, MY + MR * 0.5, MR * 0.12, MR * 0.05, -45), '#fffbe8', alfa=0.85, irreg=0)
mano_dedos(lz, 652, 414, -50, 46, PIEL_B, curl=0.55, abre=0.3, lado=1, pulgar=0.95)

# the flock already in flight, smaller and smaller toward the open paper (behind it, in the distance)
for k, (x, y, s_, c) in enumerate(((598, 300, 13, CORAL), (566, 262, 11, ORO), (606, 248, 10, '#ec9fa0'), (546, 222, 8, TEAL))):
    pajaro(lz, x, y, s_, c, ang=-30 + (k % 2) * 8, alas='arriba' if k % 2 == 0 else 'abajo')

# ------------------------------------------------------------------ the daughter, on tiptoe, reaching for the bird with open hands
GX, GY, GR = 286, 612, 31
PIEL_G = '#e6ae88'
sombra(lz, 296, 822, 58, 9, dens=0.3)
for (pts) in ([(278, 748), (274, 784), (280, 812)], [(300, 748), (310, 782), (316, 810)]):
    manga(lz, pts, (15, 12, 9), PIEL_G, pliegues=0, dens=0.6, lapiz='#8a5440')
    lz.lapiz([arco(pts[1][0] + 1, pts[1][1], 4, 2.5, 200, 340, 8)], '#8a5440', grosor=0.55, presion=0.5)     # knee
for (x, y, a) in ((282, 816, 60), (318, 814, 70)):          # on tiptoe: the shoes stand on their points
    z = Elipse(x, y, 11, 5, a)
    lz.aguada(z, '#3f6f8c', dens=0.9, tapa=1, irreg=0.2)
    lz.contorno(z, '#24405a', grosor=0.6, presion=0.5)
cabeza_album(lz, GX, GY, GR, piel=PIEL_G, peinado='rizado', pelo='#5a2e1a', giro=0.35, inclina=14, ojos='abiertos',
             boca='risa', mira=(1, -1), cuello=True, base=(291, 662), ancho_base=46)
vest = Poligono([(270, 660), (312, 656), (322, 686), (344, 748), (294, 760), (244, 750), (260, 690)])
lz.aguada(vest, '#f0a828', dens=0.98, tapa=1, borde=0.75, gran=0.4, sombra=(-8, -6, '#c4702a', 0.6), toques=[(330, 740, 26, '#d9862a', 0.6)])
lz.contorno(vest, '#8a5a12', grosor=0.85, presion=0.55)
lz.lapiz([bezier((284, 694), (276, 720), (266, 752)), bezier((300, 692), (312, 720), (324, 752)), bezier((292, 690), (292, 726), (294, 756))],
         '#9a6a1a', grosor=0.7, presion=0.4)
for k in range(9):
    x = 250 + k * 11
    lz.aguada(Elipse(x, 752 + (x - 250) * 0.01, 2.6), [CARMIN, TEAL][k % 2], dens=0.9, irreg=0.1)
lz.lapiz([spline([(270, 660), (290, 668), (312, 656)])], '#8a5a12', grosor=1.4, presion=0.7)
# both arms stretched up toward the bird, fingers wide open
manga(lz, [(308, 666), (338, 636), (354, 584)], (15, 12, 10), PIEL_G, pliegues=0, lapiz='#8a5440', dens=0.58)
lz.lapiz([arco(340, 636, 4, 3, 300, 420, 8)], '#8a5440', grosor=0.6, presion=0.5)
manga(lz, [(272, 666), (250, 628), (266, 574)], (15, 12, 10), PIEL_G, pliegues=0, lapiz='#8a5440', dens=0.58)
lz.lapiz([arco(248, 628, 4, 3, 120, 240, 8)], '#8a5440', grosor=0.6, presion=0.5)
for pts in ([(306, 664), (318, 646)], [(274, 664), (266, 646)]):
    f = Trazo(pts, (17, 15))
    lz.aguada(f, '#f0a828', dens=0.9, tapa=1, irreg=0.2)
    lz.contorno(f, '#8a5a12', grosor=0.6, presion=0.5)
mano_dedos(lz, 354, 584, -66, 28, PIEL_G, curl=0.05, abre=1.4, lado=1, pulgar=1.0)
mano_dedos(lz, 266, 574, -78, 28, PIEL_G, curl=0.05, abre=1.4, lado=-1, pulgar=1.0)

lz.vineta(margen=30)
lz.guardar(SALIDA)
print('ok', SALIDA)
