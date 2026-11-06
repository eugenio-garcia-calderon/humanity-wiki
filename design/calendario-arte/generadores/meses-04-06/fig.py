"""Large painted figures for Diseño 3 (months 4-6): profile heads, limbs, garments."""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *  # noqa

SK = {
    'light': ('#ffe4cc', '#eab894', '#9a5e44', '#5a2e20'),
    'olive': ('#f8d2a8', '#d29a6c', '#8a5232', '#4a2414'),
    'brown': ('#e8ae7c', '#b0703e', '#6a3618', '#2e1406'),
    'dark': ('#c99064', '#8a4e2a', '#4a2412', '#1e0c04'),
    'grey': ('#b8bcc8', '#848a9a', '#4a4e60', '#22242e'),
}

# Face profile (facing +x), units of r: forehead -> chin -> jaw
FACE = [(0.22, -0.97), (0.50, -0.80), (0.62, -0.52), (0.665, -0.24), (0.635, -0.10), (0.66, -0.02), (0.74, 0.12),
        (0.82, 0.25), (0.86, 0.31), (0.83, 0.355), (0.75, 0.37), (0.68, 0.395), (0.695, 0.46), (0.705, 0.49),
        (0.665, 0.53), (0.69, 0.57), (0.675, 0.62), (0.625, 0.67), (0.655, 0.75), (0.64, 0.84), (0.55, 0.92),
        (0.40, 0.95), (0.22, 0.90), (0.02, 0.80), (-0.16, 0.64)]
SKULL = [(-0.42, 0.66), (-0.66, 0.46), (-0.84, 0.10), (-0.86, -0.32), (-0.68, -0.74), (-0.30, -0.98), (0.0, -1.03)]


def U(pts, r, ox=0, oy=0):
    return [(ox + x * r, oy + y * r) for x, y in pts]


