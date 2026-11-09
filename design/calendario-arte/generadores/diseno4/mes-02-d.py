"""
Mes 2 -- Relaciones -- Diseño 4.

Idea: a real, muscular heart that glows from inside and IS a home. Through its
lit windows we see the people it shelters (a grandmother showing old photos to
a grandchild, a couple in a wished-for hug, a family eating together without
phones, two friends listening to each other). A red thread runs from window to
window, tied to everyone's little finger, and rises out of the heart carrying a
winged letter. The coronary vessels flower; the smoke from the great vessels
turns into birds.

    python3 mes-02-d.py [ancho_px] [salida.png|.jpg]
"""
import sys
import os
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acuarela import (Lienzo, Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla,
                      busto, mano, flor_simple, cabeza, extremidad, rgb)

ANCHO = int(sys.argv[1]) if len(sys.argv) > 1 else 1485
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'mes-02-d.png'

lz = Lienzo(ANCHO, semilla=202)

TEAL = '#4f9c9a'
TEAL_V = '#7fb5b8'
CORAL = '#e8735e'
ROSA = '#ec9f98'
CARMIN = '#c33c4e'
ORO = '#f0c25e'
HILO = '#d61f3a'

# ------------------------------------------------------------------ ground
lz.fondo(('#f6dca0', '#f3bf98'), dens=0.22, centro=(745, 440), radio=560)
# the heartbeat: concentric warm halos
for k, (rr, d) in enumerate(((420, 0.20), (350, 0.18))):
    ring = Elipse(752, 470, rr, rr * 0.98) - Elipse(752, 470, rr - 22, rr * 0.98 - 22)
    lz.aguada(ring, '#f2c06a', dens=d, suave=10, gran=0.1)
lz.luz((752, 470, 380), '#ffd889', fuerza=0.30)

# ------------------------------------------------------------------ great vessels (behind)
def vaso(pts, anchos, color, sombra, borde_lp, luzlado=1, flor=0, toques=None):
    """A great vessel with volume: wash, shadow glaze on one side, lifted
    highlight on the other, loose pencil outline."""
    f = Trazo(pts, anchos)
    lz.aguada(f, color, dens=0.58, tapa=1, flor=flor, toques=toques)
    # highlight stripe along one side
    p = np.asarray(f.p)
    tg = np.gradient(p, axis=0)
    tg /= np.maximum(np.hypot(*tg.T)[:, None], 1e-9)
    nr = np.stack([-tg[:, 1], tg[:, 0]], 1)
    off = p + nr * (f.w[:, None] * 0.22 * luzlado)
    lz.levanta(Trazo(off[::6], (anchos[0] * 0.18, anchos[-1] * 0.15), suave=True), 0.55, suave=3)
    sh = p - nr * (f.w[:, None] * 0.3 * luzlado)
    lz.aguada(Trazo(sh[::6], (anchos[0] * 0.4, anchos[-1] * 0.35)), sombra, dens=0.35, suave=5, gran=0.3)
    lz.contorno(f, borde_lp, grosor=1.0, presion=0.55, cortes=0.3)
    return f


def boca_luz(x, y, rx, ry, ang=0):
    """The open end of a vessel: instead of a dark lumen, golden light pours out."""
    e = Elipse(x, y, rx, ry, ang)
    lz.aguada(e, '#f8cf72', dens=0.55, tapa=1, irreg=0.3, toques=[(x, y, rx, '#fff1c4', 0.8)])
    lz.contorno(e, '#9c4a32', grosor=0.8, presion=0.5, cortes=0.15, desfase=0.2)
    lz.luz(e, '#fff0b8', fuerza=0.5, suave=3)


AORTA = [(718, 318), (712, 236), (735, 168), (795, 132), (858, 140), (898, 186), (914, 262), (918, 345)]
ram = [((742, 158), (730, 72), 32), ((790, 136), (794, 58), 27), ((838, 138), (858, 66), 29)]
for a, b_, w in ram:
    vaso([a, ((a[0] + b_[0]) / 2 + 2, (a[1] + b_[1]) / 2), b_], (w, w * 0.92), CORAL, CARMIN, '#9c3a32')
    boca_luz(b_[0], b_[1], w * 0.47, w * 0.17, -6 if b_[0] < 800 else 8)
