"""
figuras_v3.py -- figures with more realism and more professional strokes (2026-11-11).

Eugenio, on June's sunflower: «mejora cómo has pintado a los personajes para que
sea más realista, y trazos más profesionales». The figures of extra_m678 read as
picture-book mannequins: tubes of one width, faces with dot eyes, flat shade.
This kit keeps the same watercolour + coloured-pencil technique (acuarela.py,
public interface only) and changes how the forms are built and lit:

  * ONE LIGHT per figure (`luz`, a unit vector pointing TOWARD the light). Every
    part is modelled the same way: a base wash, a shade glaze that fades from
    the side away from the light, colour-pencil hatching only in the shade, and
    a pencil line that is firm on the shade side and lost on the lit side --
    the way an illustrator draws, instead of one even outline round everything.
  * Anatomical limbs: deltoid, elbow, the forearm swelling below the elbow, a
    narrow wrist; thigh, knee, calf, ankle. Clothes sit a little off the body,
    with folds where the cloth bends (inside the elbow, behind the knee).
  * Heads built on proportions (eye line, nose, mouth, chin), a 3/4 silhouette
    with brow, cheekbone and jaw, almond eyes with white, iris, pupil and catch
    light, a nose with its shadow plane and nostril wing, lips with an upper and
    a lower lip, ears with their fold, hair as a mass with value and strands.

Everything is in BASE UNITS (1485 x 850 sheet), like acuarela.py.
"""
from __future__ import annotations

import math
import numpy as np
from skimage import measure

from acuarela import (Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, rgb, _lapiz_de, _blur,
                      remuestrea, PALETA)
from extra_m678 import mano2, cuello

SEPIA = '#5a3a2c'
SEPIA_OSC = '#3a241c'


def _v(a):
    return np.asarray(a, np.float64)


def _u(a):
    a = _v(a)
    return a / max(np.linalg.norm(a), 1e-9)


def _piel(p):
    return PALETA.get(p, p) if isinstance(p, str) else p


def tono(c, hacia, t):
    return tuple(mezcla(c, hacia, t).tolist())


def sombra_de(color):
    """A shade colour that stays clean: cooler and deeper, never grey mud."""
    return tono(color, '#3a2448', 0.42)


def sombra_piel(piel):
    return tono(_piel(piel), '#8a3a3a', 0.42)


def linea_de(color, osc=0.62):
    return tono(color, '#2a1a14', osc)


# ---------------------------------------------------------------- outlines and light

def _contornos(lz, forma):
    """Closed outlines of a shape (units), from its rendered mask."""
    c = lz._crop(forma.bbox(), 4)
    if c is None:
        return [], None
    x0, y0, x1, y1 = c
    M = _blur(forma.mascara(lz, x0, y0, x1, y1), 0.8 * lz.s)
    Mp = np.pad(M, 1)
    out = []
    for cc in measure.find_contours(Mp, 0.5):
        p = np.stack([cc[:, 1] - 1 + x0 + 0.5, cc[:, 0] - 1 + y0 + 0.5], 1) / lz.s
        if len(p) >= 6:
            out.append(remuestrea(p, 1.2))
    return out, (M, x0, y0)


def linea_luz(lz, forma, color, luz, grosor=0.8, firme=0.8, media=0.42, perdida=0.0, temblor=0.2, semilla=None,
              limite=None):
    """Pencil round a shape, firm where the outline faces away from the light,
    soft at the side, lost (or very faint) where it faces the light.
    limite=(x0,y0,x1,y1) draws only inside that box."""
    L = _u(luz)
    cs, info = _contornos(lz, forma)
    if info is None:
        return
    M, x0, y0 = info
    h, w = M.shape
    grupos = {0: [], 1: [], 2: []}
    for p in cs:
        if limite is not None:
            ok = (p[:, 0] >= limite[0]) & (p[:, 0] <= limite[2]) & (p[:, 1] >= limite[1]) & (p[:, 1] <= limite[3])
        else:
            ok = np.ones(len(p), bool)
        tg = np.gradient(p, axis=0)
        tg /= np.maximum(np.hypot(*tg.T)[:, None], 1e-9)
        nr = np.stack([tg[:, 1], -tg[:, 0]], 1)
        # orient the normals outward: sample the mask just outside
        q = (p + nr * 1.5) * lz.s - (x0, y0)
        qi = np.clip(np.round(q).astype(int), 0, [w - 1, h - 1])
        dentro = M[qi[:, 1], qi[:, 0]] > 0.5
        if dentro.mean() > 0.5:
            nr = -nr
        t = nr @ L
        # smooth the facing value so strokes do not flicker
        t = np.convolve(np.r_[t[-4:], t, t[:4]], np.ones(9) / 9, 'same')[4:-4]
        nivel = np.where(t < -0.15, 0, np.where(t < 0.35, 1, 2))
        nivel[~ok] = -1
        ini = 0
        for i in range(1, len(p) + 1):
            if i == len(p) or nivel[i] != nivel[ini]:
                if nivel[ini] >= 0 and i - ini > 2:
                    grupos[int(nivel[ini])].append(p[max(0, ini - 1):min(len(p), i + 1)])
                ini = i
    sem = lz._sem(semilla)
    if grupos[0]:
        lz.lapiz(grupos[0], color, grosor=grosor * 1.15, presion=firme, temblor=temblor, cortes=0.05, semilla=sem,
                 puntas=0.2)
    if grupos[1]:
        lz.lapiz(grupos[1], color, grosor=grosor * 0.85, presion=media, temblor=temblor, cortes=0.2, semilla=sem + 1,
                 puntas=0.3)
    if grupos[2] and perdida > 0:
        lz.lapiz(grupos[2], color, grosor=grosor * 0.6, presion=perdida, temblor=temblor, cortes=0.55,
                 semilla=sem + 2, puntas=0.4)


def modelar(lz, forma, color, luz, dens=0.66, prof=0.42, sombra=None, linea=None, grosor=0.8, tapa=1, toques=None,
            rayar=True, ang_rayado=None, sep=2.7, reflejo=0.0, brillo=0.0, irreg=0.35, gran=0.25, semilla=None,
            perdida=0.0, firme=0.8, alcance=0.95, dibuja=True):
    """Paint one form lit from `luz`: wash, shade glaze from the far side,
    hatching in the shade, optional reflected light, and the light-aware line."""
    L = _u(luz)
    x0, y0, x1, y1 = forma.bbox()
    c = np.array([(x0 + x1) / 2, (y0 + y1) / 2])
    R = max(x1 - x0, y1 - y0) / 2
    sc = sombra or sombra_de(color)
    lz.aguada(forma, color, dens=dens, tapa=tapa, borde=0.5, irreg=irreg, gran=gran, toques=toques, semilla=semilla)
    p0 = c - L * R * alcance
    p1 = c + L * R * 0.3
    lz.aguada(forma, sc, dens=prof, borde=0.15, irreg=0.3, gran=0.3, desvanece=(*p0, *p1), semilla=semilla)
    # the core of the shade, a little darker and narrower
    lz.aguada(forma, sc, dens=prof * 0.45, borde=0.1, irreg=0.3, gran=0.3,
              desvanece=(*(c - L * R * alcance), *(c - L * R * 0.35)), semilla=None if semilla is None else semilla + 1)
    if reflejo:
        # a little light bounced back into the far edge of the shade
        lz.levanta(forma & Elipse(*(c - L * R * 1.05), R * 0.35), cantidad=reflejo, suave=R * 0.25)
    if brillo:
        lz.aguada(forma, tono(color, '#fff8ec', 0.65), dens=brillo, borde=0.05, irreg=0.2,
                  desvanece=(*(c + L * R * 0.9), *(c + L * R * 0.2)))
    if rayar:
        ang = ang_rayado if ang_rayado is not None else (math.degrees(math.atan2(L[1], L[0])) + 60)
        lz.rayado(forma, linea_de(sc, 0.25), angulo=ang, sep=sep, grosor=0.4, presion=0.22, temblor=0.25,
                  desvanece=(*p0, *c), largo=max(3.0, R * 0.38))
    if dibuja:
        linea_luz(lz, forma, linea or linea_de(color), luz, grosor=grosor, perdida=perdida, firme=firme)


