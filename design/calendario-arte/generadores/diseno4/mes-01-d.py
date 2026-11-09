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
lz.gouache(ball, '#9fc8d8', alfa=0.55, irreg=0.3)
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


# ------------------------------------------------------------------ the lynx, asleep at the girl's back (day 24)
def lince(x, y, s=1.0):
    """An Iberian lynx curled asleep, facing right: spotted coat, ear tufts, beard."""
    P = lambda pts: [(x + px * s, y + py * s) for px, py in pts]
    cuerpo = Poligono(P([(-62, 10), (-66, -14), (-50, -36), (-20, -46), (14, -44), (40, -34), (56, -18), (60, 2),
                         (50, 14), (10, 18), (-30, 18)]))
    volumen(lz, cuerpo, '#d9a25a', dens=0.78, sombra='#8a5a3a', luz=(-0.3, -1), brillo=0.25, lapiz='#6e4630',
            toques=[(x - 20 * s, y - 30 * s, 30 * s, '#ecc890', 0.6)])
    rr = np.random.default_rng(77)
    for k in range(40):   # spots
        px, py = rr.uniform(-58, 54), rr.uniform(-42, 12)
        if (px + 3) ** 2 / 3500 + (py + 14) ** 2 / 860 < 1:
            lz.aguada(Elipse(*P([(px, py)])[0], rr.uniform(1.4, 3.0) * s), '#4a2e22', dens=0.8, irreg=0.4)
    lz.lapiz([spline(P([(-46, -30), (-10, -42), (24, -38)])), spline(P([(-40, 8), (0, 12), (30, 8)]))],
             '#6e4630', grosor=0.6, presion=0.3, temblor=0.4)
    # short black-tipped tail curled around the front
    cola = Trazo(P([(-60, 6), (-40, 18), (-12, 18)]), (13 * s, 12 * s, 9 * s))
    lz.aguada(cola, '#c8904e', dens=0.78, tapa=1, irreg=0.4)
    lz.aguada(Elipse(*P([(-10, 18)])[0], 6.5 * s, 5.5 * s), '#2a1a14', dens=0.9, irreg=0.3)
    lz.contorno(cola, '#6e4630', grosor=0.8, presion=0.5)
    # head resting on the paws
    cab = Poligono(P([(36, -2), (40, -26), (56, -38), (76, -36), (90, -22), (93, 0), (80, 12), (56, 14)]))
    volumen(lz, cab, '#ddb070', dens=0.78, sombra='#8a5a3a', luz=(-0.3, -1), brillo=0.3, lapiz='#6e4630',
            toques=[(x + 80 * s, y - 2 * s, 10 * s, '#f6e8d0', 0.7)])
    for (ex, tip) in (((50, -33), (42, -66)), ((76, -35), (86, -68))):
        oreja = Poligono(P([ex, (ex[0] - 10, ex[1] + 2), tip, (ex[0] + 10, ex[1] + 3)]), suave=False)
        lz.aguada(oreja, '#c8904e', dens=0.85, tapa=1, irreg=0.3)
        lz.contorno(oreja, '#3e2a24', grosor=0.9, presion=0.65)
        t0 = P([tip])[0]
        lz.lapiz([[t0, (t0[0] + (3 if tip[0] > 60 else -3) * s, t0[1] - 13 * s)]], '#2a1a14', grosor=1.8, presion=0.9)
    for k in range(8):    # cheek ruff (the lynx's beard)
        a = math.radians(30 + k * 14)
        b0 = P([(78 + math.cos(a) * 8, 2 + math.sin(a) * 6)])[0]
        b1 = P([(82 + math.cos(a) * 20, 6 + math.sin(a) * 15)])[0]
        lz.lapiz([[b0, b1]], '#3e2a24', grosor=0.9, presion=0.6)
    lz.lapiz([arco(*P([(62, -18)])[0], 5 * s, 2.5 * s, 20, 160, 10), arco(*P([(81, -18)])[0], 5 * s, 2.5 * s, 20, 160, 10)],
             '#2a1a14', grosor=1.1, presion=0.9)
    lz.aguada(Elipse(*P([(91, -6)])[0], 3.2 * s, 2.4 * s), '#3a2420', dens=0.9)
    for px in (40, 58):
        pa = Elipse(*P([(px, 12)])[0], 11 * s, 6.5 * s)
        lz.aguada(pa, '#ecd0a0', dens=0.7, tapa=1, irreg=0.3)
        lz.contorno(pa, '#6e4630', grosor=0.7, presion=0.5)
        lz.lapiz([[P([(px + 4, 8)])[0], P([(px + 6, 16)])[0]], [P([(px - 2, 8)])[0], P([(px - 1, 17)])[0]]],
                 '#6e4630', grosor=0.5, presion=0.4)


