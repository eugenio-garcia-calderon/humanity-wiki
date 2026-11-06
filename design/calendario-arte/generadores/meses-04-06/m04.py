"""Mes 4 · Bosque y Naturaleza · Diseño 3.
One immense tree sawn in half from top to bottom. LIGHT (left): living half, a woman hugs it,
glowing roots join her feet, a wild mixed forest behind. SHADOW (right): the half is gone, the
clean cut face shows the wood, it lies stacked as logs with their rings, behind it a monoculture in
rows and the smoke of a fire."""
from fig import *

OUT_SVG = '/home/claude/humanity-wiki/design/calendario-arte/ilustraciones-fuente/mes-04-c.svg'
OUT_PNG = '/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos3/mes-04-c.png'

CUT = 760          # x of the saw cut
GROUND = 792       # ground line near the tree
C = Canvas(seed=44)
r = C.r

# ------------------------------------------------------------------ sky
sky = C.lg([(0, '#f7e6b8'), (0.28, '#f0cf8e'), (0.47, '#d9a272'), (0.56, '#9a6a64'), (0.7, '#5a4652'), (1, '#2e2a36')], 0, 0, W, 0)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{sky})"/>')
vert = C.lg([(0, '#ffffff', 0.0), (0.6, '#ffffff', 0.0), (1, '#fff4d8', 0.25)], 0, 0, 0, 640)
C.a(f'<rect width="{W}" height="640" fill="url(#{vert})"/>')
C.glow(250, 250, 420, '#fff6d6', 0.75)
C.glow(250, 250, 140, '#fffbe8', 0.8)
# warm morning cloud streaks on the left
for (x, y, w, op) in [(60, 120, 360, 0.35), (120, 175, 280, 0.25), (380, 92, 240, 0.22), (20, 380, 300, 0.2)]:
    C.brush([(x, y), (x + w * 0.5, y - 6), (x + w, y + 2)], 16, '#fff8e4', op, tin=0.4, tout=0.4, extra=f' filter="url(#{C.blur(5)})"')

# ------------------------------------------------------------------ smoke (right)
C.glow(1330, 590, 380, '#ff7a2a', 0.55)
C.glow(1330, 600, 160, '#ffb050', 0.6)
smoke = [(1380, 560, 160, 120, '#3a3038', 0.85), (1250, 430, 230, 150, '#43363e', 0.8), (1100, 270, 260, 160, '#4e4048', 0.7),
         (1300, 200, 260, 170, '#2a242c', 0.85), (960, 140, 240, 130, '#5a4a50', 0.5), (1180, 90, 300, 140, '#352c34', 0.8),
         (1420, 330, 180, 220, '#251f27', 0.9), (860, 60, 200, 90, '#6a5658', 0.35)]
for (x, y, rx, ry, col, op) in smoke:
    pts = [(x + math.cos(k / 12 * math.tau) * rx * r.uniform(0.75, 1.1), y + math.sin(k / 12 * math.tau) * ry * r.uniform(0.75, 1.1)) for k in range(12)]
    C.path(smooth_d(pts, 4), col, op, f' filter="url(#{C.blur(28)})"')
# ember-lit undersides of the smoke
for (x, y, rx, ry) in [(1250, 500, 200, 50), (1380, 610, 140, 40), (1120, 340, 180, 40)]:
    C.ell(x, y, rx, ry, '#c8562a', 0.3, f' filter="url(#{C.blur(24)})"')

# ------------------------------------------------------------------ background: wild forest (left)
def wild_layer(y0, cols, op, blur, seed_n, xmax=CUT - 10, sz=(40, 95)):
    pts = [(-20, H)]
    x = -20
    while x < xmax:
        w = r.uniform(*sz)
        h = r.uniform(0.6, 1.4) * w
        kind = r.random()
        if kind < 0.25:  # conifer
            pts += [(x + w * 0.1, y0 - h * 0.3), (x + w * 0.5, y0 - h * 1.25), (x + w * 0.9, y0 - h * 0.3)]
        else:
            for k in range(9):
                a = math.pi + k / 8 * math.pi
                pts.append((x + w / 2 + math.cos(a) * w / 2 * r.uniform(0.9, 1.05), y0 - h * 0.45 + math.sin(a) * h * 0.55 * r.uniform(0.85, 1.05)))
        x += w * r.uniform(0.55, 0.8)
    pts += [(xmax, y0 + 30), (xmax, H)]
    g = C.lg([(0, cols[0]), (1, cols[1])], 0, y0 - 140, 0, y0 + 40)
    C.path(poly_d(catmull(pts, 3), True), f'url(#{g})', op, f' filter="url(#{C.blur(blur)})"')

