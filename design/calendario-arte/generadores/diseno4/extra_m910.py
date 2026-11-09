"""
extra_m910.py -- helpers for months 9 (Economía) and 10 (Alimentación), Diseño 4.

Built on acuarela.py (never modified from here). Base units as everywhere
(1485 x 850 sheet).

* `cuerpo(...)`: joint dictionary for `figura()` from a few pose numbers, so
  people get bent elbows, a turned body and a step instead of straight tubes.
* `carita(...)`: a tiny tender face for food characters (eyes with a
  catch-light, rosy cheeks, smile / wink / closed happy eyes / open mouth).
* `brazito(...)`, `piernita(...)`: thin pencil limbs with little round hands
  for food characters.
* `toldo(...)`: a striped market awning with a scalloped valance.
* `sombra(...)`: a soft cast shadow on the floor.
"""
import math
import numpy as np

from acuarela import (Elipse, Poligono, Trazo, Circulos, arco, bezier, spline, mezcla, rgb, _lapiz_de)


# ---------------------------------------------------------------- people

def _pt(p, ang, L):
    a = math.radians(ang)
    return (p[0] + math.cos(a) * L, p[1] + math.sin(a) * L)


def cuerpo(x, y_pie, r, brazo_i=(105, 80), brazo_d=(75, 100), pierna_i=(95, 92), pierna_d=(85, 88),
           nino=False, inclina=0.0, hombros=1.0, cadera=1.0, sentado=False):
    """Joint dictionary for acuarela.figura().

    (x, y_pie): point between the feet; r: head radius.
    brazo_*: (shoulder->elbow angle, elbow->wrist angle) in degrees
             (0 = right, 90 = down, 180 = left, -90 = up).
    pierna_*: (hip->knee angle, knee->ankle angle).
    inclina: lean of the torso in units at the shoulders (+ = to the right).
    nino: child proportions (bigger head relative to body).
    """
    if nino:
        H, hw, cw, up, fo, th, sh = 7.2, 0.95, 0.7, 1.25, 1.15, 1.45, 1.35
        y_head = y_pie - (H - 1) * r
        y_sh = y_head + 1.65 * r
        y_hip = y_sh + 2.2 * r
    else:
        H, hw, cw, up, fo, th, sh = 10.0, 1.2, 0.78, 1.65, 1.55, 2.05, 1.95
        y_head = y_pie - (H - 1) * r
        y_sh = y_head + 1.8 * r
        y_hip = y_sh + 2.9 * r
    hw *= hombros
    cw *= cadera
    hx = x + inclina
    J = dict(cabeza=(hx + inclina * 0.25, y_head, r), hi=(hx - hw * r, y_sh), hd=(hx + hw * r, y_sh),
             ci=(x - cw * r, y_hip), cd=(x + cw * r, y_hip))
    for k, (a1, a2), sd in (('brazo_i', brazo_i, -1), ('brazo_d', brazo_d, 1)):
        if a1 is None:
            continue
        s0 = (hx + sd * (hw - 0.12) * r, y_sh + 0.25 * r)
        e = _pt(s0, a1, up * r)
        w = _pt(e, a2, fo * r)
        J[k] = [s0, e, w]
    for k, (a1, a2), sd in (('pierna_i', pierna_i, -1), ('pierna_d', pierna_d, 1)):
        if a1 is None:
            continue
        h0 = (x + sd * cw * 0.55 * r, y_hip + 0.2 * r)
        kn = _pt(h0, a1, th * r)
        an = _pt(kn, a2, sh * r)
        J[k] = [h0, kn, an]
    return J


def sombra(lz, cx, cy, rx, ry=None, color='#b98a52', dens=0.3):
    """Soft cast shadow on the floor."""
    lz.aguada(Elipse(cx, cy, rx, ry or rx * 0.16), color, dens=dens, suave=max(4, rx * 0.12), gran=0.3, borde=0)


# ---------------------------------------------------------------- food characters

def carita(lz, x, y, r, expr='sonrisa', mira=(0, 0), mejillas=True, lapiz='#3b2a24', ang=0.0, boca_col='#8f3c3c'):
    """A tiny face on a fruit, an egg, a fish... centred at (x, y); r = face
    size (distance between the eyes ~ r). expr: 'sonrisa' | 'guino' |
    'feliz' (both eyes closed arcs) | 'o' (open mouth, surprised/singing) |
    'risa' (closed eyes + open mouth) | 'beso'."""
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))

    def R(dx, dy):
        return (x + dx * ca - dy * sa, y + dx * sa + dy * ca)

    ex = r * 0.42
    for sd in (-1, 1):
        cx, cy = R(sd * ex, -r * 0.08)
        cerrado = expr in ('feliz', 'risa') or (expr == 'guino' and sd == 1)
        if cerrado:
            lz.lapiz([arco(cx, cy + r * 0.06, r * 0.17, r * 0.13, 200, 340, 10, ang)], lapiz, grosor=0.9,
                     presion=0.85, temblor=0.05, puntas=0.25)
        else:
            mx, my = mira
            px, py = cx + mx * r * 0.06, cy + my * r * 0.06
            lz.aguada(Elipse(px, py, r * 0.12, r * 0.15, ang), '#2e211c', dens=1.4, borde=0.2, irreg=0.1, gran=0.05)
            lz.gouache(Elipse(px + r * 0.04, py - r * 0.05, max(0.45, r * 0.045)), '#fffdf6', alfa=0.95, irreg=0)
        if mejillas:
            mx_, my_ = R(sd * r * 0.68, r * 0.3)
            lz.aguada(Elipse(mx_, my_, r * 0.2, r * 0.13, ang), '#e9727a', dens=0.5, suave=r * 0.08, gran=0.05)
    mx_, my_ = R(0, r * 0.3)
    if expr in ('o', 'risa'):
        m = Poligono(np.vstack([arco(mx_, my_ - r * 0.04, r * 0.17, r * 0.05, 180, 360, 8, ang),
                                arco(mx_, my_ - r * 0.04, r * 0.17, r * 0.2, 0, 180, 12, ang)]), suave=False)
        lz.aguada(m, '#b8424a', dens=0.85, irreg=0.15, borde=0.3, gran=0.05)
    elif expr == 'beso':
        lz.lapiz([arco(mx_, my_, r * 0.07, r * 0.08, 0, 300, 12, ang)], boca_col, grosor=0.9, presion=0.8, temblor=0.03)
    else:
        lz.lapiz([arco(mx_, my_ - r * 0.12, r * 0.24, r * 0.16, 25, 155, 14, ang)], boca_col, grosor=0.9,
                 presion=0.85, temblor=0.05, puntas=0.25)


