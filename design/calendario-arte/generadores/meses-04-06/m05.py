"""Mes 5 · Arte · Diseño 3.
LIGHT (left): a dancer in a grand jeté; the path of her leap is a living brushstroke of colour. The body creates.
SHADOW (right): a grey man sunk in an armchair, lit by a giant screen that spits out an endless ribbon of
identical, glossy, empty pictures (the same perfect face on the same sunset: AI slop) that buries him."""
from fig import *

OUT_SVG = '/home/claude/humanity-wiki/design/calendario-arte/ilustraciones-fuente/mes-05-c.svg'
OUT_PNG = '/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos3/mes-05-c.png'

C = Canvas(seed=55)
r = C.r
MID = 790
FLOOR = 770

# ------------------------------------------------------------------ background: warm studio light | dark room
bg = C.lg([(0, '#f6dca8'), (0.3, '#eec48a'), (0.48, '#c89070'), (0.56, '#4a4058'), (0.64, '#1e2032'), (1, '#0e1020')], 0, 0, W, 0)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{bg})"/>')
C.glow(300, 260, 520, '#fff4d8', 0.7)
C.glow(250, 230, 200, '#fffbec', 0.6)
# soft brushed wall texture on the light side
for k in range(26):
    y = r.uniform(30, 720)
    x = r.uniform(-60, 300)
    C.brush([(x, y), (x + 200, y + r.uniform(-12, 12)), (x + 400, y + r.uniform(-20, 20))], r.uniform(16, 34), r.choice(['#fff2d0', '#e8b878', '#f8e0b0']), 0.18,
            tin=0.4, tout=0.4, extra=f' filter="url(#{C.blur(6)})"')

# studio light: tall shafts from a high window off the top left, dust floating in them
for (x0, w0, op) in [(-60, 150, 0.34), (150, 110, 0.28), (330, 90, 0.22)]:
    beam = poly_d([(x0, -20), (x0 + w0, -20), (x0 + w0 + 520, FLOOR + 20), (x0 + 380, FLOOR + 20)])
    C.path(beam, f'url(#{C.lg([(0, "#fffbe8", op), (1, "#fff0c8", op * 0.3)], 0, 0, 0, FLOOR)})', 1, f' filter="url(#{C.blur(14)})"')
for k in range(90):
    t = r.random()
    x0 = r.choice([-60, 150, 330]) + r.uniform(0, 100)
    x, y = x0 + t * 450, -20 + t * (FLOOR + 40)
    if x < 760:
        C.ell(x, y, r.uniform(0.8, 2), r.uniform(0.8, 2), '#fffbe6', r.uniform(0.35, 0.85))

# floor
fl = C.lg([(0, '#d8a46a'), (0.45, '#a8704a'), (0.55, '#2a2434'), (1, '#121220')], 0, 0, W, 0)
C.path(poly_d([(0, FLOOR), (W, FLOOR), (W, H), (0, H)]), f'url(#{fl})')
C.path(poly_d([(0, FLOOR), (W, FLOOR), (W, H), (0, H)]), f'url(#{C.lg([(0, "#000", 0), (1, "#000", 0.35)], 0, FLOOR, 0, H)})')
for k in range(9):  # floorboards converging slightly
    x0 = -200 + k * 120
    C.line([(x0 + 300, FLOOR), (x0 - 40 + k * 10, H)], 1.2, '#6a3e22', 0.35)
C.line([(0, FLOOR), (W, FLOOR)], 2, '#5a3a24', 0.5)
for (x0, w0) in [(-60, 150), (150, 110), (330, 90)]:  # pools of light on the boards
    C.ell(x0 + w0 / 2 + 450, FLOOR + 40, 150, 22, '#fff2c8', 0.22, f' filter="url(#{C.blur(12)})"')

# ------------------------------------------------------------------ the giant screen (right)
SX, SY, SW, SH = 1226, 150, 214, 350
# cold light cone from the screen onto the man
cone = C.lg([(0, '#9ad8ff', 0.0), (0.4, '#9ad8ff', 0.16), (1, '#9ad8ff', 0.42)], 820, 0, SX, 0)
C.path(poly_d([(SX + 10, SY + 20), (SX + 10, SY + SH), (900, 860), (760, 860), (800, 380)]), f'url(#{cone})', 1, f' filter="url(#{C.blur(18)})"')
C.glow(SX + SW / 2, SY + SH / 2, 520, '#7ac8ff', 0.35)
C.glow(SX + SW / 2, SY + SH / 2, 260, '#c8ecff', 0.35)

