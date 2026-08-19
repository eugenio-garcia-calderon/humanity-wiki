// ============================================================================
// VENTANAS (2026-08-19, petición de Eugenio: «quiero que en la APP haya
// ventanas donde en una ventana esté el juego, en otra pueda estar otra página
// de la app, y en otra el navegador propio»).
// ============================================================================
// Un escritorio dentro de la web: ventanas que se mueven, se cambian de tamaño,
// se maximizan y se cierran, cada una con algo dentro.
//
// LA DECISIÓN QUE MANDA SOBRE TODO LO DEMÁS: cada ventana es un `<iframe>` a
// una ruta de la propia app, NO el componente montado aquí dentro.
//
// Es lo que hace que esto sea posible de verdad:
//   - El juego 3D vive en su propio contexto: su WebGL, su bucle de dibujo y
//     su teclado no se pelean con los de otra ventana. Montarlo aquí dentro
//     significaría dos escenas three.js en el mismo árbol de React, con un
//     único `window` peleándose por las teclas.
//   - Mover una ventana NO vuelve a montar lo de dentro. Con componentes, cada
//     re-render del escritorio reiniciaría la página de dentro; con marcos,
//     arrastras y lo de dentro ni se entera.
//   - Una página se abre en una ventana sin tocar esa página.
//
// Lo que cuesta: cada ventana es una carga de la app (unos 200 ms y su memoria).
// Con tres o cuatro ventanas es un precio que no se nota; con veinte sí.
import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Minus, Square, Copy, Globe, Gamepad2, LayoutGrid, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';
import Navegador from './Navegador';

export interface Ventana {
  id: string;
  titulo: string;
  /** `app` = una ruta nuestra dentro de un marco. `navegador` = la web. */
  clase: 'app' | 'navegador';
  /** La ruta (app) o la dirección de partida (navegador). */
  destino: string;
  x: number; y: number; an: number; al: number;
  z: number;
  minimizada?: boolean;
  maximizada?: boolean;
}

const CLAVE = 'humanity:ventanas';
const BARRA = 34;          // alto de la barra de título
const MIN_AN = 320, MIN_AL = 220;

/** Lo que se puede abrir de un tirón. */
const ATAJOS: Array<{ id: string; titulo: string; clase: Ventana['clase']; destino: string; icono: React.ReactNode }> = [
  { id: 'juego', titulo: 'Juego Vital', clase: 'app', destino: '/juego', icono: <Gamepad2 className="w-3.5 h-3.5" /> },
  { id: 'navegador', titulo: 'Navegador', clase: 'navegador', destino: 'https://es.wikipedia.org/wiki/Portada', icono: <Globe className="w-3.5 h-3.5" /> },
  { id: 'mapa', titulo: 'Mapa', clase: 'app', destino: '/mapa', icono: <LayoutGrid className="w-3.5 h-3.5" /> },
  { id: 'grafos', titulo: 'Conocimiento', clase: 'app', destino: '/grafos', icono: <LayoutGrid className="w-3.5 h-3.5" /> },
  { id: 'mercado', titulo: 'Mercado', clase: 'app', destino: '/mercado', icono: <LayoutGrid className="w-3.5 h-3.5" /> },
  { id: 'documentos', titulo: 'Mi conocimiento', clase: 'app', destino: '/mi-conocimiento', icono: <LayoutGrid className="w-3.5 h-3.5" /> },
];

let contadorZ = 10;

