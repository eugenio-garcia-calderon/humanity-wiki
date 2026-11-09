"""
Mes 1 -- Cosmos y Vida -- Diseño 4.

Idea: "we are all stardust". On the curve of a small Earth -- a meadow on top,
an ocean that is also night sky below -- a girl blows a dandelion. Its seeds
fly off, turn into stars as they rise and become the arm of a spiral galaxy.
Her grandfather lies beside her in the grass and points at Jupiter, the bright
light that does not twinkle. A lynx sleeps curled at the girl's back, a
sparrow (a living dinosaur) perches on the old man's knee, fireflies glow over
the meadow (lights off, so they can find each other). In the ocean of the
little planet, chains of cyanobacteria breathe out the first oxygen.

    python3 mes-01-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, rgb, remuestrea,
                      cosmos, jardin, estrella, hojita, hoja, flor_simple, flor_grande, pececillo, pajaro, ramita,
                      motas, _lapiz_de)
from extra_m134 import cara, mano, miembro, prenda, volumen, cuello, luciernaga, Marco, SEPIA, PIEL_LP
from acuarela import cuello_natural

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-01-d.png'

lz = Lienzo(ANCHO, semilla=101)

TEAL = '#3f8f94'
CORAL = '#e8735e'
CARMIN = '#c33c4e'
ORO = '#f0c25e'
OCRE = '#e2a23a'
INDIGO = '#262a5c'

# ------------------------------------------------------------------ the little Earth
PC, PR = (720, 1330), 780          # centre and radius of the planet


def sy(x):
    """y of the planet's surface at x."""
    return PC[1] - math.sqrt(max(0.0, PR * PR - (x - PC[0]) ** 2))


def sobre(x, d=0.0):
    """A point on the surface at x, lifted d units along the normal."""
    y = sy(x)
    nx, ny = (x - PC[0]) / PR, (y - PC[1]) / PR
    return (x + nx * d, y + ny * d)


# the ocean that is also night sky, under the meadow; it dissolves toward the bottom
OCEANO = Elipse(PC[0], PC[1], PR - 50, PR - 50)
cosmos(lz, OCEANO, base='#24335f', toques_col=('#1f6f7a', '#2a7f86', '#4b3f8f'), estrellas=0.8, peces=False,
       semilla=11, dens=1.1)
for (y0, c, sv) in ((760, 0.3, 40), (800, 0.5, 30), (836, 0.85, 18)):
    lz.levanta(Poligono([(0, y0), (1485, y0), (1485, 900), (0, 900)], suave=False), c, suave=sv)
rng = np.random.default_rng(4)
# a whale and shoals of tiny fish in the deep
BALLENA = (600, 735)
bx_, by_ = BALLENA
ball = Poligono([(bx_ - 70, by_ + 4), (bx_ - 40, by_ - 16), (bx_ + 10, by_ - 18), (bx_ + 50, by_ - 8),
                 (bx_ + 76, by_ - 12), (bx_ + 96, by_ - 26), (bx_ + 92, by_ - 4), (bx_ + 100, by_ + 12),
                 (bx_ + 74, by_ + 4), (bx_ + 40, by_ + 14), (bx_ - 30, by_ + 18)])
lz.levanta(ball, 0.55, suave=4)
lz.aguada(ball, '#bfe4ec', dens=0.45, irreg=0.4, borde=0.8, toques=[(bx_ - 20, by_, 30, '#f6f0c8', 0.6)])
lz.luz(ball, '#d8f6ff', fuerza=0.55, suave=10)
lz.lapiz([spline([(bx_ - 64, by_ + 4), (bx_ - 30, by_ - 14), (bx_ + 20, by_ - 16), (bx_ + 60, by_ - 8)])], '#e8fbff',
         grosor=0.7, presion=0.6, cortes=0.3)
# the first life: a tiny luminous spiral shell and a glowing cell
for (cx_, cy_) in ((452, 712),):
    esp = np.array([(cx_ + math.cos(t) * (1.2 + t * 1.25), cy_ + math.sin(t) * (1.2 + t * 1.25)) for t in np.linspace(0, 12, 80)])
    lz.aguada(Elipse(cx_, cy_, 15), '#f4d8a8', dens=0.5, irreg=0.3, borde=0.8)
    lz.lapiz([esp], '#fff2d0', grosor=0.9, presion=0.8, temblor=0.05)
    lz.luz((cx_, cy_, 22), '#ffe6b0', fuerza=0.5)
