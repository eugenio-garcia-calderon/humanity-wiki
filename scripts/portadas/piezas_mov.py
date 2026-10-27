# Piezas de transporte para los indicadores de Movilidad (mismo trazo que arte.py)
from arte import *

def coche(x, y=170, s=1, azul=False):
    """Coche de perfil mirando a la derecha. Origen: rueda trasera en el suelo, x = paragolpes trasero."""
    h = n('M0 -20c-4-10-2-20 6-24l24-10c14-14 30-20 56-20c22 0 38 8 52 20c18 2 28 8 30 20v14h-16M104 -20H52M20 -20H0')
    h += (bw if azul else n)('M36 -54c10-8 24-12 44-12c16 0 28 4 40 12z', 1.3)
    h += circ(36, -20, 15, N, 1.5, '#fff') + circ(120, -20, 15, N, 1.5, '#fff') + circ(36, -20, 6, B, 1.2) + circ(120, -20, 6, B, 1.2)
    return g(h, x, y, s)

def autobus(x, y=170, s=1):
    h = n('M0 -18v-70c0-6 4-10 10-10h130c10 0 16 8 18 20l2 60H0z') + n('M0 -18h160', 1.2)
    for i in range(5): h += bw(f'M{10+i*24} -86h18v22h-18z', 1.0)
    h += n('M132 -86h18l6 22h-24zM136 -60v40M150 -60v40', 1.2)
    h += circ(32, -16, 12, N, 1.5, '#fff') + circ(124, -16, 12, N, 1.5, '#fff') + circ(32, -16, 4, B, 1.2) + circ(124, -16, 4, B, 1.2)
    return g(h, x, y, s)

def tren(x, y=170, s=1, vagones=2):
    h = n('M0 -14v-60h70c20 0 34 20 40 44v16z') + bw('M76 -68h14c8 0 14 10 16 22H76z', 1.1) + n('M10 -64h52v20H10z', 1.1)
    for k in range(vagones):
        ox = -110 * (k + 1)
        h += n(f'M{ox} -14v-56h104v56z') + n(f'M{ox+10} -60h84v18h-84z', 1.0) + n(f'M{ox+104} -24h6', 1.3)
        h += circ(ox + 20, -8, 7, N, 1.4, '#fff') + circ(ox + 84, -8, 7, N, 1.4, '#fff')
    h += circ(20, -8, 7, N, 1.4, '#fff') + circ(84, -8, 7, N, 1.4, '#fff') + n(f'M{-110*vagones-10} 0H122', 1.3)
    return g(h, x, y, s)

def bici(x, y=170, s=1, ciclista_=False):
    h = circ(0, -20, 20, B, 1.4) + circ(64, -20, 20, B, 1.4) + n('M0 -20l22-30h34l8 30M22 -50l14 30h-36M36 -20l20-30M18 -56h10M54 -54l2-8h8', 1.4)
    if ciclista_:
        h += cabeza(44, -98, 8) + n('M24 -56c2-12 8-22 16-26c6-2 10 0 14 4l6 14M24 -56c10-2 20 2 26 8l-6 26M26 -54c4 6 8 12 8 20l-4 14', 1.4)
    return g(h, x, y, s)

def semaforo(x, y=170, h=110):
    s = n(f'M{x} {y}V{y-h+50}') + n(f'M{x-12} {y-h+50}V{y-h}h24v{50}z')
    s += circ(x, y - h + 10, 6, N, 1.2) + circ(x, y - h + 25, 6, N, 1.2) + bcirc(x, y - h + 40, 6, 1.2)
    return s

def senal_peligro(x, y=170, s=1, simbolo='!'):
    h = n('M0 0v-50') + bw('M0 -100l30 52H-30z', 1.5)
    if simbolo == '!': h += n('M0 -84v16', 1.8) + circ(0, -60, 1.5, N, 1.4, N)
    return g(h, x, y, s)

