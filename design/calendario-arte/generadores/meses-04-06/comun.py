"""Shared helpers for the Diseño 2 illustrations of months 10-12."""
import math, os, re, sys, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pinta import *  # noqa

SKINS = {
    'light': ('#ffe2c4', '#e8b48a', '#8a5236'),
    'olive': ('#f6cf9e', '#c99062', '#6a3c20'),
    'brown': ('#e2a46e', '#a8683a', '#4a2410'),
    'dark': ('#c48a5a', '#7a4422', '#2a1206'),
}


def circ(cx, cy, R):
    return f"M{f(cx-R)} {f(cy)}A{f(R)} {f(R)} 0 1 0 {f(cx+R)} {f(cy)}A{f(R)} {f(R)} 0 1 0 {f(cx-R)} {f(cy)}Z"


def ellp(cx, cy, rx, ry):
    return f"M{f(cx-rx)} {f(cy)}A{f(rx)} {f(ry)} 0 1 0 {f(cx+rx)} {f(cy)}A{f(rx)} {f(ry)} 0 1 0 {f(cx-rx)} {f(cy)}Z"


def bbox(pts, pad=0):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return (min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad)


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def ball(C, cx, cy, R, hi, mid, lo, deep=None, k=None, rough='roughf', light=(-0.6, -0.7)):
    return C.shaded(circ(cx, cy, R), hi, mid, lo, (cx - R, cy - R, cx + R, cy + R), light=light, k=k or R * 0.28,
                    deep=deep, spread=1.3, hipos=0.4, rough=rough)


def blob(C, pts, hi, mid, lo, light=(-0.6, -0.7), k=None, deep=None, rough='roughf', n=5, shadow=None, hl=True, spread=1.5):
    d = smooth_d(pts, n)
    bb = bbox(pts)
    if shadow:
        dx, dy, sd, op = shadow
        C.path(d, '#120a14', op, f' transform="translate({dx} {dy})" filter="url(#{C.blur(sd)})"')
    return C.shaded(d, hi, mid, lo, bb, light=light, k=k, deep=deep, rough=rough, hl=hl, spread=spread)


def hand(C, x, y, s, ang, skin, fingers=4, spread=0.5, curl=0.0):
    """Small painted hand: palm + tapered fingers pointing at `ang` degrees."""
    hi, mid, lo = skin
    a = math.radians(ang)
    ux, uy = math.cos(a), math.sin(a)
    nx, ny = -uy, ux
    # fingers
    for i in range(fingers):
        t = (i - (fingers - 1) / 2) / max(1, fingers - 1)
        fa = a + t * spread
        L = s * (1.0 - abs(t) * 0.25)
        bx, by = x + ux * s * 0.35 + nx * t * s * 0.55, y + uy * s * 0.35 + ny * t * s * 0.55
        ex, ey = bx + math.cos(fa + curl) * L, by + math.sin(fa + curl) * L
        mx, my = (bx + ex) / 2 + nx * curl * s * 0.3, (by + ey) / 2 + ny * curl * s * 0.3
        C.brush([(bx, by), (mx, my), (ex, ey)], s * 0.3, lo, 1, tin=0, tout=0.25, wob=0.02, minw=s * 0.1)
        C.brush([(bx - 0.6, by - 0.8), (mx - 0.6, my - 0.8), (ex - 0.6, ey - 0.8)], s * 0.16, hi, 0.85, tin=0.05, tout=0.4, wob=0.02)
    # palm
    C.ell(x, y, s * 0.55, s * 0.45, lo, 1, f' transform="rotate({f(ang)} {f(x)} {f(y)})"')
    C.ell(x - 0.8, y - 1, s * 0.42, s * 0.32, mid, 1, f' transform="rotate({f(ang)} {f(x)} {f(y)})"')
    C.ell(x - 1.5, y - 2, s * 0.2, s * 0.14, hi, 0.8, f' transform="rotate({f(ang)} {f(x)} {f(y)})"')
    # thumb
    tx, ty = x - nx * s * 0.45, y - ny * s * 0.45
    ex, ey = tx + math.cos(a - 0.9) * s * 0.6, ty + math.sin(a - 0.9) * s * 0.6
    C.brush([(x, y), (tx, ty), (ex, ey)], s * 0.32, lo, 1, tin=0, tout=0.3, wob=0.02, minw=s * 0.1)
    C.brush([(x - 0.6, y - 0.8), (tx - 0.6, ty - 0.8), (ex - 0.6, ey - 0.8)], s * 0.14, hi, 0.8, tin=0.1, tout=0.4)