cel = Elipse(905, 702, 11, 9, 20)
lz.aguada(cel, '#b8f0c8', dens=0.5, irreg=0.3, borde=0.9)
lz.aguada(Elipse(908, 700, 3.5), '#4f9c7a', dens=0.8, irreg=0.2)
lz.luz((905, 702, 18), '#c8ffd8', fuerza=0.5)
lz.lapiz([spline([(bx_ - 62, by_ + 8), (bx_ - 10, by_ + 14), (bx_ + 40, by_ + 8)])], '#d8f0f4', grosor=0.6, presion=0.5)
lz.gouache(Elipse(bx_ - 46, by_ - 2, 1.6), '#24335f', alfa=0.9, irreg=0)
for (x0, y0, ang) in ((420, 720, -12), (900, 700, 10), (1040, 760, -5)):
    for k in range(8):
        pececillo(lz, x0 + k * 9 * math.cos(math.radians(ang)) + rng.normal(0, 3),
                  y0 + k * 9 * math.sin(math.radians(ang)) + rng.normal(0, 4), rng.uniform(2.6, 3.6),
                  ang + rng.normal(0, 8), rng.choice(['#9fd0e0', '#f6c8a8']))
# cyanobacteria: bead chains glowing green, breathing out the first bubbles of oxygen (day 26)
for (x0, y0, a0) in ((520, 650, 20), (800, 652, -30), (700, 690, 60), (360, 690, -50), (980, 660, 35),
                     (1150, 700, 10)):
    a = math.radians(a0)
    x, y = x0, y0
    for k in range(10):
        a += rng.normal(0, 0.35)
        x += math.cos(a) * 4.4
        y += math.sin(a) * 4.4
        lz.gouache(Elipse(x, y, 2.1), '#a8e0a0', alfa=0.85, irreg=0)
    lz.luz((x0, y0, 18), '#b8f0a8', fuerza=0.3)
    for k in range(4):
        bx, by = x0 + rng.normal(0, 6), y0 - 10 - k * 9
        lz.lapiz([arco(bx, by, 1.8 + k * 0.4, 1.8 + k * 0.4, 0, 360, 12)], '#d8f4f0', grosor=0.5, presion=0.6)

# the meadow: a thick band of land along the curve, a garden of wild flowers
_ang = np.radians(np.linspace(0, 360, 260, endpoint=False))
_rin = PR - 64 + 5 * np.sin(_ang * 31) + 3 * np.sin(_ang * 77 + 1.0)
ORILLA = Poligono(np.stack([PC[0] + np.cos(_ang) * _rin, PC[1] + 8 + np.sin(_ang) * _rin], 1), suave=False)
TIERRA = Elipse(PC[0], PC[1], PR, PR) - ORILLA
jardin(lz, TIERRA, paleta=('#f0c25e', '#e8735e', '#c33c4e', '#f6a5b5', '#8d73b0', '#ffb36b'),
       verdes=('#5f8f63', '#7aa25a', '#3f7a6a', '#86a86c'), base='#6f9a52', base_dens=0.8, escala=1.1, densidad=0.75,
       semilla=12)
lz.aguada(TIERRA, '#2f5a4a', dens=0.3, borde=0.2, desvanece=(PC[0], PC[1] - PR + 70, PC[0], PC[1] - PR + 5))
lz.contorno(TIERRA, '#3f5a3a', grosor=1.0, presion=0.5, cortes=0.35, desfase=0.6)
# a fringe of grass blades breaking the perfect curve
rngb = np.random.default_rng(14)
for x in np.arange(150, 1300, 7.0):
    if sy(x) > 845:
        continue
    b0 = sobre(x + rngb.normal(0, 2), -3)
    nx, ny = (b0[0] - PC[0]) / PR, (b0[1] - PC[1]) / PR
    a = math.atan2(ny, nx) + rngb.normal(0, 0.3)
    L = rngb.uniform(7, 17)
    tip = (b0[0] + math.cos(a) * L, b0[1] + math.sin(a) * L)
    t = np.array([-ny, nx])
    blade = Poligono([b0 - t * 2.2, tip, b0 + t * 2.2], suave=False)
    lz.aguada(blade, rngb.choice(['#5f8f63', '#7aa25a', '#3f7a6a']), dens=0.8, irreg=0.2, borde=0.4, tapa=0.5)


def hierba(x, alto=18, n=7, col='#4f6f45'):
    """A grass tuft standing on the surface at x (blades follow the normal)."""
    bx, by = sobre(x, -2)
    nx, ny = (bx - PC[0]) / PR, (by - PC[1]) / PR
    tr = []
    for k in range(n):
        a = math.atan2(ny, nx) + rng.normal(0, 0.35)
        L = alto * rng.uniform(0.6, 1.2)
        ox = bx + rng.normal(0, 3)
        tip = (ox + math.cos(a) * L, by + math.sin(a) * L)
        mid = (ox + math.cos(a) * L * 0.5 + rng.normal(0, 2), by + math.sin(a) * L * 0.5)
        tr.append(bezier((ox, by), mid, tip, n=12))
    lz.lapiz(tr, col, grosor=0.9, presion=0.6, temblor=0.3)


