"""
figuras_real.py -- people painted as a realistic watercolour (design 6, 2026-11-16).

Eugenio: «cambia el estilo del dibujo… para que los personajes sean más realistas;
ahora parece mucho que lo ha pintado un niño, tiene que ser una acuarela realista;
mantén todos los elementos, pero cambia el estilo».

The poses stay exactly where they are: this module paints the SAME calls the figures
already make (cabeza / cabeza3, modelar, extremidad, torso, mano / mano2, cuello…), only
differently. `activar(luz, *modulos)` swaps them in for one run, so a design-6 script
reuses the design-5 composition untouched and designs 4 / 5 keep rendering as before.

What makes it read as realistic rather than a child's drawing:
  * proportions: a smaller head (adult ~0.86 of the old circle), the jaw narrowing to
    the chin, eyes at half height in adults and lower in children, features in their
    anatomical places and foreshortened by the turn of the head;
  * form from light: the head is an ellipsoid seen at a real 3/4 angle (deeper than it
    is wide, so in 3/4 the back of the skull shows and the ear sits well behind the
    face) with a relief on top -- brow, eye sockets, nose, cheekbones, lips, chin --
    lit from the scene's light and painted as GRADED watercolour glazes (wet-in-wet,
    no hard rings), reflected light lifted at the far edge, highlights lifted out;
  * small eyes with lids and a lashes line, the white left as lifted paper, irises with
    a catch-light; brows; lips with a darker upper and a fuller lower lip; real ears;
  * hair as a lit mass following the skull, with strands, never a helmet;
  * very little line: pencil only where a form turns away from the light.
"""
from __future__ import annotations

import math

import cv2
import numpy as np

import acuarela as A
from acuarela import (Elipse, Poligono, Trazo, Circulos, Mascara, bezier, arco, mezcla, rgb, _ss)

LUZ_DEF = (0.6, -0.8)


# ---------------------------------------------------------------- helpers

def _hex(c):
    v = np.clip(rgb(c), 0, 1)
    return '#%02x%02x%02x' % tuple(int(round(float(x) * 255)) for x in v)


def _osc(c, k=0.6, hacia='#4a2a3a', t=0.3):
    """A darker, slightly cooler version of a colour (its shadow)."""
    v = rgb(c) * k
    return _hex(v * (1 - t) + rgb(hacia) * t)


def _cla(c, t=0.5, hacia='#fff8ec'):
    return _hex(rgb(c) * (1 - t) + rgb(hacia) * t)


def _u(v):
    v = np.asarray(v, np.float64)
    n = np.linalg.norm(v)
    return v / n if n > 1e-9 else v


def _L3(luz):
    lx, ly = _u(luz if luz is not None else LUZ_DEF)
    v = np.array([lx * 0.75, ly * 0.75, 0.66])
    return v / np.linalg.norm(v)


def _masc(arr, x0, y0, s):
    """A raster mask (pixel crop at x0, y0) as a Forma the painting library understands."""
    arr = np.asarray(arr, np.float32)
    Hh, Ww = arr.shape

    def fn(lz, a0, b0, a1, b1):
        out = np.zeros((b1 - b0, a1 - a0), np.float32)
        ix0, iy0 = max(a0, x0), max(b0, y0)
        ix1, iy1 = min(a1, x0 + Ww), min(b1, y0 + Hh)
        if ix1 > ix0 and iy1 > iy0:
            out[iy0 - b0:iy1 - b0, ix0 - a0:ix1 - a0] = arr[iy0 - y0:iy1 - y0, ix0 - x0:ix1 - x0]
        return out
    return Mascara(fn, (x0 / s, y0 / s, (x0 + Ww) / s, (y0 + Hh) / s))


def _veladura(lz, A_, x0, y0, color, dens, gran=0.2, var=0.3, suave=0.3, semilla=None):
    """A graded glaze: the mask's values ARE the density (wet-in-wet, no dried rim)."""
    if A_ is None or float(np.max(A_)) < 0.02:
        return
    lz.aguada(_masc(A_, x0, y0, lz.s), color, dens=dens, suave=suave, gran=gran, var=var, borde=0, semilla=semilla)


def _escalones(lz, S, x0, y0, color, dens, niveles=(0.22, 0.5, 0.78), irreg=0.65, gran=0.3):
    """The same shadow as separate layers, each dried with its own irregular edge -- how a
    watercolourist actually builds a form, instead of an airbrushed gradient."""
    for t in niveles:
        m = (S > t).astype(np.float32)
        if m.sum() < 6:
            continue
        lz.aguada(_masc(m, x0, y0, lz.s), color, dens=dens / len(niveles), borde=0.4, irreg=irreg, gran=gran, var=0.45)


def _levanta(lz, A_, x0, y0, cantidad, suave=0.4):
    if A_ is None or float(np.max(A_)) < 0.02:
        return
    lz.levanta(_masc(A_, x0, y0, lz.s), cantidad=cantidad, suave=suave)


def _caja(lz, forma, pad=6):
    s = lz.s
    bx0, by0, bx1, by1 = forma.bbox()
    x0 = int(max(0, math.floor(bx0 * s) - pad))
    y0 = int(max(0, math.floor(by0 * s) - pad))
    x1 = int(min(lz.W, math.ceil(bx1 * s) + pad))
    y1 = int(min(lz.H, math.ceil(by1 * s) + pad))
    return x0, y0, x1, y1


def _cobertura(lz, x0, y0, x1, y1):
    """How much is already painted under a crop (a cast shadow falls only on something)."""
    t = 1 - lz.T[y0:y1, x0:x1].min(axis=2)
    c = np.clip(t * 4, 0, 1)
    if lz.TAPA is not None:
        c = np.maximum(c, lz.TAPA[y0:y1, x0:x1])
    return c


def _normales(h, s_px):
    hb = cv2.GaussianBlur(h, (0, 0), max(0.6, 0.6 * s_px))
    gy, gx = np.gradient(hb)
    n = np.sqrt(gx * gx + gy * gy + 1)
    return -gx / n, -gy / n, 1 / n


# ---------------------------------------------------------------- form from light

def volumen(lz, forma, color, luz=None, dens=0.62, prof=0.5, espesor=None, tapa=1, irreg=0.3, gran=0.3,
            toques=None, sombra=None, brillo=0.0, reflejo=0.08, linea=True, grosor=0.42, presion=0.32,
            proyecta=0.0, duro=0.6, semilla=None, var=0.35, rayar=False, ang_rayado=None):
    """Paint `forma` as a lit solid, the way a watercolourist models it: a first wash with its
    dried edge; the shadow as glazes -- a little of it graded (wet-in-wet) and most of it in
    two layers that dry with an irregular edge and granulate (duro = that share); the core
    where the form turns; coloured-pencil hatching that follows the form in the shadow
    (rayar); pencil on the outline only where it turns away from the light.
    No airbrushed highlight bands: brillo / reflejo stay small or off (a lifted highlight is
    what made the first realistic version read as plastic).
    proyecta > 0: first, the soft shadow the form throws on whatever is behind it."""
    s = lz.s
    L3 = _L3(luz)
    x0, y0, x1, y1 = _caja(lz, forma, pad=int(8 * s) + 4)
    if x1 <= x0 + 2 or y1 <= y0 + 2:
        return
    M = forma.mascara(lz, x0, y0, x1, y1)
    dentro = (M > 0.5).astype(np.uint8)
    if dentro.sum() < 6:
        lz.aguada(forma, color, dens=dens, tapa=tapa)
        return
    color = _hex(color)
    sc = _hex(sombra) if sombra is not None else _osc(color, 0.62)
    sc2 = _osc(sc, 0.75, '#3a2440', 0.25)
    if proyecta:
        lx, ly = _u(luz if luz is not None else LUZ_DEF)
        k = proyecta * s
        Mt = cv2.warpAffine(M, np.float32([[1, 0, -lx * k], [0, 1, -ly * k]]), (x1 - x0, y1 - y0))
        Mt = cv2.GaussianBlur(Mt, (0, 0), max(1.0, 0.6 * k))
        cub = _cobertura(lz, x0, y0, x1, y1)
        _veladura(lz, np.clip(Mt * cub * (1 - M), 0, 1), x0, y0, '#4a3a5a', 0.38)
    lz.aguada(forma, color, dens=dens, tapa=tapa, borde=0.35, irreg=irreg, gran=gran, toques=toques, semilla=semilla,
              var=var)
    D = cv2.distanceTransform(dentro, cv2.DIST_L2, 5).astype(np.float32)
    dmax = float(D.max())
    t = min(dmax, (espesor * s) if espesor else dmax)
    t = max(t, 1.0)
    Dc = np.minimum(D, t)
    h = np.sqrt(np.maximum(0, 2 * t * Dc - Dc * Dc))
    nx, ny, nz = _normales(h, s)
    lit = np.clip(nx * L3[0] + ny * L3[1] + nz * L3[2], -1, 1)
    S = M * _ss(lit, 0.92, 0.12)
    core = M * np.exp(-((lit - 0.08) / 0.22) ** 2) * (lit < 0.45)
    _veladura(lz, S, x0, y0, sc, prof * (1 - duro), var=0.45, gran=0.35)
    if duro:
        _escalones(lz, S, x0, y0, sc, prof * duro, niveles=(0.3, 0.66), gran=0.4)
    _veladura(lz, core, x0, y0, sc2, prof * 0.35, var=0.45, gran=0.35)
    if reflejo:
        orilla = np.clip(1 - D / max(2.0, 0.3 * t + 1.5), 0, 1)
        _levanta(lz, M * orilla * _ss(lit, 0.0, -0.4), x0, y0, reflejo, suave=0.6)
    if brillo:
        _levanta(lz, M * _ss(lit, 0.85, 0.98) * np.clip(D / (2.5 * s), 0, 1), x0, y0, brillo, suave=0.8)
    if rayar:
        if ang_rayado is None:
            mo = cv2.moments(dentro, binaryImage=True)
            th = 0.5 * math.degrees(math.atan2(2 * mo['mu11'], mo['mu20'] - mo['mu02'] + 1e-9))
            ang_rayado = th + 40
        _rayas(lz, (S > 0.4) * M, x0, y0, _osc(color, 0.66, '#3a2a3a', 0.18), ang_rayado, semilla, t / s)
    if linea:
        _borde_sombra(lz, dentro, lit, x0, y0, _osc(color, 0.45, '#2a1a1a', 0.4), grosor, presion)


def _rayas(lz, zona, x0, y0, color, ang, semilla, alcance):
    """Coloured-pencil hatching as a hand does it: short strokes in the shadow only, about
    half as many as a regular screen, each at the form's angle give or take 20 degrees,
    with gaps, in the cloth's own colour two tones darker -- never a mechanical grid."""
    s = lz.s
    h, w = zona.shape
    if zona.sum() < 30:
        return
    rng = np.random.default_rng(semilla if semilla is not None else int(x0 * 3 + y0 * 7) % 100000)
    paso = 3.0 * s
    ys = np.arange(paso / 2, h, paso)
    xs = np.arange(paso / 2, w, paso)
    trazos = []
    for yy in ys:
        for xx in xs:
            if rng.uniform() < 0.5:
                continue
            px = xx + rng.uniform(-paso / 2, paso / 2)
            py = yy + rng.uniform(-paso / 2, paso / 2)
            iy, ix = int(py), int(px)
            if not (0 <= iy < h and 0 <= ix < w) or zona[iy, ix] < 0.5:
                continue
            a = math.radians(ang + rng.normal(0, 11))
            L = s * min(alcance * 0.8, rng.uniform(2.5, 5.5))
            dx, dy = math.cos(a) * L / 2, math.sin(a) * L / 2
            ex, ey = int(px + dx), int(py + dy)
            bx_, by_ = int(px - dx), int(py - dy)
            if not (0 <= ey < h and 0 <= ex < w and 0 <= by_ < h and 0 <= bx_ < w):
                continue
            if zona[ey, ex] < 0.5 or zona[by_, bx_] < 0.5:
                continue
            trazos.append([((px - dx + x0) / s, (py - dy + y0) / s), ((px + dx + x0) / s, (py + dy + y0) / s)])
    if trazos:
        lz.lapiz(trazos, color, grosor=0.3, presion=0.26, temblor=0.12, puntas=0.4)


