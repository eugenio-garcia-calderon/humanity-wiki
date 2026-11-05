"""Mes 6 · Tecnología y Energía · Diseño 3.
The same girl twice, back to back, looking up at the sky. LIGHT (left): a flock of swallows over wind
turbines and a village whose solar roofs light its windows. SHADOW (right): the mirror of that flock is a swarm
of armed drones over a ruined city and burning oil wells. Technology for life, or for war; energy that lights
homes, or energy we go to war for. No blood, no bodies: the threat is enough."""
from fig import *

OUT_SVG = '/home/claude/humanity-wiki/design/calendario-arte/ilustraciones-fuente/mes-06-c.svg'
OUT_PNG = '/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos3/mes-06-c.png'

C = Canvas(seed=66)
r = C.r
MID = 742
HOR = 610

# ------------------------------------------------------------------ sky
sky = C.lg([(0, '#8fd0dc'), (0.25, '#bfe2d8'), (0.44, '#f2e2b8'), (0.52, '#d8a080'), (0.6, '#7a4a4e'), (0.75, '#3a2630'), (1, '#1e1418')], 0, 0, W, 0)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{sky})"/>')
C.a(f'<rect width="{W}" height="{HOR}" fill="url(#{C.lg([(0, "#ffffff", 0), (1, "#fff4d8", 0.35)], 0, 0, 0, HOR)})"/>')
C.glow(230, 200, 380, '#fffbe6', 0.7)
C.glow(230, 200, 120, '#fffdf2', 0.9)
for (x, y, w, op) in [(30, 300, 340, 0.4), (280, 120, 300, 0.3), (460, 260, 220, 0.3), (60, 470, 300, 0.3)]:
    C.brush([(x, y), (x + w * 0.5, y - 8), (x + w, y)], 20, '#ffffff', op, tin=0.4, tout=0.4, extra=f' filter="url(#{C.blur(7)})"')
# smoke over the right half, fire glow low on the horizon
C.glow(1200, HOR, 520, '#ff5a1e', 0.55)
C.glow(1330, HOR - 10, 220, '#ffa040', 0.6)
for (x, y, rx, ry, col, op) in [(1360, 200, 260, 190, '#1a1216', 0.9), (1100, 140, 300, 150, '#2a1c20', 0.75), (900, 60, 260, 100, '#4a3434', 0.45),
                                 (1250, 380, 240, 120, '#2a1a1a', 0.6), (1450, 470, 160, 140, '#140c0e', 0.8), (1000, 330, 180, 90, '#5a3a34', 0.35)]:
    pts = [(x + math.cos(k / 12 * math.tau) * rx * r.uniform(0.75, 1.1), y + math.sin(k / 12 * math.tau) * ry * r.uniform(0.75, 1.1)) for k in range(12)]
    C.path(smooth_d(pts, 4), col, op, f' filter="url(#{C.blur(30)})"')

# the sky where the drones fly is lit from below by the burning wells: orange behind black silhouettes
C.glow(1010, 130, 330, '#ff8a3a', 0.75)
C.glow(1010, 120, 170, '#ffc070', 0.55)
C.ell(1020, 130, 300, 110, '#ff9a4a', 0.35, f' filter="url(#{C.blur(30)})"')

# ------------------------------------------------------------------ left landscape: hills, turbines, village with solar roofs
hill2 = smooth_d([(-20, 560), (160, 530), (360, 548), (560, 575), (MID, 600), (MID, H), (-20, H)], 5)
C.path(hill2, f'url(#{C.lg([(0, "#a8c890"), (1, "#7aa070")], 0, 520, 0, 650)})', 0.9, f' filter="url(#{C.blur(1.5)})"')


