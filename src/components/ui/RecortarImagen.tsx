import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// RECORTAR UNA IMAGEN ANTES DE SUBIRLA (2026-10-18, petición de Eugenio)
// ============================================================================
// «Permite que una imagen que se sube a una portada se pueda recortar.» Se
// enseña la imagen con un marco encima: se arrastra para moverlo y se tira de
// sus esquinas para cambiar su tamaño, libre o con una proporción fija. Al
// aceptar, el trozo elegido se dibuja en un lienzo a su tamaño real (con un
// máximo) y sale como un archivo nuevo, que es lo que se sube. Sin librerías:
// es un marco, cuatro esquinas y un `drawImage`.

type Marco = { x: number; y: number; w: number; h: number };
type Gesto = { modo: 'mover' | 'nw' | 'ne' | 'sw' | 'se'; px: number; py: number; m: Marco };

const PROPORCIONES: Array<[string, number | null]> = [['Libre', null], ['Panorámica 3:1', 3], ['16:9', 16 / 9], ['4:3', 4 / 3], ['Cuadrada', 1]];
/** Lado mínimo del marco, en píxeles de pantalla. */
const MINIMO = 32;
/** Lado más largo de la imagen recortada: más no se ve y pesa mucho más. */
const LADO_MAXIMO = 2400;

