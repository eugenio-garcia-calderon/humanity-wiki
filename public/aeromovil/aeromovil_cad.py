"""
Aeromóvil Gota · tándem 1+2 — modelo CAD paramétrico (CadQuery / OpenCASCADE)

Vehículo de pedaleo asistido (dimensionado de bicicleta eléctrica) con:
  - disposición en rombo: rueda delantera, trasera y dos laterales basculantes
  - piloto delante y dos pasajeros detrás, lado a lado
  - horquilla de enduro delante y basculante con amortiguador detrás
  - transmisión sin cadena: generador en el pedalier + motor de buje trasero

Genera un STEP con piezas agrupadas por capas y un STL por capa.

Uso:
    python aeromovil_cad.py                 # parámetros por defecto
    python aeromovil_cad.py params.json     # parámetros copiados desde el visor

Ejes: X hacia delante (eje delantero en X=0), Y lateral, Z arriba. Unidades: mm.
"""
import json, math, sys, os
import cadquery as cq
from OCP.BRepOffsetAPI import BRepOffsetAPI_ThruSections
from OCP.BRepBuilderAPI import BRepBuilderAPI_MakeVertex
from OCP.gp import gp_Pnt

# ------------------------------------------------------------------ parámetros
P = dict(
    B=2.6,              # batalla = longitud del chasis, eje delantero a eje trasero (m)
    wF="24",            # rueda delantera y trasera (pulgadas de bici)
    wL="20",            # ruedas laterales basculantes
    fL=0.4692,          # eje de las laterales (fracción de la batalla desde delante)
    track=1.05,         # ancho del eje lateral: centro a centro (m)
    xPil=1.12,          # cadera del piloto: distancia al eje delantero (m)
    xPas=1.92,          # cadera de los pasajeros: distancia al eje delantero (m)
    tilt=0.0,           # inclinación de la carrocería para el modelo (grados)
    recPil=28,          # reclinado del respaldo del piloto (°)
    recPas=28,          # reclinado de los respaldos traseros (°)
    horquilla=25,       # inclinación del eje de dirección respecto a la vertical (°)
    overF=0.4,          # hueco del morro: borde de la rueda delantera a la punta (m)
    tail=0.39,          # hueco de la cola: borde de la rueda trasera al final (m)
    tailRound=0.75,     # redondez de la punta de cola (0 = en punta)
    morro=0,            # forma del morro (0 = elíptico, 1 = muy romo)
    W=1.29,             # ancho máximo del carenado (m)
    H=1.28,             # alto total sobre el suelo (m)
    pmax=0.6,           # posición del espesor máximo (fracción de la longitud)
    full=1.2,           # plenitud de cola (menor = cola más llena)
    tipH=0.7,           # altura de la punta de cola (fracción del alto del carenado)
    nU=2.6,             # redondez de la sección superior (2 = elipse)
    nL=4.5,             # forma del fondo (2 = redondo, 5 = plano)
    clear=0.21,         # altura libre del fondo del carenado (m)
    puerta="cabina",    # cabina | gaviota | aptera (solo se dibuja en el visor)
    spineD=76.2,        # tubo central: diámetro (mm)
    spineT=3,           # tubo central: espesor de pared (mm)
)
if len(sys.argv) > 1 and sys.argv[1].endswith(".json"):
    P.update(json.load(open(sys.argv[1])))

WHEEL_D = {"16": 0.405, "20": 0.508, "24": 0.61, "26": 0.66, "28": 0.70}
TIRE_W = 0.055        # neumático 2,2"
SKIN = 0.001          # carenado: 1 mm carbono-lino (la pieza CAD es la superficie exterior)
YS = 0.20             # altura del eje de la viga central
SEAT_GAP = 0.235      # semiseparación de los dos asientos traseros (3 cm entre ellos)
TRAVEL_F = 0.17       # recorrido horquilla
TRAVEL_R = 0.15       # recorrido rueda trasera
ARM_UP = 0.18         # separación vertical de los brazos del paralelogramo

