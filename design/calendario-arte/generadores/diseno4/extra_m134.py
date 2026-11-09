"""
extra_m134.py -- picture-book figure toolkit for months 1, 3 and 4 (Diseño 4).

Built ON TOP of acuarela.py (which is shared and must not be edited). The
evaluator's note (DISENO4 section 8): figures must look like picture-book
people, not mannequins -- hands with fingers that really hold things, natural
necks and shoulders, faces drawn in sepia pencil with lids, nose, lips and
rosy cheeks, limbs with volume (a shadow glaze, a lifted light side, pencil
folds). This module gives:

    cara(lz, x, y, r, ...)          a large tender head, any tilt, 3/4 turn
    miembro(lz, pts, anchos, col)   an arm / leg / sleeve with volume
    mano(lz, x, y, ang, tam, ...)   a hand with five fingers and a gesture
    prenda(lz, pts, col, ...)       a garment / body part polygon with volume
    volumen(lz, forma, col, ...)    any shape painted with light and shadow
    Marco                           a local frame (rotate + translate points)

All coordinates are in base units (1485 x 850 sheet), as in acuarela.py.
"""
from __future__ import annotations

import math
import numpy as np

from acuarela import (Poligono, Elipse, Trazo, Circulos, spline, bezier, arco, mezcla, rgb,
                      remuestrea, _lapiz_de, flor_simple)

SEPIA = '#5e3f30'
PIEL_LP = '#8a5440'


# ------------------------------------------------------------------ frames

class Marco:
    """Local frame: origin (x, y), rotation ang (deg), scale k, mirror sx."""

    def __init__(self, x, y, ang=0.0, k=1.0, sx=1.0):
        self.o = np.array([x, y], float)
        self.c, self.s = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        self.k, self.sx = k, sx
        self.ang = ang

    def __call__(self, u, v=None):
        if v is None:
            p = np.asarray(u, float)
            if p.ndim == 2:
                uu, vv = p[:, 0] * self.sx * self.k, p[:, 1] * self.k
                return np.stack([self.o[0] + uu * self.c - vv * self.s, self.o[1] + uu * self.s + vv * self.c], 1)
            u, v = p
        u, v = u * self.sx * self.k, v * self.k
        return (self.o[0] + u * self.c - v * self.s, self.o[1] + u * self.s + v * self.c)

    def pts(self, lst):
        return [self(u, v) for u, v in lst]


def _desv(forma, luz=(-0.7, -0.7), fuerza=0.55):
    """desvanece tuple: full shadow on the side away from the light."""
    bb = forma.bbox()
    cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
    d = math.hypot(bb[2] - bb[0], bb[3] - bb[1]) / 2
    lx, ly = luz
    n = math.hypot(lx, ly) or 1
    lx, ly = lx / n, ly / n
    return (cx - lx * d * 1.0, cy - ly * d * 1.0, cx + lx * d * fuerza * 0.2, cy + ly * d * fuerza * 0.2)


def volumen(lz, forma, color, dens=0.7, sombra=None, luz=(-0.7, -0.7), tapa=1, brillo=0.3, lapiz=None,
            contorno=True, sdens=0.38, toques=None, flor=0, gran=0.3, irreg=1.0, borde=0.6, var=0.35):
    """A wash with form: base colour, a transparent shadow glaze from the side
    away from the light, a lifted highlight on the lit side, pencil outline."""
    lz.aguada(forma, color, dens=dens, tapa=tapa, toques=toques, flor=flor, gran=gran, irreg=irreg, borde=borde,
              var=var)
    sc = sombra or mezcla(color, '#5a2a4a', 0.55)
    lz.aguada(forma, sc, dens=sdens, borde=0.25, irreg=irreg * 0.6, gran=gran + 0.1, desvanece=_desv(forma, luz))
    if brillo:
        bb = forma.bbox()
        cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
        w, h = bb[2] - bb[0], bb[3] - bb[1]
        lz.levanta(Elipse(cx + luz[0] * w * 0.22, cy + luz[1] * h * 0.22, w * 0.18, h * 0.18) & forma,
                   brillo, suave=max(2, min(w, h) * 0.12))
    if contorno:
        lz.contorno(forma, lapiz or _lapiz_de(color, 0.5), grosor=0.95, presion=0.6, cortes=0.3, desfase=0.6)


def prenda(lz, pts, color, pliegues=(), luz=(-0.7, -0.7), dens=0.72, suave=True, lapiz=None, **kw):
    """Garment (or any body mass) from an outline, with fold lines in pencil."""
    f = Poligono(pts, suave=suave)
    kw.setdefault('borde', 0.85)
    volumen(lz, f, color, dens=dens, luz=luz, lapiz=lapiz, **kw)
    lp = lapiz or _lapiz_de(color, 0.42)
    if pliegues:
        lz.lapiz([spline(p) if len(p) > 2 else np.asarray(p, float) for p in pliegues], lp, grosor=0.8,
                 presion=0.45, temblor=0.35, cortes=0.15)
    return f


