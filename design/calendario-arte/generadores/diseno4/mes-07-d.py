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
lz.aguada(Elipse(760, 330, 360, 240), '#f7d08a', dens=0.14, suave=70, gran=0.05)

# ------------------------------------------------------------------ ground: soft patches only where things stand
lz.aguada(Elipse(760, 628, 290, 22), '#c9b58a', dens=0.38, suave=16, gran=0.45, toques=[(640, 628, 100, '#b9c58a', 0.6)])
lz.aguada(Elipse(1200, 724, 250, 30), '#d6b88a', dens=0.36, suave=18, gran=0.45, toques=[(1100, 724, 80, '#b9c58a', 0.5)])
lz.aguada(Elipse(1180, 716, 170, 13), '#b8866a', dens=0.3, suave=9, gran=0.3)     # one warm shadow under the table
for k in range(40):
    x = rng.uniform(480, 1420)
    y = rng.uniform(616, 646) if x < 990 else rng.uniform(704, 752)
    lz.lapiz([bezier((x, y), (x + rng.normal(0, 3), y - 7), (x + rng.normal(0, 6), y - rng.uniform(10, 18)))],
             rng.choice(['#4f6f45', '#7f9f5a']), grosor=0.6, presion=0.5, temblor=0.2)

# ------------------------------------------------------------------ the apricot tree (behind the table)
tronco = Trazo([(1236, 700), (1240, 620), (1232, 520), (1218, 430), (1206, 350), (1196, 290)], (58, 46, 40, 38, 32, 24))
lz.aguada(tronco, '#8a6a52', dens=0.8, tapa=1, borde=0.6, gran=0.6,
          toques=[(1250, 600, 40, '#5e4a3a', 0.6), (1220, 420, 30, '#a08060', 0.5), (1232, 680, 40, '#6e5440', 0.6)])
sombra_lado(lz, tronco, 1, '#4a3428', dens=0.38)
lz.contorno(tronco, '#4a3428', grosor=0.9, presion=0.55, cortes=0.3)
lz.lapiz([bezier((1232 + k * 7, 690), (1236 + k * 6, 540), (1210 + k * 4, 330), n=30) for k in (-2, 0, 2)],
         '#5e4a3a', grosor=0.6, presion=0.35, temblor=0.9, cortes=0.4)
for (x, y, r) in ((1228, 560, 8), (1214, 452, 6), (1244, 640, 7)):          # knots
    lz.aguada(Elipse(x, y, r, r * 0.7), '#5e4a3a', dens=0.6, irreg=0.4)
    lz.lapiz([arco(x, y, r * 1.3, r, 0, 330, 14)], '#4a3428', grosor=0.6, presion=0.5)
for (a, m, b, w) in (((1210, 380), (1150, 320), (1090, 280), 16), ((1206, 340), (1260, 280), (1310, 240), 14),
                     ((1200, 300), (1190, 240), (1176, 190), 12)):
    f = Trazo([a, m, b], (w, w * 0.65, w * 0.35))
    lz.aguada(f, '#8a6a52', dens=0.78, tapa=1, gran=0.5)
    lz.contorno(f, '#4a3428', grosor=0.7, presion=0.5, cortes=0.3)
# the crown: soft rounded watercolour masses (dark behind, light in front), with leaves
masas = [((1200, 220, 110), '#4f7f45', 0.82, [(1260, 260, 70, '#2f5a3a', 0.6)]),
         ((1100, 250, 85), '#6f9a4a', 0.78, [(1060, 230, 50, '#a9c46a', 0.6)]),
         ((1300, 230, 85), '#6f9a4a', 0.76, [(1320, 270, 50, '#3f6f45', 0.6)]),
         ((1170, 150, 80), '#88b05a', 0.74, [(1150, 130, 50, '#d9dd8a', 0.6)]),
         ((1270, 150, 70), '#7aa456', 0.74, [(1260, 120, 40, '#c9d27a', 0.6)]),
         ((1040, 300, 55), '#7aa456', 0.74, []), ((1350, 300, 50), '#6f9a4a', 0.74, [])]