def brazito(lz, pts, color='#5e3f30', grosor=1.2, mano=True, mano_col=None, mano_r=2.6):
    """A thin pencil arm (or leg) for a food character, ending in a little
    round hand."""
    p = spline(pts, False, 10) if len(pts) > 2 else np.asarray(pts, float)
    lz.lapiz([p], color, grosor=grosor, presion=0.9, temblor=0.15, puntas=0.05)
    if mano:
        x, y = p[-1]
        lz.aguada(Elipse(x, y, mano_r), mano_col or color, dens=0.9, irreg=0.2, borde=0.3, gran=0.05)


# ---------------------------------------------------------------- market things

def toldo(lz, p0, p1, p2, p3, cols=('#e8735e', '#f6ead6'), n=7, fleco=7, lapiz='#7a4030', dens=0.75):
    """Striped awning. p0-p1 back (upper) edge, p3-p2 front (lower) edge; the
    stripes run from back to front. A scalloped valance hangs under p3-p2."""
    p0, p1, p2, p3 = map(np.asarray, (p0, p1, p2, p3))
    for k in range(n):
        t0, t1 = k / n, (k + 1) / n
        q = [p0 + (p1 - p0) * t0, p0 + (p1 - p0) * t1, p3 + (p2 - p3) * t1, p3 + (p2 - p3) * t0]
        lz.aguada(Poligono(q, suave=False), cols[k % len(cols)], dens=dens, irreg=0.3, borde=0.6, tapa=1, gran=0.3)
    # valance: scallops
    L = np.linalg.norm(p2 - p3)
    m = max(3, int(L / (fleco * 2.2)))
    cs = []
    for k in range(m):
        t = (k + 0.5) / m
        c = p3 + (p2 - p3) * t
        cs.append((c[0], c[1] + fleco * 0.35, fleco))
    band = Poligono([p3 + (0, -1), p2 + (0, -1), p2 + (0, fleco * 0.4), p3 + (0, fleco * 0.4)], suave=False)
    fl = Circulos(cs)
    for k, (cx, cy, rr) in enumerate(cs):
        lz.aguada(Elipse(cx, cy, rr), cols[k % len(cols)], dens=dens, irreg=0.25, borde=0.7, tapa=1, gran=0.3)
    lz.aguada(band, cols[0], dens=dens, irreg=0.25, tapa=1)
    tr = [np.array([p0, p1]), np.array([p1, p2]), np.array([p0, p3])]
    lz.lapiz(tr, lapiz, grosor=0.8, presion=0.55, temblor=0.4, cortes=0.2)
    lz.contorno(fl | band, lapiz, grosor=0.7, presion=0.45, cortes=0.3, desfase=0.3)


def banderines(lz, p0, c1, c2, p1, cols, n=12, tam=16, lapiz='#7c5a48'):
    """A string of little triangular flags (no letters)."""
    cu = bezier(p0, c1, c2, p1, 220)
    lz.lapiz([cu], lapiz, grosor=0.8, presion=0.55, temblor=0.5)
    for k in range(n):
        i = int((k + 0.5) / n * 219)
        a, b = cu[max(0, i - 6)], cu[min(219, i + 6)]
        m = cu[i]
        d = (b - a) / max(1e-6, np.linalg.norm(b - a))
        nr = np.array([-d[1], d[0]])
        if nr[1] < 0:
            nr = -nr
        tri = Poligono([m - d * tam * 0.5, m + d * tam * 0.5, m + nr * tam * 1.15 + d * tam * 0.05], suave=False)
        c = cols[k % len(cols)]
        lz.aguada(tri, c, dens=0.75, irreg=0.35, borde=0.7, tapa=1, gran=0.3)
        lz.contorno(tri, _lapiz_de(c, 0.5), grosor=0.6, presion=0.45, cortes=0.25, desfase=0.2)


# ======================================================================
#  Album-quality people (section 8 of DISENO4: no mannequins)
# ======================================================================
#
#  Few, big figures. Faces worked in sepia pencil: eyelids and lashes, a nose
#  with its side plane and nostril, lips, rosy cheeks, a shaded jaw. Hands
#  with real fingers that bend round what they hold. Bodies are drawn shape
#  by shape in each month script (clothes with folds), these are the parts.

from acuarela import cabeza as _cabeza_lib, flor_simple  # noqa: E402  (re-export for scripts)

SEPIA = '#5e3f30'


def _rot(x, y, ang):
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    return lambda dx, dy: (x + dx * ca - dy * sa, y + dx * sa + dy * ca)


