"""
Mes 7 -- Hogar y Vivienda -- Diseño 4.

Idea: an earthen house (rammed-earth walls in courses of different ochres,
wooden beams) whose roof is a garden, on a summer evening. The garden does
not stop at the roof: it spills down the walls and climbs across into the
crown of the apricot tree beside it -- a house that is a garden. In the
tree's shade, three generations set one table together: a grandmother
passes the steaming dish to a young man, hand to hand; a grandfather pours
water into the glass a girl holds out. On the roof a young woman waters the
plants as the sun goes down; a cat sleeps on the doorstep.

    python3 mes-07-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, rgb, _lapiz_de,
                      jardin, hoja, hojita, flor_simple, flor_grande, mata, ramita, pajaro, estrella, motas,
                      remuestrea, puntos_dentro)
from extra_m678 import (cabeza2, mano2, brazo2, pierna2, torso2, cuello, sombra_lado, piel_lapiz, pie, manga_poly)

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-07-d.png'

lz = Lienzo(ANCHO, semilla=707)
rng = np.random.default_rng(7)

TEAL = '#3f8f8f'
CORAL = '#e8735e'
CARMIN = '#c33c4e'
ORO = '#f0c25e'
TIERRA = '#d99a72'
TIERRA_O = '#b8714a'
MADERA = '#8a5a3a'
VERDE = '#5f8f4a'
VERDE_O = '#3f6f45'
LP = '#5e3f30'

# ------------------------------------------------------------------ evening glow behind the house (soft, local)
lz.aguada(Elipse(650, 330, 360, 240), '#f7d08a', dens=0.14, suave=70, gran=0.05)

# ------------------------------------------------------------------ ground: soft patches only where things stand
lz.aguada(Elipse(650, 628, 290, 22), '#c9b58a', dens=0.38, suave=16, gran=0.45, toques=[(530, 628, 100, '#b9c58a', 0.6)])
lz.aguada(Elipse(1040, 724, 230, 30), '#d6b88a', dens=0.36, suave=18, gran=0.45, toques=[(940, 724, 80, '#b9c58a', 0.5)])
lz.aguada(Elipse(1036, 716, 170, 13), '#b8866a', dens=0.3, suave=9, gran=0.3)     # one warm shadow under the table
for k in range(40):
    x = rng.uniform(370, 1320)
    y = rng.uniform(616, 646) if x < 880 else rng.uniform(704, 752)
    lz.lapiz([bezier((x, y), (x + rng.normal(0, 3), y - 7), (x + rng.normal(0, 6), y - rng.uniform(10, 18)))],
             rng.choice(['#4f6f45', '#7f9f5a']), grosor=0.6, presion=0.5, temblor=0.2)

# ------------------------------------------------------------------ the apricot tree (behind the table)
tronco = Trazo([(1078, 640), (1080, 600), (1072, 520), (1058, 430), (1046, 350), (1036, 290)], (58, 46, 40, 38, 32, 24))
lz.aguada(tronco, '#8a6a52', dens=0.8, tapa=1, borde=0.6, gran=0.6,
          toques=[(1090, 600, 40, '#5e4a3a', 0.6), (1060, 420, 30, '#a08060', 0.5), (1072, 680, 40, '#6e5440', 0.6)])
sombra_lado(lz, tronco, 1, '#4a3428', dens=0.38)
lz.contorno(tronco, '#4a3428', grosor=0.9, presion=0.55, cortes=0.3)
lz.lapiz([bezier((1072 + k * 7, 690), (1076 + k * 6, 540), (1050 + k * 4, 330), n=30) for k in (-2, 0, 2)],
         '#5e4a3a', grosor=0.6, presion=0.35, temblor=0.9, cortes=0.4)
for (x, y, r) in ((1068, 560, 8), (1054, 452, 6), (1084, 640, 7)):          # knots
    lz.aguada(Elipse(x, y, r, r * 0.7), '#5e4a3a', dens=0.6, irreg=0.4)
    lz.lapiz([arco(x, y, r * 1.3, r, 0, 330, 14)], '#4a3428', grosor=0.6, presion=0.5)
for (a, m, b, w) in (((1050, 380), (990, 320), (930, 280), 16), ((1046, 340), (1100, 280), (1150, 240), 14),
                     ((1040, 300), (1030, 240), (1016, 190), 12)):
    f = Trazo([a, m, b], (w, w * 0.65, w * 0.35))
    lz.aguada(f, '#8a6a52', dens=0.78, tapa=1, gran=0.5)
    lz.contorno(f, '#4a3428', grosor=0.7, presion=0.5, cortes=0.3)
# the crown: soft rounded watercolour masses (dark behind, light in front), with leaves
masas = [((1040, 220, 110), '#4f7f45', 0.82, [(1100, 260, 70, '#2f5a3a', 0.6)]),
         ((940, 250, 85), '#6f9a4a', 0.78, [(900, 230, 50, '#a9c46a', 0.6)]),
         ((1140, 230, 85), '#6f9a4a', 0.76, [(1160, 270, 50, '#3f6f45', 0.6)]),
         ((1010, 150, 80), '#88b05a', 0.74, [(990, 130, 50, '#d9dd8a', 0.6)]),
         ((1110, 150, 70), '#7aa456', 0.74, [(1100, 120, 40, '#c9d27a', 0.6)]),
         ((880, 300, 55), '#7aa456', 0.74, []), ((1190, 300, 50), '#6f9a4a', 0.74, [])]
for i, ((cx, cy, r), col, dd, tq) in enumerate(masas):
    f = Circulos([(cx + rng.normal(0, r * 0.18), cy + rng.normal(0, r * 0.14), r * rng.uniform(0.5, 0.66)) for _ in range(6)])
    lz.aguada(f, col, dens=dd, tapa=0.9 if i else 1, borde=0.75, gran=0.45, irreg=1.1, toques=tq)
    for (x, y) in puntos_dentro(f, 12, 90 + i):
        hojita(lz, x, y, rng.uniform(11, 16), rng.uniform(0, 360), rng.choice(['#3f6f45', '#9fbf6a', '#5f8f4a']),
               tapa=0.5, dens=0.75)
for k in range(40):
    a = rng.uniform(0, 2 * math.pi)
    x = 1040 + math.cos(a) * 190 * rng.uniform(0.92, 1.04)
    y = 220 + math.sin(a) * 130 * rng.uniform(0.92, 1.04)
    if y > 330:
        continue
    hojita(lz, x, y, rng.uniform(12, 17), math.degrees(a) + rng.normal(0, 30), rng.choice(['#4f7f45', '#7aa456', '#9fbf6a']),
           tapa=0.8)


def albaricoque(x, y, r=7.5):
    """An apricot: orange with a rosy blush, a crease, a tiny stalk and leaf."""
    f = Elipse(x, y, r, r * 0.95)
    lz.aguada(f, '#f2a03a', dens=0.9, tapa=1, irreg=0.2, borde=0.6,
              toques=[(x + r * 0.35, y - r * 0.2, r * 0.55, '#e0604a', 0.7), (x - r * 0.4, y + r * 0.2, r * 0.4, '#f7c860', 0.6)])
    lz.contorno(f, '#b0602a', grosor=0.5, presion=0.45, desfase=0.1)
    lz.lapiz([bezier((x - r * 0.1, y - r * 0.9), (x - r * 0.3, y), (x - r * 0.05, y + r * 0.9))], '#c0703a', grosor=0.45,
             presion=0.4)
    lz.lapiz([[(x, y - r), (x + 1, y - r - 3)]], '#5e4a3a', grosor=0.6, presion=0.6)
    hojita(lz, x + 1, y - r - 2, r * 1.3, -40, '#5f8f4a', tapa=1, dens=0.85)
    lz.gouache(Elipse(x - r * 0.35, y - r * 0.35, r * 0.15), '#fff3d8', alfa=0.8, irreg=0)


for (x, y) in ((950, 270), (1020, 240), (1102, 288), (1156, 236), (1000, 168), (1074, 150), (900, 300), (1190, 300)):
    albaricoque(x, y)

# ------------------------------------------------------------------ the earthen house
FL, FR, TOP, BOT = 430, 750, 372, 622
SR, STOP, SBOT = 860, 352, 596          # side wall recedes to the right
frente = Poligono([(FL, TOP), (FR, TOP), (FR, BOT), (FL, BOT)], suave=False)
lado = Poligono([(FR, TOP), (SR, STOP), (SR, SBOT), (FR, BOT)], suave=False)
lz.aguada(frente, TIERRA, dens=0.72, tapa=1, borde=0.7, gran=0.65, var=0.5,
          toques=[(480, 420, 90, '#e8b48a', 0.6), (720, 600, 90, TIERRA_O, 0.5), (600, 500, 70, '#e0a27a', 0.4)])
lz.aguada(lado, '#c4835e', dens=0.78, tapa=1, borde=0.7, gran=0.65, var=0.5,
          toques=[(820, 560, 70, '#a8603e', 0.6)])
lz.aguada(lado, '#7a5a7a', dens=0.18, gran=0.3)   # the side in shade (cool glaze)
# rammed-earth strata (tapial): each course a band of earth of its own ochre, wet edges, no planks
ocres = ['#d99a72', '#c98a5e', '#e2aa7e', '#cf9466', '#dba070', '#c7865a']
for i, y in enumerate(np.arange(TOP, BOT, 42)):
    y1 = min(BOT, y + 44)
    c = ocres[i % len(ocres)]
    capa = Poligono([(FL - 1, y + rng.normal(0, 1.5)), (FR + 1, y + rng.normal(0, 1.5)), (FR + 1, y1), (FL - 1, y1)], suave=False)
    lz.aguada(capa & frente, c, dens=0.28, borde=0.9, irreg=1.4, gran=0.6, var=0.6)
    t0, t1 = (y - TOP) / (BOT - TOP), (y1 - TOP) / (BOT - TOP)
    capa2 = Poligono([(FR - 1, y), (SR + 1, STOP + t0 * (SBOT - STOP)), (SR + 1, STOP + t1 * (SBOT - STOP)), (FR - 1, y1)],
                     suave=False)
    lz.aguada(capa2 & lado, mezcla(c, '#7a5a7a', 0.25), dens=0.28, borde=0.9, irreg=1.4, gran=0.6, var=0.6)
    # the seam between courses: a broken, darker damp line
    lz.lapiz([np.array([(FL + 4, y1 + rng.normal(0, 1)), (FR - 4, y1 + rng.normal(0, 1))])], '#a0603e', grosor=0.6,
             presion=0.3, temblor=1.0, cortes=0.55)
for k in range(70):
    x = rng.uniform(FL + 8, SR - 8)
    if x < FR:
        y = rng.uniform(TOP + 8, BOT - 6)
    else:
        t = (x - FR) / (SR - FR)
        y = rng.uniform(TOP + (STOP - TOP) * t + 8, BOT + (SBOT - BOT) * t - 6)
    lz.aguada(Elipse(x, y, rng.uniform(1.2, 2.6), rng.uniform(1.0, 1.8)), rng.choice(['#9a6a4a', '#c9a07a', '#7a5a4a']),
              dens=0.6, irreg=0.3)
lz.contorno(frente, '#8a4a2e', grosor=0.9, presion=0.55, cortes=0.25)
lz.contorno(lado, '#8a4a2e', grosor=0.9, presion=0.55, cortes=0.25)


def ventana_frente(x0, y0, w, h, cortina='#f4e8d0'):
    """A deep window in a thick earth wall: lime-white frame, dark warm inside,
    open teal shutters, a sill with geraniums."""
    marco = Poligono([(x0 - 8, y0 - 8), (x0 + w + 8, y0 - 8), (x0 + w + 8, y0 + h + 6), (x0 - 8, y0 + h + 6)], suave=False)
    lz.aguada(marco, '#f6efe0', dens=0.5, tapa=1, irreg=0.4)
    hueco = Poligono([(x0, y0), (x0 + w, y0), (x0 + w, y0 + h), (x0, y0 + h)], suave=False)
    lz.aguada(hueco, '#7a4a3a', dens=0.75, tapa=1, irreg=0.3, toques=[(x0 + w * 0.5, y0 + h * 0.3, w * 0.4, '#e8a060', 0.7)])
    lz.contorno(hueco, '#5e3f30', grosor=0.8, presion=0.55, cortes=0.15)
    lz.contorno(marco, '#a07a60', grosor=0.7, presion=0.4, cortes=0.4)
    for (sx, sgn) in ((x0 - 8, -1), (x0 + w + 8, 1)):
        con = Poligono([(sx, y0 - 6), (sx + sgn * w * 0.42, y0 - 2), (sx + sgn * w * 0.42, y0 + h + 2), (sx, y0 + h + 4)],
                       suave=False)
        lz.aguada(con, TEAL, dens=0.75, tapa=1, irreg=0.3, borde=0.7, toques=[(sx + sgn * w * 0.2, y0 + h, w * 0.3, '#2f6f72', 0.6)])
        lz.contorno(con, '#1f4f52', grosor=0.7, presion=0.5)
        lz.lapiz([[(sx + sgn * w * 0.42 * t, y0 + 2), (sx + sgn * w * 0.42 * t, y0 + h)] for t in (0.33, 0.66)],
                 '#1f4f52', grosor=0.5, presion=0.4)
    alfeizar = Poligono([(x0 - 14, y0 + h + 4), (x0 + w + 14, y0 + h + 4), (x0 + w + 10, y0 + h + 13), (x0 - 10, y0 + h + 13)],
                        suave=False)
    lz.aguada(alfeizar, '#efe2c8', dens=0.6, tapa=1, irreg=0.3)
    lz.contorno(alfeizar, '#a07a60', grosor=0.7, presion=0.5)
    # geraniums
    for k, px in enumerate(np.linspace(x0 + 8, x0 + w - 8, 3)):
        maceta = Poligono([(px - 9, y0 + h - 12), (px + 9, y0 + h - 12), (px + 7, y0 + h + 4), (px - 7, y0 + h + 4)], suave=False)
        lz.aguada(maceta, '#c0603a', dens=0.8, tapa=1, irreg=0.3)
        lz.contorno(maceta, '#7a3a22', grosor=0.6, presion=0.5)
        for j in range(4):
            hojita(lz, px + rng.normal(0, 5), y0 + h - 14, rng.uniform(7, 10), rng.uniform(200, 340), '#5f8f4a', tapa=1)
        for j in range(5):
            lz.aguada(Elipse(px + rng.normal(0, 5), y0 + h - 22 + rng.normal(0, 4), 3.4), rng.choice([CARMIN, '#e8506a', CORAL]),
                      dens=0.95, tapa=1, irreg=0.3)
    return hueco


# the front window (left), open, a light curtain inside
VX, VY, VW, VH = 468, 430, 74, 86
ventana_frente(VX, VY, VW, VH)
cort = Poligono([(VX + 4, VY + 2), (VX + 26, VY + 2), (VX + 20, VY + 40), (VX + 26, VY + VH - 2), (VX + 4, VY + VH - 2)])
lz.aguada(cort, '#f6e6d0', dens=0.45, tapa=1, irreg=0.4, borde=0.8, toques=[(VX + 14, VY + 50, 14, '#f0c8b0', 0.6)])
lz.contorno(cort, '#b08a7a', grosor=0.6, presion=0.4, cortes=0.2)
# the door, arched, wooden, ajar with warm light inside
DX, DY, DW, DH = 600, 470, 70, 152
puerta_h = Poligono(np.vstack([[(DX, DY + DH)], arco(DX + DW / 2, DY + DW / 2, DW / 2, DW / 2, 180, 360, 20), [(DX + DW, DY + DH)]]), suave=False)
lz.aguada(Poligono(np.vstack([[(DX - 9, DY + DH)], arco(DX + DW / 2, DY + DW / 2, DW / 2 + 9, DW / 2 + 9, 180, 360, 20),
                              [(DX + DW + 9, DY + DH)]]), suave=False), '#f6efe0', dens=0.5, tapa=1, irreg=0.4)
lz.aguada(puerta_h, '#f4c470', dens=0.75, tapa=1, irreg=0.3, toques=[(DX + 30, DY + 100, 40, '#e8955a', 0.6)])
lz.luz(puerta_h, '#ffe2a0', fuerza=0.3, suave=8)
hoja_p = Poligono([(DX + 2, DY + 30), (DX + 26, DY + 18), (DX + 26, DY + DH + 6), (DX + 2, DY + DH)], suave=False)
lz.aguada(hoja_p, '#4f7f8a', dens=0.8, tapa=1, irreg=0.3, borde=0.7, toques=[(DX + 12, DY + 120, 20, '#2f5f6a', 0.6)])
lz.lapiz([[(DX + 6 + k * 6, DY + 28 - k * 3), (DX + 6 + k * 6, DY + DH)] for k in range(1, 4)], '#2f4f5a', grosor=0.5, presion=0.4)
lz.contorno(hoja_p, '#2f4f5a', grosor=0.7, presion=0.5)
lz.contorno(puerta_h, '#5e3f30', grosor=0.8, presion=0.5, cortes=0.2)
# a cat asleep on the step, in the doorway light
gato = Poligono([(DX + 34, DY + DH - 2), (DX + 40, DY + DH - 16), (DX + 58, DY + DH - 20), (DX + 72, DY + DH - 12), (DX + 74, DY + DH)])
lz.aguada(gato, '#e8955a', dens=0.8, tapa=1, irreg=0.3, toques=[(DX + 50, DY + DH - 10, 12, '#c0603a', 0.6)])
lz.aguada(Elipse(DX + 40, DY + DH - 14, 8, 7), '#e8955a', dens=0.8, tapa=1, irreg=0.3)
for sx in (-1, 1):
    lz.aguada(Poligono([(DX + 40 + sx * 6, DY + DH - 18), (DX + 40 + sx * 7, DY + DH - 26), (DX + 40 + sx * 1, DY + DH - 20)], suave=False),
              '#e8955a', dens=0.85, tapa=1, irreg=0.1)
lz.lapiz([arco(DX + 37, DY + DH - 13, 2, 1, 20, 160, 6), arco(DX + 44, DY + DH - 13, 2, 1, 20, 160, 6)], '#4a2e24', grosor=0.5,
         presion=0.7)
lz.lapiz([[(DX + 52, DY + DH - 15), (DX + 56, DY + DH - 5)], [(DX + 60, DY + DH - 15), (DX + 63, DY + DH - 5)]], '#a0502a',
         grosor=0.6, presion=0.5)
lz.contorno(gato, '#8a4a2a', grosor=0.6, presion=0.5)
# the second window, plain, with geraniums (no awning)
WX, WY, WW, WH = 684, 430, 52, 70
ventana_frente(WX, WY, WW, WH)
# the side window (facing the table): open
sw = Poligono([(790, 430), (828, 424), (828, 498), (790, 506)], suave=False)
lz.aguada(Poligono([(784, 424), (834, 416), (834, 504), (784, 512)], suave=False), '#efe2c8', dens=0.5, tapa=1, irreg=0.4)
lz.aguada(sw, '#7a4a3a', dens=0.75, tapa=1, irreg=0.3, toques=[(810, 450, 20, '#e8a060', 0.6)])
lz.contorno(sw, '#5e3f30', grosor=0.8, presion=0.55)
cs_ = Poligono([(794, 432), (810, 430), (802, 470), (808, 500), (796, 500)])
lz.aguada(cs_, '#f6e6d0', dens=0.45, tapa=1, irreg=0.3)
lz.contorno(cs_, '#b08a7a', grosor=0.6, presion=0.4)

# beams and the green roof
viga = Poligono([(FL - 16, TOP - 22), (FR + 14, TOP - 22), (FR + 14, TOP + 2), (FL - 16, TOP + 2)], suave=False)
vlado = Poligono([(FR + 14, TOP - 22), (SR + 12, STOP - 24), (SR + 12, STOP + 1), (FR + 14, TOP + 2)], suave=False)
for f, c in ((viga, MADERA), (vlado, '#6a4a32')):
    lz.aguada(f, c, dens=0.8, tapa=1, irreg=0.3, borde=0.6, gran=0.5)
    lz.contorno(f, '#3e2a24', grosor=0.8, presion=0.5)
lz.lapiz([[(FL - 10, TOP - 12 + k * 6), (FR + 8, TOP - 12 + k * 6)] for k in range(3)], '#5e3f30', grosor=0.5, presion=0.3,
         temblor=0.5, cortes=0.4)
for x in np.linspace(FL + 10, FR - 10, 7):
    e = Elipse(x, TOP + 8, 6, 6)
    lz.aguada(e, '#a07050', dens=0.85, tapa=1, irreg=0.2)
    lz.lapiz([arco(x, TOP + 8, 3.5, 3.5, 0, 300, 12)], '#5e3f30', grosor=0.5, presion=0.5)
# the garden on the roof: a lush mound
JARDIN = Poligono([(FL - 14, TOP - 20), (FL - 6, TOP - 50), (480, TOP - 70), (540, TOP - 92), (610, TOP - 80),
                   (680, TOP - 100), (740, TOP - 82), (800, STOP - 70), (840, STOP - 76), (SR + 10, STOP - 40),
                   (SR + 12, STOP - 22), (FR + 14, TOP - 20)])
jardin(lz, JARDIN, paleta=(CORAL, ORO, CARMIN, '#f39ab0', '#f2a03a', '#a99bcb'), verdes=('#5f8f4a', '#86a86c', '#3f7a6a'),
       base='#7aa456', base_dens=0.75, escala=0.85, densidad=1.0, semilla=71)
lz.contorno(JARDIN, VERDE_O, grosor=0.7, presion=0.4, cortes=0.5)
# a tomato plant and a sunflower stand up out of the roof garden
lz.lapiz([spline([(802, 284), (806, 230), (800, 180)])], '#4f6f45', grosor=1.4, presion=0.7)
for (x, y, a) in ((804, 250, -30), (802, 220, 200), (801, 196, -20)):
    hojita(lz, x, y, 16, a, '#5f8f4a', tapa=1)
flor_grande(lz, 800, 176, 17, ORO, centro='#6a3a1e', petalos=11)
for (x, y) in ((520, 284), (534, 296), (512, 300)):
    lz.aguada(Elipse(x, y, 5.5), CARMIN, dens=0.95, tapa=1, irreg=0.2, toques=[(x - 2, y - 2, 2, '#f08a7a', 0.8)])


# ------------------------------------------------------------------ the garden spills down the walls and into the tree
def colgante(x0, y0, largo, seed, deriva=0.0):
    """A trailing plant hanging from the roof edge: stem, leaves, flowers."""
    r_ = np.random.default_rng(seed)
    p = bezier((x0, y0), (x0 + deriva * 0.4 + r_.normal(0, 6), y0 + largo * 0.4), (x0 + deriva + r_.normal(0, 8), y0 + largo), n=30)
    lz.lapiz([p], '#4f6f45', grosor=0.8, presion=0.6, temblor=0.3)
    for j in range(2, len(p) - 1, 3):
        d_ = p[j + 1] - p[j - 1]
        base = math.degrees(math.atan2(d_[1], d_[0]))
        hojita(lz, p[j][0], p[j][1], r_.uniform(10, 15), base + r_.choice([-65, 65]), r_.choice(['#5f8f4a', '#7aa456', '#3f7a6a']),
               tapa=0.9)
        if j % 5 == 2:
            flor_simple(lz, p[j][0] + r_.normal(0, 3), p[j][1] + r_.normal(0, 3), r_.uniform(4, 5.5),
                        r_.choice([CORAL, '#f39ab0', CARMIN, '#fff1e0']), centro=ORO)


for (x0, L, dv, sd) in ((FL - 6, 150, -10, 1), (FL + 22, 90, 4, 2), (FL + 60, 50, 0, 3), (FR - 30, 60, 6, 4),
                        (FR + 18, 120, 8, 5), (SR + 4, 170, 10, 6), (SR - 30, 80, 0, 7), (590, 40, 0, 8)):
    yy = TOP - 2 if x0 <= FR + 14 else STOP - 2 + (TOP - STOP) * (SR - x0) / (SR - FR)
    colgante(x0, yy, L, 700 + sd, dv)
# a flowering vine climbs from the roof garden across into the apricot crown
puente = bezier((SR - 10, STOP - 40), (872, 250), (890, 254), (912, 266), 60)
lz.lapiz([puente, puente + np.array([2, 4])], '#4f6f45', grosor=1.0, presion=0.65, temblor=0.4)
for j in range(3, len(puente) - 2, 4):
    d_ = puente[j + 1] - puente[j - 1]
    base = math.degrees(math.atan2(d_[1], d_[0]))
    hojita(lz, puente[j][0], puente[j][1], rng.uniform(9, 13), base + rng.choice([-60, 60]), rng.choice(['#5f8f4a', '#7aa456']),
           tapa=0.9)
    if j % 8 == 3:
        flor_simple(lz, puente[j][0], puente[j][1] - 4, 5.5, rng.choice([CORAL, '#f39ab0', ORO]), centro='#e7a33e')

# ------------------------------------------------------------------ the young woman watering on the roof (sunset)
P4 = 'piel3'
pierna2(lz, (640, 266), (610, 290), (650, 300), 17, '#6a5a9a', P4, pie_ang=0, zapato='#5e3f30', sombra=1)
torso2(lz, (624, 214), (660, 214), (630, 268), (658, 268), '#f2c04a', cintura=0.92, sombra=1)
cuello(lz, (642, 180), 18, (642, 212), P4)
cabeza2(lz, 642, 180, 18, P4, '#2a1a14', 'trenza', giro=0.55, inclina=12, ojos='abajo', boca='sonrisa')
brazo2(lz, (656, 220), (676, 246), (698, 236), 12, '#f2c04a', P4, 'corta', sombra=1,
       mano=dict(ang=-10, gesto='agarra', lado=1, tam=19))
# the watering can and its rain of light, falling on the flowers
reg = Poligono([(688, 230), (720, 226), (724, 254), (692, 258)])
lz.aguada(reg, '#4f9c9a', dens=0.85, tapa=1, irreg=0.3, toques=[(700, 236, 10, '#7fc0b8', 0.6)])
lz.contorno(reg, '#2f5f5a', grosor=0.7, presion=0.5)
lz.aguada(Trazo([(720, 240), (750, 226)], (5, 3)), '#4f9c9a', dens=0.85, tapa=1)
lz.lapiz([arco(704, 224, 10, 8, 180, 360, 12)], '#2f5f5a', grosor=0.9, presion=0.6)
lz.aguada(Elipse(752, 225, 4, 6, 30), '#4f9c9a', dens=0.85, tapa=1)
for k in range(14):
    t = rng.uniform(0, 1)
    x = 756 + t * 40 + rng.normal(0, 4)
    y = 230 + t * t * 50 + rng.normal(0, 4)
    lz.aguada(Elipse(x, y, 1.6, 2.6, -30), '#7fb5d3', dens=0.9, irreg=0.1)
    if k % 3 == 0:
        lz.gouache(Elipse(x + 0.6, y - 0.8, 0.7), '#fffdf6', alfa=0.9, irreg=0)
brazo2(lz, (628, 222), (650, 252), (686, 254), 12, '#f2c04a', P4, 'corta', sombra=-1,
       mano=dict(ang=0, gesto='agarra', lado=-1, tam=19))
for (x, y) in ((600, 296), (620, 300), (660, 302), (684, 298)):     # plants in front of her knees
    hojita(lz, x, y, rng.uniform(14, 20), rng.uniform(230, 310), rng.choice(['#5f8f4a', '#86a86c']), tapa=1)
flor_simple(lz, 672, 290, 7, CORAL, centro=ORO)


# ------------------------------------------------------------------ one shared home: the table under the crown that touches the roof
# --- behind the table: the grandmother passes the steaming dish to the young man, hand to hand
PA, PH, PN, PG = 'piel3', 'piel5', 'piel1', 'piel2'
cuello(lz, (950, 488), 25, (950, 522), PA, giro=0.45, inclina=8)
torso2(lz, (924, 522), (974, 524), (928, 620), (972, 620), '#8d73b0', cintura=0.96, sombra=1,
       toques=[(966, 584, 30, '#6a5290', 0.6)],
       pliegues=[[(938, 546), (944, 586), (940, 616)], [(958, 552), (962, 600)], [(930, 560), (936, 600)]])
cabeza2(lz, 950, 488, 25, PA, '#4f9c9a', 'panuelo', giro=0.45, inclina=8, ojos='abajo', boca='sonrisa')
cuello(lz, (1082, 476), 27, (1082, 512), PH, giro=-0.45, inclina=-6)
torso2(lz, (1056, 512), (1112, 514), (1064, 620), (1106, 620), '#5f86c0', cintura=0.97, sombra=1,
       toques=[(1104, 584, 36, '#3f5f9a', 0.6)],
       pliegues=[[(1074, 536), (1080, 586), (1078, 616)], [(1094, 540), (1098, 600)], [(1064, 556), (1070, 600)]])
cabeza2(lz, 1082, 476, 27, PH, '#1e1410', 'corto', giro=-0.45, inclina=-6, ojos='abiertos', boca='risa', mira=(-1, 1))
# far arms first, then the dish, then the near arms and the hands round its rim
brazo2(lz, (970, 530), (990, 572), (1000, 560), 17, '#8d73b0', PA, 'larga', sombra=1, mano=None)
brazo2(lz, (1108, 520), (1100, 576), (1062, 564), 19, '#5f86c0', PH, 'larga', sombra=1, mano=None)
fuente = Poligono(np.vstack([arco(1030, 552, 40, 10, 180, 360, 20), arco(1030, 552, 34, 19, 0, 180, 20)]), suave=False)
lz.aguada(fuente, '#c0603a', dens=0.85, tapa=1, irreg=0.3, borde=0.7, toques=[(1046, 562, 20, '#8a3a22', 0.6)])
lz.aguada(Elipse(1030, 552, 36, 8), '#e8b04a', dens=0.85, irreg=0.3, tapa=1,
          toques=[(1016, 551, 9, CARMIN, 0.7), (1042, 553, 9, '#7aa456', 0.7), (1030, 549, 6, '#f2d36b', 0.7)])
for (x, y) in ((1018, 549), (1036, 551), (1046, 548)):          # peppers and potatoes in the stew
    lz.aguada(Elipse(x, y, 4, 2.5), rng.choice([CARMIN, '#e8952a', '#7aa456']), dens=0.85, irreg=0.2)
lz.contorno(fuente, '#7a3a22', grosor=0.7, presion=0.55)
lz.lapiz([arco(1030, 552, 40, 10, 0, 360, 30)], '#7a3a22', grosor=0.6, presion=0.5)
for k in range(3):
    x = 1018 + k * 13
    lz.lapiz([bezier((x, 544), (x - 8, 526), (x + 6, 510), (x - 2, 490))], '#c8b8a8', grosor=0.7, presion=0.45, temblor=0.5)
brazo2(lz, (928, 530), (946, 584), (980, 568), 17, '#8d73b0', PA, 'larga', sombra=-1, mano=None)
brazo2(lz, (1060, 520), (1052, 578), (1076, 562), 19, '#5f86c0', PH, 'larga', sombra=-1, mano=None)
mano2(lz, 980, 568, -12, 26, PA, 'relajada', lado=1)        # her fingers under the rim
mano2(lz, 1000, 560, -30, 24, PA, 'relajada', lado=-1)
mano2(lz, 1076, 562, 190, 27, PH, 'relajada', lado=-1)      # his fingers take the other side
mano2(lz, 1062, 566, 170, 27, PH, 'relajada', lado=1)

# --- the table
MESA = Poligono([(904, 612), (1162, 608), (1186, 652), (886, 656)], suave=False)
lz.aguada(MESA, '#f6ead6', dens=0.5, tapa=1, irreg=0.35, borde=0.6, toques=[(1040, 636, 80, '#ecd6b4', 0.6)])
FAL = Poligono([(886, 654), (1186, 650), (1190, 698), (1170, 708), (1140, 700), (1110, 710), (1080, 702), (1050, 712),
                (1020, 704), (990, 712), (960, 704), (930, 712), (900, 704), (882, 700)])
lz.aguada(FAL, '#f2e2c8', dens=0.55, tapa=1, irreg=0.4, borde=0.6, toques=[(1040, 688, 80, '#dcc4a0', 0.6)])
for y in np.arange(660, 704, 11):
    lz.aguada(Trazo([(886, y), (1188, y - 3)], (4.5, 4.5)) & FAL, CORAL, dens=0.28, irreg=0.4, borde=0.4, gran=0.3)
for x in np.arange(894, 1186, 15):
    lz.aguada(Trazo([(x, 656), (x + 1, 708)], (4.5, 4.5)) & FAL, CORAL, dens=0.28, irreg=0.4, borde=0.4, gran=0.3)
for t in np.linspace(0.12, 0.88, 4):
    y = 612 + t * 40
    lz.aguada(Trazo([(904 - 18 * t, y), (1162 + 24 * t, y - 4 * t)], (3.4, 3.4)) & MESA, CORAL, dens=0.25, irreg=0.4, borde=0.4)
for k in range(17):
    t = k / 16
    lz.aguada(Trazo([(904 + t * 258, 612), (886 + t * 300, 652)], (3, 3.6)) & MESA, CORAL, dens=0.25, irreg=0.4, borde=0.4)
for x in (930, 985, 1040, 1095, 1150):
    lz.aguada(Trazo([(x, 658), (x + 2, 706)], (3, 7)), '#c8a888', dens=0.3, suave=2)
    lz.lapiz([[(x, 658), (x + 2, 704)]], '#b08a6a', grosor=0.6, presion=0.35, temblor=0.3)
for f in (MESA, FAL):
    lz.contorno(f, '#a07a60', grosor=0.8, presion=0.5, cortes=0.25)
# fewer, bigger things you can name: a salad, a big bowl of apricots, a loaf, a jug of flowers
plato = Elipse(948, 636, 30, 9)
lz.aguada(plato, '#fbf6ec', dens=0.5, tapa=1, irreg=0.2)
lz.lapiz([arco(948, 636, 30, 9, 0, 360, 30), arco(948, 636, 22, 6.5, 0, 360, 26)], '#3f8f8f', grosor=0.7, presion=0.55)
for k in range(9):
    hojita(lz, 948 + rng.normal(0, 9), 634 + rng.normal(0, 2), rng.uniform(9, 13), rng.uniform(0, 360), rng.choice(['#7aa456', '#5f8f4a', '#9fbf6a']), tapa=1)
for (x, y) in ((938, 632), (954, 630), (960, 637), (944, 638)):
    lz.aguada(Elipse(x, y, 4.2, 3), CARMIN, dens=0.9, tapa=1, irreg=0.2)
    lz.gouache(Elipse(x - 1, y - 1, 1.2, 0.8), '#ffd8c8', alfa=0.8, irreg=0)
cuenco = Poligono(np.vstack([arco(1062, 626, 30, 8, 180, 360, 18), arco(1062, 626, 26, 17, 0, 180, 18)]), suave=False)
for (x, y) in ((1048, 620), (1062, 616), (1076, 620), (1055, 610), (1069, 609), (1062, 624)):
    lz.aguada(Elipse(x, y, 7.5), '#f2a03a', dens=0.9, tapa=1, irreg=0.2, toques=[(x + 3, y - 2, 4, '#e0604a', 0.7)])
    lz.contorno(Elipse(x, y, 7.5), '#b0602a', grosor=0.45, presion=0.4)
hojita(lz, 1066, 606, 12, -60, '#5f8f4a', tapa=1)
lz.aguada(cuenco, '#4f9c9a', dens=0.8, tapa=1, irreg=0.3, toques=[(1076, 634, 12, '#2f6f72', 0.6)])
lz.lapiz([arco(1062, 632, 22, 5, 20, 160, 16)], '#f6efe0', grosor=0.8, presion=0.6)
lz.contorno(cuenco, '#2f5f5a', grosor=0.6, presion=0.5)
pan = Elipse(1128, 640, 28, 10, 8)
lz.aguada(pan, '#d9a441', dens=0.88, tapa=1, irreg=0.3, toques=[(1124, 634, 14, '#f2d36b', 0.6), (1144, 646, 10, '#a0662a', 0.6)])
lz.lapiz([[(1112 + k * 10, 633 + k * 1.4), (1116 + k * 10, 644 + k * 1.4)] for k in range(4)], '#8a5a22', grosor=0.7, presion=0.55)
lz.contorno(pan, '#8a5a22', grosor=0.6, presion=0.5)
# --- the magic that makes it one home: the roof garden climbs down the wall, crosses the ground
#     and flowers along the hem of the tablecloth
ruta = np.vstack([bezier((SR + 2, STOP + 10), (SR + 6, 450), (SR - 4, 540), (SR + 4, SBOT), 40),
                  bezier((SR + 4, SBOT), (SR + 6, 640), (870, 690), (886, 704), 30)[1:],
                  bezier((886, 704), (980, 718), (1090, 718), (1188, 704), 50)[1:]])
lz.lapiz([ruta, ruta + np.array([1.5, 2])], '#4f6f45', grosor=0.9, presion=0.65, temblor=0.4)
for j in range(2, len(ruta) - 1, 3):
    d_ = ruta[j + 1] - ruta[j - 1]
    base = math.degrees(math.atan2(d_[1], d_[0]))
    hojita(lz, ruta[j][0], ruta[j][1], rng.uniform(10, 14), base + rng.choice([-62, 62]), rng.choice(['#5f8f4a', '#7aa456', '#3f7a6a']),
           tapa=0.95)
    if j % 4 == 2 or (j > 70 and j % 2 == 0):
        flor_simple(lz, ruta[j][0] + rng.normal(0, 3), ruta[j][1] + rng.normal(0, 3), rng.uniform(5, 7),
                    rng.choice([CORAL, '#f39ab0', CARMIN, '#fff1e0', ORO]), centro=ORO)

# --- the grandfather, at the end of the table, pours water for the girl
silla = [Trazo([(1250, 528), (1248, 738)], (7, 6)), Trazo([(1206, 670), (1208, 740)], (6, 5)),
         Trazo([(1198, 658), (1252, 656)], (9, 9)), Trazo([(1248, 548), (1248, 606)], (14, 14))]
for f in silla:
    lz.aguada(f, '#9a6a4a', dens=0.78, tapa=1, irreg=0.3)
    lz.contorno(f, '#4a3428', grosor=0.6, presion=0.5)
pierna2(lz, (1212, 656), (1170, 668), (1168, 734), 26, '#6a5a4a', PG, pie_ang=180, zapato='#5e3f30', sombra=-1)
pierna2(lz, (1228, 658), (1184, 676), (1188, 738), 26, '#6a5a4a', PG, pie_ang=185, zapato='#5e3f30', sombra=1)
brazo2(lz, (1240, 570), (1232, 616), (1206, 642), 20, '#3f8f8f', PG, 'larga', sombra=1,
       mano=dict(ang=160, gesto='relajada', lado=1, tam=27))
cuello(lz, (1222, 526), 27, (1220, 564), PG, giro=-0.5, inclina=-8)
torso2(lz, (1194, 564), (1246, 566), (1202, 658), (1240, 660), '#3f8f8f', cintura=1.0, sombra=1,
       toques=[(1238, 624, 36, '#2f6f72', 0.6)], pliegues=[[(1212, 588), (1218, 634)], [(1230, 590), (1234, 650)]])
cabeza2(lz, 1222, 526, 27, PG, '#e6e0d8', 'calvo', giro=-0.5, inclina=-8, ojos='abajo', boca='sonrisa', canas=True,
        barba='#ece6de', labios=False)
brazo2(lz, (1198, 572), (1214, 620), (1212, 584), 20, '#3f8f8f', PG, 'larga', sombra=-1, mano=None)
ca_, sa_ = math.cos(math.radians(-60)), math.sin(math.radians(-60))
JX, JY = 1194, 598
J = lambda u, v: (JX + u * ca_ - v * sa_, JY + u * sa_ + v * ca_)
asa = Trazo([J(15, -10), J(26, -4), J(24, 10), J(15, 12)], (4.5, 4.5, 4.5, 4))
lz.aguada(asa, '#b0502e', dens=0.85, tapa=1, irreg=0.2)
lz.contorno(asa, '#7a3a22', grosor=0.6, presion=0.5)
jarra = Poligono([J(-5, -24), J(5, -24), J(8, -15), J(17, -4), J(17, 10), J(9, 19), J(-9, 19), J(-17, 10), J(-17, -4), J(-8, -15)])
lz.aguada(jarra, '#c0603a', dens=0.85, tapa=1, borde=0.7, irreg=0.3, toques=[(*J(-7, 2), 10, '#e8a060', 0.6), (*J(10, 12), 10, '#8a3a22', 0.6)])
lz.aguada(Trazo([J(-12, 2), J(0, 5), J(12, 2)], (3.5, 3.5, 3.5)), '#f6efe0', dens=0.7, irreg=0.2)
lz.contorno(jarra, '#7a3a22', grosor=0.8, presion=0.55, cortes=0.1)
pico = Poligono([J(-7, -21), J(-17, -33), J(-3, -29), J(7, -23)], suave=False)
lz.aguada(pico, '#c0603a', dens=0.88, tapa=1, irreg=0.2)
lz.contorno(pico, '#7a3a22', grosor=0.7, presion=0.55)
lz.lapiz([[J(-8, -24), J(8, -24)]], '#7a3a22', grosor=0.8, presion=0.6)
mano2(lz, *J(24, 2), -160, 27, PG, 'agarra', lado=-1)

# --- the girl, sitting on the near side with her back to us, turns to him and holds out her glass
banco = Trazo([(990, 712), (1160, 708)], (10, 10))
lz.aguada(banco, '#9a6a4a', dens=0.8, tapa=1, irreg=0.3)
lz.contorno(banco, '#4a3428', grosor=0.6, presion=0.5)
for x in (1000, 1150):
    lz.aguada(Trazo([(x, 716), (x, 748)], (6, 5)), '#8a5a3a', dens=0.8, tapa=1)
cuello(lz, (1112, 606), 22, (1108, 640), PN, giro=0.8, inclina=-6, escote=False)
falda_n = Poligono([(1088, 682), (1132, 682), (1140, 716), (1084, 718)])
lz.aguada(falda_n, CORAL, dens=0.8, tapa=1, irreg=0.3, borde=0.7)
torso2(lz, (1088, 640), (1128, 640), (1092, 692), (1126, 692), CORAL, cintura=0.94, sombra=-1, escote='redondo',
       pliegues=[[(1100, 652), (1104, 686)], [(1116, 650), (1118, 684)]])
lz.aguada(Trazo([(1092, 690), (1110, 692), (1128, 690)], (6, 6, 6)), '#f6efe0', dens=0.6, tapa=1, irreg=0.3)   # her apron bow
cabeza2(lz, 1112, 606, 22, PN, '#c0602e', 'coleta', giro=0.82, inclina=-6, ojos='abiertos', boca='risa', mira=(1, -1))
# her arm and the glass, held up under the jug's spout
VASO = (1160, 634)
brazo2(lz, (1126, 646), (1146, 660), (1152, 644), 14, CORAL, PN, 'corta', sombra=1, mano=None)
vaso = Poligono([(VASO[0] - 8, VASO[1] - 22), (VASO[0] + 8, VASO[1] - 22), (VASO[0] + 7, VASO[1] + 2), (VASO[0] - 7, VASO[1] + 2)],
                suave=False)
lz.aguada(vaso, '#cfe8ec', dens=0.45, tapa=1, irreg=0.2, toques=[(VASO[0], VASO[1] - 4, 7, '#7fb5d3', 0.8)])
lz.contorno(vaso, '#5a9aa0', grosor=0.7, presion=0.6, cortes=0.05)
lz.gouache(Trazo([(VASO[0] - 5, VASO[1] - 19), (VASO[0] - 5, VASO[1] - 3)], (1.0, 0.8)), '#ffffff', alfa=0.8, irreg=0)
mano2(lz, 1150, 646, -40, 21, PN, 'agarra', lado=1)
sx_, sy_ = J(-17, -33)
chorro = Trazo([(sx_, sy_), (sx_ - 1, sy_ + 8), (VASO[0] + 1, VASO[1] - 19)], (4.2, 3.8, 3.4))
lz.aguada(chorro, '#6fb0d0', dens=0.8, irreg=0.2, borde=0.8)
lz.gouache(Trazo([(sx_ - 1, sy_ + 3), (sx_ - 4, sy_ + 12)], (1.1, 0.8)), '#ffffff', alfa=0.85, irreg=0)
for k in range(5):
    lz.gouache(Elipse(VASO[0] + rng.normal(0, 4), VASO[1] - 21 + rng.normal(0, 2), 0.9), '#e8f6ff', alfa=0.9, irreg=0)

lz.vineta(margen=26)
lz.guardar(SALIDA)
print('ok', SALIDA)
