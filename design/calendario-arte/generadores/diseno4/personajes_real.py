"""
personajes_real.py -- design 6 versions of the figures whose silhouette had to change for
them to read as real people (2026-11-16), not only their painting.

The evaluator's first verdict on design 6 was that repainting the inside of the old
silhouettes is not enough: limbs that are tubes with no elbow or knee, a body like a sack,
a lap twice as long as a thigh, hands like balls. These functions redraw those figures with
the same place, role and colours as design 5, so every element stays where it was:

  June   nino()               the boy sowing: one knee bent under his weight, the pelvis
                              marked, the throwing hand open
         abuelo_y_lampara()   the grandfather: his hands hold the lamp instead of floating
         mano_con_telefono()  the hand with the phone: tapering fingers with knuckles,
                              fanned a little, oval nails, a shorter thumb on the phone's edge,
                              a forearm with volume
  May    guitarrista()        hands that play: fingers curved over the frets, the other relaxed
         abuela()             a lap of real length with knees, hands holding the needles, the
                              knitting hanging from them
         nina()               the girl kneeling for real: sitting on her heels, thighs forward,
                              a curved back, the head over her hands and the clay
         hebra()              the knitting on the needles, row by row

They use figuras_real's painters, so call figuras_real.activar() first.
"""
import math

import numpy as np

import figuras_real as FR
from acuarela import Poligono, Elipse, Trazo, Circulos, bezier, arco, mezcla
from figuras_v3 import (cuello3, brazo3, pierna3, torso3, cabeza3, modelar, tono, sombra_piel, linea_de, golondrina,
                        telefono, _u, _v)

CORAL = '#e8735e'
TEAL = '#2f8f92'


def _f():
    """The painters as figuras_real.activar() left them (looked up at call time)."""
    import figuras_v3 as F
    return F


# ======================================================================== June

def abuelo_y_lampara(lz, BULBO, bombilla=True):
    """personajes_06.abuelo_y_lampara with hands that hold: the far hand curls round the
    lamp's foot, the near one closes on the brass column."""
    F = _f()
    luz = (0.85, -0.5)
    P1 = '#e2a882'
    PANT = '#4a5a8a'
    CHAQ = '#e39a48'
    F.pierna3(lz, (452, 566), (502, 574), (497, 652), 30, PANT, P1, luz, pie_ang=-8, zapato='#6e4c3c', pie_tam=40,
              semilla=11)
    F.pierna3(lz, (428, 572), (488, 590), (472, 672), 32, PANT, P1, luz, pie_ang=-4, zapato='#6e4c3c', pie_tam=42,
              semilla=12)
    F.brazo3(lz, (452, 484), (490, 528), (524, 548), 21, tono(CHAQ, '#7a3a2a', 0.12), P1, luz, 'larga',
             mano=dict(ang=14, gesto='relajada', lado=-1, tam=34), semilla=13)       # palm up under the lamp's foot
    F.cuello3(lz, (426, 440), 30, (430, 478), P1, luz, giro=0.55, inclina=10)
    f, g = F.torso3(lz, (396, 480), (460, 486), (408, 574), (454, 576), CHAQ, luz, cintura=0.97, escote='v',
                    pliegues=[[(418, 500), (426, 530), (424, 562)], [(448, 512), (452, 544)], [(404, 524), (410, 556)],
                              [(436, 558), (446, 570)], [(414, 566), (428, 572)]], semilla=14)
    m = g['m']
    camisa = Poligono([m + (-9, -4), m + (9, -2), m + (2, 26)], suave=False)
    FR.volumen(lz, camisa, '#dce8ee', luz, dens=0.75, prof=0.4, linea=False, duro=0.5)
    lz.lapiz([[m + (-9, -4), m + (-2, 8), m + (2, 26)], [m + (9, -2), m + (4, 8), m + (2, 26)]], '#7a8a9a', grosor=0.5,
             presion=0.45)
    lz.lapiz([[m + (2, 26), m + (6, 92)]], linea_de(CHAQ, 0.5), grosor=0.55, presion=0.45)
    for k, y in enumerate((512, 532, 552)):
        x = m[0] + 4 + (y - m[1] - 26) * 0.06 + 3
        lz.aguada(Elipse(x, y, 2.4), '#7a3a22', dens=0.85, tapa=1, irreg=0.1)
        lz.gouache(Elipse(x - 0.6, y - 0.7, 0.7), '#f6d6b0', alfa=0.7, irreg=0)
    lz.lapiz([[(440, 506), (452, 507), (451, 517)]], linea_de(CHAQ, 0.5), grosor=0.45, presion=0.4)
    F.cabeza3(lz, 426, 440, 30, P1, '#d8d2ca', 'calvo', luz, giro=0.55, inclina=10, edad='mayor', ojos='abiertos',
              boca='sonrisa', mira=(0.8, 0.9), gafas=True, iris='#6a5a4a', semilla=15)
    # the lamp, as before
    pie_lamp = Poligono(np.vstack([arco(512, 562, 30, 9, 180, 360, 20), arco(512, 562, 30, 16, 0, 180, 20)]), suave=False)
    F.modelar(lz, pie_lamp, '#a8683a', luz, dens=0.85, prof=0.4, rayar=True, grosor=0.7, semilla=16,
              toques=[(498, 556, 12, '#d9a06a', 0.6)])
    lz.lapiz([arco(512, 562, 30, 9, 0, 360, 30), arco(512, 562, 20, 6, 200, 340, 20)], '#5e3a22', grosor=0.55,
             presion=0.45)
    col_l = Trazo([(514, 556), (518, 528), (524, 506)], (8, 7, 7))
    F.modelar(lz, col_l, '#d9a441', luz, dens=0.85, prof=0.4, rayar=False, grosor=0.6, brillo=0.3)
    lz.lapiz([[(512, 540), (520, 540)], [(514, 548), (521, 548)]], '#9a6a22', grosor=0.55, presion=0.45)
    rc, tc = np.array([506.0, 486.0]), np.array([480.0, 456.0])
    ax_ = tc - rc
    nn_ = np.array([ax_[1], -ax_[0]]) / np.linalg.norm(ax_)
    pantalla = Poligono([rc + nn_ * 25, tc + nn_ * 13, tc - nn_ * 13, rc - nn_ * 25], suave=False)
    F.modelar(lz, pantalla, CORAL, luz, dens=0.82, prof=0.38, grosor=0.7, semilla=17)
    borde_p = np.array([rc + nn_ * 25 * c for c in np.linspace(1, -1, 12)])
    lz.lapiz([[q, q + ax_ / np.linalg.norm(ax_) * -6 + np.array([1.5, 3])] for q in borde_p], '#b8503a', grosor=0.6,
             presion=0.6)
    lz.lapiz([[rc + nn_ * 5, (518, 506)]], '#7a4a22', grosor=1.0, presion=0.7)
    casq = Poligono([(518, 506), (532, 500), (536, 512), (524, 518)])
    F.modelar(lz, casq, '#9a9a8a', luz, dens=0.8, prof=0.35, rayar=False, grosor=0.6)
    lz.lapiz([[(521, 508), (533, 503)], [(523, 512), (534, 507)]], '#5a5a52', grosor=0.5, presion=0.5)
    # near arm: the hand closes round the brass column, four fingers in front, the thumb behind
    F.brazo3(lz, (400, 490), (434, 546), (500, 548), 23, CHAQ, P1, luz, 'larga', semilla=18)
    FR.mano_agarre(lz, (502, 547), (517, 533), -79, 7.5, 34, P1, luz, nudillos=-1)
    # the warm light of the bulb on the hands and the cheek turned to it (gently: it must not bleach them)
    lz.luz((516, 540, 22), '#ffe2a0', fuerza=0.12)
    lz.luz((446, 446, 16), '#ffe2a0', fuerza=0.12)


