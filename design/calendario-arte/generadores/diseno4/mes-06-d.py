"""
Mes 6 -- Tecnología y Energía -- Diseño 4.

Idea: a giant sunflower whose face IS a solar panel. It turns to the June sun
and drinks it; from its heart a thread of light comes down to the lamp that a
grandfather and a girl are mending together, sitting on one of its leaves: she
screws in a new LED bulb and it lights. A boy on the leaf above lets the
sunflower's seeds go: each seed is a tiny wind turbine, and the flight of them
lands on a hill town of many different houses, whose solar roofs share the sunflower's light;
velomobiles roll along its road and gliders ride the air the sun warms.

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
sombra_lado(lz, tallo, -1, '#2f5a3a', dens=0.4)
lz.aguada(tallo, '#3f6f3a', dens=0.18, borde=0.3, desvanece=(600, 600, 700, 600))
_p = np.asarray(tallo.p); _tg = np.gradient(_p, axis=0); _tg /= np.maximum(np.hypot(*_tg.T)[:, None], 1e-9)
_luz = _p + np.stack([_tg[:, 1], -_tg[:, 0]], 1) * (-tallo.w[:, None] * 0.22)
lz.levanta(Trazo(_luz[::8], (6, 4)), 0.35, suave=2.5)
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
       mano=dict(ang=20, gesto='relajada', lado=-1, tam=30))
cuello(lz, (424, 438), 30, (428, 476), P1)
torso2(lz, (396, 478), (458, 484), (408, 572), (452, 574), '#e8a04e', cintura=0.97, escote='v', sombra=-1,
       toques=[(420, 560, 40, '#c97b2c', 0.5)],
       pliegues=[[(420, 500), (430, 530), (428, 560)], [(446, 510), (452, 540)], [(406, 520), (412, 556)], [(440, 556), (448, 568)]])
# cardigan buttons
for y in (510, 530, 550):
    lz.aguada(Elipse(437, y, 2.2), '#8a4a2a', dens=0.8, irreg=0.1)
cabeza2(lz, 424, 438, 30, P1, '#e4ddd4', 'calvo', giro=0.55, inclina=10, ojos='abajo', boca='suave',
        barba=None, canas=True, gafas=True, labios=False)

# the lamp: an old table lamp, whole. Its round wooden foot rests in his hands, the brass column rises
# to the socket, and the fringed shade is tipped back on its hinge so the girl can screw in the new bulb.
pie_lamp = Poligono(np.vstack([arco(512, 562, 30, 9, 180, 360, 20), arco(512, 562, 30, 16, 0, 180, 20)]), suave=False)
lz.aguada(pie_lamp, '#a8683a', dens=0.85, tapa=1, borde=0.7, gran=0.4, toques=[(526, 570, 16, '#6e3e22', 0.6), (498, 556, 12, '#d9a06a', 0.6)])
lz.lapiz([arco(512, 562, 30, 9, 0, 360, 30), arco(512, 562, 20, 6, 200, 340, 20)], '#5e3a22', grosor=0.7, presion=0.55)
col_l = Trazo([(514, 556), (518, 528), (524, 506)], (8, 7, 7))
lz.aguada(col_l, '#d9a441', dens=0.85, tapa=1, toques=[(520, 530, 6, '#9a6a22', 0.6)])
lz.contorno(col_l, '#7a4a22', grosor=0.7, presion=0.5)
lz.lapiz([[(512, 540), (520, 540)], [(514, 548), (521, 548)]], '#9a6a22', grosor=0.6, presion=0.5)
# the shade, tipped back
rc, tc = np.array([506.0, 486.0]), np.array([480.0, 456.0])
ax_ = tc - rc
nn_ = np.array([ax_[1], -ax_[0]]) / np.linalg.norm(ax_)
pantalla = Poligono([rc + nn_ * 25, tc + nn_ * 13, tc - nn_ * 13, rc - nn_ * 25], suave=False)
lz.aguada(pantalla, CORAL, dens=0.82, tapa=1, borde=0.8, gran=0.3, toques=[(*(rc - nn_ * 14), 14, '#b8503a', 0.6), (*(tc + nn_ * 6), 10, '#f39a7a', 0.6)])
lz.contorno(pantalla, '#8a3a2a', grosor=0.7, presion=0.5)
borde_p = np.array([rc + nn_ * 25 * c for c in np.linspace(1, -1, 12)])
lz.lapiz([[q, q + ax_ / np.linalg.norm(ax_) * -6 + np.array([1.5, 3])] for q in borde_p], '#b8503a', grosor=0.7, presion=0.65)
lz.lapiz([[rc + nn_ * 5, (518, 506)]], '#7a4a22', grosor=1.0, presion=0.7)          # the hinge arm
casq = Poligono([(518, 506), (532, 500), (536, 512), (524, 518)])
lz.aguada(casq, '#9a9a8a', dens=0.8, tapa=1)
lz.lapiz([[(521, 508), (533, 503)], [(523, 512), (534, 507)]], '#5a5a52', grosor=0.5, presion=0.5)
lz.contorno(casq, '#5a5a52', grosor=0.6, presion=0.5)
bul = Elipse(BULBO[0] + 2, BULBO[1] - 8, 13, 15, 20)
lz.aguada(bul, '#fbe7a2', dens=0.35, tapa=1, irreg=0.2, borde=0.7)
lz.contorno(bul, '#b08a3a', grosor=0.6, presion=0.45, cortes=0.1)
# the filament: a fine coiled spring, lit
bx_, by_ = BULBO[0] + 2, BULBO[1] - 8
lz.lapiz([[(bx_ - 3, by_ + 9), (bx_ - 2, by_ + 2)], [(bx_ + 3, by_ + 9), (bx_ + 2, by_ + 2)]], '#b08a3a', grosor=0.45, presion=0.6)
espiral = np.array([(bx_ - 5 + 10 * t, by_ + 1.5 * math.sin(t * 6 * math.pi) - 1, ) for t in np.linspace(0, 1, 60)])
espiral[:, 1] += np.cos(np.linspace(0, 1, 60) * 6 * math.pi) * 0.0
lz.lapiz([espiral], '#e8901e', grosor=0.7, presion=0.85, temblor=0.0)
lz.luz((BULBO[0] + 2, BULBO[1] - 8, 30), '#fff0b0', fuerza=0.9)
lz.aguada(Elipse(BULBO[0] + 2, BULBO[1] - 8, 70), '#f8d57e', dens=0.12, suave=25, gran=0.05)
# grandfather's near arm: wraps the base
brazo2(lz, (400, 488), (430, 546), (482, 562), 23, '#e8a04e', P1, 'larga', sombra=-1,
       mano=dict(ang=-6, gesto='relajada', lado=1, tam=32))

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
lz.lapiz([bezier((604, 524), (598, 552), (588, 586)), bezier((622, 526), (626, 556), (630, 584)), bezier((570, 560), (566, 574), (560, 586))],
         '#1f5a5a', grosor=0.65, presion=0.45, temblor=0.3)
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
# on tiptoe on the back foot, front knee bent; one arm throws up and forward, the other opens back for balance
P3 = 'piel3'
brazo2(lz, (852, 322), (826, 334), (800, 326), 14, '#e8735e', P3, 'corta', sombra=-1,
       mano=dict(ang=185, gesto='abierta', lado=1, tam=23))
pierna2(lz, (838, 380), (820, 410), (808, 432), 21, '#3f6fb0', P3, pie_ang=48, zapato='#e8b53e', sombra=-1, pie_tam=26)
pierna2(lz, (856, 376), (884, 398), (886, 432), 21, '#3f6fb0', P3, pie_ang=5, zapato='#e8b53e', sombra=1, pie_tam=28)
cuello(lz, (870, 276), 22, (868, 312), P3, giro=0.5, inclina=10)
torso2(lz, (850, 318), (888, 308), (836, 380), (860, 374), '#e8735e', cintura=0.95, sombra=1,
       pliegues=[[(856, 330), (852, 362)], [(872, 324), (864, 356)], [(846, 346), (842, 370)]])
cabeza2(lz, 870, 276, 22, P3, '#3a2620', 'corto', giro=0.5, inclina=10, ojos='abiertos', boca='risa', mira=(1, -1))
brazo2(lz, (886, 314), (914, 290), (940, 258), 14, '#e8735e', P3, 'corta', sombra=1,
       mano=dict(ang=-55, gesto='abierta', lado=-1, tam=23))

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

# ------------------------------------------------------------------ the village (2026-11-09, Eugenio: «un pueblo con más diversidad,
# y varios velomóviles y algún planeador»): a whole hill town, every house different -- whitewash, ochre, rose, pale blue;
# terracotta, slate, plum and solar roofs; a bell tower on top; round trees and cypresses between the houses; a patchwork
# of fields below; velomobiles along the road, and gliders riding the air the sun warms.
colina = Poligono([(912, 800), (960, 752), (1030, 712), (1110, 670), (1186, 626), (1250, 596), (1310, 588), (1370, 604),
                   (1420, 640), (1444, 690), (1446, 770), (1400, 812), (1190, 818), (1010, 816)])
lz.aguada(colina, '#a9c27a', dens=0.6, borde=0.25, irreg=1.6, gran=0.5, var=0.6,
          toques=[(1280, 620, 80, '#c9c46a', 0.55), (1070, 730, 80, '#7aa456', 0.6), (1370, 700, 70, '#86a86c', 0.5)],
          desvanece=(1170, 700, 1170, 822))
lz.lapiz([spline([(940, 770), (1010, 724), (1100, 676), (1186, 630), (1250, 600), (1310, 592), (1370, 606), (1412, 636)])],
         '#6f8f4a', grosor=0.7, presion=0.4, temblor=0.6, cortes=0.4)

# patchwork of fields on the lower slope (ochre, wheat, lavender, a strip of little sunflowers, a ploughed one)
CAMPOS = (
    ([(954, 786), (1020, 760), (1036, 776), (972, 800)], '#e9c46a', 8),
    ([(1024, 758), (1100, 736), (1114, 752), (1040, 774)], '#9fbf6a', -4),
    ([(1104, 734), (1186, 718), (1196, 736), (1118, 750)], '#a98ac9', 0),
    ([(1190, 716), (1272, 708), (1278, 726), (1200, 734)], '#ec9a4e', 4),
    ([(1276, 706), (1360, 708), (1362, 726), (1282, 724)], '#c9c47a', -2),
    ([(978, 802), (1042, 778), (1062, 796), (1000, 816)], '#d98a5e', 10),
    ([(1046, 776), (1120, 754), (1136, 772), (1066, 794)], '#e9d28a', 6),
    ([(1124, 752), (1200, 738), (1212, 758), (1140, 772)], '#7fa85a', -6),
    ([(1206, 736), (1282, 728), (1290, 748), (1216, 756)], '#d9b46a', 2),
    ([(1286, 726), (1364, 728), (1368, 748), (1294, 746)], '#a3b98a', -3),
)
for k, (q, c, an) in enumerate(CAMPOS):
    f = Poligono(q, suave=False)
    lz.aguada(f, c, dens=0.5, irreg=0.7, gran=0.45, borde=0.6, desvanece=(1170, 740, 1170, 822))
    lz.rayado(f, mezcla(c, '#7a5a3a', 0.5), angulo=an, sep=3.2, presion=0.24, grosor=0.5, largo=26)
# the lavender rows and the little sunflower strip
lz.lapiz([[(1112 + i * 9, 748 - i * 1.4), (1120 + i * 9, 734 - i * 1.6)] for i in range(9)], '#7a5a9a', grosor=0.6, presion=0.4)
for i in range(16):
    x = 1194 + i * 5.2 + rng.normal(0, 0.8)
    y = 731 - i * 0.6 + rng.normal(0, 0.8)
    lz.aguada(Elipse(x, y, 1.7), '#f2b630', dens=0.95, irreg=0.1, tapa=1)
    lz.aguada(Elipse(x, y, 0.6), '#6a3a1a', dens=0.9, irreg=0, tapa=1)

# the road at the foot of the houses
CAMINO = [(925, 772), (1000, 754), (1080, 736), (1160, 716), (1240, 700), (1330, 694), (1410, 700)]
camino_v = Trazo(CAMINO, (8, 8, 7.5, 7, 6.5, 6, 5.5))
lz.aguada(camino_v, '#ead7a8', dens=0.7, tapa=0.85, irreg=0.6, desvanece=(1030, 730, 940, 788))
lz.lapiz([spline([(p[0], p[1] + 6) for p in CAMINO])], '#b89a6a', grosor=0.5, presion=0.3, temblor=0.4, cortes=0.5)


def tejado_solar(q, sem):
    """A roof plane (4 corners) covered with the same irregular blue cells as the sunflower's face."""
    r_ = np.random.default_rng(sem)
    lz.aguada(Poligono(q, suave=False), '#34477e', dens=0.9, tapa=1, irreg=0.3, borde=0.6, gran=0.4,
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
    lz.contorno(Poligono(q, suave=False), '#2a3a66', grosor=0.6, presion=0.5, cortes=0.2)


def tejado_tejas(q, color, sem, ang=8):
    """A tiled roof plane: a warm wash and rows of tiles in pencil."""
    f = Poligono(q, suave=False)
    lz.aguada(f, color, dens=0.85, tapa=1, irreg=0.35, borde=0.65, gran=0.45,
              toques=[(*np.mean(q, 0), 16, mezcla(color, '#f4c08a', 0.45), 0.55)], semilla=sem)
    lz.rayado(f, mezcla(color, '#3e2a24', 0.45), angulo=ang, sep=2.6, presion=0.32, grosor=0.5, semilla=sem)
    lz.contorno(f, mezcla(color, '#3e2a24', 0.6), grosor=0.6, presion=0.5, cortes=0.2, semilla=sem)


def ventanas(x, y, w, h, pisos, cols, pared, sem, encendida=None):
    """Small windows in a front wall: some with shutters, one maybe lit."""
    r_ = np.random.default_rng(sem)
    cont = mezcla(pared, '#5e3f30', 0.6)
    for p in range(pisos):
        for c in range(cols):
            cx = x + w * (c + 0.5) / cols
            cy = y - h * (p + 0.55) / pisos
            vw, vh = min(w / cols * 0.34, 6.5), min(h / pisos * 0.42, 8.5)
            v = Poligono([(cx - vw / 2, cy - vh / 2), (cx + vw / 2, cy - vh / 2), (cx + vw / 2, cy + vh / 2), (cx - vw / 2, cy + vh / 2)],
                         suave=False)
            luz_ = encendida == (p, c)
            lz.aguada(v, '#f7d36a' if luz_ else r_.choice(['#4a5a7a', '#5a6a8a', '#3e4a6a']), dens=0.85, tapa=1, irreg=0.1)
            if luz_:
                lz.luz((cx, cy, vw), '#fff0b0', fuerza=0.35)
            if r_.random() < 0.45:   # shutters
                col = r_.choice(['#4f9c9a', '#2f6f45', '#8a3a3a', '#5a6f9a'])
                for sx in (-1, 1):
                    lz.aguada(Poligono([(cx + sx * vw / 2, cy - vh / 2), (cx + sx * (vw / 2 + 2.2), cy - vh / 2),
                                        (cx + sx * (vw / 2 + 2.2), cy + vh / 2), (cx + sx * vw / 2, cy + vh / 2)], suave=False),
                              col, dens=0.8, tapa=1, irreg=0.1)
            lz.contorno(v, cont, grosor=0.4, presion=0.4, cortes=0.1, desfase=0.2)


def muros(x, y, w, d, h, pared, sem):
    front = [(x, y), (x + w, y), (x + w, y - h), (x, y - h)]
    side = [(x + w, y), (x + w + d, y - d * 0.45), (x + w + d, y - d * 0.45 - h), (x + w, y - h)]
    lz.aguada(Poligono(front, suave=False), pared, dens=0.6, tapa=1, irreg=0.5, borde=0.7, gran=0.4,
              toques=[(x + w * 0.25, y - h * 0.5, w * 0.4, mezcla(pared, '#fff6e6', 0.6), 0.5)], semilla=sem)
    lz.aguada(Poligono(side, suave=False), mezcla(pared, '#8a6a7a', 0.38), dens=0.65, tapa=1, irreg=0.5, borde=0.7, gran=0.4,
              semilla=sem + 1)
    cont = mezcla(pared, '#5e3f30', 0.65)
    lz.contorno(Poligono(front, suave=False), cont, grosor=0.6, presion=0.45, cortes=0.3, semilla=sem)
    lz.contorno(Poligono(side, suave=False), cont, grosor=0.6, presion=0.45, cortes=0.3, semilla=sem + 1)
    return side


def puerta(x, y, w, h, color):
    pw = min(w * 0.22, 9)
    px = x + w * 0.62
    p = Poligono([(px, y), (px + pw, y), (px + pw, y - min(h * 0.4, 15)), (px, y - min(h * 0.4, 15))], suave=False)
    lz.aguada(p, color, dens=0.85, tapa=1, irreg=0.2)
    lz.contorno(p, '#5e3f30', grosor=0.4, presion=0.4, cortes=0.1, desfase=0.2)


def casa_solar(x, y, w, d, h, pared, sem, pisos=1, cols=1):
    """Single-pitch roof that faces the sun and IS a solar panel."""
    muros(x, y, w, d, h, pared, sem)
    roof = [(x - 4, y - h + 2), (x + w + 3, y - h + 2), (x + w + d + 2, y - h - d * 0.45 - 12), (x + d - 4, y - h - d * 0.45 - 12)]
    tejado_tejas(roof, '#b8643f', sem, ang=-62)
    q = np.asarray(roof, float)
    B = lambda u, v: tuple(q[0] * (1 - u) * (1 - v) + q[1] * u * (1 - v) + q[2] * u * v + q[3] * (1 - u) * v)
    tejado_solar([B(0.08, 0.16), B(0.92, 0.16), B(0.92, 0.84), B(0.08, 0.84)], sem)
    ventanas(x, y - 2, w * 0.55, h - 4, pisos, cols, pared, sem, encendida=(0, 0))
    puerta(x, y, w, h, '#4f9c9a')
    return (x + w / 2 + d / 2, y - h - d * 0.25)


def casa_hastial(x, y, w, d, h, pared, teja, sem, pisos=2, cols=2, chimenea=False):
    """Gable end facing us; the long roof runs back up the hill."""
    side = muros(x, y, w, d, h, pared, sem)
    g = w * 0.42
    apex = (x + w / 2, y - h - g)
    tri = Poligono([(x - 1, y - h), (x + w + 1, y - h), apex], suave=False)
    lz.aguada(tri, pared, dens=0.6, tapa=1, irreg=0.4, borde=0.7, semilla=sem + 2)
    lz.contorno(tri, mezcla(pared, '#5e3f30', 0.65), grosor=0.5, presion=0.4, cortes=0.3, semilla=sem + 2)
    roof = [apex, (x + w + 3, y - h + 2), (x + w + d + 3, y - h - d * 0.45 + 2), (apex[0] + d, apex[1] - d * 0.45)]
    tejado_tejas(roof, teja, sem, ang=-28)
    if chimenea:
        cx, cy = x + w * 0.5 + d * 0.6, apex[1] - d * 0.27 + 6
        ch = Poligono([(cx, cy), (cx + 5, cy), (cx + 5, cy - 11), (cx, cy - 11)], suave=False)
        lz.aguada(ch, mezcla(pared, '#b07a5a', 0.4), dens=0.8, tapa=1, irreg=0.2)
        lz.contorno(ch, '#5e3f30', grosor=0.4, presion=0.4)
    ventanas(x, y - 4, w, h - 4, pisos, cols, pared, sem)
    lz.aguada(Elipse(apex[0], apex[1] + g * 0.45, 1.8), '#5a6a8a', dens=0.8, tapa=1)   # little attic hole
    puerta(x, y, w, h, ['#8a3a3a', '#4f9c9a', '#2f6f45', '#c98a3a'][sem % 4])


def casa_alero(x, y, w, d, h, pared, teja, sem, pisos=1, cols=3, balcon=False):
    """Ridge parallel to us: we see the roof slope over the front wall and the gable on the side."""
    side = muros(x, y, w, d, h, pared, sem)
    r = 9 + w * 0.08
    top_l = (x + d * 0.5 - 3, y - h - d * 0.225 - r)
    top_r = (x + w + d * 0.5 + 1, y - h - d * 0.225 - r)
    gab = Poligono([(x + w, y - h), (x + w + d, y - h - d * 0.45), top_r], suave=False)
    lz.aguada(gab, mezcla(pared, '#8a6a7a', 0.38), dens=0.65, tapa=1, irreg=0.4, semilla=sem + 3)
    lz.contorno(gab, mezcla(pared, '#5e3f30', 0.65), grosor=0.5, presion=0.4, cortes=0.3, semilla=sem + 3)
    roof = [(x - 4, y - h + 2), (x + w + 3, y - h + 2), top_r, top_l]
    tejado_tejas(roof, teja, sem, ang=-62)
    ventanas(x, y - 3, w, h - 3, pisos, cols, pared, sem, encendida=(0, 1) if sem % 3 == 0 else None)
    if balcon:
        by = y - h * 0.48
        lz.lapiz([[(x + w * 0.15, by), (x + w * 0.55, by)]], '#3e2a24', grosor=0.8, presion=0.6)
        lz.lapiz([[(x + w * 0.15 + i * 3, by), (x + w * 0.15 + i * 3, by - 5)] for i in range(int(w * 0.4 / 3) + 1)], '#3e2a24',
                 grosor=0.4, presion=0.45)
        for i in range(3):
            lz.aguada(Elipse(x + w * (0.2 + i * 0.13), by - 1.5, 1.8), [CORAL, '#c33c4e', '#f2d36b'][i], dens=0.9, tapa=1)
    puerta(x, y, w, h, ['#4f9c9a', '#8a3a3a', '#c98a3a'][sem % 3])


def campanario(x, y, w, d, h):
    """The bell tower that crowns the hill, its little bell in the arch."""
    pared = '#f2dcb4'
    muros(x, y, w, d, h, pared, 77)
    # belfry arch with the bell
    ax, ay = x + w / 2, y - h + 14
    arco_ = Poligono(list(arco(ax, ay, w * 0.26, 7, 180, 360, 16)) + [(ax + w * 0.26, ay + 9), (ax - w * 0.26, ay + 9)])
    lz.aguada(arco_, '#3e3a5a', dens=0.85, tapa=1, irreg=0.1)
    lz.aguada(Poligono([(ax - 3.2, ay + 7), (ax + 3.2, ay + 7), (ax + 2.2, ay + 1), (ax - 2.2, ay + 1)]), '#d9a43a', dens=0.95, tapa=1)
    lz.gouache(Elipse(ax - 1, ay + 3, 0.7), '#fff3c8', alfa=0.8, irreg=0)
    # a little clock
    lz.aguada(Elipse(ax, y - h * 0.48, 4.2), '#fbf4e8', dens=0.9, tapa=1)
    lz.contorno(Elipse(ax, y - h * 0.48, 4.2), '#5e3f30', grosor=0.45, presion=0.5, desfase=0.1)
    lz.lapiz([[(ax, y - h * 0.48), (ax, y - h * 0.48 - 3)], [(ax, y - h * 0.48), (ax + 2.2, y - h * 0.48)]], '#3e2a24', grosor=0.45,
             presion=0.6)
    # pyramid roof
    pico = (x + w / 2 + d / 2, y - h - d * 0.22 - 26)
    caras = ([(x - 2, y - h + 1), (x + w + 2, y - h + 1), pico], [(x + w + 2, y - h + 1), (x + w + d + 2, y - h - d * 0.45 + 1), pico])
    for k, q in enumerate(caras):
        tejado_tejas(q, '#b8553a' if k == 0 else '#8f4030', 78 + k, ang=-70 + 40 * k)
    vx_, vy_ = pico[0], pico[1] - 7
    lz.lapiz([[pico, (vx_, vy_)], [(vx_ - 8, vy_), (vx_ + 7, vy_)]], '#5e3f30', grosor=0.6, presion=0.65)
    lz.aguada(Poligono([(vx_ + 10, vy_), (vx_ + 5.5, vy_ - 3), (vx_ + 5.5, vy_ + 3)], suave=False), '#5e3f30', dens=0.95, tapa=1)
    lz.aguada(Poligono([(vx_ - 6, vy_), (vx_ - 10, vy_ - 5), (vx_ - 11, vy_), (vx_ - 9.5, vy_ + 1)], suave=False), '#e8735e', dens=0.95,
              tapa=1)
    lz.contorno(Poligono([(x, y), (x + w, y), (x + w, y - h), (x, y - h)], suave=False), '#7a5a3a', grosor=0.6, presion=0.5,
                cortes=0.2)


def arbol(x, y, r, color, semilla):
    mata(lz, x, y, r, color, semilla=semilla)
    lz.aguada(Trazo([(x, y + r * 0.55), (x, y + r * 1.45)], (2.6, 2.2)), '#7a5a3a', dens=0.85, tapa=0.6)


def cipres(x, y, h, semilla):
    f = Poligono(list(spline([(x, y - h), (x + h * 0.13, y - h * 0.55), (x + h * 0.11, y - h * 0.08), (x, y),
                              (x - h * 0.11, y - h * 0.08), (x - h * 0.13, y - h * 0.55)], cerrada=True)))
    lz.aguada(f, '#3f6f45', dens=0.8, tapa=1, irreg=0.4, borde=0.8, gran=0.3,
              toques=[(x - h * 0.04, y - h * 0.6, h * 0.12, '#6f9f5a', 0.6)], semilla=semilla)
    lz.rayado(f, '#2f4f35', angulo=75, sep=2.6, presion=0.35, grosor=0.5, largo=7, semilla=semilla)


# back row, near the top: the tower and its neighbours
tejados = []
arbol(1212, 616, 12, '#6f9f5a', 401)
cipres(1358, 622, 40, 402)
campanario(1272, 618, 26, 12, 74)
casa_alero(1220, 640, 46, 18, 26, '#f6ead6', '#c4553a', 11, cols=3)
casa_hastial(1310, 640, 34, 20, 34, '#eda38a', '#6f5a8a', 12, pisos=2, cols=2, chimenea=True)
casa_alero(1354, 650, 36, 18, 26, '#f4e2a8', '#b8553a', 13, cols=2)
cipres(1302, 652, 46, 408)
cipres(1212, 644, 40, 411)
# middle row
arbol(1136, 650, 13, '#5f8f4a', 403)
cipres(1186, 676, 34, 404)
casa_alero(1146, 680, 40, 20, 28, '#f6ead6', '#a8603a', 14, cols=2)
casa_hastial(1198, 682, 32, 18, 40, '#e2b25e', '#b8643f', 15, pisos=2, cols=2)
casa_alero(1246, 680, 52, 20, 30, '#a9c3d9', '#5a6f9a', 16, cols=3, balcon=True)
tejados.append(casa_solar(1312, 684, 40, 20, 28, '#f2d4b8', 17))
arbol(1380, 676, 12, '#6f9f5a', 405)
cipres(1240, 690, 52, 409)
cipres(1138, 702, 46, 410)
# front row, along the road
casa_hastial(1066, 714, 32, 18, 32, '#f6ead6', '#9a3a3a', 18, pisos=2, cols=1, chimenea=True)
tejados.append(casa_solar(1110, 708, 44, 22, 30, '#dfe3d6', 19, pisos=1, cols=2))
casa_alero(1172, 700, 40, 18, 24, '#e8c06a', '#c4553a', 20, cols=2)
casa_hastial(1222, 700, 30, 16, 30, '#f6ead6', '#8a5a3a', 21, pisos=2, cols=1)
tejados.append(casa_solar(1260, 698, 44, 20, 28, '#f0b8a8', 22, pisos=1, cols=2))
casa_alero(1316, 698, 38, 18, 26, '#f6ead6', '#6f5a8a', 23, cols=2)
arbol(1040, 722, 11, '#5f8f4a', 406)
cipres(1368, 704, 30, 407)

# the seeds that landed already turn as wind turbines on the edges of the hill
for (x, y, h) in ((1398, 640, 74), (1170, 616, 50)):
    lz.aguada(Trazo([(x, y), (x, y - h)], (3.8, 2.2)), '#f4f0e6', dens=0.6, tapa=1, irreg=0.1)
    lz.lapiz([[(x - 1.8, y), (x - 1, y - h)], [(x + 1.8, y), (x + 1, y - h)]], '#8a7a6a', grosor=0.5, presion=0.5)
    molinillo(x, y - h, h * 0.42, ang=rng.uniform(-20, 20), semilla_=False)
for k in range(26):
    t = rng.uniform(0.05, 0.95)
    x = 950 + 450 * t
    y = np.interp(x, [p[0] for p in CAMINO], [p[1] for p in CAMINO]) + rng.uniform(8, 14)
    lz.aguada(Elipse(x, y, rng.uniform(1.4, 2.2)), rng.choice([CORAL, '#f2d36b', '#fff1e0', '#c33c4e']), dens=0.85, irreg=0.2,
              tapa=0.7)


# velomobiles on the road: little pedal-powered shells, a head peeping out of each
def velomovil(x, y, L, color, cabeza='#c98a5e', casco=None, ropa='#4f9c9a', banderin='#ec8a2e'):
    """A velomobile going right along the road, tilted with it. (x, y): where it touches the road."""
    t = math.atan2(np.interp(x + 4, [p[0] for p in CAMINO], [p[1] for p in CAMINO]) -
                   np.interp(x - 4, [p[0] for p in CAMINO], [p[1] for p in CAMINO]), 8)
    c_, s_ = math.cos(t), math.sin(t)
    P = lambda u, v: (x + (u * c_ + v * s_) * L, y + (u * s_ - v * c_) * L)
    lz.aguada(Poligono([P(-0.5, -0.01), P(0.55, -0.01), P(0.55, -0.05), P(-0.5, -0.05)], suave=False), '#8a7a5a', dens=0.3,
              irreg=0.3, suave=1.5)   # its shadow on the road
    # the wheels peep out under the shell: two in front, one behind, thin and spoked like a bicycle's
    for u in (0.27, 0.33, -0.34):
        cx, cy = P(u, 0.085)
        rr = 0.085 * L
        lz.lapiz([arco(cx, cy, rr, rr, 0, 360, 28)], '#3e2a24', grosor=0.55, presion=0.7, temblor=0.03)
        lz.lapiz([[(cx + rr * math.cos(k * math.pi / 4), cy + rr * math.sin(k * math.pi / 4)),
                   (cx - rr * math.cos(k * math.pi / 4), cy - rr * math.sin(k * math.pi / 4))] for k in range(4)], '#6a5a4a',
                 grosor=0.3, presion=0.45, temblor=0.0)
    # mast and pennant, the sign everybody recognises
    m0, m1 = P(-0.42, 0.2), P(-0.47, 1.0)
    lz.lapiz([[m0, m1]], '#5e3f30', grosor=0.45, presion=0.6, temblor=0.05)
    lz.aguada(Poligono([m1, P(-0.47, 0.85), P(-0.70, 0.94)], suave=False), banderin, dens=0.95, tapa=1, irreg=0.1)
    # the rider: shoulders and head out of the cockpit, in the back third
    lz.aguada(Elipse(*P(-0.17, 0.36), 0.11 * L, 0.065 * L, math.degrees(t)), ropa, dens=0.9, tapa=1, irreg=0.1)
    hx, hy = P(-0.16, 0.47)
    lz.aguada(Elipse(hx, hy, 0.075 * L), cabeza, dens=0.85, tapa=1, irreg=0.1)
    if casco:
        lz.aguada(Poligono(list(arco(hx, hy - 0.4, 0.085 * L, 0.07 * L, 180, 360, 12))), casco, dens=0.9, tapa=1, irreg=0.1)
    # the shell: pointed nose low in front, highest by the rider, tail tapering
    cuerpo = Poligono(list(spline([P(0.58, 0.08), P(0.44, 0.19), P(0.20, 0.30), P(-0.04, 0.35), P(-0.27, 0.345), P(-0.45, 0.28),
                                   P(-0.56, 0.18), P(-0.50, 0.10), P(0.0, 0.09), P(0.45, 0.09)], cerrada=True)))
    lz.aguada(cuerpo, color, dens=0.9, tapa=1, irreg=0.3, borde=0.7, gran=0.3,
              toques=[(*P(0.15, 0.2), L * 0.2, mezcla(color, '#fff3dc', 0.5), 0.6)])
    lz.contorno(cuerpo, mezcla(color, '#3e2a24', 0.6), grosor=0.55, presion=0.55, cortes=0.1, desfase=0.2)
    # the cockpit opening around the rider
    lz.lapiz([[P(-0.02, 0.348), P(-0.31, 0.343)]], mezcla(color, '#3e2a24', 0.7), grosor=0.6, presion=0.6)
    lz.gouache(Trazo([P(0.42, 0.17), P(0.18, 0.27), P(0.0, 0.31)], (0.7, 0.9, 0.5)), '#fff6e6', alfa=0.75, irreg=0.1)


def posa(x):
    return x, float(np.interp(x, [p[0] for p in CAMINO], [p[1] for p in CAMINO])) + 2


# a row along the lower road, heading up to the village behind a bicycle
velomovil(*posa(962), 48, '#e8735e', '#8a5a3a', '#2f8f92', ropa='#f2d36b')
velomovil(*posa(1022), 41, '#2f8f92', '#f0c8a0', '#f2b630', ropa='#c33c4e')
velomovil(*posa(1076), 37, '#f2b630', '#5a3a2a', '#c33c4e', ropa='#4f9c9a', banderin='#c33c4e')
# and someone still cycles the ordinary way
cx_, cy_ = posa(1136)
cy_ -= 2
for dx in (-7, 7):
    lz.lapiz([arco(cx_ + dx, cy_, 5.5, 5.5, 0, 360, 24)], '#3e2a24', grosor=0.7, presion=0.7, temblor=0.05)
lz.lapiz([[(cx_ - 7, cy_), (cx_ - 1, cy_ - 6), (cx_ + 7, cy_), (cx_ - 1, cy_ - 6), (cx_ + 4, cy_ - 8)]], '#c33c4e', grosor=0.8,
         presion=0.7, temblor=0.05)
lz.aguada(Trazo([(cx_ - 3, cy_ - 10), (cx_ + 1, cy_ - 20)], (5, 4)), '#8d73b0', dens=0.85, tapa=1)
lz.aguada(Elipse(cx_ + 2, cy_ - 24.5, 3.5), '#5a3a2a', dens=0.8, tapa=1)
lz.lapiz([[(cx_ - 1, cy_ - 11), (cx_ + 4, cy_ - 4)], [(cx_ + 1, cy_ - 18), (cx_ + 5, cy_ - 10)]], '#4a5a8a', grosor=1.0, presion=0.7)

# threads of light: the sunflower shares its energy with every solar roof (community energy)
for k, (tx, ty) in enumerate(tejados):
    p = bezier(H(92, 120), (850 + k * 14, 560 + k * 8), (950 + k * 12, 610), (tx, ty + 2), 60)
    lz.lapiz([p], '#e9b44a', grosor=0.6, presion=0.5, temblor=0.3, cortes=0.35)
    for j in (18, 34, 50):
        lz.aguada(Elipse(*p[j], 1.7), '#f2b630', dens=0.9, irreg=0.1)


# gliders: no engine, they climb on the air the June sun warms. Seen from below and behind as they climb away:
# long slender wings across the sky, a short foreshortened fuselage, coloured wing tips.
def planeador(x, y, env, inclina=-8, franja='#e8735e', fu=0.42):
    t = math.radians(inclina)
    vx, vy = math.cos(t), math.sin(t)          # along the wings
    ux, uy = math.sin(t), -math.cos(t)         # along the fuselage, nose away from us (up the sheet)
    R = lambda u, v: (x + (u * fu * ux + v * vx) * env, y + (u * fu * uy + v * vy) * env)
    def ala(sd):
        return Poligono([R(0.05, 0.02 * sd), R(0.06, 0.30 * sd), R(0.04, 0.50 * sd), R(0.0, 0.505 * sd),
                         R(-0.02, 0.30 * sd), R(-0.05, 0.02 * sd)], suave=False)
    estab = Poligono([R(-0.30, -0.085), R(-0.27, -0.085), R(-0.265, 0.085), R(-0.295, 0.085)], suave=False)
    fus = Trazo([R(0.20, 0), R(0.12, 0), R(0.0, 0), R(-0.16, 0), R(-0.30, 0)],
                (0.012 * env, 0.02 * env, 0.019 * env, 0.011 * env, 0.006 * env))
    for f in (estab, fus, ala(-1), ala(1)):
        lz.aguada(f, '#fbf6ec', dens=0.95, tapa=1, irreg=0.1, borde=0.8)
        lz.contorno(f, '#6a6a7a', grosor=0.5, presion=0.5, cortes=0.05, desfase=0.1)
    # the fin, standing up from the tail
    bx, by = R(-0.29, 0)
    fin = Poligono([(bx - 0.006 * env * vx, by), (bx + 0.006 * env * vx, by), (bx + 0.004 * env, by - 0.07 * env),
                    (bx - 0.005 * env, by - 0.07 * env)], suave=False)
    lz.aguada(fin, '#fbf6ec', dens=0.95, tapa=1, irreg=0.1)
    lz.contorno(fin, '#6a6a7a', grosor=0.5, presion=0.5, cortes=0.05, desfase=0.1)
    for sd in (-1, 1):   # coloured wing tips
        lz.aguada(Poligono([R(0.045, 0.42 * sd), R(0.04, 0.50 * sd), R(0.0, 0.505 * sd), R(-0.008, 0.42 * sd)], suave=False),
                  franja, dens=0.9, tapa=1, irreg=0.1)
    lz.aguada(Elipse(*R(0.12, 0), 0.012 * env, 0.02 * env, inclina), '#7fb0c9', dens=0.85, tapa=1, irreg=0.1)   # canopy
    lz.aguada(Elipse(*R(0.0, 0), 0.5 * env, 0.01 * env, inclina), '#c9b9a0', dens=0.1, suave=5)


planeador(1060, 104, 150, inclina=24, franja='#e8735e')
planeador(1338, 404, 78, inclina=-24, franja='#e8735e')
lz.lapiz([[(1338 + 62 * math.cos(a_), 446 + 16 * math.sin(a_)) for a_ in np.linspace(a0, a0 + 0.5, 6)]
          for a0 in np.linspace(0.3, 2.9, 4)], '#c9b08a', grosor=0.45, presion=0.28, temblor=0.2)

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


# a satellite (2026-11-09, Eugenio: «pon un satélite»): high in the sky, it too lives on sunlight --
# its two wings are solar panels made of the same blue cells as the sunflower's face.
def satelite(x, y, s=1.0, ang=-14):
    a = math.radians(ang)
    R = lambda u, v: (x + (u * math.cos(a) - v * math.sin(a)) * s, y + (u * math.sin(a) + v * math.cos(a)) * s)
    # the orbit, a faint pencil arc it rides along
    orb = [R(u, 0.0016 * u * u - 2) for u in np.linspace(-230, 230, 90)]
    lz.lapiz([orb[:34], orb[56:68]], '#c9b08a', grosor=0.45, presion=0.25, temblor=0.3, cortes=0.55)
    # struts and the two panel wings
    lz.lapiz([[R(-44, 0), R(44, 0)]], '#6a6a7a', grosor=0.7, presion=0.6, temblor=0.05)
    for sd in (-1, 1):
        q = [R(sd * 14, -9), R(sd * 50, -9), R(sd * 50, 9), R(sd * 14, 9)]
        if sd < 0:
            q = [q[1], q[0], q[3], q[2]]
        tejado_solar(q, 700 + sd)
    # the body wrapped in gold foil
    cuerpo = Poligono([R(-9, -11), R(9, -11), R(9, 11), R(-9, 11)], suave=False)
    lz.aguada(cuerpo, '#e2b04a', dens=0.95, tapa=1, irreg=0.3, borde=0.7, gran=0.5,
              toques=[(*R(-3, -4), 7 * s, '#f7dc8a', 0.7), (*R(4, 6), 6 * s, '#b8862a', 0.6)])
    lz.rayado(cuerpo, '#9a6a2a', angulo=ang + 35, sep=2.2, presion=0.3, grosor=0.4, largo=5)
    lz.contorno(cuerpo, '#7a5a2a', grosor=0.55, presion=0.55, cortes=0.1, desfase=0.1)
    # the dish antenna, looking down at us, and a little coral beacon
    lz.lapiz([[R(0, 11), R(0, 17)]], '#6a6a7a', grosor=0.6, presion=0.6)
    plato = Elipse(*R(0, 20), 9 * s, 4 * s, ang)
    lz.aguada(plato, '#fbf6ec', dens=0.95, tapa=1, irreg=0.1)
    lz.contorno(plato, '#6a6a7a', grosor=0.5, presion=0.5, desfase=0.1)
    lz.aguada(Elipse(*R(0, 20.5), 1.4 * s), '#6a6a7a', dens=0.9, tapa=1)
    lz.lapiz([[R(-6, -11), R(-9, -19)]], '#6a6a7a', grosor=0.45, presion=0.55)
    lz.aguada(Elipse(*R(-9, -19.5), 1.8 * s), '#e8735e', dens=0.95, tapa=1)
    lz.gouache(Elipse(*R(-3, -6), 1.2 * s, 2.2 * s, ang), '#fff6dc', alfa=0.8, irreg=0)


satelite(214, 262, 1.0, ang=-14)   # below the web page's design buttons, which cover the top-left corner on screen

lz.vineta(margen=26)
lz.guardar(SALIDA)
print('ok', SALIDA)
