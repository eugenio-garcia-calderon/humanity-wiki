"""
retrato.py -- a realistic face painted in watercolour from a real face's 3D structure
(2026-11-16).

Eugenio, after design 6: «quiero caras y cuerpos realistas, quiero diseños no tan
abstractos y creepes» … «hazlo que sea realista, pero utilizan esta suscripcion sin gastar
dinero, apañatelas, hazlo solo de la cara de la bailarina del diseño de Arte, para
simplificar, y luego vemos resultados».

Everything figuras_real could do was build a face out of an ellipsoid and a few bumps:
that is why its people read as dolls. Here the face is MediaPipe's canonical 3D face
mesh (datos/canonical_face_model.obj, 468 points, a real adult face): brow ridge, eye
sockets, cheekbones, the nose's bridge and wings, the lips' shapes and the jaw are where
they are on a person. It is posed (turn, tilt, looking up), given an expression (a smile,
the lips closed or just parted), narrowed at the sides to a real 13 cm across, closed at the
top and back by a skull fitted to it, rendered to normals and depth, and then PAINTED with the watercolour
engine: the light from the scene's sun as glazes, the hollows (sockets, the corners of the
nose and mouth, under the lip) from the depth, warm cheeks, nose and ears, the eyes, brows,
lips and nostrils drawn on the mesh's own landmarks; the hair, the bun and the ear are
placed in the same 3D frame, so they turn with the head. No image generator, no cost.

    cabeza_retrato(lz, x, y, r, ...)   same placement as figuras_real.cabeza_real
    cabeza, cuello_natural             drop-ins for acuarela.figura's head and neck (one figure
                                       at a time: see personajes_real.bailarina(retrato=True))
"""
from __future__ import annotations

import math
import os

import cv2
import numpy as np

import figuras_real as FR
from acuarela import Elipse, Poligono, Trazo, arco, bezier, mezcla, rgb, _ss
from figuras_real import (_Cabeza, _hex, _osc, _cla, _u, _masc, _veladura, _escalones, _levanta, _borde_sombra)

_AQUI = os.path.dirname(os.path.abspath(__file__))

# MediaPipe face-mesh landmark rings (subject's right = negative x = the left of the picture)
LABIO_SUP_EXT = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291]
LABIO_INF_EXT = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291]
LABIO_SUP_INT = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308]
LABIO_INF_INT = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308]
OJO_D_SUP = [33, 246, 161, 160, 159, 158, 157, 173, 133]
OJO_D_INF = [33, 7, 163, 144, 145, 153, 154, 155, 133]
OJO_I_SUP = [263, 466, 388, 387, 386, 385, 384, 398, 362]
OJO_I_INF = [263, 249, 390, 373, 374, 380, 381, 382, 362]
PLIEGUE_D = [113, 225, 224, 223, 222, 221, 189]
PLIEGUE_I = [342, 445, 444, 443, 442, 441, 413]
CEJA_D_SUP = [70, 63, 105, 66, 107]
CEJA_D_INF = [46, 53, 52, 65, 55]
CEJA_I_SUP = [300, 293, 334, 296, 336]
CEJA_I_INF = [276, 283, 282, 295, 285]
OVALO = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149,
         150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]


def _malla():
    V, F = [], []
    with open(os.path.join(_AQUI, 'datos', 'canonical_face_model.obj')) as fh:
        for l in fh:
            if l.startswith('v '):
                V.append([float(t) for t in l.split()[1:4]])
            elif l.startswith('f '):
                F.append([int(t.split('/')[0]) - 1 for t in l.split()[1:4]])
    return np.array(V, np.float64), np.array(F, np.int64)


def _expresion(V, sonrisa=0.0, abre=0.0, ojos=1.0, femenina=True):
    """A smile (corners of the mouth up and out, the cheeks lifting) and the lips parting
    (the lower lip and the chin a little down), the eyes opened a little wider than the
    mesh's relaxed ones, and (femenina) a shorter lower face with a softer, narrower jaw."""
    V = V.copy()
    # the canonical face is wide at the sides (15.3 cm at the ears): keep the eyes, nose and mouth
    # and bring the sides in, to a real 13.5 cm across the cheekbones
    u = np.abs(V[:, 0])
    V[:, 0] = np.sign(V[:, 0]) * (u - 0.038 * np.clip(u - 3.0, 0, None) ** 2)
    if femenina:
        t = np.clip((-V[:, 1] - 0.5) / 8.9, 0, 1)            # 0 at the cheekbones, 1 at the chin
        V[:, 1] = np.where(V[:, 1] < -1.0, -1.0 + (V[:, 1] + 1.0) * 0.93, V[:, 1])
        V[:, 0] *= 1 - 0.26 * t ** 1.3
    if femenina:
        for sx in (-1, 1):                                    # brows a little higher and arched at the outer end
            w = np.exp(-(((V[:, 0] - sx * 3.6) / 2.2) ** 2 + ((V[:, 1] - 5.0) / 1.0) ** 2))
            V[:, 1] += 0.45 * w * np.clip(np.abs(V[:, 0]) / 4.5, 0.3, 1.0)
        cn = np.array([0.0, -0.9, 6.6])                       # a smaller nose
        w = np.exp(-(((V[:, 0] - cn[0]) / 1.6) ** 2 + ((V[:, 1] - cn[1]) / 2.6) ** 2))
        V = V + (cn - V) * (0.1 * w)[:, None]
        cl = np.array([0.0, -4.35])                           # fuller lips
        w = np.exp(-(((V[:, 0] - cl[0]) / 2.6) ** 2 + ((V[:, 1] - cl[1]) / 0.9) ** 2))
        V[:, 1] += (V[:, 1] - cl[1]) * 0.26 * w
        V[:, 2] += 0.12 * w
    for (cx, cy) in ((-3.18, 2.62), (3.18, 2.62)):           # the eyes: the upper lid up, the lower a touch down
        dx = (V[:, 0] - cx) / 1.6
        dy = V[:, 1] - cy
        w = np.exp(-dx * dx) * (np.abs(dy) < 1.2)
        V[:, 1] += np.where(dy > 0, 0.42 * ojos * w * np.exp(-(dy / 0.5) ** 2), -0.05 * ojos * w * np.exp(-(dy / 0.4) ** 2))

    def campana(c, s):
        d = np.linalg.norm(V[:, :2] - np.asarray(c)[None, :], axis=1)
        return np.exp(-(d / s) ** 2)
    for sx in (-1, 1):
        w = campana((sx * 2.5, -4.1), 1.0)                      # the corners: up, out and back
        V[:, 0] += sx * 0.4 * sonrisa * w
        V[:, 1] += 1.0 * sonrisa * w
        V[:, 2] -= 0.3 * sonrisa * w
        w2 = campana((sx * 3.2, -1.6), 1.8)                      # the cheeks lift with the smile
        V[:, 1] += 0.25 * sonrisa * w2
        V[:, 2] += 0.15 * sonrisa * w2
    # the mesh's lips are parted half a centimetre: close them first, then part them by abre
    w4 = np.exp(-(V[:, 0] / 2.4) ** 2 - ((V[:, 1] + 4.27) / 0.8) ** 2)
    V[:, 1] -= np.sign(V[:, 1] + 4.27) * 0.3 * w4
    w3 = campana((0, -6.6), 3.0) * (V[:, 1] < -4.3)
    V[:, 1] -= 0.55 * abre * w3
    return V