def head_profile(C, cx, cy, r, skin, hair, flip=1, tilt=0, eye='closed', look=0.0, style='short',
                 light=(-0.7, -0.6), lit=None, neck=True, blush=0.14, lips='#b0584a', brows=None, scale=1.0, pivot=0.0, mouth='neutral', young=False):
    """Painted head in profile looking towards +x (flip=-1 mirrors it to look left).
    r = half head height (crown to chin = 2r). tilt in degrees (negative = chin up when facing right).
    eye: 'closed' | 'open' | 'glazed'. look: -1 down .. +1 up for open eyes.
    lit: optional (colour, opacity) of a coloured light washing the face from the front (screen glow, fire)."""
    hi, mid, lo, deep = skin
    h0, h1, h2 = hair
    lx, ly = light[0] * flip, light[1]
    C.a(f'<g transform="translate({f(cx)} {f(cy)}) rotate({f(tilt * flip)} 0 {f(pivot * r)}) scale({flip} 1)">')
    # ---- hair behind the head
    if style == 'long':
        d = smooth_d(U([(-0.2, -1.0), (-0.85, -0.7), (-1.05, -0.1), (-1.08, 0.6), (-1.0, 1.35), (-0.78, 1.75), (-0.5, 1.6),
                        (-0.35, 1.05), (-0.25, 0.6)], r), 5)
        C.shaded(d, h0, h1, h2, (-1.1 * r, -r, -0.2 * r, 1.75 * r), light=(lx, ly), k=r * 0.25, rough='roughf')
        for k in range(6):
            x0 = -0.95 + k * 0.1
            C.brush(U([(x0, -0.5), (x0 - 0.08, 0.4), (x0 + 0.05, 1.2 + k * 0.06)], r), r * 0.05, h0, 0.35, tin=0.2, tout=0.6)
    elif style == 'bun':
        ball(C, -0.78 * r, -0.62 * r, r * 0.36, h0, h1, h2, k=r * 0.1, rough=None, light=(lx, ly))
        for k in range(5):
            a = k * 1.25
            C.brush([(-0.78 * r + math.cos(a) * r * 0.3, -0.62 * r + math.sin(a) * r * 0.3), (-0.78 * r + math.cos(a + 1.2) * r * 0.22, -0.62 * r + math.sin(a + 1.2) * r * 0.22)],
                    r * 0.06, h0, 0.4, tin=0.3, tout=0.5)
    # ---- neck
    if neck:
        nd = smooth_d(U([(-0.36, 0.45), (0.22, 0.62), (0.32, 1.0), (0.38, 1.55), (-0.5, 1.6), (-0.46, 1.0)], r), 4)
        C.shaded(nd, mid, mid, lo, (-0.5 * r, 0.45 * r, 0.4 * r, 1.6 * r), light=(lx, ly), k=r * 0.18, rough=None, hl=False)
        # shadow cast by the jaw
        C.path(smooth_d(U([(-0.3, 0.55), (0.3, 0.78), (0.34, 1.02), (-0.1, 0.95), (-0.42, 0.8)], r), 4), deep, 0.45,
               f' filter="url(#{C.blur(r*0.08)})"')
        # sterno muscle hint
        C.brush(U([(-0.18, 0.75), (0.05, 1.15), (0.25, 1.5)], r), r * 0.06, lo, 0.3, tin=0.3, tout=0.3)
    # ---- head mass: skull + face
    face = FACE
    if young:  # shorter, softer nose, rounder cheek and chin
        face = [(x - (0.05 if 0.05 < y < 0.42 and x > 0.7 else 0), y) for (x, y) in FACE]
        face = [(x + (0.03 if 0.6 < y < 0.9 else 0), y) for (x, y) in face]
    outline = U(SKULL[:-1], r) + U(face, r)
    d = smooth_d(outline, 6)
    C.shaded(d, hi, mid, lo, (-0.86 * r, -1.03 * r, 0.86 * r, 0.95 * r), light=(lx, ly), k=r * 0.22, deep=lo,
             spread=1.3, hipos=0.3, rough=None)
    pid = C.id('p'); cid = C.id('c')
    C.defs.append(f'<clipPath id="{cid}"><path d="{d}"/></clipPath>')
    C.a(f'<g clip-path="url(#{cid})">')
    # planes of the face: front plane lighter, side plane in mid tone, under-jaw dark
    C.ell(0.40 * r, -0.30 * r, 0.26 * r, 0.30 * r, hi, 0.35, f' filter="url(#{C.blur(r*0.12)})"')  # forehead
    C.ell(0.40 * r, 0.22 * r, 0.20 * r, 0.12 * r, hi, 0.30, f' filter="url(#{C.blur(r*0.08)})"')  # cheekbone
    C.ell(0.30 * r, 0.32 * r, 0.20 * r, 0.14 * r, '#e0604a', blush, f' filter="url(#{C.blur(r*0.1)})"')  # cheek warmth
    C.ell(0.22 * r, 0.96 * r, 0.55 * r, 0.16 * r, deep, 0.5, f' filter="url(#{C.blur(r*0.08)})"')  # under jaw
    C.ell(0.45 * r, -0.04 * r, 0.17 * r, 0.12 * r, lo, 0.42, f' filter="url(#{C.blur(r*0.06)})"')  # eye socket
    C.ell(-0.15 * r, 0.25 * r, 0.32 * r, 0.42 * r, lo, 0.18, f' filter="url(#{C.blur(r*0.14)})"')  # side plane
    if lit:
        col, op = lit
        g = C.lg([(0, col, op), (0.55, col, op * 0.35), (1, col, 0)], 0.9 * r, 0, -0.3 * r, 0)
        C.a(f'<rect x="{f(-r)}" y="{f(-1.1*r)}" width="{f(2*r)}" height="{f(2.2*r)}" fill="url(#{g})"/>')
    C.a('</g>')
    # nose: bridge highlight, wing, nostril
    C.brush(U([(0.66, -0.04), (0.74, 0.12), (0.81, 0.26)], r), r * 0.05, hi, 0.55, tin=0.3, tout=0.3)
    C.a(f'<path d="{poly_d(catmull(U([(0.62, 0.20), (0.67, 0.30), (0.74, 0.34)], r), 5), False)}" fill="none" stroke="{lo}" '
        f'stroke-width="{f(max(r*0.035,0.8))}" stroke-linecap="round" opacity="0.75"/>')
    C.ell(0.715 * r, 0.345 * r, 0.04 * r, 0.018 * r, deep, 0.7)
    # nasolabial shadow
    C.brush(U([(0.6, 0.30), (0.56, 0.42), (0.57, 0.52)], r), r * 0.04, lo, 0.25, tin=0.3, tout=0.4)
    # lips: colour + mouth line
    C.path(smooth_d(U([(0.68, 0.40), (0.705, 0.48), (0.665, 0.53), (0.69, 0.575), (0.66, 0.625), (0.58, 0.60), (0.58, 0.46)], r), 4), lips, 0.55)
    C.ell(0.66 * r, 0.585 * r, 0.035 * r, 0.02 * r, hi, 0.45)
    if mouth == 'smile':
        C.a(f'<path d="M{f(0.672*r)} {f(0.532*r)}Q{f(0.62*r)} {f(0.55*r)} {f(0.56*r)} {f(0.505*r)}" fill="none" stroke="{deep}" '
            f'stroke-width="{f(max(r*0.032,0.8))}" stroke-linecap="round" opacity="0.85"/>')
        C.ell(0.5 * r, 0.42 * r, 0.1 * r, 0.06 * r, hi, 0.35)  # lifted cheek
    elif mouth == 'open':
        C.ell(0.635 * r, 0.54 * r, 0.04 * r, 0.03 * r, deep, 0.9)
    else:
        C.a(f'<path d="M{f(0.672*r)} {f(0.532*r)}Q{f(0.62*r)} {f(0.545*r)} {f(0.565*r)} {f(0.528*r)}" fill="none" stroke="{deep}" '
            f'stroke-width="{f(max(r*0.03,0.8))}" stroke-linecap="round" opacity="0.8"/>')
    # chin light
    C.ell(0.58 * r, 0.80 * r, 0.06 * r, 0.04 * r, hi, 0.35)
    # eye
    ex, ey = 0.50 * r, -0.05 * r
    bc = brows or h2
    C.brush(U([(0.33, -0.22), (0.47, -0.27), (0.6, -0.235)], r), r * 0.065, bc, 0.75, tin=0.15, tout=0.5)
    if eye == 'closed':
        C.ell(ex, ey - 0.04 * r, 0.11 * r, 0.06 * r, hi, 0.4)  # lid light
        C.a(f'<path d="M{f(ex-0.11*r)} {f(ey-0.02*r)}Q{f(ex)} {f(ey+0.07*r)} {f(ex+0.10*r)} {f(ey+0.015*r)}" fill="none" stroke="{deep}" '
            f'stroke-width="{f(max(r*0.035,0.9))}" stroke-linecap="round" opacity="0.9"/>')
        for k in range(4):  # lashes
            t = 0.2 + k * 0.2
            px = ex - 0.11 * r + t * 0.21 * r
            py = ey - 0.02 * r + math.sin(t * math.pi) * 0.045 * r
            C.a(f'<path d="M{f(px)} {f(py)}l{f(0.015*r)} {f(0.045*r)}" stroke="{deep}" stroke-width="{f(max(r*0.015,0.6))}" stroke-linecap="round" opacity="0.7"/>')
        C.a(f'<path d="M{f(ex-0.1*r)} {f(ey-0.09*r)}Q{f(ex)} {f(ey-0.13*r)} {f(ex+0.09*r)} {f(ey-0.07*r)}" fill="none" stroke="{lo}" '
            f'stroke-width="{f(max(r*0.022,0.6))}" stroke-linecap="round" opacity="0.6"/>')
    else:
        up = look * 0.03 * r
        al = smooth_d([(ex - 0.10 * r, ey - 0.005 * r), (ex + 0.02 * r, ey - 0.06 * r), (ex + 0.11 * r, ey - 0.005 * r), (ex + 0.02 * r, ey + 0.04 * r)], 4)
        white = '#e8e0d4' if eye == 'open' else '#b8c4d0'
        ec = C.id('c')
        C.defs.append(f'<clipPath id="{ec}"><path d="{al}"/></clipPath>')
        C.path(al, white)
        C.a(f'<g clip-path="url(#{ec})">')
        irc = '#5a3a20' if eye == 'open' else '#3a4a5a'
        C.ell(ex + 0.06 * r, ey - 0.008 * r - up, 0.045 * r, 0.06 * r, irc)
        C.ell(ex + 0.075 * r, ey - 0.008 * r - up, 0.02 * r, 0.035 * r, '#0c0806')
        C.ell(ex, ey - 0.06 * r, 0.14 * r, 0.035 * r, deep, 0.45)  # lid shadow
        C.a('</g>')
        if eye == 'glazed':
            C.ell(ex + 0.068 * r, ey - 0.02 * r - up, 0.016 * r, 0.012 * r, '#d8f4ff', 0.95)
        else:
            C.ell(ex + 0.068 * r, ey - 0.025 * r - up, 0.012 * r, 0.012 * r, '#fffef2', 0.9)
        # upper lid line + crease, lower lid
        C.a(f'<path d="M{f(ex-0.11*r)} {f(ey)}Q{f(ex+0.02*r)} {f(ey-0.075*r)} {f(ex+0.115*r)} {f(ey-0.01*r)}" fill="none" stroke="{deep}" '
            f'stroke-width="{f(max(r*0.032,0.9))}" stroke-linecap="round"/>')
        C.a(f'<path d="M{f(ex-0.08*r)} {f(ey-0.075*r)}Q{f(ex+0.02*r)} {f(ey-0.12*r)} {f(ex+0.09*r)} {f(ey-0.07*r)}" fill="none" stroke="{lo}" '
            f'stroke-width="{f(max(r*0.02,0.6))}" stroke-linecap="round" opacity="0.6"/>')
        C.a(f'<path d="M{f(ex-0.06*r)} {f(ey+0.03*r)}Q{f(ex+0.04*r)} {f(ey+0.055*r)} {f(ex+0.1*r)} {f(ey+0.01*r)}" fill="none" stroke="{lo}" '
            f'stroke-width="{f(max(r*0.018,0.6))}" stroke-linecap="round" opacity="0.55"/>')
    # ---- hair cap (front)
    if style in ('short', 'long', 'bun', 'curly', 'child'):
        cap = [(0.58, -0.66), (0.44, -0.66), (0.26, -0.52), (0.14, -0.30), (0.10, -0.06), (-0.04, 0.04), (-0.30, 0.08),
               (-0.42, 0.45), (-0.62, 0.48), (-0.88, 0.18), (-0.94, -0.32), (-0.76, -0.82), (-0.32, -1.10), (0.12, -1.10), (0.46, -0.92)]
        if style == 'short':
            cap = [(0.56, -0.70), (0.42, -0.64), (0.28, -0.56), (0.18, -0.34), (0.10, -0.10), (-0.04, -0.06), (-0.32, 0.02),
                   (-0.48, 0.42), (-0.66, 0.40), (-0.9, 0.12), (-0.94, -0.36), (-0.74, -0.86), (-0.30, -1.12), (0.16, -1.12), (0.50, -0.94)]
        dcap = smooth_d(U(cap, r), 5)
        C.shaded(dcap, h0, h1, h2, (-0.94 * r, -1.12 * r, 0.6 * r, 0.48 * r), light=(lx, ly), k=r * 0.2, rough='roughf')
        # locks: strands flowing from the crown backwards
        for k in range(9):
            t = k / 8
            sx, sy = (0.42 - t * 0.3) * r, (-0.86 + t * 0.06) * r
            exx, eyy = (-0.2 - t * 0.62) * r, (-0.5 + t * 0.9) * r
            mx, my = (sx + exx) / 2 - 0.05 * r, (sy + eyy) / 2 - 0.22 * r
            C.brush([(sx, sy), (mx, my), (exx, eyy)], r * 0.07, h0 if k % 2 == 0 else h2, 0.45, tin=0.2, tout=0.5)
        if style == 'curly':
            for k in range(16):
                a = math.radians(-200 + k * 13)
                bx, by = -0.3 * r + math.cos(a) * 0.72 * r, -0.4 * r + math.sin(a) * 0.72 * r
                ball(C, bx, by, r * 0.16, h0, h1, h2, k=r * 0.04, rough=None, light=(lx, ly))
    # ear
    C.ell(-0.12 * r, 0.12 * r, 0.13 * r, 0.21 * r, mid)
    C.ell(-0.10 * r, 0.12 * r, 0.075 * r, 0.14 * r, lo, 0.5)
    C.a(f'<path d="M{f(-0.2*r)} {f(0.0)}Q{f(-0.24*r)} {f(0.16*r)} {f(-0.14*r)} {f(0.3*r)}" fill="none" stroke="{hi}" stroke-width="{f(r*0.035)}" opacity="0.5" stroke-linecap="round"/>')
    C.a('</g>')


