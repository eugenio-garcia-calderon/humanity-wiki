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
RIO = [(1000, 432), (910, 440), (826, 460), (764, 512), (775, 580), (720, 650), (600, 705), (470, 735), (360, 728),
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

# ------------------------------------------------------------------ the spring: mossy rocks and a stone spout
ROCAS = [(930, 398, 46, 30), (972, 382, 34, 26), (896, 378, 30, 22), (966, 414, 28, 18)]
for (x, y, rx, ry) in ROCAS:
    roca = Elipse(x, y, rx, ry, rng.uniform(-10, 10))
    volumen(lz, roca, '#b8aa98', dens=0.65, luz=(-0.6, -0.8), brillo=0.25, lapiz='#6e5e50',
            toques=[(x - rx * 0.3, y - ry * 0.5, rx * 0.5, '#8fae6a', 0.65)])
    for k in range(6):
        hx, hy = x + rng.uniform(-rx, rx) * 0.7, y - ry * rng.uniform(0.4, 0.9)
        hojita(lz, hx, hy, rng.uniform(6, 10), rng.uniform(-150, -30), '#5f8f63', tapa=0.6)
# the spout and its arc of clear water
cano = Trazo([(980, 384), (1006, 388)], (8, 7))
lz.aguada(cano, '#a8744a', dens=0.8, tapa=1, irreg=0.2)
lz.contorno(cano, '#6e4630', grosor=0.7, presion=0.6)
CHORRO = bezier((1006, 388), (1018, 390), (1012, 410), (1010, 432), 20)
lz.aguada(Trazo(CHORRO, (5, 4.5, 4)), '#8fcfe0', dens=0.7, tapa=0.6, irreg=0.2)
lz.gouache(Trazo(CHORRO[2:-3] + (1, 0), (1.4, 1.0)), '#ffffff', alfa=0.85, irreg=0)

# ------------------------------------------------------------------ the whale made of cloud (sea inside)
WM = Marco(1190, 196, -172, 640, 1.0)      # snout at right, swims right; u -> tail (to the left)
W = lambda u, v: WM(u, v)
contorno_b = [(0, 0.02), (0.05, -0.06), (0.17, -0.12), (0.34, -0.14), (0.54, -0.115), (0.64, -0.12), (0.7, -0.09),
              (0.8, -0.055), (0.88, -0.03), (0.93, -0.03), (0.99, -0.14), (1.05, -0.17), (1.03, -0.1), (0.98, -0.01),
              (1.05, 0.08), (1.06, 0.15), (0.99, 0.1), (0.92, 0.03), (0.84, 0.04), (0.7, 0.085), (0.5, 0.14),
              (0.3, 0.16), (0.15, 0.135), (0.05, 0.08)]
# (v is mirrored by the 172 deg rotation: positive v is the back, up on the page)
BALLENA = Poligono([W(u, -v) for u, v in contorno_b])
# cumulus puffs along the back: it is a cloud
puffs = []
for t in np.linspace(0.08, 0.86, 15):
    i = int(t * 10)
    v_back = np.interp(t, [0.05, 0.17, 0.34, 0.54, 0.64, 0.7, 0.8, 0.88], [-0.06, -0.12, -0.14, -0.115, -0.12, -0.09, -0.055, -0.03])
    x, y = W(t, -v_back + 0.0)
    puffs.append((x, y - rng.uniform(4, 16), rng.uniform(22, 42) * (1.1 - 0.5 * t)))
NUBE = Circulos(puffs) | BALLENA
lz.aguada(Elipse(840, 170, 420, 150, -4), '#f4dfb0', dens=0.14, suave=50, gran=0.05)    # a warm glow behind
lz.aguada(NUBE, '#cfe0ec', dens=0.7, tapa=1, borde=0.8, irreg=1.3, gran=0.25, var=0.5, flor=2,
          toques=[(1000, 110, 120, '#f8dcb0', 0.7), (720, 110, 100, '#f4c8d0', 0.6), (900, 250, 150, '#7f9cc4', 0.7),
                  (1150, 210, 60, '#a8bcd8', 0.6), (600, 160, 60, '#d8c8e8', 0.6)])
# the heavy, rain-filled belly
lz.aguada(BALLENA, '#4f6f9f', dens=0.5, borde=0.3, desvanece=(900, 300, 900, 165), gran=0.45)
# the sea still lives inside the cloud: seaweed, a jellyfish, a shoal, bubbles
for k in range(9):
    x, y = 660 + k * 22 + rng.normal(0, 6), 160 + rng.normal(0, 10)
    pececillo(lz, x, y, rng.uniform(3.2, 4.2), 2 + rng.normal(0, 8), rng.choice(['#4f8fc0', '#3f8f94', '#e8735e']),
              gouache=False)
alga = [spline([(760 + k * 22, 252), (766 + k * 22, 232), (756 + k * 22, 214), (764 + k * 22, 198)]) for k in range(3)]
lz.lapiz(alga, '#4f8f6a', grosor=1.2, presion=0.6, temblor=0.4)
med = Elipse(990, 160, 15, 11)
lz.aguada(med - Poligono([(970, 162), (1010, 162), (1010, 180), (970, 180)], suave=False), '#e8a0c0', dens=0.7,
          irreg=0.3)
lz.lapiz([spline([(980 + k * 5, 162), (978 + k * 5, 176), (983 + k * 5, 188)]) for k in range(5)], '#c86a90',
         grosor=0.6, presion=0.55, temblor=0.3)
for k in range(10):
    lz.lapiz([arco(rng.uniform(640, 1100), rng.uniform(120, 230), 2.2, 2.2, 0, 360, 10)], '#f6fbff', grosor=0.7,
             presion=0.6)
# throat pleats, pectoral fin, eye
pl = [spline([W(0.04 + k * 0.012, -0.075 - k * 0.012), W(0.2, -0.13 - k * 0.006), W(0.36 + k * 0.01, -0.15 + k * 0.004)])
      for k in range(4)]
lz.lapiz(pl, '#6f86a8', grosor=0.8, presion=0.45, temblor=0.2)
aleta = Trazo([W(0.2, -0.1), W(0.3, -0.16), W(0.43, -0.2)], (30, 24, 7))
lz.aguada(aleta, '#c8d6e6', dens=0.6, tapa=1, irreg=0.6, toques=[(*W(0.4, -0.19), 20, '#8fa6c0', 0.6)])
lz.contorno(aleta, '#5f7898', grosor=0.8, presion=0.5, cortes=0.3)
ex, ey = W(0.12, 0.0)
lz.lapiz([arco(ex, ey, 7, 4, 200, 340, 12)], '#3b3a4a', grosor=1.4, presion=0.85, temblor=0.05)
lz.lapiz([[(ex - 6, ey + 1), (ex - 9, ey + 4)], [(ex, ey + 2), (ex, ey + 6)], [(ex + 6, ey + 1), (ex + 9, ey + 4)]],
         '#3b3a4a', grosor=0.6, presion=0.6)
lz.aguada(Elipse(ex - 4, ey + 12, 9, 5), '#e98a8a', dens=0.35, suave=3)
lz.contorno(NUBE, '#6f86a8', grosor=0.9, presion=0.45, cortes=0.45, desfase=0.8)
lz.luz((950, 110, 120), '#ffe8c0', fuerza=0.25)

# rain from the belly, slanting a little, over the spring
lluvia = []
for k in range(70):
    x = rng.uniform(800, 1160)
    y0 = sum(np.interp([x], [700, 850, 1000, 1100, 1160], [262, 268, 262, 248, 232])) + rng.uniform(4, 30)
    L = rng.uniform(14, 34)
    y1 = y0 + L
    if y1 > 360 and x > 1010:
        continue
    lluvia.append([(x, y0), (x - L * 0.18, y1)])
lz.lapiz(lluvia, '#5f86b0', grosor=0.7, presion=0.55, temblor=0.05, puntas=0.4)
for k in range(26):
    x, y = rng.uniform(820, 1150), rng.uniform(290, 370)
    gota = Poligono([(x, y - 5), (x + 2.6, y + 1), (x, y + 3.6), (x - 2.6, y + 1)])
    lz.aguada(gota, '#6fa8d8', dens=0.8, irreg=0.2, borde=0.7)

# vapour rising from the pool back into the whale's tail: soft spirals
VAP = [bezier((330, 640), (230, 520), (330, 330), (520, 180), 40), bezier((400, 660), (360, 520), (450, 340), (560, 220), 40),
       bezier((270, 670), (150, 540), (230, 300), (480, 130), 40)]
for k, v in enumerate(VAP):
    lz.aguada(Trazo(v, (4, 26, 40, 30)), ('#bcd6e8', '#dccbe8', '#cfe0ec')[k], dens=0.45, suave=10, gran=0.1)
    q = remuestrea(v, 3)
    t = np.linspace(0, 1, len(q))
    sp = q + np.stack([np.sin(t * 22 + k) * 7, np.cos(t * 22 + k) * 3], 1)
    lz.lapiz([sp], '#7f96b8', grosor=0.7, presion=0.5, temblor=0.2, cortes=0.25)

# ------------------------------------------------------------------ the wetland: reeds and a heron (day 15)
for k in range(26):
    x = rng.uniform(200, 290) if k < 16 else rng.uniform(560, 640)
    y = 760 + rng.uniform(-30, 40) if k < 16 else 790 + rng.uniform(-10, 30)
    h = rng.uniform(40, 90)
    lz.lapiz([bezier((x, y), (x + rng.normal(0, 4), y - h * 0.5), (x + rng.normal(0, 10), y - h), n=14)], '#5f7f45',
             grosor=1.0, presion=0.65, temblor=0.2)
    if k % 3 == 0:
        enea = Trazo([(x + 1, y - h * 0.86), (x + 2, y - h * 0.7)], (5, 5))
        lz.aguada(enea, '#8a5a3a', dens=0.85, irreg=0.2)


def garza(x, y, s=1.0):
    """A grey heron standing in the shallows, neck folded, looking down."""
    P = lambda pts: [(x + px * s, y + py * s) for px, py in pts]
    for lx in (-4, 6):
        lz.lapiz([[P([(lx, 0)])[0], P([(lx + 2, 46)])[0]]], '#6e5a4a', grosor=1.4, presion=0.8, temblor=0.1)
    cuerpo = Poligono(P([(-30, -8), (-8, -22), (18, -20), (30, -8), (20, 4), (-6, 6), (-34, 12)]))
    volumen(lz, cuerpo, '#b8c0c8', dens=0.6, luz=(-0.5, -1), brillo=0.25, lapiz='#5a6070')
    ala = Poligono(P([(-28, -6), (0, -16), (22, -12), (0, 0), (-36, 14)]))
    lz.aguada(ala, '#7f8a98', dens=0.6, irreg=0.4)
    cuello_ = Trazo(P([(16, -16), (24, -36), (16, -50), (24, -62)]), (9 * s, 7 * s, 6 * s, 6 * s))
    lz.aguada(cuello_, '#e6e8ea', dens=0.5, tapa=1, irreg=0.3)
    lz.contorno(cuello_, '#5a6070', grosor=0.7, presion=0.5)
    cab = Elipse(*P([(28, -64)])[0], 7 * s, 5.5 * s, 10)
    lz.aguada(cab, '#e6e8ea', dens=0.5, tapa=1)
    lz.contorno(cab, '#5a6070', grosor=0.7, presion=0.5)
    lz.lapiz([[P([(24, -66)])[0], P([(10, -70)])[0]]], '#2a2a3a', grosor=1.6, presion=0.8)      # black crest
    pico = Poligono(P([(33, -66), (54, -58), (33, -61)]), suave=False)
    lz.aguada(pico, '#e8b03a', dens=0.9, tapa=1, irreg=0.1)
    lz.aguada(Elipse(*P([(29, -65)])[0], 1.3 * s), '#2a1a14', dens=1.0)


garza(250, 700, 1.25)
lz.lapiz([arco(325, 760, 14, 4, 0, 360, 20), arco(325, 760, 24, 6, 20, 160, 20)], '#2f5f80', grosor=0.6, presion=0.45)

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
for (pts, w) in (([F(-58, -18), F(-30, -62), F(-4, -96)], (16, 13, 10)), ([F(-58, 18), F(-26, 58), F(4, 90)], (16, 13, 10))):
    miembro(lz, pts, w, 'piel4', lado=1, lapiz=PIEL_LP)
mano(lz, *F(-4, -96), -62, 24, 'piel4', 'abierta', lado=1)
mano(lz, *F(4, 90), 58, 24, 'piel4', 'abierta', lado=-1)
for (pts, w) in (([F(30, -12), F(84, -22), F(136, -30)], (24, 18, 13)), ([F(30, 12), F(84, 22), F(136, 34)], (24, 18, 13))):
    miembro(lz, pts, w, 'piel4', lado=-1, lapiz=PIEL_LP)
for (x, y, a) in (F(146, -32) + (-10,), F(146, 36) + (12,)):
    pie = Elipse(x, y, 11, 6, a)
    lz.aguada(pie, 'piel4', dens=0.6, tapa=1, irreg=0.3)
    lz.contorno(pie, PIEL_LP, grosor=0.7, presion=0.5)
# swimsuit: coral with white dots
traje = [F(-66, -24), F(-30, -30), F(10, -26), F(36, -18), F(40, 0), F(36, 18), F(10, 26), F(-30, 30), F(-66, 24),
         F(-72, 0)]
prenda(lz, traje, CORAL, luz=(-0.3, -1), pliegues=[[F(-40, -10), F(-10, -6), F(20, -8)]])
for (u, v) in ((-50, -12), (-36, 8), (-16, -18), (0, 6), (18, -6), (24, 14), (-56, 10)):
    lz.gouache(Elipse(*F(u, v), 2.0), '#fff3e0', alfa=0.9, irreg=0)
cuello(lz, F(-102, 0), 30, F(-68, 0), piel='piel4', ancho=0.42)
cara(lz, *F(-102, 0), 30, piel='piel4', pelo='#7a3a2a', peinado='corto', giro=0.0, ang=-98, ojos='cerrados',
     boca='sonrisa', orejas=True, semilla=81)
# the water laps over her: a glaze across the edges of her body, a ring of ripples
borde_agua = Elipse(*F(10, 0), 180, 115, -8) - Elipse(*F(10, 0), 150, 90, -8)
lz.aguada(borde_agua & rio, '#5fa8c8', dens=0.25, suave=6, gran=0.1)
lz.lapiz([arco(*F(10, 0), 160 + k * 16, 100 + k * 10, 0, 360, 80, -8) for k in range(2)], '#e8f6fb', grosor=0.8,
         presion=0.5, cortes=0.5)

# ------------------------------------------------------------------ the boy, leaping into the river
# he has just pushed off a rock on the bank: arms up, one knee high, the other leg trailing
RB = (545, 592)
roca_b = Elipse(*RB, 46, 22, -6)
volumen(lz, roca_b, '#b8aa98', dens=0.65, luz=(-0.6, -0.8), brillo=0.25, lapiz='#6e5e50',
        toques=[(RB[0] - 14, RB[1] - 12, 22, '#8fae6a', 0.6)])
lz.lapiz([arco(612, 520, 70, 60, 160, 230, 16), arco(618, 528, 52, 44, 160, 225, 14)], '#a89a8a', grosor=0.7,
         presion=0.45, temblor=0.1)                                   # his arc through the air
B = Marco(660, 455, -28, 1.0)          # torso frame: v along the body (head at -v), tilted forward
lz.aguada(Elipse(705, 655, 40, 9), '#2f6f94', dens=0.3, suave=6)                 # his shadow on the water
# trailing leg (behind)
miembro(lz, [B(6, 40), B(-14, 82), B(-44, 112)], (24, 18, 13), 'piel2', lado=1, lapiz=PIEL_LP)
pie = Elipse(*B(-52, 118), 13, 6.5, -28 + 200)
lz.aguada(pie, 'piel2', dens=0.6, tapa=1, irreg=0.3)
lz.contorno(pie, PIEL_LP, grosor=0.7, presion=0.5)
# far arm, up
miembro(lz, [B(14, -28), B(40, -60), B(52, -100)], (14, 12, 10), 'piel2', lado=-1, lapiz=PIEL_LP)
mano(lz, *B(52, -100), -28 - 70, 22, 'piel2', 'abierta', lado=1)
# torso and swim shorts
torso_b = [B(-20, -36), B(0, -40), B(20, -34), B(22, 0), B(18, 34), B(-16, 36), B(-22, 0)]
prenda(lz, torso_b, 'piel2', luz=(-0.5, -1), lapiz=PIEL_LP, pliegues=[[B(-6, 10), B(4, 14), B(12, 10)]])
short = [B(-18, 26), B(20, 26), B(24, 52), B(2, 56), B(-20, 50)]
prenda(lz, short, ORO, luz=(-0.5, -1), pliegues=[[B(2, 30), B(2, 50)]])
for (u, v) in ((-10, 36), (12, 40), (-4, 48)):
    lz.gouache(Elipse(*B(u, v), 2.0), CORAL, alfa=0.9, irreg=0)
# front leg, knee up
miembro(lz, [B(10, 48), B(52, 40), B(50, 84)], (25, 19, 14), 'piel2', lado=-1, lapiz=PIEL_LP)
pie2 = Elipse(*B(56, 90), 13, 6.5, -28 + 20)
lz.aguada(pie2, 'piel2', dens=0.6, tapa=1, irreg=0.3)
lz.contorno(pie2, PIEL_LP, grosor=0.7, presion=0.5)
cuello(lz, B(-2, -68), 30, B(0, -40), piel='piel2', ancho=0.45)
cara(lz, *B(-2, -68), 30, piel='piel2', pelo='#2a1a14', peinado='rizos', giro=0.35, ang=-20, ojos='cerrados',
     boca='risa', semilla=91)
# near arm, flung up
miembro(lz, [B(-16, -30), B(-30, -72), B(-20, -114)], (15, 12.5, 10), 'piel2', lado=1, lapiz=PIEL_LP)
mano(lz, *B(-20, -114), -28 - 85, 23, 'piel2', 'abierta', lado=-1)
# the water waiting for him: rings and drops already jumping up
for k in range(14):
    a = math.radians(rng.uniform(200, 340))
    r = rng.uniform(20, 55)
    x, y = 705 + math.cos(a) * r * 1.4, 655 + math.sin(a) * r * 0.7
    lz.aguada(Elipse(x, y, rng.uniform(2, 4)), '#8fcfe0', dens=0.8, irreg=0.3, borde=0.8)
lz.lapiz([arco(705, 657, 40, 9, 0, 360, 30), arco(705, 659, 58, 13, 0, 360, 30)], '#e8f6fb', grosor=1.0, presion=0.6)

# ------------------------------------------------------------------ the grandmother refilling a canteen at the spring (day 13)
# and the child drinking a glass of clean water (a human right, day 22)
GB = (1100, 600)            # her knees on the bank
lz.aguada(Elipse(1170, 640, 120, 14), '#b0a080', dens=0.3, suave=8)              # shadow on the grass
# skirt: kneeling, sitting back on her heels
falda = [(1085, 530), (1160, 518), (1205, 545), (1235, 600), (1240, 628), (1150, 636), (1078, 630), (1070, 600)]
prenda(lz, falda, '#8d73b0', luz=(-0.5, -1),
       pliegues=[[(1120, 540), (1110, 590), (1100, 625)], [(1160, 545), (1175, 595), (1180, 628)],
                 [(1200, 560), (1222, 610)]])
for (x, y) in puntos_dentro(Poligono(falda), 16, 2, margen=6):    # a sprig pattern on the skirt
    flor_simple(lz, x, y, 3.2, rng.choice(['#f6c8d8', '#fff3e0', ORO]), centro=CARMIN)
# far arm (supports the canteen from below)
miembro(lz, [(1120, 440), (1078, 492), (1030, 470)], (20, 16, 13), TEAL, lado=1, pliegues=2)
mano(lz, 1030, 470, -150, 30, 'piel1', 'cuenco', lado=1)
# blouse
blusa = [(1094, 438), (1130, 418), (1168, 428), (1188, 470), (1192, 530), (1150, 540), (1095, 530), (1080, 488)]
prenda(lz, blusa, TEAL, luz=(-0.6, -1), pliegues=[[(1120, 470), (1140, 500), (1160, 520)], [(1100, 500), (1112, 528)]])
cuello(lz, (1100, 380), 40, (1118, 428), piel='piel1', ancho=0.45)
cara(lz, 1100, 380, 40, piel='piel1', pelo='#e6e2de', peinado='mono', canas=True, giro=-0.55, ang=16,
     ojos='abajo' if False else 'cerrados', boca='sonrisa', gafas=False, semilla=71)
# the canteen under the spout, water pouring in
cant = Elipse(1010, 452, 17, 22, -15)
volumen(lz, cant, '#9fb6c0', dens=0.7, luz=(-0.8, -0.6), brillo=0.4, lapiz='#4a5a66')
lz.aguada(Trazo([(1000, 436), (1004, 428)], (9, 9)), '#6a7a86', dens=0.8, tapa=1)
lz.aguada(Elipse(1012, 456, 9, 11, -15), CORAL, dens=0.5, irreg=0.2)              # a painted fish on it
# near arm holding the canteen
miembro(lz, [(1160, 440), (1100, 476), (1036, 446)], (22, 18, 14), TEAL, lado=-1, pliegues=3)
mano(lz, 1036, 446, -160, 30, 'piel1', 'agarra', lado=-1)

# the child, standing, drinking from a glass with both hands, head tilted back
NI = (1310, 640)
for (hip, kn, an) in (((1300, 560), (1296, 600), (1292, 640)), ((1318, 560), (1322, 600), (1326, 642))):
    miembro(lz, [hip, kn, an], (17, 14, 11), 'piel5', lado=1, lapiz=PIEL_LP)
for x in (1290, 1330):
    z = Elipse(x, 646, 12, 6)
    lz.aguada(z, ORO, dens=0.8, tapa=1, irreg=0.3)
    lz.contorno(z, '#8a6a2a', grosor=0.7, presion=0.5)
vestido = [(1288, 470), (1330, 468), (1340, 500), (1350, 560), (1356, 578), (1280, 580), (1282, 540), (1280, 500)]
prenda(lz, vestido, '#f0b030', luz=(-0.6, -1), pliegues=[[(1300, 520), (1296, 574)], [(1326, 520), (1336, 574)]])
for (x, y) in ((1300, 500), (1324, 530), (1306, 555), (1336, 556), (1290, 540)):
    lz.gouache(Elipse(x, y, 2.4), '#fff3e0', alfa=0.9, irreg=0)
cuello(lz, (1300, 432), 32, (1308, 472), piel='piel5', ancho=0.42)
cara(lz, 1300, 432, 32, piel='piel5', pelo='#1e1410', peinado='rizos', giro=-0.3, ang=-26, ojos='cerrados',
     boca='suave', semilla=61)
# the glass at her lips, with both hands
vaso = Poligono([(1270, 438), (1290, 430), (1296, 462), (1280, 468)], suave=False)
lz.aguada(vaso, '#cfe8f0', dens=0.4, tapa=1, irreg=0.2)
lz.aguada(Poligono([(1280, 448), (1294, 446), (1296, 462), (1280, 468)], suave=False), '#6fb8d8', dens=0.6, irreg=0.2)
lz.contorno(vaso, '#4a6a7a', grosor=0.7, presion=0.55)
lz.gouache(Trazo([(1274, 440), (1280, 462)], (1.4, 1.2)), '#ffffff', alfa=0.8, irreg=0)
miembro(lz, [(1292, 478), (1274, 506), (1282, 470)], (13, 11, 9), 'piel5', lado=1, lapiz=PIEL_LP)
mano(lz, 1283, 468, -80, 20, 'piel5', 'agarra', lado=1)
miembro(lz, [(1330, 478), (1316, 510), (1296, 474)], (13, 11, 9), 'piel5', lado=-1, lapiz=PIEL_LP)
mano(lz, 1296, 474, -110, 20, 'piel5', 'agarra', lado=-1)

# ------------------------------------------------------------------ small things with intention
# a pair of dragon... no: a kingfisher darting along the river, a flash of turquoise and orange
pajaro(lz, 470, 610, 15, '#2f9cb0', ang=175, alas='arriba', vientre='#f0a050')
# blue wildflowers and mint at the bank by the spring
for (x, y) in ((1180, 660), (1215, 668), (1250, 662), (980, 492), (950, 500)):
    lz.lapiz([[(x, y), (x + rng.normal(0, 3), y - 18)]], '#4f6f45', grosor=0.8, presion=0.6)
    flor_simple(lz, x, y - 20, rng.uniform(4.5, 6.5), rng.choice(['#5f86c0', '#8d73b0', '#fff3e0']), centro=ORO)

lz.vineta(margen=26)
lz.guardar(SALIDA)
print('ok', SALIDA)