def cabeza_album(lz, x, y, r, piel='#e6ae88', pelo='#4a2e22', peinado='corto', giro=0.0, inclina=0.0,
                 ojos='abiertos', boca='sonrisa', mira=(0, 0), canas=False, barba=None, adorno=None,
                 cuello=True, pelo2=None, lapiz=None, semilla=None, pendiente=None, gafas=False, base=None, ancho_base=None):
    """A picture-book head. (x, y) = centre of the face, r = half face height.
    giro -1..1: 3/4 turn (+ = looks to the image's right). inclina: tilt (deg).
    ojos: 'abiertos' | 'cerrados' (content, lashes down) | 'feliz' (laughing arcs)
    | 'abajo' (looking down: heavy lids). boca: 'sonrisa' | 'risa' | 'suave' | 'o'.
    peinado: 'corto' | 'rizado' | 'moño' | 'pañuelo' | 'coletas' | 'largo' | 'calvo'.
    Returns a dict with useful anchor points (neck base, mouth...)."""
    sem = lz._sem(semilla)
    rng = np.random.default_rng(sem)
    R = _rot(x, y, inclina)
    g = float(giro)
    piel_c = rgb(piel)
    lp = lapiz or tuple((piel_c * 0.35 + rgb('#3a1e14') * 0.65).tolist())  # warm sepia from the skin
    pelo_c = pelo if not canas else '#d9d2ca'
    pelo_lp = _lapiz_de(pelo_c, 0.5) if not canas else '#9a8e86'
    fx = g * 0.28 * r                      # features centre shift
    kL, kR = 1 + 0.12 * g, 1 - 0.3 * max(g, 0) + 0.12 * min(g, 0)   # side compression
    kR = 1 - 0.28 * g if g > 0 else 1 - 0.1 * g
    kL = 1 + 0.28 * g if g < 0 else 1 + 0.1 * g
    kL, kR = (1 + 0.1 * g, 1 - 0.28 * g) if g >= 0 else (1 + 0.28 * g, 1 - 0.1 * g)

    def side(sd):
        return kL if sd < 0 else kR

    # --- hair behind
    back = None
    if peinado == 'largo':
        back = Poligono([R(-r * 1.0 * kL, -r * 0.4), R(-r * 1.12 * kL, r * 0.7), R(-r * 1.05 * kL, r * 1.55),
                         R(-r * 0.4, r * 1.5), R(r * 0.4, r * 1.5), R(r * 1.05 * kR, r * 1.55),
                         R(r * 1.12 * kR, r * 0.7), R(r * 1.0 * kR, -r * 0.4), R(0, -r * 1.25)])
    elif peinado == 'pañuelo':
        back = Poligono([R(-r * 1.08 * kL, -r * 0.3), R(-r * 1.1 * kL, r * 0.5), R(-r * 0.8 * kL, r * 0.95),
                         R(-r * 0.3, r * 1.0), R(r * 0.3, r * 1.0), R(r * 0.8 * kR, r * 0.95), R(r * 1.1 * kR, r * 0.5),
                         R(r * 1.08 * kR, -r * 0.3), R(0, -r * 1.3)])
    elif peinado == 'rizado':
        cs = []
        for a in np.linspace(140, 400, 15):
            rr = r * rng.uniform(0.34, 0.44)
            cs.append((*R(math.cos(math.radians(a)) * r * 1.02 * (kL if math.cos(math.radians(a)) < 0 else kR),
                          math.sin(math.radians(a)) * r * 1.08 - r * 0.12), rr))
        back = Circulos(cs)
    elif peinado == 'moño':
        bx, by = R(-g * r * 0.25, -r * 1.12)
        back = Elipse(bx, by, r * 0.46, r * 0.4)
    elif peinado == 'coletas':
        back = None
        for sd in (-1, 1):
            f = Poligono([R(sd * r * 0.85 * side(sd), -r * 0.35), R(sd * r * 1.45 * side(sd), -r * 0.1),
                          R(sd * r * 1.55 * side(sd), r * 0.5), R(sd * r * 1.3 * side(sd), r * 0.75),
                          R(sd * r * 1.2 * side(sd), r * 0.2), R(sd * r * 0.9 * side(sd), r * 0.05)])
            lz.aguada(f, pelo_c, dens=0.85, tapa=1, irreg=0.5, borde=0.6, gran=0.35,
                      toques=[(*R(sd * r * 1.3, r * 0.3), r * 0.4, mezcla(pelo_c, '#000000', 0.3), 0.5)])
            lz.contorno(f, pelo_lp, grosor=0.8, presion=0.5, cortes=0.35)
            lz.lapiz([spline([R(sd * r * (0.95 + 0.1 * k) * side(sd), -r * 0.2), R(sd * r * (1.35 + 0.05 * k) * side(sd), r * 0.15),
                              R(sd * r * (1.3 + 0.04 * k) * side(sd), r * 0.6)]) for k in range(3)],
                     pelo_lp, grosor=0.6, presion=0.4, temblor=0.2)
            lz.aguada(Elipse(*R(sd * r * 1.02 * side(sd), -r * 0.2), r * 0.16, r * 0.12), adorno or '#e8735e', dens=0.9,
                      tapa=1, irreg=0.3)
    if back is not None:
        tq = [(*R(-g * r * 0.5, r * 0.6), r * 0.8, mezcla(pelo_c, '#000000', 0.3), 0.55)]
        lz.aguada(back, pelo_c if peinado != 'pañuelo' else (pelo2 or pelo_c), dens=0.85 if not canas else 0.45,
                  tapa=1, irreg=0.6, borde=0.65, gran=0.4, toques=tq, flor=1 if peinado == 'pañuelo' else 0)
        lz.contorno(back, pelo_lp, grosor=0.85, presion=0.5, cortes=0.35)
    # --- neck (behind the face). With base=(x, y) between the shoulders and ancho_base, the library's
    # natural neck (narrow under the jaw, opening into the trapezius, clavicles): paint the clothes AFTER the head.
    if cuello and base is not None:
        import acuarela as _ac
        _ac.cuello_natural(lz, x, y, r, piel, base, ancho_base or r * 2.6, giro=giro, inclina=inclina)
    elif cuello:
        nk = Trazo([R(fx * 0.2, r * 0.55), R(fx * 0.1, r * 1.25), R(0, r * 1.75)], (r * 0.62, r * 0.6, r * 0.7))
        lz.aguada(nk, piel, dens=0.6, tapa=1, irreg=0.4, borde=0.4, gran=0.2,
                  toques=[(*R(0, r * 0.95), r * 0.55, mezcla(piel, '#8a4a30', 0.45), 0.75)])
        lz.contorno(nk, lp, grosor=0.8, presion=0.45, cortes=0.4, desfase=0.3,
                    solo=(x - 2 * r, y + r * 0.85, x + 2 * r, y + r * 1.65))
    # --- ears
    for sd in (-1, 1):
        if sd * g > 0.45:
            continue
        ex, ey = R(sd * r * 0.86 * side(sd), r * 0.12)
        f = Elipse(ex, ey, r * 0.15, r * 0.24, inclina)
        lz.aguada(f, piel, dens=0.65, tapa=1, irreg=0.3, borde=0.5, toques=[(ex, ey, r * 0.1, '#e98a7a', 0.6)])
        lz.contorno(f, lp, grosor=0.6, presion=0.45, cortes=0.2, desfase=0.2)
        lz.lapiz([arco(ex, ey, r * 0.08, r * 0.14, 200 if sd < 0 else -20, 340 if sd < 0 else 120, 10)], lp,
                 grosor=0.5, presion=0.35)
        if pendiente:
            lz.aguada(Elipse(ex, ey + r * 0.32, r * 0.06), pendiente, dens=1.0, irreg=0.1)
    # --- face
    cx_ch = fx * 0.55
    face = Poligono([R(-r * 0.8 * kL, -r * 0.78), R(-r * 0.9 * kL, -r * 0.2), R(-r * 0.88 * kL, r * 0.25),
                     R(-r * 0.72 * kL, r * 0.62), R(cx_ch - r * 0.32 * kL, r * 0.94), R(cx_ch, r * 1.02),
                     R(cx_ch + r * 0.32 * kR, r * 0.94), R(r * 0.72 * kR, r * 0.62), R(r * 0.88 * kR, r * 0.25),
                     R(r * 0.9 * kR, -r * 0.2), R(r * 0.8 * kR, -r * 0.78), R(0, -r * 1.02)])
    sh = -1 if g >= 0 else 1          # shadow side = the side turning away... light from the turned side
    sh = 1 if g >= 0 else -1
    tq = [(*R(sh * r * 0.85, r * 0.3), r * 0.55, mezcla(piel, '#9a5236', 0.5), 0.55),
          (*R(cx_ch, r * 1.0), r * 0.35, mezcla(piel, '#9a5236', 0.4), 0.45),
          (*R(-sh * r * 0.25, -r * 0.45), r * 0.5, mezcla(piel, '#fff2e0', 0.5), 0.5)]
    lz.aguada(face, piel, dens=0.58, borde=0.5, irreg=0.5, gran=0.25, var=0.3, tapa=1, toques=tq)
    # second glaze on the shadow side (veladura)
    lz.aguada(face, mezcla(piel, '#b0603e', 0.35), dens=0.25, suave=r * 0.08,
              desvanece=(x + sh * r * 0.9, y, x - sh * r * 0.1, y))
    # cheeks
    for sd in (-1, 1):
        if sd * g > 0.75:
            continue
        cx, cy = R(fx + sd * r * 0.5 * side(sd), r * 0.42)
        lz.aguada(Elipse(cx, cy, r * 0.22 * side(sd), r * 0.15, inclina), '#ea6f74', dens=0.5, suave=r * 0.1, gran=0.1)
    # --- eyes
    ey = r * 0.1
    for sd in (-1, 1):
        k = 1 - 0.3 * max(0, sd * g)
        ex_, ey_ = R(fx + sd * r * 0.34 * side(sd), ey)
        if ojos in ('abiertos', 'abajo'):
            mx, my = mira
            pupy = ey_ + (r * 0.03 if ojos == 'abajo' else 0)
            ix, iy = ex_ + mx * r * 0.04, pupy + my * r * 0.03
            lz.aguada(Elipse(ix, iy, r * 0.085 * k, r * 0.105, inclina), '#3a2620', dens=1.3, borde=0.25, irreg=0.1,
                      gran=0.05, toques=[(ix, iy + r * 0.05, r * 0.05, '#7a4a2a', 0.6)])
            lz.gouache(Elipse(ix + r * 0.03, iy - r * 0.04, max(0.5, r * 0.03)), '#fffdf6', alfa=0.95, irreg=0)
            # upper lid (heavier when looking down) and the outer lash
            a0, a1 = (200, 340)
            lid = arco(ex_, ey_ + (r * 0.035 if ojos == 'abajo' else 0.0), r * 0.13 * k, r * (0.08 if ojos == 'abajo' else 0.115),
                       a0, a1, 12, inclina)
            lz.lapiz([lid], '#3a2620', grosor=1.25, presion=0.9, temblor=0.05, puntas=0.2)
            out = lid[-1] if sd > 0 else lid[0]
            lz.lapiz([[out, (out[0] + sd * r * 0.06, out[1] - r * 0.04)]], '#3a2620', grosor=0.8, presion=0.8, temblor=0.02)
            # crease and lower lid
            lz.lapiz([arco(ex_, ey_ - r * 0.03, r * 0.14 * k, r * 0.13, 215, 325, 10, inclina)], lp, grosor=0.6,
                     presion=0.35, temblor=0.05)
            lz.lapiz([arco(ex_, ey_ + r * 0.005, r * 0.1 * k, r * 0.085, 40, 140, 8, inclina)], lp, grosor=0.55,
                     presion=0.3, temblor=0.05)
        else:
            if ojos == 'feliz':
                lid = arco(ex_, ey_ + r * 0.05, r * 0.13 * k, r * 0.1, 200, 340, 12, inclina)
            else:  # content, closed: a downward curve with lashes
                lid = arco(ex_, ey_ - r * 0.03, r * 0.13 * k, r * 0.08, 20, 160, 12, inclina)
            lz.lapiz([lid], '#3a2620', grosor=1.2, presion=0.9, temblor=0.05, puntas=0.2)
            if ojos == 'cerrados':
                tr = []
                for t in (0.25, 0.5, 0.75):
                    p = lid[int(t * (len(lid) - 1))]
                    tr.append([p, (p[0] + sd * r * 0.02, p[1] + r * 0.06)])
                lz.lapiz(tr, '#3a2620', grosor=0.6, presion=0.7, temblor=0.02)
            lz.lapiz([arco(ex_, ey_ - r * 0.06, r * 0.14 * k, r * 0.12, 215, 325, 10, inclina)], lp, grosor=0.55,
                     presion=0.3, temblor=0.05)
        # brow
        bx, by = R(fx + sd * r * 0.37 * side(sd), ey - r * 0.27)
        lz.lapiz([arco(bx, by + r * 0.08, r * 0.17 * k, r * 0.08, 205, 335, 10, inclina)], pelo_lp if not canas else '#8a7a70',
                 grosor=1.0, presion=0.6, temblor=0.08, puntas=0.35)
    if gafas:
        for sd in (-1, 1):
            k = 1 - 0.3 * max(0, sd * g)
            ex_, ey_ = R(fx + sd * r * 0.34 * side(sd), ey)
            lz.lapiz([arco(ex_, ey_, r * 0.2 * k, r * 0.17, 0, 360, 24, inclina)], '#7a5a3a', grosor=0.8, presion=0.7,
                     temblor=0.03)
        lz.lapiz([[R(fx - r * 0.14, ey - r * 0.02), R(fx + r * 0.14, ey - r * 0.02)]], '#7a5a3a', grosor=0.8, presion=0.7)
    # --- nose: the side plane, the tip and a nostril
    nx, ny = fx + g * r * 0.12, r * 0.42
    s_ = 1 if g >= 0 else -1
    lz.lapiz([spline([R(fx + s_ * r * 0.06, ey - r * 0.04), R(nx + s_ * r * 0.06, r * 0.26),
                      R(nx + s_ * r * 0.11, r * 0.4)])], lp, grosor=0.7, presion=0.35, temblor=0.05, puntas=0.4)
    lz.lapiz([arco(*R(nx, ny), r * 0.11, r * 0.06, 10, 170, 12, inclina)], lp, grosor=0.8, presion=0.6, temblor=0.03)
    lz.aguada(Elipse(*R(nx, ny - r * 0.05), r * 0.08, r * 0.06), '#e58a72', dens=0.35, suave=r * 0.04)
    lz.aguada(Elipse(*R(nx + s_ * r * 0.05, ny + r * 0.01), r * 0.025, r * 0.018), '#7a3a2a', dens=0.7, irreg=0.1)
    # --- mouth
    mx_, my_ = R(fx + g * r * 0.06, r * 0.68)
    if boca in ('risa', 'o'):
        w, h = (r * 0.22, r * 0.17) if boca == 'risa' else (r * 0.1, r * 0.13)
        m = Poligono(np.vstack([arco(mx_, my_ - h * 0.35, w, h * 0.25, 180, 360, 10, inclina),
                                arco(mx_, my_ - h * 0.35, w * 0.95, h, 0, 180, 14, inclina)]), suave=False)
        lz.aguada(m, '#9e3540', dens=0.85, irreg=0.15, borde=0.4, gran=0.05,
                  toques=[(mx_, my_ + h * 0.4, w * 0.6, '#d9727a', 0.7)])
        if boca == 'risa':
            lz.gouache(Poligono(np.vstack([arco(mx_, my_ - h * 0.33, w * 0.85, h * 0.22, 185, 355, 8, inclina),
                                            arco(mx_, my_ - h * 0.2, w * 0.75, h * 0.18, 0, 180, 8, inclina)]),
                                suave=False), '#fff8ee', alfa=0.85, irreg=0)
        lz.contorno(m, '#7a2a30', grosor=0.6, presion=0.5, cortes=0.1, desfase=0.05)
    else:
        w = r * (0.24 if boca == 'sonrisa' else 0.16)
        lip = arco(mx_, my_ - r * 0.13, w, r * 0.13, 25, 155, 14, inclina)
        lz.aguada(Elipse(mx_, my_ + r * 0.03, w * 0.5, r * 0.045, inclina), '#d9707a', dens=0.6, irreg=0.2, suave=r * 0.02)
        lz.lapiz([lip], '#7a3030', grosor=0.95, presion=0.85, temblor=0.03, puntas=0.25)
        for sd in (-1, 1):  # dimples
            p = lip[0] if sd > 0 else lip[-1]
            lz.lapiz([[p, (p[0] + sd * r * 0.03, p[1] - r * 0.035)]], lp, grosor=0.6, presion=0.45)
    # jaw line on the shadow side, chin
    lz.contorno(face, lp, grosor=0.85, presion=0.5, cortes=0.35, desfase=0.35,
                solo=(x - 2 * r, y - r * 0.2, x + 2 * r, y + 2 * r))
    # --- beard
    if barba:
        b = Poligono([R(-r * 0.86 * kL, r * 0.2), R(-r * 0.74 * kL, r * 0.75), R(cx_ch - r * 0.3, r * 1.12),
                      R(cx_ch, r * 1.22), R(cx_ch + r * 0.3, r * 1.12), R(r * 0.74 * kR, r * 0.75),
                      R(r * 0.86 * kR, r * 0.2), R(r * 0.5 * kR, r * 0.5), R(fx + r * 0.2, r * 0.56),
                      R(fx, r * 0.52), R(fx - r * 0.2, r * 0.56), R(-r * 0.5 * kL, r * 0.5)])
        lz.aguada(b, barba, dens=0.7, gran=0.45, borde=0.5, irreg=0.9)
        tr = [[R(rng.uniform(-0.7, 0.7) * r, rng.uniform(0.4, 0.9) * r)] for _ in range(26)]
        tr = [[p[0], (p[0][0] + rng.normal(0, 1), p[0][1] + r * 0.12)] for p in tr]
        lz.lapiz(tr, _lapiz_de(barba, 0.45), grosor=0.5, presion=0.45, temblor=0.1)
        lz.contorno(b, _lapiz_de(barba, 0.5), grosor=0.7, presion=0.4, cortes=0.4)
        lz.lapiz([arco(mx_, my_ - r * 0.13, r * 0.22, r * 0.13, 25, 155, 14, inclina)], '#7a3030', grosor=0.9,
                 presion=0.85)
    # --- hair on top
    hp = None
    part = g * 0.35
    if peinado in ('corto', 'largo', 'coletas', 'moño'):
        hp = Poligono([R(-r * 0.95 * kL, r * 0.3 if peinado != 'corto' else r * 0.05), R(-r * 1.0 * kL, -r * 0.45),
                       R(-r * 0.62 * kL, -r * 1.0), R(r * 0.1, -r * 1.16), R(r * 0.7 * kR, -r * 0.98),
                       R(r * 1.0 * kR, -r * 0.42), R(r * 0.95 * kR, r * 0.3 if peinado != 'corto' else r * 0.05),
                       R(r * 0.8 * kR, -r * 0.3), R(r * (0.3 + part), -r * 0.62), R(r * (part - 0.1), -r * 0.7),
                       R(-r * (0.45 - part), -r * 0.5), R(-r * 0.82 * kL, -r * 0.25)])
    elif peinado == 'rizado':
        cs = []
        for a in np.linspace(175, 365, 10):
            cs.append((*R(math.cos(math.radians(a)) * r * 0.9 * (kL if math.cos(math.radians(a)) < 0 else kR),
                          math.sin(math.radians(a)) * r * 0.95 - r * 0.2), r * rng.uniform(0.26, 0.34)))
        hp = Circulos(cs)
    elif peinado == 'calvo':
        hp = (Poligono([R(-r * 0.92 * kL, r * 0.15), R(-r * 0.93 * kL, -r * 0.4), R(-r * 0.7 * kL, -r * 0.55),
                        R(-r * 0.76 * kL, 0)]) |
              Poligono([R(r * 0.92 * kR, r * 0.15), R(r * 0.93 * kR, -r * 0.4), R(r * 0.7 * kR, -r * 0.55),
                        R(r * 0.76 * kR, 0)]))
    elif peinado == 'pañuelo':
        hp = Poligono([R(-r * 1.02 * kL, r * 0.35), R(-r * 1.04 * kL, -r * 0.45), R(-r * 0.6 * kL, -r * 1.12),
                       R(r * 0.2, -r * 1.22), R(r * 0.75 * kR, -r * 1.05), R(r * 1.04 * kR, -r * 0.45),
                       R(r * 1.02 * kR, r * 0.35), R(r * 0.86 * kR, r * 0.25), R(r * 0.84 * kR, -r * 0.42),
                       R(r * 0.2, -r * 0.62), R(-r * 0.6 * kL, -r * 0.5), R(-r * 0.86 * kL, r * 0.25)])
    if hp is not None:
        col = pelo_c if peinado != 'pañuelo' else (pelo2 or pelo_c)
        tq = [(*R(-g * r * 0.6 + r * 0.3, -r * 0.9), r * 0.5, mezcla(col, '#ffffff', 0.35), 0.55),
              (*R(r * 0.6 * sh, -r * 0.2), r * 0.5, mezcla(col, '#000000', 0.25), 0.5)]
        lz.aguada(hp, col, dens=0.85 if not canas else 0.45, borde=0.65, gran=0.45, tapa=1, irreg=0.7, toques=tq)
        lz.contorno(hp, pelo_lp if peinado != 'pañuelo' else _lapiz_de(col, 0.5), grosor=0.85, presion=0.55, cortes=0.3)
        if peinado == 'pañuelo':
            # little pattern of dots on the scarf and a knot
            for _ in range(22):
                px_, py_ = R(rng.uniform(-0.9, 0.9) * r, rng.uniform(-1.1, -0.5) * r)
                lz.gouache(Elipse(px_, py_, r * 0.03), '#fff3dc', alfa=0.8, irreg=0)
            kx, ky = R(-r * 0.75 * kL, r * 0.3)
        elif peinado != 'calvo':
            st = []
            for k in range(9):
                a0 = rng.uniform(-0.8, 0.7)
                st.append(spline([R(r * (part - 0.05), -r * 1.08), R(r * (a0 * 0.6 + part * 0.5), -r * 0.95),
                                  R(r * a0, -r * 0.62)]))
            lz.lapiz(st, pelo_lp, grosor=0.6, presion=0.45, temblor=0.15, cortes=0.25)
    if peinado == 'moño':
        bx, by = R(-g * r * 0.25, -r * 1.12)
        lz.lapiz([arco(bx, by, r * 0.3, r * 0.26, a, a + 200, 14) for a in (0, 120, 240)], pelo_lp, grosor=0.6,
                 presion=0.45)
    if adorno:
        flor_simple(lz, *R(-r * 0.7 * kL, -r * 0.75), r * 0.26, adorno)
    return dict(cuello=R(0, r * 1.7), boca=(mx_, my_), barbilla=R(cx_ch, r * 1.02))


