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
//
// LA LISTA GRANDE, CON LOS PROYECTOS PRIMERO (2026-11-12, Eugenio: «si pongo 2 o 3
// letras, que ya aparezca un listado de los posibles resultados priorizando los
// proyectos; si pongo OBS, el Observatorio de Polarización, sin darle a Enter, bien
// grande»). Desde 2 letras, a los 120 ms, de `/api/sitio/sugerencias` (una lista
// en memoria; el buscador completo tardaba 2-3 s por letra): los resultados de una tabla de proyectos
// van arriba, con su portada grande y su descripción; luego el resto de páginas.
// Con las flechas se elige y con Intro se abre el elegido (sin elegir, la página
// de resultados, como antes).

type Resultado = { id: string; titulo: string; descripcion: string; tabla: string | null; portada: string | null; ruta?: string | null };

const esProyecto = (r: Resultado) => /proyect|project|projet/i.test(r.tabla || '');
/** Los proyectos primero, sin cambiar el orden de relevancia dentro de cada grupo. */
export function proyectosPrimero(l: Resultado[]): Resultado[] {
  return [...l.filter(esProyecto), ...l.filter(r => !esProyecto(r))];
}

export default function BuscarBarra({ raizId, enLinea = false }: { raizId: string;
  /** Siempre abierta, como una caja de texto en el centro de la barra (2026-10-28, Eugenio: «el selector de tabla, mapa,
   *  círculos y la barra de buscar, centrados»). Sin ella, la lupa que se despliega a la derecha. */
  enLinea?: boolean }) {
  const sitio = useSitio();
  const ir = useNavigate();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Resultado[] | null>(null);
  const [elegido, setElegido] = useState(-1);
  const [abierta, setAbierta] = useState(false);
  const [desplegadaSola, setDesplegada] = useState(false);
  const desplegada = enLinea || desplegadaSola;
  const caja = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const texto = q.trim();
  const [movil, setMovil] = useState<{ top: number } | null>(null);
  useEffect(() => {
    if (!abierta || !res) return;
    const medir = () => { const r = caja.current?.getBoundingClientRect(); setMovil(r && window.innerWidth < 640 ? { top: r.bottom + 8 } : null); };
    medir(); window.addEventListener('resize', medir); window.addEventListener('scroll', medir, true);
    return () => { window.removeEventListener('resize', medir); window.removeEventListener('scroll', medir, true); };
  }, [abierta, res]);

  useEffect(() => {
    if (texto.length < 2) { setRes(null); return; }
    let vivo = true;
    const t = window.setTimeout(() => {
      fetch(`/api/sitio/sugerencias?sitio=${encodeURIComponent(raizId)}&q=${encodeURIComponent(texto)}`)
        .then(r => (r.ok ? r.json() : { resultados: [] }))
        .then(j => { if (!vivo) return; const l = (j.resultados || []) as Resultado[]; for (const x of l) recordarRuta(x.id, x.ruta); setRes(proyectosPrimero(l).slice(0, 8)); setElegido(-1); })
        .catch(() => vivo && setRes([]));
    }, 120);
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
    <div ref={caja} data-buscar-barra className={cn('shrink-0', enLinea ? 'relative w-[9.5rem] sm:w-44 2xl:w-56' : desplegada ? 'absolute right-0 top-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-y-1/2' : 'relative')}>
      {/* La lupa sola, hasta que se pulsa. */}
      {!desplegada && (
        <button type="button" onClick={() => setDesplegada(true)} aria-label="Buscar en esta web" title="Buscar"
          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 hover:text-slate-950">
          <Search className="h-4 w-4" />
        </button>
      )}
      <form role="search" onSubmit={e => { e.preventDefault(); if (texto.length < 2) return; const r = res?.[elegido]; cerrar(); ir(r ? enlace(r.id) : todos()); }}
        className={cn('items-center gap-2 rounded-full border border-slate-200 bg-white px-3 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200',
          enLinea ? 'flex h-9' : desplegada ? 'flex h-11 shadow-lg' : 'hidden')}>
        <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <input ref={campo} type="search" value={q} placeholder="Buscar" aria-label="Buscar en esta web"
          onChange={e => { setQ(e.target.value); setAbierta(true); }} onFocus={() => setAbierta(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') { cerrar(); (e.target as HTMLInputElement).blur(); }
            else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && res?.length) {
              e.preventDefault(); setAbierta(true);
              setElegido(i => (e.key === 'ArrowDown' ? Math.min(i + 1, res.length - 1) : Math.max(i - 1, -1)));
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none focus-visible:!outline-none placeholder:font-medium placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden" />
        {(q || desplegadaSola) && (
          <button type="button" onClick={cerrar} aria-label="Cerrar la búsqueda" className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>
      {abierta && texto.length >= 2 && res && (
        // En el móvil la caja no está pegada al borde derecho: la lista va de lado a lado, fija bajo la caja.
        <div data-resultados-barra style={movil ? { position: 'fixed', left: 12, right: 12, top: movil.top, width: 'auto', marginTop: 0 } : undefined}
          className="absolute right-0 top-full z-50 mt-2 max-h-[min(36rem,calc(100dvh-6rem))] w-[min(40rem,calc(100vw-1.5rem))] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl">
          {res.length === 0 ? <p className="px-4 py-4 text-base text-slate-500">Nada con «{texto}».</p> : (
            <ul>
              {res.map((r, i) => {
                const proyecto = esProyecto(r);
                const primeroDeOtros = !proyecto && i > 0 && esProyecto(res[i - 1]);
                return (
                  <li key={r.id}>
                    {i === 0 && proyecto && <p className="px-3 pb-1 pt-2 text-[11px] font-black uppercase tracking-widest text-slate-400">Proyectos</p>}
                    {primeroDeOtros && <p className="mt-1 border-t border-slate-100 px-3 pb-1 pt-3 text-[11px] font-black uppercase tracking-widest text-slate-400">Otras páginas</p>}
                    <Link to={enlace(r.id)} onClick={cerrar} onMouseEnter={() => setElegido(i)}
                      className={cn('flex items-center gap-4 rounded-2xl px-2.5 hover:bg-slate-50', proyecto ? 'py-2.5' : 'py-2', elegido === i && 'bg-slate-100 hover:bg-slate-100')}>
                      {r.portada
                        ? <img src={miniatura(r.portada, proyecto ? 240 : 96)} alt="" className={cn('shrink-0 rounded-xl object-cover', proyecto ? 'h-16 w-20 sm:h-[4.5rem] sm:w-28' : 'h-11 w-11')} />
                        : <span className={cn('grid shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400', proyecto ? 'h-16 w-20 sm:h-[4.5rem] sm:w-28' : 'h-11 w-11')}><FileText className="h-5 w-5" /></span>}
                      <span className="min-w-0">
                        <span className={cn('block font-black leading-tight tracking-tight text-slate-900', proyecto ? 'line-clamp-2 text-lg sm:line-clamp-1 sm:text-xl' : 'truncate text-base')}>{r.titulo}</span>
                        {proyecto && r.descripcion
                          ? <span className="mt-0.5 line-clamp-2 text-sm leading-snug text-slate-600">{r.descripcion}</span>
                          : <span className="block truncate text-sm text-slate-500">{r.tabla || r.descripcion || 'Página'}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link to={todos()} onClick={cerrar} className="mt-1 block rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Ver todos los resultados</Link>
        </div>
      )}
    </div>
  );
}
