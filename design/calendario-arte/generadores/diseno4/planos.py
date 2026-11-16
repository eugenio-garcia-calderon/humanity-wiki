"""
planos.py -- an illustration built in depth planes (2026-11-15).

Eugenio: «a partir de ahora todas las ilustraciones… utiliza al menos entre 3 y 5
planos y capas de profundidad, para que los diseños sean más compuestos entre lo que
está en primer plano y lo que está de fondo… detallitos que estén igual ocultos porque
están más en el fondo pero que son igualmente importantes y están bien ilustrados…
juega con las luces para que haya luces y sombras y diferentes iluminaciones».

How it works
------------
The painting library (acuarela.py) stays what it is. What changes is the order of
operations: every element is painted ALONE on a clean sheet, turned into a sprite
with transparency (the smallest alpha that, laid over bare paper, gives the element
back), then given the treatment of its plane, and laid over the picture so far. So
the final picture IS the stack of sprites -- exactly what the web shows when the
illustration is opened as movable elements (capas), with nothing lost in between.

    esc = Escena(ancho, semilla=606, sol=(1250, 170))
    lz = esc.lienzo
    ...paint the sky directly on lz...          # becomes the static background
    esc.empieza('montes', 'Los montes', plano=4, fija=True)
    ...paint the far hills...
    esc.empieza('pueblo', 'El pueblo', plano=3, escala=0.8, ancla=(1180, 820), mueve=(0, -60))
    ...paint the village at its own coordinates; it is scaled and moved as a sprite...
    esc.empieza('nina', 'La niña', plano=2, proyecta=dict(suelo=640, largo=0.5))
    ...
    esc.rayos(...)                              # light shafts between two planes
    esc.termina()
    esc.marco(margen=34)                        # ragged fade to the calendar's paper
    esc.guardar('mes-06-e.jpg', carpeta_capas)

Planes (`plano=`), 1 = nearest:
  1  foreground that frames the scene: in the shade of the light (darker, cooler),
     a strong rim of light on the edges that face it.
  2  the protagonists: full colour, full detail, a rim of light.
  3  middle distance: a veil of air (haze) starts, warmer near the light.
  4  far: much haze, softer, a little out of focus.
  5  very far: almost air.
Each preset can be overridden per element.

Effects (all optional, per element):
  escala, ancla=(x, y), mueve=(dx, dy)   place a reused element elsewhere and at another size
  neblina=t        mix toward the air's colour (cool far from the light, golden near it)
  sombra=t         the shade a foreground element stands in (multiply toward `color_sombra`)
  volumen=t        the side of the element away from the light, darker and cooler
  tinte=dict(color, fuerza, de=(x, y), a=(x, y))
                   a glaze over the element only (never over the paper around it), full at
                   `de` and gone at `a`: houses seen against the light, a cool far side
  desenfoque=u     out-of-focus blur, in units
  borde_luz=f      rim light on the edges facing the light (`ancho_borde` in units)
  proyecta=dict(suelo=y, largo=kx, alto=ky, fuerza=f, difusa=u, color=c, dentro=forma)
                   cast shadow on the ground at height y, falling away from the light;
                   `dentro` keeps it on a surface (a leaf, a table)
  alfa=f           overall opacity
  fija=True        part of the landscape or of the light: the web does not let it be dragged

Units: base units of a 1485 x 850 sheet, as everywhere in acuarela.py.
"""
from __future__ import annotations

import json
import math
import os

import cv2
import numpy as np
from PIL import Image

from acuarela import Lienzo, rgb, mezcla, _blur, _ss, BASE_W, BASE_H

PLANOS = {
    1: dict(sombra=0.46, borde_luz=0.95, ancho_borde=3.2, volumen=0.22),
    2: dict(borde_luz=0.85, ancho_borde=2.8, volumen=0.16),
    3: dict(neblina=0.22, borde_luz=0.18, ancho_borde=1.6),
    4: dict(neblina=0.46, desenfoque=0.45),
    5: dict(neblina=0.64, desenfoque=0.8),
}


