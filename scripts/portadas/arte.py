# Juego de piezas para las portadas de Luz & Humanidad.
# Estilo: dibujo de una línea, azul marino fino, toques azules y aguadas claras.
# Lienzo 320x200 (16:10). Suelo habitual en y≈170.
import math, random, os, html as _html

N = '#23384d'   # tinta
B = '#3b82c4'   # azul
W = '#d4e6f5'   # aguada
W2 = '#e8f1fa'  # aguada más clara

def svg(*parts):
    body = ''.join(parts)
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">'
            '<style>path,circle,ellipse,rect{vector-effect:non-scaling-stroke}</style>'
            '<g fill="none" stroke-linecap="round" stroke-linejoin="round">'
            f'{body}</g></svg>\n')

def n(d, w=1.5): return f'<path d="{d}" stroke="{N}" stroke-width="{w}"/>'
def b(d, w=1.4): return f'<path d="{d}" stroke="{B}" stroke-width="{w}"/>'
def wash(d, c=W): return f'<path d="{d}" fill="{c}" stroke="none"/>'
def bw(d, w=1.4): return wash(d) + b(d, w)          # forma azul con aguada
def nw(d, w=1.5): return wash(d) + n(d, w)          # forma tinta con aguada
def circ(cx, cy, r, col=N, w=1.5, fill='none'):
    return f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" stroke="{col}" stroke-width="{w}" fill="{fill}"/>'
def bcirc(cx, cy, r, w=1.4): return circ(cx, cy, r, B, w, W)
def ell(cx, cy, rx, ry, col=N, w=1.5, fill='none', rot=0):
    return f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" transform="rotate({rot:.0f} {cx:.1f} {cy:.1f})" stroke="{col}" stroke-width="{w}" fill="{fill}"/>'
def rect(x, y, w_, h_, col=N, w=1.5, fill='none', r=0):
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w_:.1f}" height="{h_:.1f}" rx="{r}" stroke="{col}" stroke-width="{w}" fill="{fill}"/>'
def g(content, x=0, y=0, s=1, rot=0, flip=False):
    """Coloca una pieza: el trazo no engorda al escalar."""
    sx = -s if flip else s
    c = content
    return f'<g transform="translate({x} {y}) rotate({rot}) scale({sx} {s})">{c}</g>'

# ── EL GESTO DE LA LÍNEA ÚNICA ───────────────────────────────────────────
def suelo(y=170, lx=40, side='l', col=N, w=1.3, x0=6, x1=314):
    """Línea de suelo con un lazo (el gesto de los dibujos de una sola línea)."""
    if side == 'l':
        return f'<path d="M{x0} {y-6}C{lx-20} {y-6} {lx} {y-30} {lx+14} {y-22}S{lx+4} {y+2} {lx-6} {y-6}S{lx+40} {y+2} {lx+80} {y}S{(lx+80+x1)/2} {y-2} {x1} {y}" stroke="{col}" stroke-width="{w}"/>'
    if side == 'r':
        return f'<path d="M{x0} {y}S{(x0+lx-80)/2} {y+2} {lx-80} {y}S{lx-4} {y-14} {lx+6} {y-6}S{lx-14} {y-30} {lx} {y-22}S{lx+20} {y-6} {x1} {y-6}" stroke="{col}" stroke-width="{w}"/>'
    return f'<path d="M{x0} {y}C{(x0*2+x1)/3} {y-2} {(x0+x1*2)/3} {y+2} {x1} {y}" stroke="{col}" stroke-width="{w}"/>'

def ondas(y=160, x0=8, x1=312, a=4, p=34, col=B, w=1.3):
    d = f'M{x0} {y}'
    x = x0; up = True
    while x < x1:
        nx = min(x + p, x1)
        d += f'Q{(x+nx)/2} {y-a if up else y+a} {nx} {y}'
        x = nx; up = not up
    return f'<path d="{d}" stroke="{col}" stroke-width="{w}"/>'

def ola_grande(x, y, s=1):
    return g(b('M0 0c10-18 34-24 48-10c-10-2-18 4-14 12c6 10 24 6 30-4') + b('M-20 8c20 4 60 4 110 0', 1.2), x, y, s)

# ── GENTE ────────────────────────────────────────────────────────────────
def cabeza(x, y, r=10, w=1.5):
    return n(f'M{x} {y-r}c{r*0.6:.1f} 0 {r} {r*0.5:.1f} {r} {r*1.1:.1f}s-{r*0.4:.1f} {r*1.1:.1f}-{r} {r*1.1:.1f}-{r} -{r*0.5:.1f}-{r} -{r*1.1:.1f} {r*0.4:.1f}-{r*1.1:.1f} {r}-{r*1.1:.1f}z', w)

def adulto(x, y=168, s=1, brazo_d='baja', brazo_i='baja', relleno=False):
    """Figura de abrigo largo, pies en (x,y). Alto ≈ 138*s. brazos: baja|alza|tiende|cintura."""
    h = ''
    h += cabeza(0, -128, 10)
    coat = 'M-6 -112c-8 2-12 10-14 20l-6 46h40l-4-46c-2-10-6-18-12-20c-2 2-6 2-10 0z'
    h += (wash(coat) if relleno else '') + n(coat)
    h += n('M-14 -46l-6 44h-8M8 -46l8 42h8')
    br = {'baja': 'l-6 34', 'alza': 'c-6-14-8-28-6-40', 'tiende': 'c8 8 18 14 30 16', 'cintura': 'c4 10 8 18 14 22'}
    h += n('M-16 -92' + br[brazo_i].replace('l-6 34', 'l-6 34'))
    bd = {'baja': 'l6 34', 'alza': 'c6-14 8-28 6-40', 'tiende': 'c8 8 18 14 30 16', 'cintura': 'c-2 10-6 16-12 20'}
    h += n('M12 -92' + bd[brazo_d])
    return g(h, x, y, s)

def mujer(x, y=168, s=1, brazo_d='baja', brazo_i='baja', relleno=False, pelo=True):
    """Figura con vestido y melena. Alto ≈ 132*s."""
    h = cabeza(0, -120, 9.5)
    if pelo:
        h += n('M9 -126c4 6 4 16 0 24M-9 -126c-4 6-4 16 0 22', 1.3)
    dress = 'M-5 -100c-8 2-10 10-12 18l-12 40h58l-12-40c-2-8-4-16-12-18c-3 2-7 2-10 0z'
    h += (wash(dress) if relleno else '') + n(dress)
    h += n('M-8 -42l-3 40h-7M8 -42l4 40h7')
    br = {'baja': 'c-4 12-8 22-10 32', 'alza': 'c-6-14-8-28-6-40', 'tiende': 'c-10 8-20 12-30 14', 'cintura': 'c-6 8-6 16 0 22'}
    bd = {'baja': 'c4 12 8 22 10 32', 'alza': 'c6-14 8-28 6-40', 'tiende': 'c10 8 20 12 30 14', 'cintura': 'c6 8 6 16 0 22'}
    h += n('M-12 -94' + br[brazo_i]) + n('M10 -94' + bd[brazo_d])
    return g(h, x, y, s)

def nino(x, y=168, s=1, brazo_d='baja', brazo_i='baja'):
    """Niña o niño pequeño. Alto ≈ 82*s."""
    h = cabeza(0, -74, 8) + n('M8 -78c4 0 7 4 5 9', 1.3)
    body = 'M-5 -58c-6 2-8 8-10 14l-6 22h34l-6-22c-2-6-4-12-10-14z'
    h += n(body) + n('M-6 -22l-3 20h-6M6 -22l4 20h6')
    br = {'baja': 'c-3 8-6 14-8 20', 'alza': 'c-6-10-6-20-4-28', 'tiende': 'c-8 2-14 2-20 0'}
    bd = {'baja': 'c3 8 6 14 8 20', 'alza': 'c6-10 6-20 4-28', 'tiende': 'c8 2 14 2 20 0'}
    h += n('M-8 -52' + br[brazo_i]) + n('M7 -52' + bd[brazo_d])
    return g(h, x, y, s)

def busto(x, y, s=1, relleno=False):
    """Cabeza y hombros, para retratos y grupos."""
    h = cabeza(0, -46, 12)
    sh = 'M-30 0c0-18 10-28 30-28s30 10 30 28'
    h += (wash(sh + 'z') if relleno else '') + n(sh) + n('M-4 -34c0 2 0 4-2 6M4 -34c0 2 0 4 2 6', 1.2)
    return g(h, x, y, s)

def sentado(x, y=168, s=1):
    """Persona sentada de perfil, mirando a la derecha (sin silla)."""
    h = cabeza(4, -98, 9) + n('M-4 -84c-6 14-8 30-6 44h34l6 40h8', 1.5) + n('M0 -78c6 10 12 18 20 22', 1.5)
    return g(h, x, y, s)

