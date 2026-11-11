"""
personajes_06.py -- the people of June's sunflower (Diseño 4), redrawn 2026-11-11.

Eugenio: «mejora cómo has pintado a los personajes para que sea más realista, y
trazos más profesionales» and «añade un cuarto personaje con el tema del
teléfono donde solo se le vea la mano y el teléfono, que sale desde el plano
izquierdo» (reference: a mural of a hand holding a phone whose screen shows a
wheat field, and a swallow flying out of it -- here without the slogan).

Each figure has ONE light: the grandfather and the girl are lit by the bulb they
are mending between them, the boy and the hand by the June sun (upper right).
Built with figuras_v3 (lit forms, anatomical limbs, real facial proportions).
"""
import math
import numpy as np

from acuarela import Poligono, Elipse, Trazo, spline, bezier, arco, mezcla
from extra_m678 import mano2, cuello
from figuras_v3 import (cuello3, brazo3, pierna3, torso3, cabeza3, modelar, linea_luz, tono, sombra_de, sombra_piel, linea_de,
                        golondrina, telefono, _u, _v)

CORAL = '#e8735e'
TEAL = '#2f8f92'
ORO = '#f2b630'
VERDE_O = '#3f6f45'


def abuelo_y_lampara(lz, BULBO):
    luz = (0.85, -0.5)                 # the bulb, to his right and a little up
    P1 = '#e2a882'
    PANT = '#4a5a8a'
    CHAQ = '#e39a48'
    # far leg first, then the near one (seated on the leaf, legs over its front edge)
    pierna3(lz, (452, 566), (502, 574), (497, 652), 30, PANT, P1, luz, pie_ang=-8, zapato='#6e4c3c', pie_tam=40,
            semilla=11)
    pierna3(lz, (428, 572), (488, 590), (472, 672), 32, PANT, P1, luz, pie_ang=-4, zapato='#6e4c3c', pie_tam=42,
            semilla=12)
    # far arm: hand round the lamp base
    brazo3(lz, (452, 484), (490, 528), (526, 546), 21, tono(CHAQ, '#7a3a2a', 0.12), P1, luz, 'larga',
           mano=dict(ang=18, gesto='relajada', lado=-1, tam=29), semilla=13)
    cuello3(lz, (426, 440), 30, (430, 478), P1, luz, giro=0.55, inclina=10)
    f, g = torso3(lz, (396, 480), (460, 486), (408, 574), (454, 576), CHAQ, luz, cintura=0.97, escote='v',
                  pliegues=[[(418, 500), (426, 530), (424, 562)], [(448, 512), (452, 544)], [(404, 524), (410, 556)],
                            [(436, 558), (446, 570)], [(414, 566), (428, 572)]], semilla=14)
    # the shirt in the V of the cardigan, its collar points
    m = g['m']
    camisa = Poligono([m + (-9, -4), m + (9, -2), m + (2, 26)], suave=False)
    lz.aguada(camisa, '#dce8ee', dens=0.75, tapa=1, irreg=0.1)
    lz.lapiz([[m + (-9, -4), m + (-2, 8), m + (2, 26)], [m + (9, -2), m + (4, 8), m + (2, 26)]], '#7a8a9a', grosor=0.55,
             presion=0.5)
    # the cardigan's button band and its buttons
    lz.lapiz([[m + (2, 26), m + (6, 92)]], linea_de(CHAQ, 0.5), grosor=0.6, presion=0.5)
    for k, y in enumerate((512, 532, 552)):
        x = m[0] + 4 + (y - m[1] - 26) * 0.06 + 3
        lz.aguada(Elipse(x, y, 2.4), '#7a3a22', dens=0.85, tapa=1, irreg=0.1)
        lz.gouache(Elipse(x - 0.6, y - 0.7, 0.7), '#f6d6b0', alfa=0.8, irreg=0)
    # a breast pocket
    lz.lapiz([[(440, 506), (452, 507), (451, 517)]], linea_de(CHAQ, 0.5), grosor=0.5, presion=0.45)
    cabeza3(lz, 426, 440, 30, P1, '#d8d2ca', 'calvo', luz, giro=0.55, inclina=10, edad='mayor', ojos='abiertos',
            boca='sonrisa', mira=(0.8, 0.9), gafas=True, iris='#6a5a4a', semilla=15)

    # the lamp: its round wooden foot rests in his hands, the brass column rises to the socket,
    # and the fringed shade is tipped back on its hinge so the girl can screw in the new bulb.
    pie_lamp = Poligono(np.vstack([arco(512, 562, 30, 9, 180, 360, 20), arco(512, 562, 30, 16, 0, 180, 20)]), suave=False)
    modelar(lz, pie_lamp, '#a8683a', luz, dens=0.85, prof=0.4, rayar=True, grosor=0.7, semilla=16,
            toques=[(498, 556, 12, '#d9a06a', 0.6)])
    lz.lapiz([arco(512, 562, 30, 9, 0, 360, 30), arco(512, 562, 20, 6, 200, 340, 20)], '#5e3a22', grosor=0.6, presion=0.5)
    col_l = Trazo([(514, 556), (518, 528), (524, 506)], (8, 7, 7))
    modelar(lz, col_l, '#d9a441', luz, dens=0.85, prof=0.4, rayar=False, grosor=0.6, brillo=0.3)
    lz.lapiz([[(512, 540), (520, 540)], [(514, 548), (521, 548)]], '#9a6a22', grosor=0.6, presion=0.5)
    rc, tc = np.array([506.0, 486.0]), np.array([480.0, 456.0])
    ax_ = tc - rc
    nn_ = np.array([ax_[1], -ax_[0]]) / np.linalg.norm(ax_)
    pantalla = Poligono([rc + nn_ * 25, tc + nn_ * 13, tc - nn_ * 13, rc - nn_ * 25], suave=False)
    modelar(lz, pantalla, CORAL, luz, dens=0.82, prof=0.38, grosor=0.7, semilla=17)
    borde_p = np.array([rc + nn_ * 25 * c for c in np.linspace(1, -1, 12)])
    lz.lapiz([[q, q + ax_ / np.linalg.norm(ax_) * -6 + np.array([1.5, 3])] for q in borde_p], '#b8503a', grosor=0.7,
             presion=0.65)
    lz.lapiz([[rc + nn_ * 5, (518, 506)]], '#7a4a22', grosor=1.0, presion=0.7)
    casq = Poligono([(518, 506), (532, 500), (536, 512), (524, 518)])
    modelar(lz, casq, '#9a9a8a', luz, dens=0.8, prof=0.35, rayar=False, grosor=0.6)
    lz.lapiz([[(521, 508), (533, 503)], [(523, 512), (534, 507)]], '#5a5a52', grosor=0.5, presion=0.5)
    bul = Elipse(BULBO[0] + 2, BULBO[1] - 8, 13, 15, 20)
    lz.aguada(bul, '#fbe7a2', dens=0.35, tapa=1, irreg=0.2, borde=0.7)
    lz.contorno(bul, '#b08a3a', grosor=0.6, presion=0.45, cortes=0.1)
    bx_, by_ = BULBO[0] + 2, BULBO[1] - 8
    lz.lapiz([[(bx_ - 3, by_ + 9), (bx_ - 2, by_ + 2)], [(bx_ + 3, by_ + 9), (bx_ + 2, by_ + 2)]], '#b08a3a', grosor=0.45,
             presion=0.6)
    espiral = np.array([(bx_ - 5 + 10 * t, by_ + 1.5 * math.sin(t * 6 * math.pi) - 1) for t in np.linspace(0, 1, 60)])
    lz.lapiz([espiral], '#e8901e', grosor=0.7, presion=0.85, temblor=0.0)
    lz.luz((BULBO[0] + 2, BULBO[1] - 8, 30), '#fff0b0', fuerza=0.9)
    lz.aguada(Elipse(BULBO[0] + 2, BULBO[1] - 8, 70), '#f8d57e', dens=0.12, suave=25, gran=0.05)
    # near arm: wraps the base
    brazo3(lz, (400, 490), (432, 546), (482, 562), 23, CHAQ, P1, luz, 'larga',
           mano=dict(ang=-6, gesto='relajada', lado=1, tam=31), semilla=18)
    # the bulb's warm light on the side of his face and hands that turns to it
    lz.luz((470, 470, 46), '#ffe2a0', fuerza=0.22)


