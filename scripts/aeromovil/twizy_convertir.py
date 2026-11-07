"""Convierte SDTwizy.stl (StreetDrone, Apache 2.0) al formato compacto del visor.

Uso:  python3 scripts/aeromovil/twizy_convertir.py SDTwizy.stl public/aeromovil/garaje/twizy.bin
      python3 scripts/aeromovil/twizy_envolvente.py public/aeromovil/garaje/twizy.bin   # tabla ENVOLVENTE de twizy.ts
Requiere: pip install trimesh fast_simplification numpy
El STL: github.com/streetdrone-home/SD-TwizyModel, streetdrone_model/sd_description/meshes/SDTwizy.stl
(md5 f0ea5b0e19cb420d6155a3ce9c11d096). Los índices de pieza son los del STL partido en componentes
conexos y ordenados de más a menos triángulos: si el STL cambia, hay que revisarlos.

Salida: twizy.bin = 'TWZ1' + uint32 lenJSON + JSON (relleno a 4) + por parte: int16 pos[nv*3] (0.1 mm) + uint16 idx[ni] (relleno a 4).
"""
import trimesh, numpy as np, json, struct, sys
import fast_simplification as fs

src, out = sys.argv[1], sys.argv[2]
m = trimesh.load(src)
comps = sorted(m.split(only_watertight=False), key=lambda c: -len(c.faces))

# --- medidas de la ficha (m) y del STL (cm)
BAT, R_DEL, R_TRAS = 1.686, 0.265, 0.281
VIA_DEL, VIA_TRAS = 1.094, 1.080
YF, YR = -80.25, 84.75          # ejes en el STL (centros de los guardabarros)
KX = BAT * 100 / (YR - YF)      # 1.0218
ZC = 9.65                       # altura de los ejes en el STL
KZ = (1.454 - 0.273) * 100 / (139.9 - ZC)   # alto real sobre el eje / alto STL sobre el eje
# compresión de la cápsula trasera: el STL sobresale ~18 cm por detrás del guardabarros;
# la ficha da 339 mm de voladizo trasero (enrasado con el guardabarros).
YA, YEND = 20.0, 136.7
Y_TARGET = YF + 202.5 / KX      # cola a 0.339 m detrás del eje trasero (2.025 m del delantero)
C = ((YEND - YA) - (Y_TARGET - YA)) / (YEND - YA) ** 2
def g(Y):
    d = np.maximum(Y - YA, 0)
    return Y - C * d * d

def base(V, comprimir=True):
    Y = g(V[:, 1]) if comprimir else V[:, 1]
    x = -(Y - YF) * KX / 100
    y = ((V[:, 2] - ZC) * KZ + 27.3) / 100
    z = -V[:, 0] / 100
    return np.stack([x, y, z], 1)

CLASE = {}
for i in (2, 6, 7, 9, 10): CLASE[i] = 'blanco'
for i in (0, 3, 4, 11, 12, 21): CLASE[i] = 'negroBrillo'
CLASE[8] = 'salpicadero'
CLASE[24] = 'tela'
for i in (44, 45, 54, 56, 57, 63, 64, 43): CLASE[i] = 'cromo'
for i in (15, 16): CLASE[i] = 'negroBrillo'   # carcasa; el faro (parábola, lámpara y lente) se dibuja en el visor
for i in (26, 27): CLASE[i] = 'ambar'
for i in (28, 29, 40): CLASE[i] = 'rojo'
CLASE[31] = 'lunaTrasera'
for i in (13, 14, 17, 18): CLASE[i] = 'guardabarros'
for i in (19, 20, 22, 23): CLASE[i] = 'muelle'
for i in (34, 35, 36, 37, 38, 39, 46, 47): CLASE[i] = 'acero'
for i in (50, 51, 48, 49, 41, 42): CLASE[i] = 'negro'
for i in (61, 66): CLASE[i] = 'negro'      # limpiaparabrisas
CLASE[30] = 'negroBrillo'          # tapa de la toma de carga (Z.E.)
for i in (59, 67): CLASE[i] = 'cromo'   # letras Z.E.
QUITAR = set()
DIEZMAR = {0: 0.6, 1: 0.8, 3: 0.6, 4: 0.6}
SUSP = {19, 20, 22, 23, 34, 35, 36, 37, 38, 39, 46, 47, 48, 49, 50, 51, 41, 42}
FRENTE_SUSP = lambda c: c.vertices[:, 1].mean() < 0