# ------------------------------------------------------------------ the lynx, asleep below the girl (day 24)
def lince(x, y, s=1.0, ang=0.0):
    """An Iberian lynx lying asleep, facing right: haunch, tucked hind paw, forelegs stretched with the head
    resting on them, ear tufts, striped cheek ruff, short tail with a black tip."""
    M_ = Marco(x, y, ang, s)
    P = lambda pts: [M_(u, v) for u, v in pts]
    COL, OSC, CREMA = '#c99a62', '#7a5232', '#f2e2c4'
    cola = Trazo(P([(-66, -16), (-82, -8), (-86, 6)]), (12 * s, 10 * s, 8 * s))
    lz.aguada(cola, COL, dens=0.78, tapa=1, irreg=0.4)
    lz.aguada(Elipse(*M_(-86, 7), 5.5 * s, 5 * s), '#22160f', dens=1.0, irreg=0.2, tapa=1)
    lz.contorno(cola, OSC, grosor=0.7, presion=0.5)
    cuerpo = Poligono(P([(-72, 6), (-74, -18), (-58, -38), (-24, -46), (12, -42), (40, -30), (52, -12), (50, 10),
                         (20, 16), (-30, 16)]))
    volumen(lz, cuerpo, COL, dens=0.78, luz=(-0.2, -1), brillo=0.25, lapiz=OSC,
            toques=[(*M_(-10, 8), 26 * s, CREMA, 0.75), (*M_(-30, -36), 24 * s, '#b07c48', 0.5)])
    anca = Elipse(*M_(-46, -10), 27 * s, 22 * s, ang - 10)
    lz.lapiz([arco(*M_(-46, -10), 27 * s, 22 * s, 200, 420, 30, ang - 10)], OSC, grosor=0.8, presion=0.5, temblor=0.2)
    pata_t = Elipse(*M_(-20, 13), 17 * s, 6 * s, ang)
    lz.aguada(pata_t, CREMA, dens=0.6, tapa=1, irreg=0.3)
    lz.contorno(pata_t, OSC, grosor=0.7, presion=0.5)
    rr = np.random.default_rng(77)
    for k in range(46):   # small spots, denser on the back and haunch
        u, v = rr.uniform(-66, 44), rr.uniform(-40, 4)
        if (u + 12) ** 2 / 3300 + (v + 18) ** 2 / 640 < 1:
            lz.aguada(Elipse(*M_(u, v), rr.uniform(1.2, 2.4) * s, rr.uniform(1.0, 1.8) * s, ang), '#4a2e22', dens=0.75,
                      irreg=0.3)
    # forelegs stretched forward, paws crossed under the chin
    for dv in (6, 12):
        brazo = Trazo(P([(34, dv - 4), (62, dv), (86, dv + 2)]), (13 * s, 11 * s, 10 * s))
        lz.aguada(brazo, '#d8ac72', dens=0.75, tapa=1, irreg=0.3)
        lz.contorno(brazo, OSC, grosor=0.7, presion=0.5)
        pa = Elipse(*M_(90, dv + 2), 10 * s, 6.5 * s, ang)
        lz.aguada(pa, CREMA, dens=0.6, tapa=1, irreg=0.3)
        lz.contorno(pa, OSC, grosor=0.7, presion=0.5)
        lz.lapiz([[M_(93, dv - 1), M_(95, dv + 5)], [M_(87, dv - 1), M_(88, dv + 5)]], OSC, grosor=0.5, presion=0.5)
    # head on the paws
    for (eb, tip, sd) in (((64, -26), (58, -52), -1), ((86, -26), (94, -51), 1)):
        oreja = Poligono(P([(eb[0] - 9, eb[1] + 4), tip, (eb[0] + 9, eb[1] + 4)]), suave=False)
        lz.aguada(oreja, '#b8864e', dens=0.85, tapa=1, irreg=0.2, toques=[(*M_(eb[0], eb[1] - 6), 4 * s, '#f0d8c0', 0.6)])
        lz.contorno(oreja, '#2e1e16', grosor=0.9, presion=0.7)
        t0 = M_(*tip)
        lz.lapiz([[t0, M_(tip[0] + sd * 2, tip[1] - 12)]], '#1a120c', grosor=1.6, presion=0.95)
    cab = Poligono(P([(56, -6), (58, -22), (68, -30), (84, -30), (96, -20), (100, -6), (92, 4), (76, 6), (62, 4)]))
    volumen(lz, cab, '#d4a46a', dens=0.78, luz=(-0.2, -1), brillo=0.3, lapiz=OSC,
            toques=[(*M_(88, -4), 9 * s, CREMA, 0.75)])
    # the cheek ruff: a fringe of cream and black stripes hanging down from the jaw
    for k in range(9):
        u0 = 60 + k * 4.5
        lz.lapiz([[M_(u0, 0), M_(u0 + 1.5, 12)]], '#1a120c' if k % 2 else '#f2e2c4', grosor=1.1, presion=0.8)
    lz.lapiz([arco(*M_(72, -14), 5 * s, 2.4 * s, 20, 160, 10, ang), arco(*M_(88, -14), 5 * s, 2.4 * s, 20, 160, 10, ang)],
             '#1a120c', grosor=1.1, presion=0.9)
    lz.aguada(Elipse(*M_(98, -6), 3 * s, 2.2 * s, ang), '#4a2a22', dens=0.95)
    lz.lapiz([[M_(98, -4), M_(110, -6)], [M_(98, -3), M_(109, 0)]], '#6e5e50', grosor=0.4, presion=0.5)


