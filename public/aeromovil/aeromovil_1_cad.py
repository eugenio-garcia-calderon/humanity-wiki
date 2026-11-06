"""
Aeromóvil 1 — STEP y STL por capas a partir de la geometría del visor (CadQuery / OpenCASCADE)

El Aeromóvil 1 es un eléctrico de cuatro ruedas con carrocería baja y cúpula
(forma del SZEmission un 30 % mayor, ruedas, frenos y suspensión de la clase
del Twizy). A diferencia del script del Aeromóvil Gota, aquí no se repite la
geometría a mano: el visor exporta lo que dibuja (parches de piel como
rejillas de puntos, tubos, ruedas, cajas, asientos y maniquíes) en un JSON y
este script lo convierte tal cual en sólidos y superficies.

Uso:
    python aeromovil_1_cad.py aeromovil-1-geometria.json

Crea `Aeromovil_1.step` (una subcarpeta por capa en el árbol del CAD) y
`stl/<capa>.stl`. Ejes del STEP: X hacia delante (eje delantero en X = 0),
Y lateral (+ izquierda), Z arriba. Unidades: mm.
"""
import json, math, os, sys
import cadquery as cq

M = 1000.0


def V(p):
    """Punto del visor (x delante, y arriba, z izquierda; metros) → CAD (mm, Z arriba)."""
    return cq.Vector(p[0] * M, p[2] * M, p[1] * M)


def parche(rejilla, espesor):
    """Superficie B-spline por una rejilla de puntos; con espesor, un sólido fino."""
    filas = [[V(p) for p in fila] for fila in rejilla]
    cara = cq.Face.makeSplineApprox(filas, tol=0.5)
    if espesor:
        try:
            return cara.thicken(espesor * M)
        except Exception:
            pass
    return cara


def cilindro(a, b, d, pared=0.0):
    """Cilindro entre dos puntos; con pared, tubo hueco."""
    pa, pb = V(a), V(b)
    v = pb - pa
    if v.Length < 1e-6:
        return None
    n = v.normalized()
    sol = cq.Solid.makeCylinder(d / 2 * M, v.Length, pa, n)
    if pared and pared < d / 2:
        sol = sol.cut(cq.Solid.makeCylinder((d / 2 - pared) * M, v.Length + 2, pa - n, n))
    return sol


def catmull(pts, n=24):
    """Catmull-Rom centrípeta por los puntos de paso: la misma curva que dibuja el visor."""
    if len(pts) < 3:
        return pts
    P = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n
            out.append([0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t * t + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t * t * t) for c in range(3)])
    out.append(list(pts[-1]))
    return out


def tubo(t):
    pts = catmull(t["curva"], 6) if t.get("curva") else [t["a"], t["b"]]
    partes = []
    for i in range(len(pts) - 1):
        s = cilindro(pts[i], pts[i + 1], t["d"], t.get("pared", 0) or 0)
        if s is not None:
            partes.append(s)
    if len(partes) == 1:
        return partes[0]
    return cq.Compound.makeCompound(partes)


def caja(c, s):
    """Caja centrada en c con lados s (x, y arriba, z lateral), en metros."""
    return cq.Workplane("XY").box(s[0] * M, s[2] * M, s[1] * M).translate(V(c)).val()


def rueda(r):
    """Neumático (toro), tapacubos plano, disco de freno y buje; eje lateral."""
    c = V([r["x"], r["y"], r["z"]])
    eje = cq.Vector(0, 1, 0)
    s = 1 if r["z"] > 0 else -1
    w = r["w"]
    partes = [cq.Solid.makeTorus((r["r"] - w / 2) * M, w / 2 * M, c, eje)]
    partes.append(cq.Solid.makeCylinder(0.165 * M, 0.012 * M, c + cq.Vector(0, s * (w / 2 - 0.004) * M, 0), eje))
    partes.append(cq.Solid.makeCylinder(0.165 * M, (w * 0.86) * M, c - cq.Vector(0, w * 0.43 * M, 0), eje).cut(
        cq.Solid.makeCylinder(0.155 * M, (w * 0.86 + 2) * M, c - cq.Vector(0, (w * 0.43 + 0.001) * M, 0), eje)))
    partes.append(cq.Solid.makeCylinder(r["disco"] / 2 * M, 0.02 * M, c - cq.Vector(0, s * (w / 2 - 0.045) * M, 0), eje))
    partes.append(cq.Solid.makeCylinder(0.03 * M, 0.02 * M, c + cq.Vector(0, s * (w / 2 + 0.004) * M, 0), eje))
    return cq.Compound.makeCompound(partes)


def asiento(a):
    """Base, respaldo y cabecero como placas de 30 mm; el marco, en tubo."""
    lat, ancho = a["lat"], a["ancho"]
    pz = a["piezas"]
    partes = []

    def placa(poli, w, grosor=None):
        wp = cq.Workplane("XZ").polyline([(q[0] * M, q[1] * M) for q in poli]).close()
        sol = wp.extrude(-w * M).translate((0, -w * M / 2 + lat * M, 0)).val() if grosor is None else None
        return sol

    partes.append(placa(pz["base"], ancho))
    partes.append(placa(pz["respaldo"], ancho))
    partes.append(placa(pz["cabecero"], pz["anchoCabecero"]))
    marco = pz["marco"]
    for s in (-1, 1):
        for i in range(len(marco) - 1):
            partes.append(cilindro([marco[i][0], marco[i][1], lat + s * ancho / 2], [marco[i + 1][0], marco[i + 1][1], lat + s * ancho / 2], 0.022, 0.0015))
    return cq.Compound.makeCompound([p for p in partes if p is not None])