for i, ((cx, cy, r), col, dd, tq) in enumerate(masas):
    f = Circulos([(cx + rng.normal(0, r * 0.18), cy + rng.normal(0, r * 0.14), r * rng.uniform(0.5, 0.66)) for _ in range(6)])
    lz.aguada(f, col, dens=dd, tapa=0.9 if i else 1, borde=0.75, gran=0.45, irreg=1.1, toques=tq)
    for (x, y) in puntos_dentro(f, 12, 90 + i):
        hojita(lz, x, y, rng.uniform(11, 16), rng.uniform(0, 360), rng.choice(['#3f6f45', '#9fbf6a', '#5f8f4a']),
               tapa=0.5, dens=0.75)
for k in range(40):
    a = rng.uniform(0, 2 * math.pi)
    x = 1200 + math.cos(a) * 190 * rng.uniform(0.92, 1.04)
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


for (x, y) in ((1110, 270), (1180, 240), (1262, 288), (1316, 236), (1160, 168), (1234, 150), (1060, 300), (1350, 300)):
    albaricoque(x, y)

# ------------------------------------------------------------------ the earthen house
FL, FR, TOP, BOT = 540, 860, 372, 622
SR, STOP, SBOT = 970, 352, 596          # side wall recedes to the right
frente = Poligono([(FL, TOP), (FR, TOP), (FR, BOT), (FL, BOT)], suave=False)
lado = Poligono([(FR, TOP), (SR, STOP), (SR, SBOT), (FR, BOT)], suave=False)
lz.aguada(frente, TIERRA, dens=0.72, tapa=1, borde=0.7, gran=0.65, var=0.5,
          toques=[(590, 420, 90, '#e8b48a', 0.6), (830, 600, 90, TIERRA_O, 0.5), (710, 500, 70, '#e0a27a', 0.4)])
lz.aguada(lado, '#c4835e', dens=0.78, tapa=1, borde=0.7, gran=0.65, var=0.5,
          toques=[(930, 560, 70, '#a8603e', 0.6)])
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
VX, VY, VW, VH = 578, 430, 74, 86
ventana_frente(VX, VY, VW, VH)
cort = Poligono([(VX + 4, VY + 2), (VX + 26, VY + 2), (VX + 20, VY + 40), (VX + 26, VY + VH - 2), (VX + 4, VY + VH - 2)])
lz.aguada(cort, '#f6e6d0', dens=0.45, tapa=1, irreg=0.4, borde=0.8, toques=[(VX + 14, VY + 50, 14, '#f0c8b0', 0.6)])
lz.contorno(cort, '#b08a7a', grosor=0.6, presion=0.4, cortes=0.2)
# the door, arched, wooden, ajar with warm light inside
DX, DY, DW, DH = 710, 470, 70, 152
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
WX, WY, WW, WH = 794, 430, 52, 70
ventana_frente(WX, WY, WW, WH)
# the side window (facing the table): open
sw = Poligono([(900, 430), (938, 424), (938, 498), (900, 506)], suave=False)
lz.aguada(Poligono([(894, 424), (944, 416), (944, 504), (894, 512)], suave=False), '#efe2c8', dens=0.5, tapa=1, irreg=0.4)
lz.aguada(sw, '#7a4a3a', dens=0.75, tapa=1, irreg=0.3, toques=[(920, 450, 20, '#e8a060', 0.6)])
lz.contorno(sw, '#5e3f30', grosor=0.8, presion=0.55)
cs_ = Poligono([(904, 432), (920, 430), (912, 470), (918, 500), (906, 500)])
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
JARDIN = Poligono([(FL - 14, TOP - 20), (FL - 6, TOP - 50), (590, TOP - 70), (650, TOP - 92), (720, TOP - 80),
                   (790, TOP - 100), (850, TOP - 82), (910, STOP - 70), (950, STOP - 76), (SR + 10, STOP - 40),
                   (SR + 12, STOP - 22), (FR + 14, TOP - 20)])