def nina06(lz):
    """personajes_06.nina seated for real: her thighs come forward under the dress, which
    rests on two knees with a V fold between them; calves fuller under the knee, a visible
    ankle, shoes with soles; the bulb warms the side of her face turned to it."""
    F = _f()
    luz = (-0.8, -0.55)
    P2 = '#9b6141'
    TEAL6 = '#2f8f92'
    F.pierna3(lz, (612, 568), (566, 574), (556, 628), 25, None, P2, luz, pie_ang=160, zapato=CORAL, pie_tam=31, semilla=21)
    F.pierna3(lz, (626, 572), (582, 584), (580, 636), 25, None, P2, luz, pie_ang=188, zapato=CORAL, pie_tam=31, semilla=22)
    falda = Poligono([(598, 518), (636, 518), (652, 560), (644, 584), (614, 594), (594, 594), (586, 596), (576, 593),
                      (568, 590), (556, 586), (550, 576), (554, 562), (578, 552)])
    F.modelar(lz, falda, TEAL6, luz, dens=0.82, prof=0.42, grosor=0.8, semilla=23)
    lz.lapiz([bezier((604, 524), (598, 552), (590, 592)), bezier((622, 526), (628, 556), (632, 586)),
              bezier((588, 594), (592, 578), (604, 560))], linea_de(TEAL6, 0.5), grosor=0.5, presion=0.4, temblor=0.2,
             puntas=0.45)
    lz.lapiz([arco(565, 582, 11, 7, 200, 340, 10), arco(582, 590, 10, 6, 200, 340, 10)], linea_de(TEAL6, 0.5),
             grosor=0.5, presion=0.42)                                       # the two knees under the cloth
    for (x, y) in ((588, 548), (612, 562), (628, 540), (602, 578), (572, 572), (636, 572), (620, 584), (580, 560)):
        lz.gouache(Elipse(x, y, 1.9), '#fff3cf', alfa=0.9, irreg=0)
    F.brazo3(lz, (634, 482), (650, 524), (648, 560), 16, '#f2c04a', P2, luz, 'corta',
             mano=dict(ang=95, gesto='relajada', lado=1, tam=27), semilla=24)
    F.cuello3(lz, (618, 436), 25, (616, 476), P2, luz, giro=-0.5, inclina=-14)
    F.torso3(lz, (592, 478), (640, 480), (598, 526), (634, 528), '#f2c04a', luz, cintura=0.95, semilla=25)
    lz.lapiz([bezier((604, 478), (616, 488), (630, 479), n=12)], linea_de('#f2c04a', 0.55), grosor=0.55, presion=0.45)
    pechera = Poligono([(597, 528), (602, 497), (631, 499), (636, 530)], suave=False)
    F.modelar(lz, pechera, TEAL6, luz, dens=0.84, prof=0.4, grosor=0.75, semilla=28)
    for (a_, b_) in (((600, 478), (604, 499)), ((633, 480), (629, 501))):
        tir = Trazo([a_, b_], (5.0, 5.5))
        F.modelar(lz, tir, TEAL6, luz, dens=0.86, prof=0.3, rayar=False, grosor=0.6)
        lz.aguada(Elipse(*b_, 1.6), '#f6e2b0', dens=0.9, tapa=1, irreg=0.1)
    lz.lapiz([[(599, 512), (634, 514)]], linea_de(TEAL6, 0.5), grosor=0.42, presion=0.32, temblor=0.2)
    lz.lapiz([bezier((596, 528), (616, 532), (637, 530), n=12)], linea_de(TEAL6, 0.6), grosor=0.65, presion=0.5)
    F.cabeza3(lz, 618, 434, 25, P2, '#2a1a14', 'afro', luz, giro=-0.5, inclina=-8, edad='nino', ojos='abiertos',
              boca='sonrisa', mira=(-0.9, 0.6), pendiente='#f2b630', iris='#4a2a1c', semilla=26)
    # the bulb's warm light: an edge on her left cheek and temple, not a haze over the face
    lz.luz(Trazo([(600, 424), (598, 438), (600, 452)], (3.5, 4.5, 3.0)), '#fad6a0', fuerza=0.34, suave=1.6)
    F.brazo3(lz, (596, 486), (574, 530), (556, 498), 16, '#f2c04a', P2, luz, 'corta',
             mano=dict(ang=-152, gesto='abierta', abre=0.6, lado=1, tam=30), semilla=27)


