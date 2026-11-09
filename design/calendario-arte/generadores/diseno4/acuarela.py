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

Figures: `cabeza`, `extremidad`, `mano`, `torso`, `busto` (head and shoulders,
e.g. people seen through a window), `figura` (a whole person from a joint
dictionary; `ropa['falda_jardin']` makes a skirt that is a garden). Faces are
simple and tender: dark eyes with a gouache catch-light or happy closed arcs,
rosy cheeks, small smile. Limbs are slender (Sonja-Wimmer-like stylisation).

Series rules (Eugenio, 2026-11-09) the library already enforces or helps with
----------------------------------------------------------------------------
* PAPER: unpainted areas are EXACTLY RGB (244, 239, 228) = PAPEL, the colour of
  the calendar sheet. The paper grain only shows under paint. Do NOT paint
  skies or floors edge to edge; `fondo()` exists but is NOT for Diseño 4.
  Save JPGs with `keep_rgb=True` (see the month scripts' notes): ordinary
  YCbCr JPEG cannot reproduce 244,239,228 exactly (it comes back 243,239,228).
* HIGH CONTRAST, MANY LITTLE DETAILS INSIDE THINGS, SILENCE AROUND THEM:
  `jardin(lz, forma)` turns any shape into a garden (big layered flowers and
  leaves, then sprigs, berries, dots); `cosmos(lz, forma)` turns it into night
  sky and sea at once (indigo blooms, star dust, stars, a shoal of tiny fish).
  Small loose motifs to float on the paper: `pajaro`, `libelula`, `estrella`
  (gouache=False on paper), `pececillo`, `hojita`, `hoja`, `flor_simple`,
  `flor_grande`, `mata`, `ramita`, `motas`.
* MAGIC LIGHT: `luz()` glows from inside painted things (screen blend, never
  bleaches bare paper); `gouache()` opaque highlights; `chispas()` sparks for
  dark grounds; `collage()` a piece of painted paper glued on.

Memory: work happens in crops around each shape; arrays are float32.
"""
from __future__ import annotations

import math
import numpy as np
import cv2
from PIL import Image
from skimage import measure

BASE_W, BASE_H = 1485, 850
# Bone-white paper, EXACTLY the colour of the calendar sheet (Eugenio, 2026-11-09):
# every unpainted area of every illustration must read as RGB (244, 239, 228).
PAPEL = '#f4efe4'

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
    def __init__(self, ancho=BASE_W, semilla=1, papel=PAPEL):
        self.s = ancho / BASE_W
        self.W = int(ancho)
        self.H = int(round(BASE_H * self.s))
        self.semilla = semilla
        self._n = semilla * 7919
        self.papel = rgb(papel)
        self.relieve = 0.03  # strength of the embossed paper grain
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
               devuelve=False, sombra=None):
        """Paint one transparent watercolour wash. See module docstring.

        sombra (optional): a second, hard-edged glaze painted on the shadow
        side of the same shape, the way a watercolourist models volume:
        (dx, dy) = direction of the LIGHT in units (e.g. (-6, -5) = light from
        top-left; the crescent opposite gets the glaze), or
        (dx, dy, colour, dens_factor)."""
        sem = self._sem(semilla)
        s = self.s
        pad = 6 + 4 * irreg + 3 * suave + (20 if flor else 0)
        if sombra is not None:
            pad += abs(sombra[0]) + abs(sombra[1])
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
            # wet edge: a thin, dark rim where pigment dried (the signature of
            # watercolour) plus a wider, gentle migration toward the edge
            E1 = np.clip(Mw - _blur(Mw, 0.9 * s), 0, 1) * 3.2
            E2 = np.clip(Mw - _blur(Mw, 4.0 * s), 0, 1) * 1.6
            E = np.minimum(E1, 1.0) * 1.1 + np.minimum(E2, 1.0) * 0.35
        # unevenness: big soft puddles + pigment pooled toward one side
        lo = self.ruido(x0, y0, x1, y1, 60, sem + 2) * 0.65 + self.ruido(x0, y0, x1, y1, 20, sem + 3) * 0.35
        lo = np.clip((lo - 0.5) * 1.6 + 0.5, 0, 1)
        X, Y = self._malla(x0, y0, x1, y1)
        bb = forma.bbox()
        rr_ = np.random.default_rng(sem + 9)
        aa = rr_.uniform(0, 2 * np.pi)
        span = max(bb[2] - bb[0], bb[3] - bb[1], 1)
        pool = ((X - (bb[0] + bb[2]) / 2) * math.cos(aa) + (Y - (bb[1] + bb[3]) / 2) * math.sin(aa)) / span
        D = dens * Mw * (1 + var * 2 * (lo - 0.5) + var * 0.9 * pool) + dens * borde * E * 1.25
        if gran > 0:
            # granulation settles in patches (not a uniform noise filter):
            # pigment sinks into the paper valleys where the wash was wettest
            g = self.grano[y0:y1, x0:x1]
            clump = _ss(self.ruido(x0, y0, x1, y1, 26, sem + 4), 0.35, 0.8)
            fine = self.ruido(x0, y0, x1, y1, 1.4, sem + 8)
            D = D * np.clip(1 + gran * clump * (1.1 * (0.5 - g) + 0.35 * (fine - 0.5))
                            + gran * 0.25 * (0.5 - g), 0.3, 2.0)
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
        if sombra is not None:
            dx, dy = sombra[0], sombra[1]
            sc = sombra[2] if len(sombra) > 2 else None
            sf = sombra[3] if len(sombra) > 3 else 0.7
            Sh = np.roll(np.roll(M, int(round(dx * s)), 1), int(round(dy * s)), 0)
            C = M * (1 - Sh)
            Cb = _blur(C, 3.0 * s)
            nn = 0.6 * self.ruido(x0, y0, x1, y1, 12, sem + 11) + 0.4 * self.ruido(x0, y0, x1, y1, 4, sem + 12)
            Cw = _ss(Cb, 0.3 + 0.45 * (nn - 0.5), 0.5 + 0.45 * (nn - 0.5)) * Mw
            Ce = np.minimum(np.clip(Cw - _blur(Cw, 0.9 * s), 0, 1) * 3.0, 1)
            Dsh = dens * sf * (Cw + 0.6 * Ce)
            if sc is None:
                D = D + Dsh
            else:
                self._sombra_pend = (Dsh, sc)
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
            self.OP[y0:y1, x0:x1] *= (1 - lift * tapa)[..., None]   # also hides gouache behind it
        T *= np.exp(D[..., None] * L)
        if getattr(self, '_sombra_pend', None) is not None:
            Dsh, sc = self._sombra_pend
            self._sombra_pend = None
            T *= np.exp(Dsh[..., None] * np.log(np.clip(rgb(sc), 0.02, 1)))
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
        rel = self.relieve * (gx * -0.7 + gy * -0.7) / max(self.s, 1.0) - 0.03 * (0.5 - g)
        # the grain shows where there is paint; bare paper stays (almost) exactly PAPEL
        cub = _ss(1 - self.T.min(axis=2), 0.0, 0.12)
        cub = np.maximum(cub, _ss(np.clip(self.LUZ.max(axis=2), 0, 1), 0, 0.3) * 0.0)
        sh = 1 + rel * (0.12 + 0.88 * cub)
        out = self.papel[None, None, :] * self.T * sh[..., None]
        L = np.clip(self.LUZ, 0, 1.5) * cub[..., None]
        out = out + (1 - out) * (1 - np.exp(-1.25 * L))    # screen-like inner light
        # light only blooms over paint (on bare paper it would bleach the bone white)
        a = self.OP[..., 3:]
        out = out * (1 - a) + self.OP[..., :3] * sh[..., None]
        return (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)

    def guardar(self, ruta, calidad=90):
        im = Image.fromarray(self.imagen())
        if ruta.lower().endswith(('.jpg', '.jpeg')):
            # keep_rgb: store RGB (no YCbCr) so the bone paper stays exactly 244,239,228
            im.save(ruta, quality=calidad, subsampling=0, keep_rgb=True)
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
    'abierta' | 'ríe' (open laugh with laugh lines) | 'suave' | 'canta'. Eyes have
    sepia lids, crease and lashes; nose and mouth are drawn in sepia pencil. peinado: 'corto', 'rizado', 'mono' (bun),
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
    SEP = '#6b4433'                      # sepia pencil for the features
    gw = max(0.7, r * 0.035)             # pencil weight grows with the head
    # ears, with the inner curl drawn in pencil
    for sd in (-1, 1):
        if giro * sd > 0.55:
            continue
        ex, ey = R(sd * rx * (0.98 - 0.25 * max(0, giro * sd)) - giro * r * 0.1, r * 0.1)
        f = Elipse(ex, ey, r * 0.15, r * 0.22)
        lz.aguada(f, piel, dens=0.62, tapa=1, irreg=0.3, gran=0.15,
                  toques=[(ex, ey, r * 0.1, mezcla(piel, '#c0604a', 0.5), 0.6)])
        lz.lapiz([arco(ex, ey, r * 0.08, r * 0.13, 90 - sd * 90 - 70, 90 - sd * 90 + 110, 10)], SEP,
                 grosor=gw * 0.7, presion=0.4, temblor=0.05)
    # face, modelled with a second glaze on the side away from the light
    sh = giro * r * 0.08
    face = Poligono([R(-rx + sh, -r * 0.1), R(-rx * 0.92 + sh, r * 0.48), R(-rx * 0.5 + sh * 2, r * 0.9),
                     R(sh * 3, r * 1.02), R(rx * 0.5 + sh * 2, r * 0.9), R(rx * 0.92 + sh, r * 0.48),
                     R(rx + sh, -r * 0.1), R(rx * 0.8, -r * 0.75), R(0, -r * 0.98), R(-rx * 0.8, -r * 0.75)])
    fx, fy = R(giro * r * 0.32, r * 0.05)  # face centre (features)
    shade_side = -1 if giro >= 0 else 1
    tq = [(*R(shade_side * rx * 0.9, r * 0.25), r * 0.55, mezcla(piel, '#b0603e', 0.35), 0.4),
          (*R(giro * r * 0.3, -r * 0.5), r * 0.5, mezcla(piel, '#fff0e0', 0.3), 0.5)]
    lz.aguada(face, piel, dens=0.6, borde=0.5, irreg=0.5, gran=0.15, var=0.25, tapa=1, toques=tq,
              sombra=(-shade_side * r * 0.5, -r * 0.25, mezcla(piel, '#a0503a', 0.45), 0.35))
    cx0 = giro * r * 0.32                      # horizontal centre of the features (local)
    eye_y = r * 0.14
    ex = r * 0.31
    if mejillas:
        for sd in (-1, 1):
            if giro * sd > 0.7:
                continue
            cxx, cyy = R(cx0 + sd * r * (0.45 - 0.18 * giro * sd), r * 0.42)
            lz.aguada(Elipse(cxx, cyy, r * 0.22, r * 0.15), '#ec6a72', dens=0.5, suave=r * 0.08, gran=0.05)
    # eyes: lids, iris, catch-light, lashes -- in sepia pencil
    rie = boca in ('abierta', 'ríe')
    for sd in (-1, 1):
        k = 1 - 0.35 * max(0, giro * sd)
        cx_, cy_ = R(cx0 + sd * ex * k, eye_y)
        ew, eh = r * 0.13 * k, r * 0.085
        outer = sd  # outer corner side
        if ojos == 'cerrados':           # laughing: arcs pushed up by the cheeks
            lid = arco(cx_, cy_ + r * 0.04, ew, eh, 195, 345, 14, ang)
            lz.lapiz([lid], SEP, grosor=gw * 1.15, presion=0.9, temblor=0.05, puntas=0.3)
            tip = lid[-1] if outer > 0 else lid[0]
            lz.lapiz([[tip, (tip[0] + outer * r * 0.06, tip[1] - r * 0.03)],
                      [tip, (tip[0] + outer * r * 0.07, tip[1] + r * 0.01)]], SEP, grosor=gw * 0.7, presion=0.7)
            if rie:   # the cheek lifts under the eye
                lz.lapiz([arco(cx_, cy_ + r * 0.16, ew * 0.9, r * 0.05, 30, 150, 10, ang)], SEP, grosor=gw * 0.6,
                         presion=0.3)
        elif ojos == 'abajo':            # tender, eyes lowered: lid with lashes
            lid = arco(cx_, cy_, ew, eh * 0.8, 15, 165, 14, ang)
            lz.lapiz([lid], SEP, grosor=gw * 1.15, presion=0.9, temblor=0.05, puntas=0.3)
            for t in (0.25, 0.5, 0.75) if k > 0.8 else (0.5,):
                p = lid[int(t * (len(lid) - 1))]
                lz.lapiz([[p, (p[0] + (t - 0.5) * r * 0.08, p[1] + r * 0.05)]], SEP, grosor=gw * 0.55, presion=0.6)
            lz.lapiz([arco(cx_, cy_ - r * 0.03, ew * 1.05, eh * 1.4, 200, 340, 12, ang)], SEP, grosor=gw * 0.5,
                     presion=0.3)          # the upper crease of the lid
        else:
            mx, my = mira
            ix, iy = cx_ + mx * r * 0.04, cy_ + my * r * 0.03
            # white of the eye left as paper; iris; upper lid over it
            lz.aguada(Elipse(ix, iy + r * 0.01, r * 0.075 * k, r * 0.085), '#4a2c22', dens=1.3, borde=0.3,
                      irreg=0.1, gran=0.05, toques=[(ix, iy + r * 0.05, r * 0.05, '#8a5a3a', 0.5)])
            lz.gouache(Elipse(ix + r * 0.025, iy - r * 0.025, max(0.45, r * 0.026)), '#fffdf6', alfa=0.95, irreg=0)
            lid = arco(cx_, cy_ + r * 0.01, ew, eh, 192, 348, 14, ang)
            lz.lapiz([lid], SEP, grosor=gw * 1.25, presion=0.95, temblor=0.04, puntas=0.25)
            tip = lid[-1] if outer > 0 else lid[0]
            lz.lapiz([[tip, (tip[0] + outer * r * 0.06, tip[1] - r * 0.04)]], SEP, grosor=gw * 0.7, presion=0.8)
            lz.lapiz([arco(cx_, cy_ + r * 0.02, ew * 0.8, eh * 0.9, 30, 150, 10, ang)], SEP, grosor=gw * 0.5,
                     presion=0.3)          # lower lid
            lz.lapiz([arco(cx_, cy_ - r * 0.03, ew * 1.05, eh * 1.5, 205, 335, 12, ang)], SEP, grosor=gw * 0.5,
                     presion=0.25)         # crease
        # eyebrow: raised a little (joy)
        bx_, by_ = R(cx0 + sd * ex * k * 1.05, eye_y - r * 0.27 - (r * 0.03 if rie else 0))
        lz.lapiz([arco(bx_, by_ + r * 0.07, r * 0.14 * k, r * 0.07, 200, 335, 10, ang)], pelo_lp,
                 grosor=gw * 1.1, presion=0.6, temblor=0.1)
    # nose: a soft shadow and a sepia line with the nostril
    nx_, ny_ = R(cx0 + r * 0.06 * (1 if giro >= 0 else -1), r * 0.36)
    lz.aguada(Elipse(nx_ + shade_side * r * 0.04, ny_ + r * 0.03, r * 0.07, r * 0.045), mezcla(piel, '#a0503a', 0.5),
              dens=0.45, suave=r * 0.03, gran=0.05)
    sgn = 1 if giro >= 0 else -1
    lz.lapiz([bezier(R(cx0 + sgn * r * 0.02, r * 0.16), R(cx0 + sgn * r * 0.09, r * 0.3),
                     R(cx0 + sgn * r * 0.07, r * 0.4), n=12),
              arco(nx_ - sgn * r * 0.03, ny_ + r * 0.02, r * 0.05, r * 0.035, 20, 200, 10, ang)], SEP,
             grosor=gw * 0.75, presion=0.55, temblor=0.05)
    # mouth
    mx_, my_ = R(cx0, r * 0.62)
    if boca in ('abierta', 'ríe', 'canta'):
        if boca == 'canta':
            m = Elipse(mx_, my_, r * 0.08, r * 0.11, ang)
        else:
            ww, hh = r * 0.2, r * 0.16
            top = bezier(R(cx0 - ww, r * 0.56), R(cx0, r * 0.6), R(cx0 + ww, r * 0.56), n=12)
            bot = bezier(R(cx0 + ww, r * 0.56), R(cx0, r * 0.62 + hh * 1.6), R(cx0 - ww, r * 0.56), n=16)
            m = Poligono(np.vstack([top, bot[1:]]), suave=False)
        lz.aguada(m, '#8f2a36', dens=0.95, irreg=0.15, borde=0.4, gran=0.05, tapa=1,
                  toques=[(mx_, my_ + r * 0.1, r * 0.08, '#e8707a', 0.85)])
        if boca != 'canta':
            lz.gouache(Poligono([R(cx0 - r * 0.15, r * 0.58), R(cx0 + r * 0.15, r * 0.58), R(cx0 + r * 0.12, r * 0.63),
                                 R(cx0 - r * 0.12, r * 0.63)]), '#fff8ee', alfa=0.85, irreg=0.1)
        lz.contorno(m, '#6a2a2a', grosor=gw * 0.8, presion=0.6, cortes=0.05, desfase=0.05)
        if rie:   # laugh lines
            for sd in (-1, 1):
                a0_, a1_ = (-60, 60) if sd > 0 else (120, 240)
                lz.lapiz([arco(*R(cx0 + sd * r * 0.25, r * 0.6), r * 0.04, r * 0.08, a0_, a1_, 8, ang)],
                         SEP, grosor=gw * 0.5, presion=0.3)
    else:
        w = r * (0.19 if boca == 'sonrisa' else 0.12)
        sm = bezier(R(cx0 - w, r * 0.56), R(cx0, r * 0.7 if boca == 'sonrisa' else r * 0.64), R(cx0 + w, r * 0.56), n=16)
        lz.lapiz([sm], '#7a2e30', grosor=gw * 1.0, presion=0.8, temblor=0.05, puntas=0.25)
        for sd in (-1, 1):   # little upturned corners
            p = sm[-1] if sd > 0 else sm[0]
            lz.lapiz([[p, (p[0] + sd * r * 0.03, p[1] - r * 0.025)]], '#7a2e30', grosor=gw * 0.6, presion=0.5)
        lz.aguada(Elipse(*R(cx0, r * 0.72), r * 0.09, r * 0.035, ang), '#e0707a', dens=0.4, suave=r * 0.02)
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
        lz.aguada(hp, pelo, dens=0.78 if not canas else 0.4, borde=0.6, gran=0.3, tapa=1, irreg=0.8,
                  sombra=(-shade_side * r * 0.3, -r * 0.3, mezcla(pelo, '#1a1010', 0.4), 0.45))
        lz.contorno(hp, pelo_lp, grosor=gw * 0.9, presion=0.55, cortes=0.35)
        # strands and a lifted shine
        if peinado not in ('calvo', 'pañuelo'):
            st = []
            for k in range(9):
                a0 = rng.uniform(-0.9, 0.7)
                st.append(bezier(R(rx * a0, -r * 0.97), R(rx * (a0 - 0.25), -r * 0.72), R(rx * (a0 - 0.45), -r * 0.42)))
            lz.lapiz(st, pelo_lp, grosor=gw * 0.6, presion=0.4, temblor=0.15, cortes=0.25)
            lz.levanta(Trazo([R(-rx * 0.5, -r * 0.82), R(0, -r * 0.95), R(rx * 0.3, -r * 0.92)],
                             (r * 0.08, r * 0.1, r * 0.05)), 0.25, suave=r * 0.05)
    if barba:
        b = Poligono([R(-rx * 0.85, r * 0.35), R(-rx * 0.5, r * 1.0), R(0, r * 1.2), R(rx * 0.5, r * 1.0),
                      R(rx * 0.85, r * 0.35), R(rx * 0.4, r * 0.72), R(giro * r * 0.36, r * 0.5),
                      R(-rx * 0.4, r * 0.72)])
        lz.aguada(b, barba, dens=0.55, gran=0.4, borde=0.4, irreg=1.0)
        lz.contorno(b, _lapiz_de(barba, 0.55), grosor=0.7, presion=0.4, cortes=0.4)
    if adorno:
        ax_, ay_ = R(-rx * 0.75, -r * 0.65)
        flor_simple(lz, ax_, ay_, r * 0.28, adorno)
    lz.contorno(face, SEP, grosor=gw * 0.8, presion=0.45, cortes=0.4, desfase=r * 0.015,
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


def extremidad(lz, pts, anchos, color, tapa=1, dens=0.6, lapiz=None, toques=None, contorno=True, sombra=None,
               **kw):
    """Arm/leg/sleeve: a tapered wash along a path plus a loose pencil outline.
    With exactly three points (shoulder, elbow, wrist) the limb is built as two
    straight segments with a rounded joint, so elbows and knees really bend.
    sombra: optional light direction (dx, dy) for a modelling glaze."""
    pts = [tuple(map(float, p)) for p in pts]
    if len(pts) == 3:
        an = list(anchos) if len(anchos) == 3 else [anchos[0], (anchos[0] + anchos[-1]) / 2, anchos[-1]]
        f = Trazo(pts[:2], (an[0], an[1]), suave=False) | Trazo(pts[1:], (an[1] * 1.02, an[2]), suave=False)
    else:
        f = Trazo(pts, anchos)
    if sombra is None:
        w = max(anchos)
        sombra = (-w * 0.35, -w * 0.3, mezcla(color, '#3a2030', 0.35), 0.4)
    lz.aguada(f, color, dens=dens, tapa=tapa, toques=toques, sombra=sombra if sombra else None, **kw)
    if contorno:
        lz.contorno(f, lapiz or _lapiz_de(color), grosor=0.85, presion=0.55, cortes=0.3)
    return f


def mano(lz, x, y, ang, tam, piel='piel2', tipo='abierta', semilla=None, pulgar=1):
    """A hand with fingers. (x, y) = wrist; ang = direction the fingers point
    (degrees, 0 = right, 90 = down); tam = wrist-to-fingertip length (units).
    tipo: 'abierta' (fingers spread), 'junta' (flat, fingers together, for a
    caress), 'sujeta' / 'puño' (fingers curled round something), 'señala'.
    pulgar: +1 / -1, which side the thumb is on."""
    a = math.radians(ang)
    d = np.array([math.cos(a), math.sin(a)])
    n = np.array([-d[1], d[0]]) * pulgar
    c = np.array([x, y], float)
    P = lambda u, v: c + d * u * tam + n * v * tam
    palma = Poligono([P(-0.04, -0.15), P(0.25, -0.19), P(0.5, -0.18), P(0.54, 0.0), P(0.5, 0.19), P(0.25, 0.21),
                      P(-0.04, 0.16)])
    dedos = []
    if tipo in ('abierta', 'junta', 'señala'):
        spread = 15 if tipo == 'abierta' else 4
        for i, (v, L) in enumerate(((-0.15, 0.34), (-0.05, 0.43), (0.05, 0.41), (0.15, 0.32))):
            aa = math.radians(ang + (-1.5 + i) * spread * pulgar)
            dd = np.array([math.cos(aa), math.sin(aa)])
            root = P(0.44, v)
            if tipo == 'señala' and i != 1:
                dedos.append(Elipse(*P(0.55, v), tam * 0.1, tam * 0.06, ang + 90))
                continue
            dedos.append(Trazo([root, root + dd * L * tam], (tam * 0.105, tam * 0.085), suave=False))
        pul = Trazo([P(0.1, 0.17), P(0.24, 0.32), P(0.36, 0.4)], (tam * 0.13, tam * 0.11, tam * 0.09), suave=False)
    else:
        # curled fingers: a row of knuckles wrapping forward, thumb across them
        for i, v in enumerate((-0.15, -0.05, 0.05, 0.15)):
            dedos.append(Elipse(*P(0.56, v), tam * 0.1, tam * 0.06, ang + 90))
        pul = Trazo([P(0.12, 0.18), P(0.3, 0.2), P(0.46, 0.12)], (tam * 0.13, tam * 0.11, tam * 0.09), suave=False)
    tono_sombra = mezcla(piel, '#a0503a', 0.4)
    SEP = '#6b4433'
    gw = max(0.5, tam * 0.028)
    f = palma
    for g in dedos + [pul]:
        f = f | g
    lz.aguada(f, piel, dens=0.62, tapa=1, irreg=0.15, borde=0.5, gran=0.1,
              sombra=(-d[0] * tam * 0.12 - n[0] * tam * 0.08, -d[1] * tam * 0.12 - n[1] * tam * 0.08, tono_sombra, 0.3))
    # each finger outlined on its own so they read as fingers
    for g in dedos + [pul]:
        lz.contorno(g, SEP, grosor=gw, presion=0.5, cortes=0.1, desfase=0.0)
    lz.contorno(palma, SEP, grosor=gw, presion=0.45, cortes=0.3, desfase=0.0)
    # separations between fingers and the knuckle line
    tr = []
    if tipo in ('sujeta', 'puño'):
        for v in (-0.1, 0.0, 0.1):
            tr.append([P(0.5, v), P(0.62, v)])
    else:
        tr.append([P(0.3, -0.1), P(0.42, -0.12)])
    lz.lapiz(tr, SEP, grosor=gw * 0.7, presion=0.4, temblor=0.03)
    return f


def torso(lz, hi, hd, ci, cd, color, cuello=None, escote=0.3, tapa=1, toques=None, lapiz=None, pliegues=True,
          luz=(-1, -1), **kw):
    """Shirt/torso from two shoulders (hi, hd) and two hips (ci, cd), with a
    modelling glaze away from the light and a few pencil folds."""
    hi, hd, ci, cd = map(np.asarray, (hi, hd, ci, cd))
    m = (hi + hd) / 2
    w = np.linalg.norm(hd - hi)
    pts = [hi + (0, w * 0.06), hi + (-w * 0.06, w * 0.25), (hi * 0.5 + ci * 0.5) + (-w * 0.01, 0),
           ci, (ci + cd) / 2 + (0, w * 0.04), cd, (hd * 0.5 + cd * 0.5) + (w * 0.01, 0),
           hd + (w * 0.06, w * 0.25), hd + (0, w * 0.06), m + (w * 0.2, -w * 0.06),
           m + (0, w * escote * 0.3), m + (-w * 0.2, -w * 0.06)]
    f = Poligono(pts)
    sh = kw.pop('sombra', (luz[0] * w * 0.3, luz[1] * w * 0.15, mezcla(color, '#3a2030', 0.35), 0.45))
    lz.aguada(f, color, dens=0.8, tapa=tapa, toques=toques, sombra=sh, **kw)
    lp = lapiz or _lapiz_de(color)
    lz.contorno(f, lp, grosor=0.9, presion=0.55, cortes=0.35)
    if pliegues:
        tr = [bezier(hi + (w * 0.08, w * 0.3), hi + (w * 0.2, w * 0.5), ci + (w * 0.15, -w * 0.25)),
              bezier(hd + (-w * 0.1, w * 0.35), hd + (-w * 0.2, w * 0.55), cd + (-w * 0.2, -w * 0.3)),
              bezier(ci + (w * 0.2, -w * 0.08), (ci + cd) / 2 + (0, -w * 0.12), cd + (-w * 0.25, -w * 0.06))]
        lz.lapiz(tr, lp, grosor=0.7, presion=0.3, temblor=0.4, cortes=0.4)
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
            extremidad(lz, [sh, el, wr], (grosor * 1.05, grosor * 0.9, grosor * 0.8), camisa, dens=0.76)
        else:
            mid = sh + (el - sh) * 0.75
            extremidad(lz, [sh, el, wr], (grosor * 0.75, grosor * 0.66, grosor * 0.55), piel, dens=0.55,
                       lapiz=PIEL_LAPIZ)
            extremidad(lz, [sh, mid], (grosor * 1.1, grosor * 1.0), camisa, dens=0.76)
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
            extremidad(lz, [hp, kn, an], (grosor * 1.35, grosor * 1.15, grosor * 0.95), col, dens=0.74)
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
        if ropa.get('falda_jardin') is not None:      # a skirt that IS a garden
            jardin(lz, f, **ropa['falda_jardin'])
        else:
            lz.aguada(f, ropa['falda'], dens=0.6, tapa=1, flor=ropa.get('falda_flor', 0),
                      toques=ropa.get('falda_toques'))
        lz.contorno(f, _lapiz_de(ropa['falda']), grosor=0.9, presion=0.55, cortes=0.35)
    # neck
    nb = (np.asarray(J['hi']) + np.asarray(J['hd'])) / 2
    cw = ropa.get('cuello', 0.5)
    extremidad(lz, [(hx, hy + hr * 0.6), nb + (0, -hr * 0.05)], (hr * cw, hr * (cw + 0.05)), piel, dens=0.6,
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
    # natural shoulders: the trapezius slopes from the neck to round shoulder caps
    pts = [(x - r * 0.3, ny - r * 0.2), (x - ancho * 0.3 + dx * 0.3, ny + r * 0.12),
           (x - ancho * 0.47 + dx * 0.5, ny + r * 0.38), (x - ancho * 0.53 + dx * 0.7, ny + r * 0.85),
           (x - ancho * 0.55 + dx, bajo), (x + ancho * 0.55 + dx, bajo),
           (x + ancho * 0.53 + dx * 0.7, ny + r * 0.85), (x + ancho * 0.47 + dx * 0.5, ny + r * 0.38),
           (x + ancho * 0.3 + dx * 0.3, ny + r * 0.12), (x + r * 0.3, ny - r * 0.2), (x, ny + r * 0.2)]
    extremidad(lz, [(x, y + r * 0.6), (x, ny + r * 0.1)], (r * 0.48, r * 0.56), piel, dens=0.62,
               contorno=False, sombra=False,
               toques=[(x, y + r * 0.98, r * 0.42, mezcla(piel, '#9a5a3a', 0.55), 0.7)])
    f = Poligono(pts)
    lz.aguada(f, camisa, dens=0.8, tapa=1, toques=toques,
              sombra=(-ancho * 0.1, -r * 0.2, mezcla(camisa, '#3a2030', 0.35), 0.4))
    lp = _lapiz_de(camisa)
    lz.contorno(f, lp, grosor=0.9, presion=0.55, cortes=0.35, solo=(x - ancho, y, x + ancho, bajo - 2))
    # folds in sepia pencil: from the armpits, and the collar line
    sp = tuple(mezcla(lp, '#5a3a2a', 0.5).tolist())
    lz.lapiz([bezier((x - ancho * 0.36, ny + r * 0.55), (x - ancho * 0.28, ny + r * 1.1), (x - ancho * 0.34, bajo - 2)),
              bezier((x + ancho * 0.34, ny + r * 0.6), (x + ancho * 0.24, ny + r * 1.2), (x + ancho * 0.3, bajo - 2)),
              bezier((x - ancho * 0.2, ny + r * 0.9), (x - ancho * 0.1, ny + r * 1.05), (x - ancho * 0.02, ny + r * 1.3)),
              arco(x, ny - r * 0.05, r * 0.32, r * 0.25, 20, 160, 12)],
             sp, grosor=0.75, presion=0.45, temblor=0.35, cortes=0.25)
    cabeza(lz, x, y, r, piel=piel, **(cara or {}))
    return f



# ======================================================================
#  Little worlds inside things (Eugenio's reference, 2026-11-09)
# ======================================================================
#
#  High contrast and many tiny details INSIDE the elements, silence around
#  them. `jardin` turns any shape into a garden (a heart, a skirt, an arm);
#  `cosmos` turns it into night sky and ocean at once. The small motifs
#  (`hojita`, `estrella`, `pececillo`, `libelula`, `motas`) can float alone on
#  the bone paper as the one detail the eye gets lost in.

class _Unidad:
    s = 1.0


def puntos_dentro(forma, n, semilla=0, margen=0.0):
    """n random points (units) inside a shape; identical at every resolution."""
    x0, y0, x1, y1 = [int(math.floor(v)) for v in forma.bbox()]
    x1 += 2
    y1 += 2
    M = forma.mascara(_Unidad, x0, y0, x1, y1)
    if margen > 0:
        M = _blur(M, margen)
    ys, xs = np.nonzero(M > 0.6)
    rng = np.random.default_rng(semilla)
    if len(xs) == 0:
        return np.zeros((0, 2))
    i = rng.choice(len(xs), size=min(n, len(xs)), replace=False)
    return np.stack([xs[i] + x0 + rng.random(len(i)), ys[i] + y0 + rng.random(len(i))], 1)


def hojita(lz, x, y, largo, ang, color='#5f8f63', nervio=True, tapa=0.7, dens=0.75):
    """A small leaf with a pencil midrib. ang in degrees (direction of the tip)."""
    a = math.radians(ang)
    c = np.array([x, y]) + np.array([math.cos(a), math.sin(a)]) * largo / 2
    f = Elipse(c[0], c[1], largo / 2, largo * 0.2, ang)
    lz.aguada(f, color, dens=dens, irreg=0.4, borde=0.7, tapa=tapa, gran=0.3)
    if nervio:
        p0 = np.array([x, y])
        p1 = p0 + np.array([math.cos(a), math.sin(a)]) * largo * 0.95
        lz.lapiz([[p0, p1]], _lapiz_de(color, 0.45), grosor=0.5, presion=0.5, temblor=0.05)


def ramita(lz, pts, color='#5f8f63', hojas=6, largo=9, semilla=None, tallo='#4f6f45'):
    """A pencil stem with leaves alternating along it (ferns, sprigs)."""
    sem = lz._sem(semilla)
    rng = np.random.default_rng(sem)
    p = spline(pts) if len(pts) > 2 else np.asarray(pts, float)
    lz.lapiz([p], tallo, grosor=0.7, presion=0.6, temblor=0.2)
    q = remuestrea(p, max(1.0, (np.hypot(*np.diff(p, axis=0).T).sum()) / (hojas + 1)))
    for k in range(1, len(q) - 1):
        d = q[k + 1] - q[k - 1]
        base = math.degrees(math.atan2(d[1], d[0]))
        sd = 1 if k % 2 else -1
        hojita(lz, q[k][0], q[k][1], largo * rng.uniform(0.8, 1.15), base + sd * 50, color, nervio=False)


def estrella(lz, x, y, r, color='#fff6dc', puntas=5, gouache=True, ang=None, semilla=None):
    """A small star. gouache=True: opaque light star (for dark grounds);
    False: a pigment star (for the bone paper)."""
    sem = lz._sem(semilla)
    rng = np.random.default_rng(sem)
    a0 = rng.uniform(0, 360) if ang is None else ang
    pts = []
    for k in range(puntas * 2):
        rr = r if k % 2 == 0 else r * 0.42
        a = math.radians(a0 + k * 180 / puntas)
        pts.append((x + math.cos(a) * rr, y + math.sin(a) * rr))
    f = Poligono(pts, suave=False)
    if gouache:
        lz.gouache(f, color, alfa=0.95, irreg=0.1)
    else:
        lz.aguada(f, color, dens=0.8, irreg=0.25, borde=0.8, gran=0.1)
        lz.contorno(f, _lapiz_de(color, 0.5), grosor=max(0.45, r * 0.06), presion=0.55, cortes=0.15,
                    desfase=r * 0.04)


def pececillo(lz, x, y, s, ang=0, color='#9fd0e0', gouache=True):
    """A tiny fish (5-12 units). Light gouache on dark grounds, pigment on paper."""
    a = math.radians(ang)
    R = lambda px, py: (x + (px * math.cos(a) - py * math.sin(a)) * s, y + (px * math.sin(a) + py * math.cos(a)) * s)
    cuerpo = Poligono([R(-1, 0), R(-0.3, -0.42), R(0.5, -0.3), R(1.0, 0), R(0.5, 0.3), R(-0.3, 0.42)])
    cola = Poligono([R(-0.95, 0), R(-1.5, -0.45), R(-1.38, 0), R(-1.5, 0.45)], suave=False)
    if gouache:
        lz.gouache(cuerpo | cola, color, alfa=0.85, irreg=0.2)
    else:
        lz.aguada(cuerpo | cola, color, dens=0.8, irreg=0.25, borde=0.6)
        lz.contorno(cuerpo | cola, _lapiz_de(color, 0.45), grosor=0.5, presion=0.45, cortes=0.1, desfase=0.2)


def motas(lz, forma, color='#fff6dc', n=40, tam=(0.6, 1.6), semilla=None, gouache=True, dens=0.9):
    """Scattered dots inside a shape (pollen, star dust, seeds)."""
    sem = lz._sem(semilla)
    rng = np.random.default_rng(sem)
    for (x, y) in puntos_dentro(forma, n, sem):
        r = rng.uniform(*tam)
        if gouache:
            lz.gouache(Elipse(x, y, r), color, alfa=0.9, irreg=0)
        else:
            lz.aguada(Elipse(x, y, r), color, dens=dens, irreg=0.2, borde=0.3, gran=0.05)


def libelula(lz, x, y, s=1.0, ang=-20, cuerpo='#c33c4e', alas='#9cc7d6'):
    """A dragonfly: four veined translucent wings and a slender body."""
    a = math.radians(ang)
    R = lambda px, py: (x + (px * math.cos(a) - py * math.sin(a)) * s, y + (px * math.sin(a) + py * math.cos(a)) * s)
    for sd in (-1, 1):
        for k, (L, off, sw) in enumerate(((40, -4, -12), (36, 5, 14))):
            # wing: from the thorax outward, swept forward (fore) or back (hind)
            wa = math.radians(ang + sd * 90 + sd * sw * -1)
            root = np.array(R(off, sd * 2))
            tip = root + np.array([math.cos(wa), math.sin(wa)]) * L * s
            c = (root + tip) / 2
            ala = Elipse(c[0], c[1], L * 0.5 * s, 5.5 * s, math.degrees(wa))
            lz.aguada(ala, alas, dens=0.4, irreg=0.3, borde=0.9, gran=0.1)
            lz.contorno(ala, '#5a7a90', grosor=0.5, presion=0.5, cortes=0.1, desfase=0.2)
            lz.lapiz([[root, tip]], '#5a7a90', grosor=0.4, presion=0.35, temblor=0.05)
    lz.aguada(Trazo([R(-10, 0), R(4, 0), R(44, 0)], (4 * s, 3.2 * s, 1.8 * s)), cuerpo, dens=0.85, irreg=0.2)
    lz.aguada(Elipse(*R(-12, 0), 3.4 * s, 3.2 * s), cuerpo, dens=0.9, irreg=0.2)
    lz.lapiz([[R(6 + 5 * k, -1.8), R(6 + 5 * k, 1.8)] for k in range(7)], _lapiz_de(cuerpo, 0.4), grosor=0.5,
             presion=0.5, temblor=0.02)


def hoja(lz, x, y, largo, ang, color='#5f8f63', ancho=0.32, venas=True, tapa=0.85, dens=0.8, toque=None):
    """A big pointed leaf (two arcs), midrib and side veins in pencil."""
    a = math.radians(ang)
    d = np.array([math.cos(a), math.sin(a)])
    n = np.array([-d[1], d[0]])
    p0 = np.array([x, y])
    t = np.linspace(0, 1, 14)[:, None]
    w = np.sin(np.pi * t) ** 0.8 * largo * ancho / 2
    izq = p0 + d * (t * largo) + n * w
    der = p0 + d * (t * largo) - n * w
    f = Poligono(np.vstack([izq, der[::-1]]), suave=False)
    tq = [(*(p0 + d * largo * 0.8), largo * 0.4, toque, 0.7)] if toque else None
    lz.aguada(f, color, dens=dens, irreg=0.35, borde=0.8, tapa=tapa, gran=0.3, toques=tq)
    lp = _lapiz_de(color, 0.4)
    if venas:
        tr = [[p0, p0 + d * largo * 0.96]]
        for k in np.linspace(0.2, 0.8, 4):
            b = p0 + d * largo * k
            for sd in (-1, 1):
                tr.append([b, b + d * largo * 0.12 + n * sd * largo * ancho * 0.36 * math.sin(math.pi * k)])
        lz.lapiz(tr, lp, grosor=0.5, presion=0.45, temblor=0.05)


def flor_grande(lz, x, y, r, color='#e8735e', centro='#f0c25e', petalos=7, semilla=None, oscuro=None):
    """A layered flower: two rings of petals, darker heart, pencil lines and
    gouache stamens."""
    sem = lz._sem(semilla)
    rng = np.random.default_rng(sem)
    a0 = rng.uniform(0, 360)
    osc = oscuro or mezcla(color, '#5a1a2a', 0.45)
    for ring, (rr, k0) in enumerate(((1.0, 0), (0.62, 0.5))):
        for k in range(petalos):
            a = math.radians(a0 + (k + k0) * 360 / petalos)
            cx, cy = x + math.cos(a) * r * 0.55 * rr, y + math.sin(a) * r * 0.55 * rr
            f = Elipse(cx, cy, r * 0.52 * rr, r * 0.3 * rr, math.degrees(a))
            lz.aguada(f, color if ring == 0 else mezcla(color, osc, 0.4), dens=0.75, irreg=0.35, borde=0.8,
                      tapa=0.7, gran=0.2, toques=[(x, y, r * 0.5, osc, 0.7)])
            if ring == 0:
                lz.lapiz([[(x + math.cos(a) * r * 0.3, y + math.sin(a) * r * 0.3),
                           (x + math.cos(a) * r * 0.85, y + math.sin(a) * r * 0.85)]], _lapiz_de(color, 0.4),
                         grosor=0.5, presion=0.35, temblor=0.1)
    lz.aguada(Elipse(x, y, r * 0.22), centro, dens=0.9, irreg=0.3, tapa=0.8)
    # stamens in pencil (dots and short strokes), not digital sparkles
    est = []
    for k in range(9):
        a = rng.uniform(0, 2 * np.pi)
        p0 = (x + math.cos(a) * r * 0.12, y + math.sin(a) * r * 0.12)
        p1 = (x + math.cos(a) * r * 0.34, y + math.sin(a) * r * 0.34)
        est.append([p0, p1])
        est.append(arco(*p1, max(0.4, r * 0.03), max(0.4, r * 0.03), 0, 360, 6))
    lz.lapiz(est, _lapiz_de(osc, 0.5), grosor=0.5, presion=0.6, temblor=0.05)


def mata(lz, x, y, r, color='#5f8f63', semilla=None):
    """A round bush / tree crown with pencil texture."""
    sem = lz._sem(semilla)
    rng = np.random.default_rng(sem)
    f = Circulos([(x + rng.normal(0, r * 0.25), y + rng.normal(0, r * 0.2), r * rng.uniform(0.5, 0.75))
                  for _ in range(5)])
    lz.aguada(f, color, dens=0.62, irreg=0.6, borde=0.8, tapa=0.85, gran=0.3,
              toques=[(x - r * 0.3, y - r * 0.3, r * 0.7, mezcla(color, '#f0e090', 0.6), 0.7)])
    lz.rayado(f, _lapiz_de(color, 0.45), angulo=rng.uniform(40, 70), sep=3.5, presion=0.35, largo=8)


def margarita(lz, x, y, r, color='#fbf4e8', centro='#f0b030', petalos=13, semilla=None):
    """A daisy: many thin petals, each touched with pencil; a dotted heart."""
    sem = lz._sem(semilla)
    rng = np.random.default_rng(sem)
    a0 = rng.uniform(0, 360)
    lp = _lapiz_de(color if color != '#fbf4e8' else '#c8a090', 0.5)
    for k in range(petalos):
        a = math.radians(a0 + k * 360 / petalos + rng.normal(0, 4))
        L = r * rng.uniform(0.85, 1.05)
        f = Elipse(x + math.cos(a) * L * 0.55, y + math.sin(a) * L * 0.55, L * 0.48, r * 0.13, math.degrees(a))
        lz.aguada(f, color, dens=0.7, irreg=0.25, borde=0.9, tapa=0.9, gran=0.1)
        lz.contorno(f, lp, grosor=0.45, presion=0.45, cortes=0.35, desfase=0.1)
    c = Elipse(x, y, r * 0.26)
    lz.aguada(c, centro, dens=0.95, irreg=0.3, tapa=1, toques=[(x + r * 0.08, y + r * 0.08, r * 0.15, '#b06a20', 0.7)])
    lz.lapiz([arco(x + rng.normal(0, r * 0.08), y + rng.normal(0, r * 0.08), r * 0.03, r * 0.03, 0, 360, 6)
              for _ in range(7)], '#7a4a20', grosor=0.5, presion=0.6)


def campanilla(lz, x, y, r, color='#8d73b0', ang=90, tallo='#4f6f45', semilla=None):
    """A bell flower hanging from a curved pencil stem. (x, y) = the bell;
    ang = direction the mouth opens (90 = down)."""
    a = math.radians(ang)
    d = np.array([math.cos(a), math.sin(a)])
    n = np.array([-d[1], d[0]])
    c = np.array([x, y], float)
    P = lambda u, v: c + d * u * r + n * v * r
    pts = [P(-0.7, 0), P(-0.55, -0.35), P(0.1, -0.5), P(0.55, -0.62), P(0.7, -0.4), P(0.62, -0.2), P(0.75, 0),
           P(0.62, 0.2), P(0.7, 0.4), P(0.55, 0.62), P(0.1, 0.5), P(-0.55, 0.35)]
    f = Poligono(pts)
    lz.aguada(f, color, dens=0.8, irreg=0.3, borde=0.9, tapa=0.9, toques=[(*P(-0.4, 0), r * 0.5, mezcla(color, '#2a1a3a', 0.4), 0.6)])
    lz.contorno(f, _lapiz_de(color, 0.45), grosor=0.55, presion=0.55, cortes=0.2)
    lz.lapiz([[P(-0.4, 0), P(0.6, 0)], [P(-0.4, -0.15), P(0.55, -0.4)], [P(-0.4, 0.15), P(0.55, 0.4)]],
             _lapiz_de(color, 0.45), grosor=0.4, presion=0.35)
    st = P(-0.7, 0)
    lz.lapiz([bezier(st, st - d * r * 0.8 + n * r * 0.5, st - d * r * 1.6 + n * r * 0.2)], tallo, grosor=0.8, presion=0.7)


def tulipan(lz, x, y, r, color='#e8506a', ang=-90, semilla=None):
    """A tulip cup of three petals on a stem with one long leaf."""
    a = math.radians(ang)
    d = np.array([math.cos(a), math.sin(a)])
    n = np.array([-d[1], d[0]])
    c = np.array([x, y], float)
    P = lambda u, v: tuple(c + d * u * r + n * v * r)
    lz.lapiz([[P(-0.4, 0), P(-2.2, 0.15)]], '#4f6f45', grosor=1.0, presion=0.75, temblor=0.3)
    hoja(lz, *P(-2.0, 0.1), r * 1.6, math.degrees(a) + 150, '#5f8f63', ancho=0.28)
    for v0, tint in ((-0.35, 0.0), (0.35, 0.0), (0.0, 0.35)):
        f = Poligono([P(-0.5, v0 * 0.6), P(0.1, v0 * 1.5), P(0.75, v0 * 0.9), P(0.6, v0 * 0.2), P(0.0, v0 * 0.1)])
        lz.aguada(f, mezcla(color, '#5a1a2a', tint), dens=0.8, irreg=0.3, borde=0.9, tapa=0.9,
                  toques=[(*P(-0.4, 0), r * 0.4, mezcla(color, '#5a1a2a', 0.4), 0.6)])
        lz.contorno(f, _lapiz_de(color, 0.45), grosor=0.5, presion=0.5, cortes=0.2)


def capullo(lz, x, y, r, color='#e8735e', ang=-90, semilla=None):
    """A closed bud with green sepals and a pencil stem."""
    a = math.radians(ang)
    d = np.array([math.cos(a), math.sin(a)])
    n = np.array([-d[1], d[0]])
    c = np.array([x, y], float)
    P = lambda u, v: tuple(c + d * u * r + n * v * r)
    lz.lapiz([[P(-0.3, 0), P(-1.8, 0.2)]], '#4f6f45', grosor=0.9, presion=0.7, temblor=0.3)
    f = Poligono([P(-0.4, 0), P(-0.1, -0.42), P(0.5, -0.3), P(0.9, 0), P(0.5, 0.3), P(-0.1, 0.42)])
    lz.aguada(f, color, dens=0.85, irreg=0.3, borde=0.9, tapa=0.9)
    lz.contorno(f, _lapiz_de(color, 0.45), grosor=0.5, presion=0.55, cortes=0.15)
    for sd in (-1, 1):
        s_ = Poligono([P(-0.45, 0), P(-0.1, sd * 0.45), P(0.3, sd * 0.32), P(-0.1, sd * 0.1)])
        lz.aguada(s_, '#5f8f63', dens=0.85, irreg=0.3, tapa=0.9)


def jardin(lz, forma, paleta=('#e8735e', '#f0c25e', '#c33c4e', '#ec9fa0', '#8d73b0'),
           verdes=('#5f8f63', '#86a86c', '#3f7a6a'), base=None, densidad=1.0, semilla=None, base_dens=0.6,
           tapa=1.0, escala=1.0, destellos=0.15, especies=None):
    """Turn a shape into a garden (a heart, a skirt, an arm...): a wet-in-wet
    multicolour base, then BIG layered leaves and flowers of several species
    (layered flowers, daisies, bells, tulips, buds) drawn over with pencil,
    and on top small sprigs and berries. escala scales the motif size
    (1.0 = big flowers of radius ~12-22 units). destellos (0..1): how many
    light gouache sparkles to scatter (Eugenio's evaluator found them
    digital: keep low). especies: tuple of names among 'grande', 'margarita',
    'campanilla', 'tulipan', 'capullo' to restrict the species."""
    sem = lz._sem(semilla)
    rng = np.random.default_rng(sem)
    bb = forma.bbox()
    area = (bb[2] - bb[0]) * (bb[3] - bb[1])
    pts = puntos_dentro(forma, 60, sem + 1)
    toq = [(x, y, rng.uniform(25, 60) * escala, paleta[i % len(paleta)] if i % 4 else verdes[i % len(verdes)], 0.75)
           for i, (x, y) in enumerate(pts[:16])]
    lz.aguada(forma, base or paleta[0], dens=base_dens, borde=0.6, flor=1, toques=toq, tapa=tapa, var=0.5)
    e = escala
    esp = especies or ('grande', 'grande', 'margarita', 'campanilla', 'tulipan', 'capullo')
    # big layer
    nb = int(area / (1500 * e * e) * densidad)
    for i, (x, y) in enumerate(puntos_dentro(forma, nb, sem + 2, margen=3)):
        k = rng.random()
        col = paleta[rng.integers(len(paleta))]
        if k < 0.4:
            hoja(lz, x, y, rng.uniform(22, 40) * e, rng.uniform(0, 360), verdes[rng.integers(len(verdes))],
                 toque=rng.choice([None, '#e0c060', '#2f5a4a']))
        elif k < 0.94:
            sp = esp[rng.integers(len(esp))]
            rr = rng.uniform(10, 20) * e
            if sp == 'grande':
                flor_grande(lz, x, y, rr, col, centro=rng.choice(['#f0c25e', '#5a1a2a', '#fff3cf']),
                            petalos=int(rng.choice([5, 6, 7, 9])))
            elif sp == 'margarita':
                margarita(lz, x, y, rr * 0.9, rng.choice(['#fbf4e8', '#f6d6e0', '#fde9b0']))
            elif sp == 'campanilla':
                campanilla(lz, x, y, rr * 0.7, rng.choice(['#8d73b0', '#5f86c0', '#c33c4e']), ang=rng.uniform(60, 120))
            elif sp == 'tulipan':
                tulipan(lz, x, y, rr * 0.75, col, ang=rng.uniform(-120, -60))
            else:
                capullo(lz, x, y, rr * 0.6, col, ang=rng.uniform(-130, -50))
        else:
            mata(lz, x, y, rng.uniform(10, 18) * e, verdes[rng.integers(len(verdes))])
    # small layer
    ns = int(area / (700 * e * e) * densidad)
    for i, (x, y) in enumerate(puntos_dentro(forma, ns, sem + 3, margen=2)):
        k = rng.random()
        if k < 0.35:
            ang = rng.uniform(0, 360)
            L = rng.uniform(16, 30) * e
            p0 = np.array([x, y])
            d = np.array([math.cos(math.radians(ang)), math.sin(math.radians(ang))])
            nrm = np.array([-d[1], d[0]])
            ramita(lz, [p0, p0 + d * L * 0.5 + nrm * L * 0.12, p0 + d * L], verdes[rng.integers(len(verdes))],
                   hojas=6, largo=6 * e)
        elif k < 0.62:
            flor_simple(lz, x, y, rng.uniform(4, 7) * e, paleta[rng.integers(len(paleta))],
                        centro=rng.choice(['#f0c25e', '#fff3cf', '#c33c4e']))
        elif k < 0.9:
            c = paleta[rng.integers(len(paleta))]
            for _ in range(3):
                bx, by = x + rng.normal(0, 4), y + rng.normal(0, 4)
                lz.aguada(Elipse(bx, by, rng.uniform(1.8, 3.2) * e), c, dens=0.9, irreg=0.3, borde=0.6, tapa=0.6)
                lz.lapiz([[(bx, by), (x, y + 6)]], '#4f6f45', grosor=0.5, presion=0.4)
        elif rng.random() < destellos:
            for _ in range(4):
                lz.gouache(Elipse(x + rng.normal(0, 6), y + rng.normal(0, 6), rng.uniform(0.6, 1.1)),
                           rng.choice(['#fff6dc', '#fde7e2', '#fff1b0']), alfa=0.85, irreg=0)


def cosmos(lz, forma, base='#262a5c', toques_col=('#4b3f8f', '#1f5f72', '#5a2e6e'), estrellas=1.0,
           peces=True, semilla=None, tapa=1.0, dens=1.25, desvanece=None):
    """Turn a shape into night sky and ocean at once: deep indigo with
    teal/violet blooms, star dust, little stars and a shoal of tiny fish."""
    sem = lz._sem(semilla)
    rng = np.random.default_rng(sem)
    bb = forma.bbox()
    area = (bb[2] - bb[0]) * (bb[3] - bb[1])
    pts = puntos_dentro(forma, 20, sem + 1)
    toq = [(x, y, rng.uniform(20, 45), toques_col[i % len(toques_col)], 0.7) for i, (x, y) in enumerate(pts[:8])]
    lz.aguada(forma, base, dens=dens, borde=0.5, flor=2, toques=toq, tapa=tapa, gran=0.5, var=0.4,
              desvanece=desvanece)
    motas(lz, forma, '#fff6dc', n=int(area / 400 * estrellas), tam=(0.4, 1.0), semilla=sem + 3)
    for (x, y) in puntos_dentro(forma, int(area / 5000 * estrellas) + 2, sem + 4, margen=3):
        estrella(lz, x, y, rng.uniform(3.5, 7.0), rng.choice(['#fff6dc', '#fff6dc', '#f6a5b5', '#a8e0e0']),
                 puntas=int(rng.choice([4, 5])))
    if peces:
        P = puntos_dentro(forma, 1, sem + 5, margen=8)
        if len(P):
            x, y = P[0]
            ang = rng.uniform(-30, 30)
            for k in range(7):
                pececillo(lz, x + k * 7 * math.cos(math.radians(ang)) + rng.normal(0, 2.5),
                          y + k * 7 * math.sin(math.radians(ang)) + rng.normal(0, 4), rng.uniform(2.4, 3.4),
                          ang + rng.normal(0, 10), '#9fd0e0')


def pajaro(lz, x, y, s, color='#4f9c9a', ang=0.0, alas='arriba', vientre='#f6e6c8', collage=False):
    """A small bird in flight, facing right (ang rotates it, degrees).
    s = body half-length in units (12-25). alas: 'arriba' | 'abajo' | 'plegada' (perched).
    collage=True paints it as a cut-paper piece with a tiny shadow."""
    a = math.radians(ang)
    R = lambda pts: [(x + (px * math.cos(a) - py * math.sin(a)) * s, y + (px * math.sin(a) + py * math.cos(a)) * s)
                     for px, py in pts]
    cuerpo = Poligono(R([(-1.05, 0.05), (-0.55, -0.3), (0.25, -0.36), (0.62, -0.42), (0.92, -0.3), (1.02, -0.08),
                         (0.86, 0.12), (0.45, 0.3), (-0.35, 0.3)]))
    cola = Poligono(R([(-0.85, -0.02), (-1.6, -0.42), (-1.45, 0.02), (-1.62, 0.36), (-0.85, 0.16)]), suave=False)
    if alas == 'plegada':      # perched: wing folded along the body, little legs
        ala = Poligono(R([(-0.7, -0.05), (-0.2, -0.3), (0.35, -0.22), (0.45, 0.02), (0.0, 0.18), (-0.6, 0.12)]))
        lz.lapiz([[R([(0.1, 0.28)])[0], R([(0.05, 0.62)])[0]], [R([(0.3, 0.26)])[0], R([(0.32, 0.62)])[0]],
                  [R([(-0.05, 0.62)])[0], R([(0.15, 0.62)])[0]], [R([(0.22, 0.62)])[0], R([(0.42, 0.62)])[0]]],
                 '#6a4a3a', grosor=max(0.5, s * 0.05), presion=0.8, temblor=0.05)
    elif alas == 'arriba':
        ala = Poligono(R([(-0.45, -0.2), (-0.35, -0.8), (-0.05, -1.35), (0.12, -1.12), (0.3, -1.2), (0.32, -0.85),
                          (0.45, -0.75), (0.38, -0.25)]))
    else:
        ala = Poligono(R([(-0.45, 0.0), (-0.3, 0.6), (-0.05, 1.15), (0.12, 0.95), (0.3, 1.0), (0.3, 0.6),
                          (0.42, 0.5), (0.38, 0.05)]))
    pico = Poligono(R([(0.98, -0.2), (1.32, -0.1), (0.98, 0.0)]), suave=False)
    lp = _lapiz_de(color, 0.45)
    pinta = (lambda f, c: lz.collage(f, c, sombra=1.0, dens=0.8)) if collage else \
        (lambda f, c: lz.aguada(f, c, dens=0.82, tapa=1, irreg=0.35, borde=0.7, gran=0.3))
    pinta(cola, mezcla(color, '#2a2a3a', 0.25))
    lz.aguada(cuerpo, color, dens=0.8, tapa=1, irreg=0.35, borde=0.7, gran=0.3,
              toques=[(*R([(0.2, 0.25)])[0], s * 0.45, vientre, 0.85)])
    pinta(ala, mezcla(color, '#2a2a3a', 0.15) if alas in ('arriba', 'plegada') else mezcla(color, '#ffffff', 0.25))
    lz.aguada(pico, '#e7a33e', dens=0.9, tapa=1, irreg=0.2)
    lz.contorno(cuerpo | cola, lp, grosor=0.7, presion=0.5, cortes=0.25, desfase=0.3)
    lz.contorno(ala, lp, grosor=0.6, presion=0.45, cortes=0.2, desfase=0.3)
    ex, ey = R([(0.68, -0.16)])[0]
    lz.aguada(Elipse(ex, ey, max(0.9, s * 0.07)), '#2a1a14', dens=1.2, irreg=0.1)
    lz.gouache(Elipse(ex + s * 0.02, ey - s * 0.02, max(0.35, s * 0.025)), '#fffdf6', alfa=0.9, irreg=0)


def sombra_bajo(lz, pts, anchos, color='#6a3a4a', dens=0.3, desplaza=(2.5, 5.0)):
    """Soft cast shadow of an arm/limb on the body under it (paint BEFORE the
    limb): a wet-edged glaze offset down-right from the limb's path."""
    q = [(p[0] + desplaza[0], p[1] + desplaza[1]) for p in pts]
    lz.aguada(Trazo(q, [a * 1.15 for a in anchos]), color, dens=dens, suave=2.5, gran=0.1)