# the slop picture, defined once and reused: the same perfect face on the same plastic sunset
slop = []
slop.append('<g id="slopin">')
sg = C.lg([(0, '#ff7eb6'), (0.5, '#ffa868'), (0.8, '#ffd27a'), (1, '#ff9a8a')], 0, -30, 0, 30)
slop.append(f'<rect x="-22" y="-30" width="44" height="60" rx="3" fill="url(#{sg})"/>')
slop.append('<circle cx="0" cy="8" r="13" fill="#fff4c0" opacity="0.9"/>')
slop.append('<rect x="-22" y="14" width="44" height="16" fill="#7a3a8a" opacity="0.85"/>')
slop.append('<rect x="-22" y="16" width="44" height="1.5" fill="#ffd8a0" opacity="0.7"/>')
# hair, face, neck: flawless, symmetrical, glossy, empty
slop.append('<path d="M-14 -6C-16 -24 -6 -27 0 -27C6 -27 16 -24 14 -6C14 6 12 14 13 22L-13 22C-12 14 -14 6 -14 -6Z" fill="#2e1630"/>')
slop.append('<path d="M-10 -22C-13 -10 -12 4 -11 16" fill="none" stroke="#7a4a8a" stroke-width="2.4" opacity="0.35"/>')
slop.append('<path d="M10 -22C13 -10 12 4 11 16" fill="none" stroke="#7a4a8a" stroke-width="2.4" opacity="0.35"/>')
skg = C.lg([(0, '#ffe4d8'), (1, '#f0a898')], 0, 10, 0, 30)
slop.append(f'<path d="M-19 30C-18 21 -9 18 -4.5 16.5L4.5 16.5C9 18 18 21 19 30Z" fill="url(#{skg})"/>')
slop.append(f'<path d="M-3.8 4C-3.8 10 -4.2 14 -4.6 17L4.6 17C4.2 14 3.8 10 3.8 4Z" fill="#f4b8a4"/>')
fg = C.rg([(0, '#fff4ee'), (0.55, '#ffd2c0'), (1, '#eea0a0')], -2, -12, 15)
slop.append(f'<path d="M0 -21.5C7.5 -21.5 10.2 -15 9.8 -8C9.3 0 5 6.5 0 7C-5 6.5 -9.3 0 -9.8 -8C-10.2 -15 -7.5 -21.5 0 -21.5Z" fill="url(#{fg})"/>')
slop.append('<path d="M-10 -11C-7 -23 7 -23 10 -11C7 -18 2 -19.5 0 -18C-2 -19.5 -7 -18 -10 -11Z" fill="#2e1630"/>')
slop.append('<path d="M-6 -20C-2 -22 3 -22 6 -20" fill="none" stroke="#b07ac0" stroke-width="0.8" opacity="0.8"/>')
for sx in (-1, 1):
    slop.append(f'<path d="M{sx*1.6} -8.2Q{sx*4.2} -11 {sx*7} -8.2Q{sx*4.2} -6.4 {sx*1.6} -8.2Z" fill="#ffffff"/>')
    slop.append(f'<circle cx="{sx*4.3}" cy="-8.3" r="1.7" fill="#6a4a2a"/>')
    slop.append(f'<circle cx="{sx*4.3}" cy="-8.3" r="0.9" fill="#120a10"/>')
    slop.append(f'<circle cx="{sx*4.3-0.6}" cy="-8.9" r="0.5" fill="#fff"/>')
    slop.append(f'<path d="M{sx*1.4} -8.4Q{sx*4.2} -11.6 {sx*7.4} -8.6" fill="none" stroke="#1a0a18" stroke-width="0.7"/>')
    slop.append(f'<path d="M{sx*1.8} -12.4Q{sx*4.6} -14 {sx*7.2} -12.2" fill="none" stroke="#4a2a3a" stroke-width="0.6"/>')