def miembro(lz, pts, anchos, color, lado=1, dens=0.7, lapiz=None, pliegues=0, tapa=1, sdens=0.4, contorno=True):
    """An arm, leg or sleeve along joints pts (3-5 points) with a width per
    point. lado=+1/-1 chooses which side is in shadow. pliegues: number of
    small fold strokes at the middle joint (sleeves, trousers)."""
    f = Trazo(pts, anchos)
    lz.aguada(f, color, dens=dens, tapa=tapa, irreg=0.7, gran=0.3)
    p = np.asarray(f.p)
    tg = np.gradient(p, axis=0)
    tg /= np.maximum(np.hypot(*tg.T)[:, None], 1e-9)
    nr = np.stack([-tg[:, 1], tg[:, 0]], 1)
    sh = p + nr * (f.w[:, None] * 0.28 * lado)
    w = f.w[::4] * 0.5
    lz.aguada(Trazo(sh[::4], w if len(w) > 1 else (w[0], w[0]), suave=False) & f,
              mezcla(color, '#5a2a4a', 0.5), dens=sdens, suave=f.w.mean() * 0.15, gran=0.35)
    hl = p - nr * (f.w[:, None] * 0.25 * lado)
    lz.levanta(Trazo(hl[::6], (f.w.mean() * 0.16, f.w.mean() * 0.1)) & f, 0.25, suave=2)
    lp = lapiz or _lapiz_de(color, 0.5)
    if contorno:
        lz.contorno(f, lp, grosor=0.9, presion=0.6, cortes=0.25, desfase=0.4)
    if pliegues:
        rng = np.random.default_rng(int(abs(p[0, 0] * 7 + p[0, 1] * 13)))
        j = len(p) // 2
        tr = []
        for k in range(pliegues):
            jj = min(len(p) - 2, max(1, j + int(rng.normal(0, len(p) * 0.08))))
            c, n, t = p[jj], nr[jj] * lado, tg[jj]
            wj = f.w[jj]
            a0 = c + n * wj * 0.45
            tr.append(bezier(a0, c + n * wj * 0.1 + t * wj * 0.25, c - n * wj * 0.15 + t * wj * rng.uniform(0.1, 0.5)))
        lz.lapiz(tr, lp, grosor=0.7, presion=0.45, temblor=0.2)
    return f


# ------------------------------------------------------------------ hands

GESTOS = {
    # (curl per joint in degrees for index..pinky, spread in deg, thumb angle, thumb curl)
    'abierta': ((6, 8, 8, 10), 9, 55, 5),
    'relajada': ((22, 26, 30, 34), 5, 40, 15),
    'agarra': ((62, 66, 68, 70), 2, 30, 35),
    'pinza': ((40, 60, 70, 75), 3, 25, 30),
    'senala': ((4, 80, 82, 84), 3, 25, 35),
    'cuenco': ((24, 22, 22, 24), 1, 30, 10),
    'saluda': ((2, 3, 4, 6), 12, 70, 0),
}


