"""Shared helpers for Diseño 3: large painted figures (profile heads, 3/4 heads, cupped hands)."""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pinta import *  # noqa
from comun import circ, ellp, bbox, ball, blob, taper_d, leaf_d, finish  # noqa

OUT_SVG = '/home/claude/humanity-wiki/design/calendario-arte/ilustraciones-fuente/mes-{:02d}-c.svg'
OUT_PNG = '/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos3/mes-{:02d}-c.png'


def S(pts, r, ox=0, oy=0):
    return [(ox + x * r, oy + y * r) for x, y in pts]


def stroke(C, d, col, w, op=1, extra=''):
    o = f' opacity="{round(op,2)}"' if op != 1 else ''
    C.a(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{f(w)}" stroke-linecap="round" stroke-linejoin="round"{o}{extra}/>')


# ---------------------------------------------------------------- profile head
HEAD_PTS = [(-0.10, -1.00), (0.36, -0.92), (0.56, -0.76), (0.67, -0.50), (0.71, -0.28), (0.72, -0.19), (0.68, -0.10),
            (0.75, 0.03), (0.84, 0.16), (0.86, 0.22), (0.82, 0.26), (0.75, 0.28), (0.76, 0.36), (0.78, 0.41),
            (0.73, 0.46), (0.76, 0.52), (0.73, 0.58), (0.67, 0.63), (0.70, 0.71), (0.70, 0.79), (0.62, 0.87),
            (0.40, 0.90), (0.12, 0.76), (-0.22, 0.58), (-0.60, 0.32), (-0.80, -0.12), (-0.70, -0.62)]


def profile_head(C, r, skin, hair, light=(0.8, -0.5), eye='open', iris='#3a2a1e', lips='#b8584a',
                 rim=None, rim_side=(1, 0), cool=None, lid=0.25, mouth_open=False, ear=True):
    """Head in profile facing +x, centred at (0,0), r = half the head height. Draw it inside a
    transformed group. light: where the highlight sits (local coords). rim: colour of a thin
    light rim on the side `rim_side`. cool: optional extra cast light colour (e.g. a screen)."""
    hi, mid, lo = skin
    # neck
    neck = smooth_d(S([(0.30, 0.70), (0.42, 1.05), (0.46, 1.55), (-0.30, 1.55), (-0.32, 1.1), (-0.30, 0.55)], r), 4)
    C.shaded(neck, hi, mid, lo, (-0.35 * r, 0.5 * r, 0.5 * r, 1.55 * r), light=light, k=r * 0.12, rough=None, spread=1.2)
    C.path(smooth_d(S([(0.36, 0.84), (0.10, 0.74), (-0.20, 0.62), (-0.22, 0.85), (0.15, 1.0), (0.40, 1.0)], r), 4), lo, 0.55,
           f' filter="url(#{C.blur(r*0.06)})"')
    # skull and face
    d = smooth_d(S(HEAD_PTS, r), 6)
    C.shaded(d, hi, mid, lo, (-0.8 * r, -r, 0.92 * r, 0.92 * r), light=light, k=r * 0.22, deep=lo, spread=1.25, hipos=0.38, rough=None)
    # cheekbone plane, temple and jaw shadow
    C.ell(0.40 * r, 0.20 * r, 0.20 * r, 0.11 * r, hi, 0.35, f' transform="rotate(-20 {f(0.4*r)} {f(0.2*r)})" filter="url(#{C.blur(r*0.07)})"')
    C.ell(0.20 * r, -0.30 * r, 0.16 * r, 0.20 * r, lo, 0.25, f' filter="url(#{C.blur(r*0.08)})"')
    C.path(smooth_d(S([(0.05, 0.40), (0.30, 0.62), (0.55, 0.80), (0.40, 0.88), (0.10, 0.74), (-0.10, 0.55)], r), 4), lo, 0.4,
           f' filter="url(#{C.blur(r*0.07)})"')
    # warm blush on cheek
    C.ell(0.46 * r, 0.30 * r, 0.16 * r, 0.10 * r, '#e0705a', 0.18, f' filter="url(#{C.blur(r*0.07)})"')
    # nose: wing, nostril, bridge light
    C.path(smooth_d(S([(0.66, 0.16), (0.78, 0.13), (0.84, 0.22), (0.78, 0.27), (0.66, 0.25)], r), 3), lo, 0.35,
           f' filter="url(#{C.blur(r*0.025)})"')
    stroke(C, poly_d(catmull(S([(0.70, 0.235), (0.745, 0.265), (0.79, 0.262)], r), 4), False), lo, r * 0.035, 0.8)
    C.brush(S([(0.71, -0.10), (0.79, 0.04), (0.87, 0.17)], r), r * 0.05, hi, 0.55, tin=0.3, tout=0.3)
    # lips
    C.path(smooth_d(S([(0.77, 0.37), (0.79, 0.41), (0.735, 0.465), (0.68, 0.455), (0.70, 0.40)], r), 3), lips, 0.55)
    C.path(smooth_d(S([(0.735, 0.47), (0.77, 0.52), (0.735, 0.575), (0.67, 0.56), (0.68, 0.49)], r), 3), lips, 0.45)
    C.ell(0.74 * r, 0.525 * r, 0.025 * r, 0.018 * r, '#ffe6d6', 0.5)
    stroke(C, poly_d(catmull(S([(0.735, 0.463), (0.69, 0.468), (0.64, 0.455)], r), 4), False), '#5a2018', r * 0.025, 0.75)
    C.ell(0.66 * r, 0.62 * r, 0.05 * r, 0.025 * r, lo, 0.4, f' filter="url(#{C.blur(r*0.02)})"')
    if mouth_open:
        C.path(smooth_d(S([(0.78, 0.44), (0.72, 0.452), (0.64, 0.47), (0.72, 0.53), (0.775, 0.545)], r), 3), '#2a0c0a', 0.95)
        C.ell(0.755 * r, 0.458 * r, 0.02 * r, 0.01 * r, '#f0e4dc', 0.8)
    # ear
    if ear:
      C.ell(-0.14 * r, 0.04 * r, 0.13 * r, 0.21 * r, mid, 1, f' transform="rotate(12 {f(-0.14*r)} {f(0.04*r)})"')
      C.brush(S([(-0.10, -0.10), (-0.05, 0.02), (-0.08, 0.16)], r), r * 0.04, lo, 0.3, tin=0.3, tout=0.3)
      C.ell(-0.18 * r, -0.04 * r, 0.04 * r, 0.09 * r, hi, 0.5, f' transform="rotate(12 {f(-0.18*r)} {f(-0.04*r)})"')
    # hair cap
    hh = hair
    hd = smooth_d(S([(0.58, -0.74), (0.18, -1.02), (-0.20, -1.07), (-0.62, -0.88), (-0.86, -0.45), (-0.86, 0.05), (-0.70, 0.40),
                     (-0.48, 0.52), (-0.36, 0.30), (-0.32, 0.0), (-0.20, -0.26), (0.02, -0.40), (0.30, -0.56), (0.56, -0.66)], r), 5)
    C.shaded(hd, hh[0], hh[1], hh[2], (-0.86 * r, -1.07 * r, 0.5 * r, 0.52 * r), light=light, k=r * 0.2, rough='roughf', spread=1.3)
    for k in range(9):
        t = k / 8
        a0 = (0.42 - t * 1.15, -0.74 - math.sin(t * 3.1) * 0.28)
        a1 = (a0[0] - 0.25, a0[1] + 0.25 + t * 0.2)
        a2 = (a1[0] - 0.12, a1[1] + 0.32)
        C.brush(S([a0, a1, a2], r), r * (0.025 + 0.02 * (k % 3) / 2), hh[0], 0.22 + 0.08 * (k % 2), tin=0.2, tout=0.6)
        C.brush(S([(a0[0] + 0.03, a0[1] + 0.05), (a1[0] + 0.02, a1[1] + 0.05)], r), r * 0.03, hh[2], 0.35, tin=0.2, tout=0.6)
    # eye: socket shadow, lid, opening, iris
    ex, ey = 0.55, -0.08
    C.ell((ex + 0.02) * r, (ey - 0.02) * r, 0.13 * r, 0.09 * r, lo, 0.35, f' filter="url(#{C.blur(r*0.04)})"')
    op = S([(ex - 0.05, ey + 0.0), (ex + 0.03, ey - 0.04 + lid * 0.02), (ex + 0.095, ey - 0.035 + lid * 0.03), (ex + 0.11, ey - 0.005), (ex + 0.09, ey + 0.03), (ex + 0.02, ey + 0.03)], r)
    eid = C.id('p')
    cid = C.id('c')
    C.defs.append(f'<path id="{eid}" d="{smooth_d(op, 3)}"/><clipPath id="{cid}"><use href="#{eid}"/></clipPath>')
    if eye == 'closed':
        stroke(C, poly_d(catmull(S([(ex - 0.05, ey), (ex + 0.03, ey + 0.03), (ex + 0.10, ey + 0.01)], r), 4), False), '#3a1c10', r * 0.03, 0.85)
    else:
        C.a(f'<use href="#{eid}" fill="#efe4d6"/>')
        C.a(f'<g clip-path="url(#{cid})">')
        ig = C.rg([(0, '#c8a070'), (0.35, iris), (1, '#120a06')], (ex + 0.08) * r, (ey - 0.0) * r, 0.05 * r)
        C.ell((ex + 0.08) * r, ey * r, 0.026 * r, 0.048 * r, f'url(#{ig})')
        C.ell((ex + 0.088) * r, ey * r, 0.011 * r, 0.026 * r, '#080404')
        C.ell(ex * r, (ey - 0.06) * r, 0.14 * r, 0.04 * r, '#4a2a1c', 0.45, f' filter="url(#{C.blur(r*0.015)})"')
        C.a('</g>')
        C.ell((ex + 0.085) * r, (ey - 0.015) * r, 0.01 * r, 0.01 * r, '#fffef6', 0.95)
    if eye == 'heavy':
        C.a(f'<g clip-path="url(#{cid})">')
        C.path(poly_d(S([(ex - 0.08, ey - 0.08), (ex + 0.14, ey - 0.08), (ex + 0.14, ey + 0.018), (ex - 0.08, ey + 0.026)], r)), mid)
        C.a('</g>')
        stroke(C, poly_d(catmull(S([(ex - 0.05, ey + 0.022), (ex + 0.04, ey + 0.024), (ex + 0.11, ey + 0.016)], r), 4), False), '#2a140a', r * 0.035, 0.9)
    # upper lid crease and lash line, lower lid
    stroke(C, poly_d(catmull(S([(ex - 0.05, ey - 0.005), (ex + 0.03, ey - 0.045 + lid * 0.02), (ex + 0.10, ey - 0.035 + lid * 0.03)], r), 4), False), '#2a140a', r * 0.028, 0.9)
    stroke(C, poly_d(catmull(S([(ex - 0.06, ey - 0.04), (ex + 0.03, ey - 0.085), (ex + 0.09, ey - 0.07)], r), 4), False), lo, r * 0.02, 0.6)
    for q in (0, 1, 2):
        C.brush(S([(ex + 0.05 + q * 0.02, ey - 0.04 + lid * 0.02), (ex + 0.09 + q * 0.022, ey - 0.07 + q * 0.01)], r), r * 0.014, '#2a140a', 0.75, tin=0, tout=0.8)
        stroke(C, poly_d(catmull(S([(ex - 0.03, ey + 0.02), (ex + 0.03, ey + 0.04), (ex + 0.09, ey + 0.035)], r), 4), False), lo, r * 0.016, 0.45)
    # brow
    C.brush(S([(ex - 0.12, ey - 0.20), (ex + 0.02, ey - 0.25), (ex + 0.16, ey - 0.22)], r), r * 0.05, hh[1], 0.85, tin=0.3, tout=0.5)
    # rim light along the face edge
    if rim:
        rx_, ry_ = rim_side
        C.a(f'<g clip-path="url(#{_clip_of(C, d)})">')
        g = C.rg([(0, rim, 0.0), (0.72, rim, 0.0), (0.9, rim, 0.55), (1, rim, 0.0)], -rx_ * 0.35 * r, -ry_ * 0.35 * r, 1.25 * r)
        C.a(f'<path d="{d}" fill="url(#{g})"/>')
        C.a('</g>')
    if cool:
        col, op_ = cool
        C.a(f'<g clip-path="url(#{_clip_of(C, d)})">')
        g = C.rg([(0, col, op_), (0.6, col, op_ * 0.35), (1, col, 0)], 1.1 * r, 0, 1.2 * r)
        C.a(f'<path d="{d}" fill="url(#{g})"/>')
        C.a('</g>')


def _clip_of(C, d):
    pid = C.id('p')
    cid = C.id('c')
    C.defs.append(f'<path id="{pid}" d="{d}"/><clipPath id="{cid}"><use href="#{pid}"/></clipPath>')
    return cid


def grain_stars(C, pts, col='#ffffff'):
    """pts: list of (x, y, r, op). Draw small stars, grouped."""
    s = ''.join(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(rr)}" opacity="{round(op,2)}"/>' for x, y, rr, op in pts)
    C.a(f'<g fill="{col}">{s}</g>')


def sparkle(C, x, y, s, col='#fff8e8', op=0.9):
    """Soft four-point glint (thin, blurred) with a halo."""
    C.glow(x, y, s * 3.2, col, op * 0.5)
    C.brush([(x - s * 1.6, y), (x + s * 1.6, y)], s * 0.35, col, op, tin=0.5, tout=0.5)
    C.brush([(x, y - s * 1.6), (x, y + s * 1.6)], s * 0.35, col, op, tin=0.5, tout=0.5)
    C.a(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(s*0.45)}" fill="#ffffff" opacity="{op}"/>')


# ---------------------------------------------------------------- 3/4 head with open eyes
def eye_open(C, ex, ey, w, h, r, gaze, iris, lidcol, mode='open', white='#f2e8de', lash='#24120a'):
    d = f"M{f(ex-w)} {f(ey)}Q{f(ex-w*0.1)} {f(ey-h*2.1)} {f(ex+w)} {f(ey-h*0.1)}Q{f(ex+w*0.05)} {f(ey+h*1.5)} {f(ex-w)} {f(ey)}Z"
    pid, cid = C.id('p'), C.id('c')
    C.defs.append(f'<path id="{pid}" d="{d}"/><clipPath id="{cid}"><use href="#{pid}"/></clipPath>')
    # socket shadow
    C.ell(ex, ey - h * 0.6, w * 1.25, h * 1.9, lidcol, 0.35, f' filter="url(#{C.blur(max(r*0.05,0.8))})"')
    C.a(f'<use href="#{pid}" fill="{white}"/>')
    C.a(f'<g clip-path="url(#{cid})">')
    ir = h * 1.18
    ix, iy = ex + gaze[0] * w * 0.42, ey + gaze[1] * h * 0.5 - h * 0.05
    ig = C.rg([(0, '#d8b080'), (0.3, iris), (0.85, '#1a0e08'), (1, '#0a0604')], ix, iy, ir)
    C.a(f'<circle cx="{f(ix)}" cy="{f(iy)}" r="{f(ir)}" fill="url(#{ig})"/>')
    C.a(f'<circle cx="{f(ix)}" cy="{f(iy)}" r="{f(ir*0.42)}" fill="#070403"/>')
    # upper lid shadow on the eyeball
    C.a(f'<path d="M{f(ex-w)} {f(ey-h*2.2)}L{f(ex+w)} {f(ey-h*2.2)}L{f(ex+w)} {f(ey-h*0.3)}Q{f(ex)} {f(ey-h*1.2)} {f(ex-w)} {f(ey-h*0.2)}Z" fill="#3a2010" opacity="0.4" filter="url(#{C.blur(max(h*0.3,0.5))})"/>')
    if mode == 'down':
        C.a(f'<path d="M{f(ex-w*1.1)} {f(ey-h*2.4)}L{f(ex+w*1.1)} {f(ey-h*2.4)}L{f(ex+w*1.1)} {f(ey+h*0.25)}Q{f(ex)} {f(ey+h*0.9)} {f(ex-w*1.1)} {f(ey+h*0.25)}Z" fill="{lidcol}"/>')
    if mode == 'half':
        C.a(f'<path d="M{f(ex-w*1.1)} {f(ey-h*2.4)}L{f(ex+w*1.1)} {f(ey-h*2.4)}L{f(ex+w*1.1)} {f(ey-h*0.3)}Q{f(ex)} {f(ey+h*0.1)} {f(ex-w*1.1)} {f(ey-h*0.2)}Z" fill="{lidcol}"/>')
    C.a('</g>')
    if mode == 'half':
        C.a(f'<circle cx="{f(ix-ir*0.3)}" cy="{f(iy+ir*0.1)}" r="{f(max(ir*0.18,0.5))}" fill="#e8f4ff" opacity="0.9"/>')
        lp = f"M{f(ex-w*1.05)} {f(ey-h*0.1)}Q{f(ex)} {f(ey+h*0.3)} {f(ex+w*1.08)} {f(ey-h*0.25)}"
    elif mode != 'down':
        C.a(f'<circle cx="{f(ix-ir*0.35)}" cy="{f(iy-ir*0.35)}" r="{f(max(ir*0.24,0.6))}" fill="#fffef8" opacity="0.95"/>')
        lp = f"M{f(ex-w*1.05)} {f(ey+h*0.1)}Q{f(ex-w*0.1)} {f(ey-h*2.15)} {f(ex+w*1.08)} {f(ey-h*0.15)}"
    else:
        lp = f"M{f(ex-w*1.05)} {f(ey+h*0.2)}Q{f(ex)} {f(ey+h*1.0)} {f(ex+w*1.08)} {f(ey+h*0.1)}"
    C.a(f'<path d="{lp}" fill="none" stroke="{lash}" stroke-width="{f(max(h*0.45,0.9))}" stroke-linecap="round"/>')
    # crease and lower lid
    C.a(f'<path d="M{f(ex-w*0.85)} {f(ey-h*1.5)}Q{f(ex)} {f(ey-h*2.9)} {f(ex+w*0.95)} {f(ey-h*1.1)}" fill="none" stroke="{lash}" stroke-width="{f(max(h*0.18,0.6))}" opacity="0.4"/>')
    if mode == 'open':
        C.a(f'<path d="M{f(ex-w*0.7)} {f(ey+h*0.55)}Q{f(ex)} {f(ey+h*1.45)} {f(ex+w*0.9)} {f(ey+h*0.2)}" fill="none" stroke="{lash}" stroke-width="{f(max(h*0.14,0.5))}" opacity="0.3"/>')


def head34(C, cx, cy, r, skin, hair, facing=0.0, gaze=(0, 0), eyes='open', hairstyle='short', smile=0.4,
           light=(-0.5, -0.7), iris='#4a2a18', lips='#b05a4c', tilt=0.0, cast=None, neck=True, beard=None):
    """Near-frontal / three-quarter painted head with open eyes. facing in [-0.45, 0.45]."""
    hi, mid, lo = skin
    hh = hair
    rx = r * 0.8
    fc = facing
    C.a(f'<g transform="rotate({f(tilt)} {f(cx)} {f(cy + r)})">')
    sh = fc * r * 0.14
    if hairstyle == 'long':
        d = smooth_d([(cx - rx * 1.15, cy - r * 0.3), (cx - rx * 1.25, cy + r * 1.3), (cx - rx * 0.5, cy + r * 1.55), (cx, cy + r * 1.1),
                      (cx + rx * 0.5, cy + r * 1.55), (cx + rx * 1.25, cy + r * 1.3), (cx + rx * 1.15, cy - r * 0.3), (cx, cy - r * 1.22)], 5)
        C.shaded(d, hh[0], hh[1], hh[2], (cx - rx * 1.25, cy - r * 1.22, cx + rx * 1.25, cy + r * 1.55), light=light, k=r * 0.3, rough='roughf')
    elif hairstyle == 'bun':
        ball(C, cx - fc * r * 0.6, cy - r * 0.95, r * 0.42, hh[0], hh[1], hh[2], k=r * 0.12, light=light)
    elif hairstyle == 'curly':
        for k in range(26):
            a = math.radians(-200 + k * (220 / 25))
            rr = r * (1.02 + C.r.uniform(-0.05, 0.08))
            x, y = cx + math.cos(a) * rr * 0.98, cy - r * 0.12 + math.sin(a) * rr * 1.02
            ball(C, x, y, r * C.r.uniform(0.2, 0.28), hh[0], hh[1], hh[2], k=r * 0.07, rough='roughf', light=light)
    if neck:
        nd = (f"M{f(cx-r*0.3+sh*0.5)} {f(cy+r*0.5)}C{f(cx-r*0.3)} {f(cy+r*0.95)} {f(cx-r*0.36)} {f(cy+r*1.25)} {f(cx-r*0.48)} {f(cy+r*1.5)}"
              f"L{f(cx+r*0.48)} {f(cy+r*1.5)}C{f(cx+r*0.36)} {f(cy+r*1.25)} {f(cx+r*0.3)} {f(cy+r*0.95)} {f(cx+r*0.3+sh*0.5)} {f(cy+r*0.5)}Z")
        C.shaded(nd, hi, mid, lo, (cx - r * 0.5, cy + r * 0.5, cx + r * 0.5, cy + r * 1.5), light=light, k=r * 0.1, rough=None, spread=1.2)
        C.path(f"M{f(cx-r*0.32)} {f(cy+r*0.62)}Q{f(cx+sh)} {f(cy+r*1.12)} {f(cx+r*0.32)} {f(cy+r*0.62)}L{f(cx+r*0.32)} {f(cy+r*0.98)}Q{f(cx)} {f(cy+r*1.22)} {f(cx-r*0.32)} {f(cy+r*0.98)}Z",
               lo, 0.55, f' filter="url(#{C.blur(r*0.05)})"')
    for side in (-1, 1):
        if side * fc > 0.3:
            continue
        ex = cx + side * rx * 0.98 - fc * r * 0.1
        C.ell(ex, cy + r * 0.08, r * 0.14, r * 0.24, mid)
        C.ell(ex + side * r * 0.02, cy + r * 0.1, r * 0.06, r * 0.13, lo, 0.45)
    face = smooth_d([(cx + sh * 0.3, cy - r), (cx + rx * 0.82, cy - r * 0.74), (cx + rx * 0.98, cy - r * 0.15), (cx + rx * 0.9 + sh * 0.25, cy + r * 0.2),
                     (cx + rx * 0.64 + sh, cy + r * 0.7), (cx + rx * 0.24 + sh, cy + r), (cx - rx * 0.24 + sh, cy + r),
                     (cx - rx * 0.64 + sh, cy + r * 0.7), (cx - rx * 0.9 + sh * 0.25, cy + r * 0.2), (cx - rx * 0.98, cy - r * 0.15), (cx - rx * 0.82, cy - r * 0.74)], 5)
    C.shaded(face, hi, mid, lo, (cx - rx, cy - r, cx + rx, cy + r), light=light, k=r * 0.28, deep=lo, spread=1.35, hipos=0.35, rough=None)
    fx = cx + fc * r * 0.3
    if beard:  # short trimmed beard along the jaw, with a moustache
        bd = smooth_d([(cx - rx * 0.92 + sh * 0.25, cy + r * 0.1), (cx - rx * 0.72 + sh, cy + r * 0.62), (cx - rx * 0.3 + sh, cy + r * 0.98),
                       (cx + sh, cy + r * 1.06), (cx + rx * 0.3 + sh, cy + r * 0.98), (cx + rx * 0.72 + sh, cy + r * 0.62),
                       (cx + rx * 0.92 + sh * 0.25, cy + r * 0.1), (cx + rx * 0.6 + sh, cy + r * 0.42), (fx + r * 0.2, cy + r * 0.72),
                       (fx, cy + r * 0.78), (fx - r * 0.2, cy + r * 0.72), (cx - rx * 0.6 + sh, cy + r * 0.42)], 4)
        C.path(bd, beard[1], 0.85, ' filter="url(#roughf)"')
        C.path(bd, beard[0], 0.25, f' transform="translate({f(-r*0.03)} {f(-r*0.03)})" filter="url(#{C.blur(r*0.05)})"')
        C.path(smooth_d([(fx - r * 0.26, cy + r * 0.56), (fx, cy + r * 0.47), (fx + r * 0.26, cy + r * 0.56), (fx, cy + r * 0.53)], 3), beard[1], 0.85)
    # far-side cheek plane in shadow, near cheekbone lit
    C.ell(cx - fc * rx * 0.0 + (1 if fc >= 0 else -1) * rx * 0.62, cy + r * 0.25, r * 0.2, r * 0.42, lo, 0.25 + abs(fc) * 0.3, f' filter="url(#{C.blur(r*0.1)})"')
    C.ell(fx - (1 if fc >= 0 else -1) * r * 0.36, cy + r * 0.16, r * 0.22, r * 0.12, hi, 0.4, f' filter="url(#{C.blur(r*0.08)})"')
    # eyes
    ey = cy + r * 0.02
    for side in (-1, 1):
        w = r * 0.19 * (1 - side * fc * 0.45)
        x = fx + side * r * 0.34 * (1 - side * fc * 0.35)
        eye_open(C, x, ey, w * 0.92, r * 0.062, r, gaze, iris, mid, mode=eyes)
        C.brush([(x - w * 1.15, ey - r * 0.2), (x - w * 0.1, ey - r * 0.29), (x + w * 1.2, ey - r * 0.22)], r * 0.07, hh[1], 0.85, tin=0.25 if side < 0 else 0.1, tout=0.1 if side < 0 else 0.4)
    # nose
    nx = fx + fc * r * 0.08
    C.brush([(nx - r * 0.02 - fc * r * 0.05, ey - r * 0.08), (nx - r * 0.03, cy + r * 0.22), (nx, cy + r * 0.33)], r * 0.08, hi, 0.4, tin=0.3, tout=0.3)
    sd = 1 if fc >= 0 else -1
    C.a(f'<path d="M{f(nx+sd*r*0.07)} {f(ey+r*0.04)}Q{f(nx+sd*r*0.13+fc*r*0.08)} {f(cy+r*0.28)} {f(nx+sd*r*0.04)} {f(cy+r*0.39)}" fill="none" stroke="{lo}" stroke-width="{f(max(r*0.06,0.8))}" stroke-linecap="round" opacity="0.5" filter="url(#{C.blur(r*0.015)})"/>')
    C.ell(nx, cy + r * 0.34, r * 0.1, r * 0.06, hi, 0.35)
    for s2 in (-1, 1):
        C.ell(nx + s2 * r * 0.075 * (1 - s2 * fc * 0.5), cy + r * 0.4, r * 0.035, r * 0.02, lo, 0.75)
    C.ell(nx, cy + r * 0.43, r * 0.12, r * 0.03, lo, 0.25, f' filter="url(#{C.blur(r*0.02)})"')
    # mouth with a gentle smile
    my = cy + r * 0.6
    mw = r * 0.2 * (1 + smile * 0.15)
    up = r * 0.05 * smile
    C.a(f'<path d="M{f(fx-mw)} {f(my-up)}Q{f(fx-mw*0.45)} {f(my-r*0.07)} {f(fx)} {f(my-r*0.045)}Q{f(fx+mw*0.45)} {f(my-r*0.07)} {f(fx+mw)} {f(my-up)}Q{f(fx)} {f(my+r*0.025)} {f(fx-mw)} {f(my-up)}Z" fill="{lips}" opacity="0.8"/>')
    C.a(f'<path d="M{f(fx-mw*0.85)} {f(my-up*0.6)}Q{f(fx)} {f(my+r*0.14)} {f(fx+mw*0.85)} {f(my-up*0.6)}Q{f(fx)} {f(my+r*0.02)} {f(fx-mw*0.85)} {f(my-up*0.6)}Z" fill="{lips}" opacity="0.65"/>')
    C.a(f'<path d="M{f(fx-mw)} {f(my-up)}Q{f(fx)} {f(my+r*0.035+up*0.5)} {f(fx+mw)} {f(my-up)}" fill="none" stroke="#4a1810" stroke-width="{f(max(r*0.03,0.7))}" stroke-linecap="round" opacity="0.8"/>')
    C.ell(fx, my + r * 0.075, r * 0.07, r * 0.02, '#ffe0d0', 0.35)
    C.ell(fx, cy + r * 0.84, r * 0.13, r * 0.05, hi, 0.18, f' filter="url(#{C.blur(r*0.04)})"')
    for side in (-1, 1):
        C.ell(fx + side * r * 0.42, cy + r * 0.36, r * 0.16, r * 0.09, '#e06a52', 0.17, f' filter="url(#{C.blur(r*0.08)})"')
    # hair cap
    if hairstyle in ('short', 'long', 'bun'):
        d = smooth_d([(cx - rx * 1.06, cy + r * 0.12), (cx - rx * 1.06, cy - r * 0.6), (cx - fc * r * 0.2, cy - r * 1.16),
                      (cx + rx * 1.06, cy - r * 0.6), (cx + rx * 1.06, cy + r * 0.12), (cx + rx * 0.9 - fc * r * 0.2, cy - r * 0.34),
                      (fx + r * 0.3, cy - r * 0.6), (fx - r * 0.05, cy - r * 0.52), (fx - r * 0.4, cy - r * 0.62), (cx - rx * 0.9 - fc * r * 0.2, cy - r * 0.32)], 5)
        C.shaded(d, hh[0], hh[1], hh[2], (cx - rx * 1.1, cy - r * 1.16, cx + rx * 1.1, cy + r * 0.12), light=light, k=r * 0.22, rough='roughf')
        for k in range(8):
            x0 = cx - rx * 0.8 + k * rx * 0.23
            C.brush([(x0 + fc * r * 0.1, cy - r * 0.92), (x0 + r * 0.06, cy - r * 0.78), (x0 + (x0 - cx) * 0.25, cy - r * 0.6)], r * 0.045, hh[0], 0.35, tin=0.2, tout=0.5)
        if hairstyle == 'long':
            for side in (-1, 1):
                d2 = smooth_d([(cx + side * rx * 0.86, cy - r * 0.5), (cx + side * rx * 1.12, cy - r * 0.1), (cx + side * rx * 1.18, cy + r * 0.8),
                               (cx + side * rx * 1.06, cy + r * 1.35), (cx + side * rx * 0.86, cy + r * 0.9), (cx + side * rx * 0.88, cy + r * 0.1)], 4)
                C.shaded(d2, hh[0], hh[1], hh[2], (cx - rx * 1.2, cy - r * 0.5, cx + rx * 1.2, cy + r * 1.35), light=light, k=r * 0.12, rough='roughf')
    elif hairstyle == 'curly':
        for k in range(9):
            x = cx - rx * 0.85 + k * rx * 0.21
            y = cy - r * 0.78 - math.sin(k / 8 * math.pi) * r * 0.26
            ball(C, x, y, r * 0.24, hh[0], hh[1], hh[2], k=r * 0.07, rough='roughf', light=light)
    elif hairstyle == 'wrap':
        d = smooth_d([(cx - rx * 1.12, cy + r * 0.22), (cx - rx * 1.14, cy - r * 0.7), (cx, cy - r * 1.28),
                      (cx + rx * 1.14, cy - r * 0.7), (cx + rx * 1.12, cy + r * 0.22), (cx + rx * 0.86, cy - r * 0.42), (cx, cy - r * 0.54), (cx - rx * 0.86, cy - r * 0.42)], 5)
        C.shaded(d, hh[0], hh[1], hh[2], (cx - rx * 1.2, cy - r * 1.28, cx + rx * 1.2, cy + r * 0.22), light=light, k=r * 0.26, rough='roughf')
        for k in range(4):
            C.brush([(cx - rx * 0.9 + k * rx * 0.55, cy - r * 1.06), (cx - rx * 0.75 + k * rx * 0.5, cy - r * 0.76), (cx - rx * 0.7 + k * rx * 0.45, cy - r * 0.5)], r * 0.06, hh[2], 0.45, tin=0.2, tout=0.3)
    if cast:
        col, op_, (gx, gy) = cast
        cid = _clip_of(C, face)
        C.a(f'<g clip-path="url(#{cid})">')
        g = C.rg([(0, col, op_), (0.55, col, op_ * 0.4), (1, col, 0)], gx, gy, r * 1.6)
        C.a(f'<rect x="{f(cx-r*1.2)}" y="{f(cy-r*1.2)}" width="{f(r*2.4)}" height="{f(r*2.4)}" fill="url(#{g})"/>')
        C.a('</g>')
    C.a('</g>')


def body(C, x, y0, w, cloth, skin, light=(-0.5, -0.8), yb=660, neck_r=None):
    """Seated upper body seen from the front: sloping shoulders, slight waist, round neckline.
    y0 = base of the neck."""
    hi, mid, lo = cloth
    d = (f"M{f(x-w*0.26)} {f(y0)}C{f(x-w*0.52)} {f(y0+3)} {f(x-w*0.84)} {f(y0+9)} {f(x-w*0.96)} {f(y0+32)}"
         f"C{f(x-w*1.04)} {f(y0+70)} {f(x-w*0.9)} {f(y0+130)} {f(x-w*0.84)} {f(yb)}L{f(x+w*0.84)} {f(yb)}"
         f"C{f(x+w*0.9)} {f(y0+130)} {f(x+w*1.04)} {f(y0+70)} {f(x+w*0.96)} {f(y0+32)}"
         f"C{f(x+w*0.84)} {f(y0+9)} {f(x+w*0.52)} {f(y0+3)} {f(x+w*0.26)} {f(y0)}Z")
    C.shaded(d, hi, mid, lo, (x - w, y0, x + w, yb), light=light, k=w * 0.32, deep='#120a10', rough='roughf', spread=1.3)
    nr = neck_r or w * 0.26
    C.path(f"M{f(x-nr)} {f(y0)}Q{f(x)} {f(y0+nr*0.9)} {f(x+nr)} {f(y0)}Z", skin[1])
    C.path(f"M{f(x-nr)} {f(y0)}Q{f(x)} {f(y0+nr*0.9)} {f(x+nr)} {f(y0)}", 'none', 1, f' stroke="{lo}" stroke-width="{f(w*0.05)}"')
    C.ell(x, y0 + nr * 0.25, nr * 0.7, nr * 0.25, skin[2], 0.35, f' filter="url(#{C.blur(nr*0.15)})"')
    # soft folds from the shoulders toward the middle
    for side in (-1, 1):
        C.brush([(x + side * w * 0.7, y0 + 30), (x + side * w * 0.45, y0 + 80), (x + side * w * 0.3, y0 + 140)], w * 0.08, lo, 0.25,
                f' filter="url(#{C.blur(w*0.04)})"', tin=0.3, tout=0.5)
    C.ell(x, y0 + 40, w * 0.5, 22, hi, 0.18, f' filter="url(#{C.blur(12)})"')


def handskin(sk):
    """Lighter shadow tone for small hands, so the finger strokes do not read as claws."""
    def mix(a, b, t):
        a = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
        b = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
        return '#' + ''.join(f'{int(a[k] + (b[k] - a[k]) * t):02x}' for k in range(3))
    return (sk[0], sk[1], mix(sk[1], sk[2], 0.45))


def hand3(C, x, y, s, ang, skin, spread=0.18, curl=(0, 0, 0, 0), thumb_side=1, thumb_ang=0.75, nails=True, light=(-0.5, -0.8)):
    """Readable painted hand. Wrist at (x, y), fingers point along `ang` degrees; s = hand length.
    Fingers are shaded tapered capsules (index first, from the thumb side); curl in [0, 1] bends each one."""
    hi, mid, lo = skin
    a = math.radians(ang)
    ux, uy = math.cos(a), math.sin(a)
    nx, ny = -uy * thumb_side, ux * thumb_side   # toward the thumb
    def pt(u, v):
        return (x + ux * u * s + nx * v * s, y + uy * u * s + ny * v * s)
    C.shaded(taper_d([pt(-0.25, 0), pt(0.1, 0)], s * 0.28, s * 0.36), hi, mid, lo, bbox([pt(-0.25, 0.2), pt(0.1, -0.2)]), light=light, k=s * 0.06, rough=None)
    # palm
    palm = smooth_d([pt(0.0, 0.17), pt(0.18, 0.24), pt(0.46, 0.25), pt(0.52, 0.08), pt(0.5, -0.2), pt(0.3, -0.24), pt(0.04, -0.17)], 4)
    C.path(palm, '#140806', 0.25, f' transform="translate(2 3)" filter="url(#{C.blur(s*0.04)})"')
    # fingers: index, middle, ring, little
    specs = [(0.165, 0.42), (0.055, 0.47), (-0.055, 0.44), (-0.16, 0.34)]
    for i, (v, L) in enumerate(specs):
        fa = (i - 1.5) * spread * -1
        cu = curl[i]
        p0 = pt(0.47, v)
        d1 = (math.cos(a + fa * thumb_side), math.sin(a + fa * thumb_side))
        p1 = (p0[0] + d1[0] * L * s * 0.55, p0[1] + d1[1] * L * s * 0.55)
        a2 = a + fa * thumb_side - cu * 1.6 * thumb_side
        p2 = (p1[0] + math.cos(a2) * L * s * 0.45 * (1 - cu * 0.3), p1[1] + math.sin(a2) * L * s * 0.45 * (1 - cu * 0.3))
        w = s * (0.135 if i < 3 else 0.115)
        d = taper_d([p0, p1, p2], w, w * 0.8)
        C.path(d, '#140806', 0.2, f' transform="translate(1.5 2)" filter="url(#{C.blur(s*0.02)})"')
        C.shaded(d, hi, mid, lo, bbox([p0, p1, p2], w), light=light, k=w * 0.35, rough=None, spread=1.1)
        C.ell(p2[0], p2[1], w * 0.42, w * 0.42, mid)
        if nails and cu < 0.5:
            C.ell(p2[0] - d1[0] * w * 0.15, p2[1] - d1[1] * w * 0.15, w * 0.24, w * 0.3, '#f4ddd0', 0.6,
                  f' transform="rotate({f(math.degrees(a2)+90)} {f(p2[0])} {f(p2[1])})"')
        # knuckle crease
        C.ell(p1[0], p1[1], w * 0.3, w * 0.12, lo, 0.35, f' transform="rotate({f(math.degrees(a)+90)} {f(p1[0])} {f(p1[1])})"')
    C.shaded(palm, hi, mid, lo, bbox([pt(0, 0.25), pt(0.52, -0.24)]), light=light, k=s * 0.08, rough=None, spread=1.2)
    C.brush([pt(0.12, 0.12), pt(0.3, 0.02), pt(0.44, -0.12)], s * 0.025, lo, 0.4, tin=0.3, tout=0.3)
    # thumb
    t0 = pt(0.12, 0.2)
    ta = a + thumb_ang * thumb_side
    t1 = (t0[0] + math.cos(ta) * s * 0.2, t0[1] + math.sin(ta) * s * 0.2)
    t2 = (t1[0] + math.cos(ta - 0.45 * thumb_side) * s * 0.17, t1[1] + math.sin(ta - 0.45 * thumb_side) * s * 0.17)
    d = taper_d([t0, t1, t2], s * 0.15, s * 0.1)
    C.shaded(d, hi, mid, lo, bbox([t0, t1, t2], s * 0.08), light=light, k=s * 0.04, rough=None)
    C.ell(t2[0], t2[1], s * 0.05, s * 0.05, mid)
