"""Mes 11 · Política · Diseño 3: las mismas tres personas, dos veces.
LUZ (izquierda): en corro bajo un árbol, miradas que se cruzan, manos alzadas: deciden juntas.
SOMBRA (derecha): las mismas tres, con los ojos vendados, la mano alzada colgando de un hilo que baja de una
mano gigante entre nubes; un altavoz les grita desde arriba."""
import sys, math
sys.path.insert(0, '/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos3/gen')
from figura import *

C = lienzo(1111)
r = C.r
OUT_SVG = '/home/claude/humanity-wiki/design/calendario-arte/ilustraciones-fuente/mes-11-c.svg'
OUT_PNG = '/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos3/mes-11-c.png'

MX = 742
GZ = 560   # ground line

# ================= SKY =================
sky = C.lg([(0, '#fff0cc'), (0.28, '#f8d698'), (0.44, '#e8b88a'), (0.56, '#5a4060'), (0.72, '#2a2040'), (1, '#140f22')], 0, 0, W, 0)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{sky})"/>')
C.glow(120, 380, 620, '#fff6d8', 0.6)
# storm clouds on the right, heavy and low, where the hand comes from
for (x, y, rx, ry, col, op) in [(1160, 30, 460, 130, '#0c0a16', 0.9), (1380, 150, 260, 90, '#1a1428', 0.8), (880, 60, 240, 80, '#2a2238', 0.7),
                                (1200, 200, 320, 50, '#2a2034', 0.5), (960, 170, 180, 46, '#3a2c44', 0.45)]:
    softell(C, x, y, rx, ry, col, op, ry * 0.45)
for k in range(22):  # billows: dark masses with a faint lit rim on top
    x = r.uniform(780, 1490); y = r.uniform(-10, 190)
    rx_, ry_ = r.uniform(60, 130), r.uniform(26, 50)
    softell(C, x, y, rx_, ry_, r.choice(['#1a1426', '#241c32', '#120e1c']), 0.75, ry_ * 0.35)
    C.brush([(x - rx_ * 0.8, y - ry_ * 0.3), (x, y - ry_ * 0.95), (x + rx_ * 0.8, y - ry_ * 0.4)], ry_ * 0.25, '#6a5a7a', 0.22, f' filter="url(#{C.blur(4)})"', tin=0.4, tout=0.4)

# ================= GROUND =================
for (yb, amp, cols, x0, x1) in [(GZ - 70, 30, ('#d8d0a0', '#b0a87a', '#8a7a5a'), -20, 820), (GZ - 40, 20, ('#c8c890', '#9aa068', '#6a7048'), -20, 820)]:
    pts = [(x0, yb + 20)]
    for k in range(9):
        x = x0 + k * (x1 - x0) / 8
        pts.append((x, yb - amp * (0.5 + 0.5 * math.sin(k * 1.1 + yb))))
    pts += [(x1, yb + 40), (x1, GZ + 30), (x0, GZ + 30)]
    C.shaded(smooth_d(pts, 4), *cols, (x0, yb - amp, x1, GZ), light=(-0.8, -0.5), k=14, hl=False)
gl = C.lg([(0, '#b8b068'), (0.45, '#8a8a48'), (0.55, '#2a2434'), (1, '#120e1a')], 0, 0, W, 0)
C.path(f"M-20 {GZ}Q400 {GZ-14} 760 {GZ-4}Q1100 {GZ+4} 1505 {GZ-6}L1505 870L-20 870Z", f'url(#{gl})')
gd = C.lg([(0, '#000', 0), (1, '#000', 0.35)], 0, GZ, 0, H)
C.a(f'<rect x="0" y="{GZ}" width="{W}" height="{H-GZ}" fill="url(#{gd})"/>')
# grass strokes on the light side
for k in range(160):
    x = r.uniform(-10, 720); y = r.uniform(GZ + 4, 850)
    L_ = 8 + (y - GZ) * 0.06
    C.brush([(x, y), (x + r.uniform(-3, 3), y - L_ * 0.6), (x + r.uniform(-6, 6), y - L_)], 2 + (y - GZ) * 0.01, r.choice(['#c8c070', '#8a9a48', '#6a7a38', '#e0d890']), 0.55, tin=0, tout=0.8)

