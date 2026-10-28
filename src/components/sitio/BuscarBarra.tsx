import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Search, X } from 'lucide-react';
import { useSitio } from './ContextoSitio';
import { recordarRuta } from '../../utils/rutasLegibles';
import { miniatura } from '../../utils/miniatura';
import { cn } from '../../utils/cn';

// ============================================================================
// BUSCAR, EN LA BARRA DEL SITIO (2026-10-26, Eugenio)
// ============================================================================
// «Añade en el menú de arriba una barra de buscar que busque en el contenido de
// esta web; recicla lo que ya tenemos.» Es el mismo buscador del menú de los
// sitios (`/api/sitio/buscar`, `BuscadorSitio.tsx`): mientras se escribe salen
// los primeros resultados debajo; con Intro se abre la página de resultados.
// Una lupa que, al pulsarla, despliega la caja tapando lo demás de la derecha
// de la barra (2026-10-26, Eugenio: «un 80 % más pequeño; si se pincha, se amplía»).

type Resultado = { id: string; titulo: string; descripcion: string; tabla: string | null; portada: string | null; ruta?: string | null };

export default function BuscarBarra({ raizId, enLinea = false }: { raizId: string;
  /** Siempre abierta, como una caja de texto en el centro de la barra (2026-10-28, Eugenio: «el selector de tabla, mapa,
   *  círculos y la barra de buscar, centrados»). Sin ella, la lupa que se despliega a la derecha. */
  enLinea?: boolean }) {
  const sitio = useSitio();
  const ir = useNavigate();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Resultado[] | null>(null);
  const [abierta, setAbierta] = useState(false);
  const [desplegadaSola, setDesplegada] = useState(false);
  const desplegada = enLinea || desplegadaSola;
  const caja = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const texto = q.trim();

  useEffect(() => {
    if (texto.length < 2) { setRes(null); return; }
    let vivo = true;
    const t = window.setTimeout(() => {
      fetch(`/api/sitio/buscar?sitio=${encodeURIComponent(raizId)}&q=${encodeURIComponent(texto)}`)
        .then(r => (r.ok ? r.json() : { resultados: [] }))
        .then(j => { if (!vivo) return; const l = (j.resultados || []) as Resultado[]; for (const x of l) recordarRuta(x.id, x.ruta); setRes(l.slice(0, 7)); })
        .catch(() => vivo && setRes([]));
    }, 220);
    return () => { vivo = false; window.clearTimeout(t); };
  }, [texto, raizId]);

  useEffect(() => {
    if (!abierta && !desplegada) return;
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) { setAbierta(false); setDesplegada(false); } };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierta, desplegada]);
  useEffect(() => { if (desplegadaSola) campo.current?.focus(); }, [desplegadaSola]);

  const cerrar = () => { setAbierta(false); setDesplegada(false); setQ(''); };
  const enlace = (id: string) => (sitio ? sitio.enlacePagina(id) : `/p/${id}`);
  const todos = () => `${sitio ? sitio.enlaceBuscar() : '/buscar'}?q=${encodeURIComponent(texto)}${sitio ? '' : `&sitio=${encodeURIComponent(raizId)}`}`;

  return (
    <div ref={caja} data-buscar-barra className={cn('shrink-0', enLinea ? 'relative w-[9.5rem] sm:w-44 xl:w-56' : desplegada ? 'absolute right-0 top-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-y-1/2' : 'relative')}>
      {/* La lupa sola, hasta que se pulsa. */}
      {!desplegada && (
        <button type="button" onClick={() => setDesplegada(true)} aria-label="Buscar en esta web" title="Buscar"
          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 hover:text-slate-950">
          <Search className="h-4 w-4" />
        </button>
      )}
      <form role="search" onSubmit={e => { e.preventDefault(); if (texto.length >= 2) { cerrar(); ir(todos()); } }}
        className={cn('items-center gap-2 rounded-full border border-slate-200 bg-white px-3 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200',
          enLinea ? 'flex h-9' : desplegada ? 'flex h-11 shadow-lg' : 'hidden')}>
        <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <input ref={campo} type="search" value={q} placeholder="Buscar" aria-label="Buscar en esta web"
          onChange={e => { setQ(e.target.value); setAbierta(true); }} onFocus={() => setAbierta(true)}
          onKeyDown={e => { if (e.key === 'Escape') { cerrar(); (e.target as HTMLInputElement).blur(); } }}
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none focus-visible:!outline-none placeholder:font-medium placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden" />
        {(q || desplegadaSola) && (
          <button type="button" onClick={cerrar} aria-label="Cerrar la búsqueda" className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>
      {abierta && texto.length >= 2 && res && (
        <div data-resultados-barra className={cn('absolute top-full z-50 mt-2 w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl', 'right-0')}>
          {res.length === 0 ? <p className="px-3 py-3 text-sm text-slate-500">Nada con «{texto}».</p> : (
            <ul>
              {res.map(r => (
                <li key={r.id}>
                  <Link to={enlace(r.id)} onClick={cerrar} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
                    {r.portada
                      ? <img src={miniatura(r.portada, 96)} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400"><FileText className="h-4 w-4" /></span>}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900">{r.titulo}</span>
                      <span className="block truncate text-[12px] text-slate-500">{r.tabla || r.descripcion || 'Página'}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to={todos()} onClick={cerrar} className="mt-1 block rounded-xl px-3 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50">Ver todos los resultados</Link>
        </div>
      )}
    </div>
  );
}