# ── MANOS ────────────────────────────────────────────────────────────────
def mano_abierta(x, y, s=1, flip=False):
    """Mano de perfil, palma arriba, dedos a la izquierda. Origen en la punta de los dedos."""
    h = n('M192 38C168 32 140 26 118 22c-30 0-70 0-100-2c-10 0-18-4-18-10c0-6 8-8 18-8c20 0 40-2 60-2l14-2c-4-6-8-16-8-24c0-6 6-8 10-2l8 16c2 6 6 10 12 12c20 4 40 10 62 16')
    h += n('M18 12c16 2 34 2 52 0', 1.1)
    return g(h, x, y, s, flip=flip)

def manos_sostienen(x, y, s=1, objeto=''):
    """Dos manos abiertas, palma arriba, que sostienen juntas lo que se dibuje encima (origen: centro entre las yemas)."""
    return g(objeto, x, y) + mano_abierta(x - 4 + 0, y + 8, s * 0.62, flip=True) + mano_abierta(x + 4, y + 8, s * 0.62)

def manos_corazon(x, y, s=1):
    """Dos manos ahuecadas que sostienen un corazón azul."""
    h = bw('M0 -30c-8-14-30-10-28 8c2 14 18 24 28 32c10-8 26-18 28-32c2-18-20-22-28-8z')
    h += n('M-60 10c10 0 22 4 30 14c8 10 20 14 30 14s22-4 30-14c8-10 20-14 30-14')
    h += n('M-60 10c-6-6-8-14-4-18M60 10c6-6 8-14 4-18', 1.3)
    h += n('M-70 40c10-6 20-10 34-10M70 40c-10-6-20-10-34-10', 1.2)
    return g(h, x, y, s)

def apreton(x, y, s=1):
    """Dos manos que se estrechan, puños de camisa a los lados."""
    h = n('M-90 10l30-20c10-6 20-6 30 0l16 10c6 4 6 10 0 12l-14-4')
    h += n('M90 10L60-10c-10-6-22-6-32 2l-20 16c-6 6-2 12 6 10l18-8 10 8c4 4 10 4 12 0')
    h += n('M-30 -10c6 6 14 14 22 16M-22 -2c6 6 12 10 18 12M-14 6c4 4 10 6 14 8', 1.1)
    h += b('M-96 2l10 16M96 2l-10 16', 1.6)
    return g(h, x, y, s)

# ── ARQUITECTURA ─────────────────────────────────────────────────────────
def casa(x, y=170, w=50, h=40, techo=24, puerta=True, ventana=True, relleno=False, chimenea=False):
    d = f'M{x} {y}V{y-h}l{w/2} -{techo}l{w/2} {techo}V{y}'
    s = (wash(d + 'z', W2) if relleno else '') + n(d)
    if chimenea: s += n(f'M{x+w*0.72} {y-h-techo*0.45}v-12h8v{12+techo*0.45-techo*0.31:.1f}')
    if puerta: s += n(f'M{x+w*0.4} {y}v-{h*0.5:.1f}h{w*0.2:.1f}v{h*0.5:.1f}', 1.2)
    if ventana: s += bw(f'M{x+w*0.12} {y-h*0.72}h{w*0.18:.1f}v{h*0.24:.1f}h-{w*0.18:.1f}z', 1.1) + bw(f'M{x+w*0.7} {y-h*0.72}h{w*0.18:.1f}v{h*0.24:.1f}h-{w*0.18:.1f}z', 1.1)
    return s

def edificio(x, y=170, w=34, h=90, pisos=5, cols=2, relleno=False, azul=()):
    s = (wash(f'M{x} {y}V{y-h}h{w}V{y}z', W2) if relleno else '') + n(f'M{x} {y}V{y-h}h{w}V{y}')
    ph = (h - 10) / pisos
    for i in range(pisos):
        for j in range(cols):
            wx = x + 5 + j * ((w - 10) / cols); wy = y - h + 6 + i * ph
            ww = (w - 10) / cols - 4
            c = bw if (i, j) in azul else (lambda d, w=1.0: n(d, 1.0))
            s += c(f'M{wx:.1f} {wy:.1f}h{ww:.1f}v{ph-6:.1f}h-{ww:.1f}z', 1.0)
    return s

def ciudad(x0=10, x1=310, y=170, seed=3, alto=60, w=0.9, col=N):
    r = random.Random(seed); d = f'M{x0} {y}'; x = x0
    while x < x1 - 10:
        hh = r.randint(int(alto * 0.4), alto); ww = r.randint(14, 26)
        d += f'V{y-hh}h{min(ww, x1-x)}'; x += ww
        if r.random() < 0.3: d += f'v{r.randint(-14,-6)}h6v{r.randint(4,10)}'; x += 6
    d += f'V{y}'
    return f'<path d="{d}" stroke="{col}" stroke-width="{w}"/>'

def columnas(x, y=170, w=110, h=70):
    """Edificio de columnas: institución, patrimonio."""
    s = n(f'M{x-6} {y}h{w+12}M{x} {y-6}h{w}M{x} {y-h}h{w}M{x-8} {y-h}l{w/2+8} -{h*0.35:.1f}l{w/2+8} {h*0.35:.1f}z')
    k = 5
    for i in range(k):
        cx = x + 10 + i * (w - 20) / (k - 1)
        s += n(f'M{cx-4:.1f} {y-6}V{y-h+4}M{cx+4:.1f} {y-6}V{y-h+4}', 1.2)
    s += bw(f'M{x+w/2-8} {y-h-10}a8 8 0 1 0 16 0a8 8 0 1 0 -16 0', 1.2)
    return s

def fabrica(x, y=170, s=1, humo=False):
    h = n('M0 0V-50l30 18V-50l30 18V-50l30 18V-90h16V0z')
    h += n('M10 -20h12v-12h-12zM40 -20h12v-12h-12zM70 -20h12v-12h-12z', 1.1)
    if humo: h += n('M98 -96c-6-8 4-14-2-22c10-6 18 2 14 10', 1.2)
    return g(h, x, y, s)

# ── NATURALEZA ───────────────────────────────────────────────────────────
def arbol(x, y=170, lon=40, prof=5, seed=11, hoja=6.5, col_hoja=B, rel_hoja=W):
    r = random.Random(seed); ramas = []; hojas = []
    def rama(x0, y0, ang, l, p):
        x2 = x0 + l * math.cos(math.radians(ang)); y2 = y0 - l * math.sin(math.radians(ang))
        mx = (x0 + x2) / 2 + r.uniform(-4, 4); my = (y0 + y2) / 2 + r.uniform(-4, 4)
        ramas.append((f'M{x0:.1f} {y0:.1f}Q{mx:.1f} {my:.1f} {x2:.1f} {y2:.1f}', max(0.8, 0.5 + p * 0.3)))
        if p == 0:
            a = ang + r.uniform(-30, 30)
            hojas.append(f'<ellipse cx="{x2:.1f}" cy="{y2:.1f}" rx="{hoja}" ry="{hoja*0.46:.1f}" transform="rotate({-a:.0f} {x2:.1f} {y2:.1f})" fill="{rel_hoja}" stroke="{col_hoja}" stroke-width="1"/>')
            return
        for dd in (-1, 1):
            rama(x2, y2, ang + dd * r.uniform(18, 34), l * r.uniform(0.66, 0.78), p - 1)
        if p >= 2 and r.random() < 0.5: rama(x2, y2, ang + r.uniform(-8, 8), l * 0.6, p - 2)
    rama(x, y, 90, lon, prof)
    return ''.join(f'<path d="{d}" stroke="{N}" stroke-width="{w:.2f}"/>' for d, w in ramas) + ''.join(hojas)

def pino(x, y=170, h=70, w=36):
    d = f'M{x} {y-h}'
    for i in range(1, 5):
        yy = y - h + i * h * 0.21; ww = w * i / 4 / 2
        d += f'L{x+ww:.1f} {yy:.1f}l-{ww*0.4:.1f} 0'
    d += f'L{x} {y-h}'
    d2 = f'M{x} {y-h}'
    for i in range(1, 5):
        yy = y - h + i * h * 0.21; ww = w * i / 4 / 2
        d2 += f'L{x-ww:.1f} {yy:.1f}l{ww*0.4:.1f} 0'
    return wash(f'M{x} {y-h}L{x+w/2} {y-h*0.16}H{x-w/2}z', W2) + n(d, 1.3) + n(d2, 1.3) + n(f'M{x} {y-h*0.16}V{y}', 1.3)

def brote(x, y=170, s=1, azul=True):
    h = n('M0 0c0-14 0-26-2-36') + (bw if azul else nw)('M-2 -30c-14-2-22-10-22-22c14 0 22 8 22 22z', 1.3) + (bw if azul else nw)('M-1 -36c4-14 14-20 26-20c0 14-10 22-26 20z', 1.3)
    return g(h, x, y, s)

def hoja(x, y, s=1, rot=0, azul=True):
    h = (bw if azul else nw)('M0 0c10-14 30-18 44-12c-6 16-26 24-44 12z', 1.3) + n('M0 0c14-4 28-8 40-10', 1)
    return g(h, x, y, s, rot)

def espiga(x, y=170, h=70, s=1):
    d = n(f'M0 0c0-{h*0.5} 2-{h*0.8} 4-{h}')
    gr = ''
    for i in range(6):
        yy = -h * 0.4 - i * h * 0.1
        gr += ell(-5 + i * 0.6, yy, 3.2, 7, N, 1.1, W2, -25) + ell(8 + i * 0.6, yy - 3, 3.2, 7, N, 1.1, W2, 25)
    return g(d + gr, x, y, s)

