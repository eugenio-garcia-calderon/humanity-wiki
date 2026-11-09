"""
acuarela.py -- watercolour + coloured-pencil painting library (Diseño 4).

Calendario Arte para la Humanidad 2027. Every month of Diseño 4 is painted with
this module so the twelve illustrations share one hand. It produces a RASTER
(numpy float32), never vectors.

Model
-----
* Coordinates are always given in BASE UNITS: a 1485 x 850 sheet. The same
  script renders at 1485 px (to iterate) or 3508 px (final) by passing a
  different `ancho` to `Lienzo`; every size, noise frequency and stroke width
  scales with `lz.s`.
* The canvas stores TRANSMITTANCE `lz.T` (1 = bare paper). Every wash and every
  pencil stroke MULTIPLIES it (`T *= colour ** density`): that is a glaze
  ("veladura") -- colours multiply, they never cover. At the end
  `lz.imagen()` multiplies T by the cream paper and its embossed grain.
* Occlusion: watercolour cannot paint light over dark, illustrators leave a
  reserve. Here `tapa=1` on a wash first LIFTS the canvas back to paper inside
  that shape, then paints. Paint back to front; give `tapa` to anything that
  must hide what is behind it (a figure in front of a wall, an arm in front of
  a shirt). Inside one object, leave tapa=0 so glazes multiply.

Main calls
----------
    lz = Lienzo(ancho=1485, semilla=7)
    lz.aguada(forma, '#e8735e', dens=.5, borde=.6, gran=.3, flor=1, tapa=1)
    lz.lapiz([pts, pts2], '#6b4a3a', grosor=1.0)          # loose pencil lines
    lz.contorno(forma, '#6b4a3a')                          # pencil around a shape
    lz.rayado(forma, '#a8364a', angulo=35, sep=4)          # hatching inside a shape
    lz.vineta(margen=40)                                   # ragged fade to paper
    lz.guardar('out.png')

Shapes (all in base units): Poligono(pts, suave=True), Elipse(cx,cy,rx,ry,ang),
Trazo(pts, anchos) (tapered brush stroke), Circulos([(x,y,r)...]), and set
operations `a | b`, `a - b`, `a & b`.

Wash parameters (`aguada`)
--------------------------
    dens    pigment density (0.2 pale glaze ... 1.0 strong)
    borde   wet-edge darkening (pigment that dries at the rim)
    irreg   how ragged the edge is (0 = clean, 1 = normal, 2 = very loose)
    gran    granulation: pigment settling in the paper valleys
    var     low-frequency unevenness of the wash (backruns, puddles)
    suave   >0: soft, wet-in-wet edge (blur radius in units), no hard rim
    flor    number of blooms (cauliflowers) inside the wash
    toques  wet-in-wet colour drops: [(x, y, radius, colour, weight), ...]
    desvanece (x0,y0,x1,y1): lose the wash from full at p0 to nothing at p1
    tapa    0..1 reserve (lift to paper) before painting

Figures (bottom of the file): `cabeza`, `extremidad`, `mano`, `torso`,
`figura` (a whole person from a joint dictionary). Faces are deliberately
simple and tender: dot eyes or happy closed arcs, rosy cheeks, small smile.

Memory: work happens in crops around each shape; arrays are float32.
"""
from __future__ import annotations

import math
import numpy as np
import cv2
from PIL import Image
from skimage import measure

BASE_W, BASE_H = 1485, 850

# ---------------------------------------------------------------- colour helpers

PALETA = {
    # warm, harmonious pigments (masstone at density 1 over white paper)
    'ocre': '#d9a441', 'ocre_claro': '#ecc879', 'siena': '#c0703f', 'siena_t': '#9c4f2c',
    'rosa': '#ec9fa0', 'coral': '#e8735e', 'carmin': '#c33c4e', 'granate': '#8f2a3c',
    'salvia': '#98b38a', 'oliva': '#7d985a', 'verde': '#5f8f63', 'turquesa': '#6fb1ad',
    'azul': '#8db1d3', 'cobalto': '#5f86c0', 'lavanda': '#a99bcb', 'violeta': '#8d73b0',
    'sepia': '#6e4c3c', 'gris_calido': '#a99a8c', 'amarillo': '#f2d36b',
    # skin tones
    'piel1': '#f3cdb0', 'piel2': '#e6ae88', 'piel3': '#c98a5e', 'piel4': '#9b6141', 'piel5': '#7a4a32',
    # pencil colours
    'lapiz_sepia': '#5e3f30', 'lapiz_siena': '#8a4a2e', 'lapiz_carmin': '#9c2f42',
    'lapiz_verde': '#4f6f45', 'lapiz_azul': '#4a6390', 'lapiz_violeta': '#6a5288',
}