vaso(AORTA, (78, 76, 72, 70, 68), CORAL, CARMIN, '#9c3a32', luzlado=-1, flor=1,
     toques=[(905, 230, 60, CARMIN, 0.7), (725, 180, 50, '#f2a07a', 0.6)])
vaso([(606, 318), (602, 230), (598, 150)], (58, 56, 54), TEAL_V, TEAL, '#3d6f73', luzlado=-1,
     toques=[(585, 250, 40, TEAL, 0.5)])
boca_luz(598, 150, 26, 9, -3)
vaso([(782, 350), (792, 282), (838, 238), (900, 222), (960, 232)], (72, 68, 60, 52, 46), TEAL_V, TEAL,
     '#3d6f73', luzlado=1, flor=1, toques=[(800, 310, 50, TEAL, 0.6)])
boca_luz(962, 233, 10, 22, 8)

# ------------------------------------------------------------------ heart body
# anterior view, tilted as a real heart: apex down and to the viewer's right
CUERPO = Poligono([(608, 300), (552, 306), (510, 350), (490, 420), (498, 492), (530, 556), (594, 630),
                   (672, 700), (760, 762), (838, 800), (884, 806), (918, 780), (958, 704), (992, 606),
                   (1006, 506), (998, 412), (972, 346), (930, 308), (872, 306), (812, 322), (752, 318),
                   (682, 302)])
lz.aguada(CUERPO, '#ea8f86', dens=0.62, borde=0.6, tapa=1, flor=2, var=0.45,
          toques=[(975, 560, 170, CARMIN, 0.75), (880, 780, 120, '#b5304a', 0.8),
                  (560, 400, 130, '#f4b08f', 0.75), (640, 660, 110, '#d9586a', 0.45)])
# second glaze: the shadow side of the muscle
lz.aguada(CUERPO, CARMIN, dens=0.3, borde=0.3, desvanece=(1010, 680, 660, 430), gran=0.4)
# light inside: lifted highlights (left, top)
lz.levanta(Elipse(560, 410, 44, 85, 15), 0.45, suave=18)
lz.levanta(Elipse(700, 350, 70, 20, -6), 0.35, suave=12)
# auricles, like little ears folded over the vessels
AUR_D = Poligono([(612, 306), (636, 270), (684, 262), (716, 286), (706, 314), (676, 336), (630, 336)])
lz.aguada(AUR_D, '#ea8c80', dens=0.6, tapa=1, toques=[(700, 310, 30, CARMIN, 0.6)])
lz.contorno(AUR_D, '#8f2a3c', grosor=0.9, presion=0.5, cortes=0.25)
lz.lapiz([spline([(640, 296), (664, 290), (690, 300)]), spline([(646, 318), (672, 312), (694, 318)])],
         '#a5324a', grosor=0.7, presion=0.35)
AUR_I = Poligono([(928, 306), (962, 288), (996, 308), (994, 342), (964, 352), (936, 336)])
lz.aguada(AUR_I, '#e3807a', dens=0.6, tapa=1, toques=[(985, 335, 25, CARMIN, 0.7)])
lz.contorno(AUR_I, '#8f2a3c', grosor=0.9, presion=0.5, cortes=0.25)

lz.luz(Elipse(700, 470, 190, 160), '#ffd9a0', fuerza=0.22, suave=60)
# muscle fibres: delicate spiralling pencil, like the grain of a wooden house
rng = np.random.default_rng(5)
fib = []
for k in range(30):
    t = k / 29
    x0 = 510 + t * 480
    p = bezier((x0 - 30, 340 + 30 * math.sin(t * 3)), (x0 + 40, 470), (x0 + 60 + 120 * (1 - t), 640),
               (860 + 30 * t, 795), 50)
    a_, b2 = rng.uniform(0.05, 0.35), rng.uniform(0.55, 0.92)
    fib.append(p[int(a_ * 50):int(b2 * 50)])
