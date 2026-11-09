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
from acuarela import puntos_dentro, pececillo
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
PAL = '#a8927e'          # pale pencil for the far plaza


def figurita(x, yf, h, ropa, piel='#e0b090', brazos=((-60, -30), (40, 20)), falda=False, pelo='#6a4a3a'):
    """A tiny far-away person (pale): head, body, pencil arms. brazos: (angle, length%) pairs."""
    r = h / 8.0
    hy = yf - h + r
    sh = hy + r * 1.6
    hip = sh + r * 2.6
    cuerpo_ = Poligono([(x - r * 0.9, sh), (x + r * 0.9, sh), (x + (r * 1.5 if falda else r * 0.8), hip + (r * 1.6 if falda else 0)),
                        (x - (r * 1.5 if falda else r * 0.8), hip + (r * 1.6 if falda else 0))])
    lz.aguada(cuerpo_, ropa, dens=0.42, tapa=1, irreg=0.4, borde=0.6, gran=0.3)
    lz.contorno(cuerpo_, PAL, grosor=0.6, presion=0.35, cortes=0.3)
    for sd in (-1, 1):
        lz.lapiz([[(x + sd * r * 0.4, hip + (r * 1.4 if falda else 0)), (x + sd * r * 0.6, yf)]], PAL, grosor=0.9, presion=0.5)
    for (a, L) in brazos:
        p0 = (x + (r * 0.8 if -90 < a < 90 else -r * 0.8), sh + r * 0.3)
        p1 = (p0[0] + math.cos(math.radians(a)) * r * 3 * L / 50, p0[1] + math.sin(math.radians(a)) * r * 3 * L / 50)
        lz.lapiz([[p0, p1]], PAL, grosor=0.8, presion=0.5)
    lz.aguada(Elipse(x, hy, r, r * 1.05), piel, dens=0.45, tapa=1, irreg=0.2)
    lz.aguada(Elipse(x, hy - r * 0.35, r * 1.02, r * 0.7), pelo, dens=0.4, irreg=0.3)
    lz.contorno(Elipse(x, hy, r, r * 1.05), PAL, grosor=0.5, presion=0.35, cortes=0.3)


def soportal(x0, x1, ytop, ybase, arcos=2, muro='#ecd2b0'):
    """A pale fragment of arcaded building: wall, round arches, roof tiles, a balcony."""
    pared = Poligono([(x0, ybase), (x0 + 4, ytop + 10), (x0 + 12, ytop), (x1 - 8, ytop + 4), (x1, ytop + 14), (x1 - 2, ybase)])
    lz.aguada(pared, muro, dens=0.4, tapa=1, irreg=1.4, borde=0.6, gran=0.6, var=0.6,
              toques=[(x1 - 30, ybase - 40, 50, '#e2b890', 0.5)])
    w = (x1 - x0) / arcos
    huecos = []
    for k in range(arcos):
        ax0, ax1 = x0 + k * w + w * 0.14, x0 + (k + 1) * w - w * 0.14
        cxa = (ax0 + ax1) / 2
        ra = (ax1 - ax0) / 2
        yt = ybase - 105
        hueco = Poligono(np.vstack([[(ax0, ybase)], arco(cxa, yt, ra, ra * 0.95, 180, 360, 18), [(ax1, ybase)]]), suave=False)
        lz.aguada(hueco, '#c9b4a0', dens=0.38, tapa=1, irreg=0.5, borde=0.5, gran=0.4,
                  toques=[(cxa, yt + 10, ra, '#b8a090', 0.6)])
        lz.contorno(hueco, PAL, grosor=0.7, presion=0.4, cortes=0.35)
        huecos.append((cxa, ra))
    # roof tiles and a little balcony with flowerpots
    lz.aguada(Poligono([(x0 - 8, ytop + 8), (x0 + 6, ytop - 10), (x1 - 4, ytop - 6), (x1 + 10, ytop + 12)], suave=False), '#d9987a',
              dens=0.42, tapa=1, irreg=0.6, gran=0.5)
    lz.lapiz([[(x0 + 8 + k * 9, ytop - 8), (x0 + 6 + k * 9, ytop + 8)] for k in range(int((x1 - x0) / 9))], '#b8786a', grosor=0.5,
             presion=0.35)
    by = ytop + 34
    for k in range(arcos):
        cxa = x0 + (k + 0.5) * w
        lz.aguada(Poligono([(cxa - 12, by - 22), (cxa + 12, by - 22), (cxa + 12, by), (cxa - 12, by)], suave=False), '#8aa8b0',
                  dens=0.35, irreg=0.3)
        lz.lapiz([[(cxa - 18, by), (cxa + 18, by)], [(cxa - 18, by - 8), (cxa + 18, by - 8)]] +
                 [[(cxa - 18 + j * 6, by), (cxa - 18 + j * 6, by - 8)] for j in range(7)], PAL, grosor=0.5, presion=0.4)
        for j in (-1, 1):
            lz.aguada(Elipse(cxa + j * 10, by - 12, 4), rng.choice([CORAL, '#ec9fa0', ORO]), dens=0.5, irreg=0.3)
    lz.contorno(pared, PAL, grosor=0.6, presion=0.35, cortes=0.45)
    return huecos