def rgb(c) -> np.ndarray:
    """'#rrggbb', name in PALETA, or (r,g,b) 0..1/0..255 -> float32 array 0..1."""
    if isinstance(c, str):
        c = PALETA.get(c, c)
        c = c.lstrip('#')
        return np.array([int(c[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)
    a = np.array(c, np.float32)
    return a / 255 if a.max() > 1.0 else a


def mezcla(c1, c2, t):
    """Linear mix of two colours (as hex/arrays)."""
    return rgb(c1) * (1 - t) + rgb(c2) * t


def _ss(x, a, b):
    """smoothstep, works when a > b too."""
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def _blur(a, sigma):
    if sigma <= 0.05:
        return a
    k = int(sigma * 3) * 2 + 1
    return cv2.GaussianBlur(a, (k, k), sigma, borderType=cv2.BORDER_REPLICATE)


# ---------------------------------------------------------------- geometry

def spline(pts, cerrada=False, n=10):
    """Catmull-Rom through points -> dense Nx2 array. Organic outlines."""
    p = np.asarray(pts, np.float64)
    if len(p) < 3:
        return p
    if cerrada:
        p = np.vstack([p[-1], p, p[0], p[1]])
    else:
        p = np.vstack([2 * p[0] - p[1], p, 2 * p[-1] - p[-2]])
    out = []
    t = np.linspace(0, 1, n, endpoint=False)[:, None]
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t ** 2
                          + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    if not cerrada:
        out.append(p[-2][None])
    return np.vstack(out)


def bezier(p0, p1, p2, p3=None, n=40):
    """Quadratic (3 pts) or cubic (4 pts) Bezier -> Nx2."""
    t = np.linspace(0, 1, n)[:, None]
    p0, p1, p2 = map(np.asarray, (p0, p1, p2))
    if p3 is None:
        return (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2
    p3 = np.asarray(p3)
    return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3


def arco(cx, cy, rx, ry, a0, a1, n=40, ang=0.0):
    """Elliptical arc, angles in degrees (0 = right, 90 = down)."""
    t = np.radians(np.linspace(a0, a1, n))
    x, y = rx * np.cos(t), ry * np.sin(t)
    c, s = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    return np.stack([cx + x * c - y * s, cy + x * s + y * c], 1)


def remuestrea(p, paso):
    """Resample a polyline at constant arc-length step."""
    p = np.asarray(p, np.float64)
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]
    if d[-1] < 1e-6:
        return p[:1]
    n = max(2, int(d[-1] / paso) + 1)
    t = np.linspace(0, d[-1], n)
    return np.stack([np.interp(t, d, p[:, 0]), np.interp(t, d, p[:, 1])], 1)


# ---------------------------------------------------------------- shapes

class Forma:
    """A shape in base units. Subclasses implement bbox() and _pinta(img, f)."""

    def bbox(self):
        raise NotImplementedError

    def _pinta(self, img, f):
        """Draw filled shape (255) on uint8 img; f maps unit Nx2 -> pixel Nx2."""
        raise NotImplementedError

    def mascara(self, lz, x0, y0, x1, y1):
        img = np.zeros((y1 - y0, x1 - x0), np.uint8)
        s = lz.s

        def f(p):
            p = np.asarray(p, np.float64) * s - (x0, y0)
            return p
        self._pinta(img, f)
        return img.astype(np.float32) / 255.0

    def __or__(self, o):
        return _Op(self, o, 'u')

    def __sub__(self, o):
        return _Op(self, o, 'r')

    def __and__(self, o):
        return _Op(self, o, 'i')


def _fill(img, ppx):
    pts = np.round(ppx * 16).astype(np.int32).reshape(-1, 1, 2)
    cv2.fillPoly(img, [pts], 255, lineType=cv2.LINE_AA, shift=4)


class Poligono(Forma):
    """Closed outline. suave=True passes it through a Catmull-Rom spline."""

    def __init__(self, pts, suave=True):
        self.p = spline(pts, True, 12) if suave else np.asarray(pts, np.float64)

    def bbox(self):
        return (*self.p.min(0), *self.p.max(0))

    def _pinta(self, img, f):
        _fill(img, f(self.p))


class Elipse(Poligono):
    def __init__(self, cx, cy, rx, ry=None, ang=0.0):
        ry = rx if ry is None else ry
        self.p = arco(cx, cy, rx, ry, 0, 360, 72, ang)


class Circulos(Forma):
    """Union of circles [(x, y, r), ...] -- curls, foliage, clouds."""

    def __init__(self, cs):
        self.c = np.asarray(cs, np.float64)

    def bbox(self):
        c = self.c
        return (c[:, 0] - c[:, 2]).min(), (c[:, 1] - c[:, 2]).min(), (c[:, 0] + c[:, 2]).max(), (c[:, 1] + c[:, 2]).max()

    def _pinta(self, img, f):
        for x, y, r in self.c:
            q = f([[x, y]])[0]
            rr = r * (f([[1, 0]])[0][0] - f([[0, 0]])[0][0])
            cv2.circle(img, (int(round(q[0] * 16)), int(round(q[1] * 16))), max(1, int(round(rr * 16))),
                       255, -1, cv2.LINE_AA, 4)


class Trazo(Forma):
    """Tapered brush stroke along a path. anchos = width (units) at start/end,
    or a list of widths along the control points."""

    def __init__(self, pts, anchos=(10, 6), suave=True):
        p = np.asarray(pts, np.float64)
        a = np.asarray(anchos, np.float64)
        if suave and len(p) >= 3:
            q = spline(p, False, 12)
        else:
            q = remuestrea(p, 1.0)
        # width along the path, interpolated in normalised arc length
        d = np.r_[0, np.cumsum(np.hypot(*np.diff(q, axis=0).T))]
        t = d / max(d[-1], 1e-6)
        ta = np.linspace(0, 1, len(a))
        self.w = np.interp(t, ta, a)
        self.p = q

    def bbox(self):
        m = self.w.max() / 2
        return self.p[:, 0].min() - m, self.p[:, 1].min() - m, self.p[:, 0].max() + m, self.p[:, 1].max() + m

    def contorno_pts(self):
        """Polygon of the stroke outline (units)."""
        p = self.p
        tg = np.gradient(p, axis=0)
        tg /= np.maximum(np.hypot(*tg.T)[:, None], 1e-9)
        nrm = np.stack([-tg[:, 1], tg[:, 0]], 1)
        l = p + nrm * self.w[:, None] / 2
        r = p - nrm * self.w[:, None] / 2
        cap0 = arco(*p[0], self.w[0] / 2, self.w[0] / 2, 0, 360, 24)
        return l, r

    def _pinta(self, img, f):
        l, r = self.contorno_pts()
        _fill(img, f(np.vstack([l, r[::-1]])))
        sc = f([[1, 0]])[0][0] - f([[0, 0]])[0][0]
        for i in (0, -1):
            q = f([self.p[i]])[0]
            cv2.circle(img, (int(round(q[0] * 16)), int(round(q[1] * 16))),
                       max(1, int(round(self.w[i] / 2 * sc * 16))), 255, -1, cv2.LINE_AA, 4)


class _Op(Forma):
    def __init__(self, a, b, op):
        self.a, self.b, self.op = a, b, op

    def bbox(self):
        A, B = self.a.bbox(), self.b.bbox()
        if self.op == 'u':
            return min(A[0], B[0]), min(A[1], B[1]), max(A[2], B[2]), max(A[3], B[3])
        return A

    def mascara(self, lz, x0, y0, x1, y1):
        a = self.a.mascara(lz, x0, y0, x1, y1)
        b = self.b.mascara(lz, x0, y0, x1, y1)
        if self.op == 'u':
            return np.maximum(a, b)
        if self.op == 'r':
            return a * (1 - b)
        return a * b


class Mascara(Forma):
    """A precomputed mask function: fn(lz, x0,y0,x1,y1) -> float32 crop."""

    def __init__(self, fn, bbox):
        self.fn, self._bb = fn, bbox

    def bbox(self):
        return self._bb

    def mascara(self, lz, x0, y0, x1, y1):
        return self.fn(lz, x0, y0, x1, y1)


# ---------------------------------------------------------------- noise

def _hash(ix, iy, seed):
    h = (ix.astype(np.uint32) * np.uint32(374761393) + iy.astype(np.uint32) * np.uint32(668265263)
         + np.uint32(seed * 1442695041 & 0xffffffff))
    h = (h ^ (h >> np.uint32(13))) * np.uint32(1274126177)
    h = h ^ (h >> np.uint32(16))
    return (h & np.uint32(0xffffff)).astype(np.float32) / 16777215.0


def _cubic_w(x, n):
    """Dense Catmull-Rom interpolation matrix: len(x) samples from n grid nodes."""
    i = np.floor(x).astype(int)
    t = (x - i)[:, None]
    w = np.stack([(-t + 2 * t ** 2 - t ** 3) / 2, (2 - 5 * t ** 2 + 3 * t ** 3) / 2,
                  (t + 4 * t ** 2 - 3 * t ** 3) / 2, (-t ** 2 + t ** 3) / 2], 0)[..., 0]
    M = np.zeros((len(x), n), np.float32)
    rows = np.arange(len(x))
    for k in range(4):
        np.add.at(M, (rows, np.clip(i - 1 + k, 0, n - 1)), w[k])
    return M


# ---------------------------------------------------------------- canvas

class Lienzo:
    def __init__(self, ancho=BASE_W, semilla=1, papel='#fbf6ea'):
        self.s = ancho / BASE_W
        self.W = int(ancho)
        self.H = int(round(BASE_H * self.s))
        self.semilla = semilla
        self._n = semilla * 7919
        self.papel = rgb(papel)
        self.relieve = 0.045  # strength of the embossed paper grain
        self.T = np.ones((self.H, self.W, 3), np.float32)
        self.grano = self._hacer_papel()
        # inner light (screen-blended at the end) and opaque gouache touches
        self.LUZ = np.zeros((self.H, self.W, 3), np.float32)
        self.OP = np.zeros((self.H, self.W, 4), np.float32)

    # -- noise -------------------------------------------------------------
    def _sem(self, semilla=None):
        if semilla is not None:
            return int(semilla)
        self._n += 1
        return self._n

    def ruido(self, x0, y0, x1, y1, celda, semilla):
        """Smooth value noise (0..1) on a pixel crop; `celda` in base units.
        Lattice is anchored to absolute unit coords, so it is identical at any
        resolution and across overlapping crops."""
        s = self.s
        cp = celda * s
        if cp < 5:  # tiny cells: per-pixel noise + blur (statistically equivalent)
            rng = np.random.default_rng(semilla + x0 * 31 + y0 * 17)
            a = rng.random((y1 - y0, x1 - x0), dtype=np.float32)
            a = _blur(a, cp * 0.45)
            a -= a.mean()
            a /= (a.std() * 3.5 + 1e-6)
            return np.clip(a + 0.5, 0, 1)
        gx = (np.arange(x0, x1) + 0.5) / cp
        gy = (np.arange(y0, y1) + 0.5) / cp
        ix0, iy0 = int(np.floor(gx[0])) - 1, int(np.floor(gy[0])) - 1
        nx, ny = int(np.floor(gx[-1])) + 3 - ix0, int(np.floor(gy[-1])) + 3 - iy0
        IX, IY = np.meshgrid(np.arange(ix0, ix0 + nx), np.arange(iy0, iy0 + ny))
        G = _hash(IX + 100000, IY + 100000, semilla)
        Wx = _cubic_w(gx - ix0, nx)
        Wy = _cubic_w(gy - iy0, ny)
        return np.clip(Wy @ G @ Wx.T, 0, 1).astype(np.float32)

    def fbm(self, x0, y0, x1, y1, celda, semilla, oct=3):
        a, tot, amp, c = 0, 0, 1.0, celda
        for k in range(oct):
            a = a + amp * self.ruido(x0, y0, x1, y1, c, semilla + 101 * k)
            tot += amp
            amp *= 0.5
            c /= 2.1
        return a / tot

    def _hacer_papel(self):
        """Cold-pressed paper height map 0..1 (bumps ~3-5 units, plus mottling)."""
        H, W = self.H, self.W
        g = (0.45 * self.ruido(0, 0, W, H, 5.0, 11) + 0.35 * self.ruido(0, 0, W, H, 2.2, 12)
             + 0.20 * self.ruido(0, 0, W, H, 1.0, 13))
        g = g - g.mean()
        g /= (g.std() * 4 + 1e-6)
        g = np.clip(g + 0.5, 0, 1)
        g = 0.85 * g + 0.15 * self.ruido(0, 0, W, H, 40, 14)
        return g.astype(np.float32)

    # -- crops -------------------------------------------------------------
    def _crop(self, bb, pad):
        s = self.s
        x0 = max(0, int(math.floor((bb[0] - pad) * s)))
        y0 = max(0, int(math.floor((bb[1] - pad) * s)))
        x1 = min(self.W, int(math.ceil((bb[2] + pad) * s)))
        y1 = min(self.H, int(math.ceil((bb[3] + pad) * s)))
        if x1 - x0 < 2 or y1 - y0 < 2:
            return None
        return x0, y0, x1, y1

    def _malla(self, x0, y0, x1, y1):
        s = self.s
        X = (np.arange(x0, x1, dtype=np.float32) + 0.5) / s
        Y = (np.arange(y0, y1, dtype=np.float32) + 0.5) / s
        return X[None, :], Y[:, None]

    # -- the wash ----------------------------------------------------------
    def aguada(self, forma, color, dens=0.55, borde=0.55, irreg=1.0, gran=0.3, var=0.35,
               suave=0.0, flor=0, toques=None, desvanece=None, tapa=0.0, semilla=None,
               devuelve=False):
        """Paint one transparent watercolour wash. See module docstring."""
        sem = self._sem(semilla)
        s = self.s
        pad = 6 + 4 * irreg + 3 * suave + (20 if flor else 0)
        c = self._crop(forma.bbox(), pad)
        if c is None:
            return None
        x0, y0, x1, y1 = c
        M = forma.mascara(self, x0, y0, x1, y1)
        if M.max() <= 0:
            return None
        if suave > 0:
            Mw = _blur(M, suave * s)
            E = 0
        else:
            sig = (1.2 + 1.6 * irreg) * s
            Mb = _blur(M, sig)
            n = 0.6 * self.ruido(x0, y0, x1, y1, 9, sem) + 0.4 * self.ruido(x0, y0, x1, y1, 3.2, sem + 1)
            t = 0.5 + 0.55 * irreg * (n - 0.5)
            Mw = _ss(Mb, t - 0.07, t + 0.07)
            Mw *= _ss(M, 0.0, 0.02) * 0 + 1  # keep
            Eb = _blur(Mw, 2.2 * s)
            E = np.clip(Mw - Eb, 0, 1) * 2.4
            E = np.minimum(E, 1.0)
        lo = self.ruido(x0, y0, x1, y1, 55, sem + 2) * 0.6 + self.ruido(x0, y0, x1, y1, 18, sem + 3) * 0.4
        D = dens * Mw * (1 + var * 2 * (lo - 0.5)) + dens * borde * E * 1.25
        if gran > 0:
            g = self.grano[y0:y1, x0:x1]
            fine = self.ruido(x0, y0, x1, y1, 0.9, sem + 4)
            D = D * np.clip(1 + gran * (1.6 * (0.5 - g) + 0.8 * (fine - 0.5)), 0.2, 2.0)
        if flor:
            rng = np.random.default_rng(sem + 5)
            ys, xs = np.nonzero(Mw > 0.85)
            X, Y = self._malla(x0, y0, x1, y1)
            for k in range(int(flor)):
                if len(xs) == 0:
                    break
                j = rng.integers(len(xs))
                cx, cy = (xs[j] + x0 + .5) / s, (ys[j] + y0 + .5) / s
                bw = (forma.bbox()[2] - forma.bbox()[0])
                r = rng.uniform(0.12, 0.25) * min(bw, (forma.bbox()[3] - forma.bbox()[1])) + 4
                ang = np.arctan2(Y - cy, X - cx)
                nn = self.ruido(x0, y0, x1, y1, max(3, r / 3), sem + 50 + k)
                rr = np.hypot(X - cx, Y - cy) / (r * (0.8 + 0.4 * nn + 0.08 * np.sin(5 * ang + k)))
                inner = _ss(rr, 1.0, 0.75)
                ring = np.exp(-((rr - 1.0) / 0.07) ** 2)
                D = D * (1 - 0.5 * inner) + dens * 0.55 * ring * Mw
        if desvanece is not None:
            ax, ay, bx, by = desvanece
            X, Y = self._malla(x0, y0, x1, y1)
            vx, vy = bx - ax, by - ay
            L2 = vx * vx + vy * vy
            tt = ((X - ax) * vx + (Y - ay) * vy) / L2
            tt = tt + 0.18 * (self.ruido(x0, y0, x1, y1, 14, sem + 6) - 0.5)
            D = D * _ss(tt, 1.0, 0.0)
        # colour field (wet-in-wet drops blend in log space)
        lc = np.log(np.clip(rgb(color), 0.02, 1))
        if toques:
            X, Y = self._malla(x0, y0, x1, y1)
            L = np.broadcast_to(lc, D.shape + (3,)).copy()
            wn = self.ruido(x0, y0, x1, y1, 8, sem + 7)
            for (tx, ty, tr, tc, tw) in toques:
                w = tw * np.exp(-((X - tx) ** 2 + (Y - ty) ** 2) / (tr * tr)) * (0.75 + 0.5 * wn)
                w = np.clip(w, 0, 1)[..., None]
                L = L * (1 - w) + np.log(np.clip(rgb(tc), 0.02, 1)) * w
        else:
            L = lc
        T = self.T[y0:y1, x0:x1]
        if tapa > 0:
            lift = Mw  # reserve exactly the painted footprint (no white halo)
            T += (1 - T) * (lift * tapa)[..., None]
        T *= np.exp(D[..., None] * L)
        if devuelve:
            return (x0, y0, x1, y1), Mw
        return None

    def levanta(self, forma, cantidad=1.0, suave=1.5):
        """Lift paint back toward paper inside a shape (sponge / reserve)."""
        c = self._crop(forma.bbox(), 4 + suave * 3)
        if c is None:
            return
        x0, y0, x1, y1 = c
        M = _blur(forma.mascara(self, x0, y0, x1, y1), suave * self.s)
        T = self.T[y0:y1, x0:x1]
        T += (1 - T) * (M * cantidad)[..., None]

    def brillo(self, cx, cy, r, color='#fff3c8', fuerza=0.6):
        """Soft warm glow: a wet-in-wet halo of light colour (cannot exceed paper)."""
        self.aguada(Elipse(cx, cy, r), color, dens=fuerza, suave=r * 0.35, gran=0.05, var=0.25, borde=0)

    # -- coloured pencil --------------------------------------------------
    def lapiz(self, trazos, color='lapiz_sepia', grosor=1.0, presion=0.8, temblor=0.5,
              textura=0.65, cortes=0.0, semilla=None, puntas=0.15):
        """Draw loose coloured-pencil lines. trazos: list of Nx2 polylines (units).
        grosor: line width in units; presion: darkness 0..1; temblor: hand wobble
        in units; cortes: 0..1 fraction of tiny gaps; puntas: taper fraction."""
        sem = self._sem(semilla)
        s = self.s
        rng = np.random.default_rng(sem)
        paso = 0.4  # px
        P, Wt = [], []
        for tr in trazos:
            p = np.asarray(tr, np.float64) * s
            if len(p) < 2:
                continue
            q = remuestrea(p, paso)
            n = len(q)
            if n < 3:
                continue
            tg = np.gradient(q, axis=0)
            tg /= np.maximum(np.hypot(*tg.T)[:, None], 1e-9)
            nr = np.stack([-tg[:, 1], tg[:, 0]], 1)
            L = n * paso
            # wobble: two smooth 1-D noises along arc length
            k1 = max(4, int(L / (14 * s)) + 4)
            w1 = np.interp(np.linspace(0, k1 - 1, n), np.arange(k1), rng.normal(0, 1, k1))
            k2 = max(4, int(L / (4 * s)) + 4)
            w2 = np.interp(np.linspace(0, k2 - 1, n), np.arange(k2), rng.normal(0, 1, k2))
            q = q + nr * ((0.75 * w1 + 0.25 * w2) * temblor * s * 0.6)[:, None]
            t = np.arange(n) * paso / L
            pr = presion * _ss(t, 0, puntas) * _ss(t, 1, 1 - puntas) * 0 + presion
            pr = pr * (0.35 + 0.65 * _ss(t, 0, puntas)) * (0.35 + 0.65 * _ss(1 - t, 0, puntas))
            k3 = max(4, int(L / (9 * s)) + 4)
            pr = pr * (0.85 + 0.3 * np.interp(np.linspace(0, k3 - 1, n), np.arange(k3), rng.random(k3)))
            if cortes > 0:
                # occasional lifts of the pencil (not a regular dash pattern)
                k4 = max(4, int(L / (26 * s)) + 4)
                g = np.interp(np.linspace(0, k4 - 1, n), np.arange(k4), rng.random(k4))
                th = cortes * 0.45
                pr = pr * _ss(g, th, th + 0.06)
            P.append(q)
            Wt.append(pr)
        if not P:
            return
        P = np.vstack(P)
        Wt = np.concatenate(Wt).astype(np.float32)
        sig = max(0.42, 0.42 * grosor * s)
        pad = int(sig * 4) + 3
        x0 = max(0, int(P[:, 0].min()) - pad)
        y0 = max(0, int(P[:, 1].min()) - pad)
        x1 = min(self.W, int(P[:, 0].max()) + pad)
        y1 = min(self.H, int(P[:, 1].max()) + pad)
        if x1 - x0 < 2 or y1 - y0 < 2:
            return
        A = np.zeros((y1 - y0, x1 - x0), np.float32)
        px, py = P[:, 0] - x0 - 0.5, P[:, 1] - y0 - 0.5
        ix, iy = np.floor(px).astype(int), np.floor(py).astype(int)
        fx, fy = (px - ix).astype(np.float32), (py - iy).astype(np.float32)
        for dx, dy, w in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)),
                          (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
            jx, jy = ix + dx, iy + dy
            ok = (jx >= 0) & (jy >= 0) & (jx < A.shape[1]) & (jy < A.shape[0])
            np.add.at(A, (jy[ok], jx[ok]), (w * Wt)[ok])
        A = _blur(A, sig)
        k = 1.9 * paso * math.sqrt(2 * math.pi) * sig
        g = self.grano[y0:y1, x0:x1]
        tooth = _ss(g, 0.30, 0.70)
        A = A * ((1 - textura) + textura * 1.5 * tooth)
        D = 1 - np.exp(-A * k)
        T = self.T[y0:y1, x0:x1]
        T *= np.exp(D[..., None] * np.log(np.clip(rgb(color), 0.02, 1)))

    def contorno(self, forma, color='lapiz_sepia', grosor=1.0, presion=0.7, temblor=0.6,
                 cortes=0.25, desfase=0.8, semilla=None, min_len=6, solo=None):
        """Pencil drawing around a shape, slightly off-register and broken like a
        real hand. solo=(x0,y0,x1,y1) keeps only the parts inside that box."""
        sem = self._sem(semilla)
        c = self._crop(forma.bbox(), 4)
        if c is None:
            return
        x0, y0, x1, y1 = c
        M = _blur(forma.mascara(self, x0, y0, x1, y1), 0.8 * self.s)
        M = np.pad(M, 1)
        cs = measure.find_contours(M, 0.5)
        rng = np.random.default_rng(sem)
        tr = []
        for cc in cs:
            p = np.stack([cc[:, 1] - 1 + x0 + 0.5, cc[:, 0] - 1 + y0 + 0.5], 1) / self.s
            if len(p) < 4:
                continue
            p = remuestrea(p, 1.5)
            if len(p) * 1.5 < min_len:
                continue
            off = rng.normal(0, desfase, 2)
            p = p + off
            if solo is not None:
                ok = (p[:, 0] >= solo[0]) & (p[:, 0] <= solo[2]) & (p[:, 1] >= solo[1]) & (p[:, 1] <= solo[3])
                idx = np.flatnonzero(np.diff(np.r_[0, ok.astype(int), 0]))
                for a, b in zip(idx[::2], idx[1::2]):
                    if b - a > 3:
                        tr.append(p[a:b])
                continue
            # split long contours into a few strokes (a hand lifts the pencil)
            n = len(p)
            nseg = max(1, int(n * 1.5 / 70))
            cuts = np.sort(rng.choice(np.arange(1, n - 1), size=min(nseg - 1, n - 2), replace=False)) if nseg > 1 else []
            prev = 0
            for cu in list(cuts) + [n]:
                seg = p[prev:min(n, cu + 2)]
                if len(seg) > 3:
                    tr.append(seg)
                prev = cu
        self.lapiz(tr, color, grosor, presion, temblor, cortes=cortes, semilla=sem + 1)

    def rayado(self, forma, color='lapiz_sepia', angulo=40, sep=4.0, grosor=0.9, presion=0.45,
               temblor=0.5, semilla=None, desvanece=None, largo=None):
        """Coloured-pencil hatching clipped to a shape. desvanece=(x0,y0,x1,y1):
        strokes thin out from p0 to p1. largo: max stroke length (units)."""
        sem = self._sem(semilla)
        rng = np.random.default_rng(sem)
        bb = forma.bbox()
        c = self._crop(bb, 2)
        if c is None:
            return
        x0, y0, x1, y1 = c
        M = forma.mascara(self, x0, y0, x1, y1)
        s = self.s
        a = math.radians(angulo)
        d = np.array([math.cos(a), math.sin(a)])
        nrm = np.array([-d[1], d[0]])
        cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
        R = math.hypot(bb[2] - bb[0], bb[3] - bb[1]) / 2 + 2
        tr = []
        o = -R
        while o < R:
            oo = o + rng.normal(0, sep * 0.15)
            t = np.arange(-R, R, 1.0)
            pts = np.array([cx, cy]) + nrm * oo + d[None] * t[:, None]
            px = ((pts[:, 0] * s) - x0).astype(int)
            py = ((pts[:, 1] * s) - y0).astype(int)
            ok = (px >= 0) & (py >= 0) & (px < M.shape[1]) & (py < M.shape[0])
            ins = np.zeros(len(pts), bool)
            ins[ok] = M[py[ok], px[ok]] > 0.5
            if desvanece is not None:
                ax, ay, bx, by = desvanece
                vx, vy = bx - ax, by - ay
                tt = ((pts[:, 0] - ax) * vx + (pts[:, 1] - ay) * vy) / (vx * vx + vy * vy)
                ins &= rng.random(len(pts)) * 0 + tt < rng.uniform(0.6, 1.1)
            idx = np.flatnonzero(np.diff(np.r_[0, ins.astype(int), 0]))
            for i0, i1 in zip(idx[::2], idx[1::2]):
                seg = pts[i0:i1]
                if len(seg) < 3:
                    continue
                if largo and len(seg) > largo:
                    st = rng.integers(0, len(seg) - int(largo))
                    seg = seg[st:st + int(largo)]
                tr.append(seg)
            o += sep
        self.lapiz(tr, color, grosor, presion, temblor, semilla=sem + 1, puntas=0.25)

    # -- magic light, gouache, collage (Sonja-Wimmer-like qualities) ----------
    def luz(self, forma_o_xyr, color='#ffd98a', fuerza=0.6, suave=None, semilla=None):
        """Light that glows FROM INSIDE (lanterns, windows, a beating heart).
        Accumulated in a separate layer and screen-blended at the end, so it
        brightens whatever is painted under it. Accepts a Forma or (x, y, r)."""
        sem = self._sem(semilla)
        if isinstance(forma_o_xyr, tuple):
            x, y, r = forma_o_xyr
            forma = Elipse(x, y, r)
            suave = r * 0.45 if suave is None else suave
        else:
            forma = forma_o_xyr
            suave = 6 if suave is None else suave
        c = self._crop(forma.bbox(), suave * 3 + 4)
        if c is None:
            return
        x0, y0, x1, y1 = c
        M = _blur(forma.mascara(self, x0, y0, x1, y1), suave * self.s)
        n = self.ruido(x0, y0, x1, y1, 25, sem)
        M = M * (0.85 + 0.3 * n)
        self.LUZ[y0:y1, x0:x1] += (M * fuerza)[..., None] * rgb(color)

    def gouache(self, forma, color='#fffaf0', alfa=0.9, irreg=0.3, semilla=None):
        """Opaque body-colour touch (highlights, sparkles, a white line).
        Composited on top at the end."""
        sem = self._sem(semilla)
        c = self._crop(forma.bbox(), 4)
        if c is None:
            return
        x0, y0, x1, y1 = c
        M = forma.mascara(self, x0, y0, x1, y1)
        M = _blur(M, 0.6 * self.s)
        if irreg > 0:
            n = self.ruido(x0, y0, x1, y1, 1.6, sem)
            M = M * _ss(n, 0.15 * irreg, 0.45 * irreg + 0.05) * 0.4 + M * 0.6
        g = self.grano[y0:y1, x0:x1]
        M = M * (0.8 + 0.4 * g) * alfa
        O = self.OP[y0:y1, x0:x1]
        a = np.clip(M, 0, 1)[..., None]
        O[..., :3] = O[..., :3] * (1 - a) + rgb(color) * a      # premultiplied colour
        O[..., 3:] = O[..., 3:] * (1 - a) + a

    def chispas(self, cx, cy, rx, ry, n=20, color='#fff6d8', tam=(0.8, 2.2), semilla=None, luz=0.35):
        """Floating sparks / pollen of light: tiny gouache dots with a halo."""
        sem = self._sem(semilla)
        rng = np.random.default_rng(sem)
        for k in range(n):
            a = rng.uniform(0, 2 * np.pi)
            rr = math.sqrt(rng.uniform(0, 1))
            x, y = cx + math.cos(a) * rx * rr, cy + math.sin(a) * ry * rr
            t = rng.uniform(*tam)
            self.gouache(Elipse(x, y, t), color, alfa=0.85, irreg=0)
            if luz:
                self.luz((x, y, t * 4), '#ffe2a0', fuerza=luz)

    def collage(self, forma, color, fibras=0.5, sombra=1.6, dens=0.75, semilla=None):
        """A piece of hand-painted paper glued on: clean cut edge, its own fibre
        texture, a tiny cast shadow. Covers what is below (it is paper)."""
        sem = self._sem(semilla)
        s = self.s
        c = self._crop(forma.bbox(), 8)
        if c is None:
            return
        x0, y0, x1, y1 = c
        M = forma.mascara(self, x0, y0, x1, y1)
        T = self.T[y0:y1, x0:x1]
        if sombra:
            sh = np.roll(np.roll(_blur(M, sombra * s), int(round(sombra * 0.8 * s)), 0), int(round(sombra * 0.5 * s)), 1)
            T *= (1 - 0.18 * np.clip(sh - M, 0, 1))[..., None]
        T += (1 - T) * M[..., None]
        fib = self.ruido(x0, y0, x1, y1, 1.3, sem)
        streak = self.ruido(x0, y0, x1, y1, 30, sem + 1)
        D = dens * M * (1 + fibras * (fib - 0.5) * 1.2 + 0.4 * (streak - 0.5))
        T *= np.exp(D[..., None] * np.log(np.clip(rgb(color), 0.02, 1)))

    def fondo(self, colores=('#f3d79a', '#f0b48a'), dens=0.28, centro=None, radio=520, semilla=None):
        """Rich, even painterly ground over the whole sheet: two or three
        glazes mottled with low-frequency noise, lighter around `centro`
        (where the magic light is). Keep dens low to preserve air."""
        sem = self._sem(semilla)
        H, W = self.H, self.W
        X, Y = self._malla(0, 0, W, H)
        T = self.T
        for k, col in enumerate(colores):
            n = self.fbm(0, 0, W, H, 220, sem + 10 * k, 2)
            n2 = self.ruido(0, 0, W, H, 45, sem + 10 * k + 5)
            g = self.grano
            D = dens * (0.75 + 0.5 * n + 0.15 * (n2 - 0.5)) * np.clip(1 + 0.25 * (0.5 - g), 0.5, 1.5)
            if centro is not None:
                d = np.hypot(X - centro[0], Y - centro[1]) / radio
                D = D * (0.25 + 0.75 * _ss(d, 0.3, 1.1))
            T *= np.exp(D[..., None] * np.log(np.clip(rgb(col), 0.02, 1)))
            del D, n, n2

    # -- finishing ---------------------------------------------------------
    def vineta(self, margen=45, irreg=1.0, semilla=99):
        """Ragged fade to bare paper at the edges of the sheet."""
        H, W, s = self.H, self.W, self.s
        X, Y = self._malla(0, 0, W, H)
        dd = np.minimum(np.minimum(X, BASE_W - X), np.minimum(Y, BASE_H - Y))
        n = self.fbm(0, 0, W, H, 120, semilla, 2)
        F = _ss(dd + irreg * margen * 0.9 * (n - 0.5) * 2, margen * 0.1, margen * 1.6)
        self.T = 1 - (1 - self.T) * F[..., None]

    def imagen(self):
        """Final RGB uint8: paper colour x embossed grain x transmittance."""
        g = self.grano
        gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
        gx = _blur(gx, 0.6 * self.s)
        gy = _blur(gy, 0.6 * self.s)
        # gentle raking light on the grain; Sobel gain grows with resolution, so /s
        sh = 1 + self.relieve * (gx * -0.7 + gy * -0.7) / max(self.s, 1.0) - 0.03 * (0.5 - g)
        out = self.papel[None, None, :] * self.T * sh[..., None]
        L = np.clip(self.LUZ, 0, 1.5)
        out = 1 - (1 - out) * np.exp(-1.25 * L)            # screen-like inner light
        a = self.OP[..., 3:]
        out = out * (1 - a) + self.OP[..., :3] * sh[..., None]
        return (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)

    def guardar(self, ruta, calidad=90):
        im = Image.fromarray(self.imagen())
        if ruta.lower().endswith(('.jpg', '.jpeg')):
            im.save(ruta, quality=calidad, subsampling=0)
        else:
            im.save(ruta)
        return im


# ======================================================================
#  Figures: simple, tender picture-book people
# ======================================================================
#
#  All positions in base units. A typical standing adult in a 1485 x 850
#  scene is 180-260 units tall; head radius ~ height / 7.5.

PIEL_LAPIZ = '#8a5440'


def _lapiz_de(color, osc=0.55):
    """A pencil colour that belongs to a wash colour: same hue, darker."""
    c = rgb(color)
    return tuple((c * osc + rgb('#3a2418') * (1 - osc) * 0.6).tolist())


def cabeza(lz, x, y, r, piel='piel2', pelo='#5a3a2a', peinado='corto', giro=0.0, inclina=0.0,
           ojos='abiertos', boca='sonrisa', mejillas=True, barba=None, canas=False, mira=(0, 0),
           semilla=None, lapiz=None, adorno=None):
    """Draw a tender head centred (x, y) with radius r.
    giro: -1..1 turns the face left/right (3/4 view); inclina: degrees of tilt.
    ojos: 'abiertos' | 'cerrados' (happy arcs) | 'abajo'. boca: 'sonrisa' |
    'abierta' | 'suave' | 'canta'. peinado: 'corto', 'rizado', 'mono' (bun),
    'largo', 'coleta', 'calvo', 'ondas', 'pañuelo'. barba: colour or None.
    adorno: optional colour for a flower in the hair."""
    sem = lz._sem(semilla)
    rng = np.random.default_rng(sem)
    lp = lapiz or PIEL_LAPIZ
    ang = inclina
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))

    def R(dx, dy):  # local -> world, rotated by tilt
        return (x + dx * ca - dy * sa, y + dx * sa + dy * ca)

    rx, ry = r * 0.86, r
    pelo_lp = _lapiz_de(pelo, 0.6)
    # hair behind the head
    if peinado in ('largo', 'ondas'):
        pts = [R(-rx * 1.12, -r * 0.2), R(-rx * 1.25, r * 0.9), R(-rx * 1.0, r * 1.75), R(0, r * 1.55),
               R(rx * 1.0, r * 1.75), R(rx * 1.25, r * 0.9), R(rx * 1.12, -r * 0.2), R(0, -r * 1.2)]
        if peinado == 'ondas':
            pts = [R(-rx * 1.15, -r * 0.2), R(-rx * 1.3, r * 0.6), R(-rx * 1.05, r * 1.1), R(0, r * 0.9),
                   R(rx * 1.05, r * 1.1), R(rx * 1.3, r * 0.6), R(rx * 1.15, -r * 0.2), R(0, -r * 1.2)]
        f = Poligono(pts)
        lz.aguada(f, pelo, dens=0.75, borde=0.5, gran=0.35, tapa=1, flor=0)
        lz.contorno(f, pelo_lp, grosor=0.8, presion=0.5, cortes=0.4)
    if peinado == 'coleta':
        side = -1 if giro >= 0 else 1
        f = Trazo([R(side * rx * 0.6, -r * 0.6), R(side * rx * 1.5, -r * 0.2), R(side * rx * 1.6, r * 0.7)],
                  (r * 0.55, r * 0.45, r * 0.15))
        lz.aguada(f, pelo, dens=0.75, tapa=1)
        lz.contorno(f, pelo_lp, grosor=0.8, presion=0.5, cortes=0.4)
    if peinado == 'pañuelo':
        f = Poligono([R(-rx * 1.2, -r * 0.3), R(-rx * 1.35, r * 0.7), R(-rx * 1.5, r * 1.6), R(0, r * 1.75),
                      R(rx * 1.5, r * 1.6), R(rx * 1.35, r * 0.7), R(rx * 1.2, -r * 0.3), R(0, -r * 1.2)])
        lz.aguada(f, pelo, dens=0.7, borde=0.5, gran=0.35, tapa=1)
        lz.contorno(f, pelo_lp, grosor=0.8, presion=0.5, cortes=0.4)
    if peinado == 'mono':
        bx, by = R(-giro * r * 0.3, -r * 1.05)
        f = Elipse(bx, by, r * 0.48, r * 0.42)
        lz.aguada(f, pelo, dens=0.8, tapa=1)
        lz.contorno(f, pelo_lp, grosor=0.8, presion=0.5, cortes=0.4)
    # ears
    for sd in (-1, 1):
        if giro * sd > 0.55:
            continue
        ex, ey = R(sd * rx * (0.98 - 0.25 * max(0, giro * sd)) - giro * r * 0.1, r * 0.08)
        f = Elipse(ex, ey, r * 0.16, r * 0.22)
        lz.aguada(f, piel, dens=0.6, tapa=1, irreg=0.4, gran=0.2)
    # face
    sh = giro * r * 0.08
    face = Poligono([R(-rx + sh, -r * 0.1), R(-rx * 0.9 + sh, r * 0.5), R(-rx * 0.45 + sh * 2, r * 0.92),
                     R(sh * 3, r * 1.0), R(rx * 0.45 + sh * 2, r * 0.92), R(rx * 0.9 + sh, r * 0.5),
                     R(rx + sh, -r * 0.1), R(rx * 0.8, -r * 0.75), R(0, -r * 0.98), R(-rx * 0.8, -r * 0.75)])
    fx, fy = R(giro * r * 0.32, r * 0.05)  # face centre (features)
    shade_side = -1 if giro >= 0 else 1
    tq = [(*R(shade_side * rx * 0.9, r * 0.2), r * 0.6, mezcla(piel, '#b0603e', 0.4), 0.45)]
    lz.aguada(face, piel, dens=0.55, borde=0.45, irreg=0.6, gran=0.25, var=0.25, tapa=1, toques=tq)
    if mejillas:
        for sd in (-1, 1):
            cxx, cyy = R(giro * r * 0.32 + sd * r * (0.42 - 0.18 * giro * sd), r * 0.38)
            if giro * sd > 0.7:
                continue
            lz.aguada(Elipse(cxx, cyy, r * 0.2, r * 0.14), '#e9727a', dens=0.45, suave=r * 0.09, gran=0.1)
    # features (pencil)
    eye_y = r * 0.12
    ex = r * 0.3
    trazos_osc = []
    for sd in (-1, 1):
        k = 1 - 0.35 * max(0, giro * sd)
        cx_, cy_ = R(giro * r * 0.32 + sd * ex * k, eye_y)
        if ojos == 'cerrados':
            trazos_osc.append(arco(cx_, cy_ + r * 0.03, r * 0.11 * k, r * 0.08, 200, 340, 12, ang))
        elif ojos == 'abajo':
            trazos_osc.append(arco(cx_, cy_ - r * 0.02, r * 0.1 * k, r * 0.06, 20, 160, 12, ang))
        else:
            mx, my = mira
            ex_, ey_ = cx_ + mx * r * 0.05, cy_ + my * r * 0.04
            lz.aguada(Elipse(ex_, ey_, r * 0.085 * k, r * 0.11), '#3b2a24',
                      dens=1.35, borde=0.2, irreg=0.15, gran=0.1)
            # expressive, warm eyes: a tiny gouache catch-light and an upper lash
            lz.gouache(Elipse(ex_ + r * 0.025, ey_ - r * 0.035, max(0.5, r * 0.028)), '#fffdf6', alfa=0.95, irreg=0)
            lz.lapiz([arco(ex_, ey_ + r * 0.01, r * 0.11 * k, r * 0.12, 200, 330, 10, ang)], '#3b2a24',
                     grosor=0.9, presion=0.7, temblor=0.05, puntas=0.3)
        # eyebrow
        bx_, by_ = R(giro * r * 0.32 + sd * ex * k * 1.05, eye_y - r * 0.24)
        lz.lapiz([arco(bx_, by_ + r * 0.06, r * 0.13 * k, r * 0.06, 205, 335, 10, ang)], pelo_lp,
                 grosor=0.8, presion=0.45, temblor=0.15)
    if trazos_osc:
        lz.lapiz(trazos_osc, '#4a2e24', grosor=1.0, presion=0.85, temblor=0.12, puntas=0.3)
    # nose
    nx_, ny_ = R(giro * r * 0.42, r * 0.33)
    lz.lapiz([arco(nx_, ny_, r * 0.06, r * 0.07, -60 + 60 * giro, 100 + 60 * giro, 10, ang)], lp,
             grosor=0.8, presion=0.5, temblor=0.1)
    # mouth
    mx_, my_ = R(giro * r * 0.36, r * 0.6)
    if boca in ('abierta', 'canta'):
        hh = r * (0.12 if boca == 'abierta' else 0.14)
        ww = r * (0.17 if boca == 'abierta' else 0.1)
        m = Poligono(np.vstack([arco(mx_, my_ - hh * 0.2, ww, hh * 0.15, 180, 360, 8, ang),
                                arco(mx_, my_ - hh * 0.2, ww, hh, 0, 180, 12, ang)]), suave=False)
        lz.aguada(m, '#b8424a', dens=0.8, irreg=0.2, borde=0.3, gran=0.1)
        lz.contorno(m, '#7a3030', grosor=0.7, presion=0.5, cortes=0.1, desfase=0.1)
    else:
        w = r * (0.18 if boca == 'sonrisa' else 0.12)
        lz.lapiz([arco(mx_, my_ - r * 0.08, w, r * 0.1, 25, 155, 14, ang)], '#8f3c3c', grosor=0.9,
                 presion=0.75, temblor=0.1, puntas=0.3)
    # hair on top / front
    hp = None
    if peinado in ('corto', 'largo', 'mono', 'coleta', 'ondas'):
        part = giro * 0.3
        hp = Poligono([R(-rx * 1.06, r * 0.15), R(-rx * 1.04, -r * 0.45), R(-rx * 0.5, -r * 1.06),
                       R(rx * 0.3, -r * 1.1), R(rx * 1.0, -r * 0.6), R(rx * 1.07, r * 0.15),
                       R(rx * 0.85, -r * 0.25), R(rx * (0.2 + part), -r * 0.52),
                       R(-rx * (0.5 - part), -r * 0.35), R(-rx * 0.9, -r * 0.1)])
    elif peinado == 'rizado':
        cs = []
        for a in np.linspace(165, 375, 11):
            rr = r * rng.uniform(0.24, 0.31)
            px_, py_ = R(math.cos(math.radians(a)) * rx * 1.02, math.sin(math.radians(a)) * r * 1.0 - r * 0.02)
            cs.append((px_, py_, rr))
        for a in np.linspace(215, 325, 4):
            px_, py_ = R(math.cos(math.radians(a)) * rx * 0.6, math.sin(math.radians(a)) * r * 0.85 - r * 0.12)
            cs.append((px_, py_, r * 0.3))
        hp = Circulos(cs)
    elif peinado == 'calvo':
        hp = (Poligono([R(-rx * 1.04, r * 0.2), R(-rx * 1.0, -r * 0.35), R(-rx * 0.75, -r * 0.5),
                        R(-rx * 0.8, r * 0.05)]) |
              Poligono([R(rx * 1.04, r * 0.2), R(rx * 1.0, -r * 0.35), R(rx * 0.75, -r * 0.5),
                        R(rx * 0.8, r * 0.05)]))
    elif peinado == 'pañuelo':
        hp = Poligono([R(-rx * 1.15, r * 0.7), R(-rx * 1.12, -r * 0.5), R(-rx * 0.4, -r * 1.14),
                       R(rx * 0.5, -r * 1.14), R(rx * 1.12, -r * 0.5), R(rx * 1.15, r * 0.7),
                       R(rx * 0.9, r * 0.6), R(rx * 0.85, -r * 0.3), R(0, -r * 0.55), R(-rx * 0.85, -r * 0.3),
                       R(-rx * 0.9, r * 0.6)])
    if hp is not None:
        lz.aguada(hp, pelo, dens=0.75 if not canas else 0.4, borde=0.6, gran=0.4, tapa=1, irreg=0.8)
        lz.contorno(hp, pelo_lp, grosor=0.8, presion=0.55, cortes=0.35)
        # a few strands
        if peinado not in ('calvo', 'pañuelo'):
            st = []
            for k in range(5):
                a0 = rng.uniform(-0.8, 0.6)
                st.append(bezier(R(rx * a0, -r * 0.95), R(rx * (a0 - 0.3), -r * 0.7), R(rx * (a0 - 0.5), -r * 0.4)))
            lz.lapiz(st, pelo_lp, grosor=0.7, presion=0.35, temblor=0.2, cortes=0.3)
    if barba:
        b = Poligono([R(-rx * 0.85, r * 0.35), R(-rx * 0.5, r * 1.0), R(0, r * 1.2), R(rx * 0.5, r * 1.0),
                      R(rx * 0.85, r * 0.35), R(rx * 0.4, r * 0.72), R(giro * r * 0.36, r * 0.5),
                      R(-rx * 0.4, r * 0.72)])
        lz.aguada(b, barba, dens=0.55, gran=0.4, borde=0.4, irreg=1.0)
        lz.contorno(b, _lapiz_de(barba, 0.55), grosor=0.7, presion=0.4, cortes=0.4)
    if adorno:
        ax_, ay_ = R(-rx * 0.75, -r * 0.65)
        flor_simple(lz, ax_, ay_, r * 0.28, adorno)
    lz.contorno(face, lp, grosor=0.8, presion=0.45, cortes=0.45, desfase=0.5,
                solo=(x - r * 2, y - r * 0.2, x + r * 2, y + r * 2))
    return fx, fy


