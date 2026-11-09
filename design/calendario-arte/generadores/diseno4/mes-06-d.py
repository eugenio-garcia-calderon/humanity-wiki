"""
Mes 6 -- Tecnología y Energía -- Diseño 4.

Idea: a giant sunflower whose face IS a solar panel. It turns to the June sun
and drinks it; from its heart a thread of light comes down to the lamp that a
grandfather and a girl are mending together, sitting on one of its leaves: she
screws in a new LED bulb and it lights. A boy on the leaf above lets the
sunflower's seeds go: each seed is a tiny wind turbine, and the flight of them
lands on a little hill village whose roofs share the sunflower's light.

    python3 mes-06-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, rgb, _lapiz_de,
                      hoja, hojita, flor_simple, flor_grande, mata, ramita, pajaro, estrella, motas, remuestrea)
from extra_m678 import (cabeza2, mano2, brazo2, pierna2, torso2, cuello, sombra_lado, piel_lapiz, pie, manga_poly)

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-06-d.png'

lz = Lienzo(ANCHO, semilla=606)

ORO = '#f2b630'
ORO_C = '#f7d36a'
NARANJA = '#ec8a2e'
CORAL = '#e8735e'
TEAL = '#2f8f92'
INDIGO = '#26346a'
VERDE = '#5f8f4a'
VERDE_O = '#3f6f45'
SALVIA = '#98b38a'
LP = '#5e3f30'

rng = np.random.default_rng(6)

# ------------------------------------------------------------------ the June sun: only a warm glow in the corner the flower faces
SOL = (1330, 110)
lz.aguada(Elipse(SOL[0], SOL[1], 130, 105), '#f9e2a8', dens=0.16, suave=34, gran=0.05)
lz.aguada(Elipse(SOL[0], SOL[1], 62, 56), '#f6c45e', dens=0.42, suave=20, gran=0.08)
lz.aguada(Elipse(SOL[0], SOL[1], 30, 28), '#f2a63e', dens=0.55, suave=9, gran=0.05)
lz.luz((SOL[0], SOL[1], 46), '#fff1c0', fuerza=0.5)

# ------------------------------------------------------------------ ground patch under the stem (only there)
suelo = Poligono([(430, 812), (520, 786), (640, 778), (760, 790), (850, 812), (760, 834), (600, 840), (480, 832)])
lz.aguada(suelo, '#c9b07a', dens=0.4, suave=10, gran=0.4, toques=[(640, 800, 120, '#9fb27a', 0.6)])
for k in range(26):
    x = rng.uniform(470, 820)
    y = rng.uniform(788, 826)
    lz.lapiz([bezier((x, y), (x + rng.normal(0, 3), y - 9), (x + rng.normal(0, 7), y - rng.uniform(12, 24)))],
             rng.choice(['#4f6f45', '#6f8f4a']), grosor=0.7, presion=0.55, temblor=0.2)
for (x, y, c) in ((500, 792, '#f2d36b'), (782, 798, CORAL), (812, 806, '#fff3cf'), (468, 808, '#c33c4e')):
    flor_simple(lz, x, y, 5, c, centro='#e7a33e')

# ------------------------------------------------------------------ stem
TALLO = [(626, 830), (630, 720), (646, 600), (668, 500), (690, 420), (708, 372)]
tallo = Trazo(TALLO, (34, 32, 30, 28, 26, 24))
lz.aguada(tallo, '#6f9a4a', dens=0.8, tapa=1, borde=0.6, gran=0.35,
          toques=[(640, 700, 60, '#4f7a3a', 0.6), (690, 440, 50, '#8fb25a', 0.6)],
          desvanece=(640, 760, 628, 838))
sombra_lado(lz, tallo, -1, '#2f5a3a', dens=0.35)
lz.contorno(tallo, VERDE_O, grosor=0.9, presion=0.55, cortes=0.3, solo=(560, 360, 760, 790))
# little hairs on the stem
hairs = []
for (x, y) in remuestrea(spline(TALLO), 9)[2:-4]:
    for sd in (-1, 1):
        hairs.append([(x + sd * 13, y), (x + sd * 18, y - 4)])
lz.lapiz(hairs, VERDE_O, grosor=0.5, presion=0.4, temblor=0.1)


# ------------------------------------------------------------------ leaves
def hojagrande(base, punta, ancho, color, toques=(), curva=0.0, venas=True, tapa=1):
    """A big sunflower leaf, heart-shaped and serrated, from base to tip."""
    b, p = np.asarray(base, float), np.asarray(punta, float)
    d = p - b
    L = np.linalg.norm(d)
    d /= L
    n = np.array([-d[1], d[0]])
    t = np.linspace(0, 1, 26)
    w = ancho / 2 * (np.sin(np.pi * np.clip(t * 1.05, 0, 1)) ** 0.75) * (1 + 0.25 * (1 - t))
    sag = curva * np.sin(np.pi * t) * L
    mid = b[None] + d[None] * (t * L)[:, None] + n[None] * sag[:, None]
    serr = 1 + 0.06 * np.sin(t * 60)
    izq = mid + n[None] * (w * serr)[:, None]
    der = mid - n[None] * (w * serr)[:, None]
    f = Poligono(np.vstack([izq, der[::-1]]), suave=False)
    lz.aguada(f, color, dens=0.82, tapa=tapa, borde=0.75, flor=0, gran=0.4, toques=list(toques))
    lz.aguada(Poligono(np.vstack([mid, der[::-1]]), suave=False), '#2f5a3a', dens=0.22, suave=4, gran=0.3)
    lz.contorno(f, VERDE_O, grosor=0.9, presion=0.55, cortes=0.25)
    if venas:
        tr = [mid[1:-1]]
        for k in range(3, 22, 3):
            for sd in (-1, 1):
                q0 = mid[k]
                q1 = mid[min(25, k + 3)] + n * sd * w[k] * 0.8
                tr.append(bezier(q0, (q0 + q1) / 2 + d * 4, q1, n=12))
        lz.lapiz(tr, '#d9e3a8', grosor=0.75, presion=0.6, temblor=0.15)
        lz.lapiz([mid[1:-1]], VERDE_O, grosor=0.6, presion=0.35, temblor=0.15, cortes=0.3)
    return f, mid


# back leaf, right and low
hojagrande((640, 640), (860, 700), 70, '#5f8f4a', toques=[(820, 690, 40, '#3f6f45', 0.6)], curva=-0.08)
# the upper leaf, where the boy stands: it rises to the right
HOJA2, mid2 = hojagrande((688, 462), (930, 430), 66, '#7aa456',
                         toques=[(900, 440, 40, '#a9c46a', 0.6), (720, 460, 30, '#4f7a3a', 0.6)], curva=0.06)

# ------------------------------------------------------------------ the sunflower head: a solar panel
CX, CY = 700, 236
ROT, SQ = -16.0, 0.8
ca, sa = math.cos(math.radians(ROT)), math.sin(math.radians(ROT))


def H(u, v):
    """Point on the sunflower's face plane (u, v local units) to the sheet."""
    v = v * SQ
    return (CX + u * ca - v * sa, CY + u * sa + v * ca)