lince(285, sy(285) - 6, 1.2)

# ------------------------------------------------------------------ the grandfather, lying on his back
K = 1.4
GA = sobre(910, 0)            # anchor: his waist on the ground


def G(u, v):
    """Grandfather's frame: u along the ground toward his feet, v up (units / K)."""
    x = 910 + u * K
    p = sobre(x, v * K)
    return p


HEAD_G = G(-112, 24)
rG = 31 * K
# legs (behind the torso): one stretched along the curve, one with the knee up
miembro(lz, [G(36, 15), G(100, 13), G(160, 11)], (30 * K, 23 * K, 18 * K), '#b8693a', lado=-1, pliegues=3)
pie = Poligono([G(156, 4), G(160, 26), G(170, 31), G(178, 18), G(172, 5)])
lz.aguada(pie, 'piel2', dens=0.62, tapa=1, irreg=0.4, toques=[(*G(165, 6), 8, '#c98a5e', 0.5)])
lz.contorno(pie, PIEL_LP, grosor=0.9, presion=0.55)
rodilla = G(84, 84)
miembro(lz, [G(30, 22), rodilla, G(118, 12)], (33 * K, 25 * K, 18 * K), '#c77a42', lado=1, pliegues=4)
pie2 = Poligono([G(110, 3), G(112, 16), G(126, 22), G(138, 14), G(134, 3)])
lz.aguada(pie2, 'piel2', dens=0.62, tapa=1, irreg=0.4, toques=[(*G(122, 4), 8, '#c98a5e', 0.5)])
lz.contorno(pie2, PIEL_LP, grosor=0.9, presion=0.55)
# the far arm resting along his side
miembro(lz, [G(-70, 30), G(-34, 16), G(0, 22)], (19 * K, 16 * K, 13 * K), '#3f8a8e', lado=-1)
mano(lz, *G(0, 23), -12, 24 * K, 'piel2', 'relajada', lado=1)
# torso: a thick knitted jumper, chest toward the sky
torso_pts = [G(-96, 24), G(-92, 58), G(-66, 70), G(-20, 64), G(20, 56), G(44, 40), G(44, 14), G(30, 2),
             G(-20, 2), G(-70, 4)]
prenda(lz, torso_pts, TEAL, luz=(-0.4, -1),
       pliegues=[[G(-40, 62), G(-10, 50), G(20, 52)], [G(-50, 30), G(-20, 38), G(10, 32)], [G(30, 50), G(36, 22)]])
for t in np.linspace(0.08, 0.92, 8):     # knitted band of tiny white stars across the chest
    estrella(lz, *G(-80 + t * 115, 46), 3.4, '#fff6dc', puntas=5)
lz.lapiz([[G(u, 37), G(u + 3.5, 37)] for u in range(-86, 36, 7)], '#fff6dc', grosor=0.9, presion=0.55)
cuello(lz, HEAD_G, rG, G(-92, 40), piel='piel2', ancho=0.5)
cara(lz, *HEAD_G, rG, piel='piel2', pelo='#d6d0ca', peinado='calvo', canas=True, barba='#ebe5de',
     giro=0.42, ang=-84, ojos='abiertos', mira=(1, -0.2), boca='risa', luz=(0.2, -1), semilla=31)
