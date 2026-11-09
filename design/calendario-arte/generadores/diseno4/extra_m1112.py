"""
extra_m1112.py -- helpers for months 11 (Politica) and 12 (Valores), Diseño 4.

Built on top of acuarela.py (which is shared and must not be edited). What it
adds is picture-book figure craft that the shared library draws too simply:

* `mano_dedos`  a hand with real fingers (three phalanges each, a thumb, curl
                so it can grip, point, wave or rest), knuckle creases in pencil.
* `brazo`       an arm that bends at the elbow (deltoid, slim elbow, forearm
                swell, wrist), with sleeve folds drawn at the joint.
* `cara`        cabeza() plus sepia pencil modelling: upper eyelids, a nose
                with a shadow plane, cheek hatching, lips.
* `pliegues`    loose coloured-pencil folds across a garment.
* `sombra`      a soft cast shadow on the ground (the only "floor" allowed).
* `casita`      a tiny house with a lit window (light from inside).

All coordinates are base units (1485 x 850), exactly like acuarela.py.
"""
from __future__ import annotations

import math
import numpy as np

from acuarela import (Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, rgb, cabeza,
                      _lapiz_de, PIEL_LAPIZ)

SEPIA = '#5e3f30'


def _rot(ang):
    a = math.radians(ang)
    return np.array([math.cos(a), math.sin(a)])


def _dedo(base, ang, largo, ancho, curl, signo):
    """Polyline of a finger: three phalanges, each turned `curl` degrees."""
    pts = [np.asarray(base, float)]
    a = ang
    for frac in (0.45, 0.32, 0.23):
        p = pts[-1] + _rot(a) * largo * frac
        pts.append(p)
        a += curl * signo
    return pts


def mano_dedos(lz, x, y, ang, tam, piel='piel2', gesto='abierta', lado=1, curl=None, abre=1.0,
               lapiz=None, tapa=1.0, dens=0.6, pulgar=None):
    """A hand with fingers. (x, y) = wrist, ang = direction wrist -> fingertips
    (degrees, 0 right, 90 down), tam = wrist-to-fingertip length (units).
    lado = +1/-1 mirrors which side the thumb is on.
    gesto: 'abierta' (open, fingers slightly fanned: a raised voting hand, a
    wave), 'sujeta' (fingers curl round something), 'relajada' (soft natural
    curve), 'puño', 'apoyada' (resting, fingers bent at the first knuckle).
    Returns the Forma of the hand."""
    lp = lapiz or PIEL_LAPIZ
    d = _rot(ang)
    n = np.array([-d[1], d[0]]) * lado          # +n = thumb side
    W = np.array([x, y], float)
    P = lambda u, v: W + d * u * tam + n * v * tam
    if curl is None:
        curl = {'abierta': 6, 'sujeta': 62, 'relajada': 22, 'puño': 85, 'apoyada': 38}.get(gesto, 15)
    sg = -1 * lado                               # fingers curl away from the thumb side ... toward palm
    palma = Poligono([P(0.0, -0.13), P(0.1, -0.18), P(0.4, -0.2), P(0.46, -0.12), P(0.47, 0.04),
                      P(0.44, 0.17), P(0.25, 0.2), P(0.06, 0.15)])
    forma = palma
    largos = (0.34, 0.5, 0.47, 0.42) if gesto != 'puño' else (0.22, 0.26, 0.25, 0.22)
    vs = (-0.15, -0.05, 0.05, 0.15)              # pinky ... index
    lineas, dedos = [], []
    for k, (v, L) in enumerate(zip(vs, largos)):
        fan = (v * 1.1 * abre) * (1 if gesto in ('abierta', 'relajada') else 0.35)
        a_f = ang + math.degrees(fan) * lado
        base = P(0.42 - 0.04 * abs(v) / 0.16, v * 0.95)
        pts = _dedo(base, a_f, L * tam, 0.1 * tam, curl * (0.8 + 0.12 * k), sg)
        w0 = tam * (0.088 if k else 0.078)
        f = Trazo(pts, (w0, w0 * 0.95, w0 * 0.85, w0 * 0.7), suave=True)
        forma = forma | f
        dedos.append(f)
        lineas.append(pts)
    # thumb
    pa = pulgar if pulgar is not None else {'abierta': 48, 'sujeta': 20, 'relajada': 30, 'puño': 10,
                                            'apoyada': 25}.get(gesto, 30)
    tb = P(0.14, 0.18)
    a_t = ang + pa * lado
    tpts = [tb, tb + _rot(a_t) * tam * 0.2, tb + _rot(a_t - 18 * lado * (curl / 60)) * tam * 0.36]
    forma = forma | Trazo(tpts, (tam * 0.15, tam * 0.115, tam * 0.085))
    tq = [(*P(0.25, -0.1), tam * 0.25, mezcla(piel, '#a8573c', 0.35), 0.45),
          (*P(0.6, 0.0), tam * 0.25, mezcla(piel, '#e9727a', 0.35), 0.35)]
    lz.aguada(forma, piel, dens=dens, tapa=tapa, irreg=0.35, borde=0.45, gran=0.2, toques=tq)
    lz.contorno(forma, lp, grosor=0.75, presion=0.55, cortes=0.2, desfase=0.15, temblor=0.3)
    for f in dedos:            # each finger drawn on its own so they read separately
        lz.contorno(f - palma, lp, grosor=0.55, presion=0.4, cortes=0.1, desfase=0.05, temblor=0.15)
    # knuckle creases and nails
    cr = []
    for pts in lineas:
        for j in (1, 2):
            p = pts[j]
            dd = pts[j] - pts[j - 1]
            dd = dd / max(np.hypot(*dd), 1e-6)
            nn = np.array([-dd[1], dd[0]])
            cr.append([p - nn * tam * 0.03, p + nn * tam * 0.03])
    lz.lapiz(cr, lp, grosor=0.5, presion=0.35, temblor=0.03)
    return forma


