import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useSitio } from './ContextoSitio';
import { cn } from '../../utils/cn';
import { miniatura } from '../../utils/miniatura';

/** UN PASO DE LA RUTA DE LA BARRA, DESPLEGABLE (2026-10-26, Eugenio: «que Movilidad sea un desplegable
 *  y pueda elegir otro sistema, igual que el territorio»). Una palabra; al pulsar, sus hermanos. */
export type OpcionRuta = { id: string; nombre: string; pagina_id: string; icono?: string | null };
/** El icono de un paso: su portada (un dibujo) o su emoji. */
export function IconoPaso({ icono }: { icono?: string | null }) {
  if (!icono) return null;
  return /^(https?:|\/)/.test(icono) ? <img src={miniatura(icono, 48)} alt="" className="h-6 w-6 shrink-0 object-contain" /> : <span className="text-lg leading-none" aria-hidden>{icono}</span>;
}
export function PasoRuta({ etiqueta, titulo, opciones, actual, h1, apagado, icono }: { etiqueta: string; titulo: string; opciones: OpcionRuta[]; actual: string | null; h1?: boolean; apagado?: boolean; icono?: string | null }) {
  const sitio = useSitio();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera); document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]);
  const Texto = h1 ? 'h1' : 'span';
  const contenido = (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="hidden sm:contents"><IconoPaso icono={icono} /></span>
      {/* La misma letra que el territorio (2026-10-26): base y negrita. */}
      <Texto title={titulo} className={cn('truncate text-base font-black tracking-tight sm:text-lg', apagado ? 'text-slate-600' : 'text-slate-900')}>
        {etiqueta}{h1 && etiqueta !== titulo && <span className="sr-only"> · {titulo}</span>}
      </Texto>
    </span>
  );
  if (opciones.length < 2) return <span className="inline-flex min-w-0 items-center px-1.5">{contenido}</span>;
  return (
    <div ref={caja} className="relative min-w-0">
      <button type="button" onClick={() => setAbierto(a => !a)} aria-haspopup="listbox" aria-expanded={abierto} title={`Cambiar: ${titulo}`}
        className="inline-flex h-9 min-w-0 max-w-full items-center gap-1 rounded-full px-2 hover:bg-slate-100">
        {contenido}<ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', abierto && 'rotate-180')} />
      </button>
      {abierto && (
        <ul role="listbox" className="absolute left-1/2 top-full z-50 mt-2 max-h-80 w-64 -translate-x-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 text-left shadow-2xl">
          {opciones.map(o => (
            <li key={o.id}>
              <Link to={sitio ? sitio.enlacePagina(o.pagina_id) : `/paginas/${o.pagina_id}`} role="option" aria-selected={o.id === actual} onClick={() => setAbierto(false)}
                className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold', o.id === actual ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50')}>
                <span className="flex-1 truncate">{o.nombre}</span>{o.id === actual && <Check className="h-4 w-4" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