slop.append('<path d="M-0.4 -6Q-0.8 -2.4 -1.6 -1.6Q0 -0.8 1.6 -1.6" fill="none" stroke="#d89090" stroke-width="0.5"/>')
slop.append('<path d="M-3.2 1.6Q0 0.6 3.2 1.6Q0 4.2 -3.2 1.6Z" fill="#e8607a"/>')
slop.append('<path d="M-1.5 2.4Q0 3 1.5 2.4" fill="none" stroke="#fff" stroke-width="0.5" opacity="0.8"/>')
# a raised hand by the face, waving: smooth, perfect, with six fingers
hx, hy = 11, 14
slop.append(f'<path d="M{hx-3} {hy+3}L{hx-3.4} {hy+16}L{hx+3.4} {hy+16}L{hx+3} {hy+3}Z" fill="#f4b8a4"/>')
for i in range(6):
    a = math.radians(-150 + i * 24)
    L = 10.5 - abs(i - 2.5) * 0.8 - (2.4 if i == 0 else 0)
    x1, y1 = hx + math.cos(a) * 3, hy - 1 + math.sin(a) * 3.4
    x2, y2 = hx + math.cos(a) * L, hy - 1 + math.sin(a) * L * 1.05
    slop.append(f'<path d="M{f(x1)} {f(y1)}L{f(x2)} {f(y2)}" stroke="#f8c8b4" stroke-width="1.9" stroke-linecap="round"/>')
    slop.append(f'<path d="M{f(x1)} {f(y1)}L{f(x2)} {f(y2)}" stroke="#d8988a" stroke-width="0.4" stroke-linecap="round" transform="translate(0.7 0.3)"/>')
slop.append(f'<ellipse cx="{hx}" cy="{hy}" rx="4.4" ry="5" fill="#f8c8b4"/>')
slop.append(f'<ellipse cx="{hx-1}" cy="{hy-0.8}" rx="1.8" ry="2.2" fill="#fff" opacity="0.4"/>')
# plastic gloss
slop.append('<path d="M-22 -30L4 -30L-22 2Z" fill="#ffffff" opacity="0.28"/>')
# the four-pointed sparkle that marks generated pictures
def spark(x, y, R):
    return f'M{f(x)} {f(y-R)}Q{f(x)} {f(y)} {f(x+R)} {f(y)}Q{f(x)} {f(y)} {f(x)} {f(y+R)}Q{f(x)} {f(y)} {f(x-R)} {f(y)}Q{f(x)} {f(y)} {f(x)} {f(y-R)}Z'
slop.append(f'<path d="{spark(16.5, -23.5, 4.2)}" fill="#ffffff" opacity="0.95"/>')
slop.append(f'<path d="{spark(11.8, -19, 1.8)}" fill="#ffffff" opacity="0.85"/>')
slop.append('</g>')
slop.append('<g id="slop"><use href="#slopin"/><rect x="-22" y="-30" width="44" height="60" rx="3" fill="none" stroke="#f4f0ff" stroke-width="1.6"/></g>')
C.defs.append(''.join(slop))


def copy(x, y, s=1.0, rot=0.0, shade=0.0):
    C.a(f'<use href="#slop" transform="translate({f(x)} {f(y)}) rotate({f(rot)}) scale({f(s)})"/>')
    if shade > 0:
        C.a(f'<rect x="-22" y="-30" width="44" height="60" rx="3" fill="#0a0c18" opacity="{f(shade)}" transform="translate({f(x)} {f(y)}) rotate({f(rot)}) scale({f(s)})"/>')


# screen body
C.path(f"M{SX-14} {SY-14}h{SW+28}v{SH+28}h{-(SW+28)}Z", '#0a0a12', 0.6, f' filter="url(#{C.blur(14)})"')
C.a(f'<rect x="{SX-10}" y="{SY-10}" width="{SW+20}" height="{SH+20}" rx="26" fill="#14141e"/>')
C.a(f'<rect x="{SX-10}" y="{SY-10}" width="{SW+20}" height="{SH+20}" rx="26" fill="none" stroke="#3a3c50" stroke-width="2"/>')
sc = C.id('c')
C.defs.append(f'<clipPath id="{sc}"><rect x="{SX}" y="{SY}" width="{SW}" height="{SH}" rx="18"/></clipPath>')
C.a(f'<g clip-path="url(#{sc})">')
C.a(f'<rect x="{SX}" y="{SY}" width="{SW}" height="{SH}" fill="url(#{C.lg([(0, "#ff70b0"), (0.75, "#ff7eb6"), (0.76, "#7a3a8a"), (1, "#5a2a6a")], 0, SY, 0, SY+SH)})"/>')
C.a(f'<use href="#slopin" transform="translate({SX+SW/2} {SY+SH/2+20}) scale(5.6)"/>')
C.a(f'<rect x="{SX}" y="{SY}" width="{SW}" height="{SH}" fill="#a8bccc" opacity="0.42"/>')
C.a('</g>')