def montanas(x0=8, x1=312, y=170, picos=((90, 70), (170, 100), (250, 60)), azul_nieve=True):
    d = f'M{x0} {y}'
    for px, ph in picos: d += f'L{px} {y-ph}'
    d += f'L{x1} {y}'
    s = n(d, 1.3)
    if azul_nieve:
        for px, ph in picos:
            s += b(f'M{px-10} {y-ph+14}l5 4 5-6 5 6 5-4', 1.2)
    return s

def sol(x, y, r=18, rayos=True):
    s = bcirc(x, y, r, 1.5)
    if rayos:
        for k in range(8):
            a = math.radians(k * 45)
            s += b(f'M{x+(r+6)*math.cos(a):.1f} {y+(r+6)*math.sin(a):.1f}L{x+(r+14)*math.cos(a):.1f} {y+(r+14)*math.sin(a):.1f}', 1.3)
    return s

def nube(x, y, s=1, azul=False):
    d = 'M0 0h60c10 0 14-14 4-18c0-12-14-16-22-10c-6-12-26-12-30 2c-12-2-18 8-14 16c-8 2-8 10 2 10z'
    return g(bw(d, 1.3) if azul else n(d, 1.3), x, y, s)

def gota(x, y, s=1, relleno=True):
    d = 'M0 -30c-10 16-18 26-18 36a18 18 0 0 0 36 0c0-10-8-20-18-36z'
    return g((bw(d, 1.5) if relleno else b(d, 1.5)) + n('M-8 8c0 6 4 10 10 10', 1.1), x, y, s)

def pajaros(*pos):
    s = ''
    for (x, y, k) in pos:
        s += b(f'M{x} {y}q{3.5*k} -{3.5*k} {7*k} 0q{3.5*k} -{3.5*k} {7*k} 0', 1.3)
    return s

def pez(x, y, s=1, flip=False):
    h = bw('M0 0c10-12 30-14 44 0c-14 14-34 12-44 0z', 1.3) + n('M44 0l12-10v20z', 1.3) + circ(10, -2, 1.5, N, 1.2)
    return g(h, x, y, s, flip=flip)

def mariposa(x, y, s=1):
    h = bw('M0 0c-6-16-24-22-28-12c-4 10 10 18 28 12z', 1.2) + bw('M0 0c6-16 24-22 28-12c4 10-10 18-28 12z', 1.2)
    h += bw('M0 0c-14 4-20 16-12 20c8 2 12-10 12-20z', 1.2) + bw('M0 0c14 4 20 16 12 20c-8 2-12-10-12-20z', 1.2)
    h += n('M0 -8v20M0 -8c-2-6-6-10-10-12M0 -8c2-6 6-10 10-12', 1.1)
    return g(h, x, y, s)

def vaca(x, y=170, s=1):
    """Vaca de perfil mirando a la derecha; pies en y."""
    h = n('M2 -60C30 -66 60 -66 88 -62c4 0 6 2 8 4c8-2 16 0 20 6l8 12c2 4 0 8-4 8h-12c-4 0-8-2-10-6l-4 2c-2 8-4 14-8 18v18h-8l-2-18H24l-2 18h-8l-2-18c-8-4-12-14-10-30c0-8-2-14 0-14z', 1.5)
    h += n('M98 -58c2-8 8-10 12-8M100 -56c-6-4-10-2-12 2M2 -60c-6 6-8 20-6 34M-6 -26c-2 4 0 8 2 8', 1.3)
    h += n('M74 -24v18h-7l-1-16M30 -24v18h-7l-1-16', 1.3) + circ(110, -48, 1.4, N, 1.1, N) + n('M50 -24c0 6 6 8 10 4', 1.2)
    h += wash('M22 -62c8 8 6 22-6 24c-8-2-10-14-2-24z') + wash('M54 -64c10 2 14 14 6 20c-10 0-12-10-6-20z')
    return g(h, x, y, s)

# ── OBJETOS ──────────────────────────────────────────────────────────────
def libro(x, y, s=1):
    h = n('M0 0c-20-8-46-8-66-2v-52c20-6 46-6 66 2c20-8 46-8 66-2v52c-20-6-46-6-66 2zM0 0V-52')
    h += b('M-56 -40c14-4 30-4 46 0M-56 -30c14-4 30-4 46 0M10 -40c14-4 30-4 46 0M10 -30c14-4 30-4 46 0', 1.1)
    return g(h, x, y, s)

def pantalla(x, y, w=110, h=70, base=True):
    s = n(f'M{x} {y}h{w}v{h}h-{w}z') + n(f'M{x+5} {y+5}h{w-10}v{h-10}h-{w-10}z', 1)
    if base: s += n(f'M{x+w/2} {y+h}v12M{x+w/2-22} {y+h+12}h44')
    return s

def portatil(x, y, w=110, h=66):
    return n(f'M{x+8} {y+h}V{y}h{w-16}v{h}M{x-6} {y+h}h{w+12}l-8 8h-{w-4}z') + n(f'M{x+14} {y+6}h{w-28}v{h-12}h-{w-28}z', 1)

def movil(x, y, w=40, h=74):
    return n(f'M{x+6} {y}h{w-12}a6 6 0 0 1 6 6v{h-12}a6 6 0 0 1-6 6h-{w-12}a6 6 0 0 1-6-6v-{h-12}a6 6 0 0 1 6-6z') + n(f'M{x+w/2-6} {y+5}h12', 1.1)

def engranaje(x, y, r=26, dientes=10, col=N, relleno=False):
    d = ''
    for i in range(dientes * 2):
        a0 = 2 * math.pi * i / (dientes * 2); a1 = 2 * math.pi * (i + 1) / (dientes * 2)
        rr = r + 6 if i % 2 == 0 else r
        p0 = (x + rr * math.cos(a0 + 0.06), y + rr * math.sin(a0 + 0.06)); p1 = (x + rr * math.cos(a1 - 0.06), y + rr * math.sin(a1 - 0.06))
        d += ('M' if i == 0 else 'L') + f'{p0[0]:.1f} {p0[1]:.1f}L{p1[0]:.1f} {p1[1]:.1f}'
    d += 'z'
    s = (wash(d) if relleno else '') + f'<path d="{d}" stroke="{col}" stroke-width="1.4"/>'
    return s + circ(x, y, r * 0.38, col, 1.3)

def moneda(x, y, r=22, simbolo='€'):
    s = bcirc(x, y, r, 1.5) + circ(x, y, r * 0.78, B, 1)
    if simbolo == '€':
        s += n(f'M{x+r*0.3:.1f} {y-r*0.35:.1f}a{r*0.42:.1f} {r*0.42:.1f} 0 1 0 0 {r*0.7:.1f}M{x-r*0.42:.1f} {y-r*0.08:.1f}h{r*0.5:.1f}M{x-r*0.42:.1f} {y+r*0.12:.1f}h{r*0.5:.1f}', 1.3)
    return s

def balanza(x, y, s=1, azul_izq=True):
    h = n('M0 0V-90M-20 0h40M0 -90l-50 6M0 -90l50 6M0 -96v-4', 1.5) + circ(0, -92, 3, N, 1.3)
    h += n('M-50 -84l-16 34M-50 -84l16 34M50 -84l-16 34M50 -84l16 34', 1.1)
    h += (bw if azul_izq else nw)('M-70 -50h40c0 10-8 16-20 16s-20-6-20-16z', 1.3)
    h += (nw if azul_izq else bw)('M30 -50h40c0 10-8 16-20 16s-20-6-20-16z', 1.3)
    return g(h, x, y, s)

def escudo(x, y, s=1, azul=True, check=True):
    d = 'M0 -40l34 12v26c0 24-16 40-34 48c-18-8-34-24-34-48v-26z'
    return g((bw(d, 1.5) if azul else n(d)) + (n('M-12 2l8 8 16-18', 1.6) if check else ''), x, y, s)

def candado(x, y, s=1):
    h = n('M-14 -10v-12a14 14 0 0 1 28 0v12') + bw('M-22 -10h44v34h-44z', 1.5) + n('M0 2v8', 1.6) + circ(0, 0, 3, N, 1.3)
    return g(h, x, y, s)

def lupa(x, y, s=1):
    h = bw('M-20 0a20 20 0 1 0 40 0a20 20 0 1 0 -40 0z', 1.5) + n('M14 14l22 22') + n('M-10 -6c2-6 6-10 12-10', 1.1)
    return g(h, x, y, s)

def corazon(x, y, s=1, azul=True):
    d = 'M0 10c-10-8-26-18-26-32c0-14 18-18 26-4c8-14 26-10 26 4c0 14-16 24-26 32z'
    return g(bw(d, 1.5) if azul else n(d), x, y, s)

