"""Mes 10 · Alimentación · Diseño 3 (ronda 2): un único plato roto en dos.
LUZ (izquierda): la hortelana ofrece su cosecha mirando al espectador; huerta al sol; en su mitad del plato, comida de temporada que humea.
SOMBRA (derecha): la otra mitad del plato, casi vacía: un gran envoltorio de plástico brillante y una mancha de grasa;
detrás, el contenedor del que se desborda comida gris y mustia, tirada."""
import sys, math
sys.path.insert(0, '/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos3/gen')
from figura import *

C = lienzo(1010)
r = C.r
OUT_SVG = '/home/claude/humanity-wiki/design/calendario-arte/ilustraciones-fuente/mes-10-c.svg'
OUT_PNG = '/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos3/mes-10-c.png'

MX = 742
HZ = 410          # horizon
TY = 585          # far edge of the table
PX, PY, PRX, PRY = 742, 712, 440, 132   # plate

# ================= SKY: warm morning / smog =================
sky = C.lg([(0, '#fff2d4'), (0.3, '#f8dca4'), (0.42, '#f0cc98'), (0.58, '#a8a68a'), (0.72, '#8a8c74'), (1, '#6e7062')], 0, 0, W, 0)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{sky})"/>')
C.glow(150, 120, 520, '#fff8dc', 0.75)
ball(C, 150, 120, 58, '#fffef4', '#ffe8a0', '#f8c060', k=10, rough='roughf')
for (x, y, rx, ry, op) in [(430, 90, 200, 26, 0.45), (300, 210, 160, 18, 0.35), (610, 160, 120, 16, 0.3)]:
    softell(C, x, y, rx, ry, '#fffaf0', op, ry * 0.7)
for (x, y, rx, ry, col, op) in [(1100, 90, 360, 60, '#5a5a4c', 0.45), (1350, 230, 260, 50, '#4a4c42', 0.5), (950, 250, 220, 40, '#7a7a64', 0.4),
                                (1250, 360, 300, 40, '#9a9478', 0.35)]:
    softell(C, x, y, rx, ry, col, op, ry * 0.8)
C.glow(1330, 140, 160, '#d8d0a0', 0.3)
C.ell(1330, 140, 34, 34, '#d0ccb0', 0.5, f' filter="url(#{C.blur(4)})"')

# ================= LEFT: hills and the vegetable garden =================
for (yb, amp, cols) in [(HZ - 18, 26, ('#c8d4a0', '#9ab07a', '#6a8a5a')), (HZ - 4, 16, ('#b4c884', '#7c9a50', '#4a6a30'))]:
    x0, x1 = -20, MX + 120
    pts = [(x0, yb + 20)]
    for k in range(9):
        x = x0 + k * (x1 - x0) / 8
        pts.append((x, yb - amp * (0.5 + 0.5 * math.sin(k * 1.3 + yb))))
    pts += [(x1, yb + 40), (x1, TY + 10), (x0, TY + 10)]
    C.shaded(smooth_d(pts, 4), *cols, (x0, yb - amp, x1, TY), light=(-0.8, -0.5), k=14, hl=False)
for (tx, ty, s) in [(70, HZ - 6, 1.0), (650, HZ + 2, 0.75)]:
    C.brush([(tx, ty + 30 * s), (tx + 2, ty)], 7 * s, '#5a3a20', 1, tin=0, tout=0.2)
    foliage(C, [(tx, ty - 24 * s, 34 * s, 26 * s)], ['#d8e890', '#8ab050', '#4a7a30', '#2a4a20'], 70, [0, 45, 90, 135, 180], L=(6, 10), wid=(2, 3))
