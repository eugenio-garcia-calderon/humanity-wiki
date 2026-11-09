"""
Mes 2 -- Relaciones -- Diseño 4.

Idea: a real, muscular heart that is a home and glows from inside. Golden
lamplight from three windows warms the muscle around them. In each window, one
very clear gesture of love: a grandmother cradling a baby, two children
tickling each other, a couple forehead to forehead. A thin red thread, drawn
by hand, is tied to a little finger in every window. The coronary vessels on
the surface are branches and roots; the aorta is a garden whose petals fall;
the great veins carry a night sea from which a few stars escape.

    python3 mes-02-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, remuestrea,
                      busto, mano, cabeza, extremidad, cosmos, jardin, estrella, hojita, rgb, _lapiz_de)

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-02-d.png'

lz = Lienzo(ANCHO, semilla=202)

CORAL = '#e8735e'
CARMIN = '#c33c4e'
HILO = '#c8202e'
SEP = '#6b4433'
MUSCULO_LP = '#8f2a3c'

# a close golden aura only: the heart glows, the rest of the sheet is silence
lz.aguada(Poligono([(600, 250), (760, 180), (960, 250), (1060, 480), (960, 760), (860, 860), (620, 740),
                    (450, 520), (470, 330)]), '#f4cf7a', dens=0.14, suave=45, gran=0.0)


# ------------------------------------------------------------------ great vessels
def vaso(pts, anchos, color, borde_lp, luzlado=1, mundo=None, semilla=None, toques=None):
    """A great vessel with volume. mundo='cosmos' fills it with night sea;
    mundo='jardin' with a few big flowers."""
    f = Trazo(pts, anchos)
    if mundo == 'cosmos':
        cosmos(lz, f, base='#24335f', toques_col=('#1f6f7a', '#4b3f8f', '#2a7f86'), estrellas=1.1, semilla=semilla)
    elif mundo == 'jardin':
        jardin(lz, f, paleta=('#f08a6a', '#f6c25e', '#c33c4e', '#f6a7b8'), verdes=('#6f9a5e', '#3f7a6a'),
               base='#ec7f6c', base_dens=0.78, escala=1.45, densidad=1.5, semilla=semilla)
    else:
        lz.aguada(f, color, dens=0.72, tapa=1, toques=toques, sombra=(-luzlado * 12, -6))
    p = np.asarray(f.p)
    tg = np.gradient(p, axis=0)
    tg /= np.maximum(np.hypot(*tg.T)[:, None], 1e-9)
    nr = np.stack([-tg[:, 1], tg[:, 0]], 1)
    off = p + nr * (f.w[:, None] * 0.22 * luzlado)
    lz.levanta(Trazo(off[::6], (anchos[0] * 0.14, anchos[-1] * 0.12)), 0.28, suave=4)
    lz.contorno(f, borde_lp, grosor=1.0, presion=0.6, cortes=0.25)
    return f


def boca_vaso(x, y, rx, ry, ang, pared, luz_interior):
    """The cut end of a real vessel: a ring of wall around the dark lumen."""
    ext = Elipse(x, y, rx, ry, ang)
    lz.aguada(ext, pared, dens=0.8, tapa=1, irreg=0.2, borde=0.7)
    lumen = Elipse(x + rx * 0.05, y + ry * 0.12, rx * 0.72, ry * 0.62, ang)
    lz.aguada(lumen, luz_interior, dens=1.0, tapa=1, irreg=0.2, borde=0.5)
    lz.contorno(ext, SEP, grosor=0.9, presion=0.6, cortes=0.05, desfase=0.2)
    lz.contorno(lumen, SEP, grosor=0.7, presion=0.45, cortes=0.1, desfase=0.2)


AORTA = [(718, 318), (712, 236), (735, 168), (795, 132), (858, 140), (898, 186), (914, 262), (918, 345)]
for a, b_, w in (((742, 158), (732, 80), 32), ((790, 136), (794, 66), 27), ((838, 138), (856, 74), 29)):
    vaso([a, ((a[0] + b_[0]) / 2 + 2, (a[1] + b_[1]) / 2), b_], (w, w * 0.92), CORAL, '#9c3a32',
         toques=[(b_[0] - 6, b_[1] + 20, 22, CARMIN, 0.5)])
    boca_vaso(b_[0], b_[1], w * 0.47, w * 0.17, -6 if b_[0] < 800 else 8, '#d9604e', '#6a1a28')
vaso(AORTA, (78, 76, 72, 70, 68), CORAL, '#9c3a32', luzlado=-1, mundo='jardin', semilla=71)
vaso([(606, 318), (602, 230), (598, 150)], (58, 56, 54), '#24335f', '#22305a', luzlado=-1, mundo='cosmos',
     semilla=72)
boca_vaso(598, 150, 27, 10, -3, '#3f5a8a', '#151a3a')
vaso([(782, 350), (792, 282), (838, 238), (900, 222), (960, 232)], (72, 68, 60, 52, 46), '#24335f', '#22305a',
     luzlado=1, mundo='cosmos', semilla=73)
boca_vaso(963, 233, 10, 23, 8, '#3f5a8a', '#151a3a')

# ------------------------------------------------------------------ heart body
# anterior view, tilted as a real heart: apex down and to the viewer's right
CUERPO_PTS = [(608, 300), (552, 306), (510, 350), (490, 420), (498, 492), (530, 556), (594, 630),
              (672, 700), (760, 762), (838, 800), (884, 806), (918, 780), (958, 704), (992, 606),
              (1006, 506), (998, 412), (972, 346), (930, 308), (872, 306), (812, 322), (752, 318), (682, 302)]
CUERPO = Poligono(CUERPO_PTS)
CENTRO = np.array([760.0, 520.0])
# lit from inside: warm gold at the heart of the muscle, deep carmine toward the rim
lz.aguada(CUERPO, '#e9806e', dens=0.72, borde=0.7, tapa=1, flor=2, var=0.4,
          toques=[(760, 500, 200, '#f4a86a', 0.85), (980, 600, 140, '#b02a40', 0.8),
                  (880, 790, 110, '#9c2238', 0.85), (520, 430, 90, '#d0505a', 0.5)])
# second glaze, hard-edged, on the outer rim of the muscle (veladura)
ANILLO = CUERPO - Poligono([tuple(CENTRO + (np.array(p) - CENTRO) * 0.84 + (-30, -34)) for p in CUERPO_PTS])
lz.aguada(ANILLO, '#a82a40', dens=0.3, borde=0.6, irreg=1.5, gran=0.4)
lz.aguada(CUERPO, '#9c2238', dens=0.3, borde=0.3, desvanece=(1010, 700, 760, 520), gran=0.3)


# auricles: frilly, wrinkled ear-like flaps (not buns)
def orejuela(cx, cy, rx, ry, ang, n=11, semilla=0):
    rng = np.random.default_rng(semilla)
    t = np.linspace(0, 2 * np.pi, 90, endpoint=False)
    rad = 1 + 0.07 * np.sin(n * t + rng.uniform(0, 6)) + 0.03 * np.sin(23 * t)
    rad = np.where(np.sin(t) > -0.2, rad, 1.0)          # frills on the free (lower/outer) edge
    a = math.radians(ang)
    px = rx * rad * np.cos(t)
    py = ry * rad * np.sin(t)
    pts = np.stack([cx + px * math.cos(a) - py * math.sin(a), cy + px * math.sin(a) + py * math.cos(a)], 1)
    f = Poligono(pts, suave=False)
    lz.aguada(f, '#e47a72', dens=0.72, tapa=1, irreg=0.5, borde=0.8,
              toques=[(cx + rx * 0.5, cy + ry * 0.4, rx * 0.6, '#b02a40', 0.7)], sombra=(-8, -6))
    lz.contorno(f, MUSCULO_LP, grosor=1.0, presion=0.6, cortes=0.2)
    arrugas = []
    for k in range(5):
        u = -0.6 + k * 0.3
        arrugas.append(bezier((cx + rx * u, cy - ry * 0.3), (cx + rx * (u + 0.1), cy + ry * 0.1),
                              (cx + rx * (u + 0.05), cy + ry * 0.75), n=12))
    lz.lapiz(arrugas, '#9c2a40', grosor=0.7, presion=0.4, temblor=0.4, cortes=0.3)
    return f


orejuela(666, 300, 54, 30, -6, semilla=1)
orejuela(964, 324, 34, 25, 18, semilla=2)

# muscle fibres in pencil, wrapping the heart like its own contour (spiralling down)
rng = np.random.default_rng(5)
fib = []
P = np.asarray(spline(CUERPO_PTS, True, 10))
for k in range(16):
    sc = 0.96 - k * 0.045
    rot = math.radians(-6 + k * 1.2)
    Q = CENTRO + ((P - CENTRO) * sc) @ np.array([[math.cos(rot), math.sin(rot)], [-math.sin(rot), math.cos(rot)]])
    Q = Q + np.array([0, k * 4.0])
    n = len(Q)
    for _ in range(3):
        i0 = rng.integers(0, n)
        L = rng.integers(n // 10, n // 4)
        seg = np.take(Q, range(i0, i0 + L), axis=0, mode='wrap')
        fib.append(seg)
lz.lapiz(fib, '#a5324a', grosor=0.75, presion=0.3, temblor=0.8, cortes=0.25)


# coronary vessels on the surface: branches and roots of the house
def rama(p, ang, L, w, prof, rng, out):
    if prof == 0 or L < 8:
        return
    a = math.radians(ang)
    q = (p[0] + math.cos(a) * L, p[1] + math.sin(a) * L)
    mid = ((p[0] + q[0]) / 2 + rng.normal(0, L * 0.08), (p[1] + q[1]) / 2 + rng.normal(0, L * 0.08))
    out.append(([p, mid, q], (w, w * 0.8, w * 0.6)))
    for sd in (-1, 1):
        if rng.random() < 0.85:
            rama(q, ang + sd * rng.uniform(22, 42), L * rng.uniform(0.55, 0.72), w * 0.62, prof - 1, rng, out)


rngr = np.random.default_rng(11)
segs = []
tronco = [(788, 330), (798, 430), (814, 540), (834, 650), (856, 760)]
segs.append((tronco, (11, 9, 7, 5, 3)))
for (p, ang, L) in (((798, 430), 160, 70), ((814, 540), 20, 75), ((814, 540), 165, 70), ((834, 650), 25, 60),
                    ((834, 650), 150, 60), ((798, 380), 15, 60)):
    rama(p, ang, L, 5.5, 3, rngr, segs)
for (p, ang, L) in (((560, 330), 100, 60), ((990, 380), 100, 70)):
    rama(p, ang, L, 4.5, 3, rngr, segs)
for pts, an in segs:
    f = Trazo(pts, an)
    lz.aguada(f, '#8a3a2e', dens=0.8, irreg=0.3, borde=0.7, tapa=0.6, toques=[(*pts[0], 30, '#5a2a22', 0.6)])
    lz.contorno(f, '#4a1a1a', grosor=0.6, presion=0.45, cortes=0.3, desfase=0.2)
# leaves and a few blossoms where the branches end
for i, (pts, an) in enumerate(segs[1:]):
    x, y = pts[-1]
    if an[0] < 2.6:
        hojita(lz, x, y, rngr.uniform(9, 13), rngr.uniform(0, 360), rngr.choice(['#6f9a5e', '#4f8a5a', '#86a86c']),
               tapa=0.9)
        if i % 4 == 0:
            for k in range(5):
                a_ = math.radians(k * 72 + i * 13)
                lz.gouache(Elipse(x + math.cos(a_) * 3.2, y + math.sin(a_) * 3.2, 3, 2, math.degrees(a_)),
                           '#fde4e6', alfa=0.92, irreg=0.2)
            lz.gouache(Elipse(x, y, 1.4), '#e7a33e', alfa=0.95, irreg=0)


# ------------------------------------------------------------------ windows
def ventana(cx, cy, w, h):
    """Arched window cut in the heart's wall: warm interior lit from inside."""
    def arcw(ww, hh):
        top = arco(cx, cy - hh / 2 + ww / 2, ww / 2, ww / 2, 180, 360, 30)
        return np.vstack([[[cx - ww / 2, cy + hh / 2]], top, [[cx + ww / 2, cy + hh / 2]]])
    # the muscle around the window is lit by its lamp
    lz.luz(Elipse(cx, cy, w * 0.95, h * 0.8), '#ffcf86', fuerza=0.32, suave=w * 0.35)
    marco = Poligono(arcw(w + 20, h + 16), suave=False)
    hueco = Poligono(arcw(w, h), suave=False)
    lz.aguada(marco, '#f7e6c8', dens=0.4, tapa=1, irreg=0.5, gran=0.2,
              toques=[(cx + w * 0.35, cy + h * 0.3, w * 0.4, '#e2a46a', 0.6)])
    lz.contorno(marco, SEP, grosor=1.0, presion=0.6, cortes=0.2)
    lz.aguada(hueco, '#f7cd70', dens=0.5, tapa=1, irreg=0.4, borde=0.5,
              toques=[(cx, cy + h * 0.45, w * 0.55, '#f0a070', 0.6), (cx, cy - h * 0.3, w * 0.4, '#fff0c0', 0.7)])
    lz.contorno(hueco, SEP, grosor=0.9, presion=0.5, cortes=0.25, desfase=0.4)
    sill = Poligono([(cx - w / 2 - 18, cy + h / 2 + 2), (cx + w / 2 + 18, cy + h / 2 + 2),
                     (cx + w / 2 + 14, cy + h / 2 + 14), (cx - w / 2 - 14, cy + h / 2 + 14)], suave=False)
    return hueco, sill