def nina(lz):
    luz = (-0.8, -0.55)               # the bulb, to her left
    P2 = '#9b6141'
    # legs: a child's proportions (shorter shins than before), coral shoes
    pierna3(lz, (612, 568), (566, 574), (556, 628), 25, None, P2, luz, pie_ang=160, zapato=CORAL, pie_tam=31, semilla=21)
    pierna3(lz, (626, 572), (580, 584), (580, 636), 25, None, P2, luz, pie_ang=188, zapato=CORAL, pie_tam=31, semilla=22)
    # her pinafore dress: the skirt over her lap down to the knees, dotted
    falda = Poligono([(598, 518), (636, 518), (652, 560), (644, 584), (614, 592), (570, 590), (550, 584), (552, 562),
                      (578, 552)])
    modelar(lz, falda, TEAL, luz, dens=0.82, prof=0.42, grosor=0.8, semilla=23)
    lz.lapiz([bezier((604, 524), (598, 552), (588, 586)), bezier((622, 526), (628, 556), (632, 584)),
              bezier((572, 560), (566, 574), (560, 586)), bezier((612, 560), (610, 574), (606, 588))],
             linea_de(TEAL, 0.5), grosor=0.55, presion=0.42, temblor=0.2, puntas=0.45)
    for (x, y) in ((588, 548), (612, 562), (628, 540), (602, 578), (570, 574), (636, 572), (620, 584), (580, 562)):
        lz.gouache(Elipse(x, y, 1.9), '#fff3cf', alfa=0.9, irreg=0)
    # back arm resting on the leaf, yellow T-shirt sleeve
    brazo3(lz, (634, 482), (650, 524), (648, 560), 16, '#f2c04a', P2, luz, 'corta',
           mano=dict(ang=95, gesto='relajada', lado=1, tam=25), semilla=24)
    cuello3(lz, (618, 436), 25, (616, 476), P2, luz, giro=-0.5, inclina=-14)
    # the yellow T-shirt, then the pinafore's bib and straps over it, a seam at the waist
    torso3(lz, (592, 478), (640, 480), (598, 526), (634, 528), '#f2c04a', luz, cintura=0.95, semilla=25)
    lz.lapiz([bezier((604, 478), (616, 488), (630, 479), n=12)], linea_de('#f2c04a', 0.55), grosor=0.6, presion=0.5)
    pechera = Poligono([(597, 528), (602, 497), (631, 499), (636, 530)], suave=False)
    modelar(lz, pechera, TEAL, luz, dens=0.84, prof=0.4, grosor=0.75, semilla=28)
    for (a_, b_) in (((600, 478), (604, 499)), ((633, 480), (629, 501))):
        tir = Trazo([a_, b_], (5.0, 5.5))
        modelar(lz, tir, TEAL, luz, dens=0.86, prof=0.3, rayar=False, grosor=0.6)
        lz.aguada(Elipse(*b_, 1.6), '#f6e2b0', dens=0.9, tapa=1, irreg=0.1)      # the button on each strap
    lz.lapiz([[(599, 512), (634, 514)]], linea_de(TEAL, 0.5), grosor=0.45, presion=0.35, temblor=0.2)  # bib pocket
    lz.lapiz([bezier((596, 528), (616, 532), (637, 530), n=12)], linea_de(TEAL, 0.6), grosor=0.7, presion=0.55)
    cabeza3(lz, 618, 434, 25, P2, '#2a1a14', 'afro', luz, giro=-0.5, inclina=-14, edad='nino', ojos='abiertos',
            boca='sonrisa', mira=(-0.9, 0.7), pendiente=ORO, iris='#4a2a1c', semilla=26)
    # near arm: up to the bulb, fingers pinching it
    brazo3(lz, (596, 486), (574, 530), (556, 498), 16, '#f2c04a', P2, luz, 'corta',
           mano=dict(ang=-152, gesto='abierta', abre=0.6, lado=1, tam=27), semilla=27)