def reciclaje(x, y, r=30):
    s = ''
    for k in range(3):
        a0 = math.radians(k * 120 - 80); a1 = math.radians(k * 120 + 10)
        p0 = (x + r * math.cos(a0), y + r * math.sin(a0)); p1 = (x + r * math.cos(a1), y + r * math.sin(a1))
        s += b(f'M{p0[0]:.1f} {p0[1]:.1f}A{r} {r} 0 0 1 {p1[0]:.1f} {p1[1]:.1f}', 1.6)
        t = a1 + math.pi / 2
        s += b(f'M{p1[0]:.1f} {p1[1]:.1f}l{-8*math.cos(t-0.5):.1f} {-8*math.sin(t-0.5):.1f}M{p1[0]:.1f} {p1[1]:.1f}l{-8*math.cos(t+0.6):.1f} {-8*math.sin(t+0.6):.1f}', 1.6)
    return s

def flechas_ciclo(x, y, r=40, col=B):
    s = ''
    for k in range(2):
        a0 = math.radians(k * 180 + 20); a1 = math.radians(k * 180 + 160)
        p0 = (x + r * math.cos(a0), y + r * math.sin(a0)); p1 = (x + r * math.cos(a1), y + r * math.sin(a1))
        s += f'<path d="M{p0[0]:.1f} {p0[1]:.1f}A{r} {r} 0 0 1 {p1[0]:.1f} {p1[1]:.1f}" stroke="{col}" stroke-width="1.5"/>'
        t = a1 + math.pi / 2
        s += f'<path d="M{p1[0]:.1f} {p1[1]:.1f}l{-8*math.cos(t-0.5):.1f} {-8*math.sin(t-0.5):.1f}M{p1[0]:.1f} {p1[1]:.1f}l{-8*math.cos(t+0.6):.1f} {-8*math.sin(t+0.6):.1f}" stroke="{col}" stroke-width="1.5"/>'
    return s

def grafica(x, y, w=110, h=60, sube=True):
    pts = [0, 0.18, 0.12, 0.38, 0.32, 0.6, 0.78] if sube else [0.78, 0.6, 0.66, 0.4, 0.46, 0.22, 0.1]
    d = f'M{x} {y}'
    for i, p in enumerate(pts): d += f'L{x + i * w / (len(pts)-1):.1f} {y - p * h:.1f}'
    return n(f'M{x} {y-h-6}V{y}h{w+6}', 1.2) + b(d, 1.8) + circ(x + w, y - pts[-1] * h, 3.5, B, 1.4, W)

def barras(x, y, alturas=(20, 34, 28, 48, 60), w=14, gap=8, azul=(4,)):
    s = n(f'M{x-6} {y}h{len(alturas)*(w+gap)+6}', 1.2)
    for i, a in enumerate(alturas):
        d = f'M{x+i*(w+gap)} {y}v-{a}h{w}v{a}'
        s += (bw(d + 'z', 1.3) if i in azul else n(d, 1.3))
    return s

def red(x, y, puntos, enlaces, r=5, azul=()):
    s = ''
    for a, c in enlaces:
        (x1, y1), (x2, y2) = puntos[a], puntos[c]
        s += n(f'M{x+x1} {y+y1}L{x+x2} {y+y2}', 1.1)
    for i, (px, py) in enumerate(puntos):
        s += circ(x + px, y + py, r, B if i in azul else N, 1.4, W if i in azul else '#fff')
    return s

def torre_antena(x, y=170, h=110):
    s = n(f'M{x-20} {y}L{x-3} {y-h}h6L{x+20} {y}')
    for i in range(1, 6):
        yy = y - i * h / 6; ww = 20 - 17 * i / 6
        yy2 = y - (i - 1) * h / 6; ww2 = 20 - 17 * (i - 1) / 6
        s += n(f'M{x-ww2:.1f} {yy2:.1f}L{x+ww:.1f} {yy:.1f}M{x+ww2:.1f} {yy2:.1f}L{x-ww:.1f} {yy:.1f}', 0.9)
    s += n(f'M{x} {y-h}v-14', 1.3)
    for k, rr in enumerate((12, 22, 32)):
        s += b(f'M{x-rr*0.7:.1f} {y-h-14-rr*0.7:.1f}A{rr} {rr} 0 0 1 {x+rr*0.7:.1f} {y-h-14-rr*0.7:.1f}', 1.3)
    return s

def ondas_senal(x, y, k=3, r0=10, dr=10, ang=90, col=B):
    s = ''
    for i in range(k):
        rr = r0 + i * dr; a = math.radians(ang)
        s += f'<path d="M{x+rr*math.cos(a-0.7):.1f} {y-rr*math.sin(a-0.7):.1f}A{rr} {rr} 0 0 0 {x+rr*math.cos(a+0.7):.1f} {y-rr*math.sin(a+0.7):.1f}" stroke="{col}" stroke-width="1.4"/>'
    return s

def aerogenerador(x, y=170, h=100, ang=10):
    s = n(f'M{x-3} {y}L{x-1} {y-h}h2L{x+3} {y}')
    for k in range(3):
        a = math.radians(ang + k * 120)
        tx, ty = x + 40 * math.cos(a), y - h + 40 * math.sin(a)
        nx, ny = -math.sin(a) * 5, math.cos(a) * 5
        s += n(f'M{x} {y-h}Q{(x+tx)/2+nx:.1f} {(y-h+ty)/2+ny:.1f} {tx:.1f} {ty:.1f}Q{(x+tx)/2-nx*0.2:.1f} {(y-h+ty)/2-ny*0.2:.1f} {x} {y-h}', 1.2)
    return s + bcirc(x, y - h, 3.5, 1.2)

def placa_solar(x, y=170, s=1):
    h = wash('M0 0h100l30-55H30z') + n('M0 0h100l30-55H30z') + ''.join(n(f'M{i*25} 0L{30+i*25} -55', 1.0) for i in range(1, 4)) + n('M15 -27.5H115', 1.0) + n('M50 0v18M80 0v18M40 18h50', 1.3)
    return g(h, x, y - 18 * s, s)

def bateria(x, y, w=40, h=70, nivel=0.7):
    s = n(f'M{x} {y}h{w}v{h}h-{w}z') + n(f'M{x+w/2-8} {y}v-6h16v6', 1.3)
    s += bw(f'M{x+5} {y+h-5}v-{(h-10)*nivel:.1f}h{w-10}v{(h-10)*nivel:.1f}z', 1.1)
    s += n(f'M{x+w/2+3} {y+h*0.35}l-8 14h8l-6 14', 1.4)
    return s

def rayo(x, y, s=1):
    return g(bw('M4 -24l-16 26h12l-6 22 20-28h-12l8-20z', 1.4), x, y, s)

def bombilla(x, y, s=1):
    h = bw('M0 -40a24 24 0 0 0 -14 44c4 4 4 8 4 12h20c0-4 0-8 4-12a24 24 0 0 0 -14 -44z', 1.5) + n('M-8 22h16M-6 28h12M-4 6c0-10-4-16-4-20M4 6c0-10 4-16 4-20M-8 -14c4 4 12 4 16 0', 1.2)
    return g(h, x, y, s)

def termometro(x, y, s=1, nivel=0.6):
    h = n('M-6 0v-60a6 6 0 0 1 12 0v60a12 12 0 1 1 -12 0z') + bw(f'M-2 4v-{56*nivel:.1f}h4v{56*nivel:.1f}', 1.2) + bcirc(0, 10, 7, 1.2)
    for i in range(4): h += n(f'M8 {-10-i*12}h6', 1.1)
    return g(h, x, y, s)

def reloj(x, y, r=26):
    return circ(x, y, r, N, 1.5, '#fff') + n(f'M{x} {y-r*0.65}V{y}l{r*0.45} {r*0.3}', 1.5) + ''.join(n(f'M{x+r*0.82*math.cos(math.radians(a)):.1f} {y+r*0.82*math.sin(math.radians(a)):.1f}L{x+r*0.92*math.cos(math.radians(a)):.1f} {y+r*0.92*math.sin(math.radians(a)):.1f}', 1.2) for a in range(0, 360, 30))

def globo(x, y, r=40):
    s = bcirc(x, y, r, 1.5) + ell(x, y, r * 0.45, r, B, 1, 'none') + n(f'M{x-r} {y}h{2*r}M{x-r*0.85:.1f} {y-r*0.5:.1f}h{r*1.7:.1f}M{x-r*0.85:.1f} {y+r*0.5:.1f}h{r*1.7:.1f}', 0.9)
    s += n(f'M{x-r*0.5:.1f} {y-r*0.55:.1f}c8 4 6 14 14 18c6 2 4 10-2 12c-8 4-10-8-16-6M{x+r*0.2:.1f} {y+r*0.1:.1f}c8-4 18 0 18 10c0 8-10 10-12 18', 1.3)
    return s