def limb(C, pts, w0, w1, cols, light=(-0.6, -0.7), shadow=True, rough=None, hlw=0.2, k=None):
    """Tapered painted limb along pts (shoulder..wrist or hip..ankle), cols = (hi, mid, lo, deep)."""
    hi, mid, lo, deep = cols
    d = taper_d(pts, w0, w1, 7)
    bb = bbox(pts, max(w0, w1) / 2)
    if shadow:
        C.path(d, '#120a10', 0.22, f' transform="translate(6 8)" filter="url(#{C.blur(6)})"')
    C.shaded(d, hi, mid, lo, bb, light=light, k=k or max(w0, w1) * 0.3, deep=deep, rough=rough, spread=1.4)
    lx, ly = light
    off = max(w0, w1) * 0.2
    C.brush([(x + lx * off, y + ly * off) for x, y in pts], (w0 + w1) / 2 * hlw, hi, 0.45, tin=0.2, tout=0.3, wob=0.05)
    return d


def body_shape(C, pts, cols, light=(-0.6, -0.7), k=None, rough='roughf', shadow=None, n=5, hl=True, spread=1.4):
    hi, mid, lo, deep = cols
    d = smooth_d(pts, n)
    bb = bbox(pts)
    if shadow:
        dx, dy, sd, op = shadow
        C.path(d, '#120a10', op, f' transform="translate({dx} {dy})" filter="url(#{C.blur(sd)})"')
    C.shaded(d, hi, mid, lo, bb, light=light, k=k or (bb[2] - bb[0]) * 0.18, deep=deep, rough=rough, hl=hl, spread=spread)
    return d