# ---------------------------------------------------------------- limbs

def _segmento(a, b, anchos, n=None):
    a, b = _v(a), _v(b)
    k = len(anchos)
    pts = [a + (b - a) * t for t in np.linspace(0, 1, k)]
    return Trazo(pts, anchos, suave=True)


def brazo_forma(h, e, wr, w):
    """An anatomical bare arm: deltoid, biceps, elbow, forearm swell, wrist."""
    s1 = _segmento(h, e, (w * 1.0, w * 0.98, w * 0.86, w * 0.74, w * 0.66))
    s2 = _segmento(e, wr, (w * 0.64, w * 0.74, w * 0.66, w * 0.54, w * 0.46))
    codo = Elipse(*_v(e), w * 0.34)
    return s1, s2, s1 | s2 | codo


def pierna_forma(c, k, a, w):
    """Thigh, knee, calf swell, ankle."""
    s1 = _segmento(c, k, (w * 1.0, w * 0.96, w * 0.86, w * 0.72, w * 0.64))
    s2 = _segmento(k, a, (w * 0.62, w * 0.7, w * 0.62, w * 0.5, w * 0.4))
    rod = Elipse(*_v(k), w * 0.33)
    return s1, s2, s1 | s2 | rod


def pliegues_codo(lz, h, e, wr, w, color, n=3, fuerza=0.45):
    """Folds that gather inside a bent elbow (or behind a bent knee)."""
    h, e, wr = map(_v, (h, e, wr))
    v, u = _u(h - e), _u(wr - e)
    bis = v + u
    if np.linalg.norm(bis) < 0.2:
        return
    bis = _u(bis)
    tg = _u(v - u)
    tr = []
    for k in range(n):
        o = (k - (n - 1) / 2) * w * 0.22
        p0 = e + bis * w * 0.1 + tg * o
        p1 = e + bis * w * (0.42 + 0.06 * k) + tg * (o * 1.4 + w * 0.06)
        mid = (p0 + p1) / 2 + _v([-(p1 - p0)[1], (p1 - p0)[0]]) * 0.18
        tr.append(bezier(p0, mid, p1, n=12))
    lz.lapiz(tr, color, grosor=0.55, presion=fuerza, temblor=0.2, puntas=0.45)


def brazo3(lz, hombro, codo, muneca, w, manga, piel, luz, largo='larga', mano=None, tapa=1, puno=None,
           semilla=None, linea_piel=None):
    """A jointed, lit arm. largo: 'larga' (long sleeve), 'corta' (T-shirt),
    'sin' (bare). mano: dict for extra_m678.mano2 (ang, tam, gesto, lado...)."""
    h, e, wr = map(_v, (hombro, codo, muneca))
    piel_c = _piel(piel)
    lp = linea_piel or linea_de(piel_c, 0.55)
    s1, s2, brazo = brazo_forma(h, e, wr, w)
    if largo == 'larga':
        t1 = _segmento(h, e, (w * 1.12, w * 1.12, w * 1.04, w * 0.96, w * 0.9))
        t2 = _segmento(e, wr + _u(wr - e) * w * 0.05, (w * 0.88, w * 0.92, w * 0.86, w * 0.8, w * 0.76))
        tela = t1 | t2 | Elipse(*e, w * 0.46)
        modelar(lz, tela, manga, luz, prof=0.4, tapa=tapa, semilla=semilla)
        pliegues_codo(lz, h, e, wr, w, linea_de(manga, 0.5))
        # cuff
        d = _u(wr - e)
        nrm = _v([-d[1], d[0]])
        cf = Poligono([wr - d * w * 0.3 + nrm * w * 0.4, wr + d * w * 0.06 + nrm * w * 0.4,
                       wr + d * w * 0.06 - nrm * w * 0.4, wr - d * w * 0.3 - nrm * w * 0.4], suave=False)
        lz.aguada(cf, puno or tono(manga, '#3a2448', 0.18), dens=0.5, tapa=0.4, irreg=0.2)
        lz.lapiz([[wr - d * w * 0.3 + nrm * w * 0.4, wr - d * w * 0.3 - nrm * w * 0.4]], linea_de(manga, 0.5),
                 grosor=0.5, presion=0.4)
    else:
        modelar(lz, brazo, piel_c, luz, dens=0.56, prof=0.36, sombra=sombra_piel(piel_c), linea=lp, grosor=0.7,
                tapa=tapa, rayar=False, semilla=semilla, reflejo=0.15)
        # the elbow: a small crease and the point of the bone
        lz.lapiz([bezier(e - _u(wr - e) * w * 0.05, e + _u(h - e + wr - e) * w * 0.12, e + _u(wr - e) * w * 0.18,
                         n=8)], lp, grosor=0.5, presion=0.35)
        if largo == 'corta':
            q = h + (e - h) * 0.52
            d = _u(e - h)
            nrm = _v([-d[1], d[0]])
            sl = Poligono([h - d * w * 0.25 + nrm * w * 0.62, q + nrm * w * 0.74 + d * w * 0.04,
                           q - nrm * w * 0.74 - d * w * 0.04, h - d * w * 0.25 - nrm * w * 0.62,
                           h - d * w * 0.55])
            modelar(lz, sl, manga, luz, prof=0.4, tapa=1, semilla=None if semilla is None else semilla + 3)
            # the hem and one fold
            lz.lapiz([bezier(q + nrm * w * 0.66, q + d * w * 0.06, q - nrm * w * 0.66, n=10)], linea_de(manga, 0.55),
                     grosor=0.55, presion=0.45)
            lz.lapiz([bezier(h + d * w * 0.1 + nrm * w * 0.15, h + d * w * 0.3, q - d * w * 0.08 + nrm * w * 0.3,
                             n=10)], linea_de(manga, 0.5), grosor=0.5, presion=0.35)
    if mano is not None:
        mk = dict(mano)
        an = mk.pop('ang', None)
        if an is None:
            v = wr - e
            an = math.degrees(math.atan2(v[1], v[0]))
        tm = mk.pop('tam', w * 1.8)
        puntas = mano2(lz, wr[0], wr[1], an, tm, piel, **mk)
        return puntas
    return None