wild_layer(560, ('#c9c6a0', '#b2b08c'), 0.75, 3, 1, sz=(30, 70))
wild_layer(600, ('#8fa77a', '#6e8a62'), 0.85, 1.6, 2, sz=(45, 100))
wild_layer(650, ('#5f8a52', '#3f6a3c'), 0.95, 0.8, 3, sz=(60, 130))
# sun haze over the distant wood
C.a(f'<rect x="0" y="420" width="{CUT}" height="260" fill="url(#{C.lg([(0, "#fff0c8", 0), (0.5, "#fff0c8", 0.28), (1, "#fff0c8", 0)], 0, 420, 0, 680)})"/>')

# ------------------------------------------------------------------ background: monoculture in rows (right)
VPX, VPY = 1250, 585
C.a(f'<g clip-path="url(#{(lambda c: (C.defs.append(f"<clipPath id=\"{c}\"><rect x=\"{CUT+30}\" y=\"0\" width=\"{W}\" height=\"{H}\"/></clipPath>"), c)[1])(C.id("c"))})">')
# bare, scorched ground plane of the plantation
gp = C.lg([(0, '#6a5050'), (1, '#3a2c2c')], 0, VPY, 0, H)
C.a(f'<rect x="{CUT}" y="{VPY}" width="{W}" height="{H-VPY}" fill="url(#{gp})"/>')
# fire on the horizon behind the plantation
C.glow(1300, VPY + 4, 260, '#ff8a30', 0.75)
C.ell(1300, VPY + 6, 260, 14, '#ffc060', 0.8, f' filter="url(#{C.blur(6)})"')
for k in range(14):
    x = 1080 + k * 30 + r.uniform(-10, 10)
    h = r.uniform(14, 34)
    C.path(f"M{f(x-8)} {VPY+8}Q{f(x-2)} {f(VPY-h*0.5)} {f(x+r.uniform(-3,3))} {f(VPY-h)}Q{f(x+4)} {f(VPY-h*0.4)} {f(x+8)} {VPY+8}Z", '#ffb040', 0.85, f' filter="url(#{C.blur(1.5)})"')
rows = []
for k in range(-7, 9):
    ex = VPX + k * 330  # where the row reaches the bottom of the canvas
    rows.append(ex)
# trees ordered far -> near
trees = []
for ex in rows:
    for j in range(14):
        t = 0.06 + (j / 13) ** 1.6 * 0.94
        x = VPX + (ex - VPX) * t
        y = VPY + (H + 120 - VPY) * t
        trees.append((t, x, y))
trees.sort()
C.a('<g filter="url(#roughf)">')
for (t, x, y) in trees:
    if x < CUT - 60 or x > W + 60 or y > 790:
        continue
    h = 18 + t * 520
    w = h * 0.2
    fog = max(0, 1 - t * 1.9)
    col = '#4e5a48' if fog < 0.4 else '#6a6a60'
    # identical narrow crown on a bare stem
    C.line([(x, y), (x, y - h * 0.45)], max(1, w * 0.12), '#2a2420', 0.9)
    crown = f"M{f(x)} {f(y-h)}C{f(x+w*0.55)} {f(y-h*0.75)} {f(x+w*0.6)} {f(y-h*0.45)} {f(x)} {f(y-h*0.36)}C{f(x-w*0.6)} {f(y-h*0.45)} {f(x-w*0.55)} {f(y-h*0.75)} {f(x)} {f(y-h)}Z"
    C.path(crown, col, 0.92)
    if t > 0.25:
        C.path(crown, '#2a2e28', 0.45, f' transform="translate({f(w*0.18)} 0)" clip-path="none"')
        C.ell(x, y + 1, w * 0.5, w * 0.08, '#1a1414', 0.5)
C.a('</g>')
# smoke veil over the plantation
C.a(f'<rect x="{CUT}" y="420" width="{W-CUT}" height="300" fill="url(#{C.lg([(0, "#4a3c44", 0), (0.5, "#4a3c44", 0.3), (1, "#4a3c44", 0.15)], 0, 420, 0, 720)})"/>')
C.a('</g>')

