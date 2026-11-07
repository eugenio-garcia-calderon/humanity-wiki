import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, ChevronRight } from 'lucide-react';

// ============================================================================
// «MENSAJES Y BOLETÍN», DESDE COMPARTIR (2026-11-07)
// ============================================================================
// La puerta al panel de los formularios de un escaparate (`/paginas/:id/formularios`),
// al lado de la de miembros. Solo la ve quien administra la página (el panel
// contesta 403 a los demás y la tarjeta no se pinta), y solo en un escaparate o si
// ya llegó algo.

export default function TarjetaFormularios({ paginaId, onIr }: { paginaId: string; onIr?: () => void }) {
  const [p, setP] = useState<any | null>(null);
  useEffect(() => {
    fetch(`/api/sitio/${encodeURIComponent(paginaId)}/formularios?resumen=1`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null)).then(setP).catch(() => {});
  }, [paginaId]);
  if (!p || (!p.pagina?.escaparate && !p.cifras?.mensajes && !p.cifras?.confirmados && !p.cifras?.pendientes)) return null;
  const c = p.cifras;
  const suscriptores = c.confirmados + c.pendientes;
  return (
    <Link to={`/paginas/${paginaId}/formularios`} onClick={onIr}
      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-emerald-300 hover:bg-emerald-50/40">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${c.mensajes_nuevos ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
        <Inbox className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-800">Mensajes y boletín</span>
        <span className="block text-[11px] leading-relaxed text-slate-500">
          {c.mensajes || suscriptores
            ? <>{c.mensajes_nuevos ? `${c.mensajes_nuevos} ${c.mensajes_nuevos === 1 ? 'mensaje nuevo' : 'mensajes nuevos'}` : `${c.mensajes} ${c.mensajes === 1 ? 'mensaje' : 'mensajes'}`} · {suscriptores} {suscriptores === 1 ? 'suscriptor' : 'suscriptores'}</>
            : 'Lo que escriben los visitantes para colaborar y quién se apunta al boletín.'}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
    </Link>
  );
}