# back of the head (a little of the green calyx shows on the lower left)
calix = Poligono([H(math.cos(a) * 176, math.sin(a) * 176 + 22) for a in np.radians(np.arange(0, 360, 15))])
lz.aguada(calix, '#7a9a4a', dens=0.75, tapa=1, borde=0.6, gran=0.4, toques=[(620, 360, 60, '#4f7a3a', 0.6)])
lz.contorno(calix, VERDE_O, grosor=0.8, presion=0.5, cortes=0.3)
# petals: two rings, the back one deeper orange
for ring, (R0, L, Wd, col, n_) in enumerate(((132, 82, 26, NARANJA, 26), (128, 74, 24, ORO, 24))):
    off = 0 if ring == 0 else 360 / n_ / 2
    for k in range(n_):
        a = math.radians(k * 360 / n_ + off + rng.normal(0, 2.5))
        L_ = L * rng.uniform(0.85, 1.12)
        c0 = (math.cos(a) * R0, math.sin(a) * R0)
        tip = (math.cos(a) * (R0 + L_), math.sin(a) * (R0 + L_))
        nn = (-math.sin(a), math.cos(a))
        bend = rng.normal(0, 6)
        pts = [H(c0[0] - nn[0] * Wd * 0.35, c0[1] - nn[1] * Wd * 0.35),
               H(c0[0] + math.cos(a) * L_ * 0.45 - nn[0] * Wd * 0.55 + nn[0] * bend,
                 c0[1] + math.sin(a) * L_ * 0.45 - nn[1] * Wd * 0.55 + nn[1] * bend),
               H(tip[0] + nn[0] * bend, tip[1] + nn[1] * bend),
               H(c0[0] + math.cos(a) * L_ * 0.45 + nn[0] * Wd * 0.55 + nn[0] * bend,
                 c0[1] + math.sin(a) * L_ * 0.45 + nn[1] * Wd * 0.55 + nn[1] * bend),
               H(c0[0] + nn[0] * Wd * 0.35, c0[1] + nn[1] * Wd * 0.35)]
        f = Poligono(pts)
        tipc = H(*tip)
        lz.aguada(f, col, dens=0.8, tapa=1, borde=0.85, irreg=0.45, gran=0.25,
                  toques=[(*H(c0[0], c0[1]), 18, '#d9662a' if ring else '#c4502a', 0.7),
                          (*tipc, 14, ORO_C if ring else '#f2a03a', 0.6)])
        lz.contorno(f, '#b0602a', grosor=0.7, presion=0.45, cortes=0.3, desfase=0.2)
        lz.lapiz([[H(c0[0] + math.cos(a) * 8, c0[1] + math.sin(a) * 8),
                   H(c0[0] + math.cos(a) * L_ * 0.8, c0[1] + math.sin(a) * L_ * 0.8)]], '#c0703f', grosor=0.5,
                 presion=0.35, temblor=0.4)