sl = math.degrees(math.atan2(-(sy(312) - sy(290)) * -1, 22))
lince(262, sy(262) - 12, 1.1, ang=-36)

# ------------------------------------------------------------------ the girl, kneeling, blowing the dandelion
HEAD = (500, 380)
rN = 50
PIEL_N = 'piel3'
# feet tucked under her, soles up behind
for (x, y, a) in ((404, 612, 12), (414, 604, 0)):
    pl_ = Elipse(x, y, 16, 8, a)
    lz.aguada(pl_, PIEL_N, dens=0.6, tapa=1, irreg=0.3, toques=[(x - 6, y, 8, '#d88a7a', 0.6)])
    lz.contorno(pl_, PIEL_LP, grosor=0.8, presion=0.55)
cuello_natural(lz, *HEAD, rN, PIEL_N, (478, 440), 70, giro=0.55, inclina=-12)
# dress: over the shoulders, down the back, along the folded thighs to the knees
vest = [(452, 444), (478, 434), (502, 446), (508, 480), (502, 518), (534, 532), (556, 544), (566, 568), (540, 584),
        (470, 598), (420, 600), (424, 560), (440, 510), (442, 470)]
prenda(lz, vest, OCRE, luz=(-0.6, -0.8),
       pliegues=[[(470, 470), (464, 520), (452, 570)], [(500, 540), (520, 556), (548, 566)], [(440, 580), (470, 588)],
                 [(486, 476), (492, 510)]])
for (u, v) in [(462, 470), (486, 500), (452, 530), (512, 548), (478, 566), (540, 566), (440, 586), (492, 584)]:
    for k in range(5):
        a = k * 1.2566
        lz.gouache(Elipse(u + math.cos(a) * 3.0, v + math.sin(a) * 3.0, 2.0), '#fff3e0', alfa=0.9, irreg=0)
    lz.gouache(Elipse(u, v, 1.3), CARMIN, alfa=0.9, irreg=0)
cara(lz, *HEAD, rN, piel=PIEL_N, pelo='#4a2a1c', peinado='melena', giro=0.55, ang=-12, ojos='abiertos',
     mira=(1, -0.7), boca='sopla', adorno=CORAL, semilla=57)

# ------------------------------------------------------------------ the grandfather, lying back, his head against her knees
HG = (634, 528)
rG = 42
# legs: one knee up, foot flat on the grass; the other stretched, toes to the sky
miembro(lz, [(782, 548), (812, 553), (852, 558), (892, 563), (930, 566)], (40, 36, 30, 26, 20), '#b8693a', lado=-1,
        pliegues=3)
pie = Poligono([(924, 572), (926, 548), (934, 536), (944, 540), (946, 566), (940, 576)])
lz.aguada(pie, 'piel2', dens=0.62, tapa=1, irreg=0.4, toques=[(940, 570, 8, '#c98a5e', 0.5)])
lz.contorno(pie, PIEL_LP, grosor=0.9, presion=0.55)
RODILLA = (842, 476)
miembro(lz, [(776, 538), (808, 506), RODILLA, (858, 514), (872, 550)], (44, 40, 32, 28, 22), '#c77a42', lado=1,
        pliegues=4)
