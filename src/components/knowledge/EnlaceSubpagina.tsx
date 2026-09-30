import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useSitio } from '../sitio/ContextoSitio';

// ============================================================================
// UNA PÁGINA DENTRO DE LA PÁGINA (2026-09-30)
// ============================================================================
// El bloque `subpagina` sólo guarda a QUÉ página apunta. El título y el icono
// se leen en vivo: si se guardaran en el bloque, renombrar la subpágina
// dejaría a su madre diciendo el nombre viejo.
//
// En una página publicada el enlace se queda dentro del sitio (`/p/:id` en su
// dominio); en el editor lleva al editor de la subpágina.

export default function EnlaceSubpagina({ id, tituloGuardado }: { id: string; tituloGuardado?: string }) {
  const sitio = useSitio();
  const [datos, setDatos] = useState<{ titulo: string; icono: string | null } | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(sitio ? `/api/sitio/pagina/${id}` : `/api/windows/${id}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (vivo && j) setDatos({ titulo: j.titulo ?? j.title ?? '', icono: j.config?.icono || null }); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [id, sitio]);

  const titulo = datos?.titulo || tituloGuardado || 'Sin título';
  const icono = datos?.icono;
  return (
    <Link to={sitio ? sitio.enlacePagina(id) : `/paginas/${id}`}
      className="flex items-center gap-2 -mx-1 px-1 py-1 rounded-md text-[15px] font-semibold text-slate-800 hover:bg-slate-100 transition-colors">
      {icono
        ? (/^(https?:|\/)/.test(icono)
          ? <img src={icono} alt="" className="w-5 h-5 rounded object-cover" />
          : <span className="w-5 text-center">{icono}</span>)
        : <FileText className="w-5 h-5 text-slate-400" />}
      <span className="underline decoration-slate-300 underline-offset-4 truncate">{titulo}</span>
    </Link>
  );
}