def cierra_ventana(hueco, sill, cx, cy, w, h):
    lz.aguada(sill, '#e8c08a', dens=0.6, tapa=1, irreg=0.4, sombra=(0, -6))
    lz.contorno(sill, SEP, grosor=0.9, presion=0.55, cortes=0.2)
    lz.luz((cx, cy - h * 0.28, w * 0.4), '#ffe2a0', fuerza=0.22)


ATADOS = {}


class Grupo:
    """Places a window's figures in local units, scaled by k about the
    bottom-centre of the window, so the people fill the room."""
    def __init__(self, X, bajo, k):
        self.X, self.bajo, self.k = X, bajo, k

    def p(self, dx, dy):          # dy measured upward from the sill (negative = up)
        return (self.X + dx * self.k, self.bajo + dy * self.k)

    def t(self, v):
        return v * self.k


# W1 -- a grandmother cradles a baby
X, Y, w, h = 594, 438, 152, 182
hu, si = ventana(X, Y, w, h)
G = Grupo(X, Y + h / 2, 1.22)
busto(lz, *G.p(-8, -103), G.t(25), '#6fa89e', piel='piel2', bajo=Y + h / 2, ancho=G.t(74), inclina_cuerpo=4,
      cara=dict(peinado='mono', pelo='#d8d2cc', canas=True, giro=0.35, inclina=10, ojos='abajo', boca='sonrisa'))