jardin(lz, JARDIN, paleta=(CORAL, ORO, CARMIN, '#f39ab0', '#f2a03a', '#a99bcb'), verdes=('#5f8f4a', '#86a86c', '#3f7a6a'),
       base='#7aa456', base_dens=0.75, escala=0.85, densidad=1.0, semilla=71)
lz.contorno(JARDIN, VERDE_O, grosor=0.7, presion=0.4, cortes=0.5)
# a tomato plant and a sunflower stand up out of the roof garden
lz.lapiz([spline([(912, 284), (916, 230), (910, 180)])], '#4f6f45', grosor=1.4, presion=0.7)
for (x, y, a) in ((914, 250, -30), (912, 220, 200), (911, 196, -20)):
    hojita(lz, x, y, 16, a, '#5f8f4a', tapa=1)
flor_grande(lz, 910, 176, 17, ORO, centro='#6a3a1e', petalos=11)
for (x, y) in ((630, 284), (644, 296), (622, 300)):
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
                        (FR + 18, 120, 8, 5), (SR + 4, 170, 10, 6), (SR - 30, 80, 0, 7), (700, 40, 0, 8)):
    yy = TOP - 2 if x0 <= FR + 14 else STOP - 2 + (TOP - STOP) * (SR - x0) / (SR - FR)
    colgante(x0, yy, L, 700 + sd, dv)
# a flowering vine climbs from the roof garden across into the apricot crown
puente = bezier((SR - 10, STOP - 40), (1000, 240), (1030, 250), (1080, 270), 60)
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
pierna2(lz, (750, 266), (720, 290), (760, 300), 17, '#6a5a9a', P4, pie_ang=0, zapato='#5e3f30', sombra=1)
torso2(lz, (734, 214), (770, 214), (740, 268), (768, 268), '#f2c04a', cintura=0.92, sombra=1)
cuello(lz, (752, 180), 18, (752, 212), P4)
cabeza2(lz, 752, 180, 18, P4, '#2a1a14', 'trenza', giro=0.55, inclina=12, ojos='abajo', boca='sonrisa')
brazo2(lz, (766, 220), (786, 246), (808, 236), 12, '#f2c04a', P4, 'corta', sombra=1,
       mano=dict(ang=-10, gesto='agarra', lado=1, tam=19))
# the watering can and its rain of light, falling on the flowers
reg = Poligono([(798, 230), (830, 226), (834, 254), (802, 258)])
lz.aguada(reg, '#4f9c9a', dens=0.85, tapa=1, irreg=0.3, toques=[(810, 236, 10, '#7fc0b8', 0.6)])
lz.contorno(reg, '#2f5f5a', grosor=0.7, presion=0.5)
lz.aguada(Trazo([(830, 240), (860, 226)], (5, 3)), '#4f9c9a', dens=0.85, tapa=1)
lz.lapiz([arco(814, 224, 10, 8, 180, 360, 12)], '#2f5f5a', grosor=0.9, presion=0.6)
lz.aguada(Elipse(862, 225, 4, 6, 30), '#4f9c9a', dens=0.85, tapa=1)
for k in range(14):
    t = rng.uniform(0, 1)
    x = 866 + t * 40 + rng.normal(0, 4)
    y = 230 + t * t * 50 + rng.normal(0, 4)
    lz.aguada(Elipse(x, y, 1.6, 2.6, -30), '#7fb5d3', dens=0.9, irreg=0.1)
    if k % 3 == 0:
        lz.gouache(Elipse(x + 0.6, y - 0.8, 0.7), '#fffdf6', alfa=0.9, irreg=0)
brazo2(lz, (738, 222), (760, 252), (796, 254), 12, '#f2c04a', P4, 'corta', sombra=-1,
       mano=dict(ang=0, gesto='agarra', lado=-1, tam=19))
