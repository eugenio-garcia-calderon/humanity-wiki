"""Mes 7 · Hogar y Vivienda · Diseño 3.
The same house twice, side by side at the centre. Left: open, windows lit, a vegetable patch,
a woman walking home with a basket and neighbours behind her. Right: the same house sealed
under a glass bell jar on a pedestal of gold coins, dark and cold, a trophy; outside, in the rain,
the same woman with a suitcase presses her hand on the glass, at the head of a queue."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos3/gen')
from fig import *
from comun import finish

C = Canvas(seed=707)
r = C.r
OUT_SVG = '/home/claude/humanity-wiki/design/calendario-arte/ilustraciones-fuente/mes-07-c.svg'
OUT_PNG = '/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos3/mes-07-c.png'

SPLIT = 742
HORIZON = 560
FEET = 805
HL = (560, 600)      # left house: centre x, base y
u = 76
SK = SKIN['brown']
WR = 1290
SKD = tint(SK, '#5a6680', 0.3)
COAT = ('#7a8498', '#4e566a', '#1c2030')
RKW = dict(light=(0.15, -1.0), lean=14, arms=((34, 162), (14, 22)), legs=((-2, -2), (-12, -8)), eyes='open', hairstyle='bun', tilt=-2,
           hands=(('open', 0.0, 176, 0.4), ('grip', 0.9)), skirt=(0.85, 0.3, COAT), sleeve=0.95, bust=0.5, feet='shoe', lit=0.5,
           far_dim=0.3, dim_col='#141826', lip='#8a5048', order=['fararm', 'farleg', 'nearleg', 'torso', 'head', 'neararm'],
           feat=dict(nose=1.05, lips=1.15))
_J = person(Canvas(), (WR, FEET - 3.5 * u - 0.27 * u), u, -1, SKD, COAT, None, ('#3a2a20', '#22160e', '#080402'), **RKW)
GLASS_X = _J['wrist0'][0] - 4
HR = (GLASS_X - 150, 560)      # right house sits on the coin pedestal
HW, HH, RH = 240, 160, 105

# ================= SKY =================
sky = C.lg([(0, '#f2b878'), (0.45, '#f8d8a0'), (1, '#fbe8c4')], 0, 0, 0, HORIZON)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{sky})"/>')
C.glow(260, 430, 600, '#fff0c8', 0.75)
for k in range(26):
    y = r.uniform(20, 470)
    x = r.uniform(-50, 700)
    C.brush([(x, y), (x + r.uniform(120, 260), y + r.uniform(-8, 8))], r.uniform(6, 14), r.choice(['#fff4dc', '#f6c88c', '#fbe0b0']), 0.3, tin=0.4, tout=0.5)
# dark half
mask = C.lg([(0, '#000'), (0.485, '#000'), (0.515, '#fff'), (1, '#fff')], 0, 0, W, 0)
mid = C.id('m')
C.defs.append(f'<mask id="{mid}"><rect width="{W}" height="{H}" fill="url(#{mask})"/></mask>')
C.a(f'<g mask="url(#{mid})">')
night = C.lg([(0, '#151a2c'), (0.6, '#28304a'), (1, '#3a4258')], 0, 0, 0, HORIZON)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{night})"/>')
for k in range(22):
    y = r.uniform(20, 470)
    x = r.uniform(760, 1500)
    C.brush([(x, y), (x + r.uniform(120, 260), y + r.uniform(-8, 8))], r.uniform(10, 24), r.choice(['#0e1220', '#2a3248', '#1a2034']), 0.4, tin=0.4, tout=0.5)
C.a('</g>')

# distant ground band (hills left, city haze right)
for (yb, amp, cols) in [(HORIZON, 26, ('#c8c890', '#9aa86a', '#6a7a48'))]:
    pts = [(-20, yb + 20)]
    for k in range(10):
        pts.append((-20 + k * 90, yb - amp * (0.5 + 0.5 * math.sin(k * 1.4))))
    pts += [(860, yb + 20), (860, 900), (-20, 900)]
    C.a(f'<g mask="url(#GM)">')
    C.shaded(smooth_d(pts, 4), *cols, (-20, yb - amp, 860, 900), light=(-0.8, -0.5), k=14, hl=False, rough='rough')
    C.a('</g>')

gm = C.lg([(0, '#fff'), (0.485, '#fff'), (0.515, '#000'), (1, '#000')], 0, 0, W, 0)
C.defs.append(f'<mask id="GM"><rect width="{W}" height="{H}" fill="url(#{gm})"/></mask>')
# ================= GROUND =================
C.a(f'<g mask="url(#{mid})">')
pv = C.lg([(0, '#3a4256'), (1, '#141824')], 0, HORIZON - 10, 0, H)
C.a(f'<rect x="0" y="{HORIZON-10}" width="{W}" height="{H}" fill="url(#{pv})"/>')
# wet reflections
for k in range(40):
    x = r.uniform(760, 1480)
    y = r.uniform(HORIZON + 20, 840)
    C.brush([(x, y), (x + r.uniform(30, 90), y)], r.uniform(1.5, 3.5), '#8aa0c0', r.uniform(0.15, 0.35), tin=0.4, tout=0.4)
C.a('</g>')
gid = 'GM'
C.a(f'<g mask="url(#{gid})">')
gr = C.lg([(0, '#a8b868'), (0.5, '#7a9440'), (1, '#4e6a2a')], 0, HORIZON, 0, H)
C.a(f'<rect x="-10" y="{HORIZON+20}" width="900" height="{H}" fill="url(#{gr})"/>')
C.path(smooth_d([(-20, HORIZON + 5), (400, HORIZON - 4), (900, HORIZON + 6), (900, 900), (-20, 900)], 4), f'url(#{gr})', 1, ' filter="url(#rough)"')
for k in range(220):
    x = r.uniform(-10, 820)
    y = r.uniform(HORIZON + 10, 845)
    hgt = r.uniform(6, 20) * (0.5 + (y - HORIZON) / 200)
    col = r.choice(['#d8de88', '#a8c060', '#6a8a38', '#4a6a28'])
    C.brush([(x, y), (x + 2, y - hgt * 0.6), (x + r.uniform(-4, 6), y - hgt)], r.uniform(2, 3.2), col, 0.6, tin=0, tout=0.8)
C.a('</g>')


# ================= HOUSE =================
def house(cx, by, lit):
    x0, x1 = cx - HW / 2, cx + HW / 2
    yt = by - HH
    if lit:
        wall = ('#fbe6c4', '#e8c08e', '#9a6a44')
        roof = ('#e88a5a', '#b8502e', '#5a2010')
        win = '#ffd27a'
    else:
        wall = ('#9aa0b0', '#6a7080', '#2a2e3a')
        roof = ('#6a6070', '#40384a', '#16121c')
        win = '#0c0e16'
    light = (-0.75, -0.5) if lit else (0.0, -1.0)
    C.ell(cx + 18, by + 4, HW * 0.62, 12, '#100810', 0.45, f' filter="url(#{C.blur(6)})"')
    # chimney
    part(C, poly_d([(x1 - 62, yt - 70), (x1 - 34, yt - 70), (x1 - 34, yt - 10), (x1 - 62, yt - 10)]), roof, light, 6, rough='roughf')
    # walls
    part(C, poly_d([(x0, by), (x0, yt), (x1, yt), (x1, by)]), wall, light, 26, rough='roughf')
    # roof
    rp = [(x0 - 22, yt + 6), (cx, yt - RH), (x1 + 22, yt + 6)]
    part(C, poly_d(rp), roof, light, 18, rough='roughf', shadow=(0, 8, 6, 0.35))
    for k in range(6):  # tile courses
        t = (k + 1) / 7
        a = lerp(rp[1], rp[0], t)
        b = lerp(rp[1], rp[2], t)
        C.line([a, (cx, a[1] - 2), b], 2, roof[2], 0.35)
    # windows and door
    for wx in (x0 + 52, x1 - 52):
        wy = yt + 64
        if lit:
            C.glow(wx, wy, 60, '#ffc860', 0.55)
        C.a(f'<rect x="{wx-24}" y="{wy-26}" width="48" height="52" rx="3" fill="{wall[2]}"/>')
        g = C.rg([(0, '#fff2c0'), (0.5, win), (1, '#e8902a')], wx - 6, wy - 8, 40) if lit else None
        C.a(f'<rect x="{wx-20}" y="{wy-22}" width="40" height="44" rx="2" fill="{"url(#"+g+")" if lit else win}"/>')
        C.line([(wx, wy - 22), (wx, wy + 22)], 3, wall[2], 0.9)
        C.line([(wx - 20, wy), (wx + 20, wy)], 3, wall[2], 0.9)
        C.a(f'<rect x="{wx-27}" y="{wy+24}" width="54" height="6" fill="{wall[0]}"/>')
        if lit:
            # flower box
            for k in range(6):
                ball(C, wx - 20 + k * 8, wy + 22, 5, '#ff9a8a', '#d84a3a', '#7a1a10', k=2, rough=None)
    dx, dw, dh = cx, 46, 84
    C.a(f'<rect x="{dx-dw/2-5}" y="{by-dh-5}" width="{dw+10}" height="{dh+5}" fill="{wall[2]}"/>')
    if lit:
        dg = C.lg([(0, '#fff4c8'), (1, '#ffb850')], 0, by - dh, 0, by)
        C.a(f'<rect x="{dx-dw/2}" y="{by-dh}" width="{dw}" height="{dh}" fill="url(#{dg})"/>')
        # door leaf swung open
        C.path(poly_d([(dx - dw / 2, by - dh), (dx - dw / 2 - 20, by - dh + 8), (dx - dw / 2 - 20, by + 4), (dx - dw / 2, by)]), '#8a4a28')
        # a neighbour in the doorway, waving, against the warm light
        fx_, fy_ = dx + 4, by
        C.ell(fx_, fy_ - 58, 7, 8, '#4a2a18')
        C.path(smooth_d([(fx_ - 9, fy_ - 48), (fx_ + 9, fy_ - 48), (fx_ + 11, fy_ - 20), (fx_ + 7, fy_), (fx_ - 7, fy_), (fx_ - 11, fy_ - 20)], 3), '#5a3420')
        C.line([(fx_ + 8, fy_ - 44), (fx_ + 20, fy_ - 58), (fx_ + 22, fy_ - 74)], 4.5, '#5a3420', 1)
        C.line([(fx_ - 8, fy_ - 44), (fx_ - 12, fy_ - 26)], 4.5, '#5a3420', 1)
        # light spilling onto the path
        C.path(poly_d([(dx - dw / 2, by), (dx + dw / 2, by), (dx + 70, by + 120), (dx - 90, by + 120)]), '#fff0b0', 0.4, f' filter="url(#{C.blur(10)})"')
    else:
        C.a(f'<rect x="{dx-dw/2}" y="{by-dh}" width="{dw}" height="{dh}" fill="#20222e"/>')
        C.line([(dx - dw / 2 + 6, by - dh + 8), (dx - dw / 2 + 6, by - 4)], 2, '#3a3e4c', 0.8)


# ---------- left house, path and vegetable patch ----------
house(HL[0], HL[1], True)
C.path(smooth_d([(HL[0] - 20, HL[1]), (HL[0] + 22, HL[1]), (HL[0] - 20, 690), (HL[0] - 120, 790), (HL[0] - 160, 860), (HL[0] - 340, 860), (HL[0] - 240, 790), (HL[0] - 80, 690)], 3),
       '#e8c890', 0.75, ' filter="url(#rough)"')
for row in range(4):
    y = HL[1] + 30 + row * 26
    for k in range(7):
        x = HL[0] + 48 + k * 26 + row * 10
        if x > 720:
            continue
        s = 7 + row * 2.5
        for a in (-60, -100, -130, -20):
            C.path(leaf_d(x, y, s * 1.6, s * 0.5, a + r.uniform(-12, 12)), r.choice(['#5a8a30', '#8ab848', '#3a6a22']), 0.95)
    C.brush([(HL[0] + 40 + row * 10, y + 4), (HL[0] + 230 + row * 10, y + 4)], 4, '#6a4a28', 0.4, tin=0.1, tout=0.1)
# chimney smoke curling up
for k in range(6):
    sx, sy = HL[0] + HW / 2 - 48 + k * 8, HL[1] - HH - 80 - k * 34
    C.ell(sx + math.sin(k) * 10, sy, 18 + k * 5, 12 + k * 3, '#fff6e8', 0.35 - k * 0.04, f' filter="url(#{C.blur(6+k)})"')

# ---------- right: gold-coin pedestal, house, bell jar, spotlight ----------
px_, pbase = HR[0], 640
# spotlight cone from above
cone = C.lg([(0, '#e8f2ff', 0.45), (1, '#a0b8e0', 0.0)], 0, 0, 0, pbase)
C.path(poly_d([(px_ - 40, -10), (px_ + 40, -10), (px_ + 220, pbase), (px_ - 220, pbase)]), f'url(#{cone})', 1, f' filter="url(#{C.blur(18)})"')
C.ell(px_ + 10, pbase + 6, 210, 16, '#05060c', 0.6, f' filter="url(#{C.blur(8)})"')
CH, CR = 30, 17     # coin thickness, ellipse half-height of the faces
yb = pbase
for (dx, rw) in [(0, 196), (10, 184), (-8, 174)]:
    cx_ = px_ + dx
    yt_ = yb - CH
    edge = C.lg([(0, '#6a4208'), (0.18, '#e8b840'), (0.32, '#fff0a0'), (0.5, '#d8a030'), (0.8, '#8a5a10'), (1, '#4a2a04')], cx_ - rw, 0, cx_ + rw, 0)
    C.a(f'<path d="M{f(cx_-rw)} {f(yt_)}V{f(yb)}A{f(rw)} {CR} 0 0 0 {f(cx_+rw)} {f(yb)}V{f(yt_)}Z" fill="url(#{edge})"/>')
    # milled rim: fine vertical ridges on the edge only
    n = 64
    for j in range(n):
        t = (j + 0.5) / n
        x = cx_ - rw + t * 2 * rw
        k_ = math.sqrt(max(0, 1 - ((x - cx_) / rw) ** 2))
        C.line([(x, yt_ + CR * k_ + 3), (x, yb + CR * k_ - 3)], 1.6, '#5a3808' if j % 2 else '#fff0b0', 0.35)
    C.a(f'<path d="M{f(cx_-rw)} {f(yb)}A{f(rw)} {CR} 0 0 0 {f(cx_+rw)} {f(yb)}" fill="none" stroke="#3a2004" stroke-width="2" opacity="0.6"/>')
    face_ = C.rg([(0, '#fff6c0'), (0.5, '#f0c048'), (1, '#a87018')], cx_ - rw * 0.3, yt_ - 4, rw * 1.1)
    C.ell(cx_, yt_, rw, CR, f'url(#{face_})')
    C.ell(cx_, yt_, rw * 0.84, CR * 0.8, 'none', 1, ' stroke="#b8861e" stroke-width="3" opacity="0.7"')
    C.ell(cx_, yt_ - 1, rw * 0.84, CR * 0.8, 'none', 1, ' stroke="#fff4c0" stroke-width="1.5" opacity="0.6"')
    yb = yt_
top = yb
HR = (px_, top + 2)
house(HR[0], HR[1], False)
# bell jar (glass cloche)
jx0, jx1 = px_ - 150, px_ + 150
jtop = HR[1] - HH - RH - 70
jar = (f'M{jx0} {top}V{jtop+150}C{jx0} {jtop+40} {jx0+60} {jtop} {px_} {jtop}C{jx1-60} {jtop} {jx1} {jtop+40} {jx1} {jtop+150}V{top}Z')
C.path(jar, '#c8dcf8', 0.10)
C.path(jar, 'none', 1, ' stroke="#e8f2ff" stroke-width="3" opacity="0.65"')
# glass highlights: long vertical reflections and the knob
C.brush([(jx0 + 22, top - 20), (jx0 + 20, jtop + 160), (jx0 + 40, jtop + 70)], 12, '#ffffff', 0.45, tin=0.2, tout=0.3)
C.brush([(jx0 + 44, top - 60), (jx0 + 42, jtop + 170)], 4, '#ffffff', 0.35, tin=0.3, tout=0.3)
C.brush([(jx1 - 24, top - 30), (jx1 - 22, jtop + 170)], 7, '#d8e8ff', 0.3, tin=0.3, tout=0.3)
C.brush([(px_ - 70, jtop + 18), (px_, jtop + 6), (px_ + 60, jtop + 16)], 6, '#ffffff', 0.45, tin=0.3, tout=0.3)
ball(C, px_, jtop - 14, 16, '#f0f6ff', '#a8bcd8', '#4a5a78', k=4, rough=None)
C.ell(px_, top + 1, 152, 7, '#e8f2ff', 0.25)

refl = C.lg([(0, '#f8d060', 0.45), (1, '#c89020', 0)], 0, 650, 0, 790)
C.path(poly_d([(px_ - 175, 650), (px_ + 175, 650), (px_ + 150, 790), (px_ - 150, 790)]), f'url(#{refl})', 1, f' filter="url(#{C.blur(10)})"')
for k in range(9):
    y = 668 + k * 13
    C.brush([(px_ - 150 + r.uniform(0, 40), y), (px_ + 150 - r.uniform(0, 40), y)], 2.5, '#ffe890', 0.25 - k * 0.02, tin=0.3, tout=0.3)
# ================= RAIN (right only, never inside the jar) =================
def raindrop_ok(x, y):
    return not (jx0 - 6 < x < jx1 + 6 and y > jtop - 30 and y < top + 10)


for (n, w_, op, L0, L1) in [(420, 1.0, 0.25, 10, 20), (200, 1.5, 0.4, 18, 34), (40, 2.4, 0.5, 40, 70)]:
    rain = []
    for k in range(n):
        x = r.uniform(770, 1490)
        y = r.uniform(-20, 840) * (r.random() ** 0.25 if k % 3 == 0 else 1)
        if not raindrop_ok(x, y):
            continue
        L = r.uniform(L0, L1)
        slant = 0.12 + 0.12 * math.sin(x / 140 + y / 260)   # gusts
        rain.append(f'M{f(x)} {f(y)}l{f(-L*slant)} {f(L)}')
    C.a(f'<path d="{"".join(rain)}" stroke="#c0d0ee" stroke-width="{w_}" opacity="{op}" fill="none" stroke-linecap="round"/>')
# splashes on the pavement
for k in range(50):
    x, y = r.uniform(780, 1480), r.uniform(700, 840)
    C.ell(x, y, r.uniform(3, 7), 1.4, '#c8d8f0', 0.35)
# splashes beading on the jar's dome
for k in range(30):
    a = r.uniform(0.15, 0.85) * math.pi
    x = px_ - math.cos(a) * 150
    y = jtop + 150 - math.sin(a) * 150 * (150 / 150) + 10
    if y < jtop:
        y = jtop + 4
    C.ell(x, y, 2, 3, '#e8f2ff', 0.6)


# ================= SUITCASE & BASKET =================
def trolley(x, y, w, h, hand_y, cols, light):
    """Rolling suitcase standing on the ground at (x, y) with its handle raised to hand_y."""
    C.line([(x - w * 0.18, y - h), (x - w * 0.18, hand_y)], max(w * 0.05, 2), '#2a2a30', 1)
    C.line([(x + w * 0.18, y - h), (x + w * 0.18, hand_y)], max(w * 0.05, 2), '#2a2a30', 1)
    C.line([(x - w * 0.24, hand_y), (x + w * 0.24, hand_y)], max(w * 0.09, 3), '#1a1a20', 1)
    suitcase(x, y - w * 0.08, w, h, cols, light)
    for wx in (x - w * 0.36, x + w * 0.36):
        C.ell(wx, y - 2, w * 0.07, w * 0.07, '#141418')


def suitcase(x, y, w, h, cols, light):
    part(C, f'M{x-w/2+6} {y-h}H{x+w/2-6}Q{x+w/2} {y-h} {x+w/2} {y-h+6}V{y-6}Q{x+w/2} {y} {x+w/2-6} {y}H{x-w/2+6}Q{x-w/2} {y} {x-w/2} {y-6}V{y-h+6}Q{x-w/2} {y-h} {x-w/2+6} {y-h}Z',
         cols, light, w * 0.2, rough=None, shadow=(6, 4, 4, 0.4))
    C.line([(x - w / 2 + 4, y - h * 0.5), (x + w / 2 - 4, y - h * 0.5)], 2, cols[2], 0.5)
    for sx in (x - w * 0.25, x + w * 0.25):
        C.line([(sx, y - h + 2), (sx, y - 2)], 2.5, cols[2], 0.5)
    C.a(f'<path d="M{x-w*0.18} {y-h}V{y-h-h*0.12}H{x+w*0.18}V{y-h}" fill="none" stroke="{cols[2]}" stroke-width="{f(max(w*0.06,1.5))}"/>')


# ================= FIGURES =================
HAIR = ('#5a3420', '#321a0e', '#120604')
TOPL = ('#f4c890', '#d88a48', '#7a3e18')
SKIRT = ('#c86a4a', '#9a3e26', '#4a160a')
LL = (-0.75, -0.55)


def woman_from_behind(cx, fy, u):
    """Seen from behind, three-quarter, walking up the path toward her door (to the right)."""
    y0 = fy - 7.3 * u
    yw = y0 + 2.95 * u
    # cast shadow on the grass, long and warm
    C.path(smooth_d([(cx - 50, fy), (cx + 140, fy - 18), (cx + 300, fy - 26), (cx + 160, fy + 4), (cx - 30, fy + 12)], 3), '#1e3010', 0.35, f' filter="url(#{C.blur(8)})"')
    # feet: back foot with the heel lifted (sole shows), front foot further up the path
    part(C, ellp(cx + 0.32 * u, fy - 0.32 * u, 0.16 * u, 0.12 * u), ('#8a5a3a', '#5a3420', '#2a160a'), LL, 3, rough=None)
    part(C, smooth_d([(cx - 0.42 * u, fy - 0.05 * u), (cx - 0.12 * u, fy - 0.08 * u), (cx - 0.1 * u, fy - 0.4 * u), (cx - 0.4 * u, fy - 0.38 * u)], 3),
         ('#c89a70', '#8a5a3a', '#3a2010'), LL, 4, rough=None)
    # far (right) arm hangs, slightly forward
    rs, re, rw_ = (cx + 0.8 * u, y0 + 1.78 * u), (cx + 1.0 * u, y0 + 2.85 * u), (cx + 1.02 * u, y0 + 3.9 * u)
    limb(C, [rs, re], [0.24 * u, 0.15 * u], tint(SK, '#3a2010', 0.25), LL)
    limb(C, [re, lerp(re, rw_, 0.25), rw_], [0.15 * u, 0.17 * u, 0.1 * u], tint(SK, '#3a2010', 0.25), LL)
    hand(C, rw_, 4, 0.75 * u, tint(SK, '#3a2010', 0.25), LL, curl=0.35, palm=1)
    # skirt, swinging a little with the step
    hem = fy - 0.3 * u
    sk = [(cx - 0.6 * u, yw), (cx + 0.62 * u, yw), (cx + 0.85 * u, (yw + hem) / 2), (cx + 1.12 * u, hem - 0.05 * u),
          (cx + 0.3 * u, hem + 0.06 * u), (cx - 0.5 * u, hem + 0.02 * u), (cx - 1.0 * u, hem - 0.08 * u), (cx - 0.82 * u, (yw + hem) / 2)]
    part(C, smooth_d(sk, 4), SKIRT, LL, 0.4 * u, shadow=(10, 6, 8, 0.25))
    for k in range(6):
        x0 = cx - 0.5 * u + k * 0.2 * u
        C.brush([(x0, yw + 0.3 * u), (x0 + (k - 2.5) * 0.04 * u, (yw + hem) / 2), (x0 + (k - 2.5) * 0.1 * u, hem - 0.1 * u)],
                0.07 * u, SKIRT[2] if k % 2 else SKIRT[0], 0.35, tin=0.4, tout=0.2)
    # near (left) arm bent, the basket hanging in the crook of the elbow
    ls, le, lw_ = (cx - 0.8 * u, y0 + 1.78 * u), (cx - 1.05 * u, y0 + 2.75 * u), (cx - 0.7 * u, y0 + 3.45 * u)
    limb(C, [ls, le], [0.25 * u, 0.16 * u], SK, LL)
    limb(C, [le, lerp(le, lw_, 0.25), lw_], [0.16 * u, 0.17 * u, 0.1 * u], SK, LL)
    # blouse: back, shoulder blades, spine crease, short sleeves in one piece
    half = [(0.28, 1.18), (0.72, 1.3), (0.98, 1.55), (1.06, 1.95), (0.84, 2.06), (0.66, 2.45), (0.56, 2.95)]
    bl = [(cx - x * u, y0 + y * u) for x, y in half] + [(cx + x * u, y0 + y * u + 0.1 * u) for x, y in half[::-1]]
    bl[len(half) - 1] = (cx - 0.58 * u, yw + 0.1 * u)
    bl[len(half)] = (cx + 0.6 * u, yw + 0.1 * u)
    part(C, smooth_d(bl, 4), TOPL, LL, 0.35 * u, shadow=(8, 8, 8, 0.25))
    C.brush([(cx + 0.02 * u, y0 + 1.4 * u), (cx, y0 + 2.2 * u), (cx + 0.03 * u, yw)], 0.07 * u, TOPL[2], 0.35, tin=0.3, tout=0.3)
    for side in (-1, 1):
        C.ell(cx + side * 0.45 * u, y0 + 1.75 * u, 0.3 * u, 0.22 * u, TOPL[0] if side < 0 else TOPL[2], 0.3, f' filter="url(#{C.blur(u*0.08)})"')
    C.line([(cx - 0.66 * u, yw + 0.08 * u), (cx + 0.68 * u, yw + 0.08 * u)], 0.08 * u, '#7a3e18', 0.6)
    bx, by = le[0] - 0.05 * u, le[1] + 0.5 * u
    C.a(f'<path d="M{f(bx-0.5*u)} {f(by)}Q{f(bx)} {f(by-0.9*u)} {f(bx+0.5*u)} {f(by)}" fill="none" stroke="#7a4a20" stroke-width="{f(0.07*u)}"/>')
    for (lx, ly, a, c) in [(-0.3, -0.15, -110, '#4a8a2a'), (-0.1, -0.25, -85, '#7ab840'), (0.12, -0.2, -60, '#3a6a20'), (0.3, -0.1, -40, '#8ac848')]:
        C.path(leaf_d(bx + lx * u, by + ly * u + 8, 0.42 * u, 0.13 * u, a), c)
    ball(C, bx + 0.25 * u, by - 0.12 * u, 0.13 * u, '#ffa070', '#e04a28', '#7a1a08', k=3, rough=None)
    part(C, smooth_d([(bx - 0.56 * u, by - 0.1 * u), (bx + 0.5 * u, by - 0.1 * u), (bx + 0.38 * u, by + 0.42 * u), (bx - 0.44 * u, by + 0.42 * u)], 3),
         ('#e8b870', '#b07a38', '#5a3814'), LL, 8, rough='roughf')
    for k in range(4):
        C.line([(bx - 0.52 * u, by + (k * 0.11) * u), (bx + 0.45 * u, by + (k * 0.11) * u)], 1.6, '#6a4218', 0.5)
    hand(C, lw_, 150, 0.7 * u, SK, LL, curl=0.5, palm=-1)
    # neck, the edge of her cheek and ear as she turns toward the door, then the hair and bun
    limb(C, [(cx, y0 + 1.25 * u), (cx + 0.02 * u, y0 + 0.92 * u)], [0.23 * u, 0.21 * u], SK, LL, sheen=False)
    hx, hy = cx + 0.04 * u, y0 + 0.6 * u
    part(C, ellp(hx + 0.12 * u, hy + 0.08 * u, 0.36 * u, 0.48 * u), SK, LL, 0.1 * u)
    C.ell(hx + 0.4 * u, hy + 0.08 * u, 0.07 * u, 0.13 * u, SK[1])
    C.ell(hx + 0.41 * u, hy + 0.08 * u, 0.04 * u, 0.08 * u, SK[2], 0.5)
    hair = smooth_d([(hx - 0.4 * u, hy + 0.05 * u), (hx - 0.36 * u, hy - 0.36 * u), (hx, hy - 0.52 * u), (hx + 0.34 * u, hy - 0.38 * u),
                     (hx + 0.36 * u, hy - 0.02 * u), (hx + 0.3 * u, hy + 0.3 * u), (hx + 0.12 * u, hy + 0.5 * u), (hx - 0.18 * u, hy + 0.48 * u), (hx - 0.36 * u, hy + 0.3 * u)], 5)
    part(C, hair, HAIR, LL, 0.12 * u, rough='roughf')
    for k in range(9):
        t = k / 8
        C.brush([(hx - 0.32 * u + t * 0.6 * u, hy + 0.42 * u), (hx - 0.2 * u + t * 0.42 * u, hy), (hx - 0.02 * u + t * 0.06 * u, hy - 0.32 * u)],
                0.04 * u, HAIR[0] if k % 3 == 0 else HAIR[2], 0.4, tin=0.3, tout=0.4)
    part(C, circ(hx - 0.02 * u, hy - 0.3 * u, 0.22 * u), HAIR, LL, 0.07 * u, rough='roughf')
    C.brush([(hx - 0.2 * u, hy - 0.38 * u), (hx - 0.05 * u, hy - 0.46 * u), (hx + 0.1 * u, hy - 0.4 * u)], 0.04 * u, HAIR[0], 0.6, tin=0.3, tout=0.3)


woman_from_behind(330, FEET + 10, 72)

# --- right: the queue in the rain (depth): two different people ---
# an older man with a cap and a beard, pulling a trolley
QM = person(Canvas(), (1462, 690 - 3.55 * 48 - 0.27 * 48), 48, -1, SKIN['light'], ('#7a6a5a',) * 3, None, ('#bab0a4',) * 3, arms=((-8, -14), (4, 2)))
trolley(QM['wrist0'][0] + 4, 694, 46, 62, QM['wrist0'][1] + 22, ('#5a5a6a', '#3a3a48', '#14141c'), (0, -1))
person(C, (1462, 690 - 3.55 * 48 - 0.27 * 48), 48, -1, tint(SKIN['light'], '#5a6278', 0.45), ('#7a6a5a', '#4e4236', '#1c1610'),
       ('#4a4a54', '#2e2e36', '#101014'), ('#bab0a4', '#8a8074', '#3a342e'), light=(0.0, -1.0), lean=8, bend=0.3,
       arms=((-8, -14), (4, 2)), legs=((2, 0), (-4, -3)), eyes='down', hairstyle='short', hands=(('grip', 0.9), ('open', 0.2)),
       sleeve=0.95, far_dim=0.35, dim_col='#1a1e2c', tilt=-14, feet='shoe', beard=('#c8c0b4', '#9a9084', '#4a443c'),
       feat=dict(nose=1.25, chin=-0.01, jaw=0.02, lips=0.85))
# a young woman with long hair holding a bundle against her chest
person(C, (1392, 712 - 3.55 * 54 - 0.27 * 54), 54, -1, tint(SKIN['dark'], '#5a6278', 0.35), ('#8a4a52', '#5a2a34', '#200c12'),
       None, ('#2a1a14', '#160c08', '#060202'), light=(0.0, -1.0), lean=2,
       arms=((22, 98), (16, 94)), legs=((2, 0), (-5, -3)), eyes='down', hairstyle='long', hands=(('open', 0.5, 120), ('open', 0.5, 120)),
       sleeve=0.95, far_dim=0.35, dim_col='#1a1e2c', tilt=-8, feet='shoe', skirt=(0.9, 0.2, ('#6a3a44', '#4a2430', '#1a0a10')),
       feat=dict(nose=0.85, lips=1.35, chin=0.01), order=['farleg', 'nearleg', 'fararm', 'torso', 'neararm', 'head'])
part(C, smooth_d([(1318, 455), (1352, 440), (1384, 452), (1380, 482), (1340, 490), (1316, 478)], 3), ('#a89a80', '#6a5e4c', '#2a2418'), (0, -1), 8)

# --- the same woman: far hand on her trolley behind her, near hand flat on the glass, leaning toward the house
w1 = _J['wrist1']
trolley(w1[0] + 6, FEET + 4, 78, 108, w1[1] + 0.45 * u, ('#a07a5a', '#6a4a34', '#24160c'), (0.1, -1))
JR = person(C, (WR, FEET - 3.5 * u - 0.27 * u), u, -1, SKD, COAT, None, ('#3a2a20', '#22160e', '#080402'), **RKW)
# breath of fog on the glass around the pressed palm
w0 = JR['wrist0']
C.ell(GLASS_X - 0.15 * u, w0[1] - 0.35 * u, 0.3 * u, 0.6 * u, '#e8f0ff', 0.38, f' filter="url(#{C.blur(7)})"')
C.brush([(GLASS_X - 2, w0[1] - 0.9 * u), (GLASS_X - 2, w0[1] + 0.2 * u)], 3, '#ffffff', 0.5, tin=0.3, tout=0.3)
C.brush([JR['S'](0.9, -0.4), JR['S'](0.5, -0.45), JR['S'](0.1, -0.55)], 4, '#c8d8f0', 0.35, tin=0.3, tout=0.3)

# vignette
vg = C.rg([(0, '#000', 0), (0.7, '#000', 0), (1, '#000', 0.35)], W / 2, H / 2, 900)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{vg})"/>')
finish(C, OUT_SVG, OUT_PNG)