extremidad(lz, [G.p(-40, -51), G.p(-20, -19), G.p(30, -25)], (G.t(20), G.t(18), G.t(16)), '#6fa89e', dens=0.82)
manta = Poligono([G.p(-34, -43), G.p(-10, -61), G.p(30, -67), G.p(52, -57), G.p(50, -35), G.p(20, -25),
                  G.p(-20, -25)])
lz.aguada(manta, '#f6c8d0', dens=0.62, tapa=1, irreg=0.5, sombra=(-6, -8, '#d88a9c', 0.5))
lz.contorno(manta, '#a0606a', grosor=0.8, presion=0.5, cortes=0.25)
lz.lapiz([bezier(G.p(-20, -41), G.p(5, -51), G.p(30, -47)), bezier(G.p(-12, -31), G.p(10, -39), G.p(40, -39))],
         '#c08090', grosor=0.6, presion=0.35)
cabeza(lz, *G.p(34, -61), G.t(12), piel='piel3', pelo='#3a2620', peinado='calvo', ojos='abajo', boca='suave',
       giro=-0.4, inclina=-20)
mano(lz, *G.p(6, -55), -30, G.t(26), 'piel2', 'junta')       # her hand resting on the baby
mano(lz, *G.p(28, -27), -10, G.t(22), 'piel2', 'sujeta')
ATADOS['abuela'] = np.array(G.p(40, -31))
cierra_ventana(hu, si, X, Y, w, h)