def fist(C, x, y, s, ang, skin, light=(-0.6, -0.7)):
    """Small closed hand: rounded block with four knuckle bumps and the thumb across."""
    hi, mid, lo, deep = skin
    C.a(f'<g transform="translate({f(x)} {f(y)}) rotate({f(ang)})">')
    d = smooth_d([(0, -s * 0.32), (s * 0.55, -s * 0.38), (s * 0.78, -s * 0.18), (s * 0.8, s * 0.2), (s * 0.5, s * 0.36), (0, s * 0.3)], 4)
    C.shaded(d, hi, mid, lo, (0, -s * 0.38, s * 0.8, s * 0.36), light=light, k=s * 0.1, rough=None)
    for k in range(4):
        C.ell(s * 0.7, (-0.24 + k * 0.15) * s, s * 0.09, s * 0.07, hi, 0.5)
        C.brush([(s * 0.62, (-0.17 + k * 0.15) * s), (s * 0.78, (-0.17 + k * 0.15) * s)], s * 0.025, deep, 0.5, tin=0.3, tout=0.3)
    C.brush([(s * 0.15, s * 0.2), (s * 0.45, s * 0.12), (s * 0.62, s * 0.02)], s * 0.16, mid, 1, tin=0.1, tout=0.3)
    C.brush([(s * 0.18, s * 0.16), (s * 0.45, s * 0.08)], s * 0.05, hi, 0.5, tin=0.2, tout=0.4)
    C.a('</g>')