def _borde_sombra(lz, dentro, lit, x0, y0, color, grosor, presion, umbral=0.35):
    """Pencil on the side of an outline turned away from the light; lost on the lit side."""
    s = lz.s
    cs, _ = cv2.findContours(dentro, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    er = cv2.erode(dentro, np.ones((3, 3), np.uint8), iterations=max(1, int(s * 1.5)))
    litc = np.where(er > 0, lit, 2.0).astype(np.float32)
    litc = -cv2.dilate(-litc, np.ones((5, 5), np.uint8), iterations=max(1, int(s * 1.2)))   # nearest inner value
    trozos = []
    for c in cs:
        if len(c) < 10:
            continue
        p = c[:, 0, :][::max(1, int(s))]
        actual = []
        for (px, py) in p:
            v = litc[min(litc.shape[0] - 1, py), min(litc.shape[1] - 1, px)]
            if v < umbral:
                actual.append(((px + x0 + 0.5) / s, (py + y0 + 0.5) / s))
            else:
                if len(actual) > 3:
                    trozos.append(actual)
                actual = []
        if len(actual) > 3:
            trozos.append(actual)
    if trozos:
        lz.lapiz(trozos, color, grosor=grosor, presion=presion, temblor=0.12, cortes=0.3, puntas=0.35)


# ---------------------------------------------------------------- the head: geometry

EDADES = {
    #        half height / old r, width / height, eyes, brow, hairline, nose base, mouth, eye width, nose depth
    'nino': dict(alto=0.9, ancho=0.84, ve=0.12, vb=-0.01, vh=-0.5, vn=0.43, vm=0.64, ojo=0.24, nariz=0.12,
                 perfil=[1.0, 0.99, 0.97, 0.91, 0.78, 0.58, 0.38, 0.0]),
    'adulto': dict(alto=0.86, ancho=0.74, ve=0.0, vb=-0.14, vh=-0.6, vn=0.38, vm=0.58, ojo=0.2, nariz=0.28,
                   perfil=[1.0, 0.97, 0.91, 0.8, 0.63, 0.43, 0.27, 0.0]),
    'mayor': dict(alto=0.86, ancho=0.74, ve=0.0, vb=-0.13, vh=-0.58, vn=0.4, vm=0.6, ojo=0.19, nariz=0.3,
                  perfil=[1.0, 0.96, 0.9, 0.8, 0.64, 0.44, 0.28, 0.0]),
}
_PERFIL_V = [-0.25, 0.1, 0.35, 0.55, 0.75, 0.9, 0.97, 1.0]


class _Cabeza:
    """A head as an ellipsoid (depth Dp in front of the ears, Db behind) turned `tg` radians
    about the vertical and tilted `inclina` degrees in the picture plane. Local coords:
    u across (units of a2, the half width), v down (units of b2, -1 crown .. +1 chin).
    xn = -1..1 is a point's position across the face seen from the front. Everything is
    computed for a turn to the viewer's right and mirrored (sg) for the other side, so
    xn < 0 is always the NEAR side (the one we see broadly)."""

    def __init__(self, x, y, r, giro, inclina, edad):
        E = EDADES.get(edad, EDADES['adulto'])
        self.E = E
        self.sg = 1.0 if giro >= 0 else -1.0
        self.tg = min(1.0, abs(giro) * 0.62)
        self.ct, self.st = math.cos(self.tg), math.sin(self.tg)
        self.Dp, self.Db = 1.12, 1.25
        self.b2 = r * E['alto']
        self.a2 = self.b2 * E['ancho']
        th = math.radians(inclina)
        self.th = th
        self.ca, self.sa = math.cos(th), math.sin(th)
        kc = 1.08 if edad == 'nino' else 1.0           # the chin a little lower: a neck of real length shows
        chin = np.array([x - math.sin(th) * kc * r, y + math.cos(th) * kc * r])
        self.O = chin - np.array([-self.sa * self.b2, self.ca * self.b2])
        self.pv = np.array(_PERFIL_V)
        self.pw = np.array(E['perfil'])
        # a smooth profile table: a piecewise-linear profile bands the light at every kink
        vt = np.linspace(-1.0, 1.0, 801)
        top = np.sqrt(np.clip(1 - ((vt + 0.25) / 0.75) ** 2, 0, 1))
        wt = np.where(vt < -0.25, top, np.interp(vt, self.pv, self.pw))
        k = np.exp(-0.5 * (np.arange(-60, 61) / 18.0) ** 2)
        k /= k.sum()
        ws = np.convolve(np.pad(wt, 60, mode='edge'), k, mode='same')[60:-60]
        ws = np.where(vt < -0.85, wt, ws)            # keep the crown round
        self._vt, self._wt = vt, ws
        self._dwt = np.gradient(ws, vt)
        self.Rf = math.sqrt(self.ct ** 2 + (self.Dp * self.st) ** 2)
        self.Rb = math.sqrt(self.ct ** 2 + (self.Db * self.st) ** 2)
        self.psi_f = math.atan2(self.Dp * self.st, self.ct)
        self.psi_b = math.atan2(self.Db * self.st, self.ct)

    # half width of the head at height v
    def w(self, v):
        return np.interp(np.asarray(v, np.float64), self._vt, self._wt)

    def dw(self, v):
        return np.interp(np.asarray(v, np.float64), self._vt, self._dwt)

    def u_front(self, xn, v, dz=0.0):
        w = self.w(v)
        xn = np.clip(xn, -1, 1)
        return w * (xn * self.ct + (self.Dp * np.sqrt(np.maximum(0, 1 - xn * xn)) + dz) * self.st)

    def fore(self, xn, v):
        """How much a small width at xn is shortened by the turn (1 = seen square on)."""
        e = 0.02
        w = max(float(self.w(v)), 0.05)
        d = (self.u_front(xn + e, v) - self.u_front(xn - e, v)) / (2 * e * w)
        return float(np.clip(d, 0.0, 1.2))

    def visible(self, xn=None):
        """xn beyond this is hidden behind the far cheek."""
        if self.st < 1e-6:
            return 1.0
        k = self.ct / (self.Dp * self.st)
        return k / math.sqrt(1 + k * k)

    def lo(self, v):
        w = self.w(v)
        t = _ss(np.asarray(v, np.float64), 0.12, 0.45)
        return (1 - t) * (-w * self.Rb) + t * (-w * self.ct)

    def hi(self, v):
        return self.w(v) * self.Rf

    def Q(self, u, v):
        """Local (u, v) -> sheet."""
        X = self.sg * u * self.a2
        Y = v * self.b2
        return (float(self.O[0] + self.ca * X - self.sa * Y), float(self.O[1] + self.sa * X + self.ca * Y))

    def P(self, xn, v, dz=0.0):
        return self.Q(float(self.u_front(xn, v, dz)), v)

    def off(self, p, dx, dy):
        """A point offset (dx across in the head's mirrored frame, dy down) in sheet units."""
        X = self.sg * dx
        return (p[0] + self.ca * X - self.sa * dy, p[1] + self.sa * X + self.ca * dy)

    def ang(self, a):
        """An angle drawn in the head's frame -> sheet degrees."""
        return math.degrees(self.th) + (a if self.sg > 0 else 180 - a)

    def local(self, X, Y):
        dx, dy = X - self.O[0], Y - self.O[1]
        px = self.ca * dx + self.sa * dy
        py = -self.sa * dx + self.ca * dy
        return self.sg * px / self.a2, py / self.b2

    def silueta(self, n=56):
        vs = np.linspace(-1, 1, n)
        izq = [self.Q(float(self.lo(v)), v) for v in vs]
        der = [self.Q(float(self.hi(v)), v) for v in vs[::-1]]
        return Poligono(izq + der)

    def contorno_escalado(self, k, v0, v1, n=30):
        """The outline above the face, k times larger, from the back at v0 over the crown
        to the front at v1 (for hair that stands off the skull)."""
        vs_b = np.linspace(v0, -1, n)
        vs_f = np.linspace(-1, v1, n)
        cy = -0.25
        pts = [self.Q(float(self.lo(v)) * k, cy + (v - cy) * k) for v in vs_b]
        pts += [self.Q(float(self.hi(v)) * k, cy + (v - cy) * k) for v in vs_f[1:]]
        return pts

    def normales(self, U, V, escala=1.0):
        """Unit normals (sheet x, y down, z to the viewer) of the ellipsoid at local (U, V)."""
        w = np.maximum(self.w(np.clip(V, -0.999, 0.999)) * escala, 0.04)
        wy = self.dw(np.clip(V, -0.99, 0.99)) * escala * (self.a2 / self.b2)
        a = U / w
        front = a >= -self.ct
        phf = np.arcsin(np.clip(a / self.Rf, -1, 1)) - self.psi_f
        phb = np.arcsin(np.clip(a / self.Rb, -1, 1)) + self.psi_b
        ph = np.where(front, phf, phb)
        sx, cx_ = np.sin(ph), np.cos(ph)
        nzo = np.where(front, cx_ / self.Dp, -cx_ / self.Db)
        nxo = sx
        nyo = -wy
        nu = nxo * self.ct + nzo * self.st
        nzv = -nxo * self.st + nzo * self.ct
        nu = nu * self.sg
        nX = self.ca * nu - self.sa * nyo
        nY = self.sa * nu + self.ca * nyo
        n = np.sqrt(nX * nX + nY * nY + nzv * nzv) + 1e-9
        return nX / n, nY / n, np.maximum(nzv, 0) / n


# ---------------------------------------------------------------- the head: painting

def cabeza_real(lz, x, y, r, piel='piel2', pelo='#3a2a20', peinado='corto', luz=None, giro=0.0, inclina=0.0,
                edad='adulto', ojos='abiertos', boca='suave', mira=(0, 0), gafas=False, canas=False, pendiente=None,
                iris='#5a3a24', barba=None, adorno=None, semilla=None):
    """A realistic head whose chin sits where the old head of radius r centred at (x, y)
    had it. giro -1..1 turns the face to the viewer's right (+) or left (-); inclina tilts it
    (degrees). ojos: 'abiertos' | 'abajo' | 'cerrados'. boca: 'suave' | 'sonrisa' | 'risa' |
    'abierta' | 'canta'. peinado: 'corto' | 'calvo' | 'afro' | 'mono' | 'rizado'."""
    s = lz.s
    G = _Cabeza(x, y, r, giro, inclina, edad)
    E = G.E
    rng = np.random.default_rng(semilla if semilla is not None else int(x * 7 + y * 13) % 100000)
    skin = _hex(piel)
    L3 = _L3(luz)
    lx, ly = _u(luz if luz is not None else LUZ_DEF)
    a2, b2 = G.a2, G.b2
    ve, vb, vn, vm = E['ve'], E['vb'], E['vn'], E['vm']
    pelo_c = '#cfc8c0' if canas else _hex(pelo)

    # ---- the pixel grid round the head
    sil = G.silueta()
    pad = int(r * 0.4 * s) + 6
    bx0, by0, bx1, by1 = sil.bbox()
    x0 = int(max(0, bx0 * s - pad)); x1 = int(min(lz.W, bx1 * s + pad))
    y0 = int(max(0, by0 * s - pad)); y1 = int(min(lz.H, by1 * s + pad))
    if x1 <= x0 + 4 or y1 <= y0 + 4:
        return dict(centro=(x, y))
    X = (np.arange(x0, x1, dtype=np.float32) + 0.5)[None, :] / s
    Y = (np.arange(y0, y1, dtype=np.float32) + 0.5)[:, None] / s
    X, Y = np.broadcast_arrays(X, Y)
    U, V = G.local(X, Y)
    Msil = sil.mascara(lz, x0, y0, x1, y1)

    # ---- the hair behind the head goes first, so the face covers it
    _pelo_detras(lz, G, peinado, pelo_c, luz, rng, adorno)

    # ---- relief on the ellipsoid: brow, sockets, nose, cheekbones, lips, chin
    rel = np.zeros_like(U)

    def bulto(xn, v, su, sv, amp, dz=0.0):
        u0 = float(G.u_front(xn, v, dz))
        f = max(0.2, G.fore(xn, v))
        rel[...] += amp * np.exp(-((U - u0) / (su * f)) ** 2 - ((V - v) / sv) ** 2)

    nino = edad == 'nino'
    for sd in (-1, 1):
        if nino:
            bulto(sd * 0.48, vm - 0.06, 0.26, 0.16, 0.07)           # a child's full, low cheek
        bulto(sd * 0.36, vb + 0.02, 0.3, 0.055, 0.02 if nino else 0.05)   # brow ridge
        bulto(sd * 0.4, ve + 0.01, 0.2, 0.09, -0.08)               # eye socket
        bulto(sd * 0.4, ve + 0.01, 0.13, 0.055, 0.04)              # the eyeball under the lids
        bulto(sd * 0.6, ve + 0.19, 0.2, 0.12, 0.015 if nino else 0.055)  # cheekbone
        bulto(sd * 0.84, vb - 0.03, 0.13, 0.12, -0.04)             # temple
        bulto(sd * 0.15, vn - 0.02, 0.07, 0.05, 0.05, 0.1)         # wing of the nose
        bulto(sd * 0.34, vm + 0.0, 0.07, 0.06, -0.02)              # corner of the mouth
    nz_ = E['nariz']
    for k, t in enumerate(np.linspace(0, 1, 6)):
        v = vb + 0.05 + (vn - 0.05 - vb - 0.05) * t
        if nino and t < 0.6:
            continue                                                # a child's nose has almost no bridge
        bulto(0.0, v, 0.08 if nino else 0.075, 0.06, (0.02 + 0.07 * t * t) if nino else (0.03 + 0.1 * t * t),
              dz=nz_ * t)                                           # bridge to tip of the nose
    bulto(0.0, vn + 0.05, 0.12, 0.03, -0.035)                       # under the nose
    bulto(0.0, vm - 0.045, 0.24, 0.035, 0.035, 0.08)               # upper lip
    bulto(0.0, vm + 0.045, 0.19, 0.04, 0.05, 0.08)                 # lower lip
    bulto(0.0, vm + 0.12, 0.17, 0.03, -0.03)                       # below the lower lip
    bulto(0.0, 0.88, 0.2, 0.08, 0.05, 0.05)                        # chin
    if edad == 'mayor':
        for sd in (-1, 1):
            bulto(sd * 0.3, (vn + vm) / 2, 0.035, 0.12, -0.035)     # the folds from nose to mouth
            bulto(sd * 0.4, ve + 0.09, 0.14, 0.03, -0.025)          # under the eyes
    nX, nY, nZ = G.normales(U, V)
    nX, nY = nX * 0.6, nY * 0.6                  # a face turns gently; the planes do the modelling
    Rpx = a2 * s
    gy, gx = np.gradient(cv2.GaussianBlur(rel.astype(np.float32), (0, 0), max(0.7, 0.5 * s)) * Rpx)
    nX, nY = nX - gx * 1.1, nY - gy * 1.1
    nn = np.sqrt(nX * nX + nY * nY + nZ * nZ) + 1e-9
    Lf = np.array([lx * 0.55, ly * 0.55, 0.82])
    Lf = Lf / np.linalg.norm(Lf)
    lit = np.clip((nX * Lf[0] + nY * Lf[1] + nZ * Lf[2]) / nn, -1, 1)

    # ---- skin: one wash, wet-in-wet warmth (cheeks, nose) and a cooler jaw
    cara = lambda xn, v: G.P(xn, v)
    toques = []
    for sd in (-1, 1):
        if G.fore(sd * 0.55, ve + 0.25) > 0.15:
            toques.append((*cara(sd * 0.52, ve + 0.3), a2 * 0.3, mezcla(skin, '#d8705e', 0.4), 0.32))
    toques.append((*cara(0, vn - 0.04), a2 * 0.15, mezcla(skin, '#d0685e', 0.3), 0.28))
    toques.append((*cara(0, 0.86), a2 * 0.36, mezcla(skin, '#9090a8', 0.14), 0.3))
    toques.append((*cara(0, vb - 0.25), a2 * 0.5, mezcla(skin, '#e8c070', 0.14), 0.3))
    oscuridad = 1 - float(np.dot(rgb(skin), [0.3, 0.59, 0.11]))      # darker skins keep their depth of colour
    lz.aguada(sil, skin, dens=0.46 + 0.22 * oscuridad, tapa=1, borde=0.22, irreg=0.12, gran=0.15, var=0.22, toques=toques)
    sc = _osc(skin, 0.74, '#7a3a5a', 0.26)
    S = Msil * _ss(lit, 0.97, 0.45)
    _veladura(lz, S, x0, y0, sc, 0.34, gran=0.45, var=0.5)          # about one and a half values, lost edges
    _veladura(lz, Msil * _ss(lit, 0.6, 0.15), x0, y0, _osc(sc, 0.85), 0.12, gran=0.4, var=0.5)
    _escalones(lz, S * Msil, x0, y0, sc, 0.16, niveles=(0.5, 0.78), irreg=0.85, gran=0.45)
    Dsil = cv2.distanceTransform((Msil > 0.5).astype(np.uint8), cv2.DIST_L2, 5)
    _levanta(lz, Msil * _ss(lit, 0.9, 0.99) * np.clip(Dsil / (0.12 * Rpx + 1), 0, 1), x0, y0, 0.16, suave=0.8)
    # a second wash, broken and granulating, dried with its own edge: skin is never one smooth tone
    lz.aguada(sil, _osc(skin, 0.9, '#a05a50', 0.2), dens=0.12, borde=0.5, irreg=1.0, gran=0.6, var=0.6, flor=1)
    # eye sockets in sepia, the hollow under the cheekbone on the shadow side (not in children)
    for sd in (-1, 1):
        if sd * 0.4 < G.visible() - 0.12:
            lz.aguada(Elipse(*G.P(sd * 0.4, ve - 0.04), a2 * 0.24, b2 * 0.1, G.ang(0)), '#8a5a48', dens=0.16,
                      suave=a2 * 0.06, gran=0.3)
    lado_s = -1 if lx * G.sg > 0 else 1
    if edad != 'nino' and lado_s * 0.55 < G.visible() - 0.1:
        lz.aguada(Elipse(*G.P(lado_s * 0.55, ve + 0.36), a2 * 0.16, b2 * 0.09, G.ang(-25 * lado_s)), sc, dens=0.14,
                  suave=a2 * 0.05, gran=0.3)
    # the hard accent of the jaw on the side away from the light
    lado = -1 if lx * G.sg > 0 else 1                        # the shadow side, in the mirrored frame
    xs_j = [x for x in np.linspace(lado * 0.95, lado * 0.25, 9) if x < G.visible() - 0.05]
    if len(xs_j) > 3:
        mand = [G.P(x, 0.55 + 0.42 * (1 - abs(x)) ** 0.9) for x in xs_j]
        lz.aguada(Trazo(mand, [a2 * 0.03] + [a2 * 0.07] * (len(mand) - 2) + [a2 * 0.02]), sc, dens=0.22, borde=0.5,
                  irreg=0.3, gran=0.3)

    # ---- the shadow the head throws on the neck below
    cub = _cobertura(lz, x0, y0, x1, y1)
    k = b2 * 0.14 * s
    Mt = cv2.warpAffine(Msil, np.float32([[1, 0, -lx * k * 0.8], [0, 1, k]]), (x1 - x0, y1 - y0))
    Mt = cv2.GaussianBlur(Mt, (0, 0), max(1.0, k * 0.35))
    _veladura(lz, np.clip(Mt * cub * (1 - Msil), 0, 1), x0, y0, _osc(skin, 0.5, '#4a2a4a', 0.4), 0.5)

    _ojos(lz, G, skin, ojos, mira, iris, edad, luz, pelo_c, canas)
    _nariz(lz, G, skin, luz, edad)
    if barba:
        _barba(lz, G, _hex(barba), luz, rng)
    _boca(lz, G, skin, boca, edad, luz)
    if edad == 'mayor':
        _arrugas(lz, G, skin, ojos)
    _pelo_delante(lz, G, peinado, pelo_c, luz, rng, adorno, canas)
    _orejas(lz, G, skin, luz, pendiente, peinado)
    if gafas:
        _gafas(lz, G, luz)
    # a lost-and-found pencil edge only where the head turns from the light
    _borde_sombra(lz, (Msil > 0.5).astype(np.uint8), lit, x0, y0, _osc(skin, 0.45, '#3a1a1a', 0.45), 0.34, 0.26,
                  umbral=0.55)
    return dict(centro=G.Q(0, 0), alto=2 * b2, ancho=2 * a2)


# ---- eyes and brows

def _ojos(lz, G, skin, ojos, mira, iris, edad, luz, pelo_c, canas):
    E = G.E
    a2, b2 = G.a2, G.b2
    ve, vb = E['ve'], E['vb']
    lx, ly = _u(luz if luz is not None else LUZ_DEF)
    lid = '#2a1a1a'
    piel_l = _osc(skin, 0.55, '#4a2a3a', 0.45)
    for sd in (-1, 1):                        # -1 near eye, +1 far eye (mirrored frame)
        xn = sd * 0.4
        if xn > G.visible() - 0.12:
            continue
        f = G.fore(xn, ve)
        if f < 0.18:
            continue
        c = G.P(xn, ve)
        ew = a2 * E['ojo'] * (0.25 + 0.75 * f)               # half width, foreshortened
        eh = a2 * E['ojo'] * (0.46 if edad == 'nino' else 0.4)
        sin_ = -sd                                            # +1: the inner corner is at +x
        R2 = (lambda c_: (lambda u, v: G.off(c_, u, v)))(c)
        ts = np.linspace(-1, 1, 15)
        up = [R2(ew * t, -eh * (1 - t * t) ** 0.85 + 0.18 * eh * (-sin_) * t - 0.06 * eh) for t in ts]
        dn = [R2(ew * t, eh * 0.62 * (1 - t * t) ** 1.0 + 0.05 * eh) for t in ts[::-1]]
        # the socket under the brow
        lz.aguada(Elipse(*R2(0.1 * ew * sin_, -eh * 1.0), ew * 1.25, eh * 1.25, G.ang(0)),
                  _osc(skin, 0.72, '#6a3a5a', 0.3), dens=0.22, suave=eh * 0.6, gran=0.1)
        if ojos == 'abiertos':
            alm = Poligono(up + dn, suave=False)
            lz.levanta(alm, cantidad=0.45, suave=0.25)
            lz.aguada(alm, '#dccfb8', dens=0.3, suave=0.3)
            lz.aguada(alm & Poligono([R2(-ew * 1.3, -eh * 1.6), R2(ew * 1.3, -eh * 1.6), R2(ew * 1.3, -eh * 0.15),
                                      R2(-ew * 1.3, -eh * 0.15)], suave=False), '#8a6a58', dens=0.26, suave=0.35)
            mx, my = mira
            ri = eh * (1.08 if edad == 'nino' else 1.0)
            ic = R2(mx * G.sg * ew * 0.42 + sin_ * ew * 0.04, my * eh * 0.42 + eh * 0.04)
            iris_f = Elipse(ic[0], ic[1], ri * (0.45 + 0.55 * f), ri, G.ang(0)) & alm
            lz.aguada(iris_f, _osc(iris, 0.85, '#2a1a10', 0.2), dens=0.9, tapa=1, borde=0.5, irreg=0.05, gran=0.1)
            lz.aguada(Elipse(ic[0], ic[1], ri * 0.46 * (0.45 + 0.55 * f), ri * 0.48) & alm, '#0c0605', dens=0.95,
                      tapa=0.8, irreg=0.05)
            lz.aguada(iris_f & Poligono([R2(-ew, -eh * 2), R2(ew, -eh * 2), R2(ew, -eh * 0.15), R2(-ew, -eh * 0.15)],
                                        suave=False), '#1a0a06', dens=0.3, suave=0.25)
            lz.gouache(Elipse(ic[0] + lx * ri * 0.3, ic[1] - ri * 0.25, max(0.32, ri * 0.2)), '#fffaf0', alfa=0.9,
                       irreg=0)
            # lashes line: darker and thicker toward the outer corner
            lz.lapiz([up], lid, grosor=max(0.38, eh * 0.32), presion=0.72, temblor=0.03, puntas=0.25)
            outer = [p for p, t in zip(up, ts) if t * sin_ < -0.1]
            if len(outer) > 2:
                lz.lapiz([outer], lid, grosor=max(0.45, eh * 0.42), presion=0.6, temblor=0.03, puntas=0.4)
            lz.lapiz([dn[3:-3]], piel_l, grosor=0.3, presion=0.22, temblor=0.03)
            crease = [R2(ew * t * 0.95, -eh * 1.05 * (1 - t * t) ** 0.7 - eh * 0.45) for t in np.linspace(-0.8, 0.95, 12)]
            lz.lapiz([crease], piel_l, grosor=0.32, presion=0.28, temblor=0.03, puntas=0.4)
        else:
            # lids lowered (looking down) or closed (laughing)
            if ojos == 'abajo':
                ln = [R2(ew * t, eh * 0.1 * (1 - t * t) ** 0.9 - 0.2 * eh) for t in ts]
                vis = Poligono(ln + dn, suave=False)
                lz.levanta(vis, cantidad=0.35, suave=0.2)
                lz.aguada(vis, '#dccfb8', dens=0.25, suave=0.2)
                ic = R2(mira[0] * G.sg * ew * 0.3, eh * 0.25)
                lz.aguada(Elipse(ic[0], ic[1], eh * 0.9, eh * 0.75) & vis, _osc(iris, 0.8, '#2a1a10', 0.2), dens=0.9,
                          tapa=1, irreg=0.05)
            else:
                ln = [R2(ew * t, eh * 0.28 * (1 - t * t) + 0.05 * eh - 0.12 * eh * (-sin_) * t) for t in ts]
            lz.aguada(Poligono([R2(ew * t, -eh * 1.15 * (1 - t * t) ** 0.8) for t in ts] + ln[::-1], suave=True),
                      _cla(skin, 0.12), dens=0.2, suave=0.3)
            lz.lapiz([ln], lid, grosor=max(0.4, eh * 0.34), presion=0.68, temblor=0.03, puntas=0.3)
            outer = [p for p, t in zip(ln, ts) if t * sin_ < -0.2]
            if len(outer) > 2:
                lz.lapiz([outer], lid, grosor=max(0.45, eh * 0.4), presion=0.5, temblor=0.03, puntas=0.4)
            crease = [R2(ew * t * 0.95, -eh * 0.95 * (1 - t * t) ** 0.7 - eh * 0.3) for t in np.linspace(-0.8, 0.95, 12)]
            lz.lapiz([crease], piel_l, grosor=0.3, presion=0.24, temblor=0.03, puntas=0.4)
            if ojos == 'cerrados':                   # laughing: the cheek pushes up, crow's feet
                for k in range(2):
                    p = R2(-sin_ * ew * 1.15, eh * (0.1 + 0.35 * k))
                    lz.lapiz([[p, G.off(p, -sin_ * ew * 0.35, eh * (0.15 * k - 0.1))]], piel_l, grosor=0.28,
                             presion=0.25)
        # the eyebrow: a soft wash and a few hairs, arched toward the outer end
        bc = '#bfb8b0' if canas else (_hex(mezcla(pelo_c, '#8a6448', 0.45)) if edad == 'nino'
                                      else _osc(pelo_c, 0.85, '#2a1a14', 0.25))
        cb = G.P(xn + 0.02 * sd, vb)
        bw = a2 * 0.24 * (0.3 + 0.7 * f)
        bt = eh * (0.42 if edad != 'nino' else 0.24)
        tt = np.linspace(-1, 1, 12)
        arco_b = [G.off(cb, bw * t, -bt * 0.9 * (1 - ((t + 0.35 * sin_) / 1.35) ** 2) + 0.15 * bt * sin_ * t) for t in tt]
        grueso = [bt * (0.55 + 0.45 * ((1 + t * sin_) / 2)) for t in tt]
        forma = Poligono([G.off(p, 0, -g * 0.5) for p, g in zip(arco_b, grueso)] +
                         [G.off(p, 0, g * 0.5) for p, g in zip(arco_b[::-1], grueso[::-1])])
        lz.aguada(forma, bc, dens=(0.5 if edad != 'nino' else 0.3) if not canas else 0.35, suave=0.2, gran=0.2)
        pelos = []
        for k in range(16):
            t = -0.95 + 1.9 * k / 15
            p = G.off(cb, bw * t, -bt * 0.9 * (1 - ((t + 0.35 * sin_) / 1.35) ** 2) + bt * 0.3)
            L = bt * (1.1 if t * sin_ > 0.3 else 0.8)
            dx = -sin_ * L * 0.9
            pelos.append([p, G.off(p, dx, -L * 0.5)])
        lz.lapiz(pelos, _osc(bc, 0.75), grosor=0.26 if edad != 'nino' else 0.2, presion=0.5 if edad != 'nino' else 0.3,
                 temblor=0.06)


def _nariz(lz, G, skin, luz, edad='adulto'):
    E = G.E
    a2, b2 = G.a2, G.b2
    vb, vn = E['vb'], E['vn']
    nz = E['nariz']
    lx, ly = _u(luz if luz is not None else LUZ_DEF)
    sc = _osc(skin, 0.65, '#6a2a4a', 0.32)
    piel_l = _osc(skin, 0.5, '#4a2a2a', 0.45)
    tip = G.P(0.0, vn - 0.04, nz)
    puente = G.P(0.0, vb + 0.06, nz * 0.25)
    # the shaded side of the nose, toward the shadow
    lado_sombra = -1 if (lx * G.sg) > 0 else 1                  # in the mirrored frame
    ala_s = G.P(lado_sombra * 0.17, vn - 0.02, 0.08)
    ojo_s = G.P(lado_sombra * 0.16, E['ve'] + 0.02, 0.05)
    nino = edad == 'nino'
    if not nino:
        lz.aguada(Poligono([puente, G.P(lado_sombra * 0.05, vn - 0.08, nz * 0.9), ala_s, G.P(lado_sombra * 0.24, vn - 0.14),
                            ojo_s]), sc, dens=0.2, suave=a2 * 0.06, gran=0.2)
    else:
        lz.aguada(Elipse(*G.P(lado_sombra * 0.1, vn - 0.05, nz * 0.6), a2 * 0.1, b2 * 0.06), sc, dens=0.16,
                  suave=a2 * 0.05)
    # the wing of the nose on the shadow side, with a crisp edge
    lz.aguada(Elipse(*G.P(lado_sombra * 0.16, vn - 0.01, 0.05), a2 * 0.05, b2 * 0.03, G.ang(-20 * lado_sombra)), sc,
              dens=0.22, borde=0.5, irreg=0.2)
    # nostrils, the shadow the nose throws below, and the tip lit
    for sd in (-1, 1):
        xn = sd * 0.11
        if xn > G.visible() - 0.05:
            continue
        f = G.fore(xn, vn)
        p = G.P(xn, vn + 0.01, 0.06)
        lz.aguada(Elipse(p[0], p[1], a2 * 0.06 * (0.3 + 0.7 * f), b2 * 0.018, G.ang(-12 * sd)), '#3a1a1a', dens=0.5,
                  suave=0.25)
        # the wing of the nose: a soft C round the nostril
        w0 = G.P(sd * 0.19, vn - 0.08, 0.06)
        w1 = G.P(sd * 0.22, vn - 0.01, 0.04)
        w2 = G.P(sd * 0.12, vn + 0.02, 0.06)
        if not nino:
            lz.lapiz([bezier(w0, w1, w2, n=8)], piel_l, grosor=0.3, presion=0.3 if sd < 0 else 0.2, temblor=0.03)
    lz.aguada(Elipse(*G.off(G.P(0.0, vn + 0.05, 0.05), -lx * a2 * 0.04, 0), a2 * 0.18, b2 * 0.03, G.ang(0)), sc,
              dens=0.32, suave=a2 * 0.03)
    lz.levanta(Elipse(*G.off(tip, lx * a2 * 0.03, ly * b2 * 0.02 - b2 * 0.01), a2 * 0.045, b2 * 0.025), cantidad=0.15,
               suave=0.4)
    # in 3/4 the far side of the nose shows against the far cheek
    if G.tg > 0.12 and not nino:
        pts = [G.P(0.06, vb + 0.08 + (vn - 0.06 - vb - 0.08) * t, nz * t ** 1.2 + 0.02) for t in np.linspace(0.15, 1, 9)]
        pts.append(G.P(0.16, vn - 0.01, 0.06))
        lz.lapiz([pts], piel_l, grosor=0.3, presion=0.18 + 0.25 * min(1, G.tg / 0.4), temblor=0.03, puntas=0.4)


def _boca(lz, G, skin, boca, edad, luz):
    E = G.E
    a2, b2 = G.a2, G.b2
    vm = E['vm']
    lx, ly = _u(luz if luz is not None else LUZ_DEF)
    lab = _hex(mezcla(skin, '#b0505a', 0.42 if edad != 'mayor' else 0.3))
    lab_s = _osc(lab, 0.72, '#5a2030', 0.3)
    xm = 0.34 if edad != 'nino' else 0.25
    curva = {'suave': 0.02, 'sonrisa': 0.06, 'risa': 0.08, 'abierta': 0.06, 'canta': 0.0}.get(boca, 0.02)

    def M(xn, dv, dz=0.08):
        return G.P(xn, vm + dv, dz * math.sqrt(max(0, 1 - (xn / 0.5) ** 2)))
    xs = [x for x in np.linspace(-xm, xm, 15) if x < G.visible() - 0.03]
    if len(xs) < 4:
        return
    linea = [M(x, -curva * (x / xm) ** 2) for x in xs]
    if boca in ('risa', 'abierta', 'canta'):
        alto = 0.13 if boca == 'canta' else 0.06
        ancho = 0.62 if boca == 'canta' else 0.7
        arriba = [M(x * ancho, -curva * (x / xm) ** 2 - 0.005) for x in xs]
        abajo = [M(x * ancho, alto * (1 - (x / xm) ** 2) ** 0.7 + 0.01) for x in xs[::-1]]
        hueco = Poligono(arriba + abajo)
        lz.aguada(hueco, '#4a1a20', dens=0.85, tapa=1, borde=0.3, irreg=0.1)
        if boca != 'canta':
            dientes = hueco & Poligono([M(x * ancho, -curva * (x / xm) ** 2 + 0.028) for x in xs] +
                                       [M(x * ancho, -0.05) for x in xs[::-1]])
            lz.aguada(dientes, '#efe6dc', dens=0.85, tapa=1, borde=0.1, irreg=0.05)
            lz.aguada(dientes, '#b0a0a0', dens=0.15, suave=0.3)
        else:
            lz.aguada(hueco & Elipse(*M(0, alto * 0.8), a2 * 0.12, b2 * 0.03), '#a04050', dens=0.4, suave=0.3)
        # lips round the open mouth
        lz.aguada(Poligono(arriba + [M(x * ancho * 1.02, -curva * (x / xm) ** 2 - 0.035 * (1 - (x / xm) ** 2))
                                     for x in xs[::-1]]), lab_s, dens=0.42, suave=0.2)
        lz.aguada(Poligono(abajo[::-1] + [M(x * ancho, alto * (1 - (x / xm) ** 2) ** 0.7 + 0.045 * (1 - (x / xm) ** 2) ** 0.5)
                                          for x in xs[::-1]]), lab, dens=0.35, suave=0.2)
    else:
        sup = Poligono(linea + [M(x, -0.045 * (1 - (x / xm) ** 2) ** 0.6 - 0.012 * math.cos(x / xm * math.pi * 1.6)
                                  * (abs(x) < xm * 0.5) - curva * (x / xm) ** 2 * 0.6) for x in xs[::-1]])
        inf = Poligono(linea + [M(x, (0.07 if edad == 'nino' else 0.055) * (1 - (x / xm) ** 2) ** 0.7) for x in xs[::-1]])
        lz.aguada(sup, lab_s, dens=0.45, suave=0.18, gran=0.1)
        lz.aguada(inf, lab, dens=0.32, suave=0.2, gran=0.1)
        lz.levanta(Elipse(*G.off(M(0, 0.025), lx * a2 * 0.05, 0), a2 * 0.1, b2 * 0.012), cantidad=0.3, suave=0.25)
    lz.lapiz([linea], '#4a1a1a', grosor=0.36, presion=0.5, temblor=0.03, puntas=0.35)
    # the corners, and the shadow under the lower lip
    for x_ in (xs[0], xs[-1]):
        p = M(x_, -curva)
        lz.aguada(Elipse(p[0], p[1], a2 * 0.035, b2 * 0.02), _osc(skin, 0.55, '#4a2a3a', 0.4), dens=0.35, suave=0.2)
    lz.aguada(Elipse(*M(0, 0.115, 0.04), a2 * 0.15, b2 * 0.022, G.ang(0)), _osc(skin, 0.7, '#6a3a4a', 0.3), dens=0.22,
              borde=0.45, irreg=0.2)
    # philtrum: two faint ridges from the nose to the lip
    for sd in (-1, 1):
        lz.lapiz([[G.P(sd * 0.05, E['vn'] + 0.05, 0.08), G.P(sd * 0.07, vm - 0.05, 0.08)]],
                 _osc(skin, 0.7, '#6a3a4a', 0.3), grosor=0.25, presion=0.12)


def _orejas(lz, G, skin, luz, pendiente, peinado):
    if peinado in ('afro', 'rizado'):
        return
    E = G.E
    a2, b2 = G.a2, G.b2
    for sd in (-1, 1):
        if sd > 0 and G.tg > 0.12:
            continue                                        # the far ear is behind the head
        vt, vbase = E['vb'] - 0.02, E['vn'] + 0.02
        cv = (vt + vbase) / 2
        wv = float(G.w(cv))
        u = (-wv * G.ct - 0.18 * wv * G.st) if sd < 0 else wv * G.ct
        c = G.Q(u + sd * 0.02, cv)
        eh = (vbase - vt) / 2 * b2
        ew = eh * (0.28 + 0.5 * G.st) if sd < 0 else eh * 0.28
        # du + = toward the face
        R2 = (lambda c_, s_: (lambda du, dv: G.off(c_, -du * ew * s_, dv * eh)))(c, sd)
        perfil = [(-0.1, -1.0), (-0.65, -0.85), (-0.95, -0.35), (-0.9, 0.2), (-0.6, 0.65), (-0.35, 0.95), (0.05, 1.0),
                  (0.25, 0.75), (0.35, 0.3), (0.5, -0.2), (0.45, -0.7)]
        oreja = Poligono([R2(a, b) for (a, b) in perfil])
        lz.aguada(oreja, skin, dens=0.55, tapa=1, borde=0.25, irreg=0.15, gran=0.12,
                  toques=[(*R2(-0.2, -0.1), ew * 1.1, mezcla(skin, '#d06a60', 0.4), 0.45)])
        lz.aguada(Poligono([R2(a * 0.55 + 0.05, b * 0.6) for (a, b) in perfil]), _osc(skin, 0.62, '#6a2a3a', 0.3), dens=0.4,
                  suave=ew * 0.18)
        lz.lapiz([[R2(-0.15, -0.88), R2(-0.68, -0.62), R2(-0.8, -0.1), R2(-0.62, 0.45), R2(-0.38, 0.7)]],
                 _osc(skin, 0.5, '#4a1a1a', 0.45), grosor=0.3, presion=0.3, temblor=0.03, puntas=0.4)
        if pendiente:
            p = R2(-0.15, 1.05)
            lz.aguada(Elipse(p[0], p[1] + eh * 0.08, max(0.8, eh * 0.12)), pendiente, dens=0.9, tapa=1, irreg=0.05)
            lz.gouache(Elipse(p[0] - 0.25, p[1] + eh * 0.04, max(0.3, eh * 0.04)), '#fff6d0', alfa=0.8, irreg=0)


def _arrugas(lz, G, skin, ojos):
    E = G.E
    a2, b2 = G.a2, G.b2
    col = _osc(skin, 0.6, '#5a3a3a', 0.4)
    tr = []
    for k in range(3):                                      # forehead
        v = E['vb'] - 0.16 - 0.07 * k
        xs = [x for x in np.linspace(-0.42 + 0.06 * k, 0.4 - 0.05 * k, 9) if x < G.visible() - 0.05]
        if len(xs) > 3:
            tr.append([G.P(x, v + 0.012 * math.sin(x * 6 + k)) for x in xs])
    for sd in (-1, 1):
        xn = sd * 0.62
        if xn > G.visible() - 0.1:
            continue
        for k in range(3):                                  # crow's feet
            p = G.P(sd * 0.66, E['ve'] - 0.02 + 0.05 * k)
            tr.append([p, G.off(p, (-1 if sd < 0 else 1) * a2 * 0.1, b2 * (0.02 * k - 0.03))])
        tr.append([G.P(sd * 0.2, E['vn'] - 0.06), G.P(sd * 0.3, (E['vn'] + E['vm']) / 2), G.P(sd * 0.38, E['vm'] + 0.04)])
    lz.lapiz(tr, col, grosor=0.28, presion=0.2, temblor=0.06, cortes=0.25, puntas=0.4)


def _barba(lz, G, color, luz, rng):
    E = G.E
    a2 = G.a2
    vn, vm = E['vn'], E['vm']
    xv = G.visible()
    xs_j = [x for x in np.linspace(-1, 1, 21) if x < xv - 0.02]
    if len(xs_j) < 4:
        return
    # beard along the jaw and chin, open round the mouth; moustache above the upper lip
    arriba = [G.P(x, vn + 0.08 + 0.12 * abs(x)) for x in xs_j]
    abajo = [G.P(x, min(1.04, 0.62 + 0.42 * math.sqrt(max(0, 1 - x * x)))) for x in xs_j[::-1]]
    b = Poligono(arriba + abajo)
    boca = Poligono([G.P(x, E['vm'] - 0.05) for x in np.linspace(-0.3, min(0.3, xv - 0.05), 8)] +
                    [G.P(x, E['vm'] + 0.12) for x in np.linspace(min(0.26, xv - 0.05), -0.26, 8)])
    barba = b - boca
    lz.aguada(barba, color, dens=0.4, tapa=0.35, borde=0.15, irreg=1.0, gran=0.4)
    lz.aguada(barba, _osc(color, 0.65), dens=0.22, suave=a2 * 0.08)
    bigote = Poligono([G.P(x, vn + 0.06 + 0.04 * abs(x)) for x in np.linspace(-0.36, min(0.36, xv - 0.05), 9)] +
                      [G.P(x, vm - 0.035 + 0.04 * abs(x)) for x in np.linspace(min(0.38, xv - 0.05), -0.38, 9)])
    lz.aguada(bigote, color, dens=0.45, tapa=0.5, borde=0.15, irreg=0.7, gran=0.3)
    pelos = []
    for k in range(140):
        xn = rng.uniform(-1, min(1, xv - 0.05))
        v = rng.uniform(vn + 0.1, 0.98)
        if abs(xn) < 0.3 and vm - 0.06 < v < vm + 0.13:
            continue
        p = G.P(xn, v)
        pelos.append([p, G.off(p, xn * a2 * 0.04, a2 * 0.05)])
    lz.lapiz(pelos[::2], _osc(color, 0.55), grosor=0.2, presion=0.3, temblor=0.04, puntas=0.5)
    lz.lapiz(pelos[1::2], _cla(color, 0.5, '#ffffff'), grosor=0.2, presion=0.3, temblor=0.04, puntas=0.5)


def _gafas(lz, G, luz):
    E = G.E
    a2, b2 = G.a2, G.b2
    lx, ly = _u(luz if luz is not None else LUZ_DEF)
    tr = []
    centros = []
    for sd in (-1, 1):
        xn = sd * 0.4
        if xn > G.visible() - 0.05:
            continue
        f = G.fore(xn, E['ve'])
        c = G.P(xn, E['ve'] + 0.01, 0.1)
        gw = a2 * 0.27 * (0.25 + 0.75 * f)
        gh = b2 * 0.11
        tr.append(arco(c[0], c[1], gw, gh, 0, 360, 30, G.ang(0)))
        centros.append((c, gw))
        lz.gouache(Elipse(c[0] + lx * gw * 0.35, c[1] + ly * gh * 0.3, gw * 0.4, gh * 0.12, G.ang(-30)), '#ffffff',
                   alfa=0.25, irreg=0)
    if len(centros) == 2:
        (c1, w1), (c2, w2) = centros
        tr.append(bezier(G.off(c1, w1 * 0.98, -b2 * 0.02), G.P(0.0, E['ve'] - 0.04, 0.25), G.off(c2, -w2 * 0.98, -b2 * 0.02),
                         n=8))
    if centros:
        c1, w1 = centros[0]
        tr.append([G.off(c1, -w1, -b2 * 0.01), G.P(-0.98, E['ve'] - 0.02, -0.1)])
    lz.lapiz(tr, '#6a5a50', grosor=0.42, presion=0.62, temblor=0.03)


# ---- hair

def _hairline(G, peinado):
    E = G.E
    vh, ve = E['vh'], E['ve']
    xs = np.array([-1, -0.9, -0.75, -0.52, -0.2, 0.0, 0.2, 0.52, 0.75, 0.9, 1.0])
    if peinado == 'rizado':
        vs = np.array([0.5, 0.2, -0.25, -0.44, -0.42, -0.4, -0.43, -0.44, -0.25, 0.2, 0.5])
    elif peinado == 'afro':
        vs = np.array([ve - 0.05, -0.28, -0.42, -0.5, -0.53, -0.53, -0.53, -0.5, -0.42, -0.28, ve - 0.05])
    else:
        vs = np.array([ve + 0.02, -0.3, -0.5, vh - 0.08, vh, vh + 0.01, vh, vh - 0.08, -0.5, -0.3, ve + 0.02])
    return xs, vs


def _bajo_linea(G, xs, vs, ondula=0.0, rng=None):
    """Everything below the hairline (in front of the face), as a shape."""
    xv = G.visible()
    hl = [(x, float(np.interp(x, xs, vs))) for x in np.linspace(-1, 1, 33) if x <= xv]
    pts = []
    for (x, v) in hl:
        dv = ondula * (rng.uniform(-1, 1) if rng is not None else 0.0)
        pts.append(G.P(x, v + dv))
    u_end = float(G.u_front(hl[-1][0], hl[-1][1]))
    u_ini = float(G.u_front(hl[0][0], hl[0][1]))
    pts += [G.Q(u_end + 0.6, hl[-1][1]), G.Q(u_end + 0.6, 2.5), G.Q(u_ini - 0.6, 2.5), G.Q(u_ini - 0.6, hl[0][1])]
    return Poligono(pts, suave=False)


def _pelo_detras(lz, G, peinado, col, luz, rng, adorno):
    a2, b2 = G.a2, G.b2
    if peinado == 'afro':
        return
    if peinado == 'mono':
        if G.tg > 0.1:
            u, v = -0.82 * G.Rb, -1.0
        else:
            u, v = 0.0, -1.12
        c = G.Q(u, v)
        r_ = a2 * 0.36
        mono = Circulos([(c[0], c[1], r_), (*G.off(c, -r_ * 0.3, r_ * 0.25), r_ * 0.75)])
        volumen(lz, mono, col, luz, dens=0.92, prof=0.5, brillo=0.0, reflejo=0.0, grosor=0.35, presion=0.25)
        lz.aguada(mono, col, dens=0.35, suave=0.4)
        osc = _osc(col, 0.55, '#1a1010', 0.3)
        vueltas = []
        for k in range(9):
            a0 = rng.uniform(0, 360)
            rr = r_ * rng.uniform(0.35, 0.95)
            vueltas.append(arco(c[0], c[1], rr, rr * 0.85, a0, a0 + rng.uniform(90, 200), 12))
        lz.lapiz(vueltas, osc, grosor=0.25, presion=0.3, temblor=0.04, puntas=0.45)
        if adorno:
            fc = G.off(c, r_ * 0.75, r_ * 0.6)
            for k in range(5):
                a = 2 * math.pi * k / 5
                lz.aguada(Elipse(fc[0] + math.cos(a) * r_ * 0.28, fc[1] + math.sin(a) * r_ * 0.28, r_ * 0.24, r_ * 0.17,
                                 math.degrees(a)), adorno, dens=0.85, tapa=1, borde=0.4, irreg=0.2)
            lz.aguada(Elipse(fc[0], fc[1], r_ * 0.12), '#f0c040', dens=0.9, tapa=1)
    elif peinado == 'rizado':
        # a curly bob that falls to the jaw on both sides
        pts = G.contorno_escalado(1.2, 0.62, 0.62)
        masa = Poligono(pts)
        volumen(lz, masa, col, luz, dens=0.85, prof=0.5, brillo=0.0, reflejo=0.1, linea=False, irreg=0.9, gran=0.45)


def _rizos(lz, G, forma, col, luz, rng, n, ru, rv, tam):
    a2 = G.a2
    lx, ly = _u(luz if luz is not None else LUZ_DEF)
    osc = _osc(col, 0.5, '#0a0505', 0.3)
    cla = _cla(col, 0.5, '#d8c8b8')
    bucles, luces = [], []
    for k in range(n):
        u, v = rng.uniform(*ru), rng.uniform(*rv)
        c = G.Q(u, v)
        rr = a2 * tam * rng.uniform(0.7, 1.3)
        a0 = rng.uniform(0, 360)
        bucles.append(arco(c[0], c[1], rr, rr * 0.75, a0, a0 + rng.uniform(200, 320), 10))
        if u * lx * G.sg + (v + 0.4) * ly > 0.35 or rng.uniform() < 0.25:
            luces.append(arco(c[0], c[1], rr, rr * 0.75, a0, a0 + 140, 8))
    # keep only curls that start inside the mass
    x0, y0, x1, y1 = forma.bbox()
    s = lz.s
    ox, oy = int(x0 * s), int(y0 * s)
    m = forma.mascara(lz, ox, oy, int(x1 * s) + 1, int(y1 * s) + 1)

    def dentro(p):
        i = int(p[0][1] * s) - oy
        j = int(p[0][0] * s) - ox
        return 0 <= i < m.shape[0] and 0 <= j < m.shape[1] and m[i, j] > 0.5
    bucles = [b for b in bucles if dentro(b)]
    luces = [b for b in luces if dentro(b)]
    if bucles:
        lz.lapiz(bucles, osc, grosor=0.28, presion=0.32, temblor=0.06, cortes=0.3, puntas=0.4)
    if luces:
        lz.lapiz(luces, cla, grosor=0.28, presion=0.32, temblor=0.06, cortes=0.3, puntas=0.4)


def _pelo_delante(lz, G, peinado, col, luz, rng, adorno, canas):
    E = G.E
    a2, b2 = G.a2, G.b2
    lx, ly = _u(luz if luz is not None else LUZ_DEF)
    xs, vs = _hairline(G, peinado)
    xv = G.visible()
    osc = _osc(col, 0.55, '#1a1010', 0.3)
    ear_u = float(-G.w(0.1) * G.ct - 0.18 * G.w(0.1) * G.st)
    if peinado == 'calvo':
        # grey hair round the side and the back, below the bare crown that shines
        v_top, v_bot = -0.42, 0.3
        vv = np.linspace(v_top, v_bot, 10)
        back = [G.Q(float(G.lo(v)) * 1.04, v) for v in vv]
        front = [G.Q(ear_u - 0.06 + 0.12 * (v - v_bot), v) for v in vv[::-1]]
        banda = Poligono(back + front)
        volumen(lz, banda, col, luz, dens=0.5, prof=0.35, brillo=0.0, reflejo=0.0, linea=False, irreg=0.9, gran=0.4,
                duro=0.0)
        tr = []
        for k in range(26):
            v = rng.uniform(v_top + 0.05, v_bot - 0.05)
            u0 = float(G.lo(v)) * 1.02
            p = G.Q(u0 + rng.uniform(0.0, 0.2), v)
            tr.append([p, G.off(p, a2 * 0.1, b2 * 0.07)])
        lz.lapiz(tr, osc, grosor=0.25, presion=0.3, temblor=0.05)
        if G.tg < 0.15:
            back2 = [G.Q(float(G.hi(v)) * 1.03, v) for v in vv]
            front2 = [G.Q(float(G.hi(v)) * 0.88, v) for v in vv[::-1]]
            volumen(lz, Poligono(back2 + front2), col, luz, dens=0.5, prof=0.35, brillo=0, reflejo=0, linea=False, irreg=0.9)
        cx_, cy_ = G.Q(0.15 * lx * G.sg - 0.15, -0.72)
        lz.levanta(Elipse(cx_ + lx * a2 * 0.15, cy_ + ly * b2 * 0.05, a2 * 0.32, b2 * 0.12, G.ang(-20)), cantidad=0.35,
                   suave=a2 * 0.12)
        return
    if peinado == 'afro':
        # a cloud of curls round the head, cut along a rounded hairline above the face
        cx, cy, rx, ry = -G.st * 0.25, -0.45, 1.32, 1.1
        cs = [(*G.Q(cx, cy), a2 * 1.12)]
        for k in range(44):
            a = 2 * math.pi * k / 44
            rr = rng.uniform(0.16, 0.25)
            u = cx + math.cos(a) * (rx - rr * 0.6)
            v = cy + math.sin(a) * (ry - rr * 0.6) * (1.0 if math.sin(a) < 0.3 else 0.85)
            if v > 0.5:
                continue
            cs.append((*G.Q(u, v), a2 * rr))
        nube = Circulos(cs)
        cara = _bajo_linea(G, xs, vs, ondula=0.03, rng=rng)
        afro = nube - (G.silueta() & cara)
        volumen(lz, afro, col, luz, dens=0.86, prof=0.5, brillo=0.0, reflejo=0.12, linea=False, irreg=0.8, gran=0.45,
                duro=0.15)
        _rizos(lz, G, afro, col, luz, rng, 260, (cx - 1.45, cx + 1.45), (-1.6, 0.45), 0.065)
        return
    # a cap of hair following the skull from the hairline over the crown
    th = {'corto': 1.1, 'mono': 1.05, 'rizado': 1.2}.get(peinado, 1.06)
    v_nuca = {'corto': 0.3, 'mono': 0.22, 'rizado': 0.6}.get(peinado, 0.3)
    hl = [(x, float(np.interp(x, xs, vs)) + rng.uniform(-0.012, 0.012)) for x in np.linspace(-1, 1, 33) if x <= xv]
    pts = [G.P(x, v) for (x, v) in hl]
    v_end = hl[-1][1]
    pts += [G.Q(float(G.hi(v)) * th, -0.25 + (v + 0.25) * th) for v in np.linspace(v_end, -1, 14)]
    pts += [G.Q(float(G.lo(v)) * th, -0.25 + (v + 0.25) * th) for v in np.linspace(-1, v_nuca, 16)]
    pts += [G.Q(ear_u - 0.1, v_nuca), G.Q(ear_u - 0.08, E['ve'] - 0.02)]
    gorro = Poligono(pts)
    if peinado == 'corto':
        mechas = []
        for (x, v) in hl[1:-1:2]:
            p0 = G.P(x, v - 0.1)
            p1 = G.P(x + rng.uniform(-0.06, 0.1), v + rng.uniform(0.02, 0.07))
            mechas.append(Trazo([p0, ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2), p1], (a2 * 0.13, a2 * 0.08, a2 * 0.012)))
        for k in range(6):                                  # tufts standing off the crown
            v = rng.uniform(-0.95, -0.55)
            u = float(G.hi(v) if rng.uniform() < 0.5 else G.lo(v)) * 1.05
            p0 = G.Q(u * 0.9, v + 0.05)
            p1 = G.Q(u * 1.12, v - rng.uniform(0.02, 0.1))
            mechas.append(Trazo([p0, p1], (a2 * 0.12, a2 * 0.01)))
        for m_ in mechas:
            gorro = gorro | m_
    volumen(lz, gorro, col, luz, dens=0.78 if not canas else 0.5, prof=0.5, espesor=a2 * 0.5, brillo=0.0,
            reflejo=0.12, linea=True, grosor=0.3, presion=0.24, irreg=0.7, gran=0.4, duro=0.2)
    # a sheen where the hair turns toward the light
    sh = G.Q(0.25 * lx * G.sg - 0.1, -0.78 + 0.12 * ly)
    lz.levanta(gorro & Elipse(sh[0], sh[1], a2 * 0.6, b2 * 0.11, G.ang(-15)), cantidad=0.26, suave=a2 * 0.08)
    if peinado == 'rizado':
        _rizos(lz, G, gorro, col, luz, rng, 140, (-1.25, 1.25), (-1.3, 0.6), 0.07)
        return
    if peinado == 'mono':
        origen, hacia = (-0.82 * G.Rb if G.tg > 0.1 else 0.0, -1.0 if G.tg > 0.1 else -1.12), True
    else:
        origen, hacia = (-0.3, -0.95), False                 # a side parting
    _mechones(lz, G, gorro, origen, hacia, col, luz, rng, 110, 0.38)
    # a few strands escape over the hairline
    sueltos = []
    for (x, v) in hl[2:-2:3]:
        p = G.P(x, v - 0.02)
        sueltos.append(bezier(p, G.P(x + 0.03, v + 0.02), G.P(x + 0.05 * rng.uniform(-1, 1), v + 0.05), n=6))
    lz.lapiz(sueltos, osc, grosor=0.2, presion=0.22, temblor=0.04, puntas=0.5)


