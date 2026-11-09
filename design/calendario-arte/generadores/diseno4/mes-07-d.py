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
for (cx, cy, rx, ry, c) in ((690, 628, 260, 22, '#c9b58a'), (1150, 742, 230, 34, '#c9b58a'), (900, 650, 90, 12, '#cfc090')):
    lz.aguada(Elipse(cx, cy, rx, ry), c, dens=0.38, suave=16, gran=0.45, toques=[(cx - rx * 0.3, cy, rx * 0.4, '#b9c58a', 0.6)])
lz.aguada(Elipse(1170, 748, 170, 18), '#9a8aa8', dens=0.25, suave=10, gran=0.3)   # the table's shadow
for k in range(34):
    x = rng.uniform(440, 1380)
    y = rng.uniform(616, 650) if x < 960 else rng.uniform(720, 790)
    lz.lapiz([bezier((x, y), (x + rng.normal(0, 3), y - 7), (x + rng.normal(0, 6), y - rng.uniform(10, 18)))],
             rng.choice(['#4f6f45', '#7f9f5a']), grosor=0.6, presion=0.5, temblor=0.2)

# ------------------------------------------------------------------ the deciduous tree (behind the table)
tronco = Trazo([(1100, 700), (1096, 600), (1090, 480), (1078, 380), (1060, 300)], (40, 34, 30, 26, 20))
lz.aguada(tronco, '#8a6a52', dens=0.75, tapa=1, borde=0.6, gran=0.6,
          toques=[(1110, 600, 40, '#5e4a3a', 0.6), (1080, 400, 30, '#a08060', 0.5)])
sombra_lado(lz, tronco, 1, '#4a3428', dens=0.35)
lz.contorno(tronco, '#4a3428', grosor=0.9, presion=0.55, cortes=0.3)
lz.lapiz([bezier((1090 + k * 6, 690), (1086 + k * 6, 560), (1074 + k * 5, 420), n=20) for k in (-2, 0, 2)],
         '#5e4a3a', grosor=0.6, presion=0.3, temblor=0.6, cortes=0.4)
for (a, b, w) in (((1078, 380), (990, 270), 14), ((1070, 330), (1150, 240), 12), ((1062, 300), (1050, 200), 11),
                  ((1010, 300), (950, 250), 7)):
    f = Trazo([a, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 6), b], (w, w * 0.6, w * 0.35))
    lz.aguada(f, '#8a6a52', dens=0.75, tapa=1, gran=0.5)
    lz.contorno(f, '#4a3428', grosor=0.7, presion=0.5, cortes=0.3)
# the crown: ragged layered masses (dark behind, light in front), leaves breaking the silhouette
def masa(cx, cy, rx, ry, n=14, sem=0):
    r_ = np.random.default_rng(sem)
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n
        f = r_.uniform(0.78, 1.12)
        pts.append((cx + math.cos(a) * rx * f, cy + math.sin(a) * ry * f))
    return Poligono(pts)


capas = [((1100, 220, 190, 120), '#4f7f45', 0.8, [(1190, 280, 80, '#2f5a3a', 0.6)]),
         ((1010, 250, 120, 80), '#6f9a4a', 0.75, [(970, 220, 60, '#a9c46a', 0.6)]),
         ((1180, 190, 120, 90), '#7aa456', 0.72, [(1150, 150, 60, '#c9d27a', 0.6)]),
         ((1070, 150, 110, 70), '#88b05a', 0.7, [(1050, 130, 50, '#d9dd8a', 0.6)]),
         ((1240, 280, 80, 50), '#6f9a4a', 0.75, []), ((940, 300, 70, 45), '#7aa456', 0.72, [])]