def fold(C, pts, w, col, op=0.4):
    C.brush(pts, w, col, op, tin=0.3, tout=0.5, wob=0.1)


def hand_profile(C, x, y, s, ang, skin, open_=0.0, flip=1, thumb_up=True):
    """Hand seen from the side: wrist at (x, y), pointing at ang degrees. open_ 0 = relaxed, 1 = fingers spread."""
    hi, mid, lo, deep = skin
    C.a(f'<g transform="translate({f(x)} {f(y)}) rotate({f(ang)}) scale(1 {flip})">')
    palm = smooth_d([(0, -s * 0.2), (s * 0.35, -s * 0.24), (s * 0.62, -s * 0.18), (s * 0.66, s * 0.14), (s * 0.4, s * 0.24), (0, s * 0.18)], 4)
    # fingers (back ones darker)
    for i, (yo, L, c) in enumerate([(0.15, 0.42, lo), (0.05, 0.52, mid), (-0.06, 0.55, mid), (-0.16, 0.46, mid)]):
        L *= s
        sp = (i - 1.5) * open_ * 0.12
        p0 = (s * 0.58, yo * s)
        p1 = (s * 0.58 + L * 0.5, yo * s + L * (0.08 + sp))
        p2 = (s * 0.58 + L, yo * s + L * (0.2 + sp * 2))
        C.brush([p0, p1, p2], s * 0.15, c if i else lo, 1, tin=0, tout=0.15, wob=0.02, minw=s * 0.08)
        if i:
            C.brush([(p0[0], p0[1] - s * 0.03), (p1[0], p1[1] - s * 0.03), (p2[0] - s * 0.05, p2[1] - s * 0.03)], s * 0.05, hi, 0.6, tin=0.1, tout=0.4)
    C.shaded(palm, hi, mid, lo, (0, -s * 0.24, s * 0.66, s * 0.24), light=(-0.5, -0.8), k=s * 0.1, rough=None, spread=1.3)
    # thumb
    if thumb_up:
        tp = [(s * 0.2, -s * 0.14), (s * 0.45, -s * 0.34), (s * 0.7, -s * 0.36)]
        C.brush(tp, s * 0.17, mid, 1, tin=0, tout=0.2, wob=0.02, minw=s * 0.09)
        C.brush([(px, py - s * 0.03) for px, py in tp], s * 0.06, hi, 0.6, tin=0.1, tout=0.4)
    # knuckle hints
    for k in range(3):
        C.ell(s * 0.58, (-0.12 + k * 0.1) * s, s * 0.03, s * 0.02, hi, 0.5)
    C.a('</g>')


