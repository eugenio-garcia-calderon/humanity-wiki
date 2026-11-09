"""
extra_m678.py -- picture-book figures for months 6, 7 and 8 of Diseño 4.

Builds on acuarela.py (public interface only; that module is shared and must
not be edited). The evaluator of the first months asked for figures of an
illustrated album, not mannequins: jointed arms with a real elbow, hands with
fingers that grip, legs with a knee and a foot, a torso with a waist and
folds, and faces worked in sepia pencil (lids, nose, lips, cheeks).

Everything is in BASE UNITS (1485 x 850 sheet), like acuarela.py.

    cabeza2(lz, x, y, r, ...)            tender face, 3/4 turn, sepia pencil
    mano2(lz, x, y, ang, tam, ...)       hand with fingers (open, grip, relaxed, point, pinch)
    brazo2(lz, hombro, codo, muneca, ...) jointed arm + sleeve + hand
    pierna2(lz, cadera, rodilla, tobillo, ...) jointed leg + trouser/skin + foot
    torso2(lz, hi, hd, ci, cd, ...)       shirt with waist, shade and folds
    cuello(lz, ...)                       neck with the shadow under the chin
    sombra_lado(lz, trazo, lado, ...)     shade glaze along one side of a limb
"""
from __future__ import annotations

import math
import numpy as np

from acuarela import (Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, rgb,
                      _lapiz_de, flor_simple, remuestrea)

SEPIA = '#6b4433'        # face pencil
SEPIA_OSC = '#4a2e24'


def _v(a):
    return np.asarray(a, np.float64)


def _dir(ang):
    a = math.radians(ang)
    return np.array([math.cos(a), math.sin(a)])


def piel_lapiz(piel):
    """Warm sepia pencil that belongs to a skin tone."""
    return tuple(mezcla(piel, SEPIA_OSC, 0.62).tolist())


def piel_sombra(piel):
    return tuple(mezcla(piel, '#9a4a3a', 0.45).tolist())


# ---------------------------------------------------------------- shading helpers