def hand2(C, x, y, s, ang, skin, thumb=1, grip=0.0):
    """Painted hand with palm, four separate fingers and a thumb. Wrist at (x, y),
    fingers pointing at `ang` degrees; thumb=+1/-1 picks the side; grip curls the fingers."""
    hi, mid, lo = skin
    C.a(f'<g transform="translate({f(x)} {f(y)}) rotate({f(ang)})">')
    C.ell(s * 0.6, s * 0.14, s * 0.7, s * 0.32, '#140a08', 0.28, f' filter="url(#{C.blur(s*0.12)})"')
    # thumb (behind the palm on its side)
    tp = [(s * 0.1, -thumb * s * 0.18), (s * 0.4, -thumb * s * 0.4), (s * 0.66, -thumb * s * (0.34 - grip * 0.2))]
    C.brush(tp, s * 0.22, lo, 1, tin=0, tout=0.2, wob=0.02, minw=s * 0.12)
    C.brush([(px - s * 0.02, py - s * 0.03) for px, py in tp], s * 0.09, hi, 0.7, tin=0.1, tout=0.4)
    # palm
    palm = smooth_d([(0, -s * 0.2), (s * 0.3, -s * 0.27), (s * 0.55, -s * 0.24), (s * 0.58, s * 0.2), (s * 0.3, s * 0.27), (0, s * 0.2)], 4)
    C.shaded(palm, hi, mid, lo, (0, -s * 0.27, s * 0.58, s * 0.27), light=(-0.5, -0.8), k=s * 0.1, rough=None, spread=1.2)
    # fingers, far ones first
    for (yo, L) in [(0.18, 0.4), (0.06, 0.52), (-0.065, 0.56), (-0.19, 0.47)]:
        L *= s
        p0 = (s * 0.5, yo * s)
        p1 = (s * 0.5 + L * 0.55, yo * s * 1.05 + grip * L * 0.22)
        p2 = (s * 0.5 + L * (1 - grip * 0.4), yo * s * 1.1 + grip * L * 0.62)
        C.brush([p0, p1, p2], s * 0.17, lo, 1, tin=0, tout=0.12, wob=0.02, minw=s * 0.1)
        C.brush([(p0[0], p0[1] - s * 0.03), (p1[0], p1[1] - s * 0.035), (p2[0] - s * 0.04, p2[1] - s * 0.035)], s * 0.075, hi, 0.75, tin=0.05, tout=0.35)
        C.ell(p0[0] + s * 0.02, p0[1] - s * 0.02, s * 0.05, s * 0.035, hi, 0.6)
    C.a('</g>')