# the disc: a ring of orange florets, then the deep blue solar cells in a golden-angle spiral
disco = Poligono([H(math.cos(a) * 136, math.sin(a) * 136) for a in np.radians(np.arange(0, 360, 10))])
lz.aguada(disco, '#7a3a1e', dens=0.9, tapa=1, borde=0.6, gran=0.5,
          toques=[(CX, CY, 90, '#4a2a1e', 0.6)])
for k in range(90):
    a = math.radians(k * 4 + rng.normal(0, 1))
    rr = rng.uniform(118, 133)
    x, y = H(math.cos(a) * rr, math.sin(a) * rr)
    lz.aguada(Elipse(x, y, rng.uniform(2.6, 4.0)), rng.choice(['#e8952a', '#f2b630', '#c4502a']), dens=0.85,
              irreg=0.2, borde=0.6, tapa=0.7)
panel = Poligono([H(math.cos(a) * 114, math.sin(a) * 114) for a in np.radians(np.arange(0, 360, 10))])
lz.aguada(panel, INDIGO, dens=1.1, tapa=1, borde=0.5, flor=2, gran=0.5,
          toques=[(CX - 40, CY - 40, 60, '#2f6f9a', 0.7), (CX + 50, CY + 30, 50, '#1f5f72', 0.7),
                  (CX + 10, CY - 60, 40, '#4b3f8f', 0.5)])
GA = math.radians(137.508)
celdas = []
for i in range(14, 330):
    rr = 6.2 * math.sqrt(i)
    if rr > 110:
        break
    a = i * GA
    celdas.append((rr, a))
for (rr, a) in celdas:
    s_ = (2.3 + rr * 0.022) * rng.uniform(0.75, 1.25)
    u, v = math.cos(a) * rr, math.sin(a) * rr
    t_ = (math.cos(a + 0.6), math.sin(a + 0.6))
    nn = (-t_[1], t_[0])
    q = [H(u + (t_[0] * dx + nn[0] * dy) * s_ + rng.normal(0, 0.5), v + (t_[1] * dx + nn[1] * dy) * s_ + rng.normal(0, 0.5))
         for dx, dy in ((-1, -0.9), (1.1, -1), (1, 1.05), (-0.95, 1))]
    col = rng.choice(['#3f6fb0', '#2f8f92', '#4a5aa8', '#2a7fb0', '#5a7ac0'])
    lz.aguada(Poligono(q), col, dens=rng.uniform(0.6, 0.9), irreg=0.5, borde=1.0, gran=0.3)
    if rng.random() < 0.25:
        lz.gouache(Poligono([q[0], q[1], (q[1][0] * 0.7 + q[2][0] * 0.3, q[1][1] * 0.7 + q[2][1] * 0.3),
                             (q[0][0] * 0.7 + q[3][0] * 0.3, q[0][1] * 0.7 + q[3][1] * 0.3)], suave=False),
                   '#cfe8f0', alfa=0.5, irreg=0.2)
# the golden spiral lines (the cells' wiring), a few fine gouache sparks
sp = []
for k in range(8):
    pts = []
    for t in np.linspace(0.12, 1.0, 40):
        rr = 110 * t
        a = k * 2 * math.pi / 8 + 2.4 * math.log(1 + 6 * t)
        pts.append(H(math.cos(a) * rr, math.sin(a) * rr))
    sp.append(np.array(pts))
lz.lapiz(sp, '#e9c46a', grosor=0.55, presion=0.5, temblor=0.1, cortes=0.2)
lz.aguada(Elipse(*H(0, 0), 16, 13, ROT), '#f2b630', dens=0.9, tapa=1, irreg=0.3, borde=0.7,
          toques=[(CX, CY, 8, '#fff1c0', 0.8)])
lz.luz((*H(0, 0), 26), '#fff2c0', fuerza=0.75)
lz.luz(panel, '#ffe6a0', fuerza=0.12, suave=20)
lz.chispas(CX, CY, 100, 80, n=8, semilla=61, luz=0.25)
# the flower's face is warmed by the glow it turns to
lz.luz(Elipse(CX + 60, CY - 40, 160, 120), '#ffe6a0', fuerza=0.12, suave=40)

# ------------------------------------------------------------------ the main leaf: the bench
HOJA1, mid1 = hojagrande((654, 584), (300, 578), 96, '#6e9c4e',
                         toques=[(340, 585, 50, '#a9c46a', 0.6), (600, 590, 50, '#3f6f45', 0.6),
                                 (470, 560, 50, '#8fb25a', 0.5)], curva=-0.1)