lz.lapiz([arco(RODILLA[0] - 4, RODILLA[1] + 8, 12, 8, 200, 340, 10)], '#7a3a20', grosor=0.7, presion=0.5)
pie2 = Poligono([(860, 556), (866, 546), (896, 552), (904, 562), (864, 566)])
lz.aguada(pie2, 'piel2', dens=0.62, tapa=1, irreg=0.4, toques=[(890, 560, 8, '#c98a5e', 0.5)])
lz.contorno(pie2, PIEL_LP, grosor=0.9, presion=0.55)
# the far arm resting along his side, hand on his belly
miembro(lz, [(672, 536), (712, 548), (748, 526)], (24, 20, 16), '#3f8a8e', lado=-1)
mano(lz, 748, 524, -30, 32, 'piel2', 'relajada', lado=1)
# torso: a thick knitted jumper, chest toward the sky
torso_pts = [(664, 552), (662, 512), (690, 490), (740, 488), (782, 496), (800, 516), (798, 548), (760, 560),
             (700, 562)]
prenda(lz, torso_pts, TEAL, luz=(-0.3, -1),
       pliegues=[[(710, 500), (736, 512), (770, 506)], [(700, 540), (740, 534), (780, 540)], [(786, 506), (790, 540)]])
for t in np.linspace(0.08, 0.92, 7):     # a knitted band of tiny white stars across the chest
    estrella(lz, 676 + t * 110, 506 - 10 * math.sin(t * 3.1), 3.6, '#fff6dc', puntas=5)
cuello(lz, HG, rG, (668, 530), piel='piel2', ancho=0.5)
cara(lz, *HG, rG, piel='piel2', pelo='#d6d0ca', peinado='calvo', canas=True, barba='#ebe5de',
     giro=0.15, ang=-90, ojos='abiertos', mira=(1, 0.2), boca='risa', luz=(0.2, -1), semilla=31)
# pointing arm: a clear line from his shoulder through the index finger to Jupiter (day 14)
JX, JY = 852, 262
HOMBRO, CODO, MUN = (684, 506), (712, 452), (744, 410)
miembro(lz, [HOMBRO, (697, 478), CODO, (728, 431), MUN], (26, 23, 18, 19, 15), '#3f8a8e', lado=1, pliegues=4)
lz.aguada(Trazo([(738, 420), (746, 408)], (17, 17)), '#2f6f72', dens=0.75, tapa=0.6)
lz.lapiz([[(733, 418), (751, 422)], [(735, 414), (753, 418)]], '#e8f4f0', grosor=0.6, presion=0.5)
ANG_J = math.degrees(math.atan2(JY - MUN[1], JX - MUN[0]))
mano(lz, MUN[0] + 2, MUN[1] - 2, ANG_J, 40, 'piel2', 'senala', lado=-1)
# a sparrow on the raised knee (birds are dinosaurs, day 20)
pajaro(lz, RODILLA[0] + 4, RODILLA[1] - 30, 23, '#9a5a32', ang=-6, alas='abajo', vientre='#f3e6d0')

# ------------------------------------------------------------------ the girl's hands: one strokes his head, one holds the flower
miembro(lz, [(468, 452), (500, 516), (568, 512)], (20, 17, 14), PIEL_N, lado=1, lapiz=PIEL_LP)
miembro(lz, [(466, 446), (478, 474)], (27, 23), OCRE, lado=1, pliegues=1)
mano(lz, 566, 512, -8, 34, PIEL_N, 'cuenco', lado=1)
CAB = (574, 384)
TALLO0 = (566, 470)
miembro(lz, [(494, 452), (522, 504), (552, 462)], (19, 16, 13), PIEL_N, lado=-1, lapiz=PIEL_LP)
miembro(lz, [(490, 446), (500, 472)], (26, 22), OCRE, lado=-1, pliegues=1)
lz.lapiz([bezier(TALLO0, (568, 430), CAB, n=30)], '#6f8a4a', grosor=2.4, presion=0.8, temblor=0.15)
mano(lz, 551, 462, -78, 31, PIEL_N, 'agarra', lado=-1)
lz.lapiz([bezier((560, 440), (566, 420), (570, 408), n=10)], '#6f8a4a', grosor=2.4, presion=0.8, temblor=0.1)

# ------------------------------------------------------------------ the dandelion and its seeds
cx, cy = CAB
lz.aguada(Elipse(cx, cy, 30), '#f4e8c8', dens=0.25, suave=6, gran=0.1)
rad = []
for k in range(36):
    a = k / 36 * 2 * math.pi
    if 4.0 < a < 5.9:          # the side facing her breath is already bare
        continue
    rr = 24 + rng.normal(0, 1.5)
    rad.append([(cx, cy), (cx + math.cos(a) * rr, cy + math.sin(a) * rr)])