def nino(lz):
    """personajes_06.nino with weight in the pose: the front knee bends over its foot, the
    back leg bends a little on tiptoe, the pelvis shows under the T-shirt, and the
    throwing hand opens wide."""
    F = _f()
    luz = (0.6, -0.8)
    P3 = '#c98a5e'
    CAM = '#e8735e'
    VAQ = '#3f6fb0'
    F.brazo3(lz, (852, 306), (826, 322), (800, 316), 13, CAM, P3, luz, 'corta',
             mano=dict(ang=185, gesto='abierta', lado=1, tam=22), semilla=31)
    F.pierna3(lz, (842, 368), (824, 400), (806, 432), 20, VAQ, P3, luz, pie_ang=48, zapato='#e8b53e', pie_tam=26,
              semilla=32)
    F.pierna3(lz, (860, 366), (882, 400), (888, 432), 20, VAQ, P3, luz, pie_ang=4, zapato='#e8b53e', pie_tam=28,
              semilla=33)
    # the jeans' seat and waistband: a pelvis between the legs and the shirt
    pelvis = Poligono([(838, 356), (866, 354), (867, 366), (858, 374), (848, 374), (838, 366)])
    FR.volumen(lz, pelvis, VAQ, luz, dens=0.82, prof=0.45, espesor=4, rayar=True, linea=False, grosor=0.3, presion=0.25)
    lz.lapiz([bezier((849, 374), (852, 368), (853, 360), n=8)], linea_de(VAQ, 0.5), grosor=0.32, presion=0.3)
    F.cuello3(lz, (872, 268), 20, (868, 300), P3, luz, giro=0.5, inclina=10)
    F.torso3(lz, (850, 304), (890, 298), (838, 364), (868, 360), CAM, luz, cintura=0.92,
             pliegues=[[(858, 318), (854, 352)], [(874, 314), (866, 346)], [(848, 336), (844, 360)],
                       [(878, 330), (870, 356)]], semilla=34)
    lz.lapiz([bezier((838, 360), (852, 366), (868, 358), n=10)], linea_de(CAM, 0.5), grosor=0.5, presion=0.4)
    F.cabeza3(lz, 872, 268, 20, P3, '#3a2620', 'corto', luz, giro=0.5, inclina=3, edad='nino', ojos='abiertos',
              boca='abierta', mira=(1.0, -1.6), semilla=35)
    F.brazo3(lz, (888, 302), (914, 276), (940, 246), 13, CAM, P3, luz, 'corta',
             mano=dict(ang=-55, gesto='abierta', abre=1.4, lado=-1, tam=24), semilla=36)


