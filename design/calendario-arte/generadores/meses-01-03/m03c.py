"""Mes 3 · Agua · Diseño 3.
Las mismas manos en cuenco, vistas por quien bebe, dos veces.
LUZ (izq.): el agua rebosa de una roca con musgo y llena las manos; transparente, se escapa entre los dedos.
SOMBRA (der.): el agua tiene dueño: un grifo con candado, seco; debajo, las mismas manos vacías y agrietadas,
y el mismo arroyo convertido en cauce seco."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3 import *  # noqa
from comun3 import _clip_of

C = Canvas(31)
R = C.r
MID = 742.5
mk = C.id('m')
mg = C.lg([(0, '#000'), (1, '#fff')], MID - 70, 0, MID + 70, 0)
C.defs.append(f'<mask id="{mk}" maskUnits="userSpaceOnUse" x="0" y="0" width="1485" height="850"><rect width="1485" height="850" fill="url(#{mg})"/></mask>')


def P(cx, cy, s, pts):
    return [(cx + x * s, cy + y * s) for x, y in pts]


def masked_open():
    C.a(f'<g mask="url(#{mk})">')


# ---------------------------------------------------------------- cupped hands (seen by the person who drinks)
PALM = [(-150, -44), (-156, 20), (-140, 70), (-96, 104), (-40, 118), (0, 120), (40, 118), (96, 104), (140, 70), (156, 20), (150, -44),
        (110, -52), (60, -56), (0, -50), (-60, -56), (-110, -52)]
# (centre x, length, width, outward lean) for index, middle, ring, little of the left hand; mirrored for the right
FING = [(-132, 64, 37, 9), (-98, 72, 37, 6), (-64, 68, 36, 3), (-32, 56, 33, 1)]


def cupped(cx, cy, s, skin, palm, content=None, dry=False):
    hi, mid, lo = skin
    phi, pmid, plo = palm
    for side in (-1, 1):  # forearms rising from the bottom edge, meeting at the wrists
        pts = P(cx, cy, s, [(side * 190, 280), (side * 130, 170), (side * 64, 96)])
        d = taper_d(pts, 116 * s, 92 * s)
        C.shaded(d, hi, mid, lo, bbox(pts, 58 * s), light=(-0.5, -0.8), k=26 * s, deep=lo, rough=None, spread=1.3)
        C.brush(P(cx, cy, s, [(side * 168, 256), (side * 116, 168), (side * 66, 112)]), 12 * s, hi, 0.2, f' filter="url(#{C.blur(6*s)})"', tin=0.2, tout=0.3)
    C.a(f'<ellipse cx="{f(cx)}" cy="{f(cy+64*s)}" rx="{f(170*s)}" ry="{f(70*s)}" fill="#0a0604" opacity="0.28" filter="url(#{C.blur(18*s)})"/>')
    # fingers first (their bases tuck under the palm edge), held together, pads turned to us
    for side in (-1, 1):
        for (fx, L, w, lean) in FING:
            fx *= side
            lean *= side
            b = (fx, -36)
            m = (fx + lean * 0.5, -36 - L * 0.55)
            t = (fx + lean, -36 - L)
            pts = P(cx, cy, s, [b, m, t])
            d = taper_d(pts, w * s, w * 0.9 * s)
            C.shaded(d, phi, pmid, plo, bbox(pts, w * s / 2), light=(-0.2, -0.9), k=w * 0.3 * s, rough=None, spread=1.1)
            tx, ty = cx + t[0] * s, cy + t[1] * s
            C.ell(tx, ty, w * 0.45 * s, w * 0.42 * s, pmid)
            C.ell(tx - w * 0.06 * s, ty + w * 0.04 * s, w * 0.3 * s, w * 0.26 * s, phi, 0.7, f' filter="url(#{C.blur(2*s)})"')
            for k_ in (0.35, 0.66):
                yy = -36 - L * k_
                xx = fx + lean * k_
                C.brush(P(cx, cy, s, [(xx - w * 0.36, yy), (xx, yy + 3), (xx + w * 0.36, yy)]), 1.8 * s, plo, 0.45, tin=0.3, tout=0.3)
    d = smooth_d(P(cx, cy, s, PALM), 5)
    C.path(d, '#140806', 0.22, f' transform="translate(0 {f(-6*s)})" filter="url(#{C.blur(5*s)})"')
    g = C.lg([(0, pmid), (0.4, plo), (0.85, pmid), (1, phi)], 0, cy - 56 * s, 0, cy + 120 * s)
    C.path(d, f'url(#{g})')
    cid = _clip_of(C, d)
    C.a(f'<g clip-path="url(#{cid})">')
    C.a(f'<path d="{d}" fill="none" stroke="{plo}" stroke-width="{f(36*s)}" opacity="0.45" filter="url(#{C.blur(12*s)})"/>')
    C.a(f'<ellipse cx="{f(cx)}" cy="{f(cy+86*s)}" rx="{f(100*s)}" ry="{f(20*s)}" fill="{phi}" opacity="0.6" filter="url(#{C.blur(10*s)})"/>')
    for side in (-1, 1):  # mounts of the palms catching the light, palm lines
        C.a(f'<ellipse cx="{f(cx+side*110*s)}" cy="{f(cy+30*s)}" rx="{f(28*s)}" ry="{f(44*s)}" fill="{phi}" opacity="0.35" filter="url(#{C.blur(10*s)})"/>')
        C.brush(P(cx, cy, s, [(side * 26, 4), (side * 76, 16), (side * 128, 0)]), 2.4 * s, plo, 0.45, tin=0.3, tout=0.4)
        C.brush(P(cx, cy, s, [(side * 40, 40), (side * 90, 44), (side * 136, 26)]), 2 * s, plo, 0.35, tin=0.3, tout=0.4)
    C.brush(P(cx, cy, s, [(0, -50), (0, 0), (0, 60)]), 2.2 * s, plo, 0.3, f' filter="url(#{C.blur(1.5*s)})"', tin=0.1, tout=0.3)
    if dry:  # cracked, dusty skin
        cr = []
        for _ in range(30):
            x, y = R.uniform(-130, 130), R.uniform(-40, 100)
            pts = [(x, y)]
            for _ in range(3):
                x += R.uniform(-14, 14)
                y += R.uniform(-6, 10)
                pts.append((x, y))
            cr.append(poly_d(P(cx, cy, s, pts), False))
        C.a(f'<path d="{"".join(cr)}" fill="none" stroke="{plo}" stroke-width="{f(1.3*s)}" opacity="0.8"/>')
        C.a(f'<path d="{"".join(cr)}" fill="none" stroke="{phi}" stroke-width="{f(0.8*s)}" opacity="0.4" transform="translate(1 1.2)"/>')
        C.a(f'<ellipse cx="{f(cx)}" cy="{f(cy+20*s)}" rx="{f(130*s)}" ry="{f(60*s)}" fill="#c8b090" opacity="0.18" filter="url(#{C.blur(10*s)})"/>')
    C.a('</g>')
    if dry:  # cracks also on the finger pads
        cr = []
        for _ in range(16):
            x, y = R.uniform(-150, 150), R.uniform(-120, -50)
            cr.append(poly_d(P(cx, cy, s, [(x, y), (x + R.uniform(-8, 8), y + R.uniform(4, 10)), (x + R.uniform(-10, 10), y + R.uniform(10, 18))]), False))
        C.a(f'<path d="{"".join(cr)}" fill="none" stroke="{plo}" stroke-width="{f(1.1*s)}" opacity="0.7"/>')
    # thumbs lying along the outside of each index finger
    for side in (-1, 1):
        tp = P(cx, cy, s, [(side * 146, 66), (side * 176, 6), (side * 170, -52)])
        dd = taper_d(tp, 42 * s, 30 * s)
        C.path(dd, '#140806', 0.25, f' transform="translate({f(side*4*s)} {f(5*s)})" filter="url(#{C.blur(4*s)})"')
        C.shaded(dd, hi, mid, lo, bbox(tp, 21 * s), light=(-0.6 * side, -0.6), k=9 * s, rough=None)
        C.ell(cx + side * 170 * s, cy - 52 * s, 15 * s, 15 * s, mid)
        C.ell(cx + side * 172 * s, cy - 56 * s, 8 * s, 10 * s, '#f2dcd0', 0.7 if not dry else 0.35)
        C.brush(P(cx, cy, s, [(side * 158, 14), (side * 176, 4), (side * 186, 10)]), 2 * s, lo, 0.4, tin=0.3, tout=0.3)
    if content:
        content(cx, cy, s)


# ================================================================ sky
g = C.lg([(0, '#3a76c0'), (0.45, '#86bce4'), (0.78, '#d8ecf0'), (1, '#fff2dc')], 0, 0, 0, 470)
C.a(f'<rect width="1485" height="850" fill="url(#{g})"/>')
C.glow(330, 330, 380, '#fff4d0', 0.45)
for (x, y, rx, ry) in [(240, 110, 170, 26), (470, 64, 120, 18), (120, 190, 110, 16)]:
    C.a(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#ffffff" opacity="0.5" filter="url(#{C.blur(12)})"/>')
    C.a(f'<ellipse cx="{x-20}" cy="{y-6}" rx="{rx*0.6}" ry="{ry*0.6}" fill="#ffffff" opacity="0.5" filter="url(#{C.blur(6)})"/>')
masked_open()
g2 = C.lg([(0, '#3e302e'), (0.5, '#6e5646'), (0.8, '#a08060'), (1, '#b49470')], 0, 0, 0, 470)
C.a(f'<rect width="1485" height="850" fill="url(#{g2})"/>')
C.glow(1180, 300, 320, '#d8a060', 0.3)
for k in range(5):
    C.a(f'<ellipse cx="{f(1120+R.uniform(-100,100))}" cy="{f(170+k*55)}" rx="{f(R.uniform(260,400))}" ry="14" fill="#c8a078" opacity="0.16" filter="url(#{C.blur(12)})"/>')
C.a('</g>')

# ================================================================ the mountain: one massif, lit from the left
sil = [(150, 490), (260, 440), (340, 410), (400, 372), (452, 350), (500, 300), (540, 284), (580, 236), (618, 214), (650, 170), (676, 150),
       (700, 118), (716, 110), (734, 126), (760, 150), (790, 184), (820, 196), (850, 186), (884, 214), (920, 252), (970, 286), (1030, 330),
       (1100, 356), (1190, 394), (1330, 470), (1400, 494)]
mt = poly_d(sil, False) + 'L1400 540L150 540Z'
gm = C.lg([(0, '#aab6ea'), (0.5, '#7686c6'), (1, '#4a5a98')], 0, 110, 0, 490)
C.path(mt, f'url(#{gm})')
masked_open()
gm2 = C.lg([(0, '#9a806e'), (0.5, '#7a604e'), (1, '#4e3c30')], 0, 110, 0, 490)
C.path(mt, f'url(#{gm2})')
C.a('</g>')
cid = C.id('c')
C.defs.append(f'<clipPath id="{cid}"><path d="{mt}"/></clipPath>')
C.a(f'<g clip-path="url(#{cid})">')
# spurs running down from the summits; each casts a widening shadow on its right and catches light on its left
SPURS = [[(716, 110), (676, 200), (628, 300), (560, 400), (480, 500)],
         [(716, 110), (728, 220), (734, 340), (712, 500)],
         [(850, 186), (880, 280), (920, 380), (972, 500)],
         [(580, 236), (540, 330), (480, 420), (410, 500)],
         [(984, 296), (1040, 400), (1100, 500)]]
def wedge(sp, k, wid):
    back = [(x + k * wid * (i / (len(sp) - 1)) ** 0.8 + k * 6, y + 4) for i, (x, y) in enumerate(sp)]
    return list(sp) + back[::-1]
SH = [wedge(sp, 1, 120) for sp in SPURS]
LT = [wedge(sp, -1, 46) for sp in SPURS]
for pl in SH:
    C.path(smooth_d(pl, 3), '#26306a', 0.45, f' filter="url(#{C.blur(6)})"')
for pl in LT:
    C.path(smooth_d(pl, 3), '#dfe4ff', 0.3, f' filter="url(#{C.blur(5)})"')
C.path(smooth_d([(716, 110), (850, 186), (1400, 500), (1400, 540), (734, 540), (734, 340), (728, 220)], 3), '#2a346e', 0.25, f' filter="url(#{C.blur(12)})"')
snow = smooth_d([(716, 102), (700, 118), (682, 146), (690, 164), (706, 156), (722, 176), (738, 160), (760, 156), (748, 132)], 4)
C.shaded(snow, '#ffffff', '#e2ecfa', '#8ea4d0', (682, 102, 760, 176), light=(-0.8, -0.5), k=8, rough='roughf')
for (pts, w) in [([(700, 150), (676, 200), (650, 252), (630, 290)], 16), ([(724, 160), (728, 220), (732, 270)], 12),
                 ([(690, 170), (664, 214)], 9), ([(850, 186), (866, 220), (880, 262)], 10), ([(588, 240), (572, 270)], 7)]:
    C.brush(pts, w, '#f4f8ff', 0.92, ' filter="url(#roughf)"', tin=0.05, tout=0.9)
    C.brush([(x + 4, y + 2) for x, y in pts], w * 0.5, '#9aaed8', 0.6, tin=0.1, tout=0.9)
masked_open()
for pl in SH:
    C.path(smooth_d(pl, 3), '#2a1a12', 0.4, f' filter="url(#{C.blur(7)})"')
for pl in LT:
    C.path(smooth_d(pl, 3), '#c8a888', 0.22, f' filter="url(#{C.blur(8)})"')
C.path(smooth_d([(716, 104), (690, 128), (660, 170), (700, 260), (760, 270), (780, 190), (748, 140)], 4), '#7a6050', 1, f' filter="url(#{C.blur(5)})"')
for k in range(10):
    x0 = R.uniform(742, 1100)
    y0 = 150 + abs(x0 - 716) * 0.4 + R.uniform(10, 60)
    C.brush([(x0, y0), (x0 + 12, y0 + 50), (x0 + 24, y0 + 110)], R.uniform(1.6, 3), '#2e1e14', 0.4, f' filter="url(#{C.blur(0.8)})"', tin=0.1, tout=0.6)
C.a('</g>')
C.a('</g>')

# haze at the foot of the mountain
C.a(f'<rect x="150" y="430" width="600" height="70" fill="#f0f8ff" opacity="0.45" filter="url(#{C.blur(18)})"/>')
C.a(f'<rect x="742" y="430" width="600" height="70" fill="#c8a07a" opacity="0.45" filter="url(#{C.blur(18)})"/>')

# ================================================================ valley floor
ground = 'M0 476Q370 452 742 462Q1110 452 1485 476L1485 850L0 850Z'
gl = C.lg([(0, '#8ab868'), (0.4, '#4e8c4a'), (1, '#1e4a2a')], 0, 450, 0, 850)
C.path(ground, f'url(#{gl})')
masked_open()
gr = C.lg([(0, '#c0a07a'), (0.4, '#9a7a5a'), (1, '#4a3424')], 0, 450, 0, 850)
C.path(ground, f'url(#{gr})')
C.a('</g>')
# grass texture on the left, dust streaks on the right
gs = []
for _ in range(500):
    x, y = R.uniform(0, 700), R.uniform(480, 850)
    sc = 0.3 + (y - 470) / 380 * 1.3
    h, w, lean = R.uniform(6, 14) * sc, R.uniform(1, 2) * sc, R.uniform(-4, 4) * sc
    gs.append(f"M{f(x-w/2)} {f(y)}q{f(lean*0.3)} {f(-h*0.5)} {f(lean+w/2)} {f(-h)}q{f(-lean*0.5+w*0.2)} {f(h*0.5)} {f(-lean*0.7+w/2)} {f(h)}z")
C.a(f'<path fill="#7ab05a" opacity="0.55" d="{"".join(gs[:250])}"/><path fill="#2a5a30" opacity="0.5" d="{"".join(gs[250:])}"/>')
for k in range(10):
    y = 500 + k * 34
    C.a(f'<ellipse cx="{f(1120+R.uniform(-150,150))}" cy="{f(y)}" rx="{f(R.uniform(80,180))}" ry="{f(3+k*0.6)}" fill="#d8b890" opacity="0.25" filter="url(#{C.blur(3)})"/>')

# river (left) and its dry mirror (right), both from the foot of the mountain toward us
RIV = [(708, 466), (668, 492), (606, 532), (526, 584), (436, 646), (336, 724), (240, 870), (440, 870), (508, 744), (578, 654), (646, 572), (704, 512), (738, 472)]
rv = smooth_d(RIV, 5)
gw = C.lg([(0, '#d8f0f8'), (0.4, '#6ab8d8'), (1, '#2a78b0')], 0, 460, 0, 870)
C.path(rv, f'url(#{gw})')
rcid = _clip_of(C, rv)
C.a(f'<g clip-path="url(#{rcid})">')
C.a(f'<path d="{rv}" fill="none" stroke="#2a5a3a" stroke-width="10" opacity="0.5" filter="url(#{C.blur(4)})"/>')
for k in range(16):
    y = 486 + k * 24 + R.uniform(-4, 4)
    x = 704 - (y - 470) * 0.95 + R.uniform(-14, 14)
    C.brush([(x - 16 - k * 3, y), (x, y + 2), (x + 16 + k * 3, y)], 1.6 + k * 0.18, '#ffffff', 0.5, tin=0.3, tout=0.3)
C.a('</g>')
dry = smooth_d([(1485 - x, y) for x, y in RIV], 5)
C.path(dry, '#cdb08a')
dcid = _clip_of(C, dry)
C.a(f'<g clip-path="url(#{dcid})">')
# cracked mud plates in perspective, laid out along the dry bed
def resample(pl, ts):
    cum = [0]
    for i in range(1, len(pl)):
        cum.append(cum[-1] + math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]))
    out = []
    for t in ts:
        L = t * cum[-1]
        i = max(1, next((k for k in range(1, len(cum)) if cum[k] >= L), len(cum) - 1))
        u = (L - cum[i - 1]) / ((cum[i] - cum[i - 1]) or 1)
        out.append((pl[i - 1][0] + (pl[i][0] - pl[i - 1][0]) * u, pl[i - 1][1] + (pl[i][1] - pl[i - 1][1]) * u))
    return out
E1 = [(1485 - x, y) for x, y in [(708, 466), (668, 492), (606, 532), (526, 584), (436, 646), (336, 724), (240, 870)]]
E2 = [(1485 - x, y) for x, y in [(738, 472), (704, 512), (646, 572), (578, 654), (508, 744), (440, 870)]]
NV, NU = 15, 5
ts = [(k / NV) ** 1.35 for k in range(NV + 1)]
A1, A2 = resample(E1, ts), resample(E2, ts)
G = []
for k in range(NV + 1):
    row = []
    for j in range(NU + 1):
        u = j / NU
        x = A1[k][0] + (A2[k][0] - A1[k][0]) * u
        y = A1[k][1] + (A2[k][1] - A1[k][1]) * u
        sc = 3 + k * 1.6
        if 0 < j < NU and 0 < k < NV:
            x += R.uniform(-sc, sc)
            y += R.uniform(-sc * 0.5, sc * 0.5)
        row.append((x, y))
    G.append(row)
C.path(dry, '#3a2618', 0.9)
plates = {'#dcc09a': [], '#c8a880': [], '#b89a72': []}
lips_ = []
for k in range(NV):
    for j in range(NU):
        q = [G[k][j], G[k][j + 1], G[k + 1][j + 1], G[k + 1][j]]
        if R.random() < 0.5:  # split some cells diagonally, like real mud cracks
            parts = [[q[0], q[1], q[2]], [q[0], q[2], q[3]]] if R.random() < 0.5 else [[q[0], q[1], q[3]], [q[1], q[2], q[3]]]
        else:
            parts = [q]
        for pp in parts:
            mx = sum(p[0] for p in pp) / len(pp)
            my = sum(p[1] for p in pp) / len(pp)
            gap = 0.86
            pp = [(mx + (px - mx) * gap, my + (py - my) * gap) for px, py in pp]
            plates[R.choice(list(plates))].append(smooth_d(pp, 2) if len(pp) == 4 else poly_d(pp))
            lips_.append(poly_d(pp[:2], False))
for col, ds in plates.items():
    C.a(f'<path fill="{col}" d="{"".join(ds)}"/>')
C.a(f'<path d="{"".join(lips_)}" fill="none" stroke="#f0dcc0" stroke-width="1.6" opacity="0.6"/>')
C.a(f'<path d="{dry}" fill="none" stroke="#5a4030" stroke-width="12" opacity="0.4" filter="url(#{C.blur(5)})"/>')
C.a('</g>')

# ================================================================ LUZ: water welling over a mossy boulder
ROCK = [(-40, 212), (20, 178), (70, 188), (122, 160), (172, 170), (214, 198), (250, 238), (268, 272), (292, 302), (302, 352), (298, 400), (278, 446), (262, 500), (240, 570), (-40, 570)]
rk = smooth_d(ROCK, 5)
C.path(rk, '#140e08', 0.35, f' transform="translate(10 12)" filter="url(#{C.blur(10)})"')
C.shaded(rk, '#aca690', '#7a7462', '#2e2a22', (-40, 158, 304, 570), light=(-0.5, -0.8), k=34, rough='rough', spread=1.5)
rcid2 = _clip_of(C, rk)
C.a(f'<g clip-path="url(#{rcid2})">')
# painted stone: dabs of warm and cool greys, darker toward the shadow side
dab = {'#c8c2aa': [], '#8a8470': [], '#5a5648': [], '#9aa0a0': []}
for _ in range(240):
    x, y = R.uniform(-40, 304), R.uniform(158, 570)
    t = (x / 304) * 0.6 + ((y - 158) / 412) * 0.4
    col = '#c8c2aa' if t < 0.3 else '#9aa0a0' if t < 0.5 else '#8a8470' if t < 0.7 else '#5a5648'
    a = R.uniform(-0.6, 0.6)
    L, w = R.uniform(10, 26), R.uniform(3, 7)
    dab[col].append(f"M{f(x)} {f(y)}q{f(L*0.5*math.cos(a))} {f(-w)} {f(L*math.cos(a))} {f(L*math.sin(a))}q{f(-L*0.5*math.cos(a))} {f(w*0.8)} {f(-L*math.cos(a))} {f(-L*math.sin(a))}z")
for col, ds in dab.items():
    C.a(f'<path fill="{col}" opacity="0.45" d="{"".join(ds)}" filter="url(#{C.blur(0.8)})"/>')
C.a('</g>')
# painted moss: many small strokes in several greens, thick on the crown and along the wet lip
moss = {'#2e5a24': [], '#4a7e30': [], '#76aa48': [], '#a8d070': []}
def moss_patch(cx_, cy_, rx_, ry_, n):
    for _ in range(n):
        a = R.uniform(0, math.tau)
        rr = math.sqrt(R.random())
        x, y = cx_ + math.cos(a) * rr * rx_, cy_ + math.sin(a) * rr * ry_
        lv = -(x - cx_) / rx_ * 0.5 - (y - cy_) / ry_ * 0.7 + R.uniform(-0.4, 0.4)
        col = '#a8d070' if lv > 0.6 else '#76aa48' if lv > 0.0 else '#4a7e30' if lv > -0.5 else '#2e5a24'
        L = R.uniform(4, 9)
        an = R.uniform(-2.6, -0.5)
        moss[col].append(f"M{f(x)} {f(y)}l{f(math.cos(an)*L)} {f(math.sin(an)*L)}l{f(2)} {f(1)}z")
moss_patch(100, 176, 120, 26, 520)
moss_patch(230, 222, 46, 18, 160)
moss_patch(278, 344, 22, 40, 170)
moss_patch(20, 196, 60, 18, 160)
for col, ds in moss.items():
    C.a(f'<path fill="none" stroke="{col}" stroke-width="2.6" stroke-linecap="round" d="{"".join(ds)}"/>')
# a second, smaller stone in front
st = smooth_d([(150, 572), (160, 520), (200, 492), (248, 496), (282, 528), (290, 572)], 4)
C.shaded(st, '#b8b29a', '#868070', '#34302a', (150, 492, 290, 572), light=(-0.5, -0.8), k=14, rough='rough')
moss = {k_: [] for k_ in moss}
moss_patch(214, 500, 40, 10, 90)
for col, ds in moss.items():
    C.a(f'<path fill="none" stroke="{col}" stroke-width="2.4" stroke-linecap="round" d="{"".join(ds)}"/>')
# the wet face below the lip, where the water slides down before falling
C.brush([(296, 330), (304, 380), (300, 412)], 26, '#1e2a2a', 0.35, f' filter="url(#{C.blur(6)})"', tin=0.1, tout=0.2)
C.brush([(290, 328), (300, 370), (298, 404)], 14, '#cfeeff', 0.45, f' filter="url(#{C.blur(2)})"', tin=0.1, tout=0.1)
C.brush([(292, 334), (301, 372), (299, 402)], 3, '#ffffff', 0.8, tin=0.2, tout=0.2)
# ferns at the foot of the rock
for k in range(9):
    bx, by = 120 + k * 18, 570
    C.brush([(bx, by), (bx + 10 - k * 3, by - 38 - (k % 3) * 10), (bx + 26 - k * 6, by - 58 - (k % 3) * 12)], 6, ['#3a7a3a', '#5aa04a', '#2a5a2a'][k % 3], 0.9, tin=0, tout=0.9)
LH = (420, 664)
stream = [(298, 404), (336, 428), (372, 474), (398, 540), (412, 598)]
C.brush(stream, 28, '#bfe8ff', 0.25, f' filter="url(#{C.blur(5)})"', tin=0.05, tout=0.05)
C.brush(stream, 14, '#e0f6ff', 0.7, tin=0.02, tout=0.05, wob=0.15)
C.brush([(x - 3, y) for x, y in stream], 3.5, '#ffffff', 0.95, tin=0.05, tout=0.2)
C.brush([(x + 5, y + 2) for x, y in stream], 3, '#5aa8d8', 0.5, tin=0.1, tout=0.2)
for k in range(12):
    t = R.uniform(0.2, 0.95)
    x, y = stream[int(t * 4)]
    C.ell(x + R.uniform(-22, 22), y + R.uniform(-10, 30), 2.2, 2.8, '#e8f8ff', 0.85)

# ================================================================ SOMBRA: the locked tap, dry
RH = (1065, 664)
pipe = [(1500, 250), (1330, 250), (1180, 256), (1110, 284), (1084, 330)]
d = taper_d(pipe, 46, 44)
C.path(d, '#1a1008', 0.35, f' transform="translate(6 10)" filter="url(#{C.blur(6)})"')
C.shaded(d, '#b0b4b8', '#6a6e74', '#24262a', bbox(pipe, 23), light=(-0.2, -1), k=12, rough=None)
C.brush([(1480, 236), (1330, 236), (1190, 242), (1126, 266)], 4, '#ffffff', 0.35, tin=0.1, tout=0.3)
for k in range(6):
    C.ell(R.uniform(1140, 1460), 262, R.uniform(8, 18), 6, '#8a4a20', 0.35, f' filter="url(#{C.blur(3)})"')
for x in (1420, 1330):
    C.shaded(f'M{x-8} 222L{x+8} 222L{x+8} 278L{x-8} 278Z', '#b8bcc0', '#74787e', '#2a2c30', (x - 8, 222, x + 8, 278), light=(-0.5, -0.8), k=4, rough=None)
C.shaded(circ(1236, 254, 30), '#c84a3a', '#8a2418', '#3a0c08', (1206, 224, 1266, 284), light=(-0.5, -0.8), k=7, rough=None)
C.ell(1236, 254, 18, 18, '#6a6e74')
C.ell(1236, 254, 8, 8, '#2a2c30')
C.a('<path d="M1224 282Q1224 258 1240 258Q1256 258 1256 282" fill="none" stroke="#c8ccd0" stroke-width="6"/>')
C.shaded('M1216 280L1264 280L1266 324L1214 324Z', '#f0c860', '#b88a28', '#5a3a08', (1214, 280, 1266, 324), light=(-0.5, -0.7), k=6, rough=None)
C.ell(1240, 298, 4, 5, '#2a1a04')
C.path('M1238 300L1242 300L1241 312L1239 312Z', '#2a1a04')
# dry spout: a dark empty mouth with a crust of rust, nothing falls
C.shaded('M1062 322L1104 322L1102 346L1064 346Z', '#8a8e94', '#5a5e64', '#1a1c20', (1062, 322, 1104, 346), light=(-0.5, -0.8), k=4, rough=None)
C.ell(1083, 346, 17, 4, '#0c0a08')
C.ell(1083, 349, 12, 3, '#8a4a20', 0.6, f' filter="url(#{C.blur(1.5)})"')



# ================================================================ contents of the two cups
def water(cx, cy, s):
    surf = ellp(cx, cy + 4 * s, 136 * s, 54 * s)
    # the water: mostly transparent, palms seen through it, the sky on its far half
    gw2 = C.lg([(0, '#ffffff', 0.92), (0.2, '#c8f0ff', 0.85), (0.5, '#5cc4ec', 0.68), (1, '#38aade', 0.58)], 0, cy - 50 * s, 0, cy + 58 * s)
    C.path(surf, f'url(#{gw2})', 1, f' filter="url(#{C.blur(2*s)})"')
    scid = _clip_of(C, surf)
    C.a(f'<g clip-path="url(#{scid})">')
    for (dx, dy, rx, ry, op) in [(-40, -30, 72, 9, 0.55), (34, -14, 50, 6, 0.4), (-70, 4, 34, 4, 0.3)]:
        C.a(f'<ellipse cx="{f(cx+dx*s)}" cy="{f(cy+dy*s)}" rx="{f(rx*s)}" ry="{f(ry*s)}" fill="#ffffff" opacity="{op}" filter="url(#{C.blur(3*s)})"/>')
    for k in range(4):
        C.ell(cx - 8 * s, cy - 18 * s, (12 + k * 18) * s, (4 + k * 6.5) * s, 'none', 1, f' stroke="#ffffff" stroke-width="{f(1.6*s)}" stroke-opacity="{round(0.55-k*0.12,2)}"')
    # caustic light dancing on the palms under the water
    for _ in range(14):
        x, y = cx + R.uniform(-100, 100) * s, cy + R.uniform(-30, 26) * s
        C.brush([(x - 10 * s, y), (x, y - 3 * s), (x + 10 * s, y + 1 * s)], 2 * s, '#ffffff', 0.35, tin=0.4, tout=0.4)
    C.a('</g>')
    C.a(f'<path d="M{f(cx-130*s)} {f(cy-12*s)}Q{f(cx)} {f(cy-70*s)} {f(cx+130*s)} {f(cy-12*s)}" fill="none" stroke="#ffffff" stroke-width="{f(2.4*s)}" opacity="0.6" filter="url(#{C.blur(1*s)})"/>')
    # water slipping out between the fingers and over the thumbs, dripping from the heel
    for (pts, w) in [([(-150, -40), (-160, 0), (-150, 40)], 3.5), ([(150, -40), (162, 0), (156, 40)], 3.5),
                     ([(-168, -30), (-176, 30), (-170, 90), (-160, 140)], 4.5), ([(170, -20), (178, 40), (172, 110)], 4),
                     ([(-20, 112), (-22, 150), (-24, 190)], 3.5), ([(30, 116), (32, 146)], 3)]:
        pp = P(cx, cy, s, pts)
        C.brush(pp, w * 2.2 * s, '#bfe8ff', 0.3, f' filter="url(#{C.blur(2*s)})"', tin=0.1, tout=0.3)
        C.brush(pp, w * s, '#ffffff', 0.75, tin=0.1, tout=0.4)
    for (dx, dy, r_) in [(-24, 214, 4), (-160, 160, 4), (172, 128, 3.5), (32, 162, 3), (-26, -40, 3), (12, -46, 2.4)]:
        C.ell(cx + dx * s, cy + dy * s, r_ * s, r_ * 1.3 * s, '#e8f8ff', 0.9)
        C.ell(cx + dx * s - r_ * 0.3 * s, cy + dy * s - r_ * 0.45 * s, r_ * 0.35 * s, r_ * 0.35 * s, '#ffffff', 1)


SKL = ('#eab890', '#aa7048', '#4a2614')
PLL = ('#fad8bc', '#e0a888', '#9a5a46')
SKR = ('#b4a294', '#7a6658', '#2e2420')
PLR = ('#c8b6a4', '#a08a78', '#5a463a')
cupped(LH[0], LH[1], 1.0, SKL, PLL, content=water)
cupped(RH[0], RH[1], 1.0, SKR, PLR, dry=True)

vg = C.rg([(0, '#000', 0), (0.7, '#000', 0), (1, '#000', 0.45)], 742, 425, 900)
C.a(f'<rect width="1485" height="850" fill="url(#{vg})"/>')
finish(C, OUT_SVG.format(3), OUT_PNG.format(3))
