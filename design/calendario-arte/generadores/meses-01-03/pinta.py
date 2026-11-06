"""Small helper library to generate painterly mural-style SVGs (1485x850)."""
import math, random

W, H = 1485, 850


def f(x):
    s = f"{x:.1f}"
    if s.endswith('.0'):
        s = s[:-2]
    if s == '-0':
        s = '0'
    return s


def catmull(pts, n=6):
    if len(pts) < 2:
        return list(pts)
    P = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            xy = []
            for j in (0, 1):
                xy.append(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t
                                 + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                                 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))
            out.append(tuple(xy))
    out.append(tuple(pts[-1]))
    return out


def poly_d(pts, close=True):
    s = "M" + f(pts[0][0]) + " " + f(pts[0][1]) + "L" + " ".join(f(x) + " " + f(y) for x, y in pts[1:])
    return s + ("Z" if close else "")


def smooth_d(pts, n=5, close=True):
    """Closed smooth outline through pts (Catmull-Rom, wraps)."""
    if close:
        ext = [pts[-1]] + list(pts) + [pts[0], pts[1]]
        dense = []
        for i in range(1, len(ext) - 2):
            seg = catmull([ext[i - 1], ext[i], ext[i + 1], ext[i + 2]], n)
            # catmull with 4 pts gives segments for p1->p2 ... take middle segment
            dense += seg[n:2 * n]
        return poly_d(dense, True)
    return poly_d(catmull(pts, n), False)


