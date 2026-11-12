"""
capas.py -- an illustration as separate, movable elements (2026-11-12).

Eugenio: «en las nuevas ilustraciones a partir de ahora, créalas de tal manera que
cada elemento de la ilustración puedas pincharlo y arrastrarlo… y hacerlo más
grande o más pequeño» -- first for June (Tecnología y Energía) and May (Arte).

The generators stay what they are: one script painting in order on one Lienzo.
A generator draws on `capas.lienzo` and marks where each element starts with
`capas.empieza(id, nombre)`; everything painted until the next mark is that
element. Every call goes to the real sheet AND to a clean twin sheet that only
holds the current element (same calls, same seeds), so each element is known
exactly as it looks over bare paper -- not tinted by what happened to be under
it, which matters as soon as someone drags it somewhere else. When the element
ends, the twin is "un-composited" against bare paper into a sprite with
transparency (the smallest alpha that, laid over paper, gives the twin back).

Output, in public/calendario-arte/capas/<name>/:
  fondo.jpg      the paper alone (everything painted before the first mark)
  <id>.webp      one sprite per element, cropped to what it paints
  capas.json     {ancho, alto, fondo, capas: [{id, nombre, src, x, y, w, h}]}
                 x, y, w, h as fractions of the sheet; capas in painting order
                 (first = furthest back).
The usual composite JPG is still written by the generator (thumbnails, covers).
"""
import json
import os

import numpy as np
from PIL import Image


class _Duo:
    """Forwards every drawing call to two canvases: the real sheet and a clean
    sheet that only ever holds the element being painted. Same calls, same
    order, so the noise seeds stay in step and the element comes out exactly as
    it is painted, but over bare paper, whatever happens to be under it.

    Reading and saving go to the real sheet only: `guardar` forwarded to both
    once wrote the twin over the finished picture -- the composite came out as
    bare paper with only the last element on it."""

    SOLO_PRINCIPAL = {'guardar', 'imagen', 'vineta'}

    def __init__(self, principal, aparte):
        object.__setattr__(self, '_p', principal)
        object.__setattr__(self, '_a', aparte)

    def __getattr__(self, nombre):
        v = getattr(self._p, nombre)
        if not callable(v) or nombre in _Duo.SOLO_PRINCIPAL:
            return v
        w = getattr(self._a, nombre)

        def ambos(*args, **kw):
            r = v(*args, **kw)
            w(*args, **kw)
            return r
        return ambos

    def __setattr__(self, nombre, valor):
        setattr(self._p, nombre, valor)
        setattr(self._a, nombre, valor)


class Capas:
    def __init__(self, lz, activo=True):
        self.lz = lz
        self.activo = activo
        self.lista = []
        self.actual = None
        self.antes = None
        self.fondo = None
        self.aparte = None
        self.lienzo = lz
        if activo:
            from acuarela import Lienzo
            self.aparte = Lienzo(lz.W, semilla=lz.semilla)
            self.aparte.papel = lz.papel
            self.aparte.grano = lz.grano
            self.lienzo = _Duo(lz, self.aparte)
            self.papel = self.aparte.imagen().astype(np.float32) / 255.0

    def _foto(self):
        return self.lz.imagen().astype(np.float32) / 255.0

    def _limpia_aparte(self):
        a = self.aparte
        a.T[:] = 1
        a.LUZ[:] = 0
        a.OP[:] = 0
        a._n = self.lz._n

    def empieza(self, id_, nombre):
        """Close the element being painted (if any) and start a new one."""
        if not self.activo:
            return
        if self.actual is None and self.fondo is None:
            self.fondo = self._foto()
        elif self.actual is not None:
            self._cierra()
        self.actual = (id_, nombre)
        self._limpia_aparte()

    def termina(self):
        """Close the last element. Call it before the vignette: the vignette
        belongs to the composite picture, not to any element."""
        if not self.activo or self.actual is None:
            return
        self._cierra()
        self.actual = None

    def _cierra(self):
        # the element alone over bare paper, un-composited against that same paper
        A = self.aparte.imagen().astype(np.float32) / 255.0
        B = self.papel
        d = A - B
        up = np.where(d > 0, d / np.maximum(1 - B, 1e-4), 0)
        dn = np.where(d < 0, -d / np.maximum(B, 1e-4), 0)
        a = np.clip(np.maximum(up, dn).max(axis=2), 0, 1)
        a[a < 0.008] = 0
        ys, xs = np.nonzero(a)
        id_, nombre = self.actual
        if len(xs) == 0:
            print(f'capas: «{id_}» no pinta nada; se omite')
            return
        H, W = a.shape
        x0, x1 = max(0, xs.min() - 3), min(W, xs.max() + 4)
        y0, y1 = max(0, ys.min() - 3), min(H, ys.max() + 4)
        aa = a[y0:y1, x0:x1]
        C = B[y0:y1, x0:x1] + d[y0:y1, x0:x1] / np.maximum(aa, 1e-4)[..., None]
        C = np.where(aa[..., None] > 0, np.clip(C, 0, 1), 0)
        rgba = np.concatenate([C, aa[..., None]], axis=2)
        self.lista.append(dict(id=id_, nombre=nombre, rgba=(rgba * 255 + 0.5).astype(np.uint8), x0=x0, y0=y0, x1=x1, y1=y1))

    def guardar(self, carpeta, calidad=88):
        if not self.activo:
            return
        os.makedirs(carpeta, exist_ok=True)
        H, W = self.fondo.shape[:2]
        Image.fromarray((self.fondo * 255 + 0.5).astype(np.uint8)).save(
            os.path.join(carpeta, 'fondo.jpg'), quality=85, subsampling=0, keep_rgb=True)
        capas = []
        for c in self.lista:
            nombre_f = f"{c['id']}.webp"
            Image.fromarray(c['rgba'], 'RGBA').save(os.path.join(carpeta, nombre_f), 'WEBP', quality=calidad, method=6)
            capas.append(dict(id=c['id'], nombre=c['nombre'], src=nombre_f,
                              x=round(c['x0'] / W, 5), y=round(c['y0'] / H, 5),
                              w=round((c['x1'] - c['x0']) / W, 5), h=round((c['y1'] - c['y0']) / H, 5)))
        with open(os.path.join(carpeta, 'capas.json'), 'w') as f:
            json.dump(dict(ancho=W, alto=H, fondo='fondo.jpg', capas=capas), f, ensure_ascii=False, indent=1)
        print(f'capas: {len(capas)} elementos en {carpeta}')