def _mechones(lz, G, forma, origen, hacia, col, luz, rng, n, largo):
    """Strands that flow away from a parting (or toward a bun), darker in the mass,
    lighter where the hair catches the light."""
    a2, b2 = G.a2, G.b2
    lx, ly = _u(luz if luz is not None else LUZ_DEF)
    osc = _osc(col, 0.5, '#120808', 0.3)
    cla = _cla(col, 0.45, '#efe2cc')
    x0, y0, x1, y1 = forma.bbox()
    s = lz.s
    ox, oy = int(x0 * s), int(y0 * s)
    m = forma.mascara(lz, ox, oy, int(x1 * s) + 1, int(y1 * s) + 1)

    def dentro(p):
        i, j = int(p[1] * s) - oy, int(p[0] * s) - ox
        return 0 <= i < m.shape[0] and 0 <= j < m.shape[1] and m[i, j] > 0.5
    oscuros, claros = [], []
    for k in range(n * 3):
        if len(oscuros) + len(claros) >= n:
            break
        u, v = rng.uniform(-1.3, 1.3), rng.uniform(-1.25, 0.35)
        p0 = G.Q(u, v)
        if not dentro(p0):
            continue
        d = np.array([u - origen[0], v - origen[1]])
        if hacia:
            d = -d
        d = d / (np.linalg.norm(d) + 1e-6)
        d = d + np.array([0, 0.35])
        d = d / np.linalg.norm(d)
        L = largo * rng.uniform(0.5, 1.0)
        pm = (u + d[0] * L * 0.5 + rng.normal(0, 0.03), v + d[1] * L * 0.5 + 0.03)
        pe = (u + d[0] * L, v + d[1] * L + 0.06)
        tr = bezier(p0, G.Q(*pm), G.Q(*pe), n=10)
        k_fuera = next((j for j, q in enumerate(tr) if not dentro(q)), len(tr))
        if k_fuera < 4:
            continue
        tr = tr[:k_fuera]
        if (u * G.sg * lx + (v + 0.6) * ly) > 0.35 and rng.uniform() < 0.6:
            claros.append(tr)
        else:
            oscuros.append(tr)
    if oscuros:
        lz.lapiz(oscuros, osc, grosor=0.24, presion=0.3, temblor=0.04, cortes=0.25, puntas=0.45)
    if claros:
        lz.lapiz(claros, cla, grosor=0.22, presion=0.26, temblor=0.04, cortes=0.25, puntas=0.45)