def senal_redonda(x, y=170, s=1, texto_=''):
    h = n('M0 0v-60') + circ(0, -78, 18, B, 1.6, '#fff') + circ(0, -78, 13, B, 1.0)
    if texto_: h += texto(0, -72, texto_, 13, N, 'middle', 'bold')
    return g(h, x, y, s)

def parada(x, y=170, s=1):
    h = n('M0 0v-96') + bw('M-14 -120h28v26h-28z', 1.4) + texto(0, -101, 'BUS', 9, N, 'middle', 'bold') + n('M20 0v-60h60v60M14 -60h72', 1.3) + n('M28 -24h44', 1.2)
    return g(h, x, y, s)

def pin(x, y, s=1):
    d = 'M0 0c-14-18-20-28-20-36a20 20 0 0 1 40 0c0 8-6 18-20 36z'
    return g(bw(d, 1.5) + circ(0, -36, 7, B, 1.3, '#fff'), x, y, s)

def mapa(x, y, s=1):
    h = nw('M0 0l40-12 40 12 40-12v-80l-40 12-40-12-40 12z', 1.4) + n('M40 -12v-80M80 0v-80', 1.1)
    h += '<path d="M12 -20c14-10 20-30 40-30s30 10 50-16" stroke="#3b82c4" stroke-width="1.4" stroke-dasharray="3 4"/>'
    return g(h, x, y, s)

def cargador(x, y=170, s=1):
    h = nw('M0 0v-100h40v100', 1.5) + n('M-8 0h56', 1.5) + n('M8 -90h24v18H8z', 1.2) + rayo(20, -46, 0.7) + n('M40 -60c18 0 20 20 20 40v14', 1.4) + n('M54 -6h12v8h-12zM56 2v6M64 2v6', 1.2)
    return g(h, x, y, s)

def enchufe(x, y, s=1, rot=0):
    h = bw('M-16 -20h32v22a16 16 0 0 1-32 0z', 1.5) + n('M-8 -20v-14M8 -20v-14M0 18v26', 1.5)
    return g(h, x, y, s, rot)

def barco(x, y, s=1):
    h = n('M-110 0h220l-18 30H-90z') + n('M-96 0v-40h30v40M-88 -32h14M-88 -22h14M-80 -40v-14', 1.3)
    for i, cx in enumerate(range(-56, 96, 22)):
        h += rect(cx, -20, 20, 20, N, 1.2, W if i % 3 == 0 else 'none')
        if i % 2 == 0: h += rect(cx, -40, 20, 20, N, 1.2, W if i % 4 == 2 else 'none')
    return g(h, x, y, s)

def altavoz(x, y, s=1, ondas_=3):
    h = nw('M-30 -12h14l20-18v60l-20-18h-14z', 1.5)
    for i in range(ondas_): h += b(f'M{12+i*12} -14c{8+i*4} 8 {8+i*4} 22 0 30', 1.5)
    return g(h, x, y, s)

def luna(x, y, s=1):
    return g(bw('M10 -26a26 26 0 1 0 16 46a22 22 0 0 1 -16 -46z', 1.5), x, y, s)

def neumatico(x, y, r=40):
    s = circ(x, y, r, N, 1.6, '#fff') + circ(x, y, r * 0.62, N, 1.2) + bcirc(x, y, r * 0.22, 1.2)
    for k in range(16):
        a = math.radians(k * 22.5)
        s += n(f'M{x+r*math.cos(a):.1f} {y+r*math.sin(a):.1f}L{x+r*0.82*math.cos(a+0.15):.1f} {y+r*0.82*math.sin(a+0.15):.1f}', 1.0)
    return s

def pluma(x, y, s=1, rot=-30):
    h = bw('M0 0c10-30 30-50 60-60c-6 30-26 52-60 60z', 1.4) + n('M0 0c20-20 40-40 60-60M-10 10l10-10M20 -20l14 2M32 -34l12 2', 1.2)
    return g(h, x, y, s, rot)

def caja(x, y, s=1, azul=False):
    h = (bw if azul else nw)('M0 0v-40l30-12 30 12v40l-30 12z', 1.4) + n('M0 -40l30 12 30-12M30 -28v40', 1.2) + b('M14 -46l30 12', 1.1)
    return g(h, x, y, s)