def mano_dedos(lz, x, y, ang, tam, piel='#e6ae88', curl=0.25, abre=1.0, lado=1, pulgar=0.5, dedos=4,
               tapa=1.0, lapiz=None, semilla=None, dorso=True):
    """A hand with fingers. (x, y) = wrist; ang = direction of the fingers
    (deg); tam = wrist-to-fingertip length. curl 0 (straight) .. 1 (fist):
    fingers bend at two joints. abre: spread of the fingers. lado = +1 / -1
    puts the thumb on one side or the other (left/right hand, palm/back).
    pulgar: 0 thumb tucked along the palm .. 1 thumb wide open."""
    piel_c = rgb(piel)
    lp = lapiz or tuple((piel_c * 0.35 + rgb('#3a1e14') * 0.65).tolist())
    a = math.radians(ang)
    d = np.array([math.cos(a), math.sin(a)])
    n = np.array([-d[1], d[0]]) * lado
    o = np.array([x, y], float)
    L = lambda u, v: o + d * u * tam + n * v * tam
    palma = Poligono([L(-0.02, -0.15), L(0.18, -0.2), L(0.4, -0.19), L(0.44, -0.02), L(0.41, 0.17),
                      L(0.2, 0.18), L(-0.02, 0.13)])
    formas = [palma]
    trazos = []
    largos = (0.47, 0.53, 0.5, 0.39)
    ys = (-0.14, -0.047, 0.047, 0.135)
    for i in range(dedos):
        sp = (-11, -3.5, 3.5, 11)[i] * abre
        base = L(0.4 - 0.035 * abs(i - 1.3) / 1.3, ys[i])
        ln = largos[i] * tam
        ang1 = ang + sp * lado
        seg = [base]
        p = base.copy()
        dirs = ang1
        for j, fr in enumerate((0.45, 0.32, 0.23)):
            dirs = dirs + curl * (40 if j == 0 else 62) * lado
            p = p + np.array([math.cos(math.radians(dirs)), math.sin(math.radians(dirs))]) * ln * fr
            seg.append(p.copy())
        w = tam * (0.108 if i < 3 else 0.092)
        f = Trazo(seg, (w, w * 0.92, w * 0.82, w * 0.7), suave=True)
        formas.append(f)
        trazos.append(f)
    # thumb
    tb = L(0.06, -0.15)
    tang = ang - lado * (25 + 45 * pulgar)
    p1 = tb + np.array([math.cos(math.radians(tang)), math.sin(math.radians(tang))]) * tam * 0.24
    tang2 = tang + lado * (25 + 35 * curl)
    p2 = p1 + np.array([math.cos(math.radians(tang2)), math.sin(math.radians(tang2))]) * tam * 0.2
    pul = Trazo([tb, p1, p2], (tam * 0.17, tam * 0.13, tam * 0.1))
    formas.append(pul)
    U = formas[0]
    for f in formas[1:]:
        U = U | f
    lz.aguada(U, piel, dens=0.6, tapa=tapa, irreg=0.35, borde=0.55, gran=0.2,
              toques=[(*L(0.25, 0.1 * lado), tam * 0.3, mezcla(piel, '#a0563a', 0.4), 0.45),
                      (*L(0.75, 0), tam * 0.3, mezcla(piel, '#e9727a', 0.35), 0.4)])
    lz.contorno(U, lp, grosor=0.75, presion=0.55, cortes=0.15, desfase=0.15, min_len=3)
    # separations between fingers, knuckles and nails
    for f in trazos[1:]:
        lz.lapiz([f.contorno_pts()[1 if lado > 0 else 0][2:-6]], lp, grosor=0.55, presion=0.4, temblor=0.03)
    for f in trazos:
        tip = f.p[-1]
        lz.gouache(Elipse(*(f.p[-4] * 0.4 + tip * 0.6), tam * 0.025), '#fde9dc', alfa=0.5, irreg=0)
    if dorso:
        lz.lapiz([[L(0.45, -0.1), L(0.47, 0.0)], [L(0.46, 0.04), L(0.45, 0.12)]], lp, grosor=0.5, presion=0.3)
    return U