def brazo(lz, S, E, Wr, ancho, color, piel=None, manga='larga', dens=0.74, tapa=1.0, lapiz=None,
          toques=None, pliegue=True, puno_col=None):
    """An arm that really bends. S shoulder, E elbow, Wr wrist (units).
    ancho = upper-arm width. manga: 'larga' (sleeve to the wrist), 'corta'
    (to above the elbow: skin forearm), 'remangada' (rolled below the elbow)."""
    S, E, Wr = map(lambda p: np.asarray(p, float), (S, E, Wr))
    a1 = S + (E - S) * 0.45
    a2 = E + (Wr - E) * 0.4
    w = ancho

    def seg(A, B, wa, wm, wb, belly=0.06):
        v = B - A
        L = max(np.hypot(*v), 1e-6)
        nn = np.array([-v[1], v[0]]) / L
        M = A + v * 0.45 + nn * L * belly
        return Trazo([A, M, B], (wa, wm, wb))

    def brazo_forma(k):
        up = seg(S, E, w * 1.0 * k, w * 0.92 * k, w * 0.7 * k)
        fo = seg(E, Wr, w * 0.74 * k, w * 0.78 * k, w * 0.52 * k, -0.04)
        return up | fo | Elipse(E[0], E[1], w * 0.36 * k)

    if manga == 'larga':
        f = brazo_forma(1.05)
        lz.aguada(f, color, dens=dens, tapa=tapa, toques=toques, borde=0.6, irreg=0.6,
                  sombra=(-w * 0.35, -w * 0.3, mezcla(color, '#3a2030', 0.35), 0.45))
        lz.contorno(f, lapiz or _lapiz_de(color), grosor=0.85, presion=0.55, cortes=0.25)
        out = f
    else:
        pk = piel or 'piel2'
        f = brazo_forma(0.86)
        lz.aguada(f, pk, dens=0.58, tapa=tapa, borde=0.45, irreg=0.4,
                  toques=[(*E, w * 1.2, mezcla(pk, '#a8573c', 0.3), 0.4)],
                  sombra=(-w * 0.3, -w * 0.3, mezcla(pk, '#8a4a32', 0.4), 0.4))
        lz.contorno(f, PIEL_LAPIZ, grosor=0.8, presion=0.5, cortes=0.25)
        fin = 0.7 if manga == 'corta' else 1.25
        if fin <= 1:
            m = Trazo([S, S + (E - S) * fin * 0.5, S + (E - S) * fin], (w * 1.12, w * 1.08, w * 1.0))
        else:
            m = (seg(S, E, w * 1.12, w * 1.05, w * 0.9) | Elipse(E[0], E[1], w * 0.48)
                 | Trazo([E, E + (Wr - E) * (fin - 1)], (w * 0.92, w * 0.9)))
        lz.aguada(m, color, dens=dens, tapa=tapa, toques=toques, borde=0.6, irreg=0.6,
                  sombra=(-w * 0.35, -w * 0.3, mezcla(color, '#3a2030', 0.35), 0.45))
        lz.contorno(m, lapiz or _lapiz_de(color), grosor=0.85, presion=0.55, cortes=0.25)
        out = f
    if pliegue:
        # folds gather on the inside of the elbow
        v1 = (S - E) / max(np.hypot(*(S - E)), 1e-6)
        v2 = (Wr - E) / max(np.hypot(*(Wr - E)), 1e-6)
        bis = v1 + v2
        if np.hypot(*bis) > 0.15:
            bis = bis / np.hypot(*bis)
            tr = []
            for k, t in enumerate((0.15, 0.35, 0.55)):
                c = E + bis * w * t
                tr.append(bezier(c + v1 * w * 0.35, c + bis * w * 0.12, c + v2 * w * 0.35, n=12))
            col = _lapiz_de(color, 0.5) if manga != 'corta' else PIEL_LAPIZ
            lz.lapiz(tr, col, grosor=0.7, presion=0.4, temblor=0.2)
    return out