# ------------------------------------------------------------------ the thread of light, from the heart to the bulb
BULBO = (532, 490)
hilo = bezier(H(0, 0), (640, 330), (520, 360), (BULBO[0] + 2, BULBO[1] - 16), 80)
lz.aguada(Trazo(hilo[::4], (5, 3.4, 2.4, 1.6)), '#f6c44e', dens=0.75, irreg=0.2, borde=0.6, tapa=0.6)
lz.luz(Trazo(hilo[::4], (12,)), '#ffe6a0', fuerza=0.25, suave=6)
for k in range(6, 78, 9):
    lz.gouache(Elipse(*hilo[k], 1.5), '#fff6d8', alfa=0.9, irreg=0)

# ------------------------------------------------------------------ the grandfather (holds the lamp)
P1 = 'piel2'
# far leg first, then near leg (seated on the leaf, legs dangling over its front edge)
pierna2(lz, (446, 566), (500, 576), (494, 660), 30, '#4a5a8a', P1, pie_ang=-10, zapato='#6e4c3c', sombra=1)
pierna2(lz, (424, 572), (486, 592), (468, 676), 32, '#4a5a8a', P1, pie_ang=-5, zapato='#6e4c3c', sombra=1)
# back arm (far side): hand round the lamp base
brazo2(lz, (452, 482), (488, 530), (528, 548), 21, '#d98a4a', P1, 'larga', sombra=1,
       mano=dict(ang=10, gesto='agarra', lado=-1, tam=32))
cuello(lz, (424, 438), 30, (428, 476), P1)
torso2(lz, (396, 478), (458, 484), (408, 572), (452, 574), '#e8a04e', cintura=0.97, escote='v', sombra=-1,
       toques=[(420, 560, 40, '#c97b2c', 0.5)],
       pliegues=[[(420, 500), (430, 530), (428, 560)], [(446, 510), (452, 540)]])
# cardigan buttons
for y in (510, 530, 550):
    lz.aguada(Elipse(437, y, 2.2), '#8a4a2a', dens=0.8, irreg=0.1)
cabeza2(lz, 424, 438, 30, P1, '#e4ddd4', 'calvo', giro=0.55, inclina=10, ojos='abajo', boca='suave',
        barba=None, canas=True, gafas=True, labios=False)

# the lamp: an old table lamp, opened to be mended. Its round wooden foot is in his hands with the
# little hatch underneath open (wires showing) and a screwdriver still in its screw; the girl screws
# a new bulb into the socket and it lights. The shade waits on the leaf beside him.
pie_lamp = Poligono(np.vstack([arco(512, 562, 30, 9, 180, 360, 20), arco(512, 562, 30, 16, 0, 180, 20)]), suave=False)
lz.aguada(pie_lamp, '#a8683a', dens=0.85, tapa=1, borde=0.7, gran=0.4, toques=[(526, 570, 16, '#6e3e22', 0.6), (498, 556, 12, '#d9a06a', 0.6)])
lz.lapiz([arco(512, 562, 30, 9, 0, 360, 30), arco(512, 562, 20, 6, 200, 340, 20)], '#5e3a22', grosor=0.7, presion=0.55)
tapa_l = Poligono([(520, 570), (538, 566), (548, 584), (530, 590)], suave=False)        # the open hatch
lz.aguada(tapa_l, '#c08a52', dens=0.85, tapa=1, irreg=0.2)
lz.contorno(tapa_l, '#5e3a22', grosor=0.6, presion=0.5)
lz.lapiz([bezier((528, 574), (540, 586), (546, 598)), bezier((530, 576), (536, 592), (532, 602))], '#c33c4e', grosor=0.7,
         presion=0.7)
lz.lapiz([bezier((529, 575), (544, 584), (552, 594))], '#3f6fb0', grosor=0.7, presion=0.7)
# the screwdriver, still in the screw of the foot
lz.aguada(Trazo([(486, 560), (470, 580)], (2.2, 2.2)), '#8a8a8a', dens=0.9, irreg=0.1, tapa=1)
mang = Trazo([(470, 580), (458, 596)], (6, 5.5))
lz.aguada(mang, '#c33c4e', dens=0.9, tapa=1, irreg=0.2)
lz.contorno(mang, '#7a1f30', grosor=0.6, presion=0.5)
# the brass column and the socket
col_l = Trazo([(514, 554), (518, 526), (524, 506)], (8, 7, 7))
lz.aguada(col_l, '#d9a441', dens=0.85, tapa=1, toques=[(520, 530, 6, '#9a6a22', 0.6)])
lz.contorno(col_l, '#7a4a22', grosor=0.7, presion=0.5)
lz.lapiz([[(512, 540), (520, 540)], [(514, 548), (521, 548)]], '#9a6a22', grosor=0.6, presion=0.5)
casq = Poligono([(518, 506), (532, 500), (536, 512), (524, 518)])
lz.aguada(casq, '#9a9a8a', dens=0.8, tapa=1)
lz.lapiz([[(521, 508), (533, 503)], [(523, 512), (534, 507)]], '#5a5a52', grosor=0.5, presion=0.5)
lz.contorno(casq, '#5a5a52', grosor=0.6, presion=0.5)
bul = Elipse(BULBO[0] + 2, BULBO[1] - 8, 13, 15, 20)
lz.aguada(bul, '#fbe7a2', dens=0.35, tapa=1, irreg=0.2, borde=0.7)
lz.contorno(bul, '#b08a3a', grosor=0.6, presion=0.45, cortes=0.1)
lz.aguada(Trazo([(BULBO[0] - 2, BULBO[1] - 6), (BULBO[0] + 2, BULBO[1] - 16), (BULBO[0] + 6, BULBO[1] - 10)], (2.5, 2.5)),
          '#f2a02e', dens=0.9, irreg=0.1)