def manga(lz, pts, anchos, color, toques=None, pliegues=2, tapa=1.0, dens=0.72, lapiz=None, semilla=None, **kw):
    """Sleeve or trouser leg along a bent path, with pencil folds at the bend."""
    f = Trazo(pts, anchos)
    kw.setdefault('sombra', (-5, -4))
    lz.aguada(f, color, dens=dens, tapa=tapa, toques=toques, borde=0.6, gran=0.35, **kw)
    lp = lapiz or _lapiz_de(color, 0.5)
    lz.contorno(f, lp, grosor=0.85, presion=0.55, cortes=0.25)
    if pliegues and len(pts) >= 3:
        rng = np.random.default_rng(lz._sem(semilla))
        p = np.asarray(pts[1], float)
        d = np.asarray(pts[2], float) - np.asarray(pts[0], float)
        d /= max(np.linalg.norm(d), 1e-6)
        nr = np.array([-d[1], d[0]])
        w = anchos[1] if len(anchos) > 2 else anchos[0]
        tr = []
        for k in range(pliegues):
            c = p + d * (k - (pliegues - 1) / 2) * w * 0.45
            tr.append(bezier(c - nr * w * 0.35, c + d * w * 0.2 + nr * rng.normal(0, 0.05) * w, c + nr * w * 0.3))
        lz.lapiz(tr, lp, grosor=0.7, presion=0.45, temblor=0.1)
    return f