# ---------------------------------------------------------------- hands

def _dir(ang):
    a = math.radians(ang)
    return np.array([math.cos(a), math.sin(a)])


def _rot(d, n, t):
    t = math.radians(t)
    v = d * math.cos(t) + n * math.sin(t)
    return v / max(np.linalg.norm(v), 1e-9)


def mano_real(lz, x, y, ang, tam, piel='piel2', gesto='abierta', lado=1, abre=1.0, luz=None, semilla=None, tapa=1):
    """A hand with the SAME geometry as extra_m678.mano2 (so it still holds what it held),
    painted as flesh: every finger its own lit cylinder, knuckles, nails, almost no line.
    gesto: 'abierta', 'relajada', 'agarra', 'senala', 'pinza', 'junta'. Returns fingertips."""
    skin = _hex(piel)
    d = _dir(ang)
    n = np.array([-d[1], d[0]]) * lado
    c = np.array([x, y], np.float64)
    P = lambda u, v: c + d * (u * tam) + n * (v * tam)
    palma = Poligono([P(-0.02, -0.15), P(0.06, -0.18), P(0.4, -0.2), P(0.5, -0.16), P(0.53, 0.0),
                      P(0.5, 0.15), P(0.3, 0.19), P(0.08, 0.16), P(-0.02, 0.13)])
    curl = dict(abierta=(4, 3), relajada=(16, 14), agarra=(75, 70), senala=(75, 70), pinza=(28, 30), junta=(3, 2),
                sostiene=(38, 42))[gesto]
    spread = dict(abierta=7, relajada=3, agarra=0, senala=1, pinza=2, junta=0.6, sostiene=2.5)[gesto] * abre
    largos = [0.4, 0.45, 0.42, 0.33]
    vs = [0.12, 0.04, -0.045, -0.125]
    us = [0.49, 0.52, 0.5, 0.46]
    nombres = ['indice', 'corazon', 'anular', 'menique']
    dedos, puntas = [], {}
    for i in range(4):
        c1, c2 = curl
        if gesto == 'senala' and i == 0:
            c1, c2 = 3, 2
        if gesto == 'pinza' and i == 0:
            c1, c2 = 35, 40
        base = P(us[i], vs[i])
        dv = _rot(d, n, (1.5 - i) * spread)
        segs = [largos[i] * 0.46, largos[i] * 0.31, largos[i] * 0.25]
        pts = [base - dv * tam * 0.06]
        t = 0
        for k, sL in enumerate(segs):
            cc = c1 if k == 0 else c2
            t += cc
            fsh = 1 - 0.5 * min(1, cc / 75.0)
            pts.append(pts[-1] + _rot(dv, n, -t) * sL * tam * fsh)
        w = tam * 0.098 * (0.88 if i == 3 else 1.0)
        dedos.append((Trazo(pts, (w * 1.08, w * 1.0, w * 0.9, w * 0.78), suave=True), pts, w))
        puntas[nombres[i]] = pts[-1]
    if gesto in ('agarra', 'senala'):
        tp = [P(0.1, 0.15), P(0.28, 0.24), P(0.44, 0.17), P(0.52, 0.06)]
    elif gesto == 'pinza':
        tp = [P(0.1, 0.15), P(0.3, 0.27), puntas['indice'] * 0.5 + P(0.62, 0.2) * 0.5, puntas['indice']]
    else:
        q = c + _rot(d, n, 26 + 10 * abre) * tam * 0.5
        tp = [P(0.12, 0.13), P(0.27, 0.24) * 0.6 + q * 0.4, q]
    pulgar = Trazo(tp, (tam * 0.15, tam * 0.125, tam * 0.1), suave=True)
    puntas['pulgar'] = np.asarray(tp[-1])
    puntas['palma'] = P(0.3, 0.0)
    sc = _osc(skin, 0.68, '#7a3a4a', 0.3)
    lp = _osc(skin, 0.5, '#5a2a3a', 0.4)
    siena = _hex(mezcla(skin, '#8a3a1a', 0.3))
    dd = 0.6 + 0.22 * (1 - float(np.dot(rgb(skin), [0.3, 0.59, 0.11])))     # as deep a colour as the face
    volumen(lz, palma, skin, luz, dens=dd, prof=0.42, espesor=tam * 0.12, tapa=tapa, brillo=0.0, reflejo=0.06,
            grosor=0.32, presion=0.26, sombra=sc, duro=0.4, irreg=0.2, gran=0.3, proyecta=tam * 0.05)
    for i in (3, 2, 1, 0):
        f, pts, w = dedos[i]
        volumen(lz, f, skin, luz, dens=dd, prof=0.45, espesor=w * 0.5, tapa=tapa, brillo=0.0, reflejo=0.06,
                grosor=0.32, presion=0.34, sombra=sc, duro=0.4, irreg=0.15, gran=0.3)
        # knuckle creases and the nail
        for j in (1, 2):
            q = np.asarray(pts[j])
            dn_ = _u(np.asarray(pts[j + 1]) - np.asarray(pts[j - 1]))
            nn_ = np.array([-dn_[1], dn_[0]])
            lz.lapiz([[tuple(q - nn_ * w * 0.3), tuple(q + dn_ * w * 0.05), tuple(q + nn_ * w * 0.3)]], lp, grosor=0.22,
                     presion=0.26, temblor=0.02)
        tip = np.asarray(pts[-1])
        dn_ = _u(np.asarray(pts[-1]) - np.asarray(pts[-2]))
        curled = gesto in ('agarra', 'senala') and not (gesto == 'senala' and i == 0)
        if not curled:
            a_ = math.degrees(math.atan2(dn_[1], dn_[0]))
            nc = tip - dn_ * w * 0.55
            lz.aguada(Elipse(nc[0], nc[1], w * 0.42, w * 0.32, a_), _cla(skin, 0.35, '#f4dcd4'), dens=0.45, suave=0.15)
            lz.lapiz([list(arco(nc[0], nc[1], w * 0.42, w * 0.32, 100, 260, 8, a_))], lp, grosor=0.2, presion=0.25)
    # the gaps between the fingers: a dark line down the middle of each pair
    gaps = []
    for i in range(3):
        a_, b_ = dedos[i][1], dedos[i + 1][1]
        m_ = min(len(a_), len(b_))
        g = [tuple((np.asarray(a_[k]) + np.asarray(b_[k])) / 2) for k in range(m_)]
        gaps.append(g[:-1] + [tuple(np.asarray(g[-2]) * 0.4 + np.asarray(g[-1]) * 0.6)])
    lz.lapiz(gaps, lp, grosor=0.3, presion=0.45, temblor=0.02, puntas=0.3)
    volumen(lz, pulgar, skin, luz, dens=dd, prof=0.45, espesor=tam * 0.06, tapa=tapa, brillo=0.0, reflejo=0.06,
            grosor=0.32, presion=0.34, sombra=sc, duro=0.4, irreg=0.15, gran=0.3, proyecta=tam * 0.04)
    # the knuckles of the back of the hand, in burnt sienna
    for i in range(4):
        q = P(us[i] - 0.05, vs[i])
        lz.lapiz([list(arco(q[0], q[1], tam * 0.04, tam * 0.03, 200, 340, 6, ang + 90))], siena, grosor=0.26,
                 presion=0.32)
    lz.aguada(Elipse(*P(0.47, 0.0), tam * 0.12, tam * 0.07, ang), '#d97a76', dens=0.12, suave=tam * 0.05)
    return puntas