for (x, y) in ((710, 296), (730, 300), (770, 302), (794, 298)):     # plants in front of her knees
    hojita(lz, x, y, rng.uniform(14, 20), rng.uniform(230, 310), rng.choice(['#5f8f4a', '#86a86c']), tapa=1)
flor_simple(lz, 782, 290, 7, CORAL, centro=ORO)


# ------------------------------------------------------------------ three generations set the table together
# --- the grandmother (behind the table, left): passes the dish
PA = 'piel3'
cuello(lz, (1080, 482), 25, (1080, 516), PA, giro=0.45, inclina=8)
torso2(lz, (1054, 516), (1104, 518), (1058, 616), (1102, 616), '#8d73b0', cintura=0.96, sombra=1,
       toques=[(1096, 580, 30, '#6a5290', 0.6)], pliegues=[[(1070, 540), (1074, 580), (1072, 612)]])
cabeza2(lz, 1080, 482, 25, PA, '#4f9c9a', 'panuelo', giro=0.45, inclina=8, ojos='abajo', boca='sonrisa')
# --- the young man (behind the table, right of her): takes the dish
PH = 'piel5'
cuello(lz, (1206, 470), 27, (1208, 506), PH, giro=-0.45, inclina=-6)
torso2(lz, (1180, 506), (1236, 508), (1188, 616), (1230, 616), '#5f86c0', cintura=0.97, sombra=1,
       toques=[(1228, 580, 36, '#3f5f9a', 0.6)], pliegues=[[(1200, 530), (1206, 580), (1204, 612)]])
cabeza2(lz, 1206, 470, 27, PH, '#1e1410', 'corto', giro=-0.45, inclina=-6, ojos='abiertos', boca='risa', mira=(-1, 1))
# --- the girl (behind the table, right end): holds out her glass
PN = 'piel1'
cuello(lz, (1290, 522), 21, (1290, 552), PN, giro=0.5, inclina=6)
torso2(lz, (1272, 552), (1308, 552), (1276, 616), (1306, 616), CORAL, cintura=1.0, sombra=1)
cabeza2(lz, 1290, 522, 21, PN, '#c0602e', 'coleta', giro=0.5, inclina=6, ojos='abiertos', boca='risa', mira=(1, 0))

# the dish, passing from her hands to his
brazo2(lz, (1100, 524), (1118, 566), (1124, 550), 17, '#8d73b0', PA, 'larga', sombra=1, mano=None)
brazo2(lz, (1232, 516), (1226, 574), (1186, 562), 19, '#5f86c0', PH, 'larga', sombra=1, mano=None)
fuente = Poligono(np.vstack([arco(1154, 548, 36, 9, 180, 360, 20), arco(1154, 548, 30, 17, 0, 180, 20)]), suave=False)
lz.aguada(fuente, '#c0603a', dens=0.85, tapa=1, irreg=0.3, borde=0.7, toques=[(1168, 558, 20, '#8a3a22', 0.6)])
lz.aguada(Elipse(1154, 548, 32, 7), '#e8b04a', dens=0.85, irreg=0.3, tapa=1,
          toques=[(1142, 547, 8, CARMIN, 0.7), (1166, 549, 8, '#7aa456', 0.7), (1154, 546, 5, '#f2d36b', 0.7)])
lz.contorno(fuente, '#7a3a22', grosor=0.7, presion=0.55)
lz.lapiz([arco(1154, 548, 36, 9, 0, 360, 30)], '#7a3a22', grosor=0.6, presion=0.5)
for k in range(3):
    x = 1142 + k * 12
    lz.lapiz([bezier((x, 540), (x - 8, 522), (x + 6, 506), (x - 2, 486))], '#c8b8a8', grosor=0.7, presion=0.45, temblor=0.5)
