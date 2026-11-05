"""Mes 12 · Valores · Diseño 3: el mismo borde del abismo, dos respuestas.
LUZ (izquierda): una mujer arrodillada junto al olivo agarra por los antebrazos a alguien que sube del abismo.
SOMBRA (derecha): la misma persona sube y encuentra un muro con alambre de espino; al otro lado alguien da la espalda;
sobre el muro, las sombras de puños alzados."""
import sys, math
sys.path.insert(0, '/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos3/gen')
from figura import *

C = lienzo(1212)
r = C.r
OUT_SVG = '/home/claude/humanity-wiki/design/calendario-arte/ilustraciones-fuente/mes-12-c.svg'
OUT_PNG = '/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos3/mes-12-c.png'

MX = 742
EY = 560           # the edge of the abyss
WX0, WT = 790, 236  # wall: left end, top

# ================= SKY =================
sky = C.lg([(0, '#fff2d0'), (0.3, '#f8d8a4'), (0.46, '#d8b8a8'), (0.56, '#4a4a70'), (0.72, '#1e2240'), (1, '#0e1022')], 0, 0, W, 0)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{sky})"/>')
C.glow(90, 400, 640, '#fff8e0', 0.7)
for (x, y, rx, ry, op) in [(360, 110, 220, 22, 0.45), (180, 220, 160, 16, 0.35), (560, 190, 140, 14, 0.3)]:
    softell(C, x, y, rx, ry, '#fffaf0', op, ry * 0.8)
for k in range(70):
    x = r.uniform(820, 1480); y = r.uniform(8, 220)
    C.a(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r.uniform(0.6, 1.8))}" fill="#eef0ff" opacity="{r.uniform(0.3, 0.9):.2f}"/>')

# ================= FAR LAND (left) =================
for (yb, amp, cols) in [(430, 26, ('#e8dcc0', '#c0b49a', '#9a8a7a')), (462, 18, ('#d8d0a0', '#aaa878', '#7a7a58'))]:
    pts = [(-20, yb + 20)]
    for k in range(10):
        x = -20 + k * 100
        pts.append((x, yb - amp * (0.5 + 0.5 * math.sin(k * 1.4 + yb))))
    pts += [(980, yb + 30), (980, EY + 20), (-20, EY + 20)]
    C.shaded(smooth_d(pts, 4), *cols, (-20, yb - amp, 980, EY), light=(-0.9, -0.4), k=14, hl=False)
grass = C.lg([(0, '#d8c880'), (0.6, '#a8a860'), (1, '#6a6a40')], 0, 0, 900, 0)
C.path(f"M-20 {EY-50}Q300 {EY-62} 800 {EY-46}L800 {EY+6}L-20 {EY+6}Z", f'url(#{grass})')
for k in range(110):
    x = r.uniform(-10, 760); y = r.uniform(EY - 50, EY + 2)
    C.brush([(x, y), (x + r.uniform(-3, 3), y - 8), (x + r.uniform(-5, 5), y - 14)], 2.2, r.choice(['#8aa040', '#c8c060', '#6a8a30', '#e8e090']), 0.5, tin=0, tout=0.8)
for k in range(9):  # wild flowers
    x = r.uniform(20, 300); y = r.uniform(EY - 40, EY - 6)
    C.line([(x, y), (x + 1, y - 10)], 1.2, '#5a7a2a')
    C.a(f'<circle cx="{f(x+1)}" cy="{f(y-11)}" r="2.8" fill="{r.choice(["#ffffff", "#f8e070", "#e8a0c0"])}"/>')

# ================= THE OLIVE TREE (LUZ) =================
OX = 100
C.shadow(OX + 40, EY - 30, 170, 12, 0.4)
trunk = [(OX - 48, EY - 26), (OX - 22, EY - 80), (OX - 40, EY - 140), (OX - 14, EY - 190), (OX - 12, EY - 150), (OX + 6, EY - 110), (OX + 18, EY - 170),
         (OX + 30, EY - 150), (OX + 22, EY - 90), (OX + 40, EY - 50), (OX + 58, EY - 26)]