lz.lapiz(rad, '#b0a088', grosor=0.5, presion=0.45, temblor=0.1)
for a0 in np.linspace(0, 2 * math.pi, 36, endpoint=False):
    if 4.0 < a0 < 5.9:
        continue
    lz.gouache(Elipse(cx + math.cos(a0) * 24, cy + math.sin(a0) * 24, 1.8), '#fffaf0', alfa=0.9, irreg=0)
lz.aguada(Elipse(cx, cy, 4), '#c9a24a', dens=0.8, irreg=0.2)


def vilano(x, y, s, ang, brasa=0.0):
    """A dandelion seed in flight; brasa 0..1 lights its tip up like a little star."""
    a = math.radians(ang)
    d = np.array([math.cos(a), math.sin(a)])
    p0 = np.array([x, y])
    p1 = p0 + d * 12 * s
    lz.lapiz([[p0, p1]], '#a08a6a', grosor=0.5, presion=0.55, temblor=0.05)
    lz.aguada(Elipse(*p0, 1.5 * s, 0.9 * s, ang), '#8a6a3a', dens=0.8, irreg=0.1)
    tr = []
    for k in range(9):
        b = a + math.radians(-60 + k * 15)
        tr.append([p1, p1 + np.array([math.cos(b), math.sin(b)]) * 7 * s])
    lz.lapiz(tr, '#b8a890', grosor=0.45, presion=0.45 * (1 - 0.5 * brasa), temblor=0.05)
    for t in tr:
        lz.gouache(Elipse(*t[1], 0.8), '#fffaf0', alfa=0.85, irreg=0)
    if brasa > 0:
        lz.aguada(Elipse(*p0, 5 * s), '#f6c860', dens=0.5 * brasa, suave=2)
        lz.gouache(Elipse(*p0, 1.3 * s), '#fff4c0', alfa=0.9, irreg=0)
        lz.luz((p0[0], p0[1], 8 * s), '#ffd870', fuerza=0.55 * brasa)


def estrellita(x, y, r, col):
    """A little star in pencil and watercolour: a warm dot, four fine rays, a halo."""
    lz.aguada(Elipse(x, y, r * 1.8), col, dens=0.25, suave=r * 0.8)
    lz.aguada(Elipse(x, y, r * 0.55), col, dens=0.9, irreg=0.2, borde=0.7)
    lz.lapiz([[(x - r * 2.2, y), (x + r * 2.2, y)], [(x, y - r * 2.2), (x, y + r * 2.2)],
              [(x - r * 1.0, y - r * 1.0), (x + r * 1.0, y + r * 1.0)], [(x - r * 1.0, y + r * 1.0), (x + r * 1.0, y - r * 1.0)]],
             _lapiz_de(col, 0.6), grosor=0.5, presion=0.55, temblor=0.05)
    lz.luz((x, y, r * 2.5), '#ffe2a0', fuerza=0.35)


# the path of the seeds: up from her lips, arching over Jupiter, into the galaxy's outer arm
GAL = (1180, 250)
camino = np.vstack([bezier((cx + 20, cy - 16), (600, 260), (660, 150), (800, 140), 60),
                    bezier((800, 140), (930, 130), (990, 230), (1045, 262), 50)[1:]])
soplo = np.vstack([bezier((520, 408), (548, 400), (cx - 14, cy + 4), (cx, cy), 12), camino[::3]])
lz.aguada(Trazo(soplo, (6, 22, 34, 44, 54, 60, 64, 58, 40)), '#f6d690', dens=0.2, suave=14, gran=0.05)
lz.luz(Trazo(soplo, (10, 30, 40, 40, 20)), '#ffe6a8', fuerza=0.16, suave=12)
rng = np.random.default_rng(23)
cols_e = [ORO, CORAL, '#f6a5b5', '#f0c25e', '#8d73b0']
for i, t in enumerate(np.linspace(0.02, 0.98, 56)):
    j = int(t * (len(camino) - 1))
    x, y = camino[j] + rng.normal(0, 12, 2) * (0.5 + t)
    d = camino[min(j + 1, len(camino) - 1)] - camino[max(j - 1, 0)]
    ang = math.degrees(math.atan2(d[1], d[0])) + 180 + rng.normal(0, 20)
    if t < 0.3:
        vilano(x, y, 1.6 - 0.6 * t, ang)
    elif t < 0.55:
        vilano(x, y, 1.4 - 0.6 * t, ang, brasa=(t - 0.3) / 0.25)
    else:
        estrellita(x, y, (4.6 - 2.2 * t) * rng.uniform(0.8, 1.25), cols_e[i % 5])