export default function GestorVentanas({ onPaginaNavegador }: {
  /** Se avisa a la página de cuál es la web abierta: es lo que deja a la IA
   *  del chat SABER dónde estás mirando. */
  onPaginaNavegador?: (url: string | null) => void;
}) {
  const [ventanas, setVentanas] = useState<Ventana[]>(() => {
    try {
      const g = localStorage.getItem(CLAVE);
      if (g) {
        const v = JSON.parse(g) as Ventana[];
        if (Array.isArray(v) && v.length) {
          contadorZ = Math.max(10, ...v.map(x => x.z || 10)) + 1;
          return v;
        }
      }
    } catch { /* escritorio nuevo */ }
    // El primer escritorio trae el juego y el navegador, que es lo que pidió.
    return [
      { id: 'v1', titulo: 'Juego Vital', clase: 'app', destino: '/juego', x: 24, y: 24, an: 760, al: 520, z: 11 },
      { id: 'v2', titulo: 'Navegador', clase: 'navegador', destino: 'https://es.wikipedia.org/wiki/Portada', x: 500, y: 180, an: 720, al: 520, z: 12 },
    ];
  });
  const [menu, setMenu] = useState(false);

  // Se guarda con retraso: arrastrar una ventana dispara decenas de cambios
  // por segundo y escribir en localStorage en cada uno cuesta fotogramas.
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try { localStorage.setItem(CLAVE, JSON.stringify(ventanas)); } catch { /* lleno */ }
    }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [ventanas]);

  const alFrente = useCallback((id: string) => {
    setVentanas(vs => vs.map(v => (v.id === id ? { ...v, z: ++contadorZ, minimizada: false } : v)));
  }, []);

  const cambiar = useCallback((id: string, patch: Partial<Ventana>) => {
    setVentanas(vs => vs.map(v => (v.id === id ? { ...v, ...patch } : v)));
  }, []);

  const cerrar = useCallback((id: string) => {
    setVentanas(vs => vs.filter(v => v.id !== id));
  }, []);

  const abrir = useCallback((a: typeof ATAJOS[number]) => {
    setMenu(false);
    const id = `v${Date.now().toString(36)}`;
    // En cascada, para que la nueva no tape exactamente a la anterior.
    setVentanas(vs => {
      const n = vs.length;
      return [...vs, {
        id, titulo: a.titulo, clase: a.clase, destino: a.destino,
        x: 40 + (n % 6) * 34, y: 40 + (n % 6) * 30,
        an: 780, al: 540, z: ++contadorZ,
      }];
    });
  }, []);

  /**
   * Mover y redimensionar. Un solo camino para los dos: el ratón se captura en
   * la barra (o en la esquina) y hasta que se suelta manda ese gesto. Se usa
   * `setPointerCapture` para que salirse de la ventana con el ratón no cancele
   * el arrastre a mitad, que es el fallo clásico de estas cosas.
   */
  const empezarGesto = (e: React.PointerEvent, v: Ventana, modo: 'mover' | 'tamano') => {
    if (v.maximizada && modo === 'mover') return;
    e.preventDefault();
    alFrente(v.id);
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const x0 = e.clientX, y0 = e.clientY;
    const { x, y, an, al } = v;
    const mover = (ev: PointerEvent) => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (modo === 'mover') {
        cambiar(v.id, { x: Math.max(0, x + dx), y: Math.max(0, y + dy) });
      } else {
        cambiar(v.id, { an: Math.max(MIN_AN, an + dx), al: Math.max(MIN_AL, al + dy) });
      }
    };
    const soltar = () => {
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', soltar);
    };
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', soltar);
  };

  const visibles = ventanas.filter(v => !v.minimizada);

  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-200/60"
      style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '26px 26px' }}>

      {ventanas.length === 0 && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-sm font-bold text-slate-500">No hay ninguna ventana abierta.</p>
            <p className="text-xs text-slate-400 mt-1">Ábrelas desde el botón de abajo.</p>
          </div>
        </div>
      )}

      {visibles.map(v => (
        <div
          key={v.id}
          onPointerDown={() => alFrente(v.id)}
          className="absolute flex flex-col rounded-xl overflow-hidden bg-white border border-slate-300 shadow-2xl"
          style={v.maximizada
            ? { left: 0, top: 0, width: '100%', height: 'calc(100% - 3rem)', zIndex: v.z }
            : { left: v.x, top: v.y, width: v.an, height: v.al, zIndex: v.z }}
        >
          {/* Barra de título: de aquí se tira para mover */}
          <div
            onPointerDown={e => empezarGesto(e, v, 'mover')}
            onDoubleClick={() => cambiar(v.id, { maximizada: !v.maximizada })}
            className={cn('flex items-center gap-2 px-2.5 shrink-0 select-none touch-none border-b border-slate-200 bg-slate-50',
              !v.maximizada && 'cursor-grab active:cursor-grabbing')}
            style={{ height: BARRA }}
          >
            {v.clase === 'navegador'
              ? <Globe className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              : <Gamepad2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
            <span className="text-[11px] font-black text-slate-700 truncate">{v.titulo}</span>
            <div className="ml-auto flex items-center gap-0.5">
              <button onClick={() => cambiar(v.id, { minimizada: true })} title="Minimizar"
                className="w-6 h-6 grid place-items-center rounded hover:bg-slate-200 text-slate-500">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => cambiar(v.id, { maximizada: !v.maximizada })} title={v.maximizada ? 'Restaurar' : 'Maximizar'}
                className="w-6 h-6 grid place-items-center rounded hover:bg-slate-200 text-slate-500">
                {v.maximizada ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
              </button>
              <button onClick={() => cerrar(v.id)} title="Cerrar"
                className="w-6 h-6 grid place-items-center rounded hover:bg-rose-100 hover:text-rose-600 text-slate-500">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* El contenido */}
          <div className="flex-1 min-h-0 relative bg-white">
            {v.clase === 'navegador'
              ? <Navegador inicial={v.destino}
                  onTitulo={t => cambiar(v.id, { titulo: t })}
                  onUrl={u => { cambiar(v.id, { destino: u }); onPaginaNavegador?.(u); }} />
              : (
                <iframe
                  src={v.destino}
                  title={v.titulo}
                  className="w-full h-full border-0"
                  // Misma procedencia: es NUESTRA app, con su sesión. El
                  // navegador de fuera es el que va aislado (ver Navegador).
                  allow="autoplay; fullscreen; xr-spatial-tracking; clipboard-write"
                />
              )}
            {/* Tapadera durante el arrastre: sin esto, el marco se traga los
                eventos del ratón y la ventana se queda pegada al soltar. */}
          </div>

          {/* Esquina de tamaño */}
          {!v.maximizada && (
            <div
              onPointerDown={e => empezarGesto(e, v, 'tamano')}
              title="Arrastra para cambiar el tamaño"
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize touch-none"
              style={{ background: 'linear-gradient(135deg, transparent 50%, #94a3b8 50%)' }}
            />
          )}
        </div>
      ))}

      {/* La barra de abajo: lo abierto y el botón de abrir más */}
      <div className="absolute left-0 right-0 bottom-0 h-12 flex items-center gap-1.5 px-2 bg-white/90 backdrop-blur border-t border-slate-200"
        style={{ zIndex: 100000 }}>
        <div className="relative">
          <button
            onClick={() => setMenu(m => !m)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black"
          >
            <Plus className="w-3.5 h-3.5" />Abrir
          </button>
          {menu && (
            <div className="absolute bottom-full mb-2 left-0 w-56 p-1.5 rounded-xl bg-white border border-slate-200 shadow-2xl">
              {ATAJOS.map(a => (
                <button key={a.id} onClick={() => abrir(a)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-50 text-xs font-bold text-slate-600">
                  {a.icono}{a.titulo}
                </button>
              ))}
            </div>
          )}
        </div>

        {ventanas.map(v => (
          <button
            key={v.id}
            onClick={() => (v.minimizada ? alFrente(v.id) : cambiar(v.id, { minimizada: true }))}
            className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border max-w-[12rem] truncate',
              v.minimizada
                ? 'bg-white border-slate-200 text-slate-500'
                : 'bg-slate-100 border-slate-300 text-slate-700')}
          >
            {v.clase === 'navegador' ? <Globe className="w-3 h-3 shrink-0" /> : <Gamepad2 className="w-3 h-3 shrink-0" />}
            <span className="truncate">{v.titulo}</span>
          </button>
        ))}

        <span className="ml-auto text-[10px] text-slate-400 pr-1">
          Doble clic en la barra de una ventana para maximizarla
        </span>
      </div>
    </div>
  );
}