lz.luz((BULBO[0] + 2, BULBO[1] - 8, 30), '#fff0b0', fuerza=0.9)
lz.aguada(Elipse(BULBO[0] + 2, BULBO[1] - 8, 70), '#f8d57e', dens=0.12, suave=25, gran=0.05)
# the shade, taken off, resting on the leaf behind him
pantalla = Poligono([(336, 578), (352, 538), (388, 536), (406, 574)], suave=False)
lz.aguada(pantalla, CORAL, dens=0.8, tapa=1, borde=0.8, gran=0.3, toques=[(390, 560, 16, '#b8503a', 0.6)])
lz.aguada(Elipse(370, 537, 18, 4), '#f6d8b8', dens=0.6, tapa=1, irreg=0.2)
lz.lapiz([arco(370, 537, 18, 4, 0, 360, 20), arco(371, 576, 35, 6, 0, 180, 20)], '#8a3a2a', grosor=0.6, presion=0.5)
lz.lapiz([[(338 + k * 7, 579 + 3 * math.sin(k / 9 * math.pi)), (338 + k * 7, 586 + 3 * math.sin(k / 9 * math.pi))] for k in range(10)], '#b8503a', grosor=0.6, presion=0.6)
lz.contorno(pantalla, '#8a3a2a', grosor=0.7, presion=0.5)
# grandfather's near arm: wraps the base
brazo2(lz, (400, 488), (430, 546), (480, 560), 23, '#e8a04e', P1, 'larga', sombra=-1,
       mano=dict(ang=-4, gesto='agarra', lado=1, tam=34))

# ------------------------------------------------------------------ the girl (screws the bulb in)
P2 = 'piel4'
pierna2(lz, (612, 566), (558, 570), (544, 640), 26, None, P2, pie_ang=150, zapato=CORAL, sombra=-1)
pierna2(lz, (626, 570), (568, 580), (574, 650), 26, None, P2, pie_ang=195, zapato=CORAL, sombra=-1)
# her dress: a teal skirt that covers her lap down to the knees
falda = Poligono([(598, 518), (634, 518), (650, 562), (640, 584), (612, 590), (570, 590), (550, 584), (552, 562),
                  (578, 552)])
lz.aguada(falda, TEAL, dens=0.8, tapa=1, borde=0.7, toques=[(582, 580, 30, '#1f6f72', 0.6)])
lz.contorno(falda, '#1f5a5a', grosor=0.8, presion=0.5, cortes=0.25)
for (x, y) in ((588, 548), (612, 560), (628, 540), (602, 576), (570, 572), (634, 572)):
    lz.gouache(Elipse(x, y, 2.0), '#fff3cf', alfa=0.9, irreg=0)
# back arm resting on the leaf
brazo2(lz, (634, 480), (650, 526), (646, 562), 17, '#f2c04a', P2, 'corta', sombra=1,
       mano=dict(ang=95, gesto='relajada', lado=1, tam=26))
cuello(lz, (618, 434), 25, (616, 474), P2)
torso2(lz, (592, 476), (638, 478), (596, 526), (634, 528), TEAL, cintura=0.95, sombra=1,
       toques=[(622, 510, 30, '#1f6f72', 0.5)])
cabeza2(lz, 618, 434, 25, P2, '#2a1a14', 'afro', giro=-0.5, inclina=-14, ojos='abiertos', boca='abierta',
        mira=(-1, 1), pendiente=ORO)
# near arm: up to the bulb, fingers pinching it
brazo2(lz, (596, 484), (574, 528), (556, 498), 17, '#f2c04a', P2, 'corta', sombra=-1,
       mano=dict(ang=-155, gesto='pinza', lado=1, tam=26))