# ------------------------------------------------------------------ the endless ribbon of copies pouring from the screen
# a stream falling from the bottom of the screen in a long curve, then a heap around the armchair
stream = catmull([(SX + 60, SY + SH + 6), (SX + 30, SY + SH + 70), (SX - 20, SY + SH + 140), (SX - 50, 770)], 7)
# heap first (behind the stream and the man's legs): a low hill of copies
heap = []
for k in range(60):
    x = r.uniform(900, 1460)
    top = 740 + ((x - 1180) / 300) ** 2 * 50
    y = r.uniform(top, 850)
    heap.append((y, x))
heap.sort()
for (y, x) in heap:
    copy(x, y, r.uniform(0.85, 1.05), r.uniform(-70, 70), shade=max(0, min(0.6, (abs(x - 1100) / 700) + (850 - y) / 900)))

# ------------------------------------------------------------------ the armchair
chair_back = smooth_d([(820, 480), (880, 460), (920, 500), (930, 660), (900, 720), (820, 720), (800, 600)], 5)
C.shaded(chair_back, '#4a4a62', '#2a2a3c', '#12121c', (800, 460, 930, 720), light=(0.8, -0.3), k=18, rough='roughf')
seat = smooth_d([(830, 640), (1080, 646), (1100, 680), (1080, 730), (840, 734), (820, 690)], 5)
C.shaded(seat, '#4e5068', '#2c2c40', '#12121c', (820, 640, 1100, 734), light=(0.8, -0.4), k=14, rough='roughf')

# ------------------------------------------------------------------ the man, sunk and grey, facing the screen
grey = ('#c8ccd8', '#8a8e9e', '#4a4c5c', '#1e1e2a')
hood = ('#7a7e90', '#4e5062', '#2a2a38', '#14141e')
lit = ('#bfe8ff', 0.55)
# legs: thighs forward, shins down into the heap
jeans = ('#6a6e80', '#44465a', '#24242e', '#101018')
tube(C, [(920, 668), (1000, 664), (1076, 668)], [62, 54, 44], jeans, light=(0.7, -0.6))
tube(C, [(1070, 668), (1082, 730), (1090, 800)], [44, 40, 32], jeans, light=(0.7, -0.6))
# torso: slumped C-curve, lower back deep in the chair, shoulders rolled forward, chest caved
tor = [(870, 566), (888, 530), (922, 510), (956, 516), (972, 540), (976, 580), (990, 624), (986, 664), (944, 690), (892, 692),
       (866, 656), (860, 610)]
C.path(smooth_d(tor, 5), '#0a0a12', 0.4, f' transform="translate(-10 8)" filter="url(#{C.blur(10)})"')
td = body_shape(C, tor, hood, light=(0.8, -0.4), k=20)
tc = C.id('c')
C.defs.append(f'<clipPath id="{tc}"><path d="{td}"/></clipPath>')
C.a(f'<g clip-path="url(#{tc})">')
C.a(f'<rect x="850" y="500" width="150" height="200" fill="url(#{C.lg([(0, "#9ad8ff", 0), (1, "#9ad8ff", 0.45)], 900, 0, 995, 0)})"/>')
fold(C, [(900, 560), (940, 600), (975, 630)], 7, hood[3], 0.45)
fold(C, [(890, 610), (935, 650), (970, 668)], 6, hood[3], 0.4)
fold(C, [(960, 560), (972, 600)], 5, hood[3], 0.4)
C.a('</g>')
# hoodie collar around the neck
C.path(smooth_d([(912, 516), (948, 506), (972, 522), (962, 540), (926, 536)], 4), hood[2])
C.brush([(916, 518), (946, 510), (968, 524)], 4, hood[0], 0.5, tin=0.3, tout=0.3)
# head: thrust forward and drooping, eyes open and glazed, face washed by the screen
head_profile(C, 984, 482, 39, SK["grey"], ('#5a5a66', '#3a3a46', '#1a1a22'), flip=1, tilt=-14, eye="glazed", look=1.0,
             style='short', light=(0.8, -0.3), lit=('#cdeeff', 0.7), blush=0.0, lips='#7a6a7a', pivot=1.25)
