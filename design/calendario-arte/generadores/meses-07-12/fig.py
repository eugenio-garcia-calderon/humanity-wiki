"""Figure engine for Diseño 3: large side-view human figures painted with volume.

Coordinates: canvas units (1485x850). Angles for limbs: degrees, 0 = straight down,
90 = pointing +x (right), 180 = straight up, -90 = pointing -x (left).
"""
import math, os, sys, re, subprocess
sys.path.insert(0, '/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos2/g101112')
from pinta import *  # noqa
from comun import circ, ellp, bbox, lerp, ball, blob, foliage, leaf_d  # noqa

SKIN = {
    'light': ('#f8dcc0', '#d9a682', '#8a5236'),
    'olive': ('#f0c89a', '#c58f62', '#6a3c20'),
    'brown': ('#dca070', '#a26438', '#4a2410'),
    'dark': ('#b88058', '#7a4626', '#2e1408'),
}


def fk(p, ang, L):
    a = math.radians(ang)
    return (p[0] + math.sin(a) * L, p[1] + math.cos(a) * L)


def mix(c1, c2, t):
    a = [int(c1[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(c2[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{int(round(a[k] + (b[k] - a[k]) * t)):02x}' for k in range(3))


def tint(cols, c2, t):
    return tuple(mix(c, c2, t) for c in cols)


def _interp(ws, i, n):
    seg = min(i // n, len(ws) - 2)
    fr = (i - seg * n) / n
    fr = fr * fr * (3 - 2 * fr)
    return ws[seg] + (ws[seg + 1] - ws[seg]) * fr


def tube_d(pts, wa, wb=None, n=6, cap0=True, cap1=True):
    """Closed outline around the polyline pts. wa/wb: half-widths per control point on
    the +normal / -normal side (wb defaults to wa). Rounded caps at the ends."""
    wb = wb or wa
    dense = catmull(pts, n)
    A, B = [], []
    for i, (x, y) in enumerate(dense):
        p = dense[max(i - 1, 0)]
        q = dense[min(i + 1, len(dense) - 1)]
        tx, ty = q[0] - p[0], q[1] - p[1]
        l = math.hypot(tx, ty) or 1
        nx, ny = -ty / l, tx / l
        a = _interp(wa, i, n)
        b = _interp(wb, i, n)
        A.append((x + nx * a, y + ny * a))
        B.append((x - nx * b, y - ny * b))

    def cap(pc, pa, pb, outward):
        # half-ellipse from pa to pb bulging along `outward`
        cx, cy = (pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2
        rx, ry = (pa[0] - cx), (pa[1] - cy)
        r = math.hypot(rx, ry)
        ox, oy = outward
        out = []
        for k in range(1, 6):
            t = k / 6 * math.pi
            out.append((cx + rx * math.cos(t) + ox * r * 0.85 * math.sin(t), cy + ry * math.cos(t) + oy * r * 0.85 * math.sin(t)))
        return out

    def unit(a, b):
        l = math.hypot(b[0] - a[0], b[1] - a[1]) or 1
        return ((b[0] - a[0]) / l, (b[1] - a[1]) / l)

    pts_out = list(A)
    if cap1:
        pts_out += cap(dense[-1], A[-1], B[-1], unit(dense[-2], dense[-1]))
    pts_out += B[::-1]
    if cap0:
        pts_out += cap(dense[0], B[0], A[0], unit(dense[1], dense[0]))
    return poly_d(pts_out)


def part(C, d, cols, light, k, bb=None, rough='roughf', deep=None, hl=True, spread=1.4, shadow=None, extra=''):
    hi, mid, lo = cols
    if bb is None:
        nums = [float(v) for v in re.findall(r'-?\d+\.?\d*', d)]
        xs, ys = nums[0::2], nums[1::2]
        bb = (min(xs), min(ys), max(xs), max(ys))
    if shadow:
        dx, dy, sd, op = shadow
        C.path(d, '#0e0810', op, f' transform="translate({f(dx)} {f(dy)})" filter="url(#{C.blur(sd)})"')
    return C.shaded(d, hi, mid, lo, bb, light=light, k=k, deep=deep, rough=rough, hl=hl, spread=spread, extra=extra)


def limb(C, pts, wa, cols, light, wb=None, k=None, rough='roughf', deep=None, sheen=True, cap0=True, cap1=True, shadow=None):
    d = tube_d(pts, wa, wb, cap0=cap0, cap1=cap1)
    kk = k or max(wa) * 0.75
    part(C, d, cols, light, kk, rough=rough, deep=deep, shadow=shadow)
    if sheen:
        # painted highlight along the lit edge
        lx, ly = light
        off = []
        for i, (x, y) in enumerate(pts):
            w = wa[min(i, len(wa) - 1)] if wb is None else (wa[min(i, len(wa) - 1)] + wb[min(i, len(wb) - 1)]) / 2
            off.append((x + lx * w * 0.5, y + ly * w * 0.5))
        C.brush(off, max(wa) * 0.35, cols[0], 0.35, tin=0.25, tout=0.35, extra=f' filter="url(#{C.blur(max(wa)*0.12)})"')
    return d


# ---------------------------------------------------------------- head
# Profile head facing +x, unit = head height (crown 0 .. chin 1). Neck attaches at NECK.
PROFILE = [(-0.30, 1.12), (-0.33, 0.86), (-0.43, 0.6), (-0.42, 0.3), (-0.3, 0.08), (-0.06, -0.01), (0.2, 0.05), (0.33, 0.2),
           (0.375, 0.36), (0.39, 0.43), (0.365, 0.475), (0.41, 0.57), (0.46, 0.655), (0.465, 0.685), (0.425, 0.705), (0.405, 0.72),
           (0.425, 0.765), (0.41, 0.795), (0.42, 0.83), (0.395, 0.86), (0.375, 0.885), (0.395, 0.935), (0.36, 0.985), (0.25, 1.0),
           (0.12, 0.98), (0.12, 1.05), (0.14, 1.14)]
NECK = (-0.08, 1.0)


class Head:
    def __init__(self, nx, ny, hu, face=1, tilt=0.0):
        self.nx, self.ny, self.hu, self.face = nx, ny, hu, face
        a = math.radians(-tilt * face)
        self.ca, self.sa = math.cos(a), math.sin(a)

    def P(self, x, y):
        x = (x - NECK[0]) * self.hu * self.face
        y = (y - NECK[1]) * self.hu
        return (self.nx + x * self.ca - y * self.sa, self.ny + x * self.sa + y * self.ca)

    def pts(self, L):
        return [self.P(x, y) for x, y in L]

    def light(self, l):
        return l


def head(C, nx, ny, hu, skin, hair, face=1, tilt=0.0, eyes='closed', hairstyle='bun', light=(-0.6, -0.7), lit=1.0,
         smile=0.0, lip='#b85848', beard=None, rim=None, feat=None):
    """Profile head. (nx, ny) is where the neck meets the head (the throat/nape mid-point)."""
    h = Head(nx, ny, hu, face, tilt)
    hi, mid, lo = skin
    hh = hair
    u = hu
    # long hair falls behind first
    if hairstyle == 'long':
        d = smooth_d(h.pts([(-0.2, 0.1), (-0.48, 0.35), (-0.52, 0.9), (-0.46, 1.45), (-0.2, 1.5), (-0.18, 0.9), (-0.05, 0.5)]), 5)
        part(C, d, hh, light, u * 0.12, rough='roughf')
    # head shape, varied per person: nose length, lips, chin, brow, skull
    ft = dict(nose=1.0, lips=1.0, chin=0.0, brow=0.0, jaw=0.0, back=0.0)
    ft.update(feat or {})
    prof = []
    for i, (x, y) in enumerate(PROFILE):
        if 10 <= i <= 14:
            x = 0.37 + (x - 0.37) * ft['nose']
            if i in (12, 13):
                y += (ft['nose'] - 1) * 0.04
        elif 15 <= i <= 18:
            x = 0.4 + (x - 0.4) * ft['lips'] + (ft['lips'] - 1) * 0.01
        elif 19 <= i <= 23:
            x += ft['chin']
            y += ft['chin'] * 0.5
        elif 8 <= i <= 9:
            x += ft['brow']
        elif i in (22, 23, 24):
            y += ft['jaw']
        elif 1 <= i <= 4:
            x -= ft['back']
        prof.append((x, y))
    d = smooth_d(h.pts(prof), 6)
    part(C, d, skin, light, u * 0.13, deep=lo, spread=1.2, shadow=(u * 0.04, u * 0.05, u * 0.05, 0.3))
    pid = C.id('p')
    cid = C.id('c')
    C.defs.append(f'<clipPath id="{cid}"><path d="{d}"/></clipPath>')
    C.a(f'<g clip-path="url(#{cid})">')
    # under-jaw / neck shade and jaw line
    jaw = h.pts([(-0.06, 0.7), (0.02, 0.86), (0.16, 0.95), (0.3, 0.99)])
    C.brush(jaw, u * 0.07, lo, 0.35, tin=0.3, tout=0.2, extra=f' filter="url(#{C.blur(u*0.02)})"')
    C.path(smooth_d(h.pts([(-0.1, 0.9), (0.1, 0.99), (0.3, 1.02), (0.2, 1.2), (-0.2, 1.2)]), 3), lo, 0.55, f' filter="url(#{C.blur(u*0.03)})"')
    # eye socket and temple shade
    ex, ey = h.P(0.29, 0.49)
    C.ell(ex, ey, u * 0.09, u * 0.06, lo, 0.38, f' filter="url(#{C.blur(u*0.03)})"')
    tx, ty = h.P(0.12, 0.36)
    C.ell(tx, ty, u * 0.1, u * 0.09, lo, 0.18, f' filter="url(#{C.blur(u*0.04)})"')
    # cheekbone light + warm cheek
    cx_, cy_ = h.P(0.25, 0.6)
    C.ell(cx_, cy_, u * 0.1, u * 0.06, hi, 0.4 * lit, f' filter="url(#{C.blur(u*0.03)})"')
    bx, by = h.P(0.27, 0.68)
    C.ell(bx, by, u * 0.08, u * 0.06, '#e07060', 0.22 * lit, f' filter="url(#{C.blur(u*0.03)})"')
    # nose bridge light
    C.brush(h.pts([(0.385, 0.47), (0.42, 0.56), (0.45, 0.64)]), u * 0.03, hi, 0.55 * lit, tin=0.3, tout=0.3)
    # nostril wing
    C.line(h.pts([(0.385, 0.645), (0.36, 0.67), (0.38, 0.695), (0.41, 0.7)]), max(u * 0.012, 0.8), lo, 0.65)
    C.ell(*h.P(0.405, 0.695), u * 0.016, u * 0.008, '#3a1810', 0.6)
    # lips
    C.ell(*h.P(0.405, 0.78), u * 0.04, u * 0.022, lip, 0.55)
    C.ell(*h.P(0.405, 0.825), u * 0.04, u * 0.026, lip, 0.5)
    C.ell(*h.P(0.41, 0.83), u * 0.018, u * 0.008, hi, 0.45)
    m0 = h.P(0.36, 0.80 - smile * 0.02)
    m1 = h.P(0.405, 0.8)
    m2 = h.P(0.43, 0.797)
    C.line([m0, m1, m2], max(u * 0.012, 0.8), '#5a2018', 0.75)
    # nasolabial fold
    C.line(h.pts([(0.37, 0.68), (0.33, 0.74), (0.33, 0.8)]), max(u * 0.01, 0.7), lo, 0.3)
    # chin light
    C.ell(*h.P(0.36, 0.93), u * 0.03, u * 0.02, hi, 0.4 * lit)
    # rim light from a second source (screen etc.)
    if rim:
        rc, rx_, ry_ = rim
        C.path(d, rc, 0.2, f' filter="url(#{C.blur(u*0.08)})"')
    C.a('</g>')
    # eye
    if eyes == 'closed':
        lid = h.pts([(0.235, 0.485), (0.29, 0.505), (0.335, 0.49)])
        C.line(lid, max(u * 0.014, 1), '#3a1a10', 0.85)
        C.line(h.pts([(0.25, 0.505), (0.285, 0.515)]), max(u * 0.006, 0.6), '#3a1a10', 0.5)  # lashes
        C.line(h.pts([(0.245, 0.455), (0.29, 0.44), (0.335, 0.455)]), max(u * 0.01, 0.8), lo, 0.5)  # lid crease
        C.ell(*h.P(0.29, 0.468), u * 0.035, u * 0.014, hi, 0.5 * lit)
    elif eyes in ('open', 'down', 'dull'):
        # side-view almond eye
        drop = 0.02 if eyes != 'open' else 0
        e0, e1 = h.P(0.255, 0.49), h.P(0.335, 0.485)
        top = h.P(0.3, 0.462 + drop)
        bot = h.P(0.295, 0.51)
        dd = f"M{f(e0[0])} {f(e0[1])}Q{f(top[0])} {f(top[1])} {f(e1[0])} {f(e1[1])}Q{f(bot[0])} {f(bot[1])} {f(e0[0])} {f(e0[1])}Z"
        C.path(dd, '#e8dcd0' if eyes != 'dull' else '#c8c4c8')
        ic = h.P(0.31 if eyes == 'open' else 0.305, 0.49 + (0.008 if eyes != 'open' else 0))
        ecid = C.id('c')
        C.defs.append(f'<clipPath id="{ecid}"><path d="{dd}"/></clipPath>')
        C.a(f'<g clip-path="url(#{ecid})">')
        C.a(f'<circle cx="{f(ic[0])}" cy="{f(ic[1])}" r="{f(u*0.024)}" fill="#3a2414"/>')
        C.a(f'<circle cx="{f(ic[0])}" cy="{f(ic[1])}" r="{f(u*0.012)}" fill="#0c0606"/>')
        C.a(f'<path d="{dd}" fill="none" stroke="#000" stroke-width="{f(u*0.02)}" opacity="0.3" transform="translate(0 {f(u*0.006)})"/>')
        C.a('</g>')
        if eyes != 'dull':
            C.a(f'<circle cx="{f(ic[0]+u*0.008*face)}" cy="{f(ic[1]-u*0.008)}" r="{f(u*0.006)}" fill="#fff" opacity="0.85"/>')
        C.line([e0, top, e1], max(u * 0.016, 1), '#2a140c', 0.85)
        C.line(h.pts([(0.25, 0.45 + drop), (0.29, 0.437 + drop), (0.335, 0.455 + drop)]), max(u * 0.01, 0.8), lo, 0.5)
    # brow
    C.brush(h.pts([(0.22, 0.42), (0.28, 0.405), (0.345, 0.415)]), u * 0.022, hh[2], 0.6, tin=0.2, tout=0.5)
    # ear
    ex, ey = h.P(-0.07, 0.53)
    rot = math.degrees(math.atan2(h.sa, h.ca))
    C.ell(ex, ey, u * 0.075, u * 0.125, mid, 1, f' transform="rotate({f(rot+8*face)} {f(ex)} {f(ey)})"')
    C.ell(ex, ey, u * 0.05, u * 0.09, lo, 0.45, f' transform="rotate({f(rot+8*face)} {f(ex)} {f(ey)})"')
    C.ell(ex + u * 0.01 * face, ey + u * 0.01, u * 0.025, u * 0.05, '#4a2010', 0.4, f' transform="rotate({f(rot)} {f(ex)} {f(ey)})"')
    C.brush(h.pts([(-0.12, 0.45), (-0.13, 0.53), (-0.1, 0.62)]), u * 0.018, hi, 0.5 * lit, tin=0.3, tout=0.3)
    # hair
    if hairstyle in ('bun', 'short', 'long', 'tied'):
        cap = [(0.33, 0.21), (0.24, 0.05), (-0.04, -0.04), (-0.34, 0.06), (-0.47, 0.32), (-0.45, 0.62), (-0.36, 0.84),
               (-0.24, 0.8), (-0.16, 0.66), (-0.155, 0.48), (-0.08, 0.38), (0.04, 0.33), (0.16, 0.28), (0.27, 0.27)]
        if hairstyle == 'short':
            cap = [(0.33, 0.2), (0.24, 0.04), (-0.04, -0.05), (-0.34, 0.05), (-0.46, 0.3), (-0.44, 0.56), (-0.34, 0.74),
                   (-0.22, 0.72), (-0.15, 0.6), (-0.15, 0.44), (-0.06, 0.36), (0.08, 0.3), (0.22, 0.26), (0.3, 0.27)]
        d = smooth_d(h.pts(cap), 5)
        part(C, d, hh, light, u * 0.12, rough='roughf', spread=1.3)
        # strands from forehead toward the back
        for k in range(9):
            t = k / 8
            p0 = h.P(0.3 - t * 0.12, 0.2 + t * 0.03)
            p1 = h.P(0.05 - t * 0.12, 0.02 + t * 0.12)
            p2 = h.P(-0.3 - t * 0.06, 0.15 + t * 0.32)
            C.brush([p0, p1, p2], u * 0.035, hh[0] if k % 3 == 0 else hh[2], 0.45 if k % 3 == 0 else 0.35, tin=0.2, tout=0.5)
        C.brush(h.pts([(0.28, 0.12), (0.05, 0.0), (-0.25, 0.08)]), u * 0.05, hh[0], 0.5 * lit, tin=0.3, tout=0.5,
                extra=f' filter="url(#{C.blur(u*0.012)})"')
        if hairstyle == 'bun':
            bx, by = h.P(-0.47, 0.22)
            part(C, circ(bx, by, u * 0.17), hh, light, u * 0.06, rough='roughf', spread=1.2)
            for k in range(4):
                a0 = k * 1.5
                C.brush([(bx + math.cos(a0) * u * 0.12, by + math.sin(a0) * u * 0.12), (bx + math.cos(a0 + 1) * u * 0.05, by + math.sin(a0 + 1) * u * 0.05),
                         (bx + math.cos(a0 + 2.2) * u * 0.12, by + math.sin(a0 + 2.2) * u * 0.12)], u * 0.025, hh[2], 0.45, tin=0.3, tout=0.3)
        if hairstyle == 'tied':
            p0, p1, p2 = h.P(-0.42, 0.45), h.P(-0.55, 0.75), h.P(-0.5, 1.1)
            C.brush([p0, p1, p2], u * 0.16, hh[1], 1, tin=0.1, tout=0.6, extra=' filter="url(#roughf)"')
            C.brush([p0, p1, p2], u * 0.05, hh[0], 0.4, tin=0.2, tout=0.6)
    elif hairstyle == 'wrap':
        d = smooth_d(h.pts([(0.33, 0.24), (0.28, 0.02), (-0.04, -0.1), (-0.4, 0.0), (-0.56, 0.32), (-0.5, 0.66), (-0.3, 0.74),
                            (-0.17, 0.6), (-0.16, 0.42), (-0.04, 0.34), (0.15, 0.3)]), 5)
        part(C, d, hh, light, u * 0.13, rough='roughf')
        for k in range(5):
            t = k / 4
            C.brush(h.pts([(0.3 - t * 0.1, 0.06 + t * 0.06), (0.0 - t * 0.2, 0.0 + t * 0.2), (-0.35 - t * 0.12, 0.2 + t * 0.35)]),
                    u * 0.025, hh[2], 0.45, tin=0.3, tout=0.3)
    if beard:
        d = smooth_d(h.pts([(-0.06, 0.66), (0.12, 0.84), (0.3, 0.86), (0.4, 0.88), (0.36, 1.0), (0.12, 1.02), (-0.05, 0.9)]), 4)
        part(C, d, beard, light, u * 0.06, rough='roughf')
    return h


# ---------------------------------------------------------------- body pieces
def foot(C, ankle, toe_dir, L, w, cols, light, sole_y=None, flat=True):
    """Side-view bare foot: heel behind the ankle, toes toward toe_dir (+1/-1)."""
    ax, ay = ankle
    gy = sole_y if sole_y is not None else ay + w * 1.1
    s = toe_dir
    pts = [(ax - s * w * 0.55, ay - w * 0.2), (ax - s * w * 0.8, gy - w * 0.35), (ax - s * w * 0.5, gy), (ax + s * L * 0.6, gy + 0.5),
           (ax + s * L * 0.93, gy - w * 0.06), (ax + s * L * 1.0, gy - w * 0.38), (ax + s * L * 0.86, gy - w * 0.68),
           (ax + s * L * 0.5, gy - w * 0.95), (ax + s * w * 0.45, ay + w * 0.1), (ax + s * w * 0.3, ay - w * 0.4)]
    d = smooth_d(pts, 4)
    part(C, d, cols, light, w * 0.35, rough=None)
    # toes hint
    for k in range(3):
        tx = ax + s * L * (0.8 + k * 0.06)
        C.line([(tx, gy - w * 0.45), (tx + s * 1, gy - w * 0.08)], max(w * 0.04, 0.6), cols[2], 0.35)
    C.brush([(ax + s * w * 0.4, ay + w * 0.2), (ax + s * L * 0.5, gy - w * 0.8), (ax + s * L * 0.85, gy - w * 0.6)], w * 0.12, cols[0], 0.45, tin=0.3, tout=0.4)
    # ankle bone
    C.ell(ax + s * w * 0.05, ay + w * 0.05, w * 0.18, w * 0.14, cols[0], 0.45)
    return gy


def shoe(C, ankle, toe_dir, L, w, cols, light, sole_y):
    ax, ay = ankle
    s = toe_dir
    gy = sole_y
    pts = [(ax - s * w * 0.6, ay - w * 0.2), (ax - s * w * 0.8, gy - w * 0.3), (ax - s * w * 0.6, gy), (ax + s * L * 0.95, gy),
           (ax + s * L * 1.02, gy - w * 0.35), (ax + s * L * 0.7, gy - w * 0.62), (ax + s * w * 0.4, ay), (ax + s * w * 0.4, ay - w * 0.3)]
    part(C, smooth_d(pts, 4), cols, light, w * 0.3, rough=None)
    C.line([(ax - s * w * 0.6, gy - 1.5), (ax + s * L * 0.98, gy - 1.5)], max(w * 0.12, 1), cols[2], 0.8)


def hand(C, wrist, ang, s, cols, light, curl=0.0, palm=1, spread=0.12, thumb=1.0):
    """Side-view hand from the wrist pointing at `ang` (limb angle convention).
    curl 0..1 bends the fingers; palm=+1/-1 is the rotation sense of the curl (toward the palm)."""
    hi, mid, lo = cols
    a = math.radians(ang)
    ux, uy = math.sin(a), math.cos(a)
    nx, ny = -uy * palm, ux * palm            # toward the palm side
    wx, wy = wrist

    def P(t, q):
        return (wx + ux * t * s + nx * q * s, wy + uy * t * s + ny * q * s)

    def rot(vx, vy, deg):
        r = math.radians(deg) * palm
        c, si = math.cos(r), math.sin(r)
        return (vx * c - vy * si, vx * si + vy * c)

    # palm
    palm_pts = [P(-0.02, -0.17), P(0.2, -0.2), P(0.48, -0.17), P(0.52, 0.02), P(0.48, 0.2), P(0.22, 0.22), P(-0.02, 0.17)]
    part(C, smooth_d(palm_pts, 4), cols, light, s * 0.1, rough=None, spread=1.2)
    # thumb
    tb = P(0.1, 0.16)
    tv = rot(ux, uy, 35 - curl * 20)
    tm = (tb[0] + tv[0] * s * 0.28, tb[1] + tv[1] * s * 0.28)
    tv2 = rot(ux, uy, 15 - curl * 10)
    te = (tm[0] + tv2[0] * s * 0.22 * thumb, tm[1] + tv2[1] * s * 0.22 * thumb)
    C.brush([tb, tm, te], s * 0.2, lo, 1, tin=0, tout=0.25, wob=0.02, minw=s * 0.1)
    C.brush([tb, tm, te], s * 0.1, mid, 0.85, tin=0.05, tout=0.4)
    for i, (q, L) in enumerate([(0.15, 0.4), (0.05, 0.5), (-0.05, 0.54), (-0.14, 0.45)]):
        b = P(0.4, q)
        fa = (i - 1.5) * spread * 20
        v1 = rot(ux, uy, fa + curl * 35)
        m = (b[0] + v1[0] * L * s * 0.5, b[1] + v1[1] * L * s * 0.5)
        v2 = rot(ux, uy, fa + curl * 90)
        e = (m[0] + v2[0] * L * s * 0.48, m[1] + v2[1] * L * s * 0.48)
        col = lo if i < 3 else mid
        C.brush([b, m, e], s * 0.13, mix(lo, mid, 0.35), 1, tin=0, tout=0.35, wob=0.02, minw=s * 0.06)
        C.brush([(b[0] + light[0] * s * 0.02, b[1] + light[1] * s * 0.02), (m[0] + light[0] * s * 0.02, m[1] + light[1] * s * 0.02),
                 (e[0] + light[0] * s * 0.012, e[1] + light[1] * s * 0.012)], s * 0.08, mid, 0.95, tin=0.05, tout=0.45)
        C.brush([(b[0] + light[0] * s * 0.04, b[1] + light[1] * s * 0.04), (m[0] + light[0] * s * 0.04, m[1] + light[1] * s * 0.04)],
                s * 0.035, hi, 0.55, tin=0.2, tout=0.4)
    C.line([P(0.45, -0.18), P(0.49, 0.0), P(0.45, 0.18)], max(s * 0.02, 0.6), lo, 0.3)


def torso_side(C, pelvis, neck, face, u, cols, light, chest=1.0, belly=0.0, bend=0.0, bust=0.0, rough='roughf', shadow=None):
    """Side-view torso from pelvis (crotch/hip joint centre) to neck base. Front is toward `face`.
    bend shifts the mid spine forward (+) to curve the back (slump)."""
    px, py = pelvis
    nx_, ny_ = neck
    L = math.hypot(nx_ - px, ny_ - py)
    ux, uy = (nx_ - px) / L, (ny_ - py) / L
    # perpendicular toward the front
    fx, fy = (-uy, ux) if face > 0 else (uy, -ux)
    if fx * face < 0:
        fx, fy = -fx, -fy

    def S(t, off):
        b = -bend * 0.55 * max(0.0, math.sin(math.pi * t)) ** 1.5 * u
        return (px + ux * L * t + fx * (off * u + b), py + uy * L * t + fy * (off * u + b))

    front = [(0.0, 0.42), (0.18, 0.5 + belly * 0.3), (0.34, 0.52 + belly * 0.55), (0.5, 0.46 + belly * 0.3), (0.66, 0.5 + bust * 0.35),
             (0.76, 0.56 + bust * 0.4), (0.86, 0.48), (0.97, 0.25), (1.0, 0.2)]
    back = [(1.0, -0.2), (0.95, -0.38), (0.84, -0.5 * chest), (0.7, -0.52 * chest), (0.52, -0.4), (0.38, -0.36), (0.22, -0.46),
            (0.08, -0.56), (-0.06, -0.46), (-0.08, -0.1)]
    pts = [S(t, o) for t, o in front] + [S(t, o) for t, o in back]
    d = smooth_d(pts, 5)
    part(C, d, cols, light, u * 0.32, rough=rough, shadow=shadow, spread=1.3)
    return d, S


def person(C, pelvis, u, face, skin, top, bottom, hair, light=(-0.6, -0.7), lean=0.0, bend=0.0, neck_ang=None,
           tilt=0.0, eyes='closed', hairstyle='bun', arms=((150, 175), (155, 178)), legs=((0, 0), (0, 0)),
           hands=(('open', 0.0), ('open', 0.0)), feet='bare', skirt=None, sleeve=0.55, bust=0.0, belly=0.0,
           far_dim=0.28, dim_col='#1a1426', order=None, lit=1.0, rim=None, shoe_cols=None, chest=1.0, smile=0.0,
           lip='#b85848', beard=None, shadow_ground=None, extra_front=None, feat=None, neck_len=0.26):
    """Side-view figure. Angles are in the limb convention but MIRRORED by `face`: an angle of 90
    points toward where the figure faces. arms/legs = (near, far) each (upper, lower) angle.
    Returns dict of joints."""
    px, py = pelvis

    def A(ang):
        return ang * face

    neck = fk((px, py), A(180 - lean), 2.75 * u)
    neck = (neck[0], neck[1])
    # shoulder joint sits a little behind the front plane, near the top of the spine
    sh = fk((px, py), A(180 - lean + 3), 2.5 * u)
    sh = (sh[0] - face * 0.06 * u + face * bend * 0.35 * u, sh[1] + bend * 0.25 * u)
    neck = (neck[0] + face * bend * 0.8 * u, neck[1] + bend * 0.35 * u)
    J = {'pelvis': pelvis, 'neck': neck, 'sh': sh}
    farcol = lambda cols: tint(cols, dim_col, far_dim)
    farskin = farcol(skin)

    def arm_pts(ang_u, ang_l):
        el = fk(sh, A(ang_u), 1.4 * u)
        wr = fk(el, A(ang_l), 1.2 * u)
        return el, wr

    def leg_pts(ang_u, ang_l):
        hp = (px, py)
        kn = fk(hp, A(ang_u), 1.85 * u)
        an = fk(kn, A(ang_l), 1.7 * u)
        return kn, an

    def sides(front, back, seg_face):
        # tube helper: wa is the +normal side. For a segment drawn with the figure's own facing, the
        # +normal side is the back when face > 0 (see tube_d), so swap accordingly.
        return (back, front) if seg_face > 0 else (front, back)

    def draw_arm(which, cols_s, cols_t):
        ang_u, ang_l = arms[which]
        el, wr = arm_pts(ang_u, ang_l)
        J['elbow' + str(which)], J['wrist' + str(which)] = el, wr
        # upper arm: deltoid, biceps/triceps, narrow elbow
        pts = [lerp(sh, el, -0.06), lerp(sh, el, 0.18), lerp(sh, el, 0.55), el]
        fr = [0.23 * u, 0.235 * u, 0.2 * u, 0.14 * u]
        bk = [0.24 * u, 0.225 * u, 0.18 * u, 0.15 * u]
        wa, wb = sides(fr, bk, face)
        limb(C, pts, wa, cols_s, light, wb=wb, k=0.16 * u, shadow=(u * 0.06, u * 0.08, u * 0.08, 0.25))
        # forearm: bulge near the elbow, slim wrist
        pts = [el, lerp(el, wr, 0.22), lerp(el, wr, 0.6), wr]
        fr = [0.145 * u, 0.18 * u, 0.14 * u, 0.1 * u]
        bk = [0.15 * u, 0.17 * u, 0.125 * u, 0.1 * u]
        wa, wb = sides(fr, bk, face)
        limb(C, pts, wa, cols_s, light, wb=wb, k=0.12 * u)
        # elbow crease
        C.brush([lerp(el, sh, 0.08), el, lerp(el, wr, 0.08)], u * 0.03, cols_s[2], 0.35, tin=0.3, tout=0.3)
        hp_, hc = hands[which][:2]
        hang = A(hands[which][2]) if len(hands[which]) > 2 else A(ang_l)
        sq = hands[which][3] if len(hands[which]) > 3 else None
        if sq:
            phi = math.degrees(math.atan2(math.cos(math.radians(hang)), math.sin(math.radians(hang))))
            C.a(f'<g transform="translate({f(wr[0])} {f(wr[1])}) rotate({f(phi)}) scale(1 {sq}) rotate({f(-phi)}) translate({f(-wr[0])} {f(-wr[1])})">')
        hand(C, wr, hang, 0.78 * u, cols_s, light, curl=hc, palm=-face)
        if sq:
            C.a('</g>')
        if sleeve and cols_t:
            # loose sleeve that hangs from the shoulder and opens at the hem
            se = lerp(sh, el, min(sleeve, 1.0))
            ux_, uy_ = (el[0] - sh[0]), (el[1] - sh[1])
            l_ = math.hypot(ux_, uy_) or 1
            nx_, ny_ = -uy_ / l_, ux_ / l_
            pts = [lerp(sh, el, -0.12), lerp(sh, el, sleeve * 0.45), se]
            limb(C, pts, [0.31 * u, 0.3 * u, 0.28 * u], cols_t, light, k=0.18 * u, cap1=False)
            # sag of the cloth below the arm (gravity is +y)
            sag = (se[0] - nx_ * 0.0, se[1] + 0.06 * u)
            C.brush([lerp(sh, el, sleeve * 0.3), lerp(sh, el, sleeve * 0.75), se], u * 0.05, cols_t[2], 0.45, tin=0.3, tout=0.2)
            C.brush([lerp(sh, el, sleeve * 0.2), lerp(sh, el, sleeve * 0.6)], u * 0.035, cols_t[0], 0.4, tin=0.3, tout=0.4)
            C.line([(se[0] + nx_ * 0.24 * u, se[1] + ny_ * 0.24 * u), (sag[0], sag[1]), (se[0] - nx_ * 0.24 * u, se[1] - ny_ * 0.24 * u)],
                   u * 0.045, cols_t[2], 0.7)

    def draw_leg(which, cols_s, cols_b):
        ang_u, ang_l = legs[which]
        kn, an = leg_pts(ang_u, ang_l)
        J['knee' + str(which)], J['ankle' + str(which)] = kn, an
        hp = (px, py)
        cl = 0.05 * u if cols_b else 0.0   # loose trousers add volume
        cols = cols_b if cols_b else cols_s
        pts = [lerp(hp, kn, -0.05), lerp(hp, kn, 0.35), lerp(hp, kn, 0.82), kn]
        fr = [0.27 * u + cl, 0.265 * u + cl, 0.185 * u + cl, 0.15 * u + cl]
        bk = [0.29 * u + cl, 0.22 * u + cl, 0.16 * u + cl, 0.14 * u + cl]
        wa, wb = sides(fr, bk, face)
        limb(C, pts, wa, cols, light, wb=wb, k=0.2 * u, shadow=(u * 0.06, u * 0.08, u * 0.08, 0.2))
        end = lerp(kn, an, 0.93) if cols_b else an
        pts = [kn, lerp(kn, an, 0.3), lerp(kn, an, 0.7), end]
        fr = [0.14 * u + cl, 0.13 * u + cl, 0.1 * u + cl, 0.08 * u + cl * 1.3]
        bk = [0.13 * u + cl, 0.2 * u + cl * 0.6, 0.11 * u + cl, 0.075 * u + cl * 1.3]
        wa, wb = sides(fr, bk, face)
        if cols_b:  # bare ankle under the trouser hem
            limb(C, [lerp(kn, an, 0.85), an], [0.075 * u, 0.07 * u], cols_s, light, sheen=False)
        limb(C, pts, wa, cols, light, wb=wb, k=0.14 * u)
        # kneecap light and shin line
        C.ell(kn[0] + face * 0.1 * u, kn[1], 0.08 * u, 0.1 * u, cols[0], 0.35, f' filter="url(#{C.blur(u*0.03)})"')
        if cols_b:
            # folds gathering behind the knee and at the hem
            for k in range(3):
                t = 0.1 + k * 0.08
                p0 = lerp(kn, an, t)
                C.brush([(p0[0] - face * 0.14 * u, p0[1] - 0.04 * u), (p0[0], p0[1] + 0.02 * u), (p0[0] + face * 0.1 * u, p0[1] - 0.05 * u)],
                        u * 0.035, cols[2], 0.4, tin=0.3, tout=0.3)
            hm = end
            C.line([(hm[0] - 0.13 * u, hm[1]), (hm[0] + 0.13 * u, hm[1] + 0.01 * u)], u * 0.05, cols[2], 0.6)
            C.brush([lerp(hp, kn, 0.2), lerp(hp, kn, 0.6), lerp(kn, an, 0.05)], u * 0.035, cols[2], 0.3, tin=0.4, tout=0.4)
        if feet == 'bare':
            foot(C, an, face, 0.95 * u, 0.3 * u, cols_s, light, sole_y=an[1] + 0.27 * u)
        elif feet == 'shoe':
            shoe(C, an, face, 0.95 * u, 0.32 * u, shoe_cols or ('#6a5048', '#3a2a24', '#140c0a'), light, an[1] + 0.27 * u)
        elif feet == 'dangle':
            # foot hanging, toes pointing down
            g = C.id('x')
            C.a(f'<g transform="rotate({f(62*face)} {f(an[0])} {f(an[1])})">')
            foot(C, an, face, 0.95 * u, 0.3 * u, cols_s, light, sole_y=an[1] + 0.27 * u)
            C.a('</g>')

    order = order or (['farleg', 'nearleg', 'fararm', 'torso', 'neararm', 'head'] if skirt else ['farleg', 'fararm', 'torso', 'nearleg', 'neararm', 'head'])
    if skirt and 'nearleg' in order and order.index('nearleg') > order.index('torso'):
        order = [o for o in order if o != 'nearleg']
        order.insert(order.index('torso'), 'nearleg')
    for step in order:
        if step == 'fararm':
            draw_arm(1, farskin, farcol(top) if top else None)
        elif step == 'farleg':
            draw_leg(1, farskin, farcol(bottom) if bottom else None)
        elif step == 'nearleg':
            draw_leg(0, skin, bottom)
        elif step == 'neararm':
            draw_arm(0, skin, top)
        elif step == 'torso':
            d, S = torso_side(C, (px, py), neck, face, u, top, light, bend=bend, bust=bust, belly=belly, chest=chest,
                              shadow=(u * 0.08, u * 0.1, u * 0.12, 0.3))
            J['S'] = S
            # cloth folds: a few long strokes from the chest toward the waist, and light on the front plane
            for k in range(3):
                q = -0.25 + k * 0.28
                C.brush([S(0.8, q), S(0.6, q * 0.8 + 0.05), S(0.42, q * 0.6 + 0.08)], u * 0.07, top[2], 0.28, tin=0.4, tout=0.5)
                C.brush([S(0.78, q + 0.08), S(0.6, q * 0.8 + 0.12)], u * 0.04, top[0], 0.25, tin=0.4, tout=0.5)
            C.brush([S(0.3, 0.42), S(0.55, 0.38), S(0.8, 0.45)], u * 0.08, top[0], 0.3, tin=0.3, tout=0.4,
                    extra=f' filter="url(#{C.blur(u*0.03)})"')
            if skirt:
                hem_y, flare, scol = skirt
                t0 = S(0.42, 0.55)
                t1 = S(0.42, -0.55)
                kn = fk((px, py), A(legs[0][0]), 1.85 * u)
                hem = kn[1] + hem_y * u
                pts = [t0, (t0[0] + face * flare * u * 0.6, (t0[1] + hem) / 2), (t0[0] + face * flare * u, hem),
                       (t1[0] - face * flare * u, hem + 0.05 * u), (t1[0] - face * flare * 0.4 * u, (t1[1] + hem) / 2), t1]
                part(C, smooth_d(pts, 4), scol, light, u * 0.35, shadow=(u * 0.06, u * 0.1, u * 0.1, 0.25))
                # folds
                for k in range(4):
                    x0 = lerp(t1, t0, 0.15 + k * 0.23)
                    C.brush([x0, (x0[0] + face * (k - 1.5) * u * 0.08, (x0[1] + hem) / 2), (x0[0] + face * (k - 1.5) * u * 0.18, hem - 4)],
                            u * 0.06, scol[2], 0.35, tin=0.4, tout=0.2)
                    C.brush([(x0[0] + u * 0.06, x0[1] + u * 0.3), (x0[0] + face * (k - 1.5) * u * 0.08 + u * 0.06, (x0[1] + hem) / 2)],
                            u * 0.035, scol[0], 0.3, tin=0.4, tout=0.4)
            # neckline skin
            nb = S(0.98, 0.05)
        elif step == 'head':
            nk = neck
            hd_ang = neck_ang if neck_ang is not None else (180 - lean + tilt * 0.4 - bend * 25)
            ntop = fk(nk, A(hd_ang), neck_len * u)
            # neck tube
            limb(C, [(nk[0] - face * 0.05 * u, nk[1] + 0.12 * u), ntop], [0.21 * u, 0.19 * u], skin, light, sheen=False,
                 shadow=(u * 0.04, u * 0.05, u * 0.05, 0.25))
            # collar
            S = J['S']
            # head: tilt measured relative to upright
            h = head(C, ntop[0] + face * 0.02 * u, ntop[1] + 0.05 * u, u, skin, hair, face=face,
                     tilt=tilt - lean - bend * 25, eyes=eyes, hairstyle=hairstyle, light=light, lit=lit, rim=rim, smile=smile,
                     lip=lip, beard=beard, feat=feat)
            J['head'] = h
        elif callable(step):
            step(J)
    return J