# ================= THE TREE (LUZ) =================
TX = 300
C.shadow(TX + 30, GZ + 8, 200, 16, 0.4)
trunk = [(TX - 34, GZ + 6), (TX - 24, GZ - 120), (TX - 30, GZ - 240), (TX - 60, GZ - 330), (TX - 20, GZ - 340), (TX + 4, GZ - 270),
         (TX + 40, GZ - 340), (TX + 70, GZ - 330), (TX + 26, GZ - 230), (TX + 24, GZ - 110), (TX + 38, GZ + 6)]
C.shaded(smooth_d(trunk, 4), '#c8a070', '#7a5432', '#2a1a0c', bbox(trunk), light=(-0.7, -0.5), k=16, rough='rough')
for k in range(8):
    x = TX - 22 + k * 6
    C.brush([(x, GZ), (x + r.uniform(-4, 4), GZ - 120), (x + r.uniform(-6, 6), GZ - 220)], 2, '#3a2412', 0.35, tin=0.2, tout=0.4)
foliage(C, [(TX - 160, 150, 170, 100), (TX + 60, 110, 200, 110), (TX + 250, 170, 160, 90), (TX - 40, 220, 220, 80), (TX + 180, 250, 150, 60),
            (TX - 250, 240, 110, 60)],
        ['#f0f0a0', '#a8c860', '#5a8a3a', '#2a4a24'], 520, [0, 30, 60, 120, 150, 180, 210], L=(12, 22), wid=(4, 7))
# sun flecks falling through the leaves
for k in range(40):
    x = r.uniform(20, 700); y = r.uniform(GZ + 6, 840)
    C.ell(x, y, r.uniform(6, 16), r.uniform(2, 4), '#fff8c0', 0.25)

# ================= FIGURES =================
# three people; the same three appear on the dark side, blindfolded and on strings
PEOPLE = [  # skin, hair, style, cloth, belt
    ('brown', 'black', 'curly', ('#9ad8c8', '#3a9a88', '#0e4a44', '#06221e'), ('#f8e0a0', '#c89a40', '#5a3a08')),
    ('light', 'auburn', 'long', ('#f8c070', '#d8902a', '#6a3a08', '#2a1404'), ('#9ad8c8', '#3a8a7a', '#0e3a34')),
    ('dark', 'grey', 'short', ('#d8a8e0', '#8a4aa0', '#3a1448', '#1a0626'), ('#f8d8a0', '#c8902a', '#5a3404')),
]
BOTTOM = 870
L_ = -1