# arm hanging, hand limp on the thigh
tube(C, [(930, 530), (944, 590), (960, 636), (1000, 652)], [38, 33, 28, 24], hood, light=(0.8, -0.4))
hand_flat(C, 996, 652, 50, 14, ('#c8d4e0', '#8a92a4', '#4a4e60', '#1e1e2a'), spread=0.05, curl=0.6, light=(0.6, -0.7))

# the stream of copies passing in front of the heap, from the screen down to the floor
for k, (x, y) in enumerate(stream[::3]):
    t = k / max(1, len(stream[::3]) - 1)
    copy(x + r.uniform(-8, 8), y, 1.0, -20 + t * 70 + r.uniform(-8, 8), shade=t * 0.25)
# a few copies sliding over his lap and knees: they bury him
for (x, y, a) in [(1100, 776, 15), (1150, 750, -35), (1060, 826, 5)]:
    copy(x, y, 1.0, a, shade=0.1)

# ------------------------------------------------------------------ the dancer (left), leaping towards the light
PX, PY = 430, 430
skin = SK['olive']
leo = ('#7ad8d0', '#2a9a9a', '#14585e', '#0a2a30')
# her shadow on the floor, far below the leap
C.ell(PX + 10, FLOOR + 30, 250, 12, '#5a3420', 0.35, f' filter="url(#{C.blur(10)})"')
# cold reflection of the screen on the dark floor
C.ell(SX + SW / 2 - 80, FLOOR + 40, 260, 22, '#7ac8ff', 0.16, f' filter="url(#{C.blur(16)})"')
# the brushstroke her trailing hand paints in the air: it rises, curls and comes back towards her
path = [(634, 220), (690, 184), (752, 192), (786, 246), (774, 318), (724, 362), (656, 374), (604, 352)]
dense = catmull(path, 10)
def offset(dense, off_fn):
    out = []
    for i, (x, y) in enumerate(dense):
        a = dense[max(i - 1, 0)]
        b = dense[min(i + 1, len(dense) - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        l = math.hypot(tx, ty) or 1
        s = i / (len(dense) - 1)
        o = off_fn(s)
        out.append((x - ty / l * o, y + tx / l * o))
    return out
grad = C.lg([(0, '#f6c84a'), (0.3, '#f08a2a'), (0.55, '#d8343a'), (0.8, '#a83a8a'), (1, '#2a9ab0')], 640, 190, 640, 380)
C.brush(dense, 62, f'url(#{grad})', 0.95, tin=0.3, tout=0.35, wob=0.12, extra=' filter="url(#rough)"')
cols = ['#8a1a2a', '#f6d070', '#e04a2a', '#2a9a9a', '#fff0c0', '#c0302a', '#f8a040', '#5a2a8a']
for k in range(28):
    o = r.uniform(-1, 1)
    col = cols[k % len(cols)]
    pts = offset(dense, lambda s, o=o: o * 30 * math.sin(math.pi * min(1, s * 1.6 + 0.05)) ** 0.6)
    st = r.uniform(0.0, 0.25)
    en = r.uniform(0.8, 1.0)
    C.brush(pts[int(st * len(pts)):int(en * len(pts)):2], r.uniform(3, 8), col, r.uniform(0.45, 0.85), tin=0.3, tout=0.4, wob=0.3)
# dry-brush bristle tail and a few flung drops
for k in range(9):
    o = r.uniform(-1, 1) * 22
    pts = offset(dense[-14:], lambda s, o=o: o)
    C.brush(pts, 2, r.choice(['#2a9ab0', '#5a2a8a', '#f6d070']), 0.7, tin=0.0, tout=0.6)
for k in range(22):
    i = r.randint(5, len(dense) - 5)
    x, y = dense[i]
    a = r.uniform(0, math.tau)
    d = r.uniform(40, 80)
    C.ell(x + math.cos(a) * d, y + math.sin(a) * d, r.uniform(1.5, 4.5), r.uniform(1.4, 3.6), r.choice(['#f2c040', '#2a9a9a', '#f08a2a', '#7a3aa8', '#fff0c0']), 0.85)

# her body, mirrored group (designed facing +x, shown facing left)
C.a(f'<g transform="translate({PX} {PY}) scale(-1.12 1.12)">')
L = (0.6, -0.7)  # world light from the upper left = local upper right
skin_b = ('#e8be90', '#b88456', '#74462a', '#3a1e10')  # far limbs, a little darker
# far limbs
leg_pointed(C, (-4, 8), (-116, 22), (-228, 22), skin_b, L, thigh=44, foot_len=44, up=-1)
arm_bare(C, (-2, -126), (-70, -156), (-138, -176), skin_b, L, w=21)
hand_flat(C, -136, -176, 46, 196, skin_b, spread=0.12, thumb_side=-1, light=L)
# chiffon skirt streaming back
for k, (col, op) in enumerate([(leo[2], 0.55), (leo[1], 0.6), (leo[0], 0.45)]):
    sk = smooth_d([(-24, -34 + k * 4), (24, -30), (38, 0), (10, 26 - k * 6), (-60, 44 - k * 6), (-140, 34 - k * 12), (-112, 8), (-60, -10)], 5)
    C.path(sk, col, op, ' filter="url(#roughf)"')
# near leg (its top hidden under the leotard)
leg_pointed(C, (16, 4), (130, -10), (238, -28), skin, L, thigh=50, foot_len=46, up=1)
# torso: arched back, ribcage, waist, hips
tor = [(2, -156), (16, -158), (28, -148), (38, -128), (44, -108), (36, -84), (22, -60), (20, -40), (28, -14), (32, 4), (18, 16),
       (-6, 18), (-18, 4), (-15, -24), (-10, -50), (-14, -80), (-22, -110), (-16, -138)]
C.path(smooth_d(tor, 5), '#1a1010', 0.25, f' transform="translate(-8 10)" filter="url(#{C.blur(8)})"')
td = body_shape(C, tor, leo, light=L, k=12, rough=None)
# bare shoulders and neckline: skin above the leotard
C.path(smooth_d([(2, -154), (16, -156), (28, -146), (32, -132), (12, -128), (-12, -128), (-14, -140)], 4), skin[1])
C.brush([(-10, -136), (10, -134), (30, -138)], 3, skin[0], 0.6, tin=0.3, tout=0.3)
C.path(f"M-16 -128Q8 -120 34 -130", 'none', 1, f' stroke="{leo[3]}" stroke-width="2" opacity="0.6"')
C.brush([(30, -122), (38, -104), (30, -86)], 4, leo[0], 0.5, tin=0.3, tout=0.3)  # light on the bust
for k in range(4):
    C.diamond(-10 + k * 12, -30 + k * 0.6, 9, 12, '#f6d68a', '#8a6a2a', hl='#fff4c8')
# head lifted towards the light, eyes closed in joy
head_profile(C, 30, -196, 35, skin, ('#4a2a1a', '#24120a', '#0e0604'), flip=1, tilt=-14, eye='closed', style='bun',
             light=L, blush=0.2)
# near arm reaching up and forward
arm_bare(C, (22, -138), (88, -172), (150, -204), skin, L, w=25)
hand_flat(C, 148, -203, 50, -28, skin, spread=0.14, thumb_side=-1, light=L)
C.a('</g>')

# ------------------------------------------------------------------ atmosphere
for k in range(40):  # floating motes of light on the left
    C.ell(r.uniform(30, 720), r.uniform(60, 740), 1.6, 1.6, '#fffbe0', r.uniform(0.3, 0.8))
vg = C.rg([(0, '#000', 0), (0.7, '#000', 0), (1, '#08060c', 0.45)], W / 2, H / 2, 900)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{vg})"/>')

finish(C, OUT_SVG, OUT_PNG)
