import { Link } from 'react-router-dom';
import { X, Network, User as UserIcon, MessageSquare } from 'lucide-react';
import EntityComments from './EntityComments';

// ============================================================================
// Pop-up central de publicación (Fase 11f, 2026-08-05)
// ============================================================================
// Cuando la pregunta del usuario coincide con una publicación EXISTENTE, el
// chat abre esta ventana central en vez de generar una respuesta nueva: la
// plataforma responde con su conocimiento real, con autor y trazabilidad.
// Incluye los grafos donde la publicación está enlazada y sus comentarios
// (donde la IA de Conocimiento responde a cada persona).

export default function PublicationPopup({ publication, graphs, onClose }: {
  publication: { id: string; title: string | null; body: string | null; author_name: string | null; created_at: string };
  graphs: Array<{ slug: string; title: string }>;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[9990] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-5 py-3 flex items-center justify-between gap-2 z-10">
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
            <MessageSquare className="w-2.5 h-2.5" /> Publicación
          </span>
          <button onClick={onClose} title="Cerrar" className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            {publication.title && (
              <h2 className="text-xl font-black text-slate-900 leading-tight">{publication.title}</h2>
            )}
            <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-[10px] text-slate-400">
              {publication.author_name && (
                <span className="inline-flex items-center gap-1"><UserIcon className="w-3 h-3" />{publication.author_name}</span>
              )}
              {publication.created_at && <span>{new Date(publication.created_at).toLocaleDateString('es-ES')}</span>}
            </div>
          </div>

          {publication.body && (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{publication.body}</p>
          )}

          {graphs.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Aparece en estos grafos de conocimiento
              </p>
              <div className="flex flex-wrap gap-1.5">
                {graphs.map(g => (
                  <Link
                    key={g.slug}
                    to={`/grafos/${g.slug}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    <Network className="w-3 h-3" /> {g.title}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 pb-2">
            <EntityComments entityType="publications" entityId={publication.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