mano2(lz, 1108, 560, -8, 27, PA, 'agarra', lado=1)
mano2(lz, 1128, 552, -20, 25, PA, 'agarra', lado=-1)
mano2(lz, 1204, 562, 190, 28, PH, 'agarra', lado=-1)
brazo2(lz, (1058, 524), (1072, 580), (1100, 566), 17, '#8d73b0', PA, 'larga', sombra=-1, mano=None)
brazo2(lz, (1184, 514), (1170, 570), (1186, 552), 19, '#5f86c0', PH, 'larga', sombra=-1, mano=None)
mano2(lz, 1184, 552, 175, 28, PH, 'agarra', lado=1)

# --- the table: shorter, a printed cloth with folds, full of things
MESA = Poligono([(1036, 606), (1318, 602), (1344, 644), (1018, 648)], suave=False)
lz.aguada(MESA, '#f6ead6', dens=0.5, tapa=1, irreg=0.35, borde=0.6, toques=[(1180, 630, 80, '#ecd6b4', 0.6)])
FAL = Poligono([(1018, 646), (1344, 642), (1348, 690), (1330, 700), (1300, 694), (1270, 702), (1240, 696), (1210, 704),
                (1180, 697), (1150, 705), (1120, 698), (1090, 705), (1060, 698), (1030, 704), (1014, 694)])
lz.aguada(FAL, '#f2e2c8', dens=0.55, tapa=1, irreg=0.4, borde=0.6, toques=[(1180, 680, 80, '#dcc4a0', 0.6)])
# the print: a coral gingham (glazes that cross and deepen where they meet)
for y in np.arange(652, 696, 11):
    lz.aguada(Trazo([(1018, y), (1346, y - 3)], (4.5, 4.5)) & FAL, CORAL, dens=0.28, irreg=0.4, borde=0.4, gran=0.3)
for x in np.arange(1026, 1344, 15):
    lz.aguada(Trazo([(x, 648), (x + 1, 700)], (4.5, 4.5)) & FAL, CORAL, dens=0.28, irreg=0.4, borde=0.4, gran=0.3)
for t in np.linspace(0.12, 0.88, 4):
    y = 606 + t * 40
    lz.aguada(Trazo([(1036 - 18 * t, y), (1318 + 26 * t, y - 4 * t)], (3.4, 3.4)) & MESA, CORAL, dens=0.25, irreg=0.4, borde=0.4)
for k in range(17):
    t = k / 16
    xa, xb = 1036 + t * (1318 - 1036), 1018 + t * (1344 - 1018)
    lz.aguada(Trazo([(xa, 606), (xb, 646)], (3, 3.6)) & MESA, CORAL, dens=0.25, irreg=0.4, borde=0.4)
lz.aguada(Trazo([(1016, 694), (1180, 700), (1348, 690)], (7, 7, 7)), CORAL, dens=0.75, irreg=0.4)
# folds: soft shadowed hollows and pencil
for x in (1060, 1110, 1162, 1218, 1272, 1320):
    lz.aguada(Trazo([(x, 650), (x + 2, 698)], (3, 7)), '#c8a888', dens=0.3, suave=2)
    lz.lapiz([[(x, 650), (x + 2, 696)]], '#b08a6a', grosor=0.6, presion=0.35, temblor=0.3)
for f in (MESA, FAL):
    lz.contorno(f, '#a07a60', grosor=0.8, presion=0.5, cortes=0.25)
# what is on it
for (x, y) in ((1066, 628), (1236, 624), (1298, 630)):
    pl = Elipse(x, y, 17, 5.5)
    lz.aguada(pl, '#fbf6ec', dens=0.5, tapa=1, irreg=0.2)
    lz.lapiz([arco(x, y, 17, 5.5, 0, 360, 24), arco(x, y, 12, 3.6, 0, 360, 20)], '#3f8f8f', grosor=0.6, presion=0.5)
    lz.aguada(Elipse(x, y - 1, 7, 2.4), rng.choice(['#e8b04a', '#7aa456', CARMIN]), dens=0.8, irreg=0.3)
