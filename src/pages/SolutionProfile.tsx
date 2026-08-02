import { useHelpers } from '../contexts/DataContext';
import { useParams, Link, useNavigate } from 'react-router-dom';

import { Card, Badge, Button } from '../components/ui/core';
import { AdminMenu } from '../components/ui/AdminMenu';
import { useEdit } from '../contexts/EditContext';
import { slugify } from '../utils/slugify';

export default function SolutionProfile() {
  const { solutions, challenges, causes, loading } = useHelpers();
  const { id } = useParams();
  const navigate = useNavigate();
  const { openEdit, updateCounter, triggerUpdate } = useEdit();
  if(loading) return <div>Cargando...</div>;
  
  const decodedId = decodeURIComponent(id || '');
  
  const solution = solutions.find(s => 
    s.id.toLowerCase() === decodedId.toLowerCase() || 
    slugify(s.title) === decodedId.toLowerCase() ||
    s.title.toLowerCase() === decodedId.toLowerCase()
  );

  if (!solution) return <div className="p-8 text-center text-slate-500">Solución no encontrada</div>;

  const relatedChallenges = challenges.filter(c => solution.challenge_ids.includes(c.id));
  const relatedCauses = causes.filter(c => solution.cause_ids.includes(c.id));

  return (
    <div key={updateCounter} className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="relative overflow-hidden bg-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-400 via-slate-900 to-slate-900 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <Link to="/soluciones" className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
              ← Volver a Soluciones
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono text-emerald-500 mb-1">[ SOLUCIÓN: {solution.type.toUpperCase()} ]</p>
            <AdminMenu onEdit={() => openEdit('Solución', solution, (data) => {
              Object.assign(solution, data);
              triggerUpdate();
            }, (data) => {
              const idx = solutions.findIndex(s => s.id === data.id);
              if (idx > -1) solutions.splice(idx, 1);
              triggerUpdate();
            })} />
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">{solution.title}</h2>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">{solution.description || "Descripción de la solución no disponible."}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-widest text-slate-900 uppercase">Impacta en ({relatedChallenges.length} Retos)</h3>
          </div>
          <div className="space-y-4">
            {relatedChallenges.map(c => (
              <Link key={c.id} to={`/retos/${slugify(c.title)}`} className="block group">
                <Card className="p-5 hover:border-emerald-300 transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{c.scope}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{c.title}</h4>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{c.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-widest text-slate-900 uppercase">Resuelve Causas ({relatedCauses.length})</h3>
          </div>
          <div className="space-y-4">
            {relatedCauses.map(c => (
              <Card key={c.id} className="p-4 bg-slate-50 border-slate-100">
                <h4 className="font-bold text-sm text-slate-800">{c.title}</h4>
                <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest">{c.type}</p>
              </Card>
            ))}
            {relatedCauses.length === 0 && (
              <div className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-300 rounded-xl">
                Esta solución no especifica causas concretas.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
