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
        lz.aguada(f, color, dens=dens, tapa=tapa, toques=toques, borde=0.6, irreg=0.6)
        lz.contorno(f, lapiz or _lapiz_de(color), grosor=0.85, presion=0.55, cortes=0.25)
        out = f
    else:
        pk = piel or 'piel2'
        f = brazo_forma(0.86)
        lz.aguada(f, pk, dens=0.58, tapa=tapa, borde=0.45, irreg=0.4,
                  toques=[(*E, w * 1.2, mezcla(pk, '#a8573c', 0.3), 0.4)])
        lz.contorno(f, PIEL_LAPIZ, grosor=0.8, presion=0.5, cortes=0.25)
        fin = 0.7 if manga == 'corta' else 1.25
        if fin <= 1:
            m = Trazo([S, S + (E - S) * fin * 0.5, S + (E - S) * fin], (w * 1.12, w * 1.08, w * 1.0))
        else:
            m = (seg(S, E, w * 1.12, w * 1.05, w * 0.9) | Elipse(E[0], E[1], w * 0.48)
                 | Trazo([E, E + (Wr - E) * (fin - 1)], (w * 0.92, w * 0.9)))
        lz.aguada(m, color, dens=dens, tapa=tapa, toques=toques, borde=0.6, irreg=0.6)
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
    lz.lapiz(tr, lp, grosor=0.6, presion=0.18, temblor=0.15)
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


# ======================================================================
#  Heads seen in profile and from behind (cabeza() only draws front / 3/4)
# ======================================================================

def _loc(x, y, r, lado, inclina):
    ca, sa = math.cos(math.radians(inclina)), math.sin(math.radians(inclina))

    def R(dx, dy):
        dx = dx * lado
        return (x + (dx * ca - dy * sa) * r, y + (dx * sa + dy * ca) * r)
    return R


def _pelo_perfil(lz, R, r, pelo, peinado, canas):
    lp = _lapiz_de(pelo, 0.6)
    if peinado == 'pañuelo':
        f = Poligono([R(0.62, -0.62), R(0.25, -1.1), R(-0.45, -1.08), R(-0.95, -0.55), R(-1.05, 0.2), R(-0.95, 0.95),
                      R(-0.55, 1.25), R(-0.2, 1.05), R(0.05, 0.75), R(-0.05, 0.3), R(0.2, 0.0), R(0.55, -0.25),
                      R(0.7, -0.45)])
        lz.aguada(f, pelo, dens=0.8, tapa=1, borde=0.7, irreg=0.6, gran=0.3,
                  toques=[(*R(-0.6, 0.6), r * 0.6, mezcla(pelo, '#1a1a2a', 0.35), 0.6)])
        lz.contorno(f, lp, grosor=0.8, presion=0.55, cortes=0.25)
        pliegues(lz, [[R(-0.2, -0.95), R(-0.55, -0.4), R(-0.7, 0.4)], [R(0.2, -0.7), R(-0.2, -0.2), R(-0.35, 0.6)]],
                 lp, presion=0.45)
        return
    if peinado == 'rizado':
        rng = np.random.default_rng(int(abs(R(0, 0)[0])))
        cs = []
        for a in np.linspace(150, 330, 12):
            t = math.radians(a)
            px, py = R(-0.1 + math.cos(t) * 0.82, -0.12 + math.sin(t) * 0.88)
            cs.append((px, py, r * rng.uniform(0.24, 0.32)))
        cs.append((*R(-0.3, -0.25), r * 0.55))
        f = Circulos(cs)
    else:
        f = Poligono([R(0.66, -0.55), R(0.45, -0.98), R(-0.15, -1.1), R(-0.75, -0.8), R(-0.98, -0.2), R(-0.92, 0.35),
                      R(-0.68, 0.62), R(-0.5, 0.3), R(-0.32, 0.02), R(-0.05, -0.12), R(0.3, -0.38)])
    lz.aguada(f, pelo, dens=0.48 if canas else 0.8, tapa=1, borde=0.7, irreg=0.7, gran=0.4,
              toques=[(*R(-0.5, -0.5), r * 0.5, mezcla(pelo, '#ffffff', 0.3), 0.5)])
    lz.contorno(f, lp, grosor=0.8, presion=0.55, cortes=0.3)
    st = [bezier(R(0.45, -0.85), R(-0.1, -0.85), R(-0.6, -0.45), n=14),
          bezier(R(0.3, -0.6), R(-0.2, -0.55), R(-0.7, -0.1), n=14),
          bezier(R(0.0, -0.95), R(-0.5, -0.7), R(-0.85, 0.1), n=14)]
    lz.lapiz(st, lp, grosor=0.7, presion=0.4, temblor=0.2, cortes=0.3)
    if peinado == 'mono':
        b = Elipse(*R(-0.62, -0.78), r * 0.42, r * 0.36)
        lz.aguada(b, pelo, dens=0.55 if canas else 0.85, tapa=1, borde=0.7, irreg=0.5)
        lz.contorno(b, lp, grosor=0.8, presion=0.55, cortes=0.2)
        lz.lapiz([arco(*R(-0.62, -0.78), r * 0.25, r * 0.2, 0, 300, 20)], lp, grosor=0.6, presion=0.4)