# ------------------------------------------------------------------ the galaxy
gx, gy = GAL
lz.aguada(Elipse(gx, gy, 190, 120, -18), '#f6d690', dens=0.2, suave=50, gran=0.05)
rngg = np.random.default_rng(88)
for k, a_off in enumerate((0, 120, 240)):
    pts = []
    for t in np.linspace(0, 1, 10):
        a = math.radians(a_off + t * 250)
        r = 22 + t * (190 if k != 1 else 150)
        px, py = math.cos(a) * r, math.sin(a) * r * 0.6
        pts.append((gx + px * math.cos(-0.3) - py * math.sin(-0.3), gy + px * math.sin(-0.3) + py * math.cos(-0.3)))
    halo = Trazo(pts, (40, 54, 60, 58, 50, 42, 34, 24, 14, 6))
    lz.aguada(halo, ('#7a5aa0', '#3f7f9a', '#a05a8a')[k], dens=0.32, suave=9, gran=0.3)
    nucleo_brazo = Trazo(pts[:-1], (22, 30, 32, 28, 24, 18, 12, 7, 3))
    cosmos(lz, nucleo_brazo, base='#2a3068', toques_col=('#4b3f8f', '#1f6f7a', '#7a3f7e'), estrellas=1.8,
           peces=(k == 0), semilla=200 + k, tapa=0.6, dens=1.0)
    for (px, py) in remuestrea(np.asarray(pts), 9):
        for _ in range(2):
            qx, qy = px + rngg.normal(0, 16), py + rngg.normal(0, 12)
            lz.aguada(Elipse(qx, qy, rngg.uniform(0.9, 2.0)), rngg.choice(['#4b3f8f', '#d9a441', '#c33c4e', '#3f8f94']),
                      dens=0.9, irreg=0.2)
lz.aguada(Elipse(gx, gy, 84, 58, -18), '#f6c870', dens=0.3, suave=24)
lz.aguada(Elipse(gx, gy, 54, 38, -18), '#f4a87a', dens=0.25, suave=14)
rngc = np.random.default_rng(6)
petal = Circulos([(gx + rngc.normal(0, 12), gy + rngc.normal(0, 8), rngc.uniform(12, 20)) for _ in range(7)])
lz.aguada(petal, '#f8d68a', dens=0.45, tapa=0.7, irreg=1.6, borde=0.9, flor=2, toques=[(gx, gy, 14, '#fff6d8', 0.9)])
lz.luz((gx, gy, 60), '#ffe6a8', fuerza=0.75)
lz.luz((gx, gy, 20), '#fffbe8', fuerza=0.6)
lz.chispas(gx, gy, 120, 70, n=26, semilla=5, luz=0.25)

# ------------------------------------------------------------------ Jupiter, the light that does not twinkle
jup = Elipse(JX, JY, 30)
lz.aguada(Elipse(JX, JY, 52), '#f6d690', dens=0.22, suave=14)
lz.aguada(jup, '#e6b07a', dens=0.8, tapa=1, irreg=0.3, borde=0.6,
          toques=[(JX - 10, JY - 10, 16, '#f6dcae', 0.7), (JX + 14, JY + 12, 18, '#b8693a', 0.5)])
for k, (dy, c) in enumerate(((-16, '#c88a5a'), (-6, '#b8693a'), (5, '#d49a6a'), (15, '#b8693a'))):
    w = math.sqrt(max(1, 30 ** 2 - dy ** 2))
    lz.aguada(Trazo([(JX - w + 3, JY + dy), (JX, JY + dy + 1.5), (JX + w - 3, JY + dy)], (4, 5, 4)) & jup, c,
              dens=0.55, irreg=0.4)
lz.aguada(Elipse(JX + 10, JY + 9, 5, 3.4), '#b8432e', dens=0.8, irreg=0.2)      # the great red spot
lz.aguada(jup, '#6a3a4a', dens=0.35, desvanece=(JX + 34, JY + 28, JX - 6, JY - 4))
lz.contorno(jup, '#8a4a2e', grosor=0.9, presion=0.55, cortes=0.2)
lz.luz((JX, JY, 34), '#ffe2a8', fuerza=0.3)
for k, dx in enumerate((-62, -46, 44, 70)):        # the four Galilean moons, in a row
    lz.aguada(Elipse(JX + dx, JY + dx * 0.1, 3.2 - (k % 2) * 0.6), '#d8c8a8', dens=0.8, irreg=0.2)