rF = WHEEL_D[str(P["wF"])] / 2
rR = rF
rL = WHEEL_D[str(P["wL"])] / 2
xF, xR = 0.0, -P["B"]
xL = -P["fL"] * P["B"]
xn = rF + P["overF"]
xt = xR - rR - P["tail"]
Lf = xn - xt
Hb = P["H"] - P["clear"]
xP = -P["xPil"]       # cadera del piloto
xRr = -P["xPas"]      # cadera de los pasajeros
BB = (min(-0.40, xP + 0.90), 0.48)    # pedalier (generador): sigue al asiento del piloto
HIP_Y = 0.36
_HOMBRO = (xP - math.sin(math.radians(P["recPil"])) * 0.5, HIP_Y + math.cos(math.radians(P["recPil"])) * 0.5)
PUNO = (_HOMBRO[0] + 0.40, _HOMBRO[1] - 0.09)   # puños del manillar: donde caen las manos
MASTIL = {"x": xP + 0.46, "top": PUNO[1] - 0.06, "ancho": 0.20}
PIV = (xR + 0.68, YS + 0.03)  # pivote del basculante
HEAD = math.radians(P["horquilla"])       # eje de dirección respecto a la vertical
AX = (-math.sin(HEAD), math.cos(HEAD))  # eje de dirección hacia arriba
rec = lambda pilot: math.radians(P["recPil"] if pilot else P["recPas"])  # reclinado de cada fila
A2C = rF + 0.06 + TRAVEL_F + 0.07       # eje a corona
ARM_A = P["track"] / 2 - 0.08           # longitud del brazo del paralelogramo


def spow(v, p):
    return math.copysign(abs(v) ** p, v)


def _base(t):
    return ((1 + math.cos(math.pi * t)) / 2) ** P["full"]


_T_CORTE = 1 - P["tailRound"] * 0.55
_S_CORTE = _base(_T_CORTE)
_TAPA = min(0.45, max(0.02, (_S_CORTE * min(P["W"] / 2, Hb / 2) * 0.95) / max(0.05, (1 - P["pmax"]) * Lf)))


def prof(u):
    """Espesor relativo: morro elíptico, cola en coseno y punta redondeada."""
    p = P["pmax"]
    if u <= 0 or u >= 1:
        return 0.0
    if u < p:
        a = (p - u) / p
        return max(0.0, 1 - a * a) ** (0.5 - 0.32 * P["morro"])
    t = (u - p) / (1 - p)
    if P["tailRound"] <= 0.001:
        return _base(t)
    if t <= 1 - _TAPA:
        return _base(t * _T_CORTE / (1 - _TAPA))
    q = (t - (1 - _TAPA)) / _TAPA
    return _S_CORTE * math.sqrt(max(0.0, 1 - q * q))


def zc_at(u):
    return P["clear"] + Hb * (0.32 + (P["tipH"] - 0.32) * u)


def frame(u):
    s = prof(u)
    aT = P["H"] - zc_at(P["pmax"])
    zc = zc_at(u)
    g = min(1.0, (1.15 * s ** 0.7) if u < P["pmax"] else (1.6 * s ** 0.5))
    return dict(s=s, x=xn - u * Lf, zc=zc, top=zc + aT * s,
                bot=zc - (zc - P["clear"]) * g, hw=P["W"] / 2 * s ** 0.9)


def sec(f, th, off=0.0):
    c, sn = math.cos(th), math.sin(th)
    up = sn >= 0
    n = P["nU"] if up else P["nL"]
    ez, ey = spow(c, 2 / n), spow(sn, 2 / n)
    y = f["zc"] + ((f["top"] - f["zc"] + off) if up else (f["zc"] - f["bot"] + off)) * ey
    return (f["x"], (f["hw"] + off) * ez, y)  # (X, Ylat, Zup)


def gap(x, up_y, lat):
    """Holgura radial (m) de un punto respecto al carenado; negativa = fuera."""
    u = (xn - x) / Lf
    if u <= 0.001 or u >= 0.999:
        return -1
    f = frame(u)
    above = up_y >= f["zc"]
    n = P["nU"] if above else P["nL"]
    ay = (f["top"] - f["zc"]) if above else (f["zc"] - f["bot"])
    v = (abs(lat) / f["hw"]) ** n + (abs(up_y - f["zc"]) / ay) ** n
    sc = v ** (1 / n)
    return math.hypot(lat, up_y - f["zc"]) * (1 / sc - 1)