def cara(lz, x, y, r, piel='piel2', lado_sombra=None, **kw):
    """cabeza() plus sepia-pencil modelling of the face."""
    giro = kw.get('giro', 0.0)
    inclina = kw.get('inclina', 0.0)
    cabeza(lz, x, y, r, piel=piel, **kw)
    ca, sa = math.cos(math.radians(inclina)), math.sin(math.radians(inclina))
    R = lambda dx, dy: (x + dx * ca - dy * sa, y + dx * sa + dy * ca)
    sd = lado_sombra if lado_sombra is not None else (-1 if giro >= 0 else 1)
    rx = r * 0.86
    lp = PIEL_LAPIZ
    # soft hatching down the shadow side of the face and under the jaw
    tr = []
    for k in range(7):
        t = k / 6
        yy = -0.15 + 0.85 * t
        xx = sd * rx * (0.93 - 0.35 * t * t)
        tr.append([R(xx, r * yy), R(xx - sd * r * 0.18, r * (yy + 0.12))])
    lz.lapiz(tr, lp, grosor=0.6, presion=0.25, temblor=0.15)
    # lower lip
    mx, my = R(giro * r * 0.36, r * 0.6)
    if kw.get('boca', 'sonrisa') in ('sonrisa', 'suave'):
        lz.aguada(Elipse(mx, my + r * 0.07, r * 0.07, r * 0.03), '#d8676a', dens=0.4, suave=r * 0.02)


def pliegues(lz, curvas, color, presion=0.4, grosor=0.8):
    lz.lapiz([spline(c) if len(c) > 2 else np.asarray(c, float) for c in curvas], color, grosor=grosor,
             presion=presion, temblor=0.4, cortes=0.25)


