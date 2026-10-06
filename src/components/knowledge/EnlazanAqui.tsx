import { useEffect, useState } from 'react';
import { Link2, FileText } from 'lucide-react';
import { useSitio } from '../sitio/ContextoSitio';

// ============================================================================
// «ENLAZAN AQUÍ» (2026-10-06, carril editorB, #6) — los retroenlaces
// ============================================================================
// Al pie de cada página: las páginas que la nombran con «@», la enlazan con
// «[[» o la llevan como subpágina. Es lo que convierte un montón de páginas en
// una red: desde una idea se llega a todo lo que habla de ella.
//
// Se pregunta al servidor, que sólo devuelve las que quien mira puede ver; la
// página publicada, las públicas. Sin ninguna, no se pinta nada: un apartado
// vacío es ruido. Lo usan el editor y la lectura (con las direcciones del
// sitio, si se lee dentro de uno).

export default function EnlazanAqui({ paginaId }: { paginaId: string }) {
  const sitio = useSitio();
  const [paginas, setPaginas] = useState<{ id: string; titulo: string; icono: string | null }[]>([]);
  useEffect(() => {
    let vivo = true;
    setPaginas([]);
    fetch(`/api/paginas/${encodeURIComponent(paginaId)}/enlazan`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { paginas: [] })
      .then(j => { if (vivo) setPaginas(Array.isArray(j.paginas) ? j.paginas : []); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [paginaId]);
  if (!paginas.length) return null;
  return (
    <section aria-label="Enlazan aquí" data-enlazan-aqui className="mt-10 pt-4 border-t border-slate-100 print:hidden">
      <h2 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-400 mb-2">
        <Link2 className="w-3.5 h-3.5" /> Enlazan aquí <span className="font-bold text-slate-300">{paginas.length}</span>
      </h2>
      <ul className="flex flex-col">
        {paginas.map(p => (
          <li key={p.id}>
            <a href={sitio ? sitio.enlacePagina(p.id) : `/paginas/${p.id}`}
              className="flex items-center gap-2 min-h-9 px-2 -mx-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">
              {p.icono && p.icono.length <= 4 ? <span className="w-4 text-center">{p.icono}</span> : <FileText className="w-4 h-4 text-slate-400 shrink-0" />}
              <span className="truncate">{p.titulo}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