def cabeza_perfil(lz, x, y, r, piel='piel2', pelo='#3a2418', peinado='corto', lado=1, inclina=0.0,
                  ojos='abiertos', boca='sonrisa', canas=False, gafas=False, barba=None, ojo=1.0, sin_pelo=False):
    """A tender head in true profile, looking toward lado (+1 right, -1 left).
    Small round nose, one eye with lid and lashes, ear, rosy cheek."""
    R = _loc(x, y, r, lado, inclina)
    SEP = '#6b4433'
    gw = max(0.7, r * 0.035)
    cara_ = Poligono([R(-0.86, 0.05), R(-0.82, -0.52), R(-0.45, -0.93), R(0.1, -1.0), R(0.55, -0.82), R(0.78, -0.48),
                      R(0.82, -0.18), R(0.79, 0.0), R(0.9, 0.17), R(0.97, 0.27), R(0.86, 0.34), R(0.84, 0.42),
                      R(0.88, 0.48), R(0.81, 0.55), R(0.85, 0.62), R(0.74, 0.74), R(0.72, 0.86), R(0.48, 0.94),
                      R(0.12, 0.8), R(-0.12, 0.62), R(-0.5, 0.55)])
    lz.aguada(cara_, piel, dens=0.6, tapa=1, borde=0.5, irreg=0.45, gran=0.15,
              toques=[(*R(-0.3, 0.3), r * 0.55, mezcla(piel, '#b0603e', 0.35), 0.45),
                      (*R(0.4, -0.5), r * 0.45, mezcla(piel, '#fff0e0', 0.3), 0.5)],
              sombra=(-lado * r * 0.3, -r * 0.3, mezcla(piel, '#a0503a', 0.45), 0.3))
    # the profile line in sepia (forehead, nose, lips, chin), the back of the skull lighter
    lz.lapiz([spline([R(0.55, -0.82), R(0.78, -0.48), R(0.82, -0.18), R(0.79, 0.0), R(0.9, 0.17), R(0.97, 0.27),
                      R(0.86, 0.34)]),
              spline([R(0.84, 0.42), R(0.88, 0.48), R(0.81, 0.55), R(0.85, 0.62), R(0.74, 0.74), R(0.72, 0.86),
                      R(0.48, 0.94), R(0.12, 0.8)])], SEP, grosor=gw * 0.85, presion=0.6, temblor=0.08)
    lz.contorno(cara_, PIEL_LAPIZ, grosor=0.7, presion=0.35, cortes=0.5, desfase=0.2)
    # cheek
    lz.aguada(Elipse(*R(0.4, 0.38), r * 0.22, r * 0.15), '#ec6a72', dens=0.5, suave=r * 0.08, gran=0.05)
    # ear
    ex, ey = R(-0.12, 0.12)
    oreja = Elipse(ex, ey, r * 0.15, r * 0.22)
    lz.aguada(oreja, piel, dens=0.62, tapa=1, irreg=0.3, toques=[(ex, ey, r * 0.1, mezcla(piel, '#c0604a', 0.5), 0.6)])
    lz.contorno(oreja, PIEL_LAPIZ, grosor=0.6, presion=0.45, cortes=0.1, desfase=0.05)
    lz.lapiz([arco(ex, ey, r * 0.08, r * 0.13, -60 if lado > 0 else 60, 160 if lado > 0 else 340, 10)], SEP,
             grosor=gw * 0.6, presion=0.4)
    # eye
    ecx, ecy = R(0.56, 0.02)
    if ojos == 'cerrados':
        lz.lapiz([[R(0.46, 0.04), R(0.56, 0.08), R(0.66, 0.04)]], SEP, grosor=gw * 1.1, presion=0.9, temblor=0.03)
        lz.lapiz([[R(0.48, 0.06), R(0.42, 0.12)]], SEP, grosor=gw * 0.6, presion=0.6)
    else:
        iris = Elipse(*R(0.62, 0.03), r * 0.065 * ojo, r * 0.09 * ojo)
        lz.aguada(iris, '#4a2c22', dens=1.3, irreg=0.1, borde=0.3, gran=0.05)
        lz.gouache(Elipse(*R(0.65, 0.0), max(0.45, r * 0.024)), '#fffdf6', alfa=0.95, irreg=0)
        lid = spline([R(0.47, 0.0), R(0.58, -0.04 - 0.03 * ojo), R(0.7, -0.02)])
        lz.lapiz([lid], SEP, grosor=gw * 1.2, presion=0.95, temblor=0.03, puntas=0.25)
        lz.lapiz([[R(0.7, -0.02), R(0.76, -0.07)], [R(0.66, -0.04), R(0.7, -0.1)]], SEP, grosor=gw * 0.6,
                 presion=0.7)                               # lashes
        lz.lapiz([spline([R(0.5, -0.1), R(0.6, -0.14), R(0.68, -0.1)])], SEP, grosor=gw * 0.5, presion=0.3)  # crease
        lz.lapiz([[R(0.55, 0.1), R(0.66, 0.09)]], SEP, grosor=gw * 0.5, presion=0.3)
    # eyebrow
    lz.lapiz([spline([R(0.46, -0.22), R(0.6, -0.27), R(0.74, -0.22)])], _lapiz_de(pelo, 0.6), grosor=gw * 1.1,
             presion=0.6)
    # nostril and mouth
    lz.lapiz([arco(*R(0.82, 0.27), r * 0.05, r * 0.035, 100 if lado > 0 else -100, 260 if lado > 0 else 80, 8)],
             SEP, grosor=gw * 0.6, presion=0.5)
    if boca == 'abierta':
        m = Poligono([R(0.83, 0.48), R(0.68, 0.5), R(0.8, 0.6)])
        lz.aguada(m, '#8f2a36', dens=0.9, tapa=1, irreg=0.1)
    else:
        lz.lapiz([spline([R(0.86, 0.5), R(0.76, 0.52), R(0.68, 0.47)])], '#8f3c3c', grosor=gw * 0.9, presion=0.75)
    if barba:
        b = Poligono([R(-0.02, 0.5), R(0.3, 0.66), R(0.62, 0.66), R(0.74, 0.76), R(0.6, 0.93), R(0.2, 0.86),
                      R(0.0, 0.66)])
        lz.aguada(b, barba, dens=0.22, gran=0.5, irreg=0.8, borde=0.1)
        lz.rayado(b, _lapiz_de(barba, 0.5), angulo=80, sep=1.6, presion=0.3, grosor=0.5, largo=4)
    if not sin_pelo:
        _pelo_perfil(lz, R, r, pelo, peinado, canas)
    if gafas:
        lz.lapiz([arco(*R(0.6, 0.03), r * 0.13, r * 0.12, 0, 360, 20), [R(0.47, 0.0), R(-0.08, -0.02)]], '#8a6a4a',
                 grosor=0.7, presion=0.6, temblor=0.05)


