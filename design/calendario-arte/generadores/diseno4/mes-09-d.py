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
from extra_m910 import cabeza_album, mano_dedos, manga, sombra, toldo, banderines, carita

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


# ------------------------------------------------------------------ the awning and its poles (back)
for (x0, y0, x1, y1) in ((452, 556, 448, 228), (968, 532, 972, 206)):
    p = Trazo([(x0, y0), (x1, y1)], (7, 6))
    lz.aguada(p, '#9a6a4a', dens=0.7, tapa=1, irreg=0.3, gran=0.3)
    lz.contorno(p, LP, grosor=0.7, presion=0.5)
toldo(lz, (440, 226), (984, 202), (1046, 262), (402, 290), cols=(CORAL, '#f6ead6', TEAL, '#f6ead6'), n=12, fleco=9,
      lapiz='#7a4030', dens=0.82)
lz.luz(Poligono([(440, 226), (984, 202), (1046, 262), (402, 290)]), '#ffd9a0', fuerza=0.12, suave=8)

# little bunting from the awning, swinging out over the paper (no letters)
banderines(lz, (1044, 262), (1110, 330), (1190, 330), (1262, 282), (ORO, CORAL, TEAL, '#ec9fa0', SALVIA), n=8, tam=15)

# ------------------------------------------------------------------ the farmer, behind her table
FX, FY, FR = 812, 366, 38
# torso: an ochre blouse with rolled sleeves, a sage apron on top
sh_l, sh_r = (FX - 50, FY + 70), (FX + 50, FY + 74)
blusa = Poligono([(FX - 18, FY + 56), sh_l, (FX - 64, FY + 118), (FX - 60, FY + 200), (FX + 64, FY + 204),
                  (FX + 66, FY + 120), sh_r, (FX + 18, FY + 58), (FX + 2, FY + 72)])
cabeza_album(lz, FX, FY, FR, piel='#c98a5e', peinado='pañuelo', pelo='#3a2418', pelo2=CARMIN, giro=-0.45, inclina=-6,
             ojos='abiertos', boca='risa', mira=(-1, 0.3), pendiente=ORO, cuello=True)
lz.aguada(blusa, '#e9b04a', dens=0.78, tapa=1, borde=0.6, gran=0.35, flor=1,
          toques=[(FX + 50, FY + 150, 40, '#c4802e', 0.6), (FX - 30, FY + 90, 30, '#f6d27a', 0.6)])
lz.contorno(blusa, '#8a5a22', grosor=0.9, presion=0.55, cortes=0.25)
lz.lapiz([bezier((FX - 30, FY + 120), (FX - 10, FY + 150), (FX - 20, FY + 190)),
          bezier((FX + 30, FY + 110), (FX + 40, FY + 150), (FX + 30, FY + 196))], '#a06a2a', grosor=0.7, presion=0.4)
# neckline over the neck
lz.aguada(Poligono([(FX - 18, FY + 56), (FX + 2, FY + 80), (FX + 18, FY + 58), (FX + 8, FY + 52), (FX - 8, FY + 52)]),
          '#c98a5e', dens=0.6, tapa=1, irreg=0.3)
lz.lapiz([spline([(FX - 20, FY + 56), (FX + 2, FY + 82), (FX + 20, FY + 58)])], '#8a5a22', grosor=0.8, presion=0.6)
mandil = Poligono([(FX - 40, FY + 128), (FX + 44, FY + 130), (FX + 48, FY + 205), (FX - 44, FY + 205)])
lz.aguada(mandil, SALVIA, dens=0.7, tapa=1, borde=0.6, gran=0.35)
lz.contorno(mandil, '#4f6f45', grosor=0.8, presion=0.5)
lz.lapiz([[(FX - 40, FY + 130), (FX - 28, FY + 100), (FX - 20, FY + 62)], [(FX + 44, FY + 132), (FX + 30, FY + 100), (FX + 20, FY + 62)]],
         '#4f6f45', grosor=1.6, presion=0.6)