tpid, tcid = C.shaded(smooth_d(trunk, 4), '#d8c0a0', '#8a7058', '#2a1e14', bbox(trunk), light=(-0.8, -0.4), k=16, rough='rough')
# branches spreading from the twisted bole
for (pts, w0) in [([(OX - 14, EY - 180), (OX - 70, EY - 250), (OX - 150, EY - 300)], 20), ([(OX - 10, EY - 180), (OX - 4, EY - 260), (OX + 20, EY - 330)], 18),
                  ([(OX + 22, EY - 160), (OX + 90, EY - 230), (OX + 170, EY - 270)], 18), ([(OX - 40, EY - 240), (OX - 30, EY - 300), (OX - 60, EY - 350)], 9)]:
    d = taper_d(pts, w0, w0 * 0.35)
    C.shaded(d, '#d8c0a0', '#7a6048', '#2a1e14', bbox(pts, w0), light=(-0.8, -0.4), k=5, rough='roughf')
C.clip_open(tcid)
for k in range(6):  # twisted bark
    x = OX - 30 + k * 12
    C.brush([(x, EY - 30), (x + 16, EY - 100), (x - 6, EY - 170)], 3, '#3a2a1a', 0.35, tin=0.2, tout=0.4)
    C.brush([(x - 3, EY - 34), (x + 12, EY - 100)], 2, '#f0e0c0', 0.25, tin=0.3, tout=0.4)
C.close()
C.ell(OX + 4, EY - 110, 8, 13, '#1a120a', 0.7)   # hollow
foliage(C, [(OX - 160, EY - 310, 90, 44), (OX - 60, EY - 360, 90, 46), (OX + 30, EY - 340, 80, 44), (OX + 170, EY - 285, 95, 42),
            (OX - 90, EY - 270, 70, 30), (OX + 90, EY - 250, 70, 30)],
        ['#f0f4e0', '#b8c8a0', '#7a9070', '#3a4a38'], 230, [10, 30, 150, 170, 200, 340], L=(13, 20), wid=(2.5, 3.8), loose=0.25, under_scale=0.7)
for k in range(18):  # olives
    m = r.choice([(OX - 160, EY - 310), (OX - 60, EY - 360), (OX + 30, EY - 340), (OX + 170, EY - 285)])
    ball(C, m[0] + r.uniform(-60, 60), m[1] + r.uniform(-26, 30), 4.5, '#a898c8', '#4a3a6a', '#140a20', k=1.2, rough=None)

# ================= THE WALL (SOMBRA) =================
C.shadow(1150, EY + 2, 380, 12, 0.6)
wall = f"M{WX0} {EY + 4}L{WX0} {WT}L1505 {WT - 10}L1505 {EY + 4}Z"
pid, cid = C.shaded(wall, '#7a7c94', '#4a4c62', '#1a1c2a', (WX0, WT, 1505, EY), light=(-0.7, -0.3), k=40, rough='roughf')
C.clip_open(cid)
for row in range(7):   # concrete blocks
    y = WT + 6 + row * 41
    off = 0 if row % 2 else 60
    C.line([(WX0, y), (1505, y - 1.5)], 3, '#14141e', 0.6, n=2)
    C.line([(WX0, y + 3), (1505, y + 1.5)], 1.2, '#9a9cb4', 0.35, n=2)
    for k in range(7):
        x = WX0 + off + k * 120
        C.line([(x, y), (x, y + 41)], 3, '#14141e', 0.55, n=2)
for k in range(30):  # stains
    C.ell(r.uniform(WX0, 1500), r.uniform(WT, EY), r.uniform(6, 30), r.uniform(4, 16), r.choice(['#2a2a3a', '#5a5a70']), 0.18, f' filter="url(#{C.blur(4)})"')