# twinkling stars around it, with rays (to tell them apart from the planet)
for (x, y, r) in ((960, 330, 3.5), (780, 300, 3), (920, 200, 3)):
    estrella(lz, x, y, r, ORO, gouache=False)
    lz.lapiz([[(x - r * 2.6, y), (x + r * 2.6, y)], [(x, y - r * 2.6), (x, y + r * 2.6)]], '#d9a441', grosor=0.5,
             presion=0.45)

# ------------------------------------------------------------------ the Moon, always the same face (day 9)
MX, MY = 255, 190
luna = Elipse(MX, MY, 46) - Elipse(MX + 22, MY - 10, 42)
lz.aguada(Elipse(MX, MY, 70), '#f3e0b0', dens=0.2, suave=18)
lz.aguada(luna, '#efd9a0', dens=0.75, tapa=1, borde=0.8, gran=0.5,
          toques=[(MX - 30, MY + 10, 20, '#d8b878', 0.6), (MX - 20, MY + 30, 12, '#c8a870', 0.5)])
for (x, y, r) in ((MX - 32, MY - 4, 5), (MX - 26, MY + 22, 3.5), (MX - 38, MY + 16, 2.5)):
    lz.aguada(Elipse(x, y, r), '#c8a870', dens=0.6, irreg=0.3)
lz.contorno(luna, '#a07a50', grosor=0.8, presion=0.5, cortes=0.2)
lz.luz((MX - 20, MY, 40), '#fff0c0', fuerza=0.3)

# ------------------------------------------------------------------ meadow life
rng = np.random.default_rng(31)
for x in range(240, 1170, 22):
    if 330 < x < 960:
        continue
    hierba(x + rng.normal(0, 6), alto=rng.uniform(14, 26), col=rng.choice(['#4f6f45', '#5f8f63', '#6f8a4a']))
for x in list(range(150, 200, 23)) + list(range(1000, 1290, 30)):
    if rng.random() < 0.3:
        continue
    c = rng.choice([CORAL, '#fff3e0', CARMIN, ORO, '#f6a5b5', '#fff3e0', '#8d73b0'])
    bx, by = sobre(x + rng.normal(0, 5), 16 + rng.uniform(0, 22))
    lz.lapiz([bezier(sobre(x, 0), (bx + rng.normal(0, 4), (by + sy(x)) / 2), (bx, by), n=10)], '#4f6f45', grosor=0.8,
             presion=0.6, temblor=0.2)
    if rng.random() < 0.25:
        hojita(lz, (bx + sobre(x, 0)[0]) / 2, (by + sy(x)) / 2, 8, rng.choice([-150, -30]), '#5f8f63', tapa=0.6)
    flor_simple(lz, bx, by, rng.uniform(5, 8.5), c, centro=ORO if c != ORO else CORAL)
# a little oak sapling (from oak to bacterium, we share ancestors, day 16)
b0 = sobre(1065, 0)
lz.lapiz([[b0, sobre(1066, 46)]], '#7a5a3a', grosor=2.0, presion=0.7, temblor=0.3)
for k, (dx, dd, ang) in enumerate(((-8, 30, -140), (8, 36, -40), (-4, 44, -110), (6, 22, -20), (0, 48, -80))):
    hp = sobre(1066 + dx * 0.2, dd)
    hoja(lz, hp[0], hp[1], 16, ang, '#6f9a4e', ancho=0.5, toque='#a8b84a')
# mushrooms
for (x, s_) in ((1110, 1.0), (1122, 0.7)):
    p = sobre(x, 0)
    lz.aguada(Trazo([p, sobre(x, 14 * s_)], (5 * s_, 4 * s_)), '#f4e8d0', dens=0.5, tapa=1)
    cap = Elipse(*sobre(x, 15 * s_), 10 * s_, 6 * s_, -8)
    lz.aguada(cap, CARMIN, dens=0.85, tapa=1, irreg=0.3)
    lz.gouache(Elipse(*sobre(x - 3, 17 * s_), 1.4), '#fffaf0', alfa=0.9, irreg=0)
    lz.contorno(cap, '#7a2a30', grosor=0.6, presion=0.5)
# a fern by the lynx
ramita(lz, [sobre(392, 0), sobre(388, 30), sobre(378, 54)], '#5f8f63', hojas=9, largo=11)

# fireflies over the meadow, lights out so they find each other (day 28)
for (x, y, a) in ((240, 600, 20), (372, 566, -20), (1010, 556, 160), (1090, 578, 200)):
    luciernaga(lz, x, y, 1.6, a)

lz.vineta(margen=26)
lz.guardar(SALIDA)
print('ok', SALIDA)