# The skull as an ellipsoid fitted to the face mesh: through its upper edge (the top of the
# forehead, (0, 8.26, 4.48)) and its sides by the ears ((+-6.83, 0.67, -2.44) once _expresion has
# narrowed them), the crown about
# 11.5 cm above the eyes, about 19 cm from the brow to the back of the head. Above the mesh it
# carries the forehead on up to the hairline.
CRANEO_C = np.array([0.0, 3.92, -4.0])
CRANEO_R = np.array([7.33, 10.08, 9.4])
MONO = np.array([0.0, 13.6, -8.2])                          # a dancer's bun, high on the back of the head


def _craneo(nu=64, nv=36):
    """The back and top of the head (CRANEO_C/CRANEO_R) as a mesh in the face mesh's frame
    (cm), only above the jaw (below that the neck takes over). Where it overlaps the face
    the face wins: cabeza_retrato pushes it 1.5 cm back for the depth test only, so the two
    never leave a gap at their seam and the skull shows at the temples, above the forehead
    and, in three-quarter view, at the back of the head."""
    c, rad = CRANEO_C, CRANEO_R
    th = np.linspace(0, np.pi, nv)
    ph = np.linspace(-np.pi, np.pi, nu, endpoint=False)
    T, Pp = np.meshgrid(th, ph, indexing='ij')
    n = np.stack([np.sin(T) * np.sin(Pp), np.cos(T), np.sin(T) * np.cos(Pp)], -1).reshape(-1, 3)
    V = c + n * rad
    N = n / rad
    N /= np.linalg.norm(N, axis=1, keepdims=True)
    F = []
    for i in range(nv - 1):
        for j in range(nu):
            a, b = i * nu + j, i * nu + (j + 1) % nu
            c_, d = (i + 1) * nu + j, (i + 1) * nu + (j + 1) % nu
            F += [[a, c_, b], [b, c_, d]]
    F = np.array(F)
    tri = V[F]
    cen = tri.mean(axis=1)
    # below the jaw line the neck takes over; everywhere else the skull stays whole, and the face
    # wins over it in the depth test (see cabeza_retrato), so no gap opens at their seam
    baja = (tri.min(axis=1)[:, 1] < -1.2) & (cen[:, 2] > -6.0) | (tri.min(axis=1)[:, 1] < -2.5)
    return V, N, F[~baja]


def _frente_z(x_, y_):
    """z of the skull's front surface at (x, y) in the face mesh's frame (cm)."""
    c, r = CRANEO_C, CRANEO_R
    q = 1 - (np.asarray(x_) / r[0]) ** 2 - ((np.asarray(y_) - c[1]) / r[1]) ** 2
    return c[2] + r[2] * np.sqrt(np.clip(q, 0, 1))


def _normales_vertices(V, F):
    n = np.zeros_like(V)
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    for k in range(3):
        np.add.at(n, F[:, k], fn)
    n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
    if n[1, 2] < 0:                                           # the nose tip must face the viewer
        n = -n
    return n