def turbine(x, y, h, rot, op=1.0):
    C.a(f'<g opacity="{op}">')
    C.path(f"M{f(x-h*0.022)} {f(y)}L{f(x-h*0.008)} {f(y-h)}L{f(x+h*0.008)} {f(y-h)}L{f(x+h*0.022)} {f(y)}Z", f'url(#{C.lg([(0, "#ffffff"), (1, "#b8c4c8")], x - h * 0.02, 0, x + h * 0.02, 0)})')
    hx, hy = x, y - h
    for k in range(3):
        a = math.radians(rot + k * 120)
        L = h * 0.55
        ex, ey = hx + math.cos(a) * L, hy + math.sin(a) * L
        nx, ny = -math.sin(a), math.cos(a)
        C.path(f"M{f(hx)} {f(hy)}Q{f(hx+math.cos(a)*L*0.3+nx*h*0.05)} {f(hy+math.sin(a)*L*0.3+ny*h*0.05)} {f(ex)} {f(ey)}"
               f"Q{f(hx+math.cos(a)*L*0.4-nx*h*0.01)} {f(hy+math.sin(a)*L*0.4-ny*h*0.01)} {f(hx)} {f(hy)}Z", '#f8fbfb')
        C.path(f"M{f(hx)} {f(hy)}Q{f(hx+math.cos(a)*L*0.4-nx*h*0.012)} {f(hy+math.sin(a)*L*0.4-ny*h*0.012)} {f(ex)} {f(ey)}", 'none', 1,
               f' stroke="#9aaab0" stroke-width="{f(h*0.006)}"')
    C.ell(hx, hy, h * 0.03, h * 0.026, '#e8eef0')
    C.a('</g>')


turbine(80, 548, 180, -80, 0.85)
turbine(200, 538, 200, -20, 0.9)
turbine(320, 556, 140, -110, 0.8)

hill1 = smooth_d([(-20, 640), (200, 615), (420, 628), (600, 650), (MID, 662), (MID, H), (-20, H)], 5)
C.path(hill1, f'url(#{C.lg([(0, "#7cae5c"), (1, "#4a7a3c")], 0, 610, 0, 760)})')


def house(x, y, w, h, wall, roof_solar=True, lit=True, ruined=False):
    # wall with its lit side
    wg = C.lg([(0, '#fff6e4'), (0.55, wall), (1, '#b89a7a')], x, 0, x + w, 0)
    C.path(f"M{f(x)} {f(y)}h{f(w)}v{f(-h)}h{f(-w)}Z", f'url(#{wg})')
    C.ell(x + w * 0.5, y, w * 0.7, 4, '#2a3a1a', 0.4, f' filter="url(#{C.blur(3)})"')
    # roof
    rh = h * 0.55
    rg_ = C.lg([(0, '#c06a4a'), (1, '#6a3226')], x, y - h - rh, x + w, y - h)
    C.path(f"M{f(x-w*0.08)} {f(y-h)}L{f(x+w*0.5)} {f(y-h-rh)}L{f(x+w*1.08)} {f(y-h)}Z", f'url(#{rg_})')
    C.path(f"M{f(x-w*0.08)} {f(y-h)}L{f(x+w*1.08)} {f(y-h)}L{f(x+w*1.08)} {f(y-h+3)}L{f(x-w*0.08)} {f(y-h+3)}Z", '#3a1a12', 0.5)
    if roof_solar:
        pg = C.lg([(0, '#5a8ad0'), (0.5, '#1e3a70'), (1, '#9ad0ff')], x, y - h - rh, x + w * 0.5, y - h)
        C.path(f"M{f(x+w*0.0)} {f(y-h-2)}L{f(x+w*0.47)} {f(y-h-rh+3)}L{f(x+w*0.47)} {f(y-h-rh*0.32)}L{f(x+w*0.3)} {f(y-h-2)}Z", f'url(#{pg})')
    if lit:
        C.glow(x + w * 0.3, y - h * 0.45, w * 0.5, '#ffd27a', 0.5)
        C.path(f"M{f(x+w*0.18)} {f(y-h*0.3)}h{f(w*0.22)}v{f(-h*0.32)}h{f(-w*0.22)}Z", '#ffe08a')
        C.path(f"M{f(x+w*0.6)} {f(y-h*0.3)}h{f(w*0.2)}v{f(-h*0.32)}h{f(-w*0.2)}Z", '#ffd070', 0.9)


C.a('<g filter="url(#roughf)">')
for (x, y, w, h, col) in [(40, 640, 46, 34, '#f4e2c4'), (100, 632, 54, 40, '#f0d8b0'), (170, 628, 44, 32, '#f6e8d0'),
                          (232, 626, 70, 44, '#f2dcc0'), (318, 630, 46, 34, '#ecd2ac'), (380, 636, 50, 36, '#f4e2c4')]:
    house(x, y, w, h, col)
C.a('</g>')
# a few trees between the houses
for (x, y, s) in [(92, 640, 16), (160, 634, 14), (306, 634, 15), (440, 642, 18), (500, 648, 16)]:
    C.line([(x, y), (x, y - s)], 3, '#5a3a24')
    ball(C, x, y - s - s * 0.6, s * 0.8, '#b8d870', '#6a9a44', '#2e5a2a', k=4, rough=None)