M = 1000.0
def V(x, lat, up):
    return cq.Vector(x * M, lat * M, up * M)


# ------------------------------------------------------------------ carenado
def loft_body(off, u0, u1, nsec=36, npts=56):
    us = [u0 + (u1 - u0) * (1 - math.cos(math.pi * i / (nsec - 1))) / 2 for i in range(nsec)]
    b = BRepOffsetAPI_ThruSections(True, False, 1e-6)
    b.AddVertex(BRepBuilderAPI_MakeVertex(gp_Pnt((xn - u0 * Lf * 0.4) * M, 0, zc_at(0) * M)).Vertex())
    for u in us:
        f = frame(u)
        pts = [V(*sec(f, 2 * math.pi * j / npts, off)) for j in range(npts)]
        b.AddWire(cq.Wire.assembleEdges([cq.Edge.makeSpline(pts, periodic=True)]).wrapped)
    b.AddVertex(BRepBuilderAPI_MakeVertex(gp_Pnt((xt + (1 - u1) * Lf * 0.4) * M, 0, zc_at(1) * M)).Vertex())
    b.CheckCompatibility(False)
    b.Build()
    return cq.Solid(b.Shape())


def canopy_cutter():
    ua = (xn - (BB[0] + 0.05)) / Lf
    ub = (xn - (xRr - 0.50)) / Lf
    ey0 = math.sin(0.2 * math.pi) ** (2 / P["nU"])
    lower = []
    for i in range(41):
        f = frame(ua + (ub - ua) * i / 40)
        lower.append((f["x"] * M, (f["zc"] + (f["top"] - f["zc"]) * ey0) * M))
    wp = (cq.Workplane(cq.Plane(origin=(0, 0, 0), xDir=(1, 0, 0), normal=(0, -1, 0)))
          .moveTo(*lower[0]).spline(lower[1:], includeCurrent=True)
          .lineTo(lower[-1][0], 3000).lineTo(lower[0][0], 3000).close()
          .extrude(1500, both=True))
    return wp.val()


# ------------------------------------------------------------------ utilidades
def tube(p1, p2, d, wall=None):
    """Cilindro entre dos puntos; con `wall` (m) es un tubo hueco."""
    a, b = cq.Vector(*[c * M for c in p1]), cq.Vector(*[c * M for c in p2])
    v = b - a
    n = v.normalized()
    sol = cq.Solid.makeCylinder(d / 2 * M, v.Length, a, n)
    if wall:
        sol = sol.cut(cq.Solid.makeCylinder((d / 2 - wall) * M, v.Length + 2, a - n, n))
    return sol


def ht(p1, p2, d, wall=0.002):
    """Tubo de aluminio 6061-T6 (pared 2 mm por defecto)."""
    return tube(p1, p2, d, wall)


def comp(parts):
    return cq.Compound.makeCompound(parts)


def wheel(x, lat, r, tilt_axis=None):
    c = V(x, lat, r)
    y = cq.Vector(0, 1, 0)
    parts = [cq.Solid.makeTorus((r - TIRE_W / 2) * M, TIRE_W / 2 * M, c, y),
             cq.Solid.makeTorus((r - 0.06) * M, 0.010 * M, c, y),
             cq.Solid.makeCylinder(0.022 * M, 0.10 * M, c - cq.Vector(0, 50, 0), y),
             cq.Solid.makeCylinder(0.08 * M, 0.002 * M, c + cq.Vector(0, 32, 0), y)]  # disco de freno
    for k in range(28):
        a = 2 * math.pi * k / 28
        side = 1 if k % 2 else -1
        p1 = (x + 0.028 * math.cos(a), lat + side * 0.035, r + 0.028 * math.sin(a))
        p2 = (x + (r - 0.065) * math.cos(a + 0.35 * side), lat, r + (r - 0.065) * math.sin(a + 0.35 * side))
        parts.append(tube(p1, p2, 0.002))
    return comp(parts)


def ik_knee(h, f, l1, l2):
    """Rodilla para cadera h y pie f (2D), flexionada hacia arriba."""
    dx, dy = f[0] - h[0], f[1] - h[1]
    d = min(math.hypot(dx, dy), l1 + l2 - 1e-3)
    a = math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))
    base = math.atan2(dy, dx)
    return (h[0] + l1 * math.cos(base + a), h[1] + l1 * math.sin(base + a))