def bocadillo(x, y, w=70, h=40, azul=True, cola='izq'):
    tail = f'l-10 14 4-14' if cola == 'izq' else f'l10 14-4-14'
    tx = x + 14 if cola == 'izq' else x + w - 18
    d = f'M{x+10} {y}h{w-20}a10 10 0 0 1 10 10v{h-20}a10 10 0 0 1-10 10H{tx+14}{tail}H{x+10}a10 10 0 0 1-10-10v-{h-20}a10 10 0 0 1 10-10z' if cola == 'izq' else f'M{x+10} {y}h{w-20}a10 10 0 0 1 10 10v{h-20}a10 10 0 0 1-10 10H{tx+4}{tail}H{x+10}a10 10 0 0 1-10-10v-{h-20}a10 10 0 0 1 10-10z'
    return bw(d, 1.4) if azul else n(d, 1.4)

def llave(x, y, s=1):
    h = n('M0 0a14 14 0 1 1 0 .1z') + n('M14 0h48v10M50 0v8M38 0v6', 1.5) + bcirc(-4, 0, 5, 1.2)
    return g(h, x, y, s)

def camiseta(x, y, s=1, azul=False):
    d = 'M-16 -40l-24 12 8 18 12-6v56h40v-56l12 6 8-18-24-12c-2 8-8 12-16 12s-14-4-16-12z'
    return g((bw(d, 1.5) if azul else nw(d, 1.5)), x, y, s)

def aguja_hilo(x, y, s=1):
    h = n('M0 0l60-60') + ell(54, -54, 4, 1.6, N, 1.2, 'none', -45) + b('M57 -57c20-10 10 30-20 30s-60 10-70 30', 1.3)
    return g(h, x, y, s)

def etiqueta(x, y, s=1):
    h = bw('M0 0h44l14 16-14 16H0z', 1.4) + circ(48, 16, 3, N, 1.2) + n('M8 10h24M8 18h20M8 26h14', 1.1) + n('M51 16c10-6 16-20 10-30', 1.2)
    return g(h, x, y, s)

def matraz(x, y, s=1):
    h = n('M-8 -60v24l-26 46c-4 8 0 14 8 14h52c8 0 12-6 8-14l-26-46v-24M-12 -60h24') + bw('M-26 6h52c2 0 4 0 4 2-2 6-4 8-8 8h-44c-4 0-6-2-8-8 0-2 2-2 4-2z', 1.1) + bcirc(-6, -4, 3, 1) + bcirc(6, -12, 2, 1)
    return g(h, x, y, s)

def microscopio(x, y, s=1):
    h = n('M-30 0h60M-10 0v-10h30v10M0 -10l20-60M12 -76l14 6-4 10-14-6zM24 -30c-14 0-24-10-24-24') + bcirc(-2, -18, 5, 1.2) + n('M-14 -18h24', 1.2)
    return g(h, x, y, s)

def birrete(x, y, s=1):
    h = nw('M0 -20l50 18-50 18-50-18z', 1.5) + n('M-30 4v16c18 10 42 10 60 0V4') + b('M40 2v26', 1.4) + bcirc(40, 30, 3, 1.1)
    return g(h, x, y, s)

def grifo(x, y, s=1):
    h = n('M0 0h40c10 0 16 6 16 16v6h-12v-6c0-4-2-6-6-6H0zM14 0v-10h12v10M8 -12h24') + gota(50, 44, 0.32)
    return g(h, x, y, s)

def tuberia(y, x0=8, x1=312):
    return n(f'M{x0} {y}H{x1}M{x0} {y+12}H{x1}', 1.3) + ''.join(n(f'M{x} {y-3}v18', 1.1) for x in range(x0 + 40, x1, 70))

def carro_compra(x, y, s=1):
    h = n('M-40 -50h10l12 40h44l8-30H-24') + circ(-12, 4, 5) + circ(24, 4, 5) + n('M-18 -10l-4 8h48')
    return g(h, x, y, s)

def cesta(x, y, s=1):
    h = n('M-34 -20h68l-8 30h-52z') + n('M-24 -20c0-20 48-20 48 0', 1.4) + n('M-20 -10l4 18M0 -10v18M20 -10l-4 18', 1.1)
    h += bcirc(-14, -24, 7, 1.2) + bcirc(0, -28, 7, 1.2) + bcirc(14, -24, 7, 1.2) + n('M0 -35c0-4 2-6 4-8', 1.1)
    return g(h, x, y, s)

def plato(x, y, s=1):
    h = ell(0, 0, 50, 14, N, 1.5, '#fff') + ell(0, -2, 34, 8, N, 1.1, 'none') + n('M-66 -20v24M-70 -20v8c0 4 4 6 4 6s4-2 4-6v-8M66 -20c-6 4-6 18 0 18v6', 1.3)
    h += g(hoja(0, 0, 0.5, 0), -16, -6) + bcirc(8, -6, 6, 1.1)
    return g(h, x, y, s)

def cerebro(x, y, s=1):
    h = bw('M0 -30c-10-10-30-6-30 8c-12 4-12 22 0 26c0 12 18 16 26 8c2 4 4 4 4 4s2 0 4-4c8 8 26 4 26-8c12-4 12-22 0-26c0-14-20-18-30-8z', 1.4)
    h += n('M0 -30v40M-18 -12c6 0 10 4 10 10M18 -12c-6 0-10 4-10 10M-14 6c4-2 8-2 10 2M14 6c-4-2-8-2-10 2', 1.1)
    return g(h, x, y, s)

def estetoscopio(x, y, s=1):
    h = n('M-20 -50v20c0 20 40 20 40 0v-20M0 -12v30c0 20 40 24 44 0v-14') + bcirc(44, -2, 8, 1.4) + circ(-20, -52, 2.5) + circ(20, -52, 2.5)
    return g(h, x, y, s)

def cruz_medica(x, y, s=1):
    return g(bw('M-8 -24h16v16h16v16h-16v16h-16v-16h-16v-16h16z', 1.4), x, y, s)

def pastilla(x, y, s=1, rot=-30):
    h = n('M-20 -8h40a8 8 0 0 1 0 16h-40a8 8 0 0 1 0-16z') + bw('M0 -8h20a8 8 0 0 1 0 16H0z', 1.3)
    return g(h, x, y, s, rot)

def pico_pala(x, y, s=1):
    h = n('M0 0l40-50') + n('M24 -46c10-10 26-12 36-6c-12 2-22 6-30 12z') + n('M60 0l-10-40') + nw('M44 -42l12-4 6 16-10 6z', 1.3)
    return g(h, x, y, s)

def tronco(x, y, s=1):
    h = n('M-40 -14h70M-40 14h70') + ell(-40, 0, 8, 14, N, 1.4, '#fff') + bw('M30 -14a8 14 0 1 0 0 28a8 14 0 1 0 0-28z', 1.3)
    h += ell(30, 0, 4, 8, B, 1, 'none') + ell(30, 0, 1.5, 3, B, 1, 'none')
    return g(h, x, y, s)

def cadena(x, y, k=4, s=1):
    h = ''
    for i in range(k):
        if i % 2: h += bw(f'M{i*30-16} -5h32a5 5 0 0 1 0 10h-32a5 5 0 0 1 0-10z', 1.4)
        else: h += n(f'M{i*30-14} -11h28a11 11 0 0 1 0 22h-28a11 11 0 0 1 0-22z', 1.4)
    return g(h, x, y, s)

def portapapeles(x, y, s=1):
    h = n('M-26 -40h52v74h-52z') + nw('M-10 -46h20v10h-20z', 1.3) + b('M-16 -20l4 4 8-8M-16 -2l4 4 8-8M-16 16l4 4 8-8', 1.4) + n('M4 -16h14M4 2h14M4 20h14', 1.1)
    return g(h, x, y, s)

def urna(x, y, s=1):
    h = n('M-34 0V-50h68V0z') + n('M-14 -50h28', 2.2) + bw('M-10 -50l4-28h20l-4 28', 1.3) + n('M-2 -70l4 4 8-8', 1.3)
    return g(h, x, y, s)

def periodico(x, y, s=1):
    h = n('M-40 -40h70v70h-70zM30 -30h10v56c0 4-4 4-4 4') + bw('M-32 -30h28v20h-28z', 1.2) + n('M2 -30h20M2 -22h20M2 -14h20M-32 -2h54M-32 6h54M-32 14h54M-32 22h40', 1.0)
    return g(h, x, y, s)

def brujula(x, y, r=30):
    return circ(x, y, r, N, 1.5, '#fff') + circ(x, y, r - 5, N, 0.9) + bw(f'M{x} {y-r+8}l7 {r-8}-7 4-7-4z', 1.2) + n(f'M{x} {y+r-8}l7 -{r-8}-7-4-7 4z', 1.2)

def satelite(x, y, s=1, rot=-25):
    h = nw('M-10 -10h20v20h-20z', 1.4) + bw('M-48 -8h34v16h-34zM14 -8h34v16h-34z', 1.2) + n('M-31 -8v16M31 -8v16M0 10v10', 1.0) + circ(0, 22, 3)
    return g(h, x, y, s, rot)

def paleta(x, y, s=1):
    h = n('M0 -30c-30 0-44 20-40 38c4 16 22 20 34 14c6-4 10 2 14 6c8 6 26-4 30-20c4-20-10-38-38-38z')
    h += bcirc(-20, -4, 5, 1.2) + bcirc(-10, -18, 5, 1.2) + circ(8, -20, 5, N, 1.2) + bcirc(22, -8, 5, 1.2) + n('M24 30l40-60', 1.3)
    return g(h, x, y, s)

