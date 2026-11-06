"""Mes 8 · Salud y Bienestar · Diseño 3.
The same woman twice with the same raised arms: on the left she stretches toward the sun,
barefoot on the grass; on the right her arms are held up by strings hanging from a glowing
phone (a marionette), body slumped, pills and fast food at her feet."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos3/gen')
from fig import *
from comun import finish

C = Canvas(seed=808)
r = C.r
OUT_SVG = '/home/claude/humanity-wiki/design/calendario-arte/ilustraciones-fuente/mes-08-c.svg'
OUT_PNG = '/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos3/mes-08-c.png'

SPLIT = 742
GROUND = 760
SUN = (300, 150)
PHONE = (1060, 92)

# ================= SKY / ROOM =================
sky = C.lg([(0, '#f7c98a'), (0.5, '#fbe4bc'), (1, '#e6dcc0')], 0, 0, 0, GROUND)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{sky})"/>')
C.glow(SUN[0], SUN[1], 520, '#fff4d0', 0.75)
# distant hills, aerial perspective
for (yb, amp, cols, ph) in [(600, 50, ('#e8e0c0', '#c8cca8', '#a8b090'), 0.3), (650, 40, ('#d8d8a0', '#a8b678', '#78905a'), 1.9)]:
    pts = [(-20, yb + 40)]
    for k in range(10):
        x = -20 + k * 90
        pts.append((x, yb - amp * (0.5 + 0.5 * math.sin(k * 1.3 + ph))))
    pts += [(880, yb + 40), (880, 900), (-20, 900)]
    C.shaded(smooth_d(pts, 4), *cols, (-20, yb - amp, 880, 900), light=(-0.8, -0.5), k=18, hl=False, rough='rough')
for k in range(24):
    y = r.uniform(20, 560)
    x = r.uniform(-50, 700)
    C.brush([(x, y), (x + r.uniform(120, 260), y + r.uniform(-8, 8))], r.uniform(6, 14), r.choice(['#fff4dc', '#f6c88c', '#fbe0b0']), 0.28, tin=0.4, tout=0.5)
# soft clouds
for (x, y, rx, ry, op) in [(560, 70, 160, 22, 0.45), (120, 330, 140, 18, 0.35), (640, 250, 110, 14, 0.3)]:
    C.ell(x, y, rx, ry, '#fff8ea', op, f' filter="url(#{C.blur(ry*0.8)})"')
# sun disc with painted corona
C.glow(SUN[0], SUN[1], 190, '#fff2c0', 0.9)
ball(C, SUN[0], SUN[1], 58, '#fffbe8', '#ffe9a0', '#f6c860', k=10, rough='rough')
for k in range(28):
    a = k / 28 * math.tau + r.uniform(-0.04, 0.04)
    L0, L1 = 74, 74 + r.uniform(40, 120)
    C.brush([(SUN[0] + math.cos(a) * L0, SUN[1] + math.sin(a) * L0), (SUN[0] + math.cos(a) * L1, SUN[1] + math.sin(a) * L1)],
            r.uniform(5, 9), '#fff2c8', 0.35, tin=0.1, tout=0.9)

# ---- the dark half: a closed, cold room lit only by the phone ----
room = C.lg([(0, '#1e2438'), (0.6, '#141828'), (1, '#0c0e18')], 0, 0, 0, H)
mask = C.lg([(0, '#000', 0), (0.485, '#000', 0), (0.515, '#fff', 1), (1, '#fff', 1)], 0, 0, W, 0)
mid = C.id('m')
C.defs.append(f'<mask id="{mid}"><rect width="{W}" height="{H}" fill="url(#{mask})"/></mask>')
C.a(f'<g mask="url(#{mid})">')
C.a(f'<rect width="{W}" height="{H}" fill="url(#{room})"/>')
for k in range(20):
    y = r.uniform(20, 700)
    x = r.uniform(740, 1500)
    C.brush([(x, y), (x + r.uniform(120, 260), y + r.uniform(-8, 8))], r.uniform(10, 22), r.choice(['#0c0e18', '#262c42', '#181c2c']), 0.4, tin=0.4, tout=0.5)
# cold cone from the phone
cone = C.lg([(0, '#bfe4ff', 0.5), (0.6, '#7aa8d8', 0.14), (1, '#5a80b0', 0.0)], 0, PHONE[1], 0, 820)
C.path(poly_d([(PHONE[0] - 60, PHONE[1] - 60), (PHONE[0] + 40, PHONE[1] + 100), (PHONE[0] - 100, 840), (PHONE[0] - 520, 840)]),
       f'url(#{cone})', 1, f' filter="url(#{C.blur(30)})"')
# dark floor with a cold pool of light
fl = C.lg([(0, '#1a1e2c'), (1, '#0a0c14')], 0, GROUND - 30, 0, H)
C.a(f'<rect x="0" y="{GROUND-30}" width="{W}" height="{H-GROUND+30}" fill="url(#{fl})"/>')
C.ell(PHONE[0] - 260, 805, 260, 34, '#8ab4e0', 0.2, f' filter="url(#{C.blur(18)})"')
C.a('</g>')

# ================= GRASS (left) =================
gmask = C.lg([(0, '#fff', 1), (0.485, '#fff', 1), (0.515, '#fff', 0), (1, '#fff', 0)], 0, 0, W, 0)
gid = C.id('m')
C.defs.append(f'<mask id="{gid}"><rect width="{W}" height="{H}" fill="url(#{gmask})"/></mask>')
C.a(f'<g mask="url(#{gid})">')
gr = C.lg([(0, '#b8c470'), (0.4, '#7e9c48'), (1, '#4a6a2a')], 0, GROUND - 40, 0, H)
C.a(f'<rect x="-10" y="{GROUND-10}" width="900" height="{H}" fill="url(#{gr})"/>')
C.path(smooth_d([(-20, GROUND - 30), (300, GROUND - 46), (600, GROUND - 36), (900, GROUND - 30), (900, 900), (-20, 900)], 4), f'url(#{gr})', 1, ' filter="url(#rough)"')
for k in range(260):
    x = r.uniform(-10, 860)
    y = r.uniform(GROUND - 30, 845)
    hgt = r.uniform(10, 26) * (0.6 + (y - GROUND) / 160)
    col = r.choice(['#d8de88', '#a8c060', '#6a8a38', '#4a6a28', '#c8d070'])
    lean = r.uniform(-6, 8)
    C.brush([(x, y), (x + lean * 0.5, y - hgt * 0.6), (x + lean, y - hgt)], r.uniform(2, 3.5), col, 0.7, tin=0, tout=0.8)
C.a('</g>')

# ================= TREE (far left) =================
trunk = [(70, 800), (78, 640), (66, 480), (90, 330), (120, 230)]
limb(C, trunk, [30, 24, 20, 15, 10], ('#a87c58', '#6a4a32', '#2e1e14'), (-0.7, -0.5), rough='rough', shadow=(10, 6, 8, 0.3))
limb(C, [(80, 470), (140, 380), (210, 330)], [11, 8, 5], ('#a87c58', '#6a4a32', '#2e1e14'), (-0.7, -0.5), rough='rough')
limb(C, [(72, 560), (20, 470), (-20, 430)], [10, 7, 5], ('#a87c58', '#6a4a32', '#2e1e14'), (-0.7, -0.5), rough='rough')
foliage(C, [(60, 210, 140, 110), (190, 280, 100, 70), (-10, 380, 90, 80), (120, 120, 100, 70)],
        ['#e8ee98', '#a8c860', '#6a9a40', '#3a6428'], 170, [-40, -60, -120, 200, 20], L=(14, 26), wid=(4, 7))
C.ell(120, 800, 120, 12, '#2a3a18', 0.4, f' filter="url(#{C.blur(8)})"')

# ================= FIGURES =================
u = 72
SK = SKIN['olive']
TOP = ('#f6c49a', '#d8845a', '#7a3a22')
BOT = ('#b8c8b0', '#7a9080', '#2a3a32')
HAIR = ('#7a4a2c', '#4a2a18', '#1a0c06')
LIGHT_L = (-0.7, -0.65)
FEAT = dict(nose=1.05, lips=1.15, chin=0.0)

# warm cast shadow of the light figure on the grass
C.path(smooth_d([(470, 790), (640, 776), (720, 780), (640, 800), (480, 806)], 3), '#2a3a14', 0.35, f' filter="url(#{C.blur(7)})"')
JL = person(C, (475, 792 - 3.55 * u - 0.27 * u), u, -1, SK, TOP, BOT, HAIR, light=LIGHT_L, lean=-5, tilt=20, eyes='closed',
            hairstyle='bun', arms=((150, 160), (204, 196)), legs=((3, -1), (-6, -5)), hands=(('open', 0.05, 170), ('open', 0.1, 200)),
            bust=0.6, smile=1.0, sleeve=0.35, chest=1.1, feat=FEAT, neck_len=0.2,
            order=['farleg', 'fararm', 'torso', 'nearleg', 'neararm', 'head'])
for k in range(40):
    x = r.uniform(400, 560)
    y = r.uniform(786, 812)
    hgt = r.uniform(8, 18)
    C.brush([(x, y), (x + 2, y - hgt * 0.6), (x + r.uniform(-4, 6), y - hgt)], r.uniform(2, 3), r.choice(['#a8c060', '#6a8a38', '#c8d070']), 0.8, tin=0, tout=0.8)

# --- shadow figure: the same woman, hanging limp from strings ---
SKD = tint(SK, '#6a7a98', 0.42)
TOPD = ('#8a9098', '#545a66', '#1c2028')
BOTD = ('#5a6270', '#363c48', '#12141c')
HAIRD = ('#4a3a34', '#2a201c', '#0c0806')
LIGHT_R = (0.5, -0.85)
px = 945
# hoisted by the wrists, body folded and sagging, knees buckled, toes just brushing the floor
JR = person(C, (px, 806 - 263), u, 1, SKD, TOPD, BOTD, HAIRD, light=LIGHT_R, lean=40, bend=0.3, tilt=-40,
            eyes='dull', hairstyle='bun', arms=((176, 180), (170, 176)), legs=((40, -34), (34, -38)),
            hands=(('limp', 0.6, 160), ('limp', 0.6, 150)), bust=0.4, belly=0.9, sleeve=0.35, lit=0.3, far_dim=0.35,
            rim=('#bfe0ff', 0.0, -1.0), lip='#8a5a58', feet='dangle', feat=FEAT, neck_len=0.2,
            order=['farleg', 'fararm', 'torso', 'nearleg', 'head', 'neararm'])
C.ell(px + 30, 808, 90, 8, '#04050a', 0.5, f' filter="url(#{C.blur(6)})"')

# ================= PHONE (the false sun), upright, unmistakable =================
w0, w1 = JR['wrist0'], JR['wrist1']
cx, cy = (w0[0] + w1[0]) / 2 + 26, 92
pw, ph_ = 88, 168
C.glow(cx, cy, 300, '#a8d8ff', 0.55)
rot = 8
C.a(f'<g transform="rotate({rot} {cx} {cy})">')
x0, y0 = cx - pw / 2, cy - ph_ / 2
body = (f'M{x0+16} {y0}H{x0+pw-16}Q{x0+pw} {y0} {x0+pw} {y0+16}V{y0+ph_-16}Q{x0+pw} {y0+ph_} {x0+pw-16} {y0+ph_}'
        f'H{x0+16}Q{x0} {y0+ph_} {x0} {y0+ph_-16}V{y0+16}Q{x0} {y0} {x0+16} {y0}Z')
C.path(body, '#05060a', 0.5, f' transform="translate(6 10)" filter="url(#{C.blur(8)})"')
C.shaded(body, '#5a6070', '#1a1c24', '#05060a', (x0, y0, x0 + pw, y0 + ph_), light=(-0.5, -0.8), k=6, rough=None)
C.a(f'<rect x="{x0+pw}" y="{y0+36}" width="3" height="26" rx="1.5" fill="#2a2c34"/>')
scr = C.rg([(0, '#ffffff'), (0.35, '#e8f6ff'), (0.8, '#9acaf2'), (1, '#5a90cc')], cx - 6, cy, ph_ * 0.6)
C.a(f'<rect x="{x0+6}" y="{y0+6}" width="{pw-12}" height="{ph_-12}" rx="11" fill="url(#{scr})"/>')
C.a(f'<rect x="{cx-11}" y="{y0+11}" width="22" height="7" rx="3.5" fill="#05060a"/>')
C.a(f'<rect x="{x0+6}" y="{y0+6}" width="{pw-12}" height="{ph_-12}" rx="11" fill="#ffffff" opacity="0.3" filter="url(#{C.blur(5)})"/>')
C.a('</g>')


def rotp(x, y):
    a = math.radians(rot)
    dx, dy = x - cx, y - cy
    return (cx + dx * math.cos(a) - dy * math.sin(a), cy + dx * math.sin(a) + dy * math.cos(a))


# strings of light: they come out of the glowing screen and hold up the wrists and the head
def string(p0, p1):
    C.line([p0, p1], 12, '#a8d8ff', 0.25, f' filter="url(#{C.blur(4)})"')
    C.line([p0, p1], 5, '#d8eeff', 0.55, f' filter="url(#{C.blur(1.2)})"')
    C.line([p0, p1], 2.2, '#ffffff', 0.95)


hd = JR['head']
hp = hd.P(-0.2, 0.08)
for (src, dst) in [(rotp(cx - 16, cy + 30), w1), (rotp(cx - 4, cy + 36), w0), (rotp(cx + 14, cy + 50), hp)]:
    string(src, dst)
    C.glow(src[0], src[1], 22, '#ffffff', 0.85)
for w in (w0, w1):
    C.ell(w[0], w[1], 8, 4.5, '#e8f6ff', 0.9)
C.ell(hp[0], hp[1], 6, 6, '#e8f6ff', 0.9)

# a knocked-over soda cup is the only object left on the floor
cx2, cy2 = px + 330, 800
C.ell(cx2 + 10, cy2 + 6, 70, 9, '#04050a', 0.5, f' filter="url(#{C.blur(5)})"')
C.a(f'<g transform="rotate(-72 {cx2} {cy2})">')
cup = f'M{cx2-26} {cy2-62}L{cx2+26} {cy2-62}L{cx2+19} {cy2+18}L{cx2-19} {cy2+18}Z'
C.shaded(cup, '#e8eaee', '#b8bcc8', '#4a5060', (cx2 - 26, cy2 - 62, cx2 + 26, cy2 + 18), light=(0.6, -0.8), k=7, rough=None)
C.a(f'<rect x="{cx2-24}" y="{cy2-38}" width="46" height="14" fill="#b83a32" opacity="0.85"/>')
C.a(f'<rect x="{cx2-29}" y="{cy2-70}" width="58" height="10" rx="4" fill="#ccd0d8"/>')
C.line([(cx2 + 6, cy2 - 70), (cx2 + 14, cy2 - 104)], 5, '#c84a44', 1)
C.a('</g>')
C.path(smooth_d([(cx2 - 60, cy2 + 10), (cx2 - 10, cy2 + 4), (cx2 - 30, cy2 + 16), (cx2 - 70, cy2 + 18)], 3), '#3a1a1a', 0.55)

# vignette
vg = C.rg([(0, '#000', 0), (0.7, '#000', 0), (1, '#000', 0.35)], W / 2, H / 2, 900)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{vg})"/>')

finish(C, OUT_SVG, OUT_PNG)