def zapato3(lz, tobillo, ang, tam, color, luz, tapa=1, suela='#5a4034', semilla=None):
    """A shoe in profile: heel, rounded toe, a sole line, laces."""
    t = _v(tobillo)
    d = _v([math.cos(math.radians(ang)), math.sin(math.radians(ang))])
    n = _v([-d[1], d[0]])
    if n[1] < 0:
        n = -n
    P = lambda u, v: t + d * (u * tam) + n * (v * tam)
    f = Poligono([P(-0.2, -0.16), P(0.12, -0.18), P(0.36, -0.02), P(0.62, 0.06), P(0.84, 0.12), P(0.9, 0.26),
                  P(0.82, 0.36), P(0.3, 0.38), P(-0.2, 0.38), P(-0.27, 0.22), P(-0.26, 0.0)])
    modelar(lz, f, color, luz, dens=0.78, prof=0.38, tapa=tapa, sep=2.0, semilla=semilla)
    lz.lapiz([[P(-0.26, 0.31), P(0.86, 0.3)]], suela, grosor=0.9, presion=0.6)
    lz.lapiz([[P(0.18 + k * 0.08, -0.06 + k * 0.05), P(0.24 + k * 0.08, 0.06 + k * 0.05)] for k in range(3)],
             linea_de(color, 0.5), grosor=0.45, presion=0.45)
    lz.gouache(Trazo([P(0.45, 0.06), P(0.7, 0.12)], (0.6, 0.3)), tono(color, '#ffffff', 0.6), alfa=0.6, irreg=0.1)
    return f


def pierna3(lz, cadera, rodilla, tobillo, w, pantalon, piel, luz, pie_ang=0, zapato='#7a5544', pie_tam=None,
            tapa=1, semilla=None, falda_hasta=None):
    """A lit, jointed leg with trousers (pantalon = colour) or bare (None)."""
    c, k, a = map(_v, (cadera, rodilla, tobillo))
    zapato3(lz, a, pie_ang, pie_tam or w * 1.35, zapato, luz, tapa=tapa)
    if pantalon:
        t1 = _segmento(c, k, (w * 1.08, w * 1.06, w * 1.0, w * 0.9, w * 0.84))
        t2 = _segmento(k, a + _u(a - k) * w * 0.12, (w * 0.84, w * 0.82, w * 0.78, w * 0.74, w * 0.72))
        tela = t1 | t2 | Elipse(*k, w * 0.43)
        modelar(lz, tela, pantalon, luz, prof=0.42, tapa=tapa, semilla=semilla)
        pliegues_codo(lz, c, k, a, w, linea_de(pantalon, 0.5), n=2, fuerza=0.4)
        # the hem breaks over the shoe
        d = _u(a - k)
        nrm = _v([-d[1], d[0]])
        q = a + d * w * 0.12
        lz.lapiz([bezier(q + nrm * w * 0.36, q - d * w * 0.06, q - nrm * w * 0.36, n=10)], linea_de(pantalon, 0.55),
                 grosor=0.6, presion=0.5)
        # a seam down the outside of the leg
        lz.lapiz([bezier(c + nrm * w * 0.3, k + nrm * w * 0.3, a + nrm * w * 0.28, n=14)], linea_de(pantalon, 0.4),
                 grosor=0.4, presion=0.25, temblor=0.3, cortes=0.4)
    else:
        piel_c = _piel(piel)
        s1, s2, forma = pierna_forma(c, k, a, w)
        modelar(lz, forma, piel_c, luz, dens=0.56, prof=0.36, sombra=sombra_piel(piel_c), linea=linea_de(piel_c, 0.55),
                grosor=0.7, tapa=tapa, rayar=False, semilla=semilla, reflejo=0.15)
        # the kneecap
        lz.lapiz([arco(*(k + _u(k - c) * w * 0.05), w * 0.2, w * 0.15, 200, 340, 10)], linea_de(piel_c, 0.5),
                 grosor=0.45, presion=0.3)


# ---------------------------------------------------------------- torso

def torso_forma(hi, hd, ci, cd, cintura=0.9, escote='redondo'):
    hi, hd, ci, cd = map(_v, (hi, hd, ci, cd))
    m = (hi + hd) / 2
    w = np.linalg.norm(hd - hi)
    up = _u(m - (ci + cd) / 2)
    side = _u(hd - hi)
    wi = hi * 0.42 + ci * 0.58
    wd = hd * 0.42 + cd * 0.58
    mc = (wi + wd) / 2
    wi = mc + (wi - mc) * cintura
    wd = mc + (wd - mc) * cintura
    esc = 0.32 if escote == 'v' else 0.17
    pts = [m - side * w * 0.2 + up * w * 0.06, hi + up * w * 0.0, hi - side * w * 0.07 - up * w * 0.1,
           hi - side * w * 0.05 - up * w * 0.34, wi, ci - side * w * 0.02, (ci + cd) / 2 - up * w * 0.03,
           cd + side * w * 0.02, wd, hd + side * w * 0.05 - up * w * 0.34, hd + side * w * 0.07 - up * w * 0.1,
           hd + up * w * 0.0, m + side * w * 0.2 + up * w * 0.06, m + side * w * 0.1 - up * w * esc * 0.7,
           m - up * w * esc, m - side * w * 0.1 - up * w * esc * 0.7]
    return Poligono(pts), dict(m=m, w=w, up=up, side=side, mc=mc)


def torso3(lz, hi, hd, ci, cd, color, luz, cintura=0.9, escote='redondo', tapa=1, toques=None, pliegues=None,
           semilla=None):
    f, g = torso_forma(hi, hd, ci, cd, cintura, escote)
    modelar(lz, f, color, luz, prof=0.42, tapa=tapa, toques=toques, semilla=semilla, alcance=1.0)
    if pliegues:
        lz.lapiz([spline(p) if len(p) > 2 else np.asarray(p) for p in pliegues], linea_de(color, 0.5), grosor=0.55,
                 presion=0.4, temblor=0.25, puntas=0.45)
    return f, g


# ---------------------------------------------------------------- the neck

def cuello3(lz, cabeza_xy, r, base, piel, luz, ancho_base=None, giro=0.0, inclina=0.0):
    """A neck that grows from under the jaw into the shoulders: lit like the rest,
    a soft shadow under the chin, the clavicles barely there. Paint it before the
    shirt and the head."""
    x, y = cabeza_xy
    bx, by = base
    piel_c = _piel(piel)
    a = math.radians(inclina)
    xt = x - math.sin(a) * r * 0.55 + giro * r * 0.08
    yt = y + r * 0.45
    w0 = r * 0.58
    w1 = min((ancho_base or r * 2.3) * 0.62, r * 1.35)
    yb = by + r * 0.05
    f = Poligono([(xt - w0 / 2, yt), (xt - w0 * 0.5, yt + (yb - yt) * 0.6), (bx - w1 * 0.45, yb - r * 0.08),
                  (bx - w1 * 0.75, yb + r * 0.12), (bx - w1 * 0.7, yb + r * 0.55), (bx, yb + r * 0.7),
                  (bx + w1 * 0.7, yb + r * 0.55), (bx + w1 * 0.75, yb + r * 0.12), (bx + w1 * 0.45, yb - r * 0.08),
                  (xt + w0 * 0.5, yt + (yb - yt) * 0.6), (xt + w0 / 2, yt)])
    modelar(lz, f, piel_c, luz, dens=0.56, prof=0.32, sombra=sombra_piel(piel_c), linea=linea_de(piel_c, 0.55),
            grosor=0.6, rayar=False, perdida=0.1)
    lz.aguada(Elipse(xt + giro * r * 0.1, y + r * 1.02, r * 0.36, r * 0.16, inclina), sombra_piel(piel_c), dens=0.42,
              suave=r * 0.07, gran=0.05)
    lz.lapiz([bezier((bx - r * 0.08, yb + r * 0.04), (bx - r * 0.3, yb - r * 0.02), (bx - r * 0.56, yb + r * 0.05), n=10),
              bezier((bx + r * 0.08, yb + r * 0.04), (bx + r * 0.3, yb - r * 0.02), (bx + r * 0.56, yb + r * 0.05), n=10)],
             linea_de(piel_c, 0.5), grosor=0.45, presion=0.25, temblor=0.15, cortes=0.35)
    return f