# ---- LUZ: a ring under the tree. Two face each other across it, the third (back to us) closes the circle.
# A: left, turned toward the others, raises the outer arm high with energy; the other hand open toward the ring
skin, hair, style, cloth, belt = PEOPLE[0]
AX, AY, AR = 178, 396, 50
sk = SK[skin]
sl, sr = cuello_torso(C, AX, AY, AR, sk, cloth, BOTTOM, sw=1.72, L=L_, waist=0.8, waist_y=AY + AR * 4.7, hip=0.92, belt=belt)
brazo2(C, sr, (sr[0] + 30, AY + 190), (sr[0] + 96, AY + 232), AR, cloth, sk, sleeve='elbow')
mano(C, sr[0] + 96, AY + 232, AR * 1.3, -12, sk, thumb=-1, curl=0.1, spread=0.6)
brazo2(C, sl, (sl[0] - 52, AY + 10), (sl[0] - 40, AY - 132), AR, cloth, sk, sleeve='elbow')
mano(C, sl[0] - 40, AY - 132, AR * 1.4, -84, sk, thumb=1, spread=1.1)
cabeza(C, AX, AY, AR, sk, HAIR[hair], facing=0.36, tilt=-3, eyes='look', gaze=(0.9, 0.25), style=style, smile=0.5)
# B: right, turned toward the others, raises the outer hand only to shoulder height, calm
skin, hair, style, cloth, belt = PEOPLE[2]
BX_, BY_, BR = 612, 396, 50
sk = SK[skin]
sl, sr = cuello_torso(C, BX_, BY_, BR, sk, cloth, BOTTOM, sw=1.72, L=L_, waist=0.8, waist_y=BY_ + BR * 4.7, hip=0.92, belt=belt)
brazo2(C, sl, (sl[0] - 10, BY_ + 196), (sl[0] - 40, BY_ + 262), BR, cloth, sk, sleeve='elbow')
mano(C, sl[0] - 40, BY_ + 262, BR * 1.3, 120, sk, thumb=1, curl=0.3)
brazo2(C, sr, (sr[0] + 70, BY_ + 120), (sr[0] + 62, BY_ - 10), BR, cloth, sk, sleeve='elbow')
mano(C, sr[0] + 62, BY_ - 10, BR * 1.35, -100, sk, thumb=-1, spread=0.8)
cabeza(C, BX_, BY_, BR, sk, HAIR[hair], facing=-0.36, tilt=4, eyes='look', gaze=(-0.9, 0.3), style=style, smile=0.4)
# C: in front, seen from behind, bigger: raises one arm straight up
skin, hair, style, cloth, belt = PEOPLE[1]
CX_, CY_, CR_ = 398, 560, 58
sk = SK[skin]
cl_, cr_ = espalda(C, CX_, CY_, CR_, cloth, BOTTOM + 40, sw=1.72)
brazo2(C, cr_, (cr_[0] + 16, CY_ + 230), (cr_[0] - 4, CY_ + 330), CR_, cloth, sk, sleeve='elbow')
brazo2(C, cl_, (cl_[0] - 50, CY_ + 30), (cl_[0] - 34, CY_ - 140), CR_, cloth, sk, sleeve='elbow')
mano(C, cl_[0] - 34, CY_ - 140, CR_ * 1.35, -94, sk, thumb=-1, spread=0.9)
# her long hair falls down the back
C.shaded(smooth_d([(CX_ - CR_ * 0.86, CY_ - CR_ * 0.3), (CX_ + CR_ * 0.86, CY_ - CR_ * 0.3), (CX_ + CR_ * 0.74, CY_ + CR_ * 1.9), (CX_, CY_ + CR_ * 2.15), (CX_ - CR_ * 0.74, CY_ + CR_ * 1.9)], 4),
         *HAIR[hair], (CX_ - CR_ * 0.86, CY_ - CR_ * 0.3, CX_ + CR_ * 0.86, CY_ + CR_ * 2.15), light=(-0.6, -0.7), k=CR_ * 0.25, rough='roughf')
for k in range(8):
    x = CX_ - CR_ * 0.6 + k * CR_ * 0.17
    C.brush([(x, CY_ - 4), (x + 2, CY_ + CR_), (x - 3, CY_ + CR_ * 1.95)], CR_ * 0.06, HAIR[hair][0], 0.4, tin=0.2, tout=0.5)
crown = ellp(CX_, CY_ - CR_ * 0.3, CR_ * 0.84, CR_ * 0.86)
C.shaded(crown, *HAIR[hair], (CX_ - CR_ * 0.84, CY_ - CR_ * 1.16, CX_ + CR_ * 0.84, CY_ + CR_ * 0.56), light=(-0.6, -0.7), k=CR_ * 0.22, rough='roughf')
for k in range(9):
    a0 = math.pi * (1.1 + k * 0.1)
    C.brush([(CX_ + CR_ * 0.05, CY_ - CR_ * 0.95), (CX_ + math.cos(a0) * CR_ * 0.5, CY_ - CR_ * 0.5), (CX_ + math.cos(a0) * CR_ * 0.8, CY_ + CR_ * 0.3)],
            CR_ * 0.06, HAIR[hair][0] if k < 4 else HAIR[hair][2], 0.45, tin=0.3, tout=0.4)