def mano_agarre(lz, muneca, centro, ang_eje, diam, tam, piel='piel2', luz=None, nudillos=1, dorso=True):
    """A hand closed round something long -- a column, the neck of a guitar, the edge of a
    skirt -- seen with the fingers in front: the back of the hand from the wrist to the
    knuckles at one side of the object, four fingers curling across its front, each its
    own lit cylinder with the gap between them dark, the tips tucked behind the far side.
    centro: where the grip is on the object's axis; ang_eje: the axis (degrees); diam: its
    thickness; nudillos: +1 / -1, which side of the axis the knuckles are on."""
    luz = luz if luz is not None else _LUZ_ESCENA[0]
    skin = _hex(piel)
    c = np.asarray(centro, np.float64)
    ax = np.array([math.cos(math.radians(ang_eje)), math.sin(math.radians(ang_eje))])
    n = np.array([-ax[1], ax[0]]) * nudillos
    fw = tam * 0.11
    sc = _osc(skin, 0.68, '#7a3a4a', 0.3)
    lp = _osc(skin, 0.5, '#5a2a3a', 0.4)
    siena = _hex(mezcla(skin, '#8a3a1a', 0.3))
    dd = 0.6 + 0.22 * (1 - float(np.dot(rgb(skin), [0.3, 0.59, 0.11])))
    w = np.asarray(muneca, np.float64)
    nud = [c + n * (diam * 0.5 + fw * 0.4) + ax * (k - 1.5) * fw * 1.02 for k in range(4)]
    if dorso:
        volumen(lz, Poligono([tuple(w + ax * fw * 1.5), tuple(nud[3] + ax * fw * 0.5 + n * fw * 0.3),
                              tuple(nud[3] + n * fw * 0.6), tuple(nud[0] + n * fw * 0.6),
                              tuple(nud[0] - ax * fw * 0.5 + n * fw * 0.3), tuple(w - ax * fw * 1.5)]),
                skin, luz, dens=dd, prof=0.42, espesor=tam * 0.12, grosor=0.32, presion=0.26, sombra=sc, duro=0.4,
                proyecta=tam * 0.05)
    dedos = []
    for k in (3, 2, 1, 0):
        off = ax * (k - 1.5) * fw * 0.94
        largo = (1.0, 1.08, 1.02, 0.82)[3 - k]
        ancho = (1.05, 1.1, 1.02, 0.86)[3 - k] * fw
        p0 = nud[k]
        p1 = c + off + n * diam * 0.12
        p2 = c + off - n * diam * 0.5 * largo
        dedo = Trazo([tuple(p0), tuple(p1), tuple(p2)], (ancho * 1.05, ancho, ancho * 0.8))
        volumen(lz, dedo, skin, luz, dens=dd, prof=0.45, espesor=ancho * 0.5, grosor=0.32, presion=0.36, sombra=sc, duro=0.4)
        lz.lapiz([[tuple(p1 - ax * ancho * 0.4), tuple(p1 + ax * ancho * 0.4)]], lp, grosor=0.22, presion=0.26)
        lz.lapiz([list(arco(p0[0], p0[1], ancho * 0.4, ancho * 0.3, 0, 180, 6, ang_eje))], siena, grosor=0.24, presion=0.3)
        dedos.append((p0, p1, p2))
    if dorso:
        # the thumb crosses in front, from the side of the hand over the first finger
        t0 = nud[0] - ax * fw * 1.3 + n * fw * 0.2
        t1 = c - ax * fw * 1.9 + n * diam * 0.05
        t2 = c - ax * fw * 1.2 - n * diam * 0.3
        pulgar = Trazo([tuple(t0), tuple(t1), tuple(t2)], (fw * 1.25, fw * 1.1, fw * 0.9))
        volumen(lz, pulgar, skin, luz, dens=dd, prof=0.45, espesor=fw * 0.6, grosor=0.32, presion=0.36, sombra=sc, duro=0.4)
        lz.aguada(Elipse(*(t2 + (t1 - t2) * 0.25), fw * 0.4, fw * 0.3, ang_eje), _cla(skin, 0.35, '#f4dcd4'), dens=0.45,
                  suave=0.15)
    gaps = []
    for i in range(3):
        a_, b_ = dedos[i], dedos[i + 1]
        gaps.append([tuple((a_[j] + b_[j]) / 2) for j in range(3)])
    lz.lapiz(gaps, lp, grosor=0.3, presion=0.48, temblor=0.02, puntas=0.3)
    return nud