# the near edge of the leaf curls up in front of their hips: they sit IN it
labio = Trazo([(400, 590), (470, 600), (540, 602), (610, 598), (650, 590)], (5, 12, 14, 12, 6))
lz.aguada(labio, '#7aa456', dens=0.8, tapa=1, borde=0.7, toques=[(520, 600, 40, '#a9c46a', 0.6)])
lz.contorno(labio, VERDE_O, grosor=0.8, presion=0.5, cortes=0.2)
lz.lapiz([spline([(420, 594), (500, 602), (600, 600)])], '#d9e3a8', grosor=0.6, presion=0.5)
# ------------------------------------------------------------------ the boy who flings the seeds into the wind (upper leaf)
# on tiptoe on the back foot, the front knee bent, the whole body thrown forward and up, torso twisted
P3 = 'piel3'
pierna2(lz, (838, 380), (820, 410), (808, 432), 21, '#3f6fb0', P3, pie_ang=48, zapato='#e8b53e', sombra=-1, pie_tam=26)
pierna2(lz, (856, 376), (884, 398), (886, 432), 21, '#3f6fb0', P3, pie_ang=5, zapato='#e8b53e', sombra=1, pie_tam=28)
brazo2(lz, (852, 322), (874, 296), (900, 270), 14, '#e8735e', P3, 'corta', sombra=-1,
       mano=dict(ang=-40, gesto='abierta', lado=1, tam=23))
cuello(lz, (894, 282), 22, (870, 312), P3, giro=0.6, inclina=28)
torso2(lz, (850, 318), (888, 306), (836, 380), (860, 374), '#e8735e', cintura=0.95, sombra=1,
       pliegues=[[(856, 330), (852, 362)], [(872, 324), (864, 356)]])
cabeza2(lz, 894, 282, 22, P3, '#3a2620', 'corto', giro=0.6, inclina=28, ojos='cerrados', boca='abierta')
brazo2(lz, (886, 312), (916, 292), (942, 258), 14, '#e8735e', P3, 'corta', sombra=1,
       mano=dict(ang=-55, gesto='abierta', lado=-1, tam=23))
# his breath: a few curls of air pushing the first seeds
lz.lapiz([bezier((916, 286), (936, 276), (944, 262)), bezier((914, 292), (940, 290), (956, 276))], '#b8c8d0', grosor=0.6,
         presion=0.45, temblor=0.3, cortes=0.3)

# ------------------------------------------------------------------ seeds that are wind turbines
def molinillo(x, y, s, ang=0, color='#f6e3c4', gouache=False, semilla_=True):
    """A seed with a three-bladed rotor and a fine stem: half dandelion seed,
    half wind turbine."""
    a0 = math.radians(ang)
    if semilla_:
        lz.lapiz([[(x, y), (x + math.sin(a0) * s * 1.6, y + math.cos(a0) * s * 1.6)]], '#a08a6a', grosor=0.6,
                 presion=0.6, temblor=0.1)
        sx, sy = x + math.sin(a0) * s * 1.7, y + math.cos(a0) * s * 1.7
        lz.aguada(Elipse(sx, sy, s * 0.14, s * 0.24, ang), '#9a6a3a', dens=0.8, irreg=0.2)
    for k in range(3):
        b = math.radians(ang * 2.3 + k * 120)
        tip = (x + math.cos(b) * s, y + math.sin(b) * s)
        mid_ = (x + math.cos(b + 0.18) * s * 0.55, y + math.sin(b + 0.18) * s * 0.55)
        f = Poligono([(x, y), mid_, tip, (x + math.cos(b - 0.08) * s * 0.5, y + math.sin(b - 0.08) * s * 0.5)])
        if gouache:
            lz.gouache(f, color, alfa=0.9, irreg=0.1)
        else:
            lz.aguada(f, color, dens=0.9, tapa=1, irreg=0.2, borde=0.9)
        lz.contorno(f, '#8a7a6a', grosor=0.45, presion=0.45, cortes=0.1, desfase=0.1)
    lz.aguada(Elipse(x, y, s * 0.12), '#c0703f', dens=0.9, irreg=0.1, tapa=1)


vuelo = bezier((958, 236), (1070, 160), (1160, 300), (1200, 520), 30)
for k, (x, y) in enumerate(vuelo[1:]):
    t = k / 29
    x += rng.normal(0, 14) * (0.4 + t)
    y += rng.normal(0, 12)
    s = 20 - 8 * t + rng.normal(0, 1.2)
    if k % 2 == 0:
        molinillo(x, y, s, ang=rng.uniform(-35, 35), color=['#f6e3c4', '#f4c9b4', '#f9e9b8'][k % 3])

# ------------------------------------------------------------------ the village, far off on a hill that dissolves into the paper
colina = Poligono([(980, 720), (1060, 676), (1150, 650), (1250, 644), (1340, 656), (1440, 690), (1470, 740), (1300, 770),
                   (1100, 770)])
lz.aguada(colina, '#a9c27a', dens=0.6, borde=0.25, irreg=1.6, gran=0.5, var=0.6,
          toques=[(1300, 670, 70, '#c9c46a', 0.6), (1100, 720, 70, '#7aa456', 0.6), (1400, 720, 60, '#86a86c', 0.5)],
          desvanece=(1220, 690, 1220, 776))
lz.lapiz([spline([(1000, 712), (1080, 676), (1170, 652), (1260, 646), (1350, 658), (1440, 690)])], '#6f8f4a', grosor=0.7,
         presion=0.4, temblor=0.6, cortes=0.4)