soil = C.lg([(0, '#a07850'), (1, '#6a4a2a')], 0, HZ, 0, TY)
C.path(f"M-20 {HZ+6}L{MX+20} {HZ+6}L{MX+20} {TY+10}L-20 {TY+10}Z", f'url(#{soil})')
for i in range(6):
    t = i / 5
    y = HZ + 16 + (TY - HZ - 30) * t ** 1.4
    sc = 0.55 + t * 1.25
    C.brush([(-20, y + 6 * sc), (MX + 20, y + 6 * sc)], 5 * sc, '#5a3a1e', 0.5, tin=0, tout=0)
    C.brush([(-20, y + 2 * sc), (MX + 20, y + 2 * sc)], 3 * sc, '#c8a070', 0.4, tin=0, tout=0)
    kind = i % 3
    n = int(15 - i * 1.8)
    for k in range(n):
        x = -10 + (k + (i % 2) * 0.5) * (MX + 10) / n + r.uniform(-6, 6)
        if 150 < x < 500 and i > 1:
            continue  # leave room for the gardener
        if x > MX - 10:
            continue
        if kind == 0:   # lettuce heads
            for j in range(5):
                a = -90 + (j - 2) * 34
                C.path(leaf_d(x, y, 16 * sc, 9 * sc, a), r.choice(['#5aa040', '#7ab850', '#4a8a34']), 0.95)
            ball(C, x, y - 5 * sc, 7 * sc, '#e8f8b0', '#8ac85a', '#2a5a1a', k=2 * sc, rough=None)
        elif kind == 1:  # tomato plants with red fruit
            C.brush([(x, y), (x + 1, y - 34 * sc)], 2.5 * sc, '#6a8a30', 0.9, tin=0, tout=0.1)
            foliage(C, [(x, y - 22 * sc, 12 * sc, 16 * sc)], ['#c8e080', '#6a9a3a', '#2a5a1a'], 14, [60, 120, 30, 150], L=(5 * sc, 8 * sc), wid=(1.5 * sc, 2.5 * sc), under=False)
            for j in range(3):
                ball(C, x + r.uniform(-8, 8) * sc, y - r.uniform(10, 30) * sc, 4.2 * sc, '#ffb090', '#e02a18', '#6a0a06', k=1.2 * sc, rough=None)
        else:            # chard
            for j in range(5):
                a = -90 + (j - 2) * 22
                C.path(leaf_d(x, y, 22 * sc, 7 * sc, a), r.choice(['#4a8a3a', '#5a9a40', '#3a6a2a']), 0.95)
                C.line([(x, y), (x + math.cos(math.radians(a)) * 14 * sc, y + math.sin(math.radians(a)) * 14 * sc)], 1.3 * sc, '#e86a6a' if j % 2 else '#f0f0c0', 0.8)

# ================= RIGHT: a dead grey field =================
mono = C.lg([(0, '#8a866a'), (1, '#5a5644')], 0, HZ, 0, TY)
C.path(f"M{MX-20} {HZ+4}L1505 {HZ+4}L1505 {TY+10}L{MX-20} {TY+10}Z", f'url(#{mono})')
C.path(f"M{MX-20} {HZ-6}L1505 {HZ-10}L1505 {HZ+8}L{MX-20} {HZ+8}Z", '#8a8a6a', 0.9, f' filter="url(#{C.blur(3)})"')
VPR = (1180, HZ - 4)
for k in range(-24, 26):
    p0 = (VPR[0] + k * 2.5, HZ + 4)
    p1 = (VPR[0] + k * 70, TY + 10)
    C.line([p0, p1], 1 + abs(k) * 0.08, '#3a3828', 0.5)

# ================= RIGHT: the dumpster, food thrown away and rotting =================
DX0, DX1, DT = 1080, 1400, 392
HX = (DX0 + DX1) / 2
C.shadow(HX + 20, TY - 4, 180, 14, 0.5)
body = [(DX0, DT), (DX1, DT - 6), (DX1 - 14, TY + 40), (DX0 + 12, TY + 40)]
pid, cid = C.shaded(poly_d(body), '#56665e', '#2a3630', '#0c1210', bbox(body), light=(-0.6, -0.5), k=30, rough='roughf')
C.clip_open(cid)
for k in range(6):
    x = DX0 + 34 + k * 50
    C.brush([(x, DT + 10), (x - 1, TY + 40)], 10, '#141c18', 0.6, tin=0, tout=0)
    C.brush([(x - 6, DT + 10), (x - 7, TY + 40)], 3, '#6a7a72', 0.35, tin=0, tout=0)
for k in range(22):
    C.ell(r.uniform(DX0, DX1), r.uniform(DT + 20, TY + 30), r.uniform(4, 14), r.uniform(2, 6), r.choice(['#4a3a20', '#141410']), 0.35)
# grime streaks running down from the rim
for k in range(9):
    x = r.uniform(DX0 + 20, DX1 - 20)
    C.brush([(x, DT + 4), (x + r.uniform(-3, 3), DT + r.uniform(40, 120))], r.uniform(3, 7), '#4a4228', 0.45, tin=0, tout=0.8)
