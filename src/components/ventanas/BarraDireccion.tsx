// ============================================================================
// LA BARRA DE DIRECCIONES DE UNA VENTANA (2026-08-20, petición de Eugenio:
// «haz exactamente como en Chrome […] que tenga una URL debajo que corresponda
// con el árbol de donde está almacenada en la base de datos, por ejemplo
// humanity.wiki/eugeniolighthumanity/proyectos/camion-camper/tareas/baño», y
// «permite que aparezca las flechas de adelante y atrás»).
// ============================================================================
// NO enseña la ruta interna de React —«/paginas/KWMSKJJ98PDQ» no le dice nada
// a nadie— sino DÓNDE VIVE la cosa dentro del árbol: de quién es, de qué
// proyecto cuelga y qué es. Eso hay que preguntárselo a la base de datos
// (`GET /api/ruta`), porque la ruta sola no lo sabe.
//
// Cada trozo del camino es pulsable, como las migas de pan de GitHub: pulsar
// «camion-camper» te lleva al proyecto. Es una barra de direcciones que además
// funciona como mapa de dónde estás.
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Segmento { label: string; url?: string }

export default function BarraDireccion({
  ruta, puedeAtras, puedeAdelante, onAtras, onAdelante, onRecargar, onIr, onNombre,
  controles, onMover, onDobleClic, arrastrable, compacto,
}: {
  /** La ruta interna que se está viendo ahora en la ventana. */
  ruta: string;
  puedeAtras: boolean;
  puedeAdelante: boolean;
  onAtras: () => void;
  onAdelante: () => void;
  onRecargar: () => void;
  /** Pulsar un trozo del camino. */
  onIr: (destino: string) => void;
  /** Cómo se llama lo que hay abierto: el último trozo del camino, que ya
   *  tenemos. Sirve para que la PESTAÑA cambie de nombre al navegar, como en
   *  cualquier navegador, sin pedir nada más. */
  onNombre?: (nombre: string) => void;
  /** Los botones de la ventana (minimizar, maximizar, cerrar). Viven aquí
   *  desde que la barra de título desapareció por duplicar el nombre de la
   *  pestaña (Eugenio, 2026-08-20). */
  controles?: React.ReactNode;
  /** Esta barra es también de donde se tira para mover la ventana. */
  onMover?: (e: React.PointerEvent) => void;
  onDobleClic?: () => void;
  arrastrable?: boolean;
  /** En modo compacto la barra desaparece entera: solo quedan los botones. */
  compacto?: boolean;
}) {
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);

  useEffect(() => {
    if (!ruta) { setSegmentos([]); return; }
    let vivo = true;
    fetch(`/api/ruta?d=${encodeURIComponent(ruta)}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (!vivo) return;
        const segs: Segmento[] = Array.isArray(d?.segmentos) ? d.segmentos : [];
        setSegmentos(segs);
        const ultimo = segs[segs.length - 1]?.label;
        if (ultimo) onNombre?.(ultimo.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()));
      })
      // Si falla, se enseña la ruta cruda: mejor algo verdadero que un hueco.
      .catch(() => { if (vivo) setSegmentos([{ label: ruta.replace(/^\//, ''), url: ruta }]); });
    return () => { vivo = false; };
  }, [ruta]);

  const boton = 'w-5 h-5 grid place-items-center rounded transition-colors shrink-0';

  // COMPACTO: sin dirección ni flechas, solo los botones de la ventana en una
  // tira de 22 px. Es lo mínimo que puede quedar sin perder el poder cerrarla.
  if (compacto) {
    return (
      <div
        onPointerDown={onMover}
        onDoubleClick={onDobleClic}
        className={cn('flex items-center justify-end gap-0.5 px-1 h-[22px] shrink-0 border-b border-slate-200 bg-slate-50 select-none touch-none',
          arrastrable && 'cursor-grab active:cursor-grabbing')}
      >
        {controles}
      </div>
    );
  }

  return (
    <div
      onPointerDown={onMover}
      onDoubleClick={onDobleClic}
      className={cn('flex items-center gap-1 px-1.5 py-0.5 border-b border-slate-200 bg-white shrink-0 select-none touch-none',
        arrastrable && 'cursor-grab active:cursor-grabbing')}
    >
      <button onClick={onAtras} disabled={!puedeAtras} title="Atrás"
        className={cn(boton, puedeAtras ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 cursor-default')}>
        <ArrowLeft className="w-3 h-3" />
      </button>
      <button onClick={onAdelante} disabled={!puedeAdelante} title="Adelante"
        className={cn(boton, puedeAdelante ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 cursor-default')}>
        <ArrowRight className="w-3 h-3" />
      </button>
      <button onClick={onRecargar} title="Recargar"
        className={cn(boton, 'text-slate-500 hover:bg-slate-100')}>
        <RotateCw className="w-2.5 h-2.5" />
      </button>

      {/* La dirección. `select-all` para poder copiarla de un triple clic, como
          en un navegador de verdad. */}
      <div className="flex-1 min-w-0 ml-1 px-2.5 py-0.5 rounded-full bg-slate-100 flex items-center gap-0.5 overflow-x-auto select-all">
        <span className="text-[11px] text-slate-400 shrink-0">humanity.wiki</span>
        {segmentos.map((sg, i) => (
          <span key={i} className="flex items-center gap-0.5 shrink-0">
            <span className="text-[11px] text-slate-300">/</span>
            {sg.url ? (
              <button
                onClick={() => onIr(sg.url!)}
                className={cn('text-[11px] hover:underline truncate max-w-[12rem]',
                  i === segmentos.length - 1 ? 'font-bold text-slate-800' : 'text-slate-500')}
              >
                {sg.label}
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 truncate max-w-[10rem]">{sg.label}</span>
            )}
          </span>
        ))}
      </div>

      {controles && <div className="flex items-center gap-0.5 shrink-0 ml-1">{controles}</div>}
    </div>
  );
}
