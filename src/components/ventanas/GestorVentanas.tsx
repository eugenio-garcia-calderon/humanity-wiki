// ============================================================================
// VENTANAS (2026-08-19, petición de Eugenio, afinada en tres pasos: «ventanas
// donde en una esté el juego…», «que esté todo en la línea superior» y «solo
// tiene que haber un menú arriba, uno solo… y en ese uno es donde deben estar
// las ventanas en forma de iconos… no están ahí por defecto, solo las que se
// abran desde el menú colapsado»).
// ============================================================================
// El escritorio ya NO tiene barra propia: la única barra es la cabecera de la
// app. Desde su menú ☰ se abren las ventanas, y en esa misma cabecera aparecen
// como iconos las que están abiertas (eso lo pinta Layout, hablando con este
// gestor por `bus.ts`). Aquí solo viven las ventanas.
//
// LA DECISIÓN QUE MANDA SOBRE TODO LO DEMÁS: cada ventana es un `<iframe>` a
// una ruta de la propia app EN MODO EMBEBIDO (`?embed=1`), NO el componente
// montado aquí dentro.
//
//   - `embed=1` renderiza la página SOLA, sin la cabecera ni el menú de la
//     app. Sin él, cada ventana cargaba la app entera dentro de sí misma:
//     cuatro barras apiladas antes de llegar al juego (captura de Eugenio).
//   - El juego 3D vive en su propio contexto: su WebGL, su bucle y su teclado
//     no se pelean con los de otra ventana.
//   - Mover una ventana NO vuelve a montar lo de dentro.
//
// Lo que cuesta: cada ventana es una carga de la app (unos 200 ms y su
// memoria). Con tres o cuatro ventanas no se nota; con veinte sí.
import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Minus, Square, Copy, Globe, Gamepad2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import Navegador from './Navegador';
import { publicarVentanas, type AbrirVentana } from './bus';

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
const MIN_AN = 320, MIN_AL = 220;

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
    // SIN ventanas por defecto (petición de Eugenio): el escritorio nace
    // vacío y solo aparece lo que abras desde el menú ☰.
    return [];
  });

  // Se guarda con retraso: arrastrar dispara decenas de cambios por segundo y
  // escribir en localStorage en cada uno cuesta fotogramas.
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try { localStorage.setItem(CLAVE, JSON.stringify(ventanas)); } catch { /* lleno */ }
    }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [ventanas]);

  // La cabecera pinta un icono por ventana: se le publica el estado cada vez
  // que cambia (ver bus.ts — el estado vive aquí, allí solo viajan avisos).
  useEffect(() => {
    const publicar = () => {
      const vivas = ventanas.filter(v => !v.minimizada);
      const zMax = vivas.length ? Math.max(...vivas.map(v => v.z)) : -1;
      publicarVentanas(ventanas.map(v => ({
        id: v.id, titulo: v.titulo, clase: v.clase, destino: v.destino,
        minimizada: !!v.minimizada, delante: !v.minimizada && v.z === zMax,
      })));
    };
    publicar();
    // La cabecera pide el estado al montarse (ver bus.ts): se le contesta con
    // la foto actual, que este efecto refresca en cada cambio.
    window.addEventListener('humanity:pedir-ventanas', publicar);
    return () => window.removeEventListener('humanity:pedir-ventanas', publicar);
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
   * Abrir una sección desde el menú ☰. Nace A PANTALLA COMPLETA (el modelo de
   * macOS: cada cosa ocupa su pantalla y el gesto salta entre pantallas). Si ya
   * está abierta, se trae al frente en vez de duplicarla; el navegador casa por
   * CLASE y no por dirección, porque su destino cambia con cada página que
   * visitas y, si no, cada pulsación abriría un navegador nuevo.
   */
  const abrir = useCallback((a: AbrirVentana) => {
    setVentanas(vs => {
      const ya = a.clase === 'navegador'
        ? vs.filter(v => v.clase === 'navegador').reduce<Ventana | null>((m, v) => (!m || v.z > m.z ? v : m), null)
        : vs.find(v => v.clase === 'app' && v.destino === a.destino);
      if (ya) return vs.map(v => (v.id === ya.id ? { ...v, z: ++contadorZ, minimizada: false } : v));
      const n = vs.length;
      return [...vs, {
        id: `v${Date.now().toString(36)}`,
        titulo: a.titulo, clase: a.clase, destino: a.destino,
        x: 40 + (n % 6) * 34, y: 16 + (n % 6) * 30,
        an: 780, al: 540, z: ++contadorZ,
        maximizada: true,
      }];
    });
  }, []);

  // Los avisos del menú y de los iconos de la cabecera.
  useEffect(() => {
    const alAbrir = (e: Event) => abrir((e as CustomEvent).detail as AbrirVentana);
    const alPulsar = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      setVentanas(vs => {
        const v = vs.find(x => x.id === id);
        if (!v) return vs;
        const vivas = vs.filter(x => !x.minimizada);
        const delante = !v.minimizada && vivas.length > 0 && v.z === Math.max(...vivas.map(x => x.z));
        // El icono es un conmutador: traer al frente, y si ya está delante,
        // minimizar — como la barra de tareas de toda la vida.
        return delante
          ? vs.map(x => (x.id === id ? { ...x, minimizada: true } : x))
          : vs.map(x => (x.id === id ? { ...x, z: ++contadorZ, minimizada: false } : x));
      });
    };
    window.addEventListener('humanity:abrir-ventana', alAbrir);
    window.addEventListener('humanity:pulsar-ventana', alPulsar);
    return () => {
      window.removeEventListener('humanity:abrir-ventana', alAbrir);
      window.removeEventListener('humanity:pulsar-ventana', alPulsar);
    };
  }, [abrir]);

  /**
   * PASAR DE UNA VENTANA A OTRA CON EL TRACKPAD (petición de Eugenio: «con los
   * 4 dedos del pad del Mac»). Una web NO ve cuántos dedos hay: macOS se queda
   * los gestos de tres y cuatro dedos para sí (Mission Control) y nunca llegan
   * a la página; solo una app nativa podría. El equivalente que SÍ llega es el
   * deslizamiento HORIZONTAL de dos dedos (una rueda con desplazamiento en X).
   * Se exige que sea claramente horizontal y se deja un respiro entre cambios:
   * un solo gesto manda decenas de eventos y saltarías cinco ventanas de una.
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
   * Mover y redimensionar. `setPointerCapture` para que salirse de la ventana
   * con el ratón no cancele el arrastre a mitad.
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


  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-200/60"
      style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '26px 26px' }}>

      {ventanas.length === 0 && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-sm font-bold text-slate-500">No hay ninguna ventana abierta.</p>
            <p className="text-xs text-slate-400 mt-1">Abre el juego, el navegador o cualquier sección desde el menú ☰ de arriba.</p>
          </div>
        </div>
      )}

      {/* Se pintan TODAS, y la minimizada solo se OCULTA: quitarla del árbol
          desmontaría su marco y el juego se reiniciaría de cero cada vez que
          lo minimizas (fallo visto en pruebas, 2026-08-19). */}
      {ventanas.map(v => (
        <div
          key={v.id}
          onPointerDown={() => alFrente(v.id)}
          className="absolute flex flex-col rounded-xl overflow-hidden bg-white border border-slate-300 shadow-2xl"
          style={{
            ...(v.maximizada
              ? { left: 0, top: 0, width: '100%', height: '100%' }
              : { left: v.x, top: v.y, width: v.an, height: v.al }),
            zIndex: v.z,
            ...(v.minimizada ? { display: 'none' } : {}),
          }}
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

          {/* El contenido. `inert` en las ventanas de ATRÁS: el juego embebido
              coge el foco del teclado para sus controles y, si está de fondo,
              SE LO ROBA a la ventana de delante — escribías en el navegador y
              las teclas se las comía el juego (visto en pruebas, 2026-08-20).
              Con inert sigue dibujándose y corriendo, pero no puede capturar
              ni foco ni teclas hasta que lo traigas al frente. */}
          <div
            className="flex-1 min-h-0 relative bg-white"
            // @ts-expect-error — React 18 solo acepta inert como cadena vacía.
            inert={v.z === Math.max(...ventanas.filter(x => !x.minimizada).map(x => x.z)) ? undefined : ''}
          >
            {v.clase === 'navegador'
              ? <Navegador inicial={v.destino}
                  onTitulo={t => cambiar(v.id, { titulo: t })}
                  onUrl={u => { cambiar(v.id, { destino: u }); onPaginaNavegador?.(u); }} />
              : (
                <iframe
                  // `embed=1`: la página SOLA, sin la cabecera de la app dentro
                  // de la ventana (el fallo de la captura de Eugenio).
                  src={`${v.destino}${v.destino.includes('?') ? '&' : '?'}embed=1`}
                  title={v.titulo}
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen; xr-spatial-tracking; clipboard-write"
                />
              )}
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
    </div>
  );
}