def _premul(rgba):
    C, a = rgba[..., :3], rgba[..., 3:4]
    return np.concatenate([C * a, a], axis=2)


def _unpremul(P):
    a = P[..., 3:4]
    C = np.where(a > 1e-4, P[..., :3] / np.maximum(a, 1e-4), 0)
    return np.concatenate([np.clip(C, 0, 1), np.clip(a, 0, 1)], axis=2)


class Escena:
    def __init__(self, ancho, semilla=1, sol=(1250, 170), color_luz='#ffe6ad',
                 aire_calido='#f4dcae', aire_frio='#cdd3e4', radio_luz=520, color_sombra='#2b3247'):
        self.lienzo = Lienzo(ancho, semilla=semilla)
        lz = self.lienzo
        lz.TAPA = np.zeros((lz.H, lz.W), np.float32)
        self.s, self.W, self.H = lz.s, lz.W, lz.H
        self.papel = lz.imagen().astype(np.float32) / 255.0
        self.img = self.papel.copy()
        self.sol = sol
        self.color_luz = rgb(color_luz)
        self.aire_calido, self.aire_frio = rgb(aire_calido), rgb(aire_frio)
        self.radio_luz = radio_luz
        self.color_sombra = rgb(color_sombra)
        self.config = {}
        self.actual = None
        self.lista = []
        self.fondo = None

    # ---------------------------------------------------------------- markers
    def _limpia(self):
        lz = self.lienzo
        lz.T[:] = 1
        lz.LUZ[:] = 0
        lz.OP[:] = 0
        lz.TAPA[:] = 0

    def empieza(self, id_, nombre, **kw):
        """Close the element being painted and start a new one. Everything painted
        before the first call is the static background (the sky)."""
        if self.fondo is None:
            self.img = self.lienzo.imagen().astype(np.float32) / 255.0
            self.fondo = self.img.copy()
        elif self.actual is not None:
            self._cierra()
        opciones = dict(self.config.get(id_, {}))
        opciones.update(kw)
        self.actual = (id_, nombre, opciones)
        self._limpia()

    def termina(self):
        if self.actual is not None:
            self._cierra()
            self.actual = None
        if self.fondo is None:
            self.img = self.lienzo.imagen().astype(np.float32) / 255.0
            self.fondo = self.img.copy()

    # ---------------------------------------------------------------- geometry helpers
    @staticmethod
    def punto(p, escala=1.0, ancla=(0, 0), mueve=(0, 0)):
        """Where a point of an element lands after `escala/ancla/mueve`."""
        return (ancla[0] + (p[0] - ancla[0]) * escala + mueve[0],
                ancla[1] + (p[1] - ancla[1]) * escala + mueve[1])

    def _aire(self, X, Y):
        """Air colour and how much of the light is in it at (X, Y) units."""
        d2 = (X - self.sol[0]) ** 2 + (Y - self.sol[1]) ** 2
        w = np.exp(-d2 / (self.radio_luz ** 2))
        col = self.aire_frio[None, None, :] * (1 - w[..., None]) + self.aire_calido[None, None, :] * w[..., None]
        return col, w

    # ---------------------------------------------------------------- the element as a sprite
    def _descompone(self, opaco=True):
        A = self.lienzo.imagen().astype(np.float32) / 255.0
        B = self.papel
        d = A - B
        up = np.where(d > 0, d / np.maximum(1 - B, 1e-4), 0)
        dn = np.where(d < 0, -d / np.maximum(B, 1e-4), 0)
        a = np.clip(np.maximum(up, dn).max(axis=2), 0, 1)
        if opaco:
            # what was painted with a reserve is a solid object, even where its colour is
            # close to the paper's (a cream shirt, a white glider): without this, pale things
            # turn into ghosts over whatever is behind them
            # only the inside of a reserve: its soft outer fringe would be a cream halo
            a = np.maximum(a, np.clip((self.lienzo.TAPA - 0.45) / 0.45, 0, 1))
        a[a < 0.008] = 0
        ys, xs = np.nonzero(a)
        if len(xs) == 0:
            return None
        x0, x1 = max(0, xs.min() - 2), min(self.W, xs.max() + 3)
        y0, y1 = max(0, ys.min() - 2), min(self.H, ys.max() + 3)
        aa = a[y0:y1, x0:x1]
        C = B[y0:y1, x0:x1] + d[y0:y1, x0:x1] / np.maximum(aa, 1e-4)[..., None]
        C = np.where(aa[..., None] > 0, np.clip(C, 0, 1), 0)
        return np.concatenate([C, aa[..., None]], axis=2).astype(np.float32), x0, y0

    def _cierra(self):
        id_, nombre, op = self.actual
        r = self._descompone(opaco=op.get('opaco', True))
        if r is None:
            print(f'planos: «{id_}» no pinta nada; se omite')
            return
        rgba, x0, y0 = r
        rgba, x0, y0 = self.efectos(rgba, x0, y0, op)
        self.pon(rgba, x0, y0, id_, nombre, fija=op.get('fija', False))

    def efectos(self, rgba, x0, y0, op):
        o = {}
        if op.get('plano'):
            o.update(PLANOS[op['plano']])
        o.update(op)
        s = self.s
        # 1. place elsewhere / at another size
        e = o.get('escala', 1.0)
        mv = o.get('mueve', (0, 0))
        if e != 1.0 or mv != (0, 0):
            rgba, x0, y0 = self._transforma(rgba, x0, y0, e, o.get('ancla', (0, 0)), mv)
        h, w = rgba.shape[:2]
        X = (np.arange(x0, x0 + w, dtype=np.float32) + 0.5)[None, :] / s
        Y = (np.arange(y0, y0 + h, dtype=np.float32) + 0.5)[:, None] / s
        C, a = rgba[..., :3], rgba[..., 3]
        # 2. the shade a foreground thing stands in, deepest away from the light
        if o.get('sombra'):
            t = o['sombra']
            sc = rgb(o.get('color_sombra')) if o.get('color_sombra') else self.color_sombra
            _, wl = self._aire(X, Y)
            tt = (t * (1 - 0.45 * wl))[..., None]
            C = C * (1 - tt) + C * sc[None, None, :] * tt * 1.6
            C = np.clip(C, 0, 1)
        # 2b. turned away from the light: the far side of the element a little darker
        if o.get('volumen'):
            ys_, xs_ = np.nonzero(a > 0.3)
            if len(xs_):
                cx, cy = (xs_.mean() + x0) / s, (ys_.mean() + y0) / s
                ux, uy = self.sol[0] - cx, self.sol[1] - cy
                n_ = math.hypot(ux, uy) or 1.0
                proj = ((X - cx) * ux + (Y - cy) * uy) / n_
                span = max(1.0, float(np.abs(proj[ys_, xs_]).max()))
                g = np.clip(0.5 + proj / (2 * span), 0, 1)
                k = (o['volumen'] * (1 - g))[..., None]
                sc = self.color_sombra
                C = np.clip(C * (1 - k) + C * np.clip(sc * 2.2, 0, 1)[None, None, :] * k, 0, 1)
        # 2c. a graded glaze over the element only
        if o.get('tinte'):
            tn = o['tinte']
            (ax_, ay_), (bx_, by_) = tn.get('de', (0, 0)), tn.get('a', (BASE_W, 0))
            vx, vy = bx_ - ax_, by_ - ay_
            tt = np.clip(1 - ((X - ax_) * vx + (Y - ay_) * vy) / max(1e-6, vx * vx + vy * vy), 0, 1)
            k = (tn.get('fuerza', 0.4) * tt)[..., None]
            C = np.clip(C * (1 - k) + C * rgb(tn['color'])[None, None, :] * k * 1.25, 0, 1)
        # 3. the air between us and it
        if o.get('neblina'):
            t = o['neblina']
            col, wl = self._aire(X, Y)
            tt = np.clip(t * (0.85 + 0.55 * wl), 0, 0.96)[..., None]
            C = C * (1 - tt) + col * tt
            if o.get('aclara_alfa', True):
                a = a * (1 - 0.25 * tt[..., 0])
        rgba = np.concatenate([C, a[..., None]], axis=2)
        # 4. out of focus
        if o.get('desenfoque'):
            rgba, x0, y0 = self._pad(rgba, x0, y0, int(math.ceil(o['desenfoque'] * s * 3)) + 1)
            P = _premul(rgba)
            P = cv2.GaussianBlur(P, (0, 0), o['desenfoque'] * s)
            rgba = _unpremul(P)
        # 5. rim of light on the edges that face the light
        if o.get('borde_luz'):
            rgba = self._borde_luz(rgba, x0, y0, o['borde_luz'], o.get('ancho_borde', 2.4),
                                   rgb(o['color_borde']) if o.get('color_borde') else self.color_luz,
                                   irregular=o.get('borde_irregular', False))
        # 6. cast shadow on the ground, under the element
        if o.get('proyecta'):
            rgba, x0, y0 = self._proyecta(rgba, x0, y0, o['proyecta'])
        if o.get('alfa', 1.0) != 1.0:
            rgba = rgba.copy()
            rgba[..., 3] *= o['alfa']
        return rgba, x0, y0

    def _pad(self, rgba, x0, y0, p):
        h, w = rgba.shape[:2]
        out = np.zeros((h + 2 * p, w + 2 * p, 4), np.float32)
        out[p:p + h, p:p + w] = rgba
        return out, x0 - p, y0 - p

    def _transforma(self, rgba, x0, y0, e, ancla, mueve):
        s = self.s
        P = _premul(rgba)
        if e < 0.8:
            P = cv2.GaussianBlur(P, (0, 0), 0.45 / e)
        h, w = P.shape[:2]
        ax, ay = ancla[0] * s, ancla[1] * s
        dx, dy = mueve[0] * s, mueve[1] * s
        # sheet px of the crop's corners after the transform
        nx0 = math.floor(ax + (x0 - ax) * e + dx)
        ny0 = math.floor(ay + (y0 - ay) * e + dy)
        nw, nh = int(math.ceil(w * e)) + 2, int(math.ceil(h * e)) + 2
        tx = ax + (x0 - ax) * e + dx - nx0
        ty = ay + (y0 - ay) * e + dy - ny0
        M = np.float32([[e, 0, tx], [0, e, ty]])
        Q = cv2.warpAffine(P, M, (nw, nh), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        return _unpremul(Q), nx0, ny0

    def _borde_luz(self, rgba, x0, y0, fuerza, ancho, color, irregular=False):
        s = self.s
        a = rgba[..., 3]
        if a.max() <= 0:
            return rgba
        h, w = a.shape
        ys, xs = np.nonzero(a > 0.3)
        if len(xs) == 0:
            return rgba
        cx, cy = (xs.mean() + x0) / s, (ys.mean() + y0) / s
        ux, uy = self.sol[0] - cx, self.sol[1] - cy
        n = math.hypot(ux, uy) or 1.0
        ux, uy = ux / n, uy / n
        k = ancho * s
        M = np.float32([[1, 0, -ux * k], [0, 1, -uy * k]])
        ash = cv2.warpAffine(a, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        R = np.clip(a - ash, 0, 1)
        if irregular:
            # (design 6, 2026-11-16) a wet edge of light, 0 to ~1.6x the width: wider on the round
            # forms, gone in places, instead of a stroke of fixed width that reads as a vector line
            M2 = np.float32([[1, 0, -ux * k * 1.6], [0, 1, -uy * k * 1.6]])
            R2 = np.clip(a - cv2.warpAffine(a, M2, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT,
                                            borderValue=0), 0, 1)
            rng = np.random.default_rng(int(x0 * 7 + y0 * 13) % 100000)
            g = rng.uniform(0, 1, (max(2, h // int(6 * s) + 2), max(2, w // int(6 * s) + 2))).astype(np.float32)
            N = cv2.resize(g, (w, h), interpolation=cv2.INTER_CUBIC)
            N = np.clip((N - 0.25) / 0.6, 0, 1)
            R = R2 * N + R * (1 - N) * 0.5
            R = cv2.GaussianBlur(R, (0, 0), max(0.8, 0.5 * k))
        else:
            R = cv2.GaussianBlur(R, (0, 0), max(0.6, 0.35 * k))
        R = np.clip(R * 1.6, 0, 1) * (a > 0.05)
        # brighter where the element is nearer the light
        X = (np.arange(x0, x0 + w, dtype=np.float32) + 0.5)[None, :] / s
        Y = (np.arange(y0, y0 + h, dtype=np.float32) + 0.5)[:, None] / s
        _, wl = self._aire(X, Y)
        R = R * fuerza * (0.55 + 0.45 * wl)
        C = rgba[..., :3]
        C = 1 - (1 - C) * (1 - R[..., None] * color[None, None, :])
        return np.concatenate([np.clip(C, 0, 1), a[..., None]], axis=2)

    def _proyecta(self, rgba, x0, y0, p):
        s = self.s
        suelo = p['suelo'] * s - y0                       # ground line, crop px
        kx, ky = p.get('largo', 0.6), p.get('alto', 0.22)
        fuerza = p.get('fuerza', 0.32)
        difusa = p.get('difusa', 2.5)
        col = rgb(p.get('color', '#3b3550'))
        # direction away from the light: the sun is up and to one side of the element
        a = rgba[..., 3].copy()
        h, w = a.shape
        yy = np.arange(h, dtype=np.float32)[:, None]
        a = a * (yy <= suelo)                             # only what stands above the ground casts
        hmax = max(0.0, suelo)
        ys, xs = np.nonzero(rgba[..., 3] > 0.3)
        cx = (xs.mean() + x0) / s if len(xs) else (x0 + w / 2) / s
        sgn = -1.0 if self.sol[0] > cx else 1.0           # falls to the side away from the sun
        pad_x = int(hmax * kx) + int(difusa * s * 3) + 4
        pad_y = int(hmax * ky) + int(difusa * s * 3) + 4
        out_w, out_h = w + 2 * pad_x, h + pad_y + int(difusa * s * 3) + 4
        # forward map from the element's px (x, y) to its shadow (crop px + pad):
        #   x' = x + sgn * (suelo - y) * kx + pad_x ;  y' = suelo + (suelo - y) * ky
        M = np.float32([[1, -sgn * kx, sgn * kx * suelo + pad_x], [0, -ky, suelo * (1 + ky)]])
        S = cv2.warpAffine(a, M, (out_w, out_h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        S = cv2.GaussianBlur(S, (0, 0), difusa * s)
        if p.get('dentro') is not None:
            # only on the surface it falls on (a leaf, a table top)
            X0, Y0 = x0 - pad_x, y0
            M = np.zeros_like(S)
            cx0, cy0 = max(0, X0), max(0, Y0)
            cx1, cy1 = min(self.W, X0 + out_w), min(self.H, Y0 + out_h)
            if cx1 > cx0 and cy1 > cy0:
                M[cy0 - Y0:cy1 - Y0, cx0 - X0:cx1 - X0] = p['dentro'].mascara(self.lienzo, cx0, cy0, cx1, cy1)
            S = S * M
        # nearer the feet the shadow is darker and sharper
        Y = np.arange(out_h, dtype=np.float32)[:, None]
        cerca = np.clip(1 - (Y - suelo) / max(1.0, hmax * ky + 1), 0.25, 1)
        S = np.clip(S * fuerza * (0.6 + 0.6 * cerca), 0, 0.85)
        # the element over its shadow
        big = np.zeros((out_h, out_w, 4), np.float32)
        big[0:h, pad_x:pad_x + w] = rgba
        A = big[..., 3:4]
        Sa = S[..., None] * (1 - A)
        out_a = A + Sa
        out_C = np.where(out_a > 1e-4, (big[..., :3] * A + col[None, None, :] * Sa) / np.maximum(out_a, 1e-4), 0)
        return np.concatenate([out_C, out_a], axis=2).astype(np.float32), x0 - pad_x, y0

    # ---------------------------------------------------------------- laying sprites
    def pon(self, rgba, x0, y0, id_, nombre, fija=False):
        """Lay a sprite over the picture and keep it for the capas folder."""
        h, w = rgba.shape[:2]
        X0, Y0 = max(0, x0), max(0, y0)
        X1, Y1 = min(self.W, x0 + w), min(self.H, y0 + h)
        if X1 <= X0 or Y1 <= Y0:
            return
        rgba = rgba[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0]
        # crop to what is really there
        ys, xs = np.nonzero(rgba[..., 3] > 0.004)
        if len(xs) == 0:
            return
        rgba = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        X0, Y0 = X0 + xs.min(), Y0 + ys.min()
        h, w = rgba.shape[:2]
        # quantise first, so the picture is exactly what the sprites will give back
        q = (np.clip(rgba, 0, 1) * 255 + 0.5).astype(np.uint8)
        f = q.astype(np.float32) / 255.0
        reg = self.img[Y0:Y0 + h, X0:X0 + w]
        A = f[..., 3:4]
        self.img[Y0:Y0 + h, X0:X0 + w] = reg * (1 - A) + f[..., :3] * A
        self.lista.append(dict(id=id_, nombre=nombre, rgba=q, x0=X0, y0=Y0, x1=X0 + w, y1=Y0 + h, fija=bool(fija)))

    # ---------------------------------------------------------------- light and frame layers
    def halos(self, id_, nombre, lista, color='#ffe2a0'):
        """Light that spills from a source onto what is around it (a bulb on hands and
        faces, a lantern on a wall): a fixed layer of warm air, [(x, y, radius, strength)]."""
        s = self.s
        x0 = int(max(0, min(x - r * 2.6 for (x, y, r, f) in lista) * s))
        y0 = int(max(0, min(y - r * 2.6 for (x, y, r, f) in lista) * s))
        x1 = int(min(self.W, max(x + r * 2.6 for (x, y, r, f) in lista) * s) + 1)
        y1 = int(min(self.H, max(y + r * 2.6 for (x, y, r, f) in lista) * s) + 1)
        X = (np.arange(x0, x1, dtype=np.float32) + 0.5)[None, :] / s
        Y = (np.arange(y0, y1, dtype=np.float32) + 0.5)[:, None] / s
        A = np.zeros((y1 - y0, x1 - x0), np.float32)
        for (x, y, r, f) in lista:
            A = 1 - (1 - A) * (1 - f * np.exp(-((X - x) ** 2 + (Y - y) ** 2) / (r * r)))
        rgba = np.zeros((y1 - y0, x1 - x0, 4), np.float32)
        rgba[..., :3] = rgb(color)
        rgba[..., 3] = A
        self.pon(rgba, x0, y0, id_, nombre, fija=True)

    def haces(self, id_, nombre, lista, color='#fcf0cd', fuerza=0.4, blando=15):
        """Beams of light with a start and an end: [(x0, y0, ancho0, x1, y1, ancho1), ...] in
        units. Each fades in from where it leaves the cloud and out before it reaches the ground."""
        s = self.s
        X = (np.arange(self.W, dtype=np.float32) + 0.5)[None, :] / s
        Y = (np.arange(self.H, dtype=np.float32) + 0.5)[:, None] / s
        A = np.zeros((self.H, self.W), np.float32)
        for (x0, y0, w0, x1, y1, w1) in lista:
            vx, vy = x1 - x0, y1 - y0
            L = math.hypot(vx, vy)
            ux, uy = vx / L, vy / L
            t = ((X - x0) * ux + (Y - y0) * uy) / L                    # 0 at the start, 1 at the end
            d = np.abs((X - x0) * (-uy) + (Y - y0) * ux)                # distance from the axis
            w = (w0 + (w1 - w0) * np.clip(t, 0, 1)) / 2
            m = _ss(w + blando - d, 0, 2 * blando) * _ss(t, 0.0, 0.18) * _ss(1 - t, 0.0, 80 / L)
            A = np.maximum(A, m)
        n = self.lienzo.fbm(0, 0, self.W, self.H, 90, 77, 2)
        A = A * (0.8 + 0.4 * n) * fuerza * (0.6 + 0.8 * self.lienzo.grano)
        rgba = np.zeros((self.H, self.W, 4), np.float32)
        rgba[..., :3] = rgb(color)
        rgba[..., 3] = np.clip(A, 0, 0.8)
        self.pon(rgba, 0, 0, id_, nombre, fija=True)

    def rayos(self, id_='rayos', nombre='Los rayos de sol', haces=7, abertura=(150, 250), largo=1300,
              fuerza=0.16, motas=60, semilla=5, motas_zona=None, brillo=1.0):
        """Shafts of light fanning from the sun, and dust/pollen glittering in them.
        A layer of light over whatever is already laid (put it between two planes)."""
        s = self.s
        rng = np.random.default_rng(semilla)
        X = (np.arange(self.W, dtype=np.float32) + 0.5)[None, :] / s
        Y = (np.arange(self.H, dtype=np.float32) + 0.5)[:, None] / s
        dx, dy = X - self.sol[0], Y - self.sol[1]
        ang = np.degrees(np.arctan2(dy, dx))
        dist = np.hypot(dx, dy)
        A = np.zeros((self.H, self.W), np.float32)
        a0, a1 = abertura
        for k in range(haces):
            c = rng.uniform(a0, a1)
            anchura = rng.uniform(2.5, 7.0)
            f = rng.uniform(0.45, 1.0)
            A += f * np.exp(-((ang - c) / anchura) ** 2)
        lz = self.lienzo
        n = lz.fbm(0, 0, self.W, self.H, 160, semilla + 3, 2)
        A = A * (0.7 + 0.6 * n)
        A = A * np.clip(1 - dist / largo, 0, 1) ** 1.3 * _ss(dist, 30, 160)
        glow = (np.exp(-(dist / 210.0) ** 2) * 0.55 + np.exp(-(dist / 90.0) ** 2) * 0.35) * brillo
        A = np.clip(A * fuerza + glow * fuerza * 1.6, 0, 0.6) * (0.6 + 0.8 * lz.grano)
        rgba = np.zeros((self.H, self.W, 4), np.float32)
        rgba[..., :3] = self.color_luz
        rgba[..., 3] = A
        # dust and pollen in the light: tiny bright motes
        if motas:
            zx0, zy0, zx1, zy1 = motas_zona or (self.sol[0] - 700, self.sol[1] - 50, self.sol[0] + 50, self.sol[1] + 650)
            for k in range(motas):
                x, y = rng.uniform(zx0, zx1), rng.uniform(zy0, zy1)
                r = rng.uniform(0.6, 1.6)
                px, py, pr = x * s, y * s, max(1.0, r * s)
                x0_, y0_ = int(px - pr * 4), int(py - pr * 4)
                x1_, y1_ = int(px + pr * 4) + 1, int(py + pr * 4) + 1
                if x0_ < 0 or y0_ < 0 or x1_ > self.W or y1_ > self.H:
                    continue
                gx = np.arange(x0_, x1_)[None, :] + 0.5 - px
                gy = np.arange(y0_, y1_)[:, None] + 0.5 - py
                dd = np.hypot(gx, gy) / pr
                m = np.clip(1.2 - dd, 0, 1) * 0.85 + np.exp(-(dd / 2.5) ** 2) * 0.3
                sub = rgba[y0_:y1_, x0_:x1_]
                sub[..., 3] = np.maximum(sub[..., 3], m)
                sub[..., :3] = np.where(m[..., None] > 0.2, np.array([1.0, 0.97, 0.88]), sub[..., :3])
        self.pon(rgba, 0, 0, id_, nombre, fija=True)

    def marco(self, margen=34, irreg=1.0, semilla=99, acuarela=False, blooms=None):
        """The edge where the painting meets the calendar's bone paper: a top layer, fixed.
        acuarela=True: the wash stops at a ragged edge with a slightly darker rim of pooled
        pigment, and outside is bare paper with no fog in between."""
        s = self.s
        X = (np.arange(self.W, dtype=np.float32) + 0.5)[None, :] / s
        Y = (np.arange(self.H, dtype=np.float32) + 0.5)[:, None] / s
        dd = np.minimum(np.minimum(X, BASE_W - X), np.minimum(Y, BASE_H - Y))
        n = self.lienzo.fbm(0, 0, self.W, self.H, 120, semilla, 2)
        rgba = np.zeros((self.H, self.W, 4), np.float32)
        rgba[..., :3] = self.papel
        if acuarela:
            lz = self.lienzo
            n2 = lz.ruido(0, 0, self.W, self.H, 14, semilla + 5)
            n3 = lz.ruido(0, 0, self.W, self.H, 4.5, semilla + 6)          # small jumps every few units
            d = (dd - margen + irreg * margen * 0.9 * (n - 0.5) * 2 + margen * 0.25 * (n2 - 0.5)
                 + 5.0 * (n3 - 0.5) * 2)
            fuera = 1 - _ss(d, -0.6, 0.6)                                    # bare paper outside the edge
            hay = _ss(lz.ruido(0, 0, self.W, self.H, 40, semilla + 7), 0.42, 0.6)   # pigment pooled on part of it
            borde = np.exp(-((d - 1.6) / 1.4) ** 2) * (1 - fuera) * hay
            for (cx, cy, r) in (blooms or []):                               # cauliflowers on the edge
                dist = np.hypot(X - cx, Y - cy)
                # a soft, broken ring where the water pushed the pigment back: never a drawn circle
                anillo = np.exp(-((dist - r) / 2.2) ** 2) * (dist < r * 1.15) * _ss(n2, 0.35, 0.65)
                borde = np.maximum(borde, anillo * (1 - fuera) * 0.45)
            oscuro = self.img * 0.72                                         # the wash itself, concentrated
            rgba[..., :3] = rgba[..., :3] * fuera[..., None] + oscuro * (1 - fuera[..., None])
            rgba[..., 3] = np.clip(fuera + 0.32 * borde, 0, 1)
            self.pon(rgba, 0, 0, 'marco', 'El borde de papel', fija=True)
            return
        F = _ss(dd + irreg * margen * 0.9 * (n - 0.5) * 2, margen * 0.1, margen * 1.6)
        rgba[..., 3] = 1 - F
        self.pon(rgba, 0, 0, 'marco', 'El borde de papel', fija=True)

    # ---------------------------------------------------------------- output
    def imagen(self):
        return (np.clip(self.img, 0, 1) * 255 + 0.5).astype(np.uint8)

    def guardar(self, ruta, carpeta=None, calidad_capas=88):
        im = Image.fromarray(self.imagen())
        if ruta.lower().endswith(('.jpg', '.jpeg')):
            im.save(ruta, quality=90, subsampling=0, keep_rgb=True)
        else:
            im.save(ruta)
        if carpeta:
            os.makedirs(carpeta, exist_ok=True)
            Image.fromarray((np.clip(self.fondo, 0, 1) * 255 + 0.5).astype(np.uint8)).save(
                os.path.join(carpeta, 'fondo.jpg'), quality=85, subsampling=0, keep_rgb=True)
            capas = []
            for c in self.lista:
                nombre_f = f"{c['id']}.webp"
                Image.fromarray(c['rgba'], 'RGBA').save(os.path.join(carpeta, nombre_f), 'WEBP', quality=calidad_capas, method=6)
                d = dict(id=c['id'], nombre=c['nombre'], src=nombre_f,
                         x=round(c['x0'] / self.W, 5), y=round(c['y0'] / self.H, 5),
                         w=round((c['x1'] - c['x0']) / self.W, 5), h=round((c['y1'] - c['y0']) / self.H, 5))
                if c['fija']:
                    d['fija'] = True
                capas.append(d)
            with open(os.path.join(carpeta, 'capas.json'), 'w') as f:
                json.dump(dict(ancho=self.W, alto=self.H, fondo='fondo.jpg', capas=capas), f, ensure_ascii=False, indent=1)
            print(f'planos: {len(capas)} capas en {carpeta}')
        return im