def flor_simple(lz, x, y, r, color='#e8735e', centro='#e8b53e', petalos=5, semilla=None):
    sem = lz._sem(semilla)
    rng = np.random.default_rng(sem)
    a0 = rng.uniform(0, 360)
    for k in range(petalos):
        a = math.radians(a0 + k * 360 / petalos)
        lz.aguada(Elipse(x + math.cos(a) * r * 0.55, y + math.sin(a) * r * 0.55, r * 0.5, r * 0.32,
                         math.degrees(a)), color, dens=0.55, irreg=0.5, borde=0.6, gran=0.2)
    lz.aguada(Elipse(x, y, r * 0.25), centro, dens=0.8, irreg=0.3)


def extremidad(lz, pts, anchos, color, tapa=1, dens=0.6, lapiz=None, toques=None, contorno=True, **kw):
    """Arm/leg/sleeve: a tapered wash along a path plus a loose pencil outline."""
    f = Trazo(pts, anchos)
    lz.aguada(f, color, dens=dens, tapa=tapa, toques=toques, **kw)
    if contorno:
        lz.contorno(f, lapiz or _lapiz_de(color), grosor=0.85, presion=0.55, cortes=0.3)
    return f


def mano(lz, x, y, ang, tam, piel='piel2', tipo='abierta', semilla=None):
    """A small mitten-like hand. ang: direction the fingers point (degrees,
    0 = right, 90 = down). tipo: 'abierta' | 'puño' | 'sujeta'."""
    a = math.radians(ang)
    d = np.array([math.cos(a), math.sin(a)])
    n = np.array([-d[1], d[0]])
    c = np.array([x, y])
    if tipo == 'puño':
        palm = Elipse(*(c + d * tam * 0.15), tam * 0.42, tam * 0.36, ang)
    else:
        palm = Elipse(*(c + d * tam * 0.3), tam * 0.55, tam * 0.36, ang)
    thumb = Elipse(*(c + d * tam * 0.18 + n * tam * 0.36), tam * 0.26, tam * 0.13, ang - 40)
    f = palm | thumb
    lz.aguada(f, piel, dens=0.6, tapa=1, irreg=0.4, borde=0.4, gran=0.2)
    lz.contorno(f, PIEL_LAPIZ, grosor=0.7, presion=0.5, cortes=0.3, desfase=0.3)
    if tipo == 'abierta':
        tr = []
        for k in (-0.12, 0.08):
            p0 = c + d * tam * 0.5 + n * tam * k
            tr.append(np.array([p0, p0 + d * tam * 0.3]))
        lz.lapiz(tr, PIEL_LAPIZ, grosor=0.6, presion=0.35, temblor=0.05)
    return f