# left: a potter and a flower seller under the arcades, people trading
huecos = soportal(70, 372, 236, 404, arcos=2)
(c1, r1), (c2, r2) = huecos
mesa_a = Poligono([(c1 - 44, 372), (c1 + 44, 372), (c1 + 44, 380), (c1 - 44, 380)], suave=False)
lz.aguada(mesa_a, '#c8a07a', dens=0.45, tapa=1, irreg=0.3)
for j, (dx, h) in enumerate(((-34, 16), (-18, 22), (-2, 14), (14, 20), (30, 12))):
    jar = Poligono([(c1 + dx - 6, 372), (c1 + dx - 8, 372 - h * 0.6), (c1 + dx - 4, 372 - h), (c1 + dx + 4, 372 - h),
                    (c1 + dx + 8, 372 - h * 0.6), (c1 + dx + 6, 372)])
    lz.aguada(jar, ['#c0703f', '#d98a5a', TEAL, '#c0703f', '#e0a060'][j], dens=0.5, tapa=1, irreg=0.3, borde=0.7)
figurita(c1 - 26, 404, 52, '#c8805a', brazos=((10, 60), (120, 40)))
figurita(c1 + 34, 404, 50, '#7aa0b0', brazos=((170, 60), (60, 40)), falda=True, pelo='#4a3a2a')
for j in range(7):   # buckets of flowers
    bx_ = c2 - 36 + j * 12
    lz.aguada(Poligono([(bx_ - 5, 404), (bx_ - 6, 388), (bx_ + 6, 388), (bx_ + 5, 404)], suave=False), '#a8b8c0', dens=0.4, tapa=1)
    for q in range(3):
        lz.aguada(Elipse(bx_ + rng.normal(0, 3), 382 - rng.uniform(0, 10), 3.2), rng.choice([CORAL, ORO, '#ec9fa0', CARMIN, '#f6d27a']),
                  dens=0.6, irreg=0.2)
figurita(c2 + 30, 404, 48, '#e0a860', brazos=((-160, 60), (80, 40)), falda=True, pelo='#8a5a3a')
# the fountain in the middle of the square
FUx, FUy = 186, 470
lz.aguada(Elipse(FUx, FUy, 56, 10), '#b8d0d0', dens=0.4, tapa=1, irreg=0.4)
pila = Poligono(np.vstack([arco(FUx, FUy, 56, 10, 180, 360, 16), arco(FUx, FUy + 20, 56, 10, 0, 180, 16)]), suave=False)
lz.aguada(pila, '#dcc8aa', dens=0.42, tapa=1, irreg=0.5, gran=0.5, toques=[(FUx + 30, FUy + 20, 30, '#c8b090', 0.5)])
lz.contorno(pila, PAL, grosor=0.6, presion=0.4, cortes=0.3)
lz.aguada(Trazo([(FUx, FUy - 2), (FUx, FUy - 40)], (8, 6)), '#dcc8aa', dens=0.45, tapa=1, irreg=0.3)
lz.aguada(Elipse(FUx, FUy - 42, 16, 4), '#dcc8aa', dens=0.45, tapa=1, irreg=0.3)
lz.lapiz([arco(FUx - 18, FUy - 42, 18, 30, 180, 270, 12), arco(FUx + 18, FUy - 42, 18, 30, 270, 360, 12),
          arco(FUx - 10, FUy - 52, 10, 22, 180, 270, 10), arco(FUx + 10, FUy - 52, 10, 22, 270, 360, 10)], '#7fb0b8', grosor=0.7,
         presion=0.5)