def cabeza_espalda(lz, x, y, r, piel='piel2', pelo='#3a2418', peinado='corto', giro=0.4, canas=False):
    """A head seen from behind, turned toward one side (sign of giro) so the
    curve of the cheek and the eyelashes peep out: the 'lost profile' of
    picture books."""
    sd = 1 if giro >= 0 else -1
    R = lambda dx, dy: (x + dx * sd * r, y + dy * r)
    SEP = '#6b4433'
    gw = max(0.7, r * 0.035)
    # far ear first (mostly hidden)
    oreja = Elipse(*R(-0.9, 0.14), r * 0.13, r * 0.2)
    lz.aguada(oreja, piel, dens=0.62, tapa=1, irreg=0.3)
    lz.contorno(oreja, PIEL_LAPIZ, grosor=0.6, presion=0.45, cortes=0.1, desfase=0.05)
    cab = Poligono([R(-0.88, -0.1), R(-0.84, -0.6), R(-0.45, -0.98), R(0.2, -1.0), R(0.75, -0.7), R(0.95, -0.15),
                    R(1.0, 0.25), R(0.88, 0.62), R(0.58, 0.88), R(0.15, 0.95), R(-0.35, 0.82), R(-0.74, 0.48)])
    lz.aguada(cab, piel, dens=0.6, tapa=1, borde=0.5, irreg=0.4,
              toques=[(*R(-0.3, 0.5), r * 0.6, mezcla(piel, '#b0603e', 0.35), 0.5)])
    lz.contorno(cab, PIEL_LAPIZ, grosor=0.7, presion=0.4, cortes=0.4, desfase=0.2)
    lz.aguada(Elipse(*R(0.8, 0.45), r * 0.16, r * 0.12), '#ec6a72', dens=0.5, suave=r * 0.06)
    lz.lapiz([[R(0.97, 0.02), R(1.08, -0.05)], [R(0.98, 0.07), R(1.09, 0.06)]], SEP, grosor=gw * 0.75, presion=0.85)
    lp = _lapiz_de(pelo, 0.6)
    if peinado == 'rizado':
        rng = np.random.default_rng(int(x))
        cs = [(*R(math.cos(t) * 0.72, -0.12 + math.sin(t) * 0.78), r * rng.uniform(0.25, 0.33))
              for t in np.linspace(math.pi * 0.8, math.pi * 2.05, 12)]
        cs.append((*R(-0.1, -0.2), r * 0.72))
        f = Circulos(cs)
    else:
        f = Poligono([R(-0.94, 0.1), R(-0.9, -0.6), R(-0.45, -1.05), R(0.2, -1.07), R(0.78, -0.74), R(0.92, -0.3),
                      R(0.66, -0.08), R(0.46, 0.25), R(0.3, 0.56), R(-0.1, 0.64), R(-0.55, 0.56), R(-0.85, 0.36)])
    lz.aguada(f, pelo, dens=0.5 if canas else 0.82, tapa=1, borde=0.7, irreg=0.7, gran=0.4,
              toques=[(*R(-0.2, -0.55), r * 0.5, mezcla(pelo, '#ffffff', 0.3), 0.5)])
    lz.contorno(f, lp, grosor=0.8, presion=0.55, cortes=0.3)
    st = [bezier(R(k, -0.98), R(k * 1.15, -0.35), R(k * 1.05, 0.45), n=14) for k in (-0.55, -0.2, 0.15, 0.45)]
    lz.lapiz(st, lp, grosor=0.7, presion=0.4, temblor=0.3, cortes=0.4)
    # the ear on the side we see, in front of the hair
    oreja = Elipse(*R(0.6, 0.14), r * 0.14, r * 0.21)
    lz.aguada(oreja, piel, dens=0.62, tapa=1, irreg=0.3,
              toques=[(*R(0.6, 0.14), r * 0.09, mezcla(piel, '#c0604a', 0.5), 0.6)])
    lz.contorno(oreja, PIEL_LAPIZ, grosor=0.6, presion=0.45, cortes=0.1, desfase=0.05)
    lz.lapiz([arco(*R(0.6, 0.14), r * 0.07, r * 0.12, 0, 200, 10)], SEP, grosor=gw * 0.6, presion=0.4)