def mano_con_telefono(lz, capas=None):
    """personajes_06.mano_con_telefono with a real hand: a forearm with volume and its lower
    edge dark against the light; four fingers that taper to the tip, bulge at the knuckle,
    fan out a little and carry oval nails half the length of the last joint; a thumb a third
    shorter, resting on the phone's left edge."""
    F = _f()
    luz = (0.6, -0.8)
    piel = '#a86a46'
    C = np.array([176.0, 534.0])
    W, H, ANG = 62.0, 116.0, 10.0
    a = math.radians(ANG)
    X = np.array([math.cos(a), math.sin(a)])
    Y = np.array([-math.sin(a), math.cos(a)])
    P = lambda u, v: C + X * u + Y * v
    sp = sombra_piel(piel)
    lp = linea_de(piel, 0.6)
    muneca = P(-22, 82)
    codo = np.array([-30.0, 700.0])
    antebrazo = Trazo([codo, (codo + muneca) / 2 + (0, 4), muneca], (62, 48, 30), suave=True)
    FR.volumen(lz, antebrazo, piel, luz, dens=0.62, prof=0.55, sombra=sp, espesor=20, linea=True, grosor=0.4,
               presion=0.3, duro=0.5, gran=0.4)
    palma = Poligono([P(-28, 4), P(-42, 18), P(-48, 38), P(-44, 58), P(-34, 72), P(-22, 82), P(-4, 84), P(14, 78),
                      P(26, 64), P(30, 30)])
    FR.volumen(lz, palma, piel, luz, dens=0.62, prof=0.45, sombra=sp, espesor=14, grosor=0.4, presion=0.3, duro=0.5)
    lz.aguada(Elipse(*P(-36, 52), 11, 18, ANG + 20) & palma, tono(piel, '#f2c8a8', 0.25), dens=0.25, suave=4)
    lz.lapiz([list(bezier(P(-28, 34), P(-24, 56), P(-12, 74), n=12))], lp, grosor=0.45, presion=0.36, temblor=0.1)
    lz.lapiz([list(bezier(P(-36, 78), P(-20, 86), P(-2, 85), n=10))], lp, grosor=0.4, presion=0.3, temblor=0.1)
    pant, S = telefono(lz, C[0], C[1], W, H, ANG, luz, semilla=43)
    lz.aguada(Poligono([P(-31, 58), P(31, 58), P(30, 67), P(-28, 67)]) & palma, sp, dens=0.35, suave=2)
    # four fingers round the right edge, index on top, fanned 5-10 degrees apart; the little finger shorter
    # (centre v at the knuckle, width, where the tip reaches, the knuckle, how far the tip drifts)
    dedos = ((-36, 13.0, 20.5, 43, -4.5), (-20, 13.4, 15.0, 45, -1.5), (-4.5, 12.6, 19.5, 43, 1.8), (12, 10.2, 27.5, 39, 5.5))
    for k, (v, wd, tip, nud, deriva) in list(enumerate(dedos))[::-1]:
        base, borde, punta = P(nud, v + 1.5), P(33, v + deriva * 0.3), P(tip, v + deriva)
        dedo = Trazo([base, borde, punta], (wd * 1.02, wd * 0.9, wd * 0.72)) | Elipse(*P(nud - 1.5, v + 1.2), wd * 0.56)
        lz.aguada(Trazo([P(33, v + 3 + deriva * 0.3), P(tip - 2, v + deriva + 3)], (wd * 0.8, wd * 0.6)) & pant, '#1a1c24',
                  dens=0.3, suave=2)
        FR.volumen(lz, dedo, piel, luz, dens=0.64, prof=0.48, sombra=sp, espesor=wd * 0.5, grosor=0.42, presion=0.32,
                   duro=0.5, semilla=44 + k)
        # the joint where the finger turns over the edge, and the knuckle's crease
        lz.lapiz([list(bezier(P(34, v + deriva * 0.3 - wd * 0.36), P(32.5, v + deriva * 0.3),
                              P(34, v + deriva * 0.3 + wd * 0.36), n=6))], lp, grosor=0.38, presion=0.38)
        lz.lapiz([list(bezier(P(nud - 4, v - wd * 0.28), P(nud - 2, v + 1), P(nud - 4, v + wd * 0.32), n=6))], lp,
                 grosor=0.36, presion=0.3)
        # the nail: an oval half the length of the last joint, on the glass
        largo = abs(33 - tip) * 0.5
        nc = (np.asarray(punta) + np.asarray(P(tip + largo * 0.55, v + deriva))) / 2
        una = Elipse(nc[0], nc[1], largo * 0.5, wd * 0.26, ANG + math.degrees(math.atan2(deriva * 0.7, -(33 - tip))) + 180)
        lz.aguada(una, tono(piel, '#f2d4c8', 0.55), dens=0.7, tapa=1, irreg=0.1)
        lz.lapiz([arco(nc[0], nc[1], largo * 0.5, wd * 0.26, 60, 300, 12, ANG)], lp, grosor=0.32, presion=0.4)
        lz.gouache(Elipse(nc[0] - 0.8, nc[1] - wd * 0.08, largo * 0.22, wd * 0.05, ANG), '#ffffff', alfa=0.4, irreg=0)
    # the thumb, a third shorter, rests on the lower left edge of the phone
    ruta = [P(-44, 50), P(-37, 37), P(-31, 29), P(-26, 24)]
    pulgar = Trazo(ruta, (20, 17.5, 14.5, 11.5))
    lz.aguada(Trazo([np.asarray(q) + (-3.0, 3.5) for q in ruta[1:]], (15, 12, 9)) & pant, '#1a1c24', dens=0.3,
              suave=2.5)
    FR.volumen(lz, pulgar, piel, luz, dens=0.64, prof=0.48, sombra=sp, espesor=8, grosor=0.42, presion=0.32, duro=0.5)
    dirp = _u(np.asarray(ruta[-1]) - np.asarray(ruta[-2]))
    angp = math.degrees(math.atan2(dirp[1], dirp[0]))
    nc = np.asarray(ruta[-1]) - dirp * 3.0
    lz.aguada(Elipse(nc[0], nc[1], 4.0, 3.6, angp), tono(piel, '#f2d4c8', 0.55), dens=0.7, tapa=1, irreg=0.1)
    lz.lapiz([arco(nc[0], nc[1], 4.0, 3.6, 110, 250, 12, angp)], lp, grosor=0.36, presion=0.42)
    q = np.asarray(P(-36, 37))
    nrm = np.array([-dirp[1], dirp[0]])
    lz.lapiz([list(bezier(q - nrm * 6, q + dirp * 1.5, q + nrm * 6, n=8))], lp, grosor=0.42, presion=0.38)
    if capas is not None:
        capas.empieza('golondrina', 'La golondrina')
    salida = S(0.42, 0.3)
    ave = np.array([266.0, 438.0])
    estela = bezier(salida, salida + np.array([12, -26]), ave - np.array([42, -20]), ave - np.array([20, -10]), 40)
    for i in range(0, 38, 2):
        q = estela[i]
        t = i / 38
        rr = 2.5 + 7 * math.sin(math.pi * min(1, t * 0.95))
        lz.aguada(Elipse(q[0], q[1] + 1.8, rr * 1.4, rr * 0.7, -24), '#b4c8da', dens=0.28 * (1 - t * 0.5), suave=2.5)
        lz.gouache(Elipse(q[0] - 0.6, q[1] - 0.8, rr * 1.15, rr * 0.5, -24), '#fbf8f2', alfa=0.7 * (1 - t * 0.6), irreg=0.3)
    golondrina(lz, ave[0], ave[1], 84, ang=-28, semilla=49)


# ======================================================================== May

def _p5():
    import piezas_05 as P5
    return P5