def ocupante(o):
    partes = []
    for sg in o["segmentos"]:
        c = cilindro(sg["a"], sg["b"], 2 * sg["r"])
        if c is not None:
            partes.append(c)
        partes.append(cq.Solid.makeSphere(sg["r"] * M, V(sg["a"])))
        partes.append(cq.Solid.makeSphere(sg["r"] * M, V(sg["b"])))
    partes.append(cq.Solid.makeSphere(o["cabeza"]["r"] * M, V(o["cabeza"]["c"])))
    return cq.Compound.makeCompound(partes)


COLORES = {
    "Carroceria": (0.93, 0.94, 0.95), "Cristales": (0.45, 0.62, 0.78), "Paneles solares": (0.12, 0.16, 0.32),
    "Chasis": (0.72, 0.73, 0.75), "Suspension": (0.90, 0.60, 0.15), "Direccion": (0.45, 0.42, 0.40),
    "Transmision": (0.55, 0.20, 0.25), "Ruedas": (0.12, 0.12, 0.12), "Motor": (0.70, 0.15, 0.12),
    "Baterias": (0.20, 0.40, 0.85), "Asientos": (0.30, 0.30, 0.32), "Ocupantes": (0.95, 0.75, 0.55),
}
GRUPO_A_CAPA = {"Chasis": "Chasis", "Suspensión": "Suspension", "Dirección": "Direccion", "Transmisión": "Transmision"}


def construir(D):
    capas = {k: {} for k in COLORES}
    esp = D["espesores"]
    n = {}

    def nombre(capa, base):
        # Los nombres son únicos en todo el ensamblaje (CadQuery lo exige), y
        # no pueden coincidir con el de una capa.
        if base in COLORES:
            base = base + " (pieza)"
        n[base] = n.get(base, 0) + 1
        return base if n[base] == 1 else f"{base} ({n[base]})"

    for p in D["parches"]:
        capa = p["capa"]
        grosor = esp["carroceria"] if p["piel"] in ("carroceria", "bajos") else esp["cristal"] if p["piel"] == "cristal" else esp["solar"]
        capas[capa][nombre(capa, p["nombre"])] = parche(p["rejilla"], grosor)
    for t in D["tubos"]:
        capa = GRUPO_A_CAPA.get(t["grupo"], "Chasis")
        capas[capa][nombre(capa, t["nombre"])] = tubo(t)
    for r in D["ruedas"]:
        capas["Ruedas"][nombre("Ruedas", r["nombre"])] = rueda(r)
    for c in D["cajas"]:
        capas[c["capa"]][nombre(c["capa"], c["nombre"])] = caja(c["c"], c["s"])
    for c in D["cilindros"]:
        a = list(c["c"]); b = list(c["c"])
        i = {"x": 0, "y": 1, "z": 2}[c["eje"]]
        a[i] -= c["largo"] / 2; b[i] += c["largo"] / 2
        capas[c["capa"]][nombre(c["capa"], c["nombre"])] = cilindro(a, b, 2 * c["r"])
    for t in D["toros"]:
        eje = cq.Vector(t["eje"][0], t["eje"][2], t["eje"][1])
        capas[t["capa"]][nombre(t["capa"], t["nombre"])] = cq.Solid.makeTorus(t["R"] * M, t["r"] * M, V(t["c"]), eje)
    for a in D["asientos"]:
        capas["Asientos"][nombre("Asientos", "Asiento del piloto" if a["piloto"] else "Asiento del pasajero")] = asiento(a)
    for o in D["ocupantes"]:
        capas["Ocupantes"][nombre("Ocupantes", o["nombre"])] = ocupante(o)
    return {k: v for k, v in capas.items() if v}


if __name__ == "__main__":
    ruta = sys.argv[1] if len(sys.argv) > 1 else "aeromovil-1-geometria.json"
    with open(ruta, encoding="utf-8") as f:
        D = json.load(f)
    if D.get("tipo") != "a1":
        sys.exit("Este script es para el Aeromóvil 1 (tipo 'a1'); para el Gota usa aeromovil_cad.py")
    capas = construir(D)
    nombre = D.get("nombre", "Aeromovil_1")
    asm = cq.Assembly(name=nombre)
    os.makedirs("stl", exist_ok=True)
    for capa, piezas in capas.items():
        sub = cq.Assembly(name=capa)
        for pn, shp in piezas.items():
            sub.add(shp, name=pn, color=cq.Color(*COLORES[capa]))
        asm.add(sub, name=capa)
        cq.exporters.export(cq.Compound.makeCompound(list(piezas.values())), f"stl/{capa}.stl", tolerance=1.0, angularTolerance=0.2)
        print(f"{capa}: {len(piezas)} piezas")
    asm.save(f"{nombre}.step")
    m = D["medidas"]
    print(f"STEP guardado: {nombre}.step · {m['L']:.2f} × {m['W']:.2f} × {m['H']:.2f} m")
