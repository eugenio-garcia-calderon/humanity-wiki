import { useEffect, useState } from 'react';
import { FichaRelacion, type Apuntado } from './Relacion';

// ============================================================================
// LAS RELACIONES DE UNA FILA, EN SU PÁGINA PUBLICADA (2026-10-06, Eugenio)
// ============================================================================
// La página publicada de un proyecto enseña con qué está conectado —su
// equipo, su área— como fichas que llevan a esas páginas. SOLO LAS QUE
// TIENEN ALGO: en una web, «Equipo: —» no le dice nada a nadie. El servidor
// ya quita las vacías, las que su autor marcó «ocultar siempre» y las que
// apuntan a una base de datos que quien lee no puede ver
// (`GET /api/bd/paginas/:id/relaciones`). Una página que no es de una fila
// no pinta nada.

type Relacion = { columna_id: string; nombre: string; apuntados: Apuntado[] };

export default function RelacionesPublicas({ paginaId }: { paginaId: string }) {
  const [rel, setRel] = useState<Relacion[]>([]);
  useEffect(() => {
    let vivo = true;
    fetch(`/api/bd/paginas/${encodeURIComponent(paginaId)}/relaciones`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : { relaciones: [] }))
      .then(j => { if (vivo) setRel(Array.isArray(j.relaciones) ? j.relaciones : []); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [paginaId]);
  if (!rel.length) return null;
  return (
    <dl className="mb-6 divide-y divide-slate-100 border-y border-slate-100">
      {rel.map(r => (
        <div key={r.columna_id} className="flex items-start gap-3 py-2">
          <dt className="w-32 sm:w-40 shrink-0 pt-1 text-xs font-bold text-slate-400 truncate">{r.nombre}</dt>
          <dd className="flex-1 min-w-0 flex flex-wrap gap-1">
            {r.apuntados.map(a => <FichaRelacion key={a.id} a={a} grande />)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