C.close()
C.brush([(DX0 - 4, DT + 2), (DX1 + 4, DT - 4)], 10, '#1e2622', 1, tin=0, tout=0)
C.brush([(DX0 - 4, DT - 1), (DX1 + 4, DT - 7)], 3, '#6a7a72', 0.6, tin=0, tout=0)
# the heap: grey, wilted, mouldy
heap = [(DX0 + 4, DT + 4), (DX0 + 40, DT - 30), (HX - 60, DT - 60), (HX, DT - 72), (HX + 70, DT - 60), (DX1 - 30, DT - 26), (DX1, DT - 2)]
C.path(smooth_d(heap, 4), '#24241c', 0.95)
ROT = {'bread': ('#d8b888', '#9a7a50', '#40301c'), 'apple': ('#a08068', '#6a4a36', '#241610'), 'banana': ('#8a7a40', '#4a3a1a', '#1a1408'),
       'lettuce': ('#a8aa80', '#6a6c48', '#2a2c1c'), 'orange': ('#b8a070', '#7a6438', '#2e2410')}


def rotten(x, y, kind, rot=0):
    c = ROT[kind]
    if kind in ('apple', 'orange'):
        ball(C, x, y, 13, c[0], c[1], c[2], k=3.5, rough=None)
        C.ell(x + 3, y + 2, 7, 6, '#3a2014', 0.7, f' filter="url(#{C.blur(1.5)})"')
        C.ell(x - 3, y - 5, 4, 3, '#8a9070', 0.6, f' filter="url(#{C.blur(1.2)})"')
        C.line([(x, y - 12), (x + 2, y - 18)], 1.6, '#2a1a08')


def loaf_r(x, y, rot, L_=1.0):
    """A whole country loaf / baguette gone stale and mouldy."""
    C.a(f'<g transform="rotate({f(rot)} {f(x)} {f(y)}) scale({L_}) translate({f(x*(1-L_)/L_)} {f(y*(1-L_)/L_)})">')
    blob(C, [(x - 46, y + 6), (x - 38, y - 14), (x + 38, y - 16), (x + 48, y + 2), (x + 34, y + 14), (x - 34, y + 14)], '#d8b888', '#9a7a50', '#40301c', k=6, rough=None)
    for j in range(4):
        C.brush([(x - 30 + j * 18, y - 12), (x - 22 + j * 18, y + 2)], 4, '#e8d0a0', 0.6, tin=0.2, tout=0.2)
    for j in range(3):
        mx_, my_ = x + r.uniform(-30, 26), y + r.uniform(-8, 6)
        C.ell(mx_, my_, r.uniform(8, 12), r.uniform(4, 6), '#6a7a58', 0.75, f' filter="url(#{C.blur(1.6)})"')
        C.ell(mx_ + 1, my_ - 1, r.uniform(3, 5), r.uniform(2, 3), '#b0b89a', 0.5, f' filter="url(#{C.blur(1.2)})"')
    C.a('</g>')


def bunch(x, y, rot):
    """A bunch of blackened bananas."""
    C.a(f'<g transform="rotate({f(rot)} {f(x)} {f(y)})">')
    for j in range(4):
        a0 = -0.5 + j * 0.3
        pts = [(x, y), (x + math.cos(a0) * 34, y + 20 + math.sin(a0) * 10), (x + math.cos(a0) * 60, y + 46 + j * 4)]
        C.path(taper_d(pts, 22, 10), '#2a1e0a')
        C.path(taper_d(pts, 13, 5), '#7a6430', 0.85)
        for q in range(3):
            px_, py_ = lerp(pts[1], pts[2], q * 0.4)
            C.ell(px_, py_, 3, 2, '#120c04', 0.85)
    C.brush([(x - 4, y - 6), (x, y + 4)], 6, '#2a1e0a', 1)
    C.a('</g>')


def cabbage_w(x, y):
    """A wilted cabbage, outer leaves yellowed and limp."""
    for j in range(6):
        a = 200 + j * 28
        C.path(leaf_d(x, y + 6, 40, 22, a), '#a8a070' if j % 2 else '#8a8a5a', 0.95)
    ball(C, x, y - 2, 22, '#c8c8a0', '#8a9068', '#3a3e24', k=7, rough='roughf')
    C.ell(x + 8, y + 4, 8, 5, '#4a3a20', 0.6, f' filter="url(#{C.blur(1.5)})"')