# ------------------------------------------------------------------ right landscape: ruined city, burning oil wells
ruin_col = '#1e1418'
C.defs.append(f'<linearGradient id="seamg" gradientUnits="userSpaceOnUse" x1="{MID-70}" y1="0" x2="{MID+50}" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>'
              f'<mask id="seam" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="url(#seamg)"/></mask>')
C.path(poly_d(catmull([(MID - 70, 668), (900, 652), (1100, HOR + 38), (W + 20, HOR + 32)], 8) + [(W + 20, H + 20), (MID - 70, H + 20)]), f'url(#{C.lg([(0, "#4a3030"), (1, "#140e10")], 0, HOR, 0, H)})', 1, ' mask="url(#seam)"')


def ruin(x, y, w, h, seed, collapse=1):
    rr = random.Random(seed)
    # jagged, collapsed top
    top = [(x, y - h * rr.uniform(0.75, 1.0))]
    n = 7
    for k in range(1, n):
        t = k / n
        drop = (t if collapse > 0 else 1 - t) * h * 0.5 * rr.uniform(0.6, 1.2)
        top.append((x + w * t, y - h + drop + rr.uniform(-10, 10)))
    top.append((x + w, y - h * rr.uniform(0.3, 0.6)))
    pts = [(x, y)] + top + [(x + w, y)]
    g = C.lg([(0, '#2a1e20'), (1, '#140c0e')], x, 0, x + w, 0)
    C.path(poly_d(pts), f'url(#{g})')
    # floor slabs sticking out of the broken side, bent bars
    for j in range(1, int(h / 40)):
        fy = y - j * 40
        C.path(f"M{f(x+w-6)} {f(fy)}h{f(rr.uniform(8, 22))}v4h{f(-rr.uniform(8, 22))}Z", '#2a2024')
        if rr.random() < 0.5:
            C.line([(x + w, fy - 2), (x + w + 10, fy - 10), (x + w + 14, fy - 4)], 1, '#3a2c2c', 0.9)
    # a few window holes, some glowing from fires inside
    for j in range(int(h / 40)):
        for i in range(2):
            wx = x + w * (0.2 + i * 0.4)
            wy = y - 30 - j * 40
            if rr.random() < 0.35:
                continue
            col = '#ff7a2a' if rr.random() < 0.3 else '#0a0608'
            C.path(poly_d([(wx, wy), (wx + w * 0.16, wy + rr.uniform(-2, 2)), (wx + w * 0.16, wy - 15), (wx + rr.uniform(0, 3), wy - 16)]), col, 0.9)


def oil_fire(x, y, s):
    """A burning oil well: a tall ragged jet of fire from a wellhead, black smoke pouring up."""
    for k in range(9):  # black smoke column, leaning left, rising into the sky of the drones
        yy = y - s * 1.6 - k * s * 0.6
        xx = x - k * s * 0.22 + r.uniform(-8, 8)
        C.ell(xx, yy, s * (0.35 + k * 0.14), s * (0.3 + k * 0.09), '#0e0a0c', 0.8 - k * 0.06, f' filter="url(#{C.blur(10 + k * 3)})"')
    C.glow(x, y - s * 0.7, s * 1.8, '#ff6a1a', 0.55)
    C.glow(x, y - s * 0.4, s * 0.8, '#ffd070', 0.5)
    for layer, (col, sc, op) in enumerate([('#a8241a', 1.0, 0.8), ('#ff5a1a', 0.85, 0.85), ('#ff9a2a', 0.66, 0.9), ('#ffd060', 0.45, 0.9), ('#fff4c0', 0.24, 0.9)]):
        for t in range(4):
            hh = s * 1.7 * sc * r.uniform(0.7, 1.1)
            ww = s * 0.34 * sc * r.uniform(0.7, 1.1)
            bx = x + r.uniform(-0.25, 0.25) * s * sc
            tipx = bx + r.uniform(-0.3, 0.3) * s
            d = (f"M{f(bx-ww)} {f(y)}C{f(bx-ww*1.1)} {f(y-hh*0.45)} {f(tipx-ww*0.4)} {f(y-hh*0.75)} {f(tipx)} {f(y-hh)}"
                 f"C{f(tipx+ww*0.3)} {f(y-hh*0.7)} {f(bx+ww*1.1)} {f(y-hh*0.4)} {f(bx+ww)} {f(y)}Z")
            C.path(d, col, op * 0.6, f' filter="url(#{C.blur(1.5 + (4 - layer) * 0.8)})"')
    for k in range(16):  # sparks
        C.ell(x + r.uniform(-s, s) * 0.8, y - r.uniform(s * 0.6, s * 2.4), 1.6, 1.6, '#ffd070', r.uniform(0.5, 0.95))



