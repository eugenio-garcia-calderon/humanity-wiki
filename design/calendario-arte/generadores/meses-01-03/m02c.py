"""Mes 2 · Relaciones · Diseño 3.
Una mesa larga partida. LUZ (izq.): bajo una lámpara encendida, una mujer y un hombre parten y se pasan el pan
mientras un anciano los mira; los tres se miran entre sí. SOMBRA (der.): la misma mesa a oscuras; cada persona
encerrada en una campana de cristal, cabizbaja, con el móvil como única luz."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun3 import *  # noqa
from comun import hand2, torso, arm

C = Canvas(23)
R = C.r
MID = 742.5
TOP0, TOP1 = 575, 668   # far and near edge of the table top
HEM = 800               # bottom of the tablecloth
HR = 44                 # head radius (88 px tall heads)

# mask: 0 on the left, 1 on the right, soft across the seam
mk = C.id('m')
mg = C.lg([(0, '#000'), (1, '#fff')], MID - 60, 0, MID + 60, 0)
C.defs.append(f'<mask id="{mk}" maskUnits="userSpaceOnUse" x="0" y="0" width="1485" height="850"><rect width="1485" height="850" fill="url(#{mg})"/></mask>')


def wall(warm):
    if warm:
        g = C.rg([(0, '#ffd890'), (0.25, '#e8a860'), (0.6, '#a85e34'), (1, '#4a2418')], 405, 200, 900)
    else:
        g = C.rg([(0, '#2c3448'), (0.5, '#1a2032'), (1, '#0a0c16')], 1080, 300, 900)
    C.a(f'<rect width="1485" height="{TOP1}" fill="url(#{g})"/>')
    # soft plaster patches
    for _ in range(14):
        x, y = R.uniform(0, 1485), R.uniform(0, 560)
        C.a(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(R.uniform(80,200))}" ry="{f(R.uniform(40,90))}" fill="{"#fff0d0" if warm else "#5a6a88"}" opacity="0.07" filter="url(#{C.blur(30)})"/>')


def table(warm):
    if warm:
        hi, mid, lo, deep = '#fff4dc', '#ecd6ae', '#b08e64', '#5a3e26'
    else:
        hi, mid, lo, deep = '#9aa4b4', '#6a7486', '#3a4252', '#141a24'
    # top surface
    g = C.lg([(0, lo), (0.25, mid), (1, hi)], 0, TOP0, 0, TOP1)
    C.path(f'M30 {TOP0}L1455 {TOP0}L1470 {TOP1}L15 {TOP1}Z', f'url(#{g})')
    # hanging cloth with vertical folds
    g2 = C.lg([(0, hi), (0.15, mid), (1, lo)], 0, TOP1, 0, HEM)
    C.path(f'M15 {TOP1}L1470 {TOP1}L1474 {HEM}L11 {HEM}Z', f'url(#{g2})')
    xs = [20]
    while xs[-1] < 1470:
        xs.append(xs[-1] + R.uniform(70, 150))
    for x in xs:
        wv = R.uniform(14, 30)
        C.brush([(x, TOP1 + 6), (x + R.uniform(-6, 6), (TOP1 + HEM) / 2), (x + R.uniform(-10, 10), HEM - 4)], wv, deep, R.uniform(0.1, 0.2), f' filter="url(#{C.blur(8)})"', tin=0.2, tout=0.05)
        C.brush([(x + wv * 0.8, TOP1 + 10), (x + wv * 0.8 + R.uniform(-4, 4), (TOP1 + HEM) / 2), (x + wv * 0.9, HEM - 6)], wv * 0.5, hi, 0.2, f' filter="url(#{C.blur(6)})"', tin=0.3, tout=0.1)
    C.path(f'M15 {TOP1}L1470 {TOP1}L1470 {TOP1+5}L15 {TOP1+5}Z', hi, 0.7)
    C.a(f'<rect x="11" y="{TOP1+5}" width="1463" height="40" fill="{deep}" opacity="0.18" filter="url(#{C.blur(10)})"/>')
    C.a(f'<rect x="11" y="{HEM-60}" width="1463" height="60" fill="{deep}" opacity="0.22" filter="url(#{C.blur(16)})"/>')


def floor(warm):
    g = C.lg([(0, '#5a3420' if warm else '#161a24'), (1, '#1e100a' if warm else '#06080c')], 0, HEM, 0, 850)
    C.path(f'M0 {HEM-4}L1485 {HEM-4}L1485 850L0 850Z', f'url(#{g})')
    C.a(f'<rect x="0" y="{HEM-4}" width="1485" height="22" fill="#000" opacity="0.45" filter="url(#{C.blur(6)})"/>')


def chair(x, yb, warm, full=False):
    """High-backed wooden chair seen from the front; only the back shows above the table."""
    cols = ('#b07a48', '#7a4a26', '#3a2010') if warm else ('#5a5e6a', '#3a3e48', '#14161c')
    top = yb - 230
    for side in (-1, 1):
        px = x + side * 78
        d = f'M{f(px-7)} {f(yb)}L{f(px-6)} {f(top+8)}Q{f(px)} {f(top-6)} {f(px+6)} {f(top+8)}L{f(px+7)} {f(yb)}Z'
        C.shaded(d, cols[0], cols[1], cols[2], (px - 7, top - 6, px + 7, yb), light=(-0.6, -0.5), k=3, rough=None)
    rail = smooth_d([(x - 80, top + 6), (x, top - 6), (x + 80, top + 6), (x + 80, top + 30), (x, top + 20), (x - 80, top + 30)], 4)
    C.shaded(rail, cols[0], cols[1], cols[2], (x - 80, top - 6, x + 80, top + 30), light=(-0.3, -0.9), k=5, rough=None)
    if full:
        for k in (-1, 0, 1):
            sx = x + k * 30
            d = f'M{f(sx-5)} {f(top+26)}L{f(sx+5)} {f(top+26)}L{f(sx+5)} {f(yb)}L{f(sx-5)} {f(yb)}Z'
            C.shaded(d, cols[0], cols[1], cols[2], (sx - 5, top + 26, sx + 5, yb), light=(-0.6, -0.4), k=2.5, rough=None)
        C.shaded(f'M{f(x-76)} {f(top+120)}L{f(x+76)} {f(top+120)}L{f(x+76)} {f(top+132)}L{f(x-76)} {f(top+132)}Z', cols[0], cols[1], cols[2],
                 (x - 76, top + 120, x + 76, top + 132), light=(-0.3, -0.9), k=3, rough=None)


def lamp(x, lit):
    C.a(f'<path d="M{f(x)} 0L{f(x)} 120" stroke="#1a1010" stroke-width="2.4"/>')
    shade = f'M{f(x-14)} 118L{f(x+14)} 118L{f(x+66)} 178Q{f(x)} 190 {f(x-66)} 178Z'
    if lit:
        C.a(f'<polygon points="{f(x-62)},182 {f(x+62)},182 {f(x+330)},{TOP1} {f(x-330)},{TOP1}" fill="#ffe2a0" opacity="0.16" filter="url(#{C.blur(26)})"/>')
        C.glow(x, 190, 260, '#ffdc90', 0.55)
        C.shaded(shade, '#e8a050', '#a85a24', '#4a2010', (x - 66, 118, x + 66, 190), light=(-0.5, -0.6), k=8, rough=None)
        C.ell(x, 181, 60, 9, '#fff6d8', 1)
        C.ell(x, 186, 26, 9, '#ffffff', 0.9, f' filter="url(#{C.blur(4)})"')
    else:
        C.shaded(shade, '#4a5060', '#2a2e3a', '#0c0e14', (x - 66, 118, x + 66, 190), light=(-0.5, -0.6), k=8, rough=None)
        C.ell(x, 181, 58, 8, '#10121a', 1)
        C.ell(x, 183, 18, 6, '#3a3e48', 0.8)


def bread_half(cx, cy, s, flip=1):
    """Half of a round loaf; the torn crumb face turned toward the other half."""
    crust = smooth_d([(cx - flip * s, cy + s * 0.3), (cx - flip * s * 0.9, cy - s * 0.45), (cx - flip * s * 0.3, cy - s * 0.8),
                      (cx + flip * s * 0.25, cy - s * 0.6), (cx + flip * s * 0.35, cy + s * 0.35), (cx - flip * s * 0.3, cy + s * 0.55)], 5)
    C.shaded(crust, '#f0b060', '#b8702c', '#5a2c10', (cx - s, cy - s * 0.8, cx + s * 0.35, cy + s * 0.55), light=(-0.4, -0.8), k=s * 0.25, rough='roughf')
    crumb = smooth_d([(cx + flip * s * 0.2, cy - s * 0.55), (cx + flip * s * 0.4, cy - s * 0.1), (cx + flip * s * 0.38, cy + s * 0.35),
                      (cx + flip * s * 0.12, cy + s * 0.3), (cx + flip * s * 0.05, cy - s * 0.2)], 4)
    C.shaded(crumb, '#fff4dc', '#f0d8a8', '#c0985c', (cx, cy - s * 0.55, cx + s * 0.4, cy + s * 0.35), light=(-0.3, -0.7), k=s * 0.08, rough='roughf')
    for _ in range(9):
        C.ell(cx + flip * R.uniform(s * 0.12, s * 0.34), cy + R.uniform(-s * 0.4, s * 0.25), R.uniform(1, 2.2), R.uniform(0.8, 1.6), '#b89058', 0.6)
    for k in range(3):
        C.brush([(cx - flip * s * (0.75 - k * 0.22), cy - s * (0.35 + k * 0.1)), (cx - flip * s * (0.55 - k * 0.22), cy - s * (0.55 + k * 0.05))], 3, '#ffd890', 0.5, tin=0.3, tout=0.3)


def plate(cx, cy, warm, food=False):
    rim = ('#fff8ec', '#e0d0b8', '#9a8670') if warm else ('#a8b0bc', '#7a828e', '#3a404a')
    C.ell(cx + 3, cy + 5, 52, 11, '#000', 0.3, f' filter="url(#{C.blur(4)})"')
    C.ell(cx, cy, 50, 12, rim[1])
    C.ell(cx, cy - 1, 46, 10, rim[0], 0.9)
    C.ell(cx, cy + 1, 30, 6, rim[2], 0.35)
    if food:
        for k in range(5):
            C.ell(cx - 18 + k * 9, cy - 4 - (k % 2) * 3, 7, 5, ['#e07a2a', '#7a2a4a', '#c89a30'][k % 3])


def person(x, cy, skin, hair, cloth, facing, gaze, hairstyle, smile, light, tilt=0):
    body(C, x, cy + HR * 1.32, 80, cloth, skin, light=light)
    head34(C, x, cy, HR, skin, hair, facing=facing, gaze=gaze, hairstyle=hairstyle, smile=smile, light=light, tilt=tilt)


def upper_arms(x, cloth, sh_y, elbows):
    for side, (ex, ey) in zip((-1, 1), elbows):
        pts = [(x + side * 70, sh_y), (x + side * 80 + (ex - x - side * 80) * 0.4, (sh_y + ey) / 2), (ex, ey)]
        d = taper_d(pts, 42, 31)
        ball(C, x + side * 68, sh_y + 2, 22, cloth[0], cloth[1], cloth[2], k=7, light=(-0.4 * side, -0.8))
        C.path(d, '#120806', 0.25, f' transform="translate({-side*3} 4)" filter="url(#{C.blur(4)})"')
        C.shaded(d, cloth[0], cloth[1], cloth[2], bbox(pts, 19), light=(-0.4 * side, -0.8), k=10, rough='roughf')
        C.brush([(pts[0][0] - side * 6, pts[0][1] + 10), (pts[1][0] - side * 9, pts[1][1]), (ex - side * 8, ey - 8)], 4, cloth[2], 0.35, tin=0.3, tout=0.3)


def forearm(pts, w, cloth, skin):
    d = taper_d(pts, w, w * 0.82)
    C.path(d, '#120806', 0.3, f' transform="translate(3 6)" filter="url(#{C.blur(4)})"')
    C.shaded(d, cloth[0], cloth[1], cloth[2], bbox(pts, w / 2), light=(-0.3, -0.9), k=w * 0.3, rough='roughf')


# ================================================================ background
C.a('<g transform="translate(742 540) scale(1.1) translate(-742 -540)">')
wall(True)
C.a(f'<g mask="url(#{mk})">')
wall(False)
C.a('</g>')
lamp(412, True)
for x in (190, 412, 628):
    chair(x, TOP0 + 4, True)

# ================================================================ LUZ: three people sharing bread
SK = {
    'olive': ('#f2c49a', '#c08458', '#5a3018'),
    'dark': ('#bc8258', '#7a4628', '#3a1c10'),
    'light': ('#ffdcc0', '#e0a482', '#7a4630'),
}
AC = ('#e07a50', '#a8442a', '#4a1a10')
BC = ('#3aa29a', '#1e6a66', '#0a2a2a')
CC = ('#e8b84a', '#b07a20', '#4a2a08')


def upper_arms2(x, cloth, sh_y, half, elbows, light):
    for side, (ex, ey) in zip((-1, 1), elbows):
        sx = x + side * half
        pts = [(sx, sh_y), (sx + side * 10 + (ex - sx) * 0.35, (sh_y + ey) / 2), (ex, ey)]
        d = taper_d(pts, 42, 30)
        ball(C, sx - side * 2, sh_y + 2, 21, cloth[0], cloth[1], cloth[2], k=7, light=light)
        C.path(d, '#120806', 0.25, f' transform="translate({-side*3} 4)" filter="url(#{C.blur(4)})"')
        C.shaded(d, cloth[0], cloth[1], cloth[2], bbox(pts, 20), light=light, k=10, rough='roughf')
        # sleeve folds gathering toward the elbow
        my = (sh_y + ey) / 2
        for k_ in range(3):
            yy = my + 14 + k_ * 14
            xx = sx + side * 10 + (ex - sx) * (0.45 + k_ * 0.12)
            C.brush([(xx - 13, yy - 3 + side * 2), (xx, yy + 3), (xx + 13, yy - 3 - side * 2)], 3.2, cloth[2], 0.4, tin=0.3, tout=0.3)
            C.brush([(xx - 11, yy - 7), (xx + 9, yy - 4)], 2.2, cloth[0], 0.35, tin=0.3, tout=0.3)


def forearm2(elbow, wrist, cloth, skin):
    d = taper_d([elbow, wrist], 32, 24)
    C.path(d, '#120806', 0.3, f' transform="translate(3 6)" filter="url(#{C.blur(4)})"')
    C.shaded(d, cloth[0], cloth[1], cloth[2], bbox([elbow, wrist], 16), light=(-0.3, -0.9), k=8, rough='roughf')
    C.ell(elbow[0], elbow[1], 15, 11, cloth[1])
    # cuff and bare wrist
    ux, uy = wrist[0] - elbow[0], wrist[1] - elbow[1]
    L = math.hypot(ux, uy) or 1
    C.ell(wrist[0] - ux / L * 3, wrist[1] - uy / L * 3, 12, 7, cloth[2], 0.9, f' transform="rotate({f(math.degrees(math.atan2(uy, ux))+90)} {f(wrist[0] - ux / L * 3)} {f(wrist[1] - uy / L * 3)})"')


# A: a woman, turned toward B, breaking the loaf
body(C, 190, 364 + HR * 1.32, 72, AC, SK['olive'], light=(0.6, -0.7))
head34(C, 190, 364, HR, SK['olive'], ('#4a3428', '#22140c', '#080404'), facing=0.42, gaze=(0.95, 0.15), hairstyle='bun', smile=0.7, light=(0.6, -0.7), tilt=7)
# B: a bearded man, turned toward A, taking his half
body(C, 412, 356 + HR * 1.32, 90, BC, SK['dark'], light=(0.0, -1.0))
head34(C, 412, 356, HR, SK['dark'], ('#2a1c14', '#140a08', '#050302'), facing=-0.42, gaze=(-0.95, 0.2), hairstyle='short', smile=0.8,
       light=(-0.2, -0.9), tilt=-6, beard=('#3a2418', '#1a0e08'))
# C: an older man with grey hair, smiling at the two of them
body(C, 630, 374 + HR * 1.32, 80, CC, SK['light'], light=(-0.6, -0.7))
head34(C, 630, 374, HR, SK['light'], ('#e8e2da', '#a8a098', '#5a544e'), facing=-0.38, gaze=(-0.9, 0.2), hairstyle='short', smile=0.6,
       light=(-0.6, -0.7), tilt=-4, beard=('#f0ece6', '#b8b0a8'))

# ================================================================ SOMBRA: people under glass bells, lit only by their phones
SKc = ('#8a98b0', '#56607a', '#1a1e2c')
for (x, hairc, clc, hs, w) in ((862, ('#5a5a66', '#2a2a34', '#0a0a10'), ('#5a6478', '#343a4a', '#10121a'), 'short', 86),
                               (1300, ('#6a5a56', '#33282a', '#0c0808'), ('#6a5a70', '#3a3044', '#120e18'), 'long', 72)):
    cy = 414
    body(C, x, cy + HR * 1.2, w, clc, SKc, light=(0, -1))
    head34(C, x, cy, HR, SKc, hairc, facing=0.05, gaze=(0.1, 1), eyes='half', hairstyle=hs, smile=-0.25, light=(0, 0.9),
           tilt=(-5 if x < 1000 else 5), cast=('#9fd2ff', 0.75, (x, cy + HR * 1.6)), lips='#6a5a68')

# ================================================================ table (warm, then cold masked)
table(True)
C.a(f'<g mask="url(#{mk})">')
table(False)
C.a('</g>')
floor(True)
C.a(f'<g mask="url(#{mk})">')
floor(False)
C.a('</g>')
C.a(f'<ellipse cx="412" cy="{TOP0+44}" rx="380" ry="56" fill="#fff0c0" opacity="0.4" filter="url(#{C.blur(22)})"/>')

upper_arms2(190, AC, 432, 62, [(124, 594), (262, 594)], (0.5, -0.8))
upper_arms2(412, BC, 430, 78, [(330, 594), (494, 594)], (-0.2, -0.9))
upper_arms2(630, CC, 444, 70, [(552, 594), (708, 594)], (-0.6, -0.7))
for (x, w, clc) in ((862, 86, ('#5a6478', '#343a4a', '#10121a')), (1300, 72, ('#6a5a70', '#3a3044', '#120e18'))):
    upper_arms2(x, clc, 470, w * 0.82, [(x - 58, 596), (x + 58, 596)], (0, -1))
# ---------------------------------------------------------------- left: one action, the bread broken and passed
plate(470, 646, True, food=True)
# A
forearm2((124, 596), (164, 640), AC, SK['olive'])
hand3(C, 164, 640, 40, 14, SK['olive'], curl=(0.15, 0.2, 0.25, 0.3), thumb_side=-1, light=(0.4, -0.8))
forearm2((262, 596), (284, 636), AC, SK['olive'])
# B
forearm2((330, 596), (364, 638), BC, SK['dark'])
forearm2((494, 596), (520, 640), BC, SK['dark'])
hand3(C, 520, 640, 42, 160, SK['dark'], curl=(0.2, 0.25, 0.3, 0.35), thumb_side=-1, light=(0.2, -0.9))
# the loaf, broken in two halves held between them
C.a(f'<ellipse cx="322" cy="640" rx="66" ry="9" fill="#3a2010" opacity="0.35" filter="url(#{C.blur(5)})"/>')
bread_half(294, 604, 42, flip=1)
bread_half(352, 606, 40, flip=-1)
for _ in range(12):
    C.ell(R.uniform(296, 352), R.uniform(636, 650), R.uniform(1, 2), 1, '#c89050', 0.8)
hand3(C, 284, 636, 42, -50, SK['olive'], curl=(0.55, 0.6, 0.65, 0.7), thumb_side=1, light=(0.4, -0.8))
hand3(C, 364, 638, 42, -130, SK['dark'], curl=(0.55, 0.6, 0.65, 0.7), thumb_side=-1, light=(0.0, -0.9))
# C: hands at rest, one over the other
forearm2((552, 596), (604, 646), CC, SK['light'])
forearm2((708, 596), (664, 646), CC, SK['light'])
hand3(C, 604, 646, 42, 6, SK['light'], curl=(0.15, 0.2, 0.25, 0.3), thumb_side=-1, light=(-0.5, -0.8))
hand3(C, 664, 644, 42, 178, SK['light'], curl=(0.15, 0.2, 0.25, 0.3), thumb_side=1, light=(-0.5, -0.8))

# ---------------------------------------------------------------- right: phones and glass
for x in (862, 1300):
    C.glow(x, 570, 130, '#8cc8ff', 0.5)
    clc = ('#5a6478', '#343a4a', '#10121a') if x < 1000 else ('#6a5a70', '#3a3044', '#120e18')
    forearm2((x - 58, 598), (x - 30, 632), clc, SKc)
    forearm2((x + 58, 598), (x + 30, 632), clc, SKc)
    C.a(f'<rect x="{f(x-15)}" y="{TOP0+10}" width="30" height="46" rx="5" fill="#101218" transform="rotate(-8 {f(x)} {TOP0+30})"/>')
    C.a(f'<rect x="{f(x-15)}" y="{TOP0+10}" width="30" height="3" rx="1.5" fill="#cfe8ff" opacity="0.9" transform="rotate(-8 {f(x)} {TOP0+30})"/>')
    hand3(C, x - 30, 632, 32, -50, handskin(SKc), curl=(0.7, 0.75, 0.8, 0.8), thumb_side=1)
    hand3(C, x + 30, 632, 32, -130, handskin(SKc), curl=(0.7, 0.75, 0.8, 0.8), thumb_side=-1)
    bw, top = 112, 248
    base = TOP0 + 40
    dome = (f'M{f(x-bw)} {base}C{f(x-bw)} {f(top+120)} {f(x-bw*0.72)} {f(top)} {f(x)} {f(top)}'
            f'C{f(x+bw*0.72)} {f(top)} {f(x+bw)} {f(top+120)} {f(x+bw)} {base}Z')
    gg = C.lg([(0, '#cfe4ff', 0.22), (0.25, '#8ab0d8', 0.06), (0.75, '#8ab0d8', 0.06), (1, '#cfe4ff', 0.24)], x - bw, 0, x + bw, 0)
    C.path(dome, f'url(#{gg})')
    C.a(f'<path d="{dome}" fill="none" stroke="#d8ecff" stroke-width="2" opacity="0.4"/>')
    C.brush([(x - bw * 0.78, base - 30), (x - bw * 0.86, top + 150), (x - bw * 0.55, top + 40)], 16, '#ffffff', 0.18, f' filter="url(#{C.blur(4)})"', tin=0.3, tout=0.3)
    C.brush([(x - bw * 0.7, base - 80), (x - bw * 0.78, top + 160), (x - bw * 0.5, top + 52)], 4, '#ffffff', 0.7, tin=0.3, tout=0.4)
    C.brush([(x + bw * 0.82, base - 50), (x + bw * 0.88, top + 160)], 7, '#cfe4ff', 0.22, f' filter="url(#{C.blur(2)})"', tin=0.3, tout=0.3)
    C.a(f'<ellipse cx="{f(x)}" cy="{f(TOP0-50)}" rx="{f(bw*0.9)}" ry="80" fill="#8cc8ff" opacity="0.12" filter="url(#{C.blur(20)})"/>')
    C.ell(x, top - 8, 15, 10, '#cfe4ff', 0.35)
    C.ell(x - 4, top - 11, 5, 3, '#ffffff', 0.8)
    C.ell(x, base, bw, 14, 'none', 1, ' stroke="#e0f0ff" stroke-width="2.4" stroke-opacity="0.5"')
    C.ell(x, base + 4, bw + 4, 13, '#000', 0.25, f' filter="url(#{C.blur(5)})"')

C.a('</g>')
vg = C.rg([(0, '#000', 0), (0.65, '#000', 0), (1, '#000', 0.5)], 742, 425, 880)
C.a(f'<rect width="1485" height="850" fill="url(#{vg})"/>')
finish(C, OUT_SVG.format(2), OUT_PNG.format(2))