def labio_hoja(lz):
    """The near edge of the leaf curls up behind their legs, and the soft shadows of
    where they sit and of her dangling shoes. Paint it before the people."""
    labio = Trazo([(400, 590), (470, 600), (540, 602), (610, 598), (650, 590)], (5, 12, 14, 12, 6))
    lz.aguada(labio, '#7aa456', dens=0.8, tapa=1, borde=0.7, toques=[(520, 600, 40, '#a9c46a', 0.6)])
    lz.contorno(labio, VERDE_O, grosor=0.8, presion=0.5, cortes=0.2)
    lz.lapiz([spline([(420, 594), (500, 602), (600, 600)])], '#d9e3a8', grosor=0.6, presion=0.5)
    for (x, y, rx, ry) in ((470, 588, 46, 7), (604, 590, 40, 6), (560, 642, 12, 3.5), (584, 650, 12, 3.5)):
        lz.aguada(Elipse(x, y, rx, ry), '#2f5a3a', dens=0.32, suave=4, gran=0.2)


def nino(lz):
    """On tiptoe on the back foot, front knee bent; one arm throws the seeds up and forward,
    the other opens back for balance. A child's proportions: about five heads tall."""
    luz = (0.6, -0.8)
    P3 = '#c98a5e'
    CAM = '#e8735e'
    VAQ = '#3f6fb0'
    brazo3(lz, (852, 306), (826, 322), (800, 316), 13, CAM, P3, luz, 'corta',
           mano=dict(ang=185, gesto='abierta', lado=1, tam=21), semilla=31)
    pierna3(lz, (842, 368), (822, 402), (806, 432), 20, VAQ, P3, luz, pie_ang=48, zapato='#e8b53e', pie_tam=26,
            semilla=32)
    pierna3(lz, (860, 366), (888, 392), (888, 432), 20, VAQ, P3, luz, pie_ang=4, zapato='#e8b53e', pie_tam=28,
            semilla=33)
    cuello3(lz, (872, 268), 20, (868, 300), P3, luz, giro=0.5, inclina=10)
    torso3(lz, (850, 304), (890, 298), (840, 370), (864, 366), CAM, luz, cintura=0.95,
           pliegues=[[(858, 318), (854, 352)], [(874, 314), (866, 346)], [(848, 336), (844, 362)],
                     [(878, 330), (870, 358)]], semilla=34)
    lz.lapiz([bezier((840, 362), (852, 368), (866, 362), n=10)], linea_de(CAM, 0.5), grosor=0.6, presion=0.45)
    cabeza3(lz, 872, 268, 20, P3, '#3a2620', 'corto', luz, giro=0.5, inclina=10, edad='nino', ojos='abiertos',
            boca='risa', mira=(1, -1), semilla=35)
    brazo3(lz, (888, 302), (914, 276), (940, 246), 13, CAM, P3, luz, 'corta',
           mano=dict(ang=-55, gesto='abierta', lado=-1, tam=21), semilla=36)