oil_fire(1140, HOR + 34, 130)


def pumpjack(x, y, s, a=-8):
    """Oil pumpjack silhouette (a 'nodding donkey'): base, solid post, walking beam with the horse head."""
    k = '#0c0808'
    C.path(f"M{f(x-s*0.9)} {f(y)}h{f(s*1.5)}v{f(-s*0.08)}h{f(-s*1.5)}Z", k)
    C.path(f"M{f(x-s*0.12)} {f(y-s*0.08)}L{f(x-s*0.04)} {f(y-s*0.72)}L{f(x+s*0.04)} {f(y-s*0.72)}L{f(x+s*0.16)} {f(y-s*0.08)}Z", k)
    C.a(f'<g transform="rotate({a} {f(x)} {f(y-s*0.74)})">')
    C.path(f"M{f(x-s*0.7)} {f(y-s*0.7)}h{f(s*1.25)}v{f(-s*0.07)}h{f(-s*1.25)}Z", k)
    C.path(f"M{f(x-s*0.7)} {f(y-s*0.82)}C{f(x-s*0.92)} {f(y-s*0.8)} {f(x-s*0.95)} {f(y-s*0.56)} {f(x-s*0.84)} {f(y-s*0.46)}L{f(x-s*0.7)} {f(y-s*0.62)}Z", k)
    C.a('</g>')
    C.line([(x - s * 0.86, y - s * 0.5), (x - s * 0.86, y - s * 0.06)], max(1.5, s * 0.015), k)


pumpjack(1205, HOR + 44, 165, a=-4)
for (x, w, h, sd, cl) in [(870, 84, 170, 1, -1), (956, 60, 230, 2, 1), (1300, 70, 200, 3, -1), (1374, 66, 270, 4, 1), (1436, 70, 150, 5, -1)]:
    ruin(x, HOR + 40, w, h, sd, cl)

# ------------------------------------------------------------------ the two flocks: swallows | drones (mirrored envelope)
def env(t):
    """Murmuration envelope: an S-shaped cloud, t in [0, 1] along it. Returns centre and half-thickness (left side coords)."""
    x = 330 + t * 370
    y = 128 - math.sin(t * math.pi * 1.3) * 46 - t * 16
    th = 24 + math.sin(t * math.pi) * 50
    return x, y, th


def swallow(x, y, s, a, col='#1e2630', flap=0.0):
    """Swallow seen from below: long crescent wings, slim body, forked tail."""
    up = flap * 4
    d = (f"M0 -3.2C0.9 -3.2 1.2 -2 1.1 -1C4 -2.6 8 -3.4 13 -1.6 - {0}".replace(' - 0', '') if False else '')
    d = ("M0 -3.4C0.9 -3.4 1.3 -2.2 1.2 -1.2"
         f"C4.6 -{f(2.6+up)} 9 -{f(3.6+up)} 14 -{f(1.2+up)}C9.6 -{f(0.6+up*0.4)} 5.2 0.2 1.4 1.6"
         "L2.6 7.4L0.6 3.2L0 3.6L-0.6 3.2L-2.6 7.4L-1.4 1.6"
         f"C-5.2 0.2 -9.6 -{f(0.6+up*0.4)} -14 -{f(1.2+up)}C-9 -{f(3.6+up)} -4.6 -{f(2.6+up)} -1.2 -1.2"
         "C-1.3 -2.2 -0.9 -3.4 0 -3.4Z")
    C.a(f'<path d="{d}" fill="{col}" transform="translate({f(x)} {f(y)}) rotate({f(a)}) scale({f(s)})"/>')


birds = []
for k in range(18):
    t = (k + r.uniform(0, 0.8)) / 18
    x, y, th = env(t)
    birds.append((x + r.uniform(-10, 10), y + (1 if k % 2 else -1) * r.uniform(0.2, 1) * th))
for (x, y) in birds:
    swallow(x, y, r.uniform(2.2, 2.9), r.uniform(-25, 15), r.choice(['#1e2630', '#2a3440', '#3a4650']), flap=r.uniform(-0.5, 1))