def calendario(x, y, s=1):
    h = n('M-40 -40h80v76h-80zM-40 -22h80M-24 -48v14M24 -48v14')
    for i in range(3):
        for j in range(4):
            h += (bw if (i, j) == (1, 2) else n)(f'M{-30+j*18} {-14+i*16}h10v10h-10z', 1.0)
    return g(h, x, y, s)

def ambulancia(x, y=170, s=1):
    return camion(x, y, s, cruz_medica(40, -40, 0.55) + n('M84 -66h14v-6h-14z', 1.2) + b('M86 -76l4-6 4 6', 1.1))

def furgoneta(x, y=170, s=1):
    h = n('M0 -16v-56h96c10 0 16 6 20 16l10 24v16H0z') + nw('M100 -66h10l10 26h-20z', 1.2) + n('M60 -70v54', 1.1)
    h += circ(26, -14, 11, N, 1.5, '#fff') + circ(100, -14, 11, N, 1.5, '#fff') + circ(26, -14, 4, B, 1.2) + circ(100, -14, 4, B, 1.2)
    return g(h, x, y, s)

def cinturon(x, y, s=1):
    h = n('M-40 -60c20 20 40 40 70 60', 2.0).replace(N, B) + nw('M20 -10h24v14h-24z', 1.4) + n('M-46 -66l10 10', 1.4)
    return g(h, x, y, s)

def casco_bici(x, y, s=1):
    h = bw('M-34 0c0-26 16-40 36-40s34 14 34 40z', 1.5) + n('M-34 0h70M-16 -36l6 16M4 -40v20M22 -34l-6 14', 1.2) + n('M-26 0c0 10 8 18 18 18', 1.2)
    return g(h, x, y, s)

def tarjeta(x, y, s=1, rot=-10):
    h = bw('M-40 -26h80a6 6 0 0 1 6 6v40a6 6 0 0 1-6 6h-80a6 6 0 0 1-6-6v-40a6 6 0 0 1 6-6z', 1.4) + n('M-46 -10h92', 2.4) + n('M-32 10h30M-32 18h18', 1.1)
    return g(h, x, y, s, rot)

def via(y=166, x0=8, x1=312):
    s = n(f'M{x0} {y}H{x1}M{x0} {y+8}H{x1}', 1.2)
    for x in range(x0 + 6, x1, 16): s += n(f'M{x} {y-2}v12', 0.9)
    return s

def puente(x0, x1, y, h=40):
    s = n(f'M{x0} {y}H{x1}M{x0} {y+6}H{x1}', 1.4)
    m = (x0 + x1) / 2
    s += n(f'M{x0+10} {y+6}Q{m} {y+6+h*1.6:.1f} {x1-10} {y+6}', 1.4)
    for k in range(1, 8):
        xx = x0 + 10 + k * (x1 - x0 - 20) / 8
        t = (xx - m) / ((x1 - x0 - 20) / 2)
        s += n(f'M{xx:.1f} {y+6}V{y+6+h*0.8*(1-t*t):.1f}', 0.9)
    return s

def tunel(x, y=170, r=50):
    return n(f'M{x-r-20} {y}c0-{r*1.6:.0f} 20-{r*2:.0f} {r+20} -{r*2:.0f}s{r+20} {r*0.4:.0f} {r+20} {r*2:.0f}', 1.4) + nw(f'M{x-r} {y}v-{r*0.6:.0f}a{r} {r} 0 0 1 {2*r} 0v{r*0.6:.0f}z', 1.4)

def peaton(x, y=170, s=1):
    """Persona caminando de perfil."""
    h = cabeza(4, -128, 10) + n('M0 -112c-4 16-6 32-4 50l-14 60h-8M-4 -62c8 18 16 38 24 60h8M0 -104c8 10 12 22 10 34M-2 -104c-8 10-14 20-14 30', 1.5)
    return g(h, x, y, s)