lz.lapiz(fib, '#a5324a', grosor=0.7, presion=0.2, temblor=1.0, cortes=0.3)

# interventricular groove: a soft ochre bed (the heart's fat) with vessels that flower
SURCO = [(786, 335), (800, 430), (818, 540), (838, 650), (858, 760), (866, 798)]
lz.aguada(Trazo(SURCO, (30, 26, 20, 14, 8, 4)), '#efc56e', dens=0.36, suave=5, gran=0.3)
lz.aguada(Trazo([(996, 420), (955, 398), (905, 388)], (22, 14)), '#efc56e', dens=0.33, suave=4)
lz.aguada(Trazo([(505, 470), (560, 458), (620, 452)], (18, 10)), '#efc56e', dens=0.3, suave=4)
ART = Trazo([(p[0] + 3, p[1]) for p in SURCO], (4.5, 4, 3.5, 3, 2, 1.5))
lz.aguada(ART, '#b8344a', dens=0.5, tapa=0.3, irreg=0.4)
lz.lapiz([spline([(p[0] + 3, p[1]) for p in SURCO])], '#8f2a3c', grosor=0.6, presion=0.35, cortes=0.3)
VEN = Trazo([(p[0] - 5, p[1] + 4) for p in SURCO[:-1]], (3.5, 3, 3, 2, 1.5))
lz.aguada(VEN, TEAL, dens=0.35, tapa=0.2, irreg=0.4)
# the coronary branches are a climbing vine that blossoms (light gouache flowers)
ramas = [[(810, 480), (842, 500), (866, 528)], [(842, 660), (878, 676), (900, 712)],
         [(826, 600), (790, 625), (772, 660)], [(990, 380), (980, 440), (990, 488)],
         [(556, 344), (534, 392), (540, 440)]]