C.glow(390, 300, 420, '#fff4c8', 0.18)

# ---- SOMBRA: the same three, in a row, facing nobody, blindfolded, hauled up by the wrist
DX = [930, 1130, 1330]
dw = []
heads = []
for i, (skin, hair, style, cloth, belt) in enumerate(PEOPLE):
    s_ = [-1, 1, 1][i]
    x, y, R_ = DX[i], 408, 50
    sk = greys(SK[skin], 0.22, 0.7)[:4] + (SK[skin][4],)
    hr = greys(HAIR[hair], 0.5, 0.6)
    cl = greys(cloth, 0.7, 0.58)
    bl = greys(belt, 0.8, 0.45)
    sl, sr = cuello_torso(C, x, y, R_, sk, cl, BOTTOM, sw=1.72, L=L_, waist=0.8, waist_y=y + R_ * 4.7, hip=0.92, belt=bl)
    up, down = (sr, sl) if s_ > 0 else (sl, sr)
    brazo2(C, down, (down[0] - s_ * 6, y + 196), (down[0] - s_ * 10, y + 292), R_, cl, sk, sleeve='long')
    mano(C, down[0] - s_ * 10, y + 292, R_ * 1.3, 90 + s_ * 4, sk, thumb=s_, curl=0.35)
    el = (up[0] + s_ * 58, y + 70)
    wr = (up[0] + s_ * 50, y - 46)
    brazo2(C, up, el, wr, R_, cl, sk, sleeve='long')
    mano(C, wr[0], wr[1], R_ * 1.3, 90 - s_ * 22, sk, thumb=s_, curl=0.45)
    cabeza(C, x, y, R_, sk, hr, facing=0.0, tilt=10 * s_, L=L_, eyes='closed', style=style, blind=('#5a5a6a', '#2a2a38', '#0a0a14'), lit=0.45)
    dw.append(wr)
    heads.append((x + s_ * 8, y - R_ * 1.25))

# ================= THE GIANT HAND IN THE CLOUDS =================
HX, HY = 1130, 14      # wrist (hidden in the cloud)
skH = ('#fadcc8', '#c48a72', '#6e423a', '#2a1214')
# back of the hand: broad at the knuckles
back = [(HX - 96, HY - 20), (HX + 96, HY - 20), (HX + 122, HY + 70), (HX + 132, HY + 128), (HX + 60, HY + 150), (HX - 10, HY + 156), (HX - 80, HY + 150),
        (HX - 128, HY + 124), (HX - 118, HY + 60)]
C.path(smooth_d(back, 4), '#06040a', 0.45, f' transform="translate(10 14)" filter="url(#{C.blur(10)})"')
C.shaded(smooth_d(back, 4), skH[0], skH[1], skH[2], bbox(back), light=(-0.6, -0.5), k=30, deep=skH[3], rough=None)
for k in range(4):  # extensor tendons fanning to the knuckles
    kx = HX - 84 + k * 56
    C.brush([(HX - 24 + k * 16, HY + 20), ((HX - 24 + k * 16 + kx) / 2, HY + 80), (kx, HY + 140)], 11, skH[0], 0.07, tin=0.4, tout=0.2)
    C.brush([(HX - 18 + k * 16, HY + 24), ((HX - 18 + k * 16 + kx) / 2 + 8, HY + 82), (kx + 8, HY + 138)], 5, skH[2], 0.25, tin=0.4, tout=0.2)

# fingers: wide, touching at the base, bent at the middle joint, tips holding the strings
FING = [(HX - 86, 46, (-0.3, 1), 128, 1), (HX - 30, 50, (-0.08, 1), 146, 1), (HX + 26, 48, (0.12, 1), 138, -1), (HX + 80, 40, (0.32, 1), 112, -1)]
tips = []