# pile them up, back to front
for (x, y, rot, sc) in [(HX - 90, DT - 40, -12, 1.2), (HX + 40, DT - 58, 10, 1.25), (HX + 120, DT - 30, -20, 1.15)]:
    loaf_r(x, y, rot, sc)
cabbage_w(HX - 30, DT - 44)
for (x, y) in [(HX + 80, DT - 34), (HX - 130, DT - 14), (HX + 10, DT - 20), (HX - 60, DT - 6), (HX + 150, DT - 4)]:
    rotten(x, y, 'apple')
rotten(HX - 4, DT - 4, 'orange')
loaf_r(HX + 60, DT - 6, 4, 1.15)
# a baguette sticking out, a banana bunch hanging over the rim
loaf_r(HX - 150, DT - 50, -55, 1.3)
bunch(DX1 - 50, DT - 14, 40)
# food sliding off the rim and down the front
rotten(DX0 + 8, DT + 2, 'apple')
# flies
for k in range(12):
    x, y = r.uniform(DX0 + 20, DX1), r.uniform(DT - 150, DT - 70)
    C.ell(x, y, 2.4, 1.6, '#0a0a08', 0.9)
    C.ell(x - 1.5, y - 2, 2.2, 1.1, '#e8f0ff', 0.45)
# stench haze
softell(C, HX, DT - 100, 180, 50, '#8a8a5a', 0.25, 24)

# ================= THE GARDENER (LUZ) =================
GX, GY, GR = 326, 318, 56
SKG = SK['brown']
CL = ('#f4b48a', '#c8643a', '#6a2414', '#2a0c06')
sl, sr = cuello_torso(C, GX, GY, GR, SKG, CL, TY + 20, sw=1.68, waist=0.95)
# forearms come forward to hold the basket out
brazo2(C, sl, (GX - 130, GY + 205), (GX - 96, TY - 30), GR, CL, SKG, sleeve='elbow')
brazo2(C, sr, (GX + 130, GY + 205), (GX + 98, TY - 30), GR, CL, SKG, sleeve='elbow')
cabeza(C, GX, GY, GR, SKG, HAIR['black'], facing=0.08, tilt=-4, eyes='look', gaze=(-0.05, 0.0), style='bun', smile=0.5)

# ================= TABLE (only a strip) =================
tab = C.lg([(0, '#c8925a'), (0.5, '#a8743e'), (1, '#7a4e26')], 0, TY, 0, H)
C.path(f"M-20 {TY}L1505 {TY}L1505 870L-20 870Z", f'url(#{tab})')
for k in range(6):
    y = TY + 12 + k * 18 + k * k * 4
    C.brush([(-20, y), (700, y + r.uniform(-2, 2)), (1505, y)], 2.4, '#4a2a12', 0.45, tin=0, tout=0)
    C.brush([(-20, y + 3), (1505, y + 3)], 1.4, '#f0c890', 0.25, tin=0, tout=0)
for k in range(30):
    y = r.uniform(TY + 8, 850); x = r.uniform(-20, 1400)
    C.brush([(x, y), (x + 60, y + r.uniform(-1, 1)), (x + 140, y)], r.uniform(1, 2.2), '#5a3416', 0.25, tin=0.3, tout=0.3)
C.brush([(-20, TY + 1), (1505, TY + 1)], 3, '#f8d8a0', 0.6, tin=0, tout=0)
# a mouldy loaf and a brown banana fallen onto the dark end of the table