pajaro(lz, FUx + 46, FUy - 10, 7, '#a8b8b0', ang=0, alas='abajo')
# right: the weaver's blankets hanging under an arch
huecos_r = soportal(1336, 1468, 214, 404, arcos=1, muro='#e8d0b8')
cr, rr_ = huecos_r[0]
lz.lapiz([[(cr - rr_ + 4, 300), (cr + rr_ - 4, 300)]], PAL, grosor=0.6, presion=0.45)
for j, col in enumerate(('#e8735e', '#3f8f8c', '#f0c25e')):
    xx = cr - 26 + j * 22
    man = Poligono([(xx - 9, 300), (xx + 9, 300), (xx + 9, 350 + j * 4), (xx - 9, 350 + j * 4)], suave=False)
    lz.aguada(man, col, dens=0.45, tapa=1, irreg=0.3, borde=0.6)
    lz.lapiz([[(xx - 9, 312 + q * 9), (xx + 9, 312 + q * 9)] for q in range(4)], '#f6ead6', grosor=0.8, presion=0.5)
figurita(cr + 4, 404, 46, '#a088b8', brazos=((-120, 50), (-60, 50)), falda=True, pelo='#3a2a24')

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
    hem = HEM_D + (HEM_C - HEM_D) * u + 9 * abs(math.sin(math.pi * (x - D[0]) / PL))
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
retales = [  # (x0, x1, t0, t1, colour, wet-in-wet touch)
    (X0, 812, 0.0, 0.28, '#e2b448', '#f0d070'), (812, 1004, 0.0, 0.24, '#d9a03a', '#c8862a'), (1004, X1, 0.0, 0.3, '#e8c25a', '#f6dc8a'),
    (X0, 760, 0.28, 0.56, '#6fa452', '#9cc27e'), (760, 930, 0.24, 0.52, '#86b06a', '#5f8f63'), (930, 1090, 0.24, 0.55, '#c9773a', '#a85a2a'),
    (1090, X1, 0.3, 0.56, '#9cbf6a', '#6f9a4a'), (X0, 900, 0.56, 1.0, '#a9c98a', '#86b6a0'), (900, X1, 0.55, 1.0, '#b8d090', '#98c0a0')]
for (a, b, t0, t1, col, tq) in retales:
    xm = (a + b) / 2
    lz.aguada(parche(a, b, t0, t1) & mantel, col, dens=0.82, irreg=0.5, borde=0.75, gran=0.6, var=0.5,
              toques=[(xm, tela_y(xm, (t0 + t1) / 2), (b - a) * 0.35, tq, 0.6)])
# hand stitching along every seam
for (a, b, t0, t1, col, tq) in retales:
    if t0 > 0:
        costura(a, b, t0, '#f6ead6')
    if a > X0:
        costura_v(a, t0, t1, '#f6ead6')
# drape folds: soft shadow in each valley, pencil lines that follow the fall of the cloth
for k in range(8):
    xv = X0 + (k + 0.02) * PL
    if xv <= X0 + 2:
        continue
    lz.aguada(Trazo([(xv, tela_y(xv, 0.15)), (xv + 2, tela_y(xv, 0.6)), (xv, tela_y(xv, 0.98))], (2, 14, 20)) & mantel,
              '#5a3a22', dens=0.22, suave=5)
    lz.lapiz([[(xv + 1, tela_y(xv, 0.25)), (xv + 2, tela_y(xv, 0.95))]], '#7a5a3a', grosor=0.6, presion=0.35, cortes=0.4)
    xr = X0 + (k + 0.5) * PL   # the ridge of the fold catches the light
    lz.levanta(Trazo([(xr, tela_y(xr, 0.3)), (xr, tela_y(xr, 0.95))], (4, 10)) & mantel, 0.18, suave=4)
# wheat: loose ochre pencil strokes in the gold scraps, a few painted ears
for (a, b) in ((X0 + 10, 806), (1010, X1 - 10)):
    for x in np.arange(a, b, 7) + rng.uniform(-2, 2, len(np.arange(a, b, 7))):
        y = tela_y(x, rng.uniform(0.06, 0.26))
        lz.lapiz([[(x, y + 6), (x + 2.5, y - 5)]], '#a8702a', grosor=0.6, presion=0.4)