def mano_con_telefono(lz):
    """The fourth character: only a hand and its phone, reaching in from the left edge.
    On the screen, a wheat field under a summer sky; out of it a swallow flies into
    the real sky, trailing a wisp of the screen's cloud (no slogan).
    The left hand holds the phone from behind, screen to us: the fingers curl round
    the right edge (we see their nails on the glass), the thumb crosses the lower
    left of the screen, the heel of the palm shows under the phone."""
    luz = (0.6, -0.8)
    piel = '#a86a46'
    C = np.array([176.0, 534.0])
    W, H, ANG = 62.0, 116.0, 10.0
    a = math.radians(ANG)
    X = np.array([math.cos(a), math.sin(a)])
    Y = np.array([-math.sin(a), math.cos(a)])
    P = lambda u, v: C + X * u + Y * v          # phone-local units: u right, v down
    sp = sombra_piel(piel)
    lp = linea_de(piel, 0.6)

    # the forearm, from outside the sheet to the wrist
    muneca = P(-22, 82)
    codo = np.array([-30.0, 700.0])
    antebrazo = Trazo([codo, (codo + muneca) / 2 + (0, 4), muneca], (54, 44, 34), suave=True)
    lz.aguada(antebrazo, piel, dens=0.62, tapa=1, borde=0.7, irreg=0.6, gran=0.45, desvanece=(70, 650, 18, 680))
    lz.aguada(antebrazo, sp, dens=0.4, borde=0.2, irreg=0.4, gran=0.35, desvanece=(110, 700, 120, 640))
    linea_luz(lz, antebrazo, lp, luz, grosor=0.7, limite=(52, 0, 1485, 850))
    # the palm behind the phone: thenar mound on the left, heel below
    palma = Poligono([P(-28, 4), P(-42, 20), P(-47, 42), P(-42, 60), P(-30, 74), P(-10, 80), P(10, 76), P(24, 64),
                      P(30, 30)])
    modelar(lz, palma, piel, luz, dens=0.62, prof=0.38, sombra=sp, linea=lp, grosor=0.7, rayar=False, semilla=42)
    lz.lapiz([list(bezier(P(-38, 50), P(-30, 66), P(-14, 76), n=10))], lp, grosor=0.5, presion=0.4, temblor=0.1)

    pant, S = telefono(lz, C[0], C[1], W, H, ANG, luz, semilla=43)
    lz.aguada(Poligono([P(-31, 58), P(31, 58), P(30, 67), P(-28, 67)]) & palma, sp, dens=0.4, suave=2)

    # four fingers curl round the right edge, index on top; the little finger shorter
    # (centre v, width, where the tip reaches, how far the knuckle stands out, tip drift): index, middle, ring, little
    dedos = ((-35, 13.5, 20.5, 43, -1.2), (-19.5, 14.0, 17.5, 45, -0.4), (-4.5, 13.2, 19.5, 43, 0.4), (10, 11.0, 24.0, 40, 1.4))
    for k, (v, wd, tip, nud, deriva) in list(enumerate(dedos))[::-1]:
        dedo = Trazo([P(nud, v + 1.5), P(33, v), P(tip, v + deriva)], (wd, wd * 0.94, wd * 0.72))
        lz.aguada(Trazo([P(33, v + 3), P(tip - 2, v + deriva + 3)], (wd * 0.8, wd * 0.6)) & pant, '#1a1c24', dens=0.3,
                  suave=2)      # its shadow on the glass
        modelar(lz, dedo, piel, luz, dens=0.66, prof=0.42, sombra=sp, linea=lp, grosor=0.7, rayar=False,
                semilla=44 + k, firme=0.8)
        # the last joint, where the finger turns over the edge, and the knuckle beyond it
        lz.lapiz([list(bezier(P(34, v - wd * 0.38), P(32.5, v), P(34, v + wd * 0.38), n=6)),
                  list(bezier(P(35.5, v - wd * 0.3), P(34.5, v), P(35.5, v + wd * 0.3), n=6))], lp, grosor=0.4,
                 presion=0.4)
        lz.lapiz([list(bezier(P(nud + 2, v - wd * 0.3), P(nud + 4.5, v), P(nud + 2, v + wd * 0.3), n=6))], lp, grosor=0.4,
                 presion=0.3)
        # the nail on the glass
        nc = P(tip + 3.4, v + deriva + 0.6)
        una = Elipse(nc[0], nc[1], wd * 0.28, wd * 0.24, ANG)
        lz.aguada(una, tono(piel, '#f2d4c8', 0.6), dens=0.75, tapa=1, irreg=0.1)
        lz.lapiz([arco(nc[0], nc[1], wd * 0.28, wd * 0.24, -70, 70, 10, ANG)], lp, grosor=0.4, presion=0.5)
        lz.gouache(Elipse(nc[0] - 1, nc[1] - wd * 0.1, wd * 0.14, wd * 0.05, ANG), '#ffffff', alfa=0.5, irreg=0)
    # the thumb crosses the lower left of the screen, its nail toward us
    ruta = [P(-42, 48), P(-30, 30), P(-18, 18), P(-9, 11)]
    pulgar = Trazo(ruta, (21, 19, 15.5, 12.5))
    lz.aguada(Trazo([np.asarray(q) + (-3.0, 3.5) for q in ruta[1:]], (16, 13, 10)) & pant, '#1a1c24', dens=0.32, suave=2.5)
    modelar(lz, pulgar, piel, luz, dens=0.66, prof=0.42, sombra=sp, linea=lp, grosor=0.7, rayar=False, semilla=48,
            firme=0.8)
    dirp = _u(np.asarray(ruta[-1]) - np.asarray(ruta[-2]))
    angp = math.degrees(math.atan2(dirp[1], dirp[0]))
    nc = np.asarray(ruta[-1]) - dirp * 4.0
    una = Elipse(nc[0], nc[1], 5.4, 4.3, angp)
    lz.aguada(una, tono(piel, '#f2d4c8', 0.6), dens=0.75, tapa=1, irreg=0.1)
    lz.lapiz([arco(nc[0], nc[1], 5.4, 4.3, 110, 250, 12, angp)], lp, grosor=0.4, presion=0.5)
    lz.gouache(Elipse(nc[0] + 0.5, nc[1] - 1.5, 2.2, 0.8, angp), '#ffffff', alfa=0.5, irreg=0)
    q = np.asarray(P(-26, 25))
    nrm = np.array([-dirp[1], dirp[0]])
    lz.lapiz([list(bezier(q - nrm * 6, q + dirp * 1.5, q + nrm * 6, n=8))], lp, grosor=0.5, presion=0.45)

    # the swallow leaves the screen: a wisp of the screen's cloud streams out behind it
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