# ================= BASKET of the harvest, held out =================
BX, BY = GX + 2, TY - 22
C.shadow(BX + 18, TY + 14, 150, 14, 0.5)
for (dx, dy, kind) in [(-84, -50, 'leaf'), (-50, -66, 'leaf'), (66, -56, 'carrot'), (90, -44, 'carrot'),
                       (-54, -30, 'tom'), (-18, -40, 'tom'), (14, -44, 'pepper'), (44, -32, 'tom'), (76, -22, 'aub'), (-96, -20, 'onion')]:
    x, y = BX + dx, BY + dy
    if kind == 'leaf':
        for j in range(4):
            a = -110 + j * 18 + dx * 0.2
            C.path(leaf_d(x, y + 10, 64, 26, a), '#3a7a2a')
            C.path(leaf_d(x, y + 10, 58, 15, a), '#6aaa48', 0.9)
            C.line([(x, y + 10), (x + math.cos(math.radians(a)) * 52, y + 10 + math.sin(math.radians(a)) * 52)], 2.6, '#e8484a', 0.85)
    elif kind == 'carrot':
        a = math.radians(-70 + dx * 0.3)
        for j in range(3):
            C.path(leaf_d(x + math.cos(a) * 60, y + 34 + math.sin(a) * 60, 30, 8, math.degrees(a) + (j - 1) * 30), '#5a9a3a', 0.95)
        C.brush([(x, y + 34), (x + math.cos(a) * 30, y + 34 + math.sin(a) * 30), (x + math.cos(a) * 62, y + 34 + math.sin(a) * 62)], 4, '#4a8a2a', 1, tin=0, tout=0.5)
        C.path(taper_d([(x - 4, y + 44), (x + 6, y + 10), (x + 12, y - 16)], 16, 6), '#ec7418')
    elif kind == 'tom':
        ball(C, x, y, 19, '#ffc0a0', '#e0301c', '#5a0806', k=5, rough=None)
        for j in range(5):
            C.path(leaf_d(x, y - 17, 10, 3, j / 5 * 360), '#2a6a1a')
    elif kind == 'pepper':
        blob(C, [(x - 15, y - 13), (x + 15, y - 15), (x + 17, y + 11), (x, y + 24), (x - 17, y + 11)], '#fff0a0', '#f0b81c', '#7a4a04', k=5, rough=None)
        C.brush([(x, y - 15), (x + 2, y - 26)], 4, '#3a6a1a')
    elif kind == 'aub':
        C.a(f'<g transform="rotate(20 {f(x)} {f(y)})">')
        blob(C, [(x - 28, y), (x - 6, y - 13), (x + 24, y - 11), (x + 30, y + 4), (x + 4, y + 13), (x - 26, y + 9)], '#c8a8e0', '#5a2a7a', '#1a0626', k=5, rough=None)
        C.path(leaf_d(x - 28, y, 15, 6, 180), '#4a7a2a')
        C.a('</g>')
    else:
        ball(C, x, y, 15, '#fff0d8', '#d8a878', '#6a3a1a', k=4, rough=None)
        C.brush([(x, y - 13), (x + 2, y - 28)], 3, '#7a9a4a', 0.9, tin=0, tout=0.6)
bk = [(BX - 128, BY - 24), (BX + 128, BY - 24), (BX + 108, BY + 36), (BX - 108, BY + 36)]
pid, cid = C.shaded(smooth_d(bk, 3), '#f0cc88', '#b88440', '#5a3410', bbox(bk), light=(-0.7, -0.5), k=18, rough='roughf')
C.clip_open(cid)
for row in range(7):
    y = BY - 20 + row * 9.5
    for k in range(24):
        x = BX - 130 + k * 11 + (row % 2) * 5.5
        C.brush([(x - 6, y + 2), (x, y - 1.5), (x + 6, y + 2)], 6, '#e8c07a' if k % 2 else '#c89048', 0.75, tin=0.2, tout=0.2)
        C.brush([(x - 4, y - 0.5), (x + 3, y - 1.5)], 1.6, '#fff0c8', 0.5)
for k in range(13):
    x = BX - 120 + k * 20
    C.line([(x, BY - 22), (x - (x - BX) * 0.12, BY + 36)], 2, '#6a3e14', 0.45)
C.close()
C.ell(BX, BY - 24, 130, 9, '#d8a860', 1, ' filter="url(#roughf)"')
C.ell(BX, BY - 26, 126, 4, '#fff0c0', 0.6)
# hands holding the basket by its sides
mano(C, GX - 96, TY - 30, GR * 1.25, 60, SKG, thumb=1, curl=0.5)
mano(C, GX + 98, TY - 30, GR * 1.25, 120, SKG, thumb=-1, curl=0.5)