for x in np.arange(X0 + 22, 800, 34):
    y = tela_y(x, 0.14)
    for j in range(3):
        lz.aguada(Elipse(x + 1.2 * j, y - j * 3, 1.5, 2.8, 20), '#b07a1e', dens=0.7, irreg=0.1)
# crop rows in the green scraps, furrows in the ploughed one
lz.lapiz([[(x, tela_y(x, 0.52)), (x + 18, tela_y(x + 18, 0.32))] for x in np.arange(672, 744, 13)], '#3f6a3a', grosor=0.8, presion=0.5)
for x in np.arange(770, 920, 12):
    for t in (0.33, 0.41, 0.48):
        lz.aguada(Elipse(x + (t - 0.3) * 30, tela_y(x, t), 2.6, 1.8), '#3f7a3a', dens=0.85, irreg=0.2)
lz.lapiz([[(x, tela_y(x, 0.53)), (x - 8, tela_y(x - 8, 0.27))] for x in np.arange(940, 1086, 10)], '#8a4a22', grosor=0.7, presion=0.45)
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
    for j in range(4):
        lz.aguada(Elipse(x + rng.uniform(-r_ * 0.6, r_ * 0.6), y + rng.uniform(-r_ * 0.4, r_ * 0.4), 1.8), CORAL, dens=0.9, irreg=0.1)
hx, hy = 1040, tela_y(1040, 0.12) + 4
casa = Poligono([(hx - 18, hy + 12), (hx + 18, hy + 12), (hx + 18, hy - 10), (hx - 18, hy - 10)], suave=False)
lz.aguada(casa, '#fbf3e4', dens=0.6, tapa=1, irreg=0.2)
lz.aguada(Poligono([(hx - 24, hy - 8), (hx, hy - 28), (hx + 24, hy - 8)], suave=False), CARMIN, dens=0.85, tapa=1, irreg=0.2)
lz.aguada(Poligono([(hx - 4, hy + 12), (hx + 5, hy + 12), (hx + 5, hy), (hx - 4, hy)], suave=False), '#6e4c3c', dens=0.8, irreg=0.1)
lz.contorno(casa, LP, grosor=0.6, presion=0.5)
lz.aguada(Elipse(hx + 11, hy - 1, 3), '#f2c14e', dens=0.9, irreg=0.1)
lz.luz((hx + 11, hy - 1, 6), '#ffe2a0', fuerza=0.45)
for (x, t) in ((800, 0.86), (822, 0.88), (1050, 0.66)):
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
manga(lz, [(FX + 58, FY + 88), (FX + 96, FY + 122), (FX + 128, FY + 132)], (28, 25, 22), '#e9b04a', pliegues=2,
      toques=[(FX + 96, FY + 126, 20, '#c4802e', 0.5)])
fa2 = Trazo([(FX + 124, FY + 132), (FX + 160, FY + 128), (FX + 186, FY + 118)], (19, 17, 14))
lz.aguada(fa2, '#c98a5e', dens=0.6, tapa=1, irreg=0.3, sombra=(-4, -3))
lz.contorno(fa2, '#6a3a26', grosor=0.7, presion=0.5)
lz.aguada(Elipse(FX + 126, FY + 132, 9, 14, -20), '#f0c870', dens=0.78, tapa=1, irreg=0.2)
lz.contorno(Elipse(FX + 126, FY + 132, 9, 14, -20), '#8a5a22', grosor=0.6, presion=0.5)
mano_dedos(lz, FX + 186, FY + 118, -18, 38, '#c98a5e', curl=0.35, abre=0.5, lado=-1, pulgar=0.7)
manzana(FX + 212, FY + 98, 15, '#e2553e')

# ------------------------------------------------------------------ the boy on a crate, offering the drawing he made
cajon = Poligono([(1296, 724), (1380, 720), (1384, 790), (1300, 794)], suave=False)
lz.aguada(Poligono([(1296, 724), (1380, 720), (1372, 710), (1304, 714)], suave=False), '#8a5a32', dens=0.75, tapa=1, irreg=0.2)
lz.aguada(cajon, '#c99a5a', dens=0.8, tapa=1, irreg=0.3, borde=0.7, sombra=(-5, -4))
lz.lapiz([[(1298, 746 + k * 22), (1382, 744 + k * 22)] for k in range(2)], '#7a5a30', grosor=0.8, presion=0.55)
lz.contorno(cajon, '#6a4a2a', grosor=0.8, presion=0.55)
sombra(lz, 1342, 796, 60, 9, dens=0.3)
NX, NY, NR = 1338, 548, 30
PIEL_N = '#7a4a32'
for (pts) in ([(1328, 650), (1324, 690), (1322, 716)], [(1350, 650), (1356, 690), (1360, 714)]):
    manga(lz, pts, (16, 13, 11), PIEL_N, pliegues=0, dens=0.6, lapiz='#4a2a1a')