# ---------------------------------------------------------------- the head

def cabeza3(lz, x, y, r, piel, pelo, peinado, luz, giro=0.0, inclina=0.0, edad='nino', ojos='abiertos',
            boca='suave', mira=(0.0, 0.0), gafas=False, canas=False, pendiente=None, iris='#5a3422', semilla=None):
    """A head with real proportions in 3/4 view.
    giro -1..1 turns the face (+ = toward the viewer's right); inclina tilts it (deg).
    edad: 'nino' | 'adulto' | 'mayor'. ojos: 'abiertos' | 'abajo' (looking down).
    boca: 'suave' (closed, gentle) | 'sonrisa' (lips parted, teeth) | 'risa' (open laugh).
    peinado: 'calvo' | 'afro' | 'corto'."""
    sem = lz._sem(semilla)
    rng = np.random.default_rng(sem)
    piel_c = _piel(piel)
    L = _u(luz)
    ca, sa = math.cos(math.radians(inclina)), math.sin(math.radians(inclina))
    s = 1.0 if giro >= 0 else -1.0
    a = abs(giro)

    def R(u, v):
        return np.array([x + u * r * ca - v * r * sa, y + u * r * sa + v * r * ca])

    nino = edad == 'nino'
    mayor = edad == 'mayor'
    menton = 0.9 if nino else 1.02
    ey = 0.14 if nino else 0.06                       # eye line
    fx = s * a * 0.3                                  # centre line of the features
    lp = linea_de(piel_c, 0.58)
    sp = sombra_piel(piel_c)

    # --- hair behind the head
    if peinado == 'afro':
        cs = []
        for t in np.radians(np.linspace(0, 360, 26, endpoint=False)):
            if 0.42 < math.sin(t):          # nothing hangs below the jaw
                continue
            rr = rng.uniform(0.3, 0.4)
            cs.append((*R(-s * 0.1 + math.cos(t) * 1.04, -0.3 + math.sin(t) * 0.9), rr * r))
        for sd in (-1, 1):                  # full at the sides, level with the ears
            cs.append((*R(-s * 0.1 + sd * 0.98, 0.2), r * 0.3))
        pelo_f = Circulos(cs)
        lz.aguada(pelo_f, pelo, dens=0.9, tapa=1, irreg=0.4, gran=0.35, borde=0.5, semilla=sem)
    if peinado == 'calvo' or mayor:
        # white hair round the back of the skull, from ear to ear
        corona = Poligono([R(-s * 0.86, -0.32), R(-s * 0.97, -0.08), R(-s * 0.98, 0.24), R(-s * 0.84, 0.48),
                           R(-s * 0.76, 0.4), R(-s * 0.86, 0.2), R(-s * 0.84, -0.12), R(-s * 0.74, -0.3)])
        lz.aguada(corona, '#ece8e2', dens=0.55, tapa=1, irreg=0.6, borde=0.4, gran=0.3)
        mech = []
        for k in range(14):
            t = k / 13
            v0 = -0.3 + 0.7 * t
            mech.append(list(bezier(R(-s * (0.8 + 0.06 * math.sin(t * 3)), v0), R(-s * (0.95 + 0.03 * rng.uniform(-1, 1)), v0 + 0.08),
                                    R(-s * (0.86 + 0.06 * rng.uniform(-1, 1)), v0 + 0.2), n=8)))
        lz.lapiz(mech[::2], '#9a928a', grosor=0.4, presion=0.45, temblor=0.2, puntas=0.5)
        lz.lapiz(mech[1::2], '#c8c2ba', grosor=0.4, presion=0.4, temblor=0.2, puntas=0.5)

    # --- face silhouette: the front side shows brow, cheekbone and jaw
    ch = 0.0 if nino else 0.05
    F = [R(s * 0.6, -0.8), R(s * (0.8 + 0.04 * a), -0.32), R(s * (0.76 + 0.03 * a), ey - 0.02),
         R(s * (0.82 + 0.05 * a + ch), ey + 0.18), R(s * (0.72 + ch * 0.4), 0.52), R(s * (0.46 + 0.08 * a), 0.84),
         R(s * (0.12 + 0.16 * a), menton)]
    kb = 0.93 if mayor else 1.0
    B = [R(-s * (0.3 - 0.1 * a), menton - 0.06), R(-s * (0.64 - 0.06 * a + ch), 0.62), R(-s * 0.84 * kb, 0.18),
         R(-s * 0.9 * kb, -0.3), R(-s * 0.68 * kb, -0.82), R(-s * 0.05, -1.0)]
    cara = Poligono(F + B)
    modelar(lz, cara, piel_c, luz, dens=0.55, prof=0.34, sombra=sp, linea=lp, grosor=0.7, rayar=False, semilla=sem + 3,
            reflejo=0.12, alcance=1.05, perdida=0.12, toques=[(*R(fx, 0.3), r * 0.6, tono(piel_c, '#f6dccb', 0.3), 0.4)],
            dibuja=peinado != 'afro')
    if peinado == 'afro':      # the hair covers the top of the head: no pencil line of the skull under it
        linea_luz(lz, cara, lp, luz, grosor=0.7, perdida=0.12, limite=(x - 2 * r, y - 0.3 * r, x + 2 * r, y + 2 * r))
    # planes: under the brow, the far side of the nose, under the cheekbone, under the lip, under the chin
    lz.aguada(Elipse(*R(fx - s * 0.05, ey - 0.06), r * 0.62, r * 0.14, inclina), sp, dens=0.2, suave=r * 0.08, gran=0.2)
    lz.aguada(Poligono([R(s * 0.86, 0.22), R(s * 0.62, 0.62), R(s * 0.42, 0.8), R(s * 0.6, 0.4)]) & cara, sp, dens=0.22,
              suave=r * 0.06)
    # --- the ear (on the back side)
    ex_, ey_ = -s * (0.86 - 0.06 * a) * (0.93 if mayor else 1.0), 0.13
    oreja = Poligono([R(ex_ - s * 0.02, ey_ - 0.2), R(ex_ - s * 0.14, ey_ - 0.16), R(ex_ - s * 0.17, ey_ + 0.02),
                      R(ex_ - s * 0.1, ey_ + 0.2), R(ex_ + s * 0.01, ey_ + 0.24), R(ex_ + s * 0.04, ey_ + 0.04)])
    modelar(lz, oreja, piel_c, luz, dens=0.58, prof=0.35, sombra=sp, linea=lp, grosor=0.6, rayar=False, semilla=sem + 2)
    lz.aguada(Elipse(*R(ex_ - s * 0.07, ey_ + 0.03), r * 0.055, r * 0.09, inclina), sp, dens=0.7, irreg=0.1)
    lz.lapiz([bezier(R(ex_ - s * 0.03, ey_ - 0.13), R(ex_ - s * 0.12, ey_ - 0.08), R(ex_ - s * 0.08, ey_ + 0.12), n=10)],
             lp, grosor=0.5, presion=0.45)
    if pendiente:
        lz.aguada(Elipse(*R(ex_ - s * 0.04, ey_ + 0.3), r * 0.05), pendiente, dens=0.95, tapa=1, irreg=0.1)
        lz.gouache(Elipse(*R(ex_ - s * 0.05, ey_ + 0.28), r * 0.015), '#fff6d8', alfa=0.9, irreg=0)

    # cheeks
    for k in (-1, 1):
        kk = 1 - 0.4 * max(0, k * s * a)
        lz.aguada(Elipse(*R(fx + k * 0.44 * kk, 0.38), r * 0.2 * kk, r * 0.13, inclina), '#e4707a',
                  dens=0.34 if nino else 0.22, suave=r * 0.1, gran=0.1)

    # --- eyes
    def ojo(cx, cy, w, interior):
        """interior = +1 if the inner corner is toward +u."""
        hgt = w * (0.5 if nino else 0.42)
        ic = R(cx + interior * w, cy + 0.01)
        oc = R(cx - interior * w, cy - 0.03)
        top = R(cx - interior * w * 0.1, cy - hgt)
        bot = R(cx + interior * w * 0.05, cy + hgt * 0.55)
        forma = Poligono(list(bezier(ic, R(cx + interior * w * 0.6, cy - hgt * 1.05), top, n=10)) +
                         list(bezier(top, R(cx - interior * w * 0.8, cy - hgt * 0.9), oc, n=10))[1:] +
                         list(bezier(oc, R(cx - interior * w * 0.5, cy + hgt * 0.6), bot, n=10))[1:] +
                         list(bezier(bot, R(cx + interior * w * 0.6, cy + hgt * 0.5), ic, n=10))[1:-1], suave=False)
        # socket shade around the eye
        lz.aguada(Elipse(*R(cx, cy - hgt * 0.4), w * r * 1.35, hgt * r * 1.6, inclina), sp, dens=0.16, suave=w * r * 0.3)
        if ojos == 'abiertos':
            lz.aguada(forma, '#f7efe6', dens=0.55, tapa=1, irreg=0.05, borde=0.2)
            mx, my = mira
            ci = R(cx + mx * w * 0.5, cy - hgt * 0.05 + my * hgt * 0.35)
            ri = hgt * 0.95
            iri = Elipse(ci[0], ci[1], ri * r, ri * r * 1.02) & forma
            lz.aguada(iri, iris, dens=0.95, tapa=1, irreg=0.05, borde=0.4)
            lz.aguada(Elipse(ci[0], ci[1] + ri * r * 0.25, ri * r * 0.9, ri * r * 0.5) & forma, tono(iris, '#d9a46a', 0.35),
                      dens=0.35, irreg=0.05)
            lz.aguada(Elipse(ci[0], ci[1], ri * r * 0.45) & forma, '#140c0a', dens=1.0, tapa=1, irreg=0.02)
            lz.aguada(Poligono(list(bezier(oc, top, ic, n=12)) + list(bezier(ic, R(cx, cy - hgt * 0.72), oc, n=12)),
                               suave=False) & forma, '#5a3a2c', dens=0.2, irreg=0.05)       # lid shadow on the eyeball
            # a small catch light high on the pupil: a big one beside the iris reads as white of the eye
            # and turns the gaze the wrong way
            lz.gouache(Elipse(ci[0] + ri * r * 0.18 * L[0], ci[1] - ri * r * 0.3, max(0.3, ri * r * 0.17)), '#fffdf6',
                       alfa=0.9, irreg=0)
            # upper lid: firm and darkest toward the outer corner, with a few lashes
            lid = list(bezier(ic, R(cx + interior * w * 0.6, cy - hgt * 1.05), top, n=10)) + \
                list(bezier(top, R(cx - interior * w * 0.8, cy - hgt * 0.9), oc, n=10))[1:]
            lz.lapiz([np.asarray(lid)], SEPIA_OSC, grosor=1.0, presion=0.88, temblor=0.03, puntas=0.35)
            if nino:
                lash = []
                for t in (0.62, 0.78, 0.92):
                    i = int(t * (len(lid) - 1))
                    q = np.asarray(lid[i])
                    lash.append([q, q + (R(-interior * 0.05, -0.04) - R(0, 0)) * w * 6])
                lz.lapiz(lash, SEPIA_OSC, grosor=0.5, presion=0.75, temblor=0.02)
            lz.lapiz([list(bezier(oc, R(cx - interior * w * 0.5, cy + hgt * 0.6), bot, n=10)) +
                      list(bezier(bot, R(cx + interior * w * 0.6, cy + hgt * 0.5), ic, n=10))[1:]],
                     lp, grosor=0.45, presion=0.35, temblor=0.03)
        else:   # 'abajo': lids lowered over the eye, looking down
            lz.aguada(forma, sp, dens=0.25, irreg=0.05)
            lid = list(bezier(ic, R(cx, cy + hgt * 0.35), oc, n=14))
            lz.lapiz([np.asarray(lid)], SEPIA_OSC, grosor=1.0, presion=0.88, temblor=0.03, puntas=0.3)
            lz.lapiz([[np.asarray(lid[k]), np.asarray(lid[k]) + (R(0, 0.05) - R(0, 0)) * 1.0] for k in (6, 9, 12)],
                     SEPIA_OSC, grosor=0.45, presion=0.6)
        # lid crease
        lz.lapiz([list(bezier(R(cx + interior * w * 0.7, cy - hgt * 1.0), R(cx, cy - hgt * 1.75),
                              R(cx - interior * w * 1.0, cy - hgt * 1.1), n=10))], lp, grosor=0.5, presion=0.35,
                 temblor=0.04)
        if mayor:
            # crow's feet and the soft bag under the eye
            q = R(cx - interior * w * 1.1, cy)
            lz.lapiz([[q, q + (R(-interior * 0.12, -0.05 + 0.05 * k) - R(0, 0))] for k in range(3)], lp, grosor=0.4,
                     presion=0.3, temblor=0.1)
            lz.lapiz([list(bezier(R(cx + interior * w * 0.6, cy + hgt * 1.3), R(cx, cy + hgt * 2.0),
                                  R(cx - interior * w * 0.8, cy + hgt * 1.2), n=10))], lp, grosor=0.4, presion=0.3)
        # eyebrow: short hairs along an arch
        pc = '#b8b0a6' if (mayor or canas) else tono(pelo, '#000000', 0.15)
        arco_c = [R(cx + interior * w * (1.0 - 2.2 * t),
                    cy - hgt * 2.2 - (0.0 if mayor else 0.035) * (1 - t) - 0.07 * math.sin(t * math.pi * 0.9) + 0.035 * t)
                  for t in np.linspace(0, 1, 6)]
        anch = r * (0.06 if mayor else 0.045)
        lz.aguada(Trazo(arco_c, (anch * 0.9, anch, anch * 0.85, anch * 0.6, anch * 0.35)), pc,
                  dens=0.55 if mayor else 0.75, tapa=1, irreg=0.2, borde=0.3)
        pelos = []
        for k in range(7):
            q = np.asarray(arco_c[min(4, k * 4 // 6)])
            d = R(-interior * 0.07, -0.025) - R(0, 0)
            pelos.append([q + (R(0, 0.012 * (k % 3 - 1)) - R(0, 0)), q + d])
        lz.lapiz(pelos, tono(pc, '#000000', 0.25), grosor=0.4, presion=0.45, temblor=0.05)

    w_near = 0.17 if not nino else 0.19
    near = fx - s * 0.33
    far = fx + s * 0.31 * (1 - 0.3 * a)
    ojo(near, ey, w_near, s)
    ojo(far, ey, w_near * (1 - 0.38 * a), -s)

    # --- nose
    raiz = R(fx + s * 0.02, ey + 0.04)
    punta = R(fx + s * (0.08 + 0.08 * a), 0.46 if nino else 0.5)
    ala = R(fx - s * 0.1, 0.5 if nino else 0.53)
    plano = Poligono([R(fx - s * 0.04, ey + 0.08), R(fx - s * 0.1, 0.36), R(fx - s * 0.14, 0.5), R(fx - s * 0.02, 0.5),
                      R(fx + s * 0.02, 0.3)])
    if L[0] * s > 0:     # the nose's shadow plane is on the side away from the light
        lz.aguada(plano, sp, dens=0.3, suave=r * 0.03)
    else:
        lz.aguada(Poligono([R(fx + s * 0.04, ey + 0.08), R(fx + s * 0.1, 0.4), R(fx + s * 0.12, 0.5),
                            R(fx + s * 0.02, 0.5)]), sp, dens=0.3, suave=r * 0.03)
    lz.lapiz([list(bezier(raiz, R(fx + s * 0.06, 0.25), punta, n=12))], lp, grosor=0.5, presion=0.35, temblor=0.05)
    lz.lapiz([list(bezier(punta, R(fx + s * 0.02, (0.53 if nino else 0.57)), ala, n=10)),
              list(bezier(ala, R(fx - s * 0.16, 0.46), R(fx - s * 0.08, 0.41), n=8))], lp, grosor=0.65, presion=0.6,
             temblor=0.03, puntas=0.3)
    lz.aguada(Elipse(*R(fx - s * 0.02, 0.52 if nino else 0.555), r * 0.035, r * 0.02, inclina), '#5a2e26', dens=0.6,
              irreg=0.05)
    lz.gouache(Elipse(*R(fx + s * 0.06, 0.42), r * 0.02), tono(piel_c, '#ffffff', 0.6), alfa=0.6, irreg=0)
    lz.aguada(Elipse(*R(fx, 0.6 if nino else 0.64), r * 0.12, r * 0.04, inclina), sp, dens=0.25, suave=r * 0.03)
    if mayor:
        # the fold from the nose wing to the corner of the mouth
        lz.lapiz([list(bezier(R(fx - s * 0.18, 0.5), R(fx - s * 0.3, 0.66), R(fx - s * 0.27, 0.82), n=10))], lp,
                 grosor=0.5, presion=0.35, temblor=0.1)
        lz.lapiz([list(bezier(R(fx - s * 0.28, -0.52 + 0.1 * k), R(fx, -0.58 + 0.1 * k), R(fx + s * 0.3, -0.52 + 0.1 * k),
                              n=12)) for k in range(2)], lp, grosor=0.4, presion=0.22, temblor=0.3, cortes=0.4)

    # --- mouth
    my_ = 0.68 if nino else 0.73
    mw = 0.17 if nino else 0.19
    mL = R(fx - s * mw, my_)
    mR = R(fx + s * mw * (1 - 0.35 * a), my_)
    mc = R(fx + s * 0.02 * a, my_)
    labio_s = tono(piel_c, '#a8384a', 0.45)
    labio_i = tono(piel_c, '#c85a64', 0.38)
    if boca == 'risa':
        ab = 0.09
        mL = mL + (R(0, -0.04) - R(0, 0))
        mR = mR + (R(0, -0.04) - R(0, 0))
        bocaf = Poligono(list(bezier(mL, R(fx, my_ + 0.02), mR, n=12)) +
                         list(bezier(mR, R(fx, my_ + ab + 0.06), mL, n=12))[1:-1], suave=False)
        lz.aguada(bocaf, '#7a2a30', dens=0.9, tapa=1, irreg=0.05)
        lz.aguada(Elipse(*R(fx, my_ + ab * 0.7), r * mw * 0.55, r * ab * 0.32, inclina) & bocaf, '#d2626a', dens=0.8, tapa=1)
        lz.lapiz([list(bezier(mL, R(fx, my_ + 0.02), mR, n=12))], '#5a1e24', grosor=0.6, presion=0.6)
        lz.lapiz([list(bezier(mR, R(fx, my_ + ab + 0.06), mL, n=12))], '#7a3036', grosor=0.5, presion=0.45)
        lz.aguada(Poligono(list(bezier(mR, R(fx, my_ + ab + 0.06), mL, n=12)) +
                           list(bezier(mL, R(fx, my_ + ab + 0.12), mR, n=12))[1:-1], suave=False), labio_i, dens=0.4)
        for q in (mL, mR):
            lz.lapiz([[q + (q - mc) * 0.04, q + (q - mc) * 0.2 + (R(0, -0.05) - R(0, 0))]], lp, grosor=0.45, presion=0.45)
    else:
        sube = 0.035 if boca == 'sonrisa' else 0.0
        mL_ = mL + (R(0, -sube) - R(0, 0))
        mR_ = mR + (R(0, -sube) - R(0, 0))
        sup = Poligono([mL_, R(fx - s * 0.06, my_ - 0.06), R(fx - s * 0.01, my_ - 0.045), R(fx + s * 0.04, my_ - 0.06),
                        mR_, mc], suave=True)
        inf = Poligono([mL_, mc, mR_, R(fx + s * 0.05, my_ + 0.075), R(fx - s * 0.05, my_ + 0.075)], suave=True)
        lz.aguada(sup, labio_s, dens=0.5 if not mayor else 0.3, irreg=0.1)
        lz.aguada(inf, labio_i, dens=0.38 if not mayor else 0.22, irreg=0.1)
        lz.gouache(Elipse(*R(fx + s * 0.02, my_ + 0.045), r * 0.04, r * 0.012, inclina), tono(piel_c, '#ffffff', 0.5),
                   alfa=0.5, irreg=0)
        linea = list(bezier(mL_, R(fx - s * 0.05, my_ + 0.012 + sube * 0.3), mc, n=8)) + \
            list(bezier(mc, R(fx + s * 0.06, my_ + 0.01 + sube * 0.3), mR_, n=8))[1:]
        lz.lapiz([np.asarray(linea)], '#5a1e24', grosor=0.75, presion=0.7, temblor=0.03, puntas=0.45)
        for q in (mL_, mR_):
            lz.lapiz([[q + (q - mc) * 0.03, q + (q - mc) * 0.16 + (R(0, -0.03 - sube) - R(0, 0))]], lp, grosor=0.4,
                     presion=0.45)
    # under the lower lip and the chin
    lz.aguada(Elipse(*R(fx, my_ + 0.17), r * 0.11, r * 0.035, inclina), sp, dens=0.28, suave=r * 0.03)
    lz.gouache(Elipse(*R(fx + s * 0.04 * a, menton - 0.1), r * 0.05, r * 0.025, inclina), tono(piel_c, '#ffffff', 0.45),
               alfa=0.35, irreg=0)

    # --- hair on top
    if peinado == 'corto':
        hp = Poligono([R(-s * 0.88, -0.04), R(-s * 0.96, -0.36), R(-s * 0.66, -0.96), R(0, -1.12), R(s * 0.62, -0.96),
                       R(s * 0.86, -0.48), R(s * 0.78, -0.3), R(s * 0.5, -0.5), R(s * 0.1, -0.56), R(-s * 0.3, -0.44),
                       R(-s * 0.56, -0.2), R(-s * 0.62, -0.06)])
        modelar(lz, hp, pelo, luz, dens=0.86, prof=0.45, rayar=False, grosor=0.7, perdida=0.15, semilla=sem + 5,
                brillo=0.0)
        st = []
        for k in range(26):
            a0 = rng.uniform(-0.9, 0.7)
            st.append(list(bezier(R(s * a0 * 0.8 - s * 0.1, -1.0), R(s * (a0 * 0.8 - 0.05), -0.78),
                                  R(s * (a0 * 0.9 + 0.12), -0.5 + rng.uniform(-0.05, 0.05)), n=10)))
        lz.lapiz(st[:16], tono(pelo, '#000000', 0.5), grosor=0.5, presion=0.55, temblor=0.15, puntas=0.5)
        lz.lapiz(st[16:], tono(pelo, '#d8b088', 0.4), grosor=0.45, presion=0.45, temblor=0.15, puntas=0.5)
    if peinado == 'calvo':
        lz.gouache(Elipse(*R(s * 0.18 + L[0] * 0.3, -0.72), r * 0.2, r * 0.08, inclina - 20 * s), tono(piel_c, '#ffffff', 0.55),
                   alfa=0.45, irreg=0)
    if peinado == 'afro':
        # the hairline over the forehead
        # everything of the face above the hairline is hair: a soft, curly edge, no band of skin above it
        borde_pelo = [R(-s * 0.05 + math.cos(math.radians(200 + 140 * t)) * 0.84, -0.12 + math.sin(math.radians(200 + 140 * t)) * 0.56)
                      for t in np.linspace(0, 1, 13)]
        arriba = Poligono(borde_pelo[::-1] + [R(s * 1.2, -0.2), R(s * 1.2, -1.4), R(-s * 1.2, -1.4), R(-s * 1.2, -0.2)][::-1],
                          suave=False)
        cs = [(*q, r * rng.uniform(0.09, 0.13)) for q in borde_pelo]
        # the fringe over the forehead, in the same flat wash as the mass behind...
        fr = (arriba & cara) | Circulos(cs)
        lz.aguada(fr, pelo, dens=0.9, tapa=1, irreg=0.4, gran=0.35, borde=0.5)
        # ...then the light, the line and the coils over all the hair that shows, as one form
        visible = (pelo_f - cara) | fr
        x0, y0, x1, y1 = pelo_f.bbox()
        cc = np.array([(x0 + x1) / 2, (y0 + y1) / 2])
        RR = max(x1 - x0, y1 - y0) / 2
        lz.aguada(visible, sombra_de(pelo), dens=0.45, borde=0.15, irreg=0.3, gran=0.3,
                  desvanece=(*(cc - L * RR), *(cc + L * RR * 0.3)))
        lz.levanta(visible & Elipse(*(cc + L * RR * 0.55), RR * 0.5), cantidad=0.28, suave=RR * 0.2)
        linea_luz(lz, pelo_f - cara, linea_de(pelo, 0.4), luz, grosor=0.65, perdida=0.15)     # not along the hairline
        from matplotlib.path import Path
        en_cara = Path(cara.p)
        en_arriba = Path(arriba.p)
        bucles = []
        for k in range(260):
            t = rng.uniform(0, 2 * math.pi)
            rad = math.sqrt(rng.uniform(0.1, 1.0)) * 1.12
            q = R(-s * 0.1 + math.cos(t) * rad, -0.3 + min(math.sin(t) * rad * 0.9, 0.42))
            if en_cara.contains_point(q) and not en_arriba.contains_point(q):
                continue        # never on the skin
            rr = r * rng.uniform(0.045, 0.08)
            bucles.append(arco(q[0], q[1], rr, rr * 0.8, rng.uniform(0, 360), rng.uniform(0, 360) + 260, 9))
        mitad = len(bucles) * 3 // 5
        lz.lapiz(bucles[:mitad], tono(pelo, '#000000', 0.45), grosor=0.45, presion=0.5, temblor=0.15)
        lz.lapiz(bucles[mitad:], tono(pelo, '#c99a6a', 0.5), grosor=0.42, presion=0.42, temblor=0.15)
        # the shade the hair throws on the top of the forehead
        lz.aguada(Elipse(*R(-s * 0.05, -0.48), r * 0.6, r * 0.12, inclina) & cara, sp, dens=0.16, suave=r * 0.08)
    if gafas:
        for (cx, k) in ((near, 1.0), (far, 1 - 0.38 * a)):
            c_ = R(cx, ey + 0.02)
            lz.lapiz([arco(c_[0], c_[1], r * 0.2 * k, r * 0.16, 0, 360, 28, inclina)], '#5a4a42', grosor=0.8, presion=0.7,
                     temblor=0.04)
            lz.gouache(Elipse(c_[0] + r * 0.06 * k * L[0], c_[1] - r * 0.07, r * 0.05 * k, r * 0.02, inclina - 30),
                       '#ffffff', alfa=0.5, irreg=0)
        a_ = R(near + s * 0.2, ey)
        b_ = R(far - s * 0.2 * (1 - 0.38 * a), ey)
        lz.lapiz([list(bezier(a_, (a_ + b_) / 2 - np.array([0, r * 0.05]), b_, n=8)),
                  [R(near - s * 0.2, ey), R(-s * 0.74, ey + 0.02)]], '#5a4a42', grosor=0.75, presion=0.65)
    return R(fx, ey)


# ---------------------------------------------------------------- the phone and the swallow

def golondrina(lz, x, y, s, ang=-30, semilla=None):
    """A barn swallow in flight: sickle wings, blue-black back, rust face, cream
    belly, deeply forked tail with long streamers. (x, y) = the bird's centre;
    s = wingspan (units); ang = the direction of flight (degrees, -90 = up)."""
    a = math.radians(ang)
    d = _v([math.cos(a), math.sin(a)])
    n = _v([-d[1], d[0]])
    if n[1] > 0:
        n = -n      # n points 'up' relative to the flight
    P = lambda u, v: _v([x, y]) + d * u * s + n * v * s
    luz = (0.6, -0.8)
    azul = '#1c2850'
    # far wing, behind the body, swept down and back
    ala_l = Trazo([P(0.0, -0.01), P(-0.1, -0.16), P(-0.2, -0.3), P(-0.34, -0.4)], (s * 0.085, s * 0.075, s * 0.04, s * 0.006))
    modelar(lz, ala_l, '#243464', luz, dens=0.92, prof=0.3, rayar=False, grosor=0.45, semilla=semilla)
    # tail streamers
    for sd in (1, -1):
        cola = Trazo([P(-0.14, 0.0), P(-0.3, sd * 0.03), P(-0.5, sd * 0.075)], (s * 0.045, s * 0.02, s * 0.004))
        modelar(lz, cola, azul, luz, dens=0.92, prof=0.25, rayar=False, grosor=0.4)
    # body
    cuerpo = Trazo([P(0.2, 0.004), P(0.12, 0.008), P(0.0, 0.0), P(-0.16, -0.002)], (s * 0.06, s * 0.085, s * 0.075, s * 0.035))
    modelar(lz, cuerpo, azul, luz, dens=0.92, prof=0.3, rayar=False, grosor=0.5)
    vientre = Trazo([P(0.13, -0.022), P(0.0, -0.028), P(-0.13, -0.016)], (s * 0.03, s * 0.04, s * 0.015))
    lz.aguada(vientre, '#f4ead8', dens=0.92, tapa=1, irreg=0.1)
    # rust face and throat, the eye, the beak
    lz.aguada(Elipse(*P(0.175, -0.012), s * 0.03, s * 0.024, ang), '#b4482a', dens=0.95, tapa=1, irreg=0.1)
    lz.aguada(Elipse(*P(0.205, 0.012), s * 0.012, s * 0.009, ang), '#b4482a', dens=0.9, tapa=1, irreg=0.1)
    lz.aguada(Elipse(*P(0.19, 0.016), s * 0.008), '#0e0e14', dens=1.0, tapa=1, irreg=0)
    lz.gouache(Elipse(*P(0.192, 0.019), max(0.35, s * 0.0025)), '#ffffff', alfa=0.9, irreg=0)
    lz.lapiz([[P(0.228, 0.004), P(0.252, 0.0)]], '#1a1a24', grosor=0.7, presion=0.85)
    # near wing, raised: long, narrow, pointed, with its flight feathers
    ruta = [P(0.03, 0.02), P(-0.04, 0.18), P(-0.14, 0.34), P(-0.3, 0.48)]
    ala_c = Trazo(ruta, (s * 0.1, s * 0.085, s * 0.045, s * 0.006))
    modelar(lz, ala_c, '#2a3c70', luz, dens=0.92, prof=0.28, rayar=False, grosor=0.55, brillo=0.25)
    rp = Trazo(ruta, (1, 1)).p
    plumas = []
    for k in range(5):
        i = int(len(rp) * (0.3 + 0.12 * k))
        q = rp[min(i, len(rp) - 1)]
        plumas.append([q, q + (P(-0.05, -0.03) - P(0, 0))])
    lz.lapiz(plumas, '#5a6a9a', grosor=0.4, presion=0.5)
    lz.gouache(Trazo([P(0.0, 0.06), P(-0.1, 0.26)], (max(0.6, s * 0.012), 0.3)), '#a8b6d8', alfa=0.5, irreg=0.1)


def telefono(lz, cx, cy, w, h, ang=0.0, luz=(0.6, -0.8), semilla=None):
    """A phone seen from the front, its screen a little landscape: sky with
    clouds, blue hills, a golden wheat field and two holm oaks.
    Returns (screen polygon, function mapping screen (u, v) in 0..1 to units)."""
    a = math.radians(ang)
    X = _v([math.cos(a), math.sin(a)])
    Y = _v([-math.sin(a), math.cos(a)])
    c = _v([cx, cy])
    P = lambda u, v: c + X * u * w + Y * v * h        # u, v in -0.5..0.5

    def redondo(u0, v0, u1, v1, rr):
        pts = []
        for (uc, vc, a0) in ((u1 - rr, v0 + rr * w / h, -90), (u1 - rr, v1 - rr * w / h, 0), (u0 + rr, v1 - rr * w / h, 90),
                             (u0 + rr, v0 + rr * w / h, 180)):
            for t in np.linspace(a0, a0 + 90, 6):
                pts.append(P(uc + rr * math.cos(math.radians(t)), vc + rr * w / h * math.sin(math.radians(t))))
        return Poligono(pts, suave=False)
    cuerpo = redondo(-0.5, -0.5, 0.5, 0.5, 0.16)
    modelar(lz, cuerpo, '#4a5060', luz, dens=0.9, prof=0.4, rayar=False, grosor=0.6, semilla=semilla, brillo=0.3)
    lz.gouache(Poligono([P(0.3, -0.5), P(0.42, -0.5), P(-0.2, 0.5), P(-0.32, 0.5)], suave=False) & cuerpo, '#c8d0dc',
               alfa=0.18, irreg=0.2)
    pant = redondo(-0.42, -0.4, 0.42, 0.4, 0.05)
    S = lambda u, v: P(-0.42 + 0.84 * u, -0.4 + 0.8 * v)
    # sky
    lz.aguada(pant, '#9cc4e4', dens=0.85, tapa=1, irreg=0.15, borde=0.3,
              desvanece=(*S(0.5, 0.0), *S(0.5, 0.75)))
    lz.aguada(pant, '#cfe2ee', dens=0.5, tapa=0.6, irreg=0.1, desvanece=(*S(0.5, 0.6), *S(0.5, 0.1)))
    # clouds
    for (u, v, rr) in ((0.3, 0.32, 0.1), (0.4, 0.3, 0.12), (0.52, 0.33, 0.09), (0.78, 0.18, 0.07), (0.86, 0.2, 0.06)):
        lz.gouache(Elipse(*S(u, v), w * 0.84 * rr, h * 0.8 * rr * 0.5, ang) & pant, '#fbf8f2', alfa=0.85, irreg=0.3)
    # blue hills
    lz.aguada(Poligono([S(0, 0.6), S(0.2, 0.5), S(0.42, 0.54), S(0.66, 0.46), S(1, 0.55), S(1, 0.7), S(0, 0.7)]) & pant,
              '#7a86b0', dens=0.75, tapa=1, irreg=0.2)
    # the wheat field, with brush strokes of light
    campo = Poligono([S(0, 0.62), S(0.35, 0.6), S(0.7, 0.63), S(1, 0.6), S(1, 1), S(0, 1)]) & pant
    lz.aguada(campo, '#e2b04a', dens=0.9, tapa=1, irreg=0.3, gran=0.4,
              toques=[(*S(0.3, 0.9), w * 0.3, '#c98a2a', 0.6), (*S(0.7, 0.75), w * 0.25, '#f2d27a', 0.6)])
    rng = np.random.default_rng(semilla or 5)
    lz.lapiz([[S(u, v), S(u + 0.02, v - 0.06)] for u, v in zip(rng.uniform(0.05, 0.95, 26), rng.uniform(0.7, 0.98, 26))],
             '#a8742a', grosor=0.35, presion=0.5)
    # a few poppies in the wheat
    for (u, v) in ((0.62, 0.74), (0.78, 0.82), (0.7, 0.9), (0.9, 0.7)):
        lz.aguada(Elipse(*S(u, v), w * 0.025, w * 0.022), '#d23a2a', dens=0.95, tapa=1, irreg=0.1)
    # the camera speaker slot and the home button
    lz.aguada(Trazo([P(-0.1, -0.45), P(0.1, -0.45)], (h * 0.015, h * 0.015)), '#6a7080', dens=0.8, tapa=1)
    lz.lapiz([arco(*P(0, 0.455), w * 0.07, w * 0.07, 0, 360, 16)], '#8a90a0', grosor=0.5, presion=0.6)
    # glass glare
    lz.gouache(Poligono([S(0.62, 0.0), S(0.78, 0.0), S(0.3, 0.6), S(0.18, 0.6)], suave=False) & pant, '#ffffff', alfa=0.18,
               irreg=0)
    return pant, S
