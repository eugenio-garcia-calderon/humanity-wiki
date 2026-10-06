import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Boxes, ChevronRight, Clock, FileText, FolderKanban, Search, Star } from 'lucide-react';
import { componenteDeTrazo } from '../ui/iconosDeTrazo';
import { anotarReciente, useEspacio, type Elemento } from '../../utils/espacio';
import { cn } from '../../utils/cn';

// ============================================================================
// «BUSCAR», «FAVORITOS» Y «RECIENTES», ARRIBA DEL ÁRBOL (2026-10-06, #14)
// ============================================================================
// Como en Notion: lo que más usas, a un clic y sin abrir carpetas. Dos
// secciones plegables (lo que cada uno pliega se recuerda en este navegador) y
// vacías no se pintan: una sección sin nada es ruido en un menú estrecho.
//
// Las secciones solo LEEN `useEspacio()`; marcar un favorito se hace desde el
// clic derecho del árbol o la estrella de la página (ver `alternarFavorito`).
// De paso, este componente es el que anota «has abierto esto»: ya está en
// todas las pantallas con menú y sabe en qué ruta estás, así que no hace
// falta tocar el editor ni las carpetas.

const CLAVE = 'humanity:espacio-secciones';
const leer = (): Record<string, boolean> => { try { return JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch { return {}; } };

export function IconoElemento({ e }: { e: Pick<Elemento, 'tipo' | 'icono'> }) {
  const { tipo, icono } = e;
  if (icono && [...icono].length <= 2 && !/^[\w-]+$/.test(icono)) return <span className="w-4 text-center text-[14px] leading-none shrink-0">{icono}</span>;
  const C = tipo === 'carpeta' ? (icono ? componenteDeTrazo(icono) : FolderKanban) : tipo === 'bd' ? Boxes : FileText;
  return <C className="h-4 w-4 shrink-0" />;
}

function Seccion({ id, titulo, icono, items, onIr, abiertaPorDefecto }: {
  id: string; titulo: string; icono: React.ReactNode; items: Elemento[]; onIr?: () => void; abiertaPorDefecto: boolean;
}) {
  const [plegado, setPlegado] = useState<Record<string, boolean>>(leer);
  const aqui = useLocation().pathname;
  if (!items.length) return null;
  const abierta = plegado[id] ?? abiertaPorDefecto;
  const alternar = () => setPlegado(p => {
    const n = { ...p, [id]: !abierta };
    try { localStorage.setItem(CLAVE, JSON.stringify(n)); } catch { /* sin almacenamiento */ }
    return n;
  });
  return (
    <div className="mb-1" data-seccion={id}>
      <button type="button" onClick={alternar} aria-expanded={abierta}
        className="flex w-full items-center gap-1 rounded-lg px-1 py-1 text-left text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600">
        <ChevronRight className={cn('h-3 w-3 transition-transform', abierta && 'rotate-90')} />
        {icono} {titulo} <span className="font-bold normal-case tracking-normal">· {items.length}</span>
      </button>
      {abierta && items.map(e => (
        <Link key={`${e.tipo}:${e.id}`} to={e.ruta} onClick={onIr} title={e.titulo}
          className={cn('flex items-center gap-2 rounded-lg py-1.5 pl-5 pr-2 text-[13px]',
            aqui === e.ruta ? 'bg-slate-100 font-bold text-slate-900' : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900')}>
          <IconoElemento e={e} />
          <span className="min-w-0 flex-1 truncate">{e.titulo}</span>
        </Link>
      ))}
    </div>
  );
}

export default function FavoritosRecientes({ onIr, carpetas }: { onIr?: () => void; carpetas: { id: string; slug: string }[] }) {
  const { favoritos, recientes } = useEspacio();
  const aqui = useLocation().pathname;

  // Anotar lo que se abre. Solo páginas y carpetas: lo demás del menú (mapas,
  // esquemas…) no entra en estas listas.
  useEffect(() => {
    const p = aqui.match(/^\/paginas\/([^/]+)\/?$/);
    if (p) { anotarReciente('pagina', { id: decodeURIComponent(p[1]) }); return; }
    const c = aqui.match(/^\/carpetas\/([^/]+)\/?$/);
    if (c) {
      const slug = decodeURIComponent(c[1]);
      const k = carpetas.find(x => x.slug === slug);
      anotarReciente('carpeta', k ? { id: k.id } : { slug });
    }
  // `carpetas` llega después que la ruta; con el slug basta para no esperar.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aqui]);

  return (
    <div className="px-0.5 pb-1">
      <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('humanity:paleta'))}
        className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800">
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1">Buscar</span>
        <kbd className="rounded border border-slate-200 px-1 text-[10px] font-bold text-slate-400">⌘K</kbd>
      </button>
      <Seccion id="favoritos" titulo="Favoritos" icono={<Star className="h-3 w-3 text-amber-500" />} items={favoritos} onIr={onIr} abiertaPorDefecto />
      <Seccion id="recientes" titulo="Recientes" icono={<Clock className="h-3 w-3" />} items={recientes} onIr={onIr} abiertaPorDefecto />
    </div>
  );
}