lz.aguada(Poligono([(1318, 640), (1366, 640), (1370, 672), (1314, 672)]), '#6e4c3c', dens=0.85, tapa=1, irreg=0.3, sombra=(-4, -3))
lz.contorno(Poligono([(1318, 640), (1366, 640), (1370, 672), (1314, 672)]), '#3a2418', grosor=0.7, presion=0.5)
for (x, sd) in ((1318, -1), (1362, 1)):
    z = Elipse(x + sd * 3, 720, 12, 5.5)
    lz.aguada(z, '#3f6f8c', dens=0.9, tapa=1, irreg=0.2)
    lz.contorno(z, '#24405a', grosor=0.6, presion=0.5)
cabeza_album(lz, NX, NY, NR, piel=PIEL_N, peinado='rizado', pelo='#1e140f', giro=-0.5, inclina=-8, ojos='abiertos', boca='risa',
             mira=(-1, -0.4), base=(1338, 592), ancho_base=48)
camisa_n = Poligono([(1316, 588), (1360, 588), (1372, 610), (1370, 650), (1312, 650), (1308, 612)])
lz.aguada(camisa_n, '#5f9a6a', dens=0.95, tapa=1, borde=0.7, gran=0.4, sombra=(-8, -6, '#3f6a4a', 0.6))
lz.contorno(camisa_n, '#2f5a3a', grosor=0.8, presion=0.55)
for k in range(4):
    lz.lapiz([[(1312, 600 + k * 12), (1372, 598 + k * 12)]], '#f6ead6', grosor=1.2, presion=0.6)   # stripes
manga(lz, [(1366, 596), (1378, 626), (1370, 652)], (14, 12, 11), '#5f9a6a', pliegues=1)
mano_dedos(lz, 1370, 652, 100, 22, PIEL_N, curl=0.5, abre=0.5, lado=1, pulgar=0.4)
lz.lapiz([spline([(1322, 590), (1338, 600), (1354, 590)])], '#2f5a3a', grosor=1.4, presion=0.7)
# the drawing: crayon sun, hills, a house and two people holding hands (no letters)
papel = Poligono([(1196, 470), (1262, 478), (1258, 524), (1192, 516)], suave=False)
lz.aguada(papel, '#fbf6ea', dens=0.25, tapa=1, irreg=0.1, borde=0.3)
lz.contorno(papel, '#9a8a7a', grosor=0.7, presion=0.55, cortes=0.05)
lz.lapiz([arco(1212, 486, 6, 6, 0, 360, 16)] + [[(1212 + math.cos(math.radians(a)) * 8, 486 + math.sin(math.radians(a)) * 8),
                                                 (1212 + math.cos(math.radians(a)) * 12, 486 + math.sin(math.radians(a)) * 12)]
                                                for a in range(0, 360, 45)], '#e8a020', grosor=0.9, presion=0.8)
lz.lapiz([spline([(1196, 512), (1220, 502), (1244, 508), (1258, 504)])], '#4f8a3a', grosor=1.0, presion=0.8)
lz.lapiz([[(1236, 504), (1236, 492), (1246, 486), (1254, 492), (1254, 505)], [(1236, 492), (1254, 492)]], '#c33c4e', grosor=0.9, presion=0.8)
for (x, c) in ((1218, '#3f6f8c'), (1226, '#c33c4e')):
    lz.lapiz([arco(x, 500, 2.4, 2.4, 0, 360, 10), [(x, 502.5), (x, 509)], [(x - 3, 505), (x + 3, 505)]], c, grosor=0.8, presion=0.8)
# his raised arm holds the drawing by its corner
manga(lz, [(1318, 598), (1290, 560), (1266, 520)], (14, 12, 11), '#5f9a6a', pliegues=1)
mano_dedos(lz, 1266, 522, -128, 24, PIEL_N, curl=0.6, abre=0.4, lado=-1, pulgar=0.6)