softell(C, WX0 + 30, (WT + EY) / 2, 40, 200, '#9a9cb8', 0.25, 20)   # end face catches a little light
C.close()
# coping on the wall top
C.path(f"M{WX0-8} {WT+8}L{WX0-8} {WT-6}L1505 {WT-16}L1505 {WT}Z", '#5a5c74')
C.path(f"M{WX0-8} {WT-6}L1505 {WT-16}L1505 {WT-12}L{WX0-8} {WT-2}Z", '#a8aac4', 0.6)

# barbed wire: a tangled coil along the top, loops of uneven size seen in perspective, with barbs
for k in range(52):
    x = WX0 + 4 + k * 13.5 + r.uniform(-4, 4)
    y = WT - 24 - (x - WX0) * 0.014 + r.uniform(-3, 3)
    a = r.uniform(25, 55)
    rx_, ry_ = r.uniform(9, 14), r.uniform(20, 27)
    C.a(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(rx_)}" ry="{f(ry_)}" fill="none" stroke="#14141c" stroke-width="2.2" transform="rotate({f(a)} {f(x)} {f(y)})"/>')
    C.a(f'<ellipse cx="{f(x-1)}" cy="{f(y-1)}" rx="{f(rx_)}" ry="{f(ry_)}" fill="none" stroke="#c8ccdc" stroke-width="0.8" opacity="0.55" stroke-dasharray="14 10" transform="rotate({f(a)} {f(x)} {f(y)})"/>')
    if k % 2 == 0:
        bx, by = x + r.uniform(-10, 10), y + r.choice([-1, 1]) * r.uniform(14, 20)
        for j in range(3):
            aa = math.radians(r.uniform(0, 180))
            C.line([(bx - math.cos(aa) * 5, by - math.sin(aa) * 5), (bx + math.cos(aa) * 5, by + math.sin(aa) * 5)], 1.5, '#14141c', 0.9, n=2)
C.line([(WX0, WT - 22), (1505, WT - 32)], 1.6, '#14141c', 0.8, n=2)

# ================= THE CLIFF FACE AND THE ABYSS =================
cliff = C.lg([(0, '#b08a5a'), (0.42, '#7a5c44'), (0.56, '#34324a'), (1, '#1a1a2e')], 0, 0, W, 0)
C.path(f"M-20 {EY}L1505 {EY}L1505 870L-20 870Z", f'url(#{cliff})')
for k in range(9):   # soft strata running across the rock
    y = EY + 40 + k * 34 + r.uniform(-6, 6)
    C.brush([(-20, y), (400, y + r.uniform(-8, 8)), (900, y + r.uniform(-8, 8)), (1505, y)], r.uniform(8, 16), '#1a1214', 0.22, f' filter="url(#{C.blur(3)})"', tin=0, tout=0)
    C.brush([(-20, y - 7), (400, y - 7 + r.uniform(-6, 6)), (900, y - 7), (1505, y - 7)], r.uniform(3, 6), '#f0d8b0', 0.1, f' filter="url(#{C.blur(2)})"', tin=0, tout=0)
for k in range(26):  # rounded rock planes
    x = r.uniform(-10, 1495); y = r.uniform(EY + 40, 850)
    softell(C, x, y, r.uniform(30, 70), r.uniform(12, 24), '#f8e0b0' if x < MX else '#9aa0c0', 0.1, 6)
depth = C.lg([(0, '#06050c', 0), (0.5, '#06050c', 0.3), (1, '#040308', 0.85)], 0, EY + 20, 0, H)
C.a(f'<rect x="0" y="{EY+20}" width="{W}" height="{H-EY}" fill="url(#{depth})"/>')
# the lip: a smooth rounded edge of earth and stone
lip = [(-20, EY - 8)]
for k in range(31):
    lip.append((k * 50, EY - 6 + math.sin(k * 1.7) * 3))
lip += [(1505, EY - 8), (1505, EY + 22)]
for k in range(31, -1, -1):
    lip.append((k * 50, EY + 16 + math.sin(k * 2.3) * 5))
