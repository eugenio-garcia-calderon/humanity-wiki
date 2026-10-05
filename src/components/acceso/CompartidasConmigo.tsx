import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// COMPARTIDAS CONMIGO (2026-10-05, carril «acceso», #12)
// ============================================================================
// Lo que otras personas te han abierto —a ti o a un equipo tuyo— no estaba en
// ningún sitio: te daban acceso y la única forma de llegar era que te pasaran
// el enlace. Como en Notion, va debajo de tus páginas, plegado por defecto y
// sólo si hay algo: una sección vacía es ruido en un menú.

const CLAVE = 'humanity:compartidas-abierta';
const NOMBRE: Record<string, string> = { ver: 'Ver', comentar: 'Comentar', editar: 'Editar', admin: 'Administrar' };

export default function CompartidasConmigo({ onIr }: { onIr?: () => void }) {
  const [paginas, setPaginas] = useState<any[]>([]);
  const [abierta, setAbierta] = useState(() => { try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; } });
  const aqui = useLocation().pathname;

  useEffect(() => {
    let vivo = true;
    fetch('/api/permisos/compartidas', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : { paginas: [] }))
      .then(j => vivo && setPaginas(j.paginas || []))
      .catch(() => {});
    return () => { vivo = false; };
  }, [aqui]);

  if (!paginas.length) return null;
  const alternar = () => setAbierta(a => {
    try { localStorage.setItem(CLAVE, a ? '0' : '1'); } catch { /* sin almacenamiento */ }
    return !a;
  });

  return (
    <div className="mt-2">
      <button type="button" onClick={alternar} aria-expanded={abierta}
        className="flex w-full items-center gap-1 rounded-lg px-1 py-1 text-left text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600">
        <ChevronRight className={cn('h-3 w-3 transition-transform', abierta && 'rotate-90')} />
        Compartidas conmigo <span className="font-bold normal-case tracking-normal">· {paginas.length}</span>
      </button>
      {abierta && paginas.map(p => {
        const ruta = `/paginas/${p.id}`;
        return (
          <Link key={p.id} to={ruta} onClick={onIr} title={`De ${p.de} · ${NOMBRE[p.rol] || p.rol}`}
            className={cn('flex items-center gap-2 rounded-lg py-1.5 pl-6 pr-2 text-[13px]',
              aqui === ruta ? 'bg-slate-100 font-bold text-slate-900' : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900')}>
            {p.icono && [...p.icono].length <= 2 ? <span className="w-4 text-center text-[14px] leading-none">{p.icono}</span> : <FileText className="h-4 w-4 shrink-0" />}
            <span className="min-w-0 flex-1 truncate">{p.titulo}</span>
          </Link>
        );
      })}
    </div>
  );
}