# ------------------------------------------------------------------ ground
# left: living ground, moss and grass rising in a gentle mound to the trunk
gl = smooth_d([(-20, 700), (200, 690), (420, 712), (600, 760), (CUT, 770), (CUT, H + 20), (-20, H + 20)], 5)
C.path(gl, f'url(#{C.lg([(0, "#7aa04a"), (0.3, "#4e7a34"), (1, "#22381c")], 0, 690, 0, H)})')
C.path(gl, '#fff1b0', 0.18, f' filter="url(#{C.blur(10)})" transform="translate(-6 -10)"')
# right: dry grey earth, sawdust
gr = smooth_d([(CUT, 770), (900, 760), (1100, 740), (1300, 735), (W + 20, 738), (W + 20, H + 20), (CUT, H + 20)], 5)
C.path(gr, f'url(#{C.lg([(0, "#6e5e58"), (1, "#2a2224")], 0, 735, 0, H)})')
for k in range(40):
    x = r.uniform(CUT + 20, W - 20)
    y = r.uniform(760, 845)
    C.brush([(x, y), (x + r.uniform(20, 60), y + r.uniform(-3, 3))], 2.2, '#1e1618', 0.45, tin=0.3, tout=0.3)
# grass blades along the left edge of ground
for k in range(170):
    x = r.uniform(-10, CUT - 60)
    yb = 748 + (max(x, 0) / CUT) ** 1.6 * 75 + r.uniform(-30, 4)
    hgt = r.uniform(12, 34) * (1.4 if x < 200 else 1)
    col = r.choice(['#9cc25a', '#6f9a3e', '#4a7430', '#c4d88a'])
    C.brush([(x, yb), (x + r.uniform(-6, 6), yb - hgt * 0.6), (x + r.uniform(-12, 12), yb - hgt)], 3.2, col, 0.8, tin=0, tout=0.8)

# ------------------------------------------------------------------ the tree
# trunk outline (left half only, the right edge is the straight cut); root flare at the base
trunk = [(CUT, 846), (330, 850), (430, 828), (520, 806), (572, 770), (598, 700), (606, 600), (604, 480), (600, 380),
         (590, 330), (560, 296), (620, 300), (660, 280), (CUT, 262)]
dtr = smooth_d(trunk, 5)
C.path(dtr, '#160c08', 0.35, f' transform="translate(-10 6)" filter="url(#{C.blur(10)})"')
C.shaded(dtr, '#b08a60', '#6a4a30', '#2c1a10', (330, 262, CUT, 850), light=(-0.8, -0.3), k=40, deep='#1a0e08', rough='roughf', spread=1.2, hipos=0.6)
tid = C.id('c')
C.defs.append(f'<clipPath id="{tid}"><path d="{dtr}"/></clipPath>')
C.a(f'<g clip-path="url(#{tid})">')
# bark: long vertical plates with light ridges and dark furrows, bending out into the root flare
for k in range(36):
    x0 = 596 + k * 4.6 + r.uniform(-3, 3)
    pts = []
    for j in range(8):
        y = 280 + j * 82 + r.uniform(-14, 14)
        flare = max(0, (y - 640) / 210) ** 2 * (CUT - x0) * 1.3
        pts.append((x0 - flare + r.uniform(-3, 3), y))
    C.brush(pts, r.uniform(3, 6), '#24140c', 0.55, tin=0.1, tout=0.1, wob=0.4)
    C.brush([(x - 3, y) for x, y in pts], r.uniform(1.5, 3), '#d2aa78', 0.35, tin=0.2, tout=0.2, wob=0.4)
# bark plates: lighter ridges broken by short dark fissures
for k in range(150):
    y = r.uniform(290, 800)
    xl = 604 - max(0, (y - 660)) * 0.75
    x = r.uniform(xl + 4, CUT - 6)
    L = r.uniform(14, 40)
    C.brush([(x, y), (x + r.uniform(-3, 3), y + L)], r.uniform(4, 9), r.choice(['#8a6a48', '#a0805a', '#6a4e34']), 0.35, tin=0.3, tout=0.3)
    C.brush([(x + r.uniform(-2, 2), y + L * 0.3), (x + r.uniform(-6, 6), y + L * 0.36)], 1.6, '#1a0e08', 0.6, tin=0.2, tout=0.2)