# ======================================================================
#  Food with personality (month 10). Each returns the face anchor so the
#  script can add arms that hug, hold hands or wave.
# ======================================================================

def _wash(lz, f, col, toques=None, dens=0.85, sombra=(-5, -4), tapa=1, lapiz=None, borde=0.75):
    lz.aguada(f, col, dens=dens, tapa=tapa, irreg=0.3, borde=borde, gran=0.25, toques=toques, sombra=sombra)
    lz.contorno(f, lapiz or _lapiz_de(col, 0.45), grosor=0.75, presion=0.55, cortes=0.15, desfase=0.15)


def lenteja(lz, x, y, r, ang=0, col='#9a8a46'):
    """A lentil (pardina): a flat lens with a lighter rim and dark speckles."""
    f = Elipse(x, y, r, r * 0.66, ang)
    _wash(lz, f, col, toques=[(x - r * 0.3, y - r * 0.25, r * 0.6, '#c8b46a', 0.7), (x + r * 0.5, y + r * 0.3, r * 0.5, '#5a4a22', 0.5)],
          lapiz='#4a3a1a' if r > 8 else '#8a7a4a')
    lz.lapiz([arco(x, y, r * 0.86, r * 0.54, 190, 350, 16, ang)], '#e6d79a', grosor=0.9 if r > 10 else 0.5, presion=0.6)
    if r > 10:
        rg = np.random.default_rng(int(x * 3 + y * 5))
        for _ in range(int(r * 1.2)):
            a_, d = rg.uniform(0, 6.28), rg.uniform(0.1, 0.85)
            lz.aguada(Elipse(x + math.cos(a_) * r * d, y + math.sin(a_) * r * d * 0.62, rg.uniform(0.5, 1.1)), '#4a3a1e',
                      dens=0.7, irreg=0.1)
    return f