def guitarrista(sombra=True):
    """piezas_05.guitarrista with hands that play: the right hand relaxed over the sound
    hole, the left with its fingers curved over the frets."""
    P5 = _p5()
    lz, Rg, SEP = P5.lz, P5.Rg, P5.SEP
    if sombra:
        P5.sombra_suelo(205, 508, 85)
    for (x0, y0, x1, y1) in ((150, 428, 146, 506), (226, 432, 230, 506), (160, 420, 156, 330)):
        f = Trazo([(x0, y0), (x1, y1)], (5, 4.5), suave=False)
        FR.volumen(lz, f, '#9a6a4a', FR._LUZ_ESCENA[0], dens=0.75, prof=0.45, linea=False, duro=0.5)
    asiento = Poligono([(142, 420), (226, 416), (238, 432), (152, 438)], suave=False)
    lz.aguada(asiento, '#d9b06a', dens=0.7, tapa=1, irreg=0.3)
    lz.rayado(asiento, '#9a7238', angulo=80, sep=3, presion=0.35)
    lz.contorno(asiento, SEP, grosor=0.8, presion=0.5)
    J = dict(cabeza=(196, 290, 25), hi=(164, 326), hd=(216, 322), ci=(170, 412), cd=(210, 414),
             pierna_i=[(178, 416), (238, 424), (234, 500)], pierna_d=[(200, 418), (262, 412), (272, 486)],
             pie_i=8, pie_d=-30)
    P5.figura(lz, J, dict(camisa='#f3e6cf', pantalon='#3e4f86', piel='piel2', zapato='#5e3f30', cuello=0.6,
                          pliegues=True),
              cara=dict(peinado='corto', pelo='#cfc6bc', canas=True, barba='#e3dcd2', giro=0.5, inclina=24,
                        ojos='abajo', boca='canta'))
    FR.volumen(lz, Poligono([(166, 330), (184, 336), (188, 400), (174, 412), (168, 410)]), '#7a3f6e', FR._LUZ_ESCENA[0],
               dens=0.85, prof=0.45, rayar=True, grosor=0.3, presion=0.25)
    for k in range(3):
        lz.lapiz([arco(292, 470 - k * 2, 8 + k * 6, 6 + k * 4, 250, 330, 8)], SEP, grosor=0.6, presion=0.45 - k * 0.1)
    mastil = Trazo([Rg(26, 0), Rg(124, 0)], (9, 7.5), suave=False)
    lz.aguada(mastil, '#7a4a2c', dens=0.8, tapa=1, irreg=0.15)
    lz.contorno(mastil, SEP, grosor=0.7, presion=0.55)
    lz.lapiz([[Rg(40 + 14 * k, -4), Rg(40 + 14 * k, 4)] for k in range(6)], '#d9c09a', grosor=0.5, presion=0.6)
    clav = Poligono([Rg(124, -6), Rg(146, -8), Rg(148, 8), Rg(124, 6)], suave=False)
    lz.aguada(clav, '#5e3f30', dens=0.85, tapa=1, irreg=0.1)
    lz.lapiz([[Rg(130 + 6 * k, -9), Rg(130 + 6 * k, -13)] for k in range(3)], SEP, grosor=1.0, presion=0.7)
    cuerpo_g = Circulos([(*Rg(-12, 0), 31), (*Rg(22, 0), 24)])
    FR.volumen(lz, cuerpo_g, '#e0a24e', FR._LUZ_ESCENA[0], dens=0.75, prof=0.45, rayar=True, duro=0.5,
               toques=[(*Rg(-20, 14), 24, '#b8692e', 0.6)])
    lz.aguada(Elipse(*Rg(12, 0), 8.5), '#3e2a24', dens=1.0, irreg=0.1, tapa=1)
    lz.lapiz([arco(*Rg(12, 0), 11, 11, 0, 360, 24)], '#8a5a2a', grosor=0.6, presion=0.5)
    lz.lapiz([[Rg(-30, -7), Rg(-30, 7)]], '#8a5a2a', grosor=1.2, presion=0.6)
    lz.lapiz([[Rg(-30, k), Rg(124, k)] for k in (-3, -1, 1, 3)], '#fbf1dc', grosor=0.45, presion=0.7, temblor=0.03)
    brazo1 = [(168, 334), (150, 380), Rg(-8, -6)]
    brazo2 = [(214, 330), (230, 378), Rg(78, 5)]
    for br in (brazo1, brazo2):
        P5.sombra_bajo(lz, br, (15, 13, 12), '#6a5a4a', dens=0.2)
        P5.extremidad(lz, br, (15, 13, 12), '#f3e6cf', dens=0.8, pliegues=True)
    FR.mano_real(lz, *Rg(-8, -6), 40, 28, 'piel2', 'relajada', lado=1, luz=FR._LUZ_ESCENA[0])
    # the left hand: the fingers come over the top of the neck and press on the frets, the thumb behind
    eje = math.degrees(math.atan2(*(np.asarray(Rg(1, 0)) - np.asarray(Rg(0, 0)))[::-1]))
    FR.mano_agarre(lz, Rg(78, 9), Rg(82, 0), eje, 8.5, 28, 'piel2', FR._LUZ_ESCENA[0], nudillos=-1, dorso=False)


