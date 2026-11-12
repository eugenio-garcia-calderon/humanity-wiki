// ============================================================================
// LA ILUSTRACIÓN COMO MURAL: ELEMENTOS QUE SE MUEVEN (2026-11-12, Eugenio)
// ============================================================================
// «Que cada elemento de la ilustración puedas pincharlo y arrastrarlo y
// cambiarlo de posición, y también hacer clic y que se pueda agrandar o hacer
// más pequeño… y un botón de añadir elemento… como si fuese un mural, como el
// Miro.» De momento: Tecnología y Energía (junio) y Arte (mayo), Diseño 4.
//
// La ilustración llega por piezas (capas.py la separa al dibujarla): el papel y
// un WebP con transparencia por elemento. Aquí se montan en su sitio, encima se
// aplican los ajustes guardados (movido, tamaño) y las imágenes añadidas.
//
// Cómo se usa, en pantalla y editando:
//   · arrastrar un elemento lo mueve;
//   · pincharlo lo selecciona: aparece un marco con un tirador para agrandarlo
//     o achicarlo, y botones −, +, «Como estaba» (o «Quitar» si es añadido);
//   · «Añadir elemento» abre el diálogo de siempre (pegar, soltar, archivo).
// Se elige el elemento por su dibujo, no por su caja: pinchar el cielo vacío
// junto al girasol no coge el girasol.
//
// En «Vista final», en pantalla completa y al imprimir no se puede tocar nada:
// se pinta igual, con los ajustes, y es lo que sale en el papel.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ImagePlus, Minus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '../ui/core';
import SoltarImagen from '../ui/SoltarImagen';
import type { AjusteCapa, ComposicionDiseno, ElementoAnadido } from '../../data/calendarioArteTipos';
import { CAPAS_ILUSTRACIONES, carpetaCapas } from '../../data/calendarioArteCapas';
import { subirImagenCalendario } from './subirImagen';

interface Props {
  clave: string;
  ajustes?: ComposicionDiseno;
  /** Solo en pantalla, editando y con este diseño a la vista. */
  editable?: boolean;
  alCambiar?: (c: ComposicionDiseno) => void;
  perezosa?: boolean;
  alt?: string;
  /** Qué parte se ve cuando el hueco recorta la hoja, como `object-position`
   *  en % (lo que se ajusta en «Encuadre»). Por defecto, el centro. */
  posX?: number;
  posY?: number;
}

type Sel = { tipo: 'capa' | 'extra'; id: string } | null;
/** Una caja en fracciones de la hoja. */
interface Caja { x: number; y: number; w: number; h: number }

const ESC_MIN = 0.2;
const ESC_MAX = 4;
const r4 = (v: number) => Math.round(v * 10000) / 10000;
const limita = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Las máscaras de transparencia, para elegir el elemento por su dibujo.
 *  Pequeñas (como mucho 256 px): basta para saber si ahí hay pintura. */
interface Mascara { w: number; h: number; a: Uint8ClampedArray; umbral: number }
const mascaras = new Map<string, Promise<Mascara | null>>();
function mascara(src: string) {
  let p = mascaras.get(src);
  if (!p) {
    p = new Promise(res => {
      const im = new Image();
      im.onload = () => {
        try {
          const k = Math.min(1, 256 / Math.max(im.naturalWidth, im.naturalHeight));
          const w = Math.max(1, Math.round(im.naturalWidth * k));
          const h = Math.max(1, Math.round(im.naturalHeight * k));
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          const ctx = cv.getContext('2d', { willReadFrequently: true })!;
          ctx.drawImage(im, 0, 0, w, h);
          const d = ctx.getImageData(0, 0, w, h).data;
          const a = new Uint8ClampedArray(w * h);
          let max = 0;
          for (let i = 0; i < w * h; i++) { a[i] = d[i * 4 + 3]; if (a[i] > max) max = a[i]; }
          // Un sol que es solo resplandor no llega nunca a ser opaco: cuenta como
          // pintura lo que pase de la mitad de su parte más densa.
          res({ w, h, a, umbral: Math.min(90, max * 0.5) });
        } catch { res(null); }
      };
      im.onerror = () => res(null);
      im.src = src;
    });
    mascaras.set(src, p);
  }
  return p;
}