def occ_pts(hx, pilot):
    REC = rec(pilot)
    d = (-math.sin(REC), math.cos(REC))
    H = (hx, HIP_Y)
    S = (hx + d[0] * 0.50, HIP_Y + d[1] * 0.50)
    C = (hx + d[0] * 0.70, HIP_Y + d[1] * 0.70)
    F = (BB[0], BB[1]) if pilot else (min(hx + 0.56, xL - 0.145), 0.17)
    K = ik_knee(H, F, 0.45, 0.47)
    return H, S, C, K, F, d


def seat_solid(hx, lat, w, pilot=False):
    H, S, C, K, F, d = occ_pts(hx, pilot)
    REC = rec(pilot)
    pb = (-math.cos(REC), -math.sin(REC))
    top = [(hx + 0.40, HIP_Y - 0.04), (hx + 0.22, HIP_Y - 0.085), (hx + 0.02, HIP_Y - 0.10)]
    for t in (0.12, 0.32, 0.52, 0.66):
        top.append((hx + d[0] * t + pb[0] * 0.11, HIP_Y + d[1] * t + pb[1] * 0.11))
    top.append((top[-1][0] + 0.06, top[-1][1] + 0.05))
    th = 0.012  # carcasa de fibra de carbono 12 mm (sándwich)
    def nrm(i):
        a = top[max(i - 1, 0)]; b = top[min(i + 1, len(top) - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        L = math.hypot(tx, ty)
        return (ty / L, -tx / L)
    bot = [(p[0] + nrm(i)[0] * th, p[1] + nrm(i)[1] * th) for i, p in enumerate(top)]
    pts = [(p[0] * M, p[1] * M) for p in top] + [(p[0] * M, p[1] * M) for p in reversed(bot)]
    return (cq.Workplane(cq.Plane(origin=(0, lat * M, 0), xDir=(1, 0, 0), normal=(0, -1, 0)))
            .polyline(pts).close().extrude(w / 2 * M, both=True)).val()


def occupant(hx, lat, pilot):
    H, S, C, K, F, d = occ_pts(hx, pilot)
    p = lambda q, l=lat: (q[0], l, q[1])
    parts = [cq.Solid.makeSphere(0.11 * M, V(C[0], lat, C[1])),
             tube(p((H[0] + d[0] * 0.02, H[1] + d[1] * 0.02)), p(S), 0.26)]
    hand = PUNO if pilot else (H[0] + (K[0] - H[0]) * 0.62, H[1] + (K[1] - H[1]) * 0.62 + 0.07)
    for s in (-1, 1):
        fl = lat + s * (0.12 if pilot else 0.09)
        parts.append(tube(p(H, lat + s * 0.09), p(K, fl), 0.13))
        parts.append(tube(p(K, fl), p(F, fl), 0.09))
        parts.append(tube(p(S, lat + s * 0.17), p(hand, lat + s * (MASTIL["ancho"] if pilot else 0.13)), 0.07))
    return comp(parts)


def rot_pt(p, piv, ang):
    c, s = math.cos(ang), math.sin(ang)
    dx, dy = p[0] - piv[0], p[1] - piv[1]
    return (piv[0] + dx * c - dy * s, piv[1] + dx * s + dy * c)



def u_de_x(x):
    return min(0.999, max(0.001, (xn - x) / Lf))


def zonas_piel():
    """Las mismas zonas que el visor: (nombre, piel, u0, u1, θ0, θ1)."""
    c_pil = occ_pts(xP, True)[2][0]
    c_pas = occ_pts(xRr, False)[2][0]
    u_p0, u_p1 = u_de_x(BB[0] + 0.10), u_de_x(c_pil + 0.22)
    u_v1, u_s1 = u_de_x(c_pas - 0.05), min(0.95, u_de_x(xR - rR * 0.3))
    pi = math.pi
    return [("Parabrisas", "cristal", u_p0, u_p1, 0.13 * pi, 0.87 * pi),
            ("Ventanilla izquierda", "cristal", u_p1, u_v1, 0.13 * pi, 0.30 * pi),
            ("Ventanilla derecha", "cristal", u_p1, u_v1, 0.70 * pi, 0.87 * pi),
            ("Paneles solares del techo", "solar", u_p1, u_s1, 0.30 * pi, 0.70 * pi)]


def parche(u0, u1, t0, t1, off, nu=26, nv=18):
    """Superficie B-spline que sigue la piel entre (u0, θ0) y (u1, θ1)."""
    filas = []
    for i in range(nu + 1):
        f = frame(u0 + (u1 - u0) * i / nu)
        filas.append([V(*sec(f, t0 + (t1 - t0) * j / nv, off)) for j in range(nv + 1)])
    return cq.Face.makeSplineApprox(filas, tol=0.5)


def accesorios():
    """Faros, piloto de freno, intermitentes y retrovisores (piezas sencillas)."""
    ps = []
    def sobre(u, th, off=0.0):
        return sec(frame(u), th, off)
    for th in (0.10 * math.pi, 0.90 * math.pi):
        ps.append(cq.Solid.makeSphere(0.035 * M, V(*sobre(0.028, th))))
    for th in (0.02 * math.pi, 0.98 * math.pi):
        ps.append(cq.Solid.makeSphere(0.02 * M, V(*sobre(0.06, th))))
        ps.append(cq.Solid.makeSphere(0.018 * M, V(*sobre(0.94, th))))
    x, lat, z = sobre(0.93, math.pi / 2, 0.006)
    ps.append(cq.Solid.makeBox(0.02 * M, 0.22 * M, 0.018 * M, V(x - 0.01, lat - 0.11, z - 0.009)))
    u_r = zonas_piel()[0][2] + 0.025
    for s_ in (1, -1):
        b = sobre(u_r, 0.13 * math.pi if s_ > 0 else 0.87 * math.pi)
        punta = (b[0] - 0.02, b[1] + s_ * 0.13, b[2] + 0.04)
        ps.append(tube(b, punta, 0.016))
        ps.append(cq.Solid.makeSphere(0.045 * M, V(punta[0] - 0.02, punta[1] + s_ * 0.03, punta[2] + 0.01)))
    return comp(ps)


# ------------------------------------------------------------------ construcción
def build():
    L = {}
    print("· carenado")
    outer = loft_body(0.0, 0.004, 0.999)
    skin = outer.Shells()[0]          # superficie exterior: base del molde de fibra
    body = skin
    wells = [(xF, 0, rF, 0.10), (xR, 0, rR, 0.10),
             (xL, P["track"] / 2, rL, 0.12), (xL, -P["track"] / 2, rL, 0.12)]
    for (x, lat, r, extra) in wells:
        w = TIRE_W + extra
        body = body.cut(cq.Solid.makeCylinder((r + 0.04) * M, w * M, V(x, lat - w / 2, r - 0.15), cq.Vector(0, 1, 0)))
    # Cristal delante y a los lados; el techo y la cubierta trasera, paneles
    # solares (como en el visor). Cada zona se recorta del fuselaje y queda
    # como pieza propia, en su capa.
    cristales, solares = {}, {}
    for nombre, piel, u0, u1, t0, t1 in zonas_piel():
        cara = parche(u0, u1, t0, t1, 0.0)
        hueco = parche(u0, u1, t0, t1, 0.02).thicken(-0.04 * M)
        body = body.cut(hueco)
        (cristales if piel == "cristal" else solares)[nombre] = cara
    L["Carenado"] = {"Fuselaje": body, "Luces y retrovisores": accesorios()}
    L["Cristales"] = cristales
    L["Paneles solares"] = solares

    print("· chasis")
    sf = BB[0] - 0.02
    sr = PIV[0] - 0.06
    crown = (xF + AX[0] * A2C, rF + AX[1] * A2C)
    htb = (crown[0] + AX[0] * 0.02, crown[1] + AX[1] * 0.02)
    htt = (crown[0] + AX[0] * 0.16, crown[1] + AX[1] * 0.16)
    sd = P["spineD"] / 1000
    ch = {
        "Viga central": ht((sf, 0, YS), (sr, 0, YS), sd, P["spineT"] / 1000),
        "Tubo de direccion": ht((htb[0], 0, htb[1]), (htt[0], 0, htt[1]), 0.05),
        "Tubo diagonal": ht((htb[0], 0, htb[1]), (sf + 0.03, 0, YS), 0.045),
        "Soporte pedalier": comp([ht((sf, 0, YS), (BB[0], 0, BB[1]), 0.04),
                                  ht((BB[0], 0, BB[1]), (htt[0], 0, htt[1]), 0.035)]),
        "Travesano asientos": ht((xRr - 0.08, -0.33, YS), (xRr - 0.08, 0.33, YS), 0.035),
        "Soportes asientos": comp([ht((xP + 0.10, 0, YS), (xP + 0.10, 0, HIP_Y - 0.11), 0.03)] +
                                  [ht((xRr - 0.08, s * SEAT_GAP, YS), (xRr - 0.08, s * SEAT_GAP, HIP_Y - 0.09), 0.025)
                                   for s in (-1, 1)]),
        # Dirección indirecta sobre el asiento: mástil entre las rodillas,
        # manillar a la altura del pecho y bieleta hasta la horquilla.
        "Mastil del manillar": comp([ht((MASTIL["x"], 0, YS + sd / 2), (MASTIL["x"], 0, MASTIL["top"]), 0.035),
                                     ht((MASTIL["x"], 0, 0.42), (MASTIL["x"] - 0.26, 0, YS + sd / 2 - 0.005), 0.025)]),
        "Direccion (manillar)": comp([tube((MASTIL["x"], 0, MASTIL["top"]), (MASTIL["x"] - 0.07, 0, MASTIL["top"] + 0.03), 0.032),
                                      ht((MASTIL["x"] - 0.07, -MASTIL["ancho"], MASTIL["top"] + 0.03), (MASTIL["x"] - 0.07, MASTIL["ancho"], MASTIL["top"] + 0.03), 0.0222, 0.0018)]
                                     + [ht((MASTIL["x"] - 0.07, s_ * MASTIL["ancho"], MASTIL["top"] + 0.03), (PUNO[0] - 0.05, s_ * MASTIL["ancho"], PUNO[1] - 0.005), 0.0222, 0.0018) for s_ in (-1, 1)]
                                     + [tube((MASTIL["x"], 0.075, 0.50), (htb[0] - 0.02, 0.085, htb[1] - 0.02), 0.012)]),
        "Poste basculante": ht((xL, 0, YS), (xL, 0, YS + ARM_UP + 0.04), 0.04),
    }
    L["Chasis"] = ch

    print("· suspensión e inclinación")
    sus = {}
    # horquilla de enduro (170 mm)
    fk = []
    for s in (-1, 1):
        z = s * 0.07
        lo = (xF + AX[0] * 0.40, rF + AX[1] * 0.40)
        st = (xF + AX[0] * 0.28, rF + AX[1] * 0.28)
        fk.append(ht((xF, z, rF), (lo[0], z, lo[1]), 0.05))
        fk.append(ht((st[0], z, st[1]), (crown[0], z, crown[1]), 0.036))
    arch = (xF + AX[0] * 0.36, rF + AX[1] * 0.36)
    fk.append(ht((arch[0], -0.07, arch[1]), (arch[0], 0.07, arch[1]), 0.03))
    fk.append(ht((crown[0], -0.09, crown[1]), (crown[0], 0.09, crown[1]), 0.04))
    fk.append(tube((xF, -0.085, rF), (xF, 0.085, rF), 0.015))  # eje pasante 15 mm
    sus["Horquilla delantera 170 mm"] = comp(fk)
    # basculante trasero + amortiguador 230x65
    ba = [ht((PIV[0], s * 0.075, PIV[1]), (xR, s * 0.075, rR), 0.032) for s in (-1, 1)]
    ba.append(ht((PIV[0], -0.08, PIV[1]), (PIV[0], 0.08, PIV[1]), 0.03))
    ba.append(tube((xR, -0.09, rR), (xR, 0.09, rR), 0.012))
    rock = rot_pt((PIV[0], PIV[1] + 0.13), PIV, 0)
    ba.append(ht((PIV[0], 0, PIV[1]), (rock[0], 0, rock[1]), 0.03))
    sus["Basculante trasero"] = comp(ba)
    fm = (xRr - 0.08, YS + 0.02)
    sv = (rock[0] - fm[0], rock[1] - fm[1]); sl = math.hypot(*sv)
    mid = (fm[0] + sv[0] * 0.55, fm[1] + sv[1] * 0.55)
    sus["Amortiguador trasero"] = comp([ht((fm[0], 0, fm[1]), (mid[0], 0, mid[1]), 0.055),
                                        ht((mid[0], 0, mid[1]), (rock[0], 0, rock[1]), 0.02)])
    # paralelogramo de inclinación de las laterales
    ph = math.radians(P["tilt"])
    pg = []
    for yy in (YS, YS + ARM_UP):
        for dx in (-0.03, 0.03):
            pg.append(ht((xL + dx, -ARM_A * math.cos(ph), yy + ARM_A * math.sin(ph)),
                           (xL + dx, ARM_A * math.cos(ph), yy - ARM_A * math.sin(ph)), 0.025))
    for s in (-1, 1):
        lat = s * ARM_A * math.cos(ph)
        dy = -s * ARM_A * math.sin(ph)
        pg.append(ht((xL, lat, YS + dy - 0.02), (xL, lat, YS + ARM_UP + dy + 0.02), 0.035))   # mangueta
        pg.append(ht((xL, lat, rL + dy), (xL, lat + s * 0.08, rL + dy), 0.02))               # eje
    # amortiguador / bloqueo de inclinación
    pg.append(ht((xL, 0, YS + ARM_UP + 0.04), (xL, 0.25 * math.cos(ph), YS - 0.25 * math.sin(ph)), 0.03))
    sus["Paralelogramo basculante"] = comp(pg)
    L["Suspension"] = sus

    print("· ruedas")
    lw = {}
    for s, nm in ((1, "izq"), (-1, "der")):
        lat = s * (ARM_A * math.cos(ph) + 0.08)
        dy = -s * ARM_A * math.sin(ph)
        lw[nm] = (lat, dy)
    L["Ruedas"] = {"Rueda delantera": wheel(xF, 0, rF), "Rueda trasera": wheel(xR, 0, rR),
                   "Rueda lateral izq": wheel(xL, lw["izq"][0], rL + lw["izq"][1]),
                   "Rueda lateral der": wheel(xL, lw["der"][0], rL + lw["der"][1])}

    print("· asientos y ocupantes")
    L["Asientos"] = {"Asiento piloto": seat_solid(xP, 0, 0.42, True),
                     "Asiento trasero izq": seat_solid(xRr, SEAT_GAP, 0.44),
                     "Asiento trasero der": seat_solid(xRr, -SEAT_GAP, 0.44)}
    L["Ocupantes"] = {"Piloto": occupant(xP, 0, True), "Pasajero izq": occupant(xRr, SEAT_GAP, False),
                      "Pasajero der": occupant(xRr, -SEAT_GAP, False)}

    print("· motor y baterías")
    cr = []
    for s in (-1, 1):
        a = 0.6 if s > 0 else 0.6 + math.pi
        pe = (BB[0] + 0.165 * math.cos(a), BB[1] + 0.165 * math.sin(a))
        cr.append(tube((BB[0], s * 0.05, BB[1]), (pe[0], s * 0.07, pe[1]), 0.02))
        cr.append(tube((pe[0], s * 0.07, pe[1]), (pe[0], s * 0.16, pe[1]), 0.02))
    L["Motor"] = {
        "Motor de buje trasero 250 W": cq.Solid.makeCylinder(0.095 * M, 0.06 * M, V(xR, -0.03, rR), cq.Vector(0, 1, 0)),
        "Generador de pedalier": cq.Solid.makeCylinder(0.06 * M, 0.08 * M, V(BB[0], -0.04, BB[1]), cq.Vector(0, 1, 0)),
        "Bielas y pedales": comp(cr),
        "Controlador": cq.Solid.makeBox(0.20 * M, 0.07 * M, 0.05 * M, V(xRr + 0.55, -0.035, YS + sd / 2)),
    }
    bx = lambda x0, lat0: cq.Solid.makeBox(0.37 * M, 0.10 * M, 0.08 * M, V(x0, lat0, P["clear"] + 0.015))
    L["Baterias"] = {
        "Bateria 1 (36 V 500 Wh)": bx(xP - 0.05, 0.045),
        "Bateria 2 (36 V 500 Wh)": bx(xP - 0.05, -0.145),
        "Bateria 3 (36 V 500 Wh)": bx(xRr + 0.0, 0.17),
        "Bateria 4 (36 V 500 Wh)": bx(xRr + 0.0, -0.27),
    }
    return L


COLORS = {"Carenado": (0.80, 0.82, 0.84, 1), "Cristales": (0.08, 0.13, 0.17, 0.55),
          "Paneles solares": (0.05, 0.09, 0.19, 1),
          "Chasis": (0.62, 0.65, 0.69, 1), "Suspension": (0.85, 0.55, 0.10, 1),
          "Ruedas": (0.08, 0.08, 0.09, 1), "Asientos": (0.17, 0.18, 0.20, 1),
          "Ocupantes": (0.80, 0.64, 0.49, 1), "Motor": (0.72, 0.30, 0.20, 1),
          "Baterias": (0.18, 0.50, 0.82, 1)}


def report():
    out = {}
    for nm, hx, pil in (("piloto", xP, True), ("trasero", xRr, False)):
        H, S, C, K, F, d = occ_pts(hx, pil)
        out[f"techo_{nm}_cm"] = round((frame((xn - C[0]) / Lf)["top"] - (C[1] + 0.11)) * 100, 1)
    H, S, C, K, F, d = occ_pts(xRr, False)
    out["hombro_trasero_cm"] = round(gap(S[0], S[1], SEAT_GAP + 0.19) * 100, 1)
    def wheel_gap(x, lat, r, cy):
        return min(gap(x + r * math.cos(a), cy + r * math.sin(a), lat)
                   for a in [2 * math.pi * k / 72 for k in range(72)] if cy + r * math.sin(a) > P["clear"] + 0.06)
    out["rueda_del_cm"] = round(wheel_gap(xF + AX[0] * TRAVEL_F, 0, rF, rF + AX[1] * TRAVEL_F) * 100, 1)
    out["rueda_tra_cm"] = round(wheel_gap(xR, 0, rR, rR + TRAVEL_R) * 100, 1)
    ph = math.radians(20)
    out["lateral_20deg_cm"] = round(wheel_gap(xL, ARM_A * math.cos(ph) + 0.08 + TIRE_W / 2, rL, rL + ARM_A * math.sin(ph)) * 100, 1)
    # roce del carenado con el suelo a 20°
    low = 9
    for i in range(1, 100):
        f = frame(i / 100)
        for j in range(36):
            _, lat, y = sec(f, math.pi + math.pi * j / 36)
            low = min(low, y * math.cos(ph) - abs(lat) * math.sin(ph))
    out["suelo_20deg_cm"] = round(low * 100, 1)
    out["largo_m"] = round(Lf, 3)
    return out


if __name__ == "__main__":
    print(json.dumps(report(), ensure_ascii=False))
    if "--check" in sys.argv:
        sys.exit()
    layers = build()
    asm = cq.Assembly(name="Aeromovil_Gota_tandem")
    os.makedirs("stl", exist_ok=True)
    for lname, parts in layers.items():
        sub = cq.Assembly(name=lname)
        for pname, shp in parts.items():
            sub.add(shp, name=pname, color=cq.Color(*COLORS[lname]))
        asm.add(sub, name=lname)
        cq.exporters.export(comp(list(parts.values())), f"stl/{lname}.stl",
                            tolerance=1.0, angularTolerance=0.2)
    asm.save("Aeromovil_Gota_tandem.step")
    dens = {"Chasis": 2.70, "Suspension": 2.70, "Baterias": 0.0, "Motor": 0.0}
    mass = {k: round(sum(p.Volume() for p in v.values()) / 1e6 * dens[k], 1) for k, v in layers.items() if k in dens}
    mass["Carenado"] = round(layers["Carenado"]["Fuselaje"].Area() / 1e6 * SKIN * 1500, 1)
    mass["Cristales"] = round(sum(f.Area() for f in layers["Cristales"].values()) / 1e6 * 3.6, 1)
    mass["Paneles solares"] = round(sum(f.Area() for f in layers["Paneles solares"].values()) / 1e6 * 2.2, 1)
    print("masas kg (sin componentes comprados):", mass)
    print("STEP guardado")
