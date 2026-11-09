"""
Mes 3 -- Agua -- Diseño 4.

Idea: "we are water that walks". The water cycle as one closed circle you can
read in three seconds: a whale made of cloud -- with the sea still inside it --
swims across the sky and rains from its belly; the rain becomes a spring, the
spring a river, the river a pool; from the pool the water rises again as
vapour into the whale's tail. Along the way, people live it: a grandmother
kneels at the spring to refill a child's canteen while the child drinks from a
cup; a boy jumps into the river curled like a cannonball; a girl floats on her
back in the pool with her eyes closed, feeling the water. A heron fishes in
the reeds of the wetland; phytoplankton glows green in the pool.

    python3 mes-03-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, rgb, remuestrea,
                      estrella, hojita, hoja, flor_simple, pececillo, pajaro, ramita, motas, puntos_dentro, _lapiz_de)
from extra_m134 import cara, mano, miembro, prenda, volumen, cuello, Marco, SEPIA, PIEL_LP
from acuarela import cuello_natural

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-03-d.png'

lz = Lienzo(ANCHO, semilla=303)

TEAL = '#3f8f94'
AZUL = '#4f8fc0'
AGUA = '#5fa8c8'
CORAL = '#e8735e'
CARMIN = '#c33c4e'
ORO = '#f0c25e'
OCRE = '#e2a23a'
rng = np.random.default_rng(3)

# ------------------------------------------------------------------ the river (rain -> spring -> river -> pool)
RIO = [(990, 440), (910, 444), (826, 460), (764, 512), (775, 580), (720, 650), (600, 705), (470, 735), (360, 728),
       (300, 700)]
ANCHOS = (34, 52, 70, 92, 118, 150, 200, 230, 200, 120)
rio = Trazo(RIO, ANCHOS)
# banks first: a soft green and ochre margin that frays into the paper
orilla = Trazo(RIO, tuple(a + 36 for a in ANCHOS))
lz.aguada(orilla, '#9ab86a', dens=0.45, irreg=1.8, borde=0.6, gran=0.5, var=0.6,
          toques=[(900, 470, 60, '#c9b46a', 0.6), (500, 790, 90, '#6f9a5e', 0.6), (330, 660, 70, '#86a86c', 0.6)])
lz.rayado(orilla - rio, '#5f7f45', angulo=70, sep=3.4, presion=0.3, largo=9)
# the water: wet-in-wet blues and teals, lighter where the sky reflects
lz.aguada(rio, AGUA, dens=0.75, tapa=1, borde=0.8, flor=3, gran=0.35, var=0.5,
          toques=[(1000, 420, 40, '#8fcfd8', 0.7), (800, 470, 50, '#3f8fb0', 0.6), (760, 600, 60, '#2f7f94', 0.6),
                  (560, 720, 90, '#3a76b0', 0.6), (420, 735, 70, '#2f8a96', 0.6), (680, 690, 50, '#8fcfd8', 0.5)])
# ripples (pencil) following the current, and white light on the water
p = np.asarray(rio.p)
tg = np.gradient(p, axis=0)
tg /= np.maximum(np.hypot(*tg.T)[:, None], 1e-9)
nr = np.stack([-tg[:, 1], tg[:, 0]], 1)
rip, luzag = [], []
for j in range(4, len(p) - 4, 5):
    for k in range(2):
        o = rng.uniform(-0.38, 0.38) * rio.w[j]
        L = rng.uniform(8, 20)
        c = p[j] + nr[j] * o
        seg = [c - tg[j] * L / 2 + nr[j] * 1.5, c, c + tg[j] * L / 2 + nr[j] * 1.5]
        (rip if k == 0 else luzag).append(seg)
lz.lapiz([spline(s_) for s_ in rip], '#2f5f80', grosor=0.7, presion=0.45, temblor=0.2)
for s_ in luzag[::2]:
    lz.gouache(Trazo(s_, (1.6, 1.2)), '#f6fbff', alfa=0.7, irreg=0.3)
lz.contorno(rio, '#2f5f7a', grosor=0.9, presion=0.5, cortes=0.4, desfase=0.6)
# pebbles at the bottom of the shallow stream
for (x, y) in puntos_dentro(Trazo(RIO[:4], ANCHOS[:4]), 26, 5, margen=4):
    e = Elipse(x, y, rng.uniform(3, 6), rng.uniform(2, 3.5), rng.uniform(0, 180))
    lz.aguada(e, rng.choice(['#c9a87a', '#a8988a', '#d8b890', '#8f8a8a']), dens=0.5, irreg=0.3, tapa=0.3)
# phytoplankton: tiny green lights in the pool (half of the planet's photosynthesis, day 8)
for (x, y) in puntos_dentro(Trazo(RIO[5:], ANCHOS[5:]), 60, 8, margen=10):
    lz.gouache(Elipse(x, y, rng.uniform(0.7, 1.5)), rng.choice(['#c8f0a8', '#a8e8c0', '#e8f8c8']), alfa=0.9, irreg=0)
    if rng.random() < 0.25:
        lz.luz((x, y, 6), '#c8f0a0', fuerza=0.35)
# little fish in the river
for (x0, y0, ang, n) in ((880, 450, 170, 5), (640, 700, 175, 6), (420, 760, 185, 4)):
    for k in range(n):
        pececillo(lz, x0 + k * 11 * math.cos(math.radians(ang)) + rng.normal(0, 3),
                  y0 + k * 11 * math.sin(math.radians(ang)) + rng.normal(0, 4), rng.uniform(3.4, 4.6),
                  ang + rng.normal(0, 10), rng.choice(['#e8735e', '#f0c25e', '#f6a58a']), gouache=False)
# water lilies on the pool
for (x, y, r) in ((300, 735, 13), (330, 760, 9), (640, 760, 11)):
    nen = Elipse(x, y, r, r * 0.6) - Poligono([(x, y), (x + r * 1.2, y - r * 0.3), (x + r * 1.2, y + r * 0.2)], suave=False)
    lz.aguada(nen, '#5f8f63', dens=0.8, tapa=1, irreg=0.3)
    lz.contorno(nen, '#3f5a3a', grosor=0.6, presion=0.5)
flor_simple(lz, 304, 728, 7, '#f6a5b5', centro=ORO)

# ------------------------------------------------------------------ the spring: water born from a crack in mossy rocks
ROCAS = [(900, 384, 34, 24), (936, 402, 48, 30), (984, 380, 36, 30), (1004, 414, 22, 16)]
for (x, y, rx, ry) in ROCAS:
    roca = Elipse(x, y, rx, ry, rng.uniform(-10, 10))
    volumen(lz, roca, '#b8aa98', dens=0.68, luz=(-0.6, -0.8), brillo=0.25, lapiz='#6e5e50',
            toques=[(x - rx * 0.3, y - ry * 0.55, rx * 0.6, '#7fa85a', 0.75)])
    for k in range(7):      # cushions of moss and tiny ferns
        hx, hy = x + rng.uniform(-rx, rx) * 0.7, y - ry * rng.uniform(0.5, 0.95)
        hojita(lz, hx, hy, rng.uniform(5, 9), rng.uniform(-160, -20), rng.choice(['#5f8f63', '#7aa24a']), tapa=0.6)
# the crack between the rocks, wet and dark, and the clear water that is born there
# the crack: a thin, wet, irregular seam where two rocks meet (no tube, no hole)
GRIETA = [(966, 360), (972, 372), (970, 384), (978, 394), (984, 404), (996, 410)]
lz.aguada(Trazo(GRIETA, (1.5, 3, 4, 3.5, 3, 2)), '#3a4a48', dens=0.75, irreg=0.6, borde=0.6)
lz.lapiz([spline(GRIETA)], '#2e3a38', grosor=0.9, presion=0.7, temblor=0.4)
lz.aguada(Trazo([(958, 386), (976, 396), (992, 408), (1002, 418)], (10, 12, 10, 6)), '#4f7a6a', dens=0.35, suave=3)  # wet stain
# the water seeps out along the seam and spills over the lip of the lower rock as a thin clear sheet
lamina = Poligono([(980, 398), (998, 404), (1010, 412), (1018, 432), (1012, 440), (1004, 424), (990, 412)])
lz.aguada(lamina, '#8fd0e4', dens=0.65, tapa=0.7, irreg=0.6, borde=0.9)
for k in range(3):
    lz.gouache(Trazo([(986 + k * 6, 404 + k * 2), (1000 + k * 5, 414 + k * 3), (1008 + k * 3, 434)], (1.2, 1.0, 0.6)),
               '#ffffff', alfa=0.8, irreg=0)
lz.luz(lamina, '#e8fbff', fuerza=0.35, suave=4)
for k in range(5):     # moss hanging wet over the seam
    hojita(lz, 960 + k * 9, 384 + k * 5, 7, -150 + k * 12, '#6f9a4a', tapa=0.7)
lz.aguada(Trazo([(1000, 412), (996, 426), (990, 440)], (4, 6, 8)), '#7fc0d8', dens=0.6, tapa=0.5)   # overflow to the river

# ------------------------------------------------------------------ the whale made of cloud (the sea inside)
WM = Marco(1190, 196, -172, 640, 1.0)      # snout at right, swims right; u -> tail (to the left)
W = lambda u, v: WM(u, v)
contorno_b = [(0, 0.02), (0.05, -0.06), (0.17, -0.12), (0.34, -0.14), (0.54, -0.115), (0.64, -0.12), (0.7, -0.09),
              (0.8, -0.055), (0.88, -0.03), (0.93, -0.03), (0.99, -0.14), (1.05, -0.17), (1.03, -0.1), (0.98, -0.01),
              (1.05, 0.08), (1.06, 0.15), (0.99, 0.1), (0.92, 0.03), (0.84, 0.04), (0.7, 0.085), (0.5, 0.14),
              (0.3, 0.16), (0.15, 0.135), (0.05, 0.08)]
BALLENA = Poligono([W(u, -v) for u, v in contorno_b])
puffs = []
for t in np.linspace(0.08, 0.86, 15):
    v_back = np.interp(t, [0.05, 0.17, 0.34, 0.54, 0.64, 0.7, 0.8, 0.88], [-0.06, -0.12, -0.14, -0.115, -0.12, -0.09, -0.055, -0.03])
    x, y = W(t, -v_back)
    puffs.append((x, y - rng.uniform(4, 16), rng.uniform(22, 42) * (1.1 - 0.5 * t)))
NUBE = Circulos(puffs) | BALLENA
lz.aguada(Elipse(840, 170, 420, 150, -4), '#f4dfb0', dens=0.14, suave=50, gran=0.05)    # a warm glow behind
# the cloud: white-gold where the sun touches it
lz.aguada(NUBE, '#dde8f0', dens=0.6, tapa=1, borde=0.8, irreg=1.3, gran=0.25, var=0.5, flor=2,
          toques=[(1000, 100, 120, '#f8dcb0', 0.7), (720, 110, 100, '#f4c8d0', 0.6), (1150, 210, 60, '#c8d6e8', 0.6),
                  (600, 160, 60, '#d8c8e8', 0.6)])
# the belly: deep, transparent sea, darker downward, lit from above
MAR = BALLENA & Poligono([(400, 150), (1300, 150), (1300, 400), (400, 400)], suave=False)
lz.aguada(MAR, '#2f7fa0', dens=0.75, borde=0.6, gran=0.45, desvanece=(900, 300, 900, 150),
          toques=[(800, 240, 90, '#1f5f88', 0.6), (1060, 240, 70, '#3f8fb0', 0.6), (680, 200, 50, '#3a8a9a', 0.6)])
for k, x0 in enumerate((700, 780, 870, 960, 1050)):          # shafts of light falling through the water
    rayo = Poligono([(x0, 150), (x0 + 22, 150), (x0 - 4, 290), (x0 - 30, 290)], suave=False) & BALLENA
    lz.levanta(rayo, 0.35, suave=6)
lz.luz(MAR & Poligono([(600, 150), (1200, 150), (1200, 210), (600, 210)], suave=False), '#e8fbff', fuerza=0.25, suave=12)
# creatures inside that volume
for k in range(16):
    t = rng.uniform(0, 1)
    x, y = 740 + t * 170 + rng.normal(0, 6), 196 + 14 * math.sin(t * 3.2) + rng.normal(0, 12)
    pececillo(lz, x, y, rng.uniform(4.6, 6.0), 8 * math.cos(t * 3.2) + rng.normal(0, 6),
              rng.choice(['#f0c25e', '#e8735e', '#f6e2a0', '#9fd8e0']), gouache=True)


def tortuga(x, y, s=1.0, ang=-10):
    """A small sea turtle: flippers, head, and a shell of hexagonal plates."""
    M_ = Marco(x, y, ang, s)
    for (u, v, a) in ((14, -14, -40), (14, 14, 40), (-14, -11, -140), (-14, 11, 140)):
        al = Elipse(*M_(u, v), 12 * s if u > 0 else 7 * s, 4 * s, ang + a)
        lz.aguada(al, '#7aa28a', dens=0.75, tapa=1, irreg=0.3)
        lz.contorno(al, '#3f5a4a', grosor=0.6, presion=0.5)
    cab = Elipse(*M_(24, 0), 6 * s, 5 * s, ang)
    lz.aguada(cab, '#8ab29a', dens=0.75, tapa=1, irreg=0.3)
    lz.contorno(cab, '#3f5a4a', grosor=0.6, presion=0.5)
    lz.aguada(Elipse(*M_(26, -2), 1.1 * s), '#1a1a1a', dens=1.0)
    capa = Elipse(*M_(0, 0), 20 * s, 15 * s, ang)
    lz.aguada(capa, '#b08a4a', dens=0.8, tapa=1, irreg=0.3, toques=[(*M_(-4, -4), 10 * s, '#d8b06a', 0.6)])
    hexs = [(0, 0)] + [(math.cos(math.radians(30 + 60 * k)) * 11, math.sin(math.radians(30 + 60 * k)) * 9) for k in range(6)]
    for (hu, hv) in hexs:
        h = Poligono([M_(hu + math.cos(math.radians(60 * k)) * 5.4, hv + math.sin(math.radians(60 * k)) * 4.6)
                      for k in range(6)], suave=False) & capa
        lz.aguada(h, '#c8a060', dens=0.45, irreg=0.2, borde=0.9)
        lz.contorno(h, '#5a4a2a', grosor=0.5, presion=0.5, cortes=0.05, desfase=0.05)
    lz.contorno(capa, '#5a4a2a', grosor=0.7, presion=0.55)


tortuga(930, 212, 1.3, -6)
alga = [spline([(760 + k * 22, 262), (766 + k * 22, 244), (756 + k * 22, 228), (764 + k * 22, 214)]) for k in range(3)]
lz.lapiz(alga, '#5fae7a', grosor=1.3, presion=0.7, temblor=0.4)
med = Elipse(1010, 180, 15, 11)
lz.aguada(med - Poligono([(990, 182), (1030, 182), (1030, 200), (990, 200)], suave=False), '#f0b0cc', dens=0.75, irreg=0.3)
lz.lapiz([spline([(1000 + k * 5, 182), (998 + k * 5, 196), (1003 + k * 5, 208)]) for k in range(5)], '#f0b0cc',
         grosor=0.6, presion=0.6, temblor=0.3)
lz.luz(med, '#ffd0e8', fuerza=0.4, suave=6)
for k in range(12):
    lz.lapiz([arco(rng.uniform(680, 1100), rng.uniform(190, 260), 2.2, 2.2, 0, 360, 10)], '#e8fbff', grosor=0.7,
             presion=0.6)
# head: mouth line, throat pleats, a gentle eye; the long humpback fin with its knobbly edge
lz.lapiz([spline([W(0.0, -0.01), W(0.07, 0.0), W(0.15, -0.035), W(0.2, -0.06)])], '#4f6a8a', grosor=1.1, presion=0.7)
pl = [spline([W(0.04 + k * 0.012, -0.075 - k * 0.012), W(0.2, -0.13 - k * 0.006), W(0.36 + k * 0.01, -0.15 + k * 0.004)])
      for k in range(4)]
lz.lapiz(pl, '#e8f4fb', grosor=0.8, presion=0.5, temblor=0.2)
aleta = Trazo([W(0.2, -0.1), W(0.3, -0.16), W(0.43, -0.2)], (30, 24, 7))
nudos = Circulos([(*W(0.21 + k * 0.03, -0.088 - k * 0.012), 4.0) for k in range(7)])
lz.aguada(aleta, '#d8e4ef', dens=0.6, tapa=1, irreg=0.5, toques=[(*W(0.4, -0.19), 20, '#8fa6c0', 0.6)])
lz.contorno(aleta, '#4f6a8a', grosor=0.8, presion=0.55, cortes=0.25)
ex, ey = W(0.12, 0.02)
lz.aguada(Elipse(ex, ey, 11, 7), '#f2f6fa', dens=0.5, tapa=0.8, irreg=0.2)
lz.lapiz([arco(ex, ey + 1, 9, 5, 200, 340, 12)], '#2b2a3a', grosor=1.9, presion=0.9, temblor=0.03)
lz.lapiz([arco(ex, ey - 2, 11, 8, 205, 335, 12)], '#6f86a8', grosor=0.7, presion=0.5)
for k in range(3):
    lz.lapiz([[(ex - 6 + k * 6, ey + 4), (ex - 8 + k * 7, ey + 9)]], '#2b2a3a', grosor=0.6, presion=0.6)
lz.aguada(Elipse(ex - 6, ey + 16, 10, 5), '#f08a8a', dens=0.4, suave=3)
lz.contorno(NUBE, '#6f86a8', grosor=0.9, presion=0.45, cortes=0.45, desfase=0.8)
lz.luz((950, 110, 120), '#ffe8c0', fuerza=0.25)

# rain: soft strokes of wash falling from the belly onto the spring
rngl = np.random.default_rng(31)
for k in range(30):
    x = rngl.uniform(830, 1150)
    y0 = float(np.interp(x, [700, 850, 1000, 1100, 1160], [262, 268, 262, 248, 232])) + rngl.uniform(2, 20)
    L = rngl.uniform(26, 60)
    if y0 + L > 372:
        L = max(10, 372 - y0)
    gota = Trazo([(x, y0), (x - L * 0.12, y0 + L)], (0.5, rngl.uniform(2.0, 3.0)))
    lz.aguada(gota, rngl.choice(['#8fc0e0', '#a0cce8', '#7fb0d8']), dens=0.4, irreg=0.3, borde=0.9, gran=0.1)
for k in range(18):
    x, y = rngl.uniform(840, 1140), rngl.uniform(300, 372)
    lz.aguada(Poligono([(x, y - 5), (x + 2.8, y + 1), (x, y + 4), (x - 2.8, y + 1)]), '#5f98c8', dens=0.8, irreg=0.2, borde=0.8)

# vapour rising from the pool back into the whale's tail: luminous wash that curls into little clouds,
# and, near the tail, into tiny fish of vapour swimming home
VAP = [bezier((300, 660), (210, 540), (310, 350), (500, 200), 40), bezier((380, 660), (340, 520), (440, 360), (540, 230), 40),
       bezier((250, 680), (140, 540), (230, 320), (470, 150), 40)]
for k, v in enumerate(VAP):
    q = remuestrea(v, 3)
    tt = np.linspace(0, 1, len(q))
    v = q + np.stack([np.sin(tt * 14 + k * 2) * 14 * tt, np.zeros(len(q))], 1)
    lz.aguada(Trazo(v[::4], (6, 26, 40, 34, 26)), ('#c8dcee', '#d8e6f2', '#c0d6ea')[k], dens=0.5, suave=10, gran=0.1)
    lz.luz(Trazo(v[::4], (6, 22, 28, 20)), '#f4fbff', fuerza=0.25, suave=10)
    for j in range(6, len(v) - 6, 14):      # curls of steam
        lz.lapiz([arco(v[j][0] + 8, v[j][1], 6 + 4 * tt[j], 5, 90, 330, 14)], '#a8c0d8', grosor=0.6, presion=0.45)
    q = v
    for j in (int(len(q) * 0.35), int(len(q) * 0.55)):
        x, y = q[j]
        nub = Circulos([(x - 9, y + 2, 9), (x + 2, y - 4, 11), (x + 12, y + 3, 8)])
        lz.aguada(nub, '#dce8f2', dens=0.6, tapa=0.6, irreg=1.2, borde=0.8, toques=[(x, y - 4, 10, '#fff8e8', 0.6)])
    for j in range(int(len(q) * 0.72), len(q) - 2, 9):
        d = q[j + 1] - q[j - 1]
        pececillo(lz, q[j][0] + rng.normal(0, 4), q[j][1] + rng.normal(0, 4), 6.5,
                  math.degrees(math.atan2(d[1], d[0])), '#9cc4dc', gouache=False)

# ------------------------------------------------------------------ the wetland: reeds and a heron in the shallows (day 15)
for k in range(18):
    x = rng.uniform(190, 280)
    y = 770 + rng.uniform(-20, 40)
    h = rng.uniform(40, 90)
    lz.lapiz([bezier((x, y), (x + rng.normal(0, 4), y - h * 0.5), (x + rng.normal(0, 10), y - h), n=14)], '#5f7f45',
             grosor=1.0, presion=0.65, temblor=0.2)
    if k % 3 == 0:
        enea = Trazo([(x + 1, y - h * 0.86), (x + 2, y - h * 0.7)], (5, 5))
        lz.aguada(enea, '#8a5a3a', dens=0.85, irreg=0.2)


def garza(x, y, s=1.0):
    """A grey heron standing in the shallows, neck folded, looking down at the water."""
    P = lambda pts: [(x + px * s, y + py * s) for px, py in pts]
    for lx in (-4, 6):
        pata = Trazo(P([(lx, 2), (lx + 1, 24), (lx + 2, 34), (lx + 3, 46)]), (3.2, 2.6, 3.0, 2.4))
        lz.aguada(pata, '#a88a5a', dens=0.85, tapa=1, irreg=0.1)
        lz.lapiz([spline(P([(lx - 1.4, 2), (lx - 0.4, 24), (lx + 0.6, 34), (lx + 1.6, 46)]))], '#5a4a3a', grosor=0.6,
                 presion=0.7)
        lz.lapiz([arco(*P([(lx + 1, 34)])[0], 2, 1.2, 0, 360, 10)], '#5a4a3a', grosor=0.5, presion=0.6)   # the joint
    cuerpo = Poligono(P([(-30, -8), (-8, -22), (18, -20), (30, -8), (20, 4), (-6, 6), (-34, 12)]))
    volumen(lz, cuerpo, '#b8c0c8', dens=0.6, luz=(-0.5, -1), brillo=0.25, lapiz='#5a6070')
    ala = Poligono(P([(-28, -6), (0, -16), (22, -12), (0, 0), (-36, 14)]))
    lz.aguada(ala, '#7f8a98', dens=0.6, irreg=0.4)
    lz.lapiz([[P([(-30 + k * 7, 6)])[0], P([(-36 + k * 7, 14)])[0]] for k in range(4)], '#4a5060', grosor=0.6, presion=0.5)
    cuello_ = Trazo(P([(16, -16), (24, -36), (16, -50), (24, -62)]), (9 * s, 7 * s, 6 * s, 6 * s))
    lz.aguada(cuello_, '#eceef0', dens=0.5, tapa=1, irreg=0.3)
    lz.contorno(cuello_, '#5a6070', grosor=0.7, presion=0.5)
    lz.lapiz([[P([(20, -40)])[0], P([(22, -30)])[0]]], '#3a3a4a', grosor=0.8, presion=0.6)
    cab = Elipse(*P([(28, -64)])[0], 7 * s, 5.5 * s, 10)
    lz.aguada(cab, '#eceef0', dens=0.5, tapa=1)
    lz.contorno(cab, '#5a6070', grosor=0.7, presion=0.5)
    lz.lapiz([[P([(24, -66)])[0], P([(8, -70)])[0]]], '#2a2a3a', grosor=1.6, presion=0.8)      # black crest
    pico = Poligono(P([(33, -66), (56, -56), (33, -61)]), suave=False)
    lz.aguada(pico, '#e8b03a', dens=0.9, tapa=1, irreg=0.1)
    lz.aguada(Elipse(*P([(29, -65)])[0], 1.3 * s), '#2a1a14', dens=1.0)
    # its legs stand in the water: a glaze over the lower legs and rings where they enter
    lz.aguada(Elipse(*P([(2, 42)])[0], 20 * s, 7 * s), '#4f98c0', dens=0.3, suave=4)
    for lx in (-4, 6):
        lz.lapiz([arco(*P([(lx + 3, 36)])[0], 6 * s, 1.8 * s, 0, 360, 18), arco(*P([(lx + 3, 37)])[0], 11 * s, 3 * s, 20, 160, 18)],
                 '#e8f6fb', grosor=0.8, presion=0.7)
        lz.lapiz([[P([(lx + 2.5, 38)])[0], P([(lx + 3.5, 46)])[0]]], '#7a6a5a', grosor=0.5, presion=0.35)   # legs seen through water


garza(304, 676, 1.5)

# ------------------------------------------------------------------ the girl floating on her back (baño sensorial, day 24)
F = Marco(520, 732, -8, 1.0)
# hair fanning out in the water, with tiny fish swimming through it
_aa = np.radians(np.linspace(75, 285, 40))
_rr = 64 + 9 * np.sin(_aa * 7) + 5 * np.sin(_aa * 13 + 1)
abanico = Poligono([F(-96, 0)] + [F(-96 + math.cos(t) * r_, math.sin(t) * r_ * 0.95) for t, r_ in zip(_aa, _rr)])
lz.aguada(abanico, '#8a4228', dens=0.6, irreg=0.9, tapa=0.5, borde=0.9, gran=0.4,
          toques=[(*F(-140, -20), 30, '#b0603a', 0.6), (*F(-130, 30), 25, '#5a2a1a', 0.5)])
mech = []
for k in range(16):
    t0 = math.radians(80 + k * 13)
    pts = [F(-96 + math.cos(t0) * 14, math.sin(t0) * 14), F(-96 + math.cos(t0 + 0.15) * 36, math.sin(t0 + 0.15) * 36),
           F(-96 + math.cos(t0 + 0.05) * 56, math.sin(t0 + 0.05) * 54), F(-96 + math.cos(t0 + 0.2) * 70, math.sin(t0 + 0.2) * 66)]
    mech.append(spline(pts))
lz.lapiz(mech, '#5a2a1a', grosor=0.6, presion=0.45, temblor=0.4, cortes=0.2)
lz.lapiz(mech[::3], '#d8905a', grosor=0.6, presion=0.4, temblor=0.4)
for k in range(4):
    pececillo(lz, *F(-150 + k * 10, -40 + k * 14), 3.4, 80, '#f0c25e', gouache=False)
# arms open like a star, legs gently apart
BRAZOS = [[F(-60, -18), F(-50, -42), F(-32, -64), F(-22, -80), F(-6, -94)],
          [F(-60, 18), F(-46, 40), F(-30, 60), F(-16, 76), F(2, 88)]]
for pts in BRAZOS:
    miembro(lz, pts, (17, 15, 11, 12, 9.5), 'piel4', lado=1, lapiz=PIEL_LP)
mano(lz, *F(-6, -94), -60, 24, 'piel4', 'abierta', lado=1)
mano(lz, *F(2, 88), 56, 24, 'piel4', 'abierta', lado=-1)
PIERNAS = [[F(30, -12), F(60, -20), F(88, -20), F(114, -28), F(138, -30)],
           [F(30, 12), F(60, 20), F(86, 30), F(112, 30), F(138, 38)]]
for pts in PIERNAS:
    miembro(lz, pts, (25, 22, 16, 17, 12), 'piel4', lado=-1, lapiz=PIEL_LP)
    lz.lapiz([arco(*pts[2], 5, 3, 200, 340, 8)], PIEL_LP, grosor=0.6, presion=0.45)            # knee
for (x, y, a) in (F(146, -32) + (-10,), F(146, 40) + (12,)):
    pie = Elipse(x, y, 11, 6, a)
    lz.aguada(pie, 'piel4', dens=0.6, tapa=1, irreg=0.3)
    lz.contorno(pie, PIEL_LP, grosor=0.7, presion=0.5)
# swimsuit: coral with white dots
traje = [F(-66, -22), F(-44, -27), F(-20, -22), F(2, -20), F(26, -22), F(40, -12), F(42, 4), F(36, 18), F(14, 22),
         F(-6, 20), F(-28, 26), F(-50, 28), F(-68, 20), F(-74, 0)]
prenda(lz, traje, CORAL, luz=(-0.3, -1), pliegues=[[F(-40, -14), F(-20, -8), F(4, -12)], [F(-50, 12), F(-30, 16), F(-10, 10)],
                                                   [F(20, 6), F(34, 10)], [F(-62, -6), F(-56, 6)]])
lz.aguada(Trazo([F(36, -14), F(30, 0), F(36, 14)], (6, 6, 6)) & Poligono(traje), '#c34a3e', dens=0.5, suave=2)
for (u, v) in ((-50, -12), (-36, 8), (-16, -18), (0, 6), (18, -6), (24, 14), (-56, 10)):
    lz.gouache(Elipse(*F(u, v), 2.0), '#fff3e0', alfa=0.9, irreg=0)
cuello(lz, F(-102, 0), 30, F(-68, 0), piel='piel4', ancho=0.42)
cara(lz, *F(-102, 0), 30, piel='piel4', pelo='#7a3a2a', peinado='corto', giro=0.0, ang=-98, ojos='cerrados',
     boca='sonrisa', orejas=True, semilla=81)
# the water laps over her: a glaze across the edges of her body, a ring of ripples
borde_agua = Elipse(*F(10, 0), 180, 115, -8) - Elipse(*F(10, 0), 150, 90, -8)
lz.aguada(borde_agua & rio, '#5fa8c8', dens=0.25, suave=6, gran=0.1)
rr3 = np.random.default_rng(33)
ondas = []
for k in range(3):
    a0 = rr3.uniform(0, 60)
    ondas.append(arco(*F(14, 0), 175 + k * 16, 112 + k * 11, a0, a0 + 300, 80, -8))
lz.lapiz(ondas, '#2f6f94', grosor=0.7, presion=0.45, cortes=0.35, temblor=0.4)
lz.lapiz(ondas[:2], '#e8f6fb', grosor=0.9, presion=0.6, cortes=0.5, temblor=0.4)
for pts in BRAZOS + PIERNAS:            # light glancing off wet skin
    q = np.asarray(pts)
    lz.gouache(Trazo([tuple(q[1] + (0, -3)), tuple(q[3] + (0, -3))], (1.4, 0.8)), '#fff8ee', alfa=0.7, irreg=0.3)
for pts in (BRAZOS[0][1:4], PIERNAS[1][1:4]):     # the surface laps across her limbs
    q = np.asarray(pts)
    lz.lapiz([q + (0, 6)], '#e8f6fb', grosor=0.8, presion=0.6, temblor=0.3, cortes=0.3)

# ------------------------------------------------------------------ the boy, leaping from a stone into the pool
PIEDRA = (690, 592)
pied = Elipse(*PIEDRA, 44, 22, 8)
volumen(lz, pied, '#b8aa98', dens=0.7, luz=(-0.6, -0.8), brillo=0.3, lapiz='#6e5e50',
        toques=[(PIEDRA[0] - 10, PIEDRA[1] - 12, 22, '#8fae6a', 0.6)])
lz.aguada(Elipse(PIEDRA[0] - 30, PIEDRA[1] + 14, 30, 6), '#2f6f94', dens=0.25, suave=4)
lz.lapiz([bezier((680, 566), (676, 480), (650, 430), n=20), bezier((694, 568), (692, 486), (668, 436), n=20)], '#a89a8a',
         grosor=0.7, presion=0.45, temblor=0.1, cortes=0.3)                     # his arc through the air
B = Marco(590, 440, 30, 1.0, sx=-1)     # mirrored frame: he faces left, body tilted forward toward the pool
SPL = (585, 662)
lz.aguada(Elipse(SPL[0] + 10, SPL[1] - 2, 42, 9), '#2f6f94', dens=0.3, suave=6)     # his shadow on the water
miembro(lz, [B(6, 40), B(-14, 82), B(-44, 112)], (24, 18, 13), 'piel2', lado=-1, lapiz=PIEL_LP)
pie = Elipse(*B(-52, 118), 13, 6.5, 180 - (30 + 200))
lz.aguada(pie, 'piel2', dens=0.6, tapa=1, irreg=0.3)
lz.contorno(pie, PIEL_LP, grosor=0.7, presion=0.5)
miembro(lz, [B(14, -28), B(40, -60), B(52, -100)], (14, 12, 10), 'piel2', lado=1, lapiz=PIEL_LP)
mano(lz, *B(52, -100), 180 - (30 - 70), 22, 'piel2', 'abierta', lado=-1)
torso_b = [B(-20, -36), B(0, -40), B(20, -34), B(22, 0), B(18, 34), B(-16, 36), B(-22, 0)]
prenda(lz, torso_b, 'piel2', luz=(-0.5, -1), lapiz=PIEL_LP, pliegues=[[B(-6, 10), B(4, 14), B(12, 10)],
                                                                     [B(-10, -20), B(0, -16), B(10, -20)]])
# swim shorts: teal and white stripes, a waistband and a drawstring bow
short = [B(-18, 24), B(20, 24), B(26, 56), B(6, 60), B(2, 46), B(-4, 58), B(-22, 54)]
prenda(lz, short, '#2f8f94', luz=(-0.5, -1), pliegues=[[B(2, 30), B(2, 46)]])
for k in range(4):
    lz.aguada(Trazo([B(-14 + k * 11, 30), B(-12 + k * 11, 54)], (3.5, 3.5)) & Poligono(short), '#f6f0e4', dens=0.6,
              tapa=0.7, irreg=0.2)
lz.aguada(Trazo([B(-18, 26), B(20, 26)], (5, 5)), '#1f6f74', dens=0.85, tapa=1)
lz.lapiz([[B(0, 28), B(-6, 36)], [B(0, 28), B(6, 36)]], '#f6f0e4', grosor=0.8, presion=0.8)
miembro(lz, [B(10, 48), B(52, 40), B(50, 84)], (25, 19, 14), 'piel2', lado=1, lapiz=PIEL_LP)
pie2 = Elipse(*B(56, 90), 13, 6.5, 180 - (30 + 20))
lz.aguada(pie2, 'piel2', dens=0.6, tapa=1, irreg=0.3)
lz.contorno(pie2, PIEL_LP, grosor=0.7, presion=0.5)
cuello(lz, B(-2, -68), 30, B(0, -40), piel='piel2', ancho=0.45)
cara(lz, *B(-2, -68), 30, piel='piel2', pelo='#2a1a14', peinado='rizos', giro=-0.35, ang=20, ojos='cerrados',
     boca='risa', semilla=91)
miembro(lz, [B(-16, -30), B(-30, -72), B(-20, -114)], (15, 12.5, 10), 'piel2', lado=-1, lapiz=PIEL_LP)
mano(lz, *B(-20, -114), 180 - (30 - 85), 23, 'piel2', 'abierta', lado=1)
# the pool already jumps up to meet him: a crown of splash, drops and rings
lz.aguada(Elipse(SPL[0], SPL[1] + 4, 52, 13), '#e8f6fb', dens=0.4, tapa=0.6, irreg=0.8, borde=0.9)   # foam
corona = Poligono([(SPL[0] - 44, SPL[1] + 6)] + [(SPL[0] + math.cos(math.radians(a)) * 42,
                   SPL[1] + 2 + math.sin(math.radians(a)) * (26 if k % 2 == 0 else 12)) for k, a in enumerate(range(190, 351, 16))]
                  + [(SPL[0] + 44, SPL[1] + 6), (SPL[0], SPL[1] + 10)])
lz.aguada(corona, '#9fd8ea', dens=0.55, tapa=0.7, irreg=0.8, borde=0.9, toques=[(SPL[0], SPL[1] - 6, 24, '#e8f8ff', 0.7)])
lz.contorno(corona, '#3f8fb0', grosor=0.7, presion=0.5, cortes=0.3)
for k, a in enumerate(range(195, 346, 15)):
    r = 40 + (k % 3) * 10
    tip = (SPL[0] + math.cos(math.radians(a)) * r, SPL[1] + math.sin(math.radians(a)) * r * 0.9)
    lz.aguada(Trazo([(SPL[0] + math.cos(math.radians(a)) * 24, SPL[1] - 2), tip], (5, 1.8)), '#8fcfe0', dens=0.7, tapa=0.6,
              irreg=0.3)
    lz.gouache(Elipse(*tip, 2.0), '#ffffff', alfa=0.9, irreg=0)
for k in range(14):
    a = math.radians(rng.uniform(200, 340))
    r = rng.uniform(30, 60)
    x, y = SPL[0] + math.cos(a) * r * 1.3, SPL[1] + math.sin(a) * r * 0.9
    lz.aguada(Elipse(x, y, rng.uniform(2, 4)), '#8fcfe0', dens=0.8, irreg=0.3, borde=0.8)
lz.lapiz([arco(SPL[0], SPL[1] + 4, 40, 9, 0, 360, 30), arco(SPL[0], SPL[1] + 6, 60, 14, 0, 360, 30)], '#e8f6fb',
         grosor=1.0, presion=0.6)

# ------------------------------------------------------------------ the grandmother filling a clay pitcher at the spring
# and the child drinking a glass of clean water (a human right, day 22), her canteen slung across her (day 13)
lz.aguada(Elipse(1160, 640, 110, 13), '#b0a080', dens=0.3, suave=8)              # shadow on the grass
# skirt: kneeling, sitting back on her heels; the knee rests on the ground in front
falda = [(1092, 528), (1160, 516), (1206, 540), (1226, 586), (1232, 626), (1180, 634), (1110, 636), (1068, 630),
         (1066, 606), (1090, 586)]
prenda(lz, falda, '#8d73b0', luz=(-0.5, -1),
       pliegues=[[(1104, 540), (1090, 584), (1070, 616)], [(1150, 540), (1160, 590), (1166, 630)],
                 [(1200, 552), (1214, 600)], [(1074, 600), (1100, 612), (1130, 610)]])
for (x, y) in puntos_dentro(Poligono(falda), 16, 2, margen=6):    # a sprig pattern on the skirt
    flor_simple(lz, x, y, 4.6, rng.choice(['#f6c8d8', '#fff3e0', ORO]), centro=CARMIN)
for x in (1206, 1220):     # toes peeking from under the hem, behind
    lz.aguada(Elipse(x, 634, 7, 4), 'piel1', dens=0.6, tapa=1, irreg=0.2)
    lz.contorno(Elipse(x, 634, 7, 4), PIEL_LP, grosor=0.6, presion=0.5)
# far arm: hand under the pitcher's base
miembro(lz, [(1120, 440), (1088, 498), (1044, 494)], (20, 16, 13), TEAL, lado=1, pliegues=2)
blusa = [(1094, 438), (1130, 418), (1168, 428), (1188, 470), (1192, 530), (1150, 540), (1095, 530), (1080, 488)]
cuello_natural(lz, 1100, 380, 40, 'piel1', (1122, 432), 70, giro=-0.55, inclina=16)
prenda(lz, blusa, TEAL, luz=(-0.6, -1), pliegues=[[(1120, 470), (1140, 500), (1160, 520)], [(1100, 500), (1112, 528)],
                                                 [(1150, 440), (1166, 462)]])
cara(lz, 1100, 380, 40, piel='piel1', pelo='#e6e2de', peinado='mono', canas=True, giro=-0.55, ang=16,
     ojos='cerrados', boca='sonrisa', semilla=71)
# the pitcher: pale clay with a painted band, its mouth under the clear jet
CM = Marco(1032, 466, -28, 1.0)
cuerpo_c = Poligono([CM(-10, -30), CM(10, -30), CM(14, -20), CM(26, -6), CM(28, 14), CM(16, 30), CM(-16, 30),
                     CM(-28, 14), CM(-26, -6), CM(-14, -20)])
volumen(lz, cuerpo_c, '#e6b48a', dens=0.75, luz=(-0.8, -0.6), brillo=0.4, lapiz='#8a4a2e',
        toques=[(*CM(12, 16), 16, '#c88a5e', 0.6)])
lz.aguada(Trazo([CM(-27, 2), CM(0, 6), CM(27, 2)], (5, 6, 5)) & cuerpo_c, '#3f8f94', dens=0.7, irreg=0.2)
for k in range(5):
    lz.gouache(Elipse(*CM(-20 + k * 10, 5), 1.4), '#fff3e0', alfa=0.9, irreg=0)
boca_c = Elipse(*CM(0, -30), 11, 4, -28)
lz.aguada(boca_c, '#7a3a22', dens=0.8, tapa=1, irreg=0.2)
lz.contorno(boca_c, '#8a4a2e', grosor=0.7, presion=0.55)
lz.aguada(Elipse(*CM(0, -29), 6, 2.2, -28), '#8fcfe0', dens=0.7, irreg=0.2)          # water already in it
asa = Trazo([CM(22, -16), CM(36, -10), CM(32, 10)], (4.5, 4.5, 4))
lz.aguada(asa, '#d8a07a', dens=0.8, tapa=1, irreg=0.2)
lz.contorno(asa, '#8a4a2e', grosor=0.6, presion=0.5)
# near arm holding the handle
miembro(lz, [(1160, 440), (1112, 486), (1066, 470)], (22, 18, 14), TEAL, lado=-1, pliegues=3)
mano(lz, 1066, 470, -175, 30, 'piel1', 'agarra', lado=-1)
mano(lz, 1046, 494, -170, 28, 'piel1', 'cuenco', lado=1)

# the child, standing, drinking from a glass with both hands, head tilted back
NI = (1310, 640)
for (hip, kn, an) in (((1300, 560), (1296, 600), (1292, 640)), ((1318, 560), (1322, 600), (1326, 642))):
    miembro(lz, [hip, kn, an], (17, 14, 11), 'piel5', lado=1, lapiz=PIEL_LP)
    lz.lapiz([arco(kn[0], kn[1], 5, 3, 200, 340, 8)], PIEL_LP, grosor=0.6, presion=0.45)
for x in (1290, 1330):
    z = Elipse(x, 646, 12, 6)
    lz.aguada(z, ORO, dens=0.8, tapa=1, irreg=0.3)
    lz.contorno(z, '#8a6a2a', grosor=0.7, presion=0.5)
cuello_natural(lz, 1300, 432, 32, 'piel5', (1308, 470), 48, giro=-0.3, inclina=-26)
vestido = [(1288, 470), (1330, 468), (1340, 500), (1350, 560), (1356, 578), (1280, 580), (1282, 540), (1280, 500)]
prenda(lz, vestido, '#f0b030', luz=(-0.6, -1), pliegues=[[(1300, 520), (1296, 574)], [(1326, 520), (1336, 574)],
                                                        [(1318, 496), (1330, 512)]])
lz.lapiz([[(1330, 470), (1288, 548)]], '#7a4a2e', grosor=2.0, presion=0.85)          # the canteen's strap
cant = Elipse(1286, 560, 14, 17, 10)
volumen(lz, cant, '#9fb6c0', dens=0.75, luz=(-0.8, -0.6), brillo=0.45, lapiz='#4a5a66')
lz.aguada(Elipse(1286, 562, 7, 8, 10), CORAL, dens=0.5, irreg=0.2)
lz.aguada(Elipse(1288, 542, 5, 3), '#5a6a76', dens=0.85, tapa=1)
for (x, y) in ((1300, 500), (1324, 530), (1306, 555), (1336, 556), (1290, 540)):
    lz.gouache(Elipse(x, y, 2.4), '#fff3e0', alfa=0.9, irreg=0)
cara(lz, 1300, 432, 32, piel='piel5', pelo='#1e1410', peinado='rizos', giro=-0.3, ang=-26, ojos='cerrados',
     boca='suave', semilla=61)
# the glass at her lips, with both hands
vaso = Poligono([(1294, 438), (1316, 444), (1310, 476), (1292, 472)], suave=False)
lz.aguada(vaso, '#cfe8f0', dens=0.4, tapa=1, irreg=0.2)
lz.aguada(Poligono([(1293, 450), (1314, 455), (1310, 476), (1292, 472)], suave=False), '#6fb8d8', dens=0.6, irreg=0.2)
lz.contorno(vaso, '#4a6a7a', grosor=0.7, presion=0.55)
lz.gouache(Trazo([(1298, 444), (1296, 466)], (1.4, 1.2)), '#ffffff', alfa=0.8, irreg=0)
miembro(lz, [(1292, 480), (1280, 510), (1294, 482)], (13, 11, 9), 'piel5', lado=1, lapiz=PIEL_LP)
mano(lz, 1294, 482, -70, 19, 'piel5', 'agarra', lado=1)
miembro(lz, [(1330, 480), (1328, 512), (1312, 482)], (13, 11, 9), 'piel5', lado=-1, lapiz=PIEL_LP)
mano(lz, 1312, 482, -105, 19, 'piel5', 'agarra', lado=-1)

# ------------------------------------------------------------------ small things with intention
# a pair of dragon... no: a kingfisher darting along the river, a flash of turquoise and orange
pajaro(lz, 360, 560, 19, '#2f9cb0', ang=170, alas='arriba', vientre='#f0a050')
# blue wildflowers and mint at the bank by the spring
for (x, y) in ((1180, 660), (1215, 668), (1250, 662), (980, 492), (950, 500)):
    lz.lapiz([[(x, y), (x + rng.normal(0, 3), y - 18)]], '#4f6f45', grosor=0.8, presion=0.6)
    flor_simple(lz, x, y - 20, rng.uniform(4.5, 6.5), rng.choice(['#5f86c0', '#8d73b0', '#fff3e0']), centro=ORO)

lz.vineta(margen=26)
lz.guardar(SALIDA)
print('ok', SALIDA)