for i, ((cx, cy, rx, ry), col, dd, tq) in enumerate(capas):
    f = masa(cx, cy, rx, ry, 16, 70 + i)
    lz.aguada(f, col, dens=dd, tapa=0.9 if i else 1, borde=0.8, gran=0.45, irreg=1.8, flor=0 if i else 1, toques=tq)
    lz.contorno(f, VERDE_O, grosor=0.6, presion=0.35, cortes=0.55)
    for (x, y) in puntos_dentro(f, 10, 90 + i):
        hojita(lz, x, y, rng.uniform(10, 15), rng.uniform(0, 360), rng.choice(['#3f6f45', '#9fbf6a', '#5f8f4a']),
               tapa=0.5, dens=0.75)
# leaves at the rim of the crown, so its edge is made of leaves
for k in range(46):
    a = rng.uniform(0, 2 * math.pi)
    x = 1100 + math.cos(a) * 205 * rng.uniform(0.9, 1.05)
    y = 215 + math.sin(a) * 135 * rng.uniform(0.9, 1.05)
    if y > 320:
        continue
    hojita(lz, x, y, rng.uniform(12, 17), math.degrees(a) + rng.normal(0, 30), rng.choice(['#4f7f45', '#7aa456', '#9fbf6a']),
           tapa=0.8)
# a few ripe apricots among the leaves
for (x, y) in ((990, 236), (1146, 214), (1212, 268), (1050, 300), (1110, 160), (1250, 200)):
    lz.aguada(Elipse(x, y, 6.5), '#f2a03a', dens=0.9, tapa=1, irreg=0.2, toques=[(x - 2, y - 2, 3, ORO, 0.8)])
    lz.contorno(Elipse(x, y, 6.5), '#b0602a', grosor=0.5, presion=0.45)
# the dappled shade it throws on the ground and the table
for k in range(9):
    x = rng.uniform(930, 1290)
    y = rng.uniform(550, 760)
    lz.aguada(Elipse(x, y, rng.uniform(25, 55), rng.uniform(8, 16)), '#9aa0c0', dens=0.22, suave=6, gran=0.3)

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
VX, VY, VW, VH = 578, 430, 74, 86
ventana_frente(VX, VY, VW, VH)
cort = Poligono([(VX + 6, VY + 2), (VX + 30, VY + 2), (VX - 30, VY + 36), (VX - 70, VY + 70), (VX - 46, VY + 40), (VX - 10, VY + 30)])
lz.aguada(cort, '#f6e6d0', dens=0.45, tapa=1, irreg=0.4, borde=0.8, toques=[(VX - 30, VY + 40, 20, '#f0c8b0', 0.6)])
lz.contorno(cort, '#b08a7a', grosor=0.7, presion=0.45, cortes=0.2)
lz.lapiz([bezier((VX + 10, VY + 6), (VX - 10, VY + 20), (VX - 50, VY + 50)), bezier((VX + 20, VY + 6), (VX - 4, VY + 26), (VX - 36, VY + 42))],
         '#c09a8a', grosor=0.5, presion=0.35)
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
# the striped awning over the right-hand window (lowered against the sun)
WX, WY, WW, WH = 794, 430, 52, 70
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
pajaro(lz, 306, 120, 15, TEAL, ang=-28)
pajaro(lz, 370, 92, 12, CORAL, ang=-12, alas='abajo')

# ------------------------------------------------------------------ the shared table under the tree
# the grandmother at the far end (behind the table): she sets down the dish
P1 = 'piel3'
brazo2(lz, (968, 478), (1000, 520), (1040, 540), 18, '#8d73b0', P1, 'larga', sombra=1, mano=None)
cuello(lz, (954, 440), 25, (956, 476), P1)
torso2(lz, (932, 474), (978, 476), (936, 580), (980, 580), '#8d73b0', cintura=0.98, sombra=1,
       toques=[(970, 540, 30, '#6a5290', 0.6)], pliegues=[[(946, 500), (950, 540), (948, 576)]])