def mano(lz, x, y, ang, tam, piel='piel2', gesto='relajada', lado=1, semilla=None, dens=0.62, lapiz=None,
         dedos=None):
    """A picture-book hand. (x, y) = wrist, ang = direction the fingers point,
    tam = hand length (wrist to middle fingertip), lado = +1/-1 mirrors which
    side the thumb is on. dedos overrides the gesture curls."""
    curls, spread, tang, tcurl = GESTOS[gesto]
    if dedos is not None:
        curls = dedos
    M = Marco(x, y, ang, tam, 1.0)
    L = lambda u, v: M(u, v * lado)
    palma = Poligono([L(0.0, -0.17), L(0.18, -0.22), L(0.46, -0.21), L(0.5, -0.06), L(0.5, 0.08),
                      L(0.47, 0.2), L(0.2, 0.2), L(0.0, 0.15)])
    formas = [palma]
    trazos_dedo = []
    largos = (0.38, 0.42, 0.39, 0.31)
    bases = (-0.15, -0.05, 0.05, 0.15)
    anchos = (0.105, 0.11, 0.105, 0.09)
    for i in range(4):
        a = math.radians((i - 1.5) * spread * 0.8)
        u, v = 0.47 + (0.02 if i in (1, 2) else 0), bases[i]
        pts = [(u, v)]
        seg = largos[i] / 3
        cur = a
        for j in range(3):
            cur += math.radians(curls[i]) * (0.7 + 0.3 * j)
            u += math.cos(cur) * seg
            v += math.sin(cur) * seg
            pts.append((u, v))
        w = anchos[i]
        tr = Trazo([L(*p) for p in pts], (w * tam, w * 0.95 * tam, w * 0.85 * tam, w * 0.72 * tam))
        formas.append(tr)
        trazos_dedo.append([L(*p) for p in pts])
    # thumb
    ta = math.radians(tang)
    u, v = 0.12, 0.16
    pts = [(u, v)]
    cur = ta
    for j, sl in enumerate((0.17, 0.15, 0.12)):
        u += math.cos(cur) * sl
        v += math.sin(cur) * sl
        pts.append((u, v))
        cur -= math.radians(tcurl + 12)
    pul = Trazo([L(*p) for p in pts], (0.17 * tam, 0.14 * tam, 0.12 * tam, 0.09 * tam))
    formas.append(pul)
    f = formas[0]
    for g in formas[1:]:
        f = f | g
    lz.aguada(f, piel, dens=dens, tapa=1, irreg=0.35, borde=0.45, gran=0.2,
              toques=[(*L(0.25, 0.12 * lado), tam * 0.25, mezcla(piel, '#b0603e', 0.4), 0.5)])
    # shadow between fingers / under palm
    lz.aguada(palma, mezcla(piel, '#9a4a3a', 0.5), dens=0.25, suave=tam * 0.05,
              desvanece=(*L(0.2, 0.25), *L(0.35, -0.1)))
    lp = lapiz or PIEL_LP
    lz.contorno(f, lp, grosor=max(0.6, tam * 0.012), presion=0.6, cortes=0.18, desfase=0.15)
    for g_ in formas[1:]:
        lz.contorno(g_, lp, grosor=max(0.5, tam * 0.009), presion=0.4, cortes=0.35, desfase=0.1)
    # knuckles and finger creases
    tr = []
    for d in trazos_dedo:
        p0, p1 = np.asarray(d[1]), np.asarray(d[2])
        t = p1 - p0
        n = np.array([-t[1], t[0]]) / (np.hypot(*t) + 1e-9)
        c = (p0 + p1) / 2
        tr.append([c - n * tam * 0.03, c + n * tam * 0.03])
    lz.lapiz(tr, lp, grosor=0.5, presion=0.35, temblor=0.05)
    # fingertips a touch rosier
    for d in trazos_dedo:
        lz.aguada(Elipse(*d[-1], tam * 0.05), '#e98a7a', dens=0.3, suave=tam * 0.03)
    return f


# ------------------------------------------------------------------ heads

