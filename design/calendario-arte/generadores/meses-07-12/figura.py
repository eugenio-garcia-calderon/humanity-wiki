"""Large painted human figures for Diseño 3 (heads 80-95 px tall on the 1485x850 canvas).

Conventions: r is half the head height (crown to chin = 2r). L = -1 when the light comes
from the viewer's left, +1 from the right. facing in [-0.4, 0.4]: positive turns the face
toward the viewer's right.
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *  # noqa

SK = {  # hi, mid, lo, deep, blush
    'light': ('#ffe4cc', '#eab894', '#b47a58', '#6a3a28', '#e88a78'),
    'olive': ('#f8d4a8', '#d49a6c', '#9a6440', '#52301c', '#e07a5a'),
    'brown': ('#eab284', '#b87a4c', '#7c4a28', '#3e200e', '#c86a48'),
    'dark': ('#c8946a', '#8a5434', '#58301a', '#28120a', '#a85038'),
}
HAIR = {
    'black': ('#4a3a34', '#221814', '#0a0606'),
    'brown': ('#8a5a38', '#4e3020', '#1e100a'),
    'grey': ('#e0dcd8', '#a8a2a0', '#5a5450'),
    'auburn': ('#b0603a', '#6e3420', '#2a120a'),
}


def grey(c, amt=0.6, tint=(70, 80, 110)):
    """Desaturate a hex colour toward a cold grey (for the shadow side)."""
    r, g, b = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
    l = 0.3 * r + 0.59 * g + 0.11 * b
    r2 = r + (l * 0.85 + tint[0] * 0.15 - r) * amt
    g2 = g + (l * 0.85 + tint[1] * 0.15 - g) * amt
    b2 = b + (l * 0.85 + tint[2] * 0.15 - b) * amt
    return '#%02x%02x%02x' % tuple(max(0, min(255, int(v))) for v in (r2, g2, b2))


def greys(cols, amt=0.6, dark=0.75):
    out = []
    for c in cols:
        g = grey(c, amt)
        r, gg, b = int(g[1:3], 16), int(g[3:5], 16), int(g[5:7], 16)
        out.append('#%02x%02x%02x' % (int(r * dark), int(gg * dark), int(b * dark)))
    return tuple(out)


def soft(C, d, col, op, sd, extra=''):
    C.path(d, col, op, f' filter="url(#{C.blur(sd)})"{extra}')


def softell(C, x, y, rx, ry, col, op, sd, rot=0):
    t = f' transform="rotate({f(rot)} {f(x)} {f(y)})"' if rot else ''
    C.ell(x, y, rx, ry, col, op, f' filter="url(#{C.blur(sd)})"{t}')


def stroke(C, d, col, w, op=1, cap='round'):
    C.a(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{f(w)}" stroke-linecap="{cap}" stroke-linejoin="round" opacity="{round(op,2)}"/>')


def cabeza(C, cx, cy, r, skin, hair, facing=0.0, tilt=0.0, L=-1, eyes='down', style='short', blind=None, lit=1.0, beard=False, gaze=(0.0, 0.0), iris='#5a3418', smile=0.0):
    """Painted head. eyes: 'down' (lowered lids, serene), 'closed', 'open'. blind: cloth colours for a blindfold."""
    hi, mid, lo, deep, blush = skin
    hh = hair
    rx = r * 0.74
    fx = cx + facing * r * 0.24           # feature axis
    near = 1 + facing * 0.0
    C.a(f'<g transform="rotate({f(tilt)} {f(cx)} {f(cy + r*0.9)})">')
    # ---- back hair mass (behind ears / neck)
    if style in ('long', 'bun', 'wavy'):
        if style == 'long' or style == 'wavy':
            d = smooth_d([(cx - rx * 1.1, cy - r * 0.3), (cx - rx * 1.16, cy + r * 0.8), (cx - rx * 0.95, cy + r * 1.5), (cx - rx * 0.6, cy + r * 1.1),
                          (cx + rx * 0.6, cy + r * 1.1), (cx + rx * 0.95, cy + r * 1.5), (cx + rx * 1.16, cy + r * 0.8), (cx + rx * 1.1, cy - r * 0.3),
                          (cx, cy - r * 1.18)], 5)
            C.shaded(d, hh[0], hh[1], hh[2], (cx - rx * 1.3, cy - r * 1.2, cx + rx * 1.3, cy + r * 1.55), light=(L * 0.6, -0.6), k=r * 0.35, rough='roughf')
        if style == 'bun':
            pass
    # ---- ears
    for side in (-1, 1):
        if side * facing > 0.3:
            continue
        ex = cx + side * rx * 0.98 - facing * r * 0.1
        C.ell(ex, cy + r * 0.12, r * 0.13, r * 0.24, mid)
        C.ell(ex + side * r * 0.03, cy + r * 0.1, r * 0.07, r * 0.15, lo, 0.6)
        C.ell(ex - side * r * 0.02, cy + r * 0.04, r * 0.04, r * 0.1, hi, 0.4)
    # ---- face silhouette
    sh = facing * r * 0.1
    pts = [(cx, cy - r * 0.98), (cx + rx * 0.72, cy - r * 0.8), (cx + rx * 0.96, cy - r * 0.3), (cx + rx * 0.97 + sh * 0.2, cy + r * 0.1),
           (cx + rx * 0.86 + sh * 0.6, cy + r * 0.48), (cx + rx * 0.55 + sh, cy + r * 0.82), (cx + rx * 0.2 + sh, cy + r * 0.99),
           (cx + sh, cy + r * 1.01),
           (cx - rx * 0.2 + sh, cy + r * 0.99), (cx - rx * 0.55 + sh, cy + r * 0.82), (cx - rx * 0.86 + sh * 0.6, cy + r * 0.48),
           (cx - rx * 0.97 + sh * 0.2, cy + r * 0.1), (cx - rx * 0.96, cy - r * 0.3), (cx - rx * 0.72, cy - r * 0.8)]
    face = smooth_d(pts, 6)
    pid = C.id('p')
    cid = C.id('c')
    C.defs.append(f'<path id="{pid}" d="{face}"/>')
    C.defs.append(f'<clipPath id="{cid}"><use href="#{pid}"/></clipPath>')
    g = C.rg([(0, hi), (0.45, mid), (1, lo)], cx + L * rx * 0.45, cy - r * 0.25, r * 1.5)
    C.a(f'<use href="#{pid}" fill="url(#{g})"/>')
    C.a(f'<g clip-path="url(#{cid})">')
    # shadow side plane and jaw turning
    softell(C, cx - L * rx * 1.0, cy + r * 0.15, rx * 0.45, r * 1.1, deep, 0.42, r * 0.18)
    softell(C, cx - L * rx * 0.75, cy + r * 0.2, rx * 0.25, r * 0.7, lo, 0.35, r * 0.12)
    softell(C, cx, cy + r * 1.05, rx * 0.8, r * 0.2, lo, 0.4, r * 0.1)
    # forehead light, cheekbone light (lit side)
    softell(C, fx + L * rx * 0.25, cy - r * 0.52, rx * 0.45, r * 0.22, hi, 0.55 * lit, r * 0.12)
    softell(C, fx + L * rx * 0.48, cy + r * 0.22, rx * 0.22, r * 0.14, hi, 0.5 * lit, r * 0.08)
    softell(C, fx + sh * 0.5, cy + r * 0.86, rx * 0.16, r * 0.07, hi, 0.4 * lit, r * 0.05)
    # warm cheeks and nose tip
    for side in (-1, 1):
        softell(C, fx + side * rx * 0.5, cy + r * 0.32, rx * 0.2, r * 0.13, blush, 0.22 * lit, r * 0.09)
    # eye sockets
    ey = cy + r * 0.02
    for side in (-1, 1):
        w = r * 0.2 * (1 - side * facing * 0.6)
        x = fx + side * r * 0.29 * (1 - side * facing * 0.45)
        softell(C, x, ey - r * 0.04, w * 1.25, r * 0.13, lo, 0.45, r * 0.06)
    # temple shadow under hairline
    softell(C, cx, cy - r * 0.78, rx * 0.9, r * 0.12, deep, 0.35, r * 0.08)
    C.a('</g>')
    # ---- eyes
    eyecol = '#3a2214'
    for side in (-1, 1):
        w = r * 0.19 * (1 - side * facing * 0.6)
        x = fx + side * r * 0.29 * (1 - side * facing * 0.45)
        y = ey
        if blind:
            continue
        if eyes == 'look':
            gx, gy = gaze
            w = r * 0.205 * (1 - side * facing * 0.5)
            up = y - r * 0.15 + max(0.0, gaze[1]) * r * 0.07   # the lid follows a downward look
            lo_ = y + r * 0.095
            alm = (f"M{f(x-w)} {f(y+r*0.012)}Q{f(x-w*0.15)} {f(up)} {f(x+w)} {f(y-r*0.015)}"
                   f"Q{f(x+w*0.1)} {f(lo_)} {f(x-w)} {f(y+r*0.012)}Z")
            aid = C.id('p'); acid = C.id('c')
            C.defs.append(f'<path id="{aid}" d="{alm}"/>')
            C.defs.append(f'<clipPath id="{acid}"><use href="#{aid}"/></clipPath>')
            C.a(f'<use href="#{aid}" fill="#efe6dc"/>')
            C.a(f'<g clip-path="url(#{acid})">')
            ix = x + gx * w * 0.42 + facing * w * 0.15
            iy = y - r * 0.008 + gy * r * 0.055
            ir = r * 0.082
            ig = C.rg([(0, '#e8c890'), (0.35, iris), (0.85, '#1e1008'), (1, '#0a0604')], ix, iy + ir * 0.25, ir)
            C.a(f'<circle cx="{f(ix)}" cy="{f(iy)}" r="{f(ir)}" fill="url(#{ig})"/>')
            C.a(f'<circle cx="{f(ix)}" cy="{f(iy)}" r="{f(ir*0.42)}" fill="#080404"/>')
            # shadow of the upper lid across the top of the eye
            C.a(f'<rect x="{f(x-w)}" y="{f(up-r*0.05)}" width="{f(w*2)}" height="{f(r*0.1)}" fill="{lo}" opacity="0.55" filter="url(#{C.blur(r*0.025)})"/>')
            C.a('</g>')
            C.a(f'<circle cx="{f(ix - ir*0.35)}" cy="{f(iy - ir*0.35)}" r="{f(ir*0.24)}" fill="#ffffff" opacity="0.9"/>')
            # upper lid line, thicker toward the outer corner, and the lid fold above
            C.brush([(x - w * 1.02, y + r * 0.012), (x - w * 0.15, up + r * 0.035), (x + w * 1.08, y - r * 0.03 + max(0.0, gaze[1]) * r * 0.02)], r * 0.042, '#24120a', 0.85, tin=0.15, tout=0.05)
            stroke(C, f"M{f(x-w*0.8)} {f(y-r*0.13)}Q{f(x-w*0.1)} {f(y-r*0.235)} {f(x+w*0.9)} {f(y-r*0.12)}", lo, max(r * 0.028, 0.8), 0.65)
            softell(C, x - L * w * 0.15, y - r * 0.17, w * 0.75, r * 0.04, hi, 0.45, r * 0.02)
            stroke(C, f"M{f(x-w*0.75)} {f(y+r*0.07)}Q{f(x)} {f(lo_+r*0.01)} {f(x+w*0.8)} {f(y+r*0.055)}", lo, max(r * 0.022, 0.7), 0.45)
            bx0 = fx + side * r * 0.09
            pts_b = [(bx0, y - r * 0.27), (x + side * w * 0.15, y - r * 0.355), (x + side * w * 1.3, y - r * 0.29)]
            C.brush(pts_b, r * 0.065, hh[1], 0.7, tin=0.0, tout=0.8, wob=0.05)
            C.brush([(p[0], p[1] - r * 0.012) for p in pts_b], r * 0.03, hh[0], 0.4, tin=0.1, tout=0.7)
            continue
        if eyes == 'open' or eyes == 'down':
            op = 0.55 if eyes == 'open' else 0.28
            # eye white almond (small visible slit when lowered)
            top = y - (r * 0.11 if eyes == 'open' else r * 0.045)
            d = f"M{f(x-w)} {f(y)}Q{f(x)} {f(top - r*0.04)} {f(x+w)} {f(y-r*0.01)}Q{f(x)} {f(y+r*0.07)} {f(x-w)} {f(y)}Z"
            C.path(d, '#efe4d8', 0.95)
            ix = x + facing * w * (0.25 if eyes == 'open' else 0.1)
            C.a(f'<circle cx="{f(ix)}" cy="{f(y + r*0.02)}" r="{f(r*0.075)}" fill="{eyecol}"/>')
            C.a(f'<circle cx="{f(ix)}" cy="{f(y + r*0.02)}" r="{f(r*0.035)}" fill="#0c0604"/>')
            # upper lid covering the top of the iris
            lid = f"M{f(x-w*1.08)} {f(y+r*0.005)}Q{f(x)} {f(top - r*0.02)} {f(x+w*1.08)} {f(y-r*0.015)}L{f(x+w*1.1)} {f(y-r*0.16)}Q{f(x)} {f(y-r*0.24)} {f(x-w*1.1)} {f(y-r*0.13)}Z"
            C.path(lid, mid)
            softell(C, x - L * w * 0.1, y - r * 0.12, w * 0.7, r * 0.04, hi, 0.5, r * 0.025)
            C.ell(ix - r * 0.02, y + r * 0.005, r * 0.018, r * 0.012, '#ffffff', 0.85)
        # lash line (the lid edge)
        if eyes == 'closed':
            d = f"M{f(x-w)} {f(y-r*0.01)}Q{f(x)} {f(y+r*0.09)} {f(x+w)} {f(y-r*0.02)}"
            C.path(f"M{f(x-w*1.05)} {f(y-r*0.13)}Q{f(x)} {f(y-r*0.2)} {f(x+w*1.05)} {f(y-r*0.14)}L{f(x+w)} {f(y-r*0.02)}Q{f(x)} {f(y+r*0.09)} {f(x-w)} {f(y-r*0.01)}Z", mid, 0.9)
            softell(C, x, y - r * 0.07, w * 0.6, r * 0.035, hi, 0.45, r * 0.02)
        else:
            top = y - (r * 0.11 if eyes == 'open' else r * 0.045)
            d = f"M{f(x-w*1.05)} {f(y+r*0.005)}Q{f(x)} {f(top - r*0.02)} {f(x+w*1.08)} {f(y-r*0.015)}"
        stroke(C, d, '#2a140a', max(r * (0.035 if eyes == 'open' else 0.045), 1.1), 0.85)
        # outer lash flick
        ox = x + side * w * 1.02
        stroke(C, f"M{f(ox - side*w*0.15)} {f(y-r*0.01)}L{f(ox + side*w*0.12)} {f(y-r*0.05)}", '#2a140a', max(r * 0.03, 0.9), 0.7)
        # lid crease
        stroke(C, f"M{f(x-w*0.85)} {f(y-r*0.12)}Q{f(x)} {f(y-r*0.21)} {f(x+w*0.9)} {f(y-r*0.13)}", lo, max(r * 0.025, 0.8), 0.6)
        # lower lid light
        stroke(C, f"M{f(x-w*0.7)} {f(y+r*0.07)}Q{f(x)} {f(y+r*0.11)} {f(x+w*0.7)} {f(y+r*0.06)}", hi, max(r * 0.025, 0.8), 0.35)
        # brow: tapered stroke, thicker at the inner end
        bx0 = fx + side * r * 0.08
        bx1 = x + side * w * 1.25
        inner = (bx0, y - r * 0.26)
        mid_ = (x + side * w * 0.2, y - r * 0.33)
        outer = (bx1, y - r * 0.27)
        pts_b = [inner, mid_, outer] if side > 0 else [inner, mid_, outer]
        C.brush(pts_b, r * 0.06, hh[1], 0.6, tin=0.0, tout=0.8, wob=0.05)
        C.brush([(p[0], p[1] - r * 0.01) for p in pts_b], r * 0.03, hh[0], 0.4, tin=0.1, tout=0.7)
    # ---- nose
    nx = fx + facing * r * 0.1
    ntop = ey - r * 0.12
    nb = cy + r * 0.42
    # bridge light
    C.brush([(nx + L * r * 0.03, ntop), (nx + L * r * 0.035, cy + r * 0.2), (nx + L * r * 0.02, nb - r * 0.06)], r * 0.07, hi, 0.55 * lit, tin=0.4, tout=0.2)
    # shadow plane on the dark side
    C.brush([(nx - L * r * 0.07, ntop + r * 0.04), (nx - L * r * 0.1, cy + r * 0.22), (nx - L * r * 0.12, nb - r * 0.04)], r * 0.1, lo, 0.45, tin=0.4, tout=0.1)
    # tip and wings
    softell(C, nx, nb - r * 0.06, r * 0.1, r * 0.08, hi, 0.4 * lit, r * 0.03)
    for side in (-1, 1):
        wx = nx + side * r * 0.12 * (1 - side * facing * 0.5)
        stroke(C, f"M{f(wx - side*r*0.01)} {f(nb-r*0.1)}Q{f(wx + side*r*0.04)} {f(nb-r*0.02)} {f(wx - side*r*0.03)} {f(nb+r*0.01)}", lo, max(r * 0.03, 0.9), 0.6)
        C.ell(nx + side * r * 0.055, nb + r * 0.005, r * 0.04, r * 0.022, deep, 0.75)
    # cast shadow under the nose, toward the dark side
    softell(C, nx - L * r * 0.05, nb + r * 0.07, r * 0.14, r * 0.04, lo, 0.45, r * 0.03)
    # ---- mouth
    my = cy + r * 0.64
    mw = r * 0.2
    lipc = '#b45a4a' if lo != grey(lo) else '#8a6a70'
    # philtrum
    softell(C, fx + sh * 0.6, my - r * 0.11, r * 0.035, r * 0.06, hi, 0.35 * lit, r * 0.02)
    up = (f"M{f(fx-mw)} {f(my)}Q{f(fx-mw*0.5)} {f(my-r*0.07)} {f(fx-mw*0.12)} {f(my-r*0.06)}Q{f(fx)} {f(my-r*0.04)} {f(fx+mw*0.12)} {f(my-r*0.06)}"
          f"Q{f(fx+mw*0.5)} {f(my-r*0.07)} {f(fx+mw)} {f(my)}Q{f(fx)} {f(my+r*0.01)} {f(fx-mw)} {f(my)}Z")
    C.path(up, lipc, 0.75)
    lw_ = (f"M{f(fx-mw*0.88)} {f(my+r*0.005)}Q{f(fx)} {f(my+r*0.02)} {f(fx+mw*0.88)} {f(my+r*0.005)}Q{f(fx+mw*0.4)} {f(my+r*0.12)} {f(fx)} {f(my+r*0.12)}"
           f"Q{f(fx-mw*0.4)} {f(my+r*0.12)} {f(fx-mw*0.88)} {f(my+r*0.005)}Z")
    C.path(lw_, lipc, 0.55)
    softell(C, fx + L * mw * 0.2, my + r * 0.06, mw * 0.35, r * 0.025, '#ffd8c8', 0.45 * lit, r * 0.015)
    stroke(C, f"M{f(fx-mw*1.02)} {f(my+r*0.005 - smile*r*0.05)}Q{f(fx)} {f(my+r*0.03 + smile*r*0.03)} {f(fx+mw*1.02)} {f(my - smile*r*0.05)}", '#4a1c14', max(r * 0.03, 0.9), 0.75)
    softell(C, fx, my + r * 0.2, mw * 0.5, r * 0.04, lo, 0.35, r * 0.03)
    # ---- blindfold
    if blind:
        bd = (f"M{f(cx-rx*1.08)} {f(ey-r*0.2)}Q{f(cx)} {f(ey-r*0.3)} {f(cx+rx*1.08)} {f(ey-r*0.22)}"
              f"L{f(cx+rx*1.06)} {f(ey+r*0.14)}Q{f(cx)} {f(ey+r*0.24)} {f(cx-rx*1.06)} {f(ey+r*0.15)}Z")
        C.path(bd, '#0a0608', 0.35, f' transform="translate(0 {f(r*0.05)})" filter="url(#{C.blur(r*0.05)})"')
        C.shaded(bd, blind[0], blind[1], blind[2], (cx - rx * 1.08, ey - r * 0.3, cx + rx * 1.08, ey + r * 0.24), light=(L * 0.5, -0.8), k=r * 0.08, rough=None)
        for k in range(3):
            yy = ey - r * 0.12 + k * r * 0.1
            stroke(C, f"M{f(cx-rx*0.9)} {f(yy)}Q{f(cx)} {f(yy - r*0.06 + k*r*0.02)} {f(cx+rx*0.9)} {f(yy)}", blind[2], max(r * 0.02, 0.8), 0.45)
        # knot tails on the far side
        kx = cx - L * rx * 1.05
        C.brush([(kx, ey), (kx - L * r * 0.25, ey + r * 0.35), (kx - L * r * 0.2, ey + r * 0.7)], r * 0.14, blind[1], 0.95, tin=0.1, tout=0.5)
        C.brush([(kx, ey), (kx - L * r * 0.4, ey + r * 0.2), (kx - L * r * 0.5, ey + r * 0.5)], r * 0.12, blind[2], 0.95, tin=0.1, tout=0.5)
    # ---- hair cap
    if style in ('short', 'long', 'bun', 'wavy', 'curly'):
        part = fx - L * r * 0.25
        capb = cy - r * 0.42 if style != 'curly' else cy - r * 0.5
        d = smooth_d([(cx - rx * 1.06, cy + r * 0.12), (cx - rx * 1.1, cy - r * 0.55), (cx - rx * 0.62, cy - r * 1.2), (cx + rx * 0.15, cy - r * 1.3),
                      (cx + rx * 0.9, cy - r * 1.02), (cx + rx * 1.1, cy - r * 0.45), (cx + rx * 1.06, cy + r * 0.12),
                      (cx + rx * 0.9, cy - r * 0.25), (fx + rx * 0.55, capb - r * 0.1), (part, capb - r * 0.18),
                      (fx - rx * 0.6, capb), (cx - rx * 0.92, cy - r * 0.2)], 6)
        if style == 'curly':
            d = smooth_d([(cx - rx * 1.15, cy - r * 0.0), (cx - rx * 1.3, cy - r * 0.7), (cx - rx * 0.8, cy - r * 1.3), (cx + rx * 0.1, cy - r * 1.4),
                          (cx + rx * 1.0, cy - r * 1.2), (cx + rx * 1.3, cy - r * 0.6), (cx + rx * 1.12, cy + r * 0.0),
                          (cx + rx * 0.9, cy - r * 0.38), (fx, capb - r * 0.1), (cx - rx * 0.9, cy - r * 0.38)], 6)
        C.a(f'<path d="{d}" fill="#0a0604" opacity="0.35" transform="translate({f(-L*r*0.04)} {f(r*0.05)})" filter="url(#{C.blur(r*0.06)})"/>')
        C.shaded(d, hh[0], hh[1], hh[2], (cx - rx * 1.3, cy - r * 1.4, cx + rx * 1.3, cy + r * 0.12), light=(L * 0.6, -0.7), k=r * 0.22, rough='roughf', spread=1.3)
        if style == 'curly':
            for k in range(26):
                a = C.r.uniform(math.pi * 1.0, math.pi * 2.0)
                rr = C.r.uniform(0.6, 1.0)
                x = cx + math.cos(a) * rx * 1.05 * rr
                y = cy - r * 0.45 + math.sin(a) * r * 0.85 * rr
                lv = (x - cx) * L / rx - (y - cy + r * 0.5) / r
                col = hh[0] if lv > 0.4 else hh[1] if lv > -0.3 else hh[2]
                C.ell(x, y, r * 0.11, r * 0.09, col, 0.7)
                C.ell(x + L * r * 0.03, y - r * 0.03, r * 0.05, r * 0.04, hh[0], 0.35)
        else:
            # strands flowing from the parting
            for k in range(14):
                t = k / 13
                side = -1 if t < 0.5 else 1
                x0 = part + C.r.uniform(-r * 0.05, r * 0.05)
                y0 = capb - r * 0.25
                ang = math.pi * (1.05 + t * 0.9)
                ex = cx + math.cos(ang) * rx * C.r.uniform(0.95, 1.12)
                ey2 = cy - r * 0.35 + math.sin(ang) * r * C.r.uniform(0.75, 0.95)
                mx = (x0 + ex) / 2 + side * r * 0.08
                my2 = max(min(y0, ey2) - r * 0.12, cy - r * 1.15)
                lv = (ex - cx) * L / rx
                col = hh[0] if lv > 0.3 else hh[1]
                C.brush([(x0, y0), (mx, my2), (ex, ey2)], r * C.r.uniform(0.04, 0.08), col, C.r.uniform(0.35, 0.7), tin=0.3, tout=0.5)
            # highlight sheen band
            C.brush([(cx + L * rx * 0.75, cy - r * 0.55), (cx + L * rx * 0.35, cy - r * 0.98), (cx - L * rx * 0.1, cy - r * 1.12)], r * 0.12, hh[0], 0.45, tin=0.3, tout=0.4)
            # sideburn locks breaking the outline in front of the ears
            for side in (-1, 1):
                sx = cx + side * rx * 0.95
                C.brush([(sx, cy - r * 0.4), (sx - side * r * 0.02, cy - r * 0.1), (sx - side * r * 0.04, cy + r * 0.12)], r * 0.1, hh[1], 0.9, tin=0.1, tout=0.6)
        if style in ('long', 'wavy'):
            for side in (-1, 1):
                sx = cx + side * rx * 1.05
                for k in range(3):
                    C.brush([(sx - side * k * r * 0.05, cy - r * 0.2), (sx + side * r * 0.1 - side * k * r * 0.06, cy + r * 0.6), (sx + side * r * (0.05 + k * 0.03), cy + r * 1.35)],
                            r * 0.16, hh[k % 2], 0.85, tin=0.1, tout=0.6)
    elif style == 'wrap':
        d = smooth_d([(cx - rx * 1.12, cy + r * 0.1), (cx - rx * 1.18, cy - r * 0.7), (cx - rx * 0.4, cy - r * 1.3), (cx + rx * 0.6, cy - r * 1.28),
                      (cx + rx * 1.18, cy - r * 0.7), (cx + rx * 1.12, cy + r * 0.1), (cx + rx * 0.9, cy - r * 0.38), (cx, cy - r * 0.5), (cx - rx * 0.9, cy - r * 0.38)], 6)
        C.shaded(d, hh[0], hh[1], hh[2], (cx - rx * 1.2, cy - r * 1.3, cx + rx * 1.2, cy + r * 0.1), light=(L * 0.6, -0.7), k=r * 0.25, rough='roughf')
        for k in range(5):
            x0 = cx - rx * 1.0 + k * rx * 0.48
            stroke(C, f"M{f(x0)} {f(cy-r*0.45)}Q{f(x0 + rx*0.25)} {f(cy-r*1.0)} {f(x0 + rx*0.6)} {f(cy-r*1.15)}", hh[2], r * 0.04, 0.45)
            stroke(C, f"M{f(x0+r*0.04)} {f(cy-r*0.5)}Q{f(x0 + rx*0.29)} {f(cy-r*1.0)} {f(x0 + rx*0.64)} {f(cy-r*1.16)}", hh[0], r * 0.025, 0.4)
        ball(C, cx + L * rx * 0.55, cy - r * 1.12, r * 0.24, hh[0], hh[1], hh[2], k=r * 0.08, rough=None, light=(L * 0.6, -0.7))
    elif style == 'bald':
        softell(C, cx + L * rx * 0.3, cy - r * 0.75, rx * 0.4, r * 0.15, hi, 0.5, r * 0.1)
    if style == 'bun':
        bx_, by_ = cx - facing * r * 0.3 - L * r * 0.1, cy - r * 1.32
        ball(C, bx_, by_, r * 0.36, hh[0], hh[1], hh[2], k=r * 0.12, light=(L * 0.6, -0.7))
        for k in range(4):
            a0 = k * 1.4
            stroke(C, f"M{f(bx_ + math.cos(a0)*r*0.3)} {f(by_ + math.sin(a0)*r*0.3)}Q{f(bx_)} {f(by_ - r*0.1)} {f(bx_ - math.cos(a0)*r*0.25)} {f(by_ - math.sin(a0)*r*0.2)}", hh[0], r * 0.04, 0.45)
    if beard:
        d = smooth_d([(cx - rx * 0.95, cy + r * 0.1), (cx - rx * 0.8, cy + r * 0.75), (cx - rx * 0.3, cy + r * 1.12), (cx + sh, cy + r * 1.18),
                      (cx + rx * 0.3, cy + r * 1.12), (cx + rx * 0.8, cy + r * 0.75), (cx + rx * 0.95, cy + r * 0.1), (cx + rx * 0.6, cy + r * 0.5),
                      (fx + mw * 1.3, my + r * 0.12), (fx, my + r * 0.2), (fx - mw * 1.3, my + r * 0.12), (cx - rx * 0.6, cy + r * 0.5)], 5)
        C.shaded(d, hh[0], hh[1], hh[2], (cx - rx, cy, cx + rx, cy + r * 1.18), light=(L * 0.6, -0.6), k=r * 0.15, rough='roughf')
        C.path(f"M{f(fx-mw*1.2)} {f(my-r*0.02)}Q{f(fx)} {f(my-r*0.16)} {f(fx+mw*1.2)} {f(my-r*0.02)}Q{f(fx)} {f(my-r*0.08)} {f(fx-mw*1.2)} {f(my-r*0.02)}Z", hh[1], 0.9)
    C.a('</g>')


def cuello_torso(C, cx, cy, r, skin, cloth, bottom, sw=1.75, L=-1, lean=0.0, neckline='round', band=None, waist=0.86, waist_y=None, hip=0.95, belt=None):
    """Neck from under the jaw, trapezius slope, shoulders and a garment down to `bottom` (y).
    Head centre at (cx, cy). sw = half shoulder width in units of r. lean shifts the torso bottom (px)."""
    hi, mid, lo, deep, _ = skin
    neck_w = r * 0.36
    ny0 = cy + r * 0.55
    sy = cy + r * 1.36          # shoulder line
    # neck
    nd = (f"M{f(cx-neck_w)} {f(ny0)}C{f(cx-neck_w*1.02)} {f(cy+r*1.0)} {f(cx-neck_w*1.15)} {f(cy+r*1.3)} {f(cx-neck_w*1.6)} {f(sy)}"
          f"L{f(cx+neck_w*1.6)} {f(sy)}C{f(cx+neck_w*1.15)} {f(cy+r*1.3)} {f(cx+neck_w*1.02)} {f(cy+r*1.0)} {f(cx+neck_w)} {f(ny0)}Z")
    g = C.lg([(0, hi if L < 0 else lo), (0.5, mid), (1, lo if L < 0 else hi)], cx - neck_w * 1.5, 0, cx + neck_w * 1.5, 0)
    C.path(nd, f'url(#{g})')
    # jaw cast shadow on the neck
    softell(C, cx - L * r * 0.05, cy + r * 1.0, neck_w * 1.1, r * 0.2, deep, 0.55, r * 0.07)
    # sternocleidomastoid hints
    for side in (-1, 1):
        C.brush([(cx + side * neck_w * 0.75, cy + r * 0.95), (cx + side * neck_w * 0.4, cy + r * 1.3), (cx + side * neck_w * 0.12, sy - r * 0.05)],
                r * 0.06, lo if side == -L else hi, 0.3, tin=0.3, tout=0.3)
    # garment
    hw = r * sw
    bx = cx + lean
    w_b = hw * waist
    d = (f"M{f(cx-neck_w*1.25)} {f(sy-r*0.2)}C{f(cx-hw*0.45)} {f(sy-r*0.08)} {f(cx-hw*0.88)} {f(sy+r*0.02)} {f(cx-hw)} {f(sy+r*0.42)}"
         f"C{f(cx-hw*1.04)} {f(sy+r*0.9)} {f(bx-w_b*1.02)} {f((sy+bottom)/2)} {f(bx-w_b)} {f(bottom)}"
         f"L{f(bx+w_b)} {f(bottom)}C{f(bx+w_b*1.02)} {f((sy+bottom)/2)} {f(cx+hw*1.06)} {f(sy+r*0.9)} {f(cx+hw)} {f(sy+r*0.35)}"
         f"C{f(cx+hw*0.88)} {f(sy+r*0.02)} {f(cx+hw*0.45)} {f(sy-r*0.08)} {f(cx+neck_w*1.25)} {f(sy-r*0.2)}"
         f"Q{f(cx)} {f(sy+r*0.45)} {f(cx-neck_w*1.25)} {f(sy-r*0.2)}Z")
    if waist_y:
        ww, hp = hw * waist, hw * hip
        d = (f"M{f(cx-neck_w*1.25)} {f(sy-r*0.2)}C{f(cx-hw*0.45)} {f(sy-r*0.08)} {f(cx-hw*0.88)} {f(sy+r*0.02)} {f(cx-hw)} {f(sy+r*0.42)}"
             f"C{f(cx-hw*1.03)} {f(sy+r*1.3)} {f(bx-ww*1.0)} {f(waist_y-r*0.9)} {f(bx-ww)} {f(waist_y)}"
             f"C{f(bx-ww*1.0)} {f(waist_y+r*0.6)} {f(bx-hp)} {f(waist_y+r*1.0)} {f(bx-hp*1.02)} {f(bottom)}"
             f"L{f(bx+hp*1.02)} {f(bottom)}C{f(bx+hp)} {f(waist_y+r*1.0)} {f(bx+ww*1.0)} {f(waist_y+r*0.6)} {f(bx+ww)} {f(waist_y)}"
             f"C{f(bx+ww*1.0)} {f(waist_y-r*0.9)} {f(cx+hw*1.03)} {f(sy+r*1.3)} {f(cx+hw)} {f(sy+r*0.42)}"
             f"C{f(cx+hw*0.88)} {f(sy+r*0.02)} {f(cx+hw*0.45)} {f(sy-r*0.08)} {f(cx+neck_w*1.25)} {f(sy-r*0.2)}"
             f"Q{f(cx)} {f(sy+r*0.45)} {f(cx-neck_w*1.25)} {f(sy-r*0.2)}Z")
    pid, cid = C.shaded(d, cloth[0], cloth[1], cloth[2], (cx - hw, sy - r * 0.2, cx + hw, bottom), light=(L * 0.6, -0.6), k=hw * 0.35, deep=cloth[3] if len(cloth) > 3 else None)
    if waist_y:
        C.clip_open(cid)
        # chest volume and the drape below the belt
        softell(C, cx + L * hw * 0.35, sy + r * 1.1, hw * 0.35, r * 0.6, cloth[0], 0.3, r * 0.3)
        softell(C, cx - L * hw * 0.2, waist_y - r * 0.4, hw * 0.6, r * 0.3, cloth[2], 0.35, r * 0.25)
        for k in range(4):
            x0 = bx - hp * 0.6 + k * hp * 0.4
            C.brush([(x0, waist_y + r * 0.3), (x0 + (x0 - bx) * 0.15, (waist_y + bottom) / 2), (x0 + (x0 - bx) * 0.3, bottom)], r * 0.14, cloth[2], 0.35, tin=0.3, tout=0)
            C.brush([(x0 + L * r * 0.12, waist_y + r * 0.35), (x0 + L * r * 0.12 + (x0 - bx) * 0.15, (waist_y + bottom) / 2)], r * 0.07, cloth[0], 0.3, tin=0.3, tout=0.3)
        if belt:
            bd = (f"M{f(bx-ww*1.05)} {f(waist_y-r*0.2)}Q{f(bx)} {f(waist_y-r*0.05)} {f(bx+ww*1.05)} {f(waist_y-r*0.2)}"
                  f"L{f(bx+ww*1.05)} {f(waist_y+r*0.22)}Q{f(bx)} {f(waist_y+r*0.37)} {f(bx-ww*1.05)} {f(waist_y+r*0.22)}Z")
            C.shaded(bd, belt[0], belt[1], belt[2], (bx - ww, waist_y - r * 0.2, bx + ww, waist_y + r * 0.37), light=(L * 0.6, -0.6), k=r * 0.1, rough=None)
            if len(belt) > 3:
                for k in range(5):
                    x = bx - ww * 0.7 + k * ww * 0.35
                    C.diamond(x, waist_y + r * 0.03 + abs(x - bx) / ww * r * 0.05 - r * 0.02, r * 0.26, r * 0.3, belt[3], belt[2], op=0.95)
        C.close()
    C.clip_open(cid)
    # folds: from the far shoulder toward the waist, and under the chest
    for k in range(3):
        sx = cx + (k - 1) * hw * 0.55
        C.brush([(sx, sy + r * 0.6), (sx + (bx - sx) * 0.3 + C.r.uniform(-4, 4), (sy + bottom) / 2), (bx + (sx - cx) * 0.4, bottom)], r * 0.12, cloth[2], 0.28, tin=0.4, tout=0.2)
        C.brush([(sx + L * r * 0.08, sy + r * 0.65), (sx + (bx - sx) * 0.3 + L * r * 0.1, (sy + bottom) / 2)], r * 0.06, cloth[0], 0.25, tin=0.4, tout=0.5)
    # shoulder top light
    C.brush([(cx + L * neck_w * 1.4, sy - r * 0.1), (cx + L * hw * 0.6, sy - r * 0.02), (cx + L * hw * 0.95, sy + r * 0.3)], r * 0.18, cloth[0], 0.4, tin=0.3, tout=0.3)
    if band:
        by = sy + r * 0.35
        n = 7
        for k in range(n):
            bxk = cx - hw * 0.62 + (k + 0.5) * hw * 1.24 / n
            yk = by + abs(bxk - cx) / hw * r * 0.12
            C.diamond(bxk, yk, r * 0.22, r * 0.26, band[0], band[1], op=0.9)
        for o in (-1, 1):
            stroke(C, f"M{f(cx-hw*0.7)} {f(by+o*r*0.17+r*0.06)}Q{f(cx)} {f(by+o*r*0.17-r*0.02)} {f(cx+hw*0.7)} {f(by+o*r*0.17+r*0.06)}", band[0], max(r * 0.03, 0.9), 0.55)
    C.close()
    # neckline edge
    stroke(C, f"M{f(cx-neck_w*1.25)} {f(sy-r*0.2)}Q{f(cx)} {f(sy+r*0.45)} {f(cx+neck_w*1.25)} {f(sy-r*0.2)}", cloth[2], r * 0.07, 0.7)
    stroke(C, f"M{f(cx-neck_w*1.2)} {f(sy-r*0.16)}Q{f(cx)} {f(sy+r*0.42)} {f(cx+neck_w*1.2)} {f(sy-r*0.16)}", cloth[0], r * 0.025, 0.5)
    return (cx - hw * 0.76, sy + r * 0.22), (cx + hw * 0.76, sy + r * 0.22)


def brazo(C, pts, r, cloth, skin, L=-1, sleeve=0.8, bare_from=None):
    """Arm through shoulder, elbow, wrist. Sleeve covers the first `sleeve` fraction; bare forearm skin after."""
    w0, w1 = r * 0.6, r * 0.4
    d = taper_d(pts, w0, w1)
    C.path(d, '#120a10', 0.25, f' transform="translate({f(-L*4)} 6)" filter="url(#{C.blur(5)})"')
    # bare skin underneath the whole arm
    C.shaded(d, skin[0], skin[1], skin[2], bbox(pts, w0 / 2), light=(L * 0.6, -0.6), k=w0 * 0.3, deep=skin[3], rough=None)
    # sleeve, with a rounded shoulder cap
    dense = catmull(pts, 8)
    n = max(2, int(len(dense) * sleeve))
    sl = dense[:n]
    ws = w0 * 1.08
    we = (w0 + (w1 - w0) * sleeve) * 1.15
    ux0, uy0 = sl[1][0] - sl[0][0], sl[1][1] - sl[0][1]
    l0 = math.hypot(ux0, uy0) or 1
    back = (sl[0][0] - ux0 / l0 * ws * 0.35, sl[0][1] - uy0 / l0 * ws * 0.35)   # start a little inside the shoulder
    ds = taper_d([back, sl[0], sl[len(sl) // 2], sl[-1]], ws * 0.8, we)
    C.shaded(ds, cloth[0], cloth[1], cloth[2], bbox(sl, ws / 2), light=(L * 0.6, -0.6), k=ws * 0.33, deep=cloth[3] if len(cloth) > 3 else None)
    C.brush([(x + L * ws * 0.15, y - ws * 0.15) for x, y in sl[::2]], ws * 0.16, cloth[0], 0.35, tin=0.2, tout=0.3)
    # soft dark edges along the sleeve (not around the shoulder) to part it from the torso
    n2 = len(sl)
    for sgn in (-1, 1):
        edge = []
        for i in range(max(1, n2 // 4), n2, 2):
            x, y = sl[i]
            px, py = sl[i - 1]
            tx, ty = x - px, y - py
            l = math.hypot(tx, ty) or 1
            wloc = (ws + (we - ws) * i / max(1, n2 - 1)) / 2 * 0.92
            edge.append((x - ty / l * wloc * sgn, y + tx / l * wloc * sgn))
        if len(edge) >= 2:
            C.brush(edge, r * 0.05, cloth[3] if len(cloth) > 3 else cloth[2], 0.35, tin=0.4, tout=0.1)
    # cuff
    ex, ey = sl[-1]
    px, py = sl[-2]
    ang = math.degrees(math.atan2(ey - py, ex - px))
    C.ell(ex, ey, we * 0.12, we * 0.5, cloth[2], 0.9, f' transform="rotate({f(ang)} {f(ex)} {f(ey)})"')
    if len(pts) >= 3:
        x, y = pts[1]
        C.brush([(x - ws * 0.3, y - ws * 0.05), (x, y + ws * 0.1), (x + ws * 0.25, y)], ws * 0.12, cloth[2], 0.45, tin=0.3, tout=0.3)


def mano(C, x, y, s, ang, skin, thumb=1, curl=0.0, spread=0.0, L=-1):
    """Hand: wrist at (x, y), pointing along ang (deg). s = hand length (wrist to fingertip).
    thumb=+1 puts the thumb on the left of the pointing direction. curl 0..1 bends the fingers."""
    hi, mid, lo, deep, _ = skin
    C.a(f'<g transform="translate({f(x)} {f(y)}) rotate({f(ang)})">')
    pw = s * 0.24  # half palm width
    # thumb
    t0 = (s * 0.12, -thumb * pw * 0.8)
    t1 = (s * 0.32, -thumb * pw * 1.45)
    t2 = (s * 0.52, -thumb * pw * (1.55 - curl * 0.6))
    C.path(taper_d([t0, t1, t2], s * 0.17, s * 0.1), lo)
    C.path(taper_d([t0, t1, t2], s * 0.11, s * 0.06), mid, 0.9, f' transform="translate({f(-s*0.01)} {f(-thumb*s*0.012)})"')
    C.ell(t2[0] - s * 0.02, t2[1], s * 0.03, s * 0.022, hi, 0.5)
    # palm
    palm = smooth_d([(0, -pw * 0.7), (s * 0.2, -pw * 1.0), (s * 0.48, -pw * 1.02), (s * 0.52, 0), (s * 0.48, pw * 1.0), (s * 0.2, pw * 0.98), (0, pw * 0.7)], 5)
    g = C.lg([(0, hi), (0.6, mid), (1, lo)], 0, -thumb * pw * 1.2, 0, thumb * pw * 1.2)
    C.path(palm, f'url(#{g})')
    # fingers (index nearest the thumb)
    fl = [0.47, 0.52, 0.49, 0.38]
    for i, yo in enumerate([-0.68, -0.23, 0.22, 0.66]):
        yy = yo * pw * thumb
        Lf = s * fl[i]
        base = (s * 0.47, yy)
        sp = (i - 1.5) * spread * 0.08
        a1 = sp + curl * 0.6
        a2 = sp + curl * 1.5
        k1 = (base[0] + Lf * 0.5 * math.cos(a1), base[1] + Lf * 0.5 * math.sin(a1) * thumb)
        k2 = (k1[0] + Lf * 0.5 * math.cos(a2), k1[1] + Lf * 0.5 * math.sin(a2) * thumb)
        fw = s * (0.165 if i < 3 else 0.135)
        C.path(taper_d([base, k1, k2], fw, fw * 0.72), lo)
        C.path(taper_d([base, k1, k2], fw * 0.72, fw * 0.5), mid, 0.95, f' transform="translate(0 {f(-thumb*fw*0.08)})"')
        C.ell(k1[0], k1[1], fw * 0.2, fw * 0.28, hi, 0.35)
        C.ell(k2[0] - fw * 0.1, k2[1], fw * 0.18, fw * 0.16, hi, 0.4)
    # knuckle row and tendon light
    for i, yo in enumerate([-0.68, -0.23, 0.22, 0.66]):
        C.ell(s * 0.45, yo * pw * thumb, s * 0.04, s * 0.05, hi, 0.4)
    C.brush([(s * 0.05, 0), (s * 0.25, -thumb * pw * 0.1), (s * 0.42, -thumb * pw * 0.2)], s * 0.08, hi, 0.25, tin=0.3, tout=0.3)
    C.a('</g>')


def nuca(C, cx, cy, r, skin, hair, L=-1, style='short', tilt=0.0, neck=True):
    """Head seen from behind: neck, ears and the hair mass."""
    hi, mid, lo, deep, _ = skin
    hh = hair
    rx = r * 0.76
    C.a(f'<g transform="rotate({f(tilt)} {f(cx)} {f(cy + r*0.9)})">')
    # nape
    nw = r * 0.4
    nd = (f"M{f(cx-nw)} {f(cy+r*0.3)}C{f(cx-nw)} {f(cy+r*0.9)} {f(cx-nw*1.2)} {f(cy+r*1.2)} {f(cx-nw*1.7)} {f(cy+r*1.45)}"
          f"L{f(cx+nw*1.7)} {f(cy+r*1.45)}C{f(cx+nw*1.2)} {f(cy+r*1.2)} {f(cx+nw)} {f(cy+r*0.9)} {f(cx+nw)} {f(cy+r*0.3)}Z")
    g = C.lg([(0, hi if L < 0 else lo), (0.5, mid), (1, lo if L < 0 else hi)], cx - nw * 1.5, 0, cx + nw * 1.5, 0)
    if neck:
        C.path(nd, f'url(#{g})')
        C.brush([(cx, cy + r * 0.7), (cx, cy + r * 1.35)], r * 0.08, lo, 0.4, tin=0.3, tout=0.3)
    # ears
    for side in (-1, 1):
        ex = cx + side * rx * 0.95
        C.ell(ex, cy + r * 0.12, r * 0.14, r * 0.25, mid)
        C.ell(ex - side * r * 0.03, cy + r * 0.12, r * 0.06, r * 0.15, lo, 0.6)
        C.ell(ex + side * r * 0.03, cy + r * 0.05, r * 0.05, r * 0.12, hi, 0.5)
    # hair mass
    if style == 'curly':
        d = smooth_d([(cx - rx * 1.15, cy + r * 0.25), (cx - rx * 1.3, cy - r * 0.6), (cx - rx * 0.6, cy - r * 1.3), (cx + rx * 0.5, cy - r * 1.32),
                      (cx + rx * 1.3, cy - r * 0.6), (cx + rx * 1.15, cy + r * 0.25), (cx + rx * 0.6, cy + r * 0.62), (cx - rx * 0.6, cy + r * 0.62)], 6)
    else:
        d = smooth_d([(cx - rx * 1.04, cy + r * 0.15), (cx - rx * 1.1, cy - r * 0.6), (cx - rx * 0.55, cy - r * 1.2), (cx + rx * 0.4, cy - r * 1.22),
                      (cx + rx * 1.1, cy - r * 0.6), (cx + rx * 1.04, cy + r * 0.15), (cx + rx * 0.7, cy + r * 0.5), (cx, cy + r * 0.62), (cx - rx * 0.7, cy + r * 0.5)], 6)
    C.a(f'<path d="{d}" fill="#0a0604" opacity="0.4" transform="translate(0 {f(r*0.08)})" filter="url(#{C.blur(r*0.08)})"/>')
    C.shaded(d, hh[0], hh[1], hh[2], (cx - rx * 1.3, cy - r * 1.32, cx + rx * 1.3, cy + r * 0.62), light=(L * 0.5, -0.8), k=r * 0.25, rough='roughf', spread=1.3)
    if style == 'curly':
        for k in range(34):
            a = C.r.uniform(0, math.tau); rr = math.sqrt(C.r.uniform(0, 1))
            x = cx + math.cos(a) * rx * 1.1 * rr
            y = cy - r * 0.35 + math.sin(a) * r * 0.9 * rr
            lv = (x - cx) * L / rx - (y - cy + r * 0.5) / r
            col = hh[0] if lv > 0.5 else hh[1] if lv > -0.3 else hh[2]
            C.ell(x, y, r * 0.12, r * 0.1, col, 0.6)
    else:
        whorl = (cx + r * 0.1, cy - r * 0.75)
        for k in range(18):
            a = -math.pi + k / 17 * math.pi * 2
            ex = cx + math.cos(a * 0.5 + math.pi * 0.75) * rx * 1.0
            ey = cy + r * 0.35 + math.sin(a * 0.3) * r * 0.2
            ex = cx - rx * 0.95 + k / 17 * rx * 1.9
            ey = cy + r * 0.45 - abs(ex - cx) / rx * r * 0.3
            mx = (whorl[0] + ex) / 2 + (ex - cx) * 0.25
            my = (whorl[1] + ey) / 2
            lv = (ex - cx) * L / rx
            col = hh[0] if lv > 0.35 else hh[1] if lv > -0.4 else hh[2]
            C.brush([whorl, (mx, my), (ex, ey)], r * C.r.uniform(0.05, 0.09), col, C.r.uniform(0.4, 0.7), tin=0.4, tout=0.4)
        C.brush([(cx + L * rx * 0.8, cy - r * 0.3), (cx + L * rx * 0.5, cy - r * 0.95), (cx, cy - r * 1.15)], r * 0.14, hh[0], 0.35, tin=0.3, tout=0.4)
    C.a('</g>')


def espalda(C, cx, cy, r, cloth, bottom, sw=1.75, L=-1):
    """Shoulders and back seen from behind, from the nape down to `bottom`."""
    sy = cy + r * 1.36
    hw = r * sw
    d = (f"M{f(cx-r*0.55)} {f(sy-r*0.12)}C{f(cx-hw*0.5)} {f(sy-r*0.05)} {f(cx-hw*0.9)} {f(sy+r*0.05)} {f(cx-hw)} {f(sy+r*0.45)}"
         f"C{f(cx-hw*1.05)} {f(sy+r*1.2)} {f(cx-hw*0.9)} {f(bottom-r)} {f(cx-hw*0.85)} {f(bottom)}"
         f"L{f(cx+hw*0.85)} {f(bottom)}C{f(cx+hw*0.9)} {f(bottom-r)} {f(cx+hw*1.05)} {f(sy+r*1.2)} {f(cx+hw)} {f(sy+r*0.45)}"
         f"C{f(cx+hw*0.9)} {f(sy+r*0.05)} {f(cx+hw*0.5)} {f(sy-r*0.05)} {f(cx+r*0.55)} {f(sy-r*0.12)}Q{f(cx)} {f(sy+r*0.08)} {f(cx-r*0.55)} {f(sy-r*0.12)}Z")
    pid, cid = C.shaded(d, cloth[0], cloth[1], cloth[2], (cx - hw, sy, cx + hw, bottom), light=(L * 0.6, -0.7), k=hw * 0.35, deep=cloth[3] if len(cloth) > 3 else None)
    C.clip_open(cid)
    # spine groove and shoulder blades
    C.brush([(cx, sy + r * 0.2), (cx + 2, (sy + bottom) / 2), (cx, bottom)], r * 0.12, cloth[2], 0.4, tin=0.2, tout=0.2)
    for side in (-1, 1):
        C.brush([(cx + side * hw * 0.25, sy + r * 0.6), (cx + side * hw * 0.55, sy + r * 1.1), (cx + side * hw * 0.4, sy + r * 1.8)], r * 0.12, cloth[2], 0.3, tin=0.3, tout=0.3)
        C.brush([(cx + side * hw * 0.3, sy + r * 0.55), (cx + side * hw * 0.62, sy + r * 0.9)], r * 0.1, cloth[0], 0.3, tin=0.3, tout=0.3)
    C.close()
    stroke(C, f"M{f(cx-r*0.55)} {f(sy-r*0.12)}Q{f(cx)} {f(sy+r*0.08)} {f(cx+r*0.55)} {f(sy-r*0.12)}", cloth[2], r * 0.06, 0.7)
    return (cx - hw * 0.76, sy + r * 0.22), (cx + hw * 0.76, sy + r * 0.22)



def lienzo(seed):
    """Canvas with a softer wall grain than Diseno 1/2."""
    C = Canvas(seed=seed)
    C.defs = [d.replace('values="0.6 0 0 0 0.2 0.6 0 0 0 0.2 0.6 0 0 0 0.2 0 0 0 0 1"', 'values="0.4 0 0 0 0.3 0.4 0 0 0 0.3 0.4 0 0 0 0.3 0 0 0 0 1"')
               .replace('values="0.4 0.4 0.4 0 -0.22 0.4 0.4 0.4 0 -0.22 0.4 0.4 0.4 0 -0.22 0 0 0 0 1"', 'values="0.3 0.3 0.3 0 -0.15 0.3 0.3 0.3 0 -0.15 0.3 0.3 0.3 0 -0.15 0 0 0 0 1"')
               for d in C.defs]
    return C


def tube_d(pts, ws, n=8):
    """Closed outline along a smooth spine through pts, width interpolated through ws (one per point)."""
    dense = catmull(pts, n)
    seg = len(pts) - 1
    L_, R_ = [], []
    for k, (x, y) in enumerate(dense):
        t = k / max(1, len(dense) - 1) * seg
        i = min(int(t), seg - 1)
        u = t - i
        w = (ws[i] + (ws[i + 1] - ws[i]) * u) / 2
        a = dense[max(k - 1, 0)]
        b = dense[min(k + 1, len(dense) - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        l = math.hypot(tx, ty) or 1
        nx, ny = -ty / l, tx / l
        L_.append((x + nx * w, y + ny * w))
        R_.append((x - nx * w, y - ny * w))
    return poly_d(L_ + R_[::-1])


def brazo2(C, sh, el, wr, r, cloth, skin, L=-1, sleeve='short'):
    """Arm with a real elbow: upper arm, elbow knob and a forearm that swells below the elbow and narrows at the wrist.
    sleeve: 'short' (to mid upper arm), 'elbow' (to just below the elbow) or 'long' (to the wrist)."""
    hi, mid, lo, deep, _ = skin
    def along(a, b, t):
        return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    ux, uy = el[0] - sh[0], el[1] - sh[1]
    l0 = math.hypot(ux, uy) or 1
    back = (sh[0] - ux / l0 * r * 0.2, sh[1] - uy / l0 * r * 0.2)
    upper = tube_d([back, sh, along(sh, el, 0.6), el], [r * 0.66, r * 0.82, r * 0.72, r * 0.58])
    fore_pts = [along(wr, el, 1.08), el, along(el, wr, 0.28), along(el, wr, 0.7), wr]
    fore = tube_d(fore_pts, [r * 0.42, r * 0.58, r * 0.7, r * 0.56, r * 0.46])
    for d in (upper, fore):
        C.path(d, '#120a10', 0.22, f' transform="translate({f(-L*4)} 6)" filter="url(#{C.blur(5)})"')
    C.shaded(upper, hi, mid, lo, bbox([back, sh, el], r * 0.45), light=(L * 0.6, -0.6), k=r * 0.16, deep=deep, rough=None, hl=False)
    C.shaded(fore, hi, mid, lo, bbox(fore_pts, r * 0.4), light=(L * 0.6, -0.6), k=r * 0.14, deep=deep, rough=None, hl=False)
    # elbow knob and the crease on its inner side
    C.ell(el[0], el[1], r * 0.17, r * 0.13, hi, 0.35, f' filter="url(#{C.blur(r*0.05)})"')
    # muscle of the forearm: light along its top, a soft groove below
    C.brush([along(el, wr, 0.12), along(el, wr, 0.35), along(el, wr, 0.75)], r * 0.12, hi, 0.3, tin=0.3, tout=0.5)
    C.brush([along(el, wr, 0.3), along(el, wr, 0.6), along(el, wr, 0.9)], r * 0.06, lo, 0.25, tin=0.3, tout=0.4)
    # sleeve
    if sleeve == 'long':
        sp = [back, sh, el, along(el, wr, 0.5), along(el, wr, 0.88)]
        sw_ = [r * 0.8, r * 0.94, r * 0.8, r * 0.78, r * 0.66]
    elif sleeve == 'elbow':
        sp = [back, sh, along(sh, el, 0.6), el, along(el, wr, 0.15)]
        sw_ = [r * 0.7, r * 0.84, r * 0.76, r * 0.7, r * 0.68]
    else:
        sp = [back, sh, along(sh, el, 0.5)]
        sw_ = [r * 0.72, r * 0.86, r * 0.78]
    ds = tube_d(sp, sw_)
    C.shaded(ds, cloth[0], cloth[1], cloth[2], bbox(sp, r * 0.4), light=(L * 0.6, -0.6), k=r * 0.22, deep=cloth[3] if len(cloth) > 3 else None, hl=False)
    C.brush([(x + L * r * 0.12, y - r * 0.1) for x, y in sp[1:]], r * 0.1, cloth[0], 0.15, tin=0.2, tout=0.3)
    if len(sp) >= 4:  # folds where the sleeve bends at the elbow
        ex, ey = sp[-2] if sleeve == 'long' else sp[-2]
        C.brush([(ex - r * 0.25, ey - r * 0.1), (ex, ey + r * 0.08), (ex + r * 0.22, ey - r * 0.05)], r * 0.08, cloth[2], 0.5, tin=0.3, tout=0.3)
    # hem
    hx, hy = sp[-1]
    px, py = sp[-2]
    ang = math.degrees(math.atan2(hy - py, hx - px))
    C.ell(hx, hy, r * 0.07, sw_[-1] * 0.5, cloth[2], 0.85, f' transform="rotate({f(ang)} {f(hx)} {f(hy)})"')