# ================= THE PLATE, broken in two =================
C.shadow(PX + 30, PY + 26, PRX * 1.02, PRY * 0.9, 0.55, '#24140a')
plate_d = ellp(PX, PY, PRX, PRY)
well_d = ellp(PX, PY + 6, PRX * 0.74, PRY * 0.72)
# the break: an irregular crack across the plate
CRACK = [(MX + 6, PY - PRY - 20), (MX - 8, PY - 90), (MX + 10, PY - 40), (MX - 4, PY + 10), (MX + 12, PY + 60), (MX - 2, PY + 110), (MX + 8, PY + PRY + 30)]
clL = C.id('c'); C.defs.append(f'<clipPath id="{clL}"><path d="{poly_d([(-20, 0)] + [(MX + 6, 0)] + CRACK + [(MX + 8, H + 20), (-20, H + 20)])}"/></clipPath>')
clR = C.id('c'); C.defs.append(f'<clipPath id="{clR}"><path d="{poly_d([(W + 20, 0), (MX + 6, 0)] + CRACK + [(MX + 8, H + 20), (W + 20, H + 20)])}"/></clipPath>')
DXR, DYR, ROTR = 22, 16, 3.5   # the right half has slid away and tilted
for (clip, cols, ring, tr) in [(clL, ('#fffaf0', '#f0e2c8', '#b8a080'), '#d8a040', ''),
                               (clR, ('#c8ccc8', '#9a9e9a', '#4a4e4c'), '#7a7a70', f' transform="translate({DXR} {DYR}) rotate({ROTR} {MX} {PY})"')]:
    C.a(f'<g{tr}><g clip-path="url(#{clip})">')
    C.ell(PX, PY + 14, PRX, PRY, cols[2])
    C.shaded(plate_d, cols[0], cols[1], cols[2], (PX - PRX, PY - PRY, PX + PRX, PY + PRY), light=(-0.6, -0.7), k=24, rough=None)
    C.shaded(well_d, cols[1], cols[0], cols[2], (PX - PRX * 0.74, PY - PRY * 0.72, PX + PRX * 0.74, PY + PRY * 0.72), light=(0.6, 0.7), k=14, rough=None, hl=False)
    # a plain painted ring on the rim
    C.a(f'<ellipse cx="{PX}" cy="{PY}" rx="{f(PRX*0.87)}" ry="{f(PRY*0.87)}" fill="none" stroke="{ring}" stroke-width="5" opacity="0.7"/>')
    C.a('</g>')
    # the broken edge shows the ceramic body
    C.brush(CRACK, 5, '#e8dcc8' if clip == clL else '#8a8e8a', 0.9, tin=0.05, tout=0.05, wob=0.1)
    C.a('</g>')
# shadow inside the gap
C.brush([(x + 12, y + 8) for x, y in CRACK], 12, '#2a1608', 0.55, f' filter="url(#{C.blur(3)})"', tin=0.1, tout=0.1)

# ---- LEFT food: a generous home-cooked plate of the season
FL = C.id('c'); C.defs.append(f'<clipPath id="{FL}"><path d="{poly_d([(-20, 0), (MX + 6, 0)] + [(x - 4, y) for x, y in CRACK] + [(MX, H), (-20, H)])}"/></clipPath>')
C.a(f'<g clip-path="url(#{FL})">')
C.path(ellp(PX - 170, PY + 4, 220, 76), '#3a2a10', 0.3, f' filter="url(#{C.blur(10)})"')
# a bed of broad, ruffled lettuce leaves
for j in range(8):
    a = 175 + j * 24
    x = PX - 170 + math.cos(math.radians(a)) * 24
    y = PY + 2 + math.sin(math.radians(a)) * 10
    L_ = 100 if j % 2 else 86
    C.path(leaf_d(x, y, L_, 46, a), '#2e6a24')
    C.path(leaf_d(x, y, L_ * 0.95, 36, a - 2), '#6ab448', 0.95)
    C.path(leaf_d(x, y, L_ * 0.7, 18, a - 4), '#b8e080', 0.6)
    C.line([(x, y), (x + math.cos(math.radians(a)) * L_ * 0.8, y + math.sin(math.radians(a)) * L_ * 0.8)], 2.4, '#e8f8c8', 0.6)
# roasted carrots
for (x, y, rot) in [(PX - 330, PY + 30, 12), (PX - 318, PY + 56, 4)]:
    C.a(f'<g transform="rotate({rot} {x} {y})">')
    C.path(taper_d([(x - 70, y), (x - 10, y + 2), (x + 60, y + 4)], 22, 6), '#7a2a04', 0.5, f' transform="translate(3 5)" filter="url(#{C.blur(3)})"')
    C.shaded(taper_d([(x - 70, y), (x - 10, y + 2), (x + 60, y + 4)], 22, 6), '#ffc070', '#ec7418', '#7a2a04', (x - 70, y - 11, x + 60, y + 11), light=(-0.3, -0.9), k=5, rough=None)
    for k in range(5):
        C.line([(x - 54 + k * 22, y - 6), (x - 52 + k * 22, y + 6)], 1.4, '#8a3404', 0.5)
    C.brush([(x - 72, y), (x - 84, y - 6), (x - 96, y - 4)], 4, '#4a7a2a', 0.9, tin=0, tout=0.5)
    C.a('</g>')
