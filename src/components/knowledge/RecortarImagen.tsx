import { useRef, useState } from 'react';
import { Crop, X, RotateCcw } from 'lucide-react';

// ============================================================================
// RECORTAR una imagen del lienzo (2026-08-08)
// ============================================================================
// El recorte NO toca el archivo: se guarda como un rectángulo en porcentajes
// (`config.crop = {x, y, w, h}`) y la ventana lo aplica al pintar. Así el
// original queda intacto, el recorte se puede deshacer siempre, y la misma
// imagen puede verse recortada en un lienzo y entera en otro.

export interface Recorte { x: number; y: number; w: number; h: number }

export default function RecortarImagen({ url, inicial, onGuardar, onCerrar }: {
  url: string;
  inicial?: Recorte | null;
  onGuardar: (r: Recorte | null) => void;
  onCerrar: () => void;
}) {
  const [r, setR] = useState<Recorte>(inicial || { x: 0, y: 0, w: 100, h: 100 });
  const marco = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ modo: string; x0: number; y0: number; r0: Recorte } | null>(null);

  const pct = (e: React.PointerEvent) => {
    const b = marco.current!.getBoundingClientRect();
    return { x: ((e.clientX - b.left) / b.width) * 100, y: ((e.clientY - b.top) / b.height) * 100 };
  };

  const empezar = (modo: string) => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    const p = pct(e);
    arrastre.current = { modo, x0: p.x, y0: p.y, r0: { ...r } };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const mover = (e: React.PointerEvent) => {
    const a = arrastre.current;
    if (!a) return;
    const p = pct(e);
    const dx = p.x - a.x0, dy = p.y - a.y0;
    const lim = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    let n = { ...a.r0 };
    if (a.modo === 'mover') {
      n.x = lim(a.r0.x + dx, 0, 100 - a.r0.w);
      n.y = lim(a.r0.y + dy, 0, 100 - a.r0.h);
    } else {
      // Cada esquina mueve dos bordes; el mínimo evita recortes de cero.
      if (a.modo.includes('e')) n.w = lim(a.r0.w + dx, 8, 100 - a.r0.x);
      if (a.modo.includes('s')) n.h = lim(a.r0.h + dy, 8, 100 - a.r0.y);
      if (a.modo.includes('w')) { const nx = lim(a.r0.x + dx, 0, a.r0.x + a.r0.w - 8); n.w = a.r0.w + (a.r0.x - nx); n.x = nx; }
      if (a.modo.includes('n')) { const ny = lim(a.r0.y + dy, 0, a.r0.y + a.r0.h - 8); n.h = a.r0.h + (a.r0.y - ny); n.y = ny; }
    }
    setR(n);
  };

  const soltar = () => { arrastre.current = null; };

  const esquinas = [
    { m: 'nw', css: { left: 0, top: 0, cursor: 'nwse-resize' } },
    { m: 'ne', css: { right: 0, top: 0, cursor: 'nesw-resize' } },
    { m: 'sw', css: { left: 0, bottom: 0, cursor: 'nesw-resize' } },
    { m: 'se', css: { right: 0, bottom: 0, cursor: 'nwse-resize' } },
  ];

  const entero = r.x === 0 && r.y === 0 && r.w === 100 && r.h === 100;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-6" onClick={onCerrar}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 inline-flex items-center gap-1.5">
            <Crop className="w-4 h-4 text-emerald-600" /> Recortar imagen
          </h2>
          <button onClick={onCerrar} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <div
            ref={marco}
            className="relative select-none mx-auto max-h-[55vh] w-fit"
            onPointerMove={mover}
            onPointerUp={soltar}
            onPointerCancel={soltar}
          >
            <img src={url} alt="" className="block max-h-[55vh] rounded-xl" draggable={false} />
            {/* Lo que queda fuera se oscurece */}
            <div className="absolute inset-0 bg-slate-900/55 pointer-events-none rounded-xl" />
            <div
              className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0)] cursor-move"
              style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}
              onPointerDown={empezar('mover')}
            >
              <img
                src={url} alt="" draggable={false}
                className="absolute pointer-events-none max-w-none"
                style={{
                  width: `${(100 / r.w) * 100}%`,
                  height: `${(100 / r.h) * 100}%`,
                  left: `${-(r.x / r.w) * 100}%`,
                  top: `${-(r.y / r.h) * 100}%`,
                }}
              />
              {esquinas.map(c => (
                <div
                  key={c.m}
                  onPointerDown={empezar(c.m)}
                  className="absolute w-3.5 h-3.5 bg-white border-2 border-emerald-500 rounded-full"
                  style={{ ...c.css, transform: 'translate(-50%, -50%)', marginLeft: (c.css as any).right != null ? 0 : '50%' }}
                />
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-3">
            Arrastra el recuadro para mover el encuadre, o sus esquinas para ajustarlo.
            El archivo original no se toca.
          </p>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-100 flex justify-between items-center">
          <button
            onClick={() => setR({ x: 0, y: 0, w: 100, h: 100 })}
            disabled={entero}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 disabled:opacity-40 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Imagen entera
          </button>
          <div className="flex gap-2">
            <button onClick={onCerrar} className="px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              onClick={() => { onGuardar(entero ? null : r); onCerrar(); }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              Aplicar recorte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