def torso(lz, hi, hd, ci, cd, color, cuello=None, escote=0.3, tapa=1, toques=None, lapiz=None, **kw):
    """Shirt/torso from two shoulders (hi, hd) and two hips (ci, cd)."""
    hi, hd, ci, cd = map(np.asarray, (hi, hd, ci, cd))
    m = (hi + hd) / 2
    w = np.linalg.norm(hd - hi)
    pts = [hi + (0, w * 0.06), hi + (-w * 0.05, w * 0.25), (hi * 0.5 + ci * 0.5) + (-w * 0.02, 0),
           ci, (ci + cd) / 2 + (0, w * 0.04), cd, (hd * 0.5 + cd * 0.5) + (w * 0.02, 0),
           hd + (w * 0.05, w * 0.25), hd + (0, w * 0.06), m + (w * 0.22, -w * 0.02),
           m + (0, w * escote * 0.3), m + (-w * 0.22, -w * 0.02)]
    f = Poligono(pts)
    lz.aguada(f, color, dens=0.6, tapa=tapa, toques=toques, **kw)
    lz.contorno(f, lapiz or _lapiz_de(color), grosor=0.9, presion=0.55, cortes=0.35)
    return f


def figura(lz, J, ropa, cara=None):
    """A whole person from joints (base units).

    J keys: 'cabeza' (x, y, r); 'hi','hd' shoulders; 'ci','cd' hips;
    arms: 'brazo_i' / 'brazo_d' = [shoulder, elbow, wrist] (optional);
    legs: 'pierna_i' / 'pierna_d' = [hip, knee, ankle] (optional);
    'mano_i'/'mano_d' = (angle, tipo); 'pie_i'/'pie_d' = angle of the foot.
    'delante' = list of parts drawn after the torso (e.g. ['brazo_d']).
    ropa: dict with 'camisa', 'pantalon' or 'falda' (colour), 'piel', 'zapato',
    'falda_bajo' (list of hem points, for a dress), 'manga' ('larga'|'corta').
    cara: kwargs for cabeza().
    """
    piel = ropa.get('piel', 'piel2')
    hx, hy, hr = J['cabeza']
    grosor = hr * ropa.get('grosor', 0.56)  # slender, stylised limbs
    camisa = ropa.get('camisa', 'azul')
    delante = J.get('delante', [])

    def brazo(key):
        if key not in J:
            return
        sh, el, wr = map(np.asarray, J[key])
        larga = ropa.get('manga', 'larga') == 'larga'
        if larga:
            extremidad(lz, [sh, el, wr], (grosor * 1.05, grosor * 0.9, grosor * 0.8), camisa, dens=0.62)
        else:
            mid = sh + (el - sh) * 0.75
            extremidad(lz, [sh, el, wr], (grosor * 0.75, grosor * 0.66, grosor * 0.55), piel, dens=0.55,
                       lapiz=PIEL_LAPIZ)
            extremidad(lz, [sh, mid], (grosor * 1.1, grosor * 1.0), camisa, dens=0.62)
        an, tp = J.get('mano_' + key[-1], (None, 'abierta'))
        if an is None:
            v = wr - el
            an = math.degrees(math.atan2(v[1], v[0]))
        mano(lz, wr[0], wr[1], an, hr * 0.62, piel, tp)

    def pierna(key):
        if key not in J:
            return
        hp, kn, an = map(np.asarray, J[key])
        col = ropa.get('pantalon', None)
        if col:
            extremidad(lz, [hp, kn, an], (grosor * 1.35, grosor * 1.15, grosor * 0.95), col, dens=0.6)
        else:
            extremidad(lz, [hp, kn, an], (grosor * 1.0, grosor * 0.85, grosor * 0.65), piel, dens=0.5,
                       lapiz=PIEL_LAPIZ)
        fa = J.get('pie_' + key[-1], 0)
        a = math.radians(fa)
        z = Elipse(an[0] + math.cos(a) * hr * 0.35, an[1] + hr * 0.12, hr * 0.55, hr * 0.26, fa)
        zc = ropa.get('zapato', '#7a5544')
        lz.aguada(z, zc, dens=0.7, tapa=1, irreg=0.4)
        lz.contorno(z, _lapiz_de(zc), grosor=0.8, presion=0.5)

    for k in ('brazo_i', 'brazo_d'):
        if k not in delante:
            brazo(k)
    for k in ('pierna_i', 'pierna_d'):
        if k not in delante:
            pierna(k)
    if ropa.get('falda'):
        ci, cd = np.asarray(J['ci']), np.asarray(J['cd'])
        bajo = ropa['falda_bajo']
        pts = [ci + (0, -hr * 0.1)] + list(bajo) + [cd + (0, -hr * 0.1)]
        f = Poligono(pts)
        lz.aguada(f, ropa['falda'], dens=0.6, tapa=1, flor=ropa.get('falda_flor', 0), toques=ropa.get('falda_toques'))
        lz.contorno(f, _lapiz_de(ropa['falda']), grosor=0.9, presion=0.55, cortes=0.35)
    # neck
    nb = (np.asarray(J['hi']) + np.asarray(J['hd'])) / 2
    extremidad(lz, [(hx, hy + hr * 0.6), nb + (0, -hr * 0.05)], (hr * 0.5, hr * 0.55), piel, dens=0.6,
               lapiz=PIEL_LAPIZ, contorno=False, toques=[(hx, hy + hr * 0.9, hr * 0.4, mezcla(piel, '#9a5a3a', 0.5), 0.6)])
    torso(lz, J['hi'], J['hd'], J['ci'], J['cd'], camisa, toques=ropa.get('camisa_toques'))
    for k in delante:
        if k.startswith('brazo'):
            brazo(k)
        else:
            pierna(k)
    cabeza(lz, hx, hy, hr, piel=piel, **(cara or {}))