def sombra_lado(lz, f, lado=1, color='#9a5a4a', dens=0.3, frac=0.32, suave=3.0):
    """Glaze a shadow along one side of a Trazo (lado=+1 / -1 picks the side)."""
    if not hasattr(f, 'w'):
        return
    p = np.asarray(f.p)
    if len(p) < 3:
        return
    tg = np.gradient(p, axis=0)
    tg /= np.maximum(np.hypot(*tg.T)[:, None], 1e-9)
    nr = np.stack([-tg[:, 1], tg[:, 0]], 1)
    off = p + nr * (f.w[:, None] * frac * lado)
    w = f.w * 0.45
    step = max(1, len(p) // 8)
    lz.aguada(Trazo(off[::step], tuple(w[::step]), suave=True) & f, color, dens=dens, suave=suave, gran=0.3)


# ---------------------------------------------------------------- hands

def _rot(d, n, t):
    """Unit vector turned from d toward n by t degrees."""
    t = math.radians(t)
    v = d * math.cos(t) + n * math.sin(t)
    return v / max(np.linalg.norm(v), 1e-9)


def mano2(lz, x, y, ang, tam, piel='piel2', gesto='abierta', lado=1, abre=1.0, tapa=1, semilla=None,
          lapiz=None):
    """A hand with fingers, seen from the back. (x, y) = wrist; ang = the
    direction the fingers point (degrees, 0 = right, 90 = down); tam =
    wrist-to-fingertip length (units). lado = +1 / -1 chooses on which side
    the thumb sits (mirror it for the other hand). gesto: 'abierta' (spread),
    'relajada' (soft curve), 'agarra' (wraps round a handle), 'senala'
    (index out), 'pinza' (thumb and index meet on something small).
    Returns the fingertip points {'pulgar', 'indice', 'corazon', ...} and 'palma'."""
    d = _dir(ang)
    n = np.array([-d[1], d[0]]) * lado          # toward the thumb
    c = np.array([x, y], np.float64)
    P = lambda u, v: c + d * (u * tam) + n * (v * tam)
    palma = Poligono([P(0.0, -0.15), P(0.06, -0.18), P(0.4, -0.2), P(0.5, -0.16), P(0.53, 0.0),
                      P(0.5, 0.15), P(0.3, 0.19), P(0.08, 0.16)])
    curl = dict(abierta=(4, 3), relajada=(16, 14), agarra=(75, 70), senala=(75, 70), pinza=(28, 30))[gesto]
    spread = dict(abierta=7, relajada=3, agarra=0, senala=1, pinza=2)[gesto] * abre
    largos = [0.4, 0.45, 0.42, 0.33]
    vs = [0.12, 0.04, -0.045, -0.125]
    us = [0.49, 0.52, 0.5, 0.46]
    nombres = ['indice', 'corazon', 'anular', 'menique']
    dedos, puntas, lineas = [], {}, []
    for i in range(4):
        c1, c2 = curl
        if (gesto == 'senala' and i == 0):
            c1, c2 = 3, 2
        if gesto == 'pinza' and i == 0:
            c1, c2 = 35, 40
        base = P(us[i], vs[i])
        dv = _rot(d, n, (1.5 - i) * spread)
        segs = [largos[i] * 0.46, largos[i] * 0.31, largos[i] * 0.25]
        pts = [base]
        t = 0
        for k, sL in enumerate(segs):
            cc = c1 if k == 0 else c2
            t += cc
            fsh = 1 - 0.5 * min(1, cc / 75.0)
            pts.append(pts[-1] + _rot(dv, n, -t) * sL * tam * fsh)
        w = tam * 0.1 * (0.9 if i == 3 else 1.0)
        dedos.append(Trazo(pts, (w * 1.05, w, w * 0.92, w * 0.82), suave=True))
        puntas[nombres[i]] = pts[-1]
        lineas.append(np.asarray(dedos[-1].p))
    if gesto in ('agarra', 'senala'):
        tp = [P(0.1, 0.15), P(0.28, 0.24), P(0.44, 0.17), P(0.52, 0.06)]
    elif gesto == 'pinza':
        tp = [P(0.1, 0.15), P(0.3, 0.27), puntas['indice'] * 0.5 + P(0.62, 0.2) * 0.5, puntas['indice']]
    else:
        q = c + _rot(d, n, 26 + 10 * abre) * tam * 0.5
        tp = [P(0.12, 0.13), P(0.27, 0.24) * 0.6 + q * 0.4, q]
    pulgar = Trazo(tp, (tam * 0.15, tam * 0.13, tam * 0.1), suave=True)
    puntas['pulgar'] = np.asarray(tp[-1])
    forma = palma
    for f in dedos:
        forma = forma | f
    lp = lapiz or piel_lapiz(piel)
    lz.aguada(forma, piel, dens=0.58, tapa=tapa, irreg=0.3, borde=0.5, gran=0.2, semilla=semilla,
              toques=[(*P(0.3, -0.1), tam * 0.3, piel_sombra(piel), 0.4)])
    lz.contorno(forma, lp, grosor=0.7, presion=0.55, cortes=0.15, desfase=0.12, min_len=3)
    # the gaps between fingers
    tr = []
    for i in range(3):
        a_, b_ = lineas[i], lineas[i + 1]
        m = min(len(a_), len(b_))
        g = (a_[:m] + b_[:m]) / 2
        L = np.r_[0, np.cumsum(np.hypot(*np.diff(g, axis=0).T))]
        tr.append(g[(L > tam * 0.06) & (L < L[-1] * 0.92)])
    lz.lapiz([t_ for t_ in tr if len(t_) > 2], lp, grosor=0.6, presion=0.5, temblor=0.02)
    # knuckles and nails
    for i in range(4):
        q = lineas[i][len(lineas[i]) // 3]
        lz.lapiz([[q - n * tam * 0.025, q + n * tam * 0.02]], lp, grosor=0.45, presion=0.3, temblor=0.02)
        if gesto in ('abierta', 'relajada', 'senala') and (gesto != 'senala' or i == 0):
            tip = lineas[i][-1]
            lz.aguada(Elipse(tip[0], tip[1], tam * 0.035, tam * 0.03), '#f6d6c8', dens=0.35, irreg=0.1)
    # the thumb lies over the palm
    lz.aguada(pulgar, piel, dens=0.6, tapa=tapa, irreg=0.3, borde=0.5, gran=0.2,
              toques=[(*tp[0], tam * 0.15, piel_sombra(piel), 0.4)])
    lz.contorno(pulgar, lp, grosor=0.7, presion=0.55, cortes=0.1, desfase=0.1, min_len=3)
    lz.aguada(Elipse(*P(0.47, 0.0), tam * 0.12, tam * 0.07, ang), '#e98a86', dens=0.15, suave=tam * 0.05)
    puntas['palma'] = P(0.3, 0.0)
    return puntas


# ---------------------------------------------------------------- limbs

def manga_poly(a, b, w0, w1):
    """A sleeve (or trouser leg) from a to b: rounded where it joins the body,
    a straight open hem at b, slightly flared."""
    a, b = _v(a), _v(b)
    d = b - a
    L = max(np.linalg.norm(d), 1e-6)
    d /= L
    n = np.array([-d[1], d[0]])
    top = arco(a[0], a[1], w0 / 2, w0 / 2, 0, 180, 12, math.degrees(math.atan2(d[1], d[0])) + 90)
    pts = list(top) + [b - n * w1 / 2 + d * w1 * 0.04, b + n * w1 / 2 - d * w1 * 0.04]
    return Poligono(pts, suave=False)


def _union_miembro(a, b, c, w_a, w_b, w_c, carne=1.0):
    """Two tapered segments a-b and b-c with a rounded joint at b."""
    a, b, c = _v(a), _v(b), _v(c)
    m1 = a + (b - a) * 0.45
    m2 = b + (c - b) * 0.42
    s1 = Trazo([a, m1, b], (w_a, w_a * (1.0 + 0.06 * carne), w_b), suave=True)
    s2 = Trazo([b, m2, c], (w_b * 0.96, w_b * (1.0 + 0.1 * carne), w_c), suave=True)
    nudo = Elipse(b[0], b[1], w_b * 0.5)
    return s1, s2, (s1 | s2 | nudo)


def brazo2(lz, hombro, codo, muneca, w, manga='#5f86c0', piel='piel2', largo_manga='larga',
           mano=None, sombra=1, tapa=1, pliegues=True, puno=None):
    """A jointed arm. w = width at the shoulder (units). largo_manga: 'larga',
    'corta', 'sin' (bare), 'tres' (three-quarter). mano = dict for mano2
    (ang, tam, gesto, lado, ...) or None. sombra = +1/-1 side of the shade."""
    h, e, wr = map(_v, (hombro, codo, muneca))
    lp_m = _lapiz_de(manga, 0.5)
    lp_p = piel_lapiz(piel)
    s1, s2, todo = _union_miembro(h, e, wr, w, w * 0.78, w * 0.58)
    if largo_manga == 'larga':
        lz.aguada(todo, manga, dens=0.74, tapa=tapa, borde=0.6, gran=0.3)
        sombra_lado(lz, s1, sombra, mezcla(manga, '#2a1a30', 0.5), dens=0.28)
        sombra_lado(lz, s2, sombra, mezcla(manga, '#2a1a30', 0.5), dens=0.28)
        lz.contorno(todo, lp_m, grosor=0.85, presion=0.55, cortes=0.25)
        # cuff
        dd = wr - e
        dd /= max(np.linalg.norm(dd), 1e-6)
        cf = Trazo([wr - dd * w * 0.32, wr - dd * w * 0.02], (w * 0.66, w * 0.68))
        lz.aguada(cf, puno or mezcla(manga, '#2a1a30', 0.25), dens=0.6, tapa=0.3, irreg=0.3)
        if pliegues:
            v = h - e
            v /= max(np.linalg.norm(v), 1e-6)
            u = wr - e
            u /= max(np.linalg.norm(u), 1e-6)
            bis = v + u
            if np.linalg.norm(bis) > 1e-3:
                bis /= np.linalg.norm(bis)
                tr = []
                for k in (-1, 0, 1):
                    p0 = e + bis * w * 0.18 + (v - u) * k * w * 0.12
                    tr.append([p0, p0 + bis * w * 0.28 + (v - u) * w * 0.05])
                lz.lapiz(tr, lp_m, grosor=0.6, presion=0.35, temblor=0.3)
    else:
        lz.aguada(todo, piel, dens=0.58, tapa=tapa, borde=0.5, gran=0.2)
        sombra_lado(lz, s1, sombra, piel_sombra(piel), dens=0.3)
        sombra_lado(lz, s2, sombra, piel_sombra(piel), dens=0.3)
        lz.contorno(todo, lp_p, grosor=0.75, presion=0.5, cortes=0.25)
        # elbow crease
        lz.lapiz([[e + (wr - e) * 0.04, e + (wr - e) * 0.1 + np.array([1.5, 1.0])]], lp_p, grosor=0.5, presion=0.3)
        if largo_manga in ('corta', 'tres'):
            hasta = 0.6 if largo_manga == 'corta' else 1.25
            if hasta <= 1:
                q = h + (e - h) * hasta
                sl = manga_poly(h - (e - h) * 0.1, q, w * 1.25, w * 1.45)
            else:
                q = e + (wr - e) * (hasta - 1)
                sl = Trazo([h, e, q], (w * 1.12, w * 0.95, w * 0.92))
                sl = sl | manga_poly(e, q, w * 0.95, w * 1.0)
            lz.aguada(sl, manga, dens=0.74, tapa=1, borde=0.6, gran=0.3)
            sombra_lado(lz, sl, sombra, mezcla(manga, '#2a1a30', 0.5), dens=0.25)
            lz.contorno(sl, lp_m, grosor=0.85, presion=0.55, cortes=0.25)
    if mano is not None:
        mk = dict(mano)
        an = mk.pop('ang', None)
        if an is None:
            v = wr - e
            an = math.degrees(math.atan2(v[1], v[0]))
        tm = mk.pop('tam', w * 1.8)
        return mano2(lz, wr[0], wr[1], an, tm, piel, **mk)
    return None


def pie(lz, tobillo, ang, tam, color='#7a5544', descalzo=False, piel='piel2', tapa=1, alto=0.42):
    """A foot from the ankle pointing toward ang (0 = right). tam = length."""
    t = _v(tobillo)
    d = _dir(ang)
    # 'down' perpendicular toward the floor (positive y)
    n = np.array([-d[1], d[0]])
    if n[1] < 0:
        n = -n
    P = lambda u, v: t + d * (u * tam) + n * (v * tam)
    f = Poligono([P(-0.22, -0.12), P(-0.24, alto * 0.55), P(-0.1, alto * 0.8), P(0.4, alto * 0.82),
                  P(0.78, alto * 0.78), P(0.86, alto * 0.55), P(0.7, alto * 0.25), P(0.35, 0.02), P(0.08, -0.14)])
    if descalzo:
        lz.aguada(f, piel, dens=0.58, tapa=tapa, irreg=0.35, borde=0.5,
                  toques=[(*P(0.0, 0.2), tam * 0.3, piel_sombra(piel), 0.4)])
        lp = piel_lapiz(piel)
        lz.contorno(f, lp, grosor=0.7, presion=0.5, cortes=0.2, desfase=0.15)
        tr = []
        for k in range(4):
            q = P(0.7 - k * 0.06, alto * (0.5 + k * 0.08))
            tr.append([q, q + d * tam * 0.06])
        lz.lapiz(tr, lp, grosor=0.45, presion=0.3)
    else:
        lz.aguada(f, color, dens=0.75, tapa=tapa, irreg=0.35, borde=0.6,
                  toques=[(*P(0.6, 0.1), tam * 0.25, mezcla(color, '#ffffff', 0.3), 0.5)])
        lz.contorno(f, _lapiz_de(color, 0.45), grosor=0.75, presion=0.55, cortes=0.15, desfase=0.15)
        lz.lapiz([[P(-0.22, alto * 0.72), P(0.84, alto * 0.7)]], _lapiz_de(color, 0.4), grosor=0.6,
                 presion=0.4)
    return f


def pierna2(lz, cadera, rodilla, tobillo, w, pantalon=None, piel='piel2', pie_ang=0, zapato='#7a5544',
            descalzo=False, sombra=1, tapa=1, pie_tam=None, bajo=None):
    """A jointed leg. w = thigh width at the hip. pantalon = cloth colour or
    None (bare leg). bajo: 'corto' rolls the trousers to mid-calf."""
    c, k, a = map(_v, (cadera, rodilla, tobillo))
    s1, s2, todo = _union_miembro(c, k, a, w, w * 0.62, w * 0.42, carne=1.4)
    pie(lz, a, pie_ang, pie_tam or w * 1.45, zapato, descalzo, piel, tapa=tapa)
    if pantalon and bajo != 'corto':
        s1, s2, todo = _union_miembro(c, k, a + (a - k) * 0.02, w * 1.06, w * 0.8, w * 0.66, carne=0.4)
        lz.aguada(todo, pantalon, dens=0.74, tapa=tapa, borde=0.6, gran=0.35)
        sombra_lado(lz, s1, sombra, mezcla(pantalon, '#1a1a30', 0.5), dens=0.3)
        sombra_lado(lz, s2, sombra, mezcla(pantalon, '#1a1a30', 0.5), dens=0.3)
        lp = _lapiz_de(pantalon, 0.5)
        lz.contorno(todo, lp, grosor=0.85, presion=0.55, cortes=0.25)
        v = c - k
        v /= max(np.linalg.norm(v), 1e-6)
        lz.lapiz([[k + v * w * 0.3, k - v * w * 0.1 + np.array([w * 0.15, 0])],
                  [k + v * w * 0.5 + np.array([w * 0.1, 0]), k + v * w * 0.2 + np.array([w * 0.25, 0])]],
                 lp, grosor=0.6, presion=0.35, temblor=0.3)
    else:
        lz.aguada(todo, piel, dens=0.56, tapa=tapa, borde=0.5, gran=0.2)
        sombra_lado(lz, s1, sombra, piel_sombra(piel), dens=0.28)
        sombra_lado(lz, s2, sombra, piel_sombra(piel), dens=0.28)
        lz.contorno(todo, piel_lapiz(piel), grosor=0.75, presion=0.5, cortes=0.25)
        if pantalon and bajo == 'corto':
            q = k + (a - k) * 0.35
            sl = Trazo([c, k, q], (w * 1.08, w * 0.84, w * 0.8))
            lz.aguada(sl, pantalon, dens=0.74, tapa=1, borde=0.6, gran=0.35)
            sombra_lado(lz, sl, sombra, mezcla(pantalon, '#1a1a30', 0.5), dens=0.3)
            lz.contorno(sl, _lapiz_de(pantalon, 0.5), grosor=0.85, presion=0.55, cortes=0.25)
    return todo


# ---------------------------------------------------------------- torso and neck

def torso2(lz, hi, hd, ci, cd, color, cintura=0.86, escote='redondo', sombra=1, toques=None, tapa=1,
           pliegues=None, lapiz=None, dens=0.76):
    """Shirt from the two shoulders and two hips, with a waist, a shade side
    and pencil folds. pliegues: list of polylines (units) for folds."""
    hi, hd, ci, cd = map(_v, (hi, hd, ci, cd))
    m = (hi + hd) / 2
    w = np.linalg.norm(hd - hi)
    wi = (hi * 0.42 + ci * 0.58)
    wd = (hd * 0.42 + cd * 0.58)
    mc = (wi + wd) / 2
    wi = mc + (wi - mc) * cintura
    wd = mc + (wd - mc) * cintura
    up = (m - (ci + cd) / 2)
    up /= max(np.linalg.norm(up), 1e-6)
    side = (hd - hi) / max(w, 1e-6)
    esc = 0.3 if escote == 'v' else 0.1
    pts = [m - side * w * 0.2 + up * w * 0.07, hi + up * w * 0.01, hi - side * w * 0.05 - up * w * 0.12,
           hi - side * w * 0.03 - up * w * 0.32, wi, ci, (ci + cd) / 2 - up * w * 0.02, cd, wd,
           hd + side * w * 0.03 - up * w * 0.32, hd + side * w * 0.05 - up * w * 0.12, hd + up * w * 0.01,
           m + side * w * 0.2 + up * w * 0.07, m + side * w * 0.1 - up * w * esc * 0.7, m - up * w * esc,
           m - side * w * 0.1 - up * w * esc * 0.7]
    f = Poligono(pts)
    lz.aguada(f, color, dens=dens, tapa=tapa, toques=toques, borde=0.6, gran=0.3)
    # shade glaze on one flank
    sidev = side * sombra
    flank = Poligono([m + sidev * w * 0.15 + up * w * 0.03, m + sidev * w * 0.6, mc + sidev * w * 0.5,
                      (ci + cd) / 2 + sidev * w * 0.55, (ci + cd) / 2 + sidev * w * 0.12])
    lz.aguada(flank & f, mezcla(color, '#2a1a30', 0.5), dens=0.26, suave=6, gran=0.3)
    lp = lapiz or _lapiz_de(color, 0.5)
    lz.contorno(f, lp, grosor=0.9, presion=0.55, cortes=0.3)
    if pliegues:
        lz.lapiz([spline(p) if len(p) > 2 else np.asarray(p) for p in pliegues], lp, grosor=0.65, presion=0.35,
                 temblor=0.4)
    return f


def cuello(lz, cabeza_xy, r, base, piel='piel2', ancho=0.48):
    """Neck from under the head to the collar, shadowed under the chin."""
    hx, hy = cabeza_xy
    b = _v(base)
    f = Trazo([(hx, hy + r * 0.55), ((hx + b[0]) / 2, (hy + r * 0.55 + b[1]) / 2), b],
              (r * ancho, r * ancho * 1.02, r * ancho * 1.12))
    lz.aguada(f, piel, dens=0.6, tapa=1, irreg=0.4, borde=0.3,
              toques=[(hx, hy + r * 0.9, r * 0.45, piel_sombra(piel), 0.7)])
    return f


# ---------------------------------------------------------------- the head

def cabeza2(lz, x, y, r, piel='piel2', pelo='#5a3a2a', peinado='corto', giro=0.0, inclina=0.0,
            ojos='abiertos', boca='sonrisa', mira=(0, 0), barba=None, canas=False, gafas=False,
            adorno=None, mejillas=0.5, semilla=None, pendiente=None):
    """A tender picture-book head worked in sepia pencil.
    giro -1..1 turns the face (3/4 view; + looks to the viewer's right);
    inclina = tilt in degrees; ojos: 'abiertos' | 'cerrados' (happy arcs) |
    'abajo' (lids lowered, looking down) | 'dormidos'; boca: 'sonrisa' |
    'abierta' | 'suave' | 'risa'; peinado: 'corto', 'rizado', 'mono', 'largo',
    'coleta', 'calvo', 'ondas', 'trenza', 'afro', 'panuelo'."""
    sem = lz._sem(semilla)
    rng = np.random.default_rng(sem)
    ca, sa = math.cos(math.radians(inclina)), math.sin(math.radians(inclina))

    def R(dx, dy):
        return np.array([x + dx * ca - dy * sa, y + dx * sa + dy * ca])

    rx = r * 0.84
    lp = piel_lapiz(piel)
    pl = _lapiz_de(pelo, 0.55) if not canas else '#8a8078'
    g = giro
    sd_sombra = -1 if g >= 0 else 1      # the far side of the face is in shade

    # --- hair behind
    if peinado in ('largo', 'ondas', 'trenza', 'panuelo', 'afro'):
        if peinado == 'afro':
            cs = [(*R(math.cos(a) * rx * 1.28 - g * r * 0.15, math.sin(a) * r * 1.2 - r * 0.15), r * rng.uniform(0.38, 0.48))
                  for a in np.radians(np.linspace(150, 390, 12))]
            f = Circulos(cs)
        elif peinado == 'trenza':
            f = Poligono([R(-rx * 1.08, -r * 0.2), R(-rx * 1.12, r * 0.6), R(0, r * 0.5), R(rx * 1.12, r * 0.6),
                          R(rx * 1.08, -r * 0.2), R(0, -r * 1.15)])
        elif peinado == 'panuelo':
            f = Poligono([R(-rx * 1.18, -r * 0.3), R(-rx * 1.3, r * 0.7), R(-rx * 1.4, r * 1.5), R(0, r * 1.7),
                          R(rx * 1.4, r * 1.5), R(rx * 1.3, r * 0.7), R(rx * 1.18, -r * 0.3), R(0, -r * 1.2)])
        else:
            L = 1.75 if peinado == 'largo' else 1.15
            f = Poligono([R(-rx * 1.12, -r * 0.2), R(-rx * 1.28, r * 0.8), R(-rx * 1.05, r * L), R(0, r * (L - 0.15)),
                          R(rx * 1.05, r * L), R(rx * 1.28, r * 0.8), R(rx * 1.12, -r * 0.2), R(0, -r * 1.2)])
        lz.aguada(f, pelo, dens=0.8 if not canas else 0.42, borde=0.6, gran=0.4, tapa=1,
                  toques=[(*R(-g * r * 0.5, -r * 0.6), r * 0.6, mezcla(pelo, '#ffffff', 0.25), 0.45)])
        lz.contorno(f, pl, grosor=0.8, presion=0.5, cortes=0.35)
        if peinado in ('largo', 'ondas'):
            st = []
            for k in range(9):
                sx = rng.uniform(-1.1, 1.1)
                st.append(bezier(R(rx * sx * 0.9, -r * 0.2), R(rx * sx * 1.15, r * 0.5),
                                 R(rx * sx * 1.0, r * (L - 0.2) * rng.uniform(0.8, 1.0))))
            lz.lapiz(st, pl, grosor=0.6, presion=0.35, temblor=0.4, cortes=0.25)
    if peinado == 'mono':
        b = R(-g * r * 0.35, -r * 1.08)
        f = Elipse(b[0], b[1], r * 0.46, r * 0.4)
        lz.aguada(f, pelo, dens=0.8 if not canas else 0.45, tapa=1, borde=0.6)
        lz.contorno(f, pl, grosor=0.8, presion=0.5, cortes=0.3)
        lz.lapiz([arco(b[0], b[1], r * 0.3, r * 0.25, 200 + 40 * k, 320 + 40 * k, 10) for k in range(3)], pl,
                 grosor=0.55, presion=0.35)
    if peinado == 'coleta':
        sdc = -1 if g >= 0 else 1
        f = Trazo([R(sdc * rx * 0.7, -r * 0.7), R(sdc * rx * 1.45, -r * 0.4), R(sdc * rx * 1.7, r * 0.4),
                   R(sdc * rx * 1.55, r * 1.0)], (r * 0.42, r * 0.5, r * 0.36, r * 0.1))
        lz.aguada(f, pelo, dens=0.8, tapa=1, borde=0.6)
        lz.contorno(f, pl, grosor=0.8, presion=0.5, cortes=0.3)
    # --- ears
    for s in (-1, 1):
        if g * s > 0.5:
            continue
        e = R(s * rx * (0.97 - 0.3 * max(0, -g * s)) + g * r * 0.05, r * 0.1)
        f = Elipse(e[0], e[1], r * 0.15, r * 0.21, inclina)
        lz.aguada(f, piel, dens=0.62, tapa=1, irreg=0.3, gran=0.2,
                  toques=[(e[0], e[1], r * 0.12, piel_sombra(piel), 0.5)])
        lz.contorno(f, lp, grosor=0.6, presion=0.45, cortes=0.2, desfase=0.1)
        lz.lapiz([arco(e[0], e[1], r * 0.08, r * 0.12, 200 if s < 0 else -20, 340 if s < 0 else 120, 8)], lp,
                 grosor=0.5, presion=0.3)
        if pendiente:
            lz.aguada(Elipse(e[0], e[1] + r * 0.27, r * 0.06), pendiente, dens=0.9, irreg=0.1, tapa=1)
    # --- face shape (jaw narrows; far side compressed)
    sh = g * r * 0.1
    face = Poligono([R(-rx + sh * (1 + max(0, g)), -r * 0.15), R(-rx * 0.94 + sh, r * 0.42),
                     R(-rx * 0.55 + sh * 2, r * 0.84), R(sh * 3.2, r * 1.0), R(rx * 0.55 + sh * 2, r * 0.84),
                     R(rx * 0.94 + sh, r * 0.42), R(rx + sh * (1 - min(0, g)), -r * 0.15), R(rx * 0.8, -r * 0.78),
                     R(0, -r * 1.0), R(-rx * 0.8, -r * 0.78)])
    tq = [(*R(sd_sombra * rx * 0.85, r * 0.25), r * 0.55, piel_sombra(piel), 0.5),
          (*R(g * r * 0.3, r * 0.95), r * 0.35, piel_sombra(piel), 0.35),
          (*R(-sd_sombra * rx * 0.3, -r * 0.35), r * 0.5, mezcla(piel, '#fff3e0', 0.35), 0.5)]
    lz.aguada(face, piel, dens=0.56, borde=0.45, irreg=0.5, gran=0.22, var=0.25, tapa=1, toques=tq)
    # shade side glaze (veladura)
    lz.aguada(face, piel_sombra(piel), dens=0.22, borde=0.2, gran=0.3,
              desvanece=(*R(sd_sombra * rx, r * 0.2), *R(-sd_sombra * rx * 0.1, r * 0.1)))
    fx = g * r * 0.34     # horizontal centre line of the features
    # cheeks
    if mejillas:
        for s in (-1, 1):
            if g * s > 0.75:
                continue
            k = 1 - 0.35 * max(0, g * s)
            q = R(fx + s * r * 0.44 * k, r * 0.4)
            lz.aguada(Elipse(q[0], q[1], r * 0.2 * k, r * 0.14, inclina), '#ea707a', dens=0.42 * (mejillas / 0.5),
                      suave=r * 0.09, gran=0.1)
    # --- eyes
    ey = r * 0.1
    ex = r * 0.31
    for s in (-1, 1):
        k = 1 - 0.38 * max(0, g * s)       # far eye narrower
        cxy = R(fx + s * ex * k, ey)
        w = r * 0.13 * k
        if ojos == 'abiertos':
            mx, my = mira
            iris = Elipse(cxy[0] + mx * r * 0.04, cxy[1] + my * r * 0.03 + r * 0.01, r * 0.085 * k, r * 0.1, inclina)
            lz.aguada(iris, '#4a2e24', dens=1.2, borde=0.3, irreg=0.1, gran=0.1)
            lz.aguada(Elipse(cxy[0] + mx * r * 0.04, cxy[1] + my * r * 0.03 + r * 0.02, r * 0.045 * k, r * 0.05),
                      '#1e120e', dens=1.1, irreg=0.05)
            lz.gouache(Elipse(cxy[0] + mx * r * 0.04 + r * 0.025, cxy[1] + my * r * 0.03 - r * 0.025,
                              max(0.45, r * 0.026)), '#fffdf6', alfa=0.95, irreg=0)
            # upper lid: a firm sepia arc with a lash flick outward
            lid = arco(cxy[0], cxy[1] + r * 0.03, w * 1.05, r * 0.12, 195, 345, 14, inclina)
            out = lid[-1] if s > 0 else lid[0]
            flick = out + np.array([s * r * 0.05, -r * 0.03])
            lz.lapiz([lid, [out, flick]], SEPIA_OSC, grosor=1.0, presion=0.85, temblor=0.05, puntas=0.25)
            lz.lapiz([arco(cxy[0], cxy[1] - r * 0.02, w * 1.0, r * 0.13, 210, 330, 10, inclina)], lp,
                     grosor=0.5, presion=0.3, temblor=0.05)       # lid crease
            lz.lapiz([arco(cxy[0], cxy[1] + r * 0.02, w * 0.8, r * 0.08, 30, 150, 10, inclina)], lp,
                     grosor=0.45, presion=0.25, temblor=0.05)     # lower lid
        elif ojos in ('cerrados', 'dormidos'):
            if ojos == 'cerrados':
                a_ = arco(cxy[0], cxy[1] + r * 0.05, w, r * 0.08, 200, 340, 14, inclina)
            else:
                a_ = arco(cxy[0], cxy[1] - r * 0.01, w, r * 0.06, 20, 160, 14, inclina)
            lz.lapiz([a_], SEPIA_OSC, grosor=1.0, presion=0.85, temblor=0.05, puntas=0.3)
            lash = [[a_[i], a_[i] + np.array([0, r * 0.045 if ojos == 'dormidos' else -0.0]) +
                     np.array([s * r * 0.02 * (i / 13 - 0.5), r * 0.04])] for i in (4, 8, 12)] if ojos == 'dormidos' else []
            if lash:
                lz.lapiz(lash, SEPIA_OSC, grosor=0.5, presion=0.6, temblor=0.02)
        else:  # abajo
            lid = arco(cxy[0], cxy[1] + r * 0.02, w, r * 0.06, 15, 165, 14, inclina)
            lz.aguada(Elipse(cxy[0], cxy[1] + r * 0.07, r * 0.06 * k, r * 0.035, inclina), '#3b2620', dens=1.0,
                      irreg=0.05)
            lz.lapiz([lid], SEPIA_OSC, grosor=1.0, presion=0.85, temblor=0.05, puntas=0.3)
            lz.lapiz([arco(cxy[0], cxy[1] - r * 0.04, w, r * 0.07, 200, 340, 10, inclina)], lp, grosor=0.5,
                     presion=0.3)
        # eyebrow
        b = R(fx + s * ex * k * 1.05, ey - r * 0.27)
        lz.lapiz([arco(b[0], b[1] + r * 0.07, r * 0.14 * k, r * 0.07, 200, 340, 10, inclina + s * 6)],
                 pl if not canas else '#9a9088', grosor=1.1, presion=0.55, temblor=0.1)
    # --- nose: the bridge on the shade side and a nostril curl
    nx = fx + g * r * 0.12
    n0 = R(nx - sd_sombra * r * 0.05 * 0, r * 0.14)
    tip = R(nx + g * r * 0.06, r * 0.4)
    lz.lapiz([bezier(R(fx + sd_sombra * r * 0.07, ey - r * 0.02), R(nx + sd_sombra * r * 0.08, r * 0.27),
                     R(nx + sd_sombra * r * 0.02 + g * r * 0.04, r * 0.42))], lp, grosor=0.6, presion=0.35,
             temblor=0.05)
    lz.lapiz([arco(tip[0] + g * r * 0.02, tip[1] + r * 0.01, r * 0.075, r * 0.05, -10 + 50 * g, 190 + 50 * g, 12,
                   inclina)], lp, grosor=0.75, presion=0.55, temblor=0.04)
    lz.aguada(Elipse(tip[0], tip[1] - r * 0.02, r * 0.07, r * 0.05), '#e07a70', dens=0.25, suave=r * 0.04)
    # --- mouth
    m = R(fx + g * r * 0.1, r * 0.64)
    if boca in ('abierta', 'risa'):
        ww = r * (0.2 if boca == 'risa' else 0.15)
        hh = r * (0.16 if boca == 'risa' else 0.12)
        mp = Poligono(np.vstack([arco(m[0], m[1] - hh * 0.25, ww, hh * 0.2, 180, 360, 10, inclina),
                                 arco(m[0], m[1] - hh * 0.25, ww * 0.95, hh, 0, 180, 14, inclina)]), suave=False)
        lz.aguada(mp, '#9a3040', dens=0.85, irreg=0.15, borde=0.4, gran=0.05)
        lz.gouache(Poligono(np.vstack([arco(m[0], m[1] - hh * 0.25, ww * 0.8, hh * 0.15, 180, 360, 8, inclina),
                                       arco(m[0], m[1] - hh * 0.2, ww * 0.75, hh * 0.25, 0, 180, 8, inclina)]),
                            suave=False), '#fffaf0', alfa=0.85, irreg=0)
        lz.aguada(Elipse(m[0], m[1] + hh * 0.5, ww * 0.45, hh * 0.25), '#e0606a', dens=0.6, irreg=0.1)
        lz.contorno(mp, '#6e2a2e', grosor=0.65, presion=0.55, cortes=0.05, desfase=0.05)
    else:
        ww = r * (0.19 if boca == 'sonrisa' else 0.12)
        cur = r * (0.09 if boca == 'sonrisa' else 0.04)
        line = arco(m[0], m[1] - cur, ww, cur, 20, 160, 14, inclina)
        lz.aguada(Elipse(m[0], m[1] + r * 0.04, ww * 0.55, r * 0.05, inclina), '#e0707a', dens=0.45, irreg=0.2)
        lz.lapiz([line], '#7a3034', grosor=0.9, presion=0.75, temblor=0.04, puntas=0.3)
        if boca == 'sonrisa':
            lz.lapiz([[line[0] + np.array([-r * 0.02, -r * 0.02]), line[0] + np.array([r * 0.0, r * 0.01])],
                      [line[-1] + np.array([r * 0.02, -r * 0.02]), line[-1] + np.array([0, r * 0.01])]],
                     lp, grosor=0.5, presion=0.35)
    # chin and jaw line on the shade side
    lz.lapiz([arco(*R(fx + g * r * 0.05, r * 0.86), r * 0.12, r * 0.04, 20, 160, 10, inclina)], lp, grosor=0.5,
             presion=0.25)
    # --- hair on top
    hp = None
    part = g * 0.35
    if peinado in ('corto', 'largo', 'ondas', 'mono', 'coleta', 'trenza'):
        hp = Poligono([R(-rx * 1.07, r * 0.2), R(-rx * 1.06, -r * 0.48), R(-rx * 0.55, -r * 1.06), R(rx * 0.3, -r * 1.12),
                       R(rx * 1.02, -r * 0.62), R(rx * 1.08, r * 0.2), R(rx * 0.86, -r * 0.24),
                       R(rx * (0.25 + part), -r * 0.56), R(-rx * (0.45 - part), -r * 0.4), R(-rx * 0.9, -r * 0.08)])
    elif peinado == 'rizado':
        cs = []
        for a in np.linspace(160, 380, 12):
            q = R(math.cos(math.radians(a)) * rx * 1.02, math.sin(math.radians(a)) * r * 1.0 - r * 0.04)
            cs.append((q[0], q[1], r * rng.uniform(0.22, 0.3)))
        for a in np.linspace(215, 325, 4):
            q = R(math.cos(math.radians(a)) * rx * 0.6, math.sin(math.radians(a)) * r * 0.85 - r * 0.14)
            cs.append((q[0], q[1], r * 0.3))
        hp = Circulos(cs)
    elif peinado == 'afro':
        cs = []
        for a in np.linspace(170, 370, 9):
            q = R(math.cos(math.radians(a)) * rx * 0.95, math.sin(math.radians(a)) * r * 0.75 - r * 0.32)
            cs.append((q[0], q[1], r * rng.uniform(0.3, 0.38)))
        hp = Circulos(cs)
    elif peinado == 'calvo':
        hp = (Poligono([R(-rx * 1.04, r * 0.22), R(-rx * 1.0, -r * 0.35), R(-rx * 0.72, -r * 0.52), R(-rx * 0.8, r * 0.05)]) |
              Poligono([R(rx * 1.04, r * 0.22), R(rx * 1.0, -r * 0.35), R(rx * 0.72, -r * 0.52), R(rx * 0.8, r * 0.05)]))
    elif peinado == 'panuelo':
        hp = Poligono([R(-rx * 1.15, r * 0.7), R(-rx * 1.12, -r * 0.5), R(-rx * 0.4, -r * 1.14), R(rx * 0.5, -r * 1.14),
                       R(rx * 1.12, -r * 0.5), R(rx * 1.15, r * 0.7), R(rx * 0.92, r * 0.62), R(rx * 0.86, -r * 0.3),
                       R(0, -r * 0.56), R(-rx * 0.86, -r * 0.3), R(-rx * 0.92, r * 0.62)])
    if hp is not None:
        lz.aguada(hp, pelo, dens=0.8 if not canas else 0.42, borde=0.65, gran=0.4, tapa=1, irreg=0.7,
                  toques=[(*R(-g * r * 0.4 - r * 0.2, -r * 0.8), r * 0.45, mezcla(pelo, '#ffffff', 0.3), 0.5)])
        lz.contorno(hp, pl, grosor=0.8, presion=0.55, cortes=0.35)
        if peinado not in ('calvo', 'panuelo', 'afro'):
            st = []
            for k in range(8):
                a0 = rng.uniform(-0.9, 0.7)
                st.append(bezier(R(rx * a0, -r * 0.98), R(rx * (a0 - 0.25), -r * 0.72), R(rx * (a0 - 0.45), -r * 0.42)))
            lz.lapiz(st, pl, grosor=0.6, presion=0.4, temblor=0.2, cortes=0.3)
        if peinado == 'panuelo':
            lz.lapiz([arco(*R(0, -r * 0.2), rx * 0.9, r * 0.7, 200, 340, 16)], pl, grosor=0.6, presion=0.35)
    if peinado == 'trenza':
        sdc = -1 if g >= 0 else 1
        tr = [R(sdc * rx * 0.85, r * 0.3), R(sdc * rx * 1.05, r * 0.9), R(sdc * rx * 0.95, r * 1.5)]
        for k in range(5):
            t = k / 4
            q = np.asarray(tr[0]) * (1 - t) + np.asarray(tr[2]) * t
            f = Elipse(q[0] + sdc * math.sin(t * 3) * r * 0.1, q[1], r * 0.17, r * 0.13, inclina + 30 * sdc)
            lz.aguada(f, pelo, dens=0.8, tapa=1, irreg=0.3)
            lz.contorno(f, pl, grosor=0.6, presion=0.45)
    if barba:
        b = Poligono([R(-rx * 0.88, r * 0.3), R(-rx * 0.55, r * 1.0), R(fx * 0.3, r * 1.22), R(rx * 0.55, r * 1.0),
                      R(rx * 0.88, r * 0.3), R(rx * 0.42, r * 0.74), R(fx, r * 0.54), R(-rx * 0.42, r * 0.74)])
        lz.aguada(b, barba, dens=0.55, gran=0.45, borde=0.4, irreg=1.0)
        lz.contorno(b, _lapiz_de(barba, 0.55), grosor=0.7, presion=0.4, cortes=0.45)
        st = []
        for k in range(12):
            q = R(rng.uniform(-rx * 0.7, rx * 0.7), rng.uniform(r * 0.7, r * 1.05))
            st.append([q, q + np.array([rng.normal(0, 0.5), r * 0.08])])
        lz.lapiz(st, _lapiz_de(barba, 0.5), grosor=0.5, presion=0.35)
    if gafas:
        for s in (-1, 1):
            k = 1 - 0.38 * max(0, g * s)
            c_ = R(fx + s * ex * k, ey + r * 0.02)
            lz.lapiz([arco(c_[0], c_[1], r * 0.17 * k, r * 0.14, 0, 360, 24, inclina)], '#6a5a52', grosor=0.75,
                     presion=0.6, temblor=0.05)
        a_ = R(fx - ex * (1 - 0.38 * max(0, -g)) + r * 0.16, ey)
        b_ = R(fx + ex * (1 - 0.38 * max(0, g)) - r * 0.16, ey)
        lz.lapiz([bezier(a_, (a_ + b_) / 2 - np.array([0, r * 0.05]), b_)], '#6a5a52', grosor=0.7, presion=0.6)
    if adorno:
        q = R(-rx * 0.72 * (1 if g >= 0 else -1), -r * 0.72)
        flor_simple(lz, q[0], q[1], r * 0.3, adorno)
    # jaw pencil on the shade side and under the chin
    lz.contorno(face, lp, grosor=0.75, presion=0.45, cortes=0.4, desfase=0.3,
                solo=(x - r * 2, y + r * 0.1, x + r * 2, y + r * 2))
    return R(fx, ey)