# ---------------------------------------------------------------- adapters: the same calls, painted this way

_LUZ_ESCENA = [LUZ_DEF]


def modelar(lz, forma, color, luz, dens=0.66, prof=0.42, sombra=None, linea=None, grosor=0.8, tapa=1, toques=None,
            rayar=True, ang_rayado=None, sep=2.7, reflejo=0.0, brillo=0.0, irreg=0.35, gran=0.25, semilla=None,
            perdida=0.0, firme=0.8, alcance=0.95, dibuja=True):
    volumen(lz, forma, color, luz, dens=dens, prof=max(0.45, prof * 1.15), tapa=tapa, irreg=irreg, gran=gran,
            toques=toques, sombra=sombra, brillo=0.0, reflejo=0.06 + reflejo * 0.5, linea=dibuja,
            grosor=min(0.45, grosor * 0.6), presion=0.3, proyecta=2.5, semilla=semilla, rayar=rayar, ang_rayado=ang_rayado)


def cabeza3(lz, x, y, r, piel, pelo, peinado, luz, giro=0.0, inclina=0.0, edad='nino', ojos='abiertos', boca='suave',
            mira=(0.0, 0.0), gafas=False, canas=False, pendiente=None, iris='#5a3422', semilla=None, **kw):
    import figuras_v3
    k = getattr(figuras_v3, 'MIRA_FUERZA', 1.0)
    mira = (mira[0] * k, mira[1] * k)
    out = cabeza_real(lz, x, y, r, piel=piel, pelo=pelo, peinado=peinado, luz=luz, giro=giro, inclina=inclina,
                      edad=edad, ojos=ojos, boca=boca, mira=mira, gafas=gafas, canas=canas, pendiente=pendiente,
                      iris=iris, semilla=semilla)
    return np.array(out['centro'])


def cabeza(lz, x, y, r, piel='piel2', pelo='#5a3a2a', peinado='corto', giro=0.0, inclina=0.0, ojos='abiertos',
           boca='sonrisa', mejillas=True, barba=None, canas=False, mira=(0, 0), semilla=None, lapiz=None, adorno=None,
           dientes=True, edad=None, **kw):
    if edad is None:
        edad = 'mayor' if canas else ('nino' if r < 25 else 'adulto')
    pein = {'rizado': 'rizado', 'mono': 'mono', 'corto': 'corto', 'calvo': 'calvo', 'afro': 'afro'}.get(peinado, 'corto')
    ojo = {'cerrados': 'cerrados', 'abajo': 'abajo'}.get(ojos, 'abiertos')
    bo = {'ríe': 'risa', 'rie': 'risa', 'canta': 'canta', 'abierta': 'abierta', 'suave': 'suave'}.get(boca, 'sonrisa')
    return cabeza_real(lz, x, y, r, piel=piel, pelo=pelo, peinado=pein, luz=_LUZ_ESCENA[0], giro=giro, inclina=inclina,
                       edad=edad, ojos=ojo, boca=bo, mira=mira, canas=canas, barba=barba, adorno=adorno, semilla=semilla)


def mano2(lz, x, y, ang, tam, piel='piel2', gesto='abierta', lado=1, abre=1.0, tapa=1, semilla=None, lapiz=None):
    return mano_real(lz, x, y, ang, tam, piel=piel, gesto=gesto, lado=lado, abre=abre, luz=_LUZ_ESCENA[0],
                     semilla=semilla, tapa=tapa)


def mano(lz, x, y, ang, tam, piel='piel2', tipo='abierta', semilla=None, pulgar=1):
    g = {'abierta': 'abierta', 'junta': 'junta', 'sujeta': 'sostiene', 'puño': 'agarra', 'señala': 'senala',
         'senala': 'senala'}.get(tipo, 'relajada')
    # the old hands were drawn small for the big heads; a real hand is about 3/4 of the face's length
    return mano_real(lz, x, y, ang, tam * 1.45, piel=piel, gesto=g, lado=pulgar, luz=_LUZ_ESCENA[0], semilla=semilla)


def _pliegues_tela(lz, a, b, w, color, rng, n=4):
    """Soft creases across a sleeve or trouser leg between a and b: a narrow shadow and a
    lifted ridge beside it, the way cloth is painted, so the limb is not a smooth tube."""
    a, b = np.asarray(a, np.float64), np.asarray(b, np.float64)
    d = _u(b - a)
    perp = np.array([-d[1], d[0]])
    lx, ly = _u(_LUZ_ESCENA[0])
    sc = _osc(color, 0.55, '#3a2440', 0.3)
    for k in range(n):
        t = rng.uniform(0.12, 0.88)
        p = a + (b - a) * t
        g = math.radians(rng.uniform(-28, 28))
        q = d * math.sin(g) + perp * math.cos(g)
        L = w * rng.uniform(0.35, 0.6)
        c0 = p - q * L * rng.uniform(0.6, 1.0)
        c1 = p + q * L * rng.uniform(0.2, 0.7)
        mid = (c0 + c1) / 2 + d * w * rng.uniform(-0.12, 0.12)
        lz.aguada(Trazo([tuple(c0), tuple(mid), tuple(c1)], (w * 0.04, w * 0.1, w * 0.03)), sc, dens=0.32, borde=0.3,
                  irreg=0.4, gran=0.3)
        off = np.array([lx, ly]) * w * 0.1
        lz.levanta(Trazo([tuple(c0 + off), tuple(mid + off), tuple(c1 + off)], (w * 0.03, w * 0.07, w * 0.02)),
                   cantidad=0.12, suave=0.4)


def _doblez(a, b, c):
    """How much a joint bends (degrees) and which way its point sticks out."""
    a, b, c = (np.asarray(p, np.float64) for p in (a, b, c))
    d1, d2 = _u(b - a), _u(c - b)
    ang = math.degrees(math.acos(float(np.clip(np.dot(d1, d2), -1, 1))))
    fuera = d1 - d2
    return ang, (_u(fuera) if np.linalg.norm(fuera) > 1e-6 else np.array([0.0, 0.0])), d1, d2


def _codo(a, b, c, w):
    """The point of a bent elbow or knee: the bone pushes the outline out on the outside."""
    ang, fuera, _, _ = _doblez(a, b, c)
    b = np.asarray(b, np.float64)
    if ang < 18:
        return Elipse(*b, w * 0.47)
    k = min(1.0, ang / 70)
    return Elipse(*b, w * 0.47) | Elipse(*(b + fuera * w * 0.2 * k), w * 0.34)


def _pliegues_v(lz, a, b, c, w, color, n=3):
    """Cloth gathered inside a bent elbow or behind a bent knee: V-shaped folds that open
    toward the two segments, each a dark crease with a lit ridge beside it."""
    ang, fuera, d1, d2 = _doblez(a, b, c)
    if ang < 20:
        return
    b = np.asarray(b, np.float64)
    dentro = -fuera
    sc = _osc(color, 0.5, '#2a1a2a', 0.3)
    tr = []
    for k in range(n):
        ap = b + dentro * w * (0.12 + 0.12 * k)
        L = w * (0.42 - 0.07 * k)
        tr.append([tuple(ap - d1 * L), tuple(ap), tuple(ap + d2 * L)])
    for t_ in tr:
        lz.aguada(Trazo(t_, (w * 0.03, w * 0.07, w * 0.03)), sc, dens=0.32, borde=0.4, irreg=0.3, gran=0.3)
    lz.lapiz(tr, sc, grosor=0.3, presion=0.32, temblor=0.06, puntas=0.45)


