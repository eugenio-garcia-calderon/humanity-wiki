import { useRef, useState } from 'react';
import { GripHorizontal } from 'lucide-react';

const MIN = 240;
const MAX = 2400;

/** PDF dentro de la página. Con `onAlto` (editor) un tirador inferior lo alarga. */
export default function PdfEmbebido({ url, titulo, alto, onAlto }: {
  url: string; titulo: string; alto?: number; onAlto?: (alto: number) => void;
}) {
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const inicio = useRef<{ y: number; alto: number } | null>(null);
  const actual = arrastrando ?? alto ?? Math.round(window.innerHeight * 0.7);
  const limitar = (v: number) => Math.min(MAX, Math.max(MIN, Math.round(v)));

  return (
    <div>
      <iframe src={url} title={titulo}
        className="block w-full rounded-t-xl border border-slate-200 bg-slate-50"
        style={{ height: actual, pointerEvents: arrastrando !== null ? 'none' : undefined, borderRadius: onAlto ? undefined : '0.75rem' }} />
      {onAlto && (
        <div role="separator" aria-label="Arrastra para cambiar el alto del PDF" title="Arrastra para cambiar el alto"
          className="h-4 grid place-items-center cursor-ns-resize touch-none rounded-b-xl border border-t-0 border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-700"
          onPointerDown={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); inicio.current = { y: e.clientY, alto: actual }; setArrastrando(actual); }}
          onPointerMove={e => { if (inicio.current) setArrastrando(limitar(inicio.current.alto + e.clientY - inicio.current.y)); }}
          onPointerUp={e => { if (!inicio.current) return; const v = limitar(inicio.current.alto + e.clientY - inicio.current.y); inicio.current = null; setArrastrando(null); onAlto(v); }}
          onPointerCancel={() => { inicio.current = null; setArrastrando(null); }}>
          <GripHorizontal className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