def _rasteriza(P, Z, N, F, x0, y0, w, h, A=None):
    """Z-buffered triangles in a pixel crop: depth, interpolated normals and (A) any
    per-vertex attribute -- here the point's position in the head's own frame."""
    zb = np.full((h, w), -1e9, np.float32)
    nb = np.zeros((h, w, 3), np.float32)
    ab = np.zeros((h, w, 3), np.float32) if A is not None else None
    for (a, b, c) in F:
        pa, pb, pc = P[a], P[b], P[c]
        xmin = int(max(0, math.floor(min(pa[0], pb[0], pc[0])) - x0))
        xmax = int(min(w - 1, math.ceil(max(pa[0], pb[0], pc[0])) - x0))
        ymin = int(max(0, math.floor(min(pa[1], pb[1], pc[1])) - y0))
        ymax = int(min(h - 1, math.ceil(max(pa[1], pb[1], pc[1])) - y0))
        if xmax < xmin or ymax < ymin:
            continue
        xs = np.arange(xmin, xmax + 1) + x0 + 0.5
        ys = np.arange(ymin, ymax + 1) + y0 + 0.5
        X, Y = np.meshgrid(xs, ys)
        d = (pb[1] - pc[1]) * (pa[0] - pc[0]) + (pc[0] - pb[0]) * (pa[1] - pc[1])
        if abs(d) < 1e-9:
            continue
        l1 = ((pb[1] - pc[1]) * (X - pc[0]) + (pc[0] - pb[0]) * (Y - pc[1])) / d
        l2 = ((pc[1] - pa[1]) * (X - pc[0]) + (pa[0] - pc[0]) * (Y - pc[1])) / d
        l3 = 1 - l1 - l2
        dentro = (l1 >= -1e-4) & (l2 >= -1e-4) & (l3 >= -1e-4)
        if not dentro.any():
            continue
        z = l1 * Z[a] + l2 * Z[b] + l3 * Z[c]
        sub = zb[ymin:ymax + 1, xmin:xmax + 1]
        mejor = dentro & (z > sub)
        sub[mejor] = z[mejor]
        nn = l1[..., None] * N[a] + l2[..., None] * N[b] + l3[..., None] * N[c]
        nsub = nb[ymin:ymax + 1, xmin:xmax + 1]
        nsub[mejor] = nn[mejor]
        if ab is not None:
            aa = l1[..., None] * A[a] + l2[..., None] * A[b] + l3[..., None] * A[c]
            asub = ab[ymin:ymax + 1, xmin:xmax + 1]
            asub[mejor] = aa[mejor]
    cubre = zb > -1e8
    nb /= np.linalg.norm(nb, axis=2, keepdims=True) + 1e-9
    if ab is not None:
        return zb, nb, cubre, ab
    return zb, nb, cubre


def _pose(G, V, alza, s):
    """The head's turn (G's), lift (alza, degrees) and tilt, and the projection of points of
    the face mesh's frame (cm) onto the sheet, with the chin (landmark 152 of V) on G's chin.
    Returns (R3, k = sheet units per cm, tilt in radians, proyecta(points, normals) ->
    (sheet points, depth in px, sheet normals))."""
    ty = G.sg * G.tg                                         # turn about the vertical
    px_ = math.radians(alza)                                 # lift (look up)
    Ry = np.array([[math.cos(ty), 0, math.sin(ty)], [0, 1, 0], [-math.sin(ty), 0, math.cos(ty)]])
    Rx = np.array([[1, 0, 0], [0, math.cos(px_), math.sin(px_)], [0, -math.sin(px_), math.cos(px_)]])
    R3 = Ry @ Rx
    k = G.b2 / 12.0                                          # eyes to chin = 12 cm = the head's lower half
    th = math.radians(G.inc) if hasattr(G, 'inc') else 0.0
    ca, sa = math.cos(th), math.sin(th)
    menton = np.array(G.Q(0.0, 1.0))
    chin_r = (V[152] @ R3.T)[:2]

    def proyecta(VV, NN):
        Vr = VV @ R3.T
        Nr = NN @ R3.T
        rel = (Vr[:, :2] - chin_r) * k
        Xs = menton[0] + ca * rel[:, 0] - sa * (-rel[:, 1])
        Ys = menton[1] + sa * rel[:, 0] + ca * (-rel[:, 1])
        Ns = np.stack([ca * Nr[:, 0] + sa * Nr[:, 1], sa * Nr[:, 0] - ca * Nr[:, 1], Nr[:, 2]], 1)
        return np.stack([Xs, Ys], 1), Vr[:, 2] * k * s, Ns
    return R3, k, th, proyecta


def _cabeza_g(x, y, r, giro, inclina):
    G = _Cabeza(x, y, r, giro, inclina, 'adulto')
    G.a2 = G.b2 / 12.0 * 6.85                                # the portrait's own width (13.5 cm across)
    G.E = dict(G.E, vh=-0.44)
    G.inc = inclina
    return G


def cuello_natural(lz, x, y, r, piel, base, ancho_base, giro=0.0, inclina=0.0, escote=True):
    """The neck for a portrait head (in place of acuarela.cuello_natural while that figure is
    painted): figuras_real's neck, with its top where this head's jaw really is -- a column of
    about 9 cm under the skull's centre, behind the chin, its top hidden behind the jaw -- so no
    part of it shows beside the narrower face."""
    G = _cabeza_g(x, y, r, giro, inclina)
    V, _ = _malla()
    V = _expresion(V, 0.5, 0.0)
    R3, k, th, proyecta = _pose(G, V, 0.0, lz.s)
    top = proyecta(np.array([[0.0, -4.6, -3.0]]), np.array([[0, 0, 1.0]]))[0][0]
    # figuras_real._cuello puts the top at x - sin(a) r 0.55 + giro r 0.08, y + 0.45 r: shift (x, y) to land it on top
    a = math.radians(inclina)
    x_ = top[0] + math.sin(a) * r * 0.55 - giro * r * 0.08
    y_ = top[1] - r * 0.45
    # about 9 cm across (_cuello's own 0.68 r was sized for the old, wider heads), and its shadow side
    # no darker than the cheek's
    return FR._cuello(lz, x_, y_, r, piel, base, ancho_base, giro, inclina, FR._LUZ_ESCENA[0], nino=False,
                      ancho=r * 0.54, prof=0.3)