# moss patches low on the trunk
for k in range(26):
    y = r.uniform(640, 830)
    x = 600 + r.uniform(-10, 60) - max(0, (y - 660)) * 0.75
    C.ell(x, y, r.uniform(8, 18), r.uniform(5, 10), r.choice(['#6a8a34', '#4e6e2a', '#8aa848']), 0.5, f' filter="url(#{C.blur(2)})"')
# warm reflected light where her face rests
C.glow(612, 360, 70, '#ffd49a', 0.35)
# darken towards the cut (form shadow), rim of warm light on the left edge
C.a(f'<rect x="640" y="240" width="{CUT-640}" height="620" fill="url(#{C.lg([(0, "#1a0e08", 0), (1, "#1a0e08", 0.5)], 640, 0, CUT, 0)})"/>')
C.brush([(596, 340), (604, 450), (606, 600), (596, 720), (540, 800), (430, 832)], 12, '#ffd89a', 0.35, tin=0.2, tout=0.2, extra=f' filter="url(#{C.blur(4)})"')
C.a('</g>')

# primary limbs into the left half of the crown (two are sawn on the line)
br = [
    [(640, 300), (560, 250), (470, 215), (360, 200)],
    [(690, 290), (650, 210), (610, 140), (560, 70)],
    [(600, 315), (520, 300), (440, 300), (380, 290)],
    [(735, 280), (748, 190), (CUT + 2, 130)],
    [(700, 288), (730, 250), (CUT + 2, 236)],
]
for i, b in enumerate(br):
    w0 = 46 if i < 3 else 30
    d = taper_d(b, w0, 10 if i < 3 else w0 * 0.8)
    C.shaded(d, '#a07a54', '#5a3e28', '#24160c', bbox(b, w0), light=(-0.7, -0.6), k=10, rough='roughf')
    for k in range(3):
        C.brush([(x - 5 + k * 4, y - 3) for x, y in b], 2, '#22140a' if k else '#c8a272', 0.4, tin=0.2, tout=0.4)

# crown: a half dome painted in leaf strokes, ending exactly on the cut
cc = C.id('c')
C.defs.append(f'<clipPath id="{cc}"><rect x="-10" y="-10" width="{CUT+10}" height="{H}"/></clipPath>')
C.a(f'<g id="crownG" clip-path="url(#{cc})">')
CY, RX, RY = 205, 420, 200
masses = []
for k in range(9):  # outer rim of the dome
    th = math.radians(88 + k * 14)
    masses.append((CUT + RX * 0.86 * math.cos(th), CY - RY * 0.82 * math.sin(th), r.uniform(85, 110), r.uniform(70, 90)))
for (x, y) in [(CUT - 60, 120), (CUT - 180, 110), (CUT - 280, 170), (CUT - 120, 220), (CUT - 50, 230), (CUT - 220, 250), (CUT - 340, 270)]:
    masses.append((x, y, r.uniform(90, 120), r.uniform(70, 85)))
for (cx, cy, rx, ry) in masses:
    C.ell(cx + 16, cy + 22, rx * 0.95, ry * 0.9, '#1a2a18', 0.35, f' filter="url(#{C.blur(16)})"')
foliage(C, masses, ['#eef0a8', '#b8d06a', '#7aa848', '#3e7a3a', '#22503a', '#1c3a40'], 300, [-60, -100, -130, -30, 200], L=(10, 20), wid=(3, 5),
        under_scale=0.88)
for k in range(70):  # sunlit sparkle on the upper-left rim
    cx, cy, rx, ry = r.choice(masses[:7])
    a = r.uniform(math.pi * 0.9, math.pi * 1.6)
    x, y = cx + math.cos(a) * rx * 0.85, cy + math.sin(a) * ry * 0.85
    C.path(leaf_d(x, y, r.uniform(8, 14), 3, r.uniform(-140, -40)), '#fff4b8', 0.75)
C.a('</g>')

# the ghost of the missing half: the same trunk and crown, mirrored, as a faint silhouette of ash
C.defs.append('<filter id="ghostf" x="-5%" y="-5%" width="110%" height="110%">'
              '<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="a"/>'
              '<feMorphology in="a" operator="erode" radius="2.5" result="e"/>'
              '<feComposite in="a" in2="e" operator="out" result="rim"/>'
              '<feFlood flood-color="#e8d8dc" flood-opacity="0.55"/><feComposite in2="rim" operator="in" result="rimc"/>'
              '<feFlood flood-color="#b8a4ae" flood-opacity="0.16"/><feComposite in2="a" operator="in" result="fillc"/>'
              '<feMerge><feMergeNode in="fillc"/><feMergeNode in="rimc"/></feMerge></filter>')