def hand_flat(C, x, y, s, ang, skin, spread=0.18, thumb_side=1, curl=0.0, light=(-0.6, -0.7)):
    """Back of an open hand laid flat (on bark, on soil, on a body). Wrist at (x, y), fingers toward ang.
    s = wrist-to-fingertip length. thumb_side +1/-1 chooses the side of the thumb."""
    hi, mid, lo, deep = skin
    C.a(f'<g transform="translate({f(x)} {f(y)}) rotate({f(ang)})">')
    C.ell(s * 0.5, s * 0.06, s * 0.52, s * 0.22, '#120a08', 0.3, f' filter="url(#{C.blur(s*0.06)})"')
    ts = thumb_side
    # thumb from the side of the palm
    tp = [(s * 0.12, ts * s * 0.12), (s * 0.3, ts * s * 0.24), (s * 0.48, ts * s * 0.28)]
    C.brush(tp, s * 0.15, lo, 1, tin=0, tout=0.25, wob=0.02, minw=s * 0.07)
    C.brush([(px - s * 0.01, py - ts * s * 0.02) for px, py in tp], s * 0.06, hi, 0.55, tin=0.1, tout=0.5)
    # fingers fanning out
    fl = [(-0.15, 0.40), (-0.05, 0.47), (0.05, 0.45), (0.15, 0.36)]
    for i, (yo, L) in enumerate(fl):
        yo *= -ts
        a = (i - 1.5) * spread * -ts
        L *= s
        p0 = (s * 0.5, yo * s)
        p1 = (p0[0] + math.cos(a) * L * 0.5, p0[1] + math.sin(a) * L * 0.5 + curl * L * 0.1)
        p2 = (p0[0] + math.cos(a) * L, p0[1] + math.sin(a) * L + curl * L * 0.25)
        C.brush([p0, p1, p2], s * 0.12, lo, 1, tin=0, tout=0.12, wob=0.02, minw=s * 0.075)
        C.brush([(p0[0], p0[1] - s * 0.012), (p1[0], p1[1] - s * 0.015), (p2[0] - s * 0.03, p2[1] - s * 0.012)], s * 0.065, mid, 0.9, tin=0.05, tout=0.3)
        C.brush([(p0[0] + s * 0.02, p0[1] - s * 0.02), (p1[0], p1[1] - s * 0.02)], s * 0.03, hi, 0.55, tin=0.1, tout=0.5)
        # knuckle and nail
        C.ell(p1[0], p1[1], s * 0.022, s * 0.03, lo, 0.5)
        C.ell(p2[0] - math.cos(a) * s * 0.035, p2[1] - math.sin(a) * s * 0.035, s * 0.028, s * 0.022, hi, 0.55)
    # back of the hand
    palm = smooth_d([(0, -s * 0.13), (s * 0.28, -s * 0.2), (s * 0.52, -s * 0.2), (s * 0.55, s * 0.18), (s * 0.3, s * 0.2), (0, s * 0.13)], 4)
    C.shaded(palm, hi, mid, lo, (0, -s * 0.2, s * 0.55, s * 0.2), light=light, k=s * 0.07, rough=None, spread=1.3)
    for i in range(4):  # tendons and knuckles
        yy = (-0.15 + i * 0.1) * s * -ts
        C.brush([(s * 0.12, yy * 0.5), (s * 0.48, yy)], s * 0.025, hi, 0.35, tin=0.3, tout=0.3)
        C.ell(s * 0.5, yy, s * 0.035, s * 0.03, hi, 0.55)
    C.a('</g>')


