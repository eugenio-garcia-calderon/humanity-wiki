import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ChevronRight, Lock } from 'lucide-react';

// ============================================================================
// «PERMITIR REGISTRO», DESDE COMPARTIR (2026-10-05, carril «acceso»)
// ============================================================================
// La puerta al panel de miembros (`/paginas/:id/miembros`) desde donde se
// publica. Sólo la ve quien administra la página (el panel contesta 403 a los
// demás y la tarjeta no se pinta).

export default function TarjetaMiembros({ paginaId, onIr }: { paginaId: string; onIr?: () => void }) {
  const [p, setP] = useState<any | null>(null);
  useEffect(() => {
    fetch(`/api/sitio-miembros/${encodeURIComponent(paginaId)}/panel`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null)).then(setP).catch(() => {});
  }, [paginaId]);
  if (!p) return null;
  const activo = !!p.config?.activo;
  const total = p.cifras ? p.cifras.activos + p.cifras.pendientes : 0;
  return (
    <Link to={`/paginas/${paginaId}/miembros`} onClick={onIr}
      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-emerald-300 hover:bg-emerald-50/40">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
        <Users className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-800">Miembros registrados</span>
        <span className="block text-[11px] leading-relaxed text-slate-500">
          {activo
            ? <>{total} {total === 1 ? 'miembro' : 'miembros'}{p.cifras.pendientes ? ` · ${p.cifras.pendientes} pendientes` : ''}{p.pagina.raiz_restringida && <> · <Lock className="inline h-3 w-3" /> solo para miembros</>}</>
            : 'Permite que los visitantes se registren en tu web y decide qué ve cada categoría.'}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
    </Link>
  );
}