# pointing arm: up toward Jupiter (day 14)
HOMBRO = G(-80, 54)
CODO = (HOMBRO[0] + 64, HOMBRO[1] - 52)
MUN = (CODO[0] + 6, CODO[1] - 78)
miembro(lz, [HOMBRO, ((HOMBRO[0] + CODO[0]) / 2, (HOMBRO[1] + CODO[1]) / 2 - 6), CODO,
             ((CODO[0] + MUN[0]) / 2 + 2, (CODO[1] + MUN[1]) / 2), MUN],
        (22 * K, 19 * K, 15 * K, 16 * K, 12.5 * K), '#3f8a8e', lado=1, pliegues=4)
lz.aguada(Trazo([(MUN[0] - 1, MUN[1] + 14), (MUN[0], MUN[1] + 2)], (13 * K, 13 * K)), '#2f6f72', dens=0.7, tapa=0.5)
mano(lz, MUN[0] + 1, MUN[1] - 2, -84, 30 * K, 'piel2', 'senala', lado=-1)

# a sparrow on the raised knee (birds are dinosaurs, day 20)
pajaro(lz, rodilla[0] + 4, rodilla[1] - 34, 24, '#9a5a32', ang=-6, alas='arriba', vientre='#f3e6d0')

# ------------------------------------------------------------------ the girl, sitting, blowing the dandelion
Kg = 1.45
CAD = sobre(495, 16)


def N(u, v):
    """Girl's frame: origin at her hips, u right, v down (scaled)."""
    return (CAD[0] + u * Kg, CAD[1] + v * Kg)


HEAD = N(22, -150)
rN = 36 * Kg
# legs, knees up (far leg first)
for (k_, f_, c_) in (((92, -62), (126, 0), '#2f7f84'), ((80, -50), (112, 8), '#3f8f94')):
    miembro(lz, [N(10, -4), N(*k_), ((N(*k_)[0] + N(*f_)[0]) / 2 + 3, (N(*k_)[1] + N(*f_)[1]) / 2), N(*f_)],
            (34 * Kg, 22 * Kg, 20 * Kg, 15 * Kg), c_, lado=1)
    zap = Elipse(*N(f_[0] + 12, f_[1] + 2), 15 * Kg, 8 * Kg, -10)
    lz.aguada(zap, CORAL, dens=0.8, tapa=1, irreg=0.3)
    lz.contorno(zap, '#8a3a30', grosor=0.8, presion=0.55)
# dress: mustard, with tiny white flowers
vest = [N(-14, -94), N(18, -102), N(42, -88), N(46, -50), N(70, -62), N(96, -70), N(106, -56), N(96, -38),
        N(60, -14), N(20, 14), N(-34, 16), N(-44, 0), N(-32, -44)]
prenda(lz, vest, OCRE, luz=(-0.7, -0.6),
       pliegues=[[N(20, -40), N(50, -42), N(84, -56)], [N(-12, -20), N(10, 0), N(40, -10)], [N(26, -80), N(34, -60)],
                 [N(70, -30), N(92, -44)]])
for (u, v) in [(2, -72), (26, -56), (-10, -16), (40, -26), (16, 2), (70, -48), (-24, 4), (88, -58)]:
    fx_, fy_ = N(u, v)
    for k in range(5):
        a = k * 1.2566
        lz.gouache(Elipse(fx_ + math.cos(a) * 3.0, fy_ + math.sin(a) * 3.0, 2.0), '#fff3e0', alfa=0.9, irreg=0)
    lz.gouache(Elipse(fx_, fy_, 1.3), CARMIN, alfa=0.9, irreg=0)