gcl = C.id('c')
C.defs.append(f'<clipPath id="{gcl}"><rect x="{CUT+10}" y="6" width="{W}" height="{H}"/></clipPath>')
C.a(f'<g clip-path="url(#{gcl})"><use href="#crownG" transform="translate({2*CUT} 0) scale(-1 1)" filter="url(#ghostf)"/></g>')

# the cut: the trunk's own wood, sawn flat, its rings showing as nested arches of grain
def fw(y):
    return 30 + max(0, y - 262) / 584 * 22 + max(0, y - 700) ** 2 / 146 ** 2 * 26
ys = [262 + k * 8 for k in range(74)] + [846]
right = [(CUT + fw(y) + r.uniform(-1.5, 1.5), y) for y in ys]
face = [(CUT, 262)] + right + [(CUT, 846)]
fg = C.lg([(0, '#f2dcae'), (0.5, '#e4c08a'), (1, '#c49a64')], CUT, 0, CUT + 60, 0)
C.path(poly_d(face), f'url(#{fg})')
fcid = C.id('c')
C.defs.append(f'<clipPath id="{fcid}"><path d="{poly_d(face)}"/></clipPath>')
C.a(f'<g clip-path="url(#{fcid})">')
# darker heartwood core
core = [(CUT + fw(y) * 0.5 - fw(y) * 0.16, y) for y in ys] + [(CUT + fw(y) * 0.5 + fw(y) * 0.16, y) for y in ys[::-1]]
C.path(poly_d(core), '#b67e48', 0.45, f' filter="url(#{C.blur(2)})"')
# cathedral grain: nested arches pointing up, the rings cut lengthwise
for k in range(22):
    y0 = 250 + k * 28
    S = 260 + k * 6
    for side in (-1, 1):
        pts = []
        for j in range(12):
            t = j / 11
            y = y0 + t * 120
            u = 0.5 + side * min(0.5, math.sqrt(max(0, y - y0) / S) * 0.9)
            pts.append((CUT + u * fw(y), y))
        C.line(pts, 1.1 if k % 2 else 0.7, '#8a5428', 0.55 if k % 2 else 0.35)
# fine straight grain near the bark edges
for u in (0.06, 0.1, 0.9, 0.94):
    C.line([(CUT + u * fw(y), y) for y in ys[::6]], 0.7, '#9a6a3a', 0.4)
# faint curved saw marks
for k in range(16):
    y = 280 + k * 36
    C.line([(CUT, y), (CUT + fw(y) * 0.5, y - 5), (CUT + fw(y), y)], 0.8, '#fff2d0', 0.35)
C.a('</g>')
# bark rim at the outer edge of the face, rough and irregular
C.line(right, 4, '#3a2416', 0.9, ' filter="url(#roughf)"')
C.line([(CUT, 262), (CUT, 846)], 2, '#3a2416', 0.7)
C.line([(CUT, 0), (CUT, 262)], 1.4, '#f6e2b0', 0.5)
# severed leaves falling, already grey
for k in range(8):
    x = CUT + 50 + k * 30 + r.uniform(-10, 10)
    y = 110 + k * 50 + r.uniform(-20, 20)
    C.path(leaf_d(x, y, 13, 3.5, r.uniform(0, 360)), r.choice(['#7a7a5a', '#6a6050', '#8a7a60']), 0.7)
# sawdust heap at the foot of the cut
C.path(smooth_d([(CUT - 6, 848), (CUT + 20, 816), (CUT + 70, 808), (CUT + 130, 826), (CUT + 160, 850)], 4), '#d8b880', 0.95, ' filter="url(#roughf)"')
C.spray(CUT + 70, 826, 70, 14, 120, '#f0d8a8', 0.6, 2.2, 0.8)