def notas_musica(x, y, s=1):
    h = n('M0 0v-36l24-6v34') + bw('M-8 0a8 6 0 1 0 16 0a8 6 0 1 0 -16 0z', 1.2) + bw('M16 -8a8 6 0 1 0 16 0a8 6 0 1 0 -16 0z', 1.2)
    return g(h, x, y, s)

def mascaras(x, y, s=1):
    h = nw('M-40 -30c14-6 30-6 40 0v20c0 16-10 26-20 26s-20-10-20-26z', 1.4) + n('M-30 -14q4-4 8 0M-18 -14q4-4 8 0M-28 0c4 6 12 6 16 0', 1.2)
    h += bw('M4 -20c14-6 30-6 40 0v20c0 16-10 26-20 26s-20-10-20-26z', 1.4) + n('M14 -4q4 4 8 0M26 -4q4 4 8 0M16 14c4-6 12-6 16 0', 1.2)
    return g(h, x, y, s)

def paloma(x, y, s=1, flip=False):
    h = bw('M0 0c10-6 24-6 34 2c8-2 14 0 18 4c-6 0-10 2-12 6c-6 12-22 16-36 12c-6 6-16 8-24 6c8-4 12-10 14-16z', 1.4)
    h += n('M10 -2c4-16 18-28 34-30c-6 12-12 22-20 28', 1.3) + n('M52 6l8 2', 1.3) + circ(44, 4, 1.2, N, 1.1)
    h += b('M-16 8c-6 2-12 0-16-4M50 14c8 6 10 12 8 18', 1.1)
    return g(h, x, y, s, flip=flip)

def robot(x, y, s=1):
    h = nw('M-24 -30h48v36h-48z', 1.5) + n('M0 -30v-10') + bcirc(0, -44, 4, 1.2) + bcirc(-10, -14, 5, 1.2) + bcirc(10, -14, 5, 1.2) + n('M-8 -2h16', 1.3) + n('M-30 -20h-6v16h6M30 -20h6v16h-6', 1.2)
    return g(h, x, y, s)

def carpeta(x, y, s=1):
    h = nw('M-40 -30h28l6 8h46v52h-80z', 1.5) + b('M-30 -6h60M-30 4h60M-30 14h40', 1.1)
    return g(h, x, y, s)

def tienda(x, y=170, w=90, h=70):
    s = n(f'M{x} {y}V{y-h+20}M{x+w} {y}V{y-h+20}')
    tol = ''
    k = 6
    for i in range(k):
        x0 = x - 6 + i * (w + 12) / k
        d = f'M{x0:.1f} {y-h+20}a{(w+12)/k/2:.1f} 10 0 0 0 {(w+12)/k:.1f} 0'
        tol += (bw(d, 1.2) if i % 2 == 0 else n(d, 1.2))
    s += n(f'M{x-6} {y-h+20}L{x+6} {y-h}h{w-12}l12 20', 1.3) + tol
    s += n(f'M{x+10} {y}v-34h24v34', 1.2) + bw(f'M{x+46} {y-34}h34v18h-34z', 1.1)
    return s

def maceta(x, y, s=1):
    h = n('M-20 0h40l-6 30h-28z') + brote(0, 0, 0.9)
    return g(h, x, y, s)

def huella_dactilar(x, y, s=1):
    h = ''
    for i, r in enumerate((6, 12, 18, 24, 30)):
        h += (b if i % 2 else n)(f'M{-r} {r*0.4:.1f}c0-{r*1.6:.1f} {r*2} -{r*1.6:.1f} {r*2} 0v{r*0.5:.1f}', 1.2)
    return g(h, x, y, s)

def casco_obra(x, y, s=1):
    h = bw('M-30 0c0-20 12-32 30-32s30 12 30 32z', 1.5) + n('M-38 0h76c0 6-4 8-8 8h-60c-4 0-8-2-8-8zM-4 -32v-6h8v6M-14 -26v12M14 -26v12', 1.3)
    return g(h, x, y, s)

def llave_inglesa(x, y, s=1, rot=-35):
    h = n('M-50 -5h70M-50 5h70') + n('M20 -5c2-10 14-16 24-12l-10 10 4 8 12-4c4 10-4 20-16 18c-6 0-12-6-14-10') + n('M-50 -5a5 5 0 0 0 0 10', 1.3)
    return g(h, x, y, s, rot)

def cohete(x, y, s=1, rot=0):
    h = nw('M0 -50c14 12 18 32 14 50h-28c-4-18 0-38 14-50z', 1.5) + bcirc(0, -24, 6, 1.2) + n('M-14 -6l-12 14 10 0M14 -6l12 14-10 0', 1.3) + b('M-6 4c-2 10 0 16 6 22c6-6 8-12 6-22', 1.2)
    return g(h, x, y, s, rot)

def muro_ladrillo(x, y, w=80, h=50):
    s = n(f'M{x} {y}h{w}v-{h}h-{w}z', 1.4)
    rows = 5; rh = h / rows
    for i in range(1, rows): s += n(f'M{x} {y-i*rh:.1f}h{w}', 1.0)
    for i in range(rows):
        off = 0 if i % 2 == 0 else 10
        for xx in range(int(x + 20 + off), int(x + w), 20):
            s += n(f'M{xx} {y-i*rh:.1f}v-{rh:.1f}', 1.0)
    s += wash(f'M{x+20} {y-rh}h20v-{rh}h-20z') + wash(f'M{x+50} {y-3*rh}h20v-{rh}h-20z')
    return s

def cama(x, y, s=1):
    h = n('M-60 0v-40M-60 -14h120M60 0v-22M-60 -22h12c6 0 8-10 0-10h-12') + bw('M-46 -22h100c4 0 6 4 6 8h-106z', 1.3) + n('M-60 -14v-8', 1.3)
    return g(h, x, y, s)

def silla_ruedas(x, y, s=1):
    h = bcirc(0, 0, 22, 1.5) + circ(0, 0, 3, N, 1.2) + circ(38, 16, 5) + n('M-14 -46l6 30h30l14 30M-4 -16l-6 28')
    return g(h, x, y, s)

def ojo(x, y, s=1):
    h = n('M-40 0c20-24 60-24 80 0c-20 24-60 24-80 0z') + bcirc(0, 0, 12, 1.4) + circ(0, 0, 4, N, 1.2, N)
    return g(h, x, y, s)

def paraguas(x, y, s=1):
    h = bw('M-50 0c0-30 22-46 50-46s50 16 50 46c-8-6-16-6-24 0c-8-6-18-6-26 0c-8-6-18-6-26 0c-8-6-16-6-24 0z', 1.4) + n('M0 -46v-6M0 0v40c0 8-12 8-12 0', 1.5)
    return g(h, x, y, s)

def telescopio(x, y, s=1):
    h = nw('M-40 -10l60-24 6 14-60 24z', 1.4) + n('M20 -34l16-6 6 14-16 6M-10 -6l-14 44M-10 -6l14 44M-10 -6v44') + n('M-44 -2l-6 2 4 10 6-2', 1.2)
    return g(h, x, y, s)

def contenedor_basura(x, y, s=1):
    h = n('M-22 -50h44l-4 50h-36z') + n('M-26 -50h52M-8 -50v-6h16v6M-8 -40v30M0 -40v30M8 -40v30', 1.2)
    return g(h, x, y, s)

def vela(x, y, s=1):
    h = n('M-8 0v-40h16v40M-14 0h28') + bw('M0 -46c-6-6-4-14 0-20c4 6 6 14 0 20z', 1.3) + b('M-16 -58c-4-4-4-10 0-14M16 -58c4-4 4-10 0-14', 1.0)
    return g(h, x, y, s)

def reloj_arena(x, y, s=1):
    h = n('M-20 -40h40M-20 40h40M-16 -40c0 22 32 22 32 40s-32 18-32 40M16 -40c0 22-32 22-32 40s32 18 32 40') + bw('M-10 30c4-8 16-8 20 0l4 8h-28z', 1.1) + b('M0 2v24', 1.0)
    return g(h, x, y, s)

def montaje(nombre, dibujos, ruta='prev', por_pagina=12):
    """Hojas de contacto de 12 en 12: nombre_p1.html, nombre_p2.html…"""
    os.makedirs(ruta, exist_ok=True)
    for k, v in dibujos: open(f'{ruta}/{k}.svg', 'w').write(v)
    paginas = [dibujos[i:i + por_pagina] for i in range(0, len(dibujos), por_pagina)]
    for p, lote in enumerate(paginas, 1):
        h = '<!doctype html><meta charset=utf-8><body style="margin:0;background:#f3f4f6"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:10px">' + ''.join(
            f'<div style="background:#fff;border-radius:14px;padding:6px;box-shadow:0 1px 5px #0002"><div style="font:700 12px sans-serif;padding:0 2px 4px">{_html.escape(k)}</div><div style="aspect-ratio:16/10"><img src="{ruta}/{k}.svg" style="width:100%;height:100%;object-fit:contain"></div></div>' for k, _ in lote) + '</div>'
        open(f'{nombre}_p{p}.html', 'w').write(h)
    return len(paginas)