# her apron
lz.aguada(Poligono([(942, 520), (974, 520), (980, 586), (938, 586)]), '#f6efe0', dens=0.5, tapa=1, irreg=0.3)
lz.contorno(Poligono([(942, 520), (974, 520), (980, 586), (938, 586)]), '#a08a7a', grosor=0.6, presion=0.45)
cabeza2(lz, 954, 440, 25, P1, '#4f9c9a', 'panuelo', giro=0.5, inclina=10, ojos='abajo', boca='sonrisa')
# the earthenware dish, still in her hands, steaming
fuente = Poligono(np.vstack([arco(1016, 540, 38, 9, 180, 360, 20), arco(1016, 540, 32, 18, 0, 180, 20)]), suave=False)
lz.aguada(fuente, '#c0603a', dens=0.85, tapa=1, irreg=0.3, borde=0.7, toques=[(1030, 550, 20, '#8a3a22', 0.6)])
lz.aguada(Elipse(1016, 540, 34, 7), '#e8b04a', dens=0.85, irreg=0.3, tapa=1,
          toques=[(1004, 539, 8, CARMIN, 0.7), (1028, 541, 8, '#7aa456', 0.7)])
lz.contorno(fuente, '#7a3a22', grosor=0.7, presion=0.55)
lz.lapiz([arco(1016, 540, 38, 9, 0, 360, 30)], '#7a3a22', grosor=0.6, presion=0.5)
for k in range(3):
    x = 1002 + k * 14
    lz.lapiz([bezier((x, 532), (x - 8, 516), (x + 6, 500), (x - 2, 482))], '#c8b8a8', grosor=0.7, presion=0.45, temblor=0.5)
mano2(lz, 1050, 548, 200, 26, P1, 'agarra', lado=-1)
brazo2(lz, (936, 482), (950, 534), (984, 546), 18, '#8d73b0', P1, 'larga', sombra=-1,
       mano=dict(ang=10, gesto='agarra', lado=1, tam=26))

# the girl on the far bench, holding up her cup
P2 = 'piel1'
cuello(lz, (1114, 486), 21, (1114, 518), P2)
torso2(lz, (1094, 516), (1134, 516), (1098, 590), (1132, 590), CORAL, cintura=1.0, sombra=1,
       toques=[(1126, 560, 25, '#c0503a', 0.5)])
cabeza2(lz, 1114, 486, 21, P2, '#c0602e', 'coleta', giro=0.35, inclina=-14, ojos='abiertos', boca='risa', mira=(1, -1))

# the table: long, seen in perspective, tablecloth with a coral border
MESA = Poligono([(910, 590), (1030, 572), (1302, 676), (1156, 716)], suave=False)
lz.aguada(MESA, '#f6efe0', dens=0.45, tapa=1, irreg=0.35, borde=0.6,
          toques=[(1200, 690, 60, '#e8d4b8', 0.6), (990, 590, 40, '#9aa0c0', 0.4)])
falda_m = Poligono([(910, 590), (1156, 716), (1156, 752), (908, 620)], suave=False)
lz.aguada(falda_m, '#f0e2cc', dens=0.5, tapa=1, irreg=0.35, toques=[(1050, 690, 50, '#c9b8a0', 0.6)])
lz.aguada(Trazo([(908, 614), (1156, 744)], (8, 9)), CORAL, dens=0.8, irreg=0.3)
for t in np.linspace(0.04, 0.96, 14):
    x, y = 958 + t * 248, 614 + t * 130
    lz.gouache(Elipse(x, y, 1.6), '#fff3cf', alfa=0.9, irreg=0)
falda_n = Poligono([(1156, 716), (1302, 676), (1302, 708), (1156, 752)], suave=False)
lz.aguada(falda_n, '#e6d6bc', dens=0.5, tapa=1, irreg=0.35)
lz.aguada(Trazo([(1156, 744), (1302, 701)], (8, 8)), CORAL, dens=0.8, irreg=0.3)
for f in (MESA, falda_m, falda_n):
    lz.contorno(f, '#a07a60', grosor=0.8, presion=0.5, cortes=0.25)