def tube_d(pts, widths, offs=None, n=8):
    """Closed outline along a centre line with a width (and optional sideways offset) per control point.
    Widths/offsets are interpolated along the curve; offs > 0 pushes the shape to the left normal."""
    dense = catmull(pts, n)
    m = len(pts) - 1
    L, R = [], []
    for k, (x, y) in enumerate(dense):
        u = k / max(1, len(dense) - 1) * m
        i = min(int(u), m - 1)
        t = u - i
        # smooth interpolation between control widths
        t2 = t * t * (3 - 2 * t)
        w = widths[i] + (widths[i + 1] - widths[i]) * t2
        o = 0
        if offs:
            o = offs[i] + (offs[i + 1] - offs[i]) * t2
        a = dense[max(k - 1, 0)]
        b = dense[min(k + 1, len(dense) - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        l = math.hypot(tx, ty) or 1
        nx, ny = -ty / l, tx / l
        cx, cy = x + nx * o, y + ny * o
        L.append((cx + nx * w / 2, cy + ny * w / 2))
        R.append((cx - nx * w / 2, cy - ny * w / 2))
        if k == 0:
            cap0 = (cx, cy, nx, ny, w)
        cap1 = (cx, cy, nx, ny, w)
    # round caps at both ends
    def cap(c, sign):
        cx, cy, nx, ny, w = c
        dx, dy = ny, -nx  # forward direction
        pts = []
        for j in range(1, 8):
            th = j / 8 * math.pi
            pts.append((cx + nx * w / 2 * math.cos(th) * sign + dx * w / 2 * math.sin(th) * sign,
                        cy + ny * w / 2 * math.cos(th) * sign + dy * w / 2 * math.sin(th) * sign))
        return pts
    return poly_d(L + cap(cap1, 1) + R[::-1] + cap(cap0, -1))


def tube(C, pts, widths, cols, offs=None, light=(-0.6, -0.7), shadow=True, k=None, hl=True):
    hi, mid, lo, deep = cols
    d = tube_d(pts, widths, offs)
    wmax = max(widths)
    bb = bbox(pts, wmax / 2)
    if shadow:
        C.path(d, '#120a10', 0.2, f' transform="translate(6 8)" filter="url(#{C.blur(6)})"')
    C.shaded(d, hi, mid, lo, bb, light=light, k=k or wmax * 0.28, deep=deep, rough=None, spread=1.4, hl=hl)
    lx, ly = light
    C.brush([(x + lx * wmax * 0.18, y + ly * wmax * 0.18) for x, y in pts[:-1]], wmax * 0.16, hi, 0.35, tin=0.3, tout=0.4, wob=0.05)
    return d


def leg_pointed(C, hip, knee, ankle, cols, light, thigh=48, foot_len=46, up=1):
    """Dancer's straight leg with thigh, knee, calf bulge, slim ankle and a pointed foot.
    up=+1 puts the calf bulge on the lower side of a horizontal leg."""
    hx, hy = hip; kx, ky = knee; ax, ay = ankle
    ux, uy = ax - kx, ay - ky
    l = math.hypot(ux, uy) or 1
    ux, uy = ux / l, uy / l
    toe = (ax + ux * foot_len, ay + uy * foot_len + 3)
    mid1 = ((hx + kx) / 2, (hy + ky) / 2)
    calf = (kx + (ax - kx) * 0.33, ky + (ay - ky) * 0.33)
    pts = [hip, mid1, knee, calf, ankle, ((ax + toe[0]) / 2, (ay + toe[1]) / 2 + 1), toe]
    w = [thigh, thigh * 0.78, thigh * 0.5, thigh * 0.6, thigh * 0.27, thigh * 0.3, thigh * 0.08]
    o = [0, 0, 0, up * thigh * 0.08, 0, -up * thigh * 0.06, 0]
    return tube(C, pts, w, cols, offs=o, light=light)


def arm_bare(C, sh, el, wr, cols, light, w=24):
    mid1 = ((sh[0] + el[0]) / 2, (sh[1] + el[1]) / 2)
    mid2 = (el[0] + (wr[0] - el[0]) * 0.35, el[1] + (wr[1] - el[1]) * 0.35)
    pts = [sh, mid1, el, mid2, wr]
    return tube(C, pts, [w, w * 0.88, w * 0.66, w * 0.74, w * 0.5], cols, light=light)


def foot_bare(C, x, y, L, skin, flip=1, light=(-0.6, -0.7), ankle=True):
    """Bare foot in profile standing on the ground at y, heel near x, toes towards +x (flip=-1 mirrors).
    L = heel-to-toe length."""
    hi, mid, lo, deep = skin
    h = L * 0.36
    C.a(f'<g transform="translate({f(x)} {f(y)}) scale({flip} 1)">')
    C.ell(L * 0.4, 1, L * 0.62, L * 0.07, '#120a08', 0.45, f' filter="url(#{C.blur(L*0.06)})"')
    pts = [(-0.02 * L, -h * 1.9), (-0.1 * L, -h * 1.1), (-0.2 * L, -h * 0.45), (-0.16 * L, -h * 0.05), (-0.04 * L, 0), (0.22 * L, -h * 0.06),
           (0.42 * L, -h * 0.12), (0.62 * L, 0), (0.86 * L, 0), (0.98 * L, -h * 0.08), (0.98 * L, -h * 0.3), (0.86 * L, -h * 0.42),
           (0.6 * L, -h * 0.62), (0.32 * L, -h * 0.95), (0.2 * L, -h * 1.3), (0.2 * L, -h * 1.9)]
    if not ankle:
        pts = [(px, max(py, -h * 1.1)) for px, py in pts]
    d = smooth_d(pts, 5)
    C.shaded(d, hi, mid, lo, (-0.2 * L, -h * 1.9, L, 0), light=light, k=L * 0.07, rough=None, spread=1.3)
    # ankle bone, arch shadow, toes
    C.ell(0.06 * L, -h * 0.95, L * 0.06, L * 0.05, hi, 0.45)
    C.brush([(0.05 * L, -h * 0.12), (0.3 * L, -h * 0.22), (0.5 * L, -h * 0.14)], L * 0.05, lo, 0.5, tin=0.3, tout=0.3)
    for k in range(4):
        tx = 0.94 * L - k * 0.07 * L
        C.ell(tx, -h * (0.2 + k * 0.03), L * 0.045, L * 0.04, hi if k == 0 else mid, 0.6)
        C.brush([(tx - L * 0.035, -h * (0.34 + k * 0.03)), (tx - L * 0.035, -h * (0.08))], L * 0.012, lo, 0.6, tin=0.2, tout=0.2)
    C.brush([(0.3 * L, -h * 0.82), (0.62 * L, -h * 0.55), (0.84 * L, -h * 0.4)], L * 0.05, hi, 0.4, tin=0.3, tout=0.4)
    C.a('</g>')