def cielo_mar(lz, forma, base='#24335f', toques_col=('#1f6f7a', '#4b3f8f', '#2a7f86'), estrellas=1.0, semilla=None,
              tapa=1.0, dens=1.1):
    """Like acuarela.cosmos but without blooms (no pale stains): night sky and
    sea at once, star dust, little stars and a shoal of tiny fish."""
    from acuarela import motas, estrella, pececillo, puntos_dentro
    sem = lz._sem(semilla)
    rng = np.random.default_rng(sem)
    bb = forma.bbox()
    area = (bb[2] - bb[0]) * (bb[3] - bb[1])
    pts = puntos_dentro(forma, 20, sem + 1)
    toq = [(x, y, rng.uniform(30, 60), toques_col[i % len(toques_col)], 0.6) for i, (x, y) in enumerate(pts[:10])]
    lz.aguada(forma, base, dens=dens, borde=0.6, flor=0, toques=toq, tapa=tapa, gran=0.6, var=0.3)
    motas(lz, forma, '#fff6dc', n=int(area / 500 * estrellas), tam=(0.4, 1.0), semilla=sem + 3)
    for (x, y) in puntos_dentro(forma, int(area / 6000 * estrellas) + 2, sem + 4, margen=3):
        estrella(lz, x, y, rng.uniform(3.5, 6.5), rng.choice(['#fff6dc', '#fff6dc', '#f6a5b5', '#a8e0e0']),
                 puntas=int(rng.choice([4, 5])))
    P = puntos_dentro(forma, 2, sem + 5, margen=10)
    for (x, y) in P:
        ang = rng.uniform(-20, 20)
        for k in range(6):
            pececillo(lz, x + k * 7 * math.cos(math.radians(ang)) + rng.normal(0, 2),
                      y + k * 7 * math.sin(math.radians(ang)) + rng.normal(0, 3), rng.uniform(2.4, 3.2),
                      ang + rng.normal(0, 10), '#9fd0e0')


def desvanecer_x(lz, x0, x1, y0, y1, a0, a1, b0, b1, semilla=5):
    """Lose everything painted inside the box (x0..x1, y0..y1) toward paper:
    transparent before a0, full from a1 to b0, gone again after b1 (units),
    with a ragged, noisy edge like a wash that runs out of water."""
    from acuarela import _ss
    s = lz.s
    X0, Y0, X1, Y1 = int(x0 * s), int(y0 * s), int(x1 * s), int(y1 * s)
    X = (np.arange(X0, X1, dtype=np.float32) + 0.5)[None, :] / s
    n = lz.ruido(X0, Y0, X1, Y1, 14, semilla) - 0.5
    Xn = X + n * 60
    F = _ss(Xn, a0, a1) * _ss(Xn, b1, b0)
    T = lz.T[Y0:Y1, X0:X1]
    T[:] = 1 - (1 - T) * F[..., None]
    O = lz.OP[Y0:Y1, X0:X1]
    O *= F[..., None]