for k, c in enumerate(('#e9c46a', '#d9b46a', '#c9c47a')):
    f = Poligono([(1290 + k * 18, 690 + k * 10), (1420 - k * 8, 700 + k * 8), (1414 - k * 8, 712 + k * 8), (1286 + k * 18, 702 + k * 10)])
    lz.aguada(f, c, dens=0.45, irreg=0.8, gran=0.4, desvanece=(1350, 690, 1350, 740))
    lz.rayado(f, mezcla(c, '#8a6a3a', 0.5), angulo=6, sep=3.5, presion=0.25, grosor=0.55, largo=40)
camino_v = Trazo([(1010, 740), (1090, 708), (1170, 694), (1250, 686), (1330, 690)], (9, 9, 8, 7, 5))
lz.aguada(camino_v, '#efe0b8', dens=0.55, tapa=0.8, irreg=0.6, desvanece=(1100, 700, 1010, 744))


def tejado_solar(q, sem):
    """A roof plane (4 corners) covered with the same irregular blue cells as the sunflower's face."""
    r_ = np.random.default_rng(sem)
    lz.aguada(Poligono(q, suave=False), '#26346a', dens=0.95, tapa=1, irreg=0.3, borde=0.6, gran=0.4,
              toques=[(*np.mean(q, 0), 14, '#2f6f9a', 0.6)])
    q = np.asarray(q, float)
    nu, nv = 6, 3
    for i in range(nu):
        for j in range(nv):
            u0, u1, v0, v1 = (i + 0.12) / nu, (i + 0.88) / nu, (j + 0.15) / nv, (j + 0.85) / nv
            P = lambda u, v: q[0] * (1 - u) * (1 - v) + q[1] * u * (1 - v) + q[2] * u * v + q[3] * (1 - u) * v
            cel = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)]
            lz.aguada(Poligono(cel, suave=False), r_.choice(['#3f6fb0', '#2f8f92', '#4a5aa8', '#2a7fb0']), dens=r_.uniform(0.5, 0.8),
                      irreg=0.3, borde=0.9, gran=0.2)
            if r_.random() < 0.3:
                lz.gouache(Elipse(*P((u0 + u1) / 2, v0 + 0.1), 0.9), '#cfe8f0', alfa=0.7, irreg=0)
    lz.contorno(Poligono(q, suave=False), '#1f2f5a', grosor=0.6, presion=0.5, cortes=0.2)


def casa34(x, y, w, d, h, pared, sem):
    """A little whitewashed house in 3/4 view; its single-pitch roof faces the sun and is a solar panel.
    (x, y) = front-left foot of the house."""
    front = [(x, y), (x + w, y), (x + w, y - h), (x, y - h)]
    side = [(x + w, y), (x + w + d, y - d * 0.45), (x + w + d, y - d * 0.45 - h - 6), (x + w, y - h)]
    lz.aguada(Poligono(front, suave=False), pared, dens=0.55, tapa=1, irreg=0.5, borde=0.7, gran=0.4,
              toques=[(x + w * 0.2, y - h * 0.5, w * 0.4, '#fff3e0', 0.5)])
    lz.aguada(Poligono(side, suave=False), mezcla(pared, '#8a6a7a', 0.35), dens=0.6, tapa=1, irreg=0.5, borde=0.7, gran=0.4)
    lz.contorno(Poligono(front, suave=False), '#8a5a3a', grosor=0.6, presion=0.45, cortes=0.3)
    lz.contorno(Poligono(side, suave=False), '#8a5a3a', grosor=0.6, presion=0.45, cortes=0.3)
    roof = [(x - 4, y - h + 2), (x + w + 3, y - h + 2), (x + w + d + 2, y - h - d * 0.45 - 12), (x + d - 4, y - h - d * 0.45 - 12)]
    tejado_solar(roof, sem)
    vw = w * 0.2
    v = Poligono([(x + w * 0.3, y - h * 0.65), (x + w * 0.3 + vw, y - h * 0.65), (x + w * 0.3 + vw, y - h * 0.3), (x + w * 0.3, y - h * 0.3)],
                 suave=False)
    lz.aguada(v, '#f7d36a', dens=0.8, tapa=1, irreg=0.2)
    lz.luz((x + w * 0.3 + vw / 2, y - h * 0.48, w * 0.2), '#fff0b0', fuerza=0.4)
    puerta = Poligono([(x + w * 0.66, y), (x + w * 0.84, y), (x + w * 0.84, y - h * 0.62), (x + w * 0.66, y - h * 0.62)], suave=False)
    lz.aguada(puerta, '#4f9c9a', dens=0.8, tapa=1, irreg=0.2)
    return (x + w / 2 + d / 2, y - h - d * 0.25)