def cara(lz, x, y, r, piel='piel2', pelo='#4a2e22', peinado='melena', giro=0.0, ang=0.0, ojos='abiertos',
         boca='sonrisa', mira=(0.0, 0.0), canas=False, barba=None, pelo2=None, adorno=None, semilla=None,
         orejas=True, luz=(-0.7, -0.7), pecas=False, gafas=False):
    """A large tender head. giro -1..1 turns the face (positive: looks to the
    viewer's right). ang tilts the whole head (degrees). ojos: 'abiertos' |
    'cerrados' (happy closed lids) | 'dormidos' | 'arriba' (looking up).
    boca: 'sonrisa' | 'risa' | 'sopla' | 'suave'. peinado: 'melena', 'coleta',
    'rizos', 'corto', 'calvo', 'mono', 'trenza'. Returns the frame."""
    sem = lz._sem(semilla)
    rng = np.random.default_rng(sem)
    M = Marco(x, y, ang, r)
    g = giro
    pelo_lp = _lapiz_de(pelo, 0.55)
    hl = pelo2 or mezcla(pelo, '#f0d0a0', 0.35)

    def fx(u):  # compress the far side of a turned face
        s = 1 if u > 0 else -1
        return u * (1 - 0.2 * g * s) + g * 0.08

    fc = g * 0.33   # features centre (u)

    # --- hair behind
    if peinado in ('melena', 'trenza', 'coleta', 'mono'):
        if peinado == 'melena':
            back = [(-0.98, -0.3), (-1.12, 0.3), (-1.14, 0.95), (-1.05, 1.5), (-0.8, 1.68), (-0.55, 1.55),
                    (-0.3, 1.62), (0.3, 1.62), (0.55, 1.55), (0.8, 1.68), (1.05, 1.5),
                    (1.14, 0.95), (1.12, 0.3), (0.98, -0.3), (0.6, -1.0), (0.0, -1.15), (-0.6, -1.0)]
        else:
            back = [(-1.0, -0.2), (-1.04, 0.45), (-0.8, 0.6), (0.8, 0.6), (1.04, 0.45), (1.0, -0.2), (0.6, -1.0),
                    (0.0, -1.14), (-0.6, -1.0)]
        fb = Poligono(M.pts([(fx(u), v) for u, v in back]))
        lz.aguada(fb, pelo, dens=0.8, tapa=1, borde=0.6, gran=0.4, irreg=0.8,
                  toques=[(*M(-0.4, -0.6), r * 0.5, hl, 0.5)])
        lz.contorno(fb, pelo_lp, grosor=1.0, presion=0.55, cortes=0.35)
        if peinado == 'trenza':
            sd = -1 if g >= 0 else 1
            for k in range(9):
                c = M(sd * 0.95 + sd * 0.035 * k + (0.05 if k % 2 else -0.05), 0.5 + k * 0.2)
                e = Elipse(*c, r * 0.19, r * 0.12, ang + (35 if k % 2 else -35))
                lz.aguada(e, pelo, dens=0.8, tapa=1, irreg=0.3, toques=[(*c, r * 0.08, hl, 0.4)])
                lz.contorno(e, pelo_lp, grosor=0.7, presion=0.5, cortes=0.2)
            lz.aguada(Elipse(*M(sd * 1.28, 2.32), r * 0.09), adorno or '#e8735e', dens=0.85, tapa=1)
        if peinado == 'coleta':
            sd = -1 if g >= 0 else 1
            ct = Trazo(M.pts([(sd * 0.7, -0.75), (sd * 1.35, -0.6), (sd * 1.55, 0.1), (sd * 1.45, 0.75)]),
                       (r * 0.45, r * 0.5, r * 0.38, r * 0.12))
            lz.aguada(ct, pelo, dens=0.8, tapa=1, toques=[(*M(sd * 1.3, -0.4), r * 0.3, hl, 0.5)])
            lz.contorno(ct, pelo_lp, grosor=0.9, presion=0.55, cortes=0.3)
            lz.aguada(Elipse(*M(sd * 0.85, -0.75), r * 0.13), adorno or '#e8735e', dens=0.9, tapa=1)
        if peinado == 'mono':
            mb = Elipse(*M(-g * 0.25, -1.08), r * 0.46, r * 0.38, ang)
            lz.aguada(mb, pelo, dens=0.8, tapa=1, toques=[(*M(-g * 0.25 - 0.15, -1.2), r * 0.25, hl, 0.5)])
            lz.contorno(mb, pelo_lp, grosor=0.9, presion=0.55, cortes=0.3)
    # --- ears
    if orejas:
        for sd in (-1, 1):
            if g * sd > 0.45:
                continue
            eu = fx(sd * 0.93)
            e = Poligono(M.pts([(eu, -0.05), (eu + sd * 0.14, -0.1), (eu + sd * 0.17, 0.12), (eu + sd * 0.08, 0.3),
                                (eu - sd * 0.02, 0.28)]))
            lz.aguada(e, piel, dens=0.62, tapa=1, irreg=0.3, toques=[(*M(eu + sd * 0.06, 0.1), r * 0.1, '#e07a70', 0.5)])
            lz.contorno(e, PIEL_LP, grosor=0.8, presion=0.5, cortes=0.1, desfase=0.2)
            lz.lapiz([spline(M.pts([(eu + sd * 0.1, -0.02), (eu + sd * 0.12, 0.1), (eu + sd * 0.06, 0.2)]))],
                     PIEL_LP, grosor=0.6, presion=0.4, temblor=0.05)
    # --- face
    out = [(-0.86, -0.25), (-0.88, 0.12), (-0.8, 0.5), (-0.58, 0.82), (-0.3, 0.98), (0.0, 1.03), (0.3, 0.98),
           (0.58, 0.82), (0.8, 0.5), (0.88, 0.12), (0.86, -0.25), (0.68, -0.72), (0.3, -0.96), (-0.3, -0.96),
           (-0.68, -0.72)]
    if boca == 'sopla':   # puffed cheeks
        out = [(u * (1.08 if 0.1 < v < 0.75 else 1.0), v) for u, v in out]
    face = Poligono(M.pts([(fx(u), v) for u, v in out]))
    sd_sh = -1 if luz[0] > 0 else 1
    lz.aguada(face, piel, dens=0.6, borde=0.45, irreg=0.5, gran=0.22, var=0.2, tapa=1,
              toques=[(*M(sd_sh * 0.75, 0.3), r * 0.6, mezcla(piel, '#b0603e', 0.45), 0.5),
                      (*M(fc, -0.5), r * 0.5, mezcla(piel, '#fff0dc', 0.3), 0.4)])
    # shadow glaze on the side away from light + under the hairline
    lz.aguada(face, mezcla(piel, '#8a3a3a', 0.6), dens=0.28, borde=0.2, irreg=0.4,
              desvanece=(*M(sd_sh * 1.0, 0.6), *M(fc - sd_sh * 0.1, 0.0)))
    # cheeks
    puff = 1.35 if boca == 'sopla' else 1.0
    for sd in (-1, 1):
        if g * sd > 0.75:
            continue
        cu = fc + sd * (0.46 - 0.16 * g * sd)
        lz.aguada(Elipse(*M(cu, 0.4), r * 0.2 * puff, r * 0.14 * puff, ang), '#ec6f74', dens=0.42,
                  suave=r * 0.08, gran=0.1)
    if pecas:
        for k in range(14):
            sd = 1 if k % 2 else -1
            cu = fc + sd * rng.uniform(0.18, 0.5)
            lz.aguada(Elipse(*M(cu, rng.uniform(0.18, 0.42)), r * 0.018), '#a8603e', dens=0.7, irreg=0.1)
    # --- eyes
    ey = 0.08
    sep = 0.33
    for sd in (-1, 1):
        k = 1 - 0.32 * max(0, g * sd)
        ex = fc + sd * sep * k
        rx, ry = 0.15 * k, 0.085
        if ojos in ('abiertos', 'arriba'):
            mu, mv = mira
            if ojos == 'arriba':
                mv = -1
            # eye white (very pale) then iris
            lz.aguada(Elipse(*M(ex, ey), r * rx, r * ry, ang), '#fffaf2', dens=0.4, tapa=0.9, irreg=0.1)
            iu, iv = ex + mu * 0.04 * k, ey + mv * 0.025
            lz.aguada(Elipse(*M(iu, iv), r * 0.085 * k, r * 0.085, ang), '#3a2a22', dens=1.3, irreg=0.1, borde=0.2,
                      toques=[(*M(iu, iv + 0.03), r * 0.05, '#6a4a32', 0.6)])
            lz.gouache(Elipse(*M(iu + 0.03, iv - 0.03), max(0.5, r * 0.028)), '#fffdf6', alfa=0.95, irreg=0)
            # upper lid: heavy line with lashes; lower lid: faint
            lz.lapiz([arco(*M(ex, ey + 0.01), r * rx * 1.05, r * ry * 1.25, 192, 348, 14, ang)], '#3b2a24',
                     grosor=max(1.0, r * 0.03), presion=0.85, temblor=0.05, puntas=0.25)
            lz.lapiz([arco(*M(ex, ey - 0.0), r * rx * 0.9, r * ry * 1.05, 25, 155, 10, ang)], PIEL_LP, grosor=0.7,
                     presion=0.35, temblor=0.05)
            # lid crease
            lz.lapiz([arco(*M(ex, ey - 0.02), r * rx * 0.95, r * ry * 2.0, 215, 325, 10, ang)], PIEL_LP, grosor=0.6,
                     presion=0.35, temblor=0.05)
            lz.lapiz([[M(ex + sd * rx * 0.95, ey - 0.02), M(ex + sd * rx * 1.25, ey - 0.08)]], '#3b2a24', grosor=0.7,
                     presion=0.6, temblor=0.02)
        else:
            # closed lids: smiling arcs (cerrados) or relaxed downward arcs (dormidos)
            if ojos == 'cerrados':
                a0, a1, yy = 200, 340, ey + 0.05
            else:
                a0, a1, yy = 20, 160, ey - 0.03
            lz.lapiz([arco(*M(ex, yy), r * rx, r * ry * 0.9, a0, a1, 14, ang)], '#3b2a24',
                     grosor=max(1.0, r * 0.03), presion=0.85, temblor=0.05, puntas=0.3)
            if ojos == 'dormidos':
                tr = []
                for t in (0.25, 0.5, 0.75):
                    a = math.radians(a0 + (a1 - a0) * t)
                    p0 = np.array([ex + math.cos(a) * rx, yy + math.sin(a) * ry * 0.9])
                    tr.append(M.pts([tuple(p0), tuple(p0 + (0, 0.06))]))
                lz.lapiz(tr, '#3b2a24', grosor=0.6, presion=0.55, temblor=0.02)
            lz.lapiz([arco(*M(ex, ey - 0.02), r * rx * 0.95, r * ry * 2.1, 215, 325, 10, ang)], PIEL_LP, grosor=0.6,
                     presion=0.3, temblor=0.05)
        # eyebrow
        bu = ex + sd * 0.02
        bc = _lapiz_de(pelo, 0.7) if not canas else '#9a8a80'
        lz.lapiz([arco(*M(bu, ey - 0.12), r * 0.17 * k, r * 0.09, 205, 335, 12, ang)], bc,
                 grosor=max(0.9, r * 0.028), presion=0.55, temblor=0.1)
    # --- nose: bridge line on the shadow side, rounded tip, nostril
    nu = fc + g * 0.1
    side = 1 if g >= 0 else -1
    lz.lapiz([spline(M.pts([(nu - side * 0.06, 0.06), (nu + side * 0.02, 0.22), (nu + side * 0.1, 0.36),
                            (nu + side * 0.02, 0.42)]))], PIEL_LP, grosor=0.8, presion=0.45, temblor=0.05)
    lz.lapiz([arco(*M(nu - side * 0.06, 0.4), r * 0.05, r * 0.035, 0, 180, 8, ang)], PIEL_LP, grosor=0.7,
             presion=0.45, temblor=0.03)
    lz.aguada(Elipse(*M(nu + side * 0.06, 0.32), r * 0.06, r * 0.1, ang), mezcla(piel, '#9a4a3a', 0.5), dens=0.3,
              suave=r * 0.03)
    lz.aguada(Elipse(*M(nu - side * 0.02, 0.36), r * 0.05), '#e98a7a', dens=0.25, suave=r * 0.03)
    # --- mouth
    mu_, mv_ = fc + g * 0.04, 0.63
    if boca == 'risa':
        m = Poligono(M.pts([(mu_ - 0.2, -0.0 + mv_ - 0.03), (mu_, mv_ - 0.0), (mu_ + 0.2, mv_ - 0.03),
                            (mu_ + 0.12, mv_ + 0.12), (mu_, mv_ + 0.16), (mu_ - 0.12, mv_ + 0.12)]))
        lz.aguada(m, '#a8323e', dens=0.85, tapa=1, irreg=0.2, borde=0.4, toques=[(*M(mu_, mv_ + 0.12), r * 0.08, '#e87a7a', 0.7)])
        lz.aguada(Poligono(M.pts([(mu_ - 0.15, mv_ - 0.01), (mu_ + 0.15, mv_ - 0.01), (mu_ + 0.12, mv_ + 0.04),
                                  (mu_ - 0.12, mv_ + 0.04)])), '#fffaf0', dens=0.5, tapa=1, irreg=0.1)
        lz.contorno(m, '#7a2a30', grosor=0.8, presion=0.55, cortes=0.1, desfase=0.1)
    elif boca == 'sopla':
        m = Elipse(*M(mu_ + side * 0.03, mv_ + 0.02), r * 0.07, r * 0.06, ang)
        lz.aguada(Elipse(*M(mu_ + side * 0.03, mv_ + 0.02), r * 0.12, r * 0.1, ang), '#d96a6a', dens=0.5, irreg=0.2)
        lz.aguada(m, '#7a2a30', dens=0.9, irreg=0.1)
        lz.lapiz([arco(*M(mu_ + side * 0.03, mv_ + 0.02), r * 0.12, r * 0.1, 0, 360, 18, ang)], '#8f3c3c', grosor=0.7,
                 presion=0.5, temblor=0.05)
    else:
        w = 0.17 if boca == 'sonrisa' else 0.11
        lz.lapiz([arco(*M(mu_, mv_ - 0.07), r * w, r * 0.09, 25, 155, 14, ang)], '#8f3c3c',
                 grosor=max(0.9, r * 0.026), presion=0.75, temblor=0.05, puntas=0.3)
        lz.aguada(Elipse(*M(mu_, mv_ + 0.07), r * w * 0.55, r * 0.045, ang), '#d8606a', dens=0.45, suave=r * 0.02)
        for sd in (-1, 1):   # dimples at the corners
            lz.lapiz([arco(*M(mu_ + sd * w * 1.05, mv_ - 0.04), r * 0.03, r * 0.03, 60 if sd > 0 else 120,
                           120 if sd > 0 else 200, 6, ang)], PIEL_LP, grosor=0.5, presion=0.35)
    # chin line
    lz.lapiz([arco(*M(mu_, 0.86), r * 0.09, r * 0.035, 30, 150, 8, ang)], PIEL_LP, grosor=0.5, presion=0.3)
    if barba:
        b = Poligono(M.pts([(fx(-0.82), 0.2), (fx(-0.65), 0.75), (fx(-0.3), 1.12), (0.0 + fc * 0.3, 1.25),
                            (fx(0.3), 1.12), (fx(0.65), 0.75), (fx(0.82), 0.2), (fx(0.5), 0.55),
                            (mu_ + 0.22, mv_ + 0.12), (mu_, mv_ + 0.2), (mu_ - 0.22, mv_ + 0.12), (fx(-0.5), 0.55)]))
        lz.aguada(b, barba, dens=0.55, gran=0.4, borde=0.4, tapa=0.8)
        st = []
        for k in range(26):
            u0 = rng.uniform(-0.7, 0.7)
            v0 = rng.uniform(0.6, 1.1)
            st.append(M.pts([(fx(u0), v0), (fx(u0) * 0.95, v0 + 0.12)]))
        lz.lapiz(st, _lapiz_de(barba, 0.5), grosor=0.6, presion=0.4)
        # moustache
        mo = Poligono(M.pts([(mu_ - 0.28, mv_ - 0.02), (mu_, mv_ - 0.16), (mu_ + 0.28, mv_ - 0.02), (mu_, mv_ - 0.08)]))
        lz.aguada(mo, barba, dens=0.65, tapa=0.8, irreg=0.3)
        lz.contorno(mo, _lapiz_de(barba, 0.5), grosor=0.6, presion=0.45)
    # --- pencil modelling on the shadow side, then the face contour (sepia, broken)
    sh_zone = face & Elipse(*M(sd_sh * 0.95, 0.35), r * 0.55, r * 0.85, ang)
    lz.rayado(sh_zone, PIEL_LP, angulo=ang + 65, sep=max(2.2, r * 0.07), presion=0.22, grosor=0.6, largo=r * 0.35)
    lz.contorno(face, PIEL_LP, grosor=max(0.9, r * 0.022), presion=0.55, cortes=0.4, desfase=0.25)
    # --- hair in front
    front = None
    if peinado in ('melena', 'coleta', 'trenza', 'mono', 'corto'):
        pr = 0.18 + 0.25 * g
        front = [(-0.92, 0.2), (-0.98, -0.35), (-0.75, -0.88), (-0.25, -1.1), (0.35, -1.08), (0.8, -0.82),
                 (0.98, -0.35), (0.92, 0.2), (0.8, -0.2), (0.55, -0.48), (pr + 0.15, -0.6), (pr, -0.72),
                 (pr - 0.2, -0.52), (-0.35, -0.48), (-0.7, -0.25)]
        if peinado == 'corto':
            front = [(-0.94, 0.0), (-0.98, -0.4), (-0.75, -0.9), (-0.25, -1.12), (0.35, -1.1), (0.8, -0.85),
                     (0.98, -0.4), (0.94, 0.0), (0.82, -0.35), (0.5, -0.55), (0.0, -0.62), (-0.5, -0.55),
                     (-0.82, -0.35)]
    elif peinado == 'rizos':
        cs = []
        for a in np.linspace(160, 380, 13):
            rr = rng.uniform(0.24, 0.32)
            cs.append((*M(fx(math.cos(math.radians(a)) * 0.98), math.sin(math.radians(a)) * 0.98 - 0.05), r * rr))
        for a in np.linspace(205, 335, 5):
            cs.append((*M(fx(math.cos(math.radians(a)) * 0.6), math.sin(math.radians(a)) * 0.82 - 0.15), r * 0.3))
        hp = Circulos(cs)
        lz.aguada(hp, pelo, dens=0.82, tapa=1, borde=0.7, gran=0.45, irreg=0.8,
                  toques=[(*M(-0.4, -0.8), r * 0.45, hl, 0.45)])
        lz.contorno(hp, pelo_lp, grosor=0.9, presion=0.5, cortes=0.4)
        cur = []
        for (cx, cy, rr) in cs:
            for _ in range(3):
                a0 = rng.uniform(0, 360)
                ox, oy = cx + rng.normal(0, rr * 0.3), cy + rng.normal(0, rr * 0.3)
                cur.append(arco(ox, oy, rr * 0.22, rr * 0.2, a0, a0 + rng.uniform(150, 230), 8))
        lz.lapiz(cur, pelo_lp, grosor=0.6, presion=0.5, temblor=0.15)
        lz.lapiz(cur[::3], hl, grosor=0.6, presion=0.35, temblor=0.15)
    elif peinado == 'calvo':
        for sd in (-1, 1):
            if g * sd > 0.5:
                continue
            hp = Poligono(M.pts([(fx(sd * 0.92), 0.15), (fx(sd * 0.95), -0.35), (fx(sd * 0.75), -0.55),
                                 (fx(sd * 0.72), -0.05)]))
            lz.aguada(hp, pelo, dens=0.5 if canas else 0.8, tapa=1, irreg=0.6, gran=0.4)
            lz.contorno(hp, pelo_lp, grosor=0.7, presion=0.4, cortes=0.4)
        lz.levanta(Elipse(*M(-0.3, -0.7), r * 0.25, r * 0.12, ang - 20), 0.35, suave=r * 0.08)
    if front is not None:
        fh = Poligono(M.pts([(fx(u), v) for u, v in front]))
        lz.aguada(fh, pelo, dens=0.55 if canas else 0.82, tapa=1, borde=0.6, gran=0.4, irreg=0.7,
                  toques=[(*M(-0.35, -0.85), r * 0.45, hl, 0.55)])
        lz.contorno(fh, pelo_lp, grosor=0.9, presion=0.55, cortes=0.35)
        st = []
        for k in range(14):
            a0 = rng.uniform(-0.75, 0.75)
            st.append(spline(M.pts([(fx(a0), -1.0), (fx(a0 * 1.05 - 0.05), -0.8), (fx(a0 * 1.15 - 0.1), -0.55)])))
        lz.lapiz(st, pelo_lp, grosor=0.6, presion=0.35, temblor=0.15, cortes=0.3)
        # sheen: a lifted arc where the light hits the hair
        lz.levanta(Trazo(M.pts([(-0.7, -0.55), (-0.2, -0.88), (0.4, -0.86)]), (r * 0.12, r * 0.16, r * 0.08)) & fh,
                   0.3, suave=r * 0.05)
        st2 = []
        for k in range(10):
            a0 = rng.uniform(-0.85, 0.85)
            st2.append(spline(M.pts([(fx(a0 * 0.6), -1.05), (fx(a0 * 0.9), -0.85), (fx(a0 * 1.1), -0.5)])))
        lz.lapiz(st2, hl, grosor=0.6, presion=0.4, temblor=0.15, cortes=0.3)
        if peinado == 'melena':
            st = []
            for sd in (-1, 1):
                for k in range(9):
                    u0 = sd * rng.uniform(0.88, 1.08)
                    st.append(spline(M.pts([(fx(u0), -0.1 + k * 0.12), (fx(u0 * 1.04), 0.5 + k * 0.12),
                                            (fx(u0 * 0.95), 1.0 + k * 0.08)])))
            lz.lapiz(st, pelo_lp, grosor=0.6, presion=0.35, temblor=0.3, cortes=0.3)
    if gafas:
        for sd in (-1, 1):
            k = 1 - 0.32 * max(0, g * sd)
            lz.lapiz([arco(*M(fc + sd * sep * k, ey + 0.02), r * 0.2 * k, r * 0.16, 0, 360, 24, ang)], '#7a5a3a',
                     grosor=0.8, presion=0.6, temblor=0.05)
        lz.lapiz([[M(fc - sep * 0.4, ey), M(fc + sep * 0.4, ey)]], '#7a5a3a', grosor=0.8, presion=0.6)
    if adorno:
        flor_simple(lz, *M(-0.72 if g >= 0 else 0.72, -0.72), r * 0.26, adorno, centro='#f0c25e')
    return M