def sombra(lz, x, y, rx, ry=None, color='#c9a08a', dens=0.35):
    ry = ry or rx * 0.12
    lz.aguada(Elipse(x, y, rx, ry), color, dens=dens, suave=ry * 0.8, gran=0.3)


def casita(lz, x, y, w, h, pared='#f1d9b0', tejado='#c0503f', ventanas=1, luz=True, ang=0.0, campana=False,
           cruz=False):
    """A tiny house standing at (x, y) = middle of its base; w x h body plus a
    roof. Window light from inside. campana: a bell gable (a school);
    cruz: a small red cross over the door (a health centre)."""
    a = math.radians(ang)
    R = lambda dx, dy: (x + dx * math.cos(a) - dy * math.sin(a), y + dx * math.sin(a) + dy * math.cos(a))
    cuerpo = Poligono([R(-w / 2, 0), R(-w / 2, -h), R(w / 2, -h), R(w / 2, 0)], suave=False)
    lz.aguada(cuerpo, pared, dens=0.7, tapa=1, irreg=0.3, borde=0.6, gran=0.3,
              toques=[(*R(w * 0.3, -h * 0.3), w * 0.5, mezcla(pared, '#c08a60', 0.5), 0.5)])
    lz.contorno(cuerpo, '#7a5040', grosor=0.6, presion=0.5, cortes=0.1, desfase=0.2)
    tj = Poligono([R(-w / 2 - w * 0.12, -h + 1), R(0, -h - w * 0.55), R(w / 2 + w * 0.12, -h + 1)], suave=False)
    lz.aguada(tj, tejado, dens=0.85, tapa=1, irreg=0.3, borde=0.7, gran=0.3)
    lz.contorno(tj, _lapiz_de(tejado, 0.45), grosor=0.6, presion=0.5, cortes=0.1, desfase=0.2)
    lz.rayado(tj, _lapiz_de(tejado, 0.5), angulo=ang + 60, sep=2.2, presion=0.3, grosor=0.5)
    if campana:
        g = Poligono([R(-w * 0.12, -h - w * 0.5), R(-w * 0.12, -h - w * 0.85), R(0, -h - w * 1.0),
                      R(w * 0.12, -h - w * 0.85), R(w * 0.12, -h - w * 0.5)], suave=False)
        lz.aguada(g, pared, dens=0.7, tapa=1, irreg=0.2)
        lz.contorno(g, '#7a5040', grosor=0.5, presion=0.5, cortes=0.0, desfase=0.1)
        lz.aguada(Elipse(*R(0, -h - w * 0.72), w * 0.06, w * 0.08), '#d9a441', dens=0.9, irreg=0.1)
    nv = ventanas
    for k in range(nv):
        cx = -w / 2 + w * (k + 0.5) / nv
        v = Poligono([R(cx - w * 0.11, -h * 0.4), R(cx - w * 0.11, -h * 0.72), R(cx + w * 0.11, -h * 0.72),
                      R(cx + w * 0.11, -h * 0.4)], suave=False)
        lz.aguada(v, '#f6c65a', dens=0.85, tapa=1, irreg=0.15, toques=[(*R(cx, -h * 0.56), w * 0.12, '#fff0b0', 0.8)])
        lz.contorno(v, '#7a5040', grosor=0.45, presion=0.45, cortes=0, desfase=0.1)
        if luz:
            lz.luz((*R(cx, -h * 0.56), w * 0.22), '#ffe6a0', fuerza=0.45)
    if cruz:
        c = R(0, -h * 0.84)
        f = Poligono([R(-w * 0.03, -h * 0.94), R(w * 0.03, -h * 0.94), R(w * 0.03, -h * 0.87), R(w * 0.1, -h * 0.87),
                      R(w * 0.1, -h * 0.81), R(w * 0.03, -h * 0.81), R(w * 0.03, -h * 0.74), R(-w * 0.03, -h * 0.74),
                      R(-w * 0.03, -h * 0.81), R(-w * 0.1, -h * 0.81), R(-w * 0.1, -h * 0.87), R(-w * 0.03, -h * 0.87)],
                     suave=False)
        lz.aguada(f, '#d0364a', dens=0.9, tapa=1, irreg=0.1)
    # door
    pu = Poligono([R(w * 0.18, 0), R(w * 0.18, -h * 0.32), R(w * 0.34, -h * 0.32), R(w * 0.34, 0)], suave=False)
    if nv < 2:
        lz.aguada(pu, '#8a5a3e', dens=0.75, tapa=1, irreg=0.2)