lip.append((-20, EY + 20))
lipg = C.lg([(0, '#e8c88a'), (0.45, '#9a7a52'), (0.55, '#5a5a72'), (1, '#34364a')], 0, 0, W, 0)
C.path(smooth_d(lip, 2), f'url(#{lipg})')
C.brush([(-20, EY - 6), (MX, EY - 7), (1505, EY - 6)], 3, '#fff0c8', 0.45, tin=0, tout=0)
C.brush([(-20, EY + 18), (1505, EY + 18)], 6, '#140c10', 0.35, f' filter="url(#{C.blur(3)})"', tin=0, tout=0)

# ================= THE HELPER (LUZ): kneeling at the edge, body thrown back, pulling =================
HXp, HYp, HR = 262, 318, 50
LEAN = -16
PIV = (HXp, 505)


def rot(p, ang=LEAN, c=PIV):
    a = math.radians(ang)
    x, y = p[0] - c[0], p[1] - c[1]
    return (c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a))


SKH = SK['olive']
CLH = ('#f8c8a0', '#d07a4a', '#6a2a14', '#2a0c04')
SKIRT = ('#e89a6a', '#a8482a', '#4a1408', '#1a0602')
C.shadow(HXp + 20, EY - 6, 120, 10, 0.5)
# skirt over the kneeling legs, knees on the very edge
sk_ = [(HXp - 80, 482), (HXp + 66, 478), (HXp + 96, EY - 26), (HXp + 92, EY - 4), (HXp + 58, EY + 2), (HXp + 26, EY - 8), (HXp + 4, EY - 20), (HXp - 20, EY - 8), (HXp - 50, EY + 2), (HXp - 92, EY - 4), (HXp - 104, EY - 24)]
pid, cid = C.shaded(smooth_d(sk_, 4), *SKIRT[:3], bbox(sk_), light=(-0.6, -0.6), k=18, deep=SKIRT[3], rough='roughf')
C.clip_open(cid)
for kx in (HXp - 52, HXp + 58):   # the two knees push the cloth forward
    softell(C, kx, EY - 16, 30, 16, SKIRT[0], 0.55, 8)
for k in range(4):
    x = HXp - 60 + k * 40
    C.brush([(x, 486), (x + 6, 520), (x + 10, EY - 6)], 7, SKIRT[2], 0.35, tin=0.3, tout=0.3)
C.close()
# her bare foot behind, braced against the ground
C.a(f'<g transform="rotate({LEAN} {PIV[0]} {PIV[1]})">')
hl_, hr_ = cuello_torso(C, HXp, HYp, HR, SKH, CLH, 515, sw=1.66, waist=0.78, waist_y=HYp + HR * 3.3, hip=0.9)
C.a('</g>')
hl_, hr_ = rot(hl_), rot(hr_)
C.a(f'<g transform="rotate({LEAN} {PIV[0]} {PIV[1]})">')
cabeza(C, HXp, HYp, HR, SKH, HAIR['black'], facing=0.32, tilt=30, eyes='look', gaze=(0.7, 1.0), style='long', smile=0.0)
C.a('</g>')

