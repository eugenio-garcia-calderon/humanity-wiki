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

# ------------------------------------------------------------------ the sun (upper right), a warm glow
SOL = (1300, 118)
lz.aguada(Elipse(*SOL, 120), '#f8d57e', dens=0.2, suave=45, gran=0.05)
lz.aguada(Elipse(*SOL, 44), '#f4b93e', dens=0.85, borde=0.8, flor=1, gran=0.3,
          toques=[(SOL[0] - 10, SOL[1] - 12, 26, '#fbe08a', 0.8), (SOL[0] + 18, SOL[1] + 16, 22, '#ec8a2e', 0.6)])
lz.contorno(Elipse(*SOL, 44), '#c0703f', grosor=0.8, presion=0.45, cortes=0.4)
rays = []
for k in range(22):
    a = math.radians(k * 360 / 22 + 4)
    r0, r1 = 54, 54 + (26 if k % 2 else 15)
    rays.append([(SOL[0] + math.cos(a) * r0, SOL[1] + math.sin(a) * r0),
                 (SOL[0] + math.cos(a) * r1, SOL[1] + math.sin(a) * r1)])
lz.lapiz(rays, '#d9902e', grosor=0.9, presion=0.55, temblor=0.3)
lz.luz((SOL[0], SOL[1], 40), '#fff1c0', fuerza=0.5)

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
    lz.aguada(f, color, dens=0.82, tapa=tapa, borde=0.75, flor=1, gran=0.4, toques=list(toques))
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
    s_ = 2.3 + rr * 0.022
    u, v = math.cos(a) * rr, math.sin(a) * rr
    t_ = (math.cos(a + 0.6), math.sin(a + 0.6))
    nn = (-t_[1], t_[0])
    q = [H(u + (t_[0] * dx + nn[0] * dy) * s_, v + (t_[1] * dx + nn[1] * dy) * s_)
         for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    col = rng.choice(['#3f6fb0', '#2f8f92', '#4a5aa8', '#2a7fb0'])
    lz.aguada(Poligono(q, suave=False), col, dens=0.75, irreg=0.15, borde=0.8, gran=0.15)
    if rng.random() < 0.55:
        lz.gouache(Poligono([q[0], q[1], (q[1][0] * 0.7 + q[2][0] * 0.3, q[1][1] * 0.7 + q[2][1] * 0.3),
                             (q[0][0] * 0.7 + q[3][0] * 0.3, q[0][1] * 0.7 + q[3][1] * 0.3)], suave=False),
                   '#cfe8f0', alfa=0.55, irreg=0)
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
lz.chispas(CX, CY, 100, 80, n=16, semilla=61, luz=0.25)
# sunlight arriving: fine golden lines from the sun to the panel
lz.lapiz([bezier(SOL, (1100, 140), (920, 170), H(60 + 30 * k, -50 + 25 * k)) for k in range(-1, 3)],
         '#e9b44a', grosor=0.7, presion=0.45, temblor=0.4, cortes=0.45)

# ------------------------------------------------------------------ the main leaf: the bench
HOJA1, mid1 = hojagrande((654, 584), (300, 578), 96, '#6e9c4e',
                         toques=[(340, 585, 50, '#a9c46a', 0.6), (600, 590, 50, '#3f6f45', 0.6),
                                 (470, 560, 50, '#8fb25a', 0.5)], curva=-0.1)

# ------------------------------------------------------------------ the thread of light, from the heart to the bulb
BULBO = (536, 492)
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
brazo2(lz, (452, 482), (480, 532), (506, 540), 21, '#d98a4a', P1, 'larga', sombra=1,
       mano=dict(ang=-20, gesto='agarra', lado=-1, tam=34))
cuello(lz, (424, 438), 30, (428, 476), P1)
torso2(lz, (396, 478), (458, 484), (408, 572), (452, 574), '#e8a04e', cintura=0.97, escote='v', sombra=-1,
       toques=[(420, 560, 40, '#c97b2c', 0.5)],
       pliegues=[[(420, 500), (430, 530), (428, 560)], [(446, 510), (452, 540)]])
# cardigan buttons
for y in (510, 530, 550):
    lz.aguada(Elipse(437, y, 2.2), '#8a4a2a', dens=0.8, irreg=0.1)
cabeza2(lz, 424, 438, 30, P1, '#e4ddd4', 'calvo', giro=0.55, inclina=10, ojos='abajo', boca='sonrisa',
        barba=None, canas=True, gafas=True)
lz.aguada(Poligono([(428, 452), (438, 449), (448, 454), (440, 459), (432, 458)]), '#e4ddd4', dens=0.5, irreg=0.3)
lz.lapiz([[(430, 455), (446, 456)]], '#9a9088', grosor=0.5, presion=0.4)

# the lamp: an old brass base with a socket; the girl screws the new bulb in
base_l = Poligono(np.vstack([arco(517, 566, 24, 18, 180, 360, 20), [(541, 566), (493, 566)]]), suave=False)
lz.aguada(base_l, '#c9963a', dens=0.8, tapa=1, borde=0.7, toques=[(530, 560, 14, '#8a5a22', 0.7)])
lz.contorno(base_l, '#7a4a22', grosor=0.8, presion=0.55)
pie_l = Trazo([(517, 548), (520, 528), (528, 512)], (7, 6, 6))
lz.aguada(pie_l, '#c9963a', dens=0.8, tapa=1, toques=[(524, 520, 6, '#8a5a22', 0.6)])
lz.contorno(pie_l, '#7a4a22', grosor=0.7, presion=0.5)
casq = Poligono([(524, 506), (538, 500), (542, 512), (530, 518)])
lz.aguada(casq, '#9a9a8a', dens=0.8, tapa=1)
lz.lapiz([[(527, 508), (539, 503)], [(529, 512), (540, 507)]], '#5a5a52', grosor=0.5, presion=0.5)
lz.contorno(casq, '#5a5a52', grosor=0.6, presion=0.5)
# the bulb (LED: a little yellow filament strip) glowing
bul = Elipse(BULBO[0] + 2, BULBO[1] - 8, 13, 15, 20)
lz.aguada(bul, '#fbe7a2', dens=0.35, tapa=1, irreg=0.2, borde=0.7)
lz.contorno(bul, '#b08a3a', grosor=0.6, presion=0.45, cortes=0.1)
lz.aguada(Trazo([(534, 498), (538, 488), (542, 494)], (2.5, 2.5)), '#f2a02e', dens=0.9, irreg=0.1)
lz.luz((BULBO[0] + 2, BULBO[1] - 8, 30), '#fff0b0', fuerza=0.9)
lz.aguada(Elipse(BULBO[0] + 2, BULBO[1] - 8, 70), '#f8d57e', dens=0.12, suave=25, gran=0.05)
# grandfather's near arm: wraps the base
brazo2(lz, (400, 488), (428, 548), (494, 560), 23, '#e8a04e', P1, 'larga', sombra=-1,
       mano=dict(ang=-8, gesto='agarra', lado=1, tam=36))

# ------------------------------------------------------------------ the girl (screws the bulb in)
P2 = 'piel4'
pierna2(lz, (590, 566), (536, 570), (522, 640), 26, None, P2, pie_ang=150, zapato=CORAL, sombra=-1)
pierna2(lz, (604, 570), (546, 580), (552, 650), 26, None, P2, pie_ang=195, zapato=CORAL, sombra=-1)
# her dress: a teal skirt that covers her lap down to the knees
falda = Poligono([(576, 518), (612, 518), (628, 562), (618, 584), (590, 590), (548, 590), (528, 584), (530, 562),
                  (556, 552)])
lz.aguada(falda, TEAL, dens=0.8, tapa=1, borde=0.7, toques=[(560, 580, 30, '#1f6f72', 0.6)])
lz.contorno(falda, '#1f5a5a', grosor=0.8, presion=0.5, cortes=0.25)
for (x, y) in ((566, 548), (590, 560), (606, 540), (580, 576), (548, 572), (612, 572)):
    lz.gouache(Elipse(x, y, 2.0), '#fff3cf', alfa=0.9, irreg=0)
# back arm resting on the leaf
brazo2(lz, (612, 480), (628, 526), (624, 562), 17, '#f2c04a', P2, 'corta', sombra=1,
       mano=dict(ang=95, gesto='relajada', lado=1, tam=26))
cuello(lz, (596, 434), 25, (594, 474), P2)
torso2(lz, (570, 476), (616, 478), (574, 526), (612, 528), TEAL, cintura=0.95, sombra=1,
       toques=[(600, 510, 30, '#1f6f72', 0.5)])
cabeza2(lz, 596, 434, 25, P2, '#2a1a14', 'afro', giro=-0.5, inclina=-14, ojos='abiertos', boca='abierta',
        mira=(-1, 1), pendiente=ORO)
# near arm: up to the bulb, fingers pinching it
brazo2(lz, (574, 484), (560, 528), (552, 506), 17, '#f2c04a', P2, 'corta', sombra=-1,
       mano=dict(ang=-130, gesto='pinza', lado=1, tam=27))

# the near edge of the leaf curls up in front of their hips: they sit IN it
labio = Trazo([(400, 590), (470, 600), (540, 602), (610, 598), (650, 590)], (5, 12, 14, 12, 6))
lz.aguada(labio, '#7aa456', dens=0.8, tapa=1, borde=0.7, toques=[(520, 600, 40, '#a9c46a', 0.6)])
lz.contorno(labio, VERDE_O, grosor=0.8, presion=0.5, cortes=0.2)
lz.lapiz([spline([(420, 594), (500, 602), (600, 600)])], '#d9e3a8', grosor=0.6, presion=0.5)
# a screwdriver and a tiny tin of screws on the leaf, between them
lz.aguada(Trazo([(448, 582), (470, 590)], (2.5, 2.5)), '#8a8a8a', dens=0.9, irreg=0.1, tapa=1)
mang = Trazo([(468, 590), (486, 596)], (6, 6))
lz.aguada(mang, '#c33c4e', dens=0.9, tapa=1, irreg=0.2)
lz.contorno(mang, '#7a1f30', grosor=0.6, presion=0.5)

# ------------------------------------------------------------------ the boy who lets the seeds fly (upper leaf)
P3 = 'piel3'
yb = 444
pierna2(lz, (842, 372), (836, 406), (832, yb), 22, '#3f6fb0', P3, pie_ang=170, zapato='#e8b53e', sombra=-1)
pierna2(lz, (858, 372), (874, 404), (888, yb - 8), 22, '#3f6fb0', P3, pie_ang=10, zapato='#e8b53e', sombra=1)
brazo2(lz, (862, 312), (888, 290), (912, 258), 15, '#e8735e', P3, 'corta', sombra=1,
       mano=dict(ang=-60, gesto='abierta', lado=-1, tam=24))
cuello(lz, (850, 274), 22, (850, 308), P3)
torso2(lz, (832, 310), (868, 312), (838, 376), (864, 376), '#e8735e', cintura=0.98, sombra=1,
       pliegues=[[(846, 330), (850, 360)]])
cabeza2(lz, 850, 274, 22, P3, '#3a2620', 'corto', giro=0.6, inclina=-18, ojos='cerrados', boca='risa')
brazo2(lz, (834, 316), (812, 336), (792, 322), 15, '#e8735e', P3, 'corta', sombra=-1,
       mano=dict(ang=200, gesto='abierta', lado=1, tam=24))


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


vuelo = bezier((928, 252), (1060, 170), (1150, 300), (1210, 520), 30)
for k, (x, y) in enumerate(vuelo[1:]):
    t = k / 29
    x += rng.normal(0, 14) * (0.4 + t)
    y += rng.normal(0, 12)
    s = 20 - 8 * t + rng.normal(0, 1.2)
    if k % 2 == 0:
        molinillo(x, y, s, ang=rng.uniform(-35, 35), color=['#f6e3c4', '#f4c9b4', '#f9e9b8'][k % 3])

# ------------------------------------------------------------------ the little village on its own hill
colina = Poligono([(1040, 690), (1080, 640), (1150, 604), (1240, 590), (1320, 600), (1392, 630), (1430, 680),
                   (1400, 712), (1300, 728), (1180, 728), (1080, 718)])
lz.aguada(colina, '#9fbf6a', dens=0.75, tapa=1, borde=0.6, gran=0.45,
          toques=[(1300, 620, 60, '#c9c46a', 0.6), (1120, 700, 60, '#6f9a4a', 0.6), (1380, 690, 50, '#5f8f4a', 0.5)])
lz.contorno(colina, VERDE_O, grosor=0.8, presion=0.5, cortes=0.35)
# fields in strips
for k, (c, y0) in enumerate((('#e9c46a', 690), ('#c9b46a', 704), ('#d9a441', 676))):
    f = Poligono([(1290 + k * 10, y0 - 10), (1400 - k * 6, y0 - 4 + k * 3), (1392 - k * 6, y0 + 8), (1286 + k * 10, y0 + 4)])
    lz.aguada(f, c, dens=0.6, irreg=0.6, gran=0.4, tapa=0.8)
    lz.rayado(f, mezcla(c, '#8a6a3a', 0.5), angulo=8, sep=3.5, presion=0.3, grosor=0.6, largo=40)
# the hill's earth underneath (it floats): a band of soil and roots fading out
tierra = Poligono([(1080, 718), (1180, 728), (1300, 728), (1400, 712), (1360, 752), (1260, 772), (1160, 766),
                   (1100, 744)])
lz.aguada(tierra, '#b88a5a', dens=0.55, gran=0.6, irreg=1.2, desvanece=(1240, 722, 1240, 776))
lz.lapiz([bezier((1150 + k * 40, 728), (1155 + k * 40, 744), (1146 + k * 40, 760)) for k in range(6)], '#8a6a4a',
         grosor=0.5, presion=0.35, temblor=0.5)
# road with the cyclist
camino = Trazo([(1060, 700), (1140, 676), (1220, 668), (1300, 648), (1380, 650)], (8, 9, 8, 7, 6))
lz.aguada(camino, '#efe0b8', dens=0.6, tapa=1, irreg=0.5)


def casita(x, y, w, h, pared, ventana_luz=True):
    """A little house with a solar roof seen from the side."""
    muro = Poligono([(x - w / 2, y), (x + w / 2, y), (x + w / 2, y - h), (x - w / 2, y - h)], suave=False)
    lz.aguada(muro, pared, dens=0.7, tapa=1, irreg=0.35, borde=0.7, toques=[(x + w / 2, y - h / 2, w * 0.4, mezcla(pared, '#7a3a2a', 0.4), 0.6)])
    lz.contorno(muro, LP, grosor=0.7, presion=0.5, cortes=0.2)
    techo = Poligono([(x - w / 2 - 4, y - h + 1), (x, y - h - w * 0.45), (x + w / 2 + 4, y - h + 1)], suave=False)
    lz.aguada(techo, '#2f4f8a', dens=0.85, tapa=1, irreg=0.3, borde=0.6, toques=[(x, y - h - 4, w * 0.3, '#3f6fb0', 0.6)])
    gl = []
    for t in np.linspace(0.25, 0.75, 3):
        gl.append([(x - w / 2 - 4 + (w / 2 + 4) * t * 2 * 0.5, y - h + 1 - w * 0.45 * t * 2 * 0.5 * 0 - 0),
                   (x, y - h - w * 0.45)])
    lz.lapiz([[(x - w / 2 + k * w / 4, y - h), (x, y - h - w * 0.45)] for k in (1, 2, 3)], '#9fc3e0', grosor=0.5,
             presion=0.6)
    lz.contorno(techo, '#1f2f5a', grosor=0.6, presion=0.5)
    vw = w * 0.22
    v = Poligono([(x - vw / 2, y - h * 0.6), (x + vw / 2, y - h * 0.6), (x + vw / 2, y - h * 0.25), (x - vw / 2, y - h * 0.25)],
                 suave=False)
    lz.aguada(v, '#f7d36a', dens=0.8, tapa=1, irreg=0.2)
    if ventana_luz:
        lz.luz((x, y - h * 0.42, w * 0.25), '#fff0b0', fuerza=0.45)
    return (x, y - h - w * 0.45)


tejados = []
for (x, y, w, h, c) in ((1150, 640, 34, 24, '#f0c8a0'), (1196, 628, 40, 28, '#e8a888'), (1252, 620, 36, 26, '#f4dcb0'),
                        (1236, 662, 42, 30, '#e8b080'), (1300, 640, 34, 24, '#f0c8a0')):
    tejados.append(casita(x, y, w, h, c))
# wind turbines already planted on the hill (the seeds that landed)
for (x, y, h) in ((1360, 628, 74), (1395, 650, 58), (1110, 652, 50)):
    lz.aguada(Trazo([(x, y), (x, y - h)], (3.8, 2.2)), '#f4f0e6', dens=0.6, tapa=1, irreg=0.1)
    lz.lapiz([[(x - 1.8, y), (x - 1, y - h)], [(x + 1.8, y), (x + 1, y - h)]], '#8a7a6a', grosor=0.5, presion=0.5)
    molinillo(x, y - h, h * 0.42, ang=rng.uniform(-20, 20), semilla_=False)
# meadow flowers dotting the hill
for k in range(26):
    x = rng.uniform(1070, 1400)
    y = rng.uniform(672, 712) if x < 1280 else rng.uniform(640, 670)
    lz.aguada(Elipse(x, y, rng.uniform(1.6, 2.6)), rng.choice([CORAL, '#f2d36b', '#fff1e0', '#c33c4e', '#a99bcb']),
              dens=0.9, irreg=0.2, tapa=0.8)
# a tree and a cyclist on the road
mata(lz, 1338, 600, 16, '#5f8f4a')
lz.aguada(Trazo([(1338, 612), (1338, 630)], (4, 4)), '#7a5a3a', dens=0.8, tapa=0.5)
cx_, cy_ = 1176, 664
for dx in (-9, 9):
    lz.lapiz([arco(cx_ + dx, cy_, 6.5, 6.5, 0, 360, 24)], '#3e2a24', grosor=0.7, presion=0.7, temblor=0.05)
lz.lapiz([[(cx_ - 9, cy_), (cx_ - 1, cy_ - 8), (cx_ + 9, cy_), (cx_ - 1, cy_ - 8), (cx_ + 5, cy_ - 10)],
          [(cx_ - 1, cy_ - 8), (cx_ - 3, cy_ - 11)]], '#c33c4e', grosor=0.8, presion=0.7, temblor=0.05)
lz.aguada(Trazo([(cx_ - 3, cy_ - 12), (cx_ + 1, cy_ - 24)], (6, 5)), '#4f9c9a', dens=0.85, tapa=1)
lz.aguada(Elipse(cx_ + 2, cy_ - 30, 4.2), '#c98a5e', dens=0.75, tapa=1)
lz.aguada(Elipse(cx_ + 1, cy_ - 32, 4.4, 2.6), '#f0c25e', dens=0.85, tapa=1)
lz.lapiz([[(cx_ - 1, cy_ - 13), (cx_ + 4, cy_ - 4)], [(cx_ + 1, cy_ - 22), (cx_ + 6, cy_ - 12)]], '#4a5a8a',
         grosor=1.0, presion=0.7)

# threads of light: the sunflower shares its energy with every roof (community energy)
for k, (tx, ty) in enumerate(tejados):
    p = bezier(H(118, 92), (900 + k * 14, 520 + k * 6), (1040 + k * 12, 560), (tx, ty + 2), 60)
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

# a pair of swallows over the hill
pajaro(lz, 1040, 420, 11, TEAL, ang=-12)
pajaro(lz, 1085, 392, 9, '#c33c4e', ang=-24, alas='abajo')

lz.vineta(margen=26)
lz.guardar(SALIDA)
print('ok', SALIDA)