# ── PIEZAS PARA LOS OBJETIVOS ────────────────────────────────────────────
def vaso(x, y, s=1, nivel=0.6):
    h = n('M-18 -50l4 50h28l4-50') + bw(f'M{-18+4*(1-nivel):.1f} {-50*nivel:.1f}l{4*nivel:.1f} {50*nivel:.1f}h28l{4*nivel:.1f} -{50*nivel:.1f}z', 1.1)
    return g(h, x, y, s)

def depuradora(x, y=170, s=1):
    h = ''
    for cx in (0, 80):
        h += ell(cx, -40, 32, 9, N, 1.4, W) + n(f'M{cx-32} -40v32c0 6 14 9 32 9s32-3 32-9v-32', 1.4) + b(f'M{cx-20} -40c6-3 14 3 20 0s14-3 20 0', 1.1)
    h += n('M32 -24h16M-32 -24h-30M112 -24h30', 1.4)
    return g(h, x, y, s)

def escalera(x, y, s=1, peldanos=4):
    h = ''
    for i in range(peldanos): h += n(f'M{i*22} -{i*18}v-18h22')
    return g(h, x, y, s)

def caballete(x, y=170, s=1, cuadro=''):
    h = n('M0 0l26-110 26 110M26 -110v-8M10 -40h32M26 -40v40', 1.4) + nw('M-6 -100h64v52h-64z', 1.4) + cuadro
    return g(h, x, y, s)

def entrada(x, y, s=1, rot=-12):
    h = bw('M-40 -20h80v12a8 8 0 0 0 0 16v12h-80v-12a8 8 0 0 0 0-16z', 1.4) + n('M18 -20v40', 1.0).replace('stroke-width="1.0"', 'stroke-width="1.0" stroke-dasharray="3 3"') + n('M-30 -6h36M-30 4h28', 1.1)
    return g(h, x, y, s, rot)

def claqueta(x, y, s=1):
    h = n('M-40 -20h80v50h-80z') + nw('M-40 -20l78-14 2 12-80 14z', 1.3) + b('M-26 -24l8 10M-6 -28l8 10M14 -31l8 10', 1.4) + n('M-30 0h40M-30 12h30', 1.1)
    return g(h, x, y, s)

def mazo(x, y, s=1, rot=-30):
    h = nw('M-30 -12h40v24h-40z', 1.4) + n('M-34 -14v28M14 -14v28M-10 12l0 50') + n('M-24 70h48', 1.6)
    return g(h, x, y, s, rot)

def escoba(x, y, s=1, rot=20):
    h = n('M0 -90v70') + bw('M-14 -20h28l10 30h-48z', 1.3) + n('M-6 -20l-4 30M0 -20v30M6 -20l4 30', 1.0)
    return g(h, x, y, s, rot)

def sobre(x, y, s=1):
    h = nw('M-40 -26h80v52h-80z', 1.5) + n('M-40 -26l40 30 40-30M-40 26l28-24M40 26l-28-24', 1.3)
    return g(h, x, y, s)

def maletin(x, y, s=1):
    h = bw('M-36 -20h72v44h-72z', 1.5) + n('M-12 -20v-8h24v8M-36 -2h72', 1.4) + n('M-4 -6h8v8h-8z', 1.2)
    return g(h, x, y, s)

def bloques(x, y=170, s=1):
    h = nw('M0 0v-30h30v30z', 1.4) + bw('M34 0v-30h30v30z', 1.4) + n('M16 -32v-30h30v30z', 1.4)
    h += f'<text x="15" y="-9" font-family="Georgia,serif" font-size="16" text-anchor="middle" fill="{N}">A</text><text x="49" y="-9" font-family="Georgia,serif" font-size="16" text-anchor="middle" fill="{B}">B</text><text x="31" y="-40" font-family="Georgia,serif" font-size="16" text-anchor="middle" fill="{N}">C</text>'
    return g(h, x, y, s)

def pizarra(x, y, w=120, h=70):
    return n(f'M{x} {y}h{w}v{h}h-{w}z') + wash(f'M{x+4} {y+4}h{w-8}v{h-8}h-{w-8}z', W2) + n(f'M{x+w*0.3} {y+h}l-8 24M{x+w*0.7} {y+h}l8 24', 1.3)

def banco(x, y=170, s=1):
    h = n('M0 0v-16M60 0v-16M-4 -16h68M0 -22h60M2 -28h56M4 -16v-20M56 -16v-20', 1.4)
    return g(h, x, y, s)

def farola(x, y=170, h=110):
    return n(f'M{x} {y}V{y-h}c0-10 8-16 18-16') + bw(f'M{x+12} {y-h-16}h14l4 10h-22z', 1.3) + b(f'M{x+19} {y-h-4}l-8 14M{x+19} {y-h-4}v16M{x+19} {y-h-4}l8 14', 1.0)

def fuente(x, y=170, s=1):
    h = n('M-50 0c0-10 22-16 50-16s50 6 50 16M-50 0h100M0 -16v-24M-16 -40h32') + b('M0 -42c-4-16-20-18-24-2M0 -42c4-16 20-18 24-2M-24 -38c-4 6-6 14-6 22M24 -38c4 6 6 14 6 22', 1.3)
    return g(h, x, y, s)

def camion(x, y=170, s=1, carga=''):
    h = n('M0 -16v-44h80v44M80 -44h26l14 18v10M0 -16h120') + nw('M86 -40h16l10 12h-26z', 1.2) + circ(22, -12, 10, N, 1.5, '#fff') + circ(98, -12, 10, N, 1.5, '#fff') + circ(22, -12, 4, B, 1.2) + circ(98, -12, 4, B, 1.2) + carga
    return g(h, x, y, s)

def servidor(x, y=170, s=1, k=4):
    h = ''
    for i in range(k):
        yy = -i * 22 - 20
        h += n(f'M0 {yy}h60v20h-60z', 1.4) + circ(10, yy + 10, 2.5, B, 1.2, W) + n(f'M24 {yy+10}h28', 1.1)
    return g(h, x, y, s)

def maquina_coser(x, y=170, s=1):
    h = n('M0 0h110M10 0v-60c0-8 6-12 14-12h70c8 0 12 6 12 12v24h-60v36') + n('M96 -36v20M90 -16h12', 1.3) + bcirc(30, -50, 8, 1.2) + b('M96 -16c0 10 10 14 14 16', 1.1)
    return g(h, x, y, s)

def madeja(x, y, r=26):
    s = bcirc(x, y, r, 1.5)
    for k in range(4): s += b(f'M{x-r*0.9:.1f} {y-r*0.3+k*8:.1f}c{r*0.6:.1f} -{r*0.5:.1f} {r*1.2:.1f} -{r*0.5:.1f} {r*1.8:.1f} 0', 1.0)
    s += n(f'M{x+r} {y+r*0.4:.1f}c20 0 30 10 40 24', 1.3)
    return s

def algodon(x, y=170, s=1):
    h = n('M0 0c0-30-2-60 4-90M2 -50c-14-6-20-16-20-26M3 -64c12-4 18-12 18-22')
    for (cx, cy) in ((-20, -84), (4, -96), (22, -92)):
        h += circ(cx - 6, cy, 8, N, 1.2, '#fff') + circ(cx + 6, cy, 8, N, 1.2, '#fff') + circ(cx, cy - 7, 8, N, 1.2, '#fff')
    h += bw('M-10 -8c-10-4-16-12-14-20c8 0 14 8 14 20z', 1.1)
    return g(h, x, y, s)

def perchero(x, y=170, w=160, prendas=4):
    s = n(f'M{x} {y}v-120h{w}v120M{x-10} {y}h20M{x+w-10} {y}h20', 1.4)
    for i in range(prendas):
        cx = x + 24 + i * (w - 48) / max(1, prendas - 1)
        s += n(f'M{cx} {y-120}v6l-14 8h28z', 1.1)
        d = f'M{cx-14} {y-106}l-6 6 4 8 4-2v40h24v-40l4 2 4-8-6-6c-2 4-6 6-10 6s-8-2-10-6z'
        s += bw(d, 1.2) if i % 2 == 0 else nw(d, 1.2)
    return s

def bolsa(x, y, s=1, contenido=''):
    h = bw('M-30 -40h60l6 60h-72z', 1.5) + n('M-14 -40c0-20 28-20 28 0', 1.4) + contenido
    return g(h, x, y, s)

def grua(x, y=170, h=130):
    s = n(f'M{x} {y}V{y-h}M{x+8} {y}V{y-h}M{x-40} {y-h+6}h150M{x-40} {y-h+14}h150M{x+4} {y-h}l-44 6M{x+4} {y-h}l106 6', 1.3)
    for i in range(1, int(h / 16)): s += n(f'M{x} {y-i*16}l8 -8', 0.9)
    s += n(f'M{x+90} {y-h+14}v40', 1.1) + bw(f'M{x+80} {y-h+54}h20v12h-20z', 1.1) + nw(f'M{x-40} {y-h+14}h18v14h-18z', 1.1)
    return s