# W2 -- two children tickling each other, laughing
X, Y, w, h = 906, 438, 152, 182
hu, si = ventana(X, Y, w, h)
G = Grupo(X, Y + h / 2, 1.22)
busto(lz, *G.p(30, -79), G.t(20), '#f0b030', piel='piel4', bajo=Y + h / 2, ancho=G.t(58), inclina_cuerpo=10,
      cara=dict(peinado='rizado', pelo='#241814', giro=-0.3, inclina=-16, ojos='cerrados', boca='ríe'))
extremidad(lz, [G.p(52, -39), G.p(62, -70), G.p(56, -96)], (G.t(13), G.t(11), G.t(10)), '#f0b030', dens=0.82)
mano(lz, *G.p(56, -96), -95, G.t(22), 'piel4', 'abierta')      # arm thrown up with laughter
busto(lz, *G.p(-28, -89), G.t(20), '#e8735e', piel='piel1', bajo=Y + h / 2, ancho=G.t(58), inclina_cuerpo=-6,
      cara=dict(peinado='coleta', pelo='#9a4a2c', giro=0.35, inclina=10, ojos='cerrados', boca='ríe'))
extremidad(lz, [G.p(-40, -29), G.p(-12, -11), G.p(14, -21)], (G.t(13), G.t(11), G.t(10)), '#e8735e', dens=0.82)
mano(lz, *G.p(14, -21), -20, G.t(20), 'piel1', 'abierta')
extremidad(lz, [G.p(-18, -41), G.p(2, -29), G.p(16, -37)], (G.t(12), G.t(10), G.t(9)), '#e8735e', dens=0.82)
mano(lz, *G.p(16, -37), -30, G.t(19), 'piel1', 'abierta')
for k in range(3):   # giggle marks
    lz.lapiz([arco(*G.p(4 + k * 7, -120 - k * 5), 4, 4, 200, 340, 8)], SEP, grosor=0.7, presion=0.45)