class Canvas:
    def __init__(self, seed=1):
        self.defs = []
        self.out = []
        self.n = 0
        self.r = random.Random(seed)
        self._blur = {}
        self.defs.append(
            '<filter id="rough" x="-5%" y="-5%" width="110%" height="110%">'
            '<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4"/>'
            '<feDisplacementMap in="SourceGraphic" scale="9" xChannelSelector="R" yChannelSelector="G"/></filter>')
        self.defs.append(
            '<filter id="roughf" x="-5%" y="-5%" width="110%" height="110%">'
            '<feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="9"/>'
            '<feDisplacementMap in="SourceGraphic" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>')
        self.defs.append(
            f'<filter id="wall" x="0" y="0" width="{W}" height="{H}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">'
            '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" result="t1"/>'
            '<feTurbulence type="fractalNoise" baseFrequency="0.005 0.008" numOctaves="4" seed="11" result="t2"/>'
            '<feColorMatrix in="t2" type="matrix" values="0.4 0.4 0.4 0 -0.22 0.4 0.4 0.4 0 -0.22 0.4 0.4 0.4 0 -0.22 0 0 0 0 1" result="g2"/>'
            '<feBlend in="g2" in2="SourceGraphic" mode="soft-light" result="b1"/>'
            '<feColorMatrix in="t1" type="matrix" values="0.4 0 0 0 0.3 0.4 0 0 0 0.3 0.4 0 0 0 0.3 0 0 0 0 1" result="g3"/>'
            '<feBlend in="g3" in2="b1" mode="soft-light" result="b2"/>'
            '<feComposite in="b2" in2="SourceAlpha" operator="in"/></filter>')

    def id(self, p='i'):
        self.n += 1
        return f"{p}{self.n}"

    def a(self, s):
        self.out.append(s)

    def blur(self, sd):
        sd = round(sd, 1)
        if sd not in self._blur:
            i = self.id('b')
            self.defs.append(f'<filter id="{i}" x="-50%" y="-50%" width="200%" height="200%">'
                             f'<feGaussianBlur stdDeviation="{f(sd)}"/></filter>')
            self._blur[sd] = i
        return self._blur[sd]

    def _stops(self, stops):
        s = ''
        for st in stops:
            o, c = st[0], st[1]
            op = st[2] if len(st) > 2 else 1
            s += f'<stop offset="{f(o) if o not in (0, 1) else o}" stop-color="{c}"' + (f' stop-opacity="{op}"' if op != 1 else '') + '/>'
        return s

    def rg(self, stops, cx, cy, r, fx=None, fy=None):
        i = self.id('g')
        ff = ''
        if fx is not None:
            ff = f' fx="{f(fx)}" fy="{f(fy)}"'
        self.defs.append(f'<radialGradient id="{i}" gradientUnits="userSpaceOnUse" cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}"{ff}>'
                         + self._stops(stops) + '</radialGradient>')
        return i

    def lg(self, stops, x1, y1, x2, y2):
        i = self.id('g')
        self.defs.append(f'<linearGradient id="{i}" gradientUnits="userSpaceOnUse" x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}">'
                         + self._stops(stops) + '</linearGradient>')
        return i

    # ---------- primitives ----------
    def path(self, d, fill, op=1, extra=''):
        o = f' opacity="{f(op) if op>=0.1 else round(op,2)}"' if op != 1 else ''
        self.a(f'<path d="{d}" fill="{fill}"{o}{extra}/>')

    def ell(self, cx, cy, rx, ry, fill, op=1, extra=''):
        o = f' opacity="{round(op,2)}"' if op != 1 else ''
        self.a(f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" fill="{fill}"{o}{extra}/>')

    def glow(self, cx, cy, r, color, op=0.6, sd=None):
        g = self.rg([(0, color, op), (0.5, color, op * 0.35), (1, color, 0)], cx, cy, r)
        self.a(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="url(#{g})"/>')

    def stroke_d(self, pts, w, tin=0.2, tout=0.35, wob=0.25, n=5, minw=0.0):
        dense = catmull(pts, n)
        cum = [0]
        for i in range(1, len(dense)):
            cum.append(cum[-1] + math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]))
        tot = cum[-1] or 1
        L, R = [], []
        ph = self.r.random() * 6
        for i, (x, y) in enumerate(dense):
            a = dense[max(i - 1, 0)]
            b = dense[min(i + 1, len(dense) - 1)]
            tx, ty = b[0] - a[0], b[1] - a[1]
            l = math.hypot(tx, ty) or 1
            nx, ny = -ty / l, tx / l
            s = cum[i] / tot
            p = 1.0
            if tin > 0:
                p = min(p, s / tin)
            if tout > 0:
                p = min(p, (1 - s) / tout)
            p = max(p, 0) ** 0.7
            ww = max(w * p * (1 + wob * math.sin(ph + s * 9)), minw) / 2
            L.append((x + nx * ww, y + ny * ww))
            R.append((x - nx * ww, y - ny * ww))
        return poly_d(L + R[::-1])

    def brush(self, pts, w, color, op=1, extra='', **kw):
        self.path(self.stroke_d(pts, w, **kw), color, op, extra)

    def line(self, pts, w, color, op=1, extra='', cap='round', n=5):
        d = poly_d(catmull(pts, n), False) if len(pts) > 2 else poly_d(pts, False)
        o = f' opacity="{round(op,2)}"' if op != 1 else ''
        self.a(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{f(w)}" stroke-linecap="{cap}" stroke-linejoin="round"{o}{extra}/>')

    def shaded(self, d, hi, mid, lo, bbox, light=(-0.6, -0.8), k=None, deep=None, refl=None,
               rim=True, hl=True, extra='', hipos=0.45, spread=1.5, rough='roughf'):
        """Volumetric fill: radial gradient + inner form shadow + highlight + reflected rim."""
        x0, y0, x1, y1 = bbox
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        R = max(x1 - x0, y1 - y0) / 2
        lx, ly = light
        pid = self.id('p')
        cid = self.id('c')
        self.defs.append(f'<path id="{pid}" d="{d}"/>')
        self.defs.append(f'<clipPath id="{cid}"><use href="#{pid}"/></clipPath>')
        g = self.rg([(0, hi), (0.4, mid), (1, lo)], cx + lx * R * hipos, cy + ly * R * hipos, R * spread)
        rf = f' filter="url(#{rough})"' if rough and 'filter=' not in extra else ''
        self.a(f'<use href="#{pid}" fill="url(#{g})"{extra}{rf}/>')
        k = k or R * 0.28
        self.a(f'<g clip-path="url(#{cid})">')
        dp = deep or lo
        self.a(f'<use href="#{pid}" transform="translate({f(lx*k)} {f(ly*k)})" fill="none" stroke="{dp}" '
               f'stroke-width="{f(k*1.7)}" opacity="0.75" filter="url(#{self.blur(k*0.45)})"/>')
        if hl:
            self.a(f'<use href="#{pid}" transform="translate({f(-lx*k*0.55)} {f(-ly*k*0.55)})" fill="none" stroke="{hi}" '
                   f'stroke-width="{f(k*0.7)}" opacity="0.55" filter="url(#{self.blur(k*0.3)})"/>')
        if rim:
            rc = refl or mid
            self.a(f'<use href="#{pid}" transform="translate({f(lx*k*0.12)} {f(ly*k*0.12)})" fill="none" stroke="{rc}" '
                   f'stroke-width="{f(k*0.22)}" opacity="0.5" filter="url(#{self.blur(max(k*0.08,0.6))})"/>')
        self.a('</g>')
        return pid, cid

    def clip_open(self, cid):
        self.a(f'<g clip-path="url(#{cid})">')

    def close(self):
        self.a('</g>')

    def shadow(self, cx, cy, rx, ry, op=0.45, color='#1a1020', sd=None):
        sd = sd or ry * 0.6
        self.a(f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" fill="{color}" opacity="{op}" filter="url(#{self.blur(sd)})"/>')

    def diamond(self, cx, cy, w, h, light, dark, hl=None, rot=0, op=1):
        """Faceted rhombus: two light facets, two dark facets."""
        t = f' transform="rotate({f(rot)} {f(cx)} {f(cy)})"' if rot else ''
        o = f' opacity="{round(op,2)}"' if op != 1 else ''
        T, B, Lp, Rp, C = (cx, cy - h / 2), (cx, cy + h / 2), (cx - w / 2, cy), (cx + w / 2, cy), (cx, cy)
        self.a(f'<g{t}{o}><path d="{poly_d([T,Lp,C])}" fill="{hl or light}"/><path d="{poly_d([T,Rp,C])}" fill="{light}"/>'
               f'<path d="{poly_d([Lp,B,C])}" fill="{dark}" opacity="0.8"/><path d="{poly_d([Rp,B,C])}" fill="{dark}"/></g>')

    def tri(self, pts, fill, op=1):
        self.path(poly_d(pts), fill, op)

    def eye(self, cx, cy, rx, ry, iris, iris_dark, lid=0.35, rot=0, lidcol='#5a3420', white='#f3ead8', lash='#2a160c'):
        """Almond eye with iris, pupil, highlight and upper lid covering `lid` fraction."""
        e = self.id('p')
        c = self.id('c')
        d = (f"M{f(cx-rx)} {f(cy)}Q{f(cx)} {f(cy-ry*2)} {f(cx+rx)} {f(cy)}Q{f(cx)} {f(cy+ry*1.6)} {f(cx-rx)} {f(cy)}Z")
        t = f' transform="rotate({f(rot)} {f(cx)} {f(cy)})"' if rot else ''
        self.defs.append(f'<path id="{e}" d="{d}"/>')
        self.defs.append(f'<clipPath id="{c}"><use href="#{e}"{t}/></clipPath>')
        wg = self.rg([(0, white), (1, '#b8a890')], cx - rx * 0.2, cy - ry * 0.3, rx * 1.1)
        self.a(f'<use href="#{e}" fill="url(#{wg})"{t}/>')
        self.a(f'<g clip-path="url(#{c})">')
        ir = ry * 0.95
        ig = self.rg([(0, '#fff0b0'), (0.25, iris), (0.85, iris_dark), (1, '#1a0f08')], cx, cy, ir)
        self.a(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(ir)}" fill="url(#{ig})"/>')
        # radial iris fibres
        for k in range(14):
            an = k / 14 * math.tau
            self.a(f'<path d="M{f(cx+math.cos(an)*ir*0.4)} {f(cy+math.sin(an)*ir*0.4)}L{f(cx+math.cos(an)*ir*0.9)} {f(cy+math.sin(an)*ir*0.9)}" stroke="{iris_dark}" stroke-width="{f(ir*0.06)}" opacity="0.5"/>')
        self.a(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(ir*0.4)}" fill="#0c0806"/>')
        # lid shadow and lid
        self.a(f'<rect x="{f(cx-rx)}" y="{f(cy-ry*2)}" width="{f(rx*2)}" height="{f(ry*(1+lid*2)+ry*0.25)}" fill="#000" opacity="0.35" filter="url(#{self.blur(ry*0.25)})"/>')
        self.a(f'<rect x="{f(cx-rx)}" y="{f(cy-ry*2)}" width="{f(rx*2)}" height="{f(ry*(1+lid*2))}" fill="{lidcol}"/>')
        self.a('</g>')
        # highlight
        self.a(f'<circle cx="{f(cx-ir*0.3)}" cy="{f(cy-ry*(lid*2-1)*0.2+ir*0.0)}" r="{f(ir*0.2)}" fill="#fffef2" opacity="0.9"/>')
        # lash line
        ly = cy - ry + lid * 2 * ry
        self.a(f'<path d="M{f(cx-rx*1.05)} {f(cy+1)}Q{f(cx)} {f(ly-ry*0.5)} {f(cx+rx*1.08)} {f(cy-1)}" fill="none" stroke="{lash}" stroke-width="{f(ry*0.35)}" stroke-linecap="round"{t}/>')

    def spray(self, cx, cy, rx, ry, n, color, rmin=0.6, rmax=2.2, op=0.5):
        s = []
        for _ in range(n):
            a = self.r.random() * math.tau
            d = self.r.random() ** 0.5
            x, y = cx + math.cos(a) * rx * d, cy + math.sin(a) * ry * d
            s.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(self.r.uniform(rmin,rmax))}"/>')
        self.a(f'<g fill="{color}" opacity="{op}">' + ''.join(s) + '</g>')

    def svg(self):
        return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1485 850">'
                '<defs>' + ''.join(self.defs) + '</defs>'
                '<g filter="url(#wall)">' + '\n'.join(self.out) + '</g></svg>')