def limon(lz, x, y, r, ang=0):
    pts = [(-1.05, 0), (-0.82, -0.42), (-0.3, -0.7), (0.3, -0.7), (0.82, -0.42), (1.05, 0), (0.82, 0.42), (0.3, 0.7),
           (-0.3, 0.7), (-0.82, 0.42)]
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    f = Poligono([(x + (px * ca - py * sa) * r, y + (px * sa + py * ca) * r) for px, py in pts])
    _wash(lz, f, '#f2cf3a', toques=[(x - r * 0.3, y - r * 0.3, r * 0.6, '#fbe88a', 0.7), (x + r * 0.5, y + r * 0.4, r * 0.6, '#d9a020', 0.5)],
          lapiz='#a07a12')
    rg = np.random.default_rng(int(x * 7 + y * 13))
    for _ in range(14):  # pores
        a, d = rg.uniform(0, 6.28), rg.uniform(0.2, 0.8)
        lz.aguada(Elipse(x + math.cos(a) * r * d, y + math.sin(a) * r * d * 0.6, 0.7), '#c89a1a', dens=0.6, irreg=0.1)
    lz.gouache(Elipse(x - r * 0.45, y - r * 0.35, r * 0.18, r * 0.07, -25), '#fffbe0', alfa=0.7, irreg=0)
    return f