def drone(x, y, s):
    """Quadcopter seen from the front and a little below: four rotor discs, arms, body, a bomb hanging under it."""
    g = f'<g transform="translate({f(x)} {f(y)}) scale({f(s)})">'
    for (rx, ry, w, op) in [(-7, -4.6, 5.4, 0.45), (7, -4.6, 5.4, 0.45), (-12, -2.2, 6.6, 0.6), (12, -2.2, 6.6, 0.6)]:
        g += f'<ellipse cx="{rx}" cy="{ry}" rx="{w}" ry="{w*0.18}" fill="#3a3238" opacity="{op}"/>'
        g += f'<rect x="{rx-0.7}" y="{ry}" width="1.4" height="2.4" fill="#0c0a0c"/>'
    g += '<path d="M-12 0.6Q0 -1.4 12 0.6L12 1.6Q0 -0.4 -12 1.6Z" fill="#0c0a0c"/>'
    g += '<path d="M-7 -2.2Q0 -3.4 7 -2.2L7 -1.4Q0 -2.6 -7 -1.4Z" fill="#141014"/>'
    g += '<path d="M-4.4 -2.4C-4.4 -4.4 4.4 -4.4 4.4 -2.4L3.6 2.6C2 3.8 -2 3.8 -3.6 2.6Z" fill="#161216"/>'
    g += '<path d="M-3.6 -2.6C-3 -3.6 3 -3.6 3.6 -2.6" fill="none" stroke="#5a4a50" stroke-width="0.5"/>'
    g += '<circle cx="0" cy="0.4" r="0.9" fill="#ff3a2a"/>'
    g += '<path d="M0 3.4v1.6" stroke="#0c0a0c" stroke-width="0.7"/>'
    g += '<path d="M-1.5 5.2C-1.5 4.4 1.5 4.4 1.5 5.2L1.2 10C0.8 11 -0.8 11 -1.2 10Z" fill="#2a2228"/>'
    g += '<path d="M-1.5 10.4L-2.2 11.6L2.2 11.6L1.5 10.4Z" fill="#1a1418"/>'
    g += '</g>'
    C.a(g)


# drones: the exact mirror of the flock, one machine for each bird, black against the glow of the fires
for (x, y) in birds:
    drone(2 * MID - x, y + 6, 2.5)

# ------------------------------------------------------------------ ground
C.path(smooth_d([(-20, 760), (300, 740), (MID, 790), (MID, H + 20), (-20, H + 20)], 5), f'url(#{C.lg([(0, "#5e8e40"), (1, "#2e4a24")], 0, 740, 0, H)})')
for k in range(140):
    x = r.uniform(-10, MID - 10)
    yb = 760 + (x / MID) * 26 + r.uniform(-14, 40)
    hgt = r.uniform(10, 26)
    C.brush([(x, yb), (x + r.uniform(-5, 5), yb - hgt * 0.6), (x + r.uniform(-9, 9), yb - hgt)], 2.8,
            r.choice(['#9cc25a', '#6f9a3e', '#c4d88a']), 0.8, tin=0, tout=0.8)
for k in range(18):  # a few wild flowers
    x, y = r.uniform(20, 560), r.uniform(770, 840)
    C.ell(x, y, 3.4, 3, r.choice(['#ffe070', '#ffffff', '#f08a6a']), 0.95)
C.path(poly_d(catmull([(MID - 70, 796), (1000, 770), (1300, 760), (W + 20, 770)], 8) + [(W + 20, H + 20), (MID - 70, H + 20)]), f'url(#{C.lg([(0, "#4a3634"), (1, "#1a1214")], 0, 760, 0, H)})', 1, ' mask="url(#seam)"')
for k in range(30):  # rubble
    x, y = r.uniform(MID + 30, W), r.uniform(780, 845)
    s = r.uniform(5, 16)
    C.path(poly_d([(x, y), (x + s, y - s * 0.6), (x + s * 1.8, y - s * 0.2), (x + s * 1.5, y + 2), (x + s * 0.2, y + 3)]), r.choice(['#3a2c2c', '#2a2020', '#5a4440']), 0.95)

# ------------------------------------------------------------------ the girl, twice, back to back
skin = SK['brown']
hair = ('#3a2a20', '#1a100a', '#080404')
dress_l = ('#ffe48a', '#f0b040', '#a86a1a', '#4a2a0a')
dress_r = ('#b8a88a', '#7a6a58', '#3e342e', '#1a1412')
skin_r = ('#c8967a', '#8a5a40', '#4a2a1a', '#1e0e06')