# ------------------------------------------------------------------ the mother: a young woman stepping in, paying
PIEL_B = '#9b6141'
sombra(lz, 494, 792, 100, 14, dens=0.32)
HX, HY, BR = 476, 300, 48
# her bag of cloth (reused) on the back arm, carrot tops and bread peeking out
manga(lz, [(430, 398), (414, 466), (430, 512)], (34, 29, 25), TEAL, pliegues=2, toques=[(414, 466, 28, TEAL_OSC, 0.5)])
for k in range(5):
    a = math.radians(-100 + k * 12)
    ramita(lz, [(436, 520), (436 + math.cos(a) * 20, 520 + math.sin(a) * 26)], '#6f9e4a', hojas=4, largo=6)
pan(452, 510, 26, 7, -60)
bolsa = Poligono([(404, 518), (466, 516), (474, 590), (400, 594)])
lz.aguada(bolsa, '#efe2c4', dens=0.65, tapa=1, irreg=0.4, borde=0.7, gran=0.5, sombra=(-5, -4))
for k in range(5):
    lz.lapiz([[(406 + k * 15, 520), (402 + k * 17, 592)]], CORAL, grosor=1.6, presion=0.6)
lz.contorno(bolsa, '#8a7a5a', grosor=0.8, presion=0.55)
mano_dedos(lz, 430, 512, 95, 36, PIEL_B, curl=0.7, abre=0.35, lado=-1, pulgar=0.3)
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


lz.aguada(Elipse(MX - 20, MY - 20, 90), '#f6d27a', dens=0.22, suave=34, gran=0.05)
f_moneda = moneda(MX, MY, MR)
# the bird: its tail and the back of its body are still gold relief on the coin, its head and its wings already alive
cuerpo_pj, T = pajaro_perfil(MX - 26, MY - 16, 32, 32, '#2f8a88', flip=True)
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
lz.luz((MX - 18, MY - 18, 40), '#ffe08a', fuerza=0.5)
lz.gouache(Elipse(MX + MR * 0.45, MY + MR * 0.5, MR * 0.12, MR * 0.05, -45), '#fffbe8', alfa=0.85, irreg=0)
mano_dedos(lz, 652, 414, -50, 46, PIEL_B, curl=0.55, abre=0.3, lado=1, pulgar=0.95)

# the flock already in flight, smaller and smaller toward the open paper (behind it, in the distance)
for k, (x, y, s_, c) in enumerate(((574, 252, 15, CORAL), (516, 196, 13, ORO), (458, 162, 12, TEAL), (398, 132, 10, '#ec9fa0'),
                                   (338, 114, 9, SALVIA), (282, 96, 8, CORAL), (232, 86, 7, TEAL))):
    pajaro(lz, x, y, s_, c, ang=-28 + (k % 3) * 8, alas='arriba' if k % 2 == 0 else 'abajo')

# ------------------------------------------------------------------ the daughter, on tiptoe, reaching for the bird with open hands
GX, GY, GR = 286, 612, 31
PIEL_G = '#e6ae88'
sombra(lz, 296, 822, 58, 9, dens=0.3)
for (pts) in ([(278, 748), (276, 790), (280, 812)], [(300, 748), (308, 788), (316, 810)]):
    manga(lz, pts, (13, 11, 9), PIEL_G, pliegues=0, dens=0.6, lapiz='#8a5440')
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
manga(lz, [(308, 666), (334, 624), (356, 584)], (14, 12, 11), PIEL_G, pliegues=0, lapiz='#8a5440', dens=0.58)
manga(lz, [(272, 666), (256, 620), (268, 572)], (14, 12, 11), PIEL_G, pliegues=0, lapiz='#8a5440', dens=0.58)
for pts in ([(306, 664), (318, 646)], [(274, 664), (266, 646)]):
    f = Trazo(pts, (17, 15))
    lz.aguada(f, '#f0a828', dens=0.9, tapa=1, irreg=0.2)
    lz.contorno(f, '#8a5a12', grosor=0.6, presion=0.5)
mano_dedos(lz, 356, 584, -58, 28, PIEL_G, curl=0.05, abre=1.4, lado=1, pulgar=1.0)
mano_dedos(lz, 268, 572, -72, 28, PIEL_G, curl=0.05, abre=1.4, lado=-1, pulgar=1.0)

lz.vineta(margen=30)
lz.guardar(SALIDA)
print('ok', SALIDA)