# golden chickpeas with herbs
for k in range(46):
    a = r.uniform(0, math.tau); d = math.sqrt(r.uniform(0, 1))
    x = PX - 96 + math.cos(a) * 48 * d
    y = PY + 48 + math.sin(a) * 22 * d - (1 - d) * 10
    ball(C, x, y, 6.5, '#fff0c0', '#d8a050', '#6a3e0e', k=1.8, rough=None)
for k in range(9):
    C.path(leaf_d(PX - 96 + r.uniform(-34, 34), PY + 44 + r.uniform(-14, 12), 9, 3, r.uniform(0, 360)), '#2a7a2a')
# cucumber rounds
for (x, y) in [(PX - 60, PY - 34), (PX - 36, PY - 18), (PX - 66, PY - 6)]:
    C.ell(x, y + 3, 19, 11, '#1e4a1a')
    C.ell(x, y, 18, 10, '#c8e8a0')
    C.ell(x, y, 13, 6.5, '#e8f8c8')
    for k in range(5):
        C.ell(x + math.cos(k * 1.25) * 6, y + math.sin(k * 1.25) * 3, 1.6, 1, '#a8c880')
# tomato halves
for (x, y, R_) in [(PX - 150, PY - 34, 30), (PX - 108, PY - 10, 27), (PX - 196, PY - 14, 26)]:
    ball(C, x, y, R_, '#ffb8a0', '#e0301c', '#5a0806', k=R_ * 0.25, rough=None)
    C.ell(x - 2, y - 3, R_ * 0.74, R_ * 0.6, '#ff6a4a', 0.95)
    C.ell(x - 2, y - 3, R_ * 0.2, R_ * 0.16, '#ffc8a8', 0.9)
    for k in range(4):
        a = k / 4 * math.tau + 0.4
        C.ell(x - 2 + math.cos(a) * R_ * 0.38, y - 3 + math.sin(a) * R_ * 0.3, R_ * 0.18, R_ * 0.12, '#f8d878', 0.9)
        C.ell(x - 2 + math.cos(a) * R_ * 0.38, y - 3 + math.sin(a) * R_ * 0.3, R_ * 0.07, R_ * 0.05, '#ffffff', 0.6)
    C.ell(x - R_ * 0.4, y - R_ * 0.4, R_ * 0.15, R_ * 0.08, '#ffffff', 0.5)
# bread slice resting on the rim
C.a(f'<g transform="rotate(-14 {PX-330} {PY-60})">')
blob(C, [(PX - 390, PY - 60), (PX - 370, PY - 98), (PX - 320, PY - 104), (PX - 282, PY - 82), (PX - 280, PY - 48), (PX - 380, PY - 40)],
     '#ffe8b0', '#d08a3a', '#5a2a08', k=6, rough='roughf')
blob(C, [(PX - 376, PY - 58), (PX - 362, PY - 88), (PX - 322, PY - 94), (PX - 292, PY - 78), (PX - 292, PY - 54), (PX - 370, PY - 50)],
     '#fff8e0', '#f0d8a8', '#b89060', k=4, rough=None, hl=False)
for k in range(18):
    C.ell(PX - 360 + r.uniform(0, 60), PY - 80 + r.uniform(0, 26), r.uniform(1.5, 3.2), r.uniform(1, 2.2), '#c8a060', 0.7)
C.a('</g>')
C.a('</g>')
for k in range(4):  # steam
    x0 = PX - 250 + k * 50
    C.brush([(x0, PY - 50), (x0 - 18, PY - 110), (x0 + 16, PY - 170), (x0 - 8, PY - 230)], 16, '#ffffff', 0.28, f' filter="url(#{C.blur(4)})"', tin=0.3, tout=0.6)

# ---- RIGHT: almost empty. A greasy smear and a big crumpled plastic wrapper, shiny and garish
C.a(f'<g transform="translate({DXR} {DYR}) rotate({ROTR} {MX} {PY})">')
C.path(smooth_d([(PX + 60, PY + 30), (PX + 150, PY + 10), (PX + 250, PY + 40), (PX + 220, PY + 80), (PX + 120, PY + 76)], 4), '#c87a20', 0.35, f' filter="url(#{C.blur(3)})"')
C.path(smooth_d([(PX + 90, PY + 40), (PX + 160, PY + 28), (PX + 210, PY + 50), (PX + 150, PY + 66)], 4), '#e8a040', 0.3)
for k in range(10):
    C.ell(PX + 80 + r.uniform(0, 180), PY + 30 + r.uniform(0, 50), r.uniform(1.5, 3), r.uniform(1, 2), '#5a4a30', 0.6)