def cuello(lz, x, y, r, piel, base, ancho=0.46):
    """A slender neck from under the head (x, y, r) down to the collar point."""
    f = Trazo([(x, y + r * 0.55), base], (r * ancho, r * ancho * 1.12))
    lz.aguada(f, piel, dens=0.58, tapa=1, irreg=0.4, borde=0.4,
              toques=[(x, y + r * 0.95, r * 0.45, mezcla(piel, '#8a4a32', 0.55), 0.7)])
    lz.contorno(f, PIEL_LAPIZ, grosor=0.7, presion=0.4, cortes=0.4)


def pieza(lz, pts, color, dens=0.74, toques=None, tapa=1.0, lapiz=None, suave_pol=True, flor=0, **kw):
    """A garment / object outline: one wash plus a loose pencil contour."""
    f = Poligono(pts, suave=suave_pol)
    kw.setdefault('sombra', (-9, -8, mezcla(color, '#3a2030', 0.35), 0.45))   # light from top-left
    lz.aguada(f, color, dens=dens, tapa=tapa, toques=toques, flor=flor, **kw)
    lz.contorno(f, lapiz or _lapiz_de(color), grosor=0.9, presion=0.55, cortes=0.3)
    return f


def guardar_zoom(lz, ancho, cx, cy, ruta, margen=30, calidad=90):
    """Save a CLOSE-UP of a canvas that was painted bigger than the sheet.

    Paint on Lienzo(ancho * Z) with ordinary base-unit coordinates, then this
    crops the final ancho x (850/1485 * ancho) sheet so that the base point
    (cx, cy) lands at the centre of the sheet: a zoom of Z with no change to
    any drawing call. The ragged fade to bare paper (like Lienzo.vineta) is
    applied to the cropped sheet, so the paper stays exactly PAPEL."""
    from PIL import Image
    from acuarela import BASE_W, BASE_H, _ss
    W = int(ancho)
    H = int(round(BASE_H * W / BASE_W))
    s = lz.s
    x0 = int(round(cx * s - W / 2))
    y0 = int(round(cy * s - H / 2))
    x0 = max(0, min(lz.W - W, x0))
    y0 = max(0, min(lz.H - H, y0))
    img = lz.imagen()[y0:y0 + H, x0:x0 + W].astype(np.float32) / 255.0
    lz.T = lz.LUZ = lz.OP = None
    # ragged vignette in sheet units (k = sheet px per base unit)
    k = W / BASE_W
    X = (np.arange(W, dtype=np.float32) + 0.5)[None, :] / k
    Y = (np.arange(H, dtype=np.float32) + 0.5)[:, None] / k
    dd = np.minimum(np.minimum(X, BASE_W - X), np.minimum(Y, BASE_H - Y))
    n = lz.fbm(x0, y0, x0 + W, y0 + H, 120, 99, 2)
    F = _ss(dd + margen * 0.9 * (n - 0.5) * 2, margen * 0.1, margen * 1.6)
    pap = lz.papel[None, None, :]
    out = pap + (img - pap) * F[..., None]
    im = Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8))
    if ruta.lower().endswith(('.jpg', '.jpeg')):
        im.save(ruta, quality=calidad, subsampling=0, keep_rgb=True)
    else:
        im.save(ruta)
    return im