def pimiento(lz, x, y, r):
    """A red pepper standing up: three lobes, green stalk."""
    f = Poligono([(x - r * 0.8, y - r * 0.85), (x - r * 0.3, y - r * 1.0), (x, y - r * 0.85), (x + r * 0.3, y - r * 1.0),
                  (x + r * 0.8, y - r * 0.85), (x + r * 0.95, y - r * 0.1), (x + r * 0.7, y + r * 0.85), (x + r * 0.25, y + r * 1.05),
                  (x, y + r * 0.85), (x - r * 0.25, y + r * 1.05), (x - r * 0.7, y + r * 0.85), (x - r * 0.95, y - r * 0.1)])
    _wash(lz, f, '#d8322a', toques=[(x - r * 0.4, y - r * 0.3, r * 0.5, '#f0705a', 0.7), (x + r * 0.6, y + r * 0.5, r * 0.6, '#8f1a1a', 0.55)],
          lapiz='#7a1a1a')
    lz.lapiz([bezier((x - r * 0.3, y - r * 0.9), (x - r * 0.4, y), (x - r * 0.25, y + r * 0.95)),
              bezier((x + r * 0.3, y - r * 0.9), (x + r * 0.4, y), (x + r * 0.25, y + r * 0.95))], '#a0201e', grosor=0.7, presion=0.45)
    tallo = Trazo([(x, y - r * 0.9), (x + r * 0.05, y - r * 1.25), (x + r * 0.3, y - r * 1.4)], (r * 0.3, r * 0.16, r * 0.12))
    _wash(lz, tallo, '#5f8f3a', lapiz='#3f5f2a')
    lz.gouache(Trazo([(x - r * 0.6, y - r * 0.5), (x - r * 0.62, y + r * 0.2)], (r * 0.12, r * 0.06)), '#fff0e6', alfa=0.6, irreg=0)
    return f


def arroz(lz, x, y, r, ang=-10):
    """A grain of rice (r = half its length): slender, pearly, one end pointed."""
    ca, sa = math.cos(math.radians(ang + 90)), math.sin(math.radians(ang + 90))
    pts = [(0, -1.0), (0.16, -0.82), (0.3, -0.35), (0.32, 0.4), (0.22, 0.86), (0.04, 1.0), (-0.2, 0.9), (-0.32, 0.45), (-0.32, -0.3),
           (-0.18, -0.78)]
    f = Poligono([(x + (py * ca - px * sa) * r, y + (py * sa + px * ca) * r) for px, py in pts])
    _wash(lz, f, '#f8f2e2', toques=[(x + r * 0.15, y + r * 0.45, r * 0.4, '#dccfb0', 0.7)], dens=0.65, lapiz='#9a8a6a')
    lz.gouache(Elipse(x - r * 0.15, y - r * 0.3, r * 0.08, r * 0.35, ang), '#ffffff', alfa=0.7, irreg=0)
    lz.aguada(Elipse(x + r * 0.04, y + r * 0.8, r * 0.1, r * 0.08), '#e0c890', dens=0.6, irreg=0.1)
    return f


def huevo(lz, x, y, r, ang=0, col='#f3e2c8'):
    f = Poligono([(x + px * r, y + py * r) for px, py in ((0, -1.25), (0.62, -0.85), (0.88, 0.05), (0.7, 0.75), (0, 1.0),
                                                          (-0.7, 0.75), (-0.88, 0.05), (-0.62, -0.85))])
    _wash(lz, f, col, toques=[(x + r * 0.4, y + r * 0.5, r * 0.6, '#c8a07a', 0.5)], dens=0.65, lapiz='#9a7a5a')
    return f


def caras_de(lz, x, y, r, **kw):
    """Shorthand for carita()."""
    carita(lz, x, y, r, **kw)


def flor_popular(lz, x, y, r, col='#f6e6c8', centro='#e8735e', petalos=6, ang=0.0, lapiz=None, puntos='#fff6dc'):
    """A folk-painted flower (like on a painted cupboard): round petals that cover what is under them
    (reserve + glaze), a contrasting heart ringed with gouache dots, pencil petal lines."""
    lp = lapiz or _lapiz_de(col, 0.45)
    for k in range(petalos):
        a = math.radians(ang + k * 360 / petalos)
        cx, cy = x + math.cos(a) * r * 0.58, y + math.sin(a) * r * 0.58
        f = Elipse(cx, cy, r * 0.5, r * 0.36, math.degrees(a))
        lz.aguada(f, col, dens=0.85, tapa=1, irreg=0.25, borde=0.75, gran=0.2)
        lz.contorno(f, lp, grosor=0.6, presion=0.5, cortes=0.15, desfase=0.1)
        lz.lapiz([[(x + math.cos(a) * r * 0.3, y + math.sin(a) * r * 0.3), (x + math.cos(a) * r * 0.8, y + math.sin(a) * r * 0.8)]],
                 lp, grosor=0.5, presion=0.35)
    lz.aguada(Elipse(x, y, r * 0.3), centro, dens=0.95, tapa=1, irreg=0.2, borde=0.7)
    for k in range(8):
        a = math.radians(k * 45 + 10)
        lz.gouache(Elipse(x + math.cos(a) * r * 0.42, y + math.sin(a) * r * 0.42, max(0.5, r * 0.05)), puntos, alfa=0.9, irreg=0)