partes = {}
info = {}
for i, c in enumerate(comps):
    if i in QUITAR: continue
    cl = CLASE.get(i, 'plastico')
    V = np.asarray(c.vertices, dtype=np.float64); F = np.asarray(c.faces, dtype=np.int64)
    if i == 0:
        # placa negra del frontal: el STL trae en relieve el logotipo de StreetDrone.
        # Se aplana: cada vértice va a la cara delantera o a la trasera de la placa.
        ax_ = np.abs(V[:, 0])
        yf = np.interp(ax_, [1.5, 4.5, 7.5, 11.0, 13.0], [-88.23, -88.1, -87.77, -87.44, -87.3])
        yb = yf + 1.4
        V = V.copy(); V[:, 1] = np.where(V[:, 1] < (yf + yb) / 2, yf, yb)
    if i == 44:
        V = V.copy(); V[:, 1] -= 1.4          # el rombo de Renault, delante de la placa
    if i == 57:
        F = F[V[F].min(1)[:, 2] > 45]          # la «Y» trae un triángulo suelto hasta el paragolpes
    if i in DIEZMAR:
        V2, F2 = fs.simplify(V.astype(np.float32), F.astype(np.int32), DIEZMAR[i])
        V, F = V2.astype(np.float64), F2.astype(np.int64)
    if i in (13, 14, 17, 18):
        # guardabarros: sin deformar, centrado en la rueda real
        dl = i in (13, 14)
        yc = YF if dl else YR
        top = V[:, 2].max(); ry = (V[:, 1].max() - V[:, 1].min()) / 2
        zc = top - ry
        xc = (V[:, 0].max() + V[:, 0].min()) / 2
        via = (VIA_DEL if dl else VIA_TRAS) / 2
        R = R_DEL if dl else R_TRAS
        x = -(V[:, 1] - yc) / 100 + (0 if dl else -BAT)
        y = (V[:, 2] - zc) / 100 + R
        z = -((V[:, 0] - xc) / 100 + np.sign(xc) * via)
        W = np.stack([x, y, z], 1)
    elif i in SUSP:
        W = base(V, comprimir=False)
    else:
        W = base(V)
    if cl == 'blanco' and i in (6, 7):
        # el parabrisas va en la misma pieza que el marco: se separa por geometría
        tri = W[F]; cen = tri.mean(1)
        n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]); n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
        Vc = V[F].mean(1)
        cris = (Vc[:, 1] > -72) & (Vc[:, 1] < -6) & (Vc[:, 2] > 80) & (np.abs(Vc[:, 0]) < 40) & (np.abs(n[:, 2]) < 0.35) & (n[:, 1] > 0.6)
        for nombre, mask in (('cristal', cris), ('blanco', ~cris)):
            if mask.any(): partes.setdefault(nombre, []).append((W, F[mask]))
        info.setdefault('cristal_caras', 0); info['cristal_caras'] += int(cris.sum())
        continue
    partes.setdefault(cl, []).append((W, F))

# fusiona por clase, quita vértices sin usar
salida = []
bloques = []
for cl, lst in partes.items():
    Vs, Fs, off = [], [], 0
    for W, F in lst:
        used = np.unique(F); remap = -np.ones(len(W), dtype=np.int64); remap[used] = np.arange(len(used))
        Vs.append(W[used]); Fs.append(remap[F] + off); off += len(used)
    V = np.vstack(Vs); F = np.vstack(Fs)
    # partir en trozos de < 65536 vértices
    trozos = []
    if len(V) < 65000: trozos = [(V, F)]
    else:
        orden = np.argsort(F.min(1)); start = 0
        while start < len(F):
            sub = F[orden[start:]]; acc = set(); k = 0
            seleccion = []
            for f in sub:
                nuevo = acc | set(f.tolist())
                if len(nuevo) > 64000: break
                acc = nuevo; seleccion.append(f); k += 1
            S_ = np.array(seleccion); used = np.unique(S_); remap = -np.ones(len(V), dtype=np.int64); remap[used] = np.arange(len(used))
            trozos.append((V[used], remap[S_])); start += k
    for (Vt, Ft) in trozos:
        q = np.round(Vt * 10000).astype(np.int16)
        assert np.abs(Vt * 10000).max() < 32767
        salida.append({'m': cl, 'v': int(len(Vt)), 'i': int(Ft.size)})
        b = q.tobytes(); b += b'\0' * ((-len(b)) % 4)
        bi = Ft.astype(np.uint16).tobytes(); bi += b'\0' * ((-len(bi)) % 4)
        bloques.append(b + bi)

allV = np.vstack([np.vstack([W for W, F in lst]) for lst in partes.values()])
meta = {'formato': 'TWZ1', 'escala': 1e-4, 'partes': salida,
        'fuente': 'StreetDrone SD-TwizyModel (Apache-2.0), github.com/streetdrone-home/SD-TwizyModel, meshes/SDTwizy.stl',
        'cambios': 'reorientado a ejes del visor, escalado a la ficha de Renault, cápsula trasera acortada, piezas densas simplificadas, ruedas sustituidas'}
js = json.dumps(meta, separators=(',', ':')).encode(); js += b' ' * ((-len(js)) % 4)
with open(out, 'wb') as f:
    f.write(b'TWZ1'); f.write(struct.pack('<I', len(js))); f.write(js)
    for b in bloques: f.write(b)
tot = sum(p['i'] for p in salida) // 3
print('KX', round(KX, 4), 'KZ', round(KZ, 4), 'C', round(C, 6), 'Y_TARGET', round(Y_TARGET, 2))
print('tris', tot, 'partes', [(p['m'], p['v'], p['i'] // 3) for p in salida])
print('bbox', allV.min(0).round(3), allV.max(0).round(3))
print(json.dumps(info))
import os; print('bytes', os.path.getsize(out))

