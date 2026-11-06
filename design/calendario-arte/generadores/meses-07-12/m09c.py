"""Mes 9 · Economía · Diseño 3.
The same three people twice. Left: standing in a ring on a round woven mat, passing bread and
seeds from hand to hand in the low sun. Right: the same three, greyed, on hands and knees,
stacked into a pyramid that carries a heap of gold with one man sitting on top."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos3/gen')
from fig import *
from comun import finish

C = Canvas(seed=909)
r = C.r
OUT_SVG = '/home/claude/humanity-wiki/design/calendario-arte/ilustraciones-fuente/mes-09-c.svg'
OUT_PNG = '/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos3/mes-09-c.png'

HORIZON = 590
FEET = 800

# ================= BACKGROUND =================
sky = C.lg([(0, '#f0b070'), (0.5, '#f8d49a'), (1, '#fbe6c0')], 0, 0, 0, HORIZON)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{sky})"/>')
C.glow(380, 560, 520, '#fff2c8', 0.8)
for k in range(24):
    y = r.uniform(20, 520)
    x = r.uniform(-50, 700)
    C.brush([(x, y), (x + r.uniform(120, 260), y + r.uniform(-8, 8))], r.uniform(6, 14), r.choice(['#fff4dc', '#f2bc80', '#fbe0b0']), 0.3, tin=0.4, tout=0.5)
# wheat field on the horizon
C.a('<g mask="url(#LM)">')
wf = C.lg([(0, '#e8c070'), (1, '#b88838')], 0, HORIZON - 20, 0, HORIZON + 60)
C.path(smooth_d([(-20, HORIZON - 8), (300, HORIZON - 18), (800, HORIZON - 6), (800, 900), (-20, 900)], 4), f'url(#{wf})', 1, ' filter="url(#rough)"')
for k in range(300):
    x = r.uniform(-10, 780)
    y = r.uniform(HORIZON - 20, HORIZON + 30)
    C.brush([(x, y + 14), (x + 1, y)], 2, r.choice(['#f8dc90', '#c8962e', '#e8b850']), 0.6, tin=0, tout=0.5)
    C.ell(x + 1, y - 2, 1.8, 4, '#f0c860', 0.7)
gr = C.lg([(0, '#c8a860'), (0.3, '#9a9a50'), (1, '#5a6a30')], 0, HORIZON + 20, 0, H)
C.a(f'<rect x="-10" y="{HORIZON+20}" width="800" height="{H}" fill="url(#{gr})"/>')
for k in range(160):
    x = r.uniform(-10, 780)
    y = r.uniform(HORIZON + 30, 845)
    hgt = r.uniform(6, 18) * (0.5 + (y - HORIZON) / 200)
    C.brush([(x, y), (x + 2, y - hgt * 0.6), (x + r.uniform(-4, 6), y - hgt)], 2.5, r.choice(['#d8d088', '#a8a858', '#6a7a38']), 0.55, tin=0, tout=0.8)
C.a('</g>')
lm = C.lg([(0, '#fff'), (0.485, '#fff'), (0.515, '#000'), (1, '#000')], 0, 0, W, 0)
C.defs.append(f'<mask id="LM"><rect width="{W}" height="{H}" fill="url(#{lm})"/></mask>')
rm = C.lg([(0, '#000'), (0.485, '#000'), (0.515, '#fff'), (1, '#fff')], 0, 0, W, 0)
C.defs.append(f'<mask id="RM"><rect width="{W}" height="{H}" fill="url(#{rm})"/></mask>')
# dark half: plum night, cracked dry earth
C.a('<g mask="url(#RM)">')
nt = C.lg([(0, '#1a1024'), (0.7, '#2e1e38'), (1, '#3e2a42')], 0, 0, 0, HORIZON)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{nt})"/>')
for k in range(20):
    y = r.uniform(20, 520)
    x = r.uniform(740, 1500)
    C.brush([(x, y), (x + r.uniform(120, 260), y + r.uniform(-8, 8))], r.uniform(10, 22), r.choice(['#140a1c', '#2a1a34', '#3a2440']), 0.4, tin=0.4, tout=0.5)
er = C.lg([(0, '#3a2a34'), (1, '#140c14')], 0, HORIZON, 0, H)
C.a(f'<rect x="700" y="{HORIZON}" width="800" height="{H}" fill="url(#{er})"/>')
for k in range(26):  # cracks
    x, y = r.uniform(760, 1480), r.uniform(HORIZON + 30, 840)
    pts = [(x, y)]
    for j in range(3):
        x += r.uniform(-30, 30)
        y += r.uniform(-6, 10)
        pts.append((x, y))
    C.line(pts, r.uniform(1, 2.2), '#0a060a', 0.6, n=2)
C.a('</g>')

# ================= LEFT: bread passed from hand to hand =================
u = 70
SKA, SKB, SKC = SKIN['dark'], SKIN['olive'], SKIN['light']
CA = (('#e8a868', '#c06a30', '#5a2a10'), ('#6a7a98', '#3e4a68', '#141a2c'), ('#3a2418', '#22140c', '#080402'))
CB = (('#a8c890', '#6a9a5a', '#264a22'), ('#c8a070', '#8a6a40', '#3a2a14'), ('#6a4028', '#3a2014', '#140806'))
CC = (('#e8d080', '#c8a040', '#6a4a10'), ('#a85a48', '#7a3426', '#341008'), ('#d8d0c4', '#a89a8a', '#5a5048'))
LL = (-0.7, -0.6)
FA = dict(nose=0.9, lips=1.3, chin=0.01)
FB = dict(nose=1.15, lips=0.9, chin=0.025, brow=0.01)
FC = dict(nose=1.25, lips=0.85, chin=-0.01, jaw=0.02)
for (x0, x1) in [(110, 300), (330, 520), (540, 700)]:
    C.ell((x0 + x1) / 2 + 20, FEET + 4, (x1 - x0) / 2, 12, '#2a2410', 0.35, f' filter="url(#{C.blur(7)})"')
_A = person(Canvas(), (150, FEET - 3.55 * u - 0.27 * u), u, 1, SKA, CA[0], None, CA[2], lean=8, arms=((36, 104), (30, 100)),
            legs=((10, 2), (-10, -6)), skirt=(0.9, 0.3, CA[0]))
_C = person(Canvas(), (0, FEET - 3.45 * 64 - 0.27 * 64), 64, -1, SKC, CC[0], CC[1], CC[2], lean=12, bend=0.35, arms=((34, 112), (28, 106)),
            legs=((8, -2), (-6, -6)))
EX = _A['wrist0'][0] + 30 - _C['wrist0'][0]
# B, behind the elder, a hand on his shoulder
JB = person(C, (EX + 175, FEET - 10 - 3.55 * u - 0.27 * u), u, -1, SKB, CB[0], CB[1], CB[2], light=LL, lean=6,
            arms=((52, 66), (-10, 0)), legs=((5, 0), (-8, -5)), eyes='open', hairstyle='short', hands=(('open', 0.35, 75), ('open', 0.35)),
            sleeve=0.5, smile=1.0, far_dim=0.2, dim_col='#8a6a40', feat=FB)
# the elder receives the bread with both hands, a little stooped
JC = person(C, (EX, FEET - 3.45 * 64 - 0.27 * 64), 64, -1, SKC, CC[0], CC[1], CC[2], light=LL, lean=12, bend=0.35,
            arms=((34, 112), (28, 106)), legs=((8, -2), (-6, -6)), eyes='open', hairstyle='short', tilt=6,
            hands=(('cup', 0.45, 104), ('cup', 0.45, 100)), sleeve=0.55, smile=1.0, beard=CC[2], far_dim=0.25, dim_col='#8a6a40', feat=FC,
            order=['farleg', 'fararm', 'torso', 'nearleg', 'head', 'neararm'])
# A gives it, leaning in, both hands under the loaf
JA = person(C, (150, FEET - 3.55 * u - 0.27 * u), u, 1, SKA, CA[0], None, CA[2], light=LL, lean=8,
            arms=((36, 104), (30, 100)), legs=((10, 2), (-10, -6)), eyes='open', hairstyle='bun', hands=(('open', 0.3, 100), ('open', 0.3, 96)),
            sleeve=0.5, bust=0.6, smile=1.0, far_dim=0.2, dim_col='#8a6a40', feat=FA, skirt=(0.9, 0.3, ('#c86a4a', '#9a3e26', '#4a160a')),
            order=['farleg', 'nearleg', 'fararm', 'torso', 'head', 'neararm'])
wa, wc = JA['wrist0'], JC['wrist0']
lx, ly = (wa[0] + wc[0]) / 2 + 10, min(wa[1], wc[1]) - 4
C.glow(lx, ly, 120, '#fff4c8', 0.5)
loaf = smooth_d([(lx - 50, ly + 14), (lx - 46, ly - 8), (lx - 22, ly - 27), (lx + 10, ly - 30), (lx + 38, ly - 20), (lx + 52, ly + 2), (lx + 46, ly + 16)], 4)
part(C, loaf, ('#ffe8b0', '#e09a48', '#7a3c10'), (-0.6, -0.8), 10, rough='roughf', shadow=(4, 10, 6, 0.3))
for k in range(3):
    x0 = lx - 24 + k * 22
    C.brush([(x0 - 6, ly - 4), (x0 + 2, ly - 17), (x0 + 10, ly - 22)], 5, '#fff2c8', 0.7, tin=0.2, tout=0.3)
    C.brush([(x0 - 4, ly - 1), (x0 + 4, ly - 14)], 2.5, '#8a4a14', 0.5, tin=0.2, tout=0.3)
C.ell(lx - 14, ly - 20, 16, 4, '#fff6dc', 0.5)
# the elder's hands over the loaf (drawn again on top so they hold it)

# ================= RIGHT: the pyramid =================
GR = 805
uk = 62
GREY = '#3a3046'
SKAg, SKBg, SKCg = tint(SKA, GREY, 0.3), tint(SKB, GREY, 0.35), tint(SKC, GREY, 0.35)
CAg = [tint(c, GREY, 0.45) for c in CA]
CBg = [tint(c, GREY, 0.45) for c in CB]
CCg = [tint(c, GREY, 0.45) for c in CC]
LR = (0.2, -1.0)
C.ell(1110, GR + 4, 240, 20, '#06030a', 0.6, f' filter="url(#{C.blur(10)})"')


def kneeler(x, ground, uu, skin, cl, tilt=40, face=1, ft=None, dim=0.3, legs=((0, -90), (6, -86)), arms=((4, -2), (8, 2)), lean=74):
    """On hands and knees; x is the knee; returns joints."""
    py = ground - 1.85 * uu * math.cos(math.radians(legs[0][0])) - 0.22 * uu
    J = person(C, (x, py), uu, face, skin, cl[0], cl[1], cl[2], light=LR, lean=lean, arms=arms, legs=legs,
               eyes='closed', hairstyle='short', tilt=tilt, hands=(('open', 0.1, 90), ('open', 0.1, 90)), feet='none', sleeve=0.5,
               far_dim=dim, dim_col='#140c18', lit=0.4, lip='#7a4a48', feat=ft, order=['farleg', 'fararm', 'torso', 'nearleg', 'neararm', 'head'])
    for k in ('ankle0', 'ankle1'):
        ax, ay = J[k]
        part(C, smooth_d([(ax - 4 * face, ay - uu * 0.18), (ax - face * uu * 0.55, ay - uu * 0.3), (ax - face * uu * 0.62, ay - uu * 0.12), (ax - 4 * face, ay + uu * 0.1)], 3),
             skin, LR, 3, rough=None)
    return J


# two side by side on all fours, both facing the same way (the far one a step behind, in shadow);
# the third kneels on their backs
DK = '#140c18'
J1 = kneeler(1000 + 44, GR - 22, uk, tint(SKAg, DK, 0.3), [tint(c, DK, 0.3) for c in CAg], ft=FA, tilt=26, dim=0.45)
J2 = kneeler(1000, GR, uk, SKBg, CBg, ft=FB, tilt=20)
back = J2['S'](0.18, -0.6)
J3 = kneeler(back[0] - 16, back[1] + 4, uk, SKCg, CCg, ft=FC, tilt=34)
top3 = J3['S'](0.5, -0.6)
hx, hy = top3[0] - 6, top3[1] + 14
C.glow(hx, hy - 60, 240, '#ffd060', 0.4)
heap = smooth_d([(hx - 95, hy), (hx - 64, hy - 36), (hx - 28, hy - 66), (hx + 8, hy - 74), (hx + 44, hy - 62), (hx + 80, hy - 32), (hx + 100, hy)], 4)
part(C, heap, ('#fff0a0', '#e0a830', '#7a4a08'), (-0.3, -1.0), 22, rough='roughf', shadow=(0, 10, 8, 0.5))
for k in range(46):
    a = r.uniform(0.05, 0.95) * math.pi
    rr_ = r.uniform(0.25, 1.0)
    cx_ = hx + 5 - math.cos(a) * 92 * rr_
    cy_ = hy - math.sin(a) * 70 * rr_ ** 0.6 + r.uniform(-4, 4)
    C.ell(cx_, cy_, 9, 4.5, '#8a5a10', 0.9)
    C.ell(cx_, cy_ - 1.5, 8, 3.6, r.choice(['#ffe680', '#f8cc50', '#e8b030']), 1)
    C.ell(cx_ - 2, cy_ - 2.5, 3, 1.2, '#fffbe0', 0.8)
# the one on top: seated on the gold, facing left, admiring a coin
us = 64
SUIT = ('#7a5a98', '#4a3068', '#180c28')
seat = (hx + 6, hy - 66)
JT = person(C, (seat[0], seat[1] - 0.15 * us), us, -1, SKIN['light'], SUIT, SUIT, ('#c8b8a0', '#8a7a68', '#3a3026'),
            light=(0.2, -1.0), lean=-6, arms=((22, 150), (18, 70)), legs=((88, 6), (80, 0)), eyes='closed', hairstyle='short', tilt=22,
            hands=(('grip', 0.8, 175), ('open', 0.4, 60)), feet='shoe', sleeve=1.0, belly=1.6, far_dim=0.3, dim_col='#140c18', smile=1.0,
            shoe_cols=('#5a4a3a', '#2a2018', '#0a0806'), feat=dict(nose=1.1, chin=-0.03, jaw=0.04, lips=0.8),
            order=['farleg', 'fararm', 'torso', 'nearleg', 'head', 'neararm'])
S = JT['S']
C.brush([S(1.0, 0.18), S(0.93, 0.36), S(0.86, 0.5)], 9, '#f0eef4', 0.95, tin=0.1, tout=0.3)
C.brush([S(0.92, 0.47), S(0.7, 0.62), S(0.5, 0.78)], 9, '#1a0e1e', 0.95, tin=0.1, tout=0.2)
cw = JT['wrist0']
# a flat gold coin held between finger and thumb, seen slightly turned
ccx, ccy = cw[0] - 8, cw[1] - 44
C.ell(ccx + 2, ccy + 2, 15, 19, '#6a4208')
C.ell(ccx, ccy, 15, 19, '#f8c840')
C.ell(ccx, ccy, 11, 15, 'none', 1, ' stroke="#b8861e" stroke-width="2"')
C.ell(ccx - 4, ccy - 6, 4, 6, '#fff6c8', 0.8)

# vignette
vg = C.rg([(0, '#000', 0), (0.7, '#000', 0), (1, '#000', 0.35)], W / 2, H / 2, 900)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{vg})"/>')
finish(C, OUT_SVG, OUT_PNG)