# ------------------------------------------------------------------ roots: the tree joined to the meadow and to her feet
# a cut through the soil along the bottom: the hidden life under the meadow
stop = [(-20, 748), (180, 762), (400, 792), (540, 818), (CUT, 830)]
soil = poly_d(catmull(stop, 6) + [(CUT, H + 10), (-20, H + 10)])
C.path(soil, f'url(#{C.lg([(0, "#4a3020"), (1, "#1e120c")], 0, 800, 0, H)})')
C.line(stop, 6, '#2e4a1e', 0.9)
C.line([(x, y - 2) for x, y in stop], 2, '#9cc25a', 0.5)
for k in range(30):
    x = r.uniform(0, CUT - 20)
    C.ell(x, r.uniform(790 + x * 0.04, 846), r.uniform(2, 5), r.uniform(1.5, 3), r.choice(['#6a5040', '#8a7060', '#3a2a20']), 0.8)
roots = [
    [(640, 836), (560, 842), (470, 838), (360, 830), (240, 812), (110, 800), (-10, 792)],
    [(610, 832), (540, 826), (450, 812), (360, 800), (260, 786), (160, 778)],
    [(600, 846), (500, 852)],
    [(360, 830), (290, 844), (200, 850)],
    [(240, 812), (170, 826), (80, 834)],
    [(450, 812), (420, 840)],
    [(110, 800), (40, 812)],
]
for k, pts in enumerate(roots):
    w = 14 if k < 2 else 8
    d = taper_d(pts, w, 2)
    C.shaded(d, '#a07a52', '#5a3e26', '#24160c', bbox(pts, w), light=(-0.6, -0.8), k=5, rough='roughf')
    # a living golden vein running along each root
    C.line(pts, 5, '#ffe7a0', 0.35, f' filter="url(#{C.blur(3)})"')
    C.line(pts, 1.3, '#fff6cf', 0.85)
    for (x, y) in pts[1:-1]:
        C.ell(x, y, 3, 3, '#fffbe0', 0.95)
        C.glow(x, y, 16, '#ffe48a', 0.5)
# fine threads rising from the roots to her bare feet
for k in range(7):
    sx = r.uniform(420, 600)
    ex = r.uniform(500, 590)
    pts = [(sx, 836), ((sx + ex) / 2 + r.uniform(-12, 12), 832), (ex, 826)]
    C.line(pts, 1, '#fff6cf', 0.8)
C.glow(540, 820, 120, '#ffe48a', 0.35)

# ------------------------------------------------------------------ the woman hugging the trunk
C.a('<g transform="translate(18 0)">')
skin = SK['brown']
hair = ('#5a3a28', '#2e1a10', '#120804')
dress = ('#ee9e6c', '#b8583a', '#6a2a1e', '#2e1010')
# leaning body: back curved, chest against the bark
dpts = [(560, 400), (592, 404), (612, 432), (618, 474), (608, 516), (596, 566), (600, 640), (614, 720), (626, 806),
        (572, 812), (520, 810), (474, 804), (486, 720), (500, 640), (506, 580), (504, 520), (512, 462), (530, 418)]
C.path(smooth_d(dpts, 5), '#160a08', 0.35, f' transform="translate(-12 8)" filter="url(#{C.blur(10)})"')
dd = body_shape(C, dpts, dress, light=(-0.75, -0.5), k=26)
dc = C.id('c')
C.defs.append(f'<clipPath id="{dc}"><path d="{dd}"/></clipPath>')
C.a(f'<g clip-path="url(#{dc})">')
for k in range(6):  # long folds, light edges on the left
    x = 500 + k * 21
    fold(C, [(x + 12, 590), (x + 4, 700), (x - 6, 812)], 7, dress[2], 0.45)
    fold(C, [(x + 6, 600), (x - 2, 706), (x - 12, 812)], 4, dress[0], 0.35)
fold(C, [(560, 430), (596, 470), (604, 520)], 8, dress[2], 0.4)  # bust shadow
C.path(smooth_d([(494, 556), (606, 566), (604, 592), (492, 584)], 3), '#2e5464', 0.95)  # sash
for k in range(5):
    C.diamond(512 + k * 21, 575, 13, 17, '#f0d48a', '#8a6a2a', hl='#fff2c0')
C.brush([(532, 414), (512, 470), (506, 560), (492, 690), (478, 800)], 10, '#ffd8a0', 0.4, tin=0.2, tout=0.2, extra=f' filter="url(#{C.blur(3)})"')
C.a('</g>')
foot_bare(C, 494, 826, 50, skin, light=(-0.6, -0.7))  # bare feet below the hem
foot_bare(C, 552, 830, 52, skin, light=(-0.6, -0.7))
# head, cheek resting on the bark
head_profile(C, 600, 357, 41, skin, hair, flip=1, tilt=16, eye='closed', style='long', light=(-0.8, -0.5), blush=0.16,
             lit=('#ffd49a', 0.35))