WX, WY = PX + 200, PY - 30
wrap = [(WX - 150, WY + 10), (WX - 128, WY - 30), (WX - 112, WY - 52), (WX - 60, WY - 70), (WX - 30, WY - 46), (WX - 10, WY - 58), (WX + 40, WY - 80), (WX + 74, WY - 56),
        (WX + 112, WY - 62), (WX + 150, WY - 20), (WX + 132, WY + 6), (WX + 140, WY + 30), (WX + 70, WY + 52), (WX + 30, WY + 34), (WX, WY + 46), (WX - 70, WY + 56), (WX - 100, WY + 34), (WX - 136, WY + 40)]
C.path(smooth_d([(x + 12, y + 18) for x, y in wrap], 2), '#0a0a0a', 0.45, f' filter="url(#{C.blur(8)})"')
pid, cid = C.shaded(smooth_d(wrap, 2), '#f8f8ff', '#c0c8d8', '#4a5068', bbox(wrap), light=(-0.6, -0.7), k=16, rough=None)
C.clip_open(cid)
# garish printed colours on the film, broken by creases
for (pts, col, op) in [([(WX - 140, WY - 10), (WX - 40, WY - 40), (WX + 60, WY - 10)], '#ff2a9a', 0.75), ([(WX - 60, WY + 30), (WX + 40, WY + 10), (WX + 140, WY - 10)], '#20d0e8', 0.6),
                       ([(WX - 20, WY - 60), (WX + 50, WY - 40), (WX + 120, WY - 50)], '#ffe020', 0.55)]:
    C.brush(pts, 34, col, op, tin=0.2, tout=0.2, wob=0.4)
for k in range(9):   # crumple folds: a dark valley with a bright ridge beside it
    x = WX + r.uniform(-110, 110); y = WY + r.uniform(-45, 30)
    a = r.uniform(0, math.pi)
    L_ = r.uniform(22, 44)
    p0 = (x - math.cos(a) * L_, y - math.sin(a) * L_); p1 = (x + math.cos(a) * L_, y + math.sin(a) * L_)
    pm = (x + math.sin(a) * 8, y - math.cos(a) * 8)
    C.brush([(p0[0] + 4, p0[1] + 5), (pm[0] + 4, pm[1] + 5), (p1[0] + 4, p1[1] + 5)], 9, '#14182a', 0.35, f' filter="url(#{C.blur(2.5)})"', tin=0.3, tout=0.3)
    C.brush([p0, pm, p1], 4, '#ffffff', 0.7, f' filter="url(#{C.blur(1)})"', tin=0.3, tout=0.3)
C.close()
C.ell(WX - 60, WY - 40, 16, 6, '#ffffff', 0.9)
C.ell(WX + 70, WY - 50, 12, 4, '#ffffff', 0.85)
C.a('</g>')

# ================= LIGHT / SHADOW UNIFICATION =================
cold = C.lg([(0, '#1a2026', 0), (0.45, '#1a2026', 0), (0.56, '#1a2026', 0.28), (1, '#0e1216', 0.42)], 0, 0, W, 0)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{cold})"/>')
sick = C.lg([(0, '#c8c060', 0), (0.5, '#c8c060', 0), (0.6, '#c8c060', 0.1), (1, '#a8a040', 0.08)], 0, 0, W, 0)
C.a(f'<rect width="{W}" height="{TY}" fill="url(#{sick})"/>')
vm = C.lg([(0, '#fff', 1), (0.42, '#fff', 1), (0.58, '#fff', 0)], 0, 0, W, 0)
C.defs.append(f'<mask id="vm"><rect width="{W}" height="{H}" fill="url(#{vm})"/></mask>')
warm = C.rg([(0, '#fff0c0', 0.35), (0.5, '#ffe0a0', 0.12), (1, '#ffe0a0', 0)], 150, 120, 900)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{warm})" mask="url(#vm)"/>')
vig = C.rg([(0, '#000', 0), (0.7, '#000', 0), (1, '#0a0604', 0.45)], W / 2, H / 2, 900)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{vig})"/>')

finish(C, OUT_SVG, OUT_PNG)