def abuela(sombra=True):
    """piezas_05.abuela with a lap of real length: knees where the thighs end, the skirt
    falling straight from them; hands holding the needles between thumb and finger; the
    head bent to the work."""
    P5 = _p5()
    lz, SEP, TEAL5, ORO = P5.lz, P5.SEP, P5.TEAL, P5.ORO
    luz = FR._LUZ_ESCENA[0]
    if sombra:
        P5.sombra_suelo(330, 826, 100)
    taburete = Poligono([(250, 748), (332, 748), (328, 762), (254, 762)], suave=False)
    for x0 in (258, 324):
        f = Trazo([(x0, 760), (x0 + (6 if x0 > 290 else -6), 818)], (6, 5), suave=False)
        FR.volumen(lz, f, '#9a6a4a', luz, dens=0.75, prof=0.45, linea=False, duro=0.5)
    FR.volumen(lz, taburete, '#b8845a', luz, dens=0.75, prof=0.4, rayar=True, grosor=0.4, presion=0.3)
    J = dict(cabeza=(298, 614, 29), hi=(268, 660), hd=(326, 664), ci=(272, 746), cd=(320, 748),
             pierna_i=[(282, 748), (338, 760), (336, 818)], pierna_d=[(308, 752), (360, 768), (362, 822)],
             pie_i=0, pie_d=0)
    P5.figura(lz, J, dict(camisa='#8d73b0', falda='#5f8f8a', piel='piel1', zapato='#6e4c3c', cuello=0.55, pliegues=True,
                          falda_bajo=[(328, 818), (372, 820), (374, 790), (366, 764)]),
              cara=dict(peinado='mono', pelo='#d8d2cc', canas=True, giro=0.45, inclina=20, ojos='abajo', boca='sonrisa'))
    # her skirt, painted over the old one: the thighs come toward us to two knees, the cloth pulled taut over
    # them, then falling straight to her ankles in folds
    falda = (Poligono([(266, 740), (322, 742), (346, 750), (364, 754), (380, 762), (386, 774), (386, 792), (388, 805),
                       (362, 808), (334, 807), (330, 792), (318, 772), (282, 766), (264, 758)]) |
             Elipse(356, 760, 11, 8) | Elipse(376, 766, 11, 8))
    FR.volumen(lz, falda, '#6c9a95', luz, dens=0.66, prof=0.45, espesor=14, rayar=True, proyecta=2.0, grosor=0.36,
               presion=0.28)
    lz.levanta(Elipse(352, 756, 7, 4, -25), cantidad=0.2, suave=1.2)                       # the knees, lit from the left
    lz.levanta(Elipse(372, 762, 7, 4, -25), cantidad=0.2, suave=1.2)
    lz.lapiz([bezier((358, 770), (356, 790), (352, 805)), bezier((377, 776), (380, 792), (380, 805)),
              bezier((366, 768), (367, 780), (366, 794)), bezier((340, 774), (338, 792), (338, 805))], '#3a5a58',
             grosor=0.42, presion=0.3, temblor=0.15)
    for (x_, y_) in ((348, 812), (376, 813)):
        lz.aguada(Elipse(x_ + 9, y_ + 1.5, 13, 2.6), '#5a4a80', dens=0.35, suave=1.5)          # shadow, away from the sun
        FR.volumen(lz, Poligono([(x_ - 9, y_ + 3), (x_ - 7, y_ - 3), (x_ + 4, y_ - 4), (x_ + 10, y_ + 1), (x_ + 8, y_ + 4)]),
                   '#6e4c3c', luz, dens=0.88, prof=0.45, linea=True, grosor=0.3, presion=0.3, duro=0.5)
    for brazo, col in (([(272, 668), (300, 718), (362, 714)], '#8d73b0'), ([(324, 672), (350, 724), (392, 722)], '#8d73b0')):
        P5.sombra_bajo(lz, brazo, (18, 15, 13), '#3a2a5a', dens=0.22)
        P5.extremidad(lz, brazo, (18, 15, 13), col, dens=0.84, pliegues=True)
    # two short needles in pale wood, coming out of her fingers
    for (a_, b_) in (((356, 702), (398, 724)), ((410, 700), (382, 732))):
        lz.lapiz([[a_, b_]], '#c8a476', grosor=1.0, presion=0.85, temblor=0.02)
        lz.lapiz([[(a_[0], a_[1] - 0.5), (b_[0], b_[1] - 0.5)]], '#f6e6c8', grosor=0.35, presion=0.7)
    FR.mano_real(lz, 360, 714, -24, 33, 'piel1', 'pinza', lado=1, luz=luz)
    FR.mano_real(lz, 394, 724, 200, 33, 'piel1', 'relajada', lado=-1, luz=luz)
    cesta = Poligono([(196, 784), (256, 784), (250, 824), (202, 824)])
    FR.volumen(lz, cesta, '#c99a5a', luz, dens=0.7, prof=0.4, linea=False, duro=0.5)
    lz.rayado(cesta, '#8a6a3a', angulo=0, sep=4, presion=0.4)
    lz.contorno(cesta, SEP, grosor=0.8, presion=0.5)
    for (bx, by, c) in ((212, 778, TEAL5), (236, 776, ORO), (224, 768, '#5f86c0')):
        FR.volumen(lz, Elipse(bx, by, 12, 11), c, luz, dens=0.8, prof=0.45, linea=False, duro=0.5)
        lz.lapiz([arco(bx, by, 10, 8, 200 + k * 20, 330 + k * 20, 10) for k in range(3)], FR._osc(c, 0.55), grosor=0.45,
                 presion=0.4)
    lz.lapiz([bezier((224, 768), (280, 760), (330, 770), (370, 716))], '#5f86c0', grosor=1.0, presion=0.75)


def hebra(inicio, agujas=None):
    """piezas_05.hebra with the knitting as knitted cloth: hanging from the needles, row
    under row of stitches, its lower edge uneven where it is still being made."""
    P5 = _p5()
    lz, TEAL5, ORO = P5.lz, P5.TEAL, P5.ORO
    AGUJAS = np.array([392.0, 712.0]) if agujas is None else np.asarray(agujas, float)
    inicio = np.asarray(inicio, float)
    h = bezier(AGUJAS + (16, 14), AGUJAS + (44, 60), inicio + (-34, 70), inicio + (-2, 6), 40)
    lz.lapiz([h], '#4f7fb0', grosor=1.2, presion=0.85, temblor=0.5)
    rngf = np.random.default_rng(8)
    for k in range(5):
        a_ = math.radians(rngf.uniform(110, 250))
        L = rngf.uniform(6, 13)
        lz.lapiz([bezier(inicio, inicio + (math.cos(a_) * L * 0.5, math.sin(a_) * L * 0.5 + 3),
                         inicio + (math.cos(a_) * L, math.sin(a_) * L))], rngf.choice([TEAL5, '#5f86c0', ORO]),
                 grosor=0.6, presion=0.6, temblor=0.4)
    A0 = AGUJAS + (-18, -8)
    A1 = AGUJAS + (16, 4)
    abajo = [A1 + (2, 20), AGUJAS + (6, 24), AGUJAS + (-6, 21), A0 + (-1, 17)]
    tela = Poligono([A0, A1] + abajo)
    FR.volumen(lz, tela, '#5f86c0', FR._LUZ_ESCENA[0], dens=0.82, prof=0.45, linea=True, grosor=0.3, presion=0.28,
               duro=0.5)
    pts = []
    for fila in range(4):
        t = (fila + 0.6) / 4.6
        izq = A0 + (abajo[-1] - A0) * t
        der = A1 + (abajo[0] - A1) * t
        for k in range(7):
            c = izq + (der - izq) * (k + 0.5) / 7
            pts.append([tuple(c + (-1.4, -1.6)), tuple(c + (0, 1.2)), tuple(c + (1.4, -1.6))])
    lz.lapiz(pts, '#2a3a6a', grosor=0.32, presion=0.4, temblor=0.05)


