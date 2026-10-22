import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Package, Search } from 'lucide-react';
import { MarcoLectura, type DatosPagina } from './CabeceraLectura';
import { Cargando } from './VistaPagina';
import { useSitio, ProveedorSitio, sitioConAnfitrion, sitioEnCasa } from './ContextoSitio';
import { recordarRuta } from '../../utils/rutasLegibles';
import SeccionesSitio, { type Seccion } from './SeccionesSitio';
import { miniatura } from '../../utils/miniatura';

// ============================================================================
// LOS RESULTADOS DEL BUSCADOR DE UN SITIO — `/buscar?q=…` (2026-10-18)
// ============================================================================
// Wikiproducts, plan 3.8. Lo que abre la caja «Buscar» del menú del sitio
// (`MenuSitio.tsx`). Busca SÓLO en este sitio (`/api/sitio/buscar`) y enseña
// los resultados dentro de su menú y su pie, sin salir de él.
//
// `robots.txt` deja esta página fuera de los buscadores: una página de
// resultados por cada texto que alguien escriba son infinitas páginas finas.

type Resultado = { id: string; titulo: string; descripcion: string; tabla: string | null; portada: string | null; ruta?: string | null;
  /** Sólo las fichas: su precio «desde» y la cifra que dice cómo es (`completarFichas`). */
  precio?: string; dato?: { nombre: string; valor: string } };
type Respuesta = { resultados: Resultado[]; mas?: boolean; pagina?: number; por_pagina?: number; corregido?: string | null; secciones?: Seccion[] };

const CLASE_PAGINA = 'inline-flex items-center h-11 px-4 rounded-xl border border-slate-200 text-base font-bold text-slate-800 hover:border-slate-400';

export default function BuscadorSitio() {
  const sitio = useSitio();
  const [params] = useSearchParams();
  const q = (params.get('q') || '').trim();
  const raizId = params.get('sitio') || sitio?.raizId || null;
  const pagina = Math.max(1, Math.floor(Number(params.get('pagina'))) || 1);
  const [raiz, setRaiz] = useState<DatosPagina | null>(null);
  const [res, setRes] = useState<Respuesta | null>(null);
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
    fetch(`/api/sitio/buscar?sitio=${encodeURIComponent(raizId)}&q=${encodeURIComponent(q)}${pagina > 1 ? `&pagina=${pagina}` : ''}`)
      .then(async r => {
        const j = await r.json().catch(() => ({}));
        if (!vivo) return;
        if (!r.ok) { setFallo(j.error || 'No se ha podido buscar.'); return; }
        // Antes de pintar: así cada enlace sale ya por su dirección legible.
        for (const x of j.resultados || []) recordarRuta(x.id, x.ruta);
        setRes(j);
      })
      .catch(() => vivo && setFallo('No se ha podido buscar. Inténtalo dentro de un momento.'));
    return () => { vivo = false; };
  }, [raizId, q, pagina]);
  useEffect(() => { if (pagina > 1) window.scrollTo(0, 0); }, [pagina]);

  useEffect(() => {
    const antes = document.title;
    document.title = q ? `${q} · Buscar` : 'Buscar';
    return () => { document.title = antes; };
  }, [q]);

  const rutas = sitio && raizId ? { enlacePagina: sitio.enlacePagina, enlaceBd: sitio.enlaceBd, enlaceBuscar: sitio.enlaceBuscar, raizId } : undefined;
  const enlace = (id: string) => sitio ? sitio.enlacePagina(id) : `/p/${id}`;
  const aPagina = (n: number) => {
    const p = new URLSearchParams(params);
    if (n > 1) p.set('pagina', String(n)); else p.delete('pagina');
    return `?${p.toString()}`;
  };

  return (
    <MarcoLectura pagina={raiz} rutas={rutas}>
      <main>
        <form role="search" method="get" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 h-12 mb-6">
          <Search className="w-5 h-5 text-slate-500 shrink-0" aria-hidden />
          <input type="search" name="q" defaultValue={q} required minLength={2} autoFocus={!q}
            aria-label="Buscar en este sitio" placeholder="Buscar un producto, una marca, un código de barras…"
            className="flex-1 min-w-0 h-11 bg-transparent outline-none text-base text-slate-800 placeholder:text-slate-500" />
          {raizId && <input type="hidden" name="sitio" value={raizId} />}
        </form>
        {q.length >= 2 && <h1 className="text-xl font-black text-slate-900 mb-4">Resultados de «{q}»</h1>}
        {fallo ? <p className="text-sm text-rose-600">{fallo}</p>
          : !res ? <Cargando />
          : q.length < 2 ? <p className="text-base text-slate-600">Escribe al menos dos letras.</p>
          : res.resultados.length === 0 ? (
            <div>
              <p className="text-base text-slate-700">No hay nada que coincida con «{q}» en este sitio.</p>
              <p className="mt-1 text-base text-slate-600">Prueba con otra palabra (una marca, un modelo, «panel», «batería»…) o entra en una sección:</p>
              {res.secciones && res.secciones.length > 0 && <SeccionesSitio secciones={res.secciones} enlace={enlace} className="mt-4" />}
            </div>
          ) : (<>
            {res.corregido && <p className="mb-3 text-base text-slate-700">Mostrando resultados de «{res.corregido}».</p>}
            <ul className="divide-y divide-slate-100">
              {res.resultados.map((r, i) => (
                <li key={r.id} className="py-3">
                  <Link to={enlace(r.id)} className="flex gap-3 items-center group">
                    <span className="w-16 h-16 rounded-lg bg-slate-50 shrink-0 flex items-center justify-center overflow-hidden">
                      {r.portada
                        ? <img src={miniatura(r.portada, 64)} alt="" width={64} height={64} loading={i < 8 ? 'eager' : 'lazy'} className="w-full h-full object-contain" />
                        : <Package className="w-6 h-6 text-slate-400" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold leading-snug text-slate-900 group-hover:underline line-clamp-2">{r.titulo}</span>
                      {(r.dato || r.tabla) && (
                        <span className="block text-base text-slate-600 truncate">
                          {r.dato ? `${r.dato.nombre}: ${r.dato.valor}` : r.tabla}
                        </span>
                      )}
                      {!r.dato && !r.precio && r.descripcion && <span className="block text-base text-slate-700 line-clamp-1">{r.descripcion}</span>}
                    </span>
                    {r.precio && <span className="shrink-0 text-right text-base font-black text-slate-900"><span className="block text-sm font-bold text-slate-600">desde</span>{r.precio}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </>)}
        {/* PÁGINAS (ronda 3 del evaluador): antes, «escribe algo más
            concreto» y ninguna forma de ver el resto. */}
        {res && res.resultados.length > 0 && (pagina > 1 || res.mas) && (
          <nav aria-label="Páginas de resultados" className="mt-6 flex items-center justify-between gap-3">
            {pagina > 1
              ? <Link to={aPagina(pagina - 1)} className={CLASE_PAGINA}>← Anteriores</Link> : <span />}
            <span className="text-base text-slate-600">Página {pagina}</span>
            {res.mas
              ? <Link to={aPagina(pagina + 1)} className={CLASE_PAGINA}>Más resultados →</Link> : <span />}
          </nav>
        )}
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