def taper_d(pts, w0, w1, n=6):
    """Closed outline of a tube along pts whose width goes from w0 to w1."""
    dense = catmull(pts, n)
    cum = [0]
    for k in range(1, len(dense)):
        cum.append(cum[-1] + math.hypot(dense[k][0] - dense[k - 1][0], dense[k][1] - dense[k - 1][1]))
    tot = cum[-1] or 1
    L, R = [], []
    for k, (x, y) in enumerate(dense):
        a = dense[max(k - 1, 0)]
        b = dense[min(k + 1, len(dense) - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        l = math.hypot(tx, ty) or 1
        nx, ny = -ty / l, tx / l
        w = (w0 + (w1 - w0) * cum[k] / tot) / 2
        L.append((x + nx * w, y + ny * w))
        R.append((x - nx * w, y - ny * w))
    return poly_d(L + R[::-1])


def arm(C, pts, w, hi, lo, deep='#140a10', skin=None):
    """Sleeved arm that narrows from shoulder (w) to wrist (0.7w), with an elbow fold.
    pts = shoulder, elbow, wrist. With `skin`, the last 7 px are a bare wrist."""
    x1, y1 = pts[-1]
    x0, y0 = pts[-2]
    L = math.hypot(x1 - x0, y1 - y0) or 1
    ux, uy = (x1 - x0) / L, (y1 - y0) / L
    cut = 7 if skin else 0
    sl = list(pts[:-1]) + [(x1 - ux * cut, y1 - uy * cut)]
    if skin:
        C.brush([(x1 - ux * (cut + 3), y1 - uy * (cut + 3)), (x1 + ux * 2, y1 + uy * 2)], w * 0.5, skin[1], 1, tin=0, tout=0, wob=0, minw=w * 0.45)
        C.brush([(x1 - ux * (cut + 3) - 0.6, y1 - uy * (cut + 3) - 0.8), (x1 + ux * 2 - 0.6, y1 + uy * 2 - 0.8)], w * 0.18, skin[0], 0.6, tin=0, tout=0.2)
    d = taper_d(sl, w, w * 0.7)
    C.path(d, '#140a10', 0.28, f' transform="translate(5 7)" filter="url(#{C.blur(5)})"')
    C.shaded(d, hi, lo, deep, bbox(sl, w / 2), light=(-0.6, -0.7), k=w * 0.33, deep=deep, rough='roughf')
    C.brush([(x - w * 0.15, y - w * 0.2) for x, y in sl], w * 0.18, hi, 0.4, tin=0.15, tout=0.3)
    # elbow fold
    if len(pts) >= 3:
        ex, ey = pts[1]
        C.brush([(ex - w * 0.25, ey - w * 0.1), (ex, ey + w * 0.08), (ex + w * 0.22, ey - w * 0.05)], w * 0.12, lo, 0.5, tin=0.3, tout=0.3)
        C.brush([(ex - w * 0.15, ey + w * 0.2), (ex + w * 0.1, ey + w * 0.24)], w * 0.08, deep, 0.4, tin=0.3, tout=0.3)
    # cuff
    cx, cy = sl[-1]
    C.ell(cx, cy, w * 0.13, w * 0.38, lo, 0.9, f' transform="rotate({f(math.degrees(math.atan2(uy, ux)))} {f(cx)} {f(cy)})"')


def head(C, cx, cy, r, skin, hair, facing=0.0, hairstyle='short', lit=1.0, tilt=None):
    """Serene painted head: jaw and chin, ears, closed eyes, soft nose and lips, hair with locks."""
    hi, mid, lo = skin
    hh = hair
    if tilt is None:
        tilt = C.r.uniform(-8, 8)
    rx = r * 0.84
    C.a(f'<g transform="rotate({f(tilt)} {f(cx)} {f(cy + r)})">')
    sh = facing * r * 0.12  # jaw shifts toward where the face looks
    # back hair mass
    if hairstyle == 'long':
        d = smooth_d([(cx - rx * 1.12, cy - r * 0.2), (cx - rx * 1.15, cy + r * 1.15), (cx - rx * 0.4, cy + r * 1.3), (cx, cy + r * 0.9),
                      (cx + rx * 0.4, cy + r * 1.3), (cx + rx * 1.15, cy + r * 1.15), (cx + rx * 1.12, cy - r * 0.2), (cx, cy - r * 1.2)], 5)
        C.shaded(d, hh[0], hh[1], hh[2], (cx - rx * 1.2, cy - r * 1.2, cx + rx * 1.2, cy + r * 1.3), k=r * 0.3, rough='roughf')
    elif hairstyle == 'bun':
        ball(C, cx - facing * r * 0.7, cy - r * 0.85, r * 0.4, hh[0], hh[1], hh[2], k=r * 0.12, rough='roughf')
    # neck with shadow under the jaw
    C.path(f"M{f(cx-r*0.3)} {f(cy+r*0.55)}C{f(cx-r*0.3)} {f(cy+r*0.9)} {f(cx-r*0.38)} {f(cy+r*1.2)} {f(cx-r*0.46)} {f(cy+r*1.4)}"
           f"L{f(cx+r*0.46)} {f(cy+r*1.4)}C{f(cx+r*0.38)} {f(cy+r*1.2)} {f(cx+r*0.3)} {f(cy+r*0.9)} {f(cx+r*0.3)} {f(cy+r*0.55)}Z", mid)
    C.path(f"M{f(cx-r*0.3)} {f(cy+r*0.7)}Q{f(cx+sh)} {f(cy+r*1.12)} {f(cx+r*0.3)} {f(cy+r*0.7)}L{f(cx+r*0.3)} {f(cy+r*0.95)}Q{f(cx)} {f(cy+r*1.2)} {f(cx-r*0.3)} {f(cy+r*0.95)}Z", lo, 0.55)
    # ears (both when frontal, the far side hides as the head turns)
    for side in (-1, 1):
        if side * facing > 0.45:
            continue
        ex = cx + side * rx * 0.97 - facing * r * 0.08
        C.ell(ex, cy + r * 0.08, r * 0.15, r * 0.25, mid)
        C.ell(ex + side * r * 0.02, cy + r * 0.08, r * 0.07, r * 0.14, lo, 0.55)
    # face with cheekbones, jaw and chin
    face = smooth_d([(cx, cy - r), (cx + rx * 0.8, cy - r * 0.72), (cx + rx * 0.98, cy - r * 0.12), (cx + rx * 0.9 + sh * 0.3, cy + r * 0.12),
                     (cx + rx * 0.62 + sh, cy + r * 0.68), (cx + rx * 0.22 + sh, cy + r), (cx - rx * 0.22 + sh, cy + r),
                     (cx - rx * 0.62 + sh, cy + r * 0.68), (cx - rx * 0.9 + sh * 0.3, cy + r * 0.12), (cx - rx * 0.98, cy - r * 0.12), (cx - rx * 0.8, cy - r * 0.72)], 5)
    C.shaded(face, hi, mid, lo, (cx - rx, cy - r, cx + rx, cy + r), light=(-0.6, -0.6), k=r * 0.3, deep=lo, spread=1.35, hipos=0.35, rough=None)
    fx = cx + facing * r * 0.3
    # cheekbone light and temple shadow
    C.ell(fx - r * 0.38, cy + r * 0.12, r * 0.22, r * 0.12, hi, 0.35, f' filter="url(#{C.blur(r*0.08)})"')
    C.ell(cx + rx * 0.72, cy + r * 0.3, r * 0.18, r * 0.35, lo, 0.3, f' filter="url(#{C.blur(r*0.1)})"')
    # closed eyes: shaded lids, lash line, soft brows
    ey = cy + r * 0.02
    for side in (-1, 1):
        w = r * 0.22 * (1 - side * facing * 0.35)
        x = fx + side * r * 0.33 * (1 - side * facing * 0.3)
        C.ell(x, ey - r * 0.05, w * 1.05, r * 0.12, lo, 0.4, f' filter="url(#{C.blur(r*0.05)})"')
        C.ell(x - r * 0.02, ey - r * 0.06, w * 0.6, r * 0.05, hi, 0.45)
        C.a(f'<path d="M{f(x-w)} {f(ey)}Q{f(x)} {f(ey+r*0.11)} {f(x+w)} {f(ey-r*0.01)}" fill="none" stroke="#3a1c10" stroke-width="{f(max(r*0.05,0.8))}" stroke-linecap="round" opacity="0.8"/>')
        C.a(f'<path d="M{f(x-w*1.05)} {f(ey-r*0.22)}Q{f(x)} {f(ey-r*0.31)} {f(x+w*1.1)} {f(ey-r*0.2)}" fill="none" stroke="{hh[2]}" stroke-width="{f(max(r*0.06,0.8))}" stroke-linecap="round" opacity="0.5"/>')
    # nose: bridge light, side shadow, nostril
    nx = fx + facing * r * 0.06
    C.brush([(nx - r * 0.03, ey - r * 0.1), (nx - r * 0.04, cy + r * 0.2), (nx - r * 0.02, cy + r * 0.32)], r * 0.07, hi, 0.45, tin=0.3, tout=0.3)
    C.a(f'<path d="M{f(nx+r*0.06)} {f(ey+r*0.05)}Q{f(nx+facing*r*0.12+r*0.1)} {f(cy+r*0.3)} {f(nx+r*0.02)} {f(cy+r*0.38)}" fill="none" stroke="{lo}" stroke-width="{f(max(r*0.06,0.8))}" stroke-linecap="round" opacity="0.55"/>')
    C.ell(nx - r * 0.06, cy + r * 0.38, r * 0.05, r * 0.025, lo, 0.6)
    # lips: upper shadow line, lower lip light
    my = cy + r * 0.57
    C.a(f'<path d="M{f(fx-r*0.17)} {f(my)}Q{f(fx)} {f(my+r*0.06)} {f(fx+r*0.17)} {f(my-r*0.01)}" fill="none" stroke="#7a3226" stroke-width="{f(max(r*0.055,0.8))}" stroke-linecap="round" opacity="0.7"/>')
    C.ell(fx, my + r * 0.07, r * 0.11, r * 0.04, '#e89a88', 0.5)
    C.ell(fx, cy + r * 0.86, r * 0.12, r * 0.05, hi, 0.35)
    for side in (-1, 1):
        C.ell(fx + side * r * 0.44, cy + r * 0.34, r * 0.17, r * 0.1, '#e8705a', 0.16 * lit, f' filter="url(#{C.blur(r*0.08)})"')
    # hair cap plus locks breaking the outline
    if hairstyle in ('short', 'bun', 'long'):
        d = smooth_d([(cx - rx * 1.06, cy + r * 0.05), (cx - rx * 1.04, cy - r * 0.62), (cx - facing * r * 0.2, cy - r * 1.14),
                      (cx + rx * 1.04, cy - r * 0.62), (cx + rx * 1.06, cy + r * 0.05), (cx + rx * 0.88 - facing * r * 0.3, cy - r * 0.32),
                      (fx + r * 0.25, cy - r * 0.55), (fx - r * 0.1, cy - r * 0.47), (fx - r * 0.4, cy - r * 0.56), (cx - rx * 0.88 - facing * r * 0.3, cy - r * 0.3)], 5)
        C.shaded(d, hh[0], hh[1], hh[2], (cx - rx * 1.1, cy - r * 1.15, cx + rx * 1.1, cy + r * 0.1), k=r * 0.25, rough='roughf', hl=True)
        for k in range(7):
            a = math.radians(-170 + k * 27 + C.r.uniform(-8, 8))
            bx, by = cx + math.cos(a) * rx * 0.75, cy - r * 0.15 + math.sin(a) * r * 0.85
            ex, ey2 = cx + math.cos(a) * rx * (1.12 + C.r.uniform(0, 0.1)), cy - r * 0.15 + math.sin(a) * r * (1.05 + C.r.uniform(0, 0.12))
            mx, my2 = (bx + ex) / 2 + math.sin(a) * r * 0.12, (by + ey2) / 2 - math.cos(a) * r * 0.12
            C.brush([(bx, by), (mx, my2), (ex, ey2)], r * 0.14, hh[1], 0.95, tin=0.1, tout=0.7)
            C.brush([(bx, by), (mx, my2)], r * 0.05, hh[0], 0.6, tin=0.2, tout=0.6)
        for k in range(4):
            x0 = fx - r * 0.45 + k * r * 0.3
            C.brush([(x0, cy - r * 0.95), (x0 + r * 0.12, cy - r * 0.72), (x0 + r * 0.18, cy - r * 0.5)], r * 0.07, hh[0], 0.5, tin=0.2, tout=0.5)
    elif hairstyle == 'wrap':  # head scarf with knot and folds
        d = smooth_d([(cx - rx * 1.12, cy + r * 0.25), (cx - rx * 1.12, cy - r * 0.7), (cx, cy - r * 1.24),
                      (cx + rx * 1.12, cy - r * 0.7), (cx + rx * 1.12, cy + r * 0.25), (cx + rx * 0.82, cy - r * 0.4), (cx, cy - r * 0.5), (cx - rx * 0.82, cy - r * 0.4)], 5)
        C.shaded(d, hh[0], hh[1], hh[2], (cx - rx * 1.2, cy - r * 1.25, cx + rx * 1.2, cy + r * 0.25), k=r * 0.28, rough='roughf')
        for k in range(4):
            C.brush([(cx - rx * 0.9 + k * rx * 0.55, cy - r * 1.02), (cx - rx * 0.75 + k * rx * 0.5, cy - r * 0.7), (cx - rx * 0.7 + k * rx * 0.45, cy - r * 0.45)], r * 0.07, hh[2], 0.5, tin=0.2, tout=0.3)
        ball(C, cx - facing * rx * 0.9 + rx * 0.2, cy - r * 1.0, r * 0.22, hh[0], hh[1], hh[2], k=r * 0.07, rough=None)
    C.a('</g>')


def torso(C, x, y, h, w, cloth, light=(-0.6, -0.7), skin=None, band=None):
    """Upper body with sloping shoulders, a round neckline and folds toward the waist.
    (x, y) is the bottom centre, h the height up to the base of the neck."""
    hi, mid, lo = cloth
    d = (f"M{f(x-w)} {f(y)}C{f(x-w*1.02)} {f(y-h*0.4)} {f(x-w*1.04)} {f(y-h*0.7)} {f(x-w*0.95)} {f(y-h*0.86)}"
         f"C{f(x-w*0.7)} {f(y-h*0.95)} {f(x-w*0.4)} {f(y-h*0.96)} {f(x-w*0.22)} {f(y-h)}"
         f"L{f(x+w*0.22)} {f(y-h)}C{f(x+w*0.4)} {f(y-h*0.96)} {f(x+w*0.7)} {f(y-h*0.95)} {f(x+w*0.95)} {f(y-h*0.86)}"
         f"C{f(x+w*1.04)} {f(y-h*0.7)} {f(x+w*1.02)} {f(y-h*0.4)} {f(x+w)} {f(y)}Z")
    C.shaded(d, hi, mid, lo, (x - w, y - h, x + w, y), light=light, k=w * 0.4, deep='#140a14')
    # neckline
    if skin:
        C.ell(x, y - h + h * 0.02, w * 0.3, h * 0.12, skin[1])
        C.ell(x, y - h + h * 0.06, w * 0.24, h * 0.06, skin[2], 0.35)
    C.a(f'<path d="M{f(x-w*0.32)} {f(y-h)}Q{f(x)} {f(y-h+h*0.2)} {f(x+w*0.32)} {f(y-h)}" fill="none" stroke="{lo}" stroke-width="{f(max(w*0.06,1))}" opacity="0.7"/>')
    # three folds converging toward the waist
    wx, wy = x + w * 0.05, y - h * 0.32
    for (sx, sy) in [(x - w * 0.62, y - h * 0.8), (x + w * 0.1, y - h * 0.84), (x + w * 0.66, y - h * 0.78)]:
        mx, my = (sx + wx) / 2 + (wx - sx) * 0.1, (sy + wy) / 2
        C.brush([(sx, sy), (mx, my), (wx + (sx - wx) * 0.15, wy)], w * 0.09, lo, 0.4, tin=0.3, tout=0.6)
        C.brush([(sx - w * 0.06, sy + 2), (mx - w * 0.06, my)], w * 0.05, hi, 0.35, tin=0.3, tout=0.6)
    if band:  # embroidered band of small rhombi in one accent colour
        by = y - h * 0.62
        n = 6
        for k in range(n):
            bx = x - w * 0.75 + (k + 0.5) * w * 1.5 / n
            C.diamond(bx, by, w * 0.2, w * 0.24, band[0], band[1], op=0.85)
        C.line([(x - w * 0.85, by - w * 0.16), (x + w * 0.85, by - w * 0.16)], max(w * 0.03, 0.8), band[0], 0.5)
        C.line([(x - w * 0.85, by + w * 0.16), (x + w * 0.85, by + w * 0.16)], max(w * 0.03, 0.8), band[0], 0.5)


def leaf_d(x, y, L, w, ang):
    a = math.radians(ang)
    ux, uy = math.cos(a), math.sin(a)
    nx, ny = -uy, ux
    tx, ty = ux * L, uy * L
    mx, my = tx * 0.5, ty * 0.5
    return (f"M{f(x)} {f(y)}q{f(mx+nx*w)} {f(my+ny*w)} {f(tx)} {f(ty)}"
            f"q{f(mx-tx-nx*w)} {f(my-ty-ny*w)} {f(-tx)} {f(-ty)}z")


def foliage(C, masses, cols, n_per, angles, L=(10, 18), wid=(2.5, 4), dark_from=None, dark_cols=None, loose=0.12, under=True, under_scale=0.82, under_op=0.9):
    """Painterly crown made of many leaf strokes. masses: (cx, cy, rx, ry); cols: light..shadow list.
    Leaves are grouped by colour to keep the file small."""
    rng = C.r
    groups = {}
    for (cx, cy, rx, ry) in masses:
        darkside = dark_from is not None and cx > dark_from
        cl = dark_cols if darkside else cols
        if under:
            pts = []
            for k in range(14):
                a = k / 14 * math.tau
                rr = rng.uniform(under_scale - 0.1, under_scale + 0.1)
                pts.append((cx + math.cos(a) * rx * rr, cy + math.sin(a) * ry * rr))
            C.path(smooth_d(pts, 4), cl[-1], under_op, ' filter="url(#rough)"')
            C.path(smooth_d([(px - rx * 0.12, py - ry * 0.15) for px, py in pts], 4), cl[len(cl) // 2], 0.45, f' filter="url(#{C.blur(rx*0.12)})"')
        for k in range(n_per):
            a = rng.uniform(0, math.tau)
            rr = math.sqrt(rng.uniform(0, 1)) * (1 + loose if rng.random() < 0.15 else 1)
            x = cx + math.cos(a) * rr * rx
            y = cy + math.sin(a) * rr * ry
            lv = -(x - cx) / rx * 0.55 - (y - cy) / ry * 0.65 + rng.uniform(-0.35, 0.35)
            idx = 0 if lv > 0.55 else 1 if lv > 0.0 else 2 if lv > -0.5 else len(cl) - 1
            idx = min(idx, len(cl) - 1)
            ang = rng.choice(angles) + rng.uniform(-14, 14)
            groups.setdefault(cl[idx], []).append(leaf_d(x, y, rng.uniform(*L), rng.uniform(*wid), ang))
    for col, ds in groups.items():
        C.a(f'<path fill="{col}" d="{"".join(ds)}"/>')


def legs(C, x, yf, h, skin, cloth, front=0.0, trousers=None):
    """Two legs below a knee-length tunic, with feet, for a standing figure.
    yf is the floor; h the full figure height; front shifts one foot forward."""
    lw = h * 0.07
    knee = yf - h * 0.27
    C.ell(x + 6, yf + 1, h * 0.16, h * 0.025, '#140a08', 0.6, f' filter="url(#{C.blur(2)})"')
    col = trousers or (skin[1], skin[2], skin[0])
    for side in (-1, 1):
        lx = x + side * h * 0.055
        fx_ = lx + side * h * 0.012 + (front * h * 0.04 if side > 0 else 0)
        d = taper_d([(lx, knee), (lx + side * 1, (knee + yf) / 2), (fx_, yf - h * 0.03)], lw, lw * 0.75)
        C.shaded(d, col[2] if trousers else skin[0], col[0] if trousers else skin[1], col[1] if trousers else skin[2],
                 (lx - lw, knee, lx + lw, yf), light=(-0.6, -0.6), k=lw * 0.3, rough=None)
        # foot pointing slightly outward / forward
        fl = h * 0.1
        dir_ = 1 if side > 0 else -0.35
        foot = smooth_d([(fx_ - lw * 0.5, yf - h * 0.035), (fx_ + dir_ * fl * 0.8, yf - h * 0.02), (fx_ + dir_ * fl, yf - 1), (fx_ - lw * 0.55, yf)], 3)
        C.shaded(foot, '#a87a50', '#6a4428', '#2a160a', (fx_ - lw, yf - h * 0.04, fx_ + fl, yf), light=(-0.6, -0.7), k=2, rough=None)


def finish(C, out_svg, out_png):
    s = C.svg()
    open(out_svg, 'w').write(s)
    subprocess.run(['rsvg-convert', '-w', '1485', out_svg, '-o', out_png], check=True)
    bad = [k for k in ('<text', '<image', '<script', 'font-family', '@import', 'http://', 'https://') if k in s.replace('xmlns="http://www.w3.org/2000/svg"', '')]
    ext = re.findall(r'href="(?!#)[^"]*"', s)
    import xml.dom.minidom
    xml.dom.minidom.parseString(s)
    root = re.match(r'<svg[^>]*>', s).group(0)
    print('kB', round(os.path.getsize(out_svg) / 1024, 1), 'bad', bad, 'exthref', ext, 'root_wh', ('width=' in root or 'height=' in root))