/** Proporción (alto/ancho) de las imágenes añadidas, para dibujar su caja. */
const proporciones = new Map<string, number>();

export function Composicion({ clave, ajustes, editable, alCambiar, perezosa, alt, posX = 50, posY = 50 }: Props) {
  const m = CAPAS_ILUSTRACIONES[clave];
  const base = carpetaCapas(clave);
  const marco = useRef<HTMLDivElement>(null);
  const escenario = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState<{ w: number; h: number; W: number; H: number } | null>(null);
  // Mientras se arrastra se pinta lo local; al soltar se guarda.
  const [local, setLocal] = useState<ComposicionDiseno>(ajustes ?? {});
  const arrastrando = useRef(false);
  useEffect(() => { if (!arrastrando.current) setLocal(ajustes ?? {}); }, [ajustes]);
  const [sel, setSel] = useState<Sel>(null);
  const [dialogo, setDialogo] = useState(false);
  const [, refrescar] = useState(0);
  const masc = useRef(new Map<string, Mascara | null>());

  // El escenario cubre su hueco como `object-cover`: misma proporción que la
  // hoja dibujada, centrado, recortando lo que sobre por un lado.
  useLayoutEffect(() => {
    const el = marco.current;
    if (!el || !m) return;
    const medir = () => {
      const W = el.clientWidth, Hh = el.clientHeight;
      const r = m.ancho / m.alto;
      const w = Math.max(W, Hh * r);
      setTam({ w, h: w / r, W, H: Hh });
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [m]);

  // Las máscaras solo hacen falta para editar.
  useEffect(() => {
    if (!editable || !m) return;
    let vivo = true;
    for (const c of m.capas) {
      mascara(base + c.src).then(r => { if (vivo) masc.current.set(c.id, r); });
    }
    return () => { vivo = false; };
  }, [editable, m, base]);

  useEffect(() => { if (!editable) setSel(null); }, [editable]);

  const cajaCapa = useCallback((id: string): Caja | null => {
    const c = m?.capas.find(k => k.id === id);
    if (!c) return null;
    const a: AjusteCapa = local.capas?.[id] ?? {};
    const e = a.escala ?? 1;
    const cx = c.x + c.w / 2 + (a.dx ?? 0);
    const cy = c.y + c.h / 2 + (a.dy ?? 0);
    return { x: cx - (c.w * e) / 2, y: cy - (c.h * e) / 2, w: c.w * e, h: c.h * e };
  }, [m, local]);

  const cajaExtra = useCallback((e: ElementoAnadido): Caja => {
    const prop = proporciones.get(e.src) ?? 1;
    const r = m ? m.ancho / m.alto : 1.75;
    const h = e.ancho * prop * r;
    return { x: e.x - e.ancho / 2, y: e.y - h / 2, w: e.ancho, h };
  }, [m]);

  if (!m) return null;

  // ── elegir por el dibujo ─────────────────────────────────────────────────
  const aFraccion = (ev: { clientX: number; clientY: number }) => {
    const r = escenario.current!.getBoundingClientRect();
    return { u: (ev.clientX - r.left) / r.width, v: (ev.clientY - r.top) / r.height };
  };
  const dentro = (k: Caja, u: number, v: number) => u >= k.x && u <= k.x + k.w && v >= k.y && v <= k.y + k.h;
  /** ¿Hay pintura de esta capa en (u, v), o a menos de `radio` px de pantalla? */
  const pintado = (id: string, u: number, v: number, radio: number) => {
    const k = cajaCapa(id)!;
    const mk = masc.current.get(id);
    if (!mk) return false;
    const anchoPx = escenario.current!.getBoundingClientRect().width * k.w;
    const r = Math.ceil((radio * mk.w) / Math.max(1, anchoPx));
    const px = Math.floor(((u - k.x) / k.w) * mk.w);
    const py = Math.floor(((v - k.y) / k.h) * mk.h);
    for (let y = py - r; y <= py + r; y++) {
      if (y < 0 || y >= mk.h) continue;
      for (let x = px - r; x <= px + r; x++) {
        if (x < 0 || x >= mk.w) continue;
        if (mk.a[y * mk.w + x] > mk.umbral) return true;
      }
    }
    return false;
  };
  const queHay = (u: number, v: number): Sel => {
    const extra = local.extra ?? [];
    for (let i = extra.length - 1; i >= 0; i--) if (dentro(cajaExtra(extra[i]), u, v)) return { tipo: 'extra', id: extra[i].id };
    // Primero lo que está justo debajo del dedo; si no hay nada, lo que pasa
    // muy cerca (un hilo, un planeador o la estela son finos de acertar).
    for (const radio of [0, 8]) {
      for (let i = m.capas.length - 1; i >= 0; i--) {
        const c = m.capas[i];
        if (pintado(c.id, u, v, radio)) return { tipo: 'capa', id: c.id };
      }
    }
    return null;
  };

  // ── mover y cambiar de tamaño ────────────────────────────────────────────
  const guardar = (c: ComposicionDiseno) => { alCambiar?.(c); };
  const ajustar = (s: NonNullable<Sel>, f: (prev: { dx: number; dy: number; escala: number }) => { dx: number; dy: number; escala: number }, prev: ComposicionDiseno = local): ComposicionDiseno => {
    if (s.tipo === 'capa') {
      const a = prev.capas?.[s.id] ?? {};
      const n = f({ dx: a.dx ?? 0, dy: a.dy ?? 0, escala: a.escala ?? 1 });
      return { ...prev, capas: { ...(prev.capas ?? {}), [s.id]: { dx: r4(n.dx), dy: r4(n.dy), escala: r4(limita(n.escala, ESC_MIN, ESC_MAX)) } } };
    }
    const extra = (prev.extra ?? []).map(e => {
      if (e.id !== s.id) return e;
      const n = f({ dx: e.x, dy: e.y, escala: e.ancho });
      return { ...e, x: r4(limita(n.dx, -0.2, 1.2)), y: r4(limita(n.dy, -0.2, 1.2)), ancho: r4(limita(n.escala, 0.02, 1.5)) };
    });
    return { ...prev, extra };
  };

  const empezarArrastre = (ev: React.PointerEvent) => {
    if (!editable || ev.button > 0) return;
    const { u, v } = aFraccion(ev);
    const hit = queHay(u, v);
    if (!hit) { setSel(null); return; }
    // Con el dedo, el primer toque solo elige (y la página puede seguir
    // desplazándose); el siguiente ya arrastra.
    const yaElegido = sel && sel.tipo === hit.tipo && sel.id === hit.id;
    setSel(hit);
    if (ev.pointerType === 'touch' && !yaElegido) return;
    ev.preventDefault();
    const el = escenario.current!;
    try { el.setPointerCapture(ev.pointerId); } catch { /* puntero ya suelto */ }
    arrastrando.current = true;
    const inicio = local;
    let ultimo = inicio;
    let movido = false;
    const mover = (e: PointerEvent) => {
      const p = aFraccion(e);
      const du = p.u - u, dv = p.v - v;
      if (Math.abs(du) + Math.abs(dv) > 0.002) movido = true;
      ultimo = ajustar(hit, a => ({ ...a, dx: a.dx + du, dy: a.dy + dv }), inicio);
      setLocal(ultimo);
    };
    const soltar = () => {
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', soltar);
      el.removeEventListener('pointercancel', soltar);
      arrastrando.current = false;
      if (movido) guardar(ultimo);
    };
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
  };

  /** El tirador de la esquina: la distancia al centro manda el tamaño. */
  const empezarEscala = (ev: React.PointerEvent, k: Caja) => {
    if (!sel) return;
    ev.preventDefault();
    ev.stopPropagation();
    const el = escenario.current!;
    try { el.setPointerCapture(ev.pointerId); } catch { /* puntero ya suelto */ }
    arrastrando.current = true;
    const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
    const r = el.getBoundingClientRect();
    const dist = (p: { u: number; v: number }) => Math.hypot((p.u - cx) * r.width, (p.v - cy) * r.height);
    const d0 = Math.max(4, dist(aFraccion(ev)));
    const inicio = local;
    let ultimo = inicio;
    const s = sel;
    const mover = (e: PointerEvent) => {
      const f = dist(aFraccion(e)) / d0;
      ultimo = ajustar(s, a => ({ ...a, escala: a.escala * f }), inicio);
      setLocal(ultimo);
    };
    const soltar = () => {
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', soltar);
      el.removeEventListener('pointercancel', soltar);
      arrastrando.current = false;
      guardar(ultimo);
    };
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
  };

  const escalarCon = (f: number) => {
    if (!sel) return;
    const n = ajustar(sel, a => ({ ...a, escala: a.escala * f }));
    setLocal(n); guardar(n);
  };
  const comoEstaba = () => {
    if (!sel || sel.tipo !== 'capa') return;
    const capas = { ...(local.capas ?? {}) };
    delete capas[sel.id];
    const n = { ...local, capas };
    setLocal(n); guardar(n);
  };
  const quitar = () => {
    if (!sel || sel.tipo !== 'extra') return;
    const n = { ...local, extra: (local.extra ?? []).filter(e => e.id !== sel.id) };
    setSel(null); setLocal(n); guardar(n);
  };

  // ── añadir una imagen, como en un mural ──────────────────────────────────
  const anadir = async (f: File): Promise<string | void> => {
    // Un PNG o WebP recortado conserva su transparencia: se sube tal cual.
    // Una foto se comprime, como las referencias.
    const conTransparencia = /image\/(png|webp|gif)/.test(f.type) && f.size < 10 * 1024 * 1024;
    const r = await subirImagenCalendario(f, { original: conTransparencia });
    if ('error' in r) return r.error;
    const prop = await new Promise<number>(res => {
      const im = new Image();
      im.onload = () => res(im.naturalHeight / Math.max(1, im.naturalWidth));
      im.onerror = () => res(1);
      im.src = r.url;
    });
    proporciones.set(r.url, prop);
    const e: ElementoAnadido = { id: `e${Date.now().toString(36)}`, src: r.url, x: 0.5, y: 0.5, ancho: 0.2 };
    const n = { ...local, extra: [...(local.extra ?? []), e] };
    setLocal(n); guardar(n);
    setSel({ tipo: 'extra', id: e.id });
  };

  const pc = (v: number) => `${v * 100}%`;
  const cajaSel = sel ? (sel.tipo === 'capa' ? cajaCapa(sel.id) : (() => { const e = local.extra?.find(k => k.id === sel.id); return e ? cajaExtra(e) : null; })()) : null;
  const nombreSel = sel?.tipo === 'capa' ? m.capas.find(c => c.id === sel.id)?.nombre : 'Imagen añadida';

  return (
    <div ref={marco} className="absolute inset-0 overflow-hidden">
      <div
        ref={escenario}
        role="img"
        aria-label={alt}
        className="absolute"
        onPointerDown={empezarArrastre}
        style={{
          // Como object-cover + object-position: lo que sobra se recorta
          // repartido según posX/posY (50 % = centrado).
          left: tam ? `${(tam.W - tam.w) * (posX / 100)}px` : 0,
          top: tam ? `${(tam.H - tam.h) * (posY / 100)}px` : 0,
          width: tam ? `${tam.w}px` : '100%',
          height: tam ? `${tam.h}px` : undefined,
          aspectRatio: tam ? undefined : `${m.ancho} / ${m.alto}`,
          cursor: editable ? 'grab' : undefined,
          touchAction: editable && sel ? 'none' : undefined,
        }}
      >
        <img src={base + m.fondo} alt="" draggable={false} loading={perezosa ? 'lazy' : undefined}
          className="pointer-events-none absolute inset-0 h-full w-full select-none" />
        {m.capas.map(c => {
          const k = cajaCapa(c.id)!;
          return (
            <img key={c.id} src={base + c.src} alt="" draggable={false} loading={perezosa ? 'lazy' : undefined}
              className="pointer-events-none absolute max-w-none select-none"
              style={{ left: pc(k.x), top: pc(k.y), width: pc(k.w), height: pc(k.h) }} />
          );
        })}
        {(local.extra ?? []).map(e => {
          const k = cajaExtra(e);
          return (
            <img key={e.id} src={e.src} alt="" draggable={false}
              onLoad={ev => {
                const im = ev.currentTarget;
                const p = im.naturalHeight / Math.max(1, im.naturalWidth);
                if (proporciones.get(e.src) !== p) { proporciones.set(e.src, p); refrescar(n => n + 1); }
              }}
              className="pointer-events-none absolute max-w-none select-none"
              style={{ left: pc(k.x), top: pc(k.y), width: pc(k.w) }} />
          );
        })}
        {editable && sel && cajaSel && (
          <div className="ca-no-imprimir pointer-events-none absolute rounded-sm border-2 border-dashed border-sky-500"
            style={{ left: pc(cajaSel.x), top: pc(cajaSel.y), width: pc(cajaSel.w), height: pc(cajaSel.h) }}>
            <span
              onPointerDown={ev => empezarEscala(ev, cajaSel)}
              title="Arrastra para agrandar o achicar"
              className="pointer-events-auto absolute -bottom-2.5 -right-2.5 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-white bg-sky-500 shadow"
              style={{ touchAction: 'none' }}
            />
          </div>
        )}
      </div>

      {editable && (
        <div className="ca-no-imprimir absolute bottom-4 left-4 z-10 flex max-w-[70%] flex-wrap items-center gap-2 font-sans">
          {sel ? (
            <div className="flex items-center gap-1 rounded-full bg-white/95 p-1 pl-3 shadow-xl ring-1 ring-black/10" onPointerDown={ev => ev.stopPropagation()}>
              <span className="mr-1 max-w-[12rem] truncate text-sm font-semibold text-stone-700">{nombreSel}</span>
              <Button variant="ghost" className="h-8 w-8 rounded-full p-0" aria-label="Más pequeño" title="Más pequeño" onClick={() => escalarCon(1 / 1.15)}><Minus className="h-4 w-4" /></Button>
              <Button variant="ghost" className="h-8 w-8 rounded-full p-0" aria-label="Más grande" title="Más grande" onClick={() => escalarCon(1.15)}><Plus className="h-4 w-4" /></Button>
              {sel.tipo === 'capa' ? (
                <Button variant="ghost" className="gap-1 rounded-full px-3 py-1.5 text-sm normal-case tracking-normal" onClick={comoEstaba} title="Volver a su sitio y su tamaño"><RotateCcw className="h-4 w-4" />Como estaba</Button>
              ) : (
                <Button variant="ghost" className="gap-1 rounded-full px-3 py-1.5 text-sm normal-case tracking-normal text-rose-600" onClick={quitar}><Trash2 className="h-4 w-4" />Quitar</Button>
              )}
            </div>
          ) : (
            <span className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white">Arrastra un elemento para moverlo · púlsalo para cambiar su tamaño</span>
          )}
          <Button type="button" onClick={() => setDialogo(true)} className="gap-2 rounded-full shadow-xl" onPointerDown={ev => ev.stopPropagation()}>
            <ImagePlus className="h-4 w-4" />Añadir elemento
          </Button>
        </div>
      )}
      {dialogo && <SoltarImagen titulo="Añadir un elemento a la ilustración" onArchivo={anadir} onCerrar={() => setDialogo(false)} />}
    </div>
  );
}