def brazo3(lz, hombro, codo, muneca, w, manga, piel, luz, largo='larga', mano=None, tapa=1, puno=None,
           semilla=None, linea_piel=None):
    """figuras_v3.brazo3's arm, same joints: a sleeve that bends with a real elbow and gathers
    in folds inside it, a slimmer wrist, the bare arm with its anatomy."""
    import figuras_v3 as F
    h, e, wr = map(F._v, (hombro, codo, muneca))
    piel_c = _hex(F._piel(piel))
    ang, fuera, d1, d2 = _doblez(h, e, wr)
    if largo == 'larga':
        tela = (Trazo([h, h + (e - h) * 0.5, e], (w * 1.12, w * 1.08, w * 0.98)) |
                Trazo([e, e + (wr - e) * 0.5, wr + d2 * w * 0.05], (w * 0.96, w * 0.9, w * 0.8)) | _codo(h, e, wr, w * 1.0))
        volumen(lz, tela, manga, luz, prof=0.5, tapa=tapa, semilla=semilla, rayar=True, proyecta=2.5, grosor=0.38)
        _pliegues_v(lz, h, e, wr, w, manga)
        rng = np.random.default_rng(int(abs(h[0]) * 3 + abs(wr[1]) * 7))
        _pliegues_tela(lz, h + (e - h) * 0.15, e - (e - h) * 0.2, w, manga, rng, n=2)
        _pliegues_tela(lz, e + (wr - e) * 0.25, wr - (wr - e) * 0.15, w * 0.9, manga, rng, n=2)
        nrm = np.array([-d2[1], d2[0]])
        cf = Poligono([wr - d2 * w * 0.3 + nrm * w * 0.42, wr + d2 * w * 0.06 + nrm * w * 0.4,
                       wr + d2 * w * 0.06 - nrm * w * 0.4, wr - d2 * w * 0.3 - nrm * w * 0.42], suave=False)
        lz.aguada(cf, puno or _osc(manga, 0.86, '#6a3a20', 0.12), dens=0.6, tapa=1, irreg=0.2, borde=0.4)
        lz.lapiz([[wr - d2 * w * 0.3 + nrm * w * 0.42, wr - d2 * w * 0.3 - nrm * w * 0.42]], _osc(manga, 0.5),
                 grosor=0.4, presion=0.35)
    else:
        s1, s2, brazo = F.brazo_forma(h, e, wr, w)
        brazo = brazo | _codo(h, e, wr, w * 0.62)
        volumen(lz, brazo, piel_c, luz, dens=0.56, prof=0.45, sombra=F.sombra_piel(piel_c), tapa=tapa, semilla=semilla,
                grosor=0.34, presion=0.26, duro=0.45)
        if ang > 20:
            lz.lapiz([bezier(e - d1 * w * 0.12 - fuera * w * 0.1, e - fuera * w * 0.2, e + d2 * w * 0.15 - fuera * w * 0.1,
                             n=8)], _osc(piel_c, 0.5, '#4a2a2a', 0.4), grosor=0.3, presion=0.28)
        if largo == 'corta':
            q = h + (e - h) * 0.52
            d = _u(e - h)
            nrm = np.array([-d[1], d[0]])
            sl = Poligono([h - d * w * 0.25 + nrm * w * 0.62, q + nrm * w * 0.74 + d * w * 0.04,
                           q - nrm * w * 0.74 - d * w * 0.04, h - d * w * 0.25 - nrm * w * 0.62, h - d * w * 0.55])
            volumen(lz, sl, manga, luz, prof=0.5, tapa=1, rayar=True, proyecta=1.5, grosor=0.36)
            lz.lapiz([bezier(q + nrm * w * 0.66, q + d * w * 0.06, q - nrm * w * 0.66, n=10)], _osc(manga, 0.5),
                     grosor=0.45, presion=0.4)
            rng = np.random.default_rng(int(abs(h[0]) * 5))
            _pliegues_tela(lz, h, q, w * 0.9, manga, rng, n=2)
    if mano is not None:
        mk = dict(mano)
        an = mk.pop('ang', None)
        if an is None:
            v = wr - e
            an = math.degrees(math.atan2(v[1], v[0]))
        tm = mk.pop('tam', w * 1.8)
        return mano2(lz, wr[0], wr[1], an, tm, piel, **mk)
    return None


def pierna3(lz, cadera, rodilla, tobillo, w, pantalon, piel, luz, pie_ang=0, zapato='#7a5544', pie_tam=None,
            tapa=1, semilla=None, falda_hasta=None):
    """figuras_v3.pierna3's leg, same joints: trousers with a knee (taut over it, folded
    behind), a straight hem that shows the ankle, a shoe with a sole; or a bare leg with
    knee, calf and a slim ankle."""
    import figuras_v3 as F
    c, k, a = map(F._v, (cadera, rodilla, tobillo))
    ang, fuera, d1, d2 = _doblez(c, k, a)
    F.zapato3(lz, a, pie_ang, pie_tam or w * 1.35, zapato, luz, tapa=tapa)
    if pantalon:
        hem = a - d2 * w * 0.28
        calcetin = Trazo([hem - d2 * w * 0.1, a + d2 * w * 0.04], (w * 0.46, w * 0.42))
        volumen(lz, calcetin, _hex(mezcla(pantalon, '#3a3438', 0.6)), luz, dens=0.7, prof=0.45, linea=False, duro=0.5)
        tela = (Trazo([c, c + (k - c) * 0.5, k], (w * 1.1, w * 1.04, w * 0.92)) |
                Trazo([k, k + (hem - k) * 0.5, hem], (w * 0.9, w * 0.84, w * 0.8), suave=True) | _codo(c, k, hem, w * 0.95))
        volumen(lz, tela, pantalon, luz, prof=0.5, tapa=tapa, semilla=semilla, rayar=True, proyecta=2.5, grosor=0.38)
        _pliegues_v(lz, c, k, hem, w, pantalon, n=2)
        if ang > 20:                                       # the cloth pulled taut over the knee catches light
            lz.levanta(Trazo([tuple(k - d1 * w * 0.5 + fuera * w * 0.32), tuple(k + fuera * w * 0.38),
                              tuple(k + d2 * w * 0.4 + fuera * w * 0.32)], (w * 0.04, w * 0.1, w * 0.04)),
                       cantidad=0.16, suave=0.6)
        nrm = np.array([-d2[1], d2[0]])
        lz.lapiz([[tuple(hem + nrm * w * 0.42), tuple(hem - nrm * w * 0.42)]], _osc(pantalon, 0.5), grosor=0.45,
                 presion=0.45)
        rng = np.random.default_rng(int(abs(c[0]) * 3 + abs(a[1])))
        _pliegues_tela(lz, c + (k - c) * 0.2, k - (k - c) * 0.2, w, pantalon, rng, n=2)
        lz.lapiz([bezier(c + nrm * w * 0.3, k + nrm * w * 0.3, hem + nrm * w * 0.28, n=14)], _osc(pantalon, 0.6),
                 grosor=0.3, presion=0.2, temblor=0.2, cortes=0.4)
    else:
        piel_c = _hex(F._piel(piel))
        pierna = (Trazo([c, c + (k - c) * 0.5, k], (w * 0.66, w * 0.58, w * 0.44)) |
                  Trazo([k, k + (a - k) * 0.3, k + (a - k) * 0.7, a], (w * 0.43, w * 0.47, w * 0.34, w * 0.25)) |
                  _codo(c, k, a, w * 0.45))
        volumen(lz, pierna, piel_c, luz, dens=0.56, prof=0.45, sombra=F.sombra_piel(piel_c), tapa=tapa, semilla=semilla,
                grosor=0.34, presion=0.26, duro=0.45)
        lz.lapiz([arco(*(k + fuera * w * 0.05), w * 0.14, w * 0.1, 200, 340, 10)], _osc(piel_c, 0.5, '#4a2a2a', 0.4),
                 grosor=0.3, presion=0.25)


def torso3(lz, hi, hd, ci, cd, color, luz, cintura=0.9, escote='redondo', tapa=1, toques=None, pliegues=None,
           semilla=None):
    """figuras_v3.torso3's shirt with the collar where a real one sits: under the smaller
    head the old low neckline left a long bare neck."""
    import figuras_v3 as F
    hi, hd, ci, cd = map(F._v, (hi, hd, ci, cd))
    m = (hi + hd) / 2
    w = np.linalg.norm(hd - hi)
    up = _u(m - (ci + cd) / 2)
    side = _u(hd - hi)
    wi = hi * 0.42 + ci * 0.58
    wd = hd * 0.42 + cd * 0.58
    mc = (wi + wd) / 2
    wi = mc + (wi - mc) * cintura
    wd = mc + (wd - mc) * cintura
    esc = 0.2 if escote == 'v' else 0.07
    pts = [m - side * w * 0.18 + up * w * 0.12, hi + up * w * 0.02, hi - side * w * 0.07 - up * w * 0.1,
           hi - side * w * 0.05 - up * w * 0.34, wi, ci - side * w * 0.02, (ci + cd) / 2 - up * w * 0.03,
           cd + side * w * 0.02, wd, hd + side * w * 0.05 - up * w * 0.34, hd + side * w * 0.07 - up * w * 0.1,
           hd + up * w * 0.02, m + side * w * 0.18 + up * w * 0.12, m + side * w * 0.09 + up * w * (0.12 - esc * 0.7),
           m + up * w * (0.12 - esc), m - side * w * 0.09 + up * w * (0.12 - esc * 0.7)]
    f = Poligono(pts)
    volumen(lz, f, color, luz, dens=0.66, prof=0.5, tapa=tapa, toques=toques, semilla=semilla, rayar=True,
            proyecta=2.5, grosor=0.4, presion=0.3)
    if pliegues:
        lz.lapiz([F.spline(p) if len(p) > 2 else np.asarray(p) for p in pliegues], _osc(color, 0.6), grosor=0.4,
                 presion=0.28, temblor=0.25, puntas=0.45)
    return f, dict(m=m + up * w * 0.1, w=w, up=up, side=side, mc=mc)


def zapato3(lz, tobillo, ang, tam, color, luz, tapa=1, suela='#5a4034', semilla=None):
    """figuras_v3.zapato3's shoe with a sole you can see (a band of its own colour, the toe
    lifting a little off the ground) and the opening at the ankle."""
    import figuras_v3 as F
    t = F._v(tobillo)
    d = F._v([math.cos(math.radians(ang)), math.sin(math.radians(ang))])
    n = F._v([-d[1], d[0]])
    if n[1] < 0:
        n = -n
    P = lambda u, v: t + d * (u * tam) + n * (v * tam)
    f = Poligono([P(-0.2, -0.16), P(0.12, -0.18), P(0.36, -0.02), P(0.62, 0.06), P(0.84, 0.1), P(0.92, 0.2),
                  P(0.86, 0.3), P(0.3, 0.33), P(-0.2, 0.33), P(-0.27, 0.2), P(-0.26, 0.0)])
    volumen(lz, f, color, luz, dens=0.82, prof=0.45, tapa=tapa, rayar=False, grosor=0.35, presion=0.3, semilla=semilla)
    claro = float(np.dot(rgb(color), [0.3, 0.59, 0.11])) > 0.45
    sc = '#d7cdb9' if claro else _hex(mezcla(color, '#1a1210', 0.55))
    g = 0.06
    banda = Poligono([P(-0.25, 0.3), P(0.3, 0.32), P(0.82, 0.28), P(0.86, 0.3 + g * 0.5), P(0.8, 0.28 + g), P(0.3, 0.32 + g),
                      P(-0.24, 0.3 + g)])
    lz.aguada(banda, sc, dens=0.85, tapa=1, borde=0.4, irreg=0.05)
    lz.lapiz([[tuple(P(-0.24, 0.3 + g)), tuple(P(0.3, 0.32 + g)), tuple(P(0.8, 0.28 + g))]], _osc(sc, 0.55), grosor=0.3,
             presion=0.4)
    lz.lapiz([[tuple(P(0.18 + k * 0.08, -0.06 + k * 0.05)), tuple(P(0.24 + k * 0.08, 0.06 + k * 0.05))] for k in range(3)],
             _osc(color, 0.5), grosor=0.38, presion=0.4)
    lz.aguada(Elipse(*P(-0.04, -0.12), tam * 0.14, tam * 0.05, ang), _osc(color, 0.45), dens=0.5, suave=0.3)
    return f


def extremidad(lz, pts, anchos, color, tapa=1, dens=0.6, lapiz=None, toques=None, contorno=True, sombra=None,
               pliegues=False, **kw):
    """Arm, leg or sleeve along the same path as before, painted as a lit cylinder that
    narrows at the joint."""
    pts = [np.asarray(p, np.float64) for p in pts]
    if len(pts) == 3:
        an = list(anchos) if len(anchos) == 3 else [anchos[0], (anchos[0] + anchos[-1]) / 2, anchos[-1]]
        sh, el, wr = pts
        d1 = _u(el - sh)
        # the deltoid / thigh tapers into the shoulder or hip instead of ending in a ball; the joint is
        # narrower; the forearm / calf swells below it; a slim wrist / ankle
        f = (Trazo([sh - d1 * an[0] * 0.18, sh + (el - sh) * 0.25, sh + (el - sh) * 0.7, el],
                   (an[0] * 0.72, an[0] * 1.04, an[1] * 1.0, an[1] * 0.88), suave=True) |
             Trazo([el, el + (wr - el) * 0.3, el + (wr - el) * 0.75, wr], (an[1] * 0.9, an[1] * 0.98, an[2] * 0.86,
                                                                          an[2] * 0.72), suave=True))
    else:
        an = list(anchos)
        f = Trazo([tuple(p) for p in pts], an)
    es_piel = isinstance(color, str) and color.startswith('piel')
    if len(pts) == 3:
        f = f | _codo(pts[0], pts[1], pts[2], an[1])
    volumen(lz, f, color, _LUZ_ESCENA[0], dens=max(0.55, dens * 0.9), prof=0.5, tapa=tapa, toques=toques,
            espesor=max(an) * 0.5, proyecta=2.5, grosor=0.38, presion=0.3, rayar=not es_piel)
    if len(pts) == 3 and not es_piel:
        _pliegues_v(lz, pts[0], pts[1], pts[2], an[1], color)
    if not es_piel:
        rng = np.random.default_rng(int(abs(pts[0][0]) * 7 + abs(pts[-1][1]) * 3))
        for i in range(len(pts) - 1):
            _pliegues_tela(lz, pts[i], pts[i + 1], an[min(i, len(an) - 1)], color, rng, n=3)
    if pliegues and len(pts) == 3:
        p0, p1, p2 = pts
        u = _u(p0 - p1)
        v = _u(p2 - p1)
        b = u + v
        if np.linalg.norm(b) > 0.2:
            b = _u(b)
            w = an[1]
            perp = np.array([-b[1], b[0]])
            tr = []
            for k, o in enumerate((0.15, 0.32)):
                c = p1 + b * w * o
                tr.append(bezier(c - perp * w * 0.26, c + b * w * 0.08, c + perp * w * 0.26, n=10))
            lz.lapiz(tr, _osc(color, 0.5), grosor=0.3, presion=0.3, temblor=0.1, puntas=0.4)
            lz.aguada(Elipse(*(p1 + b * w * 0.25), w * 0.35, w * 0.18, math.degrees(math.atan2(perp[1], perp[0]))),
                      _osc(color, 0.6), dens=0.25, suave=w * 0.12)
    return f


def torso(lz, hi, hd, ci, cd, color, cuello=None, escote=0.3, tapa=1, toques=None, lapiz=None, pliegues=True,
          luz=None, **kw):
    """acuarela.torso's shirt from the same shoulders and hips, with a body inside it: the
    trapezius sloping from the neck to the shoulder, the chest, a waist, the hips; the
    clavicles where the neckline is open; cloth creases instead of loose pencil marks."""
    hi, hd, ci, cd = (np.asarray(p, np.float64) for p in (hi, hd, ci, cd))
    m = (hi + hd) / 2
    w = float(np.linalg.norm(hd - hi))
    lado = _u(hd - hi)
    abajo = _u((ci + cd) / 2 - m)
    # the deep neckline was there to meet the old big round head; under a head of real size it
    # left a long bare column of neck, so the neckline sits where a real one does
    escote = min(escote, 0.55)
    izq = [m - lado * w * 0.17 - abajo * w * 0.07, hi + abajo * w * 0.07, hi - lado * w * 0.06 + abajo * w * 0.22,
           hi + (ci - hi) * 0.42 - lado * w * 0.04, hi + (ci - hi) * 0.72 + lado * w * 0.05, ci - lado * w * 0.02]
    der = [m + lado * w * 0.17 - abajo * w * 0.07, hd + abajo * w * 0.07, hd + lado * w * 0.06 + abajo * w * 0.22,
           hd + (cd - hd) * 0.42 + lado * w * 0.04, hd + (cd - hd) * 0.72 - lado * w * 0.05, cd + lado * w * 0.02]
    pts = izq + [(ci + cd) / 2 + abajo * w * 0.04] + der[::-1] + [m + lado * w * 0.1 + abajo * w * (escote * 0.2 - 0.05),
                                                                   m + abajo * w * (escote * 0.3 - 0.04),
                                                                   m - lado * w * 0.1 + abajo * w * (escote * 0.2 - 0.05)]
    f = Poligono([tuple(p) for p in pts])
    volumen(lz, f, color, _LUZ_ESCENA[0], dens=0.72, prof=0.5, tapa=tapa, toques=toques, espesor=w * 0.4,
            proyecta=2.5, grosor=0.4, presion=0.3, rayar=True)
    piel_l = '#8a5a48'
    for sd in (-1, 1):
        lz.lapiz([[tuple(m + lado * sd * w * 0.05 + abajo * w * 0.05), tuple(m + lado * sd * w * 0.16 + abajo * w * 0.03),
                   tuple(m + lado * sd * w * 0.26 + abajo * w * 0.05)]], piel_l, grosor=0.28, presion=0.2, temblor=0.05,
                 puntas=0.5)
    if pliegues:
        rng = np.random.default_rng(int(abs(hi[0]) * 5 + abs(cd[1])))
        _pliegues_tela(lz, (hi + ci) / 2 + (hd - hi) * 0.12, (hd + cd) / 2 - (hd - hi) * 0.12, w * 0.6, color, rng, n=3)
        _pliegues_tela(lz, hi + (ci - hi) * 0.75 + lado * w * 0.1, hd + (cd - hd) * 0.75 - lado * w * 0.1, w * 0.4, color,
                       rng, n=2)
    return f