export default function RecortarImagen({ fuente, titulo = 'Recortar la imagen', onListo, onCancelar }: {
  /** El archivo recién elegido, o la dirección de una imagen ya subida. */
  fuente: File | string;
  titulo?: string;
  onListo: (archivo: File) => void;
  onCancelar: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [tam, setTam] = useState<{ w: number; h: number } | null>(null);
  const [marco, setMarco] = useState<Marco | null>(null);
  const [proporcion, setProporcion] = useState<number | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const gesto = useRef<Gesto | null>(null);

  // La imagen se lee como un blob local: así el lienzo no queda «contaminado»
  // por otro origen y se puede exportar.
  useEffect(() => {
    let vivo = true;
    let propia: string | null = null;
    (async () => {
      try {
        const blob = typeof fuente === 'string' ? await (await fetch(fuente)).blob() : fuente;
        propia = URL.createObjectURL(blob);
        if (vivo) setUrl(propia);
      } catch {
        if (vivo) setFallo('No se ha podido abrir la imagen para recortarla.');
      }
    })();
    return () => { vivo = false; if (propia) URL.revokeObjectURL(propia); };
  }, [fuente]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape' && !trabajando) onCancelar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCancelar, trabajando]);

  const alCargar = () => {
    const el = img.current;
    if (!el) return;
    const w = el.clientWidth, h = el.clientHeight;
    setTam({ w, h });
    setMarco({ x: w * 0.05, y: h * 0.05, w: w * 0.9, h: h * 0.9 });
  };

  /** Dentro de la imagen y no más pequeño que el mínimo. */
  const dentro = (m: Marco): Marco => {
    if (!tam) return m;
    const w = Math.min(Math.max(m.w, MINIMO), tam.w);
    const h = Math.min(Math.max(m.h, MINIMO), tam.h);
    return { x: Math.min(Math.max(m.x, 0), tam.w - w), y: Math.min(Math.max(m.y, 0), tam.h - h), w, h };
  };

  /** Una proporción fija: el marco más grande que cabe, centrado donde estaba. */
  const elegirProporcion = (p: number | null) => {
    setProporcion(p);
    if (!p || !tam || !marco) return;
    let w = marco.w, h = w / p;
    if (h > tam.h) { h = tam.h; w = h * p; }
    if (w > tam.w) { w = tam.w; h = w / p; }
    setMarco(dentro({ x: marco.x + marco.w / 2 - w / 2, y: marco.y + marco.h / 2 - h / 2, w, h }));
  };

  const empezar = (modo: Gesto['modo']) => (e: React.PointerEvent) => {
    if (!marco) return;
    e.preventDefault(); e.stopPropagation();
    caja.current?.setPointerCapture(e.pointerId);
    gesto.current = { modo, px: e.clientX, py: e.clientY, m: marco };
  };

  const mover = (e: React.PointerEvent) => {
    const g = gesto.current;
    if (!g || !tam) return;
    const dx = e.clientX - g.px, dy = e.clientY - g.py, m = g.m;
    if (g.modo === 'mover') { setMarco(dentro({ ...m, x: m.x + dx, y: m.y + dy })); return; }
    // Cada esquina mueve sus dos lados; la contraria se queda quieta.
    const izq = g.modo === 'nw' || g.modo === 'sw', arriba = g.modo === 'nw' || g.modo === 'ne';
    const fijoX = izq ? m.x + m.w : m.x, fijoY = arriba ? m.y + m.h : m.y;
    let w = Math.max(MINIMO, izq ? m.w - dx : m.w + dx);
    let h = Math.max(MINIMO, arriba ? m.h - dy : m.h + dy);
    // Sin salirse de la imagen por el lado que se mueve.
    w = Math.min(w, izq ? fijoX : tam.w - fijoX);
    h = Math.min(h, arriba ? fijoY : tam.h - fijoY);
    if (proporcion) { if (w / h > proporcion) w = h * proporcion; else h = w / proporcion; }
    setMarco({ x: izq ? fijoX - w : fijoX, y: arriba ? fijoY - h : fijoY, w, h });
  };

  const recortar = () => {
    const el = img.current;
    if (!el || !marco || !tam) return;
    setTrabajando(true);
    const k = el.naturalWidth / tam.w;
    const sw = Math.round(marco.w * k), sh = Math.round(marco.h * k);
    const f = Math.min(1, LADO_MAXIMO / Math.max(sw, sh));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.max(1, Math.round(sw * f));
    lienzo.height = Math.max(1, Math.round(sh * f));
    lienzo.getContext('2d')!.drawImage(el, Math.round(marco.x * k), Math.round(marco.y * k), sw, sh, 0, 0, lienzo.width, lienzo.height);
    // Un PNG puede tener transparencia: se respeta. Lo demás, JPEG.
    const png = typeof fuente !== 'string' && fuente.type === 'image/png';
    const tipo = png ? 'image/png' : 'image/jpeg';
    lienzo.toBlob(b => {
      setTrabajando(false);
      if (!b) { setFallo('No se ha podido recortar la imagen.'); return; }
      onListo(new File([b], png ? 'recorte.png' : 'recorte.jpg', { type: tipo }));
    }, tipo, 0.9);
  };

  const esquina = (modo: Gesto['modo'], clase: string) => (
    <span onPointerDown={empezar(modo)} aria-hidden
      className={cn('absolute h-4 w-4 rounded-sm border-2 border-white bg-emerald-500 shadow', clase)} />
  );

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-4" onClick={() => !trabajando && onCancelar()}>
      <div role="dialog" aria-label={titulo} onClick={e => e.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <p className="mr-auto text-sm font-black text-slate-800">{titulo}</p>
          <div role="radiogroup" aria-label="Proporción" className="flex flex-wrap gap-1">
            {PROPORCIONES.map(([etiqueta, p]) => (
              <button key={etiqueta} type="button" role="radio" aria-checked={proporcion === p} onClick={() => elegirProporcion(p)}
                className={cn('h-8 rounded-lg px-2.5 text-[11px] font-bold transition-colors',
                  proporcion === p ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                {etiqueta}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-50 p-4">
          {fallo ? <p className="text-sm font-bold text-rose-600">{fallo}</p>
            : !url ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            : (
              <div ref={caja} className="relative inline-block select-none touch-none"
                onPointerMove={mover} onPointerUp={() => { gesto.current = null; }} onPointerCancel={() => { gesto.current = null; }}>
                <img ref={img} src={url} alt="" draggable={false} onLoad={alCargar}
                  className="block max-h-[60vh] max-w-full" />
                {marco && (
                  <div onPointerDown={empezar('mover')} aria-label="Zona que se queda" role="img"
                    className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(15,23,42,0.55)]"
                    style={{ left: marco.x, top: marco.y, width: marco.w, height: marco.h }}>
                    {esquina('nw', '-left-2 -top-2 cursor-nwse-resize')}
                    {esquina('ne', '-right-2 -top-2 cursor-nesw-resize')}
                    {esquina('sw', '-bottom-2 -left-2 cursor-nesw-resize')}
                    {esquina('se', '-bottom-2 -right-2 cursor-nwse-resize')}
                  </div>
                )}
              </div>
            )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
          <p className="text-[11px] text-slate-400">Arrastra el marco para moverlo y sus esquinas para cambiar el tamaño.</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCancelar} disabled={trabajando}
              className="h-10 rounded-lg px-3 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
            {typeof fuente !== 'string' && (
              <button type="button" onClick={() => onListo(fuente)} disabled={trabajando}
                className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">Usar sin recortar</button>
            )}
            <button type="button" onClick={recortar} disabled={trabajando || !marco}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40">
              {trabajando && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Recortar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