tejados = []
for (x, y, w, d, h, c, sm) in ((1110, 690, 40, 20, 26, '#f6ead6', 1), (1172, 676, 46, 22, 30, '#f4dcc0', 2),
                               (1240, 668, 40, 20, 26, '#f6ead6', 3), (1300, 680, 44, 22, 28, '#f2d4b8', 4),
                               (1196, 714, 48, 24, 32, '#f6e2c8', 5)):
    tejados.append(casa34(x, y, w, d, h, c, sm))
# the seeds that landed already turn as wind turbines on the hill
for (x, y, h) in ((1370, 668, 78), (1410, 690, 60), (1060, 700, 56)):
    lz.aguada(Trazo([(x, y), (x, y - h)], (3.8, 2.2)), '#f4f0e6', dens=0.6, tapa=1, irreg=0.1)
    lz.lapiz([[(x - 1.8, y), (x - 1, y - h)], [(x + 1.8, y), (x + 1, y - h)]], '#8a7a6a', grosor=0.5, presion=0.5)
    molinillo(x, y - h, h * 0.42, ang=rng.uniform(-20, 20), semilla_=False)
for (x, y, r) in ((1350, 650, 14), (1148, 664, 11), (1272, 650, 10)):
    mata(lz, x, y, r, '#5f8f4a')
    lz.aguada(Trazo([(x, y + r * 0.6), (x, y + r * 1.5)], (3, 3)), '#7a5a3a', dens=0.8, tapa=0.5)
for k in range(22):
    x = rng.uniform(1040, 1420)
    y = rng.uniform(700, 740)
    lz.aguada(Elipse(x, y, rng.uniform(1.5, 2.4)), rng.choice([CORAL, '#f2d36b', '#fff1e0', '#c33c4e']), dens=0.85, irreg=0.2,
              tapa=0.7)
# someone cycles along the road
cx_, cy_ = 1270, 684
for dx in (-8, 8):
    lz.lapiz([arco(cx_ + dx, cy_, 6, 6, 0, 360, 24)], '#3e2a24', grosor=0.7, presion=0.7, temblor=0.05)
lz.lapiz([[(cx_ - 8, cy_), (cx_ - 1, cy_ - 7), (cx_ + 8, cy_), (cx_ - 1, cy_ - 7), (cx_ + 4, cy_ - 9)]], '#c33c4e', grosor=0.8,
         presion=0.7, temblor=0.05)
lz.aguada(Trazo([(cx_ - 3, cy_ - 11), (cx_ + 1, cy_ - 22)], (5.5, 4.5)), '#4f9c9a', dens=0.85, tapa=1)
lz.aguada(Elipse(cx_ + 2, cy_ - 27, 3.8), '#c98a5e', dens=0.75, tapa=1)
lz.lapiz([[(cx_ - 1, cy_ - 12), (cx_ + 4, cy_ - 4)], [(cx_ + 1, cy_ - 20), (cx_ + 5, cy_ - 11)]], '#4a5a8a', grosor=1.0, presion=0.7)

# threads of light: the sunflower shares its energy with every roof (community energy)
for k, (tx, ty) in enumerate(tejados):
    p = bezier(H(118, 92), (900 + k * 14, 540 + k * 6), (1040 + k * 12, 590), (tx, ty + 2), 60)
    lz.lapiz([p], '#e9b44a', grosor=0.6, presion=0.5, temblor=0.3, cortes=0.35)
    for j in (18, 34, 50):
        lz.aguada(Elipse(*p[j], 1.7), '#f2b630', dens=0.9, irreg=0.1)

# a bee comes to the sunflower, its looping flight in pencil
def abeja(x, y, s=1.0, ang=0):
    a = math.radians(ang)
    R = lambda px, py: (x + (px * math.cos(a) - py * math.sin(a)) * s, y + (px * math.sin(a) + py * math.cos(a)) * s)
    for sd in (-1, 1):
        al = Elipse(*R(-1, sd * 6), 6 * s, 3.5 * s, ang + sd * 70)
        lz.aguada(al, '#cfe3ea', dens=0.45, irreg=0.2, borde=0.9)
        lz.contorno(al, '#6a7a8a', grosor=0.45, presion=0.45, desfase=0.1)
    cu = Elipse(*R(0, 0), 7 * s, 4.6 * s, ang)
    lz.aguada(cu, '#f2b630', dens=0.95, irreg=0.2, tapa=1)
    lz.lapiz([[R(-2.5 + 3 * k, -4.2), R(-2.5 + 3 * k, 4.2)] for k in range(3)], '#3e2a24', grosor=1.1, presion=0.85)
    lz.contorno(cu, '#5e3f30', grosor=0.5, presion=0.5, desfase=0.1)
    lz.aguada(Elipse(*R(7, 0), 2.6 * s), '#3e2a24', dens=1.0, irreg=0.1, tapa=1)


abeja(476, 132, 1.2, -20)
lz.lapiz([bezier((404, 176), (420, 150), (444, 160), (466, 138))], '#a08a6a', grosor=0.5, presion=0.4, temblor=0.2, cortes=0.6)

lz.vineta(margen=26)
lz.guardar(SALIDA)
print('ok', SALIDA)
