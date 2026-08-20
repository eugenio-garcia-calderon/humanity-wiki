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
import { ChevronRight, Folder, MoreHorizontal } from 'lucide-react';
import { cn } from '../../../utils/cn';
import PopupRenombrar from './PopupRenombrar';
import IconoElemento from '../../ui/Icono';
import type { NodoMenu } from './tipos';

export default function RamaMenu({ nodo, nivel = 0, colapsado, activo, onAbrir, arrastre }: {
  nodo: NodoMenu;
  /** Profundidad, solo para la sangría. */
  nivel?: number;
  colapsado: boolean;
  /** Ruta que se está mirando ahora, para marcar la rama. */
  activo?: string;
  onAbrir: (nodo: NodoMenu) => void;
  /** Colocar a mano dentro de su sección. Solo lo reciben las filas de primer
   *  nivel: lo que hay DENTRO de un proyecto ya viene con su propio orden
   *  (una tarea se ordena en su tablero, no aquí). */
  arrastre?: {
    onEmpezar: () => void;
    onSoltar: () => void;
    onFin: () => void;
    encima: boolean;
  };
}) {
  const [abierta, setAbierta] = useState(false);
  const [hijos, setHijos] = useState<NodoMenu[] | null>(nodo.hijos ?? null);
  const [cargando, setCargando] = useState(false);
  const [renombrando, setRenombrando] = useState(false);
  // El nombre y el icono se pintan desde aquí en cuanto los cambias, sin
  // esperar a que el menú entero se vuelva a pedir.
  const [label, setLabel] = useState(nodo.label);
  const [icono, setIcono] = useState<string | null>(nodo.insignia ?? null);

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
        {/* Un 25 % más grandes (Eugenio, 2026-08-20): 16 px se quedaban
            pequeños, y plegado el menú el icono es lo ÚNICO que se ve. */}
        {icono
          ? <IconoElemento valor={icono} tamano={20} />
          : <Icono className="w-5 h-5" />}
      </button>
    );
  }

  return (
    <div>
      <div
        // PINCHAR Y ARRASTRAR PARA COLOCAR (Eugenio, 2026-08-20). Con el
        // arrastre del propio navegador: son unas pocas filas por sección, no
        // hace falta traer una librería para esto.
        draggable={!!arrastre}
        onDragStart={arrastre ? e => { arrastre.onEmpezar(); e.dataTransfer.effectAllowed = 'move'; } : undefined}
        onDragOver={arrastre ? e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } : undefined}
        onDrop={arrastre ? e => { e.preventDefault(); arrastre.onSoltar(); } : undefined}
        onDragEnd={arrastre ? () => arrastre.onFin() : undefined}
        className={cn('group flex items-center gap-1 rounded-lg transition-colors',
          arrastre && 'cursor-grab active:cursor-grabbing',
          // Una línea arriba marca dónde va a caer: sin ella, arrastrar es
          // adivinar.
          arrastre?.encima && 'border-t-2 border-emerald-400',
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
          title={label}
          className="flex-1 min-w-0 flex items-center gap-2 py-1.5 text-left"
        >
          {icono
            ? <IconoElemento valor={icono} tamano={20} />
            : <Icono className={cn('w-5 h-5 shrink-0', esActiva ? 'text-emerald-600' : 'text-slate-400')} />}
          <span className={cn('flex-1 truncate text-[13px] font-bold',
            esActiva ? 'text-emerald-700' : 'text-slate-700')}>
            {label}
          </span>
          {nodo.punto && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', nodo.punto)} />}
          {typeof nodo.cuantos === 'number' && nodo.cuantos > 0 && (
            <span className="text-[10px] font-bold text-slate-400 shrink-0">{nodo.cuantos}</span>
          )}
        </button>

        {/* LOS TRES PUNTITOS. Solo en lo que se puede renombrar, y solo al
            pasar el ratón: si estuvieran siempre, cada fila del menú llevaría
            un botón compitiendo por la atención con su propio nombre.
            `opacity` y no `hidden`, para que no salte el ancho al aparecer. */}
        {nodo.editable && (
          <button
            onClick={e => { e.stopPropagation(); setRenombrando(true); }}
            title={`Cambiar el nombre o el icono de ${label}`}
            className="mr-1 w-5 h-5 shrink-0 grid place-items-center rounded text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-slate-200 hover:text-slate-700 transition-all"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {renombrando && nodo.editable && (
        <PopupRenombrar
          tipo={nodo.editable.tipo}
          id={nodo.editable.id}
          nombre={label}
          icono={icono}
          onHecho={(n, i) => { setLabel(n); setIcono(i); }}
          onCerrar={() => setRenombrando(false)}
        />
      )}

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