ATADOS['ninos'] = np.array(G.p(30, -17))
cierra_ventana(hu, si, X, Y, w, h)

# W3 -- a couple, forehead to forehead, holding hands
X, Y, w, h = 800, 626, 180, 160
hu, si = ventana(X, Y, w, h)
G = Grupo(X, Y + h / 2, 1.18)
busto(lz, *G.p(-22, -78), G.t(23), '#5f86c0', piel='piel5', bajo=Y + h / 2, ancho=G.t(66), inclina_cuerpo=-10,
      cara=dict(peinado='corto', pelo='#1a1210', giro=0.55, inclina=26, ojos='cerrados', boca='sonrisa'))
busto(lz, *G.p(21, -77), G.t(22), '#d9a441', piel='piel2', bajo=Y + h / 2, ancho=G.t(62), inclina_cuerpo=10,
      cara=dict(peinado='ondas', pelo='#7a3a22', giro=-0.55, inclina=-26, ojos='cerrados', boca='sonrisa'))
extremidad(lz, [G.p(-50, -22), G.p(-26, -14), G.p(-6, -26)], (G.t(15), G.t(13), G.t(11)), '#5f86c0', dens=0.82)
extremidad(lz, [G.p(48, -22), G.p(24, -14), G.p(6, -24)], (G.t(15), G.t(13), G.t(11)), '#d9a441', dens=0.82)
mano(lz, *G.p(-8, -24), -20, G.t(20), 'piel5', 'sujeta')
mano(lz, *G.p(8, -22), 200, G.t(20), 'piel2', 'sujeta', pulgar=-1)
ATADOS['pareja'] = np.array(G.p(2, -16))
cierra_ventana(hu, si, X, Y, w, h)

# pencil drawing of the heart, loose and broken
lz.contorno(CUERPO, MUSCULO_LP, grosor=1.3, presion=0.65, cortes=0.25, desfase=1.2)
lz.contorno(CUERPO, '#b04a3a', grosor=0.8, presion=0.35, cortes=0.5, desfase=2.5)

# ------------------------------------------------------------------ the red thread, drawn by hand
A, B, C = ATADOS['abuela'], ATADOS['pareja'], ATADOS['ninos']
hilo = spline([A, A + (30, 40), A + (90, 90), B + (-70, 40), B + (-20, 12), B, B + (30, 20),
               B + (80, -10), C + (-40, 60), C + (-6, 22), C])
lz.lapiz([hilo], HILO, grosor=1.7, presion=0.95, temblor=1.4, textura=0.4, puntas=0.05)
lz.lapiz([hilo + (0.6, 0.4)], '#8f1020', grosor=0.9, presion=0.5, temblor=1.6, cortes=0.3)
for t in (A, B, C):   # a little knot around each little finger, with two loose ends
    lz.lapiz([arco(t[0], t[1], 4.5, 3.5, 0, 340, 18), [t + (3, 3), t + (9, 10)], [t + (2, 4), t + (4, 12)]],
             HILO, grosor=1.3, presion=0.9, temblor=0.3)

# ------------------------------------------------------------------ what escapes the heart: one group each
rng = np.random.default_rng(41)
for k in range(7):   # stars rising out of the night-sea vein
    t = (k + 1) / 7
    x = 598 - t * 110 + rng.normal(0, 8)
    y = 136 - t * 90 + rng.normal(0, 6) + 14 * math.sin(t * 5)
    estrella(lz, x, y, 9 - 4 * t, rng.choice(['#f0c25e', '#4f9c9a', '#e8735e', '#8d73b0']), gouache=False)
for k in range(6):   # petals falling from the aorta's garden
    t = (k + 1) / 6
    x = 950 + t * 150 + rng.normal(0, 6) + 20 * math.sin(t * 6)
    y = 150 + t * 220 + rng.normal(0, 8)
    lz.aguada(Elipse(x, y, 8 - 2 * t, 4.5, rng.uniform(0, 180)), rng.choice(['#f08a6a', '#f6a7b8', '#c33c4e']),
              dens=0.75, irreg=0.4, borde=0.8)

lz.vineta(margen=30)
lz.guardar(SALIDA)
print('ok', SALIDA)