cuenco = Poligono(np.vstack([arco(1190, 616, 22, 6, 180, 360, 16), arco(1190, 616, 19, 13, 0, 180, 16)]), suave=False)
for (x, y) in ((1180, 610), (1194, 608), (1204, 612), (1188, 602), (1176, 616)):
    lz.aguada(Elipse(x, y, 5.6), '#f2a03a', dens=0.9, tapa=1, irreg=0.2, toques=[(x + 2, y - 1, 3, '#e0604a', 0.7)])
lz.aguada(cuenco, '#4f9c9a', dens=0.8, tapa=1, irreg=0.3, toques=[(1200, 622, 10, '#2f6f72', 0.6)])
lz.contorno(cuenco, '#2f5f5a', grosor=0.6, presion=0.5)
pan = Elipse(1110, 634, 20, 8, 10)
lz.aguada(pan, '#d9a441', dens=0.85, tapa=1, irreg=0.3, toques=[(1110, 630, 10, '#f2d36b', 0.6)])
lz.lapiz([[(1100 + k * 8, 629 + k * 1.5), (1103 + k * 8, 637 + k * 1.5)] for k in range(3)], '#8a5a22', grosor=0.6,
         presion=0.5)
lz.contorno(pan, '#8a5a22', grosor=0.6, presion=0.5)
jarron = Poligono([(1256, 612), (1252, 596), (1258, 586), (1268, 586), (1274, 596), (1270, 612)])
lz.aguada(jarron, '#f2c04a', dens=0.85, tapa=1, irreg=0.2)
lz.contorno(jarron, '#9a6a2a', grosor=0.6, presion=0.5)
for (dx, dy, c) in ((-10, -26, CORAL), (0, -34, '#fff1e0'), (10, -26, '#f39ab0'), (-4, -18, CARMIN), (8, -16, ORO)):
    lz.lapiz([[(1263, 588), (1263 + dx, 588 + dy + 6)]], '#4f6f45', grosor=0.6, presion=0.6)
    flor_simple(lz, 1263 + dx, 588 + dy, 5, c, centro=ORO)
for (x, y) in ((1150, 618), (1092, 616)):
    v = Poligono([(x - 5, y - 15), (x + 5, y - 15), (x + 4, y), (x - 4, y)], suave=False)
    lz.aguada(v, '#bfe0e0', dens=0.4, tapa=1, irreg=0.2, toques=[(x, y - 4, 4, '#7fb5d3', 0.7)])
    lz.contorno(v, '#6a9aa0', grosor=0.5, presion=0.5)

# --- the girl's arm and glass (over the table corner)
brazo2(lz, (1304, 558), (1316, 596), (1318, 606), 14, CORAL, PN, 'corta', sombra=1, mano=None)
VASO = (1328, 598)
vaso = Poligono([(VASO[0] - 7, VASO[1] - 20), (VASO[0] + 7, VASO[1] - 20), (VASO[0] + 6, VASO[1] + 2), (VASO[0] - 6, VASO[1] + 2)],
                suave=False)
mano2(lz, 1316, 606, -10, 21, PN, 'agarra', lado=1)
lz.aguada(vaso, '#cfe8ec', dens=0.45, tapa=1, irreg=0.2, toques=[(VASO[0], VASO[1] - 4, 6, '#7fb5d3', 0.8)])
lz.contorno(vaso, '#5a9aa0', grosor=0.7, presion=0.6, cortes=0.05)
lz.gouache(Trazo([(VASO[0] - 4, VASO[1] - 17), (VASO[0] - 4, VASO[1] - 3)], (1.0, 0.8)), '#ffffff', alfa=0.8, irreg=0)

# --- the grandfather, seated at the end of the table, pours the water for her
PG = 'piel2'
silla = [Trazo([(1430, 520), (1428, 732)], (7, 6)), Trazo([(1380, 664), (1384, 736)], (6, 5)),
         Trazo([(1372, 652), (1432, 650)], (9, 9)), Trazo([(1428, 540), (1428, 600)], (14, 14))]
for f in silla:
    lz.aguada(f, '#9a6a4a', dens=0.78, tapa=1, irreg=0.3)
    lz.contorno(f, '#4a3428', grosor=0.6, presion=0.5)