for (lx, ly) in ((918, 618), (1150, 750), (1296, 706)):
    extremidad_leg = Trazo([(lx, ly), (lx + 1, ly + 46)], (6, 5))
    lz.aguada(extremidad_leg, MADERA, dens=0.8, tapa=1, irreg=0.3)
    lz.contorno(extremidad_leg, '#3e2a24', grosor=0.6, presion=0.5)
# what is on the table: the steaming dish, bread, tomatoes, glasses
lz.aguada(Elipse(1012, 578, 36, 6), '#9a8aa8', dens=0.3, suave=4)   # where the dish will rest
pan = Elipse(1100, 620, 24, 10, 20)
lz.aguada(pan, '#d9a441', dens=0.85, tapa=1, irreg=0.3, toques=[(1100, 616, 12, '#f2d36b', 0.6)])
lz.lapiz([[(1088 + k * 9, 614 + k * 3), (1092 + k * 9, 622 + k * 3)] for k in range(3)], '#8a5a22', grosor=0.6, presion=0.5)
lz.contorno(pan, '#8a5a22', grosor=0.6, presion=0.5)
for (x, y) in ((1160, 648), (1172, 654), (1164, 660)):
    lz.aguada(Elipse(x, y, 6), CARMIN, dens=0.95, tapa=1, irreg=0.2, toques=[(x - 2, y - 2, 2, '#f08a7a', 0.8)])
    lz.lapiz([[(x, y - 6), (x + 2, y - 9)]], '#4f6f45', grosor=0.7, presion=0.6)
for (x, y) in ((1050, 598), (1212, 676), (1240, 664)):
    v = Poligono([(x - 5, y - 16), (x + 5, y - 16), (x + 4, y), (x - 4, y)], suave=False)
    lz.aguada(v, '#bfe0e0', dens=0.4, tapa=1, irreg=0.2, toques=[(x, y - 4, 4, '#7fb5d3', 0.7)])
    lz.contorno(v, '#6a9a9a', grosor=0.5, presion=0.5)
flor_simple(lz, 1246, 640, 8, '#f39ab0', centro=ORO)
lz.aguada(Trazo([(1246, 646), (1246, 668)], (2, 2)), '#4f6f45', dens=0.8)
lz.aguada(Poligono([(1238, 664), (1254, 664), (1252, 676), (1240, 676)], suave=False), '#4f9c9a', dens=0.8, tapa=1)
# the girl's arms and cup, over the tablecloth
taza = Poligono([(1124, 514), (1148, 514), (1145, 540), (1127, 540)], suave=False)
brazo2(lz, (1098, 522), (1100, 562), (1126, 546), 14, CORAL, P2, 'corta', sombra=-1,
       mano=dict(ang=-30, gesto='agarra', lado=-1, tam=21))
brazo2(lz, (1132, 522), (1150, 562), (1144, 546), 14, CORAL, P2, 'corta', sombra=1,
       mano=dict(ang=-120, gesto='agarra', lado=1, tam=21))
lz.aguada(taza, '#f2c04a', dens=0.85, tapa=1, irreg=0.2, toques=[(1142, 530, 8, '#d9902e', 0.6)])
lz.aguada(Elipse(1136, 515, 11.5, 3), '#8fc8e0', dens=0.7, tapa=1, irreg=0.1)
lz.lapiz([arco(1150, 526, 5, 7, -90, 90, 10)], '#9a6a2a', grosor=0.9, presion=0.6)
lz.contorno(taza, '#9a6a2a', grosor=0.6, presion=0.55)

# the man at the near end, standing, pouring water for her
P3 = 'piel5'
pierna2(lz, (1236, 610), (1240, 700), (1234, 790), 34, '#3f5f8f', P3, pie_ang=180, zapato='#5e3f30', sombra=1)
pierna2(lz, (1264, 612), (1280, 702), (1294, 788), 34, '#3f5f8f', P3, pie_ang=10, zapato='#5e3f30', sombra=1)
brazo2(lz, (1280, 500), (1292, 560), (1268, 600), 24, '#e8e0cc', P3, 'tres', sombra=1,
       mano=dict(ang=200, gesto='relajada', lado=1, tam=36))
