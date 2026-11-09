"""
Mes 7 -- Hogar y Vivienda -- Diseño 4.

Idea: an earthen house (rammed-earth walls, wooden beams) whose roof is a
garden, on a summer evening. Its windows are open on both sides and the
breeze that crosses the house comes out of the front window as a ribbon that
carries petals, leaves and two swallows. Beside it, in the shade of a
deciduous tree, neighbours of three ages set a shared table: a grandmother
brings the dish, a man pours water into the cup a girl holds up. On the
roof a young woman waters the garden as the sun goes down.

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
lz.aguada(Elipse(700, 330, 330, 230), '#f7d08a', dens=0.14, suave=70, gran=0.05)

# ------------------------------------------------------------------ ground: one soft patch, nothing edge to edge
suelo = Poligono([(360, 640), (520, 610), (760, 606), (980, 640), (1200, 690), (1380, 730), (1400, 790),
                  (1200, 812), (900, 800), (640, 790), (420, 760), (330, 700)])
lz.aguada(suelo, '#d8c08a', dens=0.4, suave=14, gran=0.45,
          toques=[(600, 700, 160, '#b9c58a', 0.6), (1150, 760, 160, '#c9b07a', 0.5)])
for k in range(40):
    x = rng.uniform(380, 1380)
    y = rng.uniform(640, 800) if x < 1000 else rng.uniform(700, 805)
    lz.lapiz([bezier((x, y), (x + rng.normal(0, 3), y - 7), (x + rng.normal(0, 6), y - rng.uniform(10, 18)))],
             rng.choice(['#4f6f45', '#7f9f5a']), grosor=0.6, presion=0.5, temblor=0.2)

# ------------------------------------------------------------------ the deciduous tree (behind the table)
tronco = Trazo([(1150, 700), (1146, 600), (1140, 480), (1128, 380), (1110, 300)], (40, 34, 30, 26, 20))
lz.aguada(tronco, '#8a6a52', dens=0.75, tapa=1, borde=0.6, gran=0.6,
          toques=[(1160, 600, 40, '#5e4a3a', 0.6), (1130, 400, 30, '#a08060', 0.5)])
sombra_lado(lz, tronco, 1, '#4a3428', dens=0.35)
lz.contorno(tronco, '#4a3428', grosor=0.9, presion=0.55, cortes=0.3)
lz.lapiz([bezier((1140 + k * 6, 690), (1136 + k * 6, 560), (1124 + k * 5, 420), n=20) for k in (-2, 0, 2)],
         '#5e4a3a', grosor=0.6, presion=0.3, temblor=0.6, cortes=0.4)
for (a, b, w) in (((1128, 380), (1040, 270), 14), ((1120, 330), (1200, 240), 12), ((1112, 300), (1100, 200), 11),
                  ((1060, 300), (1000, 250), 7)):
    f = Trazo([a, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 6), b], (w, w * 0.6, w * 0.35))
    lz.aguada(f, '#8a6a52', dens=0.75, tapa=1, gran=0.5)
    lz.contorno(f, '#4a3428', grosor=0.7, presion=0.5, cortes=0.3)
# the crown: big soft clumps, light and air between them
copa = [(1000, 250, 70), (1080, 190, 80), (1180, 180, 78), (1260, 240, 70), (1220, 300, 60), (1050, 300, 55),
        (1130, 260, 70), (960, 300, 45), (1310, 300, 45)]
for i, (x, y, r) in enumerate(copa):
    f = Circulos([(x + rng.normal(0, r * 0.2), y + rng.normal(0, r * 0.15), r * rng.uniform(0.5, 0.7))
                  for _ in range(5)])
    col = ['#6f9a4a', '#88a85a', '#5f8f4a', '#7aa456'][i % 4]
    lz.aguada(f, col, dens=0.72, tapa=0.85, borde=0.7, gran=0.45, irreg=0.9,
              toques=[(x - r * 0.3, y - r * 0.35, r * 0.5, '#c9d27a', 0.6), (x + r * 0.3, y + r * 0.35, r * 0.5, '#3f6f45', 0.6)])
    lz.contorno(f, VERDE_O, grosor=0.7, presion=0.4, cortes=0.45)
for (x, y) in puntos_dentro(Circulos([(x, y, r * 0.8) for x, y, r in copa]), 70, 77):
    hojita(lz, x, y, rng.uniform(9, 14), rng.uniform(0, 360), rng.choice(['#4f7a3a', '#9fbf6a', '#6f9a4a']),
           tapa=0.6, dens=0.8)
# a few ripe apricots among the leaves
for (x, y) in ((1040, 230), (1196, 210), (1262, 268), (1090, 300), (1160, 160)):
    lz.aguada(Elipse(x, y, 6.5), '#f2a03a', dens=0.9, tapa=1, irreg=0.2, toques=[(x - 2, y - 2, 3, ORO, 0.8)])
    lz.contorno(Elipse(x, y, 6.5), '#b0602a', grosor=0.5, presion=0.45)
# the dappled shade it throws on the ground and the table
for k in range(9):
    x = rng.uniform(980, 1340)
    y = rng.uniform(600, 760)
    lz.aguada(Elipse(x, y, rng.uniform(25, 55), rng.uniform(8, 16)), '#9aa0c0', dens=0.22, suave=6, gran=0.3)

# ------------------------------------------------------------------ the earthen house
FL, FR, TOP, BOT = 470, 790, 372, 622
SR, STOP, SBOT = 900, 352, 596          # side wall recedes to the right
frente = Poligono([(FL, TOP), (FR, TOP), (FR, BOT), (FL, BOT)], suave=False)
lado = Poligono([(FR, TOP), (SR, STOP), (SR, SBOT), (FR, BOT)], suave=False)
lz.aguada(frente, TIERRA, dens=0.72, tapa=1, borde=0.7, gran=0.65, var=0.5,
          toques=[(520, 420, 90, '#e8b48a', 0.6), (760, 600, 90, TIERRA_O, 0.5), (640, 500, 70, '#e0a27a', 0.4)])
lz.aguada(lado, '#c4835e', dens=0.78, tapa=1, borde=0.7, gran=0.65, var=0.5,
          toques=[(860, 560, 70, '#a8603e', 0.6)])
lz.aguada(lado, '#7a5a7a', dens=0.18, gran=0.3)   # the side in shade (cool glaze)
# rammed-earth courses (tapial): horizontal layers with pebbles
cap = []
for y in np.arange(TOP + 42, BOT, 42):
    cap.append(np.array([(FL + 2, y + rng.normal(0, 1)), (FR - 2, y + rng.normal(0, 1))]))
    t = (y - TOP) / (BOT - TOP)
    cap.append(np.array([(FR + 2, y), (SR - 2, STOP + t * (SBOT - STOP))]))
lz.lapiz(cap, '#9a5a3a', grosor=0.7, presion=0.4, temblor=0.6, cortes=0.4)
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


# the front window (left): the breeze comes OUT of it, the curtain flies
VX, VY, VW, VH = 508, 430, 74, 86
ventana_frente(VX, VY, VW, VH)
cort = Poligono([(VX + 6, VY + 2), (VX + 30, VY + 2), (VX - 30, VY + 36), (VX - 70, VY + 70), (VX - 46, VY + 40), (VX - 10, VY + 30)])
lz.aguada(cort, '#f6e6d0', dens=0.45, tapa=1, irreg=0.4, borde=0.8, toques=[(VX - 30, VY + 40, 20, '#f0c8b0', 0.6)])
lz.contorno(cort, '#b08a7a', grosor=0.7, presion=0.45, cortes=0.2)
lz.lapiz([bezier((VX + 10, VY + 6), (VX - 10, VY + 20), (VX - 50, VY + 50)), bezier((VX + 20, VY + 6), (VX - 4, VY + 26), (VX - 36, VY + 42))],
         '#c09a8a', grosor=0.5, presion=0.35)
# the door, arched, wooden, ajar with warm light inside
DX, DY, DW, DH = 640, 470, 70, 152
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
# the striped awning over the right-hand window (lowered against the sun)
WX, WY, WW, WH = 724, 430, 52, 70
ventana_frente(WX, WY, WW, WH)
toldo = Poligono([(WX - 16, WY - 20), (WX + WW + 16, WY - 20), (WX + WW + 26, WY + 18), (WX - 26, WY + 18)], suave=False)
lz.aguada(toldo, '#f6efe0', dens=0.4, tapa=1, irreg=0.2)
for k in range(5):
    t0, t1 = k / 5, (k + 0.5) / 5
    q = Poligono([(WX - 16 + (WW + 32) * t0, WY - 20), (WX - 16 + (WW + 32) * t1, WY - 20),
                  (WX - 26 + (WW + 52) * t1, WY + 18), (WX - 26 + (WW + 52) * t0, WY + 18)], suave=False)
    lz.aguada(q, CORAL, dens=0.8, irreg=0.25)
for k in range(9):
    x = WX - 26 + (WW + 52) * (k + 0.5) / 9
    lz.aguada(Elipse(x, WY + 20, (WW + 52) / 18, 4.5), CORAL if k % 2 else '#f6efe0', dens=0.8, tapa=1, irreg=0.2)
lz.contorno(toldo, '#9a3a2e', grosor=0.7, presion=0.5)
lz.aguada(Poligono([(WX - 20, WY + 22), (WX + WW + 20, WY + 22), (WX + WW + 12, WY + 50), (WX - 12, WY + 50)]), '#7a4a5a',
          dens=0.2, suave=6)   # its shade on the wall
# the side window (facing the tree): open, the breeze ENTERS here
sw = Poligono([(830, 430), (868, 424), (868, 498), (830, 506)], suave=False)
lz.aguada(Poligono([(824, 424), (874, 416), (874, 504), (824, 512)], suave=False), '#efe2c8', dens=0.5, tapa=1, irreg=0.4)
lz.aguada(sw, '#7a4a3a', dens=0.75, tapa=1, irreg=0.3, toques=[(850, 450, 20, '#e8a060', 0.6)])
lz.contorno(sw, '#5e3f30', grosor=0.8, presion=0.55)
cs_ = Poligono([(834, 432), (850, 430), (842, 470), (848, 500), (836, 500)])
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
JARDIN = Poligono([(FL - 14, TOP - 20), (FL - 6, TOP - 50), (520, TOP - 70), (580, TOP - 92), (650, TOP - 80),
                   (720, TOP - 100), (780, TOP - 82), (840, STOP - 70), (880, STOP - 76), (SR + 10, STOP - 40),
                   (SR + 12, STOP - 22), (FR + 14, TOP - 20)])
jardin(lz, JARDIN, paleta=(CORAL, ORO, CARMIN, '#f39ab0', '#f2a03a', '#a99bcb'), verdes=('#5f8f4a', '#86a86c', '#3f7a6a'),
       base='#7aa456', base_dens=0.75, escala=0.85, densidad=1.0, semilla=71)
lz.contorno(JARDIN, VERDE_O, grosor=0.7, presion=0.4, cortes=0.5)
# a tomato plant and a sunflower stand up out of the roof garden
lz.lapiz([spline([(842, 284), (846, 230), (840, 180)])], '#4f6f45', grosor=1.4, presion=0.7)
for (x, y, a) in ((844, 250, -30), (842, 220, 200), (841, 196, -20)):
    hojita(lz, x, y, 16, a, '#5f8f4a', tapa=1)
flor_grande(lz, 840, 176, 17, ORO, centro='#6a3a1e', petalos=11)
for (x, y) in ((560, 284), (574, 296), (552, 300)):
    lz.aguada(Elipse(x, y, 5.5), CARMIN, dens=0.95, tapa=1, irreg=0.2, toques=[(x - 2, y - 2, 2, '#f08a7a', 0.8)])

# ------------------------------------------------------------------ the young woman watering on the roof (sunset)
P4 = 'piel3'
pierna2(lz, (680, 266), (650, 290), (690, 300), 17, '#6a5a9a', P4, pie_ang=0, zapato='#5e3f30', sombra=1)
torso2(lz, (664, 214), (700, 214), (670, 268), (698, 268), '#f2c04a', cintura=0.92, sombra=1)
cuello(lz, (682, 180), 18, (682, 212), P4)
cabeza2(lz, 682, 180, 18, P4, '#2a1a14', 'trenza', giro=0.55, inclina=12, ojos='abajo', boca='sonrisa')
brazo2(lz, (696, 220), (716, 246), (738, 236), 12, '#f2c04a', P4, 'corta', sombra=1,
       mano=dict(ang=-10, gesto='agarra', lado=1, tam=19))
# the watering can and its rain of light, falling on the flowers
reg = Poligono([(728, 230), (760, 226), (764, 254), (732, 258)])
lz.aguada(reg, '#4f9c9a', dens=0.85, tapa=1, irreg=0.3, toques=[(740, 236, 10, '#7fc0b8', 0.6)])
lz.contorno(reg, '#2f5f5a', grosor=0.7, presion=0.5)
lz.aguada(Trazo([(760, 240), (790, 226)], (5, 3)), '#4f9c9a', dens=0.85, tapa=1)
lz.lapiz([arco(744, 224, 10, 8, 180, 360, 12)], '#2f5f5a', grosor=0.9, presion=0.6)
lz.aguada(Elipse(792, 225, 4, 6, 30), '#4f9c9a', dens=0.85, tapa=1)
for k in range(14):
    t = rng.uniform(0, 1)
    x = 796 + t * 40 + rng.normal(0, 4)
    y = 230 + t * t * 50 + rng.normal(0, 4)
    lz.aguada(Elipse(x, y, 1.6, 2.6, -30), '#7fb5d3', dens=0.9, irreg=0.1)
    if k % 3 == 0:
        lz.gouache(Elipse(x + 0.6, y - 0.8, 0.7), '#fffdf6', alfa=0.9, irreg=0)
brazo2(lz, (668, 222), (690, 252), (726, 254), 12, '#f2c04a', P4, 'corta', sombra=-1,
       mano=dict(ang=0, gesto='agarra', lado=-1, tam=19))
for (x, y) in ((640, 296), (660, 300), (700, 302), (724, 298)):     # plants in front of her knees
    hojita(lz, x, y, rng.uniform(14, 20), rng.uniform(230, 310), rng.choice(['#5f8f4a', '#86a86c']), tapa=1)
flor_simple(lz, 712, 290, 7, CORAL, centro=ORO)

# ------------------------------------------------------------------ the breeze: out of the front window, a ribbon
brisa = np.vstack([bezier((VX - 20, VY + 40), (VX - 120, VY + 30), (VX - 160, VY - 60), (VX - 250, VY - 110), 50),
                   bezier((VX - 250, VY - 110), (VX - 330, VY - 150), (VX - 360, VY - 250), (VX - 300, VY - 290), 40)[1:]])
d = np.r_[0, np.cumsum(np.hypot(*np.diff(brisa, axis=0).T))]
tt = d / d[-1]
ancho = 6 + 16 * np.sin(np.pi * tt) * np.abs(np.cos(tt * np.pi * 2.2)) + 2
tg = np.gradient(brisa, axis=0)
tg /= np.maximum(np.hypot(*tg.T)[:, None], 1e-9)
nr = np.stack([-tg[:, 1], tg[:, 0]], 1)
cinta = Poligono(np.vstack([brisa + nr * ancho[:, None] / 2, (brisa - nr * ancho[:, None] / 2)[::-1]]), suave=False)
lz.aguada(cinta, '#a8d4d0', dens=0.45, irreg=0.5, borde=0.9, gran=0.2, tapa=0.6,
          toques=[(VX - 200, VY - 80, 60, '#c8e4d8', 0.6), (VX - 330, VY - 230, 50, '#f6d7a8', 0.5)])
lz.lapiz([brisa + nr * ancho[:, None] / 2, brisa - nr * ancho[:, None] / 2], '#5a9a9a', grosor=0.6, presion=0.45,
         temblor=0.3, cortes=0.3)
lz.lapiz([brisa[::1] + nr * (ancho[:, None] * 0.1)], '#7ab0b0', grosor=0.5, presion=0.35, temblor=0.5, cortes=0.5)
# what the breeze carries: petals, leaves, two swallows
for k in range(16):
    j = int(rng.uniform(0.15, 0.98) * (len(brisa) - 1))
    x, y = brisa[j] + nr[j] * rng.normal(0, 18)
    if k % 3 == 0:
        hojita(lz, x, y, rng.uniform(9, 13), rng.uniform(0, 360), rng.choice(['#6f9a4a', '#9fbf6a']), tapa=0.8)
    else:
        lz.aguada(Elipse(x, y, rng.uniform(3.5, 5), rng.uniform(2.2, 3.2), rng.uniform(0, 180)),
                  rng.choice([CORAL, '#f39ab0', CARMIN, ORO]), dens=0.8, irreg=0.3, borde=0.7, tapa=0.8)
pajaro(lz, 236, 120, 15, TEAL, ang=-28)
pajaro(lz, 300, 92, 12, CORAL, ang=-12, alas='abajo')

# ------------------------------------------------------------------ the shared table under the tree
# the grandmother at the far end (behind the table): she sets down the dish
P1 = 'piel3'
brazo2(lz, (1018, 478), (1030, 526), (1066, 540), 18, '#8d73b0', P1, 'larga', sombra=1,
       mano=dict(ang=-10, gesto='relajada', lado=-1, tam=28))
cuello(lz, (1004, 440), 25, (1006, 476), P1)
torso2(lz, (982, 474), (1028, 476), (986, 580), (1030, 580), '#8d73b0', cintura=0.98, sombra=1,
       toques=[(1020, 540, 30, '#6a5290', 0.6)], pliegues=[[(996, 500), (1000, 540), (998, 576)]])
# her apron
lz.aguada(Poligono([(992, 520), (1024, 520), (1030, 586), (988, 586)]), '#f6efe0', dens=0.5, tapa=1, irreg=0.3)
lz.contorno(Poligono([(992, 520), (1024, 520), (1030, 586), (988, 586)]), '#a08a7a', grosor=0.6, presion=0.45)
cabeza2(lz, 1004, 440, 25, P1, '#4f9c9a', 'panuelo', giro=0.5, inclina=10, ojos='abajo', boca='sonrisa')
brazo2(lz, (986, 482), (1000, 534), (1044, 552), 18, '#8d73b0', P1, 'larga', sombra=-1,
       mano=dict(ang=10, gesto='relajada', lado=1, tam=28))

# the girl on the far bench, holding up her cup
P2 = 'piel1'
cuello(lz, (1164, 486), 21, (1164, 518), P2)
torso2(lz, (1144, 516), (1184, 516), (1148, 590), (1182, 590), CORAL, cintura=1.0, sombra=1,
       toques=[(1176, 560, 25, '#c0503a', 0.5)])
cabeza2(lz, 1164, 486, 21, P2, '#c0602e', 'coleta', giro=0.35, inclina=-14, ojos='abiertos', boca='risa', mira=(1, -1))

# the table: long, seen in perspective, tablecloth with a coral border
MESA = Poligono([(960, 590), (1080, 572), (1352, 676), (1206, 716)], suave=False)
lz.aguada(MESA, '#f6efe0', dens=0.45, tapa=1, irreg=0.35, borde=0.6,
          toques=[(1250, 690, 60, '#e8d4b8', 0.6), (1040, 590, 40, '#9aa0c0', 0.4)])
falda_m = Poligono([(960, 590), (1206, 716), (1206, 752), (958, 620)], suave=False)
lz.aguada(falda_m, '#f0e2cc', dens=0.5, tapa=1, irreg=0.35, toques=[(1100, 690, 50, '#c9b8a0', 0.6)])
lz.aguada(Trazo([(958, 614), (1206, 744)], (8, 9)), CORAL, dens=0.8, irreg=0.3)
for t in np.linspace(0.04, 0.96, 14):
    x, y = 958 + t * 248, 614 + t * 130
    lz.gouache(Elipse(x, y, 1.6), '#fff3cf', alfa=0.9, irreg=0)
falda_n = Poligono([(1206, 716), (1352, 676), (1352, 708), (1206, 752)], suave=False)
lz.aguada(falda_n, '#e6d6bc', dens=0.5, tapa=1, irreg=0.35)
lz.aguada(Trazo([(1206, 744), (1352, 701)], (8, 8)), CORAL, dens=0.8, irreg=0.3)
for f in (MESA, falda_m, falda_n):
    lz.contorno(f, '#a07a60', grosor=0.8, presion=0.5, cortes=0.25)
for (lx, ly) in ((968, 618), (1200, 750), (1346, 706)):
    extremidad_leg = Trazo([(lx, ly), (lx + 1, ly + 46)], (6, 5))
    lz.aguada(extremidad_leg, MADERA, dens=0.8, tapa=1, irreg=0.3)
    lz.contorno(extremidad_leg, '#3e2a24', grosor=0.6, presion=0.5)
# what is on the table: the steaming dish, bread, tomatoes, glasses
fuente = Elipse(1060, 584, 34, 11)
lz.aguada(fuente, '#c0603a', dens=0.85, tapa=1, irreg=0.3, toques=[(1060, 584, 20, '#e8a060', 0.6)])
lz.aguada(Elipse(1060, 580, 26, 7), '#e8b04a', dens=0.8, irreg=0.3, toques=[(1052, 578, 8, CARMIN, 0.7), (1070, 580, 8, '#7aa456', 0.7)])
lz.contorno(fuente, '#7a3a22', grosor=0.7, presion=0.55)
for k in range(3):
    x = 1046 + k * 14
    lz.lapiz([bezier((x, 572), (x - 8, 556), (x + 6, 540), (x - 2, 522))], '#c8b8a8', grosor=0.6, presion=0.4, temblor=0.5)
pan = Elipse(1150, 620, 24, 10, 20)
lz.aguada(pan, '#d9a441', dens=0.85, tapa=1, irreg=0.3, toques=[(1150, 616, 12, '#f2d36b', 0.6)])
lz.lapiz([[(1138 + k * 9, 614 + k * 3), (1142 + k * 9, 622 + k * 3)] for k in range(3)], '#8a5a22', grosor=0.6, presion=0.5)
lz.contorno(pan, '#8a5a22', grosor=0.6, presion=0.5)
for (x, y) in ((1210, 648), (1222, 654), (1214, 660)):
    lz.aguada(Elipse(x, y, 6), CARMIN, dens=0.95, tapa=1, irreg=0.2, toques=[(x - 2, y - 2, 2, '#f08a7a', 0.8)])
    lz.lapiz([[(x, y - 6), (x + 2, y - 9)]], '#4f6f45', grosor=0.7, presion=0.6)
for (x, y) in ((1100, 598), (1262, 676), (1290, 664)):
    v = Poligono([(x - 5, y - 16), (x + 5, y - 16), (x + 4, y), (x - 4, y)], suave=False)
    lz.aguada(v, '#bfe0e0', dens=0.4, tapa=1, irreg=0.2, toques=[(x, y - 4, 4, '#7fb5d3', 0.7)])
    lz.contorno(v, '#6a9a9a', grosor=0.5, presion=0.5)
flor_simple(lz, 1296, 640, 8, '#f39ab0', centro=ORO)
lz.aguada(Trazo([(1296, 646), (1296, 668)], (2, 2)), '#4f6f45', dens=0.8)
lz.aguada(Poligono([(1288, 664), (1304, 664), (1302, 676), (1290, 676)], suave=False), '#4f9c9a', dens=0.8, tapa=1)
# the girl's arms and cup, over the tablecloth
taza = Poligono([(1176, 528), (1196, 528), (1194, 548), (1178, 548)], suave=False)
brazo2(lz, (1148, 522), (1150, 562), (1176, 546), 14, CORAL, P2, 'corta', sombra=-1,
       mano=dict(ang=-30, gesto='agarra', lado=-1, tam=21))
lz.aguada(taza, '#f2c04a', dens=0.8, tapa=1, irreg=0.2)
lz.lapiz([arco(1199, 538, 5, 6, -90, 90, 10)], '#9a6a2a', grosor=0.8, presion=0.6)
lz.contorno(taza, '#9a6a2a', grosor=0.6, presion=0.55)
brazo2(lz, (1182, 522), (1200, 562), (1194, 546), 14, CORAL, P2, 'corta', sombra=1,
       mano=dict(ang=-120, gesto='agarra', lado=1, tam=21))

# the man at the near end, standing, pouring water for her
P3 = 'piel5'
pierna2(lz, (1286, 610), (1290, 700), (1284, 790), 34, '#3f5f8f', P3, pie_ang=180, zapato='#5e3f30', sombra=1)
pierna2(lz, (1314, 612), (1330, 702), (1344, 788), 34, '#3f5f8f', P3, pie_ang=10, zapato='#5e3f30', sombra=1)
brazo2(lz, (1330, 500), (1342, 560), (1318, 600), 24, '#e8e0cc', P3, 'tres', sombra=1,
       mano=dict(ang=200, gesto='relajada', lado=1, tam=36))
cuello(lz, (1300, 432), 30, (1302, 482), P3)
torso2(lz, (1268, 488), (1334, 492), (1278, 612), (1322, 614), '#e8e0cc', cintura=0.96, sombra=1,
       toques=[(1320, 580, 40, '#c8b8a0', 0.6)],
       pliegues=[[(1290, 520), (1296, 560), (1292, 600)], [(1314, 530), (1318, 570)]])
lz.aguada(Trazo([(1276, 612), (1300, 616), (1324, 614)], (9, 9, 9)), '#7a4a2a', dens=0.8, tapa=1)   # belt
cabeza2(lz, 1300, 432, 30, P3, '#1e1410', 'corto', giro=-0.55, inclina=-10, ojos='abajo', boca='sonrisa',
        barba='#2a1a14')
# his near arm lifts the jug and pours: water falls into her cup
JX, JY = 1218, 512
brazo2(lz, (1272, 496), (1248, 552), (JX + 18, JY + 18), 24, '#e8e0cc', P3, 'tres', sombra=-1, mano=None)
jarra = Poligono([(JX - 6, JY - 22), (JX + 22, JY - 30), (JX + 34, JY + 4), (JX + 26, JY + 24), (JX + 2, JY + 28), (JX - 8, JY + 4)])
lz.aguada(jarra, '#c0603a', dens=0.85, tapa=1, borde=0.7, irreg=0.3, toques=[(JX + 6, JY - 6, 10, '#e8a060', 0.6)])
lz.lapiz([arco(JX + 6, JY + 0, 13, 11, 200, 340, 14, -15)], '#f6efe0', grosor=0.9, presion=0.6)
lz.contorno(jarra, '#7a3a22', grosor=0.8, presion=0.55, cortes=0.1)
lz.aguada(Poligono([(JX - 8, JY - 20), (JX - 18, JY - 24), (JX - 8, JY - 12)], suave=False), '#c0603a', dens=0.85, tapa=1)
chorro = Trazo([(JX - 16, JY - 20), (JX - 26, JY - 2), (1192, 526)], (3.5, 3, 2.4))
lz.aguada(chorro, '#8fc8e0', dens=0.75, irreg=0.2, borde=0.8)
lz.gouache(Trazo([(JX - 17, JY - 16), (JX - 24, JY - 2)], (1, 0.8)), '#fffdf6', alfa=0.8, irreg=0)
for k in range(4):
    lz.gouache(Elipse(1188 + rng.normal(0, 5), 524 + rng.normal(0, 3), 0.9), '#e8f6ff', alfa=0.9, irreg=0)
mano2(lz, JX + 22, JY + 20, -100, 36, P3, 'agarra', lado=1)

# a bench in front (near side)
banco = Poligono([(1090, 742), (1180, 790), (1180, 802), (1090, 754)], suave=False)
lz.aguada(banco, MADERA, dens=0.75, tapa=1, irreg=0.3)
lz.contorno(banco, '#3e2a24', grosor=0.7, presion=0.5)

lz.vineta(margen=26)
lz.guardar(SALIDA)
print('ok', SALIDA)