def _cuello(lz, x, y, r, piel, base, ancho_base, giro, inclina, luz, nino, ancho=None, prof=0.42):
    """A neck that reads as one: as wide as about 60 % of the face (45 % in a child), a short
    column under the jaw that opens in two curves (the trapezius) into the shoulders, the
    jaw's shadow cast across its top, the clavicles where the neckline is open. ancho / prof:
    the column's width and the depth of its shading, when a head other than cabeza_real sits on it
    (retrato.cuello_natural); by default 0.68 r and 0.42."""
    bx, by = base
    piel_c = _hex(piel)
    a = math.radians(inclina)
    kc = 1.08 if nino else 1.0
    xt = x - math.sin(a) * r * 0.55 + giro * r * 0.08
    yt = y + r * 0.45
    w0 = ancho if ancho is not None else r * (0.66 if nino else 0.68)
    w1 = min(ancho_base * 0.62, r * 1.4)
    yb = by + r * 0.05
    pts = [(xt - w0 / 2, yt), (xt - w0 * 0.5, yt + (yb - yt) * 0.6), (bx - w0 * 0.54, yb - r * 0.02),
           (bx - w1 * 0.5, yb + r * 0.12), (bx - w1 * 0.7, yb + r * 0.3), (bx - w1 * 0.6, yb + r * 0.6),
           (bx, yb + r * 0.7), (bx + w1 * 0.6, yb + r * 0.6), (bx + w1 * 0.7, yb + r * 0.3), (bx + w1 * 0.5, yb + r * 0.12),
           (bx + w0 * 0.54, yb - r * 0.02), (xt + w0 * 0.5, yt + (yb - yt) * 0.6), (xt + w0 / 2, yt)]
    f = Poligono(pts)
    volumen(lz, f, piel_c, luz, dens=0.55 + 0.2 * (1 - float(np.dot(rgb(piel_c), [0.3, 0.59, 0.11]))), prof=prof,
            espesor=w0 * 0.5, brillo=0.0, reflejo=0.06, linea=False, duro=0.4)
    lz.aguada(f, _osc(piel_c, 0.9, '#a05a50', 0.2), dens=0.1, borde=0.5, irreg=1.0, gran=0.6, var=0.6)
    # the jaw's shadow on the top of the neck: a soft wash a little darker than the skin, only on the neck,
    # fading downward (a hard ellipse wider than the neck read as a collar)
    cxs = x - math.sin(a) * kc * r + giro * r * 0.08
    cy = y + math.cos(a) * kc * r
    sombra = f & Poligono([(cxs - w0, cy - r * 0.3), (cxs + w0, cy - r * 0.3), (cxs + w0, cy + r * 0.2),
                           (cxs - w0, cy + r * 0.2)], suave=False)
    lz.aguada(sombra, _osc(piel_c, 0.72, '#5a3020', 0.28), dens=0.42, suave=0.6, gran=0.2,
              desvanece=(cxs, cy - r * 0.05, cxs, cy + r * 0.22))
    # the two neck muscles meeting at the pit of the throat, faint
    lz.lapiz([bezier((xt - w0 * 0.38, yt + (yb - yt) * 0.4), (bx - w0 * 0.2, yb - r * 0.1), (bx - r * 0.03, yb + r * 0.02), n=8),
              bezier((xt + w0 * 0.38, yt + (yb - yt) * 0.4), (bx + w0 * 0.2, yb - r * 0.1), (bx + r * 0.03, yb + r * 0.02), n=8)],
             _osc(piel_c, 0.62, '#4a2a2a', 0.35), grosor=0.22, presion=0.09, temblor=0.05, cortes=0.5, puntas=0.5)
    lp = _osc(piel_c, 0.55, '#4a2a2a', 0.4)
    lz.lapiz([bezier((bx - r * 0.08, yb + r * 0.04), (bx - r * 0.3, yb - r * 0.02), (bx - r * 0.56, yb + r * 0.05), n=10),
              bezier((bx + r * 0.08, yb + r * 0.04), (bx + r * 0.3, yb - r * 0.02), (bx + r * 0.56, yb + r * 0.05), n=10)],
             lp, grosor=0.28, presion=0.16, temblor=0.1, cortes=0.35)
    return f


def cuello_natural(lz, x, y, r, piel, base, ancho_base, giro=0.0, inclina=0.0, escote=True):
    """acuarela.cuello_natural's neck (figura), painted as _cuello."""
    return _cuello(lz, x, y, r, piel, base, ancho_base, giro, inclina, _LUZ_ESCENA[0], nino=False)


def cuello3(lz, cabeza_xy, r, base, piel, luz, ancho_base=None, giro=0.0, inclina=0.0):
    """figuras_v3.cuello3's neck, painted as _cuello (children by size: r <= 25)."""
    x, y = cabeza_xy
    return _cuello(lz, x, y, r, piel, base, ancho_base or r * 2.3, giro, inclina, luz, nino=r <= 25)


# ---------------------------------------------------------------- small people in the middle distance

def nuca(lz, x, y, r, pelo, piel='piel3', luz=None, peinado='corto', semilla=None):
    """A head seen from behind (centre x, y; r = half its height): hair over the back of
    the skull, the ears just showing, the nape of the neck."""
    luz = luz if luz is not None else _LUZ_ESCENA[0]
    rng = np.random.default_rng(semilla if semilla is not None else int(x * 3 + y * 5))
    col = _hex(pelo)
    skin = _hex(piel)
    w = r * 0.8
    for sd in (-1, 1):
        lz.aguada(Elipse(x + sd * w * 0.98, y + r * 0.12, w * 0.16, r * 0.24), skin, dens=0.6, tapa=1, irreg=0.1)
    cuello = Trazo([(x, y + r * 0.6), (x, y + r * 1.25)], (w * 0.9, w * 1.0))
    volumen(lz, cuello, skin, luz, dens=0.55, prof=0.45, linea=False, brillo=0.0, reflejo=0.1, duro=0.4)
    largo = {'corto': 0.62, 'mono': 0.55, 'largo': 1.3, 'rizado': 0.95}.get(peinado, 0.62)
    masa = Poligono([(x - w * 1.02, y - r * 0.1), (x - w * 0.8, y - r * 0.82), (x, y - r * 1.04), (x + w * 0.8, y - r * 0.82),
                     (x + w * 1.02, y - r * 0.1), (x + w * 0.88, y + r * largo), (x, y + r * (largo + 0.06)),
                     (x - w * 0.88, y + r * largo)])
    volumen(lz, masa, col, luz, dens=0.85, prof=0.5, espesor=w * 0.6, brillo=0.2, reflejo=0.12, linea=True, grosor=0.25,
            presion=0.25, irreg=0.7, gran=0.4, duro=0.4)
    osc = _osc(col, 0.5, '#120808', 0.3)
    hebras = [bezier((x + rng.uniform(-0.3, 0.3) * w, y - r * 0.9), (x + rng.uniform(-0.9, 0.9) * w, y),
                     (x + rng.uniform(-0.9, 0.9) * w, y + r * largo * 0.9), n=8) for k in range(10)]
    lz.lapiz(hebras, osc, grosor=0.2, presion=0.25, temblor=0.03, puntas=0.5)
    if peinado == 'mono':
        volumen(lz, Elipse(x + w * 0.1, y - r * 0.7, w * 0.42, r * 0.36), col, luz, dens=0.88, prof=0.5, brillo=0.2,
                linea=False)


def persona_espalda(lz, x, y_pies, alto, ropa, pelo, pantalon='#4a5a7a', sentado=False, brazo=None, piel='piel3',
                    peinado='corto', nino=None, zapato='#6a4434'):
    """A person of total height `alto` seen from behind, standing (feet at y_pies) or sitting
    on the ground: legs, back with shoulders and shoulder blades, arms, the head from behind.
    brazo = (x, y) where a raised hand goes. Returns the top of the head."""
    luz = _LUZ_ESCENA[0]
    nino = (alto < 75) if nino is None else nino
    cab = alto / (5.6 if nino else 7.2)               # head height
    r = cab / 2
    hombro_w = cab * (1.55 if nino else 2.0)
    if sentado:
        cadera_y = y_pies - alto * 0.02
        base = Poligono([(x - hombro_w * 0.95, y_pies), (x - hombro_w * 0.8, y_pies - cab * 0.55), (x, y_pies - cab * 0.7),
                         (x + hombro_w * 0.8, y_pies - cab * 0.55), (x + hombro_w * 0.95, y_pies)])
        volumen(lz, base, pantalon, luz, dens=0.8, prof=0.5, espesor=cab * 0.3, proyecta=2.0, duro=0.5)
        hombro_y = cadera_y - cab * (1.9 if nino else 2.3)
    else:
        cadera_y = y_pies - alto * 0.47
        for sd in (-1, 1):
            pierna = Trazo([(x + sd * hombro_w * 0.2, cadera_y), (x + sd * hombro_w * 0.2, cadera_y + (y_pies - cadera_y) * 0.5),
                            (x + sd * hombro_w * 0.17, y_pies - cab * 0.08)], (cab * 0.62, cab * 0.5, cab * 0.34))
            volumen(lz, pierna, pantalon, luz, dens=0.82, prof=0.5, espesor=cab * 0.3, proyecta=2.0, duro=0.5,
                    grosor=0.25, presion=0.25)
            zap = Elipse(x + sd * hombro_w * 0.19, y_pies - cab * 0.05, cab * 0.3, cab * 0.15)
            volumen(lz, zap, zapato, luz, dens=0.88, prof=0.45, linea=False, duro=0.5)
        hombro_y = cadera_y - cab * (1.75 if nino else 2.35)
    espalda_f = Poligono([(x - hombro_w * 0.42, cadera_y), (x - hombro_w * 0.46, cadera_y - cab * 0.6),
                          (x - hombro_w * 0.5, hombro_y + cab * 0.35), (x - hombro_w * 0.42, hombro_y + cab * 0.05),
                          (x - cab * 0.3, hombro_y - cab * 0.08), (x + cab * 0.3, hombro_y - cab * 0.08),
                          (x + hombro_w * 0.42, hombro_y + cab * 0.05), (x + hombro_w * 0.5, hombro_y + cab * 0.35),
                          (x + hombro_w * 0.46, cadera_y - cab * 0.6), (x + hombro_w * 0.42, cadera_y)])
    for sd in (-1, 1):                                  # arms hanging, unless one is raised
        if brazo is not None and sd == -1:
            continue
        b = Trazo([(x + sd * hombro_w * 0.44, hombro_y + cab * 0.2), (x + sd * hombro_w * 0.52, hombro_y + cab * 1.3),
                   (x + sd * hombro_w * 0.5, hombro_y + cab * 2.3)], (cab * 0.42, cab * 0.36, cab * 0.3))
        volumen(lz, b, ropa, luz, dens=0.82, prof=0.5, espesor=cab * 0.2, duro=0.5, grosor=0.25, presion=0.25)
    volumen(lz, espalda_f, ropa, luz, dens=0.82, prof=0.5, espesor=hombro_w * 0.35, proyecta=2.0, duro=0.5, grosor=0.3,
            presion=0.28)
    lz.lapiz([bezier((x, hombro_y + cab * 0.1), (x + cab * 0.05, hombro_y + cab * 0.9), (x, cadera_y - cab * 0.2), n=10)],
             _osc(ropa, 0.55), grosor=0.25, presion=0.2, temblor=0.05)     # the spine under the shirt
    if brazo is not None:
        s0 = (x - hombro_w * 0.44, hombro_y + cab * 0.2)
        codo = (s0[0] + (brazo[0] - s0[0]) * 0.5 - cab * 0.2, s0[1] + (brazo[1] - s0[1]) * 0.5 + cab * 0.15)
        b = Trazo([s0, codo, brazo], (cab * 0.42, cab * 0.36, cab * 0.28))
        volumen(lz, b, ropa, luz, dens=0.82, prof=0.5, espesor=cab * 0.2, duro=0.5, grosor=0.25, presion=0.25)
        lz.aguada(Elipse(brazo[0], brazo[1] - cab * 0.12, cab * 0.17, cab * 0.22), piel, dens=0.7, tapa=1)
    cy = hombro_y - cab * 0.62
    nuca(lz, x, cy, r, pelo, piel, luz, peinado)
    return (x, cy - r)


def activar(luz, *modulos, lineas=None):
    """Swap the realistic painters into acuarela, figuras_v3, extra_m678 and any other
    module given (the ones that imported the old names by name). lineas: optional factor
    (<1) that softens every pencil outline of the run. Returns a function that undoes it."""
    _LUZ_ESCENA[0] = luz
    import figuras_v3
    import extra_m678
    cambios = []

    def pon(mod, nombre, f):
        if hasattr(mod, nombre):
            cambios.append((mod, nombre, getattr(mod, nombre)))
            setattr(mod, nombre, f)
    for mod in (A, figuras_v3, extra_m678) + tuple(modulos):
        pon(mod, 'modelar', modelar)
        pon(mod, 'cabeza3', cabeza3)
        pon(mod, 'cabeza', cabeza)
        pon(mod, 'mano2', mano2)
        pon(mod, 'mano', mano)
        pon(mod, 'extremidad', extremidad)
        pon(mod, 'torso', torso)
        pon(mod, 'cuello_natural', cuello_natural)
        pon(mod, 'cuello3', cuello3)
        pon(mod, 'brazo3', brazo3)
        pon(mod, 'zapato3', zapato3)
        pon(mod, 'torso3', torso3)
        pon(mod, 'pierna3', pierna3)
    # acuarela.figura's neck: the old default was a tube (extremidad); the realistic one is _cuello
    cambios.append((A, 'CUELLO_NATURAL', getattr(A, 'CUELLO_NATURAL', False)))
    A.CUELLO_NATURAL = True
    if lineas is not None:
        orig = A.Lienzo.contorno

        def contorno(self, forma, color='lapiz_sepia', grosor=1.0, presion=0.7, *a, **k):
            return orig(self, forma, color, grosor * (0.5 + 0.5 * lineas), presion * lineas, *a, **k)
        cambios.append((A.Lienzo, 'contorno', orig))
        A.Lienzo.contorno = contorno

    def deshacer():
        for (mod, nombre, f) in reversed(cambios):
            setattr(mod, nombre, f)
    return deshacer