# near arm: forearm resting on the knee
miembro(lz, [N(-4, -86), N(0, -62), N(10, -44), N(40, -56), N(70, -70)], (17 * Kg, 15 * Kg, 12 * Kg, 13 * Kg, 10 * Kg),
        'piel3', lado=1, lapiz=PIEL_LP)
lz.aguada(Trazo([N(-6, -92), N(-2, -70)], (22 * Kg, 19 * Kg)), OCRE, dens=0.78, tapa=1)
mano(lz, *N(68, -70), -20, 22 * Kg, 'piel3', 'relajada', lado=1)
cuello(lz, HEAD, rN, N(12, -96), piel='piel3', ancho=0.45)
cara(lz, *HEAD, rN, piel='piel3', pelo='#4a2a1c', peinado='melena', giro=0.55, ang=-14, ojos='abiertos',
     mira=(1, -0.6), boca='sopla', adorno=CORAL, semilla=57)
# the arm that holds the dandelion up into the wind
miembro(lz, [N(26, -92), N(70, -104), N(88, -146)], (15 * Kg, 13 * Kg, 10.5 * Kg), 'piel3', lado=1, lapiz=PIEL_LP)
lz.aguada(Trazo([N(20, -96), N(40, -100)], (19 * Kg, 16 * Kg)), OCRE, dens=0.78, tapa=1)
TALLO0 = N(92, -150)
CAB = N(124, -212)
lz.lapiz([bezier(TALLO0, N(110, -184), CAB, n=30)], '#6f8a4a', grosor=2.4, presion=0.8, temblor=0.2)
mano(lz, *N(86, -144), -66, 21 * Kg, 'piel3', 'agarra', lado=-1)
lz.lapiz([bezier(N(97, -160), N(108, -180), N(112, -188), n=10)], '#6f8a4a', grosor=2.4, presion=0.8, temblor=0.1)

# ------------------------------------------------------------------ the dandelion and its seeds
cx, cy = CAB
lz.aguada(Elipse(cx, cy, 36), '#f4e8c8', dens=0.25, suave=6, gran=0.1)
rad = []
for k in range(40):
    a = k / 40 * 2 * math.pi
    if 0.2 < a < 1.6:          # the windward side is already blown bare
        continue
    rr = 30 + rng.normal(0, 1.5)
    rad.append([(cx, cy), (cx + math.cos(a) * rr, cy + math.sin(a) * rr)])
lz.lapiz(rad, '#b0a088', grosor=0.5, presion=0.45, temblor=0.1)
for a0 in np.linspace(0, 2 * math.pi, 40, endpoint=False):
    if 0.2 < a0 < 1.6:
        continue
    lz.gouache(Elipse(cx + math.cos(a0) * 30, cy + math.sin(a0) * 30, 2.0), '#fffaf0', alfa=0.9, irreg=0)
lz.aguada(Elipse(cx, cy, 4), '#c9a24a', dens=0.8, irreg=0.2)


def semilla_vilano(x, y, s, ang):
    """A dandelion seed in flight: a fine stalk and a white parasol."""
    a = math.radians(ang)
    d = np.array([math.cos(a), math.sin(a)])
    p0 = np.array([x, y])
    p1 = p0 + d * 12 * s
    lz.lapiz([[p0, p1]], '#a08a6a', grosor=0.5, presion=0.55, temblor=0.05)
    lz.aguada(Elipse(*p0, 1.4 * s, 0.8 * s, ang), '#8a6a3a', dens=0.8, irreg=0.1)
    tr = []
    for k in range(9):
        b = a + math.radians(-60 + k * 15)
        tr.append([p1, p1 + np.array([math.cos(b), math.sin(b)]) * 7 * s])
    lz.lapiz(tr, '#b8a890', grosor=0.45, presion=0.45, temblor=0.05)
    for t in tr:
        lz.gouache(Elipse(*t[1], 0.8), '#fffaf0', alfa=0.85, irreg=0)