# ================= CLIMBER (LUZ): pulled up by the wrist, half out of the abyss =================
CXl, CYl, CR = 486, 536, 52
SKC = SK['dark']
CLC = ('#a8c8e8', '#4a7aa8', '#14304a', '#06121e')
WRC = (372, 470)    # his wrist, where she grips him
cl_, cr_ = espalda(C, CXl, CYl, CR, CLC, 900, sw=1.75)
# right forearm hooked over the lip, elbow on the edge, hand clawing the ground
brazo2(C, cr_, (cr_[0] + 70, cr_[1] - 6), (cr_[0] + 70, EY - 2), CR, CLC, SKC, sleeve='long')
mano(C, cr_[0] + 70, EY - 2, CR * 1.25, -8, SKC, thumb=-1, curl=0.25)   # palm flat on the grass, pushing up
# left arm stretched up to her
brazo2(C, cl_, (cl_[0] - 30, CYl + 30), WRC, CR, CLC, SKC, sleeve='long')
nuca(C, CXl, CYl, CR, SKC, HAIR['black'], style='curly', tilt=-16)
# warm light on his shoulders and the reaching arm
C.brush([(cl_[0] - 6, cl_[1] - 6), (cl_[0] - 24, CYl + 30), (WRC[0] + 8, WRC[1] + 30)], 8, '#ffe8b8', 0.35, tin=0.3, tout=0.3)
C.brush([(CXl - CR * 1.4, CYl + CR * 1.45), (CXl, CYl + CR * 1.3), (CXl + CR * 1.3, CYl + CR * 1.45)], 9, '#ffe8b8', 0.3, tin=0.3, tout=0.3)
# her arms reach to his wrist; both hands lock round it
brazo2(C, hr_, (hr_[0] + 70, hr_[1] + 40), (WRC[0] - 34, WRC[1] - 22), HR, CLH, SKH, sleeve='elbow')
brazo2(C, hl_, (hl_[0] + 60, hl_[1] + 104), (WRC[0] - 40, WRC[1] + 22), HR, CLH, SKH, sleeve='elbow')
mano(C, WRC[0] - 34, WRC[1] - 22, HR * 1.3, 30, SKH, thumb=-1, curl=0.75)
mano(C, WRC[0] - 40, WRC[1] + 22, HR * 1.3, -6, SKH, thumb=-1, curl=0.75)
# his hand closes round her forearm
mano(C, WRC[0], WRC[1], CR * 1.25, -120, SKC, thumb=1, curl=0.7)
C.glow(WRC[0] - 20, WRC[1], 190, '#fff2c8', 0.4)

# ================= CLIMBER (SOMBRA): the same person, half out, face to the wall =================
CXr = 2 * MX - CXl
SKCd = greys(SK['dark'], 0.4, 0.75)[:4] + ('#7a4a40',)
CLCd = greys(CLC, 0.6, 0.6)
cl2, cr2 = espalda(C, CXr, CYl, CR, CLCd, 900, sw=1.75, L=-1)
brazo2(C, cl2, (cl2[0] - 70, cl2[1] - 6), (cl2[0] - 70, EY - 2), CR, CLCd, SKCd, sleeve='long')
mano(C, cl2[0] - 70, EY - 2, CR * 1.25, 188, SKCd, thumb=1, curl=0.25)
# the other hand flat on the concrete at the height of his face: nothing to hold
WH = (cr2[0] + 36, EY - 26)
brazo2(C, cr2, (cr2[0] + 70, cr2[1] + 4), WH, CR, CLCd, SKCd, sleeve='long')
nuca(C, CXr + 8, CYl + 4, CR, SKCd, greys(HAIR['black'], 0.4, 0.7), style='curly', tilt=14)
mano(C, WH[0], WH[1], CR * 1.3, -48, SKCd, thumb=-1, curl=0.05, spread=0.7)

fade = C.lg([(0, '#05040a', 0), (0.3, '#05040a', 0.6), (1, '#030208', 0.95)], 0, 640, 0, H)
C.a(f'<rect x="0" y="640" width="{W}" height="{H-650}" fill="url(#{fade})"/>')

# ================= LIGHT / SHADOW =================
cold = C.lg([(0, '#0c0e1c', 0), (0.47, '#0c0e1c', 0), (0.56, '#0c0e1c', 0.25), (1, '#06080e', 0.35)], 0, 0, W, 0)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{cold})"/>')
warm = C.rg([(0, '#fff0c0', 0.35), (0.5, '#ffe0a0', 0.12), (1, '#ffe0a0', 0)], 90, 380, 820)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{warm})"/>')
vig = C.rg([(0, '#000', 0), (0.7, '#000', 0), (1, '#0a0604', 0.45)], W / 2, H / 2, 900)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{vig})"/>')

finish(C, OUT_SVG, OUT_PNG)
