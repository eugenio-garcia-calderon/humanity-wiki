import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { MarcoLectura, type DatosPagina } from './CabeceraLectura';
import { Cargando } from './VistaPagina';
import { useSitio, ProveedorSitio, sitioConAnfitrion, sitioEnCasa } from './ContextoSitio';

// ============================================================================
// LOS RESULTADOS DEL BUSCADOR DE UN SITIO — `/buscar?q=…` (2026-10-18)
// ============================================================================
// Wikiproducts, plan 3.8. Lo que abre la caja «Buscar» del menú del sitio
// (`MenuSitio.tsx`). Busca SÓLO en este sitio (`/api/sitio/buscar`) y enseña
// los resultados dentro de su menú y su pie, sin salir de él.
//
// `robots.txt` deja esta página fuera de los buscadores: una página de
// resultados por cada texto que alguien escriba son infinitas páginas finas.

type Resultado = { id: string; titulo: string; descripcion: string; tabla: string | null; portada: string | null };

export default function BuscadorSitio() {
  const sitio = useSitio();
  const [params] = useSearchParams();
  const q = (params.get('q') || '').trim();
  const raizId = params.get('sitio') || sitio?.raizId || null;
  const [raiz, setRaiz] = useState<DatosPagina | null>(null);
  const [res, setRes] = useState<{ resultados: Resultado[]; mas?: boolean } | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  // La página raíz: de ella salen el menú y el pie.
  useEffect(() => {
    if (!raizId) return;
    let vivo = true;
    fetch(`/api/sitio/pagina/${encodeURIComponent(raizId)}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null).then(p => { if (vivo) setRaiz(p); }).catch(() => {});
    return () => { vivo = false; };
  }, [raizId]);

  useEffect(() => {
    if (!raizId) { setFallo('No se sabe en qué sitio buscar.'); return; }
    if (q.length < 2) { setRes({ resultados: [] }); return; }
    let vivo = true;
    setRes(null); setFallo(null);
    fetch(`/api/sitio/buscar?sitio=${encodeURIComponent(raizId)}&q=${encodeURIComponent(q)}`)
      .then(async r => {
        const j = await r.json().catch(() => ({}));
        if (!vivo) return;
        if (!r.ok) setFallo(j.error || 'No se ha podido buscar.'); else setRes(j);
      })
      .catch(() => vivo && setFallo('No se ha podido buscar. Inténtalo dentro de un momento.'));
    return () => { vivo = false; };
  }, [raizId, q]);

  useEffect(() => {
    const antes = document.title;
    document.title = q ? `${q} · Buscar` : 'Buscar';
    return () => { document.title = antes; };
  }, [q]);

  const rutas = sitio && raizId ? { enlacePagina: sitio.enlacePagina, enlaceBd: sitio.enlaceBd, enlaceBuscar: sitio.enlaceBuscar, raizId } : undefined;
  const enlace = (id: string) => sitio ? sitio.enlacePagina(id) : `/p/${id}`;

  return (
    <MarcoLectura pagina={raiz} rutas={rutas}>
      <main>
        <form role="search" method="get" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 h-12 mb-6">
          <Search className="w-5 h-5 text-slate-400 shrink-0" aria-hidden />
          <input type="search" name="q" defaultValue={q} required minLength={2} autoFocus={!q}
            aria-label="Buscar en este sitio" placeholder="Buscar un producto, una marca, un código de barras…"
            className="flex-1 min-w-0 bg-transparent outline-none text-base text-slate-800 placeholder:text-slate-400" />
          {raizId && <input type="hidden" name="sitio" value={raizId} />}
        </form>
        {q.length >= 2 && <h1 className="text-xl font-black text-slate-900 mb-4">Resultados de «{q}»</h1>}
        {fallo ? <p className="text-sm text-rose-600">{fallo}</p>
          : !res ? <Cargando />
          : q.length < 2 ? <p className="text-sm text-slate-500">Escribe al menos dos letras.</p>
          : res.resultados.length === 0 ? <p className="text-sm text-slate-500">No hay nada que coincida con «{q}» en este sitio.</p>
          : (
            <ul className="divide-y divide-slate-100">
              {res.resultados.map(r => (
                <li key={r.id} className="py-3">
                  <Link to={enlace(r.id)} className="flex gap-3 items-start group">
                    {r.portada && <img src={r.portada} alt="" width={56} height={56} loading="lazy" className="w-14 h-14 rounded-lg object-cover shrink-0 bg-slate-100" />}
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 group-hover:underline">{r.titulo}</p>
                      {r.tabla && <p className="text-xs font-bold text-slate-400">{r.tabla}</p>}
                      {r.descripcion && <p className="text-sm text-slate-600 line-clamp-2">{r.descripcion}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        {res?.mas && <p className="mt-4 text-xs text-slate-400">Hay más resultados: escribe algo más concreto.</p>}
      </main>
    </MarcoLectura>
  );
}

/** Por subdominio: `quien.humanity.wiki/buscar`. */
export function BuscadorEnEspacio() {
  return <ProveedorSitio sitio={sitioConAnfitrion(null)}><BuscadorSitio /></ProveedorSitio>;
}

/** En casa: `humanity.wiki/@quien/buscar`. */
export function BuscadorEnCasa() {
  const { arroba } = useParams();
  return <ProveedorSitio sitio={sitioEnCasa(String(arroba || '').replace(/^@/, ''))}><BuscadorSitio /></ProveedorSitio>;
}