for k in range(10):
    flor_simple(lz, FX - 32 + (k % 5) * 17, FY + 150 + (k // 5) * 26, 4.5, [CORAL, '#f6ead6', ORO][k % 3], centro=CARMIN)
# her right arm (image right) rests on the basket on the table, painted later; left arm reaches to the buyer later

# ------------------------------------------------------------------ the table
TA = [(440, 548), (986, 520), (1018, 590), (466, 622)]           # top: back-left, back-right, front-right, front-left
mesa = Poligono(TA, suave=False)
lz.aguada(mesa, '#c99a6a', dens=0.6, tapa=1, irreg=0.3, borde=0.6, gran=0.4,
          toques=[(900, 560, 120, '#b07a4a', 0.5), (520, 590, 90, '#e0b888', 0.5)])
lz.lapiz([[(450 + k * 0.0, 560 + k * 8), (990, 532 + k * 8)] for k in range(1, 7)], '#a0764a', grosor=0.6, presion=0.25,
         temblor=0.8)
lz.contorno(mesa, LP, grosor=0.8, presion=0.5, cortes=0.2)

# the tablecloth hangs in front, and it IS the countryside the food comes from (day 24)
mantel_top = bezier((460, 616), (640, 610), (820, 600), (1024, 586), 40)
hem = []
for k, t in enumerate(np.linspace(0, 1, 17)):
    x = 470 + t * 540
    y = 748 - t * 30 + (6 if k % 2 else -2)
    hem.append((x, y))
mantel = Poligono(np.vstack([mantel_top, np.array(hem)[::-1]]), suave=False)
lz.aguada(mantel, '#e9d9a8', dens=0.55, tapa=1, borde=0.5, gran=0.4,
          toques=[(560, 660, 90, '#f2c36a', 0.6), (900, 640, 80, '#a8c47a', 0.6), (740, 700, 90, '#7fb0a8', 0.5)])
# fields: patchwork bands that follow gentle hills
campos = [((460, 640), (1024, 612), (1024, 650), (460, 676), '#d9b24a'),
          ((460, 676), (740, 660), (760, 712), (470, 728), '#8db36a'),
          ((740, 660), (1024, 650), (1012, 700), (760, 712), '#c9773a')]
for (a, b, c, d, col) in campos:
    lz.aguada(Poligono([a, b, c, d], suave=True) & mantel, col, dens=0.55, irreg=0.8, borde=0.6, gran=0.5)
# rows of crops (pencil), furrows that converge
lz.lapiz([bezier((480 + k * 22, 724), (500 + k * 22, 700), (540 + k * 18, 682)) for k in range(11)], '#4f6f45', grosor=0.8,
         presion=0.5, temblor=0.3)
lz.lapiz([[(760 + k * 20, 708 - k * 2), (790 + k * 18, 664 - k * 1)] for k in range(12)], '#8a4a22', grosor=0.7, presion=0.45)
for k in range(26):  # wheat stitches on the gold band
    x = 480 + k * 21
    y = 652 - (x - 460) * 0.05
    lz.lapiz([[(x, y + 8), (x + 2, y - 6)]], '#a0762a', grosor=0.7, presion=0.55)
    lz.aguada(Elipse(x + 2, y - 7, 1.6, 3, 10), '#c08a2a', dens=0.8, irreg=0.2)
# a river of teal winding through the fields
rio = Trazo([(470, 700), (560, 690), (640, 712), (720, 690), (800, 718), (900, 698), (1012, 712)], (7, 9, 8, 10, 8, 9, 6))
lz.aguada(rio & mantel, '#5aa6a8', dens=0.75, tapa=0.6, irreg=0.4, borde=0.8)
for k in range(5):
    pass
# orchard trees, a farmhouse, a windmill on the hills
for (x, y, r_, col) in ((530, 640, 11, VERDE), (556, 636, 9, '#86a86c'), (930, 622, 11, VERDE), (956, 618, 8, '#3f7a6a')):
    lz.lapiz([[(x, y + r_ * 0.6), (x, y + r_ * 1.5)]], '#6e4c3c', grosor=1.0, presion=0.7)
    lz.aguada(Circulos([(x, y, r_), (x - r_ * 0.5, y + 2, r_ * 0.7), (x + r_ * 0.5, y + 2, r_ * 0.7)]), col, dens=0.85,
              tapa=0.8, irreg=0.4, borde=0.7)
    for j in range(3):
        lz.aguada(Elipse(x + rng.uniform(-r_ * 0.6, r_ * 0.6), y + rng.uniform(-r_ * 0.4, r_ * 0.4), 1.6), CORAL, dens=0.9,
                  irreg=0.1)
casa = Poligono([(700, 640), (730, 640), (730, 620), (700, 620)], suave=False)
lz.aguada(casa, '#f6ead6', dens=0.6, tapa=1, irreg=0.2)
lz.aguada(Poligono([(694, 622), (715, 604), (736, 622)], suave=False), CARMIN, dens=0.85, tapa=1, irreg=0.2)
lz.aguada(Poligono([(711, 640), (719, 640), (719, 629), (711, 629)], suave=False), '#6e4c3c', dens=0.8, irreg=0.1)
lz.contorno(casa, LP, grosor=0.6, presion=0.5)
lz.aguada(Elipse(724, 628, 2.4), '#f2c14e', dens=0.9, irreg=0.1)
lz.luz((724, 628, 4), '#ffe2a0', fuerza=0.4)
lz.lapiz([bezier((560, 664), (620, 650), (660, 642), (700, 636))], '#a0764a', grosor=0.8, presion=0.4, cortes=0.5)  # path
# little sheep and cows dots
for (x, y) in ((610, 692), (626, 696), (868, 676)):
    lz.aguada(Elipse(x, y, 5, 3.4), '#fbf6ec', dens=0.6, tapa=1, irreg=0.2)
    lz.lapiz([arco(x, y, 5, 3.4, 0, 360, 18)], LP, grosor=0.5, presion=0.5)
    lz.aguada(Elipse(x + 5, y - 1, 1.6), '#3a2a24', dens=0.9, irreg=0.1)
lz.contorno(mantel, '#8a6a3a', grosor=0.9, presion=0.55, cortes=0.25)
# embroidered border along the hem
for (x, y) in hem[1:-1]:
    lz.aguada(Elipse(x, y - 5, 3.2), [CORAL, TEAL, ORO][int(x) % 3], dens=0.85, irreg=0.2)
# the side of the cloth (right)
lado = Poligono([(1018, 590), (986, 520), (990, 600), (1012, 716)], suave=False)
lz.aguada(lado, '#c9b07a', dens=0.6, tapa=1, irreg=0.3)
lz.contorno(lado, '#8a6a3a', grosor=0.7, presion=0.45)
sombra(lz, 744, 760, 300, 18, dens=0.3)

# ------------------------------------------------------------------ goods on the table (back to front)
# flowers in a jug at the back
for (x, y, c) in ((520, 474, CORAL), (540, 458, ORO), (506, 450, '#ec9fa0'), (554, 482, CARMIN), (530, 434, CORAL)):
    lz.lapiz([[(530, 540), (x, y)]], '#4f6f45', grosor=0.9, presion=0.7)
for (x, y, c) in ((520, 474, CORAL), (540, 458, ORO), (506, 450, '#ec9fa0'), (554, 482, CARMIN), (530, 434, CORAL)):
    flor_grande(lz, x, y, 10, c, petalos=7)
hojita(lz, 516, 500, 18, 200, VERDE, tapa=1)
hojita(lz, 546, 504, 16, -20, VERDE, tapa=1)
jarra = Poligono([(512, 500), (548, 500), (556, 520), (552, 548), (508, 548), (504, 520)])
lz.aguada(jarra, TEAL, dens=0.8, tapa=1, irreg=0.3, borde=0.7, toques=[(520, 516, 14, '#7fc0b8', 0.6)])
lz.contorno(jarra, TEAL_OSC, grosor=0.8, presion=0.55)
lz.lapiz([arco(530, 528, 22, 4, 0, 180, 14)], '#f6ead6', grosor=1.2, presion=0.7)
# bread
pan(612, 530, 30, 13, -4)
pan(642, 544, 26, 11, 8)
# pumpkins and a box of tomatoes
calabaza(700, 520, 26)
calabaza(744, 528, 18, '#f0a23e')
caja = Poligono([(860, 538), (940, 532), (946, 568), (866, 574)], suave=False)
for (x, y) in ((872, 528), (892, 524), (912, 522), (932, 520), (880, 540), (902, 536), (924, 534)):
    tomate(x, y, 11)
lz.aguada(caja, '#c99a5a', dens=0.7, tapa=1, irreg=0.2)
lz.lapiz([[(862, 552), (944, 547)]], '#7a5a30', grosor=0.7, presion=0.5)
lz.contorno(caja, '#6a4a2a', grosor=0.8, presion=0.55)
# honey jars that glow (light from inside)
tarro_miel(578, 576, 13, 17)
tarro_miel(606, 586, 11, 15)

# a bowl mended with gold (kintsugi): repair instead of replace (day 19)
bx, by = 690, 584
cuenco = Poligono(np.vstack([arco(bx, by, 30, 8, 180, 360, 16), arco(bx, by, 30, 24, 0, 180, 20)]), suave=False)
lz.aguada(cuenco, '#3f6f8c', dens=0.8, tapa=1, borde=0.7, gran=0.3, toques=[(bx - 12, by + 8, 14, '#7fa8c8', 0.6)])
lz.aguada(Elipse(bx, by, 30, 8), '#e9e0cc', dens=0.5, tapa=1, irreg=0.2)
lz.contorno(cuenco, '#24405a', grosor=0.8, presion=0.55)
grieta = [spline([(bx - 8, by + 2), (bx - 4, by + 10), (bx - 10, by + 16), (bx - 6, by + 23)]),
          spline([(bx + 14, by + 4), (bx + 18, by + 12), (bx + 12, by + 19)])]
lz.lapiz(grieta, '#b8862a', grosor=2.2, presion=0.9, temblor=0.2)
lz.lapiz(grieta, '#ffe28a', grosor=0.9, presion=0.8, temblor=0.2)
lz.luz((bx - 6, by + 12, 10), '#ffe2a0', fuerza=0.35)
# eggs in a nest of straw
for (x, y) in ((760, 586), (776, 580), (790, 588), (772, 592)):
    lz.aguada(Elipse(x, y, 8, 10, 10), '#f3e2c8', dens=0.6, tapa=1, irreg=0.2, borde=0.7,
              toques=[(x + 3, y + 3, 6, '#d9b896', 0.6)])
    lz.contorno(Elipse(x, y, 8, 10, 10), '#9a7a5a', grosor=0.6, presion=0.45)
lz.lapiz([arco(775, 596, 26, 6, 0, 180, 16), arco(775, 598, 28, 7, -10, 190, 16)], '#c9a24a', grosor=0.8, presion=0.6,
         temblor=0.6)

# the balance (fair trade, price per kilo -- days 23 and 25)
BX, BY = 968, 430
col_b = '#b8862a'
pie_b = Trazo([(BX, 562), (BX, BY)], (6, 4))
lz.aguada(pie_b, col_b, dens=0.85, tapa=1, irreg=0.2)
lz.aguada(Elipse(BX, 562, 16, 5), col_b, dens=0.85, tapa=1, irreg=0.2)
viga = Trazo([(BX - 62, BY), (BX + 62, BY)], (4, 4), suave=False)
lz.aguada(viga, col_b, dens=0.85, tapa=1, irreg=0.2)
lz.contorno(viga | pie_b, '#6a4a1a', grosor=0.7, presion=0.5)
lz.aguada(Elipse(BX, BY - 6, 6), col_b, dens=0.9, tapa=1, irreg=0.2)
lz.luz((BX, BY, 30), '#ffe2a0', fuerza=0.15)
for sx in (-1, 1):
    px = BX + sx * 62
    lz.lapiz([[(px, BY), (px - 18, BY + 64)], [(px, BY), (px + 18, BY + 64)]], '#6a4a1a', grosor=0.6, presion=0.6)
    plato = Poligono(np.vstack([arco(px, BY + 64, 22, 4, 180, 360, 12), arco(px, BY + 64, 22, 9, 0, 180, 12)]), suave=False)
    lz.aguada(plato, col_b, dens=0.85, tapa=1, irreg=0.2, toques=[(px - 6, BY + 66, 10, '#f0c25e', 0.6)])
    lz.contorno(plato, '#6a4a1a', grosor=0.6, presion=0.5)
# left pan: grapes;  right pan: the girl's apple (placed later, after the girl)
for (dx, dy) in ((-8, -6), (0, -6), (8, -6), (-4, -12), (4, -12), (0, -18), (-12, -12), (12, -12)):
    lz.aguada(Elipse(BX - 62 + dx, BY + 62 + dy, 5), '#7a4a8a', dens=0.85, tapa=1, irreg=0.2, borde=0.7,
              toques=[(BX - 62 + dx - 2, BY + 60 + dy, 3, '#b08ac8', 0.6)])
    lz.contorno(Elipse(BX - 62 + dx, BY + 62 + dy, 5), '#4a2a5a', grosor=0.5, presion=0.4)
hojita(lz, BX - 62, BY + 42, 14, -70, VERDE, tapa=1)

# the farmer's right hand resting on a basket of apples and pears (front of the table)
cesta(858, 588, 40, 24, '#b8864a', asa=False)
for (x, y, f) in ((834, 566, 'm'), (858, 560, 'p'), (882, 566, 'm'), (846, 576, 'm'), (872, 576, 'm')):
    (manzana if f == 'm' else pera)(x, y, 11)
cesta(858, 588, 40, 24, '#b8864a', asa=False)  # front weave over the fruit
for (x, y, f) in ((838, 568, 'm'), (878, 568, 'm')):
    manzana(x, y - 4, 10, '#e2553e')

# ------------------------------------------------------------------ the farmer's arm reaching to the buyer, carrots
fa = [(FX - 46, FY + 80), (FX - 96, FY + 140), (FX - 168, FY + 132)]
manga(lz, fa[:2] + [(FX - 120, FY + 138)], (24, 21, 20), '#e9b04a', pliegues=2,
      toques=[(FX - 90, FY + 140, 20, '#c4802e', 0.5)])
fore = Trazo([(FX - 118, FY + 138), (FX - 150, FY + 136), (FX - 172, FY + 130)], (17, 15, 13))
lz.aguada(fore, '#c98a5e', dens=0.6, tapa=1, irreg=0.3, toques=[(FX - 150, FY + 140, 10, '#a06a42', 0.5)])
lz.contorno(fore, '#6a3a26', grosor=0.7, presion=0.5)
# rolled cuff
lz.aguada(Elipse(FX - 120, FY + 138, 8, 12, 10), '#f0c870', dens=0.75, tapa=1, irreg=0.2)
lz.contorno(Elipse(FX - 120, FY + 138, 8, 12, 10), '#8a5a22', grosor=0.6, presion=0.5)
# the carrots (with their soil and feathery tops), held by the bunch
CX, CY = FX - 196, FY + 126
for k, (ang, L) in enumerate(((-150, 52), (-165, 58), (-140, 46), (-172, 44))):
    a = math.radians(ang)
    tip = (CX + math.cos(a) * L, CY + math.sin(a) * L + 30)
    z = Trazo([(CX + 4, CY + 4 + k * 2), tip], (9, 2))
    lz.aguada(z, '#ec7a2a', dens=0.85, tapa=1, irreg=0.3, borde=0.7, toques=[(CX - 10, CY + 10, 10, '#b84a1a', 0.5)])
    lz.contorno(z, '#9a3a12', grosor=0.6, presion=0.45)
    for j in range(3):
        t = 0.3 + j * 0.2
        px = CX + (tip[0] - CX) * t
        py = CY + (tip[1] - CY) * t
        lz.lapiz([[(px - 2, py - 3), (px + 2, py + 1)]], '#9a3a12', grosor=0.5, presion=0.5)
    lz.aguada(Elipse(tip[0], tip[1], 2.5, 2), '#7a5a3a', dens=0.6, irreg=0.5)  # soil crumbs
for k in range(9):
    a = math.radians(-60 - k * 9)
    ramita(lz, [(CX + 6, CY + 2), (CX + 6 + math.cos(a) * 22, CY + 2 + math.sin(a) * 22),
                (CX + 6 + math.cos(a) * 40, CY + 2 + math.sin(a) * 44)], '#6f9e4a', hojas=5, largo=7, tallo='#4f6f45')
for k in range(6):
    lz.aguada(Elipse(CX - 20 + rng.normal(0, 14), CY + 60 + rng.uniform(0, 30), rng.uniform(1, 2.2)), '#7a5a3a', dens=0.7,
              irreg=0.4)
mano_dedos(lz, FX - 172, FY + 130, 175, 34, '#c98a5e', curl=0.75, abre=0.4, lado=-1, pulgar=0.3)

# ------------------------------------------------------------------ the buyer (left, full figure, stepping in)
BXc, BYf, BR = 300, 792, 40
sombra(lz, 300, 796, 100, 14, dens=0.32)
HX, HY = 312, 428
# back arm (image left): bent, the old basket hanging from the forearm (reuse, day 7)
manga(lz, [(282, 506), (246, 584), (284, 622)], (30, 26, 22), TEAL, pliegues=2, toques=[(246, 584, 26, TEAL_OSC, 0.5)])
cesta(258, 668, 42, 30, '#c9a26a')
for (x, y) in ((236, 640), (258, 636), (280, 642)):
    lz.aguada(Elipse(x, y, 13, 8), ['#f0c25e', '#ec9fa0', '#86a86c'][int(x) % 3], dens=0.7, tapa=1, irreg=0.4)
cesta(258, 668, 42, 30, '#c9a26a', asa=False)
lz.lapiz([arco(258, 656, 36, 46, 200, 340, 30)], '#6a4a2a', grosor=2.2, presion=0.7)
mano_dedos(lz, 284, 622, 20, 34, '#9b6141', curl=0.7, abre=0.4, lado=1, pulgar=0.2)
# legs and shoes under the dress: weight on the back foot, the front foot steps forward
for (pts, w) in (([(286, 700), (276, 752), (268, 782)], (17, 14, 11)), ([(318, 700), (336, 748), (352, 776)], (17, 14, 11))):
    f = Trazo(pts, w)
    lz.aguada(f, '#9b6141', dens=0.6, tapa=1, irreg=0.3)
    lz.contorno(f, '#5a3020', grosor=0.6, presion=0.45)
for (x, y, a) in ((262, 786, 175), (362, 780, 15)):
    z = Elipse(x, y, 17, 7, a)
    lz.aguada(z, CARMIN, dens=0.85, tapa=1, irreg=0.3)
    lz.contorno(z, '#7a1f30', grosor=0.7, presion=0.5)
# the dress: a long teal dress swinging with the step, sprinkled with tiny flowers
vestido = Poligono([(282, 498), (342, 498), (360, 560), (352, 620), (386, 700), (374, 728), (330, 742), (284, 740),
                    (236, 726), (232, 700), (262, 620), (262, 560)])
lz.aguada(vestido, TEAL, dens=0.82, tapa=1, borde=0.7, gran=0.4, flor=1,
          toques=[(250, 700, 50, TEAL_OSC, 0.6), (340, 560, 40, '#6fb1ad', 0.6), (360, 700, 30, '#2f6467', 0.5)])
lz.contorno(vestido, '#24504e', grosor=0.95, presion=0.6, cortes=0.2)
lz.lapiz([bezier((306, 600), (300, 650), (290, 700), (288, 738)), bezier((326, 610), (338, 660), (352, 700), (360, 726)),
          bezier((290, 616), (272, 660), (256, 700), (250, 728))], '#24504e', grosor=0.8, presion=0.45, temblor=0.4)
for (x, y) in Poligono([(272, 560), (350, 560), (372, 720), (244, 720)]).p[::1][:0]:
    pass
pts_f = [(rng.uniform(250, 370), rng.uniform(520, 730)) for _ in range(140)]
for (x, y) in pts_f:
    inside = vestido
    m = inside.mascara(type('U', (), {'s': 1.0}), int(x) - 1, int(y) - 1, int(x) + 2, int(y) + 2)
    if m[1, 1] > 0.5:
        flor_simple(lz, x, y, 3.0, rng.choice(['#f6ead6', ORO, '#ec9fa0']), centro=CORAL, petalos=5)
cinta = Trazo([(262, 600), (300, 606), (356, 598)], (9, 10, 9))
lz.aguada(cinta, ORO, dens=0.85, tapa=1, irreg=0.2)
lz.contorno(cinta, '#9a6a1a', grosor=0.6, presion=0.5)
# head, turned to the farmer, laughing; long dark wavy hair
cabeza_album(lz, HX, HY, BR, piel='#9b6141', peinado='largo', pelo='#2a1a14', giro=0.5, inclina=8, ojos='abiertos',
             boca='sonrisa', mira=(1, -0.3), adorno=CORAL, pendiente=ORO)
# front arm (image right): reaches out toward the farmer, the coin held up between thumb and fingers
manga(lz, [(338, 512), (396, 548), (432, 534)], (30, 25, 20), TEAL, pliegues=2, toques=[(396, 548, 20, TEAL_OSC, 0.5)])
fore2 = Trazo([(428, 536), (458, 520), (476, 508)], (17, 15, 13))
lz.aguada(fore2, '#9b6141', dens=0.6, tapa=1, irreg=0.3)
lz.contorno(fore2, '#5a3020', grosor=0.7, presion=0.5)
lz.aguada(Elipse(430, 535, 9, 15, 30), '#6fb1ad', dens=0.75, tapa=1, irreg=0.2)   # cuff

# ------------------------------------------------------------------ the coin, and the bird that leaves it
MX, MY, MR = 512, 470, 24


def moneda(x, y, r):
    canto = Elipse(x + 3, y + 2, r, r)
    lz.aguada(canto, '#9a6a1a', dens=0.9, tapa=1, irreg=0.15)
    f = Elipse(x, y, r, r)
    lz.aguada(f, '#e8b440', dens=0.9, tapa=1, irreg=0.15, borde=0.8, gran=0.3,
              toques=[(x - r * 0.4, y - r * 0.4, r * 0.6, '#ffe28a', 0.8), (x + r * 0.5, y + r * 0.5, r * 0.5, '#b8862a', 0.6)])
    lz.contorno(f, '#7a4a12', grosor=0.9, presion=0.65, cortes=0.05, desfase=0.1)
    lz.lapiz([arco(x, y, r * 0.84, r * 0.84, 0, 360, 40)], '#a0701e', grosor=0.6, presion=0.5)
    for k in range(28):  # beaded border
        a = math.radians(k * 360 / 28)
        lz.aguada(Elipse(x + math.cos(a) * r * 0.92, y + math.sin(a) * r * 0.92, r * 0.035), '#a0701e', dens=0.9, irreg=0.1)
    # the empty bird-shaped hollow it left: a relief of a bird in flight, lighter inside
    s = r / 1.1
    P = lambda pts: [(x + px * s, y + py * s) for px, py in pts]
    sil = Poligono(P([(-0.75, 0.15), (-0.2, 0.0), (-0.05, -0.62), (0.25, -0.75), (0.15, -0.15), (0.6, -0.12), (0.8, -0.22),
                      (0.72, 0.02), (0.4, 0.2), (-0.1, 0.32), (-0.5, 0.5)]))
    lz.aguada(sil, '#b8862a', dens=0.6, irreg=0.15, borde=0.9)
    lz.lapiz([P([(-0.75, 0.15), (-0.2, 0.0), (-0.05, -0.62), (0.25, -0.75)])], '#fff0b8', grosor=0.7, presion=0.7)
    lz.contorno(sil, '#7a4a12', grosor=0.6, presion=0.6, cortes=0.1, desfase=0.1)
    lz.luz((x, y, r * 1.6), '#ffe08a', fuerza=0.55)
    lz.gouache(Elipse(x - r * 0.45, y - r * 0.5, r * 0.12, r * 0.06, -45), '#fffbe8', alfa=0.85, irreg=0)


lz.aguada(Elipse(MX, MY, 70), '#f6d27a', dens=0.25, suave=26, gran=0.05)   # golden glow on the paper
moneda(MX, MY, MR)
# thumb and fingers pinch the coin from below
mano_dedos(lz, 474, 508, -38, 40, '#9b6141', curl=0.55, abre=0.35, lado=1, pulgar=0.75)

# the bird flies out of the coin, toward the open paper (freedom)
camino = bezier((MX + 6, MY - 14), (520, 360), (420, 300), (318, 214), 80)
for k, (x, y) in enumerate(camino[4:-8:3]):
    t = k / 22
    if t < 0.45:
        r_ = 3.2 - 1.5 * t
        lz.aguada(Elipse(x + rng.normal(0, 4), y + rng.normal(0, 4), r_), '#e8b440', dens=0.85, irreg=0.15, borde=0.8)
    else:
        lz.gouache(Elipse(x + rng.normal(0, 6), y + rng.normal(0, 6), rng.uniform(0.8, 1.8)), '#fff3c8', alfa=0.9, irreg=0)
lz.luz(Trazo(camino[::6], (14,)), '#ffe2a0', fuerza=0.15, suave=10)
pajaro(lz, 296, 196, 34, '#3f8f8c', ang=-26, alas='arriba', vientre='#f6d27a')
lz.luz((300, 200, 60), '#ffe2a0', fuerza=0.2)

# little coins that become leaves and then a flock of small birds (a group escaping from the coin)
traza2 = bezier((MX + 18, MY - 10), (640, 380), (640, 250), (700, 120), 60)
for k, (x, y) in enumerate(traza2[6::6]):
    t = k / 9
    if t < 0.3:
        lz.aguada(Elipse(x, y, 5, 5), '#e8b440', dens=0.85, tapa=1, irreg=0.15, borde=0.8)
        lz.contorno(Elipse(x, y, 5, 5), '#7a4a12', grosor=0.5, presion=0.5)
    elif t < 0.65:
        hojita(lz, x, y, 13, -60 + k * 25, [SALVIA, ORO, VERDE][k % 3], tapa=1)
    else:
        pajaro(lz, x, y, 9 + k * 0.6, [CORAL, ORO, TEAL][k % 3], ang=-30 + k * 6, alas='arriba' if k % 2 else 'abajo')

# ------------------------------------------------------------------ the girl on tiptoe (right) puts an apple on the balance
GX, GY, GR = 1090, 610, 30
sombra(lz, 1092, 808, 60, 10, dens=0.3)
# legs on tiptoe
for (pts, a) in (([(1080, 712), (1078, 760), (1084, 796)], 70), ([(1100, 712), (1106, 758), (1112, 794)], 75)):
    f = Trazo(pts, (12, 10, 8))
    lz.aguada(f, '#f3cdb0', dens=0.6, tapa=1, irreg=0.3)
    lz.contorno(f, '#8a5440', grosor=0.6, presion=0.45)
for (x, y) in ((1088, 800), (1116, 798)):
    z = Poligono([(x - 6, y - 8), (x + 4, y - 6), (x + 10, y + 4), (x - 4, y + 4)])
    lz.aguada(z, '#f0b030', dens=0.9, tapa=1, irreg=0.2)
    lz.contorno(z, '#8a5a12', grosor=0.6, presion=0.5)
# dress: coral with a white collar, a little cloth bag across her body
vest = Poligono([(1070, 650), (1112, 650), (1120, 680), (1136, 728), (1090, 738), (1046, 728), (1062, 680)])
lz.aguada(vest, CORAL, dens=0.82, tapa=1, borde=0.7, gran=0.35, flor=1, toques=[(1120, 710, 26, CARMIN, 0.6)])
lz.contorno(vest, '#8a3020', grosor=0.85, presion=0.55)
lz.lapiz([bezier((1084, 690), (1080, 710), (1072, 734)), bezier((1100, 690), (1108, 712), (1116, 732))], '#9a3a2a',
         grosor=0.7, presion=0.4)
for (x, y) in ((1070, 700), (1094, 714), (1112, 700), (1082, 724), (1106, 728), (1060, 720)):
    lz.gouache(Elipse(x, y, 1.8), '#fff3e6', alfa=0.85, irreg=0)
cabeza_album(lz, GX, GY, GR, piel='#f3cdb0', peinado='coletas', pelo='#b8642a', giro=-0.45, inclina=-12, ojos='abiertos',
             boca='o', mira=(-0.6, -1), adorno=TEAL, cuello=True)
lz.aguada(Poligono([(1072, 648), (1090, 660), (1110, 648), (1100, 642), (1082, 642)]), '#fbf6ec', dens=0.5, tapa=1)
lz.contorno(Poligono([(1072, 648), (1090, 660), (1110, 648), (1100, 642), (1082, 642)]), '#9a7a5a', grosor=0.6, presion=0.5)
# both arms up toward the right pan of the balance
manga(lz, [(1072, 660), (1052, 620), (1046, 560)], (14, 12, 11), '#f3cdb0', pliegues=0, lapiz='#8a5440', dens=0.55)
manga(lz, [(1108, 660), (1078, 612), (1052, 548)], (14, 12, 11), '#f3cdb0', pliegues=0, lapiz='#8a5440', dens=0.55)
for (pts) in ([(1068, 652), (1060, 636)], [(1110, 652), (1100, 636)]):
    f = Trazo(pts, (16, 14))
    lz.aguada(f, CORAL, dens=0.82, tapa=1, irreg=0.2)
    lz.contorno(f, '#8a3020', grosor=0.6, presion=0.5)
manzana(BX + 62, BY + 50, 13, '#e2553e')
mano_dedos(lz, 1046, 560, -95, 26, '#f3cdb0', curl=0.4, abre=0.6, lado=1, pulgar=0.6)
mano_dedos(lz, 1052, 548, -60, 26, '#f3cdb0', curl=0.6, abre=0.5, lado=-1, pulgar=0.5)

# ------------------------------------------------------------------ a few loose details with intention
# a feather that fell from the bird, drifting down
pl = Trazo([(214, 300), (226, 280), (232, 258)], (2, 9, 2))
lz.aguada(pl, '#6fb1ad', dens=0.6, irreg=0.3, borde=0.8)
lz.lapiz([[(212, 304), (232, 258)]], TEAL_OSC, grosor=0.6, presion=0.6)
# seeds of light falling from the honey to the cloth
lz.chispas(600, 560, 40, 20, n=6, tam=(0.6, 1.4), luz=0.2)

lz.vineta(margen=30)
lz.guardar(SALIDA)
print('ok', SALIDA)
