// ============================================================================
// UNA RAMA DEL MENÚ — recursiva (2026-08-20)
// ============================================================================
// La misma pieza para cualquier profundidad: «Camión camperizado» despliega
// «Tareas», que despliega «Ducha». Es la generalización del menú de los 14
// objetivos del mapa, que hacía esto con cuatro niveles escritos a mano.
//
// Plegado el menú (solo iconos), una rama NO se despliega: no hay sitio para
// enseñar hijos en 56 px. Se pinta el icono con su nombre en el `title`, que
// es lo que sale al pasar el ratón por encima.
import { useState } from 'react';
import { ChevronRight, Folder } from 'lucide-react';
import { cn } from '../../../utils/cn';
import type { NodoMenu } from './tipos';

export default function RamaMenu({ nodo, nivel = 0, colapsado, activo, onAbrir }: {
  nodo: NodoMenu;
  /** Profundidad, solo para la sangría. */
  nivel?: number;
  colapsado: boolean;
  /** Ruta que se está mirando ahora, para marcar la rama. */
  activo?: string;
  onAbrir: (nodo: NodoMenu) => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const [hijos, setHijos] = useState<NodoMenu[] | null>(nodo.hijos ?? null);
  const [cargando, setCargando] = useState(false);

  const puedeDesplegar = !!nodo.cargarHijos || !!(hijos && hijos.length);
  const Icono = nodo.icono || Folder;
  const esActiva = !!nodo.destino && nodo.destino === activo;

  const alternar = async () => {
    if (abierta) { setAbierta(false); return; }
    setAbierta(true);
    // Se piden UNA vez y se quedan: desplegar y plegar no debe costar una
    // llamada cada vez.
    if (!hijos && nodo.cargarHijos) {
      setCargando(true);
      try { setHijos(await nodo.cargarHijos()); }
      catch { setHijos([]); }
      finally { setCargando(false); }
    }
  };

  // Plegado: un icono y nada más. El nombre sale al pasar el ratón.
  if (colapsado) {
    return (
      <button
        onClick={() => (nodo.destino ? onAbrir(nodo) : alternar())}
        title={nodo.label}
        className={cn('w-9 h-9 mx-auto grid place-items-center rounded-lg transition-colors shrink-0',
          esActiva ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900')}
      >
        {nodo.insignia
          ? <span className="text-[11px] font-black">{nodo.insignia}</span>
          : <Icono className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <div>
      <div
        className={cn('group flex items-center gap-1 rounded-lg transition-colors',
          esActiva ? 'bg-emerald-50' : 'hover:bg-slate-100')}
        style={{ paddingLeft: nivel * 10 }}
      >
        {/* La flecha es su propio botón: desplegar y ABRIR son dos cosas
            distintas, y mezclarlas obliga a abrir algo para poder mirar
            dentro. En el menú del mapa estaban unidas y por eso no se podía
            ver un objetivo sin seleccionarlo. */}
        {puedeDesplegar ? (
          <button
            onClick={alternar}
            title={abierta ? 'Plegar' : 'Desplegar'}
            className="w-5 h-7 grid place-items-center shrink-0 text-slate-400 hover:text-slate-700"
          >
            <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', abierta && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        <button
          onClick={() => (nodo.destino ? onAbrir(nodo) : alternar())}
          title={nodo.label}
          className="flex-1 min-w-0 flex items-center gap-2 py-1.5 pr-2 text-left"
        >
          {nodo.insignia
            ? <span className="w-4 shrink-0 text-center text-[11px] font-black text-slate-500">{nodo.insignia}</span>
            : <Icono className={cn('w-4 h-4 shrink-0', esActiva ? 'text-emerald-600' : 'text-slate-400')} />}
          <span className={cn('flex-1 truncate text-[13px] font-bold',
            esActiva ? 'text-emerald-700' : 'text-slate-700')}>
            {nodo.label}
          </span>
          {nodo.punto && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', nodo.punto)} />}
          {typeof nodo.cuantos === 'number' && nodo.cuantos > 0 && (
            <span className="text-[10px] font-bold text-slate-400 shrink-0">{nodo.cuantos}</span>
          )}
        </button>
      </div>

      {abierta && (
        <div>
          {cargando && (
            <p className="pl-8 py-1 text-[11px] text-slate-400 animate-pulse">Cargando…</p>
          )}
          {!cargando && hijos?.length === 0 && (
            <p className="pl-8 py-1 text-[11px] text-slate-400 italic">Vacío</p>
          )}
          {hijos?.map(h => (
            <RamaMenu key={h.id} nodo={h} nivel={nivel + 1} colapsado={colapsado} activo={activo} onAbrir={onAbrir} />
          ))}
        </div>
      )}
    </div>
  );
}