def cuello(lz, cabeza_xy, r, base, piel='piel2', ancho=0.42):
    """A neck from under the head to the collar point, with shadow under chin."""
    hx, hy = cabeza_xy
    bx, by = base
    f = Trazo([(hx + (bx - hx) * 0.15, hy + r * 0.55), ((hx + bx) / 2, (hy + r * 0.55 + by) / 2), (bx, by)],
              (r * ancho * 1.05, r * ancho, r * ancho * 1.25))
    lz.aguada(f, piel, dens=0.6, tapa=1, irreg=0.4,
              toques=[(hx, hy + r * 0.95, r * 0.45, mezcla(piel, '#8a4030', 0.55), 0.7)])
    lz.lapiz([f.contorno_pts()[0][3:-3], f.contorno_pts()[1][3:-3]], PIEL_LP, grosor=0.7, presion=0.45, cortes=0.3)
    return f


def luciernaga(lz, x, y, s=1.0, ang=0):
    """A firefly: a tiny dark body and a glowing amber abdomen."""
    a = math.radians(ang)
    d = np.array([math.cos(a), math.sin(a)])
    lz.aguada(Elipse(x, y, 2.6 * s, 1.5 * s, ang), '#4a3a30', dens=0.9, irreg=0.1)
    c = (x - d[0] * 3 * s, y - d[1] * 3 * s)
    lz.aguada(Elipse(*c, 2.4 * s, 1.8 * s, ang), '#f2c64a', dens=0.9, irreg=0.1)
    for sd in (-1, 1):
        n = np.array([-d[1], d[0]]) * sd
        lz.aguada(Elipse(x + n[0] * 2.2 * s, y + n[1] * 2.2 * s, 3.0 * s, 1.4 * s, ang + sd * 35), '#cfe0e6',
                  dens=0.35, irreg=0.1)
    lz.aguada(Elipse(*c, 9 * s), '#f6d27a', dens=0.3, suave=4 * s, gran=0.05)
    lz.gouache(Elipse(*c, 1.1 * s), '#fff4c0', alfa=0.9, irreg=0)
    lz.luz((c[0], c[1], 9 * s), '#ffd76a', fuerza=0.7)