def cristales(x, y=170, s=1):
    h = bw('M0 0l-12-40 12-20 12 20z', 1.4) + nw('M-20 0l-16-28 8-16 14 10z', 1.3) + nw('M20 0l14-24-6-16-14 12z', 1.3) + n('M0 -60v60M-12 -40h24', 1.0)
    return g(h, x, y, s)

def frasco(x, y, s=1):
    h = n('M-20 -30h40v54a6 6 0 0 1-6 6h-28a6 6 0 0 1-6-6z') + nw('M-24 -44h48v14h-48z', 1.4) + bw('M-20 -8h40v18h-40z', 1.1) + cruz_medica(0, 1, 0.26)
    return g(h, x, y, s)

def jeringa(x, y, s=1, rot=-35):
    h = n('M-50 -8h60v16h-60zM10 0h20M30 -4v8M-50 -14v28M-60 0h10M-70 -10v20') + bw('M-30 -8h40v16h-40z', 1.1)
    return g(h, x, y, s, rot)

def castillo(x, y=170, s=1):
    h = nw('M0 0v-60h12v8h10v-8h12v8h10v-8h12v60z', 1.4) + n('M-24 0v-80h10v8h8v-8h10v80M64 0v-80h10v8h8v-8h10v80', 1.4) + n('M20 0v-22a8 8 0 0 1 16 0v22', 1.3) + b('M-14 -80v-20l14 6-14 6', 1.2)
    return g(h, x, y, s)

def codigo(x, y, s=1):
    h = b('M-30 -20l-20 20 20 20M30 -20l20 20-20 20', 1.8) + n('M10 -28l-20 56', 1.6)
    return g(h, x, y, s)

def manzana(x, y, s=1, azul=True):
    h = (bw if azul else nw)('M0 -22c-10-8-30-6-30 12c0 18 14 30 22 30c4 0 6-2 8-2s4 2 8 2c8 0 22-12 22-30c0-18-20-20-30-12z', 1.5) + n('M0 -22c0-6 2-10 6-14', 1.3) + hoja(4, -30, 0.35, 20)
    return g(h, x, y, s)

def barca(x, y, s=1):
    h = n('M-50 0h100l-14 18h-72z') + n('M0 0v-56') + bw('M2 -54l30 46H2z', 1.2) + nw('M-2 -48l-26 40h26z', 1.2)
    return g(h, x, y, s)

def zanahoria(x, y, s=1, rot=30):
    h = bw('M-6 -20c4-2 8-2 12 0l-6 46z', 1.3) + n('M-4 -10h6M-2 2h4', 1.0) + n('M0 -20c-6-10-4-16 0-20M0 -20c2-10 8-14 12-14M0 -20c-4-8-10-10-14-8', 1.1)
    return g(h, x, y, s, rot)

def cuenco(x, y, s=1, contenido=''):
    h = contenido + nw('M-46 -10h92c0 26-20 40-46 40s-46-14-46-40z', 1.5) + n('M-20 30h40', 1.3)
    return g(h, x, y, s)

def lombriz(x, y, s=1):
    return g(b('M0 0c8-8 16 8 24 0s16 8 24 0 16 8 24 0', 3.2) + circ(72, -1, 1, N, 1, N), x, y, s)

def raices(x, y, s=1):
    return g(n('M0 0c-2 10-8 18-16 24M0 0c0 12 2 22 6 30M0 0c4 8 10 14 18 18M-8 14c-6 0-10 4-12 8M4 20c4 2 6 6 6 10', 1.1), x, y, s)

def prismaticos(x, y, s=1):
    h = bcirc(-14, 0, 12, 1.4) + bcirc(14, 0, 12, 1.4) + n('M-24 -6l4-20h12l2 14M24 -6l-4-20h-12l-2 14M-2 -14h4', 1.3)
    return g(h, x, y, s)

def pulso(x, y, w=120, col=B):
    return f'<path d="M{x} {y}h{w*0.3}l8-22 10 40 10-30 6 12h{w*0.3}" stroke="{col}" stroke-width="1.7"/>'

def hospital(x, y=170, w=110, h=80):
    s = n(f'M{x} {y}V{y-h}h{w}V{y}') + n(f'M{x+w/2-14} {y}v-26h28v26', 1.3)
    s += cruz_medica(x + w / 2, y - h + 22, 0.62)
    for i in range(2):
        for j in (0, 1):
            xx = x + 10 + j * (w - 38); yy = y - h + h * 0.48 + i * h * 0.24
            s += n(f'M{xx} {yy:.1f}h18v{h*0.14:.1f}h-18z', 1.1)
    return s

def escuela(x, y=170, w=120, h=60):
    s = n(f'M{x} {y}V{y-h}h{w}V{y}M{x+w/2-24} {y-h}l24-24 24 24') + bcirc(x + w / 2, y - h - 10, 7, 1.2) + n(f'M{x+w/2} {y-h-10}v-4l3 2', 1.0)
    s += n(f'M{x+w/2-10} {y}v-26h20v26', 1.3)
    for xx in [x + 8, x + w - 26] + ([x + 30, x + w - 48] if w >= 130 else []):
        s += bw(f'M{xx} {y-h+14}h18v14h-18z', 1.0)
    s += n(f'M{x+w/2} {y-h-34}v-14', 1.1) + b(f'M{x+w/2} {y-h-48}h12v8h-12', 1.1)
    return s

def puzzle(x, y, s=1):
    h = n('M0 0h20c0-8 12-8 12 0h20v20c-8 0-8 12 0 12v20H32c0 8-12 8-12 0H0V32c8 0 8-12 0-12z', 1.4) + bw('M56 0h20c0-8 12-8 12 0h20v52H56V32c8 0 8-12 0-12z', 1.4)
    return g(h, x, y, s)

def mochila(x, y, s=1):
    h = bw('M-24 -30c0-14 48-14 48 0v48a6 6 0 0 1-6 6h-36a6 6 0 0 1-6-6z', 1.5) + n('M-14 -36c0-10 28-10 28 0M-16 2h32v14h-32z', 1.3)
    return g(h, x, y, s)

def brazo_robot(x, y=170, s=1):
    h = n('M-20 0h40M-12 0v-14h24v14') + n('M0 -14l-20-50 50-30') + circ(0, -14, 5, N, 1.4, '#fff') + bcirc(-20, -64, 6, 1.3) + circ(30, -94, 5, N, 1.4, '#fff') + n('M30 -94l14 10M30 -94l18-2', 1.4)
    return g(h, x, y, s)

def herramientas_banco(x, y=170, s=1):
    h = n('M0 0v-40M120 0v-40M-6 -40h132M-6 -48h132v8') + llave_inglesa(30, -64, 0.5, -10) + n('M80 -48l8-30M76 -84h20v8h-20z', 1.3) + bw('M100 -48v-14h14v14z', 1.0)
    return g(h, x, y, s)

def compas(x, y, s=1):
    h = n('M0 -60v-8M0 -60l-26 64M0 -60l26 64M-14 -26h28') + circ(0, -60, 4, N, 1.3, '#fff')
    return g(h, x, y, s)

def ventana_abierta(x, y, s=1):
    h = n('M0 0h80v-90h-80zM40 0v-90') + nw('M40 -90l30 10v80l-30-0', 1.2) + b('M90 -60c10-4 20 4 30 0M90 -44c10-4 20 4 30 0M90 -28c10-4 20 4 30 0', 1.3)
    return g(h, x, y, s)

def radiador(x, y, s=1):
    h = ''
    for i in range(6): h += n(f'M{i*12} 0v-40a6 6 0 0 1 12 0v40', 1.2)
    h += n('M-4 0h80', 1.3)
    return g(h, x, y, s)

def flecha(x1, y1, x2, y2, col=B, w=1.5, curva=0):
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2 - curva
    a = math.atan2(y2 - my, x2 - mx)
    return (f'<path d="M{x1} {y1}Q{mx:.1f} {my:.1f} {x2} {y2}" stroke="{col}" stroke-width="{w}"/>'
            f'<path d="M{x2-9*math.cos(a-0.45):.1f} {y2-9*math.sin(a-0.45):.1f}L{x2} {y2}L{x2-9*math.cos(a+0.45):.1f} {y2-9*math.sin(a+0.45):.1f}" stroke="{col}" stroke-width="{w}"/>')

def mano_alzada(x, y, s=1, azul=False):
    """Mano levantada, palma de frente (votar, pedir, parar)."""
    d = 'M-14 30v-34c0-4-8-6-10-2l-6 10M-14 -4v-30c0-6 8-6 8 0v24M-6 -36v-8c0-6 8-6 8 0v34M2 -40c0-6 8-6 8 0v32M10 -34c0-6 8-6 8 0v40c0 16-8 24-18 24h-6'
    return g(b(d, 1.5) if azul else n(d, 1.4), x, y, s)

def texto(x, y, t, size=14, col=N, anchor='middle', peso='normal'):
    return f'<text x="{x}" y="{y}" font-family="Georgia,serif" font-size="{size}" font-weight="{peso}" text-anchor="{anchor}" fill="{col}">{t}</text>'