def nina(sombra=True):
    """The girl kneeling for real: sitting back on her heels in three-quarter view, thighs
    forward to the knees, a curved back, the neck out of the top of her shoulders, the head
    bent over her hands and the clay bud; the red shoes are her feet behind, heels up."""
    P5 = _p5()
    lz, BARRO, CORAL = P5.lz, P5.BARRO, P5.CORAL
    ORO = FR._hex(mezcla(P5.ORO, '#b0a088', 0.18))           # a little less saturated than the old flat yellow
    luz = FR._LUZ_ESCENA[0]
    piel = 'piel4'
    if sombra:
        P5.sombra_suelo(966, 816, 70)
    # her feet behind her, soles and heels toward us, in red shoes
    for (x, y, a_) in ((990, 808, -8), (1004, 802, -16)):
        zap = Poligono([(x - 9, y + 3), (x - 6, y - 4), (x + 4, y - 6), (x + 10, y - 2), (x + 9, y + 4), (x, y + 6)])
        FR.volumen(lz, zap, '#c33c4e', luz, dens=0.88, prof=0.45, grosor=0.35, presion=0.3, duro=0.5)
        lz.lapiz([[(x + 6, y - 4), (x + 8, y + 3)]], '#6a1f30', grosor=0.5, presion=0.45)          # the heel
    # shins folded under her, along the ground from the knees back to the feet
    for (k0, a0) in (((926, 808), (986, 806)), ((938, 804), (998, 800))):
        FR.volumen(lz, Trazo([k0, ((k0[0] + a0[0]) / 2, (k0[1] + a0[1]) / 2 + 1), a0], (11, 10, 7)), piel, luz, dens=0.62,
                   prof=0.45, sombra=sombra_piel(FR._hex(piel)), linea=True, grosor=0.3, presion=0.25, duro=0.4)
    # the far arm, behind the body
    P5.extremidad(lz, [(966, 730), (970, 766), (940, 769)], (11, 10, 9), ORO, dens=0.85, pliegues=True)
    # the dress: a curved back, the skirt over the thighs to the knees
    vestido = Poligono([(936, 722), (950, 716), (966, 720), (976, 734), (982, 756), (986, 780), (982, 798), (960, 806),
                        (936, 810), (918, 808), (914, 798), (926, 788), (942, 778), (940, 756), (934, 734)])
    FR.volumen(lz, vestido, ORO, luz, dens=0.86, prof=0.5, espesor=16, rayar=True, proyecta=2.0, grosor=0.38,
               presion=0.3, toques=[(976, 790, 26, '#d08a20', 0.5)])
    for (a_, b_, c_) in (((936, 796), (952, 796), (978, 790)), ((952, 772), (966, 784), (980, 788)),
                         ((958, 730), (968, 748), (974, 770))):
        lz.lapiz([bezier(a_, b_, c_, n=10)], '#8a5a1a', grosor=0.45, presion=0.32, temblor=0.2)
    lz.lapiz([arco(922, 802, 10, 7, 190, 340, 10), arco(936, 800, 10, 6, 190, 340, 10)], '#8a5a1a', grosor=0.45,
             presion=0.35)                                              # the two knees under the skirt
    # the head bent over the hands, low: the chin nearly on the neckline, a short neck of the face's tone
    FR.volumen(lz, Trazo([(945, 726), (942, 716)], (12, 11.5)), piel, luz, dens=0.82, prof=0.4, linea=False, duro=0.4)
    FR.cabeza_real(lz, 931, 694, 22, piel=piel, pelo='#1e1410', peinado='rizado', luz=luz, giro=-0.5, inclina=-22,
                   edad='nino', ojos='abajo', boca='sonrisa')
    # the near arm: from the shoulder down beside the body, the forearm forward to the hands
    P5.extremidad(lz, [(940, 728), (942, 762), (918, 764)], (11.5, 10.5, 9.5), ORO, dens=0.85, pliegues=True)
    # the clay bud held out in her hands: terracotta below, already turning coral at the tip
    yema = Poligono([(902, 756), (906, 738), (912, 728), (919, 736), (924, 756), (913, 762)])
    FR.volumen(lz, yema, BARRO, luz, dens=0.85, prof=0.45, linea=True, grosor=0.4, presion=0.4, duro=0.5,
               toques=[(912, 732, 8, CORAL, 0.9)])
    lz.lapiz([[(907, 748), (917, 744)], [(908, 754), (918, 751)]], '#8a4a2a', grosor=0.45, presion=0.36)
    FR.mano_real(lz, 928, 768, 194, 22, piel, 'sostiene', lado=1, luz=luz)
    FR.mano_real(lz, 938, 772, 204, 22, piel, 'sostiene', lado=-1, luz=luz)
    tallo = bezier((912, 728), (906, 708), (894, 690), (884, 672), 30)
    lz.lapiz([tallo], '#4f6f45', grosor=1.1, presion=0.8, temblor=0.3)
    P5.hojita(lz, 903, 698, 12, -170, '#5f8f63', tapa=1)
    P5.flor_grande(lz, 882, 662, 17, '#e8506a', centro=ORO)


