import { useEffect, useRef, useState } from 'react';
import {
  Trash2, Copy, Repeat, Palette, Link2, Columns2, ChevronRight, Check,
  Type, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote, Info,
} from 'lucide-react';
import type { TipoBloque } from '../../utils/bloques';
import { COLORES, claseColor } from '../../utils/coloresBloque';
import { cn } from '../../utils/cn';

// ============================================================================
// EL MENÚ DEL ASA ⋮⋮ (2026-09-30)
// ============================================================================
// Eugenio: «cuando se selecciona un bloque con los cuatro puntitos de la
// izquierda debe aparecer la opción de borrar el bloque o duplicarlo». Es el
// menú de Notion: lo que se hace CON el bloque, no dentro de él.

/** A qué se puede convertir un bloque de texto sin perder lo escrito. */
export const CONVERTIBLES: { tipo: TipoBloque; label: string; icon: any }[] = [
  { tipo: 'parrafo', label: 'Texto', icon: Type },
  { tipo: 'titulo1', label: 'Título 1', icon: Heading1 },
  { tipo: 'titulo2', label: 'Título 2', icon: Heading2 },
  { tipo: 'titulo3', label: 'Título 3', icon: Heading3 },
  { tipo: 'lista', label: 'Lista', icon: List },
  { tipo: 'numerada', label: 'Lista numerada', icon: ListOrdered },
  { tipo: 'tarea', label: 'Casilla', icon: CheckSquare },
  { tipo: 'cita', label: 'Cita', icon: Quote },
  { tipo: 'aviso', label: 'Aviso', icon: Info },
  { tipo: 'desplegable', label: 'Desplegable', icon: ChevronRight },
];

/** Una opción más del menú, que depende del bloque (2026-10-05): abrir al
 *  publicar, sincronizar, configurar un botón… El menú no sabe qué hacen. */
export interface OpcionExtra { icon: any; label: string; onClick: () => void; activo?: boolean; atajo?: string }

export default function MenuBloque({ tipo, color, enColumnas, onBorrar, onDuplicar, onConvertir, onColor, onEnlace, onSacarDeColumnas, onCerrar, extras }: {
  tipo: TipoBloque;
  color?: string;
  enColumnas: boolean;
  onBorrar: () => void;
  onDuplicar: () => void;
  onConvertir: (t: TipoBloque) => void;
  onColor: (c: string | undefined) => void;
  onEnlace: () => void;
  onSacarDeColumnas: () => void;
  onCerrar: () => void;
  extras?: OpcionExtra[];
}) {
  const [sub, setSub] = useState<'convertir' | 'color' | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const esTexto = CONVERTIBLES.some(c => c.tipo === tipo);

  // Se cierra al pinchar fuera o con Escape, como cualquier menú.
  useEffect(() => {
    const fuera = (e: MouseEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) onCerrar(); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    const t = setTimeout(() => document.addEventListener('mousedown', fuera), 0);
    document.addEventListener('keydown', tecla);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla); };
  }, [onCerrar]);

  const Opcion = ({ icon: Icono, label, atajo, onClick, peligro, flecha }: any) => (
    <button onClick={onClick}
      className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-left transition-colors',
        peligro ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-600 hover:bg-slate-100')}>
      <Icono className={cn('w-3.5 h-3.5 shrink-0', peligro ? 'text-rose-500' : 'text-slate-400')} />
      <span className="flex-1">{label}</span>
      {atajo && <span className="text-[10px] font-bold text-slate-300">{atajo}</span>}
      {flecha && <ChevronRight className="w-3 h-3 text-slate-300" />}
    </button>
  );

  return (
    <div ref={caja} onClick={e => e.stopPropagation()}
      className="absolute left-0 top-full mt-1 z-40 flex items-start gap-1">
      <div className="w-56 bg-white border border-slate-200 rounded-xl shadow-2xl p-1">
        <Opcion icon={Trash2} label="Borrar" atajo="Supr" peligro onClick={onBorrar} />
        <Opcion icon={Copy} label="Duplicar" atajo="⌘D" onClick={onDuplicar} />
        {esTexto && <Opcion icon={Repeat} label="Convertir en" flecha onClick={() => setSub(s => s === 'convertir' ? null : 'convertir')} />}
        <Opcion icon={Palette} label="Color" flecha onClick={() => setSub(s => s === 'color' ? null : 'color')} />
        <Opcion icon={Link2} label="Copiar enlace al bloque" onClick={onEnlace} />
        {enColumnas && <Opcion icon={Columns2} label="Sacar de las columnas" onClick={onSacarDeColumnas} />}
        {extras && extras.length > 0 && <div className="border-t border-slate-100 my-1" />}
        {extras?.map(x => (
          <button key={x.label} onClick={x.onClick}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-left text-slate-600 hover:bg-slate-100 transition-colors">
            <x.icon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="flex-1">{x.label}</span>
            {x.atajo && <span className="text-[10px] font-bold text-slate-300">{x.atajo}</span>}
            {x.activo && <Check className="w-3 h-3 text-emerald-600" />}
          </button>
        ))}
      </div>

      {sub === 'convertir' && (
        <div className="w-48 bg-white border border-slate-200 rounded-xl shadow-2xl p-1 max-h-80 overflow-y-auto">
          {CONVERTIBLES.map(c => (
            <button key={c.tipo} onClick={() => onConvertir(c.tipo)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 text-left">
              <c.icon className="w-3.5 h-3.5 text-slate-400" />
              <span className="flex-1">{c.label}</span>
              {c.tipo === tipo && <Check className="w-3 h-3 text-emerald-600" />}
            </button>
          ))}
        </div>
      )}

      {sub === 'color' && (
        <div className="w-48 bg-white border border-slate-200 rounded-xl shadow-2xl p-1 max-h-96 overflow-y-auto">
          <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Texto</p>
          <FilaColor etiqueta="Por defecto" activo={!color} onClick={() => onColor(undefined)} clase="" />
          {COLORES.map(c => (
            <FilaColor key={c.clave} etiqueta={c.nombre} activo={color === c.clave} onClick={() => onColor(c.clave)} clase={claseColor(c.clave)} />
          ))}
          <p className="px-2.5 pt-2 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Fondo</p>
          {COLORES.map(c => (
            <FilaColor key={'f-' + c.clave} etiqueta={`Fondo ${c.nombre.toLowerCase()}`} activo={color === 'fondo-' + c.clave}
              onClick={() => onColor('fondo-' + c.clave)} clase={claseColor('fondo-' + c.clave)} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilaColor({ etiqueta, activo, onClick, clase }: { etiqueta: string; activo: boolean; onClick: () => void; clase: string }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 text-left">
      <span className={cn('w-5 h-5 rounded border border-slate-200 grid place-items-center text-[11px] font-black', clase)}>A</span>
      <span className="flex-1">{etiqueta}</span>
      {activo && <Check className="w-3 h-3 text-emerald-600" />}
    </button>
  );
}
