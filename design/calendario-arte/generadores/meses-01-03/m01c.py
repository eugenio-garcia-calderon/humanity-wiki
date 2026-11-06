"""Mes 1 · Cosmos y Vida · Diseño 3.
LUZ (izq.): una persona tumbada en la hierba mira la Vía Láctea; su ropa está hecha de cielo.
SOMBRA (der.): la misma persona, en espejo, mira el móvil; el cielo naranja de la ciudad ha borrado
las estrellas y lo cruza una hilera de satélites."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3 import *  # noqa
from comun import hand2
from comun3 import _clip_of

C = Canvas(17)
R = C.r
MID = 742.5


def qbez(p0, p1, p2, t):
    return ((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
            (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1])


MW = [(-40, 700), (330, 330), (820, -60)]  # Milky Way spine


def mw_pts(n=24, off=0.0):
    out = []
    for k in range(n + 1):
        t = k / n
        x, y = qbez(*MW, t)
        x2, y2 = qbez(*MW, min(1, t + 0.01))
        L = math.hypot(x2 - x, y2 - y) or 1
        nx, ny = -(y2 - y) / L, (x2 - x) / L
        out.append((x + nx * off, y + ny * off))
    return out


def blades(C, items, col, op=1):
    ds = []
    for (x, y, h, lean, w) in items:
        ds.append(f"M{f(x-w/2)} {f(y)}q{f(lean*0.3)} {f(-h*0.5)} {f(lean+w/2)} {f(-h)}q{f(-lean*0.5+w*0.2)} {f(h*0.5)} {f(-lean*0.7+w/2)} {f(h)}z")
    C.a(f'<path fill="{col}" opacity="{op}" d="{"".join(ds)}"/>')


# ------------------------------------------------------------------ sky, left (night, Milky Way)
g = C.lg([(0, '#06071a'), (0.45, '#141640'), (0.72, '#2a2560'), (0.86, '#463a78'), (1, '#2a2a50')], 0, 0, 0, 640)
C.a(f'<rect width="1485" height="850" fill="url(#{g})"/>')
C.glow(260, 520, 520, '#5a3a8a', 0.45)
C.glow(520, 120, 380, '#2a5a8a', 0.3)
# broad galactic glow
for wdt, col, op, bl in [(340, '#4a3a8a', 0.4, 50), (200, '#8a78c0', 0.32, 30), (100, '#e0d4ee', 0.36, 16), (40, '#fff4e4', 0.25, 10)]:
    C.line(mw_pts(), wdt, col, op, f' filter="url(#{C.blur(bl)})"')
# warm core
cx_, cy_ = qbez(*MW, 0.33)
C.a(f'<ellipse cx="{f(cx_)}" cy="{f(cy_)}" rx="230" ry="80" fill="#ffd2a0" opacity="0.5" transform="rotate(-48 {f(cx_)} {f(cy_)})" filter="url(#{C.blur(30)})"/>')
C.a(f'<ellipse cx="{f(cx_)}" cy="{f(cy_)}" rx="90" ry="30" fill="#fff0d8" opacity="0.5" transform="rotate(-48 {f(cx_)} {f(cy_)})" filter="url(#{C.blur(16)})"/>')
# dust lanes
for off, w, op in [(-8, 22, 0.55), (14, 10, 0.45), (-30, 8, 0.35)]:
    pts = [(x + R.uniform(-6, 6), y + R.uniform(-6, 6)) for x, y in mw_pts(14, off)]
    C.brush(pts[3:11], w * 1.3, '#0b0a20', op * 0.6, f' filter="url(#{C.blur(9)})"', tin=0.25, tout=0.3, wob=0.6)
# star field: dense along the band, sparse elsewhere
stars = []
for _ in range(1300):
    t = R.uniform(0, 1)
    x, y = qbez(*MW, t)
    x2, y2 = qbez(*MW, min(1, t + 0.01))
    L = math.hypot(x2 - x, y2 - y) or 1
    nx, ny = -(y2 - y) / L, (x2 - x) / L
    o = R.gauss(0, 55)
    sx, sy = x + nx * o, y + ny * o
    if 0 < sx < 900 and 0 < sy < 620:
        stars.append((sx, sy, R.choice([0.5, 0.6, 0.7, 0.9, 1.1]), R.uniform(0.35, 0.95)))
for _ in range(420):
    sx, sy = R.uniform(0, 900), R.uniform(0, 600) ** 1.0
    stars.append((sx, sy, R.choice([0.5, 0.7, 0.9, 1.2]), R.uniform(0.3, 0.9)))
grain_stars(C, stars, '#f4f0ff')
for (sx, sy, s) in [(118, 96, 3.2), (560, 64, 2.6), (90, 300, 2.4), (430, 420, 2.2), (690, 240, 2.4), (250, 170, 1.8)]:
    sparkle(C, sx, sy, s, '#fff6e6', 0.9)

# ------------------------------------------------------------------ sky, right (sodium glow), masked in
mk = C.id('m')
mg = C.lg([(0, '#000'), (1, '#fff')], MID - 70, 0, MID + 90, 0)
C.defs.append(f'<mask id="{mk}" maskUnits="userSpaceOnUse" x="0" y="0" width="1485" height="850"><rect width="1485" height="850" fill="url(#{mg})"/></mask>')
C.a(f'<g mask="url(#{mk})">')
g2 = C.lg([(0, '#241a22'), (0.35, '#3e2a2c'), (0.62, '#7a4630'), (0.84, '#c8783a'), (1, '#e8a050')], 0, 0, 0, 640)
C.a(f'<rect width="1485" height="850" fill="url(#{g2})" opacity="0.97"/>')
C.glow(1180, 640, 620, '#ff9a48', 0.5)
for k in range(7):  # smog bands
    y = 300 + k * 48 + R.uniform(-10, 10)
    C.a(f'<ellipse cx="{f(1100+R.uniform(-80,80))}" cy="{f(y)}" rx="{f(R.uniform(380,520))}" ry="{f(R.uniform(10,22))}" fill="#e8a070" opacity="{round(0.06+k*0.02,2)}" filter="url(#{C.blur(14)})"/>')
# ghost of the erased Milky Way
C.line([(1485 - x, y) for x, y in mw_pts()], 160, '#f0c8a0', 0.05, f' filter="url(#{C.blur(30)})"')
C.a('</g>')

# ------------------------------------------------------------------ distant land
hl = smooth_d([(-20, 620), (120, 596), (260, 606), (400, 590), (560, 606), (700, 612), (742, 614), (742, 700), (-20, 700)], 4)
C.path(hl, '#141634')
C.path(smooth_d([(-20, 616), (120, 593), (260, 603), (400, 587), (560, 603), (700, 609), (742, 611), (742, 618), (-20, 622)], 4), '#5a5aa0', 0.5, f' filter="url(#{C.blur(2)})"')
# city on the right horizon
C.path(smooth_d([(742, 614), (860, 606), (1000, 612), (1200, 604), (1505, 610), (1505, 700), (742, 700)], 4), '#24181a')
bx = 790
lit = []
while bx < 1490:
    w = R.uniform(18, 46)
    h = R.uniform(8, 30) * (0.5 + 0.5 * min(1, (bx - 760) / 300))
    if R.random() < 0.12:
        h *= 1.8
    top = 610 - h
    C.a(f'<rect x="{f(bx)}" y="{f(top)}" width="{f(w)}" height="{f(h+6)}" fill="{R.choice(["#3a2622", "#40281f", "#36241f"])}" opacity="0.7" filter="url(#{C.blur(1.5)})"/>')
    for _ in range(int(w * h / 260)):
        lit.append((bx + R.uniform(3, w - 4), top + R.uniform(4, h - 2)))
    bx += w + R.uniform(-4, 3)

C.a(f'<rect x="742" y="560" width="760" height="56" fill="#ffa050" opacity="0.18" filter="url(#{C.blur(12)})"/>')

# ------------------------------------------------------------------ meadow
mg1 = C.lg([(0, '#1a2c44'), (0.4, '#122236'), (1, '#070c18')], 0, 612, 0, 850)
C.path('M-10 618L1495 614L1495 860L-10 860Z', f'url(#{mg1})')
mg2 = C.lg([(0, '#4a3624'), (0.4, '#30241a'), (1, '#120c0a')], 0, 612, 0, 850)
C.path('M-10 618L1495 614L1495 860L-10 860Z', f'url(#{mg2})', 1, f' mask="url(#{mk})"')
C.a(f'<rect x="{f(MID-40)}" y="610" width="80" height="250" fill="#2a2a34" opacity="0.6" filter="url(#{C.blur(26)})"/>')
# distant grass texture
for side in (0, 1):
    cols = (['#25405a', '#1a3046', '#3c6274'] if side == 0 else ['#5c4630', '#3e2e1e', '#7a5a38'])
    for ci, col in enumerate(cols):
        items = []
        for _ in range(260):
            x = R.uniform(0, 742) + side * 742
            x = x + (R.uniform(-60, 60) if abs(x - MID) < 60 else 0)
            y = R.uniform(625, 850)
            sc = 0.4 + (y - 620) / 230 * 1.4
            items.append((x, y, R.uniform(10, 24) * sc, R.uniform(-7, 7) * sc, R.uniform(1.0, 1.8) * sc))
        blades(C, items, col, 0.55 + ci * 0.1)


# ------------------------------------------------------------------ the figure
def foot(C, hx, gy, k, skin):
    """Bare foot standing flat on the grass, seen from the side, toes to the left. (hx, gy): heel, ground."""
    hi, mid, lo = skin
    P_ = lambda pts: [(hx + x * k, gy + y * k) for x, y in pts]
    d = smooth_d(P_([(2, -1), (8, -7), (6, -15), (-2, -27), (-12, -31), (-22, -25), (-40, -16), (-56, -11), (-66, -9), (-73, -7), (-77, -3), (-74, 0), (-50, -1), (-36, -3), (-20, 0)]), 4)
    C.shaded(d, hi, mid, lo, (hx - 70 * k, gy - 30 * k, hx + 4 * k, gy + 1), light=(-0.3, -0.9), k=5 * k, rough=None)
    C.ell(hx - 8 * k, gy - 20 * k, 4 * k, 3.4 * k, hi, 0.2, f' filter="url(#{C.blur(1.5*k)})"')  # ankle bone
    C.brush(P_([(-58, -9), (-42, -4), (-22, -2)]), 2 * k, lo, 0.35, tin=0.3, tout=0.3)  # arch
    for t in (0, 1, 2, 3):                                                       # toes
        C.brush(P_([(-60 + t * 5, -8 + t * 0.4), (-63 + t * 5, -2)]), 1.2 * k, lo, 0.5, tin=0.2, tout=0.2)
        pass
    C.ell(hx - 74 * k, gy - 5 * k, 2.4 * k, 1.5 * k, '#fff0e8', 0.8)          # big toe nail


def figure(C, phone=False):
    r = 46
    hx, hy = 650, 672
    if not phone:
        skin = ('#ecc4a8', '#9c6a56', '#2e2236')
        cloth = ('#4656b0', '#232c74', '#0c1034')
        hair = ('#4a3240', '#22161e', '#0a0608')
        legc = ('#3a4aa0', '#1e2668', '#0a0e2c')
    else:
        skin = ('#b89a8a', '#6e5450', '#24181c')
        cloth = ('#6e625a', '#433c38', '#181416')
        hair = ('#4a3a36', '#241a18', '#0a0606')
        legc = ('#62584e', '#3a3430', '#141012')
    tp = smooth_d([(612, 690), (606, 652), (584, 628), (548, 615), (510, 616), (470, 628), (430, 638), (394, 644), (362, 658), (348, 690), (356, 714), (602, 716)], 5)
    th = smooth_d([(404, 652), (352, 620), (302, 584), (280, 592), (286, 622), (338, 664), (398, 714)], 4)
    sh = smooth_d([(298, 590), (276, 584), (258, 612), (240, 652), (226, 686), (246, 694), (268, 676), (296, 640), (308, 612)], 4)
    if not phone:
        C.a(f'<g fill="none" stroke="#e8eeff" opacity="0.55" filter="url(#{C.blur(3)})"><path d="{tp}" stroke-width="9"/><path d="{th}" stroke-width="9"/><path d="{sh}" stroke-width="9"/></g>')
        C.a(f'<g fill="none" stroke="#ffffff" opacity="0.7"><path d="{tp}" stroke-width="2.4"/><path d="{th}" stroke-width="2.4"/><path d="{sh}" stroke-width="2.4"/></g>')
    # contact shadow on the grass
    C.a(f'<ellipse cx="430" cy="716" rx="290" ry="14" fill="#04060c" opacity="0.65" filter="url(#{C.blur(7)})"/>')
    # long hair spread on the grass behind the head
    hp = smooth_d([(640, 700), (668, 642), (696, 642), (714, 662), (726, 690), (728, 712), (696, 720), (660, 716)], 4)
    C.shaded(hp, hair[0], hair[1], hair[2], (640, 640, 742, 720), light=(-0.3, -0.9), k=8, rough='roughf')
    for k in range(7):
        y0 = 650 + k * 8 + R.uniform(-3, 3)
        C.brush([(672, y0), (700, y0 + 9 + k * 1.4 + R.uniform(-3, 3)), (722 - k * 0.8, y0 + 20 + k * 1.6)], R.uniform(1.4, 2.6), hair[0], 0.3, tin=0.1, tout=0.7)
    # far leg (behind), a little lower and darker
    fth = smooth_d([(414, 664), (362, 632), (316, 600), (296, 610), (304, 636), (352, 676), (404, 714)], 4)
    fsh = smooth_d([(314, 600), (294, 596), (276, 624), (258, 664), (244, 698), (264, 702), (282, 684), (308, 652), (322, 622)], 4)
    for d_ in (fth, fsh):
        C.shaded(d_, legc[1], legc[2], '#04040c', (240, 590, 420, 716), light=(-0.4, -0.9), k=10, rough='roughf')
    foot(C, 254, 714, 0.9, (skin[1], skin[2], '#140a10'))
    # torso
    tp = smooth_d([(612, 690), (606, 652), (584, 628), (548, 615), (510, 616), (470, 628), (430, 638), (394, 644), (362, 658), (348, 690), (356, 714), (602, 716)], 5)
    C.shaded(tp, cloth[0], cloth[1], cloth[2], (348, 615, 612, 716), light=(-0.1, -1.0), k=20, deep=cloth[2], rough='roughf', hipos=0.5)
    # folds of the shirt
    for (a, b, c) in [((560, 640), (520, 660), (480, 690)), ((500, 632), (470, 650), (440, 690)), ((432, 646), (414, 664), (400, 696))]:
        C.brush([a, b, c], 5, cloth[2], 0.45, tin=0.3, tout=0.5)
        C.brush([(a[0] + 4, a[1] - 3), (b[0] + 4, b[1] - 3)], 3, cloth[0], 0.35, tin=0.3, tout=0.6)
    # near leg: thigh, knee and a shin with its calf
    th = smooth_d([(404, 652), (352, 620), (302, 584), (280, 592), (286, 622), (338, 664), (398, 714)], 4)
    C.shaded(th, legc[0], legc[1], legc[2], (276, 584, 410, 716), light=(-0.2, -1.0), k=14, rough='roughf')
    sh = smooth_d([(298, 590), (276, 584), (258, 612), (240, 652), (226, 686), (246, 694), (268, 676), (296, 640), (308, 612)], 4)
    C.shaded(sh, legc[0], legc[1], legc[2], (222, 584, 310, 696), light=(-0.7, -0.6), k=11, rough='roughf')
    C.ell(288, 592, 16, 12, legc[0], 0.5, f' filter="url(#{C.blur(4)})"')
    C.brush([(300, 616), (292, 644), (272, 672)], 4, legc[2], 0.4, tin=0.3, tout=0.4)
    # rolled hem above the ankle, then a bare foot
    C.ell(236, 690, 17, 8, legc[1], 1, ' transform="rotate(-30 236 690)"')
    foot(C, 234, 716, 1.15, (skin[0], skin[1], skin[1]) if phone else ('#f6dccc', '#c89a84', '#7a5048'))
    # stars woven into the clothes (left only)
    if not phone:
        C.a(f'<g opacity="0.35" filter="url(#{C.blur(9)})" fill="#9a8ae8"><path d="{tp}"/><path d="{th}"/><path d="{sh}"/></g>')
        cid = C.id('c')
        C.defs.append(f'<clipPath id="{cid}"><path d="{tp}"/><path d="{th}"/><path d="{sh}"/></clipPath>')
        C.a(f'<g clip-path="url(#{cid})">')
        C.a(f'<ellipse cx="470" cy="650" rx="120" ry="30" fill="#b89ae0" opacity="0.28" transform="rotate(-8 470 650)" filter="url(#{C.blur(16)})"/>')
        C.a(f'<ellipse cx="320" cy="640" rx="70" ry="22" fill="#e8c8a0" opacity="0.22" transform="rotate(-42 320 640)" filter="url(#{C.blur(12)})"/>')
        pts = []
        for _ in range(260):
            pts.append((R.uniform(200, 615), R.uniform(590, 716), R.choice([0.5, 0.6, 0.8, 1.0, 1.3]), R.uniform(0.4, 1)))
        grain_stars(C, pts, '#f6f0ff')
        for (x, y, s) in [(520, 640, 1.8), (430, 660, 1.5), (300, 620, 1.6), (360, 680, 1.3), (250, 670, 1.2)]:
            sparkle(C, x, y, s, '#fff4e0', 0.85)
        C.a('</g>')
    # head
    C.a(f'<g transform="matrix(0 -1 -1 0 {hx} {hy})">')
    if not phone:
        profile_head(C, r, skin, hair, light=(0.9, 0.3), eye='open', iris='#4a3020', rim='#dce6ff', rim_side=(1, 0), lips='#a8524a',
                     cool=('#dfeaff', 0.55), lid=0.0, mouth_open=True, ear=False)
    else:
        profile_head(C, r, skin, hair, light=(0.9, -0.2), iris='#2a2420', rim='#9cc8ff', rim_side=(1, 0),
                     cool=('#9fd0ff', 0.32), lips='#7a5050', lid=0.5, eye='heavy', ear=False)
    C.a('</g>')
    # collar over the base of the neck
    col = smooth_d([(604, 650), (610, 674), (604, 698), (586, 704), (574, 682), (578, 654)], 4)
    C.shaded(col, cloth[0], cloth[1], cloth[2], (574, 650, 610, 704), light=(0.2, -1), k=6, rough='roughf')
    # near arm: the same pose on both sides
    ua = taper_d([(590, 664), (568, 690), (550, 704)], 40, 33)
    C.shaded(ua, cloth[0], cloth[1], cloth[2], (540, 650, 600, 712), light=(-0.2, -1), k=9, rough='roughf')
    fa = taper_d([(550, 702), (575, 634), (596, 572)], 32, 24)
    C.shaded(fa, cloth[0], cloth[1], cloth[2], (530, 566, 620, 712), light=(0.6, -0.8), k=8, rough='roughf')
    if not phone:
        cid = C.id('c')
        C.defs.append(f'<clipPath id="{cid}"><path d="{ua}"/><path d="{fa}"/><path d="{col}"/></clipPath>')
        C.a(f'<g clip-path="url(#{cid})">')
        grain_stars(C, [(R.uniform(540, 615), R.uniform(566, 712), R.choice([0.5, 0.7, 1.0]), R.uniform(0.4, 1)) for _ in range(45)], '#f6f0ff')
        C.a('</g>')
        # open hand turned to the sky, stardust rising from the palm
        C.glow(606, 528, 80, '#ffe8c0', 0.4)
        hand3(C, 596, 574, 50, -84, ('#f6d8c0', '#c0907a', '#5a3a48'), spread=0.2, thumb_side=-1, thumb_ang=0.9)
    else:
        # phone held above the face and tipped toward us: a small bright blank rectangle, the only light
        C.a(f'<polygon points="618,548 668,520 700,630 600,640" fill="#a8d8ff" opacity="0.22" filter="url(#{C.blur(14)})"/>')
        C.glow(622, 522, 70, '#bfe4ff', 0.5)
        C.a('<g transform="translate(618 528) rotate(-20) scale(0.78) translate(-618 -528)">')
        C.a('<rect x="600" y="489" width="36" height="62" rx="6" fill="#121318"/>')
        g_ = C.lg([(0, '#ffffff'), (0.5, '#dff2ff'), (1, '#9fd2ff')], 0, 492, 0, 548)
        C.a(f'<rect x="603" y="492" width="30" height="56" rx="4" fill="url(#{g_})"/>')
        C.a(f'<rect x="603" y="492" width="30" height="56" rx="4" fill="#ffffff" opacity="0.5" filter="url(#{C.blur(3)})"/>')
        C.a('</g>')
        hand3(C, 594, 582, 46, -60, skin, curl=(0.75, 0.8, 0.8, 0.8), thumb_side=-1, thumb_ang=0.35)

T = 'translate(-20 0) translate(650 712) scale(1.2) translate(-650 -712)'
C.a(f'<g transform="{T}">')
figure(C, phone=False)
C.a('</g>')
C.a(f'<g transform="matrix(-1 0 0 1 1485 0)"><g transform="{T}">')
figure(C, phone=True)
C.a('</g></g>')

# stardust rising from the left figure toward the galaxy
dust = []
for _ in range(110):
    t = R.random() ** 0.8
    x0, y0 = 572, 492
    x = x0 - t * 150 + R.gauss(0, 8 + t * 40)
    y = y0 - t * 300 + R.gauss(0, 8 + t * 30)
    dust.append((x, y, R.choice([0.6, 0.8, 1.0, 1.4]), 0.9 - t * 0.6))
grain_stars(C, dust, '#fff2d8')

# grass in front of the bodies, in clumps of different heights
for side in (0, 1):
    cols = (['#16283a', '#24425a', '#3e6a7c', '#6a98a8'] if side == 0 else ['#2e2418', '#4e3c2a', '#76583a', '#9a7a4e'])
    groups = {c: [] for c in cols}
    for _ in range(95):
        cx_ = R.uniform(140, 742) if side == 0 else R.uniform(742, 1345)
        cy_ = R.uniform(712, 730) if R.random() < 0.55 else R.uniform(745, 852)
        big = 1 + (cy_ - 712) / 70
        n = R.randint(4, 11)
        for _ in range(n):
            lean = R.uniform(-1, 1)
            h = R.uniform(8, 30) * big * R.choice([0.6, 1, 1, 1.4])
            col = R.choice(cols[:3]) if R.random() < 0.85 else cols[3]
            groups[col].append((cx_ + R.uniform(-8, 8) * big, cy_, h, lean * h * 0.5, R.uniform(1.0, 2.2) * min(big, 2.2)))
    for ci, col in enumerate(cols):
        blades(C, groups[col], col, 0.85)

# vignette
vg = C.rg([(0, '#000', 0), (0.7, '#000', 0), (1, '#000', 0.55)], 742, 425, 900)
C.a(f'<rect width="1485" height="850" fill="url(#{vg})"/>')

finish(C, OUT_SVG.format(1), OUT_PNG.format(1))