def cabeza_perfil(lz, x, y, r, piel, pelo, mira=1, peinado='corto', canas=False):
    """A small head in profile for the middle distance (r = half its height), looking to
    the right (mira=1) or the left (-1): the skull, the line of brow, nose, lips and chin,
    an ear, the hair as one mass, an eye as a single short stroke -- at this size a face is
    its silhouette, not its features."""
    luz = FR._LUZ_ESCENA[0]
    sk = FR._hex(piel)
    col = '#cfc8c0' if canas else FR._hex(pelo)
    m = mira
    Q = lambda u, v: (x + m * u * r, y + v * r)
    craneo = Elipse(*Q(-0.08, -0.12), r * 0.86, r * 0.84)
    cara = Poligono([Q(0.2, -0.75), Q(0.62, -0.42), Q(0.66, -0.2), Q(0.64, -0.08), Q(0.86, 0.12), Q(0.68, 0.22),
                     Q(0.7, 0.36), Q(0.66, 0.46), Q(0.64, 0.6), Q(0.5, 0.86), Q(0.2, 0.96), Q(-0.1, 0.78), Q(-0.4, 0.3)])
    FR.volumen(lz, craneo | cara, sk, luz, dens=0.6, prof=0.42, sombra=sombra_piel(sk), espesor=r * 0.7, grosor=0.25,
               presion=0.25, duro=0.4)
    lz.aguada(Elipse(*Q(0.3, 0.3), r * 0.22, r * 0.15), mezcla(sk, '#d0685e', 0.35), dens=0.25, suave=r * 0.08)
    lz.lapiz([[Q(0.42, -0.08), Q(0.56, -0.07)]], '#2a1a1a', grosor=0.35, presion=0.6)            # the eye
    lz.lapiz([[Q(0.66, 0.46), Q(0.58, 0.47)]], '#6a2a2a', grosor=0.3, presion=0.5)               # the mouth
    oreja = Elipse(*Q(-0.12, 0.08), r * 0.13, r * 0.2)
    lz.aguada(oreja, mezcla(sk, '#c86a5a', 0.25), dens=0.6, tapa=1, irreg=0.1)
    if peinado == 'mono':
        masa = Poligono([Q(0.5, -0.62), Q(0.2, -0.98), Q(-0.4, -0.98), Q(-0.86, -0.6), Q(-0.94, -0.1), Q(-0.7, 0.3),
                         Q(-0.3, 0.12), Q(-0.1, -0.32), Q(0.3, -0.5)])
        masa = masa | Elipse(*Q(-0.88, -0.62), r * 0.32)
    else:
        masa = Poligono([Q(0.56, -0.58), Q(0.24, -1.0), Q(-0.4, -1.0), Q(-0.9, -0.6), Q(-0.96, -0.05), Q(-0.74, 0.42),
                         Q(-0.42, 0.42), Q(-0.3, -0.06), Q(0.1, -0.38), Q(0.44, -0.44)])
    FR.volumen(lz, masa, col, luz, dens=0.85, prof=0.5, espesor=r * 0.5, grosor=0.25, presion=0.25, duro=0.4)


def pie_bailarina():
    """Over falda()'s foot (same layer, same place): the leg narrowing to a slim ankle, the
    instep arched forward over the pointe shoe, the heel, the ribbons; a violet shadow away
    from the sun."""
    P5 = _p5()
    lz = P5.lz
    luz = FR._LUZ_ESCENA[0]
    lz.aguada(Elipse(660, 781, 13, 3.0), '#5a4a80', dens=0.45, suave=1.4)
    pierna = Trazo([(649.5, 738), (649, 750), (648, 762)], (13, 8.5, 5))
    FR.volumen(lz, pierna, 'piel3', luz, dens=0.66, prof=0.45, espesor=6, grosor=0.32, presion=0.28, duro=0.4)
    zap = Poligono([(645, 760), (652.5, 759), (655, 766), (652, 775), (649.5, 784), (646.5, 784), (643, 774), (641.5, 766)])
    FR.volumen(lz, zap, '#c33c4e', luz, dens=0.9, prof=0.45, espesor=4, grosor=0.35, presion=0.32, duro=0.5)
    lz.lapiz([[(642, 769), (651, 767)]], '#7a1f30', grosor=0.35, presion=0.4)                 # the box of the shoe
    lz.lapiz([[(641.5, 758), (655, 752)], [(655, 759), (642, 752)]], '#8a2a3a', grosor=0.45, presion=0.55)
    lz.levanta(Trazo([(645, 762), (643.5, 772)], (1.4, 0.8)), cantidad=0.25, suave=0.5)        # light on the satin


def bailarina():
    """piezas_05.bailarina with her eyes open, looking up at the hand she raises (closed eyes
    on a realistic face read as sleep)."""
    P5 = _p5()
    lz, TEAL5, CARMIN = P5.lz, P5.TEAL, P5.CARMIN
    MANO_ALTA, MANO_FALDA = P5.MANO_ALTA, P5.MANO_FALDA
    J = dict(cabeza=(644, 156, 33), hi=(614, 198), hd=(670, 208), ci=(628, 272), cd=(662, 268),
             brazo_i=[(616, 204), (574, 150), MANO_ALTA], brazo_d=[(668, 214), (724, 250), MANO_FALDA - (6, 0)],
             mano_i=(-60, 'junta'), mano_d=(15, 'sujeta'), delante=['brazo_i', 'brazo_d'])
    P5.figura(lz, J, dict(camisa=TEAL5, piel='piel3', grosor=0.5, cuello=0.64, pliegues=True),
              cara=dict(peinado='mono', pelo='#1e1410', giro=0.3, inclina=-12, ojos='abiertos', boca='abierta',
                        mira=(-0.8, -1.0), dientes=False, adorno=CARMIN))
    P5.mano(lz, *MANO_ALTA, -70, 26, 'piel3', 'junta', pulgar=-1)
    faja = Trazo([(624, 274), (644, 280), (664, 272)], (15, 16, 15))
    FR.volumen(lz, faja, CARMIN, FR._LUZ_ESCENA[0], dens=0.92, prof=0.45, rayar=True, grosor=0.4, presion=0.35)
    for pts in ([(664, 274), (688, 290), (708, 284)], [(664, 276), (682, 302), (696, 310)]):
        f = Trazo(pts, (8, 6, 2))
        FR.volumen(lz, f, CARMIN, FR._LUZ_ESCENA[0], dens=0.9, prof=0.4, grosor=0.35, presion=0.3, duro=0.5)