# near arm wrapped across the trunk: upper arm down, elbow, forearm laid on the bark, open hand near the cut
tube(C, [(562, 428), (572, 470), (588, 502), (618, 498), (644, 482)], [34, 30, 25, 23, 20], skin, light=(-0.5, -0.8))
C.brush([(580, 498), (592, 508), (604, 506)], 4, skin[3], 0.35, tin=0.3, tout=0.3)  # elbow crease
# dress shoulder over the top of the arm (sleeveless cut)
sh = smooth_d([(540, 404), (572, 402), (584, 420), (580, 442), (566, 448), (550, 432)], 4)
shg = C.lg([(0, dress[1]), (0.6, dress[1]), (1, dress[2])], 540, 400, 586, 452)
C.path(sh, f'url(#{shg})')
hand_flat(C, 640, 484, 68, -50, skin, spread=0.16, thumb_side=1)
C.a('</g>')

# ------------------------------------------------------------------ the felled half: logs stacked, rings to the viewer
logs = [(1040, 770, 62), (1166, 772, 60), (1290, 774, 58), (1100, 668, 58), (1222, 670, 56), (1160, 572, 54)]
C.ell(1170, 834, 220, 14, '#0a0608', 0.6, f' filter="url(#{C.blur(8)})"')
C.a('<g filter="url(#roughf)">')
for (x, y, R) in logs:
    # log body going back into depth
    body = f"M{f(x)} {f(y-R)}L{f(x+R*0.9)} {f(y-R-R*0.25)}A{f(R*0.55)} {f(R)} 0 0 1 {f(x+R*0.9)} {f(y+R-R*0.25)}L{f(x)} {f(y+R)}Z"
    C.path(body, '#2a1c16')
    C.path(body, '#4a3426', 0.6, f' transform="translate(0 -6)" clip-path="none"')
    # bark rim
    C.ell(x, y, R * 0.62, R, '#3a2416')
    C.ell(x - 1, y, R * 0.58, R * 0.95, '#5a3a24', 1, ' filter="url(#roughf)"')
    # cut face with rings
    fgr = C.rg([(0, '#f0d8a6'), (0.6, '#d8b27a'), (1, '#a07440')], x - R * 0.12, y - R * 0.25, R)
    C.ell(x, y, R * 0.52, R * 0.86, f'url(#{fgr})')
    for k in range(1, 8):
        t = k / 8
        C.a(f'<ellipse cx="{f(x + R*0.03*t)}" cy="{f(y + R*0.02)}" rx="{f(R*0.52*t)}" ry="{f(R*0.86*t)}" fill="none" stroke="#8a5a2e" '
            f'stroke-width="{f(1.3 if k % 2 else 0.8)}" opacity="{0.55 if k % 2 else 0.35}" filter="url(#roughf)"/>')
    C.ell(x + 1, y + 1, R * 0.12, R * 0.2, '#b07a44', 0.5, f' filter="url(#{C.blur(2)})"')
    # cold smoky light on the faces
    C.ell(x, y, R * 0.52, R * 0.86, '#5a4a5a', 0.28)
    C.ell(x + R * 0.25, y + R * 0.2, R * 0.4, R * 0.7, '#ff8a3a', 0.1, f' filter="url(#{C.blur(8)})"')

C.a('</g>')
# ------------------------------------------------------------------ atmosphere and framing
# ash flakes on the right
for k in range(70):
    x = r.uniform(CUT + 40, W)
    y = r.uniform(20, 740)
    C.ell(x, y, r.uniform(1, 2.6), r.uniform(0.8, 1.8), r.choice(['#c8bcb8', '#a89c9a', '#ff9a50']), r.uniform(0.3, 0.7))
# pollen motes in the light on the left
for k in range(40):
    x = r.uniform(40, 480)
    y = r.uniform(80, 700)
    C.ell(x, y, 1.6, 1.6, '#fffbe0', r.uniform(0.4, 0.8))
# vignette
vg = C.rg([(0, '#000', 0), (0.7, '#000', 0), (1, '#0c0810', 0.45)], W / 2, H / 2, 900)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{vg})"/>')

finish(C, OUT_SVG, OUT_PNG)