for i, rp in enumerate(ramas):
    lz.lapiz([spline(rp)], '#8f2a3c', grosor=0.9, presion=0.5, temblor=0.3)
    pts = spline(rp)
    for j in (len(pts) // 3, 2 * len(pts) // 3):
        ex, ey = pts[j]
        sd = 1 if j % 2 else -1
        lz.aguada(Elipse(ex + sd * 6, ey - 2, 6, 2.8, sd * 35), '#8fae74', dens=0.75, irreg=0.3, tapa=0.8)
    ex, ey = rp[-1]
    for k in range(5):
        a_ = math.radians(k * 72 + i * 20)
        lz.gouache(Elipse(ex + math.cos(a_) * 4, ey + math.sin(a_) * 4, 3.6, 2.4, math.degrees(a_)),
                   '#fde7e2' if i % 2 else '#fff3cf', alfa=0.9, irreg=0.2)
    lz.gouache(Elipse(ex, ey, 1.8), '#e7a33e', alfa=0.95, irreg=0)

# soft modelling of the muscle: carmine hatching on the shadow side, shade under the auricles
lz.rayado(CUERPO, '#a02c40', angulo=62, sep=4.0, presion=0.26, grosor=0.8, desvanece=(1000, 700, 760, 480),
          largo=22)
lz.aguada(Poligono([(612, 318), (720, 310), (712, 345), (630, 350)]), CARMIN, dens=0.3, suave=8)
lz.aguada(Poligono([(926, 330), (996, 336), (986, 366), (936, 360)]), CARMIN, dens=0.3, suave=8)

# ------------------------------------------------------------------ windows
def ventana(cx, cy, w, h, redonda=False, maceta=False):
    """Arched window cut in the heart's wall: warm interior lit from inside."""
    if redonda:
        marco = Elipse(cx, cy, w / 2 + 9, w / 2 + 9)
        hueco = Elipse(cx, cy, w / 2, w / 2)
    else:
        def arcw(ww, hh):
            top = arco(cx, cy - hh / 2 + ww / 2, ww / 2, ww / 2, 180, 360, 30)
            return np.vstack([[[cx - ww / 2, cy + hh / 2]], top, [[cx + ww / 2, cy + hh / 2]]])
        marco = Poligono(arcw(w + 18, h + 14), suave=False)
        hueco = Poligono(arcw(w, h), suave=False)
    lz.aguada(marco, '#f7ead2', dens=0.35, tapa=1, irreg=0.5, gran=0.25,
              toques=[(cx + w * 0.3, cy + h * 0.3, w * 0.4, '#e2b07a', 0.6)])
    lz.contorno(marco, '#7c4632', grosor=1.0, presion=0.6, cortes=0.25)
    # interior: golden lamplight, a little rosier at the bottom
    lz.aguada(hueco, '#f8d27c', dens=0.45, tapa=1, irreg=0.4, borde=0.4,
              toques=[(cx, cy + h * 0.45, w * 0.6, '#f0a77a', 0.6)])
    lz.contorno(hueco, '#7c4632', grosor=0.9, presion=0.5, cortes=0.3, desfase=0.4)
    if not redonda:
        sill = Poligono([(cx - w / 2 - 16, cy + h / 2 + 2), (cx + w / 2 + 16, cy + h / 2 + 2),
                         (cx + w / 2 + 12, cy + h / 2 + 13), (cx - w / 2 - 12, cy + h / 2 + 13)], suave=False)
        lz.aguada(sill, '#e7c48e', dens=0.5, tapa=1, irreg=0.4)
        lz.contorno(sill, '#7c4632', grosor=0.9, presion=0.55, cortes=0.2)
    return hueco


def luz_ventana(hueco, cx, cy, w, h):
    """Lamplight: strongest near the top of the room, so faces keep their colour."""
    lz.luz(hueco, '#ffe3a0', fuerza=0.16, suave=6)
    lz.luz((cx, cy - h * 0.28, w * 0.45), '#ffd27a', fuerza=0.30)


ATADOS = {}   # where the red thread is tied (little fingers)

# W1 -- a grandmother shows a grandchild the photos of her lifelong friends (day 22)
X, Y, w, h = W1 = (596, 418, 116, 142)
h1 = ventana(*W1)
bajo = Y + h / 2
lz.aguada(Elipse(X + 30, Y - 40, 8, 6), '#f6c25e', dens=0.6, irreg=0.3)   # little wall lamp
busto(lz, X - 22, Y - 6, 17, '#7fb0a8', piel='piel1', bajo=bajo, ancho=48,
      cara=dict(peinado='mono', pelo='#d8d2cc', canas=True, giro=0.45, ojos='abajo', boca='sonrisa'))
busto(lz, X + 28, Y + 8, 14.5, '#f0b14f', piel='piel4', bajo=bajo, ancho=40,
      cara=dict(peinado='rizado', pelo='#3a2620', giro=-0.4, mira=(-1, 1), boca='abierta'))
# the open album on the sill, with tiny pencil photographs
ax, ay = X + 2, bajo - 4
alb_l = Poligono([(ax - 36, ay - 14), (ax, ay - 20), (ax, ay + 6), (ax - 38, ay + 10)], suave=False)
alb_r = Poligono([(ax, ay - 20), (ax + 36, ay - 14), (ax + 38, ay + 10), (ax, ay + 6)], suave=False)
for f in (alb_l, alb_r):
    lz.aguada(f, '#fbf3e3', dens=0.3, tapa=1, irreg=0.2)
    lz.contorno(f, '#7c4632', grosor=0.8, presion=0.6, cortes=0.1, desfase=0.2)
for (dx, dy, c) in ((-31, -11, '#c99a6a'), (-17, -14, '#9fb3a0'), (5, -14, '#d7a08a'), (19, -11, '#c99a6a'),
                    (-31, -1, '#d7a08a'), (19, -1, '#9fb3a0')):
    q = Poligono([(ax + dx, ay + dy), (ax + dx + 11, ay + dy - 0.5), (ax + dx + 11.5, ay + dy + 8),
                  (ax + dx + 0.5, ay + dy + 8.5)], suave=False)
    lz.aguada(q, c, dens=0.6, irreg=0.2, tapa=0.5)
    lz.contorno(q, '#7c4632', grosor=0.5, presion=0.4, cortes=0.1, desfase=0.1)
mano(lz, ax - 4, ay - 8, 20, 9, 'piel1', 'abierta')       # grandmother points at an old friend
mano(lz, ax + 40, ay + 2, 200, 8.5, 'piel4', 'sujeta')
ATADOS['nieto'] = (ax + 44, ay + 4)
luz_ventana(h1, X, Y, w, h)

# W2 -- a wished-for hug (day 25)
X, Y, w, h = W2 = (900, 412, 112, 132)
h2 = ventana(*W2)
bajo = Y + h / 2
busto(lz, X - 15, Y - 6, 16, '#5f86c0', piel='piel4', bajo=bajo, ancho=46, inclina_cuerpo=4,
      cara=dict(peinado='corto', pelo='#241814', giro=0.35, inclina=12, ojos='cerrados', boca='sonrisa'))
busto(lz, X + 17, Y - 4, 15, '#f08a6a', piel='piel2', bajo=bajo, ancho=42, inclina_cuerpo=-4,
      cara=dict(peinado='ondas', pelo='#9a4a2c', giro=-0.4, inclina=-12, ojos='cerrados', boca='sonrisa'))
extremidad(lz, [(X - 30, Y + 40), (X, Y + 26), (X + 34, Y + 22)], (12, 11, 10), '#5f86c0', dens=0.62)
mano(lz, X + 36, Y + 22, -20, 9.5, 'piel4', 'abierta')
mano(lz, X - 22, Y + 30, 200, 9, 'piel2', 'abierta')
ATADOS['pareja'] = (X - 26, Y + 34)
luz_ventana(h2, X, Y, w, h)

# W3 -- dinner together, phones away (day 8)
X, Y, w, h = W3 = (695, 580, 168, 116)
h3 = ventana(*W3)
mesa_y = Y + 34
busto(lz, X - 44, Y - 15, 14, '#e2a34a', piel='piel2', bajo=mesa_y + 4, ancho=40,
      cara=dict(peinado='corto', pelo='#5a3a2a', barba='#5a3a2a', giro=0.4, boca='abierta'))
busto(lz, X + 2, Y, 12, '#e8735e', piel='piel3', bajo=mesa_y + 4, ancho=32,
      cara=dict(peinado='coleta', pelo='#2e1e18', giro=0.0, ojos='cerrados', boca='abierta'))
busto(lz, X + 46, Y - 15, 14, '#a99bcb', piel='piel3', bajo=mesa_y + 4, ancho=40,
      cara=dict(peinado='pañuelo', pelo=TEAL, giro=-0.4, boca='sonrisa'))
mesa = Poligono([(X - 80, mesa_y), (X + 80, mesa_y), (X + 84, Y + h / 2 + 1), (X - 84, Y + h / 2 + 1)],
                suave=False)
lz.aguada(mesa, '#fbf1e0', dens=0.35, tapa=1, irreg=0.4, toques=[(X, Y + h / 2, 60, '#e9c08c', 0.5)])
lz.rayado(mesa, '#c25a4a', angulo=0, sep=5, presion=0.3, grosor=0.7)
lz.rayado(mesa, '#c25a4a', angulo=90, sep=5, presion=0.3, grosor=0.7)
for bx in (X - 42, X + 2, X + 44):
    by = mesa_y - 3
    b2 = Poligono(np.vstack([arco(bx, by, 11, 4, 180, 360, 12), arco(bx, by, 11, 9, 0, 180, 12)]), suave=False)
    lz.aguada(b2, TEAL, dens=0.55, tapa=1, irreg=0.3)
    lz.contorno(b2, '#2f6467', grosor=0.7, presion=0.5)
    lz.lapiz([spline([(bx - 3, by - 8), (bx - 6, by - 16), (bx - 2, by - 23), (bx - 5, by - 31)])],
             '#c9a27a', grosor=0.7, presion=0.3)
lz.aguada(Elipse(X - 20, mesa_y - 2, 10, 5, -10), '#d9964c', dens=0.7, tapa=1, irreg=0.3)   # bread
mano(lz, X - 28, mesa_y - 4, 10, 8, 'piel2', 'sujeta')       # father passes the bread
mano(lz, X + 22, mesa_y - 2, 170, 8, 'piel3', 'abierta')
ATADOS['familia'] = (X + 14, mesa_y + 2)
luz_ventana(h3, X, Y, w, h)

# W4 -- round window: a friend talks, the other really listens (day 3)
X, Y, w = W4 = (920, 590, 98)
h4 = ventana(X, Y, w, w, redonda=True)
bajo = Y + w / 2
busto(lz, X - 21, Y - 2, 13.5, '#d9a441', piel='piel5', bajo=bajo, ancho=36,
      cara=dict(peinado='calvo', pelo='#2a1a14', giro=0.4, boca='abierta'))
busto(lz, X + 22, Y - 4, 13.5, '#98b38a', piel='piel1', bajo=bajo, ancho=36,
      cara=dict(peinado='largo', pelo='#e0b060', giro=-0.45, inclina=-8, boca='suave', mira=(-1, 0)))
mano(lz, X - 6, Y + 20, -60, 8, 'piel5', 'abierta')       # the talking friend gestures
for tx in (X - 12, X + 14):
    t = Poligono([(tx - 6, Y + 32), (tx + 6, Y + 32), (tx + 5, Y + 42), (tx - 5, Y + 42)], suave=False)
    lz.aguada(t, '#fbf1e0', dens=0.4, tapa=1, irreg=0.2)
    lz.contorno(t, '#7c4632', grosor=0.6, presion=0.5)
mano(lz, X + 24, Y + 36, 190, 8, 'piel1', 'sujeta')
ATADOS['amigos'] = (X + 24, Y + 38)
luz_ventana(h4, X, Y, w, w)

# a little front door, ajar, with lamplight spilling onto the step and a sleeping cat
X, Y = 772, 688
puerta = Poligono(np.vstack([[[X - 17, Y + 26]], arco(X, Y - 8, 17, 17, 180, 360, 20), [[X + 17, Y + 26]]]),
                  suave=False)
lz.aguada(puerta.__class__(np.vstack([[[X - 23, Y + 28]], arco(X, Y - 8, 23, 23, 180, 360, 20),
                                      [[X + 23, Y + 28]]]), suave=False),
          '#f7ead2', dens=0.35, tapa=1, irreg=0.4)
lz.aguada(puerta, '#f8d27c', dens=0.5, tapa=1, irreg=0.3, toques=[(X, Y + 20, 20, '#f2a77a', 0.5)])
hoja = Poligono([(X - 17, Y + 26), (X - 17, Y - 10), (X - 6, Y - 20), (X - 4, Y + 30)], suave=False)
lz.aguada(hoja, '#5f9c96', dens=0.6, tapa=1, irreg=0.3)
lz.contorno(hoja, '#2f6467', grosor=0.8, presion=0.5)
lz.contorno(puerta, '#7c4632', grosor=0.9, presion=0.55, cortes=0.15)
lz.luz(puerta, '#ffe3a0', fuerza=0.35, suave=5)
escalon = Poligono([(X - 30, Y + 27), (X + 30, Y + 27), (X + 34, Y + 36), (X - 34, Y + 36)], suave=False)
lz.aguada(escalon, '#e7c48e', dens=0.5, tapa=1, irreg=0.4)
lz.contorno(escalon, '#7c4632', grosor=0.8, presion=0.5)
lz.aguada(Elipse(X, Y + 38, 34, 4), '#ffe3a0', dens=0.0)
lz.luz(Poligono([(X - 6, Y + 27), (X + 17, Y + 27), (X + 30, Y + 50), (X - 2, Y + 50)]), '#ffe3a0', fuerza=0.3,
       suave=6)
gato = Poligono([(X + 6, Y + 26), (X + 8, Y + 17), (X + 16, Y + 14), (X + 24, Y + 16), (X + 28, Y + 12),
                 (X + 30, Y + 18), (X + 29, Y + 26)])
lz.aguada(gato, '#e0a35a', dens=0.65, tapa=1, irreg=0.3)
lz.contorno(gato, '#8a4a2e', grosor=0.7, presion=0.55, cortes=0.1, desfase=0.2)
lz.lapiz([arco(X + 25, Y + 20, 2, 1, 20, 160, 8), spline([(X + 6, Y + 25), (X - 2, Y + 24), (X - 4, Y + 18)])],
         '#5e3f30', grosor=0.6, presion=0.6, temblor=0.05)
for dx in (-26, 26):   # two flower pots
    mac = Poligono([(X + dx - 5, Y + 16), (X + dx + 5, Y + 16), (X + dx + 4, Y + 27), (X + dx - 4, Y + 27)],
                   suave=False)
    lz.aguada(mac, '#c0703f', dens=0.6, tapa=1, irreg=0.3)
    lz.aguada(Circulos([(X + dx - 3, Y + 12, 4), (X + dx + 3, Y + 11, 4), (X + dx, Y + 7, 4)]), '#86a86c',
              dens=0.7, tapa=1, irreg=0.4)
    lz.gouache(Elipse(X + dx, Y + 7, 1.8), '#fde7e2', alfa=0.9, irreg=0)

# pencil drawing of the heart, loose and broken
lz.contorno(CUERPO, '#8f2a3c', grosor=1.2, presion=0.6, cortes=0.25, desfase=1.2)
lz.contorno(CUERPO, '#b04a3a', grosor=0.8, presion=0.35, cortes=0.5, desfase=2.5)

# ------------------------------------------------------------------ light that becomes birds
# golden light pours out of the great vessels and turns into birds
PLUMAS = [((730, 72), (700, 50)), ((794, 58), (790, 20)), ((858, 66), (935, 62)), ((598, 150), (530, 96))]
for (bx, by), (tx, ty) in PLUMAS:
    pl = Trazo(bezier((bx, by - 4), (bx, by - 40), (tx * 0.6 + bx * 0.4, ty + 30), (tx, ty), 30), (20, 30, 8))
    lz.aguada(pl, '#f2c25e', dens=0.4, suave=7, gran=0.05)
    lz.luz(pl, '#fff0c0', fuerza=0.35, suave=8)
    lz.chispas((bx + tx) / 2, (by + ty) / 2, 22, 30, n=6, tam=(0.7, 1.6))
def pajaro(x, y, s, col, alas_arriba=True):
    cuerpo = Poligono([(x - s, y), (x - s * 0.2, y - s * 0.35), (x + s * 0.9, y - s * 0.15),
                       (x + s * 1.25, y - s * 0.3), (x + s * 0.85, y + s * 0.12), (x - s * 0.1, y + s * 0.3)])
    if alas_arriba:
        ala = Poligono([(x - s * 0.2, y - s * 0.2), (x - s * 0.7, y - s * 1.2), (x + s * 0.35, y - s * 0.95),
                        (x + s * 0.35, y - s * 0.15)])
    else:
        ala = Poligono([(x - s * 0.2, y), (x - s * 0.5, y + s * 0.9), (x + s * 0.35, y + s * 0.7),
                        (x + s * 0.35, y + s * 0.05)])
    lz.collage(cuerpo, col, sombra=1.2)
    lz.collage(ala, mezcla(col, '#ffffff', 0.3), sombra=1.2)
    lz.lapiz([[(x + s * 0.9, y - s * 0.1), (x + s * 0.95, y - s * 0.08)]], '#3a2a24', grosor=1.3, presion=0.9)
    lz.contorno(cuerpo | ala, _lp(col), grosor=0.6, presion=0.4, cortes=0.4, desfase=0.3)


def _lp(c):
    return tuple((rgb(c) * 0.5).tolist())


pajaro(684, 44, 22, TEAL)
pajaro(950, 60, 20, CORAL, False)
pajaro(512, 98, 19, '#e7a33e')

# ------------------------------------------------------------------ the red thread
A, Fm, N, P = ATADOS['amigos'], ATADOS['familia'], ATADOS['nieto'], ATADOS['pareja']
hilo = spline([A, (A[0] - 40, A[1] + 34), (Fm[0] + 60, Fm[1] + 36), Fm,
               (Fm[0] - 80, Fm[1] + 8), (N[0] - 30, N[1] + 70), N,
               (N[0] + 90, N[1] + 34), (P[0] - 90, P[1] + 40), P,
               (P[0] + 80, P[1] + 30), (1052, 380), (1050, 250), (1080, 160), (1118, 116)])
lz.luz(Trazo(hilo, (16,)), '#ffb0a0', fuerza=0.22, suave=7)
lz.aguada(Trazo(hilo, (4.6, 4.2, 3.6)), HILO, dens=1.0, irreg=0.25, borde=0.3, tapa=0.7)
lz.lapiz([hilo], '#8f1f30', grosor=0.8, presion=0.55, temblor=0.4)
for (tx, ty) in ATADOS.values():   # a little knot around each finger
    lz.lapiz([arco(tx, ty, 4.2, 3.2, 0, 330, 16)], '#8f1f30', grosor=1.0, presion=0.8, temblor=0.1)
# the winged letter it carries (day 2: write to someone you have not spoken to in a long time)
sobre = Poligono([(1112, 94), (1162, 86), (1168, 122), (1116, 128)], suave=False)
for sd in (-1, 1):
    # a feathered wing with three scallops
    cx0 = 1140 + sd * 14
    ala = Poligono([(cx0, 100), (cx0 + sd * 20, 70), (cx0 + sd * 48, 56), (cx0 + sd * 62, 60),
                    (cx0 + sd * 50, 70), (cx0 + sd * 56, 76), (cx0 + sd * 42, 84), (cx0 + sd * 44, 92),
                    (cx0 + sd * 26, 98)])
    lz.collage(ala, '#f6b6b0' if sd < 0 else '#f3d79a', sombra=1.2)
    lz.contorno(ala, '#9c4a32', grosor=0.6, presion=0.45, cortes=0.2, desfase=0.3)
    lz.lapiz([spline([(cx0 + sd * 6, 94), (cx0 + sd * 26, 80), (cx0 + sd * 46, 66)])], '#9c4a32', grosor=0.5,
             presion=0.3)
lz.collage(sobre, '#f6ead6', dens=0.25, sombra=1.6)
lz.lapiz([[(1113, 95), (1140, 112), (1162, 87)]], '#7c4632', grosor=0.8, presion=0.6, temblor=0.2)
lz.contorno(sobre, '#7c4632', grosor=0.8, presion=0.55, cortes=0.1, desfase=0.3)
lz.aguada(Elipse(1140, 111, 4.5, 4), HILO, dens=0.9, irreg=0.2)   # wax seal
lz.luz((1140, 105, 50), '#ffe2a0', fuerza=0.3)

# ------------------------------------------------------------------ magic in the air
lz.chispas(752, 450, 400, 360, n=36, semilla=77)
rng = np.random.default_rng(9)
for k in range(9):
    a = rng.uniform(0, 2 * np.pi)
    x, y = 752 + math.cos(a) * rng.uniform(330, 470), 460 + math.sin(a) * rng.uniform(260, 360)
    lz.aguada(Elipse(x, y, 7, 4.2, rng.uniform(0, 180)), '#f2a0a0', dens=0.55, irreg=0.4)
# pulse lines either side
for sd in (-1, 1):
    for k in range(3):
        r = 300 + k * 18
        a0, a1 = (160, 200) if sd < 0 else (-20, 20)
        lz.lapiz([arco(752, 470, r + 140, r, a0, a1, 20)], '#c0703f', grosor=0.9, presion=0.4 - 0.08 * k,
                 temblor=0.6)

lz.vineta(margen=30)
lz.guardar(SALIDA)
print('ok', SALIDA)