def cabeza_retrato(lz, x, y, r, piel='piel3', pelo='#1e1410', peinado='mono', luz=None, giro=0.0, inclina=0.0,
                   alza=0.0, mira=(0.0, 0.0), sonrisa=0.6, abre=0.35, adorno=None, iris='#3a2418', pendiente=None,
                   semilla=None):
    """A realistic adult head painted from the 3D face, placed like figuras_real.cabeza_real
    (the chin where the old head of radius r centred at (x, y) had it). giro turns it (+ to the
    viewer's right), inclina tilts it in the picture (degrees), alza lifts the face (degrees:
    she looks up), mira = gaze in the picture (-1..1 left/right, -1..1 up/down)."""
    s = lz.s
    luz = luz if luz is not None else FR._LUZ_ESCENA[0]
    G = _cabeza_g(x, y, r, giro, inclina)
    E = G.E
    rng = np.random.default_rng(semilla if semilla is not None else int(x * 7 + y * 13) % 100000)
    skin = _hex(piel)
    pelo_c = _hex(pelo)
    lx, ly = _u(luz)
    a2, b2 = G.a2, G.b2

    # ---- the face: pose, expression, projection onto the sheet
    V, F = _malla()
    V = _expresion(V, sonrisa, abre, ojos=1.0 + 0.8 * max(0.0, -mira[1]))   # looking up lifts the upper lids
    Nv = _normales_vertices(V, F)
    Vc, Nc, Fc = _craneo()
    R3, k, th, proyecta = _pose(G, V, alza, s)
    ca, sa = math.cos(th), math.sin(th)
    Pu, Zp, Nsheet = proyecta(V, Nv)
    Pcu, Zc, Ncs = proyecta(Vc, Nc)
    L = lambda i: (float(Pu[i, 0]), float(Pu[i, 1]))
    anillo = lambda ids: [L(i) for i in ids]

    # ---- pixel crop round the whole head; the face and the skull share one depth buffer
    todos = np.vstack([Pu, Pcu])
    pad = int(r * 0.5 * s) + 6
    x0 = int(max(0, todos[:, 0].min() * s - pad)); x1 = int(min(lz.W, todos[:, 0].max() * s + pad))
    y0 = int(max(0, todos[:, 1].min() * s - pad)); y1 = int(min(lz.H, todos[:, 1].max() * s + pad))
    w_, h_ = x1 - x0, y1 - y0
    PP = np.vstack([Pu, Pcu]) * s
    ZZ = np.concatenate([Zp, Zc - 1.5 * k * s])                # the skull a little behind for the depth test only
    NN_ = np.vstack([Nsheet, Ncs])
    FF = np.vstack([F, Fc + len(V)])
    zb, nb, cubre, hf = _rasteriza(PP, ZZ, NN_, FF, x0, y0, w_, h_, A=np.vstack([V, Vc]))
    zb = np.where(cubre, (hf @ R3.T)[..., 2] * k * s, -1e9).astype(np.float32)   # the true depth back
    # pinholes where the face mesh's upper edge meets the skull: fill them from their neighbours
    # (and pixels that fell through the seam to the back of the skull: far behind their neighbours)
    cerrado = cv2.morphologyEx(cubre.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)) > 0
    zmed = cv2.medianBlur(np.where(cubre, zb, 0).astype(np.float32), 5)
    dentro = cv2.erode(cerrado.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    agujero = (cerrado & ~cubre) | (dentro & cubre & (zb < zmed - 3.0 * k * s))
    cubre = cubre & ~agujero
    if agujero.any():
        pw = cubre.astype(np.float32)
        den = cv2.GaussianBlur(pw, (0, 0), 1.5) + 1e-6
        for arr in (zb, nb, hf):
            a3 = arr if arr.ndim == 3 else arr[..., None]
            for ch in range(a3.shape[2]):
                f_ = cv2.GaussianBlur((a3[..., ch] * pw).astype(np.float32), (0, 0), 1.5) / den
                a3[..., ch][agujero] = f_[agujero]
        cubre = cerrado
    zf_, nf_, cara = _rasteriza(Pu * s, Zp, Nsheet, F, x0, y0, w_, h_)
    cara = cara & (np.abs(zf_ - zb) < 0.05 * k * s)          # the pixels where the face is the front surface
    Msil = cv2.GaussianBlur(cubre.astype(np.float32), (0, 0), 0.6 * s)
    nX, nY, nZ = nb[..., 0], nb[..., 1], nb[..., 2]
    nn = np.sqrt(nX * nX + nY * nY + nZ * nZ) + 1e-9
    Lf = np.array([lx * 0.5, ly * 0.45, 0.8])
    Lf /= np.linalg.norm(Lf)
    lit = np.clip((nX * Lf[0] + nY * Lf[1] + nZ * Lf[2]) / nn, -1, 1)
    # cast shadows (the nose on the cheek, the brow in the socket, the lip, the chin): march from each
    # pixel toward the light on the depth buffer; anything that rises above the ray shades it
    pend = Lf[2] / max(1e-6, math.hypot(Lf[0], Lf[1]))
    dl = np.array([Lf[0], Lf[1]]) / max(1e-6, math.hypot(Lf[0], Lf[1]))
    zz = np.where(cubre, zb, -1e9).astype(np.float32)
    sombra_c = np.zeros_like(zz)
    paso = max(1.0, 0.12 * k * s)
    for i in range(1, 26):
        d = i * paso
        M_ = np.float32([[1, 0, -dl[0] * d], [0, 1, -dl[1] * d]])   # samples the point d px toward the light
        zs = cv2.warpAffine(zz, M_, (w_, h_), flags=cv2.INTER_LINEAR, borderValue=-1e9)
        sombra_c = np.maximum(sombra_c, np.clip((zs - (zz + d * pend)) / (0.25 * k * s), 0, 1))
    sombra_c = cv2.GaussianBlur(sombra_c * cubre, (0, 0), 0.45 * s)
    # the hollows from the depth (measured against the whole head, never along its outline):
    # sockets, the sides of the nose, the corners of the mouth, under the lower lip
    zfill = np.where(cubre, zb, 0).astype(np.float32)
    peso = cubre.astype(np.float32)
    sig = 1.6 * k * s
    zm = cv2.GaussianBlur(zfill, (0, 0), sig) / (cv2.GaussianBlur(peso, (0, 0), sig) + 1e-6)
    D_in = cv2.distanceTransform(cubre.astype(np.uint8), cv2.DIST_L2, 5)
    hueco = np.clip((zm - zfill) / (0.35 * k * s), 0, 1) * cara * np.clip(D_in / (1.4 * k * s) - 0.3, 0, 1)
    hueco = cv2.GaussianBlur(hueco.astype(np.float32), (0, 0), 0.5 * s)

    sil = _masc(Msil, x0, y0, s)
    if peinado == 'mono':
        q = proyecta(MONO[None, :], np.array([[0, 0, 1.0]]))[0][0]
        rm = 3.7 * k
        mono = Elipse(q[0], q[1], rm, rm * 0.92)
        FR.volumen(lz, mono, pelo_c, luz, dens=0.92, prof=0.5, brillo=0.0, reflejo=0.0, grosor=0.3, presion=0.25)
        vueltas = [arco(q[0], q[1], rm * f_, rm * 0.85 * f_, a_, a_ + rng.uniform(100, 200), 12)
                   for f_, a_ in zip(rng.uniform(0.35, 0.95, 9), rng.uniform(0, 360, 9))]
        if vueltas:
            lz.lapiz(vueltas, _osc(pelo_c, 0.5, '#050303', 0.2), grosor=0.22, presion=0.3, temblor=0.03, puntas=0.45)
        if adorno:
            fc = (q[0] + rm * 0.85, q[1] + rm * 0.55)
            for kk_ in range(5):
                a_ = 2 * math.pi * kk_ / 5
                lz.aguada(Elipse(fc[0] + math.cos(a_) * rm * 0.3, fc[1] + math.sin(a_) * rm * 0.3, rm * 0.26, rm * 0.18,
                                 math.degrees(a_)), adorno, dens=0.85, tapa=1, borde=0.4, irreg=0.2)
            lz.aguada(Elipse(fc[0], fc[1], rm * 0.12), '#f0c040', dens=0.9, tapa=1, suave=0.1)
    else:
        FR._pelo_detras(lz, G, peinado, pelo_c, luz, rng, adorno)

    # ---- skin: one wash with the warmth of a real face in it (the zones are the face's own)
    toques = [(*L(205), a2 * 0.32, mezcla(skin, '#d8786e', 0.5), 0.5), (*L(425), a2 * 0.32, mezcla(skin, '#d8786e', 0.5), 0.5),
              (*L(4), a2 * 0.14, mezcla(skin, '#d0685e', 0.35), 0.32), (*L(152), a2 * 0.3, mezcla(skin, '#9090a8', 0.16), 0.3),
              (*L(151), a2 * 0.4, mezcla(skin, '#e8c070', 0.16), 0.3)]
    oscuridad = 1 - float(np.dot(rgb(skin), [0.3, 0.59, 0.11]))
    lz.aguada(sil, skin, dens=0.48 + 0.22 * oscuridad, tapa=1, borde=0.22, irreg=0.12, gran=0.15, var=0.22,
              toques=toques)
    sc = _osc(skin, 0.8, '#6a4a7a', 0.38)
    medio = Msil * _ss(lit, 0.92, 0.5)
    _veladura(lz, medio, x0, y0, sc, 0.18, gran=0.45, var=0.5)
    familia = np.maximum(_ss(lit, 0.32, 0.05), sombra_c) * Msil
    _veladura(lz, familia, x0, y0, sc, 0.2, gran=0.4, var=0.5, suave=0.6)
    lz.aguada(_masc((sombra_c > 0.55).astype(np.float32) * Msil, x0, y0, s), sc, dens=0.1, borde=0.3, irreg=0.5,
              gran=0.3, var=0.3)
    _veladura(lz, Msil * hueco, x0, y0, _osc(skin, 0.65, '#5a2a3a', 0.3), 0.2, gran=0.35, var=0.4)
    S = familia
    lz.aguada(sil, _osc(skin, 0.9, '#a05a50', 0.2), dens=0.1, borde=0.3, irreg=0.25, gran=0.6, var=0.6, flor=1)
    Dsil = cv2.distanceTransform((Msil > 0.5).astype(np.uint8), cv2.DIST_L2, 5)
    _levanta(lz, Msil * _ss(lit, 0.9, 0.99) * np.clip(Dsil / (0.1 * a2 * s + 1), 0, 1) * (1 - hueco), x0, y0, 0.22,
             suave=0.5)
    # the reflected warm light under the jaw on the shadow side
    _levanta(lz, Msil * _ss(lit, 0.15, -0.3) * np.clip(1 - Dsil / (0.08 * a2 * s + 1), 0, 1) * _ss(Dsil, 0, 0.02 * a2 * s),
             x0, y0, 0.06, suave=0.3)
    # the shadow the head throws on the neck
    cub = FR._cobertura(lz, x0, y0, x1, y1)
    kk = b2 * 0.14 * s
    Mt = cv2.warpAffine(Msil, np.float32([[1, 0, -lx * kk * 0.8], [0, 1, kk]]), (w_, h_))
    Mt = cv2.GaussianBlur(Mt, (0, 0), max(1.0, kk * 0.35))
    _veladura(lz, np.clip(Mt * cub * (1 - Msil), 0, 1), x0, y0, _osc(skin, 0.5, '#4a2a4a', 0.4), 0.15)

    lin = _osc(skin, 0.45, '#3a1a1a', 0.45)
    # ---- eyes: almond from the lids, cream white, the iris looking where she looks, lashes, crease
    for (sup, inf, pli) in ((OJO_D_SUP, OJO_D_INF, PLIEGUE_D), (OJO_I_SUP, OJO_I_INF, PLIEGUE_I)):
        up, dn = anillo(sup), anillo(inf)
        nmi = np.array([n for n in Nsheet[sup]]).mean(0)
        if nmi[2] < 0.15:
            continue
        alm = Poligono(up + dn[::-1][1:-1], suave=True)
        ancho = float(np.linalg.norm(np.subtract(up[0], up[-1])))
        alto = float(np.linalg.norm(np.subtract(L(sup[4]), L(inf[4]))))
        c = np.mean(np.array(up + dn), 0)
        lz.aguada(Elipse(c[0], c[1] - alto * 0.8, ancho * 0.75, alto * 1.6, math.degrees(th)), _osc(skin, 0.7, '#6a3a4a', 0.3),
                  dens=0.2, suave=alto * 0.6)
        lz.levanta(alm, cantidad=0.32, suave=0.2)
        lz.aguada(alm, '#d4c4ae', dens=0.32, suave=0.25)
        ri = ancho * 0.235
        ic = (c[0] + mira[0] * ancho * 0.2, c[1] + mira[1] * alto * 0.45 + alto * 0.05)
        iris_f = Elipse(ic[0], ic[1], ri, ri, 0) & alm
        lz.aguada(iris_f, _osc(iris, 0.9, '#1a0f0a', 0.2), dens=0.9, tapa=1, suave=0.1, gran=0.1)
        lz.aguada(Elipse(ic[0] + ri * 0.08, ic[1] + ri * 0.15, ri * 0.75) & iris_f, _cla(iris, 0.25, '#8a5a30'), dens=0.3,
                  suave=0.15)                                          # the iris lighter low on the side of the light
        lz.aguada(Elipse(ic[0], ic[1], ri * 0.45) & alm, '#0a0505', dens=0.95, tapa=0.8, suave=0.08)
        lz.aguada(alm & Poligono([(c[0] - ancho, c[1] - alto * 3), (c[0] + ancho, c[1] - alto * 3),
                                  (c[0] + ancho, c[1] - alto * 0.05), (c[0] - ancho, c[1] - alto * 0.05)], suave=False),
                  '#3a2018', dens=0.18, suave=0.25)                    # the upper lid's shadow on the eyeball
        lz.gouache(Elipse(ic[0] + lx * ri * 0.35, ic[1] - ri * 0.3, max(0.25, ri * 0.22)), '#fffaf0', alfa=0.9, irreg=0)
        lz.lapiz([up], '#1e1210', grosor=max(0.35, alto * 0.22), presion=0.75, temblor=0.02, puntas=0.25)
        lz.lapiz([up[:4]], '#1e1210', grosor=max(0.45, alto * 0.3), presion=0.6,
                 temblor=0.02, puntas=0.4)
        lz.lapiz([dn[2:-2]], _osc(skin, 0.55, '#4a2a3a', 0.45), grosor=0.25, presion=0.25, temblor=0.02)
        lz.lapiz([anillo(pli)], _osc(skin, 0.55, '#4a2a3a', 0.45), grosor=0.28, presion=0.28, temblor=0.03, puntas=0.4)
    # ---- brows: full at the inner end, tapering outward; a soft wash, then short hairs that
    # grow up and out (never one drawn arc)
    for (sup, inf) in ((CEJA_D_SUP, CEJA_D_INF), (CEJA_I_SUP, CEJA_I_INF)):
        if Nsheet[sup].mean(0)[2] < 0.1:
            continue
        a_, b_ = np.array(anillo(sup)), np.array(anillo(inf))          # index 0 = outer end, last = inner
        tt = np.linspace(0, 1, len(a_))[:, None]
        f_ = 0.35 + 0.45 * tt                                             # how much of the band it fills
        m_ = a_ * f_ + b_ * (1 - f_)
        forma = Poligono([tuple(p) for p in m_] + [tuple(p) for p in b_[::-1]], suave=True)
        bc = _hex(mezcla(pelo_c, '#6a4a3a', 0.3))
        lz.aguada(forma, bc, dens=0.26, suave=0.22, gran=0.2)
        pelos = []
        for t in np.linspace(0.04, 0.98, 26):
            i = t * (len(m_) - 1)
            j = int(min(len(m_) - 2, i))
            f = i - j
            top = m_[j] * (1 - f) + m_[j + 1] * f
            bot = b_[j] * (1 - f) + b_[j + 1] * f
            h = top - bot
            out_ = (m_[0] - m_[-1]) / (np.linalg.norm(m_[0] - m_[-1]) + 1e-9)   # toward the outer end
            p0 = bot + h * rng.uniform(0.0, 0.5)
            p1 = p0 + h * rng.uniform(0.5, 0.8) + out_ * np.linalg.norm(h) * (0.4 + 0.9 * (1 - t))
            pelos.append([tuple(p0), tuple(p1)])
        lz.lapiz(pelos, _osc(bc, 0.8), grosor=0.12, presion=0.26, temblor=0.03, puntas=0.6)
    # ---- nose: the shadow under it, the nostrils, the wing's crease, the lit tip
    for (ala, lado) in ((98, -1), (327, 1)):
        if Nsheet[ala, 2] < 0.05:
            continue
        cn = np.array(L(ala)) * 0.55 + np.array(L(2)) * 0.45 + (np.array(L(2)) - np.array(L(4))) * 0.12
        an = float(np.linalg.norm(np.subtract(L(ala), L(2)))) * 0.28
        lz.aguada(Elipse(cn[0], cn[1], an, an * 0.42, math.degrees(th) + 12 * lado), '#4a221c', dens=0.34, suave=0.14)
        q = np.array(L(ala))
        up_ = np.array(L(4)) - np.array(L(2))
        lz.lapiz([bezier(tuple(q + up_ * 0.55), tuple(q + (q - np.array(L(1))) * 0.35), tuple(q - up_ * 0.15), n=8)],
                 lin, grosor=0.22, presion=0.16, temblor=0.02, puntas=0.6)
    lz.aguada(Elipse(*L(2), a2 * 0.16, b2 * 0.03, math.degrees(th)), _osc(skin, 0.62, '#5a2a3a', 0.3), dens=0.28,
              suave=a2 * 0.03)
    lz.levanta(Elipse(L(4)[0] + lx * a2 * 0.02, L(4)[1] - b2 * 0.015, a2 * 0.04, b2 * 0.022), cantidad=0.25, suave=0.3)
    # ---- lips: the upper one in shadow, the lower lit and fuller; the opening only when parted,
    # teeth only when open
    lab = _hex(mezcla(skin, '#b9695f', 0.55))
    sup_l = Poligono(anillo(LABIO_SUP_EXT) + anillo(LABIO_SUP_INT)[::-1])
    inf_l = Poligono(anillo(LABIO_INF_EXT) + anillo(LABIO_INF_INT)[::-1])
    hueco_b = Poligono(anillo(LABIO_SUP_INT) + anillo(LABIO_INF_INT)[::-1])
    if abre > 0.05:
        lz.aguada(hueco_b, _osc(lab, 0.45, '#3a1418', 0.5), dens=0.6, tapa=1, suave=0.14)
    if abre > 0.25:
        dientes = hueco_b & Poligono([(p[0], p[1] + b2 * 0.03) for p in anillo(LABIO_SUP_INT)] +
                                     [(p[0], p[1] - b2 * 0.04) for p in anillo(LABIO_SUP_INT)[::-1]])
        lz.aguada(dientes, '#e2d6c8', dens=0.7, tapa=1, suave=0.1)
        lz.aguada(dientes, '#8a7870', dens=0.22, suave=0.2)
    lz.aguada(sup_l, _osc(lab, 0.86, '#5a2030', 0.2), dens=0.5, suave=0.15, gran=0.15)
    lz.aguada(inf_l, _osc(lab, 0.95, '#c0505a', 0.15), dens=0.5, suave=0.15, gran=0.15)
    lz.levanta(Elipse(*(np.array(L(17)) * 0.35 + np.array(L(14)) * 0.65 + (lx * a2 * 0.03, 0)), a2 * 0.09, b2 * 0.012),
               cantidad=0.3, suave=0.25)
    lz.lapiz([anillo(LABIO_SUP_INT)], '#3a1416', grosor=0.3, presion=0.55, temblor=0.02, puntas=0.3)
    for c_ in (61, 291):
        lz.aguada(Elipse(*L(c_), a2 * 0.03, b2 * 0.018), _osc(skin, 0.5, '#4a2a3a', 0.4), dens=0.35, suave=0.2)
    lz.aguada(Elipse(*(np.array(L(17)) + (np.array(L(17)) - np.array(L(14))) * 0.45), a2 * 0.14, b2 * 0.02,
                     math.degrees(th)), _osc(skin, 0.7, '#6a3a4a', 0.3), dens=0.22, borde=0.4, irreg=0.2)
    # ---- hair, drawn in the head's own frame so it follows the turn: a rounded hairline high on
    # the forehead, dipping at the temples in front of the ears, all of it pulled back over the
    # skull to the bun. Its edge on the skin is graded (the skin shows through the first
    # half-centimetre) and its strands are many, short and uneven, never a combed cap.
    xh, yh, zh = hf[..., 0], hf[..., 1], hf[..., 2]
    ax_ = np.abs(xh)
    linea = lambda x_: np.where(np.abs(x_) < 4.6, 10.6 - 0.07 * np.abs(x_) ** 2,
                                10.6 - 0.07 * 4.6 ** 2 - (np.abs(x_) - 4.6) * 2.3)
    d_front = yh - linea(xh)                                             # cm above the hairline
    delante = _ss(zh, -3.2, -1.6)                                        # 1 on the front of the head
    a_front = _ss(d_front, -0.15, 0.55)
    a_back = _ss(yh, -1.4, -0.4)                                         # the nape, swept up
    pelo_a = np.where(delante > 0.5, a_front, np.maximum(a_front, a_back)).astype(np.float32) * cubre
    # pulled back to the bun, the hair passes over the ears and leaves them bare
    oreja_z = _ss(ax_, 5.4, 6.2) * _ss(yh, 4.9, 4.1) * _ss(yh, -3.0, -2.2) * _ss(zh, -6.8, -6.0)
    pelo_a = pelo_a * (1 - oreja_z).astype(np.float32)
    # the hair stands a little off the skull at the top and back (never past the face)
    crece = cv2.dilate((pelo_a > 0.6).astype(np.uint8), np.ones((3, 3), np.uint8),
                       iterations=max(1, int(0.18 * k * s)))
    fuera = (crece > 0) & (~cubre)
    pelo_a = np.maximum(pelo_a, cv2.GaussianBlur(fuera.astype(np.float32), (0, 0), 0.25 * s))
    Mp = _masc(pelo_a, x0, y0, s)
    lz.aguada(Mp, pelo_c, dens=0.95, tapa=1, borde=0, suave=0.25, gran=0.35, var=0.25)
    # form: darker where it turns from the light, and a sheen band where the light glances off
    Sp = pelo_a * _ss(lit, 0.75, -0.1)
    _veladura(lz, Sp, x0, y0, _osc(pelo_c, 0.6, '#0a0508', 0.3), 0.35, gran=0.3)
    Hh = np.array([Lf[0], Lf[1], Lf[2] + 1.0]); Hh /= np.linalg.norm(Hh)
    brillo = np.clip((nX * Hh[0] + nY * Hh[1] + nZ * Hh[2]) / nn, 0, 1)
    _levanta(lz, pelo_a * _ss(brillo, 0.9, 0.985) * (yh > 6.0), x0, y0, 0.2, suave=0.6)

    def H(x_, y_, z_):
        q = proyecta(np.array([[x_, y_, z_]]), np.array([[0, 0, 1.0]]))[0][0]
        return (float(q[0]), float(q[1]))
    bun = MONO.copy()
    oscuras, claras = [], []
    for _ in range(70):
        xx = rng.uniform(-6.9, 6.9)
        y_l = float(linea(np.array(xx)))
        a3 = np.array([xx, y_l + 0.05, float(_frente_z(xx, y_l)) + 0.1])
        yb = 13.4 - 0.04 * xx * xx
        b3 = np.array([xx * 0.8, yb, float(_frente_z(xx * 0.8, yb)) - 1.5])
        c3 = bun + np.array([xx * 0.18, -0.8, 1.6])
        t0, t1 = sorted(rng.uniform(0, 1, 2))
        if t1 - t0 < 0.25:
            t1 = min(1.0, t0 + 0.35)
        pts = []
        for t in np.linspace(t0, t1, 12):
            p3 = (1 - t) ** 2 * a3 + 2 * (1 - t) * t * b3 + t * t * c3
            p3 = p3 + np.array([0.12 * math.sin(7 * t + xx), 0, 0])
            pts.append(H(*p3))
        q3 = (1 - (t0 + t1) / 2) ** 2 * a3 + 2 * (1 - (t0 + t1) / 2) * ((t0 + t1) / 2) * b3 + ((t0 + t1) / 2) ** 2 * c3
        lado = q3[0] * G.sg * lx
        (claras if (lado < 0 and q3[1] > 8.0 and rng.uniform() < 0.6) else oscuras).append(pts)
    lz.lapiz(oscuras, _osc(pelo_c, 0.45, '#050303', 0.2), grosor=0.16, presion=0.28, temblor=0.02, cortes=0.2,
             puntas=0.5)
    lz.lapiz(claras, _cla(pelo_c, 0.35, '#a8a0a8'), grosor=0.14, presion=0.2, temblor=0.02, cortes=0.25, puntas=0.6)
    # ---- the ear on the side we see, in the head's frame: a C of rim round a darker bowl
    for sx in (-1, 1):
        nz_ = (R3 @ np.array([sx, 0.0, 0.0]))[2]
        if nz_ < 0.05:
            continue
        zc, yc, xe = -4.1, 1.0, 6.85
        borde_o = [(1.2, 2.2), (0.6, 3.0), (-0.4, 3.15), (-1.3, 2.5), (-1.65, 1.0), (-1.45, -0.6), (-0.95, -1.8),
                   (-0.35, -2.8), (0.35, -2.95), (0.8, -2.2), (1.0, -1.0), (1.25, 0.3)]
        P3 = np.array([[sx * (xe + 0.55 * max(0.0, 0.4 - dz)), yc + dy, zc + dz] for dz, dy in borde_o])
        Po = proyecta(P3, np.tile([[sx, 0, 0]], (len(P3), 1)))[0]
        oreja = Poligono([tuple(p) for p in Po])
        lz.aguada(oreja, skin, dens=0.5 + 0.2 * oscuridad, tapa=1, suave=0.15, gran=0.15,
                  toques=[(*Po[1], a2 * 0.12, mezcla(skin, '#d8705e', 0.45), 0.4)])
        conc = [(0.55, 1.3), (-0.3, 1.9), (-0.9, 1.0), (-0.85, -0.4), (-0.3, -1.2), (0.45, -1.0), (0.7, 0.1)]
        Pc = proyecta(np.array([[sx * (xe + 0.3 + 0.3 * max(0.0, -dz)), yc + dy, zc + dz] for dz, dy in conc]),
                      np.tile([[sx, 0, 0]], (len(conc), 1)))[0]
        lz.aguada(Poligono([tuple(p) for p in Pc]), _osc(skin, 0.62, '#5a2a3a', 0.3), dens=0.4, suave=0.25)
        hel = proyecta(np.array([[sx * (xe + 0.55 * max(0.0, 0.4 - dz)), yc + dy * 0.86, zc + dz * 0.8]
                                 for dz, dy in borde_o[1:9]]), np.tile([[sx, 0, 0]], (8, 1)))[0]
        lz.lapiz([[tuple(p) for p in hel]], _osc(skin, 0.6, '#4a2a3a', 0.4), grosor=0.2, presion=0.3, temblor=0.02,
                 puntas=0.5)
        lz.lapiz([[tuple(p) for p in Po[3:10]]], _osc(skin, 0.5, '#3a1a2a', 0.45), grosor=0.18, presion=0.25,
                 temblor=0.02, puntas=0.5)
        if pendiente:
            lob = proyecta(np.array([[sx * xe, yc - 2.6, zc + 0.1]]), np.array([[sx, 0, 0]]))[0][0]
            lz.aguada(Elipse(lob[0], lob[1] + a2 * 0.06, a2 * 0.05), pendiente, dens=0.9, tapa=1, suave=0.1)
    _borde_sombra(lz, (Msil > 0.5).astype(np.uint8), lit, x0, y0, _osc(skin, 0.62, '#6a3a3a', 0.3), 0.26, 0.12,
                  umbral=0.5)
    return dict(centro=G.Q(0, 0), puntos=Pu)


def cabeza(lz, x, y, r, piel='piel2', pelo='#3a2a20', peinado='mono', giro=0.0, inclina=0.0, ojos='abiertos',
           boca='sonrisa', mira=(0, 0), adorno=None, semilla=None, alza=0.0, **kw):
    """Drop-in for acuarela.cabeza / figuras_real.cabeza (what acuarela.figura calls), so one
    figure's head can be painted as a portrait: put it in place of A.cabeza while that figure
    is painted. The mouth: a soft closed smile, the lips just parted when it was open."""
    sonrisa, abre = {'sonrisa': (0.5, 0.0), 'suave': (0.3, 0.0), 'abierta': (0.85, 0.0), 'canta': (0.3, 0.35),
                     'risa': (0.8, 0.25), 'rie': (0.8, 0.25), 'ríe': (0.8, 0.25)}.get(boca, (0.4, 0.0))
    return cabeza_retrato(lz, x, y, r, piel=piel, pelo=pelo, peinado=peinado, luz=FR._LUZ_ESCENA[0], giro=giro,
                          inclina=inclina, alza=alza, mira=mira, sonrisa=sonrisa, abre=abre, adorno=adorno,
                          semilla=semilla)