def girl(cx, flip, dress, sk, mood):
    """Girl standing at x=cx, feet on y=830, looking up. Designed facing +x, mirrored with flip=-1."""
    C.a(f'<g transform="translate({f(cx)} 832) scale({flip} 1)">')
    Lt = (-0.6 * flip, -0.7)
    if mood == 'fear':
        Lt = (0.7 * flip, -0.4)  # lit from the fires in front of her
    C.ell(0, 2, 70, 8, '#0c0808', 0.45, f' filter="url(#{C.blur(5)})"')
    # legs and shoes
    for lx, fwd in [(-12, 0), (12, 6)]:
        tube(C, [(lx, -140), (lx + 1, -80), (lx + fwd * 0.5, -22)], [26, 22, 15], sk, light=Lt, shadow=False)
        foot_bare(C, lx - 8 + fwd * 0.5, 0, 40, sk, light=Lt)
    # far arm
    if mood == 'joy':
        tube(C, [(-6, -326), (-24, -270), (-30, -214)], [24, 20, 16], sk, light=Lt)
        hand_flat(C, -30, -216, 40, 96, sk, spread=0.08, curl=0.3, light=Lt)
    # dress: A-line with the series' band of rhombi
    dp = [(-10, -350), (14, -350), (28, -336), (34, -296), (38, -246), (52, -112), (0, -104), (-52, -112), (-34, -246), (-30, -300), (-26, -336)]
    C.path(smooth_d(dp, 5), '#0c0808', 0.3, f' transform="translate(-6 8)" filter="url(#{C.blur(8)})"')
    dd = body_shape(C, dp, dress, light=Lt, k=16)
    cid = C.id('c')
    C.defs.append(f'<clipPath id="{cid}"><path d="{dd}"/></clipPath>')
    C.a(f'<g clip-path="url(#{cid})">')
    for k in range(5):
        x0 = -40 + k * 20
        fold(C, [(x0 * 0.5, -250), (x0 * 0.8, -180), (x0, -108)], 6, dress[2], 0.4)
    C.path(f"M-60 -152h120v16h-120Z", '#2a6a7a' if mood == 'joy' else '#3a3a40', 0.95)
    for k in range(8):
        C.diamond(-42 + k * 12, -144, 9, 12, '#f6d68a' if mood == 'joy' else '#9a9080', '#8a6a2a' if mood == 'joy' else '#4a4440',
                  hl='#fff4c8' if mood == 'joy' else '#b8b0a0')
    if mood == 'fear':  # dust on the dress
        C.a(f'<rect x="-60" y="-360" width="120" height="260" fill="url(#{C.lg([(0, "#ff7a3a", 0.25), (1, "#ff7a3a", 0)], 60, 0, -40, 0)})"/>')
    C.a('</g>')
    # head
    if mood == 'joy':
        head_profile(C, 4, -392, 42, sk, hair, flip=1, tilt=-28, eye='open', look=1.0, style='bun', light=Lt, blush=0.18, pivot=1.25, mouth='smile', young=True)
    else:
        head_profile(C, 8, -388, 42, sk, hair, flip=1, tilt=-24, eye='open', look=1.0, style='bun', light=Lt, blush=0.0,
                     lit=('#ff8a4a', 0.35), pivot=1.25, mouth='open', young=True)
    # near arm
    if mood == 'joy':
        tube(C, [(4, -334), (30, -392), (54, -452)], [26, 22, 17], sk, light=Lt)
        hand_flat(C, 53, -450, 48, -68, sk, spread=0.2, thumb_side=-1, light=Lt)
    else:
        tube(C, [(2, -330), (16, -270), (34, -296), (40, -318)], [26, 22, 19, 17], sk, light=Lt)
        fist(C, 38, -318, 34, -80, sk, light=Lt)
    C.a('</g>')


girl(MID - 96, -1, dress_l, skin, 'joy')
girl(MID + 96, 1, dress_r, skin_r, 'fear')

# ------------------------------------------------------------------ atmosphere
for k in range(60):  # embers on the right
    C.ell(r.uniform(MID + 40, W), r.uniform(200, 760), r.uniform(1, 2.4), r.uniform(1, 2), r.choice(['#ffb050', '#ff7a2a', '#c8bcb8']), r.uniform(0.4, 0.85))
vg = C.rg([(0, '#000', 0), (0.7, '#000', 0), (1, '#0c0810', 0.4)], W / 2, H / 2, 900)
C.a(f'<rect width="{W}" height="{H}" fill="url(#{vg})"/>')

finish(C, OUT_SVG, OUT_PNG)