def rotv(v, a):
    return (v[0] * math.cos(a) - v[1] * math.sin(a), v[0] * math.sin(a) + v[1] * math.cos(a))


for (x0, wd, (dx, dy), Lf, bend) in FING:
    y0 = HY + 132
    l = math.hypot(dx, dy); d1 = (dx / l, dy / l)
    d2 = rotv(d1, bend * 0.18)
    d3 = rotv(d2, bend * 0.22)
    K = (x0, y0)
    J1 = (K[0] + d1[0] * Lf * 0.47, K[1] + d1[1] * Lf * 0.47)
    J2 = (J1[0] + d2[0] * Lf * 0.29, J1[1] + d2[1] * Lf * 0.29)
    T = (J2[0] + d3[0] * Lf * 0.21, J2[1] + d3[1] * Lf * 0.21)
    E = (T[0] + d3[0] * wd * 0.3, T[1] + d3[1] * wd * 0.3)
    pts = [(K[0] - d1[0] * 14, K[1] - d1[1] * 14), K, ((K[0] + J1[0]) / 2, (K[1] + J1[1]) / 2), J1, J2, T, E]
    d = tube_d(pts, [wd, wd, wd * 0.85, wd * 0.9, wd * 0.8, wd * 0.72, wd * 0.28])
    C.path(d, '#06040a', 0.4, f' transform="translate(8 10)" filter="url(#{C.blur(6)})"')
    C.shaded(d, skH[0], skH[1], skH[2], bbox(pts, wd / 2), light=(-0.6, -0.4), k=wd * 0.24, deep=skH[3], rough=None)
    softell(C, K[0] - wd * 0.08, K[1] - 2, wd * 0.36, wd * 0.24, skH[0], 0.6, 4)   # knuckle dome
    for (J, dd, n) in [(J1, d1, 3), (J2, d2, 2)]:   # joint wrinkles across the finger
        nx_, ny_ = -dd[1], dd[0]
        for j in range(n):
            cx_, cy_ = J[0] + dd[0] * (j - 1) * 4, J[1] + dd[1] * (j - 1) * 4
            C.brush([(cx_ - nx_ * wd * 0.26, cy_ - ny_ * wd * 0.26), (cx_ + dd[0] * 3, cy_ + dd[1] * 3), (cx_ + nx_ * wd * 0.24, cy_ + ny_ * wd * 0.24)],
                    2, skH[2], 0.45, tin=0.3, tout=0.3)
    C.brush([(K[0] - wd * 0.24, K[1] + 8), (J1[0] - wd * 0.24, J1[1]), (J2[0] - wd * 0.2, J2[1])], wd * 0.12, skH[0], 0.4, tin=0.2, tout=0.3)
    # nail on the last segment
    nx_, ny_ = T[0] - d3[0] * wd * 0.05, T[1] - d3[1] * wd * 0.05
    ang = math.degrees(math.atan2(d3[1], d3[0])) - 90
    C.ell(nx_, ny_, wd * 0.25, wd * 0.33, skH[2], 0.45, f' transform="rotate({f(ang)} {f(nx_)} {f(ny_)})"')
    C.ell(nx_, ny_ - 1, wd * 0.21, wd * 0.28, '#f0cfc4', 0.95, f' transform="rotate({f(ang)} {f(nx_)} {f(ny_)})"')
    C.ell(nx_ - wd * 0.06, ny_ - wd * 0.08, wd * 0.05, wd * 0.09, '#ffffff', 0.55)
    tips.append(E)
for k in range(3):
    x = (FING[k][0] + FING[k + 1][0]) / 2
    C.brush([(x, HY + 136), (x + (k - 1) * 8, HY + 190), (x + (k - 1) * 16, HY + 230)], 5, skH[3], 0.55, tin=0.1, tout=0.6)