pierna2(lz, (1388, 650), (1340, 664), (1338, 728), 26, '#6a5a4a', PG, pie_ang=180, zapato='#5e3f30', sombra=-1)
pierna2(lz, (1404, 652), (1356, 670), (1360, 734), 26, '#6a5a4a', PG, pie_ang=185, zapato='#5e3f30', sombra=1)
brazo2(lz, (1414, 566), (1398, 616), (1376, 640), 20, '#3f8f8f', PG, 'larga', sombra=1,
       mano=dict(ang=160, gesto='relajada', lado=1, tam=27))
cuello(lz, (1392, 522), 27, (1390, 560), PG, giro=-0.5, inclina=-8)
torso2(lz, (1364, 560), (1418, 562), (1372, 654), (1412, 656), '#3f8f8f', cintura=1.0, sombra=1,
       toques=[(1410, 620, 36, '#2f6f72', 0.6)], pliegues=[[(1384, 584), (1390, 630)]])
cabeza2(lz, 1392, 522, 27, PG, '#e6e0d8', 'calvo', giro=-0.5, inclina=-8, ojos='abajo', boca='sonrisa', canas=True,
        barba='#ece6de', labios=False)
brazo2(lz, (1368, 568), (1376, 616), (1384, 576), 20, '#3f8f8f', PG, 'larga', sombra=-1, mano=None)
# the jug, tilted to pour: belly, neck, a pinched spout over her glass, handle in his hand
ca_, sa_ = math.cos(math.radians(-35)), math.sin(math.radians(-35))
JX, JY = 1362, 586
J = lambda u, v: (JX + u * ca_ - v * sa_, JY + u * sa_ + v * ca_)
jarra = Poligono([J(-5, -24), J(5, -24), J(8, -15), J(17, -4), J(17, 10), J(9, 19), J(-9, 19), J(-17, 10), J(-17, -4), J(-8, -15)])
lz.aguada(jarra, '#c0603a', dens=0.85, tapa=1, borde=0.7, irreg=0.3, toques=[(*J(-7, 2), 10, '#e8a060', 0.6), (*J(10, 12), 10, '#8a3a22', 0.6)])
lz.aguada(Trazo([J(-12, 2), J(0, 5), J(12, 2)], (3.5, 3.5, 3.5)), '#f6efe0', dens=0.7, irreg=0.2)
lz.contorno(jarra, '#7a3a22', grosor=0.8, presion=0.55, cortes=0.1)
pico = Poligono([J(-5, -24), J(-12, -28), J(-3, -27), J(5, -24)], suave=False)
lz.aguada(pico, '#c0603a', dens=0.85, tapa=1)
asa = Trazo([J(15, -10), J(26, -4), J(24, 10), J(15, 12)], (4.5, 4.5, 4.5, 4))
lz.aguada(asa, '#b0502e', dens=0.85, tapa=1, irreg=0.2)
lz.contorno(asa, '#7a3a22', grosor=0.6, presion=0.5)
sx_, sy_ = J(-12, -28)
chorro = Trazo([(sx_, sy_), (sx_ - 5, sy_ + 6), (VASO[0] + 1, VASO[1] - 18)], (3.0, 2.6, 2.2))
lz.aguada(chorro, '#8fc8e0', dens=0.75, irreg=0.2, borde=0.8)
lz.gouache(Trazo([(sx_ - 1, sy_ + 3), (sx_ - 4, sy_ + 10)], (0.9, 0.7)), '#fffdf6', alfa=0.8, irreg=0)
for k in range(4):
    lz.gouache(Elipse(VASO[0] + rng.normal(0, 4), VASO[1] - 19 + rng.normal(0, 2), 0.8), '#e8f6ff', alfa=0.9, irreg=0)
mano2(lz, 1386, 580, -150, 28, PG, 'agarra', lado=-1)

lz.vineta(margen=26)
lz.guardar(SALIDA)
print('ok', SALIDA)
