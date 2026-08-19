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
import {
  X, Minus, Square, Copy, Globe, Gamepad2, Map as MapIcon, Network, Compass,
  BrainCircuit, FolderKanban, Store, Orbit, ChevronLeft, ChevronRight,
} from 'lucide-react';
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
const BARRA = 34;          // alto de la barra de título de una ventana
/** Alto de la barra de ventanas de arriba: las ventanas empiezan por debajo. */
const BARRA_ARRIBA = 44;
const MIN_AN = 320, MIN_AL = 220;

/**
 * TODAS las secciones, en la línea de arriba (2026-08-19, petición de Eugenio:
 * «que esté todo en la línea superior, no en un menú secundario»). Cada una
 * abre su ventana; si ya está abierta, la trae al frente en vez de duplicarla —
 * dos ventanas del mismo mapa no le sirven a nadie.
 */
const ATAJOS: Array<{ id: string; titulo: string; corto: string; clase: Ventana['clase']; destino: string; icono: React.ReactNode }> = [
  { id: 'juego', titulo: 'Juego Vital', corto: 'Juego', clase: 'app', destino: '/juego', icono: <Gamepad2 className="w-3.5 h-3.5" /> },
  { id: 'navegador', titulo: 'Navegador', corto: 'Web', clase: 'navegador', destino: 'https://es.wikipedia.org/wiki/Portada', icono: <Globe className="w-3.5 h-3.5" /> },
  { id: 'mapa', titulo: 'Mapa', corto: 'Mapa', clase: 'app', destino: '/mapa', icono: <MapIcon className="w-3.5 h-3.5" /> },
  { id: 'grafos', titulo: 'Conocimiento', corto: 'Conocimiento', clase: 'app', destino: '/grafos', icono: <Network className="w-3.5 h-3.5" /> },
  { id: 'explorar', titulo: 'Explorar', corto: 'Explorar', clase: 'app', destino: '/explorar', icono: <Compass className="w-3.5 h-3.5" /> },
  { id: 'documentos', titulo: 'Mi conocimiento', corto: 'Mío', clase: 'app', destino: '/mi-conocimiento', icono: <BrainCircuit className="w-3.5 h-3.5" /> },
  { id: 'proyectos', titulo: 'Mis proyectos', corto: 'Proyectos', clase: 'app', destino: '/proyectos', icono: <FolderKanban className="w-3.5 h-3.5" /> },
  { id: 'mercado', titulo: 'Mercado', corto: 'Mercado', clase: 'app', destino: '/mercado', icono: <Store className="w-3.5 h-3.5" /> },
  { id: 'universo', titulo: 'Universo', corto: 'Universo', clase: 'app', destino: '/universo', icono: <Orbit className="w-3.5 h-3.5" /> },
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
    // El primer escritorio trae el juego y el navegador, LOS DOS A PANTALLA
    // COMPLETA (petición de Eugenio: «que el juego se abra en pantalla
    // completa, y el navegador igual pero en otra ventana»). Las medidas
    // sueltas se guardan igual: son a las que vuelve si restaura una.
    return [
      { id: 'v1', titulo: 'Juego Vital', clase: 'app', destino: '/juego', x: 24, y: 56, an: 760, al: 520, z: 11, maximizada: true },
      { id: 'v2', titulo: 'Navegador', clase: 'navegador', destino: 'https://es.wikipedia.org/wiki/Portada', x: 500, y: 200, an: 720, al: 520, z: 12, maximizada: true },
    ];
  });

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

  /**
   * Abrir una sección. Dos decisiones (2026-08-19, petición de Eugenio):
   *
   *   - Nace A PANTALLA COMPLETA. Pidió que el juego se abriera así y que se
   *     pasara de uno a otro con un gesto; eso es el modelo de macOS, donde
   *     cada aplicación ocupa su pantalla y el gesto cambia de pantalla. Con
   *     ventanitas superpuestas el gesto no significaría nada.
   *   - Si esa sección YA está abierta, se trae al frente en vez de duplicarla.
   *     Dos ventanas del mismo mapa no le sirven a nadie, y con las secciones
   *     a un clic en la barra de arriba es facilísimo pulsar dos veces.
   */
  const abrir = useCallback((a: typeof ATAJOS[number]) => {
    setVentanas(vs => {
      const ya = vs.find(v => v.clase === a.clase && v.destino === a.destino);
      if (ya) return vs.map(v => (v.id === ya.id ? { ...v, z: ++contadorZ, minimizada: false } : v));
      const n = vs.length;
      return [...vs, {
        id: `v${Date.now().toString(36)}`,
        titulo: a.titulo, clase: a.clase, destino: a.destino,
        x: 40 + (n % 6) * 34, y: BARRA_ARRIBA + 16 + (n % 6) * 30,
        an: 780, al: 540, z: ++contadorZ,
        maximizada: true,
      }];
    });
  }, []);

  /**
   * PASAR DE UNA VENTANA A OTRA CON EL TRACKPAD (petición de Eugenio: «pueda ir
   * de uno a otro moviendo con los 4 dedos del pad del Mac»).
   *
   * LO QUE NO SE PUEDE: una web NO ve cuántos dedos hay en el trackpad. macOS
   * se queda los gestos de tres y cuatro dedos para sí mismo (Mission Control,
   * cambiar de escritorio) y nunca llegan a la página. No hay forma de
   * detectarlos desde aquí; solo una aplicación nativa podría.
   *
   * LO QUE SÍ: el deslizamiento HORIZONTAL de dos dedos llega como una rueda
   * con desplazamiento en X, y ese es el gesto equivalente. Se exige que sea
   * claramente horizontal (más X que Y) y se deja un respiro entre cambios,
   * porque un solo gesto manda decenas de eventos y si no saltarías cinco
   * ventanas de una pasada.
   */
  const ultimoCambio = useRef(0);
  const irA = useCallback((paso: number) => {
    setVentanas(vs => {
      const abiertas = vs.filter(v => !v.minimizada);
      if (abiertas.length < 2) return vs;
      const orden = [...abiertas].sort((a, b) => a.id.localeCompare(b.id));
      const delante = abiertas.reduce((m, v) => (v.z > m.z ? v : m), abiertas[0]);
      const i = orden.findIndex(v => v.id === delante.id);
      const siguiente = orden[(i + paso + orden.length) % orden.length];
      return vs.map(v => (v.id === siguiente.id ? { ...v, z: ++contadorZ } : v));
    });
  }, []);

  useEffect(() => {
    const alRodar = (e: WheelEvent) => {
      // Dentro de un marco el evento no llega aquí; esto atiende al escritorio.
      if (Math.abs(e.deltaX) < 40 || Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.6) return;
      const ahora = Date.now();
      if (ahora - ultimoCambio.current < 700) return;
      ultimoCambio.current = ahora;
      irA(e.deltaX > 0 ? 1 : -1);
    };
    const alTeclado = (e: KeyboardEvent) => {
      // Ctrl/⌘ + flechas: el mismo salto, sin trackpad.
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); irA(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); irA(-1); }
    };
    window.addEventListener('wheel', alRodar, { passive: true });
    window.addEventListener('keydown', alTeclado);
    return () => {
      window.removeEventListener('wheel', alRodar);
      window.removeEventListener('keydown', alTeclado);
    };
  }, [irA]);

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
        cambiar(v.id, { x: Math.max(0, x + dx), y: Math.max(BARRA_ARRIBA, y + dy) });
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
            <p className="text-xs text-slate-400 mt-1">Ábrelas desde los botones de arriba.</p>
          </div>
        </div>
      )}

      {visibles.map(v => (
        <div
          key={v.id}
          onPointerDown={() => alFrente(v.id)}
          className="absolute flex flex-col rounded-xl overflow-hidden bg-white border border-slate-300 shadow-2xl"
          style={v.maximizada
            ? { left: 0, top: BARRA_ARRIBA, width: '100%', height: `calc(100% - ${BARRA_ARRIBA}px)`, zIndex: v.z }
            : { left: v.x, top: Math.max(BARRA_ARRIBA, v.y), width: v.an, height: v.al, zIndex: v.z }}
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

      {/* LA LÍNEA DE ARRIBA (2026-08-19, petición de Eugenio: «que esté todo
          en la línea superior, no en un menú secundario»). A la izquierda las
          secciones, cada una abre su ventana a pantalla completa; a la derecha
          las que ya están abiertas, para saltar entre ellas. */}
      <div className="absolute left-0 right-0 top-0 h-11 flex items-center gap-1 px-2 bg-white/95 backdrop-blur border-b border-slate-200 overflow-x-auto"
        style={{ zIndex: 100000 }}>

        {ATAJOS.map(a => {
          const abierta = ventanas.find(v => v.clase === a.clase && v.destino === a.destino);
          const delante = abierta && !abierta.minimizada
            && abierta.z === Math.max(...ventanas.filter(v => !v.minimizada).map(v => v.z), 0);
          return (
            <button
              key={a.id}
              onClick={() => abrir(a)}
              title={a.titulo}
              className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-colors',
                delante ? 'bg-slate-900 text-white'
                  : abierta ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')}
            >
              {a.icono}
              <span className="hidden lg:inline">{a.corto}</span>
            </button>
          );
        })}

        <div className="w-px h-5 bg-slate-200 mx-1 shrink-0" />

        {/* Saltar de una a otra, sin trackpad */}
        <button onClick={() => irA(-1)} title="Ventana anterior (⌘←)"
          className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => irA(1)} title="Ventana siguiente (⌘→)"
          className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0">
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Lo que hay abierto: pulsar lleva a esa ventana */}
        {ventanas.map(v => (
          <button
            key={v.id}
            onClick={() => (v.minimizada ? alFrente(v.id) : cambiar(v.id, { minimizada: true }))}
            title={v.titulo}
            className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border max-w-[9rem] shrink-0',
              v.minimizada ? 'bg-white border-slate-200 text-slate-400'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800')}
          >
            {v.clase === 'navegador' ? <Globe className="w-3 h-3 shrink-0" /> : <Gamepad2 className="w-3 h-3 shrink-0" />}
            <span className="truncate">{v.titulo}</span>
          </button>
        ))}

        <span className="ml-auto hidden xl:block text-[10px] text-slate-400 pr-1 shrink-0">
          Desliza con dos dedos para cambiar de ventana
        </span>
      </div>
    </div>
  );
}