# thumb, on the viewer's left, bent inward
th = [(HX - 112, HY + 60), (HX - 160, HY + 118), (HX - 176, HY + 182)]
d = taper_d(th, 50, 38)
C.path(d, '#06040a', 0.4, f' transform="translate(8 10)" filter="url(#{C.blur(6)})"')
C.shaded(d, skH[0], skH[1], skH[2], bbox(th, 25), light=(-0.6, -0.4), k=13, deep=skH[3], rough=None)
C.brush([(th[1][0] - 14, th[1][1] - 6), (th[1][0], th[1][1] + 2), (th[1][0] + 14, th[1][1] - 8)], 2.2, skH[2], 0.5)
C.ell(th[2][0] + 2, th[2][1] - 12, 11, 15, '#f8e8e4', 0.95)
C.ell(th[2][0] - 1, th[2][1] - 16, 3.5, 6, '#ffffff', 0.7)
tips.insert(0, (th[2][0] + 2, th[2][1] + 4))
# dark suit cuff swallowed by the cloud
slv = [(HX - 140, -80), (HX + 140, -80), (HX + 118, HY + 4), (HX - 118, HY + 6)]
C.shaded(poly_d(slv), '#3a3448', '#1a1626', '#06040c', bbox(slv), light=(-0.6, -0.5), k=20, rough='roughf')
cuff = [(HX - 112, HY - 8), (HX + 112, HY - 10), (HX + 104, HY + 18), (HX - 104, HY + 20)]
C.shaded(poly_d(cuff), '#f4f0f0', '#c0b8c0', '#5a5060', bbox(cuff), light=(-0.6, -0.6), k=8, rough=None)
ball(C, HX - 60, HY + 5, 8, '#fff0b0', '#d8a830', '#5a3a04', k=2.5, rough=None)
for (x, y, rx_, ry_) in [(HX - 190, 10, 150, 44), (HX + 210, 4, 170, 46), (HX, -36, 220, 34)]:
    softell(C, x, y, rx_, ry_, '#120e1c', 0.9, 16)
# cold light catching the hand from below-left
C.glow(HX - 40, HY + 200, 200, '#b8a8d8', 0.06)

# ================= STRINGS =================
# thumb + index -> left puppet (wrist, head); middle -> centre puppet head + wrist; ring + little -> right puppet
pairs = [(0, dw[0]), (1, heads[0]), (2, heads[1]), (3, dw[1]), (4, heads[2]), (4, dw[2])]
for (ti, (x, y)) in pairs:
    tx, ty = tips[ti]
    C.line([(tx + 2, ty + 3), (x + 2, y + 3)], 3.2, '#06040a', 0.35, n=2)
    C.line([(tx, ty), (x, y)], 2.6, '#e8decc', 0.95, n=2)
    C.line([(tx - 0.6, ty), (x - 0.6, y)], 0.9, '#ffffff', 0.7, n=2)
# loops tied round the fingertips and knots where the strings bite
for (tx, ty) in tips:
    C.a(f'<ellipse cx="{f(tx)}" cy="{f(ty - 10)}" rx="13" ry="5" fill="none" stroke="#e8decc" stroke-width="2.4" opacity="0.9"/>')
for (x, y) in dw + heads:
    C.a(f'<circle cx="{f(x)}" cy="{f(y)}" r="4" fill="#d8d0c0" opacity="0.9"/>')

# ================= LIGHT / SHADOW =================
cold = C.lg([(0, '#100c1c', 0), (0.46, '#100c1c', 0), (0.56, '#100c1c', 0.22), (1, '#080612', 0.3)], 0, 0, W, 0)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{cold})"/>')
warm = C.rg([(0, '#fff0c0', 0.3), (0.5, '#ffe0a0', 0.1), (1, '#ffe0a0', 0)], 160, 320, 760)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{warm})"/>')
vig = C.rg([(0, '#000', 0), (0.7, '#000', 0), (1, '#0a0604', 0.45)], W / 2, H / 2, 900)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{vig})"/>')

finish(C, OUT_SVG, OUT_PNG)
