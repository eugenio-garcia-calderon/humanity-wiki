import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { MarcoLectura, type DatosPagina } from './CabeceraLectura';
import { useSitio } from './ContextoSitio';
import SeccionesSitio, { useSecciones } from './SeccionesSitio';
import { paginaPrecargada } from '../../utils/precargado';

// ============================================================================
// UNA DIRECCIÓN QUE NO EXISTE EN UN SITIO (2026-10-18, Wikiproducts W2)
// ============================================================================
// Ronda 1 del evaluador: `wikiproducts…/no-existe` pintaba la portada sin decir
// nada. El servidor ya contestaba 404 y `noindex` (SEO R16, `sitios.ts`), pero
// la persona veía la portada y no sabía que la dirección estaba mal.
//
// Ahora lo dice, dentro del menú y el pie del sitio, y ofrece por dónde
// seguir: el buscador, las secciones del sitio y la portada. La decisión de
// 2026-08-22 («`lamieldelasierra.com/loquesea` enseña la miel») queda así
// sustituida: la portada sigue a un clic, pero ya no se finge que la dirección
// existe.

export default function NoEncontradaSitio() {
  const sitio = useSitio();
  const raizId = sitio?.raizId || null;
  const [raiz, setRaiz] = useState<DatosPagina | null>(() => raizId ? paginaPrecargada(raizId) as any : null);
  const secciones = useSecciones(raizId);

  useEffect(() => {
    if (!raizId || raiz) return;
    let vivo = true;
    fetch(`/api/sitio/pagina/${encodeURIComponent(raizId)}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null).then(p => { if (vivo) setRaiz(p); }).catch(() => {});
    return () => { vivo = false; };
  }, [raizId, raiz]);

  useEffect(() => {
    const antes = document.title;
    document.title = 'Esta página no existe';
    // Por si se llega navegando: el servidor ya lo dice al entrar directo.
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => { document.title = antes; meta.remove(); };
  }, []);

  const rutas = sitio && raizId ? { enlacePagina: sitio.enlacePagina, enlaceBd: sitio.enlaceBd, enlaceBuscar: sitio.enlaceBuscar, raizId } : undefined;
  const enlace = (id: string) => sitio ? sitio.enlacePagina(id) : `/p/${id}`;

  return (
    <MarcoLectura pagina={raiz} rutas={rutas}>
      <main className="max-w-3xl mx-auto">
        <p className="text-sm font-bold text-slate-600">Error 404</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900">Esta página no existe</h1>
        <p className="mt-2 text-base text-slate-700">
          Puede que la dirección esté mal escrita o que la página haya cambiado de sitio. Busca lo que querías o entra en una sección.
        </p>
        <form role="search" method="get" action={sitio ? sitio.enlaceBuscar() : '/buscar'}
          className="mt-5 flex items-center gap-2 rounded-xl border border-slate-300 px-3 h-12">
          <Search className="w-5 h-5 text-slate-500 shrink-0" aria-hidden />
          <input type="search" name="q" required minLength={2}
            aria-label="Buscar en este sitio" placeholder="Buscar un producto, una marca, un código de barras…"
            className="flex-1 min-w-0 bg-transparent outline-none text-base text-slate-800 placeholder:text-slate-500" />
          {raizId && <input type="hidden" name="sitio" value={raizId} />}
        </form>
        {secciones && secciones.length > 0 && (
          <>
            <h2 className="mt-8 mb-3 text-lg font-black text-slate-900">Secciones</h2>
            <SeccionesSitio secciones={secciones} enlace={enlace} />
          </>
        )}
        <Link to="/" className="inline-flex items-center mt-8 h-11 px-4 rounded-xl bg-slate-900 text-white text-base font-bold">
          Ir al inicio
        </Link>
      </main>
    </MarcoLectura>
  );
}
