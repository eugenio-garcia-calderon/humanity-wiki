import {
  MousePointer2, Hand, Undo2, Redo2, Grid2x2, ZoomIn, ZoomOut, Maximize, Keyboard, X,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// BARRA INFERIOR DEL LIENZO — modo, deshacer, rejilla y zoom (2026-08-22)
// ============================================================================
// Sustituye a los `Controls` de React Flow, que solo traían zoom y encuadre.
// Aquí está lo que se toca todo el rato en un mural: con qué gesto trabaja el
// ratón, deshacer, la rejilla y el zoom, más la chuleta de atajos.
//
// EL MODO es el cambio de fondo. En React Flow, arrastrar con el botón
// izquierdo sobre el vacío MUEVE el lienzo; en Miro DIBUJA UN RECTÁNGULO DE
// SELECCIÓN, y el lienzo se mueve con la barra espaciadora, la rueda o el
// botón central. Quien edita empieza en modo selección —es lo que espera— y
// quien solo mira, en modo mano, que es lo único que puede hacer.

export type ModoLienzo = 'seleccion' | 'mano';

export interface BarraLienzoProps {
  modo: ModoLienzo;
  onModo: (m: ModoLienzo) => void;
  puedeEditar: boolean;
  rejilla: boolean;
  onRejilla: (v: boolean) => void;
  zoom: number;
  onZoom: (delta: 'mas' | 'menos' | 'cien') => void;
  onEncajar: () => void;
  /** La chuleta la abre también la tecla «?», que vive en el lienzo. */
  atajos: boolean;
  onAtajos: (v: boolean) => void;
  historial: {
    puedeDeshacer: boolean;
    puedeRehacer: boolean;
    proximoDeshacer: string | null;
    proximoRehacer: string | null;
    deshacer: () => void;
    rehacer: () => void;
  };
}

/** Las teclas, tal y como se las explicamos a quien abre la chuleta. */
const ATAJOS: Array<{ grupo: string; filas: Array<[string, string]> }> = [
  {
    grupo: 'Moverse',
    filas: [
      ['Espacio + arrastrar', 'Mover el lienzo'],
      ['Rueda / dos dedos', 'Mover el lienzo'],
      ['⌘/Ctrl + rueda', 'Acercar y alejar'],
      ['⌘/Ctrl + 0', 'Zoom al 100 %'],
      ['⌘/Ctrl + 1', 'Encajar todo en pantalla'],
    ],
  },
  {
    grupo: 'Marcar',
    filas: [
      ['Arrastrar sobre el vacío', 'Marcar por rectángulo'],
      ['Mayús + clic', 'Añadir o quitar de la selección'],
      ['⌘/Ctrl + A', 'Marcar todo'],
      ['Esc', 'Desmarcar'],
    ],
  },
  {
    grupo: 'Trabajar',
    filas: [
      ['⌘/Ctrl + Z', 'Deshacer'],
      ['⌘/Ctrl + Mayús + Z', 'Rehacer'],
      ['⌘/Ctrl + D', 'Duplicar lo marcado'],
      ['⌘/Ctrl + V', 'Pegar donde está el ratón'],
      ['Supr / Retroceso', 'Quitar del lienzo'],
      ['Flechas', 'Mover 1 px'],
      ['Mayús + flechas', 'Mover 10 px'],
      ['L', 'Bloquear o soltar'],
      ['?', 'Esta chuleta'],
    ],
  },
];

export default function BarraLienzo(p: BarraLienzoProps) {
  const btn = 'w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 disabled:opacity-30 disabled:hover:bg-transparent';
  const sep = <span className="w-px h-5 bg-slate-200 shrink-0" />;

  return (
    <>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-xl px-1.5 py-1.5 flex items-center gap-0.5">
        {p.puedeEditar && (
          <>
            <button
              onClick={() => p.onModo('seleccion')}
              title="Marcar — arrastra sobre el vacío para marcar por rectángulo"
              className={cn(btn, p.modo === 'seleccion' && '!bg-slate-900 !text-white')}
            >
              <MousePointer2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => p.onModo('mano')}
              title="Mover el lienzo (o mantén el espacio pulsado)"
              className={cn(btn, p.modo === 'mano' && '!bg-slate-900 !text-white')}
            >
              <Hand className="w-4 h-4" />
            </button>
            {sep}
            <button
              onClick={p.historial.deshacer}
              disabled={!p.historial.puedeDeshacer}
              title={p.historial.proximoDeshacer ? `Deshacer: ${p.historial.proximoDeshacer} (⌘Z)` : 'Nada que deshacer'}
              className={btn}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={p.historial.rehacer}
              disabled={!p.historial.puedeRehacer}
              title={p.historial.proximoRehacer ? `Rehacer: ${p.historial.proximoRehacer} (⌘⇧Z)` : 'Nada que rehacer'}
              className={btn}
            >
              <Redo2 className="w-4 h-4" />
            </button>
            {sep}
            <button
              onClick={() => p.onRejilla(!p.rejilla)}
              title={p.rejilla ? 'Rejilla activada — lo que muevas se pega a ella' : 'Pegar a la rejilla'}
              className={cn(btn, p.rejilla && '!bg-emerald-600 !text-white')}
            >
              <Grid2x2 className="w-4 h-4" />
            </button>
            {sep}
          </>
        )}

        <button onClick={() => p.onZoom('menos')} title="Alejar" className={btn}><ZoomOut className="w-4 h-4" /></button>
        <button
          onClick={() => p.onZoom('cien')}
          title="Zoom al 100 % (⌘0)"
          className="px-2 h-8 rounded-lg text-[11px] font-black text-slate-600 hover:bg-slate-100 tabular-nums shrink-0"
        >
          {Math.round(p.zoom * 100)}%
        </button>
        <button onClick={() => p.onZoom('mas')} title="Acercar" className={btn}><ZoomIn className="w-4 h-4" /></button>
        <button onClick={p.onEncajar} title="Encajar todo en pantalla (⌘1)" className={btn}><Maximize className="w-4 h-4" /></button>
        {sep}
        <button onClick={() => p.onAtajos(true)} title="Atajos de teclado (?)" className={btn}><Keyboard className="w-4 h-4" /></button>
      </div>

      {p.atajos && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => p.onAtajos(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-emerald-600" /> Atajos del lienzo
              </h2>
              <button onClick={() => p.onAtajos(false)} className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-50">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {ATAJOS.map(g => (
                <div key={g.grupo}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1.5">{g.grupo}</p>
                  <div className="space-y-0.5">
                    {g.filas.map(([tecla, que]) => (
                      <div key={tecla} className="flex items-center justify-between gap-4 text-xs py-1 border-b border-slate-50 last:border-0">
                        <kbd className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 shrink-0">{tecla}</kbd>
                        <span className="text-slate-500 text-right">{que}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