# the path of the seeds: up and to the right, into the galaxy's outer arm
GAL = (1180, 250)
camino = np.vstack([bezier((cx + 34, cy - 8), (820, 160), (900, 330), (990, 300), 60),
                    bezier((990, 300), (1050, 280), (1020, 190), (1060, 150), 40)[1:]])
# the breath itself: a faint golden ribbon from her lips, through the dandelion, up to the galaxy
soplo = np.vstack([bezier(N(46, -152), N(80, -200), (cx - 20, cy + 6), (cx, cy), 20), camino[::3]])
lz.aguada(Trazo(soplo, (6, 30, 46, 54, 60, 64, 70, 60, 40)), '#f6d690', dens=0.22, suave=14, gran=0.05)
lz.luz(Trazo(soplo, (10, 40, 50, 40, 20)), '#ffe6a8', fuerza=0.18, suave=12)
rng = np.random.default_rng(23)
cols_e = [ORO, CORAL, '#f6a5b5', TEAL, '#8d73b0']
for i, t in enumerate(np.linspace(0.02, 0.98, 40)):
    j = int(t * (len(camino) - 1))
    x, y = camino[j] + rng.normal(0, 16, 2) * (0.5 + t)
    d = camino[min(j + 1, len(camino) - 1)] - camino[max(j - 1, 0)]
    ang = math.degrees(math.atan2(d[1], d[0])) + 180 + rng.normal(0, 20)
    if t < 0.38:
        semilla_vilano(x, y, 1.6 - 0.5 * t, ang)
    elif t < 0.55:
        # half seed, half star: the parasol becomes a glowing point
        semilla_vilano(x, y, 1.25, ang)
        estrella(lz, x + math.cos(math.radians(ang + 180)) * 12, y + math.sin(math.radians(ang + 180)) * 12, 4.5,
                 cols_e[i % 5], gouache=False)
    else:
        estrella(lz, x, y, rng.uniform(4, 8) * (1.2 - 0.4 * t), cols_e[i % 5], gouache=False,
                 puntas=int(rng.choice([4, 5])))
        if i % 3 == 0:
            lz.aguada(Elipse(x, y, 10), '#f6d27a', dens=0.2, suave=4)
            lz.luz((x, y, 8), '#ffe2a0', fuerza=0.4)

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
nucleo = Elipse(gx, gy, 36, 25, -18)
lz.aguada(Elipse(gx, gy, 60, 42, -18), '#f3c060', dens=0.35, suave=14)
lz.aguada(nucleo, '#f3c060', dens=0.7, tapa=1, irreg=0.6, toques=[(gx, gy, 18, '#fff1c4', 0.9)], borde=0.3)
lz.luz((gx, gy, 50), '#ffe6a8', fuerza=0.65)
lz.chispas(gx, gy, 120, 70, n=26, semilla=5, luz=0.25)

# ------------------------------------------------------------------ Jupiter, the light that does not twinkle
JX, JY = 905, 96
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
for (x, y, r) in ((700, 70, 4), (940, 92, 3.5), (610, 160, 3), (980, 190, 3)):
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
    if abs(x - 540) < 50 or 700 < x < 870:
        continue
    hierba(x + rng.normal(0, 6), alto=rng.uniform(14, 26), col=rng.choice(['#4f6f45', '#5f8f63', '#6f8a4a']))
for x in list(range(170, 400, 23)) + list(range(560, 640, 26)) + list(range(1000, 1290, 21)):
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
for (x, y, a) in ((380, 520, 20), (330, 450, -30), (240, 590, 10), (1120, 540, 160), (1180, 480, 200),
                  (1230, 600, 190), (420, 600, 40), (1290, 540, 170)):
    luciernaga(lz, x, y, 1.5, a)

lz.vineta(margen=26)
lz.guardar(SALIDA)
print('ok', SALIDA)