def busto(lz, x, y, r, camisa, piel='piel2', ancho=None, bajo=None, cuello=1.0, cara=None,
          inclina_cuerpo=0.0, toques=None):
    """Head and shoulders (for people seen through a window or behind a table).
    (x, y) head centre, r head radius, bajo = y where the body is cut."""
    ancho = ancho or r * 2.7
    bajo = bajo or y + r * 4
    ny = y + r * (0.75 + 0.45 * cuello)
    dx = inclina_cuerpo
    pts = [(x - r * 0.28, ny - r * 0.15), (x - ancho * 0.42 + dx * 0.4, ny + r * 0.25),
           (x - ancho * 0.52 + dx * 0.6, ny + r * 0.9), (x - ancho * 0.55 + dx, bajo),
           (x + ancho * 0.55 + dx, bajo), (x + ancho * 0.52 + dx * 0.6, ny + r * 0.9),
           (x + ancho * 0.42 + dx * 0.4, ny + r * 0.25), (x + r * 0.28, ny - r * 0.15),
           (x, ny + r * 0.25)]
    extremidad(lz, [(x, y + r * 0.6), (x, ny + r * 0.1)], (r * 0.5, r * 0.56), piel, dens=0.6,
               contorno=False, toques=[(x, y + r * 0.95, r * 0.45, mezcla(piel, '#9a5a3a', 0.5), 0.6)])
    f = Poligono(pts)
    lz.aguada(f, camisa, dens=0.62, tapa=1, toques=toques)
    lz.contorno(f, _lapiz_de(camisa), grosor=0.9, presion=0.55, cortes=0.35,
                solo=(x - ancho, y, x + ancho, bajo - 2))
    cabeza(lz, x, y, r, piel=piel, **(cara or {}))
    return f