cuello(lz, (1250, 440), 30, (1252, 482), P3)
torso2(lz, (1218, 488), (1284, 492), (1228, 612), (1272, 614), '#e8e0cc', cintura=0.96, sombra=1,
       toques=[(1270, 580, 40, '#c8b8a0', 0.6)],
       pliegues=[[(1240, 520), (1246, 560), (1242, 600)], [(1264, 530), (1268, 570)]])
lz.aguada(Trazo([(1226, 612), (1250, 616), (1274, 614)], (9, 9, 9)), '#7a4a2a', dens=0.8, tapa=1)   # belt
cabeza2(lz, 1250, 440, 30, P3, '#1e1410', 'corto', giro=-0.55, inclina=-10, ojos='abajo', boca='abierta',
        barba=None)
# his near arm lifts the jug and pours: water falls into her cup
JX, JY = 1168, 512
brazo2(lz, (1222, 496), (1198, 552), (JX + 18, JY + 18), 24, '#e8e0cc', P3, 'tres', sombra=-1, mano=None)
# the jug, tilted to pour (belly, narrow neck, lip and spout toward the cup, handle at the back)
ca_, sa_ = math.cos(math.radians(-30)), math.sin(math.radians(-30))
J = lambda u, v: (JX + 12 + u * ca_ - v * sa_, JY + 2 + u * sa_ + v * ca_)
asa = Trazo([J(4, -20), J(22, -16), J(24, 4), J(14, 14)], (5, 5, 5, 4))
lz.aguada(asa, '#b0502e', dens=0.85, tapa=1, irreg=0.2)
lz.contorno(asa, '#7a3a22', grosor=0.6, presion=0.5)
jarra = Poligono([J(-6, -30), J(6, -30), J(9, -20), J(20, -6), J(20, 12), J(10, 24), J(-10, 24), J(-20, 12), J(-20, -6),
                  J(-9, -20)])
lz.aguada(jarra, '#c0603a', dens=0.85, tapa=1, borde=0.7, irreg=0.3, toques=[(*J(-8, 0), 12, '#e8a060', 0.6), (*J(12, 14), 12, '#8a3a22', 0.6)])
lz.aguada(Trazo([J(-14, 2), J(0, 6), J(14, 2)], (4, 4, 4)), '#f6efe0', dens=0.7, irreg=0.2)
for k in range(5):
    lz.aguada(Elipse(*J(-12 + k * 6, -6), 1.6), '#f6efe0', dens=0.8, irreg=0.1)
lz.contorno(jarra, '#7a3a22', grosor=0.8, presion=0.55, cortes=0.1)
lz.aguada(Poligono([J(-6, -30), J(-12, -36), J(-2, -33), J(6, -30)], suave=False), '#c0603a', dens=0.85, tapa=1)
sx_, sy_ = J(-11, -35)
chorro = Trazo([(sx_, sy_), (sx_ - 12, sy_ - 1), (sx_ - 22, sy_ + 8), (1138, 512)], (3.4, 3, 2.6, 2.2))
lz.aguada(chorro, '#8fc8e0', dens=0.75, irreg=0.2, borde=0.8)
lz.gouache(Trazo([(sx_ - 1, sy_ + 3), (sx_ - 9, sy_ + 10)], (1, 0.8)), '#fffdf6', alfa=0.8, irreg=0)
for k in range(4):
    lz.gouache(Elipse(1136 + rng.normal(0, 5), 512 + rng.normal(0, 2), 0.9), '#e8f6ff', alfa=0.9, irreg=0)
mano2(lz, JX + 30, JY + 22, -110, 34, P3, 'agarra', lado=1)

lz.vineta(margen=26)
lz.guardar(SALIDA)
print('ok', SALIDA)
